# Distance to total completion and time estimate (written 2026-11-16 during the full pause)

Owner's question: how far is the website (main site and Battle Theatre) from total completion under the current revised
plan, what can Claude do and not do, and how many weeks until it is totally complete if every bit of the owner's usage
goes to it starting with the window that opens 2026-11-22 22:00 UTC. The owner's order stands: everything stays paused.

Everything marked "measured" was read from the repository or the session record today. Everything marked "judgment" is
an estimate and is labelled so. Nothing here is a claim that any requirement is met.

## 1. Where it stands (measured)

Battle Theatre, against its own acceptance test (docs/battle-theatre/GOVERNANCE, `python3 tools/bt/check_governance.py`):

| Measure | Now |
|---|---|
| Sub-requirements passing | 0 of 969 (22 requirements R01-R22 plus OA01-OA12) |
| Sub-requirements linked to an open register entry | 508 (links are not passes); 461 neither passing nor linked |
| Register entries (marked gaps) | 487 open |
| Gates (Q01-Q28) passing | 0 of 28 |
| Gates with a first result file | 7 (Q01, Q02, Q14, Q19, Q20, Q23, Q25), all with failures |
| Gate runners written but not yet run | 4 (Q03, Q04, Q05, Q06) |
| Gates with no runner of their own | 17 (Q07-Q13, Q15-Q18, Q21, Q22, Q24, Q26-Q28) |
| Timeline rows visually realized | 0 of 691 (Q17: 315 covered by an open register entry, 376 uncovered) |
| Timeline rows verified in the canonical file | 0 of 691 (all `seeded_unverified`; the verification sits in unmerged shards) |
| Source conflicts carried as selectable scenarios | 47 (defaults all PENDING OWNER) |
| Appendix F budget caps (gate Q27) | blank; only the owner can set them |

Evidence gathered so far (measured, not passes): 950 of 969 sub-requirements have an evidence row; 293,357 roster lines
in 177 unit files; 1,596 position/undrawn records; 2,167 kit evidence lines; 1,358 camp-life, 968 medical and 959 town
evidence lines (OA10 to OA12, first passes only); 2,997 evidence-correction lines. Since 2026-11-13: 3,565 files changed.

What is on screen: instanced soldiers one to one, with known defects (jacket colour, maroon flag panels, dark faces,
blocky distant figures). The town is mostly flat masses: 40 extruded footprints, 229 flat borough masses, 117 markers,
and 16 of 41 building records without a footprint. OA10 (accurate 3D town), OA11 (camp work and meals) and OA12
(field hospitals, trauma, treatment) are at the evidence stage; almost none of it is rendered.

Main site (docs/plan/STATUS/STATUS.md, 1,108 items): 187 shipped to the release candidate (16.9 percent), 76 built but
not in a train, 451 open and buildable, 187 waiting on a decision the owner delegated, 174 owner-only, 33 superseded.
Acceptance: 0 of 8 consecutive clean passes on R1g (best streak on R1f: 1; R1d, R1e and R1f each missed). R1g still has
19 of 80 suites not OK (11 performance suites with 26 failing tests, 12 red functional suites in triage). Nothing is
deployed; deploying is the owner's act.

Judgment: by the plan's own 14 phases (docs/battle-theatre/GOVERNANCE/budget/phase_budget.json) the Battle Theatre build
is about 25 to 30 percent of the way, almost all of it in the evidence and governance phases; it is at 0 percent on the
acceptance test. The main site is about a quarter built by item count and at 0 of 8 on acceptance.

## 2. What Claude can and cannot do here

Can: read and cross-check primary sources at volume (second readings, digit audits against page images); write and test
code and data pipelines; run many agents in parallel under a file ledger; keep gaps registered and visible; refuse to mark
anything passing without running the gate.

Cannot, in this container: measure on a real GPU (frame time Q15, the WebGPU picture), listen to audio, test Safari,
Firefox or phones, create accounts or accept licences, spend money, contact third parties, deploy. Those stay with the
owner. The machine has 4 vCPU, 15 GB RAM, software GL, and a disk allowance that falls about 2 GB an hour under a full
fleet (about 6 GB free at the pause); jobs waited 42 to 70 minutes for the machine lock; the container restarted every 40
minutes to 2 hours on 2026-11-13 and 14, and a restart stops every workflow.

Cut-offs are costly: the journals of the current session show 749 agent starts and 102 returned results. The rest were
stopped by weekly limits, restarts, one interrupt and the pause; their files remain, their unfinished reasoning does not.

Where the record does not exist, literal 100 percent is impossible (DEC-003). Those items become marked gaps with a tier,
never a claimed pass.

## 3. Usage facts (measured, then inferred)

- Session cost (API-equivalent) $3,330 at the pause; the full fleet burns $330 to $440 an hour (measured $372 an hour over
  about 7.7 fleet-hours since 2026-11-13).
- Limit events: rejected at about $1,365 and again at about $2,117 of session cost in the window that ended 2026-11-15 22:00
  UTC (the owner's retry in between let it run further). In the new window $1,213 was used in the first 3.8 hours and the
  status is `allowed_warning`. I cannot see the allowance itself.
- Planning number (inferred): one weekly window is worth about 5 fleet-hours (range 4 to 6), about $1,400 to $2,100.
  If the owner knows the real figure, scale the weeks below linearly.

## 4. Estimate to total completion (judgment, built from the measured facts above)

One fleet-hour (FH) is the sixteen-workflow fleet running for an hour. "Complete" means: all 969 sub-requirements passing
or carried as a marked gap with an active reconstruction, all 28 gates run, the Battle Theatre final acceptance and the
main-site R1g acceptance (eight consecutive clean passes each), tutorial PDF, copy audit. It does not include owner-only
acts, real-device proof or any claim of literal 100 percent.

| Stage | Remaining FH (likely) | Range |
|---|---:|---:|
| Finish the evidence layers (16 running streams, OA10-OA12 evidence, merge, registrar, tier overlay) | 28 | 18-42 |
| Build the product (3D town, figures, flags, camp life, hospitals, animation, 691 realizations, conflict scenarios, sound, night, interface) | 85 | 45-140 |
| Gates (17 runners, run and fix all 28) | 35 | 20-60 |
| Main site (638 open or delegated items, R1g red suites) | 55 | 30-90 |
| Acceptance (two eight-pass runs, tutorial PDF, copy audit) | 15 | 8-30 |
| Subtotal | 218 | 121-362 |
| With waste at the observed rate (cut-offs, restarts, rework), x1.35 | about 295 | 150-540 |

At 5 FH a window: about 59 weeks on the straight sum. The ranges are not independent, so the 80 percent band is narrower
than the sum of extremes: **expected about 55 weeks (finishing about 12 December 2027), 80 percent band 35 to 90 weeks
(about 25 July 2027 to August 2028)**, counted from the window that opens 2026-11-22 22:00 UTC.

Floor: with unlimited usage the container still sets a floor of about 10 to 12 weeks (sixteen acceptance passes need
exclusive machine time, software-rendered visual checks are slow, some steps are sequential).

## 5. What would move the number (owner's levers; none is taken without the owner)

1. More usage per week: weeks scale inversely until the machine becomes the limit.
2. Effort per stage: mechanical stages (merges, renames, test runs) at lower effort could cut cost by roughly a quarter to a
   third; evidence reading and review stay at max.
3. Real hardware: attaching the owner's PC (Remote Control) would let the GPU, WebGPU, frame-time and audio checks run and
   would speed up the look-and-adjust loops; without it Q15 and the real-device half of the acceptance stay owed.
4. Scope: only the owner may reduce scope or set the default view of a conflicting source; none has been reduced.
5. Owner decisions and acts owed: Appendix F budget caps (Q27), the 47 conflict defaults, accounts, licences, payments,
   permission requests, the ACW author statement, mocap spend, deployment.

## 6. State of the pause

All 16 workflows stopped, the hourly heartbeat disabled, the 15-minute chain deleted, the checkpoint loop stopped, every
agent-started background job killed (last ones: the OCR queue loop `ocr_queue.sh`, an orphaned `pdftoppm`, `after.sh`).
Six NC roster files had been rewritten at 01:52 UTC by a rebuild that was still running when the pause applied (valid gzip;
1st North Carolina 1,583 rows became 1,582): the committed versions were restored so no soldier is silently dropped; the
rebuilt copies are kept in the session scratchpad and a resumed rosters run regenerates them for review.
Nothing restarts until the owner says so. Resume steps: CAMPAIGN.md, entry "FULL PAUSE".
