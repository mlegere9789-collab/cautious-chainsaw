# ws-life: OA11 (soldier work and routine) evidence pass

Plan: `docs/battle-theatre/life/evidence/PLAN.md`. Machine files: `docs/battle-theatre/life/evidence/{contract,groups,sources,poses,report_assignments,acquired_period}.json`, `<group>.jsonl`; leads `docs/battle-theatre/life/leads/`; register `docs/battle-theatre/life/inventory/works.json`. Tools: `tools/bt/life/`.

Status at the first engineer's stop (2026-11-14): contract, validator (self-test 52 of 52), 22 groups, source registry, record assignment, works register, poses and 11 seed rows done; the lead scan was queued behind the machine lock (`tools/horde/bench.sh python3 -I tools/bt/life/scan_leads.py`); when `docs/battle-theatre/life/leads/SUMMARY.json` exists, run `python3 -I tools/bt/life/build_inventory.py && python3 -I tools/bt/life/build_groups.py` to put the lead counts and the reading order into `groups.json` and `PLAN.md`.

Commands: `python3 -I tools/bt/life/validate_evidence.py --self-test`; `... <group>`; `... --all`.
