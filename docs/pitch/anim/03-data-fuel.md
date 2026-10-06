# 03. Data fuel: what the repo can honestly say about every tile, tick and frame

Prepared 2026-10-05 for the owner's animation pitch (design research and prototype job; **no product code, data or tests were changed**). Author: agent `data-fuel` (files: this page, `data/cluster-stats.json`, `data/fuel-coverage.json`, the generators `data/03-cluster-stats.py`, `data/03-fuel-coverage.py`, `data/03-shots.mjs`, and `data/shots/`).

The question this page answers: *which data can drive the unit tiles and the battle animation, how much of the battlefield each datum covers, how honest it is, and how many tiles must be merged, fanned out or displaced so that no tile ever hides another.*

---

## 0. The twelve facts that shape every idea

1. **The placements are hand-authored, not sourced.** 1,804 rows (694 in `placements_*`, 1,110 in `density_*`, 47 files) on **188 of 675 ticks** for **478 placed ids**. **0 rows carry a basis, source, confidence or uncertainty field**; the repo's own quality report counts 60 of 3,283 records of all kinds with any source string (1.83%) and 0 placement rows documented. Every position-driven visual is therefore **Modelled** until a basis field exists (section 4, E11-E13).
2. **The tile problem is mostly a visibility problem, not a data problem.** The shipped rule (carry every unit's last keyframe forward, never remove it) draws up to **478 tiles at once (typical 384)**; **91% of tile-ticks show a position older than 12 ticks, 76% older than 48, 37% older than a whole day (225)**. Show only the latest keyframe snapshot instead and the maximum falls to **85 tiles (typical 7)**, and the minimum number of tiles that must be merged, fanned out or displaced at zoom 14 falls from **234 to 32** (section 9).
3. **Some collisions can never be solved by zooming.** Even at the app's maximum zoom (18) tiles on an **identical lat/lng** overlap: up to **125 of 478** carry-forward tiles share a coordinate with another tile (about 96 typical); in the latest snapshot at most **8**. These need merging or fan-out at every zoom level (section 9.4).
4. **Width = strength is already saturated.** 901 of 1,804 rows (49.9%) have strength of 478 or more and draw at the 120 px cap; the encoding carries no information for half the map.
5. **Per-tick strength is not a casualty record.** Placement strength rises in 117 of 1,209 consecutive keyframe steps, the first keyframe equals the order-of-battle strength for only 141 of 255 placed regiments and batteries, and 42 units exceed 102% of their registry strength. The popup nevertheless labels it "Current ... men" and turns it red below 50%. Casualty shading over time is **Modelled** at best (section 7).
6. **Ten Confederate regiments are drawn blue.** The renderer takes the side from the id prefix (`U-`); 10 placed ids such as `U-26NC`, `U-5TX` are Confederate regiments with the wrong prefix (10 rows, ticks 95 and 150).
7. **Facing is an 8-point compass.** `bearing` has 9 distinct values, 99.94% multiples of 45 degrees, and agrees within 45 degrees with the actual direction of the next move for only 47% of moves of 50 m or more (charging lines 44%).
8. **Motion between keyframes is a guess drawn as a jump.** The median gap between a unit's keyframes is 17 ticks; **92.3% of keyframe-to-keyframe steps are not interpolated by the shipped code** (it blends only tick f with f+1) and jump at the next keyframe: median **112 px at zoom 14**, 32% over 200 px. 54 (unit, tick) keys are stated twice with positions more than 100 m apart (largest 2,569 m); which one shows depends on file load order.
9. **The sky is computable but the clock is not signed.** Sun and moon are Computed for all 675 ticks (USNO agreement within 0.5 min) but the tick-to-clock map is a **candidate**: all 33 anchors are "proposed", five need a historian. On that clock 234 ticks (34.7%) are nautical twilight or darker, yet only 27 of the 188 keyframe ticks fall there: at night the map is almost entirely stale positions.
10. **The weather record is thin and partly Contested.** Cloud cover is Observed at three slots a day; wind speed is Contested (2 or 12 mph); the morning of July 2 is Contested (Jacobs against Haskell); the only thunder note is from an 1885 article, not the 1864 *Notes*. No rain is recorded for July 1-3 in the transcribed record.
11. **There is no terrain model, and the placements sit in the wrong frame.** The repo has 30 spot elevations and 8 single-point roads, no elevation raster (the site's own viewshed page says so). Production moved 8 key locations by 166-733 m relative to the legacy zip; the 60 rows whose note names Culp's Hill sit a median **696 m** from the Culp's Hill that production now serves (that point is 21 m from Wikipedia's coordinate) and **238 m** from the old wrong one ("Greene's brigade on Culp's Hill" is 696 m away); Devil's Den rows are 806 m from the correct point. Terrain-aware shadows would be false until positions are re-registered.
12. **Popups are dense and last one tick.** 138 distinct ticks carry a popup source (134 event cards, 42 successions, 24 vignettes); the median gap is 2 ticks and tick 550 carries 5 at once. The chronology card exists only while `currentTick` equals the event tick: **500 ms at 1x, 62 ms at 8x**.

**What this means for the three pitches.** (1) Changing the visibility rule is worth more than any tile redesign: it is the difference between 478 tiles and 85. (2) A tile can be honest by construction if every tile carries a fidelity state (placed now, last known N ticks ago) and an evidence label. (3) Zoom-based aggregation must keep stated membership and never move a tile off its coordinate. (4) Popups need a wall-clock dwell, a queue and a placement rule that keeps the tiles of the moment visible. (5) Motion may glide only between two keyframes of one unit within a stated gap, along a path that is labelled Modelled.

What *is* strong: side and echelon (Documented order of battle), commanders (543 of 569 units), the Union corps badges of 1863 (Documented, 78% of Union rows), Computed sun and moon, the three-slot Measured temperatures, the casualty ledger rows (OR p.187 against Fox p.25), and 137 events plus 42 successions plus 24 vignettes as popup fuel.

---

## 1. Method, vocabulary, reproduction

Everything below comes from a command that was run on 2026-10-05; external statements carry the URL of a page that was read.

| Badge (the site's vocabulary) | Used here for |
|---|---|
| **Documented** | printed in a named source (the order of battle is Documented at the legacy "claimed source" tier: Busey and Martin, OR, Gottfried as claimed by the files; the books themselves were not opened) |
| **Measured** | an instrument reading (Jacobs's thermometer) |
| **Computed** | derived by a stated algorithm from data (ephemeris, geometry, the cluster statistics below) |
| **Modelled** | authored or estimated by the project (hand-placed keyframes, the bell-curve casualty apportionment) |
| **Contested** | two or more sources disagree and none is chosen |
| **Unknown** | the repo and the sources read are silent |

Reproduce: `python docs/pitch/anim/data/03-cluster-stats.py` (11 to 13 minutes on a busy machine, most of it the exact search at low zoom; writes `cluster-stats.json`) and `python docs/pitch/anim/data/03-fuel-coverage.py` (seconds; writes `fuel-coverage.json`). Both are read-only on the product. The cluster code was checked against an independent brute-force implementation (plain Python, no numpy, recursive exact independent-set) on four states: tiles, overlapped tiles, largest cluster, merge count and minimum moves agreed exactly (tick 538 at zoom 13.5, tick 120 at zoom 14, tick 551 at zoom 15, tick 56 at zoom 13.5, plus the carry-forward state at tick 299, zoom 14). The projection (512 px world, north up) agrees with the app's own `map.project` to 0.000 px in a real Chrome session (section 9.7).

Prior repo analyses this page builds on and reproduces where it can: `docs/plan/specialists/app-bugs.md` (app-bugs-07: the carry-forward cache), `app-design.md` section 9 (a proposed symbology and echelon aggregation), `perf-runtime.md` finding 10 (canvas renderer), `docs/data/baseline-report.md` (rules G004 stacked coordinates, N001-N004 strength, S007 duplicate keys).

---

## 2. What a tile is today (so the statistics mean something)

From `legacy/analysis/bundle.pretty.js` (line numbers are that file's; production's chunk was compared with R1c's: **identical except the sound-button crash fix, a reduced-motion check on the engaged pulse, and the carry-forward reset described below** (chunk diff run for this page)):

- **Body**: a rectangle `w x h` rotated by `bearing - 90` degrees; `w = clamp(round(strength/4), 10, 120)` px (phones: `/6`, max 60), `h = 8` px (cavalry 4). Artillery is an outlined rectangle with a line, skirmishers a dashed line (96433-96438, 96606-96640). Side colour comes from `unit_id.startsWith("U-")` (96525, 96597).
- **Dot**: a 3.5 px disposition dot, 7 px above the body centre, 11 posture colours (96306-96318, 96645-96651).
- **Label**: from zoom 12 (14 on phones) a black pill 13 px above the centre; its text is `Y4(unit, zoom, {})`: the order-of-battle lookup is passed an **empty object**, so the label is always the id-derived code (`5 NJ`, `III/2/3`), never a designation (96461-96479, 96661). Only the hover popup (97063 ff.) shows names, commander and "Original / Current" men.
- **Collision**: 8 relaxation passes push overlapping tiles apart by up to half the overlap, tiles with an offset of 3 px or more get a leader line; this moves tiles away from their true position and is recomputed every frame from array order (96558-96592).
- **"Engaged" glow**: a Union and a Confederate tile whose screen centres are less than 40 px apart pulse white (96480-96505, 96613-96616). That is a *zoom-dependent proximity heuristic*, not data.
- **Interpolation**: `y1` blends tick f and f+1 only (96266-96305); easing differs per posture. In production the carry cache `i2` is never reset (app-bugs-07); **R1c resets it when time moves backwards and replays skipped ticks, so R1c shows the same state at every tick regardless of path**. Model A below reproduces R1c: the app's own overview counter read **451 units at tick 538** in a real R1c session and model A gives 451; at tick 120 the counter read 209 against 210 (one unit off, cause not traced).
- **Prior art shipped but not wired**: `baseline/dist/unit-rendering-reference.html` is a standalone proof of concept for interpolation, bearing-driven icons, collision handling and an "engaged" halo on Day 3 ticks 540-600. Its collision engine is Mapbox's `icon-allow-overlap: false` with a strength sort key, which **hides** the lower-priority icon instead of stacking it (it would violate the rule that no tile may hide another), and its "engaged" set is posture-based (Charging Line, Deployed Artillery, Skirmish Line).
- **Map**: `satellite-v9`, min zoom 11, max 18, start zoom 13.5, no pitch or bearing (97237-97250). The canvas is not DPR-aware.

---

## 3. The data inventory

| Dataset (path) | What it holds | Coverage | Badge | Caveat that matters for visuals |
|---|---|---|---|---|
| Unit registry (`data-src/build/unit_registry.json`, `unit_index.json`) | 569 units (465 regiments, 104 batteries; 328 Union, 241 Confederate) plus 158 formations (11 corps, 31 divisions, 93 brigades, 23 artillery formations) with `side`, `arm`, `state`, `commander`, `strength`, `casualties`, `days_engaged`, `guns`, parents | side, arm, strength, casualties 569/569; commander 543 (95.4%); days engaged 430 (75.6%); state 466 (81.9%); guns 103 of 104 batteries (500 guns, 4 or 6 per battery) | Documented, legacy claimed-source tier | every unit's rights tier is `legacy / claimed_only`; Busey and Martin and Gottfried were not opened; 25 units flagged `needs_historian` |
| Order-of-battle hierarchy (same files, `parents`) | regiment to brigade to division to corps; artillery battalions and brigades | 561 of 569 units have a parent chain | Documented | a brigade tile's position differs from its regiments' (section 9.4) |
| Placements (`baseline/dist/data/placements_*`, `density_*`) | `unit_id, tick, lat, lng, bearing, disposition, strength, notes` | 1,804 rows, 1,687 unique (unit, tick); 188 ticks (59 / 72 / 57 by day); 478 ids: 217 regiments, 38 batteries, 5 battalions, 89 brigades, 28 divisions, 6 corps, **95 unresolved ids (216 rows, 12%)** | Modelled (0 basis fields) | 305 ids have two or more keyframes, 173 exactly one; 379 rows have fewer than 4 decimals; 103 keys stated twice (65 differ by more than 20 m) |
| Chronology (`chronology_day1-3.json`) | 137 events: `tick, time, event, significance, location, units_involved, narrative` | 137 distinct ticks; 3 low, 16 medium, 73 high, 45 critical; 124 events name units (299 refs, 294 resolve) | Documented text on a Modelled tick | **no coordinates on any event** (location text only); the typed `time` labels disagree with the candidate clock by hours |
| Time anchors (`data-src/time/time_anchors.json`) | 33 anchors tick to LMT minute, with sigma | 12 S, 13 M, 5 R, 3 D | **Candidate, not reviewed** | minutes per tick range 0.83 to 42.3 (median 4.04); ticks 226-240 and 515-518 are fast-forward gaps |
| Time evidence (`historian-src/corpus/time_evidence.json`) | OR claims matched to events | 99 of 137 events have proposals; 5 have reports found | proposals only | "nothing here is shown to a reader" |
| Sky (`data-src/environment/astro_by_tick.json`, `astro_by_day.json`) | sun and moon altitude, azimuth, moon illumination, light class per tick | 675 of 675 ticks | Computed | depends on the unsigned clock; sea-level observer, real horizon not modelled |
| Weather (`weather_by_day.json`) | Jacobs's observations via his son's 1885 article | 56 observations; temperature 3 per day (July 1-3 all two-path confirmed), sky 3 slots per day, wind direction, one thunder note | Measured / Observed / Reported / Contested | the 1864 *Notes* contain no weather table; wind speed July 1-2 Contested; July 2 morning Contested |
| Terrain (`baseline/dist/data/terrain.json`) | 30 key locations with `elevation_ft` (490-785), 8 roads as single points, 8 structures, 4 features | no elevation raster, no road polylines | Documented (secondary) | production differs from the legacy zip in 8 locations (section 4, E20); one name typo ("Gulp's Hill saddle") |
| Casualty apportionment (`casualty_apportionment.json`) | per-corps engagement periods with tick ranges and a bell-curve model | 12 corps records, 23 periods covering 327 of 675 ticks | **Modelled** (sigma 8 ticks infantry, 4 artillery) | initial strength differs from the OOB header for Confederate corps (C-I 20,706 against 22,000) |
| Casualty ledger (`data-src/ledger/conflict_ledger.json`) | 20 "Where the Sources Disagree" rows | Union casualties by corps, OR p.187 against Fox p.25 (WSD-19); two regiments (1st Minnesota, 26th North Carolina) | Documented, two extraction methods | Fox is ingested for only 2 regiments; K/W/M and the Confederate total are Contested |
| Successions (`oob/commander_successions.json`) | 42 command changes with `approx_tick`, cause, source | 25 Union, 17 Confederate; 41 resolve to a unit; 24 have a keyframe within 12 ticks | Documented source, Modelled tick | |
| Vignettes (`vignettes_part1-3.json`) | 24 narrated moments with trigger tick and coordinates | 24 of 24 have `trigger_lat/lng` | Documented text | prose carries real clock times that disagree with the tick clock |
| Monuments (`monuments.json`) | 512 records | 503 without a source for the coordinates | Unknown | the MON layer draws stars over tiles (section 9.7) |

---

## 4. Candidate encodings: data, coverage, badge, risk, verdict

Coverage is measured on the 1,804 placement rows (the tiles that can exist) unless stated. **Verdict**: ADOPT (honest as is), ADOPT WITH BADGE (honest if the badge is visible on the page and in the legend), DO NOT (until the named data exists).

| # | Encoding | Data behind it | Coverage | Badge | Risk that it misleads | Verdict |
|---|---|---|---|---|---|---|
| E01 | **Side colour** | registry `side` for 383 resolved ids; prefix for the 95 unresolved; crosswalk lists 10 wrong prefixes | 100% of rows; 10 rows (0.6%) wrong if the prefix is used | Documented | low with registry and crosswalk; today 10 Confederate regiments are blue | **ADOPT**, never from the id prefix alone |
| E02 | **Arm glyph** (infantry, cavalry, artillery, horse artillery, sharpshooters) | registry `arm`; 255 placed regiments and batteries | 777 rows (43.1%); brigades and above have no arm (811 rows, 45.0%); 216 rows (12.0%) unresolved | Documented | low if brigades get a "formation" glyph; high if the arm is guessed from `ART`/`CAV` in the id (as today) | **ADOPT**; three arm glyphs plus a formation glyph plus a neutral "unresolved" glyph |
| E03 | **Echelon** (regiment, brigade, division, corps, artillery battalion) and **membership** | `level` and `parents` | 1,588 rows resolve (88.0%) | Documented | medium: a brigade tile is not where its regiments are (median 340 m apart in the snapshot, 800 m in carry-forward; 5% and 2% within 30 m) | **ADOPT** as glyph, label and zoom grouping; show membership as a list, not as geometry |
| E04 | **Corps badge (Union)** | the 21 March 1863 circular (section 5) | 702 of 900 Union rows (78.0%); Cavalry Corps 63 rows (7.0%) and unknown corps 135 rows (15.0%) get none; division colour (red, white, blue) derivable for 637 rows (70.8%) | Documented | low for the 7 corps in the circular; **high** if drawn for cavalry, artillery or any Confederate unit | **ADOPT** small badge at high zoom and in the card; no badge where the circular is silent |
| E05 | **Corps / division as text** (both sides) | `parents` | Union 765 of 900 rows with a corps; Confederate 708 of 904 (78.3%) | Documented | low | **ADOPT**: the honest Confederate identifier is the organisation's name, not an emblem |
| E06 | **Identity text** (designation, state, commander) | registry; formations have a commander 158/158 | 543 commanders; 466 states | Documented | low; the shipped labels print id codes because the lookup is passed `{}` | **ADOPT**; id fallback only for unresolved ids and then say so |
| E07 | **Strength at engagement** (static bar or number) | registry `strength` (55-843, median 280); formations 130 of 158 | 100% of resolved units | Documented (secondary, unverified) | medium; source is Busey and Martin as claimed; shipped width saturates for half the rows | **ADOPT WITH BADGE** on a fixed-size tile, scaled within echelon |
| E08 | **Per-tick strength / casualty shading** | placement `strength`, apportionment | 1,804 rows, but 117 of 1,209 steps rise; 141 of 255 first keyframes equal the OOB; 53 of 255 last keyframes within 5% of strength minus casualties | **Modelled** | **high**: reads as a casualty record | **DO NOT** animate per-tile loss as fact |
| E09 | **Casualty totals** (static, per unit; per corps) | registry `casualties` (median 54; 46 zero); ledger WSD-19 | 569 units; 8 Union corps with OR and Fox side by side | Documented | medium for units (secondary); low for corps (two extraction methods; differences up to 73 killed in I Corps are shown, not averaged); "casualties" includes missing and captured | **ADOPT** in the card; corps meter as a pair of values |
| E10 | **Corps losses accumulating** (meter, not tile) | apportionment: 23 periods, bell curve | ticks inside a period: 327 of 675 (48%) | **Modelled** | medium, low if labelled | **ADOPT WITH BADGE**, corps level only |
| E11 | **Posture** (11 dispositions) | placement `disposition` | 100% of rows; Line of Battle 759, Charging 266, Retreat 174, Deployed Artillery 150, March 133, Bivouac 132, Skirmish 69, Reserve 58, Mounted 29, Limbered 21, Dismounted 13 | Modelled | medium; authored per keyframe, 28 duplicate keys disagree on it | **ADOPT WITH BADGE**; drawn by line style and mark, not 11 hues |
| E12 | **Facing** | `bearing` | 100% of rows, 8 compass points | Modelled | medium: 47% within 45 degrees of the real move | **ADOPT** as an 8-point facing for lines at rest; **never rotate the tile art** by it |
| E13 | **Heading / movement vector** | displacement between keyframes | 305 placed ids with two or more keyframes (63.8%); 1,209 steps | Computed from Modelled | medium: straight line, no roads, speed depends on the unsigned clock | **ADOPT WITH BADGE** as a dotted "Modelled path" with hollow keyframe pips; no speed styling |
| E14 | **Last-known age** (placed now / last known N ticks ago) | ticks since the unit's last keyframe | 100% | Computed (and **Unknown** after the last keyframe) | none; it removes the false claim that stale tiles are live | **ADOPT**; the single most important honesty channel |
| E15 | **Engaged ring** | membership in an engagement period (23 periods) or in an event's `units_involved` (124 events, 294 resolvable refs) | event refs placed at or before the event tick: 245 of 299; with a keyframe exactly at the event tick: 140 | Computed from Modelled windows and Documented events | low if tied to windows; **high** if tied to screen proximity as today | **ADOPT** from windows and events; drop proximity |
| E16 | **Artillery fire** | `Deployed Artillery` rows (150) inside a documented window | 150 rows; the July 3 cannonade start is Contested (7 reports about 1 p.m., Jacobs 1:07, two about 1:30; ledger WSD-15) as is the gun count (100 to 150; WSD-16) | Contested (start, count) | medium | **ADOPT WITH BADGE** for the July 3 cannonade only, on Deployed Artillery tiles that exist |
| E17 | **Time-of-day light** | `astro_by_tick` | 675 of 675 ticks | Computed on a candidate clock | medium: clock unsigned; 34.7% of ticks are dark | **ADOPT WITH BADGE** (a "candidate clock" note); tiles keep a contrast floor in the dark |
| E18 | **Moon** | `moon_up`, illumination | up on 284 ticks (126 / 125 / 33 by day), 88.6-99.9% lit | Computed on a candidate clock | low | **ADOPT** as ambient |
| E19 | **Weather mood** (sky cover only) | Observed cloud cover | July 1 all day, July 2 8 a.m., 2 p.m., 9 p.m., July 3 8 a.m., 2 p.m., 9 p.m. | Observed; between slots Modelled | medium: July 2 morning is Contested, wind speed Contested | **ADOPT WITH BADGE**: overcast July 1; show both witnesses on July 2 morning; no rain; no wind animation |
| E20 | **Terrain relief / terrain shadows** | 30 spot elevations; no raster | none | Unknown | **high**: imagery shadows are baked in at an unknown date; placements sit 400-800 m from their named places in the wrong frame | **DO NOT** until positions are re-registered and a raster exists |
| E21 | **Atmosphere** (smoke, dust) | none | none | Modelled decoration | low if toggled, absent from the legend as data, and tied to documented windows | allowed as decoration only |
| E22 | **Commander down** (pulse, toast) | 42 successions; 563 commander entries (441 survived, 69 wounded, 21 killed, 10 mortally wounded, 6 captured, 15 unrecorded) | 35 of 42 units placed at or before the tick; 24 within 12 ticks of a keyframe | Documented source, Modelled tick | low; fate text is free text with dates | **ADOPT**; tile effect only if the tile exists, otherwise popup only |
| E23 | **Event highlight** | `units_involved` | 124 of 137 events; 0 events have coordinates | Documented | low if it highlights only existing tiles; **high** if a location is invented | **ADOPT**; vignettes have coordinates (24 of 24) and may anchor a callout |
| E24 | **Gun count pips** | registry `guns`, `gun_type` | 103 batteries, 500 guns; 38 placed | Documented (secondary) | low | **ADOPT** at high zoom and in the card |

Evidence for the numbers in E01-E24 is in `data/fuel-coverage.json`.

---

## 5. Conventions that are documented for 1863, and what is not

**Union corps badges (Documented).** A circular of Headquarters, Army of the Potomac, dated **21 March 1863** (Hooker; designed by his chief of staff Daniel Butterfield) assigned a shape to each corps and a colour to each division. As reproduced on civilwarnews.com (`https://civilwarnews.com/issues/2022/may/the-library-of-congress-collection-may-2022/`, read 2026-10-05; the page prints the source as the Official Records, GPO 1889, p. 152, volume not stated; **the OR scan itself was not opened**):

| Corps (registry id) | Badge | Union rows (702 of 900 in these seven corps) |
|---|---|---|
| I (`U-I`) | sphere (the NPS caption calls it a circle) | 151 |
| II (`U-II`) | trefoil | 202 |
| III (`U-III`) | lozenge (diamond) | 49 |
| V (`U-V`) | Maltese cross | 81 |
| VI (`U-VI`) | cross | 12 (20 VI Corps rows exist; 8 of their 11 ids are unresolved) |
| XI (`U-XI`) | crescent | 80 |
| XII (`U-XII`) | star | 127 |

Division colour: **red first, white second, blue third** (the same page; Wikipedia, `https://en.wikipedia.org/wiki/American_Civil_War_corps_badges`, adds green for a fourth division and multicolour for headquarters or artillery in some corps; the registry lists no fourth division in any of these corps: divisions per corps are I 3, II 3, III 2, V 3, VI 3, XI 3, XII 2, Cavalry 3). Division records carry their corps in the id and designation (`U-I-1` is "First Division, First Corps"), which is how a corps is assigned to a division-level tile. NPS confirms the I Corps circle and V Corps Maltese cross in a photo caption (`https://www.nps.gov/gett/learn/historyculture/aop-orderofbattle.htm`). Butterfield is credited with the shapes on `https://civilwarnews.com/issues/2024/february/corps-badges/`.

**Not documented, do not draw:** the circular **does not mention the Cavalry Corps or artillery**; any crossed-sabres or crossed-guns emblem would need another source (none was read). **Confederate corps badges: I found no source assigning any**; the NPS Army of Northern Virginia order-of-battle page (`https://www.nps.gov/gett/learn/historyculture/anv-orderofbattle.htm`) lists three corps, their divisions and the cavalry division and mentions no insignia. That is absence of evidence, not proof; ask the historian before treating "none" as a fact on the page. Confederate tiles should carry the corps and division **name** (Documented organisation), not an invented emblem.

**Other conventions checked.**
- *Line frontage* (needed if tiles ever show true footprint): Dave Powell, Emerging Civil War, 3 Sept 2014 (`https://emergingcivilwar.com/2014/09/03/a-matter-of-tactics/`): a full 1,000-man regiment in the two-rank line of the tactics manuals occupied **250 yards**. That is 0.23 m per man of strength; the earlier proposal in `app-design.md` (about 0.3 m per man, "to be validated") is about 30% too wide.
- *Pace* (needed to judge implied speeds): quick time 110 steps a minute, double quick 165 (`https://acws.co.uk/archives-reenact-gilhams`, read; step lengths of 28 and 33 inches appeared only in a search snippet and are **unverified**; on them double quick is about 138 m a minute).

---

## 6. Sky, weather and light on the tick axis

**Candidate clock, as the sky uses it** (`astro_by_tick.json`; every row rebuilt from `time_anchors.json`, all anchors `proposed`):

| Day | day | civil twilight | nautical | astronomical | night | notable ticks (candidate clock) |
|---|---|---|---|---|---|---|
| July 1 (1-225) | 97 | 10 | 20 | 24 | 74 | sunset 97.7, civil dusk 101.1, moonrise 99.4 |
| July 2 (226-450) | 91 | 18 | 16 | 19 | 81 | sunrise 226.2, sunset 317.5, civil dusk 326.4, moonrise 329.5 |
| July 3 (451-675) | 204 | 21 | 0 | 0 | 0 | sunrise 452.1, cannonade anchor 518, sunset 656.6 |

Sun altitude runs from -27.2 to +73.3 degrees; the moon is up on 284 ticks and 88.6-99.9% lit. Only **145 of the 188 keyframe ticks are in full day** and 27 are nautical twilight or darker (324 of 1,804 rows, 18%). A night-time look therefore shows a dark map of stale positions for about a third of the timeline; the keyframes do not support lively motion there.

**What the weather record supports** (all from `weather_by_day.json`; source: H. E. Jacobs's 1885 *Star and Sentinel* article reporting Michael Jacobs's readings, relayed second-hand; the original forms were not seen):

| Slot (candidate-clock tick) | Observation | Badge |
|---|---|---|
| July 1, 7 a.m. / 2 p.m. / 9 p.m. (ticks about 10 / 51 / 115) | cumulo-stratus 7 a.m. and 2 p.m., cirro-stratus 9 p.m.; "entire sky covered"; 72, 76, 74 F; wind a very gentle southern breeze | Observed; Measured |
| July 2, 8 a.m. / 2 p.m. / 9 p.m. (about 233 / 246 / 332) | covered; three-tenths clear; cirrus; 74, 81, 76 F | Observed; Measured |
| July 2 morning | "pleasant, calm, sun shining mildly through a smoky atmosphere" (Jacobs) against "thick and sultry, sky overcast" (Haskell) | **Contested** |
| July 3, 8 a.m. / 2 p.m. / 9 p.m. (about 489 / 527 / none: the candidate clock ends at 8 p.m.) | completely covered; four-tenths cumulus; seven-tenths cumulus; 73, 87, 76 F; wind S.S.W. very gentle | Observed; Measured |
| July 3, 6 p.m. (about 597) | "Thunder storm in neighborhood" (from the 1885 article, **not** the 1864 *Notes*) | Observed |
| Wind speed July 1-2 | 2 or 12 mph | **Contested** |

The transcribed record has precipitation entries for June 25-26 and July 4-8 but none for July 1-3; that is silence, not proof of a dry day, so no rain effect and no "dry" claim. July 3's 87 F is the month's maximum "at the time of Pickett's charge" (one source, damaged-image support). The **moon** is the strongest ambient fact: full on 1 July at 01:38 LMT (NASA/Espenak, cross-checked in the repo), rising 66 minutes after sunset on July 2.

Verdict for light and mood: a gentle, **badged** tint driven by sun altitude and by the observed cloud cover; July 1 flat overcast (so no hard shadows that day), broken cloud on the afternoons of July 2 and 3. Shown as "Computed on the candidate clock", never as "at 4:17 p.m.".

---

## 7. Strength, casualties and the ledger

- **Registry strength** (`strength`, 55-843, median 280, 569 of 569): the engaged strength per the legacy order of battle; for placed regiments and batteries it equals the first keyframe in 141 of 255 cases. **Documented, secondary, unverified**.
- **Placement strength** (every row): authored. Rises in 117 of 1,209 steps on merged tracks (baseline-report N002 counts 121 on its basis), exceeds 102% of the registry for 42 units (N001: 74 on its basis), final value within 5% of strength minus casualties for 53 of 255 (N004: 88 of 302 including formations). Conclusion: usable as a tile **size hint**, not as "men remaining".
- **Final casualties per unit** (`casualties`): median 54, 46 zero, all units with a placed own track have a value above 0. "Casualties" are killed, wounded and missing together (ledger WSD-19 shows OR p.187 printing the missing column, e.g. I Corps 666 killed, 3,231 wounded, 2,162 missing = 6,059 against Fox p.25 593 / 3,209 / 2,222 = 6,024).
- **Ledger** (`conflict_ledger.json`): Union casualties by corps for all corps, OR p.187 against Fox p.25 (WSD-19), each value with page, quote and verification level; two regiments from Fox (1st Minnesota 215 of 262 on July 2, 224 for the battle; 26th North Carolina 588 of 820 present, about 120 more missing); the Reynolds time (10:15 / 11:15 / 11:30) and the cannonade start (about 1 p.m. against 1:07 and 1:30) as Contested clock rows. Fox is ingested for **2 regiments only**; the other roughly 300 regiments of Fox's tables are not in the repo.
- **Apportionment** (`casualty_apportionment.json`): the file says its own purpose is "per-tick casualty scaling for the animation engine" by a bell curve (sigma 8 ticks infantry, 4 artillery); the 12 corps records, 23 periods and 327 covered ticks are a **Modelled** schedule on top of corps totals that differ from the ledger (period sum 23,138 against OR 23,049; Confederate initial strengths differ from the OOB header).
- **Honest uses.** (1) Static final casualties in the card with the badge "Documented, secondary". (2) Corps totals as the OR and Fox pair. (3) A corps-level "losses to this tick (Modelled)" meter inside the 23 windows. (4) The popup's "Current ... men (red)" should be removed or relabelled "strength in the project's placement data (Modelled)".

---

## 8. Motion between keyframes (what the data allows, and why the shipped animation jumps)

From `fuel-coverage.json` (1,209 steps on tracks merged last-row-wins):

- **Keyframe density**: 188 populated ticks, median gap between populated ticks 2, longest empty stretch ticks 150 to 180; 261 units first appear on day 1, 160 on day 2, 57 on day 3; **452 of 478 units have their last keyframe before tick 627**, 153 on day 1.
- **Per unit**: the median gap between a unit's consecutive keyframes is **17 ticks** (p90 137, max 658); only 7.7% are one tick apart; 56.7% are more than 12 ticks apart; 22.3% of steps do not move at all.
- **Displacement**: median 239 m, p90 1,586 m, max 5,682 m. As screen pixels (jump size of the 873 moving steps with a gap above one tick): zoom 13.5 median 79 px, p90 375; zoom 14 median 112 px, p90 531; zoom 15 median 225 px, p90 1,061.
- **Implied speed on the candidate clock** (645 steps of at most 40 ticks): median 12 m per model-minute, p90 49, 2.9% above 150 (about the double-quick), 0.16% above 400. The fastest: `U-8NY-CAV` ticks 3 to 4, 2,374 m in 5 minutes (475 m a minute, a gallop); `C-I-3-3` ticks 550 to 551, 929 m in 2.7 model-minutes (345 m a minute, infantry, about 2.5 times the double-quick) and `C-I-3-1` ticks 548 to 549 (321 m a minute). Either the keyframe or the clock is wrong there; **speed must not be drawn from these numbers**.
- **Heading**: the keyframe `bearing` is not the direction of travel (47% within 45 degrees overall, 61% for Line of March, 44% for Charging Line); use the displacement vector for heading, `bearing` for facing at rest.
- **Duplicates**: 103 (unit, tick) keys appear more than once (117 redundant rows); 65 differ by more than 20 m, 54 by more than 100 m, 28 differ in posture, 38 in strength; the app shows the row that loads last. Under the rule "last row wins" a unit can flip between two positions if file order changes (a jitter source independent of any animation code).
- **The clock is not uniform**: on the candidate clock a tick is 0.83 to 42.3 model-minutes (median 4.04). A constant 500 ms per tick therefore plays quiet hours and the assault at the same pace; an animation that follows model-time would need a signed clock first.

Data-side recipe that stays honest: hold a unit at keyframe A until the clock approaches keyframe B, then glide along the straight Modelled path, ease by the posture of B, never glide across a gap larger than a stated number of ticks (the app-bugs-07 spec uses `MAX_GLIDE_TICKS`; this page supplies the distribution to choose it from), and mark the pair of keyframes on the map.

---

## 9. Cluster statistics: how many tiles collide, at every zoom

### 9.1 What was computed

Real placements (1,804 rows, the 47 files in the app's own load order), Web-Mercator with the 512 px world of Mapbox GL (`map.project` agrees to 0.000 px, section 9.7), north up, pitch 0, zoom 11 to 17 plus 13.5 (start) and 18 (maximum). Three rules for **which tiles are on the map**:

- **A. carry-forward** (shipped in production for a forward play from tick 1, and in R1c at every tick): every unit with a keyframe up to tick t, at its last keyframe, forever. 188 distinct states.
- **B. latest keyframe snapshot**: only the units recorded at the most recent keyframe tick, held until the next. 188 states. (A strict "rows at exactly tick t" rule would draw nothing on the 487 ticks without rows.)
- **C. carry-forward with a 24-tick window**: a probe, not a recommendation; the data does not say when a unit leaves the field.

Three measures, for the shipped glyph (body plus dot, no label) and three **probe footprints that are sensitivity tests, not design decisions** (24x16 px frame; 40x16 px frame plus one-line code; 72x30 px frame plus two lines):

- **within one tile-width**: centre distance below W px (W swept 16 to 120); "cluster" = connected group;
- **obscures**: footprints intersect;
- **minimum to merge, fan out or displace**: n minus the largest set of tiles that can all sit on their true positions without touching. Exact (branch-and-reduce) wherever the search finished; where it did not, a `<=` marks an upper bound (the JSON also carries the lower bound). The "merge-removed" number (each cluster collapsed to one badge) is in the JSON.

"Typical" is the tick-weighted median: a state counts for the number of ticks it persists.

### 9.2 Population under the three rules

| visibility rule | states | tiles on the map: max (at tick) / typical / p90 | tile-ticks whose last keyframe is older than 12 ticks / 48 ticks / 225 ticks |
|---|---|---|---|
| A. carry-forward (shipped; R1c at any tick) | 188 | 478 (tick 620) / 384 / 476 | 91% / 76% / 37% |
| B. latest keyframe snapshot | 188 | 85 (tick 120) / 7 / 24 | 0% / 0% / 0% |
| C. carry-forward, 24-tick window (probe) | 269 | 98 (tick 72) / 44 / 79 | 34% / 0% / 0% |

The shipped rule is the problem: the same data under rule B never has more than 85 tiles on screen, and half the ticks have 7 or fewer. **153 of the 478 tiles drawn at the end of day 3 under rule A belong to units whose last keyframe was on day 1.**

### 9.3 Tables

Zoom 13.5 is the app's start view; zoom 14 and 15 are the working range for the battle; 18 is the maximum. `m per px` is at 39.82 N. Columns 7-10 give "max / typical" of the minimum tiles that must be merged, fanned out or displaced for the footprint named.

**Rule B: latest keyframe snapshot**

| zoom | m per px | W=40 px: neighbours per tile typical / p90 / max | W=40: biggest cluster max / typical | 40x16 tiles obscuring another: max / typical | ticks with any overlap (40x16) | min tiles to merge, fan out or displace, max / typical: shipped glyph | 24x16 | 40x16 | 72x30 |
|---|---|---|---|---|---|---|---|---|---|
| 11 | 29.354 | 7 / 26 / 52 | 85 / 6 | 85 / 7 | 85% | 77 / 5 | 71 / 5 | 74 / 5 | 79 / 5 |
| 12 | 14.677 | 5 / 15 / 28 | 52 / 5 | 83 / 6 | 78% | 70 / 4 | 60 / 3 | 64 / 3 | 74 / 5 |
| 13 | 7.339 | 3 / 9 / 19 | 33 / 4 | 68 / 2 | 65% | 51 / 2 | 37 / 1 | 43 / 1 | 63 / 3 |
| 13.5 | 5.189 | 2 / 6 / 13 | 30 / 4 | 64 / 2 | 65% | 47 / 2 | 31 / 1 | 39 / 1 | 57 / 3 |
| 14 | 3.669 | 1 / 4 / 10 | 22 / 3 | 52 / 2 | 57% | 28 / 0 | 24 / 1 | 32 / 1 | 41 / 1 |
| 15 | 1.835 | 0 / 1 / 6 | 14 / 1 | 30 / 0 | 31% | 21 / 0 | 10 / 0 | 14 / 0 | 19 / 0 |
| 16 | 0.917 | 0 / 0 / 3 | 5 / 1 | 9 / 0 | 26% | 14 / 0 | 4 / 0 | 5 / 0 | 14 / 0 |
| 17 | 0.459 | 0 / 0 / 1 | 2 / 1 | 8 / 0 | 18% | 5 / 0 | 4 / 0 | 4 / 0 | 5 / 0 |
| 18 | 0.229 | 0 / 0 / 1 | 2 / 1 | 8 / 0 | 17% | 4 / 0 | 4 / 0 | 4 / 0 | 4 / 0 |

**Rule A: carry-forward as shipped**

| zoom | m per px | W=40 px: neighbours per tile typical / p90 / max | W=40: biggest cluster max / typical | 40x16 tiles obscuring another: max / typical | ticks with any overlap (40x16) | min tiles to merge, fan out or displace, max / typical: shipped glyph | 24x16 | 40x16 | 72x30 |
|---|---|---|---|---|---|---|---|---|---|
| 11 | 29.354 | 81 / 115 / 163 | 449 / 372 | 477 / 382 | 100% | <=449 / 357 | <=432 / 342 | <=442 / 352 | <=462 / 369 |
| 12 | 14.677 | 26 / 65 / 85 | 435 / 360 | 467 / 376 | 100% | <=414 / 328 | <=372 / 295 | <=392 / 310 | <=441 / 351 |
| 13 | 7.339 | 10 / 31 / 45 | 249 / 91 | 422 / 333 | 100% | <=330 / 257 | 272 / 213 | <=305 / 236 | <=390 / 309 |
| 13.5 | 5.189 | 6 / 22 / 32 | 106 / 85 | 411 / 327 | 100% | <=312 / 245 | 252 / 197 | 286 / 224 | <=352 / 279 |
| 14 | 3.669 | 3 / 13 / 26 | 89 / 61 | 343 / 277 | 100% | 202 / 154 | 185 / 146 | 234 / 183 | <=298 / 231 |
| 15 | 1.835 | 1 / 4 / 14 | 36 / 29 | 210 / 165 | 98% | 147 / 120 | 96 / 73 | 119 / 92 | 153 / 120 |
| 16 | 0.917 | 0 / 1 / 6 | 8 / 3 | 130 / 100 | 98% | 109 / 87 | 70 / 51 | 72 / 52 | 119 / 92 |
| 17 | 0.459 | 0 / 1 / 4 | 5 / 3 | 129 / 98 | 98% | 76 / 58 | 69 / 50 | 70 / 51 | 71 / 52 |
| 18 | 0.229 | 0 / 1 / 3 | 4 / 3 | 127 / 96 | 98% | 68 / 50 | 68 / 50 | 69 / 50 | 69 / 50 |

**Rule C: carry-forward with a 24-tick window (probe)**

| zoom | m per px | W=40 px: neighbours per tile typical / p90 / max | W=40: biggest cluster max / typical | 40x16 tiles obscuring another: max / typical | ticks with any overlap (40x16) | min tiles to merge, fan out or displace, max / typical: shipped glyph | 24x16 | 40x16 | 72x30 |
|---|---|---|---|---|---|---|---|---|---|
| 11 | 29.354 | 23 / 48 / 70 | 98 / 39 | 98 / 42 | 97% | 90 / 37 | 87 / 35 | 89 / 36 | 93 / 40 |
| 12 | 14.677 | 11 / 26 / 54 | 87 / 23 | 95 / 41 | 96% | <=81 / 31 | 72 / 27 | 78 / 29 | 88 / 36 |
| 13 | 7.339 | 5 / 15 / 37 | 55 / 18 | 89 / 29 | 90% | 65 / 20 | 56 / 15 | 61 / 17 | 78 / 28 |
| 13.5 | 5.189 | 3 / 11 / 29 | 55 / 16 | 85 / 28 | 90% | 62 / 16 | 50 / 13 | 58 / 15 | 71 / 24 |
| 14 | 3.669 | 2 / 7 / 22 | 48 / 10 | 74 / 20 | 88% | 40 / 8 | 37 / 7 | 48 / 11 | 58 / 16 |
| 15 | 1.835 | 0 / 2 / 11 | 28 / 3 | 45 / 6 | 81% | 35 / 5 | 21 / 2 | 25 / 3 | 31 / 5 |
| 16 | 0.917 | 0 / 1 / 6 | 8 / 2 | 31 / 2 | 76% | 24 / 3 | 16 / 1 | 16 / 1 | 25 / 3 |
| 17 | 0.459 | 0 / 1 / 4 | 5 / 2 | 31 / 2 | 62% | 16 / 2 | 16 / 1 | 16 / 1 | 16 / 1 |
| 18 | 0.229 | 0 / 1 / 2 | 3 / 2 | 31 / 2 | 62% | 16 / 1 | 16 / 1 | 16 / 1 | 16 / 1 |

Reading the tables:

- *Within one tile-width* at the start zoom 13.5 with 40 px tiles: under rule B a typical tile has 2 neighbours and at worst 13, the biggest cluster is 30 tiles; under rule A a typical tile has 6, at worst 32, the biggest cluster 106. At zoom 11 the whole battlefield is one cluster (449 of 478 tiles under rule A).
- *Obscure*: under rule A **at zoom 13.5, 411 of 478 tiles (86%) obscure another** with the 40x16 probe and 439 (92%) with the shipped glyph; the minimum to move is 286 (exact) and at most 312 (upper bound for the glyph). Under rule B the maxima are 64 and 74 tiles obscuring, but the *minimum to displace* is **39** (probe) and **47** (shipped glyph), typical **1 to 2**.
- *The floor*: under rule B at zoom 17 and 18 at most **5 tiles** need to move for any footprint tested (the stacks of section 9.4); at zoom 16 at most 4 (24x16) and 5 (40x16), but 14 for the 72x30 probe and for the shipped glyph (two-line labels and 120 px bars still touch). Under rule A the floor is **72, 70 and 69 tiles at zoom 16, 17 and 18 (40x16)**, because stale tiles stack on identical coordinates.

**Where a tile stops touching its neighbour** (nearest-neighbour ground distance, zoom-independent: rule B median 115 m, closest 10% at 51 m; rule A median 70 m, and 21% of its tiles sit on another tile's exact coordinate):

| zoom | m per px | B: typical neighbour distance in px (p50) | B: closest 10% of tiles (p10) | A: typical (p50) | A: p25 |
|---|---|---|---|---|---|
| 11 | 29.354 | 4 px | 2 px | 2.4 px | 1.5 px |
| 12 | 14.677 | 8 px | 3 px | 4.8 px | 2.9 px |
| 13 | 7.339 | 16 px | 7 px | 9.6 px | 5.8 px |
| 13.5 | 5.189 | 22 px | 10 px | 13.5 px | 8.2 px |
| 14 | 3.669 | 31 px | 14 px | 19.1 px | 11.6 px |
| 15 | 1.835 | 63 px | 28 px | 38.2 px | 23.3 px |
| 16 | 0.917 | 126 px | 56 px | 76.4 px | 46.6 px |
| 17 | 0.459 | 251 px | 112 px | 152.7 px | 93.0 px |
| 18 | 0.229 | 503 px | 224 px | 306.1 px | 186.5 px |

A 40 px tile clears the *typical* rule-B neighbour from about zoom 14.4 and the closest tenth from about 15.5; a 24 px frame from about 13.6 and 14.8. The stacked tiles never clear, at any zoom.

### 9.4 Zoom-independent stacks and echelon duplicates

| | A. carry-forward | B. latest snapshot |
|---|---|---|
| tiles sharing an identical lat/lng with another tile: max / typical | 125 / 96 | 8 / 0 |
| largest stack on one coordinate: max / typical | 4 / 3 | 2 / 1 |
| tiles closer than 25 m to their nearest neighbour | 22% | 4% |
| tiles closer than 100 m | 73% | 46% |
| tiles closer than 250 m | 95% | 85% |
| typical nearest-neighbour distance (m) | 70 | 115 |
| brigade/division/corps tile and one of its own regiments both drawn: pairs per state, max / typical | 712 / 361 | 33 / 0 |
| ...of those pairs, within 30 m / 100 m / 300 m of each other | 2% / 10% / 27% | 5% / 21% / 48% |

Pair kinds of the tiles that share an exact coordinate, counted in states (A: enemy_sides 2740, same_formation_siblings 1466, ancestor_and_descendant 1093, same_side_unrelated 973, same_side_one_id_unresolved 965; B: ancestor_and_descendant 22, same_formation_siblings 7, enemy_sides 7, same_side_one_id_unresolved 4). Under rule B the stacks are few and mostly structural: a brigade and one of its own regiments on one coordinate, siblings of one brigade, and 7 states with a Union and a Confederate tile on the same coordinate (ticks 37, 53, 64, 120, 270, 278 and 551: a melee or a placeholder position, not diagnosed). Under rule A **38% of the stacked pairs are Union against Confederate (2,740 of 7,237 pair-states) and 95% of those (2,594) join two tiles whose last keyframes are from different ticks**: one side's stale tile sits on the exact coordinate that the other side reaches later, an artefact of carry-forward. The placement coordinates carry four decimals (11.1 m north-south, 8.5 m east-west); rule G004 of the repo's own quality report counts 39 stacked groups (78 units) after last-writer-wins.

### 9.5 Hotspots: ticks and places

Episodes of 3 or more tiles that obscure each other (40x16 probe), consecutive states at the same nearest place merged. "Nearest place" is the closest point of `terrain.json` as production serves it and is **a label, not a claim**: placements sit in a different frame (section 4, E20).

**Rule B at the start zoom 13.5**

| tiles | tick (episode) | day | side mix (U / C) | nearest place in terrain.json (distance) | spread | sample ids |
|---|---|---|---|---|---|---|
| 22 | 538 (538-539) | 3 | 0 / 22 | Seminary Ridge (central) (350 m) | 678 m | C-I-3-1, C-I-3-2, C-I-3-3 |
| 19 | 120 (120-121) | 1 | 19 / 0 | Evergreen Cemetery gatehouse (50 m) | 489 m | U-I-3-1, U-I-3-2, U-I-3-3 |
| 17 | 120 (120-121) | 1 | 17 / 0 | Copse of Trees (113 m) | 564 m | U-II-1-3, U-II-1-4, U-II-2-1 |
| 16 | 400 (400-419) | 2 | 0 / 16 | Seminary Ridge (central) (320 m) | 556 m | C-I-3-1, C-8VA, C-18VA |
| 16 | 451 (451-454) | 3 | 11 / 5 | Gulp's Hill saddle (334 m) | 556 m | U-XII-2-1, U-XII-2-2, U-XII-1-1 |
| 15 | 620 (620-624) | 3 | 0 / 15 | Seminary Ridge (central) (366 m) | 423 m | C-I-3-1, C-I-3-2, C-I-3-3 |
| 14 | 56 (56-57) | 1 | 3 / 11 | Barlow's Knoll (151 m) | 572 m | C-II-3-2, U-XI-1-1, U-XI-1-2 |
| 14 | 278 (278-282) | 2 | 5 / 9 | Peach Orchard (237 m) | 478 m | C-I-1-2, U-III-1-3, U-ART-B1NJ |
| 14 | 315 | 2 | 6 / 8 | Gulp's Hill saddle (428 m) | 378 m | C-II-2-1, U-XII-2-3, C-2NC-SW |
| 13 | 64 | 1 | 1 / 12 | Lutheran Theological Seminary (222 m) | 378 m | C-III-3-3, C-III-3-1, U-I-3-2 |

**Rule B at zoom 14**

| tiles | tick (episode) | day | side mix (U / C) | nearest place in terrain.json (distance) | spread | sample ids |
|---|---|---|---|---|---|---|
| 6 | 56 (56-57) | 1 | 2 / 4 | Barlow's Knoll (78 m) | 427 m | C-II-3-2, U-XI-1-1, U-ART-G4US |
| 6 | 278 (278-282) | 2 | 3 / 3 | Peach Orchard (106 m) | 239 m | C-I-1-2, U-III-1-3, U-ART-B1NJ |
| 6 | 315 | 2 | 3 / 3 | Gulp's Hill saddle (416 m) | 145 m | C-II-2-1, U-XII-2-3, C-5VA |
| 6 | 551 (549-551) | 3 | 2 / 4 | Copse of Trees (14 m) | 102 m | C-I-3-3, U-II-2-2, U-ART-A4US |
| 5 | 66 (66-67) | 1 | 5 / 0 | Gettysburg railroad depot (140 m) | 145 m | U-ART-I1OH, U-XI-3-2, U-107OH |
| 5 | 72 (72-74) | 1 | 5 / 0 | Evergreen Cemetery gatehouse (12 m) | 188 m | U-XI-2-2, U-ART-K1OH, U-XI-1-1 |
| 5 | 120 (120-121) | 1 | 5 / 0 | Brian Farm (Bryan Farm) (42 m) | 145 m | U-II-2-2, U-19MA, U-15MA |
| 5 | 120 (120-121) | 1 | 5 / 0 | Evergreen Cemetery gatehouse (80 m) | 290 m | U-I-3-2, U-XI-2-1, U-XI-3-1 |

**Rule B at zoom 16** (what remains when the camera is close)

| tiles | tick (episode) | day | side mix (U / C) | nearest place in terrain.json (distance) | spread | sample ids |
|---|---|---|---|---|---|---|
| 5 | 551 (549-551) | 3 | 2 / 3 | Copse of Trees (22 m) | 68 m | C-I-3-3, U-II-2-2, U-ART-A4US |
| 4 | 555 (555-557) | 3 | 1 / 3 | Copse of Trees (11 m) | 77 m | U-19MA, C-I-3-3, C-9VA |
| 3 | 620 (620-624) | 3 | 3 / 0 | Copse of Trees (9 m) | 26 m | U-II-2-2, U-ART-1NYIND, U-71PA |
| 3 | 675 | 3 | 3 / 0 | Copse of Trees (9 m) | 26 m | U-II-2-2, U-ART-1NYIND, U-71PA |

**Rule A at zoom 14** (what the shipped rule piles up; the last column shows how stale the oldest tile in the pile is)

| tiles | tick (episode) | day | side mix (U / C) | nearest place in terrain.json (distance) | spread | sample ids | oldest tile (ticks since its last keyframe) |
|---|---|---|---|---|---|---|---|
| 23 | 299 (283-675) | 2 | 15 / 8 | Rose Woods (45 m) | 521 m | U-II-1-1, U-II-1-3, U-II-1-4 | 51 |
| 15 | 554 (551-619) | 3 | 11 / 4 | Copse of Trees (36 m) | 196 m | U-II-2-2, U-II-2-3, U-19MA | 434 |
| 13 | 328 (72-675) | 2 | 11 / 2 | Evergreen Cemetery gatehouse (89 m) | 290 m | U-I-3-2, U-XI-2-1, U-XI-3-1 | 260 |
| 12 | 538 (538-543) | 3 | 0 / 12 | Lutheran Theological Seminary (213 m) | 282 m | C-III-3-3, C-III-3-1, C-13NC | 474 |
| 11 | 480 (480-489) | 3 | 6 / 5 | Gulp's Hill saddle (330 m) | 521 m | C-II-2-2, C-27VA, C-33VA | 100 |
| 11 | 510 (510-537) | 3 | 6 / 5 | Gulp's Hill saddle (250 m) | 470 m | C-II-2-4, C-II-2-2, U-XII-2-3 | 130 |

Reading it: the densest single moments are tick 120 (87 rows, 85 units, a Day 1 evening snapshot with 19 Union tiles around Cemetery Hill), tick 538 (22 Confederate tiles stepping off Seminary Ridge for Pickett's Charge), tick 400, tick 451 (Culp's Hill at dawn on July 3), tick 56 (Barlow's Knoll), tick 278 (Peach Orchard), tick 551 (The Angle: six tiles, four of them Confederate, within 102 m; one of the seven states in which a Union and a Confederate tile sit on the very same coordinate). The place name `Gulp's Hill saddle` is the repo's own typo for Culp's.

### 9.6 What must be merged, fanned out or displaced

| Situation | Numbers (40x16 probe unless stated) | What it means |
|---|---|---|
| Keep rule A (carry-forward) | zoom 13.5: **286** tiles of 478 must move or merge at worst (typical 224); zoom 14: 234 (183); zoom 15: 119 (92); **zoom 17: 70 (51); zoom 18: 69 (50)** | no zoom level solves it; stale tiles stack on identical coordinates |
| Rule B, start zoom 13.5 | worst 39, typical 1, 90th percentile 8 tiles | aggregation (brigade or division badge) is enough |
| Rule B, zoom 14 | worst 32, typical 1 | fan out inside the 6-tile worst clusters |
| Rule B, zoom 15 | worst 14, typical 0 | fan out only |
| Rule B, zoom 16-18 | worst 5 (at zoom 16 the shipped glyph and the 72x30 probe still need 14) | stacks only (identical coordinates), fan out |
| Rule B, zoom 11-12 | worst 64-74, typical 3-5 | corps or division badges; individual tiles are not meaningful at 15-30 m per px |

So the answer to "how many units need to be merged, fanned out or displaced so that every tile is fully visible": **in the latest-snapshot reading, at most 39 units at the start zoom and 5 at close zoom, and none at all in about 69% of ticks at zoom 15; in the shipped carry-forward reading, 286 of 478 at the start zoom and 69 even at the maximum zoom 18.** The difference is the visibility rule. Whatever the tile design, no displacement should move a tile off its true position: the only honest moves are *aggregate* (a badge standing for a stated list) and *fan out* (a stated spread around one coordinate, drawn with leader lines and marked as a spread).

Two things this implies for zoom bands (data-derived, to be tuned with the real tile design): below zoom 13 show formation badges (a brigade badge needs a stated membership list); from 13 to 15 show tiles with aggregation inside the clusters listed above; at 16 and above show every tile with fan-out for the stacks. The 95 unresolved ids and the 10 wrong-prefix ids must be fixed or shown as "unresolved" before aggregation is attempted, otherwise a Confederate regiment can be counted into a Union cluster.

### 9.7 The interface also hides tiles (measured in a real browser)

Real Chrome session through the repo's harness (`tests/t0/lib.mjs`, R1c, Mapbox tiles through the Referer-injecting session, about 110 tile requests per run and two runs, own ports and profile), deep links `?t=<tick>&z=<zoom>&ll=...`. Screenshots and the raw counts are in `data/shots/` (`ui-cover.json`); the site's footer credit line is hidden before the capture. For the carry-forward state at the default camera of each scene, the number of tile **centres** in view whose top element is *not* the map (so covered by a card, panel, button or monument star):

| Scene | Tiles (carry-forward) | Centres in view | Under another element | Which |
|---|---|---|---|---|
| tick 538, zoom 13.5, Pickett's step-off | 451 | 333 | **60 (18%)** | event card 26, bottom transport bar 19, monument stars 10, "Ask the Historian" pill 4, overview 1 |
| tick 120, zoom 14, Cemetery Hill evening | 210 | 146 | 7 (5%) | HUD clock card 6, one legend row 1 |
| tick 551, zoom 16, The Angle | 451 | 40 | **15 (38%)** | event card 6, bottom transport bar 6, monument stars 3 |

At tick 551 two popups (a 340 x 500 px vignette panel and the 460 x 146 px event card) plus the legend sit around the action; at tick 538 the event card lies over Cemetery Ridge. Centres are a lower bound (a 120 px bar whose centre is visible can still be half hidden). So "tiles must not obscure each other" has a second half: **popups and panels need a placement rule that keeps the tiles of the moment visible** (the card can name the tiles it refers to, and sit in the free quadrant of the map).

---

## 10. Popups: what feeds them (all kept, all improvable)

| Popup today | Data | Count | What the data allows |
|---|---|---|---|
| Event card (`LF`, bottom centre) | `chronology_day*.json`, significance not low | 134 ticks (45 critical, 73 high, 16 medium) | exact-tick match only; on screen 500 ms at 1x, 125 ms at 4x, **62 ms at 8x**; paused it persists. A dwell time tied to wall-clock, not to the tick, is the fix (data: median gap to the next popup 2 ticks, so a queue is needed) |
| Commander toast (`qF`) | `commander_successions.json` | 42 records, 16 share a tick with another | the tile exists for 35 of 42 at the tick; a pulse on the tile is possible for those |
| Vignette panel (`CF`) | `vignettes_part*.json` | 24 (23 distinct ticks), all with coordinates | shown when `byTick[c - 0..2]`; coordinates allow a callout anchored to the map |
| Hover card (`fF`) | registry, OOB | 569 + 158 | shows "Current ... men" from placement strength (Modelled): relabel or drop |
| Monument stars and tour cards | `monuments.json` (503 of 512 without a coordinate source), 20 story markers, 16 tour stops | | the star overlay covers tiles (section 9.7) |

Density: 138 distinct popup ticks; median gap 2 ticks, 57% of gaps at most 2 ticks, 89% at most 6; 38 ticks carry two or more popups; tick 550 carries 5. A speed simulation of the playback loop (constant frame time) lands on every event tick up to 8x on 60 fps, 30 fps and the phone's 33 ms throttle; at 16x (the keyboard cap) **94% on a phone and 91% at 30 fps**, so about 8 and 12 event cards never appear. The event card keeps its own dismiss set keyed on tick plus text, which a queue can reuse.

---

## 11. Recommendations for the build

**The honest set** (ADOPT in section 4): side and arm from the registry, echelon, corps and division names, Union corps badges where documented, identity text, static strength and casualty facts with their badges, posture by line style, facing at 8 points, heading from the move, the last-known age channel, engaged rings from windows and events, sun and moon, observed cloud cover, commander and event highlights on tiles that exist, gun pips, an aggregation and fan-out layout that never moves a tile off its coordinate.

**Do not build** (until the named data exists): per-tile casualty shading over time, terrain shadows or relief, speed styling, a Confederate emblem, a cavalry or artillery badge, rain or wind effects, a Union against Confederate "engaged" glow from screen proximity.

**One resolver, no split.** The production bundle has four definitions of "on the field" (app-bugs-07: map: unbounded carry-forward; Order of Battle: 50-tick look-back; roster: 100-tick look-back; overview: exact tick; R1c changed the map and the overview counter to the pure carry-forward of rule A). Every extra stage between data and pixels is another place for a rule to differ. The data side of "do not split the pipeline" is: **one pure function `tilesAt(data, tick)` that returns, for every unit, its fidelity state, position, age, badge list and evidence label, consumed by the map, the roster, the overview, the popups and the tests.** The cluster statistics above are computed on exactly that shape.

**Data work that would unlock more** (each is small next to the visual it enables; none is in my remit to do):

| Work | Unlocks |
|---|---|
| a `basis` (documented / reconstructed / derived / schematic) and `source` field per placement row (quality rule P003 already specifies it) | tiles that say Documented instead of Modelled |
| resolve the 95 unresolved ids (61 need a historian) and the 10 wrong-side prefixes | correct side, arm, corps and badge for the 12% of rows that have none |
| decide which of the 103 duplicate keys is right (68 conflict by the repo's own rule S007) | stable positions, no flip by file order |
| re-register the placements against the corrected terrain (or document the frame) | any terrain-aware or imagery-aware visual; honest "on the hill" claims |
| a per-unit end-of-presence (withdrew, destroyed, left the field) | ending carry-forward honestly instead of ageing it |
| sign the time anchors (five need a historian) | lighting, speed and event timing claims |
| a `strength_basis` (initial, estimated, from return) | any strength-over-time visual |
| an elevation raster with a licence (none exists in the repo) | relief, viewsheds and terrain shadows |

**Extensibility: an evidence-tagged channel registry.** To keep the animation improvable by small additions, each visual channel is one row of data, and the legend, the help text, the QA gate and the prototype read it:

```json
{ "id": "E14-last-known-age", "reads": ["tile.age_ticks"], "shows": "ring dash density",
  "badge": "Computed", "coverage": {"rows": 1.0, "ticks": 1.0},
  "fallback": "none", "risk": "none", "requires": [], "default": "on" }
```

A build gate then fails when a channel has no badge, no coverage number or reads a field whose own coverage is below its stated floor; adding a channel is adding a row plus a drawing function, and the legend cannot disagree with the map because both come from the registry. The coverage numbers in section 4 are the first rows.

---

## 12. What is not verified (and the limits of this page)

- **Not opened:** Busey and Martin, Gottfried, Pfanz, the OR volumes and Fox's book (only what the repo's ledger and `data-src` quote); so every strength and casualty value is secondary. The 1863 circular was read through civilwarnews.com's reproduction, not the OR scan. The 28/33-inch step lengths are unverified.
- **Clock**: every tick-to-time statement uses the candidate clock; none of it is reviewed or signed.
- **Placement accuracy against the imagery** was not measured visually; the evidence is the note-text proxy (rows naming a place against that place's coordinate) plus two Wikipedia coordinates (Culp's Hill 39.8201, -77.2203; Devil's Den 39.79150, -77.24238, both read from wikitext on 2026-10-05). Little Round Top is 281 m from Wikipedia's point in production and 302 m in legacy, so it does not discriminate; McPherson's Ridge was not checked (Wikipedia's point is 2.3-2.9 km from both).
- **Model A** reproduces the app's overview counter at tick 538 (451) and is one unit off at tick 120 (210 against 209); the cause was not traced.
- **Footprints** in section 9 are probes. A real tile design will change the numbers; rerun `03-cluster-stats.py` with its footprint added to `PROBES`.
- **The label of the nearest place is a convenience**; 8 of the 30 key locations moved between the legacy zip and production.
- **Not studied:** audio, the Walkthrough, mobile layout (the phone tile is `strength/6`, max 60 px, canvas below 500 px), devicePixelRatio, interaction with Mapbox's own labels, and the Contested wind effect.
- **Machine and ports:** my assigned base 9540 was already taken by another agent's session, so I used 9546 and 9547; one Chrome profile under `tmp/pitch-anim/data-fuel/`; all browsers and servers were stopped when done.

---

## Appendix B. How to read `cluster-stats.json`

`by_model.<A_carry_as_shipped | B_latest_keyframe_snapshot | C_carry_window_24>`: `population` (tiles on the map, age of drawn tiles) and `zoom["11" .. "18"]`, each with `near["16" .. "120"]` (largest cluster, clusters of two or more, neighbours per tile) and `overlap[today | S_24x16 | M_40x16 | L_72x30]` (tiles obscuring another, clusters, `merge_removed`, `moves_lb`, `moves_ub`, `moves_exact_in_all_states`, `worst_state`); rules A and B also carry `series_by_state` (tick, persistence, tiles, overlapped, largest cluster, merge count, moves) for the shipped glyph and the 40x16 probe, so a prototype can replay the worst case per tick. `zoom_independent.<A | B>` holds ground distances, exact-coordinate stacks (with pair kinds) and ancestor/descendant pairs. `hotspots["<rule>|z<zoom>"].episodes_top` lists the densest episodes with centroid, side mix, spread, nearest place and sample ids. A number marked `moves_exact_in_all_states: false` is an upper bound for the minimum moves (`moves_ub`); `moves_lb` is then only a weak lower bound.

## Appendix A. Files

The tables in sections 9.2 to 9.5 are direct renderings of fields of `cluster-stats.json` (no number was typed by hand); the prose numbers in sections 0 and 9.3 to 9.6 were read from the same file after the final run.

- `docs/pitch/anim/03-data-fuel.md` (this page)
- `docs/pitch/anim/data/cluster-stats.json` (all tables, per-state series for rules A and B at zoom 11-18, hotspot episodes, zero-distance stacks)
- `docs/pitch/anim/data/fuel-coverage.json` (every coverage number in sections 3-8 and 10)
- `docs/pitch/anim/data/03-cluster-stats.py`, `docs/pitch/anim/data/03-fuel-coverage.py`, `docs/pitch/anim/data/03-shots.mjs` (the three generators)
- `docs/pitch/anim/data/shots/*.jpg` and `ui-cover.json` (three real screenshots of the shipped tiles and the measured overlay counts)
