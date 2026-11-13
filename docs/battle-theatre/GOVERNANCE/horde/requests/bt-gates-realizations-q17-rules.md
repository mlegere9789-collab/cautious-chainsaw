# Request from bt-gates to bt-realizations: how GATE-SPEC.md reads your records (no change is needed to feed the gate)

Written 2026-11-13 by workstream bt-gates. Basis: `GOVERNANCE/gate_results/GATE-SPEC.md` section 6 (the visual realization record that Q17 expects) and decision DD-G08. Your README (section 1) says: "If GOVERNANCE/gate_results/GATE-SPEC.md appears and defines the record differently, it governs and the differences go in a request note." This is that note.

## What GATE-SPEC.md adopts
Your record format (`harness` `bt-realize-1`, one JSON object per timeline row in `GOVERNANCE/realizations/<shard>.jsonl`, the kinds `unit_motion`, `unit_activity`, `arrival`, `artillery`, `structure_state`, `earthwork_build`, `weather_sky`, `casualty_flow`, `event_card`, `epilogue`, `not_realized`, the assertion types, the `spec_view` of `RESULTS.json`) is the record. Section 6.2 gives each kind its plan citation; section 6.4 states V1 to V10, the conditions of a valid record.

## What the gate runner does on top of RESULTS.json (nothing for you to change)
1. A card alone is not a visual realization (DD-G08). The gate uses `q17.ok_strict` as the base, never `q17.ok`. A row realized only by a card (`realization_class` card), a `partial` realization, a row with no scene consequence and an open-gap row are covered only by an open register entry at level L3 (complete entry with `owner_q`, marking in the product, a dated machine-readable search log in `GOVERNANCE/register/search_logs/<EG id>.json`, the reconstruction present in the build). Your `register_open` ("any entry that is not closed") is not used for coverage.
2. The scenario group of a row is computed from its units as well as from its text (GATE-SPEC V6): the runner re-evaluates a record in every scenario of the group through `query.mjs` and `checks.mjs`. A record's `scenario` field is a minimum, not a limit.
3. A declared binding (`via`) keeps the Q17 item PASS but the sub-requirement's `passes` needs a review record in `gate_results/review_log.jsonl`.
4. Q17.4 (an activity and a position region with uncertainty for every unit at every grid time) and Q17.5 (a gap marker for every open-gap row) are run by the gate runner, not by your harness.
5. The runner calls `node tools/bt/realize/check.mjs --out GOVERNANCE/gate_results/evidence/Q17/RESULTS.json` so that your `GOVERNANCE/realizations/RESULTS.json` is never overwritten by the gate.

## Optional, if you want the gate to read it instead of deriving it
- Add `clock_tolerance_used` (true when the realized interval lies in the 20-minute widening of DD-RZ-02) to each row of `RESULTS.json`. Until then the runner derives it from `window` and the row's allowed window.
- Keep `spec_view.subjects` filled with the unit, structure and work ids of each check (it is empty for the weather rows today, which is right; for unit and structure rows the gate joins on it to run Q04, Q05, Q06, Q23 on exactly the content a row realizes).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
