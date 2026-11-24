# EG-LIB-BOT-BLOCKED-HOSTS: Library source BOT-BLOCKED-HOSTS (blocked): Hosts that answered with a bot block or a throttle breach (recorded, not retried)

| Field | Content |
|---|---|
| ID | EG-LIB-BOT-BLOCKED-HOSTS |
| Requirement IDs | R21 |
| Category | evidence missing / blocked |
| Description | Status row BOT-BLOCKED-HOSTS (blocked). Where: babel.hathitrust.org and ehistory.osu.edu (bot block); www.loc.gov (two requests in one second). Record: babel.hathitrust.org and ehistory.osu.edu answered with their own bot block on 2026-11-13 (library_ids.json bot_blocked_hosts; task rules of the bt-gates workstream); never retried. Earlier records: ehistory.osu.edu HTTP 403 to scripted requests 2026-10-19 (acquired.json blocked); babel.hathitrust.org no connection 2026-11-11 (status OR-27-1..3 second_witness). Throttle breach: acquisition entries NPS-HABS-pa0004 and NPS-HABS-pa0010 (www.loc.gov) both carry fetched_at 2026-11-15T23:56:08, so two requests fell in one second; the ledger time ca |
| Why literal 100% is not possible or blocked | Not literal-100% blocked by the record of the event: the source exists; the library row is blocked as stated (Law cl.3, cl.4). |
| Evidence searched | GOVERNANCE/library/status*.json, acquired*.json, candidates.json, figures-ledger.json as read by tools/bt/library_status_fill.py |
| Autonomous substitute applied | None (no datum is taken from this source until it is acquired and read) |
| Strongest evidence-based reconstruction | Re-attempt or acquire lawfully, record the exact passages, then update the status row |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Source row flagged in the source catalog with its status |
| Visual and audio impact | Source availability only; no direct visual impact |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none (work continues) |
| Agent recommendation | - |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
