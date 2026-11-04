# EG-AUD-G07: 1863 atmosphere profile (humidity, pressure, wind and temperature with height)

| Field | Content |
|---|---|
| ID | EG-AUD-G07 (audio gap AUD-G07) |
| Requirement IDs | R03, R06 |
| Category | physics-impossible |
| Description | The 1863 atmosphere (humidity, pressure, vertical profiles of wind and temperature) is unknown; the engine uses a uniform atmosphere: temperature documented at the Jacobs readings, humidity inferred, wind bearing inferred within S to SSW, speed a scenario choice (CF-WIND-SPEED). |
| Why literal 100% is not possible or blocked | Not measured in 1863 beyond the Jacobs readings (Law cl.3). |
| Evidence searched | environment/weather_timeline.json; PDF B.10.4, C.6, S.3. |
| Autonomous substitute applied | Homogeneous model plus two explicit scenarios (shadow_zone, downwind_duct) that are never defaults; the model over-predicts range (no turbulence, no ground excess) and does not reproduce the documented non-hearing by Ewell's party. |
| Strongest evidence-based reconstruction | Homogeneous model plus two explicit non-default scenarios. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | documented-reports.json records the mismatch; far.mjs SCENARIOS. |
| Visual and audio impact | Audibility range, sound shadow and duct effects. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none (work continues) |
| Agent recommendation | - |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
