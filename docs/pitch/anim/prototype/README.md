# Battle Studio: the assembled animation product and the engine behind it (prototype)

One self-contained page, `battle-studio.html` (about 1.4 MB, readable source, **no network request of any kind**: the build fails on any URL, `fetch` or external resource), and the engine behind it. It touches no product file; it reads the real data and says what each thing on screen is. The three tile-design pitches, the Overlay Director with its twelve popups, the production-renderer reproduction for the before/after comparison and the tours are all registered **by name** into one engine and tuned from one JSON file in a live Tuning Studio.

## 0. What you open

Open the file in Chrome, Edge or Firefox. It opens on the densest fresh-contact scene, paused, with a welcome card.

| | |
|---|---|
| **Style** (top bar) | **War Room** (cinematic dark glass, default), **Field Manual** (NATO APP-6 grammar on paper), **1863 Map** (the documented Union corps badges); each in a standard, colour-blind-safe and high-contrast variant. A style is a skin plus the ground and the interface theme that sit well beside it (`src/styles/index.mjs`). |
| **Before / After** (top bar, key `B`) | *After* is the Studio. *Before* replays the **same ticks** through a reproduction of the production tile renderer built from the shipped code (bars, per-tick stepping with its stale-tick bug, hold-then-jump keyframes, the from-scratch relaxation that leaves tiles overlapping). It is checked against research report 01 (section 1.1) and is a hidden module set selected by one dial: your own settings are never touched and the Studio's pipeline is not changed by it. |
| **Showcase** (top bar, key `W`) | A guided **60-second showcase** (the before and after, the measured numbers, the three styles, the whole field, the popups, the honest limits), a scripted run for each of the **three hardest places** (Cemetery Hill tick 346, Rose Woods tick 293, The Angle tick 556: the same six minutes twice, then the numbers measured on this run), and **Replay this view** (the same ticks from wherever the camera is, before then after). A tour is data (`src/tours/library.mjs`); captions quote live numbers, never typed ones. |
| **Popups** | All twelve are still there (event card, story card, command toasts, cross-out, unit card and hover, auto tour, day banner, clock, legend, overview, hints, Chronicle). They live for reading time, point at their units and never cover a tile (`src/popups/README.md`). The tours switch them off while the two tile renderers are compared and back on for the popup step. |
| **Tune / Inspect / Metrics / About** | `T` every dial live (177 dials, each with its evidence label); `I` what the data says about a clicked unit; `M` frame times, sudden jumps, steps, overlaps and unrepresented units **per renderer** (a column each); `A` the legend of the current skin, the evidence labels and the honest limits. |
| **Keys** | Space play, arrows step (Shift = one hour), `[` `]` speed, wheel / pinch zoom, drag pans, click selects, `Esc` closes the menu, then a tour, then a card. |
| **URL** | `?style=war-room` (or `field-manual`, `map-1863`) `&variant=standard` (or `cvd`, `contrast`); `?compare=before`; `?tour=showcase` (or `hotspot-cemetery-hill`, `hotspot-rose-woods`, `hotspot-the-angle`); `?welcome=0`; `?manual=1` (no animation loop: only `studio.step()` advances the engine, for deterministic tests and frame strips); `?tune=1` `?metrics=1` `?scene=` `?tick=` `?zoom=` `?speed=` `?play=1` `?skin=` `?mode=` `?layout=` `?vis=` `?backdrop=` `?fresh=1` `?set={"layout.dMaxPx":24}` (any dials). |

Pictures of every step at 1440x900 and 390x844: `../shots/prototype/assembled/`. Eight-frame strips of one tile before and after, from the real page: `../shots/prototype/strips/`.

## 1. What is real, and what is not

| On screen | Source | Label |
|---|---|---|
| 478 units, 1,687 placement keyframes (1,804 rows; the shipped last-row-wins rule) on 188 of 675 ticks, order-of-battle chains | `baseline/dist/data` (production data), copied verbatim into `data/dataset.json` with the SHA-256 of every source file | positions and strengths **Modelled** (hand-authored, no basis field); identity **Documented** |
| Motion between keyframes | monotone cubic interpolation of those keyframes | **Modelled** |
| Clock beside the tick | the 33-anchor candidate clock (`data-src/time/time_anchors.json`), all anchors "proposed" | **Modelled**, always shown as "about ... (± n min) candidate clock" |
| Side of 10 units whose id prefix says Union but whose state code is Confederate (`U-26NC` ...) | 03-data-fuel.md | **Contested**: drawn as amber stripes, never as Union or Confederate |
| Aggregate counts (`x5`), tile ages, scenes | computed here | **Computed** |
| Backdrop | a metric grid and the 30 place marks of `terrain.json` | **schematic, not terrain**; Mapbox tiles are token-restricted |
| The Before view (production renderer) | the shipped `y1` / `F4` interpolation, the playback loop `Ed`, the relaxation and the draw routine `lS`, as read from the bundle and ported by research (`01-current-tiles-jitter.md`, `layout-lab/lib/legacy.mjs`) | **Computed**; reproduces report 01's whole-battle replay exactly (section 1.1) |

The whole battle is inlined (the brief allowed a window of ticks around the hotspots): the placements are only about 450 KB in this form, and a window would have cut the carried-forward history that the visibility rule needs.

The place marks follow the frame of the placements (legacy `terrain.json`). Production `terrain.json` puts 8 of the 30 places 166 to 733 m elsewhere (computed in `data/build-dataset.mjs`, stored in the dataset); those 8 are drawn dashed and which frame is right is **Unknown**. `Gulp's Hill saddle` is shown as `Gulp's Hill saddle [sic]`: the source record's own text says Culp's Hill.

### 1.1 The Before view is checked against the research replay

`test/production.test.mjs` runs the Studio's production clock and production motion model over the whole battle at 60 Hz, position only, and counts what report 01 counted (`docs/pitch/anim/data/current-metrics.json`, `harness-current/fast-motion.mjs`, which ran the shipped code extracted from the bundle): **833 hops of 8 px or more at zoom 13.5 in 159 frames (median 77.8 px, maximum 1,096.3 px), 66 snap-backs on the tick-boundary frame, and 407 units that vanish for exactly one frame after being pushed in half a tick early (407 of 407 reappearances)**: the same at 1x and at 4x, and identical to the report. A caption cannot drift from this: the number quoted on screen (`FACTS` in `src/tours/library.mjs`) is asserted equal to the replay.

What the reproduction leaves out, said once: the hit flash, the trail canvas, the `NN fps` text and the cannon sound; the production canvas draws at one pixel per CSS pixel where this page draws at the device pixel ratio (up to 2); the order in which it iterates units is reconstructed (first keyframe tick, then data order); and production's React, Mapbox and compositing cost is **not** reproduced, so the Before's frame cost here is not the production page's frame cost (report 01 measured 44 to 51 fps for the fixed build R1c in dense scenes; this reproduction runs at 60 fps on the same machine). Use it to compare *motion and overlap*, not speed.

## 2. Architecture: one straight pipeline, no second code path

```
transport.advance(dt) -> tau (continuous tick)      time/transport.mjs     fixed 120 Hz steps in integer microseconds, interpolated for drawing; eased play/pause/speed; seeks GLIDE
camera glide          -> zoom, centre               scene/engine.mjs       wheel zoom keeps the pointer's ground fixed; scene jumps centre in the free part of the screen
battle.visibleAt(tau) -> units + positions          data/model.mjs         the ONE resolver of "what is on the field" (rules: carry / window / snapshot)
  interp (named)         monotone cubic PCHIP | straight chords with smooth speed | linear      interp/paths.mjs
layout.solve(...)     -> certified targets          layout/engine.mjs      exact placement, aggregation fallback, certified across groups (06-layout.md)
motion.step(...)      -> DISPLAY frame              scene/display.mjs      glide + pushing + sequenced fades + travel + the safety net (every frame verified)
renderer.draw(frame)  -> canvas                     render/canvas.mjs      backdrop, fx, leaders, chips (skin), labels, pins
metrics.record(frame) -> numbers                    metrics/metrics.mjs    frame intervals, offsets per frame, jerk, overlaps, solve ms, repairs
```

Everything is an ES module under `src/`; `scene/engine.mjs` runs the whole pipeline **headless** (`engine.step(dtMs)`), so node tests and the browser execute the same function. The layout is solved on the whole field, not on the visible part, so it does not depend on the camera. The solver may run on every frame, or (slow devices, `layout.solveEvery`) on every 2nd or 3rd frame with the solved tiles carried along by their units in between; this is one code path, not a second pipeline, and every displayed frame is verified either way.

Registries (`kernel/registry.mjs`, one set per engine): `interp`, `layout`, `motion`, `skins`, `popups`, `fx`, `backdrops`. **The registries start empty** and the shell (`src/skins/index.mjs`, `src/popups/index.mjs`, `src/fx/index.mjs`) fills them: the reference skin (an engine test skin, not a design pitch), the pitched skins, and the twelve popups of the Overlay Director (`src/popups/README.md`).

### The before/after switch: one pipeline per mode, never mixed

`compare.mode` ('after' or 'before') lays six dials over the viewer's own settings through the engine's token reader (`PRODUCTION_DIALS` in `scene/engine.mjs`): `skin.id`, `layout.strategy`, `layout.visibility`, `motion.mode`, `interp.model` and `time.model` take their production values, nothing else changes, and switching back lifts them again (the viewer's skin, budget and every other dial are exactly what they were: tested). The reproduction is a set of **registered but hidden** modules (`interp/production.mjs`, `layout/production.mjs`, `scene/production.mjs`, `skins/production.mjs`, and the `production` clock in `time/transport.mjs`): the same straight line `transport -> resolver -> interp -> layout -> motion -> renderer -> metrics`, other modules in the same slots, so there is no second code path inside either mode and the Studio's own pipeline is not touched by the existence of the other. Each mode has its **own metrics recorder** (`engine.metricsOf('before' | 'after')`), which is what lets a tour measure both on one scale. The random-action monkey test switches `compare.mode` together with every other dial; the Studio's guarantees hold on every frame after the switch back.

## 3. The guarantees, and what checks them

1. **No two solid items of different tiles overlap, on any displayed frame.** The certified layout guarantees it for the solved frame (`layout/engine.mjs`); the display layer then moves tiles continuously, which no longer has a proof, so **every displayed frame is re-verified by the independent verifier** (`layout/geom.mjs`, shares no code with the solver) and any remaining overlap is repaired by dimming the lighter tile below 0.5 (the opacity rule, 06-layout.md 6.4). The guarantee therefore never depends on the glide being right; the glide only decides how often the repair is needed.
2. **Every unit on the field is represented by exactly one live tile** (a tile or an aggregate that lists it).
3. **No tile sits farther than the displacement budget from its true position, and no chip covers another tile's true position** (pins).
4. The picture is a pure function of the inputs: same frame times, same pixels (bit-identical, tested).

Measured with `node --test "docs/pitch/anim/prototype/test/*.test.mjs"` (`FULL=1` for the exhaustive sweep):

- **4,725 cold solves** (all 675 ticks x zoom 11..17, carry-forward = the worst case): **0 overlapping pairs, 0 clearance violations, 0 unrepresented units, budget kept**; 1,576,932 unit-placements represented; slowest solve 139 ms (re-run on the assembled code with the rest latch, the split look-ahead and the target hold: 3 min 10 s; the default `node --test` re-checks 242 solves plus 600 warm playback frames).
- Playback of the six hardest scenes at 1x to 16x, with irregular frame times (5 to 45 ms), seeks, cuts, zoom animation, mode switches and reduced motion: **0 overlapping frames, 0 unrepresented units**.
- A seeded **monkey test** (`test/fuzz.test.mjs`) drives the whole API with random play, pause, speed, seeks (glided and not), zoom, pan, selection, viewport sizes, scene jumps and random legal values of every dial, and checks on every frame: no exception, no overlap, no lost unit, unique keys, finite numbers, no tile stuck dimmed. A 30-seed run of 500 actions each (15,000 random actions, 11.8 min) passed on the earlier engine; on the assembled engine **12 seeds x 500 actions (6,000 random actions, 4.1 min) pass**, including random switches of `compare.mode` (the Before view is checked for everything but overlap) and the stuck-dimmed-tile check; the default `node --test` runs 3 seeds x 220 actions.
- The checkers are themselves checked: the verifier equals a brute force on 3,000 random sets and catches injected overlaps; `nearestFree` equals a fine brute-force scan on 150 scenes; a negative control (net off, pushing off) shows overlaps appear without the safety net.

### 3.1 The assembled page, in real Chrome

`test/verify-sweep.mjs` drives the built page (`?manual=1`) to a settled frame for every style (standard variants), a ladder of zooms and 14 ticks (the three hotspots, the densest tick 620, the first and last tick, the three days), and checks **the frame the page drew** with a brute-force routine that shares no code with the engine. *Vital core* of a tile = its chip box (everything the skin paints for the tile: short name, side, arm, strength gauge, count of an aggregate, selection ring) plus the pin on its true position when it is displaced; name labels are checked too, as secondary.

<!--SWEEP-->
**1440x900** (DPR 1): 378 settled samples (3 styles x 9 zooms x 14 ticks), 199.2 s. Worst over all samples: core overlaps 0, pins covered 0, label overlaps 0, unrepresented units 0; smallest gap between two vital cores 1.98 px (design clearance 2 px, verifier tolerance 0.05 px). The engine's own verifier over the 36,595 frames of the sweep: 0 overlap frames, 0 unrepresented unit-frames. Console errors 0, network requests 0. Text widths: measured in this browser.

| zoom | samples | most tiles | most aggregates | most tiles in view | violations |
|---:|---:|---:|---:|---:|---:|
| 11 | 42 | 25 | 17 | 7 | 0 |
| 12 | 42 | 47 | 37 | 16 | 0 |
| 13 | 42 | 108 | 62 | 32 | 0 |
| 13.5 | 42 | 153 | 74 | 47 | 0 |
| 14 | 42 | 228 | 83 | 60 | 0 |
| 15 | 42 | 355 | 69 | 84 | 0 |
| 16 | 42 | 457 | 26 | 48 | 0 |
| 17 | 42 | 478 | 11 | 1 | 0 |
| 18 | 42 | 478 | 11 | 1 | 0 |

**390x844** (DPR 2): 294 settled samples (3 styles x 7 zooms x 14 ticks), 132.5 s. Worst over all samples: core overlaps 0, pins covered 0, label overlaps 0, unrepresented units 0; smallest gap between two vital cores 2 px (design clearance 2 px, verifier tolerance 0.05 px). The engine's own verifier over the 29,321 frames of the sweep: 0 overlap frames, 0 unrepresented unit-frames. Console errors 0, network requests 0. Text widths: measured in this browser.

| zoom | samples | most tiles | most aggregates | most tiles in view | violations |
|---:|---:|---:|---:|---:|---:|
| 11 | 42 | 25 | 17 | 7 | 0 |
| 12 | 42 | 47 | 37 | 16 | 0 |
| 13 | 42 | 108 | 62 | 32 | 0 |
| 14 | 42 | 228 | 83 | 53 | 0 |
| 15 | 42 | 355 | 69 | 26 | 0 |
| 16 | 42 | 457 | 26 | 5 | 0 |
| 17 | 42 | 478 | 11 | 0 | 0 |

<!--/SWEEP-->

Also run for the assembled behaviour (node, headless, the same engine, director and popup host as the page; `test/assemble.test.mjs`): the whole 60-second Showcase end to end on a virtual clock (3,600 frames: 3,053 Studio frames, every one overlap-free and complete; 718 frames with a popup card on screen, none lying on a tile, a label or a pin), each of the three hotspot tours, the style switch through all nine skins, and a paused picture **coming to rest** (section 4.2).

Real input, real Chrome (`test/assemble-interact.mjs`; results in `results/assemble-interact-*.json`):

<!--INTERACT-->
- 1440x900: **33 of 33** real-input checks pass (clicks, keys, wheel, scrubber, menus, tours, styles, before/after, selection); console errors 0; network requests 0.
- 390x844: **26 of 26** real-input checks pass (clicks, keys, wheel, scrubber, menus, tours, styles, before/after, selection); console errors 0; network requests 0.
<!--/INTERACT-->

Memory and pacing over a long session (`test/verify-memory.mjs`: the Showcase three times in real time on desktop, twice on the phone viewport, then 80 before/after switches and 30 style switches):

<!--MEMORY-->
| viewport | after load | after each showcase run (60 s, real time) | growth first to last run | after 80 before/after and 30 style switches | showcase frame rate / p95 / over 20 ms |
|---|---:|---|---:|---:|---|
| 1440x900 | 10.7 MB | 11.3, 11.3, 11.2 MB | -0.11 MB | 14.3 MB | 59.1 fps, 16.8 ms, 1.1 %; 58.9 fps, 16.8 ms, 1.4 %; 58.9 fps, 16.8 ms, 1.4 % |
| 390x844 | 9.8 MB | 10.7, 10.8 MB | 0.00 MB | 12.5 MB | 59.4 fps, 16.8 ms, 0.7 %; 59.5 fps, 16.8 ms, 0.6 % |

*(JS heap after a forced garbage collection; DOM nodes stay between 190 and 300. The growth after the switching run is consistent with the metric recorders filling toward their sample caps, up to about 2.4 MB per renderer; it was not profiled separately.)*
<!--/MEMORY-->

Perceived performance of the first seconds (`studio.boot`, this machine): the splash is in the first bytes of the file; the first frame is drawn about 230 ms after the script starts (parse 3 ms, engine 32 ms, text measurement 20 ms, interface 2 ms, popups 30 to 45 ms, first solve and draw the rest); the interface then rises into place after the first frame instead of popping in; style and renderer changes dissolve (a 320 ms cross-fade of the previous picture) while the new tiles fade in.

## 4. The jitter: what it was, what changed, what is measured

The shipped renderer's causes (01-current-tiles-jitter.md) and what replaces them:

| Cause (01 / 05 / 06) | Here |
|---|---|
| 92.3 % of keyframe pairs are hold-then-jump (the interpolation only runs between adjacent ticks) | continuous monotone-cubic motion between **all** consecutive keyframes of a unit; exact at keyframes, never overshoots, velocity continuous (tests on all 478 units) |
| per-tick easing stops every unit at every tick end | the clock is continuous; units do not stop at keyframes |
| stale tick drawn on the tick-advance frame (66 snap-backs, up to 458 px) | the clock is a fixed-step simulation, drawn at the **interpolated** tick; the frame uses one consistent time |
| layout recomputed from scratch each redraw | the certified layout has memory (inertia, sticky aggregates, seniority); **found and fixed here: the lab's aggregates were not a pure function of their members, so re-creating one from its leaves moved it by up to 67 px** (`test/layout.test.mjs`, "a cold solve is a fixed point") |
| pops from nearest-free flips and aggregate churn (06: 46 per second at 4x, "not a fix") | the display layer: critically damped glide of the **offset** (the tile never lags its unit), pushing capped per pass, sequenced fades for merges and splits, a far move is a dimmed **travel** instead of a hop, and the verified safety net |
| dense scenes miss vsync | solver and display cost cut by about half (numeric spatial hash, fast path of the placement search, typed-array pushing); adaptive solve cadence |

`test/bench.mjs` runs the matrix and writes `results/motion-matrix.json`; `test/trace.mjs` draws the per-frame motion of the worst tiles (`shots/jitter-trace.png`). Scene `fresh2` (The Angle, zoom 15, the densest fresh-contact scene, about 400 tiles), 8 s at 60 fps, headless:

<!--MATRIX-->
| speed | mode | tiles | pops/s | teleports/s | worst px in one frame | jerk p99 | travels/s | net repairs/s | overlap frames | unrepresented |
|---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1x | layout as solved (snap) | 399.8 | 18.75 | 8.13 | 75.35 | 0.01 | 0 | 0 | 0 | 0 |
| 1x | glide only (spring) | 399.4 | 0 | 0 | 2.56 | 0.02 | 4.13 | 13.13 | 0 | 0 |
| 1x | **glide + pushing + travel (default)** | 399.9 | 0.38 | 0 | 6.94 | 0.04 | 4.88 | 1.88 | 0 | 0 |
| 4x | layout as solved (snap) | 402.4 | 57.63 | 18.38 | 86.55 | 0.31 | 0 | 0 | 0 | 0 |
| 4x | glide only (spring) | 403.5 | 0 | 0 | 2.77 | 0.09 | 7 | 19.88 | 0 | 0 |
| 4x | **glide + pushing + travel (default)** | 400.5 | 13.13 | 0 | 7.06 | 0.14 | 8.75 | 4.88 | 0 | 0 |
| 16x | layout as solved (snap) | 403.9 | 78.38 | 22.63 | 86.28 | 0.31 | 0 | 0 | 0 | 0 |
| 16x | glide only (spring) | 403 | 0 | 0 | 2.65 | 0.05 | 6.38 | 12.13 | 0 | 0 |
| 16x | **glide + pushing + travel (default)** | 405.6 | 7.5 | 0 | 8.36 | 0.12 | 8.5 | 5.25 | 0 | 0 |
<!--/MATRIX-->

(pop = a tile that is solid in two frames and moves more than 3 px beyond its unit's own motion in one frame; teleport = more than 12 px; **snap** is the certified layout drawn as solved, the research lab's behaviour. A dimmed travelling tile is counted under "travels", it is not solid.) Honest reading: teleports are gone; what is left at 4x in the densest scene is a few smooth shoves per second and about nine dimmed glides per second (a lone tile at 0.42 opacity crossing a neighbour for about 150 ms), and the safety net dims a tile about five times per second. That is **not zero visual activity**; it is no hop, no overlap, no hidden unit, and every number is on screen in the metrics overlay.

Real Chrome 155 (headless, this machine, 10 s each, `test/browser-check.mjs`; the JSON of every run is in `results/chrome-*.json`, re-run on the assembled page with the popups, the new chrome and the engine fixes of section 4.2): `fresh2` at 4x (about 310 tiles for 478 units, engine 5.0 ms per frame) **59.8 fps, 0.3 % of frames over 20 ms**; `evening1` at 16x (3.1 ms) **60 fps, 0 %**; `carry1` at 1x (4.4 ms) **60 fps, 0 %**; `field` at 4x (478 units, 2.4 ms) 58.4 fps, 2.7 % over 20 ms (the machine was not idle); in all four **0 overlaps, 0 unrepresented units, 0 console errors, 0 requests**. Under a **4x CPU throttle** (a harsh stand-in for a mid phone, not a phone) `fresh2` at 4x ran at **20 fps** (engine 21 ms, 51 % of the frames solved by the automatic cadence), still with 0 overlaps and 0 unrepresented units; the earlier engine, before the popups, ran this at 27 fps. A **100 s soak** (`test/soak.mjs`: the real frame loop at 8x with a scene jump every 30 s, popups on) re-run on the assembled page: JS heap **28 MB at every one of 10 samples after a forced GC (0.0 MB growth)**, 58.6 fps, 1.4 % of frames over 20 ms, 0 overlaps, 0 unrepresented units, 0 console errors (the printout is kept in `results/assemble-soak.log`; it drew 4,916 frames where the earlier engine drew 6,003, because the engine now goes idle when nothing moves, for instance once the battle has ended). The heap and pacing of a longer session of showcases and switches are in section 3.1.

### 4.1 Before and after on the assembled page, in real Chrome

The same ticks, the same camera, the same canvas, through the production reproduction and through the Studio, each run in real time in the page's own animation loop (`test/verify-pacing.mjs`; every number is read from the page's metrics recorders, which also feed the live Metrics overlay and the tours' results card). *Sudden jump* = a tile that steps 8 px or more in one frame, at least 3 times its step in the frame before (hold-then-jump, snap-back, any discontinuity); the camera is still, so a step is the tile's own. A unit that really marches fast (a cavalry unit at 4x, zoom 15, moves up to about 28 px per frame in the data) takes big *smooth* steps in both renderers; those are not jumps.

<!--BEFOREAFTER-->
| place (zoom) | speed | sudden jumps per s (all tiles / solid) | largest one-frame step | frames with overlaps | overlapping pairs per frame | vanish for one frame, per s | engine ms per frame |
|---|---:|---:|---:|---:|---:|---:|---:|
| Cemetery Hill (z14) | 1x | 3.3 / 3.3 **before**<br>0.1 / 0.0 **after** | 390 px<br>16 px | 100 %<br>0 % | 1255<br>0 | 0.00<br>0.00 | 2.8<br>3.5 |
| Cemetery Hill (z14) | 4x | 31.6 / 31.6 **before**<br>0.1 / 0.0 **after** | 1550 px<br>16 px | 100 %<br>0 % | 1253<br>0 | 3.74<br>0.00 | 2.8<br>3.4 |
| Rose Woods (z14) | 1x | 149.1 / 149.1 **before**<br>0.0 / 0.0 **after** | 625 px<br>10 px | 100 %<br>0 % | 677<br>0 | 2.74<br>0.00 | 1.8<br>4.1 |
| Rose Woods (z14) | 4x | 97.0 / 97.0 **before**<br>0.2 / 0.0 **after** | 624 px<br>20 px | 100 %<br>0 % | 778<br>0 | 4.00<br>0.00 | 2.1<br>3.6 |
| The Angle (z15) | 1x | 7.4 / 7.4 **before**<br>0.4 / 0.0 **after** | 630 px<br>76 px | 100 %<br>0 % | 308<br>0 | 0.75<br>0.00 | 1.6<br>5.1 |
| The Angle (z15) | 4x | 7.7 / 7.7 **before**<br>0.2 / 0.0 **after** | 630 px<br>83 px | 100 %<br>0 % | 295<br>0 | 0.75<br>0.00 | 1.6<br>5.0 |

*(8 s per run in real time in Chrome/155.0.0.0, 1440x900, DPR 1, popups off; `assemble-pacing-1440x900.json`. Both renderers drew at 60 to 60 fps on this machine.)*
<!--/BEFOREAFTER-->

Reading it honestly: in all six comparisons the Studio has **no solid sudden jump** (the only sudden steps it still makes are dimmed ghost glides, at most 0.4 per second; the before makes 3 to 149 per second), the largest step of any tile falls from 390 to 1,550 px to at most 83 px (and the largest remaining ones are a cavalry unit that really marches), and no frame has an overlapping pair (the before overlaps on every frame: 295 to 1,255 pairs on an average frame). What the Studio does **not** do is cost less: its engine takes 3.4 to 5.1 ms per frame against 1.6 to 2.8 for the reproduced production draw on this machine, and under a CPU slowdown that matters:

<!--THROTTLE-->
| device stand-in | place | renderer | fps | frame p95 | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) |
|---|---|---|---:|---:|---:|---:|---:|
| desktop, 1x CPU | Cemetery Hill | before | 60 | 16.8 ms | 0 % | 2.8 | 31.6 (31.6) |
| desktop, 1x CPU | Cemetery Hill | after | 60 | 16.8 ms | 0 % | 3.4 | 0.1 (0.0) |
| desktop, 1x CPU | Rose Woods | before | 60 | 16.8 ms | 0 % | 2.1 | 97.0 (97.0) |
| desktop, 1x CPU | Rose Woods | after | 60 | 16.8 ms | 0 % | 3.6 | 0.2 (0.0) |
| desktop, 1x CPU | The Angle | before | 60 | 16.8 ms | 0 % | 1.6 | 7.7 (7.7) |
| desktop, 1x CPU | The Angle | after | 60 | 16.8 ms | 0 % | 5.0 | 0.2 (0.0) |
| desktop, 4x CPU slowdown | Cemetery Hill | before | 38 | 33.4 ms | 58 % | 13.3 | 26.0 (26.0) |
| desktop, 4x CPU slowdown | Cemetery Hill | after | 24 | 66.7 ms | 100 % | 13.8 | 1.5 (0.0) |
| desktop, 4x CPU slowdown | Rose Woods | before | 53 | 33.4 ms | 12 % | 8.2 | 121.2 (121.2) |
| desktop, 4x CPU slowdown | Rose Woods | after | 28 | 66.7 ms | 79 % | 13.8 | 10.4 (2.1) |
| desktop, 4x CPU slowdown | The Angle | before | 59 | 16.8 ms | 1 % | 5.8 | 10.3 (10.3) |
| desktop, 4x CPU slowdown | The Angle | after | 24 | 66.7 ms | 91 % | 18.4 | 9.3 (2.6) |
| phone viewport (390x844, DPR 2), 1x CPU | Cemetery Hill | before | 60 | 16.7 ms | 0 % | 1.9 | 17.0 (17.0) |
| phone viewport (390x844, DPR 2), 1x CPU | Cemetery Hill | after | 60 | 16.8 ms | 0 % | 3.6 | 0.2 (0.0) |
| phone viewport (390x844, DPR 2), 1x CPU | Rose Woods | before | 60 | 16.8 ms | 0 % | 1.8 | 60.0 (60.0) |
| phone viewport (390x844, DPR 2), 1x CPU | Rose Woods | after | 60 | 16.8 ms | 0 % | 4.0 | 1.0 (0.2) |
| phone viewport (390x844, DPR 2), 1x CPU | The Angle | before | 60 | 16.8 ms | 0 % | 1.1 | 5.0 (5.0) |
| phone viewport (390x844, DPR 2), 1x CPU | The Angle | after | 60 | 16.8 ms | 0 % | 5.1 | 0.3 (0.0) |
| phone viewport, 4x CPU slowdown | Cemetery Hill | before | 60 | 16.8 ms | 1 % | 6.8 | 17.0 (17.0) |
| phone viewport, 4x CPU slowdown | Cemetery Hill | after | 38 | 50.0 ms | 51 % | 11.4 | 1.7 (0.0) |
| phone viewport, 4x CPU slowdown | Rose Woods | before | 59 | 16.8 ms | 1 % | 6.1 | 62.7 (62.7) |
| phone viewport, 4x CPU slowdown | Rose Woods | after | 36 | 50.0 ms | 54 % | 12.8 | 12.1 (2.0) |
| phone viewport, 4x CPU slowdown | The Angle | before | 60 | 16.8 ms | 0 % | 2.8 | 5.0 (5.0) |
| phone viewport, 4x CPU slowdown | The Angle | after | 36 | 50.0 ms | 48 % | 16.7 | 11.4 (4.8) |
<!--/THROTTLE-->

Under a 4x CPU slowdown (a harsh stand-in for a mid phone, not a phone) the Studio runs at 24 to 38 fps in these dense scenes where the reproduction still runs at 38 to 60, because the reproduction omits production's own React, Mapbox and compositing cost, so this table is **not** a statement about the production page's speed (research report 01 measured 13 to 15 fps for it under the same slowdown). The Studio's engine time is about half solve and 40 percent display layer (4.3 ms per frame at 1x, 20.5 under the slowdown, measured at The Angle at zoom 15), and the page adds a tile draw of 2.3 ms (14.5 ms under the slowdown); the automatic solve cadence already skips solves when frames run long. A tile sprite cache or a lower-resolution draw on slow devices is the next lever and is not built (decision D-8).

Eight consecutive frames of one tile, before above after, from the real page (`../shots/prototype/strips/`, made by `test/strips.mjs` and `test/strips-compose.py`; the tile is chosen by a rule from the data, not by eye): a single-frame step of 51 to 77 px in the before (a hold-then-jump at Rose Woods and The Angle, a relaxation shuffle at Cemetery Hill), a smooth move or none in the after.

### 4.2 What assembling found and fixed (all reproducible)

Running the Studio the way a viewer does (paused, camera still; the showcase's hotspots) exposed three defects that no earlier test could see, because the metric that was meant to see them was blind to them:

1. **An aggregate hopped when it gained or lost a member.** A merged tile stands on the centroid of its members; the display layer smoothed only the *offset* from that anchor, so when a regiment joined or left an aggregate that kept its identity, the centroid jumped (up to 116 px in one frame at zoom 14) and the tile with it. The old "pop" metric measured the offset from the anchor and counted the jump as "the unit's own motion". Fix (`scene/display.mjs`, *anchor continuity*): the part of the anchor's change that the common members' own motion does not explain is absorbed into the offset, so the tile stays where it was drawn and glides (or travels, dimmed, when the way is longer than the budget) to its new place. New metrics (`metrics/metrics.mjs`) measure the **map-fixed step** of every tile, so a unit that hops *with* its true position (hold-then-jump keyframes) and an aggregate whose anchor jumps are both seen on the scale of the Before view; the old pops now subtract the absorbed jump explicitly.
2. **A still picture never stood still.** The sticky split trials formed limit cycles (a split succeeds, the neighbours that had been pushed away relax into the space it freed, the new tiles no longer fit, they merge again, the timer starts the next trial): The Angle at zoom 14 changed its set of aggregates 392 times in a minute with nothing moving. Fixes (`layout/engine.mjs`): a **rest latch** (a split is tried only when the neighbourhood of the aggregate has changed since it formed), a **split look-ahead** (a successful trial is kept only if the group also fits from the true anchors, i.e. once the neighbours have settled), an **exponential backoff** for a cluster that cannot hold its split (the dwell, then 2x, 4x, up to 20 s) and a **target hold** (a settled tile keeps the same target instead of creeping along an obstacle's edge by thousandths of a pixel).
3. **Touching tiles vibrated for ever.** The pushing step used the clearance plus 0.25 px while the solver certifies exactly the clearance, so every settled pair was pushed apart by the display layer and pulled together by the glide, frame after frame: 150 to 200 tiles per scene never reached rest and the engine never went idle. Fix: the pushing gap is the solver's own, tiles within a quarter pixel of their target and nearly still are *at* it, and the engine keeps stepping for 100 frames after the set of aggregates last changed (longer than the longest wait before a split trial) and then goes idle.

<!--FIXES-->
Playback at 4x, 8 s at 60 fps, popups off (sudden = a step of 8 px or more that is at least 3 times the same tile’s step in the frame before; solid = the tile is solid in both frames):

| scene | sudden steps per s | of them solid | largest one-frame step |
|---|---:|---:|---:|
| The Angle, zoom 14 | 3.00 -> **0.88** | 0.63 -> **0.00** | 149 px -> **25 px** |
| Rose Woods, zoom 14 | 3.63 -> **0.75** | 1.50 -> **0.00** | 134 px -> **24 px** |
| Cemetery Hill, zoom 14 | 2.75 -> **0.25** | 1.25 -> **0.13** | 37 px -> **16 px** |
| whole field, zoom 13.5 | 1.50 -> **0.13** | 1.25 -> **0.00** | 42 px -> **18 px** |
| The Angle, zoom 15 | 2.38 -> **0.63** | 0.63 -> **0.00** | 258 px -> **105 px** |

A paused picture with the camera still, over 60 s (after its first 5 s):

| scene | aggregate-set changes | largest step of any tile | engine idle after |
|---|---:|---:|---|
| The Angle, zoom 14, tick 556 | 392 -> **0** | 36.45 px -> **0.00 px** | never -> **100 frames** (the 100-frame settle window) |
| whole field, zoom 13.5, tick 620 | 44 -> **0** | 21.75 px -> **0.00 px** | never -> **100 frames** (the 100-frame settle window) |
| Cemetery Hill, zoom 14, tick 346 | 293 -> **0** | 37.32 px -> **0.00 px** | never -> **100 frames** (the 100-frame settle window) |
| The Angle, zoom 15, tick 551 | 0 -> **0** | 0.23 px -> **0.00 px** | never -> **100 frames** (the 100-frame settle window) |

*(left of the arrow: display layer, layout solver and strategy module as committed before the assembly, `7e55509`; right: now; same engine, metrics and scenes otherwise; `results/assemble-fixes.json`, `test/fixes-before-after.mjs`.)*
<!--/FIXES-->

Regression tests: `test/assemble.test.mjs` (a paused picture comes to rest in under 3 s and never changes again, in six scenes; pausing a running battle comes to rest; the monkey test also switches `compare.mode`), `test/display.test.mjs` (teleports now counted on the absorbed-jump-corrected offset). Left as measured, not fixed: at 4x about 10 dimmed glides per second remain in Rose Woods (1 to 7 in the other places; 0.4 to 5 at 1x; decision D-3), and the clearance counter of the engine's verifier still sees 0.2 to 1.0 non-overlapping pairs per frame closer than 1.95 px during motion (never an overlap).

## 5. Extending it

Everything below is exercised in `test/extend.test.mjs`, which is the worked example. The page registers what is listed in `src/skins/index.mjs`, `src/popups/index.mjs` and `src/fx/index.mjs`: **adding a module = one import and one array entry there, then `node build.mjs`**. `src/skins/_template.mjs` is a complete minimal skin to copy (the tests run the conformance check on it) and `src/popups/_template.mjs` a complete minimal popup (a card for each chronology event that stays for reading time in wall-clock seconds instead of ticks, is placed on free ground and falls back to a chip; tested).

- **A skin** (how a tile looks): `kernel.skins.register('my-skin', { footprint?, fonts?, draw: { tile, label?, pin?, leader?, hull? }, legend? })`. `skins/contract.mjs` documents the contract: draw a box centred on (0,0), size `t.w x t.h`, nothing outside it, a 2 px ring reserved for selection. **Run `checkSkin(skin, spec, tiles, textModel)` in your skin's test**: it records the ink of every draw call and fails when a tile paints outside its footprint (the layout guarantee is about that box). A different `footprint` (chip height, glyph width ...) simply changes how much aggregates; the guarantee holds for any footprint. A skin that declares `fonts` makes the layout measure those fonts. Honesty rules a skin keeps: every channel it draws is backed by a field of the tile; Modelled must not look Documented; side `unknown` must not look like a side; an aggregate shows its count.
- **A popup**: `kernel.popups.register('my-popup', { update(frame, api) -> cards, rows?, preview?, toolbar? })`; a card is data (a content model, a ladder of forms, subjects, reading time), and the **Overlay Director** (`popups/host.mjs`) places it on free ground beside what it is about, joins it to its subject by a leader line drawn beneath the tiles, times it by reading time, queues and demotes it, docks long reading in a rail that makes the map smaller, and never covers a tile (checked on every frame of every popup tick, in node and in real Chrome). The whole contract, the twelve popups, their dials and how to add one: `src/popups/README.md`; the worked example is `src/popups/_template.mjs` with `test/extend.test.mjs` and `test/popups.test.mjs`.
- **An effect**: `kernel.fx.register('my-fx', { update(frame, engine), draw(ctx, frame, env) })`, drawn between the backdrop and the tiles.
- **A layout strategy** (`layout`): `{ create(ctx) -> { solve(input) -> { placed, items, ... }, reset(), feedback(), refresh()? } }`. **A motion mode** (`motion`): `{ create(ctx) -> { step(layoutResult, input) -> frame, reset() } }`. **A motion model** (`interp`): `{ build(keyframes, opts) -> { at(tau, out) } }`. Select any of them with a token.
- **A dial**: add a row to `tokens/make-tokens.py` (or edit `tokens/tokens.json` by hand), read it with `tok('group.name')`, run `node build.mjs`. `test/tuning.test.mjs` fails on a token that is read but not defined, defined but never read, out of range, undocumented or without an evidence label; `tokens/tokens.schema.json` (JSON Schema of an exported settings file) is generated from it. The Tuning Studio builds its sliders, selects and toggles from the same file, exports and imports settings (`battle-studio-settings/1`), and import reports what it applied, rejected and did not know.

## 6. Commands

```
node --test "docs/pitch/anim/prototype/test/*.test.mjs"      all 163 tests (about 4 min)   FULL=1 adds the exhaustive layout sweep (about 3 min)   FUZZ_SEEDS=30 FUZZ_ACTIONS=500 for a long monkey run
node docs/pitch/anim/prototype/build.mjs [--data] [--check] [--min]   dataset (--data) -> tokens.schema.json -> battle-studio.html
node docs/pitch/anim/prototype/test/verify-sweep.mjs [--viewport=390x844 --dpr=2]      real Chrome: zero-overlap sweep, styles x zooms x ticks, independent brute-force check -> results/assemble-sweep-*.json
node docs/pitch/anim/prototype/test/verify-pacing.mjs [--cpu=4] [--viewport=390x844]    real Chrome, real time: before vs after on the same ticks (fps, steps, jumps, overlaps) -> results/assemble-pacing-*.json
node docs/pitch/anim/prototype/test/verify-memory.mjs [--runs=3]                        real Chrome: the Showcase in real time, heap after forced GC, 110 switches -> results/assemble-memory-*.json
node docs/pitch/anim/prototype/test/assemble-interact.mjs [--viewport=390x844 --dpr=2]   real Chrome, real clicks and keys: 33 checks desktop, 26 phone -> results/assemble-interact-*.json
node docs/pitch/anim/prototype/test/fixes-before-after.mjs                              the three engine fixes, measured against the commit before the assembly -> results/assemble-fixes.json
node docs/pitch/anim/prototype/test/strips.mjs && python docs/pitch/anim/prototype/test/strips-compose.py     eight-frame strips -> ../shots/prototype/strips/
node docs/pitch/anim/prototype/test/assemble-shots.mjs                                   pictures of every showcase step, desktop and phone -> ../shots/prototype/assembled/
node docs/pitch/anim/prototype/test/assemble-report.mjs                                  rewrites the measured tables of this README from results/*.json
node docs/pitch/anim/prototype/test/browser-check.mjs --scene=fresh2 --zoom=15 --speed=4 --secs=6 [--cpu=4] [--viewport=390x844 --dpr=2]   real Chrome: errors, requests, fps, metrics
node docs/pitch/anim/prototype/test/browser-interact.mjs     real Chrome: click, keys, wheel, drag, scrubber, tuning, export/import, metrics, phone, reduced motion (the earlier shell)
node docs/pitch/anim/prototype/test/soak.mjs [--secs=100]      real Chrome soak: heap after forced GC, frame pacing, guarantees
node docs/pitch/anim/prototype/test/bench.mjs                motion matrix -> results/motion-matrix.json
node docs/pitch/anim/prototype/test/trace.mjs                jitter trace -> shots/jitter-trace.svg
node docs/pitch/anim/prototype/test/shots.mjs                screenshots of nine fixed states -> shots/
```

## 7. Files

`battle-studio.html` the built page. `build.mjs` bundler (acorn; strict by design: no default exports, re-exports, circular imports, `import.meta` or node imports in the browser graph; it fails the build on any URL, `fetch` or external resource). `data/` the dataset and the code that builds it from the repo's data files (`loader.mjs` is a verbatim copy of the layout lab's loader), the measured text-width table. `tokens/` the dials. `src/` the engine: `kernel/`, `time/`, `interp/`, `data/`, `geo/`, `layout/` (ported from `layout-lab` with the changes listed in the file headers), `scene/` (engine, display, modes), `skins/`, `popups/`, `render/`, `tuning/`, `metrics/`, `ui/`, `app.mjs`. `test/` tests, browser drivers, bench, trace, screenshots. `results/`, `shots/` the committed evidence.

Changes to the lab's solver code, all measured against a fingerprint of 30 real frames (identical output) except the first: aggregates are a pure function of their leaf set; numeric spatial-hash keys; a fast path when the desired centre is free; solver offsets are copied rather than aliased; time-based dwell and delays.

Added by the assembly: `src/styles/` (the Style presets), `src/tours/` (`library.mjs` the tours as data, `director.mjs` the runner, `actions.mjs`, `report.mjs` the before/after report), `src/ui/narration.mjs` (the caption card), `src/ui/studio.mjs` and `studio.css` (the chrome, rewritten as one design system), the production reproduction (`src/interp/production.mjs`, `src/layout/production.mjs`, `src/scene/production.mjs`, `src/skins/production.mjs`, the `production` clock in `src/time/transport.mjs`, the compare override in `src/scene/engine.mjs`), the absolute-step metrics in `src/metrics/metrics.mjs`, and the tests and drivers listed in section 6 (`test/assemble.test.mjs`, `test/production.test.mjs`, `test/assemble-lib.mjs`, `test/verify-*.mjs`, `test/assemble-*.mjs`, `test/strips*.{mjs,py}`, `test/fixes-before-after.mjs`). Evidence: `results/assemble-*.json`, `../shots/prototype/assembled/`, `../shots/prototype/strips/`.

## 8. Findings to hand on, and decisions that are the owner's

Found while building (all reproducible):
1. The layout lab's nested aggregates were anchored, weighted and prioritised differently from their flat re-creation, so every cold solve was not a fixed point (up to 67 px of tile movement on the first re-solve with identical input). Fixed here; the lab and `06-layout.md` still describe the old behaviour.
2. In this prototype's own first display layer, a layout tile born with the key of an aggregate that had been matched to another key replaced the matched tile and orphaned two units for one frame. Found by the unrepresented-units metric at 16x; fixed (unique display keys), covered by a regression test over all three motion modes.
3. Data for the data track: 10 `U-` ids with Confederate state codes (Contested), 95 ids with no complete order-of-battle parent, 73 repeated (unit, tick) rows that disagree, 8 places whose position differs by 166 to 733 m between the legacy and production `terrain.json`, `Gulp's Hill saddle` (typo). None of it is hidden here; all of it is labelled.
4. Found while assembling (section 4.2, all with before and after numbers): aggregate tiles hopped by their centroid's jump when a member joined or left; a still picture never stood still (limit cycles of the sticky split trials, up to 392 aggregate-set changes a minute; tiles vibrating by sub-pixel amounts so the engine never went idle); the old pop and teleport metrics were blind to both. Fixed in `scene/display.mjs` and `layout/engine.mjs`; `06-layout.md` and the lab's solver still describe the old behaviour.
5. The production reproduction reproduces report 01's whole-battle replay to the unit (833 hops in 159 frames, 66 snap-backs, 407 one-frame absences), which also confirms that report's numbers independently of its harness.
6. The monkey test now treats `compare.mode = before` as the production renderer (it overlaps by design) and checks every other invariant in both modes, and the Studio's guarantees on every frame after a switch back.

Decisions (each is a dial, none is made for the owner):
- **D-1 Visibility rule** (`layout.visibility`): carry-forward is the site's rule and the default here; it puts a typical 384 tiles on the map and most are old keyframes (the outline channel shows their age). `window` (about 44 tiles) and `snapshot` (about 7) claim less and aggregate less.
- **D-2 Motion model** (`interp.model`): monotone cubic (default; as asked) leaves the straight chord between two keyframes by a median 0 m, p90 49 m and at most 391 m on the real data (measured in `test/interp.test.mjs`); `chord-smooth` keeps the exact geography and only smooths the speed.
- **D-3 Is a dimmed glide acceptable?** A lone tile that must cross a neighbour dims to 0.42 for about 150 ms and stays visible. The opacity rule (06) allows it; if it is not acceptable, raise `motion.travelPx` (fewer travels, more pops) or use `snap`.
- **D-4 Displacement budget** (`layout.dMaxPx`, default 48 px): 0 makes the same engine pure aggregation, the stance of 03-data-fuel.md.
- **D-5 Backdrop**: the production page uses Mapbox; this prototype's schematic grid is not terrain, and tile legibility on real map tiles still has to be checked by the skins.
- **D-6 Default style and the welcome card**: the page opens in War Room (dark ground) with a welcome card; Field Manual and 1863 Map are one click away and the choice is remembered. The first visit's choice of War Room is a taste decision, not a finding.
- **D-7 Is the Before view part of a product?** It is a research view, hidden from the Tuning Studio's lists and reachable by the Before button, `B`, `?compare=before` and the tours. A product would keep it behind a flag or drop it once the comparison has served.
- **D-8 Weak devices**: under a 4x CPU slowdown the Studio runs at 25 to 37 fps in dense scenes (section 4.1). A tile sprite cache, a draw cadence or a lower-resolution draw would buy the rest; none is built, and which trade (sharpness, motion, battery) to make is the owner's.

## 9. Not verified

- Integration into the product bundle (by design: nothing outside `docs/pitch/anim/prototype` was touched; 05-architecture.md describes the patch group this engine would feed). The reference skin draws on Canvas2D; the WebGL sprite renderer of 05 is a skin/renderer concern and is not built here.
- A real phone: the phone numbers are a CPU-throttled laptop. One machine and one GPU were measured.
- Text widths are measured in the running browser at start-up (`measureTable`); the committed table was measured in Chrome 155 on Windows (Segoe UI) and is used by node tests and as a fallback. A font that renders wider than it measured is the one thing that could push ink outside a chip box.
- The tick-to-clock map is a candidate; every clock statement inherits that.
- The accessibility work is basic (labelled controls, keyboard operation, reduced motion, live canvas label); no screen-reader pass was done.
- The assembled page was measured on one machine, one GPU and one browser (Chrome 155 on Windows, headless, real GPU path); the phone runs are device emulation (viewport, touch, DPR 2, CPU slowdown), not a handset. Firefox, Safari and Edge were not run.
- The production reproduction omits the hit flash, the trail canvas, the fps text and the cannon sound, draws at the device pixel ratio, reconstructs the unit iteration order and does not reproduce production's own React, Mapbox and compositing cost: compare motion and overlap with it, never speed.
- The captions and the 60-second script were checked for facts by tests (counts from the data, numbers from the recorders, the 833 asserted against the replay) and read by the author of this page; no historian read them, and every clock statement inherits the unsigned candidate clock.
- The pictures in `../shots/prototype/assembled/` and `strips/` were looked at by the author; no one else has reviewed the design.
- Frame pacing was measured, not tuned for a 120 Hz display or a variable refresh rate.
