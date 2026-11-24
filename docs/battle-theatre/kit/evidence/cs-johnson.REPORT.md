# Kit evidence report: cs-johnson

Army of Northern Virginia, Second Corps: Johnson's division (Steuart, Stonewall Brigade, Nicholls' and Williams', J. M. Jones). 27 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-johnson.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-johnson-01-strength.md`, `cs-johnson-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-johnson-library.md`, `-roster.md`. Written 24 November 2026. Builder in `tmp/kit-cs-johnson/` (`build_j.py`, `part2j.py`, `part3j.py`, helpers `jr.py` on top of the cs-mclaws and cs-hood helpers).

## Counts
`--coverage --require-complete` exits 0: 219 lines (202 evidence, 12 gap, 5 source); 193 accepted (149 documented, 44 inferred), 9 superseded, 0 errors. Pairs 152 of 152. By field: roster 27, commander 44, casualties 72, strength 15, arms 22, dress 22, gap lines 12. Compile dry run: 0 operations applied (27 lines routed to the verified tables by design, 0 to review): the arms and shoe lines are inferred, undated to the regiment, with no catalog item.

## Corrections
| unit | field | kit or plan now | record | source and page | line |
|---|---|---|---|---|---|
| cs-2c-johnson-stonewall | commander | "Stonewall" (the plan prints the brigade name, no person) | Brig. Gen. James A. Walker; the casualty return heads the brigade Walker's Brigade | OR27-2-R424 p. 286; R427 p. 331 | commander and roster lines of the unit |
| cs-2c-johnson-nicholls | commander | "Nicholls; Williams" | Col. J. M. Williams (2nd Louisiana) commands the brigade in the table; Nicholls is not listed | OR27-2-R424 p. 286 | commander line of the unit |
| cs-2c-johnson-jones | commander | J. M. Jones | Jones wounded; Lieut. Col. Dungan took command; Col. Bradley T. Johnson assigned on 4 July | OR27-2-R481, R495, R497 | commander lines of the unit |
| 1st Maryland Bn, 25th and 44th Virginia | commander | none below brigade | Herbert wounded 2 July, Goldsborough 3 July, Crane commanding; Higginbotham and Cobb wounded, Robinson and Buckner commanding | R482 p. 511; R495 | commander lines of the units |
All regiment commanders below the brigade are new (the plan gives none): the table prints them "as reported for June 14" (footnote of p. 286), which every line quotes in its note.

## Conflicts
Three conflict sets, none resolved: (1) casualties of the 1st Maryland Battalion in the attack on Culp's Hill: 206 (McKim's notes), 250 and 222 (the two other estimates he names, one each), SHSP-05; the return gives 25 killed and 119 wounded (144) with no missing figure; key `cs-2c-johnson-steuart-1mdbn|casualties|loss-in-the-attack-on-culps-hill`. (2) Steuart's brigade total loss: 680 (McKim's diary, 4 July) against 682 (Johnson's inclosure of 7 October); key `cs-2c-johnson-steuart|casualties|total-loss-at-gettysburg`. Not conflicts, kept as different bases: Guild's return (killed and wounded only, division 1,297), the Addenda (division 1,873 with Andrews' artillery) and Johnson's inclosure (1,823 without the artillery, 1,873 minus 50) are distinct lines by basis; the Addenda brigade totals (Steuart 682, Nicholls' 388, Stonewall 330, Jones 421) include missing that the regiment rows leave blank, so the rows do not add to the totals; the footnote of the Addenda gives total losses from regimental reports (21st Virginia 50, 25th 70, 44th 56, 48th 76, 50th 99) against row aggregates of 35, 40, 17, 58 and 60; Funk's own count for the 5th Virginia (3 killed, 42 wounded, 11 missing) against 5 and 46 in the returns.
OCR digit and label errors found against the scan: 2d Virginia printed 3d, 33d Virginia printed aSd, 21st Virginia 2Ist, 25th Virginia 2oth, 42d Virginia 42<1 / Viroinia, 10th Virginia 10th Virgima, 15th Louisiana Loxiisiana (Guild and Addenda labels, pp. 331, 341); the Addenda total of Jones' brigade printed .58 308 61 481 for 58 302 61 421; 27th Virginia "114 muskets" printed lit and "6 missing" printed G (p. 528); Walker printed Wai.keh and Stonewall printed Stnijciran in the table.

## Gaps
Strength of the Stonewall, Nicholls' and Jones' brigades (taken into action or present) and of 19 regiments and the 1st Maryland Battalion; bayonet and side arm of all 22 regiments; weapon of none (inferred from Early for all); the nine dress fields other than shoes for all 22 regiments. 12 gap lines, each naming the sources and the regex searched with counts.

## Roster
Units the record shows and the plan lacks: none for the infantry. The plan's Stonewall Brigade is Walker's Brigade in the casualty returns. Johnson's artillery battalion (Andrews' with Dement, Carpenter, Brown, Raine) stands in the table under the division and belongs to cs-art-2c. McKim calls the 1st Maryland Battalion the Second Maryland.

## For other groups
cs-art-2c: Andrews' Artillery Battalion rows: Guild p. 331: killed 10, wounded 36, aggregate 46; Addenda p. 341: Staff wounded 1 aggregate 1; Brown's Maryland (Chesapeake Artillery) 4, 12, 16; Carpenter's (Alleghany) 5, 19, 24; Dement's (1st Maryland) 1, 4, 5; Raine's (Lee Battery) 0, 4, 4; total 10, 40, 50; the battalion's commanders and batteries on p. 286. cs-early and cs-rodes: the abstract rows of pp. 291-292 are in this file for Johnson's division and in cs-rodes for Rodes'.

## Sources
OR27-2 (R424 p. 286, R425 pp. 291-292, R427 pp. 331 and 341, R467, R481, R482, R492, R493, R495, R496, R497), SHSP-05 (McKim, Steuart's brigade at Gettysburg: strength and losses), Early (declared, same file as cs-early: army-wide arms and shoes statements). Declared and searched: Clark vol. 1 (1st and 3rd North Carolina), Confederate Military History vol. 4 (NC), vol. 10 (Louisiana), vol. 3 (Virginia, on disk). All fetched 24 November 2026 from archive.org by the stream path, one request per second; none refused. Confederate Military History vol. 2 (Maryland) returned a page with no text. Johnson's inclosure of casualties by brigade (p. 506) is read from the scan.

## Not done
No required pair is open. Not done beyond the pairs: officer lines (killed and wounded officers of the lists of OR27-2-R471 and the nominal returns) were not written; the SHSP-05 table of the army's strength of 31 May 1863 (the divisions of Rodes, Early and Johnson) was not used because the OCR separates its labels from its figures and the volume has no scan; the Winchester figures (Johnson's "not more than 1,200 muskets", Ewell's "two brigades did not reach 2,000") describe 14 to 15 June and were not written as strength of a unit; the pass did not read Moore's Roster of North Carolina Troops for the 1st and 3rd North Carolina.
