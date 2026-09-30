# pages-B report — documentary, education, aftermath, sandbox, viewshed, regiment, ground-remembers

Specialist: pages-B. Date: 2026-09-29/30. Mode: read-only, no build, no deploy. Everything below is a plan; nothing was changed in DEPLOY_DIR/SRC_DIR.

## 0. How to read this (method, evidence, confidence)

- **Files read in full** (DEPLOY_DIR = `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy`, byte-identical to SRC_DIR): `documentary.html` (112 lines), `education.html` (100), `aftermath.html` (73), `sandbox.html` (237), `viewshed.html` (133), `regiment.html` (261), `ground-remembers.html` (142), plus the shared `site-nav.js` (237 lines), `site-nav.css` (152), `netlify.toml`, `sw.js`, and every `data/*.json` those pages fetch (vignettes 3, placements 9, oob 8 (+6 more OOB files), terrain, chronology 3, density 38, casualty_apportionment).
- Line citations are `file:line` in DEPLOY_DIR files. `bundle.pretty.js:N` means the prettier-formatted deployed bundle in PLAN_WORK.
- **Scripts/measurements I ran** (all read-only; scripts in `plan-work/tmp-pages-B/`): contrast math (`contrast.py`), chronology/tick drift analysis (`timetable.py`), data-integrity joins (inline python), a heat-weighting experiment, and a **3DEP feasibility prototype** (`demlib.py`, `check2.py`, `vs.py`, `vs.js`, `sizes.py`): I pulled the USGS 3DEP bare-earth DEM for the battlefield bbox from USGS's public `3DEPElevation/ImageServer` (no key) and the USGS EPQS point service, validated my pixel mapping against EPQS to within 1 ft, sampled all 30 `terrain.json` key locations, timed a ray-cast viewshed in numpy and in Node/V8, and measured compressed DEM payload sizes. I also fetched public Mapbox/USGS/NPS documentation pages via WebFetch/WebSearch (quoted as summaries; see section 6.8 caveats). curl was used against the live site and public asset hosts only. No browser tools were used (per BRIEF), so **nothing here was verified by running the pages**: DOM/CSS/layout claims come from code reading and are labelled "verify visually" where the risk is non-trivial.
- **Confidence tags**: [V] verified by data/code/measurement; [C] confident from code reading; [U] uncertain / needs a visual or runtime check.
- New finding IDs are `pagesB-NN`. `audit_refs` use BRIEF IDs. Items with no audit ref are new.

## 1. Executive summary

These seven pages are small (2.3-4.7 KB brotli HTML each, TTFB 0.10-0.23 s on the live site [V: curl]), so the static ones should trivially reach Lighthouse 100 and green CWV. What holds them back is not weight but **correctness, content depth, accessibility semantics, and three structural problems**:

1. **Every "See it on the map" deep link from these pages is dead [V, critical, new].** Documentary (`documentary.html:92`), Students (`education.html:81`) and Regimental Biography (`regiment.html:247`) emit `/index.html?tick=..&vignette=..` and `/?unit=..&tick=..`. A grep of the deployed bundle and `index.html` shows the only URL-query reader in the whole app is `?ancestor=` (`bundle.pretty.js:101019`). The bookmark writer emits a *different* scheme (`t,u,z,ll`, `bundle.pretty.js:97822-97830`) that nothing reads either. Same in the Jun 13 and Jul 20 deploys. Three other pages (search, turning-points, historian) emit the same dead links.
2. **Three map pages block first paint on a 1.8 MB / 481 KB-gzip synchronous Mapbox script [V]** (`sandbox.html:20`, `viewshed.html:20`, `ground-remembers.html:16`), start their data fetch waterfall only after it runs, and (Ground) create the map only after the data arrives (`ground-remembers.html:64-73`). That is S2 ("blank ~3 s") and it blanks the whole page, not just the map.
3. **The time model is duplicated and contradictory [V].** Four different tick-to-clock formulas exist in the deploy (map store: Day 1 starts 6:00, Days 2-3 start 4:00; two panels: 5:00 and `July ${day+2}`; chronology data: 5:00, but its labels drift from -230 to +15 min against its own stated formula). The Sandbox's three scenario labels are wrong against the data by clock *and* by event order (section 3.4). Full drift tables in section 3.

Other high-impact, verified defects:
- Documentary renders every 200-375 word narrative as **one paragraph** (24/24 scripts contain `\n\n`, avg 10.4 paragraphs; CSS has no `white-space` rule; `documentary.html:34,91`).
- Regimental Biography "Mentioned in the battle's narrative moments" works for **1 of 467** regiments because it substring-matches the full designation ("20th maine volunteer infantry") against prose; even the 20th Maine shows "No narrative vignette specifically names this unit" (`regiment.html:228-233`). The timeline is empty for **444 of 467** units although **422 of those have brigade-level placements** (only 23 regiments have their own; `regiment.html:210`). The 103 artillery/horse-artillery batteries in `data/oob/union_artillery.json`, `confederate_artillery.json` and the `horse_artillery` keys are never loaded despite "any regiment or battery" (`regiment.html:66,137`).
- Sandbox: the edit panel is `position:absolute` but is a sibling of `#map` and is positioned with map-local pixels, so it renders about a header-height above the clicked unit (`sandbox.html:37,62-63,192-193`) [C]. Dragging is `mousedown`-only (no touch, no keyboard; WCAG 2.5.7/2.1.1) (`sandbox.html:167`). The disposition dropdown changes nothing visible and mis-displays 3 dispositions that exist in the data.
- Viewshed: `terrain.json` coordinates and elevations disagree with USGS 3DEP: **mean absolute error 62 ft, 21/30 locations >25 ft off, 13/30 >50 ft off; "Big Round Top" coordinates sit 365 m from the summit and sample at 584 ft vs the listed 785 ft [V]**. A real client-side viewshed is very feasible: 5-10 m DEM = **0.54-1.65 MB** as terrain-RGB PNG, ray-cast in **44-240 ms** in Node/V8 (numpy 0.35-0.42 s) for R=3-5 km. Mapbox's own terrain-DEM must not be used as computation input (SDK-only, derivative-data restriction, per docs summary, verify); USGS 3DEP is public domain.
- Ground Remembers' heat is keyframe *authoring density*, not fighting: 145/694 keyframes are Bivouac/March/Limbered/Reserve, and swapping naive count for duration-weighted engaged strength changes the top hotspot from The Angle to Culp's Hill.
- `og:image`/`twitter:image` on all seven pages (and the PWA screenshots) is `/screenshots/day3.png`, which is **a malformed PNG** (IHDR says RGB, but pixel data is RGBA-sized: inflated 3,687,120 B vs 2,765,520 B expected; Pillow refuses to decode it) and is byte-identical to `day1.png` [V]. Social previews probably show no image.

### 1.1 Suggested order of work for these pages (solo-dev estimates)

| Wave | Items | Why first |
|---|---|---|
| 0 (day 1) | pagesB-34 (rename/soften Viewshed copy+meta), 14 (paragraph fix), 10 (delete dev-log copy), 26 (panel CSS), 28 (sandbox labels), 03 (error states), 09 (fix og:image) | tiny diffs, remove the most credibility-damaging items |
| 1 (week 1) | 01 (URL contract; needs app patch), 02+49 (map loading), 05 (time-model module), 12 (shell/tokens/sticky footer), 06 (CLS), 07/08 (a11y/targets/contrast) | unblocks everything else; moves LCP/CLS/A11y |
| 2 (weeks 2-3) | 42-46 (Regiment), 50-51 (Ground heat), 27/29/30/32 (Sandbox), 15-17 (Documentary), 20-22 (Students) | function + UX |
| 3 (weeks 3-6) | 35-38 (DEM pipeline + real viewshed), 47 (prerender), 24 (Aftermath content), 13 (tests/CI) | depth + SEO + regression safety |
| 4 (ongoing) | 39 (obstruction layers/validation), 40 (3D first-person), 18/23/33/48 (feature completions) | A+ polish |

### 1.2 Page inventory (dependencies, data, landmarks, SEO tags) [V from the HTML]

| Page | Lines | Mapbox (version / origin / style) | Data fetches | Landmarks | Social tags | Palette | Findings |
|---|---|---|---|---|---|---|---|
| documentary | 112 | none | 3 (`vignettes_part1-3`) | `main`, `h1`, no `h2` | og + twitter | dark navy/gold | 14-19 |
| education | 100 | none | 3 (same) | `main`, `h1` | og + twitter | **blue `#0a3a6a`** | 20-23 |
| aftermath | 73 | none | 0 | `main`, `h1` | og + twitter | dark navy/gold | 24-25 |
| sandbox | 237 | GL JS **3.24.1**, `api.mapbox.com` CDN, **sync in head**, `satellite-v9`, token inline (`:71`) | 9 placements | **no `main`**, `h1` | og + twitter | dark navy/gold | 26-33 |
| viewshed | 133 | GL JS 3.24.1, CDN, sync in head, `satellite-v9`, token inline (`:57`) | 1 (`terrain.json`) | **no `main`**, `h1` | og + twitter | dark navy/gold | 34-41 |
| regiment | 261 | none | **20** (8 OOB + 9 placements + 3 vignettes) | `main`, `h1`, one `h2` | **og only** | dark navy/gold | 42-48 |
| ground-remembers | 142 | GL JS 3.24.1, CDN, sync in head, `dark-v11`, token inline (`:56`) | 9 placements | **no `main`**, `h1` | **og only** | dark navy/gold | 49-52 |

All seven: shared `site-nav.css` (render-blocking `<link>`) and `site-nav.js` (15.8 KB raw, end of body), no `aria-*`, no skip link, no JSON-LD, no `<noscript>`, no preconnect, no reduced-motion rules of their own, `og:image` = the malformed `day3.png`. CSP is Report-Only (`netlify.toml:19`): the Mapbox origins these pages use (`api.mapbox.com` script/style/connect, `events.mapbox.com`, `blob:` workers, `data:/blob:` images) are all allowed, and the DEM/worker plan in section 6 stays within `'self'` + `blob:` so it needs no CSP change.

## 2. Cross-page findings (apply to all or most of the seven pages)

### pagesB-01 — Deep links from these pages into the map are dead (critical) [V for "no reader"; U for user-visible behaviour until run once]
- **Evidence.** Emitters: `documentary.html:92` `/index.html?tick=${v.trigger_tick}&vignette=${encodeURIComponent(v.vignette_id)}`; `education.html:81` same; `regiment.html:247` `/?unit=${..}&tick=${firstTick}`. Also emitted by `search.html` (`/index.html?tick=..&vignette=..`, `?unit=`, `?lat=&lng=`), `turning-points.html` (`/?tick=`), `historian.html` (`/?tick=..&vignette=..`) (grep of the deploy). Readers: `assets/index-cg8famxn.js` has 6 `URLSearchParams` uses; the only *reader* of `location.search` is `bundle.pretty.js:101019` (`get("ancestor")`); `bundle.pretty.js:11469-11478` are Mapbox internals; `bundle.pretty.js:97822-97830` (`$k`) only *writes* `?t=&u=&z=&ll=` for bookmark share links. The `get("vignette")` hits in the bundle are Mapbox feature properties. No reader for `tick|unit|vignette|t|u|lat|lng` in `index.html` either. The Jun 13 (`deploy-6a2da5d2972fd3fb2b7ed72e`) and Jul 20 (`deploy-6a3a0355a036dd8d9892e747`) deploys show the same absence.
- **Root cause.** The pages were built against an assumed URL contract the app never implemented; the app's own share links use a second contract that is also unread.
- **Fix.**
  1. Define **URL contract v1** (one place, documented in the user guide): `/?tick=<1..675>&day=<1..3>&unit=<id>&vignette=<V-###>&lat=&lng=&z=`; accept legacy `t,u,z,ll` as aliases so existing bookmark links start working.
  2. App side (owned by the app agents; I only specify): on boot parse once, before the onboarding splash: set store `currentTick` (`bundle.pretty.js:9362` initial state is `currentTick: 1`), select the unit, open the vignette card, fly to `lat/lng/z`, and **skip the splash/layout-chooser when a deep link is present** (H3). Minimal patch without source: replace the literal initial `currentTick: 1,` at store creation with `currentTick: __gtbgInitialTick(),` and add a ~20-line inline pre-script in `index.html` that defines it and stashes `unit/vignette` in `window.__gtbgBoot` for the first effect to consume. Long-term: rebuild from source (N1) with a `useUrlState()` hook.
  3. My pages: never hand-build query strings. Add `/js/links.js`: `export const mapLink = ({tick, unit, vignette, lat, lng, z}) => ...` and use it from all seven pages so a contract change is a one-file edit.
- **Effort** M (app patch) + S (my pages). **Depends on** the app patch. **Acceptance:** Playwright: open `/?tick=300` -> header clock shows `TimeModel.label(300)`, no splash; open Documentary card 10 -> "Watch this moment" -> map shows that vignette card open at that tick. **Moves:** Function/UX. **audit_refs:** [] (new).

### pagesB-02 — Render-blocking Mapbox GL JS + serial waterfall on sandbox/viewshed/ground-remembers (high) [V sizes, C ordering]
- **Evidence.** `sandbox.html:19-20`, `viewshed.html:19-20`, `ground-remembers.html:15-16`: `<link rel=stylesheet mapbox-gl.css>` and a synchronous `<script src=".../v3.24.1/mapbox-gl.js">` in `<head>`. curl: JS 481,197 B gzip / 1,796,551 B raw, `Cache-Control: max-age=31536000`; CSS 5,518 B gzip. Under Lighthouse-mobile Slow-4G (1.6 Mbps, 150 ms RTT) 481 KB alone is ~2.4 s + RTT, then ~1.8 MB parse/compile: FCP >= ~3 s cold for a page whose own HTML is 3-5 KB. The inline IIFEs start `fetch()` only when they execute (after the script). `ground-remembers.html:64-73` creates the map only after all 9 fetches resolve; `map.on('load')` then adds the source (`:88-89`).
- **Root cause.** Parser-blocking script in head; data fetch serialised behind it; map created after data; no placeholder.
- **Fix (shared `/js/map-loader.js`, ~40 lines).**
  ```html
  <link rel="preconnect" href="https://api.mapbox.com" crossorigin>
  <link rel="dns-prefetch" href="https://events.mapbox.com">
  <!-- preload the script only if the map is above the fold; remove the sync <script> -->
  <link rel="preload" as="script" href="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js" crossorigin>
  ```
  ```js
  export function loadMapbox(){            // memoised
    return window.mapboxgl ? Promise.resolve(mapboxgl) : (loadMapbox.p ||= new Promise((res,rej)=>{
      const s=document.createElement('script'); s.src=MAPBOX_JS; s.async=true; s.onload=()=>res(window.mapboxgl); s.onerror=rej; document.head.append(s);
      const l=document.createElement('link'); l.rel='stylesheet'; l.href=MAPBOX_CSS; document.head.append(l);
    }));
  }
  ```
  Start data fetches at the top of `<body>` and run them **in parallel** with the script (`Promise.all([loadMapbox(), loadData()])`); construct the map as soon as the script is ready and add the layer when both are ready. Render a **map skeleton** (fixed-height box, CSS shimmer, `aria-busy="true"`, "Loading map...") and remove it on `map.once('idle')`. For stable Lighthouse TBT do not construct the map in the first task after load: use `requestIdleCallback` (timeout 2500 ms) or first pointer/scroll/keydown (facade), whichever comes first; preload on `pointerenter/touchstart` of the facade. Set `cooperativeGestures: true` on **viewshed** and **ground-remembers** so a one-finger scroll on a phone is not trapped by a 60vh map (Sandbox keeps normal gestures with an explicit "Lock map / Edit units" toggle).
- **Effort** S-M. **Acceptance:** Lighthouse mobile on each page: FCP <= 1.8 s, LCP <= 2.5 s (LCP element = h1/sub text or poster, not the map canvas), TBT <= 200 ms, CLS <= 0.1; filmstrip shows header text painted before mapbox-gl.js completes. **Moves:** Performance (mobile), S2. **audit_refs:** [S2, P4, P2 partly].

### pagesB-03 — No error, retry, empty or offline state on any data fetch (high) [C]
- **Evidence.** `documentary.html:70-72`, `education.html:65-67`, `regiment.html:131-135`, `sandbox.html:85`, `ground-remembers.html:64`, `viewshed.html:60`: `await Promise.all(files.map(f => fetch(...).then(r => r.json())))` with no `r.ok` check and no `try/catch`. One 404/500/parse error or an offline load leaves "Loading..." forever with an unhandled rejection (`regiment.html:73` "Loading order of battle..." never resolves). `sw.js` handles `/data/` network-first with cache fallback, so offline only works for previously visited files.
- **Fix.** `/js/data.js`:
  ```js
  export async function loadJSON(url,{retries=2,timeout=8000}={}){
    for(let i=0;;i++){ try{ const c=new AbortController(); const t=setTimeout(()=>c.abort(),timeout);
      const r=await fetch(url,{signal:c.signal}); clearTimeout(t); if(!r.ok) throw new Error(r.status); return await r.json(); }
      catch(e){ if(i>=retries) throw e; await new Promise(r=>setTimeout(r,400*2**i)); } }
  }
  export function showError(el,msg,retry){ /* role="alert", message, 44px "Try again" button */ }
  ```
  Every page wraps boot in `try { ... } catch (e) { showError(...) }`; add `<noscript>` fallbacks once the prerender exists (pagesB-47). Empty states: Regiment "no match" row; Sandbox "no units recorded at this moment"; Viewshed/Ground "map failed to load" wired to `map.on('error')`.
- **Effort** S. **Acceptance:** Playwright `route.abort()` on one data file -> visible alert with Retry and no uncaught error; offline reload of a visited page works. **Moves:** Reliability. **audit_refs:** [].

### pagesB-04 — Request fan-out, data bundling, cache/SW strategy (medium) [V counts]
- **Evidence.** Fetch counts: documentary 3, education 3, sandbox 9, ground 9, regiment **20** (8 OOB + 9 placements + 3 vignettes), viewshed 1. Live sizes are tiny (vignettes_part1 7,013 B br; an OOB file 5,854 B; a placement file 2,621 B), so the cost is request count/latency and SW overhead: `sw.js` routes `/data/*` through a network-first handler that also `cache.put`s every response. `netlify.toml:28-30` gives `/data/*` `max-age=3600` with no `stale-while-revalidate` and no hashed names.
- **Fix.** A build step emits `data/vignettes.all.json`, `data/placements.all.json`, `data/oob.all.json` (+ `names.json`, pagesB-53) with content hashes (`/data/v/<hash>/...`) and a tiny `data/manifest.json`; `Cache-Control: public, max-age=31536000, immutable` for hashed files, `max-age=0, must-revalidate` for the manifest; SW: stale-while-revalidate for `/data/v/*`. Regiment fetches `oob.all.json` (~180 KB raw) first and lazy-loads placements/vignettes on the first selection. Keep the per-file originals until the main app migrates.
- **Effort** M. **Acceptance:** regiment page <= 2 data requests before first interaction; repeat visit = 0 network data requests. **Moves:** Performance/Reliability. **audit_refs:** [P3].

### pagesB-05 — Adopt a single shared time model (high) [V]
- The seven pages contain their own tick logic (table in section 3.1). Replace with `/js/time-model.js` (spec in section 3.5) so pages, map, Compare, Living Ledger and Historian cannot drift. **Effort** M for the module + adoption on my pages; the *data re-anchoring* is a separate XL owned by the time-model specialist. **audit_refs:** [C3, C4, H9].

### pagesB-06 — Layout-shift risk: placeholders replaced by taller content, footer jumps, nav mount (medium) [C/U]
- **Evidence.** `documentary.html:52-53`, `education.html:52-53`, `regiment.html:73` swap a ~100 px "Loading..." block for 600+ px of content while the shared footer (`site-nav.css:127-135`) is on screen on phones, so the footer (and anything below) shifts. `viewshed.html:53` `#ranking` (30 rows) is injected after map `load`. `site-nav.js:161-171` replaces the empty `#gtbg-nav-mount` (0 px) with a ~57 px sticky nav at DOMContentLoaded (`site-nav.js:232-236`), usually before first paint but not guaranteed. RUM says CLS is Poor site-wide.
- **Fix.** `#gtbg-nav-mount{min-height:57px}`; `main{min-height:calc(100dvh - 57px - 140px)}` (also fixes S1's floating footer, pagesB-12); skeleton blocks with final height; render `#ranking` from the terrain JSON before the map loads; explicit `aspect-ratio` on any poster image. **Effort** S. **Acceptance:** Lighthouse CLS <= 0.02 per page (mobile); Playwright `PerformanceObserver('layout-shift')` sum <= 0.05. **Moves:** CLS. **audit_refs:** [P1].

### pagesB-07 — Accessibility baseline missing on all seven pages (high) [V counts via grep]
- **Evidence.** Zero `aria-*` attributes on any of the seven pages; no skip link; no `<main>` on sandbox, viewshed, ground-remembers; documentary/education/aftermath use `<div>` for moment/story/event titles (no `h2`); Mapbox containers have no accessible name or text alternative (`sandbox.html:62`, `viewshed.html:52`, `ground-remembers.html:52`); tab-like buttons expose state only by colour (`education.html:48-50`); dynamic changes are silent (no live regions); `regiment.html:70-71` search has no label/combobox semantics; smooth scrolling ignores `prefers-reduced-motion` (`documentary.html:96`, `regiment.html:248`); zero `prefers-reduced-motion` rules in page CSS (only `site-nav.css:14,53,82`).
- **Fix (each page).** `<a class="skip" href="#main">`, `<main id="main" tabindex="-1">`; heading outline h1 -> h2 (moment/day/regiment) -> h3; maps get `role="region"` + `aria-label` plus a **text/table equivalent** (Viewshed: the ranked list; Ground: hotspot list; Sandbox: unit table with move controls); `aria-live="polite"` status region ("Moment 3 of 24: ..."); tabs -> `role="tablist"/"tab"/"tabpanel"` (roving tabindex) or `aria-pressed` toggles; combobox pattern for search (pagesB-46); wrap smooth scrolling in a reduced-motion check. Automated gate: axe-core wcag2a/2aa/22aa = 0 violations in CI (pagesB-13). **Effort** M. **Moves:** Accessibility (C -> A). **audit_refs:** [A1-A6, D2].

### pagesB-08 — Touch targets, type sizes and contrast on these pages (medium) [V contrast math; C sizes]
- **Contrast (AA 4.5:1 normal text), computed:** footer text `#6f7686` on `#0a0a14` = **4.32** (`site-nav.css:129`); on Students' blue `#0a3a6a` = **2.53**, footer links `#8a93a8` = **3.73** (theme clash, pagesB-20); nav group subtitle `.gtbg-group-why` `#6f7686` on `#12121e` = **4.08** (`site-nav.css:96`); Sandbox `.hint` `#777` on panel = **4.15** (`sandbox.html:41`), controls hint `#777` = **4.15** (`:60`), empty change list `#666` = **3.43** (`:66`), change timestamp `#555` = **2.64** (`:219`); Regiment `.match-row:hover/:focus-visible` `#1a3a7a` with muted `.side-tag` `#8a93a8` = **3.53** (`regiment.html:31-32`); nav card hover/focus description `#8a93a8` on `#1a3a7a` = **3.53** (`site-nav.css:110,124`; hover turns it white, keyboard focus does not). Documentary disabled buttons (opacity .3) are exempt.
- **Sizes/targets (BRIEF: >=44 px touch, text >=12 px):** `.nav-btn` (`documentary.html:36`, 13 px font, 10/18 px padding, ~37 px tall); Sandbox `.btn` 7/14 px (~33 px); Ground `.play-btn` 7/16 px (~33 px) with a 220 px range input at default thumb size; Regiment `.match-row` 10 px padding + 13 px text (~36 px); back links 12-14 px text with no padding (`documentary.html:24`, `aftermath.html:24`...); text below 12 px: `.eyebrow` 11 px (`documentary.html:32`), `.event-date` 11 px (`aftermath.html:32`), `.side-tag` 10 px (`regiment.html:32`), `.tl-meta`/`.lbl` 11 px (`:44,52`), Sandbox hint 11 px, `.gtbg-here` 9.5 px (`site-nav.css:98`).
- **Fix.** Tokens `--tap: 44px`, `--fs-min: 0.875rem` and a `.btn` component with `min-height:44px; padding-inline:16px`; back links `display:inline-flex; min-height:44px; align-items:center`; raise muted text to `#9aa3b8` (about 7:1 on #0a0a14) or lighten `#6f7686` to `#8b93a5`; replace `#777/#666/#555` with `var(--muted)`; keyboard-focus rows get the same text-colour rules as hover. **Effort** S. **Acceptance:** axe `color-contrast` and `target-size` pass; Playwright: every `button, a, [role=option], input` box >= 44x44 at 375 px (inline links inside paragraphs exempt). **audit_refs:** [A1, A3, A4, S4].

### pagesB-09 — SEO/social: broken og:image, missing twitter tags, JS-only content, duplicate URL forms (medium)
- **Evidence.** (a) `og:image`/`twitter:image` = `/screenshots/day3.png` on all 7 pages (`documentary.html:14,18`...). The file is **malformed [V]**: IHDR 1280x720, 8-bit, colour-type 2 (RGB) but IDAT inflates to 3,687,120 B = 720 x (1280x4+1), i.e. RGBA-sized rows; expected 2,765,520 B. Pillow raises "unrecognized data stream contents"; strict scrapers will likely reject it [U for specific scrapers]. `day1.png` and `day3.png` are byte-identical (md5 `3f6646c99f3416a1aa35fea67bed21c5`), yet the PWA manifest lists them as different screenshots. (b) `regiment.html` and `ground-remembers.html` have no `twitter:*` tags and shortened `og:description` (`regiment.html:11`, `ground-remembers.html:11`). (c) Documentary/Students/Regiment content is **fetched client-side** (`documentary.html:70-72`); initial HTML has no story text, so non-JS crawlers, link unfurlers and many AI crawlers see an empty page (T1: ~8% of referrals from search). (d) Extensionless twins both return 200 (`/regiment`, `/ground-remembers` [V curl]) -> duplicate URLs (T3). (e) Viewshed meta/OG description claims "approximate sightlines ... based on real elevation data" (`viewshed.html:8,11,17`), which the page itself disclaims.
- **Fix.** Generate 1200x630 screenshots per page as optimised PNG/WebP via headless capture, distinct per page, served from `/og/<page>.png` with `og:image:width|height|alt`; fix the manifest screenshots the same way. Add missing twitter tags via a shared head partial (pagesB-12). Add Netlify 301s from extensionless twins to the `.html` canonical (or use pretty URLs consistently). Prerender text for Documentary/Students/Regiment at build (pagesB-47) and add JSON-LD (`Article` per moment, `BreadcrumbList`, `ItemList`). **Effort** M (L with prerender). **audit_refs:** [T1, T3, E2].

### pagesB-10 — Dev-log copy, internal terms and typographic hygiene (medium) [V]
- **Inventory (user-visible).** `viewshed.html:46` ("Earlier drafts of this tool tried...", "this deployment doesn't have access to that"); `regiment.html:102` ("it's likely recorded at the brigade level instead of by regiment", a guess the code could resolve, pagesB-44); `regiment.html:66` ("built entirely from this site's own order-of-battle, placement, and vignette data"); `sandbox.html:54` ("local, in-memory copy only"), `:200` ("purely cosmetic in this simplified sandbox view"); `ground-remembers.html:43` ("Built from the same 694 recorded unit positions ... (not the separate, more granular per-scene density files)"); `aftermath.html:44` (honest but internal-tool voice). Data-borne dev text that would surface: `union_artillery.json` (2nd Maine Battery) key_action "subject of a Gettysburg Animated YouTube vignette..."; `union_regiments_i_ii_corps.json` (16th Vermont) "Two direction changes across several ticks."; raw IDs as labels (`regiment.html:198-199` renders `Indiana · U-I · U-I-1-1`; Sandbox unit names are IDs, `sandbox.html:196`; `regiment.html:218-219` prints "tick 62").
- **Typography.** ` -- ` used as an em dash: 31 times in the seven pages and **139 times in the 24 vignettes** (shown on Documentary/Students). Replace with `—` at build time.
- **Fix.** Rewrite in museum voice (copy given per page below); add `scripts/lint-copy.mjs` failing CI on `/ -- /`, `/\btick\b/i` in display strings, `/youtube|animation|placed with|must be/i` in OOB `key_action`/`fate`/`notes`, and any `U-|C-` ID pattern rendered into the DOM. **Effort** S (+M lint). **audit_refs:** [H7].

### pagesB-11 — Hard-coded Mapbox token and version pins in three pages (medium)
- **Evidence.** Same `pk.` token literal at `sandbox.html:71`, `viewshed.html:57`, `ground-remembers.html:56` (and in the app bundle); `mapbox-gl` `v3.24.1` pinned in 9 HTML files; the bundle embeds the same 3.24.1 (`bundle.pretty.js:53873`), so versions currently agree. The token appears unrestricted (X1). If Mapbox rejects a request (quota/URL restriction) these pages show a blank map with no message (no `map.on('error')`).
- **Fix.** One `/config.js` (`window.GTBG={MAPBOX_TOKEN,MAPBOX_VERSION}`); URL-restrict the token to the production domain + preview domain in the Mapbox dashboard; `map.on('error', e => [401,403,429].includes(e.error?.status) ? showMapUnavailable() : console.warn(e))`; one version constant with a CI check that the CDN version equals the bundle's. **Effort** S. **audit_refs:** [X1, X3].

### pagesB-12 — Shared page shell: tokens, sticky footer, back-link semantics (medium)
- **Evidence.** Each page re-declares its own `:root` tokens and near-duplicate CSS (six copy `--bg:#0a0a14 ...`; Students uses a different palette `--bg:#0a3a6a`, `education.html:20`). `#gtbg-footer` has `margin-top:40px` and no page-level flex column (`site-nav.css:130`), so short pages (Regiment before a search, Aftermath on tall screens) show a floating footer (S1). `wireBackLinks()` only rewires `a[href="/"]` (`site-nav.js:212`): Documentary/Students/Aftermath use `href="/index.html"` (`documentary.html:47`, `education.html:42`, `aftermath.html:41`) and skip it. For the pages that are rewired, the test `document.referrer` same-origin + `history.length > 1` (`site-nav.js:215-216`) calls `history.back()` even when the previous entry is another sub-page (e.g. Historian -> Regiment -> "Back to the map" returns to Historian) [C].
- **Fix.** `/css/tokens.css` + `/css/shell.css` (body `min-height:100dvh; display:flex; flex-direction:column`, `main{flex:1}`, footer `margin-top:auto`); a `data-theme` attribute for the Students variant (pagesB-20); Back link: always a real `<a href="/">`, using the History API only if `history.state?.fromMap === true` (set by the map when it opens a sub-page); a head partial emitting title/description/canonical/OG/Twitter/theme-color from one page manifest. **Effort** M. **audit_refs:** [S1].

### pagesB-13 — Test harness for these pages (high)
- No tests exist. Add (details in section 8): Playwright (desktop 1440x900, mobile 375x812, tablet 768x1024, landscape 812x375), axe-core, Lighthouse CI budgets, console-must-be-silent, data-lint (`scripts/lint-data.mjs`), unit tests for `time-model`, the viewshed core, heat weighting, and joins (vignette mentions, brigade fallback). **Effort** L. **audit_refs:** [].

## 3. Time model: what these pages use, what is inconsistent, and what consumers need (feeds the time-model specialist)

### 3.1 Tick/time formulas used by the seven pages [V]

| Page | Formula / label logic | Where | Problem |
|---|---|---|---|
| documentary | `dayForTick(t) = t<=225 ? 1 : t<=450 ? 2 : 3`; eyebrow `Day ${d} · Tick ${t} · ${location}` (raw tick, no clock) | `documentary.html:84,89` | Raw tick is meaningless to readers; the prose in the same card says e.g. "approximately 7:30 in the morning" at tick 12, which the data's own formula maps to 5:55 (chronology label 6:00). Two vignettes share tick 556 (V-019, V-023): sort is stable only by file order (`:72`). |
| education | `DAY_TICK_RANGES = {1:[1,225],2:[226,450],3:[451,675]}` filter on `trigger_tick` | `education.html:63,73` | Fine as bucketing, but no clock shown; no shared definition. |
| regiment | `dayForTick` (same), timeline text `Day ${d} · ticks a-b` | `regiment.html:189,218-219` | Prints raw ticks; run boundaries are keyframe ticks, not durations; step-hold of last keyframe. |
| sandbox | hard-coded starting ticks 260/553/62 with prose labels; `placementAtTick` = last keyframe with `tick <= t` (binary search) | `sandbox.html:94-107,223` | Labels contradict data (3.4); the main app **interpolates** between keyframes (InterpolationWorker chunk) while the sandbox holds the last keyframe, so the same tick can show different positions. |
| ground-remembers | slider 1..675 labelled by raw tick; cumulative filter `p.tick <= maxTick`; auto-play `+8 ticks / 90 ms` | `ground-remembers.html:47-48,79,111-113,125,130` | Raw tick label; playback = 88.9 ticks/s = 7.4 sim-hours per second; unconfigurable. |
| aftermath | calendar dates only | `aftermath.html:49-64` | None (no ticks). |
| viewshed | none | - | Vantage points have `day_relevance` in data but the page ignores it (no "which day/time was this point used"). |

### 3.2 The four tick-to-clock formulas that exist in the deploy [V]

1. **Map store** `getTickTime` (`bundle.pretty.js:9370-9383`): `minutes = (day===1 ? 6*60 : 4*60) + ((tick-1)*5 - dayOffset)`, date `July ${day}` (date correct). So Day 1 tick 1 = 6:00 AM, Day 2 tick 226 = **4:00 AM**, Day 3 tick 451 = **4:00 AM**.
2. **Panel `JF`** (`bundle.pretty.js:100838-100844`) and **panel `QF`** (`bundle.pretty.js:101001-101008`): `5*60 + (tick - dayOffset - 1)*5`, date **`July ${day+2}`** (wrong: Day 1 prints "July 3").
3. **Header overlay `_F`** (`bundle.pretty.js:97428`): `` `July ${l + 2}, 1863` `` (wrong by +2; C3), speed label `f === 1 ? "1x (real time)"` (`:97429`; H9).
4. **Chronology data**: `metadata.tick_formula` says "Tick 1 = 5:00am July 1. Each tick = 5 minutes" (also "Tick 226 = 5:00am July 2", "Tick 451 = 5:00am July 3"). Under that formula tick 225 = 11:40 pm. But the labelled `time` values drift (3.3).

Consequence for these pages: none of them may hard-code any of the four. They must call `TimeModel` (3.5).

### 3.3 Chronology label drift versus its own stated formula [V, `timetable.py`]

`diff = label - (5:00am + 5 min x (tick - dayStartTick))`, computed over all 137 events (Day 1: 42, Day 2: 49, Day 3: 46):

| Day | Tick range | diff | Effective slope of labels |
|---|---|---|---|
| 1 | 1-8 | 0 | 5 min/tick |
| 1 | 12-90 | +5 min | 5 min/tick |
| 1 | 95-100 | +15 min | (jump) |
| 1 | **101-225** | **no events at all** | Day-1 afternoon (retreat through town, Cemetery Hill) has no chronology and no vignette (last Day-1 vignette is tick 57) although placements exist through tick 225 |
| 2 | 226-310 | 0 | 5 min/tick |
| 2 | 314-340 | -10 | 5 min/tick |
| 2 | 340-450 | -50 -> -230 | **3.0 min/tick** (2:20 pm at tick 340 to 7:50 pm at tick 450) |
| 3 | 451-465 | 0 | 5 min/tick |
| 3 | 465-500 | -20 -> -60 | 3.0-3.7 min/tick |
| 3 | 505-572 | -60 -> -70 | 4.7-5.0 min/tick |
| 3 | 580-675 | -85 -> -215 | 3.0-5.0 min/tick; last event tick 675 = 8:05 pm |

Evidence that the *event content* is on real-history time while the *tick labels* are compressed (V-* = vignette id, all from the deployed JSON):

| Vignette | tick | formula clock (5:00 + 5 min x n) | map-store clock (`bundle.pretty.js:9370`) | chronology-label (interpolated) | clock claimed in the site's own prose |
|---|---|---|---|---|---|
| V-001 First Shot | 12 | 5:55am | 6:55am | 6:00am | "approximately 7:30am" |
| V-002 Reynolds Falls | 28 | 7:15am | 8:15am | 7:20am | "approximately 10:15am" |
| V-007 Sickles Moves Forward | 248 | 6:50am | 5:50am | 6:50am | "Around 3:00 in the afternoon" |
| V-009 Vincent | 267 | 8:25am | 7:25am | 8:25am | "shot ... late in the afternoon" |
| V-013 Greene's Lone Stand | 315 | 12:25pm | 11:25am | 12:15pm | "orders came at dusk" |
| V-014 Louisiana Tigers | 326 | 1:20pm | 12:20pm | 1:10pm | "At dusk on July 2" |
| V-022 Mudge at Culp's Hill | 460 | 5:45am | 4:45am | 5:45am | "approximately 7:30 in the morning" |
| V-017 The Cannonade | 518 | 10:35am | 9:35am | 9:30am | "approximately 1:00pm" |
| V-016 Armistead at The Angle | 551 | 1:20pm | 12:20pm | 12:10pm | "afternoon of July 3" |
| V-024 High Water Mark | 675 | 11:40pm | 10:40pm | 8:05pm | "the afternoon of July 3" |

Also inside the chronology itself: tick 38 (label 8:10am) is "Noon lull begins"; tick 314 (label 12:10pm) says "at dusk"; tick 538 (label 11:05am) is "PICKETT'S CHARGE BEGINS".

**Local-slope hint for the time-model owner.** If the site's own historical claims are used as anchors (candidate anchors only, to be verified against Pfanz/Coddington/OR before adoption): (12, ~7:30 Jul 1), (28, ~10:15 Jul 1), (38, "noon lull", ~noon), (248, ~3:00 pm Jul 2), (256, "Longstreet's assault begins"), (460, ~7:30 Jul 3), (518, 1:00 pm Jul 3). Ticks 12->28 imply ~10 min/tick (7:30 -> 10:15 from the site's own prose), 460->518 ~5.7 min/tick (7:30 am -> 1:00 pm, also from the prose), and 248->256 ~7.5 min/tick if the assault is taken as ~4:00 pm (general history, not the site's text), i.e. **the ticks are not 5-minute steps in historical time**. A monotone piecewise-linear anchor table (not a constant 5 min) is the smallest change that makes every label true.

### 3.4 Sandbox scenario labels versus data [V]

| Option text (`sandbox.html:104-106`) | Claim | Data at that tick |
|---|---|---|
| "Day 2, mid-afternoon (tick 260) -- before Longstreet's assault" | afternoon; assault not yet begun | Data clock 7:50am. Chronology tick 256 = "LONGSTREET'S ASSAULT BEGINS"; tick 258 Hood wounded; **tick 260 = Law reaches Big Round Top, 15th Alabama assaulting Little Round Top, Robertson engages Ward at Devil's Den**. The assault is already under way. Honest pick for "moments before": tick 250-254. |
| "Day 3, ~3:00pm (tick 553) -- moments before Pickett's Charge reaches the wall" | ~3 pm; before the wall | Data clock 12:20pm. Tick 550 Garnett KIA at the Angle, **551 Armistead over the wall**, 552 Armistead mortally wounded, **553 Cushing KIA**. The wall was reached two ticks earlier. Honest pick for "moments before the wall": tick 548 (last keyframe before the 550 Charging Line). Note "~3:00pm" is close to the historical time of the charge, not to the data clock. |
| "Day 1, mid-morning (tick 62) -- I Corps holding McPherson's Ridge" | holding | Data clock 10:10am (fits "mid-morning"), but tick 62 = "I Corps right flank crumbling ... 16th Maine ordered to stay as sacrifice regiment"; tick 64 "Seminary Ridge fighting begins". "Holding McPherson's Ridge" is tick 30 (chronology: "I Corps establishes defensive line along McPherson's Ridge"). |

The code comment at `sandbox.html:102` says "all verified real ticks"; the labels were not verified against events.

### 3.5 Time-model contract the seven pages will code against (`/js/time-model.js`, no dependencies, ES module + UMD shim)

```js
export const TICKS_PER_DAY = 225, MAX_TICK = 675;
export const dayOf       = t => Math.ceil(t / 225);                 // == t<=225?1 : t<=450?2 : 3
export const tickInDay   = t => t - 225 * (dayOf(t) - 1);           // 1..225
export const dateOf      = t => ({ year:1863, month:7, day:dayOf(t) }); // NEVER day+2
// ANCHORS: [{tick, iso:'1863-07-01T07:30', src:'V-001 text; Pfanz 2001 p.NN', confidence:'high|med'}] ; monotone in both fields
export function clockMinutes(t){ /* piecewise-linear over ANCHORS, clamped, cached in a Float32Array(676) */ }
export const formatClock = (t,{style='long'}={}) => /* '7:30 a.m.' (AP style) or '7:30 AM' */ ;
export const label       = t => `Day ${dayOf(t)} · July ${dayOf(t)} · ${formatClock(t)}`;
export const tickForClock= (day,'HH:MM') => /* inverse via binary search */ ;
export const simMinPerTick = t => /* local slope, feeds the speed label (H9): "10 sim-min / sec" */ ;
export const anchorsFor  = (from,to) => /* for UI ticks on scrubbers/sliders */ ;
```
- **Unit tests (node:test):** `dayOf(225)=1, dayOf(226)=2, dayOf(450)=2, dayOf(451)=3`; `clockMinutes` strictly increasing; `label(anchorTick)` equals the anchor's authored clock; no function returns `July 5`; fuzz `tickForClock(...)` round trip within 1 tick.
- **Consumption on my pages:** Documentary eyebrow -> `label(v.trigger_tick)`; Students cards show `formatClock`; Regiment timeline shows `formatClock(run.startTick)-formatClock(run.endTick)`; Sandbox starting points are generated from chronology events (3.6) and labelled by `label()`; Ground slider shows `label()` with `aria-valuetext`; Viewshed unaffected except `day_relevance` chips.
- **Decision required from the time-model owner (not from me):** Option A "anchor table over existing ticks" (small: ~40 anchors; ticks stay, slope varies; speed label must report sim-min/sec) vs Option B "re-time the data so ticks are uniform 5 min in historical time" (large: re-author ~1,800 keyframes/events). My pages are written against the interface, so they are agnostic; **Option A first**.

### 3.6 Sandbox starting points: generate from data, do not hand-label
```js
const CANDIDATES = chronology.filter(e => ['critical','high'].includes(e.significance));
// UI groups by day; label = TimeModel.label(e.tick) + ' - ' + shortTitle(e)
// "Moments before X" = the last tick < X with >=1 keyframe; "During X" = X.
```
Curated set (ids to be re-checked after re-anchoring): "Before the Iron Brigade enters Herbst Woods" (tick 25), "I Corps holds McPherson's Ridge" (30), "Before Longstreet's assault" (254), "Little Round Top: Vincent arrives" (267), "Before Pickett's Charge steps off" (537), "The charge nears the wall" (548), "At the Angle" (551). Lint: for each option, `TimeModel.label(tick)` must be present in its text and `chronology[tick].event` must contain the option's keyword.

## 4. Per-page audits, fix specs, and A+ feature completions

### 4.1 documentary.html (findings pagesB-14 to -19)

**What it is.** 112-line static page; fetches `/data/vignettes_part{1,2,3}.json` (24 vignettes: Day 1 = 6, Day 2 = 8, Day 3 = 10; 7,205 words of narrative, ~36 min at 200 wpm); one card at a time with Prev/Next, a 24-segment progress bar and a link into the map. No Mapbox, no third-party origin. `main` present, one `h1`. Dark tokens (`documentary.html:20`).

#### pagesB-14 — Narrative renders as one paragraph (high) [V]
- **Evidence.** `documentary.html:91` `el.textContent = v.full_script`; `.script` (`:34`) has `font-size:17px; line-height:1.85` and no `white-space`. All 24 `full_script` strings contain `\n\n` (avg 10.4 paragraphs, 206-375 words). Browsers collapse the newlines: every story is a single ~300-word block.
- **Root cause.** Plain-text field written as paragraphs, rendered as text without splitting.
- **Fix.**
  ```js
  const box = document.getElementById('d-script');
  box.replaceChildren(...v.full_script.split(/\n{2,}/).map(t => { const p = document.createElement('p'); p.textContent = t; return p; }));
  ```
  ```css
  .script p { margin: 0 0 1.1em; max-width: 65ch; }
  .script p:first-child::first-line { font-variant: small-caps; letter-spacing:.02em; }  /* optional */
  ```
  Same treatment anywhere `full_script` is shown (Historian, Regiment vignette cards use `panel_summary` only).
- **Effort** S. **Acceptance:** Playwright: every moment renders >= 5 `<p>` and joined text equals source minus newlines; no horizontal scroll at 320 px. **Moves:** fit and finish, readability. **audit_refs:** [].

#### pagesB-15 — Clock/eyebrow: raw "Tick 12" beside prose that says 7:30 (high) [V]
- **Evidence.** `documentary.html:89` `` `Day ${day} · Tick ${tick} · ${location}` ``; V-001 text says "approximately 7:30 in the morning" while the data formula maps tick 12 to 5:55 and the map store to 6:55 (section 3.3).
- **Fix.** Eyebrow -> `Day 1 · July 1, 1863 · about 7:30 a.m. · Knoxlyn Ridge, west of Gettysburg`. Data change: add to each vignette `historical_time` (ISO local time), `time_confidence` (`exact|circa`) and `time_source`; the eyebrow uses `historical_time` when present (never raw ticks). Until the time-model owner reconciles the map clock, do **not** show the map clock on this page (two clocks on one card is the C4 defect). Once anchors exist, show `TimeModel.label(tick)` only as "Map time" on the "Watch this moment" link.
- **Effort** M (authoring 24 times). **Acceptance:** data-lint requires `historical_time` for every vignette and checks the prose time (regex) equals the field; no `Tick` string in the DOM. **audit_refs:** [C4].

#### pagesB-16 — Mobile: navigation row, padding, targets (medium) [C, verify visually]
- **Evidence.** `.nav-row` is `display:flex; justify-content:space-between` with no wrap (`documentary.html:35`) holding a Prev button, a 30-character link and a Next button. Estimated widths at 375 px: ~108 + ~195 + ~90 = ~393 px vs ~271 px content width (`.stage` padding 28/32 px at `:31`, `main` 5% at `:27`), so the link wraps to 3 lines and the buttons squeeze. `.nav-btn` ~37 px tall (`:36`). Progress segments are non-interactive 4 px bars (`:29`).
- **Fix.**
  ```css
  .stage{padding:clamp(16px,4vw,32px)}
  .nav-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .map-link{grid-column:1/-1;order:-1;display:flex;align-items:center;justify-content:center;min-height:44px}
  .nav-btn{min-height:44px;font-size:.9375rem}
  @media(min-width:640px){.nav-row{display:flex;justify-content:space-between}.map-link{order:0}}
  @media(max-width:639px){.nav-row{position:sticky;bottom:0;background:var(--panel);padding:8px 0;z-index:2}} /* thumb-reachable */
  ```
  Progress bar becomes `<ol class="progress">` of `<button aria-label="Moment 5 of 24: The Railroad Cut" aria-current>` chips (44 px hit area via padding, 8 px visible bar), grouped by day with Day 1/2/3 dividers.
- **Effort** S. **Acceptance:** 320/375/414 px screenshots have no wrapped link text and no clipped buttons; all targets >= 44 px. **audit_refs:** [S4, A3].

#### pagesB-17 — Keyboard, screen reader, deep-link and focus behaviour (medium) [C]
- **Evidence.** Global `keydown` for ArrowLeft/ArrowRight (`documentary.html:101-104`) with no modifier/target guards (fires while a nav menu or the browser's find/scroll is in use, and inside form controls if any are added). No focus management after Next/Prev (focus stays on the button, content changes silently). `render()` calls `window.scrollTo({top:0,behavior:'smooth'})` (`:96`), including on the first render at `:106` and ignoring `prefers-reduced-motion`. Titles are `div`s (`:57`). No URL state: refresh returns to moment 1; Back button leaves the page.
- **Fix.** Guard: `if (e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)||e.target.closest('#gtbg-nav')) return;` and only act when focus is inside `.stage`/`.nav-row` or on `body`. Hash routing: `#v-010`; `history.replaceState` on step, `hashchange` sync. After each step: set `document.title = `${v.title} — Documentary``, focus the `<h2 tabindex="-1">`, update `<div role="status" aria-live="polite" class="sr-only">Moment 5 of 24: The Railroad Cut</div>`, and scroll only if the stage top is off-screen (`behavior: reduced ? 'auto':'smooth'`). Use `<h2>` for the title, `<article>` for each moment.
- **Effort** M. **Acceptance:** axe clean; keyboard-only run through all 24 moments; NVDA/VoiceOver announce the new moment; deep link `documentary.html#v-013` opens that moment; refresh preserves it. **audit_refs:** [A6, D2, H2].

#### pagesB-18 — Feature completions to reach A+ (medium/large)
1. **Read aloud** (Web Speech API `speechSynthesis`, zero bytes, feature-detected): play/pause, rate 0.8-1.4x, voice picker, per-paragraph highlight, auto-advance option, `MediaSession` metadata. This also makes the site-nav description "narrated" (`site-nav.js:27`) true. Pre-rendered audio can come later (24 x ~2 min); do not ship it before licensing of any TTS voice is checked.
2. **Where it happened**: a small map per moment from `trigger_lat/trigger_lng` (present on every vignette, e.g. V-001 39.8344, -77.2756). Use a self-drawn SVG over the 3DEP hillshade (section 6.3) so no Mapbox load is needed on this page; link "Open in the animated map" via `mapLink`.
3. **Sources**: each `vignettes_part*.json` carries a `metadata.sources` list (Pfanz, Oates, Desjardin, OR ...) that no page shows. Add a per-moment "Sources" disclosure (map each vignette to its 1-3 sources during authoring; at minimum show the per-day list).
4. **Structure**: day dividers ("Day 2 begins"), chapter menu (jump to any of 24), resume position (localStorage, wrapped in try/catch), "reading time" chips, share (Web Share API, copy link `#v-010`), print stylesheet (one moment per page), end-of-tour panel linking to Turning Points, the featured units' Regimental Biographies (`units_featured` -> `regiment.html?unit=`, see pagesB-43) and the Students page.
5. **SEO**: prerender all 24 as `<article id="v-001">` in the static HTML; JS only adds the stepper (so `noscript` and crawlers get everything); JSON-LD `ItemList` of `Article`s. **Effort** L in total (each item S-M). **Moves:** Concept/content depth, UX, SEO.

#### pagesB-19 — Small defects (low) [V]
- "All 24 of the battle's key moments" is hard-coded (`documentary.html:49`) and again in `site-nav.js:27`: render from `vignettes.length`. V-019 and V-023 tie at tick 556 (`:72` sort is by tick only); use `.sort((a,b)=>a.trigger_tick-b.trigger_tick || a.vignette_id.localeCompare(b.vignette_id))` or an explicit `order`. V-024 "The High Water Mark" is triggered at tick 675 (last tick, formula clock 11:40 pm) although its prose is about the afternoon of July 3: mark it `kind:"epilogue"`. Back link uses `/index.html` (`:47`), bypassing `wireBackLinks()`. Descriptive copy: replace `.sub` with "Twenty-four moments from July 1-3, 1863, told in order. Read at your own pace or press Listen. Each moment opens at its place on the map." **Effort** S.

**Per-page tests (Documentary).** e2e: load -> 24 progress items; step to the end; Next disabled at 24; hash sync; reduced-motion respects; axe 0; Lighthouse mobile >= 98 all categories; console silent; network: one data request (after pagesB-04).

---

### 4.2 education.html (findings pagesB-20 to -23)

**What it is.** 100-line page; same three vignette files; three day tabs (buttons); each day renders a hard-coded intro plus one card per vignette using `panel_summary` and a map link. Own blue palette (`--bg:#0a3a6a`, `education.html:20`), centred header, `theme-color #0a3a6a`.

#### pagesB-20 — Theme inconsistency with the rest of the site (medium) [V for contrast; C for visual clash]
- **Evidence.** Every other page is dark navy/gold (`--bg:#0a0a14`, `--gold:#c9a24b`); Students is bright blue/yellow. The shared nav (`site-nav.css:20` `#0d0d18`) and footer (`:129-133` `#6f7686`/`#8a93a8`) are hard-coded dark-theme colours: on the blue page the footer text is **2.53:1** and its links **3.73:1** (fail). The page's own text/tabs pass (>= 6.5:1).
- **Fix (recommended).** Move to the shared tokens with a `data-theme="students"` modifier that changes *scale, not palette*: body 18 px / 1.75, headings +2 steps, 48 px tabs, more padding, rounded 16 px cards, an illustrated header (SVG icon from `icons.svg`). If a light "classroom" look is wanted, implement it as a **site-wide** light theme (`prefers-color-scheme: light` + toggle) using the same tokens, so Students is not a one-off. Also set `theme-color` to the shared value. **Effort** M. **Acceptance:** axe contrast 0 on Students at both themes; visual regression against the shared shell. **audit_refs:** [fit-and-finish, A1].

#### pagesB-21 — Content is not written for students (high) [V measured, heuristic]
- **Evidence.** `education.html:80` renders `panel_summary`. Flesch-Kincaid grade computed with a simple syllable heuristic (treat as approximate): `panel_summary` mean **11.1** (median 11.2, range 5.5-16.6); `full_script` mean **7.1**. The page subtitle promises "A simple guide ... told through the real people who were there" (`:44`). `DAY_INTRO` (`:58-62`) is hard-coded prose with no sources; "both armies were at full strength" (`:60`) is contestable (VI Corps, Stuart and Pickett had not all arrived on the morning of July 2; verify against Pfanz before keeping).
- **Fix.** Author `student_summary` (<= 60 words, target grade 5-7, active voice, one idea) for all 24 moments and `student_intro` per day; move both to the vignette data with `reviewed_by`/`source`. Add a **Simple / Detailed** toggle (Detailed = `full_script` paragraphs, pagesB-14). Add per-card "Key terms" (`flank`, `brigade`, `salient`, `vedette`: shared glossary JSON with `<abbr>`/`<dfn>` popovers), "Why it matters" line, and "Meet the people" chips from OOB commanders. **Effort** L (content). **Acceptance:** data-lint FK <= 8.0 for `student_summary`; teacher-reviewed.

#### pagesB-22 — Tabs, injection, no-JS and link semantics (medium) [C]
- **Evidence.** `education.html:48-50` buttons carry only a class for the selected state; the page has no `role=tablist`; the tabs are inert until data loads (listeners attach after `await`, `:86-92`) but look active; `container.innerHTML = ...${DAY_INTRO[day]}...` and per-card `innerHTML` with `v.title`/`v.panel_summary` (`:75,79-81`) - safe today (first-party data, no `<`/`&` present) but fragile; every card has an identical link text "See it on the map ->" (`:81`, WCAG 2.4.4 link purpose); no `#day-2` deep link; no server-rendered text.
- **Fix.** `role="tablist"` + roving tabindex, or simpler `aria-pressed` toggle buttons; disable (`aria-disabled`) until data is ready; build nodes with `textContent`; link text "See The Railroad Cut on the map" (visible or `.sr-only` suffix); `#day-1..3` hash; prerender all three days into the static HTML (`<section id="day-1">`) and let JS only toggle visibility, so crawlers and no-JS users get everything. **Effort** S-M. **audit_refs:** [A6].

#### pagesB-23 — Classroom kit / feature completions (medium/large)
Progress tracker ("You've read 9 of 24 stories", localStorage), 3-5 self-check questions per day (client-side only, no data collection), printable one-page worksheets (print CSS), a "Teacher notes" page (learning goals, suggested 45-min plan, vocabulary), share/Read-aloud (shared component with Documentary). Standards alignment is a candidate task only: check against the C3 Framework and state history/ELA literacy standards with a classroom teacher; do not print "aligned to" claims without review. **Effort** L.

**Per-page tests (Students).** axe 0 at both themes; tab keyboard test; FK lint; Lighthouse mobile >= 98; prerender parity test (JS-on and JS-off DOM text equal).

---

### 4.3 aftermath.html (findings pagesB-24, -25)

**What it is.** Static 73-line page, no JS except the shared nav. Four events (July 4; July 5-14; "Summer 1863"; November 19) in a CSS timeline, plus an honest caveat box (`aftermath.html:44`).

#### pagesB-24 — Thin content, no citations, weak semantics (medium) [C]
- **Evidence.** 4 events cover 4.5 months (`:48-67`); no sources, no images, no map links, no "what happened to the units/commanders" although the OOB has `fate` fields; timeline is `div`s (`:47-67`) with 11 px dates (`:32`) and a 12 px caveat (`:27`).
- **Fix.** Expand to ~15-20 dated entries in five chapters (The retreat; The pursuit and the river; The town and its wounded; The dead and the cemetery; The Address). Each entry: `<li><time datetime="1863-07-04">`, 60-120 words, 1-2 citations (NPS, Coddington, Sears, OR: **I have not verified any new facts here; every entry needs a source before publishing**), optional map link (retreat route) and related-unit links. Candidate topics to research/verify: July 4 rain and departure; Imboden's wagon train of wounded; Monterey Pass; Williamsport and Falling Waters (July 13-14); Lincoln's unsent letter to Meade; the wounded left in the town and the field hospitals/Camp Letterman (verify dates and counts); burials and the Soldiers' National Cemetery (Wills, design, reburials: verify dates); the Nov 18-19 events; a short "what became of..." panel for the commanders the site already features. Casualty totals must reuse the site's single sourced figure (the vignettes say 51,000). Semantics: `<ol class="timeline">`, `<time>`, `h2` per chapter; type >= 14 px (dates 13 px uppercase is acceptable); reword the caveat as "About this timeline" with a sources list. A static SVG/Mapbox route map only if sourced coordinates exist. **Effort** L (content). **Moves:** Concept depth (A-), SEO (long-tail), Documentation.

#### pagesB-25 — Fact-check list for existing text (low) [C, verify with sources]
`aftermath.html:51` ("Vicksburg fell" the same day; "heavy rainstorm"; wagon train "reported to have stretched for miles": cite Imboden); `:56` (swollen Potomac "over a week near Williamsport", crossing by July 14, Lincoln's criticism: cite); `:61` "roughly 2,400 residents" (1860 census figure: verify); `:66` "Cemetery Hill -- ground your map shows as the Union army's central anchor" (the Soldiers' National Cemetery adjoins Evergreen Cemetery/Cemetery Hill: say "beside Cemetery Hill"); Everett "roughly two hours", Lincoln "about two minutes" (commonly cited; cite). **Effort** S.

**Per-page tests (Aftermath).** axe 0; Lighthouse 100/100/100/100 expected (no JS); link checker for citations; HTML validation of `<time>`.

### 4.4 sandbox.html (findings pagesB-26 to -33)

**What it is.** 237-line page. Loads Mapbox GL 3.24.1 synchronously (`sandbox.html:19-20`), fetches 9 placement files (694 keyframes, **152 units** of which 100 Union / 52 Confederate, **117 distinct ticks**), draws one circle per unit at its last keyframe <= chosen tick (`placementAtTick`, `:94-100`), lets the user drag a unit (`mousedown`/`mousemove`/`mouseup`, `:167-182`), change a "disposition" (`:189-208`) and keeps a change log. `satellite-v9` style, token hard-coded (`:71`). The unit "ids" shown are brigade/battery/regiment ids (`U-XII-2-3`), not names.

#### pagesB-26 — Edit panel appears in the wrong place (high) [C; verify visually]
- **Evidence.** `#edit-panel{position:absolute; ... display:none; z-index:5}` (`sandbox.html:37`) is a **sibling after `#map`** (`:62-63`), not inside a positioned ancestor. `showEditPanel` sets `left = point.x + 20`, `top = point.y` (`:192-193`) where `e.point` is relative to the map container. With no positioned ancestor the panel is placed relative to the document, so it appears about (nav 57 + banner ~38 + header ~130 + controls ~55) = ~280 px above the clicked unit on desktop and worse on phones, potentially over the page header, and it does not follow page scroll.
- **Root cause.** Absolute positioning against the wrong coordinate space.
- **Fix.** Wrap: `<div class="map-wrap" style="position:relative"><div id="map"></div><div id="edit-panel" role="dialog" aria-label="Edit unit"></div></div>`; clamp: `left = Math.min(point.x + 20, mapW - panelW - 8)`, `top = Math.min(point.y, mapH - panelH - 8)`; on <= 640 px render the panel as a bottom sheet (`position:absolute; inset:auto 0 0 0`), with a visible Close button, Esc to close, and focus moved into it. Alternatively use `mapboxgl.Popup` (handles anchoring). **Effort** S. **Acceptance:** Playwright: click a unit at three map positions on 1440x900 and 375x812; panel bounding box is inside the map box and within 40 px of the unit. **audit_refs:** [S3-adjacent, fit-and-finish].

#### pagesB-27 — Not operable by touch or keyboard; violates WCAG 2.5.7 and 2.1.1 (high) [C]
- **Evidence.** Selection and drag exist only on `map.on('mousedown', 'sandbox-units-layer')` and `map.on('mousemove')` (`sandbox.html:167-182`); Mapbox emits `touchstart/touchmove/touchend` for touch, and `click` (`:183-186`) only *hides* the panel. On a phone a tap never opens the panel and a drag pans the map, so the feature is unusable on mobile. There is no keyboard path at all and no single-pointer alternative to dragging (WCAG 2.2 SC 2.5.7 Dragging Movements, AA).
- **Fix.**
  1. Pointer parity: register the same handlers for `touchstart/touchmove/touchend` on the layer, call `e.preventDefault()` on start and `map.dragPan.disable()` while a unit is held, `enable()` on end; throttle `setData` with `requestAnimationFrame`.
  2. **Click-to-move alternative (the 2.5.7 answer)**: tap a unit to select, then tap "Move here" (or tap the destination); works with a single pointer and no drag.
  3. **Keyboard**: a `<table>` of units (name, side, position, disposition) below the map, each row with a "Select" button; with a unit selected, arrow keys nudge 50 m (Shift = 200 m, Alt = 10 m), Enter confirms, Esc cancels, Ctrl/Cmd+Z undo; changes announced in an `aria-live="polite"` region ("Pettigrew's Brigade moved 120 m north-east").
  4. Overlapping dots: `e.features[0]` picks an arbitrary unit (`:169`); when >1 feature is under the pointer show a small chooser list.
- **Effort** M. **Acceptance:** Playwright touch emulation moves a unit; keyboard-only test moves and undoes; axe 0. **audit_refs:** [A3, D2].

#### pagesB-28 — Scenario labels contradict the data (high) [V]
- See the table in section 3.4: tick 260 is *during* Longstreet's assault at 7:50 am data clock ("mid-afternoon ... before"), tick 553 is *after* the wall was reached ("~3:00pm ... moments before ... reaches the wall"), tick 62 is the I Corps collapse ("holding McPherson's Ridge"). Code: `sandbox.html:103-107`, initial load `:223` hard-codes 260.
- **Fix.** Generate options from `chronology_day*.json` events (section 3.6), show `TimeModel.label(tick)`; let the user also scrub to **any** tick (a 1-675 range input with `aria-valuetext`); auto-load on change (currently the user must press "Load this moment", `:58,226-228`); default scenario = the first curated event, not a magic number. **Effort** S-M (after pagesB-05). **Acceptance:** lint asserts label clock == `TimeModel.label(tick)` and keyword in `chronology[tick].event`. **audit_refs:** [C4].

#### pagesB-29 — Disposition control is wrong and cosmetic (medium) [V]
- **Evidence.** `DISPOSITIONS` (`sandbox.html:79`) has 9 values; the data also contains **Charging Line (54 keyframes), Mounted Cavalry (3), Dismounted Cavalry (1)**. `<option ${d===p.disposition?'selected':''}>` (`:198`) finds no match for those, so the browser pre-selects the first option ("Line of Battle") although the unit's real state is "Charging Line": the panel states something untrue. The circle paint (`:157-161`) ignores `disposition`, so changing it does nothing visible; the panel admits "purely cosmetic in this simplified sandbox view" (`:200`).
- **Fix.** Derive the list from the data (`[...new Set(all.map(p => p.disposition))]`), add the missing values; encode disposition visually (symbol layer, icon per disposition rotated by `bearing`: line, column, skirmish, artillery, cavalry, retreat) with a legend; until that ships, hide the dropdown rather than show a control with no effect. Copy: "Changing a unit's posture is a label only; the sandbox does not simulate combat." **Effort** S (data-derived list) to M (icons). **Acceptance:** for every unit at every keyframe the select shows its true disposition (unit test over all 694 keyframes).

#### pagesB-30 — Change log spam, raw ids, no undo (medium) [V]
- **Evidence.** `logChange(dragging,'moved',...)` runs on **every mousemove** (`sandbox.html:174-181`), the old position is the previous mousemove, and the list keeps 30 entries (`:212`), so one drag floods the log with "moved from ... to ..." rows; `renderChangeLog` rebuilds `innerHTML` on each event (`:216-220`). Timestamps are `#555` (2.64:1). Unit names are ids (`:196`, `:219`); 144 of 152 placement ids resolve to a designation via the OOB files, 8 (`U-VI-1-1 ... U-VI-3-3`, VI Corps brigades) do not: a data gap to fill (pagesB-53). "Reset sandbox" (`:229-231`) is identical to "Load this moment".
- **Fix.** Capture start `lngLat` on down, log **once** on up: "Pettigrew's Brigade moved 340 m north-east". Haversine distance/bearing helper; undo/redo stacks (max 100); per-unit "Reset unit"; "Reset all changes" distinct from load; names via `names.json`; timestamps `--muted`. Show original positions as faint ghost points/lines ("where they really were") to make the comparison meaningful. **Effort** M.

#### pagesB-31 — Fragile first render and no resize/error handling (low) [C/U]
- **Evidence.** `renderMap()` only adds the layer `else if (map.loaded())` (`sandbox.html:146-150`) and is first called from the `load` handler (`:222-224`); if `loaded()` is momentarily false the sandbox stays empty until the user presses Load [U]. No `map.resize()` on layout changes, no `map.on('error')` (token/quota). Comment at `:81-83` says "independent copy" of data while `placementAtTick` returns objects that are then shallow-copied: fine.
- **Fix.** In the `load` handler add the source/layer unconditionally, then `setData`; `new ResizeObserver(() => map.resize()).observe(container)`; `map.on('error')` (pagesB-11). **Effort** S.

#### pagesB-32 — Mobile layout and accessibility of the page chrome (medium) [C/U]
- Long option text (75-78 characters, `:104-106`) in a `select` inside a `flex-wrap` label (`:57`): the intrinsic width (~500 px at 13 px) can exceed a 375 px viewport and cause horizontal page scroll [U: verify at 320/375/414]. Fix `select{max-width:100%;width:100%}` and shorter labels (event title + clock).
- `#map{height:60vh;min-height:420px}` (`:36`) plus one-finger panning traps page scroll; use an explicit **Edit mode** toggle (map gestures locked to page scroll until "Edit units" is on) or `cooperativeGestures` when not editing.
- Buttons ~33 px (`.btn` `:33`) -> 44 px; hint `#777` (4.15:1) and empty list `#666` (3.43:1) fail contrast; the banner (`:50`) needs `role="note"`; `#map` needs `role="region" aria-label="Battlefield map with movable units"`; the change log needs `aria-live="polite"`; the edit panel needs `role="dialog"` and a labelled Close.
- **Effort** M. **audit_refs:** [A1, A3, A4, S4].

#### pagesB-33 — Feature completions to reach A+ (low/large)
Unit names + hover tooltip (strength, commander from OOB, day relevance); side legend and corps filter; facing wedge from `bearing`; interpolate between keyframes exactly like the main app (share its `interpolate` function via the shared time/place module) so the Sandbox at tick T equals the map at tick T; scrubber for any tick; ghost original positions + "moved X m" summary; curated *hypothetical prompts* clearly framed as illustrations ("What if III Corps had held Cemetery Ridge?" pre-positions units, no outcome predicted); save/share a scenario as a URL hash (local only, consistent with the banner); export as PNG; a scenario "diff" panel. The hazard-striped banner (`:29`) can be calmer (a bordered `role="note"` callout) without losing the HYPOTHETICAL message. **Effort** L. **Moves:** Concept/UX.

**Per-page tests (Sandbox).** e2e: load default scenario -> 100+ points rendered; move by mouse, touch, click-to-move, keyboard; undo/redo; reset; panel inside map box; select shows correct disposition for all keyframes; axe 0; Lighthouse mobile perf >= 90 after pagesB-02; console silent.

---

### 4.5 viewshed.html (findings pagesB-34, -35, -41; the real-viewshed build is section 6, findings -36 to -40)

**What it is.** 133-line page. Fetches `data/terrain.json` (30 `key_locations`; `roads`, `structures`, `terrain_features` are unused), fills a `<select>` sorted by `elevation_ft` (`viewshed.html:60-71`), draws all 30 as circles sized/coloured by elevation on `satellite-v9` (`:73-103`), prints an info line and a 30-row ranking (`:106-118`). The caveat box (`:46`) says "This shows relative elevation, not a computed sightline" and narrates earlier drafts.

#### pagesB-34 — The name, description and nav copy promise something the page does not do (high) [V]
- **Evidence.** Title/H1 "What They Could See" (`viewshed.html:7,44`); meta/OG/Twitter description "Explore approximate sightlines from key battlefield vantage points, based on real elevation data." (`:8,11,17`); nav card "Real elevation, ranked by vantage point." (`site-nav.js:19`, under "Explore", icon `eye`); the page itself says it is not a sightline (`:46`) and tells the reader about "Earlier drafts" and what "this deployment doesn't have access to" (dev-log voice, H7). Elevation is also not "real" (pagesB-35).
- **Fix, track 1 (honest now; S).** After pagesB-35 corrects the numbers: title **"High Ground: Battlefield Vantage Points"**; H1 "High Ground"; description "Compare the elevation of 30 Gettysburg landmarks, from Cemetery Ridge to Big Round Top, using USGS lidar-derived terrain data."; sub "How high did each place stand above the rest of the field? Pick a landmark to see its elevation and how it ranks."; delete the caveat box and replace it with one neutral line under the map: "Elevation only. Line-of-sight maps are not shown on this page."; nav label "High Ground", desc "How high each landmark stood, from USGS lidar."; keep the URL `viewshed.html` (no redirect churn); update the `og:`/`twitter:` descriptions to match. **Track 2** (section 6) later restores the "What They Could See" name for the real tool, at which point the elevation ranking becomes a tab of that page.
- **Effort** S. **Acceptance:** grep of the deploy finds no "sightline"/"viewshed"/"Earlier drafts" in user-visible strings or meta; title/description/nav agree. **audit_refs:** [H8, H7].

#### pagesB-35 — `terrain.json` coordinates and elevations do not match USGS 3DEP (high) [V measured]
- **Evidence** (method: pulled the 3DEP bare-earth DEM, validated my sampler against USGS EPQS at 7 points to within 1 ft, then sampled every `key_locations` entry; full 30-row table in Appendix A). At the coordinates in `terrain.json`: **mean |listed - 3DEP| = 62 ft, median 45 ft, max 201 ft; 21/30 differ by more than 25 ft and 13/30 by more than 50 ft.** The elevation *numbers* for the big hills are plausible summit heights (Big Round Top listed 785 ft vs 3DEP maximum in the battlefield bbox 784 ft; Little Round Top 650 ft vs 3DEP local maximum 665-668 ft), but the *coordinates* fall on slopes: Big Round Top's point (39.7889, -77.2367) samples at **584 ft** and the true crest (39.7862, -77.2391) is **~365 m** away; Little Round Top's point (39.7933, -77.2394) samples at 505 ft and the crest (39.7920, -77.2367) is ~272 m away; Culp's Hill listed 640 ft samples at 462 ft. Consequences: circles are drawn on the wrong part of hills; the "#N highest of 30" claim (`viewshed.html:106`) is meaningless (ranking by 3DEP at the listed coordinates puts The Angle, Codori Farm and the Peach Orchard above most hills); and any real viewshed computed from these points would be wrong (LRT from the listed point sees **1.8%** of the ground within 5 km, from the crest **52.5%**, section 6.5).
- **Root cause.** Coordinates and elevations were hand-authored/approximated (metadata cites atlases and "USGS topographic data" but not per-point provenance).
- **Fix.** `scripts/fix-terrain.mjs`: for each location choose a *type* (`summit | ridge | farm | woods | valley | structure`); for `summit/ridge` snap to the DEM local maximum within a stated radius (150 m) *after* the human-verified coordinate is checked against an authoritative point (USGS GNIS summit points, NPS tour-stop/monument coordinates, HABS/LoC Warren 1868-69 map: I have not verified any of these sources' coordinates, so record `coords_source` per point and review each by eye on the hillshade); sample elevation from the DEM and store `elevation_ft` (3DEP) plus `elevation_ft_listed_old` for audit, `coord_error_m`, `dem_source`, `dem_retrieved`. Keep human-authored `significance` text. Fix the typo `LOC-029` "Gulp's Hill saddle" (should read Culp's; it appears in the page's select). Add a `vantage:true/false` and `observer_height_m` (default 1.7) and `note_source`. **Effort** M. **Acceptance:** CI check re-samples the DEM at each stored coordinate and requires |stored - sampled| <= 2 ft; ranking test uses the same numbers.

#### pagesB-41 — Page-level defects (medium/low) [C]
- **No labels or popups on the map.** 30 anonymous dots; `.mapboxgl-popup-*` CSS (`viewshed.html:35-36`) is dead code from a removed popup. Add a symbol layer (`text-field:['get','name']`) or DOM markers with accessible names, and make each ranking row a `<button>` that selects the vantage (currently rows are inert `div`s, `:113-118`).
- **Mislabelled list and dead code.** `const nearby = ...slice(0,6)` is never used (`:111`) and the heading "Nearby in elevation" (`:112`) sits above the full 30-row ranking.
- **Unneeded animation.** `flyTo` runs on first load (`:107,123-127`) from the default view to Little Round Top; use `jumpTo` first, `flyTo` afterwards and skip both when `prefers-reduced-motion`.
- **Data hygiene.** The 30 entries mix vantage points with woods, farms and a valley ("Plum Run (valley)"); introduce `vantage:true` and group the select (`<optgroup>`); show `day_relevance` chips (data has it, page ignores it).
- **S3 (map painted incompletely in an emulated viewport).** Likely a test artefact (`#map{height:60vh}` measured against a device-metrics override), but harden: `new ResizeObserver(() => map.resize()).observe(el)` and call `map.resize()` in the `load` handler. [U]
- **CLS.** `#ranking` is filled after map load (`:53,110-118`); render it before the map (data is already loaded) and reserve height.
- **Effort** S. **audit_refs:** [S3, H7].

---

### 4.6 regiment.html (findings pagesB-42 to -48, plus -53)

**What it is.** 261-line page: a search box; on selection it shows a "biography": header, side pill, meta line, four stat cards, "Key action", "Commander", a timeline of dispositions from placement keyframes, matching vignettes, and a map link. It fetches **20 files** (8 OOB + 9 placements + 3 vignettes; 369 KB raw / ~79 KB gzip total) before anything is shown (`regiment.html:119-135`). Deep link `?unit=` works (`:251-257`).

#### pagesB-42 — S1: the page opens as one search box above a floating footer (high) [V]
- **Evidence.** `#bio{display:none}` (`regiment.html:34`) is the only content; `main` has no min-height and the footer has `margin-top:40px` (`site-nav.css:130`), so on tall screens the footer floats under the lone input. Nothing invites exploration (no examples, no browse, no featured units) and the page gives no clue that 466 units exist.
- **Fix (landing state).**
  1. **Browse** tabs: Union / Confederate -> corps -> division -> brigade -> regiments (data: `union_oob_corps_division.json` 8 corps/22 divisions, `union_oob_brigades.json` 51 brigades, `confederate_oob_corps_div_bde.json` 3 corps/9 divisions/37 brigades; parents ids are already on every regiment). Render as an accessible `<details>` tree or drill-down list; each leaf is a link `regiment.html?unit=ID`.
  2. **Featured** cards: "Most casualties", "Highest casualty rate (min. 150 men)", "Famous stands" (20th Maine, 1st Minnesota, 15th Alabama, 6th Wisconsin, 16th Vermont ... from `units_featured`), "By state" chips (the `state` field), "Random regiment".
  3. **Recently viewed** (localStorage try/catch).
  4. **Sticky footer** via the shell (pagesB-12) and `main{min-height:60vh}`.
  5. Update the URL on selection (`history.replaceState(?unit=ID)`) so a bio is shareable and Back works.
- **Effort** M. **Acceptance:** at 1440x900 and 375x812 the first screen shows search + at least 6 featured units + browse; footer at the bottom; Lighthouse mobile >= 98. **audit_refs:** [S1].

#### pagesB-43 — "Mentioned in the battle's narrative moments" finds 1 of 467 units (high) [V]
- **Evidence.** `regiment.html:228-233` lowercases the *full* designation ("20th maine volunteer infantry") and tests `includes()` against vignette title/summary/script, but prose says "20th Maine". Running the exact logic over all 467 regiments: **1 match (8th Illinois Cavalry -> V-001)**. The 20th Maine (`U-20ME`) shows "No narrative vignette specifically names this unit" (`:108`) while V-010 "Chamberlain's Charge" is about them and lists `U-20ME` in `units_featured`. A short-name heuristic (strip "Volunteer Infantry", parentheses) finds 28. `units_featured` holds 40 ids: 10 regiment ids, the rest brigade/division/corps/battery ids that a regiment page must resolve through its parents.
- **Root cause.** Wrong join key; the data already has a proper one.
- **Fix.** Build-time index `unit -> vignettes` from: (a) `units_featured` matched on the regiment id **and its ancestors** (brigade -> division -> corps) with a label "In this brigade's story" for ancestor matches; (b) alias table (short name, nickname, `alias_for`) with word-boundary regex, curated in `data/unit-aliases.json` (e.g. `U-84NY: ["14th Brooklyn","84th New York"]`); (c) optional hand-curated `mentions` ids. Show cards with `panel_summary` + "Read the full story" (Documentary `#v-010`) + "Watch on the map". **Effort** M. **Acceptance:** unit test: `U-20ME` -> [V-010]; `U-1MN` -> [V-012]; >= 60 regiments have >= 1 mention via ancestors; lint prevents an empty mention list for any `units_featured` id.

#### pagesB-44 — Empty timelines although brigade data exists; batteries never loaded (high) [V]
- **Evidence.** Placement records are keyed by `unit_id` and the page looks up `regiment_id` only (`regiment.html:210`). Of 152 placement units only **23 are regiment ids** (20th Maine has 13 keyframes, 1st Minnesota 11, 15th Alabama 7 ...), 96 are brigade ids that are the parents of **422** more regiments, and 33 are batteries/battalions/divisions. So 444/467 timelines show the empty note "it's likely recorded at the brigade level instead of by regiment" (`:102`) when the brigade record could be shown; with a parent fallback **445/467 (95%) get a timeline**. Separately `f.regiments` is the only array read (`:137`), so **Union artillery (50 batteries in `union_artillery.json`), Confederate artillery (45 in `confederate_artillery.json`) and horse artillery (5 + 3)** are never loaded: 103 batteries are unsearchable although the header says "any regiment or battery" (`:66`) and 33 placement units are batteries.
- **Fix.** `positionsFor(unit)`: own keyframes, else parent brigade keyframes labelled "Brigade position (Third Brigade, First Division, Twelfth Corps)", else corps-level note; ingest artillery/horse artillery into the unit index (`unit_type: infantry|cavalry|battery`), giving batteries the same page (`commander`, `gun_count`, `gun_type`, `strength`, `casualties`, `key_action`); the empty state text becomes "Movements for this regiment were recorded with its brigade: [link]". **Effort** M. **Acceptance:** unit tests: `U-20ME` uses its own 13 keyframes; a regiment of `U-XII-1-3` shows Colgrove's Brigade timeline; `U-ART-9MA` (Bigelow) resolves; total searchable units >= 569. **audit_refs:** [H10].

#### pagesB-45 — Raw ids, alias stub, derivable fields left blank, generic/dev text (medium) [V]
- **Evidence.** Meta line `[state, parent_corps_id, parent_brigade_id].join(' · ')` prints "Indiana · U-I · U-I-1-1" (`regiment.html:198-199`). The alias stub `U-14BK` ("14th Brooklyn (alias for U-84NY)", strength 0, casualties 0, `alias_for`) is searchable and openable (H7). `casualty_percentage` is null for **222/467** (`:202` shows a dash) although `casualties/strength` reproduces all 245 present values within 1 point; `days_engaged` is empty for 37; 27 have no commander (but `commander.successor` exists for many and is never shown, and `commander_successions.json` has 25 Union + 17 Confederate); 22 (all cavalry) have no `parent_corps_id`. `key_action` is generic for 127 units (>= 2 duplicates; 20 are literally "Army reserve.") and < 40 characters for 169. Dev text in data: 2nd Maine Battery ("subject of a Gettysburg Animated YouTube vignette"), 16th Vermont ("Two direction changes across several ticks").
- **Fix.** Build a `names.json` (id -> designation, ~728 named ids across the OOB files) and print "I Corps · First Division · First Brigade (Meredith's Iron Brigade)"; skip `alias_for` records in search (fold aliases into the target's search terms; redirect `?unit=U-14BK` to `U-84NY`); compute the rate client-side (`Math.round(1000*c/s)/10 + '%'`, footnoted "calculated from strength and casualties"); render `days_engaged` as "July 1, 2 and 3"; show the succession chain ("Colonel Williams (wounded July 1) -> Lt. Col. Dudley (lost a leg)"); scrub dev text in data (pagesB-10 lint); flag thin `key_action` (< 60 chars) for content enrichment with a review queue (169 units) and show only real text (hide the section if generic). **Effort** M.

#### pagesB-46 — Search: no label, no combobox semantics, weak matching (medium) [C]
- **Evidence.** `<input id="search" placeholder=...>` has no `<label>` (`regiment.html:70`); results are `div role="option" tabindex=0` inside `role="listbox"` without `aria-selected`, the input lacks `role="combobox" aria-expanded aria-controls aria-activedescendant`; Enter in the input does nothing; ArrowDown/Escape are unhandled; only `designation.includes(q)` is matched (`:158`) so "19 Indiana", "20 ME", "Chamberlain", "Iron Brigade", "Pennsylvania cavalry" fail; results are capped at 12 with no count (`:158`); rows are ~36 px; no "no results" row; `pick()` sets `searchEl.value` but never updates the URL.
- **Fix.** Implement the WAI-ARIA 1.2 combobox-with-listbox pattern (input `role=combobox aria-autocomplete=list`, `aria-activedescendant`, ArrowUp/Down, Enter selects, Esc closes/clears, Home/End), visible `<label>`, live region "12 of 47 matches; press Down to choose". Matching: normalise (`th|st|nd|rd`, "Volunteer Infantry", punctuation), tokens over designation + state + commander name + brigade name + aliases, ranked (prefix > token > substring), typo tolerance (small Fuse-like scorer, <= 3 KB, or a prebuilt index), up to 25 results with "Show all N". 44 px rows. **Effort** M. **Acceptance:** tests: "20 me" -> 20th Maine first; "chamberlain" -> 20th Maine; "iron brigade" -> its 5 regiments; keyboard-only selection; axe 0. **audit_refs:** [A2, A6, D2].

#### pagesB-47 — Prerender per-unit pages for search/SEO (medium/large) [C]
- **Evidence.** All unit content is client-rendered on one URL; long-tail queries ("20th Maine at Gettysburg", "1st Minnesota casualties") cannot land on a specific page (T1). 466 distinct regiments + ~103 batteries = ~569 units.
- **Fix.** Build-time generation of `/units/<slug>.html` (static HTML from the OOB JSON, same template as the interactive card, with `<h1>`, key facts as `<dl>`, commander chain, positions, mentions, JSON-LD `Article` + `BreadcrumbList`, canonical, OG image per corps), plus `/units/index.html` (browse tree) and 569 sitemap entries in a **sitemap index** (`sitemap-units.xml`). `regiment.html?unit=` redirects to the static URL (`_redirects` can't read queries; use a tiny JS `location.replace` on load or a Netlify edge function). Internal linking: Documentary/Students/Historian/Find-Ancestor link to unit pages; unit pages link to related vignettes. Keep all facts sourced; attach `sources` per unit (Busey and Martin 1994, OR) from the OOB file metadata. **Effort** L. **Moves:** SEO/traffic (T1), content depth. **audit_refs:** [T1].

#### pagesB-48 — Feature completions to reach A+ (medium/large)
Strength/casualty bar (initial vs casualties, a11y text), casualty rate vs corps/army median ("higher than 92% of Union regiments", computed), position **path on a small map** (keyframe lat/lng, brigade fallback flagged), timeline with clock labels (`TimeModel`), "Same brigade" sibling list, compare-two-units view, share/print, "Find your ancestor" link (the Find-Ancestor page already links here), per-unit sources, "Report a correction" mailto with unit id prefilled. Resolve the `?unit=` scroll-on-load (`regiment.html:248` scrolls the bio into view even on initial deep link; keep at top on load, smooth-scroll only after a user pick and honour reduced motion). **Effort** L.

**Per-page tests (Regiment).** Unit tests for joins; e2e for search (mouse/keyboard), deep link, URL update, landing state, brigade fallback and battery bio; axe 0; Lighthouse mobile >= 98; data requests <= 2.

---

### 4.7 ground-remembers.html (findings pagesB-49 to -52)

**What it is.** 142-line page. Loads Mapbox GL synchronously (`ground-remembers.html:16`), fetches the 9 placement files (694 keyframes) *before* creating the map (`:59-73`), draws a heatmap layer of all keyframes with `p.tick <= maxTick` (`:75-107`), with a range input and an auto-play button (`:45-50,109-134`).

#### pagesB-49 — S2: blank for ~3 s; loading state and waterfall (high) [V sizes; C order]
- **Root cause (ordered).** (1) The sync 481 KB-gzip Mapbox script in `<head>` blocks first paint of the whole page (pagesB-02); (2) only after it executes does the IIFE start 9 fetches (`:64`); (3) only after all resolve is `new mapboxgl.Map` called (`:69`); (4) then style JSON, glyphs/sprites and tiles for `dark-v11` load; (5) only on `load` is the heat source added (`:88-89`). The `#map` box is an empty `#0a0a14` rectangle throughout, and "Loading placement data..." (`:51`) sits *above* it and disappears at step (3), leaving a blank rectangle.
- **Fix.** (a) pagesB-02 pattern; (b) start the data fetch at the top of `<body>` and one combined file (pagesB-04); (c) **poster**: a build-time SVG/PNG of the final heat pattern over a public-domain 3DEP hillshade (no Mapbox tiles, so no ToS issue) as an `<img width height>` inside `#map` (LCP candidate, painted with the HTML); (d) skeleton + `aria-busy` and a text status "Loading map (1 of 2)..."; (e) fade the poster out on `map.once('idle')` after the heat layer is added; (f) create the map *in parallel* with the data and add the source when both are ready. **Effort** S-M. **Acceptance:** filmstrip: header + poster visible < 1.5 s on Slow 4G; LCP <= 2.0 s; `idle` < 4 s; CLS 0. **audit_refs:** [S2].

#### pagesB-50 — The heat measures keyframe authoring density, not fighting (high) [V experiment]
- **Evidence.** `geojsonThroughTick` turns each of the 694 keyframes into a point with `weight = 2 if Artillery else 1` (`ground-remembers.html:83`). Keyframes are sparse (117 of 675 ticks) and uneven (Day 3 ticks 521-600 has 96, Day 3 601-675 has 54); **145/694 (21%) are non-combat dispositions** (Bivouac 65, Line of March 69, Limbered Artillery 10, Reserve 1) yet contribute heat; strength and duration are ignored (a unit that held ground for 40 ticks counts once). Experiment (200 m grid): naive count top cell = The Angle (45 keyframes), duration-weighted engaged-strength top cell = **Culp's Hill** (749,656 strength-ticks vs 332,139 at the Angle); Little Round Top is 5th by count and absent from the weighted top six. The caveat text presents this as "a proxy for where the fighting concentrated" (`:43`). The page also ignores 38 `density_*.json` files (1,110 additional, finer-grained entries incl. regiment-level Pickett's Charge) and `casualty_apportionment.json` (per-tick bell-curve casualty model, sigma 8 ticks infantry, 4 artillery).
- **Fix (heat v2).** Per unit, interpolate positions between consecutive combat keyframes (Δt <= 20 ticks; same interpolation as the map), sample every tick, weight `w = strength_at_tick × dispositionWeight` with `dispositionWeight = {Charging Line:1.5, Line of Battle:1, Deployed Artillery:1.2, Skirmish Line:.6, Mounted/Dismounted Cavalry:.8, Chaotic Retreat:.5, Bivouac/March/Limbered/Reserve:0}` (document every constant), and offer a **second mode: "Where men fell"**: distribute each unit's `casualties` (OOB) over its combat ticks with the bell curve from `casualty_apportionment.json` and accumulate casualty-weighted heat, which is the honest meaning of "The Ground Remembers". Include the density files. Add a mode switch (Presence / Casualties), a legend (colour ramp with "lighter = more men / more losses", units stated), and rewrite the caveat: "Shows where units were recorded most often (presence) or where casualties are estimated to have fallen. Positions are approximate; unit-level casualties are spread evenly along each unit's recorded path." **Effort** M. **Acceptance:** unit test on a synthetic 2-unit dataset; golden top-5 hotspots stored and reviewed by the owner; the caveat states the constants.

#### pagesB-51 — Controls, legend and text alternative (medium) [C]
- **Evidence.** The slider label shows a raw tick ("Reveal through tick 675", `:47`) with no clock/day and no `aria-valuetext`; `#reveal{width:220px}` (`:30`); Play always restarts at tick 1 (`revealEl.value = 1`, `:123`), so Pause -> Play cannot resume; dragging during play fights the interval (`:124-130`); fixed step 8 ticks / 90 ms (~7.6 s whole build-up), no speed control; no reduced-motion handling; play button ~33 px (`:31`); **no legend** for the heat colour ramp; no text alternative for what the map shows; map gestures capture page scroll on phones.
- **Fix.** Label with `TimeModel.label(tick)`, `aria-valuetext` = same, `min-height:44px` controls, full-width slider on mobile, Play resumes from the current value and stops on user input, speed select (1x/2x/4x), `prefers-reduced-motion` -> no auto-play (button jumps in day steps), an on-map legend, a "Top 10 hotspots" list beneath (names from `terrain.json` after pagesB-35 + counts) with `aria-live` summary ("Through July 2, 11:40 pm: 31 hotspots"), `cooperativeGestures: true`. **Effort** M. **audit_refs:** [A2, A3].

#### pagesB-52 — Stale hard-coded counts and dev-log caveat (low) [V]
- "694 recorded unit positions" and "all 675 five-minute snapshots" (`:42-43`) are typed constants; the ticks are not all snapshots (only 117 have keyframes) and "five-minute" is not true in historical time (section 3). Render counts from data and reword: "Built from the site's recorded unit positions (N positions, M units, July 1-3, 1863)". **Effort** S.

**Per-page tests (Ground).** e2e: poster visible before map; slider/Play/Pause/resume; legend present; hotspots list; axe 0; Lighthouse mobile perf >= 90 (>= 95 with facade), CLS <= 0.02; unit tests for heat v2.

## 5. Shared data work these pages depend on

### pagesB-53 — Name index, true unit counts, VI Corps gap, vignette schema v2 (medium) [V]
- **True counts.** The OOB files loaded by the Regiment page hold **467 records, one of which is the alias stub `U-14BK`** (strength 0), i.e. **466 distinct regiments/cavalry regiments** (274 Union, 193 Confederate incl. the stub); artillery is separate: **50 Union batteries, 45 Confederate batteries, 5 + 3 horse batteries = 103**. So the correct statement is "466 regiments and 103 batteries (569 units)", not "467 regiments/batteries" (home/Search) nor "445+" (Help -> About). Generate a `unit_counts` object at build time and inject it into every string that quotes a count (H10).
- **Name index.** 728 ids carry a `designation`/`name` across the OOB files. 144 of the 152 unit ids used by `placements_*.json` resolve; the 8 that do not are the VI Corps brigades `U-VI-1-1 ... U-VI-3-3` (VI Corps is absent from `union_oob_brigades.json`): author those 8 brigade records (names/commanders to be researched from the OR/Busey and Martin; I have not verified them). Publish `names.json` (id -> {name, short, type, side, parent}) used by Sandbox, Regiment, Ground (hotspot labels), Search and the app.
- **Vignette schema v2** (needed by pagesB-15/-21/-43): `historical_time` (ISO local), `time_confidence`, `time_source`, `student_summary`, `sources[]`, `units_featured` (exists), `order`, `kind` (`moment|epilogue`), `lat/lng` (exists).
- **Data lint** (`scripts/lint-data.mjs`, CI): every `units_featured` id resolves; every placement id resolves; every disposition is in the shared enum; no display string matches the dev-copy regexes; every vignette has `historical_time`; numbers quoted in copy come from `unit_counts`; JSON schema validation. **Effort** M.

---

## 6. H8 in depth: making "What They Could See" a real viewshed (feasibility, design, plan)

### 6.1 Decision
Two tracks. **Track 1 (S, immediately): rename honestly** (pagesB-34) and fix the elevation data (pagesB-35). **Track 2 (L-XL): build a real, client-side, terrain-based viewshed** on public-domain USGS elevation data, with clear statements of what is and is not modelled, and only then restore the "What They Could See" name. Verdict: **feasible, small payload, fast enough for phones, no extra vendor dependency**; the only hard part is honest obstruction modelling (6.7).

Mapping of section 6 to finding ids: **pagesB-36** = 6.2-6.3 (DEM pipeline), **pagesB-37** = 6.4-6.5 (worker, algorithm, overlay, measured results), **pagesB-38** = 6.6 (UX/a11y/mobile), **pagesB-39** = 6.7 (obstruction modelling and validation), **pagesB-40** = 6.8 (Mapbox terrain boundary and 3D first-person view); 6.9 is the phase plan. Prerequisites are pagesB-34/-35 (section 4.5).

### 6.2 Data source: USGS 3DEP (verified access)
- **Coverage/resolution [V].** EPQS at Little Round Top returned `resolution: 1` (metres), `AcquisitionDate: 11/4/2017`, `rasterId: 122544`: 1 m lidar-derived bare-earth DEM exists for the battlefield. The service description of `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer` is "USGS 3D Elevation Program (3DEP) Bare Earth DEM", pixel type F32, max export 8000x8000, capabilities Image/Metadata/Catalog.
- **Licence [V via docs summary, verify wording].** USGS 3DEP page: products are "available, free of charge and without use restrictions"; USGS pages state USGS-authored data are U.S. public domain and ask for credit ("U.S. Geological Survey"). Use credit line: "Elevation: U.S. Geological Survey 3D Elevation Program (3DEP)". Bulk sources for production: The National Map download (1 m project DEMs, cloud-optimised GeoTIFF), Rockyweb, and the AWS public dataset (per USGS page).
- **Extent to fetch.** `terrain.json` `battlefield_bounds` is N 39.85, S 39.77, E -77.18, W -77.29 (9.6 x 9.1 km). East Cavalry Field (39.8317, -77.1972) and Seminary/Herr Ridge points sit within 2-3 km of the edge, so a 5 km radius clips. Fetch a **margin**: W -77.32, E -77.14, S 39.74, N 39.88 (~13.4 x 13.3 km) at 10 m, plus the 9.6 x 9.1 km core at 5 m.
- **Pitfall found in my prototype [V].** My first export (EPSG:4326, `size` chosen for square metres) did not line up with EPQS (33-87 ft error at test points). Re-exporting in a **projected CRS with exactly square pixels** (`bboxSR=imageSR=26918`, size = bbox/5 m = 1928 x 1824) matched EPQS to within 1 ft at 7 points. Either the service adjusted the extent to preserve aspect or my mapping assumption was wrong; the pipeline must therefore always (a) export square-pixel rasters, (b) verify 20 random points against EPQS (|delta| <= 1 ft) in CI. Also: UTM zone 18 is rotated ~1.4 degrees relative to Web Mercator (grid convergence) so for the map overlay export in **EPSG:3857** (pixel = 5 m ground / cos(39.8 degrees) = ~6.5 m mercator) so the canvas aligns with Mapbox without resampling.

### 6.3 DEM products, formats, sizes, hillshade
Measured on my 9.6 x 9.1 km 3DEP grids (0.1 m quantisation; UTM prototype rasters), all [V]:

| Grid | Pixels | Raw Int16 | zlib | delta+zlib | **Terrain-RGB PNG (0.1 m)** |
|---|---|---|---|---|---|
| 5 m | 1928 x 1824 (3.5 M) | 7.03 MB | 5.46 MB | 3.00 MB | **1.65 MB** |
| 10 m | 964 x 912 (0.88 M) | 1.76 MB | 1.41 MB | 0.86 MB | **0.54 MB** |
| 15 m | 642 x 608 | 0.78 MB | 0.64 MB | 0.41 MB | 0.28 MB |
| 30 m | 321 x 304 | 0.20 MB | 0.16 MB | 0.12 MB | 0.09 MB |

- **Choice:** Terrain-RGB PNG using the Mapbox *formula* `height = -10000 + (R*65536 + G*256 + B) * 0.1` (an open formula; the data are ours). It decodes natively (`createImageBitmap` + `OffscreenCanvas` in a worker), is CDN/browser cacheable (`/data/dem/gettysburg-10m.<hash>.png`, `immutable`), and is inspectable. Pitfall: decode with `createImageBitmap(blob, {colorSpaceConversion:'none', premultiplyAlpha:'none'})` and strip gAMA/iCCP chunks at build time so colour management cannot alter the bytes. 0.1 m quantisation costs at most +/-5 cm, negligible for 1.7 m observers.
- **Tiering:** phones fetch 10 m (0.54 MB; ~1 MB for the 13 x 13 km margin extent, estimated by scaling); desktops fetch 10 m first and upgrade to 5 m (1.65 MB) when idle. DEM is fetched only when the user opens/uses the viewshed (never on page load).
- **Hillshade:** compute a multi-directional hillshade from the same DEM at build (public-domain derivative) and use it as (a) the **poster** for the map pages (pagesB-49) and (b) an optional non-Mapbox base layer. Aggregation: prefer averaging 1 m to 5/10 m (`gdalwarp -r average`) over point-sampling.
- **Alternative source (unverified):** AWS "Terrain Tiles" (Terrarium PNG) exist (a z13 tile returned HTTP 200 [V]) but resolution, licence text, CORS and attribution were not checked; keep as a fallback idea only.

### 6.4 Algorithm and worker (spec)
- **Method:** radial ray casting with a running maximum ground slope (R2-family; XDraw and Van Kreveld sweep are alternatives). Sample the DEM bilinearly; apply Earth curvature with atmospheric refraction: `drop = d^2 (1 - k) / (2 R_e)`, `R_e = 6,371,000 m`, `k = 0.13` (at 5 km: 1.7 m; at 2 km: 0.27 m). A target cell is visible if `(z_ground(d) + h_target - z_eye) / d >= maxSlopeSoFar` (`h_target` default 1.7 m, `z_eye = z_ground(observer) + eye_height`). Number of rays `N = ceil(2*pi*R / cell)` (6,283 for R = 5 km, cell = 5 m) so adjacent rays are <= one cell apart at the edge; step = one cell.
  ```js
  // viewshed.worker.js (module worker)
  onmessage = async ({data}) => {
    if (data.type === 'init') { /* fetch PNG -> createImageBitmap(none) -> OffscreenCanvas -> Float32Array dem */ postMessage({type:'ready'}); }
    if (data.type === 'compute') {
      const {x0, y0, eye, tgt, R, k = 0.13} = data, mask = new Uint8Array(W*H);
      const z0 = bil(x0, y0) + eye, N = Math.ceil(2*Math.PI*R/cell), K = Math.floor(R/cell);
      for (let r = 0; r < N; r++) {
        const th = 2*Math.PI*r/N, sx = Math.sin(th), cy = -Math.cos(th); let maxS = -Infinity;
        for (let s = 1; s <= K; s++) {
          const x = x0 + s*sx, y = y0 + s*cy; if (x < 0 || y < 0 || x >= W-1 || y >= H-1) break;
          const d = s*cell, z = bil(x, y) - d*d*(1-k)/(2*RE);
          if ((z + tgt - z0)/d >= maxS) mask[((y+.5)|0)*W + ((x+.5)|0)] = 1;
          const g = (z - z0)/d; if (g > maxS) maxS = g;
        }
        if ((r & 255) === 0) postMessage({type:'progress', done: r/N});     // cancellable via generation id
      }
      postMessage({type:'result', mask, stats: computeStats(mask)}, [mask.buffer]);
    }
  };
  ```
  Stats: visible area per ray sector (`d * dtheta * cell`), % visible within 1/2/5 km, farthest visible distance per 10 degree sector (36-row table), nearest "dead ground" (visible fraction within 500 m). Point-to-point LOS with elevation profile (SVG) and first blocker.
- **Overlay:** `ImageData` from mask (visible = translucent gold, hidden = subtle dark or transparent, user toggle) -> `image` source with mercator-aligned corners and `source.updateImage({url: blobUrl})`; layer `raster` with `raster-opacity` slider, `raster-resampling: 'nearest'` (CSP already allows `blob:`/`data:` images and `worker-src blob:`).
- **Cancellation/UX:** each compute has a generation id; new clicks cancel older; progress bar; `prefers-reduced-motion` respected.

### 6.5 Measured results (prototype; bare earth; eye = target = 1.7 m; R = 5 km; k = 0.13) [V]
Timings: numpy 7,200 rays x 1,000 steps = 7.2 M samples in **0.33-0.42 s**; Node/V8 single thread on the 5 m grid: R = 5 km **236 ms**, R = 3 km / 4,000 rays **56 ms**, R = 5 km / 3,600 rays / 10 m step **44 ms**. Phones are typically several times slower than desktop V8 (not measured): plan 0.3-1.5 s with a progress state and default R = 3 km, 10 m on mobile. Memory: Float32 5 m grid 14 MB, 10 m grid 3.5 MB.

| Vantage (coordinates as used) | Ground | Visible, area-weighted within 5 km (of DEM-clipped area) | Within 2 km |
|---|---|---|---|
| Little Round Top crest (39.7920, -77.2367) | 665 ft | **52.5%** of 62.8 km2 (33.0 km2) | 72.3% |
| Big Round Top crest (39.7862, -77.2391) | 783 ft | **76.8%** of 56.2 km2 (43.2 km2) | 90.9% |
| The Angle (`terrain.json` coords) | 579 ft | 10.6% of 75.3 km2 (8.0 km2) | 24.8% |
| Seminary Ridge central (`terrain.json`) | 542 ft | 7.3% of 64.3 km2 | 20.2% |
| Cemetery Hill (`terrain.json`; 100+ m off the crest) | 533 ft | 3.3% of 68.2 km2 | 11.0% |
| Lutheran Seminary (`terrain.json`) | 555 ft | 8.9% of 61.0 km2 (farthest 4.7 km) | 28.6% |

Sensitivity (same code) [V]:
- **Resolution:** 5 m vs 10 m vs 15 m differ by <= 1.4 percentage points (LRT 52.5/53.0/53.5; BRT 76.8/76.7/75.8; Angle 10.6/11.4/11.9; Seminary 7.3/7.5/7.6): **a 10 m DEM is sufficient** for area statistics.
- **Target height dominates:** LRT with target 0 m (ground itself) 33.2% vs 1.7 m (a standing man) 52.5%; the UI must define "visible" (default: a standing soldier) and expose it.
- **Eye height:** 1.7 m -> 2.7 m -> 10 m (tree/tower/cupola scale): 52.5% -> 53.5% -> 59.3%.
- **Coordinate error is decisive:** Little Round Top at the `terrain.json` point (a 505 ft slope) sees **1.8%**; at the crest **52.5%**. Coordinate QA (pagesB-35) is a prerequisite for any published number.
- **Coordinate consistency canary:** bare-earth LOS from the Garnett step-off point in `density_day3_picketts_charge.json` (39.8233, -77.2461) to the "Copse of Trees" in `terrain.json` (39.8117, -77.2350) is **blocked** by ~5 m at 125 m from the origin even for a 10 m-tall target, i.e. one of the two coordinates (or both) is inconsistent with the terrain [V number; U interpretation]. From the LRT crest the Wheatfield, Devil's Den, Peach Orchard, Angle and Cemetery Hill points (as listed) are all visible with 0.8-2.1 m clearance. Use such site-data-derived cases as regression tests once coordinates are fixed.

### 6.6 UX specification (A+)
- **Vantage list:** ~12-15 curated points (`vantage:true`) with `observer_height_m`, `day`, `time_range`, `why_it_matters`, `source`; "Place your own" by tapping the map (crosshair); a "What they were doing here" line linking to the related vignette (e.g. Little Round Top -> V-009 Vincent).
- **Controls:** eye height (standing 1.7 m default; a slider 1-15 m with presets only where sourced), target type (standing soldier 1.7 m / ground level / building), range (1-8 km; default 3 km mobile, 5 km desktop), overlay opacity, "show hidden ground", "compare two vantage points" (A only / B only / both), point-to-point LOS tool with profile. All controls >= 44 px, labelled, keyboard operable; results announced through an `aria-live` summary.
- **Outputs:** overlay + legend; stats card (visible km2, % within 1/2/5 km, farthest visible with bearing and named landmark, notable hidden areas such as named dead ground); sector table (36 rows) as the screen-reader/keyboard alternative and CSV download; permalink `?vp=LOC-003&eye=1.7&r=5000`.
- **Honest labelling (always visible, one line):** "Terrain only (modern ground surface, USGS 3DEP). Woods, buildings and smoke are not included." Switches to "With modelled 1863 woods and buildings" when the obstruction layer (6.7) is on; a "How this works" disclosure explains method, assumptions, and units.
- **Mobile:** bottom-sheet controls, cooperative gestures, 10 m DEM, progress bar, results summary first, map second; landscape support.
- **Not modelled and stated:** powder smoke, haze/weather, dust, individual trees, crop heights, time of day, observer acuity, later earthworks/cuts.

### 6.7 Obstruction modelling: limits and staged approach (pagesB-39)
- **Reality check.** 3DEP is *bare earth*: no trees, buildings, fences, smoke. Modern tree cover differs from 1863; the NPS has been rehabilitating 1863 woodlots/orchards since the 1999 General Management Plan (NPS pages found via search), so modern canopy is only a partial proxy; the town and farm buildings also changed.
- **Stage 0 (ship first):** terrain only + explicit label. Already a large improvement over the current page.
- **Stage 1:** modern surface as an *upper bound* (first-return lidar DSM minus DTM = canopy/building height, from 3DEP point clouds); useful to show "today's view" (a legitimately different product: what a visitor sees now), not for 1863 claims. NLCD tree canopy is 30 m resolution: too coarse.
- **Stage 2 (1863 layer):** digitise woodlots, orchards, thickets and built-up areas from period maps (the Warren 1868-69 topographic map at the Library of Congress; Bachelder 1863; the NPS 1863/1868/1872 map set referenced in NPS vegetation reports) and/or the NPS Vegetation Mapping Inventory geospatial data for GETT (listed on catalog.data.gov; licence and fitness to be verified); attach *assumed* heights per class (mature woods, orchard, brush, farm building, town building) with each assumption cited or labelled as an assumption; add to the DTM to form a DSM; UI toggle "Terrain only / With modelled 1863 woods and buildings". Effort is dominated by digitising and sourcing (XL); accuracy statement must accompany every output.
- **Accuracy notes:** lidar vertical accuracy is a project-level metadata value (EPQS raster 122544: read the project report before quoting a number); resampling to 5-10 m removes walls/ditches under one cell; the 2017 surface includes modern road and railroad cuts.
- **Validation (pagesB-39):** (1) synthetic-DEM unit tests (flat plane all visible; single ridge shadow length = h / tan(angle); curvature: on a flat plane with eye 1.7 m and k = 0.13 the bare ground is hidden beyond ~5.0 km (horizon = sqrt(2 R_e h / (1-k))) and a 1.7 m target vanishes beyond ~10 km); (2) golden tests from section 6.5 (+/-1.5 points); (3) cross-check against an independent implementation (GDAL `gdal_viewshed` or GRASS `r.viewshed` with the same eye/target/range/curvature: not run here, GDAL is not installed); (4) a **historical assertion set**: >= 10 documented sightline claims from primary/secondary sources (signal station and cupola observations, what was visible from the Seminary cupola per the NPS/Seminary GIS study mentioned in search results, the "Copse of Trees" as an aiming point, dead ground along Plum Run, the Emmitsburg Road swale) each with a citation and an expected verdict; where the model disagrees, publish the disagreement in the "How this works" note instead of tuning until it agrees.

### 6.8 Mapbox terrain-DEM v1: what is allowed, and the boundary I recommend (pagesB-40)
- **Facts (from Mapbox documentation pages fetched 2026-09-29; summaries, quote-check before relying):** tileset `mapbox://mapbox.mapbox-terrain-dem-v1`; `height = -10000 + ((R*256*256 + G*256 + B) * 0.1)`; data up to zoom 14 (about 7.3 m per pixel at 39.8 degrees by my arithmetic: 156543 x cos(39.8 degrees) / 2^14); multiple global sources with differing vertical datums; **available only through Mapbox SDKs (GL JS/iOS/Android/Flutter), not the Raster Tiles API**; attribution required. The Mapbox Terms summary states tiles may not be stored/cached beyond normal browser behaviour, bulk/automated extraction is restricted, and derivative datasets/independent analysis outside licensed use are not allowed. I did **not** test the tileset with the site's token and I am not giving legal advice.
- **Recommendation.** Do **not** feed Mapbox DEM values into the viewshed (sampling `queryTerrainElevation` at scale is "extraction/analysis" and mixes datums and resolutions); compute from USGS 3DEP (public domain). Use Mapbox terrain for **rendering only**:
  ```js
  map.addSource('mapbox-dem', {type:'raster-dem', url:'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize:512, maxzoom:14});
  map.setTerrain({source:'mapbox-dem', exaggeration:1.0});     // 1.0 so heights are honest
  map.setFog({});                                              // haze, not smoke
  const cam = map.getFreeCameraOptions();
  cam.position = mapboxgl.MercatorCoordinate.fromLngLat(vantage, groundFrom3DEP + eye);   // use OUR ground height to avoid datum mismatch/underground camera
  cam.lookAtPoint(target); map.setFreeCameraOptions(cam);
  ```
  This gives a **first-person "look toward X" 3D view** at the vantage point (bare earth; same "terrain only" caveat) without any data extraction, using the existing token and GL JS 3.24.1. Keep the Mapbox logo/attribution visible. Effort M; ship after the 2D overlay.

### 6.9 Phased plan for Track 2 (with acceptance tests)
| Phase | Deliverable | Effort | Acceptance |
|---|---|---|---|
| V0 | Rename/copy (pagesB-34) + corrected coordinates/elevations (pagesB-35) | S + M | grep/CI checks in 34/35 |
| V1 | `scripts/build-dem` (export, quantise, verify vs EPQS, hillshade, meta.json), files under `/data/dem/` | M | 20-point EPQS check <= 1 ft; PNG sizes <= 0.6 MB (10 m core) / <= 1.7 MB (5 m); hashed, immutable |
| V2 | Worker + overlay + minimal UI (vantage select, eye/target/range, stats) | L | golden numbers +/-1.5 pts; 10 m compute < 400 ms desktop, < 1.5 s mid-phone; INP < 200 ms; no long tasks on main thread |
| V3 | Point-to-point LOS + profile, sector table, permalinks, a11y, mobile sheet, copy | M | axe 0; keyboard-only completion; Lighthouse mobile >= 90 (>= 95 with facade) |
| V4 | Mapbox 3D first-person view (rendering only) | M | camera never below ground at all 15 vantages; attribution visible |
| V5 | Obstruction layer (1863 woods/buildings) + validation set | XL | >= 10 cited assertions evaluated; accuracy statement published |
| V6 | E2E/regression suite in CI | M | all of the above run on every deploy |

## 7. Shared modules and build steps these pages should use (one-time investment; every page gets simpler)

```
/css/tokens.css      colours (with AA-checked pairs), type scale (>= 14 px body min), spacing, --tap:44px, radii, motion (respect prefers-reduced-motion)
/css/shell.css       body flex column + sticky footer, header/main/footer, .btn, .card, .chip, .skip, .sr-only, focus ring, [data-theme="students"]
/js/config.js        window.GTBG = { MAPBOX_TOKEN, MAPBOX_VERSION, DEM_URLS }          (pagesB-11)
/js/links.js         mapLink({tick, unit, vignette, lat, lng, z})                       (pagesB-01)
/js/time-model.js    dayOf, tickInDay, dateOf, clockMinutes, formatClock, label, tickForClock, simMinPerTick (pagesB-05, section 3.5)
/js/data.js          loadJSON (timeout/retry/ok-check), loaders for *.all.json + names.json, showError()   (pagesB-03/04)
/js/map-loader.js    loadMapbox(), createMap(container, {skeleton, cooperativeGestures, onError})          (pagesB-02/11)
/js/a11y.js          announce() live region, focusHeading(), roving-tabindex helper, reducedMotion()
/js/combobox.js      accessible combobox/listbox (Regiment now; reusable for Search/Historian)
/js/geo.js           haversine, bearing, mercator helpers, DEM decode/bilinear (shared by viewshed + sandbox distance)
/js/viewshed/        viewshed.worker.js, core.js (pure functions, unit-testable in Node), ui.js
/data/dem/           gettysburg-10m.<hash>.png, gettysburg-5m.<hash>.png, meta.json, hillshade.<hash>.webp (section 6)
/data/               vignettes.all.json, placements.all.json, oob.all.json, names.json, unit-aliases.json, manifest.json (hashed)
scripts/             build-data.mjs, build-dem.mjs, fix-terrain.mjs, prerender-pages.mjs, prerender-units.mjs, lint-data.mjs, lint-copy.mjs, make-og.mjs
```
Build tooling for a solo dev: plain Node scripts (no framework) invoked by a `npm run build:static` that writes into the publish dir; the map app keeps its own Vite build (N1: rebuild from reconstructed source is a separate effort). Every script is idempotent and has a `--check` mode used in CI. Effort to stand up: M.

## 8. Test plan for these seven pages

**Global gates (CI on every PR/deploy preview):**
| Gate | Tool | Threshold |
|---|---|---|
| Lighthouse (mobile + desktop, 3 runs, median) | Lighthouse CI | non-map pages: Perf >= 95, A11y 100, BP >= 95, SEO 100; map pages: Perf >= 90 (>= 95 with facade), same others; LCP <= 2.5 s, FCP <= 1.8 s, CLS <= 0.1, TBT <= 200 ms, TTFB <= 0.8 s; JS <= 60 KB (non-map) |
| Accessibility | axe-core via Playwright (wcag2a, wcag2aa, wcag22aa, best-practice) at 320, 375, 768, 1440 and landscape 812x375 | 0 violations; manual NVDA/VoiceOver script per page before release |
| Console | Playwright `page.on('console'/'pageerror')` | 0 errors, 0 warnings |
| Layout | Playwright `PerformanceObserver('layout-shift')`; overflow check `document.documentElement.scrollWidth <= innerWidth` at 320-2560 | CLS sum <= 0.05; no horizontal scroll |
| Targets/type | Playwright script measuring bounding boxes and computed font sizes | interactive >= 44x44 (touch), text >= 12 px (body >= 14 px) |
| Data | `lint-data.mjs`, `lint-copy.mjs` | zero findings (section 5, pagesB-10) |
| Links | link checker over prerendered pages + `mapLink` contract test | 0 broken; deep links land at the requested tick/unit/vignette |
| Visual regression | Playwright screenshots (desktop, mobile, dark only) | reviewed diffs |

**Unit tests (node:test):** `time-model` (3.5); `joins` (vignette mentions incl. ancestors: `U-20ME -> V-010`; brigade fallback; alias redirect `U-14BK -> U-84NY`); `heat` (synthetic 2-unit dataset, weights documented); `viewshed core` (flat plane, ridge shadow, curvature horizon 4.99 km, golden numbers +/-1.5 pts from section 6.5, 5 m vs 10 m parity <= 2 pts); `dem-decode` (round trip to 0.1 m); `combobox` keyboard model; `sandbox` distance/bearing math and undo/redo.

**Per-page e2e checklist:**
- **Documentary:** 24 items, paragraphs (>= 5 `<p>` per moment), hash sync, Prev/Next bounds, keyboard guard, read-aloud controls (feature-detected), "Watch on map" link contract, noscript shows all moments.
- **Students:** tabs semantics, hash `#day-2`, Simple/Detailed toggle, FK lint on `student_summary`, footer contrast, prerender parity.
- **Aftermath:** `<time>` validity, citations present, axe 0, no JS.
- **Sandbox:** panel inside map box at 3 positions x 2 viewports, mouse/touch/click-to-move/keyboard, undo/redo, unit names not ids, disposition shows truth for all 694 keyframes, scenario labels equal `TimeModel.label`, mobile no horizontal scroll, `map.loaded()` race (throttled CPU).
- **Viewshed:** corrected coordinates within 2 ft of DEM, ranking uses DEM, labelled map, worker result matches golden, LOS profile, permalink round trip, 3D camera never below ground at all vantages, reduced motion.
- **Regiment:** landing state, search (mouse/keyboard/typos/aliases), URL sync, brigade fallback, battery bios, mentions, no raw ids, `units/` prerender parity, <= 2 data requests.
- **Ground:** poster before map, `idle` timing, legend, Play/Pause/resume, hotspots list, Presence/Casualties modes, cooperative gestures, reduced motion.

## 9. Uncertainties and things I could not verify

1. **No page was run** (browser tools were off-limits): sandbox panel offset, documentary mobile wrapping, sandbox select overflow, and `map.loaded()` at `load` are from code reading; each has a Playwright acceptance test that will confirm or refute it in minutes.
2. **Deep-link claim (pagesB-01)** rests on exhaustive grep of the bundle/index/older deploys; a 2-minute manual test (`/?tick=300`) settles it. If a reader exists in code I could not see (e.g. dynamically constructed keys), the *contract mismatch* (`tick` vs `t`, `unit` vs `u`) would still need unifying.
3. **Mapbox Terms and terrain-DEM restrictions** are from WebFetch summaries of docs.mapbox.com and mapbox.com/legal/tos; read the exact clauses (and GL JS billing for terrain tile requests) before shipping 3D terrain.
4. **USGS/NPS/LoC licences and datasets** (3DEP public domain per USGS pages; NPS vegetation inventory and historic map digitisation) need a final read before publishing derived files; GNIS/NPS/HABS coordinates were not checked.
5. **Phone worker timings** for the viewshed are extrapolated (desktop Node/V8 measured; phones not).
6. **Flesch-Kincaid figures** use a heuristic syllable counter (relative comparison only).
7. **Historical facts** in Aftermath/Students candidates are flagged for verification; I added no new facts to the plan as truth.
8. **og:image**: the PNG is demonstrably malformed (Pillow and inflate size check); behaviour in specific scrapers/browsers was not tested.
9. **Time-model Option A vs B** and **whether to keep the "What They Could See" name** are owner decisions.

## 10. Finding index (all `pagesB-NN`)

| ID | Title | Sev | Effort | audit_refs |
|---|---|---|---|---|
| 01 | Deep links from these pages into the map are dead | critical | M | [] |
| 02 | Render-blocking Mapbox GL JS + serial waterfall | high | S-M | S2, P4 |
| 03 | No error/retry/empty/offline states on data fetches | high | S | [] |
| 04 | Request fan-out, data bundling, cache/SW strategy | medium | M | P3 |
| 05 | Adopt a single shared time model | high | M | C3, C4, H9 |
| 06 | Layout-shift risk (placeholders, footer, nav mount) | medium | S | P1 |
| 07 | Accessibility baseline missing | high | M | A1-A6, D2 |
| 08 | Touch targets, type sizes, contrast | medium | S | A1, A3, A4, S4 |
| 09 | SEO/social: malformed og:image, twitter tags, JS-only content, duplicate URLs | medium | M-L | T1, T3, E2 |
| 10 | Dev-log copy and typography hygiene | medium | S-M | H7 |
| 11 | Hard-coded Mapbox token/version, no map error handling | medium | S | X1, X3 |
| 12 | Shared shell: tokens, sticky footer, back-link semantics | medium | M | S1 |
| 13 | Test harness for these pages | high | L | - |
| 14 | Documentary narrative renders as one paragraph | high | S | - |
| 15 | Documentary clock/eyebrow (raw tick beside 7:30 prose) | high | M | C4 |
| 16 | Documentary mobile nav row/targets | medium | S | S4, A3 |
| 17 | Documentary keyboard/SR/deep-link/focus | medium | M | A6, D2, H2 |
| 18 | Documentary feature completions (read-aloud, map, sources, prerender) | medium | L | - |
| 19 | Documentary small defects (hard-coded 24, tie sort, epilogue) | low | S | - |
| 20 | Students theme inconsistency (contrast 2.53 footer) | medium | M | A1 |
| 21 | Students content not written for students (FK 11.1) | high | L | - |
| 22 | Students tabs/injection/no-JS/link semantics | medium | S-M | A6 |
| 23 | Students classroom kit / feature completions | medium | L | - |
| 24 | Aftermath thin content, no citations, weak semantics | medium | L | - |
| 25 | Aftermath fact-check list | low | S | - |
| 26 | Sandbox edit panel mispositioned | high | S | - |
| 27 | Sandbox not operable by touch/keyboard (WCAG 2.5.7) | high | M | A3, D2 |
| 28 | Sandbox scenario labels contradict data | high | S-M | C4 |
| 29 | Sandbox disposition control wrong and cosmetic | medium | S-M | - |
| 30 | Sandbox change-log spam, raw ids, no undo | medium | M | - |
| 31 | Sandbox fragile first render, no resize/error handling | low | S | - |
| 32 | Sandbox mobile layout and a11y of chrome | medium | M | A1, A3, A4, S4 |
| 33 | Sandbox feature completions | low | L | - |
| 34 | Viewshed name/description/nav overpromise | high | S | H8, H7 |
| 35 | terrain.json coordinates/elevations vs USGS 3DEP | high | M | H8 |
| 36 | Real viewshed: DEM pipeline (3DEP) | medium | M | H8 |
| 37 | Real viewshed: worker, algorithm, overlay | high | L | H8 |
| 38 | Real viewshed: UX/a11y/mobile spec | medium | M | H8 |
| 39 | Real viewshed: obstruction modelling and validation | medium | XL | H8 |
| 40 | Mapbox terrain-DEM boundary and 3D first-person view | medium | M | H8 |
| 41 | Viewshed page defects (labels, dead code, resize, CLS) | medium | S | S3, H7 |
| 42 | Regiment landing state (S1) | high | M | S1 |
| 43 | Regiment vignette mentions find 1 of 467 | high | M | - |
| 44 | Regiment timeline fallback + batteries never loaded | high | M | H10 |
| 45 | Regiment raw ids, alias stub, blank derivable fields, dev text | medium | M | H7 |
| 46 | Regiment search a11y/matching | medium | M | A2, A6, D2 |
| 47 | Regiment per-unit prerendered pages for SEO | medium | L | T1 |
| 48 | Regiment feature completions | medium | L | - |
| 49 | Ground S2 loading/waterfall/poster | high | S-M | S2 |
| 50 | Ground heat measures keyframe density, not fighting | high | M | - |
| 51 | Ground controls, legend, text alternative | medium | M | A2, A3 |
| 52 | Ground stale hard-coded counts/caveat | low | S | - |
| 53 | Name index, true unit counts, VI Corps gap, schema v2 | medium | M | H10 |

## Appendix A. `terrain.json` vs USGS 3DEP (bare earth, 5 m grid, sampled with bilinear interpolation; validated against EPQS to within 1 ft)

Columns: listed elevation (ft) | 3DEP at the *listed coordinates* (ft) | delta | maximum within a 200 m half-width window (ft) and distance to it (m) | position of that maximum. The window maximum is a *diagnostic* of how far the listed point sits from higher ground, not a summit determination (Culp's Hill and Cemetery Hill crests lie outside 200 m).

| ID | Name | Listed | 3DEP | Delta | Max (200 m win.) | Dist | Max at (lat, lng) |
|---|---|---|---|---|---|---|---|
| LOC-001 | Cemetery Hill | 630 | 533 | -97 | 583 | 135 | 39.8191, -77.2246 |
| LOC-002 | Culp's Hill | 640 | 462 | -178 | 535 | 224 | 39.8160, -77.2179 |
| LOC-003 | Little Round Top | 650 | 505 | -145 | 651 | 283 | 39.7915, -77.2370 |
| LOC-004 | Big Round Top | 785 | 584 | -201 | 734 | 276 | 39.7871, -77.2388 |
| LOC-005 | Devil's Den | 620 | 522 | -98 | 549 | 202 | 39.7938, -77.2424 |
| LOC-006 | The Wheatfield | 570 | 516 | -54 | 535 | 160 | 39.7984, -77.2425 |
| LOC-007 | Peach Orchard | 550 | 563 | +13 | 591 | 145 | 39.8011, -77.2493 |
| LOC-008 | Trostle Farm | 530 | 550 | +20 | 566 | 276 | 39.8007, -77.2467 |
| LOC-009 | The Angle | 570 | 579 | +9 | 604 | 203 | 39.8135, -77.2355 |
| LOC-010 | Seminary Ridge (central) | 590 | 542 | -48 | 578 | 195 | 39.8201, -77.2466 |
| LOC-011 | Cemetery Ridge (central) | 570 | 563 | -7 | 568 | 262 | 39.8044, -77.2329 |
| LOC-012 | McPherson's Ridge | 570 | 539 | -31 | 560 | 141 | 39.8312, -77.2515 |
| LOC-013 | Herbst Woods | 560 | 516 | -44 | 558 | 190 | 39.8305, -77.2587 |
| LOC-014 | Oak Ridge | 600 | 528 | -72 | 559 | 205 | 39.8304, -77.2429 |
| LOC-015 | Oak Hill | 620 | 513 | -107 | 527 | 142 | 39.8351, -77.2367 |
| LOC-016 | Barlow's Knoll | 550 | 508 | -42 | 523 | 214 | 39.8362, -77.2307 |
| LOC-017 | Railroad Cut (western) | 555 | 562 | +7 | 571 | 228 | 39.8368, -77.2487 |
| LOC-018 | Herr Ridge | 570 | 546 | -24 | 558 | 187 | 39.8305, -77.2587 |
| LOC-019 | Bliss Farm | 540 | 554 | +14 | 575 | 283 | 39.8196, -77.2468 |
| LOC-020 | Benner's Hill | 610 | 487 | -123 | 525 | 276 | 39.8240, -77.2156 |
| LOC-021 | East Cavalry Field | 500 | 497 | -3 | 552 | 230 | 39.8306, -77.1950 |
| LOC-022 | Lutheran Theological Seminary | 580 | 555 | -25 | 577 | 208 | 39.8278, -77.2447 |
| LOC-023 | Evergreen Cemetery gatehouse | 625 | 535 | -90 | 585 | 283 | 39.8201, -77.2285 |
| LOC-024 | Codori Farm | 540 | 573 | +33 | 605 | 217 | 39.8136, -77.2355 |
| LOC-025 | Spangler's Spring | 530 | 473 | -57 | 505 | 244 | 39.8082, -77.2199 |
| LOC-026 | Plum Run (valley) | 490 | 536 | +46 | 554 | 231 | 39.8018, -77.2354 |
| LOC-027 | Rose Woods | 560 | 528 | -32 | 558 | 283 | 39.8006, -77.2452 |
| LOC-028 | Power's Hill | 620 | 477 | -143 | 540 | 250 | 39.8071, -77.2195 |
| LOC-029 | "Gulp's" Hill saddle (typo) | 560 | 504 | -56 | 523 | 259 | 39.8137, -77.2246 |
| LOC-030 | Triangular Field | 560 | 522 | -38 | 546 | 283 | 39.7984, -77.2452 |

Summary: mean |delta| 62 ft, median 45 ft, max 201 ft; 21/30 > 25 ft; 13/30 > 50 ft. "Plum Run (valley)" is listed as the *lowest* point (490 ft) yet samples at 536 ft, higher than 17 of the other 29 locations' sampled values, which shows the coordinate problem is not only for hills. Big Round Top crest per 3DEP (39.7862, -77.2391): 784 ft (the highest ground in the bbox); Little Round Top crest (39.7920, -77.2367): 665-668 ft.

## Appendix B. Files produced (scratch only)

`C:/Users/mlege/AppData/Roaming/Claude/scratch-workspaces/fe20000a-2144-4d85-ac4c-4e19e62f5823/1fb796a8-22ef-47aa-b6e3-227d4048a221/scratch-2026-09-30-719300/plan-work/tmp-pages-B/`: `utm.py`, `demlib.py` (3DEP DEM helpers), `check2.py` (terrain table), `vs.py`/`vs.js` (viewshed prototypes), `sens.py` (resolution/eye/target sensitivity), `los.py` (point-to-point LOS), `sizes.py` (payload sizes), `timetable.py` (chronology/vignette clock tables), `contrast.py`, `dem5m_utm.tif` (15.7 MB, 3DEP export, public domain), `dem5m.f32`, chunk files `c1.md`-`c7.md`.

## Verification

Adversarial verifier pass, 2026-09-30. Read-only; scripts lived in the verifier scratchpad, not in plan-work. Verdicts: CONFIRMED (evidence and fix hold), CORRECTED (root cause or evidence mostly right; a specific claim or the fix is wrong or incomplete), REFUTED (none), UNVERIFIABLE (needs a runtime, browser or authoring that was not available).

**Limits of this verification.** The live site (gettysburginteractivemap.com and the netlify.app host) timed out from the verifier host (curl exit 28; DNS resolved to 98.84.224.111 / 18.208.88.157), so live-curl claims (TTFB 0.10-0.23 s, `/regiment` and `/ground-remembers` both 200, live brotli sizes) were NOT re-tested; they are consistent with Netlify defaults and the earlier audit's T3. Reachable and re-tested: USGS EPQS and 3DEPElevation ImageServer, api.mapbox.com, AWS S3 terrain tiles, usgs.gov, docs.mapbox.com, Mapbox Product Terms PDF (2026-07-21 edition), NPS/catalog.data.gov via search. No browser tools were used, so every layout/touch claim stays [C]/[U] unless noted.

### Reproduced independently (facts the report can be trusted on)
- Deploy line cites for the seven pages, `site-nav.js`, `site-nav.css`, `netlify.toml`, `sw.js` all match (`sandbox.html` 37/62-63/71/79/102-107/167-231, `regiment.html` 70/73/102/108/131-137/158/189/198-233/247-248, `ground-remembers.html` 16/43/47/64/69/83/88-89/109-134, `viewshed.html` 7-20/35-36/44-46/106-127, `documentary.html` 32-36/49/72/84-106, `education.html` 20/48-50/58-62/75-92, `aftermath.html` 27/32/48-67; `site-nav.js` 19/27/161-171/211-216/232-236). Bundle cites are right to within +/-2 lines (`getTickTime` is at 9371, `JF` 100836, `QF` 100998, `July ${l + 2}` 97428, 3.24.1 at 53873, only `location.search` reader 101019).
- Data joins: 467 OOB records (274 Union incl. alias stub, 193 Confederate); 103 batteries (20+30 Union, 45 Confederate, 5+3 horse); 152 placement units (23 regiment ids, 96 brigade ids parenting 445 regiments, 33 batteries/other); 694 keyframes over 117 ticks; 444 regiments without own placements, 422 recoverable via brigade (445 total with timeline); 728 named ids; 144/152 placement ids resolve, 8 VI Corps brigades do not; casualty_percentage null 222, days_engaged empty 37, no commander 27, no corps 22, generic key_action 127 (20 x "Army reserve."), key_action < 40 chars 169, computed-vs-listed casualty rate mismatch 0/245; dispositions incl. Charging Line 54, Mounted 3, Dismounted 1; non-combat 145/694; 24 vignettes (6/8/10 by day), 7,205 words, 10.4 paragraphs avg, all contain a blank-line break; 40 `units_featured` ids of which 10 are regiments; the name-substring matcher finds 1/467 (8th Illinois Cavalry -> V-001); ties at tick 556 (V-019, V-023).
- Chronology: events at ticks 30, 62, 64, 256, 260, 314, 538, 548-553, 675 are as quoted; recomputed drift table matches (Day 1 0/+5/+15, none after tick 100; Day 2 0 -> -10 -> -230; Day 3 0 -> -215). Prose times in V-001/002/007/009/013/014/016/017/022/024 are as quoted; the formula and map-store clock columns recompute exactly.
- Contrast ratios (all 9 quoted) recompute exactly; `#9aa3b8` on `#0a0a14` is 7.79:1.
- `screenshots/day3.png`: IHDR RGB 1280x720, inflated 3,687,120 B vs 2,765,520 expected, Pillow fails, md5 identical to day1.png; mapbox-gl.js gzip 481,197 B, raw 1,796,551 B, CSS gzip 5,518 B, `Cache-Control: max-age=31536000`, `Access-Control-Allow-Origin: *`.
- USGS: EPQS at the listed Big Round Top point = 584.9 ft, LRT point = 504.7 ft, BRT crest (39.7862,-77.2391) = 783.3 ft, LRT crest (39.7920,-77.2367) = 665.5 ft; rasterId 122544, resolution 1 m, AcquisitionDate 11/4/2017. 8 of 10 spot-checked Appendix A rows reproduce within 1.3 ft (2 timed out). Appendix A statistics recompute from its own table (mean 61.9, median 45, max 201, 21 > 25 ft, 13 > 50 ft). ImageServer: F32, 8000 x 8000 max, capabilities Image,Metadata,Catalog; keyless `exportImage` returns 200. Terrain-RGB PNG sizes at 5/10/15/30 m reproduce exactly (1.65/0.54/0.28/0.09 MB). Node viewshed prototype re-run: 33-108 ms on this machine (report: 44-236 ms); the numpy prototype is area-weighted, `vs.js` prints a sample-weighted figure (58.6%), so quote only the numpy/area-weighted 52.5%.
- Licences: usgs.gov/3d-elevation-program: "All 3DEP products are available free of charge and without use restrictions."; USGS copyrights page: USGS-authored data are U.S. public domain, credit requested. docs.mapbox.com terrain-dem-v1: max zoom 14, height formula as quoted, "only available for use in the Mapbox SDKs", not in the Raster Tiles API, attribution required. AWS terrarium z13 tile 2338/3106 returns 200 (licence still unchecked).
- Older deploys (Jun 13 and all 13 Jul 20 bundles) contain exactly one `location.search` use, the `ancestor` reader.

### Verdict table
| ID | Verdict | Notes / correction |
|---|---|---|
| 01 | CORRECTED | Evidence CONFIRMED: emitters at `documentary.html:92`, `education.html:81`, `regiment.html:247`, also `search.html:114,127,139`, `turning-points.html:118`, `historian.html:110`; no reader other than `ancestor` in the bundle or any archived bundle. **The proposed minimal patch would not work.** The splash `tO` (`bundle.pretty.js:101472`) overwrites `currentTick` every frame (`:101494`) and resets it to 1 at the end (`:101500`, and on "Skip intro" `:101576`); it is mounted whenever `vn` is false (`:112948`, `:113059`), and the layout chooser `dO` shows while `Zn` is null (`:112949`, `:113061`). A working patch must (a) default `vn` to true (or apply the deep-link state after `onComplete`), (b) auto-pick a layout, (c) consume unit/vignette in the same place; `Kx()` side effects at `:101499` are unknown. Effort is M-L, not M. |
| 02 | CORRECTED | Sizes and blocking behaviour confirmed. Fixes: (1) browsers get brotli 385,039 B, so the "~2.4 s" gzip estimate is ~1.9 s at 1.6 Mbps; (2) the snippet `<link rel=preload as=script ... crossorigin>` plus an injected `<script>` with no `crossOrigin` differ in fetch mode, so the file is downloaded twice; drop `crossorigin` from the preload (or set `s.crossOrigin='anonymous'`; ACAO is `*`); (3) `loadMapbox()` resolves on the script only; await the stylesheet too to avoid unstyled controls; (4) see pagesB-49 for the skeleton/poster placement. Root cause and S-M effort hold. |
| 03 | CONFIRMED | All six pages have `fetch().then(r=>r.json())` with no `r.ok` or try/catch. |
| 04 | CORRECTED | Counts/sizes confirmed (20 files, 368,893 B raw, 79.8 KB gzip; OOB 181,612 B; `sw.js:61-70`; `netlify.toml:27-30`). Missing caveat: `/data/v/<hash>/...` still matches the `/data/*` rule (`max-age=3600`); Netlify merges same-name headers across overlapping rules (its docs are silent; the X4 embed.html case shows an inherited `/*` header persisting), so put hashed files on a path no other rule matches (e.g. under the already-immutable `/assets/`) or verify with `curl -I` on a deploy preview. See pagesB-M4. |
| 05 | CONFIRMED | Formulas at 9371, 100836-100842, 100998-101006, 97428 and chronology `tick_formula` verified. Minor: in the drift table the Day 2 row is -10 through tick 340, then -50 at 360; the 3.0 min/tick stretch runs 340-450 (2:20 pm to 7:50 pm), as stated. The snippet `tickForClock=(day,'HH:MM')=>` is pseudo-code, not valid JS. |
| 06 | CONFIRMED | Code reading; nav is ~55 px (10+10 padding, 34 px controls, 1 px border). The `min-height:calc(100dvh - 57px - 140px)` variant is safe; the flex-column variant has the pitfall listed under 12. |
| 07 | CONFIRMED | grep: `aria-` = 0 on all seven pages; `<main>` absent on sandbox/viewshed/ground-remembers; no `<h2>` on five pages; no skip links, noscript, or reduced-motion rules. |
| 08 | CONFIRMED | All contrast numbers reproduce; `.nav-btn` 37 px, `.match-row` ~35 px, play ~31 px. Gap: shared nav/footer targets are not listed (see pagesB-M2). |
| 09 | CONFIRMED | PNG defect reproduced. Extra: pixel data is RGBA with alpha 0xFF and near-uniform dark colours (17.6 KB for 1280x720), so it is a placeholder; changing the IHDR alone will not give a useful preview. Twin-URL 200s not re-tested (site unreachable). See pagesB-M3 for the Mapbox-terms angle on "headless capture". |
| 10 | CONFIRMED | 31 " -- " in the seven pages (grep -o); vignettes 140 by JSON dump (report 139, immaterial); dev text present at `union_artillery.json:91` and `union_regiments_i_ii_corps.json:51`; more "must be placed" copy in `flag_notes`/`notes` fields (not displayed today). |
| 11 | CORRECTED | The `pk.` token literal and the 3.24.1 pin appear in NINE HTML files (camera, cinematic-export, compare, ground-remembers, immersive, sandbox, unit-rendering-reference, viewshed, watch-together), not three; the `/config.js` fix must cover all nine. |
| 12 | CORRECTED | Evidence confirmed (`site-nav.js:212,215-216`, `site-nav.css:130`, three pages with `href="/index.html"`). Fix pitfall: every page has `main{max-width:...;margin:0 auto}`; in a `display:flex;flex-direction:column` body, auto cross-axis margins disable stretch, so `main` shrinks to its content width (a layout shift on load). Add `width:100%` (or `width:min(100%,720px)`) to `main`. |
| 13 | CONFIRMED | No tests exist. Severity is arguably medium (process gap, not a user-visible defect); effort L is realistic. |
| 14 | CONFIRMED | `documentary.html:34,91`; fix works. |
| 15 | CONFIRMED | Prose/clock table verified cell by cell. |
| 16 | UNVERIFIABLE | Arithmetic confirmed (content width 271.5 px at 375; button 37 px tall); wrap behaviour needs a browser (report already says so). |
| 17 | CONFIRMED | Lines 96, 101-104, 106, 57 verified. |
| 18 | CORRECTED | "each `vignettes_part*.json` carries `metadata.sources`" is wrong: only part 1 has it (7 entries: Pfanz x2, OR, Dawes, Moe, Oates, Desjardin); parts 2 and 3 (16 of 24 moments) have none, so the per-moment Sources disclosure must be authored, not derived. `site-nav.js:27` "narrated" and lat/lng on every vignette confirmed. |
| 19 | CONFIRMED | Tie at 556, V-024 at tick 675, hard-coded 24 at `documentary.html:49`, `site-nav.js:27`. |
| 20 | CONFIRMED | 2.53 and 3.73 reproduce; `education.html:20` palette. |
| 21 | CONFIRMED | Direction reproduces with my own heuristic (panel_summary FK mean 11.9 vs full_script 7.4; report 11.1 vs 7.1). Note the current `panel_summary` averages 59 words, so a "<= 60 words" target changes vocabulary and sentence length, not length. |
| 22 | CONFIRMED | Listeners attached after the await (`education.html:86-92`); innerHTML at 75, 79-81; identical link text. |
| 23 | UNVERIFIABLE | Feature proposal; no factual claims to check. |
| 24 | CONFIRMED | Four events; 11 px dates; 12 px caveat; the sourcing warning is appropriate. |
| 25 | CORRECTED | Do NOT reword to "beside Cemetery Hill": NPS states the Soldiers' National Cemetery was established on Cemetery Hill (adjoining Evergreen Cemetery); keep "on Cemetery Hill". The looser phrase is "the Union army's central anchor" (verify with a source; Cemetery Ridge, not the Hill, was the centre). The 2,400 population figure and the two-hour/two-minute durations remain unverified here. |
| 26 | CORRECTED | Root cause, lines and fix confirmed. Correction: "ignores scroll" is wrong; the panel is anchored to document coordinates, so it scrolls with the page; the error is a constant vertical offset equal to the map's document-top offset (x is correct because the map starts at x=0). |
| 27 | CORRECTED | Drag on touch is unsupported (mousedown-only, `sandbox.html:167`). Mapbox 3.24.1 registers `touchstart` passive (`bundle.pretty.js:90324`) and only touch-pan calls `preventDefault` (`:89498`), so a plain tap is followed by browser-synthesised mousedown/mouseup/click, which Mapbox maps to `mousedown` events: a tap most likely DOES open the (mispositioned) panel while a finger drag pans the map. "A tap never opens the panel" should be dropped or verified on a device. `MapEventHandler.touchstart` is preventable, `touchmove` is not (`:89049-89066`), so the fix's `preventDefault` on start plus `dragPan.disable()` is the right design; attach `touchmove` on the map, not the layer (Mapbox documents layer-delegated touch events as touchstart/touchend/touchcancel; not re-checked). WCAG 2.5.7/2.1.1 conclusions stand. |
| 28 | CONFIRMED | Event data verified. Nuance: "~3:00pm" for Pickett's Charge matches history, not the data clock (12:20 pm); generating labels from the chronology copies the wrong clock until pagesB-05 lands. |
| 29 | CONFIRMED | 9 options vs 11 dispositions in data ("Column" is offered but unused). |
| 30 | CONFIRMED | Lines 174-181, 212, 216-220, 229-231; the 8 unresolved VI Corps brigades parent 36 regiments. |
| 31 | UNVERIFIABLE | Speculative: Mapbox fires `load` once the style/sources are loaded, so `map.loaded()` is normally true inside the handler; harmless to add the unconditional path. |
| 32 | UNVERIFIABLE | Plausible (longest option 77 chars, flex-wrap label); needs a browser at 320/375. |
| 33 | UNVERIFIABLE | Feature list. |
| 34 | CONFIRMED | `viewshed.html:7,8,11,17,44,46`, `site-nav.js:19`. |
| 35 | CONFIRMED | Independently re-queried USGS EPQS; all headline numbers and Appendix A reproduce. Scope gap: see pagesB-M1 (the same bad coordinates are used by vignettes and placements). |
| 36 | CONFIRMED | ImageServer, EPQS, licence quotes, PNG sizes reproduced. Note the ImageServer is a dynamic multi-resolution service (its default resampling is not area-average); the "average-resample from the 1 m COG" step therefore implies downloading 1 m tiles, not exportImage. |
| 37 | CORRECTED | Numbers reproduce (timing is machine-dependent) and the curvature figures check analytically (horizon sqrt(2*Re*1.7/(1-k)) = 4.99 km; drop 1.707 m at 5 km). Spec ambiguity to fix before coding: if the DEM is exported in EPSG:3857 (pixel ~6.5 m mercator) the worker's `cell` must be the GROUND cell (5 m = pixel x cos(lat)); using the mercator size inflates distances and curvature by 1.30. Put `cell_ground_m` and `cell_mercator_m` separately in meta.json. |
| 38 | UNVERIFIABLE | Spec/UX. |
| 39 | CONFIRMED | NPS 1999 GMP rehabilitation of woodlots/orchards confirmed by search (final GMP June 1999). The NPS Vegetation Mapping Inventory GIS exists on catalog.data.gov (accessLevel "public", no licence text, dataset dated 2006, 2003 leaf-off imagery), so it is a modern-vegetation product, weak as an 1863 proxy, and its licence is unstated. Warren/Bachelder holdings not checked. |
| 40 | CORRECTED | SDK-only, zoom 14, formula and attribution confirmed. The restrictions are real but the cited source is wrong: they are in the Mapbox Product Terms (2026-07-21) s1.6 (no tracing/deriving/extracting), s1.9 (no bulk/automated queries, scraping, caching), s2.8.1 (30-day on-device cache; no distribution "by using a screenshot or other static image"); `mapbox.com/legal/tos` itself has none of these clauses. The "~7.3 m/px at z14" figure assumes 256-px tiles; the docs give no resolution, and with the report's own `tileSize:512` it would be ~3.7 m/px. Relabel or delete. |
| 41 | CONFIRMED | All line cites verified. |
| 42 | CONFIRMED | `regiment.html:34,68-73`; `site-nav.css:130`. |
| 43 | CORRECTED | 1/467 reproduced exactly. The test expectation is incomplete: `U-20ME` is featured in V-009 AND V-010 (expected [V-009, V-010]); V-012 features `U-1MN` correctly. Regiments carry only `parent_brigade_id` (467) and `parent_corps_id` (445), no division id, so the "brigade -> division -> corps" chain must be resolved through the brigade records. Own/brigade matches give 87 regiments; the corps-level ids `U-I` and `U-III` would attach 68 more by corps alone, so label those differently or skip them. |
| 44 | CONFIRMED | 23/96/422/445 and 50+45+5+3 = 103 reproduce. |
| 45 | CONFIRMED | All counts reproduce; alias stub `U-14BK` -> `U-84NY`. |
| 46 | CONFIRMED | `regiment.html:70,71,158,163-169`. |
| 47 | CONFIRMED | Plan sound; see pagesB-M5 for the thin-content gate. |
| 48 | CONFIRMED | `regiment.html:248` scrolls on deep link; see pagesB-M2 (the scroll lands under the sticky nav). |
| 49 | CORRECTED | Order of operations verified (`ground-remembers.html:16,64,67,69,88-89`). Fix (c) puts a poster `<img>` inside `#map`; Mapbox GL 3.24.1 calls `warnOnce("The map container element should be empty, otherwise the map's interactivity will be negatively impacted...")` when the container has ANY child node (`bundle.pretty.js:92787`; a whitespace text node counts). That breaks the zero-console-warnings bar and can hurt interactivity. Use a sibling overlay inside a `position:relative` wrapper and remove it on `idle`; also keep `#map` literally empty (`<div id="map"></div>`). |
| 50 | CONFIRMED | Qualitative result reproduces (naive top cell = The Angle, duration-weighted top = Culp's Hill; 145/694 non-combat exact). The exact figures (45 keyframes, 749,656 vs 332,139) do not: the script was not saved and my 200 m grid gave 38 keyframes and 428,646 vs 327,068 strength-ticks (sensitive to grid origin and duration cap). Ship the script and treat the numbers as illustrative. |
| 51 | CONFIRMED | Lines 30-31, 47, 121-130 verified. |
| 52 | CONFIRMED | 694 positions, 117 keyframe ticks. |
| 53 | CORRECTED | Counts reproduce, but the split is misstated: the alias stub `U-14BK` is Union, so 273 Union + 193 Confederate = 466 distinct (the structured summary says 192 Confederate; section 5 says 193 "incl. the stub"). Also quantify the VI Corps gap: 8 brigades, 36 regiments. |

### Missed issues (in pages-B scope)

**pagesB-M1 - The coordinate defect is not limited to `terrain.json` (high).** Evidence: V-009 "Vincent and Little Round Top" `trigger_lat/lng` = (39.7933, -77.2394), identical to `terrain.json` LOC-003 (EPQS 504.7 ft, ~283 m from the 665 ft crest); the 20th Maine's "holds Little Round Top" keyframes (ticks 375-675) use the same point (505 ft) and its ticks 267-275 "extreme left" point (39.7922, -77.2389) samples 535 ft; 15th Alabama keyframes sample 501-523 ft. These feed Sandbox, Ground Remembers, the Regiment position path (pagesB-48), the Documentary mini-map (pagesB-18) and the deep links. Fix: run the DEM coordinate QA (pagesB-35 method) over vignette triggers, all `placements_*.json` and `density_*.json` points, and `monuments.json`; report per-file error stats; do not build the mini-map/path features on unaudited coordinates.

**pagesB-M2 - Sticky nav hides scroll targets; shared nav/footer targets under 44 px (medium).** `#gtbg-nav` is `position:sticky; top:0; z-index:500` (`site-nav.css:17`) and there is no `scroll-margin`/`scroll-padding` anywhere in the CSS or the seven pages (grep), so `document.getElementById('bio').scrollIntoView({block:'start'})` (`regiment.html:248`) parks the biography title (28 px h2 at the top of `#bio`) under the ~55 px nav; the same applies to any anchor or focus scroll (WCAG 2.2 SC 2.4.11 Focus Not Obscured, AA). Also on every page: `.gtbg-menu-btn` ~34 px tall, `.gtbg-historian-pin` icon-only at <= 640 px ~46x34 (`site-nav.css:34-62`), footer links 12 px with no padding (`:129-133`). Fix: `html{scroll-padding-top:72px}`; nav controls `min-height:44px`; footer links `display:inline-flex;min-height:44px;padding-inline:8px`.

**pagesB-M3 - OG/PWA image generation must avoid Mapbox map content (medium).** pagesB-09 says "headless capture" of the pages, three of which show Mapbox basemaps. Mapbox Product Terms (2026-07-21) s2.8.1 forbids distributing Licensed Map Content "by using a screenshot or other static image", and s1.7.3 limits print/static rights to specific styles. The report already avoids Mapbox tiles for the Ground poster for this reason; apply the same rule to `/og/*.png` and the manifest screenshots (draw from 3DEP hillshade plus first-party art, or confirm the Static Images API terms). Fix: `make-og.mjs` renders only first-party art; a lint rejects images captured from a page with a Mapbox canvas.

**pagesB-M4 - Header-rule overlap for the proposed hashed data path (medium).** `netlify.toml:27-30` gives `/data/*` `max-age=3600`; `/data/v/<hash>/*` (pagesB-04) also matches it and Netlify concatenates same-name headers from overlapping rules (undocumented; consistent with the X4 embed.html evidence), which can yield `max-age=3600, ... max-age=31536000, immutable`. Fix: serve hashed files from a path matched by exactly one rule (e.g. `/assets/data/<hash>/...`, already `immutable` at `netlify.toml:22-25`), then confirm with `curl -I` on a deploy preview.

**pagesB-M5 - Regiment prerender would publish thin, near-duplicate pages (medium, SEO).** pagesB-47 templates ~569 pages from OOB text, but 127 units share a duplicated `key_action` (20 are literally "Army reserve.") and 169 have < 40 characters; those pages would be thin/duplicate and could drag down site-wide quality signals. Fix: generate them all but emit `noindex` and omit them from `sitemap-units.xml` until a unit has a distinct `key_action` >= 80 chars (or a vignette mention/positions); enrich in priority order (featured units first).

**pagesB-M6 - Global body fade delays first content paint on every sub-page (low, [U]).** `site-nav.css:12-14` animates `body` from `opacity:0` for 340 ms on every page; Chrome ignores zero-opacity content for LCP (and, by my reading, for FCP), so FCP/LCP are pushed back ~0.34 s on all 27 sub-pages with no benefit. Not measured here. Fix: remove the opacity part (keep at most a transform), or start at `opacity:.99`.

**pagesB-M7 - Ground Remembers controls are inert until the map style loads (low).** The slider and Play listeners are registered inside `map.on('load')` (`ground-remembers.html:88,109-134`), so for the first ~3+ s the visible slider moves but the label and heat do not update (same class of bug as pagesB-22's tabs). Fix: attach listeners immediately and apply state on load; disable controls with `aria-disabled` until ready.

**pagesB-M8 - Unescaped `innerHTML` in Regiment and Sandbox (low).** `regiment.html:166,219,239` and `sandbox.html:137,160` interpolate data/ids into `innerHTML`; safe with today's first-party JSON but the same brittleness pagesB-22 flags for Students. Fix: build nodes with `textContent` (or one `esc()` helper) as part of a shared `/js/dom.js`; add a lint rule.

### Net assessment
Evidence quality is high: every numeric claim I could re-run reproduced (data joins, contrast, PNG defect, USGS elevations, DEM sizes, prototype behaviour). The material errors are in fixes, not findings: pagesB-01's minimal patch (the splash overwrites the tick), pagesB-02's preload (`crossorigin` mismatch), pagesB-12's flex-column shell (`main` collapses), pagesB-49's poster inside `#map` (Mapbox warning), pagesB-27's tap claim, pagesB-25's "beside Cemetery Hill", and pagesB-40's source attribution (Product Terms, not /legal/tos). The largest gap is scope: coordinate QA must cover vignettes and placements (pagesB-M1), not just `terrain.json`.
