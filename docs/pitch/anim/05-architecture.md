# 05 - Architecture and feasibility: a battle-rendering engine for the Gettysburg map

*Design research and prototype. Nothing here changes the product: no file of `tools/t0`, `baseline`, `legacy`, `release`, `src`, `data` or the product tests was edited, nothing was deployed, no account or key was used. Everything lives in `docs/pitch/anim/05-*` (this file, `05-bench/`, `05-proto/`) and in the git-ignored `tmp/pitch-anim/arch/`. Prepared 2026-10-05 on the owner's machine (Windows 11, Intel Core Ultra 7 265H, 31 GB, Intel Arc iGPU plus an NVIDIA laptop GPU, Chrome 155.0.8059.27).*

**Evidence vocabulary used in this file** (the site's own words where they fit): **Read** (from the code of the R1c bundle or of a source file I opened), **Computed** (from the placement data by a script I ran), **Measured** (a command I ran in Chrome or Node, numbers in the tables), **Replayed** (the shipped code's logic re-run in Node on the real data, and checked against the real function in the browser), **Modelled** (an interpolated or derived value, not a documented one), **Unverified** (said so, with the reason). Every number has a file or command behind it (section 11).

---

## 0. The answer on one page

**Is it feasible to replace the unit renderer by an extensible engine, injected as a patch group, without breaking the rest of the app?** Yes, and I built and ran a walking skeleton to prove it rather than argue it.

| question | answer | evidence |
|---|---|---|
| How big is the hook surface in the R1c bundle? | **9 asserted string patches in one file** (the entry bundle): the paused redraw (`e1`), the playing frame and its end (`Ed`), the phone frame cap, the interpolation (`y1`), the desktop and the phone pick, the resize guard of the A2 helper, and (only with MON) the Monuments click arbitration. 8 of 9 anchors also hold on the R1c tree without MON. | `05-proto/dist/ANIM-proto.json`; the T0 builder applied them with `expect: 1` on R1c + MON and **every gate passed** (parse, unresolved globals, anchors, ledger, bytes) |
| What does it cost in bytes? | entry bundle 2,338,435 -> 2,378,401 bytes raw (**+40.0 KB**), brotli 524,887 -> 537,217 (**+12.3 KB, +2.35 %**); the DOM-free core is about a quarter of it | `release gate.json` of the two scratch trees; `05-bench/results/bytes.json` |
| Does the animation get smoother? | **Yes, measurably, and most under load.** Real Chrome, 8x playback, alternating A/B on this machine: at 4x CPU the prototype runs **26-34 fps against 13-17** for the shipped renderer (nine repetitions in three batches: prototype 17.6-33.7, shipped 12.0-16.9, no overlap); at 1x CPU the prototype holds **60.0 fps with no frame over 20 ms in all nine repetitions** and uses about a third less main-thread time (30-43 % against 60-63 %), while the shipped renderer ran 35-60 fps depending on how busy the machine was. The tiles themselves stop teleporting: **889 one-frame displacement spikes (replayed) become 33**, and in the real app **1,019 spikes in 542 frames (180 of them over 60 px) become 32 (none over 60 px)** | section 6, `05-proto/results/`, `05-proto/test/results.json` |
| Does the rest of the app keep working? | The repo's own suites against the prototype tree: journeys **41/41**, Monuments builder suite **17/17** (run in slices because the harness caps Mapbox requests), independent MON verifier **15/16**, desktop fixes **9/10**. The two failures are tests that encode the *shipped* semantics (the legacy trail canvas, and "a unit sits at its latest keyframe"), not defects of the engine; section 6.5 (finding 3) says exactly what each needs | `tests/t0/*.spec.mjs --dist tmp/pitch-anim/arch/anim-R1c/dist` |
| Which renderer technology? | **Canvas2D sprite atlas first, WebGL2 instanced sprites as the second backend of the same engine**, both drawn inside the map's own render event. **Mapbox symbol layers are ruled out by measurement** (the displayed positions lag the data by 0.8-2.7 s and the phone proxy collapses to 5-7 fps); a Mapbox custom layer works but buys little over an own WebGL canvas and couples the engine to Mapbox's GL state | section 3 |
| Is "tiles never obscure each other" achievable? | **Not with one tile per unit at the zoom levels the app opens at.** With the benchmark tile (46-78 x 20-24 px by strength) there are 5,456 overlapping pairs among the 478 units at zoom 12.4, 1,801 at 13.5, 333 at 14.5 and still 24 at 15.5. The guarantee needs a layout stage that can aggregate or fan out (the layout lab's job); the engine provides the slot, the invariant (`overlaps() === 0`) and the budget (about 2 ms), and the prototype's reference strategy honestly does **not** reach zero (section 2.2) | `05-bench/results/solver-D1.json` |

**What I could not verify**: no real phone (the "phone" rows are a 4x CPU throttle on this laptop's GPU, which throttles the main thread only); only Chrome (Safari and Firefox untested); no battery or thermal data; the Mapbox symbol-layer rows use a blank local style (zero tiles, so they isolate the unit layer but are not the satellite basemap); the prototype's rich skin is a workload, not a design. Section 10 lists the decisions the owner has to take.

---

## 1. What the shipped renderer is, and why it jitters

### 1.1 Anatomy of the R1c unit layer (Read)

All names are the bundle's minified identifiers; the anchors that matter are asserted in section 5.

```
 zustand store yn: currentTick (integer 1..675), isPlaying, playbackSpeed, placementsByTick, selectedUnitId, pinnedUnitId, filters, oobData, showUnits
        |
 Ed(c, getState, setState, canvas, map)     one requestAnimationFrame loop, started by Gk, stopped by Op          [clock + draw]
   - Hc += min(frame dt, 100 ms); every 500/speed ms: setState({currentTick}) (store write -> React), prefetch of days 2 and 3 (aF, lF), casualty flash (uF -> Qx)
   - ut = Hc / (500/speed)   (0 when reduced motion)                                                              [fraction of the running tick]
   - y1(placementsByTick, tick, ut)   -> unit records: carry-forward of the latest keyframe, F4 interpolation ONLY between two CONSECUTIVE ticks
   - dA (project every unit again), cA (trails on a second canvas "so"), lS (draw)
 lS(canvas, map, units, selected, pinned, filters, flash, now)    the whole draw routine, 83 lines, clearRect + save/translate/rotate per unit,
   shadowBlur for pinned/engaged units, O(n^2) 8-pass overlap relaxation on screen pixels, measureText for every label, "NN fps" text under 45 fps
 e1(...)  the same for a paused map (called on every tick change, filter change, resize, map move via GtbgRepaint)
 gF (desktop host) / pO (phone host)   create the 2D canvas over the Mapbox map, own the click pick (aT/Xx: uniform grid on lng/lat, 0.002 / 0.003 deg radius)
 consumers of y1 other than the draw: the minimap (WF), the pick index (aT), the phone fly-to
```

Facts that shape the design: the canvas is **not device-pixel-ratio aware** (backing store = CSS px), the phone path **caps drawing at 30 fps** (`Ed` skips frames under 33 ms), the hover tooltip `fF` is rendered with the wrong props (`map`, `canvas` instead of `hoveredUnit`, `mousePos`) and so **never shows** (Read; I did not hover-test it in the browser), the trail canvas `so` is created after the resize observer ran and stays 300x150 until the window is resized (Read, perf-runtime-10 reports the same), and the label text comes from `cx(id)` because `Y4` is called with an empty order of battle (so "I/1/6W"-style labels, never the designation).

### 1.2 The data the animation runs on (Computed, `tmp/pitch-anim/arch/data-stats.mjs`)

1,804 placement records on **188 of 675 ticks**, 478 units (386 infantry, 35 cavalry, 57 artillery by the app's own rule; 265 Union, 213 Confederate), 1,687 distinct (unit, tick) keyframes, **478 units on the field at the peak (tick 620)**, 71 at tick 1. Between a unit's own consecutive keyframes: 1,209 pairs, median gap **17 ticks (85 game minutes)**, p75 65, p90 137, max 658; only **7.7 % of the gaps are a single tick**. 939 of the pairs involve movement (median 384 m, p90 1,905 m, max 5,682 m); **873 of them (93 %) span more than one tick**, which is exactly the case the shipped interpolation does not cover. Per populated tick the median is 6 keyed units (p90 18, max 85).

*Note on the "about 570 tiles" of the brief: the data peaks at 478. I benchmarked 462 (the first scene, see appendix A for why it was not 478), 478 (confirmation), 570 and 900 (synthetic clones of real units +-300 m).*

### 1.3 Where the jitter comes from

| # | cause | evidence | numbers |
|---|---|---|---|
| J1 | **Units teleport.** `y1` interpolates only when a unit has a record on tick f **and** on tick f+1; every longer gap is "frozen at the last keyframe, then jump" | Read + Computed + **Replayed**: my replay of `y1`/`F4` equals the real `y1` of the built bundle on 311,178 unit-frame comparisons, 0 mismatches (`test/replica-check.mjs`) | 873 of 939 moves are teleports. At 8x over a full run (2,528 frames): **889 one-frame spikes** (a step over 8 px and over six times its neighbours), 605 of them over 60 px, in **100 %** of the frames inside a gap the unit stands still (engine: 15 %); the engine has 33 spikes |
| J2 | **One step backwards per tick, and units flicker in.** On the frame that advances the tick, `Ed` still holds the tick it read at the start of the frame (`let st=H`) but already uses the fraction of the new tick, so `y1(…, st, ut)` draws an earlier time than the frame before; a unit that first appears at tick f+1 is pushed in at x >= .5, vanishes on that frame, and reappears | Read (the minified text) + **Replayed** (same replay) | 674 frames where the drawn time goes backwards (once per tick); **814 appearances for 407 appearing units** (twice each; engine 407) |
| J3 | **Stop at every tick boundary** for the few interpolated pairs: per-disposition ease-in-out, ease-in (Charging) or ease-out (Chaotic Retreat) per tick segment, so velocity is zero at each keyframe | Read | 66 pairs of 1,209; small, but it is the only "motion" the shipped code has |
| J4 | **The layout moves tiles every frame.** The overlap relaxation is stateless and order dependent, so a tile's displacement changes with tiny changes of its neighbours | **Measured** on a copy of the loops of `lS` with real positions (`05-bench/page/solver.js`) | mean **6.0 px per frame** of extra movement beyond the anchor's own motion at zoom 12.4 (p95 38 px, max 162 px); 0.9 px at 13.5; and 2,984 of 5,456 overlapping pairs remain after it |
| J5 | **The overlay lags the map by one frame** when its own animation-frame loop runs before Mapbox's (the order after Play is pressed on an idle map) | **Measured** in a synthetic page that copies the app's pattern (`05-bench/page/sync.js`); not yet observed inside the production app (**Unverified** there) | **11.1 px** mismatch on 100 % of the frames at 667 px/s pan; 0.00 px when the overlay is drawn inside `map.on('render')` |
| J6 | Blur on 2-3x screens (no DPR), 30 fps cap on phones, a 60 Hz React re-render of the HUD clock (`_F`), the whole app subscribed to the store | Read; the HUD and re-render figures are perf-runtime-03/13/18, **not re-measured here** | |

In the real app (section 6) the same signal shows up without any replay: tile positions captured per frame while playing at 8x give 1.88 spikes per frame for the shipped renderer (1,019 in 542 frames, 180 over 60 px) and 0.06 for the prototype (32 in 541 frames, none over 60 px).

---

## 2. Requirements and what they force

| owner requirement | consequence for the architecture |
|---|---|
| improve the tile appearance, make the whole animation top notch | skins are data + a draw recipe (plug-ins), the look can change without touching the loop; the first skin (`classic`) reproduces today's look so the change is incremental |
| consistently improve, tweak, add | registry of named, versioned modules; one tuning file with a schema; a hidden Tuning Studio; goldens and metrics per skin version (section 4) |
| absolutely fix the jitter | continuous time over each unit's whole keyframe gap (motion model), C1 velocity, a clock with a jump policy, one frame loop synchronised to the map, a layout with memory (section 4.2) |
| keep and improve every popup | popups stay React components on the same store contract; the engine keeps writing the integer tick and the selection exactly as before (the 41 journeys prove it), and tokens (section 4.4) let a popup style change without a code change |
| research the site, ground every idea in the data | section 1.2; the engine never prints a digit it cannot trace (4.6) |
| tiles never obscure each other, never hide vital info | 2.2 and the layout slot |
| no errors: every claim true to the data and sources | evidence classes are first-class data (4.6); an exception falls back to the shipped renderer (5.5) |

### 2.1 What "continuous interpolation" is allowed to claim

Between two documented keyframes a position is **Modelled**, not Documented. The engine therefore (a) keeps strength, disposition, notes and every printed digit at the value of the governing keyframe (the unit panel and the Follow Your Ancestor journey are computed from the same records as today), (b) marks every tile whose position is currently interpolated (`modelled` per tile and frame; a skin can draw a hint, and an effect can draw the "last documented / next documented" ghosts), and (c) offers the motion model as a plug-in because the choice is a historical-accuracy decision for the owner: **linear** invents no geometry but has a velocity jump at 708 of 762 keyframes (Computed); **smooth** (monotone cubic, never overshoots a keyframe on either axis) has none, but leaves the straight line between two keyframes by a median 0 m, **p90 40 m and at most 334 m** (Computed, `test/results.json`). The default in the prototype is smooth; the owner may prefer linear plus a gentle ease.

### 2.2 The "never obscure" rule against the data

With the benchmark tile (46-78 x 20-24 px by strength, 2 px margin) and every one of the 478 units placed where the data puts it, the number of overlapping pairs before any layout is (Measured, `solver-D1.json`, 478 visible / 432 / 190 / 57 tiles): **5,456 at zoom 12.4, 1,801 at 13.5, 333 at 14.5, 24 at 15.5**. A push-apart layout cannot fix that at low zoom: the reference strategy I wrote (grid broad phase, warm start, smoothing; `05-proto/src/40-layout.js`; tested with 62x28 px tiles in `engine.test.mjs`) leaves 437 overlapping pairs at 13.5 and 86 at 14.5 of the 413 and 174 visible tiles, reaches 4 at 15.5 and 0 at 16.5. So the owner's rule implies one of: tiles that scale down with zoom, aggregation of a formation into one tile that fans out on demand, or a level-of-detail by echelon. That is design work for the layout lab; what the architecture guarantees is **a slot for it** (`layout` plug-ins get anchors and footprints and return offsets), **an invariant** (`G.overlaps()` counts overlapping drawn rectangles; a CI gate must require 0 for the shipped strategy at the tested fixtures), and **a budget**: the reference solver costs 2.0 ms p50 at 174 visible tiles and 9.5 ms at 413 (Node, unthrottled, machine under load), too slow for 400 tiles, so a shipped strategy has to be incremental (dirty cells only, early exit when stable).

---

## 3. Renderer options, measured

### 3.1 Method

`05-bench/` is a harness that renders the same **workload** with every candidate: the real data (`release/R1c/dist/data`, the app's own loading rules), continuous-time interpolation over each unit's keyframes, 8x playback over ticks 450-675, a camera that drifts and zooms, every tile with a shadow, a badge glyph, the designation text with a halo, a strength bar, a posture dot, a facing chevron, a pulsing glow on 15 % of the tiles and a selection ring on one. Each run: 2 s warm-up, 8 s measured, fresh page, own Chrome profile, Mapbox hosts blocked at the resolver (blank local style, zero tile requests; the benchmark pages made no Mapbox request at all except one glyph file fetched through the repo's Referer-injecting harness; the real-app tests and suites of section 6 use the same harness, which counts and caps the tile requests per process: 76-146 for the A/B runs). Metrics: our JS per frame, frame intervals from `requestAnimationFrame` (60 Hz headless), main-thread task time (`Performance.getMetrics`), renderer and GPU-process CPU (`SystemInfo.getProcessInfo`), GC from a trace (`MinorGC`/`MajorGC` events, a separate pass), heap and allocated canvas/atlas memory. Configurations: **D1** 1440x852 at 1x, **D2** the same at 2x (retina), **P4** 390x844 at 3x with 4x CPU throttle (a mid-phone proxy for the **main thread only**), **P4c** the same at 2x (the DPR cap). The GPU is real here (ANGLE/D3D11 on the Intel Arc), unlike the software-GL machine of perf-runtime; absolute fps is therefore not comparable with that report, the ranking is.

Candidates: **A0** the current routine, `lS` and its helpers copied verbatim from the bundle (`page/base-ls.js`), still 1x like the app; **A1** the same rich tile drawn per frame with Canvas2D paths and `shadowBlur`; **A2** Canvas2D sprite atlas, one `drawImage` per tile; **A3** atlas with the facing chevron as a second rotated draw; **B1** an own WebGL2 canvas, instanced sprites, one draw call per atlas page; **B2** the same sprites inside a Mapbox custom layer; **B3** hybrid: custom layer for the bodies, a Canvas2D overlay for the text; **C1/C2** Mapbox symbol layers (icons + `text-field`, glow as a circle layer) updated with `source.setData` / `GeoJSONSource.updateData` every frame; **C3** feature-state alone (66 glows at static positions).

### 3.2 Results

Column notes: *our JS per frame* is the time inside the candidate's frame callback (for the Mapbox symbol rows it is only the call that hands the data over); *main thread busy* is the renderer's main-thread task time over the window (Mapbox's own render and workers are in it or in *renderer CPU*); *canvas + atlas* is **allocated** memory (the atlas pages are 4096x4096 whatever is used; used memory is quoted below the tables); GC counts come from a separate traced pass of the same run; the D1 table is the median of three repetitions, the others of one or two (the `repetitions per row` line says which). The main matrix ran on the first, 462-unit scene; the confirmation table on the corrected 478-unit scene follows.

#### Main matrix, desktop, 462 tiles (first scene, see the loader note)

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:30:02.984Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 461, visible 461; repetitions per row: 3)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 48.0 | 16.7 / 33.4 / 50.0 | 15 | 9.90 / 13.30 | 55 | 65 | 146 | 64+42, 66 | 3 | 5 |
| A1 same rich tile drawn per frame, Canvas2D | 18.3 | 50.0 / 66.7 / 66.8 | 146 | 3.90 / 5.60 | 13 | 15 | 131 | 0+25, 23.8 | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.7 / 16.8 | 0 | 2.00 / 3.40 | 14 | 18 | 47 | 10+2, 4.5 | 2 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 58.6 | 16.7 / 16.8 / 33.4 | 1 | 4.10 / 6.10 | 27 | 31 | 112 | 10+3, 6.5 | 3 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.30 / 0.60 | 3 | 6 | 14 | 7+0, 1.6 | 3 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.30 / 0.60 | 8 | 12 | 15 | 24+2, 22.8 | 19 | 64 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.80 / 1.50 | 14 | 18 | 17 | 26+1, 20.7 | 10 | 85 |
| C1 Mapbox symbol layers, source.setData per frame | 57.9 | 16.7 / 16.8 / 33.4 | 3 | 0.20 / 5.80 | 96 | 306 | 29 | 229+21, 748.2 | 42 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 60.0 | 16.7 / 16.8 / 17.4 | 0 | 0.20 / 5.60 | 82 | 264 | 36 | 198+35, 542.8 | 35 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.10 / 0.30 | 7 | 12 | 10 | 27+0, 24.2 | 22 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 155 frames (2.68 s at 57.9 fps), p95 253; mbx-sym-upd: p50 78 frames (1.30 s at 60.0 fps), p95 119

#### Main matrix, desktop retina (2x), 462 tiles

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:35:14.720Z

**D2: desktop 1440x852 @2x (retina), no throttle** (zoom 12.4; alive 461, visible 461; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 35.0 | 33.3 / 33.5 / 50.1 | 52 | 10.30 / 14.00 | 43 | 50 | 140 | 53+27, 54.1 | 2 | 5 |
| A1 same rich tile drawn per frame, Canvas2D | 9.4 | 116.6 / 166.5 / 183.9 | 76 | 5.30 / 10.50 | 11 | 9 | 134 | 1+11, 14.3 | 2 | 19 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 33.4 | 1 | 2.60 / 3.90 | 17 | 21 | 56 | 11+1, 3.8 | 2 | 147 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 58.4 | 16.7 / 16.8 / 50.0 | 4 | 4.70 / 7.00 | 30 | 34 | 115 | 11+4, 6.9 | 2 | 147 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 17.0 | 0 | 0.40 / 0.90 | 4 | 7 | 14 | 14+1, 4.6 | 4 | 165 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.30 / 0.70 | 8 | 13 | 16 | 23+2, 27.1 | 17 | 128 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.80 / 1.50 | 15 | 20 | 18 | 25+2, 23.4 | 17 | 163 |
| C1 Mapbox symbol layers, source.setData per frame | 51.4 | 16.7 / 33.4 / 66.7 | 16 | 0.20 / 9.70 | 88 | 261 | 25 | 171+55, 465 | 33 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 59.6 | 16.7 / 16.8 / 33.4 | 2 | 0.20 / 8.40 | 81 | 249 | 32 | 149+84, 473.7 | 23 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.10 / 0.30 | 8 | 13 | 10 | 27+1, 26.6 | 22 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 78 frames (1.52 s at 51.4 fps), p95 121; mbx-sym-upd: p50 47 frames (0.79 s at 59.6 fps), p95 62

#### Main matrix, phone proxy (390x844 @3x, 4x CPU throttle), 462 tiles

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:40:36.783Z

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 461, visible 461; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 18.2 | 50.0 / 66.7 / 83.4 | 142 | 52.80 / 66.30 | 100 | 123 | 54 | 23+0, 22.7 | 5 | 1 |
| A1 same rich tile drawn per frame, Canvas2D | 10.5 | 100.0 / 116.7 / 183.3 | 83 | 45.00 / 59.70 | 61 | 114 | 136 | 1+10, 62.1 | 2 | 11 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 44.8 | 16.7 / 33.4 / 50.1 | 21 | 21.00 / 30.30 | 99 | 126 | 59 | 8+2, 18.3 | 4 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 27.9 | 50.0 / 66.7 / 166.7 | 137 | 44.10 / 58.70 | 100 | 123 | 59 | 6+2, 11.8 | 2 | 267 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.70 / 4.10 | 19 | 106 | 15 | 5+3, 17.6 | 3 | 343 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 50.0 | 1 | 1.50 / 5.90 | 43 | 113 | 16 | 24+3, 52.4 | 10 | 320 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 4.40 / 9.70 | 75 | 120 | 17 | 28+2, 56.2 | 13 | 219 |
| C1 Mapbox symbol layers, source.setData per frame | 4.9 | 216.8 / 333.3 / 366.7 | 39 | 17.80 / 61.60 | 100 | 183 | 8 | 62+33, 222.1 | 17 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 6.8 | 216.6 / 399.9 / 566.7 | 53 | 23.10 / 72.50 | 100 | 181 | 9 | 61+33, 223.1 | 16 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.60 / 1.60 | 38 | 111 | 13 | 31+0, 39.5 | 11 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 7 frames (1.43 s at 4.9 fps), p95 8; mbx-sym-upd: p50 8 frames (1.18 s at 6.8 fps), p95 9

#### Phone proxy with the device pixel ratio capped at 2

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:42:23.283Z

**P4c: phone 390x844 @2x (DPR capped), 4x CPU throttle** (zoom 11.4; alive 461, visible 461; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 16.4 | 66.6 / 83.3 / 83.4 | 132 | 57.70 / 71.80 | 99 | 120 | 40 | - | 3 | 1 |
| A1 same rich tile drawn per frame, Canvas2D | 12.4 | 83.3 / 83.4 / 116.7 | 100 | 37.20 / 55.40 | 66 | 113 | 133 | - | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 59.0 | 16.7 / 16.8 / 50.0 | 3 | 12.40 / 20.50 | 85 | 122 | 55 | - | 2 | 133 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 34.4 | 33.3 / 50.0 / 66.8 | 43 | 26.20 / 40.50 | 99 | 123 | 64 | - | 2 | 133 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.70 / 3.50 | 18 | 105 | 16 | - | 3 | 138 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.50 / 4.20 | 38 | 110 | 15 | - | 12 | 128 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 2.80 / 4.80 | 47 | 115 | 16 | - | 11 | 149 |
| C1 Mapbox symbol layers, source.setData per frame | 6.6 | 166.6 / 200.0 / 216.7 | 53 | 11.00 / 32.70 | 100 | 187 | 7 | - | 16 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 7.4 | 133.3 / 166.6 / 183.4 | 61 | 10.90 / 39.10 | 100 | 186 | 8 | - | 25 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.40 / 0.90 | 33 | 110 | 12 | - | 11 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 5 frames (0.76 s at 6.6 fps), p95 6; mbx-sym-upd: p50 5 frames (0.68 s at 7.4 fps), p95 5

#### Confirmation on the corrected scene: 478 units (all of the data; the first matrix ran on 462 units because of a loader bug, see 05-architecture.md appendix)

n = 478 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T01:41:44.172Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 477, visible 477; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 44.0 | 16.7 / 49.9 / 66.6 | 38 | 10.50 / 20.70 | 57 | 62 | 142 | - | 4 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 2.60 / 5.40 | 19 | 23 | 57 | - | 2 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 60.0 | 16.7 / 16.8 / 18.6 | 0 | 4.00 / 10.50 | 32 | 36 | 93 | - | 2 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 17.0 | 0 | 0.30 / 0.80 | 4 | 6 | 14 | - | 4 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.30 / 0.80 | 8 | 13 | 16 | - | 21 | 64 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 60.0 | 16.7 / 16.8 / 33.4 | 0 | 0.20 / 6.70 | 84 | 271 | 34 | - | 49 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 75 frames (1.25 s at 60.0 fps), p95 90

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 477, visible 477; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 14.8 | 66.7 / 100.0 / 116.7 | 119 | 64.80 / 95.00 | 100 | 124 | 39 | - | 4 | 1 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 57.9 | 16.7 / 33.3 / 66.7 | 7 | 15.60 / 23.80 | 95 | 125 | 58 | - | 3 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 39.9 | 33.3 / 50.0 / 100.2 | 67 | 29.70 / 47.90 | 100 | 127 | 75 | - | 2 | 267 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.30 / 3.30 | 15 | 105 | 14 | - | 4 | 343 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.10 / 3.60 | 27 | 109 | 14 | - | 10 | 320 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 4.8 | 216.7 / 366.7 / 616.6 | 40 | 20.00 / 50.10 | 100 | 184 | 8 | - | 17 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 7 frames (1.46 s at 4.8 fps), p95 8

#### Scaling: 570 tiles (the brief's figure; 108 are clones of real units at +-300 m)

n = 570 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:44:49.406Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 569, visible 569; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 34.7 | 33.3 / 33.5 / 50.1 | 42 | 15.70 / 18.60 | 60 | 68 | 140 | - | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 2.40 / 3.80 | 17 | 21 | 54 | - | 3 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 59.9 | 16.7 / 16.8 / 33.4 | 1 | 4.60 / 6.80 | 31 | 37 | 103 | - | 3 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.40 / 0.90 | 4 | 8 | 15 | - | 3 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.30 / 0.80 | 9 | 14 | 16 | - | 9 | 64 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.90 / 1.50 | 15 | 20 | 19 | - | 8 | 85 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.20 / 4.90 | 82 | 274 | 33 | - | 24 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 104 frames (1.73 s at 60.0 fps), p95 154

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 569, visible 569; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 12.4 | 83.3 / 100.0 / 100.1 | 100 | 77.40 / 89.30 | 100 | 122 | 36 | - | 3 | 1 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 52.8 | 16.7 / 33.3 / 50.0 | 8 | 15.70 / 28.70 | 94 | 125 | 57 | - | 3 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 26.7 | 33.4 / 66.6 / 83.4 | 91 | 32.40 / 58.70 | 98 | 124 | 62 | - | 3 | 267 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.80 / 3.70 | 19 | 106 | 14 | - | 2 | 343 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.40 / 2.80 | 33 | 111 | 15 | - | 11 | 320 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 4.40 / 8.00 | 68 | 117 | 17 | - | 12 | 219 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 5.3 | 183.5 / 300.0 / 366.6 | 43 | 20.80 / 60.60 | 100 | 181 | 9 | - | 16 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 6 frames (1.13 s at 5.3 fps), p95 8

#### Scaling: 900 tiles (headroom; 438 clones)

n = 900 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:47:16.129Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 899, visible 899; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 21.1 | 50.0 / 50.1 / 66.7 | 142 | 39.90 / 45.70 | 90 | 96 | 137 | - | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 3.90 / 5.20 | 25 | 29 | 71 | - | 3 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 56.5 | 16.7 / 33.3 / 33.4 | 5 | 6.90 / 8.90 | 42 | 48 | 134 | - | 3 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.40 / 0.80 | 4 | 7 | 14 | - | 3 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.30 / 0.70 | 8 | 12 | 14 | - | 9 | 64 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.7 / 16.8 | 0 | 1.20 / 2.10 | 19 | 24 | 19 | - | 12 | 85 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 59.5 | 16.7 / 16.8 / 33.4 | 0 | 0.20 / 7.80 | 84 | 261 | 27 | - | 50 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 124 frames (2.08 s at 59.5 fps), p95 209

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 899, visible 899; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 4.2 | 233.3 / 283.4 / 333.4 | 34 | 228.40 / 289.90 | 100 | 122 | 20 | - | 4 | 1 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 32.7 | 33.3 / 50.0 / 83.3 | 60 | 26.10 / 46.80 | 98 | 125 | 55 | - | 3 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 15.6 | 66.6 / 83.4 / 100.0 | 124 | 60.50 / 78.10 | 100 | 124 | 57 | - | 2 | 203 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.50 / 3.60 | 16 | 97 | 13 | - | 3 | 343 |
| B2 Mapbox custom layer, instanced sprites | 54.6 | 16.7 / 33.3 / 50.2 | 13 | 1.10 / 6.10 | 40 | 94 | 16 | - | 10 | 320 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 59.6 | 16.7 / 16.8 / 33.3 | 0 | 6.90 / 10.20 | 82 | 117 | 21 | - | 13 | 219 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 6.5 | 150.0 / 266.6 / 300.0 | 52 | 13.20 / 50.90 | 100 | 199 | 10 | - | 19 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 8 frames (1.23 s at 6.5 fps), p95 10

#### Overlay lag behind the map while the map pans at 667 px/s (px, 1440x852, 8 s, three repetitions)

| overlay drawn from | mean abs mismatch px | p95 | max | share of frames > 1 px |
|---|---:|---:|---:|---:|
| own rAF loop armed after the map started animating | 0.00 | 0.00 | 0.00 | 0.00 |
| own rAF loop armed before the map (the order when Play is pressed first) | 11.12 | 11.41 | 12.81 | 1.00 |
| map.on('render') (+ triggerRepaint) | 0.00 | 0.00 | 0.00 | 0.00 |

**Atlas memory actually used** (`results/atlas-used.json`, composite per-tile sprites, 5 s of playback, about 700 sprites baked for 462 tiles): **12 MB at 1x, 50 MB at 2x, 109 MB at 3x** (allocated pages 64 / 64 / 128 MB). Sprite memory scales with the square of the device pixel ratio.

**Code size** (minified with terser, brotli q11, `results/bytes.json`, includes ~3 KB of benchmark tile recipe each): A2 atlas 3.1 KB, B1 WebGL overlay 3.9 KB, B2 custom layer 5.7 KB, C symbol layers 4.0 KB.

**Backend parity** (`test/golden.mjs --diff`, one frozen instant, 1440x852): Canvas2D vs own WebGL canvas **0.044 %** of the pixels differ by more than 8/255; Canvas2D vs the Mapbox custom layer 0.127 % (the Mapbox logo is in that image). A 0.2 % golden threshold therefore works across backends.

### 3.3 What the numbers say

1. **Making the tile prettier inside today's architecture does not work.** A1 (the rich tile drawn per frame) falls to 9-18 fps on desktop and 10-12 on the phone proxy even though its JavaScript is only 4-5 ms: the cost is raster of `shadowBlur`/gradient/path calls, the GPU process runs at 130 %. Whatever the new look is, it must be **pre-rendered once and blitted**.
2. **The shipped routine already misses 60 fps on a fast desktop** (A0: 44-48 fps, JS 9-10 ms at 462 tiles, O(n^2) layout) and scales badly: 15.7 ms at 570 tiles, 39.9 ms at 900; on the phone proxy 15-18 fps at 462 (the app adds a 30 fps cap on phones, which my A0 does not apply) and **4 fps at 900**.
3. **A Canvas2D atlas fixes desktop completely** (A2: 60 fps, 2-4 ms, 14-25 % main thread, no frame over 33 ms at 462, 570 and 900 tiles) **and is marginal on the phone proxy** (45-59 fps at 462, 53 at 570, 33 at 900, main thread 94-99 % busy). The rotated-chevron variant (A3) is worse (28-40 fps): every extra draw per tile costs.
4. **WebGL instanced sprites are an order of magnitude cheaper** (B1: 0.3 ms JS desktop, 1.3-1.8 ms phone proxy, 3-19 % of the main thread, 60 fps in every configuration up to 900 tiles). The Mapbox custom layer (B2) costs the same JS and about 2x the main thread (and dropped to 55 fps at 900 tiles on the phone proxy); the hybrid with a Canvas2D text overlay (B3) loses a lot of that (68-82 % main thread on the phone proxy), so text should come from the same atlas.
5. **Mapbox symbol layers cannot carry 60 Hz moving tiles.** Positions are geometry, so every frame has to go through `setData`/`updateData` and the worker; the main thread sits at 82-96 % on desktop with three cores of worker time, the **displayed data lags the data sent by 0.8-2.7 s** (sentinel feature, median) and on the phone proxy the page runs at **5-7 fps**. `feature-state` is cheap (C3: 7 % main thread) but can only change paint properties, never a position, and in my configuration a `setFeatureState` on a source that also feeds symbol layers and is updated per frame threw a Mapbox-internal TypeError (`reading 'paint'` in `updateFeatures`; not root-caused, **Unverified** whether it is specific to my blank style). Symbol layers also place with collision detection, which either **hides tiles** (vital information) or, with allow-overlap, overlaps them: the owner's rule needs an own layout either way.
6. **One loop, synchronised to the map, removes the camera lag** (section 1.3 J5): both `map.on('render')` and a custom layer give 0.00 px, an own loop armed first gives 11.1 px.
7. **Garbage**: A0 allocates fresh unit objects every frame (64 minor + 42 major GCs in the 8 s window, 66 ms total, D1); the atlas renderers 10 minor + 2-3 major GCs and 4.5-6.5 ms; B1 7 minor, 1.6 ms. The engine's scene is typed arrays and is designed to allocate nothing per frame in steady state; the prototype still allocates a few small objects per frame (the camera-signature string, the effect list, the contact effect's `Map` at 10 Hz), so its GC has to be measured before claiming zero.
8. **Atlas design matters on phones**: composite per-tile sprites with baked labels re-bake whenever the strength bucket or the facing bucket changes (about 700 sprites for 462 tiles in 5 s) and take 109 MB at 3x. The product atlas must be **parts** (side x type x tier bodies, badge glyphs, chevrons) plus a **label cache** keyed by text, with a DPR cap of 2 (P4c) and page sizes that grow with demand.

### 3.4 Decision

| criterion | A2 Canvas2D atlas | B1 own WebGL2 canvas | B2 Mapbox custom layer | C Mapbox symbol layers |
|---|---|---|---|---|
| 60 Hz continuous motion of ~480 tiles | desktop yes; phone proxy marginal | yes everywhere measured | yes | **no** (0.8-2.7 s lag, 5-7 fps phone) |
| frame sync with the map | in `map.on('render')`: exact | same | exact (same pass) | n/a |
| tiles never hidden by collision | yes (own layout) | yes | yes | only without collision (then overlap) |
| text | system fonts, halo, crisp | same atlas | same atlas | SDF glyphs, different look |
| coupling to Mapbox internals | none | none | custom-layer API and GL state | style spec only |
| z-order vs Monuments layers | above everything (as today) | same | can sit between layers | can sit between layers |
| pixel-exact goldens | yes | yes, parity 0.04 % | yes | hard |
| risks | phone main thread | second WebGL context | state leaks into Mapbox's context | already failed |

**Recommendation.** One engine core, two renderer backends sharing one atlas and one scene: **Phase 1 ships Canvas2D** (zero new risk, same DOM structure as today, 60 fps on desktop, and the phone gets the DPR cap and a frame-budget guard), **Phase 2 adds the WebGL2 backend (B1)** that the engine selects on coarse-pointer devices or when its own frame-time probe says the Canvas2D path exceeds budget. B2/B3 are not needed unless the owner wants tiles sandwiched between Mapbox layers. WebGL is always available when the map is (Mapbox GL v3 itself needs WebGL), so the Canvas2D backend is a performance fallback and the golden-image reference, not a compatibility fallback.

---

## 4. The engine architecture

### 4.1 Layers

```
   host: React app + Mapbox map + zustand store                                   unchanged
        |   9 asserted hooks (section 5)                                          [host contract v1]
   +----v-------------------------------------------------------------------------------------+
   | glue         bind(store, flash, sound, reduced, trails)  on  paused  playing  units  pick  drawn |
   | CORE         (DOM-free, loads in node:vm; its behaviour is tested without a browser)         |
   |   timeline   placements -> per-unit keyframes (typed arrays); stateAt(T)                          |
   |   motion     plug-ins: linear | smooth | (route, dwell-then-march, ...)                          |
   |   clock      target T, displayed Td, jump policy: follow | glide | cross-fade | cut (reduced)    |
   |   scene      per-tile arrays: lng lat bearing strength alpha modelled; wall-clock lifecycle       |
   |   layout     plug-ins: none | relax | (lab strategy)   warm start + smoothing + invariants        |
   |   fx         plug-ins: contact | flash | selectGlow | trails | ...                                |
   |   metrics    stage timers, frame ring, drops; budgets are assertions                              |
   | RENDER       skin plug-ins (recipes) -> atlas of parts -> backend plug-in (canvas2d | webgl2)      |
   |              hit grid (picking), describe() (what is on screen, with provenance)                  |
   | DEV          Tuning Studio (?tune=1), fixtures, golden images, metric tests                       |
   +--------------------------------------------------------------------------------------------------+
```

### 4.2 The frame pipeline (what runs inside Mapbox's render event)

1. **Clock**: target `T = store.currentTick + fraction` (read fresh from the store, which fixes J2); displayed time `Td` follows it exactly while playing; a scrub, a day jump or Follow Your Ancestor's `setTick(1)` becomes a glide (about 140-650 ms, eased) up to 40 ticks and a cross-fade beyond; a pause keeps the sub-tick position; resuming never slides backwards; reduced motion cuts and quantises to whole ticks.
2. **Sample**: for every unit, binary-searched own keyframes -> the motion model -> position and bearing (shortest arc); strength, disposition and notes from the governing keyframe.
3. **Lifecycle**: a tile that becomes alive after the first frame enters with a 350 ms wall-clock fade (a unit paused exactly on its first documented tick must still end fully visible: the first version of my prototype tied the fade to game time and the shipped `desktop-fixes` suite caught it at once).
4. **Filter and project**: the store's filters (same rules as the shipped routine), double-precision Web Mercator checked against `map.project` at attach time (falls back to `map.project` when the map is rotated or pitched).
5. **Skin**: a cheap integer key per tile; only when it changes is the sprite re-resolved from the atlas (designed to allocate nothing in steady state).
6. **Layout**: strategy plug-in, offsets persist and are smoothed in time (time constant 110 ms), so a tile never snaps.
7. **Draw**: trails (derived from the timeline, not accumulated), leader lines, glows, tiles (selected and pinned last), one `drawImage` per tile.
8. **Hit grid**: the drawn rectangles and true positions, for picking (the nearest of a tile's drawn or true position within 16 px for a mouse, 44 px for touch, or inside the tile's rectangle).
9. The loop keeps itself alive with `map.triggerRepaint()` only while time moves or something animates; **idle = no frames**.

### 4.3 Modules (the extension points)

A module is `G.register(kind, name, { version, label, params, ...hooks })`. Kinds in the prototype: **motion** (`sample`), **layout** (`solve`), **fx** (`prepare`, `glow`, `isOn`), **skin** (`size`, `key`, `draw`, optional `glowBox`). Designed, not built: **renderer** (backend), **lifecycle** (entrance/exit policy), **jump** (glide/cross-fade policy), **popup** (token set and transition set for the DOM popups). `params` declares range, step, default and label; the registry turns them into the tuning schema, the validation and the Studio sliders, so **a module that declares params gets its controls for free**.

### 4.4 Design tokens, tuning file, versioning

* **Tokens** (`tokens.json`, designed): colours, sizes, durations, easings and fonts with names, compiled into CSS custom properties (one `<style id="gtanim-tokens">`, the same pattern as MON's `gtmon-css`) and into the constants the skins read, so popups, legend and tiles share one palette. A Node test checks every text/background pair for contrast (WCAG 4.5:1) and every token for use.
* **Tuning file** (`tuning.json`, built: `G.exportTuning()` / `G.validateTuning()`): `{ "$schema": "gtanim.tuning/1", "engine": "0.1.0-proto", "skin": "classic", "motion": "smooth", "layout": "relax", "dprCap": 2, "jumpTicks": 4, "jumpMs": 650, "crossfadeTicks": 40, "pick": { "mouse": 16, "touch": 44 }, "fx": { "trails": true, "contact": true, "flash": true, "selectGlow": true }, "params": { "motion.smooth": { "tension": 1 }, "layout.relax": { "passes": 6, "gap": 2, "restore": 0.12, "tau": 110 }, "skin.classic": { "pill": 0.72, "body": 0.88 } } }`. In the product it is a file in the repository, embedded at build time (zero extra request); the Studio's export replaces it; a test validates it against the schema generated from the registry (unknown module, unknown parameter, value outside its range).
* **Versioning**: every module has a `version` and should carry a `changelog` array; the skin goldens live in `golden/<skin>@<version>/`, so a pixel change without a version bump fails and a bump creates the next golden directory; the tuning file pins the engine and module versions; a generator prints a CHANGELOG of the modules from their `changelog` fields.

### 4.5 The Tuning Studio (built, `?tune=1`)

A fixed panel, opened only with `?tune=1` (aria-labelled, closable): live metrics (frames, tiles, frames over 33 ms, interval p50/p95, stage times for sample / project / skin / layout / draw, atlas MB, overlaps), a select for the skin, the motion model and the layout strategy (each with the version), one slider per declared parameter of the selected module, a switch per effect, **Export JSON** (clipboard and `window.__gtanimExport`), **Reset**, **Legacy** (the kill switch). Verified in real Chrome (`test/app-studio.mjs`): choosing a skin changes the drawn pixels, the corner-radius slider exists because the skin declared the parameter, the export parses and carries the chosen skin, the effect added from a plain file appears with its switch. Screenshot: `05-proto/results/shot-studio.png`. In the product the Studio would be a lazy chunk (an overlay file with a content-hashed name that the ledger accepts) loaded only for `?tune=1`; its 4.4 KB (1.5 KB brotli) are small enough to ship in the entry as well.

### 4.6 Truth policy

* Printed digits are the governing keyframe's (Documented). Interpolated values (position, bearing, the visual strength bar) are **Modelled** and flagged per tile and frame.
* Derived flags (engaged units) are **Computed** from world distance (150 m by default, tunable), not from pixels, so they do not change with zoom (the shipped glow uses 40 screen pixels, which is about 1.2 km at zoom 11 and 18 m at zoom 17: Computed from the Web Mercator scale at 39.8 degrees north).
* `G.describe()` (built) lists every drawn tile with its rectangle, its `modelled` flag and its documented strength; the evidence test that asserts that every label string is traceable to a data field is **designed, not built**. The label rule is a skin responsibility: the prototype's rich skin squeezes long order-of-battle designations into a 62 px tile (illegible, visible in `shot-skin-rich.png`); a shipped skin must abbreviate by rule or size the tile to the text, never compress it.
* Exits: the data has no exit records, so the engine holds a unit at its last keyframe (the shipped behaviour). Owner decision 5 asks for eased exits: that needs an `exit` flag in the data (the data-fuel brief).

### 4.7 Popups

They stay DOM/React and keep their contract (`currentTick`, `selectedUnitId`, `pinnedUnitId`, `vignetteData`, `placementsByTick`). The engine writes nothing new to the store. What it adds for them: the `drawn()`/`pick()`/`units()` read API, the token set for a restyle without code, and motion tokens for entry/exit transitions. Deeper popup redesigns are separate anchored patches on those components and are outside this brief.

---

## 5. Patch strategy: group `ANIM`

### 5.1 The pattern (already in the repo)

Readable sources -> a generator -> an asserted patch file, applied by the unmodified T0 builder as an optional group, exactly like MON (`tools/t0/mon/gtmon.js` -> `build-mon.mjs` -> `patches-next/MON.json`, built by `mon_build.py`). In this prototype: `05-proto/src/*.js` (plus `skins/*.js`) -> `build-anim-proto.mjs` (terser with compress and mangle **off**, ASCII only, deterministic; `--check` fails when the patch file drifts from the sources) -> `dist/ANIM-proto.json` -> `anim_build.py` (a modified copy of `mon_build.py`, imports `tools/t0/build.py` unmodified, feeds the group in memory). Real location when adopted: `tools/t0/anim/` and `tools/t0/patches-next/ANIM.json`, registered in `trains.json` as an optional group after MON. **No new build dependency** (a 30-line concatenation, not a bundler).

### 5.2 The nine hooks (all `expect: 1`, text of the entry bundle after A..CP, A2, SHELL, PERF and MON)

| patch id | anchor (start of the asserted text) | what changes | count in R1a / R1b / R1c / R1c+MON |
|---|---|---|---|
| `ANIM:engine+e1` | `function e1(c,f,x,M,P,z,H){const l=y1(x,M,0);lS(…)}` | inserts the engine and its one `bind` line (store `yn`, flash map `Qx`, sound `N4`/`jk`, trails flag `Vk`); `e1` (every paused redraw: tick change, filter, resize, map move) goes to `GTANIM.paused(...)`, the shipped body stays below as the fallback | 1 / 1 / 1 / 1 |
| `ANIM:Ed-tail` | `const xe=y1(he,st,ut),pe=dA(xe,P);cA(pe),lS(M,P,xe,…),Fp=requestAnimationFrame(…)}` | the playing frame: **the shipped loop keeps the clock** (tick accumulator, store writes, prefetch, flash); drawing goes to `GTANIM.playing(...)` | 1 / 1 / 1 / 1 |
| `ANIM:Ed-end` | `const Xe=he[s2]\|\|[],xt=dA(Xe,P);cA(xt),lS(…);return` | the final frame at tick 675 | 1 / 1 / 1 / 1 |
| `ANIM:Ed-mobile-cap` | `if(M&&M.width<500){if(Ed._lastMobileMs\|\|` | the 30 fps phone cap is not applied to the engine | 1 / 1 / 1 / 1 |
| `ANIM:y1` | `function y1(c,f,x){if(c!==i2c\|\|f<i2t){` | every other consumer (minimap, pick index, phone fly-to) sees the engine's continuous positions at the integer tick | 0 / 0 / 1 / 1 (needs group B) |
| `ANIM:pick-desktop` | `const ht=pt.useCallback(Xe=>{const xt=M.current;if(!xt\|\|!P.current)return;` | the tile under the pointer as drawn (select + pin), empty ground deselects | 1 / 1 / 1 / 1 |
| `ANIM:pick-mobile` | `$t.on("click",nr=>{if(!ki.current)return;` | same contract as the shipped handler (popup record `Wo`, select, pin) | 0 / 1 / 1 / 1 (needs group C) |
| `ANIM:resize-guard` | `g&&(cv.width!==g.clientWidth\|\|…)&&(cv.width=…);e1(cv,m,…)` | `GtbgRepaint` must not reset the backing store the engine sized for the DPR | 1 / 1 / 1 / 1 |
| `ANIM:mon-units` | `function unitsNow(){var st=yn.getState(),…` | **only with MON**: the Monuments click arbitration must use the units as drawn, not the latest keyframe; when adopted this one line belongs in MON's own source | 0 / 0 / 0 / 1 |

Counted with `05-proto/test/anchors-count.mjs` against the built entries; the builder re-asserted all nine on R1c + MON.

### 5.3 What is replaced, what is kept

* **Replaced**: the draw routine (`lS` body is no longer reached), the interpolation (`y1`), the pick (`ht` and the phone click), the frame cap, the canvas sizing.
* **Kept as is**: the clock (`Ed`: accumulator, store writes, day prefetch, casualty flash `uF`/`Qx`, end of battle), the store, every popup, the legacy functions themselves (they are the kill-switch fallback).
* **Takes over from legacy**: trails (derived from the timeline; the legacy trail canvas `cA`/`Kx`/`so` is no longer fed), the engaged glow and the sound hook (same throttle, same `N4()` flag).

**The timer, in two steps.** *Phase 1 (the prototype)* replaces what **draws** and leaves what **counts**: `Ed` still owns the tick accumulator, the store writes (one per tick, so every popup keeps its contract), the prefetch of days 2 and 3 and the casualty flash, and it still re-arms its own `requestAnimationFrame`; but each frame it only hands `(tick, fraction)` to the engine and asks Mapbox for a repaint, and the engine draws **inside the map's render event** (one frame, one camera, J5). That keeps the patch to four anchors around `Ed` and leaves every duty of the loop where the tests already cover it. *Phase 2 (optional)* replaces `Ed` by an engine clock (anchors `Gk`, `Op` and the body of `Ed`): continuous time that does not depend on a store write per tick, speed ramps, and no 100 ms delta clamp semantics; the store would still be written once per tick for the popups. It brings the loop's duties (prefetch, flash, end of battle, the HUD) into the engine, so it should follow the Phase 1 evidence rather than precede it.

### 5.4 What must keep working (checked)

| feature | how the engine keeps it | evidence |
|---|---|---|
| selection, pin, unit panel | `pick` -> `selectUnit`/`pinUnit` on the same store; selection ring drawn from the store state | journeys J4, IN-03, KEY-02 pass; real click selects the same unit as the shipped picker on a stationary unit (`app-proto` pick step) |
| hover | the shipped hover tooltip is dead code (wrong props); the engine's hit grid is the base for a real one | Read; not hover-tested |
| popups (vignette, event card, unit panel, toasts) | untouched DOM; integer tick still written by `Ed` | journeys, DF-05 pass; the cards are visible in every screenshot |
| Soldier's Eye View | independent of the unit layer (a modal with eight fixed viewpoints, `Yk`/`rO`) | Read |
| Follow Your Ancestor | reads keyframes directly, selects through the store, sets `currentTick: 1` (a jump: the engine glides or cross-fades) | J8, C5-01 pass; the deep link `?ancestor=U-20ME` selects the unit in the prototype |
| Monuments layer (MON) | inside the map, untouched; click arbitration uses `drawn()` (hook 9) | MON builder suite 17/17; MONL-12 (Walkthrough byte-identical) passes; VMON-04 needs the test change in 6.5 |
| deep links (`tick`, `unit`, `day`, `ll`, `z`, `vignette`, `ancestor`) | state goes through the store; the engine reads the store | J8, DATA-01 pass |
| mobile shell | second map and canvas `bn`; same hooks (`Gk`/`Ed`, `e1`, click); DPR cap 2 on a 3x phone | IN-05 (real CDP touch, tap selects) pass; phone A/B in 6.2 |
| Walkthrough | not touched (code and data byte-identical, MONL-12) | passes |
| reduced motion | cut, whole ticks, no pulse, no fade, no glide | `reduced_motion` step: flag true, engine drew, 0 errors |

### 5.5 Order, kill switch, fallback

ANIM applies **after MON** (`optional_groups: ["MON", "ANIM"]`); it needs groups B (the carry-forward `y1`), C (phone click) and the A2 helper. **Kill switch**: `?anim=legacy` (tested: engine off, the shipped renderer draws), `localStorage.gtanim_off=1`, and `enabled:false` in the tuning file, so the shipped renderer can be restored per visitor without a deploy; the group can also be dropped from the train. **Automatic fallback**: every entry point is guarded; an exception switches the engine off for the session and the shipped renderer takes over on the next call (strict mode, set by tests with `window.__gtanimStrict`, rethrows instead so the suites see the error). The fallback is exercised by `app-studio.mjs` (`fault_fallback`, a fault injected through `window.__gtanimFault`).

### 5.6 Build, determinism, gates

The prototype tree built with `python docs/pitch/anim/05-proto/anim_build.py --train R1c --out tmp/pitch-anim/arch/anim-R1c` (about 20 s): all anchors matched once, all gates passed. One gate taught the **source rules** the engine must follow: `unresolved-globals` rejects bare globals that are not on `browser-globals.json` (my first build failed on `undefined` and `CanvasRenderingContext2D`; the source now reads names from `window` and uses `void 0`). Determinism: the generator is a pure function of the sources (`--check`); `tools/t0/determinism.py` would pick the group up once it is registered (not run: the group is not registered).

### 5.7 Size budget

| item | raw | brotli |
|---|---:|---:|
| entry bundle R1c + MON (control) | 2,338,435 B | 524,887 B |
| + ANIM prototype (engine, 2 skins of the shipped look and the benchmark tile, 1 example skin, 3 effects, Studio, 2 motion models, 2 layouts; the generator does not mangle names) | +39,966 B | **+12,330 B (+2.35 %)** |
| of which the DOM-free core (core, timeline, motion, clock; mangled and compressed alone, `bytes.json`) | 7.8 KB | 3.1 KB |
| WebGL2 backend (`GLSprites`: shader, buffers, atlas upload, draw; **not** in the prototype tree, measured in the benchmark) | 3.5 KB | 1.4 KB |

Proposed budget: **<= 30 KB brotli for the whole engine including the WebGL backend**; the Studio may be a lazy chunk.

---

## 6. The prototype: what ran, what it showed

### 6.1 What it is

`05-proto/src/` (about 700 lines in 11 files (692), plus 35 lines of example modules): core registry, timeline, two motion models, clock, a reference layout, three effects, atlas, two skins (`classic` = the shipped look, `rich` = the benchmark tile), Canvas2D renderer, Studio, glue; `05-proto/skins/` (a skin and an effect in under 50 lines each); `build-anim-proto.mjs`, `anim_build.py`; tests `test/engine.test.mjs` (Node), `golden.mjs`, `replica-check.mjs`, `app-proto.mjs`, `app-studio.mjs`. It is a **walking skeleton**: it proves the hooks, the contracts and the numbers; it is not the finished engine (one backend, a reference layout that does not reach zero overlaps, no parts atlas, no evidence marks on tiles, no exit lifecycle).

### 6.2 Real app, A/B, same script, same tree minus the group (Measured)

Real Chrome, the harness of the repo, 1440x900, deep link `?tick=300&z=13.2`, 8x playback for 10 s after 2.5 s of warm-up, a fresh page per measurement; control = R1c + MON, prototype = the same + ANIM; **three alternating repetitions** (proto, control, proto, ...), the range over the repetitions is shown. `engine ms` = the engine's own stage time per frame (mean). Cells are over the animation-frame cadence of the page (a second `requestAnimationFrame` loop that only records timestamps; identical in both trees).

| desktop, 8x | fps | frame interval p50 / p95 / max (ms) | frames > 20 / > 33 / > 50 ms (of ~600) | main thread busy % | script % | engine ms |
|---|---:|---|---|---:|---:|---:|
| **1x CPU** control (shipped renderer) | 53.6-60.0 | 16.7 / 16.8-33.3 / 16.8-50.0 | 0-60 / 0-7 / 0 | 60-63 | 51-54 | - |
| **1x CPU** prototype (ANIM) | 60.0 | 16.7 / 16.8 / 16.8-17.4 | 0 / 0 / 0 | 30-43 | 25-36 | 2.5-3.8 |
| **4x CPU** control (shipped renderer) | 13.3-16.9 | 66.6-66.7 / 66.7-116.7 / 116.8-199.9 | 133-168 / 132-165 / 101-120 | 99-100 | 83-84 | - |
| **4x CPU** prototype (ANIM) | 26.0-33.7 | 33.3-33.4 / 49.9-66.7 / 50.1-133.4 | 221-245 / 52-103 / 4-37 | 99-100 | 83-83 | 13.9-18.2 |

**Tile positions captured per frame while playing at 8x** (the shipped canvas is read through a `translate` hook, the engine through its `describe()`; the shipped tiles are matched by drawing order, so identity is approximate while the set of drawn units changes):

| | frames | tracked tiles | spikes (step > 8 px and > 6x neighbours) | per frame | spikes over 60 px |
|---|---:|---:|---:|---:|---:|
| control | 542 | 415 | 1019 | 1.88 | 180 |
| prototype | 541 | 420 | 32 | 0.06 | 0 |

**Phone shell** (375x812 at 3x, real CDP touch; one run each; the shipped phone path draws at most every 33 ms, so its page cadence is not its draw cadence): 

| phone | fps 1x CPU | main % | fps 4x CPU | p95 ms | frames > 33 ms | main % | engine ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| control | 60 | 22.6 | 37 | 50 | 57 | 97.1 | - |
| prototype | 60 | 24.8 | 56.3 | 33.3 | 6 | 98.6 | 10.87 |

The 1x-CPU rows depend on how busy the machine is: this batch of three alternating repetitions (the table) found the shipped renderer at 53.6, 60.0 and 60.0 fps; two earlier batches on earlier builds of the prototype (same script) found it at 34.8-52.3 fps (six repetitions; 7-41 frames over 33 ms), while the prototype read 60.0 fps in all nine repetitions. At 4x CPU all nine repetitions of the shipped renderer (12.0-16.9 fps) are below all nine of the prototype (17.6-33.7 fps). The phone-shell rows are one run each and noisy (an earlier run of the same script gave 25.6 fps for the shipped path and 36.9 for the prototype at 4x).

Other steps of the same script on the prototype (desktop): pick selected U-II-1-1, panel `U | First Brigade, First Division, Second Corps (Cross's Brigade) | U-II-1-1 | ⎘` (control: U | First Brigade, First Division, Second Corps (Cross's Brigade) | U-II-1-1 | ⎘); Follow Your Ancestor deep link opens the panel (1); reduced motion: flag true, engine drew 183 frames; page errors 0, first-party console errors 0.

### 6.3 Node metrics on the real data, 8x, 2,528 frames (Measured / Replayed, `test/results.json`)

| metric | shipped (replayed) | engine linear | engine smooth |
|---|---:|---:|---:|
| one-frame displacement spikes (step > 8 px and > 6x its neighbours) | 889 | 20 | 33 |
| ... of which over 60 px | 605 | 5 | 7 |
| frames a unit stands still inside a gap (documented displacement > 50 m) | 100 % | 10 % | 15 % |
| appearances of the 407 units that appear after tick 1 | 814 | 407 | 407 |
| direction reversals after motion | 153 | 104 | 24 |
| keyframes (762 with motion) where speed jumps by > 20 % | n/a (it teleports) | 708 | **0** |
| largest deviation from the straight chord between keyframes | 0 m | 0 m | median 0, p90 40, max 334 m |

Per-frame cost of the engine's stages in the real app at 8x (`engineStageMsMean`, mean over the window): sample 0.02-0.03 ms, project 0.1, skin 0.2-0.3, **layout 1.3-1.5, draw 1.1-1.5**, total 2.5-3.8 ms at 1x CPU and 14-18 ms at 4x CPU on the desktop viewport, 11 ms at 4x on the phone shell (the spread comes from the machine's load by other agents' browsers; see 6.2).

### 6.4 The repo's own suites against the prototype tree

| suite (`tests/t0/...spec.mjs --dist <ANIM tree>`) | result | notes |
|---|---|---|
| journeys-desktop (41 tests: load, play, pan/zoom/pinch, **select**, search, day jumps, **Follow Your Ancestor**, keys, clock, data, a11y of the shell, **phone tap select**) | 41/41 | Mapbox requests 223/300 |
| monuments (MON builder suite, 17 tests) | 10/10 + 2/2 + 2/2 + 3/3 | run in 4 slices (the harness's 300-request cap; one whole run exhausts it and fails the later tests for that reason alone) |
| verify-monuments (independent MON verifier, 16 tests) | 15/16; failed: T0-VMON-04 | VMON-04 clicks units at the position of the **latest keyframe** (`unitsAt`); see 6.5.3 |
| desktop-fixes (10 tests) | 9/10; failed: T0-DF-03 | DF-03 passes its unit-follows-the-map clauses and fails at the clause that expects ink on the **legacy trail canvas**; see 6.5.3 |

### 6.5 Findings the prototype produced (each one is a design input)

1. **Entrance fade tied to game time hides a unit that is paused on its first tick** (desktop-fixes DF-03 and DF-07 failed on it): lifecycle animation is wall-clock, with an instant first frame.
2. **Pick policy**: the shipped picker takes the nearest unit within 0.002-0.003 deg (about 100-180 px at zoom 15). In my first phone pick test (wrong geometry of my own: a tap 100-180 px from the nearest unit) the shipped picker selected a unit and the first engine pick deselected. The engine picks by nearest drawn position with a reach of 16 px (mouse) / 44 px (touch), tunable; the owner decides how forgiving a tap should be.
3. **Tests that encode the shipped semantics**: `desktop-fixes` DF-03 asserts ink on the legacy trail canvas (z-index 8) after playing, which the engine no longer feeds (trails are drawn from the timeline into the unit canvas); `verify-monuments` VMON-04 clicks "the units as the shipped layer draws them" (`unitsAt`, latest keyframe), which differs from the engine's mid-gap position by up to 200 px at tick 226 (Computed for `U-II-1-2`). Both need the scene API (`drawn()`), and MON's `unitsNow` needs the one-line hook of section 5.2. These are changes to **product tests**, which I was not allowed to make.
4. **GL/Canvas parity is good enough to share goldens** (0.04 %).
5. **The reference layout is too slow and not good enough** (2.0 ms at 174 tiles, 9.5 ms at 413, residual overlaps): the layout lab's strategy must be incremental.
6. **A one-line bug in the tuning path** (parameters are keyed `kind.name`, my first `G.tune` split on every dot, so the Studio sliders did nothing) was found only because the golden "mutate" run reported *no* difference for a changed parameter: a regression test must be shown to fail (section 7).

### 6.6 The extensibility surface, in the real app (`test/app-studio.mjs`, Measured)

| check | result |
|---|---|
| default | engine on, `classic` skin, canvas painted (187,648 non-transparent pixels) |
| **kill switch** `?anim=legacy` | engine off, the shipped renderer draws (150,006 painted pixels), backing store 1440 px wide as before |
| skin by URL (`?anim=skin:rich`, `?anim=skin:minimal,layout:none`) | engine reports the skin and layout, canvas painted (229,872 / 123,274 pixels); screenshots `shot-skin-*.png` |
| Studio (`?tune=1`) | panel opens; the skin select lists the three skins with their versions; choosing a skin changes what is drawn; the corner-radius slider exists because the skin declared the parameter; the effect added as a plain file has its switch; **Export JSON** yields 872 bytes that parse and carry the chosen skin |
| module added as a file | `fx-select-glow.js` is registered, switched on and in the schema in the real build |
| **automatic fallback** | a fault injected into the engine (`window.__gtanimFault`): the engine switches itself off, the shipped renderer takes over (151,483 painted pixels), **0 page errors** |

---

## 7. How each piece is tested

| piece | test | status |
|---|---|---|
| core (timeline, motion, clock, tuning, registry) | `05-proto/test/engine.test.mjs`: DOM-free, vm, real data, 1.6 s | **9 checks pass** |
| animation metrics | same file: spikes, frozen frames, appearances, reversals, C1 continuity, overshoot, path deviation, as assertions with thresholds | pass; thresholds become `budgets.json` |
| fidelity of the shipped-semantics replay | `test/replica-check.mjs` against the real `y1` in Chrome | **0 mismatches in 311,178 comparisons** |
| renderer, per skin version | `test/golden.mjs`: fixture page with a fake map, fake clock, real data, 3 skins x 3 fixtures; pixel diff in the page (no image library), `--update` after a deliberate change, **`--mutate` proves the test can fail** | 9/9 identical on re-render; 9/9 differences detected when a parameter is changed (0.7-21 % of pixels) |
| backend parity | `golden.mjs --diff` between Canvas2D and WebGL shots | 0.044 % / 0.127 % |
| tuning file | `G.validateTuning` against the registry schema; unknown module, unknown parameter, out of range | pass |
| frame budget | `app-proto.mjs`: real app, 8x, 1x and 4x CPU, p95 interval, frames over 33 ms, engine stage times; run as an A/B against the control tree | runs (section 6.2) |
| integration | the repo's suites unchanged against the ANIM tree (section 6.4) + a new `anim.spec.mjs` for the Studio, the kill switch, the fallback, skin switching (`app-studio.mjs` is its prototype) | prototype passes |
| hook drift | the builder's `expect: 1` plus `build-anim.mjs --check` | passes |
| size | the gate's `bytes` check with a brotli delta limit | proposed |
| evidence | `G.describe()` vs the data: every drawn string traceable | designed |

**Adding a test for a new skin**: add its fixtures to `FIXTURES`/`SKINS` in `golden.mjs`, run with `--update` once, review the images, commit `golden/<skin>@<version>/`.

---

## 8. Adding a skin or an effect in under 50 lines

Both files are loaded in the real build (`build-anim-proto.mjs` includes `skins/*.js`) and tested (`engine.test.mjs`; `app-studio.mjs` switches to the skin by URL and from the Studio).

**A skin, 21 lines** (`05-proto/skins/skin-minimal.js`): `?anim=skin:minimal` or the Studio select; its `corner` slider appears by itself.

```js
G.register("skin", "minimal", {
  version: "1", label: "Minimal flat tile", pad: 8,
  params: { corner: { type: "range", min: 0, max: 12, step: 1, def: 3, label: "Corner radius (px)" } },
  size: function (t) {                                // footprint of the whole tile in CSS px, centred on the unit's true position
    var w = t.doc < 600 ? 40 : t.doc < 1500 ? 54 : 68;
    return { w: w, h: 18, cx: 0, cy: 0, geo: { w: w, h: 18 } };
  },
  key: function (t) {                                 // changes whenever the picture changes
    return (((t.doc < 600 ? 0 : t.doc < 1500 ? 1 : 2) * 21 + Math.round(t.str / t.maxS * 20)) * 2 + t.side) * 4 + (t.sel ? 2 : 0) + (t.flash ? 1 : 0);
  },
  draw: function (g, k, t, ax, ay, geo) {             // g is scaled to CSS px; the anchor is at (ax, ay)
    var x = ax - geo.w / 2, y = ay - geo.h / 2, c = t.side ? "#c43a3a" : "#3a6bc4", r = G.P("skin", "minimal", "corner");
    g.fillStyle = "rgba(10,12,20,.86)"; g.beginPath(); g.roundRect(x, y, geo.w, geo.h, r); g.fill();
    g.fillStyle = t.flash ? "#ffffff" : c; g.fillRect(x, y, 4, geo.h);
    g.strokeStyle = t.sel ? "#e8d5a3" : c; g.lineWidth = t.sel ? 2 : 1; g.beginPath(); g.roundRect(x, y, geo.w, geo.h, r); g.stroke();
    g.font = "bold 10px sans-serif"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(G.cxName(t.id), x + 8, y + geo.h / 2 - 1, geo.w - 10);
    g.fillStyle = c; g.fillRect(x + 4, y + geo.h - 3, (geo.w - 4) * Math.min(1, t.str / t.maxS), 2);
  }
});
```

**An effect, 14 lines** (`05-proto/skins/fx-select-glow.js`): a pulsing gold glow under the selected or pinned tile; its switch (`fx.selectGlow`) and slider (pulse rate) appear in the Studio.

```js
G.register("fx", "selectGlow", {
  version: "1", label: "Selected-tile glow",
  params: { hz: { type: "range", min: 0.2, max: 4, step: 0.1, def: 1.2, label: "Pulse rate (Hz)" } },
  prepare: function (S, now) {                        // S = engine state: S.sel / S.pin (unit ids), S.tl (the sampled timeline)
    this.i = -1; var id = S.pin || S.sel;
    if (id && S.tl) { var j = S.tl.index[id]; if (j !== void 0 && S.tl.alpha[j] > 0) this.i = j; }
    this.a = G.host && G.host.reduced() ? 0.7 : 0.55 + 0.45 * Math.sin(now / 1000 * 2 * Math.PI * G.P("fx", "selectGlow", "hz"));
  },
  glow: function (i) { return i === this.i ? this.a : 0; }    // alpha 0..1 of the glow under tile i
});
```

A motion model is one `sample(tl, o, c, p, T, out)` function (the 20 lines of `20-motion.js`); a layout strategy is one `solve(L, dt)`.

---

## 9. Roadmap and budgets

**Phase 1 (engine without a redesign).** Register ANIM as an optional group after MON; core, Canvas2D backend, `classic` skin (parity), smooth motion, clock, pick, kill switch, tokens, Studio; the product tests of 6.5 (finding 3) adapted; `anim.spec.mjs`; golden per skin. Gate: journeys 41/41, MON suites, A/B on the frame budget below.
**Phase 2.** WebGL2 backend and the parts atlas (shared with Canvas2D), the layout lab's strategy with the zero-overlap invariant, evidence marks on tiles, label rules from the order of battle, popup tokens.
**Phase 3.** The new skin(s), exits and entrances from data, the Studio as a lazy chunk, golden CI.

| budget | target | prototype today |
|---|---|---|
| frame interval, desktop 8x | p95 <= 18 ms, 0 frames over 33 ms | 60.0 fps, p95 16.8 ms, 0 frames over 33 ms (9 runs) |
| frame interval, 4x CPU | p95 <= 20 ms (needs the WebGL backend and an incremental layout) | 26-34 fps, p95 50-67 ms (Canvas2D + reference layout; shipped renderer 13-17 fps, p95 67-117 ms) |
| engine time per frame, 480 tiles | <= 2 ms at 1x | 2.5-3.8 ms |
| one-frame displacement spikes per 1,000 frames (Node replay, all units, 8x) | <= 15 | 13 (shipped replay: 352) |
| overlapping drawn tile pairs | 0 at the tested fixtures | not met by the reference layout |
| sprite memory used | <= 24 MB at 2x, <= 48 MB on phones (DPR cap 2) | 50 MB composite sprites at 2x |
| entry bundle, brotli | +<= 30 KB | +12.3 KB |

---

## 10. Risks, unknowns, decisions

**Risks.** (1) *Name drift*: the anchors are tied to the R1c text; a rebuilt baseline fails loudly (asserted), it does not misapply. (2) *Product tests encode the shipped semantics* (6.5.3): they must be updated in the same change. (3) *Interpolation is Modelled geometry*: the motion model is a historical-accuracy choice. (4) *Phone performance is Unverified on real devices*; the proxy says Canvas2D is marginal. (5) *Memory on phones*: composite sprites are not acceptable at 3x. (6) *Second WebGL context* (B1) on low-end phones (not measured). (7) *Browser support*: `roundRect` needs Chrome 99 / Safari 16 / Firefox 112 (the engine checks `supported()` and stays off otherwise). (8) *The data*: the 1,804 records leave 17-hour-scale gaps (max 658 ticks); smooth motion over them is a long slow crawl, not a march.

**Unverified.** Real phones; Safari/Firefox; battery; the camera-lag race inside the production app; hover (dead in the shipped code); the Mapbox feature-state error outside my blank style; the HUD and re-render costs of perf-runtime (not re-measured).

**Decisions for the owner.** (a) Motion model: smooth (invents up to 334 m of curve) or linear with ease. (b) How forgiving a tap/click should be (16/44 px vs the shipped ~100-180 px). (c) Engagement: 150 m world distance or something else. (d) Label content: designation from the order of battle with a fixed abbreviation rule. (e) Whether Phase 1 may change the product tests (DF-03, VMON-04) and MON's `unitsNow`. (f) Whether tiles must sit between Mapbox layers (decides B2). (g) The DPR cap (2 recommended).

---

## 11. Reproduction

Everything ran from the repo root (`C:/Users/mlege/gettysburg-map`, node 24, python 3.11), ports 9580-9589 (`T0_PORT_BASE=9580`), Chrome profiles under `tmp/pitch-anim/arch/chrome-profile/`.

```
# benchmarks (about 45 min; needs tmp/pitch-anim/arch/vendor/{mapbox-gl.js,mapbox-gl.css 3.24.1 from the Mapbox CDN, fonts/DIN Pro Medium/0-255.pbf via fetch-fonts.mjs})
bash docs/pitch/anim/05-bench/run-all.sh ; node docs/pitch/anim/05-bench/summarize.mjs > docs/pitch/anim/05-bench/results/tables.md ; node docs/pitch/anim/05-bench/bytes.mjs
# the engine, its patch group, the scratch trees
node docs/pitch/anim/05-proto/build-anim-proto.mjs [--check]
python docs/pitch/anim/05-proto/anim_build.py --train R1c --out tmp/pitch-anim/arch/anim-R1c          # with MON + ANIM
python docs/pitch/anim/05-proto/anim_build.py --train R1c --out tmp/pitch-anim/arch/anim-R1c-control --control
# tests
node docs/pitch/anim/05-proto/test/engine.test.mjs                  # Node, real data
node docs/pitch/anim/05-proto/test/golden.mjs [--update|--mutate]   # renderer goldens
node docs/pitch/anim/05-proto/test/replica-check.mjs --dist tmp/pitch-anim/arch/anim-R1c-control/dist
node docs/pitch/anim/05-proto/test/app-proto.mjs --dist <tree>/dist --label proto|control [--phone] [--only play8x,play8x_4xcpu --rep N]
node docs/pitch/anim/05-proto/test/app-studio.mjs --dist tmp/pitch-anim/arch/anim-R1c/dist
node tests/t0/desktop-fixes.spec.mjs --dist tmp/pitch-anim/arch/anim-R1c/dist     # likewise journeys-desktop, monuments (--filter slices), verify-monuments
```

Files: `05-bench/{run.mjs,run-all.sh,make-scene.mjs,fetch-fonts.mjs,bytes.mjs,summarize.mjs,page/*,results/*}`, `05-proto/{src/*,skins/*,build-anim-proto.mjs,anim_build.py,dist/*,test/*,golden/*,results/*}`.

---

## Appendix A. A correction I made to my own data loader

The first benchmark scene (462 units, 1,583 keyframes) and my first data statistics came from a loader that, like a scratch script of another brief, overwrote a tick's records when a later day's files also contained that tick. The app's `addPlacementsForDay` **merges** by unit instead. The files of days 2 and 3 do contain early ticks (tick 1 has 48 records in the placement file and 73 in all files); the overwrite dropped 104 distinct (unit, tick) keyframes and 16 units and showed 1 unit at tick 1 instead of 71. I found it when the replica check disagreed with the real `y1` at tick 1. After the fix: 478 units, 1,687 keyframes, 71 at tick 1 (the app's own journey test says 70). All data numbers in this file are post-fix; the first benchmark matrix (462 units, tables D1/D2/P4/P4c/570/900/sync) was **not** re-run in full: a confirmation run on the 478-unit scene (A0, A2, A3, B1, B2, C2 at D1 and P4, two repetitions) is shown beside it and gives the same ranking and the same orders of magnitude.

## Appendix B. Things I noticed that belong to other briefs (unverified unless stated)

* The shipped tile is drawn rotated by `bearing - 90` degrees with its long side along the facing; the placement schema says a line of battle "extends perpendicular to bearing". Read from the code and the schema text only; not checked against the sources.
* The shipped label shows `cx(id)` ("I/1/6W"), never the designation, because `Y4` receives an empty order of battle (Read).
* The unit hover tooltip never renders (Read; props mismatch).
* The legacy trail canvas is 300x150 until the first window resize (Read; perf-runtime-10 agrees).
