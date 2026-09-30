# Gettysburg Interactive Map: A+ Master Plan (plan only, nothing built)

Prepared 2026-09-30. Inputs: the two Netlify zips, the earlier live-site audit, the two Netlify PDFs (RUM, Web Analytics), the tutorial PDF, older deploy zips and the reconstructed source in Downloads. 24 specialists produced 852 findings; an independent verifier re-checked each specialist; 15 chapter authors and 3 reviewers assembled the plan below.

## 1. What the two zips actually are

- `deploy-6aa16d61...zip` and `6aa16d60...-d9edb0ae...zip` (Netlify "source") are byte-identical: 119 files, same hashes. The only difference is that five `assets/*` filenames are lower-cased in the deploy zip. **Neither contains source code**: both hold the minified build plus `netlify.toml`.
- The deployed app is one minified Vite/React 18.3.1 bundle (`index-Cg8FAMXN.js`, 2.28 MB): 79% Mapbox GL 3.24.1, 6.5% React/zustand, 14% your code (about half of that is inline data). It has been byte-identical since Jul 29, and that filename has carried different bytes over time under a year-long immutable cache, which is a live stale-code trap.
- `C:\Users\mlege\Downloads\gettysburg-source-reconstructed` is a stale, partial React/Vite reconstruction (mapbox 2.x, no unit renderer or playback, mobile mode renders nothing). Use it as a parts quarry only. Older source trees also exist in Downloads (`gettysburg_COMPLETE_FIXED (1)/src`, 65 files, holds the missing gold-trail functions).
- The live deploy was created Sep 9; nothing has shipped since. The Sep 18 and 26 RUM spikes are not code.

## 2. The most important things the deep analysis changed

Corrections to my first audit (full list of 28 in `16-audit-corrections-and-new-findings.md`): the Mapbox tile token IS URL-restricted; the guide PDF is served as an attachment; the intro sweep is 3.5 s, not 15 s; toasts do auto-dismiss; the 9.0 s mobile LCP is a Lighthouse simulation (observed 287 ms) and the real LCP element is the app's own intro text; the FCP/INP/CLS "Poor" badges are outlier-driven; "467 regiments and batteries" is really 467 regiments plus 103 batteries.

New critical defects I missed (54 new findings in total):
1. The full-size unit canvas has `pointer-events:auto` and swallows map pan/zoom/touch on desktop and mobile.
2. On phones, desktop overlays are mounted over the mobile UI (real cause of C1/C2), and search/filter/story/event/unit panels render underneath it.
3. `CanvasRenderer`, `setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment` are undefined (sound toggle freezes playback; `?ancestor=` white-screens).
4. The app reads only `?ancestor=`; every other deep link from 9+ pages lands on tick 1.
5. Day 2/3 placement data loads only when playback crosses tick 200/420, so day jumps show empty or stale maps; placements are 1,804 keyframes on 188 of 675 ticks.
6. `site-nav.js` icon-sprite `<symbol id>` collisions break the dashboard chart, report/regiment search and the ledger clock.
7. Every og:image and manifest screenshot is one corrupt PNG (21 pages); Watch Together has stored XSS; Historian prints "undefined" for all 137 chronology answers.
8. The clock error is piecewise (mean 4.8 h off), not an offset: fixed by a 33-anchor time-warp, plus 27 content defects no clock fixes.

Corrected scorecard (chapter 16): desktop **C**, mobile **D** (audit said B- / C-).

## 3. The plan in one page

| Layer | Approach | Chapter |
|---|---|---|
| Source of truth | Tranche 0: scripted, assertion-guarded hot patches to the frozen bundle, shipped under new hashed filenames; in parallel a TypeScript strangler rebuild in a real git repo behind a parity harness; retire patches at cutover | 01, 02, 03 |
| Hard order | Archive zips, then R0 (service-worker kill switch, no reload, hashed names, boot-after-paint, intro deleted) BEFORE anything else | 01, 02 |
| Clock/accuracy | Piecewise time-warp through 33 anchors, one shared module, named historian sign-off, validators | 04, 13 |
| Performance to green | Boot contract (first paint independent of JS), Mapbox lazy behind a facade, one map on phones, data per day, first-party web-vitals beacon, per-route budgets | 05 |
| UX/UI both devices | One responsive shell, no entry gates, unified header + Ctrl/Cmd+K, design tokens, SVG icons, mobile dock/sheet spec | 06 |
| Accessibility | WCAG 2.2 AA everywhere; keyboard/screen-reader map (Data View, unit cursor); independent evaluation before claiming A+ | 07 |
| 27 static pages | Per-page specs incl. Watch Together relay, real 3DEP viewshed option, Labs keep/retire dispositions | 08a, 08b |
| Infra/security/legal | Enforcing CSP by staged rollout, key runbooks, SW redesign, merged privacy/terms + counsel review, backup/continuity, vendor exit triggers | 09 |
| SEO/growth | Verify GSC first, 28-day baseline, one identity change per 4-week train, programmatic pages gated by thin-content CI | 10 |
| Copy/docs | facts.json + features manifest + style guide + lint; guide PDF regenerated as tagged PDF/UA; missing trust pages | 11 |
| QA/CI | Red-first ratchet: every audit ID has an automated assertion; 24-viewport matrix; tappability/overlap detectors would have caught C1/C2 | 12 |
| Data quality | Provenance, ID crosswalk, casualty authority, rights retro-audit, placement densification | 13 |
| **Ask the Historian** | Design A: static hybrid retrieval (entity + facts tier, sharded BM25, page-cited verbatim quotes, honest refusals), $0 per query, zero first-paint bytes; optional on-device semantic layer and optional LLM tier only behind gate G-X | 14 |

**Historian expansion in numbers:** 658 records / 11,088 indexed words / 0 citations today, to about 22-27k passages / 4.4-5.4 million words (about 400-540x) by end of phase 4, 957+ entity cards, 9 fact tables, a 137-event time-evidence table; index 2.4-3.1 MB brotli, lazily loaded. Source order: Official Records Vol. 27 (public domain, clean scans, 589 reports) first, then NY/PA/ME/NJ/MI/MN state commission reports plus Fox casualty facts, Battles & Leaders vol. 3, Southern Historical Society Papers, memoirs (perspective-tagged), regiment histories, civilians/press; rosters via NPS CWSS only after written NPS confirmation. American Battlefield Trust, Ancestry/Fold3, Find a Grave, HMDB bulk, Stone Sentinels are link-out only. A 150-question golden set with gates is built and baselines recorded.

## 4. The honest number that matters most

The complete programme is **729-1,236 AI-assisted person-days (P50 982)** after de-duplicating 447 work packages into 98 nodes. Capacity is the binding constraint:

| Path | Days (AI-assisted) | What you get |
|---|---|---|
| S Survival | 22-39 | R0 plus the criticals: pan/zoom, mobile controls, dates, deep links, privacy, contact |
| Tranche 0 complete | about 76 P50 | About B desktop / B- mobile (chapter 02 forecast) |
| L Legacy A-line | 173-302 | No critical defects, CWV green, Tier-1 usable on phones, Historian phase 1 |
| A Grade-A path | 434-738 | Adds the rebuild to cutover |
| F Full A+ | 553-939 | Tier 1 at A+, Tier 2 at A, independent proof |

At 15 h/week the legacy A-line lands about mid-2029; at 30 h/week about Jan 2028 and full A+ about Oct 2030. The register's early dates hold at no capacity. Recommendation (chapter 15): sign a capacity contract by 2026-10-07, do S then Tranche 0, and do not claim "A+" until the evidence dossier exists. The official RUM "green" lags 30 days behind the last performance deploy.

## 5. Read in this order

1. `01-decision-register.md` (34 decisions, 11 need your answer; **Top-12 owner actions for the next 7 days**)
2. `15-integrated-roadmap.md` (+ `15-roadmap.json`): schedule, capacity, cut list, first 30 days
3. `02-tranche0-hotfix-runbook.md`: the emergency fix sequence
4. `16-audit-corrections-and-new-findings.md`: what I got wrong, 54 new findings, 57-ID traceability
5. Domain chapters `03`-`14` as needed

Deep-dive evidence: `plan-work/*.md` (24 specialist reports), `plan-work/merged/*.json` (852 findings with verdicts), `plan-work/all-findings-index.csv`, `plan-work/hist-golden-set.json`, `time-facts-*.csv`, tested scratch scripts under `plan-work/tmp-*`.

## 6. Limits you should know

- Nothing was built or deployed. The Tranche 0 patch scripts (119 asserted bundle edits) were verified only on scratch copies in headless Chrome; real iOS/Android devices, Safari, Firefox and real Mapbox tiles were not available.
- The 33 time anchors are proposals: 5 need a historian's decision (t75, t90, t248, t275, t538). Sources for 10 rows are search-summary or literature recall.
- 25 findings are UNVERIFIABLE and 18 NOT_VERIFIED; chapter 15 lists what test resolves each.
- Effort figures are estimates nobody has run. Legal points (privacy, licensing, COPPA) need counsel.
- Unresolved contradictions between chapters are logged in each chapter's "Decision conflicts" section; the biggest are R0 scope, home-page title vs the time-warp, and layout breakpoint 820 vs 834 px.
