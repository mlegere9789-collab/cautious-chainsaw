# EG-LIB-TM-HOSTS-BLOCKED: Library source TM-HOSTS-BLOCKED (blocked): Access blocks met 2026-10-21 (recorded, not circumvented)

| Field | Content |
|---|---|
| ID | EG-LIB-TM-HOSTS-BLOCKED |
| Requirement IDs | R21 |
| Category | evidence missing / blocked |
| Description | Status row TM-HOSTS-BLOCKED (blocked). Where: digitalcommonwealth.org and geo.btaa.org (Anubis browser-verification page), davidrumsey.com (Verify Access page), collections.library.yale.edu (empty response to the fetch tool), loc.gov item pages (HTTP 403 via the fetch tool; HTTP 520 via curl on several item ids), tile.loc.gov (HTTP 520 once). Record: no retry loops, no header spoofing; Commons/archive.org/LOC JSON used instead where they answered |
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
