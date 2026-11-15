# EG-ROS-QA-02: Gates of the independent sample not decided by round 1: lines still owed at the strata and gates shown OPEN

| Field | Content |
|---|---|
| ID | EG-ROS-QA-02 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |
| Category | verification incomplete |
| Description | Every stratum failed at least one gate, so its R-G9 result is decided (fail); the other gates of the same strata were not compared to the 299 to 628 lines that PLAN.md 4.4 asks for, because a level that a stratum has already failed decisively is not compared on further pages (qa_stats.py). They are shown OPEN in reports/roster-qa.md 2.2 (for example R-G1 of the Vermont officers pages: 1 error in 114 lines; the structure gate of New Hampshire: 0 in 110). No pass is claimed for any gate. |
| Why literal 100% is not possible or blocked | The rule that stopped the comparison of a decided level was chosen to spend the reading where it changes the result (DD-ROS-QA-03); a later round after the parsers are fixed draws fresh pages at every level. |
| Evidence searched | data2/qa/stats.json (decision per gate and stratum), the levels field of every verdict. |
| Autonomous substitute applied | None. |
| Strongest evidence-based reconstruction | Fresh pages after the parsers are fixed, at all levels, until each gate is decided (PASS or FAIL by the ladder). |
| Confidence tier | documented (counts) and not decided (gates shown OPEN) |
| Competing values | - |
| Product marking | No gate shown OPEN is described as passed. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Draw fresh pages after the item round 2 of each source family. |
| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
