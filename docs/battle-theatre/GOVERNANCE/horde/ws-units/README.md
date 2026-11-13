# ws-units: working files of the undrawn-units research (workstream bt-units)

The plan, the 24 groups and the data contract: `docs/battle-theatre/history/undrawn/PLAN.md` (sections 4 and 5). A researcher of a group writes only:

| Path | What |
|---|---|
| `docs/battle-theatre/history/undrawn/<group>.jsonl` | the records (the only file the integrator reads for the group) |
| `ws-units/<group>/NOTES.md` | what was read and what was not (reports, volumes, pages), defects found in the texts or in the layer data, hosts found blocked, requests made; one dated line per milestone is also appended to `GOVERNANCE/progress.md` with a single shell append |
| `ws-units/proposed-register/<group>-<name>.md` | one proposed register entry per gap record (copy `proposed-register/TEMPLATE.md`); the owner decides whether it enters `register/` |
| `tmp/units-<group>/` | downloaded texts (untracked), declared by `source` records |

A change wanted in a file that is not yours (the roster, a ledger, the layer data) is a request note in `GOVERNANCE/horde/requests/bt-units-<short-name>.md`: what, why, the exact change.

Check before you stop: `python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py <group> --complete`.
