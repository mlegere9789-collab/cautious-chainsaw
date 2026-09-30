# docs/editorial: the review programme for the clock and historical times

> **Status: CANDIDATE. Nothing in this folder is approved by the owner or by a historian, and nothing in it ships until they approve it (D-TIME, D-HIST-REVIEW).** Every anchor is `proposed`; no reviewer has been named; no decision has been recorded. Files marked *generated* are rebuilt by scripts: re-run, do not edit.

Owned by workstream WP-TIME-02/03/06/20 (chapter `docs/plan/FINAL/04-time-model-and-historical-accuracy.md`). The module is `src/lib/time`; the data is `data-src/time/time_anchors.json`; the tools are `tools/time`; the tests are `tests/time`.

## Files

| file | kind | for | what it is |
|---|---|---|---|
| `reviewer-charter.md` | authored draft | owner, reviewer | the role, scope, standard of evidence, hours, second reader, credit, fallback |
| `sign-off-states.md` | authored draft | owner, reviewer, developers | the states from `proposed` to `signed`, who moves an item, what the site shows, the `decisions.jsonl` record |
| `anchor-review-packet.md` | *generated* | the historian | all 33 anchors, review order, one page per R anchor with the evidence rows, the disagreement register, options and their computed consequences, a decision record; spot checks; the owner's design anchors |
| `corrections-page-draft.md` | authored draft | owner | copy for `/corrections` and "About the clock"; candidate log entries held until fixes ship |
| `time-audit.md` | *generated* | owner, historian | how far each clock is from the sourced real times (events within 30 minutes: label 5, map clock 1, 5-minute formula 7, proposed model 86 of 102), in-sample, off-anchor and leave-one-out errors, the TM-V1..V21 table against the frozen legacy site, the content-defect triage |
| `formula-inventory.md` | *generated* | developers | the nine tick-to-clock implementations, evaluated on all 675 ticks, with the regression detectors |
| `clock-bridge.md` | *generated* | owner, developers | what the candidate patch group (`tools/t0/patches-next/CLOCK.json`) changes surface by surface, before/after strings, evidence that it applies, what it does not cover, how to activate |

## How the pieces fit

1. **Anchors** (`data-src/time/time_anchors.json`, schema beside it) define the clock. The module (`src/lib/time`) is a pure function of them: `tickToClock`, `clockToTick`, `tickToLabel`, hour steps, a constant-clock playback helper, honest "about" flags per anchor.
2. **Validators** (`node tools/time/validate.mjs`) measure the frozen site against the model and record a baseline; **surfaces** (`node tools/time/surfaces.mjs`) find every tick-to-clock formula and detect a new one.
3. **The packet** gives the historian what to decide; a decision becomes a `decisions.jsonl` line; the developer updates the anchor, regenerates the golden table (`node tools/time/build.mjs`) and reviews the diff.
4. **The bridge** (candidate patches for the frozen app and static pages) only exists so the same clock can be shown in the legacy app if the rebuild is late; it is inert in `patches-next` and gated on sign-off.

## Commands

```
node tools/time/build.mjs                    # generated module, golden table, ticks.json, inline build (add --check for CI)
node tools/time/validate.mjs [--report]      # TM-V1..V21; --report rewrites time-audit.md; --check compares with the baseline; --strict fails on errors
node tools/time/surfaces.mjs [--check]       # formula inventory; rewrites formula-inventory.md
node tools/time/build-review-packet.mjs      # anchor-review-packet.md
node tools/time/build-clock-patches.mjs      # tools/t0/patches-next/CLOCK.json
node tools/time/check-patches.mjs [--after-t0 --position=end|after-B]
node tools/time/sandbox-build.mjs            # the real T0 build system with CLOCK installed, in a throw-away copy
node tools/time/build-bridge-doc.mjs         # clock-bridge.md
node --test "tests/time/*.test.mjs"          # 115+ tests
```

## What is not done, and what needs a person

- **No historical time has been reviewed.** Only a named historian can turn a row `signed`. The owner must name the reviewer and second reader, sign the three design anchors and the conventions, and choose the "about" threshold (owner decisions 1, 2, 3, 5).
- **No browser was used**: nothing here was checked in a running app. The bridge is proven by parsing, scope analysis, evaluation of the rewritten functions in a vm and the real T0 build gates; a device check at the TX-01 ticks is still owed.
- Not built here: the moments registry (WP-TIME-05), regenerated data (WP-TIME-06 candidates), the Historian tier (WP-TIME-19), solar lighting (WP-TIME-13), sub-page rebuilds. See `docs/plan/FINAL/04-time-model-and-historical-accuracy.md`.
