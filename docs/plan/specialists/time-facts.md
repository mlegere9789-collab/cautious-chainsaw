# time-facts - real clock times of July 1-4, 1863 vs. the site's tick/clock system

Specialist: **time-facts** | Scope: NO-BUILD plan input | Report date: 2026-09-29/30 | Files: this report, `time-facts.csv` (master real-events table, 129 rows), `time-facts-discrepancy.csv` (137 site chronology events vs. real time), `time-facts-anchors.csv` (proposed tick to time anchors), `time-facts-otherclaims.csv` (vignettes, walkthrough stops, monument tooltips, timeline markers, turning points, sandbox starts). Scripts and raw extracts: `tmp-time-facts/` (events.py, site_map.py, analyze.py, anchors.py, outputs.py, build_report.py, wiki/ raw wikitext).

Everything below was produced read-only. No site file was touched.

---

## 0. TL;DR

1. **No tick-to-clock function on the site equals real time, and there are six independent implementations in code that disagree with each other** (map clock, header date badge, monument tooltip, unit-history panel, day/night tint, static-page formulas), plus hand-authored labels in `chronology_day*.json` and hand-typed times in the bundle and pages (section 2).
2. **Size of the error.** Over the 102 site chronology events that map to a single real event, the JSON `time` label is off by a mean of **4.8 h** (median 3.9 h, max 9.5 h; only **5/102** within 30 min). The main-map clock (`getTickTime`) is off by a mean 4.8 h (median 3.6 h; **1/102** within 30 min). The 5-minute formula used by Compare/Living Ledger/Camera/lighting is off by a mean 4.5 h (**7/102** within 30 min).
3. **Structure of the error (section 6).** It is *not* a constant offset and *not* a uniform time scale. Real minus label grows from ~0 at the start of each day to **+4.9 to +6.1 h** by Day-1 mid-afternoon (t52-t90), **+6.7 to +9.5 h** on Day 2 (t243-t340), **+2.9 to +3.9 h** on Day 3 (t518-t558, the cannonade and charge; +3.7 h at t568), then relaxes back to about zero at the end of Day 3 (-0.7 h at t650, -0.1 h at t675). That is a monotone piecewise-linear "compress-then-relax" warp: the story beats were authored in narrative order and squeezed into a nominal 5 am to 8 pm window. The best single straight line per day still leaves RMS residuals of 39 / 51 / 79 min (Days 1/2/3).
4. **A 33-anchor piecewise-linear map (section 7) fixes the clock without touching placements.** In-sample: mean absolute error **21 min** (median 10 min, 86/102 within 30 min, 96/102 within 60 min); leave-one-out anchor prediction RMS 44 min. **Independent check:** the bundle already contains 30 hand-typed real clock times (walkthrough subtitles, monument tooltips, timeline markers). Against the proposed clock at the *same ticks* their median gap is **14 min (21/30 within 30 min)**; against today's map clock it is **214 min (1/30 within 30 min)**. The content authors knew the real times; the clock function is what is wrong.
5. **Not everything is fixable by relabelling.** Of the 137 chronology events: 60 plain relabels, 36 relabels whose real time is itself contested (needs historian sign-off), **4 on the wrong day** (t8, t360, t380, t420), **12 misordered** (real time out of sequence with neighbours; suggested new ticks in section 7.4), 9 composites (merge events hours apart), 6 whose own text contradicts their label (e.g. t518 text "approximately 1:00pm" at label 9:30am), 2 quoted messages I could not match to any source, 8 context/summary rows.
6. **Vignette text bugs found while checking times:** V-022 says the Mudge order came at "approximately 7:30 in the morning" (real best ~10:00-11:30 am); V-020 says Custer was a brigadier "for exactly eight days" and V-021 says Farnsworth was a general "for eight days" then "four days" (Custer's commission and Farnsworth's nomination date to June 29, so 4 days on July 3); V-015's first quoted message is actually the *second* real note.
7. **Placement data carries a related error:** Pickett's three brigades are in `Line of March` at tick 180 (July 1 evening) and `Bivouac` on Seminary Ridge from tick 400 (July 2, label 5:20 pm), while the sources read say Pickett was still at Chambersburg on the night of July 2 (SS2) and arrived on the field ~9 am July 3 (SS3). Chronology t420 and t500 tell the two different stories. Needs a placements audit (item time-facts-10).
8. **Lighting is wired to the wrong clock.** `E4()` (bundle.pretty.js:9861-9884) has a plausible dusk schedule (18-21 h) but is fed the 5:00-base hour, so the "dusk" assaults on Culp's and Cemetery Hill (t314-t330) render at 12.3-13.3 h, i.e. in full afternoon light.
9. **Research output:** 129 events (98 core + 31 supplementary), confidence H/M/L = 18/66/45; verification tags V/S/L/C = 117/5/5/2; **33 documented inter-source disagreements** (section 4); **5 anchors that need a historian decision** (t75, t90, t248, t275, t538) and 1 contested content item (Colgrove's charge time).

---

## 1. Method, source legend, and honest limits

**What I did.** (a) Read `BRIEF.md` and the audit. (b) Read the three chronology JSONs, the three vignette JSONs, `placement_schema.json`, the placement/density chunk descriptions, and every time-related routine in `bundle.pretty.js` and the static pages. (c) Researched real times from NPS-hosted Official Records reports, American Battlefield Trust (ABT) map/article pages, Wikipedia (raw wikitext via the MediaWiki API so quotes and footnote authors are verbatim), Stone Sentinels timelines, HistoryNet, and secondary timelines. (d) Built a master table with time ranges, best estimates, confidence and tags. (e) Mapped each site event to a real event, computed deltas, fitted models, proposed anchors, validated them against the site's own hand-typed times.

**Verification tags (column `Tag`).**
- **V** = page/text read this session. For Wikipedia the raw wikitext was read (verbatim; author/page footnotes as printed there). For every other website the fetch tool returns a *model-generated extraction*, so exact wording was not byte-verified; the times themselves were cross-checked against at least one other source wherever I list two or more.
- **S** = seen only in web-search result summaries (page not opened).
- **L** = recalled from the standard literature (Pfanz, Coddington, Sears, Gottfried, Hessler, Wert, Busey/Hartwig, Official Records) and **not re-verified this session**. These are the rows to hand a historian first.
- **C** = computed here (solar calculation).

**Confidence (H/M/L).** H = 3+ independent-looking sources within +-15 min or a primary OR report plus one more; M = 2 sources or a range <= 45 min; L = single source, wide range, or conflict.

**What I could NOT read (so cite-checking is still owed):** Pfanz's three volumes, Coddington, Sears, Hessler, Wert, Gottfried, Busey/Hartwig, and most Official Records reports (Buford, Hancock, Meade, Sickles, Chamberlain, Warren, Oates, Early, Rodes, Lee, Alexander). Only the NPS-hosted OR reports for Doubleday, Hall, Wainwright, Longstreet, Work, Cabell and Hodges were readable. Unreachable this session: npshistory.com (connection refused: NPS Gettysburg Seminar Papers), gdg.org (expired certificate), civilwartalk.com and warfarehistorynetwork.com (HTTP 403), and guessed NPS URLs for the Hancock/Chamberlain/Meade reports returned 404 (they may exist under other slugs). Page numbers below come only from footnotes printed in Wikipedia.

**Timekeeping caveat (applies to every row).** Standard time zones did not exist in the US in 1863; units and observers used local sun time or watches set at the last headquarters, and many accounts were written later. Sources routinely disagree by 15-30 minutes for the same event and by hours for a few (section 4). Nothing here justifies showing minute-precision to users; section 7.5 recommends "about" formatting and an approximation flag.

**Source keys.**

| Key | Source |
|---|---|
| DBL, HALL, WNW, LSTR, WORK, CAB | Official Reports hosted by NPS Gettysburg (nps.gov/gett/learn/historyculture/official-report-of-...): Doubleday, Capt. James A. Hall, Col. Charles S. Wainwright, Lt Gen James Longstreet, Col. Philip A. Work (1st Texas), Col. Henry C. Cabell (Cabell's battalion) |
| ABTm | American Battlefield Trust maps (battlefields.org/learn/maps/...): "Barlow's Knoll 2:45-4:30pm", "Defense of Seminary Ridge 4:00pm", "Devil's Den and Little Round Top 4:30-5:30pm", "Wheatfield and Peach Orchard 5:45-6:30 / 6:30-7 / 7-8pm", "Pickett's Charge 3:30-3:45 / 3:45-4:00pm", "South Cavalry Field 5:15-6:00pm" and their descriptions |
| ABTa | ABT articles: "July 1, 1863", "July 2, 1863", "July 3, 1863", James Hessler "Custer's Stand at East Cavalry Field", James R. Brann "Defense of Little Round Top" (no clock times) |
| WPd1 / WPd2 / WPCH / WPCem / WPcav / WPPC / WPmain / WPrey / WPdbl / WPbark / WPpeach / WPsick / WPhood / WPLRT | Wikipedia (raw wikitext): Battle of Gettysburg first day / second day / Culp's Hill / Cemetery Hill / third-day cavalry battles / Pickett's Charge / Battle of Gettysburg / John F. Reynolds / Abner Doubleday / William Barksdale / The Peach Orchard / Daniel Sickles / John Bell Hood / Little Round Top |
| SS1 / SS2 / SS3 | Stone Sentinels "Timeline of the Battle of Gettysburg on July 1 / 2 / 3, 1863" (gettysburg.stonesentinels.com/timeline-battle-july-N). Uncited compilation; useful as a cross-check, not authoritative |
| HNj / HNc / HNp | HistoryNet: "Who Really Fired the First Shot" (first-shot claimants); David F. Cross, *America's Civil War*, July 1999 (Little Round Top); "Just Before Pickett Charged" (cannonade and Alexander notes) |
| THJ / CWC | The History Junkie "Battle of Gettysburg Timeline"; Civil War Cycling day-1 summary (cites Bearss). Low authority |
| NPS-Cushing | NPS article "Alonzo Cushing at Gettysburg" ("Around 1 pm" cannonade) |
| SRCH | Web-search result summaries (pages not opened) |
| LIT | Literature recall, not re-verified |
| NOAA-alg | Solar position computed with the NOAA/Meeus algorithm for 39.8309 N, 77.2311 W (`tmp-time-facts/solar.py`) |

---

## 2. What the site does today (evidence)

### 2.1 The clocks in the code

| # | Where | Rule | Evidence |
|---|---|---|---|
| A | Main map clock `getTickTime` | Day 1 base **6:00 AM**, Day 2 and 3 base **4:00 AM**, +5 min/tick, correct date | `bundle.pretty.js:9371-9383` `R = (P === 1 ? 6 * 60 : 4 * 60) + H` |
| B | Map header date badge | template literal `July ${l + 2}, 1863` (renders July 3/4/5) | `bundle.pretty.js:97428` (`R = ...` inside `_F()`) |
| C | Monument tooltip `JF()` | base **5:00 AM** each day, `July ${f + 2}` | `bundle.pretty.js:100836-100843`, used at `:100889` |
| D | Unit-history panel `QF()` | base **5:00 AM**, `July ${f + 2}` | `bundle.pretty.js:100998-101007`, used at `:101078` |
| E | Day/night tint `M4()` -> `E4()` | hour = (300 + (tick-dayStart)*5)/60; tint schedule 5/6/7/8 h dawn, 16-21 h dusk | `bundle.pretty.js:9856-9884`, `C4` at `:9903` |
| F | Static pages | base **5:00 AM**: `compare.html:120-128` (`approxTimeForTick`), `living-ledger.html:135-143` (`timeForTick`), `camera.html:175-179` (`hourForTick`) | same 5-min formula, correct date |
| G | `chronology_day1-3.json` `time` labels | hand-authored; metadata claims "Tick 1 = 5:00am ... Each tick = 5 minutes" (`chronology_day1.json:5`) but labels drift from that formula: +5 min (Day 1 t12-t90), +15 min (t95-t100), 0 to -230 min (Day 2), 0 to -215 min (Day 3) | `tmp-time-facts/site_side.py` |
| H | Hand-typed real times | walkthrough stops `bundle.pretty.js:100065-100313`; monument tooltips `:100617-100835`; timeline markers `:112188-112200`; `turning-points.html:53-93`; `sandbox.html:104-106` | section 5.4 |
| I | `placement_schema.json` | `ticks_per_day.day2.real_time = "5:00am July 2 to 7:50pm July 2"` for 225 ticks (=18.75 h at 5 min/tick); `day1 = "5:00am July 1 to 12:40am July 2"`; `day3 = "5:00am July 3 to 8:05pm July 3"` (`placement_schema.json:8-10`). Chunk descriptions imply 2.7 to 5.2 min/tick (e.g. `placements_day2_ticks301_375.json`: ticks 301-375 = "11:10am to 2:35pm") | |

Other timing facts in the code: playback is `cF = 500` ms per tick at "1x" (`bundle.pretty.js:96948`, tick advance `Pe = cF / R` at `:96973`) = 2 ticks/s; the label "1x (real time)" is built at `:97429`. Day 1 tick 225 renders as "12:40 AM **July 1**" (no date roll-over in `getTickTime`).

### 2.2 Cross-section: what a user sees at key ticks

Columns: **Real** = best estimate from section 3; **JSON label** = `chronology_*.json` `time` if an event exists at that tick; **Map clock** = A; **Tooltip/panel** = C/D (note the +2 date); **Static/tint** = F/E.

| Tick | Event | Real | JSON label | Map clock (A) | Tooltip/panel (C/D) | Static/tint (F/E) |
|---|---|---|---|---|---|---|
| 12 | Buford's pickets on Knoxlyn Ridge firs | Jul 1 7:30am | 6:00am | Jul 1 6:55am | 5:55 AM, July 3 | 5:55 AM July 1 / hour 5.9 |
| 28 | REYNOLDS KILLED. Shot through the head | Jul 1 10:15am | 7:20am | Jul 1 8:15am | 7:15 AM, July 3 | 7:15 AM July 1 / hour 7.2 |
| 53 | IVERSON'S PITS. Baxter's Union brigade | Jul 1 2:30pm | 9:25am | Jul 1 10:20am | 9:20 AM, July 3 | 9:20 AM July 1 / hour 9.3 |
| 64 | Seminary Ridge fighting begins. Pender | Jul 1 4:00pm | 10:20am | Jul 1 11:15am | 10:15 AM, July 3 | 10:15 AM July 1 / hour 10.2 |
| 256 | LONGSTREET'S ASSAULT BEGINS. Alexander | Jul 2 4:00pm | 7:30am | Jul 2 6:30am | 7:30 AM, July 4 | 7:30 AM July 2 / hour 7.5 |
| 267 | Vincent's brigade arrives on Little Ro | Jul 2 4:30pm | 8:25am | Jul 2 7:25am | 8:25 AM, July 4 | 8:25 AM July 2 / hour 8.4 |
| 275 | CHAMBERLAIN'S BAYONET CHARGE. 20th Mai | Jul 2 6:15pm | 9:05am | Jul 2 8:05am | 9:05 AM, July 4 | 9:05 AM July 2 / hour 9.1 |
| 302 | 1ST MINNESOTA'S CHARGE. Cemetery Ridge | Jul 2 7:00pm | 11:20am | Jul 2 10:20am | 11:20 AM, July 4 | 11:20 AM July 2 / hour 11.3 |
| 326 | CEMETERY HILL ASSAULT. Hays's Louisian | Jul 2 8:00pm | 1:10pm | Jul 2 12:20pm | 1:20 PM, July 4 | 1:20 PM July 2 / hour 13.3 |
| 518 | THE CANNONADE BEGINS. At approximately | Jul 3 1:07pm | 9:30am | Jul 3 9:35am | 10:35 AM, July 5 | 10:35 AM July 3 / hour 10.6 |
| 538 | PICKETT'S CHARGE BEGINS. The entire Co | Jul 3 3:00pm | 11:05am | Jul 3 11:15am | 12:15 PM, July 5 | 12:15 PM July 3 / hour 12.2 |
| 551 | ARMISTEAD LEADS MEN OVER THE WALL. Arm | Jul 3 3:35pm | 12:10pm | Jul 3 12:20pm | 1:20 PM, July 5 | 1:20 PM July 3 / hour 13.3 |
| 568 | KILPATRICK'S CHARGE. Kilpatrick orders | Jul 3 5:15pm | 1:35pm | Jul 3 1:45pm | 2:45 PM, July 5 | 2:45 PM July 3 / hour 14.8 |

Reading the table: at tick 538 ("Pickett's Charge begins", real ~3:00 pm) the JSON says 11:05am, the map clock says 11:15 AM, the monument tooltip and history panel say "12:15 PM, July 5" and the lighting thinks it is 12.2 h; Compare/Living Ledger/Camera would say 12:15 PM. The walkthrough stop for the same moment says "July 3, 3:00 PM" and narrates "At 1:07 PM on July 3, 1863, Confederate artillery opened" (`bundle.pretty.js:100283`) - i.e. the app contradicts itself inside one panel.

---

## 3. Authoritative real-time table (core events)

Local 1863 clock times. `Range` is what a careful historian would accept; `Best` is the value used for fitting. `C` = confidence (H/M/L), `T` = tag (V/S/L/C). Rows are chronological. "Site ticks" lists the chronology ticks matched to the event (`time-facts.csv` has the full linkage and delta columns). Notes in **bold DISAGREEMENT** flag conflicts; all conflicts are collected again in section 4.

| ID | Date | Event | Range | Best | C | T | Sources; disagreements / notes | Site ticks |
|---|---|---|---|---|---|---|---|---|
| R002 | Jul 1 | Civil twilight begins / sunrise (computed for Gettysburg, local mean time; EST = +9 min) | 4:03a-4:44a | 4:35a | H | C | NOAA-alg; Civil twilight 4:03am LMT, sunrise 4:35am LMT (4:44am EST). Same +-2 min on July 1-4. |  |
| R003 | Jul 1 | A. P. Hill sends Heth's division (Archer, Davis lead) east down the Chambersburg Pike from Cashtown | 5:00a-5:30a | 5:00a | M | V | SS1,THJ,LIT; Heth OR says early morning; two timelines say 5am. | 1,5 |
| R004 | Jul 1 | Union vedettes on the Chambersburg Pike meet the Confederate column (13th Alabama at Marsh Creek); Heth's two brigades deploy into line | 7:00a-7:45a | 7:30a | H | V | SS1,WPd1,ABTa,THJ,HNj; Wikipedia (first day): "about 7:30 a.m., Heth's two brigades met light resistance from cavalry vedettes and deployed into line". ABT map caption: cavalry delaying action 7:00-10:00am. |  |
| R005 | Jul 1 | FIRST SHOT: Lt. Marcellus Jones, 8th Illinois Cavalry, fires borrowed carbine at Confederate officer | 7:30a | 7:30a | H | V | HNj,SS1,WPd1,ABTa,THJ,Jones; Claimants for an earlier shot: Cpl Alpheus Hodges 9th NY Cav ~5:20am ("between 5 and 6"), Pvt Freeman Whitney 17th PA Cav "prior to 6am", Frank Willett 8th NY Cav "4 o'clock" - HistoryNet finds these mistaken (Heth had barely left Cashtown by 5am). 7:30 is the accepted time for the main-column first shot; the "first shot" is also contested by artillery claims (Calef). WP footnote for the 7:30 account: Pfanz First Day pp.52-56; Martin pp.63-64 (WP adds the shot was "merely symbolic"). | 12 |
| R006 | Jul 1 | Calef's Battery A, 2nd US Artillery opens fire (first Union artillery); Pegram's Confederate battalion replies from Herr Ridge | 8:00a-9:00a | 8:30a | L | S | SRCH,LIT; No primary clock time found in NPS-hosted OR reports (Wainwright/Hall do not cover Calef). Secondary text: Confederate advance "resumed between 8 and 9am" after Calef stalled it. Needs Calef OR / Pfanz p.? check. | 17 |
| R008 | Jul 1 | Heth's line fully formed; main Confederate advance against Gamble's dismounted cavalry on McPherson Ridge | 9:00a-9:30a | 9:15a | M | V | SS1,THJ; Stone Sentinels 9:00; History Junkie 9:30. | 22 |
| R009 | Jul 1 | Reynolds reaches Seminary Ridge/McPherson Ridge, confers with Buford; I Corps ordered up at the double-quick | 9:45a-10:20a | 10:00a | M | V | SS1,WPd1,DBL; WP first day: I Corps vanguard arrived ~10:20am; SS1: signalman Jerome sights I Corps 10:00am. WP footnote (10:20 vanguard): Pfanz First Day pp.57, 59, 74; Martin pp.82-88, 96-97. | 25 |
| R012 | Jul 1 | Maj. Gen. John F. Reynolds killed near Herbst Woods (2nd Wisconsin) | 10:15a-10:50a | 10:15a | M | V | DBL,WPrey,WPd1,SS1,CWC,THJ; DISAGREEMENT: Doubleday OR "about 10.15 a.m."; Wikipedia Reynolds: "either 10:15 a.m. or 10:40-10:50 a.m." (paragraph cites Sanders, Catton, Tucker, Coddington pp.269/686, Pfanz pp.77-78); SS1/THJ 10:30; Civil War Cycling (citing Bearss) "between 10 and 11". | 28 |
| R010 | Jul 1 | Cutler's brigade deploys north of the pike; Davis's brigade engages (Cutler vs Davis) | 10:00a-10:45a | 10:30a | M | V | WPd1,SS1; WP first-day map caption: Cutler 10:00-10:45am; SS1: 10:30am. |  |
| R011 | Jul 1 | Capt. Hall's 2nd Maine Battery opens fire on Confederate battery | 10:45a | 10:45a | H | V | HALL,WNW; Hall OR: "opened upon this battery with shot and shell at 10.45 a.m."; Wainwright OR: "10.45 a.m." |  |
| R013 | Jul 1 | Iron Brigade (Meredith) counterattacks in Herbst Woods; Archer's brigade routed; Brig. Gen. James Archer captured | 10:30a-11:00a | 10:45a | M | V | WPd1,SS1; WP caption: Meredith 10:45am; SS1: 10:30am. | 29 |
| R015 | Jul 1 | Howard, on the Fahnestock roof, learns Reynolds is dead and assumes overall command | 10:30a-11:30a | 11:00a | L | V | WPd1; DISAGREEMENT quoted by Wikipedia: Martin p.198 says ~11:30, footnote: Pfanz First Day p.137 estimates 10:30. |  |
| R017 | Jul 1 | Railroad Cut: 6th Wisconsin (Dawes) with 95th NY and 84th NY (14th Brooklyn) charge; 232 prisoners | 10:45a-11:15a | 11:00a | H | V | WPd1,SS1; WP: "At around 11 a.m."; SS1: 10:45-11:00. | 36 |
| R016 | Jul 1 | Davis's brigade turns Cutler's right; 76th NY/56th PA fall back; Hall's battery withdraws (~25 minutes after opening) | 11:00a-11:15a | 11:10a | M | V | HALL; Hall OR: enemy infantry charged 25 minutes after 10:45. | 33 |
| R019 | Jul 1 | Midday lull on McPherson Ridge: Heth withdraws to Herr Ridge; front quiet until ~2:00-2:30pm | 11:30a-12:30p | 11:30a | M | V | WPd1,SS1; WP: "By 11:30 a.m. the battlefield was temporarily quiet" and Chambersburg Pike fighting "lasted until about 12:30". SS1 11:30-noon. | 38 |
| R020 | Jul 1 | XI Corps (Schurz, Barlow) arrives and deploys north of town; von Steinwehr to Cemetery Hill | 11:45a-1:00p | 12:30p | M | V | WPd1,SS1; WP: arrived "before noon"; SS1: deployed 12:30-1:00; von Steinwehr on Cemetery Hill by 2:00pm. | 50 |
| R022 | Jul 1 | Rodes deploys on Oak Hill; Confederate artillery on Oak Hill opens on XI Corps; artillery duel with XI Corps batteries | 12:30p-1:30p | 1:00p | M | V | SS1,CWC; SS1: Rodes formed 12:30-1:00 with artillery duel; Civil War Cycling "around noon" on Oak Hill. | 48,49 |
| R023 | Jul 1 | Barlow advances his division to Blocher's (Barlow's) Knoll | 1:30p-2:30p | 2:00p | L | L | ABTm,LIT; ABT map (2:45pm) begins after the advance; exact advance time needs Pfanz/OR (Barlow, Schurz). |  |
| R024 | Jul 1 | Lee arrives on the field (near Seminary Ridge) as Rodes's attack develops | 1:30p-3:00p | 2:30p | M | V | WPd1,SRCH,SS1; DISAGREEMENT: Wikipedia first day "about 2:30 p.m." (footnote below); Stone Sentinels 1:30pm. WP footnote: Pfanz First Day pp.275-76; Martin p.341. |  |
| R025 | Jul 1 | Rodes's assault: O'Neal, Iverson (Iverson's Pits - brigade shattered), Daniel; Oak Ridge | 2:00p-3:00p | 2:30p | M | V | SS1,WPd1,DBL; WP: Rodes's "original faulty attack at 2:00"; SS1: 2:30pm Oak Ridge; Doubleday OR: Schurz fell back "about 2.30 p.m.". WP footnote (2:00 start): Martin pp.386-93. |  |
| R027 | Jul 1 | Early's division: Gordon and Doles rout Barlow on Barlow's Knoll; Barlow wounded; Gordon aids him | 2:30p-3:15p | 2:50p | M | V | ABTm,WPd1,CWC; ABT map "Barlow's Knoll 2:45-4:30pm"; Civil War Cycling "around 2:30". | 56 |
| R026 | Jul 1 | Heth's renewed assault (Pettigrew v. Biddle/Meredith; Brockenbrough, Daniel v. Stone) on McPherson/Seminary Ridge | 2:30p-3:30p | 3:00p | M | V | WPd1,SS1,THJ; WP: resumed ~2:30 "when Heth's entire division engaged"; SS1: 3:00-3:30 (Pettigrew v Biddle). |  |
| R028 | Jul 1 | Baxter withdrawn from Oak Ridge; Paul's brigade replaces him | 3:00p | 3:00p | M | V | WPd1; WP: "At 3:00 p.m. he withdrew his brigade". |  |
| R030 | Jul 1 | XI Corps line collapses; retreat through town begins | 3:30p-4:15p | 3:45p | M | V | WPd1,THJ,DBL; WP: collapse "completed by 4 p.m., after a fight of less than an hour"; THJ 3:30 begins/4:15 through town. WP footnote: Sears p.217. | 58 |
| R031 | Jul 1 | Coster's brigade sacrificed covering the retreat at the Brickyard (313 of 800 captured) | 3:45p-4:45p | 4:00p | L | V | WPd1,THJ; THJ says 4:20-4:40pm; WP folds it into the collapse "by 4pm". | 60 |
| R032 | Jul 1 | Pender's division (Perrin, Scales, Lane) attacks Seminary Ridge; Perrin overlaps I Corps line | 3:45p-4:15p | 4:00p | H | V | WPd1,ABTm,DBL,CWC; Doubleday OR: "About 4 p.m. the enemy... advanced in large numbers". ABT map 4:00pm. | 64 |
| R035 | Jul 1 | Hancock arrives on Cemetery Hill and takes control of the rally | 3:30p-4:30p | 4:15p | M | V | WPd1,SS1,SRCH; WP: "after 4:00 p.m."; SS1: "around 4:00"; search summaries: 4:00-4:30. Some accounts 3:30 (LIT). | 72 |
| R033 | Jul 1 | I Corps abandons Seminary Ridge (Paul/16th Maine rear guard, Wainwright's guns); retreat through Gettysburg | 4:00p-4:45p | 4:20p | M | V | WPd1,SS1,DBL; WP: "By 4:30 p.m. the Union position was untenable"; Doubleday OR: Robinson held "from about noon until nearly 5 p.m." WP footnote (4:30 untenable): Pfanz First Day pp.311-17; Martin pp.404-26. |  |
| R037 | Jul 1 | Lee's discretionary order to Ewell to take Cemetery Hill 'if practicable' (Col. Taylor; Capt. Smith) | 4:30p-5:30p | 5:00p | L | S | SRCH,WPd1; Search summary: Taylor sent "after 5 p.m."; WP gives no clock time. | 75 |
| R036 | Jul 1 | Hancock's dispatch to Meade: 'we can fight here' | 5:00p-5:30p | 5:25p | M | V | SS1; SS1 gives 5:25pm. |  |
| R038 | Jul 1 | Johnson's division reaches the field north-east of town (too late to attack) | 4:30p-7:00p | 5:30p | L | S | SRCH,LIT; Sources say "late afternoon"/"evening"; no clock time located. Needs Pfanz Culp's Hill & Cemetery Hill / Ewell OR. | 80 |
| R039 | Jul 1 | XII Corps (Geary, then Williams) arrives; Slocum reports; Culp's Hill occupied | 5:00p-8:00p | 5:30p | M | V | SS1,SRCH; SS1: 5:30pm Slocum approached; search: Geary reached Gettysburg at 5pm; dispositions into the night. | 90 |
| R041 | Jul 1 | Sunset, July 1-3 (computed for Gettysburg, local mean time; Stone Sentinels quotes 7:29pm for July 2 and adds: moon one day past full but smoke cut its illumination) | 7:29p-7:41p | 7:32p | H | C | NOAA-alg,SS2; Sunset 7:32pm LMT / 7:41pm EST (+-1 min all three days); civil twilight ends 8:04pm LMT, nautical 8:46pm LMT. Mean-synodic lunar phase estimate (+-0.7 d): full moon ~July 1-2, 1863. No site source on the lighting model; site E4() tint schedule assumes dusk 6-9pm. |  |
| R040 | Jul 1 | Birney's III Corps division (Sickles) arrives and is posted on Cemetery Ridge | 7:00p-9:00p | 8:00p | L | V | SS1; SS1: "Dusk". Sickles left Emmitsburg after Howard's 3:10pm request (Wikipedia III Corps). |  |
| R042 | Jul 2 | Meade reaches Cemetery Hill gatehouse (Evergreen Cemetery) after leaving Taneytown; tells generals 'it is too late to leave it' | 12:00a-1:30a | 1:00a | M | V | SS1,WPd1,THJ,SRCH; Wikipedia: "after midnight"; THJ 12:15am; search summaries: left Taneytown ~midnight, arrived "about 1 a.m.". | 100 |
| R044 | Jul 2 | Lee's dawn reconnaissance (scouting party) and Lee-Longstreet argument over attack vs. flank movement | 4:30a-9:00a | 6:30a | L | V | SS2,WPd2; WP cites Pfanz Second Day pp.106-107 for early-morning scouting. |  |
| R045 | Jul 2 | Lee issues orders for Longstreet's attack on the Union left | 11:00a-12:00p | 11:00a | H | V | WPd2,SS2; WP: "Lee did not issue orders for the attack until 11:00 a.m." Eicher: preparations began "between 11 A.M. and noon"; WP discusses and rejects claims of a sunrise attack intent. WP footnote: Eicher p.522; Sears p.257. |  |
| R046 | Jul 2 | Berdan's 1st US Sharpshooters and 3rd Maine probe Pitzer's Woods; Wilcox's Alabamians detected | 11:30a-12:30p | 12:00p | M | V | WPd2,SS2; WP: "About noon, General Anderson's advancing troops were discovered by Sickles's outpost." WP footnote (Third Corps in position "until 1:00 pm"): Longstreet memoirs p.366. | 240 |
| R047 | Jul 2 | Stuart reaches Lee's headquarters (exhausted brigades arrive that evening) | 12:00p-1:30p | 12:30p | M | V | WPcav,WPmain,SS2; WP: "shortly after noon"; SS2: Noon; WP second day: "early that afternoon". | 310 |
| R048 | Jul 2 | Longstreet's approach march begins (McLaws leading, Hood following) | 12:00p-1:30p | 12:30p | M | V | SS2,WPd2; SS2: after noon; WPmain: First Corps in position ~1pm is disputed by WPd2 (4pm). | 235 |
| R050 | Jul 2 | Sickles advances III Corps to the Emmitsburg Road / Peach Orchard | 12:00p-3:30p | 2:30p | L | V | WPd2,SS2,SRCH,LIT; DISAGREEMENT: WP second day "after noon he became concerned"; SS2 "Noon"; search summary "2 pm"; site vignette V-007 "around 3:00"; Hessler/Pfanz differ. Needs historian review. | 248 |
| R051 | Jul 2 | Meade's 3 p.m. meeting of corps commanders; Meade telegraphs Halleck he awaits Lee's attack | 3:00p | 3:00p | M | V | WPsick,SS2; Wikipedia Sickles: "Soon thereafter (3 p.m.), Meade called a meeting". |  |
| R052 | Jul 2 | Meade rides to Trostle House, finds Sickles's salient; orders Warren to Little Round Top; Sykes's V Corps ordered up | 3:15p-4:00p | 3:45p | L | V | SS2; SS2: "just before 4:00 p.m." | 252 |
| R053 | Jul 2 | Warren reaches Little Round Top signal station; finds it thinly held; sends for troops | 3:30p-4:15p | 4:00p | L | V | HNc,SS2,SRCH; DISAGREEMENT: Cross (America's Civil War, July 1999) "Warren arrived at 3:30 p.m."; SS2 places Meade's order to Warren "just before 4:00". | 263 |
| R054 | Jul 2 | Longstreet's artillery (Cabell/Alexander batteries) opens on Sickles's salient | 3:45p-4:15p | 4:00p | M | V | SS2,LSTR,WPmain; WPmain says artillery "ordered to open fire at 3:00 pm"; Longstreet OR: McLaws in position "about 4 p.m."; SS2 "just before 4". WP footnote ("artillery ordered to open fire at 3:00 pm"): Longstreet memoirs p.369 - his own OR says McLaws in position "about 4 p.m.". |  |
| R055 | Jul 2 | Ewell's demonstration: Latimer's guns on Benner's Hill vs Union guns on Cemetery/Culp's Hill (two-hour duel) | 4:00p-4:15p | 4:00p | H | V | WPCH,WPd2,SS2,HALL; Wikipedia (Pfanz, Culp's Hill): Ewell began his demonstration at 4 p.m.; Hall OR: Union battery replied at 4.15 p.m. |  |
| R056 | Jul 2 | Hood's division (Law, Robertson, Benning, G.T. Anderson) steps off | 3:45p-4:30p | 4:00p | H | V | WPd2,LSTR,WORK,ABTa,WPhood; Longstreet OR: McLaws in position "about 4 p.m."; Work OR (1st Texas): "ordered forward to the attack about 4 p.m."; ABT July 2 "after 4:00 p.m.". WP footnote (4 p.m. jumping-off): Pfanz Second Day pp.158-67 as printed near the 4:30 Texas sentence. | 256 |
| R057 | Jul 2 | Devil's Den: Robertson's Texans v. Ward; Hood urges 'Fix bayonets, my brave Texans!' | 4:30p-5:30p | 4:30p | H | V | WPd2,ABTm; ABT map title "Devil's Den & Little Round Top, July 2, 4:30-5:30 pm"; WP second day 4:30pm. | 260 |
| R059 | Jul 2 | Vincent's brigade reaches Little Round Top ~10-15 minutes ahead of Law's Alabamians | 4:15p-4:45p | 4:30p | M | V | SS2,WPLRT,HNc,SRCH; WP LRT: arrived "ten minutes before the Confederates" (attack "about 4 PM"); Cross: 15 minutes; SS2 4:30. | 267 |
| R060 | Jul 2 | Law's 15th and 47th Alabama first assault the 20th Maine's left; repeated assaults follow | 4:30p-5:00p | 4:45p | M | V | SRCH,THJ,SS2; Timelines 4:30-4:50pm; OUTLIER: Cross (HistoryNet) "The Alabama troops struck at 6 p.m." | 268 |
| R062 | Jul 2 | Kershaw's brigade advances (Longstreet orders McLaws in ~5pm); first regiments near Rose farmhouse by ~5:30 | 5:00p-5:30p | 5:15p | H | V | WPd2,SS2,ABTm; WP second day: "Around 5 p.m." order; "By 5:30 p.m." first regiments near Rose farmhouse. |  |
| R064 | Jul 2 | Col. Strong Vincent mortally wounded (Rice assumes command) | 5:00p-5:50p | 5:30p | L | S | THJ,SS2,SRCH; DISAGREEMENT: THJ 5:00-5:15; SS2 5:30 block; search summary ~5:45. | 270 |
| R065 | Jul 2 | 140th New York (O'Rorke) charges down Little Round Top; O'Rorke killed; Weed and Hazlett mortally wounded | 5:15p-6:00p | 5:40p | L | V | SS2; SS2: 5:30pm block. | 271,272 |
| R067 | Jul 2 | Caldwell's II Corps division enters the Wheatfield (Cross, Kelly/Irish Brigade, Zook, Brooke); Fr. Corby's absolution | 5:45p-6:30p | 6:00p | M | V | WPd2,ABTm,LIT; WP: Caldwell "arrived at about 6 p.m."; ABT map "The Wheatfield & Peach Orchard 5:45-6:30". Corby absolution time: LIT only. | 285 |
| R069 | Jul 2 | Barksdale's Mississippians assault the Peach Orchard salient | 5:30p-6:30p | 6:00p | M | V | SS2,WPbark,ABTm,WPpeach; WP Barksdale: "about 5:30 p.m."; SS2/ABT: ~6:00pm; HMDB marker quoted on WP Peach Orchard: line broken at "6:30 p.m." | 278 |
| R066 | Jul 2 | Chamberlain's 20th Maine fixes bayonets and charges downhill (15th Alabama broken) | 5:10p-7:00p | 6:15p | L | S | SRCH,THJ,SS2,HNc; STRONGEST DISAGREEMENT: 5:10 (a participant timeline via search summary), 5:30 (SS2, THJ), ~6:30 (Desjardin-derived summary "By 6:30... fix bayonets"), ">7 p.m." (Cross, HistoryNet). Needs historian decision; do not present a minute-precise time. | 275 |
| R068 | Jul 2 | Cross killed, Zook mortally wounded, Brooke advances farthest; Semmes mortally wounded | 6:00p-6:45p | 6:15p | L | V | SS2; SS2 6:00pm block. | 290 |
| R070 | Jul 2 | Sickles wounded near Trostle farm; Birney takes III Corps (Hancock also assigned) | 6:00p-6:45p | 6:15p | L | V | SS2,LIT; SS2 6:00pm block. | 298 |
| R072 | Jul 2 | Anderson's division (Wilcox, Lang, Wright, Posey, Mahone) attacks Cemetery Ridge | 6:00p-7:00p | 6:15p | H | V | WPd2,SS2; WP: "attacked starting at about 6 p.m. with five brigades in line". WP footnote: Pfanz Battle of Gettysburg pp.34-36; Eicher p.534; Pfanz Second Day pp.351-63. |  |
| R071 | Jul 2 | Peach Orchard salient collapses (Graham wounded and captured; 141st PA ~71% loss) | 6:00p-6:45p | 6:30p | M | V | WPpeach,SS2; WP Peach Orchard quoting marker: "at 6:30 p.m., McLaws' Division broke Birney's line at the Peach Orchard". | 280 |
| R074 | Jul 2 | Bigelow's 9th Massachusetts Battery 'retires by prolonge' at Trostle farm; McGilvery's Plum Run line forms | 6:15p-7:00p | 6:40p | L | V | SS2; SS2 6:00pm block; "precious half hour". | 300 |
| R073 | Jul 2 | Wofford's brigade sweeps the Wheatfield into the Valley of Death | 6:30p-7:30p | 6:45p | M | V | WPd2,ABTm; WP: final assault reached Valley of Death "about 7:30 p.m."; ABT maps 6:30-7pm and 7-8pm. | 293 |
| R075 | Jul 2 | Wright's Georgians reach the Cemetery Ridge crest and are repulsed by Webb's 69th PA | 6:30p-7:15p | 6:50p | M | V | SS2; SS2 6:30-7:00pm. | 304 |
| R076 | Jul 2 | Crawford's Pennsylvania Reserves counterattack (Plum Run, Valley of Death) | 6:30p-7:30p | 7:00p | M | V | SS2,WPLRT; SS2 6:30-7:30pm; WP LRT: counterattack "at dusk". | 295 |
| R077 | Jul 2 | Hancock leads the 1st Minnesota's charge against Wilcox | 6:45p-7:30p | 7:00p | M | V | SS2,LIT; SS2 6:30-7:00pm block. | 302 |
| R080 | Jul 2 | Johnson's division attacks Culp's Hill (Greene's lone brigade) | 6:30p-7:30p | 7:00p | H | V | WPCH,ABTa,SS2; WP: "Around 7 pm, as dusk began to fall"; ABT: "by about 7:00 p.m."; SS2: 7:00-10:00pm. Ewell sent orders to each division commander "about six" (o-clock) (WPmain citing E. P. Alexander, Military Memoirs) - orders ~6:00, assault ~7:00; WP footnote for "after 7 p.m.": Pfanz Battle of Gettysburg p.37; Eicher p.537. | 314 |
| R078 | Jul 2 | Willard's brigade counterattacks; Willard killed; Barksdale mortally wounded | 6:45p-7:30p | 7:10p | L | V | SS2; SS2 6:30-7:00pm block. | 335 |
| R082 | Jul 2 | Early's assault on East Cemetery Hill: Hays's Louisiana Tigers, Avery's North Carolinians (Avery mortally wounded) | 7:30p-8:30p | 8:00p | H | V | WPd2,WPCem,SS2; WP second day: "at around 8 p.m." reached the guns; WP Cemetery Hill: "as dusk fell around 7:30 p.m."; SS2 7:30-10:30. WP footnote: Pfanz Battle of Gettysburg pp.40-42; Eicher pp.538-39. | 326 |
| R084 | Jul 2 | Meade's council of war at the Leister house; generals vote to stay and fight | 9:00p-11:30p | 9:30p | M | V | SS2,WPd2; SS2 "9:00 p.m."; WP "late that night"; decision reached in the second half of the meeting. | 400 |
| R086 | Jul 2 | Lee decides to renew the attack; orders Ewell to 'assail the enemy's right' at daylight and Stuart to Ewell's left | 9:00p-12:00a | 10:00p | L | V | WPd2; WP second day (evening/night). |  |
| R087 | Jul 2 | Battlefield falls silent | 10:00p-10:30p | 10:30p | M | V | WPd2; WP: "fell silent around 10:30 p.m." | 340 |
| R090 | Jul 3 | Lee rises before 3 a.m., rides to Longstreet, rejects flank move, orders assault on the center (Pickett's division called up); Longstreet: 'no 15,000 men...' | 3:00a-5:30a | 4:30a | M | V | SS3,SRCH,LIT; SS3: 4:30am Seminary Ridge; search summary: Lee "rose just before 3 o'clock". Timing of the "15,000 men" remark within the morning is not fixed. | 360 |
| R091 | Jul 3 | Union XII Corps: five batteries (26 guns) open on Steuart's brigade on lower Culp's Hill | 4:00a-4:45a | 4:30a | H | V | SS3,WPCH,ABTa; SS3 4:30am; WP "at dawn"; ABT "around dawn". Sunrise 4:35am LMT. | 451 |
| R092 | Jul 3 | Steuart's brigade attacks first ('Too late to recall' - Ewell to Lee's request to delay); Johnson's assaults begin | 4:30a-5:30a | 5:00a | M | V | WPCH,SS3; WP: "the Confederates beat them to the punch". | 452 |
| R093 | Jul 3 | Johnson's repeated assaults (three main attacks; O'Neal's and Walker's brigades join ~8:30) vs Greene/Geary/Candy/Kane | 5:00a-10:30a | 7:30a | M | V | WPCH,ABTa,SS3; ABT: "seven hours of fierce fighting"; SS3: reinforcements 8:30am. | 465 |
| R094 | Jul 3 | Pickett's division reaches Seminary Ridge from Chambersburg | 8:30a-10:00a | 9:00a | L | V | SS3; SS3 9:00am; Wert (via search) blames absence of orders to be up by daylight. | 420,500 |
| R095 | Jul 3 | Final Confederate attack on Culp's Hill (Walker, Daniel, Steuart) | 10:00a-11:00a | 10:00a | M | V | WPCH,SS3; WP Culp's Hill: "around 10 am"; SS3 10:00-11:00. | 510 |
| R096 | Jul 3 | Colgrove's charge: 2nd Massachusetts and 27th Indiana; Lt Col Mudge killed ('It is murder, but it is the order') | 10:00a-11:30a | 10:30a | L | V | WPCH,SS3; DISAGREEMENT: Wikipedia (Sears pp.366-68) puts it near the END of the morning fight ("near noon"); Stone Sentinels 6:00am; site vignette V-022 "approximately 7:30". Needs Pfanz Culp's Hill pp.310-25/Sears check. | 460 |
| R097 | Jul 3 | Culp's Hill fighting ends; Johnson withdraws | 10:30a-12:00p | 11:00a | M | V | WPmain,WPCH,SS3; WP main "around 11 a.m."; WP Culp's Hill "near noon". | 490,515 |
| R100 | Jul 3 | Two Confederate signal guns (Washington Artillery, Capt. Merritt B. Miller) - cannonade opens | 1:00p-1:10p | 1:07p | H | V | SS3,HNp,WPPC,NPS-Cushing,CAB; HistoryNet: ~1 p.m., corroborated by Meade, Hunt, Hancock, Gibbon, Webb, Harrow, Hall; SS3 gives 1:07; NPS: "Around 1 pm". | 518 |
| R101 | Jul 3 | Hunt orders guns to hold fire; Hancock countermands and keeps his corps' batteries firing | 1:07p-1:30p | 1:15p | L | V | SS3,WPPC; SS3; WP: Hunt "had to resist the strong arguments of Hancock". | 520 |
| R103 | Jul 3 | Alexander's first note to Pickett: 'If you are coming at all, come at once...' | 1:25p | 1:25p | M | V | HNp,WPPC; HistoryNet gives 1:25pm; Wikipedia gives the text. | 525 |
| R119 | Jul 3 | East Cavalry Field opens: Stuart's four brigades v. Gregg/Custer; artillery duel; first mounted charges | 1:00p-2:30p | 1:30p | M | V | WPcav,SS3; WP cavalry: "battle started in earnest at approximately 1:00 p.m."; SS3 block 1:00-3:00. | 560 |
| R104 | Jul 3 | Union artillery fire slackens (Hunt's gradual cease-fire; Alexander sees guns limbering) | 1:30p-2:00p | 1:35p | L | V | HNp,WPPC; HistoryNet: "No explicit Union cease-fire time is documented"; inferred from Alexander's notes (1:25 "not slackened" -> 1:35 "18 guns are gone"). | 532 |
| R105 | Jul 3 | Alexander's second note: 'For God's sake come quick. The 18 guns are gone.' | 1:35p-2:40p | 1:35p | L | V | HNp,SRCH; DISAGREEMENT: HistoryNet 1:35pm; one web summary (Padre Steve) says 2:40pm. Prefer 1:35-1:45 given step-off not before ~2pm. | 530 |
| R107 | Jul 3 | Confederate cannonade slackens / ends | 1:45p-3:00p | 2:30p | L | V | WPPC,HNp,CAB; DISAGREEMENT (Wikipedia note): Hess p.162 ~2:00; Sears p.415 2:30; Coddington p.502 3:00; Wert p.182 duration 45 min-2 h ("most reliable" 1 h); Eshleman 30 min; Hancock 1h45; Mallon 4h; Cabell "over two hours". |  |
| R108 | Jul 3 | Pickett-Pettigrew-Trimble infantry step off from Seminary Ridge | 2:00p-3:00p | 3:00p | M | V | ABTm,ABTa,WPmain,SS3,WPPC,LSTR; DISAGREEMENT: ABT ("stepped off in unison at about 3:00 p.m."), Wikipedia main ("Around 3 p.m."), SS3 2:30-3:00; Wikipedia Pickett's Charge "about 2:00 p.m." (citing Coddington p.502, Hess p.162, Sears p.415, Wert p.182 - which conflicts with the same article's cannonade-end note); Longstreet OR "About 2 p.m. Pickett reported ready". Consistency check: a 2:00pm step-off would put the lines at the wall by ~2:30, contradicting the 3:10-3:45 arrival given by every source read; so the step-off cannot be much earlier than ~2:30-2:45. Needs historian review. WPmain "Around 3 p.m." footnote: Coddington p.402; McPherson p.662; Eicher p.546; Trudeau p.484; Walsh p.281. | 538 |
| R120 | Jul 3 | Hampton's brigade charge; Custer's 1st Michigan counter; Hampton wounded | 2:45p-3:30p | 3:00p | H | V | ABTa-Hessler,WPmain; Hessler (ABT): "At about 3:00 p.m., approximately 2,000 Confederate horsemen under Wade Hampton emerged for the grand climax". | 563 |
| R110 | Jul 3 | Confederate lines reach the Emmitsburg Road fences; Union infantry fire begins | 3:15p-3:30p | 3:20p | M | V | SS3,ABTm; ABT map: "severe casualties from Federal artillery fire by 3:45 p.m." | 544 |
| R111 | Jul 3 | Brockenbrough's brigade dissolves under flank fire from 8th Ohio | 3:10p-3:30p | 3:20p | L | V | SS3; SS3 3:00-3:30 block. | 542 |
| R112 | Jul 3 | Stannard's Vermonters (13th/14th/16th) wheel and fire into Kemper's flank | 3:20p-3:45p | 3:30p | M | V | SS3,ABTm; ABT map 3:30-3:45pm. | 546 |
| R114 | Jul 3 | Confederates reach the wall at the Angle; 71st PA breaks; Cushing mortally wounded | 3:10p-3:45p | 3:30p | M | V | SS3,ABTm; SS3: 3:30-4:00 block; ABT map "3:30-3:45 pm"; lower bound 3:10 reflects the earlier-step-off hypothesis (2:30-2:45) and the site monument tooltips (3:00-3:20). | 549 |
| R115 | Jul 3 | Armistead leads 100-300 men over the wall, seizes guns, mortally wounded; Gibbon and Hancock wounded | 3:10p-3:45p | 3:35p | M | V | SS3,ABTm; Site monument tooltips say Cushing 3:00, Armistead 3:15, Hancock 3:20 pm (all 15-35 min early vs ABT/SS3). | 551 |
| R117 | Jul 3 | Wilcox's and Lang's brigades advance in support; 16th Vermont's second wheel; general repulse | 3:45p-4:15p | 4:00p | L | V | SS3,ABTm; ABT maps 3:45-4:00 and 4:00. | 558 |
| R118 | Jul 3 | Survivors stream back; Lee rides out ('It is all my fault'); Pickett: 'I have no division' | 3:45p-4:30p | 4:00p | L | V | SS3; SS3 4:00-6:00 aftermath block. | 556 |
| R122 | Jul 3 | Kilpatrick orders Farnsworth's charge (Slyder farm); Farnsworth killed | 5:00p-5:45p | 5:15p | M | V | ABTm,SS3,SRCH; ABT map "South Cavalry Field 5:15-6:00 pm"; SS3 5:30pm; other summary ~5pm. | 568 |
| R123 | Jul 3 | Heavy rain halts fighting on the south cavalry field (rain in the evening) | 5:30p-7:30p | 6:00p | L | V | SS3; SS3: "until heavy rains halted fighting"; "Evening: Hard rain fell". Heavy rain on July 4 is better attested (Wikipedia main). | 650 |
| R130 | Jul 4 | Imboden's wagon train of wounded begins to move (17 miles long) | 1:00p-4:00p | 4:00p | M | V | SRCH,WPmain; Search: "About 1:00 P.M. ... by 4 o'clock that afternoon he had the journey under way"; WP: "Late in the rainy afternoon". |  |

### 3.1 Supplementary events (31; used for mapping, context, or single-source)

| ID | Date | Event | Range | Best | C | T | Sources; notes | Site ticks |
|---|---|---|---|---|---|---|---|---|
| R001 | Jul 1 | Reynolds receives march orders for I Corps at Moritz's Tavern | 4:00a-4:30a | 4:00a | M | V | SS1; Context only; not on site. |  |
| R007 | Jul 1 | Wadsworth's division (Iron Brigade leading) leaves Marsh Creek/Moritz Tavern area marching north | 8:00a-9:00a | 8:00a | M | V | SS1,WNW,HALL; Wainwright OR: orders "about 8 o'clock"; Hall OR: marched 9am following advance brigade. |  |
| R014 | Jul 1 | Doubleday assumes I Corps command | 10:45a-10:50a | 10:50a | M | V | WPdbl,SRCH; Wikipedia Doubleday: "in command of the corps at 10:50 am"; search summary: learned of death ~10:45. |  |
| R018 | Jul 1 | Ewell turns Second Corps toward Gettysburg on news of Hill's engagement; Rodes/Early converge | 10:30a-11:30a | 11:00a | L | V | SS1; Single-source timeline. |  |
| R021 | Jul 1 | Pender's division and Heth's remaining brigades arrive on Herr Ridge | 12:15p-12:45p | 12:30p | M | V | WPd1; WP first-day map caption "Disposition of forces, 12:30 p.m." |  |
| R029 | Jul 1 | Wadsworth orders his division to retire (per his report) | 3:30p-4:00p | 3:45p | M | V | DBL; Doubleday OR cites Wadsworth "3:45". |  |
| R034 | Jul 1 | Dilger's Battery I, 1st Ohio: rear-guard fire in Gettysburg streets | 4:00p-5:00p | 4:30p | L | L | LIT; No time located this session. | 68 |
| R043 | Jul 2 | Union fish-hook consolidates at dawn: Geary to Culp's Hill, II Corps on Cemetery Ridge, V Corps arriving; Birney relieves Geary ~7am | 4:30a-8:00a | 6:00a | L | V | SS2,SRCH,WPd2; Composite dawn-morning movements. |  |
| R049 | Jul 2 | Longstreet's column blocked by visibility near the Little Round Top signal station; countermarch by back roads | 2:00p-4:00p | 3:00p | M | V | SS2; SS2: 2:00-4:00pm. |  |
| R058 | Jul 2 | Hood wounded by shell burst; Law assumes division command | 4:15p-5:00p | 4:30p | L | L | LIT; No source time located this session; site monument says 4:00pm. | 258 |
| R089 | Jul 2 | Custer's brigade v. Hampton at Hunterstown | 4:30p-6:00p | 4:30p | M | V | SS2; SS2 4:30pm. |  |
| R063 | Jul 2 | V Corps brigades (Tilton, Sweitzer) reach the Wheatfield; Stony Hill reinforced | 5:00p-5:30p | 5:00p | M | V | ABTm,WPd2; ABT map description: "Around 5:00 pm the V Corps brigades of Cols. Tilton and Sweitzer arrived". |  |
| R088 | Jul 2 | Sedgwick's VI Corps head of column reaches Rock Creek after a 35-mile, 19-hour march | 5:00p-5:30p | 5:00p | M | V | SS2; SS2 5:00pm. |  |
| R061 | Jul 2 | Hazlett's Battery D hauled up Little Round Top; Warren finds Weed's brigade; 140th NY ordered up | 5:00p-5:30p | 5:10p | L | V | SS2; SS2: 5:00pm. |  |
| R081 | Jul 2 | Steuart's brigade occupies the vacated XII Corps breastworks on lower Culp's Hill | 7:30p-9:30p | 8:00p | L | V | SS2; SS2 block 7:00-10:00; exact time not stated. | 320 |
| R083 | Jul 2 | Carroll's brigade counterattacks; Tigers driven from the hill; darkness ends pursuit | 8:15p-9:00p | 8:30p | L | V | SS2; SS2 narrative only. | 330 |
| R085 | Jul 2 | XII Corps returns to Culp's Hill and finds Steuart in its works; night skirmishing | 10:00p-12:00a | 10:30p | L | V | SS2; SS2. | 324 |
| R098 | Jul 3 | Stuart reaches Cress Ridge and signals Lee | 11:00a | 11:00a | L | V | WPcav; Single-source; WP cavalry article. |  |
| R099 | Jul 3 | Alexander posts the Confederate guns; final inspection by Lee/Longstreet | 10:00a-12:30p | 11:30a | L | L | LIT; Not located this session. | 380,516 |
| R102 | Jul 3 | Overshooting shells hit Meade's HQ at the Leister house (Butterfield wounded); Meade withdraws to Powers Hill | 1:10p-2:00p | 1:30p | L | V | SS3,WPPC; No minute-level time. |  |
| R106 | Jul 3 | Pickett asks Longstreet 'General, shall I advance?'; Longstreet nods | 1:40p-2:50p | 2:00p | L | V | WPPC,HNp; Time not recorded; between second note and step-off. |  |
| R121 | Jul 3 | Merritt's brigade arrives on the south cavalry field | 3:00p | 3:00p | M | V | WPcav; WP cavalry. |  |
| R109 | Jul 3 | Union artillery (McGilvery's 41 guns, Osborn, Hazard) reopens on the advancing lines | 3:00p-3:20p | 3:10p | M | V | SS3; SS3 3:00-3:30. |  |
| R113 | Jul 3 | Garnett killed; Kemper wounded | 3:25p-3:35p | 3:30p | L | V | SS3; SS3 3:00-3:30 block. | 547,550 |
| R116 | Jul 3 | Penetration contained after ~10 minutes (19th Mass., 42nd NY, Hall/Harrow) | 3:35p-3:55p | 3:45p | M | V | SS3; SS3: "breakthrough lasted approximately ten minutes". | 555 |
| R125 | Jul 3 | Meade considers and rejects a counterattack after the repulse | 4:30p-6:00p | 5:00p | L | L | LIT; Not located this session. | 572 |
| R124 | Jul 3 | Starr's 6th US Cavalry mauled near Fairfield | 6:00p | 6:00p | L | V | SS3; SS3. |  |
| R127 | Jul 3 | Lee's council with his generals (A. P. Hill's HQ): army will return to Virginia | 7:00p-9:00p | 7:30p | L | V | SS3; SS3 "7:30 p.m. Sunset". | 620 |
| R128 | Jul 4 | Lee meets Brig. Gen. Imboden and assigns him the wagon train of wounded | 12:30a-1:30a | 1:00a | M | V | SS3; SS3 "1:00 a.m.". |  |
| R129 | Jul 4 | Heavy thunderstorms; armies face each other in the rain | 6:00a-11:59p | 1:00p | M | V | WPmain,SRCH; WP: "In a heavy rain, the armies stared at one another"; search: rain flooded the Potomac at Williamsport. |  |
| R131 | Jul 4 | Lee's fighting infantry begins the retreat via the Fairfield road | 7:41p-11:59p | 9:00p | M | V | WPmain; WP (Coddington p.538): "After sunset". |  |

### 3.2 Lighting facts (for the tint and for narrative captions)

| Fact | Value | Basis |
|---|---|---|
| Civil twilight begins | ~4:03 am (local mean time) | NOAA algorithm, 39.8309 N 77.2311 W, July 1-4 within +-1 min |
| Sunrise | ~4:35 am LMT (4:44 am EST) | same |
| Solar noon | ~12:03-12:04 LMT | same |
| Sunset | ~7:32 pm LMT (7:41 pm EST). SS2 quotes 7:29 pm | same; SS2 |
| Civil twilight ends | ~8:04 pm LMT | same |
| Nautical twilight ends | ~8:46 pm LMT | same |
| Moon | mean-synodic estimate: ~full on July 1-2 (age 14.9-15.9 d, +-0.7 d); SS2: "one day past full, but smoke cut its illumination" | computed; SS2 |
| Weather | July 3: 87 F at 2 pm (Prof. Jacobs, via Sears p.383 as printed in WPPC note); heavy rain July 4 (WPmain); evening rain July 3 (SS3) | WPPC, WPmain, SS3 |

The existing tint schedule `E4()` (bundle.pretty.js:9861-9884) already has dusk at 18-21 h. Given real hours it would be only ~30-60 min late relative to civil dusk (7:32-8:04 pm) and night (8:46 pm) - acceptable, but better to drive it from computed sunrise/sunset (item time-facts-08).

---

## 4. Register of inter-source disagreements (33)

Handling rule proposed for all: keep the disagreement visible in the data (`range`, `confidence`, `sources`), choose one *display* time that is inside every credible range where possible, mark contested ones "about" / "c.", and let the historian decide only where the choice changes the story order.

| # | Topic | Readings (source) | Suggested handling |
|---|---|---|---|
| 1 | First shot (Jones) | 7:30 (Jones's own account and monument per HNj; WPd1 citing Pfanz First Day pp.52-56, Martin pp.63-64; ABTa; THJ); earlier claims 5:20 (Hodges), "prior to 6" (Whitney), "4 o'clock" (Willett) - HNj judges those mistaken; WPd1 calls the shot "merely symbolic" | Use 7:30; "about" |
| 2 | First Union artillery (Calef) | ~8:00-9:00 (SRCH); no time in Hall/Wainwright reports; no primary found | Range 8:00-9:00, L; needs Calef OR |
| 3 | Reynolds killed | 10:15 (Doubleday OR, WPd1, monument tooltip); 10:30 (SS1, THJ); "either 10:15 a.m. or 10:40-10:50 a.m." (WPrey; its paragraph cites Sanders pp.27-36, Catton pp.273-74, Tucker pp.110-11, Coddington pp.269/686, Pfanz pp.77-78 for the death details); "between 10 and 11" (CWC citing Bearss) | Anchor 10:15; show "about 10:15-10:50" |
| 4 | Howard assumes command | ~11:30 (Martin p.198) vs 10:30 (Pfanz First Day p.137) - printed in WPd1 | Range; do not anchor |
| 5 | Lee arrives | ~2:30 (WPd1) vs 1:30 (SS1) | Range 1:30-3:00 |
| 6 | Rodes's assault start | "original faulty attack at 2:00" (WPd1); 2:30 (SS1); Doubleday OR Schurz fell back "about 2.30"; ABT Barlow's Knoll map starts 2:45 | Range 2:00-3:00; anchor Iverson 2:30 |
| 7 | Early at Barlow's Knoll | ~2:30 (CWC); 2:45 (ABT map start) | Anchor 3:00 (M) |
| 8 | XI Corps collapse / retreat begins | 3:30 begins, 4:15 through town (THJ); "completed by 4 p.m." (WPd1); Wadsworth "3:45" (DBL) | Anchor 3:45 range 3:30-4:15 |
| 9 | Hancock arrives | "after 4:00" (WPd1); 4:00-4:30 (SRCH); some accounts ~3:30 (LIT) | Anchor 4:20 (M) |
| 10 | Lee's "if practicable" order | "after 5 p.m." (SRCH); SS1 places it in the block after Hancock's 5:25 dispatch; no OR time read | Range 4:30-5:30, L |
| 11 | Sickles advances | after noon (WPd2); Noon (SS2); "2 pm" (SRCH); "around 3:00" (site V-007); LIT differs | Range noon-3:30; **R anchor** t248 |
| 12 | Longstreet in position / guns open | "did not get into position until 1:00 pm" (Longstreet memoirs p.366 via WPmain); "artillery ordered to open fire at 3:00 pm" (Longstreet memoirs p.369 via WPmain) vs "4 p.m. by the time his two divisions reached their jumping off points" (WPd2 citing Pfanz Second Day), "about 4 p.m." (Longstreet OR), "just before 4" (SS2) | Use ~4:00; memoir times are postwar |
| 13 | Warren at Little Round Top | 3:30 (Cross via HNc); "shortly before 3:30" (SRCH); Meade's order "just before 4" (SS2) | Range 3:30-4:15 |
| 14 | Vincent arrives | 4:15-4:45: 4:30 (SS2, SRCH), 4:45 (THJ), "ten minutes before the Confederates" (WPLRT) | Anchor 4:30 (M) |
| 15 | First 15th Alabama assault | 4:30-4:50 (THJ, SRCH); "The Alabama troops struck at 6 p.m." (Cross via HNc) | 4:45; note outlier |
| 16 | Vincent wounded | 5:00-5:15 (THJ); 5:30 (SS2); ~5:45 (SRCH) | Range; L |
| 17 | **20th Maine bayonet charge** | 5:10 (participant timeline via SRCH); 5:30 (SS2, THJ); ~6:30 (SRCH, Desjardin-derived); "after 7 p.m." (Cross via HNc) | **Historian decision.** Anchor 6:00 flagged approximate |
| 18 | Barksdale's charge | ~5:30 (WPbark); ~6:00 (SS2, ABT); line broken "6:30" (marker quoted in WPpeach) | Range 5:30-6:30 |
| 19 | Anderson's brigades / Wright | "about 6 p.m." (WPd2) vs 6:30-7:00 (SS2) | Start 6:00, crest 6:30-7:00 |
| 20 | Cannonade opens | 1:00 (HNp, WPPC, NPS-Cushing, CAB "about 1 p.m."); 1:07 (SS3); Longstreet OR gives "About 2 p.m." for Pickett's report | 1:07 with "about 1:00" |
| 21 | Alexander's second note | 1:35 (HNp) vs 2:40 (SRCH) | Prefer 1:35-1:45 |
| 22 | Cannonade ends | ~2:00 (Hess p.162); 2:30 (Sears p.415); 3:00 (Coddington p.502); ~1 h "most reliable" (Wert p.182); over 2 h (CAB); 30 min (Eshleman); 1h45 (Hancock); 4 h (Mallon) - all printed in the WPPC note / HNp | Range 1:45-3:00 |
| 23 | **Infantry step-off** | ~3:00 (ABTa; ABTm description; WPmain "Around 3 p.m." citing Coddington p.402, McPherson p.662, Eicher p.546, Trudeau p.484, Walsh p.281); 2:30-3:00 (SS3); "about 2:00" (WPPC citing Coddington p.502, Hess p.162, Sears p.415, Wert p.182 - Wikipedia's two articles conflict); "About 2 p.m. Pickett reported ready" (LSTR) | **R anchor** t538; a 2:00 step-off contradicts the 3:10-3:45 arrival at the wall |
| 24 | The Angle | 3:30-3:45 (ABTm); 3:30-4:00 (SS3); site monuments 3:00/3:15/3:20 | Range 3:10-3:45; best 3:30-3:35 |
| 25 | **Colgrove's charge (Mudge)** | 6:00 am (SS3); ~7:30 am (site V-022); near the end of the fight, ~10-noon (Sears pp.366-68 via WPCH) | **Historian decision** (Pfanz Culp's Hill pp.310-25) |
| 26 | Culp's Hill fighting ends | ~11 am (WPmain, SS3); "near noon" (WPCH) | 11:00 |
| 27 | East Cavalry Field | started "approximately 1:00 p.m." (WPcav); "about 3:00 p.m." cavalry fight (WPmain); Hampton's charge "about 3:00" (Hessler/ABTa); Stuart at Cress Ridge ~11:00 (WPcav) | Start 1:00, climax 3:00 |
| 28 | Farnsworth's charge | ~5:00 (SRCH); 5:15 (ABTm map start); 5:30 (SS3) | 5:15 |
| 29 | Meade arrives on the field | "after midnight" (WPd1); 12:15 (THJ); ~1:00 (SRCH; SS1) | 1:00 am July 2; site text says ~11 pm (wrong) |
| 30 | Pickett's division | "night of July 2 ... all remaining elements had arrived" (WPd2); still at Chambersburg with arrival expected July 3 (SS2); arrives 9:00 am July 3 (SS3) | Both may be true (Marsh Creek vs Seminary Ridge); placements audit |
| 31 | Lee-Longstreet July 3 meeting | Lee "rose just before 3 o'clock" (SRCH); "4:30 Daybreak" (SS3) | Range 3:00-5:30 |
| 32 | Rain | evening rain July 3, "heavy rains halted [Merritt's] fighting" (SS3); heavy rain July 4 (WPmain) | Both |
| 33 | Lee's intended attack time on July 2 | "sunrise" claims rejected by Eicher ("between 11 A.M. and noon") - discussed in WPd2 | Historiographic note only |

---

## 5. Discrepancy tables

### 5.1 Summary statistics (102 matched chronology events; excludes context, wrong-day, misordered, composite and unverifiable-quote rows)

| Clock | Mean abs error | Median | RMS | Within 30 min |
|---|---|---|---|---|
| JSON `time` label | 4.79 h | 3.92 h | 5.41 h | 5/102 |
| Map clock `getTickTime` (A) | 4.82 h | 3.58 h | 5.67 h | 1/102 |
| 5-min formula (F/E) | 4.52 h | 3.54 h | 5.27 h | 7/102 |
| **Proposed 33-anchor map** | **0.36 h (21 min)** | **10 min** | **47 min** | **86/102** |

Class counts over all 137 site chronology events: RELABEL 60, RELABEL-CONTESTED 36, MISORDERED 12, COMPOSITE 9, CONTEXT 8, TEXT-VS-LABEL 6, WRONG-DAY 4, UNVERIFIED-QUOTE 2.

Class meanings. RELABEL: same event, only the clock is wrong (fixable by the anchor map). RELABEL-CONTESTED: same event but its real time is uncertain or disputed (needs sign-off). TEXT-VS-LABEL: the event's own text states the right time and contradicts its label. COMPOSITE: text merges events hours apart. MISORDERED: real time is out of sequence with neighbours (re-tick). WRONG-DAY: belongs to another day. CONTEXT: summary/back-story with no single time. UNVERIFIED-QUOTE: quoted wording not found in any source read.

### 5.2 Chronology events (all 137): site tick, site label, map clock, real time, delta

`Delta` = real best minus JSON label, in hours (positive = site clock too early). `Prop.` = clock produced by the section-7 anchors at that tick; `Resid.` = real best minus proposed, in minutes.

| Day | Tick | Site label | Map clock | Real best (range) | Delta h | Prop. | Resid. | Class | Site event (excerpt) | Real ID |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 5:00am | 6:00am | Jul 1 5:00am (5:00am-5:30am) | +0.0 | Jul 1 5:00am | +0 | RELABEL | Both armies on the march. Buford's Union cavalry occupies  | R003 |
| 1 | 3 | 5:10am | 6:10am | Jul 1 5:30am (4:30am-7:30am) | +0.3 | Jul 1 5:10am | +20 | CONTEXT | Buford dispatches pickets west and north of Gettysburg alo | custom |
| 1 | 5 | 5:20am | 6:20am | Jul 1 5:00am (5:00am-5:30am) | -0.3 | Jul 1 5:20am | -20 | RELABEL | Heth's lead brigade (Archer) passes through Cashtown and c | R003 |
| 1 | 8 | 5:35am | 6:35am | - | - | Jul 1 6:16am | - | WRONG-DAY | Heth and Hill confer. Hill insists it is only Pennsylvania | - |
| 1 | 12 | 6:00am | 6:55am | Jul 1 7:30am | +1.5 | Jul 1 7:30am | +0 | TEXT-VS-LABEL | Buford's pickets on Knoxlyn Ridge first spot Heth's advanc | R005 |
| 1 | 14 | 6:10am | 7:05am | Jul 1 8:15am (7:30am-9:00am) | +2.1 | Jul 1 7:51am | +24 | RELABEL-CONTESTED | Heth's skirmishers engage Buford's dismounted cavalry. Peg | custom |
| 1 | 17 | 6:25am | 7:20am | Jul 1 8:30am (8:00am-9:00am) | +2.1 | Jul 1 8:22am | +8 | RELABEL-CONTESTED | Calef's battery (Battery A, 2nd US Artillery) opens fire - | R006 |
| 1 | 20 | 6:40am | 7:35am | Jul 1 8:45am (8:00am-9:30am) | +2.1 | Jul 1 8:52am | -8 | RELABEL-CONTESTED | Buford sends urgent dispatch to Reynolds: Confederates adv | custom |
| 1 | 22 | 6:50am | 7:45am | Jul 1 9:15am (9:00am-9:30am) | +2.4 | Jul 1 9:13am | +2 | RELABEL | Heth deploys Archer's brigade south of Chambersburg Pike a | R008 |
| 1 | 25 | 7:05am | 8:00am | Jul 1 10:00am (9:45am-10:20am) | +2.9 | Jul 1 9:44am | +16 | RELABEL | Reynolds arrives at Seminary Ridge, confers with Buford in | R009 |
| 1 | 26 | 7:10am | 8:05am | Jul 1 10:15am (10:00am-10:30am) | +3.1 | Jul 1 9:54am | +21 | RELABEL | Wadsworth's division (I Corps lead) arrives at Seminary Ri | custom |
| 1 | 27 | 7:15am | 8:10am | Jul 1 10:20am (10:10am-10:35am) | +3.1 | Jul 1 10:05am | +15 | RELABEL | Iron Brigade double-quicks through fields toward Herbst Wo | custom |
| 1 | 28 | 7:20am | 8:15am | Jul 1 10:15am (10:15am-10:50am) | +2.9 | Jul 1 10:15am | +0 | RELABEL | REYNOLDS KILLED. Shot through the head by a sharpshooter ( | R012 |
| 1 | 29 | 7:25am | 8:20am | Jul 1 10:45am (10:30am-11:00am) | +3.3 | Jul 1 10:21am | +24 | RELABEL | Iron Brigade crashes into Archer's Confederate brigade in  | R013 |
| 1 | 30 | 7:30am | 8:25am | Jul 1 10:50am (10:40am-11:05am) | +3.3 | Jul 1 10:26am | +24 | RELABEL | Iron Brigade sweeps through Herbst Woods. Archer's brigade | custom |
| 1 | 31 | 7:35am | 8:30am | Jul 1 10:30am (10:00am-10:45am) | +2.9 | Jul 1 10:32am | -2 | RELABEL | North of the pike, Davis's Confederate brigade advances in | custom |
| 1 | 33 | 7:45am | 8:40am | Jul 1 11:10am (11:00am-11:15am) | +3.4 | Jul 1 10:43am | +27 | RELABEL | Davis's brigade overlaps Cutler's right flank. 76th NY and | R016 |
| 1 | 35 | 7:55am | 8:50am | Jul 1 11:05am (10:55am-11:15am) | +3.2 | Jul 1 10:54am | +11 | RELABEL | Davis's brigade pursues Cutler north. 2nd Mississippi and  | custom |
| 1 | 36 | 8:00am | 8:55am | Jul 1 11:00am (10:45am-11:15am) | +3.0 | Jul 1 11:00am | +0 | RELABEL | 6th Wisconsin (Dawes) detached from Iron Brigade and order | R017 |
| 1 | 37 | 8:05am | 9:00am | Jul 1 11:05am (10:55am-11:15am) | +3.0 | Jul 1 11:12am | -7 | RELABEL | 6th Wisconsin reaches the cut. Davis's Confederates trappe | custom |
| 1 | 38 | 8:10am | 9:05am | Jul 1 11:30am (11:30am-12:30pm) | +3.3 | Jul 1 11:25am | +5 | TEXT-VS-LABEL | Noon lull begins. Both sides reorganize. Confederate Heth, | R019 |
| 1 | 42 | 8:30am | 9:25am | Jul 1 12:00pm (11:30am-1:00pm) | +3.5 | Jul 1 12:14pm | -14 | RELABEL-CONTESTED | I Corps completing deployment on McPherson's Ridge and Sem | custom |
| 1 | 48 | 9:00am | 9:55am | Jul 1 1:00pm (12:30pm-1:30pm) | +4.0 | Jul 1 1:28pm | -28 | RELABEL | Rodes's Confederate division (Second Corps) arrives on Oak | R022 |
| 1 | 49 | 9:05am | 10:00am | Jul 1 1:00pm (12:30pm-1:30pm) | +3.9 | Jul 1 1:41pm | -41 | RELABEL | Confederate artillery (Jones's and Andrews's battalions) d | R022 |
| 1 | 50 | 9:10am | 10:05am | Jul 1 12:30pm (11:45am-1:00pm) | +3.3 | Jul 1 1:53pm | -83 | COMPOSITE | XI Corps (Howard) begins arriving north of Gettysburg. How | R020 |
| 1 | 52 | 9:20am | 10:15am | Jul 1 2:15pm (2:00pm-2:30pm) | +4.9 | Jul 1 2:18pm | -3 | RELABEL | Rodes attacks. O'Neal's brigade miscarries -- O'Neal does  | custom |
| 1 | 53 | 9:25am | 10:20am | Jul 1 2:30pm (2:15pm-3:00pm) | +5.1 | Jul 1 2:30pm | +0 | RELABEL | IVERSON'S PITS. Baxter's Union brigade (behind stone wall) | custom |
| 1 | 54 | 9:30am | 10:25am | Jul 1 3:00pm (2:45pm-3:30pm) | +5.5 | Jul 1 2:38pm | +22 | RELABEL-CONTESTED | Daniel's Confederate brigade attacks south of Iverson towa | custom |
| 1 | 56 | 9:40am | 10:35am | Jul 1 2:50pm (2:30pm-3:15pm) | +5.2 | Jul 1 2:52pm | -2 | RELABEL | GORDON'S FLANK ATTACK. Early's division arrives on York Ro | R027 |
| 1 | 57 | 9:45am | 10:40am | Jul 1 3:00pm (2:45pm-3:30pm) | +5.2 | Jul 1 3:00pm | +0 | RELABEL | Barlow's Knoll overwhelmed. Barlow severely wounded -- lef | custom |
| 1 | 58 | 9:50am | 10:45am | Jul 1 3:45pm (3:30pm-4:15pm) | +5.9 | Jul 1 3:09pm | +36 | RELABEL | XI Corps collapses. Barlow's and Schurz's divisions broken | R030 |
| 1 | 60 | 10:00am | 10:55am | Jul 1 4:00pm (3:45pm-4:45pm) | +6.0 | Jul 1 3:26pm | +34 | RELABEL-CONTESTED | Coster's brigade caught from three sides in brickyard nort | R031 |
| 1 | 62 | 10:10am | 11:05am | Jul 1 4:15pm (3:45pm-4:45pm) | +6.1 | Jul 1 3:43pm | +32 | RELABEL-CONTESTED | I Corps right flank (Robinson) crumbling under Oak Hill ar | custom |
| 1 | 64 | 10:20am | 11:15am | Jul 1 4:00pm (3:45pm-4:15pm) | +5.7 | Jul 1 4:00pm | +0 | RELABEL | Seminary Ridge fighting begins. Pender's Confederate divis | R032 |
| 1 | 66 | 10:30am | 11:25am | Jul 1 5:00pm (4:30pm-6:00pm) | +6.5 | Jul 1 4:05pm | +55 | CONTEXT | Schimmelfennig cut off during retreat -- hides in a pigpen | custom |
| 1 | 68 | 10:40am | 11:35am | Jul 1 4:30pm (4:00pm-5:00pm) | +5.8 | Jul 1 4:10pm | +20 | RELABEL-CONTESTED | Dilger's battery (Battery I, 1st Ohio) fights rearguard ac | R034 |
| 1 | 72 | 11:00am | 11:55am | Jul 1 4:15pm (3:30pm-4:30pm) | +5.2 | Jul 1 4:20pm | -5 | RELABEL | Union forces rally on Cemetery Hill. Howard had wisely pos | R035 |
| 1 | 75 | 11:15am | 12:10pm | Jul 1 5:00pm (4:30pm-5:30pm) | +5.8 | Jul 1 5:00pm | +0 | RELABEL-CONTESTED | LEE'S DISCRETIONARY ORDER TO EWELL: 'take Cemetery Hill if | R037 |
| 1 | 80 | 11:40am | 12:35pm | Jul 1 5:30pm (4:30pm-7:00pm) | +5.8 | Jul 1 5:20pm | +10 | RELABEL-CONTESTED | Johnson's Confederate division arrives on the Hanover Road | R038 |
| 1 | 90 | 12:30pm | 1:25pm | Jul 1 5:30pm (5:00pm-8:00pm) | +5.0 | Jul 1 6:00pm | -30 | RELABEL-CONTESTED | XII Corps (Williams) arrives on Baltimore Pike and takes p | R039 |
| 1 | 95 | 1:05pm | 1:50pm | - | - | Jul 1 7:00pm | - | COMPOSITE | Meade replaces Doubleday with Newton to command I Corps. I | - |
| 1 | 100 | 1:30pm | 2:15pm | Jul 2 1:00am (12:00am-1:30am) | +11.5 | Jul 1 8:00pm | +300 | COMPOSITE | By nightfall the Union Army holds the fish-hook line: Ceme | R042 |
| 2 | 226 | 5:00am July 2 | 4:00am | Jul 2 6:30am (4:30am-11:00am) | +1.5 | Jul 2 4:30am | +120 | COMPOSITE | Both armies consolidate overnight positions. Lee reconnoit | custom |
| 2 | 230 | 5:20am | 4:20am | Jul 2 12:00pm (8:00am-2:00pm) | +6.7 | Jul 2 6:39am | +321 | RELABEL-CONTESTED | Sickles examines his assigned position on lower Cemetery R | custom |
| 2 | 235 | 5:45am | 4:45am | Jul 2 12:30pm (12:00pm-1:30pm) | +6.8 | Jul 2 9:19am | +191 | RELABEL-CONTESTED | Longstreet's corps begins moving south for the flanking ma | R048 |
| 2 | 240 | 6:10am | 5:10am | Jul 2 12:00pm (11:30am-12:30pm) | +5.8 | Jul 2 12:00pm | +0 | RELABEL | Berdan's sharpshooters (1st US Sharpshooters) sent into Pi | R046 |
| 2 | 243 | 6:25am | 5:25am | Jul 2 3:45pm (3:30pm-4:00pm) | +9.3 | Jul 2 12:56pm | +169 | MISORDERED | Hood's division completes the flanking march and deploys s | custom |
| 2 | 248 | 6:50am | 5:50am | Jul 2 2:30pm (12:00pm-3:30pm) | +7.7 | Jul 2 2:30pm | +0 | RELABEL-CONTESTED | Sickles advances his entire III Corps to the Peach Orchard | R050 |
| 2 | 252 | 7:10am | 6:10am | Jul 2 3:45pm (3:15pm-4:00pm) | +8.6 | Jul 2 3:15pm | +30 | RELABEL | Meade discovers Sickles's unauthorized advance. Furious co | R052 |
| 2 | 256 | 7:30am | 6:30am | Jul 2 4:00pm (3:45pm-4:30pm) | +8.5 | Jul 2 4:00pm | +0 | RELABEL | LONGSTREET'S ASSAULT BEGINS. Alexander's Confederate artil | R056 |
| 2 | 258 | 7:40am | 6:40am | Jul 2 4:30pm (4:15pm-5:00pm) | +8.8 | Jul 2 4:05pm | +25 | RELABEL-CONTESTED | Hood severely wounded -- arm permanently paralyzed by arti | R058 |
| 2 | 260 | 7:50am | 6:50am | Jul 2 4:30pm (4:30pm-5:30pm) | +8.7 | Jul 2 4:11pm | +19 | RELABEL | Law's brigade (formerly Hood's) reaches Big Round Top. 15t | R057 |
| 2 | 263 | 8:05am | 7:05am | Jul 2 4:00pm (3:30pm-4:15pm) | +7.9 | Jul 2 4:19pm | -19 | RELABEL-CONTESTED | Little Round Top is UNOCCUPIED by Union infantry -- only a | R053 |
| 2 | 265 | 8:15am | 7:15am | Jul 2 4:20pm (4:00pm-4:30pm) | +8.1 | Jul 2 4:25pm | -5 | RELABEL-CONTESTED | Warren intercepts Vincent's brigade (V Corps) on the march | custom |
| 2 | 267 | 8:25am | 7:25am | Jul 2 4:30pm (4:15pm-4:45pm) | +8.1 | Jul 2 4:30pm | +0 | RELABEL | Vincent's brigade arrives on Little Round Top just ahead o | R059 |
| 2 | 268 | 8:30am | 7:30am | Jul 2 4:45pm (4:30pm-5:00pm) | +8.2 | Jul 2 4:41pm | +4 | RELABEL | 15th Alabama (Oates) makes its first assault on 20th Maine | R060 |
| 2 | 270 | 8:40am | 7:40am | Jul 2 5:30pm (5:00pm-5:50pm) | +8.8 | Jul 2 5:04pm | +26 | COMPOSITE | Vincent mortally wounded on Little Round Top. Rice assumes | R064 |
| 2 | 271 | 8:45am | 7:45am | Jul 2 5:40pm (5:15pm-6:00pm) | +8.9 | Jul 2 5:15pm | +25 | RELABEL-CONTESTED | O'Rorke charges downhill without waiting for orders -- 140 | R065 |
| 2 | 272 | 8:50am | 7:50am | Jul 2 5:40pm (5:15pm-6:00pm) | +8.8 | Jul 2 5:26pm | +14 | RELABEL-CONTESTED | Weed killed on the summit. Hazlett shot kneeling beside th | R065 |
| 2 | 273 | 8:55am | 7:55am | Jul 2 5:20pm (5:00pm-5:45pm) | +8.4 | Jul 2 5:38pm | -18 | MISORDERED | 16th Michigan on Vincent's right begins to waver -- brief  | custom |
| 2 | 275 | 9:05am | 8:05am | Jul 2 6:15pm (5:10pm-7:00pm) | +9.2 | Jul 2 6:00pm | +15 | RELABEL-CONTESTED | CHAMBERLAIN'S BAYONET CHARGE. 20th Maine has expended near | R066 |
| 2 | 278 | 9:20am | 8:20am | Jul 2 6:00pm (5:30pm-6:30pm) | +8.7 | Jul 2 6:18pm | -18 | COMPOSITE | McLaws's assault begins. Barksdale's Mississippi brigade c | R069 |
| 2 | 280 | 9:30am | 8:30am | Jul 2 6:30pm (6:00pm-6:45pm) | +9.0 | Jul 2 6:30pm | +0 | RELABEL | Peach Orchard salient collapses. Graham wounded and captur | R071 |
| 2 | 283 | 9:45am | 8:45am | Jul 2 5:30pm (5:15pm-6:00pm) | +7.8 | Jul 2 6:36pm | -66 | MISORDERED | Kershaw's South Carolina brigade engages in Rose Woods and | custom |
| 2 | 285 | 9:55am | 8:55am | Jul 2 6:00pm (5:45pm-6:30pm) | +8.1 | Jul 2 6:40pm | -40 | RELABEL | Caldwell's II Corps division rushed south to reinforce the | R067 |
| 2 | 287 | 10:05am | 9:05am | Jul 2 6:05pm (5:45pm-6:30pm) | +8.0 | Jul 2 6:44pm | -39 | RELABEL-CONTESTED | Father Corby's absolution. The Irish Brigade kneels in the | custom |
| 2 | 290 | 10:20am | 9:20am | Jul 2 6:15pm (6:00pm-6:45pm) | +7.9 | Jul 2 6:50pm | -35 | RELABEL-CONTESTED | Cross killed entering the Wheatfield. Zook mortally wounde | R068 |
| 2 | 293 | 10:35am | 9:35am | Jul 2 6:45pm (6:30pm-7:30pm) | +8.2 | Jul 2 6:56pm | -11 | RELABEL | Wofford's fresh Georgia brigade sweeps through the Wheatfi | R073 |
| 2 | 295 | 10:45am | 9:45am | Jul 2 7:00pm (6:30pm-7:30pm) | +8.2 | Jul 2 7:00pm | +0 | RELABEL | Crawford's Pennsylvania Reserves charge down the western s | R076 |
| 2 | 298 | 11:00am | 10:00am | Jul 2 6:15pm (6:00pm-6:45pm) | +7.2 | Jul 2 7:04pm | -49 | MISORDERED | SICKLES WOUNDED. Artillery shell shatters Sickles's right  | R070 |
| 2 | 299 | 11:05am | 10:05am | Jul 2 6:40pm (6:15pm-7:00pm) | +7.6 | Jul 2 7:06pm | -26 | RELABEL | McGilvery's emergency artillery line. McGilvery assembles  | custom |
| 2 | 300 | 11:10am | 10:10am | Jul 2 6:40pm (6:15pm-7:00pm) | +7.5 | Jul 2 7:07pm | -27 | RELABEL | BIGELOW'S TROSTLE FARM WITHDRAWAL. Bigelow's 9th Massachus | R074 |
| 2 | 302 | 11:20am | 10:20am | Jul 2 7:00pm (6:45pm-7:30pm) | +7.7 | Jul 2 7:10pm | -10 | RELABEL | 1ST MINNESOTA'S CHARGE. Cemetery Ridge gap is open. Wilcox | R077 |
| 2 | 303 | 11:25am | 10:25am | Jul 2 7:05pm (6:50pm-7:30pm) | +7.7 | Jul 2 7:11pm | -6 | RELABEL | 1st Minnesota engages Wilcox's Confederate brigade. Both f | custom |
| 2 | 304 | 11:30am | 10:30am | Jul 2 6:50pm (6:30pm-7:15pm) | +7.3 | Jul 2 7:12pm | -22 | MISORDERED | Wilcox's advance halted. Reinforcements close the gap on C | R075 |
| 2 | 310 | 12:00pm | 11:00am | Jul 2 12:30pm (12:00pm-1:30pm) | +0.5 | Jul 2 7:17pm | -407 | MISORDERED | Stuart arrives with his cavalry after controversial absenc | R047 |
| 2 | 314 | 12:10pm | 11:20am | Jul 2 7:00pm (6:30pm-7:30pm) | +6.8 | Jul 2 7:20pm | -20 | TEXT-VS-LABEL | Johnson's Confederate division advances on Culp's Hill at  | R080 |
| 2 | 315 | 12:15pm | 11:25am | Jul 2 7:15pm (7:00pm-10:00pm) | +7.0 | Jul 2 7:23pm | -8 | RELABEL | GREENE'S LONE STAND. Greene's brigade holds Culp's Hill al | custom |
| 2 | 320 | 12:40pm | 11:50am | Jul 2 8:00pm (7:30pm-9:30pm) | +7.3 | Jul 2 7:40pm | +20 | RELABEL-CONTESTED | Steuart's Confederate brigade occupies vacant XII Corps br | R081 |
| 2 | 324 | 1:00pm | 12:10pm | Jul 2 10:30pm (10:00pm-12:00am) | +9.5 | Jul 2 7:53pm | +157 | RELABEL-CONTESTED | XII Corps returns to Culp's Hill and finds Confederate tro | R085 |
| 2 | 326 | 1:10pm | 12:20pm | Jul 2 8:00pm (7:30pm-8:30pm) | +6.8 | Jul 2 8:00pm | +0 | TEXT-VS-LABEL | CEMETERY HILL ASSAULT. Hays's Louisiana Tigers and Avery's | R082 |
| 2 | 328 | 1:20pm | 12:30pm | Jul 2 8:00pm (7:45pm-8:30pm) | +6.7 | Jul 2 8:21pm | -21 | RELABEL | Avery mortally wounded on the slope of Cemetery Hill writi | custom |
| 2 | 330 | 1:30pm | 12:40pm | Jul 2 8:30pm (8:15pm-9:00pm) | +7.0 | Jul 2 8:43pm | -13 | RELABEL-CONTESTED | Carroll's Union brigade counterattacks Cemetery Hill -- dr | R083 |
| 2 | 335 | 1:55pm | 1:05pm | Jul 2 7:10pm (6:45pm-7:30pm) | +5.2 | Jul 2 9:36pm | -146 | MISORDERED | Willard's brigade (II Corps -- 'Harper's Ferry Cowards' se | R078 |
| 2 | 340 | 2:20pm | 1:30pm | Jul 2 10:30pm (10:00pm-10:30pm) | +8.2 | Jul 2 10:30pm | +0 | RELABEL | Fighting dies down across the battlefield. Both sides hold | R087 |
| 2 | 360 | 3:20pm | 3:10pm | Jul 3 4:30am (3:00am-5:30am) | +13.2 | Jul 2 11:35pm | +295 | WRONG-DAY | Lee and Longstreet meet. Lee decides to attack Cemetery Ri | R090 |
| 2 | 380 | 4:20pm | 4:50pm | Jul 3 11:30am (10:00am-12:30pm) | +19.2 | Jul 3 12:40am | +650 | WRONG-DAY | Alexander begins positioning Confederate artillery along S | R099 |
| 2 | 400 | 5:20pm | 6:30pm | Jul 2 9:30pm (9:00pm-11:30pm) | +4.2 | Jul 3 1:45am | -255 | MISORDERED | Meade holds council of war. All corps commanders polled -- | R084 |
| 2 | 420 | 6:20pm | 8:10pm | Jul 3 9:00am (8:30am-10:00am) | +14.7 | Jul 3 2:49am | +371 | WRONG-DAY | Both armies settle in for the night. Pickett's division -- | R094 |
| 2 | 440 | 7:20pm | 9:50pm | Jul 2 11:30pm (10:00pm-11:59pm) | +4.2 | Jul 3 3:54am | -264 | COMPOSITE | Johnson's Confederates dig in on lower Culp's Hill. XII Co | custom |
| 2 | 450 | 7:50pm | 10:40pm | Jul 3 12:00am (11:00pm-4:00am) | +4.2 | Jul 3 4:27am | -267 | CONTEXT | End of Day 2. Tallying casualties: approximately 10,000 Un | custom |
| 3 | 451 | 5:00am July 3 | 4:00am | Jul 3 4:30am (4:00am-4:45am) | -0.5 | Jul 3 4:30am | +0 | RELABEL | Day 3 opens with Union XII Corps artillery firing on Johns | R091 |
| 3 | 452 | 5:05am | 4:05am | Jul 3 5:00am (4:30am-5:30am) | -0.1 | Jul 3 4:36am | +24 | RELABEL | Johnson's Confederate division counterattacks to retain th | R092 |
| 3 | 455 | 5:20am | 4:20am | Jul 3 5:45am (5:00am-6:30am) | +0.4 | Jul 3 4:52am | +53 | RELABEL-CONTESTED | Steuart's Confederate brigade makes repeated assaults up t | custom |
| 3 | 460 | 5:45am | 4:45am | Jul 3 10:30am (10:00am-11:30am) | +4.8 | Jul 3 5:20am | +310 | MISORDERED | Colgrove's controversial charge. Mudge's 2nd Massachusetts | R096 |
| 3 | 465 | 6:10am | 5:10am | Jul 3 7:30am (5:00am-10:30am) | +1.3 | Jul 3 5:47am | +103 | CONTEXT | Both sides fight a grinding attritional battle on Culp's H | R093 |
| 3 | 480 | 7:05am | 6:25am | Jul 3 8:00am (7:00am-9:30am) | +0.9 | Jul 3 7:10am | +50 | RELABEL-CONTESTED | XII Corps counterattacks aggressively. Candy's, Kane's, an | custom |
| 3 | 490 | 7:35am | 7:15am | Jul 3 11:00am (10:30am-12:00pm) | +3.4 | Jul 3 8:05am | +175 | MISORDERED | Johnson's Confederate assault on Culp's Hill exhausted. Co | R097 |
| 3 | 500 | 8:05am | 8:05am | Jul 3 9:00am (8:30am-10:00am) | +0.9 | Jul 3 9:00am | +0 | RELABEL | Pickett's fresh division moves up behind Seminary Ridge in | R094 |
| 3 | 505 | 8:30am | 8:30am | Jul 3 11:00am (10:00am-12:30pm) | +2.5 | Jul 3 9:40am | +80 | RELABEL-CONTESTED | Pettigrew's division (Heth's old command) and Trimble's tw | custom |
| 3 | 510 | 8:50am | 8:55am | Jul 3 10:00am (10:00am-11:00am) | +1.2 | Jul 3 10:20am | -20 | RELABEL | Final Culp's Hill fighting. XII Corps retakes most of the  | R095 |
| 3 | 515 | 9:15am | 9:20am | Jul 3 11:00am (10:30am-12:00pm) | +1.8 | Jul 3 11:00am | +0 | TEXT-VS-LABEL | Culp's Hill fighting finally ends at approximately 11:00am | R097 |
| 3 | 516 | 9:20am | 9:25am | Jul 3 11:30am (10:00am-12:30pm) | +2.2 | Jul 3 11:42am | -12 | COMPOSITE | Alexander positions the Confederate artillery along Semina | R099 |
| 3 | 518 | 9:30am | 9:35am | Jul 3 1:07pm (1:00pm-1:10pm) | +3.6 | Jul 3 1:07pm | +0 | TEXT-VS-LABEL | THE CANNONADE BEGINS. At approximately 1:00pm, two Confede | R100 |
| 3 | 520 | 9:40am | 9:45am | Jul 3 1:15pm (1:07pm-1:30pm) | +3.6 | Jul 3 1:18pm | -3 | RELABEL-CONTESTED | Hunt deliberately silences Union artillery to conserve amm | R101 |
| 3 | 522 | 9:50am | 9:55am | Jul 3 1:30pm (1:10pm-2:00pm) | +3.7 | Jul 3 1:30pm | +0 | RELABEL | Confederate artillery fire overshooting Cemetery Ridge --  | custom |
| 3 | 525 | 10:05am | 10:10am | Jul 3 1:25pm | +3.3 | Jul 3 1:47pm | -22 | UNVERIFIED-QUOTE | Alexander's first message to Pickett: 'For God's sake come | R103 |
| 3 | 530 | 10:30am | 10:35am | Jul 3 1:35pm (1:35pm-2:40pm) | +3.1 | Jul 3 2:15pm | -40 | UNVERIFIED-QUOTE | Alexander's second message to Pickett: 'I would not make t | R105 |
| 3 | 532 | 10:40am | 10:45am | Jul 3 1:35pm (1:30pm-2:00pm) | +2.9 | Jul 3 2:26pm | -51 | RELABEL-CONTESTED | Union artillery falls silent -- Confederate infantry inter | R104 |
| 3 | 535 | 10:50am | 11:00am | - | - | Jul 3 2:43pm | - | CONTEXT | Stannard's Vermont Brigade (I Corps) takes position south  | - |
| 3 | 538 | 11:05am | 11:15am | Jul 3 3:00pm (2:00pm-3:00pm) | +3.9 | Jul 3 3:00pm | +0 | RELABEL-CONTESTED | PICKETT'S CHARGE BEGINS. The entire Confederate assault fo | R108 |
| 3 | 540 | 11:15am | 11:25am | Jul 3 3:10pm (3:00pm-3:20pm) | +3.9 | Jul 3 3:05pm | +5 | RELABEL | Union artillery opens with solid shot then shell as the Co | custom |
| 3 | 542 | 11:25am | 11:35am | Jul 3 3:20pm (3:10pm-3:30pm) | +3.9 | Jul 3 3:11pm | +9 | RELABEL | BROCKENBROUGH COLLAPSES. The far Confederate left (Brocken | R111 |
| 3 | 544 | 11:35am | 11:45am | Jul 3 3:20pm (3:15pm-3:30pm) | +3.8 | Jul 3 3:16pm | +4 | RELABEL | Confederate assault line reaches the Emmitsburg Road and c | R110 |
| 3 | 546 | 11:45am | 11:55am | Jul 3 3:30pm (3:20pm-3:45pm) | +3.8 | Jul 3 3:22pm | +8 | RELABEL | STANNARD'S FLANKING ATTACK. Stannard's Vermont brigade whe | R112 |
| 3 | 547 | 11:50am | 12:00pm | Jul 3 3:30pm (3:25pm-3:35pm) | +3.7 | Jul 3 3:24pm | +6 | RELABEL | Kemper severely wounded in the Confederate assault. Mayo a | R113 |
| 3 | 548 | 11:55am | 12:05pm | Jul 3 3:35pm (3:25pm-3:45pm) | +3.7 | Jul 3 3:27pm | +8 | RELABEL | Pettigrew's Confederate brigades (26th NC, 11th NC, 47th N | custom |
| 3 | 549 | 12:00pm | 12:10pm | Jul 3 3:30pm (3:10pm-3:45pm) | +3.5 | Jul 3 3:30pm | +0 | RELABEL | Garnett's Confederate brigade reaches the stone wall at Th | R114 |
| 3 | 550 | 12:05pm | 12:15pm | Jul 3 3:30pm (3:25pm-3:35pm) | +3.4 | Jul 3 3:32pm | -2 | RELABEL | GARNETT KIA. Shot from his horse at The Angle -- his body  | R113 |
| 3 | 551 | 12:10pm | 12:20pm | Jul 3 3:35pm (3:10pm-3:45pm) | +3.4 | Jul 3 3:35pm | +0 | RELABEL | ARMISTEAD LEADS MEN OVER THE WALL. Armistead places his ha | R115 |
| 3 | 552 | 12:15pm | 12:25pm | Jul 3 3:38pm (3:30pm-3:45pm) | +3.4 | Jul 3 3:40pm | -2 | RELABEL | ARMISTEAD MORTALLY WOUNDED. Shot moments after crossing th | custom |
| 3 | 553 | 12:20pm | 12:30pm | Jul 3 3:32pm (3:25pm-3:45pm) | +3.2 | Jul 3 3:45pm | -13 | RELABEL-CONTESTED | CUSHING KIA. Lieutenant Cushing, serving his last two guns | custom |
| 3 | 554 | 12:25pm | 12:35pm | Jul 3 3:38pm (3:30pm-3:45pm) | +3.2 | Jul 3 3:50pm | -12 | RELABEL | Cowan's Union battery fires canister into Armistead's men  | custom |
| 3 | 555 | 12:30pm | 12:40pm | Jul 3 3:45pm (3:35pm-3:55pm) | +3.2 | Jul 3 3:55pm | -10 | RELABEL | The Confederate penetration is broken. Armistead's men str | R116 |
| 3 | 556 | 12:35pm | 12:45pm | Jul 3 4:00pm (3:45pm-4:30pm) | +3.4 | Jul 3 4:00pm | +0 | RELABEL | Along the entire line the Confederate assault collapses. P | R118 |
| 3 | 558 | 12:45pm | 12:55pm | Jul 3 4:00pm (3:45pm-4:15pm) | +3.2 | Jul 3 4:12pm | -12 | RELABEL-CONTESTED | 16TH VERMONT SECOND WHEEL. Stannard's 16th VT wheels again | R117 |
| 3 | 560 | 12:55pm | 1:05pm | Jul 3 1:30pm (1:00pm-2:30pm) | +0.6 | Jul 3 4:25pm | -175 | MISORDERED | EAST CAVALRY FIELD. Stuart's cavalry (Hampton, Fitz Lee, C | R119 |
| 3 | 563 | 1:10pm | 1:20pm | Jul 3 3:00pm (2:45pm-3:30pm) | +1.8 | Jul 3 4:44pm | -104 | MISORDERED | CUSTER'S CHARGE. Custer personally leads the Michigan Brig | R120 |
| 3 | 565 | 1:20pm | 1:30pm | Jul 3 3:15pm (3:00pm-3:45pm) | +1.9 | Jul 3 4:56pm | -101 | RELABEL-CONTESTED | Stuart's cavalry repulsed at East Cavalry Field. The Confe | custom |
| 3 | 568 | 1:35pm | 1:45pm | Jul 3 5:15pm (5:00pm-5:45pm) | +3.7 | Jul 3 5:15pm | +0 | RELABEL | KILPATRICK'S CHARGE. Kilpatrick orders Farnsworth's cavalr | R122 |
| 3 | 569 | 1:40pm | 1:50pm | Jul 3 5:25pm (5:15pm-5:45pm) | +3.8 | Jul 3 5:17pm | +8 | RELABEL | FARNSWORTH KIA. Farnsworth leads the doomed charge and is  | custom |
| 3 | 572 | 1:55pm | 2:05pm | Jul 3 5:00pm (4:30pm-6:00pm) | +3.1 | Jul 3 5:21pm | -21 | RELABEL-CONTESTED | Meade considers a counterattack. Hancock (wounded) urges o | R125 |
| 3 | 580 | 2:20pm | 2:45pm | Jul 3 5:00pm (4:00pm-7:00pm) | +2.7 | Jul 3 5:34pm | -34 | CONTEXT | Lee begins organizing his army for defense -- expecting Me | custom |
| 3 | 590 | 3:10pm | 3:35pm | Jul 3 6:30pm (5:00pm-8:00pm) | +3.3 | Jul 3 5:49pm | +41 | CONTEXT | Both armies largely stationary. Union troops bury the dead | custom |
| 3 | 620 | 5:10pm | 6:05pm | Jul 3 7:30pm (7:00pm-9:00pm) | +2.3 | Jul 3 6:35pm | +55 | COMPOSITE | Lee orders the retreat to begin on July 4. Imboden's caval | R127 |
| 3 | 650 | 6:40pm | 8:35pm | Jul 3 6:00pm (5:30pm-7:30pm) | -0.7 | Jul 3 7:21pm | -81 | RELABEL-CONTESTED | Rain begins. Both armies exhausted. The Battle of Gettysbu | R123 |
| 3 | 675 | 8:05pm | 10:40pm | Jul 3 8:00pm (7:30pm-8:30pm) | -0.1 | Jul 3 8:00pm | +0 | CONTEXT | END OF THE BATTLE. Total Confederate losses approximately  | custom |

### 5.3 Notes on specific rows (why the class was assigned)

- **t8** (WRONG-DAY; label 5:35am): Hill-Heth conversation about advancing on Gettysburg belongs to June 30 evening / pre-dawn July 1 (LIT; not verified this session). Not a 5:35am July 1 event. Needs historian check (Heth OR).
- **t12** (TEXT-VS-LABEL; label 6:00am): Site text says 'approximately 7:30am' while label says 6:00am (map clock 6:55am). Real 7:30am.
- **t38** (TEXT-VS-LABEL; label 8:10am): Text says 'Noon lull begins' but label is 8:10am. Real lull ~11:30am-2:00pm.
- **t50** (COMPOSITE; label 9:10am): Merges Howard assuming command (10:30-11:30am), XI Corps arriving (11:45am-1:00pm) and Barlow's advance to the knoll (1:30-2:30pm).
- **t95** (COMPOSITE; label 1:05pm): Merges Birney's arrival (dusk July 1), Hancock/II Corps arriving (dawn July 2) and Newton replacing Doubleday (July 2 morning; LIT). Spans ~12+ hours and two dates.
- **t100** (COMPOSITE; label 1:30pm): Merges nightfall (~8pm), Meade's arrival (site text says ~11pm; sources say after midnight/~1am July 2) and the council of war (9pm July 2 - a different night). Label 1:30pm.
- **t226** (COMPOSITE; label 5:00am July 2): Dawn recon + Lee-Longstreet argument (dawn-9am) + 'Lee orders attack' (~11:00am).
- **t243** (MISORDERED; label 6:25am): Hood/McLaws reach jump-off ~3:30-4:00pm.
- **t270** (COMPOSITE; label 8:40am): Merges Vincent's wounding (~5:15-5:45), Weed's arrival (~5:00-5:30), Hazlett's guns and O'Rorke (~5:30).
- **t273** (MISORDERED; label 8:55am): 16th Michigan wavering (before/after Vincent fell, i.e. before O'Rorke t271).
- **t278** (COMPOSITE; label 9:20am): Merges McLaws/Kershaw start (~5:00-5:30) with Barksdale's charge (~6:00-6:30).
- **t283** (MISORDERED; label 9:45am): Kershaw at Rose Woods/Wheatfield ~5:15-5:45pm precedes Barksdale (t278, ~6:00) and Caldwell (t285, ~6:00).
- **t298** (MISORDERED; label 11:00am): Sickles wounded ~6:00-6:45pm (before Wofford/Crawford t293-295).
- **t304** (MISORDERED; label 11:30am): Wright's Cemetery Ridge attack ~6:30-7:15pm precedes/overlaps 1st Minnesota (t302).
- **t310** (MISORDERED; label 12:00pm): Stuart arrived ~12:00-1:30pm: ~6 hours BEFORE its neighbours (t300-t304 = ~6:15-7:00pm).
- **t314** (TEXT-VS-LABEL; label 12:10pm): Text says 'at dusk' but label 12:10pm. Real Culp's Hill assault ~7:00pm.
- **t326** (TEXT-VS-LABEL; label 1:10pm): Text says 'at dusk' but label 1:10pm. Real ~7:30-8:30pm.
- **t335** (MISORDERED; label 1:55pm): Willard/Barksdale ~6:45-7:30pm; site places it AFTER the ~8pm Cemetery Hill fight.
- **t360** (WRONG-DAY; label 3:20pm): Lee/Longstreet meeting and 'no 15,000 men' remark are July 3 dawn/morning (R090); Lee's decision to renew the attack was evening/night July 2 (R086). Label puts it at 3:20pm July 2.
- **t380** (WRONG-DAY; label 4:20pm): Alexander positioning guns is a July 3 late-morning event (10:00am-12:30pm). Label puts it at 4:20pm July 2.
- **t400** (MISORDERED; label 5:20pm): Council of war ~9:00-11:30pm (real time falls BEFORE the 10:30pm 'fighting dies down' at t340 but the site places it 60 ticks later). Label 5:20pm.
- **t420** (WRONG-DAY; label 6:20pm): SS3: Pickett's division arrived ~9:00am July 3; SS2: still at Chambersburg during the night; WPd2: arrived by the night of July 2 (probably Marsh Creek). No source read has it in position on Seminary Ridge on the evening of July 2. Label 6:20pm July 2.
- **t440** (COMPOSITE; label 7:20pm): Overnight Culp's Hill lines + 'Meade orders Hunt to conserve ammunition' (a July 3 decision; LIT).
- **t460** (MISORDERED; label 5:45am): Colgrove's charge/Mudge killed: best ~10:00-11:30am (Sears via Wikipedia: near the end of the fight); SS3 6:00am; vignette V-022 7:30am; site label 5:45am.
- **t490** (MISORDERED; label 7:35am): Johnson's assault exhausted; ends ~10:30am-noon.
- **t515** (TEXT-VS-LABEL; label 9:15am): Text says 'fighting ends at approximately 11:00am' but label 9:15am (map 9:20am).
- **t516** (COMPOSITE; label 9:20am): Guns positioned ~10:00am-12:30pm; the 'two famous messages' were written ~1:25 and ~1:35pm - 2 hours later than the label.
- **t518** (TEXT-VS-LABEL; label 9:30am): Text says 'At approximately 1:00pm' but label 9:30am (map 9:35am). Real 1:00-1:07pm.
- **t525** (UNVERIFIED-QUOTE; label 10:05am): Quoted first message ('For God's sake come quick...') is the SECOND real note (1:35pm); the real first note (1:25pm) reads 'If you are coming at all, come at once...'. Label 10:05am.
- **t530** (UNVERIFIED-QUOTE; label 10:30am): Quote 'I would not make the charge now - but the order has been given...' could not be found in any source read. Also step-off (~3:00pm) is ~1.5h after the second note (1:35pm), not simultaneous.
- **t560** (MISORDERED; label 12:55pm): East Cavalry Field opened ~1:00pm - BEFORE the infantry step-off (t538), but site places it after the Angle (t551-556).
- **t563** (MISORDERED; label 1:10pm): Hampton/Custer climax ~3:00pm precedes the Angle (~3:30pm) in real time.
- **t620** (COMPOSITE; label 5:10pm): Merges Lee's council at sunset July 3 (~7:30pm), Imboden briefing (~1:00am July 4) and wagon-train departure (July 4 ~1-4pm). Label 5:10pm.

### 5.4 Vignettes, walkthrough, monuments, markers, turning points, sandbox

Times in the "Claim" column are what the site's own text/label says; "Map clock" is what the header clock (A) shows at the trigger tick; "Proposed" is the section-7 clock at that tick; the last two columns are minutes (claim minus clock).

| Kind | Id | Name | Tick | Claim | Claimed/real | Map clock | Proposed | d(map) | d(prop) | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| walkthrough stop | 1 | McPherson Ridge | 12 | July 1, 7:30 AM | Jul 1 7:30am | Jul 1 6:55am | Jul 1 7:30am | 35 | 0 |  |
| walkthrough stop | 2 | Oak Ridge | 22 | July 1, 10:00 AM | Jul 1 10:00am | Jul 1 7:45am | Jul 1 9:13am | 135 | 47 | Narrative describes Iverson's ambush (real ~2:30pm), so tick and clock are both ~4-5h early; should sit near t53. |
| walkthrough stop | 3 | Barlow's Knoll | 62 | July 1, 2:30 PM | Jul 1 2:30pm | Jul 1 11:05am | Jul 1 3:43pm | 205 | -73 |  |
| walkthrough stop | 4 | Seminary Ridge - The Union Retreat | 75 | July 1, 4:00 PM | Jul 1 4:00pm | Jul 1 12:10pm | Jul 1 5:00pm | 230 | -60 | Retreat is t58-t68 in chronology; t75 is the Lee/Ewell order. |
| walkthrough stop | 5 | Little Round Top | 264 | July 2, 4:00 PM | Jul 2 4:00pm | Jul 2 7:10am | Jul 2 4:22pm | 530 | -22 |  |
| walkthrough stop | 6 | Devil's Den | 268 | July 2, 4:30 PM | Jul 2 4:30pm | Jul 2 7:30am | Jul 2 4:41pm | 540 | -11 |  |
| walkthrough stop | 7 | The Wheatfield | 275 | July 2, 5:00 PM | Jul 2 5:00pm | Jul 2 8:05am | Jul 2 6:00pm | 535 | -60 | Ticks 270 (Peach Orchard, 6:00pm) and 275 (Wheatfield, 5:00pm) are in reverse order of their claimed times. |
| walkthrough stop | 8 | Peach Orchard | 270 | July 2, 6:00 PM | Jul 2 6:00pm | Jul 2 7:40am | Jul 2 5:04pm | 620 | 56 | See stop 7. |
| walkthrough stop | 9 | Cemetery Hill | 322 | July 2, 8:00 PM | Jul 2 8:00pm | Jul 2 12:00pm | Jul 2 7:47pm | 480 | 13 |  |
| walkthrough stop | 10 | Culp's Hill - overnight | 380 | July 2-3 | - | Jul 2 4:50pm | Jul 3 12:40am |  |  | tick 380 is the WRONG-DAY Alexander event in chronology; proposed clock ~12:40am July 3. |
| walkthrough stop | 11 | Cemetery Ridge - Wright's Breakthrough | 315 | July 2, 7:30 PM | Jul 2 7:30pm | Jul 2 11:25am | Jul 2 7:23pm | 485 | 7 | Real ~6:30-7:15pm (SS2), i.e. 15-60 min earlier than claimed. |
| walkthrough stop | 12 | The Angle | 548 | July 3, 3:00 PM | Jul 3 3:00pm | Jul 3 12:05pm | Jul 3 3:27pm | 175 | -27 | Narrative: "At 3:00 PM ... the survivors ... reached the stone wall" - the wall was reached ~3:30 (step-off ~3:00). |
| walkthrough stop | 13 | East Cavalry Field | 522 | July 3, 3:00 PM | Jul 3 3:00pm | Jul 3 9:55am | Jul 3 1:30pm | 305 | 90 | tick 522 is in the cannonade (1:07-3:00pm); chronology places East Cav at t560. |
| walkthrough stop | 14 | Pickett's Charge | 540 | July 3, 3:00 PM | Jul 3 3:00pm | Jul 3 11:25am | Jul 3 3:05pm | 215 | -5 | Narrative states cannonade at 1:07 PM - correct - but the tick's own clock shows 9:40am. |
| walkthrough stop | 15 | The High Water Mark | 555 | July 3 | - | Jul 3 12:40pm | Jul 3 3:55pm |  |  |  |
| walkthrough stop | 16 | Confederate Avenue - The Retreat | 610 | July 4-5, 1863 | - | Jul 3 5:15pm | Jul 3 6:20pm |  |  | tick 610 is ~6pm July 3; the retreat is July 4-5 (no ticks exist after July 3 ~8pm). |
| monument tooltip | mon_20me_lrt | 20th Maine (LRT) | 268 | "...at 4:30 PM July 2" | Jul 2 4:30pm | Jul 2 7:30am | Jul 2 4:41pm | 540 | -11 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_iron_brig | Iron Brigade | 20 | "Charged into Herbst Woods at 10:00 AM July 1" | Jul 1 10:00am | Jul 1 7:35am | Jul 1 8:52am | 145 | 68 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_reynolds | Reynolds death site | 28 | "killed here at 10:15 AM July 1" | Jul 1 10:15am | Jul 1 8:15am | Jul 1 10:15am | 120 | 0 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_cushing | Cushing Battery A | 548 | "fired his last rounds ... at 3:00 PM July 3" | Jul 3 3:00pm | Jul 3 12:05pm | Jul 3 3:27pm | 175 | -27 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_armistead | Armistead | 551 | "July 3, 3:15 PM" | Jul 3 3:15pm | Jul 3 12:20pm | Jul 3 3:35pm | 175 | -20 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_hancock | Hancock wounded | 554 | "at 3:20 PM July 3" | Jul 3 3:20pm | Jul 3 12:35pm | Jul 3 3:50pm | 165 | -30 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_barlow | Barlow wounded | 63 | "at 2:30 PM July 1" | Jul 1 2:30pm | Jul 1 11:10am | Jul 1 3:51pm | 200 | -81 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_6wis | 6th Wisconsin | 29 | "Charged the Railroad Cut at 10:30 AM July 1" | Jul 1 10:30am | Jul 1 8:20am | Jul 1 10:21am | 130 | 9 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| monument tooltip | mon_hood | Hood wounded | 262 | "at 4:00 PM July 2" | Jul 2 4:00pm | Jul 2 7:00am | Jul 2 4:16pm | 540 | -16 | Tooltip header time comes from JF() (5:00-base, date+2); body text carries the clock shown here. |
| timeline marker | First shot | First shot | 17 | (marker label; compared with real time of the named event) | Jul 1 7:30am | Jul 1 7:20am | Jul 1 8:22am | 10 | -52 | marker at t17 = Calef's guns (chronology puts the first shot at t12) |
| timeline marker | Reynolds KIA | Reynolds KIA | 28 | (marker label; compared with real time of the named event) | Jul 1 10:15am | Jul 1 8:15am | Jul 1 10:15am | 120 | 0 |  |
| timeline marker | Iverson's Pits | Iverson's Pits | 52 | (marker label; compared with real time of the named event) | Jul 1 2:30pm | Jul 1 10:15am | Jul 1 2:18pm | 255 | 12 |  |
| timeline marker | Little Round Top | Little Round Top | 267 | (marker label; compared with real time of the named event) | Jul 2 4:30pm | Jul 2 7:25am | Jul 2 4:30pm | 545 | 0 |  |
| timeline marker | 1st Minnesota | 1st Minnesota | 302 | (marker label; compared with real time of the named event) | Jul 2 7:00pm | Jul 2 10:20am | Jul 2 7:10pm | 520 | -10 |  |
| timeline marker | Cannonade | Cannonade | 518 | (marker label; compared with real time of the named event) | Jul 3 1:07pm | Jul 3 9:35am | Jul 3 1:07pm | 212 | 0 |  |
| timeline marker | Pickett's Charge | Pickett's Charge | 538 | (marker label; compared with real time of the named event) | Jul 3 3:00pm | Jul 3 11:15am | Jul 3 3:00pm | 225 | 0 |  |
| timeline marker | The Angle | The Angle | 551 | (marker label; compared with real time of the named event) | Jul 3 3:35pm | Jul 3 12:20pm | Jul 3 3:35pm | 195 | 0 |  |
| turning point | Buford's Decision to Stand | Buford's Decision to Stand | 1 | Day 1 - Morning | Jul 1 7:30am | Jul 1 6:00am | Jul 1 5:00am | 90 | 150 | tick 1 = 5:00am, before the first shot |
| turning point | Ewell's Discretion | Ewell's Discretion | 175 | Day 1 - Late afternoon | Jul 1 5:00pm | Jul 1 8:30pm | Jul 2 1:04am | -210 | -484 | chronology has this at t75; page uses t175 (= 1:07am July 2 under the proposed anchors) |
| turning point | Longstreet's Delayed Attack | Longstreet's Delayed Attack | 240 | Day 2 - Afternoon | Jul 2 4:00pm | Jul 2 5:10am | Jul 2 12:00pm | 650 | 240 | text: attack ~4:00pm; t240 is Berdan probe ~noon |
| turning point | Chamberlain's Bayonet Charge | Chamberlain's Bayonet Charge | 267 | Day 2 - Late afternoon | Jul 2 6:15pm | Jul 2 7:25am | Jul 2 4:30pm | 650 | 105 | t267 is Vincent arrival; charge is t275 |
| turning point | Wheatfield / Peach Orchard collapse | Wheatfield / Peach Orchard collapse | 300 | Day 2 - Evening | Jul 2 6:30pm | Jul 2 10:10am | Jul 2 7:07pm | 500 | -37 |  |
| turning point | Night Assault on Culp's/Cemetery Hill | Night Assault on Culp's/Cemetery Hill | 340 | Day 2 - Night | Jul 2 8:00pm | Jul 2 1:30pm | Jul 2 10:30pm | 390 | -150 | t340 = end-of-fight summary |
| turning point | Culp's Hill Retaken | Culp's Hill Retaken | 460 | Day 3 - Morning | Jul 3 10:30am | Jul 3 4:45am | Jul 3 5:20am | 345 | 310 | text says "after roughly seven hours" |
| turning point | The Cannonade | The Cannonade | 540 | Day 3 - Afternoon | Jul 3 1:07pm | Jul 3 11:25am | Jul 3 3:05pm | 102 | -118 | text says "Around 1:00pm" but tick 540 is after the cannonade ended |
| turning point | Pickett's Charge | Pickett's Charge | 560 | Day 3 - Afternoon | Jul 3 3:00pm | Jul 3 1:05pm | Jul 3 4:25pm | 115 | -85 | tick 560 is after the Angle |
| sandbox start | 'Day 2, mid-afternoon (tick 260) -- before Longstreet's assault' | 'Day 2, mid-afternoon (tick 260) -- before Longstreet's assault' | 260 | label text | Jul 2 3:00pm | Jul 2 6:50am | Jul 2 4:11pm | 490 | -71 | Proposed clock for t260 is ~4:25pm - after the assault began |
| sandbox start | 'Day 3, ~3:00pm (tick 553) -- moments before Pickett's Charge reaches the wall' | 'Day 3, ~3:00pm (tick 553) -- moments before Pickett's Charge reaches the wall' | 553 | label text | Jul 3 3:00pm | Jul 3 12:30pm | Jul 3 3:45pm | 150 | -45 | Proposed clock ~3:33pm = at the wall, not before |
| sandbox start | 'Day 1, mid-morning (tick 62) -- I Corps holding McPherson's Ridge' | 'Day 1, mid-morning (tick 62) -- I Corps holding McPherson's Ridge' | 62 | label text | Jul 1 10:30am | Jul 1 11:05am | Jul 1 3:43pm | -35 | -313 | Proposed clock ~3:40pm - the I Corps was being driven off Seminary Ridge |
| vignette | V-001 | The First Shot | 12 | "approximately 7:30am" (panel + script) | Jul 1 7:30am | Jul 1 6:55am | Jul 1 7:30am | 35 | 0 | correct; clocks shown at t12 are 6:00 (label) / 6:55 (map) |
| vignette | V-002 | Reynolds Falls | 28 | "approximately 10:15am" | Jul 1 10:15am | Jul 1 8:15am | Jul 1 10:15am | 120 | 0 | correct; clocks 7:20 / 8:15 |
| vignette | V-004 | The Railroad Cut | 36 | "morning of July 1" | Jul 1 11:00am | Jul 1 8:55am | Jul 1 11:00am | 125 | 0 | ok |
| vignette | V-007 | Sickles Moves Forward | 248 | "Around 3:00 in the afternoon"; also "On the morning of July 2..." | Jul 2 3:00pm | Jul 2 5:50am | Jul 2 2:30pm | 550 | 30 | within range (noon-3:30); clocks 6:50am / 5:50am |
| vignette | V-008 | Berdan's Reconnaissance | 240 | "On the morning of July 2" | Jul 2 12:00pm | Jul 2 5:10am | Jul 2 12:00pm | 410 | 0 | real ~noon |
| vignette | V-009 | Vincent and Little Round Top | 267 | "shot ... late in the afternoon"; "July 7 ... died that afternoon" | Jul 2 5:30pm | Jul 2 7:25am | Jul 2 4:30pm | 605 | 60 | ok (Vincent died July 7); clocks 8:25am / 7:25am |
| vignette | V-010 | Chamberlain's Charge | 275 | "On the afternoon of July 2, 1863"; "repulsed five ... assaults" | Jul 2 6:15pm | Jul 2 8:05am | Jul 2 6:00pm | 610 | 15 | time ok; clocks 9:05am / 8:05am. (Site monument tooltip says Oates "made 4 assaults".) |
| vignette | V-013 | Greene's Lone Stand | 315 | "The orders came at dusk" | Jul 2 6:30pm | Jul 2 11:25am | Jul 2 7:23pm | 425 | -53 | Slocum was ordered to send troops ~6:30pm; dusk ~7:30; ok |
| vignette | V-014 | Louisiana Tigers on Cemetery Hill | 326 | "At dusk on July 2" | Jul 2 8:00pm | Jul 2 12:20pm | Jul 2 8:00pm | 460 | 0 | correct but clocks 1:10pm / 12:20pm |
| vignette | V-015 | Alexander's Two Messages | 525 | no clock; first quoted message is the second real note | Jul 3 1:25pm | Jul 3 10:10am | Jul 3 1:47pm | 195 | -22 | clocks 10:05am / 10:10am; see UNVERIFIED-QUOTE |
| vignette | V-016 | Armistead at The Angle | 551 | "afternoon of July 3"; "Armistead died two days later" | Jul 3 3:35pm | Jul 3 12:20pm | Jul 3 3:35pm | 195 | 0 | ok (Armistead died July 5); clocks 12:10pm / 12:20pm |
| vignette | V-017 | The Cannonade | 518 | "At approximately 1:00pm"; "For two hours" (V-015) | Jul 3 1:07pm | Jul 3 9:35am | Jul 3 1:07pm | 212 | 0 | correct but clocks 9:30am / 9:35am |
| vignette | V-020 | Custer at East Cavalry Field | 563 | "afternoon of July 3, while Pickett's infantry was crossing..."; "brigadier general for ex | Jul 3 3:00pm | Jul 3 1:20pm | Jul 3 4:44pm | 100 | -104 | BUG: commission dated June 29 => 4 days (July 3).  |
| vignette | V-021 | Farnsworth's Charge | 568 | "general for eight days" ... "a general for four days" | Jul 3 5:15pm | Jul 3 1:45pm | Jul 3 5:15pm | 210 | 0 | BUG: internal contradiction (8 vs 4); 4 is right (nominated June 29). |
| vignette | V-022 | Mudge and the Charge at Culp's Hill | 460 | "approximately 7:30 in the morning of July 3" | Jul 3 10:30am | Jul 3 4:45am | Jul 3 5:20am | 345 | 310 | BUG: real best ~10:00-11:30am (SS3 says 6:00am); needs Pfanz/Sears check |
| vignette | V-023 | Lee Meets His Men | 556 | "That night, Lee found Imboden waiting" | Jul 4 1:00am | Jul 3 12:45pm | Jul 3 4:00pm | 735 | 540 | ok (~1:00am July 4) |
| vignette | V-024 | The High Water Mark | 675 | "Lee began his retreat on July 4 in a driving rainstorm" | Jul 4 4:00pm | Jul 3 10:40pm | Jul 3 8:00pm | 1040 | 1200 | ok |

Vignettes with no clock claim (no delta possible): V-003, V-005, V-006, V-011, V-012, V-018, V-019 (trigger ticks 29, 52, 57, 300, 302, 553, 556 respectively). Their only time information is the clock the app shows at the trigger tick, which is wrong by the same 3-9 h as everything else.

**Validation statistic.** For the 30 hand-typed real-clock claims in walkthrough stops, monument tooltips and timeline markers (rows with a claimed time): median |claim - proposed clock| = 14 min (mean 27; 21/30 within 30 min; 26/30 within 60 min); median |claim - current map clock| = 214 min (mean 292; 1/30 within 30 min). The large residuals against the proposal are themselves informative: walkthrough stop 2 (Oak Ridge, 10:00 AM at t22 but narrating Iverson at ~2:30 pm), stop 4 (retreat at t75), stops 7/8 (Wheatfield 5:00 pm at t275 and Peach Orchard 6:00 pm at t270 are in reverse order), stop 13 (East Cavalry Field at t522), the Iron Brigade (t20) and Barlow (t63) monument ticks - these are tick placement errors, not clock errors.

### 5.5 Data-level issues beyond labels

1. **Placement data vs. history for Pickett's division.** `placements_*.json` for `C-I-3-1` (Garnett), `C-I-3-2` (Kemper), `C-I-3-3` (Armistead): first record at tick 180 (`Line of March`, lat 39.8067-39.8089, lng -77.2917 = west of Gettysburg on the evening of July 1 by site label), `Bivouac` at 39.82/-77.2561 (Seminary Ridge) at ticks 400-451 (July 2 evening/night by site label). SS2 says Pickett "remained at Chambersburg guarding wagons, arrival expected July 3"; SS3 says Pickett's division arrived 9:00 am July 3; WPd2 says "on the night of July 2 ... Pickett's division [had arrived]" (probably Marsh Creek). Chronology t420 puts "Pickett's division moves into position behind Seminary Ridge" on the night of July 2 while t500 has it move up on the morning of July 3 - the site tells both.
2. **Site tick order vs. real order** (12 misordered events and 4 wrong-day events): section 7.4 lists suggested new ticks.
3. **Turning-points page** uses `tick: 175` for Ewell's decision (chronology has it at t75); at tick 175 the proposed clock is ~1:05 am July 2.
4. **Timeline marker "First shot" is at t17** (Calef's guns) while chronology/vignette/walkthrough place the first shot at t12 (`bundle.pretty.js:112193`).
5. **"Follow Your Ancestor"/history panel dates** print July 3/4/5 for July 1/2/3 (QF, `bundle.pretty.js:101006`); same in monument tooltips (JF).
6. **Metadata truthfulness.** `chronology_day*.json` `tick_formula` and `placement_schema.json ticks_per_day.*.real_time` state facts that are false; anything (tests, Historian, docs) that trusts them inherits the error.

---

## 6. Structure of the error (mathematical analysis)

### 6.1 Real minus label, by tick (matched events)

Per-day statistics of `real - JSON label` (hours) for the matched events (n = 36/33/33):

| Day | mean | sd | min | max | mean real - map clock |
|---|---|---|---|---|---|
| 1 | +3.78 | 1.64 | -0.33 | +6.08 | +2.86 |
| 2 | +7.88 | 0.84 | +5.83 | +9.50 | +8.84 |
| 3 | +2.70 | 1.37 | -0.67 | +3.92 | +2.64 |

Shape of delta(t) (from the 5.2 table):
- **Day 1:** -0.3 to +0.0 h at t1-t5; +1.5 to +1.5 h at t12; +2.1 to +3.4 h at t14-t37; +3.3 to +4.0 h at t38-t49; +4.9 to +5.9 h at t52-t58; +5.7 to +6.1 h at t60-t66; +5.0 to +5.8 h at t68-t90. The label is right at dawn and falls behind by ~4.25 min for every tick (real advances ~9.25 min per tick; label 5.0).
- **Day 2:** +1.5 h at t226 (composite row), then a **step of ~+4 to +5 h within the first 4-14 ticks** (t230-t240: +5.8 to +6.8 h; dawn to ~noon is squeezed into a handful of ticks), reaching **+7.7 to +9.2 h at t243-t280**, easing to **+6.7 to +9.5 h at t285-t340**. In the afternoon/evening block (t256-t340) real time advances ~4.6 min/tick overall, close to the nominal 5, but with local slopes from 0.8 to 12 min/tick.
- **Day 3:** -0.5 to +0.4 h at t451-t455; +0.9 to +2.5 h at t480-t516; **+2.9 to +3.9 h at t518-t558 (cannonade and charge)**; +3.7 to +3.8 h at t568-t569; -0.7 to -0.7 h at t650-t675 (label 6:40 pm and 8:05 pm are close to real).

### 6.2 Model comparison (per-day least squares on matched events)

| Model | Day 1 | Day 2 | Day 3 |
|---|---|---|---|
| Constant offset from JSON label (RMS) | 98 min | 50 min | 82 min |
| Best uniform line real = a + b*(tick-start) | a = 5.97 h, b = 9.25 min/tick, RMS 39 min | a = 13.08 h, b = 4.75, RMS 51 min | a = 6.39 h, b = 5.18, RMS 79 min |
| 33-anchor piecewise linear (all days, section 7) | overall RMS 47 min, mean abs 21 min | | |

Interpretation:
1. Day 1 is *nearly* a uniform dilation: 6:00 am + 9.25 min x (tick-1) fits with RMS 39 min for t1-t100 (so the map's 6:00 base was a sensible intercept; the slope 9.25 vs 5 is the real defect). Uniform 5-minute ticks are therefore off by a factor ~1.85 during the Day-1 fighting.
2. Day 2's intercept from a straight-line fit is nonsense (about 1 pm at t226): the morning is collapsed (t226-t240 = dawn to noon, ~32 min/tick) while the afternoon/evening block is dense and near-uniform. Any linear model fails; piecewise is required.
3. Day 3's morning slope (t451-t515) is ~5.5-8 min/tick, then there is a **gap** (t515-t518: 11:00 am to 1:07 pm = 42 min/tick) and a **stall** in the tail (t568-t675: 5:15 to 8:00 pm = 1.5 min/tick).

4. **Monotonicity.** Among matched events the number of tick pairs whose real order is reversed by more than 15 min is 1 / 10 / 10 (Days 1/2/3), *before* removing the 12 events already classed MISORDERED. Those reversals are content/ordering problems, not clock problems, and cannot be repaired by any tick-to-time function.
5. **Where the labels came from.** The chunk metadata says each chunk was authored for a label window (e.g. `placements_day1_ticks51_100.json`: "approximately 9:10am to 1:30pm"), i.e. the author compressed the story into a 5 am-8 pm window and hand-wrote labels (6 events even state the right time in their text while the label says another). The map's base-hour choice (6:00/4:00/4:00) is a separate later mistake (+-1 h versus the JSON labels).

---

## 7. Proposed anchor set (tick to real local time)

### 7.1 Anchors

Status: **S** solid (>=3 agreeing sources or OR primary + one more), **M** medium, **R** needs historian decision (range >45 min or conflict), **D** design anchor (no historical content; closes day boundaries and night). Times are local 1863 sun time.

| Tick | Local time | Status | Event | Evidence | Min/tick to next |
|---|---|---|---|---|---|
| 1 | Jul 1 5:00am | S | Heth's column leaves Cashtown (R003) | SS1, THJ; site label already 5:00am | 5.0 |
| 5 | Jul 1 5:20am | M | Archer/Davis lead Heth's column out of Cashtown (R003; site t5 label 5:20am) | SS1, THJ (5:00 departure); keeps the pre-7:30 slope realistic | 18.6 |
| 12 | Jul 1 7:30am | S | First shot, Lt. Marcellus Jones (R005) | HNj, SS1, WPd1, ABTa, THJ; site text/vignette/walkthrough already say 7:30 | 10.3 |
| 28 | Jul 1 10:15am | S | Reynolds killed (R012) | Doubleday OR 10.15; WPd1; site monument tooltip 10:15; dispute 10:40-10:50 | 5.6 |
| 36 | Jul 1 11:00am | S | Railroad Cut charge (R017) | WPd1 ~11am; SS1 10:45-11:00 | 12.4 |
| 53 | Jul 1 2:30pm | S | Iverson's Pits (R025) | SS1 2:30; WPd1 (Rodes 2:00); Doubleday OR (Schurz 2:30) | 7.5 |
| 57 | Jul 1 3:00pm | M | Barlow's Knoll overwhelmed (R027) | ABT map 2:45-4:30; WPd1; site monument says 2:30 | 8.6 |
| 64 | Jul 1 4:00pm | S | Pender/Perrin hit Seminary Ridge (R032) | WPd1, ABT map, Doubleday OR "About 4 p.m.", CWC | 2.5 |
| 72 | Jul 1 4:20pm | M | Hancock reaches Cemetery Hill (R035) | WPd1 "after 4:00"; SS1 ~4:00; search 4:00-4:30 | 13.3 |
| 75 | Jul 1 5:00pm | R | Lee's 'if practicable' order (R037) | SRCH "after 5 p.m."; WP no time | 4.0 |
| 90 | Jul 1 6:00pm | R | XII Corps/Johnson arrive (R038/R039) | SS1 5:30; SRCH Geary 5pm | 12.0 |
| 100 | Jul 1 8:00pm | D | Nightfall (sunset 7:32pm, civil twilight ends 8:04pm) | computed | 4.0 |
| 226 | Jul 2 4:30am | D | Day-2 start (first light) | computed | 32.1 |
| 240 | Jul 2 12:00pm | M | Berdan's probe / Pitzer's Woods (R046) | WPd2 "About noon"; SS2 Noon | 18.8 |
| 248 | Jul 2 2:30pm | R | Sickles's advance to Peach Orchard (R050) | range noon-3:30pm; SS2 noon, SRCH 2pm, V-007 3pm | 11.2 |
| 256 | Jul 2 4:00pm | S | Longstreet's assault: guns + Hood step off (R054/R056) | WPd2, LSTR OR, WORK OR, ABTa, Hall OR (Benner's Hill 4:00-4:15) | 2.7 |
| 267 | Jul 2 4:30pm | M | Vincent reaches Little Round Top (R059) | SS2 4:30, WP LRT, Cross | 11.2 |
| 275 | Jul 2 6:00pm | R | 20th Maine bayonet charge (R066) | contested 5:10pm - 7:00pm+; choose a defensible mid value and label as approximate | 6.0 |
| 280 | Jul 2 6:30pm | M | Peach Orchard salient collapses (R071) | WP Peach Orchard (marker 6:30), SS2 | 2.0 |
| 295 | Jul 2 7:00pm | M | Crawford counterattack (R076) | SS2 6:30-7:30; WP "at dusk" | 1.4 |
| 302 | Jul 2 7:10pm | M | 1st Minnesota's charge (R077) | SS2 6:30-7:00 block; LIT 7pm | 0.8 |
| 314 | Jul 2 7:20pm | S | Johnson attacks Culp's Hill (R080) | WPCH "around 7 pm"; ABT "by about 7:00"; SS2 | 3.3 |
| 326 | Jul 2 8:00pm | S | Early attacks East Cemetery Hill (R082) | WPd2 8pm; WPCem dusk 7:30; SS2 | 10.7 |
| 340 | Jul 2 10:30pm | M | Battlefield falls silent (R087) | WPd2 10:30pm | 3.2 |
| 451 | Jul 3 4:30am | S | XII Corps guns open on Culp's Hill (R091) | SS3 4:30; WPCH dawn; ABT dawn; sunrise 4:35am | 5.5 |
| 500 | Jul 3 9:00am | M | Pickett's division arrives (R094) | SS3 9:00 (single source; needs Wert/Hessler check) | 8.0 |
| 515 | Jul 3 11:00am | S | Culp's Hill fighting ends (R097) | WPmain ~11am; SS3 10-11; site text itself says 11:00am | 42.3 |
| 518 | Jul 3 1:07pm | S | Cannonade opens (R100) | HNp (multiple OR witnesses), SS3 1:07, NPS 1pm; site text/vignette/walkthrough say 1:00/1:07 | 5.7 |
| 538 | Jul 3 3:00pm | R | Infantry step-off (R108) | ABT 3:00; WPmain 3:00; SS3 2:30-3:00; WPPC 2:00; Longstreet OR ~2:00 | 2.7 |
| 551 | Jul 3 3:35pm | M | Armistead over the wall (R115) | ABT map 3:30-3:45; SS3 3:30-4:00; site monument 3:15 | 5.0 |
| 556 | Jul 3 4:00pm | M | Assault collapses / Lee meets survivors (R118) | SS3 4:00-6:00; ABT 4:00 map | 6.2 |
| 568 | Jul 3 5:15pm | M | Farnsworth's charge (R122) | ABT South Cavalry Field 5:15-6:00; SS3 5:30 | 1.5 |
| 675 | Jul 3 8:00pm | D | Nominal end of battle (sunset 7:32pm; twilight ends 8:04pm) | computed; Starr fight ~6pm |  |

Status counts: S 12, M 13, R 5, D 3. The five **R** anchors are t75 (Lee's order), t90 (XII Corps/Johnson), t248 (Sickles's advance), t275 (20th Maine charge) and t538 (infantry step-off); plus the Colgrove/Mudge time (t460), which is a content decision, not an anchor.

### 7.2 Goodness of fit and validation

- In-sample (all 102 matched events): mean abs 21 min, median 10 min, RMS 47 min; within 15/30/45/60 min: 61/86/93/96 of 102.
- Leave-one-out anchor prediction (non-design anchors): RMS 43.9 min; the least predictable anchors are t518 (+96 min), t340 (+93 min), t515 (-86 min), t451 (-77 min), t240 (+68 min), t568 (+51 min), t90 (-48 min) - mostly the ones next to gaps.
- Residuals above 45 min (9 events) are all events already flagged as contested or misordered: t230 (+321), t235 (+191), t324 (+157), t565 (-101), t650 (-81), t505 (+80), t455 (+53), t532 (-51), t480 (+50).
- Independent validation against the 30 hand-typed real clock claims: median gap 14 min (section 5.4).

### 7.3 Segment behaviour the UI must handle

- t226-t240: Jul 2 4:30am to Jul 2 12:00pm, 32.1 min/tick  **GAP** (auto fast-forward)
- t295-t302: Jul 2 7:00pm to Jul 2 7:10pm, 1.4 min/tick
- t302-t314: Jul 2 7:10pm to Jul 2 7:20pm, 0.8 min/tick  **STALL** (ticks denser than real events)
- t515-t518: Jul 3 11:00am to Jul 3 1:07pm, 42.3 min/tick  **GAP** (auto fast-forward)

Min/tick varies from 0.8 to 42; at "1x" (2 ticks/s) the sim clock therefore runs from 1.6 to 84 sim-minutes per second. The current label "1x (real time)" (`bundle.pretty.js:97429`) is false under every model (real time would be 1 sim-second per second).

### 7.4 Events to re-tick or move (suggested new tick = inverse of the anchor map at the event's real best time)

| Old tick | Site label | Class | Real best | Suggested tick | Action |
|---|---|---|---|---|---|
| 243 | 6:25am | MISORDERED | Jul 2 3:45pm | ~255 | Move after t252 (Meade confrontation) or keep at t255 (Hood deployed just before step-off) |
| 273 | 8:55am | MISORDERED | Jul 2 5:20pm | ~271 | Swap with t270-t272 ordering (16th Michigan wavers before O'Rorke) |
| 283 | 9:45am | MISORDERED | Jul 2 5:30pm | ~272 | Move before t278 (Kershaw precedes Barksdale) |
| 298 | 11:00am | MISORDERED | Jul 2 6:15pm | ~278 | Move before t293 |
| 304 | 11:30am | MISORDERED | Jul 2 6:50pm | ~290 | Move before t302 |
| 310 | 12:00pm | MISORDERED | Jul 2 12:30pm | ~242 | Move to ~t242 (Stuart arrives ~12:30 pm) |
| 335 | 1:55pm | MISORDERED | Jul 2 7:10pm | ~302 | Move to ~t302 (Willard/Barksdale ~7:10 pm) |
| 360 | 3:20pm | WRONG-DAY | Jul 3 4:30am | ~451 | Move to Day 3 ~t451 (Lee/Longstreet at dawn); keep a short evening note "Lee decides to renew the attack" ~t345 |
| 380 | 4:20pm | WRONG-DAY | Jul 3 11:30am | ~516 | Move to Day 3 ~t516 (Alexander positions guns late morning) |
| 400 | 5:20pm | MISORDERED | Jul 2 9:30pm | ~334 | Move to ~t334 (council of war ~9:30 pm) |
| 420 | 6:20pm | WRONG-DAY | Jul 3 9:00am | ~500 | Move to Day 3 ~t500 (Pickett arrives ~9 am); delete the July-2-evening "moves into position" placement |
| 460 | 5:45am | MISORDERED | Jul 3 10:30am | ~511 | Move to ~t511 (Colgrove ~10:30 am) after historian check |
| 490 | 7:35am | MISORDERED | Jul 3 11:00am | ~515 | Move to ~t515 |
| 560 | 12:55pm | MISORDERED | Jul 3 1:30pm | ~522 | Move to ~t522 (East Cav opens ~1:30 pm) or split into "opens" (t522) and "Hampton/Custer climax" (t538) |
| 563 | 1:10pm | MISORDERED | Jul 3 3:00pm | ~538 | Move to ~t538 (climax ~3:00 pm) |

Also t8 (Heth/Hill conversation - belongs to June 30 evening; delete or move to a "the night before" card) and the 9 composites (t50, t95, t100, t226, t270, t278, t440, t516, t620): split each into one card per real event.

Caution: moving a *chronology entry* is metadata only, but the placements for the events that have "density" passes (Angle t546-t558, LRT t256-t310, etc.) are already aligned with their ticks; re-ticking is only safe where the visual state at the new tick matches the story (spot-check with the map).

### 7.5 Data format and display rules (spec)

`public/data/time_anchors.json` (single source of truth; used by app, static pages, tests, historian):

```json
{
  "meta": {"version": 1, "epoch": "1863-07-01", "clock": "local sun time as reported in sources; +-15 min typical", "sunrise": "04:35", "sunset": "19:32", "civil_dawn": "04:03", "civil_dusk": "20:04", "nautical_dusk": "20:46"},
  "anchors": [
    {"tick": 1, "t": "1863-07-01T05:00", "status": "S", "label": "Heth's column leaves Cashtown (R003)"},
    {"tick": 5, "t": "1863-07-01T05:20", "status": "M", "label": "Archer/Davis lead Heth's column out of Cashtown (R003; site t5 label 5:20am)"},
    {"tick": 12, "t": "1863-07-01T07:30", "status": "S", "label": "First shot, Lt. Marcellus Jones (R005)"},
    {"tick": 28, "t": "1863-07-01T10:15", "status": "S", "label": "Reynolds killed (R012)"},
    {"tick": 36, "t": "1863-07-01T11:00", "status": "S", "label": "Railroad Cut charge (R017)"},
    {"tick": 53, "t": "1863-07-01T14:30", "status": "S", "label": "Iverson's Pits (R025)"},
    {"tick": 57, "t": "1863-07-01T15:00", "status": "M", "label": "Barlow's Knoll overwhelmed (R027)"},
    {"tick": 64, "t": "1863-07-01T16:00", "status": "S", "label": "Pender/Perrin hit Seminary Ridge (R032)"},
    {"tick": 72, "t": "1863-07-01T16:20", "status": "M", "label": "Hancock reaches Cemetery Hill (R035)"},
    {"tick": 75, "t": "1863-07-01T17:00", "status": "R", "label": "Lee's 'if practicable' order (R037)"},
    {"tick": 90, "t": "1863-07-01T18:00", "status": "R", "label": "XII Corps/Johnson arrive (R038/R039)"},
    {"tick": 100, "t": "1863-07-01T20:00", "status": "D", "label": "Nightfall (sunset 7:32pm, civil twilight ends 8:04pm)"},
    {"tick": 226, "t": "1863-07-02T04:30", "status": "D", "label": "Day-2 start (first light)"},
    {"tick": 240, "t": "1863-07-02T12:00", "status": "M", "label": "Berdan's probe / Pitzer's Woods (R046)"},
    {"tick": 248, "t": "1863-07-02T14:30", "status": "R", "label": "Sickles's advance to Peach Orchard (R050)"},
    {"tick": 256, "t": "1863-07-02T16:00", "status": "S", "label": "Longstreet's assault: guns + Hood step off (R054/R056)"},
    {"tick": 267, "t": "1863-07-02T16:30", "status": "M", "label": "Vincent reaches Little Round Top (R059)"},
    {"tick": 275, "t": "1863-07-02T18:00", "status": "R", "label": "20th Maine bayonet charge (R066)"},
    {"tick": 280, "t": "1863-07-02T18:30", "status": "M", "label": "Peach Orchard salient collapses (R071)"},
    {"tick": 295, "t": "1863-07-02T19:00", "status": "M", "label": "Crawford counterattack (R076)"},
    {"tick": 302, "t": "1863-07-02T19:10", "status": "M", "label": "1st Minnesota's charge (R077)"},
    {"tick": 314, "t": "1863-07-02T19:20", "status": "S", "label": "Johnson attacks Culp's Hill (R080)"},
    {"tick": 326, "t": "1863-07-02T20:00", "status": "S", "label": "Early attacks East Cemetery Hill (R082)"},
    {"tick": 340, "t": "1863-07-02T22:30", "status": "M", "label": "Battlefield falls silent (R087)"},
    {"tick": 451, "t": "1863-07-03T04:30", "status": "S", "label": "XII Corps guns open on Culp's Hill (R091)"},
    {"tick": 500, "t": "1863-07-03T09:00", "status": "M", "label": "Pickett's division arrives (R094)"},
    {"tick": 515, "t": "1863-07-03T11:00", "status": "S", "label": "Culp's Hill fighting ends (R097)"},
    {"tick": 518, "t": "1863-07-03T13:07", "status": "S", "label": "Cannonade opens (R100)"},
    {"tick": 538, "t": "1863-07-03T15:00", "status": "R", "label": "Infantry step-off (R108)"},
    {"tick": 551, "t": "1863-07-03T15:35", "status": "M", "label": "Armistead over the wall (R115)"},
    {"tick": 556, "t": "1863-07-03T16:00", "status": "M", "label": "Assault collapses / Lee meets survivors (R118)"},
    {"tick": 568, "t": "1863-07-03T17:15", "status": "M", "label": "Farnsworth's charge (R122)"},
    {"tick": 675, "t": "1863-07-03T20:00", "status": "D", "label": "Nominal end of battle (sunset 7:32pm; twilight ends 8:04pm)"}
  ],
  "gaps": [{"from": 226, "to": 240, "policy": "fast_forward"}, {"from": 515, "to": 518, "policy": "fast_forward"}]
}
```

Display rules: (1) show the clock rounded to 5 minutes and prefixed "c." or "about" when the nearest anchor is status R or the event's confidence is L; (2) never show seconds or minutes finer than 5; (3) date always derived from the model (July 1-4, 1863; fix the +2 bug); (4) hover/tap on the clock explains: "Times are approximate; sources disagree by 15-30 minutes. See Sources & Times."; (5) show sunrise/sunset glyphs on the timeline; (6) day chips jump to model-derived first light of each day (t1, t226, t451), not to 5:00/6:00/4:00 constants.

---

## 8. Plan items (fix specs)

Each item: evidence, root cause, exact fix, effort (S<0.5d, M 0.5-2d, L 2-5d, XL >5d), acceptance test, metric/grade moved, dependencies, audit refs. IDs follow `time-facts-NN`.

### time-facts-01 - One time model: anchors file + module replacing the six code implementations (critical, L)
- **Evidence:** section 2.1 (A-F); `bundle.pretty.js:9371-9383, 97428, 100836-100843, 100998-101007, 9856-9861`; `compare.html:120-128`; `living-ledger.html:135-143`; `camera.html:175-179`.
- **Root cause:** each surface re-implemented tick to clock with different constants; none used real time; N1 (no source for the bundle) means every fix is a patch to the reconstructed source or minified bundle.
- **Fix:** create `src/time/timeModel.js` (or a plain ES module also loadable by static pages) exporting `tickToMinutes(tick)`, `minutesToTick(min)`, `dayOf(tick)`, `formatClock(tick, {approx})`, `lightingHour(tick)`, `isGap(tick)`. Implementation: binary search over `anchors` with linear interpolation; extrapolate at 5 min/tick outside; validate monotonic on load. Replace: `getTickTime` (9371), header badge (97428: use `formatClock(tick).dateLabel`), `JF` (100836), `QF` (100998), `M4` (9856, return `lightingHour`), compare/living-ledger/camera formulas. Ship the module once via `site-nav.js` or `/assets/time-model.js` with a long cache lifetime and load `time_anchors.json` (small, cacheable).
- **Sketch:**
```js
const A = anchors.map(a => ({ tick: a.tick, m: Date.parse(a.t + ':00Z') / 60000 }));  // minutes on a fixed epoch
export function tickToMinutes(t) {
  if (t <= A[0].tick) return A[0].m - (A[0].tick - t) * 5;
  let lo = 0, hi = A.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; (A[mid].tick <= t ? lo = mid : hi = mid); }
  const a = A[lo], b = A[hi];
  if (t >= b.tick) return b.m + (t - b.tick) * 5;
  return a.m + (b.m - a.m) * (t - a.tick) / (b.tick - a.tick);
}
```
- **Acceptance test:** unit tests: anchors strictly non-decreasing; `formatClock(12)` = "July 1, 1863, 7:30 AM"; `formatClock(538)` = "July 3, 1863, c. 3:00 PM"; property test that every `time-facts.csv` core row with linked ticks has |model - best| <= 45 min or inside [lo, hi]; grep test: no `+ 2` date arithmetic and no `* 5` clock arithmetic outside the module; Playwright: header at t538 shows "July 3, 1863" and 3:00 PM.
- **Metric/grade:** Function/accuracy A+ (C3, C4); credibility; removes 6 duplicate code paths (maintainability). No performance effect (<1 KB).
- **Depends on:** historian sign-off for R anchors (time-facts-05) for final values, but can ship with the current anchor set.
- **audit_refs:** C3, C4, H9, N1.

### time-facts-02 - Fix the date +2 bug and day roll-over (critical, S)
- **Evidence:** `bundle.pretty.js:97428` (`July ${l + 2}, 1863`), `:100842` (`July ${f + 2}`), `:101006` (`July ${f + 2}`); `:9371-9383` prints "July 1, 12:40 AM" at tick 225.
- **Root cause:** an off-by-two constant (day index 1..3 treated as July 3..5); no date carry for times past midnight.
- **Fix:** replace with `formatClock(tick).dateLabel` from time-facts-01 (date derives from absolute minutes so the 12:40 am wrap becomes July 2). If time-facts-01 is delayed, hot-patch the three sites to `July ${l}` / `July ${f}` (one-character edits) - safe because nothing else depends on the +2.
- **Acceptance test:** at ticks 1, 226, 451 the header, monument tooltip and history panel read July 1/2/3; tick 225 reads July 2; Follow-Your-Ancestor for the 20th Maine shows "July 2" at Little Round Top.
- **Metric/grade:** Function A+ (C3); trust. **Effort S** (patch) or included in 01. **audit_refs:** C3.

### time-facts-03 - Re-derive every chronology label and embedded time from the model (critical, M)
- **Evidence:** section 5.2 (137 rows; mean error 4.8 h); `chronology_day1..3.json` `time`; 6 TEXT-VS-LABEL rows (t12, t38, t314, t326, t515, t518); metadata `tick_formula` (`chronology_day1.json:5`).
- **Root cause:** labels hand-authored (G) plus false metadata.
- **Fix:** write `scripts/relabel_chronology.mjs`: (1) for each event compute `time = formatClock(tick)`; keep the old string as `time_legacy`; (2) scan `event`/`narrative` text for `\d{1,2}(:\d{2})? ?(am|pm)` and report mismatches > 30 min against the model; (3) fix text where it contradicts (t12: label vs "7:30"; t38 "Noon lull"; t314/t326 "at dusk"; t515 "11:00am"; t518 "1:00pm"; t100 "~11pm" -> "after midnight (about 1 a.m.)"); (4) replace `metadata.tick_formula` with "Times derive from time_anchors.json"; (5) same for `placement_schema.json ticks_per_day.*.real_time` and each `placements_*.json` chunk description. Dry-run first; emit a diff for owner review.
- **Acceptance test:** script exits 0 with zero text/clock mismatches; CI job reruns it; snapshot of labels for the 13 key ticks in section 2.2.
- **Metric/grade:** Content accuracy A+; internal consistency. **Depends on:** 01. **audit_refs:** C4.

### time-facts-04 - Re-tick 15 misordered/wrong-day chronology entries and split 9 composites (high, M)
- **Evidence:** section 7.4; section 5.3 notes; t310 Stuart arrives ~12:30 pm sits among the 7 pm events; t360/t380/t420 are July-3 events labelled July 2; t560/t563 East Cavalry Field precedes the infantry step-off in real time; t8 is a June-30 conversation.
- **Root cause:** narrative ordering by theme rather than time; Day 2's tail (t341-t450) used as a dumping ground.
- **Fix:** apply the suggested-tick table (7.4) after historian confirmation; split composites (t50, t95, t100, t226, t270, t278, t440, t516, t620) into one card per real event with its own time; convert t8 into a "the night before" card or delete; for t525/t530 correct or remove the unverifiable quotes (see 06). Keep `vignettes_*.json.trigger_tick` in sync (V-022 t460 -> ~t511 pending check; V-015: the first real note (1:25 pm) maps to t~521 and the second (1:35 pm) to t~523, so the current trigger t525 (1:47 pm under the model) is acceptable).
- **Acceptance test:** for every matched event |model(tick) - real best| <= 45 min or inside its range; zero MISORDERED/WRONG-DAY rows in a re-run of `analyze.py`; strictly non-decreasing real times along tick order for core events.
- **Metric/grade:** Content accuracy A+ (C4); narrative coherence. **Depends on:** 01, 05. **audit_refs:** C4.

### time-facts-05 - Historian review queue and sign-off workflow (high, M)
- **Evidence:** section 4 (33 disagreements), 5 R anchors, 45 L-confidence rows, 5 L-tagged rows never verified.
- **Root cause:** several key times are genuinely contested and this session could not read Pfanz/Coddington/Sears/Hessler/Wert/Gottfried/Busey-Hartwig/OR.
- **Fix:** hand the owner (or a hired historian/NPS-licensed guide) the CSV filtered to `confidence=L OR verification_tag in (S,L)` plus the register; for each, record decision, source with page number, and a display string ("about 6:15 pm"). Store decisions in `time-facts-decisions.json` (id, decision, citation, reviewer, date) and let the model read display strings. Priority order: #17 (20th Maine), #23 (step-off), #25 (Colgrove), #11 (Sickles), #12/#13 (Longstreet/Warren), #3 (Reynolds), #30 (Pickett), #10 (Lee order).
- **Acceptance test:** decisions file has an entry for every L row; R anchors reduced to 0 or explicitly accepted; CSV `verification_tag` no longer contains S or L for core rows.
- **Metric/grade:** Credibility/accuracy A+; unlocks 01 final values. **audit_refs:** C4.

### time-facts-06 - Vignette and chronology text corrections found during time checking (high, S)
- **Evidence:** V-022 "approximately 7:30 in the morning of July 3" (`vignettes_part3.json`); V-020 "exactly eight days" and V-021 "eight days ... four days"; `chronology_day3.json` t525/t530 quotes; `chronology_day2.json` t324 "Night attack repossesses most of the upper works"; `chronology_day1.json` t100 "Meade arrives at ~11pm".
- **Root cause:** LLM-authored narrative not checked against sources.
- **Fix:** V-022 -> "in the late morning" (or the historian-confirmed time); V-020/V-021 -> "four days" (Custer's commission and Farnsworth's nomination date to June 29; per Wikipedia bios); t525 quote -> the real first note "If you are coming at all, come at once, or I cannot give you proper support, but the enemy's fire has not slackened at all. At least eighteen guns are still firing from the cemetery itself." (1:25 pm) and t530 -> "For God's sake, come quick. The 18 guns are gone." (1:35 pm); remove the unmatched "I would not make the charge now" line unless a citation is found; t324 and t100 rewritten per section 5.3.
- **Acceptance test:** grep tests for the removed strings; each quote carries a citation field.
- **Metric/grade:** Content accuracy; professional voice. **audit_refs:** C4, H7.

### time-facts-07 - Re-derive hand-typed real times in walkthrough, monuments, markers, turning points, sandbox (medium, M)
- **Evidence:** section 5.4: walkthrough `bundle.pretty.js:100065-100313`; monuments `:100617-100835` (Cushing 3:00, Armistead 3:15, Hancock 3:20 pm each 15-35 min early; Barlow 2:30 pm at t63 vs ~3:00 pm); timeline markers `:112188-112200` ("First shot" at t17); `turning-points.html:53-93` (Ewell t175, Cannonade t540, Charge t560); `sandbox.html:104-106` (labels "mid-afternoon (tick 260)", "~3:00pm (tick 553)", "mid-morning (tick 62)" are all wrong under the model).
- **Root cause:** ticks chosen independently of any clock; subtitle times typed by hand.
- **Fix:** store `time` for each stop/monument as an ID reference into `time-facts` rows (event id -> tick via `minutesToTick(best)`), and generate subtitles from the model. Corrections: stop 2 -> tick ~t53 (or change narrative to the morning Oak Ridge arrival); stop 4 -> ~t64; stops 7/8 reorder (Peach Orchard after Wheatfield start ~t278/t285); stop 13 -> ~t538 for the climax; stop 16 date "July 4-5" needs a July 4 tick range (see 09); monuments Cushing/Armistead/Hancock -> ~3:30/3:35/3:40 pm; marker "First shot" -> t12; turning points -> t75/t256/t275/t518/t538; sandbox labels generated from `formatClock`.
- **Acceptance test:** script diff shows all hand-typed times replaced by generated ones; walkthrough stop N shows the same clock as the header when jumped to.
- **Metric/grade:** Consistency A+ (H13/D3 area). **Depends on:** 01. **audit_refs:** C4, H13.

### time-facts-08 - Drive day/night tint and sun/moon from real hours (medium, S)
- **Evidence:** `bundle.pretty.js:9856-9884` (M4/E4), `:9903` (C4); `camera.html:175-190` uses a similar model; section 3.2 (sunrise 4:35, sunset 7:32, civil dusk 8:04, nautical dusk 8:46, moon ~full).
- **Root cause:** hour comes from the 5:00-base formula, so dusk assaults render in afternoon light (t314-t330 = 12.3-13.3 h).
- **Fix:** `lightingHour(tick)` from 01; replace the hard-coded thresholds with a function of `meta.sunrise/sunset/civil_*` from the anchors file (pre-dawn blue 4:03-4:35, warm 4:35-5:30, day, warm 17:30-19:32, twilight 19:32-20:04, dark 20:04-20:46, night after); optional moon glow (full-ish, "smoke obscured").
- **Acceptance test:** screenshot tests at t314 (7:20 pm: amber-violet), t326 (8:00 pm: deep dusk), t451 (4:30 am: pre-dawn), t538 (3:00 pm: none). Contrast checks on overlays.
- **Metric/grade:** polish/UX; historical immersion. **Depends on:** 01. **audit_refs:** C4.

### time-facts-09 - Playback semantics, gaps, and July 4 (medium, M-L)
- **Evidence:** `cF = 500` ms/tick (`bundle.pretty.js:96948`, `:96973`); speed label `:97429`; `chronology_day3` ends t675 (8:05 pm July 3) while walkthrough stop 16 and V-024 speak of July 4-5.
- **Root cause:** playback is tick-driven; the label claims "real time".
- **Fix:** (a) relabel speeds as "sim-minutes per second" using the local min/tick, or (b) add a "Clock time" mode: advance `simMin += dt*speed`, `tick = minutesToTick(simMin)` with fractional tick interpolation (the app already has an InterpolationWorker chunk); (c) honour `gaps` (t226-t240, t515-t518) with auto fast-forward and a "quiet interval" caption; (d) optional Day 4 stub: ticks 676+ (July 4: rain, Imboden 4 pm, infantry after sunset) so the retreat is on the timeline rather than in captions.
- **Acceptance test:** at speed "60 sim-min/s" 1 second advances the clock by 1 hour +-1%; at t515 playback accelerates through the gap; the label never says "real time".
- **Metric/grade:** UX/accuracy (H9). **Depends on:** 01. **audit_refs:** H9.

### time-facts-10 - Placement audit for arrival/timing errors (high, M-L)
- **Evidence:** section 5.5-1 (Pickett `C-I-3-1..3`: Line of March t180, Bivouac t400-451); `density_reserves.json` (VI Corps arriving July 2), `placements_day2_ticks376_450.json` description ("Pickett's division moving into position behind Seminary Ridge ... Alexander preparing artillery").
- **Root cause:** placements were generated from the same compressed narrative.
- **Fix:** script `audit_placements.py`: for each corps/division/brigade with an arrival in the real-time table (Heth 5 am; I Corps ~10-noon; XI Corps noon-1 pm; XII Corps 5 pm-; III/II/V/VI/Pickett/Stuart per SS1-SS3) find the first placement tick, convert via the model, and list discrepancies > 90 min. Then patch positions (delete pre-arrival records or move first appearance). Resolve Pickett (#30) first.
- **Acceptance test:** audit script reports zero > 90 min discrepancies for the tabulated arrivals; Pickett's brigades absent from Seminary Ridge until the historian-confirmed arrival tick.
- **Metric/grade:** Historical accuracy A+. **Depends on:** 01, 05. **audit_refs:** C4.

### time-facts-11 - Static sub-pages use the shared model (medium, S-M)
- **Evidence:** `compare.html:120-128` (5:00-base, note "Ticks are 5-minute intervals starting 5:00am"; page copy suggests "Union line at 4:00pm vs. 6:00pm on Day 2" - meaningless under that formula), `living-ledger.html:135-143` (`July ${dayIdx + 1}` and 5:00 AM), `camera.html:175-179`, `documentary.html` (reads vignette text), `sandbox.html:104-106`.
- **Fix:** import the shared module; Compare tick sliders show model clock and event captions; Compare copy examples rewritten (e.g. "Longstreet steps off (t256, about 4:00 pm) vs. the Peach Orchard falls (t280, about 6:30 pm)").
- **Acceptance test:** all sub-pages show identical clocks for the same tick (Playwright cross-page check); no `* 5` clock arithmetic in `*.html`.
- **Metric/grade:** Consistency; audit S4 area. **Depends on:** 01. **audit_refs:** C4, S4.

### time-facts-12 - CI contract tests and lint for time claims (medium, M)
- **Fix:** add `tests/time-contract.test.mjs`: (1) anchors monotone; (2) every chronology/vignette/walkthrough/monument time string parsed and compared with the model (tolerance 30 min; contested rows use their range); (3) every `time-facts.csv` core row's `linked_site_ticks` within range; (4) JSON schema for `time_anchors.json` and `time-facts-decisions.json`; (5) forbidden patterns (`+ 2` date offsets, `4 * 60` / `6 * 60` base constants); (6) Playwright smoke: headline ticks show expected clock and date; (7) report of un-cited events.
- **Acceptance test:** CI red on an injected +2 offset and on a mislabelled chronology entry.
- **Metric/grade:** reliability/regression prevention. **Depends on:** 01, 03. **audit_refs:** C3, C4.

### time-facts-13 - Time display UX and disclosure (low-medium, S-M)
- **Fix:** section 7.5 rules: "c."/"about" prefix and tooltip; 5-minute rounding; explanatory "Sources & Times" page listing key anchors with sources and ranges (this report's table minus internal notes); show date + time + day chip consistently; timeline hour ticks and sunrise/sunset glyphs; accessible labels ("July 3, 1863, about 3:00 PM").
- **Acceptance test:** axe passes on the clock/timeline; snapshots.
- **Metric/grade:** UX/accessibility/polish; transparency. **Depends on:** 01. **audit_refs:** C4, A2.

### time-facts-14 - Feed the real-time table to "Ask the Historian" (medium, M)
- **Fix:** convert `time-facts.csv` into `data/historian/events.json` (`id, date, start, end, best, confidence, sources[], disagreements[]`); the Historian answers "when did X happen" from it, always quoting a range and citing sources; add questions to the evaluation set (e.g. "What time did Pickett's Charge begin?" must answer "between about 2:00 and 3:00 pm; most accounts ~3:00 pm" with citations, not "11:05am").
- **Record shape (example):**
```json
{"id": "R108", "title": "Pickett-Pettigrew-Trimble infantry advance begins", "date": "1863-07-03",
 "start": "14:00", "end": "15:00", "best": "15:00", "confidence": "M",
 "display": "about 3:00 PM (some accounts as early as 2:00)",
 "disagreements": ["Wikipedia Pickett's Charge: about 2:00 (Coddington p.502; Hess p.162; Sears p.415; Wert p.182); ABT and Wikipedia main: about 3:00 (Coddington p.402; McPherson p.662; Eicher p.546; Trudeau p.484; Walsh p.281)"],
 "sources": [{"key": "ABT-July3", "quote": "stepped off in unison at about 3:00 p.m."}]}
```
- **Acceptance test:** 40-question "when" eval set passes >= 95% with range-aware answers.
- **Metric/grade:** Historian accuracy; supports expansion plan. **Depends on:** 05. **audit_refs:** H8.

### time-facts-15 - Option B (only if uniform ticks are required): resample placements to uniform real-time ticks (low priority, XL)
- **Why:** if the owner wants "1 tick = 5 real minutes" everywhere, resample the 430k placement records to a uniform 5-min grid (July 1 5:00 am to July 4 midnight is ~ 840 ticks) using the model plus the existing interpolation logic.
- **Recommendation:** not now; the anchor approach achieves the same user-visible result without touching 430k records.

---

## 9. Open questions for the owner / historian

1. Accept the five R anchors (t75, t90, t248, t275, t538) as approximate, or decide them? In particular the 20th Maine time (5:10 pm to after 7 pm across sources) and the step-off (2:00 vs 3:00 pm).
2. Confirm Colgrove's charge time (10:00-11:30 am per Sears via Wikipedia vs 6:00 am SS3 vs the site's 7:30 am) with Pfanz Culp's Hill pp.310-25.
3. Pickett: when did each brigade reach Marsh Creek and Seminary Ridge? (drives placements and t420/t500).
4. Should Day 4 (July 4, retreat) be added as ticks 676+?
5. Which time convention to display - local sun time as reported (recommended) - and are "about" prefixes acceptable?
6. Is `Sickles's advance` best shown as 2:30 pm (midpoint) or with an explicit range "between noon and 3:30"?

### 9.1 Reading list to close the L / S rows (what to verify where)

The site's own data files already cite most of these (`chronology_day*.json` and OOB metadata list Pfanz, OR vols. 27 parts I-II, Busey and Martin, Hartwig, Hessler, Wert, Alexander, Gottfried, Coddington, Sears), so a historian can work from a list the owner already trusts:
- **July 1 morning/midday and the Iron Brigade/Railroad Cut times:** Pfanz, *Gettysburg: The First Day* (the times Wikipedia footnotes to pp.52-56, 57-59, 74, 77-78, 100-101, 137, 275-76, 311-17); Martin (pp.63-64, 82-88, 341, 386-93, 404-26 as cited by Wikipedia); OR 27/1 reports of Buford, Doubleday, Wadsworth, Cutler, Hall, Dawes, Howard, Schurz, Barlow.
- **July 1 evening (Lee's order, Johnson, XII Corps, Meade's arrival):** Pfanz, *Culp's Hill and Cemetery Hill*; OR 27/2 (Ewell, Early, Rodes, Johnson); Coddington.
- **July 2 (Sickles, Longstreet, Little Round Top, Wheatfield, Peach Orchard):** Pfanz, *The Second Day* (pp.106-107, 158-67, 351-63 as cited); Hessler, *Sickles at Gettysburg* (Sickles's advance time); Desjardin, *Stand Firm Ye Boys from Maine* and Oates's account (20th Maine and 15th Alabama times); OR 27/1 (Warren, Sykes, Vincent/Rice, Chamberlain, Hazlett/Rittenhouse) and 27/2 (Longstreet, McLaws, Hood, Law, Oates).
- **July 3 (Culp's Hill, cannonade, charge, cavalry):** Pfanz, *Culp's Hill and Cemetery Hill* (pp.310-25 for Colgrove); Wert, *Gettysburg: Day Three*; Hessler and Motts, *Pickett's Charge at Gettysburg* (step-off, Alexander's notes, Angle); Coddington (pp.402, 485, 493, 500-502); Sears (pp.366-68, 377-83, 415); Hess; Alexander, *Fighting for the Confederacy*; OR 27/1-2 (Hunt, Hancock, Gibbon, Webb, Alexander, Pendleton, Gregg, Custer, Kilpatrick, Farnsworth).
- **Brigade/unit arrival times for the placements audit:** Gottfried (Brigades of Gettysburg; Maps of Gettysburg, time-stamped maps), Busey and Martin (strengths/losses), NPS unit histories.
- **NPS:** the NPS Gettysburg Seminar Papers (npshistory.com; unreachable this session) and NPS Historic Resource/Cultural Landscape reports are the expected authoritative NPS sources for the July 1 times.

---

## 10. Reproducibility

`tmp-time-facts/` contains: `events.py` (master table + tags), `site_map.py` (site tick to real event and class with notes), `analyze.py` (deltas, fits), `anchors.py` (anchor set, residuals, leave-one-out), `outputs.py` (CSV writers, other-claims tables), `build_report.py` (this file), `solar.py` (NOAA calculation), `site_side.py` (label/formula/map-clock drift), `wiki/` (raw wikitext of the Wikipedia pages used) and extracted `chron_dump.txt`, `vig_dump.txt`. Re-run: `python outputs.py && python build_report.py`.

Sources consulted (URLs): nps.gov/gett/learn/historyculture/official-report-of-major-general-abner-doubleday.htm, -of-captain-james-a-hall.htm, -of-colonel-charles-s-wainwright.htm, -of-lieut-general-james-longstreet.htm, -of-colonel-philip-a-work.htm, -of-colonel-henry-c-cabell.htm, -of-colonel-wesley-hodges.htm; nps.gov/articles/000/alonzo-cushing-gettysburg.htm; nps.gov/gett/learn/historyculture/gettysburg-overview.htm and east-cavalry-field.htm; battlefields.org articles july-1/2/3-1863, defense-little-round-top, custers-stand-east-cavalry-field and maps gettysburg-fight-barlows-knoll-july-1-1863-245pm-430pm, gettysburg-devils-den-and-little-round-top-july-2-1863-430pm-530pm, gettysburg-wheatfield-and-peach-orchard-july-2-1863-545pm-630pm, gettysburg-picketts-charge-july-3-1863-330-345-pm, gettysburg-south-cavalry-field-july-3-1863, gettysburg-east-cavalry-field-july-3-1863; gettysburg.stonesentinels.com/timeline-battle-july-1|2|3; historynet.com (first shot; little-round-top; just-pickett-charged; 20th-maine); en.wikipedia.org (raw wikitext via API); civilwarcycling.com day-1 summary; thehistoryjunkie.com timeline; emergingcivilwar.com pages (no clock times found); web-search summaries for LRT/20th Maine, Meade's arrival, Lee's order, Imboden.


---

## Verification

Adversarial verifier pass, 2026-09-30. Scope: re-opened `bundle.pretty.js` lines, DEPLOY_DIR files (`data/*.json`, static pages, `sw.js`, `netlify.toml`), the four report CSVs, cross-specialist reports (`bundle-anatomy.md`, `data-integrity.md`, `perf-runtime.md`), and live sources (Wikipedia raw wikitext via API, NPS Doubleday/Longstreet OR pages, ABT, HistoryNet, Stone Sentinels SS2/SS3, Pickett's Division monument text). Scratch scripts: `tmp-verify-time-facts/`. Nothing else was modified.

Overall: the core diagnosis is real and well evidenced (six-plus divergent tick-to-clock functions, +2 date bug, labels off by hours, lighting fed the wrong hour). All cited `bundle.pretty.js` line numbers I checked are exact (9371-9383, 9856-9903, 96948, 97428/97429, 100836-100843, 100998-101007, 100889, 101078, 112188-112200, 100065-100313, 100617-100835). I reproduced the headline statistics from the CSVs. What needs correcting: (1) accuracy figures are in-sample and partly circular; (2) the spec'd clock string format would break the mobile clock; (3) the proposed delivery (unhashed `/assets/time-model.js`, in-place bundle hot-patch) would never reach returning visitors because of `immutable` + service-worker cache-first; (4) one factual claim about vignette V-015 is wrong and one about "430k placement records" is false; (5) the Pickett findings are stated more firmly than the evidence supports; (6) several time consumers and site copy claims were missed.

### Verdict table

| ID | Verdict | Evidence / correction |
|---|---|---|
| time-facts-01 | CORRECTED | Code evidence CONFIRMED (all lines exact; `R = (P === 1 ? 6 * 60 : 4 * 60) + H` at 9377; M4 5:00 base at 9856-9860). Stats reproduced: label mean 4.79 h / 5 of 102 within 30 min; map clock 4.82 h / 1 of 102; 5-min formula 4.52 h / 7 of 102; anchors 21.3 min mean / 86 of 102. Corrections: (a) the 21-min figure is in-sample: 30 of the 102 matched events sit on anchor ticks (residual 0 by construction); for the 72 non-anchor events mean is 28.8 min, median 17.5, RMS 55 min, 56/72 within 30 min. 32 of the 102 "real" comparators are the specialist's own `custom` estimates (several tagged LIT), not sourced rows. (b) The "independent" 30-claim validation (median 14.5 min, 21/30 within 30) includes 11 claims on anchor ticks (7 are exactly 0 by construction; the t12/t28/t267/t518/t538/t551 anchors were chosen using the same site claims as evidence); excluding them: median 27 min, 12/19 within 30 min. The conclusion (proposed clock is far closer than the map clock's 214-min median) still holds. (c) The spec'd `formatClock` string "July 1, 1863, 7:30 AM" breaks the mobile clock: `bundle.pretty.js:102976-102977` does `Es = he(); Xa = Es.split(", ")[1] \|\| Es` (he = getTickTime), so the mobile clock would render "1863". Desktop timeline (112226) and toolbar (113054) print the raw string. Either keep getTickTime's `July N, h:mm AM` contract or change 102977. (d) Delivery: see MISSED-3 (an unhashed `/assets/time-model.js` will be stale forever; also avoid a 31st JSON fetch on first paint: inline the 33 anchors into the bundle and site-nav.js, keep `time_anchors.json` as the build-time source). (e) "six implementations" undercounts: immersive.html:169-173 is a fourth static copy (MISSED-5). Effort L is realistic only if the bundle patch + 4 static pages + tests are included; the module itself is S. |
| time-facts-02 | CORRECTED | Root cause CONFIRMED: `July ${l + 2}` (97428), `July ${f + 2}` (100842, 101006); getTickTime prints "July 1, 12:40 AM" at t225 (hand-checked: R = 1480 min, hour 0). "Nothing else depends on +2" verified (R at 97428 is display text only; JF used at 100889; QF at 101078). Correction: "one-character edits" are not deployable in place. `assets/index-Cg8FAMXN.js` is served `public, max-age=31536000, immutable` (`netlify.toml` `/assets/*`) and precached cache-first by `sw.js` (`PRECACHE_ASSETS` lists it; `CACHE_NAME = 'gbg-v5'`). A patched file must get a new hashed name, with `index.html`, the `PRECACHE_ASSETS` entry and `CACHE_NAME` bumped, or returning visitors keep the buggy bundle (and remember the lowercase-filename trap in the deploy zip). The day roll-over also needs the battle-day vs calendar-date decision in MISSED-1. Effort stays S. |
| time-facts-03 | CONFIRMED | All 6 TEXT-VS-LABEL rows verified against `chronology_day*.json` (t12 "approximately 7:30am" vs 6:00am; t38 "Noon lull" vs 8:10am; t314/t326 "at dusk" vs 12:10pm/1:10pm; t515 "approximately 11:00am" vs 9:15am; t518 "approximately 1:00pm" vs 9:30am). `chronology_day1.json:5` tick_formula and `placement_schema.json:8-10` real_time strings verified false. My regex scan also finds label/text conflicts not on the list: t75 (label 11:15am, text "evening"), t340 (label 2:20pm, "Fighting dies down"), t420 (6:20pm, "night"), so "6" is a lower bound. `historian.html:123` prints `Day ${c.day}, ${e.time}`, so regenerated labels for post-midnight ticks (t160-t225, t368-t450 under the anchors) need a date, not just "1:00am" (see MISSED-1). The event card shows `l.time` directly (98630), so relabelling propagates there. |
| time-facts-04 | CORRECTED | Re-tick arithmetic verified: I re-derived the suggested ticks from the anchors (t310->~242, t335->~302, t298->~278, t283->~272, t400->~334, t460->~511, t560->~522; all within 1 tick). Multiple events per tick are supported (`PF()` at 98551 groups by tick into arrays), so t563->t538 collides safely. Corrections: (a) t420 "WRONG-DAY / delete the July-2-evening placement" is not established: Wikipedia second day says "On the night of July 2, all of the remaining elements of both armies had arrived: ... Pickett's division"; the Pickett's Division monument says "July 2. On march to Gettysburg" / "July 3. Reached the field about 9 A. M."; a Black Horse Tavern marker (seen only in a search summary; hmdb returned 403) says Pickett passed in the afternoon and "lay that night in the west side of Spangler's Woods". SS2's "still at Chambersburg ... would not arrive until July 3" is the outlier and is an uncited compilation. Treat t420/t500 as a historian-decision item, not a delete. (b) t8 (June 30) is plausible: Wikipedia first day confirms Pettigrew clashed "the day before" and the militia belief, but the exact Heth-Hill exchange date is still LIT (unverified). (c) Count is 16 (12 misordered + 4 wrong-day) in section 5.1 vs "15" in the title; trivial. (d) t460 also appears as key 460 "Mudge's charge" in the bookmark-label dictionary `IF()` (97865-97894) and as V-022's trigger tick; re-ticking must update both (MISSED-5). |
| time-facts-05 | CONFIRMED | Counts reproduced from CSVs: 129 rows (98 core / 31 supplementary), confidence H/M/L 18/66/45, tags V/S/L/C 117/5/5/2, 33 register rows, 5 R anchors (t75, t90, t248, t275, t538), 45 rows with confidence L or tag S/L. Spot-checked sources agree with the register: Wikipedia Reynolds "either 10:15 a.m. or 10:40-10:50" (verified), Howard 11:30 (Martin) vs 10:30 (Pfanz) (verified), Wikipedia Pickett's Charge "about 2:00 p.m." vs main article "Around 3 p.m." (verified; the main article's "Around 3 p.m." attaches to "the cannon fire subsided", the step-off is implied), ABT "stepped off in unison at about 3:00 p.m." and map caption "Around 3:00 p.m. the pre-assault artillery bombardment ceased" (verified), Longstreet OR "About 2 p. m. General Pickett ... reported that the troops were in order" (verified; that is about line arrangement, not the step-off). Additions: (1) Wikipedia's Pickett's Charge article cites Coddington p.502 for BOTH a 2:00 step-off and a 3:00 bombardment end (report rows R107/R108 repeat this), so the 2:00 reading is weak; queue it. (2) 4 of the 12 "S" anchors rest on M-confidence rows (t1/R003, t28/R012 which is disputed, t53/R025, t515/R097); add them to the review queue (see time-facts-13). |
| time-facts-06 | CORRECTED | V-022 ("approximately 7:30 in the morning of July 3", vignettes_part3.json), V-020 ("exactly eight days"), V-021 ("eight days" in panel and script vs "four days"), t525/t530, t324, t100 all verified in the JSON. Custer's brigadier commission June 29 confirmed (Wikipedia). Corrections: (a) REFUTED sub-claim: TL;DR item 6 and section 5.4 say V-015's first quoted message is the second real note. It is not: `vignettes_part2.json` (trigger 525) quotes the first message correctly ("If you are to advance at all, you must come at once ...") and then the second ("For God's sake come quick."). Only chronology t525 is wrong (its "first message" text paraphrases the second note; HistoryNet confirms first note 1:25 pm and second "just 10 minutes later"). (b) The proposed t525 replacement uses Wikipedia's wording ("If you are coming at all, come at once ...") which differs from V-015's wording at the same tick, creating a new internal inconsistency; pick one primary-source text (Alexander memoir/OR) and use it in both, with a citation field. (c) Farnsworth: Wikipedia says he was nominated June 29 but never Senate-confirmed; word it "held the rank about four days (nominated June 29)". (d) V-022: Wikipedia Culp's Hill says "The end of the fighting came near noon, with a futile attack by two Union regiments", so the range should extend to about noon, not stop at 11:30. |
| time-facts-07 | CORRECTED | All cited lines verified (walkthrough stop 2 subtitle "July 1, 10:00 AM" at tick 22 narrating Iverson; stops 7/8 at ticks 275/270 with 5:00/6:00 PM; stop 13 tick 522; stop 16 "July 4-5" tick 610; monument labels Cushing 3:00 PM t548, Armistead 3:15 PM t551, Hancock 3:20 PM t554, Barlow 2:30 PM t63; markers `TO` with First shot at t17 (112193); turning-points.html:53-93 ticks 1/175/240/267/300/340/460/540/560; sandbox.html:102-106). Correction: the claim inventory is incomplete: the 15-stop `d2` tour array (`bundle.pretty.js:104097-104420`, with `day: "July N, 1863"` fields and `history` prose) contains hand-typed clock claims ("Around 1 p.m. on July 1 ... Rodes", "By about 3:30 in the afternoon", "The storm breaks, 4 p.m.", "around 6:30 p.m.", "Around 7 p.m. on July 2") that are not in the claims table; add them to the contract tests. Also the sandbox note says t260 is "~4:25pm" but the table row says 4:11pm; recompute. |
| time-facts-08 | CORRECTED | Tint code verified (M4 9856-9860, E4 9861-9884, C4 9901-9909; A4/C4 wired at 97259/97310, desktop map only; the mobile map has no tint). I recomputed sun/twilight with the NOAA algorithm for 39.8309 N, 77.2311 W: sunrise 4:34-4:35, sunset 7:31-7:32, civil twilight 4:02-4:03 and 8:04, nautical end 8:45 (local mean time): matches the report within 1 min. Moon: a Meeus full-moon calculation gives full moon 1863-07-01 about 06:45 UT (about 01:30 local July 1), i.e. about 1.7 days past full at July 2 dusk (moon age about 16.4 d), not "age 14.9-15.9 d"; SS2 says "one day past full". Harmless for a glow, but do not hard-code "full" or a dusk moonrise (a moon that far past full rises after about 8:30 pm). Missed risk: under the anchors 220 of 675 ticks (33%) are full night (after 8:46 pm or before 4:03 am: t100-t226 and t340-t450), and E4's night alpha is 0.35-0.4 with `mix-blend-mode: multiply` over the whole desktop map (A4, z-index 6). A third of playback would be dark, and jumpToDay(2)/(3) land at 4:30 am pre-dawn (t226/t451). The acceptance test mentions "contrast checks" but the fix should also cap alpha (about 0.2-0.25), keep unit/label layers above the tint, and offer a daylight toggle. Also "t314-t330 = 12.3-13.3 h" computes to 12.33 / 13.33 (t326) / 13.67 (t330). |
| time-facts-09 | CORRECTED | cF = 500 ms (96948) and `Pe = cF / R` (96982; the report cites 96973): 2 ticks/s verified; `"1x (real time)"` at 97429 verified; anchor segment rates reproduced (0.8 to 42.3 min/tick). Corrections: (a) "an InterpolationWorker chunk already exists" is misleading: `assets/interpolationworker-ufiwa2-e.js` (672 B, a pure position-lerp worker) is referenced by nothing (0 matches in `bundle.min.js` and `index.html`) and `bundle-anatomy.md` finding 05 recommends deleting it. Fractional-tick interpolation is done inline in `Ed()` (`ut = Hc / Pe`, about 96986-96990). Do not plan on the worker. (b) Option (a) (relabel speeds using local min/tick) would change the label mid-playback as segments change; prefer option (b). (c) Lazy data loads are keyed to ticks (`it >= 200 ... aF()`, `it >= 420 ... lF()`, about 96990-96996) and `s2 = 675` (96949) is the hard end; any clock-time mode or Day-4 stub must keep these. Effort L is reasonable. |
| time-facts-10 | CORRECTED | Placement evidence verified but incomplete: C-I-3-1/2/3 first row is t180 "Line of March" at lat 39.8067-39.8089, lng -77.2917; the report omits the t200 rows ("Bivouac", "Garnett's brigade bivouacking on Chambersburg Pike", Armistead "resting before July 3", lat 39.816-39.818, lng -77.27). Real: Longstreet's OR says on July 1 "the troops set out for Gettysburg, excepting Pickett's division, not yet relieved from duty at Chambersburg", and the Pickett's Division monument says "July 1. Guarding trains at Chambersburg", so a July 1 evening presence west of Gettysburg IS wrong. But the report's stronger claim that a Seminary Ridge bivouac on the night of July 2 (t400-t451) is wrong rests on SS2's "still at Chambersburg ... would not arrive until July 3", which conflicts with Wikipedia second day, the monument ("July 2. On march"; "July 3. Reached the field about 9 A. M.") and the Black Horse Tavern marker snippet. Reword to: definite error at t180-t200; night-of-July-2 location undecided. Effort: the dataset has only 1,804 placement rows (694 `placements_*` + 1,110 `density_*`, 478 units, 188 distinct ticks; I recounted, and `data-integrity.md` says the same), so the script is trivial; the L effort is the arrival-time research (Gottfried, Busey), so M overall. |
| time-facts-11 | CORRECTED | compare.html:120-128, living-ledger.html:135-143 (`July ${dayIdx + 1}`), camera.html:175-179, sandbox.html:102-106, compare.html:55 copy ("Union line at 4:00pm vs. 6:00pm on Day 2") all verified. Missed: immersive.html:169-173 is a fourth copy of the 5:00-base `hourForTick` feeding `atmosphereForHour` (night `rgba(20,30,70,0.45)`); it is not in the report. compare/living-ledger keep their own DAY_BOUNDS, so the calendar-date decision (MISSED-1) applies there too. |
| time-facts-12 | CONFIRMED | Sound. Note the forbidden-pattern grep (`* 5`, `+ 2`) can only run on reconstructed source or static pages: in the built bundle `* 5` also matches unrelated Mapbox code (22030, 32804, 61302), and there is no real source (N1), so the test suite depends on the source-reconstruction workstream; state that dependency. |
| time-facts-13 | CORRECTED | The display rule ("c." only when nearest anchor is R or confidence L) misses contested time points that carry status S/M: 4 of the 12 S anchors rest on M-confidence rows: t1 (R003; SS1 + THJ only), t28 Reynolds (R012; Wikipedia "either 10:15 or 10:40-10:50", verified), t53 Iverson (R025; Rodes 2:00-3:00), t515 Culp's Hill end (R097; "around 11 a.m." vs "near noon"). Key the prefix to the disagreement register (section 4) or to a per-anchor range width (> 20 min), not to R/L alone. Also 5-minute rounding on the 0.8 min/tick stall segment (t302-t314) freezes the clock for about 6 ticks; acceptable but note it. |
| time-facts-14 | CORRECTED | Mechanism verified: `historian.html:121-123` prints `Day ${c.day}, ${e.time}` from the chronology JSON (e.g. t538 label 11:05am). time-facts-03's relabel fixes most of this automatically; item 14's added value is range-aware answers. Correction: the example record stores verbatim `quote` fields and the report proposes republishing its table as a "Sources & Times" page. Rights: NPS-hosted Official Records reports are US-government (public-domain) text; Wikipedia is CC BY-SA 4.0 (attribution + share-alike applies to copied wording); ABT, HistoryNet and Stone Sentinels are copyrighted. Store facts, ranges and source keys (times are not copyrightable); keep quotes short with attribution, avoid copying Wikipedia's disagreement paragraphs verbatim, and add a licence column. Also label Stone Sentinels/THJ/CWC as low-authority compilations in the data (the report itself calls SS "uncited"). |
| time-facts-15 | REFUTED | Evidence is false: "430k placement records" comes from the false metadata in `placement_schema.json` (`purpose`, `total_placement_records` about 430000); the deployed data has 1,804 rows across 188 of 675 ticks (my count: 694 + 1,110; matches `data-integrity.md` section 3.1). So Option B is not XL: re-keying 1,804 rows onto a uniform grid is S-M; the real cost is the dense-movement/interpolation model (`data-integrity-01`, XL) and QA of the density passes. Merge this item with data-integrity-01 instead of listing it as a standalone XL. Also the tick arithmetic: July 1 05:00 to July 4 00:00 is 67 h = 804 ticks (not about 840). Severity low stays. |

### Independent re-computation (reproducible in `tmp-verify-time-facts/`)

- `stats.py`, `f5.py`: label / map / 5-min formula errors on the 102 matched events reproduce exactly (4.79 h, 3.92 h median, 5 within 30 min; 4.82 h, 1; 4.52 h, 7); proposed anchors 21.3 min mean, 46.5 min RMS, 86 and 96 within 30 and 60 min.
- Split of that result: 30 events on anchor ticks (residual 0 by construction), 72 off-anchor (mean 28.8, median 17.5, RMS 55.1, 56 within 30 min); 32 of 102 comparators are `custom` estimates.
- `oc.py`: 30 hand-typed claims: median 14.5 min vs proposed, 213.5 vs map clock (reproduced); 11 on anchor ticks; off-anchor median 27 min, 12/19 within 30.
- `sun.py`: NOAA sunrise/sunset/twilight match the report within 1 min; true full moon 1863-07-01 about 06:45 UT.
- Anchor model replay: calendar midnight falls at t160 and t368 (149 ticks, 22%, carry a calendar date different from their Day); 220/675 ticks are full night.
- `cnt.py`: 1,804 placement rows, 188 distinct ticks, 478 units.

### MISSED issues (in the time-facts scope)

1. **Calendar date vs battle day is not specified (high).** Under the anchors, midnight falls at t160 and t368, so ticks 160-225 (Day 1) and 368-450 (Day 2), 149 ticks (22%), would show July 2 / July 3 in the header while `getCurrentDay()` (9384), the mobile `["July ", di]` label and day tabs (103144, 103168), the desktop `["July ", va]` label (113086), the `f2` day chips (112187-112190), `jumpToDay` (9369), the unit-history progress labels "July 1/2/3" at thirds (101555-101563) and static-page DAY_BOUNDS keep saying Day 1/2. The spec only says "date derived from absolute minutes". Fix: define `battleDay` (1-3, tick-range based; drives chips, data loading, jumps) and `calendarDate` (drives the clock); show e.g. "Night of July 1-2, 1:20 AM"; regenerate JSON labels with a date field for t160-t225 and t368-t450 (5 chronology events, t380-t450, are affected today); update `historian.html:123`. Effort S-M.
2. **Mobile clock string contract (high).** `bundle.pretty.js:102976-102977` parses getTickTime with `split(", ")[1]`; the spec'd "July 1, 1863, 7:30 AM" (and "c. 3:00 PM") would render "1863" on mobile. Keep the `July N, h:mm AM` contract for getTickTime and add a separate long formatter, or patch 102977 and acceptance-test the mobile header at t12 and t538. Effort S.
3. **Delivery and cache invalidation for every time fix (high).** `/assets/*` is `immutable` for 1 year (`netlify.toml`) and `sw.js` serves `/assets/*` and precached files cache-first (`CACHE_NAME 'gbg-v5'`, `PRECACHE_ASSETS` includes `/assets/index-Cg8FAMXN.js`). An in-place hot-patch of the bundle (time-facts-02) or an unhashed `/assets/time-model.js` (time-facts-01) never reaches returning visitors. Required: new hashed filenames, update `index.html` and `sw.js` precache + `CACHE_NAME`, keep `/data/*` on the existing network-first path (1 h browser cache is fine for relabelled JSON), and inline the anchors (33 rows, about 2 KB) in the bundle and `site-nav.js` instead of adding a first-paint JSON fetch (site-nav.js is loaded on index and every static page). Effort S.
4. **Site copy claims "real time" and "five-minute snapshots" (medium).** `index.html:15,18,24,32` (meta description, OG/Twitter, JSON-LD: "unfold in real time ... 675 five-minute snapshots"), `index.html:719,754` (SEO block), in-app splash `bundle.pretty.js:111893` ("675 five-minute snapshots"), `ground-remembers.html:42`, `terms.html:30` ("five-minute resolution"). Under the anchors the mean spacing is about 5.6 min/tick overall (6.3 on Day 1) and 0.8-42 min/tick locally; "real time" is false and "five-minute" needs "roughly". Rewrite as "675 snapshots, about five minutes apart on average, denser in the fighting and coarser overnight". Effort S.
5. **More time consumers not in the fix list (medium).** (a) `immersive.html:169-173` fourth copy of the 5:00-base formula plus 0.45-alpha night tint; (b) `IF()` at `bundle.pretty.js:97865-97894` hard-codes tick-to-title labels used as default bookmark labels (460 "Mudge's charge", 248 "Sickles moves forward", 12 first shot, 17 Calef) and users' localStorage bookmarks persist them; (c) the 15-stop tour `d2` (104097-104420) with clock prose (see time-facts-07); (d) onboarding tour text 111844/111851 with day-part claims. Add all to the contract test and regenerate from the event table. Effort S-M.
6. **Night tint legibility and jump targets (medium).** 220 of 675 ticks (33%) are night; t226/t451 (Jump to Day 2/3) land at 4:30 am pre-dawn. Cap the tint alpha (about 0.2-0.25), keep unit markers/labels above the tint, offer a daylight toggle, and check WCAG contrast of labels under the overlay in the acceptance test. Effort S.
7. **Source authority and rights for the anchors/data (medium).** Many anchors and register rows rest on Stone Sentinels (self-described uncited compilation), The History Junkie, Civil War Cycling and unopened search summaries (SRCH) rather than primary reports; only seven NPS-hosted ORs were readable. Mark each anchor with an evidence class (primary OR / scholarship via Wikipedia footnote / compilation / search summary) and block "S" status unless one primary or two independent scholarly sources support it. Wikipedia text is CC BY-SA 4.0 (attribution + share-alike), ABT/HistoryNet/Stone Sentinels are copyrighted, NPS OR pages are public domain: see time-facts-14. Effort S.
8. **Coordination with data-integrity-01 (medium).** The anchor clock leaves unit positions unchanged, but 487 of 675 ticks (72%) carry no placement row (hold-and-snap), and `data-integrity-01` proposes generating dense tracks from anchors (XL). If that goes ahead, the anchors become load-bearing for the movement model, so time-facts-05 (historian sign-off) must precede it and time-facts-15 should be merged into it. State the dependency in both reports. Effort S (planning).

### Not verified (honest limits)

- Stone Sentinels July 1 page (SS1), The History Junkie, Civil War Cycling, the "Padre Steve" 2:40 pm figure, the HistoryNet "20th Maine" and Cross articles, the ABT Devil's Den / Wheatfield map pages (their slugs carry the 4:30-5:30 and 5:45-6:30 ranges) and the NPS Cushing article were not re-fetched by me. Pfanz, Coddington, Sears, Hess, Wert, Hessler and Gottfried were not readable, so page citations in the register remain second-hand (as printed in Wikipedia).
- The Black Horse Tavern marker text is from a search-result summary only (hmdb.org returned 403 to a direct fetch); treat as unverified until read directly.
- WebFetch answers are model-generated extractions; where I quote them I relied on multiple fetches or on matching Wikipedia raw text.
