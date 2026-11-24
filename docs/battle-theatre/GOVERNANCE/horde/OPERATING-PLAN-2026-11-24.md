# Operating plan: efficient, honest, daily gains, running 24/7 inside the allowance (owner order 2026-11-24)

Owner's order: "be ultra efficient with my usage ... anything that burns usage but does not get the website closer to the finish line
is banned ... constant steady rapid honest progress ... ironclad qc ... steady gains towards 100% completion every single day ...
figure out how to keep running at full throttle 24/7 ... develop the plan." Zero scope reduction (Law 1 and 6) stands: this plan
changes how the work is paid for and checked, never what is built.

## 1. What the record shows (measured 2026-11-24 04:28 UTC)

| Fact | Value | Source |
|---|---|---|
| Allowance per weekly window | about $1.8k to $2.1k of this session's API-equivalent cost (cut off at $2,117 in the window to Nov 15; $1,843 in the window Nov 15 to 22) = $260 to $300 a day = $11 to $12 an hour | get_session usage.cost_usd: $2,117 at the Nov 15 22:00 reset, $3,960 now |
| What the full fleet cost | 17 workflows at about $400 an hour used the whole window in about 85 minutes (Nov 16 02:30 to about 03:55 UTC) | workflow durations 79 to 88 minutes, cost $3,441 to $3,960 |
| Cost of one max-effort agent | about $11.6 an hour | $372 an hour over 32 agents, measured Nov 13 to 16 |
| What the burst returned | 11 of about 220 agent runs returned a result; the rest were cut mid-task (their files stay, their reasoning is lost) | task-notifications of the 17 runs |
| Idle after the cut | 6.5 days with nothing running; the window of Nov 22 22:00 UTC has had no work in it yet | git log: last commit Nov 16 04:01 |
| Wake-ups | both scheduled routines fail with ACCESS_DENIED since the PC approval card (last successful delivery Nov 16 00:51; hourly run Nov 24 03:51 and one-shot Nov 24 02:52 failed) | list_triggers last_run |
| Restarts | 48 worker restarts in two days under the 17-wide load, 1 in the 8 idle days | worker_epoch 12 (Nov 14), 60 (Nov 16), 61 (now) |
| The owner's PC | connected (MSI), but its probe session waits for a PowerShell approval in the desktop app and was unreachable from Nov 17 00:10 | get_session of the probe |
| Distance to the finish line | 0 of 969 sub-requirements passing; gate items PASS 206, FAIL 983, BLOCKED-INPUT 3,693, N/A 303, NOT-RUN 3; 0 of 691 timeline rows verified in the canonical file; 0 of 47 conflicts resolved by research; main site 186 of 1,112 items shipped, best clean streak 1 of 8 | tools/horde/scoreboard.py, line 1 of horde/SCOREBOARD.jsonl |

The lesson in one line: the allowance, not the machine, is the limit, and the fleet spent a week of it in 85 minutes and then idled.
"Full throttle 24/7" therefore means a steady burn of about $11 an hour (one agent lane), never a burst. A burst ends in a cut-off
that kills every agent mid-task and leaves nothing running for days.

## 2. Banned from today (each costs usage and moves no gate, requirement or shipped item)

1. A fleet wider than the governor allows (section 3). No more 17 parallel workflows.
2. Re-verification passes on closed work (fourth and fifth readings of the same shard, third scouting of the same plan) unless a gate failed on it or a new source arrived.
3. Polling the model: no 15-minute heartbeat chain, no hourly routine that wakes the model to find that nothing changed. Waiting is done by a shell script that costs nothing (section 7).
4. Agents doing what a script can do: dossiers, counts, merges, status, formatting, running a fixed command. Agents read, judge and write; scripts count and merge.
5. A task without a `moves:` line naming the metric it changes (a gate, sub-requirements, register entries, timeline rows, conflicts, a main-site item, the streak). No `moves:`, no launch.
6. Two reviewers on every small task. One independent max-effort reviewer after the mechanical validator passes; a second only if the first finds a defect.
7. Browser or screenshot jobs without a written question the picture answers.
8. Ceremony: a request note, register proposal, REPORT and progress line per micro-task. Scripts write those from the result files in one pass per day.
9. Starting work in the last four hours before a window cut-off that cannot finish and checkpoint inside them.

## 3. The governor (how the burn stays on the line)

- Window now: Nov 22 22:00 UTC to Nov 29 22:00 UTC. Planning allowance $1,800 a window (recalibrated at every cut-off or reset from the cost log).
- Reserve 15 percent ($270) for this orchestrating session and emergencies. Work budget $1,530: about $268 a day for the 5.7 days left, then $218 a day in later windows.
- Lane = one sequential workflow (`tools/horde/workflows/lane.mjs`): builder, validator, one reviewer, next task. Average cost $7 to $12 an hour depending on the effort mix, so one lane is the allowance. A second lane runs only when the spend is under the pace line.
- Pace line: allowance x (hours elapsed in the window / 168). At each wake: spend (one get_session call) under the line, launch; over the line by more than $60, hold new launches until it is under again. At 90 percent of the planning allowance stop launching; the lane finishes its current task and checkpoints.
- Effort mix: max only for reading sources, weighing evidence and review; medium or high for builders of code and data; low or a cheaper model for scripted chores after a three-task probe shows the same validator results (ironclad QC decides, not price).
- Batches are sized to about one day of budget (8 to 10 tasks), so a finished batch is the wake-up and the next batch is launched at once: no idle hours, one relaunch a day.

## 4. The queue (ordered by gain per dollar; `moves:` is mandatory)

| # | Task | Why first | moves | Cost (judgment) |
|---|---|---|---|---|
| 1 | Cost-free tooling: scoreboard, watchdog, STATE capsule, disk reclaim (done by the orchestrator, no agent) | gains become visible and checkable | scoreboard | $0 |
| 2 | Gate failure triage by class: a script groups the 983 FAIL and 3,693 BLOCKED-INPUT items by reason and says which classes are bookkeeping (fixable in bulk by a script) and which need research | tells where a dollar buys the most PASS | gate items | $25 |
| 3 | Finish the conflict-research kit (the prep run left PLAN, schema, tools and 6 of 47 dossiers): run the dossier builder for all 47, finish the validator with its planted-defect self-test | owner order; unblocks 47 resolutions and gate Q02/Q19 items | conflicts | $25 |
| 4 | Bulk fixes of the bookkeeping gate classes (Q25 237 FAIL, Q02 176, Q19 121, Q23 43) by a registrar script, re-run the gates | largest PASS gain per dollar; honest because only the gate runners count | gate PASS | $120 |
| 5 | Conflicts phase A: the 18 weak ones first (8 plausible-procedural, 7 inferred, 3 open gap), each with a researcher and one independent reviewer, quotes checked by the validator | owner order; the weak ones carry the risk | conflicts | $350 |
| 6 | Conflicts phase B: the 29 documented defaults re-read once against their quotes (validator plus sampling) | proves the first pass | conflicts | $120 |
| 7 | Integrate the 47 resolutions (register, defaults, decision log, viewer source panel, gate inputs) | the owner sees them in the product | conflicts, Q04 to Q06 inputs | $80 |
| 8 | Canonical timeline merge: write the verified shard results (tl-01 to tl-12, evidence_corrections) into the 691 canonical rows, one merge script plus a validator | 0 of 691 verified today; unblocks Q17/Q23 | timeline rows | $60 |
| 9 | Run Q03 to Q06 for the first time and class their failures | 4 runners are written and never run | gate items | $60 |
| 10 | Main site R1g: fix the functional reds in the container; timing runs need real hardware (the PC) | the closest shippable deliverable | main-site items, streak | $150 |
| 11 | Vertical slice (PDF Appendix F calls for it to set unit costs): one battle hour drawn end to end (terrain, units, kit, flags, building states, wounded) and run through every gate that can run | measured unit costs replace guesses and expose integration defects early | gates, sub-requirements | from week 2 |
| 12 | Everything else (rosters, town, life, medical, renderer, realizations, web) only through the slice and the gate failures it exposes, in the order they block gates | breadth-first evidence has produced no passing gate in six weeks | per task | per task |

## 5. Ironclad quality control (cheap checks first, expensive checks only on what survives them)

1. Claim contract: nothing is reported done without three things: the result file, the validator or gate run that exited 0 on it, and its hash in the scoreboard line. A sentence is not evidence.
2. Mechanical first: every deliverable has a validator (quote finder against the local text, schema, gate runner). A reviewer agent starts only after it passes.
3. Negative controls: each runner and validator ships with planted-defect tests that must fail it (the gate runners and the conflict validator have them). They run after any change to the tool, before its results are trusted.
4. Acceptance sampling: a fresh agent re-reads a random 8 percent of every batch of evidence rows (at least 10) against the source or page image. Defect rate above 2 percent re-audits the whole batch. Rates go to `horde/QC-LEDGER.jsonl`.
5. Only the gate runners set `passes`; `apply_passes` refuses when the stored result's input hashes differ from the current inputs.
6. Regression stop: when the daily scoreboard shows a worse metric, new launches stop until the regression is explained and fixed.
7. Reports are generated from the ledger. The daily summary quotes SCOREBOARD.jsonl; prose adds no claim.
8. Release: FINAL-ACCEPTANCE (eight fresh clean passes, regression against the published build, performance green, copy audit) runs on real hardware (the owner's PC); nothing is handed over before.

## 6. Daily gain contract

- `python3 -I tools/horde/scoreboard.py --cost <usd>` runs at the first wake of each UTC day and after each batch. It appends a line and prints the change against the last earlier day. Exit 0 = at least one good metric improved, 3 = stalled day, 4 = regression.
- Good metrics (counts from files): gate items PASS up, FAIL/BLOCKED-INPUT/NOT-RUN down, gates green, sub-requirements passing, timeline rows verified, conflicts resolved, roster lines, main-site items shipped, best clean streak.
- A stalled day (exit 3) makes the next task the stall diagnosis (what blocked the lane, which queue item was wrong); a regression (exit 4) makes it the fix. Each day's targets are written before the batch is launched and checked against the ledger the next morning.

## 7. How it keeps running (wake sources, restarts, disk)

- Wake sources that work now: (a) the completion notice of a workflow (free); (b) `tools/horde/watch.sh` run with run_in_background: a shell loop that costs nothing while it sleeps and exits on LIMIT, STALL, DISK or TICK (every 3 hours); (c) the owner's messages. Scheduled routines are denied for this session: tested, a new one-shot created at 04:27 UTC failed with ACCESS_DENIED at 04:30:18 (cause inferred from timing: the approval card of Nov 16 limited this session to the owner's trusted devices, and the card said that cannot be undone). So there is no 15-minute chain and no hourly routine; both are disabled or deleted. Two more paths were tested at 04:41 and 05:25 and both fail: a routine that starts a fresh tiny session cannot message this session (SendMessage returns an auth error: that credential only covers its own work), and such a session has no GitHub tools, so it cannot even read the ledger to see whether the lane is alive. The only restart-proof signal left is absence: this session pushes a short digest to the owner's device (PushNotification) at least every 6 hours and at each daily scoreboard line (gains, spend, what runs next); if no digest arrives for about 8 hours the lane is dead and any message from the owner restarts it.
- A container restart kills the lane and the watchdog silently. Mitigations: batches are at most one day and every task writes its files as it goes (restart-proof skip lists, plan reuse, STATE.md); the load stays low (1 lane) so restarts are rare (1 in 8 idle days, 48 in 2 days under 17 workflows); a restart is repaired at the next wake. If the ledger shows no new line for 6 hours the owner's one-word message restarts the lane. A PC-side routine could replace that wake-up, but it needs the owner's approval clicks in the desktop app and is not relied on.
- Disk: 5.8 GB free; one lane grows it slowly. Reclaim order when under 4 GB: browser caches, then scratch under tmp/ of closed tasks (tmp/bt-spec, tmp/tl-01, tmp/kit-plan, tmp/fence-*), never tmp/library or docs/.
- Checkpoint: commit and push both branches after every task and at least every 3 hours (a script, no model).

## 8. Window C day by day (Nov 24 to Nov 29, work budget about $268 a day)

| Day | Targets (measured by the ledger) |
|---|---|
| Tue Nov 24 (about 19 h left) | tooling done; queue 2 triage; queue 3 kit finished (READY.json, validator self-test red-first); first lane batch launched |
| Wed Nov 25 | queue 4 first half (Q25 and Q02 bookkeeping classes fixed, gates re-run: FAIL count down); conflicts phase A starts: 6 of 18 weak ones with resolution files |
| Thu Nov 26 | queue 4 second half (Q19, Q23); phase A: 12 of 18 |
| Fri Nov 27 | phase A done (18 of 18); phase B starts; canonical timeline merge |
| Sat Nov 28 | phase B done (47 of 47 with files); integrate; Q03 to Q06 first runs classed |
| Sun Nov 29 (to 22:00) | no launches after 18:00; checkpoint; recalibrate the allowance from the cost log; write window D's batch; scoreboard week report |

Expected by the cut-off (judgment, to be corrected by the ledger): conflicts resolved 47, the bookkeeping gates mostly green, timeline rows verified in the canonical file, Q03 to Q06 run for the first time. Sub-requirements passing will stay at or near 0 until the slice runs: the plan says so now instead of discovering it later.

## 9. What the owner controls

1. The allowance. The record says it is not unlimited: the weekly window cuts at about $1.8k to $2.1k. Remaining work is about $70k to $110k at today's prices (judgment): at $1.8k a week about 40 to 60 weeks; $5k about 14 to 22; $10k about 7 to 11; above about $8k to $10k a week the machine and the eight-pass runs (about 10 to 12 weeks) set the floor. "Get more usage" is the owner's payment.
2. The PC: approve the pending PowerShell request in the MSI probe session in the desktop app (and "always allow" for read-only commands) so sessions on the PC can run GPU, frame-time and acceptance passes without a click each time. Nothing on the PC runs before then.
3. Priority between the main site (closest deliverable) and the Battle Theatre: the plan funds the shared bookkeeping and the conflicts first, then the main-site R1g, then the slice. The owner may re-order.
4. Scope: unchanged. Only the owner reduces it.
