# PERF4 notes (progress file of the R1e PERF agent)

Tools of this work (scratch, `tmp/r1e/`, git-ignored): `tbt.mjs` (interleaved cold loads, phone 4x, blocking time as `tools/accept/checks/c5_perf.mjs` counts it: long tasks from the first contentful paint until 3 s after `load`; prints min / q25 / median / q75), `cats.mjs` (CPU profile of the start-up: every long task split by where its samples fall: Mapbox, React, ANIM, app, native), `tasks.mjs` (the same as a call tree per long task), `timeline.mjs` (trace of the main thread per task), `xp.py` (apply patch files to a copy of a dist for quick experiments), `sanity.mjs`, `order.mjs` (layer order), `shots.mjs` / `shots2.mjs` (screenshot compare), `inp.mjs`, `smoke.mjs`.
The machine is shared with the other agents of the round (126-145 Chrome processes, CPU load 20-100 percent from their suites): a single run of one page moves between 70 and 700 ms. Every comparison below is interleaved (variant A, B, A, B, ...) and repeated; min and median are given, a number alone means nothing. The minimum of eight is the best estimate of a quiet machine, the median of what a loaded one shows.

## 1. Baseline (R1d, release/R1d/dist) and the published build

* `/` phone 4x, interleaved n=8-9: R1d median 425-575 (min 321-420); the published build (baseline/dist) median 391 (min 318). So R1d was worse than the published build on `/`, not only at the limit of it: the claim "published about 210" of the R1d report was a quiet-moment sample.
* the other map pages on R1d, n=7 (quiet machine): camera 134, cinematic-export 44, compare 114, ground-remembers 228 (min 139), immersive 37, sandbox 31, viewshed 57, watch-together 75. Static routes 0.
* ANIM is not the cause: `/?anim=legacy` (the shipped renderer) measured the same or worse (563 and 569 against 507 and 476 in the same run).

## 2. What the 4x phone's start-up of `/` consists of (profile, R1d)

See the table in `tools/t0/PERF4-README.md`. Mapbox GL's own work was 62 percent of the excess over 50 ms per task (library evaluation 106-132 ms in one call, `new Map()` 117-143 ms, style load 45-60 ms, first render 60-70 ms, the 'load' event inside a render, the telemetry event 15-23 ms), 20 percent the browser's (the first layout of the app 98-126 ms with 60 ms of first-use font shaping), the rest ours (T4 36-45 ms inside a render, days 2 and 3 25 ms, ANIM's first frame 70-90 ms, a frame with three animation-frame callbacks 150-190 ms).

## 3. Experiments, cumulative, `/` phone 4x interleaved (medians; each line was measured against the line before in the same run)

| step | median | min | note |
|---|---|---|---|
| R1d | 542 | 414 | |
| + early sliced glyph warm + frame governor | 388 | 325 | first layout 98-126 ms -> 54-60 ms; three callbacks of one frame -> three tasks |
| + hold of the first paint until the library has run, import at once | 343 | 264 | DROPPED (see README: r0 test perf-cwv-02, the brief) |
| + T4 in four tasks, days 2/3 idle, ANIM dataset split | 285 | 135 | (with the hold) |
| + mapboxgl.prewarm | 221 | 187 | (with the hold) |
| the same without hold, with the UMD factory made async (library in three tasks) | 226 | 162 | the kept design: same effect as the hold without moving the paint |
| + precompile at style load, phone map attach in the next turn, no perf-metrics option, split emoji warm (R1e d5433fa6) | 120 | 103 | n=8, machine 26-37 percent loaded; R1d in the same run 425 (321) |

## 4. Looks

* `/` at 360, 390, 768, 1024, 1440, 1920 px (cold, settled 6.5 s + 1.5 s, clock at its start): the R1e tree built WITHOUT PERF4 (`--patches` stage with PERF4.json and PG-zperf4.json emptied, release id 5863a239) against the same tree with PERF4 (89eb5d08): pixelmatch threshold 0.1, **0 differing pixels at all six widths** (`docs/accept/r1e/home-diff-perf4.json`; PNGs of 390, 768 and 1440 kept as `home-<w>-without-perf4.png` and `-with-perf4.png`). (R1d against R1d + PERF4 only, before ANIM's round-3 changes: also 0 at the six widths and on seven sub-pages at 390 and 1440.)
* The first version of the T4 slicing was NOT identical: 0.28-0.49 percent of the pixels at 360, 390 and 768 px. Cause: T4 ran after the layer of the place labels (`gtbg-locs-lbl`) instead of before it, so the road labels outranked the place labels in Mapbox's symbol placement ("Little Round Top" lost its place to "Wheatfield Road"). Found by this comparison, fixed by inserting the T4 layers directly above the layer that was on top when T4 was called (`gtAdd`); the layer order is now the order of R1d on phone and desktop (`tmp/r1e/order.mjs`).
* The map sub-pages are not touched by PERF4 (their patches were measured and dropped, see section 1 of the README).

## 5. Train R1e

* Registered (trains.json, build.py, verify_release, probes, `tools/t0/r1e_sync.py`); `python tools/t0/build.py --train R1e --out tmp/r1e/r1e` builds (gate passes).
* New builder feature for round 3: `<GROUP>[+part]@<TRAIN>.json` replaces the unsuffixed group file from that train on (`tools/t0/t0build/patches.py load_groups(..., train)`); used for ANIM (`ANIM@R1e.json`). R1d is frozen: `python tools/t0/build.py --train R1d --out tmp/r1e/chk-R1d` = `release/R1d/dist` byte for byte (tree sha256 7b7aba86e31c...), R0, R1a, R1b, R1c the same (`tmp/r1e/chk_all.log`: all four identical to release/<t>/dist).

(continued at the end of the file when the measurements of the final candidate are in)

## 6. Routes over 200 ms and the long tasks with their source (R1d, phone 4x)

Only two routes exceed the limit in the interleaved runs: `/` (425-575 median) and `/ground-remembers` (205-275 median, minimum 146-181). Every other route measured 0-140 (camera 91-134, compare 76-114, cinematic-export 44-83, immersive 23-37, sandbox 31-74, viewshed 42-57, watch-together 75-82; the static routes 0).
Single outliers of 230-300 ms appear on any map page under load (sandbox 233, viewshed 283 once, compare 256): they follow the machine, not the page.

`/ground-remembers` (CPU profile, one cold load, R1d): FCP 636 ms; long tasks at 693 (70 ms: Mapbox render 34, GPU wait 26, the page's data handler 8), 783 (122 ms: the dark-v11 style's `_load`: creation of 50 layers 69 ms, of which line layers 27, symbol layers 24, fill 9, background 7; image imports 11), 906 (175 ms: a Mapbox render, 63 ms of it vertex-buffer upload and bucket creation for the arrived vector tiles, 23 ms source update, 25 ms placement, GC 12) and 1380 (129 ms: render with symbol draw 30 and placement 48, and the page's own 'load' handler 17: addSource + addLayer of the heat layer). All four are single calls inside Mapbox GL; the page's own code is 8 + 17 ms. The page does not use the frame governor (the callbacks are one per frame) and no patch of PERF4 changes it.

## 7. Sources of the 200 ms excess per task of `/` after PERF4 (profile, 4x, `tmp/r1e/cats.mjs`)

Per cold load on the final candidate: library evaluation in three tasks (60 + 66 + small), `new Map()` task 95-142 ms (excess 45-90), style load 73-100, first render 74-106, second render (raster program, 'load' handlers) 83-102, ANIM engine 50-70 (one or two), React 51-58. Mapbox's own single calls (the constructor, the style load, two renders) are what is left; they cannot be split from outside.

## 8. INP (Event Timing, phone 4x, desktop 1x)

* Acceptance check 5 measures INP as the worst of up to 30 real clicks (10 buttons on the phone shell). R1d (round-2 report): desktop 264 once under load, phone 152. R1e passes 701 and 702: desktop 152 and 80, phone 176 and 192 (limit 200).
* The slow interactions of the phone (`tmp/r1e/inp.mjs`, taps of the first ten buttons, three rounds on a loaded machine): the FIRST date jump (July 2: 256-376 ms), the Tools sheet (176-232), July 3 (120-160), the others 88-136.
* The cost of a first interaction is mostly cold caches, not the handler. Tools sheet, three opens in one page at 4x: event 240, 120, 64 ms (long tasks 176, 55, none). The sheet is 240 elements, 428 new layout objects, laid out in one pass of 107 ms at 4x (style 17 ms, shaping about 40) after a click handler of 20 ms. Shaping the sheet's own strings on a detached canvas while the page boots (the strings and faces read from the DOM of the open sheet, 12 steps) makes the FIRST open 120-144 ms (n=6, interleaved: 240 -> 120 median, longest task 197 -> 60): shipped in `PERF4-index-glyph-warm-early`.
* The first date jump (tap -> new story and event cards, clock, marks): click 17 ms, style and layout 69-80 ms (43 dirty objects), then the next frame's callbacks 117-126 ms (the engine's frame 43-64 with 16 ms of text sprite drawing, Mapbox's render 25, the card placer); the same jump a second time is 49 ms in all. Tried and NOT shipped because it did not change the median: warming the story and event card text (generic text, and the exact strings of the July 2 cards: 320 -> 344 ms), and extending the frame governor to 700 ms after every click (256 -> 240 ms, inside the noise). What is cold is the engine's layout of a scene it has not drawn before and React's first render of the card components, not fonts; a fix belongs to the engine (cache or pre-warm the three day-start scenes), which is ANIM's.
* Desktop: max 80-152 ms over 30 clicks; the slowest were the NPS tour (96) and the Walkthrough button (72) in a quiet run.

## 9. Test and tool changes made for R1e (all logged in the decisions file P8-P12)

`tests/t0/perf-fixes.spec.mjs` PF-09 (the call of gtPrecompile is the body of the last slice of T4), `tests/t0/monuments.spec.mjs` MONL-04 (a click waits until BASE1863's label has left the click point: a race that R1d also lost 1 of 2) and MONL-12 / `tests/t0/base1863.spec.mjs` B63-11 (control = published R1c for R1e as for R1d); new `tests/t0/perf4.spec.mjs`; `tools/t0/run_suites.mjs` row `r1.perf4`.
