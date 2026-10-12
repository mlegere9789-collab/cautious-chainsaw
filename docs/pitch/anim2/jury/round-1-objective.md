# Round 1, objective measurements: D4 Dispatch and D1 Quiet Cartographer

Instrument readings, not opinions. Every number below was produced by running the built pages of the two surviving directions in real Chrome and measuring pixels, draw calls and engine frames; no number is read from a fork's own result files; the tables and the PASS / FAIL cells are generated from the raw results by `tools/report.py`, and the prose quotes them. The jury's three critics judged from pictures; this file is what the same pages do when they are measured.

* **What was measured.** The tree at commit `6628412` (after both polish rounds and the three round-1 critics), exported with `git archive` so nothing could change underneath, served from `127.0.0.1:10200`; the served page is checked byte for byte (SHA-256) against the export before every run. Four configurations: **D1 day** (the page's default), **D1 night**, **D4 paper** (the default) and **D4 aerial**. No product code, fork, test or shipped file was edited.
* **Same engine, same layout.** D1 day and night differ only in colour and ground, as D4 paper and aerial do; so the lines that depend only on layout (overlaps, jitter, rest, own-versus-merged, crowd names, what a popup covers) have the same numbers for the pair, and the lines that depend on colour differ.
* **Real Chrome 155 (headless) on Windows 11, Intel Core Ultra 7 265H with its Arc GPU (ANGLE, Direct3D 11)**, 1440 x 900 at DPR 2 (and DPR 1 for the 1x text sizes) and 390 x 844 at DPR 2 with touch emulation for the phone; the engine stepped on a virtual clock (`?manual=1`) for everything that needs determinism, the page's own animation loop for the real-time checks. No request left the machine.
* **The harness draws what the forks show.** Rebuilt with each fork's own recipe, the opening view (S1a) and the selected close-up (S4) came out **pixel-identical to the PNGs the forks shipped** in three of four cases and 99.9994 percent identical in the fourth (D4 S4: 3.9 in a million pixels differ by more than 8/255).

## Result in one paragraph

**Neither direction passes.** Of the 15 lines measured, D4 aerial passes 7, D4 paper 6, D1 day 5 and D1 night 4. What passes everywhere is the engine's own promise (no two solid marks overlap: 0 in 35 still scenes and 0 in each of 4,140 motion frames per configuration, checked on pixels), the byte budget and the desktop draw time; the colour-vision test passes except for D1 night, short by 0.3 dE00. What fails everywhere: no configuration has every mark at 4.5:1 against its ground (on the more favourable of two readings 1 percent of D4 paper's marks reach it and 37 to 44 percent of the others'); interface text sits 0.01 to 0.05 px under 11 px; a crowd names a formation or a corps in 97 percent of D1's crowd marks but only 41 percent of D4's; the interface and the popups hide marks; travelling marks overlap solid ones at 42 percent opacity; the motion jitters; and the draw time on a 4x slower CPU is over a frame. And one failure no critic could see in a picture: **D1's layout never comes to rest when frames take 22 ms or longer, and its crowd marks then step by up to 89 px every frame**.


## Verdicts

| line | D1 day | D1 night | D4 paper | D4 aerial |
|---|---:|---:|---:|---:|
| Contrast of every text, at least 4.5:1 | **FAIL** | **FAIL** | **FAIL** | **PASS** |
| Contrast of every mark against its backdrop, at least 4.5:1 | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| Smallest rendered text, at least 11 CSS px (1x and phone) | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| Vital-core overlaps in every scene, 0 | **PASS** | **PASS** | **PASS** | **PASS** |
| Overlap between two solid marks in any frame of the motion strips, 0 | **PASS** | **PASS** | **PASS** | **PASS** |
| Overlap between any two marks, travelling marks at 42 percent included, in any frame, 0 | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| A crowd says what it stands for | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| Draw time at the densest tick, at most 8 ms (desktop) | **PASS** | **PASS** | **PASS** | **PASS** |
| Draw time with the CPU slowed 4x (phone proxy), p95 inside one 60 Hz frame | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| Bytes | **PASS** | **PASS** | **PASS** | **PASS** |
| Sides distinguishable under colour-vision deficiency, dE00 at least 20 | **PASS** | **FAIL** | **PASS** | **PASS** |
| Popups cover no vital tile | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| The interface (bars, edges) hides no vital tile | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| Frame-to-frame jitter in the strips (60 fps) | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| The layout comes to rest at a phone frame rate (30 fps) | **FAIL** | **FAIL** | **PASS** | **PASS** |

The numbers behind each cell:

* **Contrast of every text, at least 4.5:1**
  * D1 day: FAIL: 116 of 1496 text items under 4.5:1
  * D1 night: FAIL: 116 of 1487 text items under 4.5:1
  * D4 paper: FAIL: 7 of 990 text items under 4.5:1
  * D4 aerial: PASS: 0 of 989 text items under 4.5:1
* **Contrast of every mark against its backdrop, at least 4.5:1**
  * D1 day: FAIL: 310 of 525 marks stay under 4.5:1 even on the more favourable of two readings (cloth or outer silhouette against the bare ground; median 3.9); 65% reach 3:1
  * D1 night: FAIL: 296 of 526 marks stay under 4.5:1 even on the more favourable of two readings (cloth or outer silhouette against the bare ground; median 3.7); 57% reach 3:1
  * D4 paper: FAIL: 328 of 332 marks stay under 4.5:1 even on the more favourable of two readings (cloth or outer silhouette against the bare ground; median 3.1); 55% reach 3:1
  * D4 aerial: FAIL: 208 of 332 marks stay under 4.5:1 even on the more favourable of two readings (cloth or outer silhouette against the bare ground; median 3.6); 56% reach 3:1
* **Smallest rendered text, at least 11 CSS px (1x and phone)**
  * D1 day: FAIL: smallest 10.96 px; 43 items under 11 px
  * D1 night: FAIL: smallest 10.96 px; 43 items under 11 px
  * D4 paper: FAIL: smallest 10.95 px; 17 items under 11 px
  * D4 aerial: FAIL: smallest 10.95 px; 17 items under 11 px
* **Vital-core overlaps in every scene, 0**
  * D1 day: PASS: 0 overlaps in 9 measured scenes and 26 popup/base scenes (0 core-ink pairs, 0 lettering boxes under another mark, 0 core pairs in popup scenes)
  * D1 night: PASS: 0 overlaps in 9 measured scenes and 26 popup/base scenes (0 core-ink pairs, 0 lettering boxes under another mark, 0 core pairs in popup scenes)
  * D4 paper: PASS: 0 overlaps in 9 measured scenes and 26 popup/base scenes (0 core-ink pairs, 0 lettering boxes under another mark, 0 core pairs in popup scenes)
  * D4 aerial: PASS: 0 overlaps in 9 measured scenes and 26 popup/base scenes (0 core-ink pairs, 0 lettering boxes under another mark, 0 core pairs in popup scenes)
* **Overlap between two solid marks in any frame of the motion strips, 0**
  * D1 day: PASS: 0 of 4140 frames have two solid marks (drawn alpha 0.5 or more) whose core ink overlaps
  * D1 night: PASS: 0 of 4140 frames have two solid marks (drawn alpha 0.5 or more) whose core ink overlaps
  * D4 paper: PASS: 0 of 4140 frames have two solid marks (drawn alpha 0.5 or more) whose core ink overlaps
  * D4 aerial: PASS: 0 of 4140 frames have two solid marks (drawn alpha 0.5 or more) whose core ink overlaps
* **Overlap between any two marks, travelling marks at 42 percent included, in any frame, 0**
  * D1 day: FAIL: 194 of 4140 frames have two marks whose core ink overlaps (0 of them between two solid marks)
  * D1 night: FAIL: 185 of 4140 frames have two marks whose core ink overlaps (0 of them between two solid marks)
  * D4 paper: FAIL: 91 of 4140 frames have two marks whose core ink overlaps (0 of them between two solid marks)
  * D4 aerial: FAIL: 98 of 4140 frames have two marks whose core ink overlaps (0 of them between two solid marks)
* **A crowd says what it stands for**
  * D1 day: FAIL: 21 of 611 crowd marks carry no formation or corps (vague or residual wording); own-mark share at z13.5 34%
  * D1 night: FAIL: 21 of 611 crowd marks carry no formation or corps (vague or residual wording); own-mark share at z13.5 34%
  * D4 paper: FAIL: 400 of 676 crowd marks carry no formation or corps (vague or residual wording); own-mark share at z13.5 11%
  * D4 aerial: FAIL: 400 of 676 crowd marks carry no formation or corps (vague or residual wording); own-mark share at z13.5 11%
* **Draw time at the densest tick, at most 8 ms (desktop)**
  * D1 day: PASS: densest tick, DPR 2: renderer.draw in the running page median 1.6 / p95 1.9 ms (worst of three views); drawn in isolation with read-back median 99.5 / p95 118.0 ms
  * D1 night: PASS: densest tick, DPR 2: renderer.draw in the running page median 1.6 / p95 2.0 ms (worst of three views); drawn in isolation with read-back median 87.2 / p95 110.8 ms
  * D4 paper: PASS: densest tick, DPR 2: renderer.draw in the running page median 0.8 / p95 1.2 ms (worst of three views); drawn in isolation with read-back median 55.7 / p95 74.8 ms
  * D4 aerial: PASS: densest tick, DPR 2: renderer.draw in the running page median 0.9 / p95 1.2 ms (worst of three views); drawn in isolation with read-back median 62.1 / p95 69.5 ms
* **Draw time with the CPU slowed 4x (phone proxy), p95 inside one 60 Hz frame**
  * D1 day: FAIL: CPU slowed 4x: renderer.draw median 21.1 / p95 37.6 ms (worst view), slowest view runs at 18 fps
  * D1 night: FAIL: CPU slowed 4x: renderer.draw median 11.6 / p95 28.5 ms (worst view), slowest view runs at 19 fps
  * D4 paper: FAIL: CPU slowed 4x: renderer.draw median 4.6 / p95 18.7 ms (worst view), slowest view runs at 20 fps
  * D4 aerial: FAIL: CPU slowed 4x: renderer.draw median 4.6 / p95 20.4 ms (worst view), slowest view runs at 18 fps
* **Bytes**
  * D1 day: PASS: page 2.25 MB (834 KB gzip); the skin layer (code, tokens, stylesheets, fonts) 186 KB; first view downloads 5.45 MB
  * D1 night: PASS: page 2.25 MB (834 KB gzip); the skin layer (code, tokens, stylesheets, fonts) 186 KB; first view downloads 5.45 MB
  * D4 paper: PASS: page 2.34 MB (914 KB gzip); the skin layer (code, tokens, stylesheets, fonts) 274 KB; first view downloads 5.39 MB
  * D4 aerial: PASS: page 2.34 MB (914 KB gzip); the skin layer (code, tokens, stylesheets, fonts) 274 KB; first view downloads 5.39 MB
* **Sides distinguishable under colour-vision deficiency, dE00 at least 20**
  * D1 day: PASS: identifying colours 52 dE00 at the worst simulation; 99.6% of Union-vs-Confederate mark pairs reach 20
  * D1 night: FAIL: identifying colours 20 dE00 at the worst simulation; 97.0% of Union-vs-Confederate mark pairs reach 20
  * D4 paper: PASS: identifying colours 49 dE00 at the worst simulation; 97.6% of Union-vs-Confederate mark pairs reach 20
  * D4 aerial: PASS: identifying colours 49 dE00 at the worst simulation; 99.9% of Union-vs-Confederate mark pairs reach 20
* **Popups cover no vital tile**
  * D1 day: FAIL: 12 marks lie under a popup and 202 marks leave the visible map (dissolved or cut) when a rail, panel, card or sheet opens, summed over 20 popup scenes (popup ink touches the core of 31 marks, a count that includes the subject mark of each popup)
  * D1 night: FAIL: 12 marks lie under a popup and 202 marks leave the visible map (dissolved or cut) when a rail, panel, card or sheet opens, summed over 20 popup scenes (popup ink touches the core of 31 marks, a count that includes the subject mark of each popup)
  * D4 paper: FAIL: 87 marks lie under a popup and 73 marks leave the visible map (dissolved or cut) when a rail, panel, card or sheet opens, summed over 20 popup scenes (popup ink touches the core of 20 marks, a count that includes the subject mark of each popup)
  * D4 aerial: FAIL: 88 marks lie under a popup and 73 marks leave the visible map (dissolved or cut) when a rail, panel, card or sheet opens, summed over 20 popup scenes (popup ink touches the core of 20 marks, a count that includes the subject mark of each popup)
* **The interface (bars, edges) hides no vital tile**
  * D1 day: FAIL: with no popup open, in 6 scenes: 0 marks under the bars, 66 marks dissolved by the bars, 0 marks cut by a map edge that is not the screen edge (175 more are cut by the screen edge, as on any pannable map)
  * D1 night: FAIL: with no popup open, in 6 scenes: 0 marks under the bars, 66 marks dissolved by the bars, 0 marks cut by a map edge that is not the screen edge (175 more are cut by the screen edge, as on any pannable map)
  * D4 paper: FAIL: with no popup open, in 6 scenes: 0 marks under the bars, 0 marks dissolved by the bars, 25 marks cut by a map edge that is not the screen edge (125 more are cut by the screen edge, as on any pannable map)
  * D4 aerial: FAIL: with no popup open, in 6 scenes: 0 marks under the bars, 0 marks dissolved by the bars, 25 marks cut by a map edge that is not the screen edge (125 more are cut by the screen edge, as on any pannable map)
* **Frame-to-frame jitter in the strips (60 fps)**
  * D1 day: FAIL: largest velocity change 22.2 px in one frame (phone zoomin); 81 steps over 6 px in the static-camera strips; 100 opacity jumps over 0.35
  * D1 night: FAIL: largest velocity change 22.2 px in one frame (phone zoomin); 81 steps over 6 px in the static-camera strips; 100 opacity jumps over 0.35
  * D4 paper: FAIL: largest velocity change 21.6 px in one frame (phone zoomin); 20 steps over 6 px in the static-camera strips; 48 opacity jumps over 0.35
  * D4 aerial: FAIL: largest velocity change 21.6 px in one frame (phone zoomin); 20 steps over 6 px in the static-camera strips; 48 opacity jumps over 0.35
* **The layout comes to rest at a phone frame rate (30 fps)**
  * D1 day: FAIL: keeps moving at 14 of 18 constant frame times tested (from 45 fps down; up to 89 px in one frame, every frame); in the real page with the CPU slowed 1x, 2x, 4x, 6x it keeps moving in 5 of 8 runs (first at 2x slowdown)
  * D1 night: FAIL: keeps moving at 14 of 18 constant frame times tested (from 45 fps down; up to 89 px in one frame, every frame); in the real page with the CPU slowed 1x, 2x, 4x, 6x it keeps moving in 5 of 8 runs (first at 2x slowdown)
  * D4 paper: PASS: comes to rest at all 18 frame times tested (60 down to 20 fps), desktop and phone; in the real page with the CPU slowed 1x, 2x, 4x, 6x it keeps moving in 0 of 8 runs
  * D4 aerial: PASS: comes to rest at all 18 frame times tested (60 down to 20 fps), desktop and phone; in the real page with the CPU slowed 1x, 2x, 4x, 6x it keeps moving in 0 of 8 runs

## Which bars are the owner's and which are mine

Given in the task: text and marks at 4.5:1 against the sampled backdrop; text at 11 CSS px or more at 1x and on the phone; no overlap of vital cores in any scene or any motion frame; draw time at most 8 ms on a desktop at the densest tick (median and p95); sides at CIEDE2000 20 or more under the three colour-vision simulations; no popup over a vital tile (a count per popup scene); jitter reported as the largest per-frame step. Everything else below is a reading I had to choose, stated here so it can be argued with:

| line | the reading I chose |
|---|---|
| mark contrast | two readings per mark, both against the **bare ground** ring 2 to 4 device px outside all the mark's ink: the colour of its cloth, and the colour of its outermost solid ink (its silhouette). The line passes only if no mark stays under 4.5:1 on the better of the two; the table also gives 3:1 (the WCAG non-text figure) |
| text contrast | an item passes if the median ratio of its colour (alpha included) against the pixels under its glyph box, halo pixels where the skin draws a halo, is 4.5 or more (3 for text of 24 px or 18.66 px bold); 6 to 8 items per D1 configuration drawn at alpha under 0.3 (dissolving at the screen edge) are listed but not counted |
| bytes | skin layer (skin code, tokens, stylesheets, ground code, fonts) at most 300 KB, page at most 1 MB gzipped. The task gave no budget |
| a crowd says what it stands for | pass only if no crowd mark's text lacks a formation or corps word (Bde, Div, Corps, artillery, cavalry) or carries "others", "no formation" or a bare "unlisted" |
| jitter | pass if, in every strip, no settled mark changes its velocity by more than 2 px in one frame (about the push cap of the display layer), no settled mark steps more than 6 px in a static-camera strip, and no mark's opacity jumps by more than 0.35 in one frame |
| rest at a phone frame rate | the layout must stop moving at every constant frame time from 16.7 ms to 50 ms, and in the real page with the CPU slowed 1x, 2x, 4x and 6x |
| draw time on a 4x slower CPU | p95 of `renderer.draw` inside one 60 Hz frame (16.7 ms); no bar was given |
| interface hides no vital tile | with no popup open: no mark under a bar, none dissolved by a bar, none cut by a map edge that is not the screen edge (D4's map is a band between masthead and dock) |

## What the measurements show, most serious first

**1. D1's layout does not come to rest at a phone frame rate.** Stepped at a constant frame time after a jump to the field view and given 900 frames to settle, D1 is perfectly still at 60 and 50 fps. At 45 fps (22 ms) and at every slower rate down to 20 fps, 73 to 77 crowd marks (64 to 67 on the phone view) move in 119 of the 120 frames measured afterwards, by up to 89 px in one frame (73 px on the phone view), and the engine reports itself busy in all 120. D4 is still at all nine frame times. The real page agrees: with the CPU slowed 2x (frames still 17 ms) D1's desktop view moves in 179 of 180 frames (81 marks, up to 90 px); with 4x and 6x its phone view does too; D4 is still in all 8 real-time runs. At full CPU speed D1 rests (0 marks move), which fits the forks' own checks, run at a steady 60 fps on a fast machine, not showing it. A phone that holds 30 fps, or any machine that drops a few frames, would show the crowd flags jumping by tens of pixels continuously. I did not diagnose the cause (a scratch run, not saved, showed it clearing about 12 s after frames sped up again). Related and measured: after a jump to the field view D1's desktop view needs 211 frames (3.5 s) to settle where D4 needs 98 (1.6 s).

**2. Popups and panels hide marks in both directions, in different ways.** D4 puts panels over the map: the Tune and About panels each lie on the core ink of 27 of the 65 marks in view, the welcome card on 15 (14 in aerial), a tour step on 8, and on the phone the legend on 5 to 7 of the 15 to 17 marks in view; in all, 87 marks lie under a popup across 20 popup scenes (88 in aerial), and the legend and Chronicle rails push 28 more marks out of the narrowed map in each of two scenes. D1 never lets desktop popups lie on a mark, because it dissolves a mark that comes within 16 px of a control group, a panel or the rail: in the 6 scenes with no popup open 66 marks are dissolved by the bars (22 of the 138 marks in the opening view), and the legend, Chronicle, Tune, About and welcome scenes dissolve 30 or 31 marks each (33 for the welcome card; 202 marks in all over the ten scenes in which a panel, rail, card or sheet opens); on the phone D1's sheet does cover marks (9 of 33 under the event sheet). A mark that is dissolved is as hidden as one that is covered. D4's map band also cuts 25 marks across the six no-popup scenes at the edges of the band (a mark half hidden by the masthead or the dock).

**3. Crowds.** At the opening zoom D4 shows 11 percent of the units in view as their own mark (8 to 14 across 16 views) and merges the rest: 31 crowd marks per view on the desktop, 22 on the phone where only 4 percent of the units stand alone. D1 shows 34 percent (30 to 40) with 32 crowd marks per view and 24 percent on the phone. By z15 it is 79 percent for D1 and 49 for D4; at z16.5 96 and 94. What a D4 crowd says is "II Corps & others", "Union, no formation": 37 percent of D4's crowd marks at z13.5 carry vague wording and a further 24 percent name no formation or corps at all, and the same text appears on two marks in the same view 13 times per view on average (205 repeats in 16 views). D1's crowds name a brigade, a division or a corps (97 percent), 3 percent say only "Union, unlisted" or "Confederate, unlisted", and the same text still repeats on two marks 3 times per view (52 in 16 views).

**4. A mark is not 4.5:1 against the ground it stands on.** On the better of the two readings the share of marks at 4.5:1 or more is 41 percent for D1 day (65 percent reach 3:1), 44 for D1 night (57 percent at 3:1), 1.2 for D4 paper (55 at 3:1) and 37 for D4 aerial (56 at 3:1). D4 paper's outer silhouette has a median ratio of 2.5 against the sepia ground; D4 aerial's blue and red cloth has a median of 1.4 against the photograph and its outer silhouette 3.6. D1 night's cloth is 90 percent at 4.5:1 but only 74 of 530 marks could be measured that way. On the phone the picture is the same (D4 paper 1.5 percent, the others 41 to 53).

**5. Text.** Interface text passes 4.5:1 everywhere (lowest 5.3, D1 day). Map lettering passes in D4 (lowest 4.6 paper, 5.1 aerial) and fails for 5 of 988 items in D1 day and 1 of 985 in D1 night. **Place names are the weak spot**: 111 of 257 fail in D1 day (57 percent pass; Plum Run, Emmitsburg Rd, Carlisle St and other road and stream names, median ratios 1.1 to 4.4), 115 of 251 in D1 night, 7 of 59 in D4 paper (4.3 to 4.4, Plum Run, Tiber Creek, Stevens Run), 0 in D4 aerial. Text size: the map lettering is 12 px and the place names 11 px in both; interface text includes items at 10.95 to 10.99 px (the "Modelled" and "Documented" evidence tags, the clock and its note): 40 items of 222 in D1 and 13 of 220 in D4 at 1x, 3 of 29 and 4 of 33 on the phone. That is a rem fraction, a miss by under 0.05 px, and the fix is one line; it is still under 11.

**6. Motion.** The engine's contract (two solid marks never overlap) holds on pixels: 0 of 4,140 frames per configuration, with every pair of near marks drawn alone and intersected. What does overlap is the engine's own "travel": a mark that has to move to another place dims to 42 percent and slides there, and while it is dim it is allowed to lie on another mark. That happens in 194 of 4,140 frames for D1 day (185 night), 91 for D4 paper (98 aerial), up to 10 pairs in one frame (D1 night). The dim is not eased: a mark goes from 100 to 42 percent in one frame (traced on D4 paper at 4x play: the travelling flag turns on in the same frame), over the strips D1 has 100 opacity jumps of more than 0.35 in one frame and D4 48; the traced one is the travel dim. Velocity changes are largest in D1: with a static camera up to 9.3 px in one frame (1x play at the Angle) against D4's 3.9, and with 4x play 8.1 against 3.3; zoom glides give single-frame changes of 22 px in both on the phone view. Per-frame steps with the camera's motion taken out reach 17 px (D1) and 10 px (D4) in the play strips. Selection and pan are clean in both (selection moves at most 1.7 px in D1 and 0.3 in D4).

**7. A slower CPU.** The unthrottled page draws in 0.4 to 2.0 ms per frame at the densest tick (D1 field view 1.6 / 1.9 ms median / p95, D4 0.8 / 1.2) and holds 55 to 60 fps; the engine's own step costs 2.2 to 5.0 ms median and 4.5 to 7.8 ms p95. With the CPU slowed 4x the field view draws in 21 / 38 ms in D1 day (11.6 / 28.5 night) and 4.5 / 18.7 ms in D4 paper, and the slowest view of each configuration runs at 18 to 20 fps (table). D4 draws 111 tiles at the field view against 213 for D1.

**8. What holds.** No two solid marks overlap in any still scene (35 scenes: 9 with every mark drawn alone, 861 marks for D1 and 477 for D4, and 26 popup and base scenes) or any motion frame. Both pages are fine on bytes (D1 2.25 MB with 186 KB of skin layer, D4 2.34 MB with 274 KB, the fonts being the difference; the first view downloads 5.4 to 5.5 MB with the aerial tiles). Colour vision: D1 day, D4 paper and D4 aerial separate the sides' identifying colours by 45 to 61 dE00 in every simulation (97.6 to 100 percent of Union-against-Confederate mark pairs reach 20; for D4 paper the 5th percentile of the pairs is 20.6); D1 night's identifying colours are pale tints and sit at 19.7 under protanopia (22.7 normal, 23.1 deuteranopia, 33.3 tritanopia), 0.3 short.


## Tables

### Text contrast

Cell: median / lowest item median / share of items at or above the need (4.5:1, 3:1 for large text); items = distinct text drawn in a scene, contrast of the text colour against the pixels it stands on (halo pixels where the skin draws a halo), 9 desktop and 3 phone scenes pooled.

| text | D1 day | D1 night | D4 paper | D4 aerial |
|---|---:|---:|---:|---:|
| unit lettering on the map | 9.5 / 1.6 / 99.5% (5 of 988 fail, 8 more fading under the bars, not counted) | 13.6 / 2.3 / 99.9% (1 of 985 fail, 6 more fading under the bars, not counted) | 9.5 / 4.6 / 100.0% (0 of 678 fail) | 12.8 / 5.1 / 100.0% (0 of 677 fail) |
| place names on the map | 5.0 / 1.1 / 56.8% (111 of 257 fail) | 4.7 / 1.6 / 54.2% (115 of 251 fail) | 5.3 / 4.3 / 88.1% (7 of 59 fail) | 8.8 / 6.2 / 100.0% (0 of 59 fail) |
| interface text (DOM) | 7.5 / 5.3 / 100.0% (0 of 251 fail) | 9.2 / 7.9 / 100.0% (0 of 251 fail) | 15.1 / 5.9 / 100.0% (0 of 253 fail) | 15.8 / 8.2 / 100.0% (0 of 253 fail) |

The lowest items (ratio, scene, text, size):

* D1 day unit: 1.6 s6 "I/2/4" 12px; 3.6 s2 "2nd Bde, 2nd Div, 5th Corps" 12px; 4.0 s2 "Benning's Bde" 12px; 4.0 s2 "Weed's Bde" 12px
* D1 day place: 1.1 s7 "Carlisle St" 11px; 2.3 s8 "Carlisle St" 11px; 2.6 s4 "Taneytown Rd" 11px; 2.7 s6 "Hancock Ave" 11px
* D1 night unit: 2.3 s6 "I/2/4" 12px
* D1 night place: 1.6 s6 "Plum Run" 11px; 1.9 s7 "Plum Run" 11px; 1.9 s8 "Plum Run" 11px; 2.0 s8 "Plum Run" 11px
* D4 paper place: 4.3 s1c "Tiber Creek" 11px; 4.3 s7 "Stevens Run" 11px; 4.3 s7 "Tiber Creek" 11px; 4.4 s4 "Plum Run" 11px

### Mark contrast

Cell: median ratio / share of marks at 3:1 or more / share at 4.5:1 or more. Desktop scenes S1a to S4 pooled; phone pooled in the last column.

| config | marks | cloth colour against the bare ground | outer silhouette against the bare ground | better of the two | cloth against its own outline (median / 4.5:1) | phone: better of the two, 3:1 / 4.5:1 |
|---|---:|---:|---:|---:|---:|---:|
| D1 day | 530 | 3.6 / 83% / 3.3% (n=240) | 3.7 / 57% / 40.2% (n=525) | 3.9 / 65% / 41.0% (n=525) | 2.5 / 2.1% | 74% / 50.9% (n=108) |
| D1 night | 530 | 6.6 / 100% / 90.5% (n=74) | 3.6 / 57% / 43.0% (n=526) | 3.7 / 57% / 43.7% (n=526) | 5.4 / 73.0% | 56% / 52.8% (n=108) |
| D4 paper | 336 | 3.2 / 61% / 2.3% (n=175) | 2.5 / 36% / 0.0% (n=332) | 3.1 / 55% / 1.2% (n=332) | 7.1 / 99.4% | 67% / 1.5% (n=67) |
| D4 aerial | 336 | 1.4 / 0% / 0.0% (n=256) | 3.6 / 56% / 37.3% (n=332) | 3.6 / 56% / 37.3% (n=332) | 5.1 / 67.6% | 56% / 40.9% (n=66) |

### Text size

Cell: smallest size at 1x on the 1440 x 900 page (items under 11 px of items) / on the 390 x 844 phone shots.

| config | map lettering | place names | interface text |
|---|---:|---:|---:|
| D1 day | 12.00 (0 of 856 under 11) / 12.00 (0 of 138) | 11.00 (0 of 240 under 11) / 11.00 (0 of 15) | 10.96 (40 of 222 under 11) / 10.96 (3 of 29) |
| D1 night | 12.00 (0 of 853 under 11) / 12.00 (0 of 137) | 11.00 (0 of 230 under 11) / 11.00 (0 of 13) | 10.96 (40 of 222 under 11) / 10.96 (3 of 29) |
| D4 paper | 12.00 (0 of 576 under 11) / 12.00 (0 of 102) | 11.00 (0 of 53 under 11) / 11.00 (0 of 6) | 10.95 (13 of 220 under 11) / 10.96 (4 of 33) |
| D4 aerial | 12.00 (0 of 576 under 11) / 12.00 (0 of 101) | 11.00 (0 of 53 under 11) / 11.00 (0 of 6) | 10.95 (13 of 220 under 11) / 10.96 (4 of 33) |

### Overlaps in the stills

| config | scenes | tiles isolated | footprint overlaps | label overlaps | pins covered | core-ink pairs | lettering boxes under another mark | pin on body |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 day | 9 | 861 | 0 | 0 | 0 | 0 | 0 | 0 |
| D1 night | 9 | 861 | 0 | 0 | 0 | 0 | 0 | 0 |
| D4 paper | 9 | 477 | 0 | 0 | 0 | 0 | 0 | 0 |
| D4 aerial | 9 | 477 | 0 | 0 | 0 | 0 | 0 | 0 |

### Overlaps in motion

| config | viewport | strips | frames | pixel-checked frames | frames with a core overlap (any mark at 10% or more) | of which between two solid marks | most pairs in a frame | frames with footprint overlap (10% or more) | of which both solid | engine-counted frames |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 day | desktop | 9 | 2820 | 2820 | 158 | 0 | 8 | 666 | 0 | 0 |
| D1 day | phone | 4 | 1320 | 1320 | 36 | 0 | 2 | 237 | 0 | 0 |
| D1 night | desktop | 9 | 2820 | 2820 | 151 | 0 | 10 | 666 | 0 | 0 |
| D1 night | phone | 4 | 1320 | 1320 | 34 | 0 | 2 | 237 | 0 | 0 |
| D4 paper | desktop | 9 | 2820 | 2820 | 81 | 0 | 5 | 386 | 0 | 0 |
| D4 paper | phone | 4 | 1320 | 1320 | 10 | 0 | 1 | 100 | 0 | 0 |
| D4 aerial | desktop | 9 | 2820 | 2820 | 91 | 0 | 6 | 386 | 0 | 0 |
| D4 aerial | phone | 4 | 1320 | 1320 | 7 | 0 | 1 | 100 | 0 | 0 |

### Jitter

| config | viewport | strip | largest step (camera removed) | largest raw step | largest velocity change | changes over 3 | steps over 6 | opacity jumps over 0.35 | velocity reversals | largest offset step | frames until rest |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 day | desktop | rest | 0.29 | 0.3 | 0.29 | 0 | 0 | 0 | 0 | 0.3 | 211 |
| D1 day | desktop | play4 | 9.85 | 9.8 | 8.06 | 14 | 15 | 23 | 31 | 69.6 | never |
| D1 day | desktop | play1 | 16.98 | 17.0 | 9.29 | 9 | 13 | 12 | 12 | 45.3 | never |
| D1 day | desktop | select | 1.73 | 1.7 | 1.61 | 0 | 0 | 1 | 0 | 1.7 | 204 |
| D1 day | desktop | arrival | 3.69 | 3.7 | 3.00 | 1 | 0 | 4 | 3 | 4.0 | never |
| D1 day | desktop | deploy | 6.15 | 6.1 | 5.54 | 4 | 1 | 0 | 1 | 6.1 | never |
| D1 day | desktop | zoomin | 18.50 | 109.5 | 7.11 | 53 | 286 | 11 | 7 | 18.2 | never |
| D1 day | desktop | zoomout | 16.13 | 108.6 | 6.92 | 49 | 85 | 26 | 45 | 93.1 | never |
| D1 day | desktop | pan | 0.00 | 61.5 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 70 |
| D1 day | phone | rest | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 98 |
| D1 day | phone | play1 | 18.52 | 18.5 | 8.21 | 8 | 52 | 16 | 17 | 73.5 | never |
| D1 day | phone | select | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 0 |
| D1 day | phone | zoomin | 20.28 | 62.1 | 22.23 | 57 | 106 | 7 | 4 | 175.7 | never |
| D1 night | desktop | rest | 0.29 | 0.3 | 0.29 | 0 | 0 | 0 | 0 | 0.3 | 211 |
| D1 night | desktop | play4 | 9.85 | 9.8 | 8.06 | 14 | 15 | 23 | 31 | 69.6 | never |
| D1 night | desktop | play1 | 16.98 | 17.0 | 9.29 | 9 | 13 | 12 | 12 | 45.3 | never |
| D1 night | desktop | select | 1.73 | 1.7 | 1.61 | 0 | 0 | 1 | 0 | 1.7 | 204 |
| D1 night | desktop | arrival | 3.69 | 3.7 | 3.00 | 1 | 0 | 4 | 3 | 4.0 | never |
| D1 night | desktop | deploy | 6.15 | 6.1 | 5.54 | 4 | 1 | 0 | 1 | 6.1 | never |
| D1 night | desktop | zoomin | 18.50 | 109.5 | 7.11 | 53 | 286 | 11 | 7 | 18.2 | never |
| D1 night | desktop | zoomout | 16.13 | 108.6 | 6.92 | 49 | 85 | 26 | 45 | 93.1 | never |
| D1 night | desktop | pan | 0.00 | 61.5 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 70 |
| D1 night | phone | rest | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 98 |
| D1 night | phone | play1 | 18.52 | 18.5 | 8.21 | 8 | 52 | 16 | 17 | 73.5 | never |
| D1 night | phone | select | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 0 |
| D1 night | phone | zoomin | 20.28 | 62.1 | 22.23 | 57 | 106 | 7 | 4 | 175.7 | never |
| D4 paper | desktop | rest | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 98 |
| D4 paper | desktop | play4 | 10.33 | 10.3 | 3.32 | 3 | 12 | 9 | 13 | 73.4 | never |
| D4 paper | desktop | play1 | 10.10 | 10.1 | 3.90 | 2 | 8 | 5 | 11 | 42.0 | never |
| D4 paper | desktop | select | 0.31 | 0.3 | 0.31 | 0 | 0 | 0 | 0 | 0.3 | 216 |
| D4 paper | desktop | arrival | 3.69 | 3.7 | 1.46 | 0 | 0 | 2 | 7 | 2.0 | never |
| D4 paper | desktop | deploy | 4.67 | 4.7 | 3.68 | 3 | 0 | 0 | 0 | 4.7 | never |
| D4 paper | desktop | zoomin | 16.21 | 107.1 | 8.55 | 21 | 126 | 1 | 1 | 1110.9 | 282 |
| D4 paper | desktop | zoomout | 9.66 | 105.4 | 5.01 | 5 | 13 | 28 | 30 | 161.7 | never |
| D4 paper | desktop | pan | 0.00 | 60.5 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 70 |
| D4 paper | phone | rest | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 98 |
| D4 paper | phone | play1 | 4.22 | 4.2 | 2.95 | 0 | 0 | 3 | 5 | 115.2 | never |
| D4 paper | phone | select | 0.32 | 0.3 | 0.29 | 0 | 0 | 0 | 0 | 0.3 | 179 |
| D4 paper | phone | zoomin | 20.41 | 61.1 | 21.57 | 26 | 81 | 0 | 1 | 320.0 | never |
| D4 aerial | desktop | rest | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 98 |
| D4 aerial | desktop | play4 | 10.33 | 10.3 | 3.32 | 3 | 12 | 9 | 13 | 73.4 | never |
| D4 aerial | desktop | play1 | 10.10 | 10.1 | 3.90 | 2 | 8 | 5 | 11 | 42.0 | never |
| D4 aerial | desktop | select | 0.31 | 0.3 | 0.31 | 0 | 0 | 0 | 0 | 0.3 | 216 |
| D4 aerial | desktop | arrival | 3.69 | 3.7 | 1.46 | 0 | 0 | 2 | 7 | 2.0 | never |
| D4 aerial | desktop | deploy | 4.67 | 4.7 | 3.68 | 3 | 0 | 0 | 0 | 4.7 | never |
| D4 aerial | desktop | zoomin | 16.21 | 107.1 | 8.55 | 21 | 126 | 1 | 1 | 1110.9 | 282 |
| D4 aerial | desktop | zoomout | 9.66 | 105.4 | 5.01 | 5 | 13 | 28 | 30 | 161.7 | never |
| D4 aerial | desktop | pan | 0.00 | 60.5 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 70 |
| D4 aerial | phone | rest | 0.00 | 0.0 | 0.00 | 0 | 0 | 0 | 0 | 0.0 | 98 |
| D4 aerial | phone | play1 | 4.22 | 4.2 | 2.95 | 0 | 0 | 3 | 5 | 115.2 | never |
| D4 aerial | phone | select | 0.32 | 0.3 | 0.29 | 0 | 0 | 0 | 0 | 0.3 | 179 |
| D4 aerial | phone | zoomin | 20.41 | 61.1 | 21.57 | 26 | 81 | 0 | 1 | 320.0 | never |

### Own mark versus merged

desktop

| zoom | D1 day | D1 night | D4 paper | D4 aerial |
|---|---:|---:|---:|---:|
| z13.5 | 34% (min 30%, max 40%; 32 crowd marks per view) | 34% (min 30%, max 40%; 32 crowd marks per view) | 11% (min 8%, max 14%; 31 crowd marks per view) | 11% (min 8%, max 14%; 31 crowd marks per view) |
| z15 | 79% (min 68%, max 91%; 6 crowd marks per view) | 79% (min 68%, max 91%; 6 crowd marks per view) | 49% (min 41%, max 78%; 10 crowd marks per view) | 49% (min 41%, max 78%; 10 crowd marks per view) |
| z16.5 | 96% (min 88%, max 100%; 1 crowd marks per view) | 96% (min 88%, max 100%; 1 crowd marks per view) | 94% (min 62%, max 100%; 1 crowd marks per view) | 94% (min 62%, max 100%; 1 crowd marks per view) |

phone

| zoom | D1 day | D1 night | D4 paper | D4 aerial |
|---|---:|---:|---:|---:|
| z13.5 | 24% (min 18%, max 33%; 24 crowd marks per view) | 24% (min 18%, max 33%; 24 crowd marks per view) | 4% (min 1%, max 10%; 22 crowd marks per view) | 4% (min 1%, max 10%; 22 crowd marks per view) |
| z15 | 75% (min 53%, max 100%; 3 crowd marks per view) | 75% (min 53%, max 100%; 3 crowd marks per view) | 39% (min 30%, max 82%; 6 crowd marks per view) | 39% (min 30%, max 82%; 6 crowd marks per view) |
| z16.5 | 95% (min 86%, max 100%; 0 crowd marks per view) | 95% (min 86%, max 100%; 0 crowd marks per view) | 91% (min 56%, max 100%; 1 crowd marks per view) | 91% (min 56%, max 100%; 1 crowd marks per view) |


### Crowd names

| config | zoom | crowd marks | formation named | corps named | vague wording | no formation or corps | duplicate names in a view |
|---|---:|---:|---:|---:|---:|---:|---:|
| D1 day | z13.5 | 509 | 48% | 49% | 0% | 3% | 52 (16 of 16 views) |
| D1 day | z15 | 93 | 51% | 45% | 0% | 4% | 6 (4 of 16 views) |
| D1 day | z16.5 | 9 | 89% | 11% | 0% | 0% | 0 (0 of 16 views) |
| D1 night | z13.5 | 509 | 48% | 49% | 0% | 3% | 52 (16 of 16 views) |
| D1 night | z15 | 93 | 51% | 45% | 0% | 4% | 6 (4 of 16 views) |
| D1 night | z16.5 | 9 | 89% | 11% | 0% | 0% | 0 (0 of 16 views) |
| D4 paper | z13.5 | 498 | 27% | 12% | 37% | 24% | 205 (16 of 16 views) |
| D4 paper | z15 | 168 | 42% | 2% | 32% | 24% | 44 (15 of 16 views) |
| D4 paper | z16.5 | 10 | 80% | 0% | 10% | 10% | 0 (0 of 16 views) |
| D4 aerial | z13.5 | 498 | 27% | 12% | 37% | 24% | 205 (16 of 16 views) |
| D4 aerial | z15 | 168 | 42% | 2% | 32% | 24% | 44 (15 of 16 views) |
| D4 aerial | z16.5 | 10 | 80% | 0% | 10% | 10% | 0 (0 of 16 views) |

### Colour vision

| config | side colours (Union / Confederate) | normal | protanopia | deuteranopia | tritanopia |
|---|---:|---:|---:|---:|---:|
| D1 day | [26.0, 88.0, 196.0] / [139.0, 37.0, 9.0] | 45 · p5 42 · 99.6% | 52 · p5 45 · 99.8% | 56 · p5 50 · 99.8% | 59 · p5 53 · 99.6% |
| D1 night | [211.0, 229.0, 255.0] / [251.0, 217.0, 202.0] | 23 · p5 33 · 98.8% | 20 · p5 31 · 97.0% | 23 · p5 33 · 98.8% | 33 · p5 41 · 98.9% |
| D4 paper | [28.0, 87.0, 166.0] / [194.0, 68.0, 27.0] | 46 · p5 21 · 98.4% | 49 · p5 24 · 97.6% | 56 · p5 22 · 98.1% | 61 · p5 21 · 98.0% |
| D4 aerial | [28.0, 87.0, 166.0] / [194.0, 68.0, 27.0] | 46 · p5 37 · 99.9% | 49 · p5 38 · 99.9% | 56 · p5 44 · 99.9% | 61 · p5 49 · 100.0% |

### Draw time and engine time per frame, densest tick (tick 620, 478 units on the field), Chrome 155 headless on an Intel Core Ultra 7 265H with its Arc GPU (ANGLE, Direct3D 11)

Cell: median / p95 of renderer.draw in the running page (ms) ; engine.step median / p95 (ms) | frames per second | share of frames over 20 ms. The page plays at 4x across the tick for 7 s with its own animation loop.

| config | setting | field z13.5 | Angle z15 | Angle z16.5 |
|---|---:|---:|---:|---:|
| D1 day | DPR 2, CPU 1x | 1.6 / 1.9 ; 2.5 / 7.8 ; 59 ; 1.7% | 1.0 / 1.1 ; 4.6 / 6.8 ; 60 ; 0.0% | 0.4 / 0.5 ; 5.0 / 6.2 ; 60 ; 0.0% |
| D1 day | DPR 1, CPU 1x | 1.5 / 1.9 ; 5.0 / 7.4 ; 60 ; 0.2% | 1.0 / 1.1 ; 4.8 / 6.4 ; 60 ; 0.0% | 0.4 / 0.5 ; 4.5 / 5.3 ; 60 ; 0.2% |
| D1 day | DPR 2, CPU slowed 4x | 21.1 / 37.6 ; 15.6 / 63.3 ; 18 ; 94.9% | 6.7 / 9.5 ; 15.1 / 40.6 ; 30 ; 75.5% | 2.6 / 5.0 ; 15.2 / 30.3 ; 37 ; 56.0% |
| D1 night | DPR 2, CPU 1x | 1.6 / 2.0 ; 2.4 / 7.7 ; 60 ; 0.0% | 1.0 / 1.2 ; 2.9 / 7.4 ; 60 ; 0.0% | 0.5 / 0.7 ; 4.9 / 6.0 ; 56 ; 0.5% |
| D1 night | DPR 1, CPU 1x | 1.6 / 1.9 ; 2.4 / 7.6 ; 60 ; 0.2% | 1.0 / 1.1 ; 4.9 / 6.9 ; 53 ; 0.5% | 0.4 / 0.5 ; 4.8 / 5.6 ; 60 ; 0.0% |
| D1 night | DPR 2, CPU slowed 4x | 11.6 / 28.5 ; 12.0 / 52.5 ; 19 ; 82.0% | 6.5 / 8.4 ; 13.2 / 38.2 ; 32 ; 64.8% | 2.5 / 3.6 ; 13.6 / 26.0 ; 42 ; 42.1% |
| D4 paper | DPR 2, CPU 1x | 0.8 / 1.2 ; 2.3 / 4.5 ; 60 ; 0.0% | 0.8 / 0.9 ; 4.5 / 5.4 ; 60 ; 0.0% | 0.5 / 0.6 ; 4.7 / 5.4 ; 60 ; 0.0% |
| D4 paper | DPR 1, CPU 1x | 0.8 / 1.1 ; 2.0 / 4.1 ; 60 ; 0.0% | 0.8 / 1.1 ; 5.1 / 7.4 ; 60 ; 0.0% | 0.5 / 0.6 ; 4.3 / 5.2 ; 60 ; 0.0% |
| D4 paper | DPR 2, CPU slowed 4x | 4.5 / 18.7 ; 5.3 / 27.5 ; 44 ; 26.0% | 4.6 / 13.1 ; 11.3 / 34.5 ; 20 ; 53.6% | 2.5 / 4.0 ; 10.3 / 26.9 ; 44 ; 35.4% |
| D4 aerial | DPR 2, CPU 1x | 0.9 / 1.2 ; 2.2 / 4.5 ; 60 ; 0.0% | 0.8 / 1.0 ; 4.7 / 5.8 ; 60 ; 0.0% | 0.5 / 0.7 ; 4.8 / 5.5 ; 60 ; 0.0% |
| D4 aerial | DPR 1, CPU 1x | 0.8 / 1.1 ; 1.6 / 4.4 ; 58 ; 0.3% | 0.7 / 0.9 ; 3.9 / 5.2 ; 60 ; 0.0% | 0.5 / 0.6 ; 4.4 / 5.1 ; 60 ; 0.0% |
| D4 aerial | DPR 2, CPU slowed 4x | 4.6 / 20.4 ; 7.6 / 29.7 ; 18 ; 33.5% | 4.4 / 8.0 ; 11.3 / 40.9 ; 37 ; 44.2% | 2.5 / 4.9 ; 11.2 / 30.4 ; 42 ; 38.2% |

A forced read-back after each draw (an upper bound that stalls the pipeline; not what a viewer waits for) takes, DPR 2, CPU 1x, field / Angle z15 / Angle z16.5: D1 day 100 / 48 / 34 ms; D1 night 87 / 50 / 28 ms; D4 paper 56 / 52 / 33 ms; D4 aerial 58 / 62 / 34 ms.

### Marks the interface covers or removes, scene by scene

Cell: marks in view ; under something the page paints on top (any core ink) ; of which more than a quarter hidden ; left the visible map when the panel opened (dissolved or cut; - where the scene has no panel) ; popup ink on the core.

| scene | D1 day | D1 night | D4 paper | D4 aerial |
|---|---:|---:|---:|---:|
| desktop b1-field-z13.5: no popups: the field view at 13.5 (the frame chrome only) | 138 ; 0 ; 0 ; - ; 0 | 138 ; 0 ; 0 ; - ; 0 | 70 ; 0 ; 0 ; - ; 0 | 70 ; 0 ; 0 ; - ; 0 |
| desktop b2-angle-z15: no popups: the Angle at z15 | 86 ; 0 ; 0 ; - ; 0 | 86 ; 0 ; 0 ; - ; 0 | 65 ; 0 ; 0 ; - ; 0 | 65 ; 0 ; 0 ; - ; 0 |
| desktop b3-wheatfield-z15: no popups: the Wheatfield at z15 | 78 ; 0 ; 0 ; - ; 0 | 78 ; 0 ; 0 ; - ; 0 | 59 ; 0 ; 0 ; - ; 0 | 59 ; 0 ; 0 ; - ; 0 |
| desktop b4-cemetery-z15.5: no popups: Cemetery Hill at z15.5 | 56 ; 0 ; 0 ; - ; 0 | 56 ; 0 ; 0 ; - ; 0 | 49 ; 0 ; 0 ; - ; 0 | 49 ; 0 ; 0 ; - ; 0 |
| desktop p0-opening-chrome: the opening view with every default popup (clock, minimap, hints) | 138 ; 0 ; 0 ; - ; 14 | 138 ; 0 ; 0 ; - ; 14 | 70 ; 0 ; 0 ; - ; 7 | 70 ; 0 ; 0 ; - ; 7 |
| desktop p1-events-t28: event card, story card, toasts at t28 | 43 ; 0 ; 0 ; - ; 4 | 43 ; 0 ; 0 ; - ; 4 | 42 ; 0 ; 0 ; - ; 2 | 42 ; 0 ; 0 ; - ; 2 |
| desktop p10-tour-step: a narration (tour) step | 81 ; 0 ; 0 ; 109 ; 0 | 81 ; 0 ; 0 ; 109 ; 0 | 63 ; 8 ; 7 ; 60 ; 0 | 63 ; 8 ; 7 ; 60 ; 0 |
| desktop p11-welcome: the welcome card | 93 ; 0 ; 0 ; 33 ; 0 | 93 ; 0 ; 0 ; 33 ; 0 | 65 ; 15 ; 12 ; 0 ; 0 | 65 ; 14 ; 13 ; 0 ; 0 |
| desktop p12-tune-panel: the Tune panel | 44 ; 0 ; 0 ; 30 ; 0 | 44 ; 0 ; 0 ; 30 ; 0 | 65 ; 27 ; 25 ; 0 ; 0 | 65 ; 27 ; 25 ; 0 ; 0 |
| desktop p13-about-panel: the About panel | 44 ; 0 ; 0 ; 30 ; 0 | 44 ; 0 ; 0 ; 30 ; 0 | 65 ; 27 ; 25 ; 0 ; 0 | 65 ; 27 ; 25 ; 0 ; 0 |
| desktop p14-hint: a hint with the clock | 78 ; 0 ; 0 ; - ; 0 | 78 ; 0 ; 0 ; - ; 0 | 59 ; 0 ; 0 ; - ; 0 | 59 ; 0 ; 0 ; - ; 0 |
| desktop p2-story-rail: the story card in the reading rail | 41 ; 0 ; 0 ; 6 ; 4 | 41 ; 0 ; 0 ; 6 ; 4 | 38 ; 0 ; 0 ; 4 ; 3 | 38 ; 0 ; 0 ; 4 ; 3 |
| desktop p3-command-t550: command-change toasts and cross-out at t550 | 101 ; 0 ; 0 ; - ; 4 | 101 ; 0 ; 0 ; - ; 4 | 60 ; 0 ; 0 ; - ; 3 | 60 ; 0 ; 0 ; - ; 3 |
| desktop p4-unit-card: a selected unit and its card | 29 ; 0 ; 0 ; - ; 1 | 29 ; 0 ; 0 ; - ; 1 | 28 ; 0 ; 0 ; - ; 1 | 28 ; 0 ; 0 ; - ; 1 |
| desktop p5-unit-rail: the unit card in the reading rail | 28 ; 0 ; 0 ; 6 ; 1 | 28 ; 0 ; 0 ; 6 ; 1 | 26 ; 0 ; 0 ; 2 ; 1 | 26 ; 0 ; 0 ; 2 ; 1 |
| desktop p6-hover: the hover tooltip | 31 ; 0 ; 0 ; - ; 1 | 31 ; 0 ; 0 ; - ; 1 | 31 ; 0 ; 0 ; - ; 1 | 31 ; 0 ; 0 ; - ; 1 |
| desktop p7-legend-rail: the legend in the reading rail | 43 ; 0 ; 0 ; 31 ; 0 | 43 ; 0 ; 0 ; 31 ; 0 | 38 ; 1 ; 0 ; 28 ; 0 | 38 ; 1 ; 0 ; 28 ; 0 |
| desktop p8-chronicle-rail: the Chronicle in the reading rail | 43 ; 0 ; 0 ; 31 ; 0 | 43 ; 0 ; 0 ; 31 ; 0 | 38 ; 1 ; 0 ; 28 ; 0 | 38 ; 1 ; 0 ; 28 ; 0 |
| desktop p9-day-banner: the day banner as the clock crosses dawn | 62 ; 0 ; 0 ; 18 ; 0 | 63 ; 0 ; 0 ; 18 ; 0 | 48 ; 0 ; 0 ; 15 ; 0 | 48 ; 0 ; 0 ; 15 ; 0 |
| phone m0-lane: phone: the default lane at t28 | 33 ; 0 ; 0 ; - ; 0 | 33 ; 0 ; 0 ; - ; 0 | 27 ; 0 ; 0 ; - ; 0 | 27 ; 0 ; 0 ; - ; 0 |
| phone m1-unit-sheet: phone: the unit card in the bottom sheet | 32 ; 0 ; 0 ; 4 ; 1 | 32 ; 0 ; 0 ; 4 ; 1 | 21 ; 2 ; 1 ; 3 ; 1 | 21 ; 2 ; 1 ; 3 ; 1 |
| phone m2-event-sheet: phone: an event card in the sheet | 33 ; 9 ; 9 ; 12 ; 1 | 33 ; 9 ; 9 ; 12 ; 1 | 27 ; 1 ; 0 ; 0 ; 1 | 27 ; 1 ; 0 ; 0 ; 1 |
| phone m3-opening: phone: the opening view | 56 ; 0 ; 0 ; - ; 0 | 56 ; 0 ; 0 ; - ; 0 | 30 ; 0 ; 0 ; - ; 0 | 30 ; 0 ; 0 ; - ; 0 |
| phone m4-legend: phone: the legend | 14 ; 3 ; 3 ; 19 ; 0 | 14 ; 3 ; 3 ; 19 ; 0 | 15 ; 5 ; 4 ; 8 ; 0 | 17 ; 7 ; 7 ; 8 ; 0 |
| phone n1-angle-z14.5: phone, no popups: the Angle at 14.5 | 32 ; 0 ; 0 ; - ; 0 | 32 ; 0 ; 0 ; - ; 0 | 24 ; 0 ; 0 ; - ; 0 | 24 ; 0 ; 0 ; - ; 0 |
| phone n2-wheatfield-z14.5: phone, no popups: the Wheatfield at 14.5 | 51 ; 0 ; 0 ; - ; 0 | 51 ; 0 ; 0 ; - ; 0 | 42 ; 0 ; 0 ; - ; 0 | 41 ; 0 ; 0 ; - ; 0 |

### Bytes

| direction | built page | page gzip | skin code | token JSON | stylesheets | ground code | fonts | skin layer total | code, tokens, css, ground, gzipped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 | 2.25 MB | 834 KB | 53 KB | 19 KB | 29 KB | 12 KB | 73 KB | 186 KB | 34 KB |
| D4 | 2.34 MB | 914 KB | 58 KB | 15 KB | 34 KB | 8 KB | 158 KB | 274 KB | 34 KB |

Cold start at the field view, then the close-up, from an empty profile (what the page fetches from the static server, no compression):

| config | page | aerial tiles at the field view | fonts as separate files | first view total | after the close-up |
|---|---:|---:|---:|---:|---:|
| D1 day | 2.25 MB | 257 files, 3.20 MB | 0 KB | 5.45 MB | 5.51 MB |
| D1 night | 2.25 MB | 257 files, 3.20 MB | 0 KB | 5.45 MB | 5.52 MB |
| D4 paper | 2.34 MB | 248 files, 3.04 MB | 0 KB | 5.39 MB | 5.45 MB |
| D4 aerial | 2.34 MB | 248 files, 3.04 MB | 0 KB | 5.39 MB | 5.45 MB |

### Does the layout come to rest?

Constant frame time, after a jump to the field view; the next 120 frames are measured. Cell: frames in which any mark moved more than 0.5 px / marks that moved / largest single-frame move (px).

| frame rate | D1 desktop | D1 phone | D4 desktop | D4 phone |
|---|---:|---:|---:|---:|
| 60 fps (16.7 ms) | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| 50 fps (20.0 ms) | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| 45 fps (22.0 ms) | 119 / 74 / 89 | 119 / 64 / 73 | 0 / 0 / 0 | 0 / 0 / 0 |
| 40 fps (25.0 ms) | 119 / 77 / 89 | 119 / 66 / 73 | 0 / 0 / 0 | 0 / 0 / 0 |
| 36 fps (28.0 ms) | 119 / 74 / 89 | 119 / 65 / 73 | 0 / 0 / 0 | 0 / 0 / 0 |
| 33 fps (30.0 ms) | 119 / 77 / 89 | 119 / 67 / 73 | 0 / 0 / 0 | 0 / 0 / 0 |
| 30 fps (33.3 ms) | 119 / 73 / 89 | 119 / 67 / 73 | 0 / 0 / 0 | 0 / 0 / 0 |
| 25 fps (40.0 ms) | 119 / 73 / 89 | 119 / 67 / 73 | 0 / 0 / 0 | 0 / 0 / 0 |
| 20 fps (50.0 ms) | 119 / 73 / 89 | 119 / 67 / 73 | 0 / 0 / 0 | 0 / 0 / 0 |

The same question in the real page (its own animation loop), 180 animation frames after 15 s, CPU slowed by the stated factor. Cell: frames moving / marks moving / largest move (px) / median and p95 frame time (ms).

| CPU slowdown | D1 desktop | D1 phone | D4 desktop | D4 phone |
|---|---:|---:|---:|---:|
| 1x | 0 / 0 / 0 / 17, 17 | 0 / 0 / 0 / 17, 17 | 0 / 0 / 0 / 17, 17 | 0 / 0 / 0 / 17, 17 |
| 2x | 179 / 81 / 90 / 17, 17 | 0 / 0 / 0 / 17, 17 | 0 / 0 / 0 / 17, 17 | 0 / 0 / 0 / 17, 17 |
| 4x | 179 / 76 / 89 / 50, 67 | 179 / 67 / 73 / 33, 50 | 0 / 0 / 0 / 17, 33 | 0 / 0 / 0 / 17, 17 |
| 6x | 179 / 74 / 89 / 83, 117 | 179 / 67 / 73 / 50, 83 | 0 / 0 / 0 / 33, 50 | 0 / 0 / 0 / 33, 67 |

## How each number is obtained

* **Scenes.** Nine desktop scenes (S1a field z13.5 t551, S1b field z13.5 t556, S1c Angle z15 t556, S2 Wheatfield z15 t295, S3 Cemetery Hill z15.5 t346, S4 close-up z16.5 with the 53rd Virginia selected, S6 event and story cards at t28, S7 legend open, S8 hover tooltip z16) and three phone scenes (S5 z14.5 with the sheet open, the Angle and the Wheatfield at z14.5); then 19 desktop and 7 phone popup and base scenes (every popup of the registry in place: events, story, command toasts, unit card, hover tooltip, legend, Chronicle, day banner, tour step, welcome, Tune, About, hint; and the frame with no popup). All use the same hotspots for both directions and settle until the engine is idle (D1 needs several seconds after a jump).
* **Text.** Every `fillText` of the map canvas is recorded with its full transform, so size and glyph box are exact; the backdrop under it comes from the same frame drawn with the text switched off (and, for a skin that draws a halo, with only the halo drawn). Contrast is the WCAG ratio of the text colour (alpha included) against each pixel in the box. Interface text: the DOM's text nodes (computed colour, size and transform) against the page picture with its text made transparent.
* **Marks, stills.** Each mark of the settled frame is drawn alone (the skin's drawing of every other mark switched off) and compared with the ground-only picture; ink is any pixel that differs by 12/255 or more, **core ink** by 64/255 or more; two marks overlap when their core inks share a pixel. Also counted: lettering boxes under another mark's core ink, pins under a mark, and the engine tiles' footprint overlaps recomputed independently.
* **Marks, motion.** On the virtual clock at 16.667 ms, the whole viewport, every frame: the drawn centre of every mark inside the viewport with the camera's own motion taken out (its previous place seen through this frame's camera); its offset from its anchor; its opacity; the footprint overlaps of all marks at drawn opacity 0.1 or more; and, **in every frame**, the pixel check of every mark that has another within 20 px (each drawn alone on a copy of the ground-only picture, core ink intersected). "Largest velocity change" is the change from one frame's camera-removed step vector to the next, relative to the unit's own place for a regiment-sized mark; a crowd mark is judged without that subtraction. Strips (13 per configuration, 4,140 frames): a jump to the field view and 120 frames at rest; 4x play across the assault at the field view; 1x play at the Angle; zoom 13.5 to 16.5 and back; a pan to Cemetery Hill; select and deselect the 53rd Virginia; the arrival of the 3rd Maine at tick 236 to 240; nine marks arriving on Seminary Ridge at tick 400; and on the phone view the rest, play, zoom-in and select strips.
* **What a popup covers.** The DOM-only picture (canvas hidden, container backgrounds cleared) gives the alpha of everything the page paints; a mark is covered where its core ink lies under alpha of 128/255 or more. `elementsFromPoint` names the element over sample points of each covered mark. A mark "leaves the visible map" when it was visible (layout opacity and drawn alpha 0.5 or more, inside the map's viewport) before a rail, panel, card or sheet opened and is not afterwards; it is not counted in scenes where the clock plays or the tour moves the camera.
* **Own versus merged.** For 4 ticks (295, 346, 551, 556) at 4 places (field centre, the Angle, the Wheatfield, Cemetery Hill) at 3 zooms: units inside the viewport that stand as a leaf tile against units inside crowd tiles, from the engine's tile list. Crowd names are the text the tile carries (`fname`, `short`, `ftail`), classified by keyword.
* **Colour vision.** The identifying colour of each side is the cluster of solid ink that separates the sides' marks most (pooled over the scenes); each pair is simulated (Machado, Oliveira, Fernandes 2009, severity 1.0, applied to linear RGB; protanopia, deuteranopia, tritanopia) and compared with CIEDE2000 (own implementation, checked against the three published Sharma, Wu and Dalal 2005 pairs: 2.0425, 4.3065, 27.1492). All Union-against-Confederate mark pairs of the scenes are also tested.
* **Draw time.** The page's own animation loop plays at 4x across the densest tick (tick 620, 478 units on the field, found by scanning all 675 ticks) for 7 s per view; `renderer.draw` and `engine.step` are timed from inside the page; three views (field z13.5, Angle z15, Angle z16.5), DPR 2 and 1, and with the CPU slowed 4x through the DevTools protocol.
* **Rest.** Constant frame time after a jump, 900 frames to settle, 120 measured; and the real page, 15 s after the jump, 180 animation frames, with the CPU slowed 1x, 2x, 4x and 6x.

## Limits, and what was not verified

* One machine, one browser (headless Chrome 155), one GPU. The phone is an emulation (390 x 844, DPR 2, touch, a CPU slowdown), not a phone. Timing figures are single runs of 7 s per view on a machine that other work was also using (about 15 percent CPU load from other processes before each run); the unthrottled numbers are far from their bars, the 4x numbers are the ones to treat as approximate.
* The scenes use the forks' hotspots but not the forks' small camera shifts (D1's scene recipes pan by a few tens of pixels); the harness reproduces the forks' own S1a and S4 pixel for pixel, so the difference is only which marks sit near the edges.
* The per-frame pixel check is a faster implementation of the same ink definition as the still pass. I cross-checked it against the still pass on one D1 frame (86 marks: 84 have the same box to within 1 px, the other two differ at the screen edge; 0 core pairs from both). The same cross-check on D4 crashed the page and was not completed. Pins (the small dots on a displaced mark's true place) are checked in the stills, not in the motion frames.
* Only marks inside the viewport at the drawn opacity of the test are counted; a mark outside the screen is not a "hidden" mark here.
* The Machado matrices in `colour.py` were typed from memory (they are the ones the forks' own tools use; I compared them by grep) and not re-read from the paper. The mark colours are pixel clusters of the rendered picture; 64 to 77 percent of marks have a cluster near the side colour, the rest only a silhouette reading.
* Crowd names are classified by keyword on the text the engine hands the skin, not read from the pixels; an alphabetic form I did not anticipate would be misclassified.
* "Opacity jump" and "velocity change" are my definitions; the PASS thresholds for them are my choice (see the table of bars). The cause of D1's rest failure, and of the 22 px velocity change in the phone zoom glides, was not investigated.
* Not measured: touch-target size, keyboard use, screen readers, print, and any behaviour outside the two pages' own scenes. The `?variant=cvd` and `?variant=contrast` variants of each page were not measured.
* Evidence that is not in the committed folder: the capture pictures from which the pixel tables are computed (2.5 GB in `tmp/look-dev/objective/r1/cap` and 1.2 GB in `cap-pop`, not committed) and the raw per-frame strip rows (`tmp/look-dev/objective/r1/results/strips-*.json`, 38 MB; the committed data has the per-strip totals).

## Reproduce

Everything is in `round-1-objective-data/tools/` (copied from `tmp/look-dev/objective/r1`, which needs the snapshot: `git archive 6628412 docs/pitch/anim2 | tar -x -C snap`). The order: `node serve-bg.mjs` (port 10200), `node capture.mjs --dir=d1 --look=day --mode=full|notext|nofill --vp=desktop|phone --dpr=2` (and `--dpr=1 --ink=0`) for each configuration, `python run_an.py`, `node popcover.mjs --dir= --look= --vp=` and `python popcover.py`, `node strips.mjs --dir= --look= --vp=` (and `--dt=33.333`), `node props.mjs --vp=`, `node perf.mjs`, `node dtsweep.mjs`, `node rtrest.mjs`, `node net.mjs`, `python sizes.py`, `node fidelity.mjs` and `python fidelity.py`, `node canvasrect.mjs`, then `python report.py`, which writes the verdict table and every table below. Raw results (summaries, popup records, perf, rest, fidelity, bytes) are in `round-1-objective-data/`.
