# Kit evidence report: cs-rodes

Army of Northern Virginia, Second Corps: Rodes' division (Daniel, Doles, Iverson, Ramseur, O'Neal) and the kit record CS.5ALBN (Blackford's sharpshooters). 29 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-rodes.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-rodes-01-strength.md`, `cs-rodes-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-rodes-library.md`, `-roster.md`. Written 24 November 2026. Builder in `tmp/kit-cs-rodes/` (`build_r.py`, `part2r.py`, `part3r.py`, helpers `jr.py` on top of the cs-mclaws and cs-hood helpers).

## Counts
`--coverage --require-complete` exits 0: 282 lines (262 evidence, 12 gap, 8 source); 248 accepted (201 documented, 47 inferred), 14 superseded, 0 errors. Pairs 162 of 162. By field: roster 29, commander 58, casualties 73, strength 52, arms 27, dress 23, gap lines 12. Compile dry run: 0 operations applied (29 lines routed to the verified tables by design, 0 to review).

## Corrections
| unit | field | kit or plan now | record | source and page | line |
|---|---|---|---|---|---|
| cs-2c-rodes-iverson | strength | 1,385 printed (PDF notes, basis not stated) | present for duty at Carlisle, 30 June: 114 officers, 1,356 men (effective 1,523, aggregate present 1,674, present and absent 2,975) | OR27-2-R506 pp. 562, 564 | strength lines of the brigade |
| cs-2c-rodes-iverson | casualties | 900 printed | 820 aggregate in the Addenda, Guild gives 455 killed and wounded; Appendix A gives 12+118 killed, 33+349 wounded, 20+288 missing | OR27-2 pp. 332, 342, 562 | casualty lines of the brigade |
| cs-2c-rodes-doles, -ramseur, -oneal | commander | surname only | Doles, Ramseur and Col. E. A. O'Neal (26th Alabama), O'Neal commanding Rodes' (Alabama) brigade | OR27-2-R424 p. 287 | commander lines |
| CS.5ALBN | arms | p1853_enfield; m1861_springfield (inferred, kit) | no model stated; nearly all small arms of the army taken from the enemy (Early, army-wide) | Early (declared) | arms line of the unit |
| CS.5ALBN | roster | 5th Alabama Battalion | a corps of sharpshooters under Major Blackford of the 5th Alabama Infantry; the 5th Alabama Battalion proper is in Archer's brigade | OR27-2-R527, R506, p. 333 | roster line |
All regiment commanders below the brigade are new (the plan gives none). The table lists them in order of succession; the reports add the wounds and who took command (43rd, 2nd Battalion, 4th and 44th Georgia, 2nd, 14th, 20th, 30th North Carolina, 3rd, 6th and 26th Alabama, and Daniel's brigade passing to Brabble on 20 July, after the battle).

## Conflicts
Declared set: Doles' brigade, officers present for duty on 30 June: 128 in the abstract of the return (p. 564, and the total 680 adds with 128) against 129 in Appendix A of the same report (p. 562); key `cs-2c-rodes-doles|strength|officers-present-for-duty-30-june`. Not conflicts, kept as separate lines by basis or period: Guild's return (killed and wounded only, division 2,046), the Addenda (division 2,853 with Carter's artillery) and Appendix A (2,869 without the artillery; Doles 241 against 179 in the Addenda, Ramseur 196 against 177); the Addenda brigade totals include missing that the rows leave blank; the Addenda total of Iverson's brigade prints 130, 328, 308 (820) and does not add as printed (the wounded of Appendix A, 33+349, make 382 against the printed 328; figures given as printed, check waived with the reason on the line); Rodes' sentence "diminished as it had been by a loss of 3,600 men" (1 July) against every return of the three days; the article in SHSP-04 quoting Rodes' return at Carlisle as 8,052 against 8,065 (680 + 7,385) in the report; 14th and 30th North Carolina and 12th Alabama statements of their own losses against the returns; Ewell's "lost 200 of 240" for the 2nd Battalion against 153 in the returns.
OCR digit and label errors found against the scan: 53d North Carolina printed 5iJd (Guild), 5th printed fjth, 12th liJth, 20th SOth, 30th "JlOth and Sfith Alabama for 26th (Addenda); Doles' Guild total printed 23 lai 167 and 24 134 31 179 (22 135 157 and 24 124 31 179 by the scan); the division total of the Addenda printed 421 1,728 701 3,853 for 421 1,728 704 2,853; Iverson's Addenda total (328 for wounded) is a misprint of the original, not of the OCR.

## Gaps
Strength at Gettysburg of 18 regiments, of the brigades of Iverson, Ramseur and O'Neal (taken into action; their strength at Carlisle is in the file) and of CS.5ALBN beyond the 250 of 23 July; bayonet and side arm of the regiments (except the 1861 bayonets of the 23rd North Carolina and the 2nd Battalion); the nine dress fields other than shoes. 12 gap lines, each naming sources and regex with counts.

## Roster
CS.5ALBN is mislabelled (see Corrections and the request note). The table lists the 2nd North Carolina Battalion, which Daniel calls the Second Battalion North Carolina troops. Rodes' brigade is O'Neal's in the table and [O'Neal's] in the return. Carter's artillery battalion belongs to cs-art-2c.

## For other groups
cs-art-2c: Carter's Artillery Battalion rows: Guild p. 332: killed 5, wounded 36, aggregate 41; Addenda p. 342: 6, 35, 24, 65 (total, with the note that the batteries were not reported in detail); the reserve artillery of Brown's battalion on p. 342: 3, 19, 22. cs-heth: the 5th Alabama Battalion of Archer's brigade is listed on p. 333 and in R552 (the battalion's flag lost). cs-johnson: abstract rows of Johnson's division in this file's companion.

## Sources
OR27-2 (R424 p. 287, R425 pp. 291-292, R427 pp. 332 and 342, R467, R506, R507 to R512, R514, R517, R519, R521, R522, R525, R527 to R530; Rodes' Appendix A p. 562 and the abstract of 30 June p. 564 read from the scan), SHSP-04 (the strength paper), Early (declared, as in cs-early), Clark vols. 1 to 4, Confederate Military History vol. 4 (NC), the Alabama extended edition, vol. 6 (Georgia, on disk). All fetched 24 November 2026 from archive.org by the stream path, one request per second; none refused.

## Not done
No required pair is open. Not done beyond the pairs: officer lines (the list of Rodes' officers killed and mortally wounded, p. 563, and Appendix B) were not written; the SHSP-05 table of the army's strength of 31 May 1863 was not used (labels and figures separated by the OCR, no scan); the footnote change lines for the 5th and 23rd North Carolina (captains wounded, "it does not appear who commanded") were not written because the footnote OCR is too garbled to quote (the 20th North Carolina's was); Moore's Roster of North Carolina Troops was not read for the regiments' strength.
