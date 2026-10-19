# Final time anchors

Adjudication of 2026-10-18 of the 33 anchors in `data-src/time/time_anchors.json` (version 2026-10-18.1, dv 3). Written by the adjudicator (second reviewer, unanimity rule) under `docs/decisions/OWNER-DECISIONS-2026-10-05.md` item 2.

**What this is not.** No human historian and not the owner has signed this release. Every anchor is state `reviewed` or `contested`, never `signed`. Nothing here claims zero errors: it says what was checked against which page, and what is still uncertain (section 6).

## 1. Method

- Inputs: historian a (`docs/time/evidence/anchors-a.json`, 96 source entries) and historian b (`anchors-b.json`, 80 source statements), who worked independently on the 8 open anchors (ticks 28, 75, 90, 248, 275, 326, 518, 538). Where the two differed by more than the larger uncertainty, or an anchor was CONTESTED or UNRESOLVED, the adjudicator went to the sources.
- The adjudicator searched the Internet Archive OCR of *Official Records* Ser. I vol. 27 pts 1-3 (GPO 1889 scans, not the 1971 reprint), the *Southern Historical Society Papers* vols 4-6, *Battles and Leaders* vol. 3, Taylor 1906 and Long 1886, and re-read every quotation the decision rests on. Sources that carry a decision are in `docs/time/evidence/anchors-final.json` (100 entries, each a verbatim quotation under 15 words, matched by script against the full OCR text after folding case and punctuation; page = printed folio found in the OCR running heads).
- The 25 anchors that neither historian examined were re-examined by the adjudicator the same way (targeted searches of the same texts). Where no first-hand source gives a clock, the anchor is labelled Estimated, not Documented.
- Time standard: Gettysburg local mean time (LMT). Witnesses wrote their own unsynchronised watch time and no conversion was applied. The reports themselves show 10 to 30 minutes of scatter between witnesses of one event (Howard 11.15 and 11.30 for one piece of news; Hancock's own report 3 p.m. and his dispatch 'an hour since' at 5.25).

## 2. Vocabulary and policy

| status | meaning |
|---|---|
| **Documented** | a first-hand primary source gives a clock time for this event or its direct precursor and the window is bounded by sources |
| **Estimated** | no source clocks the event itself; the time is inferred from sequence, neighbouring clocks or astronomy and is labelled an estimate |
| **Contested** | first-hand sources disagree by more than the window an ordinary watch error explains; the range is shown and the status is Contested |

- Two numbers per anchor. `sigma_min` is the half-width of the window the sources defend (rounded up to 5 minutes, the model's own measure; design anchors 30). `uncertainty_min` is the larger distance from the anchor time to either end of the window, rounded up to 5 minutes: a true bound, also when the window is lopsided. Because 1863 watches were not synchronised, no event anchor claims better than 25 minutes. `sigma_cap_min` is now 90 so that a Contested window is not truncated.
- **About policy.** A displayed clock whose uncertainty bound exceeds 20 minutes is prefixed with 'about' (`approx_sigma_min` 20). Between two anchors the bound is the linear interpolation of their `uncertainty_min` (and of their earlier/later distances for the earliest and latest clock) (a valid bound, because the clock itself is the linear interpolation of the anchor times); it is exported per tick in `tools/time/build/uncertainty.json` (the `sigma` column of `tests/time/golden/tick-clock.csv` is the model's half-width measure). Result: every one of the 675 ticks currently prints 'about' (the smallest bound anywhere is 25 minutes). That is the honest outcome, not an omission.
- Contested anchors carry state `contested` and status code R; `anchorRange(tick)` returns the displayed range ('between about 4:00 and 7:00 PM').

## 3. All 33 anchors

Times are LMT. 'Window' is the range the sources defend; the anchor time lies inside it. Citations are OR 27/1 or 27/2 pages unless named otherwise; all quotations and pages are in `anchors-final.json`.

| tick | event | day | final time | window | ± min | status | main citations (page) |
|---|---|---|---|---|---|---|---|
| 1 | Heth's column leaves Cashtown | July 1 | 5:00 AM | 4:45 AM to 5:30 AM | 30 | Documented | Heth p. 637 |
| 5 | Archer/Davis lead Heth's column out of Cashtown | July 1 | 5:20 AM | 5:00 AM to 5:30 AM | 30 | Estimated | none: derived (circular) |
| 12 | First shot, Lt. Marcellus Jones | July 1 | 7:30 AM | 7:10 AM to 8:00 AM | 30 | Estimated | Gamble p. 934; Buford p. 927 |
| 28 | Reynolds killed | July 1 | 10:15 AM | 10:00 AM to 10:50 AM | 35 | Documented | Wadsworth p. 266; Doubleday p. 245; Hunt p. 229; Hall p. 359; Howard p. 702 |
| 36 | Railroad Cut charge | July 1 | 11:00 AM | 10:30 AM to 11:30 AM | 30 | Estimated | Hofmann p. 288; Baxter p. 307 |
| 53 | Iverson's Pits | July 1 | 2:30 PM | 2:00 PM to 3:00 PM | 30 | Estimated | Baxter p. 307; Doubleday p. 249; Lee p. 317; Howard p. 703 |
| 57 | Barlow's Knoll overwhelmed | July 1 | 3:00 PM | 2:30 PM to 3:30 PM | 30 | Estimated | Howard p. 703; Hays p. 479; Doles p. 581 |
| 64 | Pender/Perrin hit Seminary Ridge | July 1 | 4:00 PM | 3:20 PM to 4:15 PM | 40 | Documented | Howard p. 703; Doubleday p. 250; Rowley p. 313 |
| 72 | Hancock reaches Cemetery Hill | July 1 | 4:20 PM | 3:30 PM to 4:30 PM | 50 | Documented | Hancock p. 366; Howard p. 696; Hancock p. 368; Howard p. 704 |
| 75 | Lee's 'if practicable' order | July 1 | 4:55 PM (was 5:00 PM) | 4:20 PM to 5:30 PM | 35 | Estimated | Ewell p. 445; Lee p. 318; Howard p. 704; Hancock p. 366; Ewell p. 446 |
| 90 | XII Corps/Johnson arrive | July 1 | 5:30 PM (was 6:00 PM) | 4:00 PM to 7:00 PM | 90 | Contested | Hancock p. 366; Hancock p. 368; Geary p. 825; Crane p. 819; Howard p. 704; Birney p. 482 |
| 100 | Nightfall | July 1 | 8:00 PM | 7:32 PM to 8:04 PM | 30 | Estimated | astronomy (NOAA/Meeus, recomputed) |
| 226 | Day-2 start (first light) | July 2 | 4:30 AM | 4:03 AM to 4:35 AM | 30 | Estimated | astronomy (NOAA/Meeus, recomputed) |
| 240 | Berdan's probe / Pitzer's Woods | July 2 | 12:00 PM | 11:00 AM to 12:30 PM | 60 | Documented | Berdan p. 515; Hunt p. 234; Birney p. 482 |
| 248 | Sickles's advance to Peach Orchard | July 2 | 3:00 PM (was 2:30 PM) | 2:00 PM to 4:00 PM | 60 | Contested | Birney p. 482; Randolph p. 581; Hancock p. 369; Meade p. 116; Birney p. 483; Humphreys p. 532 |
| 256 | Longstreet's assault: guns + Hood step off | July 2 | 4:00 PM | 3:45 PM to 4:30 PM | 30 | Documented | Alexander p. 429; Pendleton p. 351; Bryan p. 412; Bane p. 410 |
| 267 | Vincent reaches Little Round Top | July 2 | 4:30 PM | 4:00 PM to 4:50 PM | 30 | Estimated | Bryan p. 412; Bane p. 410; Rice p. 621; Conner p. 630; Hunt p. 236 |
| 275 | 20th Maine bayonet charge | July 2 | 6:00 PM | 5:30 PM to 7:00 PM | 60 | Contested | Bryan p. 412; Bane p. 410; Chamberlain p. 624; Woodward p. 632; Oates p. 178; Law p. 323 |
| 280 | Peach Orchard salient collapses | July 2 | 6:15 PM (was 6:30 PM) | 5:45 PM to 6:45 PM | 30 | Documented | Hunt p. 236; Wilcox p. 618; Lang p. 631 |
| 295 | Crawford counterattack | July 2 | 7:00 PM | 6:30 PM to 7:30 PM | 30 | Estimated | Lang p. 631; Crawford p. 654; Humphreys p. 533 |
| 302 | 1st Minnesota's charge | July 2 | 7:10 PM | 6:45 PM to 7:30 PM | 25 | Estimated | Lang p. 631; Humphreys p. 533 |
| 314 | Johnson attacks Culp's Hill | July 2 | 7:20 PM | 6:50 PM to 7:45 PM | 30 | Documented | Greene p. 856; Early p. 470; Geary p. 826 |
| 326 | Early attacks East Cemetery Hill | July 2 | 8:00 PM | 7:30 PM to 8:30 PM | 30 | Documented | Early p. 470; Hays p. 480; Ricketts p. 894; Meade p. 116; Schurz p. 731; Tate p. 486 |
| 340 | Battlefield falls silent | July 2 | 10:15 PM (was 10:30 PM) | 9:30 PM to 11:00 PM | 45 | Documented | Geary p. 827; Howard p. 706; Steuart p. 511 |
| 451 | XII Corps guns open on Culp's Hill | July 3 | 4:15 AM (was 4:30 AM) | 3:45 AM to 4:45 AM | 30 | Documented | Slocum p. 761; Hunt p. 237; Geary p. 828; Stannard p. 349 |
| 500 | Pickett's division arrives | July 3 | 9:00 AM | 8:30 AM to 9:30 AM | 30 | Documented | Peyton p. 385 |
| 515 | Culp's Hill fighting ends | July 3 | 10:30 AM (was 11:00 AM) | 10:00 AM to 11:15 AM | 45 | Documented | Slocum p. 761; Hunt p. 238; Geary p. 829; Ruger p. 781; Hayes p. 843 |
| 518 | Cannonade opens | July 3 | 1:00 PM (was 1:07 PM) | 12:40 PM to 1:30 PM | 30 | Documented | Alexander p. 106; Walton p. 51; Lee p. 320; Hunt p. 239; Meade p. 74; Harrow p. 420; Peyton p. 385 |
| 538 | Infantry step-off | July 3 | 3:00 PM | 2:00 PM to 3:15 PM | 60 | Contested | Lee p. 320; Harrow p. 420; Peyton p. 385; Webb p. 429; Hunt p. 239; Davis p. 651; Jones p. 643 |
| 551 | Armistead over the wall | July 3 | 3:35 PM | 3:10 PM to 4:00 PM | 25 | Estimated | Webb p. 429 |
| 556 | Assault collapses / Lee meets survivors | July 3 | 4:00 PM | 3:45 PM to 4:30 PM | 30 | Estimated | Davis p. 651 |
| 568 | Farnsworth's charge | July 3 | 5:15 PM | 4:45 PM to 5:45 PM | 30 | Documented | Preston p. 1013; Capehart p. 1018 |
| 675 | Nominal end of battle | July 3 | 8:00 PM | 7:32 PM to 8:04 PM | 30 | Estimated | astronomy (NOAA/Meeus, recomputed) |

## 4. The eight open anchors: how the disagreements were resolved

### t28 Reynolds killed: Documented

Final: **10:15 AM** (window 10:00 AM to 10:50 AM, ± 35). Old: 10:15 AM (10:15-10:50).

Historians a and b agree on 10:15. Both Union generals may be one witness family (Doubleday may follow Wadsworth), so the window runs to the sequence bound (about 10:50). Howard's 11.15 and 11.30 are when the news arrived. The 'dispute 10:40-10:50' in the old note is not found in any primary text; it only equals the sequence bound.

### t75 Lee's 'if practicable' order: Estimated

Final: **4:55 PM** (window 4:20 PM to 5:30 PM, ± 35). Old: 5:00 PM (16:30-17:30).

Historians a and b both found no clock time (a: working value 16:45, window 16:15-17:30; b: no point, window 16:30-17:30, placeholder 16:55). The adjudicator searched the Official Records (Ewell, Early, Hays, Lee) and Taylor 1906 and Long 1886 and found none either. Value 16:55 is the centre of the union window 16:20-17:30 and lies between ticks 72 (16:20) and 90 (17:30). It is an estimate and must be shown with 'about'.

### t90 XII Corps/Johnson arrive: Contested

Final: **5:30 PM** (window 4:00 PM to 7:00 PM, ± 90). Old: 6:00 PM (16:30-20:00).

Historians: a 17:30 (16:00-19:00), b 17:25 (17:00-18:00). Adjudicator: Hancock's stamped note and report (17:00-18:00) are the best evidence for the corps arriving; the 16:00 and 19:00 readings are real primary statements about the column head and about the generals' meeting, so the displayed window stays 16:00-19:00 and the status is Contested. CONTENT: the card text puts the XII Corps on Culp's Hill that evening; Geary (OR 27/1 p. 825) went there at 5 a.m. on 2 July.

### t248 Sickles's advance to Peach Orchard: Contested

Final: **3:00 PM** (window 2:00 PM to 4:00 PM, ± 60). Old: 2:30 PM (12:00-15:30).

Historians a and b agree: 15:00, window 14:00-16:00, CONTESTED (the 'start of the move' reading is 13:00-14:00). Adjudicator concurs and checked the quotations. The old 14:30 with range 12:00-15:30 is replaced.

### t275 20th Maine bayonet charge: Contested

Final: **6:00 PM** (window 5:30 PM to 7:00 PM, ± 60). Old: 6:00 PM (17:10-19:00).

Historians a and b agree: 18:00. Window: a 17:15-19:00, b 17:30-18:45. Adjudicator: lower edge 17:30 (the 17:10 and 17:15 readings have no support in the texts read); upper edge 19:00 kept because Oates is a first-hand source who places the aftermath at sunset. CONTESTED.

### t326 Early attacks East Cemetery Hill: Documented

Final: **8:00 PM** (window 7:30 PM to 8:30 PM, ± 30). Old: 8:00 PM (19:30-20:30).

Historians a and b agree. Applies to the East Cemetery Hill attack only; Johnson's Culp's Hill attack (tick 314) began about 19:00, so the Turning Points entry covering both should read 'evening, about 7 to 8:30 p.m.'.

### t518 Cannonade opens: Documented

Final: **1:00 PM** (window 12:40 PM to 1:30 PM, ± 30). Old: 1:07 PM (13:00-13:10).

Historians a and b: SUPPORTED at 'about 1 p.m.' (a 13:00, b 13:05). The minute 13:07 appears in no primary text read (only a magazine article, Welsh). Time set to 13:00. Uncertainty set to 30 minutes (half-width 25), not 10, because the witnesses' watches were not calibrated and the cluster includes Peyton 13:30 and Eshleman 'between 1 and 2'.

### t538 Infantry step-off: Contested

Final: **3:00 PM** (window 2:00 PM to 3:15 PM, ± 60). Old: 3:00 PM (14:00-15:00).

Historians: a 14:45 (14:30-15:00), b 15:00 (14:00-15:15). Adjudicator: Webb's 'At 3 o'clock the enemy's line of battle left the woods' (OR 27/1 p. 429) adds a fourth first-hand statement at 15:00, so 15:00 stands (this is the existing anchor). The Confederate order times (14:00-14:30) are inside the window. CONTESTED.

## 5. Changes to the other anchors

- **t1** Heth's column leaves Cashtown: 5:00 AM, window 04:45-05:30, Documented. Single report (OR 27/2 p. 637, written 13 Sep 1863). Window 04:45 to 05:30 because an order time is not a departure time and one witness cannot claim better than the 10 to 30 minute scatter between 1863 watches.
- **t5** Archer/Davis lead Heth's column out of Cashtown: 5:20 AM, window 05:00-05:30, Estimated. Unchanged. The brigade order inside Heth's column is not timed in any source read; the anchor only keeps the pre-07:30 slope realistic and is labelled an estimate.
- **t12** First shot, Lt. Marcellus Jones: 7:30 AM, window 07:10-08:00, Estimated. Old window (07:30 exactly, 5 min) was narrower than any source supports. Gamble (about 8:00, OR 27/1 p. 934) and Buford (between 8 and 9, p. 927) time the reports that followed the shot, so the shot was at or before 08:00. 07:30 is kept as the value in the repo's earlier evidence (HistoryNet, Wikipedia, Lt. Jones's own later account, none of them read here as a primary text); it is an estimate with a window, not a documented minute.
- **t36** Railroad Cut charge: 11:00 AM, window 10:30-11:30, Estimated. The old window (10:45 to 11:15) was narrower than the evidence: the Official Records describe the charge (Doubleday OR 27/1 p. 246) without a time. Bounds: after Reynolds fell (about 10:15) and Hall opened at 10:45; Hofmann (56th Pa., same brigade) engaged at 11:00.
- **t53** Iverson's Pits: 2:30 PM, window 14:00-15:00, Estimated. No report clocks the volley into Iverson's flank. The Union and Confederate clocks differ by up to an hour (Doubleday 1.30 vs Lee 2.30). 14:30 stays as the middle of 14:00 to 15:00.
- **t57** Barlow's Knoll overwhelmed: 3:00 PM, window 14:30-15:30, Estimated. Window widened from 14:30-15:15 to 14:30-15:30: the Confederate order (a little after 14:00, plus the advance) and the Union sightings (14:45; giving way before 15:45) bracket the collapse of Barlow's Knoll. No report clocks the moment itself.
- **t64** Pender/Perrin hit Seminary Ridge: 4:00 PM, window 15:20-16:15, Documented. Window widened from 15:45-16:15 to 15:20-16:15 to include Howard's 3.20 (OR 27/1 p. 703); 16:00 stays (two reports).
- **t72** Hancock reaches Cemetery Hill: 4:20 PM, window 15:30-16:30, Documented. Two same-day written sources (16:00 and about 16:25) agree. Hancock's later report says 3 p.m. but its next sentences describe the I and XI Corps as already retiring through the town, which Howard dates from 4.10 p.m., so the 3 p.m. conflicts with the report's own sequence and is treated as a slip (window starts 15:30). A reader who prefers 15:00 would mark this anchor Contested; the adjudicator judges the sequence argument decisive.
- **t100** Nightfall: 8:00 PM, window 19:32-20:04, Estimated. Not a historical event. Solar times recomputed with a second implementation of the NOAA/Meeus algorithm (docs/time/evidence/solar_check.py): sunset 19:32, civil dusk 20:04 or 20:05, nautical dusk 20:46. Not checked against a printed almanac.
- **t226** Day-2 start (first light): 4:30 AM, window 04:03-04:35, Estimated. Not a historical event; same independent solar check (civil dawn 04:02 to 04:03, sunrise 04:35).
- **t240** Berdan's probe / Pitzer's Woods: 12:00 PM, window 11:00-12:30, Documented. Window widened from 11:30-12:30 to 11:00-12:30 because Berdan's own report and Birney's 1864 testimony say about 11:00. Noon stays (Hunt, Birney 1863).
- **t256** Longstreet's assault: guns + Hood step off: 4:00 PM, window 15:45-16:30, Documented. Time and window unchanged. Alexander, Pendleton, Bryan and Longstreet agree on about 16:00, Bane on about 16:30; the window 15:45 to 16:30 contains all of them.
- **t267** Vincent reaches Little Round Top: 4:30 PM, window 16:00-16:50, Estimated. Window widened from 16:15-16:45 to 16:00-16:50. No report clocks the moment Vincent's brigade reached the summit; it is inferred from 'about 4' orders and the Hazlett time.
- **t280** Peach Orchard salient collapses: 6:15 PM (was 6:30 PM), window 17:45-18:45, Documented. Old anchor 18:30 (18:00-18:45) rested on a site marker; the reports centre on about 18:00-18:20. Moved to 18:15, window 17:45-18:45. Order after tick 275 (18:00) preserved.
- **t295** Crawford counterattack: 7:00 PM, window 18:30-19:30, Estimated. Time and window unchanged. The evidence is sequence only: Crawford's report says the charge was made as night was approaching, and the Peach Orchard had fallen about 18:15; no report clocks the Pennsylvania Reserves' counterattack.
- **t302** 1st Minnesota's charge: 7:10 PM, window 18:45-19:30, Estimated. Time unchanged, window 18:45 to 19:30. Hancock's report (OR 27/1) describes the charge with no clock; the bounds come from Wilcox's advance (18:00 to 18:20) and Humphreys's 'near dusk'.
- **t314** Johnson attacks Culp's Hill: 7:20 PM, window 18:50-19:45, Documented. Window widened to 18:50-19:45 so that both the Union clock (about 18:55) and Early's clock are inside. Time 19:20 kept.
- **t340** Battlefield falls silent: 10:15 PM (was 10:30 PM), window 21:30-23:00, Documented. Old anchor 22:30 (22:00-22:30) excluded Howard's 21:30 and Steuart's 23:00. Moved to 22:15, window 21:30-23:00.
- **t451** XII Corps guns open on Culp's Hill: 4:15 AM (was 4:30 AM), window 03:45-04:45, Documented. Old anchor 04:30; the reports centre on about 04:00-04:30. Moved to 04:15, window 03:45-04:45. Tick 451 is the start of the third tab.
- **t500** Pickett's division arrives: 9:00 AM, window 08:30-09:30, Documented. Time unchanged. The old upper edge 10:00 had no source in the texts read (one brigade report; the other Pickett brigades filed none), so the window is trimmed to 08:30-09:30.
- **t515** Culp's Hill fighting ends: 10:30 AM (was 11:00 AM), window 10:00-11:15, Documented. Old anchor 11:00 (10:30-12:00) was at the late edge. Moved to 10:30, window 10:00-11:15.
- **t551** Armistead over the wall: 3:35 PM, window 15:10-16:00, Estimated. Window widened to 15:10-16:00 because tick 538 is Contested. Time unchanged.
- **t556** Assault collapses / Lee meets survivors: 4:00 PM, window 15:45-16:30, Estimated. Time and window unchanged. Davis (OR 27/2 p. 651) gives about 16:00 for Heth's division reaching its morning line; Lee's meeting with the survivors is not timed in any text read, so this anchor is an estimate.
- **t568** Farnsworth's charge: 5:15 PM, window 16:45-17:45, Documented. Time unchanged, window 16:45 to 17:45. Preston (OR 27/1 p. 1013) dates the charge 5 p.m.; Capehart (p. 1018) has the force in contact at 3 p.m. and Farnsworth told to make ready, so the charge itself is the later event; the window is one hour about Preston's figure.
- **t675** Nominal end of battle: 8:00 PM, window 19:32-20:04, Estimated. Not a historical event: the nominal end of the battle, set at civil dusk so that the third day has a closing frame.

Times moved: t75 17:00 to 16:55, t90 18:00 to 17:30, t248 14:30 to 15:00, t280 18:30 to 18:15, t340 22:30 to 22:15, t451 04:30 to 04:15, t515 11:00 to 10:30, t518 13:07 to 13:00.

## 6. What remains uncertain, and what was not verified

- **No clock exists for Lee's order (t75).** The 16:55 value is the centre of an inferred window, shown with 'about'. Nobody in the texts read timed it.
- **The minute 13:07 for the cannonade (t518) is not supported** by any primary text read (only a Warfare History Network magazine article by W. E. Welsh, with no visible source). The anchor is about 13:00, ± 30 (window 12:40 to 13:30).
- **Contested anchors:** t90 (16:00 to 19:00), t248 (14:00 to 16:00), t275 (17:30 to 19:00), t538 (14:00 to 15:15). (t72 is Documented, but Hancock's own report disagrees with his dispatch and with Howard's.) A reader may prefer another point inside these windows; the adjudication only says the sources do not settle it.
- **OCR, not page images.** No page image was opened. A figure could differ from the printed page by an OCR slip; quotation checks compare OCR with OCR. Folio numbers come from OCR running heads.
- **Not read (in copyright or not found as open text):** Pfanz, Coddington, Hessler, Desjardin, Busey and Martin, Wert, Sears, Gottfried, Hess; the Bachelder papers; Sickles's own report; Oates's 1905 book; the accounts of Smith, Campbell Brown and Marshall of the delivery of Lee's message; Pickett's report (none exists). The NPS timeline pages were not used as evidence (they carry no clock, or returned 404). ehistory.osu.edu, HathiTrust and Perseus were not touched.
- **Solar times** (design anchors t100, t226, t675; sunset 19:32, civil dusk 20:04 LMT) were recomputed with a second implementation of the NOAA/Meeus algorithm and agree within one minute with the table in the file; neither was checked against a printed almanac.
- **Sources the adjudicator found only through the historians:** the entries tagged `A:` and `B:` in `evidence_refs` are the historians' quotations, which they checked against OCR; the adjudicator re-verified the ones that decide an anchor and re-quoted them in `anchors-final.json`.
- The clocks of 1863 were not synchronised, so even a unanimously documented time carries the 25 minute floor.

## 7. Content defects found on the way (reported, not patched here)

- **Tick 90 (data owner).** The chronology event says the XII Corps 'arrives on Baltimore Pike and takes position on Culp's Hill' on the evening of 1 July. Geary's division reached the line on the left at 5 p.m. and did not go to Culp's Hill until 5 a.m. on 2 July (OR 27/1 pp. 825-826; Greene p. 855: 'we took position at about 6 a.m.'); Ruger's division about 9 a.m. (p. 778). The clock fix does not repair this.
- **Turning Points 'Night Assault'** covers two attacks: Johnson on Culp's Hill (tick 314, about 19:00) and Early on East Cemetery Hill (tick 326, about 20:00). The label should read 'evening, about 7 to 8:30 p.m.'.
- **Tick 75** event text says Ewell 'considers Johnson's division not yet arrived'; Ewell's report says he was told Johnson was 'close to the town' (OR 27/2 p. 445), and Lee's report says Ewell 'decided to await Johnson' (p. 318).
- **Tick 72** text should carry the contest over Hancock's arrival (3 p.m. in his report, 4 p.m. in Howard's dispatch, 'an hour since' in his 5.25 dispatch).

## 8. Files

- `data-src/time/time_anchors.json` (+ schema): the adjudicated anchors. New fields per anchor: `uncertainty_min`, `adj_status`, `evidence_refs`, `adj_note`; document: `adjudication`; `version` 2026-10-18.1, `dv` 3.
- `docs/time/evidence/anchors-final.json`: the 100 decisive sources and, per anchor, the note and resolution.
- Generated by `node tools/time/build.mjs`: `src/lib/time/anchors*.generated.js`, `tests/time/golden/tick-clock.csv`, `tools/time/build/{ticks,uncertainty,size}.json`, the inline and IIFE modules. `tools/t0/patches-next/CLOCK.json` embeds the inline module and was regenerated by `node tools/time/build-clock-patches.mjs`.
- `data-src/environment/astro_by_tick*.json` rebuilt with `node tools/environment/build-astro.mjs` (tick to LMT changed).
- Tests: the numeric oracles that describe the 2026-09-30 specialist proposal now run on a frozen copy (`tests/time/fixtures/anchors-proposal-2026-09-30.json`, `helpers.mjs` `proposal`); `tests/time/adjudicated.test.mjs` covers the live file. A handful of pinned numbers that derive from the live anchors were updated, each with its reason in a comment.
