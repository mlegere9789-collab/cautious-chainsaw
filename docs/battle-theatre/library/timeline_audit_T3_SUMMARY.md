# Timeline audit T3 (218 rows) against OR Ser. I vol. 27: summary

Records: `docs/battle-theatre/library/timeline_audit_T3.jsonl` (one record per seed row T3-001 to T3-219; there is no T3-131 in the seed). The seed, windows, defaults and tiers were NOT changed. OR citations use the finished index (`or27_index.json`) and `tools/bt/or27_find.py`; every quote (at most one short quote per passage, under 15 words) was re-verified by code against the same report record (240 quotes, 0 failures). Pages are printed pages; a `~` page is interpolated. OR text is single-witness OCR: records with an uncertain digit carry `ocr_uncertain: true`.

## Counts per verdict

| Verdict | Rows |
|---|---|
| SUPPORTED_BY_OR | 108 |
| CONTRADICTED_BY_OR | 12 |
| AMBIGUOUS_IN_OR | 17 |
| NOT_FOUND_IN_OR | 47 |
| NOT_AN_OR_CLAIM | 34 |
| Total | 218 |

Convention used: SUPPORTED = the OR states the row's event/place/unit/number (and any OR time is compatible with the row window). Where the row adds details the OR does not carry, the record keeps SUPPORTED and lists those details in `differs_from_row` (81 of the 108 rows have such a note; 27 have none). NOT_FOUND records list at least three targeted searches (names, places, times) and say they were targeted, not exhaustive. Verdicts of the finished claim checks (OR27-CLAIM-CHECKS: a1-s3) were reused and cited where they apply (T3-001, 016, 020, 036, 040, 055, 056, 068, 074, 075, 094, 096, 100, 103, 138, 151, 159, 183, 189, 194, 219 and others).

## CONTRADICTED_BY_OR (12): both values

| Row | Row says | OR says |
|---|---|---|
| T3-023 | Ruger's division and Lockwood's brigade withdraw and return 02:00-04:00 Jul 3; scouts report Confederates in the works | Ruger/Williams division returned about 22:00 Jul 2 and found the works occupied (Colgrove p813, Ruger p780); Lockwood reported to the division 07:30-08:00 Jul 3 (Greene, Lockwood p804) |
| T3-026 | Geary misreads orders, marches down the Baltimore Pike, returns, overnight Jul 3 | departs about 19:00 Jul 2 (Geary p826-827), Kane told to return 21:00 and fired on, Candy in place about 01:00 Jul 3; Geary says he "received no specific instructions" (not "misread") |
| T3-033 | XII Corps elements return about 04:00 Jul 3 and find Confederates in their works | about 21:00-22:00 Jul 2 (Geary, Colgrove, Ruger); at 03:45-04:30 Jul 3 Union batteries open (Candy 3.45, Ruger 4.30) |
| T3-039 | Steuart's dawn attack about 05:00-05:30 | fighting onset 03:30 (Geary, Kane), 03:45 (Candy), 04:00 (Greene, Slocum's battery), "daylight" (Steuart); 04:30/05:30 are Hunt's artillery times |
| T3-044 | Geary's men fired about 227,000 rounds (W-CH) or 250,000 (letter) | Geary p833 (OCR) 277,000 rounds on Jul 3 and subsequent skirmishing; OCR-uncertain digit (277 vs 227) |
| T3-058 | 1st Md PHB shot up and 147th PA charges the Pardee Field wall about 10:00 | 147th PA charge at 05:00 (Geary p828); 1st Md PHB attack about 04:00 (Maulsby p806); at 09:00 it held the rifle-pit front |
| T3-099 | "No documented rail breastworks"; do not animate rail piles | Hall (II Corps, 3rd Bde) p437-438: during the night the line was strengthened with rails, stones and earth; Curtis (7th Mich) p450: rails nearly covered with earth by daylight; Webb: the 69th PA behind a fence, cover "not well built"; Gibbon/Harrow: Emmitsburg-road fence rails piled Jul 2 |
| T3-120 | 1st W.Va 21 killed/34 wounded/43 captured (98); brigade 183 | Capehart p1019 (OCR): 5 killed and 4 wounded; Richmond: brigade 3+17 killed, 4+26 wounded, 2+55 missing (about 107); Kilpatrick: division 319 |
| T3-134 | III Corps passes from Sickles to French on Jul 7 | French p489: assumed command of the Third Corps on Jul 9 |
| T3-175 | Smithsburg artillery duel about 14:00 Jul 5 | Kilpatrick: enemy columns debouching 17:00, Fuller's battery opened 17:30, back at Boonsborough 22:00; Richmond "afternoon" |
| T3-190 | Buford vs Imboden at Williamsport about 17:00 on Jul 7 | Buford, Kilpatrick and the itinerary (R007): the Williamsport fight was Jul 6; on Jul 7 both divisions moved to Boonsborough |
| T3-199 | Jul 12 night council: only Wadsworth and Howard favor attacking (2 of 7) | Meade's Jul 13 5 p.m. dispatch (p91): five out of six corps commanders were opposed; the council preceded 17:00 on Jul 13 (the Jul 12 telegram announcing an attack is supported) |

## AMBIGUOUS_IN_OR (17): the OR reports disagree with each other

| Row | OR values |
|---|---|
| T3-005 | Johnson's brigades crossing Rock Creek: Greene "a few minutes before 7 p.m." vs Johnson "it was dark" |
| T3-006 | XI Corps regiments sent: Greene and Geary name 3 (82nd Ill, 45th NY, 61st Ohio); Schurz 4 (adds 157th NY); about 750 men agrees; help requested at the onset (about 19:00), not 19:45 |
| T3-011 | End of Johnson's attack: 21:30 (Greene), 22:00 (Geary), Confederates rest from about 23:00 (Steuart) |
| T3-022 | Rigby on the hill: Hunt "soon after daylight" Jul 3 vs Rigby's own report "morning of July 2" |
| T3-037 | Who opened the dawn fight: Geary 03:30 Union artillery plus infantry; Kane 03:30 Confederate attack; Candy 03:45; Greene 04:00; Ruger 04:30; Hunt/Muhlenberg 04:30 and 05:30 |
| T3-040 | Buford: Taneytown (night Jul 2), Westminster (Jul 3); Merritt: Emmitsburg Jul 2 then the field Jul 3 |
| T3-069 | Confederate guns: Hunt 100-120 (115), McGilvery at least 140, Hancock 115-150, Pendleton nearly 150 (weak-source row) |
| T3-075 | Cannonade start 12:30 (McGilvery), 13:00 (Lee, Pendleton, Cabell, Hunt, Hancock), 13:30 (Peyton), about 14:00 (Longstreet, Sawyer, Lang, Hays, Smyth) |
| T3-079 | East Cavalry Field: "about noon" (Pleasonton), 12 m. dispatch (Gregg), 5th Mich out 10:00 (Custer), Hampton's order about 16:30; no OR value of 13:00 or 15:00 |
| T3-085 | Same conflict; Gregg: enemy withdrew at dark; his loss 295 including Jul 2 (row 254/56) |
| T3-094 | Cannonade end: 14:30 (Hunt), 14:45 (Hancock), 14:30 (Peyton 1 hour), about 15:00 (Lee, Cabell), 16:30-17:00 (Hays, Smyth) |
| T3-100 | Step-off: 14:30 (Peyton), about 15:00 (Hunt, Webb), nearly 16:00 (Lang, Sawyer), 16:30 (Hays) |
| T3-103 | Advance start as T3-100; open ground three-quarters of a mile (Lee) |
| T3-109 | Farnsworth's charge: 15:00 (Capehart), 17:00 (Preston), 17:30 (Kilpatrick) |
| T3-169 | Monterey Pass wagons: Capehart 300 wagons plus 15 ambulances; Stuart's citizen 40 (denying 400-500); prisoners 1,300-1,360 agree |
| T3-191 | Boonsborough Jul 8: Buford 06:00 to about 17:00; Devin until dark; Kilpatrick gives no hour |
| T3-219 | Union total 23,049 matches the first PDF value (23,055 absent); Confederate OR figures (Guild) differ from 28,063/23,231; Letterman 14,193/6,802 agrees |

## Weak-source rows (weak_source_flag true)

T3-069 (AMBIGUOUS, see above), T3-132 (Sherfy barn: NOT_FOUND, the word "Sherfy" never occurs in the OR text), T3-139 (Spangler hospital deaths: NOT_FOUND). None of the three is now SUPPORTED, so there is nothing to promote from this slice. The only gun count the OR gives for 12:30-13:00 is spread across observers (T3-069).

## Rows whose printed PDF time is outside every OR value

T3-023 (02:00-04:00), T3-033 (04:00), T3-039 (05:00-05:30), T3-058 (10:00), T3-026 (overnight Jul 3), T3-175 (14:00), T3-079 and T3-085 (13:00/13:30-13:45/15:00 for the East Cavalry Field fight), T3-100 (14:00 step-off), T3-006 (19:45), T3-186 (16:00; OR 17:00-18:00), T3-191 (11:00 and 19:00), T3-199 (night of Jul 12), T3-136 (dusk; OR night), T3-207 (noon; OR 13:00), T3-061 (11:00; OR 10:00-10:30), T3-195 (Buford withdraws early evening; OR 14:00-15:00), T3-134 and T3-188 (Jul 7; OR Jul 9).

## Findings the integrator should know (all in the records)

- The OR documents Second Corps rail/stone/earth reinforcement on the night of Jul 2-3 (Hall p437-438; Curtis p450), contrary to the "undocumented" notes of T3-027 and T3-099.
- OR exactly matches the row on: Alexander's losses 19/114/6 and 116 horses (T3-032), Eshleman's casualty list (T3-093), Cabell's totals (T3-130), 20 flags in 100 yards square (T3-118, Hall), Hunt's Union ammunition expenditure 32,781 rounds (T3-127, fills a gap), Carter's 65 (T3-077).
- Lee's Jan 1864 report fills several gap rows with Confederate retreat data (T3-201 bridge rebuilt with new boats by Jul 13; T3-129 troops rallied; T3-203 Longstreet and Hill began crossing at daylight; T3-207 passage complete about 13:00).
- Rows that are gaps but are partly answered by the OR (NOT_FOUND on the exact hour, evidence cited): T3-018, 019, 128, 129, 140, 184, 187.
- Part 3 gives the Lee-Meade prisoner-exchange exchange of Jul 4, 06:35 and 08:25 (T3-152, printed p.514).
- "Powers Hill" and "McAllister Hill" do not occur in the OR (it says "Slocum's Hill"); "Pardee Field", "Cress Ridge", "Rummel", "Bliss", "Sherfy", "Codori" do not occur as place names.

## NOT_AN_OR_CLAIM (34) reasons

Weather, sunrise/sunset, moon, heat index, sound model, plausible-procedural fill, civilian property claims (Brian, Warfield), post-battle burial, medical-camp, hospital-closing, cemetery and memorial rows (T3-008, 017, 035, 048, 054, 070, 072, 073, 081, 095, 102, 125, 133, 135, 141, 142, 143, 145, 149, 150, 153, 164, 165, 166, 167, 173, 185, 196, 211, 213, 215, 216, 217, 218). Reason given in each record; none searched.

## Tool and OCR problems met

- `or27_find.search()` stops after its per-call limit before reaching later records when many hits precede them; a plain call with a record filter therefore returned 0 hits. Worked around by scanning only the record's own character range (same normalized view and citations).
- Digit confusion that affects a verdict or number: Geary 277,000 rounds (T3-044), Hunt 32,781 (T3-127), Candy "12 p. m." (T3-026), Meade "morning of the 6th" for the 5th (T3-171), Lee "0th"/"Gth" for the 6th, Lee "r.^th" for the 12th, Guild "1.3th"/"July .3", Cuyler "35th instant" (T3-212), Steuart "lip. m." (T3-009), Peyton "GO yards", Lang "TOO strong", Meade "five Oiit of six" (T3-199), Johnson table totals (T3-062), Return of Casualties 6th US Cavalry cell (T3-119).
- Casualty tables (First Corps by division, Guild's totals, Return of Casualties) are numerically unreadable, so charge totals (T3-122) and per-regiment figures (T3-120 partly) could not be checked; Kilpatrick's skipped Jul 8 passage and Devin/Preston/Hammond casualty counts were not extracted.
- Reports not in the index: Imboden, Wilcox, Hood, McLaws, Law, Pickett, Kemper, Armistead, Warren, Sickles; Part 3 contents-list entries (e.g. Humphreys announced Jul 8) are front matter, not records.
- Seed text problems: apostrophes appear as U+FFFD; several rows contain text from neighbouring rows or a legend/phase table (T3-063, 082, 099, 103, 112, 146, 207 and the appended T3-122/123/150/219 text inside T3-112); each was audited on its primary claim only. T3-131 does not exist in the seed.
- Not done: Stannard (R069) and Devin/Preston/Hammond full reports, Hess/Sears and other secondary authors named in the rows (outside the OR), Imboden's narrative (not in the OR).

Progress: T3-001 to T3-219 complete (218 of 218 rows written, validated: 0 duplicates, 0 missing, 0 unverified quotes).
