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
| **Options are arguments too** (RV-02): `roundMin` (a whole number of minutes, 0..1440), `approx` (`true`, `false`, `'auto'`), `style` (one of the ten words in `STYLES`), `extrapolate` (a boolean) and the options object itself are checked where they enter; a bad one is a TypeError (wrong kind) or RangeError (wrong range) that names it, never `"NaN:NaN AM"`; `null` and `undefined` mean "default" | `src/lib/time/extras.js` (`optsOf`, `roundOf`, `approxOf`, `styleOf`, `extrapOf`) | `tests/time/options.test.mjs` (generators over function x option x hostile value, the rounding really rounds, the three label functions agree on `approx`) |
| The bridge coerces every numeric argument (tick NaN becomes 1, minutes NaN becomes 0, +-Infinity clamps) **and its style argument** (RV-04): anything that is not one of the ten style words (undefined, a number, a Symbol, an object with a throwing `toString`, an unknown string) is `'compat'`, by strict equality, so nothing can throw; nothing returns NaN; the inline build gives the same answers | `src/lib/time/bridge.js` (`STYLES` comes from `core.js`) | `tests/time/bridge.test.mjs` (28 hostile values x every method, lean core equals validating model), `tests/time/options.test.mjs` (hostile styles on three bridges and the inline build) |
| `validateAnchors` never throws: every field is type-checked, a safety net reports an unforeseen crash as `V1.internal`; malformed ranges, gaps, slopes and configuration numbers are errors; "ok" always means the model builds | `src/lib/time/anchors.js` | `tests/time/anchors-robust.test.mjs` (targeted cases plus a seeded fuzz of 4000 mutated documents) |
| **The validator and the model agree** (RV-01, S4b): a configuration value that `validateAnchors` accepts is the value the model uses (`approx_sigma_min: 0` is 0, not the default 10: `||` defaults are gone, only an absent value takes its default), a present value of the wrong kind is refused by the model as well, and the model is never stricter than the validator on a field the validator lets through (`release`, `review_flag` are validated now) | `core.js` (load-time checks in the stripped region), `anchors.js` | `tests/time/agreement.test.mjs` (every top-level and per-anchor field x a pool of 30+ values incl. every falsy one, an independent oracle for "about" at 7 thresholds, random documents, the inline build) |
| Load-time limits of chapter 04 section 4.2 are enforced when the model is built: first tick 1, last tick = `tick_max`, strictly increasing in tick AND minutes, slope 0.75..60 min/tick (`doc.slope` overrides) | `makeCore` | `tests/time/exact.test.mjs` |
| The circular anchor t5 is class D at runtime (`effective_status` is honoured: `tickToClock(5).basis`, the anchors view, the class) | `makeCore`, `extras.js` | `tests/time/exact.test.mjs` |
| The bridge never prints the frame number as text and never says "tick" (chapter 04 section 4.9): the frame number is a tooltip only | `tools/time/build-clock-patches.mjs` (guard), CLK-08/09 | `tests/time/patches.test.mjs` (both rows evaluated with the real inlined module) |
| The ES-module route bundles the 4 KB runtime subset of the anchors, not the 25 KB source document | `src/lib/time/index.js`, `anchors.runtime.generated.js` | `tests/time/bundle.test.mjs` (static import graph and a dynamic module-hook trace) |
| The inlined bridge is pruned to what it calls, minified with terser, self-contained, deterministic, within the 2.5 KB brotli budget | `tools/time/inline.mjs` | `tests/time/inline.test.mjs` (byte-identical to the generated file, free-name check, parity on 675 ticks x 10 styles) |
| A new tick-to-clock formula turns TM-V9 / V16 / V17 and `surfaces.mjs --check` red **by value, not by spelling** (RV-03): the 5-minute step as `300000`, `300_000`, `3e5`, `300e3`, `300 * 1000`, `5 * 60 * 1000`, `0x493E0` ...; a literal date table indexed by the tab; a hand-typed clock inside a string or markup ("Pickett steps off at 3:00 PM"); in ANY script-bearing file at any depth (root scripts such as `site-nav.js`, `js/`, `.mjs`, `.svg`, `.astro` ...). The visitor's own clock, a timer (`ttl = 5 * 60 * 1000`, `setTimeout(f, 300000)`), `x * 60000`, `Math.floor(months / 12)`, `(max - min) * 5` stay quiet, and 17 MB of real-world library code (node_modules) raises no tick, hour-base, date-table or typed-clock hit | `tools/time/detectors.mjs`, `tools/time/data.mjs` (`loadTreeFiles`, one loader for every consumer) | `tests/time/detectors.test.mjs` (positive and negative shapes), `tests/time/detectors-sweep.test.mjs` (generated spellings x shapes x wrappers, a corpus of benign code, node_modules), `tests/time/scope.test.mjs` (every kind of file and depth), `tests/time/mutation.test.mjs` (17 realistic injected defects, each red on both checks; 8 benign injections stay green) |

Two builds of one source: the **ES route** (`src/lib/time/index.js`: validated public API, runtime anchors) and the **inline build** (`tools/time/build/gtbg-time.inline.js`: the lean core pruned to the bridge, anchors pre-parsed to minutes, no validation because the document is validated at build time). Code between `/*@strip ... */` and `/*@endstrip*/` markers in `core.js` is the part the inline build removes.

## Commands

```
node tools/time/build.mjs                    # generated modules (full + runtime subset), golden table, ticks.json, inline build (add --check for CI)
node tools/time/validate.mjs [--report]      # TM-V1..V21; --report rewrites time-audit.md; --check compares with the baseline; --strict fails on errors
node tools/time/surfaces.mjs [--check]       # formula inventory; rewrites formula-inventory.md
node tools/time/build-review-packet.mjs      # anchor-review-packet.md
node tools/time/relabel-data.mjs [--write-tree <dir>]   # WP-TIME-06 candidate data edits under tools/time/build/candidate-data
node tools/time/build-clock-patches.mjs      # tools/t0/patches-next/CLOCK.json
node tools/time/check-patches.mjs [--after-t0 --position=end|after-B]   # --after-t0 starts from the tree the T0 build starts from (tools/t0/trains.json base.dir, baseline/dist since 2026-09-30), CRLF-aware
node tools/time/sandbox-build.mjs            # the real T0 build system with CLOCK installed, in a throw-away copy
node tools/time/build-bridge-doc.mjs         # clock-bridge.md
node --test "tests/time/*.test.mjs"          # 530+ tests (npm run time:test)
```

## What the lint cannot see (known limits of tools/time/detectors.mjs)

The detectors are heuristics over text, tuned with sweeps in both directions (`tests/time/detectors-sweep.test.mjs`). They are a tripwire for the shapes a developer writes, not a proof that no clock is computed anywhere.

- **Named constants written in another file.** `(t - 1) * FIVE_MIN` is caught when the constant has a step word (`FIVE_MIN`, `STEP_MS`, `msPerTick`, `MS_PER_FRAME`), and the definition is caught when its name carries a tick word (`STEP_MS = 300_000`, `MINUTES_PER_TICK = 5`). `const MIN = 60 * 1000` with `t * 5 * MIN` and a one-letter `t` is not.
- **A single-letter variable with no offset and no clock word nearby**, `const x = t * 5;`, is quiet on purpose (it is also a grid, a page offset, a price). `(t - 1) * 5`, a tick-named operand (`tick`, `currentTick`, `frameIdx`, `TICK_MS`) or a statement that says hours / minutes / AM / PM / a Date that is not the visitor's own turns it red.
- **Typed 24-hour clocks without AM/PM** (`"05:00"`, `h + ":" + String(m).padStart(2, "0")`) are not flagged: duration and video-time formatting look the same. `TM-V3` / `TM-V4` read the data files, not code.
- **`5 * 60` and `60 * 5` outside a timer** are read as the 5-hour base in minutes (that is the legacy formula): `const fps = 60 * 5;` is a false positive. A timer statement (`setTimeout`, `ttl`, `cache`, `delay`, `maxAge`, a name such as `secs` / `timeoutMs`) is never flagged.
- **Code built at run time** (`eval`, `new Function`, a script fetched from another origin) and clocks painted into images or PDFs are out of reach.
- **The counts moved on purpose.** On the frozen legacy tree the improved detectors report TM-V9 92 (was 55), TM-V16 8 (7), TM-V17 42 (13): the extra hits are one real date table (`dashboard.html`: `dayNames = ['July 1', 'July 2', 'July 3']` indexed by the day) and 36 hand-typed clocks in strings and markup (30 monument and tour labels in the bundle, page prose, a Sandbox preset); the original 4 date, 8 tick*5, 5 hour-base, 1 allow-listed wall clock and 13 typed AM/PM hits are unchanged. Baselines were re-recorded (`validate.baseline.json`, `surfaces.baseline.json`).

## What is not done, and what needs a person

- **No historical time has been reviewed.** Only a named historian can turn a row `signed`. The owner must name the reviewer and second reader, sign the three design anchors and the conventions, and choose the "about" threshold (owner decisions 1, 2, 3, 5).
- **No browser was used**: nothing here was checked in a running app. The bridge is proven by parsing, scope analysis, evaluation of the rewritten functions in a vm and the real T0 build gates; a device check at the TX-01 ticks is still owed.
- Not built here: the moments registry (WP-TIME-05), the Historian tier (WP-TIME-19), solar lighting (WP-TIME-13), sub-page rebuilds. See `docs/plan/FINAL/04-time-model-and-historical-accuracy.md`.
