### 7.8 The sixth pass (16 November, from 02:30 UTC)

Raw outputs are in `spec-b-evidence/pass6/`. The programs of this pass are `facts.py` and `implementation_facts.py` (`facts.out`, `implementation_facts.out`), `inputs_delta.py` (3.1; base 52261939; `inputs_delta.out`), `result_currency.py` (re-hashes the inputs that a stored record names), `result_digest.py` with `result_digest.out` and `reason_distribution.out` (why each stored record fails), `corrections_by_gate.py`, `library_counts.py`, `run_light.sh` (the light commands), `run_light2.sh` (the seven runners that have a stored record, run directly into a scratch folder), `heavy_a.sh` and `heavy_c.sh` (the two locked jobs), `gen_sections.py`, `gen_static.py`, `blocks_a.py`, `blocks_b.py` and `build_doc.py` (which applies this pass to `GATE-SPEC-B.before-pass6.md` and is idempotent: when a locked job finishes, `python3 -I pass6/gen_sections.py && python3 -I pass6/build_doc.py` rewrites this file with its result) and `quick_quotes.py` (the quotation check). `pass6/run_light.sh` ran 58 light commands from 02:42 UTC (HEAD 536b7773, load average 23 at its start and 22 to 31 while it ran; every command nice'd; none took the lock). An exit code other than 0 is the three coverage checks (which fail by design) and their test files, `tests/photomatch.test.mjs` (the older file, as at the fifth pass), `medical-evidence.test.mjs` (deviation 5 below) and the OA11 validator (its last line is in the table).

| Run | Exit | CPU | Result |
|---|---|---|---|
| `check_governance` | 0 | 0.1 s | ok true; 969 sub-requirements, passing 0, linked to an open entry 508 |
| `check_coverage` | 1 | 0.0 s | Q17 315 covered by an entry, 0 by a realization, 376 uncovered; Q18 461 unlinked; Q23 10 unmarked of 385 |
| `test_coverage_py` | 1 | 0.1 s | 4 tests, 3 failures (by design: the three coverage checks fail honestly) |
| `coverage_test_mjs` | 1 | 0.1 s | 4 tests, 1 pass, 3 fail (the same) |
| `check_arrivals` | 0 | 0.1 s | units: 726  rows: 44  subunit gates: 9  gates: 56  unparsed cells: 4; check_arrivals: OK |
| `check_kit_quiet` | 0 | 5.5 s | RESULT: PASS (exit 0); 23112 manifests; 0 ERROR, 4 WARN; 45 of 45 self-tests |
| `check_structures` | 0 | 3.3 s | RESULT: ALL PASS (INTEGRITY 649, Q08 186, Q07 191, Q09 1,306, scrub 1,441) |
| `validate_provenance` | 0 | 0.0 s | validate_provenance self-test OK |
| `kit_evidence_check_all` | 0 | 20 s | 4 groups, 0 errors; required pairs 236, 134, 200 and 134 all evidenced or gaps |
| `kit_verified_scratch` | 0 | 20 s | verified_oob {"units": 825, "evidence_lines_used": 1886, "rejected_lines": 0, "verified": 82, "partly": 46, "unverified": 697} |
| `check_undrawn_all` | 0 | 6.8 s | 1536 records in 4 files, 0 errors, 21 warnings, nothing owed |
| `terrain_check` | 0 | 0.2 s | terrain_check: OK |
| `verify_positions_A` | 0 | 2.1 s | exit 0 |
| `verify_positions_B` | 0 | 2.0 s | exit 0 |
| `verify_positions_C` | 0 | 2.1 s | exit 0 |
| `verify_positions_D` | 0 | 2.1 s | exit 0 |
| `verify_positions_E` | 0 | 1.9 s | exit 0 |
| `realize_digests` | 0 | 2.1 s | {;  "harness": "bt-realize-1",;  "harness_digest": "30ec0d0142b1ce2b",;  "inputs_digest": "f415056737470af5",;  "inputs_parts": {; |
| `realize_scratch` | 0 | 4.0 s | see 2.3 / Q17 |
| `veg_check` | 0 | 4.5 s | ok true, 927,000 states, 0 failures |
| `veg_scene_check` | 0 | 8.9 s | checkVegetation 927,000 states, 0 failures; checkScene 252,144 states, 0 failures |
| `veg_build_check` | 0 | 7.6 s | "check: same" |
| `gates_test_extracts` | 0 | 0.1 s | 15 tests: 15 pass, 0 fail |
| `gates_test_q25` | 0 | 2.7 s | 38 tests: 38 pass, 0 fail |
| `gates_test_q19` | 0 | 1.6 s | 26 tests: 26 pass, 0 fail |
| `gates_test_q02` | 0 | 2.5 s | 35 tests: 35 pass, 0 fail |
| `gates_test_q23` | 0 | 2.3 s | 36 tests: 36 pass, 0 fail |
| `gates_test_q23_app` | 0 | 1.0 s | 12 tests: 12 pass, 0 fail |
| `gates_test_q03_scene` | 0 | 17 s | 6 tests: 6 pass, 0 fail |
| `gates_test_q01` | 0 | 12 s | 54 tests: 54 pass, 0 fail |
| `gates_test_q14` | 0 | 10 s | 47 tests: 47 pass, 0 fail |
| `gates_test_q20` | 0 | 14 s | 41 tests: 41 pass, 0 fail |
| `gates_test_q05` | 0 | 14 s | 42 tests: 42 pass, 0 fail |
| `gates_test_q06` | 0 | 17 s | 49 tests: 49 pass, 0 fail |
| `gates_test_q04` | 0 | 39 s | 67 tests: 67 pass, 0 fail |
| `sim_test` | 0 | 0.2 s | 6 tests: 6 pass, 0 fail |
| `photomatch_old_test` | 1 | 0.1 s | 6 tests: 2 pass, 3 fail, 1 skipped |
| `photomatch_q16_test` | 0 | 0.6 s | 23 tests: 22 pass, 0 fail, 1 skipped |
| `ext_loader_test` | 0 | 0.6 s | 29 tests: 29 pass, 0 fail |
| `ext_monuments_test` | 0 | 1.3 s | 47 tests: 47 pass, 0 fail |
| `ext_tour_test` | 0 | 0.3 s | 13 tests: 13 pass, 0 fail |
| `ext_site_data_test` | 0 | 7.9 s | 19 tests: 19 pass, 0 fail |
| `ext_site_places_loader_test` | 0 | 0.3 s | 5 tests: 5 pass, 0 fail |
| `ext_site_source_check` | 0 | 0.9 s | the copies equal the site's data in 10 tree(s) |
| `ext_site_years_check` | 0 | 1.4 s | the years file is fit and equals what the saved report texts give |
| `roster_union_nh_test` | 0 | 0.3 s | 23 tests: 23 pass, 0 fail |
| `medical_evidence_test` | 1 | 35 s | 6 tests: 5 pass, 1 fail |
| `vegetation_test` | 0 | 21 s | 40 tests: 40 pass, 0 fail |
| `vegetation_shell_test` | 0 | 0.9 s | 7 tests: 7 pass, 0 fail |
| `vegetation_scene_test` | 0 | 13 s | 3 tests: 3 pass, 0 fail |
| `vegetation_wind_test` | 0 | 0.1 s | 4 tests: 4 pass, 0 fail |
| `weather3d_gpu_test` | 0 | 3.8 s | 43 tests: 43 pass, 0 fail |
| `crowd_lod_test` | 0 | 2.1 s | 23 tests: 23 pass, 0 fail |
| `realize_test` | 0 | 49 s | 27 tests: 27 pass, 0 fail |
| `realize_rules_test` | 0 | 39 s | 42 tests: 42 pass, 0 fail |
| `life_validate_all` | 1 | 6.1 s | 1383 row(s) in 7 file(s): 1 error(s), 30 warning(s) |
| `medical_validate_all` | 0 | 32 s | checked 1003 rows in 22 group file(s): 0 failed |
| `town_validate_all` | 0 | 6.2 s |   warn  terrain-changes-since-1863: no evidence file (not started) |

**Run directly after the light script** (not under the lock, because locked job A had not started; niced; `pass6/light3-runs.tsv`, `pass6/bt_pack_test.out`): the two test files of `tests/bt-pack` (the packer and the copy audit of the shipped dist), 03:15 UTC, 96 tests of which 92 pass and 4 fail, 21 s of CPU and 121 s of wall time; the four failures are the copy-audit tests of section 6.

**The seven runners with a stored record, run directly** (`pass6/run_light2.sh`, 02:55 to 02:59 UTC, each under 30 s of CPU, niced, into `tmp/bt-gates/pass6/results`; `GOVERNANCE/gate_results` was not touched; exit code 1 is the FAIL verdict):

| Runner | Exit | CPU | Wall | Scratch result | Against the stored record |
|---|---|---|---|---|---|
| `Q25` | 1 | 0.2 s | 2.2 s | FAIL, 368 items (PASS 15, FAIL 352, BLOCKED-INPUT 1) | differs: stored PASS 15, FAIL 237, BLOCKED-INPUT 1 |
| `Q23` | 1 | 3.2 s | 15 s | FAIL, 102 items (PASS 50, FAIL 43, NOT-RUN 2, BLOCKED-INPUT 1, N/A 6) | same verdict and counts |
| `Q19` | 1 | 4.3 s | 24 s | FAIL, 203 items (PASS 29, FAIL 121, BLOCKED-INPUT 1, N/A 52) | same verdict and counts |
| `Q02` | 1 | 13 s | 68 s | FAIL, 301 items (PASS 49, FAIL 176, N/A 76) | same verdict and counts |
| `Q01` | 1 | 7.9 s | 36 s | FAIL, 3,804 items (FAIL 133, BLOCKED-INPUT 3,510, N/A 161) | same verdict and counts |
| `Q14` | 1 | 7.3 s | 37 s | FAIL, 206 items (PASS 43, FAIL 61, NOT-RUN 1, BLOCKED-INPUT 101) | same verdict and counts |
| `Q20` | 1 | 11 s | 60 s | FAIL, 319 items (PASS 20, FAIL 212, BLOCKED-INPUT 79, N/A 8) | same verdict and counts |

**Locked jobs.** Two jobs were queued with `tools/horde/bench.sh`: job A at 02:36:20 UTC and job C at 02:46:04.

Locked job A: queued at 02:36:20 UTC; it had not started when this was written (the process list at that time showed the machine lock held by other workstreams, 29 to 34 `bench.sh` processes waiting and two `--timing` jobs of another workstream waiting for the lock alone). Its script is `pass6/heavy_a.sh` and its outputs, when it runs, are `pass6/<step>.out` and `pass6/heavy-a-runs.tsv`.

Locked job C: queued at 02:46:04 UTC; it had not started when this was written (the process list at that time showed the machine lock held by other workstreams, 29 to 34 `bench.sh` processes waiting and two `--timing` jobs of another workstream waiting for the lock alone). Its script is `pass6/heavy_c.sh` and its outputs, when it runs, are `pass6/<step>.out` and `pass6/heavy-c-runs.tsv`.

**Deviations from the working rules, recorded.** (1) `tests/governance/gates/test_q03.py` was started directly (niced) to measure its cost with a short timeout in mind and ran 490 s of wall time and 128 s of CPU (117 tests, all pass; `pass6/gates_test_q03_verbose.out`, `gates_test_q03.time`): over the guideline of 30 s of CPU, so a repeat belongs under the lock. (2) `test_q04.py` took 38.9 s of CPU and `medical-evidence.test.mjs` 35.1 s: over the guideline by a little, run in the light script; (3) `kit_evidence_check.py --all` took 20 s of CPU and `kit_verified.py build` 19.8 s (9.6 and 9.3 s at the fifth pass, with two evidence groups instead of four). (4) The whole node suite was not run (8.11). (5) `medical-evidence.test.mjs` printed 5 of 6 passing: its test 6 (`--all`) fails on two rows of `medical/evidence/wounds-regions.jsonl` (E013: "the claim states 4" and "the claim states 11", which the quote does not) while the medical lane was extending that file; it is that lane's file and test and says nothing of a gate.

**Not run** (as in 7.4, 7.5 and 7.7 and for the reasons they give, plus): any browser spec or harness (the capability probe is in locked job A), the dense runs of Q04 to Q06, the mutation checks of Q03 and Q04 to Q06, `link_subreqs.py`, `register_from_proposed.py`, `gate_q11`, `gate_q22`, `drill_check.py`, and anything on a real GPU.
