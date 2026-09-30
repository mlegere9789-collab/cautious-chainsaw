# Bundle Anatomy, Load-Path Redesign and Map-Engine Options (specialist: bundle-anatomy)

Site: https://gettysburginteractivemap.com. Scope: decompose the deployed `assets/index-Cg8FAMXN.js` (2,280,438 B), quantify every byte region, and plan code-splitting, mapbox-gl cost reduction, the initial-load waterfall, the ~38 boot-time JSON fetches, expected Lighthouse-mobile gains, the CSS-preload/service-worker console warnings, and dead code. NO BUILD was run; everything below is read-only analysis plus a plan.

Conventions: `bundle.pretty.js:LINE` = `plan-work/bundle.pretty.js` (113,377 lines). `LH` = `C:/Users/mlege/AppData/Local/Temp/claude/site/lh_mobile.json` (Lighthouse 13.5.0, mobile, simulated throttling: RTT 150 ms, 1,474.56 Kbps effective down, CPU x4). `DEPLOY` = `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy`. Effort: S<0.5d, M 0.5-2d, L 2-5d, XL>5d. "br5" = brotli quality 5, the closest local proxy for Netlify's edge encoder (see 2.2); "br11" = brotli quality 11 (theoretical ceiling if pre-compressed). Every number below was produced by a script in `plan-work/tmp-bundle-anatomy/` (list in section 12) unless marked as an estimate.

---

## 0. TL;DR (read this first)

1. **79.2% of the bundle is one library.** mapbox-gl **3.24.1** (UMD build, wrapped by Vite's CommonJS shim) = 1,806,133 B of 2,280,438 B. React 18.3.1 + react-dom + scheduler + zustand 4.5 = 149,028 B (6.5%). The entire application (all UI, all logic, all inline data) = **324,549 B (14.2%)**. Compressed on the wire the split is roughly mapbox 77% / React 8% / app 15%.
2. **The app itself is small; almost half of it is data pasted into JS.** 150,092 B (46.2% of app code) is six array literals: 512 monuments (111,003 B), 16 tour stops (16,563 B), NPS Auto Tour text (14,104 B), and three small ones (4.2 KB, 2.1 KB, 2.1 KB). Another 55 KB is CSS-in-JS objects. Real logic is ~120 KB.
3. **The app uses ~5 mapbox APIs** (a satellite raster style, `NavigationControl`, ~8 tiny GeoJSON sources, 13 `addLayer` calls of type line/symbol/circle, `flyTo`, `project`/`unproject`). Units are drawn on the app's own 2D canvas, not by mapbox. ~24% of mapbox-gl's bytes (431 KB, excluding shaders) belong to features this app never touches (3D models/buildings, terrain, precipitation, globe, fill-extrusion, raster-particle, Geolocate, Marker/Popup).
4. **Mapbox can be split out with a ~5-reference patch.** Only five app references to the mapbox namespace exist (`z_.accessToken` x2, `z_.Map` x2, `z_.NavigationControl` x1 at `bundle.pretty.js:97236,97237,97252,102980,102981`), all inside `useEffect` bodies (run after mount, not at module-eval time). A cross-reference scan shows the whole app splits into ENTRY / MAP / PANELS groups with a tiny interface (section 4.3). This is the single biggest lever (-1.8 MB raw, ~-465 KB on the wire, of the 604 KB the user downloads today).
5. **The 4.1 s FCP / 9.0 s LCP in Lighthouse are mostly a lab-model artifact of "JS on the critical path + the service-worker reload".** Unthrottled *observed* FCP and LCP were both **287 ms**. `redirects` reports 9,066 ms wasted (the SW `controllerchange -> location.reload()` refetches the document at t=908 ms) and simulated LCP is 9,007 ms: the two are the same event. The real-user problems (RUM LCP/INP/CLS/FCP Poor) point to: the first-visit reload, a 3.5 s boot "fast-forward" animation that calls `setState` 60x/s and re-renders ~26 whole-store subscribers per frame, late large text blocks (story/event cards) becoming the LCP candidate, and on mobile **two Map instances per visit**.
6. **Lighthouse TBT (30 ms) is misleadingly good.** Once FCP moves from a simulated 4.1 s to ~0.9 s, the observed 14 long tasks (largest 433 ms; ~906 ms blocking at native speed, up to ~3.6 s at 4x CPU) are expected to fall inside the TBT window (inference). TBT is then likely to go red unless the long tasks (fast-forward, whole-tree re-renders, map init) are also fixed. This is called out in every relevant finding.
7. **The bundle has not changed since at least 2026-08-22** (same 2,280,438 B file, md5 `7ef75b95...`, in the Aug 22, Aug 29, Sep 9 and Sep 29 deploy zips). **But its file name is not content-addressed:** the Jul 20 zip holds a *different* `index-Cg8FAMXN.js` (2,280,095 B, md5 `0903f96b...`; the later one adds the `showUnits`/`toggleUnits` "Toggle Units" patch, +343 B) under the same hash while `/assets/*` is served `immutable` for a year and cached cache-first by the SW - stale copies can live on in browsers (finding 27). All work since then went into `index.html` inline scripts (23.7 KB of the 39.6 KB HTML) and static pages. The Jul 20 zip contains 13 different hand-patched `index-*.js` builds (2.09-2.42 MB). The Jun 12 build (`gettysburg_FIXED_v25`) was properly split (components 85 KB, engine 19 KB, react 142 KB, zustand 3.5 KB, mapbox 1.8 MB, index 6 KB); the deployed build is a regression to a single chunk (N1).
8. **Boot data = 38 requests (37 unique; `commander_successions.json` is fetched twice), 598 KB raw, 138.6 KB on the wire.** Merged and stripped of unused `metadata` blocks it is 541 KB raw / **81 KB br11** (-28% vs the sum of the parts) and can be 1 request for first paint (Day 1 keyframes without notes: 86.7 KB raw / **6.4 KB br11**). The deployed dataset is only **1,804 keyframe records** (694 placements + 1,110 density) versus the ~430,000 records `placement_schema.json` says exist, so format work matters little today but decides feasibility if the data is ever filled in.
9. **Recommended target architecture:** HTML <= 14 KB (posters + inline critical CSS, no render-blocking files) -> entry JS <= 180 KB raw / <= 58 KB br (React shell only; ~22 KB br with Preact) -> map chunk loaded at idle (Mapbox 3.24.1 unchanged at first = 470 KB br; then pick a lighter engine) -> data in <= 3 hashed immutable JSON files -> panels lazy. Expected lab-mobile after Phase 2: FCP 0.8-1.0 s, LCP 0.9-1.4 s, TBT 80-250 ms (verify), CLS <= 0.03, Perf 92-99 (estimates, section 8).

**Where each requested deliverable lives:** (1) size breakdown table = 2.2 (+2.3 mapbox internals, 2.4 app composition); (2) code-splitting/lazy plan with byte budgets = section 4 and findings 07-09, 21; (3) mapbox-gl cost options (v3 vs v2 sizes, deferred init + static LCP placeholder, MapLibre/Leaflet/own tiles with licensing/ToS/cost, raster-only/static images, vector vs raster, tile prefetch) = section 5 and findings 07, 12, 15-18; (4) initial-load waterfall = section 6; (5) the boot JSON fetches + consolidation = section 7 and findings 10-11, 24; (6) Lighthouse FCP/LCP/TBT/TTI gain estimates = section 8; CSS preload/SW warnings = section 9 and finding 02; dead code / tree-shaking = section 10.

---

## 1. Method and evidence sources

| Source | How used |
|---|---|
| `bundle.min.js` (2,280,438 B) | Parsed with Rollup's `parseAst` (`node_modules/rollup/dist/parseAst.js` from `Downloads/gettysburg_FIXED_v25`, read-only require; no install). 770 top-level statements, exact byte ranges per statement. |
| `bundle.pretty.js` | Line numbers for citations. Region map: React/scheduler/react-dom L46-9060; Vite preload helper + zustand L9065-9341; app store/prefs L9342-10001; **mapbox-gl L10002-96206**; app L96207-113377. |
| `Downloads/gettysburg_FIXED_v25/node_modules/mapbox-gl` (v3.24.1, same version as the bundle: `bundle.pretty.js:53873 var R = "3.24.1"`, Lighthouse request `sdk=js-3.24.1`) | The package ships `dist/mapbox-gl.js.map` with `sourcesContent`. I decoded its VLQ mappings and attributed every byte of the 1,796,551 B dist to its original source module (`mapbox_src_attr.json`). The bundle's copy (1,806,133 B) is the same code re-minified by Vite plus wrapper (+9.6 KB), so shares transfer. |
| `lh_mobile.json` | Network table (174 requests over two loads), unused-javascript, bootup-time, long-tasks, redirects, metrics, layout shifts. |
| `deploy/*` and `deploy/data/*` (71 JSON files) | Boot fetch table, consolidation experiments (merge/strip/columnar), inline-script and CSS audit. |
| Historical zips in `Downloads` | Bundle size history (section 2.6). |
| Web (read-only): jsDelivr file listings, mapbox.com/pricing, docs.mapbox.com raster/static tiles pages, USGS National Map, npm package.json for maplibre-gl/leaflet, vite-pwa issue #945 | Library sizes, licenses, pricing, warning text. Cited inline; unverifiable items are marked. |

I did not use any browser tool (per BRIEF), so nothing below was observed in a live Chrome session; runtime claims are derived from code and Lighthouse traces and are labelled as inference where relevant.

---

## 2. Bundle anatomy

### 2.1 Library identification

| Library | Version / evidence | Where (`bundle.min.js` stmt; `bundle.pretty.js` line) | Raw B |
|---|---|---|---|
| Vite modulepreload polyfill + `gB` global shim | Vite 5-era output | stmts 0-2 (L1-45) | 925 |
| React | 18.3.1 (`ui.version="18.3.1"`) | stmts 3-68 (L46-...) | 6,920 |
| React JSX runtime | react-jsx-runtime.production.min | stmts 69-75 | 656 |
| scheduler | scheduler.production.min | stmt 76-78 | 4,175 |
| react-dom | 18.3.1-next-f1338f8080-20240426 (`ma.version`) | stmts 79-567 (through L9060) | 131,594 |
| Vite `__vitePreload` helper (`rT`) | used by the two lazy chunks | stmts 568-570 (L9065) | 1,719 |
| use-sync-external-store shim + `with-selector` + zustand vanilla/react | zustand **4.5.x** (`[DEPRECATED] Use createWithEqualityFn` strings) | stmts 571-592 (~L9066-9341) | 3,039 |
| **mapbox-gl** | **3.24.1** (UMD `dist/mapbox-gl.js`; `var R = "3.24.1"` at L53873) | stmts 606-607 (**L10002-96206**) | **1,806,133** |
| App (store, map layers, all panels, data literals, styles) | hand-patched minified Vite output | stmts 593-605 and 608-769 | 324,549 |

Other libraries: none. Fonts: none (`'Spectral',Georgia,serif` falls back to Georgia; zero webfont bytes). Inside mapbox-gl (from the source map) the npm dependencies are small: gl-matrix 14.2 KB, geojson-vt 10.0 KB (worker), pbf 9.0 KB, martinez-polygon-clipping 7.8 KB, earcut 6.2 KB, supercluster 5.3 KB (worker), splaytree 5.1 KB, csscolorparser 5.0 KB, kdbush 3.5 KB, @mapbox/vector-tile 3.5 KB, cheap-ruler 3.1 KB, robust-predicates 2.5 KB, tiny-sdf 2.3 KB, point-geometry 2.1 KB, murmurhash-js 1.6 KB.

Bundle end (`bundle.pretty.js:113365-113377`): `Rk(document.getElementById("root")).render(StrictMode(AO))` then `export{TF as a,RO as c,V as j,kO as l,pt as r,PO as s,IF as t,yn as u}` - the export list consumed by the two lazy chunks `BookmarkPanel-C5YT4b5k.js` (4,869 B) and `HelpModal-CFV9T0zH.js` (7,027 B), declared at `bundle.pretty.js:112469-112470` (`pt.lazy(() => rT(() => import("./BookmarkPanel-C5YT4b5k.js"), []))`). A third emitted chunk, `interpolationworker-ufiwa2-e.js` (672 B), is **orphaned**: the app region contains no `new Worker(` (only mapbox's blob worker), so nothing loads it.

### 2.2 Size breakdown (raw and estimated compression)

Each row compressed standalone (in-context marginal cost is slightly lower). gzip-9 for reference; **br5 approximates what Netlify's edge encoder produces**: my local br quality 4 gives 629,053 B and quality 5 gives 580,517 B for the whole file, while the live response is 603,777 B (`Content-Length` from `curl -I`; Lighthouse transfer 604,586 B), i.e. Netlify is between q4 and q5-equivalent. Pre-compressing at q11 would give 509,235 B (-16% / -95 KB), but Netlify does not let a site choose the level (whether a pre-built `.br` sidecar is honoured is UNVERIFIED, see Open Questions).

| Region | Raw B | % raw | gzip-9 | br5 (~Netlify) | br11 |
|---|---|---|---|---|---|
| Vite polyfill + globals | 925 | 0.0 | 514 | 447 | 431 |
| React 18.3.1 core | 6,920 | 0.3 | 2,792 | 2,654 | 2,423 |
| React jsx-runtime | 656 | 0.0 | 425 | 395 | 360 |
| scheduler | 4,175 | 0.2 | 1,746 | 1,659 | 1,545 |
| react-dom 18.3.1 | 131,594 | 5.8 | 42,433 | 40,765 | 37,104 |
| Vite preload helper | 1,719 | 0.1 | 1,023 | 933 | 857 |
| zustand 4.5 + uSES shims | 3,039 | 0.1 | 1,361 | 1,278 | 1,182 |
| **mapbox-gl 3.24.1** | **1,806,133** | **79.2** | 498,488 | **453,268** | 401,877 |
| App: store, prefs, GeoJSON consts (593-595) | 6,560 | 0.3 | 1,991 | 1,913 | 1,738 |
| App: roads/rivers layers, day-night overlay, touch (596-605) | 4,779 | 0.2 | 1,804 | 1,658 | 1,572 |
| App: interpolation/easing/audio/spatial index/unit canvas renderer (608-646) | 9,267 | 0.4 | 4,136 | 3,981 | 3,733 |
| App: data loaders + playback loop (647-663) | 5,209 | 0.2 | 1,940 | 1,870 | 1,802 |
| App: hover popup + MapView + HUD (664-672) | 8,349 | 0.4 | 3,513 | 3,369 | 3,162 |
| App: unit panels, commander data, share/bookmark utils (673-690) | 12,472 | 0.5 | 4,565 | 4,354 | 4,009 |
| App: story panel + chronology/event card (691-700) | 8,057 | 0.4 | 2,908 | 2,731 | 2,584 |
| App: search + filter + legend + minimap (701-712) | 18,060 | 0.8 | 5,524 | 5,287 | 4,863 |
| App: toasts + NPS Auto Tour (data `th`) + casualty ticker (713-721) | 25,247 | 1.1 | 9,522 | 9,031 | 7,941 |
| App: monuments layer + Follow Your Ancestor (722-727) | 10,774 | 0.5 | 4,080 | 3,848 | 3,574 |
| App: splash `tO`, casualty feed, touch, Soldier's Eye (728-735) | 12,689 | 0.6 | 4,521 | 4,280 | 3,940 |
| App: roster / OOB tree panels (736-746) | 9,654 | 0.4 | 2,833 | 2,647 | 2,477 |
| App: layout chooser + mobile layout `pO` (747-749) | 14,992 | 0.7 | 5,081 | 4,796 | 4,410 |
| **App: Virtual Walkthrough (component + 512 monuments + 16 stops) (750-755)** | **151,420** | **6.6** | 31,219 | 29,057 | 24,955 |
| App: sound toggle + onboarding tour (756-759) | 8,289 | 0.4 | 3,361 | 3,214 | 2,883 |
| App: timeline + Gtbg layers/loc/distance (760-764) | 11,684 | 0.5 | 3,782 | 3,611 | 3,366 |
| App: root `AO` + toolbar + render() (765-769) | 7,046 | 0.3 | 2,644 | 2,447 | 2,275 |
| **Whole file** | **2,280,438** | 100 | 628,877 | 580,517 (live: 603,777) | 509,235 |

Live wire budget at LH-mobile throughput (1,474.56 Kbps): the JS alone is 604,586 B = **3.28 s of pure transfer**, before any RTT.

### 2.3 What is inside mapbox-gl 3.24.1

Structure (`bundle.pretty.js:10002-10027`): Mapbox's UMD `define()` shim collects three chunk functions - **shared** (L10029, 782,666 B in the bundle; 43.3%), **worker** (L50846, 55,694 B; 3.1%), **main** (L53872, 966,763 B; 53.5%) - and at load builds the worker source as `"(" + shared + ")(...); (" + worker + ")(...)"` and wraps it in `URL.createObjectURL(new Blob(...))` (`bundle.pretty.js:10011-10027`). Consequences visible in Lighthouse: two `blob:` scripts of **838,974 B each** (two workers) are parsed in worker threads on top of the 2.28 MB main script; mapbox's "shared" code is therefore both inside the main bundle (executed) and re-parsed in every worker.

Attribution by source module group (dist 3.24.1, 1,795,095 B attributed; `mapbox_src_attr.json`):

| Module group | B | % | Note |
|---|---|---|---|
| `src/style` | 248,763 | 13.9 | `style.ts` 96.6 KB, `properties.ts` 68.4 KB (shared) |
| `src/data` (buckets, array types) | 205,721 | 11.5 | `symbol_bucket.ts` 41.5 KB, `fill_extrusion_bucket.ts` 29.1 KB |
| `src/render` | 193,672 | 10.8 | `painter.ts` 28 KB, `draw_fill_extrusion.ts` 16.7 KB |
| `src/shaders` (GLSL strings) | 177,143 | 9.9 | one file `shaders.ts` 177 KB; `3d-style/shaders` adds 27.4 KB |
| `src/ui` | 148,515 | 8.3 | `map.ts` 42 KB, `camera.ts` 14.9 KB, `geolocate_control.ts` 13.7 KB |
| `src/source` | 124,369 | 6.9 | |
| `src/style-spec` | 117,732 | 6.6 | |
| `3d-style/*` (buildings, models, shadows, elevation) | 202,062 | 11.3 | data 50.4, render 50.1, source 29.0, shaders 27.4, elevation 20.3, util 13.3, style 11.5 |
| `src/symbol`, `src/util`, `src/geo`, `src/terrain`, `src/gl`, `src/precipitation` | 77.8 / 73.9 / 69.3 / 38.3 / 18.4 / 12.7 KB | | |
| npm deps (list in 2.1) | 84,064 | 4.7 | gl-matrix 14.2 KB largest |

**Features this app does not use** (its whole mapbox API surface: `Map`, `NavigationControl`, `addSource` x8 geojson, `addLayer` x13 of types line/symbol/circle, `getSource/getLayer/setData/removeLayer/removeSource`, `flyTo` x7, `project/unproject`, `getCanvas/getZoom/getCenter/getBounds`):

| Unused group | B | % of mapbox |
|---|---|---|
| 3D style / HD models / buildings / shadows / elevation | 202,062 | 11.3 |
| Fill-extrusion (draw + bucket) | 57,656 | 3.2 |
| Raster-particle / raster-array / MRT decoder | 38,732 | 2.2 |
| Terrain | 38,255 | 2.1 |
| Hillshade/heatmap/sky/fog/light | 25,517 | 1.4 |
| Globe/other projections | 22,507 | 1.3 |
| Marker + Popup | 16,443 | 0.9 |
| GeolocateControl | 13,732 | 0.8 |
| Precipitation | 12,721 | 0.7 |
| Other controls | 3,860 | 0.2 |
| **Subtotal excluding shaders** | **431,485** | **24.0** |
| Shader GLSL (a majority is for unused layer types; exact split not measured) | 177,143 | 9.9 |
| **Total** | 608,628 | 33.9 |

These bytes cannot be tree-shaken from the official UMD build. Lighthouse's own coverage agrees in spirit: `unused-javascript` = 315,185 B wasted of 603,207 B (**52.3%**) for this file. The package's `dist/esm/` build (`core.js` 900,311 B + `shared.js` 748,699 B + `worker.js` 52,320 B + lazily-imported `hd.shared.js` 60,369 B + `hd.worker.js` 28,870 B; `package.json` exports `"./esm"`) is only ~5% smaller for a non-HD app (1,701,330 B vs 1,796,551 B; br11 376 KB vs 385 KB) and is not a solution by itself.

Runtime observation from the same trace: satellite-v9 is a **raster-only** style (style JSON is 1,658 B; no vector tiles are ever requested). The vector pipeline (workers, symbol layout, glyph PBFs) exists here only to draw ~5 tiny GeoJSON layers. The first load fetches 20 satellite webp tiles at z15 (345,177 B), two glyph PBFs (Open Sans Regular/Italic 0-255: 152,750 B raw / 88,898 B wire) and `iconset.pbf` (72,372 B raw / 20,828 B wire) that this app never draws icons from (verify: needed only if `satellite-v9` references a sprite the app uses; the app adds no icon images from the style).

### 2.4 Composition of the app region (324,549 B)

Classified by AST (`appcat.json`):

| Category | B | % of app | gzip-9 | br11 |
|---|---|---|---|---|
| Data literals (6 arrays; see next table) | 150,092 | 46.2 | 32,116 | 25,496 |
| Remaining JS logic/JSX structure | 119,591 | 36.8 | 36,505 | 31,303 |
| CSS-in-JS constant style maps (28 objects) | 48,026 | 14.8 | 7,942 | 7,017 |
| Inline `style={{...}}` objects (57) | 6,982 | 2.2 | 2,222 | 1,979 |

| Data literal | Line | Records | Raw B | gzip-9 | br5 | br11 | Used only by |
|---|---|---|---|---|---|---|---|
| `_A` monuments | `bundle.pretty.js:104440` | 512 | 111,003 | 17,906 | 16,975 | 14,140 | Virtual Walkthrough `_O` (component at L110733; uses at L110744, L110749, L110819) |
| `d2` tour stops (history HTML strings, Street View pano ids, NPS video URLs) | `:104096` | 16 | 16,563 | 6,622 | 6,307 | 5,381 | `_O` (L110739, L110784, L110900, L111176) |
| `th` NPS Auto Tour stops | `:100063` | 16 | 14,104 | 5,657 | 5,389 | 4,590 | `XF` launcher (L100323), needed only on click |
| `mA` monument highlights (unit_id keyed) | `:100615` | 20 | 4,228 | 1,682 | 1,586 | 1,376 | `XF` / `KF` |
| `rO` Soldier's-Eye sites | `:101876` | 8 | 2,108 | 941 | 892 | 788 | `Yk` (L101958) |
| `Gc` onboarding tour steps | `:111819` | 5 | 2,086 | 1,063 | 1,002 | 876 | `bO` (L111856) |
| **Total** | | | **150,092** | | | | |

The monuments array alone is 111 KB / 4.9% of the whole bundle and is needed by zero first-paint code paths. Fields by weight: name 24.6 KB, honors 22.1 KB, loc 13.7 KB, group 12.1 KB (highly repetitive category strings), lat/lon 13.4 KB, side 6.4 KB, mn 5.8 KB, src 3.9 KB, no 3.0 KB.

Style objects are the second-largest duplicate-text source: e.g. `eh` (toasts) L100007, `tn` (walkthrough) L103698, `ln` (walkthrough theme) L111311, `Zr` L100472; almost every panel restates `position:"fixed"/"absolute", background:"rgba(...)", backdropFilter:"blur(8px)", borderRadius, fontFamily`. There is no CSS file and no design tokens in the app.

### 2.5 App source structure visible in the bundle (module order = import order)

`593-595` prefs + zustand store `yn` (`bundle.pretty.js:9342-9449`); `596-605` roads/rivers/day-night overlays/touch; `606-607` **mapbox**; `608-646` interpolation, easing, WebAudio cannon (`Uk`/`jk` L96321-96327), FPS/spatial index (`sT` L96376), unit canvas renderer `lS` (L96506); `647-663` data loaders + playback loop `Ed` (L96965); `664-672` hover popup, MapView `gF` (L97213), HUD `_F` (L97415); `673-700` commander data, unit panels, share/bookmarks, story panel `CF`, event card `LF`; `701-712` search `FF`, filter `OF`, legend `VF`, minimap `WF`; `713-735` toasts, NPS tour `XF`, monuments layer `KF`, ancestor `Zk`, splash `tO` (L101472), Soldier's Eye `Yk`; `736-749` roster, layout chooser `dO`, mobile layout `pO` (L102914, 11.7 KB - has its **own** `new Map`); `750-755` Virtual Walkthrough; `756-759` sound toggle + onboarding tour `bO`; `760-764` timeline `IO`, GtbgLayers/Loc/Dist (L112471-112677); `765-769` root `AO` (L112921) + `render()`.

### 2.6 History: the bundle is frozen and the toolchain regressed

| Zip (date) | `assets/` | Note |
|---|---|---|
| `deploy-6a2da5d2...` (Jun 13) | `index-DW1SWkMU.js` 2,085,027 | first single-chunk build seen |
| `gettysburg_FIXED_v25/dist` (Jun 12, older tree) | `components` 84,789 + `engine` 19,496 + `index` 6,038 + `react` 141,926 + `zustand` 3,586 + `mapbox` 1,802,743 (+ css 40,827) | **properly split**; mapbox 3.24.1 per its node_modules |
| `deploy-6a3a0355...` (Jul 20, 29 MB) | 13 different `index-*.js` (2.09-2.42 MB), 13 BookmarkPanel, 13 HelpModal variants | evidence of repeated hand-patching + deploys that never prune old assets |
| `currentdeployedbuild.zip` (Aug 22), `deploy-6a8a9268...` (Aug 29), `deploy-6aa06a6d...` (Sep 9), `deploy-6aa16d61...` (Sep 29) | all: `index-Cg8FAMXN.js` **2,280,438 B, md5 7ef75b95..., unchanged** | identical for 5+ weeks |
| Jul 20 `deploy-6a3a0355...` entry with the *same hash name* | `index-cg8famxn.js` 2,280,095 B, md5 0903f96b... | **same file name, different bytes**: diff shows `showUnits:!0` and `toggleUnits` inserted into the store (`bundle.pretty.js:9419-9437` region) - patched in place without re-hashing |

So the RUM spikes on Sep 7-8 and Sep 18/26 are not explained by a bundle change; they coincide with HTML/static-page deploys (the index.html overlay scripts) - worth checking with the RUM per-deploy view. It also confirms N1: the Vite project that produced the split Jun 12 build exists on disk (`Downloads/gettysburg_FIXED_v25`, `gettysburg_FINAL_v24`, `chunk15_FINAL_MASTERREBUILD` all with `node_modules`, mapbox `^3.2.0`, react 18.2, zustand ^4.5, vite ^5.1) but the current behaviour lives only in the frozen minified file.

### 2.7 Runtime hot paths that the anatomy exposes (inputs to the findings)

- **No store selectors anywhere:** 26 calls of the form `= yn()` and **0** calls with a selector; **0** `React.memo`; `AO` (root) destructures `currentTick` etc. from `yn()` (`bundle.pretty.js:112922-112961`). Every `setState({currentTick})` re-renders the whole tree (~26 subscribers, each rebuilding large inline style objects).
- **Boot "fast-forward" splash** `tO` (`bundle.pretty.js:101472-101592`): waits for placements, 800 ms timer, then 3.5 s (`eO = 3500` at L101471) of `requestAnimationFrame` calling `yn.setState({ currentTick })` every frame (L101494) => up to ~210 full-tree renders and a rapid succession of event cards/story panels/toasts (the layout-shift list in LH shows the event card at `bottom:120px` and story text repeatedly shifting), then 600 ms fade. LH observed 14 long tasks between ~1.0-2.5 s (unthrottled), the largest 433 ms.
- **Double map on mobile:** desktop `gF` mounts its `new z_.Map` (L97237) as soon as `Zn` (layout) is `null`, i.e. behind the layout chooser (`bundle.pretty.js:113071-113239`); choosing Mobile unmounts `gF` (cleanup `Xe.remove()`, L97262-97264) and mounts `pO`, which creates a second `new z_.Map` (L102981), refetches the three chronology files (L102958-102960) and calls `zp(1); zp(2); zp(3)` (L103040-103042), pulling **all three days** of placements/density (~+31 files, +~220 KB raw) immediately. Two "Map Loads" are billed per mobile session (Mapbox: a map load = a `Map` initialisation, 12 h session; https://docs.mapbox.com/mapbox-gl-js/guides/pricing/).
- **Duplicate fetches:** `commander_successions.json` is in the OOB list `eF` (L96769) *and* fetched again by `Hk` (L97520); chronology is fetched by the desktop event card hook `PF` (L98548, list `kF` L98542) and again by mobile `pO`.
- **Four independent tick-to-clock implementations** (root cause family of C3/C4): `getTickTime` (Day 1 base 6:00, Day 2/3 base 4:00; `bundle.pretty.js:9371-9383`), `M4` (base 5:00; L9856-9859), `JF` (L100836-100838), `QF` (L100998-101001), plus the HUD label `` `July ${l + 2}, 1863` `` (L97428).
- **Per-frame canvas work:** trails use a full-canvas `getImageData`/`putImageData` on every resize (`K4`, L96708) and the playback loop redraws all units + trails each rAF (`Ed`, L96965-97018).

---

## 3. Findings and fix specs

Finding IDs `bundle-anatomy-NN`. "Refs" are BRIEF audit IDs.

### bundle-anatomy-01 - First-visit service-worker reload (CRITICAL)
- **Severity/Effort:** critical / S. **Refs:** C6, P1, P5, P7. **Depends:** none.
- **Evidence:** `deploy/index.html:263-268` `navigator.serviceWorker.addEventListener('controllerchange', ... location.reload())`; `deploy/sw.js:17` `self.skipWaiting()` and `:30` `clients.claim()`. LH `redirects`: `wastedMs 9066.55` (second document request at t=908 ms, `https://gettysburginteractivemap.com/` 40,068 B, transfer 0); LH `metrics`: simulated LCP 9,007 ms vs **observed LCP 287 ms**; the whole second load repeats 38 data fetches + all Mapbox tiles (network table rows at t=1046-1442 ms).
- **Root cause:** on first visit there is no controller; the new SW installs, `skipWaiting()` + `clients.claim()` fires `controllerchange` in a page that is already fine, and the handler unconditionally reloads. Every first-time visitor loads the app twice (1,529 unique visitors of 3,389 pageviews per 30 days in the Web Analytics PDF, i.e. first visits can be up to ~45% of page loads). The same handler also reloads a page mid-session when an *updated* sw.js takes over (guard `gtbgReloadedForSW` is per page-load only).
- **Fix:** (a) only treat `controllerchange` as an update if the page was already controlled:
```js
const hadController = !!navigator.serviceWorker.controller;   // evaluate at script start
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!hadController) return;            // first install: nothing to reload for
  showToast('New version ready - Refresh');   // never auto-reload during playback
});
```
(b) or remove `clients.claim()`/`skipWaiting()` altogether so a fresh SW controls only the *next* navigation. (c) Register from `window.load` + `requestIdleCallback` (already `load`; keep).
- **Acceptance test:** Playwright: clear storage, load `/`, wait 5 s; assert exactly **1** document request in the network log and `performance.getEntriesByType('navigation').length === 1`; LH mobile `redirects` audit score 1.
- **Metric moved:** removes the 9,066 ms `redirects` penalty in lab (simulated LCP/TTI ~9.0/9.1 s -> ~4-5 s before any other fix); RUM: FCP/LCP/INP of first-time visitors.

### bundle-anatomy-02 - CSS `preload as=style` swap, duplicate `modulepreload`, and SW interception cause the console warnings (P5)
- **Severity/Effort:** high / S. **Refs:** P5, P4, P7. **Depends:** 01 (fix together).
- **Evidence:** `deploy/index.html:55-58`:
```html
<link rel="modulepreload" href="/assets/index-Cg8FAMXN.js" crossorigin />
<link rel="preload" as="style" href="/assets/index-B4G7Z_2G.css" crossorigin onload="this.onload=null;this.rel='stylesheet'" />
```
plus `:282` `<script type="module" crossorigin src="/assets/index-Cg8FAMXN.js">`. `deploy/sw.js:41-50` intercepts every `/assets/*` request with `respondWith(caches.match(...) || fetch(...))`. In the **second (SW-controlled) load** the LH network table shows `index-B4G7Z_2G.css` requested **twice** (t=1046 and t=1050 ms, both `Stylesheet`, 40,827 B, transfer 0) whereas the first load shows it once (t=160 ms): the preload response was not reused by the consumer.
- **Root cause:** Chromium warns "A preload for '<url>' is found, but is not used because it is a cross-world service worker resource mismatch" when a preloaded resource and the request that should consume it resolve through different service-worker paths (network vs SW-served cache); this appears on loads after a SW has installed and is documented for Vite `modulepreload` + a caching SW (vite-pwa issue #945, https://github.com/vite-pwa/vite-plugin-pwa/issues/945). A separate Chromium warning, "preloaded using link preload but not used within a few seconds from the window's load event", fires when the swap-to-stylesheet trick loses the match. All ingredients are present here: (1) a SW that controls the page and intercepts `/assets/`; (2) two hand-written preload hints under `/assets/`; (3) `clients.claim()` changing the controller between preload issue and consume on first visit; (4) the `onload` `rel` flip re-issuing the request. I could not reproduce the exact console text without a browser (BRIEF forbids), so treat the mechanism as high-confidence inference from the double-request evidence and the cited issue.
- **Additional facts:** the "app CSS" is **only mapbox-gl.css** (`deploy/assets/index-b4g7z_2g.css` is byte-identical to `Downloads/gettysburg_FIXED_v25/dist/assets/mapbox-B4G7Z_2G.css`, 40,827 B, br11 ~4.6 KB); every panel uses inline styles. The boot splash has its own inline CSS. So this stylesheet is not needed for first paint at all. The `modulepreload` is redundant with the module `<script>` in `<head>` (the preload scanner already discovers it).
- **Fix:** delete both hints; load CSS with the map chunk (`import 'mapbox-gl/dist/mapbox-gl.css'` inside the map module; the bundle already contains Vite's preload helper `rT`, `bundle.pretty.js:9065`, which accepts CSS deps: `rT(() => import('./map-HASH.js'), ['assets/mapbox-HASH.css'])`). If a global stylesheet must stay: plain `<link rel="stylesheet" href="/assets/index-B4G7Z_2G.css">` (5 KB on the wire) - no preload, no `onload` hack, no `crossorigin` mismatch. Keep the `<noscript>` link only if the app has a no-JS mode (it does not render without JS).
- **Acceptance test:** Chrome DevTools console on 3 consecutive loads (cold, warm, SW-controlled) shows zero "preload"/"cross-world" messages; network log shows exactly one request for the CSS/entry JS per load; Lighthouse "Best Practices" console audit clean.
- **Metric moved:** console-clean (Best Practices), removes one duplicate 40 KB fetch per SW-controlled load, removes an FCP-graph dependency.

### bundle-anatomy-03 - Rewrite the service worker (cache poisoning, unbounded growth, stale manifest, no offline HTML)
- **Severity/Effort:** medium / M. **Refs:** C6, P5, E1. **Depends:** 01, 19.
- **Evidence (`deploy/sw.js`):** `:3` `CACHE_NAME = 'gbg-v5'` constant while `:5-13` `PRECACHE_ASSETS` hardcodes hashed file names (`index-Cg8FAMXN.js`, `index-B4G7Z_2G.css`) and also `/manifest.json`, `/favicon.ico`, icons. `:43-47` caches **any** response (no `res.ok` check) for `/assets/*` and serves it cache-first forever; `:53-54` serves the precached list cache-first forever; `:28` only deletes caches whose *name* differs, so old hashed assets accumulate inside `gbg-v5` across deploys; navigation requests fall through to `respondWith(fetch(e.request).catch(() => caches.match(e.request)))`, but HTML is never `put` in the cache, so offline navigation yields a network error (and every navigation pays SW start-up cost for no gain).
- **Root cause:** hand-maintained SW with no build-time manifest.
- **Fix:** (1) generate the precache list at build time (Workbox `injectManifest`/`vite-plugin-pwa` is already a devDependency in RECON_SRC) with content hashes as revision; (2) name the cache from the manifest hash (`gbg-<hash>`) so `activate` purges everything old; (3) require `res.ok && res.type === 'basic'` before `put`; (4) do NOT intercept `/assets/*` (immutable HTTP caching already gives instant repeat loads; SW cache-first adds a second copy); (5) make `/manifest.json` network-first (else the E1 orientation fix never reaches existing installs); (6) use `navigationPreload` if HTML is to be handled, or do not handle navigations at all; (7) `/data/*`: stale-while-revalidate keyed by hashed name (finding 10) instead of network-first.
- **Acceptance test:** Playwright: deploy v1, load, deploy v2 (new hash), reload: `caches.keys()` contains only the new cache; old hashed assets absent; inject a 500 for one asset and confirm it is not cached; change `manifest.json` and confirm the next load sees it.
- **Metric moved:** reliability, repeat-visit correctness; storage bloat.

### bundle-anatomy-04 - Diet the HTML (23.7 KB inline scripts), remove render-blocking `site-nav`, drop unused preconnects
- **Severity/Effort:** medium / M. **Refs:** P4, H1, E3, E4. **Depends:** 15.
- **Evidence:** `deploy/index.html` is 39,638 B (br11 10,827; LH wire 13,556). Inline `<script>` blocks total **23,721 B** (L27 JSON-LD 570; L255 SW 1,073; L294 3,493; L355 2,511; L398 1,794; L441 4,874; L521 4,043; L608 5,363) plus 9,205 B inline CSS. These 5 scripts are a second, unbundled code base that polls the DOM (`setInterval` x25 at 200 ms, `document.querySelectorAll('body *')` scans in `onboardingVisible`, L497-508). `:279-280` `<link rel="stylesheet" href="/site-nav.css">` + `<script src="/site-nav.js">` (7,251 + 15,829 B raw; 2,463 + 5,396 B wire) are render-blocking (LH `render-blocking-insight`, score 0.5) though on this page they only build a hidden menu. LH `network-dependency-tree-insight` flags **5 unused preconnects** (`a.tiles`, `b.tiles`, `www.google.com`, `maps.googleapis.com`, `streetviewpixels-pa.googleapis.com`, HTML L43-44, L48-50; tiles come from `api.mapbox.com` over h3).
- **Fix:** move the Extra-Features overlay/collision-mover/banner/labeler/monuments scripts into one deferred module (or, better, into the React toolbar per finding 15/H1) - target HTML <= 14 KB raw / <= 5 KB br; `site-nav.js` `defer` (or `type=module`) and `site-nav.css` loaded with `media="print" onload` **only** after removing the SW/preload conflicts, or inlined critical parts (< 2 KB) and lazy-loaded on first click of "Extra Features"; keep only `preconnect` for `https://api.mapbox.com` (and `events.mapbox.com` at most); remove `#seo-content` (E4, 1,809 B, "cloaking-adjacent") and the duplicate `<h1>` (E3).
- **Acceptance test:** HTML <= 14 KB; LH `render-blocking-insight` score 1; `network-dependency-tree-insight` lists no unused preconnect; no `setInterval` in HTML; a11y tree shows one `<h1>`.
- **Metric moved:** FCP -0.2-0.4 s (lab); fewer main-thread scans; SEO/a11y hygiene.

### bundle-anatomy-05 - Deploy hygiene: correct-case, orphan chunk, stale builds
- **Severity/Effort:** low / S. **Refs:** N1. **Depends:** none.
- **Evidence:** the deploy zip has lower-cased asset names (BRIEF warning); `deploy/assets/interpolationworker-ufiwa2-e.js` (672 B) is referenced nowhere; Jul 20 zip carried 13 index builds (29 MB).
- **Fix:** deploy only from a clean build output directory; delete the orphan chunk; add a CI check that every `assets/*` referenced by `index.html` and `sw.js` exists with exact case and that no unreferenced file ships.
- **Acceptance test:** CI script `verify-deploy.mjs`; `curl -I` for each referenced asset returns 200 with exact-case URL.

### bundle-anatomy-06 - Add real-user attribution (web-vitals) before and during the work
- **Severity/Effort:** medium / S. **Refs:** P1. **Depends:** none.
- **Evidence:** RUM shows Poor LCP/INP/CLS/FCP but there is no attribution; my LCP-candidate and INP hypotheses (section 8) cannot be verified from lab data. Lighthouse observed LCP 287 ms vs RUM p75 > 4 s.
- **Fix:** ship `web-vitals/attribution` (~2 KB br) and `sendBeacon` to a first-party `/.netlify/functions/vitals` (or Netlify Analytics custom event) with: `lcp.element`, `lcp.url`, `lcp.resourceLoadDelay`, `inp.interactionTarget/eventTarget`, `cls.largestShiftTarget`, `navigationType`, first-visit flag, `effectiveType`, `deviceMemory`, layout (desktop/mobile). Add `first-visit` and `sw-controlled` dimensions so finding 01's effect is measurable.
- **Acceptance test:** dashboard shows LCP element selector distribution within 24 h.
- **Metric moved:** enables proof for P1; confirms which of the hypotheses below is true.

### bundle-anatomy-07 - Put mapbox-gl in its own lazily loaded chunk (CRITICAL)
- **Severity/Effort:** critical / L (M once a build exists). **Refs:** P2, P7, P1. **Depends:** 21 (how the split is produced), 15.
- **Evidence:** section 2.2-2.3; only five references to the namespace (`z_`): `bundle.pretty.js:97236` (`z_.accessToken`), `97237` (`new z_.Map`), `97252` (`new z_.NavigationControl`), `102980`, `102981`; the xref scan shows the mapbox statements (606-607) are consumed by exactly one name (`Ok`, used by stmts 608-609 `var R4 = Ok.exports; const z_ = cS(R4)`) and themselves consume only the global shim `gB`. `z_` is used inside `useEffect` bodies at L97234-97266 and L102978-103044, not at module-eval time.
- **Root cause:** Vite emitted the CJS/UMD mapbox module inline in the entry chunk because the source imports `mapbox-gl` statically from `MapView`.
- **Fix (source available):** `const MapView = lazy(() => import('./map/MapView'))`; inside `MapView.jsx` `import mapboxgl from 'mapbox-gl'; import 'mapbox-gl/dist/mapbox-gl.css';`; `build.rollupOptions.output.manualChunks: { mapbox: ['mapbox-gl'] }` so the 1.8 MB vendor chunk has its own content hash. Start the import from idle time after first paint (finding 15), never from the critical path.
- **Fix (no source, bundle surgery - see 4.4):** cut stmts 606-607 into `map-vendor.js`:
```js
// map-vendor.js  (moved verbatim: var Ok = {exports:{}}; (function(c,f){...})(Ok, Ok.exports); needs gB, cS)
import { g as gB, cS } from './index-HASH.js';           // export these two from the entry
var Ok = { exports: {} }; /* ...original 1.8 MB IIFE... */
const R4 = Ok.exports; export default cS(R4);              // = z_
```
and in the two effects (`bundle.pretty.js:97234`, `102978`) replace the synchronous namespace by a promise:
```diff
-  pt.useEffect(() => {
-    if (!f.current || M.current || !a2) return;
-    z_.accessToken = a2;
-    const Xe = new z_.Map({ ... });
-    return ( Xe.addControl(new z_.NavigationControl(), "top-right"), Xe.on("load", ...), () => { Op(); Xe.remove(); M.current = null; } );
-  }, []),
+  pt.useEffect(() => {
+    if (!f.current || M.current || !a2) return;
+    let dead = false, Xe = null;
+    loadMapbox().then((mb) => {                         // rT(() => import('./map-vendor-HASH.js'), ['assets/mapbox-HASH.css']).then(m => m.default)
+      if (dead) return;
+      mb.accessToken = a2;
+      Xe = new mb.Map({ ...same options... });
+      Xe.addControl(new mb.NavigationControl(), "top-right");
+      Xe.on("load", () => { M.current = Xe; he(Xe); c && c(M, f); T4(Xe); I4(f.current); A4(f.current); J4(f.current); });
+    });
+    return () => { dead = true; Op(); Xe && Xe.remove(); M.current = null; };
+  }, []),
```
(the CSS dependency list in `rT` is how the CSS stops being a global file, finding 02). The same pattern applies at L102978 for `pO`.
- **Acceptance test:** LH mobile: entry `index-*.js` transfer <= 60 KB br and `unused-javascript` for the entry < 25%; the mapbox request starts after `LCP`; Playwright asserts `api.mapbox.com/styles/v1/mapbox/satellite-v9` is requested exactly once per session and only after the layout chooser is answered (finding 12); map still loads on Slow-4G with CPU x4.
- **Metric moved:** initial JS -1.8 MB raw (-465 KB wire at Netlify's encoder); TTI, FCP (JS no longer FCP-blocking in Lantern's graph), TBT (parse+eval moved off the critical window), Map Loads (billing).

### bundle-anatomy-08 - Split the application into entry shell + lazy panels with byte budgets
- **Severity/Effort:** high / L (M with source). **Refs:** P2, P7, D1. **Depends:** 07, 21.
- **Evidence:** section 2.2 rows; xref (4.3); existing lazy pattern already in use for two chunks (L112469-112470) inside a `Suspense fallback:null` at `bundle.pretty.js:113276-113282`.
- **Fix:** convert each panel JSX use in `AO` (L113242-113275) to `pt.lazy` + shared `Suspense`; group into chunks per section 4.1; the entry keeps: store, timeline `IO`, root/toolbar, HUD, loaders, layout chooser, onboarding steps. Budgets in 4.1. Add an accessible loading state for every lazy panel (fixes D1: Help modal appears 1-2 s late with no feedback: show the dialog shell immediately, hydrate content when the chunk lands; prefetch `HelpModal` and `BookmarkPanel` on toolbar hover/focus and at idle).
- **Acceptance test:** `vite build --report` (or `source-map-explorer`) shows entry <= 180 KB raw / <= 58 KB br; opening each panel triggers exactly one extra JS request; INP for panel opens <= 200 ms in Playwright with CPU x4.
- **Metric moved:** initial JS; INP; TBT; JS execution on load.

### bundle-anatomy-09 - Move inline data literals (150 KB) out of the JS into hashed JSON fetched on demand
- **Severity/Effort:** high / M. **Refs:** P2, H10, historian expansion. **Depends:** 10 (naming/caching).
- **Evidence:** table in 2.4 (`_A` L104440 = 111,003 B / 512 records; `d2` L104096 16,563 B; `th` L100063 14,104 B; `mA` L100615 4,228 B; `rO` L101876 2,108 B; `Gc` L111819 2,086 B). Together 150,092 B = 46.2% of app code and 6.6% of the whole bundle.
- **Root cause:** content authored as JS array literals inside components, forcing re-hash of the whole bundle on any copy edit and shipping walkthrough text to every visitor.
- **Fix:** export each array to `data/v1/<name>.<hash8>.json` (`monuments`, `tour-stops`, `nps-tour`, `sites`, `steps`); the component fetches on first open with `use()`/`useEffect` + a skeleton; `Cache-Control: public, max-age=31536000, immutable`. For monuments use a **columnar** layout with a category dictionary (group strings repeat 512x; `honors` and `loc` are prose) - expected ~40% raw reduction; br11 already only 14 KB so the win is raw/parse and independent cacheability. This also makes the Virtual Walkthrough and monuments a *shared data source* that `historian.html`, `search.html` and `regiment.html` can read (they currently fetch 1-4 other JSONs each) - it directly supports the "expand the historian databases" goal (one canonical monuments/tour dataset instead of copies inside a minified bundle).
- **Acceptance test:** entry+panel JS drops by >= 150 KB raw / ~25 KB br11; Network shows `monuments.<hash>.json` only after "Virtual Walkthrough" opens; 512 records render identically (snapshot test on the record list).
- **Metric moved:** bundle -150 KB raw; cache efficiency; content editability.

### bundle-anatomy-10 - Consolidate the boot data fetches (38 -> at most 3 on first paint), strip unused fields, hash + immutable
- **Severity/Effort:** high / M. **Refs:** P3, P1. **Depends:** none (can precede code split; loaders are 5 lines each at `bundle.pretty.js:96834-96941`).
- **Evidence:** section 7 table and stats. Boot set: 38 requests, 37 unique, 598,455 B raw, 138,605 B on the wire; each starts at ~606-615 ms unthrottled *after* JS evaluation (waterfall: index JS request done at 383 ms, first data request at 607 ms) so data cannot overlap JS download. `netlify.toml` `/data/*` = `public, max-age=3600` (no hash, no `immutable`, no `stale-while-revalidate`), and the SW treats `/data/` network-first.
- **Fix:** build script `scripts/build-data.mjs` (Node, runs in the Netlify build or pre-commit) emits: `data/v1/day1.<h>.json` (placements + density for Day 1, notes split off), `data/v1/oob.<h>.json` (all 14 OOB files merged, `metadata` removed, `commander_successions` once), `data/v1/story.<h>.json` (chronology x3 + vignettes x3, lazy), `data/v1/terrain.<h>.json` (lazy with map), `data/v1/day2.<h>.json`, `day3.<h>.json` (prefetched as today at tick >= 200 / 420, and on day-jump), `data/v1/notes-day{1,2,3}.<h>.json` (unit `notes` text, loaded when a unit panel opens). Reference the hashed names through a tiny `data-manifest` JSON inlined in HTML (no extra request). Add `<link rel="preload" as="fetch" crossorigin href="/data/v1/day1.<h>.json">` in `<head>` so it downloads in parallel with the entry JS. Headers: `/data/v1/*` `public, max-age=31536000, immutable`; legacy unhashed `/data/*.json` `public, max-age=300, stale-while-revalidate=86400`.
- **Measured effect (`data_an2.py`, `daybundles.py`):** boot files individually br11 = 112,203 B; **merged and metadata-stripped = 81,247 B br11 (-27.6%)**; with the Netlify-like encoder (br5) the sum of the 37 files is 130,827 B and the merged file 95,557 B (-27%), against the 138,605 B the browser actually downloads today (-31%); gzip-9 107,939 vs 137,576 B; metadata blocks alone are 18,660 B raw and unused by the app (they hold `sources`, `description`, `chunk` ids). Day 1 first-paint set: 717 records = 116,522 B merged min / **14,615 B br11** (vs 23,336 B as 16 files); without `notes` **6,440 B br11** (notes are 28,937 B raw / 7,952 B br11 and only shown in the unit panel). Group results: OOB 294,001 B min / 38,510 B br11; chronology 59,742 / 14,569; vignettes 57,216 / 16,417; terrain 12,457 / 3,006.
- **Acceptance test:** Playwright: <= 3 JSON requests before first interaction; every `/data/v1/*` response has `immutable`; second visit shows 0 network data requests; data schema tests (same `placementsByTick` keys/records before/after).
- **Metric moved:** requests 38 -> <= 3; wire data -31% at equal encoder (138.6 KB -> ~96 KB), and ~8-15 KB for the first-paint file alone; removes N-way parallel `JSON.parse`/flatMap work; repeat-visit data cost 0.

### bundle-anatomy-11 - Remove duplicate and eager fetches
- **Severity/Effort:** medium / S. **Refs:** P3. **Depends:** none.
- **Evidence:** `commander_successions.json` twice (L96769 list `eF`; L97520 `Hk` -> second `fetch` at t=612 ms in LH); chronology by `PF` (L98548) and mobile `pO` (L102956-102973); mobile `zp(1);zp(2);zp(3)` (L103040-103042) loads Days 2-3 immediately although desktop loads them lazily at tick >= 200/420 (`bundle.pretty.js:96991-96992`).
- **Fix:** one shared cached loader per resource (module-level promise), OOB result reused by `Hk`; mobile uses the same lazy day loading as desktop (`zp(day)` on first need + idle prefetch of the next day).
- **Acceptance test:** LH network table has no URL requested twice; mobile first load requests only Day 1 data.
- **Metric moved:** -1 request desktop; -31 requests / ~-220 KB raw mobile.

### bundle-anatomy-12 - Two Map instances per mobile visit; create the map only after the layout is known
- **Severity/Effort:** high / M. **Refs:** H3, P1, P2. **Depends:** 07.
- **Evidence:** section 2.7: `gF` mounts a Map while `Zn === null` (chooser showing); choosing Mobile unmounts it (`Zn !== "mobile"` guard, `bundle.pretty.js:113071`, `113233-113239`) and `pO` creates another (L102981). Two `sku` sessions are created; the 20 tiles/345 KB and both worker blobs (2 x 838,974 B) are duplicated in work.
- **Fix:** persist the layout (H3; `localStorage.gtbg_layout`), auto-detect (`matchMedia('(pointer:coarse)')`/width) as the default selection, and mount the Map **only** when a layout exists (returning users: immediately behind the poster; first-time users: after the choice, while the chooser screen shows the poster). Share one map-init module between desktop and mobile layouts (options differ only in `zoom`, `attributionControl`, `maxBounds`).
- **Acceptance test:** Playwright on a 375x812 emulation: exactly one `api.mapbox.com/styles/v1/mapbox/satellite-v9` request and one `map-sessions` request per session; no `Map` created before layout resolved.
- **Metric moved:** halves Map Loads and tile bytes on mobile, removes a 150-400 ms remount task, less GPU memory (mobile crash risk).

### bundle-anatomy-13 - Replace the 3.5 s "fast-forward" splash with a static poster; make any intro opt-in
- **Severity/Effort:** high / M. **Refs:** H3, C6, P1 (INP/CLS/LCP). **Depends:** 14, 15.
- **Evidence:** `tO` (`bundle.pretty.js:101472-101592`): `eO = 3500` (L101471); after data + 800 ms it animates `currentTick` 1 -> 675 by `yn.setState` every rAF (L101487-101505), mounting event cards and story panels as ticks pass; LH `layout-shifts`: 15 shifts (0.0726 total) attributed to that splash content div, the event card (`bottom:120px;left:50%`) and story text blocks; LH long tasks (14, 433 ms max) cluster at 1.0-2.5 s unthrottled. The RUM LCP p75 > 4 s cannot come from the 287 ms observed LCP; a later, larger text block (story/event card, which appear during the fast-forward) becoming the LCP candidate is the most plausible source (INFERENCE; verify with finding 06).
- **Root cause:** a cinematic intro implemented as real state changes on the live tree, gated on data readiness.
- **Fix:** boot shows the static poster + title (finding 15); the "Choose your experience" screen is the first interactive state; the intro becomes an optional "Watch the 3-day overview" that runs a canvas-only animation (no React state per frame) or a pre-rendered short video/APNG; **suppress story panels, event cards and toasts until the first user gesture** so nothing text-heavy competes for LCP or shifts layout during boot.
- **Acceptance test:** Chrome tracing: zero long tasks > 50 ms between navigation start and first user input (excluding map init tasks <= 100 ms each); `PerformanceObserver('largest-contentful-paint')` final entry is the poster/title element; CLS <= 0.02 during the first 5 s.
- **Metric moved:** INP, TBT, CLS, LCP stability.

### bundle-anatomy-14 - Selector subscriptions and memoization; stop per-frame whole-tree renders
- **Severity/Effort:** high / L. **Refs:** P1 (INP), P7, H9. **Depends:** 21 (needs an editable source or a codemod).
- **Evidence:** 26 `= yn()` calls, 0 selectors, 0 `memo` (section 2.7). The playback loop `Ed` (`bundle.pretty.js:96965`) calls `x({currentTick: it})` per tick; at 16x that is ~32 store updates/s each re-rendering `AO` (L112921) and every child that destructures the store.
- **Fix:** `const tick = useStore(s => s.currentTick)`; split the store into `usePlayback` (tick, isPlaying, speed), `useUi` (panels), `useData` (oob, placements) with `zustand/shallow`; `React.memo` for panels that do not depend on the tick; keep the canvas renderer reading `yn.getState()` inside rAF (as it already does) instead of React state; avoid rebuilding style objects per render (hoist or CSS classes, see 2.4). For a **codemod without source**: the 26 destructuring sites are mechanical (`const {a,b,c} = yn()` -> `const a = yn(s=>s.a), b = ...`); an AST script can rewrite them with the names taken from the pattern.
- **Acceptance test:** React Profiler / `why-did-you-render` script in Playwright: during 10 s of 8x playback, commits/second <= ticks/second and components not showing tick-dependent UI (Legend, Filter, Search, toolbar) commit 0 times; INP for Play/Pause <= 100 ms with CPU x4.
- **Metric moved:** INP (RUM Poor > 500 ms), TBT during playback, battery on mobile.

### bundle-anatomy-15 - Static LCP poster, LCP element design, and HTML-first shell
- **Severity/Effort:** high / M. **Refs:** P1, P7, H3, E4. **Depends:** 04, 13.
- **Evidence:** the first paint is already an HTML splash (`deploy/index.html:742-748`, inline CSS L90-142) so FCP does not need JS in reality (observed FCP 287 ms), but (a) `#seo-content` text (L717-741) is in normal flow under the splash and is a text LCP candidate, (b) after React mounts the container is replaced and later text blocks compete for LCP, (c) Lighthouse's simulated FCP (4,099 ms) most likely tracks the 604 KB modulepreloaded/High-priority script (transfer 3.28 s at 1,474 Kbps) as if it blocked paint (inference from the numbers; not a documented Lantern rule I verified).
- **Fix:** (1) ship a full-viewport **poster** `<img>` (AVIF/WebP, <= 30 KB br for 375-wide, <= 60 KB for 1280-wide via `srcset`) with explicit `width/height`, `fetchpriority="high"`, `decoding="async"` and `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">`; a full-bleed image is the largest possible LCP candidate, so later text blocks cannot replace it (Chrome ignores extremely low-entropy placeholder images, so use real artwork). Content options (pick one; all avoid Mapbox content caching questions): an **SVG/vector sketch drawn from the app's own GeoJSON** (roads `x4`, rivers `b4`, works `w4`, farms `S4` at `bundle.pretty.js:9450-9745` + `terrain.json` features; ~10-20 KB) stylised as an 1863 map, or a public-domain historical map scan (candidate: Library of Congress Gettysburg battlefield maps - UNVERIFIED item/URL), or a Mapbox **Static Images API** call (allowed use per Mapbox, 50,000 free requests/mo then $1/1,000; storing/re-hosting a snapshot is a ToS question I could not resolve from the pages I could read - check Mapbox Product Terms before self-hosting a capture). (2) Inline critical CSS <= 6 KB; no render-blocking file. (3) Do not let any text block > poster area render before first input. (4) Entry script `type="module"` stays in `<head>` but with `fetchpriority="low"` while the poster carries the LCP; remove the `modulepreload` (finding 02). (5) Map fades in on `map.once('idle')`.
- **Acceptance test:** LH mobile LCP element = poster (`largest-contentful-paint-element`), LCP <= 1.5 s; `web-vitals` field LCP element distribution shows the poster >= 95%.
- **Metric moved:** LCP, FCP (lab), CLS (fixed poster box).

### bundle-anatomy-16 - Map-engine decision record and spike (Mapbox v3 vs v2.15 vs MapLibre vs Leaflet-lite vs own tiles)
- **Severity/Effort:** high / M (spike) then L-XL (migration). **Refs:** P2, X1, S2. **Depends:** 07.
- **Evidence:** section 5 (sizes from jsDelivr file listings; licences from `LICENSE.txt` / package.json; pricing from mapbox.com/pricing). App API surface (2.3) is tiny; sub-pages: 6 of 8 map pages use only `addSource/addLayer/flyTo` (`camera.html`, `viewshed.html`, `ground-remembers.html`, `watch-together.html`, `immersive.html`, `sandbox.html`); only `compare.html` (pitch, raster-dem + `setTerrain` x3, Popup) and `cinematic-export.html` (`preserveDrawingBuffer`, `captureStream`, `MediaRecorder`) need real GL features.
- **Fix:** run a 1-day spike that puts the map behind a 6-method facade (`create`, `flyTo`, `project`, `unproject`, `setGeoJSON`, `destroy`) and measures each candidate on the same route (bytes, init ms, tile bytes, visual diff); recommendation ladder: **Step 1** lazy-load v3.24.1 (finding 07, no risk); **Step 2** pin `mapbox-gl@2.15.0` (986 KB, -45%; the previous builds ran v2; identical billing/licence; verify maintenance status and that satellite-v9 features used are unaffected); **Step 3** MapLibre (BSD-3-Clause) with raster imagery and self-hosted glyphs (-48% raw vs v3 for v5.6.0 UMD); **Step 4 (largest, riskiest)** Leaflet (BSD-2-Clause, 147.5 KB raw ~40 KB br) with the Static Tiles API at 512 px (documented for Leaflet) because the vector engine is only drawing 5 tiny layers and the units are already drawn on the app's own canvas.
- **Acceptance test:** decision recorded in `docs/adr-map-engine.md` with measured table; chosen option passes visual regression on: initial view, Day 1 opening, Pickett's Charge, distance tool, layers panel, mobile 375x812.
- **Metric moved:** map chunk 465 KB br -> 240 KB (v2.15/MapLibre est.) -> ~50 KB (Leaflet est.); TTI/TBT; Map Load billing model.

### bundle-anatomy-17 - Mapbox runtime options to cut work now (workers, glyph PBFs, iconset, tiles)
- **Severity/Effort:** medium / S-M. **Refs:** P2, X3. **Depends:** 07.
- **Evidence:** LH shows two blob workers (2 x 838,974 B parse), `iconset.pbf` 72,372 B (20,828 B wire), 2 glyph PBFs 152,750 B (88,898 B wire), 20 tiles 345,177 B, 5 unused preconnects; `mapbox-gl.d.ts` (3.24.1) exposes `localFontFamily` (MapOptions), `maxTileCacheSize`, `fadeDuration`, `renderWorldCopies`, and a static `workerCount`.
- **Fix (each verify visually/functionally):** `mapboxgl.workerCount = 1` on mobile (halves worker parse/memory; verify the property is public in v3); `localFontFamily: 'Georgia, serif'` to render the 5 label layers with a system font (drops both glyph PBFs, -89 KB wire, -2 requests; text look changes); provide a **minimal inline style object** (`{version:8, sources:{sat:{type:'raster', tiles:[...], tileSize:256}}, layers:[...]}` or `map.setStyle` with only the raster source) so `iconset.pbf` and the style-JSON round trip disappear (verify the sprite is unused by the app's layers); `renderWorldCopies: false`; `fadeDuration: 0` on mobile; keep `maxBounds` (already set). Use the `mapbox-gl-csp` build + a self-hosted worker file (`mapbox-gl-csp-worker.js`, 780,619 B) so the worker is a cacheable static file and CSP can drop `worker-src blob:` (X3); note the CSP build does not shrink total bytes (main 1,743,709 B + worker 780,619 B).
- **Acceptance test:** Playwright network log: <= 1 worker script parse, no `fonts/v1/mapbox` and no `iconset.pbf` requests; labels render.
- **Metric moved:** -110 KB wire, -3 requests, ~-420 KB less worker parsing.

### bundle-anatomy-18 - Sub-page maps load a second 1.8 MB copy of mapbox-gl from the CDN
- **Severity/Effort:** medium / L. **Refs:** S2, S3, S4, P2. **Depends:** 16.
- **Evidence:** `camera`, `viewshed`, `compare`, `sandbox`, `ground-remembers`, `watch-together`, `immersive`, `cinematic-export`, `unit-rendering-reference` `.html` each `<script src="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js">` + CSS (grep of `deploy/*.html`). Same version as the home bundle but a separate copy (home is inlined, so nothing is shared); the CDN copy is `Cache-Control: max-age=31536000` with `content-encoding: br` (HEAD checked) so it is cached across sub-pages but never reused by the home page. `compare.html` creates two maps (2 map loads per view).
- **Fix:** (1) one shared self-hosted `assets/map-vendor-<hash>.js` used by home *and* sub-pages via `<script type="module">` (cache hit when navigating), or (2) for the six basic pages use a Leaflet/MapLibre "map-lite" facade (finding 16), or (3) a **click-to-activate facade**: static poster/`Static Images API` snapshot first (S2 fixes the "blank map for ~3 s"), interactive map on first pointer/scroll intent; keep GL only for `compare` (terrain) and `cinematic-export`.
- **Acceptance test:** navigating home -> camera -> compare downloads mapbox code once (Network shows one `map-vendor-*.js` 200 then disk-cache hits); Ground Remembers shows the poster within LCP budget.
- **Metric moved:** sub-page JS 1.8 MB -> 0-50 KB; Map Loads.

### bundle-anatomy-19 - Build configuration (when a real build exists)
- **Severity/Effort:** medium / S-M. **Refs:** P2, P6. **Depends:** 21.
- **Evidence:** the bundle shows optional chaining lowered to `==null?void 0:` (65 occurrences; e.g. `bundle.pretty.js:96867`), i.e. a pre-ES2020 target; the Vite modulepreload polyfill (stmt 0, 710 B) ships although every supported browser has native `modulepreload`; LH `valid-source-maps` fails ("Large JavaScript file is missing a source map", once per load); Vite's `(Fk?"production":void 0)!=="production"` zustand shims and 6 React licence banners are present.
- **Fix:** `vite.config.js`:
```js
export default defineConfig({
  build: {
    target: 'es2022',                       // keep ?. and ?? native (-2..4 KB br), no legacy helpers
    modulePreload: { polyfill: false },
    sourcemap: true,                        // publish maps for entry/app chunks; satisfies LH valid-source-maps (>500 KB scripts)
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: { output: {
      manualChunks: { react: ['react', 'react-dom', 'zustand'], mapbox: ['mapbox-gl'] },
      entryFileNames: 'assets/[name]-[hash].js', chunkFileNames: 'assets/[name]-[hash].js',
    } },
  },
  esbuild: { legalComments: 'none' },       // put licences in /THIRD-PARTY-NOTICES.txt
});
```
Publish `THIRD-PARTY-NOTICES.txt` (React/zustand MIT; Mapbox ToS reference) to stay compliant while removing banners.
- **Acceptance test:** `unused-javascript` and `valid-source-maps` pass for the entry chunk; the built HTML contains no `modulepreload` polyfill.
- **Metric moved:** Best Practices (`valid-source-maps`), -2..4 KB br.

### bundle-anatomy-20 - (Optional) Swap React for Preact-compat on the critical path
- **Severity/Effort:** low-medium / M-L. **Refs:** P2. **Depends:** 08, 14, and a passing test suite.
- **Evidence:** react + jsx + scheduler + react-dom = 143,345 B raw (br5 45,473). jsDelivr: preact 10.29.8 `preact.mjs` 11,693 B + `hooks.mjs` 3,647 B + `compat.mjs` 10,300 B = 25,640 B raw (~9-10 KB br est.). The app uses only hooks, `lazy/Suspense`, `StrictMode`, `createRoot` and zustand's `useSyncExternalStore` (shipped by compat).
- **Fix:** alias `react`/`react-dom` to `preact/compat` in Vite; keep behind a flag for one release.
- **Acceptance test:** full Playwright regression; entry <= 65 KB raw / ~22 KB br.
- **Metric moved:** entry -117 KB raw / ~-35 KB br5 (only after 08).

### bundle-anatomy-21 - There is no editable source: choose between an AST chunk-splitter and source recovery (N1)
- **Severity/Effort:** high / XL (splitter L). **Refs:** N1. **Depends:** none (blocks 07, 08, 14, 19, 20).
- **Evidence:** section 2.6 (frozen bundle, patched 13+ times); `RECON_SRC` is from an older build; `Downloads/gettysburg_FIXED_v25/src` (40 modules, 192,650 B of JS/JSX: `App.jsx`, 22 components, 10 engine files, 3 hooks incl. `useDeviceLayout.js`/`useLazyComponents.jsx`/`useRenderThrottle.js`, `store/useAppStore.js`) is the Jun-12 lineage with a proper `vite.config.js` `manualChunks` (`mapbox`, `react`, `zustand`, `engine`, `components`) and mapbox `^3.2.0`. A grep for `walkthrough|ancestor|Soldier` in that `src` finds nothing, so **every feature added since (Virtual Walkthrough, Follow Your Ancestor, Soldier's Eye, NPS Auto Tour, Gtbg layers/distance, mobile layout `pO`, toolbar) exists only in the patched bundle**; v25 is a structural skeleton (chunking, hooks), not a source of the current app. The bundle's app region is 17,831 lines / 508 KB pretty-printed (`app_only.js`).
- **Fix - track A (recommended stop-gap, L):** a committed `tools/split-bundle.mjs` (uses Rollup's `parseAst`, already a Vite dependency) that (1) parses the frozen `index-Cg8FAMXN.js`, (2) assigns top-level statements to chunks with the ENTRY/MAP/PANELS assignment in 4.3, (3) emits `export`/`import` for the small cross-group interface (names listed in 4.3), (4) rewrites the ~29 static component references in `AO` to `pt.lazy(() => import(...))`, (5) applies the mapbox loader patch (finding 07). Because everything is ESM top-level, live bindings work across chunks; keep the playback module (`let Fp, F_, Hc, uA, hA`, L96950-96954) in one chunk because `let` bindings cannot be reassigned across module boundaries.
- **Fix - track B (durable, XL):** treat `bundle.pretty.js` L96207-113377 + L9342-10001 as the source of truth and turn it into modules with an AST rename pass (names come from the intact string literals and JSX) plus manual review; keep the Jun-12 `gettysburg_FIXED_v25` tree only for structure. Deliver a repo with tests; deploy only from it.
- **Acceptance test:** `npm run build` in the new repo reproduces bytes within 1% of the intended chunks; Playwright smoke suite passes against both the old and the split build (same screenshots of Day 1 opening).
- **Metric moved:** unblocks every code-level performance item; removes N1.

### bundle-anatomy-22 - Performance budgets and CI guardrails
- **Severity/Effort:** medium / M. **Refs:** P1, P7. **Depends:** 08.
- **Fix:** enforce section 4.1 budgets with `size-limit` (per-chunk raw/br), Lighthouse CI (mobile + desktop, `assertions` on FCP <= 1800, LCP <= 2500, TBT <= 200, CLS <= 0.1, `unused-javascript`, `render-blocking-insight`, `valid-source-maps`, `errors-in-console`), and a Playwright network test (request counts, no duplicate URLs, one document request, one Map per session, all `/data/v1/*` immutable).
- **Acceptance test:** CI fails on a deliberately bloated PR.

### bundle-anatomy-23 - Four divergent tick-to-clock implementations (root cause of C3/C4)
- **Severity/Effort:** high / S-M. **Refs:** C3, C4. **Depends:** none.
- **Evidence:** `getTickTime` (`bundle.pretty.js:9371-9383`: Day 1 base 6*60, Days 2-3 base 4*60), `M4` (L9856-9859: base 5*60), `JF` (L100836-100838), `QF` (L100998-101001), HUD `July ${l + 2}` (L97428), plus `Compare`/`Living Ledger`/data labels that use 5:00 (`chronology_day1.json` `tick_formula`: "Tick 1 = 5:00am July 1").
- **Fix:** one exported `tickToClock(tick)` and `tickToDate(tick)` in the entry chunk (single constants: `DAY_START = {1:'05:00', 2:'05:00', 3:'05:00'}` per the data files, plus an explicit offset table if the historical mapping needs compression), imported by the store, HUD, overlay, event card and toasts; unit test for ticks 1, 17, 225, 226, 451, 675. (Which base is *historically* right is for the data specialists; the plan item is to make it a single source of truth.)
- **Acceptance test:** grep finds one implementation; snapshot test of 20 ticks across all UIs.
- **Metric moved:** correctness (C3/C4) with less duplicated code (~0.6 KB).

### bundle-anatomy-24 - Data-format scale plan for the expanded databases
- **Severity/Effort:** medium / L. **Refs:** historian expansion, P3. **Depends:** 10.
- **Evidence:** deployed placement data = 694 placements + 1,110 density = **1,804 keyframes** (e.g. `placements_day1_ticks1_50.json` says `record_count: 4890` but contains 100 records); `placement_schema.json` `total_placement_records: "approximately 430000"`. Today's per-day merged data is tiny (Day 1: 117 KB raw / 14.6 KB br11) but at 430,000 rows x ~150 B/row JSON = ~63 MB raw. My prototype (`columnar.py`): Day 1 columnar JSON 25,668 B raw / 5,374 B br11, binary struct 11,472 B raw / 4,556 B br11 (vs row-JSON no-notes 86,733 B raw / 6,440 B br11).
- **Fix:** design the data pipeline now so the loader is format-agnostic: row JSON (today) -> columnar JSON with dictionaries (<= 100k rows) -> typed-array binary + per-tick-range files decoded in a Worker (>= 100k rows; ~9 B/row => ~4 MB raw for 430k rows before compression). Keyframes + interpolation (already in the app: `F4` easing, L96237-96257) remain the compression strategy; keep `notes`/prose in separate files keyed by record id. Shares the schema/manifest with the Historian ingestion pipeline so one build step feeds both.
- **Acceptance test:** loader unit tests over all three formats; a synthetic 430k-row dataset loads < 1 s off-main-thread and < 5 MB on the wire.
- **Metric moved:** future-proofing; INP/TBT at scale.

### bundle-anatomy-25 - Keys and tokens duplicated in the bundle (for X1/X2 owners)
- **Severity/Effort:** low / S. **Refs:** X1, X2. **Depends:** none.
- **Evidence:** the same Mapbox public token appears twice as literals (`a2` `bundle.pretty.js:97209-97210`, `fO` L102898-102899) and a Google Maps embed key at `mO` (L110610).
- **Fix:** one `config` constant read from a build-time env var; restrict both keys by referrer/API in the provider consoles (owners of X1/X2); moving the map behind a lazy chunk does not change exposure.
- **Also noted:** the mobile map is created with `attributionControl: !1` (`bundle.pretty.js:102988`); Mapbox's terms require its logo/attribution to remain visible somewhere (verify against the Product Terms; not confirmed from the pages I could read), so check that the mobile layout renders attribution by other means.
- **Acceptance test:** grep for `pk.eyJ` and `AIza` finds one occurrence each; foreign-Referer request returns 403.

### bundle-anatomy-26 - Compression ceiling and Netlify behaviour
- **Severity/Effort:** low / S (investigation). **Refs:** P2. **Depends:** none.
- **Evidence:** live brotli 603,777 B vs 509,235 B at q11 (+18.6%, +94.5 KB).
- **Fix:** test whether Netlify serves a committed `index-xxx.js.br` (UNVERIFIED; I found no evidence either way); if not, the only levers are fewer raw bytes (this plan) or a fronting CDN that pre-compresses at q11. Do not spend effort here before 07/08.

### bundle-anatomy-27 - Content-hash integrity: the same asset URL has served different bytes
- **Severity/Effort:** medium / S. **Refs:** N1, C6. **Depends:** none.
- **Evidence:** `index-Cg8FAMXN.js` is 2,280,095 B (md5 `0903f96b56e137875bac824bff5faac6`) in the Jul 20 zip and 2,280,438 B (md5 `7ef75b95f4c02700430b8aa91e3a7459`) in the Aug 22-Sep 29 zips; first differing byte at offset 151,648 (the store: `showUnits:!0` and `toggleUnits` added). `netlify.toml` serves `/assets/*` as `public, max-age=31536000, immutable`; `sw.js:41-50` serves `/assets/*` cache-first; `sw.js:5-13` precaches the fixed name.
- **Root cause:** hand-patching the built file in place without renaming it (a hash that no longer matches content).
- **Fix:** the deploy script recomputes `sha256(content)[0:8]` for every asset, renames the file and rewrites references in `index.html`/`sw.js`/lazy chunks (or, better, only ever deploy Vite output); CI check: `hash(file) === name suffix` for `assets/*`; after this ships, bump the SW cache name so all clients drop the old copies (finding 03).
- **Acceptance test:** CI script fails when any `assets/*` file's content hash differs from its name; a browser that loaded the Jul-20 file receives the current bytes after the first deploy of the fix.
- **Metric moved:** correctness/reliability of caching; prevents mixed versions (e.g., lazy chunk importing exports `TF/RO/kO/PO/IF/yn` from a stale index).

---

## 4. Code-splitting and lazy-loading plan with hard byte budgets

### 4.1 Target chunk map and budgets

Byte counts are measured from the current bundle (section 2.2) unless marked "target".

| Chunk / asset | Contents | Raw now (B) | Raw budget | Wire budget (Netlify br ~q5) | Load trigger | Cache |
|---|---|---|---|---|---|---|
| HTML | inline critical CSS + poster + splash + data-manifest | 39,638 | <= 14,000 | <= 5,000 | navigation | `max-age=0, must-revalidate` |
| Poster image | AVIF/WebP `srcset` | - | 375w <= 35 KB; 1280w <= 60 KB | same (already compressed) | `<link rel=preload as=image fetchpriority=high>` | immutable |
| **entry** | react + react-dom + scheduler + jsx + zustand + preload helper (149,028) + shell: store (6,560), loaders (5,209, to be rewritten), HUD/timeline (~5,700), root/toolbar (7,046), layout chooser (~3,200) | 2,280,438 | **<= 180,000** (<= 60,000 with Preact) | **<= 58,000** (<= 22,000 with Preact) | module script in `<head>`, `fetchpriority=low` while poster is LCP | immutable, hashed |
| **map** | mapbox-gl 3.24.1 (1,806,133) + map engine/layers (roads, overlays, touch, interpolation, unit renderer, playback loop, MapView, Gtbg layers; ~38,000) | (inside entry) | v3: <= 1,850,000; v2.15/MapLibre: <= 1,050,000; Leaflet-lite: <= 200,000 | **v3 <= 470,000; v2.15/MapLibre <= 240,000; Leaflet-lite <= 50,000** | `requestIdleCallback` after LCP (timeout 2,500 ms) or first pointer intent, whichever first; only after layout known | immutable, own hash (`manualChunks.mapbox`) |
| mapbox CSS | mapbox-gl.css | 40,827 | 40,827 | 5,224 | dep of `map` chunk | immutable |
| panel: walkthrough | `_O` + styles (`tn`,`ln`) code only after data extraction | 151,420 | <= 25,000 (code) | <= 7,000 | click "Virtual Walkthrough" (prefetch on hover/idle) | hashed |
| data: monuments/tour | 512 monuments + 16 stops (111,003 + 16,563 B as JS today) | (in JS) | <= 100,000 min JSON | <= 15,000 | first open of walkthrough / historian / search | immutable |
| panel: search+filter+legend+minimap | 701-712 | 18,060 | <= 20,000 | <= 6,000 | first open / idle prefetch | hashed |
| panel: roster/OOB tree | 736-746 | 9,654 | <= 12,000 | <= 3,500 | open | hashed |
| panel: story + events + toasts + casualty ticker | 691-700, 713-719, 730-731 | ~26,000 | <= 30,000 | <= 9,000 | after first user gesture | hashed |
| panel: NPS Auto Tour | `XF`, `th` moved out | 25,247 (incl. `th`) | <= 10,000 | <= 3,500 | click | hashed |
| panel: ancestor, Soldier's Eye, unit panels | 673-690, 722-727, 733-735 | ~35,000 | <= 40,000 | <= 12,000 | on open | hashed |
| panel: mobile layout `pO` | 747-749 | 14,992 | <= 16,000 | <= 5,000 | when layout = mobile | hashed |
| panel: sound + onboarding tour | 621-625, 756-759 | ~9,700 | <= 10,000 | <= 3,500 | toggle / first visit | hashed |
| BookmarkPanel, HelpModal | already lazy | 4,869 / 7,027 | keep | keep | prefetch on hover | hashed |
| data: day1 first paint | placements + density Day 1, notes split | 116,522 (row JSON) | <= 30,000 (columnar) | **<= 8,000** | `<link rel=preload as=fetch>` in head | immutable |
| data: oob | 14 files merged | 313,804 | <= 300,000 | <= 45,000 | idle after LCP / before first unit interaction | immutable |
| data: story (chronology + vignettes) | 6 files | 122,706 | <= 120,000 | <= 32,000 | first event/vignette need | immutable |
| data: day2, day3, terrain | | 114,068 / 105,659 / 13,470 | | | prefetch at tick >= 200 / 420, day jump | immutable |

Global budgets: bytes on the wire before LCP <= 65 KB (HTML + poster + entry deferred is *not* counted because LCP is the poster); JS transferred before first interaction <= 60 KB br (entry) + 470 KB br (map, background, does not block LCP); any main-thread task in the first 5 s <= 50 ms except map-init tasks <= 100 ms each; total JS executed at boot (entry) <= 120 ms at CPU x4.

### 4.2 What "lazy" means for each dependency

- Map: `import()` from idle; the layout chooser and splash render over the poster; `map.once('idle')` fades the poster.
- Panels: `pt.lazy` + one `Suspense`; the panel shell (title, close button, `role="dialog"`, `aria-busy`) renders immediately, so D1 ("Help modal appears late") disappears.
- Data: everything except Day 1 keyframes is fetched at idle or on demand; never all at boot.

### 4.3 Split feasibility from the cross-reference scan (`xref.cjs`)

Groups (by statement index): ENTRY = 593-595, 647-652, 670-672, 747-748, 751, 760-761, 765-769; MAP = 596-605, 608-646, 653-669, 722-724, 762-764; MAPBOX = 606-607; PANELS = everything else. Results:

| Direction | Distinct names | Notes |
|---|---|---|
| MAPBOX -> app | 1 | consumed as `Ok`/`R4`/`z_` only |
| MAPBOX <- vendor | 40 | react/uSES helpers and globals (`gB`, `cS`) |
| ENTRY -> MAP | 7 | `sT, Yx` (FPS helpers: move to entry), `gF` (MapView), `KF` (monuments layer), `GtbgDist, GtbgLoc, GtbgLayers` |
| ENTRY -> PANELS | 29 | `f2,TO,wO,SO` (onboarding-tour styles, belong to entry group), `tO,_O,pO,bO,FF,OF,VF,WF,CF,LF,Zk,XF,iO,nO,yO,Yk,Xk,Jk,qF,MF` (components to make lazy), `TF,RO,kO,PO,IF` (share/bookmark utils; already exported for the lazy chunks) |
| MAP -> ENTRY | 6 | `x4,b4,w4,S4` (GeoJSON constants), `yn` (store), `zp` (day loader) |
| MAP -> PANELS | 1 | `mA` (monument highlights, data) |
| PANELS -> ENTRY | 7 | `yn, fO, zp, u2, h2, v1, gO` |
| PANELS -> MAP | 13 | `so, Kx, e1, Lp, z_, Xx, Op, Gk, y1, aT, a2, U4, jk` (canvas renderer, spatial index, interpolation, token, audio) |

The interface is small. Recommended re-homing: move `sT/Yx`, `mA`, `U4/jk` (audio) and `y1/Lp/aT/Xx` to the shared "engine" module that both MAP and PANELS import (put it in MAP or a tiny `engine` chunk; do not import MAP eagerly from the entry).

### 4.4 Two ways to produce the split (see finding 21)

Track A (no source, L): AST splitter as specified. Track B (source, XL): real modules + Vite config (finding 19) with `React.lazy` boundaries at exactly the groups above.

---

## 5. Reducing mapbox-gl cost: options, sizes, licensing, cost

Sizes are file sizes from jsDelivr package listings (raw) and my local compression of the mapbox files; ratios (br5 ~24%, br11 ~21%, gzip-9 ~27% of raw, measured on mapbox v3 code) are applied to libraries I could not compress locally and are ESTIMATES (+-3 pts). Prices are as read from mapbox.com/pricing on 2026-09-29/30 and can change.

### 5.1 Size table

| Option | Raw (B) | br11 (measured/est.) | br5 ~ Netlify (est.) | vs today's mapbox (br5 453 KB) |
|---|---|---|---|---|
| mapbox-gl **3.24.1** UMD (today, inlined) | 1,796,551 (bundle: 1,806,133) | 385,039 (bundle region 401,877) | 435,019 (bundle 453,268) | baseline |
| mapbox-gl 3.24.1 **ESM** (`core`+`shared`+`worker`) | 1,701,330 (+ HD lazy 89,239) | 376,123 (+22,135) | 427,043 | -2% |
| mapbox-gl 3.24.1 CSP build (main + separate worker file) | 1,743,709 + 780,619 | 360,689 + 171,204 | 413,604 + 195,307 | +0% (worker duplicated) |
| mapbox-gl **2.15.0** | 985,978 (css 35,658) | ~207 KB est. | ~239 KB est. | **-45%** (-196 KB br5) |
| mapbox-gl 1.13.3 (last BSD-3 version) | 767,202 (css 35,147) | ~161 KB est. | ~186 KB est. | -58% |
| **maplibre-gl 5.6.0** UMD (BSD-3-Clause) | 939,269 (css 69,422) | ~197 KB est. | ~227 KB est. | -48% |
| maplibre-gl 6.11.2 ESM (`maplibre-gl.mjs` 590,228 + `shared` 515,924 + `worker` 19,133; css 83,310) | 1,125,285 | ~236 KB est. | ~270 KB est. | -40% (bigger than 5.x because of the shared split; verify what the main thread actually loads) |
| **Leaflet 1.9.4** (BSD-2-Clause) | 147,552 (css 14,806) | ~31 KB est. | ~35 KB est. | **-92%** |
| Leaflet + `protomaps-leaflet` 5.0 (vector tiles) | 127,298 + 147,552 | - | - | not needed (imagery is raster) |

### 5.2 Options in detail

**A. Keep mapbox-gl v3, defer it (finding 07).** Zero visual risk; removes the map from the critical path; map wire cost unchanged (~470 KB). Also delays the billable Map Load until needed (a bounce at the splash no longer bills). Licence: Mapbox ToS (`LICENSE.txt` v2.0: licensed "for use only with the relevant Mapbox product(s)", requires an active Mapbox account, and "modifications that change or interfere with marked portions of the code related to billing, accounting, or data collection are not authorized"), so tree-shaking/patching mapbox internals or disabling its telemetry is not an option. Cost: Map loads 50,000 free/month then $5.00/1,000; a map load is a `Map` initialisation with a 12-hour session (docs). With ~1.7k home views/30 d (+ mobile double load + sub-page maps + bot JS execution) the site is far below the free tier, so cost is not the driver; performance is.

**B. Mapbox v3 ESM build (`mapbox-gl/esm`).** Real chunking (`core`, `shared`, `worker` as module worker via `new Worker(new URL('worker.js', import.meta.url), {type:'module'})`, HD features lazy `import("./hd.shared.js")`), no blob worker, no `worker-src blob:`. Saves ~5% and fixes CSP/caching, but is not a cost fix and I could not verify Vite worker handling for a dependency's `new URL` worker (spike).

**C. Pin mapbox-gl 2.15.0.** -810 KB raw. Same licence, billing, telemetry, `satellite-v9` style. The previous builds used it (RECON_SRC `^2.15`). The app uses only the basic API (2.3). Risks: no new features/patches (verify Mapbox's support status for 2.x), slightly different label/collision behaviour. Cheapest large win after A (effort S-M).

**D. MapLibre GL JS (BSD-3-Clause).** API is the v1.13 lineage so `new Map`, `addSource/addLayer`, `flyTo`, `project` keep working; needs a style object with a raster source. Imagery must come from a raster tile URL: (i) Mapbox **Raster Tiles API** `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}{@2x}.jpg` (docs: consumable "in any spatial application that supports image-based XYZ tilesets"; `mapbox.satellite` is always delivered as JPEG; billed per tile request: 750,000 free/month then $0.25/1,000) or the **Static Tiles API** `/styles/v1/mapbox/satellite-v9/tiles/{256|512}/{z}/{x}/{y}` (docs explicitly say it works with Leaflet/OpenLayers; 200,000 free then $0.50/1,000; use 512 px to avoid 4x requests). Whether Mapbox's ToS permits its raster tiles inside a non-Mapbox SDK for a public site must be confirmed with Mapbox (the pages I read say usable with third-party libraries and require no explicit attribution wording, but I could not read the full Product Terms - UNVERIFIED); Mapbox logo/attribution should stay. Glyphs: self-host two Latin ranges (Open Sans 0-255 Regular/Italic is what is fetched today: 152,750 B raw) under an OFL font pack, or `localFontFamily`-style rendering; do not use Mapbox glyph URLs with MapLibre. Tile URLs carry `access_token`, so the token restriction (X1) applies unchanged.

**E. Leaflet-lite + Static/Raster Tiles API.** The app's own canvas already draws units and trails (`lS` L96506, `cA` L96741), so the GL engine provides only: raster basemap, pan/zoom/fly, `project/unproject`, and 5 small line/symbol/circle layers (roads, rivers, works, farms/locations, distance tool). Leaflet provides all of these (`latLngToContainerPoint`, `flyTo`, `L.geoJSON`/`L.polyline`, `L.tooltip` permanent labels or canvas text). Rotation and pitch are unused (`Map` options set `center`, `zoom`, `minZoom`, `maxZoom`, `maxBounds`, `dragPan`, `scrollZoom` only; L97237-97250). Losses: GL's smooth fractional zoom feel (Leaflet supports `zoomSnap: 0.5`/fractional), symbol collision, 60 fps vector labels. Effort L; expected map chunk ~50 KB br (-92%), no workers, no WebGL context (helps low-end phones, removes WebGL context-loss failure class), removes the 2-worker parse.

**F. Own tiles (PMTiles) / free public-domain imagery.** For the `maxBounds` [-77.36,39.72]-[-77.12,39.91]: tile counts z11-z18 = 9, 16, 49, 156, 552, 2,024, 8,008, 31,675 (total 42,489; z<=16: 2,806; z<=17: 10,814); at 20-30 KB per JPEG tile that is ~55-80 MB for z<=16 and ~210-320 MB for z<=17 (estimate), too large for a Netlify static deploy but fine for an object store + `pmtiles` (19.6 KB lib). Imagery source: USGS The National Map `USGSImageryOnly` (tile URL `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}`; described by USGS as US-federal public-domain orthoimagery, primarily NAIP 1 m (6 in - 1 m), 256 px tiles, credit "USDA, USGS The National Map: Orthoimagery"; keyless). Trade-offs: lower resolution than Mapbox's commercial imagery at z17-18, no SLA (not benchmarked); I found no stated bulk-download policy for the tile service, so build z<=16 from the downloadable NAIP orthoimagery (The National Map download client offers free public-domain 1 m imagery) instead of bulk-fetching tiles from the shared service. Cost: hosting only. Highest effort (L-XL); best long-term independence (no token, no billing, no ToS coupling).

**G. Raster-only or static images for below-the-fold/sub-page maps.** Applies to the 6 basic sub-pages (finding 18): Static Images API `.../styles/v1/mapbox/satellite-v9/static/{lon},{lat},{zoom},0/{w}x{h}@2x` (50,000 free/month then $1/1,000; max 1280x1280) as a click-to-activate facade, or the shared map-lite.

**H. Vector vs raster satellite.** Not a lever: `satellite-v9` is already raster-only (style JSON 1,658 B; only `v4/mapbox.satellite/15/...` raster tiles fetched). The only vector-engine work is the 5 tiny GeoJSON layers.

**I. Tile prefetch.** Not possible from HTML: tile URLs contain a per-session `sku=` (e.g. `sku=101h6qVkrIGrU` in LH) and the access token, so `<link rel=preload>` cannot pre-hit the cache; only the connection can be warmed (`preconnect https://api.mapbox.com`, already present; the `a.tiles`/`b.tiles` hints are unused). Real fix: start map init earlier (idle after LCP, `modulepreload` of the map chunk at low priority once the poster has painted) and fetch fewer tiles: the phone viewport at z13.5 downloads 20 z15 tiles (345,177 B); with the Static Tiles API at 512 px the same area is ~6-9 requests. Raster-tile alternatives at z14-15 for the default view can also be self-hosted as a 6-9 tile pack (F) to remove the token from first load.

### 5.3 Recommendation ladder

1. Now: A (lazy v3) + 17 (runtime options). 2. Spike (1 day): C (v2.15) and D (MapLibre) behind the facade; pick the better of the two if parity holds. 3. Optional: E for the six basic sub-pages first (lowest risk, biggest aggregate saving), then decide on the home page. 4. Long term: F for independence.

---

## 6. Proposed initial-load waterfall

### 6.1 Today (LH mobile, unthrottled timestamps from the network log)

| t (ms) | Event |
|---|---|
| 0-175 | HTML (40,068 B; 13,556 B wire) |
| 159-383 | **index JS 2.28 MB (604,586 B wire)** in parallel with CSS (160-315), site-nav.css/js (160-212, render-blocking), manifest.json (160-353), Netlify RUM script (214-259) |
| ~430-540 | JS evaluation; mapbox creates 2 blob workers (539-667) |
| 541 | satellite-v9 style fetch (1.6 KB) |
| 607-816 | **38 JSON fetches** start only after JS eval (React effect `sF`) |
| 636 | iconset.pbf (20.8 KB wire) |
| 641-696 | events.mapbox.com telemetry |
| 685-793 | 20 satellite tiles (345 KB) |
| 872-904 | 2 glyph PBFs (89 KB wire) |
| 908 | **second document request (SW reload)**; everything repeats from cache (1,046-1,442 ms) |
| ~1.0-2.5 s | 14 long tasks (433 ms max) = boot fast-forward + re-renders |

First-load transfer 1,231,574 B: JS 49.1%, tiles 28.0%, data 11.3%, glyphs 7.2%, iconset 1.7%, HTML 1.1%, other 1.6%. At 1,474.56 Kbps the raw transfer alone is 6.7 s.

### 6.2 Proposed (simulated mobile throttle: RTT 150 ms, 1.47 Mbps, CPU x4; approximate)

| t (s) | What loads / runs | Budget |
|---|---|---|
| 0.0-0.6 | DNS+TLS+TTFB for HTML (30 ms server; the ~0.6 s is connection setup under simulated RTT) | - |
| 0.6-0.7 | HTML <= 5 KB br (poster, splash, inline CSS, data-manifest) | <= 5 KB |
| 0.7-0.8 | **FCP** (inline CSS + text paints; nothing blocks) | <= 1.0 s |
| 0.7-1.1 | poster `<img>` (preloaded, `fetchpriority=high`) -> **LCP** | <= 35 KB |
| 0.7-1.2 | entry JS (module, low priority) 58 KB br = 0.32 s at 1.47 Mbps; `<link preload as=fetch>` for `day1.<hash>.json` (8 KB br) in parallel | <= 58 KB + 8 KB |
| 1.2-1.5 | React mounts the shell (toolbar, timeline, layout chooser over poster); execution <= 120 ms at CPU x4 | no task > 50 ms |
| ~1.5 | user can choose layout / press play controls (no map yet); layout defaults from `pointer:coarse` and persisted value | interactive |
| 1.5-1.6 | idle callback: start `import('map')` (low priority `modulepreload`) and idle data (`oob`, `story`) | |
| 1.6-4.2 | map chunk 470 KB br = 2.6 s at 1.47 Mbps (background; a faster real 4G network makes this ~1 s) | <= 470 KB |
| 4.2-4.6 | map init in tasks <= 100 ms (workers, style, tiles) | |
| 4.6-6.5 | ~7 tiles (Static Tiles 512) or 20 z15 tiles; `map.once('idle')` fades the poster out | |
| on demand | panels (each <= 15 KB br), notes, monuments, story, Day 2/3 (prefetch at tick >= 200/420) | |

The user-visible product (map) still arrives in the same ~4-6 s window under this severe simulation as today, but the page is *painted, meaningful and interactive at ~1.5 s* instead of blank-to-map at ~9 s in lab and 3-6 s (unmeasured) in the field. With the lighter engines in section 5 (map chunk 240 KB or 50 KB br) the map arrives at ~3 s / ~2 s respectively.

---

## 7. The boot-time JSON fetches (deployed `data/`) and the consolidation plan

### 7.1 Inventory (LH mobile, unthrottled start times; raw and br11 from `data_an.json`; wire = LH `transferSize`)

Loader code: OOB list `eF` (`bundle.pretty.js:96755-96770`), Day lists `tF` (L96771-96787), density lists `nF` (L96788-96833), `sF` = `Promise.all([iF(), rF(), oF(), zp(1)])` (L96939) called from `AO`'s effect (L112962-112964); chronology via `RF/PF` (L98548-98562).

| # | file | start (ms, LH unthrottled) | raw B | br-11 B | edge transfer B (LH) | used by |
|---|---|---|---|---|---|---|
| 1 | `chronology_day1.json` | 606 | 18207 | 5018 | 5900 | event cards (LF/PF), mobile pO |
| 2 | `chronology_day2.json` | 606 | 22553 | 5977 | 7079 | event cards (LF/PF), mobile pO |
| 3 | `chronology_day3.json` | 607 | 21363 | 5680 | 6892 | event cards (LF/PF), mobile pO |
| 4 | `oob/commander_successions.json` | 607 | 20036 | 3715 | 4630 | OOB merge (iF) **and** unit panel (Hk) -> fetched twice |
| 5 | `oob/union_oob_corps_division.json` | 607 | 13751 | 2859 | 3474 | OOB dictionary (iF) |
| 6 | `oob/union_oob_brigades.json` | 608 | 29647 | 5595 | 6568 | OOB dictionary (iF) |
| 7 | `oob/union_regiments_i_ii_corps.json` | 608 | 32488 | 4982 | 6035 | OOB dictionary (iF) |
| 8 | `oob/union_regiments_iii_v_corps.json` | 608 | 30655 | 4387 | 5250 | OOB dictionary (iF) |
| 9 | `oob/union_regiments_vi_xi_xii_corps.json` | 608 | 32935 | 4199 | 5058 | OOB dictionary (iF) |
| 10 | `oob/union_cavalry_artillery.json` | 609 | 16581 | 2710 | 3247 | OOB dictionary (iF) |
| 11 | `oob/union_artillery.json` | 610 | 22951 | 4249 | 5505 | OOB dictionary (iF) |
| 12 | `oob/confederate_oob_corps_div_bde.json` | 610 | 26231 | 5194 | 6198 | OOB dictionary (iF) |
| 13 | `oob/confederate_regiments_first_corps.json` | 610 | 17729 | 2183 | 2770 | OOB dictionary (iF) |
| 14 | `oob/confederate_regiments_second_corps.json` | 611 | 21258 | 2572 | 3408 | OOB dictionary (iF) |
| 15 | `oob/confederate_regiments_third_corps.json` | 611 | 21289 | 2902 | 3971 | OOB dictionary (iF) |
| 16 | `oob/confederate_cavalry.json` | 611 | 8677 | 1690 | 2031 | OOB dictionary (iF) |
| 17 | `oob/confederate_artillery.json` | 611 | 19576 | 3281 | 3919 | OOB dictionary (iF) |
| 18 | `oob/commander_successions.json` (DUPLICATE) | 612 | 20036 | 3715 | 0 | OOB merge (iF) **and** unit panel (Hk) -> fetched twice |
| 19 | `terrain.json` | 612 | 13470 | 3284 | 3982 | terrain store (rF) |
| 20 | `vignettes_part1.json` | 612 | 19567 | 5967 | 7115 | story panel (oF) |
| 21 | `vignettes_part2.json` | 612 | 21082 | 6396 | 7553 | story panel (oF) |
| 22 | `vignettes_part3.json` | 612 | 19934 | 6027 | 7157 | story panel (oF) |
| 23 | `placements_day1_ticks1_50.json` | 612 | 15508 | 2133 | 2731 | placements Day 1 (zp(1)) |
| 24 | `placements_day1_ticks51_100.json` | 613 | 16580 | 2740 | 3423 | placements Day 1 (zp(1)) |
| 25 | `placements_day1_ticks101_225.json` | 613 | 16511 | 2110 | 2696 | placements Day 1 (zp(1)) |
| 26 | `density_day1_ticks1_50.json` | 613 | 10748 | 1451 | 1876 | placements Day 1 supplement (zp(1)) |
| 27 | `density_day1_ticks51_100.json` | 613 | 9172 | 1527 | 2666 | placements Day 1 supplement (zp(1)) |
| 28 | `density_day1_afternoon.json` | 613 | 7809 | 1370 | 1791 | placements Day 1 supplement (zp(1)) |
| 29 | `density_artillery_positions.json` | 614 | 7555 | 1538 | 2202 | placements Day 1 supplement (zp(1)) |
| 30 | `density_cavalry_detail.json` | 614 | 6540 | 1264 | 1654 | placements Day 1 supplement (zp(1)) |
| 31 | `density_skirmishers.json` | 614 | 5812 | 1267 | 1633 | placements Day 1 supplement (zp(1)) |
| 32 | `density_day1_lateafternoon.json` | 614 | 5813 | 1352 | 1750 | placements Day 1 supplement (zp(1)) |
| 33 | `density_day1_seminary.json` | 614 | 4878 | 1198 | 1470 | placements Day 1 supplement (zp(1)) |
| 34 | `density_day1_opening.json` | 614 | 4884 | 1209 | 1537 | placements Day 1 supplement (zp(1)) |
| 35 | `density_day1_iverson.json` | 615 | 4130 | 1022 | 1331 | placements Day 1 supplement (zp(1)) |
| 36 | `density_day1_railroadcut.json` | 615 | 4071 | 1064 | 1377 | placements Day 1 supplement (zp(1)) |
| 37 | `density_day1_barlowsknoll.json` | 615 | 4351 | 1081 | 1387 | placements Day 1 supplement (zp(1)) |
| 38 | `density_day1_ironbrigade.json` | 615 | 4077 | 1010 | 1339 | placements Day 1 supplement (zp(1)) |
| | **total (38 requests, 37 unique)** | | **598455** | **115918** | **138605** | |

### 7.2 Other facts about the data set

- All 71 files: 824,704 B raw (`placement_schema.json`, `casualty_apportionment.json`, `monuments.json` and Days 2-3 are not fetched at boot). Day 2 = 17 files, 114,068 B raw; Day 3 = 14 files, 105,659 B raw (fetched at tick >= 200 / >= 420 on desktop, all at once on mobile).
- `metadata` blocks (sources, chunk ids, descriptions, schemas) = 18,660 B of the boot set and are never read by the app (only `regiments`, `brigades`, `corps`, `divisions`, `cavalry_regiments`, `horse_artillery`, `*_artillery`, `placements`, `vignettes`, `events` keys are consumed: `bundle.pretty.js:96840-96895`).
- `notes` in placement/density records = 26,135 B raw on Day 1 (only shown in the unit panel).
- Records: Day 1 = 295 placements + 319 density (+103 shared density files) = 717; Day 2 = 572; Day 3 = 515. Per-file `record_count` (e.g. 4,890) does not match the contents (100).
- Vignettes: `full_script` is 42,961 of 57 KB (long prose; only needed when the story panel opens); chronology: `event` 29,814 B + `flag` 8,223 B.

### 7.3 Consolidation plan

1. `scripts/build-data.mjs` merges, strips `metadata`, optionally moves `notes` to `notes-day*.json`, writes `data/v1/<name>.<sha8>.json` and `data/v1/manifest.json`; HTML inlines the manifest so there is no extra request.
2. First paint needs **one** file (`day1`): 6.4 KB br11 without notes (14.6 KB with). `oob` (38.5 KB br11), `story` (31 KB br11), `terrain` (3.0 KB br11) load at idle/on demand; Day 2/3 as today.
3. Headers (`netlify.toml`):
```toml
[[headers]]  for = "/data/v1/*"
  [headers.values]  Cache-Control = "public, max-age=31536000, immutable"
[[headers]]  for = "/data/*.json"        # legacy unhashed names
  [headers.values]  Cache-Control = "public, max-age=300, stale-while-revalidate=86400"
```
4. Compact formats: row JSON now; columnar/dictionary once any file exceeds ~100 KB raw; typed-array binary + Worker for the 430k-record future (finding 24). Precompression: Netlify compresses on the fly (~q4-5); pre-built `.br` sidecars unverified.
5. Preload `day1` from `<head>` so it overlaps the entry download; load `oob` before the first unit hover/click (idle), not before paint.
6. De-duplicate: one shared promise per URL (findings 10-11).

---

## 8. Estimated gains vs Lighthouse mobile (FCP / LCP / TBT / TTI)

Baseline (LH mobile): Perf 64; FCP 4,099 ms; LCP 9,007 ms; TBT 27 ms; CLS 0.0726; SI 4,099 ms; TTI 9,092 ms; observed (unthrottled) FCP = LCP = 287 ms; `redirects` 9,066 ms; bootup 3.3 s (two loads, x4 multiplier); long tasks 14 (906 ms blocking at native speed).

Why the lab numbers behave as they do (INFERENCE from the trace):
- **FCP 4.1 s** ~ 0.6 s TTFB model + the 604 KB script counted on the critical path (High-priority script/modulepreload) at 3.28 s transfer + small CSS; the browser actually painted the splash at 287 ms. Real users are not JS-blocked at FCP, so RUM FCP > 3 s must come from network/CPU tail (slow networks, the SW reload for first-time visitors, background-tab loads) - measure by segment (finding 06).
- **LCP 9.0 s** ~ `redirects` 9,066 ms: the simulated first load (JS transfer+exec, data, tiles) has to finish before the SW reload; the reload is what yields the late LCP in the model. In the field, the plausible LCP-late sources are: first-visit reload, and text blocks appearing during the boot fast-forward (event cards/story) outgrowing the splash text as LCP candidate.
- **TBT 27 ms is an artifact:** simulated FCP (4.1 s) is after most long tasks; when FCP falls to ~0.9 s the same tasks (observed ~906 ms blocking native = up to ~3.6 s at 4x) fall in the [FCP, TTI] window.

| Metric (LH mobile) | Now | After Phase 0 (SW/CSS/HTML hints; findings 01,02,04) | After Phase 1-2 (lazy map, split entry, poster, data merge, no fast-forward; 07-15) | After Phase 3 (lighter map engine, Preact optional; 16,17,20) |
|---|---|---|---|---|
| Redirect penalty | 9.07 s | 0 | 0 | 0 |
| FCP | 4.1 s | 0.8-1.2 s (lab: script drops out of FCP graph when `fetchpriority=low` and no render-blocking site-nav) | **0.8-1.0 s** | 0.7-0.9 s |
| LCP | 9.0 s | 3.5-5 s | **0.9-1.4 s** (poster) | 0.9-1.3 s |
| TBT | 27 ms (artifact) | likely rises to 400-1,500 ms in lab once FCP moves (long tasks now counted) unless 13/14 land | **80-250 ms** (needs 13, 14, chunked map init; VERIFY) | 60-200 ms |
| TTI | 9.1 s | 4-6 s | 1.5-3.5 s | 1.5-3 s |
| CLS | 0.073 | 0.073 | <= 0.03 (fixed poster/shell; overlays deferred) | <= 0.02 |
| Speed Index | 4.1 s | 1.5-2.5 s | 1.0-1.6 s | 0.9-1.4 s |
| JS on wire before interaction | 604 KB | 604 KB | 58 KB (+470 KB map in background) | 22-58 KB (+35-240 KB map) |
| Perf score (LH weights FCP 10, SI 10, LCP 25, TBT 30, CLS 25) | 64 | 70-85 | **92-99** | 95-100 |

Field (RUM p75) expectation, with confidence limits: first-visit reload gone (01) and boot animation gone (13) should remove most of the p75 LCP > 4 s tail; targets LCP <= 2.5 s, FCP <= 1.8 s, CLS <= 0.1 are realistic on mid-tier 4G devices after Phase 2. **INP (p75 > 500 ms) is the least certain**: it needs 14 (selectors) + 13 + chunked map init; target <= 200 ms. All estimates are analytical (Lantern-like arithmetic on measured byte counts and the LH throttle profile), not measurements; validate each phase with LH CI (finding 22) and web-vitals attribution (finding 06).

---

## 9. CSS preload swap + SW mismatch (answer to the explicit question)

See finding 02 for evidence and fix. Summary: the stylesheet is `mapbox-gl.css` only; it is loaded via `rel=preload as=style crossorigin` + `onload -> rel=stylesheet` while a SW that intercepts `/assets/*` (`sw.js:41-50`) controls the page (after the first visit's `clients.claim()`), together with a duplicate `modulepreload` for the entry JS. On SW-controlled loads the CSS is requested twice (t=1046/1050 ms in LH), i.e. the preload is not consumed, which Chromium reports as a "preload found but not used ... cross-world service worker resource mismatch" and/or "preloaded ... not used within a few seconds" warning. Fix: delete both hints, load the CSS with the map chunk (or as a plain `<link rel=stylesheet>`), stop the SW from intercepting `/assets/*`.

## 10. Dead code and tree-shakeable / removable weight

| Item | Bytes | Action |
|---|---|---|
| mapbox features not used (3D/HD, terrain, precipitation, globe, fill-extrusion, raster-particle, Geolocate, Marker/Popup, hillshade/heatmap/sky/fog) | 431,485 raw (24% of mapbox) + part of 177,143 shader GLSL | not tree-shakeable in the UMD; only removed by choosing another engine (section 5) or the lazy chunk |
| `interpolationworker-ufiwa2-e.js` (orphan) | 672 | delete (finding 05) |
| Inline data literals (`_A`, `d2`, `th`, `mA`, `rO`, `Gc`) | 150,092 | move to JSON (finding 09) |
| Vite modulepreload polyfill | 710 | `modulePreload.polyfill:false` |
| Lowered optional chaining (65 sites) + zustand dev shims | ~2-4 KB br | `target: es2022` |
| React licence banners | ~1.3 KB raw | `legalComments:'none'` + notices file |
| CSS-in-JS duplicates (28 style maps + 57 inline) | 55,008 raw / ~9 KB br11 | design-token CSS file (a11y/design specialists) |
| 4 tick-to-clock copies | ~0.6 KB | finding 23 |
| Duplicate `commander_successions` fetch, duplicate chronology fetch | 20 KB raw x1, 62 KB raw x1 | finding 11 |
| Dead top-level declarations in the app | **0 found** (AST-reachability scan, `dead.cjs`, 236 names: none unreferenced) | nothing to shake at app level; savings come from splitting/moving data |
| `index.html` scripts: monuments star overlay (5.4 KB) duplicates React `KF` monuments layer + `mA` | 5,363 | remove after H1/monuments unification |
| `site-nav.js` on `/` (15.8 KB) builds a hidden menu | 15,829 raw / 5,396 wire | lazy on first click (finding 04) |
| `screenshots/day1.png` and `day3.png` are byte-identical (md5 `3f6646c9...`) yet referenced as different screenshots in `manifest.json` and og:image | 2 x 17,585 | replace with distinct images (incidental, not perf-critical) |

## 11. Phasing and dependencies

- **Phase 0 (0.5-1 day, no bundle change):** 01, 02, 04 (hints/inline scripts), 05, 06, 11 (if edited by codemod) - immediate console-clean + lab `redirects` fix.
- **Phase 1 (L):** 21 (splitter or source), 07, 08, 09, 10, 12, 13, 15 - the structural fix; needs the editable-source decision first.
- **Phase 2 (M-L):** 14 (selectors), 17, 19, 22, 23, 24.
- **Phase 3 (spike then L-XL):** 16 (+18), optional 20.

Ordering constraint: 01/02 first (they cost minutes and remove 9 s from the lab and the console noise); 21 before anything that edits the bundle; 12 before 07 ships (or the lazy map still double-loads on mobile); 13/14 before judging TBT/INP.

## 12. Uncertainty, scripts and open questions

Scripts (all in `plan-work/tmp-bundle-anatomy/`): `parse1.cjs`/`stmts.json` (statement ranges), `appregion.cjs`, `final_tables.cjs` (region sizes), `mapattr.cjs` (+ `mapbox_src_attr.json`), `mbunused.cjs`, `appcat.cjs`, `arrays.cjs`, `dead.cjs`, `xref.cjs`, `data_an.py`, `data_an2.py`, `daybundles.py`, `columnar.py`, `mk_tables.py`.

Open questions / not verified:
1. Which element is the real-user LCP? (hypothesis: large text blocks during the boot fast-forward; needs finding 06.)
2. Exact Chromium wording for the CSS warning in the current Chrome (mechanism inferred from the double request in LH and vite-pwa #945; not reproduced in a browser).
3. Does Netlify honour pre-built `.br` files or allow a higher brotli level? (unverified; live is between q4 and q5.)
4. Mapbox Product Terms on (a) using Mapbox raster tiles in a non-Mapbox SDK, (b) re-hosting a Static Images snapshot; whether `mapboxgl.workerCount` is public in 3.24.1; whether `iconset.pbf` can be skipped with an inline raster-only style; support status of mapbox-gl 2.x.
5. Visual/behavioural parity of MapLibre/Leaflet for labels and fractional zoom (needs the spike).
6. The compressed sizes of maplibre/leaflet/mapbox 2.15/1.13 are estimated from mapbox v3's ratio, not measured.
7. Whether interpolation of the 1,804 keyframes reproduces the intended 467-unit-per-tick view for arbitrary jumps (the sticky cache `i2` at `bundle.pretty.js:96271` only forward-fills as ticks are visited) - a correctness question for the data/animation specialists.


---

## Verification (adversarial verifier, 2026-09-30)

Scope: every critical/high finding (01, 02, 07, 08, 09, 10, 12, 13, 14, 15, 16, 21, 23) plus all 14 medium/low findings (03, 04, 05, 06, 11, 17, 18, 19, 20, 22, 24, 25, 26, 27) were re-opened. Method: re-read cited lines in `bundle.pretty.js`, `DEPLOY_DIR/index.html`, `sw.js`, `netlify.toml`, `lh_mobile.json`; re-ran byte/compression experiments; parsed the bundle with @babel/parser + @babel/traverse for true free variables; curl to the live site and jsDelivr; WebFetch of vite-pwa#945, mapbox.com/pricing and the Static Tiles docs. Scripts and extracted regions are in `plan-work/tmp-verify-bundle-anatomy/` (`freevars.cjs`, `data_check.cjs`, `day1_check.cjs`, `regions_check.cjs`, `lit_check.cjs`). `bundle.pretty.js` line numbers below are bundle-absolute.

### Numbers independently reproduced (evidence is real)

- Bundle regions: stmts 606-607 = 1,806,133 B (bytes; 1,805,801 chars), app region 324,549 B, Virtual Walkthrough 151,420 B, and every region row I recomputed (701-712, 713-721, 736-746, 747-749, 760-764, 765-769, 691-700, 722-727, 728-735, 756-759) match to the byte. `lit_check.cjs`: `_A` 512 elements 111,003 B, `d2` 16 / 16,563, `th` 16 / 14,104, `mA` 20 / 4,228, `rO` 8 / 2,108, `Gc` 5 / 2,086 = 150,092 B.
- LH mobile: redirects wastedMs 9,066.555; 2nd document request at t=909 ms (transfer 0); metrics FCP 4,099 / LCP 9,007 / TBT 26.5 / CLS 0.07256 / observed FCP=LCP=287; 174 requests; first-load data = 38 requests / 37 unique / 598,455 B raw / 138,605 B wire; first-load transfer 1,231,574 B; 20 tiles 345,177 B; glyph PBFs 152,750 raw / 88,898 wire (Open Sans Italic + Regular only); iconset 72,372 / 20,828; 2 blob workers 838,974 B; unused-javascript 315,185 / 603,207 (52.3%); render-blocking-insight lists exactly site-nav.js + site-nav.css (score 0.5); 5 unused preconnects; long-tasks 14 (max 433 ms; sum(dur-50) = 906 ms); layout-shifts 15 items; inspector-issues = CSP vs ingesteer.services-prod.nsvcs.net; valid-source-maps fails twice for index-Cg8FAMXN.js.
- Data: 71 JSON / 824,704 B; boot set sum br11 = 112,203 B and br5 = 130,827 B (exact); merged + metadata-stripped = 540,623 B raw / 81,343 B br11 / 95,580 B br5 (report: 81,247 / 95,557; within 0.1%); Day 1 = 717 records, 116,507 B raw / 14,610 B br11, no-notes 6,411 B br11 (report 14,615 / 6,440); deployed keyframes 694 + 1,110 = 1,804; `placements_day1_ticks1_50.json` metadata `record_count: 4890` vs 100 placements; `placement_schema.json` `"total_placement_records":"approximately 430000"`.
- Compression: local br q4 629,053 / q5 580,517 / q11 509,235; live br body 603,679 B (Content-Length header now 604,243; report 603,777: same ballpark, varies per request); live md5 of decompressed body = `7ef75b95...` = `bundle.min.js`; live `sw.js` md5 = deployed `sw.js`.
- History: `index-cg8famxn.js` md5 `7ef75b95...` / 2,280,438 B in all four of currentdeployedbuild, deploy-6a8a9268, deploy-6aa06a6d, deploy-6aa16d61; Jul 20 zip's file is 2,280,095 B md5 `0903f96b...`, its `index.html` references `assets/index-Cg8FAMXN.js`, first differing byte offset 151,648 (0-based), `toggleUnits` count 1 vs 3.
- Library sizes (jsDelivr, exact): mapbox-gl 3.24.1 js 1,796,551 / css 40,806; ESM core 900,311 + shared 748,699 + worker 52,320; 2.15.0 985,978; 1.13.3 767,202; maplibre-gl 5.6.0 939,269 (css 69,422); 6.11.2 mjs 590,228 (css 83,310); leaflet 1.9.4 147,552 (css 14,806); preact 11,693 / hooks 3,647 / compat 10,300; mapbox-gl-csp 1,743,709 + worker 780,619 (local dist). Pricing (mapbox.com/pricing fetched today): 50k free then $5.00/1k map loads; Static Images 50k free then $1.00/1k; Static Tiles 200k free then $0.50/1k; Raster Tiles 750k free then $0.25/1k. Static Tiles docs: usable in Leaflet/OpenLayers, 512 default, 256 costs 4x requests. Mapbox `LICENSE.txt` text matches the quoted terms. Tile-count table z11-z18 (9/16/49/156/552/2,024/8,008/31,675 = 42,489) recomputed exactly; USGSImageryOnly tile endpoint returns 200 image/jpeg.

### Per-finding verdicts

| ID | Verdict | Notes |
|---|---|---|
| 01 | CONFIRMED | `index.html:264-267` controllerchange -> `location.reload()`, `sw.js:17` skipWaiting, `:30` clients.claim. LH: second doc at 909 ms, 38 data fetches repeated in load 2. Registration exists only in `index.html` (and 404-forced `diagnostics.html`). Fix (a) is correct and minimal. UNVERIFIED sub-claim: "simulated LCP/TTI ~9.0/9.1 s -> ~4-5 s before any other fix": LH's own `redirects.metricSavings` says LCP -9,050 / FCP -9,050 (larger than FCP itself), so that audit gives no basis for a post-fix number; treat 4-5 s as a guess and re-run LH after the change. The "45% of page loads are first visits" figure divides all-site pageviews (3,389) by uniques (1,529); the home page alone is 1,713 pageviews and SW registration only happens from `/`, so the true share is lower (it is an upper bound). |
| 02 | CORRECTED | Real: `index.html:55-58` hints, `:282` module script, LH shows the CSS twice in the SW-controlled load (t=1046 and t=1051, not 1050). Correction 1: the deployed `index-B4G7Z_2G.css` (40,827 B, md5 `8e7defef...`) is byte-identical to Vite's minified `dist/assets/mapbox-B4G7Z_2G.css`, NOT to npm `mapbox-gl.css` (40,806 B, md5 `b99a6c72...`). Correction 2: vite-pwa#945 (fetched) documents the "cross-world service worker resource mismatch" text for Vite `modulePreload` JS chunks with a SW, not for `preload as=style`; applying it to the CSS swap is inference (the report says so). Also the inline `onload=` attribute is an inline event handler; deleting it (as proposed) removes one CSP `'unsafe-inline'` dependency (see MISSED-5). Fix direction is sound. |
| 03 | CONFIRMED | All `sw.js` line cites verified (`:3`, `:5-13`, `:28`, `:43-47` no `res.ok`, `:53-54`, `:61-68`, `:72-75`). Tension to resolve when implementing: item (1) precache manifest vs item (4) "do not intercept /assets/*": a precache route must still answer `/assets/*` from cache; what to drop is the runtime catch-all cache-first. Also needs a build step that does not exist for the frozen bundle (a 30-line Node script over the deploy dir suffices; Workbox is not required). See MISSED-3. |
| 04 | CORRECTED | Bytes verified: index.html 39,638 B, inline scripts 23,721 B (incl. 570 B JSON-LD) at L27/255/294/355/398/441/521/608, inline CSS 9,205 B, `#seo-content` block 1,798 B, three `<h1>` (L718, 744, 753). Corrections: (a) there are 3 `setInterval` calls (L388: 25 tries x 200 ms; L432: 25 x 200 ms; L710: 40 x 200 ms), not "x25", and they are bounded (5 s / 5 s / 8 s); (b) `onboardingVisible()` (`querySelectorAll('body *')`) runs once at 1.5 s (`index.html:509-511`), it is not polling, and the L441 header comment says continuous polling was already removed; (c) the proposed "site-nav.js lazy on first click" is NOT viable as written: the Extra Features button, the Ask-the-Historian pin and the menu panel are empty shells in HTML (`index.html:285-291`) that the inline script at L294-353 fills from `window.GTBG_MENU` (set at `site-nav.js:154`) on DOMContentLoaded, so on `/` site-nav.js supplies the visible navigation, not a hidden menu. `defer`/`type=module` IS safe (deferred scripts run before DOMContentLoaded); lazy-on-click needs static button markup first. |
| 05 | CONFIRMED | `interpolationworker-ufiwa2-e.js` (672 B, a pure interpolation worker) is referenced by nothing (case-insensitive grep of deploy tree finds no reference; the bundle has only two `import("./...")`: BookmarkPanel, HelpModal). Jul 20 folder has exactly 13 `index-*.js`. Live URLs with exact case return 200. |
| 06 | CORRECTED | Size claim is wrong: `web-vitals/attribution` is not ~2 KB br. Measured: v5 `web-vitals.attribution.iife.js` 11,689 B raw / 3,882 B br11; latest 6.2.2 attribution iife 15,665 B raw / 4,971 B br11 (standard build 8,991 / 3,037). Budget 4-5 KB br and load it at idle so it does not add to the critical path. Netlify already injects `/.netlify/scripts/rum` (11,141 B raw / 4,202 B wire in LH), so decide which is the system of record. |
| 07 | CORRECTED | Real: mapbox = stmts 606-607, L10002-96206; `Ok`/`R4` appear only at L10002/96206/96207. Correction: there are EIGHT `z_` references and THREE `new z_.Map`, not five/two. Missed site: Virtual Walkthrough `_O`, `bundle.pretty.js:110769` (`z_.accessToken = a2`) and `:110770` (`M.current = new z_.Map({...})`, also `attributionControl: !1` at `:110777`). The report's own xref table (4.3) lists `z_` under PANELS->MAP, contradicting its prose. A patch applied only at L97234 and L102978 leaves `z_` undefined at L110769 -> ReferenceError when the walkthrough opens. The patch must cover all three effects (use a shared `createMap()`), and the "exactly one satellite-v9 request per session" acceptance test must exclude walkthrough opens. Also 4.3's "MAPBOX <- vendor 40 names" is a scope-blind token-scan artifact: Babel scope analysis of stmts 606-607 yields exactly one entry-scope free variable, `gB` (= `globalThis`, `bundle.pretty.js:31-39`); the rest are browser globals. So `map-vendor.js` can use `globalThis` and needs no import from the entry (only `cS` for the default export, or inline it). Effort L stands (M for the mapbox cut alone). |
| 08 | CONFIRMED | `AO` JSX refs, lazy pattern at L112469-112470, Suspense at L113276-113282 verified. Entry budget arithmetic (149,028 + ~27,700 = ~176,700 B vs 180,000) leaves ~3 KB slack and omits the splash `tO`, the `Va`/`tc` style maps and onboarding styles the entry keeps; expect ~185-195 KB raw unless the splash is replaced (finding 13). Treat 180 KB as a target, not a proven bound. |
| 09 | CONFIRMED | Table reproduced exactly; `_A` used only at L110744/110749/110819 and `d2` only at L110739/110784/110900/111176 (all inside `_O`). Simplest no-source implementation: top-level `await fetch(...)` inside the walkthrough chunk. |
| 10 | CORRECTED | Boot table, totals, merged/stripped sizes, header rules, `metadata` never read (0 hits for `metadata` in the app region) all reproduced. Correction: placement `notes` are NOT only shown in the unit panel (7.2 / finding 10). Consumers: unit info panel (`bundle.pretty.js:98025`), Follow-Your-Ancestor timeline `Zk` (`:101075`, `Lt.notes`), and the two OOB/roster trees via `oO` (`:102214`, called `:102244`) and `cO` (`:102529`, called `:102604`). Splitting notes into `notes-day*.json` "loaded when a unit panel opens" would blank the ancestor timeline and roster summaries (they fall back to disposition text). Add a shared lazy `getNotes(day)` used by all four, with an async fallback state. The first-paint saving (6.4 vs 14.6 KB br11) is unaffected. See also MISSED-4 (jump paths). |
| 11 | CORRECTED | Duplicate `commander_successions` (eF at L96769 + fetch at L97522, not 97520) and mobile `zp(1);zp(2);zp(3)` (L103040-103042) verified. The fix "mobile uses the same lazy day loading as desktop" is unsafe: desktop's laziness is triggered only by the playback loop crossing tick 200/420 (`Ed`, L96991-96992). `jumpToDay` (L9369-9370), keys 1/2/3 (L112987-112993), scrubber and bookmarks never call `zp` (the only `zp(` call sites are `sF` L96939, `aF`/`lF` L96942-96946 called from `Ed`, and mobile L103040-103042), so copying desktop behavior to mobile would make "Day 2/3" taps show no units until playback crosses a threshold. Prerequisite: make `setTick`/`jumpToDay` call an in-flight-deduped `ensureDay(day)` first (app-bugs E4/J1 already specifies this). |
| 12 | CORRECTED | Code path verified (`AO` initial `Zn = null` L112949; desktop Fragment guard L113071; `gF` mounted L113233-113234; chooser `dO`; `pO` map L102981). Two corrections: (a) up to three Map constructors per session (adds walkthrough L110770); (b) "first-timers: mount the map only after the choice" adds a click-to-map delay for every first-time desktop user. Better: auto-select from `pointer:coarse`/width, start the matching map immediately behind the chooser, remount only if the user overrides. |
| 13 | CONFIRMED | `eO = 3500` (L101471), rAF loop + `yn.setState({currentTick})` per frame (L101487-101505), 600 ms fade, "Skip intro" exists; LH layout shifts: 15 items, splash content div + event card (`bottom:120px`) + Hancock story text; long tasks cluster 0.89-2.47 s. The RUM-LCP hypothesis is correctly labelled inference. |
| 14 | CONFIRMED | 26 `= yn()` across the bundle (25 in the app region; two are in `AO`, L112940 and L112961), 0 selector calls, 0 `memo`. `Ed` at L96965; at 16x `cF/R` = 31.25 ms per tick (~32 updates/s). |
| 15 | CONFIRMED | `index.html:742-748` splash, CSS L90-142, `#seo-content` L717-741 inside `#root`. LH `lcp-breakdown-insight` reports only TTFB 152 ms + render delay 457 ms (a text element, no resource), which supports "observed LCP is tiny, lab 9 s is simulation". The "High-priority script counted as FCP-blocking" mechanism remains an unverified inference (I did not read Lighthouse source). Chrome's low-entropy-image LCP exclusion is real (0.05 bpp): the proposed 35 KB / 60 KB posters are ~0.9 / ~0.5 bpp, fine. |
| 16 | CORRECTED | Sizes, licences, pricing, tile counts, USGS endpoint all verified. Correction to the evidence "6 of 8 sub-page maps use only addSource/addLayer/flyTo": `ground-remembers.html:91` adds a `type: 'heatmap'` layer with `heatmap-density` expressions (GL-only; MapLibre yes, Leaflet needs a plugin), `sandbox.html:184` uses `map.queryRenderedFeatures`, `compare.html` uses `setStyle` x2 (dark-v11/light-v11 vector styles), `easeTo`, `raster-dem`, `setTerrain` x3, Popup (and creates two maps via `setupPane`, L190/L272), `cinematic-export.html` `preserveDrawingBuffer` x2. Purely basic: camera, viewshed, immersive, watch-together (camera/watch-together/cinematic use `fitBounds`, also fine in Leaflet). So the "Leaflet map-lite for six pages" scope drops to four (five with a rewritten hit test); ground-remembers should go to MapLibre. |
| 17 | CONFIRMED | `mapboxgl.workerCount` is public: getter/setter at `bundle.pretty.js:96147-96151`, default `Cl.workerCount = 2` at L58225 (fixed, not hardwareConcurrency-based, so LH's 2 workers = every user's 2 workers); `localFontFamily` semantics verified in `mapbox-gl.d.ts:19216-19218` (overrides ALL glyphs, keeps weight keywords, so the italic rivers labels lose italics). Label stacks: `Open Sans Regular` (L9764 roads), `Open Sans Italic` (L9789 rivers), `Open Sans Bold` (L9831 farms, L110811 walkthrough, L112659 GtbgLoc); only Regular/Italic PBFs load at boot. The static counts "8 sources / 13 layers" are right once the pre-mapbox region (L9342-10001: 4 sources, 7 layers) is included (I initially counted only the L96207+ region: 4 / 6). CSP-build sizes verified. |
| 18 | CORRECTED | All nine pages load `api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js` + css (verified by grep). "Six need only basic APIs" is wrong, see 16: ground-remembers (heatmap) and sandbox (queryRenderedFeatures) need GL features; cinematic-export and compare keep GL. Click-to-activate facade + shared self-hosted vendor chunk remain valid for all; the Leaflet swap applies to four pages. |
| 19 | CORRECTED | Verified: 65 `==null?void 0:` sites (60 in app), modulepreload polyfill stmt 0 = 710 B, 6 licence banners = 1,492 B raw, LH `valid-source-maps` fails. Overstated: "es2022 target saves -2..4 KB br". A regex over the 21 simplest chained sites saves ~404 B raw; the whole lowering is ~1-1.5 KB raw, i.e. ~0.3-0.6 KB br. `modulePreload.polyfill:false` is safe (native support in current browsers). Acceptance test gap: see MISSED-2 (`valid-source-maps` still fails for a self-hosted 1.8 MB mapbox chunk). |
| 20 | CONFIRMED | 143,345 B (6,920+656+4,175+131,594) vs 25,640 B preact/hooks/compat; savings arithmetic (-117.7 KB raw) right; effort L reasonable behind a regression suite. |
| 21 | CONFIRMED | `gettysburg_FIXED_v25/src` = 40 JS/JSX modules, 192,650 B, zero hits for walkthrough/ancestor/soldier; its `vite.config.js` `manualChunks` still makes mapbox a static dependency of the entry (separate file, not lazy), so even the Jun-12 build never deferred the map. Line total 17,831 = 17,171 (L96207-113377) + 660 (L9342-10001). Circular-import risk in the splitter (ENTRY<->MAP<->PANELS cycles, TDZ on `const` at eval time) should be an explicit design constraint; dynamic-importing MAP/PANELS from a fully evaluated entry avoids it. |
| 22 | CONFIRMED | Audit IDs exist in this LH 13.5 JSON (`render-blocking-insight`, `errors-in-console`, `valid-source-maps`, `unused-javascript`). Unverified: that the installed @lhci/cli version bundles a Lighthouse that has the same IDs. |
| 23 | CONFIRMED | `getTickTime` L9371-9383 (Day 1 base 6*60, Days 2-3 4*60), `M4` L9856-9859 (5*60), `JF` L100836-100838 and `QF` L100998-101001 (both 5*60 and both emit `July ${f + 2}`), HUD L97428; `chronology_day1.json` `tick_formula` "Tick 1 = 5:00am July 1". So the `+2` date bug lives in three places (JF, QF, HUD), not one. |
| 24 | CORRECTED | 1,804 keyframes and the 4,890-vs-100 mismatch verified. Internal inconsistency: the prototype `columnar.py` packs `<HHiiBHB` = 16 B/record (Day 1: 717 x 16 = 11,472 B, matches), so 430,000 rows = ~6.9 MB raw, not "~9 B/row => ~4 MB". Compressed (4,556 B br11 / 717 = 6.4 B/row) ~2.7 MB, so the "< 5 MB on the wire" acceptance still holds. |
| 25 | CONFIRMED | Token literal at L97209-97210 and L102898-102899 (walkthrough reuses `a2`), Google key at L110610, `attributionControl:!1` at L102988 AND L110777 (walkthrough; the report lists only the mobile map). Key values intentionally not repeated here. |
| 26 | CONFIRMED | Numbers reproduce (see above); live body varies 603.7-604.2 KB per request. Netlify honouring a `.br` sidecar remains untested. |
| 27 | CORRECTED | Evidence exact (Jul 20 vs Aug 22+ bytes, offset 151,648, immutable header, SW precache). Correction to the fix: bumping the SW cache name does NOT guarantee fresh bytes. `sw.js:19` `cache.addAll(...)` goes through the HTTP cache and `/assets/*` is `immutable, max-age=31536000`, so a browser that still holds the Jul-20 bytes for that URL re-precaches the stale copy into the new cache. Only renaming the file (new content hash) or fetching with `{cache:'reload'}` fixes it; the acceptance test "a browser that loaded the Jul-20 file receives current bytes" must rely on the hash rename. Exposure is limited to browsers that cached that URL between Jul 20 and Aug 22 (which build was live in between is not verifiable from the zips). |

### MISSED issues (in the specialist's scope)

1. **[high] A third Mapbox map (Virtual Walkthrough) invalidates the patch surface of findings 07/12/17.** `bundle.pretty.js:110769-110770` (`z_.accessToken = a2; M.current = new z_.Map({container: el, style: "mapbox://styles/mapbox/satellite-v9", ..., attributionControl: !1})` inside `_O`'s `useEffect`, L110768), its GeoJSON layers (L110780-110830) and `text-font: ["Open Sans Bold", ...]` (L110811). Consequences: the lazy-mapbox patch must cover 3 constructors and provide a shared `createMap()`; opening the walkthrough on desktop runs a second live GL context + style fetch + map load next to the main map; its Open Sans Bold glyph PBF is absent from the boot analysis (affects the `localFontFamily` decision in 17); `attributionControl:!1` needs the same ToS check as the mobile map. Fix: add the site to the patch, reuse the main map's style JSON or dispose/hide the main map while the walkthrough is open, update acceptance tests.
2. **[medium] `valid-source-maps` will still fail after the split.** LH flags any first-party script >= 500 KiB without a source map; the lazily loaded self-hosted mapbox chunk (~1.8 MB) is fetched inside the LH trace window (the report's own waterfall starts it at ~1.6 s) and would trigger the same failure (`lh_mobile.json` currently flags `index-Cg8FAMXN.js` twice). Finding 19's acceptance covers only the entry chunk. Fix: publish a map for the mapbox chunk (the npm package ships `dist/mapbox-gl.js.map`; strip `sourcesContent` if the Mapbox licence is a concern), or keep the vendor chunk under 500 KiB (only true for Leaflet/MapLibre-lite). The Best Practices score depends on it.
3. **[medium] SW precache re-fetches through the HTTP cache (stale immutable bytes survive).** `sw.js:16-20` `caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))` uses default cache mode; with `netlify.toml` `/assets/* immutable` and the fixed-name precache (`sw.js:6-7`), a rewrite that only bumps the cache name would re-precache stale copies. Hashed names from a build manifest are safe, but unhashed URLs (`/manifest.json`, icons, `/favicon.ico`) need `new Request(url, {cache:'reload'})`. Fix: build the precache from content-hashed URLs and use `cache:'reload'` for anything unhashed.
4. **[medium] Lazy day loading regresses jumps unless the loader entry points are fixed first.** `zp` (`bundle.pretty.js:96900`) is never invoked by `jumpToDay` (L9369), keys 1/2/3 (L112987-112993), the timeline day buttons (`IO` L112202+, `jumpToDay` at L112211), bookmarks or the tour; `Ed` calls `aF()/lF()` only at L96991-96992. `zp` also checks `loadedDays` only after the fetch completes, so concurrent callers (`sF` at L96939 and mobile L103040) both fetch, and a failed day is marked loaded (`.catch(() => ({ placements: [] }))`). Findings 10/11 restructure exactly these paths and must specify `ensureDay(day)` in the store with a per-day promise, called from `setTick`/`jumpToDay`/scrubber, before any prefetch tuning (bug owner: app-bugs E4/J1).
5. **[low] CSP enforcement dependency not linked to the load-path plan.** Enforcing CSP (X3) is blocked by 7 executable inline scripts (L255, 294, 355, 398, 441, 521, 608) and the inline `onload=` handler at `index.html:56-57`, in addition to the Mapbox blob worker. Findings 02/04 remove most of these; state it as an explicit acceptance criterion (no inline script/handler left, then drop `'unsafe-inline'` from `script-src`) and choose the `mapbox-gl-csp` build (finding 17) if `worker-src blob:` must go.

### Bottom line

The report's measurements are unusually solid: every count, byte size, LH figure, compression number, library size, price and licence quote I re-derived matched (typically to the byte). The faults are in interpretation and fix design: the "five mapbox references" claim (there are eight; a third Map lives in the walkthrough), two fixes that would break or regress behavior as written (site-nav.js lazy-on-click; mobile lazy day loading and the notes split without loader entry points), overstated benefit/cost numbers in 06, 19 and 24, the overbroad "six basic sub-page maps" claim (ground-remembers heatmap, sandbox hit-testing), and the SW-cache-name-bump assumption in 27. Post-fix lab predictions in section 8 (e.g. LCP 3.5-5 s after Phase 0) are analytical, not measured; re-run Lighthouse after Phase 0 before trusting them.
