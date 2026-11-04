# PERF5 notes (progress file of the R1f desktop first-frame / phone ground-remembers work, 2026-10-31)

Tools of this work (scratch, `tmp/r1f-vw/`, git-ignored): `bench2.mjs` (interleaved cold loads, desktop 1440 x 900, first click on a named control; the length of every task of the 450 ms after the click from a trace of the renderer's `RunTask` events, i.e. the same window acceptance check 4 judges, but with the exact length of tasks under 50 ms; `SLOWLINK=<ms>` makes the first read of a program's link status busy-wait that long when the GPU process is not done with it), `slowlink.js` (that init script), `prof3.mjs` (CPU profile of the click window, call tree per busy segment), `grbench.mjs` (phone 390 x 844, CPU 4x, cache cleared, one fresh browser per load, blocking time as `tools/accept/checks/c5_perf.mjs` counts it, per-load task list), `grprof.mjs` (CPU profile of the phone load with call trees of the long tasks), `stress.mjs` (symbol-loss stress), `shotsvw.mjs` (screenshot compare). Chrome 156 headless, Windows 11, 16 logical cores. **The machine was shared with another agent's work for the whole session** (CPU 20 to 40 percent while measuring, no other benchmark of mine ran at the same time unless a line says so); every comparison is interleaved (A, B, A, B, ...; the order alternates) so slow minutes hit both sides, and a number alone means nothing: n, median, tail are given.

## 1. The defect could not be reproduced as such; what was measured instead

Check 4 of the eight-pass run flagged the first click on Virtual Walkthrough (53 to 70 ms) and on Monuments (58, 60 ms) in 4 of 5 sweeps of R1e. On the machine of this round:
* a scoped check 4 on R1e (`run_pass.mjs --only 4 --routes app --input-scope app --input-parts sweep`, desktop + phone, 392 s): **0 defects**; Walkthrough click 31 ms / Enter 10 ms / Space 29 ms, Monuments click 33 / Enter 32 / Space 33 ms response, no long task in any of the 155 activations;
* 24 + 24 interleaved cold first clicks (the observer of the harness): 0 long tasks on either control.
The exact task lengths (trace) show why the defect comes and goes: R1e's Walkthrough click window has its longest task at 21 to 49 ms in most loads and over 50 in about 1 load in 20 (84, 53 and 50 in 72 loads), Monuments at 9 to 42 ms (never over 50 in 140 loads). The harness machine of the earlier runs was slower in one particular way: a program link took 20 to 30 ms instead of 5 to 11 (the profile of the click shows `Program._finalize` -> `getProgramParameter` waits as the largest single item of the frame).

**Emulating the slow link.** An init script (`tmp/r1f-vw/slowlink.js`, copied into `tests/t0/perf5.spec.mjs`) makes the first read of a program's link status busy-wait 15 ms when `COMPLETION_STATUS_KHR` says the GPU process is not done with the program: what a loaded driver does by itself, and not more than it does in the harness run (20 to 30). With it R1e's Walkthrough click reproduces the harness numbers: the longest task is over 50 ms in 5 to 8 of every 10 to 12 loads (median 53 to 55 ms), 44 of 82 in all, and PERF5's candidates can be compared with it.

## 2. What the first frame of each control is (R1e, profile of the click window)

* Walkthrough: click task 25 to 35 ms = React flush + the Mapbox constructor of the second map (`_setupContainer` 9 ms of forced layout, `_setupPainter` 7 to 16 ms creating the WebGL context); then, when the satellite tiles have arrived and `load` fires, the handler adds 3 layers and the next frame draws their programs for the first time (circle, circle, symbol SDF: 5 to 11 ms each here, a link wait the main thread cannot hide) and uploads the tiles: 35 to 70 ms.
* Monuments: the click task adds 2 images, 2 sources, 4 layers (11 ms), the next frame is the first draw of the 4 programs + placement + the engine's step (11 ms): 2 tasks of 9 to 15 ms here.

## 3. Candidates (all measured interleaved against R1e, same session; "over" = longest task > 50 ms)

| candidate | what | Walkthrough, slow link 15 ms | Walkthrough, plain | Monuments |
|---|---|---|---|---|
| v1 | one layer per frame (`addLayer` in three frames) | over 2 of 10, median 36, max 75 | no change | worse (22 against 13 median) |
| v2 | layers added when the style has loaded, in the zoom range 24 to 24 (not drawn), programs queued by PERF4's `gtPrecompile`, shown one per frame at `load` | over 0 of 10 (44) and 2 of 12 (74) | - | 11 against 13 median, max 16 |
| v3 | v2 + the map built a frame after the overlay is painted | over 1 of 12 (60), median 37 | - | - |
| v4 | layers added with `visibility: none` (instead of the zoom range) | 0 of 12 (44) | - | **every load 57 to 85 ms**: the precompiler gives a hidden layer other program parameters than the visible one, the first draw links anyway (25 ms x 2) |
| v6 | zoom range + two steps (circle and number layer together, dots one step later) + custom precompile that compiles every queued program in one task | 1 of 12 (63), median 33 | 1 of 12 (64) | max 24 under a 25 ms link (R1e 37) |
| v7 / v8 | v6 with the programs compiled one per timer task, v8 also drains the style's own queue (raster) into the same slices | v8: 1 of 12 (57), median 33 | v7 1 of 16 (58), v8 1 of 20 (70), 1 of 30 (62) | max 26 / 15 |
| **R1f** (v8, registered) | as v8 | **1 of 24 (53), median 26 against R1e 12 of 24, median 52** | R1e 0 of 24 (max 39), R1f 1 of 24 (53) | R1e max 34, R1f max 15 (25 ms link); plain: R1e 27, R1f 19 |

Reading: under a slow link R1e fails in half the loads and R1f in 1 of 24; the median of the longest task goes from 52 to 26 ms. With a fast link neither fails often (R1e 3 of 72, R1f 5 of 102 over 50: the same 4 to 5 percent) and the remaining outliers (49 to 70 ms) are not the link: they have no script in them (a long-animation-frame entry of one of them: 9 ms of script in a 50 ms frame, 39 ms before render start), so they are native work (texture upload of the satellite tiles, garbage collection, a GPU stall) that R1e has as well. **Not isolated further** (a CPU profile of the 5 percent needs a profile run per load, and with the profiler on every task is 2 to 3 times longer).

Tried and dropped: slicing the precompile of the sub-page helper in `site-nav.js` (`GTBG_PRECOMPILE`, one program per task): `/ground-remembers` blocking time got worse (median 153 against 130, n = 24).

## 4. Looks and behaviour

* Pixel comparison R1e against R1f (1440 x 900, desktop shell, tiles as served, `tools/accept/lib/imgdiff.mjs` threshold 0.1): Virtual Walkthrough open for 9 s (stops, numbers and 425 monument dots in view): **0 differing pixels**; Monuments layer on the main map after 8 s (stars, dots): **0**. (The Walkthrough's own Monuments tab is list and search only, the map layer is the same; it is covered by `walkguard`.) (`tmp/r1f-vw/shots/`, copies in `docs/accept/r1f/`).
* Symbol buckets (the risk of a source reload while it loads, PERF4 T0-P4-10): Walkthrough, 17 cold loads: 14 number labels rendered in every one (R1e 10 of 10: 14); Monuments, 20 cold loads: 10 stars in the default view in every one (R1e: 10 of 10).
* Time to see the content (frames at 60 fps): Walkthrough: overlay frame 3, map frame 7 (R1e: the map in the click's task), stops frame 15, dots frame 17 (limited by the satellite tiles in both); Monuments: layers added frame 2, dots frame 4, glow, ring and stars frame 6 (about 70 ms after the click; R1e drew everything in the frame after the click).

## 5. /ground-remembers on the phone (4x CPU, cold, fresh browser per load)

R1e's five long tasks (profile, one load each; nominal times in ms): the Mapbox constructor 60 to 70 (`_setupPainter` 24, style set-up 12, resize 11), the first render 55 to 62 (the clipping mask link, `(program)` 24 of it), the style load 90 to 95 (50 layers: line layers 27, symbol 24, fill 9; image imports 11), a render with the first tiles 100 to 127 (`update` 38, `updateSources` 20, `buildQueue` 9), a render with the first symbol placement 80 to 100 (placement 38, symbol draw 30, **the page's `load` handler 20**). 40 to 50 percent of their time is `(program)` = lazy compilation of the library's code on a cold load and native work. Their excess over 50 ms adds up to 150 to 170 ms in a typical load; the metric is superlinear (a task's excess is d - 50), so a load that is 1.25 times slower than the median adds up to about 260.

| variant (interleaved) | n | median | q75 | q90 | max | over 200 | over 150 |
|---|---|---|---|---|---|---|---|
| R1e | 30 | 144 | 177 | 196 | 268 | 2 | 12 |
| all page edits (heat task, prebuilt geojson, GPU warm-up, metrics off) | 30 | 122 | 150 | 196 | 356 | 2 | 7 |
| **R1e (the registered build, final run)** | 32 | 135 | 147 | 164 | 223 | 1 | 7 |
| **R1f (registered: PG-zperf5)** | 32 | 115 | 136 | 148 | 174 | 0 | 3 |
| R1e | 24 | 130 | 163 | 172 | 181 | 0 | 7 |
| the heat layer in a task of its own (= PG-zperf5) | 24 | 123 | 141 | 164 | 234 | 1 | 4 |
| + the sliced precompile of `site-nav.js` | 24 | 148 | 174 | 179 | 256 | 2 | 11 |
| R1e with `site-nav.js` sliced | 24 | 153 | 182 | 199 | 206 | 2 | 12 |
| R1e | 10 | 144 | 157 | - | 1084 (one outlier) | 2 | 4 |
| `projection: 'mercator'` (the style says globe) | 10 | 158 | 209 | - | 409 | 4 | 5 |

* **What PG-zperf5 gains: 7 to 22 ms of the median** in three independent interleaved samples (-22, -7, -20; 5 to 15 percent: the 20 ms of the page's own work inside the heaviest render task move into a timer task of their own). The tail: in the final run (registered builds, n = 32) q90 164 -> 148, maximum 223 -> 174, above 200: 1 -> 0 of 32; pooled over all samples loads above 200 ms are 3 of 86 on R1e and 3 of 86 on the heat variants, so **the tail is not shown to change** (the samples are too small to tell 3.5 percent from 2 percent). The tail is not cut by this patch.
* Tried and dropped (no gain or worse): sliced precompile (worse), `projection: 'mercator'` (the style's globe machinery is not the cost), a throw-away WebGL context early (inside the noise), `performanceMetricsCollection: false` (inside the noise; PERF4 shipped it on the main maps), the heat layer's GeoJSON built before the map (moves 5 ms to the constructor's task).
* **Why the tail cannot be cut from the page:** every remaining task is one synchronous call inside the Mapbox library (constructor, style load, two renders, placement) and the sum of the excess of five such tasks is the metric. A load in which every task is 1.2 to 1.4 times longer (CPU contention, GPU process busy: the machine of this round gave such loads in 1 of 10 to 1 of 20) crosses 200. A real cut needs a change the owner decides: (a) build the map in the page's first task, before the first paint, and fetch the placement files in parallel (the eight map pages already hold the first paint until DOMContentLoaded, PERF3): the 60 to 70 ms constructor then falls before the first contentful paint, which is where the metric starts, and the first paint comes 60 ms later on the 4x phone; not measured here because it moves work in front of a metric boundary and the brief of R1e (decision P1) says the first paint comes first; (b) a poster image with a "load the map" step (a look change); (c) a lighter style (a look change); (d) self-hosting the library with a code cache (not for a cold first load, and the licence needs the owner).
