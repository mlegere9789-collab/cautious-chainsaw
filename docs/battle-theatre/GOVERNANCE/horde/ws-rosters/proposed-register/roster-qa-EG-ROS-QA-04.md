# EG-ROS-QA-04: Second reading of the lines the first text layer lost or stored garbled: only part of the known losses tried

| Field | Content |
|---|---|
| ID | EG-ROS-QA-04 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |
| Category | evidence present, text layer lost |
| Description | Of the 106 Maine index lines whose name the first layer did not read, 7 were read again from the page and recovered; 99 are left (round 2 of union-me, EG-ROS-ME-05). Every line of `_other-ME-SUPP-1867` on the pages looked at had a garbled rank or regiment cell (not re-read). The 6 Vermont lines whose name the layer lost are recovered (6 of 6). The Pennsylvania muster years on 2,039 pages (Documented, the Pennsylvania README of the earlier families) and the Florida 6.1 percent of names lost cannot be tried before their items have unit files. The recovered lines are plain JSON under data2/qa/recovered/ with their own locator, never rows of a unit file. |
| Why literal 100% is not possible or blocked | Each second reading needs a page, tesseract at 300 dpi with the rules removed, and a look at the line; the batch for the remaining lines belongs to the item rounds. |
| Evidence searched | data2/qa/recovered/union-vt.json and union-me.json, data2/qa/pageread-ledger.json (the derived texts pinned by sha256), reports/roster-qa.md 4.3. |
| Autonomous substitute applied | None: a lost line stays out of the unit file (no empty-name row, no invented name). |
| Strongest evidence-based reconstruction | The recovered lines with their locators; the batch re-read of the rest in round 2 of union-me and of the Pennsylvania and Florida items. |
| Confidence tier | documented for the lines recovered; open for the rest |
| Competing values | - |
| Product marking | A recovered line names its derived text; a lost line is counted in the unit report. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Run the batch in the item rounds with the route of PRODUCTION-PLAN 9.5. |
| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
