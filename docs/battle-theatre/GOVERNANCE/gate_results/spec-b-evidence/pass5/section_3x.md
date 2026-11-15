### 3.1 What moved since the fourth pass, at a glance

Computed by `spec-b-evidence/pass5/inputs_delta.py` (for each gate, the key inputs named in section 4 compared with the checkpoint commit 82d95249 that holds the fourth pass, and with the working tree at 23:01 UTC on 15 November) and by the runs of 7.7. A gate that is not listed had none of its key inputs changed: Q04, Q05, Q11, Q13, Q14, Q15, Q18, Q19, Q20, Q23, Q27 and Q28. "Committed" means in the checkpoints of 14 November 01:07 to 01:37 UTC (the campaign then stopped at the weekly limit and began again at 22:55 UTC on 15 November); "uncommitted" means written by a lane that restarted today.

| Gate | What moved | Effect on what a runner finds |
|---|---|---|
| Q01 | `kit/evidence/us-1c.jsonl` and `us-2c-1d.jsonl` rewritten (uncommitted); scratch build 45 verified, 23 partly, 757 unverified of 825 | still no `verified_oob.json`; cannot pass on inputs |
| Q02 | undrawn research files 962 records (was 635), 0 owed; three evidence validators (OA10 to OA12); 2,774 correction lines name rows | no scan over every datum class |
| Q03 | `ext` modules edited today (uncommitted); `check_figures.py` still OK | the modern-object scan still absent |
| Q06 | three undrawn group files grew; the layer did not change | 108 units still without a path in the layer |
| Q07, Q08, Q09 | `fence-1`, `fence-2` reworked; OA10 `town/` and OA11 `life/` evidence and validators; `structures/` unchanged | no building-state or work data of the new lanes; `check_structures.py` the same |
| Q10 | six close WebGPU views (night one: mean 58.5, black share 0) and a second WebGPU implementation, software only; the WebGL2 run of the six written today | no new browser result of the gate's own spec |
| Q12 | no new spec result; `scrub`, `arrival` and `casualties` are not in the restarted spec queue | the scrubber and the pop test still unrun |
| Q16 | registry 191 photographs, 145 statements, 20 poses; three documented camera places, 0 documented positions; test file changing | cannot pass on inputs |
| Q17 | harness stricter (DD-RZ-10 to 12), build list, new tests; counts equal; stored `RESULTS.json` stale in its digests | a runner runs `check.mjs --out`; 4 of 691 realized |
| Q21 | `wind.mjs`, 927 units and 481 claims, event guard; checks green; the corrections test red on 174 rows | the check passes on the data it is given |
| Q22 | vegetation wind read from the weather timeline; WebGPU notes | no scene-against-timeline scan |
| Q24 | six close views stored; PNG decoder, `diffStats`, real-GPU run plan (uncommitted) | no viewer baseline and no compare runner |
| Q25 | `status_3.json` 15 entries, `acquired_3.json` 81 items and 9 blocked or failed | 83 entries, 58 ids, 11 status words; medical works still without rows |
| Q26 | OA12 evidence set (22 groups, 148 rows), validator, node test | no casualty-flow data; no hospital-scenes module |

### 3.2 Entry points a runner can call, with the cost measured at pass 5

CPU seconds are user plus system from `pass5/light-runs.tsv` on a loaded machine (load average 7 to 15), so they are upper bounds; a figure marked (earlier pass) was measured at the pass named and not repeated. "Lock" means the job needs more than about 30 s of CPU or a browser and belongs under `tools/horde/bench.sh`. The last column names what the command writes when run as a command; none of the commands listed writes anything but the file named (the others write nothing).

| Gate | What to run or import | Cost | Lock | Writes when run as a command |
|---|---|---|---|---|
| Q01 | `check_arrivals.py`; `kit_evidence_check.py --all --quiet`; `kit_verified.py build --out-dir <scratch>` | 0.05 s; 9.6 s; 9.3 s | no | `kit_verified.py` without `--out-dir`: `kit/verified_oob.json`, `kit/verified_batteries.json` |
| Q02 | `validate_provenance.validate(datum, visible_result=True)` (import); `verify_positions.py A..E 12 3`; `check_undrawn.py --all`; `terrain_check.py`; the OA validators (7.7) | 0.02 s; 2 s each; 5.9 s; 0.2 s | no (the OA validators: see 7.7) | none |
| Q03 | `check_kit.py --quiet`; `check_figures.py` (no `--write`); `site-places.mjs` `checkLaterMemorials(mem, T?, years?)` and `checkTourBookmarks(tour, T)`; the `ext-*` node tests | 5.1 s; 87.4 s wall; 0.2 to 5.0 s each | `check_figures.py` yes | `check_figures.py --write`: `app/data/figures-validation.json` |
| Q04 | `check_arrivals.presence_ok(unit_id, time_iso, scenario, location)`, `gate_time`; `sim/cache.mjs EventCache`; the stage test of `history.test.mjs` | 0.05 s; 0.2 s (`sim.test.mjs`); about 90 s (first pass) | stage test yes | none |
| Q05, Q06 | node: `createRealHistory({ raw, T, helpers })` with `loadRawFromDisk()`, `terrainMeta()`, `layer.both(scenario)`, `layer.report(scenario)`; `check_undrawn.py --all` | not timed separately (`history.test.mjs` is inside the 372 s suite); 5.9 s | the suite yes | none |
| Q07, Q08, Q09 | `check_structures.py` (`state_at`, `check_q07`, `check_q08`, `check_q09`, `check_scrub`) | 3.1 s | no | none |
| Q10 | `check_environment.night_luminance_floor(time_iso)`; `checkRun` and `checkCompare` of `weather3d-gpu-check.mjs`; the browser `sky.spec.mjs` | inside `weather3d-gpu.test.mjs` (2.3 s of CPU); the same; hours (13 November: 2,977 s) | the spec yes | the spec writes under `app/tests/results/<BT_OUT>/` |
| Q11 | `check_environment.gate_q11(recompute)` and `pdf_figure_checks()` in the astropy scratch environment | 26 to 35 s (second pass) | yes | `check_environment.py` as a command rewrites `environment/check_environment_results.json` |
| Q12 | `sim/cache.mjs scrubTest`; `check_structures.py` scrub; the browser `scrub.spec.mjs` | 3.1 s; hours | the spec yes | the spec writes under `app/tests/results/` |
| Q13 | `audio3d` and `audio-host` node tests (`speedOfSound`, `atmosphereFromWeather`, the offline render) | `audio3d-round2` and `audio-host` at most 4.1 s each (pass 4); `audio3d.test.mjs` is inside the 372 s suite | the suite yes | none |
| Q14 | `check_kit.py` (125 artillery units); `structures-ws6.test.mjs`; `drill_check.py` (needs the 16 OCR texts: 9 absent) | 5.1 s; inside the suite; 44 s with the scratch texts (second pass) | `drill_check.py` yes | none |
| Q15 | none that can run here: `perf.spec.mjs` records NOT RUN (NEEDS_GPU) | not applicable | not applicable | not applicable |
| Q16 | `photomatch-q16.test.mjs`; `tools/bt/photomatch/run.mjs` (renders) | 0.4 s; renders through the lock | `run.mjs` yes | `run.mjs`: `resolved_poses.json`, `metrics.json`, `reports/` |
| Q17 | `check_coverage.py`; `check.mjs --out <file>` and `check.mjs --digests` of `tools/bt/realize` | 0.04 s; 3.9 s and 2.0 s | no | `check.mjs` without `--out`: `GOVERNANCE/realizations/RESULTS.json` |
| Q18 | `check_governance.py`; `check_coverage.py` | 0.1 s; 0.04 s | no | `check_governance.py`: `GOVERNANCE/check_report.json` |
| Q19 | `verify_positions.py A..E`; `claims`, `daypos`, `ledgerE` and `scenario-defaults` node tests | 2 s each; inside the suite | no | none |
| Q20 | `check_kit.py`; `cavalry-ws10.test.mjs` | 5.1 s; at most 4.1 s (pass 4) | no | none |
| Q21 | `checkVegetation(model, opts)` and `checkScene(model, opts)` (import; `pass3/veg_check.mjs`, `pass4/veg_scene_check.mjs`); `build_vegetation.py --check` | 2.9 s and 5.0 s; 7.2 s | no | `build_vegetation.py` without `--check`: `app/data/vegetation.json` |
| Q22 | `check_environment.gate_q22()` (needs `tmp/pdf/plan-clean.txt` or the committed copy); `weather3d.test.mjs`, `weather3d-gpu.test.mjs` | inside the 35.2 s script of Q11 (second pass); 2.3 s of CPU (63 s wall) | `gate_q22` with Q11 | none |
| Q23 | `check_coverage.py`; `tierName`, `tierMark`, `tierReading` of `ui/extensions.mjs` | 0.04 s; `ext-loader.test.mjs` 0.5 s | no | none |
| Q24 | `decodePng`, `diffStats` (uncommitted); `tools/accept/lib/imgdiff.mjs diffPngs` | not timed (pure functions); a browser run: hours | a browser run yes | none |
| Q25 | `terrain_check.py`; `pass5/library_counts.py` | 0.2 s; not timed (three small files) | no | none |
| Q26 | `casualties.test.mjs`; `medical-evidence.test.mjs`; `structures3d.test.mjs` hospital tests | `casualties.test.mjs` and `structures3d.test.mjs` inside the suite; 9.3 s | no | none |
| Q27 | none: a script would read `budget/phase_budget.json` | not applicable | no | not applicable |
| Q28 | none: the rows are in `epilogue_seed.jsonl`, `structures.json`, `conflict_register.json` | not applicable | no | not applicable |

