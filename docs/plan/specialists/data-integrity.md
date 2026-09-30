# data-integrity — DATA INTEGRITY & QUALITY audit of `DEPLOY_DIR/data` (+ every dataset the site embeds in code) and the plan to fix it

Specialist: **data-integrity** | Mode: NO-BUILD plan input, read-only | Date: 2026-09-29/30
Scripts, raw outputs and CSV appendices: `plan-work/tmp-data-integrity/` (s00–s17 `*.py|js`, `*.csv`, `*.json`; run with `PYTHONIOENCODING=utf-8 python sNN_*.py`).
All measurements below were produced by those scripts against `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy/data` (71 JSON files). Bundle citations are `bundle.pretty.js:LINE`.

---

## 0. TL;DR — the numbers that matter

| # | Finding (measured) | Evidence source |
|---|---|---|
| 1 | Placement data is **1,804 rows** (694 in `placements_*`, 1,110 in `density_*`), not the "430,000+" `placement_schema.json:5` promises (**0.42 %**). Only **188 of 675 ticks (27.9 %)** carry any row; **487 ticks (72.1 %) have zero**. Under the renderer's carry-forward logic only **0.75 %** of displayed unit-ticks are real data; the rest are frozen positions. | `s03_ticks.py`, `s12_render_sim.py`, `bundle.pretty.js:96266-96305` |
| 2 | The renderer never interpolates across keyframe gaps (`y1` only blends tick *f* with tick *f+1*) and its last-known-position cache `i2` is never cleared (`bundle.pretty.js:96265`). Of 1,209 consecutive keyframe transitions, **1,116 (92 %) span >1 tick → hold-then-snap**; median snap of moving units 420 m; **371 snaps >500 m, 84 snaps >2 km**; median implied speed of "moving" units **0.27 mph**. By tick 675, **404 of 478 units are ≥100 ticks (8.3 sim-hours) stale**. | `s04_teleports.py`, `s12_render_sim.py` |
| 3 | **95 of 478 placed unit IDs (19.9 %; 216 rows = 12.0 %) do not exist in the OOB.** Ten Confederate regiments are keyed `U-…` (15th/44th/48th AL, 1st/4th/5th TX, 11th/26th/47th/52nd NC) and therefore **render as Union** (side is inferred from `startsWith("U-")`, `bundle.pretty.js:96484,96525,96585,96597,96679,96739,97068,97923`) while their `C-` twins are also placed. **28 unit IDs** are used for two different formations (e.g. `U-V-3-1` = McCandless in the OOB but "Vincent's brigade" in 4 placement notes; `U-II-2-3` = Hall vs "Webb's brigade"). | `s02_ids.py`, `s11_crosswalk.py`, `s15_semantic.py` |
| 4 | **Casualty numbers have no single authority.** Union: 22,803 (Σ corps totals) / **23,138** (Σ engagement periods, dashboard) / 23,049 (OR, army total in OOB) / 23,055 (Busey & Martin as cited by Wikipedia). Confederate: 23,125 / **23,025** (dashboard) / **28,000** (OOB army total) / 23,231 (B&M p.260). The site's "51,000 casualties" (Help dedication, V-001, V-024, chronology t650) = 23,049 + 28,000, i.e. an OR-vs-upper-estimate mix; the dashboard's own data sums to 46,163. | `s09_casualty.py`, `s08_rollups.py`, reference check in §1 and §3.6 |
| 5 | `casualty_apportionment.json` is **not read by the animation** (no fetch in `bundle.pretty.js`, only an unused store slot at :9447) although `dashboard.html:60` says it "drives the main animation's casualty modeling". Placement `strength` values are hand-typed: **121 strength *increases* across 82 units**, **126 units with >10 % OOB casualties whose strength never changes**, 74 units above their OOB strength by >2 %. | `s05_strength.py` |
| 6 | Dashboard C7 root cause: `casualty_apportionment.json:330-333` `highest_single_regiment_rate` is `{union:{…},confederate:{…}}` (no `unit`/`note`), `dashboard.html:244-247` renders `n.unit || key` and `n.note` → `highest_single_regiment_rate` / `undefined`. The card's claim is also contradicted by the site's own OOB (C-8VA 76.7 % > C-26NC 69.7 %). | `s09_casualty.py` |
| 7 | **Historian chronology is 100 % broken**: `historian.html:119,123` reads `e.title`/`e.description`, but the chronology rows have `event`/`narrative`. All **137/137** chronology answers render "…: undefined" and are indexed by their `location` string only. Terrain covers 30 of 50 entries; brigades, batteries (103), successions, 512 monuments, 16 tour stops are not indexed. Indexed corpus = **11,088 words**; the whole data lake has **45,096 narrative words** (70,723 words in all JSON strings). | `s07_historian_sim.js`, `s16_corpus.py` |
| 8 | The "467 regiments and batteries" claim is wrong two ways: 467 = **regiment records** (incl. 1 alias with strength 0, 1 horse battery misfiled in the cavalry file, and ≥29 rows marked alias/detachment/battalion) and **103 batteries** are extra → 570 records; "445+" (Help) = 467 − 22 (Confederate cavalry file added later). Only **217** of the 467 regiments have any placement of their own (250 = 53.5 % never drawn individually; 19 have neither own nor parent-brigade placement); **62/103** batteries never placed. | `s02_ids.py`, `s06_oob_math.py` |
| 9 | **VI Corps is structurally missing**: 8 brigade IDs (`U-VI-1-1 … U-VI-3-3`) are referenced by 36 regiments, by `division.brigade_ids` and by 8 placement rows, but no brigade records exist; `union_oob_brigades.json` says "All 49 Union infantry brigades" but has 43 infantry + 8 cavalry. 22/22 Union and 9/9 Confederate divisions, and 10 of 11 corps, do not roll up from their children (only U-CAV does). | `s06_oob_math.py`, `s08_rollups.py` |
| 10 | Text: **1,591** user-facing `" -- "` (ASCII stand-in for em-dash; 839 in placement notes, 353 in regiment `key_action`), 72 strings leaking internal IDs (`US-001`, `CS-011`), 60 `flag_notes` dev strings ("DATA NOTE: …"), typos (`Krzyznowski`, `Nichols's`, `Gulp's Hill saddle`), 222 search rows ending in a dangling " · ", 27 rows saying "Commander unrecorded". | `s14_text.py`, `s17_typos.py` |
| 11 | Provenance: **0 of 467** regiments, 0/1,804 placements, 0/137 chronology events, 0/24 vignettes carry a per-record source; only the 42 commander-succession rows (page-level cites like "Pfanz First Day p.65") and 9 of 512 bundled monuments do. 54 of 71 JSON files have no `metadata.sources`. | `s14`, provenance script in §3.10 |
| 12 | Two monument datasets diverge: `data/monuments.json` (9 records, 2.5 KB, "starting set … expand this file") is drawn by the inline overlay (`index.html:640-700`), while the Virtual Walkthrough embeds a different **512-record array inside the JS bundle** (`bundle.pretty.js:104440-110609`, ≈121 KB JSON-equivalent, 503/512 with empty `src`, 51 blank `mn`, duplicate `MN 96`, corrupted #512 text, 28 records outside the schema bbox). | `s13_monuments.py` |

Everything in §5 (fix specs) is expressed so that the whole batch can be executed with no app build except where marked "renderer/UI owner".

---

## 1. Scope, method and honesty about limits

**Scope.** All 71 JSON files under `data/` (placements ×9, density ×38, oob ×14, chronology ×3, vignettes ×3, terrain, monuments, casualty_apportionment, placement_schema) plus the datasets the site **embeds in code** (512-monument array `bundle.pretty.js:104440`, 16 tour stops `:104096`, tutorial steps `:111819`, timeline markers `:112192`, road GeoJSON `:9450`, Help/About copy) because they are the same "data" from a user's point of view.

**Method.** Load everything with Python, build an OOB index (728 unique IDs: 467 regiments, 103 batteries, 93 brigades, 31 divisions, 11 corps, 11 artillery battalions, 12 artillery brigades), then run 18 scripts (`s00_structure` … `s17_typos`). A literal port of `historian.html`'s corpus/score/ask logic (`s07_historian_sim.js`) was run against the real data to measure what users get back. A carry-forward renderer simulation (`s12_render_sim.py`) mirrors `y1`/`F4`/`i2` (`bundle.pretty.js:96238-96305`).

**External check (one fact class only).** Published casualty and strength totals were verified by pulling the raw wikitext of *Battle of Gettysburg* through the MediaWiki API (`tmp-data-integrity/gb_wikitext.txt`, read in full for the infobox/casualty paragraphs). Wikipedia is a secondary source that cites **Busey & Martin p.125 / p.260** and **OR Ser. I vol. XXVII pt. 1 p.187 / pt. 2 pp.338-346**; I did **not** open Busey & Martin itself. Values used as reference: Union **23,055** (3,155 K / 14,531 W / 5,369 C-M; B&M p.125), OR **23,049**, Adjutant-General 1888 **23,003**; Confederate **23,231** (4,708 K / 12,693 W / 5,830 C-M; B&M p.260), range 23,000–28,000, McPherson 28,000; engaged strength Union **93,921** (B&M p.125), Confederate **71,699** (B&M p.260), 75,000 (McPherson, campaign start). Everything historical beyond these is flagged *needs historian verification*; I did not invent citations.

**Limits.**
- "Semantic conflict" checks (§3.4) are heuristics (surname in a note vs. the OOB commander chain). The 28 flagged IDs were hand-reviewed: the Vincent/Webb/Hall/Archer/Gordon/Hoke cases are unambiguous swaps; 2 flagged rows (`C-CAV-2`/Stuart, `U-VI-3`/Getty) resolve to no OOB entry and are reported but not "proven" wrong.
- Renderer behaviour is simulated from source (no browser used, per BRIEF); another specialist (app-latent) holds live runtime evidence and its `gaps.js` reaches the same adjacency figures.
- Clock/time-of-day correctness is owned by the **time-facts** specialist (`time-facts.md`, `time-facts-anchors.csv`, `time-facts-otherclaims.csv`); here I quantify only the **data-side** contradictions and specify the validator hooks.
- Licensing/legal statements are questions (§10), not conclusions.

---

## 2. Inventory and corpus statistics (what the Historian and every tool can draw on)

### 2.1 Files, records, bytes

| Group | Files | Records | Leaf values | Bytes | Notes |
|---|---:|---|---:|---:|---|
| `oob/*` | 14 | 467 regiments; 103 batteries (95 + 8 horse); 93 brigades; 31 divisions; 11 corps; 11 battalions; 12 artillery brigades; 42 successions | 9,295 | 313,804 | 15 distinct regiment fields |
| `placements_*` | 9 | 694 rows | 5,416 | 126,698 | 152 unique unit IDs |
| `density_*` | 38 | 1,110 rows | 8,637 | 221,468 | 412 unique unit IDs; union with placements = 478 |
| `chronology_day1-3` | 3 | 137 events (42/49/46) | 1,104 | 62,123 | fields: event, flag(66), narrative(25), location, significance, tick, time, units_involved |
| `vignettes_part1-3` | 3 | 24 vignettes (8+8+8) | 265 | 60,583 | 249 paragraphs (`\n\n`), 7,182 script words |
| `terrain.json` | 1 | 30 key locations + 8 roads + 8 structures + 4 features = 50 | 358 | 13,470 | roads have one point each, no geometry |
| `casualty_apportionment.json` | 1 | 12 corps, 23 engagement periods, 4 "notable" notes | 276 | 11,681 | consumed only by dashboard + living-ledger |
| `placement_schema.json` | 1 | schema + 5 samples | 279 | 12,323 | prose, not machine-enforceable |
| `monuments.json` | 1 | 9 | 55 | 2,554 | overlay only |
| **Total** | **71** | **≈ 1,030 content records (728 unique OOB entities + 42 successions + 137 events + 24 vignettes + 50 terrain + 34 casualty rows + 9 monuments) + 1,804 placement rows** | **25,685** | **824,704 (160,243 gzip-9)** | **242 distinct key names**, 70,723 words in string values |

Embedded in the JS bundle (not in `data/`): **512 monuments** (`:104440`, 6,915 words), **16 tour stops** (`:104096`, 48 paragraphs, 2,031 words), **5 tutorial steps** (`Gc`, `:111819`), **8 timeline markers** (`TO`, `:112192`), road polylines (`x4`, `:9450`), Help/About text with counts (`helpmodal-cfv9t0zh.js`).

### 2.2 Historian corpus (as built by `historian.html:64-141`) versus what exists

| Kind | Entries indexed | Text the *ranker* sees | Text the *answer* shows | Available but unused |
|---|---:|---|---|---|
| regiment | 467 | 8,417 words (`designation state commander key_action id`) | designation, state, commander, strength, casualties, `key_action` (3,380 words) | `days_engaged`, `flag_notes`, `successor` chain, brigade/division names |
| vignette | 24 | 1,599 words (title + location + panel_summary) | 7,182-word `full_script` as one string (paragraph breaks dropped by `innerHTML`) | `units_featured`, coordinates |
| chronology | 137 | **419 words (location only)** — `e.title`/`e.description` do not exist (`historian.html:119`) | **"undefined"** (`:123`) | `event` 4,226 w, `narrative` 565 w, `significance`, `units_involved` |
| terrain | 30 | 653 words | name + elevation + significance | 20 roads/structures/features (315 w), coordinates |
| **Total indexed** | **658** | **11,088 words** | | |
| Not indexed at all | — | — | — | 103 batteries (2,186 w), 93 brigades (3,107 w), 42 successions (856 w), 1,245 placement notes (12,081 w), 512 monuments (6,915 w), 16 tour stops (2,031 w), 31 divisions/corps records, 12 casualty notes |

Search (`search.html:69-140`) builds 467 + 24 + 30 = **521** entries (matches the console line) but its `<meta>`/OG text says "Search every regiment, **battery**, vignette …" (`search.html:8`): 0 batteries are indexed except the misfiled `C-McClanahan-ART`.

Ceiling of the current corpus: **≈ 45,096 narrative words** in the whole data lake (regiment key_action 3,380 + vignettes 8,781 + chronology 4,791 + terrain 968 + batteries 2,186 + brigades 3,107 + successions 856 + placement notes 12,081 + monuments 6,915 + tour 2,031). That is well under one short book; a "greatly expanded" Historian therefore needs new source material, not just re-indexing (see DI-27).

### 2.3 Which fields does any UI actually read? (dead-field census)

Read by UI: placement `notes` (`bundle.pretty.js:97611,101075,102216,103277`), `disposition`, `strength`, regiment `key_action` (`:98014`), `casualty_percentage` (`:98065`), vignette `panel_summary`/`full_script` (`:98393-98396`), chronology `significance`/`narrative` (`:98612,98643`), successions (`:97542-97558`).
**Never read anywhere in the site code:** chronology `units_involved` (299 refs) and `flag` (72 strings with internal IDs), `flag_notes` (60), OOB `days_engaged` in the map (used only by `regiment.html:203`, `report.html:107`), `alias_for`, `metadata.*` (35 KB), `placement_schema.json` (12 KB), `vignette_trigger` (7 rows; the app keys vignettes by `trigger_tick`, `bundle.pretty.js:96923-96935`). ≈ 18 KB of dev-only keys (`flag`, `flag_notes`, `data_correction`, `chunk`, `supplements_file`) + 35 KB of metadata ship to every visitor.

---

## 3. Quantified defect catalogue

### 3.1 Schema conformance and schema drift (`s01_schema.py`)

Checked all 1,804 rows against `placement_schema.json` required fields, types, enums, ranges (schema lat 39.770–39.850, lng −77.290…−77.180; identical to `terrain.json:battlefield_bounds`).

| Rule | Violations | Detail / example |
|---|---:|---|
| required fields present, types int/float | 0 | all rows have unit_id, tick, lat, lng, bearing, disposition, strength |
| `disposition` ∈ 11-value enum | 0 | distribution: Line of Battle 759, Charging Line 266, Chaotic Retreat 174, Deployed Artillery 150, Line of March 133, Bivouac 132, Skirmish Line 69, Reserve 58, Mounted Cav 29, Limbered Art 21, Dismounted Cav 13 |
| `bearing` 0–359 int | 0 | |
| `tick` 1–675 | 0 | |
| `strength` ≥ 10 (min display) | 0 | |
| lat/lng within schema range | **49 rows** (42 lng < −77.29; 7 lat > 39.85) | all ticks 1–12 (+3 at t180, 1 at t600): Confederate units approaching from Cashtown/west and Ewell from the north, e.g. `C-III-2-3` lng −77.3089 (t1), `C-II-3-3` lat 39.8572 (t1). Schema is self-contradictory: its own `coverage_gaps.before_engagement` says off-map staging is expected. |
| lat/lng ≥ 4 decimals ("precision: 4 decimal places minimum") | **379 rows** (181 lat, 210 lng) | e.g. `U-I-3-1` t120 lat `39.82`; `U-XII-2-2` t120 lng `-77.22` — i.e. ~500 m grid snapping while `placement_principles.coordinate_accuracy` claims 5–15 m |
| tick within the file's own `metadata.tick_range` | 0 rows outside, but ranges are loose | `placements_day1_ticks101_225`: declared 101–225, actual 120–225 (5 distinct ticks); `…ticks601_675`: declared 601–675, actual 620–675 (3 ticks); `…ticks451_520`: declared →520, actual →516 |
| `record_count` header matches | **1 header present, wrong** | `placements_day1_ticks1_50.json:7` `"record_count": 4890` vs 100 actual (48.9×) |
| file list in schema matches deployed files | **fail** | schema lists 4 day-1 files (`…ticks101_150`, `…ticks151_225`); deploy has 3 (`…ticks101_225`) plus 38 undocumented `density_*` files |
| "expected_units_per_tick: 600-700" | **fail** | max rows at any tick = 87 (t120), tick 1 = 73, median keyframe tick = 4 rows |
| "total_placement_records ≈ 430,000" | **fail** | 1,804 |
| `ticks_per_day.*.real_time` consistent with 5 min/tick × 225 | **fail** | day1 "…to 12:40am July 2" (formula gives 11:40pm July 1); day2 "…to 7:50pm" (11:40pm); day3 "…to 8:05pm" (11:40pm) — see time-facts.md:71 |
| duplicate `(unit_id, tick)` rows | **103 keys / 117 redundant rows; 68 keys with conflicting values** (77 conflicting overrides) | e.g. `C-III-3-2` t120: main file `Line of Battle 39.8211,-77.2461 str 1326` vs `density_day1_seminary` `Charging Line 39.8317,-77.2533 str 1100`. The app loads placements then density (`bundle.pretty.js:96900-96915`) and `y1` is last-writer-wins, so the density row silently overrides. CSV: `dup_conflicts.csv` |
| stacked units (same tick, identical lat/lng, different units) | 48 groups / 96 units | e.g. `U-II-2-2` and `U-71PA` both at `39.8117,-77.235` t120 |

Schema hygiene: `placement_schema.json` is prose with no `$schema`, `additionalProperties`, or enum arrays a validator can consume, and is **not fetched by any page** (12 KB shipped for nothing). Its rendering-rules colors (e.g. Charging Line union `#0044cc`) differ from the colors the app actually uses (`Lp` map, `bundle.pretty.js:96307-96320`: Charging Line `#ff4422`), i.e. the schema is documentation that has drifted from code.

### 3.2 Tick coverage and how the renderer turns it into "ghost units" (`s03_ticks.py`, `s12_render_sim.py`)

| Metric | Day 1 (1–225) | Day 2 (226–450) | Day 3 (451–675) | All |
|---|---:|---:|---:|---:|
| ticks with ≥1 keyframe row | 59 (26 %) | 72 (32 %) | 57 (25 %) | **188 (27.9 %)** |
| ticks with zero rows | 166 | 153 | 168 | **487 (72.1 %)** |
| largest gap between keyframe ticks | 30 (t150→180) | 20 | 15 | 30 |
| busiest tick | t120 (87 rows) | t400 (51) | t620 (61) | |

Per-unit density: 478 unit IDs; **173 units have exactly one keyframe** (they hold that point until the end), 78 have two, median 3 (main) / 2 (density); segments between consecutive keyframes of the same unit: median gap **17 ticks**, mean 50, p90 138, max 658; **206 segments ≥100 ticks**.

What the deployed renderer does with it (`bundle.pretty.js:96238-96305`): `y1(placementsByTick, f, x)` reads records at tick *f* and *f+1* only; any unit not present at *f* is drawn from the module-level cache `i2` (last record seen); `i2` is never reset (only 3 references, all inside `y1`). Consequences, all computed from the data:

| Tick | Units drawn (sequential play) | of which stale >100 ticks | Units with an exact keyframe at that tick |
|---:|---:|---:|---:|
| 1 | 71 | 0 | 71 |
| 100 | 187 | 0 | 10 |
| 225 | 261 | 194 | 11 |
| 300 | 349 | 209 | 12 |
| 450 | 421 | 328 | 13 |
| 550 | 451 | 325 | 3 |
| 675 | 478 | 404 | 21 |

- Real keyframes = 1,687 of 225,276 displayed unit-ticks = **0.75 %**.
- A cold seek (deep link, day jump before the units were ever "seen") on any of the 487 empty ticks would show **0 units**; **610 of 675 ticks show <10 units** when the cache is empty.
- Units never depart: 409 of 478 units have their last keyframe ≤ tick 600 and are frozen for 75+ ticks; 153 last appear on Day 1. There is no `appear_tick`/`depart_tick` semantics: units pop in at their first keyframe (71 drawn at t1, 79 by t12, 87 by t25, 187 by t100, 261 by t200, 451 by t550, 478 by t650).
- Scrubbing backwards leaves later positions on screen (cache is not time-aware).

Unit **position plausibility** between consecutive keyframes (`s04_teleports.py`, 1,209 segments; haversine, mph = m / 1609.344 / (Δticks·5/60)):

| Band | Segments |
|---|---:|
| 0 mph (identical position) | 272 (136 of them across gaps ≥30 ticks) |
| 0.001–3 mph | 902 |
| 3–6 mph | 30 |
| 6–10 mph | 3 (`C-I-3-3` t550→551 929 m = 6.9 mph; `C-I-3-1` t548→549 6.5; `U-20ME` t264→265 6.1) |
| 10–20 mph | 2 (`U-8NY-CAV` t3→4 **2,374 m in 5 min = 17.7 mph** skirmish line; `U-I-2-2` t52→53 **1,467 m = 10.9 mph**, two different entities under one ID) |
| >20 mph | 0 |

So *speed* is rarely impossible — the defect is the opposite: 351 "moving" segments (>250 m) have >10-tick gaps, 217 have >30, 162 have >60; **704 km of total displacement occurs as snaps** (dt>1). Worst: `U-CAV-2-3` t200→t400 5,682 m in one hold-then-snap; `U-XI-3-2` (Schimmelfennig) t1→t50 5,523 m, Line of March frozen for 49 ticks. Tick-1 layout is schematic: **59 of 73 tick-1 rows share one of 7 identical longitudes** (−77.31 ×9, −77.3089 ×8, −77.2756 ×17, −77.2356 ×16 …) in N–S columns — a placeholder grid, not GPS-cross-referenced positions as the schema claims. (`s03`, `s13`.)

### 3.3 Coordinates versus the world the site itself defines (`s13_monuments.py`, cavalry cross-check)

- **East Cavalry Field is outside the schema/terrain bbox and mis-located by ~2.7 km.** 26 of the site's own 512 monuments lie east of −77.18 (e.g. "Hampton's Brigade Tablet" 39.8365,−77.168833; "Stuart's Cavalry Division Tablet" 39.835033,−77.1701; centroid 39.8282,−77.1677). `terrain.json` LOC-021 "East Cavalry Field" is 39.8317,−77.1972 and Custer/Hampton placements at t560–565 sit at lng −77.1983…−77.2033 = **2.7–3.0 km west** of those tablets; V-020's trigger is 2.5 km off. The bbox (east −77.18) excludes the whole real field. *(Independent positional truth of the tablets was not verified; the contradiction is between the site's own datasets.)*
- 28 monuments outside bbox in total; 13 identical coordinate pairs among the 512; 28 duplicate names (may be legitimate multi-marker units).
- Terrain duplicates: LOC-023 "Evergreen Cemetery gatehouse" is 26 m from LOC-001 "Cemetery Hill"; four location/structure pairs have identical coordinates (Trostle Farm LOC-008/STR-003, Rose Woods LOC-027/Rose Farm STR-004, Codori Farm LOC-024/STR-005, Lutheran Seminary LOC-022/STR-007) plus the Cemetery Hill/gatehouse near-pair → duplicate concepts in the data (only `key_locations` are searchable, so the Search/Historian duplicate is the 26 m pair). LOC-029 is spelled "**Gulp's** Hill saddle". STR-006 is "Brian Farm (Bryan Farm)". Roads (`terrain.json` `roads[]`) have a single `lat_approx/lng_approx` point each; road polylines are separately hard-coded in the bundle (`:9450`, 6-point straight lines) and disagree in kind and position.

### 3.4 ID integrity (`s02_ids.py`, `s10_refs.py`, `s11_crosswalk.py`, `s15_semantic.py`, `s10` successions block)

**Placement IDs vs OOB** (728 unique OOB IDs; 478 placed IDs):

| Outcome | IDs | Rows |
|---|---:|---:|
| resolves to an OOB record | 383 (217 regiments, 89 brigades, 28 divisions, 6 corps, 33 batteries, 5 horse batteries, 5 battalions) | 1,588 |
| **does not resolve** | **95** | **216 (12.0 %)** |

The 95 unresolved IDs fall in identifiable families (crosswalk seed: `crosswalk_seed.csv`; proposals: 12 high, 17 medium, 44 low, 22 none):
1. **Side-prefix errors (10 IDs, high confidence):** `U-15AL`, `U-44AL`, `U-48AL`, `U-1TX`, `U-4TX`, `U-5TX`, `U-11NC`, `U-26NC`, `U-47NC`, `U-52NC` → `C-…` twins (all 10 twins exist in the OOB and are placed elsewhere, so each regiment exists **twice**, once in blue at tick 95/150 frozen for the rest of the battle). Note `U-26NC` even carries the note "26th NC survivors — 588 casualties from 843".
2. **Brigade-prefixed regiment IDs (`U-I-1-19IN`, `-24MI`, `-2W`, `-6W`, `-7W`, `C-I-1-7`, `-1-8`, `-2-5`) and suffix variants (`C-12NC-IV`, `C-2MS-D`, `C-13MS-B`, `C-2NC-SW`, …).**
3. **A second brigade/division numbering scheme in the density files:** `C-II-4` (Johnson's division; OOB Johnson = `C-II-2`), `C-II-4-1/2/3` (Steuart/Jones/Nicholls; OOB `C-II-2-4/2-2/2-3`), `C-III-4` (Pender; OOB `C-III-3`), `C-III-4-2/3/4` (Posey/Wright/Mahone; OOB `C-III-1-4/1-3/1-5`), `C-I-5-1/5-2` (Wilcox/Lang; OOB `C-III-1-1/1-2`), `U-I-2-3/2-4` (Paul/Cutler; OOB `U-I-2-1/1-2`), `U-1-I-3`, `U-2-I`, `C-CAV-2-1…2-4`, `U-CAV-2-G/2-M`.
4. **VI Corps:** `U-VI-1-1 … U-VI-3-3` (8 IDs, placed at t180) — the OOB has regiments and divisions for VI Corps but no brigades.
5. **Battery/battalion nicknames:** `C-ART-Alexander/Cabell/Dearing/Eshleman/Henry/McIntosh/Pegram-III/Pegram-bn`, `U-ART-McGilvery/Osborn/RES/1PA-L/K4US`, `U-XI-2-3` (a brigade-style ID used for "Wiedrich's Battery I and Ricketts's batteries", disposition Deployed Artillery).

**Same ID, different formation (28 IDs, 44 rows; `semantic_id_conflicts.csv`).** Examples verified by hand:
- `U-V-3-1` = OOB "First Brigade, Third Division, Fifth Corps (McCandless)" but t264/266/268/272 notes: "Vincent's brigade at the double-quick…/holding the crest…" (Vincent = `U-V-1-3`).
- `U-II-2-3` = Hall's brigade; t308/312/320/554 notes: "Webb's brigade…" (Webb = `U-II-2-2`); `U-II-3-1` = Carroll's brigade but t551 note "Hall's brigade hitting Armistead" and t75/80 rows of strength **12,500** "Hancock arriving from Taneytown" (975 → 12,500 → 975 → 780 under one ID).
- `C-III-2-1` = Pettigrew's brigade; t4/16/20 notes: "Archer's brigade" (Archer = `C-III-2-3`); `C-II-1-1` (Hays) t55/68 "Gordon's brigade" (Gordon = `C-II-1-3`); `C-II-1-4` (Smith) t55 "Hoke's brigade"; `C-II-1-3` (Gordon) t55/60 "Smith's brigade" and t324/327 "Avery's brigade"; `U-CAV-1` = Buford (4,500 → 3,200) *and* "Gregg's division" (8,000/3,200); `U-VI-1` = 7,500 or 15,000 ("Sedgwick's VI Corps").
- 42 of the 44 flagged rows name a formation that exists in the OOB under a different ID.
User impact: the unit panel resolves the *ID* to the OOB record (designation/commander) but prints the *row's* note → "First Brigade … (McCandless)" beside "Vincent's brigade holds the crest".

**Other reference checks**
- Chronology `units_involved`: 299 refs; 5 unresolved (`C-CAV` ×3, `U-ART-RES` ×2); 13/137 events have an empty list; the field is never read by any UI (§2.3).
- Commander successions (42): 1 unresolved (`CS-016` → `C-CAV`); **15/42** events are not reflected in the OOB commander chain of the unit they name, mostly because the *unit_id is wrong for the person*: `US-010` Gibbon→Harrow keyed to `U-II-1` (Caldwell's division) but Gibbon led `U-II-2`; `US-013/014` (1st Minnesota's Colvill→Messick→Coates) keyed to `U-II-2-1` (Harrow's brigade) instead of `U-1MN`; `US-018` (124th NY's Ellis) keyed to `U-III-1-1`; `US-025` (Mudge→Morse) keyed to `U-XII-1-3`.
- Vignettes: all 47 `units_featured` resolve; 8 are never mentioned in the vignette's own text; 7 vignettes have no featured-unit keyframe within ±1 tick of `trigger_tick` (V-001, V-007, V-015, V-017, V-019, V-023, V-024); V-024 has `units_featured: []`; **duplicate `trigger_tick` 556** (V-019 "Pickett's Return" and V-023 "Lee Meets His Men" tell the same event with overlapping quotations, V-023 also says "That night"); IDs are not chronological (V-007 t248 precedes V-008 t240; V-015 t525 precedes V-017 t518, V-022 t460 sits after V-021 t568); `vignette_trigger` is used by 7 placement rows, so 19/24 vignettes are never referenced from placements (harmless only because the app keys by tick).

### 3.5 OOB structure and completeness (`s06_oob_math.py`, `s08_rollups.py`)

**Counts**

| Claim | Where | Measured |
|---|---|---|
| "467 regiments and batteries" | `index.html:15,18,24,32,719,754`, `manifest.json`, `find-ancestor.html:48,105` | 467 **regiment records** = Union 274 (238 inf + 36 cav) + Confederate 193 (172 inf + 20 cav + 1 misfiled horse battery `C-McClanahan-ART`; arm inferred from ID tokens); 103 batteries are separate; alias `U-14BK` (strength 0) is one of the 467; 29 rows carry alias/detachment/battalion markers. Records = 570. |
| "445+ units" | `assets/helpmodal-cfv9t0zh.js` | 467 − 22 (the Confederate cavalry file) = 445 exactly |
| "24 vignettes, 137 events, 30 terrain features" | `historian.html:48` | correct only if "terrain features" means `key_locations`; the file has 50 terrain entries |
| "20 Extra Features" | site-nav (20 links) vs SEO block | `index.html:722-740` lists 18 (omits `report.html`, `cinematic-export.html`) |
| Union brigades "All 49 infantry brigades plus cavalry" | `union_oob_brigades.json` metadata.notes | 51 brigade records = 43 infantry + 8 cavalry; **8 VI Corps brigades absent** (43 + 8 = 51 infantry, not 49) |
| Artillery totals | `confederate_artillery.json` metadata `total_guns_approximately: 283`; `union_artillery.json` note "approximately 370 including horse" | Σ `gun_count`: Confederate battery file 182 (45 batteries); Union 278 + 28 horse = 306 |

**Roll-ups (nothing adds up).** Regiment→brigade: 88 brigades with regiments; `brigade.strength == Σ regiments` in 9; within 5 % in 62; >10 % off in 17 (worst `U-I-3-2` 1,899 vs 1,265; `U-XII-1-2` 1,818 vs 1,234; `U-V-3-2` 1,048 vs 1,467); casualties equal in 36, >10 % off in 34. Brigade→division: **22/22 Union and 9/9 Confederate divisions mismatch** on strength and/or casualties (e.g. `U-V-1` 4,188 vs Σ brigades 3,414; `U-I-3` casualties 2,140 vs 1,941). Division→corps: 7/8 Union and 3/3 Confederate corps mismatch (e.g. `U-I` 12,222 vs Σ divisions 11,643; `C-III` casualties 8,000 vs 8,900).

| Level | Union | Confederate |
|---|---:|---:|
| Σ regiment strength / casualties | 82,864 / 20,123 | 62,807 / 21,859 |
| Σ corps (OOB) strength / casualties | 90,164 / 22,803 | 65,000 / 21,500 |
| Army header (OOB) | 93,921 / 23,049 (24.5 %) | **75,000 / 28,000 (37.3 %)** |
| `casualty_apportionment` Σ initial / Σ `total_casualties` / Σ periods | 90,164 / 22,803 / **23,138** | **72,810** / 23,125 / **23,025** |
| Reference (see §1) | engaged 93,921; 23,049 (OR) / 23,055 (B&M) | engaged 71,699 (B&M) / 75,000 (McPherson); 23,231 (B&M) / ≤28,000 |

The "37.3 % vs 24.5 %" contrast is produced by dividing the *upper-bound* Confederate estimate (28,000) by the *campaign-start* strength (75,000) while the Union figure uses engaged strength and the OR total; on B&M's own basis it is 23,231 / 71,699 = **32.4 %** vs 23,055 / 93,921 = **24.5 %**.

**Field completeness (467 regiments)**

| Field | Missing/empty | Notes |
|---|---:|---|
| `casualty_percentage` | 222 (47.5 %) | derivable from `casualties/strength` (0 existing values disagree beyond 0.15) — VI/XI/XII file 55/88, Confederate 2nd corps 47/62, Confederate cavalry 22/22, Union cavalry 33/37 |
| `commander` | 27 | 22 Confederate cavalry (all), 4 Union cavalry detachments, the alias → search prints "Commander unrecorded" |
| `parent_corps_id` | 22 | all Confederate cavalry → `report.html:101` prints "**undefined / C-CAV-1**" |
| `days_engaged` | 37 empty (32 in VI/XI/XII; 4 with casualties >0) | |
| `state` non-state values | "Regular Army" ×15, "Multi-state" ×1 | |
| `key_action` < 40 chars | 169 | 20× the literal "Army reserve."; "Wofford's brigade." ×4 |
| `flag_notes` | 31 regiments + 16 batteries | dev strings, e.g. `U-11PA-R`: "DATA NOTE: This is the correct V Corps slot. U-105PA belongs exclusively to…" |
| `strength` = 0 | 1 (`U-14BK`) | |

**Aliases, duplicates and suspects that leak into Search/Historian/Ancestor lists** (`search.html:112`, `historian.html:64-100`):
- `U-14BK` "14th Brooklyn (alias for U-84NY)" — **ranks #1** for "14th brooklyn" (score 90 vs 60 for the real 84th NY, `s06`), shows "New York · Commander unrecorded ·".
- `U-11PA` (Paul's brigade, 135 men) **and** `U-11PA-B` "Baxter detachment" (Baxter's brigade, 200 men, fate "See U-11PA" — a dangling cross-ref) are two records for one regiment; `U-11PA-R` (Reserves, 327) and `U-11PA-R-F` "detachment (Fisher's brigade)" — a "small detachment … for Big Round Top occupation" I could not corroborate (*needs historian verification*); a "11th pennsylvania" search returns 5 rows.
- `U-107NY` sits in I Corps Paul's brigade (122 men) **and** `U-107NY-XII` in XII Corps (319 men); the I Corps slot is very likely the 107th **Pennsylvania** (a placement row `U-107PA` exists, unresolved) — *needs verification against B&M*.
- Four Union cavalry "…-b" detachments (55–95 men, no commander), 3rd Indiana Cavalry "(6 companies only)", 5 battalion halves (`U-3US-1/2`, `U-12US-1/2`, …), `C-McClanahan-ART` (a battery in a regiments array).
- 222 of 467 result rows render a trailing " · " (missing casualty %), 27 render "Commander unrecorded".

### 3.6 Casualty and strength mathematics (`s09_casualty.py`, `s05_strength.py`)

`casualty_apportionment.json` vs OOB corps vs published:

| Corps | apportion. initial | OOB strength | apportion. total | OOB casualties | **Σ periods** | overall_rate (file / calc) |
|---|---:|---:|---:|---:|---:|---|
| U-I | 12,222 | 12,222 | 6,059 | 6,059 | **6,394** (+335) | 49.6 / 49.6 (periods 52.3) |
| U-II | 11,347 | 11,347 | 4,369 | 4,369 | 4,369 | 38.5 |
| U-III | 10,675 | 10,675 | 4,211 | 4,211 | 4,211 | 39.4 |
| U-V | 10,907 | 10,907 | 2,187 | 2,187 | 2,187 | 20.1 |
| U-VI | 13,596 | 13,596 | 242 | 242 | 242 | 1.8 |
| U-XI | 9,188 | 9,188 | 3,801 | 3,801 | 3,801 | 41.4 |
| U-XII | 9,788 | 9,788 | 1,082 | 1,082 | 1,082 | 11.1 |
| U-CAV | 12,441 | 12,441 | 852 | 852 | 852 | 6.9 / 6.8 |
| C-I | **20,706** | **22,000** | 7,539 | **7,500** | 7,539 | 36.4 |
| C-II | **20,568** | **21,000** | 6,603 | **6,000** | 6,603 | 32.1 |
| C-III | 22,000 | 22,000 | 8,400 | **8,000** | 8,400 | 38.2 |
| C-CAV | 9,536 | — (not in OOB corps list) | 583 | — | **483** (−100) | 6.1 (periods 5.1) |
| **Σ** | U 90,164 / C 72,810 | U 90,164 / C 65,000 | U 22,803 / C 23,125 | U 22,803 / C 21,500 | **U 23,138 / C 23,025** | |

- The dashboard chooses Σ periods (23,138 / 23,025) and flags 2 corps (`dashboard.html:136-137,257-262`) — the footnote itself says the source "should be reconciled". The Confederate corps in the *OOB* and in the *apportionment* disagree with each other for all three infantry corps (strength and casualties), so neither is authoritative.
- Internal contradiction: `casualty_apportionment.json:227` says "Pickett's division alone suffered ~2,700 casualties" but C-I's whole Day-3 casualty entry is 2,614 (`:222`); `notable_intensity_notes.most_compressed_confederate` repeats "approximately 2,700".
- Wording bug: `highest_single_regiment_rate` notes read "1st Minnesota — **224 of 262 casualties** in 15 minutes" and "26th North Carolina — **588 of 843 casualties**" (it is 224 casualties of 262 engaged; 588 of 843 engaged). And "highest Confederate rate = C-26NC 69.7 %" is contradicted by the site's own OOB: C-8VA 148/193 = 76.7 %, C-38NC-S 75.6 %, C-9VA 75.5 % (26th NC has the highest *count*, 588).
- "51,000" appears in `helpmodal-cfv9t0zh.js` (dedication), `chronology_day3.json` t650, `vignettes_part1.json` (panel + script), `vignettes_part3.json` (panel + script) and `chronology_day3.json` says "Union ~23,000, Confederate ~28,000". Wikipedia (citing the same books) states "between 46,000 and 51,000"; the site's own dashboard sums to 46,163.
- Living Ledger (`living-ledger.html:102-118`, linear at `:111`) spreads each period **linearly**; the Dashboard (`dashboard.html:98-118`) uses a piecewise "70 % at peak" curve; the JSON claims a **bell curve σ=8/4 ticks** (`casualty_apportionment.json:10-11`); none is implemented as documented, and the animation uses none of them. Ledger shows **4 casualties at tick 1** because `U-CAV` day-1 period starts at tick 1 (290/74 ≈ 3.9 per tick) while the first shot is t12 (V-001).

**Placement `strength` (`s05_strength.py`)**: first-keyframe strength equals OOB strength for 221 matched units and differs for 153 (109 regiments, 26 divisions, 7 brigades, 6 corps, 5 batteries). **121 increases between consecutive keyframes across 82 units** (largest: `U-II-3-1` 975→12,500; `U-VI-1` 7,500→15,000; `U-CAV-1` 3,200→8,000; `C-III-3-1` 1,734→6,300 — all ID collisions from §3.4, not reinforcements); **74 units exceed OOB strength by >2 %**; only **88 of 302** units with OOB strength+casualties end within 5 % of `strength − casualties`; **126 units with casualties >10 % of strength keep one constant strength across all keyframes** (e.g. `U-III-1-1` 2,188 with 781 casualties; `U-84NY` 318 with 135). 19 rows use battalion-level IDs (`C-ART-I-1/2/4`, `C-ART-III-2/3`) with a single `strength` of 320–400 for what the OOB models as 4–5 separate batteries, and 15 more rows use unresolved battalion nicknames (`C-ART-Cabell`, `C-ART-Dearing`, …).

### 3.7 Time consistency at the data level (owner of anchors: time-facts)

| Check | Result |
|---|---|
| chronology `time` label equals the file's own `tick_formula` (tick 1 = 5:00am, 5 min/tick) | **94 of 137 fail** (e.g. t12 label "6:00am" vs formula 5:55; t17 "6:25am" vs 6:20; drift grows to hours); 4 label formats (`9:99am`, `99:99pm`, `9:99am July 9`, …) |
| commander_successions `approx_time` vs `approx_tick` (formula clock) | **0 of 37** parseable within 30 min; mean +5.07 h (min +1.67, max +7.5); 5 rows carry non-clock text ("July 1 evening") |
| V-023 "That night, Lee found Imboden waiting" | trigger tick 556 (=1:45pm data clock), same tick as V-019 |
| clock functions | ≥6 divergent implementations (time-facts.md §0 item 1): `getTickTime` (`bundle.pretty.js:9371`: Day 1 base 6:00, Days 2–3 base 4:00, day-of-month `P`), Compare/Living-Ledger (5:00 base) etc. |
| timeline marker `TO` (`bundle.pretty.js:112192`) "First shot" at **tick 17** vs V-001 "The First Shot" at **tick 12** and chronology t17 = Calef's first artillery fire | contradictory embedded labels |
| vignette clocks vs cues (regex + manual read) | **11 of 24** vignettes contradict their own tick's data-clock by ≥60 min or by a part-of-day cue: V-001 ("7:30am" at 5:55am), V-002 ("10:15am" at 7:15am), V-007 ("afternoon" at 6:50am), V-009/V-010 ("afternoon" at 8:25/9:05am), V-013/V-014 ("dusk" at 12:25/1:20pm), V-017 ("1:00pm" at 10:35am), V-022 ("7:30 in the morning" at 5:45am), V-023 ("evening/night" at 1:45pm), V-024 ("afternoon" at 11:40pm); the *real* times are in `time-facts-otherclaims.csv` |

### 3.8 Text quality (`s14_text.py`, `s17_typos.py`)

| Defect | Count | Where |
|---|---:|---|
| `" -- "` used as em-dash in user-facing strings | **1,591** (placement notes 839, regiment `key_action` 353, `commander.fate` 48, brigade 69, battery 70, chronology event 62, narrative 10, vignette panel 20, script 119) vs 38 real `—` | everywhere |
| internal IDs in prose (`US-001`, `CS-011` "Commander succession US-001 activates.") | 76 matches / 72 strings (chronology `flag`) + a placement note "…sabre cut. **CS-017**." (C-CAV-1 t565) | `chronology_day1-3.json`, `density_day3_cavalry.json` |
| dev notes | 60 `flag_notes` keys ("DATA NOTE …"; 31 regiments, 16 batteries, 13 brigades/other), `data_correction` "Fix tracked", `metadata.chunk` 001–049 (staged-authoring numbering; the pipeline is in neither zip) | oob/*, metadata |
| typos / variants | `Krzyznowski` (×1 vs `Krzyzanowski` ×10) `density_day2_cemhill.json`; `Nichols's` (×1 in `density_day2_culpshill_overnight.json`; correct `Nicholls` ×10); `Gulp's Hill saddle` (`terrain.json` LOC-029); `Brian Farm (Bryan Farm)`; `Rose Woods` ×19 / `Rose's Woods` ×4 / `Rose Farm` | data |
| name formats | designations use Arabic ordinals for regiments ("1st Minnesota"), spelled-out ordinals for brigades/divisions ("First Brigade, Second Division, First Corps"), Roman numerals in IDs (`U-I`), UI prints raw IDs (`historian.html:94`, `find-ancestor.html:121`, `regiment.html:199`, `report.html:101`); 79 distinct designation shapes; abbreviated given name "Jos. Sudsburg" (`U-3MD`) | oob |
| paragraph structure lost | 249 `\n\n` paragraph breaks in vignettes are dropped by `innerHTML` in the Historian (`historian.html:109`) | |
| near-duplicate content | V-019/V-023 share a quotation and event | vignettes |
| exact-repeat filler | "Army reserve." ×20, "Wofford's brigade." ×4, "Carr's brigade -- Emmitsburg Road." ×3 … | oob |

Ordinal suffixes are all correct (0 violations); no mojibake; 2 non-ASCII characters in total (`—`, `–`) — i.e. the data is ASCII-clean, which makes a build-time typographic pass trivial.

### 3.9 Historian/search *contract* defects (data ↔ code) (`s07_historian_sim.js`)

Port of `historian.html` run over the real data (658 entries). Measured behaviour:

| Query | Result | Problem |
|---|---|---|
| "Meade" | 1 hit: `chronology t400 … Meade's Headquarters (Leister House): undefined` | Meade appears only in OOB `army_commander` (not indexed) |
| "Lincoln", "Jennie Wade" | 0 hits | 512-monument set (incl. Jennie Wade Memorial) and Address text not indexed |
| "Longstreet" | 2 hits (a Sickles vignette; 1st US Sharpshooters) | corps commander lives in `oob/*_corps_*.json`, not indexed |
| "Devil's Den" | 3 hits incl. `chronology t260 … : undefined` | chronology returns "undefined" for **137/137** |
| "why did Lee lose the war" | V-023, V-019, V-003 ("Archer Captured") | keyword OR-scoring, no semantic retrieval |
| "How many casualties were there?" | V-001, V-008, V-022 | no numeric/structured answering; `casualty_apportionment` not connected |
| "Stonewall Jackson" | `U-11PA-R` (commander "Samuel Jackson") and the Stonewall Brigade | no entity disambiguation |
| "Who commanded the Union army?" | Reynolds vignette, 20th Maine, Cemetery Hill | no OOB army/corps entries |

Search scoring (`search.html:78-92`): for a 3-letter query like "lee", **399 of 467** regiment rows match through the subsequence fallback (score 20) and only 1 by substring — noise dominates once the exact hits are exhausted.

### 3.10 Provenance and licensing surface

- Only 17 of 71 files declare `metadata.sources` (29 distinct citations; **no pages, no edition, no locators**; "Pfanz trilogy" ×2; "Google Maps / satellite imagery verification"). All 38 `density_*` and 9 `placements_*` files (the entire positional data) declare none.
- Per-record source: **42/42 succession rows** ("Pfanz First Day p.65", "Hessler-Motts p.210" …), **9/9** rows of `monuments.json` ("Wikipedia: …", "Stone Sentinels: …"), **9/512** bundled monuments; every other record 0.
- Busey & Martin is cited as "(Longstreet House, 1994)" in 11 files while the figures the site reproduces per regiment (strength, casualties) are the book's table content — a rights/attribution question (§10).
- `placement_schema.json` asserts "GPS accuracy to nearest 5–10 meters … cross-referenced against Gottfried maps" for positions that are demonstrably rounded (379 rows) or schematic (59/73 tick-1 rows).

### 3.11 Deep-link contract (data-generated links that nothing reads)

`search.html:114,127,139` generate `/index.html?unit=<id>`, `?tick=<n>&vignette=<id>`, `?lat=…&lng=…` and `historian.html:110` generates `/?tick=<n>&vignette=<id>` (its regiment links go to `regiment.html?unit=`, which *is* read, `regiment.html:252`); the Bookmarks share link generator (`bundle.pretty.js:97823-97829`) writes `?t=&u=&z=&ll=`. The only query parameter the app reads is `ancestor` (`:101019`; `regiment.html:252` and `embed.html:41` read their own). So **all 521 search results, all Historian vignette answers ("See this moment on the map") and every copied share link open the default state (tick 1)**. (No app-side reader exists in `index.html` either.)

---

## 4. Root causes (why the data is in this state)

1. **No source of truth and no build.** The deployed JSON *is* the only copy (N1); it was authored in numbered "chunks" (metadata.chunk 001–049) with no schema enforcement, no validator, no CI, no repo. Every consumer re-implements parsing (historian, search, dashboard, ledger, app), so field-name drift (`title/description` vs `event`; `unit/note` vs nested) goes unnoticed.
2. **Two authoring namespaces.** Main `placements_*` follow the OOB ID grammar; `density_*` passes ("Data Density Pass 1–3", `density_day2_lrt.json` chunk 049) invented shorthand IDs and a different brigade numbering. Nothing reconciles them; the renderer merges by string equality.
3. **Placement model is "few hand-authored keyframes" but the schema/UI promise "every unit at every tick".** No interpolation/pathing layer, no presence windows, no derived regiment layout.
4. **Numbers typed, not derived.** Casualty totals, counts ("467", "445+", "51,000", "24/137/30"), highest-rate cards and strength curves are hand-typed in ≥ 14 places; the OOB itself is internally non-additive.
5. **Prose written for developers ships to users** (`--`, `CS-017`, "DATA NOTE", "alias for"), because there is no separation of *authoring* fields from *published* fields.
6. **Provenance lives only at file level** (and only in 17/71 files), so no claim can be traced or corrected.


---

## 5. Fix plan — actionable items

Effort scale: S < 0.5 d, M 0.5–2 d, L 2–5 d, XL > 5 d (solo developer, no team). "Owner" marks work that needs a renderer/UI change (other specialists own the plan for the app itself; this plan states the data contract they must honour). Item IDs are `data-integrity-NN` (short form **DI-NN**). `audit_refs` link to the BRIEF IDs.

### Dependency map (read top-down)

```
DI-12 schemas ─┬─> DI-24 validator+CI ─┬─> every other item is gated by it
DI-25 repo ────┘                       │
DI-02 canonical IDs ─> DI-07 OOB completion ─> DI-03 reconciliation ─> DI-10 strength model ─> DI-21 casualty timeline
      │                      └─> DI-08 aliases/dups ─> DI-09 facts registry ─> DI-28 display names
      └─> DI-14 dup rows ─> DI-01 dense tracks ─> DI-19 regiment coverage ; DI-13 geometry feeds DI-01
DI-11 clock anchors (time-facts) ─> DI-01, DI-22, DI-21
DI-23 provenance ─> DI-27 Historian KB ─> DI-05 corpus loader ─> DI-06 deep links
DI-15/16 externalise embedded data ─> DI-26 packaging
```

---

### data-integrity-01 — Dense, validated unit-movement model (replace 1,804 sparse rows + hold-and-snap with anchors → generated tracks) — critical, XL
**Audit refs:** [] (new; contributes to C4, D3, P3)
**Evidence.** 188/675 ticks populated, 487 empty (`s03_ticks.py`); 0.75 % real data; `y1` reads only ticks f and f+1 (`bundle.pretty.js:96266-96305`), cache `i2` never cleared (`:96265`); 1,116 of 1,209 transitions are hold-then-snap (371 >500 m; 84 >2 km; 704 km total); median implied moving speed 0.27 mph; 404/478 units ≥100 ticks stale at t675; 59/73 tick-1 rows on 7 shared longitudes (schematic).
**Root cause.** Positions were authored as a handful of hand-written keyframes per unit with no pathing, no presence windows, and no data contract for "where is unit X at tick t".
**Fix (data).**
1. New authoring format `data-src/tracks/<day>.json`: `{ "unit_id": "U-XI-3-2", "presence": {"appear_tick": 1, "depart_tick": null, "off_map_until": null}, "anchors": [ {"tick": 1, "lat": …, "lng": …, "bearing": …, "disposition": "Line of March", "basis": "documented|reconstructed|schematic", "source": "SRC-PFANZ1-p187", "uncertainty_m": 150} ] }`. Existing rows (deduped by DI-14) become anchors with `basis:"schematic"` where the row is on a shared-longitude grid or has < 4 decimals.
2. Build script `scripts/build-tracks.mjs` densifies each consecutive anchor pair: if both anchors are within 80 m of the road graph (DI-13) route along it (Dijkstra) and time-parametrise by a per-disposition speed profile, else great-circle with ease-in-out; never over water/outside the land mask. Speed caps (mph): Line of March 3.0 (double-quick 4.5 for ≤ 4 ticks), Charging Line 8 for ≤ 2 ticks then 4, Chaotic Retreat 6, cavalry mounted 12 / walk 5, artillery limbered 4, skirmish 3. If the anchor spacing cannot satisfy a cap the build **fails**, naming the unit, ticks and the extra anchors required.
3. Bounded authoring: 351 moving segments have > 10-tick gaps (217 > 30, 162 > 60). Target: moving gap ≤ 6 ticks (30 min), stationary ≤ 45 ticks. Auto-generated intermediate anchors need historian review only for the 162 segments > 60 ticks.
4. Output: ship anchors + generated polylines per day (≈ 350 KB raw today; budget < 600 KB raw / < 120 KB brotli for 570 units) **or** pre-sampled `tracks_dayN.json` in delta-coded 1e-5° integers; one shared `trackAt(unitId, tick, frac)` ES module used by the map, Compare, Camera, Ledger, Embed and Immersive so every page agrees.
5. `appear_tick`/`depart_tick` so units arrive from off-map and leave (no permanent ghosts).
**Fix (renderer, owner: app).** Replace `y1` + `i2` with `trackAt`; delete the module-level cache; scrubbing and deep links become pure functions of (tick).
**Effort.** XL (≈ 8–10 d incl. review of ~160 long gaps + tooling).
**Acceptance.** Validator C001–C005 and G003 pass; 200 random (unit, tick) probes return a position for every unit whose presence window contains the tick; max single-tick displacement ≤ speed cap × 5 min for all units except rows tagged `event:"rout"` (whitelist ≤ 10); a cold seek to tick 300 draws ≥ 300 units; no unit is drawn > 45 ticks after its last anchor unless `presence` says so; screen-recording diff of Day 2 shows 0 jumps > 250 m.
**Moves.** Core function (B/D → A), historical accuracy, usability; data bytes neutral.
**Depends.** DI-02, DI-11, DI-12, DI-13, DI-14.

### data-integrity-02 — Canonical unit-ID namespace, `side` field, alias crosswalk, collision resolution — critical, L
**Audit refs:** [] (feeds H5 Follow-Ancestor list and the unit panel)
**Evidence.** 95/478 placed IDs unresolved (216 rows, 12.0 %); 10 Confederate regiments keyed `U-…` (render blue; twin `C-…` also placed; side inferred at `bundle.pretty.js:96484,96525,96585,96597,96679,96739,97068,97923`); 28 IDs used for two formations (44 rows), e.g. `U-V-3-1` McCandless vs "Vincent's brigade", `U-II-3-1` 975 vs 12,500 men; a second brigade numbering in the density files (`C-II-4`, `C-III-4-x`, `C-I-5-x`, `U-I-2-3/2-4`); the in-app Follow-Ancestor list is built from placement IDs (`bundle.pretty.js:101026-101039`), so 95 rows print raw IDs (`name: … || It.unit_id`) and sort by `localeCompare` on names (H5).
**Root cause.** Two authoring passes with different ID conventions; side encoded only in the ID prefix; no referential validation.
**Fix.**
1. ID grammar (rule R007): corps `^(U|C)-(I|II|III|V|VI|XI|XII|CAV)$`; division `^…-[1-4]$`; brigade `^…-[1-4]-[1-6]$`; regiment `^(U|C)-\d{1,3}[A-Z]{2,3}(-[A-Z0-9]{1,4})*$`; battery `^(U|C)-ART-…`; groups (`U-ART-RES`, `C-CAV`, `U-VI`) exist as explicit `unit_level:"group"` records. Add `side: "union"|"confederate"` to every OOB record and every track; lint forbids `startsWith("U-")` in code.
2. `data-src/unit_aliases.json`: `{"U-15AL": {"canonical":"C-15AL","reason":"side-prefix error","since":"1.1.0"}, …}`. Seed from `tmp-data-integrity/crosswalk_seed.csv` (95 rows): **12 high** (10 `U-`→`C-`, 2 brigade-prefixed regiment IDs) apply automatically; **17 medium + 44 low** need a short human review each (many are suffix guesses such as `C-12NC-IV` → `C-12NC` = "12th NC in Iverson's brigade", which is right); **22 none** need a new OOB record (VI Corps brigades → DI-07; `C-CAV` group; `U-ART-RES`, `U-ART-McGilvery`, `U-ART-Osborn` → artillery brigade records) or removal.
3. Migration script rewrites all placement/density/chronology/vignette/succession IDs to canonical, merges twins (`U-15AL` t150 bivouac + `C-15AL` rows) by (unit, tick), and logs each rewrite in `CHANGELOG.md`.
4. Resolve the 28 semantic collisions row by row (`semantic_id_conflicts.csv`; 42/44 rows already carry a target: Vincent → `U-V-1-3`, Webb → `U-II-2-2`, Archer → `C-III-2-3`, Gordon → `C-II-1-3`, Hoke/Avery → `C-II-1-2`, Ramseur → `C-II-3-4`, Cutler → `U-I-1-2`, Carroll → `U-II-3-1`). Where an ID doubled as brigade **and** division/corps (`U-VI-1` 7,500 vs 15,000; `U-CAV-1` Buford vs Gregg; `C-III-3-1` Lane vs Pender's division) give the parent its own `unit_level` record.
5. `unit_level` lets the renderer avoid drawing a parent brigade line **and** its regiments simultaneously.
**Effort.** L (script 1 d + 95-row review 0.5 d + 44-row collision review 1 d + validation 0.5 d).
**Acceptance.** R001–R007 and R011 report 0 errors over placements, density, chronology `units_involved`, vignette `units_featured`, succession `unit_id`; 0 rows where `side` ≠ prefix; 0 semantic conflicts (note surname ∈ OOB commander chain/designation of the row's ID, or explicit `cameo:` allowlist); Follow-Ancestor list shows 0 raw-ID names and sorts by `sort_key` (numeric ordinal, then state) — unit test on the 217-regiment roster.
**Moves.** Historical/data consistency, core function, H5.
**Depends.** DI-12; enables DI-01, DI-08, DI-10.

### data-integrity-03 — One authority for casualty/strength numbers; derive every roll-up — critical, L
**Audit refs:** [C7, H10]
**Evidence.** §3.5–3.6: Union 22,803 / 23,138 / 23,049 / 23,055; Confederate 23,125 / 23,025 / 28,000 / 23,231; Confederate corps strengths 65,000 (OOB) vs 72,810 (apportionment) vs 71,699 (B&M engaged) vs 75,000; 22/22 Union + 9/9 Confederate divisions and 10/11 corps do not roll up; U-I periods +335, C-CAV −100; Pickett note 2,700 > C-I day-3 2,614; "51,000" in 5 places; Confederate "37.3 %" mixes 28,000/75,000.
**Root cause.** Numbers typed by hand from different sources/bases; no rule that parents equal children.
**Fix.**
1. `data-src/reference/authorities.json`: for each aggregate `{ "id":"union.total_casualties", "value":23055, "basis":"B&M total (K 3,155 / W 14,531 / C-M 5,369)", "source":"BM-p125", "alt":[{"value":23049,"source":"OR-I-27-1-p187"},{"value":23003,"source":"AG-1888"}] }`; likewise Confederate (23,231 = 4,708 / 12,693 / 5,830; estimates up to 28,000 flagged as estimates) and engaged strengths (93,921; 71,699). **Verify against the book itself** before publishing (I verified only through Wikipedia's citation, §1).
2. Choose the site headline once, e.g. "≈ 46,300 casualties (Busey & Martin: 23,055 Union, 23,231 Confederate); older estimates reach 51,000" — replace every "51,000" / "23,000 … 28,000" (help chunk, chronology t650, V-001 ×2, V-024 ×2).
3. Build-time derivation: regiment → brigade → division → corps → army sums computed, never typed. Keep `reported_*` (as published) next to `derived_*`, plus an explicit `unlisted_strength/casualties` remainder (HQ, provost, detachments) so differences are documented, not silent. Validator N005–N007 fail if `|reported − derived|` exceeds tolerance without a documented remainder.
4. Fix the specific defects: reconcile `U-I` (6,059 vs periods 6,394) and `C-CAV` (583 vs 483) by re-deriving periods from regiment/day data; one basis for Confederate corps (engaged) and recompute percentages on it; add killed/wounded/captured per side (enables Living Ledger categories).
5. Retire hand-typed `notable_intensity_notes` (DI-04).
**Effort.** L (2–3 d data + 1 d source checking).
**Acceptance.** `data:check` N-rules pass; Dashboard totals == Σ regiments == headline (±0.5 %, remainder shown); site-wide grep for "51,000" = 0; Help/Dashboard/Ledger/OOB/Documentary show identical totals (E2E string-equality test); Confederate % and Union % use the same denominator type (label states which).
**Moves.** Historical/data consistency C- → A-, documentation.
**Depends.** DI-02, DI-07, DI-23.

### data-integrity-04 — Fix the Dashboard stat-card contract (`highest_single_regiment_rate`) and compute all "notable" stats — critical (audit C7), S
**Audit refs:** [C7]
**Evidence.** `casualty_apportionment.json:330-333` nested `{union:{unit,rate,note}, confederate:{…}}`; `dashboard.html:244-247` `cards.push({ num: n.unit || key, lbl: key.replace(/_/g,' '), note: n.note })` → "highest_single_regiment_rate" / "undefined". Note text is wrong ("224 of 262 casualties"), the claim is contradicted by the OOB (C-8VA 76.7 % > C-26NC 69.7 %), and the "data note" footnote at `dashboard.html:257-262` is developer copy.
**Root cause.** Schema polymorphism + typed facts + a renderer that assumes one shape.
**Fix.** Replace the object with an array `notable_intensity: [{id, label, side, unit_id, display_name, value, value_label, note}]` generated at build from the OOB under a stated rule ("min 150 engaged; rate = casualties/strength"): Union `U-1MN` 85.5 % (224 of 262 engaged); Confederate top by rate per the rule (`C-8VA` 148 of 193 = 76.7 %) plus a separate "most casualties" card `C-26NC` (588 of 843 engaged). Notes are templated from the numbers. Dashboard: skip any card lacking `label`/`note`; never print a key; remove the reconcile footnote once DI-03 lands.
**Effort.** S.
**Acceptance.** No card text contains `_` or "undefined"; test asserts card count and note regex `\d+ casualties of \d+ engaged`; values equal a recomputation from the OOB.
**Moves.** Fit & finish, reliability; C7 closed.
**Depends.** none (DI-03 refines).

### data-integrity-05 — Repair the Historian ↔ data contract (chronology "undefined", paragraph loss, missing entity kinds) — high, S (fix) + M (shared loader)
**Audit refs:** [H8]
**Evidence.** `historian.html:119,123`; 137/137 render "undefined" (`s07_historian_sim.js`); `:109` prints 7,182-word scripts as one string; terrain limited to `key_locations` (`:130`); no brigades/divisions/corps/batteries/successions/monuments/tour; 6 of the 8 probe queries in §3.9 (Meade, Longstreet, Lincoln, Jennie Wade, "Who commanded the Union army?", "How many casualties…") return nothing relevant.
**Fix.** (a) S: use `e.event`, `e.narrative`, `e.significance`, index `event + narrative + location`; render `full_script.split('\n\n')` as `<p>`; add roads/structures/features. (b) M: one `assets/corpus.js` used by `historian.html`, `search.html`, `find-ancestor.html`, `regiment.html`, reading a *documented* `corpus.json` built at deploy time (DI-26/27) so field names cannot drift; add kinds army/corps/division/brigade/battery/succession/monument/tour/fact. (c) Golden test set of 40 queries (Meade, Longstreet, "Cushing's battery", "Who commanded the 20th Maine?", "How many casualties on July 2?" …) asserting the expected ID is in the top 3.
**Effort.** S / M.
**Acceptance.** 0 answers containing "undefined"; precision@3 ≥ 0.8 on the golden set; answers render paragraphs.
**Moves.** Function, Historian credibility (H8).
**Depends.** DI-02 for names; DI-27 for depth.

### data-integrity-06 — Deep-link and share-link contract (521+ links land on tick 1) — high, M
**Audit refs:** [] (adjacent to H3/H4)
**Evidence.** §3.11: parameters `unit`, `tick`, `vignette`, `lat`, `lng`, `t`, `u`, `z`, `ll` are written by `search.html:114,127,139`, `historian.html:110`, `bundle.pretty.js:97823-97829` but never read; only `ancestor` is (`:101019`).
**Fix.** `data-src/routes.json` defines the URL grammar (`?t=<tick>&u=<unitId>&v=<vignetteId>&ll=<lat,lng>&z=<zoom>&a=<ancestorUnit>&day=<1-3>`), legacy aliases (`tick→t`, `unit→u`, `vignette→v`) and a `parseDeepLink()`/`buildDeepLink()` pair shared by the app and static pages. Validator R008 resolves every link the data layer can generate (unit has a track; tick 1–675; vignette exists; route param known). Regiments without their own track link to `regiment.html?unit=` until DI-19 lands.
**Owner note.** The app must apply the parsed state on load (owner: app).
**Effort.** M.
**Acceptance.** Playwright: for each of the 521 search results assert the map opens at the linked tick/unit/vignette; copy-share-link → reload round-trip restores tick/zoom/center/selection; R008 = 0.
**Moves.** Usability, core function.
**Depends.** DI-02, DI-01 for `u=`.

### data-integrity-07 — Complete the OOB hierarchy (VI Corps) and make it add up — high, M
**Audit refs:** []
**Evidence.** 36 regiments point at 8 non-existent `U-VI-*-*` brigades; `division.brigade_ids` dangling (8); 8 placement rows; note "All 49 … infantry brigades" vs 43 present + 8 missing; roll-up failures (§3.5); guns totals 182 vs "283", 306 vs "370".
**Fix.** Add the 8 VI Corps brigade records with commanders, strengths, casualties from OR/B&M (I did **not** research names; historian to fill and cite); correct `union_oob_brigades.json` metadata; make every `regiment.parent_brigade_id` resolve and every `brigade.regiment_ids` reciprocal (431/467 are today); derive artillery totals from batteries and reword "approximately 283/370"; add army records `U-AOP`, `C-ANV` with derived totals; introduce `unlisted_*` remainders (DI-03).
**Effort.** M.
**Acceptance.** R003/R004 = 0; N005/N006 pass with documented remainders; guns fields equal Σ `gun_count`.
**Moves.** Data consistency, Follow-Ancestor/Search completeness.
**Depends.** DI-02, DI-03.

### data-integrity-08 — Aliases, duplicates, detachments, misfiled rows, "Commander unrecorded" — high, M
**Audit refs:** [H7, H8]
**Evidence.** `U-14BK` (strength 0; ranks #1 for "14th brooklyn" over the real 84th NY); `U-11PA` + `U-11PA-B` duplicate; `U-107NY` in I Corps (likely 107th PA); 4 Union cavalry "-b" detachments; `C-McClanahan-ART` in a regiments array; 27 rows "Commander unrecorded" (`search.html:112`); 222 rows with a dangling " · ".
**Fix.** Add `record_type: "regiment|battalion|detachment|alias|battery"`, `alias_for`, `visibility: "public|hidden"`. Aliases become `aliases: []` on the target (searchable, never listed). Merge true duplicates (`U-11PA-B` → `U-11PA` in Baxter's brigade; strength from B&M — historian to determine); move `C-McClanahan-ART` to `horse_artillery`. Detachments stay but display as "2nd New York Cavalry (detachment)" grouped under the parent. Commander: `null` → UI copy "Commander not recorded in Busey & Martin"; fill the 22 Confederate cavalry commanders from OR/B&M or mark `commander_status:"unknown"`. Compute `casualty_percentage` (222 missing). Search meta joins non-empty parts only.
**Effort.** M.
**Acceptance.** Search "14th brooklyn" → the real regiment first, 0 alias rows visible; 0 rows with "unrecorded" or a dangling " · "; R006 = 0.
**Moves.** Fit & finish, Historian trust (H7/H8).
**Depends.** DI-02.

### data-integrity-09 — Single-source-of-truth facts registry for every count and label — high, M
**Audit refs:** [H10]
**Evidence.** "467" ×10, "445+" (Help chunk), "24 vignettes / 137 events / 30 features" (`historian.html:48`), "51,000" ×8, "18 vs 20" features, disposition colours in schema vs `Lp` (`bundle.pretty.js:96307`), speed label "1x (real time)" (`:97429`), day/date labels.
**Fix.** See §7: build emits `facts.json`; HTML/JSON-LD/manifest/`noscript`/Help/PDF consume it via templating or `fetch('/data/facts.json')`; CI greps for banned literals.
**Effort.** M.
**Acceptance.** `npm run facts:lint` finds 0 literal occurrences of registry values outside `facts.json`; changing a record count updates every surface after a rebuild; Help → About shows the same number as the home meta description.
**Moves.** Consistency, SEO copy accuracy.
**Depends.** DI-03, DI-07, DI-08.

### data-integrity-10 — Placement `strength` becomes computed, not typed — high, L
**Audit refs:** []
**Evidence.** §3.6: 121 increases across 82 units; 126 units constant despite > 10 % casualties; 74 above OOB strength; only 88/302 end within 5 % of `strength − casualties`; the animation ignores `casualty_apportionment.json`.
**Fix.** Drop `strength` from authored anchors and compute per tick: `strength(t) = initial − Σ casualties_assigned(unit, ≤ t)`. Distribute each unit's OOB casualties across its engagement windows with one documented model (DI-21), weighted by disposition (`Charging Line`/`Chaotic Retreat` ticks); reinforcements are explicit events (`+n`, source). Parent aggregates = Σ children. Validator N001–N004: never > initial (+2 %), monotone non-increasing unless `reinforcement`, ends at `initial − casualties` (± 1 %).
**Effort.** L.
**Acceptance.** Every unit ends within 1 % of OOB `strength − casualties`; every unit with OOB casualties shows > 0 casualties at the end; corps curves in the Dashboard equal Σ unit curves at every tick (test).
**Moves.** Historical accuracy, animation fidelity (line lengths), core function.
**Depends.** DI-01, DI-02, DI-03.

### data-integrity-11 — One clock (tick → real time) in data; remove hand-typed times — high, M
**Audit refs:** [C4, C3]
**Evidence.** 94/137 chronology labels ≠ their own `tick_formula`; succession `approx_time` vs `approx_tick` off by mean +5.07 h (0/37 within 30 min); schema day strings contradict 5 min × 225 ticks; V-023 "That night" at tick 556; timeline marker `TO` tick 17 "First shot" vs V-001 tick 12; 11/24 vignettes contradict their tick's clock; `getTickTime` (`bundle.pretty.js:9371`) Day-1 base 6:00 vs data 5:00 and Days 2–3 base 4:00.
**Fix.** Adopt the 33-anchor piecewise-linear `clock.json` from `time-facts-anchors.csv` (in-sample MAE 21 min) as **the** tick → local-time function; expose `clockAt(tick)` (ISO-8601 with `-04:00`, plus `date`, `day`, `label`) from the shared module; delete `time` strings from chronology (derive) and store `real_time` (source-based) beside `tick`, validating `|clockAt(tick) − real_time| ≤ 30 min` (T001); the same for successions (T002); regex-extract times in narrative (T003) and require a match or `time_ref_ok`; fix the 4 wrong-day and 12 misordered events, V-023's tick and the `TO`/`Gc` marker ticks through one `events.json` (DI-16).
**Effort.** M (data); the time research is done by time-facts.
**Acceptance.** T001–T004 = 0; one `clockAt` used by map, Compare, Camera, Ledger, Documentary, Sandbox (grep proves no other formula); Day-3 header never shows "July 5".
**Moves.** Historical consistency C- → A-, usability.
**Depends.** time-facts anchors, DI-12, DI-16.

### data-integrity-12 — Machine-enforced schemas replace the prose `placement_schema.json` — high, M
**Audit refs:** []
**Evidence.** §3.1: 430,000 vs 1,804; 600–700 units/tick vs ≤ 87; 4 vs 3 day-1 files; `record_count` 4,890 vs 100; declared vs actual tick ranges; day `real_time` strings; not JSON Schema; 12 KB shipped unused.
**Fix.** JSON Schema 2020-12 files under `schemas/` (`unit`, `regiment`, `battery`, `brigade`, `track`, `event`, `vignette`, `terrain`, `source`) with `additionalProperties:false` and enums for `disposition`, `side`, `unit_level`, `basis`, `significance`; move prose to `docs/data-model.md`; stop shipping the schema to browsers; file headers (`record_count`, `tick_range`) become build-derived. Replace the impossible bbox with `map_extent` (include East Cavalry Field and approach corridors) plus an `off_map` flag.
**Effort.** M.
**Acceptance.** `ajv` validates every file; an unknown key is an error; the build fails on drift; the schema is no longer deployed.
**Moves.** Data reliability, maintainability.
**Depends.** none (first).

### data-integrity-13 — Geometry: extent, East Cavalry Field, precision, stacking, terrain duplicates, road geometry — medium, M
**Audit refs:** [S3]
**Evidence.** §3.1/3.3: 49 rows outside bbox; 26 monuments east of bbox and cavalry placements 2.7–3.0 km west of the site's own tablets; 379 rows < 4 decimals; 48 stacked groups (96 units); LOC-023 26 m from LOC-001 and four identical location/structure pairs; "Gulp's"; roads single-point; straight road lines hard-coded in the bundle (`:9450`).
**Fix.** (a) `map_extent` east to ≈ −77.15; (b) re-locate East Cavalry Field anchors from the tablet cluster (39.828, −77.168) and an NPS map (historian check) and update LOC-021/V-020; (c) require ≥ 5 decimals (≈ 1 m) or `uncertainty_m ≥ 50` for coarse points; (d) G004 min separation 15 m between distinct same-level units at a tick unless parent/child, with an auto-nudge script for the 48 groups; (e) merge duplicate terrain entries, fix "Gulp's" → "Culp's" and "Brian Farm (Bryan Farm)" → "Bryan Farm"; (f) `roads.geojson` with real polylines (source and licence recorded) used by both the routing in DI-01 and the map layer (replace `x4`).
**Effort.** M.
**Acceptance.** S005/G001/G002/G004 = 0; ECF anchors within 300 m of the tablet centroid; one roads file feeds routing and map.
**Moves.** Accuracy, visual polish.
**Depends.** DI-12.

### data-integrity-14 — Duplicate and conflicting `(unit_id, tick)` rows; deterministic precedence — medium, S
**Evidence.** 103 duplicated keys / 117 redundant rows; 68 keys with conflicting values (e.g. `C-III-3-2` t120 Line of Battle 1,326 vs Charging Line 1,100 ≈ 1.3 km away); load order (placements then density, `bundle.pretty.js:96900-96915`) silently decides. CSV `dup_conflicts.csv`.
**Fix.** Merge `density_*` into the authoring tracks (DI-01) so there is one row per (unit, tick); until then document precedence (`density` > `placements`) and make S007 error on any conflicting duplicate; resolve the 68 by hand (mostly ID collisions from DI-02).
**Effort.** S.
**Acceptance.** S007 = 0.
**Moves.** Reliability.
**Depends.** DI-02.

### data-integrity-15 — Monuments: one dataset, provenance, out of the JS bundle — medium, L
**Audit refs:** [P2, P3]
**Evidence.** `data/monuments.json` (9 records; overlay at `index.html:640-700`, fetch `:677`) vs the embedded 512-record array `bundle.pretty.js:104440-110609` (≈ 121 KB as JSON): 503/512 `src:""`, 51 blank `mn`, duplicate `MN 96`, #512 honors "…(WGS-84 decimal degrees). MN ID", 28 outside bbox, 13 identical coordinate pairs, coordinates differ from `monuments.json` by 1–24 m; json "Soldiers' National Monument" is 2 m from bundle #506 "Kentucky State Monument"; V-024 says "1,328" monuments; `monuments.json:_note` says "expand this file".
**Fix.** One `monuments.json` generated from a cited source (NPS/HMDB/Stone Sentinels — per-record `source`, `retrieved`, `license`), fields `id, name, honors, unit_id?, side, group, mn, lat, lng, url`; link `unit_id` to the OOB where the honored unit exists (search "20th Maine" → its monuments); lazy-load on Monuments/Walkthrough open; remove the array from the bundle; overlay and walkthrough read the same file; add to Historian/Search corpus. Fix #512 text; dedupe `MN 96`; move the 26 East Cavalry Field monuments inside the widened extent (DI-13).
**Effort.** L.
**Acceptance.** One fetch serves overlay + walkthrough; 512/512 records have `source` and `license`; bundle shrinks (P2); UI counts come from `facts.json`.
**Moves.** Performance (bundle), docs, Historian depth.
**Depends.** DI-12, DI-23, DI-26.

### data-integrity-16 — Other content embedded in code → `events.json`, `tour.json`, `tutorial.json` — medium, M
**Audit refs:** [C4, H13]
**Evidence.** Tour stops (`bundle.pretty.js:104096`, 16; stops 3 and 5 have no Street-View `pano`), tutorial steps `Gc` (`:111819`; ticks 1/17/28/267/538), timeline markers `TO` (`:112192`; "First shot" tick 17 ≠ V-001 tick 12), road lines `x4` (`:9450`), Help/About copy (445+, 51,000).
**Fix.** Move to versioned data files; `events.json` is the canonical list `{id, tick, title, kind, links:{vignette, chronology, unit_ids}}` from which chronology, vignette triggers, timeline markers, tutorial steps, turning points and sandbox start ticks are generated or validated (R009/T005).
**Effort.** M.
**Acceptance.** No literal tick numbers in JS (lint); marker ticks equal `events.json`; tour data validates (`pano` or explicit `pano:null`).
**Moves.** Consistency, maintainability, bundle size.
**Depends.** DI-11, DI-12.

### data-integrity-17 — Commander model with tenures; fix succession keys — medium, L
**Audit refs:** [H7]
**Evidence.** 15/42 successions not reflected in the OOB chain; wrong unit keys (`US-010`, `US-013/014`, `US-018`, `US-025`, `CS-016` → `C-CAV`); 27 commanderless rows; nested `successor` objects.
**Fix.** `people.json` (`person_id`, name, rank at battle, sources) and `command_tenures.json` (`unit_id`, `person_id`, `from_tick`, `to_tick`, `cause`, `source`); the UI resolves the commander by tick; regiment/brigade `commander` fields become derived. Correct unit keys to regiments (`U-1MN`, `U-124NY`, `U-2MA`, …). Also gives the Historian person entities (698 distinct names exist today).
**Effort.** L.
**Acceptance.** T002/R001 pass; every unit has a commander at every tick it is present or `commander_status:"unknown"`; test: Reynolds → Doubleday at t28 changes the I Corps panel.
**Moves.** Data consistency, Historian depth.
**Depends.** DI-02, DI-11, DI-23.

### data-integrity-18 — Regiment record completeness and normalisation — medium, M
**Audit refs:** [H5, H7]
**Evidence.** §3.5 field table: 222 no `casualty_percentage`, 22 no `parent_corps_id` (→ `report.html:101` prints "undefined / C-CAV-1"), 37 empty `days_engaged`, 169 `key_action` < 40 chars ("Army reserve." ×20), non-state `state` values.
**Fix.** Compute percentages; fill `parent_corps_id` (Confederate cavalry → `C-CAV`); derive `days_engaged` from tracks + casualty windows; add `state_code`, `arm` (`infantry|cavalry|artillery`), `ordinal:int`, `designation_short` ("20th Maine"), `sort_key`; replace filler `key_action` with a one-sentence factual summary (template + source) or `null`; move `Regular Army`/`Multi-state` into `origin:{type}`.
**Effort.** M.
**Acceptance.** N003 = 0; R003 = 0; no `key_action` < 40 chars unless `null`; lists sort numerically (102nd after 10th).
**Moves.** Fit & finish, H5, search quality.
**Depends.** DI-02.

### data-integrity-19 — OOB ↔ map coverage: every regiment/battery gets a position when present — medium, XL
**Audit refs:** [H10]
**Evidence.** 250/467 regiments (53.5 %) have no own placement (231 are drawn only through the parent brigade; 19 — Richmond's cavalry brigade (5 rows), 12th/16th/19th/48th MS, 6th/12th/16th/41st/61st VA, Jenkins's cavalry — have neither); 62/103 batteries never placed; the home meta says "467 regiments and batteries tracked across 675 snapshots".
**Fix.** Derive regimental positions from brigade anchors with a **formation model**: regiments ordered along the brigade line by OOB order (left → right facing `bearing`), frontage from `strength` — the schema's 0.045 yd/man gives 77 m for a 1,883-man brigade whereas a two-rank line at ≈ 0.55 m per file would be ≈ 520 m (*verify with a drill manual*) — spacing 8–12 m; batteries beside their battalion/brigade anchor at 12–20 m spacing; documented detail only where sources exist (`basis:"reconstructed"`). Mark derived positions "approximate" in the UI.
**Effort.** XL.
**Acceptance.** For every tick every OOB unit whose `presence` covers the tick has a position; Follow-Ancestor contains 467 regiments + 103 batteries; the home-page claim becomes true.
**Moves.** Core function, Search/Ancestor completeness, SEO copy truth.
**Depends.** DI-01, DI-02, DI-07.

### data-integrity-20 — Text lint and typographic normalisation pipeline — medium, M
**Audit refs:** [H7]
**Evidence.** §3.8: 1,591 `" -- "`; 72 strings with `US-/CS-` ids + `CS-017` in a placement note; 60 `flag_notes`; typos (`Krzyznowski`, `Nichols's`, `Gulp's`), variants (`Rose Woods` 19 / `Rose's Woods` 4); 249 paragraph breaks collapsed.
**Fix.** Separate `authoring` fields (`flag`, `flag_notes`, `dev_note`, `chunk`) from published fields at build; typographic normaliser (`" -- "` → `" — "`, straight → curly quotes, `--` in ranges → en dash); gazetteer `data-src/lexicon.json` (people, places, unit nicknames) with allowed spellings and a Levenshtein-1 near-miss report (X005); banned-token rules X002/X003; style guide (museum voice, sentence case, no developer voice); `paragraphs: []` arrays in vignettes.
**Effort.** M.
**Acceptance.** X001–X005 = 0 on published output; `Krzyzanowski`, `Nicholls`, `Culp's`, `Bryan Farm`, `Rose Woods` canonical everywhere.
**Moves.** Fit & finish, professional voice.
**Depends.** DI-12, DI-24.

### data-integrity-21 — One casualty-timeline algorithm, generated once — medium, M
**Audit refs:** [S4]
**Evidence.** Dashboard piecewise 70 %-at-peak rule (`dashboard.html:98-118`), Ledger linear ramp (`living-ledger.html:102-118`), JSON claims σ = 8/4-tick bell curves (`casualty_apportionment.json:10-11`), the animation uses none; Ledger starts at 4 casualties at tick 1 because the `U-CAV` period starts at t1 (first shot is t12).
**Fix.** Build emits `casualty_timeline.json` (per side, per corps, per tick, cumulative K/W/C) from the DI-10 unit-level model; Dashboard, Ledger, Compare, Documentary and the map's casualty heat-map read it. Start day-1 periods at the first documented engagement (t ≥ 12 for cavalry).
**Effort.** M.
**Acceptance.** Σ unit casualties at tick t == Ledger count at t == Dashboard line (test at 20 ticks); Ledger starts at 0.
**Moves.** Consistency; S4 closed.
**Depends.** DI-03, DI-10.

### data-integrity-22 — Vignette data fixes and structure — medium, S–M
**Audit refs:** [C4, H8]
**Evidence.** Duplicate trigger tick 556 (V-019/V-023, same event, shared quotation); V-024 has no units; 7 vignettes have no featured-unit keyframe near the trigger; IDs not chronological; `vignette_trigger` orphaned; walls of text; factual/wording bugs collected by time-facts (V-020/V-021 "eight days", V-022 "7:30", V-015's first message).
**Fix.** Schema `{id, order, title, trigger:{tick, lat, lng, unit_ids}, panel_summary, paragraphs:[], sources:[], clock_ref}`; merge V-019/V-023 or move V-023 to its night tick; unique trigger ticks; `panel_summary` ≤ 320 chars; derive (not store) `vignette_trigger`; apply time-facts corrections.
**Effort.** S–M.
**Acceptance.** R009/R010/T003 = 0; unique trigger ticks; no paragraph > 900 chars.
**Moves.** Content quality.
**Depends.** DI-11, DI-12.

### data-integrity-23 — Per-record provenance, source registry, confidence — medium, L (schema) + XL (backfill)
**Audit refs:** [G1]
**Evidence.** §3.10: 0/467 regiments, 0/1,804 placements, 0/137 events, 0/24 vignettes carry a source; 54/71 files lack `metadata.sources`; 29 distinct citations without pages/editions; only successions (42) have page-level cites.
**Fix.** See §9. Phase the backfill by value: (1) 42 successions already done; (2) aggregates in `authorities.json`; (3) the 24 vignettes and the 45 `critical` chronology events; (4) regiments via a `BM-1994` reference per record with page (the book is tabular, so page = lookup key); (5) placements: `basis` plus one citing source per unit-day, not per row.
**Effort.** L for schema/registry/UI ("Sources" drawer); XL backfill.
**Acceptance.** P001 is an error for new records; `data-quality-report.json` shows ≥ 95 % of records with ≥ 1 resolvable `source_id` at Phase 3; the UI shows "Source: …" in the unit panel and vignettes.
**Moves.** Documentation, trust, Historian grounding.
**Depends.** DI-12, DI-25.

### data-integrity-24 — Data validator and CI gate (rules in §6) — medium (enabler), L
**Audit refs:** [N1]
**Fix.** `scripts/validate-data.mjs` (Node; only `ajv` beyond stdlib) implementing the §6 catalogue; emits `data-quality-report.json` plus a human summary; `baseline.json` stores today's defect counts so CI fails only on regressions while the backlog burns down; Netlify build command `npm run data:check && npm run build`; pre-commit hook.
**Effort.** L.
**Acceptance.** Running against today's data reproduces the §6 baseline counts (this audit's scripts are the oracle); CI red on any new unresolved ID / new `--` / new duplicate key.
**Moves.** Reliability, maintainability.
**Depends.** DI-12, DI-25.

### data-integrity-25 — Repo, data versioning, changelog, public errata — medium (enabler), M
**Audit refs:** [N1]
**Fix.** See §8: `git init` the data (no authoring source exists in either zip); semver `data_version`; `CHANGELOG.md`; content-hashed deploy files + `data-manifest.json`; Help → About and PDF footer show "Data vX.Y.Z (YYYY-MM-DD)"; `/data-notes.html` errata page.
**Effort.** M.
**Acceptance.** Every deploy carries `data_version`; a data change without a changelog entry fails CI; users can see corrections.
**Moves.** Documentation, trust.
**Depends.** none.

### data-integrity-26 — Data packaging for performance (71 files → few immutable packs) — medium, M
**Audit refs:** [P3, P1, P2]
**Evidence.** 71 files, 824,704 B (160,243 B gzip-9). At load the code issues ≥ 34 JSON requests (14 OOB incl. `commander_successions.json` + terrain + 3 vignettes + 16 Day-1 placement/density files, `bundle.pretty.js:96754-96935`) plus 3 chronology fetches (`:102958-102960`) and a *second* fetch of `commander_successions.json` (`:97522`); ≈ 18 KB dev-only keys + 35 KB metadata + 12 KB schema ship to users; the 512-monument array is inside the JS.
**Fix.** Build emits `core.<hash>.json` (slim OOB + terrain + facts + vignette index; target < 60 KB brotli), `day1|2|3.<hash>.json` (tracks + events for that day), `history.<hash>.json` (vignette/chronology text; lazy), `monuments.<hash>.json` (lazy), `corpus.<hash>.json` (Historian/Search; lazy); strip authoring fields; `Cache-Control: immutable` on hashed files; prefetch Day 2 at idle; service worker precache keyed by `data_version`.
**Effort.** M.
**Acceptance.** ≤ 4 data requests before first paint; first-paint data ≤ 80 KB brotli; total data transfer ≤ 400 KB brotli; RUM LCP/INP not worse.
**Moves.** Performance (P3), LCP.
**Depends.** DI-02, DI-14, DI-15, DI-25.

### data-integrity-27 — Historian knowledge-base data contract and corpus expansion (data side) — high, XL
**Audit refs:** [H8]
**Evidence.** Today: 658 indexed entries / 11,088 indexed words / 45,096 narrative words in the whole data lake; 698 distinct commander names, 85 chronology locations, 50 terrain entries, 512 monuments, 42 successions and 29 cited sources exist but are unindexed.
**Fix (data model; retrieval/UI belong to the Historian specialist).** JSONL knowledge base `kb/*.jsonl` with entity types `person, unit, place, event, monument, source, passage`; every `passage` = `{id, text (≤ 220 words), entity_ids[], ticks|date_range, place_ids[], source_id, locator, license, confidence, embedding_ref?}`; IDs stable (DI-02); provenance mandatory (DI-23); every numeric answer must be rebuildable from structured tables (casualties, strengths). Phase-1 sources limited to public-domain/permitted material: OR Vol. 27 report passages (public domain), one battle-report summary per brigade (93 → ≈ 300 passages), monument inscriptions/short bios subject to NPS/HMDB terms, ≈ 300 person bios, ≈ 50 place essays, a 300-question gold set. Growth path = add sources through the same schema, not by editing code.
**Effort.** XL.
**Acceptance.** Corpus ≥ 10× current words with 100 % passages sourced; gold-set P@3 ≥ 0.85 and 0 unsupported claims in a 100-answer human audit; every answer shows source links.
**Moves.** Historian (H8), docs, SEO long-tail.
**Depends.** DI-02, DI-05, DI-23, DI-25.

### data-integrity-28 — Stop leaking internal IDs and dev strings into the UI (display names) — low, S
**Audit refs:** [H7]
**Evidence.** `historian.html:94` "part of U-I / U-I-1-2"; `find-ancestor.html:121`; `regiment.html:199`; `report.html:101` ("undefined / C-CAV-1" for 22 rows); Follow-Ancestor names fall back to the raw ID (`bundle.pretty.js:101032`).
**Fix.** Add `corps_name`, `division_name`, `brigade_name` and `display_name` to every OOB record at build; pages print those; X002 forbids `\b[UC]-[A-Z0-9-]+\b` in rendered text.
**Effort.** S.
**Acceptance.** Playwright grep of rendered HTML for `\b[UC]-[IVX0-9A-Z-]+\b` = 0.
**Moves.** Fit & finish.
**Depends.** DI-02, DI-18.

### data-integrity-29 — Historical verification backlog (needs a human historian) — medium, M
Not derivable from the data alone; each item needs a citation and a yes/no:
1. `U-11PA` vs `U-11PA-B` (same regiment in Paul's and Baxter's brigades?); `U-11PA-R-F` "detachment … Big Round Top" (unsupported note); `U-107NY` in I Corps (107th PA?).
2. `notable_intensity_notes`: highest Confederate rate (C-8VA 76.7 % vs C-26NC 69.7 %); Pickett's ≈ 2,700 vs C-I day-3 2,614.
3. East Cavalry Field location (tablets vs placements) and Farnsworth's charge position (39.7828, −77.2444).
4. Tick-1 staging positions (59/73 on 7 columns) and Pickett's presence (Line of March t180, Bivouac from t400 — time-facts item 10).
5. VI Corps brigade commanders/strengths (DI-07); the 22 Confederate cavalry commanders.
6. Union guns "≈ 370" vs 306; Confederate "283" vs 182; "1,328 monuments" (V-024) vs 512 in the site; line-frontage scale (DI-19).
7. Alias policy (which dual designations to expose in search).
8. Busey & Martin edition and page for every number (currently "1994").
**Effort.** M (research, in parallel with build work).
**Acceptance.** Each item closed with a citation recorded in `CHANGELOG.md`.
**Moves.** Historical accuracy.
**Depends.** DI-23.

### data-integrity-30 — Style/enum tables have two owners (schema vs renderer) — low, S
**Audit refs:** [A1]
**Evidence.** `placement_schema.json` disposition colours (Charging Line union `#0044cc`) vs `Lp` (`bundle.pretty.js:96307-96320`, `#ff4422`); unit type inferred from ID substrings; the disposition list is duplicated in the store (`iA.dispositions`, `:9345`), the schema and the legend.
**Fix.** `dispositions.json` (id, label, description, render style tokens, legend text, accessible pattern) generates the schema enum, legend and docs; explicit `unit_type` field.
**Effort.** S.
**Acceptance.** Enum and legend generated from one file; token contrast checked in CI (hand-off to the accessibility plan).
**Moves.** Consistency, accessibility (legend).
**Depends.** DI-12.

---

## 6. Validator specification (`scripts/validate-data.mjs`)

Severity: **E** = fails CI; **W** = report only (promote to E when the baseline reaches 0). "Baseline" = what today's data yields (from this audit's scripts, so the validator can be regression-tested against them).

| Rule | Sev | Scope | Check | Threshold | Baseline today |
|---|---|---|---|---|---|
| **S001** | E | all files | valid UTF-8 JSON; top-level shape per schema | — | 0 |
| **S002** | E | all records | required fields present (JSON Schema) | — | 0 (placements); OOB gaps in N003/R003 |
| **S003** | E | all | types (int/float/string/enum) | — | 0 |
| **S004** | E | all | `disposition`, `side`, `unit_level`, `basis`, `significance` ∈ enum | — | 0 |
| **S005** | E | tracks | lat/lng in `map_extent` unless `off_map:true`; bearing 0–359; tick 1–675 | — | 49 rows out of extent |
| **S006** | E | all | no unknown keys (`additionalProperties:false`) | — | not enforceable today |
| **S007** | E | tracks | unique `(unit_id,tick)`; conflicting duplicates forbidden | 0 | 103 keys / 68 conflicting |
| **S008** | E | files | header `record_count`, `tick_range` derived = actual | — | 1 wrong header; 3 loose ranges |
| **R001** | E | placements, chronology, vignettes, successions, casualty notes | every `unit_id` resolves to a canonical OOB ID (or alias → canonical) | 0 | 95 IDs / 216 rows; 5 chronology refs; 1 succession |
| **R002** | E | OOB, tracks | `side` equals the OOB record's side; no side inferred from the prefix in code | 0 | 10 IDs (`U-` Confederates) |
| **R003** | E | OOB | regiment → brigade → division → corps → army chain resolves | 0 | 36 regiments; 8 `division.brigade_ids` |
| **R004** | E | OOB | `brigade.regiment_ids` ⇄ `regiment.parent_brigade_id` reciprocal | 0 | 36 regiments unlisted |
| **R005** | E | OOB | IDs unique across all files | 0 | 0 |
| **R006** | E | OOB | `alias_for` resolves; alias rows `visibility:hidden`; no public `strength:0` | 0 | 1 alias visible |
| **R007** | E | all | ID matches the grammar for its `unit_level` | 0 | ≥ 95 non-conforming |
| **R008** | E | pages, data | every generated deep link resolves (unit has a track, tick 1–675, vignette exists, route param known) | 0 | 521 + 24 + share links unread |
| **R009** | E | events, vignettes, chronology | referenced event/vignette IDs exist; one vignette per tick | 0 | 1 duplicate tick (556) |
| **R010** | W | vignettes | featured units have a track sample within ±2 ticks of `trigger.tick` | 0 | 7 vignettes |
| **R011** | W→E | tracks, chronology | names in note/event text (surnames, brigade names) ∈ OOB commander chain/designation of the row's unit (allowlist `cameo`) | 0 | 28 IDs / 44 rows |
| **C001** | E | tracks | every unit has `presence`; ≥ 1 anchor inside every day it is present | 0 | 153 units last seen on Day 1 with no departure semantics |
| **C002** | E | tracks | max anchor gap ≤ 6 ticks while displacement > 250 m; ≤ 45 ticks stationary | 0 | 351 moving gaps > 10 ticks; 217 > 30 |
| **C003** | E | derived | each tick renders ≥ N present units (N from `presence`) | 0 | 487 ticks with 0 rows |
| **C004** | W→E | OOB × tracks | every OOB combat unit has an own or derived position when present | 0 | 250 regiments + 62 batteries |
| **C005** | E | tracks | no unit drawn after `depart_tick` or before `appear_tick` | 0 | n/a (no fields) |
| **G001** | E | tracks | inside land mask / not in water | 0 | not measured |
| **G002** | E | tracks | ≥ 5 decimals or `uncertainty_m ≥ 50` | 0 | 379 rows |
| **G003** | E | tracks | implied speed ≤ cap by disposition/arm (DI-01 caps) | 0 | 1 infantry > 8 mph, 12 > 4.5, 1 cavalry 17.7 mph |
| **G004** | W | tracks | distinct same-level units ≥ 15 m apart at a tick (except parent/child) | 0 | 48 groups / 96 units |
| **G005** | W | tracks | regiment within 600 m of its parent-brigade sample (skirmish exempt) | 0 | 17 same-tick pairs > 1 km (mostly marching, t1) |
| **G006** | W | tracks | bearing within 45° of the movement vector for `Line of March` | 0 | not measured |
| **N001** | E | tracks | 0 ≤ strength ≤ initial × 1.02 | 0 | 74 units above OOB |
| **N002** | E | tracks | strength non-increasing unless `reinforcement` flag | 0 | 121 increases / 82 units |
| **N003** | E | OOB | casualties ≤ strength; percentage == `round(100·c/s,1)` present | 0 | 0 disagreements; 222 missing |
| **N004** | E | tracks | final strength within 1 % of OOB `strength − casualties` | 0 | 88/302 within 5 % |
| **N005** | E | OOB | `reported` vs Σ children within tolerance or documented `unlisted_*` | ±0 / documented | 17 brigades > 10 %; 22/22 + 9/9 divisions; 10/11 corps |
| **N006** | E | casualty | Σ engagement periods == `total_casualties`; period rate == casualties/initial | 0 | 2 corps (335, 100) |
| **N007** | E | OOB × reference | side totals within 0.5 % of `authorities.json`, basis declared | ±0.5 % | Union 22,803–23,138 vs 23,055; Confederate 23,025–28,000 vs 23,231 |
| **N008** | E | timeline | Σ per-tick casualty deltas == declared total | exact | n/a |
| **N009** | E | casualty | derived "notable" stats recomputed from the OOB (min-engaged rule) | exact | 1 wrong claim + shape bug |
| **N010** | E | OOB | Σ `gun_count` == declared `total_guns` | exact | 182 vs 283; 306 vs ≈ 370 |
| **T001** | E | chronology | `|clockAt(tick) − real_time| ≤ 30 min`; `time` label derived, not typed | 0 | 94/137 label ≠ formula; 5/102 within 30 min (time-facts) |
| **T002** | E | successions | same as T001 for `approx_tick` vs `approx_time` | 0 | 0/37 within 30 min |
| **T003** | W→E | vignettes, chronology, notes | extracted clock/part-of-day mentions consistent with `clockAt(tick)` (± 30 min / part of day) | 0 | 11/24 vignettes |
| **T004** | E | all | `day` = f(tick); `date` present (fixes "July 5") | 0 | rendering bug C3 (code) |
| **T005** | E | events | strictly increasing ticks per day unless `group` | 0 | 0 |
| **X001** | E | published text | no `" -- "`; typographic quotes/dashes | 0 | 1,591 |
| **X002** | E | published text | no internal IDs (`\b[UC]-[A-Z0-9-]+\b`, `\b(CS\|US)-\d{3}\b`) | 0 | 72 strings + UI prints |
| **X003** | E | published text | no `DATA NOTE`, `flag`, `TODO`, `alias`, `chunk`, `undefined`, `null`, `NaN` | 0 | 60 `flag_notes`; "alias for" ×1 |
| **X004** | E | published text | ordinal/name format per style guide (`20th Maine`, Roman corps, spelled ranks) | 0 | 79 designation shapes |
| **X005** | E | published text | spelling ∈ lexicon; Levenshtein-1 near-miss reported | 0 | 3 confirmed (`Krzyznowski`, `Nichols`, `Gulp's`) |
| **X006** | W | published text | length bounds (`panel_summary` 40–320; `key_action` ≥ 40; paragraph ≤ 900) | 0 | 169 short `key_action` |
| **X007** | E | vignettes | `paragraphs[]` present (no `\n\n` inside strings) | 0 | 24 |
| **P001** | W→E | published records | ≥ 1 `source_id` that resolves in `sources.json` | ≥ 95 % | ≈ 1 % (42 + 9 + 9 records) |
| **P002** | E | sources | every source has `{id, citation, edition, license, url?}`; locator required for B&M/OR | 0 | 0 of 29 have locators |
| **P003** | W | all | `confidence ∈ {A,B,C}`; `basis ∈ {documented, reconstructed, derived, schematic}` | 0 | n/a |
| **F001** | E | site build | facts-registry values not hard-coded elsewhere (banned-literal list generated from `facts.json`) | 0 | ≥ 30 literal occurrences (§7) |
| **F002** | E | site build | every `{{facts.*}}` token resolves | 0 | n/a |
| **K001** | E | corpus | every indexed field exists in the schema (prevents `e.title`-style drift) | 0 | 1 (chronology) |

Runtime probes (Playwright against the built site): deep links resolve (R008); Historian gold set (DI-05); no `undefined` strings in the DOM; hover-panel name present for 100 random units.

---

## 7. Single-source-of-truth plan for counts and labels

**Registry.** The build emits `facts.json` and injects `{{…}}` into HTML, JSON-LD, manifest, Help/About, the PDF build and the Historian intro. Inputs are the data files plus `authorities.json`; nothing in `facts.json` is typed by hand except the cited reference authorities.

```jsonc
{
  "data_version": "1.0.0", "data_date": "<build date>",
  "ticks": { "total": 675, "minutes_per_tick": 5, "day_start": [1, 226, 451], "clock": "clock.json@1.0.0" },
  "units": { "regiment_records": "<derived>", "batteries": "<derived>", "brigades": "<derived>", "with_track": "<derived>" },
  "content": { "vignettes": "<derived>", "chronology_events": "<derived>", "terrain_entries": "<derived>", "monuments": "<derived>", "tour_stops": "<derived>", "extra_features": "<derived from features.json>", "kb_passages": "<derived>" },
  "casualties": {
    "union":        { "total": 23055, "killed": 3155, "wounded": 14531, "captured_missing": 5369, "source": "BM-p125" },
    "confederate":  { "total": 23231, "killed": 4708, "wounded": 12693, "captured_missing": 5830, "source": "BM-p260" },
    "combined": 46286, "range_note": "older estimates run to 51,000"
  },
  "strength_engaged": { "union": 93921, "confederate": 71699 },
  "labels": { "speed_1x": "10 simulated minutes per second", "date_format": "MMMM D, YYYY" }
}
```
(Reference values are those verified in §1 through a secondary citation of B&M/OR; they must be re-checked against the sources before publication. Everything marked `<derived>` is computed at build — today's values are 467 regiment records, 103 batteries, 93 brigades, 24 vignettes, 137 events, 50 terrain entries, 512 monuments, 16 tour stops, 20 features, but several change after DI-07/08.)

**Where today's literals live (to be replaced by tokens):**

| Literal | Occurrences | Files |
|---|---:|---|
| `467` | 10 | `index.html:15,18,24,32,719,754`, `manifest.json:4`, `find-ancestor.html:48,105`, `historian.html:48` |
| `445+` | 1 | `assets/helpmodal-cfv9t0zh.js` (About) |
| `24 … vignettes, 137 … events, 30 … terrain` | 1 | `historian.html:48` |
| `51,000` / `~51,000` / `28,000` | 8 | Help chunk, `chronology_day3.json` t650, `vignettes_part1.json` ×2, `vignettes_part3.json` ×2 |
| `675` | ≥ 28 | 13 pages + bundle ×7 + data metadata (keep as `ticks.total`) |
| 18 vs 20 feature list | 2 | `index.html:721-740` (18 links) vs `site-nav.js` (20) → generate both from `features.json` |
| disposition colours/labels | 3 | schema, `Lp` (`bundle.pretty.js:96307`), store enum (`:9345`) → `dispositions.json` |
| speed label "1x (real time)" | 1 | `bundle.pretty.js:97429` → `labels.speed_1x` |
| brigade count "49" | 1 | `union_oob_brigades.json` note |

**Rules.** (1) A number that appears in prose is either a `{{facts.path}}` token or lives in `authorities.json` with a citation. (2) `facts:lint` fails on banned literals generated from `facts.json` values (467, 445, 51,000, 23,049, …). (3) UI counts are computed from loaded data at runtime **or** injected at build, never both. (4) The PDF guide is built from the same tokens (G1). (5) Every user-visible count carries a title/aria-label stating its basis ("engaged strength, Busey & Martin").

---

## 8. Data versioning and changelog approach

1. **Repository.** `git init` a `gettysburg-data` repo (or `data-src/` in a monorepo) — neither zip contains an authoring source (N1). Authoring files are JSON validated against `schemas/`; the **build** produces `dist/data/*` (hashed) plus `data-manifest.json` (`{data_version, built_at, schema_version, sources_version, files:{name → {sha256, bytes}}}`).
2. **Semantic versioning of the data.** MAJOR = ID renames/removals or schema-breaking change (aliases keep old IDs working for two majors); MINOR = new records/fields/sources; PATCH = corrections. `data_version` is shown in Help → About and the PDF footer, keys the SW cache, and is exposed as `window.__GTBG_DATA_VERSION__` for bug reports.
3. **Changelog discipline.** `CHANGELOG.md` (Keep-a-Changelog style: Added / Changed / Corrected / Removed). Every **Corrected** entry carries `{record id, before → after, citation, reviewer, date}`. CI: if the hash of any authoring file changes, `CHANGELOG.md` must change and `data_version` must bump.
4. **Per-record revision metadata (cheap):** `updated: "YYYY-MM-DD"`, `rev: n` on records edited after v1.0 → "recently corrected" badge.
5. **Public errata.** `/data-notes.html`, generated from the changelog: corrections, known limitations (schematic staging, approximate clocks), source list; linked from footer/Help/PDF. Directly addresses the credibility risk in C4.
6. **Diff tooling.** `npm run data:diff -- v1.0.0 v1.1.0` prints counts of units/events/rows added/removed/changed and any change to a headline fact; PR descriptions paste it.
7. **Caching.** Hashed filenames + `Cache-Control: public, max-age=31536000, immutable`; `data-manifest.json` and `facts.json` `no-cache`; service-worker precache keyed by `data_version`; on a version change show a non-blocking "Updated data available" toast — no `location.reload()` (C6).
8. **Rollback.** Netlify deploys are atomic; keep the previous two data packs in the deploy for clients mid-session.

---

## 9. Provenance fields to add (per record)

```jsonc
// common block on every published record (units, tracks, events, vignettes, terrain, monuments, passages)
"provenance": {
  "sources": [ { "id": "BM1994", "locator": "p.125 (Union totals)" },
               { "id": "PFANZ1-2001", "locator": "pp.220-223" } ],
  "basis": "documented | reconstructed | derived | schematic",   // how the value was obtained
  "confidence": "A | B | C",                                      // A = directly stated, B = inferred from 2+ sources, C = single/secondary
  "method": "B&M table lookup | road-routed interpolation | formation model | editorial",
  "reviewed_by": "<initials>", "reviewed_on": "YYYY-MM-DD",
  "disputes": [ { "note": "Reynolds' death 10:15 vs 10:40-10:50", "sources": ["OR-I-27-1", "WPd1"] } ],
  "license": "PD-USGov | CC-BY-SA-4.0 | permission | facts-only"
}
```
- **Source registry** `sources.json`: `{ id, type: book|OR|map|web|dataset, citation, edition, year, publisher, url?, retrieved?, license, notes }`. It resolves the 29 current free-text citations ("Pfanz trilogy" → 3 ids; add edition/page granularity; the Busey & Martin edition is to be confirmed — Wikipedia cites p.125/p.260, edition unknown to me).
- **Placements:** `basis` per anchor (`documented` = a source places the unit there/then; `reconstructed` = inferred from narrative; `schematic` = staging/placeholder — 59 tick-1 rows today), `uncertainty_m` (25 / 100 / 300) and `time_uncertainty_min`; the UI renders a soft halo for `reconstructed/schematic` and an "approximate position" line in the unit panel.
- **Aggregates:** each number in `authorities.json` has its own citation (DI-03).
- **Quality dashboard:** the validator's `data-quality-report.json` publishes % of records with sources, % with confidence A/B, and the number of `schematic` anchors — an internal KPI ("provenance coverage") that moves from ≈ 1 % today to ≥ 95 %.
- **Licensing hygiene** (open questions §10): register each source's licence; keep `facts-only` for Busey & Martin-derived numbers unless permission is obtained; prefer OR (public domain), NPS and your own prose.

---

## 10. Open questions (need the owner or a historian)

1. **Busey & Martin rights.** The per-regiment strength/casualty tables (467 rows) are the book's core content; is the site republishing them with permission or under a fair-use position? If not: keep aggregates + your own text, or obtain permission. (Licensing not verified here.)
2. **Which casualty headline** does the site want — B&M 23,055 + 23,231, or OR-era 23,049 + ≈ 28,000? (The plan assumes B&M with a stated range.)
3. **East Cavalry Field:** should the map extent grow east (≈ −77.15) and the field be re-located (DI-13)? Any local source you trust for tablet coordinates?
4. **Formation model (DI-19):** is "approximate regiment positions inside the brigade line", labelled as reconstructed, acceptable — or should only documented positions be shown?
5. **Alias policy:** expose "14th Brooklyn" as a search alias of the 84th NY (recommended) rather than as a row?
6. **Historian scope:** are OR (public domain), NPS and your own prose the only allowed corpus sources for Phase 1? (Drives DI-27 sizing and licensing.)
7. **VI Corps brigade data / Confederate cavalry commanders:** do you have B&M/OR access to fill the 8 missing brigades and 22 commanders, or should Phase 1 mark them `unknown`?
8. Confirm **no other authoring copy** of the data exists (the Downloads history zips are deploys; `gettysburg-source-reconstructed` predates the density files) — the plan treats `deploy/data` as canonical.

---

## 11. Sequencing (solo-dev friendly) and target metrics

**Phase 0 — quick wins (1–2 days):** DI-04 (dashboard card), DI-05a (Historian `event`/paragraphs), DI-28 (display names), typo fixes (`Krzyzanowski`, `Nicholls`, `Culp's`, `Bryan Farm`), hide alias rows from Search (DI-08 minimal), correct the "467/445/51,000" copy.
**Phase 1 — foundation (week 1):** DI-25 repo/versioning, DI-12 schemas, DI-24 validator with baseline, DI-02 IDs/crosswalk/collisions, DI-14 duplicates, DI-07 VI Corps + roll-ups, DI-08.
**Phase 2 — truth of numbers and time (week 2):** DI-03, DI-09 facts registry, DI-11 clock, DI-10 strength model, DI-21 casualty timeline, DI-18, DI-20, DI-22, DI-16.
**Phase 3 — motion and coverage (weeks 3–4):** DI-13 geometry/roads, DI-01 tracks, DI-19 regiment coverage, DI-17 commanders, DI-06 deep links, DI-15 monuments, DI-26 packaging.
**Phase 4 — depth (ongoing):** DI-23 provenance backfill, DI-29 verification backlog, DI-27 Historian corpus expansion, DI-30.

| Metric | Today | Gate for "A+ data" |
|---|---:|---:|
| ticks with renderable positions (cold seek) | 188/675 (27.9 %) | 675/675 |
| real-data share of displayed unit-ticks | 0.75 % | 100 % renderable, every sample `basis`-tagged; anchors ≥ 1 per ≤ 6 ticks while moving |
| unresolved unit IDs | 95 IDs / 216 rows | 0 |
| Confederate units drawn blue | 10 | 0 |
| roll-up mismatches (divisions + corps) | 41/42 | 0 undocumented |
| casualty-total sources in play | 4 per side | 1 headline + cited alternates |
| OOB regiments with own/derived position | 217/467 | 467/467 |
| records with ≥ 1 resolvable source | ≈ 1 % | ≥ 95 % |
| user-facing `--` / internal IDs / "undefined" | 1,591 / 72 + UI / 137 + 1 | 0 / 0 / 0 |
| Historian indexed words | 11,088 | ≥ 10× with sources |
| data requests before first paint | ≥ 34 | ≤ 4 (≤ 80 KB brotli) |
| validator errors on `main` | no validator | 0, with baseline ratchet |

---

## Appendix A — Script index (`plan-work/tmp-data-integrity/`)

| Script | Output |
|---|---|
| `s00_structure.py` | shapes of all 71 files (`s00_structure.out`) |
| `lib.py`, `oobidx.py` | loaders; OOB index (728 unique IDs) |
| `s01_schema.py` | schema conformance (`s01_defects.json`) |
| `s02_ids.py` | placement ↔ OOB referential integrity (`s02_out.json`) |
| `s03_ticks.py` | tick coverage, duplicates (`s03_out.json`) |
| `s04_teleports.py` | implied speed / snap analysis (`s04_segments.json`) |
| `s05_strength.py` | placement strength vs OOB |
| `s06_oob_math.py`, `s08_rollups.py` | OOB linkage, completeness, roll-ups |
| `s07_historian_sim.js` | literal port of Historian retrieval (+ query battery) |
| `s09_casualty.py` | casualty_apportionment vs OOB vs reference |
| `s10_refs.py` | successions/chronology/vignette references and clock checks |
| `s11_crosswalk.py` → `crosswalk_seed.csv` | 95-row ID crosswalk proposals |
| `s12_render_sim.py` | carry-forward renderer simulation |
| `s13_monuments.py` (+ `monuments_bundle.json`, `tour_bundle.json` extracted from `bundle.pretty.js:104441-110608` and `:104097-104438`) | monument/tour analysis |
| `s14_text.py`, `s17_typos.py` | text-quality scans |
| `s15_semantic.py` → `semantic_id_conflicts.csv`; CSV `dup_conflicts.csv` | note ↔ ID conflicts, duplicate rows |
| `s16_corpus.py` | corpus statistics |
| `gb_wikitext.txt` | Wikipedia wikitext used for reference totals (secondary source; see §1) |


---

## Verification

Adversarial verifier pass (independent re-computation; scripts in `plan-work/tmp-verify-data-integrity/`: `v01.py`, `v01b.py`, `v01c.py`, `v02.py`, `v07*.py`, `v10.py`, `v19.py`, `v21_ledger.py`, `v05_rank.js`; Wikipedia wikitext saved as `wt.json`). Data = `DEPLOY_DIR/data`, code = `bundle.pretty.js`. The live site was checked by curl: live HTML differs from the deploy copy only by Netlify's injected RUM `<script>`; `data/casualty_apportionment.json` and `data/monuments.json` are byte-identical live vs deploy. All 30 findings were re-opened and the numbers the report leans on were re-derived from scratch (not by re-running the specialist's scripts); only `s07_historian_sim.js` was re-run, after diffing it against `historian.html:145-190` (it is a literal port). Verdict key: CONFIRMED / CORRECTED (evidence real, but a number, root cause, scope or fix needs the stated change) / REFUTED (none) / UNVERIFIABLE (only the licence/terms statements noted).

**Headline.** The evidence base is unusually solid. Every headline number reproduced exactly: 188/675 ticks populated, 1,687 keyframes = 0.75 % of 225,276 unit-ticks, 1,209 transitions / 1,116 snaps / 371 >500 m / 84 >2 km / 704 km, 173 single-keyframe units, 404/478 stale at t675, 95 unresolved IDs / 216 rows, 10 `U-` Confederates each with a placed `C-` twin, 103 dup keys / 68 conflicts, 121 strength increases / 82 units, 512 monuments / 503 empty `src`, 137/137 chronology "undefined", 18 vs 20 features, the 222/22/27/37/169 regiment-field gaps, the 7 vignettes without a featured-unit keyframe, and all cited `bundle.pretty.js` line numbers. Nothing was REFUTED. The problems are: (a) cross-finding inconsistencies the report did not notice, chiefly the **5-minute-tick constants versus the piecewise clock DI-11 adopts**; (b) fixes that silently depend on **editing a minified bundle with no source (N1)** and on **nine static pages that hard-code the `placements_*` file names**; (c) a few overstated or mis-scoped statistics; (d) missed defects, listed after the table.

### Verdict table

| ID | Verdict | Notes / corrections (evidence) |
|---|---|---|
| DI-01 | **CORRECTED** | All evidence reproduced (`v01.py`, `v01b.py`; `y1` at `bundle.pretty.js:96266`, `const i2 = {}` at `:96265` with no reset, the `x===0` branch spreads `i2` at `:96279`). Corrections: (1) **clock conflict** - speed caps and gap targets are written in mph x 5 min/tick (acceptance: "max single-tick displacement <= speed cap x 5 min"; "moving gap <= 6 ticks (30 min)") but DI-11 makes the 33-anchor clock (0.8-42.3 min per tick, `time-facts-anchors.csv`) the only clock. Re-deriving implied speeds with that clock (`v01c.py`, segments >50 m) roughly doubles the impossible ones: >8 mph 2 -> 6, >4 mph 16 -> 33 (e.g. `C-I-3-3` t550->551 929 m in 2.7 min = 12.9 mph; `C-I-3-1` t548->549 12.0 mph; `U-ART-9MA` t302->305 12.3 mph). So "speed is rarely impossible" (report 3.2) holds only on the linear clock. G003/C002/C003 must take dt from `clockAt`. (2) The densifier's **timing policy is unspecified** (arrive on the anchor tick vs depart at once vs depart-late); a uniform 0.46 mph crawl over 100 ticks is as wrong as a snap, and "arrive early then hold" moves units hours ahead of documented times. (3) "Historian reviews only 162 segments" is optimistic: satisfying "moving gap <= 6 ticks" needs ~4,737 generated intermediate anchors (vs 1,687 real rows) across 590 moving segments, i.e. most on-screen geometry becomes `basis:derived`; the 173 single-keyframe units and 153 Day-1-only units need presence research that is not in the 8-10 d estimate (effort is realistic for tooling only). (4) **Consumer list is wrong**: Living Ledger and Embed read no placements at all; the pages that do read them (`camera.html:68-70`, `cinematic-export.html:89-91`, `compare.html:101-109`, `ground-remembers.html:60-62`, `immersive.html:72-74`, `regiment.html`, `sandbox.html`, `watch-together.html`, `unit-rendering-reference.html`) read only the nine `placements_*` files (694 rows), never `density_*` (MISSED-02). (5) The renderer step is an edit of a 2.28 MB minified bundle (MISSED-04). (6) Median 0.27 mph is over all non-zero segments; over the 590 segments >250 m it is 0.46 mph (conclusion unchanged). |
| DI-02 | **CORRECTED** | Reproduced: 728 OOB IDs, 478 placed, 95 unresolved, 216 rows, 10 side-prefix errors all with placed C- twins (`v02.py`). `startsWith("U-")` side inference is at **19** sites, not 8: `:96484,96525,96585,96597,96679,96739,97068,97923,98875,99767,100906,101034,101134,101734,102336,102673,103129,103258,103320` (the "ban startsWith" fix must patch all 19; the static pages do the same: `search.html:110`, `historian.html:91`, `find-ancestor.html:115`, `regiment.html:165,194`). The 28-ID / 44-row "same ID, two formations" list is a heuristic: hand-checked, roughly half are true brigade swaps (Vincent in `U-V-3-1` rows t260-272; Webb in `U-II-2-3` t308-554; Archer in `C-III-2-1`; Gordon/Smith/Hoke/Avery rotation at t55; Cutler; Carroll/Hall/Willard; Ramseur; Graham; Gregg), the rest are level errors (a division/corps commander under a brigade ID) plus at least one cameo false positive (`C-I-3` "Longstreet's corps bleeds"). The t55 rows `C-II-1-1/-1-3/-1-4` rotate each other's identities, so the migration must be one atomic permutation per row (a sequential rewrite would merge wrongly). Proposed targets check out against the OOB: Vincent->`U-V-1-3`, Webb->`U-II-2-2`, Archer->`C-III-2-3`, Gordon->`C-II-1-3`, Hoke/Avery->`C-II-1-2`, Ramseur->`C-II-3-4`, Cutler->`U-I-1-2`. The crosswalk seed itself has defects (MISSED-06), so "22 need new OOB records" is overstated. |
| DI-03 | **CORRECTED** | Reproduced: Union 22,803 / 23,138 / 23,049 (OOB metadata); Confederate 23,125 / 23,025 / 28,000 (army header); strengths 90,164 / 72,810 / 65,000; `U-I` 6,059 vs periods 6,394; `C-CAV` 583 vs 483; Pickett note 2,700 (`casualty_apportionment.json:227`) > C-I day-3 2,614 (`:222`); dashboard total 23,138 + 23,025 = 46,163. Wikipedia wikitext (fetched independently via the MediaWiki API) confirms 23,055 (3,155 / 14,531 / 5,369), 23,231 (4,708 / 12,693 / 5,830), engaged 93,921 / 71,699, McPherson 75,000 / 28,000, Adjutant-General 23,003, and "between 46,000 and 51,000". Corrections: the literal `51,000` occurs **6** times (`helpmodal-cfv9t0zh.js` 1, `chronology_day3.json` 1, `vignettes_part1.json` 2, `vignettes_part3.json` 2); "8" only if the two `28,000` literals (`chronology_day3.json`, bundle) are added. **Edition mismatch not flagged**: Wikipedia attributes the 23,231 figure to B&M's "more recent 2005 work"; every site file cites B&M "(Longstreet House, 1994)" - see MISSED-03. |
| DI-04 | **CORRECTED** | Root cause exactly as stated (`casualty_apportionment.json:330-333`, `dashboard.html:244-247`, footnote `:257-262`, claim `:60`). C-8VA 148/193 = 76.7 %, C-38NC-S 167/221 = 75.6 %, C-9VA 194/257 = 75.5 %, C-26NC 588/843 = 69.7 %, U-1MN 224/262 = 85.5 % all reproduced (same ranking with no minimum-strength threshold, so the "min 150" rule is unnecessary). Correction: the hotfix (iterate the nested `union`/`confederate` objects, fix the "224 of 262 casualties" wording) is **S with no build**; the proposed OOB-generated `notable_intensity` array needs the build/validator (DI-24/25) that does not exist yet, so that version is **M** and "Depends: none" is wrong for it. |
| DI-05 | **CONFIRMED** | `historian.html:119,123` read `e.title`/`e.description`; chronology keys are `tick,time,event,units_involved,location,significance,flag,narrative` (137 events; 137/137 render "...: undefined", re-run). Probe results reproduced (Meade -> 1 chronology "undefined" hit; Longstreet -> Sickles vignette + Sharpshooters; Lincoln / Jennie Wade -> 0). Addendum: fixes (a)/(b) will not by themselves meet "P@3 >= 0.8" - the ranker (`historian.html:154-165`) puts the correct record outside the top 3 even for the site's own suggestion chip (`v05_rank.js`): "20th Maine" -> V-010, C-15AL, LOC-003 outrank `U-20ME` (rank 4); "1st Minnesota" -> `U-1MN` rank 4; "Little Round Top" -> LOC-003 rank 26. The golden set needs an exact-title/entity boost or BM25 inside the same item. |
| DI-06 | **CONFIRMED** | Readers searched across `bundle.pretty.js`, all `assets/*.js`, `index.html`, `site-nav.js`: only `ancestor` is read (`:101019`); writers `search.html:114,127,139`, `historian.html:110`, bookmarks `:97822-97829` (`?t=&u=&z=&ll=`). Add `embed.html` (its CTA is built as `index.html?tick=..&vignette=..`, also unread) to the writer list. |
| DI-07 | **CORRECTED** | VI Corps facts reproduced exactly: 36 regiments point at 8 missing brigade IDs (4/5/5/5/4/4/4/4), divisions `U-VI-1/2/3` list them, 51 brigade records = I 7 + II 10 + III 6 + V 8 + XI 6 + XII 6 = 43 infantry + 8 cavalry, note says "All 49". Corrections: (1) 28 of 28 divisions that have resolvable brigade children fail to roll up (19 Union + 9 Confederate); the report's "22/22 Union" includes the 3 VI Corps divisions whose children do not exist. (2) **Guns**: the Confederate derived total is 194 not 182 (12 more guns in 3 horse batteries in `confederate_cavalry.json`); and the published totals (Wikipedia infobox: Union 360, Confederate 270 guns) are well above the OOB's listed batteries (Union 50 + 5 horse = 55 / 306 guns; Confederate 45 + 3 = 48 / 194), so "derive artillery totals from batteries and reword approximately 283/370" would replace roughly right totals with an incomplete count. Complete the artillery OOB first (MISSED-07). |
| DI-08 | **CONFIRMED** | `U-14BK` (`alias_for` U-84NY, strength 0) scores 90 vs 60 for the real 84th NY on "14th brooklyn" (`search.html:83-95`, record check). Note for the merge: the 11th Pennsylvania belonged to Baxter's brigade (to be confirmed against B&M), so the `U-I-2-1` (Paul's) `U-11PA` record is the likely misfiled one - merge direction must keep the Baxter's-brigade parent, not simply the first ID. `C-McClanahan-ART` carries an explicit `unit_type: "horse_artillery"` (the report says arm is inferred). |
| DI-09 | **CORRECTED** | `467` x10, `445+`, 18 vs 20 links, `1x (real time)` `:97429` all reproduced. The `51,000` count is 6 (see DI-03). The sample `facts.json` in section 7 lists `"minutes_per_tick": 5` next to `"clock": "clock.json@1.0.0"` - mutually contradictory (MISSED-01). Injecting `{{facts.*}}` into HTML/JSON-LD needs a build step; the dependency line (`DI-03, DI-07, DI-08`) omits DI-24/25 although `publish = "."` in `netlify.toml` means there is no build today. |
| DI-10 | **CORRECTED** | 121 increases / 82 units and 74 over OOB by >2 % reproduced. "88 of 302" reproduces only for regiments+brigades (`v10.py`; scope unstated; 105 of 374 if divisions/corps/batteries are included). **"126 units with >10 % casualties keep one constant strength" is misleading**: 93 of the 126 have a single keyframe (nothing to vary); only 33 authored >= 2 keyframes with constant strength - the statistic mostly restates DI-01. Renderer coupling not mentioned: `F4` interpolates strength (`:96238-96256`) and `uF` (`:97033-97044`) triggers the casualty flash when strength drops between ticks, so computed strength changes visible behaviour. |
| DI-11 | **CORRECTED** | 94/137 labels differ from the file's own `tick_formula` - reproduced, but only **46** differ by >30 min (42 by >60); 36 differ by <= 5 min (rounding) and 11 by <= 15. At the plan's own T001 tolerance it is 46 (34 %), not 94 (69 %). `getTickTime` `:9371-9385` (6:00 base Day 1, 4:00 base Days 2-3) and `July ${l + 2}` `:97428` confirmed. Marker `TO` `:112192-112201` "First shot" at tick 17: chronology t17 is "FIRST UNION ARTILLERY to fire" (Calef) and tutorial `Gc` t17 is titled "First Artillery Fire" - the marker *label* is wrong, the tick is right. The piecewise clock (0.8-42.3 min/tick) makes "675 five-minute snapshots" (`index.html:15,719,754`, schema "The 5-minute tick number") false, and the alternative of re-ticking all data onto a linear 5-minute clock is never weighed (MISSED-01). |
| DI-12 | **CONFIRMED** | `placement_schema.json:5` "430,000+", `:12` "600-700", `:13` "approximately 430000"; `placements_day1_ticks1_50.json:7` `"record_count": 4890` (100 real); 49 rows outside the bbox (42 lng < -77.29, 7 lat > 39.85; ticks 1,3,4,8,9,12,180,600); 379 rows < 4 decimals (181 lat / 210 lng); schema not fetched by any page (only a comment at `compare.html:121`). |
| DI-13 | **CORRECTED** | ECF offset reproduced: tablet centroid (39.8282, -77.1677) from the 26 monuments east of -77.18 is 2.5 km from `LOC-021` (39.8317, -77.1972); t560-565 cavalry rows sit 2.6-3.1 km west. Stacked units: 48 groups / 96 units on raw rows, 39 / 78 after last-writer-wins (what is drawn). **Renderer coupling missed:** the main map's `maxBounds` (`:97244`, [-77.36,39.72]-[-77.12,39.91]) already includes ECF, but the minimap hard-codes `Wa = {latMin:39.77, latMax:39.855, lngMin:-77.28, lngMax:-77.185}` (`:99664`), so ECF and approach-corridor units fall off the minimap; widening `map_extent` in data does not fix it. See MISSED-08 for the road layer. |
| DI-14 | **CORRECTED** | 103 keys / 117 redundant rows / 68 conflicting reproduced; merge order at `zp` `:96900-96915` (`[...placements, ...density]`; `addPlacementsForDay` `:9397` pushes both into the same tick array; `y1` is last-writer-wins). The interim rule "density > placements" holds only on the map: the eight static pages read only `placements_*` (MISSED-02), so they show the *losing* row. |
| DI-15 | **CORRECTED** | 512 records, 503 empty `src`, 51 blank `mn`, `MN 96` duplicated, 28 outside bbox, 26 east of -77.18, #512 honors text corrupted, 121,527 B as JSON, array at `:104440-110609`, `data/monuments.json` 9 rows + overlay `index.html:640-700` all reproduced. "13 identical coordinate pairs" is true only after rounding to 5 dp (10 exact at 6 dp). Source/licence caveats: Stone Sentinels (already cited by 3 of the 9 `monuments.json` rows) shows only "(c)2026 Steve A. Hawks" and no reuse licence - cannot be bulk-ingested without permission; HMDB returned HTTP 403 to automated fetch (terms not verifiable; scraping not advisable); Wikipedia text is CC BY-SA (share-alike). Immediately after the array (`:110610`) sits a hard-coded Google Maps API key constant `mO` - hand to the security plan when the array is moved out. |
| DI-16 | **CONFIRMED** | Tour `d2` `:104096` has 16 stops; stops 3 (Oak Ridge) and 5 (Virginia Memorial) lack `sv.pano`; `Gc` `:111819` ticks 1/17/28/267/538; `TO` `:112192`; roads `x4` `:9450` (6-point straight lines). |
| DI-17 | **CONFIRMED** | `US-010` keyed `U-II-1` (Caldwell) for Gibbon->Harrow (Gibbon = `U-II-2`); `US-013/014` keyed to brigade `U-II-2-1`; `US-018` `U-III-1-1`; `US-025` `U-XII-1-3`; `CS-016` `C-CAV` unresolved; 42 = 25 Union + 17 Confederate. The "15 of 42 not reflected in the chain" figure was not independently re-derived. |
| DI-18 | **CONFIRMED** | 222 no percentage, 22 no `parent_corps_id`, 27 no commander, 37 empty `days_engaged`, 169 `key_action` < 40, 20 x "Army reserve.", 31 regiments with `flag_notes`; `report.html:101`, `regiment.html:199`, `find-ancestor.html:121`, `historian.html:94` print raw IDs. |
| DI-19 | **CORRECTED** | 217 own / 250 not / 231 via parent / 19 neither reproduced. Batteries never placed: **65 of 103**, not 62 (the report's own s02 table has 33 + 5 = 38 placed). Frontage arithmetic checks (1,883 men x 0.045 yd = 77 m; 941 files x 0.55 m = 518 m; the ~22-inch/file figure still needs a drill-manual cite). |
| DI-20 | **CONFIRMED** | Typo counts reproduced (Krzyznowski 1 / Krzyzanowski 10; Nichols's 1 / Nicholls 10; Gulp's 1; Brian Farm 1; Rose Woods 19 / Rose's Woods 4). The `" -- "` count depends on field scope: 1,799 in non-metadata strings (861 `notes`, 490 `key_action`, 119 `full_script`, 99 `event`, 92 `fate`), 1,938 raw; the report's 1,591 is a defensible subset. |
| DI-21 | **CONFIRMED** (+bug) | Ledger linear ramp `living-ledger.html:102-118` and the tick-1 count (290/74 = 3.9) confirmed. Missed off-by-one in the same loop: MISSED-05. |
| DI-22 | **CONFIRMED** | V-019 and V-023 both trigger at 556 and share the "all my fault" quotation; V-023 contains "That night"; V-024 `units_featured: []`; the 7 vignettes without a featured-unit keyframe within +/-1 tick are exactly V-001, V-007, V-015, V-017, V-019, V-023, V-024; ticks not monotone with IDs; 249 `\n\n` breaks; `vignette_trigger` on 7 rows. |
| DI-23 | **CONFIRMED** | 17 of 71 files declare `metadata.sources` (the Confederate regiment files, `vignettes_part2/3` and every density/placements file do not); 29 distinct citation strings including three spellings of Busey & Martin. |
| DI-24 | **CONFIRMED** | Premise verified (no CI/validator; `netlify.toml [build] publish = "."`). Adopting `npm run data:check && npm run build` changes the publish directory and the deploy-zip workflow (case-mangled asset names, N1) - schedule together with DI-25. |
| DI-25 | **CONFIRMED** | `metadata.chunk` values are `001`..`049` plus `bonus_*` labels (70 files carry a chunk key); no authoring repo in either zip. |
| DI-26 | **CORRECTED** | 71 files / 824,704 B reproduced, but "160,243 B gzip-9" is a solid-archive (concatenated) figure; real per-file transfer is 199,009 B gzip-9 / 161,679 B brotli-11. Today's first-load set (14 OOB + terrain + 3 vignettes + 16 Day-1 files = 34 requests) is ~95.5 KB brotli, so the proposed budgets (first paint <= 80 KB, total <= 400 KB) are 16 % below today and 2.5x above today's *entire* data set - not performance targets; data is not the LCP bottleneck (the 2.28 MB script is), so "Moves LCP" is optimistic. Loader facts: Day 2/3 are already lazy (`zp(2)`,`zp(3)` `:96943-96946`); `zp` swallows failures (`.catch(() => ({ placements: [] }))` at `:96909`) so a renamed/hashed file silently yields an empty day; the file lists live in `eF/tF/nF` inside the bundle (`:96754-96831`) and in nine static pages. `/data/` is `Cache-Control: max-age=3600` (`netlify.toml`, live header confirmed) with a network-first SW cache `gbg-v5` that never expires, so code/data skew of up to 1 h exists today. |
| DI-27 | **CORRECTED** | Word counts re-derived within 3 % (regiment ranker text 8,150 vs 8,417; vignette ranker 1,603 vs 1,599; chronology location 434 vs 419; chronology event 4,236 / narrative 563; vignette scripts 7,205 vs 7,182) - tokenisation differences only. Licence statements: OR Vol. 27 public domain (US government) is sound; "NPS/HMDB terms" is UNVERIFIABLE (HMDB blocked, see DI-15); the ~300 person bios have no named source - if drawn from Wikipedia they are CC BY-SA (share-alike, per-passage attribution); Stone Sentinels has no stated licence. "Corpus >= 10x current words, 100 % sourced" means ~110k words / ~650 authored passages: XL is plausible only if bios and place essays are written in-house. |
| DI-28 | **CONFIRMED** | `historian.html:94`, `find-ancestor.html:121`, `regiment.html:199`, `report.html:101`, bundle `:101032` (`name: Jt.designation \|\| Jt.name \|\| It.unit_id`). |
| DI-29 | **CONFIRMED** | Backlog items are real. Add: B&M edition (Wikipedia cites the 2005 edition; the site cites 1994) and the Baxter-vs-Paul placement of the 11th PA. |
| DI-30 | **CONFIRMED** | Schema Charging Line union `#0044cc` vs `Lp` `#ff4422` (`:96307-96320`); `iA.dispositions` `:9345`. |

### MISSED issues (in scope, not in the report)

- **MISSED-01 (high) - The plan is internally inconsistent on the clock.** DI-01 acceptance ("<= speed cap x 5 min"), DI-09's `facts.json` (`minutes_per_tick: 5` beside `clock.json`), DI-10/21, and the site copy ("675 five-minute snapshots", `index.html:15,18,24,32,719,754`, `manifest.json:4`, schema "The 5-minute tick number") all assume 5 min/tick, while DI-11 adopts a piecewise clock with 0.8-42.3 min/tick (ticks 302-314: 0.8; 515-518: 42.3). Re-deriving speeds under that clock (`v01c.py`) gives 6 segments >8 mph and 33 >4 mph versus 2 and 16 on the linear clock. **Fix:** make an explicit owner decision - A: keep the warped clock, rename to "675 moments", and derive every speed/gap/percentage from `clockAt`; or B: re-tick all data onto a linear 5-minute clock with a monotone remap `tick' = f^-1(real_time)` applied to placements, events, vignettes, successions and markers, which keeps "five-minute" and the mph math. Decide before DI-01/DI-10/DI-21 start.
- **MISSED-02 (high) - Eight static pages plus the reference page read only `placements_*` (694 rows) and hard-code file names; the map reads 1,804 rows.** Evidence: `camera.html:68-70`, `cinematic-export.html:89-91`, `compare.html:101-109`, `ground-remembers.html:60-62`, `immersive.html:72-74`, `regiment.html`, `sandbox.html`, `watch-together.html`, `unit-rendering-reference.html` (no `density_` reference in any of them; `compare.html` also carries its own 5:00-am clock). Compare/Camera/Immersive therefore disagree with the map, and any merge/rename/hash of the placements files (DI-14, DI-26) breaks nine pages. **Fix:** add these pages to the DI-01/14/26 migration checklist; ship the merged track pack under the old file names (or update all nine in the same deploy) and add a per-page smoke test (unit count at tick 300 equals the map's).
- **MISSED-03 (medium-high) - Busey & Martin edition mismatch.** Wikipedia's wikitext attributes 23,231 / 4,708 / 12,693 / 5,830 to B&M's "more recent 2005 work", while every site file cites "(Longstreet House, 1994)". DI-03's reconciliation targets (23,055 / 23,231) and the per-regiment tables on the site may come from different editions. **Fix:** open both editions before fixing the headline; record edition + page per number in `authorities.json`; if the site's regiment rows are 1994-edition, say so and show the 2005 totals as a separate authority.
- **MISSED-04 (high) - Every renderer-side change needs source that does not exist (N1), and the report never schedules or costs it.** DI-01 (`y1/i2/F4` `:96238-96305`), DI-02 (19 `startsWith("U-")` sites), DI-06 (URL parser), DI-10 (`uF`), DI-13 (minimap `Wa` `:99664`) and DI-26 (`eF/tF/nF` `:96754-96831`) are edits inside a 2.28 MB minified bundle; RECON_SRC is an older build on mapbox-gl 2.x. **Fix:** add a prerequisite "DI-00 app source of truth" (reconstruct-and-diff against `bundle.pretty.js` with a behavioural test harness, or formally continue patching the bundle) with its own effort; until then mark 01/02/06/10/13/26 blocked.
- **MISSED-05 (medium) - Living Ledger over-counts every period by one tick's worth.** `living-ledger.html:106-113`: `span = max(1, end - start)` but the loop runs `for (t = start; t <= end; ...)` = span+1 iterations each adding `casualties / span`; final totals are **Union 23,550.2 vs 23,138 (+412)** and **Confederate 23,451.3 vs 23,025 (+426)** (`v21_ledger.py`, all 23 periods). The Ledger can never equal the Dashboard or any authority. **Fix:** divide by `(end - start + 1)` (or consume DI-21's `casualty_timeline.json`) and add a test that per-side increments sum to the period totals.
- **MISSED-06 (medium) - The crosswalk seed misses existing OOB records.** `crosswalk_seed.csv`: `U-8IL` (11 rows, the first-shot 8th Illinois Cavalry) -> `U-CAV-1-1` (medium, surname "Gamble") although `U-8IL-CAV` exists in the OOB; `U-12IL` (4 rows) is "none / needs new record" although `U-12IL-CAV` exists; `C-2LA` "none" although `C-2LA-T` exists; `C-38GA` -> `C-II-1-3` (medium) although `C-38GA-E` exists. Applying the seed would fold regiment rows into brigade IDs (creating (unit,tick) collisions) and inflates the "22 need new OOB records" bucket by >= 3. **Fix:** add the rule "OOB IDs with prefix `<placed-id>-`" ahead of surname matching, regenerate the seed, and never auto-map a regiment-shaped ID to a brigade.
- **MISSED-07 (medium) - The artillery OOB is incomplete; DI-07's "derive totals" would under-state.** Listed: Union 50 batteries / 278 guns + 5 horse / 28 = 306; Confederate 45 / 182 + 3 horse / 12 = 194. Wikipedia's infobox gives ~360 (Union) and ~270 (Confederate) guns; the site's own "approximately 370 / 283" are in that range. **Fix:** complete the battery lists from Gottfried, *The Artillery of Gettysburg* (already a cited source) before deriving totals; until then label derived counts "listed batteries" and keep the published approximations with a citation.
- **MISSED-08 (medium) - The road layer proposed in DI-01/DI-13 must be an 1863 layer.** DI-01 routes units along "the road graph (DI-13)" and DI-13(f) asks for `roads.geojson` with "source and licence recorded" but names none. A modern OSM/Mapbox road graph includes park avenues that post-date the battle (Confederate, Sedgwick, Hancock Avenues), so routed columns would march along roads that did not exist; Mapbox terms also restrict extracting tile geometry, and OSM is ODbL (attribution + share-alike). **Fix:** source an 1863 road trace (period maps such as Warren 1868 / Bachelder, or an NPS historic-road dataset if one exists - availability not verified here), hand-edit it, record the licence; use modern roads only as a visual aid.

### Items the verifier could not settle
- The "5/102 within 30 min" and "33-anchor MAE 21 min" figures belong to time-facts (`time-facts.md`) and were not re-derived beyond reading the anchor CSV.
- "15 of 42 successions not reflected in the OOB chain" (DI-17) and `flag_notes` = 60 were not independently recounted.
- The 11th Pennsylvania / 107th Pennsylvania placements are from general historical recollection, not a source; both stay in the DI-29 backlog.
- HMDB and NPS reuse terms (HMDB returned 403; no NPS monuments dataset located).
