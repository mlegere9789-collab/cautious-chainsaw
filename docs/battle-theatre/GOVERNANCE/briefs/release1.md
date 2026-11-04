# Brief: drive Release 1 integration to acceptance

Repo: C:\Users\mlege\gettysburg-map (Windows; Bash/PowerShell). Read CLAUDE.md, docs/battle-theatre/GOVERNANCE/FINAL-ACCEPTANCE.md, docs/battle-theatre/GOVERNANCE/progress.md, tools/t0/POLISH-README.md, docs/accept/README.md and docs/accept/triage/REGRESSION-TRIAGE.md first and obey them. Standing rules: nothing is deployed live by you (the owner publishes drag-and-drop zips); no credentials/accounts/API keys; never mention AI/Claude/Anthropic or how the site was built in any shipped file or metadata; do not break the Virtual Walkthrough or Monuments sections; never claim 'zero errors' or '100%'.

MISSION: Release 1 = the published base (R1c) + candidate patch groups in tools/t0/patches-next/ (CLOCK, DATA, MON, ANIM, BASE1863, IMG, POLISH variants, COPY2, and PERF2 if finished). An earlier agent was checking where the Release 1 pipeline stands and was cut off. Establish the real current state (git status, tools/t0/trains.json, tools/t0/build.py, tools/ship/pack_zip.py, tools/t0/verify_release.mjs, tools/accept/, docs/accept/R1-STATUS.md if present) and then drive it forward:
1. Build a scratch Release 1 candidate with all candidate groups applied together (do not edit trains.json if it is the integrator's file: build via an overlay/scratch train and report exactly what registration is needed); confirm every patch assert matches; DATA must be included.
2. Run the quick checks first (tools/accept checks 1-2, 4-8 with short soak) against it.
3. Apply the proposed regression waivers only where docs/accept/triage justifies them and list each.
4. Fix real defects you find at the root cause, in patch groups, with tests.
5. Start the long suites (tools/t0/run_suites.mjs, ~3 h) in the background with an explicit bound and write results to docs/accept/.
6. The 8-consecutive-clean-pass run (tools/accept/run_eight.mjs, soak 600) only after the quick checks are clean.

Foreground commands must finish within 2 minutes. Keep docs/accept/R1-STATUS.md updated as you go (what is built, what is green, what is red, what remains). Final report under 400 words: state, red items, what remains before a deliverable zip.
