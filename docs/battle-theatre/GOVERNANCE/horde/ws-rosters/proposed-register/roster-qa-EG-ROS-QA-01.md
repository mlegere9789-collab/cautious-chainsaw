# EG-ROS-QA-01: The independent sample (R-G9) is not passed: every stratum of the four closed roster items fails

| Field | Content |
|---|---|
| ID | EG-ROS-QA-01 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |
| Category | evidence present, gate failed |
| Description | 35 pages of the four closed items (Maine, New Hampshire, Vermont, Massachusetts; 54 files, 94,404 lines) were looked at in two sittings against the page images and 1,158 stored lines were compared with the print, in 11 strata. 11 of 11 strata have at least one gate with 4 or more errors (more than the ladder of PLAN.md 4.4 allows at 773 lines), 9 of them also on the pages outside the lowest OCR-confidence decile; no gate of any stratum passes. The checks V1 to V3 (name and remark tokens at their offsets, printed page) are met by every line and cannot see these errors: digits read as letters or as other digits, letters changed in names and remarks, the ditto mark stored as the digits 66, run-over lines on the wrong row, several printed rows stored as one, rank words in the name field. The counts per stratum and gate with their one-sided 95 percent Clopper-Pearson bounds are in reports/roster-qa.md 2.2 and 2.6. |
| Why literal 100% is not possible or blocked | The text layer is one OCR reading of the scan; the gate measures it against the print and the stored lines differ from the print in characters on a large share of the lines (the share per family is in reports/roster-qa.md 2.3). No stored line was changed by the sample. |
| Evidence searched | data2/qa/pages/*.verdict.json and *.addendum.json (every difference with the stored and the printed text), data2/qa/stats.json, data2/qa/verdicts-vs-files.json (the verdicts describe the files as they are now), the second-reading detector (data2/qa/second-reading-detector.json). |
| Autonomous substitute applied | None: the items stay in the tree (DEC-019); no line is described as checked beyond V1 to V3. |
| Strongest evidence-based reconstruction | The parsers of the four items corrected under the requirements of PRODUCTION-PLAN 9.8 and reports/roster-qa.md 2.4, then a fresh draw of every stratum with a new seed; a second reading of the pages (tesseract with the table rules removed) as a work list. |
| Confidence tier | documented (the counts are measured on the page images) |
| Competing values | - |
| Product marking | The unit page and the roster page show, on every unit of the four items, that the independent sample failed (this id) and the share of lines that differ from the print; no unit is shown as checked. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Return the defect lists to the parsers (rounds 2 of union-me, union-nh, union-vt; a round 2 for union-ma) and re-draw; the request note bt-rosters-qa-defects-unowned.md asks the orchestrator where this work is placed. |
| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
