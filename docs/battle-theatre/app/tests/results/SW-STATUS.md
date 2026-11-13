# Software-rendering status of the ten browser specs (round 1)

Workstream bt-spec-health (spec loop). This file is assembled by `node docs/battle-theatre/app/tests/results/sw-status.mjs 1 --write` from the run logs in `tests/results/sw-round-1/*.log` (TAP, one file per run), the hand verdicts in `sw-round-1/verdicts.json` and the hand-written text in `sw-round-1/notes.md`. Nothing in the tables is typed in from memory: a result column is read from a log, a verdict and its evidence column come from `verdicts.json` where a person decided, otherwise from the log.

**What this status is.** It says which assertions of the ten specs hold when the page is drawn by a software renderer on this machine (4 shared vCPUs, no GPU), against the source shell (`docs/battle-theatre`, served by `app/tools/serve.mjs`) and against a packed staging dist. It is **not** a timing of the product and not a picture of what a GPU draws. Every assertion that only a real GPU can answer is reported NOT RUN (NEEDS_GPU) and is owed on a real GPU; none was relaxed, scaled or skipped silently.

## Summary

6 tests in 2 specs: 5 PASS, 1 UNCLASSIFIED

## How the specs are run here

* **One at a time through the machine lock.** `tmp/bt-spec/driver.sh` takes one job from `tmp/bt-spec/queue2.txt` and runs it with `tools/horde/bench.sh tmp/bt-spec/runq.sh` (one lock hold per spec; the slot is given back between two specs). `runq.sh` runs `node --test --test-reporter=tap <spec>` detached, writes the log `tests/results/sw-round-1/<label>.log` (the first lines say the environment, the HEAD commit and the newest source file at the start; the last line says the end time, the exit code and whether a source file changed during the run), appends one line to `runs.tsv`, and stops the run only at a limit set far above the expected time (a hang guard, never a result). Labels: `src-<n>-<spec>` = source shell, `dist-<n>-<spec>` = packed dist (`BT_DIST=<folder>`).
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

### sky.spec.mjs

Source shell, latest run: `src-1-sky.log` (2026-11-13 19:19Z): 5 passed, 0 failed, 0 not run, of 5; 50 min; the source changed during the run.  
Packed dist, latest run: not run.

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| night frames keep luminance and contrast with units in view (Q10), and are dimmer than the day | pass (31 min) | not run | PASS | WebGL2 on SwiftShader. 10 night times from 3 Jul 20:30 to 9 Jul 00:30: mean luma 25.2 to 51.9 of 255 (floor 24), 5th percentile 15 or more (floor 6), 0.0 to 0.3 % near-black pixels (limit 2 %), contrast 0.29 to 0.60 (floor 0.2), every one dimmer than the day (mean 168.0). Gate Q10 holds with the weather pass, the crowd and the effects drawn. |
| the luminance floor is a parameter: raising it brightens the night monotonically, and its lowest setting still leaves the night visible | pass (16 min) | not run | PASS | night floor 0.15 / 0.25 / 0.34 / 0.5 / 0.6 gives mean luma 30.3 / 33.4 / 36.0 / 40.1 / 42.5 (monotonic), 0.0 % near black at every setting. |
| the light follows the table: at night the light comes from the moon where the sky table puts it; by day from the sun | pass (3 min) | not run | PASS | 3 Jul 15:00 light azimuth 259.0 = sun 259.0 (PDF B.10.2: 259); 4 Jul 01:00 light azimuth 145.9 = moon 145.9, 34 degrees up. |
| the day and night bar under the picture shows the same sky: dark where the sun is down, light where it is up | pass (0 min) | not run | PASS | strip luminance noon 3 Jul 169, midnight 44; noon 10 Jul 169, midnight 27 (noon over 2.5 x midnight on both days). |
| no console errors | pass (0 min) | not run | PASS | no console error and no page error during the whole spec. |

### webgl2.spec.mjs

Source shell, latest run: `src-1-webgl2.log` (2026-11-13 19:13Z): 0 passed, 1 failed, 0 not run, of 1; 6 min; the source changed during the run.  
Packed dist, latest run: not run.

| test | source | dist | verdict | evidence |
|---|---|---|---|---|
| WebGL2 renders the placeholder crowd, hides units before their arrival, answers the scrubber, and leaves no context behind | FAIL (6 min) | not run | UNCLASSIFIED | source run: Expected values to be strictly deep-equal: / + actual - expected / + [ / +   'Failed to load resource: the server responded with a status of 404 (Not Found)' |
