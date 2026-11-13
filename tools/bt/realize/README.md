# Realization harness (gate Q17)

`tools/bt/realize/` answers one question for every row of the master timeline: **does the Battle Theatre show it?** It loads the same data and modules the shell loads, answers what the picture shows at any minute, and runs the check of every realization record against that. Node only (no browser, no network); about 3 seconds for the whole timeline. It writes `GOVERNANCE/realizations/RESULTS.json`. It never sets a `passes` flag.

## 1. What the gate says and what this harness takes it to mean

PDF Part E, Section Q (plan-clean.txt, **page 136**): "Q17 Coverage: every timeline row has a visual realization or an open register entry." The same words are the test of requirement O7 in Part D.2 (**page 124**): "Coverage matrix: every timeline row either has a visual realization or a register entry. The notes did not reach minute-level everywhere. Fine grain exists for some events; coarse grain elsewhere is labeled." How the engine reads a row (Part B.2, **page 9**): each row is a node with a window `[earliest, latest]`, a tier and a unit list; "a unit never appears before its first row, and never in two places at once"; environment rows are a separate track on the same clock; open-gap nodes generate no behaviour; plausible-procedural nodes generate seeded behaviour that is always flagged.

A row has a **visual realization** when, at a minute inside the time the row allows, what the product shows is what the row says: the units the row names are on the field (never before their arrival), at the place the row names (within the stated tolerance of that kind of place), doing what it says; or the structure is in the state it says, in the picture; or the weather and sky are as it says; or the men leave the line; or a tier-marked card shows the row. A **record** states which entities realize the row and carries the **check** that proves it; `check.mjs` runs the check against the product. A row with no record, a record whose check fails, or a record of kind `not_realized` is **not realized**; its coverage then comes from an open register entry only. Both halves are in `RESULTS.json`.

Format authority: `GOVERNANCE/gate_results/GATE-SPEC-A.md` (3.1 TL-2) leaves the record format to this workstream and states the fields a record must be able to give (`row_id`, `kind`, `realized: [{t_start, t_end, subjects[], probe, expected, observed_ref}]`, `scenario_set`, `register_ids`). `RESULTS.json` carries that view for every row (`spec_view`); the mapping is in section 8. If `GOVERNANCE/gate_results/GATE-SPEC.md` appears and defines the record differently, it governs and the differences go in a request note.

## 2. Commands

```
node tools/bt/realize/check.mjs                      every record -> GOVERNANCE/realizations/RESULTS.json (full run)
node tools/bt/realize/check.mjs --shard tl-03        one shard (prints a line per row; writes nothing unless --write)
node tools/bt/realize/check.mjs --row T1-004,T1-005  some rows
node tools/bt/realize/check.mjs --file x.jsonl       a records file (tests use this); never writes RESULTS.json
node tools/bt/realize/check.mjs --json               the whole report on stdout
node tools/bt/realize/check.mjs --shard tl-03 --update    write each record's "result" field back into tl-03.jsonl
node --test tests/governance/realize.test.mjs        the tests (24), injected wrong records included

node tools/bt/realize/q.mjs row T1-097               the row: printed cells, allowed time and why, places and units its words name, register links, result
node tools/bt/realize/q.mjs suggest T1-097           when every drawn leaf of each named unit is on the field / within the tolerance of each named place / marching (a search aid, not a record)
node tools/bt/realize/q.mjs rows tl-02               one line per row of a shard
node tools/bt/realize/q.mjs unit "Early" 1863-07-01T16:00      find units by name, designator or id; where they are at a time
node tools/bt/realize/q.mjs unit <id> timeline       arrival, presence and activity legs with positions
node tools/bt/realize/q.mjs at 1863-07-01T12:00 --near "McPherson Ridge" --radius 900
node tools/bt/realize/q.mjs place "Cemetery Hill"    kind, centre, tolerance, on the loaded ground or not
node tools/bt/realize/q.mjs struct bld-wade-house 1863-07-03T08:40      a structure: objects drawn, state, schedule rows in force, visual blend
node tools/bt/realize/q.mjs work E-05 1863-07-02T08:00 | guns <battery> <time> | weather <time> | sky <time> | cas <from> <to> [unit] | cards <time> | epilogue <time>
node tools/bt/realize/q.mjs gazetteer --write        every place the timeline names -> GOVERNANCE/realizations/gazetteer.json
```
A time is `1863-MM-DDTHH:MM` local mean time. `--scenario pdf` gives the plan's values instead of the delegated defaults. The library is `query.mjs` (`const P = await openProduct(); P.scene().unitAt(id, t)`); every `q.mjs` command is a few lines over it.

## 3. The record

One JSON object per line, **one per timeline row**, in `GOVERNANCE/realizations/<shard>.jsonl` (`tl-01` ... `tl-12`; epilogue rows E-001..E-014 in `epilogue.jsonl`). `EXAMPLES.jsonl` holds the 20 worked examples of tl-01 (T1-001..T1-020); a shard file overrides it for a row it has.

```json
{ "id": "T1-016", "harness": "bt-realize-1", "kind": "structure_state", "scenario": "default",
  "window": { "from": "1863-06-27T12:00", "to": "1863-06-28T00:00" },
  "claim":  { "quote": "Gettysburg Railroad trestle/bridge over Rock Creek burned" },
  "entities": { "structures": ["bld-rock-creek-rr-bridge"], "schedule": ["S-001"] },
  "checks": [ { "type": "structure_state", "structure": "bld-rock-creek-rr-bridge", "t": { "at": "1863-06-28T00:00" },
                "state": "Burned", "schedule_row": "S-001", "visual": { "burn_min": 1 }, "quote": "trestle/bridge over Rock Creek burned" } ] }
```

| field | meaning |
|---|---|
| `id` | the timeline row (`T1-001`..`T3-nnn`, `E-001`..`E-014`) |
| `harness` | must be `bt-realize-1` (`lib.mjs HARNESS`; bumped when a rule changes) |
| `kind` | `unit_motion`, `unit_activity`, `arrival`, `structure_state`, `earthwork_build`, `artillery`, `weather_sky`, `casualty_flow`, `event_card`, `epilogue`, `not_realized` |
| `scenario` | `"default"` (the shell's opening scenario: every conflict on its delegated default), `"pdf"` (the plan's values), `{ "choices": { "C-021": "v1" } }`, a list of these (every one must hold), or `"conflicts"` (the default, and one scenario per value of every conflict `C-nnn` the row's text names: GATE-SPEC-A TL-8) |
| `window` | the minutes the checks look at; **inside the time the row allows** (`q.mjs row` prints it with its basis) and inside the theatre clock (26 Jun-14 Jul, 18-19 Nov) |
| `claim.quote` (`quotes`) | verbatim words of the row (printed cells, or the corrected claim from `GOVERNANCE/timeline_corrections` when one exists); matched by word with apostrophes and quotation marks folded. A record realizes what it quotes |
| `entities` | every entity the checks use, **no more and no less**: `units`, `structures`, `places`, `works`, `cards` (row ids), `schedule` (schedule row ids, documentation of `schedule_row`). Each is an id, or `{ "id": ..., "via": "<verbatim words of the row>" }` when the row names it in other words |
| `checks` | the assertions (section 4); every one must hold |
| `place_unspecified` | a motion or activity row that names no place says so here (the reason) |
| `not_shown` | realized records: `[{ "words", "why" }]`, the parts of the row (its own words) the record does NOT realize. The row is then realized **partially** (`partial: true`, counted apart, not in `q17.ok_strict` unless an open register entry covers it) and those parts stay open for registration |
| `missing`, `intended_kind` | kind `not_realized` only (section 6) |
| `register` | open register entries meanwhile (information; coverage uses the requirement links only) |
| `result` | `{ realized, why, digest }`, written by `check.mjs --update`; recomputed every run, a disagreement is reported as `stale_result` |

### Binding to the row (the guard against a record about something the row does not say)
* **Units**: a unit is bound when the row's words name it or an ancestor: a regiment or battery by its designator (`6th Wisconsin` = `6 WI`; the words after it must agree: `Emergency Militia` is not the 26th PA Volunteers, `Cav` needs a cavalry unit), a formation by the words of its name (`Early`, `Iron Brigade`), a brigade, division or corps by its commander's surname. Place names are blanked first, so `Cemetery Hill` never names General Hill. Otherwise give `via` (a quote of the row); the result lists it as **declared**, for a reviewer. `q.mjs row` shows what is matched.
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
| `structure_state` | `structure`, `state` (text, list or `/regex/`), `present`, `visual` (`burn/dmg/down/gone/mix/vis` `_min`/`_max`), `schedule_row`, `hospital` `{id, phase_in}`, `structure_scenario` | the drawn object's state in the shell's own state engine (`model.describe`); `structure_not_drawn` when the schedule has the state but nothing is drawn |
| `structure_exists` | `words` | some drawn object, structure record or schedule row names the row's words (records that say a structure is missing) |
| `work_stage` | `work` (E-nn), `stage_min`, `stage_max`, `present`, `crew` `{units, within_m}` | the work's stage by the state engine (stages 0-6); the crew shows `build_works` in the span, at the work's place |
| `weather` | `precip_kind_in`, `precip_intensity_min/max`, `cloud_min/max`, `temp_f` (`tol_f` 1.0), `wetness_min/max`, `wind_mph_min/max`, `visibility_m_max`, `record` | the **drawn** weather state (`app/src/weather3d/timeline.mjs`) |
| `sky` | `sun_alt_min/max`, `moon_up`, `moon_illum_min/max`, `band_in`, `exposure_min` | sun, moon and the light (`exposure_min` = the night floor of gate Q10) |
| `casualty` | `units`, `killed_min`, `wounded_min`, `missing_min`, `events_min` | men leave the line in the span (the stage's `state` events) |
| `card_shown` / `epilogue_shown` | `rows`, `tier` | an event card / the epilogue content that carries those rows is shown (adapter, section 7) |
| `place_known` | `place`, `on_ground` | the place resolves, and is on the loaded ground |

Kind needs (validated): `unit_motion` a `unit_moves` with a place relation (or `place_unspecified`); `unit_activity` a `unit_activity`/`unit_formation`/`unit_present`/`unit_figures` and a `unit_at` (or `place_unspecified`); `arrival` a `unit_arrives` or `unit_absent`; `structure_state`; `earthwork_build` a `work_stage` **with a crew** (PDF Q08); `artillery` a `battery_guns`; `weather_sky` a `weather` or `sky`; `casualty_flow`; `event_card`; `epilogue`. **A NIGHT row needs a `sky` assertion with `exposure_min`** (Q10, GATE-SPEC-A K6).

Failure codes (what the build list groups): `unit_not_in_layer`, `unit_not_drawn`, `unit_not_on_field`, `unit_wrong_place`, `unit_wrong_direction`, `unit_off_road`, `unit_not_moving`, `unit_wrong_activity`, `unit_arrival_outside_window`, `place_unknown`, `place_ambiguous`, `place_off_ground`, `structure_unknown`, `structure_not_drawn`, `structure_wrong_state`, `work_wrong_stage`, `work_no_crew`, `weather_mismatch`, `sky_mismatch`, `casualty_none`, `battery_shortfall`, `card_not_shown`, `adapter_missing`, `time_outside_clock`; record problems: `quote_not_in_row`, `window_outside_row`, `unit_not_bound`, `place_not_in_row`, `structure_not_bound`, `entity_undeclared`, `entity_unused`, `kind_needs`, `schema_*`, `assert_*`, `tolerance_wider_than_stated`, `number_not_in_quote`.

## 5. Time: what a row allows

`timeline.mjs` reads the **whole** printed time cell (the PDF table wraps cells; `timeline_windows.jsonl` was parsed from the first fragment only and differs for two rows, which are flagged) and gives the allowed window with its basis and flags (`q.mjs row`). Rules, all stated in `tolerances.json time`: a printed clock time is widened by 20 minutes at each end (PDF p. 9: the Union and Confederate clocks "differed by about 20 minutes ... carried as uncertainty"); a phrase without a clock gets the part of the day (`morning` before noon, `afternoon` noon to civil dusk 20:04, `evening` from 18:00, `NIGHT` civil dusk to civil dawn 04:03, one printed date + `night` allows the early hours of that date and the night after it unless the cell says which); a row with a machine-readable window in a correction file uses it. The window is a **necessary** condition: what the product shows inside it is the business of the checks. A row whose whole window is outside the theatre clock (9 rows today, e.g. T1-002 at 25 Jun 01:00) cannot be realized: `time_outside_clock`.

## 6. Records of kind `not_realized`

A row the product does not show gets a record too, with `intended_kind` (what it would be), the **probe** in `checks` (what WOULD realize it) and `missing`: `[{ "code", "detail", "builder" }]`. The harness runs the probe and requires that it **fails with the declared codes**: `missing.verified` true. If the probe passes the row is shown now: `missing.stale` true, and the record must be rewritten with its real kind. `builder` names who can build it (`units`, `renderer`, `world-content`, ...); `GOVERNANCE/realizations/<shard>.MISSING.md` groups the rows by `code`. Nothing is recorded as realized that a check does not confirm; a missing thing is named exactly (unit not drawn / no position at that time / wrong place by N metres / no visual form yet).

## 7. Adapters: event cards and the epilogue chapter

`adapters.json` lists where the harness looks: `app/src/ext/event-cards.mjs` (or `eventcards.mjs`, `cards.mjs`, `timeline-cards.mjs`) exporting `cardsAt(tMin, opts)` -> `[{ id, rows: [timeline row ids], title, tier, from_min, to_min }]`; `epilogue.mjs` exporting `epilogueAt(tMin)`; a hook named in `app/docs/GATE-HOOKS.md` is tried first. A module counts only if it is **listed in `app/src/ext/index.mjs`** (the product loads nothing else). Until they exist every card check fails with `adapter_missing`. Cards realize a row of no physical form; GATE-SPEC-A TL-4 and TL-11 read "a card only" as no visual realization, so `RESULTS.json` says which: `realization_class` `scene` or `card`, `q17.ok` (a card counts) and `q17.ok_strict` (a card counts only with an open register entry as well). The harness decides neither reading.

## 8. RESULTS.json

`harness`, `harness_digest` (sources of the harness), `inputs_digest` (the files the shell's loaders read), `scope`, `totals`, `q17`, `record_file_problems`, `rows` (691), `epilogue` (14), `examples`. Per row: `realized`, `kind`, `why`, `codes`, `record` (file:line), `window`, `scenarios`, `declared_bindings`, `problems`, `failing[]`, `assertions[]` (`i, type, ok, code, evidence`), `missing` (not_realized), `realization_class`, `tier`, `status`, `register_open` (open entries linked to the row's sub-requirement, the rule of `tools/bt/check_coverage.py`), `q17_covered` (realized or open register entry), `q17_covered_strict`, `coverage` (`realization`, `card`, `open_register_entry`, `none`), `spec_view` (GATE-SPEC-A: `t_start`, `t_end`, `subjects`, `probe`, `expected`, `observed_ref`). Deterministic: the same inputs give the same bytes.

A gate runner reads `RESULTS.json`: the conservative reading (DD-RZ-04) is `q17.ok_strict` true and `record_file_problems` empty; `q17.ok` (a card counts as a visual realization) is given for information until the gate spec decides; the harness's own tests are `tests/governance/realize.test.mjs` (24). **Q17.4 (slot coverage of every unit at every grid time) and Q17.5 (gap markers of open-gap rows in the evidence layer) scan the whole product, not rows; they are not done here.**

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

`lib.mjs` (clock, quote folding, unit names), `timeline.mjs` (rows, allowed windows, corrections), `gazetteer.mjs` (places and tolerances; `gazetteer.json` is its report), `query.mjs` (the product), `schema.mjs` (the record, static validation), `checks.mjs` (the assertions), `check.mjs` (runner, RESULTS.json), `q.mjs` and `suggest.mjs` (author tools), `tolerances.json` (stated tolerances, delegated decisions DD-RZ-01..04), `adapters.json`.
