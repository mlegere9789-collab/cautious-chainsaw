# EG-MED-PLAN-05: OCR digits in the medical texts: a digit is read twice before a scene or card uses it

| Field | Content |
|---|---|
| ID | EG-MED-PLAN-05 |
| Requirement IDs | OA12 (accurate field hospitals, battle trauma and period-accurate treatment); PDF B.8.5; gate Q26; Law clauses 3, 4 and 7 |
| Category | evidence present, reading uncertain |
| Description | The medical texts are OCR text of old print. The validator refuses a changed digit or number word between quote and text, but if the OCR itself misread a digit the quote copies the error. The seed run found one such case (Cuyler's report reads "the 35th instant"). |
| Why literal 100% is not possible or blocked | The record does not state it, or the text is not available to this project (Law cl.3); nothing is invented to fill it. |
| Evidence searched | Second scans exist for the Surgeon General's volumes and for Tripler's book (see SOURCES.md); the OR27 text has the project's own page model; page images were not opened by this step. |
| Autonomous substitute applied | Rows keep the OCR reading and an open gap row names a digit that cannot be read; a documented number that a card shows is confirmed in a second scan or a page image first (ocr.corrections with basis page-image or other-copy). |
| Strongest evidence-based reconstruction | No digit is corrected silently; the row says what the text reads and what the page image shows. |
| Confidence tier | documented only where both readings agree |
| Competing values | - |
| Product marking | The scene or card carries the tier mark and, for an open gap, the gap marker with this id. |
| Visual and audio impact | every number on a hospital card |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None needed. |
| Agent recommendation | A one-attempt page-image check of the digits the cards use, as the OR27 and fence workstreams already do for their numbers. |
| Status | open (proposed by bt-medical, planning step, 2026-11-14; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
