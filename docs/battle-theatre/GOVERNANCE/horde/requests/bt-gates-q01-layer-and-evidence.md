# Request to the layer-data and kit-evidence owners: what gate Q01 finds that only they can change

Workstream bt-gates, 2026-11-24, from `horde/Q01-TRIAGE.md` (regenerate with `python3 -I tools/bt/q01_triage.py`). No layer or evidence file was changed by this task; each point names the items, the cause and the exact change. Nothing here lowers a check.

## 1. The layer adopts the verified table (Q01.3 FAIL 88, Q01.4 FAIL 3, Q01.7 FAIL 111)
* Q01.3: for 88 regiments of Union corps I, II and III (ids in the gate record, cause `layer-procedural-vs-table`) the layer draws a `plausible-procedural` share (for example 336 for `us-1c-1d-cutler-147ny`, a corps figure divided by leaf units) although the verified table holds a documented range of one basis (380 taken into action). Change: in the layer builder, give a unit that has a documented table range that range with its `basis_key` (the fixture `with_layer_commanders` in `tests/governance/gates/gates_fixtures.py` shows the shape), and keep the procedural share only where the table has none.
* Q01.4: the same shares make the roll-up of `us-1c-3d-stannard` and `us-1c-3d-stone` 924 against 2,292 and 1,315, and `us-2c-2d-webb` names no date for a dated range.
* Q01.7: 96 units hold no commander and 15 hold only the first of the table's succession (for example `us-1c-2d-paul`: Paul, then Leonard, Root, Coulter, Lyle). Change: write the table's commanders with their order of succession into `history/units.json` `commanders`. Where a value is a conflict set the layer carries both.

## 2. Evidence lines with quotes over 14 words (Q01.1 FAIL 1)
`kit_verified` re-matches every documented line against the 14-word working limit (threshold T-Q02-1). In the four finished groups 253 documented lines have a longer quote, 3 quotes are not found in the stored text (`us-1c:0465`, `us-2c-2d3d:0171` and one more) and 3 lines have a number of the value missing from the quote (`us-1c:0500`, `us-2c-1d:0171`). Change: for each, replace the quote by a window of at most 14 words from the same offset that holds every number of the value, and re-run `python3 -I tools/bt/kit_evidence_check.py <group>`. A quote is never altered, only shortened to a verbatim span.

## 3. Required set (Q01.3 BLOCKED 11)
`kit/evidence/groups.json` gives artillery battalions guns and casualties only; the layer draws a strength for 11 of them. Change: add `strength` to their required set when the evidence pass for their group is run.
