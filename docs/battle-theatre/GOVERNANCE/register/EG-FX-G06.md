# EG-FX-G06: Smoke, dust and flame physics of 1863

| Field | Content |
|---|---|
| ID | EG-FX-G06 |
| Requirement IDs | R13, R17 |
| Category | physics / look parameter not recorded |
| Description | The PDF supplies no measured smoke yield, extinction, plume rise, flame length or dust yield; T2-122 is itself plausible-procedural ("sector-by-sector smoke accounts were not found"). |
| Why literal 100% is not possible or blocked | No source in the repository gives the value or position; the plan itself marks smoke, dust and flame plausible-procedural (C.5, T2-122, T2-203). |
| Evidence searched | docs/battle-theatre/BIBLE/plan-clean.txt (smoke, dust, burn, fire, fuse, flash, barn), structures/state_schedule.json, structures/STRUCTURES-NOTES.md, kit/weapons.json, drill/ordnance_tables.json, drill/drill_infantry.json, environment/weather_timeline.json, audio/contract/FIRE_EVENT.md, render/PLAN.md (G12). No external search in this round. |
| Autonomous substitute applied | Physically coherent look parameters, every one tier-marked in TIERS.json; the benchmark is the plan's G12 band (flash 80-150 ms, plume 15-25 s, dirt column 10-25 m). |
| Strongest evidence-based reconstruction | Physically coherent look parameters, every one tier-marked in TIERS.json; the benchmark is the plan's G12 band (flash 80-150 ms, plume 15-25 s, dirt column 10-25 m). |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Tier overlay on every effect; fires of uncertain time carry a "time uncertain" marker; the effects panel states the share of particles drawn. Parameter tiers: app/data/fx3d/TIERS.json. |
| Visual and audio impact | Smoke, flash, dust and fire layer of the Battle Theatre |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser yet (EG-FX-16) |
| Owner decision requested | None needed now; evidence welcome |
| Agent recommendation | Keep the substitute, keep it marked; replace it when a source is found. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
