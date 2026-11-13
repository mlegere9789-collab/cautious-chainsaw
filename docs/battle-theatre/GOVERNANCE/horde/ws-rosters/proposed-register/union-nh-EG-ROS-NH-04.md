# EG-ROS-NH-04: Row counts of the New Hampshire unit files against the printed Summary totals: residuals not explained

| Field | Content |
|---|---|
| ID | EG-ROS-NH-04 |
| Requirement IDs | OA03; R22; Law clauses 3, 4 and 7 |
| Category | evidence present, reconciliation not exact |
| Description | Each regiment of the Ayling Register ends with a Summary that prints a total strength: the men who served in it. Reading the OCR of the four Summary pages (offsets in GOVERNANCE/horde/ws-rosters/union-nh/summary-figures.json): 2nd Infantry 2,555 (1,022 original members + 1,144 recruits + 22 band + 1 band gained by transfer + 366 recruits gained by transfer); 5th Infantry 2,562 (978 original members + 24 band + 1,507 recruits + 53 recruits gained by transfer from 2 U. S. S. S.); 12th Infantry 1,403 (959 original members and 444 recruits; the OCR figure of the original members is damaged, so 959 is arithmetic); 1st Light Battery 258 (156 + 101 + 1). Rows of the unit files with the spelling and alias cross-reference lines (remarks "See" and a name: "Bachelder. See Batchelder.", "Co. A. See Charles Allen.") taken out: 2nd 2,537 (printed 2,555, difference -18); 5th 2,520 (2,562, -42); 12th 1,443 (1,403, +40); battery 258 (258, 0). Lines whose target is another organization ("See 10 N. H. V.", "See 2 U. S. S. S."; 364, 53, 1 and 1 lines) are kept in the count, because the Summary counts the men gained by transfer. The classification rule and the figures are reproduced by pipeline2/nh_summary_check.py (GOVERNANCE/horde/ws-rosters/union-nh/summary-reconciliation.json). |
| Why literal 100% is not possible or blocked | The Summary counts men; the register has lines. A man with two enlistments, a man listed under two names, a leaf the OCR lost, an entry destroyed in the text layer (EG-ROS-NH-02) and the way the Summary treats unassigned men may each move the count; the page images that could say which are not reachable (EG-ROS-NH-02). |
| Evidence searched | Rows classified by the words after "See" in the first 10 tokens of their remarks (cross-reference to another organization, alias, spelling, own record); printed lines per page (inner pages: 35-46, 32-41, 32-39 and 39-42 lines; no page is short); the number of rows with two "age" items (3: two in the 5th, one in the 12th) and the number of rows holding a head-shaped run followed by entry data (3, one of them an address); the earlier roll files (2,379, 2,351, 1,336 and 173 rows). |
| Autonomous substitute applied | None. |
| Strongest evidence-based reconstruction | The rows as written; the residuals are published in the report. |
| Confidence tier | documented (the printed totals); the residuals are open |
| Competing values | printed total strength against rows: see Description |
| Product marking | The unit page shows rows and the printed total strength side by side with this id. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None needed. |
| Agent recommendation | Settle the 12th Infantry difference (+40) first, from the page image of the Summary and of the register leaves; then the 5th (-43). |
| Status | open (proposed by bt-rosters / union-nh; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
