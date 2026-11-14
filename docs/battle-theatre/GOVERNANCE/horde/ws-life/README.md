# ws-life: OA11 (soldier work and routine) evidence pass

Plan: `docs/battle-theatre/life/evidence/PLAN.md`. Machine files: `docs/battle-theatre/life/evidence/{contract,groups,sources,poses,report_assignments,acquired_period}.json`, `<group>.jsonl`; leads `docs/battle-theatre/life/leads/`; register `docs/battle-theatre/life/inventory/works.json`. Tools: `tools/bt/life/`.

Status at the first engineer's stop (2026-11-14): contract, validator (self-test 55 of 55; `--all` 0 errors on the 11 seed rows of six group files), 22 groups, source registry (190 texts, six period manuals fetched), record assignment (2830 Official Records records), works register (74), 79 missing poses, request note to the animation workstream: done.
Lead scan: the Official Records phase ran (`scan_leads.py --phases or`, about 11 s CPU, unlocked); an unlocked run of the state-volume phase was refused by the permission system and was not retried. The full scan (`tools/horde/bench.sh python3 -I tools/bt/life/scan_leads.py`, all phases) was queued behind the machine lock at 00:24 UTC and had not started when the engineer stopped. When `docs/battle-theatre/life/leads/SUMMARY.json` shows `"complete": true`, run `python3 -I tools/bt/life/build_inventory.py && python3 -I tools/bt/life/build_groups.py`.

Commands: `python3 -I tools/bt/life/validate_evidence.py --self-test`; `... <group>`; `... --all`.
