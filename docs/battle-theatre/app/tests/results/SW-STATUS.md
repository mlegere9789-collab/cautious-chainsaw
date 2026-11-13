# Software-rendering status of the ten browser specs (round 1)

Workstream bt-spec-health (spec loop). This file is assembled by `node docs/battle-theatre/app/tests/results/sw-status.mjs 1 --write` from the run logs in `tests/results/sw-round-1/*.log` (TAP, one file per run), the hand verdicts in `sw-round-1/verdicts.json` and the hand-written text in `sw-round-1/notes.md`. Nothing in the tables is typed in from memory: a result column is read from a log, a verdict and its evidence column come from `verdicts.json` where a person decided, otherwise from the log.

**What this status is.** It says which assertions of the ten specs hold when the page is drawn by a software renderer on this machine (4 shared vCPUs, no GPU), against the source shell (`docs/battle-theatre`, served by `app/tools/serve.mjs`) and against a packed staging dist. It is **not** a timing of the product and not a picture of what a GPU draws. Every assertion that only a real GPU can answer is reported NOT RUN (NEEDS_GPU) and is owed on a real GPU; none was relaxed, scaled or skipped silently.

## Summary

69 tests in 10 specs: 1 NEEDS_GPU, 51 NOT, 15 PASS, 1 STALE_TEST, 1 UNCLASSIFIED

## How the specs are run here

* **One spec at a time through the machine lock.** `tmp/bt-spec/driver.sh` takes the next batch of one spec (the two shortest share one) from `tmp/bt-spec/queue2.txt` and runs it with `tools/horde/bench.sh tmp/bt-spec/runq.sh` (one lock hold per spec: the slot is given back between two specs so that the many shorter jobs of the other workstreams get it; at most one spec of mine runs at any time, and a hold can be 4 hours, which is why a spec waits a long time for its turn). `runq.sh` runs `node --test --test-reporter=tap <spec>` detached, writes the log `tests/results/sw-round-1/<label>.log` (the first lines say the environment, the HEAD commit and the newest source file at the start; the last line says the end time, the exit code and whether a source file changed during the run), appends one line to `runs.tsv`, and stops a run only at a limit set far above the expected time (a hang guard, never a result). Labels: `src-<n>-<spec>` = source shell, `dist-<n>-<spec>` = packed dist (`BT_DIST=<folder>`).
* **A frozen source shell.** A spec takes hours and the other workstreams edit `docs/battle-theatre` all the time (both runs of the first hour report "the source changed during the run"). From the second hour on, `runq.sh` takes `git archive HEAD` of the shell's folders once per batch (about 195 MB, one second) and the specs serve that copy (`BT_SNAPSHOT=<folder>`, `lib.mjs`; the folder name carries the commit, `tmp/bt-spec/snap-<hash>`); the environment on the first line of every log says which. Every result is therefore about one named commit and can be reproduced with `git archive <hash>`. The runs `src-1-sky` and `src-1-webgl2` (first attempt) were made on the live tree.
* **The renderer is read from the browser, never assumed.** `lib.mjs` launches system Chrome with the hardware flags first, asks it for a WebGL2 context, and falls back to SwiftShader when it gets none (`# renderer: ANGLE (... SwiftShader ...) (SOFTWARE; hardware flags)` on the first line of every log). A WebGPU adapter exists on this machine (`google swiftshader`, software Vulkan), so the WebGPU path starts and runs; a headless capture of its canvas is blank, so assertions on a WebGPU picture are NOT RUN.
* **Cost on this machine** (measured by the specs themselves, printed in each log as `slow renderer: frame ... ms`): one frame of the theatre with the full crowd takes 4 to 5.5 s when the machine is quiet and 10 s or more when the other jobs of the campaign load it (load average 8 to 12 on 4 vCPUs), the first entry 18 to 26 s. The specs were written for 16.7 ms, so a spec takes hours here.
* **Numbers and pictures a spec writes** go to `tests/results/sw-round-1/out-src/` or `out-dist/` (environment `BT_OUT`), never over the committed real-GPU files of the tests folder.
* **Reproduce one spec** (replace the file name; the lock is the campaign's rule for browser jobs):
  `BT_OUT=sw-round-1/out-src tools/horde/bench.sh node --test --test-reporter=tap docs/battle-theatre/app/tests/<name>.spec.mjs > tmp/bt-spec/<name>.log 2>&1`; against a packed dist add `BT_DIST=<folder of the dist>` (`node tools/bt/pack_theatre.mjs --out <folder> --zip-dir <folder>`).

## The one knob for a renderer that cannot draw in real time (`tests/lib.mjs`)

The page's clock advances by the real frame time but never by more than 100 ms a frame (`theatre.mjs`: `dt = min(0.1, dtMs / 1000)`). When a frame takes longer (software GL: seconds), everything the page does *in time* (camera flights, a held key, playback, the easing of the rate, a debounced search box behind a busy main thread) runs slower than the wall clock by `K = measured frame time / 100 ms`. The specs make no assumption about K; they use three helpers of `lib.mjs`:

| helper | meaning |
|---|---|
| `SLOW.k` | the wait scale; 1 on any machine that draws a frame in under 100 ms (then every helper is exactly the plain Playwright call the specs always made). Measured, never configured: `enter()`/`ready()` time two frames of the running theatre and `wait()` re-measures on every call, so the scale follows the machine while other jobs load it. Before the first frame exists a software renderer starts at `SLOW.startK` = 25. `BT_WAIT_K=<n>` fixes it by hand (debugging only). |
| `wait(page, ms)` | replaces `page.waitForTimeout` in the specs: a pause that gives the *page* ms of its own clock (it lets frames run until the page clock advanced ms). |
| `T(ms)` | a time limit of a `waitFor...` call, multiplied by K. A limit is the moment a test gives up; it is never something a test asserts. The context's default action timeout is `min(T(30 s), 5 min)`. |

**What the knob never touches:** what a test asserts, and every performance threshold (frame time, long tasks, input delay, added GPU or CPU time). Those are not scaled. On a software renderer they are NOT RUN: `test(name, fn)` of `lib.mjs` is `node:test`'s test plus `t.gpuOnly(label, fn)` (the assertion `fn` runs on a hardware renderer, is skipped here with its label printed as `# NOT RUN (NEEDS_GPU): label`) and `t.notRun(reason)` (a test that only measures the GPU). A test whose other assertions all passed is then reported as SKIPPED with every label it did not run, never as passed; a test that fails anywhere is reported as failed (the skip mark is set only at the very end).

## Vocabulary of the verdict column

| verdict | meaning |
|---|---|
| PASS | every assertion of the test ran and held in the latest run on the source shell |
| NEEDS_GPU | the assertions that remain are frame-time, long-task or input-delay thresholds, or a picture of the WebGPU canvas: NOT RUN here, owed on a real GPU; the rest of the test ran and passed (the evidence column says which) |
| HARNESS | a wait or limit of the spec assumed a real GPU; it now goes through the knob above; the assertions are unchanged |
| STALE_TEST | the product changed by design; the assertion was updated to the documented behaviour (the evidence names the decision or note) |
| PRODUCT_BUG | the product misbehaves; a request note with the exact reproduction is in `docs/battle-theatre/GOVERNANCE/horde/requests/spec-*.md`; the test stays red |
| UNCLASSIFIED / NOT RUN YET | no verdict has been given yet (a run failed and has not been analysed, or the run has not happened) |

### arrival.spec.mjs

Source shell: `diag-1-arrival-t4` (2026-11-13 21:40Z; 1 passed, 0 failed, 0 not run of 1; 16 min; frozen source snapshot of commit 9e1e1777).  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| the page runs the real layer: 726 units, a handful placed, the rest marked open gap | not run | not run | NOT RUN YET |  |
| across the whole window, in every frame sampled: nothing is drawn before its window opens, and the renderer was told exactly what the stage holds | not run | not run | NOT RUN YET |  |
| an event before a unit's earliest arrival is refused by the sim event cache (Q04), listed, and the page says so | not run | not run | NOT RUN YET |  |
| a unit that has not arrived is not drawn (pixels), is absent from the unit list and says so on its card; then it marches in from the edge and is drawn | pass (16 min) | not run | PASS |  |
| scenario selector: carries all 47 register conflicts and the weather conflicts; default is the delegated defaults (tier and label shown); the PDF values are one button... | not run | not run | NOT RUN YET |  |
| no console errors | not run | not run | NOT RUN YET |  |

### casualties.spec.mjs

Source shell: `diag-1-casualties-webgl2` (2026-11-13 21:56Z; 0 passed, 1 failed, 0 not run of 1; 18 min; frozen source snapshot of commit 9e1e1777).  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| webgl2: men of a unit fall in the picture while it stands in a printed window, stand up again when the scrubber goes back, and the same time gives the same picture | FAIL (18 min) | not run | UNCLASSIFIED | source run: the men stand up again: the renderer tables are rewritten, not left lying |
| webgpu: men of a unit fall in the picture while it stands in a printed window, stand up again when the scrubber goes back, and the same time gives the same picture | not run | not run | NOT RUN YET |  |
| the card of a unit with men down: the ranges, their basis, the printed window with its row and audit, the running count on the map, the manifests and what the renderer... | not run | not run | NOT RUN YET |  |
| nothing is uploaded when nothing changes: a still moment writes no soldier table, a moving one does; the animation clock is rebased on a seek | not run | not run | NOT RUN YET |  |

### leak.spec.mjs

Source shell: `diag-1-leak-webgl2-c3` (2026-11-13 22:14Z; 1 passed, 0 failed, 0 not run of 1; 9 min; frozen source snapshot of commit 9e1e1777).  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| webgl2: 20 enter/leave cycles leave no context, device, frame, timer, listener, worker, audio context or heap growth | not run | not run | NOT RUN YET |  |
| webgpu: 20 enter/leave cycles leave no context, device, frame, timer, listener, worker, audio context or heap growth | not run | not run | NOT RUN YET |  |
| Back pressed while the theatre is still loading leaves nothing behind | not run | not run | NOT RUN YET |  |
| the browser Back button and the #theatre link take the same path as the Back control | not run | not run | NOT RUN YET |  |
| sound: off until started; started inside the theatre it is one AudioContext with live nodes; Back closes it and leaves 0 nodes, 0 contexts, no timers or listeners behind | not run | not run | NOT RUN YET |  |
| added layers: loaded, every switch on and every panel opened, Back leaves nothing behind | not run | not run | NOT RUN YET |  |
| webgl2: 3 enter/leave cycles leave no context, device, frame, timer, listener, worker, audio context or heap growth | pass (9 min) | not run | PASS | log: 7 line(s) of numbers, e.g. devices created in total: 0, all lost: true; canvases created: 4; leftover after leaving: contexts 0, rAF 0, timers 0, workers 0, audio 0, ports 0 |

### perf.spec.mjs

Source shell: `diag-1-perf-webgl2-paced` (2026-11-13 22:23Z; 0 passed, 0 failed, 1 not run of 1; 10 min; frozen source snapshot of commit 9e1e1777).  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| webgl2: frame time with 165,000 soldiers at 1920x1080, as a person sees it (display pacing) | not run (10 min) | not run | NEEDS_GPU | harness: NEEDS_GPU, 5 assertion(s) NOT RUN on a software renderer (everything else in this test ran and passed): webgl2 paced, whole field, 165,000 in view: frame time p95 <= 20 ms \| webgl2 paced, low over the lines (fly-through): frame time p95 <= 20 ms \| webgl2 paced, close to a firing line, smoke and guns: frame time p95 <= 20 ms \| webgl2 paced, playing at 60x with units on the move: frame time p95 <= 20 ms \| webgl2 paced, dragging the scrubber: frame time p95 <= 20 ms |
| webgl2: frame time with 165,000 soldiers at 1920x1080, uncapped (real cost per frame) | not run | not run | NOT RUN YET |  |
| webgpu: frame time with 165,000 soldiers at 1920x1080, as a person sees it (display pacing) | not run | not run | NOT RUN YET |  |
| webgpu: frame time with 165,000 soldiers at 1920x1080, uncapped (real cost per frame) | not run | not run | NOT RUN YET |  |
| webgl2: UI interactions: no long task over 50 ms and every input is answered within 100 ms (event timing), with all 165,000 on the field | not run | not run | NOT RUN YET |  |
| webgpu: UI interactions: no long task over 50 ms and every input is answered within 100 ms (event timing), with all 165,000 on the field | not run | not run | NOT RUN YET |  |

### real.spec.mjs

Source shell: `src-1-real` (2026-11-13 21:03Z; 7 passed, 1 failed, 0 not run of 8; 28 min; frozen source snapshot of commit 9e1e1777); `src-2-real` (2026-11-13 22:34Z; ? passed, ? failed, ? not run of ?; running, or no end line; frozen source snapshot of commit 9e1e1777).  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| honest labelling: the ribbon, the count, the About text and the landing copy say what is placed and what is an open gap; nothing claims accuracy or mentions how the pa... | pass (2 min) [src-2-real] | not run | PASS | run src-1-real (snapshot 9e1e1777): ribbon, count, About text and landing copy say what is placed and what is an open gap; no wording about how the page was made. |
| a placed unit: Units list, card with strength basis, entry, arrival note, tier, sources, kit manifest and a register link that opens | pass (4 min) [src-2-real] | not run | STALE_TEST (fixed, re-run src-2-real pending) | Failed on 'card shows Standing': the test looked at the card one minute after the END OF THE FIRST PATH of the focus unit (19th Indiana, Meredith's Iron Brigade). Since contract 1.5 (troop-map day positions read from Bachelder's 1876 maps; DEC-010, DEC-011, DEC-018; app/HISTORY-LAYER-NOTES.md 'Troop-map day positions') a placed unit carries several stops: this one has 6 paths and its second march (BACH-1876-S1) starts in the very minute its first ends, so the card correctly said Marching. The test now uses one minute after the end of the LAST path (44,445.5, where the layer's last event is 'stand', no event follows), as arrival.spec.mjs already did. Not a product defect; no assertion was weakened. Nothing after 'Standing' had been reached, so the rest of the test is checked by the re-run (all the other words it asserts exist in the card code). |
| a unit with no place: its card says open gap and why, still shows its ledger arrival window and strength basis, and the unit is not drawn or listed | pass (5 min) [src-2-real] | not run | PASS | run src-1-real: open-gap card with its reason, ledger arrival window and strength basis; not drawn (x = 1e6), not listed. |
| the evidence overlay outlines the placed units by tier (plausible-procedural) and works are drawn as rings with their place named; no error | pass (1 min) [src-2-real] | not run | PASS | run src-1-real: placed units outlined in the plausible-procedural tier colour, works drawn as rings with the place named. |
| a unit placed by an Official Records report: its card lists the report, the printed page, the quoted words, the tier and the checks, what is applied and what is not, a... | pass (4 min) [src-2-real] | not run | PASS | run src-1-real: report, printed page, quoted words, tier and checks on the card; a conflicting report is listed; a unit placed only by the ledger shows no claims section. |
| a unit placed by a troop-map day position: the card says the position is documented for the day and the time modelled, lists the label, sigma, crop and the ledgers' pl... | pass (5 min) [src-1-real] | not run | PASS | run src-1-real: the card states the position is documented for the day and the time modelled, with label, sigma, crop and the ledgers' places; the unit stands in its slot two minutes after arriving. |
| a unit drawn by a MODELLED road of approach (DEC-015): the card says MODELLED APPROACH with the siblings, report, page and printed words, carries the pill and the link... | pass (5 min) [src-1-real] | not run | PASS | run src-1-real: 56 modelled units, the card says MODELLED APPROACH with siblings, report, page and words and links EG-0070 (opens from the source shell); an open unit found in the layer gives its own reason. (The unit the test used to name, the 134th New York, is drawn since history layer v8, DEC-023E; the earlier attempt of this workstream already changed the test to look the open unit up.) |
| no console errors | pass (0 min) [src-1-real] | not run | PASS | run src-1-real: no console error or page error. |

### scrub.spec.mjs

Source shell: `src-1-scrub` (2026-11-13 23:37Z; ? passed, ? failed, ? not run of ?; running, or no end line; frozen source snapshot of commit 1b1a6941).  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| scrubber: random-access seeks equal sequential playback (Q12); the cache header carries seed and code version | not run | not run | NOT RUN YET |  |
| scrub across the full range from the keyboard: Home/End/PageUp/PageDown on the scrubber agree with the sequential state too | not run | not run | NOT RUN YET |  |
| pixel identity: after a detour, the picture at a time is the picture it was before (paused) | not run | not run | NOT RUN YET |  |
| no unit pops while playing at 60x: every unit moves at most double-quick speed per frame; units enter and leave the field only off the loaded ground | not run | not run | NOT RUN YET |  |
| no console errors | not run | not run | NOT RUN YET |  |

### sky.spec.mjs

Source shell: `src-1-sky` (2026-11-13 19:19Z; 5 passed, 0 failed, 0 not run of 5; 50 min; live source tree, changed during the run).  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| night frames keep luminance and contrast with units in view (Q10), and are dimmer than the day | pass (31 min) | not run | PASS | WebGL2 on SwiftShader. 10 night times from 3 Jul 20:30 to 9 Jul 00:30: mean luma 25.2 to 51.9 of 255 (floor 24), 5th percentile 15 or more (floor 6), 0.0 to 0.3 % near-black pixels (limit 2 %), contrast 0.29 to 0.60 (floor 0.2), every one dimmer than the day (mean 168.0). Gate Q10 holds with the weather pass, the crowd and the effects drawn. |
| the luminance floor is a parameter: raising it brightens the night monotonically, and its lowest setting still leaves the night visible | pass (16 min) | not run | PASS | night floor 0.15 / 0.25 / 0.34 / 0.5 / 0.6 gives mean luma 30.3 / 33.4 / 36.0 / 40.1 / 42.5 (monotonic), 0.0 % near black at every setting. |
| the light follows the table: at night the light comes from the moon where the sky table puts it; by day from the sun | pass (3 min) | not run | PASS | 3 Jul 15:00 light azimuth 259.0 = sun 259.0 (PDF B.10.2: 259); 4 Jul 01:00 light azimuth 145.9 = moon 145.9, 34 degrees up. |
| the day and night bar under the picture shows the same sky: dark where the sun is down, light where it is up | pass (0 min) | not run | PASS | strip luminance noon 3 Jul 169, midnight 44; noon 10 Jul 169, midnight 27 (noon over 2.5 x midnight on both days). |
| no console errors | pass (0 min) | not run | PASS | no console error and no page error during the whole spec. |

### structures3d.spec.mjs

Source shell: not run.  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| what is drawn: object counts per class, draw calls and triangles, at several times, in WebGPU and in WebGL2 | not run | not run | NOT RUN YET |  |
| the picture: each class changes it where the class stands (roads, fences, buildings, masses, markers), in WebGPU and in WebGL2 | not run | not run | NOT RUN YET |  |
| the state schedule changes the picture: the Emmitsburg Road fence is breached 15:30-16:15 on 3 July, a Bliss marker is charred after 3 July, a date-only change shows h... | not run | not run | NOT RUN YET |  |
| conflicts are selectable: reading PD-01 as Jul 2 evening changes the Sherfy barn on 2 July evening, and the reading is a property of the page (the per-object choice on... | not run | not run | NOT RUN YET |  |
| scrub purity and no leak: the state buffer and the picture at a time do not depend on how the time was reached; entering and leaving frees the structures | not run | not run | NOT RUN YET |  |
| selection and cards: tap a building, a fence, a marker, a road and a ring; the card shows name, kind, state, geometry source and error, tier and the schedule rows; a u... | not run | not run | NOT RUN YET |  |
| Views and Evidence: a toggle for every class (and the works rings), the list of what is not drawn, and the Evidence outlines in the tier colours | not run | not run | NOT RUN YET |  |
| frame cost and GPU memory with the structures on and off at 1920x1080 (default view, a town view, a close view), WebGPU and WebGL2 | not run | not run | NOT RUN YET |  |
| screenshots: the distance view, a close fence and wall, a close building, the town, the railway, a marker before and after, a card | not run | not run | NOT RUN YET |  |

### ui.spec.mjs

Source shell: not run.  
Packed dist: not run.  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| the landing page is inert and honest: no context, frame, timer or worker before entry; one entry control; no forbidden wording | not run | not run | NOT RUN YET |  |
| entering: the entry control works from the keyboard; focus lands on the battlefield; the loading step is announced | not run | not run | NOT RUN YET |  |
| focus order is Back, the tools, the battlefield, the playback controls, the scrubber; Tab never traps | not run | not run | NOT RUN YET |  |
| every control has an accessible name; the scrubber speaks the time; the drawer and card are named regions | not run | not run | NOT RUN YET |  |
| keyboard: panels open and close with focus restored; playback, stepping, events, speed, overlay and camera keys all act | not run | not run | NOT RUN YET |  |
| Events: 691 rows, tier filters, rows with no clock time say so and are not placed on the minute scale; a timed row moves the clock to its time | not run | not run | NOT RUN YET |  |
| Views: 16 tour stops and 512 monuments as camera bookmarks; a flight ends at the place; saved views are kept in the browser | not run | not run | NOT RUN YET |  |
| selecting a unit by keyboard: Units list, card with time, activity, position and uncertainty, kit manifest, source keys and a register link that opens | not run | not run | NOT RUN YET |  |
| Evidence overlay: tiers are drawn as colour AND outline AND glyph; clicking a mark selects it (demo tier assignment is labelled) | not run | not run | NOT RUN YET |  |
| conditions: sun and moon chips follow the sky table; a storm is named at 18:00 on 3 Jul; days without a weather record say so | not run | not run | NOT RUN YET |  |
| chapters: the 4 July night marker leads to the 19 November epilogue and back; the epilogue has its own scrubber range | not run | not run | NOT RUN YET |  |
| play and speed: time advances at the chosen speed, and the rate eases in instead of jumping | not run | not run | NOT RUN YET |  |
| honest labelling: the placeholder is named everywhere it appears, the About text is plain, no stub datum is presented as history, and nothing mentions how the page was... | not run | not run | NOT RUN YET |  |
| layout: no horizontal scroll, no overlapping header controls and the dock inside the window at 360, 390, 768, 1024, 1440 and 1920 wide; touch pad on touch screens | not run | not run | NOT RUN YET |  |
| phone: touch screen shows the movement pad, play works by tap, the drawer is a bottom sheet | not run | not run | NOT RUN YET |  |
| reduced motion: flights are instant and no rain is drawn; the same flight without the preference takes time | not run | not run | NOT RUN YET |  |
| the dock and chips contrast: tokens used for text meet WCAG AA on the panel colour | not run | not run | NOT RUN YET |  |
| no console errors or page errors during all of the above | not run | not run | NOT RUN YET |  |

### webgl2.spec.mjs

Source shell: `src-1-webgl2` (2026-11-13 19:13Z; 0 passed, 1 failed, 0 not run of 1; 6 min; live source tree, changed during the run); `src-2-webgl2` (2026-11-13 20:55Z; 1 passed, 0 failed, 0 not run of 1; 8 min; frozen source snapshot of commit 9e1e1777).  
Packed dist: `dist-1-webgl2` (2026-11-13 21:31Z; 1 passed, 0 failed, 0 not run of 1; 9 min; packed dist of commit 9e1e1777).  

Each result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| WebGL2 renders the placeholder crowd, hides units before their arrival, answers the scrubber, and leaves no context behind | pass (8 min) [src-2-webgl2] | pass (9 min) | PASS | Second run, frozen source snapshot 9e1e1777: 165,000 soldiers on 3 Jul 13:30 at 1280x720, the picture is not black, nothing is placed before any arrival (28 Jun), more than 100,000 present on 2 Jul, the scrubber answers, and leaving the theatre leaves 0 canvas contexts, 0 animation frames, 0 timers; no console error or page error. Frame p50 7.8 s on this renderer (printed in the log as not a timing of the product). The first attempt (live tree, run src-1-webgl2) failed only on one console line: the shell asks the server for src/ext/index.mjs with a HEAD request and the file was created 26 s into that run (the 404 is described in requests/spec-health-pack-ext-folder.md, point 1); it is not a product defect and not a harness problem. |

## Remaining: tests that are not green on this machine

| spec | test | state | why |
|---|---|---|---|
| arrival.spec.mjs | the page runs the real layer: 726 units, a handful placed, the rest marked open gap | NOT RUN YET | no source run has a result for this test yet |
| arrival.spec.mjs | across the whole window, in every frame sampled: nothing is drawn before its window opens, and the renderer was told exactly what the stage holds | NOT RUN YET | no source run has a result for this test yet |
| arrival.spec.mjs | an event before a unit's earliest arrival is refused by the sim event cache (Q04), listed, and the page says so | NOT RUN YET | no source run has a result for this test yet |
| arrival.spec.mjs | scenario selector: carries all 47 register conflicts and the weather conflicts; default is the delegated defaults (tier and label shown); the PDF v... | NOT RUN YET | no source run has a result for this test yet |
| arrival.spec.mjs | no console errors | NOT RUN YET | no source run has a result for this test yet |
| casualties.spec.mjs | webgl2: men of a unit fall in the picture while it stands in a printed window, stand up again when the scrubber goes back, and the same time gives ... | UNCLASSIFIED | the men stand up again: the renderer tables are rewritten, not left lying |
| casualties.spec.mjs | webgpu: men of a unit fall in the picture while it stands in a printed window, stand up again when the scrubber goes back, and the same time gives ... | NOT RUN YET | no source run has a result for this test yet |
| casualties.spec.mjs | the card of a unit with men down: the ranges, their basis, the printed window with its row and audit, the running count on the map, the manifests a... | NOT RUN YET | no source run has a result for this test yet |
| casualties.spec.mjs | nothing is uploaded when nothing changes: a still moment writes no soldier table, a moving one does; the animation clock is rebased on a seek | NOT RUN YET | no source run has a result for this test yet |
| leak.spec.mjs | webgl2: 20 enter/leave cycles leave no context, device, frame, timer, listener, worker, audio context or heap growth | NOT RUN YET | no source run has a result for this test yet |
| leak.spec.mjs | webgpu: 20 enter/leave cycles leave no context, device, frame, timer, listener, worker, audio context or heap growth | NOT RUN YET | no source run has a result for this test yet |
| leak.spec.mjs | Back pressed while the theatre is still loading leaves nothing behind | NOT RUN YET | no source run has a result for this test yet |
| leak.spec.mjs | the browser Back button and the #theatre link take the same path as the Back control | NOT RUN YET | no source run has a result for this test yet |
| leak.spec.mjs | sound: off until started; started inside the theatre it is one AudioContext with live nodes; Back closes it and leaves 0 nodes, 0 contexts, no time... | NOT RUN YET | no source run has a result for this test yet |
| leak.spec.mjs | added layers: loaded, every switch on and every panel opened, Back leaves nothing behind | NOT RUN YET | no source run has a result for this test yet |
| perf.spec.mjs | webgl2: frame time with 165,000 soldiers at 1920x1080, uncapped (real cost per frame) | NOT RUN YET | no source run has a result for this test yet |
| perf.spec.mjs | webgpu: frame time with 165,000 soldiers at 1920x1080, as a person sees it (display pacing) | NOT RUN YET | no source run has a result for this test yet |
| perf.spec.mjs | webgpu: frame time with 165,000 soldiers at 1920x1080, uncapped (real cost per frame) | NOT RUN YET | no source run has a result for this test yet |
| perf.spec.mjs | webgl2: UI interactions: no long task over 50 ms and every input is answered within 100 ms (event timing), with all 165,000 on the field | NOT RUN YET | no source run has a result for this test yet |
| perf.spec.mjs | webgpu: UI interactions: no long task over 50 ms and every input is answered within 100 ms (event timing), with all 165,000 on the field | NOT RUN YET | no source run has a result for this test yet |
| scrub.spec.mjs | scrubber: random-access seeks equal sequential playback (Q12); the cache header carries seed and code version | NOT RUN YET | no source run has a result for this test yet |
| scrub.spec.mjs | scrub across the full range from the keyboard: Home/End/PageUp/PageDown on the scrubber agree with the sequential state too | NOT RUN YET | no source run has a result for this test yet |
| scrub.spec.mjs | pixel identity: after a detour, the picture at a time is the picture it was before (paused) | NOT RUN YET | no source run has a result for this test yet |
| scrub.spec.mjs | no unit pops while playing at 60x: every unit moves at most double-quick speed per frame; units enter and leave the field only off the loaded ground | NOT RUN YET | no source run has a result for this test yet |
| scrub.spec.mjs | no console errors | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | what is drawn: object counts per class, draw calls and triangles, at several times, in WebGPU and in WebGL2 | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | the picture: each class changes it where the class stands (roads, fences, buildings, masses, markers), in WebGPU and in WebGL2 | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | the state schedule changes the picture: the Emmitsburg Road fence is breached 15:30-16:15 on 3 July, a Bliss marker is charred after 3 July, a date... | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | conflicts are selectable: reading PD-01 as Jul 2 evening changes the Sherfy barn on 2 July evening, and the reading is a property of the page (the ... | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | scrub purity and no leak: the state buffer and the picture at a time do not depend on how the time was reached; entering and leaving frees the stru... | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | selection and cards: tap a building, a fence, a marker, a road and a ring; the card shows name, kind, state, geometry source and error, tier and th... | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | Views and Evidence: a toggle for every class (and the works rings), the list of what is not drawn, and the Evidence outlines in the tier colours | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | frame cost and GPU memory with the structures on and off at 1920x1080 (default view, a town view, a close view), WebGPU and WebGL2 | NOT RUN YET | no source run has a result for this test yet |
| structures3d.spec.mjs | screenshots: the distance view, a close fence and wall, a close building, the town, the railway, a marker before and after, a card | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | the landing page is inert and honest: no context, frame, timer or worker before entry; one entry control; no forbidden wording | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | entering: the entry control works from the keyboard; focus lands on the battlefield; the loading step is announced | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | focus order is Back, the tools, the battlefield, the playback controls, the scrubber; Tab never traps | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | every control has an accessible name; the scrubber speaks the time; the drawer and card are named regions | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | keyboard: panels open and close with focus restored; playback, stepping, events, speed, overlay and camera keys all act | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | Events: 691 rows, tier filters, rows with no clock time say so and are not placed on the minute scale; a timed row moves the clock to its time | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | Views: 16 tour stops and 512 monuments as camera bookmarks; a flight ends at the place; saved views are kept in the browser | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | selecting a unit by keyboard: Units list, card with time, activity, position and uncertainty, kit manifest, source keys and a register link that opens | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | Evidence overlay: tiers are drawn as colour AND outline AND glyph; clicking a mark selects it (demo tier assignment is labelled) | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | conditions: sun and moon chips follow the sky table; a storm is named at 18:00 on 3 Jul; days without a weather record say so | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | chapters: the 4 July night marker leads to the 19 November epilogue and back; the epilogue has its own scrubber range | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | play and speed: time advances at the chosen speed, and the rate eases in instead of jumping | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | honest labelling: the placeholder is named everywhere it appears, the About text is plain, no stub datum is presented as history, and nothing menti... | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | layout: no horizontal scroll, no overlapping header controls and the dock inside the window at 360, 390, 768, 1024, 1440 and 1920 wide; touch pad o... | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | phone: touch screen shows the movement pad, play works by tap, the drawer is a bottom sheet | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | reduced motion: flights are instant and no rain is drawn; the same flight without the preference takes time | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | the dock and chips contrast: tokens used for text meet WCAG AA on the panel colour | NOT RUN YET | no source run has a result for this test yet |
| ui.spec.mjs | no console errors or page errors during all of the above | NOT RUN YET | no source run has a result for this test yet |


## Owed on a real GPU: assertions NOT RUN on a software renderer

| spec | test | assertions not run |
|---|---|---|
| perf.spec.mjs | webgl2: frame time with 165,000 soldiers at 1920x1080, as a person sees it (display pacing) | webgl2 paced, whole field, 165,000 in view: frame time p95 <= 20 ms; webgl2 paced, low over the lines (fly-through): frame time p95 <= 20 ms; webgl2 paced, close to a firing line, smoke and guns: frame time p95 <= 20 ms; webgl2 paced, playing at 60x with units on the move: frame time p95 <= 20 ms; webgl2 paced, dragging the scrubber: frame time p95 <= 20 ms |
