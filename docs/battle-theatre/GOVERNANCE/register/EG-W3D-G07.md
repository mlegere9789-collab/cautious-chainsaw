# EG-W3D-G07: Wind direction on days with no record

| Field | Content |
|---|---|
| ID | EG-W3D-G07 |
| Requirement IDs | R15 |
| Category | record missing |
| Description | Jun 26-30 and Jul 4 have no recorded wind direction; S to SSW is carried from the other days. |
| Why literal 100% is not possible or blocked | Not recorded. |
| Evidence searched | docs/battle-theatre/environment/weather_timeline.json, environment/ENV-NOTES.md, BIBLE/plan-clean.txt B.10, app/data/fx3d/params.json; no external search in this round. |
| Autonomous substitute applied | S-SSW (180 to 202.5 degrees) as in fx3d/env.mjs; flagged by directionRecorded = false. |
| Strongest evidence-based reconstruction | S-SSW. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | Tier mark; statement names W3D-G07. |
| Visual and audio impact | Smoke drift and cloud drift |
| Review status | internal review only (DEC-006: no public review label); only compiled in software, no real GPU (EG-W3D-G08) |
| Owner decision requested | None needed now |
| Agent recommendation | Keep, marked. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
