### 3.2.1 Runner entry points at the sixth pass, with the cost measured at this pass

CPU seconds are user plus system on a loaded machine (load average 22 to 31), so they are upper bounds; "lock" says whether the job needs more than about 30 s of CPU or a browser and so belongs under `tools/horde/bench.sh`. Every runner writes only into `--out` (`Qnn.json`, `Qnn.prev.json`, `evidence/Qnn/`); the runs below used a scratch folder under `tmp/bt-gates/pass6/` and wrote nothing into `GOVERNANCE/gate_results`. An exit code of 1 is a FAIL verdict, not an error (0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error).

| Gate | Command | Cost at pass 6 | Lock |
|---|---|---|---|
| Q01 | `python3 tools/bt/gates/q01_oob.py [--out DIR]` (sample of 7 scenarios) | 7.9 s of CPU, 36 s of wall time | no |
| Q02 | `python3 tools/bt/gates/q02_provenance.py [--out DIR]` | 13 s of CPU, 68 s of wall time | no (its docstring says heavy: 13 s of CPU measured) |
| Q03 | `python3 tools/bt/gates/q03_anachronism.py [--out DIR]` | not run when this was written | yes (docstring: about 300 s of CPU) |
| Q04 | `python3 tools/bt/gates/q04_arrival.py --scenarios default --grid dense [--out DIR]` (the probe; S* is the full run) | not run when this was written | yes |
| Q05 | `python3 tools/bt/gates/q05_speed.py --scenarios default --grid dense [--out DIR]` | not run when this was written | yes |
| Q06 | `python3 tools/bt/gates/q06_path.py --scenarios default [--out DIR]` | not run when this was written | yes |
| Q14 | `python3 tools/bt/gates/q14_ordnance.py [--out DIR]` | 7.3 s of CPU, 37 s of wall time | no |
| Q19 | `python3 tools/bt/gates/q19_claims.py [--out DIR]` (as a script, not under `-I`) | 4.3 s of CPU, 24 s of wall time | no |
| Q20 | `python3 tools/bt/gates/q20_cavalry.py [--out DIR]` | 11 s of CPU, 60 s of wall time | no |
| Q23 | `python3 tools/bt/gates/q23_marking.py [--out DIR]` (as a script, not under `-I`) | 3.2 s of CPU, 15 s of wall time | no |
| Q25 | `python3 tools/bt/gates/q25_library.py [--out DIR]` | 0.2 s of CPU, 2.2 s of wall time | no |

The unit tests of the runners (`python3 -m unittest discover -s tests/governance/gates -p test_qNN.py`; `pytest` is not installed):

| File | Tests | Cost at pass 6 | Lock |
|---|---|---|---|
| `test_extracts.py` | 15, all pass | 0.1 s of CPU, 0.2 s of wall time | no |
| `test_q25.py` | 38, all pass | 2.7 s of CPU, 6.9 s of wall time | no |
| `test_q19.py` | 26, all pass | 1.6 s of CPU, 6.6 s of wall time | no |
| `test_q02.py` | 35, all pass | 2.5 s of CPU, 11 s of wall time | no |
| `test_q23.py` | 36, all pass | 2.3 s of CPU, 8.7 s of wall time | no |
| `test_q23_app.py` | 12, all pass | 1.0 s of CPU, 3.4 s of wall time | no |
| `test_q03_scene.py` | 6, all pass | 17 s of CPU, 60 s of wall time | no |
| `test_q01.py` | 54, all pass | 12 s of CPU, 28 s of wall time | no |
| `test_q14.py` | 47, all pass | 10 s of CPU, 43 s of wall time | no |
| `test_q20.py` | 41, all pass | 14 s of CPU, 67 s of wall time | no |
| `test_q05.py` | 42, all pass | 14 s of CPU, 81 s of wall time | no |
| `test_q06.py` | 49, all pass | 17 s of CPU, 94 s of wall time | no |
| `test_q04.py` | 67, all pass | 39 s of CPU, 187 s of wall time | yes (over 30 s of CPU) |
| `test_q03.py` | 117, all pass | 128 s of CPU, 490 s of wall time (run alone, niced, at 02:41 UTC) | yes (over 30 s of CPU: started directly to measure it, a deviation recorded in 7.8) |
