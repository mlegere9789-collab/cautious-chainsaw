# EG-ROS-QA-07: Gates of round 2 not decided, claims and route test, further pages owed

| Field | Content |
|---|---|
| ID | EG-ROS-QA-07 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |
| Category | verification incomplete |
| Description | Round 2 stopped the comparison of a level in a stratum once the gate had failed (DD-ROS-QA-03 of round 1); gate cells shown OPEN (no pass claimed): NC-MOO-G-other R-G3a 3 in 444 lines. 1,417 claims of the conf-nc report and pointer file recomputed from the files, 1,003 hold, 414 do not (reports/roster-qa.md 8.6); the second-reading route test on 20 pages per Moore scan family is OWED (queued through the machine lock); the verdicts of the 19 pages describe the stored lines as they are now (15 identical, 4 with the same lines under new row numbers). |
| Why literal 100% is not possible or blocked | The rule that stopped the comparison of a decided level was chosen to spend the reading where it changes the result; a later round after the fixes draws fresh pages at every level. |
| Evidence searched | data2/qa/round2/stats.json (decision per gate and stratum), the levels field of every verdict, claims-check.json, second-reading.json, verdicts-vs-files.json. |
| Autonomous substitute applied | None. |
| Strongest evidence-based reconstruction | Fresh pages at all levels after the conf-nc fixes until each gate is decided; the route test through the machine lock; the claims check again after any rebuild or regenerated report of conf-nc. |
| Confidence tier | documented (counts) and not decided (gates shown OPEN) |
| Competing values | - |
| Product marking | No gate shown OPEN is described as passed. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Draw fresh pages after the conf-nc fixes and after each later item closes. |
| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
