# ZTAIL: the phone cold-load tail of the Mapbox map pages (train R1g, page group PG-ztail)

Scope: `/ground-remembers`, `/viewshed`, `/compare`, `/camera`, `/immersive`, `/watch-together` on the phone (390 x 844, CPU 4x, cache cleared, one fresh browser per load), blocking time as `tools/accept/checks/c5_perf.mjs` counts it (long tasks from the first contentful paint to load + 3 s, excess over 50 ms). The owner's bar is the tail, so every comparison is interleaved (A, B, A, B; order alternates), bench lock held, with q90, q95, max and the counts over 150 and over 200 ms. Chrome 156 headless, Windows 11, 16 logical cores, shared machine (the lock keeps other benchmarks off during a run; background load from other work remains and is the reason the base column has a tail at all).

Scratch tools (git-ignored): `tmp/r1g-ztail/` (`bench.mjs`, `bench2.mjs` with the library's arrival time, `slowscript.mjs` delaying the library, `shots2.mjs` settled and tilted screenshots, `mkvar.mjs` the variants, logs and json of every run).

## 1. What the tail is (two different causes)

**A. Five synchronous Mapbox tasks on `/ground-remembers` (the page that has a blocking-time tail of its own).** Medians at 4x (n=40): constructor 71 ms, first render 55, style load 84, render with the first tiles 109, render with the first symbol placement 65. Every excess over 50 ms adds; a load in which the machine is 1.3 times slower crosses 200. Base, 80 cold loads (two runs): 3 loads over 200 ms (3.75 percent: 245, 245, 262), 17 over 150.

The longest task was the render that draws the first tiles (109 ms). The page's style (`dark-v11`) says projection globe and has fog; the fog makes the first frames build the atmosphere (16,000 star quads although the style's star-intensity is 0) and link the fog and globe programs. The first hypothesis was that GTBG_PRECOMPILE's batch (four variants of every program, 35 in one task) was the cause; the ablation of section 3 disproves it: holding the variants back changes nothing (median 72 against 69 without), and the fog switched off for the first frames gives the whole gain. The cause is the fog's work in the first frames.

**B. The network (all eight pages; seen once as 307 ms on `/viewshed` in run A pass 1 with FCP 1220).** The page loads `mapbox-gl.css` (render-blocking) and `mapbox-gl.js` (defer) from api.mapbox.com. `slowscript.mjs` delays them (4 loads per setting):

| delayed | first paint | blocking time |
|---|---|---|
| nothing | 484-552 | 0-6 |
| CSS 800 ms | 1236-1340 | 0-8 |
| JS 800 ms | 616-684 | 181-218 |
| JS 1500 ms | 492-644 | 174-225 |

The CSS blocks the first paint (FCP 1220 in run A is a CSS that took about a second). When the script arrives after the 250 ms hold of the first paint (PERF3), the paint comes first and the library's own 205-246 ms evaluation task counts. In normal cold loads the library arrives at median 211 ms (q90 238, max 325, 40 loads), so the evaluation falls before the paint and `/viewshed` measures median 2, q95 37, max 44 over 40 loads. The stall is a network event; nothing in the page can remove it except a copy of the two files on the site's own origin (decision Z4: not done, the Mapbox terms do not say whether that is allowed; owner) or a longer hold of the first paint (decision Z3: not done, it moves the first paint of every slow-network visitor).

## 2. The change (PG-ztail, one patch; `tools/t0/r1g/gen_ztail.py` writes `tools/t0/patches-next/PG-ztail.json`)

* `ZTAIL-nav-plain-first` (`site-nav.js`) was part of the first version and is DROPPED (decision Z1, revised 2026-11-02). It held the fog / globe / terrain variants out of the precompile batch. The three-way run of section 3 shows no gain from it beyond the fog change (median 72 with it, 69 without; q95 121 against 110), and the variants are created by Mapbox's own idle callback 13 ms later in any case (the probe of T0-ZT-04 saw them at 367 ms against the plain programs at 354 ms with the CPU unthrottled). Without it PG-ztail touches one file and no other page changes by a byte (T0-ZT-05).
* `ZTAIL-ground-fog-later` (`ground-remembers.html`): fog off at `style.load`; back with the style's own values at the first movement or 4.5 s after the first idle (quiet moment, never while moving). Public API only (`getFog`, `setFog`, `idle`, `movestart`, `isMoving`, `moveend`).

Look: settled `/ground-remembers`, phone, 9 s: 0 differing pixels against the control (`tmp/r1g-ztail/shots/pgB-settle`). Tilted by the keyboard (Shift+Up x4) the difference to the control is 27 pixels (phone) and 5120 (desktop), below the noise floor between two loads of the control (2241 and 10476). T0-ZT-02 (jumpTo pitch 60, zoom 3, zoom 0.8) asserts 0 differing pixels.

## 3. Result (interleaved, n=40 per column)

`/ground-remembers`, blocking time in ms:

| tree | min | q25 | median | q75 | q90 | q95 | max | over 150 | over 200 |
|---|---|---|---|---|---|---|---|---|---|
| R1f (run 1) | 81 | 112 | 130 | 156 | 177 | 245 | 245 | 13 | 2 |
| R1f (run 2) | 73 | 89 | 106 | 126 | 152 | 183 | 262 | 4 | 1 |
| first version (fog patch + precompile filter; filter since dropped) | 37 | 60 | 70 | 89 | 103 | 106 | 154 | 1 | 0 |

First paint is unchanged (median 512 against 512; 516 for the shipped version in the three-way run). Per-task medians of the first version: constructor 71, first render 55, style load 84, tile render 64 (was 109), placement 66. The remaining tasks are the library's cold start (constructor 71 ms: WebGL context 27, style set-up 10, resize 9; style load: 59 of 84 ms is layer creation, mostly first-use compile).

Candidates measured on the way (n=14 each, interleaved; medians in ms). `r4.json`: base 102, precompile filter alone 112, fog off for good 70, fog off and back at the first idle 89, fog off + mercator 73, lean style 102. `r1.json`: base 139, `fadeDuration: 0` 142, fog off 108. The n=40 run of the first version (fog back at the first idle, `g40.json`): base 130 (2 over 200, 13 over 150), fog back at idle 110 (0 over 200, 2 over 150: the restore task of about 70 ms lands in the window), fog off for good 92 (max 150). The final version moves the restore out of the window (Z2). Dropped ones are in decisions Z5.

### Confirmation run and pooled tail of the shipped version (two interleaved n=40 runs, `abl-gr.json` and `abl-gr2.json`, n=80 per column)

| tree | median | q90 | q95 | max | over 120 | over 150 | over 200 |
|---|---|---|---|---|---|---|---|
| R1f (base) | 113 | 134 | 139 | 221 | 26 | 1 | 1 |
| PG-ztail (fog patch alone) | 69 | 101 | 102 | 194 | 2 | 1 | 0 |

Run 2 alone: base median 115, q95 136, max 142; PG-ztail median 69, q95 102, max 194. The 194 is one load in which the whole machine was slow (FCP 620 against a median 512, load event 885 ms against about 370, first Mapbox task 133 ms against about 70, CPU busy 23 percent against 18): the same kind of event as the base's 221 of run 1. With 0 of 80 over 200 the upper 95 percent bound of the true rate is 3.7 percent (rule of three: 3 in 80), against the 3.75 percent observed on the base; what the data do show is that the whole distribution moved down by about 45 ms (median 113 to 69, over-120 count 26 to 2). The floor that remains is the library's own cold start: the five synchronous tasks (constructor 71, first render 55, style load 84, tile render about 64, placement about 66) each lose 50 ms to the long-task threshold and the sum of the excess is what the page is charged. Splitting the tasks cannot help (they are already separate tasks, separated by network and frame waits); the work inside them is Mapbox's. `antialias: false` and a lower pixel ratio on phones would cut GPU work but change the picture (edges of fills and lines), which the brief forbids; not tried.

### Three-way ablation (the evidence for dropping the nav patch), `/ground-remembers`, n=40 per column, one interleaved run, blocking time in ms (`tmp/r1g-ztail/abl-gr.json`)

| tree | min | q25 | median | q75 | q90 | q95 | max | over 150 | over 200 |
|---|---|---|---|---|---|---|---|---|---|
| R1f (base) | 73 | 95 | 111 | 127 | 139 | 148 | 221 | 1 | 1 |
| fog patch + precompile filter | 41 | 57 | 72 | 78 | 99 | 121 | 130 | 0 | 0 |
| fog patch alone (the shipped PG-ztail) | 44 | 59 | 69 | 87 | 101 | 110 | 127 | 0 | 0 |

### The other map pages (R1f tree, no change by this group), n=40 each, same profile and counting

| page | median | q90 | q95 | max | over 150 | over 200 |
|---|---|---|---|---|---|---|
| /viewshed | 4 | 35 | 42 | 46 | 0 | 0 |
| /compare | 28 | 37 | 39 | 52 | 0 | 0 |
| /camera | 46 | 53 | 57 | 68 | 0 | 0 |

Only `/ground-remembers` had a tail of its own (satellite pages have no fog, no globe and a smaller style). The 3.5 percent of loads over 200 ms that the F7 note counted were all that page, or the network event of section 1B. A column that carried the filter on these three pages measured the same (max 130 on one `/viewshed` load, a machine hiccup: FCP 632 against 516 in the same load, unrelated to the code path, which creates the same programs; n=40 each, `fin-*.json`).

## 4. How to re-check

* `python tools/t0/r1g/gen_ztail.py --check` (anchors against `release/R1f/dist`; exit 1 when the written file differs).
* `node tests/t0/ztail.spec.mjs --dist <tree> --control release/R1f/dist` (T0-ZT-01..05, 07; T0-ZT-06 was the nav patch's test and is gone; add `--bench 12` for T0-ZT-08; `--expect-red` on a tree without the group).
* Interleaved cold loads: `node tmp/r1g-ztail/bench2.mjs 40 ground-remembers.html out.json base=- new=<dir of the changed files>` (takes `tmp/bench.lock`; set R1G_LOCK_HELD=1 when a parent holds it).
