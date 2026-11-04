# EG-ANIM-01: Real rate and tempo of fire of a unit at a minute of the battle

| Field | Content |
|---|---|
| ID | EG-ANIM-01 (animation gap G-ANIM-01) |
| Requirement IDs | R03, R04, R17 |
| Category | evidence-gap (animation) |
| Description | Only a training standard (3 rounds a minute), weapons.json rates (2-3, weak sources) and artillery planning rates exist. No unit-level fire tempo, volley synchrony or ammunition expenditure per minute is documented per regiment in the acquired texts. |
| Why literal 100% is not possible or blocked | The acquired primary texts (Hardee 1861, Casey 1862, Gibbon 1860, Light Artillery Board 1863, Ordnance Manual 1861) do not state it; no footage or motion capture exists for 1863. |
| Evidence searched | drill/DRILL-NOTES.md, drill/DRILL-HARDEE-NOTES.md, drill/drill_*.json, drill/ordnance_tables.json, kit/weapons.json, the plan Section M and G9 (render/PLAN.md) |
| Autonomous substitute applied | Fire plan with a declared seconds-per-round RANGE per weapon (drill-tables.mjs FIRE_RATE); the scenario/owner may narrow it |
| Strongest evidence-based reconstruction | See docs ANIM3D-NOTES.md, section "Gaps" |
| Confidence tier | plausible-procedural |
| Competing values | Ranges are carried, no default is chosen against a source; see drill-tables.mjs |
| Product marking | Clips carry their tier in data/anim3d/clips.json; the card of a drawn unit shows the tier of its animation basis |
| Visual and audio impact | Pace, rhythm and manner of loading, firing, marching and falling |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none; a default view is the owner's (Law 6) |
| Agent recommendation | keep the range; narrow it only from a source |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
