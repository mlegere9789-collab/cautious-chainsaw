# qa-ci: Testing, CI/CD and Release Engineering plan ("A+ stays A+")

Specialist: **qa-ci** | Scope: NO-BUILD plan input | Report date: 2026-09-30 | Site: gettysburginteractivemap.com (Netlify project friendly-lolly-da85c0)

Everything below was produced read-only. No site folder was modified, nothing was built or deployed, no package was installed. Scratch work (prototype validators, static gates, unit-tested sketches, run outputs) lives in `plan-work/tmp-qa-ci/` (sketch tree: `plan-work/tmp-qa-ci/sketches/`).

---

## 0. TL;DR

1. **The site has no quality system at all today**, so every earlier fix was unverifiable and several regressed. The deployed folder contains no `package.json`, no tests, no CI; `netlify.toml:2` is `publish = "."` with no build; the "source" zip is a copy of the deploy (N1). A real test suite and CI existed until Jun 13 (`gettysburg_FINAL_v24/tests/validate_data.py`, 63 checks; `deploy-history.md:63,142,236`) and were lost with the source. Even then it asserted structure only (ticks in 1..675, key events present at ticks 28/29/275/302/551) and never that a label agrees with its tick; the data has not changed since (`deploy-history.md:13`), so those 63 checks passed while **49 of 137 chronology labels disagree with the file's own stated formula** (measured this session).
2. **Lighthouse cannot protect this product.** On the very build that throws `ReferenceError: setGoldUnit is not defined` (C5) and hides five mobile controls (C1/C2), Lighthouse 13.5 scores `errors-in-console` = 1 and `target-size` = 1 (`lh_mobile.json`). It loads the page and stops. Also, `html, body { overflow: hidden }` (`index.html:62`) means page-level overflow checks cannot see C1 at all: the transport row is simply clipped. The plan therefore tests **interactions and geometry**, not only load.
3. **Design: red-first, ratchet, single source per fact.** Every audit finding gets at least one automated assertion (section 10 lists all 57 audit ids plus 21 findings that the other specialists and this plan's own measurements added). Each assertion is first written against today's site and must FAIL (a "red proof"), then registered in an expiring `known-failures.json`; fixing the bug flips the entry to "must be green" and CI fails if a registered failure unexpectedly passes (stale entry) or expires. Regressions can never hide and fixes can never be forgotten.
4. **Six tiers of checks** (T0 pre-commit, T1 every push <= 6 min, T2 Netlify Deploy Preview <= 30 min, T3 nightly full matrix, T4 post-deploy smoke, T5 scheduled production monitors) plus T6 manual programs (assistive tech, real devices, expert/historian review). Section 2.
5. **Matrix:** 24 viewport rows (12 widths x portrait/landscape or standard/short for desktop) generated from one JSON file into Playwright projects, three engines, plus a state catalogue (every panel/sheet/modal x layout). PR tier runs 8 rows; nightly runs all 24 across Chromium/WebKit/Firefox. Section 5.1.
6. **The overlap/clipping/tappability detector** (`layout-audit.browser.js`, 217 lines, geometry unit-tested, 7 rules: OFFSCREEN, OCCLUDED, OVERLAP, CLIPPED_TEXT, H_OVERFLOW, TARGET_SIZE, FONT_FLOOR) plus Playwright's own `click({trial:true})` hit-target check would have caught C1, C2, H1, S4 and the clipped splash title. Allowlist entries carry an audit id and an expiry date.
7. **Measured red proofs from prototypes I ran on the real deployed files** (Appendix C): static site lint 16 errors + 6 warnings of 26 checks; data validators 12 of 15 checks failing (e.g. `record_count` 4,890 vs 100 records; 37 of 42 succession rows disagree with their own tick; 219 strength anomalies); free-variable gate finds exactly the 4 undefined identifiers (`setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment`, `CanvasRenderer`); production header probe 10 of 15 failing; Lighthouse assertion script reproduces the audit (mobile 18, desktop 14 failing assertions). 40 node tests pass (25 unit tests for the pure logic + the 15 data checks run in expected-red mode); 11 TypeScript sketches syntax-check.
8. **Two facts the earlier audit did not have, found while building the harness:** (a) `screenshots/day1.png` and `day3.png` (the OG image and PWA screenshots referenced by every indexable page that declares `og:image`) are **byte-identical and undecodable** (IHDR says RGB, IDAT holds RGBA-sized data; PIL raises "unrecognized data stream contents"); (b) the CSP is Report-Only **with no `report-uri`/`report-to`**, so the "soak" the comment in `netlify.toml:14-18` describes can never produce data; it needs a collection endpoint before enforcement can be decided.
9. **RUM alerting is designed for a tiny audience** (3,389 page views / 30 days = ~113/day): 7-day rolling p75, minimum 100 samples, bots excluded, "Poor for 2 consecutive days" pages a human, "worsened 15% and above 90% of Good" catches a bad deploy early; JS errors and CSP violations ride the same same-origin beacon. The evaluator is implemented and unit-tested (6 tests). Netlify's own RUM stays as a secondary view (it has no alerting in the exported UI).
10. **Release engineering:** git-visible promotion (`production` branch fast-forwarded from a tested `main` SHA), Netlify Deploy Previews per PR (free, non-metered per Netlify's credit table; production deploys cost 15 credits each), `version.json` (app SemVer + data CalVer + time-model version + git SHA), generated `_headers` (fixes the XFO/`frame-ancestors` conflict properly), four rollback levels (kill-switch flag, publish previous deploy, self-unregistering `sw.js`, data manifest rollback), anniversary freeze (June 25 - July 5), Definition of Done at PR / feature / release level, and a machine-computed **A+ scorecard** (category x device class) whose exit code is what "stays A+" means.

**What this plan does not claim.** I did not run browser tests (BRIEF forbids the shared browser tools and installing Playwright would download binaries), so every browser-level "red today" statement is derived from the audit and from code reading (each is labelled). Everything marked `(verify)` is a third-party fact I could not confirm from a primary source in this session (Playwright container tag, Netlify `deployment_status` event, `@netlify/blobs` API details, BrowserStack/AWS pricing, `release-please` options). The static and data gates were executed against the real files and their outputs are in Appendix C.

---

## 0.1 Evidence base (what I read and ran)

| Input | Use |
|---|---|
| BRIEF.md, `gettysburg-site-audit.md` | finding ids, thresholds, hard rules |
| `plan-work/app-a11y.md`, `app-time.md`, `bundle-anatomy.md`, `pages-B.md`, `prov-recon.md`, `deploy-history.md`, `time-facts*.csv` | what the other specialists already specified (I integrate rather than duplicate: a11y CI gates, time validators V1-V15, byte budgets, parity harness outline, repo layout) |
| `DEPLOY_DIR`, `SRC_DIR` (`.../site/deploy`, `.../site/src`), `bundle.pretty.js`, `lh_mobile.json`, `lh_desktop.json`, Netlify RUM + Web Analytics PDFs | evidence with file:line, baselines for budgets, traffic numbers |
| `Downloads/gettysburg_FINAL_v24/` (old `tests/`, `.github/workflows/ci.yml`) | what a previous quality system looked like and why it was insufficient |
| Live site (headers only, 11 GET/HEAD requests, later ~30 in the probe run) | header contract facts; a later re-run timed out from this machine, so the probe output in Appendix C is the earlier successful capture |
| Web (Lighthouse CI, web-vitals, Netlify docs/credit table, Playwright emulation docs) | tool facts; each cited where used |
| Prototypes in `tmp-qa-ci/sketches/` | `site-lint.mjs`, `undef-globals.mjs`, `asset-integrity.mjs`, `prod-probe.mjs`, `validate.mjs` (+ratchet), `assert-lh.mjs`, `scorecard.mjs`, `layout-audit.browser.js`, `intended-diffs.mjs`, `rum/evaluate.mjs`, `gen-headers.mjs`, and 11 Playwright/TS sketches |

## 1. Ground truth: what exists today and why nothing caught the criticals

### 1.1 What is in place (evidence)

| Fact | Evidence |
|---|---|
| No tests, CI, package manifest or source in the deployed tree | `SRC_DIR` listing: 119 files, no `package.json`/`tests/`; N1 |
| Publish directory is the repo root, no build step | `netlify.toml:2` `publish = "."`; no `[build] command` |
| Previous quality system existed and was lost | `deploy-history.md:63` ("`tests/validate_data.py` (63 checks), CI"), `:142`, `:236`; files still in `Downloads/gettysburg_FINAL_v24/tests/` and `.github/workflows/ci.yml` |
| That old CI could never gate a deploy | `gettysburg_FINAL_v24/.github/workflows/ci.yml` (deploy-preview job): `netlify deploy --dir=dist --alias=pr-N ... continue-on-error: true` |
| That old validator crashes on Windows | reproduced: `python3 tests/validate_data.py` -> `UnicodeEncodeError: 'charmap' codec can't encode characters` in `section()` (prints `─`; cp1252 console). Lesson: run CI on Linux, set `PYTHONUTF8=1`/use Node, never print box-drawing characters |
| That old validator was structural, not semantic | it checks `1 <= tick <= 675` and `KEY_EVENT_TICKS = {28:'Reynolds',29:'Archer',275:'Chamberlain',302:'Minnesota',551:'Armistead'}` exist; it never compares a label to a tick. Same data today: 49 of 137 chronology labels differ >10 min from the file's own formula (max 230 min), 37 of 42 succession rows disagree with their own `approx_tick` |
| App code has no test hooks and no accessibility hooks | zero `data-testid`; `prov-recon.md:T-33` "zero `aria-*` or `role` attributes in app code" (bundle.pretty.js 96,209-113,377); the 33 `aria-` matches in the bundle are vendored Mapbox code (e.g. `bundle.pretty.js:91452`) |
| Deep links into the map are dead | `pages-B.md` pagesB-01, `prov-recon.md` P-62: only `?ancestor=` is parsed (`bundle.pretty.js:101117` builds it); `?tick=`, `?unit=`, `?vignette=` are emitted by 8 pages and read by nothing. Consequence for the harness: on the legacy app a test must reach a tick by stepping the keyboard |
| Persistent state is only `gtbg_onboarded=1` (+ `gtbg_prefs`, bookmarks) | `bundle.pretty.js:112951`, `:113068`, `:9329-9339` |
| App shell clips instead of scrolling | `index.html:62` `html, body { width:100%; height:100%; overflow:hidden }`, `#root { position:fixed; contain:strict }` (`:69`) |
| CSP is Report-Only, allows `'unsafe-inline'`, has no reporting endpoint, omits the RUM host | `netlify.toml:19` (whole value ends `...object-src 'none'; base-uri 'self'`; no `report-uri`/`report-to`); live header identical (probe HP-01..03) |
| `embed.html` receives XFO DENY *and* `frame-ancestors *`, and still receives the report-only CSP | live headers for `/embed.html` (curl, 2026-09-29): `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors *`, `Content-Security-Policy-Report-Only: default-src 'self'...`; `netlify.toml:83-85` tries `X-Frame-Options = ""` and `Content-Security-Policy-Report-Only = ""` |
| Both URL forms serve 200 with different cache headers | live: `/dashboard` -> `Cache-Control: public,max-age=0,must-revalidate`; `/dashboard.html` -> `no-cache,must-revalidate`; `/index.html` -> 200 (probe HP-10/HP-11) |
| OG/PWA screenshots are corrupt and identical | `SRC_DIR/screenshots/day1.png` = `day3.png` (17,585 B, md5 `3f6646c9...`); IHDR 1280x720 colortype 2 expects 2,765,520 inflated bytes, IDAT holds 3,687,120 (RGBA size); PIL: "unrecognized data stream contents" (verified) |
| Case-mangled asset names in the downloaded deploy zip | `DEPLOY_DIR/assets/index-cg8famxn.js` vs `index.html:55,282` `index-Cg8FAMXN.js` (static gate SL-01 / AI-01 reports 8 broken references on that tree, 0 on `SRC_DIR`) |
| Service worker hard-codes hashed names, caches non-OK responses, force-reloads the page | `sw.js:5-13` (`/assets/index-Cg8FAMXN.js`...), `sw.js:45,65` (`cache.put` with no `res.ok` guard), `sw.js:17,30` (`skipWaiting`, `clients.claim`), `index.html:255-277` (`controllerchange -> location.reload()`) |

### 1.2 Why Lighthouse (and the earlier audit method) missed the criticals

`lh_mobile.json` (Lighthouse 13.5.0, simulate, Moto G Power profile):

| Audit | Score | What the audit actually found |
|---|---|---|
| `errors-in-console` | **1 (pass)** | the app only throws on click: `bundle.pretty.js:101086` `(l(it), setGoldUnit(it), clearGoldTrail())` and `:101229` |
| `target-size` | **1 (pass)** | it measures the load-state DOM; C1's five buttons are outside the viewport (x = -213..-29) and C2's rows sit under the timeline bar |
| accessibility category | 90 | fails only `color-contrast` and `label`; `app-a11y.md` 8.2 counts 23 failing WCAG 2.2 A+AA criteria (of 55) on the same app |
| `redirects` | 0 | the only automated sight of C6 (9,067 ms est. saving mobile) |
| `resource-summary` | info | 156 requests, 1,577,215 B; 143 of the requests are "other" (JSON data + Mapbox tiles), script 6 requests 614,184 B, third-party 61 requests 801,856 B |

So: a lab audit of the load path is necessary (it catches P-series regressions) but insufficient. The suites in section 5 add **(a) interaction coverage** (every control in every state), **(b) geometry** (per-element off-screen/occlusion/overlap/clipping/size), **(c) semantic data checks** (label vs tick, references, roll-ups) and **(d) contract checks** (headers, redirects, origins, versions).

### 1.3 Constraints that shape the design

- **Solo developer, AI-assisted** (BRIEF): suites must be cheap to run, cheap to keep green, and self-explaining on failure. Anything that produces flaky red will be ignored, so determinism (stubbed map, fake clock, fixed container image) is a first-class requirement (section 5.7, 5.17).
- **Tiny audience** (3,389 page views and 1,529 visitors / 30 days; ~18% of views from China/Singapore/Hong Kong/Germany, likely bots): field statistics are noisy, so **lab gates are the primary quality control and RUM is the drift detector**.
- **Two codebases during the transition** (frozen legacy bundle + rebuild, `prov-recon.md` strategy C): every test must be runnable against both via a single driver (`DRIVER=legacy|next`), and the parity harness must be able to say *why* they differ.
- **The map cannot be pixel-compared** (renderer changes by design, `prov-recon.md` 6.5): compare semantics (units, coordinates at keyframes, text, geometry), use pixels only for chrome.
- **Netlify plan facts** (`docs.netlify.com` credit-based pricing table; your 30-day RUM/Analytics history corresponds to the Pro column, verify in Billing): Deploy Previews and Branch Deploys are non-metered; each production deployment costs 15 credits; password protection and Basic Auth headers are Pro features; Netlify Blobs and scheduled functions are available on all plans. Bandwidth is 20 credits/GB (your 328 MB/30 d is ~7 credits). CI therefore runs on GitHub Actions, and Netlify only builds/deploys.

## 2. Design principles and the tiered system

### 2.1 Principles (each one is enforced by tooling, not by discipline)

1. **Red first.** A bug fix or a plan item starts with a test that fails on the current build, and the PR shows the failing CI run. The 57 audit ids are pre-loaded as red tests in Phase 1, before any product fix.
2. **Ratchet.** `tests/known-failures.json` (and `tests/overlap-allowlist.json`, `tests/console-allowlist.json`, `docs/parity/intended-diffs.json`) list *expected* failures with `{audit, reason, until}`. A listed failure that passes fails the build ("delete the entry"); an expired entry stops suppressing; an unlisted failure fails. Proven in the prototype: seeded registry -> 15/15 pass; empty registry -> 12 failures; stale entry -> exactly 1 failure.
3. **One source per fact.** Counts (467, 675, 20 tools, 16 stops, 512 monuments, 8 sites), the tick clock, brand name, colours, z-index scale and header set are each generated from one file; tests compare every consumer to that file (DV-11, `one-clock`, SL brand check, stylelint token rules, generated `_headers`).
4. **Budgets only tighten.** `perf/budgets.json`, `.size-limit.json`, `lighthouserc`/`assert-lh` numbers can be lowered freely; raising one requires a `budget-raise` label and an ADR. CI diff-checks this.
5. **Geometry over selectors.** UI tests enumerate *all* interactive elements and test them generically, so a new control cannot escape; named tests exist only for headline bugs.
6. **Determinism.** Mapbox stubbed (style, sprite, glyph, tiles), events/RUM hosts blocked, fake clock for animation, seeded randomness, pinned Playwright container image, Linux-only baselines, no test depends on the live network except the explicit `@realmap` and production monitors.
7. **No flaky tolerance.** One retry in CI; a test that fails then passes is reported as flaky and opens an issue; quarantine requires an expiry (section 5.17).
8. **Everything traceable.** Every test title carries `@audit:<id>` and `@cat:<category>`; the scorecard and the traceability matrix are generated from tags, not maintained by hand.
9. **A gate that did not run is a failed gate.** The scorecard treats "not run" as red; every catalogued gate must produce a result.
10. **Production is observed, not assumed.** Post-deploy smoke, scheduled probes, RUM and error/CSP beacons close the loop, with alert thresholds designed for ~110 page views/day.

### 2.2 The tiers

| Tier | Trigger | Wall-clock budget | Blocks merge / release? | Contents |
|---|---|---|---|---|
| **T0** local pre-commit (lefthook or husky) | `git commit` | <= 15 s | no (advisory; CI is the authority) | prettier, eslint (staged), stylelint (staged), gitleaks (staged), `validate-data --quick` if `data/**` changed, `undef-globals` if a bridge patch changed |
| **T1** every push / PR | GitHub Actions `ci.yml` | <= 6 min | **yes** (required check) | typecheck, unit (time model, geometry, evaluate, parity registry, scorecard), data validators DV-01..DV-30 (~1 s), build, `site-lint` SL-01..SL-30, `undef-globals`, `asset-integrity`, `size-limit`, gitleaks, `pnpm audit`, Playwright PR tier (8 viewports x Chromium + WebKit/Firefox smoke, console gate on) |
| **T2** Netlify Deploy Preview | `deployment_status` success (verify event) or CLI alias fallback | <= 30 min | **yes** (required check `preview-gate`) | header/redirect/cache contract on the real CDN, full PR-tier browser suite, axe state matrix, visual regression, Lighthouse x5 median mobile+desktop on 6 URLs, embed framing test, origin-disclosure test, scorecard delta comment |
| **T3** nightly | cron 03:17 ET | <= 90 min (sharded 6 x 3 browsers) | no; opens an issue; **must be green in the last 24 h to promote** | full 24-viewport matrix x 3 engines, all 26 URLs, parity harness, external links, Lighthouse on every sitemap URL x 3 profiles, key-restriction probe, Observatory grade, dependency/CVE scan, RUM evaluation |
| **T4** post-deploy | production deploy success webhook (`repository_dispatch`) | <= 8 min | triggers rollback runbook | `prod-probe` (15+ header/redirect/version probes), browser smoke at 375 and 1440 (load, play 10 s, 3 panels, console-zero, single document request), `version.json` == deployed SHA |
| **T5** scheduled production monitors | every 6 h | <= 15 min | opens an incident issue | probe + smoke (curl-class checks cost no page views), RUM evaluator, error/CSP beacon digest, cert/HSTS/domain expiry, Mapbox quota check |
| **T6** manual programs | per release candidate / quarterly | hours | gate for minor/major releases | real-device checklist (iOS Safari, Samsung Internet, low-end Android, iPad), assistive-technology script (NVDA, JAWS, VoiceOver x2, TalkBack, voice control), 5-user usability session, expert/historian review of data and copy |

### 2.3 Flow (ASCII)

```
 developer -> T0 hooks -> push -> [T1 ci.yml: static + unit + data + build + site-lint + browser PR tier]
                                     |                       \
                                     v                        `-- artifacts: dist, reports/*.json, scorecard.json
                     Netlify builds Deploy Preview (free, non-metered)
                                     |
                                     v
                     [T2 preview.yml: headers + browser + a11y + visual + Lighthouse x5]  -> PR comment: scorecard delta
                                     |
                              merge to main  ->  Netlify branch deploy of main = STAGING (main--friendly-lolly-da85c0.netlify.app)
                                     |
                     [T3 nightly on staging + production]  (parity, full matrix, links, LH-all)
                                     |
       promote: release workflow fast-forwards `production` to a green SHA (manual approval + gates below)
                                     |
                     Netlify publishes production  ->  [T4 post-deploy smoke]  -> ok | auto-rollback + issue
                                     |
                     [T5 monitors + RUM/error/CSP beacons]  ->  alerts (issue / email / ntfy)
```

### 2.4 Failure handling contract

- A T1/T2 failure blocks the PR. The PR comment lists failures by audit id and category and links the Playwright HTML report (trace, video, layout-violation JSON attachment).
- A T3 failure opens a `nightly-failure` issue with the run link; promotion is blocked until a green nightly exists for a SHA at or after the candidate.
- A T4 failure runs the rollback runbook (section 4.6) within 15 minutes; T5 failures open `prod-incident` issues.
- Any test skipped by `test.skip()` must state a reason string; CI prints the skip count per tier and the scorecard treats skips in a catalogued gate as failures unless the skip condition is a documented device-class exclusion.

## 3. Repository layout, branching, conventions

### 3.1 Layout (extends `prov-recon.md` 7.1; the QA-owned parts are marked `*`)

```
gettysburg/                              PRIVATE GitHub repo (keys in history until rotated: prov-recon-08)
  README.md  CONTRIBUTING.md  .nvmrc  .env.example  netlify.toml  lefthook.yml*  renovate.json*
  docs/
    adr/            0001-source-of-truth  0002-dependency-matrix  0003-lighthouse-runner*  0004-visual-regression-tool*  0005-rum-storage*
    parity/         intended-diffs.json*                    (registry, expiring entries, audit id per entry)
    qa/*            README.md  rc-device-checklist.md  at-test-log.md  usability-log.md  expert-review-log.md  runbooks/{rollback,incident,cutover}.md
    claims.json*    (marketing/UX/help/guide claims -> test id; see 5.16)
    CHANGELOG.md    (generated)  a11y/ACR-WCAG2.2.md  (app-a11y-34)
  legacy/           dist/ (frozen production bytes, correct-case names)  analysis/  spec/ (pure legacy functions for goldens)  patches/ (bridge runner)
  apps/web/         static pages + shell (Astro)     apps/map/  map app (React + TS)
  packages/         tokens/  data-schema/
  data/             raw/  curated/  build/ (+ time_anchors.json, unit_aliases.json, sources.json*, counts.json* generated)
  pipeline/         ingest/ normalize/ validate/* (DV-xx)  build-search-index/  historian/ (corpus build + eval, section 5.14)
  netlify/functions/*  rum.mjs  csp-report.mjs  rum-evaluate.mjs (scheduled)
  rum/*             web-vitals-beacon.js  evaluate.mjs  fetch-and-evaluate.mjs
  perf/*            budgets.json  run-lighthouse.mjs  run-all.mjs  assert-lh.mjs  lhci.config.cjs (optional)  size-limit config in package.json
  tests/*
    e2e/  a11y/  visual/  parity/  static/  data/  lib/  fixtures/  support/  golden/  known-failures.json  overlap-allowlist.json  console-allowlist.json
  tools/*           scorecard.mjs  gates.json  build-report.mjs (PR comment)  assert-observatory.mjs
  .github/workflows/*  ci.yml  preview.yml  nightly.yml  prod-monitor.yml  release.yml  cutover.yml
```

The archives (zips, 29 MB variants, old bundles) stay **outside git** with `ARCHIVE_MANIFEST.tsv` in `docs/` (`prov-recon-02`).

### 3.2 Branching and git conventions

| Rule | Reason |
|---|---|
| Trunk-based: short-lived branches -> PR -> `main`. No long-lived rewrite branch; the new map app is built inside `apps/map` and served at `/next/` from `main` behind flags until cut-over | avoids a merge cliff; the parity harness compares `/` (legacy) and `/next/` from the same commit |
| `main` is always deployable to *staging* (Netlify branch deploy of `main`) | T3 nightly runs against real staging plus production |
| `production` is a protected branch that only the `release.yml` workflow can fast-forward, from a SHA that satisfies the promotion gates (section 4.4) | promotion is a git-visible, auditable, revertable event; Netlify's production branch is `production` |
| Conventional Commits (`fix(mobile): ...`, `feat(historian): ...`, `data(oob): ...`, `chore(perf): ...`); a `Refs: C1,C2` footer or `audit:` PR label is mandatory for `fix:` | traceability; feeds changelog and scorecard |
| Required checks on `main`: `ci / static`, `ci / build`, `ci / e2e-pr (1..4)`, `preview / gate`. Admin bypass disabled even for the owner | a solo dev is the most likely person to skip the gate at 11 pm |
| Squash merge; PR title = the conventional commit; PR template enforces the DoD checklist (section 8) | one line in history per change |
| Hotfix = branch from `production`, PR to `main` **and** cherry-pick to `production`, must include the regression test | section 4.7 |
| Data changes are PRs too (`data/**`) and run DV-xx with `--strict` and source-citation checks | the data is the product |

### 3.3 Tooling matrix (pin exact versions at adoption; versions I could confirm this session are noted)

| Need | Tool | Note |
|---|---|---|
| E2E, viewport matrix, visual, parity, SW | **Playwright** (`@playwright/test`), official container image for CI | pin the same version in `package.json` and the container tag; bump deliberately because screenshot baselines are tied to the image `(verify current tag; sketch uses v1.50.0-noble)` |
| Accessibility | **axe-core** via `@axe-core/playwright`, **pa11y-ci** (htmlcs + axe), eslint-plugin-jsx-a11y (strict), stylelint token rules, manual AT program | app-a11y-32 has the full state matrix; this plan owns the gate wiring |
| Lab performance | **Lighthouse 13.x via the Node API** (custom runner + `assert-lh.mjs`); optional `@lhci/cli` for its dashboard | `@lhci/cli` latest I could confirm is **0.15.1 bundling Lighthouse 12.6.1** (GitHub releases page fetched 2026-09-30), while the audit ran **Lighthouse 13.5.0**, which renamed audits (`render-blocking-insight`, `network-dependency-tree-insight`). Hence the custom runner reading raw LHR JSON; decision recorded in ADR 0003 |
| Bundle budgets | `size-limit` (+ `@size-limit/file`), `rollup-plugin-visualizer`, `knip` | per-chunk brotli budgets from `bundle-anatomy.md` 4.1 |
| Static/semantic gates | Node scripts in this plan (`site-lint`, `undef-globals`, `asset-integrity`, `prod-probe`, DV validators) | dependency-free except `acorn` + `eslint-scope` for the free-variable gate |
| Links | **lychee** (internal + external), custom internal crawler | external links weekly to avoid flake |
| RUM | **web-vitals** v5 attribution build (`web-vitals/attribution`; onLCP/onINP/onCLS/onFCP/onTTFB) | library page fetched 2026-09-30; attribution field names must be verified against the installed types |
| Secrets/deps | gitleaks, `pnpm audit`, osv-scanner, Renovate | Mapbox `pk.` tokens in 9 HTML pages + bundle (`SL-26`) until moved to config |
| Release | release-please (or changesets) for changelog/version PRs | `(verify options)` |
| Visual regression | Playwright `toHaveScreenshot` in the pinned container | free; alternatives in 5.7 |
| Scheduling | GitHub Actions cron; Netlify scheduled function only for RUM compaction/evaluation | scheduled functions are available on all plans per Netlify docs |

### 3.4 Test naming, tags and outputs

- Every test title: `@cat:<function|data|design|polish|usability|reliability|performance|a11y|seo|security|docs|privacy> @audit:<ids> <sentence>`; parametrised titles append the state and viewport id (`"mobile-tools-sheet" [w375-p]`).
- Non-Playwright gates print `PASS|FAIL <GATE-ID> [<audit ids>] <detail>` and write `reports/gates/<name>.json` (`[{id, ok}]`); Playwright's JSON reporter is adapted to the same shape by `tools/adapt-playwright.mjs` (tag -> gate id). `tools/scorecard.mjs` merges all of them.
- Attachments on failure: trace, video, `layout-violations.json`, `tappability.json`, `parity-<checkpoint>.json`, console log.

### 3.5 Testability requirements the rebuild must satisfy (the hooks contract)

Without these, the suites degrade to fragile text scraping (as the legacy driver does). They are *requirements on the rebuild*, cheap to build in from day one:

| Hook | Contract |
|---|---|
| URL test hooks | `?intro=0` (skip splash/onboarding), `?layout=desktop` or `?layout=mobile`, `?tick=N`, `?panel=<id>`, `?test=1` (freezes non-essential animation, disables RUM, exposes `window.__gtbg`), `?motion=reduce`, `?contrast=high` (`app-a11y-26`) |
| `window.__gtbg` (only when `test=1`) | `state()` -> `{ready, tick, day, dateLabel, clockLabel, layout, speed, playing, panels[], mapCount, unitCount}`; `seek(tick)`, `play(speed)`, `pause()`; `unitsAt(tick)` -> `[{id,lat,lng,bearing,strength,disposition}]` (parity T1); `labelCollisions()` (D3); `mapInstances()` (bundle-anatomy-12); `swState()` |
| Accessible names and roles | real `<button>` with names, `role=slider` with `aria-valuetext`, `role=dialog` + `aria-modal`, landmarks (`app-a11y-15`); tests use `getByRole` |
| `data-testid` | only for things with no role (canvas overlays, map controls): `map`, `hud-clock`, `hud-date`, `toast`, `story-panel`, `event-card`; stable, documented in `docs/qa/README.md` |
| `data-overlap-ignore` | on the map canvas container and other intentionally layered decoration, so the geometry detector skips them (each use reviewed) |
| `data-historical-quote` | on quoted period text that legitimately contains clock times, so the one-clock test skips it |
| `<html data-build data-layout>` | build id and active layout, read by RUM and tests |
| `/version.json` | `{app, data, timeModel, sha, builtAt, deployId}`; the same values are shown in Help -> About and in the PDF guide footer |

### 3.6 Secrets and permissions in CI

- `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` (only for the CLI fallback and post-deploy rollback), `MAPBOX_PUBLIC_TOKEN_CI` (a *separate* `pk.` token restricted to the preview/CI origins, so CI traffic never consumes the production token's quota and the production token can stay URL-restricted, X1), `GITHUB_TOKEN` least-privilege per job (`permissions:` blocks in the workflows).
- No secret in `pull_request` workflows from forks (private repo, solo: not applicable, but the workflow files declare `permissions:` explicitly anyway).
- gitleaks runs on every push and on the full history once, before the repository is ever made non-private.

## 4. Netlify pipeline and release engineering

### 4.1 Netlify configuration changes (owned by this plan; the toml itself is `infra-netlify`'s deliverable)

| Change | Why / test that proves it |
|---|---|
| `publish = "dist"` + `[build] command = "pnpm build"` (with the site-lint, size-limit and asset-integrity steps inside the build command as a last line of defence) | `netlify.toml:2` is `publish = "."`; the repo root would publish `src/`, `docs/`, `.md` files (`prov-recon` T-03). Probe: `/src/*`, `/docs/*`, `*.md`, `/package.json` must 404 on every preview (HP-13 extended) |
| Production branch = `production`; `main` gets a branch deploy = **staging** | section 3.2; gives T3 a stable prod-like URL with the same headers/CDN |
| **Generate `dist/_headers` at build** from one template keyed on `$CONTEXT` (`production`, `deploy-preview` or `branch-deploy`) instead of hand-written `[[headers]]` cascades | Fixes X4 properly: Netlify merges rules, so `X-Frame-Options = ""` on `/embed.html` cannot remove the site-wide DENY (verified live). More importantly, once CSP is *enforced*, two CSP headers are **intersected** by browsers, so a second `Content-Security-Policy: frame-ancestors *` on the embed path would still lose to a site-wide `frame-ancestors 'none'`. The generator emits one rule per path group and *no* site-wide framing rule for `/embed.html`. Tests: HP-06/07 + `embed-framing.spec.ts` (a foreign-origin page can iframe `/embed.html`, cannot iframe `/`) |
| Non-production contexts add `X-Robots-Tag: noindex, nofollow` and skip RUM/analytics snippets | previews must never be indexed or pollute field data. Probe: preview has the header, production does not (test asserts both directions) `(verify _headers + toml precedence on a real preview; the test makes the verification automatic)` |
| Deploy Preview access: unguessable URL + `noindex`; optionally Password Protection for non-production deploys (Pro feature per Netlify plan table) | previews expose unreleased content; protection breaks CI unless CI sends the credential, so default is noindex-only and revisit if content becomes sensitive |
| Redirect collapse: `/index.html` -> `/` and `/x.html` -> `/x` (or the reverse, decided once from the sitemap form) with `301`, `force = true` | T3; probes HP-10/HP-11; also fixes the split cache policy (`/dashboard` vs `/dashboard.html`) |
| `[[redirects]]` for retired URLs (`/landing.html` was indexed and removed without redirect, `deploy-history.md` 9.4) and `.netlify.app` -> custom domain | `seo-probe` asserts every URL ever in a sitemap either 200s or 301s |
| Outgoing webhook "deploy succeeded" (production) -> GitHub `repository_dispatch: netlify-production-deploy` | triggers T4 |
| Functions: `netlify/functions/rum.mjs` (`/api/rum`), `csp-report.mjs` (`/api/csp`), scheduled `rum-evaluate.mjs` | section 7; same-origin, so CSP `connect-src 'self'` covers them |

### 4.2 Deploy Previews per PR

- Netlify builds a Deploy Preview for every PR (free and non-metered per the credit table) at `https://deploy-preview-<n>--friendly-lolly-da85c0.netlify.app`.
- `preview.yml` triggers on GitHub `deployment_status` with `state == success` and a non-production environment and reads `environment_url` `(verify that Netlify's GitHub app emits this event for your site; fallback = poll the commit status "netlify/friendly-lolly-da85c0/deploy-preview" or run `netlify deploy --alias=pr-<n> --json` from CI, which needs `NETLIFY_AUTH_TOKEN` but is ineligible for Split Testing per Netlify docs (prov-recon 6.7))`.
- The `preview / gate` job is a *required* status check. It posts one PR comment (edited in place) with the scorecard delta, Lighthouse medians, and links.
- Visual baselines are generated inside the same container image the job uses; the "update baselines" workflow is a manual `workflow_dispatch` that commits to the PR branch and requires a human to review the image diff before merging.

### 4.3 Environments

| Environment | URL | Built from | Purpose | Data / keys |
|---|---|---|---|---|
| Local | `pnpm dev` / `pnpm preview` | working tree | development; `?test=1` hooks | CI-restricted Mapbox token or stub |
| PR preview | `deploy-preview-N--...netlify.app` | PR merge ref | T2 | `MAPBOX_PUBLIC_TOKEN_CI` |
| Staging | `main--friendly-lolly-da85c0.netlify.app` | `main` | T3 nightly, stakeholder review, RC device testing | same as CI token |
| Production | `gettysburginteractivemap.com` | `production` | users | production token, URL-restricted (X1) |
| Legacy (during cut-over) | `/classic/` | frozen `legacy/dist` | rollback path and parity reference | production token |

### 4.4 Promotion gates (staging -> production)

`release.yml` (manual `workflow_dispatch`, environment `production` with required reviewer = the owner) refuses to fast-forward `production` unless **all** are true for the candidate SHA `S`:

1. `ci` and `preview / gate` green on `S`; `nightly` green with `S' >= S` within 24 h.
2. Scorecard (section 9) shows **no category regressed** versus the last release and the release-type target is met (patch: no regression; minor: all "must" gates green; major or cut-over: all categories A+).
3. Budgets (`perf/budgets.json`, `.size-limit.json`) not raised since the last release (or raised with an ADR).
4. `CHANGELOG.md` entry present, `version.json` version bumped, `docs/claims.json` has no claim without a passing test.
5. No open issue labelled `severity:critical` or `regression`.
6. For minor/major/cut-over: `docs/qa/rc-device-checklist.md` attached for the RC (iOS Safari + Android Chrome + one low-end device), `at-test-log.md` entry <= 90 days old, rollback rehearsed <= 90 days ago.
7. Not inside a freeze window (4.8).

Promotion = `git push origin S:production` by the workflow. Netlify builds `production`, publishes, and the webhook fires T4.

### 4.5 Versioning, changelog, "what's new"

| Artifact | Scheme | Where it appears |
|---|---|---|
| App | SemVer `MAJOR.MINOR.PATCH`: MAJOR = URL/state contract or layout change (e.g. cut-over 2.0.0), MINOR = user-visible feature/tool, PATCH = fix | `version.json`, Help -> About, PDF footer, `<html data-build>` (with short SHA), git tag `vX.Y.Z` |
| Data | CalVer `data-YYYY.MM.N` (increments when any `/data/v2/*` hash changes); each file content-hashed, `manifest.json` lists them | `version.json`, Historian answers cite the data version |
| Time model | integer `timeModel` (bumps when `time_anchors.json` changes; golden `tick-clock.csv` regenerates in the same PR) | `version.json`; RUM/Parity attach it |
| Changelog | Keep-a-Changelog format generated by release-please from Conventional Commits; `data(...)` and `fix(...)` entries carry audit ids | `CHANGELOG.md` (dev), `/changelog.html` (public "What's new", generated from the same source, in the sitemap) |
| Corrections log | every historical correction (clock, dates, counts) is a `data(correction):` commit with source citation; the public changelog has a "Corrections" section | builds trust for a history product |

### 4.6 Rollback (four levels; rehearse every 90 days)

| Level | Trigger | Action | Time to effect | Test |
|---|---|---|---|---|
| **L0 kill-switch** | one panel/feature misbehaves | flip flag in `/flags.json` (`no-cache`, 1 s client timeout, safe defaults) | seconds | e2e: with flag off the feature is absent and the app has zero console errors |
| **L1 publish previous deploy** | post-deploy smoke fails, error-rate alert | Netlify "Publish deploy" on the previous production deploy (atomic, no rebuild per `prov-recon` 6.8) or `POST` via API from `rollback.yml` `(verify endpoint)`; then revert the merge on `production` | < 1 min | quarterly drill in staging |
| **L2 service-worker kill** | a bad SW controls users | deploy a `sw.js` that deletes `gbg-*` caches and `registration.unregister()`s itself; `sw.js` is already `no-store` (`netlify.toml` rule, probe HP-08) | next navigation + SW update check | e2e `service-worker.spec.ts` "migration" test |
| **L3 data rollback** | bad data release | point `manifest.json` at the previous content-hashed files (hashed files are immutable, so rollback is a manifest swap) | minutes | DV-xx run against the previous manifest in CI |
| Storage safety | new keys namespaced `gtbg:v2:*`; old keys read but not deleted for one release | rollback to legacy keeps bookmarks and prefs | n/a | parity/storageState test (`prov-recon-33`) |

**Auto-rollback rule (T4):** if `prod-probe` or browser smoke fails twice within 10 minutes of a production publish, `rollback.yml` performs L1 and opens a `prod-incident` issue. Anything after L1 is human.

### 4.7 Hotfix path

Branch from `production`, one fix + its regression test (red-first proof in the PR), T1 + T2 only, promotion the same day; cherry-pick to `main` in the same PR; changelog `fix:` entry with the audit or incident id. No hotfix without a test: the C5/C6 class of bug is exactly what a hurried untested patch reintroduces.

### 4.8 Freeze windows (domain-specific)

Gettysburg traffic is seasonal. Freeze production promotions **June 25 - July 5** (battle anniversary, July 1-3), **November 15-20** (Remembrance Day, Nov 19), and Fridays after 12:00 ET. Before each window: RUM review, Lighthouse-all run, rollback drill. Emergency L0/L1 actions are exempt. (Seasonality is an assumption from the domain; the current 30-day data is Sept, so no anniversary baseline exists. `SYN-05` records daily views to build one.)

### 4.9 Cut-over and canary (interaction with `prov-recon` 6.7)

- Prefer **opt-in beta**: the new app lives at `/next/` (noindex) with a "Try the new version" link on the legacy home and a "Classic version" link in the new one; after the parity and RUM gates (section 6.5) pass, `/` serves the new build and `/classic/` serves the frozen legacy for 60 days.
- Netlify Split Testing (percentage rollout) needs Git-connected branch deploys and, to my knowledge, **sets a cookie** for stickiness `(verify: name and lifetime)`. The privacy page currently states "This site does not set its own cookies"; using split testing would require updating `privacy.html` and the cookie section first. A stateless percentage split is unsuitable for a service-worker-controlled app (a user would flip builds between page loads), so the plan does not depend on it.

### 4.10 Cost and quota hygiene

- GitHub Actions minutes: private-repo free allowance is limited `(verify current numbers)`. Budget: T1 ~6 min x ~20 pushes/week, T2 ~25 min x ~5 PRs/week, T3 ~6x3 shards x ~30 min nightly. Nightly full matrix is the dominant cost; if the allowance is exceeded, run WebKit/Firefox nightly only on Monday and Thursday and keep Chromium daily.
- Netlify credits: each production deploy = 15 credits per the credit table; promotion cadence of a few per week is negligible; Deploy Previews/branch deploys are non-metered.
- Mapbox: CI uses a stubbed style for 95% of tests; `@realmap` tests (a handful, nightly) use the CI token so production quota is untouched; a T5 check reads Mapbox usage and alerts at 70% of the plan allowance `(verify: Mapbox statistics API access)`.

## 5. The test suites (mapped to the audit in section 10)

### 5.1 Viewport and device matrix

**Source of truth:** `tests/support/viewports.json` (24 rows, checked in); `playwright.config.ts` generates one project per row (sketch in Appendix A.0). Widths: 320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440, 1920, 2560. Orientation axis: handheld widths (<= 1024) get portrait + landscape (swapped W x H); desktop widths get *standard* plus a *short-window* (H = 600, devtools/toolbars open) or *portrait monitor / ultrawide* variant, because a real "portrait desktop" at 1280 wide does not exist but short-height collisions are the real desktop analogue of landscape phones.

| Row id | W x H | DPR | touch | Tier | Represents |
|---|---|---|---|---|---|
| w320-p / w320-l | 320x568 / 568x320 | 2 | yes | **pr** / full | iPhone SE 1st gen; equivalent of a 1280 px window at 400% zoom (WCAG 1.4.10 reflow) |
| w360-p / w360-l | 360x740 / 740x360 | 3 | yes | full | most mid-range Android (Galaxy A/S) |
| w375-p / w375-s / w375-l | 375x812 / 375x667 / 812x375 | 3 / 2 / 3 | yes | **pr** / full / **pr** | audit reference phone; iPhone SE 2/3 short portrait; landscape (C1/C2 were measured at 375x812) |
| w390-p / w390-l | 390x844 / 844x390 | 3 | yes | full | iPhone 12-14 |
| w412-p / w412-l | 412x915 / 915x412 | 2.625 | yes | **pr** / full | Pixel 6/7/8, Samsung Plus |
| w430-p / w430-l | 430x932 / 932x430 | 3 | yes | full | iPhone 14/15 Plus, Pro Max |
| w768-p / w768-l | 768x1024 / 1024x768 | 2 | yes | **pr** / full | iPad mini / 10.2"; the layout-chooser boundary (H3) |
| w1024-p / w1024-s | 1024x1366 / 1024x600 | 2 / 1 | yes / no | full | iPad Pro 12.9 portrait; small laptop, short window |
| w1280-d / w1280-s | 1280x800 / 1280x600 | 1 | no | **pr** / full | common laptop; short window |
| w1440-d / w1440-t | 1440x900 / 1440x2560 | 1 | no | **pr** / full | audit reference desktop; rotated monitor |
| w1920-d | 1920x1080 | 1 | no | **pr** | full HD |
| w2560-d / w2560-u | 2560x1440 / 2560x1080 | 1 | no | full | QHD; ultrawide |

Eight rows run on every PR (bold); all 24 run nightly across three engines (Chromium full matrix; WebKit and Firefox on a fixed 4-row smoke set on PRs, full nightly). Firefox has no `isMobile` emulation, so Firefox rows are desktop only; WebKit here is the engine, not iOS Safari (see 5.15).

**Variants layered on the matrix (media emulation, no extra viewports):** `prefers-reduced-motion: reduce`, `forced-colors: active`, `colorScheme: dark` (default; the app is dark-only, so a light-scheme run asserts nothing breaks), 200% root text + the WCAG text-spacing overrides (`layout-audit.spec.ts` last test), and an optional `w280` foldable-cover row nightly (below the WCAG 320 px floor; informational).

**State catalogue (`tests/support/states.ts`):** each state is a function that brings a *fresh* page to that state on either build (`DRIVER=legacy|next`). Every matrix test iterates the catalogue, so adding a panel means adding one line (a DoD item). Initial 12 states: desktop-home, desktop-day3-dense (tick 538), desktop-search, desktop-legend, desktop-help, desktop-ancestor, desktop-walkthrough, desktop-extra-menu, mobile-home, mobile-tools-sheet, mobile-story, mobile-help; to grow to ~45 (`app-a11y` 9.1 lists the states: layout chooser, each onboarding step, filter, roster, OOB, bookmarks, minimap, distance tool, layers, event card, toast stack, each Help tab, walkthrough stops 1/8/16, Soldier's Eye, share dialog, error/offline/empty states, `?view=text` Data View).

**Runtime budget:** 24 viewports x ~45 states x ~1.5 s per (state, viewport) detector pass ~ 27 min single-worker, ~7 min on 4 workers per engine; sharded 6 ways nightly. PR tier: 8 viewports x ~20 states x ~1.5 s ~ 4 min on 4 workers. If the PR tier exceeds 6 min, drop states (never viewports) from the PR tier and keep them nightly.

### 5.2 Overlap, clipping, occlusion and tappability detectors (would have caught C1, C2, H1, S4)

Library: `tests/lib/layout-audit.browser.js` (Appendix A.2 and the file in `tmp-qa-ci/sketches`); it exposes `window.__layoutAudit(opts)` and `window.__layoutAuditList()` and exports its geometry for node unit tests (7 tests pass).

| Rule id | Detects | Assertion | Notes / thresholds |
|---|---|---|---|
| `OFFSCREEN` | interactive element not fully inside the viewport and not inside a scrollable ancestor | `inside(rect, viewport, 1px)` | the C1 signature (x = -213). Needed because the shell is `overflow:hidden` (`index.html:62`), so `scrollWidth` cannot reveal it |
| `OCCLUDED` | element covered by something else | `document.elementFromPoint` at the centre + four points at 25%/75% (shadow-DOM aware) must hit the element, a descendant or its label; centre must hit and >= 3 of 5 | the C2 signature (timeline bar over the tools sheet). Complemented by Playwright `locator.click({trial:true})` which runs the same "receives events" check inside the browser's actionability engine |
| `OVERLAP` | two UI boxes (interactive elements + outermost fixed/sticky/positioned chrome) intersecting | area >= 16 px^2 **and** >= 4% of the smaller box, and the topmost element at the intersection centre belongs to one of the two (so the visual overlap is real) | H1 (floating Extra Features overlay z-index 999999 over story panel, chooser, help). Map canvas and decorative layers opt out with `data-overlap-ignore` |
| `CLIPPED_TEXT` | text cut by an ancestor with `overflow` hidden or clip, extending beyond the viewport with no scroller, or ellipsized | text range rect within every clipping ancestor's rect (1 px tolerance) | splash "ETTYSBURC", Compare style tabs "Parc...", ellipsized labels |
| `H_OVERFLOW` | page-level horizontal overflow | `documentElement.scrollWidth <= innerWidth + 1` | S4 dashboard chart 1000 px wide. Sub-pages only; the app shell is caught by OFFSCREEN |
| `TARGET_SIZE` | touch target < 44x44 (`pointer:coarse`) or, on fine pointers, < 24 px without the WCAG 2.5.8 spacing exception | rect w,h vs limit; inline links exempt | BRIEF bar: 44x44 touch, >= 24 desktop (app-a11y-19 targets 32 on desktop; tighten `minFine` when that ships) |
| `FONT_FLOOR` | visible text < 12 px | computed `font-size` of every element with direct text | 49 elements today (audit D2); the Mapbox attribution control is the only allowlist candidate (reason: third-party licence UI) |

**Allowlist policy** (`tests/overlap-allowlist.json`): `{rule, sel, other?, audit, reason, until}`; an entry past `until` stops suppressing (unit-tested), CI prints allowlist size per PR, and the size may only shrink (budget-style check). Blind spots, stated so nobody over-trusts the detector: text drawn on the Mapbox canvas (unit labels: use `__gtbg.labelCollisions()` and visual baselines, D3), third-party iframes (Street View), pointer-events:none decoration, and hover-only popups (tested separately in a11y 1.4.13 tests).

**Companion Playwright checks that are cheaper than custom code:** `expect(locator).toBeInViewport({ratio:1})` for named headline controls; `locator.click({trial:true})` for every enumerated control (Test 1); `expect(locator).toHaveAccessibleName()`; `page.emulateMedia({reducedMotion, forcedColors})`.

### 5.3 Function and interaction suites (one spec per feature; each maps to Core-function, Usability and Fit-and-finish audit items)

All run against both drivers; on the legacy driver they are the red proofs, on the rebuild they are the acceptance tests. `M` = mobile projects only, `D` = desktop only.

| Spec | Key assertions (each line is a test) | Audit ids |
|---|---|---|
| `first-run.spec` | fresh visit: exactly one document request; layout auto-selected from viewport + `pointer:coarse` (phone never sees a chooser; desktop never sees "Power User: keyboard shortcuts" on touch); choice persisted (`localStorage` gains a layout key, `gtbg_onboarded` alone is not enough); reload -> no "Fast-forwarding 3 days" splash, shell interactive < 2 s; splash text not clipped at 320/360/375 (`CLIPPED_TEXT`); chooser/tour/help focus-trapped with Esc | H3, A6, C6 |
| `playback.spec` | Play/Pause toggles at every width (M: controls in viewport, Test 1); speed label states sim-minutes per second, never "real time" (`H9`); step buttons move exactly the documented number of ticks; +/-1 h uses the time model (`tickAfterMinutes`); long-task observer during 8x playback: no task > 50 ms after warm-up, heap < 60 MB after 60 s | C1, H9, D-perf |
| `jump-state.spec` | after "load/jump" to any day or tick: legend, story panel, event card and toasts are closed; toasts auto-dismiss <= 6 s (`toBeHidden({timeout:7000})`); map flies to the action (>= 50% of active units inside the viewport) | H4, D3 |
| `keyboard.spec` | Esc closes topmost panel in this order: modal -> event card -> story panel -> search results -> selection; Esc works from inside the search input; no shortcut fires while typing; Help lists exactly the registered shortcuts (`hotkey registry` snapshot) | H2, D2, A6 |
| `search.spec` | regiment name, commander name, ordinal natural sort (1st...9th, 10th..., 102nd after 10x), chips readable (contrast) and pressed-state exposed, no `alias for` / `Commander unrecorded` rows, empty state message | H5, H7, C8 |
| `filter-legend-minimap.spec` | minimap label equals the visible unit count and pluralizes ("1 unit"); legend tabs; layer toggles; every toolbar item present in the tool sheet on mobile and the toolbar on desktop | H11, D4 |
| `unit-panel.spec` | select any of 467 regiments without exceptions (loop, console gate on); commander succession displayed at the right tick; strength bar within [0, OOB strength] | C5, DV-12 |
| `ancestor.spec` | open panel, list sorted naturally, pick 20th Maine, gold trail active, "Change Regiment", share link round trip (`?ancestor=U-20ME`); no ReferenceError | C5, H5, pagesB-01 |
| `distance-tool.spec` | two clicks -> two markers + a line feature + values in ft/yd/m/min@2.5 mph; third click resets | H12 |
| `walkthrough.spec` | 16 stops + 512 monuments listed 100 at a time; stop 1 vs 8 Street View `src` differ and match stop coordinates; caption differs; "Soldier's Eye" link states it opens Google Maps in a new tab (`rel=noopener`) or embeds a panorama, whichever the guide says | H13, G1 |
| `help.spec` | click -> first visual feedback (spinner or dialog) <= 100 ms, content <= 1 s (D1); About shows `version.json` values; counts equal data (467) | D1, H10 |
| `mobile-shell.spec` (M) | transport row on-screen; Tools sheet every row tappable and opens something (5 formerly dead targets); "Desktop View" reachable; bottom safe-area padding present | C1, C2, prov-recon-14 |
| `deeplink.spec` | every URL emitted by the 9 link builders (documentary, education, embed, historian, regiment, search x3, turning-points) opens the requested tick/unit/vignette with the splash skipped; unknown/out-of-range params degrade to defaults with zero console errors | pagesB-01, P-62 |
| `seek-safety.spec` | play to tick 500, seek to 20: no unit is drawn from a keyframe with tick > 20 ("ghost units") | P-22 |
| `extra-features-nav.spec` | the injected overlay no longer exists as a separate z-index 999999 layer; tools menu reachable from the real header on both layouts; the Historian entry is a toolbar item | H1, prov-recon-30 |
| `subpages.spec` (20 pages x 3 viewports) | title/h1/main present, no console errors, data fetches succeed with retry UI on failure (offline test), map pages: poster then map `idle` < 3 s (S2), canvas painted (`S3` pixel-variance check over a 4x4 grid), dashboard: stat cards numeric, chart SVG has data nodes within 3 s on **10 consecutive cold loads** (`repeatEach:10`, intermittent C7), Compare tabs not clipped, Living Ledger at tick 1 equals the cumulative data value | S1-S4, C7 |
| `embed.spec` | a page on a foreign origin can iframe `/embed.html` and it renders; iframing `/` is refused; embed URL params behave; `Terms` "widget" claim is true | X4 |

### 5.4 Accessibility suites (gate wiring; specs in `app-a11y.md` 9)

| Gate | Tool | Threshold | Tier |
|---|---|---|---|
| State-matrix axe | `@axe-core/playwright`, tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice | 0 violations, 0 unreviewed `incomplete` for `color-contrast`, `label`, `button-name`, `aria-allowed-attr`, `target-size`; 12 -> ~45 states x {default, reduced-motion, forced-colors} x {desktop, phone} | PR (subset), nightly (all) |
| pa11y-ci | htmlcs + axe runners with `actions` for panel states | 0 errors on all 26 URLs at 375 and 1440 | nightly |
| Lighthouse a11y | Lighthouse category | 1.00 mobile and desktop, home + 5 sub-pages | T2 |
| Keyboard-only journeys (`keyboard-journeys.spec`) | Playwright with an init script that fails the test on any mouse/touch `pointerdown` | the 15 core tasks of `app-a11y.md` 9.3 (enter the app, choose a layout, play/pause, seek, jump day, search, select a unit, open a panel, close it with Esc, Help, walkthrough, Follow-Your-Ancestor, share, bookmark, Tools) complete with **zero pointer events**; focus lands on the expected element after every step; no keyboard trap | PR (subset), nightly |
| Behavioural | Playwright | scrubber `role=slider` + `aria-valuetext`; Esc stack; dialog focus trap and restore; unnamed/emoji buttons = 0; Tab reaches every toolbar control in <= 25 presses with a visible, unobscured focus ring (WCAG 2.4.7, 2.4.11, 2.4.13) | PR |
| Contrast tokens | unit test over `packages/tokens/tokens.json`: every text/background token pair >= 4.5:1 (3:1 large/UI) | 0 failures | T1 |
| Static | eslint-plugin-jsx-a11y strict, stylelint (no raw hex, min font 12 px, coarse-pointer min-size 44 px, z-index from scale only) | 0 | T0/T1 |
| Text-spacing / 200% text / 320 px reflow | `layout-audit.spec.ts` | no CLIPPED_TEXT/OFFSCREEN/OCCLUDED | PR |
| Manual AT program | `app-a11y-33` scripts, NVDA x Firefox/Chrome, JAWS x Chrome, VoiceOver macOS/iOS, TalkBack, Windows forced colors, voice control, 200%/400% zoom | 15/15 core tasks, log <= 90 days old for a release | T6 |

### 5.5 Lighthouse and Core Web Vitals lab gates

**Runner (`perf/run-lighthouse.mjs`, in `tmp-qa-ci/sketches/perf/` and not reproduced; the assertion script and budgets are Appendix A.6):** Node API of Lighthouse 13.x, 5 runs per (URL, profile), median per metric and per category, raw LHR JSON kept as artifacts, all assertions read by audit id from the JSON (ids taken from `lh_mobile.json`).

| Profile | Settings | Gate |
|---|---|---|
| `mobile` | Lighthouse default mobile (simulated: RTT 150 ms, 1,638 kbps, CPU x4, as in `lh_mobile.json`) | PR + nightly |
| `mobile-lowend` | CPU x6, RTT 300 ms, 700 kbps ("low-end Android on slow 4G") | nightly; LCP <= 4,000 (not Poor), TBT <= 600 ms, no crash |
| `desktop` | `--preset=desktop` (RTT 40, 10 Mbps, CPU x1) | PR + nightly |
| `warm` | second visit with the SW controlling, cache primed (Playwright nav timing, not Lighthouse) | PR: LCP <= 1,200 ms, 0 network requests under `/data` or `/assets` |
| `interaction` | Playwright + injected `web-vitals`, CPU x4 via CDP `Emulation.setCPUThrottlingRate`, scripted: open Help, Search type-ahead, Play 8x for 10 s, day jump, open Tools sheet | INP <= 200 ms p75 across >= 20 interactions (lab INP; Lighthouse's `interaction-to-next-paint` audit is absent in the navigation report, `lh_mobile.json` has no such id) |

**Budgets** (`perf/budgets.json`, executed today against the audit's JSONs: mobile 18 failing assertions, desktop 14): every metric has a `green` ceiling (Google CWV "good", the PR gate from the phase in which the fix lands) and a `target` (the A+ lab budget that keeps the Lighthouse performance score >= 95; enforced from Phase 6). Ratchet schedule: G0 baseline lock (no regression from 64 mobile / 85 desktop) -> G1 mobile >= 70 -> G2 >= 85 -> G3 >= 90 -> G4 (A+) >= 95, each step landing only with the phase that earns it.

| Metric (median of 5) | Mobile green / target | Desktop green / target | Today (audit) |
|---|---|---|---|
| Performance score | >= 0.95 | >= 0.95 | 0.64 / 0.85 |
| FCP | 1,800 / 1,500 ms | 1,800 / 900 ms | 4,099 / 831 ms |
| LCP | 2,500 / 2,200 ms | 2,500 / 1,200 ms | 9,007 / 2,229 ms |
| TBT | 200 / 150 ms | 200 / 150 ms | 27 / 0 ms |
| CLS | 0.10 / 0.05 | 0.10 / 0.05 | 0.073 / 0.023 |
| Speed Index | 3,400 / 3,000 ms | 3,400 / 1,300 ms | 4,099 / 1,935 ms |
| Server response | <= 800 / 300 ms | same | 25 / 26 ms |
| Accessibility / Best Practices / SEO | 1.00 / 1.00 / 1.00 | same | 0.90 / 0.96 / 1.00 |
| Audits that must pass | `redirects`=1, `valid-source-maps`=1, `color-contrast`=1, `label`=1, `inspector-issues`=1, `errors-in-console`=1, `unused-javascript`, `bootup-time`, `mainthread-work-breakdown`, `render-blocking-insight`, `network-dependency-tree-insight` >= 0.9 | same | fail today: all except `errors-in-console` (+ desktop passes `network-dependency-tree-insight`) |
| Transfer | script <= 560 KB, total <= 1.4 MB | same | 614,184 B / 1,577,215 B (mobile) |

Numeric "target" values are chosen so that each metric sits at or beyond Lighthouse's own scoring knee; the runner also asserts each metric audit `score >= 0.9`, which self-calibrates to whatever curve the pinned Lighthouse uses (I recalled the v10+ control points from memory: mobile FCP 1.8 s/LCP 2.5 s/TBT 200 ms/SI 3.4 s, desktop FCP 0.93 s/LCP 1.2 s/TBT 150 ms/SI 1.3 s; verify in the Lighthouse scoring docs before relying on them).

Lighthouse URLs: `/` (home shell), `/search.html`, `/dashboard.html`, `/compare.html`, `/historian.html`, `/regiment.html` on PRs; every sitemap URL nightly. Because the home page is an app, an additional Playwright-driven **Lighthouse user flow** (navigation + timespan around the first 10 s of playback) records TBT/INP for the interactive state.

**Drift control:** nightly job runs the newest Lighthouse against the same URLs and diffs category scores versus the pinned version; a > 3-point difference opens an issue to review the pin (Lighthouse changes audits between majors, as 12 -> 13 did).

### 5.6 Bundle, request and network budgets

| Budget | Value | Source | Enforced by |
|---|---|---|---|
| Entry chunk | <= 180 KB raw, <= 58 KB br | `bundle-anatomy.md` 4.1 | `size-limit` on `dist/assets/entry-*.js` |
| Map chunk (mapbox-gl 3.24.1 + engine) | <= 1,850 KB raw, <= 470 KB br | same | `size-limit` |
| Panel chunks | walkthrough <= 25 KB code, search+filter+legend+minimap <= 20 KB, roster/OOB <= 12 KB, story/events/toasts <= 30 KB, NPS tour <= 10 KB, ancestor/eye/unit panels <= 40 KB, mobile shell <= 16 KB, sound+onboarding <= 10 KB | same | `size-limit` (one entry per chunk) |
| HTML | <= 14 KB raw, <= 5 KB br | same | `size-limit` + SL |
| Poster image | 375w <= 35 KB, 1280w <= 60 KB | same | `size-limit` |
| Data (first paint) | Day 1 columnar <= 30 KB raw / 8 KB br; OOB <= 300 KB raw / 45 KB br; story <= 120 KB / 32 KB | same | `size-limit` + DV manifest check |
| Bytes on the wire before LCP | <= 65 KB | same | Playwright `response.request().sizes()` sum before the LCP entry |
| JSON requests before first interaction | <= 3 (legacy: 30-38) | P3 | Playwright `page.on('request')` filtered by `/data/` |
| Duplicate URL requests in one load | 0 | bundle-anatomy-11 | Playwright request log |
| Main-frame document requests on first visit | exactly 1 | C6 | service-worker spec |
| `mapboxgl.Map` / WebGL contexts per session | 1 (mobile currently creates 2: `bundle-anatomy-12`, `deploy-history` 9.7) | T-22 | init script counts `getContext('webgl2')` calls |
| Cache headers | `/assets/*` and `/data/v2/*`: `immutable`; HTML `no-cache` or `max-age=0,must-revalidate`; `sw.js` `no-store` | `netlify.toml` | `prod-probe` HP-08/HP-09 + data check |
| Source maps | every `assets/*.js` has a reachable `.map` and a `sourceMappingURL` (needed for Lighthouse `valid-source-maps`, P6) | P6 | `asset-integrity` + LH audit |
| Long tasks in first 5 s | none > 50 ms except map init (<= 100 ms) | bundle-anatomy 4.1 | `PerformanceObserver('longtask')` in Playwright at CPU x4 |
| Executed JS at boot (entry) | <= 120 ms at CPU x4 | same | Chrome trace via CDP |

`size-limit` config example: see Appendix B.3. "Budgets only tighten" is a CI diff check on these files.

### 5.7 Visual regression baselines

**Goal:** catch unintended chrome changes (toolbar iconography, panel layout, splash, sub-page heroes/footers, tokens) that geometry tests cannot see. **Not** a map-pixel test.

- **Determinism:** run only inside the pinned Playwright container (fonts and rasterization are OS-dependent, so baselines are Linux-only; the config's `snapshotPathTemplate` omits the platform on purpose); `animations:'disabled'`, `caret:'hide'`, `reducedMotion:'reduce'`; `?test=1` freezes tick/animation; Google Fonts (Spectral) and Mapbox routed to local fixtures (`tests/fixtures/{fonts,mapbox}`) so font swaps and tile timing cannot flake a diff. The stub style uses a **local sprite and local glyph PBFs** so symbol layers (unit markers, labels) still render deterministically; the satellite raster is replaced by a flat colour.
- **What is baselined:** ~40 states (section 5.1 catalogue) x 4 projects (`w375-p`, `w768-p`, `w1440-d`, `w1920-d`) ~ 160 PNGs, ~10-15 MB. Commit them; move to Git LFS if the folder passes ~50 MB. Map canvas is masked in chrome states and asserted semantically instead (unit positions from `__gtbg.unitsAt`, label collisions from `__gtbg.labelCollisions()`).
- **Thresholds:** `maxDiffPixelRatio: 0.002`, per-pixel `threshold: 0.2` (Playwright defaults for the latter); stricter (0) for the icon sprite page.
- **Update policy:** baselines change only through the manual `update-baselines` workflow, which commits to the PR branch; PR template requires "visual diff reviewed" with the reviewer's initials for any changed baseline; no baseline update without an audit id or a design-change note.
- **Tool choice (ADR 0004):**

| Option | Cost | Pros | Cons |
|---|---|---|---|
| **Playwright `toHaveScreenshot` in the pinned container (chosen)** | free | zero new vendor, tags/projects reuse, works offline | baselines in git; review via image diff in the HTML report |
| Argos CI / Percy / Chromatic / Applitools | free tiers and prices `(verify each)` | hosted diff review UI, approval workflow | private-repo pricing unverified, extra account/secret, another party sees screenshots |

### 5.8 Data validators (DV-00 .. DV-30) and the data-change protocol

Code: `pipeline/validate/*.mjs`; the prototype (`tests/data/validate.mjs`, 15 checks, ~1 s) is executable and was run against `SRC_DIR/data` (registry-ratchet proven, section 2.1). Every check states the audit id it guards. `--strict` fails on warnings. Time-related checks V1-V15 from `app-time.md` 10.1 are wired as `TM-V1..V15` and share `tests/support/time-model.mjs` (anchors file if present, else the files' own stated formula).

| ID | Assertion (exact) | Audit | Today (measured on the deployed data) |
|---|---|---|---|
| DV-00 | every data file validates against the JSON Schema generated from the zod schemas in `packages/data-schema` (types, required fields, enums); unknown keys warn; `_note`/debug keys never ship | N1 | designed (today the only schema is prose in `placement_schema.json`) |
| DV-01 | `metadata.record_count == placements.length` per file | N1 | **FAIL 1**: `placements_day1_ticks1_50.json` claims 4,890, holds 100 |
| DV-02 | every tick is an integer in 1..675 and inside the file's `tick_range` | P-22 | pass (0) |
| DV-03 | every placement `unit_id` resolves to an OOB id or a declared alias (`data/unit_aliases.json`) | H5, H7 | **FAIL 100** distinct ids unresolved by data alone (e.g. `C-ART-I-4`, `U-8IL`, `U-15AL`, `U-I-1-19IN`): the app resolves some in code; the fix is a data-driven alias table |
| DV-04 | `units_involved` (chronology) and `units_featured` (vignettes) resolve | H7 | **FAIL 28** (26 chronology, 2 vignette; all `C-ART-*`/`C-CAV`) |
| DV-05 | every regiment `parent_brigade_id` resolves to a brigade | H10 | **FAIL 36** regiments (VI Corps `U-VI-*`: brigades missing from `union_oob_brigades.json`) |
| DV-06 | no duplicate `(unit_id, tick)` across files unless byte-identical | H7 | **FAIL 78** differing duplicates (117 duplicated rows; e.g. `C-ART-Crenshaw@14` in `density_artillery_positions.json` and `density_day1_ticks1_50.json`) |
| DV-07 | teleport: consecutive keyframes obey speed caps (infantry 150, artillery 250, cavalry 400 m per model-minute) unless `snap:true` | C4, D3 | **FAIL 6** candidates: `U-8NY-CAV` t3->t4 2,374 m in 5 min (475 m/min), `U-I-2-2` t52->53 1,467 m, `U-8IL` t1->3 2,750 m, `C-I-3-3` t550->551 929 m, `U-20ME` t264->265 814 m (163 m/min), `C-7TN` t9->14 3,762 m. Candidates need historian review, not automatic correction |
| DV-08 | chronology `time` label within 10 min of the tick clock | C4 | **FAIL 49 of 137** (drift -230..+15 min against the file's own "Tick 1/226/451 = 5:00am" formula); becomes a check against `time_anchors.json` once it exists |
| DV-09 | `commander_successions.approx_time` within 15 min of `approx_tick` | C4 | **FAIL 37 of 42** (e.g. US-001 t28 "July 1 ~10:15am" vs 7:15 by formula: the *label* is historically right, the tick clock is wrong; the check must run both ways against anchors) |
| DV-10 | a clock time quoted in `vignette.panel_summary` within 45 min of `trigger_tick` | C4 | **FAIL 3 of 24** vignettes (V-001 +95 min, V-002 +180, V-017 +144) |
| DV-11 | unit-count claims in shipped HTML/JS equal the data (467) | H10 | **FAIL 1**: `assets/HelpModal-CFV9T0zH.js` byte 2352 "tracking 445+ Union and Confederate units" |
| DV-12 | placement strength <= 110% of OOB strength and non-increasing between keyframes unless `reinforced:true` | C4 | **FAIL 219** (109 placements exceed OOB strength by >10%, e.g. `U-V-1-1@150` 2,220 vs 655; 110 unexplained rises, e.g. `U-I-1-1` 1,883 -> 3,865 at t12) |
| DV-13 | brigade casualties within max(25, 10%) of the sum of its regiments | H7 | **FAIL 26** brigades (warn-tier: unlisted regiments can legitimately explain some) |
| DV-14 | `casualty_percentage == casualties/strength` (0.15 pt) and `casualties <= strength` | - | pass (0) |
| DV-15 | disposition in `placement_schema.disposition_rendering_rules`; bearing 0..360; within 8 km of town | - | pass (0) |
| DV-16 | vignette schema complete (`trigger_tick`, lat/lng in bbox, `panel_summary`, `full_script`, `units_featured`), ids sequential V-001..V-024 | H7 | designed, not run |
| DV-17 | alias table closed and acyclic; no chains; no two canonical ids share a `designation` on one side | H7 (`alias for U-84NY`) | designed |
| DV-18 | ordinal designations parse to a natural-sort key (`10th` < `102nd`); sort test over all 467 | H5 | designed |
| DV-19 | monuments: 512 unique `no` 1..512, coordinates in bbox, no two within 3 m unless the same monument, `_note` field absent from shipped data | T-04 | designed (deployed `data/monuments.json` is a 9-item story-marker file; the 512 live inline in the bundle) |
| DV-20 | chronology sorted by tick; `significance` enum; `location` resolves to `terrain.json` key locations | D3 | designed |
| DV-21 | walkthrough stops: 16, distinct coordinates, distinct Street View parameters, heading 0..360 | H13 | designed |
| DV-22 | successions chain: `from_commander` equals the previous state's holder | H7 | designed |
| DV-23 | `data/counts.json` is generated from data; every numeral in shipped copy that names a counted thing equals it | H10 | designed (DV-11 is the first slice) |
| DV-24 | every curated record has `source_id` resolving in `sources.json`; every source has `{title, author, year, publisher/URL, license, accessed}` | (Historian, G-quality) | designed; prerequisite for the database expansion |
| DV-25 | `sources.json` URLs return 200/3xx weekly and have an archive link | (Historian) | designed (weekly, non-blocking) |
| DV-26 | army-level totals within 2% of the sum of corps; corps within 5% of the sum of divisions | H7 | designed |
| DV-27 | disposition transitions legal (`Bivouac` -> `Charging Line` only via `Line of March`/`Line of Battle`) | C4 | designed (warn) |
| DV-28 | every regiment with non-empty `days_engaged` has a placement on each engaged day (alias-aware) | C4 | designed; today 487 of 675 ticks have no placement record at all (188 covered), so coverage is by interpolation between sparse keyframes |
| DV-29 | build reproducibility: regenerated `dist/data/v2/*` hashes equal the committed manifest | N1 | designed |
| DV-30 | TM-V1..V15 (time model) all green with `--strict` | C3, C4 | wired from `app-time.md` 10.1 |

**Data-change protocol.** (1) A data PR runs DV-01..DV-30 `--strict`; (2) new/changed factual records need `source_id`; (3) changes to `time_anchors.json`, OOB counts, casualty numbers or vignette claims of `confidence: L|M` require an entry in `docs/qa/expert-review-log.md` (who, what, source, date); (4) `data(correction):` commits are listed in the public changelog; (5) automation cannot judge historical accuracy, so the gate is *consistency + provenance + review log*, not truth.

### 5.9 Static site lint (SL-01 .. SL-30), links, SEO, documents

Code: `tests/static/site-lint.mjs` (175 lines, dependency-free, < 2 s). Executed against `SRC_DIR`: **26 checks, 16 errors, 6 warnings**; against the case-mangled `DEPLOY_DIR` it additionally fails SL-01 with 8 broken references. Full output in Appendix C.

| ID | Assertion | Audit | Today |
|---|---|---|---|
| SL-01 | every local `src/href`, every `sw.js` URL and every chunk `import ... from "./x.js"` exists with **exact case** | N1, T-01 | pass on `SRC_DIR`; **FAIL 8** on `DEPLOY_DIR` |
| SL-02 | exactly one `<h1>` per indexable page | E3 | FAIL: `index.html` = 3 |
| SL-03 | `<main>` landmark on every indexable page | D2, A6, S1 | FAIL 11 of 23 pages (ar, camera, cinematic-export, compare, ground-remembers, immersive, index, privacy, sandbox, terms, viewshed) |
| SL-04 | `twitter:card` and `og:image` on every indexable page | T1, E2 | WARN: 12 pages lack `twitter:card`; privacy/terms lack `og:image` |
| SL-05 | unique `<title>` per page | T1 | pass |
| SL-06 | every indexable page is in `sitemap.xml` and every sitemap URL resolves to a file | E5, T3 | FAIL: privacy.html, terms.html missing (the sitemap has 21 `<loc>`: `/` + 20 tool pages) |
| SL-07 | canonical equals a sitemap `<loc>` | T3 | WARN: privacy, terms |
| SL-08 | manifest has no orientation lock | E1 | FAIL: `manifest.json:9` `"orientation": "landscape"` |
| SL-09 | every manifest icon/screenshot and every `og:image` exists **and decodes** (IHDR vs inflated IDAT size) | E2, NEW-OG | **FAIL 2**: `screenshots/day1.png`, `day3.png` undecodable |
| SL-10 | manifest screenshots are distinct files | NEW-OG | WARN: byte-identical |
| SL-11 | an enforcing `Content-Security-Policy` header exists | X3 | pass on the toml-text check only because `Content-Security-Policy` appears on the `/embed.html` rule; HP-01 (live) is the authoritative check and fails |
| SL-12 | `script-src` has no `'unsafe-inline'` | X3 | FAIL |
| SL-13 | CSP has `report-uri` or `report-to` | X3 | FAIL |
| SL-14 | `connect-src` contains the Netlify RUM host (or RUM is same-origin) | X3, P7 | FAIL: `ingesteer.services-prod.nsvcs.net` absent |
| SL-15 | embed rule does not try to blank `X-Frame-Options` | X4 | FAIL (`netlify.toml:83`) |
| SL-16 | redirect collapsing `/index.html` and `/*.html` | T3 | WARN: none |
| SL-17 | no dev/internal page in the publish dir | X4 | FAIL: `diagnostics.html`, `unit-rendering-reference.html` |
| SL-18 | every third-party origin used is named on `privacy.html` | X5 | FAIL: peerjs.com, cdn.jsdelivr.net, nps.gov not named |
| SL-19 | privacy discloses AR camera + device-motion permissions | X5 | FAIL |
| SL-20 | no dev-log/debug strings in shipped text | H7, C7, H10 | FAIL 5: `ar.html` "haven't been able to", `dashboard.html` "should be reconciled", `search.html` "Commander unrecorded", `viewshed.html` "Earlier drafts", `HelpModal` "445+" |
| SL-21 | no `controllerchange -> location.reload()` | C6 | FAIL (`index.html:258-268`) |
| SL-22 | `sw.js` does not hard-code hashed asset names | C6, DH-02 | FAIL (`sw.js:5-13`) |
| SL-23 | `sw.js` guards `cache.put` with `res.ok` | DH-03 | FAIL (`sw.js:45,65`) |
| SL-24 | number of inline `<script>` blocks per page (CSP readiness metric) | X3 | WARN: index 8, every other page 1 |
| SL-25 | one pinned mapbox-gl version across pages | pagesB-11 | pass (3.24.1 everywhere) |
| SL-26 | no hard-coded `pk.` Mapbox token literal in HTML | X1, T-08 | WARN: 9 pages |
| SL-27 | brand string identical across `<title>`, `og:title`, `twitter:title`, manifest `name`, JSON-LD `name`, footer, and equal to `docs/brand.json` (owner decides "Animated Battlefield Map" vs "Interactive Map") | E2 | designed |
| SL-28 | crawler text parity: `#seo-content` (or its successor `<main>`) text is a subset of what a user sees at 1440 and 375, and the no-JS fallback contains the same headline facts | E4 | designed (Playwright-assisted) |
| SL-29 | no synchronous `<script src>` and at most one blocking stylesheet in `<head>` outside an allowlist (render-blocking) | P4 | FAIL (designed from `index.html:279-280`: `site-nav.css` + sync `site-nav.js`; LH `render-blocking-insight` 0.5 mobile / 0 desktop is the executed evidence) |
| SL-30 | no `<link rel=preload as=style ... onload=...>` swap pattern and no `modulepreload` duplicate of the entry script | P5 | FAIL (designed from `index.html:55-58`) |

Companion probes: `tests/static/prod-probe.mjs` (15 header/redirect/version probes, executed: **10 of 15 fail**, Appendix C), `tests/static/asset-integrity.mjs` (AI-01..AI-03: exact case, immutability against the previous production manifest, SW precache resolves; executed on three scenarios), `tests/static/seo-probe.mjs` (designed: `/index.html` and `.html`/extensionless pair 301 to one canonical, sitemap == nav == files == canonical, JSON-LD parses and validates the `WebApplication` type, OG image decodes at 1200x630 and is unique per page-type, every URL in any historical sitemap 200s or 301s, internal link depth <= 3 from home, every tool page has >= 3 inbound internal links (T1), `robots.txt` has no accidental `Disallow: /`, 404 page returns 404 and is branded).

**Link checking:** lychee over the built site + sitemap nightly (`--accept 200,206,429`), external links **weekly** (NPS, Wikipedia, Google) to avoid flake, results as issues not failures; a custom Playwright crawler follows every same-origin link at 375 and 1440 and asserts 200 and no console error.

**Documents (G1), `DOC-01..07` (bytes-level checks measured now with a 20-line script; page-fill uses `pdftotext`):**

| ID | Assertion | Today (`user-guide.pdf`, 6 pages, 14,321 B) |
|---|---|---|
| DOC-01 | Info `/Title`, `/Author`, `/Subject` set and not `(anonymous)`/`(unspecified)` | **FAIL**: `/Title (\(anonymous\))`, `/Author (\(anonymous\))` |
| DOC-02 | `/Lang` present | **FAIL** (absent) |
| DOC-03 | tagged PDF: `/MarkInfo << /Marked true >>` and `/StructTreeRoot` | **FAIL** (both absent; ReportLab untagged) |
| DOC-04 | every page's text length >= 50% of the median page | **FAIL**: characters per page 1,577 / 503 / 2,034 / 270 / 1,695 / 916 (median 1,246): pages 2 and 4 under-filled |
| DOC-05 | no heading is the last text line of a page (orphaned "TOOLBAR TOOLS" p1) | designed (`pdftotext -layout` + heading list) |
| DOC-06 | footer carries `vX.Y.Z` and a date equal to `version.json` | designed |
| DOC-07 | guide claims equal app facts (`docs/claims.json`): 20 tools, 16 stops, 512 monuments, 8 Street View sites, Esc behaviour, "panoramas" wording | designed |

### 5.10 Security and privacy contract tests

| ID | Assertion | Audit | Notes |
|---|---|---|---|
| HP-01..03 | enforcing CSP present; reporting endpoint present; no `'unsafe-inline'` in `script-src` | X3 | executed live: all fail |
| HP-04/05 | HSTS with preload; nosniff, Referrer-Policy, Permissions-Policy | - | executed: pass |
| HP-06/07 | `/embed.html` has no XFO alongside `frame-ancestors`, and carries no site-wide report-only CSP | X4 | executed: fail (XFO DENY + `frame-ancestors *` + report-only) |
| HP-08..09 | `sw.js` no-store; main bundle `immutable` | C6, P2 | executed: pass |
| HP-10..12 | `/index.html` 301; alternate URL forms 301; sitemap includes privacy/terms | T3, E5 | executed: fail (200 for 8 of 8 sampled alternates) |
| HP-13 | scanner and dev paths do not answer 200 (`/.env`, `/.git/config`, `/wp-admin/install.php`, `/xmlrpc.php`, `/package.json`, `/diagnostics.html`, `/unit-rendering-reference.html`) | T2, X4 | executed: `/unit-rendering-reference.html` answers 200 |
| HP-14 | `user-guide.pdf` attachment + `application/pdf` | G1 | executed: pass (the audit's "inline" was wrong: `netlify.toml:204`) |
| HP-15 | `/version.json` exists and equals the deployed SHA | N1 | executed: fail (absent) |
| KEY-01 | a foreign `Referer` receives 403 from `api.mapbox.com` with the site's token (restriction active) | X1 | nightly `keys-and-security` job (curl); today unrestricted per audit |
| KEY-02 | Google Maps embed key: foreign-referrer request is refused; API restrictions list only the embed API | X2 | referrer part scriptable `(verify Google's response shape)`; API-restriction part is a quarterly manual console check (MAN-SEC-02) |
| EMB-01 | foreign-origin page iframes `/embed.html` successfully; iframing `/` is refused | X4 | Playwright, on the real preview |
| ORG-01 | set of third-party origins contacted across the **whole** e2e run is a subset of `docs/privacy-origins.json`, which equals the origins named on `privacy.html` | X5 | records `page.on('request')` hosts in every test; fails on any new host (Mapbox events, PeerJS broker `0.peerjs.com`, jsDelivr, Google Street View, NPS iframe, fonts) |
| ATTR-01 | Mapbox attribution control visible and not clipped on every map (main desktop, mobile map, walkthrough map, sub-page maps) | T-09 | Playwright `.mapboxgl-ctrl-attribution` visible with `OFFSCREEN` clean; mobile map has attribution disabled today (`bundle.pretty.js:102988`, per prov-recon T-09) |
| AUD-01 | no `AudioContext` created before a user gesture; sound default matches the documented policy; no `CanvasRenderer` reference (UG-01) | T-07 | Playwright `addInitScript` wraps `AudioContext` |
| DEP-01 | `pnpm audit --audit-level=high`, osv-scanner, gitleaks all clean; Renovate PRs green | - | T1 + weekly |
| OBS-01 | Mozilla Observatory grade >= A+ and securityheaders.com grade A+ | X3 | nightly `(verify CLI package/flags)`; only meaningful after CSP enforcement |

**CSP enforcement roll-out (test-driven, not a leap of faith).** (1) Add `report-uri /api/csp` (+ `Reporting-Endpoints`/`report-to`) to the *report-only* header now (today's soak is blind: `netlify.toml:19` has no endpoint). (2) In CI, run the whole e2e suite against a preview served with the **enforcing** candidate policy; the console gate already fails on any `securitypolicyviolation`, so violations are found deterministically, not by waiting for users. (3) Production gets `Content-Security-Policy-Report-Only` with the candidate for 14 days (RUM `csp` beacons + `/api/csp`); zero new signatures required. (4) Flip to enforcing; keep the report endpoint; `script-src` uses hashes/nonces for the inline blocks until the rebuild removes them (SL-24 metric -> 0). (5) `'unsafe-inline'` removal is the A+ end state; RUM host must be in `connect-src` or RUM must be same-origin (it is, with the plan's `/api/rum`, but Netlify's own RUM script still calls `ingesteer.services-prod.nsvcs.net`, so both stay listed while both run). The CSP tests are HP-01..03, SL-11..14, the console gate's CSP capture, and the RUM `csp` digest.

### 5.11 Service-worker and first-load suite (Test 4)

Contract the new `sw.js` must satisfy (each line is a test in `service-worker.spec.ts`, sketch in Appendix A.4): (1) `const VERSION` token injected at build and precache list generated at build (no hand-typed hashed names, SL-22); (2) installs without `skipWaiting`; a waiting worker is activated only on a `SKIP_WAITING` message from an explicit user action (an `aria-live` "new version" prompt with a "Reload to update" button); (3) no `clients.claim()`-triggered `location.reload()`; (4) never caches non-OK responses (DH-03); (5) deletes old `gbg-*` caches on activation (migration from the legacy worker, T-14); (6) offline: returning visitor gets the shell and a notice; (7) `sw.js` served `no-store`; (8) navigation preload for HTML; (9) stale-while-revalidate only for immutable hashed assets, network-first with timeout for `/version.json` and `/flags.json`.

| Test | Assertion | Audit |
|---|---|---|
| first visit | exactly one main-frame document request within 6 s after the SW is ready | C6 |
| warm visit | 0 `/data` or `/assets` requests bypass the SW; LCP < 1.2 s | P3 |
| update flow | deploying v2 shows the prompt, does **not** navigate for 3 s, navigates exactly once after consent | C6, T-14 |
| poisoning | a 503 for a hashed asset is absent from Cache Storage | DH-03 |
| migration | pre-register the legacy `sw.js` (route fixture), then serve the new worker: old caches deleted, no reload loop, exactly one navigation | T-14 |
| offline | offline reload shows shell + notice | reliability |
| headers | `sw.js` no-store, JavaScript MIME | HP-08 |
| bfcache | back-navigation from a sub-page restores the map without reload (`pageshow.persisted === true`); no `unload` handlers | T-29 |

### 5.12 Console, error and request gate (Test 5)

`tests/fixtures/base.ts` (Appendix A.5) attaches to **every** test: `console.error`/`warning`, `pageerror`, `requestfailed`, same-origin responses >= 400, and `securitypolicyviolation` events captured via an init script. The allowlist `tests/console-allowlist.json` has entries `{kind, match, reason, audit, until}`; expired entries fail the run. Because Lighthouse's `errors-in-console` passed while C5 existed, coverage comes from *driving* the product: (a) `ancestor.spec` (the exact C5 path), (b) "click every control once" in each state, (c) select every one of the 467 regiments, (d) `subpages.spec` on 20 pages, (e) the static free-variable gate `UG-01` (`undef-globals.mjs`, executed on the deployed bundle: reports **exactly** `CanvasRenderer` (`bundle.pretty.js:96556`), `setGoldUnit` (`:101086`, `:101229`), `clearGoldTrail` (`:101086`, `:101229`), `drawGoldTrailSegment` (`:101101`) after allowlisting browser-only globals such as `Path2D`, `WheelEvent`, `caches`, `MSApp`, `WorkerGlobalScope`). Runtime `no-debug-text` scans rendered `body.innerText` on data-driven pages for `undefined`, `NaN`, `[object ...]`, snake_case keys and known dev-log phrases (C7, H7); this is the runtime complement to SL-20 (SL cannot see `undefined` rendered after `fetch`).

### 5.13 Time-model suites

The time work (`app-time.md`) defines the model and the validator specification V1-V15; this plan wires them into gates and adds the browser-level proof.

| Gate | Assertion | Audit | Tier |
|---|---|---|---|
| `TM-V1..V15` | as in `app-time.md` 10.1 (anchors schema, tab ranges, text-time consistency, duration claims, event-registry agreement +-2 ticks, kinematics, link params, lint bans, day/night, golden, monotone inverse, record counts, coverage, permalink fixtures) `--strict` | C3, C4 | T1 |
| `TM-V9` lint bans | the regexes in `app-time.md` 10.1 V9 over source, pages and copy: a `July` template with a `+`/`-` day offset (3 hits today: `bundle.pretty.js:97428`, `:100842`, `:101006`), tick times five, `5*60`/`6*60`/`4*60`, `toLocale*String`, and "real time", "five-minute", "minute-by-minute" in copy | C3, C4, H9 | T1 |
| `one-clock.spec` (Test 3) | at ticks {1,12,17,28,226,267,302,451,538,553,675}: exactly one clock string and one "July N" on screen (HUD, story panel, event card, mobile header), equal to the golden `tests/golden/tick-clock.csv` and to `__gtbg.state()`; never "July 4/5" | C3, C4 | T2 + nightly |
| `subpage-clocks.spec` | Compare, Living Ledger, Camera, Immersive, Documentary, Education, Turning Points, Sandbox show the same clock at tick 538 as the module | C4 | nightly |
| `sandbox-labels.spec` | scenario labels equal `TimeModel.label(tick)` ("mid-afternoon (tick 260)" must not survive) | C4 | T2 |
| `seek-safety.spec` | play to 500, seek to 20: no unit drawn from a future keyframe | P-22 | T2 |
| `event-crossing.spec` | at 16x with an artificially slow frame every HIGH/CRITICAL event card shows at least once | C4 | nightly |
| overlay snapshots | day/night tint at ticks 100 (dusk), 150 (night), 326 (dusk), 451 (first light), 538 (day) | C4 | visual |
| golden diff | any change to `time_anchors.json` regenerates `tick-clock.csv` in the same PR (V11); reviewers see the 675-row diff | C4 | T1 |

### 5.14 "Ask the Historian" evaluation harness (the QA half of the database expansion)

The architecture, sources and licensing are other specialists' deliverables. Whatever they choose (static keyword index, hybrid, semantic, optional LLM), it must ship with this harness, because today's implementation has no way to know it is wrong: `historian.html:154-167` `score()` counts a hit when `t.includes(w)` (substring, so "war" matches "toward"), which explains why "why did Lee lose the war" surfaced "Archer Captured" (H8), and `historian.html:172` builds messages with `div.innerHTML = html + ...`, which becomes an injection path the moment corpora include third-party text.

| ID | Gate | Threshold | Tier |
|---|---|---|---|
| HC-01 | corpus schema: every passage `{id, text, source_id, span, date, side?, unit_ids[], location?, license, lang}`; text normalised; length 40-1,200 chars (chunking rule) | 0 violations | T1 (pipeline) |
| HC-02 | provenance: every passage's `source_id` resolves in `sources.json`; every source has license + attribution string + URL/archive link; license allowlist (public domain, CC0, CC-BY, CC-BY-SA with share-alike handled, site-authored); anything else blocks the build | 0 | T1 |
| HC-03 | duplicates: exact and near-duplicate (simhash/minhash) passages across sources flagged; near-dup rate <= 2% | <= 2% | T1 |
| HC-04 | entity linking: `unit_ids` in passages resolve (DV-03/17 alias-aware); >= 90% of OOB regiments have >= 1 passage after expansion (coverage KPI) | >= 90% | T1 (KPI, then gate) |
| HC-05 | PII/sensitive scan: no living-person data; no modern-contact strings | 0 | T1 |
| HC-06 | **retrieval eval**: golden set `pipeline/historian/eval/golden.jsonl` of >= 200 questions across unit facts, commander facts, timeline, place, "why/how" questions, comparisons, alias/misspelling ("14th Brooklyn" vs `U-84NY`), date phrasing ("day two", "July 2nd"), *unanswerable* and *out-of-scope* questions; each answerable item lists acceptable passage ids | recall@5 >= 0.90, MRR >= 0.70, no metric drops > 2 points vs main | T1 on any corpus/index/ranking change (deterministic, <= 60 s) |
| HC-07 | **abstention**: unanswerable/out-of-scope questions must return "not covered" with suggestions, never a low-relevance passage; includes the regression "why did Lee lose the war" top-1 != "Archer Captured" | abstain precision >= 0.95, recall >= 0.90 | T1 |
| HC-08 | **grounding**: every number, date, unit name and proper noun in a generated/composed answer occurs in the cited passages (alias-aware); every citation id exists and its span supports the sentence (string containment for static synthesis; entailment check for LLM mode) | 100% cited; 0 ungrounded numbers | T1 (static mode), nightly (LLM mode) |
| HC-09 | **injection/XSS**: a hostile passage (`<img src=x onerror=...>`, `javascript:` links, prompt-injection text like "ignore previous instructions") renders inert; output goes through `textContent`/a sanitizer, never `innerHTML` with raw data | 0 executions; Playwright asserts no dialog/`pageerror` | T1 + T2 |
| HC-10 | tokenization: word-boundary matching, stemming/alias table; unit test that "war" does not match "toward" | pass | T1 |
| HC-11 | performance: cold first query <= 1.5 s on the mobile Lighthouse profile; retrieval p95 <= 150 ms; shipped index for the tier <= its byte budget (budget set by the architecture ADR; lazy-loaded, immutable, hashed, never on the LCP path) | budgets | T2 |
| HC-12 | UI: last message never hidden behind the input bar (`OVERLAP` on `historian.html` at 320-430); Esc/keyboard; `aria-live` for new answers; sources list visible with licence text; data version shown | layout-audit + a11y | T2 |
| HC-13 | copy/claims: the page's self-description matches the implementation (`docs/claims.json`: "keyword search" vs "AI-style"; if an LLM is used, the disclosure and privacy text must name the provider and what is sent) | claims test | T1 |
| HC-14 | LLM mode only: pinned model id, temperature 0, fixed prompt hash, rubric-judged answer quality on the golden set (nightly, non-blocking) with a *hard* gate on HC-08/HC-09 | no regression > 2 points | nightly |
| HC-15 | answer freshness: answers cite `data` CalVer; re-running HC-06 on the previous release's index is part of the release checklist so a corpus change cannot silently degrade answers | - | release |

### 5.15 Cross-browser and real-device program

| Target | Why it matters here | Automated coverage | Real-device need | Options |
|---|---|---|---|---|
| Chrome/Edge desktop | 90%+ of users | Playwright Chromium, full matrix | none | - |
| Firefox desktop | different WebGL/CSS/scroll behaviour | Playwright Firefox, desktop rows, PR smoke + nightly | rarely | - |
| Safari macOS | WebKit engine differences (color, `dvh`, audio unlock) | Playwright WebKit (engine) | occasional (RC) | own Mac or hosted |
| **Safari iOS / iPadOS** | fixed-position + visual-viewport + safe-area behaviour (mobile transport bar, bottom sheets), WebGL context loss under memory pressure, autoplay/audio unlock, ITP storage eviction (7-day script-writable storage cap affects `localStorage` layout choice and SW caches), no `beforeinstallprompt`, bfcache | Playwright WebKit with iPhone descriptors is **not** iOS Safari (engine only; documented limitation) | **required for every minor/major RC** | owner's iPhone; BrowserStack Live/App Live, LambdaTest, Sauce, AWS Device Farm `(verify pricing and availability; not confirmed this session)` |
| **Samsung Internet** | Chromium-based but with its own "dark mode" forcing/inversion option, different default zoom and address-bar behaviour | Chromium rows approximate the engine | required per major RC (10 min) | real Galaxy device or hosted device cloud |
| **Low-end Android** (2-3 GB RAM, Mali GPU, e.g. Moto G / Galaxy A class) | the RUM Poor bucket is probably these devices: memory, WebGL, main-thread time | CPU x6/RTT 300 Lighthouse profile + heap/long-task assertions | required for every performance-affecting release; run Lighthouse on-device via USB (`adb forward tcp:9222 localabstract:chrome_devtools_remote`, then `lighthouse --port=9222`) | one cheap physical phone (recommended, one-off cost) |
| iPad (768/1024) | layout-chooser boundary (H3), pointer + touch hybrid | rows `w768-*`, `w1024-p` | per RC | owner's iPad or hosted |
| Foldables (280-344 CSS px cover screens) | below the 320 px reflow floor | optional `w280` nightly row (informational) | none | - |
| Windows High Contrast / forced colors | app is dark-only with canvas UI | `forcedColors: active` variant of the a11y matrix | manual AT program | - |
| In-app browsers (Facebook/Instagram/Reddit WebView) | referral traffic lands there; WebGL/storage limits | none automated | spot check per major | own phone |

**Recommended, low-cost path for a solo owner:** (1) the owner's own iPhone and Android phone are the default real-device set; buy or borrow **one low-end Android** and keep it for release-candidate runs; (2) use a hosted device cloud for a one-month trial around cut-over rather than a standing subscription; (3) everything else stays automated. **RC checklist** (`docs/qa/rc-device-checklist.md`, 15 minutes per device): fresh visit; first-run flow; play 60 s; rotate; open every tool-sheet row; day jump; search + select a unit; Follow-Your-Ancestor; walkthrough stop 1 and 8; Help; AR page permission prompts (camera, geolocation, motion) and denial paths; Watch Together join from a second device; background/foreground the tab (Safari kills WebGL); airplane-mode reload; add to home screen; text size 200%; check Mapbox attribution visible; note any console errors via remote inspector (Safari Web Inspector / `chrome://inspect`).

### 5.16 Claims registry and manual programs

**Claims registry (`docs/claims.json`).** Every factual UX/marketing/help/guide claim that can be wrong is an entry `{id, text, where[], test}`: "467 regiments and batteries", "675 five-minute snapshots", "1x = N sim-minutes per second", "Esc closes any panel", "Street View panoramas", "20 tools", "16 stops / 512 monuments / 8 sites", "works offline", "no cookies", "embed widget", "What They Could See" (viewshed), "Ask the Historian" implementation type. Shipped copy marks claims with `data-claim="<id>"`; a lint fails when a `data-claim` id has no registry entry or a registry entry's test is not green. This is how H8 ("overpromising names"), H10, H13 and G1 stay fixed.

| Program | Cadence | Evidence (`docs/qa/`) | Exit criteria |
|---|---|---|---|
| Assistive technology | each minor/major RC, quarterly otherwise | `at-test-log.md` | 15/15 core tasks (`app-a11y.md` 9.3) on the matrix, no workaround |
| Usability session | cut-over RC and yearly | `usability-log.md` | 5 participants (>= 2 phone-first, >= 1 educator), 8 tasks, task success >= 90%, SUS >= 85, no critical finding open |
| Expert / historian review | any data release touching anchors, OOB counts, casualty numbers, vignette claims | `expert-review-log.md` | two reviewers (an NPS/licensed battlefield guide-class historian plus an independent scholar), every claim with `confidence` L or M resolved or labelled |
| Copy voice review | each release | PR checklist | no dev-log strings (SL-20 + runtime), museum-grade tone, claims registry green |
| Rollback drill | every 90 days | `runbooks/rollback.md` | L0-L3 executed on staging, times recorded |

### 5.17 Flake management and test health

- One retry in CI (`retries: 1`). A test that passes on retry is reported `flaky`, and `tools/flake-report.mjs` opens/updates an issue labelled `flaky` with the title; two flaky reports in 7 days quarantine it.
- Quarantine = `test.fixme()` + issue link + expiry (14 days); expired quarantines fail the build (same mechanism as the other registries).
- Determinism checklist enforced in `fixtures/base.ts`: map stubbed, RUM/analytics blocked, fonts local, fake clock for animation, seeded `Math.random`, no `waitForTimeout` except in the two SW tests that must wait for a *negative* (a reload that must not happen).
- Test-time budget per tier is a gate: CI fails if T1 > 8 min or T2 > 35 min (headroom over the 6/30 targets) so slowness is fixed rather than tolerated.
- Sharding: `--shard=i/n` with `fullyParallel`; artifacts retained 14 days; traces only on failure.
- Ownership: every spec file has a `CODEOWNERS` line and a header comment naming the audit ids it guards, so deleting a test requires deleting its claim in the traceability matrix (a CI script diffs `@audit:` tags against `docs/traceability.json`).

## 6. Parity harness and cut-over safety net (live vs new build)

`prov-recon.md` 6.6 specifies the harness; this section is the implementable QA design: what is compared, how a difference is judged, and the numeric go/no-go.

### 6.1 Principle

The legacy bundle is *executable specification* for everything that is not a known defect. The rebuild must reproduce it except where an entry in the **intended-diff registry** says otherwise. So the harness answers exactly one question: "is every observable difference between `/classic/` (frozen legacy bytes, correct-case names) and `/next/` (or the preview) explained by an audit finding?"

### 6.2 Three comparison tiers

| Tier | Compared | Method | Strictness |
|---|---|---|---|
| **T1 data** | unit id, lat, lng, bearing, strength, disposition at every recorded keyframe for all 675 ticks; loader output counts (712 raw OOB records, 705 keys, 694 + 1,110 placements, 188 ticks, 478 unit ids); commander-succession lookups; search results for a fixed query list | goldens generated from the **legacy pure functions** (`legacy/spec/*.js`: `y1`, `F4`, easing, `iF`, `zp`, `Hk`, `vF`) with a fresh accumulator and forward traversal; new build exposes `__gtbg.unitsAt(t)` | exact (1e-6 deg), no registry escape except `P-22` ghost-unit fixes |
| **T2 DOM/text/geometry** | every visible text line, accessible names, control geometry (x, y, w, h) per checkpoint (`parity.spec.ts` `snapshot()`) | Playwright on both builds with Mapbox stubbed, fresh page each, fake clock | exact modulo registry; legacy has no ARIA, so T2 compares text + structure; the new build must *additionally* pass axe |
| **T3 visual** | chrome only (toolbar, panels, sheets); map masked | SSIM >= 0.98 per region; advisory for the unit layer | tolerance |

Non-parity gates in the same run: JSON requests before first interaction (legacy 30-38), console warnings/errors (new must be a **strict subset** of legacy), Lighthouse budgets, JS budget, Map instance count.

### 6.3 Determinism rules (T-12: the legacy renderer is history dependent)

Every checkpoint starts from a fresh page load and a scripted, identical navigation; Mapbox style/sprite/glyph/tiles fulfilled from local fixtures; `events.mapbox.com` and the RUM host blocked; fake clock; `Math.random` seeded; fonts local. Observable state on legacy has no globals, so the driver reads the "Tick N/675" HUD text (`bundle.pretty.js` ~112202), unit-panel text, toolbar labels, panel presence by heading, `localStorage`, the request log and the console log.

### 6.4 The intended-diff registry (`docs/parity/intended-diffs.json`)

```json
{ "id": "ID-C3-date", "audit": ["C3"], "checkpoint": "tick-*", "path": "text.*",
  "next": "July 3, 1863", "rationale": "+2 day offset removed (bundle.pretty.js:97428)", "expires": "2026-12-31" }
```

Rules (implemented and unit-tested in `tests/parity/intended-diffs.mjs`, 4 tests): a diff is accepted only if an **unexpired** entry matches its checkpoint glob and path glob, and, when the entry pins `next`, the new value equals it (so a *different* wrong date is a regression, not an intended diff); expired entries stop excusing; entries that match nothing are **stale** and fail `--strict` runs (the difference vanished or the entry is wrong). Seed entries (from `prov-recon.md` 6.6): C3, C4 (clock/date), C1, C2 (mobile shell), C5, H2, H3, H4, H5, H9, H10, H11, H12, D3, "ghost units" P-22; each entry carries the audit id and an expiry no later than the cut-over date + 30 days.

### 6.5 Checkpoints (minimum; `tests/parity/checkpoints.json`)

First visit at 1440x900 and 375x812 through splash, chooser and each onboarding branch; returning visit; ticks 1, 12, 17, 28, 53, 226, 267, 302, 451, 538, 548, 551, 675; day buttons and +/-1 h; speeds; Space, arrows, shift-arrows, 1-3, +, -, 0, f, s, l, m, b, ? and Esc inside and outside an input; search "20th Maine" and "Longstreet"; filter toggles; roster; OOB; legend tabs; minimap click; `?ancestor=U-20ME`; distance tool two clicks; layer toggles; locations; bookmarks add/share/reload; help tabs; walkthrough stops 1, 5, 16 and monument filter; NPS tour stop 5; Soldier's Eye; every sub-page deep link (P-62); viewports 320, 375, 390, 768, 1024, 1440, 2560 and landscape 812x375; `prefers-reduced-motion`; offline reload; no-JS; console-error diff. QA additions: storage migration (`storageState` seeded with legacy `gtbg_prefs`, `gettysburg_bookmarks`), old-SW -> new-SW upgrade, `pageshow.persisted` back-navigation from every sub-page, the 20 static pages' text parity (see 6.7).

### 6.6 Go / no-go criteria for cut-over (`/` serves the new build)

All must hold for the candidate SHA for **7 consecutive nightly runs**, then a final run on the release commit:

| # | Criterion | Threshold |
|---|---|---|
| 1 | unexplained diffs (T1, T2) | 0 |
| 2 | stale or expired registry entries | 0 |
| 3 | T1 goldens over 675 ticks | exact |
| 4 | new-build console errors/warnings vs legacy | strict subset (and 0 on the new build's own gate) |
| 5 | scorecard | every category A+ on desktop and mobile (section 9) |
| 6 | Lighthouse (median of 5) mobile and desktop | performance >= 0.90 as the *cut-over floor* (0.95 is the A+ target reached before the 28-day RUM window) with LCP <= 2.5 s, TBT <= 200 ms, CLS <= 0.1 |
| 7 | `interaction` profile INP (CPU x4) | <= 200 ms |
| 8 | real devices: iOS Safari, Android Chrome, one low-end Android | RC checklist passed |
| 9 | assistive tech log | <= 90 days old, 15/15 tasks |
| 10 | rollback drill | L0-L3 executed within 90 days; L1 timed < 1 min |
| 11 | opt-in beta period | >= 14 days with >= 100 sessions on `/next/`, RUM p75 green on the beta cohort, zero new error signatures |
| 12 | freeze window | not within 4.8 windows |

After cut-over: `/classic/` (noindex, `no-cache`) stays for 60 days; RUM p75 for LCP/INP/CLS/FCP/TTFB must be green on a 7-day window within 14 days and on a 28-day window within 45 days, else L1 rollback is the default decision (the owner may override in writing in the changelog).

### 6.7 Static-page and URL parity (20 tool pages + legal + 404 + embed)

For every URL in the legacy sitemap and every URL ever listed in a historical sitemap: same or better status (200, or 301 to the canonical), same canonical, same title/description, same `og:*`, headings preserved or improved; body text diffed per page with a threshold (>= 90% of legacy words retained unless the page has an intended-diff entry, e.g. removal of dev-log copy H7); every internal link resolves; bookmarks/deep-link vocabularies (`tick`, `unit`, `vignette`, `t`, `u`, `z`, `ll`, `ancestor`) parse to the same state on both builds (the legacy ignores most, so the requirement is one-directional: new supports all).

### 6.8 Gating the bridge patches (interim fixes to the frozen bundle, `prov-recon.md` 6.10)

Until cut-over, C5/C1/C3/C6-class fixes may be applied to the minified bundle by a patch runner. The QA gate for **each patch run**: (1) `UG-01` free-variable scan passes (this proves the C5 patch and that no new undefined identifier appeared); (2) every replacement asserted at exactly one occurrence, runner refuses a second run; (3) output renamed by content hash and `asset-integrity` passes (same name never carries different bytes: T-02); (4) `sw.js` precache and lazy-chunk imports rewritten and SL-01/SL-22 pass; (5) the parity subset (`first-run`, tick 1/538, mobile shell, ancestor) runs with the patch's intended-diff entries; (6) `patch-report.json` (before/after hashes, occurrence counts) committed. This is the difference between "regex patch on a 2.28 MB file" and a controlled, reversible change.

## 7. Production monitoring: RUM, errors, CSP, synthetic checks

### 7.1 Why a first-party RUM beacon in addition to Netlify RUM

Netlify RUM (PDF, 30 days, "All Devices") gives min/avg/p75/p95/p99/max charts and a Good/Needs-work/Poor badge per metric, but: no alerting in the exported UI; no attribution (which element was the LCP, which interaction was slow, which shift); no split by layout/device class/first-visit/SW-controlled; no deploy attribution (whether the grey deploy bands are labelled is open, `deploy-history.md` 12); the CLS badge ("Poor, p75 > 0.25") does not match the plotted p75 line (audit 6); and outlier spikes (FCP/LCP ~27 s, INP ~2 min on Sep 7-8, 18, 26) are unexplained. The first-party beacon answers those questions. Netlify RUM stays on as an independent cross-check; the two are reconciled monthly (they should agree within ~15% on p75 per metric).

### 7.2 Client (`rum/web-vitals-beacon.js`, Appendix A.10; the evaluator is executed and unit-tested)

- `web-vitals` v5 **attribution** build: `onLCP`, `onINP`, `onCLS`, `onFCP`, `onTTFB`; queue flushed once per metric on `visibilitychange:hidden`/`pagehide` via `navigator.sendBeacon` (text/plain body to avoid a CORS preflight), `fetch(..., {keepalive:true})` fallback.
- Payload (<= 4 KB): `build`, normalised `page` (`/dashboard` and `/dashboard.html` are one group), `layout` (`data-layout`), bucketed viewport width and DPR (no fingerprinting), `deviceMemory`, capped `hardwareConcurrency`, `effectiveType`, `sw` (SW-controlled = warm visit), `bot` heuristic (`navigator.webdriver`, HeadlessChrome/Lighthouse/Prerender UA), and per-metric attribution: LCP `{element selector, URL path, ttfb, resourceLoadDelay, resourceLoadDuration, elementRenderDelay}`, INP `{interactionTarget, interactionType, inputDelay, processingDuration, presentationDelay, loadState}`, CLS `{largestShiftTarget, loadState}` `(verify field names against the installed web-vitals types)`.
- **Privacy:** same-origin endpoint (`/api/rum`, so CSP `connect-src 'self'` covers it), no cookie, no user/session id, no IP or UA stored, `Sec-GPC`/`globalPrivacyControl` and `doNotTrack` honoured (no beacon at all). `privacy.html` must be updated in the same PR (it currently names only Netlify RUM) and SL-18/ORG-01 enforce that the disclosure matches the network reality. Country comes from Netlify's request geolocation in the function and is used only as a segmentation and bot-triage dimension (`context.geo`), never stored with anything identifying `(verify the Functions v2 context fields)`.
- Loaded as a deferred module after first paint (`requestIdleCallback`), budget <= 3 KB br `(measure with size-limit)`; disabled under `?test=1`.

### 7.3 Collector and storage (`netlify/functions/rum.mjs`, Appendix A.10)

Netlify Function on `/api/rum` (`config.path`; `(verify v2 function signature and path config)`): schema gate (known metric names, finite numbers, <= 4 KB), append-only writes to a Netlify Blobs store `rum` with key `<yyyy-mm-dd>/<uuid>` (Blobs has no atomic increment, so no read-modify-write), a scheduled function compacts each day into `agg/<day>.json` histograms and prunes raw events after 90 days. Volume at today's traffic (~110 page views/day x ~5 metrics) is a few hundred small objects per day; compute cost is negligible against the 300-credit free allowance or the Pro plan (functions 10 credits per GB-hour, requests 2 credits per 10,000 per the Netlify credit table). A `csp-report` function accepts `application/csp-report`/`application/reports+json` at `/api/csp` and stores signatures the same way.

### 7.4 Thresholds and alert rules (`rum/evaluate.mjs`, 6 tests pass)

| Metric | Good <= | Poor > | Alert: page | Alert: warn | Alert: regress |
|---|---|---|---|---|---|
| LCP | 2,500 ms | 4,000 ms | 7-day p75 Poor on two consecutive daily evaluations | Needs-improvement or worse for 3 consecutive days | 7-day p75 worse by >= 15% than the previous window **and** above 90% of the Good ceiling |
| INP | 200 ms | 500 ms | same | same | same |
| CLS | 0.10 | 0.25 | same | same | same |
| FCP | 1,800 ms | 3,000 ms | same | same | same |
| TTFB | 800 ms | 1,800 ms | same | same | same |
| FID (legacy metric, informational) | 100 ms | 300 ms | - | - | - |

Population rules: humans only (`bot:false`); evaluation windows of 7 days; **minimum 100 samples per (metric, layout, page group)**, otherwise the state is `insufficient` and no alert is raised (a daily p75 from 20-40 samples is noise at ~110 views/day, and the mobile share of traffic is not in the exported PDFs, so the first two weeks of beacons establish it); p95/p99 are recorded but never alert (the Netlify spikes look like backgrounded tabs, which `web-vitals` already excludes by only reporting for visible pages). Error signatures: any JS error signature first seen on a build, or > 0.5% of sessions, pages immediately (the C5 `ReferenceError` would have paged within the first session that clicked the ancestor picker). CSP: any new violation signature after enforcement pages; before enforcement it is a digest item.

### 7.5 Dimensions and reports

Every sample carries `build`, so "did this deploy move p75?" is a group-by, and the release checklist includes the previous vs current 7-day p75 table. Weekly digest (issue or email): p75/n per metric x layout, top 5 LCP elements and top 5 INP targets by attribution, error signatures, CSP signatures, bot share, mobile share, SW-controlled share. Bot triage: the audit found ~18% of views from China/Singapore/Hong Kong/Germany, likely datacenter traffic; country is a *triage* dimension (compare p75 with and without) rather than an exclusion rule, because excluding by country would also drop real visitors.

### 7.6 Synthetic monitors (`SYN-01 .. SYN-08`, `prod-monitor.yml`)

Traffic hygiene: production synthetic runs must not distort ~110 views/day. Curl-class probes cost no browser page views; browser runs happen **4 times a day**, block the Netlify RUM host, send `X-GTBG-Synthetic: 1` and a distinctive User-Agent for log filtering (`(verify whether Netlify Analytics can exclude by header/UA; unverified)`), and post-deploy smoke runs against the deploy's unique permalink URL where possible.

| ID | Check | Frequency | Alert |
|---|---|---|---|
| SYN-01 | `prod-probe.mjs` (15+ header/redirect/cache/version probes) | 6 h + post-deploy | issue on any failure |
| SYN-02 | browser smoke at 375x812 and 1440x900: exactly one document request, LCP element painted, play 10 s, open Tools/Help/Search, console-zero | 6 h + post-deploy | issue |
| SYN-03 | `/version.json` SHA equals the last promoted SHA | post-deploy | rollback runbook |
| SYN-04 | every sitemap URL 200 and canonical | nightly | issue |
| SYN-05 | daily page-view snapshot (Netlify Analytics export if available, else RUM count) to build a seasonal baseline (anniversary week) | daily | informational |
| SYN-06 | TLS certificate, HSTS preload status, domain expiry (>= 30 days) | daily | issue |
| SYN-07 | Mapbox: foreign-Referer probe (KEY-01), usage vs plan (70% alert) `(verify Mapbox statistics access)` | nightly | issue |
| SYN-08 | data manifest: every `/data/v2/*` hash resolves and matches `manifest.json` | post-deploy | rollback L3 |

### 7.7 SLOs (what "green in production" means)

| SLO | Target | Window |
|---|---|---|
| LCP, INP, CLS, FCP, TTFB p75 (humans, per layout, n >= 200) | Good | 28 days rolling |
| Sessions with an uncaught JS error | <= 0.1% | 28 days |
| Synthetic availability (SYN-01/02) | >= 99.9% | 28 days |
| Time to detect a broken deploy | <= 15 min (T4 smoke) | per deploy |
| Time to roll back (L1) | <= 5 min from detection | per incident |

The 28-day RUM window is the *release* criterion for A+ in Performance (section 9); the lab gates are the *merge* criteria.

### 7.8 Alert routing

Severity `page` -> GitHub issue labelled `prod-incident` **plus** a push notification (ntfy.sh topic with an unguessable name, or Pushover; free tiers `(verify)`); `warn`/`regress` -> issue only; weekly digest -> email/issue. Single on-call = owner; quiet hours 22:00-07:00 ET suppress pushes for `warn` only. Every alert body links the runbook (`docs/qa/runbooks/incident.md`) with the first three diagnostic steps (check `build` split, check top LCP element, check whether a bridge patch or data release shipped).

## 8. Definition of Done

### 8.1 Pull-request level (the PR template renders this as a checklist; CI verifies what it can)

- [ ] Linked audit id(s) or issue (`Refs: C1,C2` footer or `audit:` label); `fix:` PRs without one fail a CI check.
- [ ] **Red-first proof** for bug fixes: link to the failing CI run of the new/changed test before the fix (or the `known-failures.json` entry being removed in this PR).
- [ ] T1 and T2 green; no new entries in `known-failures.json`, `overlap-allowlist.json`, `console-allowlist.json` or `intended-diffs.json` without `audit`, `reason`, `until` (CI counts entries; the count may only fall).
- [ ] Budgets unchanged or tightened (`perf/budgets.json`, `.size-limit.json`, allowlist counts); a raise needs the `budget-raise` label + ADR.
- [ ] UI change: screenshots at 375 and 1440, visual diff reviewed, tested at 320, 768 and landscape 812x375, keyboard-only pass noted, reduced-motion and forced-colors noted.
- [ ] New/changed user-facing text passes copy lint and the claims registry (`data-claim` ids).
- [ ] Data change: DV-01..30 `--strict` green, `source_id` on new facts, review-log entry if `confidence` is L/M, changelog `data(...)` line.
- [ ] New third-party origin or permission: `docs/privacy-origins.json`, `privacy.html`, CSP and ORG-01 updated in the same PR.
- [ ] Changelog line (`feat|fix|data|perf|docs`), and `version.json` bump if releasable.
- [ ] Docs: ADR for any decision (tool choice, budget change, architecture), runbook if operations change.

### 8.2 Feature level (a feature or panel is not done until all hold)

- Present in the **state catalogue** with default, loading, empty, error and offline variants; passes axe, layout-audit and console gate at all 24 viewports; keyboard-complete and screen-reader-labelled (`getByRole`-testable); works in both layouts or is explicitly desktop-only with a mobile equivalent.
- Has a function spec (section 5.3) and, if it renders data, a DV check; has RUM attribution (named element) and a claims-registry entry for every promise the UI makes.
- Help, user guide and public changelog updated; Help content is generated from the registry (shortcuts, counts).
- Real-device pass on iOS Safari and Android Chrome recorded in the RC checklist before it ships in a minor release.

### 8.3 Release level (promotion gate, section 4.4) and "A+ done"

A minor release: all "must" gates green, no category regressed, RC checklist attached, changelog + version bumped. **"A+ done" for the programme:** every category A+ on desktop **and** mobile on the scorecard in two consecutive weekly runs, 28-day RUM p75 green for LCP/INP/CLS/FCP/TTFB per layout (n >= 200), error-session rate <= 0.1%, assistive-technology log <= 90 days old (15/15), expert review log current for the shipped data version, rollback drill <= 90 days, and all known-failures/allowlist registries empty (or only third-party-licence exceptions with reasons).

---

## 9. The A+ scorecard (category x device class)

### 9.1 Mechanism

`tools/scorecard.mjs` (50 lines, 4 unit tests pass) reads `tools/gates.json` (catalogue: `{gateId: {cat, sev: must|should, device: both|mobile|desktop}}`) and every `reports/gates/*.json`. Rules: a catalogued gate with **no result counts as failed**; results for uncatalogued gates are an error (nobody can add an unowned gate); a category with fewer than **6 gates** can never exceed A- ("thin category = unmeasured"). Ladder: **A+** all must + >= 97% should; **A** all must + >= 90%; **A-** all must + >= 80%; **B** >= 90% of must; **C** >= 80%; **D** >= 60%; **F** otherwise. Exit code 0 only if every category is A+ on both device classes, so the same command is the CI gate, the PR-comment generator and the weekly report. The letters are deliberately stricter than the audit's subjective grades (one failed *must* gate caps a category at B).

### 9.2 Pass criteria per category and device class

`M` = must gate, `S` = should gate. Test ids refer to sections 5-7 and the matrix in section 10. "Both" means the same gate runs in desktop and mobile projects and is graded per device class.

| Category (audit row) | Desktop A+ criteria | Mobile A+ criteria | Manual / external gate |
|---|---|---|---|
| **Concept, ambition, content depth** | M: HC-01..HC-09, claims registry green, every one of the 467 units reachable with commander/strength/casualties (DV-05, unit-panel loop), every source cited (DV-24). S: HC-04 >= 90% of regiments with a narrative passage; HC-06 recall@5 >= 0.90; each tool page has an "about this data" note | same gates; plus Historian and Search usable at 320 (layout-audit clean, `?view=text` Data View) | expert review log current (5.16) |
| **Historical / data consistency** | M: DV-01..DV-15, TM-V1..V15 with **zero** findings and no registry entries; `one-clock` on all sampled ticks; no date > July 3 anywhere. S: DV-16..DV-30 | `one-clock` and `subpage-clocks` on phone projects | two-reviewer sign-off for every data release touching anchors/counts/casualties |
| **Visual design and brand** | M: stylelint tokens 0 violations (no raw hex, z-index scale, min font 12), token contrast >= 4.5:1, SL-27 brand equality, visual baselines green with no unreviewed change, no emoji-glyph toolbar buttons (`a11y` test), one icon system (all controls use the sprite). S: forced-colors and dark states baselined | baselines at `w375-p`, `w768-p`; toolbar/tool-sheet iconography identical set | design review checklist per release |
| **Fit and finish / polish** | M: layout-audit **0** violations (OFFSCREEN, OCCLUDED, OVERLAP, CLIPPED_TEXT, H_OVERFLOW, TARGET_SIZE >= 24, FONT_FLOOR >= 12) at all desktop rows x all states; console-zero; no debug/dev-log text (SL-20 + runtime); Help feedback <= 100 ms (D1); every state has loading/empty/error variants. S: CLS <= 0.05 | same at all phone/tablet rows with **TARGET_SIZE >= 44** and safe-area padding; splash title never clipped (H3); Tools sheet fully tappable (C2) | - |
| **Usability / learnability** | M: `first-run` (layout persisted, no repeat splash), `keyboard` Esc stack, OOB discoverable on the desktop toolbar (D4), toasts auto-dismiss, panels reset on jump (H4). S: keyboard reachability <= 25 Tabs | M: phone auto-selects mobile layout, no chooser at 375, no keyboard-shortcut offer on touch, transport reachable (C1), primary actions in the lower 60% of the viewport (reach zone test) | usability session: task success >= 90%, SUS >= 85 |
| **Core function** | M: all function specs (5.3) pass on desktop rows; `deeplink` contract; `seek-safety`; click-every-control monkey; playback long-task/heap budgets | M: `mobile-shell`, Tools sheet 5 formerly dead targets open something, "Desktop View" reachable, touch gestures (pan/zoom/tap-to-select) via `page.touchscreen` and CDP `Input.dispatchTouchEvent`, orientation change keeps state | RC device checklist |
| **Reliability** | M: console gate, SW suite (first visit, update, poison, migration, offline), data-failure tests (each JSON fetch failing shows a retry state, never a blank app), UG-01, asset-integrity, rollback drill, flake rate < 1% (30 runs); SLO error sessions <= 0.1%, synthetic >= 99.9% | M: same + WebGL context-loss recovery (`WEBGL_lose_context`), low-memory (CPU x6) no crash, backgrounded-tab resume | - |
| **Performance** | M: Lighthouse desktop >= 0.95 median-of-5 on 6 PR URLs and all sitemap URLs nightly; FCP/LCP/TBT/CLS/SI per `target`; bundle/request budgets; **RUM 28-day p75 green** for the 5 metrics (desktop, n >= 200) | M: Lighthouse mobile >= 0.95; LCP <= 2.2 s target (2.5 s green), TBT <= 150 ms, `mobile-lowend` LCP <= 4 s; INP lab <= 200 ms at CPU x4; **RUM 28-day p75 green** (mobile, n >= 200) | on-device Lighthouse on the low-end Android per perf release |
| **Accessibility** | M: axe 0 over the state matrix, LH a11y 1.00, pa11y 0, keyboard journeys, dialog focus, contrast tokens, font floor 12, target >= 24 (32 desktop goal), landmarks; ACR published | M: same at phone rows with **target >= 44**, orientation not locked (E1), pinch-zoom allowed, 320 reflow, text-spacing | AT log <= 90 days: NVDA, JAWS, VoiceOver macOS; iOS VoiceOver + TalkBack for phone |
| **SEO / metadata** | M: LH SEO 1.00, SL-02..SL-07, SL-27/28, `seo-probe` (single canonical URL form 301s, sitemap == nav == files, structured data valid, OG image decodes), HP-10..12 | M: LH SEO 1.00 mobile; mobile-first content parity (`#seo-content` visible content equal at 375) | weekly Search Console export: indexed >= 95% of sitemap; KPI (search referral share, T1) tracked, not gated |
| **Security hygiene** | M: HP-01..HP-15 green (enforcing CSP with reporting, no `'unsafe-inline'` in `script-src`), SL-11..17, KEY-01/02, EMB-01, ORG-01, gitleaks/audit/osv 0 high, Observatory >= A+ | same (headers are device-independent; graded once per device class from the same run) | quarterly key-restriction console check (MAN-SEC-02) |
| **Documentation (guide PDF)** | M: DOC-01..07, README/ADR/runbook presence + link check, Help generated from registry, public changelog, accessibility statement page | same (PDF and help are shared; mobile check: the guide link and download work on phone, PDF readable at 375 in the built-in viewer) | PDF/UA checker `(verify tool)` |
| **Privacy / legal pages** | M: SL-18/19, ORG-01 (contacted origins == disclosed), cookie claim true (`context.cookies()` and `document.cookie` empty after every e2e test), RUM disclosure, terms "embed" claim true (EMB-01), `Last updated` >= last change to `privacy-origins.json` | same; AR permission prompts and denial paths (RC device checklist) | - |
| **Overall** | all 13 A+ | all 13 A+ | plus 28-day RUM window and current manual logs (section 8.3) |

### 9.3 Measured baseline (partial: only the gates that can be executed statically today)

Computed by `tools/scorecard.mjs` from 109 catalogued gates (26 SL, 15 DV, 15 HP, 1 UG, 52 Lighthouse-assertion gates from the audit's two Lighthouse JSONs) run against the deployed files and the captured production probe. Categories with no static gate yet (content, design, function) show no row: **unmeasured is not a grade**; the browser suites in section 5 fill them in Phase 2-4. These letters use the ladder above and are not comparable to the audit's subjective letters (for example, `docs` is capped at A- because it has one gate today).

```
category     desktop   mobile    failing gates (first six, desktop | mobile)
data         F         F         DV-01,DV-03,DV-04,DV-05,DV-06,DV-07
polish       F         F         SL-09,SL-10,SL-20
usability    B         B         SL-08
reliability  F         F         SL-21,SL-22,SL-23,HP-15,UNDEF-1,LH best-practices
performance  D         F         LH performance, redirects, unused-javascript, bootup-time, mainthread-work, render-blocking (desktop) | + FCP, LCP, speed-index (mobile)
a11y         F         F         SL-03, LH accessibility, color-contrast, label
seo          B         B         SL-02,SL-04,SL-06,SL-07,SL-16,HP-10
security     F         F         SL-12,SL-13,SL-14,SL-15,SL-17,SL-24
docs         A-        A-        (thin category: 1 gate)
privacy      F         F         SL-18,SL-19
```

## 10. Traceability matrix: every audit finding -> test -> exact assertion

Legend for **Today**: `R*` = red, **measured by a prototype I executed** on the real deployed files/headers/Lighthouse JSON (Appendix C); `R` = red, derived from the audit and from code reading, browser test not executed in this session; `G` = green today; `?` = cannot be determined from here. **Tier** = the first tier at which the assertion gates (T1 every push, T2 Deploy Preview, T3 nightly, T5 production monitors). Test ids: `SL-`/`UG-`/`AI-`/`HP-` static gates, `DV-`/`TM-` data/time validators, `HC-` historian harness, `KEY-/EMB-/ORG-/ATTR-/AUD-` contract tests, other names are Playwright specs (section 5).

### 10.1 The 57 audit ids

| Id | Finding | Test(s) | Exact assertion | Tier | Today |
|---|---|---|---|---|---|
| C1 | mobile transport row off-screen | `tappability` (all mobile states x touch rows), `layout-audit` OFFSCREEN, named "transport row" test | every enumerated interactive element passes `locator.click({trial:true})` and lies inside the viewport; Prev/Play/Next/+-1h `toBeInViewport({ratio:1})`; `scrollWidth <= vw`; >= 44x44 | T1 (w320-p, w375-p, w375-l, w412-p); T3 all | R (audit: x = -213..-29; `bundle.pretty.js:103813` `playRow` `justify-content:center`, nowrap, 52 px buttons) |
| C2 | Tools sheet rows covered by timeline | `tappability` mobile-tools-sheet, OCCLUDED, "Desktop View reachable" | `elementFromPoint` at 5 sample points hits each row; trial click on "Desktop View" succeeds | T1 | R (audit `elementFromPoint` result) |
| C3 | dates +2 days | `one-clock`, `TM-V9` lint, DV-08/09 | any "July N" on screen has N <= 3 and equals `tick-clock.csv`; ban regex ``July \$\{[^}]*[+-] ?\d`` has 0 matches (3 today) | T1 lint, T2 | R* (`bundle.pretty.js:97428`, `:100842`, `:101006`) |
| C4 | clock vs history vs narrative | `one-clock`, DV-08/09/10, `TM-V3/V5`, `sandbox-labels`, `subpage-clocks` | one clock string per tick == golden; labels within 10/15/45 min of the tick clock; registry events agree +-2 ticks | T1, T2 | R* (DV-08 49/137, DV-09 37/42, DV-10 3/24) |
| C5 | `setGoldUnit is not defined` | `UG-01`, `ancestor.spec`, click-every-control, RUM error beacon | free-variable scan of built JS reports 0 identifiers; no `pageerror` while picking a regiment and pressing "Change Regiment"; no new error signature in RUM | T1 | R* (UG-01: `setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment`, `CanvasRenderer`) |
| C6 | first-visit forced reload | `service-worker` first visit, SL-21/22, LH `redirects` | exactly 1 main-frame document request within 6 s of SW ready; no `controllerchange -> reload`; LH `redirects` score 1 | T1 (SL), T2 | R* (SL-21/22; LH `redirects` 0, 9,067 ms mobile) |
| C7 | dashboard raw key, `undefined`, empty chart | `no-debug-text` (dashboard), `subpages` dashboard, SL-20 | every `.stat` value matches a number format; no snake_case/`undefined` text; chart has data nodes within 3 s on 10 consecutive cold loads; no "should be reconciled" copy | T2 | R* partial (SL-20: dashboard note) / R |
| C8 | search chips 1.10:1 | axe `color-contrast` on `search.html`; token contrast test; chip computed-style check | each chip text/background >= 4.5:1 in default and pressed state; explicit background set | T1/T2 | R (audit measured 1.10:1; `search.html:30-31` styles are for `.filter-chip` but the buttons render default gray) |
| H1 | floating overlay collisions | `layout-audit` OVERLAP (extra-menu, story, chooser, help x all rows), `extra-features-nav`, stylelint z-index | 0 OVERLAP; no z-index above the token scale; no `#extra-features` layer | T1 | R (`index.html:185` z-index 999999; `:562-585` collision mover) |
| H2 | Esc handling | `keyboard`, a11y Esc test | Esc closes topmost panel incl. from inside search input; order modal -> card -> story -> search -> selection | T1 | R (`bundle.pretty.js:113033` handler; audit) |
| H3 | layout not persisted; 15 s splash; no auto-detect; shortcuts on touch; clipped title | `first-run` | layout key stored; reload has no splash and interactive < 2 s; phone at 375 sees no chooser; no keyboard-shortcut offer on touch; title not CLIPPED | T1 | R (`bundle.pretty.js:112951/113068`, `:101542`) |
| H4 | clutter after jump; toasts never dismiss | `jump-state` | after jump legend/story/card/toasts closed; toast hidden <= 6 s | T2 | R (`deploy-history.md` says code has 4.5 s auto-dismiss: the test decides) |
| H5 | ancestor list text sort | unit natural-sort, DV-18, `ancestor` | sort key `10th < 102nd`; rendered first rows 1st, 2nd...; over all 467 designations | T1 | R (audit) |
| H6 | toolbar iconography | a11y emoji/unnamed test, `TARGET_SIZE`, visual toolbar baseline | 0 buttons with pictographic text and no `<svg>`; sizes >= 24 (44 touch) | T1 | R |
| H7 | dev-log copy in UI | SL-20, `no-debug-text`, DV-17, data copy lint | 0 banned strings (`alias for`, `Commander unrecorded`, `Earlier drafts`, ...) | T1 | R* (5 static hits) |
| H8 | overpromising names; historian quality | claims registry, HC-06/07/08/10/12, viewshed claim test | golden negatives (no "Archer Captured" for "why did Lee lose the war"); banner claims match implementation; "viewshed" wording only if a computed layer exists | T1 | R (`historian.html:154-167` substring scoring) |
| H9 | "1x (real time)" | `one-clock` H9 test, `TM-V9` | no "real time" label; label states sim-minutes/second | T1 | R* (`bundle.pretty.js:97429`) |
| H10 | 467 vs 445+ | DV-11, DV-23, SL-20 | every count claim equals data | T1 | R* (`HelpModal-CFV9T0zH.js` byte 2352) |
| H11 | minimap label stale | `filter-legend-minimap` | label count == `__gtbg.state().unitCount`, pluralized, at ticks 1/100/300 | T2 | R (`bundle.pretty.js:99821`) |
| H12 | distance tool one marker/no line | `distance-tool` | 2 markers + 1 line feature + ft/yd/m/min@2.5 mph text | T2 | R |
| H13 | Soldier's Eye hand-off; duplicate Street View caption | `walkthrough`, DV-21, claims | stop 1 vs 8 iframe `src` and caption differ and match coordinates; hand-off wording true | T2 | R |
| D1 | Help modal late | `help.spec` | first feedback <= 100 ms, content <= 1 s | T2 | R |
| D2 | 9-11 px type, 28x26 targets, slider label, landmarks | `layout-audit` FONT_FLOOR/TARGET_SIZE, a11y slider, SL-03, axe landmarks | 0 violations; `<main>`, one `<h1>`, skip link | T1 | R* (SL-03: 11 of 23 pages lack `<main>`) |
| D3 | label collisions; no auto-fly | `jump-state` fly, `labelCollisions()`, visual | >= 50% of active units in viewport after jump; collisions <= threshold at tick 538 | T2 | R |
| D4 | no Order of Battle on desktop toolbar | `toolbar` | button "Order of Battle" present and named at >= 1024 | T1 | R |
| S1 | Reports/Biography lone search box | `subpages` (report, regiment) | landing shows >= 5 featured items; footer not overlapping/floating; LH per page | T2 | R |
| S2 | Ground Remembers blank ~3 s | `subpages` ground-remembers | poster visible at FCP; map `idle` <= 3 s on cold load | T2 | R |
| S3 | Camera/Viewshed unpainted | `subpages` pixel-variance grid, `map.loaded()` | 4x4 grid luminance variance > eps after `idle` (separates test artifact from bug) | T3 | R? (audit says maybe artifact) |
| S4 | mobile sub-pages: chart overflow, tab clipping, small targets, 9.5 px | `layout-audit` on dashboard/compare/living-ledger at 320-430, Living Ledger tick-1 value | 0 H_OVERFLOW, CLIPPED_TEXT, TARGET_SIZE < 44, FONT_FLOOR < 12; tick-1 casualties == data cumulative | T2 | R |
| P1 | RUM Poor (LCP/INP/CLS/FCP) | `rum/evaluate` alerts, SLO 28-day, LH gates | p75 Good per layout, n >= 200, 28 days | T5 | R (Netlify RUM PDF) |
| P2 | 2.28 MB single bundle, 52% unused | `size-limit`, LH `unused-javascript`, `bootup-time` | entry <= 58 KB br, map <= 470 KB br; audit scores >= 0.9 | T1 | R* (LH 0 / 0) |
| P3 | ~30 JSON fetches | network invariant | <= 3 `/data/` requests before first interaction | T2 | R (LH: 143 "other" requests) |
| P4 | render-blocking `site-nav.js/css` | LH `render-blocking-insight`; static SL-29 (no sync `<script src>`/blocking stylesheet in `<head>` outside allowlist) | score >= 0.9; 0 blocking scripts | T1/T2 | R* (LH mobile 0.5, desktop 0; `index.html:279-280`) |
| P5 | CSS preload / SW mismatch warnings | console gate (warnings = 0), static SL-30 (no `rel=preload as=style ... onload` swap) | 0 console warnings | T1 | R (`index.html:56-58`; audit) |
| P6 | no source maps | LH `valid-source-maps`, `asset-integrity` | every `assets/*.js` has reachable `.map`; audit score 1 | T1/T2 | R* (LH 0) |
| P7 | Lighthouse scores | `assert-lh` mobile + desktop | categories and metrics per `budgets.json` | T2 | R* (18 / 14 failing assertions) |
| T1 | ~8% search referrals | `seo-probe` (internal link depth, inbound links), weekly Search Console export | indexed >= 95% of sitemap; KPI tracked (not a gate) | T3 / weekly | ? (growth KPI) |
| T2 | bot traffic, scanner 404s | HP-13, RUM `bot` flag, digest | scanner paths never 200; bot share reported | T5 | G (scanners 404 verified in the audit; HP-13 flags only the dev page) |
| T3 | duplicate URL forms | HP-10/11, SL-16, `seo-probe` | non-canonical form 301s; cache policy identical | T2 | R* (`/index.html` 200; 8 of 8 alternates 200) |
| E1 | manifest orientation lock | SL-08 + RC rotate check | no `orientation` lock | T1 | R* (`manifest.json:9`) |
| E2 | name mismatch | SL-27 | brand equal in title/og/twitter/manifest/JSON-LD/footer and equals `docs/brand.json` | T1 | ? (owner decision pending) |
| E3 | 3 `<h1>` | SL-02 | exactly one per page | T1 | R* (`index.html` = 3) |
| E4 | crawler-only `#seo-content` | SL-28 | crawler text subset of visible text at 375/1440 | T2 | ? |
| E5 | sitemap omits privacy/terms | SL-06, HP-12 | all indexable pages in sitemap | T1 | R* |
| X1 | Mapbox token unrestricted | KEY-01 (nightly), SL-26 | foreign `Referer` -> 403; 0 token literals in HTML | T3 | R (audit) ; SL-26 R* (9 pages) |
| X2 | Google key restrictions unknown | KEY-02, MAN-SEC-02 | foreign referrer refused; API list minimal | T3 / quarterly | ? |
| X3 | CSP report-only, unsafe-inline, no RUM host | HP-01..03, SL-11..14, console-gate CSP capture, OBS-01 | enforcing CSP, reporting endpoint, no unsafe-inline in script-src, 0 violations in e2e | T1/T2 | R* |
| X4 | embed.html XFO + `frame-ancestors`; dev page | HP-06/07/13, SL-15/17, EMB-01 | single framing policy; embeddable from a foreign origin; `/` not; dev pages absent | T2 | R* |
| X5 | privacy omissions | SL-18/19, ORG-01 | contacted origins == disclosed; AR permissions disclosed | T1/T2 | R* |
| G1 | user-guide PDF | DOC-01..07 | metadata set, `/Lang`, tagged, page fill >= 50% median, no orphan heading, version footer, claims true | T1 | R* (DOC-01..04) |
| A1 | contrast failures | axe matrix, token contrast test | 0 `color-contrast`; tokens >= 4.5:1 | T1/T2 | R* (LH `color-contrast` 0) |
| A2 | unlabeled slider | a11y slider test, LH `label` | `role=slider` + name + `aria-valuetext` | T1 | R* (LH `label` 0) |
| A3 | tiny targets | `layout-audit` TARGET_SIZE | >= 44 touch / >= 24 (32 goal) desktop | T1 | R |
| A4 | 9-11 px text | `layout-audit` FONT_FLOOR | >= 12 px | T1 | R |
| A5 | unlabeled X buttons | a11y unnamed-button test | 0 buttons without accessible name | T1 | R |
| A6 | modal focus, landmarks, reduced motion | a11y dialog test, SL-03, reduced-motion variant | trap + restore focus; `<main>`/landmarks; 0 running non-essential animations under `reduce` | T1 | R |
| N1 | no source of record | AI-01..03, HP-15 (`/version.json` == deployed SHA), DV-29 reproducibility, repo + CI existence, parity harness | every production byte traceable to a commit; two builds hash-identical | T1/T4 | R* (HP-15 fails; no repo) |

### 10.2 Findings added by other specialists and by this plan's own measurements (21)

| Id | Finding | Test(s) | Exact assertion | Tier | Today |
|---|---|---|---|---|---|
| NEW-OG | OG/PWA screenshots corrupt and identical | SL-09, SL-10 | every icon/screenshot/`og:image` decodes (IHDR vs inflated IDAT), 1200x630 OG image, distinct files | T1 | R* |
| T-01 | case-mangled deploy zip | SL-01, AI-01 | every reference exists with exact case | T1 | R* (8 broken on `DEPLOY_DIR`, 0 on `SRC_DIR`) |
| T-02 | same filename, different bytes under `immutable` | AI-02 | any asset name present in the previous production manifest has the same sha256 | T1 | R (`deploy-history.md`: >= 4 bodies under one name); mechanism demonstrated on a simulated change |
| DH-02/03 | SW hard-codes hashes; caches non-OK | SL-22/23, SW poisoning test | precache generated; 5xx not cached | T1 | R* |
| P-22 | ghost units after backwards seek | `seek-safety` | no unit drawn from a future keyframe | T2 | R (`prov-recon.md`) |
| P-62 | dead deep links | `deeplink` | 9 link builders open the requested state | T2 | R (`pages-B.md` pagesB-01) |
| T-09 | Mapbox attribution disabled on mobile/walkthrough maps | ATTR-01 | attribution visible and unclipped on every map | T2 | R (`prov-recon.md` T-09) |
| T-22 | two Map instances on mobile | network invariant | 1 WebGL context per session | T2 | R (`deploy-history.md` 9.7) |
| T-07 | sound path crash (`CanvasRenderer`) and undecided audio policy | UG-01, AUD-01 | 0 undefined identifiers; no AudioContext before gesture | T1 | R* |
| T-29 | bfcache contract | SW/bfcache test | `pageshow.persisted` true on back nav; no `unload` handler | T2 | ? |
| T-08 | keys in source and pages | gitleaks, SL-26 | 0 secrets in repo/history; tokens in config only | T1 | R* |
| T-23 | CSP would block NPS tour iframe | e2e with enforcing CSP | NPS tour opens under enforced policy (`frame-src` includes `www.nps.gov`) | T2 | R (`prov-recon.md` T-23) |
| T-31 | dev page public | SL-17, HP-13 | `/unit-rendering-reference.html` 404 | T1 | R* |
| CSP-RPT | CSP report-only with no reporting endpoint | SL-13, HP-02 | `report-uri`/`report-to` present | T1 | R* |
| HC-XSS | Historian `innerHTML` with data | HC-09 | hostile passage renders inert | T1 | R (`historian.html:172`) |
| HC-SUB | Historian substring scoring | HC-10, HC-07 | "war" != "toward"; irrelevant queries abstain | T1 | R (`historian.html:154-167`) |
| DV-01 | `record_count` 4,890 vs 100 records | DV-01 | equality | T1 | R* |
| DV-05 | 36 regiments with unresolved parent brigade (VI Corps) | DV-05 | all resolve | T1 | R* |
| DV-06 | 78 differing duplicate `(unit,tick)` rows | DV-06 | none unless identical | T1 | R* |
| DV-07 | 6 teleport candidates (e.g. `U-20ME` 814 m in one tick) | DV-07 | speed caps (historian review for exceptions) | T1 | R* |
| DV-12 | 219 strength anomalies | DV-12 | <= 110% of OOB, non-increasing unless `reinforced` | T1 | R* |

## 11. Phased rollout of the quality system

Effort uses the BRIEF scale (S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d), solo, AI-assisted. Total QA engineering is roughly **26 developer-days**, deliberately interleaved with the 38-50 day rebuild in `prov-recon.md` 6.4 rather than added to it: the harness is built first, then every product phase lands against it.

| Phase | Work | Effort | Depends on | Exit gate |
|---|---|---|---|---|
| **0. Foundations** (days 1-2) | private git repo, legacy `dist` with correct-case names (`prov-recon-02`), `ARCHIVE_MANIFEST`; pnpm + Node pin; `ci.yml` with **static gates only**: `site-lint`, `undef-globals`, `asset-integrity`, DV validators with the ratchet registry seeded from the first red run, gitleaks; PR template, CODEOWNERS, branch protection; lefthook; `tools/scorecard.mjs` + `gates.json` | M | N1 decision (prov-recon-01/02) | CI green with seeded registries; scorecard prints the baseline (section 9.3); protected `main`; `production` branch created but unchanged |
| **1. Red proofs** (days 3-8) | Playwright config from `viewports.json`; fixtures (console gate, Mapbox stub, RUM block); driver + state catalogue (legacy click paths, verified on first run); `layout-audit` + `tappability`; `one-clock` (formula-fallback golden); `service-worker`; function specs for C1, C2, C5, C6, H1-H4, H9-H12, D1, D4; axe matrix; LH runner + `assert-lh` at the **G0 baseline lock** (no regression from 64/85); `prod-probe` scheduled; `parity` skeleton with an empty registry | L | Phase 0 | every one of the 57 audit ids has >= 1 test; every currently-red test is in `known-failures.json` with an audit id; PR tier <= 12 min (target 6), nightly running |
| **2. Gate the bridge fixes** (days 6-10, parallel with product hotfixes) | bridge patch runner gating (6.8): each patch flips tests green and deletes registry entries in the same PR; Deploy Previews + `preview.yml` (T2); `version.json` + HP-15; visual baselines of the legacy chrome; `report-uri` added to the report-only CSP and the `/api/csp` function; `embed` fix verified by EMB-01 | M | Phase 1; `prov-recon` hotfix list, `deploy-history` HF-1..HF-5 | C1/C2/C3/C5/C6/C7/C8 tests green on the patched legacy; CSP violations start arriving |
| **3. Monitoring live** (days 8-12) | RUM beacon + collector + evaluator + privacy update; synthetic monitors SYN-01..08; alert routing; T4/T5 workflows; rollback runbook + first L1 drill on staging | M-L | Phase 2 (`version.json`, previews) | 14-day beta baseline begins (needed before cut-over); first weekly digest issued; a deliberate bad deploy on staging triggers the auto-rollback path |
| **4. Acceptance harness for the rebuild** (spread across rebuild phases 2-8) | hooks contract (3.5) built into the rebuild from day one; parity harness complete (T1 goldens for 675 ticks, T2 snapshots, registry with all seeded entries); per-panel acceptance = its function spec + a11y + layout-audit + visual; token/stylelint gates; time-model gates (`TM-V1..15`, golden CSV); historian harness HC-01..15 as the database work lands; size-limit budgets enforced per chunk | L (XL calendar) | rebuild phases; app-time anchors; Historian ADR | each rebuilt panel merges only when its checkpoints pass; scorecard rows for content/design/function appear and climb |
| **5. Hardening and devices** | WebKit/Firefox nightly full; real-device RC program (owner's phones + one low-end Android; device cloud trial around cut-over); AT program scripts run; usability session; expert review; CSP enforcement flip (section 5.10 steps 3-5); rollback drill L0-L3; freeze calendar | M + calendar | Phases 3-4 | RC checklist, AT log, usability log, expert-review log, CSP enforced with 0 new signatures for 14 days |
| **6. Cut-over and A+ verification** | 7 consecutive green nightly parity runs; opt-in beta (>= 14 days, >= 100 sessions); cut-over PR flips `/` and freezes `/classic/`; 28-day RUM window; two consecutive weekly A+ scorecards | S + 28-45 days elapsed | Phases 4-5 | criteria 6.6 all true; scorecard A+ x2; 28-day RUM green; registries empty |

### 11.1 If only one week is available (minimum viable safety net)

Do these first; each is small and independently valuable: (1) git + CI running `site-lint` + `undef-globals` + `asset-integrity` + DV validators (Phase 0); (2) `prod-probe` on a 6-hourly cron; (3) `tappability` + `layout-audit` at `w375-p`/`w375-l`/`w1440-d` on the legacy driver (proves C1/C2/H1 red, then guards their fixes); (4) `service-worker` first-visit test; (5) `one-clock` at three ticks; (6) `assert-lh` at the G0 lock. That set alone would have blocked every critical the audit found.

### 11.2 What each product finding needs from QA before it starts

| Product work (other specialists) | QA prerequisite | QA deliverable that closes it |
|---|---|---|
| Mobile shell fix (C1/C2) | `tappability`, `layout-audit`, states `mobile-*` red on legacy | named C1/C2 tests green; registry entries removed |
| Time model (C3/C4) | golden `tick-clock.csv` + `time-model.mjs` fallback; TM-V1..15 wired | `one-clock` green at 11 ticks; V9 lint 0 hits |
| SW rewrite (C6) | `service-worker.spec` (migration test needs a copy of the legacy `sw.js` fixture) | all SW tests green; LH `redirects` = 1 |
| Code splitting / perf (P2..P5) | size-limit config + budgets + LH G0 | budget ratchet steps G1..G4 |
| CSP enforcement (X3) | report endpoint + enforced-candidate e2e run | HP-01..03 green |
| Data fixes / anchors (C4, DV-xx) | DV registry seeded + alias table schema | registry emptied; expert-review log entries |
| Historian expansion (H8) | HC harness + golden question set authored *before* corpus work | HC-06..09 thresholds met on the new corpus |
| Rebuild (N1) | hooks contract + parity harness + state catalogue | parity go/no-go 6.6 |

## 12. Findings (fix specs)

Severity: critical, high, medium, low. Effort: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d. `audit_refs` use the BRIEF ids (and the other specialists' ids where noted); `depends_on` may name other specialists' findings. Each finding lists evidence with file:line, root cause, exact fix, acceptance test, and the metric or grade it moves. The same 30 findings are returned in the structured summary.

| Id | Title | Severity | Effort | Depends on |
|---|---|---|---|---|
| qa-ci-01 | Create the repo, CI skeleton and the red-first ratchet (no quality system exists today) | critical | M | prov-recon-01, prov-recon-02 |
| qa-ci-02 | Adopt the executable static gate suite (SL-01..SL-30, UG-01, AI-01..03, HP-01..15) | critical | M | qa-ci-01 |
| qa-ci-03 | Playwright foundation: generated viewport matrix, fixtures, dual driver, state catalogue | critical | L | qa-ci-01 |
| qa-ci-04 | Overlap / occlusion / clipping / tappability detector suite with self-testing fixtures | critical | L | qa-ci-03, qa-ci-30 |
| qa-ci-05 | Console / pageerror / request / CSP gate plus interaction coverage and runtime debug-text scan | high | M | qa-ci-03, qa-ci-02 |
| qa-ci-06 | One clock, one date: golden tick-clock, time-model fallback, TM validators and browser proof | critical | M | app-time anchors (time-facts), qa-ci-03 |
| qa-ci-07 | Data validator suite DV-01..DV-30 with ratchet registry, alias table and provenance gates | high | L | qa-ci-01, qa-ci-06 |
| qa-ci-08 | Service-worker and first-load suite (first visit, warm visit, update, poisoning, migration, offline, bfcache) | high | M | qa-ci-03 |
| qa-ci-09 | Accessibility automation gates and manual assistive-technology programme wiring | high | L | qa-ci-03, app-a11y-13, app-a11y-32 |
| qa-ci-10 | Lighthouse / Core Web Vitals lab gate on Lighthouse 13 with budgets, profiles and ratchet | high | M | qa-ci-03, qa-ci-11 |
| qa-ci-11 | Bundle, request and network budgets (size-limit, request invariants, WebGL context count, source maps) | high | M | qa-ci-03, bundle-anatomy-08 |
| qa-ci-12 | Deterministic visual-regression baselines for chrome states | medium | M | qa-ci-03, qa-ci-30 |
| qa-ci-13 | Security and privacy contract tests and a test-driven CSP roll-out | high | M | qa-ci-19, qa-ci-16 |
| qa-ci-14 | Function specs mapped to the H/D findings (first-run, keyboard, jump-state, search, minimap, ancestor, distance, walkthrough, help, mobile shell, deep links, seek safety, nav, embed) | high | L | qa-ci-03, qa-ci-30 |
| qa-ci-15 | Static-page suites for the 20 tool pages, legal pages, 404, embed and the guide PDF | medium | M | qa-ci-02, qa-ci-03 |
| qa-ci-16 | First-party RUM (web-vitals attribution), collector, evaluator, error and CSP beacons | high | L | qa-ci-19, qa-ci-13 |
| qa-ci-17 | Synthetic production monitors, post-deploy smoke, alert routing and traffic hygiene | medium | M | qa-ci-19 |
| qa-ci-18 | Parity harness, intended-diff registry, hermetic legacy build and cut-over gates | critical | L | qa-ci-03, qa-ci-30, prov-recon-03 |
| qa-ci-19 | Netlify pipeline: production branch, Deploy Previews, generated _headers, noindex previews, version.json, redirects, rollback workflow | high | M | qa-ci-01, qa-ci-02 |
| qa-ci-20 | Versioning, changelog, public "What's new", PR template and Definition of Done | medium | S | qa-ci-19 |
| qa-ci-21 | Cross-browser and real-device programme (iOS Safari, Samsung Internet, low-end Android, iPad) | medium | M | qa-ci-03 |
| qa-ci-22 | Ask-the-Historian evaluation harness (retrieval, abstention, grounding, injection, performance) | medium | L | Historian architecture ADR, qa-ci-07 |
| qa-ci-23 | Scorecard, gate catalogue, PR comment and weekly report ("A+ stays A+") | high | M | qa-ci-02, qa-ci-03 |
| qa-ci-24 | Flake management and test health | medium | S | qa-ci-03 |
| qa-ci-25 | Golden / fixture / secret governance | medium | S | qa-ci-01 |
| qa-ci-26 | QA documentation, ADRs and runbooks | low | S | qa-ci-01 |
| qa-ci-27 | Manual programmes and the claims registry (AT, usability, expert review, copy) | medium | M | qa-ci-03 |
| qa-ci-28 | Gate the bridge patches to the frozen bundle | medium | M | qa-ci-02, qa-ci-18 |
| qa-ci-29 | Third-party inventory, attribution and audio-policy tests | medium | S | qa-ci-13 |
| qa-ci-30 | Testability requirements for the rebuild (hooks contract) | medium | S | prov-recon-14, prov-recon-16 |

### qa-ci-01 - Create the repo, CI skeleton and the red-first ratchet (no quality system exists today)
Severity: critical | Effort: M | audit_refs: N1 | depends_on: prov-recon-01, prov-recon-02

**Evidence.** netlify.toml:2 `publish = "."` with no [build]; SRC_DIR (119 files) has no package.json/tests/CI (N1); prior tests/CI existed until Jun 13 and were lost (deploy-history.md:63,142,236; files still in Downloads/gettysburg_FINAL_v24/tests/validate_data.py and .github/workflows/ci.yml); that old CI ran `netlify deploy --alias=pr-N ... continue-on-error: true` so it could not gate; the old validator crashes on Windows (`UnicodeEncodeError` printing box-drawing chars, reproduced) and asserted only structure (ticks 1..675, key events at ticks 28/29/275/302/551), never label-vs-tick.

**Root cause.** No source of record and no test system: every fix since Jun 13 was a string patch on a 2.28 MB minified bundle with nothing to prove it (prov-recon.md 6.1), and the checks that once existed were structural.

**Fix.** 1) git init a PRIVATE repo; commit legacy/dist with the five lower-cased asset names restored (prov-recon-02); archive zips outside git with ARCHIVE_MANIFEST.tsv. 2) pnpm workspace, .nvmrc, lefthook (T0). 3) .github/workflows/ci.yml (static gates, unit, data validators, build). 4) Protect main; required checks ci/static, ci/build, ci/e2e-pr, preview/gate; no admin bypass. 5) Four expiring registries, each entry {audit, reason, until}: tests/known-failures.json, tests/overlap-allowlist.json, tests/console-allowlist.json, docs/parity/intended-diffs.json; CI rule: unlisted failure = red, listed-but-passing = red (stale), expired = red (implemented and proven in tests/data/validate.test.mjs: seeded registry 15/15 pass, empty registry 12 fail, stale entry 1 fail). 6) PR template with the DoD checklist, CODEOWNERS, tools/scorecard.mjs + tools/gates.json.

**Acceptance test.** Fresh clone: `pnpm install && pnpm ci:static` is green with seeded registries. Deleting a registry entry whose gate is still red turns CI red; adding an entry for a passing gate turns CI red; an entry past `until` turns CI red. `node tools/scorecard.mjs` prints the baseline table. Pushing to main without the required checks is impossible.

**Metric / grade moved.** Enabler for every category; N1; Reliability, Documentation

---

### qa-ci-02 - Adopt the executable static gate suite (SL-01..SL-30, UG-01, AI-01..03, HP-01..15)
Severity: critical | Effort: M | audit_refs: C5, C6, E1, E3, E5, X3, X4, X5, T3, P4, P5 | depends_on: qa-ci-01

**Evidence.** Prototypes executed on the real files (Appendix C): site-lint on SRC_DIR = 26 checks, 16 errors, 6 warnings (e.g. SL-02 index.html has 3 <h1>; SL-03 11 of 23 pages lack <main>; SL-06 privacy/terms missing from sitemap; SL-08 manifest.json:9 "orientation": "landscape"; SL-09 screenshots/day1.png = day3.png, IHDR RGB but IDAT RGBA-sized, PIL cannot decode; SL-13 CSP has no report-uri (netlify.toml:19); SL-17 diagnostics.html + unit-rendering-reference.html in publish dir; SL-18 peerjs.com, cdn.jsdelivr.net, nps.gov not named on privacy.html; SL-21..23 index.html:255-277 controllerchange reload, sw.js:5-13 hard-coded hashes, sw.js:45,65 cache.put without res.ok). undef-globals on bundle.pretty.js reports exactly CanvasRenderer (96556), setGoldUnit (101086,101229), clearGoldTrail (101086,101229), drawGoldTrailSegment (101101). asset-integrity on DEPLOY_DIR: 8 broken references (index-cg8famxn.js vs index-Cg8FAMXN.js). prod-probe on production: 10 of 15 fail (no enforcing CSP, embed.html XFO DENY + frame-ancestors *, /index.html 200, 8/8 alternate URL forms 200, /unit-rendering-reference.html 200, no /version.json).

**Root cause.** Contracts that should be facts (asset names, headers, sitemap, privacy disclosures, SW behaviour) are hand-maintained and unverified; Lighthouse does not test them.

**Fix.** Move tests/static/{site-lint,undef-globals,asset-integrity,prod-probe}.mjs into the repo (they are dependency-free except acorn + eslint-scope for UG-01); add SL-27 (brand equality), SL-28 (crawler text parity), SL-29 (render-blocking head), SL-30 (preload/onload swap), tests/static/seo-probe.mjs; each prints `PASS|FAIL <ID> [<audit ids>]` and writes reports/gates/<name>.json; wire into ci.yml (build job), nightly.yml (links-and-seo, keys-and-security) and prod-monitor.yml (curl-probes, post-deploy). Allowlist for browser-only globals (Path2D, WheelEvent, caches, MSApp, WorkerGlobalScope, __REACT_DEVTOOLS_GLOBAL_HOOK__, parent, reportError) reviewed yearly. prod-probe retries 3x with a 15 s timeout and exits 2 (probe error) rather than reporting a network hiccup as a site failure.

**Acceptance test.** On SRC_DIR the suite yields exactly the recorded failures (seeded into known-failures.json) and exits 0; on DEPLOY_DIR SL-01 fails with 8 references; a simulated change to an existing hashed asset fails AI-02; each product fix deletes its registry entry in the same PR.

**Metric / grade moved.** Reliability, SEO, Security, Privacy, Polish; C5, C6, E1, E3, E5, X3, X4, X5, T-01, NEW-OG

---

### qa-ci-03 - Playwright foundation: generated viewport matrix, fixtures, dual driver, state catalogue
Severity: critical | Effort: L | audit_refs: C1, C2, H3, D2, A3, N1 | depends_on: qa-ci-01

**Evidence.** No browser tests exist. index.html:62 `html, body { width:100%; height:100%; overflow:hidden }` and #root `position:fixed; contain:strict` (index.html:69) mean page-level overflow checks cannot see C1; deep links are dead (pagesB-01) so the legacy driver must step the keyboard; bundle.pretty.js has zero data-testid; Lighthouse errors-in-console/target-size scored 1 on the broken build (lh_mobile.json).

**Root cause.** The only automated view of the product is a load-path Lighthouse run; the shell clips instead of scrolling and exposes no hooks.

**Fix.** playwright.config.ts generates one project per row of tests/support/viewports.json (24 rows: 12 widths x portrait/landscape or standard/short; 8 rows in the PR tier); WebKit/Firefox smoke rows (Firefox desktop only: no isMobile); pinned Playwright container image; fixtures/base.ts (auto console/pageerror/request/CSP gate with expiring allowlist, Mapbox stub with local sprite/glyph fixtures, RUM host blocked); support/driver.ts (DRIVER=legacy|next; legacy click paths marked (verify) confirmed on the first red run; legacy seek steps the keyboard until the HUD shows "Tick N/675"); support/states.ts (12 states growing to ~45; adding a panel = adding a line); tags @cat:/@audit: in every title; junit + json reporters adapted to gate results; --shard for CI.

**Acceptance test.** `playwright test --list` shows the PR-tier projects; TIER=full lists 24 Chromium + smoke rows; a legacy run reaches all 12 states with < 2% infrastructure failures over 20 consecutive runs; PR-tier wall clock <= 12 min at introduction and <= 6 min after state pruning; a deliberately failing console.error in any test turns it red.

**Metric / grade moved.** Enables Function, Fit-and-finish, Usability, Reliability, Accessibility gates; C1, C2, H3, D2, A3

---

### qa-ci-04 - Overlap / occlusion / clipping / tappability detector suite with self-testing fixtures
Severity: critical | Effort: L | audit_refs: C1, C2, H1, S4, A3, A4, D2, D3, H3, H6 | depends_on: qa-ci-03, qa-ci-30

**Evidence.** Audit: transport row 572 px wide at 375 px, Back at x=-213 (C1); Tools-sheet rows return the timeline bar from elementFromPoint (C2); bundle.pretty.js:103813 `playRow: { display:"flex", justifyContent:"center", gap:14 ... }` with 52 px buttons (103216 uses it); index.html:185 `z-index: 999999` for #extra-features and the collision mover at index.html:562-585 (H1). tests/lib/layout-audit.browser.js (217 lines; rules OFFSCREEN, OCCLUDED, OVERLAP, CLIPPED_TEXT, H_OVERFLOW, TARGET_SIZE, FONT_FLOOR) + 7 geometry unit tests pass, including the C1 (row at x=-213) and C2 (bar over a 343x44 row) shapes.

**Root cause.** The layout is tested by eye; the app shell clips overflow, so only per-element geometry can detect it.

**Fix.** Adopt layout-audit.browser.js, tappability.spec.ts (enumerate ALL interactive elements incl. cursor:pointer divs; `locator.click({trial:true})` runs the browser actionability incl. "receives events"), layout-audit.spec.ts (all states x all rows), text-spacing/200% variant, overlap-allowlist.json with {rule, sel, other, audit, reason, until} where expired entries stop suppressing (unit-tested). Add detector self-test fixtures tests/fixtures/pages/*.html (off-screen row, covered button, clipped tab, 1000 px chart, 11 px text) that must be reported, so the detector cannot silently rot (mutation check). Add __gtbg.labelCollisions() for canvas text (D3).

**Acceptance test.** On legacy at w375-p: tappability reports the five formerly dead Tools-sheet rows and the five off-screen transport controls; layout-audit reports OVERLAP for #extra-features in >= 3 states; after the fixes every one of 24 rows x all states reports 0 (allowlist only for third-party licence UI, each with an expiry); re-introducing the 572 px nowrap row in a scratch branch turns CI red.

**Metric / grade moved.** Fit-and-finish, Usability, Core function (mobile), Accessibility; C1, C2, H1, S4, A3, A4, D2

---

### qa-ci-05 - Console / pageerror / request / CSP gate plus interaction coverage and runtime debug-text scan
Severity: high | Effort: M | audit_refs: C5, C7, H7, P5, X3 | depends_on: qa-ci-03, qa-ci-02

**Evidence.** lh_mobile.json: `errors-in-console` score 1 (pass) on the build that throws `ReferenceError: setGoldUnit is not defined` on click (bundle.pretty.js:101086 `(l(it), setGoldUnit(it), clearGoldTrail())`, :101229 the "Change Regiment" handler); SL-20 finds dev-log strings statically but `undefined`/NaN/raw keys only appear after fetch (dashboard).

**Root cause.** Console cleanliness is only observed on load; the failing paths are behind clicks and data fetches.

**Fix.** fixtures/base.ts auto-fixture on every test (console.error/warning, pageerror, requestfailed, same-origin >= 400, securitypolicyviolation via init script; allowlist entries {kind, match, reason, audit, until}, expired entries fail); console-gate.spec.ts: ancestor path (pick regiment -> Change Regiment), click-every-control once per state (skips external/mailto), select all 467 regiments, and runtime no-debug-text on 6 data-driven pages (`undefined`, NaN, [object ...], snake_case, dev-log phrases).

**Acceptance test.** On legacy the ancestor test fails with `pageerror: setGoldUnit is not defined`; after the fix it passes; injecting console.error or a CSP-violating inline script into a fixture page fails the test; an allowlist entry past `until` fails the run; dashboard shows no `undefined`/raw key text on 10 cold loads.

**Metric / grade moved.** Reliability, Fit-and-finish; C5, C7, H7, P5, X3

---

### qa-ci-06 - One clock, one date: golden tick-clock, time-model fallback, TM validators and browser proof
Severity: critical | Effort: M | audit_refs: C3, C4, H9 | depends_on: app-time anchors (time-facts), qa-ci-03

**Evidence.** bundle.pretty.js:97428 `R = `July ${l + 2}, 1863``, :100842 and :101006 (`f + 2`); :97429 `f === 1 ? "1x (real time)"`; tests/data/validate.mjs executed on deployed data: DV-08 49 of 137 chronology labels differ >10 min from the file's own formula (range -230..+15 min); DV-09 37 of 42 succession rows (US-001 tick 28 "July 1 ~10:15am" vs 7:15 by formula: the label is right, the clock is wrong); DV-10 3 of 24 vignettes (V-001 +95, V-002 +180, V-017 +144 min); chronology_day2.json states "Tick 226 = 5:00am July 2. Each tick = 5 minutes. Day 2 = ticks 226-450" which cannot reach the 7:50pm label at tick 450.

**Root cause.** Six independent tick-to-clock implementations plus hand-typed labels; no test compares any two of them.

**Fix.** tests/support/time-model.mjs (anchors file if present, else the files' own stated formula) so the same tests are red today and meaningful after anchors land; tests/golden/tick-clock.csv (675 rows) generated from data/time_anchors.json (time-facts-anchors.csv is the seed) and regenerated in the same PR as any anchor edit; one-clock.spec.ts at ticks {1,12,17,28,226,267,302,451,538,553,675} on desktop and phone: exactly one clock string and one "July N" in HUD/story/event card/mobile header, equal to the golden and to __gtbg.state(); sandbox-labels, subpage-clocks (8 pages), TM-V1..V15 (app-time.md 10.1) with --strict; V9 lint bans (`July ${...+2}`, `*5`, `5*60`, toLocale*, "real time").

**Acceptance test.** one-clock is red at every sampled tick on legacy and green on the rebuild at desktop and phone; V9 lint reports 0 matches; any anchor edit shows a reviewable 675-row golden diff; no "July 4/5" string exists anywhere on a battle screen.

**Metric / grade moved.** Historical/data consistency (C- -> A+), Fit-and-finish; C3, C4, H9

---

### qa-ci-07 - Data validator suite DV-01..DV-30 with ratchet registry, alias table and provenance gates
Severity: high | Effort: L | audit_refs: C4, H5, H7, H10, D3, N1 | depends_on: qa-ci-01, qa-ci-06

**Evidence.** Executed on SRC_DIR/data (Appendix C): DV-01 placements_day1_ticks1_50.json record_count 4890 vs 100; DV-03 100 placement unit ids unresolved by data alone (C-ART-I-4, U-8IL, U-15AL, U-I-1-19IN...); DV-04 28 unresolved refs; DV-05 36 regiments with unresolved parent_brigade_id (VI Corps U-VI-*); DV-06 78 differing duplicate (unit,tick) rows; DV-07 6 teleport candidates (U-8NY-CAV t3->t4 2,374 m in 5 min; U-20ME t264->265 814 m); DV-11 "445+ Union and Confederate units" in HelpModal-CFV9T0zH.js byte 2352 vs 467; DV-12 219 strength anomalies (U-V-1-1@150 2,220 vs OOB 655; U-I-1-1 1,883 -> 3,865 at t12); DV-13 26 brigade roll-up drifts; 12 of 15 checks fail, 3 pass (ticks, percent math, dispositions/bbox); only 188 of 675 ticks have any placement record.

**Root cause.** Data integrity is assumed; the previous validator was structural and is gone.

**Fix.** Promote tests/data/validate.mjs to pipeline/validate/*.mjs; add DV-16..DV-30 (vignette schema, alias closure, natural-sort key, monuments, chronology order/enums, walkthrough stops, successions chain, counts.json single source, source_id + sources.json license/URL/accessed, citation health, roll-ups, disposition state machine, engaged-day coverage, build reproducibility, TM wiring); unit_aliases.json replacing in-code alias resolution; sources.json; data-change protocol (source_id on new facts; expert-review-log entry for confidence L/M; data(correction) commits in the public changelog); ratchet registry as proven; run --strict in ci.yml and on any data/** change.

**Acceptance test.** `node pipeline/validate/run.mjs --strict` prints 30 gates; seeded registry passes; each data fix removes exactly its entry; DV-24 fails when a curated fact lacks source_id; DV-29 fails when regenerated hashes differ from the committed manifest.

**Metric / grade moved.** Historical/data consistency, Concept/content depth, Reliability; C4, H5, H7, H10, D3

---

### qa-ci-08 - Service-worker and first-load suite (first visit, warm visit, update, poisoning, migration, offline, bfcache)
Severity: high | Effort: M | audit_refs: C6, P1, P5, T3 | depends_on: qa-ci-03

**Evidence.** index.html:255-277 `navigator.serviceWorker.addEventListener("controllerchange", function () { ... location.reload(); })`; sw.js:17 `self.skipWaiting()`, :30 `clients.claim()`, :5-13 hard-coded /assets/index-Cg8FAMXN.js, :45 and :65 `caches.open(CACHE_NAME).then(c => c.put(e.request, clone))` with no res.ok guard; lh_mobile.json redirects score 0 (9,067 ms); tests/e2e/service-worker.spec.ts sketched (6 tests, syntax-checked).

**Root cause.** A reload-on-controllerchange hack plus a worker that precaches by hand-typed hash and caches failures; no test exercises SW lifecycle.

**Fix.** Adopt service-worker.spec.ts with the SW contract in 5.11: injected VERSION and generated precache, skipWaiting only on user message, no auto-reload, res.ok guard, old gbg-* cache cleanup (migration test needs a copy of the legacy sw.js as a fixture route), offline shell + notice, sw.js no-store, navigation preload; add the bfcache test (pageshow.persisted, no unload handlers).

**Acceptance test.** First visit: exactly one main-frame document request within 6 s of SW ready; warm visit: 0 /data|/assets requests bypass the SW and LCP < 1.2 s; deploying v2 shows an aria-live prompt and does not navigate for 3 s, one navigation after consent; a 503 asset is absent from Cache Storage; old-to-new SW upgrade deletes gbg-* caches without a reload loop; LH redirects = 1.

**Metric / grade moved.** Reliability, Performance (LCP/FCP); C6, P1, P5

---

### qa-ci-09 - Accessibility automation gates and manual assistive-technology programme wiring
Severity: high | Effort: L | audit_refs: A1, A2, A3, A4, A5, A6, D2, H2, H6, C8, S4 | depends_on: qa-ci-03, app-a11y-13, app-a11y-32

**Evidence.** lh_mobile.json: accessibility 90, failing audits only color-contrast and label; app-a11y.md 8.2: 23 of 55 WCAG 2.2 A+AA criteria failing, 62 of 234 text styles below 4.5:1, 133 of 268 font-size literals below 12 px, 17 click-only controls; prov-recon T-33: zero aria/role in app code. tests/a11y/state-matrix.spec.ts sketched: axe over the state catalogue x {default, reduced-motion, forced-colors} + slider name, Esc stack, dialog focus trap/restore, unnamed/emoji buttons, Tab reachability with visible unobscured focus (2.4.7/2.4.11/2.4.13).

**Root cause.** Automated a11y is judged on the load state; behavioural criteria are untested.

**Fix.** Adopt the state-matrix + behavioural specs (app-a11y-32 owns the fuller matrix), pa11y-ci with panel actions, token contrast unit test, eslint-plugin-jsx-a11y strict, stylelint (no raw hex, min font 12, coarse min-size 44, z-index scale), reflow 320/text-spacing variant; schedule the AT programme (app-a11y-33) with a log <= 90 days old as a release gate; publish the ACR (app-a11y-34).

**Acceptance test.** CI fails on any new axe violation, unnamed control, target < 24 (44 touch), font < 12, or contrast token < 4.5:1; nightly covers all ~45 states x 3 variants x 2 device classes; Lighthouse a11y = 1.00 on 6 URLs; AT log entry present.

**Metric / grade moved.** Accessibility (C+/C -> A+) desktop and mobile; A1-A6, D2, H2, H6, C8, S4

---

### qa-ci-10 - Lighthouse / Core Web Vitals lab gate on Lighthouse 13 with budgets, profiles and ratchet
Severity: high | Effort: M | audit_refs: P1, P2, P4, P5, P6, P7, C6 | depends_on: qa-ci-03, qa-ci-11

**Evidence.** lh_mobile.json (Lighthouse 13.5.0): performance 64, FCP 4,099 ms, LCP 9,007 ms, TBT 27 ms, CLS 0.073, SI 4,099 ms; lh_desktop.json: 85, LCP 2,229 ms, SI 1,935 ms; audit ids are Lighthouse-13 insights (render-blocking-insight, network-dependency-tree-insight; `uses-text-compression` absent). @lhci/cli latest confirmed 0.15.1 bundling Lighthouse 12.6.1 (GitHub releases page fetched 2026-09-30). perf/assert-lh.mjs + budgets.json executed against both JSONs: mobile 18, desktop 14 failing assertions.

**Root cause.** The pinned LHCI would not produce the audit ids the audit used, and there are no budgets or profiles.

**Fix.** perf/run-lighthouse.mjs (Node API, fresh Chrome per run, 5 runs) + perf/assert-lh.mjs (medians from raw LHR JSON; tiers green|target; per-metric score >= 0.9 self-calibration; resource budgets) + budgets.json that only tighten; profiles mobile, mobile-lowend (CPU x6, RTT 300, 700 kbps), desktop; Playwright `interaction` profile for INP (CPU x4 via CDP, >= 20 interactions) and `warm` profile; 6 URLs on PRs, all sitemap URLs nightly; ratchet G0 (lock 64/85) -> G1 70 -> G2 85 -> G3 90 -> G4 95; nightly Lighthouse-drift job comparing the newest release to the pin.

**Acceptance test.** assert-lh reproduces the audit at G0; PR comment shows medians; each perf phase flips the matching rows; a > 3-point drift versus the newest Lighthouse opens an issue; raising a budget without the label fails CI.

**Metric / grade moved.** Performance (D+/C -> A+); P1, P2, P4, P5, P6, P7, C6

---

### qa-ci-11 - Bundle, request and network budgets (size-limit, request invariants, WebGL context count, source maps)
Severity: high | Effort: M | audit_refs: P2, P3, P4, P6 | depends_on: qa-ci-03, bundle-anatomy-08

**Evidence.** lh_mobile.json resource-summary: 156 requests, 1,577,215 B; script 6 requests 614,184 B; "other" 143 requests (JSON + tiles); third-party 61 requests 801,856 B. bundle-anatomy.md 4.1 sets entry <= 58 KB br, map <= 470 KB br, per-panel budgets; deploy-history 9.7 / prov-recon T-22: the mobile layout creates a second Mapbox map; prov-recon T-02: 4 variants of index-Cg8FAMXN.js under one URL (deploy-history 9.1 counts >= 40 contents under same-named bundles).

**Root cause.** No enforceable byte or request budget; multiple maps per session go unnoticed.

**Fix.** size-limit entries per chunk (raw + brotli), HTML/poster/data budgets, `budgets only tighten` diff check; Playwright network invariants: <= 3 /data/ requests before first interaction, 0 duplicate URLs, exactly 1 document request, 1 WebGL context (init script counts getContext(webgl2)), wire bytes before LCP <= 65 KB via response.request().sizes(), long tasks in first 5 s <= 50 ms (map init <= 100 ms) at CPU x4; every assets/*.js has a reachable .map; asset-integrity AI-01..03.

**Acceptance test.** A deliberately bloated PR (extra 100 KB import) fails; second visit shows 0 network data requests; mobile session shows 1 WebGL context; LH valid-source-maps = 1.

**Metric / grade moved.** Performance, Reliability; P2, P3, P4, P6, T-22

---

### qa-ci-12 - Deterministic visual-regression baselines for chrome states
Severity: medium | Effort: M | audit_refs: H6, D2, S4 | depends_on: qa-ci-03, qa-ci-30

**Evidence.** No visual tests; H6 toolbar iconography inconsistent (emoji + letters); prov-recon 6.5: the renderer changes by design so map pixels are not comparable; Google Fonts (Spectral) and Mapbox are third-party network dependencies that would flake screenshots.

**Root cause.** Chrome regressions (icons, spacing, tokens) are invisible to geometry tests.

**Fix.** Playwright toHaveScreenshot inside the pinned container only (Linux baselines; no platform in snapshotPathTemplate), animations disabled, ?test=1 freezes tick, fonts + Mapbox routed to local fixtures incl. local sprite/glyph PBFs so symbol layers render; ~40 states x 4 projects (w375-p, w768-p, w1440-d, w1920-d) ~ 160 PNGs; map region masked and asserted semantically; maxDiffPixelRatio 0.002; manual update-baselines workflow committing to the PR branch; PR template requires initials for changed baselines; ADR 0004 compares hosted tools (prices unverified).

**Acceptance test.** Three consecutive CI runs on an unchanged commit produce 0 diffs; a deliberate toolbar icon change yields a reviewable diff; a baseline can only change through the update workflow.

**Metric / grade moved.** Visual design and brand, Fit-and-finish; H6, D2, S4

---

### qa-ci-13 - Security and privacy contract tests and a test-driven CSP roll-out
Severity: high | Effort: M | audit_refs: X1, X2, X3, X4, X5 | depends_on: qa-ci-19, qa-ci-16

**Evidence.** netlify.toml:19 Content-Security-Policy-Report-Only with script-src 'self' 'unsafe-inline' and no report-uri/report-to; live /embed.html headers: `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors *`, plus the site-wide report-only CSP (netlify.toml:83-85 tries to blank both); privacy.html omits PeerJS 0.peerjs.com, jsDelivr, NPS, Mapbox events, AR camera/motion (SL-18/19); pk. token literal in 9 HTML pages and the bundle (SL-26); /unit-rendering-reference.html answers 200 (HP-13). Two CSP headers are intersected by browsers, so a second `frame-ancestors *` cannot rescue /embed.html once a site-wide enforcing policy exists.

**Root cause.** Security headers are hand-written cascades that Netlify merges; the CSP soak has no collection endpoint; disclosures are unchecked.

**Fix.** Adopt HP-01..15, KEY-01/02, EMB-01, ORG-01 (origins contacted across the whole e2e run == docs/privacy-origins.json == privacy.html), ATTR-01, AUD-01, DEP-01, OBS-01; generate dist/_headers at build from one template keyed on $CONTEXT with per-path rules and NO site-wide framing rule for /embed.html; add report-uri /api/csp now; run the e2e suite against the enforcing candidate (the console gate captures securitypolicyviolation) then 14 days report-only in production; flip to enforce with hashes/nonces for inline scripts (SL-24 -> 0); remove unsafe-inline; keep RUM host(s) in connect-src while Netlify RUM runs; restrict Mapbox and Google keys by referrer (X1/X2).

**Acceptance test.** HP-01..15 green on a Deploy Preview; a foreign-origin page can iframe /embed.html but not /; ORG-01 fails when a new origin is added without disclosure; CSP enforced with 0 new violation signatures for 14 days; Observatory >= A+; KEY-01 returns 403 for a foreign Referer.

**Metric / grade moved.** Security (B -> A+), Privacy/legal (B+ -> A+); X1-X5, T-08, T-09, T-23, T-31

---

### qa-ci-14 - Function specs mapped to the H/D findings (first-run, keyboard, jump-state, search, minimap, ancestor, distance, walkthrough, help, mobile shell, deep links, seek safety, nav, embed)
Severity: high | Effort: L | audit_refs: H2, H3, H4, H5, H9, H11, H12, H13, D1, D3, D4 | depends_on: qa-ci-03, qa-ci-30

**Evidence.** Table 5.3 rows with code anchors: bundle.pretty.js:112951/113068 (gtbg_onboarded is the only persisted flag), :101542 "Fast-forwarding 3 days of battle...", :113033 Escape handler (ignores focused inputs per audit), :99821 `units · tick`, :101117 the only parsed deep link (?ancestor=), :97429 speed label, :103482 "Desktop View"; pagesB-01 (8 dead links); prov-recon P-22 (ghost units).

**Root cause.** Behaviour is verified by hand once per audit; nothing prevents re-breakage.

**Fix.** One spec per feature (5.3), each with >= 1 red proof on legacy before its fix and a registry entry with the audit id: first-run (layout persisted, auto-detect, splash), playback (labels, long tasks), jump-state (panels reset, toast <= 6 s, map flies), keyboard (Esc stack from inputs), search (natural sort, no alias rows, chip contrast), filter-legend-minimap (label == unitCount), unit-panel loop over 467, ancestor, distance-tool, walkthrough (stop 1 vs 8 iframe src), help (feedback <= 100 ms), mobile-shell, deeplink (9 link builders), seek-safety, extra-features-nav, embed.

**Acceptance test.** Each listed spec exists and is red on legacy for its audit id before the fix and green after; the traceability check (tag diff against docs/traceability.json) finds every H/D id covered.

**Metric / grade moved.** Core function (B/D -> A+), Usability (B-/D+ -> A+); H2-H5, H9, H11-H13, D1, D3, D4, P-22, P-62

---

### qa-ci-15 - Static-page suites for the 20 tool pages, legal pages, 404, embed and the guide PDF
Severity: medium | Effort: M | audit_refs: S1, S2, S3, S4, E1, E2, E3, E4, E5, G1, T1, T3 | depends_on: qa-ci-02, qa-ci-03

**Evidence.** site-lint: 12 pages without twitter:card, privacy/terms without og:image and canonical-in-sitemap; sitemap has 21 <loc> (/ + 20 tool pages; SL-06); user-guide.pdf: /Title and /Author "(anonymous)", no /Lang, no /MarkInfo or /StructTreeRoot, characters per page 1,577/503/2,034/270/1,695/916 (pages 2 and 4 under-filled); both URL forms serve 200 (HP-11); dashboard/regiment/report pages are sparse (S1).

**Root cause.** Sub-pages were hand-copied; every page re-implements head, nav and time logic and nothing checks them collectively.

**Fix.** subpages.spec (20 pages x 3 viewports: title/h1/main, console-zero, offline/retry UI, map poster then idle < 3 s, canvas painted, dashboard numeric cards and chart nodes on 10 cold loads, Living Ledger tick-1 value); seo-probe (single canonical URL form 301, sitemap == nav == files == canonical, JSON-LD validates, OG image decodes at 1200x630, historical sitemap URLs 200/301, internal link depth <= 3, >= 3 inbound links per tool page, 404 status+branding); DOC-01..07; SL-27/28; lychee nightly + external weekly.

**Acceptance test.** All pages pass; PDF DOC-01..04 green after regeneration with real metadata, /Lang, tags and >= 50%-of-median page fill; both URL forms collapse to one canonical with a single cache policy.

**Metric / grade moved.** SEO/metadata, Documentation, Fit-and-finish; S1-S4, E1-E5, G1, T1, T3

---

### qa-ci-16 - First-party RUM (web-vitals attribution), collector, evaluator, error and CSP beacons
Severity: high | Effort: L | audit_refs: P1, C5, X3, T2, X5 | depends_on: qa-ci-19, qa-ci-13

**Evidence.** Netlify RUM PDF: p75 badges Poor for LCP (>4000 ms), INP (>500 ms), CLS (>0.25), FCP (>3000 ms), FID Good; charts show min/avg/p75/p95/p99/max only, no alerting, no attribution; Web Analytics: 3,389 page views / 1,529 visitors in 30 days (~113/day) with ~18% of views from China/Singapore/Hong Kong/Germany; spikes Sep 7-8, 18, 26 unexplained; privacy.html names only Netlify RUM. rum/evaluate.mjs implemented with 6 passing tests (p75 nearest-rank, min-100 samples, bots excluded, page/warn/regress rules, new-error signatures).

**Root cause.** No field attribution or alerting; the audience is too small for daily p75s.

**Fix.** rum/web-vitals-beacon.js (web-vitals v5 attribution, sendBeacon text/plain, GPC/DNT honoured, bucketed viewport/DPR, sw/bot/layout/build dimensions, error + CSP beacons), netlify/functions/rum.mjs (schema gate, append-only Netlify Blobs writes, 4 KB cap, geo country only) and csp-report.mjs, scheduled compaction/evaluation, alert routing to issues + ntfy/Pushover, weekly digest (top LCP elements, INP targets, error signatures, bot/mobile share), privacy.html updated in the same PR, Netlify RUM kept as cross-check.

**Acceptance test.** Unit tests produce the expected alert classes; on staging a page load stores a metric within 5 s and the evaluator sees it; GPC/DNT sends nothing; no cookie is set; beacon <= 3 KB br; a synthetic bad deploy raises `regress` before `page`.

**Metric / grade moved.** Performance (field), Reliability; P1, C5, X3, T2

---

### qa-ci-17 - Synthetic production monitors, post-deploy smoke, alert routing and traffic hygiene
Severity: medium | Effort: M | audit_refs: T2, N1, C6 | depends_on: qa-ci-19

**Evidence.** tests/static/prod-probe.mjs executed against production: 10 of 15 fail; a later re-run hit UND_ERR_CONNECT_TIMEOUT from this machine (curl also timed out), which is why probes need retry/timeouts and exit code 2 for probe errors; traffic is only ~113 page views/day so hourly browser runs would inflate analytics by ~20%.

**Root cause.** No scheduled verification of production; naive probes distort tiny traffic and confuse network failure with site failure.

**Fix.** prod-monitor.yml: curl-probes + browser-smoke every 6 h and after each production deploy (repository_dispatch from a Netlify outgoing webhook); browser runs block the Netlify RUM host, send X-GTBG-Synthetic and a distinctive UA; SYN-01..SYN-08 (probe, smoke, version SHA, sitemap, daily views baseline, TLS/HSTS/domain expiry, Mapbox referrer + usage, data manifest hashes); failures open prod-incident issues; retry x3 with 15 s timeout.

**Acceptance test.** A forced failing probe opens an issue; a network timeout exits 2 (not a site FAIL); two weeks of runs add < 5% to Netlify page views; a bad deploy on staging triggers the auto-rollback workflow.

**Metric / grade moved.** Reliability, Security; T2, N1, C6

---

### qa-ci-18 - Parity harness, intended-diff registry, hermetic legacy build and cut-over gates
Severity: critical | Effort: L | audit_refs: N1, C1, C2, C3, C4, H2, H3, H4, H5, H9, H10, H11, H12, D3 | depends_on: qa-ci-03, qa-ci-30, prov-recon-03

**Evidence.** prov-recon.md 6.6 specifies tiers T1/T2/T3 and checkpoints; the registry logic is implemented and unit-tested here (tests/parity/intended-diffs.mjs, 4 passing tests: a different wrong date is a regression, expired entries stop excusing, stale entries reported); prov-recon T-12 (legacy renderer is history dependent) and 6.5 (pixels not comparable).

**Root cause.** The rebuild replaces a 2.28 MB unmaintained bundle with no way to know what it changed.

**Fix.** Implement section 6: /classic/ = frozen legacy bytes; parity.spec.ts snapshots text + accessible names + control geometry on both builds (Mapbox stubbed, fresh page, fake clock); T1 goldens for 675 ticks from the legacy pure functions; registry docs/parity/intended-diffs.json seeded with C1-C5, H2-H5, H9-H12, D3, P-22 (each with audit id and expiry); go/no-go criteria 6.6 (0 unexplained, 0 stale/expired, exact T1, console subset, scorecard A+, LH >= 0.90 floor, INP <= 200, real devices, AT log, rollback drill, 14-day opt-in beta, no freeze).

**Acceptance test.** legacy-vs-legacy: 0 diffs on 3 consecutive runs; a seeded regression (changed clock format) is reported as unexplained; an expired or stale entry fails --strict; all 12 go/no-go criteria are computed by cutover.yml.

**Metric / grade moved.** De-risks the rebuild; Core function, Historical consistency, Reliability; N1, C1-C4, H2-H5, H9-H12

---

### qa-ci-19 - Netlify pipeline: production branch, Deploy Previews, generated _headers, noindex previews, version.json, redirects, rollback workflow
Severity: high | Effort: M | audit_refs: N1, X4, T3, E5 | depends_on: qa-ci-01, qa-ci-02

**Evidence.** netlify.toml:2 publish "."; :83-85 embed overrides that do not work (verified live: XFO DENY + frame-ancestors * + report-only CSP); live /dashboard vs /dashboard.html send different Cache-Control; /index.html 200; no /version.json; Netlify credit table: Deploy Previews and Branch Deploys non-metered, production deploy 15 credits, Password Protection Pro-only; deploy-history 9.4 (/landing.html removed without redirect).

**Root cause.** Hand-written header cascades and a repo-root publish dir; no way to tell which build production is running.

**Fix.** Production branch `production` fast-forwarded by release.yml from a green SHA (required reviewer = owner); main = staging via branch deploy; preview.yml on deployment_status (fallback: poll commit status or CLI alias deploy); generate dist/_headers from a $CONTEXT template (per-path rules; X-Robots-Tag noindex on non-production); publish=dist + build command incl. site-lint/size-limit/asset-integrity; 301 collapse /index.html and /x.html; redirects for retired URLs; /version.json {app,data,timeModel,sha,builtAt,deployId}; Netlify outgoing webhook -> repository_dispatch; rollback.yml (publish previous deploy via API, verify endpoint) with L0-L3 runbook.

**Acceptance test.** Preview response has X-Robots-Tag noindex and production does not; HP-06/07 green; /index.html 301; /version.json SHA == promoted SHA; rollback drill completes < 1 min; promotion refused when a gate is red.

**Metric / grade moved.** Reliability, SEO, Security; N1, X4, T3, E5

---

### qa-ci-20 - Versioning, changelog, public "What's new", PR template and Definition of Done
Severity: medium | Effort: S | audit_refs: G1, H10, N1 | depends_on: qa-ci-19

**Evidence.** No version anywhere: user-guide has no version/date (G1); Help says 445+ vs 467 (H10); privacy.html "Last updated: September 7, 2026" is manual; prov-recon T-02 shows 4 different bodies under the name index-Cg8FAMXN.js (deploy-history 9.1 counts >= 40 contents under same-named bundles).

**Root cause.** Nothing ties a shipped byte, a data set or a document to a release.

**Fix.** SemVer app + CalVer data + integer timeModel in /version.json, Help -> About and the PDF footer; Conventional Commits; release-please (verify) generating CHANGELOG.md and a release PR; public /changelog.html with a Corrections section; PR template with the 8.1 checklist; CODEOWNERS; `fix:` requires Refs/audit label (CI check).

**Acceptance test.** version.json values render in About and PDF footer and RUM samples; a PR without the audit label fails; release PR generated from commits.

**Metric / grade moved.** Documentation, Fit-and-finish, Privacy/legal; G1, H10, N1

---

### qa-ci-21 - Cross-browser and real-device programme (iOS Safari, Samsung Internet, low-end Android, iPad)
Severity: medium | Effort: M | audit_refs: C1, C2, H3, P1 | depends_on: qa-ci-03

**Evidence.** audit "Not tested": real touch gestures on a physical phone, Safari/Firefox; Playwright WebKit is the engine, not iOS Safari (documented limitation); RUM Poor likely concentrated on low-end devices (assumption; mobile share unknown until QA-16 runs).

**Root cause.** Emulation cannot reproduce iOS fixed-position/visual-viewport/ITP behaviour, Samsung Internet dark-mode forcing, or low-end memory/WebGL limits.

**Fix.** Section 5.15 matrix; owner phones + one low-end Android kept for RCs; hosted device cloud only for a cut-over trial (prices unverified); docs/qa/rc-device-checklist.md (15 min/device); on-device Lighthouse over adb port forward; nightly WebKit/Firefox; optional w280 foldable row.

**Acceptance test.** RC checklist completed on iOS Safari, Android Chrome and the low-end device before each minor release; nightly WebKit/Firefox smoke green.

**Metric / grade moved.** Core function (mobile), Reliability, Performance (field realism); C1, C2, H3, P1

---

### qa-ci-22 - Ask-the-Historian evaluation harness (retrieval, abstention, grounding, injection, performance)
Severity: medium | Effort: L | audit_refs: H8 | depends_on: Historian architecture ADR, qa-ci-07

**Evidence.** historian.html:154-167 `score()` uses `t.includes(w)` (substring: "war" matches "toward") and adds a phrase bonus; :172 `div.innerHTML = html + ...` renders data as HTML; :177-190 returns the top 3 with no minimum relevance; audit H8: "why did Lee lose the war" -> Archer Captured; corpus today 467 regiments, 24 vignettes, 137 chronology events, 30 terrain features.

**Root cause.** No way to measure answer quality; corpus expansion would multiply an unmeasured, injectable pipeline.

**Fix.** HC-01..HC-15 (5.14): corpus schema + provenance + license allowlist + dedupe + entity linking + PII scan; golden set >= 200 questions (recall@5 >= 0.90, MRR >= 0.70, no metric drop > 2 points), abstention (>= 0.95 precision) including the "Lee lost the war" negative, grounding (every number/date/unit in an answer appears in cited passages), hostile-passage XSS/prompt-injection fixtures, tokenization word-boundary unit tests, performance and index-size budgets, UI overlap/aria-live, claims registry for the page's self-description, nightly LLM-mode rubric run (pinned model, temperature 0).

**Acceptance test.** HC-06 recall/MRR reported on the golden set in <= 60 s; the abstention regression and XSS fixture pass; changing ranking or corpus that drops a metric > 2 points fails CI.

**Metric / grade moved.** Concept/content depth, Core function, Security; H8

---

### qa-ci-23 - Scorecard, gate catalogue, PR comment and weekly report ("A+ stays A+")
Severity: high | Effort: M | audit_refs: N1 | depends_on: qa-ci-02, qa-ci-03

**Evidence.** tools/scorecard.mjs (50 lines, 4 tests pass) + tools/gates.json (109 gates) executed: data F/F, polish F/F, usability B/B, reliability F/F, performance D/F, a11y F/F, seo B/B, security F/F, docs A- (thin: 1 gate), privacy F/F; content, design, function unmeasured (no gates yet). Thin-category guard (< 6 gates cannot exceed A-) and "not run = failed" implemented.

**Root cause.** Grades are subjective and cannot regress-protect.

**Fix.** Adapters (Playwright JSON -> gate ids via @cat/@audit tags, Lighthouse assertions -> gates, static/DV/HP outputs already gate-shaped), PR comment with delta, weekly digest, docs/scorecard.md history, docs/traceability.json diffed against @audit tags so deleting a test needs deleting its claim; A+ requires two consecutive weekly runs.

**Acceptance test.** An uncatalogued gate id fails CI; a catalogued gate that did not run is red; a category below 6 gates cannot be A+; the exit code is 0 only when all 13 categories are A+ on both device classes.

**Metric / grade moved.** Overall grade governance (all 13 rows)

---

### qa-ci-24 - Flake management and test health
Severity: medium | Effort: S | audit_refs: (new) | depends_on: qa-ci-03

**Evidence.** A solo owner will ignore a flaky red; the plan adds Playwright retries, sharding and several timing-sensitive tests (SW lifecycle, map idle, LCP).

**Root cause.** No policy for retries, quarantine, runtime budgets or ownership.

**Fix.** retries: 1; a pass-on-retry is reported flaky and opens/updates an issue (tools/flake-report.mjs); two flaky reports in 7 days quarantine (test.fixme + issue + 14-day expiry, expired quarantines fail); tier runtime budgets as gates (T1 8 min, T2 35 min); determinism checklist in fixtures/base.ts; artifacts 14 days; CODEOWNERS per spec.

**Acceptance test.** 30 consecutive CI runs on an unchanged commit show < 1% flaky; an expired quarantine fails the build; T1 over 8 min fails.

**Metric / grade moved.** Reliability of the quality system itself

---

### qa-ci-25 - Golden / fixture / secret governance
Severity: medium | Effort: S | audit_refs: X1, X2 | depends_on: qa-ci-01

**Evidence.** Goldens (tick-clock.csv, keyframes.json, intended-diffs.json, visual PNGs) become the spec; tokens: Mapbox pk. literals in 9 HTML pages + bundle (SL-26), 12 stale bundles and .env.local copies in Downloads (deploy-history section 8).

**Root cause.** Regenerating a golden or widening a token silently changes what "correct" means.

**Fix.** Each golden has a documented regeneration command and a CODEOWNERS review; golden diffs must be in the PR description; a separate MAPBOX_PUBLIC_TOKEN_CI restricted to preview/CI origins so CI never spends the production quota and the production token stays URL-restricted; job-level permissions blocks; gitleaks on push and once on full history before the repo is ever made non-private; rotate keys that lived in archived envs.

**Acceptance test.** A PR that changes a golden without the regeneration note fails the template check; gitleaks finds 0 secrets in history; CI token cannot load the production style from a foreign origin.

**Metric / grade moved.** Security, Reliability; X1, X2

---

### qa-ci-26 - QA documentation, ADRs and runbooks
Severity: low | Effort: S | audit_refs: (new) | depends_on: qa-ci-01

**Evidence.** docs/ does not exist; decisions (Lighthouse runner, visual tool, RUM storage, budgets) would otherwise live only in chat.

**Root cause.** No durable record of why the system is shaped this way.

**Fix.** docs/qa/README.md (how to run each tier locally, tags, hooks contract), ADRs 0003 Lighthouse runner, 0004 visual tool, 0005 RUM storage, runbooks rollback/incident/cutover, rc-device-checklist, at-test-log, usability-log, expert-review-log.

**Acceptance test.** A new contributor can run T1 locally from the README; every runbook has a dated drill entry.

**Metric / grade moved.** Documentation

---

### qa-ci-27 - Manual programmes and the claims registry (AT, usability, expert review, copy)
Severity: medium | Effort: M | audit_refs: H8, H10, H13, G1 | depends_on: qa-ci-03

**Evidence.** H8 (overpromising names), H10 (467 vs 445+), H13 (Soldier's Eye hand-off) and G1 (guide claims Esc closes any panel; says Street View panoramas) are claims that drifted from behaviour; automation cannot judge historical accuracy or usability.

**Root cause.** Claims are prose, not contracts.

**Fix.** docs/claims.json {id, text, where[], test}; data-claim attributes in copy; lint fails on unknown ids or non-green tests; cadences: AT each RC (15 tasks), usability session at cut-over and yearly (5 participants, SUS >= 85, success >= 90%), two-reviewer expert log for any data release touching anchors/counts/casualties/vignettes, copy review each release.

**Acceptance test.** Every data-claim id resolves to a green test; logs exist and are within their cadence before promotion.

**Metric / grade moved.** Usability, Concept/content depth, Historical consistency, Documentation; H8, H10, H13, G1

---

### qa-ci-28 - Gate the bridge patches to the frozen bundle
Severity: medium | Effort: M | audit_refs: C1, C3, C5, C6 | depends_on: qa-ci-02, qa-ci-18

**Evidence.** prov-recon.md 6.10: bridge patches by exact-string replacement with asserted occurrence count and new hashed filename; app-time.md 3.3: in-place patching of a hashed bundle defeats cache-busting; prov-recon T-02: 4 bodies under one name; UG-01 flags exactly 4 identifiers.

**Root cause.** Interim fixes are the riskiest edits in the plan (2.28 MB minified file, no source).

**Fix.** Each patch run must: pass UG-01; assert exactly one occurrence per replacement and refuse a second run; emit a content-hashed filename and pass asset-integrity; rewrite index.html, sw.js precache and lazy-chunk imports and pass SL-01/22; run the parity subset (first-run, tick 1/538, mobile shell, ancestor) with the patch's intended-diff entries; commit patch-report.json (before/after hashes, counts).

**Acceptance test.** Applying a patch twice fails; a patch that leaves an undefined identifier fails UG-01; renaming without updating sw.js fails SL-22; a patch report exists per release.

**Metric / grade moved.** Reliability during the interim; C1, C3, C5, C6

---

### qa-ci-29 - Third-party inventory, attribution and audio-policy tests
Severity: medium | Effort: S | audit_refs: X5 | depends_on: qa-ci-13

**Evidence.** SL-18: peerjs.com, cdn.jsdelivr.net, nps.gov used but not named on privacy.html; prov-recon T-09: Mapbox attribution disabled on the mobile map (bundle.pretty.js:102988) and the walkthrough map (110777); T-07: sound path references undefined CanvasRenderer (96556) while the banner promises sound; Watch Together loads peerjs@1.5.4 from jsDelivr (watch-together.html:19).

**Root cause.** Licence and disclosure obligations are not tested.

**Fix.** ORG-01 (contacted origins across the whole e2e run == docs/privacy-origins.json == privacy text), ATTR-01 (attribution control visible and unclipped on every map), AUD-01 (no AudioContext before a user gesture; default matches documented policy), third-party script SRI/pin check.

**Acceptance test.** Adding a new origin without a disclosure fails ORG-01; mobile map without attribution fails ATTR-01; AudioContext created on load fails AUD-01.

**Metric / grade moved.** Privacy/legal, Security; X5, T-09, T-07

---

### qa-ci-30 - Testability requirements for the rebuild (hooks contract)
Severity: medium | Effort: S | audit_refs: N1, C3, C4, D3 | depends_on: prov-recon-14, prov-recon-16

**Evidence.** bundle.pretty.js has no data-testid and no aria/role in app code (prov-recon T-33); deep links are dead (pagesB-01); the app exposes no state (legacy driver reads "Tick N/675" text).

**Root cause.** Without hooks every suite degrades to fragile text scraping.

**Fix.** Requirements (3.5): URL hooks (?intro=0, layout, tick, panel, test=1, motion, contrast); window.__gtbg (state, seek, play, unitsAt, labelCollisions, mapInstances, swState) only when test=1; real roles/names (getByRole); data-testid only for role-less items; data-overlap-ignore and data-historical-quote markers; <html data-build data-layout>; /version.json.

**Acceptance test.** The rebuild's first CI run passes the hooks smoke spec (`__gtbg.state().ready`, unitsAt(1).length > 0, labelCollisions() is a number, version.json matches); the legacy driver is no longer needed for new specs.

**Metric / grade moved.** Enabler for Core function, Fit-and-finish, Accessibility; C1-C4, D3

---

## 13. Risks, uncertainties and open questions

### 13.1 What is executable now versus specification only

| Component | Status | Where |
|---|---|---|
| `site-lint` (SL-01..26), `undef-globals` (UG-01), `asset-integrity` (AI-01..03), `prod-probe` (HP-01..15) | **executed** on the real files/headers; outputs in Appendix C | `tmp-qa-ci/sketches/tests/static/` |
| DV-01..15 + ratchet registry, time-model fallback | **executed**; ratchet behaviour proven (15/15, 12 failing, 1 stale) | `tests/data/`, `tests/support/time-model.mjs` |
| `assert-lh` + `budgets.json` | **executed** against `lh_mobile.json` / `lh_desktop.json` | `perf/` |
| `scorecard` (+ thin-category and not-run rules) | **executed** on 109 gates; 4 unit tests | `tools/` |
| `layout-audit.browser.js` geometry, `intended-diffs`, `rum/evaluate`, `gen-headers` | 25 unit tests **pass** (node:test, no browser) | `tests/lib`, `tests/parity`, `rum`, `tools` |
| Playwright specs (11 TypeScript files), workflows (4 YAML) | **syntax-checked only** (TS type-stripped then `node --check`; YAML parsed with PyYAML); never run against a browser | `tests/e2e`, `tests/a11y`, `.github/workflows` |
| `run-lighthouse.mjs`, `web-vitals-beacon.js`, `rum.mjs` | syntax-checked; import paths and Netlify API shapes marked `(verify)` | `perf/`, `rum/`, `netlify/functions/` |
| Spec-only (designed, not written): `seo-probe.mjs`, `tools/adapt-playwright.mjs`, `tools/flake-report.mjs`, `rum/fetch-and-evaluate.mjs`, `tools/assert-observatory.mjs`, `cutover.yml`, `rollback.yml`, `release.yml`, DV-16..30, SL-27..30, DOC-05..07, HC-01..15, detector self-test fixture pages | described with assertions | sections 5-7 |

### 13.2 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Legacy click-paths in `driver.ts` (chooser card labels, keyboard step size, "Tools" label) are derived from the audit and bundle strings, not from a live run | first red run may need selector fixes | selectors isolated in one file, each marked `(verify)`; Phase 1 exit gate requires 20 consecutive infra-clean runs |
| The layout detector produces false positives on legitimate layered UI (map controls, tooltips) | erodes trust | `data-overlap-ignore`, allowlist with audit id + expiry, detector self-test fixtures, allowlist count may only fall |
| PR tier is too slow for a solo workflow | gates get bypassed | runtime gates (T1 8 min, T2 35 min); prune states before viewports; nightly carries the full matrix |
| Visual baselines flake across fonts/OS | noisy diffs | pinned container image, local font/Mapbox fixtures, Linux-only snapshot template, 3-run determinism acceptance |
| `deployment_status` may not fire from Netlify's GitHub app | T2 never runs | documented fallbacks: poll commit status or `netlify deploy --alias` from CI |
| RUM sample too small for statistics (~113 views/day) | alerts either silent or noisy | 7-day windows, n >= 100, `insufficient` state, human-only population, lab gates remain primary |
| Synthetic runs distort analytics/RUM | metrics polluted | curl probes, 4 runs/day, blocked Netlify RUM host, distinctive UA/header |
| Cookie from Netlify Split Testing conflicts with "no cookies" privacy claim | legal/privacy inconsistency | opt-in beta instead of percentage split; if split testing is used, update `privacy.html` first |
| Third-party pricing/plan assumptions (device clouds, GitHub minutes, Netlify plan) | budget surprises | all marked `(verify)`; recommended path uses owner-owned devices |
| CSP enforcement breaks a rarely used feature (AR, Watch Together, NPS tour) | user-visible breakage | e2e against the enforcing candidate covers these pages; 14-day report-only soak; L0 flag and L1 rollback |
| Historical accuracy cannot be automated | consistency != truth | provenance gates + two-reviewer log + public corrections log; DV-07/12 are candidates for review, not auto-fixes |
| The rebuild slips and the harness sits idle | wasted effort | Phases 0-3 are valuable on the legacy site alone (section 11.1 minimum viable set) |

### 13.3 Facts I could not verify (all flagged `(verify)` where used)

- Playwright container tag `v1.50.0-noble` and the current Playwright version at adoption; that Lighthouse 13's `desktop-config.js` import path is unchanged; whether a newer `@lhci/cli` than 0.15.1 now bundles Lighthouse 13 (the releases page I could read did not say so).
- That Netlify's GitHub app emits `deployment_status` for Deploy Previews; the exact precedence when both `_headers` and `netlify.toml` headers exist (the plan avoids it by generating one file and deleting the toml `[[headers]]`); the Netlify API endpoint for restoring a deploy; the name/lifetime of the Split Testing cookie; whether Netlify Analytics can exclude requests by header/UA.
- `@netlify/blobs` and Functions v2 details (`config.path`, `context.geo` field names); function cost at this volume (negligible by the credit table, not measured).
- web-vitals v5 attribution field names for LCP/INP/CLS (they changed between v3 and v4); browser support for `navigator.globalPrivacyControl`.
- Prices and availability of BrowserStack, LambdaTest, Sauce, AWS Device Farm; ntfy/Pushover free-tier limits; Mapbox statistics API access; Observatory CLI package name/flags; release-please options; the PDF/UA checker to use.
- Lighthouse scoring control points quoted from memory (mobile FCP 1.8 s / LCP 2.5 s / TBT 200 ms / SI 3.4 s; desktop FCP 0.93 s / LCP 1.2 s / TBT 150 ms / SI 1.3 s): the runner also asserts per-metric `score >= 0.9`, which does not depend on the recalled numbers.
- Share of mobile traffic (not in the exported PDFs) and whether the ~18% foreign-country views are bots (audit assumption).
- Browser-level "red today" claims (marked `R`): C1, C2, H1-H4, H11-H13, D1, D3, D4, S1-S4 rely on the audit's measurements and on code reading; the detector and specs have not been run in a browser here.

### 13.4 Open questions for the owner

1. **Canonical URL form**: extensionless (`/dashboard`) or `.html` (what the sitemap uses)? The gates and redirects need one answer (T3).
2. **Brand name** (E2): "Animated Battlefield Map" vs "Interactive Map"? SL-27 needs `docs/brand.json`.
3. **Sound policy** (T-07): keep or remove? AUD-01 encodes whichever policy you choose.
4. **Netlify plan**: confirm Pro (your 30-day history suggests it) so Password Protection for previews is available if wanted; confirm GitHub plan/minutes for private-repo Actions.
5. **Reviewers**: who are the two people for the expert/historian review log, and is a licensed battlefield guide or NPS historian available?
6. **Real devices**: which phones do you own (iOS version, Android model)? One low-end Android is the single most valuable purchase for this programme.
7. **Alert channel**: GitHub issues only, or also a push channel (ntfy/Pushover)?
8. **Freeze windows**: confirm June 25 - July 5 and Nov 15-20, or supply your own traffic calendar once SYN-05 has data.

---

## Appendix A. The ten most important tests (code sketches)

All code below is the exact content of the files in `plan-work/tmp-qa-ci/sketches/` (assembled into this report by script, so what you read is what was checked). Verification level per file: `.mjs`/`.js` pure logic **executed** with `node --test`; `.ts` Playwright specs **type-stripped and syntax-checked** (`node:module.stripTypeScriptTypes` then `node --check`), never run against a browser here; Playwright/Netlify API shapes that could not be confirmed are marked `(verify)` in comments. Run everything with `pnpm exec playwright test` (browser) and `node --test tests/lib tests/parity rum tools tests/data` (logic).

| # | Test | Audit ids | Section |
|---|---|---|---|
| 1 | tappability of every control at every phone viewport | C1, C2, A3 | A.1 |
| 2 | overlap / occlusion / clipping / size detector | H1, C2, S4, A4, D2 | A.2 |
| 3 | one clock, one date | C3, C4, H9 | A.3 |
| 4 | service worker: first visit, update, poisoning | C6, DH-02/03 | A.4 |
| 5 | console / pageerror / request / CSP gate + interaction coverage | C5, C7, P5, X3 | A.5 |
| 6 | Lighthouse budgets and assertions | P1-P7 | A.6 |
| 7 | accessibility state matrix + behaviours | A1-A6, H2, H6 | A.7 |
| 8 | data validators with ratchet registry | C4, H5, H7, H10, DV-xx | A.8 |
| 9 | parity harness + intended-diff registry | N1 | A.9 |
| 10 | RUM beacon, collector and alert evaluator | P1 | A.10 |

### A.0 Shared configuration: viewport matrix, Playwright projects, driver, state catalogue

`tests/support/viewports.json` (24 rows, single source of truth):

```json
[
  { "id": "w320-p",  "w": 320,  "h": 568,  "dpr": 2,     "mobile": true,  "touch": true,  "tier": "pr",   "note": "iPhone SE 1st gen / 400% zoom of a 1280 window (WCAG 1.4.10 reflow)" },
  { "id": "w320-l",  "w": 568,  "h": 320,  "dpr": 2,     "mobile": true,  "touch": true,  "tier": "full" },
  { "id": "w360-p",  "w": 360,  "h": 740,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "full", "note": "most mid-range Android (Galaxy A/S)" },
  { "id": "w360-l",  "w": 740,  "h": 360,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "full" },
  { "id": "w375-p",  "w": 375,  "h": 812,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "pr",   "note": "audit reference phone (iPhone X/11 Pro/12 mini)" },
  { "id": "w375-s",  "w": 375,  "h": 667,  "dpr": 2,     "mobile": true,  "touch": true,  "tier": "full", "note": "iPhone SE 2/3: short portrait" },
  { "id": "w375-l",  "w": 812,  "h": 375,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "pr" },
  { "id": "w390-p",  "w": 390,  "h": 844,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "full" },
  { "id": "w390-l",  "w": 844,  "h": 390,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "full" },
  { "id": "w412-p",  "w": 412,  "h": 915,  "dpr": 2.625, "mobile": true,  "touch": true,  "tier": "pr",   "note": "Pixel 6/7/8, Samsung Plus" },
  { "id": "w412-l",  "w": 915,  "h": 412,  "dpr": 2.625, "mobile": true,  "touch": true,  "tier": "full" },
  { "id": "w430-p",  "w": 430,  "h": 932,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "full", "note": "iPhone 14/15 Plus / Pro Max" },
  { "id": "w430-l",  "w": 932,  "h": 430,  "dpr": 3,     "mobile": true,  "touch": true,  "tier": "full" },
  { "id": "w768-p",  "w": 768,  "h": 1024, "dpr": 2,     "mobile": true,  "touch": true,  "tier": "pr",   "note": "iPad mini / 10.2in: the layout-chooser boundary" },
  { "id": "w768-l",  "w": 1024, "h": 768,  "dpr": 2,     "mobile": true,  "touch": true,  "tier": "full" },
  { "id": "w1024-p", "w": 1024, "h": 1366, "dpr": 2,     "mobile": true,  "touch": true,  "tier": "full", "note": "iPad Pro 12.9 portrait" },
  { "id": "w1024-s", "w": 1024, "h": 600,  "dpr": 1,     "mobile": false, "touch": false, "tier": "full", "note": "small laptop, short window" },
  { "id": "w1280-s", "w": 1280, "h": 600,  "dpr": 1,     "mobile": false, "touch": false, "tier": "full", "note": "desktop 'landscape' analogue: short window with devtools/toolbars" },
  { "id": "w1280-d", "w": 1280, "h": 800,  "dpr": 1,     "mobile": false, "touch": false, "tier": "pr" },
  { "id": "w1440-d", "w": 1440, "h": 900,  "dpr": 1,     "mobile": false, "touch": false, "tier": "pr",   "note": "audit reference desktop" },
  { "id": "w1440-t", "w": 1440, "h": 2560, "dpr": 1,     "mobile": false, "touch": false, "tier": "full", "note": "rotated monitor (portrait)" },
  { "id": "w1920-d", "w": 1920, "h": 1080, "dpr": 1,     "mobile": false, "touch": false, "tier": "pr" },
  { "id": "w2560-d", "w": 2560, "h": 1440, "dpr": 1,     "mobile": false, "touch": false, "tier": "full" },
  { "id": "w2560-u", "w": 2560, "h": 1080, "dpr": 1,     "mobile": false, "touch": false, "tier": "full", "note": "ultrawide" }
]
```

`playwright.config.ts`:

```ts
// playwright.config.ts -- one project per viewport row of tests/support/viewports.json (generated, never hand-listed)
import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

type VP = { id: string; w: number; h: number; dpr: number; mobile: boolean; touch: boolean; tier: 'pr' | 'full'; note?: string };
const viewports: VP[] = JSON.parse(fs.readFileSync('tests/support/viewports.json', 'utf8'));

const TIER = process.env.TIER ?? 'pr';                       // pr | full   (full = nightly)
const DRIVER = process.env.DRIVER ?? 'next';                // legacy | next   (legacy = today's minified app, click-path driver)
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';

// Chromium runs the FULL matrix in nightly, the 8 'pr' rows on every PR. WebKit/Firefox run a fixed 4-row smoke matrix
// (Firefox has no isMobile emulation; WebKit is not iOS Safari: real-device job covers that gap).
const chromium = viewports
  .filter((v) => TIER === 'full' || v.tier === 'pr')
  .map((v) => ({
    name: `chromium-${v.id}`,
    metadata: { viewport: v, driver: DRIVER },
    use: {
      ...(v.mobile ? devices['Pixel 7'] : devices['Desktop Chrome']),   // UA + client hints only; geometry is overridden below
      viewport: { width: v.w, height: v.h },
      deviceScaleFactor: v.dpr,
      isMobile: v.mobile,
      hasTouch: v.touch,
    },
  }));

const smoke = ['w375-p', 'w768-p', 'w1440-d', 'w812-l'].flatMap((id) => {
  const v = viewports.find((x) => x.id === id) ?? viewports.find((x) => x.id === 'w375-l')!;
  return [
    { name: `webkit-${v.id}`, metadata: { viewport: v, driver: DRIVER }, use: { ...(v.mobile ? devices['iPhone 13'] : devices['Desktop Safari']), viewport: { width: v.w, height: v.h } } },
    ...(v.mobile ? [] : [{ name: `firefox-${v.id}`, metadata: { viewport: v, driver: DRIVER }, use: { ...devices['Desktop Firefox'], viewport: { width: v.w, height: v.h } } }]),
  ];
});

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'a11y/**/*.spec.ts', 'visual/**/*.spec.ts', 'parity/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,                         // one retry, and a retry that PASSES is reported as flaky -> ticket (see flake policy)
  workers: process.env.CI ? 4 : undefined,
  timeout: 45_000,
  expect: { timeout: 7_000, toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' } },
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'reports/junit.xml' }], ['json', { outputFile: 'reports/results.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',                               // SW tests opt back in with test.use({ serviceWorkers: 'allow' })
    reducedMotion: 'no-preference',
    colorScheme: 'dark',
  },
  projects: [...chromium, ...smoke],
  webServer: process.env.BASE_URL ? undefined : { command: 'pnpm preview --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
```

`tests/support/driver.ts` (one way to reach a state on legacy and rebuilt apps) and `tests/support/states.ts` (state catalogue):

```ts
// tests/support/driver.ts -- one way to reach an app state on BOTH builds.
//   DRIVER=next   : URL test hooks (?intro=0&layout=mobile&tick=T&panel=tools&test=1) + window.__gtbg (needs the rebuild, app-a11y-26)
//   DRIVER=legacy : today's minified app, reached with the click paths below. Selectors marked (verify) were derived from the
//                   audit + bundle strings and MUST be confirmed on the first red run; keep them here and nowhere else.
import type { Page } from '@playwright/test';

const DRIVER = process.env.DRIVER ?? 'next';
export type Layout = 'desktop' | 'mobile';

export async function openApp(page: Page, o: { layout: Layout; tick?: number; panel?: string; driver?: 'legacy' | 'next' }) {
  if ((o.driver ?? DRIVER) === 'next') {
    const q = new URLSearchParams({ intro: '0', layout: o.layout, test: '1', ...(o.tick ? { tick: String(o.tick) } : {}), ...(o.panel ? { panel: o.panel } : {}) });
    await page.goto(`/?${q}`);
    await page.waitForFunction(() => (window as any).__gtbg?.state().ready === true);
    return;
  }
  // ---- legacy -----------------------------------------------------------------------------------------------
  await page.addInitScript(() => localStorage.setItem('gtbg_onboarded', '1'));          // key: bundle.pretty.js:112951, :113068
  await page.goto('/');
  // the boot splash "Fast-forwarding 3 days of battle..." (bundle.pretty.js:101542) blocks ~15 s (audit H3): wait for the chooser
  await page.getByText(/choose your experience/i).waitFor({ timeout: 40_000 });          // (verify) text from the audit
  await page.getByText(o.layout === 'mobile' ? /mobile/i : /desktop/i).first().click();   // (verify) card labels
  await page.getByText(/Tick\s+\d+\s*\/\s*675/).first().waitFor();                       // HUD text: bundle.pretty.js ~112202 (IO)
  if (o.tick) await seekLegacy(page, o.tick);
}

/** Legacy has no seek hook and its ?tick= deep link is dead (pagesB-01): step with the keyboard until the HUD shows the tick. */
export async function seekLegacy(page: Page, target: number) {
  for (let guard = 0; guard < 700; guard++) {
    const txt = await page.getByText(/Tick\s+\d+\s*\/\s*675/).first().innerText();
    const cur = Number(/Tick\s+(\d+)/.exec(txt)![1]);
    if (cur === target) return;
    await page.keyboard.press(cur < target ? 'ArrowRight' : 'ArrowLeft');                 // (verify) step size per Help -> shortcuts
  }
  throw new Error(`could not seek to tick ${target}`);
}

export async function readState(page: Page): Promise<{ tick: number; dateLabel: string; clockLabel: string; layout: string; mapCount: number } | null> {
  return page.evaluate(() => (window as any).__gtbg?.state() ?? null);                    // null on legacy -> tests fall back to DOM text
}
```

```ts
// tests/support/states.ts -- the UI state catalogue that every matrix test iterates (tappability, overlap, axe, visual).
// A state is a function that brings a fresh page to that state. Adding a panel to the product = adding a line here (DoD item).
import type { Page } from '@playwright/test';
import { openApp } from './driver';

export type StateFn = (page: Page) => Promise<void>;
const key = (k: string) => (p: Page) => p.keyboard.press(k);
const click = (name: RegExp) => (p: Page) => p.getByRole('button', { name }).or(p.getByText(name)).first().click();

export const states: Record<string, { layout: 'desktop' | 'mobile'; run: StateFn }> = {
  'desktop-home':        { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 1 }); } },
  'desktop-day3-dense':  { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 538 }); } },
  'desktop-search':      { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 28 }); await key('s')(p); } },
  'desktop-legend':      { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 28 }); await key('l')(p); } },
  'desktop-help':        { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 28 }); await key('?')(p); } },
  'desktop-ancestor':    { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 264 }); await click(/follow your ancestor/i)(p); } },
  'desktop-walkthrough': { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 1 }); await click(/virtual walkthrough/i)(p); } },
  'desktop-extra-menu':  { layout: 'desktop', run: async (p) => { await openApp(p, { layout: 'desktop', tick: 1 }); await p.locator('#ef-btn').click(); } },  // the injected overlay (H1); becomes a toolbar item in next
  'mobile-home':         { layout: 'mobile',  run: async (p) => { await openApp(p, { layout: 'mobile', tick: 1 }); } },
  'mobile-tools-sheet':  { layout: 'mobile',  run: async (p) => { await openApp(p, { layout: 'mobile', tick: 1 }); await click(/tools/i)(p); } },   // C2
  'mobile-story':        { layout: 'mobile',  run: async (p) => { await openApp(p, { layout: 'mobile', tick: 28 }); } },
  'mobile-help':         { layout: 'mobile',  run: async (p) => { await openApp(p, { layout: 'mobile', tick: 1 }); await click(/tools/i)(p); await click(/help/i)(p); } },
};
export const MOBILE_STATES = Object.keys(states).filter((k) => states[k].layout === 'mobile');
export const DESKTOP_STATES = Object.keys(states).filter((k) => states[k].layout === 'desktop');
```

### A.1 Test 1: every control is fully tappable (C1, C2)

```ts
// TEST 1 of 10 -- tests/e2e/tappability.spec.ts  (audit C1, C2, A3, H3)
// "Can a thumb hit every control?"  Enumerate EVERY interactive element in each mobile state (no hand-written selector list, so a new
// control cannot escape) and ask Playwright to perform a TRIAL click: it runs all actionability checks (visible, stable, enabled,
// scrolled into view, and -- the important one -- "receives events": the element must be the hit target at its click point)
// without dispatching the click. On today's build this fails at every phone width:
//   C1  Back/Play/Next/Fwd at x=-213..-29      -> "Element is outside of the viewport"
//   C2  Legend/Bookmarks/Help/Mini Map/Desktop View -> "<div ...timeline...> intercepts pointer events"
import { test, expect } from '../fixtures/base';
import { states, MOBILE_STATES } from '../support/states';

for (const sid of MOBILE_STATES) {
  test(`@cat:function @audit:C1,C2 every control is fully tappable in "${sid}"`, async ({ page }, info) => {
    const vp = info.project.metadata.viewport;
    test.skip(!vp.touch, 'touch viewports only');
    await states[sid].run(page);
    await page.addScriptTag({ path: 'tests/lib/layout-audit.browser.js' });

    const controls: { qa: number; sel: string; name: string; w: number; h: number }[] = await page.evaluate(() => (window as any).__layoutAuditList());
    expect(controls.length, `state "${sid}" exposes interactive controls`).toBeGreaterThan(3);

    const failures: string[] = [];
    for (const c of controls) {
      try {
        await page.locator(`[data-qa="${c.qa}"]`).click({ trial: true, timeout: 1_500 });   // hit-target + viewport + stability, no side effects
      } catch (e) {
        const why = String((e as Error).message).split('\n').map((l) => l.trim()).find((l) => /outside of the viewport|intercepts pointer|not visible|not stable/.test(l)) ?? 'not actionable';
        failures.push(`${c.sel} "${c.name}" (${c.w}x${c.h}): ${why}`);
      }
      if (c.w < 44 || c.h < 44) failures.push(`${c.sel} "${c.name}": ${c.w}x${c.h} is below the 44x44 touch target`);   // BRIEF quality bar
    }
    await info.attach('tappability.json', { body: JSON.stringify({ viewport: vp.id, state: sid, controls: controls.length, failures }, null, 1), contentType: 'application/json' });
    expect(failures, `untappable / undersized controls at ${vp.w}x${vp.h}`).toEqual([]);
  });
}

// The named regression tests for the two headline bugs (run on the rebuilt app, where controls have accessible names):
test('@cat:function @audit:C1 transport row: Prev/Play/Next stay on-screen at every width', async ({ page }, info) => {
  const vp = info.project.metadata.viewport;
  test.skip(!vp.touch || process.env.DRIVER === 'legacy');
  await states['mobile-home'].run(page);
  for (const name of [/previous/i, /play|pause/i, /next/i, /back 1 hour/i, /forward 1 hour/i]) {
    await expect(page.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
  }
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollW, 'no horizontal page overflow').toBeLessThanOrEqual(vp.w);
});

test('@cat:function @audit:C2 "Desktop View" (the only way out of the mobile layout) is reachable', async ({ page }, info) => {
  test.skip(!info.project.metadata.viewport.touch);
  await states['mobile-tools-sheet'].run(page);
  await page.getByRole('button', { name: /desktop view/i }).or(page.getByText(/desktop view/i)).first().click({ trial: true });
});
```

### A.2 Test 2: overlap, occlusion, clipping, size and font-floor detector (H1, C2, S4, A4)

Spec:

```ts
// TEST 2 of 10 -- tests/e2e/layout-audit.spec.ts  (audit H1, C2, S4, A3, A4, D2, D3, H3-splash, H6, S4-compare-tabs)
// The overlap / occlusion / clipping / target-size / font-floor sweep. One generic detector (tests/lib/layout-audit.browser.js) runs
// on EVERY catalogued state at EVERY viewport of the matrix. Rules: OFFSCREEN, OCCLUDED, OVERLAP, CLIPPED_TEXT, H_OVERFLOW,
// TARGET_SIZE, FONT_FLOOR. Known, accepted overlaps live in tests/overlap-allowlist.json with an audit id and an EXPIRY date;
// an expired entry stops suppressing, so "temporary" exceptions cannot become permanent.
//   H1  floating "Ask the Historian / Extra Features" overlay (#extra-features, z-index 999999) on the story panel / chooser / help
//   C2  timeline bar covering the tools sheet         S4 dashboard chart 1000px wide -> H_OVERFLOW on 375     splash "ETTYSBURC" -> CLIPPED_TEXT
import fs from 'node:fs';
import { test, expect } from '../fixtures/base';
import { states } from '../support/states';

const allow = JSON.parse(fs.readFileSync('tests/overlap-allowlist.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);

for (const [sid, s] of Object.entries(states)) {
  test(`@cat:polish layout audit "${sid}"`, async ({ page }, info) => {
    const vp = info.project.metadata.viewport;
    test.skip(s.layout === 'mobile' && vp.w > 1024, 'mobile layout only below the desktop breakpoint');
    test.skip(s.layout === 'desktop' && vp.w < 768, 'desktop layout is not offered on phones (H3)');
    await states[sid].run(page);
    await page.addScriptTag({ path: 'tests/lib/layout-audit.browser.js' });
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    const violations: { rule: string; sel: string; detail: string; other?: string }[] =
      await page.evaluate((o) => (window as any).__layoutAudit(o), { coarse, allow, today });

    await info.attach('layout-violations.json', { body: JSON.stringify(violations, null, 1), contentType: 'application/json' });
    const summary = violations.map((v) => `${v.rule} ${v.sel}${v.other ? ' <-> ' + v.other : ''}: ${v.detail}`);
    expect(summary, `layout violations in "${sid}" at ${vp.w}x${vp.h}`).toEqual([]);
  });
}

// Text-size / spacing stress (WCAG 1.4.4, 1.4.12): same detector after forcing 200% root text and the standard spacing overrides.
test('@cat:a11y layout survives 200% text + WCAG text-spacing overrides (home, phone + desktop)', async ({ page }, info) => {
  const vp = info.project.metadata.viewport;
  await states[vp.touch ? 'mobile-home' : 'desktop-home'].run(page);
  await page.addStyleTag({ content: 'html{font-size:200% !important} *{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}' });
  await page.addScriptTag({ path: 'tests/lib/layout-audit.browser.js' });
  const v: { rule: string; sel: string; detail: string }[] = await page.evaluate((o) => (window as any).__layoutAudit(o), { coarse: vp.touch, allow, today });
  const lost = v.filter((x) => x.rule === 'CLIPPED_TEXT' || x.rule === 'OFFSCREEN' || x.rule === 'OCCLUDED');
  expect(lost.map((x) => `${x.rule} ${x.sel}: ${x.detail}`), 'no content or function lost under text-spacing overrides').toEqual([]);
});
```

Browser-side library (geometry exported for node unit tests; 7 tests pass):

```js
/* tests/lib/layout-audit.browser.js
 * Injected into the page (page.addScriptTag({path})). Defines:
 *   window.__layoutAudit(opts)      -> Violation[]   (overlap, occlusion, off-screen, clipping, size, font floor, h-overflow)
 *   window.__layoutAuditList()      -> [{qa, sel, name, w, h}]  every interactive element, stamped data-qa (for trial clicks)
 * Pure helpers are exported to node (module.exports) so the maths is unit-tested without a browser.
 * Rule ids are stable: they are the vocabulary of tests/overlap-allowlist.json and of the traceability matrix.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- pure geometry (unit-tested)
  /** rects are {x,y,w,h}; returns intersection rect + area, or null */
  function inter(a, b) {
    var x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    var x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    var w = x2 - x1, h = y2 - y1;
    return w > 0 && h > 0 ? { x: x1, y: y1, w: w, h: h, area: w * h } : null;
  }
  /** is `inner` inside `outer`, with tol px slack (sub-pixel layout) */
  function inside(inner, outer, tol) {
    tol = tol == null ? 1 : tol;
    return inner.x >= outer.x - tol && inner.y >= outer.y - tol &&
      inner.x + inner.w <= outer.x + outer.w + tol && inner.y + inner.h <= outer.y + outer.h + tol;
  }
  /** 5 hit-test points: centre + four points at 25%/75% (partial occlusion is still an occlusion) */
  function samplePoints(r) {
    return [[.5, .5], [.25, .25], [.75, .25], [.25, .75], [.75, .75]].map(function (p) {
      return { x: r.x + r.w * p[0], y: r.y + r.h * p[1] };
    });
  }
  /** overlap is reportable when big enough in px and relative to the smaller box (ignores 1-2px border kisses) */
  function overlapReportable(a, b, minArea, minRatio) {
    var i = inter(a, b);
    if (!i) return null;
    var smaller = Math.min(a.w * a.h, b.w * b.h);
    return i.area >= minArea && i.area / smaller >= minRatio ? i : null;
  }
  /** allowlist entries: {rule, sel?, other?, reason, until:'YYYY-MM-DD'}; expired entries do NOT suppress */
  function isAllowed(v, allow, today) {
    for (var k = 0; k < allow.length; k++) {
      var e = allow[k];
      if (e.rule !== v.rule) continue;
      if (e.until && e.until < today) continue; // expiry forces re-triage
      if (e.sel && v.sel.indexOf(e.sel) < 0) continue;
      if (e.other && (v.other || '').indexOf(e.other) < 0) continue;
      return true;
    }
    return false;
  }
  /** WCAG 2.5.8 spacing exception: an undersized target passes if a 24px circle on its centre touches no other target */
  function spacingOk(r, others) {
    var c = { x: r.x + r.w / 2 - 12, y: r.y + r.h / 2 - 12, w: 24, h: 24 };
    for (var k = 0; k < others.length; k++) if (inter(c, others[k])) return false;
    return true;
  }

  // ---------------------------------------------------------------- in-page audit
  var INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],' +
    '[role=menuitem],[role=switch],[role=checkbox],[role=radio],[role=slider],[role=option],[tabindex]:not([tabindex="-1"]),[onclick]';

  function cssPath(el) {
    if (el.getAttribute && el.getAttribute('data-testid')) return '[data-testid=' + el.getAttribute('data-testid') + ']';
    var parts = [];
    for (var n = el; n && n.nodeType === 1 && parts.length < 4; n = n.parentElement) {
      var s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(s + '#' + n.id); break; }
      var cls = (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      if (cls) s += '.' + cls;
      parts.unshift(s);
    }
    return parts.join('>');
  }
  function labelOf(el) {
    return (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  }
  function rectOf(el) { var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
  function isVisible(el) {
    if (el.checkVisibility) return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    var cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0 && r.height > 0;
  }
  function isInteractive(el, cs) {
    if (el.matches(INTERACTIVE)) return true;
    // legacy React apps use <div onClick>: cursor:pointer on the outermost element is the only DOM signal
    return cs.cursor === 'pointer' && el.parentElement && getComputedStyle(el.parentElement).cursor !== 'pointer';
  }
  function deepElementFromPoint(x, y) {
    var t = document.elementFromPoint(x, y);
    while (t && t.shadowRoot) { var n = t.shadowRoot.elementFromPoint(x, y); if (!n || n === t) break; t = n; }
    return t;
  }
  function hitOk(el, t) {
    if (!t) return false;
    if (t === el || el.contains(t)) return true;
    if (el.labels) for (var k = 0; k < el.labels.length; k++) if (el.labels[k] === t || el.labels[k].contains(t)) return true;
    var lab = t.closest && t.closest('label');
    return !!(lab && lab.contains(el));
  }
  function scrollableAncestor(el) {
    for (var a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      var cs = getComputedStyle(a);
      if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY) && (a.scrollWidth > a.clientWidth + 1 || a.scrollHeight > a.clientHeight + 1)) return a;
    }
    return null;
  }

  function audit(opts) {
    var o = Object.assign({ coarse: false, minTouch: 44, minFine: 24, minFont: 12, overlapMinArea: 16, overlapMinRatio: 0.04,
      allow: [], today: new Date().toISOString().slice(0, 10), maxPerRule: 40 }, opts || {});
    var vp = { x: 0, y: 0, w: innerWidth, h: innerHeight };
    var out = [], counts = {};
    function add(rule, el, detail, other) {
      var v = { rule: rule, sel: cssPath(el), detail: detail, other: other };
      if (isAllowed(v, o.allow, o.today)) return;
      counts[rule] = (counts[rule] || 0) + 1;
      if (counts[rule] <= o.maxPerRule) out.push(v);
    }

    // 1. collect
    var all = Array.prototype.slice.call(document.body.querySelectorAll('*'));
    var inter_ = [], chrome = [];
    all.forEach(function (el) {
      if (el.closest('[data-overlap-ignore],script,style,noscript,svg *')) return;
      if (!isVisible(el)) return;
      var cs = getComputedStyle(el), r = rectOf(el);
      if (r.w < 1 || r.h < 1) return;
      if (isInteractive(el, cs)) inter_.push({ el: el, r: r, cs: cs });
      var pos = cs.position;
      if ((pos === 'fixed' || pos === 'sticky' || (pos === 'absolute' && cs.zIndex !== 'auto')) && cs.pointerEvents !== 'none' && r.w >= 16 && r.h >= 16) {
        chrome.push({ el: el, r: r });
      }
    });
    // keep outermost chrome only
    chrome = chrome.filter(function (c) { return !chrome.some(function (d) { return d !== c && d.el.contains(c.el); }); });

    // 2. per-interactive rules
    var rects = inter_.map(function (i) { return i.r; });
    inter_.forEach(function (i) {
      var el = i.el, r = i.r, sc = scrollableAncestor(el);
      var full = inside(r, vp, 1);
      if (!sc && !full) add('OFFSCREEN', el, 'x=' + Math.round(r.x) + ' y=' + Math.round(r.y) + ' w=' + Math.round(r.w) + ' h=' + Math.round(r.h) + ' vs viewport ' + vp.w + 'x' + vp.h);
      else if (full) {
        var pts = samplePoints(r), ok = 0, blocker = null;
        pts.forEach(function (p, k) { var t = deepElementFromPoint(p.x, p.y); if (hitOk(el, t)) ok++; else if (!blocker) blocker = t; if (k === 0 && !hitOk(el, t)) blocker = t; });
        var centre = hitOk(el, deepElementFromPoint(pts[0].x, pts[0].y));
        if (!centre || ok < 3) add('OCCLUDED', el, ok + '/5 sample points hit the element', blocker ? cssPath(blocker) : '');
      }
      var min = o.coarse ? o.minTouch : o.minFine;
      var inlineLink = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
      if (!inlineLink && (r.w < min - 0.5 || r.h < min - 0.5)) {
        var others = rects.filter(function (x) { return x !== r; });
        if (o.coarse || r.w < 24 || r.h < 24) if (o.coarse || !spacingOk(r, others)) add('TARGET_SIZE', el, Math.round(r.w) + 'x' + Math.round(r.h) + ' < ' + min);
      }
    });

    // 3. text rules: font floor + clipping
    var seenFont = new Set();
    all.forEach(function (el) {
      if (el.closest('[data-overlap-ignore],script,style,noscript,svg *')) return;
      var own = Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim().length > 0; });
      if (!own || !isVisible(el)) return;
      var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
      if (fs < o.minFont && !seenFont.has(el)) { seenFont.add(el); add('FONT_FLOOR', el, fs + 'px "' + labelOf(el) + '"'); }
      var rg = document.createRange(); rg.selectNodeContents(el);
      var tr = rg.getBoundingClientRect(), t = { x: tr.left, y: tr.top, w: tr.width, h: tr.height };
      if (t.w < 1 || t.h < 1) return;
      var clippedBy = null;
      for (var a = el; a && a !== document.documentElement && !clippedBy; a = a.parentElement) {
        var acs = getComputedStyle(a);
        var clipX = /(hidden|clip)/.test(acs.overflowX), clipY = /(hidden|clip)/.test(acs.overflowY);
        if (!clipX && !clipY) continue;
        var ar = rectOf(a);
        if ((clipX && (t.x < ar.x - 1 || t.x + t.w > ar.x + ar.w + 1)) || (clipY && (t.y < ar.y - 1 || t.y + t.h > ar.y + ar.h + 1))) clippedBy = a;
      }
      if (clippedBy) add('CLIPPED_TEXT', el, '"' + labelOf(el) + '" is cut by ' + cssPath(clippedBy));
      else if (!scrollableAncestor(el) && (t.x < -1 || t.x + t.w > vp.w + 1) ) add('CLIPPED_TEXT', el, '"' + labelOf(el) + '" extends beyond the viewport (' + Math.round(t.x) + '..' + Math.round(t.x + t.w) + ' of ' + vp.w + ')');
      else if (/ellipsis/.test(cs.textOverflow) && el.scrollWidth > el.clientWidth + 1) add('CLIPPED_TEXT', el, '"' + labelOf(el) + '" truncated with an ellipsis');
    });

    // 4. page-level horizontal overflow
    var de = document.documentElement;
    if (de.scrollWidth > innerWidth + 1) {
      var culprits = all.filter(function (e) { var r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && isVisible(e) && !scrollableAncestor(e); }).slice(0, 3);
      add('H_OVERFLOW', culprits[0] || de, 'scrollWidth ' + de.scrollWidth + ' > innerWidth ' + innerWidth);
    }

    // 5. chrome/interactive overlap (the H1 / C2 class): fixed/sticky/positioned UI vs other UI
    var boxes = chrome.map(function (c) { return { el: c.el, r: c.r }; });
    inter_.forEach(function (i) { if (!boxes.some(function (b) { return b.el.contains(i.el) || i.el.contains(b.el); })) boxes.push({ el: i.el, r: i.r }); });
    for (var p = 0; p < boxes.length; p++) for (var q = p + 1; q < boxes.length; q++) {
      var A = boxes[p], B = boxes[q];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      var ov = overlapReportable(A.r, B.r, o.overlapMinArea, o.overlapMinRatio);
      if (!ov) continue;
      var top = deepElementFromPoint(ov.x + ov.w / 2, ov.y + ov.h / 2);
      if (top && (A.el.contains(top) || B.el.contains(top))) add('OVERLAP', A.el, Math.round(ov.w) + 'x' + Math.round(ov.h) + 'px shared with', cssPath(B.el));
    }
    return out;
  }

  function list() {
    var n = 0, res = [];
    document.body.querySelectorAll('*').forEach(function (el) {
      if (!isVisible(el) || el.closest('[data-overlap-ignore],svg *')) return;
      var cs = getComputedStyle(el);
      if (!isInteractive(el, cs)) return;
      el.setAttribute('data-qa', String(++n));
      var r = rectOf(el);
      res.push({ qa: n, sel: cssPath(el), name: labelOf(el), w: Math.round(r.w), h: Math.round(r.h) });
    });
    return res;
  }

  root.__layoutAudit = audit;
  root.__layoutAuditList = list;
  if (typeof module !== 'undefined' && module.exports) module.exports = { inter: inter, inside: inside, samplePoints: samplePoints, overlapReportable: overlapReportable, isAllowed: isAllowed, spacingOk: spacingOk };
})(typeof window !== 'undefined' ? window : globalThis);
```

Unit tests (they encode the C1 and C2 shapes measured in the audit):

```js
// tests/lib/layout-audit.test.mjs  -- node --test tests/lib   (no browser needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { inter, inside, samplePoints, overlapReportable, isAllowed, spacingOk } = createRequire(import.meta.url)('./layout-audit.browser.js');

test('C1 shape: the 572px transport row (audit: Back at x=-213, Play at x=-130) is NOT inside a 375px viewport', () => {
  const vp = { x: 0, y: 0, w: 375, h: 812 };
  const row = { x: -213, y: 700, w: 572, h: 72 };            // 572 px wide row whose left edge is off-screen
  assert.equal(inside(row, vp, 1), false);
  const backBtn = { x: -213, y: 710, w: 52, h: 52 };
  assert.equal(inside(backBtn, vp, 1), false);
  const fixedRow = { x: 8, y: 700, w: 359, h: 72 };
  assert.equal(inside(fixedRow, vp, 1), true);
});

test('C2 shape: a fixed timeline bar over the bottom rows of a tools sheet is a reportable overlap', () => {
  const sheetRow = { x: 16, y: 690, w: 343, h: 44 };      // "Desktop View" row of the Tools sheet
  const timelineBar = { x: 0, y: 660, w: 375, h: 152 };   // fixed bar, higher z-index
  const i = overlapReportable(sheetRow, timelineBar, 16, 0.04);
  assert.ok(i);
  assert.equal(Math.round(i.area), 343 * 44); // fully covered
});

test('border kisses (1-2px) are not reportable, real overlaps are', () => {
  const a = { x: 0, y: 0, w: 100, h: 40 }, b = { x: 0, y: 39, w: 100, h: 40 };
  assert.equal(overlapReportable(a, b, 16, 0.04), null);            // 100 px2 of 4000 = 2.5% < 4%
  const c = { x: 0, y: 30, w: 100, h: 40 };
  assert.ok(overlapReportable(a, c, 16, 0.04));                      // 1000 px2 = 25%
});

test('samplePoints returns centre first and stays inside the rect', () => {
  const r = { x: 10, y: 20, w: 40, h: 40 };
  const pts = samplePoints(r);
  assert.deepEqual(pts[0], { x: 30, y: 40 });
  assert.ok(pts.every((p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h));
});

test('allowlist entries expire (forces re-triage) and must match rule+selector', () => {
  const v = { rule: 'OVERLAP', sel: 'div#extra-features', other: 'div.story-panel' };
  const allow = [{ rule: 'OVERLAP', sel: 'extra-features', reason: 'H1 known', until: '2026-10-15' }];
  assert.equal(isAllowed(v, allow, '2026-10-01'), true);
  assert.equal(isAllowed(v, allow, '2026-10-16'), false);            // expired -> reported again
  assert.equal(isAllowed({ ...v, rule: 'OCCLUDED' }, allow, '2026-10-01'), false);
});

test('WCAG 2.5.8 spacing exception: 20px target with clear 24px circle passes, crowded 20px target fails', () => {
  const t = { x: 100, y: 100, w: 20, h: 20 };
  assert.equal(spacingOk(t, [{ x: 200, y: 100, w: 20, h: 20 }]), true);
  assert.equal(spacingOk(t, [{ x: 118, y: 100, w: 20, h: 20 }]), false);
});

test('inter() is symmetric and null for disjoint boxes', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 }, b = { x: 5, y: 5, w: 10, h: 10 }, c = { x: 50, y: 50, w: 5, h: 5 };
  assert.deepEqual(inter(a, b), inter(b, a));
  assert.equal(inter(a, c), null);
});
```

### A.3 Test 3: one clock, one date (C3, C4, H9)

```ts
// TEST 3 of 10 -- tests/e2e/one-clock.spec.ts  (audit C3, C4, H9, S-page clocks)
// There must be exactly ONE date and ONE clock string on screen for a given tick, and both must equal the canonical time model.
// Golden = tests/golden/tick-clock.csv (675 rows: tick,iso,tab,date,mpt) generated from data/time_anchors.json by the time module (app-time 6.4);
// it is the ONLY source of expected values, so changing an anchor shows up as a reviewable diff, never as a silent test edit.
// Today (legacy) this fails on every sampled tick: header says "July 5" on July 3 (bundle.pretty.js:97428 `July ${l + 2}, 1863`),
// tick 17 shows 7:20 vs data label 6:25am, tick 451 shows 4:00 AM vs "5:00am July 3".
import fs from 'node:fs';
import { test, expect } from '../fixtures/base';
import { openApp, readState } from '../support/driver';

type Row = { tick: number; iso: string; tab: number; date: string; clock: string };
const golden: Row[] = fs.readFileSync('tests/golden/tick-clock.csv', 'utf8').trim().split('\n').slice(1).map((l) => {
  const [tick, iso, tab, date, clock] = l.split(',');
  return { tick: +tick, iso, tab: +tab, date, clock };           // date e.g. "July 3, 1863"; clock e.g. "3:00 PM"
});
const byTick = new Map(golden.map((r) => [r.tick, r]));
const SAMPLE = [1, 12, 17, 28, 226, 267, 302, 451, 538, 553, 675];

const CLOCK_RE = /\b(1[0-2]|0?[1-9]):[0-5]\d\s?[AP]M\b/gi;
const DATE_RE = /\bJuly\s+(\d{1,2})(?:,\s*1863)?/g;

for (const tick of SAMPLE) {
  test(`@cat:data @audit:C3,C4 one clock, one date at tick ${tick}`, async ({ page }, info) => {
    const vp = info.project.metadata.viewport;
    const exp = byTick.get(tick)!;
    await openApp(page, { layout: vp.touch ? 'mobile' : 'desktop', tick });

    // scrape every place a clock/date can appear: visible text + aria-labels + titles, minus explicitly-quoted history
    const text: string = await page.evaluate(() => {
      const skip = '[data-historical-quote],script,style,noscript';
      const parts: string[] = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if (!(n.parentElement as Element).closest(skip)) parts.push(n.nodeValue ?? '');
      document.querySelectorAll('[aria-label],[title]').forEach((e) => parts.push(e.getAttribute('aria-label') ?? '', e.getAttribute('title') ?? ''));
      return parts.join('\n');
    });
    const clocks = new Set([...text.matchAll(CLOCK_RE)].map((m) => m[0].toUpperCase().replace(/\s/g, ' ').replace(/^0/, '')));
    const days = new Set([...text.matchAll(DATE_RE)].map((m) => Number(m[1])));

    expect.soft([...clocks], `clock strings visible at tick ${tick}`).toEqual([exp.clock]);
    expect.soft([...days], `"July N" values visible at tick ${tick}`).toEqual([Number(/July (\d+)/.exec(exp.date)![1])]);

    const st = await readState(page);                         // rebuilt app exposes its own view of the world: must agree with the golden and the DOM
    if (st) { expect.soft(st.clockLabel).toBe(exp.clock); expect.soft(st.dateLabel).toBe(exp.date); }
    // impossible-date guard independent of the golden: the battle is July 1-3
    for (const d of days) expect(d, 'a date after July 3 appears on a battle screen').toBeLessThanOrEqual(3);
  });
}

test('@cat:data @audit:H9 speed label states sim-minutes per real second, not "real time"', async ({ page }, info) => {
  await openApp(page, { layout: info.project.metadata.viewport.touch ? 'mobile' : 'desktop', tick: 100 });
  await expect(page.getByText(/1x \(real time\)/i)).toHaveCount(0);
});
```

### A.4 Test 4: service worker lifecycle (C6)

```ts
// TEST 4 of 10 -- tests/e2e/service-worker.spec.ts  (audit C6, P1, P5, DH-02, DH-03, T-14)
// The first-visit reload (index.html: controllerchange -> location.reload(); sw.js: skipWaiting + clients.claim) makes EVERY new visitor
// load the app twice; Lighthouse flagged ~9 s of wasted mobile time and it is the leading suspect for RUM LCP/FCP "Poor".
// Lighthouse can see the redirect but cannot see update behaviour, poisoning, or migration from the old SW -- these tests can.
import { test, expect } from '../fixtures/base';

test.use({ serviceWorkers: 'allow' });   // the config blocks SWs by default; this file is the one place they run

test('@cat:perf @audit:C6 first visit: exactly ONE document load, no self-reload after the SW activates', async ({ page }) => {
  const docLoads: string[] = [];
  page.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) docLoads.push(`${r.method()} ${r.url()}`); });
  await page.goto('/?intro=0&layout=desktop&test=1');
  await page.evaluate(() => navigator.serviceWorker.ready);                    // SW installed AND activated
  await page.waitForTimeout(6_000);                                             // the legacy reload fires within ~1-3 s of controllerchange
  expect(docLoads, 'main-frame document requests').toHaveLength(1);
});

test('@cat:perf @audit:P3 second visit is served from cache: 0 data/asset network requests, LCP element painted < 1.2 s', async ({ page, context }) => {
  await page.goto('/?intro=0&layout=desktop&test=1');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const net: string[] = [];
  page.on('requestfinished', async (r) => { const resp = await r.response(); if (resp && !resp.fromServiceWorker() && /\/(data|assets)\//.test(r.url())) net.push(r.url()); });
  await page.reload();
  await page.waitForFunction(() => (window as any).__gtbg?.state().ready === true);
  expect(net, 'data/asset requests that bypassed the SW cache on a warm visit').toEqual([]);
  const lcp = await page.evaluate(() => new Promise<number>((res) => new PerformanceObserver((l) => res(l.getEntries().at(-1)!.startTime)).observe({ type: 'largest-contentful-paint', buffered: true })));
  expect(lcp).toBeLessThan(1_200);
});

test('@cat:reliability @audit:C6,T-14 deploying a new SW never reloads the page by itself and offers an explicit update', async ({ page, context }) => {
  let v = 1;
  await context.route('**/sw.js', async (route) => {                            // simulate two deploys of sw.js
    const res = await route.fetch();
    await route.fulfill({ response: res, body: (await res.text()).replace(/const VERSION = '[^']*'/, `const VERSION = 'test-v${v}'`) });
  });
  const navs: string[] = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs.push(f.url()); });
  await page.goto('/?intro=0&layout=desktop&test=1');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const before = navs.length;

  v = 2;                                                                        // "deploy" v2
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r!.update()));
  await expect(page.getByRole('status').filter({ hasText: /new version/i })).toBeVisible();   // update prompt (aria-live), not a surprise reload
  await page.waitForTimeout(3_000);
  expect(navs.length, 'page must not navigate/reload until the user accepts').toBe(before);

  await page.getByRole('button', { name: /reload to update/i }).click();        // user consent -> skipWaiting -> controllerchange -> one reload
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.includes('/sw.js'));
  expect(navs.length).toBe(before + 1);
});

test('@cat:reliability @audit:DH-03 a transient 5xx for a hashed asset is never cached', async ({ page, context }) => {
  let hits = 0;
  await context.route('**/assets/*.js', (r) => (hits++ === 0 ? r.fulfill({ status: 503, body: 'nope' }) : r.continue()));
  await page.goto('/?intro=0&layout=desktop&test=1').catch(() => {});
  await page.evaluate(() => navigator.serviceWorker.ready).catch(() => {});
  const poisoned = await page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const req of await (await caches.open(k)).keys()) {
      const res = await (await caches.open(k)).match(req);
      if (res && !res.ok) out.push(`${k} ${req.url} ${res.status}`);
    }
    return out;
  });
  expect(poisoned, 'non-OK responses found in Cache Storage').toEqual([]);
});

test('@cat:reliability @audit:C6 offline: a returning visitor still gets the shell and a friendly notice', async ({ page, context }) => {
  await page.goto('/?intro=0&layout=desktop&test=1');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByText(/offline/i)).toBeVisible();
});

test('@cat:security sw.js is never cached by the browser or the CDN', async ({ request }) => {
  const r = await request.get('/sw.js');
  expect(r.headers()['cache-control']).toMatch(/no-store|no-cache/);
  expect(r.headers()['content-type']).toContain('javascript');
});
```

### A.5 Test 5: console / pageerror / request / CSP gate (C5) and interaction coverage

Auto-fixture attached to every test:

```ts
// tests/fixtures/base.ts -- every spec imports { test, expect } from here, never from '@playwright/test'.
// Auto-fixtures give EVERY test, for free: (1) console/pageerror/request/CSP gate with expiring allowlist,
// (2) a deterministic Mapbox stub (tag a test @realmap to opt out), (3) blocked third-party analytics for synthetic traffic.
import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';

type Allow = { kind: 'console' | 'pageerror' | 'request' | 'csp'; match: string; reason: string; audit: string; until: string };
const loadAllow = (): Allow[] => JSON.parse(fs.readFileSync('tests/console-allowlist.json', 'utf8'));

const STUB_STYLE = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#20242c' } }] };

export const test = base.extend<{ gate: void; stubMap: void }>({
  stubMap: [async ({ context }, use, info) => {
    if (!info.title.includes('@realmap')) {
      await context.route('https://api.mapbox.com/styles/**', (r) => r.fulfill({ json: STUB_STYLE }));
      await context.route(/https:\/\/(api|[a-d])\.(tiles\.)?mapbox\.com\/(v4|raster|fonts|sprite|map-sessions).*/, (r) => r.fulfill({ status: 204, body: '' }));
      await context.route('https://events.mapbox.com/**', (r) => r.abort());
    }
    await context.route('**/ingesteer.services-prod.nsvcs.net/**', (r) => r.abort());  // never pollute Netlify RUM with test traffic
    await use();
  }, { auto: true }],

  gate: [async ({ page }, use, info) => {
    const problems: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const allow = loadAllow();
    const live = allow.filter((a) => a.until >= today);
    const ok = (kind: Allow['kind'], text: string) => live.some((a) => a.kind === kind && text.includes(a.match));
    const origin = new URL(String(info.project.use.baseURL ?? 'http://127.0.0.1:4173')).origin;

    page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !ok('console', m.text())) problems.push(`console.${m.type()}: ${m.text().slice(0, 300)}`); });
    page.on('pageerror', (e) => { if (!ok('pageerror', e.message)) problems.push(`pageerror: ${e.message}`); });      // <- setGoldUnit is not defined
    page.on('requestfailed', (r) => { const t = `${r.method()} ${r.url()} ${r.failure()?.errorText}`; if (!ok('request', t) && !r.url().includes('mapbox.com')) problems.push(`requestfailed: ${t}`); });
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(origin) && !ok('request', `${r.status()} ${r.url()}`)) problems.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.addInitScript(() => {
      (window as any).__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => (window as any).__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });

    await use();

    const csp: string[] = await page.evaluate(() => (window as any).__csp ?? []).catch(() => []);
    for (const c of csp) if (!ok('csp', c)) problems.push(`csp: ${c}`);
    for (const e of allow.filter((a) => a.until < today)) problems.push(`EXPIRED allowlist entry [${e.audit}] ${e.match} (until ${e.until}): fix it or renew with a reason`);
    expect(problems, 'console / pageerror / request / CSP gate (allowlist entries need audit id + expiry)').toEqual([]);
  }, { auto: true }],
});
export { expect };
```

Spec that drives the product so the gate is exercised:

```ts
// TEST 5 of 10 -- tests/e2e/console-gate.spec.ts  (audit C5, P5, X3, C7)
// Lighthouse "errors-in-console" scored 1 (PASS) on the very build that throws `ReferenceError: setGoldUnit is not defined` on click
// (lh_mobile.json: errors-in-console score=1), because Lighthouse only loads the page. The auto-fixture in tests/fixtures/base.ts already
// fails ANY test that emits console.error/warning, pageerror, failed/4xx same-origin request or CSP violation. This spec makes sure the
// gate is EXERCISED: it drives every control of the product, not just the load path.
import { test, expect } from '../fixtures/base';
import { openApp } from '../support/driver';
import { DESKTOP_STATES, MOBILE_STATES, states } from '../support/states';

test('@cat:reliability @audit:C5 Follow-Your-Ancestor: pick a regiment, then "Change Regiment" (no ReferenceError)', async ({ page }, info) => {
  test.skip(info.project.metadata.viewport.touch, 'ancestor panel is a desktop panel today');
  await openApp(page, { layout: 'desktop', tick: 264 });
  await page.getByRole('button', { name: /follow your ancestor/i }).or(page.getByText(/follow your ancestor/i)).first().click();
  await page.getByText(/20th Maine/i).first().click();                       // -> st(it): setGoldUnit(it), clearGoldTrail()  (bundle.pretty.js:101086)
  await expect(page.getByText(/gold trail active/i)).toBeVisible();
  await page.getByRole('button', { name: /change regiment/i }).or(page.getByText(/change regiment/i)).first().click();   // (bundle.pretty.js:101229)
  // No explicit assertion needed: the auto-fixture (tests/fixtures/base.ts) fails this test on ANY pageerror/console.error afterwards.
});

// "Monkey-lite": click every visible control once per state, dismiss, continue. Deterministic order (DOM order), destructive/external
// controls skipped via data-qa-skip or a link check. Catches undefined identifiers, unhandled promise rejections, thrown render errors.
for (const sid of [...DESKTOP_STATES, ...MOBILE_STATES]) {
  test(`@cat:reliability @audit:C5 click every control once in "${sid}" without errors`, async ({ page }, info) => {
    const vp = info.project.metadata.viewport;
    const s = states[sid];
    test.skip((s.layout === 'mobile') !== vp.touch, 'state belongs to the other layout');
    await s.run(page);
    await page.addScriptTag({ path: 'tests/lib/layout-audit.browser.js' });
    const controls: { qa: number; sel: string; name: string }[] = await page.evaluate(() => (window as any).__layoutAuditList());
    for (const c of controls) {
      const loc = page.locator(`[data-qa="${c.qa}"]`);
      if (!(await loc.count())) continue;                                     // panel re-rendered: fine
      const href = await loc.getAttribute('href').catch(() => null);
      if (href && /^(https?:)?\/\/(?!127\.0\.0\.1|localhost)/.test(href)) continue;   // external
      if (href?.startsWith('mailto:')) continue;
      await loc.click({ timeout: 1_000, noWaitAfter: true }).catch(() => {});  // not-tappable is TEST 1's job; here we only want side effects
      await page.keyboard.press('Escape');
    }
  });
}

// No debug text at runtime (C7: "undefined", raw keys, NaN): the static lint cannot see values that only appear after fetch()/render.
for (const path of ['/dashboard.html', '/living-ledger.html', '/compare.html', '/search.html', '/sandbox.html', '/regiment.html']) {
  test(`@cat:polish @audit:C7,H7 ${path} renders no debug strings`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    const bad = [...text.matchAll(/\bundefined\b|\bNaN\b|\[object \w+\]|\b[a-z]{3,}(?:_[a-z]{2,}){2,}\b|Commander unrecorded|alias for U-|should be reconciled|Earlier drafts/g)].map((m) => m[0]);
    expect(bad, `debug/dev-log strings visible on ${path}`).toEqual([]);
  });
}
```

### A.6 Test 6: Lighthouse budgets and assertions (P1-P7)

`perf/budgets.json` (only ever tightens):

```json
{
  "_doc": "Budgets only ever tighten (CI rejects a diff that raises a number without an ADR label). 'green' = Google CWV 'good' ceiling; 'target' = the A+ lab budget that keeps the Lighthouse performance score >= 95. Audit ids are Lighthouse 13.5 ids taken from lh_mobile.json (insights renamed several audits: render-blocking-resources -> render-blocking-insight). Third-party bytes are deliberately NOT budgeted here: Mapbox satellite tiles (~0.8 MB today) are product-required; they are measured separately in Playwright with a tile-host allowlist.",
  "profiles": {
    "mobile": {
      "settings": "lighthouse default mobile (Moto G Power emulation, simulate: rtt 150 ms, 1638 kbps, cpu x4)",
      "categories": { "performance": 0.95, "accessibility": 1, "best-practices": 1, "seo": 1 },
      "metricsMs": {
        "first-contentful-paint":   { "green": 1800, "target": 1500 },
        "largest-contentful-paint": { "green": 2500, "target": 2200 },
        "total-blocking-time":      { "green": 200,  "target": 150 },
        "speed-index":              { "green": 3400, "target": 3000 },
        "server-response-time":     { "green": 800,  "target": 300 }
      },
      "cumulative-layout-shift": { "green": 0.1, "target": 0.05 },
      "auditMinScore": {
        "redirects": 1, "valid-source-maps": 1, "color-contrast": 1, "label": 1, "inspector-issues": 1, "errors-in-console": 1,
        "unused-javascript": 0.9, "bootup-time": 0.9, "mainthread-work-breakdown": 0.9, "render-blocking-insight": 0.9,
        "network-dependency-tree-insight": 0.9, "cls-culprits-insight": 1, "target-size": 1, "is-crawlable": 1
      },
      "resourcesBytes": { "script": 560000, "total": 1400000 }
    },
    "desktop": {
      "settings": "lighthouse --preset=desktop (rtt 40 ms, 10 Mbps, cpu x1)",
      "categories": { "performance": 0.95, "accessibility": 1, "best-practices": 1, "seo": 1 },
      "metricsMs": {
        "first-contentful-paint":   { "green": 1800, "target": 900 },
        "largest-contentful-paint": { "green": 2500, "target": 1200 },
        "total-blocking-time":      { "green": 200,  "target": 150 },
        "speed-index":              { "green": 3400, "target": 1300 },
        "server-response-time":     { "green": 800,  "target": 300 }
      },
      "cumulative-layout-shift": { "green": 0.1, "target": 0.05 },
      "auditMinScore": {
        "redirects": 1, "valid-source-maps": 1, "color-contrast": 1, "label": 1, "inspector-issues": 1, "errors-in-console": 1,
        "unused-javascript": 0.9, "bootup-time": 0.9, "mainthread-work-breakdown": 0.9, "render-blocking-insight": 0.9,
        "network-dependency-tree-insight": 0.9, "cls-culprits-insight": 1, "target-size": 1, "is-crawlable": 1
      },
      "resourcesBytes": { "script": 560000, "total": 1400000 }
    }
  }
}
```

`perf/assert-lh.mjs` (executed against the audit's Lighthouse JSONs, output in Appendix C):

```js
// perf/assert-lh.mjs  (audit P1, P2, P4, P5, P7, C6, A1, A2, X3)
// Lighthouse gate that reads raw LHR JSON, so it is independent of which Lighthouse version @lhci/cli happens to bundle
// (LHCI 0.15.1 bundles Lighthouse 12.6.1 while the audit ran 13.5.0 -- audit ids differ). Median of N runs per profile.
// usage: node perf/assert-lh.mjs mobile reports/lh/mobile-*.json [--tier green|target]
//   --tier green  : Google CWV "good" ceilings (the hard PR gate from Phase 2)   --tier target : A+ lab budgets (gate from Phase 6)
// The runner (perf/run-lighthouse.mjs, not shown) is:  for i in 1..5: lighthouse <url> --output=json --preset=<desktop|perf> --chrome-flags="--headless=new"
import fs from 'node:fs';

const [profileName, ...rest] = process.argv.slice(2);
const tier = rest.includes('--tier') ? rest[rest.indexOf('--tier') + 1] : 'green';
const files = rest.filter((a) => a.endsWith('.json') && !a.includes('budgets'));
const budgets = JSON.parse(fs.readFileSync(new URL('./budgets.json', import.meta.url), 'utf8')).profiles[profileName];
const runs = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
if (!runs.length) { console.error('no LHR files'); process.exit(2); }

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const num = (id) => median(runs.map((r) => r.audits[id]?.numericValue).filter((v) => v != null));
const score = (id) => median(runs.map((r) => r.audits[id]?.score).filter((v) => v != null));
const failures = []; const rows = [];
const check = (label, actual, limit, cmp, unit = '') => { const ok = cmp === '<=' ? actual <= limit : actual >= limit; rows.push(`${ok ? 'PASS' : 'FAIL'} ${label}: ${Number(actual).toFixed(unit === '' ? 3 : 0)}${unit} ${cmp} ${limit}${unit}`); if (!ok) failures.push(label); };

for (const [cat, min] of Object.entries(budgets.categories)) check(`category ${cat}`, median(runs.map((r) => r.categories[cat].score)), min, '>=');
for (const [id, b] of Object.entries(budgets.metricsMs)) check(`${id}`, num(id), b[tier], '<=', ' ms');
check('cumulative-layout-shift', num('cumulative-layout-shift'), budgets['cumulative-layout-shift'][tier], '<=');
for (const [id, min] of Object.entries(budgets.auditMinScore)) { const s = score(id); if (Number.isNaN(s) || s === undefined) { rows.push(`SKIP audit ${id} (not applicable in this run)`); continue; } check(`audit ${id}`, s, min, '>='); }
const rsum = Object.fromEntries((runs[0].audits['resource-summary']?.details?.items ?? []).map((i) => [i.resourceType, i.transferSize]));
for (const [k, max] of Object.entries(budgets.resourcesBytes)) if (rsum[k] != null) check(`transfer bytes ${k}`, rsum[k], max, '<=', ' B');

console.log(`profile=${profileName} tier=${tier} runs=${runs.length} lighthouse=${runs[0].lighthouseVersion}\n` + rows.join('\n'));
console.log(`\n${failures.length} failing assertion(s)`);
process.exit(failures.length ? 1 : 0);
```

### A.7 Test 7: accessibility state matrix and behaviours (A1-A6, H2, H6)

```ts
// TEST 7 of 10 -- tests/a11y/state-matrix.spec.ts  (audit A1-A6, D2, H2, H6, C8, S4)
// axe-core on the LOAD state is what gave Lighthouse 90; the failures live in panel states and in behaviours axe cannot see.
// This file = axe over the whole state catalogue + four behavioural checks that map 1:1 to audit items.
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/base';
import { states } from '../support/states';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const RULES_THAT_MUST_NEVER_BE_DISABLED = ['color-contrast', 'label', 'button-name', 'aria-allowed-attr', 'target-size'];

for (const [sid, s] of Object.entries(states)) {
  for (const variant of ['default', 'reduced-motion', 'forced-colors'] as const) {
    test(`@cat:a11y axe "${sid}" [${variant}]`, async ({ page }, info) => {
      const vp = info.project.metadata.viewport;
      test.skip((s.layout === 'mobile') !== vp.touch, 'other layout');
      await page.emulateMedia({ reducedMotion: variant === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: variant === 'forced-colors' ? 'active' : 'none' });
      await s.run(page);
      const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const rows = res.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
      expect(rows, `axe violations in "${sid}" at ${vp.w}x${vp.h}`).toEqual([]);
      expect(res.incomplete.filter((i) => RULES_THAT_MUST_NEVER_BE_DISABLED.includes(i.id)), 'needs-review results for core rules must be triaged, not ignored').toEqual([]);
    });
  }
}

test('@cat:a11y @audit:A2,D2 the time scrubber is a labelled slider with a human value', async ({ page }) => {
  await states['desktop-home'].run(page);
  const slider = page.getByRole('slider', { name: /time|tick|battle/i });
  await expect(slider).toBeVisible();
  await expect(slider).toHaveAttribute('aria-valuetext', /July [1-3].*(AM|PM)/);
});

test('@cat:a11y @audit:H2 Esc closes the topmost panel, from inside the search box too, and never a lower one first', async ({ page }) => {
  await states['desktop-search'].run(page);
  const search = page.getByRole('searchbox').or(page.getByRole('combobox')).first();
  await search.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog').or(page.locator('[data-panel="search"]'))).toHaveCount(0);   // legacy ignores Esc while an INPUT has focus
});

test('@cat:a11y @audit:A6 dialogs trap focus, restore it on close, and expose a name', async ({ page }) => {
  await states['desktop-help'].run(page);
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg).toHaveAccessibleName(/help|about/i);
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); expect(await dlg.evaluate((d) => d.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent)).toMatch(/help|\?/i);
});

test('@cat:a11y @audit:A5,H6 every icon-only button has an accessible name and none is an emoji glyph', async ({ page }) => {
  await states['desktop-home'].run(page);
  const bad = await page.evaluate(() => {
    const emoji = /\p{Extended_Pictographic}/u;
    return [...document.querySelectorAll('button,[role=button]')].filter((b) => {
      const name = (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim();
      const visibleGlyph = (b.textContent || '').trim();
      return !name || /^[✕×✖xX]$/.test(name) || (emoji.test(visibleGlyph) && !b.querySelector('svg'));
    }).map((b) => (b as HTMLElement).outerHTML.slice(0, 90));
  });
  expect(bad, 'unnamed / emoji-glyph buttons').toEqual([]);
});

test('@cat:a11y @audit:D2 keyboard-only: a user can reach every toolbar control in <= 25 Tab presses and each shows a visible focus ring', async ({ page }) => {
  await states['desktop-home'].run(page);
  const seen = new Set<string>();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => { const e = document.activeElement as HTMLElement; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { key: e.tagName + (e.getAttribute('aria-label') ?? e.textContent?.slice(0, 20)), ring: cs.outlineStyle !== 'none' || cs.boxShadow !== 'none', obscured: !(top === e || e.contains(top)) };
    });
    expect(info.ring, `no visible focus indicator on ${info.key}`).toBe(true);          // WCAG 2.4.7 / 2.4.13
    expect(info.obscured, `${info.key} is covered when focused`).toBe(false);            // WCAG 2.4.11 Focus Not Obscured
    seen.add(info.key);
  }
  expect(seen.size).toBeGreaterThan(10);
});
```

### A.8 Test 8: data validators with the ratchet registry (C4, H5, H7, H10)

Time model used by the validators (anchors if present, else the files' own stated formula):

```js
// tests/support/time-model.mjs -- the validators' ONLY definition of "what clock time is tick N".
// Preferred source: data/time_anchors.json = [{tick, abs}] (abs = minutes since 1863-07-01 00:00 local sun time; strictly increasing),
// produced by the time-model work (app-time 6.5, anchors from time-facts-anchors.csv). Until that file exists the validators fall back
// to the formula the data files STATE about themselves ("Tick 1/226/451 = 5:00am of that day, 5 min per tick") -- so the same tests are
// red today (labels disagree with their own formula) and stay meaningful after the anchors land.
import fs from 'node:fs';
import path from 'node:path';

export function loadAnchors(dataDir) {
  const f = path.join(dataDir, 'time_anchors.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}
export const dayOfTick = (t) => (t <= 225 ? 1 : t <= 450 ? 2 : 3);
const dayStartTick = (d) => [0, 1, 226, 451][d];

/** absolute minutes since July 1 00:00 */
export function tickToAbs(tick, anchors) {
  if (!anchors) { const d = dayOfTick(tick); return (d - 1) * 1440 + 300 + (tick - dayStartTick(d)) * 5; }
  let i = anchors.findIndex((a) => a.tick >= tick);
  if (i === 0) return anchors[0].abs + (tick - anchors[0].tick) * 5;
  if (i === -1) { const a = anchors[anchors.length - 1], b = anchors[anchors.length - 2]; return a.abs + (tick - a.tick) * ((a.abs - b.abs) / (a.tick - b.tick)); }
  const a = anchors[i - 1], b = anchors[i];
  return a.abs + ((tick - a.tick) / (b.tick - a.tick)) * (b.abs - a.abs);
}

const CLOCK = /(\d{1,2})(?::(\d{2}))?\s?(a\.?m\.?|p\.?m\.?)/i;
/** "1:05pm", "5:00am July 2", "July 1 ~10:15am" -> minutes after midnight, or null */
export function parseClock(s) {
  const m = CLOCK.exec(s || '');
  if (!m) return null;
  return ((+m[1] % 12) + (/^p/i.test(m[3]) ? 12 : 0)) * 60 + (+m[2] || 0);
}
/** signed minutes: (labelled clock) - (model clock) for a tick, wrapped into [-720, 720) so a label on the right day compares sanely */
export function labelDrift(label, tick, anchors) {
  const c = parseClock(label);
  if (c === null) return null;
  const model = tickToAbs(tick, anchors) % 1440;
  let d = c - model;
  while (d >= 720) d -= 1440;
  while (d < -720) d += 1440;
  return d;
}
```

Validators DV-01..DV-15 (executed; results in section 5.8):

```js
// tests/data/validate.mjs -- the data validators (DV-xx). Pure functions: (data) -> string[] findings. No site dependency, ~1 s to run.
// Each check states the audit id it guards and the exact assertion. Measured on today's data in the report (section 5.8).
import fs from 'node:fs';
import path from 'node:path';
import { loadAnchors, labelDrift, tickToAbs, dayOfTick } from '../support/time-model.mjs';

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const R = 6371000, rad = (x) => (x * Math.PI) / 180;
const hav = (lat1, lng1, lat2, lng2) => { const dp = rad(lat2 - lat1), dl = rad(lng2 - lng1); const x = Math.sin(dp / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dl / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

export function loadAll(dataDir) {
  const oobDir = path.join(dataDir, 'oob');
  const oob = Object.fromEntries(fs.readdirSync(oobDir).filter((f) => f.endsWith('.json')).map((f) => [f, J(path.join(oobDir, f))]));
  const ids = new Set(), strength = new Map(), regs = [], brigades = new Set();
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') {
      for (const k of ['regiment_id', 'battery_id', 'brigade_id', 'division_id', 'corps_id', 'army_id']) if (typeof o[k] === 'string') { ids.add(o[k]); if (typeof o.strength === 'number') strength.set(o[k], o.strength); if (k === 'brigade_id') brigades.add(o[k]); }
      Object.values(o).forEach(walk);
    }
  })(Object.values(oob));
  for (const d of Object.values(oob)) if (Array.isArray(d.regiments)) regs.push(...d.regiments);
  const pfiles = fs.readdirSync(dataDir).filter((f) => /^(placements|density)_.*\.json$/.test(f));
  const placements = pfiles.flatMap((f) => { const d = J(path.join(dataDir, f)); return (d.placements || []).map((p) => ({ ...p, _f: f, _meta: d.metadata })); });
  const chron = [1, 2, 3].flatMap((i) => J(path.join(dataDir, `chronology_day${i}.json`)).events.map((e) => ({ ...e, _f: `chronology_day${i}.json` })));
  const vignettes = [1, 2, 3].flatMap((i) => J(path.join(dataDir, `vignettes_part${i}.json`)).vignettes);
  const succ = (({ union_successions: a, confederate_successions: b }) => [...a, ...b])(J(path.join(oobDir, 'commander_successions.json')));
  const alias = fs.existsSync(path.join(dataDir, 'unit_aliases.json')) ? J(path.join(dataDir, 'unit_aliases.json')) : {};   // alias -> canonical (new file; today the app resolves aliases in code)
  return { dataDir, oob, ids, strength, regs, brigades, placements, pfiles, chron, vignettes, succ, alias, anchors: loadAnchors(dataDir) };
}
const resolves = (c, id) => c.ids.has(id) || c.ids.has(c.alias[id]);
const sample = (a, n = 4) => a.slice(0, n).join(' | ');

export const checks = [
  { id: 'DV-01', audit: ['N1'], title: 'metadata.record_count equals the real number of records (also chunk tick_range)', run: (c) => {
      const f = []; const seen = new Set();
      for (const p of c.placements) { if (seen.has(p._f)) continue; seen.add(p._f); const n = c.placements.filter((x) => x._f === p._f).length; if (typeof p._meta?.record_count === 'number' && p._meta.record_count !== n) f.push(`${p._f}: record_count ${p._meta.record_count} != ${n}`); }
      return f; } },
  { id: 'DV-02', audit: ['P-22'], title: 'every tick is an integer in 1..675 and inside its file tick_range', run: (c) => c.placements.filter((p) => !Number.isInteger(p.tick) || p.tick < 1 || p.tick > 675 || (p._meta?.tick_range && (p.tick < p._meta.tick_range[0] || p.tick > p._meta.tick_range[1]))).map((p) => `${p._f}: ${p.unit_id}@${p.tick}`) },
  { id: 'DV-03', audit: ['H5', 'H7', 'C4'], title: 'every unit id in placements resolves to an OOB unit or a declared alias', run: (c) => [...new Set(c.placements.map((p) => p.unit_id).filter((u) => !resolves(c, u)))].map((u) => `placement unit ${u}`) },
  { id: 'DV-04', audit: ['H7'], title: 'every unit id in chronology.units_involved / vignette.units_featured resolves', run: (c) => [...c.chron.flatMap((e) => (e.units_involved || []).filter((u) => !resolves(c, u)).map((u) => `${e._f}:${e.tick}->${u}`)), ...c.vignettes.flatMap((v) => (v.units_featured || []).filter((u) => !resolves(c, u)).map((u) => `${v.vignette_id}->${u}`))] },
  { id: 'DV-05', audit: ['H10'], title: 'every regiment.parent_brigade_id resolves (VI Corps gap)', run: (c) => c.regs.filter((r) => r.parent_brigade_id && !c.brigades.has(r.parent_brigade_id)).map((r) => `${r.regiment_id}->${r.parent_brigade_id}`) },
  { id: 'DV-06', audit: ['H7'], title: 'no duplicate (unit_id,tick) rows across files unless byte-identical', run: (c) => { const m = new Map(), f = []; for (const p of c.placements) { const k = `${p.unit_id}@${p.tick}`, s = JSON.stringify([p.lat, p.lng, p.bearing, p.disposition, p.strength]); if (m.has(k) && m.get(k).s !== s) f.push(`${k} differs between ${m.get(k).f} and ${p._f}`); else m.set(k, { s, f: p._f }); } return f; } },
  { id: 'DV-07', audit: ['C4', 'D3'], title: 'position teleport: consecutive keyframes obey speed caps (inf 150 / art 250 / cav 400 m per model-minute) unless snap:true', run: (c) => {
      const by = {}; for (const p of c.placements) (by[p.unit_id] ||= []).push(p); const f = [];
      for (const [u, a] of Object.entries(by)) { a.sort((x, y) => x.tick - y.tick); for (let i = 1; i < a.length; i++) { const p = a[i - 1], q = a[i]; if (q.tick === p.tick || q.snap) continue;
        const mins = tickToAbs(q.tick, c.anchors) - tickToAbs(p.tick, c.anchors), d = hav(p.lat, p.lng, q.lat, q.lng), cap = /CAV/.test(u) ? 400 : /ART/.test(u) ? 250 : 150;
        if (d > 300 && d / mins > cap) f.push(`${u} t${p.tick}->t${q.tick}: ${Math.round(d)} m in ${Math.round(mins)} min = ${Math.round(d / mins)} m/min`); } }
      return f; } },
  { id: 'DV-08', audit: ['C4'], title: 'chronology "time" label agrees with the tick clock within 10 min', run: (c) => c.chron.map((e) => ({ e, d: labelDrift(e.time, e.tick, c.anchors) })).filter((x) => x.d !== null && Math.abs(x.d) > 10).map((x) => `${x.e._f} t${x.e.tick} "${x.e.time}" drift ${x.d} min`) },
  { id: 'DV-09', audit: ['C4'], title: 'commander_successions.approx_time agrees with approx_tick within 15 min', run: (c) => c.succ.map((s) => ({ s, d: labelDrift(s.approx_time, s.approx_tick, c.anchors) })).filter((x) => x.d !== null && Math.abs(x.d) > 15).map((x) => `${x.s.event_id} t${x.s.approx_tick} "${x.s.approx_time}" drift ${x.d} min`) },
  { id: 'DV-10', audit: ['C4'], title: 'a clock time quoted in vignette.panel_summary agrees with trigger_tick within 45 min', run: (c) => c.vignettes.map((v) => ({ v, d: labelDrift(v.panel_summary, v.trigger_tick, c.anchors) })).filter((x) => x.d !== null && Math.abs(x.d) > 45).map((x) => `${x.v.vignette_id} t${x.v.trigger_tick} drift ${x.d} min`) },
  { id: 'DV-11', audit: ['H10'], title: 'unit-count claims in shipped copy equal the data (467 regiments/batteries today)', run: (c) => {
      const want = c.regs.length, f = [], rx = /(\d{2,3})\+?\s+(?:Union and Confederate\s+)?(?:regiments?(?: and batteries)?|units)/gi;
      const dirs = [path.resolve(c.dataDir, '..'), path.resolve(c.dataDir, '..', 'assets')];
      for (const d of dirs) if (fs.existsSync(d)) for (const n of fs.readdirSync(d).filter((x) => /\.(html|js)$/.test(x))) { const t = fs.readFileSync(path.join(d, n), 'utf8'); for (const m of t.matchAll(rx)) if (+m[1] !== want && +m[1] > 100) f.push(`${n}: "${m[0]}" but data has ${want}`); }
      return f; } },
  { id: 'DV-12', audit: ['C4'], title: 'strength never exceeds the OOB strength by >10% and never rises >2% between keyframes without reinforced:true', run: (c) => {
      const f = [], by = {}; for (const p of c.placements) { const s = c.strength.get(p.unit_id); if (s && p.strength > s * 1.1) f.push(`${p.unit_id}@${p.tick}: strength ${p.strength} > 110% of OOB ${s}`); (by[p.unit_id] ||= []).push(p); }
      for (const [u, a] of Object.entries(by)) { a.sort((x, y) => x.tick - y.tick); for (let i = 1; i < a.length; i++) if (a[i].tick !== a[i - 1].tick && a[i].strength > a[i - 1].strength * 1.02 && !a[i].reinforced) f.push(`${u} t${a[i - 1].tick}->t${a[i].tick}: ${a[i - 1].strength} -> ${a[i].strength}`); }
      return f; } },
  { id: 'DV-13', audit: ['H7'], title: 'casualty roll-up: brigade casualties within max(25, 10%) of the sum of its regiments', run: (c) => {
      const by = {}; for (const r of c.regs) (by[r.parent_brigade_id] ||= []).push(r); const f = [];
      for (const d of Object.values(c.oob)) for (const b of d.brigades || []) { const rs = by[b.brigade_id]; if (!rs || typeof b.casualties !== 'number') continue; const s = rs.reduce((a, r) => a + (r.casualties || 0), 0); if (Math.abs(s - b.casualties) > Math.max(25, b.casualties * 0.1)) f.push(`${b.brigade_id}: brigade ${b.casualties} vs regiments ${s}`); }
      return f; } },
  { id: 'DV-14', audit: [], title: 'casualty_percentage == casualties / strength (0.15 pt) and casualties <= strength', run: (c) => { const f = []; (function w(o) { if (Array.isArray(o)) return o.forEach(w); if (o && typeof o === 'object') { if (o.strength > 0 && typeof o.casualties === 'number') { if (o.casualties > o.strength) f.push(`${o.regiment_id || o.brigade_id}: casualties > strength`); if (typeof o.casualty_percentage === 'number' && Math.abs((o.casualties / o.strength) * 100 - o.casualty_percentage) > 0.15) f.push(`${o.regiment_id || o.brigade_id}: pct mismatch`); } Object.values(o).forEach(w); } })(Object.values(c.oob)); return f; } },
  { id: 'DV-15', audit: [], title: 'disposition strings come from placement_schema.disposition_rendering_rules; bearing 0..360; lat/lng within 8 km of town', run: (c) => {
      const allowed = new Set(Object.keys(J(path.join(c.dataDir, 'placement_schema.json')).disposition_rendering_rules)); const f = [];
      for (const p of c.placements) { if (!allowed.has(p.disposition)) f.push(`${p._f}: disposition "${p.disposition}"`); if (!(p.bearing >= 0 && p.bearing <= 360)) f.push(`${p._f}: bearing ${p.bearing}`); if (hav(39.8309, -77.2311, p.lat, p.lng) > 8000) f.push(`${p.unit_id}@${p.tick} outside bbox`); }
      return f; } },
];

export function runAll(dataDir) { const c = loadAll(dataDir); return checks.map((k) => ({ id: k.id, title: k.title, audit: k.audit, findings: k.run(c) })); }
export { sample };
```

Ratchet runner:

```js
// tests/data/validate.test.mjs -- node --test tests/data     (DATA_DIR=<publish>/data, default ./public/data)
// RATCHET: a check listed in tests/known-failures.json (with an expiry) is EXPECTED to fail. It fails the run if it unexpectedly PASSES
// (stale entry -> delete it) or if an entry has expired. A check NOT listed must have zero findings. Fixing a bug therefore flips a
// registry entry from "expected red" to "must be green", and a regression can never hide.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runAll } from './validate.mjs';

const dataDir = process.env.DATA_DIR ?? 'public/data';
const registryFile = process.env.KNOWN_FAILURES ?? 'tests/known-failures.json';
const registry = fs.existsSync(registryFile) ? JSON.parse(fs.readFileSync(registryFile, 'utf8')) : {};
const today = process.env.TODAY ?? new Date().toISOString().slice(0, 10);
const results = runAll(dataDir);

for (const r of results) {
  test(`${r.id} ${r.title} [${r.audit.join(',') || 'new'}]`, (t) => {
    const k = registry[r.id];
    if (k && k.until >= today) {
      t.diagnostic(`EXPECTED RED (${k.reason}) -- ${r.findings.length} finding(s), e.g. ${r.findings.slice(0, 2).join(' | ')}`);
      assert.ok(r.findings.length > 0, `${r.id} is in known-failures.json but now PASSES: delete the entry (ratchet)`);
    } else {
      assert.deepEqual(r.findings.slice(0, 8), [], `${r.id}: ${r.findings.length} finding(s)${k ? ` (registry entry expired ${k.until})` : ''}`);
    }
  });
}
```

### A.9 Test 9: parity harness and intended-diff registry (N1)

Registry logic (executed, 4 tests):

```js
// tests/parity/intended-diffs.mjs -- the parity gate's brain (pure, unit-tested; no browser).
// A parity run produces DIFFS between the legacy build and the new build: {checkpoint, path, legacy, next}.
// A diff is acceptable ONLY if docs/parity/intended-diffs.json has an unexpired entry for that checkpoint+path (and, when the entry pins a
// value, the new value equals it). Anything else is a regression. Entries that match nothing are STALE (the difference disappeared or the
// entry is wrong) and fail --strict runs, so the registry cannot rot into a blanket exemption.
const globToRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');

export function classifyDiffs(diffs, registry, today) {
  const used = new Set();
  const unexplained = [], allowed = [], expiredHits = [];
  for (const d of diffs) {
    const hit = registry.find((e) => globToRe(e.checkpoint).test(d.checkpoint) && globToRe(e.path).test(d.path) && (e.next === undefined || e.next === d.next));
    if (!hit) { unexplained.push(d); continue; }
    if (hit.expires < today) { expiredHits.push({ diff: d, entry: hit.id }); continue; }
    used.add(hit.id); allowed.push({ diff: d, entry: hit.id, audit: hit.audit });
  }
  const stale = registry.filter((e) => e.expires >= today && !used.has(e.id)).map((e) => e.id);
  return { unexplained, allowed, expiredHits, stale, ok: unexplained.length === 0 && expiredHits.length === 0 };
}

/** flatten two snapshot objects into path-level diffs (arrays compared by index, numbers by tolerance) */
export function diffSnapshots(checkpoint, a, b, tol = 1e-6, prefix = '') {
  const out = [];
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const p = prefix ? `${prefix}.${k}` : k, x = a?.[k], y = b?.[k];
    if (x && y && typeof x === 'object' && typeof y === 'object') out.push(...diffSnapshots(checkpoint, x, y, tol, p));
    else if (typeof x === 'number' && typeof y === 'number' ? Math.abs(x - y) > tol : x !== y) out.push({ checkpoint, path: p, legacy: x, next: y });
  }
  return out;
}
```

Harness:

```ts
// TEST 9 of 10 -- tests/parity/parity.spec.ts  (audit N1; cut-over safety net from prov-recon 6.6)
// Runs every checkpoint against BOTH builds (LEGACY_URL = the frozen production bundle served from legacy/dist, NEXT_URL = the rebuild),
// diffs the observable state, and requires every difference to be explained by docs/parity/intended-diffs.json.
// Determinism rules: Mapbox stubbed (fixtures/base.ts), fresh page per checkpoint (legacy renderer is history dependent, T-12), fake clock,
// HUD clock masked in the visual tier, no network but the two origins.
import fs from 'node:fs';
import { test, expect } from '../fixtures/base';
import { classifyDiffs, diffSnapshots } from './intended-diffs.mjs';
import { openApp } from '../support/driver';

const LEGACY = process.env.LEGACY_URL ?? 'http://127.0.0.1:4180';
const NEXT = process.env.NEXT_URL ?? 'http://127.0.0.1:4173';
const registry = JSON.parse(fs.readFileSync('docs/parity/intended-diffs.json', 'utf8'));
const checkpoints: { id: string; tick: number; layout: 'desktop' | 'mobile'; act?: string[] }[] = JSON.parse(fs.readFileSync('tests/parity/checkpoints.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);

/** Everything a user can read: visible text lines + accessible names + control geometry; deliberately NOT pixels (renderer differs by design). */
async function snapshot(page) {
  return page.evaluate(() => {
    const txt = (document.body.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const controls: Record<string, { x: number; y: number; w: number; h: number }> = {};
    document.querySelectorAll('button,[role=button],a[href],input,select').forEach((e) => {
      const n = (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30); if (!n) return;
      const r = e.getBoundingClientRect(); controls[n] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
    return { text: Object.fromEntries(txt.map((t, i) => [String(i).padStart(3, '0'), t])), controls };
  });
}

for (const cp of checkpoints) {
  test(`@cat:parity checkpoint ${cp.id}`, async ({ browser }, info) => {
    const vp = info.project.metadata.viewport;
    test.skip((cp.layout === 'mobile') !== vp.touch, 'checkpoint belongs to the other layout');
    const shots: Record<string, unknown> = {};
    for (const [name, base] of [['legacy', LEGACY], ['next', NEXT]] as const) {
      const ctx = await browser.newContext({ ...info.project.use, baseURL: base });
      const page = await ctx.newPage();
      await openApp(page, { layout: cp.layout, tick: cp.tick, driver: name });
      shots[name] = await snapshot(page);
      await ctx.close();
    }
    const diffs = diffSnapshots(cp.id, shots.legacy as object, shots.next as object);
    const verdict = classifyDiffs(diffs, registry, today);
    await info.attach(`parity-${cp.id}.json`, { body: JSON.stringify({ diffs: diffs.length, allowed: verdict.allowed.length, unexplained: verdict.unexplained, stale: verdict.stale }, null, 1), contentType: 'application/json' });
    expect(verdict.unexplained, `unexplained differences at ${cp.id} (add an intended-diff entry with an audit id, or fix the regression)`).toEqual([]);
    expect(verdict.expiredHits, 'expired intended-diff entries still needed').toEqual([]);
  });
}

// T1 (data tier): the new engine must reproduce the legacy engine at every recorded keyframe -- goldens come from the legacy pure functions.
test('@cat:parity T1 units at recorded keyframes equal legacy goldens (675 ticks)', async ({ page }) => {
  await page.goto(`${NEXT}/?intro=0&layout=desktop&test=1`);
  const bad: string[] = [];
  for (const g of JSON.parse(fs.readFileSync('tests/parity/goldens/keyframes.json', 'utf8')) as { tick: number; units: { id: string; lat: number; lng: number; disposition: string; strength: number }[] }[]) {
    const now: { id: string; lat: number; lng: number; disposition: string; strength: number }[] = await page.evaluate((t) => (window as any).__gtbg.unitsAt(t), g.tick);
    const byId = new Map(now.map((u) => [u.id, u]));
    for (const u of g.units) { const n = byId.get(u.id); if (!n) bad.push(`t${g.tick} ${u.id} missing`); else if (Math.abs(n.lat - u.lat) > 1e-6 || Math.abs(n.lng - u.lng) > 1e-6 || n.disposition !== u.disposition || n.strength !== u.strength) bad.push(`t${g.tick} ${u.id} differs`); }
  }
  expect(bad.slice(0, 20), `${bad.length} keyframe mismatches`).toEqual([]);
});
```

### A.10 Test 10: RUM beacon, collector and evaluator (P1)

Client:

```js
// rum/web-vitals-beacon.js  (audit P1, C5, X3, X5)  -- ships as a tiny deferred module, loaded after first paint.
// Sends ONE beacon per metric per page view (final value, on pagehide/visibilitychange) to a same-origin endpoint, so CSP connect-src 'self'
// covers it and no cookie/ID exists. Attribution build tells us WHICH element/interaction/shift, which is what Netlify's RUM chart cannot.
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals/attribution';   // web-vitals v5 (verify attribution field names against the installed types)

const ENDPOINT = '/api/rum';
const skip = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';   // honour GPC / DNT: no beacon at all
const buildId = document.documentElement.dataset.build ?? 'dev';                        // injected at build time; ties every sample to a deploy
const ctx = () => ({
  build: buildId,
  page: location.pathname.replace(/\.html$/, '') || '/',                                // normalised: /dashboard and /dashboard.html are one group (T3)
  layout: document.documentElement.dataset.layout ?? (matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop'),
  vw: Math.round(innerWidth / 100) * 100, dpr: Math.round(devicePixelRatio * 2) / 2,   // bucketed on purpose: no fingerprinting
  mem: navigator.deviceMemory ?? null, cores: Math.min(navigator.hardwareConcurrency ?? 0, 8),
  net: navigator.connection?.effectiveType ?? null,
  sw: !!navigator.serviceWorker?.controller,                                            // controlled (warm) vs first visit
  bot: navigator.webdriver === true || /HeadlessChrome|Lighthouse|Prerender/i.test(navigator.userAgent),
});

const queue = new Map();
function enqueue(m) {
  const a = m.attribution ?? {};
  queue.set(m.name, {
    name: m.name, value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value) / (m.name === 'CLS' ? 1000 : 1), rating: m.rating, nav: m.navigationType,
    attr: m.name === 'LCP' ? { el: a.target, url: a.url && new URL(a.url, location.href).pathname, ttfb: a.timeToFirstByte, delay: a.resourceLoadDelay, dur: a.resourceLoadDuration, render: a.elementRenderDelay }
        : m.name === 'INP' ? { el: a.interactionTarget, type: a.interactionType, input: a.inputDelay, proc: a.processingDuration, present: a.presentationDelay, load: a.loadState }
        : m.name === 'CLS' ? { el: a.largestShiftTarget, load: a.loadState }
        : undefined,
  });
}
function flush() {
  if (!queue.size || skip) return;
  const body = JSON.stringify({ ...ctx(), metrics: [...queue.values()] });
  queue.clear();
  navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' })) || fetch(ENDPOINT, { method: 'POST', body, keepalive: true });   // text/plain avoids a CORS preflight
}
if (!skip) {
  [onLCP, onINP, onCLS, onFCP, onTTFB].forEach((f) => f(enqueue));
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  addEventListener('pagehide', flush);
  // JS errors: the setGoldUnit ReferenceError (C5) would have shown up here within an hour of the deploy.
  const seen = new Set();
  const err = (message, where) => { const k = `${message}|${where}`.slice(0, 200); if (seen.size > 5 || seen.has(k)) return; seen.add(k); navigator.sendBeacon?.(ENDPOINT, new Blob([JSON.stringify({ ...ctx(), error: { message: String(message).slice(0, 200), where: String(where).slice(0, 120) } })], { type: 'text/plain' })); };
  addEventListener('error', (e) => err(e.message, `${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener('unhandledrejection', (e) => err(e.reason?.message ?? e.reason, 'promise'));
  addEventListener('securitypolicyviolation', (e) => navigator.sendBeacon?.(ENDPOINT, new Blob([JSON.stringify({ ...ctx(), csp: { d: e.violatedDirective, b: String(e.blockedURI).slice(0, 120) } })], { type: 'text/plain' })));
}
```

Collector (Netlify Function, `(verify v2 signature)`):

```js
// netlify/functions/rum.mjs  -- collector (Netlify Functions v2: default export + config.path; verify against current docs)
// Append-only writes (Blobs has no atomic increment): one small JSON per beacon under rum/<yyyy-mm-dd>/<uuid>. A scheduled function
// compacts + evaluates (rum/evaluate.mjs). ~110 page views/day => a few hundred objects/day: trivial cost. No IP, no UA string is stored.
import { getStore } from '@netlify/blobs';

const METRICS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const MAX_BYTES = 4096;

export default async (req, context) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return new Response(null, { status: 413 });
  let b; try { b = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const day = new Date().toISOString().slice(0, 10);
  const base = { day, build: String(b.build ?? '').slice(0, 24), page: String(b.page ?? '/').slice(0, 60), layout: b.layout === 'mobile' ? 'mobile' : 'desktop',
    vw: b.vw | 0, dpr: +b.dpr || 1, mem: b.mem ?? null, cores: b.cores | 0, net: b.net ?? null, sw: !!b.sw, bot: !!b.bot,
    country: context.geo?.country?.code ?? null };                                    // segmentation only; never the IP (context.ip is deliberately unused)
  const store = getStore('rum');
  const puts = [];
  for (const m of Array.isArray(b.metrics) ? b.metrics : []) {
    if (!METRICS.has(m.name) || !Number.isFinite(m.value)) continue;                   // schema gate: unknown/NaN metrics are dropped
    puts.push(store.setJSON(`${day}/${crypto.randomUUID()}`, { ...base, kind: 'metric', metric: m.name, value: m.value, rating: m.rating, attr: m.attr ?? null }));
  }
  if (b.error) puts.push(store.setJSON(`${day}/${crypto.randomUUID()}`, { ...base, kind: 'error', ...b.error }));
  if (b.csp) puts.push(store.setJSON(`${day}/${crypto.randomUUID()}`, { ...base, kind: 'csp', ...b.csp }));
  await Promise.all(puts);
  return new Response(null, { status: 204 });
};
export const config = { path: '/api/rum' };
```

Evaluator (executed, 6 tests):

```js
// rum/evaluate.mjs -- pure alert logic (unit-tested). Input: metric events; output: state per segment + alerts.
// Why rolling windows and minimum samples: the site gets ~110 page views/day (Netlify Web Analytics, 30 d: 3,389 views), so a daily p75 over
// one device class is 20-40 samples -- pure noise. Alert on 7-day windows with >= 100 samples, page a human only when Poor persists.
export const THRESHOLDS = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25], FCP: [1800, 3000], TTFB: [800, 1800] };   // [good<=, poor>]

/** nearest-rank percentile (the definition CrUX/web.dev use for p75 is the 75th percentile of the distribution) */
export function pct(values, p) {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}
export const rate = (metric, v) => (v <= THRESHOLDS[metric][0] ? 'good' : v > THRESHOLDS[metric][1] ? 'poor' : 'needs-improvement');
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

/** p75 for [end-windowDays+1 .. end] per (metric, layout, page group), humans only */
export function windowState(events, end, { windowDays = 7, minSamples = 100 } = {}) {
  const start = addDays(end, -(windowDays - 1)), groups = new Map();
  for (const e of events) {
    if (e.kind !== 'metric' || e.bot || e.day < start || e.day > end) continue;
    for (const key of [`${e.metric}|${e.layout}|*`, `${e.metric}|${e.layout}|${e.page}`]) (groups.get(key) ?? groups.set(key, []).get(key)).push(e.value);
  }
  const out = {};
  for (const [key, vals] of groups) {
    const [metric] = key.split('|');
    out[key] = vals.length < minSamples ? { n: vals.length, state: 'insufficient' } : { n: vals.length, p75: pct(vals, 75), state: rate(metric, pct(vals, 75)) };
  }
  return out;
}

/**  page  : p75 is Poor for 2 consecutive daily evaluations (not a blip)
 *   warn  : p75 is Needs-Improvement or worse for 3 consecutive daily evaluations
 *   regress: p75 worsened >= 15% vs the previous window AND is already above 90% of the Good ceiling (catches a bad deploy before Poor) */
export function evaluate(events, today, opts = {}) {
  const alerts = [], now = windowState(events, today, opts);
  const hist = [1, 2].map((d) => windowState(events, addDays(today, -d), opts));
  const prevWindow = windowState(events, addDays(today, -(opts.windowDays ?? 7)), opts);
  for (const [key, cur] of Object.entries(now)) {
    if (cur.state === 'insufficient') continue;
    const [metric, layout, page] = key.split('|');
    const stateAt = (h) => h[key]?.state;
    if (cur.state === 'poor' && stateAt(hist[0]) === 'poor') alerts.push({ level: 'page', key, p75: cur.p75, n: cur.n, why: `${metric} p75 ${Math.round(cur.p75 * 1000) / 1000} is Poor on ${layout} ${page} for 2 consecutive days` });
    else if (cur.state !== 'good' && stateAt(hist[0]) === cur.state && stateAt(hist[1]) === cur.state) alerts.push({ level: 'warn', key, p75: cur.p75, n: cur.n, why: `${metric} p75 ${Math.round(cur.p75 * 1000) / 1000} is ${cur.state} on ${layout} ${page} for 3 consecutive days` });
    const prev = prevWindow[key];
    if (prev?.p75 && cur.p75 >= prev.p75 * 1.15 && cur.p75 > 0.9 * THRESHOLDS[metric][0]) alerts.push({ level: 'regress', key, p75: cur.p75, n: cur.n, why: `${metric} p75 worsened ${(100 * (cur.p75 / prev.p75 - 1)).toFixed(0)}% vs previous window` });
  }
  return { state: now, alerts };
}

/** new error signatures per build: any error message first seen on this build (or > 0.5% of sessions) is an alert */
export function newErrors(events, today, knownSignatures = new Set()) {
  const seen = new Map();
  for (const e of events) if (e.kind === 'error' && e.day === today) { const sig = `${e.message}|${e.where}`; seen.set(sig, (seen.get(sig) ?? 0) + 1); }
  return [...seen].filter(([sig]) => !knownSignatures.has(sig)).map(([sig, n]) => ({ level: 'page', why: `new JS error x${n}: ${sig.slice(0, 140)}` }));
}
```

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pct, rate, windowState, evaluate, newErrors } from './evaluate.mjs';

// deterministic pseudo-random (LCG) so the test is reproducible
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const day = (i) => new Date(Date.parse('2026-09-01T00:00:00Z') + i * 864e5).toISOString().slice(0, 10);
function synth({ days, perDay, median, spread = 0.35, metric = 'LCP', layout = 'mobile', bot = false, from = 0, seed = 7 }) {
  const r = lcg(seed), out = [];
  for (let d = from; d < days; d++) for (let i = 0; i < perDay; i++) out.push({ kind: 'metric', day: day(d), metric, layout, page: '/', bot, value: median * Math.exp((r() - 0.5) * 2 * spread) });
  return out;
}

test('nearest-rank p75 and rating boundaries follow Google thresholds', () => {
  assert.equal(pct([1, 2, 3, 4], 75), 3);
  assert.equal(rate('LCP', 2500), 'good'); assert.equal(rate('LCP', 2501), 'needs-improvement'); assert.equal(rate('LCP', 4001), 'poor');
  assert.equal(rate('CLS', 0.1), 'good'); assert.equal(rate('INP', 501), 'poor');
});

test('too few samples is "insufficient", never an alert (110 views/day cannot support daily p75)', () => {
  const ev = synth({ days: 14, perDay: 5, median: 6000 });
  const r = evaluate(ev, day(13));
  assert.equal(Object.values(r.state).every((s) => s.state === 'insufficient'), true);
  assert.deepEqual(r.alerts, []);
});

test('sustained Poor LCP on mobile pages a human; bots are excluded from the population', () => {
  const human = synth({ days: 14, perDay: 40, median: 5200 });                 // p75 ~ 6 s => poor
  const bots = synth({ days: 14, perDay: 200, median: 500, bot: true, seed: 99 });   // would drag p75 to "good" if counted
  const r = evaluate([...human, ...bots], day(13));
  const a = r.alerts.filter((x) => x.level === 'page');
  assert.ok(a.length >= 1, JSON.stringify(r.state));
  assert.match(a[0].why, /LCP p75 .* Poor on mobile/);
});

test('a bad deploy is caught as a regression before it turns Poor', () => {
  const before = synth({ days: 8, perDay: 40, median: 1900, seed: 3 });                 // good (~2.1 s p75)
  const after = synth({ days: 14, from: 8, perDay: 40, median: 2500, seed: 4 });        // +30%: needs-improvement, not yet poor
  const r = evaluate([...before, ...after], day(13));
  assert.ok(r.alerts.some((x) => x.level === 'regress'), JSON.stringify(r.alerts));
  assert.ok(!r.alerts.some((x) => x.level === 'page'));
});

test('healthy site raises nothing', () => {
  const r = evaluate(synth({ days: 14, perDay: 40, median: 1500 }), day(13));
  assert.deepEqual(r.alerts, []);
});

test('a brand-new JS error signature pages immediately; a known one does not', () => {
  const ev = [{ kind: 'error', day: day(5), message: 'setGoldUnit is not defined', where: 'index-Cg8FAMXN.js:1:1' }];
  assert.equal(newErrors(ev, day(5)).length, 1);
  assert.equal(newErrors(ev, day(5), new Set(['setGoldUnit is not defined|index-Cg8FAMXN.js:1:1'])).length, 0);
});
```

---

## Appendix B. Supporting configuration and workflows

Not counted among the ten tests but needed to run them. Files that exist in `tmp-qa-ci/sketches/` and are not reproduced here: `tests/static/{site-lint,undef-globals,asset-integrity,prod-probe}.mjs` (executed; outputs in Appendix C), `tools/{scorecard,gen-headers}.mjs` + tests, `perf/run-lighthouse.mjs`, `.github/workflows/{nightly,prod-monitor}.yml`.

### B.1 Generated `_headers` (fixes X4 and T3; delete all `[[headers]]` from `netlify.toml` when adopting it)

```js
// tools/gen-headers.mjs  (audit X3, X4, T3)  -- generate dist/_headers from ONE template; never hand-write cascading /* rules.
// Why: Netlify merges header rules, so `X-Frame-Options = ""` on /embed.html cannot remove the site-wide DENY (verified live), and once CSP is
// enforced browsers INTERSECT multiple CSP headers, so a second `frame-ancestors *` on the embed path would still lose to a site-wide
// `frame-ancestors 'none'`. Fix = no site-wide framing rule at all: one rule per path group, generated from the built file list.
// usage: node tools/gen-headers.mjs <distDir> <production|deploy-preview|branch-deploy>
import fs from 'node:fs';

const POLICY = (frameAncestors) => [
  "default-src 'self'", "script-src 'self' api.mapbox.com cdn.jsdelivr.net", "style-src 'self' api.mapbox.com fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com", "img-src 'self' data: blob: api.mapbox.com *.tiles.mapbox.com",
  "connect-src 'self' api.mapbox.com events.mapbox.com *.tiles.mapbox.com 0.peerjs.com wss://0.peerjs.com ingesteer.services-prod.nsvcs.net",
  'frame-src www.google.com www.nps.gov', "worker-src 'self' blob:", "media-src 'self' blob:", "object-src 'none'", "base-uri 'self'",
  `frame-ancestors ${frameAncestors}`, 'report-uri /api/csp',
].join('; ');                                                     // CANDIDATE policy: the e2e run against it decides what must change (5.10)

const BASE = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Permitted-Cross-Domain-Policies': 'none',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self), payment=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)',
};

export function buildHeaders(files, context) {
  const rules = [];
  const noindex = context !== 'production' ? { 'X-Robots-Tag': 'noindex, nofollow' } : {};
  const rule = (path, h) => rules.push({ path, h: { ...BASE, ...noindex, ...h } });
  for (const f of files.filter((x) => x.endsWith('.html'))) {
    const isEmbed = f === 'embed.html';
    const h = { 'Cache-Control': 'no-cache, must-revalidate',
      'Content-Security-Policy': POLICY(isEmbed ? '*' : "'none'"), ...(isEmbed ? {} : { 'X-Frame-Options': 'DENY' }) };
    rule('/' + f, h);
    if (f !== 'index.html') rule('/' + f.replace(/\.html$/, ''), h);        // pretty-URL form gets the identical policy (T3: one cache policy)
    else rule('/', h);
  }
  rule('/assets/*', { 'Cache-Control': 'public, max-age=31536000, immutable' });
  rule('/data/v2/*', { 'Cache-Control': 'public, max-age=31536000, immutable' });
  rule('/icons/*', { 'Cache-Control': 'public, max-age=31536000, immutable' });
  rule('/sw.js', { 'Cache-Control': 'no-cache, no-store, must-revalidate' });
  rule('/version.json', { 'Cache-Control': 'no-cache' });
  rule('/user-guide.pdf', { 'Cache-Control': 'public, max-age=86400', 'Content-Disposition': 'attachment; filename="Gettysburg-Interactive-Map-User-Guide.pdf"' });
  return rules.map((r) => `${r.path}\n` + Object.entries(r.h).map(([k, v]) => `  ${k}: ${v}`).join('\n')).join('\n\n') + '\n';
}

/** invariants the header tests (and HP-06/07 on the live preview) rely on */
export function invariants(text) {
  const blocks = text.trim().split(/\n\n/).map((b) => { const [p, ...l] = b.split('\n'); return { path: p, lines: l.map((x) => x.trim()) }; });
  const problems = [];
  if (blocks.some((b) => b.path === '/*')) problems.push('a site-wide /* rule exists (it would cascade onto /embed.html)');
  for (const b of blocks) {
    const csp = b.lines.filter((l) => /^Content-Security-Policy:/i.test(l));
    if (csp.length > 1) problems.push(`${b.path}: ${csp.length} CSP headers (browsers intersect them)`);
    const xfo = b.lines.some((l) => /^X-Frame-Options:/i.test(l)), fa = csp[0]?.match(/frame-ancestors ([^;]+)/)?.[1];
    if (b.path.startsWith('/embed')) { if (xfo) problems.push('/embed.html sends X-Frame-Options'); if (fa !== '*') problems.push('/embed.html frame-ancestors is not *'); }
    else if (csp.length && fa !== "'none'") problems.push(`${b.path}: frame-ancestors ${fa}`);
  }
  return problems;
}

if (process.argv[1]?.endsWith('gen-headers.mjs') && process.argv[2]) {
  const [dir, ctx = 'production'] = process.argv.slice(2);
  const text = buildHeaders(fs.readdirSync(dir), ctx);
  const bad = invariants(text);
  if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
  fs.writeFileSync(`${dir}/_headers`, text);
  console.log(`wrote ${dir}/_headers (${text.split('\n').length} lines, context=${ctx})`);
}
```

### B.2 `netlify.toml` after the change (sketch)

```toml
[build]
  command = "pnpm build && node tools/gen-headers.mjs dist $CONTEXT && node tests/static/site-lint.mjs dist && node tests/static/asset-integrity.mjs dist"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

# no [[headers]] blocks: dist/_headers is generated (X4). Redirects stay here:
[[redirects]]
  from = "/index.html"
  to = "/"
  status = 301
  force = true

[[redirects]]
  from = "/landing.html"          # retired page that was indexed (deploy-history 9.4)
  to = "/"
  status = 301
  force = true

# the scanner-path 404 rules from the current file stay unchanged
```

### B.3 `size-limit` (per-chunk brotli budgets from `bundle-anatomy.md` 4.1; budgets only tighten)

```json
{
  "size-limit": [
    { "name": "entry",        "path": "dist/assets/entry-*.js",        "brotli": true, "limit": "58 KB" },
    { "name": "map (mapbox-gl 3.24.1 + engine)", "path": "dist/assets/map-*.js", "brotli": true, "limit": "470 KB" },
    { "name": "panel: walkthrough", "path": "dist/assets/walkthrough-*.js", "brotli": true, "limit": "7 KB" },
    { "name": "panel: search+filter+legend+minimap", "path": "dist/assets/search-*.js", "brotli": true, "limit": "6 KB" },
    { "name": "html (index)",  "path": "dist/index.html",              "brotli": true, "limit": "5 KB" },
    { "name": "data: day1 first paint", "path": "dist/data/v2/day1-*.json", "brotli": true, "limit": "8 KB" },
    { "name": "data: oob",     "path": "dist/data/v2/oob-*.json",       "brotli": true, "limit": "45 KB" }
  ]
}
```

### B.4 `pa11y-ci.json` (nightly; panel states through `actions`)

```json
{
  "defaults": { "standard": "WCAG2AA", "runners": ["htmlcs", "axe"], "timeout": 60000, "chromeLaunchConfig": { "args": ["--no-sandbox"] } },
  "urls": [
    { "url": "https://gettysburginteractivemap.com/?intro=0&layout=desktop&test=1", "viewport": { "width": 1440, "height": 900 } },
    { "url": "https://gettysburginteractivemap.com/?intro=0&layout=mobile&test=1",  "viewport": { "width": 375, "height": 812, "isMobile": true, "hasTouch": true } },
    { "url": "https://gettysburginteractivemap.com/?intro=0&layout=mobile&test=1", "actions": ["click element [aria-label=\"Tools\"]", "wait for element [role=dialog] to be visible"], "viewport": { "width": 375, "height": 812 } }
  ]
}
```

### B.5 `lefthook.yml` (T0)

```yaml
pre-commit:
  parallel: true
  commands:
    format:   { glob: "*.{ts,tsx,js,mjs,json,md,css}", run: pnpm prettier --check {staged_files} }
    lint:     { glob: "*.{ts,tsx,js,mjs}", run: pnpm eslint {staged_files} }
    styles:   { glob: "*.css", run: pnpm stylelint {staged_files} }
    secrets:  { run: gitleaks protect --staged --redact }
    data:     { glob: "data/**/*.json", run: node pipeline/validate/run.mjs --quick }
    patches:  { glob: "legacy/patches/**", run: node tests/static/undef-globals.mjs legacy/dist/assets/index-*.js }
```

### B.6 `.github/workflows/ci.yml` (T1) and `preview.yml` (T2)

```yaml
# .github/workflows/ci.yml  -- Tier 1: every push and PR. Budget: <= 6 min wall clock. Nothing here needs a browser except job "e2e-pr".
name: ci
on:
  pull_request:
  push: { branches: [main] }
concurrency: { group: 'ci-${{ github.ref }}', cancel-in-progress: true }
permissions: { contents: read, pull-requests: write, checks: write }

env:
  NODE_VERSION: '22'          # pinned in .nvmrc too; Renovate/Dependabot bumps both
  PNPM_VERSION: '9'

jobs:
  static:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }                                   # gitleaks + changed-files need history
      - uses: pnpm/action-setup@v4
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with: { node-version: '${{ env.NODE_VERSION }}', cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint                                             # eslint (react-hooks, jsx-a11y strict, no-undef), stylelint (tokens, min font, z-index scale)
      - run: pnpm typecheck                                        # tsc --noEmit, strict
      - run: pnpm test:unit                                        # vitest + node:test (time model, geometry, rum evaluate, parity registry)
      - run: node pipeline/validate/run.mjs --strict               # DV-01..DV-30 with the known-failures ratchet
      - uses: gitleaks/gitleaks-action@v2                          # secrets: Mapbox/Google keys must live in env, not in git (X1/X2)
      - run: pnpm audit --audit-level=high

  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    needs: static
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with: { node-version: '${{ env.NODE_VERSION }}', cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env: { VITE_MAPBOX_TOKEN: '${{ secrets.MAPBOX_PUBLIC_TOKEN_CI }}', BUILD_ID: '${{ github.sha }}' }
      - run: node tests/static/site-lint.mjs dist                  # SL-01..SL-26 (case-exact asset refs, sitemap parity, CSP contract, ...)
      - run: node tests/static/undef-globals.mjs dist/assets/*.js  # C5-class free-variable gate on the BUILT output
      - run: pnpm size-limit                                       # per-chunk brotli budgets (budgets only tighten)
      - run: node tests/static/asset-integrity.mjs dist            # hash == filename, no lower-cased names, sw precache resolves
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist, retention-days: 7 }

  e2e-pr:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    needs: build
    container: { image: 'mcr.microsoft.com/playwright:v1.50.0-noble' }      # pin: screenshots must be byte-stable (bump deliberately; verify tag exists)
    strategy: { fail-fast: false, matrix: { shard: [1, 2, 3, 4] } }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with: { node-version: '${{ env.NODE_VERSION }}', cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: pnpm exec playwright test --shard=${{ matrix.shard }}/4     # TIER=pr (8 viewports x chromium, + webkit/firefox smoke), console gate on
        env: { TIER: pr, CI: '1' }
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: 'playwright-report-${{ matrix.shard }}', path: 'playwright-report reports', retention-days: 14 }
```

```yaml
# .github/workflows/preview.yml -- Tier 2: runs against the Netlify Deploy Preview of the PR (real CDN, real headers, real brotli).
# Netlify's GitHub app publishes a deployment_status when the preview is ready (verify the event fires for your site; fallback in comment).
name: preview
on: { deployment_status: }
permissions: { contents: read, pull-requests: write, checks: write, statuses: write }

jobs:
  gate:
    if: github.event.deployment_status.state == 'success' && github.event.deployment_status.environment != 'Production'
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      BASE_URL: ${{ github.event.deployment_status.environment_url }}      # https://deploy-preview-<n>--friendly-lolly-da85c0.netlify.app
      CI: '1'
    steps:
      # fallback if the event is not delivered: netlify deploy --dir=dist --alias=pr-${{ github.event.number }} --json  (needs NETLIFY_AUTH_TOKEN)
      - uses: actions/checkout@v4
        with: { ref: '${{ github.event.deployment.sha }}' }
      - uses: pnpm/action-setup@v4
        with: { version: '9' }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium webkit firefox

      - name: headers / redirects / cache contract on the REAL preview
        run: pnpm exec playwright test tests/e2e/headers.spec.ts --project=chromium-w1440-d
      - name: full PR-tier browser suite (viewports x states, tappability, overlap, one-clock, service worker, console gate)
        run: TIER=pr pnpm exec playwright test --project='chromium-*' --project='webkit-*'
      - name: axe state matrix
        run: TIER=pr pnpm exec playwright test tests/a11y
      - name: visual regression (baselines were generated in this same container image)
        run: TIER=pr pnpm exec playwright test tests/visual

      - name: Lighthouse x5 median, mobile and desktop, 6 URLs (home shell, search, dashboard, compare, historian, regiment)
        run: |
          for p in mobile desktop; do
            for u in / /search.html /dashboard.html /compare.html /historian.html /regiment.html; do
              for i in 1 2 3 4 5; do node perf/run-lighthouse.mjs "$BASE_URL$u" --profile $p --out reports/lh/$p-$(echo $u | tr / _)-$i.json; done
              node perf/assert-lh.mjs $p reports/lh/$p-$(echo $u | tr / _)-*.json --tier green
            done
          done

      - name: post summary comment (scorecard delta) on the PR
        if: always()
        run: node tools/scorecard.mjs --from reports --pr ${{ github.event.deployment.ref }} --comment
        env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
```

### B.7 `lighthouserc.cjs` (optional, if `@lhci/cli` is kept for its dashboard; assertion ids must match the Lighthouse version it bundles)

```js
module.exports = { ci: {
  collect: { numberOfRuns: 5, url: ['http://127.0.0.1:4173/', 'http://127.0.0.1:4173/search.html'], settings: { preset: 'desktop' } },   // second config file without preset for mobile
  assert: { assertions: {
    'categories:performance': ['error', { minScore: 0.95 }], 'categories:accessibility': ['error', { minScore: 1 }],
    'categories:best-practices': ['error', { minScore: 1 }], 'categories:seo': ['error', { minScore: 1 }],
    'first-contentful-paint': ['error', { maxNumericValue: 1800 }], 'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
    'total-blocking-time': ['error', { maxNumericValue: 200 }], 'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
    'redirects': ['error', { minScore: 1 }], 'valid-source-maps': ['error', { minScore: 1 }], 'errors-in-console': ['error', { minScore: 1 }],
  } },
  upload: { target: 'filesystem', outputDir: 'reports/lhci' },        // never temporary-public-storage for private previews
} };
```

---

## Appendix C. Measured outputs (prototypes run on the real deployed files, 2026-09-30)

Commands and inputs: `SRC_DIR` = `.../claude/site/src` (correct-case), `DEPLOY_DIR` = `.../claude/site/deploy` (case-mangled zip), `bundle.pretty.js`, `lh_mobile.json`/`lh_desktop.json` (Lighthouse 13.5.0). The data-validator results are tabulated in section 5.8; the header probe was captured against production before a later re-run started timing out from this machine.

```text
===== C.1 tests/static/site-lint.mjs  (node tests/static/site-lint.mjs <SRC_DIR>)
PASS SL-01 [N1,T-01] 
FAIL SL-02 [E3] pages without exactly one <h1>: index.html=3
FAIL SL-03 [D2,A6,S1] 11/23 pages without a <main> landmark: ar.html, camera.html, cinematic-export.html, compare.html, ground-remembers.html, immersive.html, index.html, privacy.html, sandbox.html, terms.html, viewshed.html
WARN SL-04 [T1,E2] no twitter:card: ar.html, cinematic-export.html, find-ancestor.html, ground-remembers.html, historian.html, immersive.html, living-ledger.html, privacy.html, regiment.html, terms.html, turning-points.html, watch-together.html; no og:image: p
PASS SL-05 [T1] 
FAIL SL-06 [E5,T3] indexable pages missing from sitemap: privacy.html, terms.html; sitemap URLs with no file: 
WARN SL-07 [T3,T1] canonical missing or not equal to a sitemap <loc>: privacy.html, terms.html
FAIL SL-08 [E1] manifest.orientation="landscape" locks the PWA
FAIL SL-09 [E2,NEW-OG] undecodable/missing images: /screenshots/day1.png: IHDR 1280x720 colortype 2 expects 2765520 inflated bytes but IDAT holds 3687120 | /screenshots/day3.png: IHDR 1280x720 colortype 2 expects 2765520 inflated bytes but IDAT holds 3687120
WARN SL-10 [NEW-OG] manifest screenshots are byte-identical files
PASS SL-11 [X3] 
FAIL SL-12 [X3] script-src allows 'unsafe-inline'
FAIL SL-13 [X3] CSP has no report-uri/report-to: violations are never collected, so the report-only soak cannot conclude
FAIL SL-14 [X3,P7] connect-src lacks Netlify RUM host ingesteer.services-prod.nsvcs.net
FAIL SL-15 [X4] embed.html tries to blank X-Frame-Options (Netlify keeps the site-wide DENY, so the page is served with XFO:DENY + frame-ancestors *)
WARN SL-16 [T3] no redirect collapsing /index.html or /*.html onto one canonical URL form
FAIL SL-17 [X4] dev/internal pages in publish dir: diagnostics.html, unit-rendering-reference.html
FAIL SL-18 [X5] origins used but not named on privacy.html: peerjs.com, cdn.jsdelivr.net, nps.gov
FAIL SL-19 [X5] privacy.html does not disclose the AR camera / device-motion permissions requested by /ar.html
FAIL SL-20 [H7,C7,H10] 5 banned strings: ar.html:haven.t been able to | dashboard.html:should be reconciled | search.html:Commander unrecorded | viewshed.html:Earlier drafts | assets/HelpModal-CFV9T0zH.js:445\+
FAIL SL-21 [C6] index.html reloads the page on serviceWorker controllerchange
FAIL SL-22 [C6,DH-02] sw.js hard-codes hashed asset names (every rebuild breaks install)
FAIL SL-23 [DH-03] sw.js caches responses without an res.ok guard
WARN SL-24 [X3] inline <script> blocks block a strict CSP: ar.html=1, camera.html=1, cinematic-export.html=1, compare.html=1, dashboard.html=1, diagnostics.html=1, documentary.html=1, education.html=1, embed.html=1, find-ancestor.html=1, ground-remembers.html=
PASS SL-25 [pagesB-11] 
WARN SL-26 [X1,T-08] public Mapbox token literal hard-coded in 9 HTML pages (move to one config + URL restriction)

26 checks, 16 errors, 6 warnings

----- same script on the case-mangled DEPLOY_DIR (only SL-01 differs)
FAIL SL-01 [N1,T-01] 8 broken/case-mismatched references, e.g. index.html -> /assets/index-Cg8FAMXN.js | index.html -> /assets/index-B4G7Z_2G.css | index.html -> /assets/index-B4G7Z_2G.css | index.html -> /assets/index-Cg8FAMXN.js
26 checks, 17 errors, 6 warnings

===== C.2 tests/static/undef-globals.mjs  (free identifiers in bundle.pretty.js, browser-only globals allowlisted)
UNDEFINED bundle.pretty.js CanvasRenderer x3 at 96556:8, 96556:43, 96557:14
UNDEFINED bundle.pretty.js setGoldUnit x2 at 101086:12, 101229:32
UNDEFINED bundle.pretty.js clearGoldTrail x2 at 101086:29, 101229:51
UNDEFINED bundle.pretty.js drawGoldTrailSegment x1 at 101101:17

4 undefined identifier(s)

===== C.3 tests/static/asset-integrity.mjs  (case-mangled DEPLOY_DIR, then a simulated same-name/different-bytes asset vs the previous manifest)
5 assets checked
FAIL index.html references index-Cg8FAMXN.js but the file on disk is index-cg8famxn.js (case mismatch: 404 on Netlify)
FAIL index.html references index-B4G7Z_2G.css but the file on disk is index-b4g7z_2g.css (case mismatch: 404 on Netlify)
FAIL sw.js references index-Cg8FAMXN.js but the file on disk is index-cg8famxn.js (case mismatch: 404 on Netlify)
5 assets checked
FAIL index-B4G7Z_2G.css exists in production with different bytes (immutable cache + SW cache-first will serve the OLD file to returning visitors)

===== C.4 tests/static/prod-probe.mjs  (production, captured 2026-09-29; a later re-run timed out from this machine)
FAIL HP-01 [X3] no enforcing Content-Security-Policy on / (report-only present: true)
FAIL HP-02 [X3] CSP has no reporting endpoint: violations from real browsers are invisible
FAIL HP-03 [X3] script-src allows 'unsafe-inline'
PASS HP-04 [-] 
PASS HP-05 [-] 
FAIL HP-06 [X4] embed.html sends X-Frame-Options: DENY AND CSP frame-ancestors (conflicting; browsers honour frame-ancestors, hygiene bug)
FAIL HP-07 [X4] embed.html still carries the site-wide report-only CSP (the toml override to "" is not honoured)
PASS HP-08 [C6] 
PASS HP-09 [P2] 
FAIL HP-10 [T3] /index.html -> 200 (canonical https://gettysburginteractivemap.com/)
FAIL HP-11 [T3] both URL forms serve 200 (splits analytics/RUM/links): /search=200, /dashboard=200, /compare=200, /camera=200, /documentary=200, /report=200, /education=200, /aftermath=200
FAIL HP-12 [E5] sitemap omits privacy/terms
FAIL HP-13 [T2,X4] paths that should not answer 200: /unit-rendering-reference.html
PASS HP-14 [G1] 
FAIL HP-15 [N1] /version.json (build id + data version + time-model version) is missing: a probe cannot tell which deploy it is testing

15 probes, 10 failing

===== C.5 perf/assert-lh.mjs mobile  (lh_mobile.json, Lighthouse 13.5.0, --tier green)
profile=mobile tier=green runs=1 lighthouse=13.5.0
FAIL category performance: 0.640 >= 0.95
FAIL category accessibility: 0.900 >= 1
FAIL category best-practices: 0.960 >= 1
PASS category seo: 1.000 >= 1
FAIL first-contentful-paint: 4099 ms <= 1800 ms
FAIL largest-contentful-paint: 9007 ms <= 2500 ms
PASS total-blocking-time: 27 ms <= 200 ms
FAIL speed-index: 4099 ms <= 3400 ms
PASS server-response-time: 25 ms <= 800 ms
PASS cumulative-layout-shift: 0.073 <= 0.1
FAIL audit redirects: 0.000 >= 1
FAIL audit valid-source-maps: 0.000 >= 1
FAIL audit color-contrast: 0.000 >= 1
FAIL audit label: 0.000 >= 1
FAIL audit inspector-issues: 0.000 >= 1
PASS audit errors-in-console: 1.000 >= 1
FAIL audit unused-javascript: 0.000 >= 0.9
FAIL audit bootup-time: 0.000 >= 0.9
FAIL audit mainthread-work-breakdown: 0.000 >= 0.9
FAIL audit render-blocking-insight: 0.500 >= 0.9
FAIL audit network-dependency-tree-insight: 0.000 >= 0.9
PASS audit cls-culprits-insight: 1.000 >= 1
PASS audit target-size: 1.000 >= 1
PASS audit is-crawlable: 1.000 >= 1
FAIL transfer bytes script: 614184 B <= 560000 B
FAIL transfer bytes total: 1577215 B <= 1400000 B

18 failing assertion(s)

===== C.6 perf/assert-lh.mjs desktop (lh_desktop.json, --tier green)
profile=desktop tier=green runs=1 lighthouse=13.5.0
FAIL category performance: 0.850 >= 0.95
FAIL category accessibility: 0.900 >= 1
FAIL category best-practices: 0.960 >= 1
PASS category seo: 1.000 >= 1
PASS first-contentful-paint: 831 ms <= 1800 ms
PASS largest-contentful-paint: 2229 ms <= 2500 ms
PASS total-blocking-time: 0 ms <= 200 ms
PASS speed-index: 1935 ms <= 3400 ms
PASS server-response-time: 26 ms <= 800 ms
PASS cumulative-layout-shift: 0.023 <= 0.1
FAIL audit redirects: 0.000 >= 1
FAIL audit valid-source-maps: 0.000 >= 1
FAIL audit color-contrast: 0.000 >= 1
FAIL audit label: 0.000 >= 1
FAIL audit inspector-issues: 0.000 >= 1
PASS audit errors-in-console: 1.000 >= 1
FAIL audit unused-javascript: 0.000 >= 0.9
FAIL audit bootup-time: 0.500 >= 0.9
FAIL audit mainthread-work-breakdown: 0.500 >= 0.9
FAIL audit render-blocking-insight: 0.000 >= 0.9
PASS audit network-dependency-tree-insight: 1.000 >= 0.9
PASS audit cls-culprits-insight: 1.000 >= 1
PASS audit target-size: 1.000 >= 1
PASS audit is-crawlable: 1.000 >= 1
FAIL transfer bytes script: 614084 B <= 560000 B
FAIL transfer bytes total: 1694881 B <= 1400000 B

14 failing assertion(s)

===== C.7 tools/scorecard.mjs  (109 catalogued gates; content/design/function have no static gate yet)
category     desktop   mobile    failing gates (desktop|mobile)
data         F         F         DV-01,DV-03,DV-04,DV-05,DV-06,DV-07 | DV-01,DV-03,DV-04,DV-05,DV-06,DV-07
polish       F         F         SL-09,SL-10,SL-20 | SL-09,SL-10,SL-20
usability    B         B         SL-08 | SL-08
reliability  F         F         SL-21,SL-22,SL-23,HP-15,UNDEF-1,LH-D:category best-practices | SL-21,SL-22,SL-23,HP-15,UNDEF-1,LH-M:categor
performance  D         F         LH-D:category performance,LH-D:audit redirects,LH-D:audit unused-javascript,LH-D:audit bootup-time,LH-D:aud
a11y         F         F         SL-03,LH-D:category accessibility,LH-D:audit color-contrast,LH-D:audit label | SL-03,LH-M:category accessib
seo          B         B         SL-02,SL-04,SL-06,SL-07,SL-16,HP-10 | SL-02,SL-04,SL-06,SL-07,SL-16,HP-10
security     F         F         SL-12,SL-13,SL-14,SL-15,SL-17,SL-24 | SL-12,SL-13,SL-14,SL-15,SL-17,SL-24
docs         A-        A-         | 
privacy      F         F         SL-18,SL-19 | SL-18,SL-19
```

### C.8 Ratchet demonstration (`tests/data/validate.test.mjs`, `DATA_DIR=<SRC_DIR>/data`)

```text
seeded registry (12 expected-red entries)      -> tests 15, pass 15, fail 0
empty registry                                 -> tests 15, pass  3, fail 12
stale entry (DV-14 passes but is registered)   -> tests 15, pass 14, fail 1   "DV-14 is in known-failures.json but now PASSES: delete the entry (ratchet)"
```

### C.9 Unit-test run (all pure-logic tests, no browser)

```text
node --test tests/lib/*.test.mjs tests/parity/*.test.mjs rum/*.test.mjs tools/*.test.mjs tests/data/validate.test.mjs
  layout-audit geometry 7 | parity registry 4 | rum evaluate 6 | scorecard 4 | gen-headers 4 | data checks 15 (expected-red mode)
```

### C.10 Generated `_headers` sample (context = deploy-preview, from the real file list; `/embed.html` has one CSP with `frame-ancestors *` and no `X-Frame-Options`, every other page `frame-ancestors 'none'` + `X-Frame-Options: DENY`, no `/*` rule)

The generator's invariants (`invariants()`) and 4 unit tests pass; see B.1.



---

## Verification

Adversarial verifier pass, 2026-09-30. Method: re-opened every cited file:line (`netlify.toml`, `index.html`, `sw.js`, `manifest.json`, `historian.html`, `watch-together.html`, `bundle.pretty.js`, `HelpModal-CFV9T0zH.js`, `data/*`, `user-guide.pdf`, `lh_mobile.json`/`lh_desktop.json`, Netlify PDFs, `Downloads/gettysburg_FINAL_v24`); re-ran the prototypes from a copy of `tmp-qa-ci/sketches` (40/40 `node:test` tests pass; `site-lint` 26 checks / 16 errors / 6 warnings; `prod-probe` 10 of 15 fail live; `validate.mjs` DV numbers); re-derived DV-01/03/04/05/06/07/08 independently in Python; live `curl` of headers and assets (sha256 of the three deployed assets equals `SRC_DIR`); fetched Netlify, GitHub, Chrome and npm/MCR sources for the tool claims. Browser-level "red today" claims (C1, C2, H1-H4, ...) cannot be re-run here (no browser tools) and were checked only against code and the audit.

Legend: CONFIRMED = evidence and fix hold. CORRECTED = core finding stands but a fact, number or design step is wrong or missing (correction given). Nothing was REFUTED outright; nothing is UNVERIFIABLE except where marked inside a correction.

### Verdict table

| Id | Verdict | Correction / note |
|---|---|---|
| qa-ci-01 | CORRECTED | Evidence real: `netlify.toml:2`, old `ci.yml:52-56` `continue-on-error: true`, `UnicodeEncodeError` reproduced at `validate_data.py:26`, `1 <= tick <= 675` and `KEY_EVENT_TICKS` at `validate_data.py:43,182`. Fixes: (a) `netlify.toml:1` does have a `[build]` table (only `publish`); the true statement is "no build command". (b) "private repo + protect `main` with required checks + no admin bypass" and the `production` environment "required reviewer" (qa-ci-19, 4.4) are NOT available on GitHub Free for private repos (protected branches: public repos on Free, private repos need Pro/Team; environments: private repos need Pro/Team; docs.github.com pages fetched). Decide: pay for Pro (personal) or make the repo public after the one-time gitleaks history scan. (c) "the data has not changed since" has two exceptions per `deploy-history.md:13` (5 dash bytes Aug 22, new `monuments.json` Sep 9); immaterial. |
| qa-ci-02 | CORRECTED | site-lint (16 err / 6 warn), prod-probe (10/15) and the four undefined identifiers reproduced; `setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment`, `CanvasRenderer` occur nowhere else in the tree (grep of all 119 files: only `assets/index-Cg8FAMXN.js`). The "asset-integrity on DEPLOY_DIR: 8 broken references" figure is SL-01's occurrence count (duplicates included); `asset-integrity.mjs` on DEPLOY_DIR prints 6 unique references (index.html js+css, sw.js js+css, `bookmarkpanel-c5yt4b5k.js`, `helpmodal-cfv9t0zh.js`), and Appendix C.3 shows 3. State the number per tool. `undef-globals.mjs` needs `acorn` + `eslint-scope` (not installed here; verified by grep instead). |
| qa-ci-03 | CORRECTED | `index.html:62,69`, zero `data-testid`, `errors-in-console`=1 / `target-size`=1 all verified. (a) Runtime acceptance is unrealistic on the legacy driver: `openApp` waits up to 40 s for the chooser per fresh page (splash ~15 s, `bundle.pretty.js:101542`) and there is a "Skip intro" button at `bundle.pretty.js:101581` the driver never clicks; at 8 PR rows x 12 states the "<= 12 min" and "1.5 s per state" budgets hold only for the rebuild with `?intro=0`. (b) `playwright.config.ts` smoke list names non-existent row `w812-l` (falls back to `w375-l` through `??`). (c) `workers: 4` on the 2-vCPU private-repo runner with software WebGL. (d) Effort L is fair, but Phase 1 "days 3-8" holds roughly 9-25 developer-days of finding-level effort (03 L, 04 L, 05 M, 06 M, 08 M, parts of 09/10/14). |
| qa-ci-04 | CONFIRMED | `index.html:185` (z-index 999999, inside the overlay rule), `:562-585` collision mover, `bundle.pretty.js:103813` `playRow` (snippet omits `alignItems`/`padding`, harmless), `layout-audit.browser.js` = 217 lines, 7 geometry tests pass. Caveat: the overlay repositions itself asynchronously, so run the detector after a quiescence wait (two identical consecutive audits). C1/C2 measurements come from the audit, not re-run here. |
| qa-ci-05 | CORRECTED | Evidence real (`bundle.pretty.js:101086`, `:101229`; LH `errors-in-console` 1). Design flaw: `fixtures/base.ts` appends `EXPIRED allowlist entry ...` to `problems` in every test, so on the `until` date every test in every PR (including a hotfix) turns red at once; make it one dedicated `registry-expiry` gate and let an expired entry merely stop suppressing. Also a zero-warning gate on GPU-less runners (SwiftShader) may see driver messages; budget an allowlist for them (unverified, check on the first run). |
| qa-ci-06 | CONFIRMED | Reproduced exactly: 49 of 137 chronology labels differ by more than 10 min (range -230..+15), 37 of 42 successions, 3 of 24 vignettes. Only nit: V-017 drifts +145 min in the `validate.mjs` output (report says +144). Tick 450 label "7:50pm" vs formula 5:00am + 224 x 5 min = 11:40pm confirmed in `chronology_day2.json`. `bundle.pretty.js:97428`, `:100842`, `:101006`, `:97429` verified. Note the anchors file has non-uniform minutes/tick (`time-facts-anchors.csv`), so the formula-fallback golden is a placeholder, as the report says. |
| qa-ci-07 | CORRECTED | Reproduced: DV-01 (4,890 vs 100), DV-05 (36), DV-06 (78 differing / 117 extra rows), DV-08, DV-09, DV-10, DV-11, DV-12 (219), DV-13 (26); 188 of 675 ticks covered. WRONG counts: `loadAll()` collects only `regiment_id/battery_id/brigade_id/division_id/corps_id/army_id`, omitting `battalion_id` (11 ids `C-ART-I-1..4`, `C-ART-II-1..4`, `C-ART-III-1..3` in `oob/confederate_artillery.json`). Counting all `*_id` keys: DV-03 unresolved placement ids 100 -> 87; DV-04 28 -> 2 (only `U-ART-RES` at ticks 520/540; the 26 chronology refs drop to 2 and the 2 vignette refs to 0). The cited examples `C-ART-I-4`, `C-ART-I-2`, `C-ART-I-1` are false positives. DV-07 classifies cavalry by `/CAV/` in the id, so `U-8IL` (8th Illinois Cavalry per its placement notes; cap 400 m/min) is judged as infantry (150) and flagged at 275 m/min; its real problem is unit identity (t1 row is "Company A", strength 100; t3 the full regiment, 400). Classify by an `arm` field in `unit_aliases.json`. "12 of 15 checks fail" still holds. |
| qa-ci-08 | CONFIRMED | `index.html:255-277` (controllerchange `:264`, reload `:267`), `sw.js:5-13,17,30,45,65`, cache name `gbg-v5` (`sw.js:3`) verified. Caveat: the poisoning test routes `**/assets/*.js` with `context.route`; whether Playwright routes requests issued by the service worker itself in Chromium is version-dependent (verify on the first run; fallback: make the local server return 503 for the SW precache URL). |
| qa-ci-09 | CONFIRMED | `app-a11y.md:35` (23 of 55), `:167` (62 of 234), `:211` (133 of 268), `:40,269` (17 click-only) all match; `lh_mobile.json` failing weighted a11y audits are exactly `color-contrast` and `label`; app-code `aria`/`role` count 0 (only `tabIndex` at `bundle.pretty.js:112223`; the 33 `aria-` hits are vendored Mapbox at 838, 91452-96008). |
| qa-ci-10 | CORRECTED | Every LH number verified in the JSON (64/85; FCP 4,099; LCP 9,007; TBT 26.5; CLS 0.0726; SI 4,099; desktop LCP 2,229; resource summary 156 req / 1,577,215 B; `uses-text-compression` absent; `redirects` 9,067 ms). `@lhci/cli` latest = 0.15.1 bundling Lighthouse 12.6.1 confirmed on npm (published 2025-06-25) while `lighthouse` latest = 13.5.0. Corrections: (a) `preview.yml` runs 6 URLs x 2 profiles x 5 sequential Lighthouse runs (60 runs, ~30-60 min) inside a job with `timeout-minutes: 30` that also runs the browser, axe and visual suites; shard per URL or use 3 runs on PRs. (b) `budgets.json` requires `categories.seo = 1` and `is-crawlable = 1`, but the generated preview headers add `X-Robots-Tag: noindex, nofollow`; Lighthouse `is-crawlable` fails on that header (developer.chrome.com/docs/lighthouse/seo/is-crawlable), so every preview run is red on SEO. Skip SEO/`is-crawlable` on previews (assert the header instead) and run SEO on production nightly. (c) `requestLatencyMs/downloadThroughputKbps` in the `mobile-lowend` profile are devtools-method settings; harmless under simulate. |
| qa-ci-11 | CORRECTED | Budgets and LH data verified. The invariant "1 WebGL context (init script counts `getContext('webgl2')`)" will read 2 on a single-map build: `bundle.pretty.js:53944` (mapbox `supported()` probe: temp canvas, never lost) and `:94081` (`_setupPainter`, the real map) both call `getContext("webgl2")`; the mobile shell (T-22) adds a third. Count `canvas.mapboxgl-canvas` elements / `__gtbg.mapInstances()` instead and tolerate the probe. `request.sizes()` and `size-limit` `brotli: true` are valid. |
| qa-ci-12 | CORRECTED | Premise is wrong: no page and no bundle loads Google Fonts (no `fonts.googleapis`/`gstatic` reference outside the `netlify.toml` CSP, no `@font-face`, no `FontFace(`). `'Spectral'` appears only as a CSS-in-JS family with a `Georgia` fallback, so it never loads. The real font risk is system fonts (Georgia, system-ui) differing between container and dev machines; keep Linux-container baselines. Also `preview.yml` (T2) runs `tests/visual` on the host runner (no `container:`) although its comment says baselines come from "this same container image"; visual diffs will fail on fonts. Put T2 browser jobs in the same pinned image. Remove `fonts.*` from the candidate CSP and the ORG-01 list. |
| qa-ci-13 | CORRECTED | Live headers re-verified (`/embed.html`: XFO DENY + `frame-ancestors *` + report-only CSP; `/unit-rendering-reference.html` 200; `/diagnostics.html` 404; `/version.json` 404). The two-CSP-intersection reasoning is right. But the generated `_headers` (`gen-headers.mjs`, B.1) emits rules only for top-level `*.html` (non-recursive `readdirSync`) plus `/assets/*`, `/data/v2/*`, `/icons/*`, `/sw.js`, `/version.json` and the PDF, and its `invariants()` rejects any `/*` rule. Today `netlify.toml:5-19` puts HSTS, nosniff, Referrer-Policy and Permissions-Policy on every response; after the change `/manifest.json`, `/site-nav.js`, `/site-nav.css`, `/robots.txt`, `/sitemap.xml`, `/screenshots/*`, `/data/*` (legacy path; only `/data/v2/*` is generated), every 404 (scanner paths) and any `/classic/*`, `/next/*` subtree lose them (see M1). The candidate CSP has `style-src` without `'unsafe-inline'` while every page has inline `<style>` and style attributes (e.g. `index.html:753`); state the target (hash per block, or keep `style-src 'unsafe-inline'` and accept Observatory below A+). |
| qa-ci-14 | CORRECTED | All cited anchors verified (`:112951/:113068`, `:101542`, `:113033` Escape with the INPUT early return at `:112967`, `:99821`, `:97429`, `:103482`). One mislabel: `bundle.pretty.js:101117` builds the share link; the only parser of `?ancestor=` is `:101019` (`new URLSearchParams(window.location.search).get("ancestor")`). The nine link builders are correct (documentary, education, embed, historian, regiment, search x3, turning-points); `?tick=`, `?unit=`, `?vignette=` are read by nothing. |
| qa-ci-15 | CORRECTED | Sitemap 21 `<loc>` (`/` + 20), 12 pages without `twitter:card`, privacy/terms without `og:image` verified. PDF metadata `(anonymous)`, no `/Lang`, no `StructTreeRoot`/`MarkInfo` verified. The per-page character counts (1,577/503/2,034/270/1,695/916) do not reproduce: raw `get_text` gives 1,753/574/2,376/303/1,954/1,025, non-whitespace 1,454/485/1,983/260/1,644/869 (pymupdf; pdftotext agrees); the conclusion (pages 2 and 4 under-filled) holds. `seo-probe` expects an OG image "decodes at 1200x630" but the current file is 1280x720; say which size is the target. "Undecodable" is decoder-specific: PIL refuses the PNG, but Windows GDI+ loads it as 1280x720 and renders garbled stripes (verified); either way it is a corrupt OG/PWA image. |
| qa-ci-16 | CORRECTED | RUM PDF (LCP/INP/CLS/FCP Poor, FID Good), Analytics 3,389 views / 1,529 visitors / 328 MB, ~18% from DE/CN/SG/HK verified. Corrections: (a) web-vitals latest on npm is 6.2.2 (report says v5); the attribution field names the beacon uses (`target,url,timeToFirstByte,resourceLoadDelay,resourceLoadDuration,elementRenderDelay`, `interactionTarget,interactionType,inputDelay,processingDuration,presentationDelay,loadState`, `largestShiftTarget,loadState`) are unchanged in 6.2.2, and v6 adds `longestScript`/LoAF INP attribution worth capturing. (b) The collector sketch is forgeable and unbounded, see M4. (c) Netlify injects its own RUM `<script id="netlify-rum-container" src="/.netlify/scripts/rum" data-netlify-deploy-context="production">` into live HTML (live vs deploy `diff`), so "skip RUM snippets on non-production" applies to the first-party beacon only. |
| qa-ci-17 | CORRECTED | `prod-probe` numbers reproduced. "repository_dispatch from a Netlify outgoing webhook" cannot work as written: Netlify's HTTP POST notification has no custom-header field (only an optional JWS signature in `X-Webhook-Signature`), while GitHub's `POST /repos/{o}/{r}/dispatches` requires an `Authorization` token header. Add a small Netlify function that verifies the JWS and calls GitHub with a fine-grained token kept as an env var, or trigger T4 by polling `/version.json` after promotion. "Curl-class probes cost no page views" is unverified: the Web Analytics PDF lists server-side "Resource not found" and bandwidth, i.e. it counts at the edge, so 15+ probes x 4/day may count (the report itself marks header/UA exclusion unverified). |
| qa-ci-18 | CORRECTED | Registry logic and 4 tests verified; the 12 criteria exist as tabled. Contradiction: criterion 5 ("every category A+ on the scorecard") cannot hold before cut-over because 9.2 makes "RUM 28-day p75 green, n >= 200 per layout" a must gate for Performance and a missing gate counts as failed; criterion 11 needs only >= 100 sessions on `/next/`, yet 7.4 requires >= 100 samples per (metric, layout, page group), so the beta cohort will read `insufficient` at ~113 views/day. Define a pre-cut-over scorecard profile without field-RUM gates (lab only) and a post-cut-over profile with them. |
| qa-ci-19 | CORRECTED | Live facts verified (`/dashboard` `public,max-age=0,must-revalidate` vs `/dashboard.html` `no-cache,must-revalidate`; `/index.html` 200; no `/version.json`); Netlify credit table verified (production deploy 15 credits; Deploy Previews, Branch Deploys and failed deploys non-metered; password protection Pro-only; Free 300 credits; web requests 2 credits per 10,000). Corrections: (a) Netlify does not emit GitHub `deployment_status` for Deploy Previews (Netlify staff, answers.netlify.com thread 93131: "doesn't work with the deployment event, it only adds comments"), so the primary trigger in B.6 `preview.yml` (`on: deployment_status`) will not fire; make the documented fallback primary (poll the `netlify/friendly-lolly-da85c0/deploy-preview` commit status, or `netlify deploy --alias` from CI). (b) Outgoing webhook -> `repository_dispatch` needs a relay (see qa-ci-17). (c) The rollback endpoint exists: `POST /sites/{site_id}/deploys/{deploy_id}/restore` (`restoreSiteDeploy`, open-api.netlify.com swagger); after a restore Netlify locks auto-publish, so `rollback.yml` must also call `POST /deploys/{id}/unlock` after the revert. (d) The generated-`_headers` gap (M1). (e) Live HTML is post-processed by Netlify (Pretty URLs rewrites `href="/x.html"` to `href='/x'`, verified by diffing live vs deployed `index.html`), so static gates on `dist` do not test what users get; adopt infra-netlify-11 (`[build.processing.html] pretty_urls = false`) and add a dist-vs-live href diff to `prod-probe`. The production branch today is `main` (`data-netlify-deploy-branch="main"` in the injected RUM tag). |
| qa-ci-20 | CONFIRMED | `privacy.html:21` "Last updated: September 7, 2026" is manual; 445+ vs 467 verified; release-please exists on npm (17.11.2). |
| qa-ci-21 | CONFIRMED | Audit line 5 lists real phone and Safari/Firefox as not tested; WebKit-is-not-iOS-Safari and Firefox-no-`isMobile` are correct. |
| qa-ci-22 | CONFIRMED | `historian.html:154-167` `score()` with `t.includes(w)`, `:172` `div.innerHTML = html + ...`, top-3 `slice(0,3)` with only an `s > 0` filter, corpus counts at `historian.html:48`; the "war"/"toward" mechanism is correct (the space-prefixed test misses, the bare `includes` hits at 1.5). |
| qa-ci-23 | CONFIRMED | Reproduced: `gates.json` has 109 gates (52 LH, 26 SL, 15 DV, 15 HP, 1 UNDEF); `scorecard.mjs` logic and 4 tests pass; baseline letters match; the 6-gate thin-category guard and not-run-is-failed rule are real. |
| qa-ci-24 | CONFIRMED | Policy is sound; see qa-ci-05 / M7 for the expiry side effect. |
| qa-ci-25 | CORRECTED | Mapbox `pk.` token literal is in 9 HTML pages (camera, cinematic-export, compare, ground-remembers, immersive, sandbox, unit-rendering-reference, viewshed, watch-together) and twice in the bundle; NOT in `index.html`. Live check: the site token returns HTTP 200 for a foreign `Referer` (X1 confirmed unrestricted). `deploy-history.md:22,252`: Mapbox token #1 is already revoked and token #2 is valid, so "rotate keys in archived envs" should first list which are still live. The Google embed key is in the bundle. |
| qa-ci-26 | CONFIRMED | No `docs/` in the publish tree. |
| qa-ci-27 | CONFIRMED | Guide text present in `user-guide.pdf`: "Esc ... Close any panel" (p.1 table), "Google Street View panoramas from 8 key battlefield positions", "Panel won't close: Press Escape". |
| qa-ci-28 | CONFIRMED | Three `+2` sites and one-occurrence-each replacement strings match `deploy-history.md` DH-04; UG-01 identifiers verified. |
| qa-ci-29 | CONFIRMED | `attributionControl: !1` at `bundle.pretty.js:102988` and `:110777`; `watch-together.html:19` loads `peerjs@1.5.4` from jsDelivr; `privacy.html` names none of PeerJS/jsDelivr/NPS; `CanvasRenderer` undefined at `:96556`. |
| qa-ci-30 | CONFIRMED | Zero `data-testid`; the HUD text is `["Tick ", c, "/675"]` at `bundle.pretty.js:112357` (the report cites ~112202, the start of `IO()`), so the regex driver works. |

### MISSED issues (in qa-ci scope)

| # | Severity | Issue | Evidence | Fix |
|---|---|---|---|---|
| M1 | high | Generated `_headers` removes the site-wide baseline (HSTS, nosniff, Referrer-Policy, Permissions-Policy, XPCDP) from every non-HTML asset, every 404 and any non-top-level file | B.1 `gen-headers.mjs` (`buildHeaders`, non-recursive `readdirSync`; `invariants()` bans any `/*`); today `netlify.toml:5-19` `/*` rule; legacy `/data/*` cache rule `netlify.toml:27-30` not regenerated | keep a `/*` rule for non-framing headers only; limit the invariant to XFO/CSP; recurse; add HP probes for `/manifest.json`, `/site-nav.js` and a 404 |
| M2 | high | Lighthouse SEO / `is-crawlable` gates on Deploy Previews are permanently red because previews send `X-Robots-Tag: noindex` | `budgets.json` `seo:1`, `is-crawlable:1`; `gen-headers.mjs` noindex; Chrome docs (is-crawlable checks the header) | assert the header on previews instead; run the SEO category on production nightly |
| M3 | high | The nightly full matrix (18 jobs, 24 rows x ~45 states x 3 engines) targets PRODUCTION | `nightly.yml`: `env: { TIER: full, BASE_URL: 'https://gettysburginteractivemap.com' }`; Analytics PDF shows edge-side counting at ~113 views/day; contradicts 7.6 traffic hygiene | run the matrix against the `main` branch deploy (staging); production gets curl probes plus 2 smoke loads |
| M4 | medium-high | RUM collector accepts forged and unbounded data | `rum.mjs`: `{ ...base, kind: 'error', ...b.error }` and `...b.csp` spread client keys last (a client can set `kind:'metric'`, `metric`, `value`, `bot`, `layout`); no origin check; no rate limit; size checked after `req.text()`; an attacker can page you or mask a regression and burn Blobs/credits | whitelist fields per kind, cap `metrics.length`, require same-origin `Sec-Fetch-Site`/`Origin`, function `config.rateLimit` (verify), drop the spread |
| M5 | medium-high | CI cost and feature gating are not quantified: at the report's own numbers T3 = 6 shards x 3 engines x ~30 min = 540 min/night (~16,200/month) plus T1/T2, vs 2,000 (Free) / 3,000 (Pro, Team) included minutes for private repos | report 4.10; GitHub billing docs fetched; nightly.yml `timeout-minutes: 90` x 18 jobs | Chromium-only nightly (WebKit/Firefox Mon and Thu) from day one; consider a public repo after the gitleaks scan (public runners are free); state the GitHub plan needed for branch protection and environments |
| M6 | medium | Schedule and gate contradictions: "roughly 26 developer-days" equals the sum of the minimum of every finding effort (8 L x 2 + 16 M x 0.5 + 6 S x 0.25 ~ 25.5 d; maximum ~ 75 d; midpoint ~ 50 d); Phase 1 (days 3-8) cannot fit; promotion gate 1 (nightly green at S' >= S within 24 h, 4.4) contradicts the same-day hotfix path (4.7) | report sections 11, 4.4, 4.7 and the section 12 efforts | restate as a 40-60 d range with a critical path; add a hotfix mode to `release.yml` (T1+T2 green, nightly waived, T4 mandatory) |
| M7 | medium | Expiry semantics can turn the whole CI red on one date | `base.ts` pushes every expired allowlist entry into every test's `problems`; same idea for `known-failures.json` `until` | single `registry-expiry` job; expired entries only stop suppressing |
| M8 | low-medium | Sketch defects that produce false results | `nightly.yml` `keys-and-security` extracts `pk.` from `/` (index.html has none; the token lives in the JS bundle and 9 sub-pages) so `$CODE` is 401, not 403; `STUB_STYLE` has no `glyphs`/`sprite` although symbol layers need them; `preview.yml` visual job not in the pinned container; smoke id `w812-l`; web-vitals pinned as v5 (latest 6.2.2); Playwright pinned at 1.50.0 (tag exists; latest 1.63.0) | fix each; have the probe extract the token from the bundle or a sub-page |

Scratch copies of the sketches were made under the session scratchpad only; nothing outside this appended section of `qa-ci.md` was modified.
