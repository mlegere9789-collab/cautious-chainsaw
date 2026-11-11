# ws10-EG-CAV-07: Cavalry that the layer does not draw

| Field | Content |
|---|---|
| ID | ws10-EG-CAV-07 |
| Requirement IDs | R01, R03 (horses, riders and the dismounted fight are part of the units and the battle as drawn); PDF B.6.14, B.6.15 |
| Category | evidence missing |
| Description | Of the 55 cavalry regiments and battalions of the order of battle, the real layer draws 21:  the 5 regiments of the Reserve Brigade, the 5 of McIntosh, the 4 of J. I. Gregg's, 6 of Hampton's and the 35th Virginia Battalion; Gamble's and Devin's regiments, Custer's Michigan Brigade, Farnsworth's brigade and the rest of Stuart's command have no road of approach or place in the ledgers and are drawn with 0 figures. This is the history layer's open gap, not narrowed here. |
| Why literal 100% is not possible or blocked | No non-lead source acquired states the missing quantity; see the description. |
| Evidence searched | kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E (claims named in app/data/cavalry-horses.json), kit/artillery_batteries.json losses. |
| Autonomous substitute applied | The model in app/src/history/cavalry.mjs, marked open gap on the unit card (section Riders and horses) and in app/data/cavalry-horses.json. |
| Strongest evidence-based reconstruction | As stated in the description; no value is promoted above its tier. |
| Confidence tier | open gap |
| Product marking | Unit card section "Riders and horses": range, basis, tier pill and gap id. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Confirm or replace the model parameter named in the description; read the OR page or the regimental history that would settle it. |
| Status | open (proposed by workstream ws10; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
