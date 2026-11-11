# EG-W3D-G01: Sky with no cloud record

| Field | Content |
|---|---|
| ID | EG-W3D-G01 |
| Requirement IDs | R15, R18 |
| Category | record missing |
| Description | The weather file carries numeric cloud readings only from 1 Jul 21:00 to 3 Jul 21:00 (7 readings, one ambiguous, one empty); the environment layer sets full cover on 1 Jul and 4 Jul from the sky text. For every other minute (26-30 Jun, 5-14 Jul, 18-19 Nov, and the 2 Jul 21:00 reading) there is no cloud number. |
| Why literal 100% is not possible or blocked | Nothing was recorded; nothing can be found in the repository. |
| Evidence searched | docs/battle-theatre/environment/weather_timeline.json, environment/ENV-NOTES.md, BIBLE/plan-clean.txt B.10, app/data/fx3d/params.json; no external search in this round. |
| Autonomous substitute applied | Sky drawn with cover 0.3 (the value environment.light() already assumes), marked plausible-procedural; the product states "no cloud reading". |
| Strongest evidence-based reconstruction | Cover 0.3, one procedural layer. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Tier mark on the sky; the weather statement names W3D-G01. |
| Visual and audio impact | Weather and sky of the Battle Theatre |
| Review status | internal review only (DEC-006: no public review label); only compiled in software, no real GPU (EG-W3D-G08) |
| Owner decision requested | None needed now |
| Agent recommendation | Keep the substitute and the mark; replace it when readings are found (data-src/environment/weather_by_day.json has Jun 27-30 sky text the PDF omitted). |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
