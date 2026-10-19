# Battle Theatre: the fidelity database and the 97 percent target

Part F, task "fidelity". Blueprint and pilot, 2026-10-19. Owner folder: `docs/battle-theatre/fidelity/`. No product code was changed.

Every number below comes from a command that was run (the file that holds it is named), or from a source page that was read (the page is named). Where something was not done it says so in section 8.

## 0. What this contains and what the pilot found

**Built.** (1) A precise definition of "close" and how it is measured (section 1). (2) The source inventory, the schemas, and an audit of the site's existing data (section 2). (3) A pilot: the complete unit-state timeline of the fight for Little Round Top, 2 July 1863, 16:00 to 17:00 LMT, for the 15 units the brief names plus the 20th Maine's Company B, at one-minute resolution, with footprints on the 3DEP ground, facing, formation, activity, strength, casualty bounds, evidence labels and sources per row (976 rows); re-derived blind on a random 20 percent; compared with the site's own placements (section 3). (4) The plan for the whole battle (section 4). (5) The event database design, with 100 events mined from the Official Records corpus, reviewed by hand (section 5).

**What the pilot found, in six lines.**

1. The record fixes the *sequence* of what each unit did far better than the *minute* it did it. The adjudicated clock (`docs/time/ANCHORS-FINAL.md`) already carries an uncertainty of 25 minutes at best; witnesses of one event differ by far more (the step-off of Hood's division is clocked 15:45, 16:00, 16:30 and 16:55 by four first-hand witnesses).
2. Measured against its own evidence, a unit-state timeline built from the Official Records, two retrospective articles, the monuments and the DEM has an **expected fidelity of 0.34 in absolute time and 0.63 when the common clock error is removed and a 3 minute slack is allowed** (standard tolerance: 100 m, 30 degrees, activity class and formation class equal). The target is 0.97. The gap is stated, not closed by redefinition: section 1.7 says what has to be true of the evidence for the number to reach 0.97 (section 3.7: about 25 m of position evidence and about 1 minute of relative timing).
3. A blind second derivation of 19 of 96 cells agreed with the first on **55 percent** of unit-minutes (71 percent with a 3 minute slack); the second derivation fell inside the first one's evidence envelope on **95 percent**. The envelope is therefore an honest statement of what the record permits; the point values inside it are not what the record fixes.
4. The site's existing placements match the pilot reference on **1.2 percent** of unit-minutes (3.0 percent if the site's frame is shifted to put its Little Round Top mark on the measured summit); 3 of the 16 pilot units have no placement at all (91st and 155th Pennsylvania, Company B), and the 15th Alabama is placed a median 844 m from where its own colonel's account puts it.
5. The cost is measurable: about **7.3 thousand tokens per active unit-hour for one derivation**; the production process of section 4 (two derivations, adjudication, third check) is about **17 thousand per unit-hour**, and the whole programme about **75 million tokens (range 50 to 120 million)** (section 4.6). The event database needs about 440 tokens per reviewed mention at pilot quality.
6. Of 100 sentences mined by rule from the Official Records, **86 are real events but only 53 are usable as extracted**: the extractor finds events, a human pass makes them data. Corpus yield: 802 day-tagged timed mentions and 10,115 trigger sentences (2,863 with a linked unit or person).

## 1. The metric

### 1.1 The unit of measure

The unit of measure is the **unit-minute**: one unit (regiment, battery, battalion or a declared sub-unit such as a company) at one minute of local mean time. The state vector scored per unit-minute:

| channel | content | pilot vocabulary |
|---|---|---|
| position | centroid lon/lat, with the footprint polygon and the DEM z, slope and downslope aspect under it | polygon from strength and formation (section 3.2) |
| facing | degrees true, the direction of the front (the direction of travel for a column) | 0 to 360 |
| formation | 9 formations in the pilot (`column_mass`, `column_fours`, `line`, `line_forming`, `line_disordered`, `skirmish_line`, `battery_limbered`, `battery_unlimbering`, `battery_in_action`); the schema adds `square`, `cavalry_*`, `broken`, `scattered`, `prisoners`, `medical_post` | formation class: column, line, skirmish, bat_limbered, bat_action |
| activity | 20 fine activities in the pilot (resting, halted, marching_double, marching_quick, advancing_quick, advancing_double, climbing, flank_move_left/right, forming, deploying_skirmishers, unlimbering, wheeling, firing_unspecified, skirmishing, skirmishers_out, advancing_fighting, advancing_firing, standing_under_fire, halted_awaiting_order) | activity class: static, moving, forming, engaged (production adds withdrawing, captured, medical, and the fire discipline: volley, file, canister) |
| strength | men present in the footprint (muskets for infantry, men and guns for a battery) | with the basis (Documented, site registry, Contested) |
| casualties | cumulative lower and upper bound | lower 0; upper = the documented final loss once the earliest possible contact has passed |

Commanders are rows of their own (`commanders` in `schema/unit-state.schema.json`: person, role, position, facing, status mounted/dismounted/wounded/killed/captured). **The pilot did not derive commander rows**; section 8 lists this. The site's registry names 563 regiment and battery commanders for 569 units; brigade, division and corps commanders and staff are not in it (about 100 more persons to add; Rufus Dawes, 6th Wisconsin, is a Day 1 railroad-cut row in the hotspot order of section 4.3).

### 1.2 The reference and the evidence behind it

For each unit the reference is a **Reference Timeline (RT)**: a chain of **waypoints** (`schema/waypoint.schema.json`). A waypoint says: at about *t* (window lo..hi), the unit was at *pos* (+- sigma m), facing *f* (+- sd), in *formation*, doing *activity*, on the authority of sources *S*, with one verbatim quote that `tools/check_quotes.py` finds in the source text. The per-minute rows are generated from the waypoints by interpolation (`tools/pilot_lib.py`); a human never types a minute.

Three rules, fixed before the pilot and applied in it:

- **R-MED.** When several witnesses clock one event differently, the best time is the *median* of the witnesses and the window is [min, max]. Nothing is averaged or smoothed; no witness is deleted.
- **R-OUT.** A clock more than 45 minutes from the median of three or more witnesses of the same event is excluded from the window and listed in the **contested register** (`CONTESTED` in `pilot/defs_passA.py`: seven entries, C1 to C7). It is never deleted and the UI shows it.
- **Labels.** Each channel of each waypoint carries one of the site's labels: D Documented, M Measured, C Computed, E Modelled/Estimated, X Contested, U Unknown. They say what the source supports; they are not a reason to lower a gate.

### 1.3 Tolerances

Three tiers, all in `tools/pilot_lib.py` (`TIERS`):

| tier | position | facing | activity class and formation class |
|---|---|---|---|
| strict | 50 m | 15 degrees | equal |
| **standard (the gate tier)** | **100 m (one regimental front)** | **30 degrees** | equal |
| loose | 250 m | 60 degrees | equal |

The owner did not fix X and Y; these are my values and they are in one constant. A line of battle of 360 muskets is about 100 m wide, so 100 m means "on the right place of its own line"; 30 degrees is the arc inside which a line is still facing its enemy.

### 1.4 Three measures, because one number would hide the problem

All three are computed by `tools/build_pilot.py` (and `score_passB.py`, `score_site.py`).

**D, determined share.** For each unit-minute the **evidence envelope** is everything the record permits: move every waypoint time to its window's earliest value and then to its latest, take all the states in between, add the position sigma. A unit-minute is *determined* at a tier when the whole envelope fits inside that tier's tolerance and holds one activity class and one formation class. D is the share of unit-minutes for which the record alone forces one answer. It cannot be gamed by vagueness.

**EF, expected fidelity.** The share of unit-minutes expected to lie within tolerance of the RT when the truth is any history the evidence allows. Monte Carlo over plausible histories (waypoint times drawn inside their windows, positions and facings jittered by their sigma/2 and sd/2, K = 600 draws per unit), three priors:

- P1: independent triangular draws inside each window (optimistic about common clock error).
- P2: one common clock error per history scaled by each window (pessimistic).
- **Aligned**: the *common clock error removed* (it belongs to the shared clock layer, which the site already shows as "about" at every tick), a unit-group offset of sd 4 minutes, leg durations +-20 percent (marching) or +-3 minutes at a change of activity class; and a **time slack** of 0, 3 or 5 minutes: a unit-minute matches if the sampled state is on the RT at *some* RT time within the slack. The slack is a space-time tube around the reference path, the right notion for a marching column whose position is mostly a proxy for its clock.

EF is a *model* quantity: it says how good the reference is *given the stated uncertainties*, not how close it is to a truth nobody holds. Its constants (sigma, windows, kappa 0.20, onset 3 min, group 4 min) are labelled Modelled; section 3.5 gives the sensitivity.

**A, agreement of independent derivations.** Two people (here: two passes) derive the same cells from the sources; A is the share of unit-minutes on which they agree at a tier. It measures reproducibility of the *method* (including the unavoidable judgement), the one measure that does not depend on the model.

Plus **S, site baseline**: the same comparison of the site's existing placements against the RT.

### 1.5 Contested accounts

A contested account is never a footnote and never an average. It is (a) kept in the register with source, claim, what it conflicts with and the rule that put it beside the centre; (b) widened into the envelope when it is inside R-OUT's limit; (c) carried on the row as an `alternates` entry with `why_not_central`; (d) shown to the visitor: the envelope is drawn (ghost footprints at the early and late extremes) and the contested label is printed on the unit card with the source names. Example (pilot C1): Captain Woodward (83rd Pennsylvania) clocks his regiment's engagement at 15:15; five other witnesses of the same brigade say about 16:00 and his own end time (nearly 18:00) agrees with theirs; excluded by R-OUT, shown as contested.

### 1.6 What "97 percent" will mean, stated once

The gate is **G97**: for each phase-block of the battle, EF (aligned, slack no more than 2 minutes, standard tier) with the lower end of its 95 percent interval is 0.97 or more, **and** the agreement A of the two independent derivations at the standard tier (same slack) is 0.97 or more on the cells where both exist, **and** the determined share D and the evidence-class census (E1 to E4 of section 3.4) are printed with it. A second reporting target, not a gate, is the strict tier at 0.90. The tolerances are unchanged by this document; if a phase-block does not reach G97 it is reported as not reached, with its numbers; nothing is relaxed to make it pass. Absolute time is reported separately (EF P1/P2) and is bounded by the clock layer (docs/time), not by this database.

### 1.7 What would have to be true to reach 0.97

`tools/whatif.py` scales the pilot's own uncertainties (`results/whatif.json`; aligned, standard tier, 16 units, 960 unit-minutes):

| scenario | EF standard | strict | share of unit-minutes with EF at or above 0.97 |
|---|---|---|---|
| S0 pilot as derived (slack 3) | 0.629 | 0.370 | 0.081 |
| S1 positions georeferenced (sigma x0.4, floor 25 m) | 0.757 | 0.591 | 0.142 |
| S2 S1 + clocks tightened (group 2 min, kappa 0.10, onset 1.5 min) | 0.921 | 0.751 | 0.419 |
| S3 S2 with slack 2 min | 0.874 | 0.693 | 0.307 |
| S4 ideal: sigma 25 m, group 1 min, kappa 0.05, onset 1 min, slack 2 | **0.971** | 0.877 | 0.752 |
| S5 S4 with slack 0 | 0.838 | 0.646 | 0.357 |

So 0.97 at the standard tier needs, for the unit, position evidence good to about 25 m *and* relative timing good to about a minute *and* a 2 minute slack. That is what the best-documented moments of the battle can give (a tablet and a monument at the spot, two witnesses with watches, a mapped line); it is not what a regimental report gives. Section 4.7 lists where the record cannot reach it.

## 2. Sources, existing data, schema

### 2.1 Inventory of the sources for unit-level movement and action

`pilot/sources.json` holds the 25 records the pilot used (schema `bt-fidelity/source/1`). The production inventory, with what each supports, is:

| source | supports | coverage and status | rights and access |
|---|---|---|---|
| Official Records vol. 27 pts 1-3, in `historian-src/corpus/or27` + `historian-src/raw/or27` | unit action, times "about" (5,268 clock claims, 3,178 dispatches), orders, casualties, named officers | 588 reports, 8,405 passages, 1.32 million words, page-cited; the 18 reports the pilot used are all present; Warren's own report was not found in the part 1 OCR | public domain; Internet Archive scans of the 1889 GPO edition |
| Brigade and regiment reports in the OR | the best unit-level narrative; each is a single witness, written 4 to 87 days after | 140 of 569 registry units have no OR27 core mention; 41 in one report; 140 in two or three; 248 in four or more (`mentions.jsonl`, measured) | as above |
| Retrospective accounts (SHSP, Battles and Leaders, state histories, regimental histories) | timing and ground detail the reports omit; also the contradictions | read in the pilot: Oates (SHSP 6, 1878) and Law (B&L 3, 1888); lag 5,600 and 9,000 days | public domain; cached OCR from the time-evidence pipeline (`tmp/clock-hist-a`) |
| Monuments, markers and tablets | final positions of every regiment and battery (Measured; commemorative, 1880s-1890s) | 938 monument points with coordinates in `docs/basemap1863/modern/data/inventory_features.geojson.gz` (OSM + Wikipedia list; median offset 4.1 m). Union Little Round Top regiments are all present; of the Confederate regiments only brigade-level markers and the 4th Alabama are | OSM ODbL, Wikipedia CC BY-SA. The NPS counts 1,320 monuments and markers and does not publish their coordinates or the tablet texts as open data (`inventory.json`) |
| Bachelder troop-position maps (Library of Congress) | positions of units at stated times of day, with movement lines | **Not read or georeferenced in the pilot.** LOC item `loc.gov/item/93517377` (Bachelder, "Gettysburg battlefield") returned HTTP 403 to the fetch tool on 2026-10-19; not circumvented. Search found the series (1876 positions, 1883 edition) at loc.gov | public domain; access route to settle in phase 1 |
| NPS troop movement maps and Gettysburg Compiler | movements by time | not read | NPS publications |
| Busey and Martin, *Regimental Strengths and Losses* | strength present and losses per regiment | not read; the pilot used the site registry's numbers and flagged them | copyrighted compilation; use the facts, cite; do not copy tables |
| Pfanz, Coddington, Harman, Sears and the secondary literature | context, disputes | not read | copyrighted; cite only |
| NPS Soldiers and Sailors database | individual service records (roster section, not this task) | the NPS database page states no terms, no API and no bulk route, and says the database is "no longer maintained and updated"; the only contact route it gives is the general NPS "Contact Us" | needs written NPS permission before bulk use: route = NPS civil war contact page; not scraped |
| Site data: placements (1,687 keyframes, 478 units), 137-event table, 569-unit registry | the baseline to beat | Modelled; legacy frame; see 2.2 | owned by the site |
| 3DEP elevation | ground under every footprint, slope, feasible speeds | `tmp/look-dev/basemap/cache/dem` (z15, ~1.8 m/pixel); modern bare-earth: quarries, road cuts, tree-less | public domain |

### 2.2 What the existing site data is (audit)

From `docs/pitch/anim/prototype/data/dataset.json` (`dataset.json` keys: 478 units, 1,687 keyframes of [tick, lat, lng, strength, bearing, disposition index, note index], 11 dispositions, 137 events):

- Every keyframe is hand-authored with no basis field: all Modelled (the dataset's own provenance note says so).
- The frame is the legacy one: eight place marks differ from the production frame by 166 to 733 m, and the legacy Little Round Top mark is 275 m from the measured summit. The pilot compares the site both raw and translated to the measured summit.
- Disposition is one of 11 words (Skirmish Line, Charging Line, Line of March, Line of Battle, Reserve, Bivouac, Chaotic Retreat, Mounted Cavalry, Limbered Artillery, Deployed Artillery, Dismounted Cavalry). It carries no volley/file/canister, no column versus line detail, no footprint.
- Sparse: 3.5 keyframes per unit on average; the pilot units have 0 to 22. 91st and 155th Pennsylvania and Company B have no placement; the 140th and 146th New York have one keyframe each.
- Time: ticks map to LMT through the 33 adjudicated anchors (`anchors-final.json`) by linear interpolation: ticks 256, 267, 275 are 16:00, 16:30, 18:00.

### 2.3 Schema (`schema/`)

| file | row | key fields |
|---|---|---|
| `unit-state.schema.json` | unit-minute | unit, t (LMT HH:MM), lon/lat, facing, formation(+class), activity(+class), strength(+basis), front/depth, footprint polygon, ground (z, slope, aspect), wp_from/wp_next, srcs, per-channel evidence label `ev`, `envelope`, `determined` per tier, `expected_match`, casualty bounds; production: commanders, subunits, alternates, provenance pass |
| `waypoint.schema.json` | waypoint, the unit of human derivation | wid, t/lo/hi or rel, pos, sigma_m, facing, facing_sd, formation, activity, srcs, quote, ev, note |
| `event.schema.json` | event mention | id, day, time as stated, type, trigger, verbatim text, actors (linked ids), source (document, passage, page, cite, author, side, perspective), review verdict and flags |
| `source.schema.json` | source | id, cite, type, side, written, lag in days, how much was read, local text path |

`tools/validate.py` (a small draft 2020-12 subset validator, because no jsonschema package is installed) checks the pilot outputs: 976 unit-minute rows, 107 waypoints, 25 sources and 100 events, 0 errors (`results/validation.json`). Its first run failed on the events: 14 of the 87 timed mentions have a null minute because the sentence gives "5 o'clock" with no a.m./p.m. and the corpus did not resolve it; the schema now says so. That is a finding about the corpus, not noise.

## 3. The pilot: Little Round Top, 16:00 to 17:00 LMT, 2 July 1863

### 3.1 Scope and choices

16 units: 20th Maine and its Company B, 83rd Pennsylvania, 44th New York, 16th Michigan (Vincent's brigade); 140th New York, 146th New York, 91st and 155th Pennsylvania (Weed's brigade); Hazlett's Battery D, 5th US; 15th, 47th, 48th and 44th Alabama (Law's brigade); 4th and 5th Texas (Robertson's brigade). The hour is the one the brief names, on the corrected clock: Longstreet's guns and Hood's step-off 16:00 (window 15:45-16:30), Vincent reaches the hill 16:30 (16:00-16:50), the 20th Maine's bayonet charge 18:00 (Contested, 17:30-19:00). The hour therefore covers the *approach, deployment and opening* of the fight; the bayonet charge falls after it. That is what the corrected clock puts there, and it is the harder half for the fidelity metric (marching is where position is a proxy for the clock).

### 3.2 Method (Pass A)

- Sources read: 18 Official Records reports and report parts (Rice, Chamberlain, Welch, Conner, Woodward, Garrard, Martin/Rittenhouse, Sykes pp.592-593, Hunt pp.235-237; Oates, Perry, Campbell, Sheffield, Scruggs, Robertson pp.404-406, Bane, Bryan, Rogers), Oates (SHSP 6) pp.172-179 and Law (B&L 3) pp.318-324. Page-level provenance on every waypoint.
- Ground: 107 waypoints written by hand (`pilot/defs_passA.py`); positions are monument coordinates where the unit stands at its monument (17 percent of unit-minutes), otherwise offsets from named measured points, labelled Modelled with sigma 60 to 350 m.
- Footprints: rectangle of front x depth from strength and formation: line = muskets/2 x 22 inches; column of fours = 4 abreast x 30 inch pace; battery in action = 14 yards between guns. **These drill-book constants (U1) were not re-read from Casey or Hardee in the pilot** and are flagged; the numbers are the standard ones but unverified here.
- Ground under each footprint: elevation at the corners and centre, slope and downslope aspect from the 3DEP grid (`tools/geo.py`). Mean slope under the footprints is 6.5 degrees, maximum 27.7.
- Gates run on Pass A before it was frozen: **G-QUOTE** every waypoint quote found verbatim in the source text: 107 of 107 (the first run found 12 not found, all my own typing errors against the OCR; corrected). **G-KIN** every march leg feasible at the double-quick (138 m/min, scaled by Tobler's slope penalty and a rough-ground factor 0.8) at its best times: 66 legs over 30 m, 0 infeasible. The first run flagged 18: 12 were a flaw in my checker (a walking-speed cap applied to a double-quick), 6 were real timing errors in Pass A (for instance the 140th New York could not cover 2.1 km of ground in 18 minutes; the DEM-aware minimum is 24.5), and were fixed before the freeze. **G-MONO** waypoint times monotone: no errors. **G-SCHEMA**: 0 errors. **G-INT** a unit shown engaged has an opposing pilot unit within 300 m: 149 of 204 engaged unit-minutes; of the 55 without, 47 are Confederate and 8 Union, mostly units fighting Berdan's sharpshooters, Smith's battery and skirmishers who are outside the pilot set; reported, not waved through.

### 3.3 Result table, Pass A (960 scored unit-minutes: 16 units x 60 minutes)

`results/pilot-A.json`, `pilot/unit-minutes.A.jsonl` (976 rows including the 17:00 boundary), `pilot/unit-minutes.A.csv`.

| measure | strict | **standard** | loose |
|---|---|---|---|
| D determined share | 1.6 % | **2.1 %** (95 % Wilson 1.4-3.2) | 2.3 % |
| EF, absolute time, P1 independent windows | 0.195 | **0.343** | 0.523 |
| EF, absolute time, P2 common-mode clock error | 0.173 | **0.294** | 0.430 |
| EF aligned, slack 0 | 0.239 | 0.429 | 0.640 |
| EF aligned, slack 3 min | 0.374 | **0.629** | 0.829 |
| EF aligned, slack 5 min | 0.438 | 0.716 | 0.903 |

By side (standard): absolute P1 Union 0.385, Confederate 0.275; aligned slack 3 Union 0.616, Confederate 0.650. By activity class (aligned slack 3, standard; share of unit-minutes in brackets): static 0.768 (20.7 %), moving 0.511 (45.9 %), forming 0.636 (12.1 %), engaged 0.742 (21.2 %); in absolute time, P1: static 0.512, moving **0.170**, forming 0.494, engaged 0.468. Movement is the weak spot. By ten-minute block (P1 standard): 16:00 0.470, 16:10 0.271, 16:20 0.247, 16:30 0.278, 16:40 0.346, 16:50 0.448: the approach in the middle of the hour is the least certain.

The envelope itself: median radius 966 m (10th percentile 164 m, 90th 1,495 m). That is how wide the record's window is around a marching column's position. By unit, the best are the units that stand on a measured monument (20th Maine Company B 0.87 absolute P1; 44th New York 0.57; 83rd Pennsylvania 0.46; 20th Maine 0.44) and the worst the Weed regiments (0.16 to 0.20: a 2 km march from an unknown start) and the Texans and Alabamians (0.25 to 0.30: they are still crossing the valley for half the hour and Confederate start and positions come from prose only).

Evidence census of the 960 unit-minutes (label of the governing waypoint): position Measured 16.7 %, Modelled 83.3 %; time Documented 14.4 %, Computed 25.7 %, Estimated 16.3 %, Contested 43.6 %; activity Documented 94 %, Estimated 6 %; facing Documented 41.6 %, Estimated 51.8 %, Unknown 6.7 %. Evidence classes (E1 position Measured and time Documented; E2 position Measured only; E3 time Documented or Computed only; E4 neither): **E1 0 %, E2 16.7 %, E3 40.1 %, E4 43.2 %**. No unit-minute of the hour has a measured position and a documented clock at the same time.

### 3.4 What the reports say, and where they disagree (seven contested entries)

| id | what | claim | against | rule |
|---|---|---|---|---|
| C1 | 83rd Pennsylvania's clock | Woodward OR27/1 p.632: in position 14:30, engaged 15:15 | Rice, Conner, Welch, Chamberlain: about 16:00 | R-OUT, excluded, shown |
| C2 | step-off of Hood's attack | Oates "between three and four" (SHSP 6 p.174; taken as 15:45), Bryan 16:00 (p.412), Bane 16:30 (p.410), Law "near 5 o'clock" (B&L 3 p.323; taken as 16:55) | Union contact implies about 16:30-16:45 | R-MED 16:15, window 15:45-17:00. Leave-one-witness-out prediction error of the median: 45, 30, 30 and 55 minutes (mean 40) |
| C3 | 15th Alabama strength | Oates 644 men + 42 officers (SHSP p.178), losses 343+19 | OR report losses 161; site 499 | footprint 499, range carried |
| C4 | order of the Weed line | Garrard p.652: 91st on the left of the battery | monument puts the 91st north of the battery | position from the monument, sigma 50 m |
| C5 | who stood on the left first | Welch: 16th Michigan "on the left of the brigade" then to the right | Chamberlain, Rice: 20th Maine on the extreme left | kept as in the table, unresolved |
| C6 | did Weed's other regiments leave the ridge | Garrard p.651: led right and front, recalled | Sykes p.593: found Weed moving away on Sickles's order | both kept |
| C7 | the regiment on the 44th New York's right | Conner prints "Sixteenth Massachusetts" | Rice, Welch: 16th Michigan | source error recorded |

Two more findings the pilot hands to the animation: (1) the Confederate order of march across the valley is *documented in three places* (Oates p.174, Perry p.393, Bane p.411): the 44th and 48th Alabama left the line by the left flank across the 15th Alabama's rear to the support of the Texas Brigade, which is why the 15th and 47th were alone on the mountain; (2) Oates's own two accounts differ by more than a factor of two in losses (161 in the report, 362 in 1878).

### 3.5 Sensitivity of EF to the modelled constants

Aligned, slack 3, standard tier, same waypoints: unit-group offset 0 min 0.724, 4 min (base) 0.629, 8 min 0.507; leg error kappa 0.10 0.651, 0.20 (base) 0.629, 0.40 0.579; onset sd 0 0.653, 3 (base) 0.629. The base is neither generous nor harsh; the conclusion (0.5 to 0.75) does not depend on the choice.

### 3.6 Second pass, blind, on a random 20 percent

`tools/sample_cells.py` froze Pass A (sha256 of `defs_passA.py`, `unit-minutes.A.jsonl`, `sources.json`, `pilot_lib.py`, in `pilot/passB.sample.json`) and drew, with seed 20261019, 19 of the 96 cells (cell = unit x 10-minute block). Pass B (`pilot/passB.derived.json`) was written from machine-built source packets (`tools/make_packet.py`), the monument table and the DEM, without opening Pass A. `tools/score_passB.py` verified the four frozen files were unchanged and scored 190 unit-minutes:

| | strict | standard | loose |
|---|---|---|---|
| agreement | 45.3 % | **55.3 %** (Wilson 48.2-62.2) | 58.4 % |
| agreement with a 3 minute slack | 63.2 % | **71.1 %** (64.2-77.0) | 78.4 % |

Activity class agrees on 80.0 %, formation class on 91.1 %, fine activity on 76.8 %. Position difference: median 32 m, 90th percentile 419 m, maximum 734 m. Pass B lies inside Pass A's evidence envelope on **94.7 %** of unit-minutes. Of the 85 standard-tier disagreements: 31 position only, 7 facing only, 32 class or formation, 15 several. Eight of the 19 cells fall below 0.8 with the slack; they are the Weed regiments' approach and return (the start of the march is unknown, so the two passes put it 400 to 480 m apart), Hazlett's battery before it moves (674 m: where the battery waited), the 16th Michigan's run along the crest, the 47th Alabama on top of Big Round Top.

**Limit, stated plainly.** Pass B is the same model in the same session as Pass A. The memory of Pass A's reasoning could not be erased, so the agreement is an *upper bound* on what an independent historian would reach. A nested second Claude process is not available on this machine (`claude` is not on the path), and spawning other workers is not part of this task. The production plan therefore requires a different worker for the second derivation (section 4.2).

### 3.7 Against the site's existing data

`tools/score_site.py`, `results/site-vs-A.json`. The site's keyframes (position interpolated linearly between keyframes, carried forward after the last) against Pass A at the same minutes:

| | strict | standard | loose |
|---|---|---|---|
| site, raw frame | 0.0 % | **1.2 %** | 1.5 % |
| site, frame shifted (238 m east, 138 m south) so its Little Round Top mark is on the measured summit | 0.0 % | **3.0 %** | 11.3 % |

The site has the unit at that minute for 61.5 % of unit-minutes only. Median position error (raw / shifted): 20th Maine 592 / 381 m, 83rd Pennsylvania 352 / 153, 44th New York 344 / 92, 16th Michigan 396 / 166, Hazlett 518 / 338, 15th Alabama 844 / 739, 47th Alabama 675 / 501, 48th Alabama 695 / 620, 44th Alabama 782 / 727, 4th Texas 773 / 571, 5th Texas 745 / 550. The site places the Confederate regiments from tick 260 (about 16:11) at latitudes 39.792 to 39.797, the ground between Devil's Den and the Wheatfield road; Oates's account (and Chamberlain's and Rice's: the 15th and 47th came over Big Round Top) puts the 15th Alabama on the south and east side of Big Round Top, about 500 m further south. This is not a criticism of the site's schematic data; it is the size of the task, measured.

### 3.8 Effort, measured

Token counts are the session's remaining-budget counter at checkpoints (`tmp/bt/fidelity/effort.log`); wall-clock from file creation times (session start 14:14, Pass A frozen 14:40, Pass B scored 14:41, events reviewed 14:44). Attributions inside a phase are my estimates and are marked.

| phase | tokens | wall | note |
|---|---|---|---|
| orientation and data audit | 99 k | - | repository, corpus, site data, DEM, monuments |
| reading the sources for 16 unit-hours | 127 k | 17 min (with the above) | about 48 k of it is the unit-specific reading (the 18 reports at about 3.6 characters per token, Oates, Law); the rest is audit (estimate) |
| writing Pass A (107 waypoints, 25 source records) | 49 k | - | |
| tooling, gates, fixes, freeze | 63 k | 8 min | reusable; about 20 k of it is QA that production repeats per unit (estimate) |
| Pass B: packets, derivation, scoring | 24 k | 2 min | 3.17 unit-hours (190 unit-minutes), tool building about 4 k |
| events: extractor, review of 100, statistics | 44 k | 3 min | review alone about 25 k (estimate) |
| schemas, validator, what-if, inventory, this plan | about 70 k | - | |

**Per active unit-hour, one derivation (Pass A):** (48 k reading + 49 k writing + 20 k QA) / 16 unit-hours = **about 7.3 k tokens**. Pass B: 24 k / 3.17 = 7.6 k. The pilot hour was a hard hour (46 percent of unit-minutes moving), so it is a fair price for an *active* hour and an expensive one for a resting hour.

## 4. The plan for the whole battle

### 4.1 What is derived and what is not

~569 units over three days. Of the up to 26 thousand unit-hours of daylight (569 units x 3 days x 15.5 hours) almost all are bivouac, reserve or the march; those are derived from anchors and routes. The unit-hours that need the full process are the **active** ones: a unit moving into, in, or out of a fight. From the site's own keyframes (a Modelled and probably low estimate, because the site is sparse) 478 placed units have **1,871 active unit-hours** (day 1: 786, day 2: 549, day 3: 537; 205, 216, 163 active units); scaled to 569 units that is about **2,230**; I plan on a range of 1,600 to 3,600.

### 4.2 Process, staffing by independent pass

For each unit-block (one unit, one engagement phase of up to 60 minutes):

1. **Source packet.** `make_packet.py`-style: every sentence of every report of the unit, its brigade and the opposing units that carries a time cue or a movement/fire verb, plus the monument and tablet records, plus the DEM and road net. Machine-built so the derivation cannot be steered by notes.
2. **Derivation 1 and derivation 2**, by different workers, blind to each other, each writing waypoints with verbatim quotes. Worker identity differs (different model run, different session; ideally one human historian on a sampled 10 percent).
3. **Gates** run on each derivation before it counts (section 4.5).
4. **Comparison**: `score_passB.py` on every cell. Cells with standard-tier agreement below 0.8 with slack 3 (42 percent of the pilot cells) go to adjudication; the rest take the union of the windows and the median of the times.
5. **Adjudication**: a third worker reads *both* derivations and the sources for the disputed channels only and writes the adjudicated waypoints and the register entry for what stays contested.
6. **Third sampling check**: a random 10 percent of all cells re-derived blind a third time; its agreement with the adjudicated version is the number that goes into G97's A.
7. **Human historian gate** on the contested register and the 5 percent of cells with the largest envelope: this is where the owner's "nobody signs" rule bites; states stay `reviewed`, not `signed`, until a person signs.

### 4.3 Order (hotspots first)

1. Day 2 left: Little Round Top (the pilot hour, extended to the whole fight 15:30-20:30), Devil's Den, the Wheatfield, the Peach Orchard, Plum Run: the densest record and the pilot's neighbours.
2. Day 1: the Railroad Cut and the 6th Wisconsin with Rufus Dawes (about 10:30-11:30 on the adjudicated clock), McPherson Ridge and the Iron Brigade, Oak Ridge and Iverson's pits, Barlow's Knoll, the retreat through the town, Seminary Ridge.
3. Day 3: Pickett-Pettigrew-Trimble (the cannonade 13:00, the step-off 15:00 Contested), the Angle, Culp's Hill morning, East Cavalry Field, Farnsworth.
4. Day 2 right and centre: Culp's Hill, East Cemetery Hill, Cemetery Ridge (the 1st Minnesota).
5. Approach marches and the retreat, night positions, then bivouac and reserve hours by algorithm.

### 4.4 Commanders, strength, casualties

Each commander gets rows (position, facing, status) derived from the same waypoint machinery; fates come from the registry (563 entries) and the OR (named casualties, with the event database). Strength per minute is the documented strength present, reduced by the documented casualties at their dated events, with the unknown time profile Modelled and bounded. The "total soldiers equals the number present" requirement is a *sum check* (G-STRENGTH) over the army returns, owned by the roster task.

### 4.5 Verification gates (all blocking; the pilot ran the first five)

G-QUOTE every quote found in its source; G-KIN no march leg infeasible at the double-quick on the DEM; G-MONO times monotone; G-SCHEMA; G-INT engaged units have an opponent in range or a declared outside opponent; G-CONSERVE (no unit in two places, no speed above the double-quick, no overlap of footprints of friendly units by more than 20 percent); G-STRENGTH (sum of unit strengths against army returns); G-EVENT (every dated event of the event database is consistent with the unit rows it names: an event is a unit test of the timeline); G-2PASS (agreement of the two derivations); G-3RD (the sampled third check); G-LABEL (every channel of every row labelled; no Documented label without a quote).

### 4.6 Projected effort

From section 3.8: one derivation is 7.3 k tokens per active unit-hour. Production per active unit-hour: 2 derivations (14.6 k) + adjudication on 42 percent of cells at 0.6 of a derivation (1.8 k) + a 10 percent third check (0.7 k) = **17.1 k tokens**.

| item | quantity | tokens |
|---|---|---|
| active unit-hours, full process | 2,230 (1,600-3,600) | 38 M (27-62 M) |
| non-active unit-days (anchors, routes, positions of record): 569 units x 3 days | 1,707 unit-days x about 2.3 k | 4 M |
| commanders: about 660 regiment, battery, brigade, division, corps commanders; 25 percent of the unit cost | - | 9.5 M |
| source building: tablet texts and Bachelder georeferencing (about 25 sheets), regimental histories read for the 2,230 hours | - | 18 M (estimate) |
| event database to 3,000-5,000 merged events | section 5 | 6 M |
| **total** | | **about 75 M (50-120 M)** |

At the pilot's throughput (about 7 thousand tokens per minute, one worker) that is about 180 worker-hours; with eight workers in parallel about 23 hours of wall-clock, plus the human historian gates, which are the real bottleneck. These are projections from one hour of one hotspot; the first phase (section 4.3 item 1) re-measures them and the plan is corrected from that measurement, not from this estimate.

### 4.7 Where the record cannot reach the target, and what the inference is

Each item: what is missing, the best evidence-based inference, the label.

| part of the battle | why the record cannot reach G97 | inference | label |
|---|---|---|---|
| the absolute minute of any event | every clock is a private watch; the best anchor window is 25 minutes (docs/time) | median of witnesses, window carried; the metric is clock-aligned and the clock layer is shown as "about" | Estimated / Contested |
| marching units between anchors (day 1 and day 2 approaches, the Confederate march from Cashtown and Marsh Creek, the retreat of 4 July) | no report gives a position; only departure and arrival | shortest feasible route on the 1863 road net at the drill speeds on the DEM; the pilot's leg check (Computed); sigma 150 m or more | Computed on a Modelled road net |
| units with no report: 140 of 569 have no OR27 core mention, 41 only one | nobody wrote about them | inherit from the brigade's narrative; positions from the tablet/monument; activity class from the brigade; flagged "inherited" | Modelled (inherited) |
| inside the regiment: company positions, individual soldiers, who fired when | no record at that scale | drill-book formations and stochastic placement inside the footprint; the 97 percent applies to unit footprints, not to soldiers | Modelled |
| fire discipline: volley or file, rate, ammunition | rarely stated; the 20th Maine's cartridge boxes are an exception | ammunition budget (40 + 20 rounds) against engagement duration, bounded | Modelled |
| casualty time profile | totals are Documented per regiment, times are not | proportional to engaged minutes inside the documented total, bounded by the named dated casualties | Modelled, total Documented |
| the ground of 1863 (woods, fences, orchards, roads): the DEM is modern | only partly mapped | basemap1863 vector inventory and the Bachelder maps; kinematic checks use the DEM only | Unknown for vegetation |
| strengths | first-hand figures disagree with compilations (Oates 686, site 499; Welch 200, site 263) | the first-hand figure in the footprint, the range kept | Contested |
| retrospective-only fights (Law, Oates 1878) against contemporaneous reports | tone and times differ; Law's 17:00 is a gap of an hour | R-MED; retrospective sources never hold the median alone | Contested |
| night, Day 3-4 retreat, hospital and prisoner movements | very sparse | event-driven, coarse; flagged | Unknown / Modelled |

## 5. The event database

### 5.1 Design

`schema/event.schema.json`. The record is a layered store:

- **Mention**: one sentence of a source with a trigger, its time exactly as written (never converted), its linked actors (the historian pipeline's unit and person ids with link tier), its source (document, passage, printed page, cite, author, side, perspective). Immutable once reviewed.
- **Event**: the merge of the mentions that tell the same thing (a reviewed step). It carries a type (reviewed vocabulary), a consolidated time window using R-MED, actors, a place, the unit-state rows it constrains, and the contested register.
- **Constraints**: each event is also a unit test (G-EVENT): "the 6th Wisconsin charged the cut about 11:00" must fall inside the envelope of the 6th Wisconsin's rows.

Target scale: thousands. From the OR27 corpus alone: 10,115 sentences with an event trigger in core-scope passages, 2,863 with a linked unit or person in the sentence (`events/corpus-yield.json`); 802 timed mentions carrying a day (308 of the 588 reports). The rest of the sources (regimental histories, Bachelder legends, tablets, B&L, SHSP, diaries and letters) add more of the same size. Planned yield: 1,700 to 5,200 merged events from the OR alone (2,863 x 0.86 real-event share x 0.7 de-duplication, to 10,115 x 0.86 x 0.6; Modelled), 3,000 to 5,000 with the other sources.

### 5.2 The pilot: 100 events from the Official Records

`tools/extract_events.py` (rule version ev-rules/1), seed 20261019, nine strata (3 days x 3 type groups, up to 10 each; 87 mentions obtained) plus 13 untimed named-killed to reach 100; `tools/apply_review.py` merges the manual review (`events/pilot-100.jsonl`, schema-valid). Verdicts, one reviewer (no second reader yet):

| verdict | n |
|---|---|
| OK | 42 |
| OK_MULTI (valid, several events in one sentence) | 11 |
| TYPE_WRONG (real event, trigger from another clause) | 22 |
| DAY_WRONG (carried-day error) | 8 |
| NEEDS_CONTEXT (day or type not settled by the sentence) | 7 |
| NOT_EVENT (summary, praise, out of scope) | 5 |
| TIME_MISBOUND (the clock belongs to another clause) | 3 |
| SPLIT_ERROR (sentence cut) | 2 |

**86 of 100 are real events (95 % Wilson 77.9-91.5); 53 are usable as extracted (43.3-62.5).** Timed mentions: 47 of 87 usable; untimed named casualties: 6 of 13. Other flags: 4 duplicate sentences (one sentence with two clocks yields two rows), 3 summaries, 1 hearsay item (Meade's dispatch that "many general officers" were killed), 1 contested clock (McMahon, firing begun at 16:00 by Hancock's order on 3 July, against 14:00 elsewhere), 14 of 87 timed rows with no a.m./p.m. Corrected types are recorded in `type_corrected` for 32 rows.

What this means for the build: the rule extractor is a *finder*, not a *writer*. Production adds (a) clause-level splitting (one clock, one trigger, one actor per row), (b) day resolution from the report's own dates and itinerary, (c) a-m/p-m resolution, (d) merge of duplicate mentions, (e) a second reader. Reviewing at pilot quality cost about 250 tokens per mention plus the extractor; with merge and second reading I plan on about 1.1 k per merged event.

### 5.3 Seeded content

100 events across the three days and nine extraction types, including: Reynolds's fall about 10:15 (Wadsworth p.266; Meade p.115; Halleck p.16; Williams p.773 on the news reaching Two Taverns), Major Grover killed early on 1 July (Doubleday p.253), Major Leigh, Johnson's adjutant, killed in front of Greene (p.858), the 1:30 pm cannonade (Hall p.437; Peyton p.385), Hunt's batteries posted at 1 a.m. on 3 July (p.237), Rice's itinerary entry that sends the pilot's brigade to the front at about 16:00 (p.621), and obscure items (a limber explosion that mortally wounds a private on 2 July, a staff officer who rejoins Cutler at 3 o'clock, Egan's horse).

## 6. Decisions made in this plan

No alternatives are offered; these are the choices, each with its reason.

- The gate tier is 100 m / 30 degrees with class equality; the strict tier is a target. The tolerance numbers are one constant.
- The metric is clock-aligned with a 2 minute slack for the gate, and absolute time is reported alongside. Reason: the record's clock cannot support a minute-level absolute claim and a metric that pretended otherwise would be either unattainable or empty.
- Contested accounts stay in the data and on screen. Reason: the owner's rule that gates are never silently relaxed.
- The second derivation in production is always a different worker; the pilot's same-session Pass B is reported as an upper bound.
- Derivations write waypoints with verbatim quotes, never minutes. Reason: auditability and the quote gate.

## 7. Next measurements (phase 1 of section 4.3)

Re-derive the Little Round Top fight 15:30-20:30 (the bayonet charge, Vincent's wound, Weed and Hazlett, the arrival of Fisher's brigade, Chamberlain's night advance up Big Round Top) with two different workers; georeference the Bachelder sheet for 4-7 p.m., 2 July and the NPS tablets of Vincent's, Weed's, Law's and Robertson's brigades; add the commander rows; re-run `whatif.py` with measured instead of scaled sigmas. Success is the move from S0 toward S2 of section 1.7.

## 8. What was not done

- Commander rows (Vincent, Weed, Hazlett, O'Rorke, Chamberlain, Oates, Law, Hood...) were not derived; their fates appear only in the event pilot and the registry.
- Bachelder maps (LOC returned 403, not circumvented), NPS troop movement maps, the Gettysburg Compiler, Busey and Martin, Pfanz, Coddington, Harman and Sears were not read. Strengths are the site's, flagged. Warren's own report was not found in the OR27 part 1 OCR.
- Confederate regiment positions are Modelled from prose and brigade-level monuments; the NPS tablet coordinates for the 15th, 47th, 48th and 44th Alabama and the 4th and 5th Texas are not in any open dataset I could find (the monument inventory carries the 4th Alabama and brigade markers only).
- The drill-book constants of the footprints (22 inch file, 30 inch pace, 14 yard gun interval, 165 steps of 33 inches) are from the standard manuals and were not re-read.
- The second pass is not independent in the strong sense (section 3.6). The review of the 100 events is one reviewer.
- The NPS Soldiers and Sailors terms: the database page states none; no bulk route was used or tested.
- The Monte Carlo constants (sigma/2 as a standard deviation, kappa, onset, group offset) are modelling choices; the sensitivity (3.5) is the only check on them.

## 9. Files

```
docs/battle-theatre/fidelity/
  PLAN.md                         this document
  schema/                         unit-state, waypoint, event, source (JSON Schema 2020-12)
  pilot/defs_passA.py             Pass A: 107 waypoints, 16 units, the contested register C1-C7
  pilot/sources.json              25 source records
  pilot/unit-minutes.A.jsonl      976 unit-minute rows (+ .csv)
  pilot/passB.sample.json         seed, 19 cells, sha256 of the frozen Pass A
  pilot/passB.derived.json        blind Pass B; passB-vs-A.rows.json the 190 compared unit-minutes
  events/pilot-100.jsonl          100 reviewed event mentions; pilot-100.candidates.jsonl unreviewed; corpus-yield.json
  results/                        pilot-A.json, passB-vs-A.json, site-vs-A.json, whatif.json, events-review.json, validation.json
  tools/                          geo.py pilot_lib.py build_pilot.py check_quotes.py sample_cells.py make_packet.py score_passB.py
                                  score_site.py whatif.py extract_events.py apply_review.py validate.py extract_or_text.py
```

Reproduce (Windows, Git Bash, node not needed, python 3.11 with numpy and Pillow): regenerate the OR texts with `python tools/extract_or_text.py or27-1:0195 ...` (ids in `sources.json`; Oates and Law come from the cache path named there), then `check_quotes.py`, `build_pilot.py --k 600` (35 s), `score_site.py`, `sample_cells.py`, `score_passB.py`, `whatif.py` (10 s), `extract_events.py`, `apply_review.py`, `validate.py`. Monte Carlo draws are seeded; a rerun with a different K moves the third decimal.
