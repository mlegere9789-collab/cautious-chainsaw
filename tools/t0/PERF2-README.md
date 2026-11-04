# PERF2 - the performance and naming defects of the acceptance dry run (optional patch group, two files)

Status: built and proven on scratch trees of R1c + CLOCK + DATA + MON + POLISH (`tmp/perf2/p2`), 2026-10-20. **Not registered** in `trains.json`, not in `release/`, nothing deployed; no existing file was edited.
It answers the findings of `docs/accept/dryrun/pass-1.md` that are about speed and accessible names (acceptance checks 4, 5, 7 and the one copy finding that is a code comment), found by profiling first.

Files (inert, in `tools/t0/patches-next/`): `PERF2.json` (bundle part, 9 patches), `PG-perf2.json` (page part, 14 patches, `"optional": true`, `"train": "R1c"`). Tests: `tests/t0/perf2.spec.mjs` (12 ids).
Like POLISH, the page half is a page group (`PG-*`): the builder applies page patches of fixed groups before the page groups, and the Mapbox pages are rewritten by `PG-maps`/`PG-core`, so only a page group sees their final text. The two files are one logical group: register both or none.

## Build and prove

```
python tmp/perf2/stack.py --out tmp/perf2/p2   --with CLOCK,DATA,MON,POLISH,PG-polish,PERF2,PG-perf2          the tree (40 s)
python tmp/perf2/stack.py --out tmp/perf2/base --with CLOCK,DATA,MON,POLISH,PG-polish                         the control: the same tree without PERF2
python tmp/perf2/stack.py --out tmp/perf2/pa   --with CLOCK,DATA,MON,ANIM,POLISH,PG-polish,PERF2,PG-perf2     with ANIM
node tests/t0/perf2.spec.mjs --dist tmp/perf2/p2/dist --control tmp/perf2/base/dist --build [--quick] [--filter 'P2-0[1-3]']
node tests/t0/perf2.spec.mjs --dist tmp/perf2/base/dist --expect-red                                          red-first: the control must FAIL
```
`tmp/perf2/stack.py` is `tmp/polish/stack.py` with the paths changed (git-ignored scratch wrapper: it copies `patches/` plus the named `patches-next` files, parts included, to a stage directory and calls `build.build_train` with `optional_groups` extended in memory). T0-P2-12 (`--build`) does the same with an inline Python call, so the test does not depend on `tmp/`.

## Registering it and the ordering (integrator)

* `trains.json`: `"PERF2"` in `optional_groups` **after** `POLISH` (and `ANIM` when present); copy the two files to `tools/t0/patches/`; build with `--with CLOCK,DATA,MON,POLISH,PG-polish,PERF2,PG-perf2`.
* **Order.** No PERF2 find overlaps POLISH, CLOCK, DATA, MON, R0+mapbox-precompile or ANIM: the group builds after POLISH, and also standalone on CLOCK,DATA,MON (T0-P2-12). The bundle patch `PERF2-precompile-extra-call` anchors on the text `R0+mapbox-precompile` writes, so R0's extension part must be in the train (it is in every train).
  `PG-perf2` sorts before `PG-polish` (`e` < `o`); none of its anchors is a line PG-polish touches (checked: the only shared files are `site-nav.js`, `index.html`, `compare.html`, `ground-remembers.html`; PG-polish edits label strings and one prose sentence there).
* **ANIM commutes**: `...MON,ANIM,POLISH,PG-polish,PERF2...`, `...POLISH,PG-polish,ANIM,PERF2...` and `...POLISH,PG-polish,PERF2,ANIM...` give the same entry bundle (md5 equal; T0-P2-12). ANIM rewrites the animation engine and the playing loop; PERF2 touches the roster list component, two SVGs, the precompile helper and the Monuments `ensure()`.
* Existing specs whose expectation PERF2 changes on purpose: none (see Results).

## What was measured, and how

Everything below was profiled first (Chrome `Profiler` sampling at 100-250 us, Long Animation Frames with script attribution, a trace with the style and layout events and their JS stacks, Mapbox's own compile statistics `map.painter.context._compileStats`, heap snapshots) on the control tree, at 1x CPU and at the 4x throttle of the harness, desktop and phone emulation (390 x 844, touch). The scratch tools are in `tmp/perf2/` (`plib.mjs`, `compare.mjs`, `app.mjs`, `load.mjs`, `cmpbench.mjs`, `tbtbench.mjs`, `soak.mjs`, `snapdiff.mjs`). The machine is shared with other agents' browsers, so absolute times move by a factor of two to ten between runs; every before/after below is interleaved and repeated (n given), and a harness run is quoted only next to the control run made the same way.

## 1. Compare: Dark, 3D Terrain and the "style diff" warning (`compare.html`)

* **Root cause, long tasks and the 180 ms response.** Not the page's JavaScript (the click handler ran 3-5 ms). Mapbox GL 3.24.1 compiles a shader program the first time a layer draws with it and then blocks the main thread on `getProgramParameter(LINK_STATUS)` until the GPU process has linked it (`Program._finalize`). Dark switches to a style whose fill, line and symbol programs have never been linked (profile: `getProgramParameter` 168 ms of 312 ms in the frame); 3D Terrain links the terrain variant of every program in use, including the page's own circle layer (59 ms + 53 ms `circle`, 33 ms `updateTerrain`). Both happen in Mapbox's render frame, i.e. in the frame that must also paint the pressed button, so the visible response was 180-260 ms and the frame was a 64-250 ms long task. The second map of the page (pane B) never showed it: the GPU process caches the first link.
* **Root cause, the console warning.** `map.setStyle(url)` tries to diff the old style against the new one; satellite-v9, dark-v11 and light-v11 differ in their sprite, which the diff cannot apply: "Unable to perform style diff: Unimplemented: setSprite.. Rebuilding the style from scratch." The rebuild is what happened anyway.
* **Fix.** (a) `setStyle(url, { diff: false })`. (b) `GTBG_PRECOMPILE(map)` (a helper in `site-nav.js`, derived from `R0-mapbox-precompile`'s `gtPrecompile`, which does this for the app map): after each style load it rebuilds Mapbox's own precompiler queue, adds what Mapbox's queue skips (circle layers, whose program follows from the layer, and the text-SDF symbol program, with the defines the draw calls build, so that the cache keys match), and runs it in one task, so the programs link in the GPU process while tiles are fetched. (c) With `{ terrain: true }` it then builds the queue as if the style had terrain (the flag `style.getTerrain()` is shown for the one `buildQueue` call) and runs it in idle slices (`processQueue`: Mapbox's deadline-respecting path), so the terrain variants (and terrain + fog, which the 55 degree tilt needs) are linked before anyone presses the button. (d) The 3D Terrain click paints the pressed state first and switches the terrain in the next task (`requestAnimationFrame` + `setTimeout`).
* **Verified by Mapbox's own statistics:** after Dark then 3D Terrain `onDemand` stays at 4 (the programs of the very first frames) and the terrain press adds no stall; before, the press added `symbol/TERRAIN...` 129 ms and `circle/...FOG...` 25 ms.
* **Before / after** (fresh page, 9 s idle, then the press; n = 3 per cell, `tmp/perf2/cmpbench.mjs`; desktop mouse, phone touch):

| | control | PERF2 |
|---|---|---|
| desktop Dark: long tasks | 67+91, 68+125, 70+114 ms | none, none, none |
| desktop 3D Terrain: long tasks / time to paint | 199+51, 219+62, 240+61 ms / 232, 248, 264 ms | none / 16-32 ms |
| phone Dark: long tasks | 69+99, 61+90, 52+109 ms | none |
| phone 3D Terrain: long tasks / time to paint | 200+52, 176, 161 ms / 192-224 ms | none / 24-32 ms |
| "Unable to perform style diff" warnings (6 presses) | 3 per 3 runs | 0 |
| 3D Terrain pressed 1.2-3 s after load (as the harness does), desktop and phone | 53-68 ms long task in 8 of 12 | none in 12 |

## 2. App: Unit Roster (`index-*.js`, 3 patches)

* **Root cause.** `Jk`, the roster, renders every unit of both armies as a row component at once: about 600 rows, 5,000 DOM nodes, 600 KB of markup, inside the click. React render + commit took 33 ms and the dialog focus (`mk` of the accessibility shim: `el.focus()`) forced the style and layout of those 5,000 nodes, 62 ms: one 89-136 ms long task, 104-136 ms to the next paint (Enter, Space and click alike). The rows were not memoised either, so a playing clock re-rendered all 600 on every step while the roster was open. A third patch (`PERF2-focus-next-frame`) moves the accessibility shim's `el.focus()` of a newly attached dialog from the commit of the click to the next animation frame (62 ms of forced style and layout for the roster, 31-39 ms for the first open of the phone Tools sheet); a panel that is gone by then, or already holds the focus, is left alone.
* **Fix.** Each column mounts its first 24 rows at once (about a screenful) and the rest in slices of 48 on idle time (`requestIdleCallback`, 150 ms timeout, `setTimeout` fallback); every row ends up in the DOM, in the same order. Rows are `React.memo`ised: a step only touches the rows whose placement object changed.
* **Before / after** (`tmp/perf2/app.mjs`; harness c4 for the Enter/Space/click presses): long task 102 ms (LoAF 105 ms, 96 ms in the click handler, forced style+layout 63 ms) -> none (LoAF 51 ms, no script over 50 ms); c4: 6 defects on the control (3 long tasks, 3 slow responses, 121-136 ms) -> 0.

## 3. App: first press of Monuments (found on the POLISH stack, not in the R1c dry run)

* **Root cause.** The first press adds the four Monuments layers (three circle layers, one icon symbol layer). Mapbox's queue skips circle and symbol layers, so their programs were linked on the main thread on the first frame that drew them (3 x 11-14 ms circle, 67 ms icon symbol: `getProgramParameter` 92 ms), plus 25 ms for `getImageData` of the two 64 px star canvases (a GPU-backed canvas read back synchronously). One 74-125 ms long task.
* **Fix.** `gtPrecompile` (R0) gets two extra queue entries from the layers themselves (`gtPrecompileExtra`: the circle programs and the icon-symbol program) and is called once per map when the Monuments layers exist (`ensure()`); the star canvases use `willReadFrequently`. At map load nothing is added (`__gtExtra` is set only by the Monuments call), so the load cost of the app is unchanged.
* **Before / after** (`tmp/perf2/appdbg.mjs`): long task 64-125 ms, 4 programs linked on demand (circle x3 11-14 ms, symbol 67 ms) -> none, 0 on demand, 3 more precompiled.

## 4. Inline SVGs without a name (`index-*.js`, 2 patches)

The ring around the day badge (a progress indicator, 28 px) is now `role="img"` with `aria-label="Day N progress: P percent"` computed from the same value that draws it; the dot-size samples of the Legend (22 px, each next to a label that says the same) are `aria-hidden`. Acceptance check 7 found only the ring (4 findings: 1024, 1440, 1920 px and the first-visit state, "inline svg that is not hidden from assistive tech and has no name or role").

## 5. Tap targets under 44 px at 1024 px (check 7)

Re-tested on the POLISH-stacked control before touching anything: see Results. PERF2 does not change them.

## 6. Copy audit: "prompt" in `ar.html`

Line 189 is a code comment: "Device orientation (iOS 13+ requires an explicit permission prompt from a user gesture)", the browser's permission dialog, not an AI prompt. Reworded to "(iOS 13+ asks the visitor for permission, and only from a tap or click)" so that no shipped byte carries the word (rule `prompt` of `tools/accept/copy_audit.mjs`). The other copy-audit findings (`_headers`/`_redirects`/`netlify.toml` "Generated by ... DO NOT EDIT", the PDF metadata, "not an AI" in the Historian) are decisions or build-config changes and are not touched here.

## 7. Phone total blocking time at 4x CPU

* **ground-remembers** (570 ms in the harness on the control): the dark-v11 style's fill/line/symbol programs and the heatmap's were linked on the first frames that drew them (145 ms `getProgramParameter` inside three long tasks, LoAF-attributed to `Program._finalize`). `GTBG_PRECOMPILE` after the style and after the heatmap layer, and `mapboxgl.prewarm()` while the placement files download. Measured with `tmp/perf2/tbtbench.mjs` (n = 5, cold, phone, 4x, interleaved): median 284 -> 185 ms (all runs 214-299 -> 141-226).
* **compare, immersive, viewshed**: same helper and `prewarm()`. On this machine the control measured 72 / 18 / 39 ms median (the harness measured 322 / 301 / 576 on a busier machine at the time); with PERF2 75 / 37 / 68: no change that the noise does not cover, because the cost the helper removes is the wait for the GPU process, which is exactly what contention lengthens. See "What remains".
* **app (`/`)**: not fixed, see "What remains".

## 8. Heap growth over the soak

**No leak found.** Heap snapshots of the control at 31 s and 332 s of a 4x playback with the harness's wheel pokes (`tmp/perf2/soak.mjs`, `snapdiff.mjs`): the used heap climbs from 13.7 MB to 14.3-15.8 MB and falls back to 14.3 MB each time the battle restarts; DOM nodes (930-1035) and listeners (273-283) are flat. The 1.54 MB the snapshots gain is: V8 code objects `InstructionStream` +0.92 MB (439 -> 2,682 objects: functions optimised as new code paths run), `TrustedByteArray` (bytecode metadata) +0.31 MB, `ProtectedFixedArray`/`WeakArrayList` +0.26 MB, `PerformanceEntry` objects of the harness's own observers (layout-shift, LCP, rects) +0.2 MB; plain `Object`/array growth is 40 KB. The harness takes its baseline at 30 s, while the JIT is still warming, so the percentage on a 14 MB heap is the warm-up curve (5.7 % in one 120 s run, 10.25 % in the dry run, about +4 to +15 % within one 330 s run). T0-P2-11 proves the open/close cycles of Roster, Legend and Monuments return DOM nodes and listeners to where they were.

## Results

Run on 2026-10-20 on a shared machine (absolute times move by a factor of two or more; every comparison is against the control built and run the same way).

**Tests** (`tests/t0/perf2.spec.mjs`, 12 ids): 11 of 12 pass on `tmp/perf2/p2` and the twelfth (`--build`, T0-P2-12) passes on its own (CLOCK, DATA, MON, POLISH, PG-polish, PERF2, PG-perf2); the control fails the 8 non-guard ids (`--expect-red`). Two ids failed in an earlier run for reasons that were not the group: T0-P2-09 read blank canvases while the machine was loaded (passes on rerun), and T0-P2-11 compared the heap after only 3 warm-up cycles, which the control fails too (+7.9 %, V8 code objects; DOM nodes and listeners flat). The warm-up is now 8 cycles and the measured window 14 (6 with `--quick`); both control and PERF2 then pass.

**All candidate groups together.** `CLOCK,DATA,MON,ANIM,POLISH,PG-polish,PG-legal,PG-polish-legal,PERF2,PG-perf2` builds with every assert matched (0 ANCHOR FAIL; `tmp/perf2/all1`). Notes for the integrator that are not about PERF2: `PG-polish-legal` needs `PG-legal` in the train; `COPY2` as a bundle-phase group finds 0 occurrences of its text in `historian.html` (page patches of fixed groups run before the page groups), and as a page group it must sort after `PG-core` (`PG-zcopy2` matched 2 of 2 in a scratch build; `PG-COPY2` sorts before `PG-core` and fails).

**Acceptance harness, same machine, same candidate shape (R1c + CLOCK + DATA + MON + POLISH):**

| | control | PERF2 |
|---|---|---|
| check 4 (input matrix) defects | 14 (7 long tasks during interaction, 5 slow responses, 2 style-diff console warnings) | 2 (phone taps on "July 1" and "Previous step", 266 / 380 ms on a busy machine; 69-93 ms / 21-26 ms when benchmarked on their own for both trees, so they are load, not the group) |
| check 5 phone TBT proxy at 4x CPU, routes over 200 ms | compare 322, ground-remembers 570, immersive 301, app 471, viewshed 576 | compare 224, ground-remembers 703, app 412, viewshed 440, watch-together 432 (immersive under 200) |

The check 5 numbers are not a clean win and are not claimed as one: five phone routes stay over 200 ms on either tree and the ranking moves with machine load (the cold, interleaved `tbtbench` of section 7 is the better instrument: ground-remembers median 284 -> 185 ms).

## What remains

* **Phone total blocking time at 4x CPU, five routes over the 200 ms limit** (app, ground-remembers, viewshed, watch-together, compare on a busy machine). The part of it that is Mapbox waiting for the GPU process to link programs is addressed (sections 1, 7); what is left is the app's own start-up on the bundle (section 7, "not fixed") and the same GPU wait made longer by machine load.
* **A date-jump tap on the phone at 4x CPU**: `mL` (click handler) runs the canvas redraw `lS`, whose `getBoundingClientRect()` forces 60-78 ms of layout, a 130 ms task at 4x (about 35 ms at 1x) on the control and on PERF2 alike. The animation engine and the playing loop are ANIM's, so it was not touched here.
* **ANIM stack**: with ANIM in the tree (with or without PERF2) the same tap is followed by 0.7-1.2 s of `requestAnimationFrame` callbacks at 4x CPU on the phone (about 0.2-0.3 s at 1x). Measured with `tmp/perf2/app.mjs ... phone 4 july` on `tmp/perf2/anim0` (no PERF2) and `all1`; it is an ANIM matter and needs a decision by whoever owns that group.
* Tap targets under 44 px at 1024 px (section 5) are unchanged; Mapbox attribution targets are notes in the harness.
* Not registered, not in `trains.json`, nothing deployed.
