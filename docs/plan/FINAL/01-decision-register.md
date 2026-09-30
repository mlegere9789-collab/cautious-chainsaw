# 01 - Decision Register (34 ADRs) for gettysburginteractivemap.com

Status: PROPOSED DEFAULTS, 2026-09-30. Nothing has been built or deployed.
**Binding rule:** every other chapter cites the ADR id (D-XXX) its work packages depend on; a chapter needing a different answer says so in its own "Decision conflicts" section, never silently.

Evidence tags: [V] re-verified by me (grep of bundle.pretty.js, DEPLOY_DIR, Downloads); [S id] stated or corrected by a specialist or verifier; [E] estimate or my aggregation; [U] unverified. Effort: S<0.5 d, M 0.5-2, L 2-5, XL >5. Line numbers are bundle.pretty.js.
ADR fields: question, options, DEFAULT, evidence, decide-by (heading), owner provides (if omitted: only accept or override), what it blocks (section 3 and Trace lines). Class **B** = blocking, needs an explicit owner answer; **D** = default in force at its gate unless overridden in writing (edit section 10).
Gates (latest decision dates): **DG-0** 2026-10-07 . **DG-1** 2026-10-21 (before R0/R1 ship) . **DG-2** 2026-11-30 (spike readouts) . **DG-3** 2027-01-31 (before rebuild core, Historian P2) . **DG-4** 2027-04-30 (before cutover; hard stop is the 2027-06-25..07-05 anniversary freeze) . **DG-5** after 2027-07-06.

---

## 1. Why this register is the critical path

1. **Capacity is the binding constraint.** Seven specialist roll-ups sum to about 385-445 person-days gross (prov-recon-41 38-50; hist-final-plan 49-76; seo-growth 77.5; app-a11y about 50; infra-netlify 35-45; docs-copy 42-45; pages-C 95-100) [S critic-2]; ux-flows (about 62) and qa-ci (about 26) add to that before de-duplication. D-SCOPE-TIERS is decision zero.
2. **No editable source exists**, `/assets/*` is immutable and the SW is cache-first; the name `index-Cg8FAMXN.js` has carried 45 distinct byte streams across 86 zips [S deploy-history-01]. D-SOURCE and D-ORDER define the only safe path.
3. **Report contradictions** gate CI, SEO and boot: resolved in section 7. **Some defaults need numbers nobody has** (boot under real Mapbox tiles: replica runs 403 on tiles, so 94-100 mobile projections are upper bounds [S perf-cwv MISSED-06]; map-engine bytes; renderer fps on a real phone): spikes with pass/fail gates (section 6).
4. **The historical A+ cannot be self-certified** by the owner or the AI toolchain: D-HIST-REVIEW and D-TIME make a named human a dependency with a labelled fallback.
5. **New-domain SEO** (registered 2026-06-13, expires 2027-06-13 [S seo-growth G1]) has no baseline because Search Console ownership lapsed; identity-level SEO changes are serialised (section 4.2).

---

## 2. Top 12 owner actions in the next 7 days (by 2026-10-07)

| # | Action | Min | Why now (evidence) | Unblocks |
|---|---|---|---|---|
| 1 | **Archive every gettysburg zip** (126 gettysburg zips [S prov-recon-02] of 189 in Downloads [V]; 86 hold `index-Cg8FAMXN.js`) to cold storage outside any repo; record sha256 of the Netlify "source" zip and live deploy zip; never redeploy the downloaded "deploy" zip; four source folders hold `.env.local` (revoked token #1): never commit them | 60 | [S prov-recon-02, infra-netlify] lower-cased names are hygiene only (Netlify is case-insensitive); caches key on exact case | D-ORDER, D-SOURCE |
| 2 | **Verify Search Console and Bing via DNS TXT** (Netlify DNS); also re-add the 52-byte `google0dca4879c9657741.html` (still in Downloads [V]) to recover any old property; export baselines and start the 28-day clock | 45 | [S seo-growth-01] file existed only in deploy B; no TXT records today | D-URL/NAME/ROOT timing |
| 3 | **Mapbox token review**: screenshot URL allow-list (should be exactly `gettysburginteractivemap.com`; never add `netlify.app` to it) and scopes; create a `localhost` dev token and a low-value preview token; enable usage notifications; look for a spend cap | 30 | X1 corrected: tiles 403 off-domain, styles 200 [S infra-netlify-18, mobile-20, pagesA-38]; dev/preview builds show blank maps | D-MAP-ENGINE, D-CI-HOST |
| 4 | **Google Cloud key**: restrict Maps Embed key by referrer (apex+www) and to the Maps Embed API; USD 1 budget alert; screenshot enabled APIs | 20 | key at 110610; restriction unverifiable from outside [S infra-netlify-19] | D-LEGAL |
| 5 | **Netlify plan and credits**: record tier, balance, this month's production deploys; alert at 70%; stop ad-hoc redeploys until R0 | 15 | 15 credits per production deploy, Free = 300 credits hard pause [S infra-netlify-30] (plan UNVERIFIED) | D-CI-HOST, D-ORDER |
| 6 | **Accounts and domain**: passkeys/2FA on mailbox, Netlify, Mapbox, Google Cloud, Name.com, GitHub; move recovery off the public contact Gmail; renew the domain multi-year with auto-renew; name a delegate; confirm TLS renewal (cert expires 2026-11-10) | 60 | [S infra-netlify-33/34/39, seo-growth-07] the public Gmail is likely every account's recovery identity | D-CONTINUITY, D-CONTACT |
| 7 | **State capacity**: hours per week and target dates for the A-line and A+ line; confirm Tier 1/2/3 and the Labs defaults | 30 | gross effort 385-445 d [S critic-2] | everything |
| 8 | **Name a historical reviewer and second reader**; send the three drafted, unsent permission emails (NPS CWSS, Gettysburg NMP Research Center, ACHS/Musselman) | 90 | [S hist-final-plan 0.2 #3/#7; time-facts-05] they take weeks | D-TIME, D-HIST-REVIEW, D-CWSS |
| 9 | **Four quick calls**: sound (default remove), dead H heatmap (default delete), "What They Could See" (default rename High Ground), Labs list (AR, Watch Together, Cinematic Export, Sandbox default retire) | 20 | sound toggle freezes playback: `CanvasRenderer` undefined at 96556 [V]; RECON PENDING.md: "no audio wanted" | D-SOUND/HEATMAP/VIEWSHED, T0 content |
| 10 | **Answer rights questions**: (a) four data notes cite a "Gettysburg Animated YouTube vignette" (e.g. `terrain.json:38`, `chronology_day1.json:31`): did positions or texts come from the paid app or that channel? (b) Busey and Martin as facts-only with attribution? (c) is "not affiliated with the NPS or ABT" true? (d) any registered mark? | 30 | [S seo-growth Q2/Q3/MISSED-5, ux-flows Q6, hist-final-plan risk 1] | D-LICENSE, D-LEGAL, D-NAME |
| 11 | **Approve the name** "Gettysburg Interactive Map" (execution in train S2) and the contact plan (role addresses; Gmail stays private) | 15 | E2; competitors own the exact "animated" phrase [S seo-growth-04] | D-NAME, D-CONTACT |
| 12 | **Two real-hardware checks**: (a) drag and scroll-zoom the live map in a headed desktop browser (headless says 0 events reach Mapbox; if real input fails it outranks C1); (b) block `/.netlify/scripts/rum` in your test profile before any Lighthouse run | 20 | [S mobile-02, perf-runtime-01, app-latent-04; infra-netlify-32] | T0 priority, clean RUM |

Do NOT this week: change any URL form, name or title tag; delete stale Netlify deploys before the archive exists; make an OG image from a screenshot (bakes in C1/C3 [S seo MISSED-7]); start rebuild code.

---

## 3. Decision index

| ID | Default | Cls | By | Blocks |
|---|---|---|---|---|
| D-SCOPE-TIERS | 3 tiers; Labs ship-or-retire; owner states hours | B | DG-0 | all scheduling |
| D-SOURCE | Closed Tranche 0 + strangler rebuild | D | DG-0 | all app WPs |
| D-ORDER | archive -> R0 -> everything else | D | DG-0 | every deploy |
| D-CI-HOST | GitHub + Actions + Netlify Git deploy | D | DG-0/2 | CI, previews |
| D-CONTINUITY | Backups, delegate, vendor triggers, ops ceiling | B | DG-2 | ops, trust |
| D-EVIDENCE | Scorecard plus non-author artefacts | D | DG-4 | public A+ claim |
| D-MAP-ENGINE | Mapbox v3 lazy behind a facade; spike | D | DG-2 | budgets, boot |
| D-UNIT-RENDER | Owned cheap canvas; layers only if gate fails | D | DG-2 | renderer WPs |
| D-SHELL | One responsive shell, z-scale | D | DG-2 | mobile, a11y |
| D-SITEGEN | Astro static | D | DG-2 | sub-pages, CSP |
| D-SW | Minimal SW, no precache/reload, kill switch | D | DG-1 | R0 |
| D-CSP | Hash CSP by class, `/map` last; maps `noindex` | D | DG-2 | security A+, BP |
| D-BROWSERS | Last 2 majors, iOS 16+, Text-route fallback | D | DG-2 | build config |
| D-DESIGN | Dark-only UI, Spectral | D | DG-3 | tokens |
| D-URL | Extensionless, forced 301s | D | DG-0 (S1) | S1, CI, headers |
| D-URLSTATE | ux-flows 5.6 params, `dv` stamp | D | DG-1 | deep links |
| D-ROOT | `/` landing, app `/map` | D | DG-2 (S3) | S3, PWA |
| D-NAME | Gettysburg Interactive Map | B | DG-0 (S2) | S2, copy |
| D-NETLIFY-DOMAIN | 301 netlify.app; delete stale deploys | D | DG-1 | hygiene |
| D-ENTRY | No gates; intent poster; boot after paint | D | DG-2 | LCP, UX, a11y |
| D-LANG | English-only; `translate="no"` on stage | D | DG-1 | React stability |
| D-TIME | Time-warp, 33 anchors, historian signs 5 | B | DG-3 | C3/C4, Historian, hour pages |
| D-HIST-REVIEW | Named reviewer, labelled fallback | B | DG-2 | data A+, Historian P4 |
| D-HIST-ARCH | Design A; B/C off behind G-X | D | DG-1 | Historian |
| D-CWSS | Link-out only | B | DG-5 | ancestor lookup |
| D-LICENSE | No open data licence yet | B | DG-3 | Terms, dataset |
| D-SOUND | Remove in-app sound | B | DG-0 | T0 patch B |
| D-HEATMAP | Delete dead heatmap | B | DG-0 | T0, guide |
| D-VIEWSHED | Rename High Ground | D | DG-3 | viewshed page |
| D-SCHOOLS | Filter submissions, Classroom mode | D | DG-3 | Tier 2 |
| D-TELEMETRY | One first-party collector | D | DG-1 | RUM, CSP reports |
| D-LEGAL | Interim privacy now; counsel later | B | DG-1/3 | telemetry, licence |
| D-MEDIA | Own or public-domain basemap only | D | DG-1 | OG, export |
| D-CONTACT | Role addresses; no null-MX | B | DG-1 | corrections, security.txt |

---

## 4. Ordering rules (they bind every schedule)

**4.1 Hard chain (D-ORDER).** `S0 archive + baseline of record -> R0 mechanism release (hashed names + SW without reload + kill switch) -> R1.. everything else, each under a NEW hashed name`. Safe in parallel before R0: GSC/Bing verification, key restrictions, spikes, specs, outreach. Anything that ships bytes waits for R0.

**4.2 Identity-level SEO trains.** At most one per train, >= 4 weeks apart, each with the redirect-matrix test, pre/post dashboards, release annotations and a versioned redirect map. Performance, security, a11y and data-correctness releases are not identity changes but stay 48 h clear of an S-train. [S critic-2]

| Train | Content | Not before | Latest | Precondition |
|---|---|---|---|---|
| R0 | Mechanism release + HTML-only perf | S0 done | 2026-10-21 | plan/credits known |
| R1 | Tranche 0 patches, moments v0, interim privacy | R0 + 3 d | 2026-11-05 | R0 acceptance green |
| S1 | Canonical form, host 301, sitemap index + lastmod, valid OG, twitter tags | 28 days after GSC verify (about 2026-11-01) | 2026-11-10 | baseline archived; redirect matrix green |
| S2 | Product name, titles | S1 + 4 w | 2026-12-15 | S1 stable |
| S3 | `/` landing + `/map` (legacy app moves) | S2 + 4 w | 2027-01-26 | boot spike done; forwarder tested |
| S4 | Programmatic pages, staged | S3 + 4 w | 2027-02..04 | thin-content gate; D-TIME signed before any hour page |
| C | Rebuild cutover at `/map`; legacy to `/classic/` 60 days | parity gates | 2027-05-15 | no S-train within 4 w |

Owner may combine S1+S2 (both metadata) at the cost of unattributable movement; record as an amendment.
**4.3 Freeze:** no production promotion 2026-11-15..20, 2027-06-25..07-05, 2027-11-15..20 or Fridays after 12:00 ET; rollback exempt [S qa-ci 4.8].

---

## 5. The ADRs

### A. Programme, source and process

#### D-SCOPE-TIERS - What must reach A+, what is stretch, what is retired (B, DG-0; Labs final DG-3/DG-4)

**Question.** With one solo owner, which surfaces must reach A+ on desktop and mobile?
**Options.** (1) Everything to A+: not credible. (2) Tier model with dated Labs dispositions (default). (3) Defect-fixing only: leaves surfaces at B/C.
**DEFAULT.**
- **Tier 1 (A+ desktop and mobile):** `/` landing, `/map` app and its Text/Chronicle route, Search, Ask the Historian, Dashboard, Report and Regiment, Privacy, Terms, trust pages (About, Sources, Corrections, Accessibility, Contact), 404, embed.
- **Tier 2 (A, A+ where shared templates make it free):** Documentary, Turning Points, Find Ancestor, Aftermath, Education (folds into `/learn`), Living Ledger, Compare, Camera, Ground Remembers, user guide.
- **Tier 3 Labs:** dated ship-or-retire; a beta badge does not remove defects. Retire = 301 to a parent or 410, removed from nav, sitemap, guide and code, logged in `docs/retired.md`.

| Labs | Default | Decisive evidence | Keep only if |
|---|---|---|---|
| AR | hide now (noindex), retire at DG-4 | iOS permission gesture lost, relative alpha used as compass, stream/GPS leaks, 22 of 30 labels stacked [S pages-C-34]; needs on-site test | >= 8 d funded + on-site test by DG-3 |
| Watch Together | retire; fragment tours (`#tour=`) instead | stored XSS `watch-together.html:172`, guessable rooms, undisclosed PeerJS/STUN/TURN, minors [S infra-netlify-07, pages-C-46/47] | owned relay funded |
| Cinematic Export | retire unless rebuilt on own basemap | throws on Safari < 18.4; attribution not in video; claims narration [S pages-C] | D-MEDIA rebuild funded |
| Sandbox | decide DG-3, default retire | mouse-only drag, labels contradict data [S pagesB] | drag and labels fixed |
| What They Could See | rename High Ground | D-VIEWSHED | n/a |
| Immersive / sound | D-SOUND | no limiter [S pages-C-26] | limiter+mute+pause fixed |
| diagnostics, unit-rendering-reference | remove from publish tree | still 200 today; force-404 matches only `.html` [S infra-netlify-12] | never |

**Capacity contract.** Owner states hours/week H and date T; rule: de-duplicated effort <= H x weeks x 0.7; WIP limit 2; every WP carries a Tier tag. Planning envelope [E, my aggregation; the master-schedule chapter must re-total]: Tier 1 about 145-210 person-days (T0/R0/R1 8-12, foundations 14-18, rebuild 26-33, Tier-1 pages 8-12, time+data 9-16, Historian P0-P2 27-40, SEO 15-25, a11y 8-12, infra/legal 12-18, docs 6-10, QA 10-14). At 15 h/week (1.9 d/wk) 75-110 weeks; 30 h/week 38-56; 40 h/week 29-42. **A-line** = no critical/high defects, CWV green, Tier 1 usable on phones (Tranche 0, R0/R1, landing, Historian P1); **A+ line** = cutover and scorecard all A+.
**Owner provides.** H, T, Labs rows, any second contributor. **Consequences.** Tier-3 WPs unscheduled until disposition; sitemap and nav drop retired pages. **Trace.** critic-2 capacity/Labs; prov-recon-41; hist-final-plan 9; pages-C-26/34/46/47.

#### D-SOURCE - Source of truth for the app (D, DG-0)

**Question.** No editable source exists for the deployed bundle (md5 7ef75b95f4, 2,280,438 B, frozen since Jul 29). How do fixes ship and how does a maintainable app return?
**Options.** (A) patch forever: ceiling B/B+ (weighted 1.9 [S prov-recon 6.2]). (B) finish RECON_SRC: its OOB loader yields 0 vs 705 real entries, no renderer, mobile renders nothing (2.9). (C) TypeScript strangler rebuild using the deployed app region (about 17k readable lines) as executable spec (4.3). (D) AST split/recovery [S bundle-anatomy-21]. (E) port patches onto an older tree.
**DEFAULT.** **C plus a closed A ("Tranche 0")** [S critic-2]:
1. One patch runner. Each patch: exact-string anchor asserted to match once, idempotent, red-first Playwright test, emits a NEW hashed filename and rewrites `index.html`, `sw.js` precache and lazy-chunk import specifiers (`HelpModal`, `BookmarkPanel`; hash chunks, then entry, then html/sw [S deploy-history-01]), refuses re-run. Deleted the day the new build serves `/map`.
2. **Closed list**: SW/reload/hash (D-ORDER); desktop overlays gated on `Zn !== "mobile"` and panels re-homed under the mobile root (C1/C2; app-mobile HF-1/2; the `playRow` patch hits the wrong element [S prov-recon-40]); overlay-canvas pointer events and mobile tap NaN (mobile-02); date +2 at 97428, 100842, 101006 (C3 [V]); gold trail (C5: port the 45-line `GoldTrailEngine.js` [V]); sound removal; deep-link parse + `ensureDay` shipped with `moments.json` v0 (D-URLSTATE); Day 2/3 load on jump (app-bugs J1-J4); intro deletion and layout persistence; a11y bridge (18 FIND strings [S app-a11y-02]); minimap subscription (H11); attribution on 2 maps (102988, 110777 [V]); 64-row copy table [S docs-copy-32]. Anything else needs an ADR amendment.
3. Five validated packs merge into ONE de-conflicted runner: `tmp-app-bugs/tranche0-validate.js` (24 patches), `tmp-app-mobile/apply_patches.py` (67 edits), `tmp-app-a11y/bundle.bridge.mjs`, `tmp-docs-copy/copy_patch_table.json` (64 rows), `tmp-perf-runtime/edit_patch.py` (app-bugs F overlaps app-mobile HF-1).
4. Anchor-based clock wiring is a bridge patch only after D-TIME sign-off and only if cutover is > 3 months away; until then T0 ships the date fix alone.
5. **Quarries (read-only, outside git):** RECON_SRC (salvage list in [S prov-recon 6.3]); `Downloads/gettysburg_COMPLETE_FIXED (1)/src` (65 files, mapbox ^3.2.0; `GoldTrailEngine`, `SoundEngine`, `CanvasRenderer`, `HeatmapLayer`, `Interpolator` [V]); `FIXED_v25`/`FINAL_v24` (`validate_data.py`, `ci.yml`) [S]; `plan-work/tmp-prov-recon/*.json`. gitleaks before importing anything.
6. **Repo:** private GitHub; archives outside git with `ARCHIVE_MANIFEST.tsv`; `publish` never `"."` once source exists (would expose `src/`, config, a token [S prov-recon T-03]); `monuments.json` collision renamed (T-04).
7. **Cutover:** new app at `/next/` (noindex, no SW) as opt-in beta with a "Classic version" link; at cutover it replaces `/map` and legacy moves to `/classic/` (noindex) for 60 days; kill switches in `no-cache` `/flags.json`. Netlify Split Testing is unavailable (not addable to new projects since 2026-08-26, never left Beta [S prov-recon-39 verifier, re-check]) and would set a cookie against the privacy claim [S qa-ci 4.9]. Rollback = "Publish deploy" (atomic). A phase slip > 20% triggers scope review: defer mobile-only polish, never the harness or a11y primitives [S prov-recon-41].
**Effort.** 38-50 AI-assisted days including parallel sub-pages (65 unassisted); T0 consolidation 2-3 d; Phase 0 1.5 d. **Owner provides.** Confirm C; confirm md5 7ef75b95f4 is authoritative (not the v36/v37 lineage [S prov-recon Q2]). **Trace.** N1, C1-C8, H11; prov-recon-01/02/03/05/06/07/39/40/44; deploy-history-15; bundle-anatomy-21; app-bugs-01; app-mobile-21; app-a11y-02.

#### D-ORDER - The hard dependency chain (D, DG-0)

**Evidence.** `/assets/*` immutable 1 year; `sw.js` cache-first, precaches 2 of 5 hashed names, caches 404/500 [S infra-netlify-21]; `index.html:263-268` `controllerchange -> location.reload()` doubles every first load (`redirects` 9,066 ms) and Mapbox sessions (two `sku`, mobile run) [S perf-cwv-01]; a stale lazy chunk re-runs `createRoot` and remounts the old app [S app-a11y-02]; fixing the reload alone drops lab mobile 64 to 51 [S perf-cwv-01/02].
**DEFAULT.** The chain of 4.1 with R0 as ONE atomic deploy:
- **S0:** archive; commit the Netlify "source" zip tree as `legacy/dist` and prove a Git deploy byte-identical; record plan/credits; batch deploys weekly.
- **R0:** (a) content-hash every changed asset incl. both lazy chunks and specifiers, delete orphan `InterpolationWorker-*.js`; (b) new `sw.js`: no `skipWaiting`, no reload, `res.ok`-only caching, never intercept navigations, purge only `gbg-*`, bypass `/hx/`, `/api/`, `/.netlify/`, plus a tested kill-switch build (deletes `gbg-*`, unregisters); (c) `index.html`: replace lines 255-277 with idle registration, boot-after-first-paint loader with a once-per-session guard and visible retry (bare `.catch(reload)` can loop [S perf-cwv-02 verifier]), drop entrance animations (`index.html:99`, `site-nav.css:12`), plain stylesheet, keep only the `api.mapbox.com` preconnect, defer `site-nav.js`. (b) and (c) ship together.
- **R0 acceptance (Playwright, qa-ci-08):** fresh profile: one Document request, controller set without navigation, one style request (one `sku`); a profile seeded with the Sep-29 bundle and old SW gets new bytes on next navigation, zero console errors, Help/Bookmarks open without remounting the old app; rename drill; kill-switch drill.
- Afterwards: never reuse a filename for other bytes (CI compares with the last production `asset-manifest.json`); data under new hashed names (`/data/*` is `max-age=3600`).
**Hazards:** same name with different bytes; a SW that calls `skipWaiting` on a `CACHE_NAME` bump reloads every returning user's old pages once [S app-bugs M7], so R0's SW must not; SW caching errors; 15 credits per deploy; previews/localhost 403 tiles without their own token; `publish="."`; a manifest `id` change re-identifies installed PWAs (D-ROOT).
**Owner provides.** Plan/credit facts (action 5). **Trace.** C6, P1, P5, N1; bundle-anatomy-01/02/03/05/27; deploy-history-01/02/03; perf-cwv-01/02/22; infra-netlify-21/22; prov-recon-05/17/40; qa-ci-08.

#### D-CI-HOST - Repo, CI and deploy host (D, DG-0 repo / DG-2 pipeline)

**Options.** (1) Private GitHub + Actions gates + Netlify Git builds [S qa-ci-19, infra-netlify-28]. (2) Netlify plugins only: `@netlify/plugin-lighthouse` is post-deploy and non-gating unless it serves the build on localhost, where the production token 403s [S infra-netlify-29 verifier]. (3) GitLab CI.
**DEFAULT.** (1): `main` = staging branch deploy, `production` fast-forwarded from a tested SHA by manual `release.yml`; Deploy Previews per PR (non-metered per the credit table [S qa-ci 4.2], verify) with the preview token and `X-Robots-Tag: noindex`; `_headers`/`_redirects` generated, one rule per header name (Netlify cannot unset inherited headers [S infra-netlify-02]); Functions via CLI/Git; drag-and-drop retired. Private-repo Actions minutes unverified: fall back to Chromium daily, WebKit/Firefox twice weekly. Second remote from day one. **Owner provides.** GitHub plan, Netlify plan, alert channel. **Trace.** N1, P6, P7; qa-ci-01/19; infra-netlify-28/29/30; prov-recon-38.

#### D-CONTINUITY - Backups, delegate, vendors, ops ceiling (B, DG-2)

**DEFAULT.** (1) 3-2-1: private repo + second remote + monthly encrypted bundle; large artefacts (OCR cache about 75 MB, golden sets) via git-lfs or hashed archive. (2) Secret-free `ops/inventory.yaml` (Netlify, env-var names, DNS, registrar, Mapbox/Google restrictions, GSC/Bing owners); secrets in a password manager with a named delegate. (3) Quarterly restore drill: empty machine to fresh Netlify site <= 2 h. (4) Static "lite" snapshot for a second host (RTO <= 4 h), continuity letter, sunset plan. (6) **Vendor triggers:** Mapbox > 35k map loads/month (70% of free tier; upper bound today about 3.4k [S infra-netlify-18]) or a price/ToS change -> D-MAP-ENGINE escape (no hard spend cap documented [U]); Netlify credits 70%; domain/TLS alerts at 90/30/7 days; any LLM tier behind a kill switch. (7) **Ops ceiling** <= 10 h/month excluding content; maintenance mode pauses outreach and new content, never security, renewals or corrections; Renovate patch auto-merge only when CI is green, Mapbox minors quarterly behind the parity harness; AI-assisted code contract: dependency budget in CI, ADR per non-obvious choice, runbooks the owner can run in 30 minutes without an AI session.
**Owner provides.** Delegate, second remote, ceiling. **Trace.** critic-2 backup/ops/vendor; infra-netlify-33/34/39; seo-growth-07.

#### D-EVIDENCE - How an A+ claim is earned (D, DG-4)

**DEFAULT.** The machine-computed scorecard decides (qa-ci 9: 13 categories x desktop/mobile, missing result = failed, category with < 6 gates capped A-). No public "A+" until every category is A+ on both device classes AND cites a non-author artefact: (a) independent accessibility evaluation of 6 flows (until then "partially conforms"); (b) real mid-range Android and iPhone SE runs; (c) Observatory/securityheaders plus outside CSP review; (d) professional UX critique; (e) 8-10 user sessions and 100+ Historian questions written by others. **Green** = Netlify RUM p75 over its 30-day window (expect a month of lag) for the official claim; first-party per-template p75 (landing, `/map` desktop, `/map` mobile, content, tools) over 7 days with n >= 100 for feedback, since about 113 views/day cannot reach n >= 200 per URL [S critic-2]. If `/map` mobile stays < 95 with real tiles, record the measured ceiling as an exception; do not hide the boot from the trace. **Owner provides.** Evaluation budget (cost unverified). **Trace.** critic-2 verification/green gaps; qa-ci-23; app-a11y-33/34; ux-flows-22.

### B. Architecture

#### D-MAP-ENGINE - Map engine, Mapbox cost and terms (D, DG-2)

| Option | Raw / br | Licence, cost | Verdict |
|---|---|---|---|
| O1 mapbox-gl 3.24.1 (WebGL2 mandatory) | 1.80 MB / about 435 KB | Mapbox ToS; 50k loads free, then USD 5/1k | default, made lazy |
| O2 mapbox-gl 2.15.0 | 986 KB (-45%) | same; 2.x maintenance unverified | spike |
| O3 MapLibre 5.6.0 + raster | 939 KB (-48%) | BSD-3; Mapbox Raster Tiles (750k free, USD 0.25/1k) use outside its SDK unverified, or own tiles | spike |
| O4 Leaflet 1.9.4 + raster | 148 KB (about 35 KB br) | BSD-2; no GL labels/heatmap/terrain | 4 basic sub-pages only |
| O5 own PMTiles from USGS NAIP | z<=16 about 55-80 MB; z<=17 about 210-320 MB | public domain; hosting only; L-XL | escape hatch |
[S bundle-anatomy sec.5, prices as read 2026-09-29/30.]
**DEFAULT.** O1 lazy and pinned behind a 6-method facade (`create, flyTo, project, unproject, setGeoJSON, destroy`); the app uses about five Mapbox APIs and draws units itself. WP-DEC-02 (1-2 d) measures O1/O2/O3 on 6 views with real tiles (production Referer injected); adopt an alternative only if >= 30% smaller (brotli) with visual parity. Regardless: one map per session (mobile builds a second after tearing down the first [S perf-cwv-10 verifier]), `workerCount=1` on phones, attribution on every instance (off at 102988, 110777 [V]), visible error state on 401/403 tiles with a network-free fallback style, bots and headless sessions get a poster (cost breaker). Sub-page maps: 8 pages load a second parser-blocking 1.8 MB CDN copy (FCP 3.3-5.5 s); default = click-or-idle activation over an own-data SVG poster; GL only for Compare, Cinematic Export and the ground-remembers heatmap [S bundle-anatomy-16 correction].
**Owner provides.** Mapbox dashboard evidence; read the Product Terms of 2026-07-21 (caching, static images, terrain; unread by specialists). **Trace.** P2, P6, X1, S2; bundle-anatomy-07/16/17/18/19; prov-recon-10/19; infra-netlify-18/20/23; pagesB-02/40; perf-cwv-09/20/23/24.

#### D-UNIT-RENDER - Owned canvas or Mapbox symbol layers (D, DG-2)

**Evidence.** Draw cost is small (`lS` 0.5 ms/frame); 8x fps is limited by blur/blend and per-frame `getBoundingClientRect`: with valid tiles 13.6 fps base, 31.1 skipping `lS`, 19.6 without blur/blend, 57.9 both [S perf-runtime-10 correction]. Symbol layers with `icon-allow-overlap:false` hide colliding units, breaking parity [S prov-recon-12 correction]; `updateData` at 478 features x 15 Hz is unbenchmarked. A canvas is engine-agnostic (keeps D-MAP-ENGINE reversible).
**DEFAULT.** Pure keyframe engine first (typed arrays, `stateAt(tickFloat)`, no global accumulator `i2`, explicit carry-forward rule needing owner sign-off since it changes today's visibility), behind a `UnitRenderer` interface. R1 = owned Canvas2D: `min(dpr,2)` backing store, sprites, no `shadowBlur`, spatial-hash labels, 30 fps cap on coarse pointers, `pointer-events:none` with map-level picking. R2 = symbol layers only if WP-DEC-03 shows R1 cannot hold p95 >= 30 fps at 8x under 4x CPU on a real mid-range Android. **Owner provides.** That phone. **Trace.** perf-runtime-01/10/16/17; prov-recon-12; app-design-20/21; mobile-15/24.

#### D-SHELL - One responsive shell (D, DG-2)

**DEFAULT.** One tree: CSS grid, `100dvh`, container queries, `env(safe-area-inset-*)`, compact vs full variants of the SAME components; desktop-only overlays never mount in compact (root cause of C1/C2: `IO` z 100 paints over the z 100 mobile root [S app-mobile-01, app-design-01]); mobile-22's IA becomes compact presets of the shared library; tablets 768-834 px get compact with side sheets; landscape gets a single 56 px transport row; manifest orientation lock removed. z-scale `--z-map 0 ... --z-skip 1000`, portal `#overlay-root`, one panel per dock, LayerStack Esc chain, no component root sets `z-index/transform/filter/will-change/contain`. T0 interim: gate overlays, portal the Tools sheet. **Trace.** C1, C2, H1, D2; app-design-01/02/09/10; mobile-01/03/22; prov-recon-14; app-a11y-05.

#### D-SITEGEN - Static-page generator (D, DG-2)

**Options.** Astro static (score 5), Vite MPA (3), 11ty (3.5) [S prov-recon 7.2]; plain Node build [S pagesA-39].
**DEFAULT.** Astro static, `build.format:'file'` + `trailingSlash:'never'` (compatible with extensionless canonical; verify), external hashed scripts (no `unsafe-inline`), `apps/web` hosts pages and mounts the React island at `/map`; one manifest feeds nav, footer, sitemap (git `lastmod`), Help, Historian directory; nav/footer pre-rendered (JS-injected today). WP-DEC-04 (1 d) confirms; fallback 11ty. Option names unverified [S prov-recon-35]. **Trace.** P4, E4, E5, T3; prov-recon-35/36; pagesA-05/39; infra-netlify-03.

#### D-SW - Service worker policy (D, DG-1)

**Options.** Hand-rolled versioned (prov-recon-17) vs Workbox (infra-netlify-22).
**DEFAULT.** R0's minimal SW; runtime caching only (hashed assets cache-first with `ok` guard, data stale-while-revalidate); NO install-time precache (landing must not download 2.3 MB; precaching `index.html` makes `/` cache-first [S infra MISSED-5]); prompt toast, never forced reload; registered only from the app page (`/` until S3, then `/map`); kill switch tested quarterly. Workbox only when the opt-in offline pack (On-site mode) ships. **Trace.** C6, P5; prov-recon-17; infra-netlify-21/22; bundle-anatomy-03; perf-cwv-22; qa-ci-08.

#### D-CSP - CSP staging, headers, source maps (D, DG-2)

**DEFAULT.** Hash-based enforcement per page class (Netlify leaves inline bytes unchanged: sha256 identical on 26 pages [S infra-netlify]); Report-Only first WITH a working collector (`/api/csp-report` is a 404 today, so a soak yields no data [S infra MISSED-2]); static pages first, `/map` last; Deploy Preview drawer allowed only in that context; `embed` `connect-src` includes the RUM host; drop `unsafe-inline` after Astro; least-privilege Permissions-Policy; HSTS preload only once `embed.`/`api.` names are final; no DNS move for DNSSEC. **Source maps (P6):** publish first-party maps `noindex` (`X-Robots-Tag`), vendor `sourcesContent` stripped; for the self-hosted map chunk publish the npm `.map` stripped, else record a `valid-source-maps` exception (Lighthouse flags first-party scripts >= 500 KB without a map [S bundle-anatomy verifier]). **Trace.** X3, X4, P6, P7; infra-netlify-01/02/03/10; deploy-history-18; qa-ci-13; bundle-anatomy-19.

#### D-BROWSERS - Support floor (D, DG-2)

**DEFAULT.** `docs/BROWSERS.md` + `browserslist`: last 2 majors of Chrome, Edge, Firefox; Safari and iOS 16+; Samsung Internet last 2; ChromeOS current LTS. `build.target` and lightningcss targets derive from it, not a hard-coded `es2022` (0.3-0.6 KB br gain [S bundle-anatomy-19 verifier]; check class static blocks vs Safari 16.4). CI `es-check` on `dist/*.js`. Feature-detect modules and WebGL2 (Mapbox v3 needs it) and route failures to the Text route, never a blank page (no ErrorBoundary today [S app-latent-02]). No UA-share data exists (Netlify Analytics has no browser breakdown), so the floor is policy, validated by the beacon later (DG-4). One physical iPhone SE and one Samsung Internet device per release candidate. **GPU resilience:** on `webglcontextlost` pause rAF, show a StateCard, re-add layers idempotently on restore, fall back to the Text route after 3 losses in 60 s. **In-app browsers** (FBAN/FBAV, Instagram, TikTok, Line, Reddit, GSA) get the Lite boot (poster, reduced DPR), URL-first resume and an "Open in your browser" action for export/AR. **Trace.** critic-2 browser, GPU and in-app gaps; bundle-anatomy-19; prov-recon-10/21.

#### D-DESIGN - Theme, fonts, education page (D, DG-3)

**DEFAULT.** Dark UI only at A+, with `color-scheme` meta against forced-dark inversion [S critic-2]; light print stylesheet; light UI theme post-cutover optional; Spectral 400+700 self-hosted (about 45 KB, OFL; the code references Spectral and Cormorant but loads neither [S app-design]); `education.html`'s blue palette folds into the default theme. **Owner provides.** Light theme (Q-1), fonts (Q-3), brand assets (Q-9). **Trace.** A1, A4, H6, E1; app-design-03/04/07/28/32.

### C. URLs, brand, root and entry

#### D-URL - Canonical URL form (D, decided DG-0, executed in train S1)

**Question.** `.html` (prov-recon-35/36; qa-ci left it open) or extensionless (infra-netlify-11, seo-growth-03, pagesA-37, pagesB-09)?
**Evidence.** Netlify Pretty URLs already rewrites authored links (`href='/search'` live, `.html` in the file) while canonical, `og:url`, sitemap (21 `<loc>`, no `lastmod`) and JSON-LD say `.html`: signals conflict [S infra-netlify-11]. Real traffic is extensionless: `/` 1,713 vs `/index.html` 86; `/historian` 68 vs `/historian.html` 42 [S seo G7]. Both forms return 200 and rules match the path as requested, so `/embed` gets `X-Frame-Options: DENY` without `frame-ancestors`, `/dashboard` differs in caching, `/diagnostics` still serves [S infra sec.1, seo MISSED-1]. With about 175 search referrals in 30 days, consolidation is cheapest now.
**DEFAULT.** Extensionless, no trailing slash, apex, https, home `/` (app `/map`, D-ROOT). `[build.processing.html] pretty_urls=false` (verify); generated explicit `301!` rows, one per page (27), since `*` is valid only at path end so `/*.html -> /:splat` is invalid [S infra-netlify-11]; `/index.html` and `/landing.html` -> `/`; every header/cache/redirect rule emitted for BOTH spellings by `scripts/gen-netlify-config.mjs` in the same deploy; the same deploy rewrites canonical, `og:url`, JSON-LD, sitemap and every internal href (27 files, `site-nav.js`, 10 `/index.html` back links, emitters in documentary/education/embed/search); query strings survive forced redirects and `_redirects` can match them, so no JS redirect for `/regiment?unit=` [S seo-growth-13 correction]; GSC file path excluded from any redirect.
**Verify first (WP-DEC-05).** `pretty_urls=false` on the real deploy path; forced `/x.html -> /x` no loop; Astro emits `x.html`. **Owner provides.** Nothing; expect weeks of "Google chose different canonical" noise. **Blocks.** Sitemap, SL-16/HP-10, header generator, D-ROOT. **Trace.** T3, E5, X4; infra-netlify-02/11/12/15; seo-growth-03; pagesA-37; prov-recon-35/36; qa-ci-19.

#### D-URLSTATE - One deep-link contract (D, DG-1)

**Evidence.** The app parses only `?ancestor=` (101019, inside the Follow panel's mount effect) but writes `?t=&u=&z=&ll=` (97821-97829); sub-pages write `?tick=&vignette=&unit=&lat=&lng=`; 9+ pages emit dead links [S app-bugs-05, pagesA-03, ux-flows-01]. "Jump to Pickett's Charge" lands on tick 538, 551 or 560 by entry point; 6 of 9 Turning Points anchors miss their event [S ux-flows].
**DEFAULT.** Adopt ux-flows 5.6: canonical `tick, day, v, unit, follow, at, z, br, pt, cam, panel, q, ask, view, mode, level, layout, pl, step, tick2, dv, intro, src`; aliases `t, vignette, u, ancestor, ll, lat+lng, zoom` read forever, never written; parsing is total; a deep link suppresses intro, welcome and resume; no personal data or free text in queries; the fragment is reserved for private payloads (`#n=`, `#tour=`, Historian `#q=`); `dv` stamps the calibration so links survive re-timing. T0 implements `tick|t, unit|u, vignette|v, ancestor, ll|lat+lng, z` plus `ensureDay(tickToDay(t))` and one `moments.json` v0 with corrected anchors; `?ancestor=` opens its panel at boot. **Trace.** H3, H4, D3; app-bugs-05/06; app-time-06; ux-flows-01/05; pagesB-01; pages-C-01; infra-netlify-26; prov-recon-04.

#### D-ROOT - What `/` is (D, decide DG-2, executed in train S3)

**Question.** Landing at `/` with app at `/map` (seo-growth-09), app at `/` (ux-flows 5.4, prov-recon-16), or app at `/` with crawler-visible About (seo-growth-09 option B)?
**Evidence.** Search brings 173 of 2,221 referrals (7.8%); 2,034 (91.6%) are direct [S seo-growth-38 verifier]. Home is JS-rendered with 3 `<h1>` and a crawler-only `#seo-content` deleted by script (`index.html:424-425`): not cloaking by Google's definition but fragile [S seo-growth-09]. The SW registers on `/` and precaches the app; `site-nav.js:212` back links key on `a[href="/"]`; existing users hold `gtbg_onboarded=1`, not `gtbg_seen` [S seo MISSED-2/3].
**DEFAULT.** Option A, decoupled from the rebuild:
- `/` = static Astro landing (one `<h1>`, >= 250 words, hubs and footer in raw HTML, no map JS, no SW); `/map` = the app, `noindex,follow`, out of the sitemap, one visually hidden `<h1>`.
- **The legacy patched app moves to `/map` in train S3, before the rebuild**, so the URL identity changes once; cutover only swaps content. Old shared links (`/?tick=`, `/?ancestor=`) are forwarded by one inline script when deep-link params or `gtbg_seen`/`gtbg_onboarded` exist; a stateless crawler sees the landing.
- **PWA:** set `manifest.id = "/"` NOW (existing installs derive `id` from `start_url "/"`, so nothing re-identifies) and never change it; only `start_url` moves to `/map?source=pwa`; drop `orientation`; back links target `/map`.
- **Keep/revert:** measure `map_launch / landing_view`; keep at >= 45% by day 90 after S3; else add a hero preview; if still < 30%, revert to Option B via the versioned redirect map.
**Owner provides.** Approve landing-first and the S3 window. **Blocks.** SEO S3/S4, `/teach`, PWA, D-ENTRY facade. **Trace.** E3, E4, T1; seo-growth-08/09/24; ux-flows-15; bundle-anatomy-15; perf-cwv-05/26; app-a11y-12/15.

#### D-NAME - Product name (B, approve DG-0, executed in train S2)

**Options.** (A) Gettysburg Interactive Map; (B) keep Gettysburg Animated Battlefield Map; (C) new neutral brand.
**Evidence.** The domain says interactive; the exact "animated" phrase is contested by ABT "Gettysburg Animated Map", the paid "Gettysburg Animated Battle Map APP" (USD 49.95 lifetime), a YouTube "Gettysburg Battle - Fully Animated" and a 2019 ABT film [S seo-growth-04 verifier]; copy has 71 uses of "Animated Battlefield Map" [S docs-copy]; data is five-minute steps, so "minute-by-minute" is wrong [S seo G16].
**DEFAULT.** A. Titles `{keywords} | Gettysburg Interactive Map` (<= 60 chars); home "Gettysburg Interactive Map: The Battle in Five-Minute Steps"; `WebSite.name` + transitional `alternateName`; manifest `name`/`short_name` "Gettysburg Map"; footer line "Not affiliated with the National Park Service, the American Battlefield Trust or any publisher" (owner must confirm it is true); "Animated" stays in body copy; keep "Ask the Historian" (the copy overpromised, not the name [S hist-final-plan 10.2 #11]); interim OG card carries no product-name text. Acceptance: `grep -ri "animated battlefield map"` finds only `alternateName` and the changelog; unhyphenated "minute by minute" (`site-nav.js:46`, living-ledger) gone. **Owner provides.** Approval, any registered mark, non-affiliation truth. **Trace.** E2; seo-growth-04/29; docs-copy-05/29; app-design Q-6; pagesA-08.

#### D-NETLIFY-DOMAIN - Duplicate host and stale deploys (D, DG-1; hygiene, allowed in R0/R1)

**Evidence.** `friendly-lolly-da85c0.netlify.app` serves the whole site with 200 (blank map: tiles 403); old deploy permalinks still serve `landing.html` (a USD 9.99 pricing page with a free-trial claim) and `diagnostics.html` [S deploy-history-11, infra-netlify-15]. It adds no custom-domain URL, so it is not an identity change.
**DEFAULT.** Try the primary-domain setting first; else host-based `301!` `https://friendly-lolly-da85c0.netlify.app/* -> https://gettysburginteractivemap.com/:splat`; `[context.deploy-preview]` sends `X-Robots-Tag: noindex`; the preview token needs `netlify.app` on its allow-list (authorises every Netlify site): minimum scopes, rotate monthly. After S0 the owner deletes non-current deploys, keeping the previous two known-good. `http://www` stays two hops (HTTPS upgrade first [S seo-growth-03 verifier]). **Trace.** T3, X4; deploy-history-11; infra-netlify-15/18.

#### D-ENTRY - Boot contract, gates, first 20 seconds (D, DG-2)

**Question.** perf-cwv option D keeps a static chooser because "the user must decide anyway"; ux-flows-02, app-design-14, prov-recon-28 delete it. What is the entry, and is delaying the map a legitimate way to score 95+?
**Evidence.** Today: fake 3.5 s fast-forward (`eO = 3500`, 101471 [V]), chooser, onboarding modal: 5.5-8.2 s to an interactive chooser plus the C6 reload; the LCP element is the intro's story text; keyboard users cannot pass the click-only `div` cards [S app-latent, perf-cwv-04, app-a11y-03]. Replica scores exclude tile/GL work; "not legitimate to delay the app merely to dodge the trace" [S perf-cwv 9.1, MISSED-06].
**DEFAULT (boot contract).**
1. No modal gates: layout by CSS/`matchMedia` with a Settings override; fast-forward, chooser, onboarding modal and injected banner deleted; non-modal welcome card and optional coach marks stay.
2. `/map` ships a static shell: own-data SVG poster, `<h1>`, three native buttons of INTENT (Watch Pickett's Charge in 20 s / Explore the map / Ask a question) and "Read as text". A genuinely useful screen is what makes it legitimate.
3. Returning visitors, resume state or deep-link params boot right after first paint; first-timers on the first tap or after 3 s idle. Bundle fetch starts after FCP at low priority, evaluation in its own task, "Loading the battlefield" painted first so the tap costs < 100 ms INP [S perf-cwv-02/26].
4. The 20-second moment (ticks 535-556, from `moments.json`) starts only after a gesture, skipped under reduced-motion, data-saver or 2G; no clock text until D-TIME.
5. Data-saver, 2G/3G, no map-ready in 6 s or no WebGL2 -> Text/Chronicle route. Publish the Lighthouse-scored URLs including `/map`; a measured `/map` mobile < 95 with real tiles is recorded as an exception (D-EVIDENCE).
**Spike gate (WP-DEC-01, 2 d).** Numbers under production-equivalent load set the budgets. Acceptance: `performance.mark('gtbg:interactive')` p75 <= 4 s on 4G; first-tap INP <= 100 ms; LCP element = poster/`<h1>` <= 1.5 s lab. **Owner provides.** Approve gate removal and the intro moment (First Shot is the A/B alternative). **Trace.** H3, C6, P1, P7, A6; prov-recon-16/28; perf-cwv-02/04/26/27; bundle-anatomy-13/15; ux-flows-02; app-design-14; app-mobile-05/06.

#### D-LANG - Language, locale, input (D, DG-1)

**DEFAULT.** English-only recorded. `translate="no"` on the `/map` stage, canvas labels, unit names and clocks only (auto-translate is a known trigger of React `removeChild` crashes [E, not reproduced]; `index.html` has `lang="en"` but no `translate` [V]); content pages stay translatable; ErrorBoundary reload prompt for DOM-mutation errors. One `Intl` formatter with explicit `en-US` for every clock/number/date (13 call sites). One hotkey registry: bindings declare `code` (Digit1-3, Numpad, Arrow*, Space) or `key`, matched code-first, ignoring `isComposing` and inputs, WCAG 2.1.4 toggle kept; today's handler switches on `Ur.key` for '1','2','3' (112966-112993), so AZERTY day jumps fail. `color-scheme` meta; forced-dark test; zero console errors measured in a clean profile AND with uBlock default lists. Spanish classrooms are a later question. **Trace.** A6, D2; app-a11y-06; prov-recon-31; critic-2 hostile-environment and keyboard gaps.

### D. Time, history, data rights

#### D-TIME - The clock (B, sign-off DG-3; the date +2 fix ships in T0 with no decision)

**Options.** (a) piecewise-linear time-warp through verified anchors, ticks stay permanent IDs; (b) re-time everything onto a true 5-minute grid: infeasible without inventing data (only 188 of 675 ticks carry a record; 167 units have one keyframe) and breaks every link [S app-time 6.1].
**DEFAULT.** (a), invariant "ticks are opaque permanent IDs 1..675; clock time is a derived monotone function defined only by `time_anchors.json`". Input `plan-work/time-facts-anchors.csv`: 33 anchors (12 solid, 13 medium, 5 needing a historian at t75, t90, t248, t275, t538; 3 design anchors t100, t226, t675 [V count]); error vs 102 sourced events: mean 21 min, median 10, 86 within 30 min, leave-one-out RMS 44 min; today the JSON labels are off by a mean 4.8 h (5/102 within 30 min) and the map clock by 4.8 h (1/102) [S time-facts]. Slope 0.83-42.3 min/tick is real (lulls t226-240, t515-518) so warn > 15, error > 60. Local mean time; day tabs at first light 04:30; "about" when sigma >= 10 min; default playback "story", constant-clock as a runtime mode.
**Sign-off.** (1) Historian decides the 5 R anchors. (2) Owner signs the 3 D anchors and conventions: LMT, first-light tabs vs midnight, "about" wording, whether the 125 event-less Day-1 night ticks (18.5%) keep density or become a flagged time-lapse [S app-time Q3]. (3) Reviewer spot-checks 45 low-confidence rows (Pfanz, Coddington, Sears, Hessler, Wert, Gottfried and most Official Records were not read [S time-facts]). (4) Separate content queue: of 137 events 4 wrong-day (t8, t360, t380, t420), 12 misordered, 9 composite, 2 unverified quotes. (5) `dv` bump per anchor change.
**Hold until signed:** hour pages, Historian clock strings (it stores 1863 `clock_min`), dated OG eyebrow, guide text. No reviewer by DG-3: ship with "approximate time" markers and an "Unreviewed reconstruction" badge. **Effort.** model 1-2 d, wiring 3-5 d, content 2-5 d. **Trace.** C3, C4, H9; app-time-01..20; time-facts-01..15; data-integrity-11; app-bugs-08; prov-recon-13; qa-ci-06.

#### D-HIST-REVIEW - Named reviewer and editorial standard (B, DG-2)

**DEFAULT.** One reviewer plus a second reader, one-page charter (scope, 3-4 h/week [S hist-final-plan 8.4: 59-95 h], credit on `/sources` and `/corrections`, veto over a claim, `decisions.jsonl`). Standard: evidence classes documented/reconstructed/schematic, contested-fact rule (range plus sources), quotation and responsible-language policy. The manifest records `reviewed_by/at`; unreviewed items carry an "Unreviewed reconstruction" badge; CI fails on "Reviewed" copy without a signed decision. Fallback if nobody is found: ship labelled and capped ("accurate to the minute" barred), do not block. Quarterly corrections review and a 100-answer Historian audit. Sensitive content: Explore mode quotes period language with a note and a hide toggle [S hist-final-plan 10.2 #13]; Classroom collapses it (D-SCHOOLS). **Owner provides.** Names, credit preference. **Blocks.** D-TIME sign-off, Historian P4 (stalls without one), data A+. **Trace.** C4, H10; time-facts-05; data-integrity-29; docs-copy-27/33; hist-final-plan 0.2 #3.

#### D-HIST-ARCH - Historian architecture and gates (D, DG-1)

**DEFAULT.** Adopt hist-final-plan as the workstream of record: **Design A** (static hybrid retrieval, zero server, page-cited verbatim quotes, entity + facts tier, 128-bucket BM25; measured on 14,391 passages / 3.19 M words, 1.54 MB brotli index [S]) is permanent, with build-time grafts only (T0+ expansion, LLM link proposals into the review queue). **B and C are OFF**, decided only at gate G-X: paraphrase recall@5 >= 0.80 with T0+ freezes the architecture; else cheap levers, then a 4-day B0 bake-off with a kill rule; C-lite (per-click "Explain these sources (AI, beta)") only if G-A2 passed, Netlify plan confirmed, privacy/Terms rewritten, caps USD 25/month and 2/day. The ten owner defaults of hist-final-plan 0.2 and #11-18 of 10.2 are adopted as written (Node 24 + Python 3.11 with Git/CLI deploys; records-only positioning; OR returns > Fox > Dyer with Busey and Martin "see also"; no question counter; Confederate depth accepted with a coverage note). URL prefix `/hx/` (never `/data/`), SW bypass, `#q=` deep links, golden sets GQ-150 + GP >= 100. **Retro-audit first:** tag shipped rows as `legacy` with source and rights tier (18 monument coordinates derive from Stone Sentinels 8, HMDB 4, Wikipedia 6 [S risk 1]) before Wave 2; CI tier gate. Acceptance: the Extra Features overlay must not cover `/historian` (never checked [S 10.3]); in-app "Search Units" waits for the rebuild. Core 49-76 d, review 59-95 h. **Trace.** H8, H7, C4, T1, N1; hist-final-plan hf-01..hf-40; hist-current; hist-sources-1/2; data-integrity-27; infra-netlify-31; seo-growth-14/23.

#### D-CWSS - Real ancestor lookup (B, DG-5; send the email now)

**Evidence.** NPS CWSS has no API and is "no longer maintained"; a public S3 mirror (`Soldiers_Personz.tsv` 1,194,562,274 B, about 6.26 M cards, 42% Confederate in a sample) joins by unit code (`U-20ME` -> `UME0020RI`) but is third-party, unlicensed on paper, a 2012/2015 snapshot; redistribution needs written NPS confirmation [S hist-sources-2 SRC-10].
**DEFAULT.** Link-out only: deterministic per-regiment links to NPS CWSS, Find a Grave, FamilySearch, never fetched or stored; Find Ancestor stays regiment-level with honest copy; no roster shards (6-12 MB) or surname index until NPS confirms in writing (if declined, permanent). ABT, Ancestry/Fold3, FamilySearch, HMDB bulk and Stone Sentinels stay Tier C. **Owner provides.** Send the drafted emails (action 8). **Trace.** hist-sources-2-01/18/20; hist-final-plan hf-35; seo-growth-20; pages-C.

#### D-LICENSE - Content and data licence, crawler policy (B, DG-3)

**Evidence.** Terms forbid scraping data files yet invite embedding and say "free to reference" [S seo-growth-26, infra-netlify-37]; metadata cites copyrighted atlases (Gottfried, Laino, Desjardin) and Busey and Martin; paid-app provenance open [S seo MISSED-5].
**DEFAULT.** Code all rights reserved; narrative "quote with credit"; NO open data licence until the provenance audit (which keyframes and texts came from which atlas, video, imagery) is done, then publish the facts dataset WITHOUT positions first under CC BY 4.0 with a Zenodo DOI. Robots: HTML open to all; `Disallow: /data/` for training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, meta-externalagent); search/answer bots and user fetchers allowed; only OpenAI and Anthropic tokens were vendor-checked [S seo-growth-06]; `llms.txt` small and honest. Terms' embed clause matches headers (only `/embed` frameable). **Owner provides.** Answers to action 10, licence choice. **Trace.** X5; seo-growth-06/26; infra-netlify-37; hist-sources-1-04, hist-sources-2-15/20; docs-copy-27.

### E. Features to keep, fix or delete

#### D-SOUND - In-app sound (B, DG-0)

**Evidence.** `CanvasRenderer._lastSoundMs` (96556-96557) is defined nowhere: with sound on, `lS` throws before the next `requestAnimationFrame` (97014-97017) and playback freezes [V]; RECON PENDING.md: "no audio feature is wanted"; the banner says "live sound" (`index.html:377` [V]) and the guide promises cannon and musket sound [S prov-recon-29]; `immersive.html` is the only other audio page, with no hearing-safety limiter (cannon eligible on 662 of 675 ticks) [S pages-C-26].
**DEFAULT.** Remove: delete `yO`/`vO` (111768-111797), `r2/oT/Uk/jk/N4/U4` (96319-96371) and the `lS` sound branch (T0 patch B, matches=3 validated [S app-bugs]); fix banner, guide, Help. Immersive = Tier 3: keep only with limiter, mute, Pause stopping the drone, reduced-motion respect. If sound is wanted: one shared engine, `AudioContext` on a gesture, `aria-pressed`, volume, default off. **Trace.** H8, T-07; app-bugs-03; app-latent-03; prov-recon-29; docs-copy-32.

#### D-HEATMAP - Dead H heatmap (B, DG-0)

**Evidence.** State, `H` key and Help row exist (9419, 9436, 112930) but nothing renders; the guide promises "a heatmap that builds across all three days" [S prov-recon-32/29]. `ground-remembers.html` has a real GL heatmap whose top hotspot flips from The Angle to Culp's Hill when duration-weighted (21% of keyframes are non-combat) [S pagesB].
**DEFAULT.** Delete the state, key, Help row and guide claim; ground-remembers stays Tier 2 with honest bias wording; a real trail heat-map view is post-cutover (ux-flows-23) and needs D-TIME. **Trace.** H8; prov-recon-32; ux-flows-23.

#### D-VIEWSHED - "What They Could See" (D, DG-3)

**Evidence.** It ranks 30 landmark elevations, not lines of sight; `terrain.json` differs from USGS 3DEP by mean 62 ft (13 of 30 off > 50 ft) [S pagesB-35]. A real viewshed is feasible from public-domain 3DEP (10 m terrain-RGB 0.54 MB; ray casting 44-240 ms) but Mapbox terrain-DEM is render-only under its terms [S pagesB-36/37/40].
**DEFAULT.** Now (S+M): retitle "High Ground: Battlefield Vantage Points", state "Elevation only. Line-of-sight maps are not shown on this page", correct elevations from 3DEP. A real viewshed (DEM pipeline M, worker L, UX M, obstruction modelling XL) is an optional post-cutover Labs project labelled "Terrain only (modern ground, USGS 3DEP); woods, buildings and smoke not included". **Trace.** H8; pagesB-34..41; D-MEDIA.

#### D-SCHOOLS - Classroom readiness (D, DG-3)

**Evidence.** About 60% of student traffic is assumed on managed Chromebooks; a 3.5-month-old domain is likely uncategorised by web filters, which often block such sites and WebRTC (per-vendor unverified) [S critic-2]; a CSP-derived IT list omits jsDelivr and Google hosts [S seo-growth-31 verifier].
**DEFAULT.** (1) After landing and `/learn` stabilise, submit the domain to major filter vendors' categorisation forms (Education/Reference/History), logging dates. (2) `/teach/it-admin` from a HAR of a full session. (3) Classroom mode (`?mode=classroom`): third-party frames and WebRTC off, no accounts, needs only the site plus `api.mapbox.com`; sensitive passages collapsed behind a content note with a teacher toggle. (4) ChromeOS profile (4 GB, 4x CPU, Slow 4G, 30 concurrent) in the perf matrix and one real Chromebook per release candidate. **Owner provides.** Two or three pilot teachers; sensitivity stance. **Trace.** critic-2 schools gap; ux-flows-13; seo-growth-31; qa-ci T6.

### F. Privacy, rights, media, contact

#### D-TELEMETRY - One first-party collector (D, DG-1)

**Question.** Six reports specify six pipelines: perf-cwv-17 `/api/vitals`, qa-ci-16 `/api/rum`+`/api/csp`, infra-netlify-10/31/32, ux-flows-21 events, seo-growth-35 cookieless counter, app-latent-36 error beacon.
**Evidence.** Netlify RUM is web-vitals v3 without attribution, segmentation or bot filter; the owner's own Lighthouse runs pollute p75 and about 113 views/day lets a few synthetic sessions swing a percentile [S infra-netlify-32, perf-cwv-18]. Free/Personal plans allow 2 code rate-limit rules (Pro 5), so vitals, CSP reports and the Historian cannot each have one [S infra-netlify-31]. perf-cwv-17's snippet needs the verifier's five fixes [S perf-cwv verifier].
**DEFAULT.** ONE Netlify Function `/api/ingest` taking typed messages (`vitals`, `error`, `csp`, `event`), storing only daily aggregates and attribution fields in Blobs (path, device class, connection bucket, metric and rating, LCP element selector, INP target and phases, top CLS source, app/data version); no IP, no id, no query or free text, no stored user agent; drop `navigator.webdriver`, `HeadlessChrome|Lighthouse|GTmetrix|Pingdom|PTST`, prerendered or hidden loads; honour GPC/DNT by sending nothing; 13-month retention; dynamic `import()` in an idle callback; `connect-src 'self'`. No third-party analytics vendor by default; Netlify Web Analytics stays as a disclosed cross-check and Netlify RUM as external witness. Order: vitals, errors/CSP, events. **Gate:** nothing ships before D-LEGAL step 1 and a CLI/Git deploy path. **Owner provides.** Approval of the event list. **Trace.** P1, P7, T2, X3, X5; perf-cwv-17/18; qa-ci-16/17; infra-netlify-10/31/32; ux-flows-21; seo-growth-35/36; app-latent-36.

#### D-LEGAL - One privacy/terms pack; when counsel is needed (B, interim DG-1, full DG-3)

Planning default, not legal advice.
**Evidence.** Five reports rewrite Privacy/Terms with no professional review (infra-netlify-36/37, docs-copy-25, pages-C-81/83/84, deploy-history-17). The live page misplaces Street View (the frame is the app walkthrough, 110660), omits the NPS frame, PeerJS/STUN/TURN/jsDelivr, Mapbox telemetry (anonymous `mapbox.eventData` ID), AR permissions, Netlify server analytics and the storage inventory, and claims no personal information although Netlify logs IPs [S infra-netlify-36]. The infra draft's under-13/under-16 wording simplifies GDPR Art. 8 [S critic-2].
**DEFAULT.** (1) **Now, no counsel (WP-DEC-07):** facts-only correction from `docs/data-inventory.md`, dated with a change log. (2) One merged Privacy + Terms from the five drafts; CI checks every CSP origin and storage key is disclosed and a network-log test that contacted origins equal disclosed origins. (3) **One-time attorney review (cost unverified) BEFORE** the open data licence, any LLM tier (provider policy for minors unverified [S arch-rag-function]), Classroom student statements, user content if Watch Together survives, age wording, the ePrivacy view on the Mapbox ID and Cache Storage [S infra-netlify-38], trademark/naming confusion, embeddings of share-alike text, Busey and Martin-derived figures. (4) No cookie banner unless counsel says; a "Privacy and data" panel with "Clear my saved data"; honour GPC; accessibility statement says "partially conforms" until D-EVIDENCE (a). **Owner provides.** Operator identity, governing law, attorney budget. **Trace.** X5; infra-netlify-36/37/38; docs-copy-25; pages-C-81/83/84; deploy-history-17.

#### D-MEDIA - Rights for anything derived from imagery (D, DG-1)

**Evidence.** seo-growth-02 makes the interim OG card from "a crop of a real map screenshot" while seo-growth-11 forbids third-party basemap imagery; seo-growth-33 plans YouTube from Cinematic Export; Mapbox attribution guidance covers live and static maps but video "is not addressed" [S pages-C, critic-2]; screenshots taken now would bake in C1/C3/C4 [S seo MISSED-7].
**DEFAULT (option 1).** Mapbox imagery appears ONLY in the live interactive map. Every derived asset (OG cards, mini-maps, exported video, print/PDF, press kit, embed thumbnails, YouTube) uses a basemap we control: own vector SVG from placements, roads, rivers, works, USGS contours/3DEP hillshade, or NAIP-derived tiles. Interim OG card now (WP-DEC-09): 1200x630, <= 150 KB, 8-bit RGB, decodable, name-neutral; PWA screenshots regenerated in CI only after C1/C3 and the rename. `docs/media-rights.csv` (source, licence per raster/video) with a CI coverage check. Option 2 (written Mapbox confirmation with burned-in attribution) only if the owner obtains it. Street View appears only in the click-to-load frame, never captured. **Trace.** T1, E1, X5; seo-growth-02/11/12/33; pages-C-69; infra-netlify-20; hist-sources-2-20; pagesB-40.

#### D-CONTACT - Contact identity and mail DNS (B, DG-1)

**Question.** infra-netlify-34 proposes null MX, SPF `-all`, DMARC `reject` because "no mail is sent"; other plans need inbound intake (corrections, Report-a-problem, `security.txt`, permission emails, takedowns, teacher outreach, a 3-day acknowledgement promise [S hist-final-plan 4.4]).
**Evidence.** The only contact is one Gmail address in `privacy.html:47`, `terms.html:42`, `site-nav.js:194` [V] plus the timeline credit "Created by: Mike Legere - ..." (112361 [V]); it is also the CAA `iodef` target and probably every account's recovery identity [S infra-netlify-34/39]; the mailto is harvestable [S pagesA-08]. Null MX makes role addresses impossible.
**DEFAULT.** `contact@`, `security@`, `corrections@` on the domain via a forwarder that works with Netlify DNS; do NOT publish null-MX/SPF `-all`/DMARC-reject. SPF and DKIM per forwarder (and relay if the owner replies as a role address); DMARC `p=none` with `rua` for 4 weeks, then `quarantine`, then `reject`; CAA in Netlify's account-bound Let's Encrypt form (plain `letsencrypt.org` admits any customer; CAA mistakes block renewal [S infra verifier]) with `iodef` to `security@`; TXT for GSC/Bing. Replace shipped mailto text with a Report-a-problem form (Netlify Forms or the function; update privacy) plus an obfuscated fallback, auto-responder, spam filter, 3-day SLA; `/.well-known/security.txt` (RFC 9116, `Expires`; needs a rewrite to survive dot-folder stripping [S infra-netlify-09]); remove the credit email from the timeline (also C1). Recovery mailbox private with passkeys/2FA. **Acceptance.** Test mail to every alias arrives; DMARC alignment passes for forwarded mail; no personal Gmail in shipped HTML. **Owner provides.** Forwarder, role names, send-as choice. **Trace.** X5, T2; infra-netlify-09/34/39; seo MISSED-8; pagesA-08.

---

## 6. Decision-support work packages (WP-DEC-nn)

Spikes, owner tasks and packets that close the ADRs. Days exclude counsel cost (unverified), reviewer hours and the owner minutes of section 2.

| WP | What / precise fix | Effort | Deps | Acceptance (automatable where possible) | Moves / risk |
|---|---|---|---|---|---|
| WP-DEC-01 | Boot-contract spike: legacy and static-poster variants under production-equivalent load (CDP `Fetch.enable` injecting the production Referer for `api.mapbox.com`); Moto G Power-class, ChromeOS 4 GB, desktop; 20 s no-input probe | M-L 2 d | DEC-15 | numbers per profile; `budgets.json` from real-tile runs; CI uses same interception | D-ENTRY/ROOT/EVIDENCE |
| WP-DEC-02 | Map-engine facade spike, O1/O2/O3 on 6 views incl. 375x812 | M-L 1-2 d | DEC-01 | bytes, init, tile bytes, SSIM table; ADR amended | D-MAP-ENGINE |
| WP-DEC-03 | Unit-render benchmark: R1 canvas prototype vs `unit-rendering-reference.html` symbol layer, 478 units, 8x, 4x CPU, real Android | M-L 1-2 d | real phone | p95 fps, long tasks; gate G-R pass/fail | D-UNIT-RENDER |
| WP-DEC-04 | Astro spike: 3 pages, layout, `format:'file'`, sitemap with git `lastmod`, hash CSP, OG render, React island | M 1 d | none | `x.html` served at `/x`; no inline script; Lighthouse >= 95 | D-SITEGEN; option names unverified |
| WP-DEC-05 | Netlify routing spike on a Deploy Preview: `pretty_urls=false`, forced `/x.html -> /x`, per-path headers for both spellings, `/diagnostics` twin, primary-domain vs host rule | M 0.5-1 d | D-CI-HOST | curl matrix green; `/embed` frameable cross-origin, `/` not | D-URL/CSP |
| WP-DEC-06 | Contact architecture: forwarder, records, form, `security.txt`, auto-reply | M 0.5-1 d | action 6 | alias mail arrives; DMARC aligned; no personal Gmail in HTML | D-CONTACT |
| WP-DEC-07 | Interim privacy correction + `docs/data-inventory.md` | M 0.5-1 d | none | every CSP origin and storage key disclosed; dated | D-LEGAL/TELEMETRY |
| WP-DEC-08 | Legal and rights pack: merge drafts, counsel packet, provenance audit of keyframes/texts, licence text | L 3-5 d + counsel | DEC-07, action 10 | counsel sign-off recorded; network-log test matches policy | D-LEGAL/LICENSE; counsel lead time |
| WP-DEC-09 | Media-rights register + interim OG card from own vector art | M 1 d | none | PIL decodes all og/manifest images; register covers 100% of rasters | D-MEDIA |
| WP-DEC-10 | Reviewer recruitment, charter, second reader | M 1-2 d elapsed | action 8 | reviewer published; first session booked | D-HIST-REVIEW/TIME; fallback if none |
| WP-DEC-11 | Time-anchor review packet: 5 R, 3 D, 45 L rows, unread sources, 27-defect queue | M 1-2 d | DEC-10 | decisions in `decisions.jsonl`; `time_anchors.json` regenerated; V1-V15 green | D-TIME |
| WP-DEC-12 | `BROWSERS.md`, browserslist, es-check gate, WebGL2/module gate stub | S-M 0.5-1 d | none | es-check passes; forcing WebGL2 off shows Text route | D-BROWSERS |
| WP-DEC-13 | Continuity pack: inventory, second remote, restore script, vendor register, delegate letter | M 1-2 d | action 6 | drill log <= 90 days; delegate can renew domain; test alert fires | D-CONTINUITY |
| WP-DEC-14 | Capacity plan: one de-duplicated WBS, Tier tags, dependency graph, WIP limit | M 2 d | D-SCOPE-TIERS | effort <= H x weeks x 0.7; every Tier-3 feature has a disposition | D-SCOPE-TIERS |
| WP-DEC-15 | Key hygiene: verify Mapbox list/scopes, dev+preview tokens, restrict Google key, one config module (11 token literals: 2 bundle, 9 pages), gitleaks | S-M 0.5-1.5 d | actions 3-4 | prod referrer matrix unchanged; dev token localhost-only; `grep "pk\.eyJ"` = 1 | X1/X2 |
| WP-DEC-16 | Verification-debt burn-down (section 9) with devices | M-L 2-3 d | devices | each row closed with evidence or dropped | S3, H13, S4, P7 |
| WP-DEC-17 | Commit ADRs as `docs/adr/0001..`; record ratification | S-M 0.5-1 d | repo | each ADR accepted or overridden | all |

Total 19.5-30.5 person-days across 17 WPs.

---

## 7. Conflicts resolved (deviations from specialists)

| # | Conflict | Resolution |
|---|---|---|
| 1 | URL form: prov-recon-35/36 `.html` vs infra-netlify-11/seo-growth-03 extensionless | Extensionless, both spellings in every rule (D-URL) |
| 2 | `/`: seo-growth-09 landing vs ux-flows 5.4/prov-recon-16 app | Landing at `/`, app `/map`, legacy moves first (D-ROOT) |
| 3 | Gate: perf-cwv option D chooser vs ux-flows-02/app-design-14 deletion | Static poster of intent, no layout question (D-ENTRY) |
| 4 | Mail DNS: infra-netlify-34 null MX vs role addresses | Role addresses, staged DMARC, account-bound CAA (D-CONTACT) |
| 5 | Renderer: prov-recon-12/app-design-21/mobile-24 symbol layers vs perf-runtime-17 canvas | Canvas behind an interface; layers gated by a device benchmark (D-UNIT-RENDER) |
| 6 | Astro (prov-recon-35) vs Node build (pagesA-39); hand-rolled SW vs Workbox | Astro after a spike; minimal custom SW (D-SITEGEN, D-SW) |
| 7 | Canary via Netlify Split Testing (prov-recon-39) | Unavailable; `/next/` beta + `flags.json` (D-SOURCE) |
| 8 | seo-growth-08 `id:"/map"`; seo-growth-02 vs -11 OG source; six telemetry pipelines; ux-flows 5.9 autoplay | `id:"/"` now; own vector OG; one `/api/ingest`; moment after a gesture |
| 9 | Historian AI: hist-final-plan decision 2 vs infra-netlify-31 | Records-only; C-lite behind G-X (D-HIST-ARCH) |
| 10 | seo-growth 12-week plan vs no GSC baseline | Trains 4 weeks apart after 28 days (4.2) |
| 11 | prov-recon-01 "RECON is the only quarry" | `COMPLETE_FIXED/src` and v25/FINAL_v24 exist [V]; salvage widened (D-SOURCE) |
| 12 | `es2022` (bundle-anatomy-19); `playRow` patch (prov-recon-40); localhost Lighthouse (infra-netlify-29); map pages >= 95 (pagesA-40) | browserslist; gate overlays; LHCI on preview; poster facade |

---

## 8. Facts the ADRs rely on (audit corrections, verified)

| Statement | Corrected fact | Source |
|---|---|---|
| X1 token unrestricted | Tiles, TileJSON, geocoding, static return 403 for no/foreign/localhost/netlify.app Referer, 200 for production; style/sprite/glyph 200 for all. Allow-list and scopes UNVERIFIED (action 3); one verifier probe saw 200 for a foreign Referer on an unspecified endpoint | infra-netlify-18, mobile-20, pagesA-38; prov-recon verifier |
| X4 guide inline; diagnostics 404 | PDF is an attachment; `embed.html` sends `X-Frame-Options: DENY` AND `frame-ancestors *`; `/diagnostics`, `/unit-rendering-reference` return 200 | infra-netlify sec.1 |
| H3 15 s splash | `eO = 3500` (101471 [V]); 5.5-8.2 s to interactive chooser incl. reload; LCP element is the intro's story text | app-latent, perf-cwv-04 |
| H4 / N1 | Toasts auto-dismiss at 4.5 s; Esc clears `selectedUnitId` not `pinnedUnitId`; Netlify is case-insensitive so the zip is hygiene only | app-latent, infra-netlify |
| 467 regiments | 467 regiment records (1 alias stub) + 103 batteries = 570; only 217 regiments and 38-41 batteries have positions | app-bugs, data-integrity |
| Date and links | `July ${l + 2}, 1863` at 97428 [V]; only `?ancestor=` parsed (101019 [V]); attribution off at 102988, 110777 [V] | app-time, app-bugs-05, infra-netlify-20 |
| Baselines | Lighthouse mobile 64 / desktop 85, A11y 90, BP 96, SEO 100; 3,389 views, 1,529 visitors / 30 d; search 173, ChatGPT 14, direct 2,034 | lh_*.json, Netlify PDFs |

---

## 9. Verification debt the decisions depend on (verify first)

1. **Mapbox:** URL list and scopes; spend cap; Product Terms of 2026-07-21 (caching, static images, terrain); 2.x maintenance; raster tiles in MapLibre; `webglcontextlost/restored` on 3.24.1 (`WEBGL_lose_context` test, recovery < 3 s over 20 cycles).
2. **Google key** restrictions (action 4). 3. **Netlify:** plan and credits; Deploy Previews non-metered; `deployment_status` emitted; `pretty_urls=false` on the real deploy path; Split Testing unavailability.
4. **Tooling:** Astro option names; private-repo Actions minutes; forwarder DMARC behaviour; Netlify Forms limits.
5. **Real devices:** pointer-capture bug with a real mouse; iOS AR gesture chain and canvas memory; Safari MediaRecorder; Chromebook timings; in-app browser storage hand-off.
6. **History:** 5 R anchors, 45 low-confidence rows, unread primary sources (D-TIME). 7. **Rights:** NPS CWSS redistribution; atlases behind positions; paid-app provenance; counsel items (D-LEGAL); CC BY-SA/ODbL obligations in a static site.
8. **Other:** no UA-share data (browser floor is policy); whether an older GSC/Bing property exists (seo Q9); long sessions/kiosks need a nightly 60-minute soak (QA-owned) [S critic-2].

---

## 10. Ratification ledger

Version 1.0 proposed 2026-09-30; 11 class-B and 23 class-D ADRs (section 3). Amendments: none yet (append date, ADR, change, reason).
**Open flags from consistency review 1 (chapters 02-05; proposals, not ratified, no ADR text above was changed):** (1) D-ORDER R0 omits the one-line intro deletion that chapter 02 puts in R0 (`R0-intro-delete`); owner picks at DG-0 (default chapter 02; R0 lab gate 85 with it, 78 without). (2) D-NAME's home title "Five-Minute Steps" contradicts D-TIME's 0.83-42.3 min moments; chapters 04, 11 and 15 propose "The Battle, July 1-3, 1863" for S2. (3) D-SOUND says T0 deletes `yO`/`vO`; chapter 02 makes `yO` return null (deletion is rebuild scope). (4) D-SOURCE item 2 says port `GoldTrailEngine`; chapter 02 removes the calls instead (`initGoldCanvas` is referenced nowhere). (5) D-SCOPE-TIERS/D-SOURCE effort lines (T0/R0/R1 8-12 d; rebuild 38-50 d) are below the chapters' bottom-up totals (chapter 02: 18.25-31.5 d; chapter 03: 71.5-114.5 d); chapter 15 nets and re-totals. (6) D-MAP-ENGINE's O3 row is measured on MapLibre 5.6.0 while npm `latest` is 6.11.2 (WP-DEC-02 must re-measure). (7) D-URLSTATE lists `vignette|v` for T0; chapter 02's reader ignores it (every emitter also sends `tick`).

**Exit criteria (Phase-0 exit, measurable):** the owner has answered every class-B ADR and accepted or overridden the rest; every WP in every chapter cites an ADR id; no report item says "depends on owner decision" without a linked ADR; the 17 WP-DEC packages are scheduled; ADR files are committed (WP-DEC-17).
