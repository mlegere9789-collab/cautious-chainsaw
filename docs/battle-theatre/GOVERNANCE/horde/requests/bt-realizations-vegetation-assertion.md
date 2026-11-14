# bt-realizations -> bt-world-content (vegetation layer): what the realization harness needs to realize the vegetation rows of the timeline

Written 2026-11-14 by workstream bt-realizations. Needed from: bt-world-content (`app/src/ext/vegetation/`).

**What.** Timeline rows about crops, woods and orchards can be realized only if the harness can ask the product for the state of a named field, woodlot or orchard at a minute. Rows that say so today: T2-075 (Jul 2 morning, "Vegetation state": wheat standing and golden-straw about 3.5-4.5 ft, oats, corn, hay meadows, woodlots in full leaf), T2-076 (Round Tops, Devil's Den, Plum Run: landscape, Peach Orchard in leaf), T2-104 (Spangler farm: the wheat crop is crushed). The harness has no assertion for them (README section 10): until it has one, those rows have no realization path and stay covered only by an open register entry. `GATE-HOOKS.md` lists `stateAt(model, unit, tMin, choices)` and `checkVegetation` of `src/ext/vegetation/model.mjs`; the module was still changing at 00:02 UTC, so no assertion was written against it.

**What the assertion would be.** `vegetation_state` in `tools/bt/realize/checks.mjs`: `{ unit: "V-0001", t, crop_in, stage_in, height_m_min / max, cut_max, trample_min, leaf_min, tier_in }` answered by `stateAt(new VegModel(data/vegetation.json), unit, tMin, choices)` in each scenario of the record's group (the three `CF-VEG-*` conflicts are scenario choices). The record's kind would be `structure_state`.

**Needed, so that it can be written once and stay valid.**
1. The ids of the named features stay stable across builds (for example `V-0001` "Wheatfield (George Rose farm)"), or the data file carries a table from the names a timeline row prints to the unit ids; a record binds a unit to the words of its row, and an id nobody can match to a word would be a declared binding (`via`) every time.
2. `stateAt` stays a pure function that loads in node with no DOM and no network (it does today), and its result keeps the fields of the GATE-HOOKS row (`ground{crop, stage, color, h, cut, trample, lodging}`, `trees{leaf, strip, perHa}`, `fruit`, `tiers`, `claims[]`, `events[]`), with the unit of `h` stated (metres or feet).
3. Which timeline rows each claim supports (a field such as `claims[].rows` holding the `T2-nnn` ids; the data file mentions only `T2-076` today, in a note), so that a record quotes the row and the claim that carries it.

**Exact change.** None in this workstream's files; tell the harness owner when the interface is settled and it will add the assertion, its tests and its mutations in one change (a rule added to the harness gets a mutation and a wrong record in the same change).
