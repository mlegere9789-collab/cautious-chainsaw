# Software-rendering status of the ten browser specs (round 1)

Workstream bt-spec-health (spec loop). This file is assembled by `node docs/battle-theatre/app/tests/results/sw-status.mjs 1 --write` from the run logs in `tests/results/sw-round-1/*.log` (TAP, one file per run), the hand verdicts in `sw-round-1/verdicts.json` and the hand-written text in `sw-round-1/notes.md`. Nothing in the tables is typed in from memory: a result column is read from a log, a verdict and its evidence column come from `verdicts.json` where a person decided, otherwise from the log.

**What this status is.** It says which assertions of the ten specs hold when the page is drawn by a software renderer on this machine (4 shared vCPUs, no GPU), against the source shell (`docs/battle-theatre`, served by `app/tools/serve.mjs`) and against a packed staging dist. It is **not** a timing of the product and not a picture of what a GPU draws. Every assertion that only a real GPU can answer is reported NOT RUN (NEEDS_GPU) and is owed on a real GPU; none was relaxed, scaled or skipped silently.

## Summary

14 tests in 3 specs: 13 PASS, 1 STALE_TEST

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

### real.spec.mjs

Source shell, latest run: `src-1-real.log` (2026-11-13 21:03Z): 7 passed, 1 failed, 0 not run, of 8; 28 min; frozen source snapshot of commit 9e1e1777.  
Packed dist, latest run: not run.

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| honest labelling: the ribbon, the count, the About text and the landing copy say what is placed and what is an open gap; nothing claims accuracy or mentions how the pa... | pass (2 min) | not run | PASS | run src-1-real (snapshot 9e1e1777): ribbon, count, About text and landing copy say what is placed and what is an open gap; no wording about how the page was made. |
| a placed unit: Units list, card with strength basis, entry, arrival note, tier, sources, kit manifest and a register link that opens | FAIL (5 min) | not run | STALE_TEST (fixed, re-run src-2-real pending) | Failed on 'card shows Standing': the test looked at the card one minute after the END OF THE FIRST PATH of the focus unit (19th Indiana, Meredith's Iron Brigade). Since contract 1.5 (troop-map day positions read from Bachelder's 1876 maps; DEC-010, DEC-011, DEC-018; app/HISTORY-LAYER-NOTES.md 'Troop-map day positions') a placed unit carries several stops: this one has 6 paths and its second march (BACH-1876-S1) starts in the very minute its first ends, so the card correctly said Marching. The test now uses one minute after the end of the LAST path (44,445.5, where the layer's last event is 'stand', no event follows), as arrival.spec.mjs already did. Not a product defect; no assertion was weakened. Nothing after 'Standing' had been reached, so the rest of the test is checked by the re-run (all the other words it asserts exist in the card code). source run: card shows Standing |
| a unit with no place: its card says open gap and why, still shows its ledger arrival window and strength basis, and the unit is not drawn or listed | pass (4 min) | not run | PASS | run src-1-real: open-gap card with its reason, ledger arrival window and strength basis; not drawn (x = 1e6), not listed. |
| the evidence overlay outlines the placed units by tier (plausible-procedural) and works are drawn as rings with their place named; no error | pass (2 min) | not run | PASS | run src-1-real: placed units outlined in the plausible-procedural tier colour, works drawn as rings with the place named. |
| a unit placed by an Official Records report: its card lists the report, the printed page, the quoted words, the tier and the checks, what is applied and what is not, a... | pass (5 min) | not run | PASS | run src-1-real: report, printed page, quoted words, tier and checks on the card; a conflicting report is listed; a unit placed only by the ledger shows no claims section. |
| a unit placed by a troop-map day position: the card says the position is documented for the day and the time modelled, lists the label, sigma, crop and the ledgers' pl... | pass (5 min) | not run | PASS | run src-1-real: the card states the position is documented for the day and the time modelled, with label, sigma, crop and the ledgers' places; the unit stands in its slot two minutes after arriving. |
| a unit drawn by a MODELLED road of approach (DEC-015): the card says MODELLED APPROACH with the siblings, report, page and printed words, carries the pill and the link... | pass (5 min) | not run | PASS | run src-1-real: 56 modelled units, the card says MODELLED APPROACH with siblings, report, page and words and links EG-0070 (opens from the source shell); an open unit found in the layer gives its own reason. (The unit the test used to name, the 134th New York, is drawn since history layer v8, DEC-023E; the earlier attempt of this workstream already changed the test to look the open unit up.) |
| no console errors | pass (0 min) | not run | PASS | run src-1-real: no console error or page error. |

### sky.spec.mjs

Source shell, latest run: `src-1-sky.log` (2026-11-13 19:19Z): 5 passed, 0 failed, 0 not run, of 5; 50 min; the live source tree changed during the run.  
Packed dist, latest run: not run.

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| night frames keep luminance and contrast with units in view (Q10), and are dimmer than the day | pass (31 min) | not run | PASS | WebGL2 on SwiftShader. 10 night times from 3 Jul 20:30 to 9 Jul 00:30: mean luma 25.2 to 51.9 of 255 (floor 24), 5th percentile 15 or more (floor 6), 0.0 to 0.3 % near-black pixels (limit 2 %), contrast 0.29 to 0.60 (floor 0.2), every one dimmer than the day (mean 168.0). Gate Q10 holds with the weather pass, the crowd and the effects drawn. |
| the luminance floor is a parameter: raising it brightens the night monotonically, and its lowest setting still leaves the night visible | pass (16 min) | not run | PASS | night floor 0.15 / 0.25 / 0.34 / 0.5 / 0.6 gives mean luma 30.3 / 33.4 / 36.0 / 40.1 / 42.5 (monotonic), 0.0 % near black at every setting. |
| the light follows the table: at night the light comes from the moon where the sky table puts it; by day from the sun | pass (3 min) | not run | PASS | 3 Jul 15:00 light azimuth 259.0 = sun 259.0 (PDF B.10.2: 259); 4 Jul 01:00 light azimuth 145.9 = moon 145.9, 34 degrees up. |
| the day and night bar under the picture shows the same sky: dark where the sun is down, light where it is up | pass (0 min) | not run | PASS | strip luminance noon 3 Jul 169, midnight 44; noon 10 Jul 169, midnight 27 (noon over 2.5 x midnight on both days). |
| no console errors | pass (0 min) | not run | PASS | no console error and no page error during the whole spec. |

### webgl2.spec.mjs

Source shell, latest run: `src-2-webgl2.log` (2026-11-13 20:55Z): 1 passed, 0 failed, 0 not run, of 1; 8 min; frozen source snapshot of commit 9e1e1777.  
Packed dist, latest run: `dist-1-webgl2.log` (2026-11-13 21:31Z): ? passed, ? failed, ? not run, of ?; still running or no end line; packed dist built from commit 9e1e1777.  
Earlier runs of this round: `src-1-webgl2.log` (0/1 passed).

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| WebGL2 renders the placeholder crowd, hides units before their arrival, answers the scrubber, and leaves no context behind | pass (8 min) | no result yet | PASS | Second run, frozen source snapshot 9e1e1777: 165,000 soldiers on 3 Jul 13:30 at 1280x720, the picture is not black, nothing is placed before any arrival (28 Jun), more than 100,000 present on 2 Jul, the scrubber answers, and leaving the theatre leaves 0 canvas contexts, 0 animation frames, 0 timers; no console error or page error. Frame p50 7.8 s on this renderer (printed in the log as not a timing of the product). The first attempt (live tree, run src-1-webgl2) failed only on one console line: the shell asks the server for src/ext/index.mjs with a HEAD request and the file was created 26 s into that run (the 404 is described in requests/spec-health-pack-ext-folder.md, point 1); it is not a product defect and not a harness problem. |
