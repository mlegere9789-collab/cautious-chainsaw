# tl-VP-T3-135: Row T3-135 not yet verified or realized

| Field | Content |
|---|---|
| ID | tl-VP-T3-135 |
| Requirement IDs | R11, R04 |
| Category | evidence missing (row not yet verified or realized) |
| Seed rows | T3-135 |
| Description | Seed row T3-135 (Jul 3 19:32 sunset (sun az, tier inferred) is still seeded_unverified. The shard reading (tl-11) gave verdict "computed"; this is not a verification and the row has no visual realization record. Shard note: Reproduced from the repository ephemeris (astropy and Meeus agree to 0.01 min). Matches the row. LMT clock is a project convention; South Mountain horizon not modelled (the row says so). |
| Why literal 100% is not possible or blocked | The row stays seeded_unverified until a recorded primary-source check marks it verified (CLAUDE.md hard rule); it is not realized until a realization record passes gate Q17. Neither has happened. |
| Evidence searched | Shard tl-11 results (timeline_verified.jsonl): citation ["docs/battle-theatre/environment/ephemeris_1863.json (events 1863-07-03) and ENV-NOTES.md"]; passage sunset 1171.693 min LMT = 19:31.7; civil dusk 20:04.2; nautical 20:45.2; astronomical 21:32.7; sun az 296.35 alt 4.50 at 19:00 LMT. Reading status: claim_unsupported_by_or_text. |
| Autonomous substitute applied | Row carried at its seed tier (inferred), marked unverified; any conflicting values carried as selectable scenarios, no default. |
| Strongest evidence-based reconstruction | The shard citation above; nothing added. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | Tier glyph on the event; unverified-row marker in the evidence layer. |
| How it would be closed | An independent primary-source check recorded in timeline_corrections and the Decision Log, then a passing realization record (scene) for the row. |
| Owner decision requested | - |
| Status | open (proposed by tools/bt/propose_row_gaps.py) |
