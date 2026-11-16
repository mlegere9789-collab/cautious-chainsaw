# EG-ROS-NC-05: North Carolina: Clark, Histories of the Several Regiments and Battalions (1901): statements of strength and losses read as notes, a floor and not a count of what Clark prints

| Field | Content |
|---|---|
| ID | EG-ROS-NC-05 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; Law clauses 3, 4 and 7 |
| Category | source read in part (notes), not complete |
| Description | The work item names Clark (1901, five volumes) and asks (first task 2) for its present-for-duty figures as notes in the ledger, not as rows. The five texts were fetched from archive.org (each volume twice: the Cornell, Harvard or New York Public Library copy and the Emory copy; sha256 in the ledger and the manifest) and the chapters of the 41 units, the Gettysburg chapters of volume 5 and the brigade histories of volume 4 were scanned sentence by sentence for a figure that names men, guns or losses near a mention of Gettysburg; every hit was read in context and kept only where the sentence states a strength, a number present, a number taken into action, a number left or a loss of that unit (or the brigade, battalion or company named). 89 notes result (casualties 37, identification 4, present_for_duty 14, remaining_after 9, strength_other 4, taken_into_action 21). Each note is a statement of the author of the chapter or of the person he quotes; none is a muster, and none is a roster row. Where the two text layers read a figure differently or one could not be matched, the page was rendered from the Emory copy (300 ppi, transient) and read again with tesseract and by eye: 36 notes carry such a check (23 looked at). The list is a floor: the scan cannot see a figure that is not in its pattern, and the units without a note (2nd North Carolina Infantry, 4th North Carolina Infantry, 6th North Carolina Infantry, 14th North Carolina Infantry, 21st North Carolina Infantry, 30th North Carolina Infantry, 57th North Carolina Infantry, 4th North Carolina Cavalry, 5th North Carolina Cavalry) may have a statement that it missed; the report says so unit by unit. |
| Why literal 100% is not possible or blocked | The record or the text layer does not give it; the route named under Agent recommendation is the only way to close it, and it was not run in this pass. |
| Evidence searched | rosters/data2/sources/NC-CLARK-1901.json (notes, notes_units), GOVERNANCE/horde/ws-rosters/conf-nc/clark-notes-check.json, pipeline2/conf_nc/nc_clark_spec.py and nc_clark.py; rosters/reports/conf-nc.md section 1.3 |
| Autonomous substitute applied | The unit files stand with every line exactly as the text layer prints it and with the damage marked in the flag files; nothing is repaired, merged or invented; the difference or the missing part is listed, not resolved. |
| Strongest evidence-based reconstruction | The unit files, the flag files, the reconciliation and the report as they are. |
| Confidence tier | documented (the quotation stands at the recorded offset and says what the claim says; the figure is the author's statement, not a muster) |
| Competing values | the primary reading of each unit (the scan with the higher measured score); the second scan; the earlier roll file (where the entry concerns readings) |
| Product marking | a strength shown from a note carries its author, chapter and page; a range from several notes shows all of them. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none for the data; owner-only acts: none (no account, licence or payment is needed for the route named below) |
| Agent recommendation | a reading by eye of the chapters of the units without a note, and of the passages of the other chapters of Clark that name a unit of this item; the strength workstream may use the notes as statements with their basis. |
| Status | open (proposed by bt-rosters / conf-nc; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
