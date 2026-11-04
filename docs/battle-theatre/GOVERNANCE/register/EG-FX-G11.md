# EG-FX-G11: Muzzle-flash jet length and duration per weapon

| Field | Content |
|---|---|
| ID | EG-FX-G11 |
| Requirement IDs | R13 |
| Category | physics / look parameter not recorded |
| Description | Only the project's own estimates exist (audio/contract/FIRE_EVENT.md section 3; render G12): "tens of ms", "several metres", "50-100 ms" and "80-150 ms". |
| Why literal 100% is not possible or blocked | No source in the repository gives the value or position; the plan itself marks smoke, dust and flame plausible-procedural (C.5, T2-122, T2-203). |
| Evidence searched | docs/battle-theatre/BIBLE/plan-clean.txt (smoke, dust, burn, fire, fuse, flash, barn), structures/state_schedule.json, structures/STRUCTURES-NOTES.md, kit/weapons.json, drill/ordnance_tables.json, drill/drill_infantry.json, environment/weather_timeline.json, audio/contract/FIRE_EVENT.md, render/PLAN.md (G12). No external search in this round. |
| Autonomous substitute applied | Jet length L = k * cbrt(charge) with k fitted to those words; duration carried as the union range. |
| Strongest evidence-based reconstruction | Jet length L = k * cbrt(charge) with k fitted to those words; duration carried as the union range. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Tier overlay on every effect; fires of uncertain time carry a "time uncertain" marker; the effects panel states the share of particles drawn. Parameter tiers: app/data/fx3d/TIERS.json. |
| Visual and audio impact | Smoke, flash, dust and fire layer of the Battle Theatre |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser yet (EG-FX-16) |
| Owner decision requested | None needed now; evidence welcome |
| Agent recommendation | Keep the substitute, keep it marked; replace it when a source is found. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
