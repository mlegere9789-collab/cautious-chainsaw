# EG-W3D-G08: WebGPU draw path and real-GPU cost

| Field | Content |
|---|---|
| ID | EG-W3D-G08 |
| Requirement IDs | R03 |
| Category | not yet built / not measurable here |
| Description | The weather and effect passes are implemented and compiled on WebGL2 (SwiftShader, software). The WebGPU port is not drawn yet (the state is computed), and no real-GPU timing can be taken in this environment. |
| Why literal 100% is not possible or blocked | Work item, not an evidence gap; recorded so it is not lost. |
| Evidence searched | docs/battle-theatre/environment/weather_timeline.json, environment/ENV-NOTES.md, BIBLE/plan-clean.txt B.10, app/data/fx3d/params.json; no external search in this round. |
| Autonomous substitute applied | State computed on WebGPU, nothing drawn; WebGL2 is complete. |
| Strongest evidence-based reconstruction | - |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | The effects panel states what is drawn. |
| Visual and audio impact | Effects on WebGPU; every timing gate |
| Review status | internal review only (DEC-006: no public review label); only compiled in software, no real GPU (EG-W3D-G08) |
| Owner decision requested | None needed now |
| Agent recommendation | Build the WebGPU passes (WGSL render exists in fx3d/shaders.mjs) and take the timings listed in BROWSER-VERIFICATION-LIST-WEATHER.md on real hardware. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
