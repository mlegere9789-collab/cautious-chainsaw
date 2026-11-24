# EG-CAV-07: Cavalry that the layer does not draw

| Field | Content |
|---|---|
| ID | EG-CAV-07 |
| Requirement IDs | R01, R03 |
| Category | evidence missing |
| Description | Of the 55 cavalry regiments and battalions of the order of battle, the real layer draws 21:  the 5 regiments of the Reserve Brigade, the 5 of McIntosh, the 4 of J. I. Gregg's, 6 of Hampton's and the 35th Virginia Battalion; Gamble's and Devin's regiments, Custer's Michigan Brigade, Farnsworth's brigade and the rest of Stuart's command have no road of approach or place in the ledgers and are drawn with 0 figures. This is the history layer's open gap, not narrowed here. |
| Why literal 100% is not possible or blocked | The history layer's arrival ledger gives no road of approach or place for these units, so the figure pass does not draw them. This is the layer's gap, not a gap of the record alone: OR Ser. I vol. 27 prints some places (found, below) that have not been entered in the ledger. |
| Evidence searched | Run on 2026-11-24 on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py): 7 searches, 2 with a relevant find (register/search_logs/EG-CAV-07.json holds each pattern, hit counts and result). Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched. |
| Autonomous substitute applied | The model in app/src/history/cavalry.mjs, marked open gap on the unit card (section Riders and horses) and in app/data/cavalry-horses.json. |
| Strongest evidence-based reconstruction | Units stay undrawn with the gap listed, and the Q20 gate keeps them FAIL until each is drawn at a ledger place with a road. Candidate printed places found (not yet applied): Devin formed with his right on the road to Mummasburg (R339 pp. 937-938, page interpolated by the index); Buford names the road from Cashtown through Mummasburg and Hunterstown to the York pike (R337 p. 924) and Colonel Gamble's message that Lee signed a pass at Chambersburg (R337 p. 923). |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Unit card section "Riders and horses": range, basis, tier pill and gap id. |
| Visual and audio impact | 21 of 55 cavalry units are drawn; the other 34 are absent from the picture. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Authorise the arrival ledger (B.2.4) to be extended from the printed places for each undrawn cavalry unit, with the owner's decision on any road not printed. |
| Agent recommendation | Keep the marked model until a source is read; do not read the model as history. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
