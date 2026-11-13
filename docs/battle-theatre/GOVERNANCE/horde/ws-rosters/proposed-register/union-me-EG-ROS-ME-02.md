# EG-ROS-ME-02: Men on special duty in the 1898 participants lists not read

| Field | Content |
|---|---|
| ID | EG-ROS-ME-02 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; Law clauses 3, 4 and 7 |
| Category | evidence present, not yet read |
| Description | Each company list ends with a run-in paragraph "On Special Duty or Detached Service: Name, Residence, post; ..." (brigade headquarters, ambulance corps, hospital): men named as belonging to the command and present with the army. 4 to 8 paragraph lines per unit are not parsed (the notes in GOVERNANCE/horde/ws-rosters/union-me/diag-participants.json). |
| Why literal 100% is not possible or blocked | Not blocked. The paragraphs are items cut by semicolons with a wrapped line; the parser reads comma fields of single lines only. |
| Evidence searched | Same item as EG-ROS-ME-01; the paragraph notes list leaf and first words. |
| Autonomous substitute applied | None. |
| Strongest evidence-based reconstruction | Items cut at the semicolons, name and residence by the comma fields, the post as remark. |
| Confidence tier | documented (the source exists); not yet read |
| Competing values | - |
| Product marking | The unit page of the roster states the gap with this id on each of the units named; no line is invented. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None needed. |
| Agent recommendation | Add a paragraph reader; the 20th Maine list (about 575 names in all, G04) is the test case. |
| Status | open (proposed by bt-rosters / union-me; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
