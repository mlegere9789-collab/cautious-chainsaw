# STATE (read this first on every wake; it replaces reading CAMPAIGN.md, which is the long history)

Updated 2026-11-24 04:45 UTC by the orchestrating session. Plan: OPERATING-PLAN-2026-11-24.md. Ledger: SCOREBOARD.jsonl.

Running (05:05 UTC): two conflict researchers, C-016 and C-005 (queue 5, plausible-procedural ones first), and the zero-token watchdog `watch.sh 10800`. Conflict kit is DONE and independently re-checked (READY.json; validator self-test 55 planted defects caught; 33 tests pass; 47 dossiers). Cost of the kit agent about $3 (277k tokens, 16 minutes). Last fleet died Nov 16 about 03:55 UTC on the weekly limit. Window now: Nov 22 22:00 to Nov 29 22:00 UTC
(planning allowance $1,800; cost at the start of the window $3,960 of the session total; recalibrate from get_session usage.cost_usd).

On every wake, in this order, and nothing else:
1. `date -u`; `df -h /` (under 4 GB: reclaim per plan section 7).
2. `python3 -I tools/horde/scoreboard.py --cost <usage.cost_usd from get_session>` (first wake of the UTC day, and after each batch). Exit 3 stalled day, 4 regression: next task is the diagnosis or the fix.
3. Spend vs pace line (plan section 3). Over the line by more than $60: hold. At 90 percent of the allowance: no new launches.
4. If no lane is running and spend allows: launch the next batch (8 to 10 queue items with `moves:`), `args.skip` from `python3 tools/horde/closed.py --args <script>`.
5. Start the watchdog in the background: `bash tools/horde/watch.sh 10800` (run_in_background). It exits on LIMIT, STALL, DISK or TICK.
6. Commit and push both branches (`main-2hmypf` and `main`), fetch first, never force.
7. Append one line to CAMPAIGN.md only when something changed. Tell the owner only what changed and what is true, quoting the scoreboard.

Done today with no model: `python3 -I tools/bt/kit_verified.py build` wrote kit/verified_oob.json (825 units: 80 verified, 48 partly, 697 unverified) and verified_batteries.json (131 batteries, all unverified); Q01 re-run: PASS 0 -> 2,069, BLOCKED-INPUT 3,510 -> 1,238, FAIL 133 -> 435 (66 planted-defect tests of the Q01 runner pass). Gate items overall PASS 206 -> 2,275 (ledger line 04:37Z).
Rule that follows: every finished kit-evidence group raises PASS by itself. After any lane task run `python3 -I tools/horde/after_task.py --cost <usd>` (rebuild tables, re-run the light gates, append a ledger line).
Known defect: q20_cavalry.py crashes with `duplicate item id Q20/Q20.1/CS.CAV.11VA/default` because 31 kit ids are shared by more than one table unit (CS.KERSHAW by 6); the stored Q20.json is stale (Nov 16). Fix is a bounded task (queue 2b). Q14 stays blocked until artillery kit evidence lands (131 batteries unverified).

Banned: see plan section 2. No fleet wider than the governor, no re-verification of closed work, no model polling, no task without `moves:`.
Scheduled routines are denied for this session (ACCESS_DENIED since the PC approval card of Nov 16); wake sources are workflow-completion
notices, the watchdog and the owner's messages.

Open owner items: approve the pending PowerShell request in the MSI probe session (session_01YP4o7Ri5VkRJD1AtuhsG2G) for PC work;
the allowance (the weekly window is not unlimited); main site versus Battle Theatre priority.

After each researcher finishes: run its validator myself (exit 0 or it is not done), then ONE independent max-effort reviewer, then the next two conflicts. Weak list: plausible-procedural C-005 C-007 C-012 C-016 C-023 C-026 C-042 C-045; inferred C-006 C-008 C-011 C-013 C-024 C-041 C-044; open gap C-018 C-037 C-038.
Queue head (plan section 4): 2b Q20 runner shared-kit-id fix (red-first test, re-run) and Q01 remaining 435 FAIL / 1,238 BLOCKED by class; 2 gate failure triage by class; 3 finish the conflict kit (READY.json); 4 bookkeeping gate fixes; 5 conflicts phase A (18 weak first).
