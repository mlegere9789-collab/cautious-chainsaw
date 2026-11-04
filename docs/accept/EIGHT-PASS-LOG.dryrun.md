# Eight-pass log (DRY RUN - nothing here counts toward the acceptance)

Rule (owner, FINAL-ACCEPTANCE.md): eight CONSECUTIVE fresh clean passes; any defect resets the count to 0; no code or candidate change in between. This file is written by `tools/accept/run_eight.mjs` only; it reports success only if the latest run below says ACCEPTED.

## Status: DEFECT FOUND (counter reset to 0)

Consecutive clean passes in the latest run: **0 of 1**.

### Run started 2026-10-20T08:17:09.942Z (dry run)

- Candidate: `deliver\gettysburg-R1c-2531699e-PRODUCTION.zip`, SHA-256 `4b6799863d7f242edc4a2bea98be0028c2dbab214e66c621eb971e8e876d9452`
- Harness digest `30cce50bfbdf815a103231ea30e15341971b4a04de33749de9119e8096b77a4d`; baseline tree `72b47b7abe633c0180431a837d42c4c45e08ce491c1d45efb599f085780024df`; built dist of R1c `b279998713873674dcb921431aac69615063146736c6297bc8df758826204a3f`
- Soak 120 s; accuracy fast subset (accuracy_subset.json)
- Result: **DEFECT FOUND (counter reset to 0)** (finished 2026-10-20T09:27:41.848Z)

| pass | verdict | defects | checks not (fully) run | seconds | detail |
|---|---|---|---|---|---|
| 1 | DEFECTS | 112 | none | 4232 | `docs\accept\dryrun\pass-1.json` |

First defects of pass 1:

- [3] file-missing @ assets/InterpolationWorker-ufiwa2-e.js: assets/InterpolationWorker-ufiwa2-e.js is on the published build and not in the candidate
- [3] data-regressed @ manifest.json: 1 regression(s): /orientation: key removed
- [3] screenshot-differs @ aftermath@1440: 2.758% of pixels differ (limit 0.20%); page size 1425x1265 -> 1425x1266; bbox [72,5,1366,1235]; worst regions [[534,843,713,1054],[534,422,713,633],[534,633,713
- [4] long-task-during-interaction @ desktop /compare :: button "Dark": click: long task(s) [64] ms (limit 50 ms)
- [4] slow-response @ desktop /compare :: button "3D Terrain": click: 178.2 ms from input to visible change (limit 100 ms; dom 3.3, paint 178.2, event timing 192)
- [4] long-task-during-interaction @ desktop /compare :: button "3D Terrain": click: long task(s) [164] ms (limit 50 ms)
- [5] tbt @ phone /compare: TBT proxy 211 ms > 200 ms (7 long tasks; cpu 4x)
- [5] tbt @ phone /ground-remembers: TBT proxy 615 ms > 200 ms (9 long tasks; cpu 4x)
- [5] tbt @ phone /immersive: TBT proxy 232 ms > 200 ms (7 long tasks; cpu 4x)
- [6] suite-failed @ copy-spec: exit 1; copy-truthful-subset: 2/4 passed, 2 FAILED\|copy-truthful-subset\|2\|4\|\|2; FAIL  T0-CP-01     string level: each shipped row present once before / gone aft
- [6] suite-failed @ headers: exit 1; headers: 13/18 passed, 4 skipped, 1 FAILED\|headers\|13\|18\|4\|1; FAIL  HDR-24       the DEFAULT R1c build (the opt-in legal group is NOT included): privacy
- [6] suite-failed @ data-test: --test tests/data/*.test.mjs: exit 1: ...ew-norm.json', 'data-src/sources-v2/qc/review-pass1-r2.json', 'data-src/sources-v2/qc/review-pass1.json', 'data-src/sources-v2/qc/review-pass2-r2.jso

## What this acceptance does NOT cover

- Real devices (iOS/WebKit, Android Chrome, Samsung Internet), real touch hardware, dvh/safe-area insets, notches, keyboards.
- Safari and Firefox (only Chrome, the system build recorded in each pass, headless, with software or whatever GPU the host has).
- Lighthouse CI proper (scores, throttled network, mobile emulation profile); the vitals here are measured with the Performance API on a local server.
- Netlify edge behaviour: only the generated `_headers`/`_redirects` are emulated; compression, CDN caching and header merging are not.
- A screen reader, real users, or anything after publication.
- External links and third-party services (Google, NPS, Mapbox outside the capped side channel) are not exercised for correctness.
- The accuracy check runs the fast subset unless `--full`: see `tools/accept/accuracy_subset.json` for what was left out and why.
