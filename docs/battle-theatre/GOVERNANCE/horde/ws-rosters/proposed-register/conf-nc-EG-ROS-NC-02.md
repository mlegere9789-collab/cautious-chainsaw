# EG-ROS-NC-02: North Carolina: lines whose name, dates or remarks the text layer damaged, and lines without a printed page

| Field | Content |
|---|---|
| ID | EG-ROS-NC-02 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; Law clauses 3, 4 and 7 |
| Category | damaged text layer, second reading of page images needed |
| Description | The text layers of the Internet Archive scans are one OCR reading of each page. 8,483 of 54,403 lines (15.6 percent) match at least one damage pattern of the flag files; the patterns are heuristics on the printed cell, not a count of errors: N name damaged (1,918), H head cut by a rule that is a reading (2,329), C company letter given by the sequence of headings (1,968), R rank damaged (168), Y date damaged (908), G marks of the scan (1,675), M line that may hold more than one entry (421), W remark word damaged (1,535). 710 lines carry no printed page because the page-number file of their Internet Archive item gives none for their leaf (1st North Carolina Infantry 381, 16th North Carolina Infantry 225, 37th North Carolina Infantry 104). Names and dates that are damaged stay as the text layer prints them (Law 4: no repair); the second scan and the earlier file read the same lines differently in places (EG-ROS-NC-03), and one name was read from a page image (the print says "Walker, Jesse M."; the layer of the primary scan reads the initial as two capital letters). |
| Why literal 100% is not possible or blocked | The record or the text layer does not give it; the route named under Agent recommendation is the only way to close it, and it was not run in this pass. |
| Evidence searched | flag files (ocr_uncertain, rows by code, page_image_readings); rosters/reports/conf-nc.md sections 2 and 5 |
| Autonomous substitute applied | The unit files stand with every line exactly as the text layer prints it and with the damage marked in the flag files; nothing is repaired, merged or invented; the difference or the missing part is listed, not resolved. |
| Strongest evidence-based reconstruction | The unit files, the flag files, the reconciliation and the report as they are. |
| Confidence tier | documented where the line is legible; the damaged parts are marked, not reconstructed |
| Competing values | the primary reading of each unit (the scan with the higher measured score); the second scan; the earlier roll file (where the entry concerns readings) |
| Product marking | the flag files mark the lines; the roster page shows the mark. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none for the data; owner-only acts: none (no account, licence or payment is needed for the route named below) |
| Agent recommendation | second reading of the page images of the flagged leaves with pipeline2/page_image.py (archive.org /cors/ text PDF, one page at a time); the roster-qa item samples it. |
| Status | open (proposed by bt-rosters / conf-nc; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
