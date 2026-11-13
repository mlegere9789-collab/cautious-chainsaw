# Request from bt-gates: the sub-requirement populations of PDF Section F that requirements.json does not have

Written 2026-11-13 by workstream bt-gates. Basis: `GOVERNANCE/gate_results/GATE-SPEC-A.md` section 2.3 and ambiguity A-11. File asked to change: `GOVERNANCE/requirements.json` (added rows only; the owner of `tools/bt/seed_register.py`, which generated it) and `GOVERNANCE/conflict_register.json` with `conflicts_structured.json` (the workstream that owns the evidence shards). bt-gates changes nothing here: its scripts may write only `register_ids`, `owner_decision_ids`, `source_status` and `passes`.

## Why

PDF p. 134, Section F: "you may add sub-requirements ... Expected sub-requirement populations (generate them from the data, do not hand-type): one per regiment, battery and troop for kit (R10, R17); one per timeline row (R11); one per structure and per state change (R13, R14); one per terrain source (R12); one per vegetation polygon class (R20); one per library source batch (R21)." Gate Q18 (p. 136) needs "all requirement IDs have sub-requirements". Today `requirements.json` has R11 (691 rows), R12 (45), R14 state changes (88) and works (18), R13 gun emplacements (18) and pre-existing features (14), R03 conflicts (47), R22 rows (14), and one `.0000` row for every other requirement. Missing: kit units (R10, R17), the other structures (R13), vegetation classes (R20), library batches (R21). Q18 reports FAIL "population missing" until they exist.

## The exact change (rows to add; text never edited afterwards)

Generate from data, ids stable, `origin: pdf`, `source_status: seeded_unverified`, `passes: false`, `register_ids: []` (bt-gates links them), `owner_decision_ids: []`.

| Population | Id pattern | Text template | `gate_ids` | Count source |
|---|---|---|---|---|
| kit, one per unit of the verified OOB (regiment, battery, troop, staff, medical, signal, provost, ambulance, ordnance) | `R10.U-<unit id>` | `Kit manifest of <unit name> is complete for every soldier type present and every line cites a claim id or a gap id.` | `["Q03","Q01"]` | `history/units.json` 726 units today; the verified OOB when it exists |
| same units, march and activity | `R17.U-<unit id>` | `<unit name> arrives by march, follows a continuous path to its fighting position and shows its documented activity at each time.` | `["Q03","Q04","Q05","Q06"]` | same |
| one per structure not already covered | `R13.<structure id>` (ids as in `structures/structures.json`, for example `R13.bld-bliss-farm`) | `Structure <id> exists on its date, carries a state schedule and is drawn.` | by object prefix, GATE-SPEC-A 2.4 (`bld-` Q03 Q09; `FEN-` Q03 Q07; `RD-` Q03; `ENV-`, `GROUP-`, `PERSON-`, `WS-` as the table says) | 80 records of `structures.json` not in R13.P, R13.G or R14.E, plus 23 hospital sites of `structures/hospitals.json` as `R13.H-<n>` with `["Q03","Q09","Q26"]` |
| one per vegetation polygon class | `R20.V-<class>` | `Vegetation polygon class <class> has a documented-or-ranged state for every date and the scene matches it.` | `["Q21"]` | the classes of the vegetation schedule (workstream bt-world-content) |
| one per library source batch | `R21.L-<batch id>` | `Library source batch <batch> is ingested, blocked with a register entry, or scheduled with a reason.` | `["Q19","Q25"]` | batches in `GOVERNANCE/library/status*.json` and Appendix C.1 |

## Conflicts the plan prints outside B.2.5 (GATE-SPEC-A ambiguity A-31)

Q28 requires the version of the Gettysburg Address to be "a selectable alternative in the conflict register". `conflict_register.json` has C-001..C-047 only. Needed records (each with every value, source keys, tier, and a delegated default): the Address versions (as delivered and taken down by Hale; as printed by the reporters on the day, the plan's default; the Associated Press and Philadelphia Press texts; each manuscript copy; p. 118 B.12.4); B.12.2 E-004 start (09:30 or about 11:00), E-005 arrival, E-006 start, E-007 weather, E-010 order, E-011 reaction, E-013 salute; S-081 reburial start (Oct 17 or Oct 27), S-083 platform position; S-001 date (June 26 or 27); the conflicting values of B.6.14.1 (crew 8 or 9, Napoleon shot 1,619 to 1,680 yd, canister 350 or 400 yd, Parrott 1,850 to 1,900 yd, guns on the field 366 to 372 and 281 to 282); the E.5 list (p. 134). bt-gates will change `tools/bt/check_governance.py` (which fixes 47 conflicts and 691 rows) to count from the files at the same time; tell bt-gates which ids you add.
