# Structures, works, hospitals and state schedule: notes

Status of every record: `seeded_unverified`. The data is transcribed from the plan (PDF B.7 pp. 90-94, B.8 pp. 94-103, B.12.3 pp. 117-118) and no primary source has been opened to confirm it. Generator: `tools/bt/build_structures.py` (data in `tools/bt/structures_data_*.py`). Validator: `tools/bt/check_structures.py` (run: `python tools/bt/check_structures.py`).

## Counts
| File | Contents |
|---|---|
| structures.json | 130 records: 41 buildings (`bld`), 18 gun emplacements (E-01..E-18), 18 works/ground-state records (G-01..G-18), 16 fences (`FEN`), 14 preexisting walls and fences (P-01..P-14), 9 epilogue states (`WS`, S-080..S-088), 8 roads (`RD`), 4 environment (`ENV`), 1 group, 1 person state |
| state_schedule.json | 88 rows (S-001..S-088), all parsed, 4 engine rules, 11 logged PDF default cases |
| hospitals.json | 23 hospitals, 8 recorded conflicts, Letterman roles, casualty behaviours, night operations (B.8.5.3), horses |
| works_stages.json | 18 works with the stage model, the stage-share procedure, gun-emplacement engine rules and the modern-profile rule |

Tier counts (structures.json): 64 documented, 39 inferred, 4 open gap, 23 with no printed tier. 39 records are `weak_source` (only Wikipedia, forum, blog or Stone Sentinels keys). The tier rule is mechanical: a record is `documented` only if the PDF prints that tier AND at least one cited key is outside the weak set. No source was opened to confirm that a key supports the exact claim, so `claim_support_verified` is false everywhere.

## Gate results (last run)
Integrity 649 checks, Q08 (no pre-placed works, stage order) 186, Q07 (fence and wall state changes) 191, Q09 (building states) 1306, scrub consistency 1441 (147 object/scenario pairs x 319 times, forward vs reversed vs shuffled vs interleaved). 0 failures. Result: ALL PASS.

## Scenarios and PDF defaults (all PENDING OWNER)
`state_at(structure_id, time_iso, scenario='default')` is pure. Scenario `default` is the row as the engine reads it in B.8.7, not a choice between sources. Named scenarios expose each PDF alternative (Sherfy barn burn window, Camp Letterman opening Jul 20 vs Jul 22, and the others). The validator prints eleven printed defaults, PD-01..PD-11. No default has been chosen; the owner decides (Law clause 6).

## Contradictions inside the PDF
- **Sherfy barn fire (PD-01):** C-026 says Jul 2 evening; B.8.7 S-037 and B.2.3 say Jul 3 afternoon is the most plausible. Contradiction.
- **Camp Letterman opening (PD-02):** C-044 says Jul 20; the B.2.3 conflict table says Open Jul 22 with Jul 20 flagged; S-077 prints neither alone. Contradiction.
- **Spangler wounded count (PD-09):** C-038 default 1,500; B.8.5.2 treats about 1,900 as the lead figure. Contradiction.
- **Cannonade end, Culp's Hill final charge, Johnson's attack, East Cemetery Hill assault, infantry step-off (PD-04..PD-08):** the C-nnn defaults and the B.8.7 or B.7.2 windows differ in value or width (for example C-030 step-off 15:00 vs S-062 15:30-16:15). They are logged, not reconciled.

## Ambiguities and unparsed cells (listed, none dropped)
- **E-15 (Little Round Top summit, Hazlett's battery)** is the only record with `parse_status: ambiguous`. The extracted text has two cells ("documented", "n/a") between the Method and Tier columns that do not fit the 9-column layout. "n/a" is kept in `dimensions_printed_candidate` with dimensions left null, and the stray "documented" is kept in `raw_unparsed`. The tier is read as printed ("documented (hand-hauling, times); inferred (no prepared emplacement)", `tier_mixed: true`).
- **23 records have no tier.** B.8.4 prints no tier column for roads. B.8.6 and B.12.3 rows are state descriptions. Roads are to be rendered from the 1863 vector layer with a generic surface tagged plausible-procedural until a source is found (B.8.4 footer). Their tier fields are null on purpose, not defaulted.
- **Times** are naive local mean time as printed. Union and Confederate clocks differed by about 20 minutes and no correction is applied.
- Rows whose bound is a date only have granularity `date`. `state_at` reports the position inside the day as indeterminate.

## Not done here
- No source verification of any record (Phase 1).
- Dimensions are never invented; where the PDF prints none the field is null and an open gap is carried.
- Hospital counts and casualty behaviours are transcribed ranges, not reconciled.
