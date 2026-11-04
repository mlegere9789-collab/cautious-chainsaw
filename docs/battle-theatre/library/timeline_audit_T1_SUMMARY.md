# Timeline audit, slice T1 (rows T1-001 to T1-225) against OR Ser. I vol. 27: summary

Output records: `docs/battle-theatre/library/timeline_audit_T1.jsonl` (one JSON record per row, 225 records). Source text: `or27_index.json` and `tools/bt/or27_find.py`; earlier verdicts from `OR27-CLAIM-CHECKS.md` are reused where cited. Nothing in the seed, the windows, the tiers or any default was changed. OR text is single-witness OCR; digits that depend on a single misread-prone character are marked `ocr_uncertain`.

Every quote in the records (under 15 words, one per evidence item) was re-verified by code against the whitespace-normalized OCR text (`or27_find.verify`) in a final pass: 0 failures. Pages are printed pages from the index; `page_interpolated: true` marks an interpolated page (range in the cite). A SUPPORTED verdict means the OR states the core fact (same unit, place and day, and the hour where the OR gives one). Each record lists in `note` and `differs_from_row` the sub-claims the OR does NOT carry (for example a row hour the OR does not state). The owner decides what to do with them.

## Counts per verdict

| Verdict | Rows |
|---|---|
| SUPPORTED_BY_OR | 130 |
| CONTRADICTED_BY_OR | 23 |
| AMBIGUOUS_IN_OR | 6 |
| NOT_FOUND_IN_OR | 16 |
| NOT_AN_OR_CLAIM | 50 |
| total | 225 |

NOT_AN_OR_CLAIM rows are: weather, sky, moon, sunrise/sunset (T1-003, 019, 023, 030, 041, 068, 070, 075, 080, 132, 158, 189, 190, 193, 195, 196, 219, 220, 223, 224, 225); open-gap rows that assert missing data (T1-018, 022, 029, 040, 066, 067, 071, 073, 104, 116, 194, 203, 214, 217); plausible-procedural fallback rows (T1-105, 215); medical-camp and civilian rows (T1-114, 135, 138, 139, 140, 169, 170, 171, 206, 208, 213, 218); a cemetery-fabric row (T1-197). Open-gap row T1-057 (Early from York to Heidlersburg) was audited as a claim because Early's own report closes the gap; T1-091, T1-092, T1-093 are NOT_FOUND.

## CONTRADICTED_BY_OR (23 rows): row value and OR value

- **T1-007**: 26th Pennsylvania Emergency Militia (Col. Jennings) arrives at the Gettysburg rail station by train about 09:00 on Jun 26
  - OR vs row: OR (Early) puts the regiment's arrival at Gettysburg on the night of Jun 25, not about 09:00 on Jun 26; the OR does not say it came by train.
  - OR evidence: OR27-2-R470 Maj. Gen. Jubal A. Early p.465
- **T1-020**: Early's division leaves Gettysburg east on the York Pike toward York at daybreak on Jun 27; Gordon's men chop down the flagpole
  - OR vs row: Only Gordon's brigade went by the York pike. The OR has the rest of the division leaving Mummasburg on the 27th by Hunterstown, New Chester, Hampton and East Berlin toward Dover, not leaving Gettysburg east on the York Pike. The flag Gordon took down (Gordon report) was at York, not Gettysburg.
  - OR evidence: OR27-2-R470 Maj. Gen. Jubal A. Early p.466; OR27-2-R470 Maj. Gen. Jubal A. Early p.466
- **T1-024**: Stuart's three cavalry brigades cross the Potomac at Rowser's Ford about 03:00 (or dawn) on Jun 28
  - OR vs row: OR: crossing begun early in the night and finished before midnight (night of Jun 27), with the march resumed early on Jun 28; the row has the crossing at about 03:00 Jun 28 (or dawn).
  - OR evidence: OR27-2-R565 Maj. Gen. J. E. B. Stuart p.693; OR27-2-R565 Maj. Gen. J. E. B. Stuart p.694
- **T1-032**: Early's division occupies York on Jun 29
  - OR vs row: OR puts the occupation of York on Jun 28 (Gordon in the morning, Early and the division later that day), one day before the row's Jun 29. The division was still around York on Jun 29 (Gordon rejoined it then; Early left at daylight Jun 30).
  - OR evidence: OR27-2-R470 Maj. Gen. Jubal A. Early p.466
- **T1-046**: Jun 30 before noon at Hanover (Forney farm): 18th PA, Farnsworth's brigade and the 6th Michigan (Custer's combat debut) vs Stuart's column; the fight ends just before noon
  - OR vs row: OR (Richmond, Hammond) has the Union column arriving and the fight beginning about noon, then a fight of about two hours (Kilpatrick), so the fight ends about 14:00, not just before noon; Stuart's own 'about 10 a.m.' is the earliest value. Custer's report lists the 1st Michigan (supporting Battery M) and the 5th Michigan (severe skirmishing) at Hanover; a 6th Michigan role is not stated in the passages found.
  - OR evidence: OR27-1-R362 Col. Nathaniel P. Richmond p.1005; OR27-1-R363 Maj. John Hammond p.~1008 (1007-1008); OR27-1-R359 Brig. Gen. Judson Kilpatrick p.986
- **T1-055**: Jun 30: Meade's headquarters move to Taneytown; II Corps (Hancock) is at Taneytown per the circular layout
  - OR vs row: The headquarters part is supported, but the II Corps was at Uniontown on Jun 30, not at Taneytown (Hancock reached Taneytown the morning of Jul 1). The Pipe Creek circular itself (headed Jul 1) says the II Corps 'now at Taneytown'.
  - OR evidence: OR27-3-D0925 Headquarters Army of the Potom p.419; OR27-1-R076 Maj. G«n. Winfield S. Hancock p.367
- **T1-061**: Night of Jun 30: Meade at Taneytown issues the Pipe Creek Circular (defensive line Middleburg to Manchester about 20 miles; HQ at Frizellburg; trains behind Westminster; II Corps in reserve); row notes the text says late Jun 30 but the document is headed Jul 1
  - OR vs row: The OR prints the circular headed Taneytown, July 1, 1863 (no hour); the row's Jun 30 night date is the row's own inference. Content (Middleburg-Manchester line, HQ Frizellburg, trains behind Westminster, II Corps in reserve) matches.
  - OR evidence: OR27-3-D0962 Circular.] Headquarters Army o p.458
- **T1-082**: Jul 1 about 07:30: Buford's pickets (Gamble's brigade) spot Heth's column (13th Alabama, Archer's lead) crossing Marsh Creek about 3 miles west of town on the Chambersburg Pike; first contact
  - OR vs row: OR times for the first alarm/contact are about 08:00 (Gamble, Calef), 30 minutes later than the row's about 07:30. Heth gives no time for contact (he says it was 9 o'clock when he formed his belief). Distance (about 3 miles) agrees with the row; Marsh Creek and the 13th Alabama are not named in these passages.
  - OR evidence: OR27-1-R338 Col. William Gamble p.934; OR27-1-R374 Lieut. John H. Calef p.1030; OR27-2-R534 Lieut. Gen. Ambrose P. Hill p.607
- **T1-090**: Jul 1 about 09:00-09:55: Calef's Battery A, 2nd US (Roder right, Newman centre, Pergel left sections): right section fires the first Union gun; Archer's brigade seen advancing about 1,000 yards away at about 09:55; left section pulled back because woods within 200 yards
  - OR vs row: OR (Calef) puts the alarm and deployment at about 08:00 with the first gun soon after, earlier than the row's 09:00 (SS) and about 09:55 (forum estimate). The 1,000-yard and 09:55 observation is not in the OR; Pergel withdrew his section because woods came within 200 yards of the right of the section (OR agrees).
  - OR evidence: OR27-1-R374 Lieut. John H. Calef p.1031; OR27-1-R374 Lieut. John H. Calef p.1030
- **T1-106**: Jul 1 about 10:45: Hall's 2nd Maine Battery withdraws under pressure; one gun rescued; nearly overrun
  - OR vs row: Hall's own report has the battery opening fire at 10.45 and retiring about 25 minutes later (about 11:10), not withdrawing at about 10:45.
  - OR evidence: OR27-1-R072 Capt. James A. HaU p.359; OR27-1-R029 Maj. Gen. Abner Doubleday p.246
- **T1-122**: Jul 1 about 13:00-13:30: Baxter's and Paul's brigades (Robinson) move to the right of Wadsworth on Oak Ridge
  - OR vs row: OR has Baxter's brigade at the front at 11 a.m. and Robinson's division engaged from about noon, earlier than the row's 13:00-13:30 (Doubleday places Ewell's advance on Baxter's left at about 1.30, after the brigade was in place).
  - OR evidence: OR27-1-R052 Brig. Gen. Henry Baxter p.307; OR27-1-R043 Brig. Gen. John C. Eobinson p.290
- **T1-157**: Jul 1 about 16:00: XI Corps front collapse complete; XI Corps loses about 3,200 (about 1,400 prisoners)
  - OR vs row: OR (Howard's night estimate) gives about 3,000 for the XI Corps' Jul 1 loss, not about 3,200; the 1,400 prisoners are not stated. The final return table is unreadable in the OCR.
  - OR evidence: OR27-1-R243 Maj. Gen. OUver O. Howard p.697
- **T1-182**: Jul 1 evening on lower Culp's Hill: 123rd NY (XII Corps, 1st Division) begins breastworks on the lower summit about 10 rods (about 165 ft) in front of a heavy stone wall (soldier's letter; date Jul 1)
  - OR vs row: OR dates the First Brigade's Culp's Hill works to Jul 2 after about 9-11 a.m., not Jul 1 evening. The OR does put the stone wall about 40 paces (McDougall) to 75 yards (Ruger) behind the works, comparable to the row's 10 rods, and the wall is described as already there.
  - OR evidence: OR27-1-R274 Col. Archibald L. McDougaU p.783; OR27-1-R273 Brig. Gen. Thomas H. Euger p.~779 (778-779)
- **T1-184**: Jul 1 about 19:00 behind Cemetery Hill: Coulter's First Brigade builds breastworks and moves left to support III Corps
  - OR vs row: OR: the breastworks were built on the evening of Jul 1 (no hour), but the move left to support the III Corps is about 19:00 on Jul 2, after the brigade had been relieved about noon of Jul 2.
  - OR evidence: OR27-1-R044 Col. C!ol. Eichard Coulter p.~293 (293-294)-~294 (293-294); OR27-1-R044 Col. C!ol. Eichard Coulter p.~294 (293-294)
- **T1-187**: Jul 1 evening: Early argues against taking Culp's Hill; Gordon and Brig. Gen. Smith are sent toward the York Pike
  - OR vs row: Early's own report has him urging an immediate advance to take the hills (the opposite of arguing against), and sending Gordon to the York road after Smith's warning; his later plan was for Johnson's division to take the wooded hill on the left. The 'Early argues against' claim (W-FD) is not in the OR.
  - OR evidence: OR27-2-R470 Maj. Gen. Jubal A. Early p.469; OR27-2-R470 Maj. Gen. Jubal A. Early p.469
- **T1-192**: Jul 1 about 20:00 on Cemetery Ridge: III Corps (Birney's division) arrives at dusk
  - OR vs row: OR puts Birney's division at Gettysburg at 5.30 p.m. and the head of the III Corps in sight between about 17:00 and 18:00, about 2.5 hours before the row's 20:00 / dusk. Humphreys' division arrived much later (bivouac at 1 a.m. Jul 2).
  - OR evidence: OR27-1-R133 Maj. Gen. David B. Bimey p.482; OR27-1-R076 Maj. G«n. Winfield S. Hancock p.369
- **T1-198**: Jul 1 about 22:00: Coulter's First Brigade moves to the Emmitsburg Rd
  - OR vs row: In Coulter's sequence this 10 p.m. move follows the 7 p.m. move left to support the III Corps, which itself followed the noon relief of Jul 2, so the 10 p.m. position is Jul 2 night (relieved at daylight on the 3d), not Jul 1.
  - OR evidence: OR27-1-R044 Col. C!ol. Eichard Coulter p.~294 (293-294)
- **T1-199**: Jul 1 about 22:30: II Corps arrives on Cemetery Ridge (inferred, weak single source; the engine default is 06:00 Jul 2 per C-004)
  - OR vs row: OR: the II Corps bivouacked about 3 miles short on the night of Jul 1 and reached the field about 07:00 on Jul 2; not 22:30 Jul 1.
  - OR evidence: OR27-1-R076 Maj. G«n. Winfield S. Hancock p.369; OR27-1-R076 Maj. G«n. Winfield S. Hancock p.369
- **T1-200**: Jul 1 night on Culp's Hill: Greene's 3rd Brigade, XII Corps (60th, 78th, 102nd, 137th, 149th NY) starts its works: DMNA says the night of Jul 1-2 and largely complete by about 10:00 Jul 2; HistoryNet/HMDB say after the brigade took position at 06:00 Jul 2
  - OR vs row: OR starts the XII Corps works at about 05:00-06:00 on Jul 2 after the brigades took position; no OR passage has the Culp's Hill works beginning on the night of Jul 1-2 (DMNA version). The OR therefore matches the HistoryNet/HMDB alternative in the row.
  - OR evidence: OR27-1-R293 Brig. Gen. John "W. Geary p.825; OR27-1-R307 Brig. Gen. George S. Greene p.856
- **T1-201**: Jul 1 night on Culp's Hill and the Baltimore Pike: Williams' division builds a log breastwork on arrival (time not stated)
  - OR vs row: OR dates the log breastworks to the arrival on Culp's Hill on Jul 2 (orders about 9 a.m.); on the night of Jul 1 the division lay on its arms in rear.
  - OR evidence: OR27-1-R273 Brig. Gen. Thomas H. Euger p.~779 (778-779)
- **T1-209**: Jul 1 night: O'Neal's brigade is recalled and rests beyond the railroad on Oak Ridge
  - OR vs row: O'Neal places his brigade in the town for the night, not beyond the railroad on Oak Ridge. (Rodes says O'Neal's shattered troops assembled without order on the hill after the repulse, earlier in the evening.)
  - OR evidence: OR27-2-R523 Col. E. A. O'Neal p.593
- **T1-222**: Jul 2 about 02:00 on Cemetery Ridge: Humphreys' division, III Corps, arrives after a backtrack from Black Horse Tavern
  - OR vs row: OR time is 1 a.m. (bivouacked about a mile from Gettysburg, east of the Emmitsburg road), one hour earlier than the row's about 02:00; the row notes a midnight alternative.
  - OR evidence: OR27-1-R158 Brig. Gen. Andrew A. Hmnphreys p.531
- **T1-176**: Jul 1 about 17:30: Slocum's XII Corps begins approaching from the south; Geary takes position on Cemetery Ridge; Williams pulls back after news of the retreat (Slocum arrives about 18:00 and takes command from Hancock)
  - OR vs row: OR puts the XII Corps' advance from Two Taverns earlier than 17:30: Geary was at Two Taverns at 11 a.m. and advanced about 3 p.m.; Williams' division was already at the Hanover road hill and ordered to withdraw when the retreat was known (no hour); Slocum himself arrived between 5 and 6 p.m. (Hancock).
  - OR evidence: OR27-1-R076 Maj. G«n. Winfield S. Hancock p.368-369; OR27-1-R076 Maj. G«n. Winfield S. Hancock p.368; OR27-1-R293 Brig. Gen. John "W. Geary p.825

## AMBIGUOUS_IN_OR (6 rows): OR reports disagree with each other

- **T1-044**: Jun 30 morning (before 10:00) at Hanover: Kilpatrick's rear guard (18th PA) is struck by Stuart's vedettes and the Hanover fight opens
  - Values: Stuart gives about 10 a.m. for his head of column at Hanover; Union brigade reports (Richmond, Hammond) give about noon for the column entering town and the attack on the 18th PA rear. The row's 'before 10:00' is earlier than every OR value.
  - OR evidence: OR27-2-R565 Maj. Gen. J. E. B. Stuart p.695; OR27-1-R362 Col. Nathaniel P. Richmond p.1005; OR27-1-R363 Maj. John Hammond p.~1008 (1007-1008)
- **T1-099**: Reynolds killed at the east end of Herbst Woods; time 10:15 / 10:30 / 10:40-10:50 (row), cause rifle round vs Heth's shell
  - Values: OR times: 10.15 (Doubleday, Wadsworth) vs 11.15 (Howard) with the news reaching Howard about 11.30. The row's 10:30 and 10:40-10:50 are not in the OR. Heth attributes the death to a shell from Pegram's guns (the row notes this); no OR passage gives sharpshooter, stray round or friendly fire, or the east-end-of-woods location.
  - OR evidence: OR27-1-R029 Maj. Gen. Abner Doubleday p.245; OR27-1-R032 Brig. Gen. James S. Wadsworth p.266; OR27-1-R243 Maj. Gen. OUver O. Howard p.696; OR27-2-R549 Maj. Gen. Henry Heth p.637
- **T1-129**: Jul 1 about 14:00-14:30 on Oak Ridge: Iverson's brigade advances without scouting against Baxter's six regiments, about 800 casualties of 1,350 (row: Rodes OR says Iverson first, Wikipedia O'Neal first)
  - Values: OR disagrees on who moved first: Rodes' order to Iverson and O'Neal was simultaneous (sentence order puts Iverson first), Iverson says he advanced after the Alabama brigade began to move (O'Neal first), Ewell says both were ordered to attack. Neither the 800 of 1,350 nor the times 14:00-14:30 are in the OR (tables unreadable; Iverson's report has no casualty digits).
  - OR evidence: OR27-2-R506 Maj. Gen. R. E. Rodes p.553; OR27-2-R513 Brig. Gen. Alfred Iverson p.579
- **T1-151**: Jul 1 retirement time of the I Corps front: Wadsworth 15:45 / Doubleday about 16:00 / W-FD about 16:30 / Robinson about 17:00
  - Values: OR carries three values (15:45 Wadsworth, about 16:00 Doubleday, about 17:00 Robinson); 16:30 (W-FD) is not in the OR. Robinson's 5 p.m. concerns the order reaching his division after the other troops had started back.
  - OR evidence: OR27-1-R032 Brig. Gen. James S. Wadsworth p.266; OR27-1-R029 Maj. Gen. Abner Doubleday p.250; OR27-1-R043 Brig. Gen. John C. Eobinson p.290
- **T1-155**: Jul 1 about 16:00 on Seminary Ridge: Pender's division (Scales, Perrin, Lane, Thomas) passes through Heth's men; Scales devastated by Wainwright's ~20 guns; Perrin breaks a 50-yard gap between the 121st PA and Gamble's cavalry; Lane held up by cavalry; Thomas in reserve (row: advance 14:30 Hill / 15:30 NPS / about 16:00 W-FD)
  - Values: OR carries both an order hour implied by Hill (just after about 14:30) and Perrin's advance after 4 p.m. (consistent with the row's 16:00, not with 14:30 for the advance itself). The 50-yard gap with the 121st PA, Scales' devastation by Wainwright's guns and Lane's delay are not verified here (Perrin: Lane took position on his right to guard against cavalry).
  - OR evidence: OR27-2-R534 Lieut. Gen. Ambrose P. Hill p.607; OR27-2-R557 Col. Abner Perrin p.661
- **T1-163**: Jul 1 about 16:00 at Cemetery Hill: Hancock arrives; exchange with Howard (row values 15:00 / before 16:00 / about 16:00 / about 16:30)
  - Values: OR values: 15:00 (Hancock's report), 16:00 (Howard, Slocum), about 16:25 (Hancock's own 5.25 dispatch). The row's about 16:00 matches Howard/Slocum.
  - OR evidence: OR27-1-R076 Maj. G«n. Winfield S. Hancock p.368; OR27-1-R243 Maj. Gen. OUver O. Howard p.696; OR27-1-R076 Maj. G«n. Winfield S. Hancock p.366

## NOT_FOUND_IN_OR (16 rows; targeted searches, not exhaustive)

T1-005, T1-011, T1-013, T1-048, T1-050, T1-083, T1-091, T1-092, T1-093, T1-095, T1-100, T1-119, T1-124, T1-183, T1-188, T1-207. Each record names its searches. Notable: T1-005 (Caledonia Furnace burning), T1-013 (Sandoe), T1-083 (Lt. Jones first shot), T1-100 (John Burns), T1-124 (Lee at Herr Ridge about 13:30), T1-188 (Lee HQ at the Thompson house).

## Weak-source rows now SUPPORTED (promotion candidates for the owner/integrator)

- **T1-043** (the only T1 row with weak_source_flag true): Pettigrew's Jun 30 raid is SUPPORTED by Heth's official report (dated Sept 13, 1863): on the morning of June 30 he ordered Pettigrew to Gettysburg to "search the town for army supplies (shoes especially), and return the same day". The row note that the shoe story "first appears in 1877", and the PDF correction to show the move without a shoe subtitle, are NOT borne out by this OR passage. No hour ("first light") is in the OR.

Other rows whose tier or support may change on this evidence (not weak-flagged): T1-057 (tier "open gap", gap closed by Early's own report), T1-062 (Calef night position, forum source, now backed by Calef's report; "hollow" is not in the OR), T1-017 (tier inferred; the Mummasburg camp is stated in Early's report).

## Rows whose printed time or date is outside every OR value

| Row | Row value | OR value(s) |
|---|---|---|
| T1-007 | Jun 26 about 09:00 (arrival by train) | night of Jun 25 (Early) |
| T1-020 | Early's division leaves Gettysburg on the York Pike Jun 27 | only Gordon on the York pike; main body from Mummasburg via Hunterstown and Berlin (Early) |
| T1-024 | Jun 28 about 03:00 / dawn (Rowser's Ford) | crossing finished before midnight, night of Jun 27 (Stuart); march resumed early Jun 28 |
| T1-032 | Jun 29 (York occupied) | Jun 28 (Early) |
| T1-044 | Jun 30 before 10:00 (Hanover opens) | about 10:00 (Stuart) and about noon (Richmond, Hammond): AMBIGUOUS, row earlier than both |
| T1-046 | Jun 30 fight ends before noon | fight begins about noon and lasts about two hours (Richmond, Hammond, Kilpatrick) |
| T1-055 | II Corps at Taneytown Jun 30 | II Corps at Uniontown Jun 30, Taneytown Jul 1 morning (Hancock) |
| T1-061 | Pipe Creek Circular Jun 30 night | printed heading Taneytown, July 1, 1863 (no hour) |
| T1-082 | first contact about 07:30 | about 08:00 (Gamble, Calef) |
| T1-090 | Calef 09:00 / about 09:55 | about 08:00 (Calef) |
| T1-106 | Hall withdraws about 10:45 | Hall opened fire 10:45, retired about 25 minutes later (Hall) |
| T1-122 | Baxter/Paul to Oak Ridge 13:00-13:30 | Baxter at the front 11:00; Robinson engaged from about noon |
| T1-157 | XI Corps loss about 3,200 | about 3,000 (Howard, night estimate) |
| T1-176 | XII Corps begins approaching about 17:30 | Geary advancing about 15:00 from Two Taverns (reached 11:00); Slocum arrives 17:00-18:00 |
| T1-182 | 123rd NY works begin Jul 1 evening | Jul 2 after about 9-11 a.m. (Ruger, McDougall) |
| T1-184 | Coulter moves left to support III Corps about 19:00 Jul 1 | about 19:00 Jul 2 (Coulter) |
| T1-187 | Early argues against taking the hills | Early urges an immediate advance (Early) |
| T1-192 | III Corps (Birney) arrives about 20:00 / dusk | 5.30 p.m. (Birney); head of corps in sight 17:00-18:00 (Hancock) |
| T1-198 | Coulter on Emmitsburg Rd about 22:00 Jul 1 | about 22:00 Jul 2 (Coulter) |
| T1-199 | II Corps on Cemetery Ridge about 22:30 Jul 1 | bivouac 3 miles in rear Jul 1, arrives about 07:00 Jul 2 (Hancock) |
| T1-200 | XII Corps works start night Jul 1-2 (DMNA) | 05:00-06:00 Jul 2 (Geary, Greene) |
| T1-201 | Williams' log breastwork Jul 1 night | Jul 2 after about 09:00 (Ruger) |
| T1-209 | O'Neal rests beyond the railroad | in the town (O'Neal) |
| T1-222 | Humphreys arrives about 02:00 Jul 2 | bivouac at 1 a.m. Jul 2 (Humphreys) |

Rows SUPPORTED on day, unit and place where the row's own approximate hour is not stated in the OR are not listed here; their `note` fields say so (for example T1-004, 008, 026, 084, 109, 113, 115, 118, 125, 142, 145, 160, 165).

## Earlier verdicts reused (OR27-CLAIM-CHECKS.md)

T1-099 (a1, Reynolds' death), T1-120 (c1, XI Corps head), T1-143 and T1-163 (b1, Hancock arrival), T1-221 (d1, Meade after midnight), T1-200 (p1, p2, Culp's Hill work start), T1-204 (n2, ambulances). New passages not in the earlier checks: Norton's signal station on the college (T1-049, T1-111), Haller's Wrightsville report, Knight (T1-037), Special Orders 98 (T1-027), the Pipe Creek circular heading (T1-061).

## Tool and OCR problems met

- OCR digits: "June 20" and "0 miles" in Heth (T1-035), "13 m." for noon in Wister (T1-088, T1-117), "2sth" in Stuart (T1-024), "1.3 horses" in Calef (T1-094), "G a. m." and "13 o'clock" in Greene (T1-200), "June 2U" in Gordon (T1-031), "tAventy-five" in Stuart (T1-026), "inarch" in Rodes (T1-056). 36 records carry `ocr_uncertain: true`.
- Index segmentation: Maj. Granville O. Haller's Wrightsville report (printed pp.994-999) and Col. W. R. Aylett's report for Armistead's brigade (p.999) sit physically inside record `OR27-2-S18-02` (Lowell, Series 18 of Part 2), an appendix of documents "received too late for insertion"; both are cited under that record id. Report 467 (Ewell) and others have interpolated pages (ranges are in the evidence).
- Composite reports (Report 6 Meade with enclosures; Report 426 Lee with two reports; R044 Coulter with further regimental reports) are cited by the composite record id as the index has it.
- `or27_find.py --verify` is exact and case-sensitive on the OCR, so quotes copy OCR errors verbatim ("Beaching Dover", "sujjported", "Niaeteenth"). Searches are plain regex on OCR with no spelling tolerance: Sandoe, Lightner, Fahnestock, Herr and Kendlehart returned nothing, which may be OCR variants as well as true absence (all NOT_FOUND records say targeted, not exhaustive).
- Part 3 has no document contents list; Part 3 dispatches are cited by `OR27-3-Dnnnn` id (D0831, D0840, D0895, D0921, D0925, D0962, D0966) with index pages.
- The index lists no reports by Hood, McLaws, Law, Pickett, Kemper, Armistead (the Aylett report is inside S18-02), Pender, Pettigrew, Archer, Barlow, Coster or Sickles; row sub-claims that depend on them (brigade-level strengths, 313 captured at the brickyard, 307 lost by the 157th NY) cannot be tested. Casualty and strength tables are unreadable in the OCR.

## Findings the integrator should look at first

1. T1-007: the 26th Pennsylvania Militia arrived at Gettysburg the night of Jun 25 (Early), not about 09:00 Jun 26 by train.
2. T1-024: Stuart crossed Rowser's Ford before midnight on the night of Jun 27, not at 03:00 Jun 28.
3. T1-032 and T1-020: York was occupied Jun 28 (Gordon in the morning, Early the same day); only Gordon left Gettysburg on the York pike on Jun 27.
4. T1-082, T1-090, T1-106: Jul 1 first alarm and Calef's first gun are about 08:00 (Gamble, Calef), not 07:30 or 09:00-09:55; Hall opened fire at 10:45 and withdrew about 11:10.
5. T1-099, T1-163, T1-151: the OR carries several values; of Reynolds' row values only 10:15 appears in the OR; Hancock 3 p.m. vs 4 p.m.; I Corps retirement 15:45 vs about 16:00 vs about 17:00.
6. T1-182, T1-184, T1-198, T1-199, T1-200, T1-201: Culp's Hill works begin on the morning of Jul 2 (Geary 5 a.m., Greene about 6, Ruger after 9 a.m.), not Jul 1 night; two Coulter movements and the II Corps arrival (about 07:00 Jul 2) fall a day later than the rows say.
7. T1-192: Birney reached Gettysburg at 5.30 p.m. Jul 1 (row: about 20:00).
8. T1-043: Heth's Sept 1863 report already says "shoes especially".
9. T1-055 and T1-061: the II Corps was at Uniontown on Jun 30; the Pipe Creek Circular is printed with a Jul 1 heading.

Progress: T1 complete, 225 of 225 rows written to timeline_audit_T1.jsonl and verified (ids T1-001 to T1-225 unique; all quotes re-verified by code).
