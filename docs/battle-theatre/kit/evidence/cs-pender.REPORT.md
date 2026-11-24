# Kit evidence report: cs-pender

Army of Northern Virginia, Third Corps: Pender's division (McGowan under Perrin, Lane, Thomas, Scales). 24 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-pender.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-pender-01-strength.md`, `-02-arms-dress.md`, `-03-commanders-ga.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-pender-library.md`, `-roster.md`. Written 24 November 2026. Builder in `tmp/kit-cs-pender/` (`build_p.py`, `part2p.py`, `part3p.py`).

## Counts
`--coverage --require-complete` exits 0: 167 lines (155 evidence, 5 gap, 7 source declarations); 144 accepted (125 documented, 19 inferred), 11 superseded, 0 errors. Pairs 134 of 134. Evidence by field: roster 24, commander 45 (with the change lines that supersede the table line), casualties 52, strength 13, officer 2, arms 19 (inferred), dress 0 (gap). Compile dry run: 0 operations applied (21 lines routed to the verified tables by design, 2 to review: `Enfield rifles` has no catalog id; the Springfield rifle of the 7th North Carolina is a weapon the rules do not assign).

## Corrections
| unit | field | kit or plan now | record | source and page | line |
|---|---|---|---|---|---|
| all brigades and regiments | commander | none below the brigade | commanders of every regiment in order of succession (table), with the wounds of Pender, Trimble, Scales, Brown (14th SC), Turner (7th NC), Lowe (28th NC) and who took over | OR27-2-R424 pp. 289-290; R556 to R561 | commander lines |
| cs-3c-pender-mcgowan | commander | McGowan/Perrin | the table prints Col. Abner Perrin under the First Brigade; McGowan is named as the brigade commander, under Perrin's command, in Engelhard's report | p. 289; R556 p. 656 | commander and officer lines |
| cs-3c-pender (division) | strength | 545 plausible-procedural | present for duty 366 officers and 2,974 men on 20 July; 416 and 3,580 on 31 July; aggregate present 3,975 and 4,267 | OR27-2-R425 p. 292 | division strength lines |
| cs-3c-pender-lane | strength | none | effective total 1,355 including ambulance corps and rear guard (Lane; the 33rd North Carolina history repeats it) | R558 p. 667; Clark vol. 2 | strength lines |

## Conflicts
No conflict set. Kept as separate lines by basis or period: Guild's return (pp. 333-334, killed and wounded) and the Addenda compilation (pp. 344-345, with the captured or missing of Scales' brigade, 110); the division total of the Addenda (262, 1,312, 116, 1,690) includes Poague's artillery battalion, Guild's (259, 1,383, 1,542) does not; Lane's brigade 389 in the rows and 660 in his own report and the footnote; Scales' own table of his report (48, 381, 116, 545 for 1 July) against the return (102, 323, 110, 535 for 1 to 3 July).
OCR and print errors found against the scan: Guild's division total prints 1,383 wounded where the four brigade totals add to 1,283 (348+136+322+477); the corps total below it (1,384) is consistent with 1,283, so the 1,383 is a misprint of the original (waiver recorded on the line). OCR digit and label errors: 1,B42 for 1,542; 434 for 424 (Scales' total, Guild); 1.36 for 136 (Thomas, Addenda); 1,:J55 for 1,355 (Lane's report); UOO for 660; Kth for 14th South Carolina; IWh for 18th, 83d for 33d, 23d for 22d, S4th for 34th, 3(jth for 38th North Carolina; the labels of the 7th and 18th North Carolina, 35th and 45th Georgia and and several Scales rows are missing or misread in the OCR (nearest label quoted).

## Gaps
Strength at Gettysburg of the 19 regiments and of the brigades of McGowan and Thomas (`cs-pender-01-strength.md`); commanders of the 14th, 35th and 45th Georgia (the table prints none; `-03-commanders-ga.md`); dress of the 19 regiments, bayonet and side arm of the 19 regiments and the model of the shoulder arm of 17 of them (`-02-arms-dress.md`). Five gap lines, each naming sources and regex.

## Roster
No unit is missing. The 1st South Carolina (Provisional Army) and the 1st South Carolina Rifles are distinct units in the table. McGowan's brigade is Perrin's in the table. The Addenda has Staff rows for the division and for Scales' brigade with no roster unit (see the request note). The roster has no artillery battalion of the division (Poague's is in cs-art-3c).

## For other groups
cs-art-3c: Poague's battalion (Albemarle, Charlotte, Madison Light, Virginia batteries): Addenda p. 345 total 2 killed, 24 wounded, 6 captured or missing, 32 ('not reported in detail'); McIntosh's battalion 7, 25, 32; Pegram's 10, 37, 1, 48; Total Reserve Artillery 17, 62, 1, 80; Guild p. 334: Artillery Third Corps 14, 101, 115. cs-heth: Heth's division rows on pp. 333 and 344 (Guild total 411, 1,899, 2,310; Addenda 411, 1,905, 534, 2,850).

## Sources
OR27-2 (R424 pp. 289-290, R425 p. 292, R427 pp. 333-334, 344-345, R556 to R561 and R534 read; pages 289, 290, 333, 334, 344, 345, 667, 670, 292 read from the scan); Clark vols. 1, 2, 4, Confederate Military History vols. 4, 5, 6 and Early (declared, copies of the texts of the same sha256 of earlier groups, kept under `tmp/kit-cs-pender/lib/`); SHSP-04, -05, -06, -11, -12, Alexander, Longstreet, Battles and Leaders vol. 3, Fremantle searched, not cited. No new fetch, no host refused.

## Not done
No required pair is open. Not done beyond the pairs: officer lines (the lists of officers killed and wounded in the brigade reports, Appendix lists), the Staff rows of the Addenda, Perrin's campaign totals (654 killed and wounded, about 90 missing), Lane's campaign total (731) and the figures of the retreat were not written; Moore's Roster of North Carolina Troops was not read; the narrative of the 38th North Carolina is not in the volumes of Clark on disk (vol. 3 not searched for it).
