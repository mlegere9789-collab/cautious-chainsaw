# perf-runtime — Runtime / INP / main-thread performance plan (gettysburginteractivemap.com)

Specialist: `perf-runtime`. Scope: everything that happens on the main thread and compositor **after** bytes arrive — boot work, the playback tick loop, React re-render scope, canvas/Mapbox rendering, long lists, event-handler cost, sub-page map boot, caching/prefetch/bfcache. (Bytes-on-the-wire, image weights and render-blocking CSS/JS belong to `perf-cwv`; I overlap only where a runtime measurement proved a cause, and I flag it.)

All line references are to `plan-work/bundle.pretty.js` (prettier copy of the deployed `assets/index-Cg8FAMXN.js`, md5 `7ef75b95…` = identical to the deploy zip and to the local copy I served). Deploy-file line refs are to `DEPLOY_DIR`.

Evidence legend: **[LIVE]** measured against production; **[LOCAL]** measured against a local static server serving the byte-identical `SRC_DIR` build (used after the first ~100 live loads, see caveats); **[CODE]** read from source only; **[VERIFY]** needs a real-device confirmation.

---

## 0. Method, environment, caveats (read this before trusting any number)

* Harness: Chrome 153 (Windows), `--headless=new`, driven by Node 24 over raw CDP (built-in `WebSocket`). Scripts + raw outputs live in `plan-work/tmp-perf-runtime/` (`cdp.js`, `observers.js`, `playback.js`, `renders.js`, `interactions.js`, `measure_boot.js`, `measure_page.js`, `patch.js`, traces/profiles). Nothing was deployed or modified; experiments that "fix" something rewrite the JS/CSS **in my own headless browser** through CDP `Fetch` interception.
* Profiles: **Mobile** = 375×812, DPR 2, `mobile:true`, CPU 4× slowdown (Lighthouse "Moto G Power" class), network 1.6 Mbps / 150 ms RTT (Slow-4G-like), HTTP cache disabled unless stated. **Desktop** = 1350–1440 px, unthrottled or CPU 4×. Service worker stubbed out except in the explicit first-visit test.
* **Software GL.** This machine has no GPU path in headless, so WebGL (Mapbox) and Canvas-2D raster run on SwiftShader/CPU. JS/main-thread attribution (CPU profiles, React commit counts, long-task/LoAF attribution) is valid; **absolute frame rates and raster/composite costs are pessimistic** — use them for *ranking and relative deltas*, then confirm on a real Android phone ([VERIFY]).
* "INP-proxy" = the largest Event Timing `duration` among the events of one interaction (click ⇒ pointerdown/up/click; key ⇒ keydown/up). It is what the INP algorithm measures for that interaction on that run; it is not a p75.
* **Live-site load / connectivity.** I made roughly 100 automated page loads of production (each pulls ~70–140 requests incl. Mapbox tiles). Midway, TCP connects to Netlify's edge (98.84.224.111 / 18.208.88.157 and `*.netlify.app`) timed out for ~15 minutes from this machine, then recovered on its own; Netlify's status page read "All Systems Operational". I cannot tell whether this was an IP-level rate limit triggered by my traffic or an unrelated blip — there is no evidence of an outage for real visitors. Everything measured after that used the local copy. Those ~100 loads also counted as ~100 Mapbox map loads on your token (negligible vs. a 50k/month free tier, but non-zero).
* Not tested (be aware): real GPU/thermals, real touch pinch/rotate, Safari/Firefox, screen readers, Netlify RUM p75 attribution (RUM PDF has no per-interaction data), Watch Together with two peers.

---

## 1. Executive summary

The runtime story is **not** "the unit animation is too heavy in JavaScript" — the JS that draws a frame costs 0.5 ms (2.8 ms at 4× CPU). It is a stack of independent, mostly one-line-fixable defects that together keep the main thread and compositor permanently busy and make the first interactions slow:

1. **The unit canvas sits on top of the map with `pointer-events:auto` and swallows every mouse/touch/wheel event** — with a real mouse drag, wheel zoom and touch drag the map does not move (pixel-diff ≈ idle noise), and the Mapbox +/- buttons are covered. Same on mobile (`touch-action:none` canvas). [LIVE]
2. **A dead "monuments" rAF loop runs forever** (a ref-of-ref bug makes `kt.project` throw 20×/frame): ~1,200 exceptions/s, 45 React commits/s on an idle paused map, the single largest JS self-time item on mobile playback (709 ms of 10 s at 4×). [LIVE]
3. **The whole app re-renders on every store write** — 25 call sites use `yn()` with no selector, including the root `AO`; the boot intro writes the store every frame for 3.5 s; scrub events, touchmoves and a 60 Hz clock widget do too. [CODE + LIVE commit counts]
4. **FCP is 4.2 s only because of `body { animation: gtbg-page-in }`** in `site-nav.css`: removing that one rule moved mobile FCP from ~4.2 s to ~0.86 s in an A/B. [LIVE]
5. **First-visit LCP ≈ 10 s** on Slow-4G/4×: the service worker's `controllerchange → location.reload()` discards the first load (~4.5 s in), the data fetch only starts after 2.28 MB of JS has run, and the largest paint is a story-panel paragraph revealed by the boot fast-forward at ~9.7 s. [LIVE]
6. **"Select Mobile" is a 584 ms INP** (433 ms LoAF) for every phone user's first tap: the desktop shell + a Mapbox map is already mounted under the layout chooser, and choosing Mobile tears it down and builds a second map and fetches all 3 days (72 `/data` requests in total). [LIVE]
7. **Unit Roster = +4,989 DOM nodes, 680 ms INP** at 4×; it re-renders 705 rows on every tick while open. [LIVE/LOCAL]
8. **Frame pipeline raster/composite cost, not JS, limits 8× playback.** A/B at 8× playback, 4× CPU: 11.4 fps → 17.8 fps by removing 20 `backdrop-filter`s + the `mix-blend-mode` overlay → **59.3 fps** by also skipping the unit canvas draw. [LOCAL, software GL]
9. **Sub-pages block first paint on a 1.8 MB (385 KB br) Mapbox script from a third-party CDN** (FCP 3.3–5.5 s), and `watch-together` executes PeerJS synchronously for 1.2 s (TBT 1,626 ms). [LIVE]
10. An **infinite `box-shadow` animation** (`gtbg-pin-glow`) forces ~60 style recalcs + paints per second on every page, forever (594 recalcs / 10 s idle). [LIVE]

Good news, verified: **bfcache works** on the map and on four sub-pages (state restored), JSON parse cost is trivial (2.6 ms for all 34 boot files), memory is small (heap 10–20 MB), the search-index/historian builds are ~1–2 ms of compute, the Extra-Features overlay scripts cost ≤1.4 ms per click.

### Ranked hotspots

| # | Hotspot | Evidence (headline number) | Fix |
|---|---|---|---|
| 1 | Unit canvas eats all pointer input (map cannot pan/zoom) | live drag/wheel/touch pixel-diff 0.01–0.02 vs 26.7 when canvas hidden | 01 |
| 2 | FCP blocked by body fade animation | FCP 4.2 s → 0.86 s with one CSS rule removed | 05 |
| 3 | Monuments rAF loop + exception storm | 45 commits/s idle; 709 ms/10 s self time @4× mobile | 02 |
| 4 | Boot: JS→data waterfall, SW reload, intro | first-visit LCP ≈10 s; data starts at 4.4–4.5 s | 04, 06, 07 |
| 5 | Mobile layout switch rebuilds the map | Select Mobile INP 584 ms; +34 requests; 2 style loads | 08 |
| 6 | Roster/OOB long lists | +4,989 nodes; 680 ms open; per-tick re-render | 09 |
| 7 | Raster/composite of canvas + blur + blend | 8× playback 11 → 59 fps (lab) | 10, 21 |
| 8 | Whole-store subscription → whole-tree re-render | 27 component renders/tick; clock loop 23 commits/s | 03, 13 |
| 9 | Sub-page Mapbox/PeerJS blocking | FCP 3.3–5.5 s; TBT up to 1,626 ms | 11, 12 |
| 10 | Perpetual paint animation | 594 style recalcs / 10 s idle | 14 |
| 11 | Unclamped dt (background jump), stale accumulator | playback teleports to the end after backgrounding [CODE] | 15, 16 |
| 12 | Boot long tasks | 155 ms eval + 650 ms React/Map + 600 ms first render @4× | 36 |

---

## 2. Runtime architecture as built (what actually runs)

**Boot sequence** (`index.html` → `assets/index-Cg8FAMXN.js`, one 2.28 MB module):
1. HTML (13 KB br) → blocking `site-nav.css`/`site-nav.js` → module script + `modulepreload` (604 KB br).
2. Module evaluation (`(anon) 0:0` 155 ms @4×, of which the Mapbox UMD factory `z` = 129 ms).
3. `Rk(root).render(<StrictMode><AO/></StrictMode>)` (bundle.pretty.js:113365). `AO` mounts **the desktop shell whenever `Zn !== "mobile"`, i.e. also while `Zn === null` (chooser showing)** (113071–113240) → `gF` creates the desktop Mapbox map (97237), 4 canvases, minimap, etc.
4. `AO`'s effect calls `sF()` (112962) → 14 OOB + terrain + 3 vignettes + day-1 placements (3) + day-1 "density" (13) = 34 requests; `LF` (98595) adds 3 chronology fetches; `Hk()` re-fetches `commander_successions.json` → **38 requests, all issued within ~30 ms of each other, only after the JS has executed**. Day 2 (17 files) / day 3 (14 files) load lazily at tick ≥200 / ≥420 (96991–96992).
5. `tO` intro (101472): waits for `Object.keys(placementsByTick).length > 5`, +800 ms, then a 3.5 s rAF loop that calls `yn.setState({currentTick})` **every frame** (101494), then a 600 ms fade; each tick change (not playing) triggers a full canvas redraw `e1` (97285–97308).
6. `dO` chooser (102752) → `onSelect('desktop'|'mobile')`.

**Playback loop** (`Gk/Ed`, 96956–97018): one rAF loop; `dt = c − F_` (no clamp, 96977); accumulates `Hc`; every `500/speed` ms writes `currentTick` to the store; each frame `y1` (interpolate; 96266) → `dA` (project all; 97019) → `cA` (trails; 96728) → `lS` (draw units+labels on a full-viewport 2-D canvas; 96506). On canvas width <500 it skips frames to ~30 fps (97004–97012).

**Rendering layers on desktop** (measured DOM, [LIVE]): Mapbox WebGL canvas 1440×852 (`.mapboxgl-map`), trail canvas `Uc` z9 (1440×852, **never drawn to**; `I4` 9842), trail canvas `so` z8 (**300×150**, never resized because `K4` ran before it existed; `J4` 96693), **unit canvas z10 `pointer-events:auto`** (`ux.canvas`, 97393–97399), minimap canvas, plus DOM overlays (`mix-blend-mode:multiply` day/night tint `qc` with an 8 s background transition, 9885–9899).
Mobile (`pO`, 102914+): its own second Mapbox map (102981, different token constant `fO`), unit canvas `bn` z10 `pointer-events:auto; touch-action:none` (102995), **and the desktop `IO` timeline is still rendered underneath** (its transport row sits at x = −213…−54 — C1).

**State:** one flat zustand store `yn` (9361) created with plain `create` (no `subscribeWithSelector`). 25 components call `yn()` with no selector (list in finding 03); 0 use a selector; 0 `React.memo`; 10 `useMemo`; 2 `useCallback`.

**Timers/rAF inventory (app region >96000):** playback loop (96960/97008/97017); `_F` clock rAF (97423); `KF` monuments rAF (100854/100865); `GF` minimap subscription (99654, broken — see 24); `tO` intro (101496/101505); toasts setTimeout ×2 systems; touch indicator; CursorGlow. Plus Mapbox's own `_render` rAF and, in CSS, an infinite `gtbg-pin-glow` and (during boot only) `boot-slide`.

**Data facts** (computed from `DEPLOY_DIR/data`): 1,804 placements total (694 base + 1,110 "density"), **478 distinct unit ids, only 188 of 675 ticks contain any placement (112 gaps)**, per-tick placements median 7 / p90 18 / max 87. `oobData` = 705 entries (410 U-, 295 C-). Boot data = 34 files, 516 KB raw / 95.5 KB brotli, `JSON.parse` of all of it = 2.6 ms (desktop Node). Days 2/3 = 114 KB / 106 KB raw. No unit is ever drawn through a Mapbox layer; the only `setData` in the app is the 2-feature distance tool (112773/112789/112829). The `InterpolationWorker` chunk (672 B) is **not referenced anywhere** (dead output).

**Bundle anatomy** (bundle.min.js, 2,279,509 B): Mapbox GL 3.24.1 + React 18.3.1 + zustand ≈ 1.97 MB; app code + inline data ≈ 312 KB, of which data literals = 148 KB (`_A` 512 monuments = 110.9 KB @104440; stops `d2` 16.5 KB; NPS tour `th` 14 KB). Mapbox GL alone: 1,796,551 B raw / 385,039 B br (v3.24.1) vs 985,978 / 219,663 br for v2.15.0.

---

## 3. Measured evidence

### 3.1 Boot, mobile profile (4× CPU, 1.6 Mbps/150 ms, cold cache, SW stubbed) [LIVE]
| Event | t (ms) |
|---|---|
| HTML done | 325 |
| JS (604 KB br) finished | 3,579 |
| Module evaluated / first React render tasks | 3,593 (113 ms), 3,787 (490 ms incl. a **478 ms Layout of 271 objects**), 4,136 (React `performWorkUntilDeadline` 420 ms) |
| `firstPaint` (blank) | 935 |
| **FCP** | **4,196–4,501** |
| 38 `/data/*` requests start / last end | 4,532 / 6,072 |
| **LCP** (story-panel `full_script` text, 104,562 px²) | **9,756–10,128** |
| TBT (all long tasks) / after FCP | 967 / ≈190 ms |
| CLS | 0.064–0.114 (extra-features overlay 0.02; others from panel reveal) |

A/B (local HTML/CSS rewrite in my browser): removing `body{animation:gtbg-page-in…}` from `site-nav.css` ⇒ **FCP 892 ms** (both animations removed: 856 ms); removing only the splash's `boot-fade-in` ⇒ 4,264 ms (no effect). The LCP candidate at 860 ms is the crawler-only `#seo-content` paragraph; the 9.7 s candidate is the vignette text shown when the intro fast-forward reaches tick 675 ("The battle was over…").

First visit with the real SW (cache on): load 1 is aborted by `controllerchange → location.reload()` at **~4.55 s**; load 2 is served by the SW in ~10 ms per asset but its LCP is 5.5 s *after* the reload ⇒ **≈10 s absolute** (vs ≈5.5 s with no reload). 136 requests, 76 of them `/data` (two loads' worth).

CPU profile of the same boot (inclusive, 12 s window): React passive-effect flush 651 ms (contains Mapbox `Map` ctor 375 ms + `_setupPainter` 301 ms), first Mapbox `_render` 596 ms (`renderLayer` 313, `getOrCreateProgram` 181), `populate()` (index.html overlay script) 183 ms → `reposition` 179 ms (forced layout), `e1` initial canvas draw 158 ms, monuments loop `ut` 156 ms, module eval 155 ms.

Mobile layout switch [LIVE, DOM/network]: while chooser is showing: 1 map, 5 canvases, 526 nodes; after "Select Mobile": desktop map removed, **second `Map` + second style request (2 total)**, canvases = map 750×1624 + unit 375×812 (`ta:none`, `pe:auto`) + minimap, 619 nodes, **+50 requests of which 34 `/data`** (zp(2), zp(3) + 3 chronology, 102958–103042) ⇒ 72 `/data` requests per mobile session.

### 3.2 Playback [LIVE for mobile 1×/desktop; LOCAL for patched variants]
| Scenario (10 s window) | Main-thread busy | Script | Style recalcs | FPS / p90 frame |
|---|---|---|---|---|
| Desktop, unthrottled, 1× | 8 % | 192 ms | 433 | 26 / 50 ms |
| Desktop, 4×, 1× | 48 % | 1,867 ms | 585 | 28 / 50 ms |
| Desktop, 4×, 8× | 26 % (frames >100 ms: 33) | 864 ms | 277 | 9.8 / 250 ms |
| Mobile 375, 4×, 1× | **72 %** | 2,157 ms | 1,175 | 58 / 16.7 ms |
| Idle, paused, desktop | 7 % | 159 ms | **594** | 59 |
| Idle, paused, mobile 4× | 29 % | 744 ms | 604 | 60 |
| Idle, mobile 4×, `KF` loop off + pin glow off | **19 %** | **74 ms** | **0** | 60 |
| Idle, desktop, both off | **2 %** | 12 ms | **0** | 60 |

Top inclusive JS, mobile 4× 1× (11.3 s): `ut` (monuments rAF) **914 ms** (709 ms is the `try{kt.project}catch{}` body = exception creation), `Ed` playback loop 516, React scheduler `$n` 349, `lS` 310, GC 100 ms.
Per-call wall time (in-page timers, local): `lS` 0.54 ms (1×) / 2.8 ms (4×) at 30 calls/s; `y1` 0.07/0.37 ms; `dA` 0.03/0.17 ms.

React commits/s (fiber-diff walker via `__REACT_DEVTOOLS_GLOBAL_HOOK__`, desktop unthrottled) [LIVE]: idle paused **45.1 commits/s, all `KF`**; playing 1×: 23/s (`_F` + `KF`) with **14 components + 13 toolbar buttons (27 component renders) re-rendering on each of the 2.1 tick commits/s**; 8×: 18/s, `Vs` (toolbar buttons) 114 renders/s, `CF`/`LF` 2 commits per tick; scrub drag: AO 6.5–7.5 commits/s (rAF-batched) with the same 14-component + 13-button fan-out; intro: 13.3 commits/s. With the `KF` loop patched out: idle **0.0 commits/s**.

8× playback A/B at 4× CPU, desktop layout [LOCAL, software GL]:
| Variant | fps | p50 frame | frames >100 ms |
|---|---|---|---|
| base | 11.4 | 83 ms | 46 |
| + kill `KF` loop, `_F` per-frame setState, pin glow | 11.3 | 67 ms | 41 |
| + no `backdrop-filter` / `mix-blend-mode` | 17.8 | 33 ms | 45 |
| + skip `lS` (unit canvas) | **59.3** | 16.7 ms | **0** |

### 3.3 Interactions (INP-proxy, desktop layout, 4× CPU)
Paused: **Unit Roster 680 ms (LoAF 557)**, scrubber drag 304, click on map canvas 240, `3`/`2` day-jump keys 208–232, Search 160, Soldier's Eye 168, Walkthrough 168, Map Layers 176, everything else 80–160 (≈80 ms is the emulation's paint floor).
**Playing at 8×**: Filter 1,456, Map Layers 1,552, Locations 1,552, Distance 1,440, Monuments 1,328, Follow Ancestor 1,296, Soldier's Eye 1,296, Play/Pause 504 → **1,528** on the 2nd click, scrubber 800, canvas click 528, day-jump keys 464–504; LoAF 200–940 ms. (Patching `KF`+`_F`+glow did not change this in software GL — the frame pipeline itself is saturated, see 3.2.)
Boot flow: desktop **"Skip intro" 984 ms** (input delay 330 ms — intro re-rendering the whole tree per frame), "Select Desktop" 192; mobile "Skip intro" 240, **"Select Mobile" 584 ms (LoAF 433, blocking 361)**.
Roster open (direct): 501 → 5,490 DOM nodes (**+4,989**), 354 ms to next paint, +11 ms per tick while open (49 vs 38 ms/tick).
Overlay script costs (4×): `GTBG_REPOSITION_EF` 1.4 ms/call (72 interactive elements), click-capture `textContent` walk 0.35 ms — small; *not* a hotspot today.

### 3.4 Sub-pages, mobile profile, cold cache [LIVE]
| Page | FCP | LCP | TBT | mapbox-gl.js finished | first tile | requests | KB |
|---|---|---|---|---|---|---|---|
| compare | 3,308 | 3,308 | 280 | 2,884 | 3,705 | 49 | 1,157 |
| camera | 3,508 | 3,508 | 299 | 2,931 | 4,213 | 51 | 989 |
| sandbox | 5,496 | 5,776 | 285 | 4,949 | 7,201 | 37 | 845 |
| immersive | 3,556 | 3,556 | 421 | 2,928 | 3,986 | 37 | 846 |
| ground-remembers | 3,456 | 3,456 | 534 (9 long tasks) | 2,897 | **none in 16 s [VERIFY]** | 38 | 763 |
| viewshed | 3,480 | 3,480 | 300 | 2,948 | 3,824 | 44 | 1,234 |
| watch-together | 4,912 | 4,912 | **1,626** (1,506 ms task = `peerjs.min.js` 1,211 ms) | 3,082 | 5,451 | 36 | 757 |
| cinematic-export | 3,732 | 3,732 | 304 | 2,933 | 3,903 | 38 | 751 |
| search | 924 | 1,188 | 131 | — | — | 17 | 76 |
| historian | 916 | 916 | 115 | — | — | 20 | 96 |
| dashboard | 896 | 896 | 121 | — | — | 6 | 24 |
| regiment | 844 | 844 | 104 | — | — | 25 | 99 |

Every map page has a classic, non-`defer` `<script src="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js">` + a render-blocking CDN stylesheet, **no `preconnect`, no `defer/async`**, and its own inline script only starts fetching `/data` *after* Mapbox has downloaded and executed (data starts at 3.0–5.1 s). The main app bundles the same 3.24.1 build inside its own file ⇒ visitors who go map → Compare download Mapbox twice (different URL = different cache entry). CDN headers: `Cache-Control: max-age=31536000`, 1.80 MB raw / 385 KB br.

bfcache [LIVE, headless Chrome 153]: `/`, `/historian.html`, `/compare.html`, `/search.html`, `/dashboard.html` all **restored from bfcache with JS state intact** (no `backForwardCacheNotUsed`). Keep it that way (no `unload`, no `no-store`).

Live cache headers [LIVE]: `site-nav.css`, `site-nav.js`, `icons.svg`, `screenshots/*`, `/.netlify/scripts/rum` = `public,max-age=0,must-revalidate` (each navigation re-validates two render-blocking files); `/data/*`, `manifest.json` = `max-age=3600`; `/assets/*`, `/icons/*` = 1 y immutable; `sw.js` = no-store.

---

## 4. Findings (fix specs)

Severity: critical | high | medium | low. Effort: S <0.5 d, M 0.5–2 d, L 2–5 d, XL >5 d. Most code-level items need a real source tree (**N1**): "Depends on N1" means "do it in the rebuilt source; until then apply as a bundle patch — see finding 39 for the ones I verified as one-line patches."

### perf-runtime-01 — The unit canvas swallows all pointer input; the map cannot be panned, zoomed or rotated (critical · S–M · refs: new; relates D3, C1)
**Evidence.** Desktop: `ux.canvas = { position:"absolute", inset:0, pointerEvents:"auto", cursor:"crosshair", zIndex:10 }` (bundle.pretty.js:97393–97399) is a *sibling after* the Mapbox container (97364–97365). Mapbox's `HandlerManager` listens on `map.getCanvasContainer()` (90310, 90323–90342), so events landing on the sibling canvas never reach it. Live, real CDP mouse/touch events: `elementFromPoint(700,450)` = `CANVAS z=10 pe=auto`; NavigationControl zoom-in button hit-test = `CANVAS`; screenshot mean-abs-diff of the map area: idle noise 0.27, **mouse drag 0.018, wheel zoom 0.014, touch drag 0.014**; after "Toggle Units" (canvas `display:none`) the identical drag gives **26.7**. Mobile: `bn.style.cssText="…pointer-events:auto;z-index:10;…touch-action:none;"` (102995) plus a `touchend` that calls `preventDefault()` (102997–103003); measured canvas `ta=none pe=auto` 375×812 over the map; touch-drag diff 0.023 vs baseline 0.023 (no pan).
**Root cause.** Unit picking was implemented by putting a click target above the map instead of using `map.on('click')`; the older hover/touch helpers (`k4`, `fF`, `iO`) were bolted on the same canvas.
**Fix.** (a) Minimum: set `pointerEvents:"none"` on both canvases and move hit-testing to Mapbox: `map.on('click', e => pickUnit(e.lngLat))` (Mapbox already suppresses `click` after a drag), reusing `Xx(spatialIndex,lng,lat,0.002)` (97336); delete the canvas `onClick` and `k4`'s tap logic (9909–9982). (b) Better: draw units as a Mapbox layer (finding 10) and use `map.on('click','units',…)` / `queryRenderedFeatures`; cursor via `mouseenter/leave`. (c) Re-enable `dragRotate/touchZoomRotate` deliberately or disable them (`bearing` is not handled by `lS`'s projection assumptions).
**Acceptance.** Playwright: drag 300 px on `#map` ⇒ `map.getCenter()` changes; wheel ⇒ zoom changes; tap a unit ⇒ selection; +/- buttons clickable (`elementFromPoint` returns the button); repeat with touch emulation at 375 px. Pixel-diff test as in `flow4.js`.
**Moves.** Core function B/D → A; removes the main reason "Toggle Units" is needed; no perf regression (fewer handlers).
**Depends on.** N1 (or bundle patch 39-C).

### perf-runtime-02 — Dead monuments rAF loop: exception storm, 45 commits/s idle, and a ref-of-ref bug that breaks Monuments, NPS Tour and Ancestor fly-to (high · S · refs: relates C5, index.html "Monuments button dead" comment)
**Evidence.** `KF` (100844) starts `requestAnimationFrame(ut)` unconditionally and recurses forever (100850–100868); per frame it does `mA.forEach(pe => { try { const Pe = kt.project([pe.lng,pe.lat]); … } catch {} })` (100856–100862) then `H(xe)` (new object ⇒ re-render). `kt = c.current`, but `AO` stores the **ref object**: `onMapReady: (ii,Ur) => { Nn.current = ii; wi.current = Ur?.current }` (113235–113238) while `gF` calls `c(M, f)` with `M` = `useRef` (97255). So `kt.project` is `undefined`, 20 TypeErrors/frame are thrown and swallowed, and no monument ever renders (this is why `index.html:608-714` had to build a separate star overlay). Same wrong object reaches `XF` (`kt.flyTo`, 100852/100884 → TypeError inside the click handler ⇒ NPS Auto Tour never flies or starts playback) and `Zk` (`Xe.flyTo`, 101087–101107). RECON_SRC passes the real map: `onMapReady(map, containerRef)` (recon `MapView.jsx:69`). Measured: idle paused **45.1 React commits/s, all `KF`**; mobile 4× 1×: `ut` inclusive **914 ms / 11.3 s**, of which 709 ms is the throwing body; boot window 156 ms. Patching the loop out: idle commits 0.0/s, idle script 744 → 65 ms per 10 s (mobile 4×).
**Root cause.** Ref passed where the map instance is expected + an always-on animation loop used to reposition DOM markers.
**Fix.** (1) `onMapReady(map, container)` must pass `M.current` (`Nn.current = map`). (2) Delete the per-frame loop. Render monuments as a Mapbox layer from `monuments.json` (symbol/circle layer + `map.on('click','monuments',…)`), or, if DOM markers are kept, use `mapboxgl.Marker` (Mapbox repositions them itself) or update on `map.on('move')` with rAF coalescing only while `showMonuments` is true. (3) Remove the `index.html` monuments overlay script (608–714) once the real layer exists. (4) Add a lint/test: no exception thrown per frame (`window.onerror` count == 0 during 10 s playback).
**Acceptance.** Idle paused: `reactCommits/s == 0`, `FireAnimationFrame/s` ≤ Mapbox's own (0 when idle), `Performance.getMetrics().ScriptDuration` delta < 20 ms per 10 s; Monuments toolbar toggle shows 20 stars aligned after pan/zoom; NPS Auto Tour flies + auto-plays; console has 0 TypeErrors.
**Moves.** INP, TBT, battery; fixes functional bugs (Monuments, NPS Tour, Ancestor fly-to).
**Depends on.** N1 / patch 39-A (KF) + 39-D.

### perf-runtime-03 — Whole-store subscription: every store write re-renders the entire app (high · M · refs: P1)
**Evidence.** `yn()` without selector at 25 sites: 9910, 97065, 97233, 97416, 97572, 97665, 97907, 98258, 98596, 98747, 99088, 99423, 99713, 99889, 100324, 100845, 101009, 101478, 101680, 102322, 102661, 102941, 111857, 112213 (`IO`), 112940/112961 (**root `AO`**); zero selector usage; zero `React.memo`. zustand's `setState({currentTick: sameValue})` still notifies (a new merged object is created), so scrub events at unchanged ticks also re-render. Measured per **tick** commit: AO, gF, fF, P4, VF, WF, IO, XF, iO, nO, yO, qF, GtbgLoc, MF + 13 `Vs` toolbar buttons re-render; `CF`/`LF` commit twice per tick (state set inside effects, 98264–98289, 98600–98603).
**Root cause.** Store consumed as a global object; children are not memoized and are re-created by the root's render.
**Fix.**
```js
// store.js
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
export const useStore = create(subscribeWithSelector(init));
// components: subscribe to exactly what they render
const tick = useStore(s => s.currentTick);                       // only Timeline/Clock/Story
const { isPlaying, playbackSpeed } = useStore(useShallow(s => ({ isPlaying:s.isPlaying, playbackSpeed:s.playbackSpeed })));
const toggleLegend = useStore(s => s.toggleLegend);              // actions are stable
```
Split concerns: `useClock` (tick/playing/speed), `useUi` (panel toggles, prefs), `useData` (oob, placements, vignettes — set once). Make `AO` select only layout flags. Wrap leaf components in `React.memo` (Toolbar buttons, Legend, Minimap, panels). The canvas/Mapbox renderer subscribes imperatively: `useStore.subscribe(s => s.currentTick, tick => engine.onTick(tick))` — no React involvement. Also make `setTick` a no-op when unchanged.
**Acceptance.** `renders.js` (React commit hook): during 1× playback ≤ 1 commit per tick and ≤ 5 components re-rendered per tick (Clock, Timeline, Story/Event only if their inputs changed); during scrub drag ≤ 2 components; idle 0.
**Moves.** INP (fewer/lighter frames), TBT, battery.
**Depends on.** N1.

### perf-runtime-04 — Boot intro writes the store every frame for 3.5 s, stalls input, and creates the (late) LCP element (high · S–M · refs: H3, P1)
**Evidence.** `tO`'s `ze(st)` calls `P(kt)` and `yn.setState({ currentTick: xe })` every rAF for `eO = 3500` ms (101489–101505, 101471) after an 800 ms delay (101480–101486); each write re-renders the whole tree and, because `isPlaying` is false, re-runs `e1` (y1 + full canvas draw; 97285–97308) — measured 13.3 commits/s, `Vs` 90 renders/s. Input during it: desktop "Skip intro" **984 ms** (input delay 330 ms). The fast-forward reaches ticks with vignettes, so the story panel `CF` renders text; the **LCP is that panel's `full_script` paragraph at 9.7–10.1 s** (104,562 px²; the "The battle was over…" vignette).
**Root cause.** The splash "animates" by driving the real simulation state; downstream widgets (story, toasts, event card, canvas) all react to it.
**Fix.** Replace the fast-forward with a compositor-only CSS/SVG progress (no store writes) or delete it (H3 says returning users shouldn't see it anyway). While `!onboardingDone` gate `CF`, `LF`, `qF`, `nO`, `MF` (render null) and don't mount the desktop shell before the layout is known (finding 08). Keep a static, large, stable LCP anchor (finding 05/36).
**Acceptance.** No `yn.setState` between mount and first user action (assert with `useStore.subscribe` counter = 0); "Skip" / first tap INP-proxy ≤ 150 ms at 4×; LCP element is the static splash (not a story-panel text node); LCP ≤ 2.5 s on the mobile profile with a warm SW.
**Moves.** LCP, INP, TBT.
**Depends on.** 08 (layout decision), N1.

### perf-runtime-05 — `body { animation: gtbg-page-in }` delays FCP from ~0.9 s to ~4.2 s (high · S · refs: P1, P4) — *overlaps perf-cwv; proven by runtime A/B*
**Evidence.** `site-nav.css:12` `body { animation: gtbg-page-in 340ms ease both; }` (`from{opacity:0;transform:translateY(6px)}`), loaded by `index.html:279` and every page. Trace: `firstPaint` 935 ms but `firstContentfulPaint` only at 4,501 ms — when React replaces `#root`'s children. A/B in my browser (CDP rewrite of `site-nav.css`): **FCP 892 ms** (vs 4,196 ms); removing only the splash's own `boot-fade-in` (`index.html:99`) changed nothing (4,264 ms).
**Root cause (hypothesis, confirmed empirically).** Text first painted while an ancestor is at `opacity:0` is not counted as contentful, and the compositor-driven fade never repaints the text, so the FCP entry waits for the next DOM-driven repaint.
**Fix.** Delete the rule (or animate only a non-root wrapper *after* first paint, never from opacity 0 at document start; or use `@starting-style`/`animation-delay` after `DOMContentLoaded`). Keep the `prefers-reduced-motion` guard. Also remove `transform` from `body` (creates a containing block for `position:fixed` descendants while animating).
**Acceptance.** Mobile profile FCP ≤ 1.2 s cold; Lighthouse mobile FCP ≤ 1.8 s; same on all 25 pages.
**Moves.** FCP Poor → Good (RUM FCP p75 was Poor), Lighthouse Performance; partially LCP.
**Depends on.** none (edit `site-nav.css`).

### perf-runtime-06 — First-visit reload + service-worker runtime design (high · S–M · refs: C6, P1, P5, N1)
**Evidence.** `index.html:264–267` `controllerchange → location.reload()`; `sw.js:17` `skipWaiting()`, `:30` `clients.claim()`. Live SW-on run, Slow-4G/4×: navigation #2 at **4,555 ms** (SW-served `/`), first-visit LCP ≈ 10 s absolute vs ≈ 5.5 s without the reload; 76 `/data` requests (two loads). SW fetch handlers: `/data/*` is **network-first and `cache.put`s every response** (`sw.js:61–72`) ⇒ 34–72 Cache Storage writes per visit; HTML `fetch(e.request)` with no `navigationPreload` (SW-boot penalty on every navigation); `PRECACHE_ASSETS` (`sw.js:5–13`) hard-codes `/assets/index-Cg8FAMXN.js` — with the case-mangled deploy zip, `cache.addAll` would 404 and the SW install would fail (N1).
**Fix.** (1) Delete the auto-reload. Use `skipWaiting()` only after a user-confirmed "New version available — Refresh" toast, or drop `skipWaiting/claim` and let the next navigation pick it up. (2) Register at `requestIdleCallback` after LCP. (3) `self.registration.navigationPreload.enable()` and use `event.preloadResponse` for HTML. (4) `/data/*`: stale-while-revalidate keyed by version, **only put when the response differs** (ETag) — or, better, serve hashed immutable data files cache-first (finding 25). (5) Generate `PRECACHE_ASSETS` from the build manifest, exclude the 604 KB JS from install-time precache on metered connections (`navigator.connection.saveData`). (6) Ship an offline fallback page.
**Acceptance.** Cold first visit: exactly one navigation (`Page.frameNavigated` count = 1); SW installs after `load`+idle; 2nd visit `/data` served from SW/HTTP cache with 0 revalidation requests; LCP first-visit within 10 % of returning-visit LCP + network.
**Moves.** LCP (first visit −4 to −5 s at 4G/4×), Lighthouse "redirects" audit, reliability.
**Depends on.** none for (1)–(3); build manifest for (5).

### perf-runtime-07 — Boot waterfall: data starts only after 2.28 MB of JS has executed; 38 requests (72 on mobile) (high · M · refs: P3, P1)
**Evidence.** Requests issue at 4,400–4,532 ms (JS finished 3,579 ms) and complete at 6.07 s on the throttled profile; all 34 (+3 chronology, +1 duplicate) requests are 1.3–7.5 KB br each, 95.5 KB total — the cost is round-trips, not bytes. `commander_successions.json` is fetched twice (`iF` list 96769 and `Hk` 97522); `zp` has no in-flight de-dupe (96900–96918); mobile eagerly calls `zp(1),zp(2),zp(3)` (103040–103042) and re-fetches the 3 chronology files (102958–102960) already fetched by `LF`.
**Fix.** Build step `scripts/build-boot-data.mjs` emits **one** content-hashed `boot.<hash>.json` (oob index + terrain + vignette index + chronology + day-1 keyframes, ≈96 KB br) and one binary `timeline.<hash>.bin` for all 1,804 placements (≈15–20 KB br, see 16) — day 2/3 no longer need lazy per-file fetches (all three days ≈ 55 KB br). Preload from HTML so it downloads **in parallel with the JS**:
```html
<link rel="preload" href="/data/boot.a1b2c3.json" as="fetch" type="application/json" crossorigin fetchpriority="high">
<script>window.__boot = fetch('/data/boot.a1b2c3.json').then(r => r.json());</script>   <!-- app awaits window.__boot -->
```
Parse off the critical path (`scheduler.postTask` or a worker), memoize fetches in a tiny `dataLayer.get(url)` (in-flight + result cache), and keep `Cache-Control: public, max-age=31536000, immutable` on hashed files (netlify.toml `for="/data/*.*"`).
**Acceptance.** ≤ 3 requests before first unit paint (HTML, boot JSON, timeline); data ready at JS-ready time (no gap on the waterfall); `/data` request count per mobile session ≤ 4; zero conditional revalidations on repeat visits.
**Moves.** LCP/TTI, INP (no main-thread parse burst), reliability.
**Depends on.** N1 (build step).

### perf-runtime-08 — Layout chooser mounts the whole desktop app + a Mapbox map, then Mobile tears it down and builds a second one (high · L · refs: H3, C1, P1)
**Evidence.** `AO` renders the desktop shell for `Zn !== "mobile"` (113071) — true for `null` — so a map, 5 canvases, toolbar and 25 subscribed components exist under the chooser (measured: maps 1, canvases 5, 526 nodes). "Select Mobile" ⇒ `gF` unmounts (`Xe.remove()`, 97263) and `pO` creates a second `Map` (102981) with its own token constant, canvas and data loads: **INP-proxy 584 ms (LoAF 433, blocking 361 ms)**, 2 style requests, +50 requests (34 `/data`), 619 nodes. The desktop `IO` timeline (transport row at x −213…−54) and `MF/CF/LF/_F/KF…` are still mounted in mobile (113242–113283) although only `pO`'s own UI is used.
**Root cause.** Layout is a user choice made *after* boot instead of a pre-mount decision; two parallel component trees (`AO` shell vs 7,000-line `pO`) each own a map.
**Fix.** Decide layout before mounting anything heavy: `layout = localStorage('gtbg_layout') ?? (matchMedia('(pointer:coarse) and (max-width: 820px)').matches ? 'mobile' : 'desktop')`; show a small "Switch to desktop/mobile view" control instead of a full-screen chooser (H3). Mount **one** `<MapStage/>` (one Mapbox instance, created once, reused by both layouts and by Walkthrough) and swap only the chrome (toolbar vs bottom bar). Delete duplicate IO/panels in mobile. Load days lazily (or from the single timeline file, 07).
**Acceptance.** Exactly one `.mapboxgl-map` in DOM at all times (also with Walkthrough open); one style request per session; tap-to-first-frame after layout selection ≤ 150 ms INP-proxy at 4×; mobile session `/data` requests ≤ 4; no element with negative x in the transport row (C1).
**Moves.** INP (mobile), LCP, memory (−1 WebGL context), C1.
**Depends on.** 10 (shared renderer) helps; N1.

### perf-runtime-09 — Roster / OOB / Ancestor lists: 705 rows → +4,989 DOM nodes, 680 ms open, re-rendered every tick (high · M · refs: H5)
**Evidence.** `Jk` (102660) maps **all** `U-`/`C-` entries (410 + 295) through un-memoized `hO` rows (102548, ≈7 elements each) inside `gA`; `Jk` subscribes to the whole store and recomputes `P` (100-tick scan) every tick, so all rows re-render each tick. Measured: open = 501 → 5,490 nodes, **354 ms to next paint (direct), 680 ms INP-proxy @4×, LoAF 557 ms**, +11 ms/tick while open. `Xk` (OOB, 102321) recomputes two `Object.entries(M).filter().sort(localeCompare)` per render (not memoized, 102345–102350). Mobile `pO` renders the same 705-row roster inside the Tools sheet and sorts twice per render (103127–103131; 0.5 ms desktop, ~3 ms phone — minor). `Zk` sorts 478 names with `localeCompare` (≈101044) → H5's "102nd before 10th".
**Fix.** (1) Virtualize: `react-window` `FixedSizeList` (≈6 KB) per column with `itemData` and a memoized row (`React.memo(Row)`), or `content-visibility:auto; contain-intrinsic-size:0 44px` on rows as a no-dependency first step. (2) Mount lazily and don't subscribe to `currentTick` — give rows a `placement` prop via a tick-keyed `Map` updated by the engine, and re-render only rows whose disposition/strength changed (or throttle roster refresh to 1 Hz). (3) Memoize the sorted arrays once per `oobData`; use a hoisted `Intl.Collator(undefined,{numeric:true})` (fixes H5). (4) Group by corps with collapsible sections (also better UX).
**Acceptance.** Opening Roster/OOB adds ≤ 400 DOM nodes and INP-proxy ≤ 120 ms at 4× (desktop) / ≤ 200 ms (mobile); with Roster open, per-tick commit touches ≤ 30 rows; nodes steady-state ≤ 1,500.
**Moves.** INP (worst single interaction), DOM size, memory.
**Depends on.** 03.

### perf-runtime-10 — Replace the full-viewport canvas unit renderer with Mapbox layers (frame pipeline raster/composite) (high · XL · refs: D3, P1) — *plan-level; phase 1 findings 16–18 are the cheap version*
**Evidence.** 8× playback @4×: **11.4 fps → 59.3 fps** by skipping `lS` alone (after removing blur/blend: 17.8 fps) [LOCAL, software GL]; the JS in `lS` is only 0.54 ms/2.8 ms per call, so the cost is canvas raster + full-layer composite (1440×852 cleared and repainted every frame, `shadowBlur` 8–14 (96612/96616), `save/restore` per unit, per-label `measureText` (96669), an 8-pass O(n²) repel loop (96561–96581), an unused full-size canvas `Uc` plus the WebGL map canvas underneath). Canvas is not DPR-aware (`c.width = getBoundingClientRect().width`, 96510–96512; no `devicePixelRatio` anywhere in app code) ⇒ blurry on 2–3× phones. Label collisions (D3) are hand-rolled.
**Root cause.** Units were built as an immediate-mode overlay instead of GPU layers inside the map's own frame.
**Fix (target architecture).**
* Timeline in typed arrays (finding 16); engine in plain JS (finding 03/15).
* `map.addSource('units', { type:'geojson', data: emptyFC, dynamic:true })` — **Mapbox GL 3.24.1 already ships `GeoJSONSource#updateData(featureOrCollection)`** (bundle.pretty.js:59674–59711: merges by feature `id`, requires `dynamic:true`). Pre-create 478 features with numeric `id`s; per tick send only changed ones (**median 7, p90 18, max 87 per tick**). For smooth in-between motion either (a) update ≤15 Hz with the interpolated subset that is actually moving, or (b) write a small `CustomLayerInterface` that uploads a `Float32Array` of positions each frame (≈0.1 ms) and draws instanced arrow/box sprites — do (a) first.
* Layers: `symbol` (icon = pre-rendered arrow/box `map.addImage`, `icon-rotate:['get','bearing']`, `icon-size` from strength), `circle` glow driven by `feature-state`/filter for "engaged" dispositions, and a separate `symbol` label layer with `text-optional:true`, `text-variable-anchor`, `symbol-sort-key` by strength — **Mapbox's collision engine replaces the hand-rolled repel loop** (D3). The dev page `unit-rendering-reference.html` already prototypes exactly this (`icon-allow-overlap:false`, `symbol-sort-key`); productionize it but avoid its two flaws: a permanent `pulseTick` rAF calling `setPaintProperty` at 60 Hz, and full `setData` per frame.
* Interaction via `map.on('click','units')`; hover via throttled `queryRenderedFeatures` (fixes 01).
* If a custom canvas must stay (fallback): finding 17 (sprites, spatial hash, dirty flag, DPR cap) and optionally `OffscreenCanvas` in a Worker with camera state messaged from `map.on('move')` (only valid for pitch 0/bearing 0, project with own Web-Mercator math).
**Acceptance.** 8× playback at 4× CPU: ≥ 30 fps p95, 0 frames > 100 ms (real Android: ≥ 30 fps at 4×, ≥ 45 at 2×); Performance trace shows no per-frame Canvas2D `Paint`; labels never overlap (visual test); memory: one WebGL context.
**Moves.** INP during playback (1.5 s → target < 200 ms), TBT, battery, D3, crisp DPR rendering.
**Depends on.** 01, 03, 08, 16; N1.

### perf-runtime-11 — Sub-page Mapbox loading: blocking CDN script, no shared cache, FCP 3.3–5.5 s (high · M–L · refs: P2, S2, S3, S4)
**Evidence.** §3.4 table; 9 pages include `<script src="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js">` (1.80 MB / 385 KB br, `Cache-Control max-age=31536000`) synchronously in `<head>` (e.g. `compare.html:19–20`) with a render-blocking CDN stylesheet, no `preconnect`, no `defer`; the page's own data fetch waits for it (`compare.html:95+`, `ground-remembers.html`), maps init only after 9 placement files arrive (S2 blank map). The main bundle carries a private copy of the same version (different cache key).
**Fix.** (1) One self-hosted, content-hashed copy `/vendor/mapbox-gl-3.24.1.<hash>.js` (+`.css`), `Cache-Control: immutable`, used by *both* the app (Vite `external`/`build.rollupOptions.external` + import map, or `optimizeDeps` alias) and sub-pages so the second visit is a cache hit. (2) Load with `<script defer>` (or dynamic `import()`), `<link rel="preload" as="script">` + `preconnect` while the app is not yet self-hosted. (3) Render page chrome + a skeleton/static map image first; start data fetches immediately (`Promise.all` in parallel with Mapbox load) and create the map as soon as both are ready. (4) Evaluate v2.15.0 (985,978 B raw / 219,663 B br vs 385,039 B br: −165 KB br) — sub-pages use only raster styles, GeoJSON, circle/heatmap/symbol layers; v2 lacks `updateData` but the sub-pages don't need it; needs a visual regression pass. A MapLibre swap is possible for the sub-pages but Mapbox tile/style terms must be checked first ([VERIFY]).
**Acceptance.** Mobile profile FCP ≤ 1.5 s on all map pages (page chrome), map interactive ≤ 3.5 s; second sub-page visit downloads 0 bytes of Mapbox JS; TBT ≤ 200 ms.
**Moves.** FCP/LCP/TBT on 9 pages, transfer size.
**Depends on.** N1 for the app side; sub-pages are plain HTML (editable now).

### perf-runtime-12 — `watch-together.html` runs PeerJS synchronously: 1.2 s long task, TBT 1,626 ms (high · S)
**Evidence.** `watch-together.html:19` `<script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js">` classic/blocking; LoAF 4,154 ms with `peerjs.min.js@0 classic-script 1,211 ms` + `mapbox-gl.js 125 ms` [LIVE, 4×]. PeerJS is only needed when the visitor clicks Host/Join (`new Peer(...)` at lines 224/251).
**Fix.** Remove the tag; `await loadScript('/vendor/peerjs-1.5.4.<hash>.js')` inside the Host/Join handlers (self-host to drop the jsDelivr dependency and to make CSP/privacy accurate — X5); show a "Connecting…" state. Same lazy-load for `mapbox-gl` per 11.
**Acceptance.** TBT ≤ 150 ms on load; no `peerjs` request until a button is pressed; Host/Join works.
**Moves.** TBT/INP on that page (1,626 → <200 ms), privacy transparency.
**Depends on.** none.

### perf-runtime-13 — Clock widget `_F`: 60 Hz `setState` while playing, double-counted FPS, visible "NN fps" debug text (medium · S · refs: C3, H9)
**Evidence.** `_F` (97415) runs its own rAF loop `sT(); P(Yx()); H(ze => !ze)` (97419–97426) — a boolean toggled every frame purely to blink a dot — measured **≈23 commits/s** at 1× playback (headless frame rate); `sT()` is called both here and in `Ed` (96976) so `getFPS()` reports ≈2× the real rate; `fpsWarn` renders `"{M} fps"` to users when `M<55` (97446–97448) and `lS` paints an orange `"{fps} fps"` on the map when `<45` (96684–96687). `R = \`July ${l + 2}, 1863\`` (97428) is the C3 date bug; "1x (real time)" (97429) is H9.
**Fix.** Delete the rAF loop; blink with CSS (`animation` on `opacity`, compositor-only) or not at all; derive the label from `tick` via one shared `formatTick()` used by Toolbar/Clock/Story; remove the FPS overlays from production (behind `?debug=1`).
**Acceptance.** Playing at 1×: React commits ≈ tick rate; no "fps" text in DOM/canvas in prod.
**Moves.** INP/TBT, battery, polish (H7).
**Depends on.** N1 / patch 39-B.

### perf-runtime-14 — Infinite `box-shadow` animation forces a paint every frame on every page (medium · S)
**Evidence.** `site-nav.css:41` `.gtbg-historian-pin { animation: gtbg-pin-glow 3.4s ease-in-out infinite }`, keyframes animate `box-shadow` (`:48–51`) — a non-compositor property ⇒ style recalc + paint + layer commit each frame forever, including on the paused map (idle **594 style recalcs / 10 s**, main thread 7 % busy on desktop; GPU process 16 % busy in the lab). Removing it (with 02) ⇒ idle recalcs **0**, desktop idle busy 7 % → 2 %, mobile idle script 744 → 74 ms/10 s. The pin lives in `#extra-features` on the map and in the nav of every sub-page.
**Fix.** Animate `opacity` of a `::after` pseudo-element that carries a pre-rendered shadow (compositor-only), run only while the pin is on-screen and not hovered (`IntersectionObserver`/`animation-play-state`), stop after N iterations, and keep the reduced-motion override.
**Acceptance.** Idle page: `RecalcStyleCount` delta = 0 over 10 s; `FireAnimationFrame` = 0; DevTools "Rendering → Paint flashing" shows no repaint.
**Moves.** Battery/thermals, idle CPU, INP baseline.
**Depends on.** none (edit `site-nav.css`).

### perf-runtime-15 — Playback clock: unclamped dt (jump-to-end after backgrounding), no visibility handling (medium · S · refs: H9)
**Evidence.** `const ze = F_ ? c - F_ : 16; … Hc += ze` (96977, 96983) then `ht = Math.floor(Hc/Pe)` and `it = Math.min(H+ht, 675)` (96984–96986). Browsers stop rAF in hidden tabs; on return `dt` can be minutes ⇒ e.g. 60 s at 1× ⇒ 120 ticks in one frame; ≥ 5 min hidden ⇒ instant jump to tick 675 and `isPlaying:false` (96993–96999). The strength-drop "flash" table `uF` only sees the first→last tick of such a jump (97033–97044). [CODE; classic rAF behavior]
**Fix.** In the engine: `const dt = Math.min(now - last, 100)`; pause on `visibilitychange`/`pagehide` (resume on `pageshow` from bfcache); make the seconds-per-tick constant explicit and correct H9's label (2 ticks/s = 10 sim-min/s).
**Acceptance.** Test: play 1×, hide the tab for 60 s, return ⇒ tick advanced ≤ 1; bfcache round-trip resumes cleanly.
**Moves.** Functional correctness, RUM INP outliers (the RUM PDF shows INP spikes to ~2 min).
**Depends on.** 03 (engine).

### perf-runtime-16 — `y1` interpolation: module-global accumulator, O(n²), per-frame allocation; timeline should be precomputed (medium · M · refs: D3)
**Evidence.** `const i2 = {}` (96265) is filled by `M.forEach(R => i2[R.unit_id] = R)` (96270) and **never cleared**: rewinding or jumping days keeps every unit ever seen at its last-visited position (e.g. after viewing tick 675, tick 1 shows ~405 extra units at their *future* positions — consistent with "July 3 dawn: empty fields with units at the edge"). Per frame: two `{...i2}` copies of up to 478 keys, `Object.values`, `M.find(...)` inside `.map` (O(n²), 96297), `dA` re-projects everything (97019) and `lS` projects again (96544). Data is keyframes (188/675 ticks populated), so most frames have `M=[]` and interpolation degenerates to "teleport at the next populated tick".
**Fix.** Build step converts placements into a per-unit keyframe table (SoA typed arrays: `tick:u16[]`, `lat/lng:i32(1e‑6°)[]`, `bearing:u16[]`, `strength:u16[]`, `disp:u8[]`, `unitStart:u32[]`). Runtime `stateAt(tickFloat)` binary-searches each unit's keys (478 × ≤ log2(30) steps ≈ 2.4 k ops), lerps between *its own* consecutive keyframes (real interpolation across gaps, with `Charging/Retreat` easing kept), writes into preallocated `Float32Array` buffers — zero allocation. Units without a keyframe yet are absent; after their last keyframe they persist only if the data says so (correctness fix). Hit-testing: reuse a uniform grid built once per tick change from that buffer.
**Acceptance.** Jump 1→451→1: unit set identical to a fresh load at tick 1; `y1` replaced by `stateAt` ≤ 0.1 ms at 4× for 478 units; GC < 5 ms/10 s.
**Moves.** Correctness (D3), CPU, GC, and enables finding 10.
**Depends on.** 07 (timeline file), N1.

### perf-runtime-17 — If the canvas renderer stays: make it cheap (medium · M) — *fallback for finding 10*
**Evidence.** `lS` (96506–96688): `getBoundingClientRect()` every frame (96510); second `project` per unit; `X4` proximity O(U·C) with `Object.fromEntries` (96480–96505, 96552); 8-pass O(n²) repel (96561–96581); `save/translate/rotate/restore` + path stroke per unit; `shadowBlur` 8/14 px; `measureText` + `fillRect` + `fillText` per label with no cache (96664–96682); no dirty check (redraws even when nothing changed — e.g. paused, or `Ed` idle frames); canvas cleared/resized via `c.width=` (resets state) and `K4` uses `getImageData` (GPU→CPU readback stall on resize, 96710).
**Fix.** Sprite atlas (`OffscreenCanvas`→`ImageBitmap`) per side × disposition × size bucket, `drawImage` with translate/rotate only; glow = one pre-blurred sprite instead of `shadowBlur`; label bitmaps cached by text; spatial-hash repel (24 px cells, 2 passes) or none at zoom < 14; project once per frame into a shared `Float32Array`; draw only when `(tickInt, fracBucket, cameraHash, selection, filters, size)` changed, otherwise skip the frame; DPR cap `min(devicePixelRatio, 2)` (1.5 on `deviceMemory ≤ 4`); `getContext('2d',{alpha:true, desynchronized:true})`; resize with `ResizeObserver` only (no `getImageData`); cap to 30 fps on coarse-pointer devices (already for width < 500 — make it width-independent).
**Acceptance.** `lS` ≤ 1.0 ms at 4× for 300 visible units; no `shadowBlur`/`measureText` in a 10 s trace; 8× playback p90 frame ≤ 33 ms at 4× (lab).
**Moves.** Frame time, INP during playback.
**Depends on.** 01, 16; N1.

### perf-runtime-18 — Redundant per-tick work: full redraw + index rebuild + tint on every tick even when paused (medium · S)
**Evidence.** Effects at 97281–97326: `[Se]` overlay tint `C4(Se)` (sets `background` that transitions for 8 s under `mix-blend-mode`), `[Se,ze,Ee]` → `e1` (y1 + `lS`) whenever not playing, and `[Se,Ie]` → `y1` + `aT` (string-keyed grid, `${P},${z}`) — three separate `y1` computations per tick; mobile duplicates them (103063–103096). Spatial index only needed on pointer events.
**Fix.** One engine callback per integer tick: compute state once, feed canvas/layer, store in a shared buffer; build the hit-test grid lazily on first pointer event after a tick change; update the tint only when the hour bucket changes.
**Acceptance.** 1 `stateAt` call per tick + 1 per rendered frame; scrubbing 40 ticks does ≤ 40 index builds → 0 (lazy).
**Moves.** TBT/INP during scrub/playback.
**Depends on.** 03, 16.

### perf-runtime-19 — Scrubber: per-event whole-tree writes, 10,000-step range, unlabeled (medium · S · refs: D2, A2)
**Evidence.** `<input type="range" min=0 max=100 step=0.01 value={he} onChange={e => setTick(Math.round(…))}>` (112294–112303) — controlled with 10,000 steps for 675 ticks; each `input` event writes the store (even when the rounded tick is unchanged). Mobile `onTouchMove` calls `setTick` per touchmove (103184–103189) re-rendering 7,000-line `pO` (+2 sorts, 103127–103131). Measured scrub-drag INP-proxy **304 ms paused, 800 ms while playing @4×**.
**Fix.** `step=1 min=1 max=675`, `aria-label="Battle time"`, `aria-valuetext={formatTick(tick)}`; keep the thumb position in local state, commit the tick through `requestAnimationFrame` coalescing and `startTransition`; skip the write when unchanged; pause the playback loop while dragging; `touch-action:pan-y`; use pointer events (one code path for mouse/touch).
**Acceptance.** Scrub-drag INP-proxy ≤ 150 ms at 4× paused, ≤ 250 ms while playing; ≤ 1 store write per frame; axe: slider has an accessible name.
**Moves.** INP, A2.
**Depends on.** 03.

### perf-runtime-20 — Touch indicator and cursor glow re-render per input event (medium · S)
**Evidence.** `k4` (9909) calls `H({x,y})` on **every `touchmove`** (9926) inside `gF` (the whole map component + `fF`, `P4`) — 60–120 renders/s during any touch on the canvas; `iO` (CursorGlow, 101817) `setState` per `mousemove` with `getBoundingClientRect` and a `left/top` transition (101828, 101870–101872) — attached to the map *container*, which the z10 canvas covers, so it never fires today (dead) but will as soon as 01 is fixed; `fF` (hover popup, 97063) receives `{map,canvas}` (97384) instead of `{hoveredUnit,mousePos}` and is permanently `null` (dead).
**Fix.** Remove `fF`/`k4` state; if a touch ripple is wanted, move a single fixed `div` with `transform: translate3d()` from a passive `pointermove` handler (no React), `will-change:transform`. Same for the glow (or drop it).
**Acceptance.** 0 React commits during touch/mouse move over the map (renders.js).
**Moves.** INP on touch devices, dead-code removal.
**Depends on.** 01.

### perf-runtime-21 — GPU-heavy CSS: 20 `backdrop-filter: blur`, `mix-blend-mode: multiply` full-screen tint, drop-shadow filters (medium · S–M · refs: A4/polish)
**Evidence.** `backdropFilter:"blur(…)"` appears 20× in app inline styles (toolbar 113315, timeline 112381, story/event/toast/unit panels, minimap, chooser 102922 `blur(8px)`, intro `blur(4px)` 101614); `A4()` adds a full-viewport div with `mix-blend-mode:multiply; transition:background 8s ease` (9885–9899); `KF` glow uses `filter:drop-shadow ×2` (100911). Lab A/B at 8×/4×: removing all `backdrop-filter` + `mix-blend-mode` (CSS `*{backdrop-filter:none!important;mix-blend-mode:normal!important}`) took 11.3 → **17.8 fps** (p50 67 → 33 ms). [LOCAL, software GL; direction is reliable, magnitude is not]
**Fix.** Replace blur with opaque/semi-opaque solid backgrounds on the map chrome (blur behind a live WebGL map re-blurs every frame); allow it only on static screens and `@media (hover:hover) and (min-width: 900px)`. Do the night/day tint as a Mapbox paint change (`raster-brightness-max`, `raster-saturation`) or a plain `rgba` overlay **without** blend mode and without an 8 s CSS transition. No-build interim: in `index.html` `<style>`: `@media (max-width: 900px){ [style*="backdrop-filter"]{ -webkit-backdrop-filter:none!important; backdrop-filter:none!important; background-color:rgb(8 8 18 / .96)!important } } [style*="mix-blend-mode"]{ mix-blend-mode:normal!important }`.
**Acceptance.** Playback 8× at 4× (real Android): +≥ 10 fps vs base; no `backdrop-filter` computed on elements over the map on coarse pointers.
**Moves.** Frame time/battery, INP during playback.
**Depends on.** none (CSS) / N1.

### perf-runtime-22 — `index.html` "Extra Features" overlay scripts (medium · S · refs: H1, P?)
**Evidence.** Seven inline scripts (`index.html:294–714`): `populate()` at idle (`innerHTML` ×3, then `GTBG_REPOSITION_EF`) = **183 ms task @4× during the React/Mapbox boot** (forced layout 69 ms; LoAF 4,650 ms); `reposition` is 6 × (`style` write → `getBoundingClientRect` on every interactive element) = forced synchronous layouts, run 150 ms after **every click** anywhere (`index.html:599–602`) — measured 1.4 ms/call on the idle map but scales with open panels (roster ⇒ thousands of nodes); the capture-phase click handler reads `textContent` of 6 ancestors per click (up to 63 KB of text, 0.35 ms; `index.html:476–482`) and keeps doing so after `revealed`; `tryInject`/`tryLabel` call `querySelectorAll('body *')`/`('button')` every 200 ms up to 25× (`index.html:369, 411`); the Monuments overlay is a second, non-tracking implementation of a feature `KF` should provide (`index.html:608–714`); overlay `top` changes cause a 0.02 CLS at reveal (`DIV#extra-features` shift @3,996 ms).
**Fix.** Fold "Ask the Historian / Extra Features" into the React toolbar (H1) and delete the scripts; until then: remove the click-capture listener after `reveal()`, replace the 6-candidate collision search with a fixed slot in the layout (no measuring), and add `contain:layout style` to the overlay.
**Acceptance.** No `EvaluateScript`/`FunctionCall` from inline scripts > 5 ms after DOMContentLoaded; overlay causes 0 CLS.
**Moves.** TBT, CLS, INP under load, H1.
**Depends on.** H1 work.

### perf-runtime-23 — Mapbox configuration and multiplicity: 3 map instances, no perf options, telemetry on (medium · M · refs: X5)
**Evidence.** Desktop `new Map({container, style:"mapbox://styles/mapbox/satellite-v9", center, zoom, minZoom:11, maxZoom:18, maxBounds, dragPan:{inertia…}, scrollZoom:{…}})` (97237–97250): no `fadeDuration:0`, `renderWorldCopies:false`, `pixelRatio` cap, `maxTileCacheSize`, `trackResize`, `performanceMetricsCollection:false` (default `true`, 91907 ⇒ 4 `events.mapbox.com/events/v2` POSTs seen during load), no `preserveDrawingBuffer` issues. Instances: desktop `gF` (97237), mobile `pO` (102981), Walkthrough `_O` (110770; the desktop map underneath keeps rendering behind the opaque overlay). First-map costs @4×: ctor 375 ms, `_setupPainter` 301 ms, first `_render` 596 ms (`getOrCreateProgram` 181 ms — shader compilation), 15 raster tiles ≈ 570 KB of `@2x` WebP at z15 on a 375×812 viewport.
**Fix.** One shared map (finding 08); options `{ fadeDuration:0, renderWorldCopies:false, pixelRatio:Math.min(devicePixelRatio,2), performanceMetricsCollection:false, collectResourceTiming:false, maxTileCacheSize:64 }`; on coarse-pointer/low-memory devices request 1× tiles (`tileSize`/raster source at 256 or `pixelRatio:1.5`); `map.setPaintProperty(…)` instead of new maps for the Walkthrough (fly the shared map, hide the chrome); warm shader programs during idle after the splash (`map.once('idle')`).
**Acceptance.** One `.mapboxgl-map` and one WebGL context per page; ≤ 1 `events.mapbox.com` request per load (or 0); satellite tile bytes at first paint ≤ 300 KB on the mobile profile.
**Moves.** Boot long tasks, memory, transfer, privacy (X5).
**Depends on.** 08.

### perf-runtime-24 — Dead/unused runtime artifacts (cleanup) (medium · S · refs: H11)
**Evidence.** (a) `GF` (99644) calls `yn.subscribe(selector, listener)` but the store has no `subscribeWithSelector`, so the listener never fires: `WF`'s tick stays at the initial value ⇒ **H11 "72 units · tick 1" root cause**; (b) `Uc` canvas 1440×852 (`I4`, 9842–9854) is created and never drawn (≈1.2–4.9 MB backing store); (c) trail canvas `so` (`J4`, 96693) is created with the 300×150 default and only resized by a `ResizeObserver` callback that ran earlier (97267–97279) — measured 300×150 at z8 — so trails (`cA`, 96728) are clipped to a corner and drawn in screen space (they don't follow pan/zoom); (d) `InterpolationWorker-ufiwa2-e.js` (672 B) is emitted but unreferenced; (e) `fF` popup dead (see 20); (f) casualty heatmap: `toggleHeatmap`/`showCasualtyHeatmap` (9419/9435) and the "H" shortcut (111995, 113022) have no implementation; (g) `sT()` double-counts frames (96376, 97423) and the FPS text (13); (h) two overlapping commander-succession toast systems (`qF` 99888 and `nO` 101679) each with un-cancelled `setTimeout`s.
**Fix.** Delete (b),(d),(e),(g); replace trails with a Mapbox line layer fed from the timeline (or drop them); fix (a) with `subscribeWithSelector` or `useStore(s=>s.currentTick)`; implement (f) with the Ground-Remembers heatmap layer or remove the shortcut; merge (h).
**Acceptance.** No orphan canvases (`document.querySelectorAll('canvas').length` = map + minimap); minimap footer follows the tick; trails render in the right place after pan/zoom; bundle has no unreferenced chunk.
**Moves.** Memory, H11, code hygiene.
**Depends on.** N1.

### perf-runtime-25 — Data layer: duplicate fetches, hourly revalidation, blocking `site-nav.*` revalidation (medium · S–M · refs: P3, T3)
**Evidence.** Duplicates: `commander_successions.json` ×2, chronology ×3 by `LF` + ×3 by mobile `pO`, `monuments.json` by the inline overlay, all in addition to per-page re-fetches (search/historian/regiment/find-ancestor/report each fetch 8–20 files — `historian.html` builds a 658-doc corpus from 15 files at every visit); `/data/*` = `max-age=3600` (not immutable, unhashed) ⇒ every hour the whole set revalidates (34–72 conditional requests); `site-nav.css` (7.2 KB) and `site-nav.js` (15.8 KB) are `max-age=0,must-revalidate` and **render-blocking on every page** (two extra round trips per navigation); `/.netlify/scripts/rum` same.
**Fix.** Shared `dataLayer` (in-flight + result memo, one `fetch` per URL per session); hashed data filenames + `immutable` (`netlify.toml`: `for="/data/*"` → `public, max-age=31536000, immutable` once filenames are content-hashed); `site-nav.*` hashed (`/assets/site-nav.<hash>.js|css`) + `immutable`, `<script defer>`; one prebuilt `search-index.<hash>.json` (regiments/vignettes/locations/chronology; ≈50–80 KB raw, ≈15 KB br) reused by search, historian, find-ancestor and report (replaces 12–20 fetches per page).
**Acceptance.** Repeat visit within a week: 0 conditional requests for data/nav assets (DevTools "Disable cache" off, `Network` shows `(disk cache)`); search/historian pages ≤ 3 requests before interactive.
**Moves.** LCP/TTI on sub-pages, TTFB-independent repeat loads, RUM p75.
**Depends on.** build step (07/N1).

### perf-runtime-26 — Story/event/toast panels: two commits per tick and effect-driven state chains (medium · S)
**Evidence.** `CF` (98252): `useEffect([c,f,R])` builds an array and calls `z(it)` + `l(0)` every tick (98264–98274) ⇒ second commit; `AF()` (98247) splits the whole script text on every render; the scroll handler `setState`s per scroll event (98278–98286). `LF` (98595) `setState(c)` in an effect per tick (98601–98603); `qF` `M(...)` per tick when playing (99897–99916). All are rendered/evaluated even when nothing is due (`return null` after hooks).
**Fix.** Derive with `useMemo` keyed by `(tick, dismissed)`; only `setState` when the derived id-list changes (compare ids); compute reading time once per vignette (precompute in the data build); scroll progress via `ref` + CSS variable (`--p`) with rAF, no state; render `CF/LF/qF` only when the store says an item is due (subscribe to a derived selector).
**Acceptance.** ≤ 1 commit/tick and 0 commits on ticks without a due item; no per-scroll React commits.
**Moves.** INP/TBT.
**Depends on.** 03.

### perf-runtime-27 — 148 KB of data literals compiled into the main JS (medium · S)
**Evidence.** Monuments `_A` 110,936 B (104440), Walkthrough stops `d2` 16,494 B, NPS tour `th` 14,027 B, ancestor/overlay tables (bundle.min.js offsets 2,124,255 / 2,107,756 / 2,030,718). `_O` builds two GeoJSON collections from `_A` at every open (110819–110826).
**Fix.** Move to `/data/monuments.<hash>.json`, `/data/tour.<hash>.json`, `/data/walkthrough.<hash>.json`, loaded (and pre-fetched at idle) when the feature opens; `index.html`'s overlay already fetches `monuments.json` (dedupe via the data layer).
**Acceptance.** Main entry JS −148 KB raw (≈ −35 KB br); features still open ≤ 150 ms after first idle prefetch.
**Moves.** JS parse/compile, P2.
**Depends on.** N1.

### perf-runtime-28 — Lazy chunks without prefetch or fallback: Help/Bookmarks appear late (medium · S · refs: D1)
**Evidence.** `MO`/`EO = lazy(() => import("./BookmarkPanel…"|"./HelpModal…"))` (112469–112470) rendered inside `Suspense fallback={null}` (113276–113282): first click waits on the network (RTT-bound; 7 KB / 4.9 KB) with **no visual response** — INP includes the whole fetch on slow links. `InterpolationWorker` chunk is unused (24).
**Fix.** `requestIdleCallback(() => { import('./HelpModal'); import('./BookmarkPanel'); })` after the map is idle; `Suspense` fallback with an immediate skeleton/spinner (also gives an ARIA live "Loading help…"); include both chunks in the SW precache.
**Acceptance.** Help opens with visible feedback ≤ 100 ms and content ≤ 300 ms on the mobile profile at first click.
**Moves.** INP (first Help click), D1.
**Depends on.** N1.

### perf-runtime-29 — Virtual Walkthrough opens a third Mapbox map and an immediate Google Street View iframe (medium · S–M · refs: H13)
**Evidence.** `_O` creates `new z_.Map` (110770) while `gF`'s map keeps rendering underneath; each stop renders `<iframe src="https://www.google.com/maps/embed/v1/streetview?key=…">` (110660–110669) with no `loading="lazy"`, no click-to-load, plus `dangerouslySetInnerHTML` paragraphs (110637); Google Maps embeds are ≈1 MB of third-party JS and re-load on every stop change.
**Fix.** Reuse the shared map (08/23); pause the underlying playback loop while a full-screen overlay is open; Street View behind a "Load Street View" facade (poster + button; `loading="lazy"` iframe after click; re-key the iframe per stop — H13); sanitize or pre-render the paragraph HTML at build time.
**Acceptance.** Opening Walkthrough adds 0 WebGL contexts and 0 third-party requests until the user asks for Street View; open INP-proxy ≤ 150 ms (now 168–216 ms @4×).
**Moves.** INP, memory, privacy.
**Depends on.** 08.

### perf-runtime-30 — Ground Remembers: map waits for all data, `setData` of the whole filtered collection every 90 ms (medium · S–M · refs: S2)
**Evidence.** `ground-remembers.html`: `await Promise.all(9 fetches)` → then `new mapboxgl.Map` (the blank-map window, S2); `geojsonThroughTick` filters + maps all 1,804 placements into a new FeatureCollection for every slider `input` and every 90 ms play step (`setInterval`) and calls `setData` (worker re-tile each time); measured JSON `.then` handler 174 ms @4× (forced layout 5 ms), 9 long tasks, heap 16.9 MB; no raster/vector tile request observed within 16 s on that run [VERIFY].
**Fix.** Create the map immediately and fetch in parallel; build the GeoJSON **once** with a numeric `tick` property, and drive the reveal with `map.setFilter('scars-heat', ['<=', ['get','tick'], T])` (or a `heatmap-weight` expression `['case',['<=',['get','tick'],T],w,0]`) — no data reload; coalesce slider input with rAF; use the shared timeline file (07).
**Acceptance.** Map canvas visible ≤ 1.2 s after mapbox-gl is ready; slider drag ≤ 1 frame of main-thread work (< 8 ms), 0 `setData` calls after load; TBT ≤ 150 ms.
**Moves.** S2, TBT/INP on that page.
**Depends on.** 11.

### perf-runtime-31 — Compare / Camera / Immersive / Cinematic Export: two maps, `setData` per input event, data before map (medium · M · refs: S4)
**Evidence.** `compare.html:95–283`: fetches 9 placement files, then builds **two `mapboxgl.Map`s** (two WebGL contexts, two style loads — measured 4 style requests, 12 tiles, 1,181 nodes); each slider `input` rebuilds a FeatureCollection via per-unit binary search and calls `setData` synchronously (no rAF coalescing); `camera.html:230`, `immersive.html:217` use `setInterval` (350 ms) + `setData`; `cinematic-export.html:167–232` `setData` inside rAF while `MediaRecorder` captures.
**Fix.** Init maps in parallel with data; coalesce updates to one per frame (`let pending; input → pending = tick; requestAnimationFrame(flush)`); use `dynamic:true` + `updateData` (or `setFilter` with a `tick` property); on phones default Compare to a *single* map with a swipe/curtain (or lazy-init pane B on idle) to halve WebGL memory; use the shared timeline; `setInterval` → rAF loop with dt clamp and visibility pause.
**Acceptance.** Compare at 4×: TBT ≤ 200 ms; slider drag main-thread ≤ 8 ms/event; ≤ 1 WebGL context on ≤ 400 px viewports.
**Moves.** TBT/INP/memory on 4 pages, S4.
**Depends on.** 11, 16.

### perf-runtime-32 — Search / Historian / Regiment / Ancestor / Report: N fetches + main-thread index assembly per visit (medium · M · refs: H8)
**Evidence.** `search.html` (12 requests → 521 entries; `console.log("Search index built…")` at that line; build ≈1–2 ms, waterfall-bound: FCP 924 ms → data ends 1,109 ms), `historian.html` (15 requests → 658-doc corpus, `score()` = substring scan per query), `regiment.html` (20), `find-ancestor.html`, `report.html`. `render()` runs per keystroke with no debounce (fine at 521 docs), `innerHTML` with unescaped data. CLS 0.147 in one of two mobile runs of `search.html` (results/`#loading` swap), 0.058 historian.
**Fix.** One prebuilt, hashed `search-index.json` shared by all five pages (25); reserve result-list space (`min-height`) to remove CLS; debounce input 100 ms and cap DOM to 40 rows (already); escape output. Build the index at build time with MiniSearch/FlexSearch (serialize) so the client only deserializes (see 33 for scale).
**Acceptance.** ≤ 3 requests before interactive; CLS ≤ 0.02; per-query ≤ 5 ms at 4×.
**Moves.** LCP/CLS/TTI on 5 pages.
**Depends on.** 25.

### perf-runtime-33 — Ask-the-Historian scale: performance budgets and architecture constraints for the expanded databases (medium · L · refs: H8)
**Evidence.** Today's corpus (658 docs) is scanned linearly per question with `includes` (`historian.html` script) — O(corpus) main-thread work; at 100× that is 50–200 ms per query on a phone and a multi-MB download.
**Fix (perf constraints for the retrieval plan).** Never ship the raw expanded corpus to the client. Tiered: (1) static, sharded inverted index (Pagefind-style: ≈10–30 KB per shard, fetched on demand, immutable) for keyword retrieval, queried in a **Web Worker**; (2) passages/answers fetched by id from a static `passages/<shard>.json` (≤ 50 KB br each); (3) semantic/LLM tier behind a **Netlify Function/Edge** endpoint (stream responses with `fetch` + `ReadableStream`, `AbortController`, request coalescing) — vectors stay server-side (20 k passages × 384-d int8 = 7.7 MB, too large for phones); (4) IndexedDB for shard caching, SW cache-first for shards. Budgets: initial JS ≤ 30 KB br, initial data ≤ 50 KB, local query p95 ≤ 50 ms at 4×, server answer TTFB ≤ 400 ms p75, no main-thread task > 50 ms, JS heap ≤ 50 MB, transcript uses `content-visibility:auto` and does not re-render prior messages (memoize per message).
**Acceptance.** `historian.html` at 4×: TBT ≤ 100 ms, INP-proxy of "Ask" ≤ 150 ms with a 10× corpus in the test fixture.
**Moves.** INP/TBT of the flagship feature, feasibility of expansion.
**Depends on.** the historian/data specialists' schema; 25.

### perf-runtime-34 — No adaptive quality, DPR handling, reduced-motion or visibility handling in the app (low · M)
**Evidence.** No `devicePixelRatio`, `matchMedia`, `prefers-reduced-motion`, `deviceMemory`, `hardwareConcurrency`, `connection.saveData` anywhere in app code (grep of bundle.pretty.js >96000); the app CSS has no reduced-motion rules (`index-B4G7Z_2G.css`: 0), while index.html/site-nav.css do.
**Fix.** A `quality` tier chosen once (`low|med|high`) from `deviceMemory`, `hardwareConcurrency`, coarse pointer, `saveData`, and measured first-second frame time: controls DPR cap, label density, glow, blur, max fps (30 on low), tile `pixelRatio`. Honor `prefers-reduced-motion` (no glow/pulse/auto-fly transitions, slower default speed). Pause loops on `visibilitychange`.
**Acceptance.** Low tier on 4× CPU holds ≥ 30 fps at 8×; reduced-motion disables all non-essential animation (test with emulation).
**Moves.** A11y (motion), frame time on low-end.
**Depends on.** 10/17, N1.

### perf-runtime-35 — Prefetch, prerender, bfcache (medium · S)
**Evidence.** bfcache verified working (§3.4). No `speculationrules`, no `<link rel=prefetch>` for likely next pages; sub-pages go through `history.back()` for "Back to the map" (`site-nav.js:212–224`, good).
**Fix.** Add Speculation Rules with `prefetch` (not `prerender`) for the light, static pages only:
```html
<script type="speculationrules">{"prefetch":[{"where":{"href_matches":["/historian.html","/search.html","/documentary.html","/education.html","/dashboard.html","/regiment.html","/find-ancestor.html","/report.html","/aftermath.html","/turning-points.html"]},"eagerness":"moderate"}]}</script>
```
**Do not prerender/prefetch map pages** (they initialise Mapbox — each prerender would count as a billable map load and allocate WebGL). Keep `no unload`, no `Cache-Control: no-store`; add `pageshow` handler to resume/refresh loops after a bfcache restore; log `performance.getEntriesByType('navigation')[0].notRestoredReasons` in RUM (Chrome 123+).
**Acceptance.** Hover → click on a light page shows LCP ≤ 300 ms; bfcache restore rate ≥ 90 % in RUM.
**Moves.** Perceived navigation speed, LCP on sub-pages.
**Depends on.** none.

### perf-runtime-36 — Boot long tasks: eval, React mount, Map constructor, first render, shader compile (medium · M · refs: P2, P7)
**Evidence.** @4× (mobile profile, single load): tasks ≥100 ms at 3,539 (154), 3,787 (490 — incl. a 478 ms `Layout` of 271 objects; not emoji-font related: removing emoji changed the top layout 246→188 ms locally, within noise), 4,297 (491), 9,500 (351); LoAF 4,130 ms = React scheduler 420 ms (`$n`). CPU profile §3.1: eval 155, React effects 651, `Map` ctor 375, `_setupPainter` 301, first `_render` 596, `populate` 183.
**Fix.** (1) Code-split: entry chunk = React shell + store + static splash (≈170 KB per RECON_SRC's own numbers), `import('mapbox-gl')` in a separate chunk started **immediately after first paint** so download/parse overlaps the data preload (07). (2) Break work with `await scheduler.yield()` (fallback `setTimeout(0)`) between: parse boot JSON → build oob index → create map → add layers → first units. (3) Mount Mapbox in `requestAnimationFrame` after the splash paints; defer non-critical panels (`lazy`). (4) Warm shaders at idle (`map.once('idle')`) rather than on first interaction. (5) Investigate the 478 ms first `Layout` in DevTools (Performance → Layout details; suspects: first text shaping for 3 font stacks, `contain:strict` root, 271 dirty objects) [VERIFY].
**Acceptance.** No task > 100 ms between FCP and interactive on the mobile profile except the Mapbox first render (< 250 ms); TBT (Lighthouse mobile) ≤ 150 ms; INP-proxy of the first tap ≤ 150 ms.
**Moves.** TBT, TTI, first-interaction INP.
**Depends on.** N1, 11.

### perf-runtime-37 — Measurement infrastructure: INP attribution, LoAF, perf CI, real-device lab (medium · M)
See §5. **Evidence.** Netlify RUM gives p75 CWV only; no attribution; no source maps (P6) so LoAF/INP function names are minified; there is no automated performance test.
**Fix.** (1) `web-vitals/attribution` beacon incl. LoAF scripts to a Netlify Function; (2) `sourcemap:'hidden'` build + private symbolication (or public maps — the site is public) so LoAF `sourceFunctionName`/`sourceCharPosition` resolve; (3) Playwright/CDP perf suite (my `tmp-perf-runtime` scripts are the seed) in CI with budgets; (4) Lighthouse CI with 4× CPU and Slow-4G presets; (5) monthly real-device trace on a Moto G-class phone via `chrome://inspect`.
**Acceptance.** RUM dashboard shows INP element/phase breakdown; CI fails a PR that regresses a budget in §6.
**Moves.** Sustained green metrics, P6.
**Depends on.** N1.

### perf-runtime-38 — Found while profiling (functional, hand-off) — stale-`mapRef` effects and other silent failures (low · S)
* `GtbgLoc` (112573) and `GtbgLayers` read `yn.getState().mapRef` **once inside an effect with deps `[active]`** (112673): at mount `mapRef` is still `null` (the map loads later), the effect returns early and never re-runs ⇒ the default-on "Locations" labels never appear until the user toggles the button off/on. Fix: depend on `mapRef` (select it) or subscribe to `map.on('load')`.
* Every `Nn.current` consumer (`KF`, `XF`, `Zk`) — see 02.
* `GF`/minimap tick — see 24.
* Casualty heatmap toggle has no implementation — see 24.
* `Escape` handler ignores INPUT targets entirely (`if (Ur.target.tagName === "INPUT") return;`, 112967) — H2 root cause for the search box.
**Acceptance.** Locations labels visible on first load; Esc closes search from inside the input.

### perf-runtime-39 — Interim hot-patch set (no rebuild required) (high · S) — verified anchors
Because N1 means there is no source, these edits can be applied to `index.html`, `site-nav.css` and the minified bundle **today**; every JS anchor below exists exactly once in `assets/index-Cg8FAMXN.js` and each was A/B-tested locally.
| Id | File | Find → Replace | Effect (measured) |
|---|---|---|---|
| A | bundle | `function ut(){const kt=c==null?void 0:c.current;if(!kt){Se.current=requestAnimationFrame(ut)` → `function ut(){return;const kt=c==null?void 0:c.current;if(!kt){Se.current=requestAnimationFrame(ut)` | idle commits 45/s → 0; idle script 744 → 65 ms/10 s (mobile 4×) |
| B | bundle | `P(Yx()),H(ze=>!ze),` → `P(Yx()),` | ≈23 commits/s (one per frame) → tick-rate while playing |
| C | bundle | `pointerEvents:"auto",cursor:"crosshair",zIndex:10` → `pointerEvents:"none",cursor:"crosshair",zIndex:10` **+ companion**: attach the unit-pick logic to `map.on('click')` inside `gF`'s `Xe.on("load", …)` (otherwise unit selection is lost) | map pans/zooms again |
| D | bundle | `Nn.current = ii` → `Nn.current = ii.current` (the `onMapReady` in `AO`) — **do only with the KF loop disabled or replaced**, otherwise `KF` starts doing real work at 60 Hz | fixes NPS Tour/Ancestor fly-to |
| E | `site-nav.css:12` | delete `body { animation: gtbg-page-in … }` | FCP 4.2 → 0.86 s |
| F | `site-nav.css:41` | `animation: none` for `.gtbg-historian-pin` (or opacity-only variant) | idle recalcs 594 → 0 per 10 s |
| G | `index.html:264–267` | remove the `controllerchange` reload | first-visit LCP −4.5 s (4G/4×) |
| H | `index.html` `<style>` | the `backdrop-filter`/`mix-blend-mode` overrides from 21 | +≥ 6 fps at 8× (lab) |
| I | `watch-together.html:19` | lazy-load PeerJS | TBT 1,626 → <200 ms |
| J | map sub-pages | `<script defer>` + `<link rel=preconnect href="https://api.mapbox.com">` + start data fetch before the script | FCP −2 to −3 s (Slow 4G) |
| K | `netlify.toml` | `for="/site-nav.*"`/`"/icons.svg"` → `public, max-age=86400, stale-while-revalidate=604800` (and hash later) | removes 2–3 blocking revalidations per navigation |

---

## 5. Measurement plan

**Lab (every PR)**
1. *Scenarios* (Playwright/CDP; the scripts in `plan-work/tmp-perf-runtime/` are working prototypes): cold boot (mobile profile, SW off and on), layout choose (desktop, mobile), 10 s idle, playback 1×/8×, scrub drag, open Roster/Help/Search/Walkthrough, each sub-page cold load.
2. *Metrics per scenario:* FCP/LCP (+ element), CLS (+ sources), long tasks and **LoAF with `scripts[]` attribution**, Event Timing (INP-proxy per interaction), `Performance.getMetrics` deltas (`ScriptDuration`, `TaskDuration`, `RecalcStyleCount`, `LayoutCount`, `Nodes`, `JSHeapUsedSize`), rAF frame-time distribution, **React commits/s + per-component renders** via a `__REACT_DEVTOOLS_GLOBAL_HOOK__` stub (`reacthook.js`), request count/bytes and waterfall, DOM node count.
3. *Traces:* `Tracing.start` with `devtools.timeline,v8.execute,disabled-by-default-devtools.timeline,loading,blink.user_timing,latencyInfo`; analyze `RunTask`, `FireAnimationFrame`, `Layout`, `Paint`, `Commit`, GPU-process busy (`analyze_trace2.js`). CPU profiles with `Profiler.setSamplingInterval(500µs)`; aggregate self/inclusive by function and map minified `line:col` to source with `bundle.min.js`.
4. *DevTools by hand:* Performance panel, CPU 4× + Slow 4G, enable "Web Vitals" + "Interactions" tracks; Rendering → Paint flashing / Layer borders / Frame rendering stats; Memory heap snapshot after a full 3-day run (expect flat).
5. *Lighthouse CI:* `--throttling.cpuSlowdownMultiplier=4`, mobile + desktop, 3 runs median, budgets in §6.

**Field (continuous)**
* Add `web-vitals@4/attribution` (self-hosted) reporting `INP` (target element, interaction type, inputDelay/processingDuration/presentationDelay, LoAF entries `{duration, scripts[{sourceURL, sourceFunctionName, sourceCharPosition, invoker, duration, forcedStyleAndLayoutDuration}]}`), `LCP` (element, resource timing), `CLS` (largest shift source), `FCP`, `TTFB`, plus `deviceMemory`, `hardwareConcurrency`, `effectiveType`, `layout` (desktop/mobile), `navigationType`, `notRestoredReasons` — `navigator.sendBeacon('/.netlify/functions/vitals', …)`; aggregate p75 by layout/device tier/page. No IDs, no IP storage (update privacy page — X5).
* Publish source maps (or hidden maps uploaded to a private store) so attribution resolves.
* Keep Netlify RUM for the headline p75s; use the beacon for *why*.

**Real devices:** one Moto G Power/Galaxy A-series + one iPhone SE; USB remote debugging (`chrome://inspect`, Safari Web Inspector); record the same scenarios monthly and after each release; compare with the lab 4× numbers to calibrate the software-GL caveat.

## 6. Targets (p75, mid-tier Android unless noted)

| Metric | Now (lab/RUM) | Target |
|---|---|---|
| INP | RUM Poor (>500 ms); lab worst: Select Mobile 584, Roster 680, Skip intro 984, playing-8× clicks 0.5–1.5 s | **≤ 200 ms**; per-interaction budget: input delay ≤ 50, processing ≤ 100, presentation ≤ 50 |
| TBT | 967 ms (whole boot @4×; ≈190 after FCP) | **≤ 200 ms** (Lighthouse mobile), no task > 100 ms after FCP |
| FCP | 4.2 s | **≤ 1.2 s** (lab), ≤ 1.8 s p75 |
| LCP | 9.8–10.1 s cold, ≈10 s first visit w/ SW | **≤ 2.5 s** p75 (static anchor + no reload + no intro) |
| CLS | 0.06–0.11 (0.147 search) | **≤ 0.05** |
| Idle (paused map) | 45 commits/s, 594 style recalcs/10 s, 7–29 % busy | **0 commits, 0 recalcs, ≤ 2 % busy** |
| Playback 1× (4× CPU, mobile) | 72 % busy | **≤ 35 %**, p95 frame ≤ 33 ms |
| Playback 8× (4× CPU) | 11 fps (lab) | **≥ 30 fps p95, 0 frames > 100 ms** |
| React per tick | 14 components + 13 buttons, +2 extra commits (story/event) | **≤ 1 commit, ≤ 5 components** |
| Requests to first units | 38 (72 mobile) | **≤ 3**, `/data` per session ≤ 4 |
| DOM nodes | 501 → 5,490 (roster) | steady ≤ 1,500; any panel ≤ +400 |
| WebGL contexts | 2–3 | **1** per page (≤ 2 compare on desktop) |
| Main JS entry | 604 KB br (2.28 MB raw) | ≤ 250 KB br entry; map chunk lazy |
| Heap / GPU | 10–20 MB / small | ≤ 40 MB / ≤ 100 MB |

## 7. Suggested order (dependencies in parentheses)

**Day 0–1, no build (edit files / patch bundle):** 05 (E), 14 (F), 06 (G), 02 (A,D), 13 (B), 12 (I), 11-J, 21 (H), 25 (K), 35. Re-measure with the harness; expect FCP ≈ 0.9 s, idle ≈ 0, first-visit LCP ≈ −4.5 s, TBT on watch-together fixed.
**Week 1 (needs source, N1):** 01 → 03 → 04/08 → 07 → 09 → 15/16/18/19/20/24/26/27/28.
**Weeks 2–3:** 10 (Mapbox layers) with 17 as fallback, 11 self-hosted/shared Mapbox + code-split (36), 23, 29–32.
**Then:** 33 (with the Historian plan), 34, 37 (measurement infra should start in week 1 so every step is measured).

## 8. Open questions / not verified
* Real-GPU behavior (raster, blur, WebGL shader compile) — all frame-rate numbers are software-GL upper bounds; the ranking is reliable, the magnitude needs a phone.
* Whether Netlify throttled this IP (connectivity gap mid-session) or it was unrelated; site was reachable again minutes later and status was green.
* Cause of the 478 ms first `Layout` (271 objects) and of "no tile requests in 16 s" on `ground-remembers` — need a DevTools look.
* Mapbox v2.15.0 vs v3.24.1 vs MapLibre for the lighter bundle — feature/regression/licensing check required before switching; `GeoJSONSource#updateData` exists only in v3.24.1 (bundle.pretty.js:59674).
* Netlify RUM has no interaction breakdown; "INP Poor" cannot be attributed in the field until 37 ships. My lab attribution (Select Mobile, Roster, boot-intro input delay, playback saturation) is the best available hypothesis.
* `oobData` lacks 100 of the 478 placement unit ids (378 match) — not a perf issue but the unit panel/roster will show nothing for them (data specialists).

## 9. Reproduction
`cd plan-work/tmp-perf-runtime`; start `node localserver.js` (serves SRC_DIR on :8899) or omit `BASE` for live; e.g. `BASE=http://127.0.0.1:8899 PATCH=kf,clock NOGLOW=1 node playback.js desktop 4 3 10 tag` (profile: desktop, 4× CPU, 3×`+` = 8×, 10 s), `node renders.js desktop` (React commit table), `node interactions.js desktop 4 paused`, `node measure_page.js /compare.html mobile 16000`, `node fcp_exp.js nobody`, `node analyze_trace2.js trace_play_mobile_cpu4_plus0.json`, `node incl.js prof_mobile_cpu4_plus0.cpuprofile 45`. Use `MSYS_NO_PATHCONV=1` under Git Bash so `/page.html` is not rewritten.


---

## Verification

Adversarial verifier pass over `perf-runtime` (all critical/high findings plus 26 medium/low ones). Method: re-read every cited `bundle.pretty.js` line, `DEPLOY_DIR`/`SRC_DIR` file and data file; live `curl` for headers, CDN sizes and Mapbox behaviour; and independent re-measurement in my own headless Chrome 153 (CDP) against a local static server serving `SRC_DIR` with brotli, using only the same in-browser CDP rewrites the specialist used. Scripts live in the verifier scratchpad (`vperf/`); nothing in the repo folders was modified.

Environment notes for the numbers below: mobile profile = 375x812, DPR 2, CPU 4x, 1.6 Mbps / 150 ms RTT, cache disabled; desktop = 1440x900. Software GL, so absolute fps are pessimistic exactly as the report says.

### Independent reproductions (headline results)

| Claim | Report | Verifier re-measurement |
|---|---|---|
| Unit canvas swallows input (01) | elementFromPoint = CANVAS z10 pe:auto; drag/wheel diff ~ idle | Desktop: `elementFromPoint(700,450)` = CANVAS z=10 pe=auto; zoom-in button hit-test = CANVAS; after a real CDP drag + wheel + click, `.mapboxgl-canvas-container` received **0** mousedown/mousemove/wheel/click events while the overlay canvas received 1/1/1. |
| KF ref-of-ref bug (02) | `kt.project` undefined | React fiber inspection of `KF.props.mapRef.current`: `Object` with key `current`, `typeof .project === "undefined"`, `typeof .current.project === "function"`. |
| Idle commit storm (02) | 45.1 commits/s idle | **59.3 commits/s** idle (map loaded, paused); with patch A (`ut` returns): **0.0**; script 132 ms -> 0 ms per 10 s. The storm only starts after Mapbox `load` fires, because `Nn.current` is set in that handler; before that the loop spins without commits. |
| body fade delays FCP (05) | 4.2 s -> 0.89 s | `/` mobile profile: FCP **3,764-4,292 ms** deployed vs **744-1,148 ms** with `site-nav.css:12` removed. |
| LCP element (04) | 104,562 px2 at 9.7-10.1 s | LCP entry size **104,562 px2** at **10,140-10,580 ms** (first-visit and returning-visitor runs, and still present after the body-fade fix). |
| First-visit SW reload (06) | 2nd navigation 4,555 ms, 76 /data, LCP ~10 s | Real SW, cold profile: 2nd main-frame navigation at **4,641 ms**, **76** `/data` requests, second-load LCP **5,624 ms** (about 10.3 s absolute). |
| Roster nodes (09) | +4,989 nodes | 504 -> 5,493 = **+4,989** (exact). INP-proxy in my run 424 ms (report 680); still Poor. |
| Pin glow (14) | 594 recalcs/10 s | Map idle: 592-610 per 10 s; `search.html` idle: **601** per 10 s; with glow disabled (+KF patched) **0** recalcs and 1 ms task time per 10 s. |
| PeerJS TBT (12) | LoAF 1,211 ms; TBT 1,626 | LoAF `peerjs.min.js` **1,080 ms**; TBT 1,248 ms vs 247 ms with peerjs blocked; FCP 4.36 s vs 3.36 s. |
| Data facts (07/10) | 1,804 placements, 478 ids, 188 ticks, median 7 / p90 18 / max 87 | Exact match. |
| Mapbox sizes (11) | 1,796,551 / 385,039 br; v2.15.0 985,978 | Exact match (unpkg meta + `curl` br transfer 385,039; `Cache-Control: max-age=31536000`). |
| Data literals (27) | `_A` 110,936; `d2` 16,494; `th` 14,027 | 110,937 / 16,495 / 14,028 (bracket-matched in `bundle.min.js`). |
| Cache headers (25) | site-nav.* `max-age=0,must-revalidate`; /data `max-age=3600` | Exact match live. |
| Playback A/B (10, 21), re-run with valid tiles | 11.4 -> 17.8 -> 59.3 fps (cumulative) | 8x @4x, desktop, satellite tiles 200: base **13.6 fps**; KF+clock patched **11.9**; no backdrop/blend only **19.6**; skip `lS` only **31.1**; both **57.9** (p50 16.7 ms, 0 frames > 100 ms). |

### Verdict table

| ID | Verdict | Notes |
|---|---|---|
| 01 | CORRECTED | Evidence and root cause reproduced independently. The fix as written is incomplete: the canvas `onClick` (97367-97376) also gates the Distance tool via `window.__gtbgApp._gbDist(ev)`; `_gbDist` (112758-112760) does `ev.target.getBoundingClientRect()` and `m.unproject`, which only works for a canvas click event. Deleting the onClick or switching to `map.on('click')` without adapting `_gbDist` (accept `e.point`/`e.lngLat`) kills the Distance tool or throws a TypeError outside its try. Also gate map-click picking on the Toggle Units flag (`_uv`, 97354-97358) or hidden units become selectable, and keep the rotate/pitch decision explicit (canvas icons ignore map bearing). |
| 02 | CORRECTED | Bug, mechanism and numbers confirmed (59 commits/s in my run). Corrections: (a) XF's `kt.flyTo` is at **100330-100334**, not 100852/100884 (those are KF); XF's `kt && kt.flyTo(...)` guard does not help because the ref object is truthy, so the TypeError aborts before `Kx()` and `yn.setState({isPlaying:true...})` (NPS tour never starts). (b) Zk's `Xe.flyTo` (101107) is currently masked by the C5 `setGoldUnit` ReferenceError at 101086 which throws first; fixing C5 alone will expose the ref-of-ref TypeError, so C5 and patch D must ship together. (c) The proposed test "`window.onerror` count == 0" cannot detect the KF bug because the throw is inside `try{}catch{}`; use idle commits/s == 0, or assert `typeof mapRef.current.project === "function"`, or CDP pause-on-caught-exception. (d) Local idle commit rate is rAF-rate dependent (45-60/s). |
| 03 | CONFIRMED | 26 `yn()` call lines (report lists 25 sites; 112940 and 112961 are both in `AO`), 0 selectors, 0 `memo`; store is plain `create` (9361). zustand `setState` always creates a new state object so unchanged writes still notify. |
| 04 | CONFIRMED | Code 101471-101505 as cited; LCP element size 104,562 px2 reproduced. Clarification: LCP keeps the largest painted candidate, so "keep a static, large LCP anchor" alone cannot fix it (my run with the body fade removed: static text LCP 744 ms at 74,592 px2 is superseded by the 104,562 px2 story panel at 10.1 s). The story/toast panels must be gated (not painted) during boot; that gate is the fix. |
| 05 | CONFIRMED | Reproduced (FCP 3.8-4.3 s -> 0.74-1.15 s on `/`). Scope: the benefit is on `/`; sub-pages gain 0.15-0.45 s (search 948 -> 508 ms, historian 664 -> 508) and map sub-pages gain nothing (compare 3,272 vs 3,712 ms, the blocking Mapbox script dominates). The fix alone leaves LCP at about 10.1 s (needs 04). |
| 06 | CONFIRMED | Reproduced within 2 percent. Add to the fix: when the auto-reload goes, add a `vite:preloadError` / dynamic-import catch (reload or toast), because an old page controlled by a new SW will request old hashed chunks (`HelpModal-*`, `BookmarkPanel-*`) that no longer exist after a deploy. |
| 07 | CONFIRMED | 96769 and 97522 both fetch `commander_successions.json`; `zp` (96900) has no in-flight de-dupe; mobile `zp(1..3)` 103040-103042 and 3 chronology fetches 102958-102960. Data sizes match. |
| 08 | CORRECTED | Evidence confirmed (113071 `Zn !== "mobile"` is true for null; `gF` creates the map under the chooser). Effort L is understated for "one MapStage reused by both layouts and Walkthrough" inside a minified bundle with no source (realistically XL, or L only after N1 source reconstruction). A cheaper interim exists but is not S: many shell components (`IO`, `KF`, `CF`, `LF`, `_F`, `MF`, 113242-113283) render regardless of layout, and `KF/XF/Zk` read `Nn.current`. |
| 09 | CONFIRMED | +4,989 nodes exact. Note `Jk`'s two sorted arrays are already `useMemo`'d on `[M]` (102665-102679); fix item (3) applies to `Xk` (102345-102350, un-memoized) and `pO` (103127-103131) only. |
| 10 | CORRECTED | `updateData`/`dynamic` at 59674-59711 verified; reference-page flaws verified (`pulseTick` rAF + `setPaintProperty`, `setData` per frame at lines 215-216, 223-234). Corrections: (a) "11.4 -> 59.3 fps by skipping `lS`" is cumulative with removing blur/blend; skipping `lS` alone gives about 31 fps and removing blur/blend alone about 20 fps (both needed for about 58; verified with tiles loading). (b) "median 7 / p90 18 / max 87 changed units per tick" holds only for today's sparse keyframe semantics (units are static between keyframes); finding 16's real interpolation moves every in-transit unit each frame (up to about 478), so the `updateData` payload and worker re-tile cost must be re-benchmarked at 478 features x 15 Hz before committing to the architecture (or use the CustomLayer / typed-array path). |
| 11 | CORRECTED | Facts exact (9 pages incl. the dev page `unit-rendering-reference.html`; sizes; cache header). Fix step (2) `<script defer>` would break all 8 product map pages: every page runs an inline IIFE that sets `mapboxgl.accessToken` as its first statement at parse time (`compare.html:98`, `camera.html:65`, `sandbox.html:72`, ...), so it must be wrapped in `DOMContentLoaded` or moved to a deferred file at the same time. Sharing one cache entry between app and sub-pages requires both to load the same URL in the same format: the app must use the UMD global (alias/external) or both must use the ESM entry (`dist/esm/mapbox-gl.js` exists in 3.24.1); an import map pointed at the UMD file will not work. |
| 12 | CONFIRMED | Reproduced (1,080 ms). Caveat: moving `new Peer` to the Host/Join click shifts the roughly 1 s script cost onto that click (INP); set the "Connecting..." state, yield to paint, then load, or load at idle after LCP. |
| 13 | CONFIRMED | 97415-97448 as cited; `sT()` double-count (96976 + 97419) means the `<55 fps` text actually shows only when real fps is below about 27. |
| 14 | CONFIRMED | site-nav.css:41 and 48-51; reproduced on the map and on a sub-page. |
| 15 | CONFIRMED | 96977-96986 as cited. Minor: "5 min hidden = instant end" needs a starting tick of at least about 75 at 1x (600 ticks in 300 s). |
| 16 | CONFIRMED | `const i2 = {}` at 96265, merged in `y1` 96271-96296, never cleared. |
| 17 | CONFIRMED | `lS` structure, `getBoundingClientRect`, `shadowBlur`, `measureText`, `K4 getImageData` (96706-96710) all present. |
| 18 | CORRECTED | Two `y1` passes per tick on desktop (`e1` at 97046 via the effect at 97318, plus the index effect at 97324), or `Ed` + index effect while playing; not three. Fix unchanged. |
| 19 | CONFIRMED | 112294-112303, 103184-103189. |
| 20 | CONFIRMED | `iO` listens on the map container div (dead today); `fF` receives `{map,canvas}` and returns null. |
| 21 | CONFIRMED | 20 `backdropFilter` occurrences; `mix-blend-mode` is inside the `A4` cssText string (9895), so grep for `mixBlendMode` finds 0. Notes: the `drop-shadow` at 100911 belongs to monument markers that never render today (`z` is always `{}`), so it has no current cost; the interim CSS turns `multiply` into `normal`, which visibly changes the day/night tint and needs a look. |
| 22 | CORRECTED | Six inline overlay scripts (lines 294, 355, 398, 441, 521, 608), not seven. Cited line numbers 369, 411, 476-482, 599-602 verified. |
| 23 | CORRECTED | Options and `performanceMetricsCollection` default (91907) verified; 4 `events.mapbox.com` POSTs verified (`style.load`, `appUserTurnstile`, `gljs.performance`, `map.load`). `performanceMetricsCollection:false` removes only `gljs.performance` (4 -> 3); the other three remain. The acceptance "<= 1 request (or 0)" is not achievable by configuration. |
| 24 | CONFIRMED | `GF` (99644) passes `(selector, listener)` to plain `subscribe`; the first argument is treated as the listener and never used, so the tick stays at its initial value. |
| 25 | CONFIRMED | Duplicate fetch lines and live headers verified. |
| 26 | CONFIRMED | 98252-98292, 98595-98610. |
| 27 | CONFIRMED | Sizes within 1 byte. |
| 28 | CONFIRMED | `pt.lazy(() => rT(() => import(...), []))` (112469-112470), empty preload deps, `fallback: null`; chunk sizes 7,027 / 4,869 B; `InterpolationWorker` (672 B) unreferenced in all deployed files. |
| 29 | CONFIRMED | Iframe at 110660-110669; `dangerouslySetInnerHTML` is at 110653 (report says 110637); "about 1 MB of Google embed JS" is an unverified estimate. |
| 30 | CONFIRMED | `ground-remembers.html:64-70` awaits 9 fetches before `new mapboxgl.Map`; `setData(geojsonThroughTick())` per input and per 90 ms interval; features carry no `tick` property (the fix must add it). |
| 31 | CONFIRMED | `compare.html:133` (Promise.all before map), 242-247 (setData per slider input); camera/immersive `setInterval` + `setData`; cinematic-export `setData` inside rAF. The "two maps" count was not separately verified. |
| 32 | CONFIRMED | `search.html:151` renders per keystroke with no debounce; `innerHTML` at 194. Request counts not re-measured. |
| 33 | UNVERIFIABLE | Architecture proposal; the arithmetic (20k x 384 int8 = 7.68 MB) is right; budgets are targets, not measurements. |
| 34 | CONFIRMED | Zero hits for `devicePixelRatio`, `matchMedia`, `prefers-reduced-motion`, `deviceMemory`, `hardwareConcurrency`, `saveData` in app code (>96000) and 0 reduced-motion rules in `index-B4G7Z_2G.css`. |
| 35 | CONFIRMED | No `no-store` on HTML (live headers); the netlify.toml comment confirms the bfcache intent. Add: with a future enforcing CSP that drops `unsafe-inline`, inline `<script type="speculationrules">` needs `'inline-speculation-rules'` (or a hash/nonce), or use an external rules file via the `Speculation-Rules` header (MDN CSP docs). |
| 36 | UNVERIFIABLE | CPU-profile figures not re-run; consistent with what I saw (module eval, React mount, Map constructor). |
| 37 | CONFIRMED (partial) | Verified: no source maps (0 `sourceMappingURL`). The rest is a proposal. |
| 38 | CONFIRMED | `GtbgLoc` effect deps `[active]` reads `yn.getState().mapRef` once (112573-112577, 112673); Escape guard at 112967. |
| 39 | CORRECTED | Anchors A, B, D and the desktop canvas string each occur exactly once in `assets/index-Cg8FAMXN.js` (verified by count). Corrections: J (`defer` on the Mapbox script) is not a plain-file one-liner, see finding 11 (wrap inline scripts or all 8 pages throw `mapboxgl is not defined`); C needs the `_gbDist` adapter (finding 01); A+D must ship with the C5 `setGoldUnit` fix, else Ancestor fly-to still throws; G (remove reload) needs the chunk-error handler (finding 06). |

### Missed issues (in scope, not in the report)

1. **Fix 01 regresses the Distance tool and unit-hidden gating (high).** See verdict 01: `window.__gtbgApp._gbDist(ev)` (97370, 112758) depends on the canvas click event; `map.on('click')` must pass a compatible object or `_gbDist` must accept `lngLat`. Also gate picking on `showUnits` / `_uv`.
2. **Cost model inconsistency between findings 10 and 16 (medium).** The sparse "median 7 changed units" no longer holds once 16's true interpolation ships; benchmark `updateData` with 478 features at 15 Hz (worker re-tile) or choose the CustomLayer path first.
3. **Methodology caveat plus cross-report conflict on the Mapbox token (medium).** Satellite tile requests return 403 when the Referer is not the production domain (curl: tile 200 with `https://gettysburginteractivemap.com/`, 403 with `http://127.0.0.1:8911/` and `https://evil.example/`), while the style API returns 200 for all. So every LOCAL lab run in the report had errored tiles. I re-ran the playback A/B with a valid Referer injected for `api.mapbox.com/v4` only: conclusions hold (13.6 vs 13.0 fps base), but see verdict 10 for the corrected attribution. It also means audit item X1 ("token unrestricted, 200 to a foreign Referer") is only true for the styles endpoint; tiles are referrer-restricted. Whoever owns security/X1 should reconcile.
4. **The FCP fix does not move LCP; the static-anchor advice is wrong (medium).** Verified: after deleting the body animation, LCP is still about 10.1 s (104,562 px2 story paragraph beats the 74,592 px2 static text). Plan the FCP change and the boot-panel gating (04) as one acceptance unit and do not rely on a "large static LCP anchor".
5. **SW `/data/` handler caches error responses (low/medium).** `sw.js:63-66` calls `cache.put` without checking `res.ok`; a transient 404/500 is stored and later served offline via `caches.match`. Fold into finding 06: cache only `res.ok`, never `Vary:*` or 206.
6. **Removing the auto-reload needs a version-skew handler (medium).** See verdict 06: add `vite:preloadError` / import() `.catch` to reload or toast; otherwise Help/Bookmarks (`rT(..., [])`, no preload) fail on an old page after a deploy.
7. **Speculation Rules vs CSP (low).** See verdict 35: inline rules need `'inline-speculation-rules'`, a hash or a nonce once `unsafe-inline` is removed (X3), or use an external rules file.
8. **Report-internal citation errors (low).** XF `flyTo` lines (100330-100334, not 100852/100884), `dangerouslySetInnerHTML` (110653, not 110637), script count (six, not seven), `yn()` sites (26 lines). Numbers are unaffected; fix the references before they go into tickets.
