# PERF2 notes (progress file)

- 2026-10-20 (continuation agent): found PERF2.json (9 patches), PG-perf2.json (14 patches), tests/t0/perf2.spec.mjs (12 ids), tools/t0/PERF2-README.md (sections 1-8 written; "Results" and "What remains" missing; patch counts in the README say 8 and 17, actual 9 and 14). Scratch trees exist in tmp/perf2/{p2,base}. Next: rebuild, run spec, build with all candidate groups, fill Results.
- 07:55 P2-09 passes on rerun (earlier fail = blank canvas under machine contention). Checking P2-11 heap, then full-stack scratch build.
- 08:00 P2-11: control also +7.9% (JIT code objects), so not PERF2; test warm-up raised 3->8 cycles, measured 20->14. Re-running.
- 08:10 P2-11 passes on p2 with warm-up 8 / measured 14 cycles. Next: full candidate-stack scratch build.
- 08:15 full stack build: COPY2 and PG-polish-legal anchors fail without PG-legal (not PERF2); retrying with PG-legal
- 08:25 FULL STACK OK: CLOCK,DATA,MON,ANIM,POLISH,PG-polish,PG-legal,PG-polish-legal,PERF2,PG-perf2 all asserts match (0 ANCHOR FAIL). COPY2 as bundle group fails (targets historian.html; must be page group sorting after PG-core, e.g. PG-zcopy2: OK) - integrator note, not PERF2.
- 08:35 P2-12 (--build) PASS. Investigating phone app taps July 1 / Previous step (slow-response 220-380 ms in harness c4 after PERF2, absent from before list) via tmp/perf2/c4phone.mjs.
- 08:50 finding: phone 4x tap July 2 = ~130 ms long task in click handler (forced layout from lS getBoundingClientRect), same on control (base) -> pre-existing, not PERF2. With ANIM stack: FrameRequestCallback 938 ms task after the tap; checking whether ANIM without PERF2 shows the same.
- 08:58 ANIM stack (with or without PERF2) shows 0.8-1.2 s of FrameRequestCallback tasks (4x CPU phone) after a date-jump tap: ANIM issue, reported not fixed. Running final full spec on p2 (tmp/perf2/final-p2.log) and expect-red on base (final-red.log). Remaining: README Results/What remains.
- 09:20 DONE. Final: spec 11/12 pass + P2-12 (--build) pass; control expect-red 8 of 8; full candidate stack builds with 0 anchor fails. README Results and What remains written.
