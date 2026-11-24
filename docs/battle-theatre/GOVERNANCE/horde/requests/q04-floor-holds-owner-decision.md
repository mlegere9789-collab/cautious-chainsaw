# Request to the owner: arrival floors that are later than a conflict resolution's instant (Q04.1, Q04.5, Q04.6)

Written 2026-11-24 by the Q04-Q06 triage (tools/bt/q456_triage.py). Nothing here was changed: no floor moved, no gate lowered, no conflict scenario chosen. This is the list of the decisions only the owner may take (Law cl. 6; DEC-DELEG-J keeps them with the owner).

## What the gate found

Q04.1 says a unit has zero presence before the earliest documented value of its own arrival window (the minimum of its earliest and its printed values in `history/arrivals.json`). 153 items failed (144 Q04.1, 6 Q04.5, 3 Q04.6) in 44 units. Every one is a selectable conflict value, or the `earliest` view (every conflict at its earliest value), that is earlier than the unit's own floor:

| conflict | units (count) | the unit's own floor | earlier values that were drawn before the floor | where the instants come from |
|---|---|---|---|---|
| C-005 Hood at Seminary Ridge | cs-1c-hood children: Anderson, Benning, Robertson, Henry artillery (14 units) | 05:30 Jul 2 (printed clock of the first-on-field cell) | 05:00 (the integrated default, position C-005-P5), about 04:35 sunrise (P4); `earliest` view 04:35 | conflicts/resolutions/C-005.json: Fremantle's diary puts Hood on the ridge after 5 a.m. (Hood himself, not the division); no source documents an earlier time for the soldiers (FLOOR-HOLDS.md) |
| C-007 McLaws on the ridge | cs-1c-mclaws children: Barksdale, Kershaw (10 units) | 08:00 Jul 2 | 07:00 (default P3), 06:00 (P5, P6), about 04:35 (P7) | resolutions/C-007.json: 07:00 is an inferred upper bound (Fremantle: Longstreet placing the division at 7); Kershaw documents a march from sunrise, no arrival hour |
| C-004 II Corps arrival | us-2c-2d children: the regiments and attached companies of Hall, Harrow and Webb (14 units) | 06:00 Jul 2 (printed in the ledger for Gibbon's division) | 22:30 Jul 1 (PDF value, P1), about 03:00 (P10), about 04:00 (P8, third division), window 04:00-06:15 (P12) | resolutions/C-004.json: P8 (about 04:00) names the first brigades of the Third Division, not Gibbon's; P10 (about 03:00) is the corps roused and the 1st Minnesota (Harrow's brigade, inside the failing division) ordered into position, which is an order, not a documented arrival on the field. Whether it supports an earlier floor for Harrow's brigade is for the owner's decision 4 |
| C-023 Stuart's arrival | cs-cav-hampton children (6 units; Q04.5 and the Stuart case of Q04.6) | 19:32 Jul 2 (the labelled convention "dusk", start of the DUSK band; not a record) | noon to 13:00 (P1, `earliest` view), 13:00 drawn | resolutions/C-023.json: Hampton was at Hunterstown before 19:32 (Green, Hampton); the resolution gives no clock for Stuart or the brigades. The PDF itself exempts Hampton's rear guard from the evening gate |

C-021 (Pickett's infantry: resolution 03:00 Jul 3, floor 04:36) is in FLOOR-HOLDS.md and has a floor hold, but no unit failed on it in the Q04 result (the units' own floor is later than the value any scenario draws).

## What was done without an owner decision

The product rule was wrong, not a floor: `app/src/history/arrivals.mjs` lowered a unit's earliest and default to a chosen value even when that value is earlier than the unit's own floor. It now draws the chosen value at the floor (`max(value, floor)`, floor = minimum of the unit's earliest and printed values), keeps the value selectable, and adds a note to the unit's arrival card ("the chosen value is earlier than the arrival floor of this gate; drawn at the floor, which is not moved"). This is what FLOOR-HOLDS.md already promised for the default view. Test: `history.test.mjs` "floors: ...".

## Decisions requested

1. **Keep every floor as it is** (the current state): the selectable earlier values stay listed and marked, and the viewer draws every unit at its floor. Nothing further to do. This is the default if you do not answer.
2. **Move a floor** for a group above, to the resolution's instant (for example Hood's children to 05:00, McLaws's to 07:00), knowing: the earlier instants are inferred upper bounds for the head of the column or for the commander, not documented times for the soldiers (Law cl. 3: a reconstruction is registered and marked, tier inferred). Moving a floor is a change of the Q04 bound itself and is yours to order; I will not do it on my own.
3. **Hampton (C-023) only:** the 19:32 floor is a labelled convention, and the resolution says the record puts Hampton at Hunterstown before 19:32. Choose one: keep 19:32; or set Hampton's floor at a documented earlier moment you accept. No source in the repository gives an hour for him, so I cannot supply one without inventing it.
4. **C-004 and the corps' divisions:** whether a chosen PDF value for the whole corps (22:30 Jul 1 and others) is to move the printed gate of a division whose own ledger cell prints 06:00 (current rule after the fix: it does not; the division stays at 06:00 and the card says so).

Answer by number in the Decision Log (a line `DEC-nnn: floor decision`). Until then every item stays as the fix leaves it.
