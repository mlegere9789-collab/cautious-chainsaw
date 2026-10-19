# Clock evidence for the open anchors: historian b

Status: evidence pass for the adjudicator. Nothing here is applied to the time model, the site or `data-src/time/time_anchors.json`. Written 2026-10-18 by historian b, working alone (the other historian's files were not read). Full data, every quote and every page reference: `anchors-b.json` in this folder.

## What is claimed, and what is not

* Every time below is a reading of a printed source, with the page. Where the sources do not give a time, the file says so (tick 75).
* No claim of "no errors" is made. Each anchor lists what remains unverified.
* Quotes (80 source statements) are under 15 words and were checked to be present in the Internet Archive OCR text. The OCR was **not** compared with page images, so an OCR slip in a figure is possible; the printed page is the Archive folio where the corpus has the claim (`cf`), otherwise the running head in the OCR (`rh`).

## Time standard

The module's standard: local mean time at Gettysburg (`tz: "LMT"` in `time_anchors.json`; EST would be about +9 min). The witnesses wrote the readings of their own uncalibrated watches; no conversion is applied. The scatter is real: Howard gives 11.15 and 11.30 for one piece of news, and Hancock's own report (OR 27/1 p. 368) says he reached Gettysburg at 3 p.m. while his 5.25 p.m. dispatch says "an hour since". Windows below include this scatter. No window is a precision claim.

## Result

| tick | event | best (LMT) | window | status | confidence | what the older file had |
|---|---|---|---|---|---|---|
| 28 | Reynolds killed | 10:15 | 10:05 to 10:50 | CONTESTED | M | 10:15, 10:15-10:50 |
| 75 | Lee's "if practicable" order reaches Ewell | none (placeholder 16:55 only if the module needs a point) | 16:30 to 17:30 | UNRESOLVED | L | 17:00, 16:30-17:30 |
| 90 | XII Corps arrives (Johnson cannot be timed) | 17:25 | 17:00 to 18:00 | CONTESTED | M | 18:00, 16:30-20:00 |
| 248 | Sickles's advance to the Peach Orchard | 15:00 (state shown); start of the move 13:00 to 14:00 | 14:00 to 16:00 | CONTESTED | M | 14:30, 12:00-15:30 |
| 275 | 20th Maine bayonet charge | 18:00 | 17:30 to 18:45 | CONTESTED | L | 18:00, 17:10-19:00 |
| 326 | Early attacks East Cemetery Hill (Turning Points, provisional) | 20:00 | 19:30 to 20:30 | SUPPORTED | M | 20:00, 19:30-20:30 |
| 518 | The cannonade opens | 13:05 | 13:00 to 13:15 | SUPPORTED | H for "about 1 pm", M for the minute | 13:07, 13:00-13:10 |
| 538 | Infantry step-off | 15:00 | 14:00 to 15:15 | CONTESTED | M | 15:00, 14:00-15:00 |

The two provisional Turning Points anchors are tick 75 (Ewell's order, same event as the open anchor) and tick 326 (Night Assault). Tick 75 stays UNRESOLVED. Tick 326 is SUPPORTED for the East Cemetery Hill charge, but the Turning Points entry covers the whole night assault, so its label should read "evening, about 7 to 8:30 pm": Johnson's attack on Culp's Hill (tick 314) began about 7 p.m.

Module check (in memory only, `tmp/clock-hist-b/slopecheck2.mjs`): with these best times, windows and the suggested sigmas applied to a copy of the anchor file, `validateAnchors` returns ok, 0 errors, 6 warnings (5 already present). New: lull 15.5 min/tick over ticks 90-100; the lull over 240-248 rises from 18.8 to 22.5. Both are warnings, far from the 60 min/tick error line.

## Per anchor

### Tick 28: Reynolds killed (CONTESTED, 10:15, window 10:05-10:50)

Animation: Iron Brigade in a charging line at the eastern edge of Herbst Woods; site label today 7:20am.

* Direct: Wadsworth (OR 27/1 p. 266, on the spot) "about 10.15 a.m."; Doubleday (p. 245) "about 10.15 a.m." (he arrived just after; may follow Wadsworth).
* Reynolds alive at about 10.15: Hunt (p. 229, ordering Hall's battery in); Hall (p. 359) opened fire at 10.45; Wainwright (p. 354) heard the first firing about 10.30 two miles away and found Reynolds dead on arrival.
* News of the death: Howard 11.15 (dispatch, p. 696) and "about 11.30" (p. 702); Schurz (p. 727), Meade (pp. 114-115) and Doubleday's 1882 book (p. 137) agree on 11.30. These are upper bounds, not the time of the shot.
* Soft lower bound: Buford's dispatch stamped 10.10 a.m. (p. 924) still has Reynolds three miles off.
* Outlier: Heth (27/2 p. 637) gives "9 o'clock" for his approach and blames Pegram's shell, which is wrong, so his clock is not used.

Choice: the stated time (two Union generals, "about 10.15") is kept as the point; the sequence evidence says it may be as late as about 10.50, so the window runs there. The older note "dispute 10:40-10:50" has no source in this pass beyond that sequence. Not verified: Pfanz, Busey and Hartwig, Coddington (copyright); no NPS page with a clock was found.

### Tick 75: Lee's order to Ewell (UNRESOLVED, window 16:30-17:30)

Animation: Gordon, Hays and Avery at the edge of the town, Hancock arriving on Cemetery Hill; site label 11:15am.

No source read gives a clock time for the message. Lee (27/2 p. 318) and Ewell (p. 445, "on entering the town") give content only; Early (pp. 469-470) and Taylor, who carried it (Four Years with General Lee, pp. 94-95), likewise. The window is an inference: the message presupposes the Union retreat through the town (Howard's order to fall back 4.10 pm and arrival on Cemetery Hill 4.30, OR 27/1 p. 704; Ewell entering the town about 4:30, Hunt in Battles and Leaders vol. 3 p. 281), and the confusion Taylor describes is over by Hancock's 5.25 p.m. dispatch ("The battle is quiet now", p. 366). So the earliest delivery is about 16:30 and the latest about 17:30. This is not a time anybody reported; no point is chosen. If the module needs a number, 16:55 is a design placeholder, to be shown with "about" and the window. The wording difference ("if practicable" in Lee, "attack this hill, if I could do so to advantage" in Ewell) is a separate matter.

Not found in open text: Capt. James P. Smith, Maj. Campbell Brown and Col. Marshall on the delivery.

### Tick 90: XII Corps (CONTESTED, 17:25, window 17:00-18:00)

Animation: all six XII Corps brigades in line on Culp's Hill; site label 12:30pm.

* Hancock's dispatch stamped 5.25 p.m. (27/1 p. 366): "Slocum is now coming on the ground". His report (pp. 368-369): Slocum arrived "between 5 and 6 o'clock", the Third Corps head shortly after.
* Geary (p. 825): in position on the left at 5 p.m.; Birney (p. 482): his two brigades reached Gettysburg at 5.30.
* Outliers: Meade (p. 115) and Howard (p. 704) say Slocum and Sickles came "about 7 p.m."; both name generals, not troops, and Meade follows Howard.
* Johnson (Confederate): Ewell had been told he was close to the town when Lee's message came; Johnson (27/2 p. 504) formed line "late on the night of July 1". Not timeable: UNRESOLVED for that half.

Choice: Hancock's stamped note plus his report, with two cross-checks, over the later "about 7" statements. Content defect for the data owner: the animation puts all of the XII Corps on Culp's Hill that evening. Geary was on the extreme left of the line (the hills south and west of the town) and moved to Culp's Hill at 5 a.m. on July 2 (pp. 825-826); Ruger's division was near Rock Creek and moved to Culp's Hill about 9 a.m. (pp. 777-778). The event is an arrival on the field. The clock change does not repair this.

### Tick 248: Sickles's advance (CONTESTED, 15:00, window 14:00-16:00)

Animation: Graham at the Peach Orchard ("advance completed"), Carr and Excelsior on the Emmitsburg Road, Ward at Devil's Den; site label 6:50am.

The movement was in stages and two events share the label. Forming the line at the Orchard: about 1-2 p.m. (Randolph, p. 581, "between 1 and 2"; Hunt p. 234, de Trobriand p. 519, about 2). Seen as an advance by officers outside the corps: Hancock (p. 369) "about 3 p.m. ... the Third Corps advanced"; Meade (p. 116) found him "in the act of advancing" at about 3 (his sworn testimony of 1864, Joint Committee vol. 1 p. 332, says he arrived a few minutes before 4). Second Division onto the Emmitsburg Road about 4 p.m. (Humphreys, p. 532); Birney opened fire "say at 3.30" (p. 483). The keyframe is the complete state, so 15:00 within 14:00 to 16:00; if the event is read as the start of the move, 13:00 to 14:00. Not verified: Sickles's own report (not in the volume), Sykes and Warren on this point.

### Tick 275: 20th Maine charge (CONTESTED, 18:00, window 17:30-18:45)

Animation: 20th Maine in a charging line, 15th Alabama in chaotic retreat; site label 9:05am.

No participant gives a clock time for the charge. Chamberlain (OR 27/1 pp. 622-625): the division moved "somewhere near 4 p.m.", "for an hour the fighting was severe", then the order to fix bayonets; Fisher's brigade came "at dusk" and the advance up Great Round Top began at 9. Rice (p. 618): the ground was secured by 8. Woodward, 83rd Pennsylvania on the right (p. 632): the enemy fell back "nearly 6 p.m." (his early times, 2.30 and 3.15, run ahead of Chamberlain's). Law (Battles and Leaders vol. 3 p. 323): his brigade attacked from "near 5". Maine at Gettysburg (1898, p. 258, secondary and unsourced for the figure): about 6:30. The charge is placed at about 18:00 by sequence and by Woodward, the nearest first-hand statement; 17:30 to 18:45 is the span the sequence allows. Not verified: Oates's 1905 book (no open text), Pullen and Desjardin (copyright). The older lower edge of 17:10 has no support in this pass.

### Tick 326: East Cemetery Hill (SUPPORTED, 20:00, window 19:30-20:30)

Animation: Hays and Avery charge Cemetery Hill "at dusk"; site label 1:10pm.

Early (27/2 p. 470) sent them in "a little before dusk" (civil dusk 20:04 LMT, sunset 19:32); Wiedrich (27/1 p. 752), Ricketts (p. 894, whose guns were overrun) and Meade (p. 116) say about 8 p.m.; Howard (p. 705) between 7 and 8 for the whole evening attack; Schurz (p. 731) between 8 and 9. Not verified: Hays's and Avery's own reports.

### Tick 518: cannonade (SUPPORTED, 13:05, window 13:00-13:15)

Animation: the event text says "at approximately 1:00pm" but the site label today is 9:30am.

Nine independent witnesses on both sides say about 1 p.m.: Lee (27/2 p. 320), Pendleton (p. 352), Cabell (p. 376), Hunt (27/1 p. 239), Harrow (p. 420), Meade's 8.35 p.m. dispatch (p. 74), Alexander ("just 1 P.M. by my watch", Military Memoirs p. 422 and SHSP vol. 4 p. 106), Walton ("a few minutes after one o'clock", SHSP vol. 5 p. 51), Longstreet (Battles and Leaders vol. 3 p. 343). Outliers: Longstreet's 1863 report (27/2 p. 359) "about 2", Peyton 1.30, Lang "nearly 2", Eshleman "between 1 and 2". The **1:07** in the older file could not be traced to a primary text and is not used; 13:05 plus or minus 10 minutes is what the evidence carries. NPS pages fetched carry no clock times.

### Tick 538: infantry step-off (CONTESTED, 15:00, window 14:00-15:15)

Animation: Garnett, Kemper, Armistead and Pettigrew's brigades in line of battle; site label 11:05am.

* About 15:00: Lee (27/2 p. 320) cannonade from about 1 "for about two hours", then the column; Hunt (27/1 p. 239) "About 3 p.m., and soon after the enemy's fire had ceased"; Harrow (p. 420) "nearly 3 p.m."; Cabell "over two hours"; Meade's dispatch "about three hours" (rounded).
* Earlier: Peyton 2.30 (27/2 p. 385); Alexander's notes at 1.25 (or 1:30 in his 1877 account) and 1.40, Longstreet beside him at "1.50 or later" (Military Memoirs pp. 423-424; SHSP vol. 4 p. 107), about 14:00; Eshleman's "about thirty minutes after the signal" is not credible against the rest.
* Later: Lang (p. 632) "nearly 4".

Choice: the Lee, Hunt, Harrow cluster (15:00). Alexander agrees with everyone on 1 p.m., so a plain watch offset does not explain his gap; his chronology is an hour shorter than every other account of the length of the cannonade, and his own accounts differ by five minutes. His figure is kept as the early edge of the window. Estimate, not evidence: a mile at quick time with halts takes 20 to 30 minutes, so a 15:00 start puts the leading brigades at the wall at about 15:20-15:30, in line with the 15:35 anchor at tick 551. Not verified: Pickett filed no report; Kemper's and Armistead's were not found.

## Method and sources

* Official Records vol. 27, parts 1-3: the Internet Archive OCR in `tmp/historian-cache` (the three items named in `historian-src/corpus/or27/manifest.json`), searched by regular expression; `time_claims.json` supplied page folios and the report dates.
* Fetched from the Internet Archive politely (a few seconds apart, honest User-Agent, no blocked host): Battles and Leaders vol. 3, Southern Historical Society Papers vols. 4, 5, 6, 33, 34, Taylor, Alexander, Doubleday 1882, the Joint Committee report 1865, Maine at Gettysburg, Dawes, Howard's Autobiography. Fox's Regimental Losses has no clock times and was not used.
* NPS pages: overview and Little Round Top carry no clock time; the East Cemetery Hill and Pickett's Charge pages returned 404; one NPS page transcribes Eshleman's report.
* Not used: HathiTrust, Perseus, ehistory.osu.edu, and the copyright secondaries (Pfanz, Coddington, Busey and Hartwig, Desjardin, Gottfried, Sears, Wert, Hessler).
* Working files (not committed): `tmp/clock-hist-b/` (`quotes.py` holds the quote checks, `gen.py` builds the JSON, `slopecheck2.mjs` the module check).

## For the adjudicator

* Tick 72 (Hancock, 16:20): his 5.25 dispatch says he arrived "an hour since", about 16:25; his later report (p. 368) says 3 p.m. and Howard's 5 p.m. dispatch (p. 696) says 4. The 16:20 anchor agrees with the dispatch.
* The unresolved cores are tick 75 (no clock exists in the sources read) and tick 275 (only sequence); show both with "about" and the window.
* Tick 90 and tick 248 each name two different moments; the file gives both readings.
