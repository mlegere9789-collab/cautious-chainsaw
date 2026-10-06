# Battle Studio: the shared animation engine (prototype)

One self-contained page, `battle-studio.html` (about 700 KB, readable source, **no network request of any kind**), and the engine behind it. It is the shared base for the three tile-design pitches and for the popup work: they register a skin, a popup, an effect, a layout or a motion model **by name** and tune everything from one JSON file in a live Tuning Studio. It touches no product file; it reads the real data and says what each thing on screen is.

Open the file in Chrome, Edge or Firefox. `?tune=1` opens the Tuning Studio, `T` toggles it, `M` the live metrics, `I` the inspector, `A` the legend and honest limits. Space plays, arrows step (Shift = one hour), `[` `]` change speed, wheel zooms under the pointer, drag pans, click selects. Other URL parameters: `?scene=fresh2|carry1|field|...` `?tick=` `?zoom=` `?speed=` `?play=1` `?skin=` `?mode=` (display dynamics) `?layout=` `?vis=carry|window|snapshot` `?backdrop=paper|ink` `?fresh=1` (ignore saved settings) `?set={"layout.dMaxPx":24}` (any dials).

## 1. What is real, and what is not

| On screen | Source | Label |
|---|---|---|
| 478 units, 1,687 placement keyframes (1,804 rows; the shipped last-row-wins rule) on 188 of 675 ticks, order-of-battle chains | `baseline/dist/data` (production data), copied verbatim into `data/dataset.json` with the SHA-256 of every source file | positions and strengths **Modelled** (hand-authored, no basis field); identity **Documented** |
| Motion between keyframes | monotone cubic interpolation of those keyframes | **Modelled** |
| Clock beside the tick | the 33-anchor candidate clock (`data-src/time/time_anchors.json`), all anchors "proposed" | **Modelled**, always shown as "about ... (± n min) candidate clock" |
| Side of 10 units whose id prefix says Union but whose state code is Confederate (`U-26NC` ...) | 03-data-fuel.md | **Contested**: drawn as amber stripes, never as Union or Confederate |
| Aggregate counts (`x5`), tile ages, scenes | computed here | **Computed** |
| Backdrop | a metric grid and the 30 place marks of `terrain.json` | **schematic, not terrain**; Mapbox tiles are token-restricted |

The whole battle is inlined (the brief allowed a window of ticks around the hotspots): the placements are only about 450 KB in this form, and a window would have cut the carried-forward history that the visibility rule needs.

The place marks follow the frame of the placements (legacy `terrain.json`). Production `terrain.json` puts 8 of the 30 places 166 to 733 m elsewhere (computed in `data/build-dataset.mjs`, stored in the dataset); those 8 are drawn dashed and which frame is right is **Unknown**. `Gulp's Hill saddle` is shown as `Gulp's Hill saddle [sic]`: the source record's own text says Culp's Hill.

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

## 3. The guarantees, and what checks them

1. **No two solid items of different tiles overlap, on any displayed frame.** The certified layout guarantees it for the solved frame (`layout/engine.mjs`); the display layer then moves tiles continuously, which no longer has a proof, so **every displayed frame is re-verified by the independent verifier** (`layout/geom.mjs`, shares no code with the solver) and any remaining overlap is repaired by dimming the lighter tile below 0.5 (the opacity rule, 06-layout.md 6.4). The guarantee therefore never depends on the glide being right; the glide only decides how often the repair is needed.
2. **Every unit on the field is represented by exactly one live tile** (a tile or an aggregate that lists it).
3. **No tile sits farther than the displacement budget from its true position, and no chip covers another tile's true position** (pins).
4. The picture is a pure function of the inputs: same frame times, same pixels (bit-identical, tested).

Measured with `node --test "docs/pitch/anim/prototype/test/*.test.mjs"` (`FULL=1` for the exhaustive sweep):

- **4,725 cold solves** (all 675 ticks x zoom 11..17, carry-forward = the worst case): **0 overlapping pairs, 0 clearance violations, 0 unrepresented units, budget kept**; 1,576,932 unit-placements represented; slowest solve 124 ms (run on the final code, 3 min 13 s; the default `node --test` re-checks 242 solves plus 600 warm playback frames).
- Playback of the six hardest scenes at 1x to 16x, with irregular frame times (5 to 45 ms), seeks, cuts, zoom animation, mode switches and reduced motion: **0 overlapping frames, 0 unrepresented units**.
- A seeded **monkey test** (`test/fuzz.test.mjs`) drives the whole API with random play, pause, speed, seeks (glided and not), zoom, pan, selection, viewport sizes, scene jumps and random legal values of every dial, and checks on every frame: no exception, no overlap, no lost unit, unique keys, finite numbers, no tile stuck dimmed. A 30-seed run of 500 actions each (15,000 random actions, 11.8 min) passed on the code before the last guard was added, and 12 seeds x 500 actions (3.6 min) pass on the final code including the stuck-tile check; the default `node --test` runs 3 seeds x 220 actions.
- The checkers are themselves checked: the verifier equals a brute force on 3,000 random sets and catches injected overlaps; `nearestFree` equals a fine brute-force scan on 150 scenes; a negative control (net off, pushing off) shows overlaps appear without the safety net.

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
| 1x | layout as solved (snap) | 395.5 | 19 | 8.25 | 75.17 | 0.01 | 0 | 0 | 0 | 0 |
| 1x | glide only (spring) | 395.8 | 0 | 0 | 2 | 0.02 | 4.75 | 10.63 | 0 | 0 |
| 1x | **glide + pushing + travel (default)** | 395.5 | 0.63 | 0 | 7.07 | 0.06 | 5 | 1.88 | 0 | 0 |
| 4x | layout as solved (snap) | 400.7 | 59.13 | 19.25 | 86.55 | 0.18 | 0 | 0 | 0 | 0 |
| 4x | glide only (spring) | 398 | 0 | 0 | 2.77 | 0.05 | 7.13 | 12.75 | 0 | 0 |
| 4x | **glide + pushing + travel (default)** | 400.7 | 13.63 | 0 | 11.03 | 0.15 | 10.5 | 5 | 0 | 0 |
| 16x | layout as solved (snap) | 397.5 | 73.88 | 21.88 | 86.34 | 0.14 | 0 | 0 | 0 | 0 |
| 16x | glide only (spring) | 399.5 | 0 | 0 | 2.67 | 0.05 | 8.25 | 9.75 | 0 | 0 |
| 16x | **glide + pushing + travel (default)** | 401.6 | 7.88 | 0 | 11.53 | 0.13 | 9.25 | 5.38 | 0 | 0 |
<!--/MATRIX-->

(pop = a tile that is solid in two frames and moves more than 3 px beyond its unit's own motion in one frame; teleport = more than 12 px; **snap** is the certified layout drawn as solved, the research lab's behaviour. A dimmed travelling tile is counted under "travels", it is not solid.) Honest reading: teleports are gone; what is left at 4x in the densest scene is a few smooth shoves per second and about ten dimmed glides per second (a lone tile at 0.42 opacity crossing a neighbour for about 150 ms), and the safety net dims a tile about five times per second. That is **not zero visual activity**; it is no hop, no overlap, no hidden unit, and every number is on screen in the metrics overlay.

Real Chrome 155 (headless, this machine, 10 s each, `test/browser-check.mjs`; the JSON of every run is in `results/chrome-*.json`): **60 fps, 0 frames over 20 ms, 0 overlaps, 0 unrepresented units, 0 console errors, 0 requests** on `fresh2` at 4x (about 400 tiles, engine 6.7 ms per frame), `evening1` at 16x (4.4 ms), `field` at 4x (478 units, 5.8 ms) and `carry1` at 1x (5.9 ms). Under a **4x CPU throttle** (a harsh stand-in for a mid phone, not a phone) the same page on `fresh2` runs at 27 fps with the automatic solve cadence solving 46 % of the frames, still with 0 overlaps and 0 unrepresented units; without the cadence it ran at 14 fps. A **100 s soak** (`test/soak.mjs`: the real frame loop at 8x, a scene jump every 30 s, 6,003 frames): JS heap flat at 22 MB after a forced GC at every sample (0.0 MB growth), 59.8 fps, 0.35 % of frames over 20 ms, 0 overlaps, 0 unrepresented units, 0 console errors. A real low-end phone was not tested.

## 5. Extending it

Everything below is exercised in `test/extend.test.mjs`, which is the worked example. The page registers what is listed in `src/skins/index.mjs`, `src/popups/index.mjs` and `src/fx/index.mjs`: **adding a module = one import and one array entry there, then `node build.mjs`**. `src/skins/_template.mjs` is a complete minimal skin to copy (the tests run the conformance check on it) and `src/popups/_template.mjs` a complete minimal popup (a card for each chronology event that stays for reading time in wall-clock seconds instead of ticks, is placed on free ground and falls back to a chip; tested).

- **A skin** (how a tile looks): `kernel.skins.register('my-skin', { footprint?, fonts?, draw: { tile, label?, pin?, leader?, hull? }, legend? })`. `skins/contract.mjs` documents the contract: draw a box centred on (0,0), size `t.w x t.h`, nothing outside it, a 2 px ring reserved for selection. **Run `checkSkin(skin, spec, tiles, textModel)` in your skin's test**: it records the ink of every draw call and fails when a tile paints outside its footprint (the layout guarantee is about that box). A different `footprint` (chip height, glyph width ...) simply changes how much aggregates; the guarantee holds for any footprint. A skin that declares `fonts` makes the layout measure those fonts. Honesty rules a skin keeps: every channel it draws is backed by a field of the tile; Modelled must not look Documented; side `unknown` must not look like a side; an aggregate shows its count.
- **A popup**: `kernel.popups.register('my-popup', { update(frame, api) -> cards, rows?, preview?, toolbar? })`; a card is data (a content model, a ladder of forms, subjects, reading time), and the **Overlay Director** (`popups/host.mjs`) places it on free ground beside what it is about, joins it to its subject by a leader line drawn beneath the tiles, times it by reading time, queues and demotes it, docks long reading in a rail that makes the map smaller, and never covers a tile (checked on every frame of every popup tick, in node and in real Chrome). The whole contract, the twelve popups, their dials and how to add one: `src/popups/README.md`; the worked example is `src/popups/_template.mjs` with `test/extend.test.mjs` and `test/popups.test.mjs`.
- **An effect**: `kernel.fx.register('my-fx', { update(frame, engine), draw(ctx, frame, env) })`, drawn between the backdrop and the tiles.
- **A layout strategy** (`layout`): `{ create(ctx) -> { solve(input) -> { placed, items, ... }, reset(), feedback(), refresh()? } }`. **A motion mode** (`motion`): `{ create(ctx) -> { step(layoutResult, input) -> frame, reset() } }`. **A motion model** (`interp`): `{ build(keyframes, opts) -> { at(tau, out) } }`. Select any of them with a token.
- **A dial**: add a row to `tokens/make-tokens.py` (or edit `tokens/tokens.json` by hand), read it with `tok('group.name')`, run `node build.mjs`. `test/tuning.test.mjs` fails on a token that is read but not defined, defined but never read, out of range, undocumented or without an evidence label; `tokens/tokens.schema.json` (JSON Schema of an exported settings file) is generated from it. The Tuning Studio builds its sliders, selects and toggles from the same file, exports and imports settings (`battle-studio-settings/1`), and import reports what it applied, rejected and did not know.

## 6. Commands

```
node --test "docs/pitch/anim/prototype/test/*.test.mjs"      all tests (85 tests, about 70 s)   FULL=1 adds the exhaustive layout sweep (about 3 min)   FUZZ_SEEDS=30 FUZZ_ACTIONS=500 for a long monkey run
node docs/pitch/anim/prototype/build.mjs [--data] [--check] [--min]   dataset (--data) -> tokens.schema.json -> battle-studio.html
node docs/pitch/anim/prototype/test/browser-check.mjs --scene=fresh2 --zoom=15 --speed=4 --secs=6 [--cpu=4] [--viewport=390x844 --dpr=2]   real Chrome: errors, requests, fps, metrics
node docs/pitch/anim/prototype/test/browser-interact.mjs     real Chrome: click, keys, wheel, drag, scrubber, tuning, export/import, metrics, phone, reduced motion
node docs/pitch/anim/prototype/test/soak.mjs [--secs=100]      real Chrome soak: heap after forced GC, frame pacing, guarantees
node docs/pitch/anim/prototype/test/bench.mjs                motion matrix -> results/motion-matrix.json
node docs/pitch/anim/prototype/test/trace.mjs                jitter trace -> shots/jitter-trace.svg
node docs/pitch/anim/prototype/test/shots.mjs                screenshots of nine fixed states -> shots/
```

## 7. Files

`battle-studio.html` the built page. `build.mjs` bundler (acorn; strict by design: no default exports, re-exports, circular imports, `import.meta` or node imports in the browser graph; it fails the build on any URL, `fetch` or external resource). `data/` the dataset and the code that builds it from the repo's data files (`loader.mjs` is a verbatim copy of the layout lab's loader), the measured text-width table. `tokens/` the dials. `src/` the engine: `kernel/`, `time/`, `interp/`, `data/`, `geo/`, `layout/` (ported from `layout-lab` with the changes listed in the file headers), `scene/` (engine, display, modes), `skins/`, `popups/`, `render/`, `tuning/`, `metrics/`, `ui/`, `app.mjs`. `test/` tests, browser drivers, bench, trace, screenshots. `results/`, `shots/` the committed evidence.

Changes to the lab's solver code, all measured against a fingerprint of 30 real frames (identical output) except the first: aggregates are a pure function of their leaf set; numeric spatial-hash keys; a fast path when the desired centre is free; solver offsets are copied rather than aliased; time-based dwell and delays.

## 8. Findings to hand on, and decisions that are the owner's

Found while building (all reproducible):
1. The layout lab's nested aggregates were anchored, weighted and prioritised differently from their flat re-creation, so every cold solve was not a fixed point (up to 67 px of tile movement on the first re-solve with identical input). Fixed here; the lab and `06-layout.md` still describe the old behaviour.
2. In this prototype's own first display layer, a layout tile born with the key of an aggregate that had been matched to another key replaced the matched tile and orphaned two units for one frame. Found by the unrepresented-units metric at 16x; fixed (unique display keys), covered by a regression test over all three motion modes.
3. Data for the data track: 10 `U-` ids with Confederate state codes (Contested), 95 ids with no complete order-of-battle parent, 73 repeated (unit, tick) rows that disagree, 8 places whose position differs by 166 to 733 m between the legacy and production `terrain.json`, `Gulp's Hill saddle` (typo). None of it is hidden here; all of it is labelled.

Decisions (each is a dial, none is made for the owner):
- **D-1 Visibility rule** (`layout.visibility`): carry-forward is the site's rule and the default here; it puts a typical 384 tiles on the map and most are old keyframes (the outline channel shows their age). `window` (about 44 tiles) and `snapshot` (about 7) claim less and aggregate less.
- **D-2 Motion model** (`interp.model`): monotone cubic (default; as asked) leaves the straight chord between two keyframes by a median 0 m, p90 49 m and at most 391 m on the real data (measured in `test/interp.test.mjs`); `chord-smooth` keeps the exact geography and only smooths the speed.
- **D-3 Is a dimmed glide acceptable?** A lone tile that must cross a neighbour dims to 0.42 for about 150 ms and stays visible. The opacity rule (06) allows it; if it is not acceptable, raise `motion.travelPx` (fewer travels, more pops) or use `snap`.
- **D-4 Displacement budget** (`layout.dMaxPx`, default 48 px): 0 makes the same engine pure aggregation, the stance of 03-data-fuel.md.
- **D-5 Backdrop**: the production page uses Mapbox; this prototype's schematic grid is not terrain, and tile legibility on real map tiles still has to be checked by the skins.

## 9. Not verified

- Integration into the product bundle (by design: nothing outside `docs/pitch/anim/prototype` was touched; 05-architecture.md describes the patch group this engine would feed). The reference skin draws on Canvas2D; the WebGL sprite renderer of 05 is a skin/renderer concern and is not built here.
- A real phone: the phone numbers are a CPU-throttled laptop. One machine and one GPU were measured.
- Text widths are measured in the running browser at start-up (`measureTable`); the committed table was measured in Chrome 155 on Windows (Segoe UI) and is used by node tests and as a fallback. A font that renders wider than it measured is the one thing that could push ink outside a chip box.
- The tick-to-clock map is a candidate; every clock statement inherits that.
- The accessibility work is basic (labelled controls, keyboard operation, reduced motion, live canvas label); no screen-reader pass was done.
