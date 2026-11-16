# EG-ROS-QA-06: R-G9 not passed for conf-nc: every stratum of the Moore roll fails at least one gate

| Field | Content |
|---|---|
| ID | EG-ROS-QA-06 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |
| Category | verification failed |
| Description | Round 2 of the independent sample (reports/roster-qa.md section 8): 22 pages, 826 stored lines of the 41 conf-nc files compared with the page images in 4 strata (two scans of the Moore roll x officers pages and other pages); 4 of 4 strata fail at least one gate by the ladder (4 or more errors at the gate); 15 of the 16 gate cells fail; kinds seen (rows): name-char 78, rem-date 71, rem-char 37, rank 37, name-cut 25, rem-extra 17, merge 10, rem-missing 2. The text layer runs the entries together (10 printed entries stored inside the remarks of another line, 3 with no stored line), damages the carried headings that every line under them inherits as its rank, and misreads characters (the first-scan text of volume 1 worst). 95 of the 217 lines in error are marked ocr_uncertain by the flag files. None of the 41 files may be published as checked. |
| Why literal 100% is not possible or blocked | The stored lines are the text layer of the pinned scans, as the format requires (a line is found at its offset; a name is never respelled); the page image shows what the print says; the difference is the second reading of the page images (EG-ROS-NC-02), which no parser rule can replace. |
| Evidence searched | data2/qa/round2 (frame, draw, one verdict per page with the stored and printed text of every difference, stats.json, verdicts-vs-files.json); rosters/reports/roster-qa.md 8.2 to 8.5. |
| Autonomous substitute applied | None. |
| Strongest evidence-based reconstruction | The second reading of the page images of conf-nc (route tested in 8.7), the fix of the cut of the entries and of the carried headings, then fresh pages (new seed) of every stratum until each gate is decided. |
| Confidence tier | documented (counts; the stored and the printed text of every error are in the verdict files) |
| Competing values | - |
| Product marking | The roster section must not describe the Moore lines as checked; lines flagged ocr_uncertain are marked, and the unflagged lines may still be wrong (the share is in 8.4). |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Do not publish conf-nc as checked; send the defect list (G-QA07) to the parser of conf-nc; draw fresh pages after the fixes. |
| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
