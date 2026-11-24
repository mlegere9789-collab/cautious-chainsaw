# EG-FX-G08: Fire timing inside date-only windows, and burn durations

| Field | Content |
|---|---|
| ID | EG-FX-G08 |
| Requirement IDs | R06, R13 |
| Category | physics / look parameter not recorded |
| Description | Sherfy barn (Jul 2 evening to Jul 3 afternoon), Bliss (Jul 3 morning), trestle (Jun 26 or 27): the part of the day is not recorded; no burn duration is recorded for any building. |
| Why literal 100% is not possible or blocked | No source in the repository gives the value or position; the plan itself marks smoke, dust and flame plausible-procedural (C.5, T2-122, T2-203). |
| Evidence searched | docs/battle-theatre/BIBLE/plan-clean.txt (smoke, dust, burn, fire, fuse, flash, barn), structures/state_schedule.json, structures/STRUCTURES-NOTES.md, kit/weapons.json, drill/ordnance_tables.json, drill/drill_infantry.json, environment/weather_timeline.json, audio/contract/FIRE_EVENT.md, render/PLAN.md (G12). No external search in this round. |
| Autonomous substitute applied | Fire drawn at half intensity and marked "time uncertain" inside the window; growth, peak and decline times are plausible-procedural. The owner picks a scenario or a clock (PENDING OWNER). |
| Strongest evidence-based reconstruction | Fire drawn at half intensity and marked "time uncertain" inside the window; growth, peak and decline times are plausible-procedural. The owner picks a scenario or a clock (PENDING OWNER). |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Tier overlay on every effect; fires of uncertain time carry a "time uncertain" marker; the effects panel states the share of particles drawn. Parameter tiers: app/data/fx3d/TIERS.json. |
| Visual and audio impact | Smoke, flash, dust and fire layer of the Battle Theatre |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser yet (EG-FX-16) |
| Owner decision requested | Pick a scenario or give a clock for the Sherfy barn and the Bliss fires (PD-01 and the Bliss row) |
| Agent recommendation | Keep the substitute, keep it marked; replace it when a source is found. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |

## Conflict resolution update 2026-11-24 [reader-applied C-026 EG-FX-G08]

C-026 delegated resolution v2 (2026-11-24; class irreducible, tier inferred; reversible by the owner; not an owner decision): During the battle: from the Jul 2 afternoon fight (once wounded men were in the barn) to the end of Jul 3

What changes in this entry: The fire layer reads date-only windows; the default is now a two-day window with no instant.

The entry's status, owner decision and product marking above are unchanged until the owner confirms; the earlier wording stays as history.
