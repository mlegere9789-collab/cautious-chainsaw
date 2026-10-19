# Data audit of the Gettysburg map (group DATA)

Scope: every datum the animated map and its 25 sub-pages display. Binding rule (owner decisions of 2026-10-05, item 3): each displayed time, place, number and name is verified against a
cited source, labelled as an estimate or as Contested, or removed; nothing is invented. Companion: `tools/t0/DATA-README.md` (how to build and test), `fixes.json` (every patch),
`sample-*.json` (the samples and verdicts), `sample-report.md` (the intervals), `positions.json`, `position-screens.json`.

Build audited: `python tools/t0/data/data_build.py --train R1c --out tmp/data-audit/data-R1c` (group DATA, 2,473 patches); also built stacked with CLOCK and MON
(`--with CLOCK,DATA,MON`, all gate rows but `data-untouched` pass). Tests: `node tests/t0/data.spec.mjs` 18/18 in real Chrome; without DATA (`--dist release/R1c/dist --expect-red`)
all 16 feature tests fail and the two guards stay green.

## 1. Summary

* **Not claimed: zero errors.** Seven seeded samples of 150 claims were drawn (A from the baseline data, B to G from the DATA build as it stood at each draw). Every one of B to G found
  claims that were still wrong, and each time in a class that the earlier sweeps had not reached. The last two samples found 8 of 148 (5.4 percent, Wilson 95 percent 2.8 to 10.3) and 2 of
  150 (1.3 percent, 0.4 to 4.7) wrong **before** the fixes they triggered. Sample G was verified less deeply than F (many claims by the source class and the printed tables, a few by the
  reports), so 1.3 percent is a lower bound, not an estimate of the final state.
* Baseline: 75 of 142 checkable claims wrong or unsupported = **52.8 percent** (44.6 to 60.8). The same 142 claims after DATA: 0 wrong, 13 labelled, 2 removed (a re-check of claims the audit
  itself had found, so it proves the fixes took, not that nothing else is wrong).
* 2,473 patches, every one with a class, a source and the text it replaced (`fixes.json`: 0 without a source). 2,364 are on 69 served data files, 86 on the entry bundle, 23 on pages and
  the Help chunk. Largest classes: unsupported claim 747, wrong number about 480 (alone or combined), wrong id 262, wrong place 195, wrong claim 128, unit shown before it arrived 93, wrong
  time 61, stale position 59, contested number 54, contested fact 42.
* Positions: 82 notable units checked at the 33 anchor ticks (2,706 cells); anchor checks 11 of 18 ok before, 18 of 18 after (section 7). Approximate, not exact.
* Found and reported, not patched: defects in other streams' territory (section 10) and a short list of position approximations that stay (section 8).

## 2. What counts as displayed data (the surfaces)

`data/oob/*` (corps, divisions, brigades, 440-odd regiment records, cavalry, Union and Confederate artillery, commander successions), `data/chronology_day1..3.json` (event cards),
`data/vignettes*`, `data/terrain.json` and structures, `data/placements_*.json` and `data/density_*.json` (position rows and their notes), `data/casualty_*` (dashboard, ledger), the
inline arrays of the entry bundle that carry text (story markers `mA`, guided tour `th`, popups, Help figures), and the sub-pages (`index`, `dashboard`, `living-ledger`,
`turning-points`, `find-ancestor`, `ground-remembers`, `aftermath`, `terms` and the rest). Excluded: the 512 monuments of the Virtual Walkthrough (`_A`, byte-identical; section 9), times
(group CLOCK), monument stars (MON), motion (ANIM).

## 3. Defect records processed

The planning records (`docs/plan/findings/*.json`, `all-findings-index.csv`) were read for data defects. Disposition:

* **Fixed in DATA:** dashboard figures and labels (army strength and casualty totals now labelled as the return's or as modelled), the ground-remembers position count (computed from the
  data), the living ledger's casualty label, the turning-points page, the 107th Pennsylvania carried under the id of the 107th New York (`app-latent-14` family: 262 id patches), the
  two documentation-copy items about unsupported figures (`docs-copy-08`, `docs-copy-33`), the index page's unit count (computed: 405 units, 675 snapshots).
* **Belongs to other groups:** displayed times (CLOCK), monument star ticks, linked units and coordinates (MON), motion and entrances (ANIM).
* **Engineering items about the data files** (id registries, schema drift, loader order) are not displayed data; the loader facts that matter for position fixes are in the README.

## 4. Method

**Sources.** The Official Records, Series I, vol. 27 pt. 1 and pt. 2 (public domain; text read through `tools/t0/data/sources.mjs`, tables read from the page images and transcribed to
`sources/or27_union_losses.json` and `or27_confed_losses.json`), W. F. Fox, *Regimental Losses in the American Civil War* (the strengths and percentages the OR does not give), the OR roster
of the order of battle (27/1 pp.155-168, 27/2 pp.283-292), and for places the Park's monuments as mapped in OpenStreetMap (ODbL; `sources/osm-monuments.json`, fetched 2026-10-19; network
use was read-only and polite). Memoirs and secondary works are never the source of a fact: where a story is known only from them it is kept, labelled "a later account, not in the Official
Records".

**Verdicts.** C correct (an estimate is correct when it lies inside the range the sources allow), I incorrect or unsupported (including a dramatisation or opinion stated as fact), L
labelled (a Contested or modelled note is on the claim), R removed, U cannot be checked against the sources read (excluded from the rates). Rate = I over C+I+L+R, Wilson 95 percent interval.

**Samples.** `tools/t0/data/sample.mjs`: stratified, seeded draws of 150 claims from a pool of about 3,600 over 14 categories (commander 407, regiment casualties 392, key action 267,
brigade 119, battery and cavalry 159, other order-of-battle text 690, successions 42, chronology 131, vignettes 24, terrain 50, position notes 1,256, story markers and tour 38, page figures
18, casualty file 17). A: seed 20261019 on the baseline (and again after DATA); B: 20261020; C: 20261021; D: 20261022; E: 20261023; F: 20261024; G: 20261025. Claims, verdicts with the
evidence of every error, label and unverifiable claim: `sample-X.claims.json`, `sample-X.verdicts.json`.

**Extending around every error class.** Each sample's errors were fixed and then the whole population of that class was swept mechanically or read in full:

| trigger | class | sweep and result |
|---|---|---|
| A | regiment casualties above the return, brigade totals, wrong ids | every regiment compared with the printed return (rules in `oobcas`, `oobccas`: below the printed figure is impossible and set to it; above printed + the brigade's unassigned missing is labelled Contested) |
| A, B | notes with dramatisation, motives, superlatives | all 1,256 position notes read; rule tables `notes-rules*.mjs`, 740 patches |
| C | brigade membership, commanders against the roster | `cmdcheck.mjs` over every regiment; 15 commander name or rank fixes (`oobcmd`) |
| C, D | tour stops, story markers, successions, dashboard notes | every tour stop, marker, succession event and casualty note read |
| E | order-of-battle free text | all text fields of the order of battle read (`oobtext`) |
| F | organisation of the Confederate artillery | file compared with the roster (27/2 pp.283-290): battalion headers and battery key actions corrected to the roster's battalions, 7 ranks or names, Latimer's battalion (the file had an Andrews who was not there), Dance's battalion, Captain Brown's fate; Carrington's battery taken off Oak Hill |
| F | fates of commanders | all 114 fate strings and all 71 key actions naming a death compared with the lists of officers killed and mortally wounded (27/1 pp.188-192): about 25 fixes (section 6) |
| F | successions with a successor the roster names | CS-005 (Peyton), CS-007 (Aylett), CS-010 (labelled) |
| G | a place in the line, a whole-battle figure given as a one-day figure | all key actions with left, right or centre read; all position notes with a figure read (one more fix) |

**Fix mechanism.** Every fix is an asserted patch (section "How the patches work" in the README): the build refuses to run if the text it replaces is not exactly there, so a change by another
group cannot be silently undone.

## 5. Error rates (Wilson 95 percent)

| sample | drawn from | wrong / checkable | rate | interval |
|---|---|---|---|---|
| A | baseline data | 75 / 142 | 52.8 percent | 44.6 to 60.8 |
| A after | the same claims, DATA build | 0 / 142 | 0.0 percent | 0.0 to 2.6 |
| B | DATA build | 6 / 143 | 4.2 percent | 1.9 to 8.9 |
| C | DATA build | 17 / 141 | 12.1 percent | 7.7 to 18.5 |
| D | DATA build | 12 / 145 | 8.3 percent | 4.8 to 13.9 |
| E | DATA build | 2 / 141 | 1.4 percent | 0.4 to 5.0 |
| F | DATA build | 8 / 148 | 5.4 percent | 2.8 to 10.3 |
| G | DATA build | 2 / 150 | 1.3 percent | 0.4 to 4.7 |

Claims DATA had changed against claims it had left untouched (F: 3 of 103 against 5 of 45; G: 1 of 107 against 1 of 43) show where the remaining errors sit: in text no rule reached. Per
category: `sample-report.md`. The rates after the first fixes are not a trend toward zero: sample C was drawn after the notes were read and was still the worst (12.1 percent), because it
drew chronology, tour and marker text that had not been read yet. What the samples support is: the baseline was wrong in about half of what it said, and the DATA build is wrong in
roughly 1 to 12 percent of what it says depending on the area, with the best-covered areas lowest.

### Errors found by samples B to G (evidence from the verdict files)

The lines marked "not corrected" in B and D were corrected by later sweeps (none of those phrases remains in the build: checked by search of the DATA build for each phrase).

#### Sample B
- terrain terrain:LOC-003: 'O'Rorke charged without orders': Warren posted the 140th New York (Warren's and Weed's brigade reports, OR 27/1); the claim is unsupported and was not corrected
- position-note position-note:density_day3_morning|C-I-1|465: McLaws's division was on the right (Warfield Ridge and the Peach Orchard line), not on Seminary Ridge: OR 27/2 p.358; not corrected
- position-note position-note:density_day2_bigelow|U-ART-9MA|298: '4 guns now engaged': the battery had six 12-pounders (OR 27/1 Bigelow); the number is unsupported and was not corrected
- position-note position-note:placements_day2_ticks301_375|C-III-1-1|303: '5 minutes bought' comes from later accounts of the 1st Minnesota; not corrected
- position-note position-note:density_day1_ironbrigade|C-III-2-3|16: 'know they face the Iron Brigade': no source read has Archer's men recognising the brigade; not corrected
- page-figure page-figure:index.html|An interactive, step-by-step reconstruction of : the page said 478 units; the data has 406 distinct unit ids after the id fixes; found by this sample and corrected after the draw (the text is now computed)

#### Sample C
- oob-casualties oob-casualties:U-107NY: return OR 27/1 p.173: 107th Pennsylvania 165 (11 + 8 + 48 + 6 + 92); the file showed 165 of a strength of 122 (135.2%), the strength of the record's old label (107th New York)
- oob-keyaction oob-keyaction:U-124NY: Birney OR 27/1 p.484: Ellis fell at the head of his regiment; no report read gives a "dramatic mounted countercharge"
- oob-keyaction oob-keyaction:U-28MA: Father Corby's absolution is not in the Official Records read; stated as fact
- oob-brigade oob-brigade:U-I-3: return OR 27/1 p.174: Total Third Division 2,103 (898 + 853 + 351 + 1); the file had 2,140
- oob-brigade oob-brigade:U-I-2-1: return OR 27/1 p.173: Total First Brigade (Paul) 1,041; the file had 1,036
- oob-brigade oob-brigade:U-VI-3: return OR 27/1 p.182: Total Third Division 196 (74 + 69 + 53); the file had 195
- chronology chronology:d2t298: OR 27/1 p.133: a cannon-ball took off Sickles's right leg; "near the Trostle farm" is in no report read
- chronology chronology:d2t271: Weed OR 27/1 p.651: the 140th formed on the left slope and O'Rorke was mortally wounded at its head; no charge toward Devil's Den against Texans and Alabamians is given
- terrain terrain:TF-003: Dawes OR 27/1 p.275-276: the cut was charged and the Confederates surrendered; "too deep to escape quickly" and "famous" are in no report read
- position-note position-note:placements_day2_ticks301_375|U-XII-2-3|315: editorial ("breastworks doing the work bodies cannot"), no source
- position-note position-note:placements_day2_ticks301_375|C-I-3-1|360: "being briefed for tomorrow's charge" is in no report read
- position-note position-note:density_day2_culpshill_overnight|U-ART-XII-CORPS|440: roster OR 27/1 p.166: Muhlenberg's artillery brigade had four batteries (M 1st NY, E Pa., F 4th US, K 5th US), not five
- position-note position-note:placements_day3_ticks521_600|C-I-3-1|549: "conspicuous to all" is editorial; no report read
- position-note position-note:density_day3_culpshill|U-2MA|460: Mudge's reported last words are from later accounts (see the succession note); stated here as fact
- marker-tour-popup marker-tour-popup:th:6: tour stop 6: "Hood's Texas Brigade" alone drove Ward from Devil's Den, and "some of the most confused and brutal of the entire battle" are in no report read (Benning's brigade also attacked there)
- marker-tour-popup marker-tour-popup:th:11: tour stop 11: "achieved what no other Confederate force managed that day" and "Hancock rushed every available man" are in no report read
- marker-tour-popup marker-tour-popup:mA:mon_20nc: return OR 27/2 p.342: Iverson's regiments 5th NC 143, 12th NC 56, 20th NC 122, 23d NC 134; the 20th did not "suffer least"

#### Sample D
- terrain terrain:STR-007: the Seminary cupola as an observation post is in no report read (OR 27/1 p.272 names the court-house cupola)
- terrain terrain:LOC-003: Weed (OR 27/1 p.651) and Rice (p.617): the 140th formed on the left slope and O'Rorke was mortally wounded at its head; "arrived just in time" and "charged down the slope" are not in the reports
- position-note position-note:density_day2_cemhill|U-I-2-2|325: no report read gives Union reinforcements "hitting the Tigers from multiple directions"; the note is dramatization
- position-note position-note:density_day2_wheatfield|C-8AL|305: "bought the needed time" is a later-account judgement, not a statement of the reports read
- position-note position-note:placements_day2_ticks226_300|U-II-1-4|290: no report read ranks Brooke's brigade as having pushed farthest into the Wheatfield
- position-note position-note:density_day2_wright|U-II-2-2|312: Lee (OR 27/2 p.320): Wright gained the crest and was compelled to retire; "breaks the Union line" is not given
- position-note position-note:density_day3_aftermath|C-40VA|620: editorial ("A shame that follows them"), no source
- marker-tour-popup marker-tour-popup:th:15: tour stop 15: "one of the war's most poignant stories" style wording is opinion stated as a fact
- marker-tour-popup marker-tour-popup:th:14: tour stop 14: "devastating" and similar are editorial
- marker-tour-popup marker-tour-popup:th:16: tour stop 16: "chose not to pursue aggressively" and "proved to be the turning point" are judgements stated as facts
- casualty-file casualty-file:note-most_compressed_union: the corps return gives the III Corps total for the whole battle; a single figure for the afternoon and evening of July 2 is not in the return
- casualty-file casualty-file:union_corps|U-XI: the corps return gives the XI Corps total; "routed" is a characterization, and the claim states the whole-battle figure as day 1

#### Sample E
- oob-text oob-text:union_oob_brigades|file|notes|All 49 Union infantry br: the brigade file's own note said "All 49 Union infantry brigades"; the file has 43 (the eight Sixth Corps brigades have no record) and the roster has 51
- position-note position-note:density_day2_culpshill_overnight|C-II-2-3|380: Greene's brigade held the upper works (Geary); Nicholls's (Williams's) brigade is not said to hold them

#### Sample F
- oob-commander oob-commander:U-13NJ: roster OR 27/1 p.157: Col. Ezra A. Carman, 13th New Jersey; "later became one of the most important Civil War historians" is a superlative no source read states; removed after the draw
- oob-text oob-text:union_oob_brigades|U-V-2-3|fate|KIA July 2 -- shot on Li: Weed: OR 27/1 p.652 has him mortally wounded on the summit; the fate "KIA July 2" contradicts the corrected succession record (US-021); corrected after the draw
- oob-text oob-text:confederate_artillery|C-ART-Rice-B|key_action|Heth's division: Rice's battery is in McIntosh's battalion of the Artillery Reserve, not Heth's division (OR 27/2 p.290 roster); corrected after the draw
- oob-text oob-text:confederate_artillery|C-ART-Carpenter|key_action|Oak Hill Jul: Carpenter's battery is in Latimer's (Andrews's) battalion of Johnson's division, which reached the field late on July 1 (OR 27/2 p.286, p.504); it was not on Oak Hill on July 1; corrected after the draw
- oob-text oob-text:confederate_artillery|C-ART-Wallace|key_action|Heth's divisio: Wallace's (2nd Rockbridge) battery is in McIntosh's battalion of the Artillery Reserve (OR 27/2 p.290), not Heth's division; corrected after the draw
- succession succession:CS-005: CS-005: "No clear successor -- brigade broken"; the roster (OR 27/2 p.284) and Peyton's report (p.385) name Maj. Charles S. Peyton; corrected after the draw
- position-note position-note:density_artillery_positions|C-ART-Carrington|49: Carrington's battery belonged to Jones's battalion of Early's division, posted on the left of the Heidlersburg road in front of Hoke's brigade (Early, OR 27/2 p.468), not on Oak Hill with Carter's battalion of Rodes's division (p.603), and Early's division was not on the field at tick 49; row removed and a row at tick 55 added after the draw
- marker-tour-popup marker-tour-popup:th:1: tour stop 1: "fence rails and earthworks"; Buford (OR 27/1 p.927) had partial shelter behind a low stone fence; there were no earthworks; corrected after the draw

#### Sample G
- oob-keyaction oob-keyaction:U-83PA: Chamberlain (OR 27/1 p.624): Captain Woodward, 83rd Pennsylvania, "on my right", i.e. left of centre of the line; the file said right-centre; corrected after the draw
- position-note position-note:density_day1_afternoon|C-26NC|225: tick 225: "The regiment lost 588 killed and wounded on July 1 (return)"; the return prints 588 for the whole battle (86 + 502, OR 27/2 p.344), July 1 and July 3; corrected after the draw

## 6. Every fix, by area (inventory; the full list with source and "before" text is `fixes.json`)

Counts are patches (a row patch merges the changes to one record).

| area | patches | what was wrong and what was done (sources in `fixes.json`) |
|---|---|---|
| position notes (`notes`, `okey`) | 755 | dramatisation, motives, hindsight, invented counts ("4 guns", "5 minutes bought"), a unit named for the wrong brigade, "famous" and "dramatic" words: removed or reduced to what a report says; later stories labelled |
| order of battle, numbers (`oob`, `cas`, `corps`, `meta`) | about 650 | regiment, brigade and division casualties set to the printed return (impossible figures) or labelled Contested with both numbers; army strength and casualty totals labelled; the 107th Pennsylvania's id and strength |
| ids (`id`) | 253 | wrong or duplicate ids (for example the 107th Pennsylvania under the 107th New York, cavalry file ids) |
| positions (`pos`, `pre`, `cav3`, `rejoin`) | 418 | units before arrival or after departure removed; north sector and East Cavalry Field moved onto the Park's monuments; Iron Brigade to Culp's Hill; stale regiments rejoined to their brigade; duplicate and contradictory rows removed |
| chronology (`chr`) | 129 | wrong numbers, wrong place, unsupported detail, quotes from later accounts labelled, hindsight removed |
| vignettes, tour, story markers, popups (`vig`, `tour`, `mA`, `pop`) | 134 | the same classes; tour stop 1 "earthworks" corrected to Buford's stone fence |
| successions (`succ`, `succ2`) | 77 | ticks onto the CLOCK model's, "KIA" for mortally wounded, later stories labelled; Peyton and Aylett named as the roster does |
| terrain and structures (`terr*`) | 44 | claims no report supports removed; places labelled as tradition |
| casualty dashboard, ledger, pages (`dash`, `ledger`, `idx`, `find`, `gr`, `tp`, `terms`, `help`, `eye`) | 27 | labelled totals; counts computed from the data |
| fates of commanders (`oobfate`) | 13 patches (about 25 records) | Colonel Jeffords (4th Michigan, killed July 2) was shown as Lieut. Col. Lumbard "KIA"; Colonel Douty (1st Maine Cavalry) was shown killed at Gettysburg (he fell at Aldie on June 17); Dilger's Medal of Honor (Chancellorsville) was shown as for Gettysburg; Alexander was shown as having lost an arm; Iverson "never given another brigade command", O'Neal, Upton, Carman (opinions or false careers); Weed, Zook, Cross, Barksdale "KIA" for officers mortally wounded; Colonel Ward dated July 3 (it was July 2); Roberts, Steele and Fowler as the OR lists them; Garnett, Kemper, Armistead, Avery, Archer, Paul with later stories removed; the 83rd Pennsylvania's place in Vincent's line |
| Confederate artillery (`artorg`, `artorg2`) | 30 | Garnett's battalion was labelled Anderson's division (it is Heth's), McIntosh's and Pegram's were labelled Heth's and Pender's (they are the Artillery Reserve), Latimer's battalion was filed as "Andrews's" under a lieutenant colonel who was not there, Carter's batteries under "Jones's"; battery key actions moved to the right battalion; Dement, Carpenter, Raine and Brown no longer fire from Oak Hill on July 1 (Johnson's division arrived that night); Dance's battalion (First Virginia Artillery) was a "Colonel" and had Cunningham's Powhatan Artillery as the Rockbridge; ranks and names of Rice, Wallace, Zimmerman, Atwell, Griffin; Captain Brown (Chesapeake Artillery) shown as surviving |

**Labelled instead of fixed** (the sources disagree or give only a range): about 150 items: 54 contested numbers, 42 contested facts, regiment and brigade casualty figures that exceed the
printed figure by more than the brigade's unassigned missing (both numbers shown), the hour of Chamberlain's charge and of Kilpatrick's charge, who commanded after Marshall and Armistead
fell, which officer followed Hancock, the cavalry casualty figure (483 in the file, 240 printed), the Confederate Third Corps total (8,400 in the file, 6,735 printed).
**Removed:** statements nothing supports (about 750 "unsupported claim" patches, most of them removals of words or clauses). **Kept and labelled "a later account":** Pickett's remark, Lee's
"It is all my fault", Armistead's hat and message, Avery's note, Mudge's words, Corby's absolution, Oates's count of assaults, the Sickles cigar and the visits to his leg.

## 7. Positions

Method: `positions-report.mjs` computes, for 82 notable units (brigades, divisions, batteries and regiments named by the notes or by the monuments), the state the engine shows at each of the 33
anchor ticks of the CLOCK model (`data-src/time/time_anchors.json`): 2,706 cells, 2,080 with the unit on the field in the DATA build. DATA changed 478 cells, put 16 units newly on the field
and took 315 cells off the field (units that had not yet arrived or had left). Anchor checks (18, each with an expected place and its source): 11 of 18 within tolerance on the baseline,
**18 of 18** after DATA. The checks are partly post hoc (the tolerance was set before the fixes, but the fixes were made while looking at them); they show consistency with the sources
named, not an independent measurement.

Mechanical screens (`position-screens.mjs`, baseline against DATA build): units 478 to 405 (id merges); regiments left where their last row put them while the brigade moved on, **42 to 1**;
rows of one unit and tick more than 0.4 km apart (duplicates) 25 to 23; spikes (out and back within 12 ticks) 4 to 5; steps faster than 8 km/h 21 to 20; regiments with Park monuments matched
100 to 103, of which within 0.35 km of the monument 26 to 33, 0.35 to 0.7 km 37 to 40, farther than 0.7 km 37 to 30. The duplicate, spike and fast-step counts are **not** solved: the screens
do not separate real motion (a march) from error and the remaining cases were not read one by one.

Fixes found by the position check: First Corps and Eleventh Corps rows before arrival, Rodes's and Early's divisions at tick 1, Buford's brigades kept on the field to the end (they left on
July 2 and are on the Taneytown Road at 39.7199,-77.2097), Gregg, Kilpatrick, Huey and Merritt before arrival, the Iron Brigade 3.6 km west of Willoughby Run at 7:30 and then sent to Culp's
Hill, Iverson, Baxter and the Little Round Top rows (a west shift in three density files), the north sector (Oak Hill, Oak Ridge, Barlow's Knoll) and East Cavalry Field drawn 1.0 to 3.4 km
from the monuments, cavalry duplicated under the wrong ids on July 3, Stuart shown on Fitz Lee's id, Carrington's battery on Oak Hill, the 107th Ohio spike at tick 63.

## 8. Uncertainties that remain (nothing here is claimed correct)

* **Positions are approximate** (the Help says so). Not moved: Pickett's approach line (the start line is about 0.8 km north of the Virginia Monument and Spangler's Woods, the Emmitsburg Road
  crossing about 1 km north); Alexander's cannonade line (placed 1.7 to 2 km north of the positions in the reports, 27/2 pp.352 and 434); the Herbst and McPherson ground (0.8 to 0.9 km); the
  Day-2 Little Round Top, Devil's Den and Wheatfield rows (the 20th Maine 0.4 to 0.5 km, Vincent 0.4 km, the Devil's Den approach rows 0.3 to 0.55 km north of the Park's monuments);
  Early's Jones battalion at tick 55 stands "in a field on the left of the Heidlersburg road" (Early, 27/2 p.468) at a spot chosen by estimate; Garber's, Tanner's and Doll's rows on Benner's
  Hill (the roster puts Garber and Tanner in Jones's battalion, which Early does not place there) were left and labelled in their key actions.
* **Strengths** (the denominators of the percentages) come from the file, ultimately from Busey and Martin, and are not verified one by one; the day split of the corps casualties on the
  dashboard is modelled and labelled as such; Confederate regimental figures above the printed total are consistent with the return only because of its brigade-level missing.
* **Fates marked "Survived"** are the file's default; for Union officers the lists of officers killed and mortally wounded were used, for Confederate officers (the OR has no such list) only
  the reports and the roster were. A Confederate "Survived" is weaker evidence.
* **Gaps in the order of battle** (absent data, not wrong data): the 2nd U.S. Sharpshooters, the 5th Maine Battery, Battery B 1st New York, Battery E 1st Rhode Island, Pennsylvania Batteries
  C and F (the file holds placeholders the roster does not support; labelled), Alexander's, Nelson's, Poague's and Lane's Confederate battalions, Latham's and Reese's batteries, the Artillery
  Reserve's own id.
* **Horse artillery and cavalry**: the assignments of Elder's, Randol's, Graham's and Heaton's batteries to divisions were not verified against the reports.
* **Elevations** printed on terrain entries (for example "elevation 600 ft") are not sourced here and were left.
* **Sample G** was verified less deeply than F (section 1).
* The 51,000 figure on the ledger is the Park Service's estimate, labelled as such; the "about 28,000 Confederate" on tour stop 16 is an estimate labelled as such, not an Official Records figure.

## 9. The Virtual Walkthrough (reported, not patched)

Its code and the 512-monument array `_A` are byte-identical to the control tree (test T0-DATA-09). Checks that changed nothing: the 512 coordinates against the Park's monument nodes in
OpenStreetMap: 486 within 50 m of a node, the median nearest distance 6 m, the 90th percentile 30 m, the maximum 211 m; none farther than 300 m. Sides 457 Union, 40 Confederate, 15 other;
28 names appear twice (two monuments for one unit, for example the 20th Maine, the 26th North Carolina, the 17th and 27th Connecticut); 51 records have no `mn` field. No coordinate defect
was found at that resolution; the names and the honours text were not read against sources. The story markers `mA` (owned by MON) carry five markers (`mon_barlow`, `mon_20me`, `mon_6wis`,
`mon_20nc`, `mon_15al`) whose coordinates differ from the Park's markers by more than the positions of the units they link; reported to MON (not measured here).

## 10. Defects found in other streams (not mine, not patched)

* The verifier of the data-source stream (the `data-src` ledger and environment tests) has failing rows of its own; none is displayed data and none is shipped by DATA.
* Event cards in the baseline text carry the old linear clock (for example "9:05am" in front of Chamberlain's charge); CLOCK replaces the displayed time.
* The disposition field of some rows (for example Harrow's brigade at tick 304, "Chaotic Retreat") is not a claim the notes make and was not audited.

## 11. Reproduction

```
node tools/t0/data/gen.mjs --check
python tools/t0/data/data_build.py --train R1c --out tmp/data-audit/data-R1c
node tests/t0/data.spec.mjs
node tools/t0/data/sample.mjs tmp/data-audit/data-R1c/dist 20261025 tmp/data-audit/g.json   # a draw is deterministic for a given build
node tools/t0/data/sample-report.mjs
```
