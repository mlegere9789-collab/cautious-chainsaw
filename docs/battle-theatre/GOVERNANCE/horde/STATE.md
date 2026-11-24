# STATE (read this first on every wake; it replaces reading CAMPAIGN.md, which is the long history)

Updated 2026-11-24 04:35 UTC by the orchestrating session. Plan: OPERATING-PLAN-2026-11-24.md. Ledger: SCOREBOARD.jsonl.

Nothing is running. Last fleet died Nov 16 about 03:55 UTC on the weekly limit. Window now: Nov 22 22:00 to Nov 29 22:00 UTC
(planning allowance $1,800; cost at the start of the window $3,960 of the session total; recalibrate from get_session usage.cost_usd).

On every wake, in this order, and nothing else:
1. `date -u`; `df -h /` (under 4 GB: reclaim per plan section 7).
2. `python3 -I tools/horde/scoreboard.py --cost <usage.cost_usd from get_session>` (first wake of the UTC day, and after each batch). Exit 3 stalled day, 4 regression: next task is the diagnosis or the fix.
3. Spend vs pace line (plan section 3). Over the line by more than $60: hold. At 90 percent of the allowance: no new launches.
4. If no lane is running and spend allows: launch the next batch (8 to 10 queue items with `moves:`), `args.skip` from `python3 tools/horde/closed.py --args <script>`.
5. Start the watchdog in the background: `bash tools/horde/watch.sh 10800` (run_in_background). It exits on LIMIT, STALL, DISK or TICK.
6. Commit and push both branches (`main-2hmypf` and `main`), fetch first, never force.
7. Append one line to CAMPAIGN.md only when something changed. Tell the owner only what changed and what is true, quoting the scoreboard.

Banned: see plan section 2. No fleet wider than the governor, no re-verification of closed work, no model polling, no task without `moves:`.
Scheduled routines are denied for this session (ACCESS_DENIED since the PC approval card of Nov 16); wake sources are workflow-completion
notices, the watchdog and the owner's messages.

Open owner items: approve the pending PowerShell request in the MSI probe session (session_01YP4o7Ri5VkRJD1AtuhsG2G) for PC work;
the allowance (the weekly window is not unlimited); main site versus Battle Theatre priority.

Queue head (plan section 4): 2 gate failure triage by class; 3 finish the conflict kit (READY.json); 4 bookkeeping gate fixes; 5 conflicts phase A (18 weak first).
