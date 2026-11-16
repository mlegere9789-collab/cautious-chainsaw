### 3.0 The gate runners at the sixth pass

One row per gate. "Runner" is the file under `tools/bt/gates/` (its node child in brackets); "Unit tests" the python tests of `tests/governance/gates/` as run at this pass; "Stored record" the verdict and item counts of `GOVERNANCE/gate_results/Qnn.json` (the record is FAIL for every gate that has one; its failing items name an input that does not exist or a datum that lacks a field); "Where it runs" uses the marks of section 0; the last column is what the record's `owed` list, its failing items and the sections of 4 say, not a pass rule. A gate with no runner names the group of the workflow `bt-gate-engine.mjs` that builds it.

| Gate | Runner | Unit tests | Stored record | Where it runs | Blocked on or owed |
|---|---|---|---|---|---|
| Q01 | `q01_oob.py` (node child `q01_layer.mjs`) | 54 tests: all pass | FAIL; 3,804 items (FAIL 133, BLOCKED-INPUT 3,510, N/A 161) | HERE-PY + HERE-NODE (no browser) | no `kit/verified_oob.json`; 133 presence items FAIL (108 undrawn units, 25 formations); the dense scan is owed |
| Q02 | `q02_provenance.py` (node children `q02_layer.mjs` and `q23_app.mjs`) | 35 + 15 tests: all pass | FAIL; 301 items (PASS 49, FAIL 176, N/A 76) | HERE-PY + HERE-NODE | tiers, extracts, premise claims, procedural blocks and Source Manifest fields missing in many classes; "the claim equals what the span supports" owed (U-11) |
| Q03 | `q03_anachronism.py` (node child `q03_scene.mjs`) | 117 + 6 tests pass (`test_q03.py` run alone, niced: 490 s wall, 128 s of CPU; `test_q03_scene.py` 6 of 6 pass) | none stored | HERE-PY + HERE-NODE; the turntable frames HERE-SWGL (owed) | K.9 dates on kit items, the 34-star flag after 4 July, no ground audit; no stored result |
| Q04 | `q04_arrival.py` (node child `q04_arrival.mjs`) | 67 tests: all pass | none stored; the dense run never started | HERE-NODE + python; a picture check HERE-SWGL | the dense run over S* never started; 108 units have nothing to scan |
| Q05 | `q05_speed.py` (node child `q05_speed.mjs`) | 42 tests: all pass | none stored; the dense run never started | HERE-NODE + python | no documented range for limbers, caissons, wagons and gun pieces on the road; the dense run never started |
| Q06 | `q06_path.py` (node child `q06_path.mjs`) | 49 tests: all pass | none stored; the dense run never started | HERE-NODE + python | 108 units with no path; the 90 s deployment has no register entry |
| Q07 | none (group Q07, Q08, Q09, Q21, Q22, Q26) | none | none | HERE-PY + HERE-NODE; picture HERE-SWGL | a runner (class SS of GATE-SPEC 3.2); applicability by object kind; pictures |
| Q08 | none (group Q07, Q08, Q09, Q21, Q22, Q26) | none | none | HERE-PY + HERE-NODE; picture HERE-SWGL | a runner; gun emplacements as works and undrawn works; work meshes never seen in a browser |
| Q09 | none (group Q07, Q08, Q09, Q21, Q22, Q26) | none | none | HERE-PY + HERE-NODE; picture HERE-SWGL | a runner; no building-state data file; records without geometry |
| Q10 | none (group Q10, Q12, Q24) | none | none | HERE-SWGL for frames (state part HERE-NODE); the real-GPU part NOT RUNNABLE HERE | a runner; the five numbers of `sky.spec.mjs` are applied to no picture; the real GPU |
| Q11 | none (group Q11, Q13) | none | none | HERE-PY with the scratch astropy environment; HERE-NODE | a runner; astropy only in a scratch environment; no independent ephemeris for 7 to 14 July |
| Q12 | none (group Q10, Q12, Q24) | none | none | HERE-NODE; scrubber and pixel identity HERE-SWGL | a runner; the effects layer routes a shot by the camera at spawn; browser results for the scrubber and the casualties spec |
| Q13 | none (group Q11, Q13) | none | none | HERE-NODE (optional HERE-SWGL) | a runner; the scene-level temperature and wind-term check |
| Q14 | `q14_ordnance.py` (node child `q14_layer.mjs`) | 47 tests: all pass | FAIL; 206 items (PASS 43, FAIL 61, NOT-RUN 1, BLOCKED-INPUT 101) | HERE-PY + HERE-NODE | no `kit/verified_batteries.json`; 0 Confederate guns drawn; fire plans beyond the documented stock |
| Q15 | none (group Q15, Q16, Q27) | none | none | GPU: NOT RUNNABLE HERE | a real GPU: a session that runs on the owner's PC, results reported as measured on it |
| Q16 | none (group Q15, Q16, Q27) | none | none | HERE-SWGL (renders) + HERE-PY | no documented camera position (a coordinate, a lens and a plate) |
| Q17 | none (group Q17, Q18, Q28) | none | none | HERE-PY + HERE-NODE | a runner that runs `check.mjs --out` itself; 4 of 691 rows realized |
| Q18 | none (group Q17, Q18, Q28) | none | none | HERE-PY + HERE-NODE | a runner that reads the other records; 461 unlinked rows; the populations of Section F |
| Q19 | `q19_claims.py` (the scan of Q02 and its node children) | 26 tests: all pass | FAIL; 203 items (PASS 29, FAIL 121, BLOCKED-INPUT 1, N/A 52) | HERE-PY | no recorded independence in the Source Manifest, no Section P ledger |
| Q20 | `q20_cavalry.py` (node child `q20_layer.mjs`) | 41 tests: all pass | FAIL; 319 items (PASS 20, FAIL 212, BLOCKED-INPUT 79, N/A 8) | HERE-PY + HERE-NODE | 33 documented units not drawn; no action table; no verified OOB |
| Q21 | none (group Q07, Q08, Q09, Q21, Q22, Q26) | none | none | HERE-NODE (check function); pictures HERE-SWGL | a runner around the hooks; 531 of 927 units plausible-procedural; no photograph compared |
| Q22 | none (group Q07, Q08, Q09, Q21, Q22, Q26) | none | none | HERE-PY + HERE-NODE; pictures HERE-SWGL | a runner; no scene-against-timeline scan; `tmp/pdf/plan-clean.txt` absent |
| Q23 | `q23_marking.py` (node child `q23_app.mjs`) | 36 + 12 tests: all pass | FAIL; 102 items (PASS 50, FAIL 43, NOT-RUN 2, BLOCKED-INPUT 1, N/A 6) | HERE-PY + HERE-NODE; frames HERE-SWGL (owed) | marks missing for audio, clips, gun counts, individual soldiers and open gaps; frames owed |
| Q24 | none (group Q10, Q12, Q24) | none | none | HERE-SWGL (software baseline); real-GPU baseline owed | a baseline set, a compare runner and a tolerance for the viewer |
| Q25 | `q25_library.py` (python only) | 38 tests: all pass | FAIL; 253 items (PASS 15, FAIL 237, BLOCKED-INPUT 1) | HERE-PY | 75 untracked acquisition entries, 78 list rows without a status row, no terms record, no work queue |
| Q26 | none (group Q07, Q08, Q09, Q21, Q22, Q26) | none | none | HERE-NODE | no casualty-flow data, no hospital-scenes module |
| Q27 | none (group Q15, Q16, Q27) | none | none | HERE-PY (a report) | a report only: no per-phase spend file, no per-milestone verification record |
| Q28 | none (group Q17, Q18, Q28) | none | none | HERE-PY + HERE-NODE; labels HERE-SWGL | the Address conflict, a film path, Lincoln items |
