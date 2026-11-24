# Kit evidence report: cs-heth

Army of Northern Virginia, Third Corps: Heth's division (Pettigrew, Brockenbrough, Archer, Davis). 23 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-heth.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-heth-01-strength.md`, `cs-heth-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-heth-library.md`, `-roster.md`, `-catalog.md`. Written 24 November 2026. Builder and drafts in `tmp/kit-cs-heth/` (`build_h.py`, `part2h.py` to `part5h.py`; helpers from `tmp/kit-cs-anderson/org2.py` and `tmp/kit-cs-hood/sh.py`).

## Counts
`--coverage --require-complete` exits 0: 173 lines (161 evidence, 5 gap, 7 source); 148 accepted (140 documented, 8 inferred), 13 superseded (organization-table commander lines replaced by the same commander with a change of command), 0 errors. Pairs 124 of 124. By field: roster 23, commander 50, casualties 48, strength 17, officer 13, arms 6, dress 4, gap lines 5. Compile dry run: to review only the items with no catalog id (shoes sought, rifles). Warnings: OFF_FIELD 14, OCR_CORRECTED 13, NO_IDENTITY 8, PAGE_UNCHECKED 15, HYPHEN 4, NUMBERS_WAIVED 3.

## Corrections
Neither the roster nor the kit holds a commander below the brigade, a strength or a casualty figure for these units; the record settles the following.

| unit | field | plan now | evidence value | source and page | line |
|---|---|---|---|---|---|
| Heth's division | commander | Heth/Pettigrew | Heth (slightly wounded 1 July), then Pettigrew in command on 2 and 3 July | OR27-2-R534 p. 607; R553 p. 650 | 0120, 0121 |
| Pettigrew's brigade | commander | one name | Pettigrew, Col. J. K. Marshall (three accounts of his fate), Major J. Jones from 4 July, Lt. Col. W. J. Martin by mid-July | R553 p. 650; R551 p. 645; R550 p. 644; Clark | 0124-0126 and following |
| Archer's brigade | commander | one name | Archer (captured 1 July), Col. B. D. Fry (wounded and taken 3 July), Lt. Col. S. G. Shepard (14 July) | R549 p. 638; R553 p. 651; R550 p. 644 | 0139-0142 |
| Archer's brigade | strength | none | 1,048 men went into the fight on 1 July; 677 lost | R552 p. 647 | 0117, 0152 |
| 26th North Carolina | strength | none | over 800 went in; 216 unhurt after the first day; about 80 for duty on 4 July | R551 p. 645 | 0114-0116 |
| Heth's division | strength | none | about 8,000 effective at the beginning; 1,500 or 1,600 on 4 July (letter); returns of 20 and 31 July | R551 p. 645; R425 p. 292 | 0103-0113 |
| 55th North Carolina | arms | default | the only regiment on the line before Suffolk armed with old smooth-bore muskets, the others with rifles (30 April to 1 May 1863) | Clark vol. 3 | 0159 |
| 44th North Carolina | roster | never_on_field, parent army | at Hanover Junction and the South Anna bridges from 25 June under Colonel Singeltary | OR27-2-S4-03 p. 797 | 0156-0158 |

## Conflicts
`cs-3c-heth-pettigrew|commander|fate_of_colonel_marshall`: A (Davis, August 1863: Colonel Marshall, commanding Pettigrew's brigade, wounded and taken prisoner on 3 July, line 0124), B (Young's letter of 4 July: supposed to be killed, line 0125), C (Clark, 1901: pierced through the body, fell from his horse dead, line 0126). No default chosen.
Differences that are not conflicts because the basis differs: Clark's 55th North Carolina chapter gives 64 killed and 172 wounded against 39 and 159 in the returns; the Addenda division total for Heth (411, 1,905, 534, 2,850) exceeds the sum of the four brigade totals (411, 1,899, 517, 2,827) by the artillery battalion (5, 17, 22) and the staff row (1), and the line carries `waive_numbers`; Young's 1,500 or 1,600 effective men on 4 July against the abstract of 20 July (188 officers, 1,753 men present for duty, 2,388 aggregate present) is a difference of date.
OCR digit and label errors found against the scan: 55th Virginia and 55th North Carolina ordinals garbled, 11th Mississippi printed nth, 42d Mississippi 42<1, Archer's Cul. for Col. and Vwi. for Fry (organization table p. 289); 13th Alabama printed ].3th (p. 333); Archer's killed 10 for 16, Brockenbrough's 2.5 for 25 and Heth's division aggregate 2,860 for 2,850 (p. 344); Young's 21G for 216, 8() for 80, S.OOO for 8,000, ],500 or 1,000 for 1,500 or 1,600 (p. 645); Shepard's G77 for 677 (p. 647).

## Gaps
Strength of the brigades of Pettigrew, Brockenbrough and Davis and of 15 regiments; weapon of 11 regiments, bayonet and side arm of 17; every dress field of 17 regiments except the shoes of Pettigrew's four (inferred from Heth's order of 30 June to search Gettysburg for shoes). Searched: OR27-2 R534, R549 to R553 and OR27-3 by regex; Clark vols. 1 to 3 (six chapters, all arms, dress and strength hits read); Confederate Military History vols. Tennessee, Alabama, Virginia, Mississippi; Alexander, Longstreet, Fremantle, Battles and Leaders vol. 3, Southern Historical Society Papers vols. 4, 5, 6, 11, 12. The Clark chapter of the 55th North Carolina gives 340 men and 130 in the charge, both at the Wilderness in 1864, not used. Register proposals: `cs-heth-01-strength.md`, `cs-heth-02-arms-dress.md`.

## Roster
All 22 roster units of the division are shown by the table (p. 289). The 44th North Carolina (never_on_field in the plan) is shown by Colonel Singeltary's report on the Central Railroad in Virginia: roster line engaged not_stated with that detail, commanders Singeltary and Lieut. Col. Hargrove (captured 26 June); the roster lists it with Corse's brigade, which the report names as the brigade the regiment relieved. Request note `bt-oob-kit-cs-heth-roster.md`.

## For other groups
cs-art-3c: Heth's artillery (Garnett's battalion) in the Addenda p. 344: total 5 wounded, 17 captured or missing, 22 (rows of Grandy, Lewis, Maurin, Moore blank). cs-pender: Pender's rows pp. 334, 344, 345. cs-anderson: Anderson's rows are in cs-anderson.

## Sources
OR27-2: R424 p. 289 (table), R425 p. 292 (abstracts), R427 pp. 333, 343-344 (returns), R534, R549 to R553 (reports), S4-01 to S4-04 (Hanover Junction, Union and Confederate reports); ALEXANDER-1907. Declared: Clark vols. 1, 2, 3 (copied from texts other groups fetched), Confederate Military History Tennessee and Alabama (copied), Virginia and Mississippi (on disk). No request to the network by this group; no host refused.

## Not done
None open. Not read: the nominal lists of casualties that the brigade reports say they forwarded (none is printed in the reports read) and Moore's Roster of North Carolina Troops (NC-MOORE-1882) for the officers of the 11th, 26th, 47th, 52nd and 55th North Carolina beyond the table, so company officers are named only where the reports and Clark name them.
