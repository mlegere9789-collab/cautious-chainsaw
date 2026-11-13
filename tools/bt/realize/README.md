# Realization harness (gate Q17)

`tools/bt/realize/` answers one question for every row of the master timeline: **does the Battle Theatre show it?** It loads the same data and modules the shell loads, answers what the picture shows at any minute, and runs the check of every realization record against that. Node only (no browser, no network); about 3 seconds for the whole timeline. It writes `GOVERNANCE/realizations/RESULTS.json`. It never sets a `passes` flag.

The harness is itself checked: `tests/governance/realize*.test.mjs` hold one wrong record (or wrong input) for every rule, and `mutate.mjs` proves it: it removes or changes each rule in a scratch copy of the harness and requires some test to fail (section 12; `GOVERNANCE/realizations/MUTATION-CHECK.json`).

## 1. What the gate says and what this harness takes it to mean

PDF Part E, Section Q (plan-clean.txt, **page 136**): "Q17 Coverage: every timeline row has a visual realization or an open register entry." The same words are the test of requirement O7 in Part D.2 (**page 124**): "Coverage matrix: every timeline row either has a visual realization or a register entry. The notes did not reach minute-level everywhere. Fine grain exists for some events; coarse grain elsewhere is labeled." How the engine reads a row (Part B.2, **page 9**): each row is a node with a window `[earliest, latest]`, a tier and a unit list; "a unit never appears before its first row, and never in two places at once"; environment rows are a separate track on the same clock; open-gap nodes generate no behaviour; plausible-procedural nodes generate seeded behaviour that is always flagged.

A row has a **visual realization** when, at a minute inside the time the row allows, what the product shows is what the row says: the units the row names are on the field (never before their arrival), at the place the row names (within the stated tolerance of that kind of place), doing what it says; or the structure is in the state it says, in the picture; or the weather and sky are as it says; or the men leave the line; or a tier-marked card shows the row. A **record** states which entities realize the row and carries the **check** that proves it; `check.mjs` runs the check against the product. A row with no record, a record whose check fails, or a record of kind `not_realized` is **not realized**; its coverage then comes from an open register entry only. Both halves are in `RESULTS.json`.

Format authority: `GOVERNANCE/gate_results/GATE-SPEC-A.md` (3.1 TL-2) leaves the record format to this workstream and states the fields a record must be able to give (`row_id`, `kind`, `realized: [{t_start, t_end, subjects[], probe, expected, observed_ref}]`, `scenario_set`, `register_ids`). `RESULTS.json` carries that view for every row (`spec_view`); the mapping is in section 8. If `GOVERNANCE/gate_results/GATE-SPEC.md` appears and defines the record differently, it governs and the differences go in a request note.

## 2. Commands

```
node tools/bt/realize/check.mjs                      every record -> GOVERNANCE/realizations/RESULTS.json (full run)
node tools/bt/realize/check.mjs --out x.json         the same, written to x.json (the gate runner does this; RESULTS.json is then not touched)
node tools/bt/realize/check.mjs --shard tl-03        one shard (prints a line per row; writes nothing unless --write)
node tools/bt/realize/check.mjs --row T1-004,T1-005  some rows
node tools/bt/realize/check.mjs --file x.jsonl       a records file (tests use this); never writes RESULTS.json unless --write
node tools/bt/realize/check.mjs --json               the whole report on stdout
node tools/bt/realize/check.mjs --digests            the digests of the harness and of the inputs (about 2 s), without running a record: what a stored RESULTS.json must equal to be valid
node tools/bt/realize/check.mjs --shard tl-03 --update    write each record's "result" field back into tl-03.jsonl
node --test tests/governance/realize.test.mjs tests/governance/realize-rules.test.mjs tests/governance/realize-inputs.test.mjs     the tests, injected wrong records included (heavy: run through tools/horde/bench.sh)
node tools/bt/realize/mutate.mjs [--check | --only id,id | --survivors | --resume]    the mutation check of the tests (section 12; heavy: run through tools/horde/bench.sh)

node tools/bt/realize/q.mjs row T1-097               the row: printed cells, allowed time and why, places and units its words name, the names that no file carries, register links, result
node tools/bt/realize/q.mjs suggest T1-097           when every drawn leaf of each named unit is on the field / within the tolerance of each named place / marching (a search aid, not a record)
node tools/bt/realize/q.mjs rows tl-02               one line per row of a shard
node tools/bt/realize/q.mjs unit "Early" 1863-07-01T16:00      find units by name, designator or id; where they are at a time
node tools/bt/realize/q.mjs unit <id> timeline       arrival, presence and activity legs with positions
node tools/bt/realize/q.mjs at 1863-07-01T12:00 --near "McPherson Ridge" --radius 900
node tools/bt/realize/q.mjs place "Cemetery Hill"    kind, centre, tolerance, on the loaded ground or not
node tools/bt/realize/q.mjs struct bld-wade-house 1863-07-03T08:40      a structure: objects drawn, state, schedule rows in force, visual blend
node tools/bt/realize/q.mjs work E-05 1863-07-02T08:00 | guns <battery> <time> | weather <time> | sky <time> | cas <from> <to> [unit or formation] | cards <time> | epilogue <time>
node tools/bt/realize/q.mjs gazetteer --write        every place the timeline names, and every name it prints that no file carries -> GOVERNANCE/realizations/gazetteer.json
```
A time is `1863-MM-DDTHH:MM` local mean time. `--scenario pdf` gives the plan's values instead of the delegated defaults. The library is `query.mjs` (`const P = await openProduct(); P.scene().unitAt(id, t)`); every `q.mjs` command is a few lines over it.

## 3. The record

One JSON object per line, **one per timeline row**, in `GOVERNANCE/realizations/<shard>.jsonl` (`tl-01` ... `tl-12`; epilogue rows E-001..E-014 in `epilogue.jsonl`). `EXAMPLES.jsonl` holds the 20 worked examples of tl-01 (T1-001..T1-020); a shard file overrides it for a row it has.

The worked example T1-016 (abridged: `EXAMPLES.jsonl` also asserts what the opening scenario draws, a half-burned blend, and lists the further bridges of the line in `not_shown`):

```json
{ "id": "T1-016", "harness": "bt-realize-1", "kind": "structure_state",
  "scenario": [ "default", { "id": "rr-bridge-jun26", "structure": { "bld-rock-creek-rr-bridge": "jun26" } } ],
  "scenario_excludes": [ { "scenario": { "id": "rr-bridge-jun27", "structure": { "bld-rock-creek-rr-bridge": "jun27" } }, "why": "the corrected claim dates the burning to the evening of 26 Jun (Jacobs; Early; the Compiler); the reading jun27 contradicts those sources" } ],
  "window": { "from": "1863-06-26T18:00", "to": "1863-06-28T00:00" },
  "claim":  { "quote": "The railroad bridge over Rock Creek east of Gettysburg is burned on the evening of Jun 26" },
  "entities": { "structures": ["bld-rock-creek-rr-bridge"], "schedule": ["S-001"] },
  "checks": [ { "type": "structure_state", "structure": "bld-rock-creek-rr-bridge", "scenario": "rr-bridge-jun26", "t": { "at": "1863-06-27T00:00" },
                "state": "Burned", "schedule_row": "S-001", "visual": { "burn_min": 1 }, "quote": "bridge over Rock Creek east of Gettysburg is burned" },
              { "type": "structure_state", "structure": "bld-rock-creek-rr-bridge", "t": { "at": "1863-06-28T00:00" }, "state": "Burned", "schedule_row": "S-001", "visual": { "burn_min": 1 }, "quote": "bridge over Rock Creek east of Gettysburg is burned" } ],
  "not_shown": [ { "words": "on the evening of Jun 26", "why": "the product holds the burning as a date, never a time of day" } ] }
```

| field | meaning |
|---|---|
| `id` | the timeline row (`T1-001`..`T3-nnn`, `E-001`..`E-014`) |
| `harness` | must be `bt-realize-1` (`lib.mjs HARNESS`; bumped when a rule changes) |
| `kind` | `unit_motion`, `unit_activity`, `arrival`, `structure_state`, `earthwork_build`, `artillery`, `weather_sky`, `casualty_flow`, `event_card`, `epilogue`, `not_realized` |
| `scenario` | the scenarios the record is RUN in, and RESULTS.json says which were run: `"default"` (the shell's opening scenario: every conflict on its delegated default, every structure on the schedule's own reading), `"pdf"` (the plan's values), an object `{ "id"?, "choices"?: { "C-021": "v1" }, "structure"?: { "<structure id>": "<reading>" }, "from"? }` (`structure` is the reading of one structure the viewer picks on its card, the names the state schedule gives: `jun26`, `jun27` ...; a `choices`-only object starts from the plan's values as the shell stores it, `"from": "default"` starts it from the opening scenario, a `structure`-only object is the opening scenario plus the readings), a list of these (a check holds in every one, unless it says otherwise: `scenario` on the check), or `"conflicts"` (the default, and one scenario per value of every conflict `C-nnn` the row's text names: GATE-SPEC-A TL-8). **A scenario is named in the record, never forced inside a check**: a check that held only in a scenario other than the one the record named was the defect of the first T1-015 |
| `scenario_excludes` | `[{ "scenario": <spec>, "why": "..." }]`: the values of a source conflict the record does NOT hold in, with the reason (at least 30 characters: the sources of the row that contradict it). GATE-SPEC TL-8 allows a record to exclude a value it states and explains. RESULTS.json lists them (`excluded_scenarios`) |
| `window` | the minutes the checks look at; **inside the time the row allows** (`q.mjs row` prints it with its basis) and inside the theatre clock (26 Jun-14 Jul, 18-19 Nov) |
| `claim.quote` (`quotes`) | verbatim words of the row (printed cells, or the corrected claim from `GOVERNANCE/timeline_corrections` when one exists); matched by word with apostrophes and quotation marks folded. A record realizes what it quotes |
| `entities` | every entity the checks use, **no more and no less**: `units`, `structures`, `places`, `works`, `cards` (row ids), `schedule` (schedule row ids, documentation of `schedule_row`). Each is an id, or `{ "id": ..., "via": "<verbatim words of the row>" }` when the row names it in other words |
| `checks` | the assertions (section 4); every one must hold in every scenario of the record, or in the scenarios named by its own `"scenario": "<id>"` (an id of the record's scenarios, or a list of them) |
| `place_unspecified` | a motion or activity row that names no place says so here (the reason) |
| `not_shown` | realized records: `[{ "words", "why" }]`, the parts of the row (its own words) the record does NOT realize. The row is then realized **partially** (`partial: true`, counted apart, not in `q17.ok_strict` unless an open register entry covers it) and those parts stay open for registration |
| `missing`, `intended_kind` | kind `not_realized` only (section 6) |
| `register` | open register entries meanwhile (information; coverage uses the requirement links only) |
| `result` | `{ realized, why, digest }`, written by `check.mjs --update`; recomputed every run, a disagreement is reported as `stale_result` |

### Binding to the row (the guard against a record about something the row does not say)
* **The row's words** are the printed time, place, unit and action cells and the CLAIM fields of the corrected claim when there is one (`event`, `unit`, `place`, the time text, `text`). The basis of the time window (a source citation with its authors), the marking, the tier, the sub-claims and the citations are evidence about the claim, not the claim: a report author is not a unit on the field, and the boilerplate of a basis names nothing.
* **Units**: a unit is bound when the row's words name it or an ancestor: a regiment or battery by its designator (`6th Wisconsin` = `6 WI`; the words after it must agree: `Emergency Militia` is not the 26th PA Volunteers, `Cav` needs a cavalry unit), a formation by the words of its name (`Early`, `Iron Brigade`), a brigade, division or corps by its commander's surname. A name is a **proper noun**: capitalised in the row; and where it is also an ordinary word of the timeline (lower case somewhere in the printed rows: `day`, `stone`, `early`, `iron`, `army`) only in a naming context: a possessive (`Day's brigade`), a unit noun after it (`Iron Brigade`), a title before it (`Gen. Early`), or, for a name of several words, one word that is no ordinary word (`Army of the Potomac`: Potomac). So `all day` is not Day's brigade, `a stone wall` is not Stone's, a bare `Early` at the start of a sentence needs `via` (T1-014). A person the layer gives as initials and a surname (`F. Lee`, `J. M. Jones`) is named only with the initial before the surname (`Fitz Lee`), never as a bare `Lee` (the army commander). An army is named by its whole name, not by its river. Place names are blanked first, so `Cemetery Hill` never names General Hill. Otherwise give `via` (a quote of the row); the result lists it as **declared**, for a reviewer. `q.mjs row` shows what is matched (`query.mjs unitsNamedIn`, `lib.mjs wordInfo`).
* **Places**: the name must be in the gazetteer (an unknown or ambiguous name is reported, never guessed) and named in the row's words (`Rd` is read as Road, `St` as Street) or declared with `via`.
* **Structures**: bound by a distinctive word (4 letters or more, not `town`, `house`, `bridge` ...) shared with the structure's names or its schedule row, or `via`.
* Numbers (`temp_f`, `unit_figures.approx`) must appear in the assertion's own `quote`.

### Where the units are and what they do
`unitAt(id, t)` is exactly the stage's rule (`app/src/stage.mjs apply()`): `present` when the unit has entered, has not left and `t` is inside its presence window (the arrival ledger); position from its path; activity from the stage's activity timeline (`march`/`double_quick` when the path leg moves, otherwise the last named activity). A formation above the regiments is realized by its **leaf units on the field**: every one must be drawn and satisfy the check (quantifier `"all"`, default) or one of them (`"any"`, for rows that say "part of"); a leaf that is not drawn fails and is named. `"picture": true` on `unit_activity` reads the crowd animation's timeline instead (adds `halt_mounted` and the dismounted `fire` of cavalry; costs about 4 s once).

## 4. The assertions (`checks[].type`)

A time is `"t": { "at": "..." }` or `{ "from", "to", "mode": "any" | "all" }` (default: the record window, mode `any` = at some whole minute, `all` = at every whole minute). **Every whole minute of a span is evaluated.** `unit` or `units` takes layer unit ids.

| type | fields | holds when |
|---|---|---|
| `unit_present` | | the unit (leaves) is on the field |
| `unit_absent` | `why_in` (default `["before_arrival"]`) | it is not on the field, *because of* one of the stated causes (never because it is simply not drawn) |
| `unit_at` | `place`, `within_m` | its centre is within the tolerance of the place (a point: to the centre; a line: to the nearest point) |
| `unit_moves` | `from`, `to`, `toward`, `along`, `away_from` (one at least), `min_minutes`, `min_displacement_m`, `min_closing_m` (50), `within_m` | it is marching at least `min_minutes` minutes (1), has moved at least 10 m, starts at `from`, ends at `to`, closes on `toward` by 50 m, stays on the line `along` while marching |
| `unit_activity` | `activities`, `min_minutes`, `picture` | it shows one of the activities (`march double_quick halt stand rest fire serve_guns gallop build_works camp`; with `picture`: `halt_mounted skirmish`) |
| `unit_arrives` | `at_place`, `within_m` | its arrival minute is inside the span, it is absent the minute before and present at it |
| `unit_formation` | `formation` (`line`, `column_fours`) | its formation at the minute |
| `unit_figures` | `approx` + `tol_pct` (10), `min`, `max` | the figures drawn for the leaves |
| `unit_in_layer` | `words`, `arm`, `side` | some unit of the order of battle is named by the row's words (a search; records that say a unit is missing) |
| `battery_guns` | `guns_min`, `limbers_min`, `caissons_min`, `horses_min` | the battery's guns (stated + the train's extras), limbers, caissons, horses as the shell draws them |
| `structure_state` | `structure`, `state` (text, list or `/regex/`), `present`, `visual` (`burn/dmg/down/gone/mix/vis` `_min`/`_max`), `schedule_row`, `hospital` `{id, phase_in}`; the reading of a structure is the scenario's: `structure_scenario` is gone (it let a check hold in a scenario other than the one the record named) | the drawn object's state in the shell's own state engine (`model.describe`); `structure_not_drawn` when the schedule has the state but nothing is drawn |
| `structure_exists` | `words` | some drawn object, structure record or schedule row names the row's words (records that say a structure is missing) |
| `work_stage` | `work` (E-nn), `stage_min`, `stage_max`, `present`, `crew` `{units, within_m}`; the reading of the work is the scenario's | the work's stage by the state engine (stages 0-6); the crew shows `build_works` in the span, at the work's place |
| `weather` | `precip_kind_in`, `precip_intensity_min/max`, `cloud_min/max`, `temp_f` (`tol_f` 1.0), `wetness_min/max`, `wind_mph_min/max`, `visibility_m_max`, `record` | the **drawn** weather state (`app/src/weather3d/timeline.mjs`) |
| `sky` | `sun_alt_min/max`, `moon_up`, `moon_illum_min/max`, `band_in`, `exposure_min` | sun, moon and the light (`exposure_min` = the night floor of gate Q10) |
| `casualty` | `units`, `killed_min`, `wounded_min`, `missing_min`, `events_min` | men leave the line in the span (the stage's `state` events) |
| `card_shown` / `epilogue_shown` | `rows`, `tier` | an event card / the epilogue content that carries those rows is shown (adapter, section 7) |
| `place_known` | `place`, `on_ground` | the place resolves, and is on the loaded ground |

Kind needs (validated): `unit_motion` a `unit_moves` with a place relation (or `place_unspecified`); `unit_activity` a `unit_activity`/`unit_formation`/`unit_present`/`unit_figures` and a `unit_at` (or `place_unspecified`); `arrival` a `unit_arrives` or `unit_absent`; `structure_state`; `earthwork_build` a `work_stage` **with a crew** (PDF Q08); `artillery` a `battery_guns`; `weather_sky` a `weather` or `sky`; `casualty_flow`; `event_card`; `epilogue`. **A NIGHT row needs a `sky` assertion with `exposure_min`** (Q10, GATE-SPEC-A K6).

Failure codes (what the build list groups): `unit_not_in_layer`, `unit_not_drawn`, `unit_not_on_field`, `unit_wrong_place`, `unit_wrong_direction`, `unit_off_road`, `unit_not_moving`, `unit_wrong_activity`, `unit_arrival_outside_window`, `place_unknown`, `place_ambiguous`, `place_off_ground`, `structure_unknown`, `structure_not_drawn`, `structure_wrong_state`, `work_wrong_stage`, `work_no_crew`, `weather_mismatch`, `sky_mismatch`, `casualty_none`, `battery_shortfall`, `card_not_shown`, `adapter_missing`, `time_outside_clock`; record problems: `quote_not_in_row`, `window_outside_row`, `unit_not_bound`, `place_not_in_row`, `structure_not_bound`, `entity_undeclared`, `entity_unused`, `kind_needs`, `schema_*`, `assert_*`, `tolerance_wider_than_stated`, `number_not_in_quote`.

## 5. Time: what a row allows

`timeline.mjs` reads the **whole** printed time cell (the PDF table wraps cells; `timeline_windows.jsonl` was parsed from the first fragment only and differs for two rows, which are flagged) and gives the allowed window with its basis and flags (`q.mjs row`). Rules, all stated in `tolerances.json time`: a printed clock time is widened by 20 minutes at each end (PDF p. 9: the Union and Confederate clocks "differed by about 20 minutes ... carried as uncertainty"); a phrase without a clock gets the part of the day (`morning` before noon, `afternoon` noon to civil dusk 20:04, `evening` from 18:00, `NIGHT` civil dusk to civil dawn 04:03, one printed date + `night` allows the early hours of that date and the night after it unless the cell says which); a row with a machine-readable window in a correction file uses it. The window is a **necessary** condition: what the product shows inside it is the business of the checks. A row whose whole window is outside the theatre clock (T1-001 at 19 Jun, T1-002 at 25 Jun 01:00 and eight rows of 14 Jul and later; the list is computed from the time cells and written to `RESULTS.json` `totals.outside_clock`, and every row has `in_clock`) cannot be realized: `time_outside_clock`. The count is not repeated here: it is a number the time cells give, and a test (`realize-inputs.test.mjs`) holds the list.

## 6. Records of kind `not_realized`

A row the product does not show gets a record too, with `intended_kind` (what it would be), the **probe** in `checks` (what WOULD realize it) and `missing`: `[{ "code", "detail", "builder" }]`. A row with a scene consequence is probed as a scene even when the product has no entity for it, and a card may be listed beside the probe (`cards`; it is not a declared reason): T1-001 (about two wagons a brigade) is the row GATE-SPEC 6.2 names, and its record asks for the unit of the army's medical department that would be shown as the train of each brigade (`unit_in_layer`), the product having none; the first mapping of the row as a card ("no physical form") was withdrawn (`GOVERNANCE/horde/requests/bt-realizations-t1-001-scene-class.md`). The harness runs the probe and requires that it **fails with the declared codes**: `missing.verified` true. If the probe passes the row is shown now: `missing.stale` true, and the record must be rewritten with its real kind. `builder` names who can build it (`units`, `renderer`, `world-content`, ...); `GOVERNANCE/realizations/<shard>.MISSING.md` groups the rows by `code`. Nothing is recorded as realized that a check does not confirm; a missing thing is named exactly (unit not drawn / no position at that time / wrong place by N metres / no visual form yet).

## 7. Adapters: event cards and the epilogue chapter

`adapters.json` lists where the harness looks: `app/src/ext/event-cards.mjs` (or `eventcards.mjs`, `cards.mjs`, `timeline-cards.mjs`) exporting `cardsAt(tMin, opts)` -> `[{ id, rows: [timeline row ids], title, tier, from_min, to_min }]`; `epilogue.mjs` exporting `epilogueAt(tMin)`; a hook named in `app/docs/GATE-HOOKS.md` is tried first. A module counts only if it is **listed in `app/src/ext/index.mjs`** (the product loads nothing else). Until they exist every card check fails with `adapter_missing`. Cards realize a row of no physical form; GATE-SPEC-A TL-4 and TL-11 read "a card only" as no visual realization, so `RESULTS.json` says which: `realization_class` `scene` or `card`, `q17.ok` (a card counts) and `q17.ok_strict` (a card counts only with an open register entry as well). The harness decides neither reading.

## 8. RESULTS.json

`harness`, `harness_digest` (the sources of the harness), `inputs_digest` with `inputs_parts` and `inputs_files` (below), `scope`, `totals`, `q17`, `record_file_problems`, `rows` (691), `epilogue` (14), `examples`. Per row: `realized`, `kind`, `why`, `codes`, `record` (file:line), `window`, `scenarios` (the scenarios the record was run in), `excluded_scenarios` (the readings of a source conflict the record excludes, with the reason), `declared_bindings`, `problems`, `failing[]`, `assertions[]` (`i, scenario, type, ok, code, evidence`: every result is tied to the scenario it was computed in), `missing` (not_realized), `realization_class` (`scene` or `card`), `partial`/`not_shown`, `tier`, `status`, `in_clock` (the row's allowed window meets the theatre clock), `register_open` (open entries linked to the row's sub-requirement, the rule of `tools/bt/check_coverage.py`, which a test runs and compares), `q17_covered` (realized or open register entry), `q17_covered_strict`, `coverage` (`realization`, `card`, `open_register_entry`, `none`), `spec_view` (GATE-SPEC-A: `t_start`, `t_end`, `subjects`, `scenarios`, `probe`, `expected`, `observed_ref`). Deterministic: the same inputs give the same bytes.

**`totals` and `q17` are computed from the rows of the document** (`check.mjs summarize`, `q17Of`), never carried over: a partial run written over an earlier file (`--write`) replaces its rows and every derived number is recomputed from the merged rows. `q17.complete` says that every expected row is in the document (691 timeline rows and 14 epilogue rows); `q17.ok` and `q17.ok_strict` are false unless it is true, and false while a record file has a problem. A merged file whose carried-over rows were computed under other digests lists them (`rows_from_other_digests`) and has `q17.ok` false until a full run. `totals.outside_clock` lists the rows whose allowed window lies outside the theatre clock.

**The digests.** `harness_digest` hashes the harness sources and its two data files. `inputs_digest` is the hash of four parts (`inputs_parts`, with the number of files in each in `inputs_files`): `governance` (every file of GOVERNANCE the harness read: the timeline seed, verified and windows files, the epilogue seed, the correction files `tl-NN.jsonl`, the register index, the requirements), `app_src` (the whole source tree of the shell, `app/src`, and its node terrain loader), `data` (every other file the harness read or the shell's loaders fetched: the data layers, the structure and weather inputs, the base-map layers the gazetteer is built from, the terrain), and `records` (the record files without the `result` that `--update` writes back, so that writing it does not change the digest it was computed under). Every read goes through one function (`lib.mjs noteRead`, `readText`; the shell's fetches through the fetch shim of `query.mjs`), and every lazy load happens before the digest is taken (`Product.warm`), so the digest does not depend on which records ran. `check.mjs --digests` prints the current digests without running a record: **a stored RESULTS.json is valid for the tree only while both digests equal them** (GATE-SPEC 6.4). A change in any of those files, in a record or in the shell changes it (a test changes one file of each part in a scratch copy of the tree and requires the part to change); `RESULTS.json` and `gazetteer.json` are outputs and are not inputs.

A gate runner reads `RESULTS.json`: the conservative reading (DD-RZ-04, DD-G08) is `q17.ok_strict` true and `record_file_problems` empty; `q17.ok` (a card counts as a visual realization) is given for information. The harness's own tests are `tests/governance/realize*.test.mjs`. **Q17.4 (slot coverage of every unit at every grid time) and Q17.5 (gap markers of open-gap rows in the evidence layer) scan the whole product, not rows; they are not done here.**

## 9. For the engineer writing a shard

1. `q.mjs rows tl-NN`, then for each row `q.mjs row <id>` (allowed time, places, units, register) and `q.mjs suggest <id>`.
2. Use the corrected claim when `timeline_corrections/<shard>.jsonl` has one (its text is in the row's `claim_text`).
3. Decide what the row says that a picture can show. Write the record with a `quote` of those words and the checks that prove them. Run `check.mjs --shard tl-NN --row <id>`.
4. If the check fails, the row is **not realized**: do not weaken the check, widen a tolerance (the harness refuses a wider `within_m`), move the window outside the row's time or drop the claim. Write the record as `not_realized` with the probe and the exact reason; list it in `<shard>.MISSING.md` grouped by code. If the row's main named object, unit or event is shown and only side details are not, the record is realized with `not_shown` listing them (T1-015, T1-016: the bridge is drawn burned; the rail cars, the track and the further bridges are not); if the main event is not shown the row is not realized.
5. Never record a realization the check does not confirm; never edit the seed; an unknown place is listed (`q.mjs place`), never given coordinates.

## 10. What this does not do (owed)

* It checks what the stage, the structures model, the weather timeline and the event lists **compute** for a minute; it does not look at pixels. Whether the picture draws it (software GL only in this container) is a browser check, owed to the specs; no real-GPU result is claimed.
* Infantry never has the activity `fire` in the picture (the layer has no such event; only the dismounted cavalry of ws10 does, via `picture`): a row that says a regiment fires cannot be realized until the layer names it.
* The harness is node-only; `weather` and `sky` read the drawn state of the weather pass, not the colours it draws.

## 11. Files

`lib.mjs` (clock, quote folding, the words of a text with their case and context, unit names, tracked reads, hashing), `timeline.mjs` (rows, allowed windows, corrections and their claim fields), `gazetteer.mjs` (places and tolerances, how far a place lies outside the ground; `gazetteer.json` is its report), `names.mjs` (every capitalised name of a row: resolved, person or unit, unknown, unclassified; the unknown names of `gazetteer.json`), `query.mjs` (the product, scenarios, naming units, the digest of the inputs), `schema.mjs` (the record, static validation), `checks.mjs` (the assertions, the scenario plan), `check.mjs` (runner, RESULTS.json, totals, q17, digests), `q.mjs` and `suggest.mjs` (author tools), `tree.mjs` and `mutate.mjs` with `mutations.json` (the check of the tests, section 12), `tolerances.json` (stated tolerances, delegated decisions DD-RZ-01..04), `adapters.json`.

## 12. How the harness is checked: wrong records, and mutations

The tests hold, for every rule of the schema and of the checks, a record or an input that is wrong in exactly that way and must be refused with the rule's code (`realize-rules.test.mjs`: a NIGHT row without its exposure assertion, a quote that starts inside a word, a march of one minute, a partial realization counted as covered, a card counted as a scene ...), the worked examples and real rows (`realize.test.mjs`), and the inputs and outputs (`realize-inputs.test.mjs`: the digest, the merge of a partial run, the unknown names of the gazetteer, the author tools, the documents, `check_coverage.py` run for real). **That the tests really cover the rules is checked, not asserted**: `mutate.mjs` takes each of the mutations of `mutations.json` (a snippet of the harness that occurs exactly once, and what replaces it: a rule removed, a limit loosened, a default weakened), makes a scratch copy of the harness and the tests (`tree.mjs`: the harness is copied, everything else is reached through links, nothing is written into the real tree), applies the mutation there and runs the tests of the copy. A mutation is KILLED when a test fails and SURVIVES when every test passes: a survivor is a rule without a test (or an equivalent mutant, which the report's `notes` then says). `GOVERNANCE/realizations/MUTATION-CHECK.json` is the report of the last run; a rule added to the harness gets a mutation and a wrong record in the same change.
