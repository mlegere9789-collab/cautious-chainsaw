# app-bugs: main-app root causes and fix specs

Specialist: `app-bugs` (multi-agent NO-BUILD plan for gettysburginteractivemap.com). Written 2026-09-29/30.

**Scope.** The deployed main React/Mapbox app (`assets/index-Cg8FAMXN.js`, 2.28 MB, one chunk), the inline scripts in `index.html`, the two lazy chunks (`HelpModal-CFV9T0zH.js`, `BookmarkPanel-C5YT4b5k.js`), `sw.js` where it touches the app, and the `/data/*.json` files as the app consumes them. Everything here is **read-only analysis**; nothing in DEPLOY_DIR, SRC_DIR or RECON_SRC was modified. No browser tools were used (shared pane rule), so every behaviour claim is either **Verified** (script output or an exact code path I read end to end) or **Inferred** (follows from the code plus React/Mapbox semantics, but I could not execute the app). Each inferred claim has an acceptance test that confirms or refutes it in minutes.

**Conventions.** `pretty:LINE` means `plan-work/bundle.pretty.js` line (minifier symbol names such as `Zk`, `lS`, `yn` are the deployed names). `min@OFFSET` is a character offset in `plan-work/bundle.min.js`. Effort: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d. Audit IDs are those in BRIEF.md.

**Tooling I built (all in `plan-work/tmp-app-bugs/`).**

| Script | What it proves |
|---|---|
| `undef.js` | acorn + eslint-scope over the full 113,377-line bundle: every unresolved free identifier. Result: exactly four app-level ones (`setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment`, `CanvasRenderer`); the rest are browser/vendor globals (`MSApp`, `WorkerGlobalScope`, `__REACT_DEVTOOLS_GLOBAL_HOOK__`, `parent`, `reportError`, `WebGLTexture` are all feature-guarded vendor code). |
| `storekeys.js` | Every `yn()` destructure / `yn.getState().x` / `yn.setState({x})` compared with the 49 keys of the zustand store. One reference to a key that does not exist (`showMonuments`, mobile) and 10 store keys nobody reads. |
| `dead.js`, `unusedlocals.js` | No unused module-level names in app code; 51 unused locals (list in Appendix C) including the dead `lo`/`Ci`/`Si`/`di`/`Xa` state in `AO`. |
| `svdist.js` | Distance between each Walkthrough stop marker and its Street View pano (up to 1,045 m). |
| `tranche0-validate.js` (+ `tranche0-validation-output.txt`) | 24 exact-string patches against the deployed minified bundle: every anchor matches the expected number of times, the patched bundle still parses, and the four undefined identifiers disappear without introducing new ones. |
| Python data probes | Real counts for OOB / placements / vignettes / chronology (table in app-bugs-15). |

---

## 0. Ten discoveries that change the plan

1. **Turning the sound button on can blank the whole app.** `lS` references an undeclared `CanvasRenderer` (pretty:96556). While playing it silently kills the render loop; while paused it throws inside a `useEffect` and, with no error boundary, React unmounts the entire tree. The July audit never tested audio. (app-bugs-03)
2. **C5 is worse than the console error.** `?ancestor=ID` in the URL plus a click on the star button runs the same undefined call inside a `useEffect` (pretty:101019-101021) and can white-screen the app. The panel also advertises a "gold trail" that no code draws. (app-bugs-02)
3. **Ten "See it on the map" links across the site are dead.** Documentary, Education, Embed, Historian, Regiment, Search and Turning Points all link to `/?tick=..&vignette=..` or `/?unit=..`; the app reads no such parameter (the only reader of any URL parameter is `?ancestor` inside `Zk`). Bookmarks and the unit-panel share button write a third scheme (`?t=&u=&z=&ll=`) that is also never read. (app-bugs-05)
4. **July 2 and July 3 data are only downloaded when playback crosses tick 200 / 420.** Every jump (day tabs, keys 2/3, scrubber, bookmarks, tour, Follow-Ancestor click) skips the download, so the map shows stale July 1 carry-over or nothing. This is the root cause of the audit's "July 3 dawn showed empty fields", and 217 of 478 animated units (45 %) are missing from Follow Your Ancestor until a day has been played through. (app-bugs-06)
5. **The map's position function has a global cache that is never cleared** (`y1`/`i2`, pretty:96265-96305). Seeking backwards leaves future units on the map; the splash sweep pollutes it before the user ever sees the map. (app-bugs-07)
6. **C1 and C2 have one root cause.** After the Desktop/Mobile choice, `AO` still renders the desktop transport bar, NPS button, sound button, monuments, HUD and minimap on top of the mobile layout (pretty:113233-113283). Also 5 of the 14 mobile Tools tiles change state that nothing renders (Monuments, NPS Auto Tour, Map Layers, Bookmarks, Help). (app-bugs-11, app-bugs-12)
7. **The minimap is frozen at tick 1.** `yn.subscribe(selector, listener)` is a zustand-middleware signature; this store's `subscribe` takes one listener, so the selector is registered as the listener and the callback never runs (pretty:99650 vs 9116-9128). "72 units · tick 1" is this bug. (app-bugs-16)
8. **The +2 day bug is in three places and there are four tick-to-clock functions** (pretty:97428, 100842, 101006; clocks at 9371, 9856, 100836, 100998). (app-bugs-08)
9. **Order of Battle cannot be opened on desktop.** `lo` (pretty:112954) is only ever set to `false` (Escape); no button calls `Br(true)`. It exists only in the mobile Tools sheet. (app-bugs-13)
10. **"467 regiments and batteries" is wrong by the site's own data.** The OOB has 467 regiments + 103 batteries (570), plus 135 brigade/division/corps nodes; only 217 regiments and 38 batteries are animated, 100 animated IDs do not exist in the OOB, and 10 Confederate regiments are drawn as Union (`U-15AL`, `U-26NC`, ...). (app-bugs-15, app-bugs-35)

---

## 1. Foundation: how any of this gets applied (ties to N1)

There is no real source for the deployed app (N1). Three routes exist; the plan uses two of them in sequence.

| Route | What | When |
|---|---|---|
| **R0: validated hot patch (Tranche 0)** | Exact-string patches on the minified bundle, validated by `tranche0-validate.js` (finding app-bugs-01). No toolchain, no source. | Now. 0.5 d. Fixes about 14 user-visible bugs. |
| **R1: reconstruct source from the pretty bundle** | The app is only about 1,100 lines of store/helpers (pretty:9326-10000) plus about 17,100 lines of components (pretty:96209-113377), of which about 7,000 are data literals (walkthrough stops, 512 monuments, tour stops) that belong in JSON. I read essentially all of it for this report; the deployed names map cleanly to readable ones (Appendix J). Recommended: build a fresh Vite project by porting component by component *with the fixes in this report applied as you go*, using RECON_SRC only for scaffolding (it is from the older v21 build; its PENDING.md says it dropped Sound and the other v21 differences). | After Tranche 0. 8-12 d for a faithful port with fixes. |
| R2: keep patching the minified file | Not recommended beyond Tranche 0: every patch is a one-off tied to this exact hash and minifier naming. | Never for structural items. |

**Redeploy mechanics (verified from the files).**
- `/assets/*` is served `Cache-Control: public, max-age=31536000, immutable` (netlify.toml), and `sw.js` serves `/assets/*` cache-first. A modified bundle **must get a new file name** or returning users never see it.
- Places that reference the bundle name: `index.html:55` (modulepreload), `index.html:282` (script), `sw.js:6` (PRECACHE), and line 1 of both lazy chunks (`from"./index-Cg8FAMXN.js"`). Rename the bundle and patch those five strings. Bump `CACHE_NAME` (`sw.js:3`, `gbg-v5`).
- Start from SRC_DIR (correct case). The deploy zip has five lower-cased asset names and would 404 (BRIEF).
- Guard: run `undef.js` on the patched bundle; expect zero app-level undefined identifiers.

---

## 2. Findings

### app-bugs-01: Tranche 0 hot-patch set (24 validated string patches)

- **Severity** critical. **Effort** S (0.5 d including the smoke test). **Audit refs** C5, C1, C2, C3, H2, H11, D3 (partial), H3 (partial).
- **Depends on** nothing. It is the bridge until R1 exists.
- **Evidence.** `tmp-app-bugs/tranche0-validate.js`; output `tranche0-validation-output.txt`: all 24 anchors match exactly the expected number of times; "PATCHED BUNDLE PARSES OK (275 bytes delta)"; "previously-undefined identifiers still unresolved after patch: none"; "new unresolved names introduced by patch: []".
- **Patch table** (anchor strings are in the script; each is unique in `bundle.min.js`):

| Id | What it changes | Fixes |
|---|---|---|
| A1-A4 | Remove `setGoldUnit(...)`, `clearGoldTrail()`, `drawGoldTrailSegment(...)` from `Zk`; replace the false "Gold trail active" caption with "Every recorded position for this regiment, in order" | C5, ancestor crash path |
| B | `CanvasRenderer._lastSoundMs` -> `lS._lastSoundMs` (3 sites; `lS` is the enclosing declared function, so no new global) | sound crash |
| C | `GF()` becomes `return yn(c=>c.currentTick)` | minimap frozen (H11) |
| D1-D3 | `July ${l+2}` / `${f+2}` -> `${l}` / `${f}` at the three sites | C3 (+2 days) |
| E1 | Global key handler: ignore Ctrl/Meta/Alt combos; treat INPUT/TEXTAREA/SELECT/contentEditable as typing targets except that **Escape blurs and continues** | H2 (Esc in search box), browser Ctrl+F/L/S/+/-/0 hijack |
| E2 | Escape also clears `pinnedUnitId` and closes Map Layers and Distance | H2 |
| E3 | Remove `tabIndex`+`onKeyDown` from the transport bar (`IO`), which double-handled Space/Arrows with the window listener | keyboard double step |
| E4 | Keys 2/3 call `jumpToDay()` | day data load |
| F | Do not render `VF, WF, _F, IO, KF, XF, iO, yO` when layout is `"mobile"` | **C1, C2** |
| G1-G2 | `GtbgLoc` depends on `mapRef` from the store, so the default-on Locations labels appear | Locations bug (app-bugs-31) |
| H1-H2 | try/catch around the two `gtbg_onboarded` accesses | storage crash |
| I | Cap frame delta at 100 ms in the playback loop | background-tab time leap |
| J1-J4 | `jumpToDay`/`setTick` call `zp(day)`; `zp` de-duplicates in-flight loads and no longer marks a day loaded if every file failed; the paused redraw effect also depends on `placementsByTick` | D3 empty fields, Follow-Ancestor list |
| K | "Skip tour" resets to tick 1 (was leaving the user at tick 267 with legend + story panel + event card) | H4 |

- **Not in Tranche 0** (needs structure): deep links (05), clock unification (08), Esc for story/event card (09/10), mobile dead tiles (12), the labels (22).
- **Risk and rollback.** Patches are anchored to this exact hash; the script fails loudly if an anchor is missing. Rollback = redeploy the previous asset names (kept immutable in Netlify history).
- **Acceptance test (smoke, Playwright, 15 min).** Fresh profile, 1440x900: open the star panel, pick a regiment (no `pageerror`); click sound then step ticks 30-60 with the paused Right-arrow (no blank `#root`, no `pageerror`); press `2` then check `placementsByTick[226]` exists within 2 s; type in Search then Esc (panel closes); Ctrl+= does not change playback speed; minimap footer tick increments while playing; HUD says "July 1" on day 1; iPhone 375x812 in Mobile layout: `elementFromPoint` at the centre of each of the 14 Tools tiles returns that tile's button.
- **Metric moved.** Reliability C/B- -> B+; mobile core function D -> C+ (C1/C2 gone); removes the one production console error.

---

### app-bugs-02: C5 root cause, the ancestor crash path, and a real gold trail

- **Severity** critical. **Effort** S (delete) or M (build the trail). **Audit refs** C5. **Depends on** app-bugs-04 (error boundary), app-bugs-06 (all days loaded).
- **Evidence (Verified by `undef.js`).**
  - `pretty:101086`: `(l(it), setGoldUnit(it), clearGoldTrail());` in `st()` (min@2057749).
  - `pretty:101101`: `drawGoldTrailSegment(It.x, It.y, $n.x, $n.y)` (min@2058023).
  - `pretty:101229`: `(l(null), setGoldUnit(null), clearGoldTrail(), z(""));` in the "Change Regiment" onClick (min@2060358).
  - All three names are declared nowhere in the 113k-line bundle (scope analysis: unresolved globals).
  - `pretty:101019-101021`: `useEffect(() => { const Xe = new URLSearchParams(location.search).get("ancestor"); Xe && (l(Xe), st(Xe)); }, [])`.
  - `pretty:101213-101215`: caption "Gold trail active - their path glows on the map"; the user guide says the same ("Gold trail glows on the map", `ug.txt`).
- **Root cause.** The gold-trail module (a canvas overlay exposing `setGoldUnit / clearGoldTrail / drawGoldTrailSegment`) was removed from a build (compare RECON_SRC `AncestorTracker.jsx`) but its three call sites stayed. `st()` also computes `Xe.project()` screen coordinates for a canvas segment, which could never have been correct after any pan/zoom.
- **Failure modes.**
  1. Click a result: `l(it)` (select) runs, then `ReferenceError`. The panel switches to the timeline view, but `flyTo`, `selectedUnitId/pinnedUnitId` and the `currentTick: 1` reset never run.
  2. "Change Regiment": state resets, `z("")` (clear the search box text) is skipped.
  3. **Inferred, high confidence:** load `/?ancestor=U-20ME`, click the star button. `Zk` mounts, the effect calls `st()`, which throws inside a passive effect. `pretty` shows no error boundary (`getDerivedStateFromError` appears only inside React internals, lines 5263, 7824, 8120), so React unmounts the root: white screen. Confirm with the Tranche-0 acceptance test (patch A1 removes the throw; test the un-patched build first to confirm).
- **Fix spec (source-level).**
```js
// features/ancestor/goldTrail.js
const SRC = 'gtbg-gold-trail', GLOW = 'gtbg-gold-glow', LINE = 'gtbg-gold-line', DOTS = 'gtbg-gold-dots';
export function showGoldTrail(map, frames /* [{tick, lng, lat}] in tick order */) {
  const data = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: frames.map(f => [f.lng, f.lat]) } },
    ...frames.map(f => ({ type: 'Feature', properties: { tick: f.tick }, geometry: { type: 'Point', coordinates: [f.lng, f.lat] } })),
  ]};
  const s = map.getSource(SRC);
  if (s) { s.setData(data); return; }
  map.addSource(SRC, { type: 'geojson', data });
  map.addLayer({ id: GLOW, type: 'line', source: SRC, filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#ffd54a', 'line-width': 9, 'line-blur': 6, 'line-opacity': 0.45 } });
  map.addLayer({ id: LINE, type: 'line', source: SRC, filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#ffd54a', 'line-width': 2.5 } });
  map.addLayer({ id: DOTS, type: 'circle', source: SRC, filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': 4, 'circle-color': '#ffd54a', 'circle-stroke-color': '#1a1206', 'circle-stroke-width': 1 } });
}
export function clearGoldTrail(map) {
  for (const id of [DOTS, LINE, GLOW]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SRC)) map.removeSource(SRC);
}
```
  - In `AncestorPanel.selectRegiment(id)`: `await dataService.ensureAllDays()` (app-bugs-06), build `frames` from keyframes (`keyframesByUnit[id]`, app-bugs-07), `showGoldTrail`, `map.fitBounds(bounds, {padding: {top: 80, bottom: 170, left: 60, right: 380}, maxZoom: 15})`, set tick to the first keyframe, `select/pin` unit.
  - Cleanup: `useEffect(() => () => clearGoldTrail(map), [])` and on Change Regiment.
  - Deep link moves out of the panel (app-bugs-05) so the panel never runs a throwing effect on mount.
  - If the owner prefers not to build the trail: delete the three calls (patch A) and change the caption and the guide sentence.
- **Acceptance test.** Select 20th Maine: no console error; `map.getLayer('gtbg-gold-line')` exists; timeline lists >= 20 positions once all days are loaded; Change Regiment removes the layers; closing the panel removes them; reload with `?ancestor=U-20ME` opens the panel with the journey and no crash.
- **Metric moved.** Reliability, Best Practices (console errors), guide accuracy (G1).

---

### app-bugs-03: `CanvasRenderer` is undefined: sound ON crashes or freezes the app (new, critical)

- **Severity** critical. **Effort** S. **Audit refs** new (audit "Not tested: actual audio"). **Depends on** owner decision on audio.
- **Evidence (Verified).**
  - `pretty:96554-96557`: `Pe.size > 0 && N4() && (!CanvasRenderer._lastSoundMs || l - CanvasRenderer._lastSoundMs > 4e3) && (jk(), (CanvasRenderer._lastSoundMs = l))` inside `lS` (min@1972488). `undef.js` lists `CanvasRenderer` as unresolved (3 refs).
  - `N4()` returns the module flag `oT` (pretty:96363), set only by `U4(true)` from the sound button `yO` (pretty:111768-111783, default off).
  - `Pe` is `X4(...)`, the set of units whose Union and Confederate markers are within 40 px on screen (pretty:96480-96505), which is true at most combat ticks at the default zoom.
  - Call paths: playing: `Ed` (pretty:96965-97018) calls `lS` at 97014-97015 **before** rescheduling `requestAnimationFrame` at 97017; paused: `e1` (pretty:97045-97048) is called from `useEffect`s (pretty:97290-97325).
- **Root cause.** A static-method-style counter (`CanvasRenderer._lastSoundMs`) from an earlier class-based renderer was left in after the renderer became a function. Property access on an undeclared identifier throws.
- **Failure modes.** (1) While playing: exception before the next `requestAnimationFrame`; the loop dies, `isPlaying` stays true, the UI says playing but nothing moves. (2) While paused (step, scrub, jump): the effect throws and (no error boundary) the whole tree unmounts (**Inferred**, React 18 semantics; confirm with the test below).
- **Owner input needed.** RECON_SRC `PENDING.md` records that the owner said "no audio feature is wanted" and the reconstruction deleted Sound; the deployed build still ships it. Decide:
  - **Recommended: remove.** Delete `yO`/`vO` (pretty:111768-111797), `r2/oT/Uk/jk/N4/U4` (pretty:96319-96371) and the sound branch in `lS`. This also removes the crash and a small block of dead-weight code. The Immersive page (`immersive.html`) already offers the real, density-driven audio experience.
  - If audio is wanted in the map: share one `audio/engine.js` with `immersive.html`, module-level `let lastSoundMs = 0`, one `AudioContext` created on the first user gesture, `aria-pressed`, volume control, default off, and persist the choice (`gtbg:v1:sound`).
- **Hot patch.** Tranche 0 patch B (validated).
- **Acceptance test.** Toggle sound, then with the tab paused press Right-arrow 40 times across ticks 30-60 (combat at Herbst Woods) and again while playing at 4x for 20 s: no `pageerror`, `#root` still has children, playback advances. With sound removed: no sound button in DOM.
- **Metric moved.** Reliability, Best Practices.

---

### app-bugs-04: No error boundary, unguarded storage, whole app can go blank

- **Severity** high. **Effort** S-M. **Audit refs** reliability, C5 (amplifier). **Depends on** none.
- **Evidence.** No app-level error boundary: `getDerivedStateFromError`/`componentDidCatch` occur only in React internals (pretty:5263, 5276, 7824, 8120). Root render: `pretty:113365-113367` (`Rk(root).render(<StrictMode><AO/></StrictMode>)`). Unguarded storage read in a state initializer: `pretty:112951` (`useState(() => !localStorage.getItem("gtbg_onboarded"))`); unguarded write in a handler `pretty:113068`. (The store's own `v4/e2` at pretty:9327-9341 and bookmarks `kO/PO` at 97840-97852 do guard.) No `window.onerror`/`unhandledrejection` handler in the app or `index.html`.
- **Root cause.** Errors thrown in render/effects are unrecoverable without a boundary. `localStorage` can throw `SecurityError` (Safari "block all cookies", Firefox strict, sandboxed frames), and here it throws in `AO`'s first render, so those users get a blank page (**Inferred**; test below).
- **Fix spec.**
  1. `ErrorBoundary` class at root and around each overlay/panel (`Zk`, `Xk`, `Jk`, `MF`, `XF`, walkthrough `_O`, each lazy chunk) with a fallback: "Something went wrong in this panel. Reload / Copy details".
  2. `lib/safeStorage.js`: `get/set/remove/json` with try/catch, in-memory fallback, namespace + versioning (app-bugs-29).
  3. `window.addEventListener('error'|'unhandledrejection')` -> `navigator.sendBeacon('/api/log', ...)` or a Netlify RUM custom event so blank-screen crashes become visible (today they cannot be seen in RUM).
  4. Keep the patch-H guard for Tranche 0.
- **Acceptance test.** Playwright `addInitScript` making `Storage.prototype.getItem` throw: the app boots and shows the chooser. Inject a throwing effect into one panel: that panel shows the fallback, the map and transport stay usable.
- **Metric moved.** Reliability B- -> A-; a11y (no keyboard trap on failure).

---

### app-bugs-05: Deep links: none of the site's `?tick / ?unit / ?vignette / ?ancestor / ?t` links work

- **Severity** high. **Effort** M. **Audit refs** new (adjacent H4, D3). **Depends on** app-bugs-06 (day data), app-bugs-10 (boot state machine), app-bugs-11.
- **Evidence (Verified by grep + `URLSearchParams` scan).**
  - **Writers of URLs:** sub-pages `documentary.html:92` (`/index.html?tick=..&vignette=..`), `education.html:81`, `embed.html:60`, `historian.html:110` (`/?tick=..&vignette=..`), `regiment.html:247` (`/?unit=..&tick=..`), `search.html:114` (`/index.html?unit=..`) and `:127`, `turning-points.html:118` (`/?tick=..`). App: `$k()` builds `?t=&u=&z=&ll=` (pretty:97822-97829) used by Bookmarks "Copy Link" and the unit-panel share button `xe()` (pretty:97925-97934); `Zk` share link `?ancestor=` (pretty:101112-101122).
  - **Readers in the app:** `URLSearchParams` appears in app code only at pretty:97823 (writer) and pretty:101019 (`ancestor`, and only when `Zk` is mounted). Nothing reads `tick`, `unit`, `vignette`, `t`, `u`, `z`, `ll`.
  - The splash forcibly resets `currentTick: 1` when it ends (pretty:101497-101499, 101571-101580), so even a correct reader that ran early would be overwritten.
- **Root cause.** Deep-link routing was never implemented; each feature invented its own parameter names.
- **Contract to implement** (full table in Appendix F): `tick` (1-675), `day` (1-3), `unit` (unit_id from OOB), `vignette` (V-001..V-024), `ancestor` (opens the panel), `z`, `ll` (`lat,lng`), `layout` (`mobile|desktop`), `sound` removed. Aliases `t`=tick, `u`=unit for already-shared links.
- **Fix spec.**
```js
// lib/deeplink.js
export function parseDeepLink(search, facts) {
  const p = new URLSearchParams(search), out = {};
  const int = (v, lo, hi) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined; };
  out.tick = int(p.get('tick') ?? p.get('t'), 1, facts.maxTick);
  out.day = int(p.get('day'), 1, 3);
  const u = p.get('unit') ?? p.get('u'); if (u && facts.unitIds.has(u)) out.unit = u;
  const v = p.get('vignette'); if (v && facts.vignetteIds.has(v)) out.vignette = v;
  const a = p.get('ancestor'); if (a && facts.unitIds.has(a)) out.ancestor = a;
  const ll = (p.get('ll') || '').split(',').map(Number); if (ll.length === 2 && ll.every(Number.isFinite)) out.center = { lat: ll[0], lng: ll[1] };
  out.zoom = p.get('z') ? Math.min(18, Math.max(11, Number(p.get('z')))) : undefined;
  out.layout = ['mobile','desktop'].includes(p.get('layout')) ? p.get('layout') : undefined;
  return out;
}
// AO: after facts + boot complete
useEffect(() => { const d = parseDeepLink(location.search, facts); if (!Object.keys(d).length) return;
  boot.skipIntro();                          // no splash, no tour, no chooser if layout auto-detected
  (async () => { const tick = d.tick ?? firstTickOf(d.unit) ?? dayStart(d.day);
    if (tick) { await dataService.ensureDay(dayOf(tick)); store.setTick(tick); }
    if (d.unit) { store.selectUnit(d.unit); store.pinUnit(d.unit); }
    if (d.vignette) ui.openStory(d.vignette);
    if (d.ancestor) ui.openAncestor(d.ancestor);
    if (d.center) map.jumpTo({ center: [d.center.lng, d.center.lat], zoom: d.zoom ?? 14 }); else camera.frame(tick, { unit: d.unit });
  })(); }, [factsReady, mapReady]);
// keep the URL current (replaceState, debounced 500 ms), so Copy Link == address bar
```
  - Sub-pages emit canonical `/?tick=..` only (never `/index.html?`; this also removes the duplicate-URL analytics split, T3).
  - On `popstate` re-apply. Invalid values are ignored, never thrown.
- **Acceptance test.** Table-driven Playwright (Appendix F): `/?tick=267&vignette=V-009` -> tick 267, story V-009 open, day-2 data loaded, map centred on Little Round Top, no splash; `/?unit=U-20ME` -> unit panel open, tick = first keyframe; `/?ancestor=U-20ME` -> panel with journey; `/?tick=9999` -> ignored; every "See it on the map" link on the 7 sub-pages that have one lands correctly (crawl the links).
- **Metric moved.** Core function B -> A-; usability; internal-link quality.

---

### app-bugs-06: July 2/3 data loads only during playback; failures are cached as "loaded"

- **Severity** high. **Effort** M (S for the Tranche-0 subset). **Audit refs** D3, H4, P3. **Depends on** none.
- **Evidence (Verified).**
  - Loader `zp(day)` (pretty:96900-96917); boot loads day 1 only (`sF`, pretty:96939-96940). Days 2 and 3 are requested from exactly one place: the playback loop `Ed` when `it >= 200` / `it >= 420` (pretty:96991-96992). Mobile is the exception: it requests all three at map load (pretty:103040-103042).
  - Jump paths that never load data: store `jumpToDay` (pretty:9369-9370), keys 1/2/3 (pretty:112979-113010), transport day buttons and scrubber (`IO`, pretty:112230-112300), bookmarks (`BookmarkPanel` calls `setTick`), onboarding tour steps (`bO`, pretty:111860-111890 calls `setTick(Gc[i].tick)`), Follow-Ancestor timeline clicks (`xe`, pretty:101125), monument clicks (`KF.ze`, pretty:100878-100889).
  - Failure handling: `.catch(() => ({ placements: [] }))` (pretty:96908-96909) then `addPlacementsForDay(day, [])` adds the day to `loadedDays` (pretty:9397-9406), so one transient network error leaves that day empty for the session.
  - Consumers built from loaded rows only: Follow-Ancestor list `Se` (pretty:101021-101040). Data probe: **217 of 478 animated units have no July 1 row** (e.g. `C-15AL` first appears at tick 256), so on a fresh load they are absent from the list and the ancestor timeline.
  - Request count at boot (desktop): OOB 14 + day-1 placements/density 16 + terrain 1 + vignettes 3 + chronology 3 (LF) + successions 1 (dup of an OOB file) = **38 JSON requests**; mobile adds days 2 and 3 (31) + chronology again (3) = **72**.
- **Root cause.** Lazy loading was implemented as a playback prefetch, not as "data required by the requested tick".
- **Fix spec.**
```js
// data/dataService.js
const status = { 1: 'idle', 2: 'idle', 3: 'idle' }, inflight = {};
export function ensureDay(day) {
  if (store.loadedDays.has(day)) return Promise.resolve();
  return inflight[day] ??= loadWithRetry(day).finally(() => delete inflight[day]);
}
async function loadWithRetry(day, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { const rows = await fetchDay(day);              // single file per day after the build step below
      store.addPlacementsForDay(day, rows); return; }
    catch (e) { if (i === tries - 1) { ui.toast({ id: 'load-' + day, text: `Could not load July ${day}. Retry`, action: () => ensureDay(day) }); throw e; }
      await sleep(400 * 2 ** i); }
  }
}
// store: setTick(t) { const d = dayOf(t); set({ currentTick: t, dayLoading: !loaded(d) }); ensureDay(d).then(() => set({ dayLoading: false })); prefetch(next) }
```
  - Show a "Loading July 2..." pill while `dayLoading`; redraw the paused map when rows arrive (`placementsByTick` in the effect deps, Tranche-0 J4).
  - Prefetch the next day when `tick >= dayStart + 150` and on `requestIdleCallback` after first paint.
  - **Build step:** concatenate per-day `placements_* + density_*` into `data/day{1,2,3}.json` (dedupe `(unit_id,tick)` pairs; 103 duplicate pairs exist), brotli by Netlify. 47 placement requests become 3; total boot requests 38 -> about 8 (also helps P3/LCP). Coordinate with the perf specialist.
- **Acceptance test.** Fresh load, press `2`: `Object.keys(placementsByTick)` includes ticks >= 226 within 2 s and units are drawn; block `day3` requests: error toast with Retry, then success; open Follow Ancestor on a fresh load and type "15th Alabama": found; Network panel shows <= 8 JSON requests at boot.
- **Metric moved.** Core function; LCP/TBT (fewer requests, less parsing); D3.

---

### app-bugs-07: `y1` has a global carry-forward cache; seeking backwards shows the future; keyframes teleport

- **Severity** high. **Effort** M-L. **Audit refs** D3, C4 (visual truth), H11. **Depends on** app-bugs-06.
- **Evidence.**
  - `pretty:96265-96305`: module-level `const i2 = {}`; `y1` writes `i2[unit_id] = row` for every row at the requested tick and builds the result as `{...i2}` overridden by the tick's rows. `i2` is never reset (only three references in the whole bundle: 96265, 96271, 96279/96291).
  - Data (**Verified**): 1,804 rows, 188 populated ticks of 675 (487 ticks have no rows), 478 distinct units, median 6.5 rows per populated tick. Carry-forward is therefore required by the design, but it must be a pure function of the requested tick.
  - Interpolation `F4` (pretty:96238-96256) blends only between `c[f]` and `c[f+1]`, i.e. adjacent ticks (pretty:96266-96268); with keyframes 5-60 ticks apart units never glide, they jump at the next keyframe.
  - Three inconsistent "is this unit on the field" definitions: map = unbounded carry-forward; Order of Battle = 50-tick lookback (pretty:102325-102330); roster = 100-tick lookback (pretty:102661-102668; mobile 103107-103113); minimap = exact tick only (pretty:99716-99818 after fixing GF).
  - The correct pure version already exists on the site: `camera.html:105-122` (`placementAtTick` = binary search over per-unit sorted keyframes).
- **Consequences (Inferred, high confidence; verify with the test).** The splash sweeps ticks 1 -> 675 via the store (pretty:101494) while day-1 data is loaded; each sweep frame calls `y1` through `e1`, filling `i2` with all 261 day-1 units. After the splash the map at tick 1 draws about 261 units instead of the 71 with a tick-1 row. Playing to July 3 then pressing 1 puts July 3-only units on the July 1 dawn map.
- **Fix spec.**
```js
// sim/positions.js -- pure, memoised, shared by map, OOB, roster, minimap, mobile, camera, tests
export function buildIndex(rows) {                       // rows: all loaded placement rows
  const byUnit = new Map();
  for (const r of rows) (byUnit.get(r.unit_id) ?? byUnit.set(r.unit_id, []).get(r.unit_id)).push(r);
  for (const a of byUnit.values()) a.sort((x, y) => x.tick - y.tick);   // dedupe same-tick rows: last wins
  return byUnit;
}
export function positionAt(frames, tick /* float ok */) {
  let lo = 0, hi = frames.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (frames[m].tick <= tick) { i = m; lo = m + 1 } else hi = m - 1 }
  if (i < 0) return null;                                 // not yet on the field
  const a = frames[i], b = frames[i + 1];
  if (!b || b.tick - a.tick > MAX_GLIDE_TICKS || far(a, b)) return a;          // hold, do not glide across long gaps
  const t = (tick - a.tick) / (b.tick - a.tick);          // real gap, not one tick
  return blend(a, b, ease(a.disposition, b.disposition)(t));
}
export const unitsAt = memo4((index, tick) => [...index.values()].map(f => positionAt(f, tick)).filter(Boolean));
```
  - `MAX_GLIDE_TICKS` and `visibleUntil` (destroyed/merged units) are data decisions for the data specialist; default: glide when the gap <= 12 ticks, hold otherwise, and drop a unit after its last frame only if its OOB entry says so.
  - Replace `y1`, the OOB/roster look-backs and the minimap with `unitsAt`. `Ed` calls `positionAt` with a fractional tick instead of the `Hc/Pe` fraction hack.
- **Acceptance test.** Property test: random call order of `unitsAt` equals a fresh index result for the same tick. Tick 1 -> exactly 71 distinct units. Play to 600, press `1`: no unit with first keyframe > 1 is drawn. `U-20ME` first drawn at tick 150. A unit with keyframes at 150 and 225 glides smoothly (or holds, per rule) but never both.
- **Metric moved.** Historical/data consistency C- -> B (with 08), core function; removes per-frame allocation of 467-key objects (pretty:96279, 96291).

---

### app-bugs-08: The +2 date bug and four tick-to-clock functions (C3, C4 call-site inventory)

- **Severity** high. **Effort** M (after the historical anchors exist). **Audit refs** C3, C4. **Depends on** the C4 owner's anchor table; Tranche 0 patch D removes only the +2.
- **Evidence (Verified).**
  - `July ${l + 2}, 1863` HUD (pretty:97428); `... July ${f + 2}` monument tooltip `JF` (pretty:100842); `July ${f + 2}, ...` Follow-Ancestor timeline `QF` (pretty:101006). Correct: store `getTickTime` `July ${P}` (pretty:9382), desktop toolbar `["July ", va]` (pretty:113084), mobile `["July ", di]`.
  - Four clock formulas: `getTickTime` (pretty:9371-9383: day 1 base 06:00, days 2-3 base 04:00); `M4` (pretty:9856-9860: base 05:00, drives the night/dusk tint via `E4`/`C4`); `JF` (pretty:100836-100843: 05:00); `QF` (pretty:100998-101007: 05:00). The data's own `time` strings (`chronology_*.json`) use a fifth convention (tick 17 = "6:25am" = 05:00 + 17x5; day-2 tick 267 = "8:25am" = 05:00 + (267-226)x5). `camera.html:hourForTick` uses 05:00.
  - Consequence: the toolbar disagrees with the event-card/data clock by about +55 to +60 min on July 1 (tick 17: toolbar 7:20 vs data 6:25; tick 1: 6:00 vs 5:00) and by exactly -60 min on July 2-3 (tick 267: toolbar 7:25 vs data 8:25); day 1 ends at 00:40 labelled "July 1"; the night tint is keyed to a different clock than the label.
  - Hard-coded time strings that will drift: tour stop subtitles in `th` (pretty:100063+), `IF` labels (pretty:97865-97894), tour steps `Gc` (pretty:111819+), `TO` markers.
- **Root cause.** The tick-to-time relationship was copy-pasted into each feature. Also, a linear formula cannot be right: V-001 "first shot" is tick 12 and V-002 "Reynolds falls" tick 28 (16 ticks = 80 min) while history has about 2 h 45 min between them (~7:30 and ~10:15).
- **Fix spec.**
  - One module `sim/battleClock.js`, driven by `data/clock_anchors.json`: `[{tick, iso: '1863-07-01T07:30:00-04:00'}, ...]`, piecewise-linear between anchors. Exports `tickToDate(tick) -> {dayNumber, dateLabel: 'July 2, 1863', timeLabel: '8:25 AM', iso}` and `dayOf(tick)`, `dayStartTick(day)`.
  - Replace every call site above; the night tint uses `iso` hour; tour/bookmark/moment labels are generated, never typed.
  - Guard: unit tests at ticks 1, 225/226, 450/451, 675; a CI grep that fails on ``July \${`` outside the module and on `+ 2}`.
  - Anchors and their historical verification belong to the C4 owner; this finding supplies the API and the exhaustive call-site list.
- **Acceptance test.** Table-driven tests; UI: header, HUD, event card, monument tooltip, ancestor timeline and Compare/Living Ledger show the same clock for ticks {1, 12, 28, 226, 267, 451, 538}.
- **Metric moved.** Historical consistency (with data fixes) C- -> A-; credibility.

---

### app-bugs-09: Keyboard and Escape: root causes and a single shortcut system (H2)

- **Severity** high. **Effort** M. **Audit refs** H2, A6, D4. **Depends on** app-bugs-10 (overlay stack).
- **Evidence (Verified).** Handlers in the whole app: (1) `window` keydown `ii` (pretty:112966-113050); (2) `IO` `onKeyDown` (pretty:112216-112224); (3) `HelpModal` chunk exports an **unused** `useGlobalKeyboard` with different semantics; (4) `index.html:323` (Extra Features menu Esc); (5) `site-nav.js:184` (sub-pages).
  - `pretty:112967`: `if (Ur.target.tagName === "INPUT") return;`. The Search panel input is `autoFocus` (pretty:98819) and the Follow-Ancestor input is focused on mount (pretty:101015-101017), so **Escape is always ignored while either panel is in its default state**.
  - Escape (pretty:113033-113043) sets `selectedUnitId: null` only; the unit panel shows `selectedUnitId || pinnedUnitId` (pretty:97909) and every map click pins, so **Esc does not close the unit panel after a click**. It does not close: story panel (`CF`, local `dismissed` state), event card (`LF`, local state), Legend, Minimap, Map Layers (`xt`), Distance (`Jt`), Locations, NPS tour (`XF`), toasts, onboarding tour, layout chooser. It does close: filter, search, ancestor, soldier's eye, roster, OOB (unreachable), bookmarks, help, walkthrough.
  - No modifier check: Ctrl+F opens Filter, Ctrl+L toggles Legend, Ctrl+S opens Search, Ctrl+B opens Bookmarks, Ctrl+=/Ctrl+- (page zoom) also double/halve playback speed, Ctrl+0 resets speed (WCAG 1.4.4 conflict). No `e.repeat` guard (holding Space flickers play), only `INPUT` is treated as a typing target (not TEXTAREA/SELECT/contentEditable).
  - Double handling: React's delegated `onKeyDown` on the transport bar fires before the window listener. With focus on any button in the bar (after clicking a day tab or Play), Right-arrow moves `+1` (IO) and `+1` again (window) = +2 ticks; Space toggles twice = no-op (**Inferred from event order**; verify).
  - `HelpModal` lists `Esc: Dismiss panel / deselect unit` and `H: Toggle heatmap`; the tour's quick reference lists `H: Heatmap`; the guide says Esc closes any panel. None is true (see app-bugs-23).
  - `+` handler: `Math.min(16, jr * 2)` (pretty:112996-113002) but the UI ladder is `[0.25..8]` (pretty:112185), so 16x is reachable with no button and no label.
- **Fix spec.**
  1. `lib/hotkeys.js`: `register({ id, keys, mods, when, run, help })`; one `keydown` listener; `isTypingTarget(e)`; ignore `e.defaultPrevented`, IME composition, and (for toggles) `e.repeat`; ignore Ctrl/Meta/Alt unless the binding declares them; expose `aria-keyshortcuts` on buttons; Help modal and guide table are generated from the registry (Appendix I).
  2. `useOverlay(id, close)` registers an overlay on an `overlayStack` in the store on mount and removes it on unmount. **Escape** = (a) if focus is in a text input with a value: clear it; (b) else if the stack is non-empty: close the top; (c) else if a unit is selected/pinned: clear both; (d) else cancel active tool modes (distance). Every overlay above (including story panel and event card, whose dismissal state moves into the store) registers.
  3. Overlays get `role="dialog"`/`complementary`, `aria-modal` where modal, a focus trap (`useFocusTrap`) and focus restore to the opener (A6).
  4. Remove the `IO` handler and the dead `useGlobalKeyboard`; one speed ladder constant used by keys, buttons and mobile.
- **Acceptance test.** Matrix test: for each overlay, open it and press Esc (and again with the input focused): closed, focus returns to the opener. Ctrl+F/L/S/B do nothing; Ctrl+= does not change speed; Space on a focused Play button toggles once; Right after clicking "July 2" advances one tick; `axe` reports no missing dialog semantics.
- **Metric moved.** Accessibility C+ -> A- (WCAG 2.1.1, 2.1.2, 2.4.3, 1.4.4), Usability B- -> A-.

---

### app-bugs-10: Load/jump state, panel exclusivity, toasts and the boot sequence (H4)

- **Severity** high. **Effort** M-L. **Audit refs** H4, H3, H1. **Depends on** app-bugs-09 (overlay stack), 06, 21.
- **Evidence (Verified) for the state the user meets.**

| Thing | Default today | Where |
|---|---|---|
| Legend | open (unless the user once closed it and it was persisted) | store `showLegend: t2.showLegend ?? !0` (pretty:9417) |
| Minimap | open | pretty:9418 |
| Locations, Monuments, Trails | on | `AO` `useState(!0)` (pretty:112943, 112946), `gF` (pretty:97219) |
| Story panel `CF` | opens for any vignette with `trigger_tick` in `[tick-2, tick]`; dismissal is local `useState` | pretty:98252-98330 |
| Event card `LF` | opens for any non-"low" chronology event at exactly this tick; dismissed set cleared on any jump > 1 tick | pretty:98595-98657 |
| Toasts `qF` | only while playing; per-toast `setTimeout` 4,500 ms (pretty:99912-99916); `slice(-4)` | pretty:99888-99958 |
| Commander toasts `nO` | **dead**: `commanderSuccessions` is initialised to `[]` (pretty:9389) and never set | pretty:101679-101772 |
| Tour `bO` | Skip leaves the tick at the step's tick (267 or 538) | pretty:111856-111874 |
| Splash `tO` | 3.5 s (`eO = 3500`, pretty:101471) that **writes `currentTick` to the store on every animation frame** from 1 to 675 (pretty:101494) | pretty:101472-101590 |

  - Note on the audit's "toasts never auto-dismiss": the code does start a 4.5 s timer per toast (pretty:99912-99916). If they persisted during the audit the likely cause is timer throttling in a hidden or automated tab (Inferred), but per-toast timers with no pause and no cap on simultaneous sources are fragile, hence the toast service below.
  - Blocking overlays share `zIndex: 1000` and stack by DOM order: splash `Va.overlay` (101605), chooser `ko.overlay` (102827), tour `tr.overlay` (112030). `bO` (`An` true on first visit) is rendered after the chooser (pretty:113066), so it sits on top of it.
  - Top-right slot used by five things at once: story panel (`Cr.panel` top 60, right 16, pretty:98417), toasts (`eh.container` top 60, right 16, pretty:100007), NPS video pip (`Zr.pip` top 58, right 16), Map Layers (`fixed top 60, right 10`, pretty:112508), Extra Features overlay (`top 60, right 14`, `index.html:183-184`). Top-left slot: HUD (`Sd.wrap` top 56 left 16, pretty:97484), unit panel (`ji.panel` fixed top 60 left 16, pretty:98107). Bottom-right: NPS button (bottom 90), minimap (130), sound (58). Full map in Appendix E.
  - The splash's store sweep re-renders `AO` and about 24 selector-less subscribers (Appendix B) plus one canvas redraw per frame for 3.5 s of the load window; it also fires the story/event/toast logic for every tick it passes.
- **Root cause.** No single owner of "what is open"; every panel keeps local state and its own absolute anchor.
- **Fix spec.**
  1. **Boot state machine** (`bootStage`: `boot -> layoutPick? -> intro? -> app`), driven by (a) deep link present, (b) `gtbg:v1:layout`, (c) auto-detect (app-bugs-11), (d) `gtbg:v1:seenIntro`, (e) `prefers-reduced-motion`. First-time visitors get *one* modal at a time (archetype/tour), never stacked. Returning visitors skip the splash. The splash progress is a CSS animation, never a store sweep. Delete `nO` and `commanderSuccessions`.
  2. **UI store** replacing local `useState` panels: `docks: { right: 'story'|'ancestor'|'layers'|null, left: 'unit'|'legend'|null, bottom: 'event'|'tour'|null }` plus `modal: null|...`. Opening a panel in an occupied dock closes the occupant (except Legend, which is a collapsible FAB). Story and event dismissal state and `seenVignettes` (sessionStorage) live here.
  3. **Toast service**: `toast({id, text, kind, ttl})`, one 250 ms interval that expires by `expiresAt` (robust to throttled timers in hidden tabs), max 3 visible, dedupe by id, pause on hover/focus, `role="status" aria-live="polite"`, `dismissAll()` on jump > 24 ticks, day jump, layout switch and Esc.
  4. **After an explicit jump** (day tab, key, bookmark, deep link, tour step): `camera.frame()` (app-bugs-21) then at most one card: story wins over event; nothing opens on plain load unless deep-linked. First-visit defaults: legend collapsed to its FAB, minimap collapsed below 1200 px, monuments off below zoom 14, trails on, locations on.
  5. Tour: Skip -> tick 1, clear transients (Tranche-0 K); Finish keeps tick 538 but pauses and dismisses toasts.
- **Acceptance test.** After Skip tour on a fresh profile: `[data-overlay]` count <= 1 per dock and no story + event card together; toasts disappear within 5 s even under `page.clock` fake timers and after tab visibility changes; first paint of the map with no splash for returning users (`gtbg:v1:seenIntro`); React Profiler: zero store writes during the boot animation.
- **Metric moved.** Fit & finish C+ -> A-, Usability, INP/TBT (no 210-frame store sweep), CLS (fewer late-appearing cards).

---

### app-bugs-11: Layout choice: persistence, auto-detect, one map, and why desktop overlays cover the mobile UI (H3, C1, C2)

- **Severity** high. **Effort** M (persist + detect + gating), XL (converge to one responsive shell). **Audit refs** H3, C1, C2. **Depends on** app-bugs-10.
- **Evidence (Verified).**
  - Layout state `[Zn, Dt] = useState(null)` (pretty:112949); never read from or written to storage (only `gtbg_onboarded` is stored). Chooser `dO` (pretty:102752-102820) shows every load; nothing offers a way from Desktop back to Mobile (mobile Tools has "Desktop View" only, pretty:103481-103485).
  - Gating: only the toolbar and the desktop map are conditional on `Zn !== "mobile"` (pretty:113071, 113233). Everything after that (pretty:113234-113283: `VF`, `WF`, `CF`, `LF`, `_F`, `IO`, `KF`, `XF`, `iO`, `nO`, `yO`, `MF`, `GtbgDist/Loc/Layers`) renders in **both** layouts.
  - Stacking: mobile root `tn.root` is `position: fixed; z-index: 100` (pretty:103698-103705) and forms its own stacking context; `IO` is `position: absolute; bottom: 0; z-index: 100` later in DOM (pretty:112374-112386), `XF`'s launcher and `yO` are `z-index: 200`. So they paint over the entire mobile UI including the Tools sheet (`tn.toolsOverlay`, z 400 but inside the z-100 context). This is C2.
  - `IO.controls` is a non-wrapping flex row (`justifyContent: center`, gap 8; five buttons + speed group + tick + credit with `whiteSpace: nowrap`, JSX pretty:112317-112372, styles 112425-112455) = about 572 px, so at 375 px it overflows both sides. This is C1.
  - The desktop map `gF` mounts while `Zn` is still `null`; choosing Mobile unmounts it (`Xe.remove()`, pretty:97260-97264) and `pO` creates a second Mapbox map (pretty:102983-103000): two WebGL contexts and two tile fetch waves on phones.
  - Mobile map has `attributionControl: false` (pretty:102988), see app-bugs-34; `mapRef` is never registered in the store for the mobile map, so shared tools that read `yn.getState().mapRef` (Layers, Locations, Distance, Bookmarks) cannot work there (app-bugs-12).
  - Splash title `Va.appName`: 52 px bold, 8 px letter-spacing, no responsive clamp (pretty:101617-101625), about 420 px wide, so "GETTYSBURG" clips to "ETTYSBURC" at 375 px. `ko.cards` is a non-wrapping flex row of two 32-px-padded cards (pretty:102849). The "Power User: keyboard shortcuts" archetype is offered on touch (pretty:111799-111818).
- **Fix spec.**
```js
// lib/layout.js
const detect = () => (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820) ? 'mobile' : 'desktop';
export const readLayout = () => new URLSearchParams(location.search).get('layout') || storage.get('layout');
// AO
const [layout, setLayout] = useState(() => readLayout() ?? detect());
const chooseLayout = (l) => { storage.set('layout', l); setLayout(l); };           // manual only
```
  - Render nothing heavy until `layout` is resolved (no desktop map under the chooser). Show the chooser only when `?layout=choose` or from an always-available "Switch layout" item (both layouts). Filter archetypes by `(hover: hover)`.
  - **Immediate:** gate the desktop-only overlays on `layout === 'desktop'` (Tranche-0 F). **Structural:** move to one responsive shell (sheet vs side panel by breakpoint) so features, `mapRef`, shortcuts and panels exist once; the duplication is the origin of at least 6 findings here.
  - Splash/chooser CSS: `font-size: clamp(30px, 11vw, 52px); letter-spacing: clamp(2px, 1.6vw, 8px); max-width: 100%`, cards `flex-wrap: wrap`.
- **Acceptance test.** Emulated iPhone (touch, 375x812): lands in Mobile with no chooser, reload keeps it; desktop 1440: Desktop; manual switch persists; `document.querySelectorAll('canvas.mapboxgl-canvas').length === 1`; all transport buttons fully inside the viewport at 320/360/375/414; `elementFromPoint` at each Tools tile centre returns the tile; splash title fully visible at 320.
- **Metric moved.** Mobile core function D -> B+, Usability D+ -> B+, Performance (one map instead of two; less JS executed under the chooser).

---

### app-bugs-12: Mobile Tools sheet: five dead tiles and a missing store key

- **Severity** high (mobile function). **Effort** M. **Audit refs** C2 (adjacent), H1. **Depends on** app-bugs-11.
- **Evidence (Verified by grep of `pO`, pretty:102914-103697, and the store audit).** The Tools tiles call: Monuments `pi(!An)` (pretty:103421) where `An` is never read; NPS Auto Tour `Dt(!0)` (pretty:103449) where `Zn` is never read; Map Layers `Br("layers")` (103442), Bookmarks `Br("bookmarks")` (103463), Help `Br("help")` (103470), but only `lo === "roster"` (pretty:103505) and `lo === "legend"` (pretty:103617) render anything. `showMonuments` is destructured from the store (pretty:102936) but is not a store key. The Bookmarks/Help lazy chunks (`MO`/`EO`) are only rendered by `AO`'s desktop section.
- **Root cause.** Tiles were added to the sheet without their panels; the mobile app is a separate implementation.
- **Fix spec.** Drive the sheet from the shared `TOOLS` registry (app-bugs-13) so a tile cannot exist without a panel; render `MO`/`EO`/Layers/Monuments in both layouts; register the mobile map in the store; replace the roster slide-panel branch and the roster tile's separate path (`er(true)` renders `Jk`, pretty:103414) with one implementation; remove `Zn`/`An`/`lo` dead state.
- **Acceptance test.** Playwright iterates every tile in the mobile sheet and asserts a visible panel/dialog (or a visible map change) within 500 ms.
- **Metric moved.** Mobile core function, learnability.

---

### app-bugs-13: Order of Battle is unreachable on desktop; one tool registry for toolbar, mobile sheet, Help and guide (D4)

- **Severity** medium-high. **Effort** M. **Audit refs** D4, H6 (logic side), D2. **Depends on** app-bugs-09 (hotkeys).
- **Evidence (Verified).**
  - Desktop `AO` state `[lo, Br] = useState(!1)` (pretty:112954) renders `lo && <Xk/>` (pretty:113257). `Br(` is only ever called as `Br(!1)` inside the Escape branch; no button sets it true. `unusedlocals.js` also lists `Ci/yi`, `Si/Wo`, `di/Es`, `Xa/ya` as dead state in the same function. The mobile sheet does open it (`yi(!0)`, pretty:103407), and the guide lists it (`ug.txt:104-106`).
  - Toolbar (pretty:113145-113240): 13 icon buttons + Toggle Units + a `download` anchor styled as a button ("Download Website Tutorial PDF", pretty:113115-113140) + Virtual Walkthrough. `Find Unit / Location` (pretty:113213) calls `toggleSearchPanel`, i.e. it is the same panel as `S`; the guide says it "flies straight to a place" (`ug.txt:47`), which the panel cannot do (units only). Buttons are `padding: 4px 10px; font-size: 12` (pretty:113356) = about 28x26.
  - **The OOB panel is not actually hierarchical.** `Xk` takes every OOB entry whose id starts with `U-` / `C-`, sorts them by id text (pretty:102346-102354) and indents each row by the number of dashes in its id (`(ze.match(/-/g) || []).length - 1`, pretty:102358-102362). A regiment such as `U-19IN` therefore gets depth 0 (same as a corps), a brigade `U-I-1-1` depth 2, and regiments never appear under their brigade even though every regiment record carries `parent_brigade_id` and every brigade lists `regiment_ids` (e.g. `U-I-1-1` -> `U-19IN, U-2WI, U-6WI, U-7WI, U-24MI`). It also re-renders every OOB row (705 nodes) on each tick change while open, with 8-11 px type (`aO`, pretty:102241-102320). The guide's "full hierarchical order of battle" (`ug.txt:104-106`) is therefore not what ships.
- **Root cause.** Toolbar, mobile sheet, Help table and guide are four hand-written lists, so they drift.
- **Fix spec.**
  1. `tools/registry.js`, the single source (also feeds Help rows, the guide, `aria-keyshortcuts`, and the Extra Features "map" group):
```js
export const TOOLS = [
  { id:'search',   label:'Search units',      key:'s', group:'find', panel:'SearchPanel',  layouts:['desktop','mobile'] },
  { id:'roster',   label:'Unit roster',       key:'r', group:'find', panel:'RosterPanel',  layouts:['desktop','mobile'] },
  { id:'oob',      label:'Order of battle',   key:'o', group:'find', panel:'OobPanel',     layouts:['desktop','mobile'] },
  { id:'filter',   label:'Filters',           key:'f', group:'find', panel:'FilterPanel',  layouts:['desktop','mobile'] },
  { id:'layers',   label:'Map layers',        key:'y', group:'map',  panel:'LayersPanel',  layouts:['desktop','mobile'] },
  { id:'legend',   label:'Legend',            key:'l', group:'map',  toggle:'legend',      layouts:['desktop','mobile'] },
  { id:'minimap',  label:'Overview map',      key:'m', group:'map',  toggle:'minimap',     layouts:['desktop'] },
  { id:'places',   label:'Place names',       key:'n', group:'map',  toggle:'places',      layouts:['desktop','mobile'] },
  { id:'monuments',label:'Monuments',         key:'k', group:'map',  toggle:'monuments',   layouts:['desktop','mobile'] },
  { id:'distance', label:'Measure distance',  key:'d', group:'tools',mode:'distance',      layouts:['desktop','mobile'] },
  { id:'bookmarks',label:'Bookmarks',         key:'b', group:'tools',panel:'BookmarkPanel',layouts:['desktop','mobile'] },
  { id:'ancestor', label:'Follow an ancestor',key:'a', group:'story',panel:'AncestorPanel',layouts:['desktop','mobile'] },
  { id:'eye',      label:"Soldier's eye view",key:'e', group:'story',panel:'EyePanel',     layouts:['desktop','mobile'] },
  { id:'walk',     label:'Virtual walkthrough',key:'w',group:'story',panel:'Walkthrough',  layouts:['desktop','mobile'] },
  { id:'tour',     label:'Guided battle tour',key:'t', group:'story',panel:'TourPanel',    layouts:['desktop','mobile'] },
  { id:'help',     label:'Help and shortcuts',key:'?', group:'help', panel:'HelpModal',    layouts:['desktop','mobile'] },
];
```
    Key letters are proposals (S, F, L, M, B, ? are already bound; O, R, Y, N, K, D, A, E, W, T are free today). Owner to confirm.
  2. Desktop toolbar renders grouped buttons from the registry, with an overflow "More" menu below 1100 px; "Extra Features" and "Ask the Historian" become registry-adjacent toolbar items (app-bugs-25); the duplicate magnifier and the PDF anchor go away (PDF moves into Help). Each button: `aria-label`, `aria-pressed` for toggles, `aria-keyshortcuts`, `title`.
  3. OOB tree built from parent ids (`parent_corps_id`, `parent_brigade_id`, ...), natural-sorted children, counts in headers, virtualised (`react-window`), memoised rows keyed on `(id, disposition, strength)` so a tick change re-renders only visible changed rows.
- **Acceptance test.** Button visible and labelled at 1024/1280/1440; `O` opens the tree; the children of "First Corps > First Division > First Brigade (Iron Brigade)" are its five regiments in natural ordinal order (2nd, 6th, 7th Wisconsin, 19th Indiana, 24th Michigan), nested under the brigade; node count equals OOB size; the registry test asserts every registry tool has a panel and appears in the Help table and the mobile sheet where `layouts` says so.
- **Metric moved.** Usability B- -> A-, Docs, a11y (names/targets), D4.

---

### app-bugs-14: Natural sort, search normalisation and Follow-Ancestor coverage (H5)

- **Severity** medium. **Effort** S (collator) + M (search). **Audit refs** H5, H7 (row copy). **Depends on** app-bugs-06 (list must not depend on loaded days).
- **Evidence (Verified).** Every list sort in the app (Appendix H): Follow-Ancestor `localeCompare` on display name (pretty:101039); OOB `localeCompare` on ids (pretty:102346, 102347, 102354); roster (pretty:102674, 102681); mobile roster (pretty:103130, 103133). Search "relevance" is `Object.entries(oobData)` insertion order (pretty:98775-98790) and the casualty sort `pA` (pretty:98724-98728). All use plain `localeCompare` without the `numeric` option, hence "102nd ... 109th, then 10th Alabama".
  - Follow-Ancestor list caps: 15 rows with an empty box, 20 when filtered (pretty:101041-101050). Matching is `String.includes` on lower-case `unit_id`/`name` (pretty:101044-101048): "20 maine", "20th ME", "chamberlain" all fail or miss.
  - The list is built only from **placed and already-loaded** units (`Object.values(placementsByTick)`, pretty:101021-101040). Data: 217 of 467 regiments and 38 of 103 batteries have any placement, so **250 regiments and 65 batteries cannot be found at all**; 217 of 478 animated ids have no day-1 row (app-bugs-06); 100 animated ids are not in the OOB and would display as raw ids such as `C-4AL-Law`; 10 mis-prefixed rows appear as Union (app-bugs-35).
- **Fix spec.**
```js
export const natural = new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare;
// regiment ordering key: side, then corps order, then state, then ordinal, then suffix
const STATE_ALIASES = { me:'maine', nh:'new hampshire', vt:'vermont', ma:'massachusetts', ct:'connecticut', ri:'rhode island',
  ny:'new york', nj:'new jersey', pa:'pennsylvania', penn:'pennsylvania', de:'delaware', md:'maryland', oh:'ohio', in:'indiana',
  il:'illinois', mi:'michigan', wi:'wisconsin', mn:'minnesota', ia:'iowa', wv:'west virginia', va:'virginia', nc:'north carolina',
  sc:'south carolina', ga:'georgia', fl:'florida', al:'alabama', ms:'mississippi', la:'louisiana', tx:'texas', ar:'arkansas', tn:'tennessee' };
export function normalise(q) {
  return q.toLowerCase().replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/[.,'’]/g, '').replace(/\s+/g, ' ').trim();
}
// tokens are AND-ed against: designation, state name + code (via STATE_ALIASES), commander.name, unit_id, alias_for, key_action
// rank: (number + state) exact > designation prefix > commander > substring; stable natural tiebreak
```
  - Build the list from the **OOB** (regiments + batteries), not from placements; lazily `ensureDay()` on select (app-bugs-06); show a badge "Not animated on the map yet" for the 250+65 unplaced ones with a link to `/regiment.html?unit=ID`; virtualise (no 15/20 cap).
  - Use the same `natural`/`normalise` in Search, OOB, roster and `find-ancestor.html`/`search.html` (shared `lib/text.js`).
- **Acceptance test.** Unit tests on 30 real designations: sorted output puts "1st ..." < "2nd ..." < "10th ..." < "102nd ...". Queries `20 maine`, `20th me`, `chamberlain`, `joshua chamberlain` -> `U-20ME` first; `1 minnesota`, `1st mn` -> `U-1MN`; `15th alabama` found on a fresh load; an unplaced regiment is found and shows the badge.
- **Metric moved.** Findability (genealogy audience), H5 closed, a11y (none).

---

### app-bugs-15: Every hard-coded count, and how to derive it from data (H10)

- **Severity** medium-high (credibility). **Effort** M. **Audit refs** H10, H11. **Depends on** app-bugs-35 (data-ID fixes decide the final numbers).
- **Evidence (Verified; the data truth table is below and the literal locations are in Appendix G).** Literals in `index.html` (15, 18, 24, 32, 377, 719, 745, 754), `manifest.json:4`, HelpModal chunk ("675 five-minute ticks", "445+ ... units", "24 narrative vignettes"), `find-ancestor.html:48` ("467 Union and Confederate regiments and batteries"), `historian.html:48` ("467 regimental records, 24 narrative vignettes, 137 chronology events, and 30 mapped terrain features"), `site-nav.js:27` ("All 24 key moments"), the guide PDF (467, 675, 20 tools, 16 stops, 512 monuments, 8 sites), and in the bundle: `nA = 675` (pretty:9326), `s2 = 675` (96949), `Math.min(675, ...)` (112979), "Tick c/675" (112357), "675 five-minute snapshots" (111893), the day boundaries `<= 225 ? 1 : <= 450 ? 2 : 3` and `224` repeated at pretty:9374, 9375, 9386, 97282, 97427, 97482, 99740, 100837, 100999, 102975, 112215, 113055, and the minimap footer `(x[z]||[]).length` (pretty:99821).
  - **What the data actually says (my probes):**

| Quantity | Value | Note |
|---|---|---|
| OOB ids total | 705 | 467 regiments + 103 batteries + 93 brigades + 31 divisions + 11 corps |
| "regiments and batteries" | **570** | not 467; 467 is regiments only |
| Union / Confederate OOB ids | 410 / 295 | |
| Animated distinct unit ids | 478 | 217 regiments, 38 batteries, 89 brigades, 28 divisions, 6 corps, **100 not in OOB** |
| Placement rows / populated ticks | 1,804 / 188 of 675 | 103 duplicate `(unit,tick)` pairs |
| Tick 1 | 73 rows, 71 distinct units | the "72 units" label |
| Vignettes | 24 | matches |
| Chronology events | 137 | 45 critical, 73 high, 16 medium, 3 low |
| Story markers `mA` / Walkthrough monuments `_A` / `monuments.json` | 20 / 512 / 9 | three datasets, app-bugs-30 |
| Tour stops / Soldier's-eye sites | 16 (two different lists) / 8 | app-bugs-27 |
| Tools (site-nav GROUPS) | 20 | matches |

- **Root cause.** Numbers are typed into prose in 30+ places; the app derives none from its data.
- **Fix spec.**
  1. `scripts/build-facts.mjs` reads `/data/**` and writes `facts.json` (`oob.{regiments,batteries,brigades,divisions,corps}`, `animated.{units,regiments,batteries,notInOob}`, `ticks.{max:675,minutes:5,dayStarts:[1,226,451]}`, `vignettes`, `chronologyEvents`, `criticalEvents`, `walkthroughStops`, `monuments`, `storyMarkers`, `soldierEyeSites`, `tools`, `terrainFeatures`).
  2. HTML: Vite `transformIndexHtml` (or a Node injector for static sub-pages) replaces `<!--fact:oob.regiments-->467<!--/fact-->` markers; meta/JSON-LD/manifest use the same values.
  3. App: `import facts from './facts.generated.json'`; Help/About, minimap footer, tour, "Tick x / max" and the day tabs read it; `dayOf()/dayStartTick()` live in `sim/battleClock.js` (app-bugs-08) and replace all 12 copies of the 225/450 logic.
  4. CI: `scripts/check-facts.mjs` scans built HTML/JSON/JS for `\d+\s+(regiments|batteries|vignettes|monuments|stops|tools|events)` and fails if the number is not in `facts` (interim, before R1: run the same script against the deployed folder).
  5. Copy decision for the owner: "570 regiments and batteries in the order of battle; 478 animated positions (after ID fixes)". "minute-by-minute" in `index.html` and "five-minute snapshots" contradict each other; choose one.
- **Acceptance test.** Help -> About, home meta description, historian and find-ancestor pages all print the same numbers as `facts.json`; the check script fails when a literal is changed by hand.
- **Metric moved.** Consistency (H10) C- -> A-; trust; docs.

---

### app-bugs-16: Minimap is frozen at tick 1 (H11 root cause)

- **Severity** medium. **Effort** S. **Audit refs** H11. **Depends on** app-bugs-07 for the final data source.
- **Evidence (Verified).** `GF` (pretty:99644-99658) calls `yn.subscribe(M => M.currentTick, M => {...})`. The store is plain zustand `create`: `subscribe: (Ee) => (x.add(Ee), () => x.delete(Ee))` (pretty:9116-9128), a one-argument listener API; the two-argument selector form belongs to the `subscribeWithSelector` middleware, which is not used (`yn = y4((c, f) => ({...}))`, pretty:9361). The first argument is registered as the listener (its return value is ignored); the second is dropped. So `GF()` returns the mount-time tick forever. `WF` (pretty:99711-99830) draws `x[z]` for that tick and prints `(x[z]||[]).length " units · tick " z` (pretty:99821): at first paint `x[1]` may be empty ("1 units"), later 73 ("72 units", the distinct count). Playback does not move the dots either.
  - Even with a correct tick, `x[z]` contains only rows keyed **exactly** at that tick (0-8 rows on most ticks; 487 of 675 ticks have none), so the minimap would flicker to empty; it must use `unitsAt(tick)` (app-bugs-07).
- **Fix spec.** `const tick = useStore(s => s.currentTick)`; draw `unitsAt(tick)`; footer `"{n} units on the field · {clock}"` from `battleClock`; `role="img"` with an `aria-label` summarising sides; keep the 9 px text out of the design system (raise to 12 px). Tranche 0 patch C is the one-line version.
- **Acceptance test.** Play 30 s: dots move and the tick advances; jump to July 3: the count changes; tick 1 shows 71.
- **Metric moved.** H11, visual truth.

---

### app-bugs-17: Distance tool: single endpoint, no line (H12)

- **Severity** medium. **Effort** M. **Audit refs** H12. **Depends on** app-bugs-37 (debug hook for tests).
- **Evidence.** `GtbgDist` (pretty:112677-112919). It adds source `gbdist` and layers `gbdist-line`/`gbdist-pts` with legacy `["==","$type",...]` filters (pretty:112718-112731; valid in the bundled mapbox-gl 3.24.1: filter converter at pretty:18392-18435). Clicks arrive through a global hook `window.__gtbgApp._gbDist` installed in the effect (pretty:112758) and called from the unit canvas' `onClick` (pretty:97369-97376). State machine phases 0 (place A) -> 1 (place B) -> 2 (show result) -> reset. Every map operation is wrapped in an empty `try { ... } catch (e) {}` (pretty:112694, 112701, 112708, 112738, 112766, 112783, 112818, 112833, 112842, 112847). The map handle `m = yn.getState().mapRef` is read **once** when the effect runs (pretty:112705).
  - The audit measured correct maths (9,311 ft = 3,104 yd = 2,838 m; `mtime` = round(m/67) minutes, i.e. 2.5 mph) but saw one marker and no line.
- **Root cause: not provable statically** (geometry, maths and filters are valid). Ranked hypotheses, each testable in minutes with the debug hook from app-bugs-37:
  1. `setData` on the second click throws inside the empty catch (source missing), while `setResult` still updates the panel (matches "maths right, drawing wrong").
  2. Layers/source were removed by a style change or by the effect cleanup ordering after the first click.
  3. GeoJSON worker update delayed under main-thread load (per-frame React commits, app-bugs-32) so the screenshot was taken before the repaint.
  4. Effect ran before `mapRef` existed (early toggle): no layers and no handler, so clicks fall through to unit selection (the panel still says "Click map for point A").
- **Also definite defects.** No re-add on `styledata`; touch taps are handled by the map touch hook `k4` (pretty:9909-9980, `touchend` selects the nearest unit unconditionally) **and** by the synthetic `click`, so on tablets in Desktop layout the tool and unit selection double-fire; Esc does not cancel; a third click resets without starting a new A; ft/yd/m only; pace fixed at 67 m/min; no labels on the endpoints.
- **Fix spec (rewrite).** `useDistanceTool(map)`: while active set the cursor, register `map.on('click', ...)` (not the unit canvas), block unit selection via the tool-mode flag in the store; A and B as `mapboxgl.Marker`s (DOM, always visible, labelled "A"/"B", draggable to adjust), the line as a GeoJSON layer re-added on `styledata`, a rubber-band segment and live distance on `mousemove`; result panel `aria-live="polite"` with ft, yd, m, mi, km and a march-time pace selector (2.5 mph infantry, 3 mph, cavalry trot), "Copy" button; Esc cancels; third click starts a new A; log (`console.error`) instead of swallowing errors.
- **Acceptance test.** Activate, click two points: two `.dist-marker` elements exist, `getSource('gbdist')._data.features` has one LineString, result text matches Haversine within 1 m; drag B updates; Esc removes everything; on an emulated touch device one tap = one point and no unit selection; no console errors.
- **Metric moved.** H12, function; a11y (live region).

---

### app-bugs-18: Soldier's Eye View hands off to Google Maps (H13a)

- **Severity** medium. **Effort** M (S if panos are known). **Audit refs** H13, G1. **Depends on** app-bugs-19 (shared `StreetViewEmbed`), X2 (key restrictions).
- **Evidence (Verified).** `Yk` (pretty:101958-102069): the subtitle promises "Street View panoramas from the battlefield" (pretty:101983-101990); the viewer is a placeholder "Street View opens in Google Maps" (`svPlaceholder`, pretty:102040-102060); the link builder `M(P)` (pretty:101961-101963) emits `@lat,lng,3a,75y,{heading}h,{90+pitch}t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192` with an **empty pano id** (`!1s!`), so Google may open a map view rather than the pano. The 8 sites `rO` (pretty:101889-101957) carry `lat/lng/heading/pitch` only. The Walkthrough already embeds panoramas in an iframe for 16 stops (`yA`, pretty:110644-110656) with 14 pano ids (`d2`, pretty:104096+). The guide claims embedded panoramas (`ug.txt:119`).
- **Fix spec.** Reuse the Walkthrough's `StreetViewEmbed` (app-bugs-19) inside `Yk`, keyed by site id. Map each site to the Walkthrough stop of the same place (`eye2stop.js`; site coordinate to pano distance): Little Round Top -> stop 8 (523 m), The Angle -> stop 15 (160 m), Wheatfield -> stop 9 (516 m), Peach Orchard -> stop 10 (315 m), Cemetery Hill -> stop 14 (155 m), Culp's Hill -> stop 13 (225 m), **McPherson Ridge -> stop 1 (2,195 m)**; Devil's Den has no matching stop (nearest is stop 9, 399 m), so it needs a new pano id (owner picks it in Google Maps and stores it as `pano`). The large offsets show that the site coordinates themselves disagree (app-bugs-38); fix the coordinates first, otherwise the panorama will not match the on-screen name. Keep "Open in Google Maps" as a secondary link. Add a list-row keyboard model (`button` elements, currently `div onClick`, pretty:101995-102012) and a caption from our own data (name, heading).
- **Acceptance test.** Each of the 8 sites renders an iframe whose `src` contains `streetview` and a different `pano=`/`location=`; caption text changes per site; failure path shows the fallback link after 8 s; no console errors.
- **Metric moved.** H13, guide accuracy, function.

---

### app-bugs-19: Walkthrough Street View: frame reuse, caption, data offsets, and no map on mobile (H13b)

- **Severity** medium. **Effort** M. **Audit refs** H13, S-mobile. **Depends on** none.
- **Evidence (Verified unless marked).**
  - `yA` (pretty:110627-110688): the iframe has no `key`; only its `src` prop changes when the stop changes (pretty:110658-110668). The browser navigates, but there is no loading state, so the previous panorama and Google's own overlay caption stay visible until the new frame paints. **Inferred:** the audit's "48 Reynolds Ave S for stops 1 and 8" is a stale-frame capture; the data differ (stop 1 pano `NPoPaAZH82fn6rRlPiFK9w` vs stop 8 `A7rGaIwx9lZjUK9N1PW0sA`).
  - Pano vs marker distance (`svdist.js`): stop 1 424 m, 3 (no pano, location lookup) 695 m, 4 684 m, 5 (no pano) 633 m, 6 **1,045 m**, 7 **953 m**, 8 95 m, 9 181 m, 10 374 m, 11 328 m, 12 131 m, 13 235 m, 14 326 m, 15 9 m, 16 391 m, 2 0 m.
  - **Mobile Walkthrough has no map.** The map effect initialises via `document.getElementById("gtbg-wt-map")` (pretty:110767) with deps `[]` (pretty:110852). Only the desktop branch renders that id (pretty:111096); the mobile branch (`x = isMobile || width <= 860`, pretty:110734, `gO` at 110614-110625) renders `<div ref={P} style={kr.map}>` with no id (pretty:110875), so `el` is null and the map is never created; crossing the 860 px breakpoint later never re-runs the effect either.
  - Google Maps Embed key `mO` (pretty:110610) is in client code; restrict by HTTP referrer and to the Embed API (X2).
- **Fix spec.** One `StreetViewEmbed`:
```jsx
function StreetViewEmbed({ stop }) {
  const sv = stop.sv, [state, setState] = useState('loading');
  const src = `https://www.google.com/maps/embed/v1/streetview?key=${MAPS_KEY}&${sv.pano ? `pano=${encodeURIComponent(sv.pano)}` : `location=${sv.lat},${sv.lng}`}&heading=${sv.heading}&pitch=${sv.pitch ?? 0}&fov=${sv.fov ?? 90}`;
  useEffect(() => { setState('loading'); const t = setTimeout(() => setState(s => s === 'loading' ? 'slow' : s), 8000); return () => clearTimeout(t); }, [src]);
  return (
    <figure className="sv" data-state={state}>
      <iframe key={stop.id} src={src} title={`Street View: ${stop.name}`} loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" onLoad={() => setState('ready')} />
      {state !== 'ready' && <div className="sv-skeleton" role="status">Loading Street View{state === 'slow' ? ' (still loading, check your connection)' : ''}</div>}
      <figcaption>Street View near {stop.name}, facing {compass(sv.heading)}. <a href={mapsUrl(sv)} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></figcaption>
    </figure>);
}
```
  - Data: add `sv.verified` and `sv.offsetM` computed at build time; require a pano id for every stop (3 and 5 are missing) and review stops with an offset > 300 m against NPS Auto Tour coordinates (6, 7, 3, 4, 5 first).
  - Merge the two JSX branches of `_O` into one responsive tree and init the map from `ref` with deps on `isMobile`.
  - `dangerouslySetInnerHTML` on `history` (pretty:110640) is safe today (static constants); if stop text ever moves to external JSON, sanitise (`DOMPurify`) or convert `<span class='lead'>` to markup.
- **Acceptance test.** For stops 1..16 the iframe `src` is unique and the element identity changes on each selection; skeleton visible until `load`; at 375 px the Walkthrough shows a map canvas; offsets report lists every stop > 300 m.
- **Metric moved.** H13, mobile function, S-mobile.

---

### app-bugs-20: Help modal appears 1-2 s late (D1)

- **Severity** medium. **Effort** S. **Audit refs** D1. **Depends on** none.
- **Evidence (Verified).** `MO`/`EO` are `React.lazy(() => import(...))` (pretty:112469-112470), rendered inside `<Suspense fallback={null}>` (pretty:113277). The chunks are 7,027 B and 4,869 B (files in `assets/`), not preloaded (the preload helper is called with an empty dependency list) and not in the service worker precache (`sw.js:5-13`), so the first click makes a network request through the SW. React 18.3.1 throttles Suspense reveals: `f = YS + 500 - Yr()` (pretty:7525, i.e. `FALLBACK_THROTTLE_MS = 500`, retry lanes only): after the fallback commits, the resolved content waits until 500 ms have passed.
  - The click handler `pe(!Lo)` is a plain state update, not a transition, so the boundary shows its (empty) fallback.
- **Root cause.** A 7 KB modal was code-split behind a null fallback; the built-in 500 ms Suspense throttle plus a cold request plus a busy main thread (per-frame commits, app-bugs-32) gives the 1-2 s.
- **Fix spec (pick one, in this order of preference).**
  1. **Do not split these two modals** (12 KB raw, ~4 KB brotli): static imports. Instant, and removes two request waterfalls.
  2. If splitting is kept: preload on idle after the first interaction and on `pointerenter`/`focus` of the "?" and "B" buttons (`import('./HelpModal')`), add both chunks to the SW precache, open inside `startTransition`, and give `Suspense` a real fallback (a `role="dialog" aria-busy` skeleton) so a click always shows something within one frame.
  3. Have the SW precache list generated from the build manifest (`vite-plugin-pwa`/workbox) so lazy chunks are never forgotten.
- **Acceptance test.** Playwright with CPU 4x throttle: click "?" -> `[role=dialog]` visible < 150 ms, no long task > 50 ms; Bookmarks the same; first click on a cold cache (SW disabled) shows the skeleton within 100 ms.
- **Metric moved.** D1, INP (the interaction's next paint).

---

### app-bugs-21: Map does not auto-fly after day jumps (D3a)

- **Severity** medium. **Effort** M. **Audit refs** D3. **Depends on** app-bugs-06, app-bugs-07.
- **Evidence.** `jumpToDay` changes the tick only (pretty:9369-9370); keys 1/2/3 (pretty:112979-113010) and the transport day buttons (pretty:112233) do the same; only the Follow-Ancestor click (`xe`, pretty:101125-101134), the NPS tour (`Se`, pretty:100329-100342) and monument clicks fly. The default view is fixed (`pF/mF` = -77.235, 39.812, 13.5; pretty:97211-97212; `maxBounds` at pretty:97243-97246). The site already contains a working "director" algorithm: `camera.html:126-141` (`densestClusterBounds`, 0.01 degree grid) and a pure `placementAtTick` (`camera.html:105-114`). The vignettes carry `trigger_lat/trigger_lng` and the chronology carries `location`.
  - Together with app-bugs-06/07 this is the "July 3 dawn: empty fields, units at the edge" experience.
- **Fix spec.** `map/cameraDirector.js`:
```js
export function frame(map, { tick, unit, panelsOpen, reducedMotion }) {
  const pts = unit ? [posOf(unit, tick)] : activePoints(tick);           // combat pairs (X4), charging, deployed artillery first
  if (!pts.length) return;
  const b = unit ? null : densestBounds(pts, { cell: 0.01, pad: 0.004 });
  const opts = { padding: { top: 70, bottom: 170, left: 60, right: panelsOpen ? 380 : 60 }, maxZoom: 15,
                 duration: reducedMotion ? 0 : 1200, essential: false };
  unit ? map.flyTo({ center: pts[0], zoom: 15, ...opts }) : map.fitBounds(b, opts);
}
```
  Triggers: explicit jumps only (day tab, keys, bookmark, deep link, tour step, chronology/vignette click) after `ensureDay()` resolves. During playback: off by default; optional "Follow the action" toggle; suppress after user pan/zoom (`map.on('dragstart')` with `originalEvent`) for 10 s. Optionally precompute `frames.json` (per day dawn and per critical event) from vignette/chronology coordinates for determinism.
- **Acceptance test.** Press `3` on a fresh load: within 1.5 s the map centre is within 1.5 km of the cluster centroid at tick 451 and at least 30 % of units are in view; with `prefers-reduced-motion` the move is instant; user drags, playback continues: no camera fight.
- **Metric moved.** D3, usability, a11y (reduced motion).

---

### app-bugs-22: Label collisions, empty-OOB labels and the per-frame cost (D3b)

- **Severity** medium. **Effort** M (label engine) / XL (move units to Mapbox layers). **Audit refs** D3, A4. **Depends on** app-bugs-07.
- **Evidence (Verified).** `lS` (pretty:96506-96690):
  - Marker separation runs only when zoom >= 11: 8 iterations of pairwise pushes over all on-screen markers (`for Jt < 8`, pretty:96561), O(n^2) per frame (about 160,000 pair checks per frame at n = 200), using marker size and a fixed 12 px vertical threshold; **label boxes are not part of the collision test** (labels are drawn afterwards at `y - 13`, pretty:96653-96683).
  - Labels are drawn for **every** unit once zoom >= `it` = 12 (desktop) / 14 (canvas < 500 px) (pretty:96653), i.e. at the default zoom 13.5 all units get a black pill label; there is no priority or cap.
  - `Y4(Xe, Ee, {})` (pretty:96661) passes an **empty OOB**, so designations never appear and text falls back to `cx()` codes (pretty:96456-96464) such as "20 ME", "I/1/1", "ART/A4US". Label text tiers: zoom >= 16.5 designation + strength, >= 15 designation, >= 14 code, >= 12 code truncated to 6 chars (pretty:96465-96479).
  - Debug leak: `Yx() < 45` paints "NN fps" in orange at the canvas' bottom-left (pretty:96684-96690). The FPS counter double-counts: `sT()` is called in `Ed` (pretty:96976) and again in the HUD's own loop (`_F`, pretty:97421), so it reads about 2x.
- **Fix spec.**
  1. **Label engine** `map/labels.js`: candidates sorted by priority (selected/pinned > in combat (`X4`) > larger strength), greedy placement with a 64 px spatial hash, anchor fallbacks [above, right, below, left], hard cap (desktop 60, mobile 30), text halo instead of pills, `measureText` cached per (font, text). Zoom tiers: < 12 none except selected; 12-13 corps/division markers; 13-14 brigades + units in combat, short names ("20th ME"); 14-15 regiments with short designation ("20th Maine", "Cushing"); >= 15 full designation, strength only on hover/selection. Pass `oobData` into `lS` (it already has an unused 9th parameter `R`).
  2. **Separation**: replace the O(n^2) x 8 loop with a grid relaxation (neighbours in adjacent cells, 3 iterations).
  3. Remove the fps text; count frames once (`sT` in the ticker only).
  4. **Stretch (XL, coordinate with perf):** move units into a GeoJSON source with `circle`/`symbol` layers (`symbol-sort-key`, `text-allow-overlap: false`, `text-optional: true`, `['step',['zoom'],...]` text tiers), which gives GPU drawing, built-in collision and lets the Canvas2D path be deleted.
- **Acceptance test.** Day 3, tick 538, default view: `window.__gtbg.labelStats()` reports overlap ratio < 2 % and labels <= cap; zoom tiers behave as tabled; frame time p95 < 8 ms on a 2019 laptop at 8x; unit tests on placement with synthetic clusters.
- **Metric moved.** D3, fit & finish, INP/TBT (frame cost), A4 (12 px minimum for label text).

---

### app-bugs-23: Feature-claim parity: what the guide, Help and tour say vs what the app does (D4)

- **Severity** medium. **Effort** S (after the code fixes; docs specialist owns the PDF text). **Audit refs** D4, G1, H8.
- **Evidence (guide = `ug.txt`, Help = HelpModal chunk, tour = `bO`):**

| Claim | Reality (evidence) | Resolution |
|---|---|---|
| "Esc: Close any panel" (ug p1; Help "Dismiss panel / deselect unit"; troubleshooting "Press Escape") | Ignored in inputs; leaves pinned unit, story, event card, legend, layers, distance, tours (app-bugs-09) | fix code |
| "H: Heatmap" (ug p1, p3; Help; tour quick-reference pretty:111995) | no consumer (app-bugs-24) | build or remove everywhere |
| "Filter by unit type" (ug p2) | `unitTypes` never applied (app-bugs-26) | implement |
| "Find Unit / Location ... type a unit or place name to fly straight there" | duplicate of Search, units only (pretty:113213) | implement place search from `terrain.json` or drop the button and sentence |
| "Toggle Units" | desktop only, no pressed state (app-bugs-26) | fix |
| "Monuments: toggle 512 monument dots ... active units glow gold" | 20 story markers (`mA`); the 512 exist only as a list/mini-map in the Walkthrough (app-bugs-30) | rename to "Story markers", or really show 512 |
| "Follow Ancestor: gold trail glows; share ?ancestor=" | no trail (02); link never opens the panel (05) | fix |
| "Bookmarks: save tick, unit, map position; share a permalink" | permalink never restored (05) | fix |
| "Order of Battle" | unreachable on desktop (13) | fix |
| "Switch anytime from the Tools menu" | mobile -> desktop only, not remembered (11) | fix |
| "Speed settings 1/4x ... 8x", "Reset to 1x" | keys reach 16x with no label; "1x (real time)" label is false (33) | fix |
| "Colored dots mark key events (red = critical, gold = significant)" | desktop uses 5 hand-picked colours on 8 dots (`TO`, pretty:112192-112201); mobile red/gold | derive from data (36) |
| "Soldier's Eye: Street View panoramas" | opens Google Maps (18) | fix |
| "16 NPS Auto Tour stops ... Walkthrough" | the map's "NPS Auto Tour" button is a different 16-stop list (27) | unify/rename |
| Legend "Dot outline = side colour, Dot fill = disposition colour" and "Size" tab draws circles | canvas draws rotated rectangles filled with the side colour; disposition is the small dot above (`lS`, pretty:96590-96650) | correct legend copy |
| "Unit Roster: all units on the field at the current tick" | 100-tick lookback (07) | fix |

- **Fix spec.** Generate the Help table and the guide's shortcut/tool tables from `TOOLS` + `hotkeys` (app-bugs-13/09); add a CI test that parses the guide text export and fails when it lists a tool/key the registry does not have.
- **Acceptance test.** The parity test passes; a manual sweep of every row above matches the doc.
- **Metric moved.** Documentation B -> A, H8 (honest naming), Usability.

---

### app-bugs-24: Dead heatmap code, the `H` key, and the unused `casualty_apportionment.json` (D4)

- **Severity** low-medium. **Effort** S (remove) / L (build). **Audit refs** D4, G1. **Depends on** owner decision.
- **Evidence (Verified by store audit).** `showCasualtyHeatmap`/`toggleHeatmap` (pretty:9419, 9435); `H`/`h` key calls `toggleHeatmap` (pretty:113022-113025); `AO` destructures them (pretty:112930, 112938) but nothing renders a layer; `casualtyData`/`setCasualtyData` (pretty:9447-9448) are never read or written; Help lists "H Toggle heatmap"; the tour's quick reference lists "H Heatmap"; the guide describes it. `/data/casualty_apportionment.json` (11.7 KB) is fetched only by `dashboard.html` and `living-ledger.html`; its own metadata says "per-tick casualty scaling for the animation engine", but it is corps-level (12 corps x engagement periods with bell-curve parameters), so it cannot drive a geographic heatmap. The Ground Remembers page already has a working Mapbox `heatmap` layer (`ground-remembers.html:91-105`). RECON_SRC `PENDING.md` flags this exact item as "decide deliberately".
- **Options.**
  - **A (recommended now, S):** delete the store fields, the `H` case, the Help/tour/guide rows; add "The Ground Remembers (heatmap)" to the Extra Features menu.
  - **B (L):** real overlay. Build casualty points from strength drops between keyframes (`uF` at pretty:97033-97044 already computes drops for the flash effect): `{tick, lng, lat, w = drop}`; add a Mapbox `heatmap` layer (paint copied from `ground-remembers.html`), and drive it with `map.setFilter('casualty-heat', ['<=', ['get','tick'], tick])` (cheap; no data rebuild), `H` toggles it, legend chip, `aria-pressed`. Add a small HUD counter "casualties so far, Union / Confederate" computed from `casualty_apportionment.json` per its formulas (this is the file's real purpose).
- **Acceptance test.** A: `H` does nothing and no doc mentions it. B: `H` shows/hides the layer; heat accumulates with the tick; no console errors.
- **Metric moved.** D4, docs consistency (G1), dead-code removal.

---

### app-bugs-25: The six inline scripts in `index.html`: what each really does, and their native replacements

- **Severity** medium-high. **Effort** M. **Audit refs** H1, H3, H8, A5, P4 (adjacent). **Depends on** app-bugs-13 (toolbar registry), app-bugs-11.
- **Evidence (Verified; `index.html` line numbers).**

| Script (lines) | What it does | Defects |
|---|---|---|
| Extra Features overlay: CSS 168-237, markup 285-292, populate 294-353 | Fixed `#extra-features` (`z-index: 999999`, top 60, right 14), menu built from `GTBG_MENU` in `site-nav.js`, eye toggle persisted as `gtbg-ef-hidden` | Floats over story panel, layers panel, walkthrough, chooser (H1); own Esc handler (323); inline-styled outside the design system |
| Reveal (441-519) | Reveals the overlay after a click whose **ancestor `textContent`** matches `/select desktop\|select mobile\|skip introduction\|skip tour\|skip intro/i` (walks up to 6 parents, 476-482); fallback 1.5 s DOM scan (509-511) and 10 s safety (517) | Any click inside a container that also holds "Skip introduction" text reveals it early, over the onboarding modal; two timers; text-matching a React tree |
| Collision mover (521-606) | For each of 6 candidate positions, measures **every** `button, a, input, select, [role]` with `getBoundingClientRect` and moves the overlay (`applyPosition` writes inline styles up to 6 times), re-run 150 ms after **every click** (599-602) and on resize | Forced synchronous layout x6 per click; the pin jumps between corners; cannot know about canvas-drawn UI |
| Onboarding banner injector (355-396) | Every 200 ms, up to 25 tries (about 5 s), finds a leaf element whose text is "choose your experience" and inserts a banner ("20 more tools live behind Extra Features ... an AI-style historian") after it | **The earliest the chooser can appear is later than the injector's give-up time**: day-1 data ready + 0.8 s + `eO` 3.5 s (pretty:101471) + 0.6 s fade/timeout (pretty:101482-101522) is at least about 5.9 s after the module starts (the data cannot be ready sooner than roughly 1 s), but the loop stops after 25 ticks, about 5 s; it only works when the main thread is so busy that 25 timer ticks stretch past that (Inferred: slow devices yes, fast desktops no). Copy is hard-coded ("20", "AI-style", H8) |
| Toolbar labeler (398-440) | Adds `title`/`aria-label` to buttons whose text is S/F/L/B/? | **Never does anything**: it returns early when `b.title` exists (line 414) and every `Vs` button already has a `title` (pretty:113287-113299). The `#seo-content` removal it gates (`labeled >= 3`, 422-426) therefore never runs either (React clears `#root` on first commit anyway). Meanwhile a `<button>` whose text is "S" has the accessible name "S" (content beats `title`), so screen readers announce "S", "F", "B", "?" and emoji names (A5) |
| Monuments star overlay (608-714) | Adds a second monument layer (9 stars from `/data/monuments.json`) to the toolbar's Monuments button, positioned with a fixed-view Mercator formula that **does not follow pan/zoom** (admitted in the comment, 620-622) | Duplicates the native `KF` markers; state is inverted (native on by default `sn = true`; overlay starts hidden), so one click hides one set and shows the other; third monument dataset (app-bugs-30) |
| SW registration + `controllerchange -> reload` (255-277) | see C6 (other specialist) | |

- **Root cause.** The app shell is compiled and un-editable, so features were bolted on from outside using text matching and timers.
- **Fix spec.**
  1. Delete all six inline scripts and their CSS from `index.html` (keep JSON-LD, `#seo-content`, boot splash).
  2. Native Extra Features: `ExtraFeaturesMenu` component inside the toolbar (desktop) and as a Tools-sheet entry (mobile), fed by `site-nav`'s `GROUPS` exported as JSON (`nav.json`) so sub-pages and the app share one list. "Ask the Historian" becomes a normal toolbar item (registry `group:'story'`). No fixed overlay, no collision code.
  3. Chooser banner rendered by `DeviceSelect` JSX (text from a constant, count from `facts`, wording per H8).
  4. `aria-label` set by `IconButton` (app-bugs-39). The 6 s of extra timers and the per-click layout thrash disappear.
- **Acceptance test.** `index.html` contains no inline `<script>` except JSON-LD; no fixed element with `z-index` > 1000 exists; Extra Features is reachable by keyboard from the toolbar and closes on Esc; the chooser banner is present 100 % of loads (Playwright x20 with CPU throttle 1x and 6x); axe shows named toolbar buttons.
- **Metric moved.** H1, A5, INP (no per-click layout thrash), CLS, a11y.

---

### app-bugs-26: Toggle Units, Trails, the unit-type filter, and a hover tooltip that can never render

- **Severity** medium. **Effort** M. **Audit refs** D4, H6, A5. **Depends on** none.
- **Evidence (Verified).**
  - "Toggle Units" (pretty:113093-113113) calls `yn.getState().toggleUnits()` (store, pretty:9437), which flips `showUnits`, which only sets `display` on the **unit canvas** (pretty:97377-97379; unit bars, disposition dots and labels): the separate trail canvas (`J4`, pretty:96693-96707, z 8) and the monument markers stay visible; the button has no pressed state; there is no mobile equivalent; the label is ambiguous. A second copy of the toggle (`_uv`/`toggleUnits`, pretty:97357-97360) is dead. "Trails" is a separate button (pretty:97385-97390, emoji "wave dash Trails ON").
  - **Filter "Unit Type" (Infantry/Cavalry/Artillery) is dead:** `OF` writes `unitTypes` (pretty:99090-99107) and counts it in the "N active" badge, but `lS` destructures only `sides`, `dispositions`, `minStrength` (pretty:96513-96517). Helpers `q4`/`$4` (cavalry/artillery tests) exist and are unused for filtering. The guide promises this filter.
  - **Hover tooltip `fF` is mis-wired:** it takes `{hoveredUnit, mousePos}` (pretty:97063) but is rendered as `V.jsx(fF, { map: M.current, canvas: x.current })` (pretty:97384), so it always returns `null`. If it were wired it would crash: `M.commander || "-"` renders an object (`commander` is `{name, fate}` in the OOB, e.g. `C-ART-Manly`) as a React child (pretty:97087-97090).
  - Dead canvas: `I4` creates a `pointer-events:none` canvas that nothing draws on (pretty:9842-9852, `Uc`); dead state `Ci`, `Si`, `di`, `Xa`, `ls` in `AO` (Appendix C).
- **Fix spec.** (1) Rename the button "Units" with `aria-pressed`, hide trails and labels together (or group under a "Units" menu with sub-toggles); mobile gets the same toggle from the registry. (2) Apply `unitTypes` via a `unitType(unit)` helper built from OOB `unit_type`/id patterns (`q4`, `$4` already implement cavalry/artillery) inside the shared `filterUnits(units, filters)`, used by map, roster, OOB and minimap. (3) Make the hover tooltip real: `pointermove` (throttled 50 ms) on the unit canvas using the existing spatial index `P.current` (`aT`/`Xx`, pretty:96388-96432), show after 150 ms, render `commander.name`, hide on touch devices. (4) Delete dead state and the dead canvas.
- **Acceptance test.** Filter Cavalry only: only cavalry markers and roster rows remain and the badge shows "1 active"; hover over a marker shows commander name in < 250 ms; Toggle Units shows a pressed state and also hides trails; `axe` clean.
- **Metric moved.** Function, docs consistency, INP (no per-frame drawing of hidden units).

---

### app-bugs-27: NPS Auto Tour (`XF`): stacked timers, hijacked speed, wrong name, wrong times, dead on mobile

- **Severity** medium. **Effort** M-L. **Audit refs** C4, H8, D4. **Depends on** app-bugs-08 (clock), app-bugs-11.
- **Evidence (Verified).**
  - `Se(stop)` (pretty:100329-100342): `flyTo`, `Kx()`, then `setState({currentTick: stop.tick, isPlaying: true, playbackSpeed: 2})` and `setTimeout(() => setState({isPlaying:false}), tickWindow * 500 / 2)`. The timeout is never cleared by Next/Previous/close (`st()`, pretty:100352) or unmount, so a stale timer pauses the *next* stop after a fraction of its window; the user's speed is permanently set to 2x.
  - Launch button `Zr.launchBtn` (absolute, bottom 90, right 16, z 200, pretty:100473) collides with the minimap FAB (bottom 130) and sound button (bottom 58); the stop panel is `bottom: 86; left: 60; right: 0; z 300` (pretty:100500-100515) and covers the transport bar on small windows; the dots bar (`dot` 8x8 `div`s, z 301) is mouse-only.
  - It renders in Mobile layout (app-bugs-11) where `Nn.current` is null, so `flyTo` silently does nothing; the mobile Tools tile just sets unused state (app-bugs-12).
  - **The list is not NPS's tour.** `th` (pretty:100063-100322) has 16 narrative stops (McPherson Ridge, Oak Ridge, Barlow's Knoll, ... Confederate Avenue) while the Walkthrough's "Tour Stops" `d2` (pretty:104096+) are the 16 official NPS Auto Tour stops. The guide says "16 NPS Auto Tour stops ... in the Virtual Walkthrough" and the map button is labelled "NPS Auto Tour".
  - **Printed times contradict the clock the user sees** (`tmp-app-bugs/th.js`, computed with the toolbar formula):

| Stop | Tick | Printed label | Toolbar shows at that tick |
|---|---|---|---|
| 1 McPherson Ridge | 12 | July 1, 7:30 AM | 6:55 AM |
| 3 Barlow's Knoll | 62 | July 1, 2:30 PM | 11:05 AM |
| 4 Seminary Ridge | 75 | July 1, 4:00 PM | 12:10 PM |
| 5 Little Round Top | 264 | July 2, 4:00 PM | **7:10 AM** |
| 6 Devil's Den | 268 | July 2, 4:30 PM | 7:30 AM |
| 7 Wheatfield | 275 | July 2, 5:00 PM | 8:05 AM |
| 8 Peach Orchard | 270 | July 2, 6:00 PM | 7:40 AM (before stop 7's tick) |
| 9 Cemetery Hill | 322 | July 2, 8:00 PM | 12:00 PM |
| 11 Cemetery Ridge | 315 | July 2, 7:30 PM | 11:25 AM (before stop 9's tick) |
| 12 The Angle | 548 | July 3, 3:00 PM | 12:05 PM |
| 13 East Cavalry Field | 522 | July 3, 3:00 PM | 9:55 AM |
| 14 Pickett's Charge | 540 | July 3, 3:00 PM | 11:25 AM |

  - Video: only stop 1 has `videoUrl` (an nps.gov `video/view.htm` page); `curl -I` on 2026-09-30 returned no `X-Frame-Options`/frame-ancestors from nps.gov, but the (Report-Only) CSP `frame-src www.google.com` in `netlify.toml` would block it once enforced; the narrative for stop 14 says the cannonade began "1:07 PM" while its own subtitle says 3:00 PM.
- **Fix spec.** One `data/stops.json` (`id, name, lat, lng, zoom, tick, tickWindow, sv{pano,heading}, video, narrative`) shared by the Walkthrough and the guided tour; labels generated from `battleClock`; rename the map feature "Guided battle tour" (keep "NPS Auto Tour" only for the Walkthrough list, which really is NPS's); a `TourController` with a cancelable timeline (`AbortController`/`clearTimeout` on next/prev/close/unmount), save and restore of the user's speed and play state, keyboard (Left/Right/Esc), dots as buttons with labels, mobile bottom-sheet presentation, and `www.nps.gov` added to `frame-src` when the CSP is enforced.
- **Acceptance test.** Press Next 5x quickly: no stale pause; after Close the previous speed/play state is restored; every stop's printed time equals `battleClock(stop.tick)`; keyboard-only run through all stops; on iPhone emulation the tour runs and flies.
- **Metric moved.** C4 (with 08), H8, function, a11y.

---

### app-bugs-28: Bookmarks and share links

- **Severity** low-medium. **Effort** S-M. **Audit refs** D4, A5, A6. **Depends on** app-bugs-05, app-bugs-29.
- **Evidence.** `BookmarkPanel` chunk + helpers `kO/PO/RO/IF` (pretty:97840-97896): key `gettysburg_bookmarks`; default label `f || IF(c)` where `IF` is a hard-coded table of 26 ticks, otherwise `"Tick N"`; `id: Date.now()`; share via `$k`/`TF` writes `?t=&u=&z=&ll=`, never read (app-bugs-05); on clipboard failure `window.prompt("Copy this link:", url)` (chunk `T()`; also pretty:97932); the delete "x" and the close are unlabeled; the panel is not a dialog (no role, no focus trap, backdrop click only); no export/import, no undo; the store's `bookmarkCount`/`bumpBookmarkCount` are dead (pretty:9445-9446); mobile Tools tile is dead (app-bugs-12) so mobile has no bookmarks.
- **Fix spec.** Default label = `battleClock` time + nearest chronology event ("8:25 AM, Vincent reaches Little Round Top"); share URL per the contract in app-bugs-05; `navigator.share` when available, else copy with a toast, and an inline read-only field instead of `prompt`; namespaced key with migration (app-bugs-29); export/import JSON; delete with undo toast; use the shared `Dialog`.
- **Acceptance test.** Save at tick 267 with unit pinned: label is meaningful; open the copied link in a new context: state restored; delete + undo works; keyboard-only operation; works on mobile.
- **Metric moved.** Usability, docs (guide promise), a11y.

---

### app-bugs-29: localStorage inventory and one storage layer

- **Severity** medium. **Effort** S-M. **Audit refs** H3, X5 (privacy). **Depends on** none.
- **Evidence (Verified by grep over the deployed tree; inventory in Appendix D).** Keys: `gtbg_prefs` (`{showLegend, showMinimap, onboardingComplete}`; store `v4/e2`, pretty:9327-9341, written by toggles 9425-9434), `gtbg_onboarded` = `"1"` (pretty:112951, 113068), `gettysburg_bookmarks` (pretty:97821-97852), `gtbg-ef-hidden` (`index.html:328-344`), `gtbg_watch_together_tour` (`watch-together.html`), `gtbg_session` (read only by `diagnostics.html`, never written), and Mapbox GL telemetry keys (`mapbox.eventData*`, `mapbox.turnstileEventData*`, pretty:54270-54304) that the privacy page does not mention (X5). Three prefixes (`gtbg_`, `gtbg-`, `gettysburg_`); two competing "onboarded" flags (`gtbg_onboarded` and the dead `gtbg_prefs.onboardingComplete`, pretty:9441-9444); unguarded read at pretty:112951 (app-bugs-04). **Not persisted:** layout, sound, speed, last tick/day, filters, locations/monuments/trails, seen vignettes.
- **Fix spec.** `lib/storage.js`: `get/set/remove/getJSON/setJSON`, try/catch with an in-memory fallback, namespace `gtbg:v1:`, `storage` event for cross-tab sync, one-time migration (copy legacy keys, then delete), `?reset=1`. Target keys: `layout`, `seenIntro`, `prefs` (legend, minimap, places, monuments, trails, units), `speed`, `bookmarks`, `seenVignettes` (sessionStorage), `efHidden` removed with the overlay. Add the storage list (functional-only, on-device) and Mapbox telemetry to the privacy page (X5).
- **Acceptance test.** Blocked storage: app works; legacy keys migrated exactly once; layout choice survives reload; privacy page lists every key.
- **Metric moved.** Reliability, privacy B+ -> A, H3.

---

### app-bugs-30: Monuments layer (`KF`): 48 px offset, an endless 60 Hz React loop, three datasets; and the same offset in the cursor ring

- **Severity** medium (perf + visual). **Effort** M. **Audit refs** P1 (INP/TBT), D4. **Depends on** app-bugs-32.
- **Evidence (Verified).**
  - `KF` runs `requestAnimationFrame(ut)` forever (pretty:100848-100871); each frame it calls `map.project` for all 20 markers and `setState(newObject)`, so React commits 60 times per second **even when paused, when the Monuments toggle is off, or in Mobile layout** (there `c.current` is null and it just re-queues, pretty:100852-100855); the loop is independent of the `showMonuments` flag. It also re-renders whenever `x`/`P` change.
  - Markers are `position: fixed; left: kt.x; top: kt.y` (pretty:100920-100933) using map-container coordinates, but the container is inset 48 px (`ux.container: inset "48px 0 0 0"`, pretty:97392): **all monument markers draw 48 px above their true position** (the bounds test `kt.y < 48` compounds it). The cursor ring `iO` (pretty:101817-101880) has the same defect: absolute in the root, coordinates relative to the container, so the ring sits 48 px above the pointer.
  - Markers are emoji glyphs (`"\u{1F3DB}"`), no keyboard access, no labels; default on (`sn = true`); three datasets: 20 story markers `mA` (pretty:100615), 512 Walkthrough monuments `_A` (pretty:104440), 9 in `monuments.json` (used only by the injected script, app-bugs-25).
- **Fix spec.** Render story markers as `mapboxgl.Marker`s (DOM, auto-tracks pan/zoom, no rAF, no React commits) or a symbol layer with feature-state glow; markers are `<button aria-label="Monument: 20th Maine, ...">`; default off below zoom 14; click jumps tick + frames; merge datasets into one `monuments.json` with a `story` flag; delete the cursor ring or fix its offsets (`position: fixed` + client coordinates) or replace it with a CSS cursor.
- **Acceptance test.** Marker pixel equals `map.project(lngLat)` within 1 px; React Profiler shows 0 commits from `KF` over 5 s idle; toggle works; keyboard focus order includes markers.
- **Metric moved.** INP/TBT, visual accuracy, a11y.

---

### app-bugs-31: Locations labels never appear until the button is toggled twice

- **Severity** medium-low. **Effort** S. **Audit refs** new. **Depends on** none.
- **Evidence (Verified).** `GtbgLoc` (pretty:112573-112676) adds its GeoJSON source/layer inside `useEffect(..., [active])` and starts with `var m = yn.getState().mapRef; if (!m) return;`. `active` (`it`, pretty:112943) defaults to `true`, but the map only calls `setMapRef` on its `load` event (pretty:97255), after the effect already ran with `mapRef === null`; deps never change, so nothing is added. The toolbar button shows "active" with no labels; clicking twice (off, on) adds them. The 10 place names and coordinates are hard-coded in the component (and disagree with the rest of the app, app-bugs-38); `terrain.json` (30 named features) is fetched into the store (`rF`, pretty:96919-96921) and never used (`terrainData` unread).
- **Fix spec.** Depend on `mapRef` (`const mapRef = useStore(s => s.mapRef)`; deps `[active, mapRef]`); source names from `places.json` (app-bugs-38, includes `terrain.json` key locations) with `minzoom`, `symbol-sort-key`, halo; persist the toggle. Tranche 0 patch G is the one-line version.
- **Acceptance test.** Fresh load: labels visible without touching the button; toggle hides/shows; no errors.
- **Metric moved.** Function, fit & finish.

---

### app-bugs-32: Playback loop and React subscription architecture (INP / TBT)

- **Severity** high (performance). **Effort** L. **Audit refs** P1, P2, D2. **Depends on** app-bugs-07, app-bugs-30, app-bugs-10.
- **Evidence (Verified counts; hedged effect).**
  - 25 selector-less `yn()` calls (`= yn()`, listed in Appendix B: pretty:97065, 97233, 97416, 97572, 97665, 97907, 98258, 98596, 98747, 99088, 99423, 99713, 99889, 100324, 100845, 101009, 101478, 101680, 102322, 102661, 102941, 111857, 112213, 112940, 112961): each re-renders on **every** store write (tick, speed, panel toggles). `AO` subscribes twice and passes fresh props to about 25 non-memoised children.
  - Three independent per-frame React loops: the map's `Ed` (fine), the HUD `_F` (`setState` every animation frame while playing: `P(Yx()), H(z => !z)`, pretty:97418-97426), and `KF` (60 Hz always, app-bugs-30). The splash also writes the store per frame (app-bugs-10).
  - `Ed` allocates per frame: `y1` copies `{...i2}` (467 keys) twice (pretty:96279, 96291), `Object.fromEntries` + `X4` (Union x Confederate pixel pairs) + O(n^2) x 8 separation (app-bugs-22); `dA` re-projects all units (pretty:97022-97033); the spatial index `aT` is rebuilt on each tick change (pretty:97323-97325).
  - No frame-delta cap: after a hidden tab returns, `ze = c - F_` can be tens of seconds, `Hc += ze` and `Math.floor(Hc / Pe)` jump many ticks at once (pretty:96977, 96982-96987; Tranche-0 patch I caps it).
  - The boot request storm (38 desktop / 72 mobile JSON requests, app-bugs-06), the splash sweep and the 2.28 MB parse are the P2/P3 items.
  - I did not profile in a browser; the claim is that these commits are a likely contributor to RUM INP > 500 ms on low-end phones and to TBT. The acceptance budget below makes it measurable.
- **Fix spec.** (1) Selector hooks (`useStore(s => s.currentTick)`, `useShallow`) and store slices (playback, ui, data); `React.memo` for panels; (2) one `Ticker` service (single `requestAnimationFrame`) that drives canvas drawing and updates HUD text through refs (`textContent`), no React state; FPS meter removed from production; (3) compute `unitsAt(tick)` once per tick (memoised), interpolate only positions per frame, reuse arrays; (4) cap `dt` at 100 ms and pause when `document.hidden`; (5) `useDeferredValue` for search filtering; (6) split `Ed`'s work: separation/labels at <= 20 Hz, positions at display rate.
- **Acceptance test (CI budgets).** 1x playback for 30 s: <= 2 React commits/s outside the tick change, 0 commits when idle/paused; no long task > 50 ms in a 30 s run at 4x CPU throttle; Lighthouse mobile TBT < 200 ms; RUM INP p75 < 200 ms after release.
- **Metric moved.** INP Poor -> Good, TBT, Performance grade, battery.

---

### app-bugs-33: Speed labelling (H9) and speed ladder mismatch

- **Severity** low. **Effort** S. **Audit refs** H9, D4. **Depends on** none.
- **Evidence (Verified).** `_F` prints `"1x (real time)"` (pretty:97429). The loop advances one tick per `cF / speed` ms with `cF = 500` (pretty:96948, 96982), so 1x = 2 ticks per second = 10 battle-minutes per real second. The visible ladder is `[0.25, 0.5, 1, 2, 4, 8]` (`wO`, pretty:112185; mobile `u2`, pretty:102900; labels `SO`, pretty:112186); the `+` key doubles up to 16 (pretty:112996-113002) with no button or label; `-` halves down to 0.25 (a value on the ladder), `0` sets 1.
- **Fix spec.** One `SPEEDS = [0.25, 0.5, 1, 2, 4, 8]` constant for keys, buttons and mobile; label "1x: 10 battle-minutes per second"; tooltip "1 tick = 5 battle-minutes"; remove "real time" everywhere (guide "Reset to 1x speed" is fine).
- **Acceptance test.** HUD at 1x reads "1x (10 min/s)"; `+` at 8x stays at 8x; every speed reachable by key has a button.
- **Metric moved.** H9, honesty of UI.

---

### app-bugs-34: Mapbox attribution removed on two maps; token literal duplicated

- **Severity** low-medium (compliance). **Effort** S. **Audit refs** X1 (adjacent). **Depends on** none.
- **Evidence (Verified).** `attributionControl: !1` on the mobile map (pretty:102988) and the Walkthrough map (pretty:110777); no custom attribution control is added. Mapbox's terms require the wordmark and attribution text on maps that use its styles/tiles. The same public token literal appears in two places (`a2`, pretty:97209-97210; `fO`, pretty:102898-102899); the Google Embed key is `mO` (pretty:110610).
- **Fix spec.** Remove `attributionControl: false` (or add `new mapboxgl.AttributionControl({ compact: true })`); one `config.js` reading `import.meta.env.VITE_MAPBOX_TOKEN` / `VITE_MAPS_EMBED_KEY`; restrict both keys by referrer (X1/X2).
- **Acceptance test.** Every map on every page shows the Mapbox logo and an attribution control; one token constant in the bundle.
- **Metric moved.** Legal/compliance, security hygiene.

---

### app-bugs-35: Data IDs as the app consumes them: side by ID prefix, phantom rows, 100 units without OOB records

- **Severity** medium. **Effort** M. **Audit refs** C4/H7 adjacent. **Depends on** data specialist.
- **Evidence (Verified by data probes).** The app derives side from `unit_id.startsWith("U-")` / `"C-"` at 23 sites (pretty:96484, 96488, 96525, 96585, 96597, 96679, 96739, 97068, 97923, 98875, 99767, 100906, 101034, 101134, 101734, 102336, 102342, 102673, 102680, 103129, 103132, 103258, 103320). Ten placement rows use a `U-` prefix for Confederate regiments: `U-11NC`, `U-15AL`, `U-1TX`, `U-26NC`, `U-44AL`, `U-47NC`, `U-48AL`, `U-4TX`, `U-52NC`, `U-5TX`, at ticks 95 and 150 (`density_day1_ticks51_100.json`, `density_day1_afternoon.json`); each duplicates a real `C-` regiment that is also placed, and with carry-forward (app-bugs-07) the blue phantom persists to the end of the battle. 100 of 478 placed ids do not exist in the OOB (e.g. `C-4AL-Law`, `C-ART-Alexander`, `U-I-1-19IN`, `U-ART-McGilvery`), so clicking them shows no panel (`MF` returns `null` when `oobData[id]` is missing, pretty:97903) and labels are raw codes; 315 of the OOB's 570 regiments and batteries are never placed.
- **Fix spec.** `scripts/validate-data.mjs` (CI + interim run on the deployed data): every placement `unit_id` must exist in the OOB or an explicit alias table; every OOB entry carries `side`; fix the 10 rows; app reads `side` from OOB (never from the prefix); report unplaced units for the coverage decision (app-bugs-14).
- **Acceptance test.** Validator exits 0; no `U-` unit renders red and no `C-` unit renders blue; clicking any marker opens a panel.
- **Metric moved.** Data consistency, correctness of the core visual.

---

### app-bugs-36: Hard-coded moment tables (key ticks, notable units, tour steps)

- **Severity** low-medium. **Effort** M. **Audit refs** C4, D4. **Depends on** app-bugs-08, app-bugs-15.
- **Evidence.** Scrubber markers `TO` (pretty:112192-112201): 8 hand-picked ticks with 5 colours ("First shot" at tick 17, but V-001 "The First Shot" is tick 12 and the bookmark table `IF` says tick 12 "First shot -- Knoxlyn Ridge"); bookmark names `IF` (pretty:97865-97894); notable units `zF` (pretty:98729-98737); tour steps `Gc` (pretty:111819-111855, with the "July 2 afternoon" narrative at tick 267 = 8:25 AM); mobile scrubber uses red/gold significance dots computed from chronology (pretty:103170-103190), i.e. the two layouts already disagree.
- **Fix spec.** One `moments.json` generated from `chronology_*.json` (`critical` and selected `high`) and vignettes; scrubber dots coloured by significance exactly as the guide says (red critical, gold significant) with density thinning by zoom; tour and notable-unit lists reference moment ids, not literals.
- **Acceptance test.** Marker count/colours derive from data; changing a chronology tick moves the marker; no literal tick numbers remain in components.
- **Metric moved.** Consistency, maintainability.

---

### app-bugs-37: Test harness and debug hook (needed to lock every fix above)

- **Severity** medium (enabler). **Effort** L (setup S, suite M-L). **Audit refs** all. **Depends on** R1 (source) for unit tests; Playwright e2e can start against the current site.
- **Spec.**
  - `window.__gtbg = { map, store, labelStats, positionsAt }` exposed only when `?debug=1` or `import.meta.env.DEV` (needed for the distance tool, labels and tick assertions; there is currently no way to reach the Mapbox instance or the store from outside).
  - **Unit tests (Vitest):** `battleClock`, `positions` (property tests), `naturalCompare`/`normalise`, `deeplink.parse`, `facts` checks, `placeLabels`, storage migration.
  - **E2E (Playwright, Chromium + WebKit + Firefox, desktop 1440x900 and iPhone 375x812):** one spec per finding's acceptance test: smoke (Tranche 0), deep-link table, Esc matrix, every Tools tile, layout persistence, day-jump data load + framing, minimap ticking, distance tool, Help latency, Street View iframe uniqueness, no `pageerror`/console errors on every route, `axe` on every overlay, a request-count budget, `PerformanceObserver('longtask')` + React Profiler commit budgets.
  - **CI gates:** `undef.js`-style scope check (no unresolved globals), `check-facts`, `validate-data`, bundle-size budget, Lighthouse CI (mobile/desktop) with the green thresholds of BRIEF.
- **Acceptance test.** The suite runs headless in < 10 minutes and fails on each original bug when the fix is reverted.
- **Metric moved.** Reliability, regression safety; the path to sustained A+.

---

### app-bugs-38: Place coordinates are hard-coded in six places and disagree by up to 2.1 km (new)

- **Severity** medium (historical accuracy). **Effort** M. **Audit refs** C4 (adjacent), H13. **Depends on** data specialist / owner review against NPS or USGS GNIS.
- **Evidence (Verified, `coords.js`).** The same named places carry different coordinates in: `GtbgLoc` labels (pretty:112573+), Soldier's Eye sites `rO` (pretty:101889+), tour stops `th` (pretty:100063+), story markers `mA` (pretty:100615+), `terrain.json` `key_locations`, and Walkthrough stops `d2` (pretty:104096+). Maximum disagreement per place: McPherson Ridge **2,143 m**, Seminary Ridge 1,310 m, Barlow's Knoll 1,058 m, Wheatfield 711 m, Little Round Top 661 m, Peach Orchard 451 m, Devil's Den 381 m, Cemetery Hill 308 m, Culp's Hill 278 m, The Angle 165 m. Example: `Herbst Woods` in `terrain.json` is at -77.2578 while the Soldier's-Eye "McPherson's Ridge" site and the Iron Brigade story marker are at about -77.275/-77.277 (1.5 km west of it) and the Walkthrough stop-1 pano is at -77.2503.
- **Root cause.** Coordinates were typed per feature.
- **Fix spec.** One `places.json` (`id, name, aliases, lat, lng, zoom, source`), verified against an authoritative source and reviewed by the owner; generated exports feed Locations labels, story markers, Soldier's Eye, tours, camera framing (app-bugs-21) and Walkthrough; a CI check that any coordinate literal in components fails the build.
- **Acceptance test.** Spread per place < 25 m across all consumers (test reads the built bundle's data); Soldier's Eye sites and Walkthrough panos agree.
- **Metric moved.** Historical accuracy, consistency; prerequisite for app-bugs-18/19/21.

---

### app-bugs-39: Accessibility primitives: zero ARIA in 17,000 lines, 136 of 271 font sizes under 12 px

- **Severity** high (accessibility). **Effort** M-L. **Audit refs** A1-A6, D2, S4. **Depends on** R1.
- **Evidence (Verified by grep on app code, lines > 96,200).** 0 `aria-*` attributes, 0 `role`, 1 `tabIndex` (the transport-bar wrapper); 113 `onClick` handlers against 75 `<button>` elements (the difference is clickable `div`s: search results, roster/OOB rows, tour dots, timeline entries, monument tiles); 19 close buttons whose only content is the glyph "x" (pretty:97981, 98346, 98638, 98815, 99140, 99457, 99808, 99943, 100399, 100457, 101157, 101745, 101985, 102386, 102691, 103253, 103382, 103519, 103631) plus two plain "X" (pretty:112541, 112890); 136 of 271 `fontSize` declarations are below 12 px (7 px x1, 8 px x7, 9 px x13, 10 px x56, 11 px x56); text colours `#666` (32 uses), `#555` (14), `#444` (4), `#777` (7) and `#8b6914` (8) give 3.55, 2.73, 2.09, 4.55 and 4.00:1 on `#050508` (and 3.31, 2.55, 1.95, 4.25, 3.74:1 on the `#0f0f1a` panels), i.e. fail WCAG AA for normal text; the scrubber `<input type="range">` has no name (pretty:112295); the unit-panel share button is a bare glyph. Accessible names for toolbar buttons are the glyphs themselves (app-bugs-25).
- **Fix spec.** Shared primitives, then a mechanical pass:
```jsx
export const IconButton = ({ label, keys, pressed, onClick, children }) =>
  <button type="button" className="icon-btn" aria-label={label} title={label} aria-keyshortcuts={keys}
          aria-pressed={pressed} onClick={onClick}>{children}</button>;
export const CloseButton = (p) => <IconButton label={p.label ?? 'Close'} onClick={p.onClick}><Icon name="x" /></IconButton>;
export function Dialog({ title, onClose, modal = true, children }) { /* role="dialog" aria-modal aria-labelledby, focus trap, restore focus, overlay-stack registration (app-bugs-09) */ }
export const Panel = ({ title, dock, onClose, children }) => /* role="complementary" aria-label, dock placement (app-bugs-10) */;
```
  - Replace clickable `div`s with buttons/links (or `role="button"` + key handling only as a last resort); label the scrubber (`aria-label="Battle timeline"`, `aria-valuetext` = clock time); `role="status"`/`aria-live` for toasts and the distance result; `prefers-reduced-motion` handling for `flyTo`, splash and pulse animation.
  - Tokens: minimum text 12 px (13 px body), contrast >= 4.5:1 (replace `#666/#555/#444` by >= `#8a8a96` on dark panels, `#8b6914` text by >= `#b08338`), targets >= 44 px on `(pointer: coarse)` and >= 24 px otherwise; CSS variables instead of inline style objects so the design specialist's system can be applied once.
  - Add `<main>`, an `<h1>` and a skip link to the app shell (D2) (the SPA renders inside `#root` with none today).
- **Acceptance test.** `axe-core` on every overlay: 0 critical/serious; keyboard-only completion of "open Search, pick a unit, close panel, open Help, close"; touch target audit >= 44 px on iPhone emulation; contrast audit passes; Lighthouse accessibility >= 98 desktop and mobile.
- **Metric moved.** Accessibility C+/C -> A (WCAG 2.2 AA), D2/A1-A6 closed.

---

## 3. Execution order and dependencies

```
Wave 0 (day 1)     app-bugs-01 Tranche 0 hot patch (+ redeploy mechanics) -> smoke test (37a)
                   app-bugs-03 owner decision on audio; app-bugs-34 attribution/token (S)
Wave 1 (foundation) R1 source port scaffold (Section 1) with: 04 ErrorBoundary + 29 storage,
                   08 battleClock, 35 data validator, 38 places.json, 15 facts pipeline, 37 test harness
Wave 2 (state/data) 06 day loader -> 07 pure positions -> 05 deep links -> 10 UI state/docks/toasts/boot
                   -> 11 layout persistence + one map -> 12 mobile tiles -> 09 hotkeys/overlay stack -> 39 primitives
Wave 3 (features)   13 registry/OOB, 14 sort+search, 16 minimap, 17 distance, 18/19 Street View,
                   20 Help latency, 21 camera director, 22 labels, 23 doc parity, 24 heatmap decision,
                   25 delete injected scripts, 26 dead controls, 27 tour, 28 bookmarks, 30 monuments,
                   31 locations, 33 speed labels, 36 moments
Wave 4 (perf/verify) 32 loop + subscriptions, final Lighthouse/RUM pass, remove Tranche-0 remnants
```

Key edges: 02 needs 04 + 06; 05 needs 06 + 10 + 11; 07 needs 06; 10 needs 09's overlay stack (build them together); 13 needs 09; 18 needs 19 and 38; 21 needs 06 + 07 + 38; 22 needs 07; 32 needs 07 + 30 + 10; 27 needs 08 + 11; 15 needs 35.

**Effort (my estimate, solo developer).** Tranche 0: 0.5 d. R1 scaffold: 8-12 d (already includes reading, which is done here). Wave 2: about 15 d. Wave 3: about 20 d. Wave 4: about 5 d. Serial total roughly 50-60 working days; Tranche 0 alone removes the crash-class bugs and both mobile blockers in a day.

**Expected grade movement from this specialist's items alone** (desktop / mobile): Core function B / D -> A / A-; Reliability B- / C -> A / A-; Usability B- / D+ -> A- / B+; Fit & finish C+ / D+ -> A- / A-; Historical consistency C- (with 08, 35, 38 and the C4 owner's anchors) -> A-; Accessibility C+ / C -> A- / A- (with 09, 25, 39); Performance contribution: INP and TBT (32, 30, 10), fewer requests (06), one map on phones (11).

---

## Appendix A. Undefined free identifiers (`undef.js`)

Method: `acorn` (ES2022 module) parse of `bundle.pretty.js`, `eslint-scope` analysis, global-scope `through` references minus known browser/ECMAScript globals.

| Name | Refs (pretty) | Class | Verdict |
|---|---|---|---|
| `setGoldUnit` | 101086, 101229 | app | **bug** (app-bugs-02) |
| `clearGoldTrail` | 101086, 101229 | app | **bug** |
| `drawGoldTrailSegment` | 101101 | app | **bug** |
| `CanvasRenderer` | 96556 (x2), 96557 | app | **bug** (app-bugs-03) |
| `MSApp` | 1429-1431 | React DOM legacy | guarded (`typeof MSApp`) |
| `WorkerGlobalScope` | 11265-11266 | mapbox | guarded |
| `__REACT_DEVTOOLS_GLOBAL_HOOK__` | 8956, 8957, 9051-9055 | React | guarded |
| `parent` | 11572 | mapbox (`window.parent` legacy) | fine in browsers |
| `reportError` | 8739-8740 | React | `typeof reportError == "function"` guard |
| `WebGLTexture` | 41899 | mapbox | inside a WebGL-only path |

After Tranche 0 (patched in memory): the four app names are gone and no new unresolved names appear (`tranche0-validation-output.txt`).

## Appendix B. Store audit (`storekeys.js`) and selector-less subscriptions

- Store keys: 49 (pretty:9361-9450). References to a key that does not exist: `showMonuments` (pretty:102936, mobile). Keys never accessed through `yn` destructure/`getState()`/`setState`: `getCurrentDay`, `terrainData`, `activeMapRef` (`setActiveMapRef` is destructured at 97231 but never called), `resetFilters`, `onboardingComplete`, `setOnboardingComplete`, `bookmarkCount`, `bumpBookmarkCount`, `casualtyData`, `setCasualtyData`. `commanderSuccessions` is read (101680) but never written. `showCasualtyHeatmap`/`toggleHeatmap` are written by the `H` key but read by nothing.
- Selector-less `yn()` calls (each re-renders on every store write): pretty:97065, 97233, 97416, 97572, 97665, 97907, 98258, 98596, 98747, 99088, 99423, 99713, 99889, 100324, 100845, 101009, 101478, 101680, 102322, 102661, 102941, 111857, 112213, 112940, 112961 (25).

## Appendix C. Dead or vestigial code (delete during the port)

- Components/features: `nO` commander toasts (data never set); `fF` hover tooltip (wrong props, would crash if wired); `I4`/`Uc` canvas (never drawn on, pretty:9842-9852); `yO` sound (app-bugs-03); heatmap store fields and `H` key (24); `casualtyData`; `bookmarkCount`; local `toggleUnits`/`_uv` in `gF` (97357-97360); `useGlobalKeyboard` export in the HelpModal chunk; `assets/InterpolationWorker-ufiwa2-e.js` (672 B; no `new Worker` for it anywhere in app code, `y1` interpolates synchronously); `terrainData` (fetched, unread, app-bugs-31).
- Unused locals (`unusedlocals.js`, 51): `gF` (`pinnedUnitId` st, `filters` ut, `setActiveMapRef` pe, `toggleUnits`); `CF` (`selectedUnitId` M); `XF` (`currentTick` f, `isPlaying` x); `Xk` (`unionCorps`/`confCorps` are computed by `useMemo` at pretty:102331-102348 and never used: wasted work on each OOB change); mobile `pO` (`selectedUnitId`, `filters`, `showSearchPanel`, `showFilterPanel`, `showMonuments`, `showLegend`, `toggleLegend`, `showMinimap`, `toggleMinimap`, `Zn`); `bO` (`z` selected archetype); `AO` (`isPlaying` f, `playbackSpeed` x, `showCasualtyHeatmap` l, `setTick` R, `setPlaying` he, `setSpeed` Ee, `Ci/yi`, `Si/Wo`, `di/Es`, `Xa/ya`, `ls`). Duplicate object key `top` in `ji.panel` (pretty:98108-98114).

## Appendix D. localStorage / persistent-state inventory

| Key | Owner | Format | Written | Read | Notes |
|---|---|---|---|---|---|
| `gtbg_prefs` | store `v4/e2` (pretty:9327-9341) | JSON `{showLegend?, showMinimap?, onboardingComplete?}` | `toggleLegend`, `toggleMinimap` (9425-9434) | store init (9342) | `onboardingComplete` is dead; also read by `diagnostics.html` |
| `gtbg_onboarded` | `AO` (pretty:112951, 113068) | `"1"` | on tour close | first render (unguarded) | competes with the dead prefs flag |
| `gettysburg_bookmarks` | pretty:97821, 97840-97852 | JSON array of `{id,tick,label,unitId,center,zoom,created,url}` | Bookmarks panel | panel open | `id = Date.now()` |
| `gtbg-ef-hidden` | `index.html:328-344` | `"true"/"false"` | eye toggle | overlay populate | goes away with the overlay |
| `gtbg_watch_together_tour` | `watch-together.html` | JSON stops | tour builder | page load | separate page |
| `gtbg_session` | `diagnostics.html` | n/a | never | diagnostics only | dead; page is 404-forced |
| `mapbox.eventData*`, `mapbox.turnstileEventData*` | mapbox-gl 3.24.1 telemetry (pretty:54270-54304) | uuid/event queue | Mapbox | Mapbox | disclose in privacy (X5) |
| Cache Storage `gbg-v5` | `sw.js:3` | cached responses | SW install/fetch | SW | bump on every deploy; `cache.addAll` fails install if any precache URL 404s (case-mangled names) |

Target: `gtbg:v1:{layout,seenIntro,prefs,speed,bookmarks}` + `sessionStorage gtbg:v1:seenVignettes` (app-bugs-29).

## Appendix E. Overlay anchors and stacking (what collides, app-bugs-10)

| Element | Component (pretty) | Position | z |
|---|---|---|---|
| Toolbar | `tc.toolbar` (113305) | abs top 0, h 48 | 100 |
| Unit canvas / trail canvas / spare canvas / day-night tint | `ux.canvas` (97390+), `J4` (96693), `I4` (9842), `A4` (9885) | inset 0 in map container (inset 48 0 0 0) | 10 / 8 / 9 / 6 |
| Trails button | `ux.trailBtn` | abs top 10, right 56 | 20 |
| HUD (date/speed/fps) | `Sd.wrap` (97484) | abs top 56, left 16 | 88 |
| Unit panel | `ji.panel` (98107) | fixed left 16, top 60, w 280 (bottom 150 under 500 px) | 92 |
| Story panel | `Cr.panel` (98417) | abs top 60, right 16, w 340 | 92 |
| Toasts (chronology) | `eh.container` (100007) | abs top 60, right 16 | 200 |
| Commander toasts (dead) | `nh.container` (101774) | abs top 58, left 60 | 400 |
| NPS video pip | `Zr.pip` (100472+) | abs top 58, right 16, w 320 | 400 |
| Map Layers | inline (112508) | fixed top 60, right 10 | 1000 |
| Extra Features overlay | `index.html` | fixed top 60/right 14 (+5 corner candidates) | 999999 |
| Search panel | `ar.panel` (98952) | abs top 56, left 50%, w 440 | 95 |
| Filter panel | `zr.panel` (99278) | abs top 56, left 0, w 280 | 95 |
| Distance panel | inline (112868+) | fixed top 60, left 50% | 1000 |
| Event card | `Vc.panel` (98659) | abs bottom 120, left 50%, w 460 | 85 |
| Legend / FAB | `Fr` (99575) | fixed bottom 160, left 16 | 88 |
| Minimap / FAB | `Td` (99832) | abs bottom 130, right 16 | 88 |
| NPS launch / sound | `Zr.launchBtn`, `vO.btn` | abs bottom 90 / 58, right 16 | 200 |
| NPS stop panel / dots | `Zr.panel`, `Zr.dotsBar` | bottom 86 left 60 right 0 / bottom 220 | 300 / 301 |
| Transport bar | `Po.wrap` (112374) | abs bottom 0 | 100 |
| Monument markers / tooltip | `KF`, `dx.tooltip` (100964) | fixed at container coords / fixed | 160 / 600 |
| Modals | Zk `lr.overlay` 700, Yk 800, OOB `jo.overlay` 900, Roster `gp.panel` 900, Bookmarks/Help 600, splash/chooser/tour 1000 | | |

Top-right holds five things at once (story panel, chronology toasts, NPS pip, Map Layers, Extra Features); top-left two (HUD, unit panel); bottom-right three (NPS launch, minimap, sound) plus the transport bar behind them.

## Appendix F. Deep-link contract (app-bugs-05)

| Param | Meaning | Validation | Producers today | Reader today | Target behaviour |
|---|---|---|---|---|---|
| `tick` (alias `t`) | tick 1-675 | integer in range | `turning-points:118`, `historian:110`, `documentary:92`, `education:81`, `embed:60`, `search:127`, `regiment:247`; app `$k` writes `t` | none | load day, set tick, frame |
| `day` | 1-3 | enum | none | none | dawn of that day |
| `unit` (alias `u`) | `unit_id` in OOB | membership | `regiment:247`, `search:114`; app `$k` writes `u` | none | select + pin + frame; tick defaults to first keyframe |
| `vignette` | `V-001`..`V-024` | membership | documentary, education, embed, historian, search | none | open story panel on that vignette (tick from its `trigger_tick`) |
| `ancestor` | `unit_id` | membership | `Zk` share | `Zk` only when mounted | open Ancestor panel with journey |
| `z`, `ll` | zoom 11-18, `lat,lng` | numeric | `$k` | none | camera |
| `layout` | `mobile` / `desktop` | enum | none | none | override auto-detect (app-bugs-11) |
| `debug` | `1` | | dev | | expose `window.__gtbg` |

Expected states: `/?tick=267&vignette=V-009` -> tick 267, story V-009, July 2 loaded, map on Little Round Top; `/?unit=U-20ME` -> unit panel, first keyframe (tick 150), gold trail available; `/?ancestor=U-20ME` -> Ancestor panel; `/?tick=9999&unit=nope` -> ignored, normal start; canonical form `/?...` (never `/index.html?...`).

## Appendix G. Where each count literal lives (app-bugs-15)

| Literal | Location | Derive from |
|---|---|---|
| "467 regiments and batteries", "675 five-minute snapshots" | `index.html` 15, 18, 24, 32 (meta, OG, Twitter, JSON-LD), 719, 745, 754; `manifest.json:4` | `facts.oob`, `facts.ticks` |
| "20 more tools ... AI-style historian" | `index.html:377` | `facts.tools`; wording (H8) |
| "445+ ... units", "675 five-minute ticks", "24 narrative vignettes", "51,000 casualties" | HelpModal chunk About text | `facts` |
| "467 Union and Confederate regiments and batteries" | `find-ancestor.html:48` | `facts.oob.regiments` (+ batteries) |
| "467 regimental records, 24 narrative vignettes, 137 chronology events, and 30 mapped terrain features" | `historian.html:48` | `facts` (also `facts.terrainFeatures`) |
| "All 24 key moments" | `site-nav.js:27` | `facts.vignettes` |
| "all 675 five-minute snapshots" | `ground-remembers.html:42` | `facts.ticks` |
| 467 / 675 / 20 tools / 16 stops / 512 monuments / 8 sites | `user-guide.pdf` | `facts` (docs specialist) |
| `nA = 675`, `s2 = 675`, `Math.min(675, ...)`, "Tick c/675", "675 five-minute snapshots" | pretty:9326, 96949, 112979, 112357, 111893 | `facts.ticks.max` |
| day boundaries 225/450/224 | pretty:9374, 9375, 9386, 97282, 97427, 97482, 99740, 100837, 100999, 102975, 112215, 113055 | `battleClock.dayOf/dayStartTick` |
| `(x[z]||[]).length " units"` | pretty:99821 | `unitsAt(tick).length` |

## Appendix H. List-sort inventory (app-bugs-14)

| Where | Sort today | Problem | Fix |
|---|---|---|---|
| Follow-Ancestor list `Se` (pretty:101039) | `name.localeCompare` | "102nd" before "10th" | natural + (side, state, number) |
| OOB corps and rows (102346, 102347, 102354) | `id.localeCompare` | ids like `U-I-1-10` before `U-I-1-2`; depth from dashes | tree from parent ids, natural |
| Roster Union/Confederate (102674, 102681) | `id.localeCompare` | same | natural by designation |
| Mobile roster (103130, 103133) | `id.localeCompare` | same | shared component |
| Search relevance (98775-98790) | object insertion order | not relevance | scored ranking |
| Search "casualties" (`pA`, 98724) | descending percent | ties unstable | tiebreak natural |
| Walkthrough monument groups (110745) | `Array.sort()` | fine (strings) | keep |
| Walkthrough monuments | data order `no` | fine | keep |
| `qF`/`bF` successions (97531) | `approx_tick` ascending | fine | keep |

## Appendix I. Keyboard contract (current vs target; app-bugs-09)

| Key | Today | Target |
|---|---|---|
| Space | toggle play (ignored in `INPUT` only; double-handled inside the transport bar) | toggle play; on a focused button, the button's own activation wins |
| Left / Right (+Shift = 12) | step tick | same; not while typing; not with Ctrl/Meta/Alt |
| 1 / 2 / 3 | set tick (no data load, no framing) | `jumpToDay` (loads day, frames action) |
| + / = / - / 0 | speed x2 up to 16 / /2 / 1 | walk the ladder [0.25..8]; ignore with Ctrl/Meta (page zoom) |
| S, F, L, M, B, ? | toggle panels | via registry; `aria-keyshortcuts` |
| H | dead heatmap | remove (or heatmap, app-bugs-24) |
| Esc | selected unit + a few panels | overlay stack pop; clear input text first; then unit selection; then tool mode |
| O, R, D, A, E, W, T, Y, N, K | none | Order of Battle, Roster, Distance, Ancestor, Soldier's Eye, Walkthrough, Guided tour, Layers, Place names, Monuments (proposed) |

## Appendix J. Symbol map for the R1 port (deployed name -> readable name)

`AO` App shell (desktop + shared overlays), `pO` MobileApp, `gF` MapView, `lS` drawUnits, `y1` unitsAt (impure; replace), `Ed`/`Gk`/`Op` playback loop, `yn` store, `Zk` AncestorPanel, `Xk` OrderOfBattle, `Jk` UnitRoster, `Yk` SoldiersEye, `_O`/`yA`/`vA` Walkthrough, `XF` TourPanel, `KF` StoryMarkers, `MF` UnitPanel, `CF` StoryPanel, `LF` EventCard, `qF` ChronoToasts, `nO` CommanderToasts (dead), `VF` Legend, `WF` Minimap, `OF` FilterPanel, `FF` SearchPanel, `_F` Hud, `IO` Transport, `bO` OnboardingTour, `tO` BootSplash, `dO` DeviceSelect, `yO` SoundToggle (remove), `iO` CursorGlow, `fF` HoverTooltip (dead), `GtbgLayers/GtbgLoc/GtbgDist` MapLayers/PlaceLabels/DistanceTool, `MO` BookmarkPanel, `EO` HelpModal, data: `th` tourStops, `mA` storyMarkers, `d2` walkthroughStops, `_A` monuments, `rO` soldierSites, `xO` archetypes, `Gc` tourSteps, `TO` scrubberMoments, `IF` bookmarkLabels, `zF` notableUnits, `a2`/`fO` mapboxToken, `mO` mapsEmbedKey. RECON_SRC (`src/components`) already uses the readable names for most of these.

## Appendix K. Verification ledger

**Verified (script output or exact code path):** the four undefined identifiers and their call sites; the store-key audit; minimap `subscribe` misuse (store source at pretty:9116-9128); `y1`/`i2` never reset; day 2/3 load only in `Ed` (and mobile map load); the deep-link reader/writer inventory (grep of all sub-pages and `URLSearchParams` scan); `Zn`-gating and stacking of desktop overlays in mobile; the five dead mobile tiles; Order of Battle state can never become true; `+2` sites and four clock functions; Walkthrough mobile map id mismatch; injected-script logic; monuments 48 px offset (arithmetic from container inset and `position: fixed`); data counts and ID problems; zero ARIA/roles in app code; font-size and contrast numbers; the 24 Tranche-0 anchors and syntax check.

**Inferred (needs the stated test):** an exception thrown in a `useEffect` unmounts the whole tree (React 18 semantics, no boundary present); the Space/Arrow double handling in the transport bar (event order); the `i2` pollution after the splash (depends on the map having loaded before the sweep); the distance tool's actual cause; the Walkthrough "48 Reynolds Ave S" being a stale frame; the INP contribution of the 60 Hz loops; and the audit's "toasts never dismiss" (code has 4.5 s timers, pretty:99912-99916; the observation is more likely timer throttling in a hidden or automated tab).

## Appendix L. Open questions for the owner

1. **Audio:** remove Sound (RECON `PENDING.md` says you asked for that) or keep and rebuild it on the Immersive engine?
2. **Monuments on the map:** show the 512 monuments (clustered) or keep 20 "story markers" and rename them?
3. **Unit counts to advertise:** "570 regiments and batteries in the order of battle" vs "467 regiments"; how to describe the 478 animated positions once the 100 unmatched ids are fixed.
4. **The 315 regiments/batteries that are never animated:** placeholder bivouac positions from the OOB, or clearly badge them "not animated"?
5. **Shortcut letters** proposed in app-bugs-13 (O, R, Y, N, K, D, A, E, W, T).
6. **Heatmap:** delete (A) or build (B)?
7. **One responsive shell** (XL, recommended) vs keeping two layouts with shared components?
8. **Coordinates:** which authority is used to verify `places.json` (NPS, USGS GNIS, Gettysburg NMP GIS)? Pano ids for Devil's Den, Oak Ridge and the Virginia Memorial.
9. **Historical clock anchors** (C4 owner): which sources fix tick to time.
10. **Aliases** `?t=`/`?u=` kept indefinitely or for one release?

---

## Verification

Adversarial verifier pass, 2026-09-30. Method: re-opened the cited `bundle.pretty.js` lines, `sw.js`, `index.html`, `netlify.toml`, the sub-pages and every `data/*.json` file; re-ran `svdist.js`, `coords.js`, `th.js` and the Tranche-0 validation output; wrote independent Python probes in `plan-work/tmp-verify-app-bugs/` (`probe1..7.py`) that recompute every data count; live `curl -I` on the site (bundle name, headers) and on nps.gov. No browser was used and nothing outside `plan-work/` was modified. Line-number accuracy of this report is excellent: every line cited for findings 01-12, 16, 20, 25-27, 30-35 that I re-opened was exact (12 of 12 day-boundary sites, 25 of 25 selector-less `yn()` calls, all four React error-boundary internals).

### Verdict table

| Finding | Verdict | Notes (what was checked / what to change) |
|---|---|---|
| 01 Tranche 0 (24 patches) | **CONFIRMED** with 4 caveats | Anchors, scope logic and rename list re-derived (`index.html:55,282`, `sw.js:3,6`, line 1 of both chunks; nothing else contains `Cg8FAMXN`). E1/E2 identifiers `It`/`Lt` are the Map-Layers and Distance setters (pretty:112940-112941) and are not shadowed in the handler. Caveats: (a) patch C alone turns "frozen at tick 1" into "empty on 72 % of ticks" (see 16); (b) J3 only skips marking a day loaded when **all** files failed, a partial failure still marks it loaded, and every `setTick` during a scrub re-fires a full retry round while a day is failing; (c) Tranche 0 F removes the desktop overlays but Search, Filter, story, event and unit panels stay under the mobile root (see 12 and missed M3); (d) bumping `CACHE_NAME` fires the C6 `controllerchange -> location.reload()` for every returning user (see missed M7). |
| 02 C5 / ancestor crash path | **CONFIRMED** | pretty:101086, 101101, 101229 and the `?ancestor` effect 101019-101021 exact; `st()` throws before `flyTo` and before `setState({currentTick:1})`. The mobile Follow-Ancestor tile mounts the same `Zk` (pretty:103366), so the crash exists on mobile too. |
| 03 `CanvasRenderer` undefined | **CONFIRMED** (one overstatement) | pretty:96554-96557; `N4()` returns `oT`; only `U4()` from `yO` sets it; loop order in `Ed` (96965-97018) verified: `lS` runs before the rAF reschedule, and when paused the throw is inside a passive effect (97290-97325). "true at most combat ticks" is overstated: `X4` needs a Union and a Confederate marker within 40 screen px, so at the default zoom 13.5 it is true only in close contact (e.g. Herbst Woods), not "most" ticks. Severity stays critical because the button is user-reachable. |
| 04 No error boundary / unguarded storage | **CONFIRMED** | `getDerivedStateFromError` only at 5263/7824/8120, `componentDidCatch` 5276/7826/8121; unguarded `getItem` pretty:112951, `setItem` 113068; no `onerror`/`unhandledrejection` in bundle app code or index.html. |
| 05 Deep links never read | **CONFIRMED**, inventory incomplete | `URLSearchParams` appears in app code only at pretty:97823 (writer) and 101019 (reader). Writers verified at the exact lines. Missing writer: `search.html:139` emits `/index.html?lat=..&lng=..` (location results) and Appendix F has no `lat`/`lng` alias. |
| 06 Day 2/3 load only on playback | **CORRECTED** | Facts verified (`zp` 96900-96917, only caller `Ed` 96991-96992, mobile 103040-103042, 38 boot JSON = 14+16+1+3+3+1, mobile 72, 217/478 units without a July 1 row, 103 duplicate pairs). But the proposed fix (`store.addPlacementsForDay(day, rows)` plus "concatenate per-day placements+density into day1-3.json") preserves a data-merge bug and would bake in mis-filed rows: see missed M1. The build step must bucket rows by `row.tick`, not by the file group in `tF`/`nF`, and `addPlacementsForDay` must merge instead of replace. |
| 07 `y1` global cache | **CORRECTED** (evidence CONFIRMED) | `i2` (96265-96305) is written in 3 places and never reset. Upgrade "Inferred" to verified-by-code-path: the splash sweep only starts once `Object.keys(placementsByTick).length > 5` (pretty:101478-101484), i.e. after day 1 is loaded, and the effect at 97321 runs `y1` on every tick change, so `i2` is guaranteed to hold all 261 day-1 units when the splash ends. Correction: the default `MAX_GLIDE_TICKS = 12` conflicts with the data: the median gap between a unit's keyframes is 17 ticks and 56.7 % of 1,209 gaps exceed 12, so most units would "hold then teleport" exactly as today; use a displacement/speed rule (the existing guard in `F4` is 0.05 deg), not a tick-gap rule. Also missing from the "definitions of on the field": the unit panel (missed M2). |
| 08 +2 date and four clocks | **CONFIRMED** | All five line refs exact; recomputed: toolbar tick 17 = 7:20, data 6:25 (+55 min); tick 267 toolbar 7:25 vs data 8:25 (-60 min); tick 225 = 12:40 AM labelled July 1. |
| 09 Keyboard / Escape | **CONFIRMED** | Handler `ii` 112966-113050, `IO` handler 112216-112224. The "Inferred" double handling holds: React's delegated listener runs before the `window` listener and zustand `setState` is synchronous, so the window handler reads the already-updated tick/`isPlaying`: arrows = +2, Space = no-op. HelpModal exports an unused `useGlobalKeyboard` (0 uses in the main bundle). |
| 10 Load/jump state, boot | **CONFIRMED** | Defaults (9417-9418), toast 4,500 ms timers, `commanderSuccessions` never written (only 9389, read at 101680), tour ticks 267/538 (`Gc`); the Skip handler `Se` is used only by "Skip introduction" and "Skip tour" (patch K is safe). |
| 11 Layout persistence / overlays over mobile | **CONFIRMED** | Stacking arithmetic verified (`tn.root` fixed z100 at 103698-103705, `Po.wrap` absolute z100 at 112374-112386, later in DOM). `IO.controls` is the 572 px row of C1. Layout is never persisted; only the desktop toolbar and `gF` are gated. |
| 12 Mobile Tools sheet dead tiles | **CORRECTED** | Five dead tiles is an undercount. Search and Filter are dead too: they toggle store flags whose panels `FF`/`OF` are rendered by `AO` at z 95 (pretty:98964, 99288) beneath the opaque z100 mobile root, exactly like the story panel (92), event card (85) and unit panel (92). So 7 of 14 tiles do nothing visible on phones, and the Tranche 0 acceptance test for F ("`elementFromPoint` at each tile centre returns that tile's button") passes while Search/Filter/story stay invisible. Add 12's own criterion ("each tile shows a visible panel") to Tranche 0. `An`, `Zn`, `lo` reads verified (`lo` only compared to "roster"/"legend"). |
| 13 OOB unreachable / flat | **CONFIRMED** | `Br(` only called as `Br(!1)` (113042); `Xk` sort and dash-depth 102346-102362; toolbar labels exact. |
| 14 Natural sort / search | **CONFIRMED** | Sort lines exact; `Zk` cap 15/20 and `includes` matching 101041-101050; 250 regiments + 65 batteries never placed (467-217, 103-38). |
| 15 Hard-coded counts | **CONFIRMED** | My probes: 705 OOB ids = 467 regiments + 103 batteries + 93 brigades + 31 divisions + 11 corps; 410 U / 295 C; 478 animated = 217/38/89/28/6 + 100 not in OOB; 1,804 rows, 188 populated ticks, 73 rows / 71 units at tick 1; 137 events (45/73/16/3); 24 vignettes; the HelpModal chunk really says "445+". |
| 16 Minimap subscribe misuse | **CORRECTED** (nuance) | `subscribe: (Ee) => (x.add(Ee), ...)` (pretty:9134) confirmed. But patch C ("one-line") is not a fix by itself: `WF` reads `x[z]` at only two sites (pretty:99763 and 99821) and rows exist at exact ticks only (487/675 empty), so the minimap would be blank on 72 % of ticks and read "0 units". A still-string-level fix is patch C plus replacing those two `x[z]||[]` with `y1(x,z,0)` (module-scope function). |
| 17 Distance tool | **CONFIRMED** (as labelled: cause unproven) | Empty catches, one-time `mapRef` read, legacy `$type` filters (valid in 3.24.1, converter at 18392-18435; version string at 53873). No static root cause; the ranked-hypothesis approach is the right call. |
| 18 Soldier's Eye | **CONFIRMED** | `M(P)` empty pano id `!1s!` (101961-101963), subtitle at 101983-101990, placeholder at 102040-102062. |
| 19 Walkthrough Street View | **CORRECTED** (nuance) | Mobile branch has `ref` but no id (110875 vs 111096), effect uses `getElementById` with `[]` deps (110767/110852): confirmed; `svdist.js` re-run reproduces every distance. But the only opener of `_O` is the desktop toolbar button (pretty:113134-113138, inside `Zn !== "mobile"`), so the no-map mobile branch is reachable only via "Desktop View" on a phone or a desktop window <= 860 px; in the Mobile layout the Walkthrough cannot be opened at all (missed M6). |
| 20 Help modal late | **CORRECTED** | Lazy + null fallback + no preload + not in SW precache verified (112469-112470, 113277, `sw.js:5-13`; chunks 7,027 B and 4,869 B). The mechanism is wrong: `YS + 500 - Yr()` at pretty:7525 is `case 3` (RootSuspended) of `performConcurrentWorkOnRoot`, i.e. it throttles committing a **fallback** for a retry-only render; a resolved lazy boundary finishes as `RootCompleted` (`case 5`, immediate commit). The 1-2 s is more plausibly cold fetch through the SW plus a busy main thread (per-frame commits) plus the sync-lane fallback; the audit never measured the split. The fix (static import) is still right and removes all of it. Drop the "500 ms Suspense throttle" claim from the root-cause line. |
| 21 No auto-fly | **CONFIRMED** | `camera.html:105-114` and `126-141` verified as pure binary search and densest-cell bounds. |
| 22 Label collisions | **CONFIRMED** | 8-iteration O(n^2) loop 96561, empty-OOB `Y4(Xe,Ee,{})` 96661, fps text 96684-96690, `sT()` double call. |
| 23 Claim parity | **CONFIRMED** (3 rows spot-checked) | HelpModal really lists `Esc: Dismiss panel / deselect unit` and `H: Toggle heatmap`; the tour quick reference lists `H` (pretty:111995). |
| 24 Dead heatmap | **CONFIRMED** | `casualty_apportionment.json` is 11,681 B, referenced only by `dashboard.html`, `living-ledger.html` (and `placement_schema.json`). |
| 25 Inline scripts | **CORRECTED** (minor) | Line ranges exact; `Vs` buttons all carry a `title` so the labeler never fires: confirmed. Nuance on the banner injector: it also runs on `DOMContentLoaded` and `load` (index.html:392-394), and a user who taps "Skip intro" gets the chooser within ~300 ms (pretty:101570-101580), well inside the 25 x 200 ms window, so the banner works for early skippers and fails only for users who wait out the splash. |
| 26 Toggle Units / filters / tooltip | **CONFIRMED** | `unitTypes` unused in `lS` (96513-96517), `fF` mis-wired (97063 vs 97384), `commander` object rendered as text. |
| 27 NPS Auto Tour | **CONFIRMED** | `th.js` re-run reproduces every printed-vs-toolbar time in the table; uncleared `setTimeout` at 100336-100338; nps.gov `curl -I` returns no XFO/CSP (confirmed live). |
| 28 Bookmarks | **CONFIRMED** | `IF` has exactly 26 ticks; `window.prompt` fallback at 97932; key `gettysburg_bookmarks`. |
| 29 localStorage inventory | **CONFIRMED** | All keys exist (`gtbg_session` read only by `diagnostics.html:85`, `gtbg_watch_together_tour` by `watch-together.html:159`). |
| 30 Monuments `KF` | **CONFIRMED** | rAF + `setState(new object)` every frame regardless of `f` (100848-100871); container inset 48 px (`ux.container`, 97392) vs `position: fixed` markers. |
| 31 Locations labels | **CONFIRMED** | `GtbgLoc` effect reads `mapRef` at mount (112573-112580); `setMapRef` only inside `load` (97255). Patch G is sound (all Mapbox calls are inside try/catch). |
| 32 Playback architecture | **CONFIRMED** | 25 selector-less `yn()` calls at exactly the listed lines; `_F` sets two states per frame; `y1` copies 467-key objects. INP impact remains unmeasured, as stated. |
| 33 Speed labelling | **CONFIRMED** | `cF = 500`, `wO`/`u2`/`SO`, `+` up to 16. |
| 34 Attribution | **CONFIRMED** | `attributionControl: !1` at 102988 and 110777; token literal at 97209-97210 and 102898-102899. |
| 35 Data IDs | **CONFIRMED** | All 10 mis-prefixed ids exist as rows with a real `C-` twin; 100 not in OOB; 315 unplaced. |
| 36 Moment tables | **CONFIRMED** | `TO` has 8 ticks and 5 colours; V-001 trigger tick is 12, `TO` says 17. |
| 37 Test harness | **UNVERIFIABLE** as a plan (proposal); its only factual claim, "no window hook", is true apart from `__gtbgApp._gbDist` | |
| 38 Coordinates disagree | **CONFIRMED** (internal disagreement only) | `coords.js` re-run: identical spreads (2,143 m McPherson ... 165 m Angle). I did not verify the coordinates against NPS/USGS; the finding does not claim to. |
| 39 A11y primitives | **CONFIRMED** (1 count off) | 0 `aria-`, 0 `role:`, 1 `tabIndex`, 113 `onClick`, 75 `"button"`, colour counts 32/14/4/7/8 and contrast ratios (3.55/2.73/2.09/4.55/4.00) all reproduce. Font sizes below 12 px: 133 numeric literals + 2 conditionals = 135 of 271 (report says 136). |

Effort realism: 01 (S, 0.5 d) is realistic only if the merged tranche described in M3 is used and the smoke suite exists; 07 (M-L) and 10 (M-L) are realistic; 32 (L) is fine; the total 50-60 d is plausible for a solo developer.

### Missed issues (in scope, not in the report)

**M1. High. `addPlacementsForDay` replaces whole per-tick arrays, and four density files hold rows for other days: 127 rows are silently dropped, and tick 1 collapses from 72 rows to 1 once day 2 loads.**
- Evidence: `addPlacementsForDay` (pretty:9397-9406) does `placementsByTick: {...z.placementsByTick, ...P}`, so any tick present in a later load replaces the earlier array. The day groups `tF`/`nF` (pretty:96771-96833) contain out-of-day rows: day-1 group `density_artillery_positions.json` 22 rows at ticks 226-560, `density_cavalry_detail.json` 17 rows at 560-569, `density_skirmishers.json` 14 rows at 248-563; day-2 group `density_reserves.json` 5 rows at ticks 1 (`U-CAV-1`), 451 (`C-I-3-1..3`) and 538. Simulating the app's load order 1, 2, 3 (`tmp-verify-app-bugs/probe5.py`): 21 ticks overwritten, 127 rows lost; `placementsByTick[1]` goes from 72 rows to the single `U-CAV-1` row when day 2 loads; ticks 226/248/256/280/302 lose their artillery/skirmisher rows, and so on (`probe4.py` lists the out-of-day rows).
- Impact: with today's `i2` cache the loss is masked, but every fix that makes positions pure (app-bugs-07), the minimap (16) and the acceptance test "tick 1 -> 71 distinct units" fail after day 2 loads; Tranche 0 patch J makes day 2 load on the first jump, so it surfaces sooner.
- Fix: (1) `addPlacementsForDay` merges per tick (concat, dedupe by `(unit_id,tick)`, last wins); (2) the build step buckets rows by the day of `row.tick` (1-225, 226-450, 451-675), never by source-file group; (3) `validate-data.mjs` rule "every row's tick lies in its file's declared range"; (4) move or split the four files. Effort S for (1), M with (2)-(4). Acceptance: after loading days 1, 2, 3 in any order `placementsByTick[1].length === 73` and the total row count equals the union of all files.

**M2. High. The unit panel (`MF`/`SF`) reads only the exact-tick row, so its disposition badge, Strength bar, "At Tick N" notes and history are absent for about 97 % of (unit, tick) pairs.**
- Evidence: `Ie = (M[P] || []).find(...)` (pretty:97909-97911); the disposition badge and border colour need `Ie` (97922-97925, 97985-97992); `SF` starts `if (!P || x == null) return null` (pretty:97664-97671) with `currentStrength: Ie?.strength` (98010-98012); notes need `Ie?.notes` (98018); "Recent Positions" is an exact-tick scan of the last 20 ticks. Data (`probe7.py`): within each unit's first-to-last keyframe span only 1,687 of 61,198 ticks (2.8 %) have a row; at tick 100 only 10 units have a row while 187 are drawn.
- Not listed among the "three inconsistent on-the-field definitions" in app-bugs-07. Fix: the panel, `SF`, the roster and the Ancestor timeline must read the same `positionAt(frames, tick)` result (latest keyframe at or before the tick, strength interpolated) and show "last reported at tick N" when held; history from keyframes. Effort S-M, fold into 07. Acceptance: select any drawn unit at ticks 100, 300, 538: disposition badge and strength bar are present.

**M3. Medium-high. Tranche 0 F is not enough for mobile, and two hot-patch packs now edit the same anchors.**
- Evidence: `FF` and `OF` (Search, Filter) render from `AO` at z 95 (pretty:98964, 99288; JSX 113247-113248), `CF` 92, `MF` 92, `LF` 85, all beneath `tn.root` z100 (pretty:103698-103705); the mobile shell fetches chronology only to draw non-interactive scrubber dots (102958-102975, `pointerEvents: "none"` at 103206). So after Tranche 0 the mobile Search and Filter tiles and all narrative panels (24 vignettes, 137 events) remain invisible, while the Tranche 0 acceptance only checks `elementFromPoint`. `app-mobile.md` (lines 17 and 132-150; not re-executed by me) ships its own 68-edit pack (`tmp-app-mobile/apply_patches.py`, bundle renamed `index-mHF1a.js`) that re-hosts `FF/OF/CF/LF/qF` inside `pO`; app-bugs-01 proposes 24 different patches and another rename over the same F block (pretty:113233-113283).
- Fix: publish ONE merged Tranche 0 (single bundle name, single `CACHE_NAME` bump, one validation script asserting each anchor is patched exactly once), with the visible-panel acceptance test for every mobile tile. Effort S (coordination), no new code.

**M4. Medium. Boot data fetches have no error handling; a single failed request blanks names/panels or hangs the splash.**
- Evidence: `iF` (pretty:96834-96838) is `Promise.all` of 14 OOB fetches with no `.catch`; `oF` (96922-96933) and `rF` (96919-96921) likewise; `sF` (96939-96940) and the effect at 112962 do not catch. If one OOB file fails, `setOobData` never runs, `oobData = {}`, and every unit click is dead (`MF` returns null when `oobData[id]` is missing, 97903). If day 1 fails, `zp` swallows it and stores nothing, so `Object.keys(placementsByTick).length > 5` never becomes true and the splash stays on "loading" (101478-101484) with no error and no retry (only "Skip intro"). The SW `/data/` network-first fallback only helps after a previous success.
- Fix: route all boot data through the same `dataService` (retry with backoff, error state, Retry action) and give the boot state machine an `error` stage. Effort S-M. Acceptance: block one OOB file: app boots with names from the other 13 plus a visible retry toast; block `placements_day1_*`: splash shows an error and Retry.

**M5. Medium. `sw.js` caches error responses and serves them cache-first forever.**
- Evidence: the `/assets/*` handler (`sw.js:41-49`) and the `/data/*` handler (`sw.js:58-68`) call `cache.put(request, response.clone())` without checking `res.ok`. A transient 404/5xx on a lazy chunk (HelpModal, BookmarkPanel) is stored under the current `CACHE_NAME` and then returned cache-first until the cache name changes; `cache.addAll` at install (sw.js:19) is atomic (any 404 aborts install). This is the runtime half of the redeploy trap in section 1 of the report.
- Fix: only cache `res.ok && res.type === 'basic'`; derive `CACHE_NAME` and the precache list from the build manifest; never cache 4xx/5xx. Effort S.

**M6. Medium-low. The Virtual Walkthrough cannot be opened in the Mobile layout.**
- Evidence: the only `Ut(!0)` call is the desktop toolbar button at pretty:113134-113138, inside the `Zn !== "mobile"` block; the 14 mobile Tools tiles (pretty:103390-103485) contain no Walkthrough entry. The report's `TOOLS` registry lists `walk` for mobile but never records the current gap; app-bugs-19's "mobile branch" is therefore reachable only via "Desktop View" on a phone or a narrow desktop window. Fix: add the tile with the registry and land app-bugs-19's map fix first. Effort S.

**M7. Low-medium. Any `sw.js` change (including Tranche 0's `CACHE_NAME` bump) force-reloads every open tab of every returning visitor.**
- Evidence: `sw.js:16-31` (`skipWaiting`, `clients.claim`) plus `index.html:262-268` (`controllerchange -> location.reload()`): a new worker takes control of all existing pages, each reloads once and replays the 3.5 s splash. This is C6's mechanism, but the report's rollout plan (section 1, Tranche 0) treats the bump as free. Fix: ship the C6 fix in the same deploy (reload only when there was no previous controller, or show an "Update available, reload" toast) and announce the one-time reload. Effort S.

**M8. Low-medium. `/data/*` is served `max-age=3600` under unchanged file names, so in-place data fixes are stale for up to an hour and can skew against a new immutable bundle.**
- Evidence: `netlify.toml:26-30`; live `curl -I .../data/placements_day1_ticks1_50.json` returns `Cache-Control: public,max-age=3600`; the SW handler is network-first but its `fetch` still goes through the HTTP cache. Findings 06 and 35 propose editing the 10 mis-prefixed rows and generating `day1-3.json`; only new file names avoid skew. Fix: content-hash data file names (or `?v=<buildId>` injected with the facts pipeline of finding 15) and reference them from `facts.json`. Effort S.
