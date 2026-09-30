# Tests: what exists, what it proves, how to run it

Index of every test suite in this repository as of 2026-09-30 (WP-T0-18). Run everything from the repository root. Nothing here ever writes inside `legacy/`, and no browser test ever opens the production address (only the plain-HTTP probes touch production).

## Which command do I run?

| I want to... | Command | Notes |
|---|---|---|
| prove a built train is safe to stage | `python tools/t0/build.py --train R1a` (gates run inside the build), then the suites below with `--dist release/R1a/dist` | `ops/RELEASE-RUNBOOK.md` sections 4-6 |
| check the site that is live right now | `node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train <train>` | HTTP only, read-only, safe to run any time; `--list` shows every probe |
| check staging | `node tests/t0/prod-probe.mjs --base https://gbg-staging.netlify.app --train <train> --staging --dist release/<train>/dist` | `ops/STAGING-SETUP.md` |
| prove files arrived intact | `node ops/sha-list.mjs verify-url <list.tsv> <base url>` | `ops/STAGING-SETUP.md` section 6 |
| check the data / clock / historian work | `npm run data:check`, `npm run data:test`, `npm run time:check`, `npm run time:test`, `node --test "tests/historian/*.test.mjs"` | pure Node, no browser, no network |
| check by hand (real mouse, phones) | `tests/t0/journeys-manual.md` | cannot be automated |

## Tranche-0 release tests (`tests/t0/`)

| File | Command | What it proves | Default target | Result file |
|---|---|---|---|---|
| `build_selftest.py` | `python tests/t0/build_selftest.py [--only <text>]` (`npm run t0:test:build`) | the build system itself: deterministic output, refuses its own output and a changed input, a changed anchor fails with the patch id and ships nothing, an undefined identifier fails the gate, group-order independence, plugin interface, used-names ledger, `legacy/` untouched | builds under `tmp/t0-core/selftest/` | console |
| `lib.mjs` | (library) | the browser harness every browser suite uses (below) | | |
| `lib_selftest.mjs` | `node tests/t0/lib_selftest.mjs [--no-map]` (`npm run t0:test:lib`) | the harness itself: Referer injection for page and worker requests, blocking and the run-wide tile budget, error collection, real mouse and touch input, viewport emulation, hit testing, screenshots, map camera probe | `release/R0` and `release/R1a` | `release/test-lib.json` |
| `r0.mjs` | `node tests/t0/r0.mjs [--dist <dist>] [--filter <regex>] [--expect-red]` (`npm run t0:test:r0`) | `T0-R0-01..12`: one Document on first visit, service worker controls without a navigation, one Mapbox `sku`, the upgrade drill (old worker + old bundle, then R0 over it), Help and Bookmarks via the renamed chunks, kill drill, loader retry ("Try again"), `version.json`, timing sanity, rename drill, phone first visit | `release/R0/dist`; every later train must keep passing | `release/<train>/test-r0.json` |
| `journeys-desktop.spec.mjs` | `node tests/t0/journeys-desktop.spec.mjs [--dist <dist>] [--filter <regex>] [--expect-red]` | `T0-J1..J8` (load, play 30 ticks at 8x, pan/wheel/pinch, select, search, Help and Tools, day 2/3 jump, `?ancestor=`), `T0-IN-01..05` (real mouse input reaches the map), `T0-C5-01`, `T0-SND-01`, `T0-KEY-01..06`, `T0-MON-01`, `T0-ST-01`, `T0-EB-01`, `T0-ATTR-01`, `T0-CLK-01`, `T0-DATA-01..03`, `T0-MM-01`, and `T0-X3` (0 uncaught exceptions, 0 first-party console errors across the run) | `release/R1c/dist` | `release/<train>/test-journeys-desktop.json` |
| `pages-maps.spec.mjs` | `node tests/t0/pages-maps.spec.mjs [--dist <dist>] [--filter <regex>] [--expect-red] [--online] [--perf ...]` | `T0-PG-*`: sub-pages render without console errors or "undefined", the eight map pages load Mapbox without blocking, no duplicate ids under data delay, OG card, manifest, icons, the Search Console file | `release/R1a/dist` | `release/<train>/test-pages-maps.json` |
| `mobile-matrix.spec.mjs` | `node tests/t0/mobile-matrix.spec.mjs [--dist <dist>] [--vp portrait\|landscape\|all\|<ids>] [--filter <regex>] [--shots <dir>] [--slot N] [--expect-red]` | `T0-MOB`: the mobile shell over the viewport matrix with real CDP touch events: geometry checks (off-screen, occluded, target size under 44 px) and screenshots for a human to review | `release/R1b/dist` | `tmp/grp-mobile-shell/mobile-matrix.json` (or `--out`) |
| `headers.spec.mjs` | `node tests/t0/headers.spec.mjs [--dist <dist>] [--no-browser] [--filter <regex>]` | `HDR-*`: the generated `_headers` / `_redirects` / `netlify.toml` of R1c: one rule per header name per URL, both URL spellings, real-browser framing (`/embed` frameable, `/` not) and CSP. Proves the RULES, not Netlify's own matching | builds R1c into `tmp/infra-config/R1c` unless `--dist` | `tmp/infra-config/headers-results.json` |
| `prod-probe.mjs` | `node tests/t0/prod-probe.mjs [--base <url>] [--train auto\|legacy\|R0\|R1a\|R1b\|R1c\|R1d\|S1] [--staging] [--dist <dist>] [--parity <url>] [--json f] [--log f] [--no-content]` | the post-deploy probe: HP-01..15 of chapter 12 plus T0-01..07 and T0-BYTES, each with the train from which it must be green (`KNOWN` = red on purpose until a later train); optionally header parity between two sites; runs `ops/headers-probe.mjs` too. Exit `0`/`1`/`2` = nothing unexpected / a FAIL / the probe could not run | production | `--json` file, `--log` line |
| `viewports.json` | (data) | the one viewport matrix used by every suite (375x812, 320x568, 390x844, 412x915, 768x1024, 1440x900, landscape 812x375, 844x390, 915x412) | | |
| `journeys-manual.md` | (document) | the by-hand journeys, the headed real-mouse test and the phone matrix | | filled in by you |

Related tools outside `tests/`: `ops/headers-probe.mjs` (`node ops/headers-probe.mjs <base url> --profile baseline\|t0\|s1\|final`, or `--dist <dir>` to check a built tree against a local emulation; exit `0` = every probe as its profile expects), `ops/sha-list.mjs` (sha256 lists and byte-identity proofs), `tools/t0/gate.mjs` (the build gates).

### The browser harness (`tests/t0/lib.mjs`)

* Uses **system Chrome** (`C:/Program Files/Google/Chrome/Application/chrome.exe`) through `playwright-core` plus a raw CDP side channel; one Chrome profile directory and one CDP port per session.
* **Mapbox tiles:** the harness adds `Referer: https://gettysburginteractivemap.com/` to requests to `api.mapbox.com` and `*.tiles.mapbox.com` (the token is restricted to that domain), for pages **and** workers, and **caps them per run** (default 300; sessions default to real tiles, tests that do not need a map open with tiles blocked). Telemetry to `events.mapbox.com` is answered locally. The token never appears in a log (masked).
* Environment variables: `T0_PORT_BASE` (static server port; Chrome CDP ports are the next ones; suites default to different bases: r0 8300, journeys 8320, mobile 8340, pages 8400, headers 8420), `T0_TILE_CAP` (Mapbox requests per run), `T0_CHROME` (path to Chrome), `T0_AGENT` (name of the scratch folder `tmp/<name>/`, where profiles, screenshots and some results go). Run suites one after another, or give each its own `T0_PORT_BASE` and `T0_AGENT`.
* **Red-first proof:** `--dist legacy/dist --expect-red --filter '<ids>'` shows a group's tests are red on the untouched site before its patches apply (r0, journeys-desktop, pages-maps and mobile-matrix support it). A green-only suite proves little.
* Always kill what you start: the harness kills its Chrome on exit; if a run is interrupted check for stray `chrome.exe` and `node.exe` processes on your ports.

## Data, time and historian tests (Node only; no browser, no network)

| Area | Commands | What they cover |
|---|---|---|
| Data (`tests/data/`) | `npm run data:test` (`node --test "tests/data/*.test.mjs"`); `npm run data:check` (manifest, validator suite, unit registry, facts, rights audit); `npm run data:validate[:strict]`; `npm run data:emit` | validator rules and schemas, seeded defects, unit registry and ID crosswalk, candidate data, rights audit, the legacy-compatible data emitter |
| Time (`tests/time/`) | `npm run time:test` (`node --test "tests/time/*.test.mjs"`); `npm run time:check`; `npm run time:validate` | the candidate clock module and its anchors, golden values, playback, surfaces, validators, solar checks, candidate clock patches against the T0 bundle. **Candidate, not approved**: these prove the machinery, not the history |
| Historian (`tests/historian/`) | `node --test "tests/historian/*.test.mjs"`; `node tests/historian/eval.mjs [--system engine\|legacy\|both] [--suite batteries\|golden\|all] [--gates H1\|H2]` | intent rules, text handling, build and ingest, sources register, and the evaluation harness against the question batteries and the 150-question golden set |

## Rules for anyone adding a test

1. Put its id in a name the plan uses (`T0-...`, `HP-..`) and say which exit criterion or audit finding it guards.
2. Show it **red on `legacy/dist`** first where the fix is a Tranche-0 patch; keep that command in the file's header comment.
3. Browser tests go through `tests/t0/lib.mjs` (tile budget, Referer injection, error collector); never open production in a browser; never add `netlify.app` to any token list.
4. Write results as JSON next to the dist or under `tmp/<agent>/`, never into `legacy/`.
5. Update this file in the same commit.

## What the tests do NOT prove (read before trusting a green)

* Real devices: iOS/WebKit, Firefox, Samsung Internet, real touch, `dvh` and safe-area insets, notches, keyboards (`tests/t0/journeys-manual.md` Part C).
* A real mouse on the live site (Part B). Headless Chrome only.
* Real Mapbox load: tile requests are capped and use the production Referer through a side channel; Lighthouse or timing numbers taken this way are upper bounds. **The repository has no Lighthouse runner yet.**
* Netlify's own header matching and post-processing: local emulation proves generated rules; only a deploy to staging plus `prod-probe --parity` and `ops/sha-list.mjs verify-url` prove what Netlify serves.
* History: the time and data suites test that the machinery is consistent, not that the anchors are correct (that needs the named reviewer, register D-HIST-REVIEW).
* Accessibility with a screen reader, 30-day RUM, or anything about visitors.
