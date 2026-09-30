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
| `candidate-data-diff.md` | *generated* | owner, historian | WP-TIME-06: the reviewable diff of regenerated data files (chronology labels from the model with `time_legacy` kept, calendar dates, metadata truth, duration claims, successions); legacy data never touched; `--write-tree` materialises a candidate tree |
| `clock-bridge.md` | *generated* | owner, developers | what the candidate patch group (`tools/t0/patches-next/CLOCK.json`) changes surface by surface, before/after strings, evidence that it applies, what it does not cover, how to activate |

## How the pieces fit

1. **Anchors** (`data-src/time/time_anchors.json`, schema beside it) define the clock. The module (`src/lib/time`) is a pure function of them: `tickToClock`, `clockToTick`, `tickToLabel`, hour steps, a constant-clock playback helper, honest "about" flags per anchor.
2. **Validators** (`node tools/time/validate.mjs`) measure the frozen site against the model and record a baseline; **surfaces** (`node tools/time/surfaces.mjs`) find every tick-to-clock formula and detect a new one.
3. **The packet** gives the historian what to decide; a decision becomes a `decisions.jsonl` line; the developer updates the anchor, regenerates the golden table (`node tools/time/build.mjs`) and reviews the diff.
4. **The bridge** (candidate patches for the frozen app and static pages) only exists so the same clock can be shown in the legacy app if the rebuild is late; it is inert in `patches-next` and gated on sign-off.

## What the module guarantees (and what proves it)

| guarantee | where | proved by |
|---|---|---|
| Every integer tick has ONE exact clock value; `minutesToTick(tickToMinutes(t)) === t` for all 675 ticks, `Math.floor(minutesToTick(m)) === floorTick(m)` for every clock value (no epsilon anywhere) | `src/lib/time/core.js` (`MIN`, `floorTick`) | `tests/time/exact.test.mjs` (ulp neighbours of every tick, linear-scan oracle), TM-V12 (now exact, not a 1e-9 tolerance) |
| Playback crosses each tick exactly once (`crossed` is decided by `floorTick`, the same table `tickToMinutes` reads); `advance(0)` never reports a crossing; a NaN frame length is a TypeError | `src/lib/time/playback.js` | `tests/time/playback-random.test.mjs` (long randomized runs against an independent pointer-walk oracle, seeks, gaps, clamped stalls) |
| The public model rejects NaN, undefined, null, strings, objects and infinities with a TypeError that names the argument (`tickAfterMinutes(538, "60")` is an error, not a string concatenation); a string that is not a real calendar time is a RangeError | `src/lib/time/extras.js` (validation layer over the lean core) | `tests/time/exact.test.mjs` |
| The bridge coerces every numeric argument (tick NaN becomes 1, minutes NaN becomes 0, +-Infinity clamps); nothing throws, nothing returns NaN | `src/lib/time/bridge.js` | `tests/time/bridge.test.mjs` (28 hostile values x every method, lean core equals validating model) |
| `validateAnchors` never throws: every field is type-checked, a safety net reports an unforeseen crash as `V1.internal`; malformed ranges, gaps, slopes and configuration numbers are errors; "ok" always means the model builds | `src/lib/time/anchors.js` | `tests/time/anchors-robust.test.mjs` (targeted cases plus a seeded fuzz of 4000 mutated documents) |
| Load-time limits of chapter 04 section 4.2 are enforced when the model is built: first tick 1, last tick = `tick_max`, strictly increasing in tick AND minutes, slope 0.75..60 min/tick (`doc.slope` overrides) | `makeCore` | `tests/time/exact.test.mjs` |
| The circular anchor t5 is class D at runtime (`effective_status` is honoured: `tickToClock(5).basis`, the anchors view, the class) | `makeCore`, `extras.js` | `tests/time/exact.test.mjs` |
| The bridge never prints the frame number as text and never says "tick" (chapter 04 section 4.9): the frame number is a tooltip only | `tools/time/build-clock-patches.mjs` (guard), CLK-08/09 | `tests/time/patches.test.mjs` (both rows evaluated with the real inlined module) |
| The ES-module route bundles the 4 KB runtime subset of the anchors, not the 25 KB source document | `src/lib/time/index.js`, `anchors.runtime.generated.js` | `tests/time/bundle.test.mjs` (static import graph and a dynamic module-hook trace) |
| The inlined bridge is pruned to what it calls, minified with terser, self-contained, deterministic, within the 2.5 KB brotli budget | `tools/time/inline.mjs` | `tests/time/inline.test.mjs` (byte-identical to the generated file, free-name check, parity on 675 ticks x 10 styles) |
| A new tick-to-clock formula, however it is spelled, turns TM-V9 / V16 / V17 and `surfaces.mjs --check` red; the visitor's own clock does not | `tools/time/detectors.mjs` | `tests/time/detectors.test.mjs` (positive and negative shapes), `tests/time/mutation.test.mjs` (11 realistic injected defects, each red on both checks; 5 benign injections stay green) |

Two builds of one source: the **ES route** (`src/lib/time/index.js`: validated public API, runtime anchors) and the **inline build** (`tools/time/build/gtbg-time.inline.js`: the lean core pruned to the bridge, anchors pre-parsed to minutes, no validation because the document is validated at build time). Code between `/*@strip ... */` and `/*@endstrip*/` markers in `core.js` is the part the inline build removes.

## Commands

```
node tools/time/build.mjs                    # generated modules (full + runtime subset), golden table, ticks.json, inline build (add --check for CI)
node tools/time/validate.mjs [--report]      # TM-V1..V21; --report rewrites time-audit.md; --check compares with the baseline; --strict fails on errors
node tools/time/surfaces.mjs [--check]       # formula inventory; rewrites formula-inventory.md
node tools/time/build-review-packet.mjs      # anchor-review-packet.md
node tools/time/relabel-data.mjs [--write-tree <dir>]   # WP-TIME-06 candidate data edits under tools/time/build/candidate-data
node tools/time/build-clock-patches.mjs      # tools/t0/patches-next/CLOCK.json
node tools/time/check-patches.mjs [--after-t0 --position=end|after-B]
node tools/time/sandbox-build.mjs            # the real T0 build system with CLOCK installed, in a throw-away copy
node tools/time/build-bridge-doc.mjs         # clock-bridge.md
node --test "tests/time/*.test.mjs"          # 320+ tests (npm run time:test)
```

## What is not done, and what needs a person

- **No historical time has been reviewed.** Only a named historian can turn a row `signed`. The owner must name the reviewer and second reader, sign the three design anchors and the conventions, and choose the "about" threshold (owner decisions 1, 2, 3, 5).
- **No browser was used**: nothing here was checked in a running app. The bridge is proven by parsing, scope analysis, evaluation of the rewritten functions in a vm and the real T0 build gates; a device check at the TX-01 ticks is still owed.
- Not built here: the moments registry (WP-TIME-05), the Historian tier (WP-TIME-19), solar lighting (WP-TIME-13), sub-page rebuilds. See `docs/plan/FINAL/04-time-model-and-historical-accuracy.md`.
