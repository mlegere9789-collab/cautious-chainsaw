# Completion campaign (owner order 2026-11-13: full throttle, no pauses, until the website including the Battle Theatre is complete)

Thirteen workflows run side by side. Each owns its own files (the ownership list is in its script); cross-workstream needs go through request notes in `GOVERNANCE/horde/requests/`. Scripts: `tools/horde/workflows/<name>.mjs` (re-launch with the Workflow tool and `scriptPath`; a run of the same session resumes with `resumeFromRunId`). Machine lock for heavy and browser jobs: `tools/horde/bench.sh` (`--timing` runs alone).

| Workflow | Run id (2026-11-13 launch) | What it finishes |
|---|---|---|
| r1g-acceptance | wf_6c7f0668-799 | Release 1 train R1g: harness proxy fix, triage of every red suite against R1f, repair train R1h if a real defect exists, eight passes, zips, final report |
| main-site-closure | wf_acca1346-42d | Master plan (docs/plan/FINAL): status of every item, open items built as candidate patch groups under candidates/r1h/ or as source-rebuild work |
| bt-gate-engine | wf_67f36137-9c6 | Gates Q01-Q28 as runners (tools/bt/gates), audits, passes applied only where a gate ran and passed |
| bt-timeline-closure | wf_b2d0019e-59a | 691 timeline rows: corrections from the Official Records recheck, source search for unverified rows (GOVERNANCE/timeline_corrections) |
| bt-evidence-closure | wf_6fa417ec-410 | Evidence shards for R03, R12, R13, R14, R21, R22, OA (GOVERNANCE/evidence_corrections) |
| bt-units-positions | wf_9d712c4c-357 | Undrawn and partly drawn units (439 of 726 drawn at launch): arrivals, positions, paths into the history layer |
| bt-rosters | wf_f0142130-a75 | OA03 roster section of both armies from public-domain state rosters (rosters/data2, app/roster) |
| bt-renderer | wf_57e01547-353 | Extension loader, LOD cross-fade, figure looks, flags, first-entry time, horse items; WebGPU weather and effects path, gate hooks, night floor, audio gaps, star catalogue |
| bt-spec-health | wf_ddad4ced-d39 | The ten browser specs on software rendering, screenshot baseline (Q24), staging pack verification |
| bt-world-content | wf_41c39aa2-8fc | Monuments and tour stops, casualty and hospital flow (Q26), building states (Q09), vegetation (Q21), claim ledger (Q19, Q02), event cards |
| bt-oob-kit | wf_07683328-dce | Commanders, strengths, arms, guns and dress per unit against the sources; verified tables for Q01 and Q14 |
| bt-realizations | wf_9b242d4a-1a0 | Q17: query harness, a realization record per timeline row, build list for what the product does not show |
| bt-web-evidence | wf_34068d00-b59 | Photo-match (Q16) with Library of Congress images, Park Service landscape reports, 1863 newspapers, retries of failed lookups, library queue (Q25) |

## Standing facts
- Not attainable in the cloud container: real-GPU frame timing (Q15), a seen WebGPU picture, listening to the audio mix, real phones, Safari and Firefox. These stay listed as owed; no gate is lowered for them.
- Owner-only acts stay with the owner: accounts, licence acceptance, payments, contacting third parties, publishing zips.
- After each workflow ends: read its result, record it below, launch its next round or the next-wave workstream (site integration of the Battle Theatre into the main site as a patch group; final acceptance of the Battle Theatre per FINAL-ACCEPTANCE.md; photo-match once camera positions or the Library of Congress image hosts are reachable).

## Log
- 2026-11-13 19:00 UTC: all twelve workflows launched.
- 2026-11-13 19:05 UTC: network: tile.loc.gov, cdn.loc.gov, chroniclingamerica.loc.gov, www.nps.gov, www.npshistory.com, www.gutenberg.org, catalog.archives.gov and gettysburginteractivemap.com reachable; babel.hathitrust.org and ehistory.osu.edu answer 403 from their own bot block (blocked). The published site answers 404 for /tiles1863/v1-65d491b8/index.json: it does not serve the 1863 tile pyramid. Thirteenth workflow bt-web-evidence launched.
- Horde check at launch: every agent response so far was served by the session model at effort max, speed standard (fast mode is flagged on for the session but is not what the service delivers on this model).
