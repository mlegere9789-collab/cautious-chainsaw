### 3.3.1 Calls that were tried at the sixth pass

Python, from the repository root, read-only or into a scratch folder, none above 30 s of CPU unless said (02:3x to 03:0x UTC on 16 November):

- `python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6/result_currency.py` prints, per stored record, how many of the files it hashed still have the recorded sha256 (0.1 s): Q01, Q14, Q20 and Q25 equal, Q02, Q19 and Q23 differ in 5 files.
- `python3 -W ignore tools/bt/gates/q25_library.py --out tmp/bt-gates/pass6/results --quiet` returns exit 1 (a FAIL verdict) and writes `Q25.json`, `Q25.prev.json` and `evidence/Q25/` under the scratch folder only (2.2 s wall); the other six stored runners behave the same (3.2.1).
- `python3 -I tools/bt/gates/q19_claims.py --help` fails with `ModuleNotFoundError: No module named 'q02_provenance'`; `python3 tools/bt/gates/q19_claims.py --help` prints the usage. `q23_marking.py` likewise; the other nine runners print their usage under `-I`.
- Reading a record: `json.load(open('docs/battle-theatre/GOVERNANCE/gate_results/Q01.json'))` has `verdict`, `counts`, `totals['by_check']`, `owed`, `incomplete_reasons`, `inputs` (path, sha256, `missing`), `items` (each with `id`, `check`, `result`, `pass`, `reason`, `evidence`); `pass6/result_digest.py` prints the counts per check and the commonest reasons of the items that do not pass.
- `import q01_oob` is not a supported entry point (each runner is a script with `run(...)` for its tests: `tests/governance/gates` calls `Q.run(env, layer=..., table=..., write=False)` with a synthetic layer dump, which is how a test gives a runner a defective input without the real product).
- `list_computer_folders` (the session's tool, read-only): one entry under `cannot_be_used`, the computer MSI with the folder Claude, reason `not_available` (`pass6/list_computer_folders.out`).
- `git diff --name-status 52261939 HEAD -- docs/battle-theatre/app/tests`, `git show --stat 5f2a4ef4` and `git log --since` give the delta that `inputs_delta.py` summarises.
