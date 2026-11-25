# STATE (read this first on every wake)

PAUSED by the owner at 2026-11-25 (message "pause"). Nothing is running: both agents stopped, the watchdog and the gate chains were killed. Resume only when the owner says so.

## Where things stand (all pushed to main-2hmypf and main)
- 47 conflicts researched, reviewed twice, integrated (defaults v2, DEC-DELEG-J). Q04 floors untouched; owner decision requests in horde/requests/q04-floor-holds-owner-decision.md.
- Timeline: 24 of 691 rows verified (QC demoted 12 of the first 36); all 691 covered by register entries (1,024 entries). Q17, Q18, Q23 coverage pass. Strict gates green: Q04 only (PASS 5,088 after independent review).
- Kit evidence: all 26 groups evidenced (checker exit 0 for each) BUT three independent QC samples failed (3.75 percent, 10.6 percent, 9.8 percent vs 2 percent). The evidence is NOT accepted. Q01/Q14 numbers that depend on it are provisional: do not report them as gains.
- oob_adopt selection rule rewritten (bounds stay bounds, pre-battle return window). Q01 about PASS 2,909, FAIL 310, BLOCKED 514; Q14 PASS 94, FAIL 72.

## Stopped mid-work (unfinished, uncommitted work was committed as WIP)
1. Gate composition fix (agent a376e854...): the review found the Q01.3 composition check (commit ee87d6da, q01_oob.py ~l.478 and q01_layer.mjs) loosens the gate. The agent had written 7 new red tests in tests/governance/gates/test_q01.py (so test_q01 now shows 7 failures ON PURPOSE) but had NOT yet edited the gate. Until the gate is tightened the loosened composition check is live: treat Q01.3 results as unreliable. Needed: strict rule (exactly 2 keys, one muskets key plus one officers key, same basis/date/report, documented tier, weakest tier), composition mutation in mutation_check.py, PROPOSED AMENDMENT in GATE-SPEC plus PENDING OWNER entry (never DECIDED), flag pre_battle_return on 29 units and show it in the product.
2. Evidence checker hardening (agent a0f460b7...): new checker error classes (as_of narrower than quote, tier for unnamed unit, names missing from quote, differing figures without conflict set, bounds without hedge, enlisted_only, point as_of for undated narrative), then fix every flagged line and apply the QC-3 listed fixes (cs-anderson:0192, cs-heth:0121, us-2c-1d:0204/0239/0195, us-3c-1d:0316, us-5c:0193, cs-hood:0137, us-1c:0410, us-2c-2d3d:0299, us-6c:0253, cs-art-1c:0109). Was only at the step of running the checker over all groups. Evidence files us-1c and us-art-reserve-horse have uncommitted partial edits: re-run python3 -I tools/bt/kit_evidence_check.py <group> --coverage --require-complete for every group before trusting any of it.
3. After both: rebuild python3 -I tools/bt/kit_verified.py build, oob_adopt --check, Q14 and Q01 runners (bench.sh, one heavy job at a time), then a fourth QC sample (acceptance: 2 percent or less).

## Restore done at the pause
The killed hardening scripts left kit/evidence half rewritten (every group failed the new rules and some pairs were open). I restored kit/evidence/*.jsonl and tools/bt/kit_evidence_check.py to commit 2f2be9e6 (all 26 groups exit 0 under the old checker), rebuilt the verified tables (verified units 298, partly 515, unverified 12; batteries verified 91) and confirmed oob_adopt --check and check_governance.py. The new checker rules are kept, unfinished, in tools/bt/kit_evidence_check_hardening_WIP.py with the tests in tests/governance/test_kit_evidence_rules.py (that test file fails against the restored checker: expected). QC-3 listed line fixes are NOT applied in the restored evidence.

## Open owner items
- Q04 floor holds (Hood 05:30, McLaws 08:00, II Corps 06:00, Hampton 19:32) and whether a PDF value moves a division's own gate.
- Q01.3 composition amendment (pending once written).
- Weekly allowance, main-site vs Battle Theatre priority, PC attach for GPU/audio work.
- check_governance.py change: a timeline row may leave seeded_unverified only through tools/bt/merge_timeline_verification.py with evidence.

## Wake rules after the owner resumes
date -u; df -h / (reclaim scratch under 4 GB, never tmp/library); scoreboard; start watch.sh 10800 in the background; launch the next task BEFORE ending any turn; commit and push both branches; push a digest every 6 hours.
