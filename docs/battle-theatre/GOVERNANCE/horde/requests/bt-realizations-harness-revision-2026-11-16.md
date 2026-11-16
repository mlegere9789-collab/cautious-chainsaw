# bt-realizations -> bt-gates, bt-gate-engine, bt-world-content and the shard workstreams: what the realization harness gained on 2026-11-16 (the vegetation layer is asked)

Owner of the harness: bt-realizations (`tools/bt/realize`, README.md there, sections 4a and 12). Written 2026-11-16. The harness id stays `bt-realize-1`: one assertion type, one entity list and one family of scenarios were added, no rule was loosened. The harness digest changes (`node tools/bt/realize/check.mjs --digests`), so a `RESULTS.json` computed before this note is stale by its own digest; a full run replaces it. Nothing in this note blocks the gate runner: the record format, the fields of `RESULTS.json` and the functions of `bt-realizations-gate-hooks-rows.md` are unchanged apart from the additions below.

## 1. What is new (README section 4a)

| what | rule | decision |
|---|---|---|
| assertion `vegetation_state` | the state the vegetation layer draws (`app/src/ext/vegetation`, `app/data/vegetation.json`, GATE-HOOKS "Vegetation of July 1863": `VegModel`, `stateAt`, `cropOf`, `sampleTimes`) on a plot (`plot`: `V-nnnn` or its stable name `lc`) or on every plot a selector finds (`where: { cls, crop }`), at every whole minute of the span: `crop_in`, `stage_in`, drawn heights (`height_ft_*`, `height_m_*`, within the row's range widened by 10 per cent; the numbers printed in the check's quote), `cut_*`, `trample_*`, `lodging_*`, `leaf_*`, `strip_*`, `keep_*`, `understory_in`, `fruit_stage_in`, `events_include`, `quantifier`, `min_plots`. The record kind is `structure_state` (the kind table of GATE-SPEC 6.2 gains "or `vegetation_state`") | DD-RZ-18 |
| entity list `plots` | the plots a check names, no more and no less; bound to the row by a distinctive word of the plot's name or `via` (listed in `declared_detail`, kind `plot`); a selector is bound by a word of the check's own quote that names its class or crop | DD-RZ-18 |
| scenarios of the layer | the layer's six conflicts (`CF-VEG-LRT`, `-UNDER`, `-HOUCK`, `-RAIN`, `-HARVEST`, `-MCPHERSON`) are scenario choices (`"CF-VEG-RAIN:pdf_flattened"`); the layer's own default value is no choice; the scenario group of a record takes in every conflict that changes the state of a plot the record looks at in the minutes it looks at (`RESULTS.json scenario_group.conflicts[].vegetation`) | DD-RZ-19 |
| a class is the plots drawn | a wood read as treeless (`CF-VEG-LRT` unwooded, `CF-VEG-HOUCK` clear-cut) is no woodlot in that scenario; a named plot is never dropped | DD-RZ-20 |
| vacuity | a share minimum of 0 or maximum of 1, a list of every crop, stage or understory, and a check no plot of the layer violates at any sample minute are `assert_vacuous` | DD-RZ-21 |
| author tools | `q.mjs veg [words]`, `q.mjs veg <plot> <time> [--scenario ...]`, `q.mjs group <row> --plots ... --where cls=woods --from .. --to ..` | |

New codes (the build list groups by them): `vegetation_mismatch`, `vegetation_plot_unknown`, `vegetation_plot_none`, `plot_not_bound`; `adapter_missing` now also says that the layer is not listed in `src/ext/index.mjs`.

## 2. What GATE-SPEC.md could say (the gate does not need any of it to run)

* 6.2: the row `structure_state`: "or `vegetation_state`: the state the vegetation layer draws on a plot or on the plots of a class".
* 6.3: `entities` gains `plots`; `declared_detail` gains the kind `plot`; `scenario_group.conflicts[]` may carry `vegetation: { options, example }`.
* 6.4 V2 (binding): a plot of the vegetation layer is bound by a distinctive word of its name or declared with `via`; V5 (floors): the height margin of a `vegetation_state` check is at most 10 per cent (`tolerances.json vegetation.height_tol_pct`) and `min_plots` is at least 1; V6: the conflicts `CF-VEG-*` that reach the record are part of its group; V11: the vacuity list gains the vegetation rules of section 4a.
* 6.6: the harness no longer lists the vegetation layer as unasked; what it still does not ask: sound, smoke and dust of the effects layer, civilians, a named man.

## 3. For bt-world-content (the vegetation layer's owner): what a scratch run of the assertion found on real rows (nothing is in a shard file)

Scratch records (tmp/realize/veg, not shard files) of T2-075 and T2-076 ran against the layer as of 2026-11-16 02:40 UTC:

* T2-075 (Jul 2 morning): the Wheatfield (`LC-FIELD-0001`) is wheat, uncut and untrampled from 06:00 to 12:00; every woodlot the picture draws is in leaf of 0.92 or more at 08:00 (the least is 0.921); in every scenario of the group (`CF-VEG-HARVEST`, `-HOUCK`, `-LRT`, `-UNDER`) the checks hold. The row's heights are not realized: it prints about 3.5-4.5 ft (1.07-1.37 m, 0.96-1.51 m with the margin) and the layer draws 1.04 to 1.58 m (3.4 to 5.2 ft) for the Wheatfield on that morning, so the upper end lies about 5 per cent beyond the margin; the layer's own note (`meta.rows` of T2-075, `not_covered`) lists the heights as ranges of the calendar that no passage states. Either the layer's range for the wheat of the Wheatfield narrows to the row's range (the calendar cites "up to our chins", VC-LIB-008), or the row's heights stay `not_shown`.
* T2-076 (Jul 2 morning): Big Round Top (`LC-WOOD-0002`) is fully wooded (`keep` 1, leaf 0.9 or more), Devil's Den (`LC-BOULD-0001`) is open rock and the Peach Orchard (`LC-ORCH-0206`) is in leaf of 0.9 or more at 08:00. The Plum Run valley (`LC-WET-0001`) is drawn as marsh (`crop` marsh, stage marsh), the row says "rocky and broken": a check that asks for open rock fails (`vegetation_mismatch`); the layer's own name for the plot is "marshy ground and boulders (Valley of Death, Slaughter Pen)". Which of the two the sources support is for the layer's owner and the shard engineer of tl-06.

## 4. How it is checked

`tests/governance/realize-rules.test.mjs` holds a wrong record or input for each new rule (five tests); `realize-inputs.test.mjs` holds the test that an unlisted layer is not asked and the author-tool test; `mutations.json` gained 70 mutations (one per rule: the mutation check removes or changes each in a scratch copy and requires a test to fail); the counts and the outcome of the last run are in the `progress.md` line of this date for bt-realizations and in `GOVERNANCE/realizations/MUTATION-CHECK.json`.

-- nothing is asked of any workstream except the append of the GATE-HOOKS rows below; when it is done append `-- handled: ...` here with `>>`.

## 5. Exact change (GATE-HOOKS rows; the file is not the harness's to edit)

Append to `docs/battle-theatre/app/docs/GATE-HOOKS.md` with `>>`:

```
## tools/bt/realize: the vegetation layer of the Q17 harness (bt-realizations, 2026-11-16; README tools/bt/realize/README.md section 4a)
| module path | function | inputs | output | gate it serves |
|---|---|---|---|---|
| tools/bt/realize/query.mjs | `P.veg` (after `await openProduct()`): `{ available, reason?, scenarios, ids, units, resolve(name), select(where, choices), stateAt(plot, tMin, choices), sampleTimes() }`; `P.vegetationReach({ plots, where, span })`; `P.scenarioGroup({ text, units, structures, span, vegetation: { plots, where, span } })`; `P.shellChoices(choices)`, `P.vegChoices(choices)` | a plot (V-nnnn or its lc name), a selector `{ cls, crop }`, a minute, the choices of a scenario (`CF-VEG-*`), the span a check looks at | the plots of the layer, their state, and which conflicts of the layer change the state of the plots in the span (the scenarios a realization must hold in) | Q17 (V6), Q21 |
| tools/bt/realize/checks.mjs | `new Runner(P, loadTimeline()).runRecord(record)` with a check `{ type: "vegetation_state", plot \| where, crop_in, stage_in, height_ft_min, height_ft_max, height_m_min, height_m_max, tol_pct, cut_min, cut_max, trample_min, trample_max, lodging_min, lodging_max, leaf_min, leaf_max, strip_min, strip_max, keep_min, keep_max, understory_in, fruit_stage_in, events_include, quantifier, min_plots, t, quote }` | a realization record (README section 3 and 4a) | the result of the record in every scenario of its group, with the evidence (the plots, the minute, a sample of the state) | Q17 (V1 to V11) |
```
