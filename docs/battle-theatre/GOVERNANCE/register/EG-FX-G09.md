# EG-FX-G09: Wind speed and direction

| Field | Content |
|---|---|
| ID | EG-FX-G09 |
| Requirement IDs | R13 |
| Category | physics / look parameter not recorded |
| Description | Speed conflict 2 vs 12 mph (CF-WIND-SPEED, PENDING OWNER); direction not recorded for Jun 26-30 and Jul 4; "no breeze during the Charge" is qualitative. |
| Why literal 100% is not possible or blocked | No source in the repository gives the value or position; the plan itself marks smoke, dust and flame plausible-procedural (C.5, T2-122, T2-203). |
| Evidence searched | docs/battle-theatre/BIBLE/plan-clean.txt (smoke, dust, burn, fire, fuse, flash, barn), structures/state_schedule.json, structures/STRUCTURES-NOTES.md, kit/weapons.json, drill/ordnance_tables.json, drill/drill_infantry.json, environment/weather_timeline.json, audio/contract/FIRE_EVENT.md, render/PLAN.md (G12). No external search in this round. |
| Autonomous substitute applied | The effects follow the environment layer's chosen scenario; unrecorded days use S-SSW and are flagged; Jul 3 13:00-16:30 wind scaled by params.wind.calm_charge_scale. |
| Strongest evidence-based reconstruction | The effects follow the environment layer's chosen scenario; unrecorded days use S-SSW and are flagged; Jul 3 13:00-16:30 wind scaled by params.wind.calm_charge_scale. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | Tier overlay on every effect; fires of uncertain time carry a "time uncertain" marker; the effects panel states the share of particles drawn. Parameter tiers: app/data/fx3d/TIERS.json. |
| Visual and audio impact | Smoke, flash, dust and fire layer of the Battle Theatre |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser yet (EG-FX-16) |
| Owner decision requested | Choose the wind-speed scenario (CF-WIND-SPEED) |
| Agent recommendation | Keep the substitute, keep it marked; replace it when a source is found. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |

## Conflict resolution update 2026-11-24 [reader-applied C-045 EG-FX-G09]

C-045 delegated resolution v2 (2026-11-24; class gap, tier plausible-procedural; reversible by the owner; not an owner decision): Light wind, drawn at 2 to 6 mph (marked stand-in)

What changes in this entry: Open gap entry for the wind: to record the class gap, the common origin of the two figures, the period words and the unsettled direction.

The entry's status, owner decision and product marking above are unchanged until the owner confirms; the earlier wording stays as history.
