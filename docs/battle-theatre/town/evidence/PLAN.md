# Plan of the evidence pass for OA10: the town, its buildings, the terrain changes and every structure as they were in July 1863

Generated from `tools/bt/town/PLAN.template.md`, `evidence/groups.json` and `evidence/EXAMPLES.jsonl` by `tools/bt/town/make_plan.py`; the numbers are those of the data on the day it was run (2026-11-14). Edit the template, not this file. Written by the planning step of the town and buildings workstream. Nothing is drawn differently because of this file: it plans the evidence, builds the instruments to check it, and hands each group of buildings to one pass.

## 0. What this is, in six lines

1. OA10 (owner chat, 2026-11-13; `GOVERNANCE/requirements.json`, handling `decision_log.md` DEC-OA10-12): the finished Battle Theatre has an accurate 3D representation of the whole battlefield as it stood during the battle: the town, every building, the terrain, every structure. The owner's word is "100% accurate"; the claim made to a user stays what the Law and DEC-003 allow: **documented** where a non-lead source states exactly that, **inferred**, **plausible-procedural**, every gap registered and visibly marked, nothing invented. The product never claims literal 100 percent.
2. The product draws a reconstruction today (section 1) whose every record is `seeded_unverified`: transcribed from the owner's plan, whose own text calls its rows "leads to verify". Of the 41 building and bridge records, **none has a verified claim** and 20 rest on a weak source (a lead).
3. This pass replaces that with evidence: one row per field per building, each row carrying its tier, its source, part, page, a verbatim quote matched in a local text, the character offset of the quote, and its conflicts (section 3).
4. The work is split into **21 groups** (section 6), one pass each, so that no building is worked twice and none is dropped: every one of the 605 catalogue structures, the 41 building and bridge records (one of them, the poorhouse record, split by its three parts into 43 items), 19 bridges, 8 railway records, 392 fence candidates, 32 roads and 23 lanes is assigned (`evidence/groups.json`).
5. `python3 tools/bt/town/validate_evidence.py <group>` (or `--all`) checks a group file mechanically: quotes found, offsets and pages right, sources not leads for a documented row, numbers in the quotes, tiers allowed, ids unique, conflicts on both rows, open gaps with failed searches. It has a self-test (`--self-test`: 67 synthetic cases, each rule with a refusing case, plus the real ledger, the examples and the group inventory).
6. What is **not** done here, and why, is in section 8; what only the owner can do is in section 12; the delegated decisions this plan makes are in section 11 and in `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`.

## 1. What the product draws now, and what the records say

Source: `app/STRUCTURES-3D-NOTES.md`, `app/data/structures3d.json`, `structures3d-inventory.json`, `structures/structures.json`, `docs/basemap1863/features/`.

| Class | Count | State in the product today |
|---|---|---|
| `structures.json` records | 130 | 41 building and bridge records (25 drawn as extruded footprints, 5 as a marker only, 11 not drawn: no geometry); 14 pre-existing walls and the unfinished grade (P-nn); 18 gun emplacements (G-nn) and 18 works (E-nn), which are another pass; 16 fence records (FEN-*); 8 road, avenue and railroad records; 6 states of the ground, crops, people and sky; 9 epilogue states |
| Catalogue structures (`docs/basemap1863/features/structures`) | 605 | 229 borough masses drawn flat (ink extent of the Warren plate, error 20 m); 40 extruded footprints (2023 outlines and traced outlines); 107 labelled markers (map-symbol and named points); not drawn: 129 outside the loaded ground, 73 machine-detected plate symbols not reviewed, 14 with no geometry, 13 rejected as not a building symbol |
| Fences and walls (candidates of the base map) | 392 | 30 lines drawn (confirmed on the period sheet: 30 lines, 6276 m); 356 not confirmed or shorter than 40 m; 6 outside the ground |
| Roads, lanes, railway, bridges | 32 roads, 4 lanes (+18 inventory-only), 8 railway records, 19 bridges | ground ribbons for 24 roads, 4 lanes and 2 railway lines; 8 bridge points as markers; 11 bridges, 7 roads outside the ground; 18 named lanes with no traced line; 3 railway records not in 1863 |
| Hospitals (`hospitals.json`) | 23 | 14 name a host building (11 drawn or marked, 3 with no geometry); 9 name none (corps sites, the town as one vast hospital, Camp Letterman) |
| Photographs (photo-match ledger) | 129 | camera positions documented: 0 (70 statements in LOC and NPS texts: not one a coordinate, a lens or a station); poses registered 16: 0 match, 5 roughly, 4 do not, 7 cannot judge |


What that means for the evidence:

- **The records are seeds.** `structures.json` says so itself (`seeded_unverified: transcribed from the PDF text; no primary source read`); its tier is "the printed tier AND at least one cited key outside the weak set", a mechanical rule. For the 41 building and bridge records, 20 printed `documented`, 19 `inferred`, 2 `open_gap`; 20 carry a weak source key (Wikipedia, forums, blogs, Stone Sentinels); `claim_support_verified` is false for all 41.
- **A position is a map reading, not a survey.** 40 buildings stand on an outline (the 2023 outline of the surviving building, or a traced outline; error 4 to 40 m; "the 1863 form may be smaller"); the 229 borough masses are the extent of the ink of the Warren plate (error 20 m, merging neighbours, possibly including buildings of 1863-69); 315 features are map-symbol points (error 10 to 110 m).
- **A form is generic.** Only five storey counts are documented in the drawing; heights, roofs, materials, openings are class defaults (`evidence/generic_rules.json`, constants from `STRUCTURES-3D-NOTES.md` section 6).
- **A state is a schedule row.** Burning, shell damage and hospital use come from `state_schedule.json` (seeded_unverified); no flame is drawn.
- **Parts of the field are not in the drawing at all**: 129 catalogue structures lie outside the loaded ground (6.2 x 6.1 km), 73 symbols are unreviewed, 14 have no geometry, 13 were rejected, the Pierce, Burns, Sweney-Rupp-McCreary houses, the belfry, St. Francis Xavier, Herbst, Biggs, the Granite Schoolhouse, Taney, Rummel and Daniel Lady farms have no footprint at all (11 of the 41 records), and the Rogers, Bliss, Wentz, Snyder farms and the Rock Creek trestle are a marker only (5 more: the 16 records without a footprint).

## 2. What the sources can give (and what they cannot)

The full ledger, with the class, the local path, the hash, the page model and the rights of every source, is `docs/battle-theatre/town/SOURCES.md`. The summary, by what a source is good for:

| Question about a building | Where the answer can lie | Local now | Reachable, to acquire | Not reachable |
|---|---|---|---|---|
| Did it stand in July 1863; since when; lost when | Hopkins 1858 inset and county map (existence at 1858, owner); Warren plate 1868-69 (existence at 1868-69); 1863 weeklies (advertisements, notices); Jacobs 1864; Official Records; NPS CLI/CLR/HSR; HABS; histories | Warren and Hopkins records and basemap catalogue (images not local: scans to fetch from tile.loc.gov); both weeklies of 1863 (61 issues); Jacobs; OR vol. 27; 73 NPS documents; 47 books | History of Cumberland and Adams Counties (1886), Rupp (1846), Hoke (1887), Sanborn 1886 ff., HABS data pages | ACHS name indexes (blocked host) |
| Who owned, rented, lived or traded there | Hopkins 1858 labels; Warren labels (OCR hints only); 1863 advertisements and notices; NPS farm histories; census (published totals only) | weeklies, NPS | Hopkins scans (hand reading) | the 1860 manuscript census (login), tax and deed indexes (ACHS), damage-claim files |
| Position and its error | basemap catalogue (footprint outlines, symbols, with leave-one-out error: 2.9 m inset, 16.5 m Warren); NPS site descriptions | catalogue and georeference transforms | Hopkins inset scan (`la000697`), Warren sheet | surveyed station coordinates of photographs (an owner step) |
| Kind, storeys, walls, roof, footprint, outbuildings | NPS CLI/CLR/HSR/HABS and NRHP descriptions (describe today's fabric: later), 1863 photographs (what is visible), advertisements of 1863-69 ("two-story brick dwelling"), Sanborn 1886+ (continuity), histories | 73 NPS texts, weeklies, photograph ledger (129 records, images in `tmp/photomatch`) | HABS drawings and data pages, Sanborn | the NRHP nomination of the Gettysburg Historic District (blocked host) |
| Damage, loopholing, burning, fortifying, hospital use, headquarters | Official Records reports (named buildings, days), Jacobs, weeklies and the national press of July-August 1863, NPS CLI/CLR/HSR, Hoke, Pierce, Bachelder guides, damage claims | OR vol. 27, weeklies, 476 pages of the national press of July 1863, NPS | more Chronicling America pages (loc.gov collection), Hoke | Pennsylvania damage-claim files and the ACHS claims index (blocked host / archives) |

Probes of 2026-11-14 (`GOVERNANCE/horde/ws-town/lookups.jsonl`): reachable and useful: www.loc.gov item and collection JSON (Hopkins, Warren, HABS: 68 records for "gettysburg pennsylvania", Sanborn Gettysburg 1886-1947, Civil War photographs, Chronicling America), archive.org (Hoke: 7 items; History of Cumberland and Adams Counties: 3 items; Rupp 1846; 1860 census volumes), www.npshistory.com (81 PDFs listed; 2 relevant and not local: the Gettysburg College land exchange study and the road inventory), www.nps.gov. **Blocked, recorded, not worked around:** gettysburghistory.org (Adams County Historical Society: damage-claim index, 1858 and 1872 name indexes, deed and tax indexes), npgallery.nps.gov (National Register nomination). The old chroniclingamerica.loc.gov search path answers 404; the loc.gov collection JSON is the working route.

**Where the words of each group occur in the local texts**: the count job (`tools/bt/town/local_coverage.py`, through `tools/horde/bench.sh`) was queued behind the machine lock when this file was written and had not returned; when it has, `evidence/coverage-local.json` lists for each group the texts with the most hits and the terms that hit, and rerunning `make_plan.py` puts the summary here. A hit count is a lead, not evidence.


## 3. The building evidence contract: `docs/battle-theatre/town/evidence/<group>.jsonl`

One JSON object per line, UTF-8. A file belongs to one group (`evidence/groups.json`); a row names it. **One row per field per building**: a field with several statements (two sources, two dates, two readings) has several rows. `python3 tools/bt/town/validate_evidence.py --schema` prints every vocabulary below as JSON; `evidence/EXAMPLES.jsonl` holds 27 real rows (every quote located by the validator itself) in the formats below.

### 3.1 Row types

| type | one row says | keys |
|---|---|---|
| `building` | "this building is worked here": its id and name | `row`, `type`, `group`, `building`, `name`, `declared_from` (`structures.json`, `basemap`, `groups.json`, `new`), `aliases`, `links` {structures, basemap, hospitals, timeline, register}, `see_also` (other groups), `new_reason`, `note` |
| `field` | one claim about one field of one building | `row`, `type`, `group`, `building`, `field`, `value`, `tier`, `evidence_kind`, `describes`, then the evidence keys of 3.3 |
| `search` | one search made and its outcome (a failed search is recorded as failed) | `row`, `type`, `group`, `building` (an id or `*` for the group), `where` (a source id or a host), `query` (the exact query or regular expression), `outcome` (`found`, `not_found`, `failed`, `blocked`, `not_read`), `at` (date), `found_rows`, `url`, `note` |

Row ids are `<group>.<four or more digits>` (`street-baltimore.0012`), unique across all groups. A building id is an id of the inventory of the group (a `structures.json` record id or part id `bld-...#part`, a basemap id `STR-...`, `BR-`, `RL-`, `RD-`, `LN-`, `FN-`, `FEN-`, `P-`) or a **new id `TWN-<PREFIX>-NNNN`** (the prefix is the group's, e.g. `TWN-BAL-0001`) declared with `declared_from: "new"` and a `new_reason`. A building of another group is not declared here: write a request note to that group's pass (`GOVERNANCE/horde/requests/bt-town-<group>-<short>.md`) or use `see_also`. Unknown keys are refused (a key starting with `x_` is an extension and needs `x_reason`).

### 3.2 The fields

Identity: `name`, `existed_july_1863` (`stood`, `not_yet_built`, `no_longer_standing`, `unknown`), `built`, `lost`, `occupant`, `owner`, `use`, `kind`, `identity` (for the identity conflicts of section 7). Place: `place` (`{"text", "lng", "lat", "error_m", "method"}`: coordinates need an error bound and a method; the point must lie in the battlefield box), `orientation`, `frontage`. Form: `storeys` (a number in steps of 0.5), `height`, `footprint` (`{"w","d","unit"}` or `{"area","unit"}`), `plan_shape`, `walls` (`{"material": brick, stone, granite, log, frame, board_and_batten, weatherboard, log_weatherboarded, stucco, plaster, iron, wood, mixed, other; "finish"}`), `roof` (`{"form": gable, hip, gambrel, shed, flat, mansard, cross_gable, lean_to; "material": wood_shingle, slate, tin, tile, thatch, board}`), `foundation`, `chimneys`, `openings`, `porch`, `tower_or_cupola`, `colour`, `additions`, `interior_change`, `outbuildings` (the kinds and, where stated, the places and sizes), `lot_enclosure`, `orchard_or_garden`, `sign`. State over time: `state` (below). Other structures: `span`, `surface`, `width`, `length`, `fence_type`, `wall_type`, `extent`, `terrain_change`. Photographs: `photograph` (`{"loc_id","shows"}`). Units: ft, in, m, yd, rods, acres, miles.

**State rows** (`field: "state"`) add `state` (intact, damaged, loopholed, burned, destroyed, demolished, fortified, barricaded, hospital, aid_station, headquarters, observation_post, signal_post, sniper_post, prison, occupied, abandoned, looted, fences_removed, stripped_for_fuel, other), `window` (`clock`: both times printed; `day`: a day; `part_of_day`; `period`: an interval stated by the source; `unknown`), `from` and `to` (local time `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`, null when the window is unknown), `transition` (`instant`, `progressive`, `none`), `detail`, `count` and `count_basis` for a stated count (bullet strikes, shell hits), `hospital_id` (H-nn). The time convention is the project's: local mean time as printed; no correction between the armies' clocks is made here. A window of kind `clock` or `day` needs both ends. **No part of a day is parsed into a clock time by the pass**: "morning" is `part_of_day` with the words in `detail`.

### 3.3 The evidence keys of a `field` row, and the tier rules

| tier | what it means | the row must have |
|---|---|---|
| `documented` | a non-lead source states exactly this (the value, for this building, for the time `describes` says) | `evidence_kind` `text` (a citation) or `image`/`map` (an observation: 3.5); the source's class is not `lead`; every number of a numeric value stands in a quote |
| `inferred` | derived from something documented by a stated step | a citation, an image or map reading, or `premises` (row ids of documented or inferred rows of the file), and `basis` of at least 20 characters saying what is inferred from what |
| `plausible-procedural` | filled in by a generic rule because the record is silent | `evidence_kind` `none` and `rule`: an id of `evidence/generic_rules.json` (a procedure, never a fact) |
| `open gap` | no source found | value `null`, `evidence_kind` `none`, `searched`: the ids of `search` rows of this file whose outcome is not `found` |

The tier is the weakest the row plainly earns. Never promote. The pass proposes a tier; the validator checks the mechanical conditions; the REPORT argues the rest.

A **text citation** is `source` (an id of `SOURCES.md`), `part` (the member of a family, the OR27 record id, or a short heading), `page` (the PDF page for texts with `=== PAGE n ===` markers, the printed page for the rest, or null with `page_note` for a text with no page marks), `quote`, `text_offset`, and optional `quote_mode`/`raw`/`ocr_note`/`page_image_viewed`. `also` is a list of further citations (they take part in the number check); `continuity` is one citation (3.6).

**The quote** is cut from the text, 20 letters and digits at least, 700 characters at most, and is found at the recorded offset after the program drops everything but letters and digits and compares them lower-case (so a line break, a double space, a hyphen at a line end, a different quotation mark or dash, a ligature or an accent does not matter). `[...]` (or `...`) inside a quote skips text between two fragments that are found in order (use it across a page head or a footnote). **OCR**: if the text layer is damaged, a quote of `quote_mode: "verbatim"` may repeat the damage; a corrected reading is `quote_mode: "ocr"` with `raw` (the excerpt exactly as the text has it, found at the offset), `ocr_note`, and a quote that differs from `raw` only by local character confusions (no difference longer than three characters); a correction that touches a digit needs `page_image_viewed: true` (the page image was opened and read). **The offset** is the character offset of the first character of the quote in the file decoded as UTF-8 with `newline=''` (the convention of `tools/bt/or27_lib.py`), up to 8 characters before the first letter; it tells apart two occurrences of one sentence. `python3 tools/bt/town/find_text.py <source id> "<regex>"` prints source, part, page and offset ready to copy (it finds in the original text, and for Official Records gives the record id and its printed pages). **The page** is checked against the markers for the Park Service texts, against the printed pages of the record for the Official Records, and is the printed page as read for the other texts.

**Numbers.** For `storeys`, `height`, `footprint`, `span`, `length`, `width`, `built`, `lost`, `additions`, `chimneys`, `openings`, `frontage`, `extent`, `terrain_change` and `state` counts, every number of the value must be written in a quote of the row (digits, number words, "two and a half", "a story and a half", fractions). A converted or derived number needs `derived: true` and `derivation` and cannot be documented.

### 3.4 What the time of a statement does (`describes`)

`before_1863` (the statement is of the building before the battle), `june_1863`, `july_1863` (the month of the battle: the battle days, the fires, the hospitals), `after_battle_to_1869` (up to the Warren survey), `later` (after 1869: a modern survey, a HABS record, a reconstruction), `undated`. **A statement about a later state cannot make an 1863 form documented**: a documented row whose `describes` is `later` or `undated` (identity, name, owner, occupant, use, existence, birth and loss excepted), or `after_battle_to_1869` for a form field (storeys, height, footprint, walls, roof, openings, chimneys, porch, cupola, outbuildings, fences and so on), needs `continuity`: a second citation that says the feature is unchanged since 1863. Without it the row is at best `inferred` with a `basis`. A rebuilt or reconstructed building (the Bryan house and barn, the Rose barn of 1910, the rebuilt walls of Culp's Hill, Little Round Top and Cemetery Ridge, the 1935 Spangler barn) is never an 1863 profile without a source that says the form is unchanged: it is a `later` row.

### 3.5 Photographs, maps and drawings (`evidence_kind` `image` or `map`)

`image_ref` = `{"source": a ledger id, "item": the record or sheet, "observation": what is seen, "viewed": true, "caption_names_building": true or false, "file", "sha256"}`. `viewed: true` is required: an image reading is made only from an image that was opened and looked at. A reading is **documented** only for what can be seen (`kind`, `storeys`, `walls`, `roof`, `porch`, `tower_or_cupola`, `chimneys`, `openings`, `colour`, `state`, `existed_july_1863`, `photograph`, `sign`), only when the record or caption itself names the building (`caption_names_building: true`), and never a measurement. A measurement (`footprint`, `height`, `place`, `span`, `length`, `width`, `frontage`, `extent`) read from a photograph or a map is at best `inferred` and needs `method` or `basis`: the photo-match ledger holds **no documented camera position, lens or station** (`GOVERNANCE/horde/ws10-photomatch/REPORT.md`). Staged photographs (the Devil's Den sharpshooter) are for terrain only. A photograph is never taken for the place it does not name.

### 3.6 Conflicts, identity, open gaps

- Two sources that disagree are **two rows**, each listing the other in `conflicts` (`[{"with": row id, "nature": what differs}]`); both stay, none is chosen, the integration step carries them as selectable scenarios. A conflict written on one row only is refused.
- An identity conflict (two farms with one name in the data, two names for one house) is a row of field `identity` on each building, in conflict (section 7).
- An open gap is a first-class row, never silence: the pass looked, where, and found nothing.

### 3.7 Completeness: `--complete`

`python3 tools/bt/town/validate_evidence.py <group> --complete` requires, for every declared building, at least one row (any tier, an open gap included) for each required field of its profile, chosen by the `kind` row: **building** (a house, barn, church...): `existed_july_1863`, `name`, `occupant`, `place`, `kind`, `storeys`, `footprint`, `walls`, `roof`, `outbuildings`, `state`; **mass** (`kind: building_mass`, an STR-BORO-MASS id): `existed_july_1863`, `place`, `kind`, `storeys`, `state`; **symbol** (`kind: map_symbol`): `existed_july_1863`, `place`, `kind`, `occupant`; **bridge**: `existed_july_1863`, `name`, `place`, `kind`, `span`, `walls`, `state`; **fence**, **wall**, **road**, **railway**, **terrain**: see `--schema`. A group is finished when `--complete` passes: nothing is narrowed, a gap is a visible row.

Examples (from `evidence/EXAMPLES.jsonl`; the passages were read in the local texts; they are formats to copy, not the evidence of a group):

*An inferred form row: the main block of a log farmhouse from a modern survey, with its basis (a statement of a later state is `describes: later`, so the row is not documented)*

```json
{
 "row": "farms-emmitsburg-road.9005",
 "type": "field",
 "group": "farms-emmitsburg-road",
 "building": "STR-KLINGEL-HOUSE1",
 "field": "footprint",
 "value": {
  "w": 26,
  "d": 21,
  "unit": "ft"
 },
 "tier": "inferred",
 "evidence_kind": "text",
 "describes": "later",
 "source": "NPS-CLI-ERR",
 "part": "Emmitsburg Road Ridge CLI, Evaluation of Buildings",
 "page": 81,
 "quote": "The building is a two-story log construction that measures 26 by 21 feet on a stone foundation with a shingle covered roof",
 "text_offset": 157059,
 "basis": "the main block of the c.1850 house as measured in the 2004 survey after the removal of the 1870s addition and of an undated lean-to; the lean-to may be earlier than 1863, so the 1863 outline is a probable, not a certain, reading"
}
```

*A documented state row with a one-day window*

```json
{
 "row": "farms-emmitsburg-road.9007",
 "type": "field",
 "group": "farms-emmitsburg-road",
 "building": "STR-KLINGEL-HOUSE1",
 "field": "state",
 "value": "fortified",
 "tier": "documented",
 "evidence_kind": "text",
 "describes": "july_1863",
 "source": "NPS-CLI-ERR",
 "part": "Emmitsburg Road Ridge CLI, Evaluation of Buildings",
 "page": 81,
 "quote": "On July 2, men of Carr’s Union brigade fortified themselves within the house during Confederate attacks, knocking out the chinking in the then exposed log walls",
 "text_offset": 157693,
 "state": "fortified",
 "window": "day",
 "transition": "instant",
 "detail": "chinking knocked out of the log walls to fire from the house",
 "from": "1863-07-02",
 "to": "1863-07-02"
}
```

*A documented row from the Official Records (page model `or27`: `part` is the record id; the quote lies in that record on that printed page)*

```json
{
 "row": "town-public-buildings.9002",
 "type": "field",
 "group": "town-public-buildings",
 "building": "bld-courthouse",
 "field": "tower_or_cupola",
 "value": "a cupola in the steeple of the court-house, reached by an observer",
 "tier": "documented",
 "evidence_kind": "text",
 "describes": "july_1863",
 "source": "OR27-1",
 "part": "OR27-1-R033",
 "page": 272,
 "quote": "From the cupola in the steeple of the court-house at Gettysburg I was an eye-witness of the movements of the rebel army",
 "text_offset": 928470,
 "detail": "report of Col. Henry A. Morrow, 24th Michigan Infantry, a prisoner in the town; the day of each view is not given in this sentence (the next sentences name the attack of Friday afternoon)"
}
```

*An inferred state row whose day is read from the sequence of a narrative (the basis says so)*

```json
{
 "row": "town-college.9002",
 "type": "field",
 "group": "town-college",
 "building": "bld-pennsylvania-hall",
 "field": "state",
 "value": "observation_post",
 "tier": "inferred",
 "evidence_kind": "text",
 "describes": "july_1863",
 "source": "JACOBS-1864",
 "part": "The third day",
 "page": 41,
 "quote": "During the day General Lee had reconnoitred our position from the College cupola",
 "text_offset": 71196,
 "basis": "the paragraph follows the cannonade that began at seven minutes past 1 p.m. on the third day of the narrative, so \"the day\" is read as 3 July; the page prints no date in the sentence",
 "state": "observation_post",
 "window": "day",
 "transition": "none",
 "detail": "General Lee at the cupola of the College building",
 "from": "1863-07-03",
 "to": "1863-07-03"
}
```

*A plausible-procedural row (a rule, no source) and an open gap with its failed search*

```json
{
 "row": "farms-emmitsburg-road.9009",
 "type": "field",
 "group": "farms-emmitsburg-road",
 "building": "STR-KLINGEL-HOUSE1",
 "field": "roof",
 "value": {
  "form": "gable"
 },
 "tier": "plausible-procedural",
 "evidence_kind": "none",
 "describes": "undated",
 "rule": "GR-ROOF-GABLE-30"
}
```

```json
{
 "row": "farms-emmitsburg-road.9011",
 "type": "field",
 "group": "farms-emmitsburg-road",
 "building": "STR-KLINGEL-HOUSE1",
 "field": "openings",
 "value": null,
 "tier": "open gap",
 "evidence_kind": "none",
 "describes": "undated",
 "searched": [
  "farms-emmitsburg-road.9010"
 ]
}
```

```json
{
 "row": "farms-emmitsburg-road.9010",
 "type": "search",
 "group": "farms-emmitsburg-road",
 "building": "STR-KLINGEL-HOUSE1",
 "where": "NPS-CLI-ERR",
 "query": "regular expression Klingle|Klingel followed within 300 characters of one sentence by window or windows, case-insensitive, whole text",
 "outcome": "not_found",
 "at": "2026-11-14",
 "note": "zero matches in the saved text (read 2026-11-14)"
}
```

*Two rows in conflict (identity of a farm; each names the other)*

```json
{
 "row": "farms-culps-hill-baltimore-pike.9002",
 "type": "field",
 "group": "farms-culps-hill-baltimore-pike",
 "building": "bld-spangler-farm",
 "field": "identity",
 "value": "George Spangler farm on the Hospital Road: the 2nd Division, 11th Corps hospital",
 "tier": "documented",
 "evidence_kind": "text",
 "describes": "july_1863",
 "source": "NPS-COMMON-PRIDE-2",
 "part": "Common Pride, vol. 2",
 "page": 184,
 "quote": "in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler . farm",
 "text_offset": 369033,
 "conflicts": [
  {
   "with": "farms-culps-hill-baltimore-pike.9003",
   "nature": "which farm the record and the hospital H-06 are drawn on"
  }
 ]
}
```

*An image reading (looked at; the caption names the college, not the hall, so the tier is inferred)*

```json
{
 "row": "town-college.9004",
 "type": "field",
 "group": "town-college",
 "building": "bld-pennsylvania-hall",
 "field": "tower_or_cupola",
 "value": "a square cupola above the roof of the pedimented building of the campus",
 "tier": "inferred",
 "evidence_kind": "image",
 "describes": "after_battle_to_1869",
 "image_ref": {
  "source": "LOC-PHOTO",
  "item": "2014646151 (ppmsca.35100), \"Pennsylvania College, Gettysburg. August, 1863\"",
  "file": "tmp/photomatch/loc/ppmsca.35100_v.jpg",
  "observation": "a long pedimented building with a square cupola rising above its roof, seen across a field; a two-storey house with a low hipped roof stands to its left; a post-and-rail style fence crosses the foreground",
  "viewed": true,
  "caption_names_building": false,
  "sha256": "b919caa3187504080ad8bedaf8f69a5d8d31b6e58a20893fb3a0d94594e8341a"
 },
 "basis": "the photograph is titled Pennsylvania College and shows one pedimented building with a cupola; that this is Pennsylvania Hall rests on the building being the large one of the campus, which the HABS record pa0009 is to confirm"
}
```



## 4. How each field is settled (the recipes)

**Existence in July 1863** (`existed_july_1863`). Documented: a text of June 1863 to 1869 says the building stood in or before July 1863 and was not built after (an account of the battle naming it, an official report, a weekly's notice). Inferred: it is drawn on **both** the Hopkins 1858 inset and the Warren plate of 1868-69 at the same place (the two maps bracket July 1863), or on one of them and named by a text of 1858-69 as unchanged; the `basis` names the two readings. Open gap: it is on the Warren plate only ("buildings erected between July 1863 and 1869 cannot be separated from those standing in July 1863"), or on neither. A building a source dates **after** July 1863 is `not_yet_built` and is never drawn in the July scene (nothing before its time); one a source says was gone by then is `no_longer_standing`. A building the pass finds that no record names is declared with a TWN id. **No building is removed from the drawing by this pass**: a building whose existence is an open gap stays as it is drawn now, marked, until a source says otherwise (DD-TOWN-02).

**Position and its error.** `place.method` says how: `outline_2023` (the 2023 outline of a surviving building: error 4 to 8 m for a building the NPS or HABS names, more where the 1863 form is not known), `warren_plate_symbol` (error `max(10, ...)` m by the basemap's rule, 20 m for a borough mass), `hopkins_inset` (affine on eight street junctions: leave-one-out 2.9 m inside the borough only), `hopkins_county` (leave-one-out 376 m: owners and sites, never a footprint), `described_offset` (a text places it: "two doors north of ...": a documented description with a position derived by the pass is `inferred`), `photograph_view`, `gazetteer_point`, `survey_or_drawing` (a HABS or NPS drawing). Documented position: only a text that states the place and an outline that the text identifies. The error bound is part of the row.

**Kind, storeys, walls, roof, footprint, outbuildings.** From the NPS description (today's fabric: `later`, needs continuity), a HABS record (later), an advertisement or notice of 1863-69 (describes `after_battle_to_1869`: inferred unless a continuity text exists), an 1863 photograph (what is visible), a Sanborn sheet of 1886 or later (continuity evidence only, never the 1863 state by itself), the survey of the building's date (NPS "built c.1850" plus "additions of the 1870s removed" supports an inferred 1863 core). Where nothing is found the form is generic: `plausible-procedural` with the named rule, and the product says so. **Never** derive an 1863 form from a rebuilt or modern building without a source that says the form is unchanged.

**State over time.** Every damage, fire, loopholing, fortifying, headquarters and hospital use is a row with its window, from the Official Records (the report of the day), Jacobs 1864, the weeklies and the press of July-August 1863, NPS reports (which say where they got it), later accounts as `inferred`. A count (bullet strikes, shell hits) is a documented count only if a text states it; a plan row's count that only a lead carries is not documented. Damage beyond a documented count is the renderer's plausible-procedural decal and is marked. **Hospital rows feed the hospital pass** (OA12, workstream bt-life-hospitals): the building id is the meeting point.

## 5. How a group pass works

1. Read this file, `evidence/EXAMPLES.jsonl`, your group in `evidence/groups.json` (members, targets, sources, queries, photographs, issues), the rows of `STRUCTURES-3D-NOTES.md` section 3 and 4 for your members, the plan rows (leads) in `BIBLE/plan-clean.txt` B.8.2 to B.8.4, and the fence and terrain results of other workstreams for your area (`GOVERNANCE/horde/fence-*/`, `terrain-*/`, `library/ROAD-CONCORDANCE.md`).
2. Declare every member (`building` rows), including the ones that are only a marker or a mass. Borough masses and map symbols get the short profiles of 3.7.
3. Start from what is already extracted: `python3 tools/bt/town/extracts_for_group.py <group> --out tmp/town-<group>/extract-candidates.jsonl` lists the Park Service extracts (`GOVERNANCE/horde/ws-web/nps/extracts/`, quote-verified by the web workstream) that name a structure of your group, each as a citation with the offset and page the validator will check (read the passage before you use it: an extract is a lead for your row, not your evidence). Then search the local texts with `find_text.py` (and `tools/bt/or27_find.py` for the Official Records); the ledger says where each source is. Keep what you read in `tmp/town-<group>/extracts.jsonl` (extract once: a passage read twice is a cost). The searches of section 2 that need the network go through the rules of `SOURCES.md` section 1 (one request per second, five for www.loc.gov); append each acquired source as a row at the end of `SOURCES.md` with a single `>>`, and put the file under `tmp/library/town/<id>/`.
4. For the borough groups: render an overlay of your masses and symbols on the Hopkins inset (affine in `docs/basemap1863/maps/transforms/hopkins-1858-gettysburg-inset.json`; the scan is LOC `la000697`, to fetch) and on the Warren plate, **open the crops and look** (`viewed: true`), and write the existence rows by the two-map rule of section 4. A mass that covers several buildings stays one mass; the pass does not invent the split.
5. Write the rows; run `python3 tools/bt/town/validate_evidence.py <group> --complete` until it passes; every `inferred` row has its basis, every conflict is on both rows, every gap has its search rows.
6. Write `evidence/<group>.REPORT.md`: counts by tier and by field, what was searched (with outcomes), what was not found, conflicts, generic rules proposed, and **proposed register entries** (`GOVERNANCE/horde/ws-town/proposed-register/<group>-EG-nn.md` in the format of `GOVERNANCE/register/EG-*.md`).
7. Do not edit `structures.json`, `structures3d.json`, `state_schedule.json` or the app: a needed change is a request note. Append one dated line to `GOVERNANCE/progress.md` per milestone.

The instruments (all in `tools/bt/town/`, all run with `python3 -I`, each with a `--self-test` where it has logic):

| File | What it does |
|---|---|
| `validate_evidence.py` | the contract: `<group>`, `--all`, `--file`, `--complete`, `--check-ledger`, `--schema`, `--self-test` (`validate_evidence_selftest.py`) |
| `find_text.py` | pattern search in a ledger source; prints part, page and `text_offset` for a row |
| `extracts_for_group.py` | Park Service extracts naming a structure of a group, as ready citations |
| `assign_groups.py` | writes `evidence/groups.json` from the data and `town_groups.py`; `--check` compares |
| `town_groups.py` | the hand-written definitions of the 21 groups (scope, targets, sources, queries, photographs, issues, anchors, street axes) |
| `build_sources.py` | writes the seeded part of `SOURCES.md` and `evidence/ledger-families.json` with the hash of every local text; keeps the appended rows |
| `local_coverage.py` | counts the words of each group in the local texts (through the machine lock) |
| `probe_hosts.py` | the host probes (every request logged in `GOVERNANCE/horde/ws-town/lookups.jsonl`) |
| `make_examples.py`, `make_plan.py` | regenerate `evidence/EXAMPLES.jsonl` and this file |

## 6. The 21 groups

Assignment rule (one primary group per structure): an id listed by hand goes to its group; a borough mass or a point inside the borough grid goes to the street group of the nearest street axis within 45 m (the axes are straight lines through the eight junctions of the Hopkins 1858 inset), else to the lanes group; a farm, outbuilding or map symbol outside the borough goes to the area group of the nearest anchor (a gazetteer place or a curated farm), whatever its distance; a building with a specialised group (church, college, seminary, railroad, tavern or hotel, mill or bridge, cemetery, public building) is worked there and only cross-referenced by the street or area group. Counts are of structures assigned; a group works all of them.

| # | group | prefix | records (parts) | borough masses | plate symbols | named structures | beyond the ground | bridges + rail | fence candidates | roads + lanes | hospitals |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `town-public-buildings` | PUB | 1 (1) | 0 | 0 | 10 | 9 | 0 | 0 | 0 | 0 |
| 2 | `town-churches` | CHU | 3 (1) | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 2 |
| 3 | `town-college` | COL | 1 (0) | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| 4 | `town-seminary` | SEM | 2 (0) | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 2 |
| 5 | `town-railroad` | RRD | 2 (0) | 0 | 0 | 1 | 0 | 8 | 0 | 0 | 0 |
| 6 | `town-taverns-hotels` | TAV | 0 (0) | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 |
| 7 | `town-mills-bridges` | MIL | 0 (0) | 0 | 0 | 2 | 1 | 19 | 0 | 2 | 0 |
| 8 | `town-cemeteries-gatehouse` | CEM | 1 (0) | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| 9 | `street-baltimore` | BAL | 3 (1) | 20 | 0 | 2 | 0 | 0 | 0 | 1 | 0 |
| 10 | `street-chambersburg` | CHA | 1 (0) | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 | `street-york-carlisle` | YRK | 0 (0) | 27 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 12 | `street-washington-stratton-breckenridge` | WSB | 0 (0) | 59 | 3 | 0 | 0 | 0 | 1 | 1 | 0 |
| 13 | `street-middle-high-lanes` | MHL | 0 (0) | 103 | 6 | 0 | 0 | 0 | 6 | 19 | 0 |
| 14 | `farms-seminary-mcpherson-herr` | FSW | 3 (0) | 0 | 84 | 6 | 46 | 0 | 39 | 7 | 1 |
| 15 | `farms-oak-ridge-north` | FNO | 0 (0) | 0 | 30 | 7 | 25 | 0 | 12 | 8 | 0 |
| 16 | `farms-east-hanover-york` | FEA | 1 (0) | 0 | 32 | 0 | 27 | 0 | 0 | 3 | 0 |
| 17 | `farms-culps-hill-baltimore-pike` | FCH | 5 (0) | 0 | 67 | 7 | 12 | 0 | 37 | 3 | 3 |
| 18 | `farms-cemetery-ridge-taneytown` | FCR | 5 (0) | 0 | 14 | 21 | 0 | 0 | 89 | 2 | 3 |
| 19 | `farms-emmitsburg-road` | FER | 6 (0) | 0 | 2 | 25 | 0 | 0 | 119 | 2 | 0 |
| 20 | `farms-wheatfield-round-tops` | FWR | 6 (0) | 0 | 25 | 21 | 8 | 0 | 89 | 7 | 3 |
| 21 | `terrain-changes-since-1863` | TER | 0 (0) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| | **total** | | 40 (3) | 229 | 263 | 113 | 129 | 27 | 392 | 55 | 14 |

"Named structures" are the curated farm buildings, town buildings and named sites of the catalogue (drawn or not: the three columns masses, symbols and named structures add up to the 605 structures; "beyond the ground" is a part of them, not a further class); "plate symbols" are the machine-detected and hand-reviewed symbols of the Warren plate (owner labels are OCR hints). The structures of `STR-*` that are not in a group of this table: none (605 of 605 assigned).


Not worked here (the 56 records of `structures.json` that are not standing structures, with the reason each; `groups.json` `not_worked_here`): the 18 gun emplacements (G-nn) and the 18 works of the construction chronology (E-nn) (B.7: built on screen by the works pipeline, OA11, never pre-placed), the 9 epilogue states, the 4 states of crop, group, person and world (other layers), and the 7 road and railway records whose lines are assigned in the table.

### Notes per group

#### `town-public-buildings`: Public and institutional buildings: court house, prison, almshouse, schools, banks, halls

The Adams County court house (record bld-courthouse; basemap STR-TOWN-COURTHOUSE, 2023 outline, error 8 m; the plan row says built 1858, Italianate, two storeys, about 70 ft clock tower, command post and hospital for both sides: every word of it rests on Wikipedia, a lead), the county prison, the almshouse complex north of the borough (basemap STR-ALMSHOUSE-COMPLEX_BUILDING1..9, nine Warren-plate symbols, error 45 m; the plan row says "no source retrieved"), public and private schools, banks, the post office, engine houses, market house and halls.

- Sources to read first: JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, OR27-1, HOPKINS-1858-INSET, WARREN-1869, HISTORY-ADAMS-1886, RUPP-1846, HOKE-1887, HABS-pa0004, SANBORN-1886.
- Photographs of the ledger to read (LOC ids): 2014646001, 2014646002, 2018671576.
- New ids: `TWN-PUB-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: PDF rows rest on Wikipedia (lead): none of the court house particulars is documented until a local text carries it.
- Issue: The 2023 outline of the court house is not the 1863 form unless a source says it is unchanged.
- Issue: The almshouse complex is nine symbols with a 45 m error: the pass decides which symbols are almshouse buildings and which are not.

#### `town-churches`: Churches of the borough, their belfries and their use as hospitals

Presbyterian Church (record bld-presbyterian-church; basemap STR-TOWN-PRESBYTERIAN_CHURCH, error 40 m, confidence Contested; "208 Baltimore St"), Christ Lutheran Church (STR-TOWN-CHRIST_LUTHERAN, error 18 m; the basemap carries a street-number conflict, 30 versus 44 Chambersburg Street), St. Francis Xavier Catholic church (no geometry), the town church belfry used by snipers (no geometry), and every other church standing in July 1863 (Methodist, Reformed, African, others: the list is itself a finding of the pass: Hopkins 1858 inset, Jacobs 1864, the 1863 papers). Interiors changed for hospital use (pews removed, boards laid) belong to the building rows as states.

- Sources to read first: JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, TPIERCE-1889, HOSPSCENES-1864, HOPKINS-1858-INSET, WARREN-1869, HISTORY-ADAMS-1886, RUPP-1846, HOKE-1887, NPS-CARE-WOUNDED-GUIDE, SANBORN-1886.
- Photographs of the ledger to read (LOC ids): 2014646001, 2014646002.
- New ids: `TWN-CHU-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Presbyterian church site: the basemap confidence is Contested; the error bound is 40 m.
- Issue: Christ Lutheran: 30 versus 44 Chambersburg Street in the sources of the basemap; the 1863 form of the church is unknown (2023 outline, error 18 m).
- Issue: Every hospital-use row feeds the hospital pass (OA12, workstream bt-life-hospitals): rows carry the building id so the two passes meet.

#### `town-college`: Pennsylvania College: Pennsylvania Hall and the other buildings of the campus

Pennsylvania Hall (record bld-pennsylvania-hall; basemap STR-TOWN-PENN_HALL, the main block of the 2023 outline, error 4 m, wings of 1889 left out; the plan row: designed 1835, built 1837-38, Greek Revival, four storeys, 150 x 45 ft, four-column south portico, cupola; signal officers June 30; hospital to about 29 July with about 700 casualties: every word from Wikipedia, a lead), the other campus buildings of 1863 (to be found: Hopkins inset, Jacobs 1864, the HABS record), the campus fences and grounds, and the photograph of Pennsylvania College of August 1863 (LOC 2014646151).

- Sources to read first: JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, HOPKINS-1858-INSET, WARREN-1869, HABS-pa0009, HISTORY-ADAMS-1886, HOKE-1887, NPS-GETTYSBURG-COLLEGE-EA-1995, SANBORN-1886, OR27-1.
- Photographs of the ledger to read (LOC ids): 2014646151, 2014646001, 2014646002.
- New ids: `TWN-COL-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The 2023 outline omits the wings of 1889 (basemap status main_block_drawn_wings_1889_omitted); the 1863 plan and form must come from HABS or a text that dates the wings.
- Issue: The photograph of August 1863 is the best evidence of the 1863 appearance and is a picture: a reading of it is an observation row (evidence_kind image), never a measurement.

#### `town-seminary`: The Lutheran Theological Seminary on Seminary Ridge and its neighbours: Schmucker Hall, Thompson house, Schultz house

Schmucker Hall ("Old Dorm"; record bld-schmucker-hall; STR-TOWN-SCHMUCKER_HALL, 2023 outline, error 4 m; cupola as observation post; hospital; about seven hundred patients: plan row, Wikipedia and other leads), the professors' houses and other seminary buildings of 1863 (to be found), the Thompson house (Lee's headquarters; record bld-thompson-house; STR-TOWN-THOMPSON_HOUSE), the Schultz house (STR-TOWN-SCHULTZ_HOUSE, named in the basemap as an Oak Ridge Academy building: to be checked) and the Sheads house (STR-TOWN-SHEADS_HOUSE, traced outline).

- Sources to read first: JACOBS-1864, OR27-1, OR27-2, TPIERCE-1889, LONG-GBV-1891, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, HOSPSCENES-1864, FREMANTLE-1864, NPS-CLI-1STDAY, NPS-CLR-1STDAY, NPS-CLI-LANDSCAPE, HOPKINS-1858-INSET, WARREN-1869, HABS, HISTORY-ADAMS-1886.
- Photographs of the ledger to read (LOC ids): 2018670707, 2018666297, 2018670772, 2012648410, 95503135, 2018666299.
- New ids: `TWN-SEM-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The Brady "hole" in the cupola photograph is a negative defect, not damage (plan row); read it from the photograph itself, not from the plan.
- Issue: The Thompson house: the plan row says the interior fire of 1896 is not the battle; a fence-burning statement (no date) is documented only by a lead.
- Issue: Photograph 2018666299 ("G.J. White's house") has no stated place: do not assign it to a farm without a text that places it.

#### `town-railroad`: The Gettysburg Railroad: depot, track, trestle, bridges and the unfinished grade with its cuts

The railroad station on Carlisle Street (record bld-rr-station; STR-TOWN-DEPOT, 2023 outline, error 6 m; RL-006 depot marker, error 15 m), the line of the Gettysburg Railroad (RL-001) and the unfinished grade west of the borough (RL-002, record P-12: the cut itself is part of the modern ground model), the Rock Creek trestle burned on 26 or 27 June (RL-007, record bld-rock-creek-rr-bridge), freight and engine buildings, culverts and bridges of the grade, the cuts and fills as they stood in 1863 (depth, length), the post-1863 lines never drawn (RL-003, RL-005, RL-004) and the unknown extent RL-002W.

- Sources to read first: JACOBS-1864, OR27-1, OR27-2, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, NPS-CLI-1STDAY, NPS-CLR-1STDAY, NPS-CLI-LANDSCAPE, NPS-CLR-ROT-V1, HOPKINS-1858-INSET, WARREN-1869, HABS, HISTORY-ADAMS-1886, SANBORN-1886, HOKE-1887.
- Photographs of the ledger to read (LOC ids): 2018670663, 2014646000, 2018670696, 2018672108.
- New ids: `TWN-RRD-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Burned 26 versus 27 June (plan row: sources vary): carry both as a conflict, never one.
- Issue: Traffic resumed 10 July per one passage and 1865 per another (plan row: internally inconsistent).
- Issue: The depot of 2023 is altered (one-storey addition of 1886 per the plan row, Wikipedia): the 1863 form is not the 2023 outline.
- Issue: Photograph 2018670663 shows Hanover Junction, not Gettysburg: it is context for burned bridges, not evidence for a Gettysburg building.
- Issue: The Sanitary Commission offices (three photographs) stood somewhere near the depot: a place claim needs a text.

#### `town-taverns-hotels`: Taverns, hotels and inns of the borough and the roads

Hotels of the borough in July 1863 (names counted in the 1863 papers: Globe Hotel, Eagle Hotel, Howard House, Mansion House, Clellan's Hotel; whether each is a Gettysburg hotel is for the pass to read), Black Horse Tavern on the Fairfield road (STR-TOWN-BLACK_HORSE_TAVERN, 2023 outline, error 8 m), Herr's Tavern (Warren label HERR TAVERN, two symbols), the Springs Hotel (Warren label SPRING, two symbols; the Park Service study "The Significance of the Harmon Farm and the Springs Hotel Woods"), the Dobbin House (STR-TOWN-DOBBIN_HOUSE, traced outline). A hotel on a borough street is worked here, not in the street group.

- Sources to read first: GBG-COMPILER-1863, ADAMS-SENTINEL-1863, JACOBS-1864, FREMANTLE-1864, OR27-2, NPS-HARMON-FARM, HOPKINS-1858-INSET, WARREN-1869, HISTORY-ADAMS-1886, RUPP-1846, HOKE-1887.
- New ids: `TWN-TAV-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The basemap carries the Black Horse Tavern as a surviving building with a 2023 outline: its 1863 form is a question, not an answer.

#### `town-mills-bridges`: Mills, mill dams and bridges of Rock Creek, Willoughby Run, Stevens Run, Plum Run and Marsh Creek

McAllister's Mill (STR-SITE-MCALLISTER_MILL, named point, error 150 m: grist and saw mills with two dams), the Sachs mill and covered bridge on Marsh Creek (STR-SITE-SACHS_BRIDGE; outside the loaded ground), Hereter's mill (road RD-011), Horner's mill and the Rock Creek covered bridge of 1841 (plan B.8.4), and the bridges and fords of the basemap (BR-001..BR-015: BR-002 Baltimore Pike over Rock Creek, documented, error 70 m; BR-006 and BR-007 over Rock Creek; BR-011 and BR-015 on Willoughby Run; BR-004, BR-009, BR-013 over Stevens Run, open gaps; 11 outside the loaded ground), the Plum Run crossings (a plan gap) and the mill races and dams.

- Sources to read first: OR27-1, OR27-2, OR27-3, NPS-CLR-1STDAY, NPS-CLI-1STDAY, NPS-CLI-ERR, NPS-CLR-ROT-V1, NPS-ROCK-CREEK, JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, WARREN-1869, HOPKINS-1858-COUNTY, HISTORY-ADAMS-1886, RUPP-1846, HABS.
- New ids: `TWN-MIL-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Road-bridge widths and spans are open gaps in the plan; none is a generic number until the group REPORT names the generic rule.
- Issue: The basemap bridge points carry 30 to 70 m error: a position row says so.

#### `town-cemeteries-gatehouse`: Cemetery Hill: Evergreen Cemetery, the gatehouse and its pavilion, the walls and fences, other burial grounds

The Evergreen Cemetery gatehouse (record bld-evergreen-gatehouse; STR-TOWN-GATEHOUSE, 2023 outline, error 4 m, a right-side addition since; plan row: Italianate, finished November 1855, moderate damage on the evening of 2 July), the pavilion beside it (STR-TOWN-GATEHOUSE_PAVILION, photograph pose, lost), the cemetery fences and the monuments that stood in July 1863 (FEN-evergreen-cemetery, ENV-evergreen-cemetery), the stone walls of Cemetery Hill (P-02, P-03), brickyards and other buildings on the hill, and every other burial ground of the borough. The Soldiers' National Cemetery was laid out after the battle: it is recorded as a later feature and never drawn in the July scene.

- Sources to read first: OR27-1, JACOBS-1864, NPS-CLI-CEMETERY, NPS-CLR-CEMETERY, NPS-CEM-ENCLOSURES, NPS-HCSR, NPS-CEM-DEDICATION, CEM-REPORT-1867, CEM-BARTLETT-1874, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, HOPKINS-1858-INSET, WARREN-1869, HABS, HISTORY-ADAMS-1886.
- Photographs of the ledger to read (LOC ids): 2012647705, 2018666300, 2018670702, 2014646001, 2018671576.
- New ids: `TWN-CEM-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Photograph pose registers P03 and P26 (gatehouse) are "cannot judge": no camera position is documented; the 2023 outline merges the lodge and the pavilion.
- Issue: The plan row for the gatehouse damage rests on Wikipedia and "NPS: moderate damage": the NPS text must be found in a local report.

#### `street-baltimore`: Baltimore Street from the Diamond to the cemetery gate

Every building on both sides of Baltimore Street south of the Diamond (the borough masses within 45 m of its axis, and the named houses: the McClellan house of Jennie Wade, 548 Baltimore Street, record bld-wade-house; the Garlach house; the Pierce house at Baltimore and Breckenridge; the Sweney, Rupp and McCreary houses; the Wills house, whose place is to be confirmed) and its fences. Churches, hotels, the court house and other specialised buildings on the street are worked in their own groups.

- Sources to read first: JACOBS-1864, TPIERCE-1889, PIERCE-F-1914, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, OR27-1, OR27-2, HOPKINS-1858-INSET, WARREN-1869, HOKE-1887, HISTORY-ADAMS-1886, SANBORN-1886, HABS.
- Photographs of the ledger to read (LOC ids): 2014646001, 2014646002, 2018671576.
- New ids: `TWN-BAL-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Borough masses (error 20 m) merge neighbouring buildings and may include buildings of 1863-69: an existence row for a mass is inferred at best and says which map shows it.
- Issue: 150+ bullet strikes on the Wade house are a plan count from Wikipedia: documented only from a local text.

#### `street-chambersburg`: Chambersburg Street, west of the Diamond to the borough edge

Every building on both sides of Chambersburg Street from the Diamond to the west end of the borough (borough masses within 45 m of its axis; the Burns house, record bld-burns-house, razed after his death; the houses where first-day soldiers fought, sheltered or were wounded: to be found) and their fences. Christ Lutheran and any hotel on the street are worked in their own groups.

- Sources to read first: JACOBS-1864, TPIERCE-1889, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, OR27-1, OR27-2, HOPKINS-1858-INSET, WARREN-1869, HOKE-1887, HISTORY-ADAMS-1886, SANBORN-1886.
- Photographs of the ledger to read (LOC ids): 2018670711, 2018666316, 2018670710.
- New ids: `TWN-CHA-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The Burns house stood on Chambersburg Street per the plan row (Wikipedia, a lead): its place needs a text and a map reading.

#### `street-york-carlisle`: York Street (east of the Diamond) and Carlisle Street (north), with the Diamond

Every building on York Street from the Diamond to the east end of the borough and on Carlisle Street from the Diamond north (the borough masses within 45 m of either axis), the buildings facing the Diamond on the north and east, and their fences. The railroad station on Carlisle Street, the college and any hotel are worked in their own groups.

- Sources to read first: JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, OR27-1, OR27-2, HOPKINS-1858-INSET, WARREN-1869, HOKE-1887, HISTORY-ADAMS-1886, SANBORN-1886.
- Photographs of the ledger to read (LOC ids): 2014646002.
- New ids: `TWN-YRK-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The Diamond was a plain crossing in 1858 (basemap check against the Hopkins inset), a roundabout today: nothing drawn at the Diamond comes from the modern layout.

#### `street-washington-stratton-breckenridge`: Washington Street, Stratton Street and Breckenridge Street

Every building on Washington Street (west of Baltimore Street, the street the Taneytown Road enters), Stratton Street (east) and Breckenridge Street (the southern east-west street) within the borough grid, and their fences. The college campus and specialised buildings are worked in their own groups.

- Sources to read first: JACOBS-1864, TPIERCE-1889, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, OR27-1, OR27-2, HOPKINS-1858-INSET, WARREN-1869, HOKE-1887, HISTORY-ADAMS-1886, SANBORN-1886.
- New ids: `TWN-WSB-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Stratton Street runs east of Baltimore Street on the Hopkins inset control points: the group does not assume the modern street names for lanes beyond the eight junctions.

#### `street-middle-high-lanes`: West and East Middle Street, High Street, and the lanes and alleys of the borough

Every building on Middle Street and High Street (both halves) within the borough grid, every building on lanes and alleys (borough masses farther than 45 m from every named street axis), outbuildings, shops, stables and back lots, and their fences. The group also takes any borough mass the street groups cannot place.

- Sources to read first: JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, OR27-1, HOPKINS-1858-INSET, WARREN-1869, HOKE-1887, HISTORY-ADAMS-1886, SANBORN-1886.
- New ids: `TWN-MHL-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Lane and alley names are not in the repository (18 named lanes of the basemap have no traced line): names come only from a text.

#### `farms-seminary-mcpherson-herr`: West of the borough: Seminary Ridge, McPherson Ridge, Herr Ridge and the Willoughby Run farms

The McPherson farm (record bld-mcpherson-farm; barn STR-MCPHERSON-BARN1 survives; farmhouse burned 1895 per the NPS; central wagon shed lost), the McMillan farm (STR-MCMILLAN-*), the Herbst woods and buildings (record bld-herbst), the farms along the Chambersburg Pike and the Hagerstown, Hereter's Mill and Black Horse Tavern roads (Warren labels: Herr, Leafer, Bender, Grist, Dustman, Tate, Kirk, Hoffman, Harman, Herbst, Plank, Currans and others), their fences (Thompson, McMillan, Seminary Ridge, Gamble's cavalry fence, McPherson / railroad-grade fences, Chambersburg Pike), the wall P-07 on Oak Ridge.

- Sources to read first: NPS-CLI-1STDAY, NPS-CLR-1STDAY, NPS-HS-MCPHERSON, NPS-MCMILLAN-HOUSE, NPS-HARMON-FARM, NPS-CLI-LANDSCAPE, NPS-HSR-MCCLEAN-BARN, OR27-1, OR27-2, JACOBS-1864, TPIERCE-1889, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, HOPKINS-1858-COUNTY, WARREN-1869, HABS-pa0008, PA-GB-1904.
- Photographs of the ledger to read (LOC ids): 2012646949, 2012647718, 2012647719, 2012647706, 2018670706, 2018671419.
- New ids: `TWN-FSW-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The McPherson barn did not burn on 1 July and the farmhouse burned in 1895 (plan, B.8.1 corrections): never draw a later event in the battle.
- Issue: The Warren labels are OCR hints (HERBST, LEAFER, BENDER...): a name is used for a building only when a local text names the same occupant.

#### `farms-oak-ridge-north`: North of the borough: Oak Ridge, Oak Hill, Blocher's Knoll, the Carlisle, Mummasburg and Harrisburg roads

The Forney, Hagy and McLean farms (basemap farm keys forney, hagy_beams, mclean), the Warren-plate farmsteads north of the borough (labels Blocher, Crawford, Kitsman, Josiah, Schaffer and others: OCR hints), the buildings of the first-day northern fight, and their fences and lanes.

- Sources to read first: NPS-CLI-1STDAY, NPS-CLR-1STDAY, NPS-CLI-LANDSCAPE, NPS-MCCLEAN-HOUSE-BARN, NPS-HSR-MCCLEAN-BARN, OR27-1, OR27-2, JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, HOPKINS-1858-COUNTY, WARREN-1869, PA-GB-1904.
- Photographs of the ledger to read (LOC ids): 2014646002.
- New ids: `TWN-FNO-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Many Warren symbols north and north-east of the borough are outside the loaded ground: they are worked here and flagged "beyond the ground", never dropped.

#### `farms-east-hanover-york`: East of Rock Creek: Benner's Hill, the Hanover Road, the York Pike, East Cavalry Field (Rummel)

The Rummel farm (record bld-rummel-farm: the barn survives, Stuart's men cut loopholes in the planking on 3 July; fences destroyed), the Benner, Wolf, Monfort, Mummard, Erbst, War and other farmsteads of the Warren plate east of the borough (OCR labels), the farm lanes and fences, and the farms along the Hunterstown and Low Dutch roads that stood within the battlefield of 3 July.

- Sources to read first: OR27-1, OR27-2, NPS-CLI-LANDSCAPE, NPS-ADHI, JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, HOPKINS-1858-COUNTY, WARREN-1869, PA-GB-1904, PA-GB-1914-v2.
- New ids: `TWN-FEA-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The Rummel loopholes (S-054) are documented only through Stone Sentinels (a lead): find the report or the NPS text.

#### `farms-culps-hill-baltimore-pike`: Culp's Hill, Spangler's Spring, Rock Creek and the Baltimore Pike east of Cemetery Hill (Culp, Spangler, Lady, Taney, Granite Schoolhouse)

The Henry Culp farm (record bld-henry-culp-farm; STR-CULP-*; five symbols, error 45 m), the George Spangler farm (the XI Corps hospital: record bld-spangler-farm; IDENTITY ISSUE TW-ID-01 below), the Granite Schoolhouse (record bld-granite-schoolhouse; razed 1921; no geometry), the Taney farm (record bld-taney-farm), the Daniel Lady farm (record bld-daniel-lady-farm: Confederate field hospital; plan row "documented (hospital); open gap (details)"), the Guinn farm (STR-LOST-GUINN_FARM), the Baltimore Pike farmsteads of the Warren plate (labels Signad, Ens, Pfeifer, Lightner, Cassalt, Heck, Wolf, Conover, Horn and others: OCR hints), the Rock Creek and White Run hospital complex (H-17) as buildings, the stone walls P-08, P-09 and the farm lanes.

- Sources to read first: NPS-SPANGLERS-SPRING, NPS-HS-SPANGLER-HENRY, NPS-CLI-LANDSCAPE, NPS-CLR-CEMETERY, NPS-ADHI, OR27-1, OR27-2, JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, WARREN-1869, HOPKINS-1858-COUNTY, HABS, PA-GB-1904, NY-GB-1900.
- New ids: `TWN-FCH-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: TW-ID-01 (identity): the record bld-spangler-farm and hospital H-06 carry the details of George Spangler's farm (plan row: Hospital Road, 166 acres, XI Corps hospital, bank barn with 7 ft forebay); the product draws it on the geometry STR-SPANGLER_H-* which the NPS historical statement (NPS-HS-SPANGLER-HENRY, p.2, OCR text) places "between the Emmitsburg Road and Seminary Ridge", north of the Sherfy farm and south of the Codori farm, and the gazetteer "Spangler farm" lies there too. The two farms are different places. Neither reading is chosen here: the pass reads both farms from local texts and carries the identity as a selectable conflict (Law cl.6).
- Issue: The Warren plate labels symbols near the Baltimore Pike "HENRY SPANGLER" (OCR hints, five symbols about 1.9 km south-east of the Diamond): the label does not decide which Spangler owned it in 1863.

#### `farms-cemetery-ridge-taneytown`: Cemetery Ridge and the Taneytown Road: Leister, Hummelbaugh, Bryan, Biggs, Weikert, Frey, Patterson

The Leister house and barn (Meade headquarters; record bld-leister-house), the Hummelbaugh farm (II Corps hospital), the Bryan (Brien) farm, the Biggs house, the George and John Weikert farms (V Corps 2nd Division hospital), the Frey and Patterson farmsteads of the Warren plate, the Fisher log house, their fences and walls (Leister, Brian, the Cemetery Ridge walls, the Angle wall P-01, the Leister photograph wall P-13), and the Taneytown Road buildings south to the Round Tops.

- Sources to read first: NPS-HSR-LEISTER-BARN, NPS-BRIEN-FARM, NPS-BRYAN-HOUSE, NPS-CLI-PCB, NPS-CLR-ROT-V1, NPS-CLR-ROT-V2, NPS-CLI-LANDSCAPE, NPS-CARE-WOUNDED-GUIDE, OR27-1, OR27-2, TPIERCE-1889, JACOBS-1864, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, WARREN-1869, HOPKINS-1858-COUNTY, HABS-pa2627, MEADE-LL-v2, NY-GB-1900, PA-GB-1904.
- Photographs of the ledger to read (LOC ids): 2018666296, 2018672035, 2018671488, 98519365, 2018666298, 2012647702.
- New ids: `TWN-FCR-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The Leister house of 1863 was two rooms of wood; the later two-storey addition is not 1863 (plan row; NPS).
- Issue: The Bryan house and barn are reconstructions (plan row; NPS-BRYAN-HOUSE restoration report): reconstruction dimensions are not 1863 dimensions without a text that says so.
- Issue: Photographs 2018666296 (Leister: "roughly" in the photo-match ledger) and 2018666298 (Bryan: cannot judge) are evidence for what is visible, never for a measurement.

#### `farms-emmitsburg-road`: The Emmitsburg Road farms: Codori, Klingel, Rogers, Bliss, Sherfy, Wentz, Henry Spangler, Staub

The Codori farm (house of 1834 and brick addition of 1877, barn taken down 1882), the Klingel farm (log house; wounded sheltered; fences gone), the Rogers house (log; cellar used for wounded; torn down in the 1880s), the Bliss house and barn (burned on 3 July), the Sherfy house and barn (barn burned; orchard), the Wentz log house, the Henry Spangler farm (STR-SPANGLER_H-*: house, barn burned in the battle, smokehouse, stable; see TW-ID-01 in the Culp's Hill group), the Staub farm, the double post-and-rail fences of the road (FEN-emmitsburg-road, FEN-klingle, FEN-sherfy-orchard, FEN-warfield) and the walls P-10, P-11.

- Sources to read first: NPS-CLI-ERR, NPS-CLI-PCB, NPS-CLR-ROT-V1, NPS-CLR-ROT-V2, NPS-EXTENSION-1940, NPS-HS-SPANGLER-HENRY, NPS-BRIEN-FARM, NPS-COMMON-PRIDE-1, NPS-TPG-COMMEM, OR27-1, OR27-2, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, WARREN-1869, HOPKINS-1858-COUNTY, HABS-pa2625, NY-GB-1900, PA-GB-1904.
- Photographs of the ledger to read (LOC ids): 2018666303.
- New ids: `TWN-FER-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: TW-ID-01: see the Culp's Hill group: STR-SPANGLER_H-* is carried here as Henry Spangler's farm on the evidence of NPS-HS-SPANGLER-HENRY and the gazetteer; the hospital details of the plan row belong to the farm worked in farms-culps-hill-baltimore-pike.
- Issue: Sherfy and Bliss fire times conflict (plan B.8.2; DD-PD rows): carry every reading, choose none.
- Issue: The Codori barn of 1863 was smaller and was torn down in 1882: the basemap point is the barn "standing in 1868-69", not a documented 1863 footprint.

#### `farms-wheatfield-round-tops`: Plum Run, the Wheatfield and the Round Tops: Trostle, Rose, Slyder, Bushman, Warfield, Snyder

The Trostle farm (frame house, brick barn with the shell hole, hog pen, summer kitchen), the Rose farm (stone house of 1811, stone barn burned 1910 not in the battle), the Slyder farm (granite house, barn), the Bushman farm (house parts of 1808 and a brick addition of 1860, barn a temporary hospital, a tablet naming a XII Corps hospital at the house: all leads until a local text carries them), the Warfield (James) house and the Snyder farm on the Warfield Ridge, the stone walls P-04, P-05, P-06, P-14, the farm lanes and fences (Warfield), and the Plum Run buildings.

- Sources to read first: NPS-CLR-LRT, NPS-CLI-LRT, NPS-HSR-SLYDER, NPS-SLYDER-GUIDE, NPS-VISTA-CUTTING, NPS-CLI-ERR, NPS-CLR-ROT-V1, NPS-CLR-ROT-V2, OR27-1, OR27-2, GBG-COMPILER-1863, ADAMS-SENTINEL-1863, WARREN-1869, HOPKINS-1858-COUNTY, HABS-pa1728, HABS-pa0005, NY-GB-1900, PA-GB-1904, ME-GB-1898.
- Photographs of the ledger to read (LOC ids): 2018670894, 2013645105, 2018666308, 2018670852.
- New ids: `TWN-FWR-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: The Rose barn burned in 1910 (not the battle); the NPS and a web source conflict on the cause (basemap note): carry both.
- Issue: The Trostle summer kitchen footprint lies on the other side of the house from the photograph (photomatch EG-12): do not use the 2023 outline of the kitchen without the check.

#### `terrain-changes-since-1863`: Terrain changes since 1863: quarries, railroad cuts and grading, avenues, rebuilt walls, modern roads, ponds, removed knolls

Where the modern elevation model (the 1 m bare-earth DEM the app ground is built from) differs from the ground of July 1863 ACCORDING TO A SOURCE: quarries and excavations, the railroad cut and fills (the cut as of 1863 versus as of today), regrading for parks, avenues and parking (the monument avenues of the GBMA and the War Department, 17 miles by 1896: the avenues are never drawn), rebuilt or rebuilt-on-new-line walls (the NPS walls of 48-52 in. are not the 1863 profile), modern roads and cuts, ponds, drained or filled wetlands, the removal or reshaping of knolls, vista cuttings. Each row says: the feature, the place, the date of the change, the sign and size of the elevation difference only when a source gives it, the tier. The elevation model itself is not edited.

- Sources to read first: NPS-CLR-1STDAY, NPS-CLI-1STDAY, NPS-CLR-ROT-V1, NPS-CLR-ROT-V2, NPS-CLR-LRT, NPS-CLI-LRT, NPS-CLI-LANDSCAPE, NPS-CLR-CEMETERY, NPS-DCP-LRT, NPS-VISTA-CUTTING, NPS-DEV-POLICY, NPS-ADHI, NPS-GMP-1999-V1, NPS-TPG-COMMEM, NPS-COMMON-PRIDE-1, NPS-COMMON-PRIDE-2, NPS-COMMON-PRIDE-3, WARREN-1869, COPE-1863, COPE-CULPS-1898, GNMP-1900.
- New ids: `TWN-TER-NNNN`. Search queries and the target names are in `evidence/groups.json`.
- Issue: Do not derive 1863 profiles from the modern rebuilt Culp's Hill, Little Round Top or Cemetery Ridge walls (CLAUDE.md): a rebuilt wall is a `later` row, never a form row.
- Issue: An elevation difference is a number: it needs a quote that states it, or the row is an open gap.
- Issue: The terrain pipeline (workstream terrain, plan B.9.2 step 2) owns the DEM and its error model: these rows are its evidence, delivered by request note.



## 7. Defects found while planning (carried as issues, none chosen)

**TW-ID-01: two Spangler farms.** `structures.json` record `bld-spangler-farm` and hospital H-06 carry the plan row of **George Spangler's** farm ("Hospital Road, 166 acres, XI Corps hospital, bank barn with 7 ft forebay"), and the product draws that record on the geometry `STR-SPANGLER_H-*`, which is the **Henry Spangler** farmstead. Local Park Service texts (quotes verified by the validator; see `EXAMPLES.jsonl`): the Henry Spangler farmstead "was located between the Confederate and Union battle lines on Seminary and Cemetery Ridges" and "During the battle the barn was burned. The farm may have served as a temporary hospital" (NPS-CLI-PCB p.73); "the 2nd Division, 11th Corps Union hospital at the George Spangler farm" (NPS-COMMON-PRIDE-2 p.184); "The Eleventh Corps on Hospital Road 700 feet east of George Spangler house" (NPS-MON-LOC-1932 p.24); the gazetteer "Spangler farm" lies at the Henry farm. So the hospital badge and the XI Corps details sit on the wrong farm in the drawing, and the George Spangler farm has no geometry (the Warren plate labels five symbols about 1.9 km south-east of the Diamond "HENRY SPANGLER": an OCR hint that does not say whose farm it was in 1863). Neither reading is chosen here: the two farms are worked in `farms-emmitsburg-road` (Henry) and `farms-culps-hill-baltimore-pike` (George) with `identity` rows in conflict; the structures owner is told by request note.

Other things the pass must settle, each as rows: the Brien / Bryan and Klingel / Klingle spellings (carry both); the Presbyterian church site (confidence Contested, error 40 m); Christ Lutheran street number (30 or 44 Chambersburg Street); the Rose barn fire (NPS windstorm 1935 versus a lightning fire in one web source; the plan says 1910); the date and agent of the Sherfy barn fire and of the Bliss fires (plan B.8.2; the printed defaults PD-01..PD-11 are all PENDING OWNER); the Codori barn (the point is the barn "standing in 1868-69"); the record `bld-poorhouse-christ-lutheran-wills`, which names three buildings and is split by part (poorhouse: public buildings; Christ Lutheran: churches; Wills house: Baltimore Street, place to be confirmed); the Trostle summer kitchen footprint, which lies on the other side of the house from the photograph (photomatch EG-12); the McPherson barn, which did not burn on 1 July (plan B.8.1), whose restored exterior is not evidence of the 1863 form.

## 8. What is not covered here, and by whom

| Class | Where it is handled | What this pass adds |
|---|---|---|
| Earthworks, breastworks, gun emplacements (E-nn, G-nn) | the works pipeline of PDF B.7 (`structures/works_stages.json`, `src/structures/works3d.mjs`) and the soldier-work pass (OA11) | nothing; a building row may name a work in `detail` |
| Field hospitals as scenes: interiors, wounds, treatment | the hospital pass (OA12, `bt-life-hospitals`) | the building rows (`kind`, `storeys`, `walls`, `state` hospital with its window, `interior_change`) |
| Fences, walls | fence-1/2/3 results (`GOVERNANCE/horde/fence-*/`), `P-nn` and `FEN-*` records | per-farm rows only where a new source adds to them; the 392 fence candidates are assigned to area groups |
| Roads, lanes, bridges, railway | `library/ROAD-CONCORDANCE.md`, `app/data/road-concordance.json`, basemap lines | surface, width, state rows by group; the 19 bridges in `town-mills-bridges`, the railway in `town-railroad` |
| Trees, orchards, crops, woods | the vegetation layer (`app/data/vegetation.json`) | an `orchard_or_garden` row where a text names the farm's orchard |
| The elevation model | the terrain pipeline (PDF B.9.2) | `terrain-changes-since-1863`: the places where a source says the ground changed, with tier; **the model is not edited** |

## 9. What the product must say about what it does not know

Every record keeps its tier visible (`tierMark`); a plausible-procedural form is labelled generic; an open gap is shown as a gap; a building whose existence is an open gap is shown as uncertain; a later feature is never drawn in the July scene; identity conflicts are selectable. The claim to the user is never 100 percent: "documented at the level of each field, with the tier of each field shown". The integration step (`app/data/town/buildings.json`, the hand-over note, `evidence/SUMMARY.md`) turns the rows into data; the renderer owner is told what the drawing still needs by request note (the generic building grammar of `generic_rules.json`, rules marked `proposed`).

## 10. Acceptance of the pass

A group is done when: `validate_evidence.py <group> --complete` passes; the REPORT lists what was searched and not found; the proposed register entries exist; no gate was lowered and no `passes` flag was set; nothing outside the ownership list was edited. The pass as a whole is done when `validate_evidence.py --all --complete` passes, the integration step has written the product data and the hand-over, and the coverage summary says, by group, how many buildings have a documented form, how many are generic and how many are open gaps. Until then OA10 stays open: this plan does not mark any requirement passed.

## 11. Delegated decisions made by this plan (reversible; none is an owner decision)

Recorded in `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` as DD-TOWN-01 to DD-TOWN-09: (01) the owner's plan and every web source it cites are leads: a row can be documented only from a non-lead source; (02) the existence rule of section 4 and the rule that no building is removed from the drawing by this pass; (03) position tiers and error bounds by method; (04) photographs and maps: observations only, measurements at best inferred, `viewed` required; (05) a statement about a later state needs a continuity citation; (06) identity conflicts are carried, none is chosen; (07) one primary group per structure; (08) works, hospital scenes, the elevation model and the vegetation are other passes' scope; (09) the definition of a finished group (`--complete`).

## 12. Owner steps (acts only the owner may do; nothing was done)

- Ask the Adams County Historical Society (a third-party contact) for the Civil War damage-claims index, the 1858 and 1872 name indexes and the tax and deed indexes: the host is blocked here and the Society holds the only indexes of the owners of the buildings of the borough and of the claims that name damage, loopholing, burning and hospital use. A request text can be prepared on instruction.
- The 1860 manuscript census of Gettysburg (household, occupation, real-estate value) is on FamilySearch and Ancestry (login, possibly payment): an account and its terms are the owner's. Without it the occupants rest on Hopkins 1858, the Warren labels, advertisements and the papers.
- The National Register nomination of the Gettysburg Historic District (npgallery.nps.gov is blocked here): a copy through the Pennsylvania Historical and Museum Commission or the National Park Service is a third-party request.
- Station coordinates and lenses of the Park Service's Then-and-Now pictures (the photo-match report's owner step) would lift measurements from photographs above `inferred`.

## 13. What was run for this plan, and what was not

Run: reading of the governing texts; inventory from the data files (`assign_groups.py`, deterministic; `--check` compares `groups.json` with the data); 18 host probes (`probe_hosts.py`; 23 requests in `lookups.jsonl`, five repeated after their addresses were corrected); the ledger build with the hash of every local text (`build_sources.py`; `validate_evidence.py --check-ledger` re-hashes: 126 sources with local text); the validator and its self-test (67 synthetic cases; the real ledger, examples and inventory); the examples were generated from real texts and validated; `find_text.py` and its self-test. The local-text hit counts (queued behind the machine lock, not completed when this file was written). **Not run**: no group pass (no group file exists yet: `--all` reports all 21 as missing); no map scan was fetched or read (Hopkins inset, Warren sheet, Sanborn); no building was checked against a map; no photograph beyond one was opened (the Pennsylvania College photograph of August 1863, for the image example); no timing or GPU claim is made; the full node suite was not run (nothing under `app/` was edited).
