# EG-FX-G07: March cadence and dust accounts

| Field | Content |
|---|---|
| ID | EG-FX-G07 |
| Requirement IDs | R13 |
| Category | physics / look parameter not recorded |
| Description | drill/*.json has no marching cadence; the PDF says "no direct dust accounts". |
| Why literal 100% is not possible or blocked | No source in the repository gives the value or position; the plan itself marks smoke, dust and flame plausible-procedural (C.5, T2-122, T2-203). |
| Evidence searched | docs/battle-theatre/BIBLE/plan-clean.txt (smoke, dust, burn, fire, fuse, flash, barn), structures/state_schedule.json, structures/STRUCTURES-NOTES.md, kit/weapons.json, drill/ordnance_tables.json, drill/drill_infantry.json, environment/weather_timeline.json, audio/contract/FIRE_EVENT.md, render/PLAN.md (G12). No external search in this round. |
| Autonomous substitute applied | Gait comes from the animation; 90 steps/min fallback, marked inferred. Dust drawn only when the ground is dry by the wetness model. |
| Strongest evidence-based reconstruction | Gait comes from the animation; 90 steps/min fallback, marked inferred. Dust drawn only when the ground is dry by the wetness model. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | Tier overlay on every effect; fires of uncertain time carry a "time uncertain" marker; the effects panel states the share of particles drawn. Parameter tiers: app/data/fx3d/TIERS.json. |
| Visual and audio impact | Smoke, flash, dust and fire layer of the Battle Theatre |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser yet (EG-FX-16) |
| Owner decision requested | None needed now; evidence welcome |
| Agent recommendation | Keep the substitute, keep it marked; replace it when a source is found. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
