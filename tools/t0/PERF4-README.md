# PERF4 - phone blocking time of the app route (group PERF4 + page group PG-zperf4, train R1e)

Registered in train R1e (`trains.json`; `python tools/t0/r1e_sync.py` copies `patches-next/PERF4.json` and `PG-zperf4.json` to `patches/`; both are written by `python tools/t0/perf4/gen_perf4.py`, which checks every anchor against `release/R1d/dist` and is the place to read the notes of each patch).
Tests: `tests/t0/perf4.spec.mjs`. Measurements and the story of what was tried: `docs/accept/PERF4-NOTES.md`. Decisions taken without the owner, with the way back: `docs/decisions/R1E-PROVISIONAL-DECISIONS-2026-10-22.md` (section PERF).

## The problem

Acceptance check 5 (`tools/accept/checks/c5_perf.mjs`) counts, on every route, the long tasks (> 50 ms) between the first contentful paint and three seconds after `load`, on a phone (390 x 844, touch, CPU 4x): their excess over 50 ms must add up to at most 200 ms.
On the R1d build `/` measured 350 to 700 ms (interleaved medians 425 to 575 on the shared machine of the round, minimum 321), the published build about the same; `/ground-remembers` 200 to 230. The first paint (the static splash) comes at about 350 ms, so everything the app does afterwards counts.

## What the time was (profile of `/` on R1d, phone 4x, one cold load)

| task (ms) | what | excess |
|---|---|---|
| 106-132 | the map library (mapbox-gl 3.24.1, 1.7 MB inside the entry bundle): one synchronous call of its UMD wrapper | 56-82 |
| 98-126 | the first layout of the app (100 dirty objects), 60 ms of it first-use shaping of the system faces | 48-76 |
| 51-58 | React render | 1-8 |
| 117-143 | `new Map()` (painter 30-45, resize 15, style 11, container 10) + the other effects of the same flush | 67-93 |
| 104-190 | style load (45-60) + first render (60-70) + the card placer of BASE1863 (40-60): THREE animation-frame callbacks of one frame | 54-140 |
| 124-150 | the map's 'load' event inside a render: T4 (roads, rivers, breastworks, farms: 36-45 ms) + days 2 and 3 (about ten fetch calls, 25 ms) + raster program link | 74-100 |
| 70-90 | the engine's first frame: dataset 24 ms + engine 45 ms | 20-40 |
| 70-108 | a render with a line-program link (16-27 ms), Mapbox's performance event (15-23 ms), the second symbol placement | 20-58 |
| 57-75 | the engine's cold layout, a slice | 7-25 |

Mapbox's own work was 62 percent of the excess. The rest was ours or the browser's.

## What PERF4 does (12 bundle patches, 2 page patches; each patch carries its measurement in its `note`)

Page (`PG-zperf4`, `index.html`):
* **PERF4-index-frame-governor.** For the first 6 s of the page the animation-frame callbacks of one frame share a 20 ms budget: a callback that finds the budget spent waits for the next frame (at most two frames; order kept; `cancelAnimationFrame` works on the ids handed out; after 6 s the page's own `requestAnimationFrame` is used untouched). Three callbacks of 45 + 60 + 40 ms that were one 150-190 ms task are three tasks of 40-70 ms.
* **PERF4-index-glyph-warm-early.** PERF2's glyph warm (a detached canvas measures the toolbar and Tools glyphs) moves from 3.2 s after load to the start of the page, cut into 26 tasks (one face or a few glyphs each, 10-60 ms at 4x). The first layout of the app (98-126 ms) is 50-60 ms, its first-use shaping already done. The warm also shapes the strings of the phone's Tools sheet (read from the DOM of the open sheet, 12 faces/strings): the first open of the sheet was 240-264 ms by Event Timing at 4x (the second open 64-120) and is 120-144 ms (n=6 interleaved), the INP-relevant cost of the sheet being first use of its faces and words. The same trick with generic text for the story and event cards did not change the first date-jump tap and is not shipped.
* **The card warm-up (inside PERF4-index-glyph-warm-early, phone only).** 3.3 s after load, at idle, an element with `data-gta="warm"` (the animation layer's card style matches it) is shown at opacity 0.01 for three frames and removed. It moves the first-use rendering of a card (about 100 ms of GPU raster that the first frame after the first day jump waited for) out of the tap: event time of the first tap on July 2 144-232 ms -> 64-96 ms. 0 differing pixels at six widths. Test T0-P4-11. Decision R8.

Bundle (`PERF4`):
* **PERF4-mapbox-umd-async-head / -main / -await.** The map library's UMD factory is made async with a timer turn between its three steps (shared chunk, main chunk, worker blob) and the module awaits its exports. One call of 105-132 ms becomes three tasks of 25-66 ms; the statements and their order are unchanged. `mapboxgl.prewarm()` (the shared workers, 10-20 ms) runs in a task of its own after PERF3's timer turn.
* **PERF4-T4-slices.** The product's own sources and layers are added in four timer tasks (roads; rivers; breastworks and farms; refine + precompile) instead of 36-45 ms inside the render that fires 'load'. On a BASE1863 tree the values that `refine()` sets later (the two line layers hidden, the sort key of the road labels) are part of the layer definitions (`bake_refine` in `gen_perf4.py`): a `setLayoutProperty` on a layer of a source that is already loading reloads it and Mapbox then lost the symbol bucket of the road labels in about a third of the loads (test T0-P4-10, decision R5 of REDS-A).
* **PERF4-phone-days-idle.** Days 2 and 3 are requested when the main thread is idle (at the latest 2.5 s after the load event) instead of inside the 'load' handler; the engine's prefetch asks for them at 1.5 s anyway and a jump to a day loads it first.
* **PERF4-anim-swatch-canvas.** ANIM's legend draws each swatch on a 54 x 36 canvas and reads it back with `toDataURL`; on the desktop shell the canvas was GPU-backed and every swatch was a synchronous GPU readback (5 of them, 34 ms of an 82 ms legend build: one task of 106 ms in the engine's first frame at 1x). `willReadFrequently: true` gives a CPU-backed canvas: same pixels (0 differing at six widths), no readback; desktop blocking time of `/` 92 -> 45 ms in the profile run (pass 701 measured desktop 119 before it).
* **PERF4-anim-dataset-split.** ANIM builds its dataset in its first frame and the engine in the next (the existing `later()` turn).
* **PERF4-precompile-at-style-load (+ -desktop, -phone).** When the main map's style has loaded (before its first render) Mapbox's own program precompiler is asked for the programs of the layers that exist then (background, raster, clipping mask), so the GPU process links them while the main thread goes on. Needs KHR_parallel_shader_compile, otherwise it does nothing.
* **PERF4-precompile-phone (second half).** The label placer attach, the two gesture switches and the attribution control (15-20 ms) are set up in the next timer turn after the map is made.
* **PERF4-no-perf-metrics-desktop / -phone.** `performanceMetricsCollection: false` on the two main maps (a documented Mapbox map option, default true): the map no longer gathers every resource and mark timing of the page into a performance event for Mapbox when it has fully loaded (16-23 ms in one render task). Billing events (map load, session) are not part of it. Decision R1E-P4 in the decisions file; way back: delete the two patches.

## Results (phone 390 x 844, CPU 4x, cold; interleaved cold loads; the machine was shared with the other agents, so the minimum is the best estimate of a quiet machine)

| route | R1d median (min) | R1e median (min) | n |
|---|---|---|---|
| `/` | 424 (335) | 129 (91) | 8 (quiet window); earlier runs 425-575 -> 120-226 |
| `/ground-remembers` | 211-231 (146-181) | 168 (136-204) | page untouched; 3 to 6 per cell |
| camera / compare / watch-together | 91-134 / 76-114 / 75-82 | 77 / 47 / 45 | pages untouched; differences are noise |
| immersive / sandbox / viewshed / cinematic-export | 23-37 / 31-74 / 42-57 / 44-83 | 16 / 27 / 22 / 19 | pages untouched |

Acceptance check 5 (`tools/accept`, route `/` only, soak 600 s, pass 701): 0 defects: phone TBT 125 ms (FCP and LCP 344), desktop TBT 119 (before the swatch patch), frames 60 fps p95 16.8 ms at 1x and 4x on both shells, no long task during playback, INP desktop 152 / phone 176, heap +6.68 percent in 600 s (23.6 -> 25.2 MB, DOM nodes 929 -> 934). Pass 703 (all routes, final candidate): see `docs/accept/PERF4-NOTES.md` section 10.

## What was tried and dropped

* **Holding the first paint of `/` until the map library has run** (the hold PERF3 gave the eight map pages) together with importing the entry at once: measured -40 ms more (median 208 against 226 on the shared machine), but `tests/t0/r0.mjs` (perf-cwv-02) asserts that the entry module starts after the first contentful paint, and the brief for this round says the first paint comes first. Dropped; the async UMD factory gives most of the effect without moving the paint.
* The same helpers on the map sub-pages (performanceMetricsCollection off on all eight, `mapboxgl.prewarm()` and the precompile at style load on camera / sandbox / cinematic-export, the heat layer of `/ground-remembers` in a task of its own): interleaved n=5-6 the differences were inside the noise (ground-remembers: R1d median 231, with the heat task 222, with the option 245, with both 205; camera 91 against 138); not shipped, a patch needs a measurement. The pages are untouched by PERF4.
* React `startTransition` for the first render: the render is 51 ms, nothing to cut.
* A throw-away WebGL context during the splash (to warm the GPU channel): the map constructor did not get faster.
* Skipping style validation by `validate:false`: the option does not reach the style's `loadJSON` from the Map constructor; patching the library for 10 ms was not worth it.
* `raster-fade-duration: 0` and removing the background layer would cut render work and change what the visitor sees: not done.

## Not done / what remains

See the end of `docs/accept/PERF4-NOTES.md`: the map constructor (about 100 ms at 4x), the style load and the first render are single calls inside Mapbox GL and are what is left of the app route; `/ground-remembers` loads a 50-layer vector style (`dark-v11`: 106 ms of layer creation at 4x and 63 ms of vertex-buffer upload in two single calls inside Mapbox GL; median 205-275 ms, minimum 146-181 on the shared machine; only a lighter style or holding its first paint would get it clearly under 200, both are owner decisions).

## Build and prove

```
python tools/t0/perf4/gen_perf4.py          write patches-next/PERF4.json and PG-zperf4.json (anchors checked against release/R1d/dist)
python tools/t0/r1e_sync.py                 copy them to patches/ (registered copies; --check proves they are in step)
python tools/t0/build.py --train R1e --out tmp/r1e/r1e
node tests/t0/perf4.spec.mjs --dist tmp/r1e/r1e/dist --control release/R1d/dist
node tmp/r1e/tbt.mjs 8 app r1d=release/R1d/dist r1e=tmp/r1e/r1e/dist     interleaved cold loads, phone 4x, TBT as the harness counts it (scratch tool, tmp is git-ignored)
```
