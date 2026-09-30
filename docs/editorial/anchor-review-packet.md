# Anchor review packet for the historian (33 anchors)

> **Status: CANDIDATE, unreviewed. Nothing in this packet has been approved by the owner or by a historian, and nothing here ships until they approve it (D-TIME, D-HIST-REVIEW).** Every anchor below is `state: proposed`. The times are the time-facts specialist's proposals; the model, the residuals and the option consequences are computed by `node tools/time/build-review-packet.mjs` from `data-src/time/time_anchors.json` (version 2026-09-30.1, dv 2). The historian decides; nothing in this packet is a finding. Regenerate, do not edit.

## What is being asked

The site's clock is a piecewise-linear function of the tick through 33 anchor points (`tick -> local mean time`). Every tick keeps its number; only the derived clock changes. A wrong anchor shifts every tick in its two neighbouring segments, so the anchors are the highest-value review items. You are asked to:

1. **Decide the five R anchors** (t75, t90, t248, t275, t538): pick one of the offered readings or supply another time with a range and a citation (work, edition, page). Sections 3.1 to 3.5, one page each.
2. **Spot-check the anchors with weak evidence** (section 4): the four S-status anchors that rest on M-confidence rows, the four that fail the evidence rule, and the anchors next to gaps that are least predictable from their neighbours.
3. **Tell the owner what you cannot verify.** Unread sources (Pfanz, Coddington, Sears, Hessler, Wert, Gottfried, Busey and Hartwig, most Official Records reports) are listed per anchor. An honest "cannot verify" leaves the row `proposed` and the site keeps its "about" wording.
4. The three design anchors and the circular t5 are the **owner's** to sign (section 5), not yours.

Sign-off states and what each one changes on the site are in `docs/editorial/sign-off-states.md`; the role, hours and standard are in `docs/editorial/reviewer-charter.md`. Times are **local mean time** at Gettysburg (39.83 N, 77.23 W), not standard time (1863 had none); EST would be about nine minutes later.

## 1. All 33 anchors

Status: S solid, M medium, R needs a historian, D design (no historical event). Sigma is the plus or minus, in minutes, the model prints as "about". Flags: H historian decides, O owner signs, C circular, M an S anchor resting on an M-confidence row, E an S anchor failing the evidence rule (one Official Records report or two independent strong families), W no strong source family. "LOO" is the error of predicting this anchor from its two neighbours (true minus predicted, minutes): large values are the anchors next to gaps.

| tick | local time | status | sigma | accepted range | event | fact rows | source families | flags | LOO (min) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | July 1 05:00 | S | 15 | 05:00-05:30 | Heth's column leaves Cashtown | R003 | LIT SS THJ | M E W |  |
| 5 | July 1 05:20 | M>D | 30 | 05:00-05:30 | Archer/Davis lead Heth's column out of Cashtown | R003 | LIT SS THJ | C W | -35 |
| 12 | July 1 07:30 | S | 5 | 07:30-07:30 | First shot, Lt. Marcellus Jones | R005 | ABT HN PART WP | - | +40 |
| 28 | July 1 10:15 | S | 20 | 10:15-10:50 | Reynolds killed | R012 | OR WP | M | +25 |
| 36 | July 1 11:00 | S | 15 | 10:45-11:15 | Railroad Cut charge | R017 | WP SS | E | -37 |
| 53 | July 1 14:30 | S | 30 | 14:00-15:00 | Iverson's Pits | R025 | OR WP | M | +16 |
| 57 | July 1 15:00 | M | 25 | 14:30-15:15 | Barlow's Knoll overwhelmed | R027 | ABT WP | - | -3 |
| 64 | July 1 16:00 | S | 15 | 15:45-16:15 | Pender/Perrin hit Seminary Ridge | R032 | OR ABT WP | - | +23 |
| 72 | July 1 16:20 | M | 30 | 15:30-16:30 | Hancock reaches Cemetery Hill | R035 | WP SRCH | - | -24 |
| 75 | July 1 17:00 | R | 30 | 16:30-17:30 | Lee's 'if practicable' order | R037 | WP SRCH | H | +23 |
| 90 | July 1 18:00 | R | 30 | 16:30-20:00 | XII Corps/Johnson arrive | R038/R039 | SS SRCH LIT | H W | -48 |
| 100 | July 1 20:00 | D | 30 | 19:32-20:04 | Nightfall | sun | sun | O | +74 |
| 226 | July 2 04:30 | D | 30 | 04:03-04:35 | Day-2 start (first light) | sun | sun | O | -354 |
| 240 | July 2 12:00 | M | 30 | 11:30-12:30 | Berdan's probe / Pitzer's Woods | R046 | WP SS | - | +68 |
| 248 | July 2 14:30 | R | 30 | 12:00-15:30 | Sickles's advance to Peach Orchard | R050 | WP SRCH LIT | H | +30 |
| 256 | July 2 16:00 | S | 25 | 15:45-16:30 | Longstreet's assault: guns + Hood step off | R054/R056 | OR ABT WP | - | +39 |
| 267 | July 2 16:30 | M | 15 | 16:15-16:45 | Vincent reaches Little Round Top | R059 | HN WP | - | -39 |
| 275 | July 2 18:00 | R | 30 | 17:10-19:00 | 20th Maine bayonet charge | R066 | HN THJ SRCH | H | +16 |
| 280 | July 2 18:30 | M | 25 | 18:00-18:45 | Peach Orchard salient collapses | R071 | WP SS | - | +15 |
| 295 | July 2 19:00 | M | 30 | 18:30-19:30 | Crawford counterattack | R076 | WP SS | - | +3 |
| 302 | July 2 19:10 | M | 25 | 18:45-19:30 | 1st Minnesota's charge | R077 | SS LIT | W | +3 |
| 314 | July 2 19:20 | S | 30 | 18:30-19:30 | Johnson attacks Culp's Hill | R080 | ABT WP | - | -15 |
| 326 | July 2 20:00 | S | 30 | 19:30-20:30 | Early attacks East Cemetery Hill | R082 | WP SS | E | -48 |
| 340 | July 2 22:30 | M | 15 | 22:00-22:30 | Battlefield falls silent | R087 | WP | - | +93 |
| 451 | July 3 04:30 | S | 25 | 04:00-04:45 | XII Corps guns open on Culp's Hill | R091 | ABT WP SS | - | -77 |
| 500 | July 3 09:00 | M | 30 | 08:30-10:00 | Pickett's division arrives | R094 | SS | W | -29 |
| 515 | July 3 11:00 | S | 30 | 10:30-12:00 | Culp's Hill fighting ends | R097 | SS WP | M E | -86 |
| 518 | July 3 13:07 | S | 5 | 13:00-13:10 | Cannonade opens | R100 | OR HN NPS WP | - | +96 |
| 538 | July 3 15:00 | R | 30 | 14:00-15:00 | Infantry step-off | R108 | OR ABT WP | H | +23 |
| 551 | July 3 15:35 | M | 20 | 15:10-15:45 | Armistead over the wall | R115 | ABT SS | - | -8 |
| 556 | July 3 16:00 | M | 25 | 15:45-16:30 | Assault collapses / Lee meets survivors | R118 | SS | W | -4 |
| 568 | July 3 17:15 | M | 25 | 17:00-17:45 | Farnsworth's charge | R122 | ABT SRCH | - | +51 |
| 675 | July 3 20:00 | D | 30 | 19:32-20:04 | Nominal end of battle | sun | sun | O |  |

Counts: S 12, M 13, R 5, D 3; 18 of 33 carry a flag and 15 pass the mechanical checks (t12, t57, t64, t72, t240, t256, t267, t280, t295, t314, t340, t451, t518, t551, t568). Slopes run 0.83 to 42.33 minutes per tick; the lulls (over 15 min/tick) are t5-12, t226-240, t240-248 and t515-518 and are real gaps in the record.

## 2. Review order

1. **t538** (infantry step-off) and **t275** (20th Maine): the site's hero moment, tour, Turning Points and onboarding sit on them.
2. **t248** (Sickles), then **t75** and **t90**.
3. The content decisions that depend on the clock (not anchors): Colgrove's charge and vignette V-022, then Pickett's division placements.
4. The S anchors on M-confidence rows: t28, t1, t53, t515; and the evidence-rule failures t1, t36, t326, t515.
5. The rest, largest LOO error first (t518, t340, t451, t240, t568).


<div style="break-after:page"></div>

## 3.1 Anchor t75: Lee's discretionary order to Ewell ("if practicable")

**Proposed:** July 1, 5:00 PM local mean time, sigma 30 min, accepted range 16:30-17:30, status R, flags H. Neighbours: t72 Hancock reaches Cemetery Hill (16:20) and t90 XII Corps/Johnson arrive (18:00). **State: proposed.**

**The question.** When did Lee's order (carried by Col. Taylor) reach Ewell, in local time? The site's chronology puts it at tick 75; the Turning Points page uses tick 175.

**What the site says at this tick today.** Event card label "11:15am" (critical): LEE'S DISCRETIONARY ORDER TO EWELL: 'take Cemetery Hill if practicable.' Ewell looks at the hill, considers Johnson's division not yet arrived, decides it is not practicable. Does not order the attack.... The typed claims near it:

| kind | name | tick | claim | proposed clock at that tick |
|---|---|---|---|---|
| walkthrough stop | Seminary Ridge - The Union Retreat | 75 | July 1, 4:00 PM | July 1 5:00pm |

**Evidence read** (rows of `docs/plan/data/time-facts.csv`; source keys as printed there; SS = Stone Sentinels, an uncited compilation; SRCH = a web-search summary, page not opened; LIT = recalled, not re-verified):

| row | date | range | best | conf | tag | sources | event | disagreement notes |
|---|---|---|---|---|---|---|---|---|
| R037 | July 1 | 4:30p-5:30p | 5:00p | L | S | SRCH,WPd1 | Lee's discretionary order to Ewell to take Cemetery Hill 'if practicable' (Col. Taylor; Capt. Smith) | Search summary: Taylor sent "after 5 p.m."; WP gives no clock time. |
| R036 | July 1 | 5:00p-5:30p | 5:25p | M | V | SS1 | Hancock's dispatch to Meade: 'we can fight here' | SS1 gives 5:25pm. |
| R035 | July 1 | 3:30p-4:30p | 4:15p | M | V | WPd1,SS1,SRCH | Hancock arrives on Cemetery Hill and takes control of the rally | WP: "after 4:00 p.m."; SS1: "around 4:00"; search summaries: 4:00-4:30. Some accounts 3:30 (LIT). |
| R038 | July 1 | 4:30p-7:00p | 5:30p | L | S | SRCH,LIT | Johnson's division reaches the field north-east of town (too late to attack) | Sources say "late afternoon"/"evening"; no clock time located. Needs Pfanz Culp's Hill & Cemetery Hill / Ewell OR. |

**Disagreement register** (time-facts section 4):

| # | topic | readings | specialist's suggested handling |
|---|---|---|---|
| 10 | Lee's "if practicable" order | "after 5 p.m." (SRCH); SS1 places it in the block after Hancock's 5:25 dispatch; no OR time read | Range 4:30-5:30, L |

**Options.** Each is a reading of a source the specialist consulted; you may supply another time. "Clock" columns show the model's clock at sample ticks under that option (5-minute rounding); "slope" is minutes per tick on either side of the anchor.

| option | time | slope before / after (min per tick) | clock at sample ticks | all-102 in-sample mean abs error, min (within 30) | keyframe pairs over the speed caps | basis |
|---|---|---|---|---|---|---|
| A | 16:30 | 3.3 / 6.0 | t72 4:20 PM; t74 4:25 PM; t75 4:30 PM; t83 5:20 PM; t90 6:00 PM | 21.8 (86/102) | 19 | start of the accepted range (R037 4:30-5:30 PM); no source states it |
| B (proposed) | 17:00 | 13.3 / 4.0 | t72 4:20 PM; t74 4:45 PM; t75 5:00 PM; t83 5:30 PM; t90 6:00 PM | 21.3 (86/102) | 19 | R037 best time; a search summary says Taylor sent the order "after 5 p.m."; Wikipedia first day gives no clock time |
| C | 17:30 | 23.3 / 2.0 | t72 4:20 PM; t74 5:05 PM; t75 5:30 PM; t83 5:45 PM; t90 6:00 PM | 21.6 (86/102) | 19 | Stone Sentinels (SS1) places it in the block after Hancock's 5:25 PM dispatch to Meade (R036); disagreement register #10 |

**Chronology events inside the two affected segments (t72-90)**: the clock each option gives them against the specialist's real best time (residual = real minus clock, minutes; the events were used to choose the current anchors, so the proposed column flatters the proposal):

| tick | class | real best | option A | option B (proposed) | option C |
|---|---|---|---|---|---|
| 75 | RELABEL-CONTESTED | 5:00 PM | 30 | 0 | -30 |
| 80 | RELABEL-CONTESTED | 5:30 PM | 30 | 10 | -10 |

Mean abs residual on these 2 events: option A 30 min; option B 5 min; option C 20 min.

**Note.** Neighbours: t72 Hancock reaches Cemetery Hill 4:20 PM, t90 XII Corps arrives 6:00 PM. The order must fall after Lee reached the field (R024, 1:30-3:00 PM range) and is context for R038 (Johnson too late to attack).

**Sources not yet read that would settle it:** Pfanz, Culp's Hill and Cemetery Hill (Ewell's decision); OR 27/2 reports of Ewell, Early, Rodes and Johnson; Coddington, The Gettysburg Campaign.

**Decision record** (the historian fills this in; it becomes one line of `decisions.jsonl`; the developer regenerates the anchors and the golden table and bumps `dv`):

```json
{ "id": "D-____", "subject": "anchor t75", "chosen": "option ___  or  ____-__-__T__:__", "range": ["__:__", "__:__"], "display": "about h:mm | between about h:mm and h:mm",
  "citations": [{ "work": "", "edition": "", "page": "", "kind": "primary | scholarship | compilation" }],
  "reviewer": "", "second_reader": "", "at": "____-__-__", "state": "reviewed | contested | deferred" }
```


<div style="break-after:page"></div>

## 3.2 Anchor t90: XII Corps and Johnson's division arrive (R038 / R039)

**Proposed:** July 1, 6:00 PM local mean time, sigma 30 min, accepted range 16:30-20:00, status R, flags H W. Neighbours: t75 Lee's 'if practicable' order (17:00) and t100 Nightfall (20:00). **State: proposed.**

**The question.** When did the head of the XII Corps (Geary) and Johnson's Confederate division reach the field, in local time? The two fact rows are both ranges (4:30-7:00 PM and 5:00-8:00 PM); the proposal sits at 6:00 PM although both rows' own best time is 5:30 PM.

**What the site says at this tick today.** Event card label "12:30pm" (high): XII Corps (Williams) arrives on Baltimore Pike and takes position on Culp's Hill. Greene's brigade on the right. Powers Hill reserve. XII Corps secures the Union right flank.. The typed claims near it:

_none within 4 ticks_

**Evidence read** (rows of `docs/plan/data/time-facts.csv`; source keys as printed there; SS = Stone Sentinels, an uncited compilation; SRCH = a web-search summary, page not opened; LIT = recalled, not re-verified):

| row | date | range | best | conf | tag | sources | event | disagreement notes |
|---|---|---|---|---|---|---|---|---|
| R038 | July 1 | 4:30p-7:00p | 5:30p | L | S | SRCH,LIT | Johnson's division reaches the field north-east of town (too late to attack) | Sources say "late afternoon"/"evening"; no clock time located. Needs Pfanz Culp's Hill & Cemetery Hill / Ewell OR. |
| R039 | July 1 | 5:00p-8:00p | 5:30p | M | V | SS1,SRCH | XII Corps (Geary, then Williams) arrives; Slocum reports; Culp's Hill occupied | SS1: 5:30pm Slocum approached; search: Geary reached Gettysburg at 5pm; dispositions into the night. |
| R040 | July 1 | 7:00p-9:00p | 8:00p | L | V | SS1 | Birney's III Corps division (Sickles) arrives and is posted on Cemetery Ridge | SS1: "Dusk". Sickles left Emmitsburg after Howard's 3:10pm request (Wikipedia III Corps). |

**Options.** Each is a reading of a source the specialist consulted; you may supply another time. "Clock" columns show the model's clock at sample ticks under that option (5-minute rounding); "slope" is minutes per tick on either side of the anchor.

| option | time | slope before / after (min per tick) | clock at sample ticks | all-102 in-sample mean abs error, min (within 30) | keyframe pairs over the speed caps | basis |
|---|---|---|---|---|---|---|
| A | 17:30 | 2.0 / 15.0 | t75 5:00 PM; t83 5:15 PM; t90 5:30 PM; t95 6:45 PM; t100 8:00 PM | 21.1 (86/102) | 19 | both fact rows' own best time (R038, R039); Stone Sentinels (SS1) 5:30 PM Slocum approached |
| B (proposed) | 18:00 | 4.0 / 12.0 | t75 5:00 PM; t83 5:30 PM; t90 6:00 PM; t95 7:00 PM; t100 8:00 PM | 21.3 (86/102) | 19 | current proposal: keeps the slope to the nightfall design anchor (t100 8:00 PM) moderate |
| C | 19:00 | 8.0 / 6.0 | t75 5:00 PM; t83 6:05 PM; t90 7:00 PM; t95 7:30 PM; t100 8:00 PM | 21.9 (85/102) | 19 | R038's range runs to 7:00 PM ("late afternoon"/"evening"); no clock time located |

**Chronology events inside the two affected segments (t75-100)**: the clock each option gives them against the specialist's real best time (residual = real minus clock, minutes; the events were used to choose the current anchors, so the proposed column flatters the proposal):

| tick | class | real best | option A | option B (proposed) | option C |
|---|---|---|---|---|---|
| 80 | RELABEL-CONTESTED | 5:30 PM | 20 | 10 | -10 |
| 90 | RELABEL-CONTESTED | 5:30 PM | 0 | -30 | -90 |

Mean abs residual on these 2 events: option A 10 min; option B 20 min; option C 50 min.

**Note.** A search summary says Geary reached Gettysburg at 5 PM. Both rows are tagged S (search summary) or SS1; no primary report was read. The anchor is a compromise between two ranges, not a measurement.

**Sources not yet read that would settle it:** Pfanz, Culp's Hill and Cemetery Hill; OR 27/2 Ewell, Johnson; OR 27/1 Slocum, Geary, Williams; Coddington.

**Decision record** (the historian fills this in; it becomes one line of `decisions.jsonl`; the developer regenerates the anchors and the golden table and bumps `dv`):

```json
{ "id": "D-____", "subject": "anchor t90", "chosen": "option ___  or  ____-__-__T__:__", "range": ["__:__", "__:__"], "display": "about h:mm | between about h:mm and h:mm",
  "citations": [{ "work": "", "edition": "", "page": "", "kind": "primary | scholarship | compilation" }],
  "reviewer": "", "second_reader": "", "at": "____-__-__", "state": "reviewed | contested | deferred" }
```


<div style="break-after:page"></div>

## 3.3 Anchor t248: Sickles advances III Corps to the Emmitsburg Road / Peach Orchard (R050)

**Proposed:** July 2, 2:30 PM local mean time, sigma 30 min, accepted range 12:00-15:30, status R, flags H. Neighbours: t240 Berdan's probe / Pitzer's Woods (12:00) and t256 Longstreet's assault: guns + Hood step off (16:00). **State: proposed.**

**The question.** When did Sickles's advance begin? The accepted range is noon to 3:30 PM; the proposal is the midpoint, 2:30 PM. The site's vignette V-007 says "around 3:00".

**What the site says at this tick today.** Event card label "6:50am" (critical): Sickles advances his entire III Corps to the Peach Orchard -- without orders, without informing Meade, without permission. Creates a salient with an exposed apex at the Orchard and a dangerously thin .... The typed claims near it:

| kind | name | tick | claim | proposed clock at that tick |
|---|---|---|---|---|
| vignette | Sickles Moves Forward | 248 | "Around 3:00 in the afternoon"; also "On the morning of July 2..." | July 2 2:30pm |

**Evidence read** (rows of `docs/plan/data/time-facts.csv`; source keys as printed there; SS = Stone Sentinels, an uncited compilation; SRCH = a web-search summary, page not opened; LIT = recalled, not re-verified):

| row | date | range | best | conf | tag | sources | event | disagreement notes |
|---|---|---|---|---|---|---|---|---|
| R050 | July 2 | 12:00p-3:30p | 2:30p | L | V | WPd2,SS2,SRCH,LIT | Sickles advances III Corps to the Emmitsburg Road / Peach Orchard | DISAGREEMENT: WP second day "after noon he became concerned"; SS2 "Noon"; search summary "2 pm"; site vignette V-007 "around 3:00"; Hessler/Pfanz differ. Needs historian review. |
| R047 | July 2 | 12:00p-1:30p | 12:30p | M | V | WPcav,WPmain,SS2 | Stuart reaches Lee's headquarters (exhausted brigades arrive that evening) | WP: "shortly after noon"; SS2: Noon; WP second day: "early that afternoon". |
| R048 | July 2 | 12:00p-1:30p | 12:30p | M | V | SS2,WPd2 | Longstreet's approach march begins (McLaws leading, Hood following) | SS2: after noon; WPmain: First Corps in position ~1pm is disputed by WPd2 (4pm). |
| R051 | July 2 | 3:00p-3:00p | 3:00p | M | V | WPsick,SS2 | Meade's 3 p.m. meeting of corps commanders; Meade telegraphs Halleck he awaits Lee's attack | Wikipedia Sickles: "Soon thereafter (3 p.m.), Meade called a meeting". |
| R052 | July 2 | 3:15p-4:00p | 3:45p | L | V | SS2 | Meade rides to Trostle House, finds Sickles's salient; orders Warren to Little Round Top; Sykes's V Corps orde | SS2: "just before 4:00 p.m." |

**Disagreement register** (time-facts section 4):

| # | topic | readings | specialist's suggested handling |
|---|---|---|---|
| 11 | Sickles advances | after noon (WPd2); Noon (SS2); "2 pm" (SRCH); "around 3:00" (site V-007); LIT differs | Range noon-3:30; **R anchor** t248 |

**Options.** Each is a reading of a source the specialist consulted; you may supply another time. "Clock" columns show the model's clock at sample ticks under that option (5-minute rounding); "slope" is minutes per tick on either side of the anchor.

| option | time | slope before / after (min per tick) | clock at sample ticks | all-102 in-sample mean abs error, min (within 30) | keyframe pairs over the speed caps | basis |
|---|---|---|---|---|---|---|
| A | 12:30 | 3.8 / 26.3 | t240 12:00 PM; t244 12:15 PM; t248 12:30 PM; t252 2:15 PM; t256 4:00 PM | 23.1 (84/102) | 19 | Wikipedia second day "after noon he became concerned"; Stone Sentinels (SS2) "Noon"; kept 30 minutes after the t240 Berdan probe (12:00) |
| B | 14:00 | 15.0 / 15.0 | t240 12:00 PM; t244 1:00 PM; t248 2:00 PM; t252 3:00 PM; t256 4:00 PM | 21.8 (85/102) | 19 | a search summary gives "2 pm" |
| C (proposed) | 14:30 | 18.8 / 11.3 | t240 12:00 PM; t244 1:15 PM; t248 2:30 PM; t252 3:15 PM; t256 4:00 PM | 21.3 (86/102) | 19 | current proposal: midpoint of the accepted range (R050 best) |
| D | 15:00 | 22.5 / 7.5 | t240 12:00 PM; t244 1:30 PM; t248 3:00 PM; t252 3:30 PM; t256 4:00 PM | 21.5 (86/102) | 19 | the site's own vignette V-007 ("around 3:00"): an authored claim, not a source; Meade's 3 PM corps commanders' meeting is R051 |

**Chronology events inside the two affected segments (t240-256)**: the clock each option gives them against the specialist's real best time (residual = real minus clock, minutes; the events were used to choose the current anchors, so the proposed column flatters the proposal):

| tick | class | real best | option A | option B | option C (proposed) | option D |
|---|---|---|---|---|---|---|
| 248 | RELABEL-CONTESTED | 2:30 PM | 120 | 30 | 0 | -30 |
| 252 | RELABEL | 3:45 PM | 90 | 45 | 30 | 15 |

Mean abs residual on these 2 events: option A 105 min; option B 37.5 min; option C 15 min; option D 22.5 min.

**Note.** Register #11: Hessler and Pfanz differ; the specialist marked it needs-historian. The clock between t240 (12:00) and t256 (4:00 PM) runs at 18.8 and 11.2 min/tick around this anchor.

**Sources not yet read that would settle it:** Pfanz, The Second Day (Sickles's advance); Hessler, Sickles at Gettysburg; OR 27/1 Sickles, Birney, Warren, Sykes; Meade's testimony.

**Decision record** (the historian fills this in; it becomes one line of `decisions.jsonl`; the developer regenerates the anchors and the golden table and bumps `dv`):

```json
{ "id": "D-____", "subject": "anchor t248", "chosen": "option ___  or  ____-__-__T__:__", "range": ["__:__", "__:__"], "display": "about h:mm | between about h:mm and h:mm",
  "citations": [{ "work": "", "edition": "", "page": "", "kind": "primary | scholarship | compilation" }],
  "reviewer": "", "second_reader": "", "at": "____-__-__", "state": "reviewed | contested | deferred" }
```


<div style="break-after:page"></div>

## 3.4 Anchor t275: Chamberlain's 20th Maine bayonet charge (R066)

**Proposed:** July 2, 6:00 PM local mean time, sigma 30 min, accepted range 17:10-19:00, status R, flags H. Neighbours: t267 Vincent reaches Little Round Top (16:30) and t280 Peach Orchard salient collapses (18:30). **State: proposed.**

**The question.** When did the 20th Maine charge downhill? Sources span 5:10 PM to after 7 PM. Register #17 is the strongest disagreement and says: do not present a minute-precise time. This is the hero moment of the site's tour, Turning Points and onboarding.

**What the site says at this tick today.** Event card label "9:05am" (critical): CHAMBERLAIN'S BAYONET CHARGE. 20th Maine has expended nearly all ammunition after repulsing multiple assaults. Chamberlain orders a bayonet charge -- right-wheel motion sweeping down the hill. 15th Al.... The typed claims near it:

| kind | name | tick | claim | proposed clock at that tick |
|---|---|---|---|---|
| walkthrough stop | The Wheatfield | 275 | July 2, 5:00 PM | July 2 6:00pm |
| vignette | Chamberlain's Charge | 275 | "On the afternoon of July 2, 1863"; "repulsed five ... assaults" | July 2 6:00pm |

**Evidence read** (rows of `docs/plan/data/time-facts.csv`; source keys as printed there; SS = Stone Sentinels, an uncited compilation; SRCH = a web-search summary, page not opened; LIT = recalled, not re-verified):

| row | date | range | best | conf | tag | sources | event | disagreement notes |
|---|---|---|---|---|---|---|---|---|
| R066 | July 2 | 5:10p-7:00p | 6:15p | L | S | SRCH,THJ,SS2,HNc | Chamberlain's 20th Maine fixes bayonets and charges downhill (15th Alabama broken) | STRONGEST DISAGREEMENT: 5:10 (a participant timeline via search summary), 5:30 (SS2, THJ), ~6:30 (Desjardin-derived summary "By 6:30... fix bayonets"), ">7 p.m." (Cross, HistoryNet). Needs historian decision; do not present a minute-precise time. |
| R060 | July 2 | 4:30p-5:00p | 4:45p | M | V | SRCH,THJ,SS2 | Law's 15th and 47th Alabama first assault the 20th Maine's left; repeated assaults follow | Timelines 4:30-4:50pm; OUTLIER: Cross (HistoryNet) "The Alabama troops struck at 6 p.m." |
| R064 | July 2 | 5:00p-5:50p | 5:30p | L | S | THJ,SS2,SRCH | Col. Strong Vincent mortally wounded (Rice assumes command) | DISAGREEMENT: THJ 5:00-5:15; SS2 5:30 block; search summary ~5:45. |
| R065 | July 2 | 5:15p-6:00p | 5:40p | L | V | SS2 | 140th New York (O'Rorke) charges down Little Round Top; O'Rorke killed; Weed and Hazlett mortally wounded | SS2: 5:30pm block. |

**Disagreement register** (time-facts section 4):

| # | topic | readings | specialist's suggested handling |
|---|---|---|---|
| 15 | First 15th Alabama assault | 4:30-4:50 (THJ, SRCH); "The Alabama troops struck at 6 p.m." (Cross via HNc) | 4:45; note outlier |
| 16 | Vincent wounded | 5:00-5:15 (THJ); 5:30 (SS2); ~5:45 (SRCH) | Range; L |
| 17 | **20th Maine bayonet charge** | 5:10 (participant timeline via SRCH); 5:30 (SS2, THJ); ~6:30 (SRCH, Desjardin-derived); "after 7 p.m." (Cross via HNc) | **Historian decision.** Anchor 6:00 flagged approximate |

**Options.** Each is a reading of a source the specialist consulted; you may supply another time. "Clock" columns show the model's clock at sample ticks under that option (5-minute rounding); "slope" is minutes per tick on either side of the anchor.

| option | time | slope before / after (min per tick) | clock at sample ticks | all-102 in-sample mean abs error, min (within 30) | keyframe pairs over the speed caps | basis |
|---|---|---|---|---|---|---|
| A | 17:10 | 5.0 / 16.0 | t267 4:30 PM; t271 4:50 PM; t275 5:10 PM; t278 6:00 PM; t280 6:30 PM | 22.4 (83/102) | 19 | a participant timeline via a search summary (SRCH) |
| B | 17:30 | 7.5 / 12.0 | t267 4:30 PM; t271 5:00 PM; t275 5:30 PM; t278 6:05 PM; t280 6:30 PM | 22 (83/102) | 19 | Stone Sentinels (SS2) and The History Junkie (THJ) 5:30 PM block |
| C (proposed) | 18:00 | 11.3 / 6.0 | t267 4:30 PM; t271 5:15 PM; t275 6:00 PM; t278 6:20 PM; t280 6:30 PM | 21.3 (86/102) | 19 | current proposal: "a defensible mid value, labelled approximate" (the fact row's own best is 6:15 PM) |
| D | 18:30 | INVALID | times must strictly increase (tick 280); slope 0.00 min/tick over 275-280 is under 0.75 |  |  | Desjardin-derived summary "by 6:30 ... fix bayonets" (SRCH, HNc). Collides with the t280 Peach Orchard anchor (6:30 PM) |
| E | 19:00 | INVALID | times must strictly increase (tick 280); slope -6.00 min/tick over 275-280 is under 0.75 |  |  | Cross via HistoryNet: "after 7 p.m.". Later than the t280 and t295 anchors |

**Chronology events inside the two affected segments (t267-280)**: the clock each option gives them against the specialist's real best time (residual = real minus clock, minutes; the events were used to choose the current anchors, so the proposed column flatters the proposal):

| tick | class | real best | option A | option B | option C (proposed) |
|---|---|---|---|---|---|
| 268 | RELABEL | 4:45 PM | 10 | 8 | 4 |
| 271 | RELABEL-CONTESTED | 5:40 PM | 50 | 40 | 25 |
| 272 | RELABEL-CONTESTED | 5:40 PM | 45 | 33 | 14 |
| 275 | RELABEL-CONTESTED | 6:15 PM | 65 | 45 | 15 |

Mean abs residual on these 4 events: option A 42.5 min; option B 31.3 min; option C 14.4 min.

**Note.** Options D and E place the charge after the Peach Orchard collapse (t280) that the specialist anchors at 6:30 PM: choosing them means re-timing t280 and t295 too, which is a larger decision. The 15th Alabama's first assault (R060) is 4:30-5:00 PM per timelines but 6 PM per one HistoryNet reading (outlier).

**Sources not yet read that would settle it:** Desjardin, Stand Firm Ye Boys from Maine; Oates's account and OR 27/2 (Longstreet, McLaws, Law, Oates); OR 27/1 Chamberlain, Vincent/Rice, Sykes; Pfanz, The Second Day.

**Decision record** (the historian fills this in; it becomes one line of `decisions.jsonl`; the developer regenerates the anchors and the golden table and bumps `dv`):

```json
{ "id": "D-____", "subject": "anchor t275", "chosen": "option ___  or  ____-__-__T__:__", "range": ["__:__", "__:__"], "display": "about h:mm | between about h:mm and h:mm",
  "citations": [{ "work": "", "edition": "", "page": "", "kind": "primary | scholarship | compilation" }],
  "reviewer": "", "second_reader": "", "at": "____-__-__", "state": "reviewed | contested | deferred" }
```


<div style="break-after:page"></div>

## 3.5 Anchor t538: Pickett-Pettigrew-Trimble infantry step off (R108)

**Proposed:** July 3, 3:00 PM local mean time, sigma 30 min, accepted range 14:00-15:00, status R, flags H. Neighbours: t518 Cannonade opens (13:07) and t551 Armistead over the wall (15:35). **State: proposed.**

**The question.** When did the infantry step off from Seminary Ridge? The accepted range is 2:00-3:00 PM; the proposal is 3:00 PM. Wikipedia's own two articles disagree (about 2:00 vs around 3:00). This anchor sits under the site's 20-second hero moment (ticks 535-556), so it is the first item to review.

**What the site says at this tick today.** Event card label "11:05am" (critical): PICKETT'S CHARGE BEGINS. The entire Confederate assault force -- approximately 12,500 men in a mile-wide front -- steps off Seminary Ridge in Line of Battle heading east across the open fields toward .... The typed claims near it:

| kind | name | tick | claim | proposed clock at that tick |
|---|---|---|---|---|
| walkthrough stop | Pickett's Charge | 540 | July 3, 3:00 PM | July 3 3:05pm |
| timeline marker | Pickett's Charge | 538 | (marker label; compared with real time of the named event) | July 3 3:00pm |
| turning point | The Cannonade | 540 | Day 3 - Afternoon | July 3 3:05pm |

**Evidence read** (rows of `docs/plan/data/time-facts.csv`; source keys as printed there; SS = Stone Sentinels, an uncited compilation; SRCH = a web-search summary, page not opened; LIT = recalled, not re-verified):

| row | date | range | best | conf | tag | sources | event | disagreement notes |
|---|---|---|---|---|---|---|---|---|
| R108 | July 3 | 2:00p-3:00p | 3:00p | M | V | ABTm,ABTa,WPmain,SS3,WPPC,LSTR | Pickett-Pettigrew-Trimble infantry step off from Seminary Ridge | DISAGREEMENT: ABT ("stepped off in unison at about 3:00 p.m."), Wikipedia main ("Around 3 p.m."), SS3 2:30-3:00; Wikipedia Pickett's Charge "about 2:00 p.m." (citing Coddington p.502, Hess p.162, Sears p.415, Wert p.182 - which conflicts with the same article' |
| R100 | July 3 | 1:00p-1:10p | 1:07p | H | V | SS3,HNp,WPPC,NPS-Cushing,CAB | Two Confederate signal guns (Washington Artillery, Capt. Merritt B. Miller) - cannonade opens | HistoryNet: ~1 p.m., corroborated by Meade, Hunt, Hancock, Gibbon, Webb, Harrow, Hall; SS3 gives 1:07; NPS: "Around 1 pm". |
| R103 | July 3 | 1:25p-1:25p | 1:25p | M | V | HNp,WPPC | Alexander's first note to Pickett: 'If you are coming at all, come at once...' | HistoryNet gives 1:25pm; Wikipedia gives the text. |
| R105 | July 3 | 1:35p-2:40p | 1:35p | L | V | HNp,SRCH | Alexander's second note: 'For God's sake come quick. The 18 guns are gone.' | DISAGREEMENT: HistoryNet 1:35pm; one web summary (Padre Steve) says 2:40pm. Prefer 1:35-1:45 given step-off not before ~2pm. |
| R106 | July 3 | 1:40p-2:50p | 2:00p | L | V | WPPC,HNp | Pickett asks Longstreet 'General, shall I advance?'; Longstreet nods | Time not recorded; between second note and step-off. |
| R107 | July 3 | 1:45p-3:00p | 2:30p | L | V | WPPC,HNp,CAB | Confederate cannonade slackens / ends | DISAGREEMENT (Wikipedia note): Hess p.162 ~2:00; Sears p.415 2:30; Coddington p.502 3:00; Wert p.182 duration 45 min-2 h ("most reliable" 1 h); Eshleman 30 min; Hancock 1h45; Mallon 4h; Cabell "over two hours". |
| R110 | July 3 | 3:15p-3:30p | 3:20p | M | V | SS3,ABTm | Confederate lines reach the Emmitsburg Road fences; Union infantry fire begins | ABT map: "severe casualties from Federal artillery fire by 3:45 p.m." |
| R114 | July 3 | 3:10p-3:45p | 3:30p | M | V | SS3,ABTm | Confederates reach the wall at the Angle; 71st PA breaks; Cushing mortally wounded | SS3: 3:30-4:00 block; ABT map "3:30-3:45 pm"; lower bound 3:10 reflects the earlier-step-off hypothesis (2:30-2:45) and the site monument tooltips (3:00-3:20). |
| R115 | July 3 | 3:10p-3:45p | 3:35p | M | V | SS3,ABTm | Armistead leads 100-300 men over the wall, seizes guns, mortally wounded; Gibbon and Hancock wounded | Site monument tooltips say Cushing 3:00, Armistead 3:15, Hancock 3:20 pm (all 15-35 min early vs ABT/SS3). |

**Disagreement register** (time-facts section 4):

| # | topic | readings | specialist's suggested handling |
|---|---|---|---|
| 20 | Cannonade opens | 1:00 (HNp, WPPC, NPS-Cushing, CAB "about 1 p.m."); 1:07 (SS3); Longstreet OR gives "About 2 p.m." for Pickett's report | 1:07 with "about 1:00" |
| 21 | Alexander's second note | 1:35 (HNp) vs 2:40 (SRCH) | Prefer 1:35-1:45 |
| 22 | Cannonade ends | ~2:00 (Hess p.162); 2:30 (Sears p.415); 3:00 (Coddington p.502); ~1 h "most reliable" (Wert p.182); over 2 h (CAB); 30 min (Eshleman); 1h45 (Hancock); 4 h (Mallon) - all printed in the WPPC note / HNp | Range 1:45-3:00 |
| 23 | **Infantry step-off** | ~3:00 (ABTa; ABTm description; WPmain "Around 3 p.m." citing Coddington p.402, McPherson p.662, Eicher p.546, Trudeau p.484, Walsh p.281); 2:30-3:00 (SS3); "about 2:00" (WPPC citing Coddington p.502, Hess p.162, Sears p.415, Wert p.182 - Wikipedia's two articles conflict); "About 2 p.m. Pickett reported ready" (LSTR) | **R anchor** t538; a 2:00 step-off contradicts the 3:10-3:45 arrival at the wall |
| 24 | The Angle | 3:30-3:45 (ABTm); 3:30-4:00 (SS3); site monuments 3:00/3:15/3:20 | Range 3:10-3:45; best 3:30-3:35 |

**Options.** Each is a reading of a source the specialist consulted; you may supply another time. "Clock" columns show the model's clock at sample ticks under that option (5-minute rounding); "slope" is minutes per tick on either side of the anchor.

| option | time | slope before / after (min per tick) | clock at sample ticks | all-102 in-sample mean abs error, min (within 30) | keyframe pairs over the speed caps | basis |
|---|---|---|---|---|---|---|
| A | 14:00 | 2.6 / 7.3 | t518 1:05 PM; t528 1:35 PM; t538 2:00 PM; t545 2:50 PM; t551 3:35 PM | 23.5 (82/102) | 15 | Wikipedia Pickett's Charge "about 2:00 p.m." (citing Coddington p.502, Hess p.162, Sears p.415, Wert p.182); Longstreet OR "About 2 p.m. Pickett reported ... in order" (a report about the line, not the step-off) |
| B | 14:30 | 4.2 / 5.0 | t518 1:05 PM; t528 1:50 PM; t538 2:30 PM; t545 3:05 PM; t551 3:35 PM | 22.4 (87/102) | 17 | Stone Sentinels (SS3) 2:30-3:00; the specialist's consistency check: a 2:00 step-off would put the lines at the wall by about 2:30, contradicting the 3:10-3:45 arrival every source read gives, so the step-off cannot be much earlier than about 2:30-2:45 |
| C (proposed) | 15:00 | 5.7 / 2.7 | t518 1:05 PM; t528 2:05 PM; t538 3:00 PM; t545 3:20 PM; t551 3:35 PM | 21.3 (86/102) | 19 | current proposal: American Battlefield Trust ("stepped off in unison at about 3:00 p.m.") and Wikipedia's main article ("Around 3 p.m.", citing Coddington p.402, McPherson p.662, Eicher p.546, Trudeau p.484, Walsh p.281) |

**Chronology events inside the two affected segments (t518-551)**: the clock each option gives them against the specialist's real best time (residual = real minus clock, minutes; the events were used to choose the current anchors, so the proposed column flatters the proposal):

| tick | class | real best | option A | option B | option C (proposed) |
|---|---|---|---|---|---|
| 520 | RELABEL-CONTESTED | 1:15 PM | 3 | 0 | -3 |
| 522 | RELABEL | 1:30 PM | 12 | 6 | 0 |
| 532 | RELABEL-CONTESTED | 1:35 PM | -9 | -30 | -51 |
| 538 | RELABEL-CONTESTED | 3:00 PM | 60 | 30 | 0 |
| 540 | RELABEL | 3:10 PM | 55 | 30 | 5 |
| 542 | RELABEL | 3:20 PM | 51 | 30 | 9 |
| 544 | RELABEL | 3:20 PM | 36 | 20 | 4 |
| 546 | RELABEL | 3:30 PM | 32 | 20 | 8 |
| 547 | RELABEL | 3:30 PM | 24 | 15 | 6 |
| 548 | RELABEL | 3:35 PM | 22 | 15 | 8 |
| 549 | RELABEL | 3:30 PM | 10 | 5 | 0 |
| 550 | RELABEL | 3:30 PM | 2 | 0 | -2 |

Mean abs residual on these 12 events: option A 26.3 min; option B 16.8 min; option C 8.1 min.

**Note.** The neighbours t518 (cannonade opens 1:07 PM, sourced H) and t551 (Armistead over the wall 3:35 PM) bound the choice: an earlier step-off stretches the ticks between the step-off and the wall. Cushing, Armistead and Hancock monument tooltips say 3:00, 3:15 and 3:20 PM (15-35 minutes early against the sources).

**Sources not yet read that would settle it:** Wert, Gettysburg: Day Three; Hessler and Motts, Pickett's Charge at Gettysburg; Coddington pp.402, 485, 493, 500-502; Sears pp.377-83, 415; Hess p.162; Alexander, Fighting for the Confederacy; OR 27/2 Longstreet, Alexander, Pendleton.

**Decision record** (the historian fills this in; it becomes one line of `decisions.jsonl`; the developer regenerates the anchors and the golden table and bumps `dv`):

```json
{ "id": "D-____", "subject": "anchor t538", "chosen": "option ___  or  ____-__-__T__:__", "range": ["__:__", "__:__"], "display": "about h:mm | between about h:mm and h:mm",
  "citations": [{ "work": "", "edition": "", "page": "", "kind": "primary | scholarship | compilation" }],
  "reviewer": "", "second_reader": "", "at": "____-__-__", "state": "reviewed | contested | deferred" }
```


<div style="break-after:page"></div>

## 4. Spot-check list for the other anchors

Every S and M anchor below is a reading of the fact rows in `time-facts.csv`; the flags say why it is weak. Ranges are the union of the linked rows.

| tick | time | event | why it is on the list | range | sources as printed | evidence text |
|---|---|---|---|---|---|---|
| 1 | 05:00 | Heth's column leaves Cashtown | S anchor on an M-confidence row; S anchor failing the evidence rule (needs one Official Records report or two strong families); no strong source family | 05:00-05:30 | SS1, THJ, LIT | SS1, THJ; site label already 5:00am |
| 5 | 05:20 | Archer/Davis lead Heth's column out of Cashtown | circular (from the site's own label); no strong source family | 05:00-05:30 | SS1, THJ, LIT | SS1, THJ (5:00 departure); keeps the pre-7:30 slope realistic |
| 28 | 10:15 | Reynolds killed | S anchor on an M-confidence row | 10:15-10:50 | DBL, WPrey, WPd1, SS1, CWC, THJ | Doubleday OR 10.15; WPd1; site monument tooltip 10:15; dispute 10:40-10:50 |
| 36 | 11:00 | Railroad Cut charge | S anchor failing the evidence rule (needs one Official Records report or two strong families) | 10:45-11:15 | WPd1, SS1 | WPd1 ~11am; SS1 10:45-11:00 |
| 53 | 14:30 | Iverson's Pits | S anchor on an M-confidence row | 14:00-15:00 | SS1, WPd1, DBL | SS1 2:30; WPd1 (Rodes 2:00); Doubleday OR (Schurz 2:30) |
| 302 | 19:10 | 1st Minnesota's charge | no strong source family | 18:45-19:30 | SS2, LIT | SS2 6:30-7:00 block; LIT 7pm |
| 326 | 20:00 | Early attacks East Cemetery Hill | S anchor failing the evidence rule (needs one Official Records report or two strong families) | 19:30-20:30 | WPd2, WPCem, SS2 | WPd2 8pm; WPCem dusk 7:30; SS2 |
| 500 | 09:00 | Pickett's division arrives | no strong source family | 08:30-10:00 | SS3 | SS3 9:00 (single source; needs Wert/Hessler check) |
| 515 | 11:00 | Culp's Hill fighting ends | S anchor on an M-confidence row; S anchor failing the evidence rule (needs one Official Records report or two strong families) | 10:30-12:00 | WPmain, WPCH, SS3 | WPmain ~11am; SS3 10-11; site text itself says 11:00am |
| 556 | 16:00 | Assault collapses / Lee meets survivors | no strong source family | 15:45-16:30 | SS3 | SS3 4:00-6:00; ABT 4:00 map |

The anchors that pass the mechanical checks (t12, t57, t64, t72, t240, t256, t267, t280, t295, t314, t340, t451, t518, t551, t568) still rest on the specialist's reading of secondary sources; a spot check of any of them is welcome.


## 5. For the owner: design anchors and the circular one

| tick | time | what it is | what signing means |
|---|---|---|---|
| 100 | 07-01 20:00 | Nightfall design anchor: sunset 7:32 PM, civil twilight ends 8:04 PM (NOAA algorithm, local mean time). Owner signs. | accept the convention (local mean time, first light at 04:30) and the solar times; regenerated from the NOAA algorithm, not an almanac |
| 226 | 07-02 04:30 | Day-2 start design anchor: first light 4:30 AM (civil dawn 4:03, sunrise 4:35). Owner signs. | accept the convention (local mean time, first light at 04:30) and the solar times; regenerated from the NOAA algorithm, not an almanac |
| 675 | 07-03 20:00 | Nominal end of battle design anchor: 8:00 PM July 3 (sunset 7:32, twilight ends 8:04). Owner signs. | accept the convention (local mean time, first light at 04:30) and the solar times; regenerated from the NOAA algorithm, not an almanac |
| 5 | 07-01 05:20 | Circular: derived from the site's own t5 label (5:20 AM). Imported as design-class sigma 30 (owner decision 3 default). Drop or keep is an owner decision. | keep as a design-class anchor with sigma 30, or drop it (then t1 to t12 is one 10.3 min/tick segment) |

## 6. What a decision changes on the site

- **Nothing changes until an anchor is `signed`.** Until then every time is printed with "about" and the clock popover says the time is unreviewed. Only a signed anchor with sigma under 10 minutes may drop the word (t12 and t518 are the only two candidates).
- A changed anchor time changes the clock for every tick in its two neighbouring segments and bumps `dv`. Bookmarks and links keep meaning "that frame"; where a moment is re-ticked, only a link that carries the moment id follows it.
- Sensitivity, computed above: each option's slopes, the clock at sample ticks and the residuals of the events inside the segments. A historian's choice that makes a slope leave 0.75-60 minutes per tick, or breaks the strict order with a neighbour, is rejected by the validator with the message printed in the INVALID row.

## 7. Provenance and limits

- Facts, ranges, confidence and source keys: `docs/plan/data/time-facts.csv` (129 rows; H/M/L 18/66/45; 45 rows are confidence L). The register: `docs/plan/specialists/time-facts.md` section 4 (33 disagreements).
- Only seven NPS-hosted Official Records reports were read (Doubleday, Hall, Wainwright, Longstreet, Work, Cabell, Hodges). Wikipedia was read as raw wikitext; Stone Sentinels, The History Junkie and Civil War Cycling are compilations of low authority.
- Independent figures: in-sample mean absolute error 21.3 min over the 102 matched events (86/102 within 30 min); off-anchor 28.8 min; leave-one-out RMS 43.8 min over 29 interior anchors. See `docs/editorial/time-audit.md`.
- Rights: publish facts, ranges and source keys, not paragraphs (Wikipedia text is CC BY-SA; ABT, HistoryNet and Stone Sentinels are copyrighted; NPS Official Records text is public domain).

