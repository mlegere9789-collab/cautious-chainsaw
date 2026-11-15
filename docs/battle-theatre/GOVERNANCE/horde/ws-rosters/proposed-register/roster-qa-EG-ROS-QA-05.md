# EG-ROS-QA-05: Printed lines of the units missing in the stored lines on pages of the Maine items

| Field | Content |
|---|---|
| ID | EG-ROS-QA-05 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |
| Category | evidence present, not stored |
| Description | On the pages looked at, printed lines of the units have no stored line: 13 lines in the verdicts and the addenda (3rd Maine C-company index lines, 7th Maine lines, one line of the 1st Cavalry, the 2nd Battery and others; and, found by the second sitting, Charles H Smith and Stephen Boothby of the 1st Maine Cavalry return on leaf 224, whose names stand in the pinned text of the leaf and in no stored row). The Maine item registers the index lines whose regiment cell could not be read (EG-ROS-ME-05) but not these, whose regiment cell was read and whose line was not stored. |
| Why literal 100% is not possible or blocked | The parsers did not store the lines; the sample can only count them on the pages it looked at. |
| Evidence searched | The missed_lines of every verdict and addendum under data2/qa/pages. |
| Autonomous substitute applied | None: no line is added to a unit file by this item. |
| Strongest evidence-based reconstruction | Round 2 of union-me: a parser that asserts one stored line per printed line on every table page, and the lines added from the page. |
| Confidence tier | documented (the printed lines are named in the verdicts) |
| Competing values | - |
| Product marking | The unit page of the Maine units states this id. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Add the missing lines in union-me round 2 and re-draw. |
| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
