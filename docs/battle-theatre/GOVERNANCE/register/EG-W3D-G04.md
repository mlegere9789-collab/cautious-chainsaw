# EG-W3D-G04: Wetness before Jul 1, after Jul 4, and its drying

| Field | Content |
|---|---|
| ID | EG-W3D-G04 |
| Requirement IDs | R15 |
| Category | record missing |
| Description | The wetness schedule (PDF B.10.6) has values only for Jul 1 to Jul 5 00:00; rain of Jun 25-27 and Jul 5 morning is documented without wetness values; no decay is given. |
| Why literal 100% is not possible or blocked | Not in the PDF or the weather file. |
| Evidence searched | docs/battle-theatre/environment/weather_timeline.json, environment/ENV-NOTES.md, BIBLE/plan-clean.txt B.10, app/data/fx3d/params.json; no external search in this round. |
| Autonomous substitute applied | fx3d/env.mjs drying model (21 h time constant after the documented rains), inferred. |
| Strongest evidence-based reconstruction | Exponential drying. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Wetness marked plausible-procedural outside the schedule; statement names W3D-G04. |
| Visual and audio impact | Ground albedo and puddles |
| Review status | internal review only (DEC-006: no public review label); only compiled in software, no real GPU (EG-W3D-G08) |
| Owner decision requested | None needed now |
| Agent recommendation | Keep, marked. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
