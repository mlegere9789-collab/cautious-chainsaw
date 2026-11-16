### 3.1 What moved since the fifth pass, at a glance

Computed by `spec-b-evidence/pass6/inputs_delta.py` (for each gate, the key inputs named in section 4 and the runner and test files, compared with the checkpoint commit 52261939 of 23:33 UTC on 15 November and with the working tree at 02:34 UTC on 16 November) and by the runs of 7.8. A gate that is not listed had none of its key inputs changed: Q11, Q13 and Q18. "Committed" means in the checkpoints of 15 November 23:43 to 16 November 02:30 (HEAD 5f2a4ef4 at the first reading).

| Gate | What moved | Effect on what a runner finds |
|---|---|---|
| Q01 | runner, 54 tests and a stored record (new); kit evidence 4 group files (`us-1c` 685 lines, `us-2c-1d` 463, `us-2c-2d3d` 547, `us-3c-1d` 463); scratch build 82 verified, 46 partly, 697 unverified | the first record is FAIL because `kit/verified_oob.json` is absent; the 108 undrawn units are 108 of the 133 failures |
| Q02 | runner, 35 and 15 tests and a stored record (new); undrawn research 1,536 records; correction files 2,997 and 430 rows | the census passes; 176 items fail on missing tiers, extracts, premise claims, procedural blocks and manifest fields |
| Q03 | runner and 117 + 6 tests (new), no record; kit and `ext` modules unchanged | a full run is about 300 s of CPU; the K.9 census and the 34-star colour fail by the runner's reading |
| Q04, Q05, Q06 | runners and 67, 42 and 49 tests (new), no record; layer and stage unchanged | the dense runs over S* never started; Q06 fails the 108 undrawn units |
| Q07, Q08, Q09 | fence correction files reworked; `life/` and `town/` evidence; `check_structures.py` unchanged | no runner; the structures-node reproduction shows the state logic runs without a browser |
| Q10 | harness negative controls and a static purity lint (new files); `weather3d-gpu.test.mjs` 33 `test(` calls; `GATE-HOOKS.md` +39 lines | no new frame result; the real GPU is reachable only by a session on the owner's PC |
| Q12 | scrub and casualties specs edited; node reproductions of three tests; crowd levels-of-detail module (`crowd-lod.test.mjs` 23 tests, `crowd-lod-real.test.mjs` 6, `crowd-lod-build.test.mjs`, `crowd-lod-glsl.test.mjs` 1) and four hook rows | the browser re-run of both specs is pending; a state identity cannot include the camera-dependent route of an effect |
| Q14 | runner, 47 tests and a stored record (new) | FAIL: the 784,105-round fire plan, 0 Confederate guns, no battery table |
| Q15 | `lib.mjs` comment and `SLOW.stepMs` only; LOD0 budget hooks | unchanged: NOT RUNNABLE HERE |
| Q16 | `make_doc.py`, `test_status.json`, `third_pass_inputs.json`, a new `webget.py`; test file 23 `test(` calls | data unchanged: 191 photographs, 145 statements, 20 poses, 0 documented positions |
| Q17 | `tools/bt/realize` 3 files, realize tests 27, 36 and 16 `test(` calls, `timeline_corrections` 430 rows, DD-RZ-13 to 17 | `check_coverage.py` unchanged; the harness block is read from a scratch run |
| Q19 | runner, 26 tests and a stored record (new) | FAIL: no recorded independence anywhere, no Section P ledger |
| Q20 | runner, 41 tests and a stored record (new) | FAIL: 33 documented units not drawn, no action table |
| Q21 | module, data (1,942,681 bytes, 589 claims) and tests extended (40 `test(` calls); native shader records | `checkVegetation` 927,000 states and `checkScene` 252,144, 0 failures |
| Q22 | `weather3d-gpu.test.mjs`, notes, hooks | no scene-against-timeline scan yet |
| Q23 | runner, 36 and 12 tests and a stored record (new) | FAIL; the runner counts 11 unmarked register entries where `check_coverage.py` counts 10 |
| Q24 | `app/tests/results/crowd-lod/` reports and sheets; hook rows | no baseline set or compare runner yet |
| Q25 | runner, 38 tests and a stored record (new); `acquired_3.json` 132 items at 02:4x UTC and 250 at 03:03 | FAIL: 75 untracked entries, 78 list rows with no status row |
| Q26 | `medical/` (7 files); `casualties.spec.mjs` | no casualty-flow data |
| Q27 | the owner's order: no cap; `owner_decision_2026_11_16` in the budget file; request note | a report gate that cannot pass |
| Q28 | `web-newspapers.jsonl` 82 rows (131 lines over the 15 rows) | nothing of the gate's own moved |
