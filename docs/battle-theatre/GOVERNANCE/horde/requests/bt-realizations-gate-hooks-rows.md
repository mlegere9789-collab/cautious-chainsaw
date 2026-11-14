# bt-realizations -> owner of app/docs/GATE-HOOKS.md: rows for the Q17 realization harness

Written 2026-11-14 by workstream bt-realizations. Needed from: whoever appends to `docs/battle-theatre/app/docs/GATE-HOOKS.md` (that file is outside the ownership of this workstream, and its head says rows are appended with a single shell `>>`).

**What.** The gate runner for Q17 calls the harness functions below (node only, no DOM, no network, no wall clock; `GOVERNANCE/gate_results/GATE-SPEC.md` section 6 and the request note `bt-gates-realizations-q17-rules.md` name them). They are not yet in GATE-HOOKS.md, which lists app modules only. Append these rows:

```
## tools/bt/realize (bt-realizations: the Q17 realization harness; README tools/bt/realize/README.md)
| module path | function | inputs | output | gate it serves |
|---|---|---|---|---|
| tools/bt/realize/query.mjs | `await openProduct()` then `P.scene(spec).unitAt(id, tMin)`, `P.weatherAt(tMin, spec)`, `P.structures(spec)`, `P.scene(spec).casualtiesOf(ids, from, to)`, `P.cardsAt(tMin)`, `P.epilogueAt(tMin)` | the product's own data and modules; a scenario spec (`'default'`, `'pdf'`, `'C-004:v1'`, an object `{ choices, structure }`); a minute of the theatre clock or `1863-MM-DDTHH:MM` | where a unit is and what it does (`present`, `why` before arrival, `lng`, `lat`, `activity`), the drawn weather and sky, the state of a structure, the men who leave the line, the event cards and the epilogue content the product shows | Q17 (and the evidence for Q04, Q05, Q06, Q22, Q23 on the content a row realizes) |
| tools/bt/realize/query.mjs | `P.scenarioGroup({ text, units, structures, span })` | the row's text, the unit ids, the structure or work ids and the minutes of a weather assertion | `{ conflicts, readings, specs, ids }`: the scenarios a realization must hold in (GATE-SPEC TL-8, 6.4 V6): the conflicts the text names, that reach the units (gate chain, path stops), that the weather of the minutes lists, and the readings of the structures; one scenario per value | Q17 (V6) |
| tools/bt/realize/checks.mjs | `new Runner(P, loadTimeline()).runRecord(record)` | a realization record (README section 3) | `{ realized, why, codes, problems, assertions[], scenarios, scenario_group, bindings }`: every assertion in every scenario of the record, bound to the row's words, deterministic | Q17 (V1 to V10) |
| tools/bt/realize/check.mjs | `runAll({ shards, files, rows })`, `coverageOf(entry, regOpen)`, `summarize(rows, epilogue)`, `q17Of(S, { problems, timelineRows, epilogueRows })`, `timeReading(exact, flags, window)`; command `node tools/bt/realize/check.mjs [--out x.json] [--digests]` | the record files of `GOVERNANCE/realizations` | `RESULTS.json`: per row `realized`, `q17_covered_strict`, `not_strict_because`, `scenario_group`, `allowed_exact`, `record_reading`, `clock_tolerance_used`, `spec_view`; `q17.ok_strict`; `--digests`: the digests a stored RESULTS.json must equal to be valid | Q17 |
```

**Why.** GATE-SPEC.md 6.3 and 6.4 name `query.mjs`, `checks.mjs` and `loadTimeline`/`epilogueRows` as the library the runner re-evaluates records through; GATE-HOOKS.md is where a gate runner author looks for the callable checks.

**Exact change.** Append the block above with `>>`. Do not rewrite the file.
