# Release 1, train R1f: final report (2026-11-01)

## Verdict

**The count of consecutive clean acceptance passes is 0 of 8. Nothing here claims acceptance, "zero errors" or "100 %".** The best run (run D below, production zip `a36f2883...368c`) had **pass 1 clean** (all eight checks ran, zero defects) and then **pass 2 with one defect** (check 4: desktop `/compare`, button "3D Terrain", Enter key, a 51 ms task against the 50 ms limit, inside Mapbox's own render callback). The runner stops at the first pass with a defect, so the counter went back to 0 and passes 3 to 8 were not run. Four complete runs were started in this round (A to D); each is described in the table below.

What is true of the build as it stands (zip `a36f2883...368c`): the two defects that stopped the previous round (R1e: the first click on "Virtual Walkthrough" and on "Monuments", 70 ms and 58 ms) did not occur in any of the four runs (check 4 ran in all five passes of runs A to D and found neither; the seven scoped check 4 runs of the app never had them either). What stops the eight passes now is a different kind of failure: single tasks of 51 to 53 ms, 1 to 3 ms above the 50 ms limit, in code that is not the site's own (Mapbox's render callback) or that is only partly the site's (the Unit Roster opening). They appear about once in every one to two passes at random controls. No limit was raised and no gate was lowered.

## The deliverable

| File | What | SHA-256 |
|---|---|---|
| `deliver/gettysburg-R1f-5f898a66-PRODUCTION.zip` | the build, 2013 files, 40,018,590 bytes | `a36f288381bd8e40f328ab4a1d1787355f378cfa54c10897ba8f7a86606e368c` |
| `deliver/gettysburg-R1f-5f898a66-STAGING-noindex.zip` | same bytes plus a do-not-index line in `_headers` (only that file differs), 40,018,605 bytes | `2aa0a1e028fb928d6901f4a4327603453c00444e76ac4892949eacf89c575122` |
| `deliver/DEPLOY-GUIDE-R1f.md` | plain-language steps for the owner | |

Each zip has `.sha256` and `.files.tsv` next to it. Release id `5f898a66` (the bundle did not change after the PERF5 and ANIM groups were combined; the last two changes were page groups), manifest tree digest `679e463cfe0a8d3ac30551801c64a20fe46fd40573ec643767f59667614a88bd`, harness (tools/accept plus tests/t0/lib.mjs, serve.mjs, verify_release.mjs, pack_zip.py, package.json) digest `15bdf47844bd33d842e890b12a0f93904226c60a560ef0a629a43ef9552f4d2a`, candidate tree digest recorded by the passes `b7d36dd9fcdda347b874cf03e60db1e469145bc057d9f991e0ad446cb35468f5`. **The zips of runs A to C (`21202789...`, `8836ae36...`) are superseded** (copies in `tmp/r1f-pack/old-zips` and `old-zips2`); they carry the same file name, so compare hashes, not names.

**Determinism.** The production zip was packed from `release/R1f` and again from the independent scratch build `tmp/r1f-pack/chk4-R1f/dist`: same SHA-256. The same held for the two earlier zips (three independent packs of the build of run C gave one hash). The staging zip differs from the production zip in `_headers` only. The copy audit (`tools/accept/copy_audit.mjs` on the zip) reports 0 blocking findings (3 informational: the shipped `_ops/` files); nothing in a shipped file or its metadata mentions AI, Claude, Anthropic or how the site was built.

**Earlier trains.** R0, R1a, R1b, R1c, R1d and R1e were each rebuilt from the sources and compared with `release/<t>/dist` (`diff -rq`): all six identical (ids 54e21b2e, a267d0ed, 3a00b7d6, 2531699e, 753e318f, c2afeeda). R1e was rebuilt a second time after the last registration change: identical again. `python tools/t0/determinism.py`: all trains identical. (`release/R0` to `R1c` held a `gate.json` written before the gate tool's R1d change; they were rebuilt in place, their dists are unchanged, and the determinism suite is green again.)

**Cumulative verification** (`node tools/t0/verify_release.mjs --train R0 ... --train R1f`): every train PASS, cumulative V7 PASS (R1e to R1f: +11 patches), names/legacy/baseline PASS: **all checks passed** (run three times, on the final bytes last). `tools/t0/hygiene.py`: pass. `r1f_sync.py --check`, `r1e_sync.py --check`, `gen_perf5.py --check`, `gen_perf4.py --check`, `gen_zfix.py --check`: all in step. `tools/t0/overlap.py` still exits 1 as it did for R1e (47 geometric overlaps against the pristine bundle, among them the new chained one `A-wt-attribution` / `PERF5-wt-style-load`; the builder's asserted counts are the authority and report 0 anchor failures in 3,362 patches).

## What train R1f is

R1f is cumulative on R1e (R1e stays frozen and rebuilds byte for byte). It registers only the work the two fix agents reported, plus the one fix this acceptance round needed:

| group | by | what a visitor gets |
|---|---|---|
| PERF5 (+ PG-zperf5) | desktop first-frame agent | the first click on the Virtual Walkthrough and on Monuments builds its map and layers in tasks of their own with the shader programs linked before they are drawn (slow-link test: median longest task 52 to 26 ms; pixel-identical); the heat layer of `/ground-remembers` is added in a task of its own |
| ANIM@R1f (+ PERF4@R1f) | animation agent | the engine solves the layout of the next frame in a task of its own (B11: 19 of 20 whole-spec runs against 10 of 20); output bit for bit R1e |
| PG-zfix (this round) | acceptance | `/watch-together` no longer closes a Live Sync connection that is still being opened (a repeated Host or Join gave a console warning) |

The SEO candidate group `PG-zseo` (hand-over line of the SEO agent) is **not registered**: it was not among the reports to be registered, it needs a decision about the home title wording, and registering it would have changed 22 pages. It is ready in `tools/t0/patches-next/PG-zseo.json` with its own test (`tests/t0/seo.spec.mjs`).

## The four runs

Machine: one Windows 11 machine, 16 logical cores, Chrome 156.0.8078.76, Playwright 1.63.0; only the run was active (CPU of the machine in ordinary loads 20 to 23 percent), soak 600 s.

| Run | Zip sha256 | Pass | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Defects | Consecutive clean after |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | `21202789...4de8` | 1 | clean | clean | clean | clean | **1** | clean | clean | clean | 1 | **0** |
| B | `21202789...4de8` | 1 | clean | clean | clean | **1** | clean | clean | clean | clean | 1 | **0** |
| C | `8836ae36...a682` | 1 | clean | clean | clean | **1** | clean | clean | clean | clean | 1 | **0** |
| D | `a36f2883...368c` | 1 | clean | clean | clean | clean | clean | clean | clean | clean | 0 | 1 |
| D | `a36f2883...368c` | 2 | clean | clean | clean | **1** | clean | clean | clean | clean | 1 | **0** |
| D | | 3 to 8 | not run: the runner stops at the first pass with a defect | | | | | | | | | |

Pass files: the files of run D are `docs/accept/passes/pass-1.json` / `.md` and `pass-2.json` / `.md`; those of runs A to C are archived under `docs/accept/passes/archive/`. The log is `docs/accept/EIGHT-PASS-LOG.md`.

### Defects found, causes, what was done

| Run | Defect | Cause (measured) | Action | Result |
|---|---|---|---|---|
| A | check 5, phone `/viewshed`, blocking time 307 ms (limit 200) | One load whose first contentful paint was at 1,220 ms and whose load event at 2,173 ms, against about 500 ms for the other map pages in the same check: the whole load was 2.4 to 4 times slower, not a code path of the page. 172 cold phone 4x loads of `/viewshed` on R1f afterwards: max 80 ms, none over 200; 52 loads on R1e: one at 213 ms. No file of the repository changed during the check | **No change.** The pass is not counted. Re-run on the same bytes (run B) | Environment outlier of the machine; **it can recur** (about 1 load in 50 to 100 on a map page, on R1e as well) |
| B | check 4, phone `/watch-together`: console warning "WebSocket is closed before the connection is established" (peerjs) | `startHost()` / `startJoin()` destroyed the previous Live Sync peer at once. The input matrix activates "Host" twice (click, then Enter); when the first peer's socket to the public broker was still connecting, Chrome logged the warning. Reproduced on the shipped bytes with a probe: one warning at each gap of 0, 100, 250, 500 and 1000 ms; a visitor who double-clicks Host gets the same | **Fixed at the source:** page group PG-zfix (7 patches on `watch-together.html`): a peer that has not opened is retired when it opens or fails, never while connecting; the handlers of a retired peer are inert. Test `tests/t0/wtpeer.spec.mjs` (red on the earlier build 3 of 3, green 4 of 4), run_suites row `r1.wtpeer`. Probe afterwards: 0 warnings at all gaps | Did not recur in runs C and D |
| C | check 4, desktop app, "Unit Roster", Space: long task 52 ms | Opening the roster mounts about 5,000 elements (410 rows; rows are added 48 per idle slice by the existing PERF2 mechanism). The click task is 25 to 43 ms (React mount), then frames of 10 to 40 ms; the engine's animation-frame callback about 200 ms after the click contains a 40 to 44 ms forced layout of the new rows, and on some opens that frame is 51 to 56 ms. Harness-equivalent probe (30 reload-and-click cycles, harness `measure()`): R1f 1 of 30 over 50 ms, R1e 5 of 30 | **Not fixed.** Tried and dropped with numbers: `content-visibility: auto` on the rows (median 143 ms, far worse), reading the computed style lazily in the pill cluster's obstacle scan (warm cost 4 to 8 ms either way), 16-row slices (median 37 against 40 ms, same tail) | Did not occur in run D; **can recur** (R1f about 3 percent per roster open) |
| D | check 4, desktop `/compare`, "3D Terrain", Enter: long task 51 ms | The task is one `requestAnimationFrame` callback of Mapbox's own render (`mapbox-gl.js`), 16 ms after the key. The page already switches the terrain in a task of its own after the pressed state is painted and links the terrain programs in idle slices (PERF2). 20 warm toggles with the mouse: no long task at all | **Not fixed, not reproduced** | Marginal (51 against 50 ms); **can recur** |

## Results by check on the final bytes (run D, pass 1, which is clean, and pass 2)

| # | Check | Pass 1 | Pass 2 |
|---|---|---|---|
| 1 | Deterministic zip | clean (2 s) | clean (8 s) |
| 2 | Static hygiene | clean (72 s) | clean (72 s) |
| 3 | Regression against the published build | clean (248 s, 216 informational notes, the 65 existing waivers, no new one) | clean (245 s) |
| 4 | Input matrix, desktop and phone | clean (1,762 s; the Virtual Walkthrough and Monuments first clicks, the Unit Roster, the keyboard walk and the map gestures all passed) | **1 defect** (`/compare` "3D Terrain", Enter, 51 ms) |
| 5 | Performance | clean (919 s): phone blocking time max 128 ms (`/` 128, `/ground-remembers` 89, `/camera` 40), desktop max 39, LCP max 628 ms, CLS max 0.0156, INP desktop 104 and phone 96 ms, heap +3.24 % over 600 s | clean (921 s): phone max 150 (`/` 150, `/ground-remembers` 75), desktop max 42, LCP max 640, INP 104 / 104, heap +1.35 % |
| 6 | Accuracy (verify_release plus the 16 suites of `accuracy_subset.json`) | clean (1,350 s) | clean (1,355 s) |
| 7 | Visual QA at six widths | clean (454 s) | clean (449 s) |
| 8 | Copy audit | clean (3 s) | clean (3 s) |

Broad regression of train R1f with `tools/t0/run_suites.mjs --r1-dist release/R1f/dist` (`--no-red --no-network`, 47 suites, 8,088 s, log `tmp/r1f-pack/suites.log`, summary `tmp/r1f-pack/suites-r1f.json`): **43 of 47 suites OK, 526 of 546 green tests; nothing is red that was green on R1e.** The four rows that are not green fail identically on R1e: `static.overlap` (exit 1, see above), `static.legal` (3 FAIL on the R1c fact base: two hosts and the `gtanim_off` storage key, identical on `release/R1e/dist`), `static.determinism` (stale `gate.json` of R0 to R1c; fixed afterwards, see above), `r1.clock` 16 of 18 (T0-CLK-03 stray "HIGH about 4:30 AM" text on the phone and T0-CLK-06, identical on R1e: `tmp/r1f-pack/clock-r1e.log` against `clock-r1f.log`). Everything else: journeys 41/41, deeplinks 12/12 (T0-DL-10 passed this time), desktop 10/10, mobile 19/19, mobilefix 29/29, perf 10/10, a11y 26/28 (+2 skips as before), pagescore 28/28, pagesmaps 34/34, pagesfix 20/21 (+1), r1.data 18/18, r1.monuments 20/20, r1.verifymon 16/16, r1.anim 28/29 (+1; **T0-ANIM-B11 passed**), r1.base1863 12/12, r1.images 13/13, r1.polish 9/13 (+4 skips as R1e), polish pair 4/4, perf2 11/12, perf4 12/13, perf5 8/9, acc 6/6, walkguard 17/18 (+1 designed skip), headers 17/18 (+1), staging rehearsal 9/9, baseline drift 9/9. After PG-zfix a subset was run again (`tmp/r1f-pack/suites-b.log`): 17 of 18 suites ok, the only difference again `r1.clock` as above, `r1.wtpeer` 4/4.

## What is not clean (read this before the passes)

1. **No eight clean passes.** The best streak is 1. The failures are single tasks of 51 to 53 ms or an outlier load; at the observed rate (one defect in about every second pass over runs A to D: 4 defective passes in 5) eight in a row is not to be expected on this build with this limit, and more runs of the same bytes would mostly produce more of the same. Each defect found was either fixed at the source (watch-together), shown not to be code of the page (the `/viewshed` load that was 4 times slower throughout) or left open with numbers (Unit Roster, `/compare` terrain).
2. **Check 4 is the one that fails** (3 of the 4 defective passes). The 50 ms limit is applied to the longest task in the 1 s after any input, to the millisecond. Tasks of 40 to 50 ms are common in the Unit Roster open, Mapbox renders after a terrain toggle, and style switches; a 1 to 3 ms excess occurs at random. Making them reliable needs structural work, not tuning: slicing Mapbox's own render is not possible from outside; the roster would need a virtualised list (a change to a component the owner has seen) or a different first-open strategy. These are owner decisions and are listed in the decisions file (PK6).
3. **Phone `/ground-remembers`** (carried from R1e): the median blocking time improved 7 to 22 ms, but the tail above 200 ms is about 3.5 percent before and after (PERF5 report). It did not occur in the 5 runs of check 5 of this round (max 89 and 75 ms in the last two). Not fixed; needs the owner decisions logged as F7.
4. **Unit tests that were changed on purpose** by the fix agents (the owner may want to review): T0-MONL-12, T0-B63-11 (expected Walkthrough region = control plus the registered PERF5 edits), T0-WG-07 (waits up to 3 s for the second map), train lists for R1f in monuments / base1863 / prod-probe; and the anim spec's accounting of the pre-solve (it counts the pre-solve as engine time twice over; nothing lowered).
5. **Visible, transient, by design** (PERF5): the Walkthrough map exists about 4 frames after its overlay paints; the Monuments dots appear about 35 ms and the stars and glow about 70 ms after the click; the settled picture is pixel-identical (0 differing pixels).
6. **Waivers**: 65 entries in `tools/accept/regression_waivers.json`, unchanged by this round; 56 carry basis B and the owner's yes is still not recorded (`docs/accept/R1E-WAIVERS.md`). Check 3 needed no new waiver.
7. **Coverage**: Chrome 156 on one Windows machine only; no real iPhone or Android, no Safari or Firefox, no real Netlify deploy. `--full` accuracy was not run. The `/watch-together` fix was proven with a stand-in for the peer library and, for the console warning, against the real public broker from this machine.
8. **Skips kept by design** (decision R3 of R1e): T0-R0-13, T0-WG-17, T0-PGF-14, T0-A11Y-14, HDR-23, T0-A11Y-27.
9. **Tools were not changed in this round.** `tools/accept` is as in the R1e run (digest above); `tools/t0/run_suites.mjs` got one row (`r1.wtpeer`) and the R1f train registrations; `verify_release.mjs` and `pack_zip.py` are as registered by the fix agents.

## Provisional decisions of this pack round (full text in `docs/decisions/R1F-PROVISIONAL-DECISIONS-2026-10-31.md`)

| id | decision in one line | visible? |
|---|---|---|
| PK3 | train R1f registers PERF5 and ANIM@R1f only; PG-zseo is held back for the owner (home title wording) | no |
| PK4 | a pass that fails on an unexplained whole-load stall (run A) is not counted and is repeated on the same bytes; nothing was changed for it | no |
| PK5 | PG-zfix: the Live Sync peer of `/watch-together` is retired only when it has opened or failed | no (console only) |
| PK6 | the Unit Roster and `/compare` terrain events are reported, not "fixed" with unproven changes (three candidates measured and dropped) | no |
| PK7 | `release/R0` to `R1c` were rebuilt in place to refresh `gate.json`; their dists are unchanged | no |

## Coverage limits and what the owner can do

* Not run: real devices, other browsers, Netlify edge behaviour, `--full` accuracy, `--shots`, `--cpu-throttle`.
* Decisions the owner can take that would change the outlook (none was taken for the owner): accept a 1 to 5 ms tolerance on the 50 ms long-task limit for tasks inside Mapbox's own render callback (this is a change to a gate and is **not** made here); approve a virtualised Unit Roster; approve the staggered entry of the units in the animation engine (A6) and a poster step or lighter style for `/ground-remembers` (F7).
* To repeat the run on the same bytes: `node tools/accept/run_eight.mjs --candidate deliver/gettysburg-R1f-5f898a66-PRODUCTION.zip --baseline baseline/dist --soak-seconds 600` on a quiet machine (about 80 minutes per pass); nothing in the tree (zip, `tools/accept`, `tests/t0/lib.mjs`, `serve.mjs`, `verify_release.mjs`, `pack_zip.py`, `package.json`, `release/R1f/dist`) may change in between.
