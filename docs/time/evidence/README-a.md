# Open-anchor evidence, historian a

Written 2026-10-18 by independent historian a. The other historian's files were not read. Data: `anchors-a.json` (96 source entries, each with a quotation check). Scripts that built it are in the git-ignored `tmp/clock-hist-a/` (`build.py`, `assemble.py`).

## Result in one table

Times are Gettysburg local mean time (LMT), the standard of `data-src/time/time_anchors.json`. "Window" is the span I would defend from the sources; it is not a statistical interval.

| tick | event | anchor now | best supported | window | status | confidence |
|---|---|---|---|---|---|---|
| 28 | Reynolds killed | 10:15 | 10:15 | 10:00 to 10:45 | SUPPORTED | B |
| 75 | Lee's "if practicable" order (Turning Points: Ewell) | 17:00 | none; working value 16:45 | 16:15 to 17:30 (hard bounds 16:00 to 18:30) | UNRESOLVED | D |
| 90 | XII Corps (and Johnson) arrive | 18:00 | 17:30 for the XII Corps; Johnson about 19:00 | 16:00 to 19:00 | CONTESTED | C |
| 248 | Sickles advances III Corps | 14:30 | 15:00 | 14:00 to 16:00 | CONTESTED | C |
| 275 | 20th Maine bayonet charge | 18:00 | 18:00 | 17:15 to 19:00 | CONTESTED | C |
| 326 | Early on East Cemetery Hill (Turning Points: Night Assault) | 20:00 | 20:00 | 19:30 to 20:30 | SUPPORTED | B |
| 518 | Cannonade opens | 13:07 | about 13:00 | 12:55 to 13:15 | SUPPORTED at "about 1 p.m."; the minute 13:07 is NOT supported | A (at +-10 min) |
| 538 | Infantry step off | 15:00 | 14:45 | 14:30 to 15:00 | CONTESTED | B |

I do not claim any of these is exact. No source gives any of these events to the minute, and where two sources disagree I chose one with a stated reason (never an average) and kept the other as the end of the window.

## Time standard and what the clocks are worth

The repo module works in LMT. In 1863 there was no standard time; every report is in the writer's own (unsynchronised) army or watch time. Washington time differs from Gettysburg LMT by about 0.8 minute (my arithmetic from the longitudes, not a sourced figure), so I applied no offset. The usable error is watch error, and the reports show its size: for the same cannonade the Union reports say "about 1" and one Confederate says 1:30 and another 3:30; for the reconnaissance before Sickles's move General Birney says 12:00 in his 1863 report and 11:00 in his 1864 testimony. Hence windows of 30 to 60 minutes.

## What was read and how it was checked

Primary: *Official Records* Ser. I vol. 27 parts 1 to 3 (the repo corpus built from the 1889 Government Printing Office scans on the Internet Archive; the 1971 reprint is not used). Added from the Internet Archive, fetched read-only at one request per second: *Southern Historical Society Papers* issues (vol. 4 Dec 1877 including Early's article and Walker's letter; vol. 6 Sept 1878 with Wilcox and Oct 1878 with Oates; vol. 26, 1898, with Trimble), *Battles and Leaders* vol. 3, *Maine at Gettysburg* (1898), the *Joint Committee on the Conduct of the War* report (1865) vol. 1 (sworn testimony of Meade, Hancock, Humphreys, Birney, March 1864), Taylor's *Four Years with General Lee* (1877) and *General Lee* (1906), Long's *Memoirs* (1886). A web search was used once, for the origin of "1:07".

Quote check: every quotation (all under 15 words, OCR text) was matched by script (a) against the repo corpus passage and (b) against an independent fresh fetch of the Internet Archive OCR of the same volume, letters and digits only. Result: 95 of 96 entries matched in the OCR (`failed_quote_checks` is empty); the 96th, S518-14 (the "1:07" web-page source), was not matched against any text and is recorded as unverified. Limits of this check: it compares OCR with OCR. **No page image was opened**, so a quotation can still differ from the printed page, and I have not examined the 4,502 sentence starts the corpus page-check cannot place (`docs/historian/CORPUS.md` section 4). Pages of OR items are the corpus folios (the first-pass heuristic puts a quote on the page where its first words occur; a quote that straddles a page break may be one page off). Pages of the periodical items are estimated from OCR running heads and are marked "about" where I could not fix them.

## Anchors, one by one

**t28 Reynolds killed.** The animation shows the event at the east edge of Herbst Woods with the Iron Brigade. Wadsworth (4 July, on the spot) and Doubleday (December) both say "about 10.15"; Buford's dispatch has the infantry battle under way from 9:30 and Cutler was in action from 10. Howard's 5 p.m. dispatch says 11:15, but Howard's own report puts the news reaching him at about 11:30, so 11:15 is a later bound. Doubleday may rest on Wadsworth, so this is one family of witnesses. The repo's "dispute 10:40 to 10:50" could not be traced to any source I read and is not used. SUPPORTED, 10:15, window 10:00 to 10:45.

**t75 Lee's order to Ewell (also Turning Points "Ewell").** No primary source gives a clock time. Ewell says only that the message came "on entering the town", Lee's report gives the wording, and Taylor, who carried it, says Lee sent him while watching the Federal flight through the town. That flight ran from Howard's 4:10 order to 4:30 at Cemetery Hill (Doubleday has his corps retiring at 3:45). Johnson's lead units reached the field between about 6:30 and sunset, which caps the order at about 18:30; Hancock's 5:25 dispatch has the field quiet. Probable window 16:15 to 17:30; **16:45 is a working value, not a finding**. The "after 5 p.m." now on the anchor could not be traced. Trimble (1898) is rejected as a clock source: he puts the Federal defeat at 2:30. UNRESOLVED; keep the word "about" and a range.

**t90 XII Corps and Johnson.** Two different events share the anchor. For the XII Corps the sources run from about 4 p.m. (first brigade near the field, Crane) through Geary's 5 p.m. and Hancock's "between 5 and 6" to about 7 p.m. (Howard, Meade, both about Slocum himself) and "about sunset" (Ruger); I chose 17:30. Johnson's division arrived "about sunset" or "near dark" (three regimental reports), "no earlier than an hour before sunset" (Walker) and was in line after dark (Early): about 19:00. **Content defect for the data owner:** the card says the XII Corps "takes position on Culp's Hill" on 1 July. Greene's report puts that at about 6 a.m. on 2 July; on the evening of 1 July the corps was on the Baltimore pike and the left, and Wadsworth held the hill.

**t248 Sickles.** A sequence: Sickles announced the change between 1 and 2 (Randolph); Birney's division was on the new line and firing about 3:30; Hancock (1863) and Meade (1863) both put the move at about 3; Humphreys moved up about 4 (his report and testimony), as do Hancock's 1864 testimony and Wilcox; Longstreet has the line in place by 4. I chose 15:00 and moved the anchor 30 minutes later than the repo's midpoint. CONTESTED.

**t275 20th Maine.** Chamberlain and Rice put the brigade in position about 4, with an hour (Chamberlain) or "above half an hour" (Rice) of hard fighting before the order; Hood's regiments stepped off 4:00 to 4:30; Oates (1878) puts his regiment's rally "just about sunset". I keep 18:00 with window 17:15 to 19:00. The "5:10", "5:30", "6:30" and "after 7 p.m." readings in the repo's summaries are not in the OR text and are unverified here. CONTESTED.

**t326 Night Assault (Turning Points).** Hays "a little before 8" (his order), Early "a little before dusk", Godwin "at sunset", Howard 7 to 8, Schurz 8 to 9, Tate "fully dark" at the crest; Steinwehr's 9 p.m. is an outlier. 20:00 stands. SUPPORTED. Only the East Cemetery Hill half is checked; the Culp's Hill half is t314 (not mine).

**t518 Cannonade.** Nine reports on both sides say "about 1"; Eshleman, whose battery fired the signal, says between 1 and 2. The minute 1:07 traces to a secondary web page and is not supported by any primary source I found; display "about 1:00 p.m." Longstreet's 1863 report puts the guns after "about 2 p.m." and is contradicted by all of these (his 1886 article says "about 1 o'clock").

**t538 Step-off.** Union observers saw the line emerge after their own fire ceased at 2:30; Hancock's arithmetic (1:00 plus one hour 45) gives 2:45, Hunt, Harrow and Devereux "about 3". Confederates: Peyton (Pickett) 2:30, Jones (Pettigrew) "about 2", Davis (Heth) 3. I chose 14:45, the Confederate order at 2:30 plus formation time, which meets the Union sightings; the "about 2:00" reading fits only Jones and was not checked in the books it is attributed to.

## Consistency with the accepted anchors

t256 (Hood steps off 16:00) fits: Bryan 4:00, Bane 4:30, Wilcox "about 4". t240 (12:00) is consistent with Birney's 1863 report; his 1864 testimony says 11:00. Ordering is preserved: t72 16:20 < t75 working 16:45 < t90 17:30; t248 15:00 < t256 16:00; t518 13:00 < t538 14:45 < t551 15:35.

## What I did not verify

Pfanz, Coddington, Hessler, Desjardin, Busey, Wert, Sears, Gottfried and Hess (the repo's named "sources not yet read") were not read; they are in copyright and not on the open Internet Archive. No page images were opened. The NPS timeline pages were not fetched. HathiTrust, Perseus and ehistory.osu.edu were not touched. The "two provisional Turning Points anchors" are not listed in the brief; I took them from `docs/plan/FINAL/02` (patch DL: Ewell 175 to 75, Night Assault 340 to 326). The other Turning Points re-pointings (256, 275, 518, 538) are covered above.
