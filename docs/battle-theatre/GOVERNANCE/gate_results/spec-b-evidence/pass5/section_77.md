### 7.7 The fifth pass (15 November, from 22:53 UTC)

Raw outputs are in `spec-b-evidence/pass5/` (the end-of-pass readings in `pass5/end/`). The programs of this pass are `facts.py` and `implementation_facts.py` (22:5x; `pass5/facts.out`, `implementation_facts.out`), `pass5/inputs_delta.py` (3.1; `inputs_delta.out`, 23:01), `corrections_by_gate.py` (`corrections_by_gate.out`), `library_counts.py` (`library_counts.out`, 23:18), `quick_quotes.py` and the two shell scripts. `pass5/run_light.sh` ran 42 light commands from 22:58:55 to 23:03:36 with HEAD 064a8bec (load average 15.2, 8.4 and 3.6 at its start; the locked job started during it) and `pass5/run_light_end.sh` the same commands again from 23:24:32 with HEAD 82dcbdaa (load average 8.2, 9.3 and 8.7, rising to 22 while it ran); each folder's `light-runs.tsv` has a line per command (start, name, exit, wall, CPU). None took the lock. First run, exit 0 for all except the three coverage checks that fail by design and five test files whose data or tests were moving: `photomatch-q16` (16 tests, 11 pass, 4 fail, 1 skipped), `tests/photomatch.test.mjs` (the older file, 6 tests, 2 pass, 3 fail, 1 skipped), `roster-union-ma` (124 tests, 100 pass, 24 fail), `vegetation` (28 tests, 27 pass, 1 fail) and `weather3d-gpu` (29 tests, 28 pass, 1 fail). End run: `photomatch-q16`, `vegetation` and `weather3d-gpu` green, the older photo-match file and `roster-union-ma` as before.

| Run | First run (22:58 to 23:03) | End run (23:24 to 23:3x) |
|---|---|---|
| `check_governance.py`, `check_coverage.py`, `test_coverage.py`, `coverage.test.mjs` | exit 0, 1, 1, 1; the figures of 2.3 | the same |
| `check_arrivals.py`, `check_kit.py --quiet`, `check_structures.py`, `validate_provenance.py` | exit 0: 726 units, 44 rows, 9 sub-unit gates, 56 gates, 4 unparsed cells; 322 units, 191 items, 45 weapons, 0 ERROR, 4 WARN, 45 of 45 self-tests, 23,112 manifests; INTEGRITY 649, Q08 186, Q07 191, Q09 1,306, scrub 1,441, ALL PASS; self-test OK | the same |
| `kit_evidence_check.py --all --quiet`, `kit_verified.py build --out-dir <scratch>` | exit 0: 472 and 332 lines; 45 verified, 23 partly, 757 unverified of 825 | 517 and 413 lines; 44, 24 and 757 |
| `check_undrawn.py --all` | exit 0: 962 records, 0 errors, 7 warnings, nothing owed | the same |
| `terrain_check.py`, `verify_positions.py A` to `E` (12, seed 3) | exit 0 each; output identical to pass 4 | the same |
| `realize/check.mjs --digests` and `--out <scratch>` | exit 0: harness fc85b8db0fca8cae, inputs 1c5066a209ff3320; the `q17` block equals the stored one | exit 0: harness 5f4c2bbf7d106936, inputs ad302f7e25b017fa (`README.md`, `q.mjs` and `mutations.json` of the harness are modified in the working tree); the same `q17` numbers |
| `veg_check.mjs`, `veg_scene_check.mjs`, `build_vegetation.py --check` | exit 0: 556,200 and 157,590 states, 0 failures, 927 units, 481 claims; "check: same" | 741,600 and 189,108 states, 0 failures, 927 units, 559 claims; "check: same" |
| `sim.test.mjs` | 6 of 6 | 6 of 6 |
| `ext-loader`, `ext-monuments`, `ext-tour`, `ext-site-data`, `ext-site-places-loader` | 29, 38, 13, 14 and 5 tests, all pass | 29, 45, 13, 14 and 5, all pass |
| `ext-site-source.mjs --check`, `ext-site-years.mjs --check` | exit 0: the copies equal the site's data in 10 trees; 33 memorials with years | the same |
| `roster-union-nh`, `roster-union-ma` | 23 pass; 124 tests, 100 pass, 24 fail (the pointer file's size and sha256 of each Massachusetts unit) | the same |
| `medical-evidence.test.mjs` | 6 of 6 | 6 of 6 |
| `vegetation`, `vegetation-shell`, `vegetation-scene`, `vegetation-wind` tests | 28 (one fail), 7, 3, 4 | 38 (all pass), 7, 3, 4 |
| `weather3d-gpu.test.mjs` | 29 tests, 28 pass, 1 fail | 34 tests, all pass |
| `photomatch-q16.test.mjs`, `tests/photomatch.test.mjs` | 16 tests, 11 pass, 4 fail, 1 skipped; 6 tests, 2 pass, 3 fail, 1 skipped | 22 tests, 21 pass, 1 skipped; the older file unchanged |
| `realize.test.mjs`, `realize-rules.test.mjs` | 25 and 31 tests, all pass | 27 tests, all pass; `realize-rules`: see the end of this section |

The locked job `pass5/heavy_inner.sh` was queued with `tools/horde/bench.sh` at 22:58:33 and started at 22:59:27 (HEAD 064a8bec, load averages 14.84 9.02 3.94), 54 seconds later; it ran its steps one after the other (`pass5/heavy-runs.tsv`, one `.out` file per step) and ended at 23:10:43:

| Step | Exit | Wall | Result |
|---|---|---|---|
| `browser_caps` | 0 | 3.2 s | Chrome 153.0.8010.12; WebGL2 renderer ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver), MAX_TEXTURE_SIZE 8192; WebGPU adapter google swiftshader (fallback true) |
| `realize_inputs_test` | 1 | 195.3 s | 15 tests, 14 pass, 1 fail (test 8; Q17) |
| `bt_pack_test` | 1 | 17.3 s | 76 tests, 73 pass, 3 fail (the three copy-audit tests of section 6, the same ten hits) |
| `check_figures` | 0 | 87.4 s | `check_figures: OK` |
| `node_suite` | 1 | 372.3 s | 810 tests, 783 pass, 25 fail, 0 cancelled, 2 skipped |

Reading of the node suite (HEAD 7d79b912 at the start of that step, 23:04:31): 24 of the 25 failures are `roster-union-ma.test.mjs`, "the pointer file records this file's size and sha256" once for each of the 24 Massachusetts units (1st Massachusetts Infantry to 9th Massachusetts Battery), while the roster lane was rewriting `rosters/data2/INDEX.json` and `status.json`; the 25th is `vegetation.test.mjs` test 13 (Q21); the two skips are the test of `anim3d.test.mjs` that needs the OCR texts of `tmp/library/misc` ("OCR texts (tmp/library/misc) not present") and the optional render test of `photomatch-q16.test.mjs`; no line `NOT RUN (NEEDS_GPU)` appears, because no browser spec is among these files. The photo-match and weather tests that had failed at 23:00 to 23:01 printed no `not ok` in this run. The suite had 40 test files (37 at pass 4) and 810 tests (658 at pass 4, 551 at the second pass).

Two more jobs were queued through the lock: `pass5/heavy2_inner.sh` (the three evidence validators of the OA10 to OA12 lanes: `life/validate_evidence.py --all`, `medical/validate_evidence.py --all --summary` and `town/validate_evidence.py --all --allow-missing`) at 23:06:47, and `verify_quotes.py` over a snapshot of this file at 23:22:30. At the time this paragraph was written (see 8.8) neither had started, with 33 `tools/horde/bench.sh` jobs waiting; their outputs, if they ran, are `pass5/life_validate_all.out`, `medical_validate_all.out`, `town_validate_all.out` and `verify_quotes_mid.out`. The quotation check that did run is `pass5/quick_quotes.py`, one multi-pattern ripgrep scan (a few seconds of CPU, no lock) over the added and changed lines of this file: 66 quoted strings in 52 fragments, 46 found in repository files, 6 only in run output, 0 nowhere (`quick_quotes_1.out`); its negative control, a copy with two altered quotations, reports 2 nowhere (`quick_quotes_negctl.out`). A first version of the control was found worthless and fixed: it sat inside the scanned folders and so found its own altered strings, which is the flaw of the first three passes (8.5).
