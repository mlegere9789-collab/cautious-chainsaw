# Request: run the town validator with `--complete` in the group and integration prompts

From: bt-town workstream, planning step (second run, 2026-11-15). To: the orchestrator (`tools/horde/workflows/bt-town-buildings.mjs`, not owned by bt-town).

## What

Two edits to the task texts of the workflow:

1. In `T_GROUP`, replace `run python3 tools/bt/town/validate_evidence.py ${g.id}` with `run python3 tools/bt/town/validate_evidence.py ${g.id} --complete` (and keep "if it is missing or wrong, write a request note and validate by hand").
2. In `T_INTEG`, replace `validate mechanically first with tools/bt/town/validate_evidence.py --all` with `validate mechanically first with tools/bt/town/validate_evidence.py --all --complete`.

## Why

`docs/battle-theatre/town/evidence/PLAN.md` sections 3.7 and 10 define a finished group as one for which `validate_evidence.py <group> --complete` passes, and the whole pass as finished when `--all --complete` passes. Without the flag the validator checks only the rows that exist: a group file that declares three of a group's 140 structures, or that omits the required fields of a declared building, passes. With the flag it refuses a group in which any structure of the group's inventory (`evidence/groups.json` `members`) is neither declared nor named in the `links` of a building row, in which a declared building lacks a row (an open-gap row counts) for any required field of its profile, or which records no search. That is the rule that keeps a group pass from narrowing the requirement silently (CLAUDE.md, The Law, clauses 1 and 7).

Nothing else is needed from the orchestrator: the group agents are pointed to PLAN.md, which already tells them to run `--complete` (section 5, step 5), so this request only makes the prompt and the plan agree.
