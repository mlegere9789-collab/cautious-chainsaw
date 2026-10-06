# Adversarial review of `docs/pitch/anim/PITCH.md`

Reviewer: agent `review`, 2026-10-06. Object: `PITCH.md` (93,202 bytes, commit 4e01792) and the evidence it cites in `docs/pitch/anim/`, including the prototype `battle-studio.html` (sha256 `5f6be41a57d21043...`, the same file report 07 verified). I changed no product file and no file of the pitch or the prototype. My own files are this document, `review-runs/` (scripts and raw results), `shots/review/` (two pictures) and, uncommitted, `tmp/pitch-anim/review/`.

Evidence words are the site's: **Measured** (a command I ran), **Computed**, **Documented** (a page I read, URL given), **Unknown**. Severity: **S1** would mislead the owner or misreport one of the owner's rules; **S2** a requirement is not met or the evidence that it is met is missing; **S3** a number or a sentence to correct; **S4** polish.

---

## 0. Verdict

The pitch is unusually honest about its own prototype and most of its numbers check out (section 3). It should still **not go to the owner as written**. Five problems matter most.

1. **It never tells the owner that, at the site's own start zoom (13.5), the engine hides most units behind counts.** I measured 82% of units inside counted tiles in War Room at zoom 13.5 (94% in the "never nudge" setting the pitch leans toward; in that setting nearly half of the merged units sit in "Contact" tiles that mix both sides). The pitch's pictures are all at zoom 15 to 16.5, where in War Room's default 7 to 31% are merged. This is the owner's second absolute rule ("never hide vital info"), and the pitch scores it only on motion. (Fixes 1, 2.)
2. **Several headline numbers take the friendly end.** "No tile at all on about 4 to 5% of frames" is the lenient, popups-off metric; the same pitch-run files give 12 to 16% in real time with popups on, and the verifier's own table reaches 23% on the opening scene. "Largest step 15 to 94 px" and "0 to 0.1 sudden jumps" are contradicted by the pitch's own pitch-run table (109 px; 0.13). The clock's "candidate clock" disclosure is clipped off the top bar at 1440, 1366 and 1280 px wide. (Fixes 13 to 17, 12.)
3. **"Jitter fixed: Met" and "All twelve popups kept" are broader than the evidence.** Jitter holds for unattended playback at a fixed camera on one laptop; it fails in reduced-motion mode (which the owner's decision of 2026-10-05 says must be respected), under CPU load (worse than today's reproduction), on hard cuts, after a pause, and, in my run, as a boil of fading tiles during camera zoom. "Twelve" is twelve registry modules, two of them new; the product has 51 overlay entries, and the prototype's onboarding replacement drops the archetype choice and the 5-step tour. The existing hit flash, engaged pulse, trails and bearing rotation have no stated fate. (Fixes 6 to 8.)
4. **The way out the pitch proposes (milestone M1 and decision 2b) is unproven and may not exist.** Its own data say there is "no free middle": strict hand-overs hop (9 per second, up to 198 px), smooth hand-overs leave ghosts and gaps. "Zero on every script, smooth, at 4x CPU" is an acceptance test nobody has shown to be attainable. (Fix 4.)
5. **The "three pitches" are one engine in three skins, and the ranking is argued from taste against the owner's own rules.** By the pitch's own table War Room has the only solid contacts, the most merged units, the heaviest draw and an untested ground; its legibility win is the legibility of a defect that M1 is meant to remove. (Fixes 35, 36.)

Good news I found and the pitch should use: the three looks stay legible on **real Mapbox satellite imagery** in a static composite (fix 31); the independent instrument's headline numbers reproduce on re-run (section 4); the Machado colour-blindness matrices and the corps-badge list check out against their sources (fixes 22, 23).

**Count: 38 required fixes** (S1: 8, S2: 8, S3: 19, S4: 3).

| # | Sev. | One line |
|---|---|---|
| 1 | S1 | Units hidden in counts at zoom 13.5: 82% (94% never-nudge); not in the pitch |
| 2 | S1 | "Contact x N" and "Lead +k" tiles: side lost, a proximity guess named like an engagement, 58% of merged units are not formation groups |
| 3 | S1 | "Never overlap" holds for solid tiles (opacity 0.5 or more) on paused pictures; say so at first use |
| 6 | S1 | "Jitter fixed: Met" is conditional; reduced motion breaks owner decision 5 |
| 7 | S1 | "All twelve popups kept": modules, not popups; onboarding reduced; tint and 39 other entries unregistered |
| 12 | S1 | Clock disclosure clipped on screen; "candidate" hard-coded |
| 13 | S1 | "No tile on 4 to 5%" vs 12 to 16% real time and 23% opening scene |
| 36 | S1 | War Room ranked first against the pitch's own scores on the owner's rules |

---

## 1. What I did and did not do

- Read `PITCH.md` in full and reports 01, 02, 06 and 07 in full or in the parts the pitch cites; read the cited parts of 03, 04, 05 and the prototype README, skin specs, display layer, aggregate naming, clock module and popup README.
- Re-computed every figure of sections 6 to 9 that comes from `pitch-runs/results/*.json` (all 18 play, 18 motion and 18 gap runs and the nine experiment sets) and compared them with the text (section 3).
- Re-ran the prototype in real Chrome 155 (headless, 16 logical cores, Windows 11) on ports 9740 to 9749 with a scratch copy of the verifier (`tmp/pitch-anim/review/scratch`, git-ignored), using the verifier's own `v3b-gaps` and `v3-play` unchanged and seven new probes of mine (`review-runs/scripts/r-*.mjs`).
- Captured real Mapbox satellite tiles through the harness Referer injection (85 tile requests, cap 300) and drew the three looks over them at the same camera (static frames).
- Read three external pages: Wikipedia "NATO Joint Military Symbology", the Machado 2009 simulation page, and civilwarnews.com's reproduction of the 21 March 1863 circular (URLs in fixes 19, 22, 23).
- **Not done:** real phone, other browsers, motion over imagery, a person with colour-vision deficiency, a historian, the product bundle. I did not re-run the prototype's 163 tests or the whole verifier. Section 5 lists limits.

---

## 2. Required fixes

### 2.1 The owner's rules

**1. [S1] Say how many units have no tile of their own at the zoom the site opens at, and rescore "never hide vital information" with it.**
*Where:* sections 1, 4, 6 to 8 ("Against your rules" tables, "tiles never hide vital information" rows), 9.2, 11.
*Problem:* the pitch scores this rule on motion only (gaps, faint tiles, the interface). It never reports the cost of the layout's own remedy for overlap, which is to merge units into one counted tile. The pitch's pictures are at zoom 15, 16 and 16.5; the prototype opens at 15.5; the product opens at **13.5** (report 03 line 60; I confirmed it: the live-style page loads at centre -77.235, 39.812, zoom 13.5). Report 06 already said so (section 0 item 3: 319 of 384 units in aggregates at zoom 13; section 10: 83% at zoom 13 with the 48 px budget, 96% with none). The pitch dropped it.
*Evidence (Measured, `review-runs/scripts/r-agg.mjs`, `results/r-agg.json`):* settled, camera on the field centre, 12 ticks (1, 56, 120, 226, 293, 346, 400, 451, 538, 551, 604, 650), popups off. Share of units on the field that sit inside a counted tile:

| Setting | z13 | z13.5 | z14 | z15 | z15.5 | z16 | z17 |
|---|---|---|---|---|---|---|---|
| War Room, default (nudge up to 48 px) | 90% | **82%** (max 90%) | 67% | 31% | 17% | 7% | 2% |
| War Room, never nudge (`layout.dMaxPx` 0) | 98% | **94%** | 86% | 57% | 49% | 36% | 20% |
| Field Manual, default | 85% | 77% | 59% | 27% | 13% | 5% | 0% |
| Field Manual "Instrument" (straight line, never nudge) | 98% | 94% | 85% | 55% | 47% | 35% | 19% |

At tick 551, zoom 13.5, War Room default: 104 tiles for 451 units, of which 47 are single units and 57 are counted tiles holding the other 404. Never-nudge: 56 tiles, 435 of 451 units counted. The prototype's own skin bench agrees in kind: whole field, zoom 13.5, tick 620, 121 tiles (War Room), 142 (Field Manual), 141 (1863 Map) for 478 units (`prototype/results/skin-bench-cpu1.json`). Picture: `shots/review/review-wr-z13.5-schematic.png` and `review-wr-never-nudge-z13.5-schematic.png`.
*What a counted tile shows:* a count, plus a name that is a formation only about a third of the time (fix 2). Report 06 section 1.1 defines the vital items as short name, side, arm, **strength state** per unit (V1 to V3, V5); a count badge is V4, a different item. The Inspector lists an aggregate's members but stops at 40 ("and 31 more" for the 71-unit aggregate at tick 400), so some units are unreachable at that zoom (`src/ui/studio.mjs` line 180).
*Fix:* (a) put this table (or its zoom 13.5 and 14 rows) in section 1 and in the tables of sections 6 to 8; (b) redefine "vital" in plain words and stop saying a unit is "represented" when only a count is; (c) add a zoom 13.5 picture to each look; (d) take it to the owner as a decision: semantic zoom (small side-and-arm marks that keep every unit visible at low zoom, chips only when zoomed in or selected), aggregation only inside one formation, or accept it; (e) give decision 5 ("may a tile be nudged") this cost, since the strict setting is the one that reaches 94%.

**2. [S1] Rename or justify "Contact x N" and "Lead +k" tiles.**
*Where:* section 4 line 100 ("merge ... along the order of battle"), section 6 "Honest limits".
*Problem:* `layout/tiles.mjs` `aggregateName`: any aggregate holding both sides is named **Contact**; one whose members share a brigade, division or corps takes that formation's code; anything else is named after its lead unit plus "+k" (it can span several corps). In my run at zoom 13.5, War Room default, the 3,491 merged unit-observations split: Lead +k 58%, division 19%, brigade 9%, Contact 7% (416 mixed-side), corps 4%, battalion 2%. Under never-nudge: Contact 46% (1,799 of 3,900; 1,921 mixed-side), Lead +k 44%. So "along the order of battle" is true of about a third. "Contact" is a proximity guess that reads as a military claim, the very thing report 03 (E15, line 412) and the pitch itself (line 512, "a proximity-based 'engaged' glow") refuse to build; on carried-forward positions that are hours old it is not even a statement about that moment. A mixed tile loses side for every member. "I/3 +20" invites reading "I/3 and 20 of its subordinates".
*Fix:* name aggregates only by what is true (for example "Mixed x 24, both sides, positions up to N ticks old"), or restrict merging to one side and one formation; put the rule and its evidence label in the legend; raise the Inspector cap or paginate; report the shares above.

**3. [S1] State the definition of "never overlap" where it is first used, and what "settled" means.**
*Where:* section 1 ("What holds"), section 4 promise 1 and 2.
*Problem:* the guarantee is "no two **solid** tiles overlap", solid meaning opacity of 0.5 or more; a tile below 0.5 "neither obscures nor is obscured" by definition (`scene/display.mjs` header; report 06 section 1.2). The owner's wording is "at all". Section 4 and 12 say this, but the one-page summary leads with "0 overlaps in 1,428 of 1,428" which is paused pictures after a jump. The product's main state is playing, where the same instrument finds a faint tile over a solid one on 22 to 27% of frames (pitch runs; 5 to 41% verifier).
*Fix:* in section 1 and in each "Against your rules" table write "solid tiles on a paused picture" next to every "0", and put the playing figure beside it in the same cell.

**4. [S2] Treat M1 and decision 2(b) as research, not as a specified fix; add a precedence and a fall-back.**
*Where:* section 9.2 items 3 to 5, section 10 M1, section 11 decision 2 and 5.
*Problem:* the pitch's own table (9.2, which I recomputed and which matches) shows each setting loses somewhere: strict "snap" has 0% gaps and 2.8% / 0.1% faint-over-solid but 9.1 and 8.5 solid hops per second and steps of 198 and 126 px; every gliding setting keeps 4 to 9% gaps; the nudge budgets trade ghosts for 26 to 44% fewer separate tiles (and, per fix 1, up to 94% merged). Decision 2(b) ("tiles that persist glide, tiles that appear or disappear swap in one frame") has no prototype, no measurement, and the proposed repair of V-01 ("an outgoing tile stays until its replacement is solid") makes two solid tiles overlap by construction unless they swap in one frame, which is a hop. M1's "done when" (zero on `v3b-gaps`, `v3-play`, `v2-sweep`, at 1x, 4x **and 4x CPU slowdown**) may be unattainable together with smooth motion and the 48 px / never-nudge choice.
*Evidence:* section 9.2 table; my re-run of the deterministic gaps: snap 0% / 0% and never-nudge 6.8% / 6.6% reproduce exactly; default 4.6% / 7.8% (pitch 5.5% / 7.3%).
*Fix:* (a) before the owner is asked to approve decision 2, build and measure the "(b)" combination in the Studio; (b) state a precedence for when the rules cannot all hold (suggested: zero overlap, then zero hidden unit, then smoothness) and the owner's fall-back; (c) split M1's acceptance into the parts that are provably reachable (instrument zero on paused pictures, interface reserved) and the parts that need a feasibility result.

**5. [S2] Redo the no-split audit; the engine as built has a second state of its own.**
*Where:* section 3, section 4 diagram, section 12 V-01 to V-03.
*Problem:* the pitch's rule is "every place where two code paths must agree is a place where they can disagree for one frame". The engine has exactly that: the layout's solved place (`layout/engine.mjs`) and the **display layer's** glided, faded, travelling place (`scene/display.mjs`), plus a verify-and-repair net that can contradict the layout (V-01 cause: `_verifyAndRepair` sets a dying tile's opacity to 0). The three shared defects V-01 to V-03 are the "disagree for a frame" failure; the header comment says "the guarantee never depends on the glide being right", meaning the guarantee is carried by dimming. Still in the build: three layout strategies (certified, raw, production), three motion modes (dynamics, spring, snap), two interpolation models, three visibility rules, an adaptive solve cadence (`solveEvery` auto), the Before reproduction; recommended: a sprite cache (a cached draw and a live draw that must agree), report 05's kill switch.
*Fix:* add a table of every pair of representations that must agree and, for each, whether it ships; the product build keeps one strategy, one motion mode, one interpolation model; justify the sprite cache under the rule (or restrict it to a pixel-equality-tested optimisation) and say how it is tested.

**6. [S1] Replace "Jitter fixed: Met at 60 fps" with a per-condition statement.**
*Where:* section 1 "What holds", the three tables (lines 191, 275, 360), section 4.
*Problem:* "Met" is true for unattended playback at a fixed camera on one 16-thread laptop at 60 Hz, headless Chrome. Not met, from the pitch's own evidence and my runs:

| Condition | Evidence |
|---|---|
| paused picture | still drifting up to 14.75 s after a pause; 13 of 36 stateful samples never rest (V-06) |
| hard cut | tile layer blank about 3 frames (V-05) |
| 4x CPU slowdown | independent: 21.8 to 27.6 fps, 2.2 to 5.9 sudden steps a second; prototype README table: Studio 24, 28, 24 fps against the reproduction of today's renderer at 38, 53, 59 fps on the same slowdown (README section 4.1), phone viewport 36 to 38 against 59 to 60. The new engine degrades **more** than today's code under load |
| reduced motion | 3.1 to 8.7 solid hops a second, steps to 185 px, opacity flashes 12.7 to 28.9 a second against 0.2 to 1.55 in normal mode (V-07). This breaks the owner's decision of 2026-10-05 (item 5, "reduced-motion respected"); V-07 is rated Medium and the pitch repeats "decide what reduced motion should show" |
| camera zoom (**not measured by anyone before**) | Measured, `r-zoom.mjs`, War Room default, 90 frames at 60 Hz: zoom in 13.5 to 15.5: 346 tile births and 82 deaths in 1.5 s, 56% of tile-frames below 0.5 opacity; zoom out 15.5 to 13.5: 498 births, 379 deaths, 23% faint, and single-unit tiles shifted more than 3 px relative to their own unit 184 times in 22 of 90 frames (largest 16 px). Never-nudge: 19% faint on zoom in, up to 26 px on zoom out. Panning: 0 pops. One scene, one metric of mine: indicative |
| refresh rate | only 60 Hz was run; 120/144/240 Hz displays are not measured (the clock is a fixed 120 Hz step, so it is plausible, not shown) |

*Fix:* state the claim per condition; raise the reduced-motion item to S1/High; measure camera zoom with the verifier's instrument; measure one high-refresh display.

**7. [S1] "All twelve popups are kept" counts modules, not popups, and hides what is unregistered.**
*Where:* lines 39, 128, 171, 192, 276, 361, 549.
*Problem:* the registry holds 12 modules (report 07 section 3.6). Mapped to the product's entries (report 02): event P-01, story P-02, toast P-03, cross-out P-04, unit card P-05 and P-06, tour P-07, clock P-10, legend P-12, minimap P-13, hints P-31 and P-38 are 12 existing entries rebuilt by **ten** modules; day banner (P-39) and Chronicle are **new**. The product has 51 entries (39 on the desktop shell, 12 on the phone shell); the other entries are untouched and untested with the Director, whose "never on a tile" guarantee covers only registered cards (Roster 560 px wide, Search, Filter, Extra Features cluster, Layers, Distance tool, Locations, Help, Bookmarks, monuments card). Two of the "kept" ones are not kept as they were:
- **Onboarding (P-31)** has an archetype choice, a 5-step tour and a quick reference (report 02 line 142). The prototype's `hints` module covers P-31 with "four one-time hints, a key list, what the evidence labels mean" (`popups/README.md` line 21). If that ships, it removes part of an existing popup.
- **Day/night tint (P-19)** is driven by its own formula (5:00 + 5 min per tick), disagreeing with the toolbar. The pitch (line 173) says it "stays exactly as it is"; report 02 line 425 proposes driving it from the clock module, and the pitch's "one clock module" claim is false while the tint stays.
*Fix:* replace the headline with "ten modules rebuild 12 of the product's 51 overlay entries, two modules are new, and the other 39 entries are unchanged and not yet registered with the Director"; add a row per entry (kept as is / rebuilt / new / dropped, none dropped without the owner's yes); keep the product's onboarding; decide the tint.

**8. [S2] State the fate of every existing on-map effect; the pitch omits four.**
*Where:* line 173 ("not carried over"), line 227, line 512.
*Problem:* today's tile layer has a **hit flash** (1 s light-blue or orange fill after a strength drop; report 01 section 3.4, 45 of 93 adjacent pairs), an **"engaged" pulse with a cannon-sound hook** (3.4, T8), a **trail canvas**, a selection glow, label thresholds, leader lines, and tiles **rotated by bearing** (facing). The owner says they love what pops during the animation. The pitch's "not carried over" list omits hit flash, engaged pulse and rotation, and says the trails button and the rest "stay exactly as they are" while report 05 (lines 411 to 412) says the engine "takes over trails, the engaged glow and the sound hook". The Before reproduction also omits hit flash, trails, fps text and sound (prototype README line 41), so the comparison is not of everything.
*Fix:* a table of each effect with keep / replace / drop and the reason; report 04 (line 194) recommends keeping the flash and ring with data-derived triggers; get the owner's yes for any drop, including facing (report 03 E12 says adopt an 8-point facing mark; the skins draw none).

**9. [S2] Tiles cover map information too; measure it and give the layout obstacles.**
*Where:* section 6 to 8 ("never hide vital info"), section 13.
*Problem:* V-04 measures the interface over tiles. Nothing measures tiles over the map's own names. In the pitch's hero pictures the schematic place names are cut by plates (desktop-03: "Codori Farm", the Bryan Farm and High Water Mark pair; desktop-09: "Herr Ridge", "Lee's Headquarters"). On real imagery (my composites, judged by eye on one frame each; fix 31) four of the seven place names in view at zoom 13.5 are partly or wholly under tiles, and "The Angle" is wholly hidden under a tile in Field Manual and in 1863 Map at zoom 15 (cropped check). The real site also has a Locations layer (P-29), overlay lines, a Mapbox label layer and a 512-monument array that the engine does not know exist.
*Fix:* add place labels, Locations and monument markers to the layout's obstacle set (or declare them lower priority and measure the overlap), and add that count to M1's acceptance.

**10. [S2] Names and card text are cut with an ellipsis in the pitch's own pictures.**
*Where:* "Name, side, arm and strength are painted at full strength on every tile" (lines 190, 229, 274).
*Problem:* true of ink, not of text: "3rd Bde, 3rd Div, 1st C...", "14th Connecticut Infant...", "2nd Massachusetts Infan..." (desktop-03, compare-z15), event cards ending "(possibly a..." and "in Herbst Wood..." (desktop-09), the top-bar clock "(+-27 m..." (fix 12). By the pitch's own meaning of vital, a name cut mid-word is partly hidden. Each tile also carries the same fact twice ("14 VT" plus "14th Vermont Infantry" beside it), which is the main source of clutter and of lost room.
*Fix:* show the full name or an unambiguous shorter form; drop the duplicate (code or name); count ellipsised names in the instrument.

**11. [S2] "Easy to tweak and extend: Met" is overclaimed, and the owner asked for a process.**
*Where:* lines 193, 277, 362, 550.
*Problem:* report 07 V-08: skin tokens are not in the Tuning panel or the exported settings file; importing a bad skin id draws grey boxes. V-11: a new skin breaks a hard-coded repo test and is missing from the conformance list; a doc string under 6 characters passes the build and the page never starts. The "35-line skin" has lines up to 252 columns (54 lines wrapped at 100) and leans on 543 lines of kit, semantics and glyphs (V-11). The owner asked that the system "consistently improve" and take additions; the pitch gates only M1 with the verifier, not every later tweak.
*Fix:* change "Met" to "Met with listed friction"; add a standing gate: a short list of the independent scripts (`v2-sweep`, `v3b-gaps`, `v3-play`, `v4-motion`) with numeric thresholds run on every skin or dial change, golden pictures, and a changelog of tokens.

**12. [S1] The clock disclosure is clipped on screen and hard-coded as "candidate".**
*Where:* line 140 ("every clock reads about 10:15 AM (+-20 min), candidate clock"), line 556, section 12.
*Problem:* verified in the DOM text, but not visible. Measured (`r-chrome.mjs`, `results/r-chrome.json`): at 1440x900, 1366x768 and 1280x720 the top-bar clock string has `scrollWidth` 246 to 250 against `clientWidth` 156 (1440, 1366) and 170 (1280) and is cut by an ellipsis, so the viewer sees "July 3, about 6:10 PM (+-27 m..." (the pitch's own desktop-03 and desktop-09 pictures show it). Only at 1920 px and on the phone is it complete. The strip under the map still says "clock is a candidate, not reviewed" at 1280 and up; the phone has a shorter strip and a complete top-bar string. Also `src/time/clock.mjs` line 49 hard-codes `candidate: true, state: 'proposed'`; the owner's decision 2 (2026-10-05) settles the anchors in this release, after which "candidate clock" printed on every screen becomes a false statement. "Candidate clock" is also internal jargon.
*Fix:* make the label from each anchor's own `state`, `decision` and `review_flag` and use the owner's wording (approximate, with the uncertainty); fit the string at 1280 or break it onto two lines; have the verifier check visible text (rendered width), not only `textContent`.

### 2.2 Numbers and wording that must change

**13. [S1] "A unit has no tile at all on about 4 to 5% of frames" (lines 40, 189 to 190, 273, 358).**
It comes from `v3b-gaps` (60 Hz virtual time, popups off, a dying tile above opacity 0.02 counts as a tile). The same pitch-run files for real-time playback with popups on (`v3-play`, field `framesMissingUnits`, a unit with no **live** tile) give **15.9%** (War Room), **13.9%** (Field Manual), **12.4%** (1863 Map) of frames; per run 6.9 to 22.2%. The verifier's V-01 table reaches 10.3% (4x) and **23.1% (16x) on the opening scene**, the first thing a viewer sees. My re-run: The Angle 4x 13.5% and Rose Woods 4x 18.2% real time; 4.6% and 7.8% deterministic.
*Fix:* quote both metrics, name which is which, lead with the worse, and add the opening scene.

**14. [S3] Sudden jumps and largest step contradict the pitch's own runs (lines 41, 113, 561, section 12).**
"0 to 0.1 per second" and "15 to 94 px" are the verifier's one run; the pitch runs give up to **0.13** (1863 Map, The Angle 4x) and **109 px** (1863 Map; section 8 prints 109, sections 1, 4 and 12 print 94). Make them agree ("0 to 0.13", "15 to 109 px").

**15. [S3] V-03's "27 to 100% of frames" is partly an instrument artefact, and War Room's number is missing.**
A unit counts as "in view" if its tile is within 1 px of the viewport, but the renderer culls such a tile, so no ink is painted. In War Room at The Angle the verifier's flags fire on **100%** of frames because a plate straddles the top edge (`results/v3-play-1440x900-inv.json`: tile at y = -11.8, five units, no ink). With a strict rule (tile fully inside the viewport, engine opacity; `r-dimonly.mjs`) the share of frames with at least one faint-only unit is 28 to 73% (War Room, mean 53%), 45 to 90% (Field Manual, 62%), 44 to 75% (1863 Map, 59%), and faint-only unit-frames are 1.4 to 10% of unit-frames (about 4 to 5% on average). So the finding stands, the 100% does not, and War Room is not the worst. The War Room section omits its pitch-run figure (67.9%) while the other two print theirs (65.1%, 60.1%); print all three and the strict recount.

**16. [S3] "The Before view is correct to the source" (line 39) overstates.**
The clock, tile set and true positions are exact (0 mismatches in 1,560 and 522 frames; 5e-10 px). The drawn bar positions are not: 36% within 0.5 px, median 3.2 px, p95 61 px, max 129 px; aggregates agree within 4% (report 07 V-13). Say "reproduces today's renderer in aggregate, not frame by frame" under the 181-pairs picture.

**17. [S3] Weak-device figures (lines 80, 527, 561).**
"24 to 38 fps" mixes desktop (24, 28, 24) and phone-viewport (36 to 38) rows of the README table; the prototype README elsewhere says "25 to 37" (D-8); the independent figure is **21.8 to 27.6**. State the independent figure, give desktop and phone separately, and add what today's reproduction does on the same slowdown (38 to 59 fps; report 01 measured the production page at 13 to 15 fps, so the two are not like for like). Also say the engine costs 3.4 to 5.1 ms a frame against 1.1 to 2.8 ms for the old drawing code at 1x (README 4.1), and 11 to 18 ms at 4x.

**18. [S3] Popup measurements: scope.**
"11,256 frames, 0 chips covered" are 28 settled frames per event or story tick after a seek (`v7c`), not playback; during playback the evidence is a 9-second run at 4x (`popups/README.md` line 107). "4.8 to 6.4 cards on screen on average, at most 16" includes the three persistent cards (legend 3,752 of 3,752 frames, minimap 3,721, clock card 3,481 in the default camera), so event and story cards are about half that. Say so, and add the share of the map the cards and chips cover.

**19. [S3] "Dashed means not a fresh report" is called borrowed APP-6 grammar (line 343).**
In APP-6 and MIL-STD-2525 a dashed frame means **planned or anticipated** (report 04 lines 207, 213; Wikipedia, "NATO Joint Military Symbology", Status section, read 2026-10-06: "present status is indicated by a solid line and planned status by a dashed line"). The pitch uses it for the past. Report 04 (line 208) said "becomes"; the pitch lost that. *Fix:* call it this project's convention, say it reverses the NATO meaning, or choose another cue; reconsider "NATO-style" in the Field Manual pitch, whose selling point is defensibility.

**20. [S3] "Light means fresh" and "echelon is height": say what the thresholds are and how often each state appears.**
`semantics.mjs` lines 64 to 85: a tile looks fully settled until its keyframe is 112.5 ticks old, blends to the carried-forward look by 225 ticks; the 112.5 is "this layer's choice (a design token, not a finding)". Measured over 27 ticks (`r-age.mjs`; 8,993 unit-ticks): age under 12 ticks 8.3%; 12 to 48 12.9%; 48 to 112.5 19.6%; blend 21.3%; **carried-forward look 37.8%**. So under 9% are "fresh", about 41% look settled, and 59% are blended or dull. The hero look will be mostly dull; say so and show it. `lift.perEchelon` is 0.7 px (at most 2.8 px for a corps), a difference of a pixel or two in a shadow; do not present it as an encoding without a legibility test.

**21. [S3] Bytes (line 122).**
"One page of 1,215,039 bytes" is the minified variant; the file the owner opens is 1,502,479 bytes (unminified). State both. The engine (96,906 B brotli) plus its style sheet is about nine times report 05's engine (+12.3 KB brotli), though it also holds the Director, three looks, the Tuning Studio and the tours; say so, since the comparison "about a fifth of today's bundle" is the pitch's own upper bound.

**22. [S3] Colour-vision matrices are now verified (line 610).**
The 3x3 severity-1.0 matrices in `test/skin-testkit.mjs` equal Table 1 of Machado, Oliveira and Fernandes 2009 as given on the authors' page, <https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html> (read 2026-10-06). That page does not say whether they act on linear or gamma RGB; the test kit uses linear, which is the usual practice. Drop "not re-verified"; keep "no colour-blind person has looked".

**23. [S3] Corps-badge list confirmed once; keep the gate.**
civilwarnews.com (<https://civilwarnews.com/issues/2022/may/the-library-of-congress-collection-may-2022/>, read 2026-10-06) lists sphere, trefoil, lozenge, Maltese cross, cross, crescent, star for I, II, III, V, VI, XI, XII, red, white, blue divisions, and cites the Official Records p. 152, as the pitch says. The Wikipedia page "American Civil War corps badges" gives the colours but, as I could read it, neither the date of the circular nor the shapes in text, so "Documented" still rests on one secondary reproduction. Keep M5's gate.

**24. [S4] "A 35-line starter skin" (lines 193 and others): add "(54 at 100 columns)" or drop the count.**

**25. [S4] Section 4's "by construction; snap-backs are not counted separately" is a claim with no measurement. Count them in the Studio or drop the cell.**

### 2.3 Missing risks

**26. [S2] Cost in the real page is unmeasured, and the engine is heavier than what it replaces.**
Everything is a standalone page without Mapbox or React. Report 01 measured the fixed build at 44 to 51 fps in dense scenes on this laptop at 1x. The engine adds 3.4 to 5.1 ms (1x) and 11 to 18 ms (4x) a frame; War Room's median **draw alone** at 4x on the whole field is 17.9 ms, more than one 60 fps frame, before the engine (`skin-bench-cpu4.json`). Add to M2: measure inside the product with Mapbox, with a go / no-go on frame time.

**27. [S3] Text widths decide the zero-overlap guarantee, and were validated on one platform.**
The width table is Segoe UI measured in Chrome on Windows (worst error 3.3% on 478 short codes; a 4% safety factor, so 0.7 points of margin; `layout/text.mjs`). Run-time measurement exists but was not tested on macOS, Android or Linux fonts, long names were not in the validation, and 1863 Map measures one font and draws another (line 413). Add to section 13 and to M2.

**28. [S3] Rotation and tilt.** Disclosed (line 604). Add the cheap option: lock bearing and pitch while the engine is on, and put it to the owner.

**29. [S3] Other untested conditions:** high-refresh displays; a real phone and touch; Firefox, Safari, Edge; long-session memory (report 07 section 4); a window narrower than 1280. Add to section 13 (several are there; high-refresh and memory are not).

**30. [S3] Popup feel and crowd.** Cards living for reading time means several on screen (up to 16); nobody has shown the owner that this feels right, and Narrated mode is off. Say so, and keep the old timing available as a setting.

**31. [S3] Real satellite imagery: a result the pitch can use, and what remains.**
Measured/inspected: I captured Mapbox satellite-v9 at the same camera (zoom 13.5 centred on the field, zoom 15 on The Angle; 85 tile requests) and drew the prototype's three looks over it (`review-runs/scripts/sat-capture.mjs`, `r-compose.mjs`). By eye, in these static frames all three stay legible: War Room's dark glass plates and the two paper looks read against the olive and dark-green ground. That closes the pitch's worry about a dark ground on bright imagery for stills. **Remaining:** motion over imagery, bright urban areas in sun, the site's own overlay lines and labels (see fix 9). The composites are in `tmp/pitch-anim/review/shots/` and are **not committed**, because I have not checked the imagery provider's terms for redistribution; the two schematic pictures in `shots/review/` are committed.

**32. [S3] Reproducibility and instrument hygiene.**
All pitch-run figures are single runs. My re-runs agree within about 1.5 points (section 4), so the pitch's "a few points are noise" is right. Fix the verifier's in-view rule (fix 15) before quoting V-03 again, and say which numbers come from the popups-off deterministic mode and which from real time.

**33. [S3] Place frame.** The prototype draws its 30 place marks in the legacy frame; production `terrain.json` puts 8 of them 166 to 733 m elsewhere and "which frame is right is Unknown" (README line 35). In the product the tiles will sit over the production place layer. Add to M2 as a data check, not a design one.

### 2.4 Quality of the pitches

**34. [S3] A design director would object to these on sight (all from the pitch's own pictures):** a mid-map floating "Legend" chip (desktop-09); scores of scattered blue and orange dots with no label at zoom 13.5 (the aggregate hull dots; my picture); "Contact x 23" as the most prominent chip in the hero frame (desktop-03); the code and the full name side by side on every plate; ellipsised names; plates at 10 to 12 px type; the developer vocabulary on screen ("candidate clock", "certified", "Computed"); a toolbar with Before / After and Showcase buttons. Several are prototype chrome, not the proposal, but the pitch uses these images to sell it. Provide at least one hero picture at the product's zoom 13.5 and one on real imagery (allowed; fix 31).

**35. [S2] The three pitches are one idea in three skins, and the "map animation" is unpitched.**
All three share one engine, one chip-plus-name-pill structure, one counted-tile badge, one dashed-for-stale convention, the same dock and narration card; they differ in palette, type, glyph set and arrival effect (a sweep, a wipe, a pencil-to-ink). The owner asked for "top 3 ideas to improve the unit tile, map animation" and popups. Camera choreography, tick-to-tick transitions, the day and night treatment and any cue for where the fighting is are not pitched (the research rules out invention, which is a reason to say so, not to skip the question). *Fix:* either relabel as "one engine, three skins" and add one or two genuinely different motion or camera options with measurements, or give each look a distinct motion personality (easing, arrival, merge choreography) and measure it.

**36. [S1] The ranking contradicts the pitch's own scores on the owner's rules.**
*Where:* section 1 table (lines 23 to 27), section 10 lines 487 to 492.
*Problem:* by the pitch's tables War Room has the only solid-on-solid contacts (26 frames; 0 for the others), the largest plate (28 px) and so the most merged units (296 to 305 separate tiles at The Angle against 322 to 329; 121 against 142 at the whole field), the heaviest draw (14.2 and 17.9 ms median at 4x against 10.8 and 12.9), and the untested ground. Its legibility advantage is the contrast of a **dimmed** tile (3.75:1 against 2.57:1 and 2.37:1), the legibility of a defect that section 7 says "goes away with the strict-motion milestone"; settled contrast (6.4:1 against 4.61:1) is a real but different win. The ranking is therefore on first impression, which is taste.
*Fix:* say it is taste, or rank on the owner's rules and put Field Manual first; re-score after M1; offer War Room with a compact plate and measure how many more separate tiles it gets.

**37. [S3] Ten decisions become fourteen.** Add: (a) what a unit without its own tile looks like at low zoom (fix 1); (b) keep, replace or drop hit flash, engaged pulse, trails, facing (fix 8); (c) keep the product's onboarding (fix 7); (d) the precedence of the owner's rules when they conflict (fix 4); (e) lock rotation and tilt (fix 28). "What I need from you before M1" should list (a) and (d).

**38. [S4] Summary hygiene.** Section 1's "What I would not show as finished" is right; make section 1's first-ten-lines carry fixes 1, 3, 6 and 13 so a reader who stops after one page is not misled.

---

## 3. What checked out

Every figure below was recomputed from the cited file or a re-run and equals the pitch's text unless a fix above says otherwise.

| Pitch claim | Source and result |
|---|---|
| 7.7% adjacent pairs, 92.3% hold-then-jump (93 of 1,209); 833 teleports, median 78 px, worst 1,096 px, 47 at once; 66 snap-backs, 407 one-frame vanishes | report 01 lines 13, 222, 223, 273 to 278; independent replay in report 07 section 3.8 |
| 82% touch and 57% half covered at zoom 13; 608 of 675 ticks; 100 tiles at tick 1 against 21 | report 01 section 0 items 5 and 6 |
| Event card 0.5 s at 1x, 33 ms at 16x; 32 words, 8.1 s; 13.5 against 5.6 minutes; 24% and 47% on own subject; four stale toasts in 123 ms; 9 of 42 neutral titles, 5 wounds; tour drawer 36.6%, y 474 against 470 | report 02 lines 7 to 14, 178 to 200, 294, 351, 375 |
| 81% older than 50 ticks, median 258 at tick 548 | report 04 lines 36, 61 |
| 163 of 163 prototype tests, 214.8 s | `pitch-runs/logs/prototype-tests.log` |
| 17 URL cases, 0 console errors, 0 requests | `pitch-runs/results/url-check.json` |
| Bytes: 1,215,039; 327,867 (96,906 brotli); +13.6 / +11.9 / +13.6 KB raw; +3.8 / +3.0 / +3.7 KB brotli alone; +2.0 and +2.7 after the first | `pitch-runs/results/bytes.json` (arithmetic redone) |
| Entry bundle 2.3 MB, about 525 KB brotli; engine about a fifth | report 05 lines 16, 443 (524,887 B) |
| Per-look playback: solid-solid 26 / 0 / 0 frames of 7,200 / 7,202 / 7,199; faint-over-solid 21.7 / 26.8 / 25.3%; faint-only 65.1% and 60.1%; fps 59.8 to 60; tiles at The Angle 296 to 305, 322 to 329, 310 to 314; sudden jumps 0 to 0.07 / 0.07 / 0.13; steps 16 to 85 / 17 to 79 / 15 to 109 px | recomputed from `v3-play`, `v4-motion` files |
| Section 9.2 table, all 8 rows by 5 columns | recomputed (`review-runs/scripts/dump.py` and the pitch's `table2.py`); equal |
| Gap shares per look 4.7 / 4.7 / 4.3% (mean of six runs 4.68, 4.67, 4.37: the last should read 4.4) | recomputed |
| Interface over chips at zoom 13.5 to 15: 20.0 / 23.1 / 20.8%; half hidden 18.7% for Field Manual | recomputed from `07-verify/results/v2-sweep-*-dense-*.json` (standard variant) |
| 1,428 settled samples, 0 solid overlaps; closest 2.0 px; 11,256 card frames, 0 chips covered | report 07 sections 3.2, 3.6; `v7c-cards-cover.json` (3 cameras x 3,752) |
| Tile draw medians and 95th percentiles at 1x and 4x | `prototype/results/skin-bench-cpu1.json`, `-cpu4.json` |
| Mapbox symbol layers lag 0.8 to 2.7 s, 5 to 7 fps on phone stand-in | report 05 lines 19, 123 to 280 |
| Cold solve 93.5 to 124.9 ms median at zoom 11 to 13; 4,725 cold solves, 0 overlaps | report 06 lines 11, 519 |
| Union badge counts 34+47+21+18+3+26+25 = 174 | arithmetic; badge list vs civilwarnews (fix 23) |
| The pitch commits touched only `docs/pitch/anim/` | `git log --name-only` for all 17 commits that touch it |
| Honest disclosures: single runs, scratch copy, `notravel` re-run with 120, no real phone, no other browsers | `pitch-runs/README.md` |

---

## 4. My re-runs against the pitch's numbers

Same machine class as the pitch (Chrome 155 headless, Windows 11, 16 threads), scratch copy of the verifier, prototype file unchanged (same sha256). "Pitch" is the pitch-run value in the same condition.

| Measurement | Pitch | My re-run |
|---|---|---|
| No tile, deterministic 60 Hz, popups off, War Room, The Angle 4x | 5.5% (10 units) | 4.6% (11 units) |
| same, Rose Woods 4x | 7.3% (26) | 7.8% (25) |
| same, snap mode | 0% / 0% | 0% / 0% (identical) |
| same, never nudge | 6.8% / 6.6% | 6.8% / 6.6% (identical) |
| Faint over solid, real time, popups on, The Angle 4x | 29.0% | 30.4% |
| same, Rose Woods 4x | 15.5% | 16.3% |
| Solid over solid frames, The Angle 4x / Rose Woods 4x | 3 / 3 | 4 / 4 |
| Unit with no **live** tile, real time, The Angle 4x / Rose Woods 4x | 15.8% / 18.8% | 13.5% / 18.2% |
| Faint-only unit, The Angle 4x | 61% | 100% (instrument artefact, fix 15) |
| Faint-only, strict in-view rule, mean of six runs | 67.9% | 52.7% War Room, 61.5% Field Manual, 59.4% 1863 Map |
| Units inside counted tiles at zoom 13.5 (new) | not given | 82% default, 94% never-nudge |
| Camera zoom 13.5 to 15.5, War Room (new) | not given | 346 births, 82 deaths in 1.5 s; 56% of tile-frames faint |
| Top-bar clock clipped at 1440 / 1366 / 1280 (new) | "candidate clock" shown | clipped at all three; complete at 1920 and on the phone |
| Age bands over 27 ticks (new) | "81% older than 50 at tick 548" | 8.3% under 12; 41% settled; 21% blend; 37.8% carried look |

---

## 5. Not verified by this review

- One machine, headless Chrome 155, 60 Hz; the CPU slowdown is software throttling, not a phone. No Firefox, Safari, Edge, real touch, high-refresh display.
- My probes use the prototype's own engine API (`window.__studio`) at the engine level for shares and zoom; the clip test reads the page DOM; only the re-runs of `v3b-gaps` and `v3-play` use the verifier's independent instrument. The zoom metric (tile offset relative to its own unit, leaf tiles only for "pops") is mine and one scene each.
- The satellite composites are static, one frame per look and zoom, with the imagery drawn as a backdrop under the Studio's canvas; alignment relies on the Studio and Mapbox sharing the 512-pixel Web Mercator (the map reported the requested centre and zoom; I did not measure pixel alignment).
- I did not read the Official Records, the NATO standard or any historian's account; the external pages in fixes 19, 22, 23 are one read each, and the Wikipedia corps-badge page was not usable (a summarising fetch gave an inconsistent answer, which I discarded).
- I did not run the remaining 38 verifier scripts, the product suites, or a person's eyes on motion.
- Design judgement (fixes 34 to 36) is mine.

---

## 6. Files

All under `docs/pitch/anim/`.

- `PITCH-REVIEW.md` this document.
- `review-runs/scripts/` `r-agg.mjs` (units in counted tiles), `r-zoom.mjs` (camera zoom and pan), `r-chrome.mjs` (clock clipping), `r-dimonly.mjs` (strict faint-only), `r-invis.mjs` (the edge artefact; needs the scratch-patched recorder described in its header), `r-age.mjs` (age bands), `r-shots.mjs`, `r-compose.mjs`, `sat-capture.mjs` (satellite capture through `tests/t0/lib.mjs`), `dump.py` (recomputes the pitch-run tables). To run: copy `07-verify/` into a scratch tree laid out as in `pitch-runs/README.md`, drop the `r-*.mjs` next to `lib.mjs`, `node r-agg.mjs`.
- `review-runs/results/` raw results of the above, the re-runs of `v3b-gaps` and `v3-play`, and the three gap logs.
- `shots/review/review-wr-z13.5-schematic.png`, `review-wr-never-nudge-z13.5-schematic.png` the product's start zoom, War Room, default and never-nudge, tick 551.
- Not committed: `tmp/pitch-anim/review/shots/` (satellite imagery and composites), `tmp/pitch-anim/review/scratch/`.
