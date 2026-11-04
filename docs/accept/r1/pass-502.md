# Acceptance pass 502: DEFECTS (incomplete)

Started 2026-10-20T17:42:03.510Z, finished 2026-10-20T18:03:34.587Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-c5.zip` (zip) |
| Candidate SHA-256 | `a1e18152121d93de8ea84a185cca5157b4d3b5b10ad0a3109d9a8f328fb4d2a7` |
| Tree digest (sha256 of path+hash list) | `ea600b0c99257718f50f26736278649ee8e6a3fcd333b93e8772a61da13df031` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `c16827203af2fd6c69df1e9949212975829e83fbe8e433e8bb40f55ee38762d1` (32 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | n/a |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 0 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 6 | Accuracy (verify_release + test subset) | PARTIAL (parts NOT RUN) | 6 | 2 | 1289 s |

## Check 6: Accuracy (verify_release + test subset)

Status: **RAN**. Defects: 6. Notes: 2.

**Parts of this check that did NOT run (a pass cannot be clean with these):**

- verify_release: the train of the candidate cannot be determined (use --train) or release/null/ does not exist

Commands:

- `node tests/t0/r0.mjs --dist <candidate>` -> exit 1 in 42.1 s (r0-acceptance: 11/13 passed, 1 skipped, 1 FAILED|r0-acceptance|11|13|1|1)
- `node tests/t0/journeys-desktop.spec.mjs --dist <candidate>` -> exit 0 in 204.6 s (journeys-desktop: 41/41 passed|journeys-desktop|41|41||)
- `node tests/t0/deeplinks.spec.mjs --dist <candidate>` -> exit 0 in 157.0 s (deeplinks: 12/12 passed|deeplinks|12|12||)
- `node tests/t0/desktop-fixes.spec.mjs --dist <candidate>` -> exit 0 in 96.8 s (desktop-fixes: 10/10 passed|desktop-fixes|10|10||)
- `node tests/t0/walkthrough-guard.spec.mjs --dist <candidate>` -> exit 0 in 112.1 s (walkthrough-guard: 17/18 passed, 1 skipped|walkthrough-guard|17|18|1|)
- `node tests/t0/copy.spec.mjs --dist <candidate>` -> exit 1 in 34.4 s (copy-truthful-subset: 3/4 passed, 1 FAILED|copy-truthful-subset|3|4||1)
- `node tests/t0/headers.spec.mjs --dist <candidate> --no-browser` -> exit 1 in 6.9 s (headers: 13/18 passed, 4 skipped, 1 FAILED|headers|13|18|4|1)
- `node tests/t0/pages-maps.spec.mjs --dist <candidate>` -> exit 0 in 75.2 s (T0-PG (map pages, og/manifest): 34/34 passed|T0-PG (map pages, og/manifest)|34|34||)
- `node tests/t0/perf-fixes.spec.mjs --dist <candidate>` -> exit 0 in 40.1 s (perf-fixes: 10/10 passed|perf-fixes|10|10||)
- `node tests/t0/pages-core.spec.mjs --dist <candidate>` -> exit 0 in 311.4 s (pages-core: 28/28 passed|pages-core|28|28||)
- `node tools/data/manifest.mjs verify` -> exit 0 in 0.1 s
- `node tools/data/validate.mjs` -> exit 0 in 2.8 s
- `node tools/data/unit_registry.mjs --check` -> exit 0 in 0.2 s
- `node tools/data/facts.mjs --check` -> exit 0 in 1.2 s
- `node tools/data/rights_audit.mjs --check` -> exit 0 in 1.1 s
- `node --test tests/data/*.test.mjs` -> exit 1 in 65.1 s
- `node tools/time/build.mjs --check` -> exit 0 in 0.8 s
- `node tools/time/validate.mjs --check` -> exit 0 in 0.9 s
- `node tools/time/surfaces.mjs --check` -> exit 0 in 2.6 s
- `node --test tests/time/*.test.mjs` -> exit 1 in 80.5 s
- `node --test tests/historian/*.test.mjs` -> exit 1 in 52.9 s

Metrics:

```json
{
 "train": null,
 "subsetNote": "fast subset only; use --full for tools/t0/run_suites.mjs"
}
```

Defects by code: suite-failed x6

| code | where | detail |
|---|---|---|
| suite-failed | r0 | exit 1; r0-acceptance: 11/13 passed, 1 skipped, 1 FAILED\|r0-acceptance\|11\|13\|1\|1; FAIL  T0-R0-03     first visit: one Mapbox sku, one style request (one map session) (X1) |
| suite-failed | copy-spec | exit 1; copy-truthful-subset: 3/4 passed, 1 FAILED\|copy-truthful-subset\|3\|4\|\|1; FAIL  T0-CP-01     string level: each shipped row present once before / gone after, CP == exactly those replacements, held rows unchanged, no 445+, no heatmap row, no new "undefined" |
| suite-failed | headers | exit 1; headers: 13/18 passed, 4 skipped, 1 FAILED\|headers\|13\|18\|4\|1; FAIL  HDR-24       the DEFAULT R1c build (the opt-in legal group is NOT included): privacy/terms carry no draft text, and the Street View sensor delegation is ON (the Walkthrough logs no Google accelerometer error) with the g |
| suite-failed | data-test: --test tests/data/*.test.mjs | exit 1: ...ew-norm.json', 'data-src/sources-v2/qc/review-pass1-r2.json', 'data-src/sources-v2/qc/review-pass1.json', 'data-src/sources-v2/qc/review-pass2-r2.json', 'data-src/sources-v2/qc/review-pass2.json', 'data-src/sources-v2/qc/review-queue-next.json', 'data-src/sources-v2/qc/reviewer-attested.j |
| suite-failed | time-test: --test tests/time/*.test.mjs | exit 1: ...c_hooks:227:14)       at Test.run (node:internal/test_runner/test:1382:25)       at Suite.processPendingSubtests (node:internal/test_runner/test:960:18)       at Test.postRun (node:internal/test_runner/test:1522:19)       at Test.run (node:internal/test_runner/test:1447:12)       at async |
| suite-failed | historian-test: --test tests/historian/*.test.mjs | exit 1: ...async_hooks:227:14)       at Test.run (node:internal/test_runner/test:1382:25)       at Test.processPendingSubtests (node:internal/test_runner/test:960:18)       at Test.postRun (node:internal/test_runner/test:1522:19)       at Test.run (node:internal/test_runner/test:1447:12)       at as |

<details><summary>Notes (information, not defects)</summary>

- subset @ -: ran 15 suites; NOT in the subset: a11y.spec; pages-fixes.spec; mobile-matrix.spec / mobile-fixes.spec; red-first proofs and build self-tests (see accuracy_subset.json for why)
- claims @ -: Passing these suites shows the machinery is consistent with its own expectations; it does not prove the historical anchors are correct (that needs the named reviewer).

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-502-artifacts/` (screenshots, diffs, tool output).
