# 12 - Quality System and Release Engineering: keeping A+ at A+ (WP-QA-01 .. WP-QA-25)

Status: PLAN, 2026-09-30; nothing built or deployed. Obeys `01-decision-register.md` (`D-*` ADRs, `WP-DEC-nn` packets). Lines are `bundle.pretty.js` unless a file is named. Tags: **[V]** re-checked by me; **[S id]** specialist/verifier statement (qa-ci verification block, app-latent, app-mobile, perf-cwv); **[E]** estimate; **[U]** unverified. Effort: S<0.5 d, M 0.5-2, L 2-5, XL>5; the day range is authoritative. Sources: `plan-work/qa-ci.md` (`qa-ci sec.n`), `merged/qa-ci.json`, `critics.json`, `merged/app-latent.json`, `hist-eval.md`, tested prototypes in `plan-work/tmp-qa-ci/sketches/`. Aligned with the chapters already written: 03 (rebuild and parity, WP-ARCH), 04 (time), 05 (performance, WP-PERF), 07 (accessibility, WP-A11Y), 10 (SEO), 11 (copy/claims, WP-CONTENT), 14 (Historian, WP-HIST); where they own a build item this chapter owns only the gate, harness or pipeline around it.

**Purpose.** Make every other chapter's fix stay fixed: red-first tests for the 57 audit ids and every critical/high finding, expiring registries (a ratchet), geometry and input-reachability detectors, a stale-code-trap gate for R0, budgets that only tighten, RUM alerting sized for ~113 views/day, a parity harness, promotion/rollback for a solo owner, and a machine-computed scorecard whose exit code defines "A+ stays A+". The one-week net (8.1) must exist before R0 (latest 2026-10-21).

---

## 1. A+ exit criteria for this domain

Each row is a scorecard gate (WP-QA-23). Mobile = touch matrix rows + real-device log; desktop = fine-pointer rows; differences in brackets.

| # | Criterion | Gate |
|---|---|---|
| X1 | 57/57 audit ids and 100% of the 400 non-refuted critical/high findings (68 critical, 332 high [V]) have >= 1 automated gate or a dated waiver; 0 orphan tags | `traceability` |
| X2 | 13/13 categories A+ on Tier-1 surfaces (each >= 6 gates), Tier 2 >= A; two consecutive weekly runs | `scorecard` |
| X3 | 0 OFFSCREEN/OCCLUDED/OVERLAP/CLIPPED_TEXT/H_OVERFLOW; font >= 12 px; targets >= 24 [mobile >= 44, safe-area]; all states x 24 rows | `LAY`, `TAP` |
| X4 | Function specs green; click-every-control and console 0 errors/warnings (clean profile and uBlock lists); drag/wheel/pinch move the camera; fault matrix 6/6; deep-link contract [touch gestures, rotation] | `E2E`, `INP`, `FLT`, `CON` |
| X5 | Lab: Lighthouse perf >= 95 (median of 5), a11y/BP 100 and SEO 100 on indexable URLs (noindex URLs assert the header/meta instead) on published Tier-1 URLs; LCP <= 2.5 s, FCP <= 1.8 s, TBT <= 200 ms, CLS <= 0.1, lab INP <= 200 ms at CPU x4 [`/map` may carry a recorded expiring ceiling, D-ENTRY] | `LH`, `BUD` |
| X6 | Field per device class: Netlify RUM 30-day p75 green (LCP 2.5 s, INP 200 ms, CLS 0.1, FCP 1.8 s, TTFB 800 ms) and first-party per-template 7-day p75 green, n >= 100 (D-EVIDENCE); error sessions <= 0.1% | `RUM` |
| X7 | axe 0 over states x {default, reduced-motion, forced-colors}; keyboard journeys (chapter 07's 22 tasks) 100%; AT log <= 90 days [+ VoiceOver, TalkBack] | `A11Y`, `MAN-AT` |
| X8 | HP-01..15 green, enforcing hash CSP with reporting, Observatory >= A+, contacted origins == disclosed, storage keys == inventory | `HP`, `ORG`, `STO` |
| X9 | Every production byte maps to a SHA (`/version.json`); R0 acceptance re-run on SW/entry changes; L1 rollback < 60 s; kill-switch and restore drills <= 90 days | `SWL`, `MAN-DRILL` |
| X10 | Last-2-majors: Chromium nightly, Firefox/WebKit twice weekly plus the per-PR 4-row smoke (D-CI-HOST Actions-minutes fallback; WP-QA-21, T3); Text-route fallback; GPU-loss recovery < 3 s x 20; 60-minute soak (heap +<= 30 MB, DOM/listeners +-5%) [real iPhone SE, Samsung-class, iPad, Chromebook, in-app browsers] | `FLT-GPU`, `SOK`, `MAN-DEV` |
| X11 | Registries empty except third-party-licence UI (reason + expiry); T1 <= 8 min, T2 <= 35 min; flake < 1% over 30 runs | `REG`, `CI-HEALTH` |
| X12 | Ops <= 10 h/month excluding content (D-CONTINUITY); one alert channel; runbooks dry-run; D-EVIDENCE dossier (a)-(e), each scorecard row citing a non-author artefact | `OPS`, `EXT` |

Replica scores of 94-100 exclude Mapbox tile/GL cost (tiles 403 off-production [S perf-cwv MISSED-06]): budgets lock only from runs with the production Referer injected (WP-DEC-01); a measured `/map` mobile ceiling below 95 is an expiring exception, never hidden from the trace.

---

## 2. Verified current state (facts only)

| Fact | Evidence |
|---|---|
| No tests, CI, `package.json` or source in the deployed tree; `[build]` has only `publish = "."`; a 63-check validator and CI existed until Jun 13, were lost, and were structural only (`continue-on-error`, cp1252 crash) | `netlify.toml:1-2` [V]; [S qa-ci-01] |
| Lighthouse 13.5.0 mobile perf 64 (FCP 4,099, LCP 9,007 ms, TBT 27, CLS 0.073), desktop 85; `errors-in-console` = 1 and `target-size` = 1 on the build that throws `setGoldUnit is not defined` (101086, 101229) and hides five mobile controls; `html, body { overflow: hidden }` also hides C1 from overflow checks | `lh_*.json` [V ids: `render-blocking-insight`, `network-dependency-tree-insight`, `is-crawlable`; no INP audit]; `index.html:62,69` [V] |
| `sw.js`: `gbg-v5`, hard-coded hashes, `skipWaiting()`, no `res.ok` guard; `index.html:255-270` reloads on `controllerchange`; `index-Cg8FAMXN.js` (md5 7ef75b95f4c0 [V]) carried 45 byte streams across 86 zips | [V]; register D-ORDER |
| Data validators: 12 of 15 fail. Recount [V]: DV-01 record_count 4,890 vs 100; DV-03 **87** unresolved ids (not 100: prototype ignored `battalion_id`); DV-04 **2** (`U-ART-RES`, not 28); 1,804 rows on 188 of 675 ticks; DV-05 36, DV-06 78, DV-08 49/137, DV-09 37/42, DV-11 "445+" [V], DV-12 219 | [S verifier] |
| Netlify: 15 credits per production deploy, previews non-metered, Free 300 credits, plan UNVERIFIED; no GitHub `deployment_status` for previews. GitHub Free private repos: no branch protection/environment reviewers, 2,000 Actions minutes (Pro/Team 3,000) | [S infra-netlify-30, verifier M5] |

Lighthouse loads and stops; these suites test interactions and geometry, semantic data, contracts and long-running behaviour. Defects found after qa-ci (canvas z 10 swallowing input, overlays in compact, dead tiles, day-data, sprite collisions, GPU loss, in-app browsers, AZERTY and more) are Appendix A rows NF-01..34.

**Executed vs never run in a browser**

| Artefact (`tmp-qa-ci/sketches/`) | Status |
|---|---|
| static gates, `validate.mjs` + ratchet test, `time-model.mjs`, `assert-lh.mjs`, `scorecard.mjs`, `gen-headers.mjs`, `evaluate.mjs`, `intended-diffs.mjs`, geometry helpers of `layout-audit.browser.js` | **Executed**; 40/40 `node:test` pass (re-run by the verifier) |
| 11 TypeScript files: `playwright.config.ts`, `fixtures/base.ts`, `support/{driver,states}.ts`, specs `tappability`, `layout-audit`, `one-clock`, `service-worker`, `console-gate`, `a11y/state-matrix`, `parity/parity`; the DOM half of `layout-audit.browser.js` | **Type-stripped + `node --check` only; never run in a browser.** Legacy selectors (chooser text, `#ef-btn`, keyboard step, "Tools") are inferred: `(verify)` |
| `run-lighthouse.mjs`, `web-vitals-beacon.js`, `rum.mjs`, 4 workflows | syntax-checked; API shapes `(verify)`. Spec-only, unwritten: `seo-probe`, `flake-report`, `release/rollback/cutover.yml`, DV-16..30, SL-27..30, detector fixtures |
| Raw-CDP probes in headless Chrome 153 (not Playwright, not devices): C1/C2 geometry, input swallow, NaN tap, day data, SW caching a 404, 10-viewport matrix (`tmp-app-latent/`, `tmp-verify-app-latent/`, `tmp-app-mobile/`) | seed selectors, confirm "red today" |

**First-run protocol:** serve `legacy/dist` locally, SW blocked, run each spec 20 times, fix selectors only in `tests/support/driver.ts`.

---

## 3. Decision alignment and conflicts

ADR effects: **D-SOURCE/D-ORDER** WP-QA-07 is R0's acceptance and the Tranche-0 patch gate; **D-CI-HOST** Actions gates + Netlify Git builds, `production` fast-forwarded by `release.yml`; **D-SW** qa-ci's SW contract is amended (no precache, no navigation interception, offline-shell test deferred; adds `/hx/`, `/api/`, `/.netlify/` bypass, `gbg-*`-only purge, kill switch); **D-CSP/D-TELEMETRY** one `/api/ingest` replaces qa-ci's `/api/rum` + `/api/csp`; **D-URL/D-ROOT** probes iterate `tools/routes.json` (both spellings), `APP_PATH` `/` until S3 then `/map`; **D-EVIDENCE/D-SCOPE-TIERS/D-TIME** tier-aware scorecard, `lab` profile before cut-over, no clock string asserted before DG-3.

**Decision conflicts (raised, not silently deviated from).**
1. **QA effort.** The register's Tier-1 envelope carries "QA 10-14 d". The WP sum is **50-77 d [E]** (qa-ci's "26 d" summed the minima; its verifier restated 40-60; this chapter adds input reachability, fault matrix, soak, device programme, traceability, dossier, ops). A-line subset (WP-01..10, 13, 16-18, basic half of 23): 31-47 d; the one-week net (7 d, quoted 6-9) cannot slip. The master schedule must re-total.
2. **Aggregates-only telemetry.** Blobs has no atomic increment [S qa-ci 7.3, verify]. Chapter 05 (WP-PERF-03) specifies daily fixed-bucket histograms with a conditional write and retry (`onlyIfMatch`, verify); if that is unavailable, fall back to transient per-beacon objects (bucketed, no IP/id/UA, <= 7-day TTL) compacted nightly.
3. **Where lab and matrix runs execute.** Chapters 05 (WP-PERF-02) and 07 (WP-A11Y-29) run nightly suites on production. Each fresh load there is a page view at ~113/day and the Netlify RUM host pollutes field data, so this chapter runs the nightly Lighthouse/axe/matrix on **staging** (`main` branch deploy) with the production Referer injected for Mapbox; production gets curl probes, a 4x-daily smoke and a weekly Lighthouse/SEO run. The master merge decides: chapter 15 section 13 item 4 adopts this chapter's rule, so chapters 05 and 07 must be read with their nightly production runs moved to staging (open item for their reviewers).
4. **GitHub plan.** Protected `production` and an approval-gated environment need Pro/Team for private repos [S verifier]; WP-QA-01 gives plan-independent enforcement; owner chooses (section 10).

---

## 4. Work-package table

Phases: **P0** one-week net (target 2026-10-14) . **P1** R0/R1 (R0 <= 2026-10-21, R1 2026-11-05) . **P2** S-trains (Nov 2026 - Jan 2027) . **P3** rebuild and cut-over (to 2027-05-15) . **P4** evidence, steady state. MVSN = days inside the one-week net (counted once); the net (8.1) is the MVSN slice of WP-01..07, 09 and 23.

| WP | Title | Ph | Covers | Audit / NF ids | Days | MVSN | Deps |
|---|---|---|---|---|---|---|---|
| 01 | Repo, CI skeleton, expiring registries, governance | P0 | qa-ci-01,-24,-25,-26 | N1,X1,X2 | M 1.5-2.5 | 1.0 | D-CI-HOST |
| 02 | Static gates SL/UG/AI/DOC + route manifest | P0 | qa-ci-02,-15,-29; pagesA-01; deploy-history-13 | C5,C6,E1,E3,E5,X3-X5,T3,P4,P5,G1; NF-05/06/11/12/27 | L 2-3 | 1.0 | 01 |
| 03 | Header/redirect/CSP contract, `_headers` generator, probe cron | P0 | qa-ci-13,-17,-19; infra-netlify-02/10/11/12 | X3,X4,T3,E5,N1; NF-29 | M 1.5-2.5 | 0.5 | 01, D-URL |
| 04 | Playwright foundation, matrix, legacy driver, hooks contract | P0 | qa-ci-03,-24,-30; app-a11y-26; mobile-25 | C1,C2,H3,D2,A3 | L 3-5 | 1.5 | 01 |
| 05 | Geometry, tappability, input-reachability detectors | P0 | qa-ci-04; mobile-01..04; app-latent-04/06 | C1,C2,H1,S4,A3,A4,D2; NF-01..04 | L 3-4 | 1.0 | 04 |
| 06 | Lab performance gate: LH 13, budgets, ratchet | P0 | qa-ci-10; perf-cwv-01/02/18 | P1,P2,P4-P7,C6 | M 1.5-2.5 | 0.5 | 04, WP-PERF-01/02 |
| 07 | Stale-code trap, R0 acceptance, patch-runner gate | P0/1 | qa-ci-08,-28; deploy-history-01/02/03; bundle-anatomy-01/02/03/05/27; infra-netlify-21/22 | C6,P1,P5,N1,C1,C3,C5; NF-27 | L 3-4 | 0.5 | 02, 04 |
| 08 | Console gate, fault matrix, idle, hidden tab, GPU loss | P1 | qa-ci-05; app-latent-02/10/11/18/43 | C5,C7,H7,P5,X3; NF-07/21/22/30 | M 2-3 | - | 04 |
| 09 | One clock, one date, time validators | P0/2 | qa-ci-06; app-time-*; time-facts-* | C3,C4,H9; NF-15 | M 1-2 | 0.5 | 04, D-TIME |
| 10 | Function and interaction specs | P2 | qa-ci-14,-15; app-bugs-05/06/09-14; app-latent-05/06/12 | H1-H5,H9,H11-H13,D1,D3,D4,S1-S4,C7; NF-08/09/20/23/24/33 | L 4-6 | - | 04, 05 |
| 11 | Data validators DV-00..30 | P1/2 | qa-ci-07; data-integrity-*; app-latent-14 | C4,H5,H7,H10,D3,N1; NF-10/25 | L 3-4 | - | 01, 09 |
| 12 | Accessibility automation | P2 | qa-ci-09; app-a11y-13/32/33 | A1-A6,D2,H2,H6,C8,S4 | L 3-4 | - | 04, 05, WP-A11Y-29 |
| 13 | Bundle/request/network budgets | P2 | qa-ci-11; bundle-anatomy-08/12/19 | P2,P3,P4,P6; T-22 | M 1-2 | - | 06 |
| 14 | Visual baselines | P2 | qa-ci-12 | H6,D2,S4 | M 1-2 | - | 04 |
| 15 | Security/privacy contract tests, CSP roll-out | P2 | qa-ci-13,-25,-29; infra-netlify-01/10/36-38 | X1-X5; NF-14/17/28 | L 2-3 | - | 03, 08 |
| 16 | Pipeline: promotion, rollback, versioning | P1 | qa-ci-19,-20; infra-netlify-28/29/30 | N1,X4,T3,E5,G1,H10 | L 3-4 | - | 01, 03, WP-ARCH-30..32 |
| 17 | RUM evaluator and alerting | P2 | qa-ci-16; perf-cwv-17/18; infra-netlify-31/32; app-latent-36 | P1,C5,T2,X3,X5 | M 1.5-2.5 | - | 16, WP-PERF-03/04, WP-INFRA-15 |
| 18 | Synthetic monitors, smoke, routing | P2 | qa-ci-17; infra-netlify-33/34/39 | T2,N1,C6; NF-16 | M 1.5-2 | - | 03, 16 |
| 19 | Parity: QA layer and cut-over computation | P3 | qa-ci-18; prov-recon-03/39 | N1,C1-C4,H2-H5,H9-H12,D3 | M 2-3 | - | WP-ARCH-05..08/32, 10, 11 |
| 20 | Historian evaluation gates in CI | P3 | qa-ci-22; hist-eval; hf-*; hist-current-* | H8; NF-13/26 | M 1.5-2.5 | - | WP-HIST-07, D-HIST-ARCH |
| 21 | Cross-browser, device, in-app, hostile-env, school programme | P3 | qa-ci-21; critics | C1,C2,H3,P1,S3; NF-30/31/33/34 | M 2-3 + owner | - | 04 |
| 22 | Soak and long-session job | P3 | critics; app-latent-18/21/28 | P1; NF-07/32 | S-M 1-1.5 | - | 04, 08 |
| 23 | Scorecard, traceability generator, weekly report | P0/4 | qa-ci-23 + new | all | L 2.5-4 | 0.5 | 01, 02 |
| 24 | Manual programmes, claims, verification dossier | P4 | qa-ci-27; critics; app-a11y-33/34; ux-flows-22 | H8,H10,H13,G1,A1-A6 | M 2-3 + ext | - | 21, 23 |
| 25 | Ops ceiling, drills, continuity, test health | P1/4 | qa-ci-24,-26; critics | N1; NF-18/19 | S-M 1-1.5 | - | 16, 18 |

Totals [E]: **50-77 person-days** (ranges summed; MVSN slice 7.0 d). `NF-nn` = new-defect rows of Appendix A.

---

## 5. Work-package specifications

Every WP: the test is written first against today's site and must fail (red proof in the PR), is registered in `tests/known-failures.json` `{id, audit, reason, until}`, and the fix PR deletes the entry. Titles carry `@cat:<category> @audit:<ids> @finding:<ids> @wp:<WP>`; node gates print `PASS|FAIL <GATE> [<ids>]` and write `reports/gates/<name>.json`. Node 24 (D-HIST-ARCH), Linux, pinned Playwright container for every browser job. `qa-ci sec.n` = section holding the full list.

### WP-QA-01 Repo, CI skeleton, expiring registries, governance (M 1.5-2.5 d)
**Fix.** (1) Private GitHub repo + second remote on day one; S0 tree committed as `legacy/dist` (correct-case names); archives stay outside git. Repo creation and the byte-identity proof are WP-ARCH-02; this WP adds the quality layer. (2) pnpm, `.nvmrc` 24, lefthook T0. (3) Registries `known-failures`, `overlap-allowlist`, `console-allowlist`, `intended-diffs`, `perf/exceptions.json`, schema `{id, audit, reason, until}`. Rules (proven in `tests/data/validate.test.mjs`: seeded 15/15 pass, empty 12 fail, stale 1 fail): unlisted failure red; listed-but-passing red; an expired entry only stops suppressing. **Expiry is reported by one `registry-expiry` job**, not inside every test (qa-ci's fixture turned the whole suite red on the `until` date [S M7]); `tools/registry-count.mjs` fails a PR that grows a registry without label `registry-add` + audit id. (4) **Plan-independent enforcement:** only `release.yml` holds the deploy key that can push `production`; the owner's local `production` push URL is `no_push`; T5 flags any production deploy without a release record; with GitHub Pro add required checks and an approval-gated environment. (5) PR template = DoD (6.5), CODEOWNERS, Conventional Commits. (6) Three Mapbox tokens (production URL-restricted; preview `netlify.app`, minimum scopes, rotate monthly; local `localhost`); CI uses the last two; gitleaks on push and once over full history. **Accept.** Fresh clone `pnpm install && pnpm ci:static` green with seeded registries.

### WP-QA-02 Static gate suite (L 2-3 d)
Move the executed prototypes in (`qa-ci sec.5.9-5.10`): SL-01..26, `undef-globals` (acorn + eslint-scope), `asset-integrity` AI-01..03 (exact case; same name => same sha256 vs the last production `asset-manifest.json`; every `assets/*.js` has a `.map` or a recorded exception), DOC-01..07. **`tools/routes.json`** (from the site manifest, D-SITEGEN) lists each page with both spellings (D-URL); no gate hard-codes `.html`. **New:** SL-31 duplicate ids and page-id vs `<symbol id>` collisions (pagesA-01); SL-32 no personal mailbox in shipped HTML (`privacy.html:47`, `terms.html:42`, `site-nav.js:194`); SL-33 `translate="no"` on the `/map` stage + `color-scheme`; SL-34 rasters in `docs/media-rights.csv` and OG/manifest images decode, distinct, OG 1200x630 <= 150 KB; SL-35 `robots.txt` per D-LICENSE; SL-36 `manifest.id == "/"`, no `orientation`. **Accept.** SRC_DIR yields exactly the recorded failures; DEPLOY_DIR fails SL-01 (hygiene, not an outage: Netlify is case-insensitive, caches key on exact case [S infra-netlify]); a byte change under an existing name fails AI-02.

### WP-QA-03 Header, redirect, cache and CSP contract (M 1.5-2.5 d)
Netlify merges header rules, so blanking `X-Frame-Options` on `/embed.html` cannot work and two enforced CSPs intersect: one rule per path group, no site-wide framing rule [S qa-ci 4.1]. The shipped generator is the register's `scripts/gen-netlify-config.mjs` (WP-INFRA-10/11/12, chapter 09; D-URL); qa-ci's `tools/gen-headers.mjs` is the tested prototype whose fixes and 4 executed cases move into it, so QA owns the contract tests, not a second generator. Fixes: (a) keep a `/*` rule for **non-framing** headers (HSTS, nosniff, Referrer-Policy, Permissions-Policy) so manifests, scripts, 404s, `/classic/*`, `/next/*`, `/hx/*` keep them; the invariant bans only XFO/CSP on `/*` [M1]; (b) CSP = D-CSP hash candidate (sha256 of each inline block from built HTML; state the `style-src` target, `'unsafe-inline'` until inline styles go, Observatory cap recorded), `report-uri` to `/api/ingest`; (c) non-production adds `X-Robots-Tag: noindex, nofollow`; (d) `_redirects` for both spellings, forced 301, loop-tested (`curl -sIL --max-redirs 3`; WP-DEC-05). HP-01..15 iterate `routes.json`; add `/manifest.json`, `/site-nav.js`, a 404, `/version.json`, `/flags.json` (no-cache), `/hx/*` (immutable), `security.txt`; HP-13 covers `/src/*`, `/docs/*`, `*.md`, `/package.json`, `/diagnostics(.html)`, `/unit-rendering-reference(.html)`. **Accept.** All HP green on a Deploy Preview; generator tests keep the 4 executed cases + "`/manifest.json` has HSTS".

### WP-QA-04 Playwright foundation and hooks contract (L 3-5 d; 1.5 d in MVSN)
Owns projects, fixtures, driver and hooks; WP-UX-34 supplies the UX states and governance, WP-A11Y-29 the a11y matrix, WP-ARCH-05 the parity adapters (one shared `openApp`).
(1) `viewports.json` (6.2) -> one project per row; nightly `boundary` rows from the shell's breakpoint tokens +-1 px (H3); expected `shell` column (`compact` for phones and 768-834 px tablets, `full` for desktop; D-SHELL) checked by an `emulation-sanity` spec that also asserts `matchMedia('(pointer: coarse)') === touch` (verify). (2) Base URL `http://localhost:4173` (Mapbox URL restrictions match `localhost` (verify)). (3) `fixtures/base.ts`: console gate (sketch 5); Mapbox stub with **local style, sprite and glyph PBFs** (qa-ci's had none, so symbol layers could not render [M8]); RUM host blocked; `page.clock`; seeded random; after each test `document.cookie === ''` and storage keys within `docs/privacy-storage.json`. (4) Driver `DRIVER=legacy|next`, `APP_PATH` (`/`, `/map` after S3); legacy sets `gtbg_onboarded` and **clicks "Skip intro" (101581)**: qa-ci's driver waited 40 s per page for the chooser, so its 12-minute budget was unreachable [S verifier]; after T0 removes splash and chooser (D-ENTRY) it uses URL hooks. (5) `workers: 2`, software WebGL (`--use-angle=swiftshader`) (verify). (6) **Hooks contract for the rebuild** (D-URLSTATE names): `?intro=0 layout= tick= panel= test=1 motion=reduce contrast=high`; `window.__gtbg` only under `test=1` (`state seek play unitsAt visibleUnitIds labelCollisions mapInstances camera selection swState`); real roles/names; `data-testid` only for role-less items; `data-shell="compact|full"`; `data-overlap-ignore`, `data-historical-quote`; `<html data-build data-layout>`; `/version.json`. **Accept.** Legacy reaches all 12 states 20/20; PR tier <= 12 min at introduction; any `console.error` fails a test.

### WP-QA-05 Geometry, tappability and input-reachability detectors (L 3-4 d; 1 d in MVSN)
The shell clips instead of scrolling, so only per-element geometry sees C1/C2/H1; the z-10 canvas swallowed every gesture (0 events reached Mapbox [S mobile-02]) and no qa-ci test would notice. Adopt `layout-audit.browser.js` (rules `qa-ci sec.5.2`; sketches 1-2) with: (a) **geometry before click**: `click({trial:true})` scrolls overflow-hidden containers, so a control clipped right/bottom still passes; (b) audit after quiescence (H1 overlay moves asynchronously [S verifier]); (c) `coarse` from project metadata; (d) self-test fixtures `tests/fixtures/pages/*.html`; (e) **`INP-01`** the hit target at the map centre is inside `.mapboxgl-canvas-container`; **`INP-02`** on Chromium real drag, wheel, CDP `Input.synthesizeScrollGesture`/`synthesizePinchGesture` change the camera (`__gtbg.camera()` or `location.hash` on legacy) (verify); **`INP-03`** tapping a unit on a phone row selects it without `pageerror`; (f) `data-overlap-ignore` only on the map container. Blind spots: canvas text, iframes, hover popups. **Accept.** Legacy at `w375-p`: `TAP` reports the five off-screen transport controls and covered Tools rows, `LAY.OVERLAP` reports `#extra-features` (z 999999, `index.html:185`) in >= 3 states, `INP-01/02` fail; after fixes 0 across rows x states; re-adding the 572 px nowrap row fails CI.

### WP-QA-06 Lab performance gate (M 1.5-2.5 d; 0.5 d in MVSN)
`@lhci/cli` 0.15.1 bundles Lighthouse 12.6.1 vs the audit's 13.5.0, so the gate reads raw LHR JSON (sketch 6). `perf/run-lighthouse.mjs` (Node API, fresh Chrome per run; 3 runs on PRs, 5 nightly, one job per URL: qa-ci's 60 sequential runs could not fit its 30-minute job [S verifier]); profiles as WP-PERF-01 (`mobile`, `mobile-lowend`, `desktop`, `chromeos`) plus Playwright `warm` and `interaction` (lab INP, >= 20 interactions). **Corrections:** previews send `noindex`, failing `is-crawlable`/SEO, so previews and every intentionally noindex URL (`/map`, `/search`, `/embed`, 404) assert the header/meta instead and SEO is scored on indexable URLs only (chapter 10 default (a): `is-crawlable` weighs 4.04 of 12.04, so a noindex page tops out near 66) [M2]; block the Netlify RUM script on production runs (`blockedUrlPatterns`; verify no console error); inject the production Referer for `api.mapbox.com` so budgets include real tile cost (WP-DEC-01; verify). **Ratchet:** the numbers are WP-PERF-02's (G0 lock 64/85, G1 >= 78/95 after R0, G2 >= 85/97 after R1, G3 >= 90/100 at rebuild beta, G4 >= 95 or a recorded exception at cutover); this WP adds an automatic floor `perf/floor.json` (median of the last 3 nightly runs minus 2; only rises). **G0 applies to the atomic R0 candidate only:** the reload fix alone drops the replica to 51 (TBT 16 -> 492 ms), so intermediate commits may dip and only the R0 bundle (SW fix + boot-after-first-paint + HTML perf, WP-PERF-05) is expected to hold [S perf-cwv-01/02]. Exceptions (`/map` mobile, `valid-source-maps` for a self-hosted map chunk) live in `perf/exceptions.json`. **Accept.** `assert-lh` reproduces the audit at G0 (mobile 18, desktop 14 failing; executed); raising a budget without label + ADR fails.

### WP-QA-07 Stale-code trap and R0 acceptance (L 3-4 d; 0.5 d in MVSN)
`/assets/*` is immutable, the SW is cache-first and one name carried different bytes: any fix is invisible or poisons caches unless R0 ships first (D-ORDER). Written before R0 exists (`r0-acceptance.spec.ts`; sketch 4): (1) fresh profile: one main-frame document request, controller set without navigation, one style request (one Mapbox `sku`); (2) profile seeded with the Sep-29 bundle, `gbg-v5` and the old SW: next navigation loads new bytes, zero console errors, Help/Bookmarks chunks open without remounting the old app, <= 2 navigations; (3) rename drill: any name whose bytes differ from production's manifest fails (AI-02); data ships under new hashed names (`/data/*` is `max-age=3600`); (4) kill switch: `gbg-*` deleted, no registrations; (5) 5xx never cached; (6) `/hx/`, `/api/`, `/.netlify/` never cached, navigations never `fromServiceWorker()` (D-SW); (7) update: waiting SW, `aria-live` prompt, no navigation for 3 s. SW tests use `tests/support/fault-server.mjs` (static server with `/__fault?path=&status=`): whether `context.route` sees SW-issued requests is version dependent [S verifier]. **Patch-runner gate (Tranche 0, qa-ci-28):** each run passes `UG-01`; every anchor matches once and a second run is refused; output renamed by content hash (AI-01..03); `index.html`, `sw.js`, lazy-chunk specifiers rewritten chunks -> entry -> html/sw (SL-01/22); parity subset with the patch's intended-diff entries; `patch-report.json` committed. **Accept.** All seven tests and the gate green on the R0 candidate; LH `redirects` = 1. **Risk.** A bare `.catch(reload)` loader can loop: test a 404 entry.

### WP-QA-08 Console gate, fault matrix, idle, hidden tab, GPU loss (M 2-3 d)
Lighthouse passed while C5 existed: failures sit behind clicks and fetches, and the app has no error boundary (app-latent-02). (1) Console gate in the base fixture, driven by `ancestor.spec` (20th Maine -> Change Regiment, 101086/101229), click-every-control, all 467 regiments, `subpages.spec`, and a runtime `no-debug-text` scan (`undefined`, `NaN`, `[object`, snake_case, dev-log phrases). (2) `CON-IDLE`: 10 s and 60 s without input, zero errors, bounded CPU (the monuments rAF loop throws every frame, perf-runtime-02). (3) **`FLT-01..06`:** `localStorage` throws; WebGL null; `api.mapbox.com` blocked; lazy chunk 404; throw in an effect; one `/data/*.json` 404 - each leaves a non-blank page with a labelled fallback and Retry, other features working, one `error` message reaching `/api/ingest`. (4) `PLY-VIS`: play 8x, hidden 30 s, tick delta <= 16. (5) `FLT-GPU`: `WEBGL_lose_context` x20, recovery < 3 s, 0 uncaught errors, Text route after 3 losses in 60 s (verify on mapbox-gl 3.24.1). (6) Zero warnings in a clean profile **and** with uBlock lists (verify headless). **Accept.** Legacy: ancestor spec fails with `setGoldUnit is not defined`, FLT-01/02 leave a blank page; green after fixes.

### WP-QA-09 One clock, one date (M 1-2 d; 0.5 d in MVSN)
Six tick-to-clock implementations plus typed labels; `July ${l + 2}` at 97428, 100842, 101006, "1x (real time)" at 97429 [V]; 49/137 labels off > 10 min. `time-model.mjs` (anchors if present, else the files' stated formula); `tests/golden/tick-clock.csv` (675 rows) generated from `data/time_anchors.json` (seed `time-facts-anchors.csv`, 33 anchors), regenerated in the same PR as any anchor edit; `one-clock.spec.ts` (sketch 3) at ticks {1,12,17,28,226,267,302,451,538,553,675}; `TM-V1..V21` (chapter 04; `app-time.md` 10.1) `--strict`; `TM-V9` lint bans (`July ${..+2}`, `5*60`, `toLocale*`, "real time"); slope warn > 15 / error > 60 min per tick; `dv` re-maps old links with a notice; sigma >= 10 min renders "about". **Two modes:** `date-only` (before DG-3: no "July 4/5", date equals tab; T0 scope) and `clock` (after: one clock string equal to the golden). **Accept.** date-only red then green with T0; V9 0 hits; an anchor edit shows a reviewable 675-row diff.

### WP-QA-10 Function and interaction specs (L 4-6 d)
One spec per feature (`qa-ci sec.5.3`), red on legacy first: `FST` (no repeat splash, layout persisted, phone auto-compact, no keyboard offer on touch, title unclipped at 320-375); `JMP` (panels closed; toast gone <= 6 s - code auto-dismisses at 4.5 s so this row may already be green [S app-latent]) + **`JMP-DATA`**: after a jump to tick 451 the log shows `placements_day3`/`density_day3` and `visibleUnitIds()` >= N (today they load only past tick 200/420); `KBD` (Esc order modal -> card -> story -> search -> selection, from inputs, **clears `pinnedUnitId`**; **`KBD-CODE`** `{key:'&', code:'Digit1'}` jumps to Day 1, IME `isComposing` fires nothing); `SRC` (10th < 102nd, no `alias for` rows, "Hazlett" returns a battery); `MSH-01..04` (transport in viewport, all 14 Tools tiles change state, no `data-shell=full` component in compact, mobile map bounded); `VIS-CANVAS` (backing store == css x min(dpr, 2)); `ANC`; `DST` (H12 did not reproduce in a fresh session [S app-latent-20]: the test decides); `WLK`; `HLP` (<= 100 ms feedback); `DLK` (9 link builders open the requested state under the D-URLSTATE grammar; aliases read, never written); `SEK`; `NAV` (no z 999999 layer; overlay never covers `/historian`); `SUB` (20 pages x 3 viewports; dashboard chart on 10 cold loads; Living Ledger tick 1). **Accept.** Every spec is red on the frozen legacy bytes before its fix and registered in `known-failures`; each fix PR deletes its entry; `JMP-DATA`, `INP-01/02`, `DLK` and `MSH-01..03` are green on the R1 staging candidate at 20/20 runs (`MSH-04`, mobile `maxBounds`, and the rebuild-only rows H5, H6, H12, H13, D1, D4 stay registered until cutover); click-every-control covers 100% of controls listed in the state catalogue at `w375-p` and `w1440-d`; no spec relies on a fixed wait except the documented SW no-reload wait.

### WP-QA-11 Data validators (L 3-4 d)
Promote `tests/data/validate.mjs` to `pipeline/validate/*.mjs` with the ratchet runner (sketch 8) and the verifier's fixes: collect every `*_id` key (adds `battalion_id`; DV-03 87, DV-04 2 [V]); classify speed caps by an `arm` field in `data/unit_aliases.json`, not `/CAV/` in the id (`U-8IL` is 8th Illinois Cavalry; its defect is company-vs-regiment identity); `unit_aliases.json` replaces in-code alias resolution. Seed the registry from section 2. Add DV-16..30 (`qa-ci sec.5.8`), notably `source_id` + `sources.json` licence/URL/accessed (prerequisite for the Historian expansion) and build reproducibility. `--strict` on any `data/**` PR; anchors/counts/casualties/`confidence: L|M` need an `expert-review-log.md` entry. Automation proves consistency and provenance, not truth. **Accept.** 30 gates print; each data fix removes exactly its entry.

### WP-QA-12 Accessibility automation (L 3-4 d)
WP-A11Y-29 specifies content; this WP owns CI wiring, harness and scorecard rows. axe over its matrix (about 34 app states + 27 pages) x {default, reduced-motion, forced-colors} x {desktop, Pixel 7 touch}: 0 violations and 0 unreviewed serious/critical `incomplete` for `color-contrast`, `label`, `button-name`, `aria-allowed-attr`, `target-size` (sketch 7). **A0 baseline mode** (`a11y-baseline.json` keyed state/rule/node with expiry; CI fails on new violations only; emptied at cutover) is the axe form of the `known-failures` registry. Keyboard-only journeys (init script fails on any `pointerdown`; the 22 tasks of chapter 07 sec. 7; focus never obscured 2.4.11; no trap); dialog trap/restore; 0 unnamed or emoji-glyph buttons; token-contrast unit test; stylelint (no raw hex, min font 12, coarse min-size 44, z-index scale); nightly pa11y-ci; 320 px reflow + text-spacing; Lighthouse a11y 1.00 (skip-link/landmark/heading rules run in axe: Lighthouse 13 `bypass` cannot fail); AT log as `MAN-AT`. **Accept.** CI fails on any new violation, unnamed control, target < 24 (44 touch), font < 12 or token < 4.5:1.

### WP-QA-13 Bundle, request and network budgets (M 1-2 d)
`size-limit` (raw + brotli) per chunk, HTML, poster, first-paint data; bytes before LCP <= 65 KB (`response.request().sizes()`); `/data/` requests before first interaction <= 3 (legacy 30-38); 0 duplicate URLs; one main-frame document on first visit; long tasks in the first 5 s <= 50 ms (map init <= 100). Numbers are WP-PERF-02's (chapter 05 sec. 5), **provisional until WP-DEC-01/02 read out (DG-2)**. **Correction:** "1 WebGL context" cannot count `getContext('webgl2')` (one map reads 2: the `supported()` probe at 53944 and the map at 94081; mobile adds a third): count `canvas.mapboxgl-canvas` and `__gtbg.mapInstances()` [S verifier]. First-party `.map` files publish `noindex` (D-CSP); a self-hosted map chunk without a map records a `valid-source-maps` exception. **Accept.** +100 KB import fails; warm visit 0 data requests; mobile shows 1 map canvas.

### WP-QA-14 Deterministic visual baselines (M 1-2 d)
Chrome states only, never map pixels: `toHaveScreenshot` in the pinned container (Linux-only, `animations:'disabled'`, `?test=1`), ~40 states x `w375-p`, `w768-p`, `w1440-d`, `w1920-d`, map masked, `maxDiffPixelRatio 0.002`; baselines change only via a manual `update-baselines` workflow. **Correction:** no page loads webfonts today (Spectral never loads [S verifier]); flake comes from system fonts, so **all** browser jobs including T2 run in the pinned image (qa-ci's `preview.yml` ran visuals on the host). **Accept.** Three runs on one commit give 0 diffs.

### WP-QA-15 Security and privacy contract tests (L 2-3 d)
HP-01..15 (WP-03) plus: `KEY-01` foreign `Referer` refused on tile/TileJSON/geocoding (already 403; style/sprite/glyph answer 200 [S infra-netlify-18]), token taken from the bundle or a sub-page, **not `/`** (none there [M8]); `KEY-02` Google key; `EMB-01` a foreign page frames `/embed`, not `/`; `ORG-01` origins contacted across the whole e2e run == `docs/privacy-origins.json` == `privacy.html`; `STO-01` storage keys == `docs/data-inventory.md`; cookie claim; `ATTR-01` attribution on every map (off at 102988, 110777 [V]); `AUD-01` no `AudioContext`/sound UI on the app and every page except Immersive (D-SOUND; Immersive, only if kept as Tier 3, is gated by the limiter, mute and Pause-stops-drone checks instead); `XSS-*` hostile fixtures (Watch Together import, Historian passages; 404/410 if retired); `OBS-01` (verify CLI). **CSP roll-out (D-CSP):** (1) collector first: a synthetic violation reaches `/api/ingest` (`CSP-COLLECT`); (2) full e2e against the enforcing candidate; (3) 14 days Report-Only in production, 0 new signatures; (4) enforce by class, `/map` last; (5) drop `'unsafe-inline'` after generator work; RUM host stays in `connect-src` while Netlify RUM runs. **Accept.** ORG-01 fails on an undisclosed origin; enforced CSP with 0 new signatures for 14 days.

### WP-QA-16 Pipeline, promotion, rollback, versioning (L 3-4 d)
Interfaces: WP-ARCH-30 (routes, flags, beta), -31 (app `ci.yml`, `release.yml` hotfix mode) and -32 (`cutover.yml`) build the app-level jobs; this WP owns the release contract they conform to. **Environments:** local; PR preview (`noindex`, preview token); staging = branch deploy of `main`; production = `production`; `/classic/`, `/next/` at cut-over. **Branches:** trunk-based, short branches -> PR -> squash to `main` (PR title = conventional commit; `fix:` needs `Refs:`/`audit:`). **Tiers:** 6.6; the amendments to qa-ci are T2 = only what needs the real CDN, T3 on **staging** [M3: production runs would add real views at ~113/day], T4 inside `release.yml`. **T2 trigger:** Netlify emits no `deployment_status` for previews [S verifier]: poll the commit status `netlify/friendly-lolly-da85c0/deploy-preview`; fallback `netlify deploy --alias=pr-N` (credit treatment unverified). **`release.yml`** (`workflow_dispatch`: `sha`, `mode normal|hotfix|rollback`; `tools/promote-check.mjs`): T1+T2 green on the SHA; nightly green at/after it within 24 h (waived in hotfix); scorecard no regression and release target met; budgets/registries not raised; `CHANGELOG` + `version.json` bump; claims green; no open `severity:critical|regression`; freeze calendar (register 4.3; rollback exempt); monthly promotion budget from `ops/inventory.yaml`. Then push `SHA:production`, poll `/version.json` for the SHA, run T4 (a Netlify webhook cannot authenticate to `repository_dispatch` [S verifier]). **Hotfix:** branch from `production`, regression test with red proof, T1+T2, cherry-pick to `main`. **Rollback:** L0-L3 as chapter 03 sec. 4.10 (flag, "Publish deploy" or `restore` then `/unlock` (verify) in < 60 s, self-unregistering `sw.js`, data-manifest swap) plus L4 lite snapshot on a second host (RTO <= 4 h); auto-rollback when smoke fails twice in 10 min. **Versioning:** app SemVer, data CalVer `data-YYYY.MM.N`, integer `timeModel` (= `dv`) in `/version.json` `{app, data, timeModel, sha, builtAt, deployId, assets{name: sha256}}` (live bytes must equal the CI `deploy-manifest.json`, chapter 03 criterion 13), Help -> About, guide footer, RUM samples; `CHANGELOG.md` + public `/changelog` (with Corrections) via a ~50-line script. **Accept.** Preview has `noindex`, production does not; `/version.json` SHA equals the promoted SHA; a red gate refuses promotion; L1 drill < 60 s.

### WP-QA-17 RUM evaluator and alerting (M 1.5-2.5 d)
The vitals client is WP-PERF-03, server and storage WP-INFRA-15 (`/api/ingest`), the weekly report WP-PERF-04 (`tools/vitals-report.mjs`); QA owns evaluator logic, hardening tests and drills. **Rules** (chapter 05 sec. 9): a rating needs n >= 100 per template x device class over 7 days, else `insufficient` (never green); alerts need n >= 30 and p75 >= 80% of Good or +20% week over week, per template, never per URL; qa-ci's escalation on top: p75 Poor two consecutive days pages, a new error signature on a build pages, a CSP violation after enforcement pages (`rum/evaluate.mjs`, 6 tests executed; sketch 10). Templates: landing, `/map` desktop, `/map` mobile, content, tools, Historian. Input = daily fixed-bucket histograms (geometric x1.12 edges; p75 within one bin). **Hardening tests** [M4]: whitelist fields per message type (qa-ci's collector spread `...b.error` last, so a client could set `kind`, `metric`, `bot`); cap `metrics.length`; size check before parsing; `Sec-Fetch-Site: same-origin`; function rate limit (Free/Personal: 2 code rules [S infra-netlify-31]); GPC/DNT sends nothing; no cookie; beacon <= 3 KB br. Reconcile monthly with Netlify RUM; export it before any reset. **Accept.** Each alert class fires in unit tests; a forged `kind:'metric'` error is rejected; a synthetic bad deploy alerts before `Poor`.

### WP-QA-18 Synthetic monitors, smoke, routing (M 1.5-2 d)
`SYN-01` probes every 6 h; `SYN-02` browser smoke at 375 and 1440, 4x a day (one document, LCP painted, play 10 s, three panels, console-zero; RUM host blocked, `X-GTBG-Synthetic: 1`); `SYN-03` `/version.json` SHA == last release record (out-of-band deploy = incident); `SYN-04` sitemap URLs 200 and canonical; `SYN-05` daily views (anniversary baseline); `SYN-06` TLS (cert expires 2026-11-10; alert 30/7 days), HSTS preload, domain expiry (2027-06-13), CAA, MX/SPF/DKIM/DMARC alignment for role aliases, Search Console/Bing TXT (D-CONTACT); `SYN-07` Mapbox usage vs the 35k-loads trigger (verify access); `SYN-08` `/data` manifest hashes. Measure over two weeks whether probes move Netlify Analytics (edge-counted; unverified) and cut frequency until < 5%. **Routing:** `page` -> GitHub issue `prod-incident` + push (ntfy/Pushover); `warn`/`regress` -> issue; weekly digest; quiet hours 22:00-07:00 ET silence `warn` pushes only; alerts link `runbooks/incident.md`. **Accept.** A forced failing probe opens an issue; a timeout exits 2, not FAIL.

### WP-QA-19 Parity: QA layer and cut-over computation (M 2-3 d)
The build is chapter 03's: hermetic rig with probe P0 (WP-ARCH-05), T1 goldens (-06), checkpoints and T2 snapshots (-07), registry, parity report and `tools/cutover-gate.mjs` (-08), `cutover.yml` (-32). This WP adds: (1) **reference R = the frozen bytes** (md5 7ef75b95f4c0); Tranche-0 fixes are registered intended diffs against R and the `/classic/` bridge build is never the reference, so no entry goes stale when T0 ships; registry lint per chapter 03 sec. 4.3 (audit id or `new:`, expiry <= cutover + 30 d, pinned text, sign-off for behaviour; sketch 9). (2) T3 pixels are a contact sheet, not a gate: SSIM >= 0.98 is unattainable by design (chapter 03 sec. 4.1, a deviation from qa-ci 6.2); gated visual baselines for the new design are WP-QA-14. (3) The go/no-go is chapter 03's 16 criteria, run on the `lab` scorecard profile: no field RUM before cut-over, and the beta cohort is judged on lab and device evidence because n >= 100 per template cannot be met at ~113 views/day [S verifier qa-ci-18]. (4) Parity artefacts kept for 7 nights; rollback drill in `MAN-DRILL`. **Accept.** legacy-vs-legacy 0 diffs x3; a seeded clock-format regression is unexplained; `cutover-gate` exits 0 only when all 16 criteria hold.

### WP-QA-20 Ask-the-Historian evaluation gates in CI (M 1.5-2.5 d)
WP-HIST-07 copies `tmp-hist-golden/` (`verify-golden.js`, `run-system.js`, `score-golden.js`, `gates.json`; 349/349 anchors verified, deterministic scorer) into `pipeline/historian/eval/` (chapter 03 sec. 10 g: the pipeline is `pipeline/historian/` of this repo) with the golden GQ-150 + GP >= 100; qa-ci HC-01..15 (`qa-ci sec.5.14`) is the CI wiring owned here. T1 job (`vars.HISTORIAN_PHASE`, baseline `eval/baselines/main.json`, tolerance 2 points): six hard gates every release (injection/XSS/leak 100% of 8 items, 0 forbidden content, 0 hard render defects, 0 hallucinated citations, out-of-scope decline >= 90%, false decline <= 5%), hit@5 >= 0.90, MRR@10 >= 0.70, abstain precision >= 0.95 / recall >= 0.90; chapter 14 raises the A+ line (Golden-Core >= 95%). T2 real-UI leg: 8 adversarial + 12 random items via Playwright with `raw_html` captured, last message not under the input bar at 320-430, `aria-live`. Also: runtime `no-debug-text` after the eight baseline probes (kills 137/137 "undefined"); `/hx/` + SW bypass; coverage >= 90% of the 570 OOB records (467 regiments + 103 batteries), "Hazlett" returns a battery. **Accept.** Report in <= 60 s; "why did Lee lose the war" abstains; a hostile passage renders inert; a > 2-point drop fails (deployed page today 14.0%).

### WP-QA-21 Cross-browser, real-device, in-app, hostile-environment and school programme (M 2-3 d + owner time)
**Automated:** Chromium full matrix nightly; WebKit/Firefox 4-row smoke per PR, full twice weekly; `es-check` on `dist/*.js` vs `browserslist`; WebGL2/module gate to the Text route (D-BROWSERS). **Real devices** (`docs/qa/rc-device-checklist.md`, 15 min each; logs `docs/qa/devices/YYYY-MM-DD-<device>.md` parsed by `MAN-DEV`): owner phones; **one iPhone SE-class** (floor iOS 16); **one Galaxy A-class 4 GB** (Samsung Internet + dark-mode forcing + low-end on-device Lighthouse via `adb forward tcp:9222 localabstract:chrome_devtools_remote`); an iPad; a 4 GB Chromebook (D-SCHOOLS); a hosted device cloud only for a one-month cut-over trial (iOS 16; price UNVERIFIED). Checklist: background/foreground x10, rotate, every Tools row, AR prompts, airplane-mode reload. **In-app browsers** (FBAN/FBAV, Instagram, TikTok, Line, Reddit, GSA): UA emulation gates Lite boot, URL-first resume, "Open in your browser" for export/AR; one physical pass per RC. **Hostile environment (D-LANG):** an auto-translate **simulator** (MutationObserver wrapping text nodes in `<font>`, as Google Translate does) reproduces the React `removeChild` class; forced-dark; uBlock profile; AZERTY/IME. **Schools:** Classroom-mode e2e with all hosts but `api.mapbox.com` blocked. **Audit S3 (Camera canvas, not train S3):** GPU-backed headed run (`map.loaded()` + pixel-variance grid) with and without `#atmosphere{mix-blend-mode:multiply}` (`camera.html:38`); close with evidence if unreproducible. **Accept.** RC checklist on iOS Safari, Android Chrome and the low-end device before each minor release.

### WP-QA-22 Soak and long-session job (S-M 1-1.5 d)
Projectors and kiosks run for hours; leak candidates exist (monuments rAF loop, up to 3 Mapbox instances). Playwright/Chromium + CDP `Performance.getMetrics`/`HeapProfiler` on `/map` at 8x: loop days, open/close panels, switch layout, 20 bfcache cycles. Assert heap growth <= 30 MB, DOM nodes and listeners +-5%, no long-task growth, p95 frame **drift** (software WebGL makes absolute times meaningless). **Cadence:** weekly 60-minute run on staging + every RC, and a 10-minute mini-soak in nightly (a nightly hour is ~1,800 min/month, the whole Free allowance). `navigator.wakeLock` only while playing, released on pause/hidden (unit-tested). **Accept.** Green in CI; a seeded listener leak fails it.

### WP-QA-23 Scorecard, traceability generator, weekly report (L 2.5-4 d; skeleton 0.5 d in MVSN)
Specified in 6.3 and 6.4: `tools/gates.json` (`{gateId: {cat, sev, device, tier, wp, refs{audit[], finding[]}, mode: lab|field|manual}}`), adapters (Playwright JSON via tags, LH assertions, static/DV/HP outputs, manual logs by freshness), `tools/scorecard.mjs`, `tools/traceability.mjs`, PR comment with delta, weekly digest. Also ingest the 20 findings NF-35..NF-54 of chapter 16 s.2 as "add gate" rows (Appendix A below lists NF-01..34 only; chapter 16 O-16-2) and record chapter 16 s.1.4 as the baseline of record until the first machine run (O-16-1). **Accept.** An uncatalogued gate fails; a catalogued gate that did not run is red; a category with < 6 gates cannot exceed A-; exit 0 only when all 13 categories are A+ on both device classes for the chosen profile.

### WP-QA-24 Manual programmes, claims registry, verification dossier (M 2-3 d + external)
**Claims** `docs/claims.json` (chapter 11 schema `{id, statement, evidence_ref, verify, status: now|after:<id>}`; numbers from `dist/facts.json`, one generator with DV-23's `counts.json`); copy carries `data-claim`; lint fails on unknown ids or non-green tests (H8, H10, H13, G1). **Programmes** (`docs/qa/*-log.md`, dated front matter the scorecard parses): AT each RC (chapter 07's 22 tasks; NVDA, JAWS, VoiceOver, TalkBack, forced colors, voice control, 400% zoom); usability at cut-over and yearly (5-10 participants); expert review for data releases touching anchors, counts, casualties, vignettes (D-HIST-REVIEW; CI fails on "Reviewed" copy without a signed decision). **Dossier** (D-EVIDENCE; cost unverified): (a) independent accessibility evaluation of 6 flows (WP-A11Y-32; until then "partially conforms"); (b) real mid-range Android and iPhone SE runs of all Tier-1 URLs; (c) Observatory/securityheaders + outside CSP review; (d) one-hour professional UX critique of `/map`, landing, Historian; (e) 8-10 user sessions and >= 100 Historian questions by others. `EXT-*` gates pass only with a dated non-author artefact linked from `docs/evidence/index.md`. **Accept.** Every `data-claim` id resolves to a green test; logs within cadence before promotion.

### WP-QA-25 Operations ceiling, drills, continuity checks, test health (S-M 1-1.5 d; starts P1)
Ceiling <= 10 h/month excluding content (D-CONTINUITY); maintenance mode pauses outreach and new content, never security, renewals, corrections. Duties [E, h/month]: scorecard + digest 1.0; nightly/flaky triage 1.5; RUM/error/CSP digest 1.0; dependency PRs (Renovate; Mapbox minors quarterly behind parity) 1.0; ops review 0.5; quarterly drills amortised 1.5; corrections inbox 1.0; **total 7.5**. Gates: `OPS-01` a test alert reaches the one channel; `OPS-02` `ops/inventory.yaml` < 90 days and secret-free; `OPS-03` restore drill (empty machine -> fresh Netlify site <= 2 h) <= 90 days; `OPS-04` open incident/flaky issues <= a set count; `OPS-05` monthly hours ledger (a warning). Test health: `retries: 1`; a pass on retry is flaky, two in 7 days quarantine (`test.fixme` + issue + 14-day expiry via `registry-expiry`); T1 > 8 min or T2 > 35 min fails. **Actions minutes** [E]: T1 6 x 20 x 4.3 = 520; T2 (UI PRs, path filters) 430; nightly Chromium 25 x 30 = 750; WebKit/Firefox 260; soak 280; total ~2,250 vs 2,000 Free / 3,000 Pro: choose plan or public repo (section 10). **Accept.** Each runbook dry-run by the owner in <= 30 minutes without an AI session, logged.

---

## 6. Shared specifications

**6.1 Prototypes.** `plan-work/tmp-qa-ci/sketches/` and `plan-work/tmp-hist-golden/`. Copy, do not re-derive.

**6.2 Viewport matrix** (`tests/support/viewports.json`; one Playwright project per row). Phones (touch, DPR 3 unless noted): widths 320@2, 360, 375, 390, 412@2.625, 430, each portrait and landscape (W x H swapped), plus `w375-s` 375x667@2. Tablets (touch, DPR 2): 768x1024, 1024x768, 1024x1366. Desktop (fine pointer, DPR 1): 1024x600, 1280x800, 1280x600 (the desktop analogue of landscape), 1440x900, 1440x2560, 1920x1080, 2560x1440, 2560x1080. Ids `w<width>-p|l|s|d|t|u`. **PR tier (8):** `w320-p w375-p w375-l w412-p w768-p w1280-d w1440-d w1920-d`; nightly all 24 + generated boundary rows; WebKit/Firefox 4-row smoke (Firefox desktop only). Emulated variants: reduced-motion, forced-colors, dark (default), 200% text + WCAG text-spacing.

**6.3 Scorecard** (`tools/scorecard.mjs`, executed, 4 tests). A catalogued gate with no result is **failed**; an uncatalogued result is an error; a category with < 6 gates per device class is capped at A-. Ladder: A+ all `must` + >= 97% `should`; A all must + >= 90%; A- all must + >= 80%; B >= 90% must; C >= 80%; D >= 60%; else F. **Tier-aware:** Tier-1 gates decide A+, Tier-2 are held to A, Labs are non-blocking but ratcheted; a retired page's gates leave only with a `docs/retired.md` entry. **Profiles:** `lab` before cut-over (field RUM reported, not scored: 28-day RUM cannot exist yet [S verifier qa-ci-18]) and `full` after (adds RUM 30-day, manual logs <= 90 days, `EXT-*`). Manual gates read dated front matter in `docs/qa/*-log.md`. Baseline today (109 static gates): data, polish, reliability, a11y, security, privacy F/F; performance D/F; usability, SEO B/B; docs A- (thin); content, design, function unmeasured [S qa-ci C.7].

The 13 categories (rows of the audit scorecard): content depth, data consistency, visual design, fit and finish, usability, core function, reliability, performance, accessibility, SEO/metadata, security, documentation, privacy/legal. Chapter 15 sections 6-7 report the same gates grouped into 11 owner categories (content depth + data consistency = Data accuracy; visual design + fit and finish = Fit and finish; security + privacy/legal = Security and privacy; usability = UX; Ask the Historian added as its own category from the `@wp:WP-HIST-*` and `HC-*` gates); `tools/gates.json` therefore carries both `cat` (the 13) and `group` (the 11) so `scorecard.mjs` prints either roll-up and the D-EVIDENCE cap (< 6 gates = A-) is applied per `cat` and per `group`. Every gate in `tools/gates.json` carries `cat`, `sev`, `device` and `tier`, so each category is graded per device class from the gate families named in the WPs; mobile adds 44 px targets, safe-area, touch gestures, GPU loss, TalkBack/VoiceOver and AR prompts.

**A+ stays A+ = this command's exit code**, run per PR (comment with delta), weekly (issue) and at promotion.

**6.4 Traceability matrix (every audit id and finding -> an automated assertion).** *Files:* `docs/trace/obligations.csv`, generated once from `plan-work/all-findings-index.csv` (852 rows minus the 1 REFUTED) + the 57 audit ids + ADR ids (`id, kind, sev, verdict, class auto|manual|decision, phase`); `docs/trace/waivers.json` (`{id, reason, evidence, review_by}`; an UNVERIFIABLE/NOT_VERIFIED finding needs a "verify first" ticket); `tools/gates.json` (each gate lists `refs{audit[], finding[]}`). *Tags:* Playwright titles carry `@audit:C1,C2 @finding:mobile-01 @wp:WP-QA-05 @cat:function`; node gates export `meta = {id, audit, findings}`; `tools/collect-tags.mjs` fails on an unknown id. *Generator* `tools/traceability.mjs` writes `docs/traceability.{json,md}` (`id | sev | title | gates | tier | status`, status `green|red|expected-red (KF-id, until)|not-run`) and exits 1 when a critical/high `auto` obligation has no gate and no waiver, a gate/tag names an unknown id, a waiver is expired or lacks evidence, a `known-failures` entry has no obligation, or the coverage KPI falls. Medium/low findings must be classed by their phase's start date. Deleting a test means deleting its claim (CODEOWNERS on `docs/trace/`).

**6.5 Definition of Done.** *PR:* linked audit/finding id; red-first proof; T1 + T2 green; no registry grew; budgets not raised; UI: screenshots at 375 and 1440, visual diff reviewed, 320/768/landscape checked, keyboard-only pass; copy passes lint and `data-claim`; data: DV `--strict`, `source_id`, review-log entry for L/M confidence; new origin: `privacy-origins.json`, privacy text, CSP, ORG-01 in one PR; changelog line; ADR per decision. *Feature:* in the state catalogue (default, loading, empty, error, offline); axe, layout-audit, console gate at 24 rows; keyboard-complete; claims entries; Help/guide updated; real-device pass before a minor release. *Release:* WP-QA-16 gates; RC checklist for minor/major.

**6.6 Tiers T0-T6** (amended from `qa-ci sec.2.2`).

| Tier | Trigger, budget | Runs | Blocks |
|---|---|---|---|
| T0 | `git commit`, <= 15 s | prettier, eslint, stylelint, staged gitleaks, quick DV, `undef-globals` on patch changes | advisory |
| T1 | every push/PR, <= 6 min (fails > 8) | typecheck, unit, DV `--strict`, build, site-lint, `undef-globals`, `asset-integrity`, size-limit, gitleaks, audit, PR-tier browser suite (8 rows Chromium + WebKit/Firefox smoke) on the locally served `dist` | merge |
| T2 | Deploy Preview, <= 30 min (fails > 35) | only what needs the real CDN: headers/redirects/cache, embed framing, brotli sizes, Lighthouse (3 runs, one job per URL), one `@realmap` smoke, ORG-01 | merge |
| T3 | nightly on **staging** | 24-row matrix (Chromium; WebKit/Firefox twice weekly), all-state axe, parity, links, Lighthouse-all, key probes, 10-minute mini-soak; weekly 60-minute soak | issue; green within 24 h to promote (waived in hotfix) |
| T4 | post-deploy, <= 8 min, inside `release.yml` | probe, smoke at 375 and 1440, `/version.json` == SHA | two failures in 10 min => L1 |
| T5 | every 6 h on production | curl probe, 4x-daily smoke, RUM evaluator, cert/DNS/GSC, Mapbox usage | `prod-incident` issue |
| T6 | per RC, quarterly | real devices, AT, usability, expert review, dossier, drills | minor/major promotion |

---

## 7. The ten test sketches (improved from qa-ci Appendix A)

Originals: `qa-ci.md` Appendix A, `tmp-qa-ci/sketches/`. **Status:** sketches 1-5, 7 and the parity spec are TypeScript **never run in a browser**; 6, 8, 9, 10 and the geometry helpers were **executed** in node; the "improved" deltas here are untested. `(verify)` = confirm on first run.

**1. Tappability (C1, C2, A3)** - geometry first, then trial click.
```ts
for (const sid of MOBILE_STATES) test(`@cat:function @audit:C1,C2 @finding:mobile-01,mobile-04 "${sid}" every control reachable`, async ({ page }, info) => {
  test.skip(!info.project.metadata.viewport.touch);
  await states[sid].run(page); await page.addScriptTag({ path: 'tests/lib/layout-audit.browser.js' }); await quiesce(page);
  const bad: string[] = [];
  for (const c of await page.evaluate(() => (window as any).__layoutAuditList())) {
    const loc = page.locator(`[data-qa="${c.qa}"]`);
    const g = await loc.evaluate((el) => { const r = el.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, hit: t === el || el.contains(t) }; });
    if (!g.inside || !g.hit) bad.push(`${c.sel} "${c.name}": ${g.inside ? 'covered' : 'outside viewport'}`);   // trial click scrolls overflow:hidden parents: never the first check
    else await loc.click({ trial: true, timeout: 1500 }).catch(() => bad.push(`${c.sel}: not actionable`));
    if (c.w < 44 || c.h < 44) bad.push(`${c.sel}: ${c.w}x${c.h} < 44`);
  }
  expect(bad).toEqual([]);
});
```
**2. Detector rules (H1, C2, S4, A4, D2)** - 217-line original in `sketches/tests/lib/`.
```js
// OFFSCREEN !scrollableAncestor(el) && !inside(rect, viewport, 1) (C1 x=-213; scrollWidth is blind under overflow:hidden) | OCCLUDED shadow-aware elementFromPoint at 5 points: centre hits el/descendant/label and >= 3 of 5 (C2)
// OVERLAP outermost fixed/sticky chrome + interactive boxes: area >= 16 px^2, >= 4% of the smaller, topmost at centre is A or B (H1) | TARGET_SIZE coarse ? 44 : 24 unless a 24 px circle on the centre touches no other target (WCAG 2.5.8)
// FONT_FLOOR < 12 px | CLIPPED_TEXT Range rect outside clipping ancestor/viewport/ellipsis | H_OVERFLOW scrollWidth > innerWidth + 1
const isAllowed = (v, allow, today) => allow.some((e) => e.rule === v.rule && (!e.until || e.until >= today) && (!e.sel || v.sel.includes(e.sel)) && (!e.other || (v.other || '').includes(e.other)));
// spec: repeat __layoutAudit() until two consecutive results match (max 5 x 300 ms), then expect([])
```
**3. One clock, one date (C3, C4, H9)**
```ts
const MODE = process.env.CLOCK_MODE ?? 'date-only';                       // 'clock' only after D-TIME sign-off (DG-3)
for (const tick of [1, 12, 17, 28, 226, 267, 302, 451, 538, 553, 675]) test(`@cat:data @audit:C3,C4 one clock, one date @${tick}`, async ({ page }, info) => {
  await openApp(page, { layout: info.project.metadata.viewport.touch ? 'mobile' : 'desktop', tick });
  const text = await visibleText(page);                                   // body text + aria-label/title, minus [data-historical-quote]
  const days = new Set([...text.matchAll(/\bJuly\s+(\d{1,2})/g)].map((m) => +m[1]));
  const clocks = new Set([...text.matchAll(/\b(1[0-2]|0?[1-9]):[0-5]\d\s?[AP]M\b/gi)].map((m) => m[0].toUpperCase().replace(/^0/, '')));
  const g = golden.get(tick)!;                                            // tests/golden/tick-clock.csv, generated from time_anchors.json
  expect([...days], 'no July 4/5 on a battle screen').toEqual([+/July (\d+)/.exec(g.date)![1]]);
  if (MODE === 'clock') expect([...clocks]).toEqual([g.clock]);
});
```
**4. R0 and service-worker acceptance (C6, P5)** - fault server, no Playwright SW routing (verify).
```ts
test.use({ serviceWorkers: 'allow' });
test('@cat:reliability @audit:C6 fresh profile: one document, controller without navigation, one sku', async ({ page }) => {
  const docs: string[] = [], skus = new Set<string>();
  page.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) docs.push(r.url()); const s = /api\.mapbox\.com\/styles\/.*[?&]sku=([^&]+)/.exec(r.url()); if (s) skus.add(s[1]); });
  await page.goto('/map?test=1'); await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.waitForTimeout(6000);                                         // the one allowed fixed wait: a reload that must NOT happen
  expect(docs).toHaveLength(1); expect(skus.size).toBeLessThanOrEqual(1);
});
// seeded profile: launchPersistentContext; server.serve('legacy'), load, wait for SW ready (installs gbg-v5 + old bundle); server.serve('next'), load on the same origin:
//   entry URL != index-Cg8FAMXN, 0 console errors, <= 2 navigations. Also: kill switch empties caches; /__fault 503 never cached; /hx/, /api/, /.netlify/ never cached.
```
**5. Console / pageerror / request / CSP gate (C5, P5, X3)** - expiry moved out of every test.
```ts
gate: [async ({ page, context }, use, info) => {
  const bad: string[] = [], today = new Date().toISOString().slice(0, 10), live = load('tests/console-allowlist.json').filter((a) => a.until >= today);
  const ok = (k: string, t: string) => live.some((a) => a.kind === k && t.includes(a.match));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !ok('console', m.text()) && bad.push(`console.${m.type()}: ${m.text().slice(0, 300)}`));
  page.on('pageerror', (e) => ok('pageerror', e.message) || bad.push(`pageerror: ${e.message}`));   // setGoldUnit is not defined
  context.on('weberror', (e) => bad.push(`weberror: ${e.error().message}`));                      // workers/SW (verify)
  page.on('response', (r) => r.status() >= 400 && r.url().startsWith(info.project.use.baseURL!) && !ok('request', `${r.status()} ${r.url()}`) && bad.push(`HTTP ${r.status()} ${r.url()}`));
  await page.addInitScript(() => { (window as any).__csp = []; addEventListener('securitypolicyviolation', (e) => (window as any).__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  await use();
  for (const c of await page.evaluate(() => (window as any).__csp ?? []).catch(() => [])) ok('csp', c) || bad.push(`csp: ${c}`);
  expect(bad).toEqual([]);   // expired entries: reported by the registry-expiry job, never here
}, { auto: true }]
```
**6. Lighthouse 13 assertions (P1-P7)** - executed against `lh_mobile.json` (18 failing) and `lh_desktop.json` (14).
```js
// perf/assert-lh.mjs <profile> <production|preview> <green|target> <url> <lhr.json...>; budgets.json per profile: categories {performance .95, others 1}, metricsMs {FCP, LCP, TBT, SI: green/target},
// auditMinScore {redirects 1, valid-source-maps 1, color-contrast 1, label 1, inspector-issues 1, errors-in-console 1, unused-javascript .9, bootup-time .9, render-blocking-insight .9, network-dependency-tree-insight .9}
const skip = (id) => EX.some((e) => e.assert === id) || ((context === 'preview' || route.noindex) && ['categories:seo', 'is-crawlable'].includes(id));   // noindex URLs assert the header/meta instead
for (const [c, min] of Object.entries(B.categories)) skip('categories:' + c) || check('category ' + c, med(runs.map((r) => r.categories[c].score)), min, '>=');
for (const [id, b] of Object.entries(B.metricsMs)) check(id, med(runs.map((r) => r.audits[id].numericValue)), b[tier], '<=');
for (const [id, min] of Object.entries(B.auditMinScore)) if (!skip(id) && runs[0].audits[id]) check('audit ' + id, med(runs.map((r) => r.audits[id].score)), min, '>=');
check('perf floor', med(runs.map((r) => r.categories.performance.score)), floor[profile][url], '>=');    // perf/floor.json only rises after each promotion; EX = unexpired perf/exceptions.json rows
```
**7. Accessibility state matrix (A1-A6, H2, H6)**
```ts
for (const [sid, s] of Object.entries(states)) for (const v of ['default', 'reduced-motion', 'forced-colors']) test(`@cat:a11y axe "${sid}" [${v}]`, async ({ page }, info) => {
  test.skip((s.layout === 'mobile') !== info.project.metadata.viewport.touch);
  await page.emulateMedia({ reducedMotion: v === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: v === 'forced-colors' ? 'active' : 'none' });
  await s.run(page);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(r.violations.map((x) => `${x.id} x${x.nodes.length}: ${x.nodes[0].target.join(' ')}`)).toEqual([]);
  expect(r.incomplete.filter((i) => ['color-contrast', 'label', 'button-name', 'aria-allowed-attr', 'target-size'].includes(i.id))).toEqual([]);
});   // keyboard journeys: addInitScript(() => addEventListener('pointerdown', () => { throw new Error('pointer used'); }, true)); 22 tasks (chapter 07); Esc stack; focus restore
```
**8. Data validators + ratchet (C4, H5, H7, H10)** - executed 15/15, empty registry 12 red, stale 1; improvements untested.
```js
const ids = new Set(); (function w(o) { if (Array.isArray(o)) return o.forEach(w); if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k.endsWith('_id') && typeof v === 'string') ids.add(v); w(v); } })(oob);   // adds battalion_id: DV-03 100 -> 87, DV-04 28 -> 2; speed caps (inf 150 / art 250 / cav 400 m per min) key on `arm` from unit_aliases.json, not /CAV/ in the id
for (const r of runAll(dataDir)) test(`${r.id} ${r.title} [${r.audit.join(',') || 'new'}]`, (t) => {
  const k = registry[r.id];
  if (k && k.until >= today) { t.diagnostic(`EXPECTED RED (${k.reason}) x${r.findings.length}`); assert.ok(r.findings.length > 0, `${r.id} now PASSES: delete the registry entry`); }
  else assert.deepEqual(r.findings.slice(0, 8), [], `${r.id}: ${r.findings.length} finding(s)`);   // an expired entry must be green; registry-expiry reports the date
});
```
**9. Parity classifier (N1)** - executed 4 tests; the lint is new (chapter 03 sec. 4.3).
```js
export const lint = (e, cutover) => [!(e.audit?.length || String(e.rationale).startsWith('new:')) && 'audit id or new:', e.expires > addDays(cutover, 30) && 'expires > cutover + 30 d', e.kind === 'change' && e.signoff === 'none' && /clock|date/.test(e.path) && 'historian/owner sign-off'].filter(Boolean);
export function classify(diffs, reg, today) {
  const used = new Set(), out = { unexplained: [], allowed: [], expired: [] };
  for (const d of diffs) {
    const e = reg.find((x) => glob(x.checkpoint).test(d.checkpoint) && glob(x.path).test(d.path) && (x.next === undefined || x.next === d.next));   // a pinned value must match: a different wrong date is a regression
    if (!e) out.unexplained.push(d); else if (e.expires < today) out.expired.push({ d, id: e.id }); else { used.add(e.id); out.allowed.push({ d, id: e.id, audit: e.audit }); }
  }
  out.stale = reg.filter((e) => e.expires >= today && !used.has(e.id)).map((e) => e.id);        // a difference that vanished, or a wrong entry, fails --strict
  return { ...out, ok: !out.unexplained.length && !out.expired.length };
}
```
**10. RUM evaluator and forge-proof ingest (P1)** - evaluator executed (6 tests); histogram input and ingest untested.
```js
export const THRESH = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25], FCP: [1800, 3000], TTFB: [800, 1800] };   // [good <=, poor >]
export const p75FromHist = (bins /* [{hi, n}] ascending, x1.12 log bins (WP-PERF-03) */) => { const N = bins.reduce((a, b) => a + b.n, 0); let c = 0; for (const b of bins) { c += b.n; if (c >= 0.75 * N) return b.hi; } return NaN; };
// humans only, 7 days, >= 100 samples per (metric, device class, template) else 'insufficient'; page: Poor 2 days | warn: not Good 3 days | regress: +15% and > 0.9 x Good
const SCHEMA = { vitals: ['build', 'page', 'layout', 'vw', 'dpr', 'metrics'], error: ['build', 'page', 'layout', 'message', 'where'], csp: ['build', 'page', 'd', 'b'] };   // netlify/functions/ingest.mjs
export default async (req) => {   // whitelist per type, never spread client keys (qa-ci's rum.mjs did); the header stops cross-site browsers only, so size cap + rate limit bound curl forgery
  if (req.method !== 'POST' || req.headers.get('sec-fetch-site') !== 'same-origin') return new Response(null, { status: 403 });   // (verify in Functions v2)
  const raw = await req.text(); if (raw.length > 4096) return new Response(null, { status: 413 });
  const m = JSON.parse(raw), keys = SCHEMA[m.type]; if (!keys) return new Response(null, { status: 400 });
  const rec = Object.fromEntries(keys.map((k) => [k, m[k]]));   // + numeric/enum checks, metrics.length <= 5; append a transient object, compact nightly
  return new Response(null, { status: 204 });
};
```

---

## 8. In-domain sequencing

### 8.1 The one-week minimum safety net (7 d [E], quoted 6-9 for selector churn; needed before R0)
Six things that together would have blocked every critical the audit found (qa-ci 11.1):

| Day | Deliver | WP slice | Exit |
|---|---|---|---|
| D1 | private repo, `legacy/dist`, CI skeleton, four registries + `registry-expiry`, PR template, gitleaks | 01 (1.0) | `pnpm ci:static` green, seeded |
| D2 | site-lint, `undef-globals`, `asset-integrity`, DV ratchet seeded, `prod-probe` 6-hourly cron | 02 (1.0), 03 (0.5) | baseline scorecard prints; forced failure opens an issue |
| D3-D4 | Playwright config from `viewports.json`, base fixture, legacy driver on `w375-p`, `w375-l`, `w1440-d`; first-run protocol | 04 (1.5) | 4 states reached 20/20 |
| D4-D5 | `TAP` + `LAY` + `INP-01/02` red proofs (C1, C2, H1, input swallow); SW fresh-profile test red (C6) | 05 (1.0), 07 (0.5) | red proofs registered |
| D6 | `assert-lh` on saved JSONs + fresh run; `CLK-DATE` red (3 lint hits) | 06 (0.5), 09 (0.5) | G0 file (re-measured on the R0 candidate) |
| D7 | scorecard skeleton, selector-churn buffer, R0 acceptance skeleton | 23 (0.5) | README runs T1 locally |

### 8.2 Critical path (dates from the register; chapter 15 section 5.1 governs delivery)
*Calendar rule (review 3): the dates below are the register's floors and latest dates. Chapter 15 shows R0 shipping 2026-11-10 (30 h/week), 2026-12-15 (15 h/week) or 2027-01-19 (10 h/week), so the one-week net must still precede R0 but its "target 2026-10-14" moves with R0 (net finished at least one week before the R0 ship date); no gate date in this chapter is a promise.*
- **By 2026-10-07 (DG-0):** owner actions 1-12; QA needs the Netlify plan/credits, the GitHub plan, phones. **By 2026-10-14:** the one-week net. **10-14..19:** rest of WP-QA-07 (seeded profile, kill switch, rename drill) and the `release.yml`/`production` branch skeleton (WP-QA-16). **R0 <= 2026-10-21** only if its acceptance is green.
- **To R1 (2026-11-05):** WP-QA-08, 09 (date-only), 11 seeded, 16, and the WP-QA-10 subset for Tranche 0 (C1, C2, C3, C5, H1-H4, input swallow, `JMP-DATA`); every Tranche-0 patch merges only through the WP-QA-07 gate.
- **S-trains** (S1 <= 11-10, S2 <= 12-15, S3 <= 2027-01-26): redirect-matrix probes (WP-QA-03) and pre/post dashboards (WP-QA-17/18) first; performance, security and data releases stay 48 h clear of an S-train; the 14-day CSP report-only soak sits between trains. **P2:** WP-QA-12-15, 17, 18; budgets finalised after WP-DEC-01/02 (DG-2, 11-30); S3 flips `APP_PATH` to `/map`.
- **P3 (Feb-May):** WP-QA-19 layers on WP-ARCH-05..08 as soon as the hooks contract exists; WP-QA-20 follows Historian P1; WP-QA-21/22 before the `/next/` beta; cut-over 2027-05-15 (DG-4 04-30); freeze 06-25..07-05. **P4:** dossier after cut-over; public "A+" only after two consecutive weekly `full`-profile A+ runs, the Netlify 30-day window and the dossier.

---

## 9. Verification debt (verify first)

| Item | How to close | WP |
|---|---|---|
| All Playwright specs and the detector DOM half are unrun; `(pointer: coarse)` emulation, Mapbox restriction on `localhost`, `page.clock`, `weberror`, uBlock in headless, CDP scroll/pinch | first-run protocol (section 2), one script each | 04, 05, 08 |
| Referer injection honoured for `api.mapbox.com`; `blockedUrlPatterns` for Netlify RUM without a console error; `WEBGL_lose_context` recovery on mapbox-gl 3.24.1 | one run each, 20 cycles | 06, 08 |
| Preview commit-status name/`target_url`; `restore`/`unlock` API; previews injecting RUM; `pretty_urls=false` on the real deploy path; GitHub plan features and minutes (Free 2,000 / Pro 3,000 [S verifier]) | one test PR, one staging drill, WP-DEC-05, owner reads billing | 16, 03, 01, 25 |
| web-vitals 6.2.2 fields, `context.geo`, Blobs conditional write, rate-limit rules, `Sec-Fetch-Site` in Functions v2; do probes/smoke count in Netlify Analytics (edge-side)? | telemetry spike, two-week measurement | 17, 18 |
| Observatory CLI, PDF/UA checker; iOS 16 coverage and device-cloud price | trial / owner decision | 15, 02, 21 |
| 43 findings UNVERIFIABLE (25) or NOT_VERIFIED (18); Labs on real hardware (AR, Watch Together, export) | a "verify first" ticket each before scheduling (waivers with `review_by`); retire Labs per D-SCOPE-TIERS | 23, 21 |

---

## 10. Owner decisions (defaults apply unless overridden in writing)

| # | Decision | Default | By |
|---|---|---|---|
| 1 | GitHub plan | Pro (protected `production`, 3,000 min); or public repo after a clean gitleaks history scan; Free = convention-only enforcement | DG-0 |
| 2 | Real devices | buy one Galaxy A-class 4 GB; borrow/buy iPhone SE-class, iPad, 4 GB Chromebook | before R1 |
| 3 | Alert channel, quiet hours | GitHub issues + ntfy push; 22:00-07:00 ET silences `warn` only | WP-18 |
| 4 | Dossier budget and who | volunteers for (e); paid quotes for (a), (d) (cost UNVERIFIED) | DG-4 |
| 5 | Scorecard policy; ops ceiling | Tier 2 graded A, Labs non-blocking, `lab` profile before cut-over; 10 h/month | DG-2/3 |
| 6 | Preview protection; promotion cadence; soak cadence | `noindex` only (password = Pro); weekly batching, <= 4 promotions/month + hotfix reserve; soak weekly + every RC | DG-1 / before R0 |
| 7 | Visual-diff and changelog tools | Playwright built-in; ~50-line changelog script | DG-2 |
| 8 | Named historian reviewer + second reader | register D-HIST-REVIEW; unlocks `MAN-EXP` and WP-09 `clock` mode | DG-2/3 |

---

## 11. Risks and coverage gaps

**Top risks.** (1) The suite has never run in a browser: selector churn on legacy; selectors isolated, first-run protocol, hooks contract removes scraping for the rebuild. (2) A ~600-gate system can outgrow a solo owner: allowlist counts only fall, tier runtime gates fail slow suites, the ops ceiling is measured. (3) CI minutes ~2,250/month vs 2,000 Free. (4) False confidence: stub map != real tiles, consistency != historical truth, WebKit != iOS; mitigated by `@realmap`, WP-DEC-01 interception, RC devices, review logs. (5) No `deployment_status`: polling fallback. (6) RUM at ~113 views/day: per-template n >= 100 over 7 days; lab gates stay primary. (7) Detector false positives: self-test fixtures, expiring allowlist. (8) QA effort above the register's Tier-1 line (conflict 1). (9) Registries and exceptions harden into waivers: <= 90-day expiry, `registry-count`.

**Coverage gaps (not closable by automation).** Historical truth (review logs only); screen-reader behaviour and AT sign-off; iOS 16 floor and iOS specifics beyond the owner's device; Labs on real hardware; search-visibility KPI (tracked, not gated); legal sufficiency; browser share (no UA data: the floor is policy); the 43 unverified findings; Netlify plan/credit facts.

---

## Appendix A. Traceability coverage index (gate ids | tier | today)

Today: `R*` red, executed by a prototype; `R+` reproduced live in headless Chrome over raw CDP by a specialist (not Playwright, not a device); `R` red by audit/code; `G` green; `?` undetermined. Exact assertions: `qa-ci.md` section 10 (corrections applied here).

**Audit ids** (gates | first tier). C1 TAP, LAY.OFFSCREEN, MSH-01, INP-01 | T1 . C2 TAP, LAY.OCCLUDED, MSH-02 | T1 . C3 CLK-DATE, TM-V9, DV-08/09 | T1 . C4 CLK, DV-08/09/10, TM-V3/V5 | T1 . C5 UG-01, ANC, CON | T1 . C6 SWL, R0-ACC, SL-21/22, LH.redirects | T1 . C7 SUB-DASH, CON.debug-text, SL-20/31 | T2 . C8 AXE.contrast, TOK | T1.
H1 LAY.OVERLAP, NAV, z-scale lint | T1 . H2 KBD-ESC | T1 . H3 FST | T1 . H4 JMP, JMP-TOAST | T2 . H5 DV-18, SRC-SORT, ANC-SORT | T1 . H6 A11Y-ICON, LAY.TARGET | T1 . H7 SL-20, CON.debug-text, DV-17 | T1 . H8 CLAIM, HC-06/07/08/10/12 | T1 . H9 CLK-LABEL, TM-V9 | T1 . H10 DV-11/23, HLP-ABOUT | T1 . H11 MMP-01 | T2 . H12 DST | T2 . H13 WLK, DV-21 | T2.
D1 HLP-01 | T2 . D2 LAY.FONT/TARGET, A11Y-SLIDER, SL-03 | T1 . D3 JMP-FLY, LAB-COLL, JMP-DATA | T2 . D4 TBR-OOB | T1 . S1 SUB-REPORT | T2 . S2 SUB-GR | T2 . S3 SUB-CAM (GPU headed) | T3 . S4 LAY at 320-430 on dashboard/compare/ledger | T2.
P1 RUM, SLO | T5 . P2 BUD-size, LH.unused-js | T1 . P3 BUD-req | T2 . P4 SL-29, LH.render-blocking | T1 . P5 CON, SL-30 | T1 . P6 AI-03, LH.valid-source-maps | T1 . P7 LH-assert | T2 . T1 SEO-PROBE, GSC export | weekly . T2 HP-13, RUM bot flag | T5 . T3 HP-10/11, SL-16 | T2.
E1 SL-08/36 | T1 . E2 SL-27 | T1 . E3 SL-02 | T1 . E4 SL-28 | T2 . E5 SL-06, HP-12 | T1 . X1 KEY-01, SL-26 | T3 . X2 KEY-02 | quarterly . X3 HP-01..03, SL-11..14, CSP-COLLECT | T1 . X4 HP-06/07/13, EMB-01 | T2 . X5 SL-18/19, ORG-01, STO-01 | T1 . G1 DOC-01..07 | T1.
A1 AXE.contrast, TOK | T1 . A2 A11Y-SLIDER, LH.label | T1 . A3 LAY.TARGET | T1 . A4 LAY.FONT | T1 . A5 A11Y-NAME | T1 . A6 A11Y-DLG, SL-03, A11Y-RM | T1 . N1 AI-01..03, HP-15, DV-29, PAR, R0-ACC | T1/T4.
*Today:* `R+` C1 C2 D3; `R*` C3 C4 C5 C6 C7 H7 H9 H10 D2 P2 P4 P6 P7 T3 E1 E3 E5 X3 X4 X5 G1 A1 A2 N1; `G` T2; `?` H4 (toasts auto-dismiss at 4.5 s in code), H12 (not reproduced fresh), S3, T1, E2, E4, X1 (tiles 403, allow-list unverified), X2; all others `R`.

**New findings (NF)** (gates | tier). NF-01 mobile-02, app-latent-04, perf-runtime-01 (canvas swallows input): INP-01..03 | T1 . NF-02 mobile-01 (overlays in compact): MSH-03, LAY.OCCLUDED | T1 . NF-03 mobile-03 (panels under the mobile root): LAY.OCCLUDED on search/filter/story/event/unit states | T1 . NF-04 mobile-04 (dead tiles): MSH-02 | T1 . NF-05 app-bugs-03, app-latent-03 (`CanvasRenderer`): UG-01, AUD-01 | T1 . NF-06 app-latent-01 (`setGoldUnit`): UG-01, ANC | T1 . NF-07 perf-runtime-02 (monuments rAF): CON-IDLE | T1 . NF-08 app-bugs-05, ux-flows-01 (dead deep links): DLK | T2 . NF-09 app-bugs-06, app-latent-05 (day data): JMP-DATA | T2 . NF-10 app-latent-08 (sparse placements): DV-28, PAR-T1 | T1 . NF-11 pagesA-01 (sprite id collision): SL-31, SUB | T1 . NF-12 deploy-history-13 (corrupt OG): SL-09/10/34 | T1 . NF-13 hist-current-01 (Historian "undefined"): CON.debug-text, HC | T1 . NF-14 pages-C-46 (Watch Together XSS): XSS-WT or 404/410 | T1 . NF-15 app-time-*, time-facts-* (piecewise clock): TM-V1..21, CLK | T1 . NF-16 seo-growth-01 (GSC lapsed): SYN-06 | T5 . NF-17 infra-netlify-36..38 (privacy): ORG-01, STO-01, SL-18/19 | T2 . NF-18 D-CONTINUITY (no backups): OPS-02/03 | quarterly . NF-19 capacity: OPS-05 | monthly . NF-20 app-latent-17 (Esc leaves `pinnedUnitId`): KBD-ESC | T1 . NF-21 app-latent-02/10 (no boundary, loaders): FLT-01..06 | T2 . NF-22 app-latent-18 (hidden-tab leap): PLY-VIS | T2 . NF-23 canvas DPR, 300x150 trails (app-latent missed 2-3): VIS-CANVAS | T2 . NF-24 mobile map no `maxBounds`: MSH-04 | T2 . NF-25 app-latent-14 (wrong side, unresolved ids): DV-03 with `arm` | T1 . NF-26 batteries invisible to Historian (app-latent missed 1): SRC-BATTERY, HC-04 | T1 . NF-27 deploy-history-01 (same name, other bytes): AI-02, R0-ACC | T1 . NF-28 prov-recon-09 (attribution off): ATTR-01 | T2 . NF-29 infra-netlify MISSED-2 (blind CSP soak): SL-13, HP-02, CSP-COLLECT | T1 . NF-30 GPU loss: FLT-GPU | T2 . NF-31 in-app browsers: IAB-01 | T2 . NF-32 soak: SOK | weekly . NF-33 AZERTY/IME: KBD-CODE | T1 . NF-34 translate/forced-dark/blockers: HOST-01..03 | T3.
*Today:* `R+` NF-01..06, 09, 21, 23, 28; `R*` NF-05, 06, 10, 12, 15, 17, 25, 27, 29; `?` NF-16, 30, 31, 32, 34; all others `R`.
