# Kit evidence report: cs-art-2c

Army of Northern Virginia, Second Corps artillery: the battalions of Jones (Early's division), Andrews with Latimer (Johnson's), Carter (Rodes') and the Reserve Artillery under Colonel J. Thompson Brown (the First Virginia Artillery under Dance, Nelson's battalion). 25 units of `groups.json` (6 formations and 19 batteries; the 2d and 3d Richmond Howitzers are one kit record). Workstream `bt-oob-kit`. Evidence file `cs-art-2c.jsonl`. Register proposals `GOVERNANCE/horde/ws-kit/proposed-register/cs-art-2c-01-strength.md`, `-02-horses-casualties.md`, `-03-guns.md`, `-04-dress.md`. Request notes `GOVERNANCE/horde/requests/bt-oob-kit-cs-art-2c-library.md` and `-roster.md`. Written 24 November 2026.

How the file was made. A builder in `tmp/kit-cs-art-2c/` locates every quote through the evidence library, so offset, report id and printed page come from the tool. Read through: Pendleton (R428, with his two addenda tables of the artillery after Gettysburg, pp. 355-356, read from the scans), Brown and Gregory (R468, R469: the table of guns engaged and rounds expended, p. 458, read from the scan at 260 dpi), Jones, Green and Tanner (R478-R480), Latimer and Andrews (R504, R505), Carter, Dance and Nelson (R531-R533), the organization table (pp. 286-288, scans at 200 dpi), Guild's return of the killed and wounded (pp. 331, 332) and the Addenda return of casualties (pp. 341-343, scans at 170 dpi); the three abstracts of R425 were read and carry artillery by army corps only. Not run: `kit_verified.py build`, `kit_overrides.py compile` (only `--dry-run`), the gate runners. No network request was made.

## Counts

`python -I tools/bt/kit_evidence_check.py cs-art-2c --coverage --require-complete` exits 0: `cs-art-2c: 137 lines (119 evidence, 6 gap, 12 source); accepted 116 (documented 110, inferred 6); rejected 0; superseded 3; 0 errors, 50 warnings; coverage: 157 of 157 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Active evidence lines by field: guns 35, commander 30, roster 25, casualties 20, horses 6. The 12 source lines declare texts other groups pinned (Confederate Military History, Clark, Early) that were searched for battery names; nothing was fetched. Guns: Gregory's table gives 17 of the 19 batteries (Charlottesville, Amherst and Fluvanna have no row) a count and kinds for 1-3 July (documented; the table is scrambled in the OCR, so the quote is the OCR list of the captains and the counts were read from the scan, with the reason in `waive_numbers`); Green, Dement (June), Hupp and Andrews' battalion also in the reports' own words; five battalion lines from Pendleton's undated table "after Gettysburg" (Andrews 16, Carter 16, Jones 16, Brown 20, Nelson 13) and six derived (inferred) totals from Gregory's rows. Casualties: battery rows of the Addenda return for Staunton, Louisiana Guard, Chesapeake, Alleghany, 1st Maryland and Lee, the battalion totals of Guild's return and of the Addenda return, and the report statements for King William, Morris, the Richmond Howitzers, the First Virginia Artillery and Carter's battalion.

## Corrections

The kit's guns for all 19 batteries are `gap` (the PDF's table, SS-ConfArt-96 and Wikipedia, none of which states a count that the record can confirm). What the record says now:

| unit | field | kit now | evidence value | source and page | line |
|---|---|---|---|---|---|
| Morris (Page) | guns | gap | 4 light 12-pounders engaged | R469 p. 458 | 0065 |
| Orange (Fry) | guns | gap | 2 10-pounder Parrotts, 2 3-inch rifles | R469 p. 458 | 0066 |
| King William (W. P. Carter) | guns | gap | 2 10-pounder Parrotts, 2 light 12-pounders | R469 p. 458 | 0067 |
| Jeff. Davis (Reese) | guns | gap | 4 3-inch rifles | R469 p. 458 | 0068 |
| Powhatan (Dance's) | guns | gap | 4 3-inch rifles | R469 p. 458 | 0069 |
| Salem (Hupp's) | guns | gap | 2 3-inch rifles engaged (and 2 Napoleons in position on 4 July) | R469 p. 458; R532 | 0070, 0083, 0084 |
| Rockbridge (Graham) | guns | gap | 4 20-pounder Parrotts | R469 p. 458 | 0071 |
| Staunton, Courtney, Louisiana Guard | guns | gap | 4 light 12-pounders; 4 3-inch rifles; 2 10-pounder Parrotts and 2 3-inch rifles | R469 p. 458; R479 p. 497 (Green) | 0072-0074, 0081 |
| Milledge | guns | gap | 1 10-pounder Parrott, 2 3-inch rifles | R469 p. 458 | 0075 |
| Alleghany, Lee, Chesapeake, 1st Maryland | guns | gap | 2 3-inch + 2 light 12-pounders; 2 20-pounder + 1 10-pounder Parrott + 1 3-inch; 4 10-pounder Parrotts; 4 light 12-pounders (Napoleons on 14 June, R504) | R469 p. 458 | 0076-0079, 0082 |
| 2d and 3d Richmond Howitzers | guns | gap | 4 10-pounder Parrotts (Watson) and 4 3-inch rifles (Smith) | R469 p. 458 | 0080 |
| Andrews' battalion | commander | no commander recorded in the kit | Latimer heads the table and commanded; Latimer mortally wounded 2 July, Raine succeeded; Andrews absent, wounded at Winchester | R424 p. 286; R505 pp. 543-545 | 0016-0017, 0121-0123 |
| Chesapeake | commander | none in the kit | Capt. William D. Brown severely wounded 2 July (the dated line supersedes the table line) | R505 p. 544 | 0124 |
| Jones, Andrews, Carter battalions | casualties | none in the kit | two returns that differ (see Conflicts) | R427 pp. 331, 332, 341, 342 | 0099-0104 |

OCR digit and word errors found against the scan: Gregory's table (p. 458) and Pendleton's tables (pp. 355, 356) come out of the OCR as detached columns; the casualty labels of p. 341 (Carrington's, Garber's, Green's, Brown's, Carpenter's, Dement's, Raine's rows), of p. 342 (the five rows of Brown's Battalion but Hupp's and Smith's) and p. 332 (Carter's Artillery Battalion) are lost, and Jones's total prints 8 0 8 for 2, 6, 8; the organization table prints Cul. J. Thompson Beown, Kiiine for Raine, Lieitt., M>issie for Massie, 2(1 Riclimond for 2d Richmond, GTiard for Guard, Maiyland; Tanner's report p. 499 prints two 13-pounder Napoleon guns carried to the field park (the digit was not read on the scan and the line was not written); Jones' report p. 497 prints ;> horses killed for the Courtney battery at Williamsport (not written). Andrews' report prints -1 men killed for 4 (Brown's battery).

## Conflicts

| conflict key | alternatives | lines |
|---|---|---|
| `cs-2c-early-jones|casualties|1863-07-01-1863-07-03` | A: Guild's return, Jones' Artillery Battalion 3 killed, 7 wounded, 10 (p. 331); B: the Addenda return 2, 6, 8 (p. 341; Garber 1 wounded, Green 2 and 5) | 0099 (A), 0100 (B) |
| `cs-2c-johnson-andrews|casualties|1863-07-01-1863-07-03` | A: Guild 10 killed, 36 wounded, 46; B: Addenda 10, 40, 50 (the five rows add to the total) | 0101 (A), 0102 (B) |
| `cs-2c-rodes-carter|casualties|1863-07-01-1863-07-03` | A: Guild 5, 36, 41 (p. 332); B: Addenda 6 killed, 35 wounded, 24 captured or missing, 65 (p. 342); Carter's report says 65 in killed, wounded and prisoners (line 0118, agrees with B) | 0103 (A), 0104 (B) |
| `cs.art.louisiana_guard|casualties|1863-07-01-1863-07-03` | A: Addenda row, Green 2 killed, 5 wounded; B: the footnote to Green's report, the nominal list shows 3 killed and 5 wounded (p. 498) | 0108 (A), 0109 (B) |

No default is chosen. Not conflicts and kept as separate lines: the Addenda return of the Gettysburg battle against Jones' summary of the Hunterstown action (Green's two guns: 1 killed, 1 sergeant and 14 men wounded, R478 p. 496) is not entered as a line; it exceeds the 5 wounded the return gives the whole battery and is listed here for the owner. Guns engaged (Gregory, 1-3 July) and guns present after Gettysburg (Pendleton, undated) are different states and carry different totals for Jones (12 against 16) and Brown (18 against 20).

## Gaps

| field | units | what was searched | result | register proposal |
|---|---|---|---|---|
| strength | all 19 batteries | the reports read through by regex, R425 pp. 291-293 (artillery rows by corps only), SHSP-12 later list, Alexander, twelve state and regimental texts by battery name | not found | `cs-art-2c-01-strength.md` |
| dress | all 19 batteries (all kit fields) | same, dress words | not found | `cs-art-2c-04-dress.md` |
| horses | 13 batteries without a line | reports, regex horses and teams; Brown's 93 horses are for the corps | not found | `cs-art-2c-02-horses-casualties.md` |
| casualties | 10 batteries (Charlottesville, Courtney, Jeff. Davis, Orange, Powhatan, Rockbridge, Salem, Amherst, Fluvanna, Milledge) and Nelson's battalion | the Addenda rows (blank), footnotes (not reported in detail; loss, if any, not of record) | not found | `cs-art-2c-02-horses-casualties.md` |
| guns | Charlottesville, Amherst, Fluvanna | Gregory p. 458, reports, Pendleton; the arithmetic that leaves 4 and 10 guns is not entered | not found | `cs-art-2c-03-guns.md` |

## Roster

- Units the record shows and the plan lacks: none. All 19 batteries named in the organization table are units of the group.
- Mislabelled or merged: the 2d and 3d Richmond Howitzers are one kit record (both companies carried in the lines); the roster's Andrews' battalion is headed in the table by Latimer; the First Virginia Artillery is the roster's `1vaartbn`, headed Brown's Battalion in the casualty return.
- The names of the batteries by their captains (Gregory's list uses captains) are in the request note `bt-oob-kit-cs-art-2c-roster.md`.

## For other groups

- `cs-art-1c`: Pendleton's undated table of the artillery after Gettysburg (R428 pp. 355, 356) gives rows for Cabell, Henry, Dearing, Alexander and Eshleman (guns by kind; First Corps 83 guns); Guild's return p. 330 has Alexander's Artillery Battalion 19 killed, 103 wounded, 122 and the Washington Artillery Battalion 4, 32, 36; Henry's casualties are footnoted as not reported.
- `cs-art-3c` (same author): the third-corps half of the same table (p. 356).
- `army-hq`: Baldwin's report (R429) of the artillery captured and brought off at Gettysburg, seven pieces.

## Sources

`OR27-2` (R424 pp. 286-288; R425; R427 pp. 331, 332, 341-343; R428 pp. 355-356; R468; R469 p. 458; R478-R480; R504-R505; R531-R533), `ALEXANDER-1907` (Nelson had three batteries carrying 13 guns). Searched without a result: SHSP-04, 05, 06, 11, 12, BL-3, Longstreet, Fremantle, and the 12 declared texts (see the library note). No host was asked; none refused.

## Not done

Every required (unit, field) pair is evidenced or recorded as a gap. Not done, though not required: officer lines (lieutenants named in the reports); arms; the horses and casualty statements of the retreat (Tanner at Williamsport, Hunterstown) as battery lines, because their dates and digits are outside the battle window or misread; Tanner's two Napoleons carried to the field park (digit unread); the ammunition expended by battery (Gregory's table, 5,851 rounds in all) as `ammunition` lines; the Pendleton table's rows for caissons and forges. `kit_overrides.py compile --dry-run --group cs-art-2c`: 38 operations, 26 unapplied (12 routed by design, 14 to review: unresolved piece types, a joined card).
