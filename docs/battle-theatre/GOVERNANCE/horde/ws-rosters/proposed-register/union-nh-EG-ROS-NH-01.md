# EG-ROS-NH-01: Register of Commissioned Officers of the Ayling volume not carried as rows of the New Hampshire unit files

| Field | Content |
|---|---|
| ID | EG-ROS-NH-01 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); Law clauses 1, 3 and 7 |
| Category | evidence present, not yet read |
| Description | Ayling, Revised Register (1895), volume 2 (Internet Archive item cu31924096263136), prints near its end (the Index of Names follows it) a "Register of Commissioned Officers, New Hampshire Organizations" (printed pp. 1225-1248; leaves 644-667): per organization, the officers by rank heading (Colonels, Lieutenant Colonels, Majors, Adjutants, Quartermasters, Surgeons, Chaplains, Captains, First and Second Lieutenants) as run-on lines "Surname, Given, Co. X." with "Not mustered." after men who were commissioned and not mustered. For the four units of the work item (2nd Infantry leaves 644-646, 5th Infantry leaves 649-651, 12th Infantry leaves 658-659, 1st Light Battery leaf 665) the unit files carry the roll (the "Register") only. |
| Why literal 100% is not possible or blocked | Not blocked. The roll rows of the officers are in the unit files as far as the check below could match them; what the register of officers adds is the rank heading under which a name is printed and the "Not mustered" mark; the roll rows carry the same service in their remarks (app. Capt. ..., not must.) but not the heading. The run-on lines need a second parser (rank headings carried as `rk`, one segment of its own); it was not written in this run. |
| Evidence searched | Item cu31924096263136, text NH-AYLING-1895.2, leaves 644-667. A check of the register lines against the roll rows of each unit (pipeline2/nh_officers_check.py; GOVERNANCE/horde/ws-rosters/union-nh/officers-register-check.json): first pass, difflib surname ratio at least 0.8 and first given name by first letter or ratio at least 0.6: 2nd Infantry 202 lines, 21 matched no roll row; 5th Infantry 175 lines, 15; 12th Infantry 137 lines, 11; 1st Light Battery 11 lines, 0. Second pass for the unmatched lines (difflib ratio of the whole printed name at least 0.75): a candidate roll row for 18, 11, 8 and 0 of them (for example the register line "Farr, Evarts W." and the roll row "Parr, Evarts W."); 3, 4 and 3 lines have no candidate (OCR fragments such as "ON, Sylvands." and "AM, John AV." among them). A candidate is where to look, not a match: the register is not proven to name no man outside the roll. |
| Autonomous substitute applied | None. The roll rows are the unit files. |
| Strongest evidence-based reconstruction | A second segment per unit: one row per register line, rank heading as `rk`, company as `co`, "Not mustered." in the remarks; tier documented (printed). |
| Confidence tier | documented (the source exists); not yet read |
| Competing values | - |
| Product marking | The unit page of the roster states the gap with this id: the officers are listed in the roll rows; the rank headings of the register of officers are not yet shown. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None needed. |
| Agent recommendation | Write the second parser on the same text; add the segment after the roll segment; no label of presence. |
| Status | open (proposed by bt-rosters / union-nh; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
