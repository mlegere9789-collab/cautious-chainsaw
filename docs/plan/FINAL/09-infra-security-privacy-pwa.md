# 09 - Infrastructure, Security, Privacy, PWA and Operations (WP-INFRA-01..34)

Status: PLAN ONLY, 2026-09-30; nothing built or deployed. Obeys `01-decision-register.md` (ADR ids cited per WP; deviations only in section 9). Not legal advice.
Evidence tags: **[V]** re-verified by me this session (live curl, `bundle.pretty.js` grep, DEPLOY_DIR); **[S id]** specialist or verifier; **[E]** estimate; **[U]** unverified (section 7). Effort: S < 0.5 d, M 0.5-2, L 2-5, XL > 5 (AI-assisted person-days, excluding waiting, counsel fees, owner minutes). Lines are `bundle.pretty.js` unless a file is named. Primary source: `plan-work/infra-netlify.md` (39 findings, appendices A-I; cited as "Ref X"), plus deploy-history, qa-ci, pages-C, seo-growth and both critics.

---

## 1. A+ exit criteria for this domain (measurable, desktop AND mobile)

Header, DNS and policy checks are device-independent: run with desktop (1440x900) and mobile (375x812 touch) UA strings and assert identical. Mobile-specific rows say so.

| # | Criterion | Measured by | WP |
|---|---|---|---|
| E1 | securityheaders.com A+ and MDN Observatory >= 100 on the apex, a static page, `/embed`, the app page | `observatory.mjs` plus securityheaders scan, archived | 10,17,18,33 |
| E2 | CSP enforced on 100% of HTML incl. 404 and `/embed`; end state has no `unsafe-inline`/`unsafe-eval` in `script-src`/`style-src` (interim hashes; `style-src-attr` exception documented); `frame-ancestors` everywhere (`*` only on `/embed`); reporting live | `check-headers.sh` over the sitemap and 3 error paths | 16-18 |
| E3 | 0 CSP violations in the crawl (25 pages x 2 viewports x scripted flows) and 0 new signatures in 14 days of production reports | `csp-crawl.mjs`, ingest digest | 15-17 |
| E4 | One rule per header name on every URL class; HP suite 100% on preview and production; `/embed` frameable cross-origin on 3 engines, nothing else | `verify-headers-invariant.mjs`, framing page | 10,14,32 |
| E5 | Lighthouse Best Practices 100 (desktop, mobile) on `/` and the app page (`csp-xss`, `inspector-issues`, `origin-isolation`, `errors-in-console` pass; `valid-source-maps` passes or a dated exception) and the Performance `redirects` audit passes | LHCI on preview, weekly on production | 16-18,22 |
| E6 | PWA (M): one Document request on first visit; 0 SW-triggered reloads, updates never reload without a click; kill-switch drill green <= 90 days; 0 installability errors; opaque icons | `service-worker.spec` (qa-ci A.4), CDP `Page.getInstallabilityErrors`; Android and iPhone per release candidate | 22-25 |
| E7 | Privacy: every origin contacted in a full session and every CSP host is disclosed; every storage key disclosed; 0 third-party frame requests before a click; GPC/DNT sends nothing; counsel sign-off for gated items | `inventory-check.mjs` (ORG-01) | 26,27 |
| E8 | Keys: Mapbox allow-list = apex, public scopes, separate dev/preview tokens, alerts, one `pk.` literal; Google key referrer- and API-restricted with USD 1 alert; evidence <= 90 days; nightly contract tests | KEY-01/02, `grep -R "pk\.eyJ" dist` | 3,4 |
| E9 | DNS and mail: account-bound CAA; GSC and Bing verified by TXT; DMARC `quarantine` or `reject` after 4 clean weeks; mail to every alias arrives; `security.txt` Expires >= 60 days; domain paid to >= 2031 | `dns-check.mjs`, RDAP | 1,20,21 |
| E10 | Continuity: restore drill <= 2 h and <= 90 days old; second remote = primary; delegate drill; lite snapshot RTO <= 4 h; vendor register with a fired alert; ops <= 10 h/month | `ops/drills.md`, CI mirror job | 6-8 |
| E11 | Telemetry and bots: one first-party endpoint; p75 per template with n >= 100 humans/7 d, within 15% of Netlify RUM, owner runs absent, no IP, id, UA, query or free text stored; a headless run makes 0 Mapbox style/tile requests before a gesture; Mapbox loads < 70% of the free tier; no geo-blocking | ingest tests, Playwright probe, usage export | 7,15,29 |
| E12 | Schools and hostile environments (desktop and M): Classroom mode passes with only the site and `api.mapbox.com`; IAB UA matrix has 0 page-originated console errors and a working hand-off; translate, forced-dark, blocker and Referer-stripping runs green; iPhone SE, Samsung Internet and Chromebook per release candidate | Playwright UA emulation, route blocking | 30,31 |
| E13 | Each row cites a non-author artefact before any public "A+" claim (D-EVIDENCE) | scorecard link check | 33 |

---

## 2. Verified current state (facts only; corrections applied)

Live re-check [V]: `/` sends `X-Frame-Options: DENY`, one Report-Only CSP (`unsafe-inline`, no `report-uri`), Permissions-Policy granting camera/geolocation/motion to `self`, HSTS 1 y preload-eligible. `/embed.html` sends XFO DENY AND `frame-ancestors *` AND the inherited Report-Only; `/embed` only XFO DENY. `/diagnostics` is 200 (the force rule matches only `.html`); `/api/csp-report`, `/.well-known/security.txt`, `/llms.txt` are 404.

- **Config.** `netlify.toml`: 204 lines, `publish = "."`, 20 redirects (19 scanner rules incl. two invalid `*` patterns, plus `/diagnostics.html` force 404), no `[build.processing]`, so Pretty URLs rewrites authored `.html` hrefs while canonical, `og:url`, sitemap (21 `<loc>`, no `lastmod`) and JSON-LD say `.html` [S -11]. Rules match the as-requested path; Netlify cannot unset a header [S -02]. Netlify injects its RUM script into every HTML response (inline bytes unchanged). Inline code: 29 executable inline scripts (plus 1 JSON-LD), 27 `<style>` blocks (26 outside `index.html`), 51 `style=` attributes, 2 handlers (`index.html:57`, `report.html:67`) [V regex over the 27 pages, 2026-09-30; the specialist counted 27/25]; no `eval` [S -01/-03].
- **SW.** `sw.js` (`gbg-v5`): `skipWaiting` + `claim`, 2 of 5 hashed names hard-coded, caches any response incl. 404/500. `index.html:263-268` `controllerchange -> location.reload()` doubles every first load (Documents at 1 and 909 ms, `redirects` audit 9,066 ms, two Mapbox `sku` on mobile) [S -21]; fixing it alone can lower the lab mobile score (64 to about 51) [S perf-cwv-01/02].
- **Keys.** Mapbox token #2 (`...Eg5Q`): 11 literals (`:97210`, `:102899`, 9 pages); token #1 revoked, its `.env.local` copies sit in four Downloads folders [S deploy-history sec.8]. **X1 corrected:** tiles, TileJSON, geocoding, static return 403 for no, foreign, localhost, `netlify.app` and preview Referers and 200 for production; style, sprite, glyph return 200 for all. Allow-list and scopes UNVERIFIED. Google Embed key `:110610`: paid APIs REQUEST_DENIED, referrer restriction UNVERIFIED. Attribution off at `:102988`, `:110777`.
- **Third parties and privacy.** Street View iframe per walkthrough stop (`:110660-110665`), 3 Google preconnects (`index.html:47-52`), NPS video iframe (`:100461-100466`), PeerJS broker + Google STUN + PeerJS TURN + jsDelivr on Watch Together, Mapbox telemetry with an anonymous ID (`:54238-54290`; the `performanceMetricsCollection` Map option EXISTS in the deployed 3.24.1 and defaults to true (`:91907`, used at `:94340` to send the load-metrics event), so setting it false removes that one event only [V; the register-time claim that it is absent was wrong; WP-PERF-10 already plans it as a Mapbox init trim, subject to the Product Terms check]; no page-level switch for the map-load and anonymous-ID events is known [U]). `privacy.html:21` (Sep 7 2026) misplaces Street View and omits NPS, PeerJS/STUN/TURN/jsDelivr, telemetry, AR permissions, Netlify analytics and the storage inventory (Appendix D) [S -36]. One Gmail address sits in `privacy.html:47`, `terms.html:42`, `site-nav.js:194` and the timeline credit (`:112359-112366`) [V].
- **Assets, hosts, DNS.** `screenshots/day1.png` = `day3.png` (undecodable), `og:image` on 21 pages; icons 22-24% alpha-0, `any maskable`, `orientation: landscape` [S -24/-25]. `friendly-lolly-da85c0.netlify.app` serves the full site; old permalinks serve `landing.html` (USD 9.99 pricing) and `diagnostics.html`. N1 corrected: Netlify serves paths case-insensitively (hygiene only; SW and HTTP caches key on exact case). Netlify DNS: no AAAA, CAA, MX, TXT, DNSSEC; Name.com, registered 2026-06-13, expires 2027-06-13, transfer-locked; TLS Let's Encrypt to 2026-11-10; HSTS preload `unknown`, eligible; Observatory B/75 [S].
- **Watch Together.** Stored DOM-XSS (`:172`), guessable 5-letter codes, unbounded connections, no SRI; severity medium-low (guest captions use `textContent`) [S -07].
- **Unknown from outside:** Netlify plan and credits (Free = 300 credits, hard pause), Mapbox and Google console state, account 2FA, `pretty_urls=false` on the deploy path.

---

## 3. Work-package table

Tier per D-SCOPE-TIERS; each WP names its ADRs. Line: **A** = A-line (no critical/high defects, CWV green), **P** = A+ line, **D** = deferred. Effort is gross and includes the WP-DEC it implements (WP-DEC-05/06/07/08/13/15 are NOT additional).

| WP | Title | Tier/Line | Effort | Depends on |
|---|---|---|---|---|
| 01 | Accounts, recovery, domain hardening | 1/A | M 0.5-1 | - |
| 02 | Netlify plan, credits, deploy discipline | 1/A | S 0.25-0.5 | - |
| 03 | Mapbox token programme | 1/A | M 1-2 | 01 |
| 04 | Google key, third-party frames | 1/A | M-L 1.5-3 | 01 |
| 05 | Secret hygiene, supply chain | 1/A | M 0.5-1.5 | 09 |
| 06 | Backup, restore, continuity | 1/P | L 2-4 | 09,01 |
| 07 | Vendor register, exit triggers | 1/P | M 0.5-1.5 | 03,04 |
| 08 | Monitoring, alerting, ops ceiling | 1/A | M 1-2 | 02 |
| 09 | Git deploy parity (S0), environments | 1/A | L 2-4 | source recovery |
| 10 | Header architecture, generator | 1/A | L 2-3.5 | 09; DEC-05 |
| 11 | Caching per class, hashed naming | 1/A | M 1-2 | 10 |
| 12 | Canonical URL, redirect matrix | 1/A | M-L 1.5-3 | 10,20; DEC-05 |
| 13 | Publish-tree hygiene, stale deploys | 1/A | S 0.25-0.5 | 09 |
| 14 | Embed class fix | 1/A | M 0.5-1.5 | 10 |
| 15 | Collector `/api/ingest` | 1/A | L 3-5 | 09,26 |
| 16 | CSP stages 0-2 | 1/A | L 2-3.5 | 10,15 |
| 17 | CSP enforcement by class | 1/P | L 2-3.5 | 16 |
| 18 | CSP end state, TT, source maps | 1/P | M-L 1.5-3.5 | 17; Astro |
| 19 | Third-party script origins | 1/A | M 0.5-2 | 10 |
| 20 | DNS, verification, HSTS preload | 1/A | M 0.5-1.25 | 01 |
| 21 | Contact architecture, security.txt | 1/A | M 1-2 | 01,20 |
| 22 | R0 service worker, kill switch | 1/A | M-L 1.5-3 | 09; R0 naming |
| 23 | Manifest, icons, OG integrity | 1/A | M-L 1.5-3 | 22 |
| 24 | Offline pack (Workbox) | 2/D | L 4-6 | 22; On-site mode |
| 25 | Cutover infrastructure | 1/P | M 1-2 | 22,12 |
| 26 | Interim privacy, inventory | 1/A | M 0.5-1.5 | - |
| 27 | Legal pack, counsel, data controls | 1/P | L 3-5 + counsel | 26,21 |
| 28 | Watch Together hotfix | 3/A | M 0.5-1 | 19 |
| 29 | Bot and traffic strategy | 1/A | M 0.5-1.5 | 15 |
| 30 | School-network readiness | 1/P | M-L 1.5-3 | 27 |
| 31 | In-app browser, hostile matrix | 1/P | M 1-2 | 32 |
| 32 | Infra CI gates | 1/P | L 2.5-4.5 | 09,10 |
| 33 | Security evidence dossier | 1/P | M 0.5-1.5 | 16-18,32 |
| 34 | Historian reservations | 1/A | S 0.25-0.5 (+3-5 deferred) | 10,22 |

**Totals (gross, [E]):** A-line 23.75-48.75 d; A+ line 15.5-30.5 d; deferred (WP-24) 4-6 d; all 34: 43.25-85.25 d, excluding the conditional Watch Together relay (3-5 d), the deferred Historian function (3-5 d) and counsel fees. **Minimum path** (01-03, 05, 09-14, 20-22, 23 minimal, 26, 28) is about 14-29 d.

---

## 4. Work-package specifications

Each WP: **Covers** specialist ids | Audit | ADR | Tier/Line | Effort; then Fix, Accept (automatable), Moves, Risks. "Ref X" = section X of `plan-work/infra-netlify.md` (tested text or code).

### A. Access, keys, secrets, continuity

#### WP-INFRA-01 Accounts, recovery, domain hardening (owner-executed)
**Covers** infra-netlify-39, -33, -34 (registrar), seo-growth-07, critic-2 bus factor | D-CONTINUITY | 1/A | M 0.5-1 d. Account takeover is the likeliest compromise path [-39, UNVERIFIABLE from outside].
**Fix.** Passkeys or TOTP plus offline recovery codes on mailbox, Netlify (team-enforced), Name.com, Mapbox, Google Cloud, GitHub, GSC, Bing; a private unpublished recovery mailbox; Name.com auto-renew, term to >= 2031-06-13, transfer lock kept, second contact, calendar 2027-05-13; confirm the certificate renewed on 2026-10-25 (expected about 10-11); delegate with password-manager emergency access; minimal Netlify PATs.
**Accept.** Dated checklist in `ops/inventory.yaml`; RDAP expiry >= 2031-06-13 (monthly CI); no Gmail in HTML (WP-21). **Risks** passkey lockout.

#### WP-INFRA-02 Netlify plan, credits, deploy discipline
**Covers** infra-netlify-30, deploy-history-33 | D-CI-HOST | 1/A | S 0.25-0.5 d. Free = 300 credits, hard pause; production deploy 15 credits [-30]; plan UNVERIFIED.
**Fix.** Record plan, balance, projection; alert at 70%; batch production deploys weekly until known; `ops/deploys.tsv` (deploy id, date, SHA, reason, credits) so RUM/GSC shifts are attributable; check whether previews and branch deploys are metered [U].
**Accept.** Plan and balance in `ops/inventory.yaml`; a fired alert test. **Risks** unknown plan changes cadence.

#### WP-INFRA-03 Mapbox token programme
**Covers** infra-netlify-18, -20 (attribution: T0 patch, tested in WP-32), qa-ci-25, pagesA-38, mobile-20 | X1 | D-MAP-ENGINE, WP-DEC-15 | 1/A | M 1-2 d. Restricted token (X1 corrected); risks: unknown allow-list, blank maps for dev/preview and Referer-stripping users, 11 literals.
**Fix.** (1) Dashboard (Ref F.1): allow-list exactly `gettysburginteractivemap.com` (subdomains inherit; never `netlify.app` or `localhost`); scopes `styles:tiles`, `styles:read`, `fonts:read`. (2) `gtbg-dev` (URL `localhost`) and `gtbg-preview` (URL `netlify.app`; minimum scopes; monthly rotation; it authorises every Netlify site). (3) One config module for the 11 literals (Astro `PUBLIC_MAPBOX_TOKEN` per context; interim `assets/config.<hash>.js`); the two bundle literals (`:97210`, `:102899`) need the patch runner, outside the closed T0 list. (4) Rotate only after (3): wait 72 h (tile TTL 12 h plus stale tabs), delete the old, confirm 401. (5) Alerts at 50/70/90% of 50,000 loads; look for a spend cap [U]. (6) App WP: 401/403 tiles show a notice and post `map_error{status}` to WP-15. (7) KEY-01 nightly: no Referer 403, `evil.example` 403, localhost 403, production 200, `/styles/v1` 200.
**Accept.** KEY-01 green; `grep -R "pk\.eyJ" dist` finds 1 file; the dev token works only from localhost. **Moves** Security B to A. **Risks** rotating before (3) strands stale clients.

#### WP-INFRA-04 Google key programme, third-party frames
**Covers** infra-netlify-19, deploy-history sec.8 | X2, X5 | D-SOURCE (amendment), WP-DEC-15 | 1/A key, P facade | M-L 1.5-3 d.
**Fix.** (1) Owner, 20 min (Ref F.2): key `AIzaSyC-1e...PF8` (`:110610`) gets referrer restriction `https://gettysburginteractivemap.com/*` and `https://www.gettysburginteractivemap.com/*`, API restriction Maps Embed only, other APIs off, USD 1 budget alert; test from a non-allowed origin in a real browser. (2) R0 head edit (WP-22): delete the 3 Google and 2 dead tile preconnects (`index.html:47-52`, `:43-44`). (3) Walkthrough iframe (`:110660-110665`): click-to-load "Load Street View (contacts Google)", then `loading=lazy`, `referrerpolicy=strict-origin-when-cross-origin`, `allow=fullscreen`, `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"`. (4) NPS frame (`:100461-100466`): same plus a disclosure line; frame or link-out is an owner decision (default link-out on compact layouts). (3)-(4) are bundle patches outside the closed T0 list: amend D-SOURCE, or defer to cutover and rely on disclosure (WP-26) plus (1)-(2).
**Accept.** 0 requests to google.com, gstatic.com, googleapis.com until the button is pressed; paid APIs still REQUEST_DENIED. **Moves** Security, Privacy, INP. **Risks** the sandbox breaks Embed (test).

#### WP-INFRA-05 Secret hygiene, supply chain
**Covers** infra-netlify-39, deploy-history sec.8/-34, qa-ci-25, prov-recon T-03 | D-CONTINUITY | 1/A | M 0.5-1.5 d.
**Fix.** Never import the four Downloads folders holding `.env.local` (FINAL_v24, FIXED_v25, COMPLETE_FIXED (1), v2_fixed); `gitleaks detect --no-git` on the tree and `gitleaks git` on history before any import; pre-commit gitleaks plus a CI job [U: push protection needs a paid plan]; `publish` never `.`. Renovate: patch auto-merge only on green CI, Mapbox minors quarterly behind the parity harness, Actions pinned by SHA, `npm ci --ignore-scripts`, `npm audit --omit=dev` and osv-scanner gate on high, dependency budget in CI. Netlify secrets flagged secret, scoped Functions/Runtime, per context.
**Accept.** gitleaks clean incl. history; a seeded `sk.eyJ...` commit is blocked locally and fails CI (scan `sk\.eyJ`, not `sk-` [-34]); `grep -R "sk\.eyJ\|ANTHROPIC" dist` empty. **Risks** audit noise (gate high only).

#### WP-INFRA-06 Backup, restore, continuity
**Covers** critic-2 backup/DR/bus factor, deploy-history sec.7, prov-recon-02 | D-CONTINUITY, WP-DEC-13 | 1/P | L 2-4 d.
**Fix.** (1) 3-2-1: private GitHub, second remote (GitLab or a bare repo on an external disk) via scheduled `git push --mirror`, monthly encrypted `git bundle` to cloud storage. (2) Large artefacts (OCR cache about 75 MB, golden sets, zip archive with `ARCHIVE_MANIFEST.tsv`) via git-lfs or a hashed archive. (3) Secret-free `ops/inventory.yaml`: Netlify settings, env-var NAMES, DNS export, registrar, key restrictions, token inventory (no values), GSC/Bing owners, alert routes. (4) Quarterly restore drill on an empty machine (clone, `npm ci`, build, `netlify deploy --create-site`, WP-32 probes) <= 2 h. (5) Static "lite" snapshot (landing, Text/Chronicle route, legal, corrections) for a second static host honouring `_headers` [U]; cut over by editing apex/www records in Netlify DNS (an NS move takes about 48 h); RTO <= 4 h, drilled twice a year. (6) Continuity letter: locations, who may do what, 5-year keep-alive, sunset plan (static archive with a "not updated since" banner).
**Accept.** `ops/drills.md` entry <= 90 days; CI proves second-remote HEAD equals primary; the bundle test-restores; the delegate passes a drill; the lite snapshot passes the HP subset on the second host. **Risks** skipped drills.

#### WP-INFRA-07 Vendor register, exit triggers, cost breakers
**Covers** critic-2 vendor risk, D-CONTINUITY (6) | 1/P | M 0.5-1.5 d.
**Fix.** Commit `ops/vendors.yaml` (Appendix B); monthly review (WP-08); test alerts (Mapbox usage, Netlify credits, GitHub minutes). Cost breaker per D-MAP-ENGINE: bots and headless sessions get a poster until a gesture.
**Accept.** A test alert fires; a headless Playwright run makes 0 `api.mapbox.com/styles` or tile requests before input. **Risks** triggers are proposals [E] until ratified.

#### WP-INFRA-08 Monitoring, alerting, operations ceiling
**Covers** infra-netlify-33, qa-ci-17 (infra half), critic-2 ops load | D-CONTINUITY (7) | 1/A | M 1-2 d.
**Fix.** (1) One external HEAD monitor (no JS or RUM; whether Netlify Analytics counts HEAD is [U]) on `/`, `/manifest.webmanifest`, a data file, `/version.json` plus the 6-hourly `prod-probe` (qa-ci SYN-01). (2) Certificate alerts 20/10/5 days (section 9), domain 90/30/7; HSTS preload status; monthly Observatory; weekly LHCI on production; deploy notifications. (3) One alert channel (owner decides), quiet hours for warnings, a runbook link in each alert. (4) Ops-duties table and maintenance mode (Appendix B), <= 10 h/month excluding content; AI-assisted-code contract (runbooks runnable in 30 minutes without an AI session, tests as safety net); 30-minute monthly review.
**Accept.** A deliberate 404 on a data file in a preview alerts within 5 minutes; all alerts reach one channel; each runbook has a dated dry-run. **Risks** alert fatigue; Actions minutes [U].

### B. Deploy platform and configuration

#### WP-INFRA-09 Git-connected deploy parity (S0), environments
**Covers** infra-netlify-28 (Functions need no Git [verifier]), qa-ci-01/19 (Netlify half); source recovery is NOT here | N1, P6 | D-CI-HOST, D-ORDER | 1/A phase A, P phase B | L 2-4 d.
**Fix.** *Phase A (S0, before R0):* private repo; commit the Netlify "source" zip tree as `legacy/dist` (byte-identical, sha256 manifest); production branch `production` (fast-forwarded by manual `release.yml`), `main` = staging; `publish = "legacy/dist"`, no build command; prove parity on a branch deploy by comparing per-file hashes in Netlify's deploy file list with the manifest [U: files API]; never redeploy the downloaded "deploy" zip. *Phase B (DG-2):* `publish = "dist"`, `pretty_urls = false`, per-context env vars, previews with `noindex` and the Netlify Drawer off (it injects scripts and frames `app.netlify.com`, breaking zero-violation gates [MISSED-1]), generated `_headers`/`_redirects`, `version.json`, rollback = "Publish deploy" (API `restore` then `unlock` [U]). Branch protection needs a paid GitHub plan for private repos [qa-ci]: use `release.yml` as sole writer of `production` plus Netlify "Stop auto publishing". Netlify emits no `deployment_status` for previews [qa-ci-19]: poll the commit status.
**Accept.** Manifest equals the deploy file list; a push to `main` gives a `noindex` staging URL; rollback drill <= 2 minutes. **Risks** the bottleneck is source recovery, not Netlify.

#### WP-INFRA-10 Header architecture and generator
**Covers** infra-netlify-02, -04, -05, -14, -17; qa-ci-13/19; pages-C-45, -86; deploy-history-19 | X3, X4 | D-CSP, D-URL | 1/A | L 2-3.5 d. Netlify cannot unset a header, rules match the as-requested path, same-name merge order is undocumented. **Invariant I1: for any URL each header name is emitted by at most one matching rule.**
**Fix.** (1) `scripts/gen-netlify-config.mjs` (from the tested `tmp-infra-netlify/gen-netlify-config.mjs`) writes `dist/_headers` and `dist/_redirects` from `pages.manifest.json` keyed on `CONTEXT`; `netlify.toml` holds no `[[headers]]` or `[[redirects]]`. Before Phase B there is no build: in Phase A the generator runs locally or in CI and its output is committed as `_headers`/`_redirects` inside `legacy/dist` (the publish dir), and the toml rules are removed in the same commit (WP-T0-15 does this for R1). (2) `/*` carries only names identical everywhere: nosniff, `Referrer-Policy: strict-origin-when-cross-origin` (commented: never tighten, Mapbox/Google restrictions need the Referer), HSTS, COOP `same-origin`, `Reporting-Endpoints` (once WP-15 is live); kept so 404s and static files keep HSTS/nosniff (qa-ci M1); recurse into `/next/*`, `/classic/*`. (3) Per HTML path, both spellings until S1: CSP (WP-16/17), Permissions-Policy per class (Appendix A; R1 keeps today's value unchanged as WP-T0-15 specifies, and the per-class narrowing ships after DG-2 with D-CSP's least-privilege default), `X-Frame-Options: SAMEORIGIN` on non-embed only. (4) Non-production puts `X-Robots-Tag: noindex, nofollow` in `/*`, so every per-path noindex row (`/data/*`, `/hx/*`, `/.well-known/*`, `/embed`, pages the SEO chapter marks noindex) is production-only; Permissions-Policy stays per class, never in `/*`. (5) COEP never (Street View); CORP skipped. (6) `verify-headers-invariant.mjs` expands every block against 60 sample URLs (both spellings, `/assets/x`, `/data/x`, `/hx/x`, `/api/x`, `/.well-known/x`, 404s) and fails on a repeated name. (7) Delete the 19 scanner rules and the `/diagnostics.html` rule (unmatched paths already give the branded 404 [S -14]).
**Accept.** Invariant test and golden snapshot green; `check-headers.sh` (Ref D.4) plus qa-ci HP-01..15 on preview. **Moves** Security B to A+ (with 16-18). **Risks** `_headers` versus toml precedence and `pretty_urls=false` unverified (WP-DEC-05 first).

#### WP-INFRA-11 Caching per asset class, hashed naming
**Covers** infra-netlify-13, -16, deploy-history-01 (naming), qa-ci HP-08/09 | P3, P4, G1 | D-ORDER | 1/A | M 1-2 d.
**Fix.** HTML `no-cache` (keeps bfcache; `no-store` breaks it). `/assets/*` `public, max-age=31536000, immutable` plus a CI rule "never reuse a filename for other bytes" (compare with the last production `asset-manifest.json`). New or changed data ships as `/data/<name>.<hash>.json`, immutable, listed in a JSON block inlined in the HTML; unchanged legacy data keeps `max-age=3600` (interim `stale-while-revalidate=86400`; drop `Netlify-CDN-Cache-Control durable`, functions-only [verifier]). `/hx/*` immutable plus noindex. Fingerprint icons, `site-nav.*`, `icons.svg`, screenshots; until then no `immutable` on un-fingerprinted `/icons/*`. `/sw.js` stays `no-store` (HP-08); `/flags.json`, `/version.json` `no-cache`; manifest, robots, sitemaps 1 h; guide `/guide/user-guide-<ver>.pdf` `inline`, immutable (G1: today `attachment`).
**Accept.** `curl -sI` matrix per class; a second visit within 24 h makes 0 conditional requests for hashed data; CI fails on same-name/different-bytes. **Moves** repeat-visit LCP/FCP. **Risks** the legacy bundle hard-codes data paths.

#### WP-INFRA-12 Canonical URL and redirect matrix (train S1)
**Covers** infra-netlify-11, -15, -35; seo-growth-03 (config half); deploy-history-11; pages-C-86 | T3, E5 | D-URL, D-NETLIFY-DOMAIN | 1/A | M-L 1.5-3 d incl. WP-DEC-05.
**Fix.** After WP-DEC-05 confirms `pretty_urls=false` and no loop: generated `_redirects` `/index.html / 301!`, `/landing.html / 301!` (the indexed USD 9.99 page 404s today), one `301!` per page in `pages.manifest.json` (27 today, 25 after WP-13 removes `diagnostics` and `unit-rendering-reference`, plus any new trust pages; `*` is valid only at a path end), and `https://friendly-lolly-da85c0.netlify.app/* https://gettysburginteractivemap.com/:splat 301!` (plus http) after trying the primary-domain setting. No wildcard `.html` rule, so `google0dca4879c9657741.html` is never redirected. Versioned `redirects/v1.json`; rollback by reverting it. Same deploy (SEO chapter owns the edits): canonical, `og:url`, `twitter:url`, JSON-LD, sitemap `<loc>`, every internal href (27 files, `site-nav.js`, 10 `/index.html` back links, emitters in documentary, education, embed, search). Previews and branch hosts are separate labels and `noindex`; `http://www` stays two hops.
**Accept.** `redirect-matrix.mjs`: 27 pages x {`.html`, extensionless, trailing slash, upper case, `?query` kept, `http`, `www`, `netlify.app`} give one 301 (two for `http://www`) to the canonical URL with matching `rel=canonical`; the GSC file returns 200. **Risks** redirect loop; one identity-level SEO change per train, 48 h clear of R1.

#### WP-INFRA-13 Publish-tree hygiene, stale deploys
**Covers** infra-netlify-12, -14, deploy-history-11/-34, pages-C-90/91 | X4 | 1/A | S 0.25-0.5 d. Same removal as WP-PAGEC-34 (this WP owns the gate and the stale-deploy clean-up; count once).
**Fix.** Remove `diagnostics.html`, `unit-rendering-reference.html`, the orphan `assets/InterpolationWorker-ufiwa2-e.js` (referenced nowhere) and `apple-touch-icon-precomposed.png` (or 301 it; iOS probes [U]). A pre-deploy gate fails on forbidden files, corrupt images, template text (scoped to rendered text and JSON string values [-34]), same-name assets, secrets. After S0 the owner deletes every non-current Netlify deploy, keeping the previous two known good.
**Accept.** 404 for `/diagnostics` and `/unit-rendering-reference(.html)`; Deploys list <= 3. **Risks** deleting deploys before the archive exists.

#### WP-INFRA-14 Embed class fix
**Covers** infra-netlify-02, deploy-history-19, pages-C-87/88, qa-ci HP-06/07 and EMB-01, MISSED-4 | X4 | D-CSP, D-LICENSE | 1/A | M 0.5-1.5 d. Same work as WP-PAGEC-31 (this WP owns the generator rows and the CSP; count once, chapter 15 RM-16); the embed docs, generator and oEmbed pages are WP-PAGEC-32/33. Severity medium-low: `frame-ancestors *` already overrides XFO on `/embed.html`; real defects: `/embed` unframeable, contradictory headers, leaking Report-Only, URL documented only in a comment (`embed.html:38-39`).
**Fix.** *Path A (default):* WP-10 emits for `/embed` and `/embed.html` one CSP with `frame-ancestors *`, `default-src 'none'`, hashed script and style, `connect-src 'self' https://ingesteer.services-prod.nsvcs.net` (RUM runs when top-level), `base-uri 'none'`, `form-action 'none'`, plus `X-Robots-Tag: noindex` (production); no XFO, no inherited CSP. *Path B (only if WP-DEC-05 shows an inherited header still leaks):* Edge Function on `['/embed','/embed.html']`: `const r = await context.next(); r.headers.delete('x-frame-options'); r.headers.delete('content-security-policy-report-only'); r.headers.set('content-security-policy', EMBED_CSP); return r;` (needs a CLI/Git build and request credits; ordering versus header rules [U]). Framing test page (Ref C.5) in Playwright on 3 engines: `/embed` and `/embed.html?vignette=V-010` render; `/` and `/privacy` are blocked (`net::ERR_BLOCKED_BY_RESPONSE` in Chromium). Widget subdomain: decide before HSTS preload (WP-20).
**Accept.** `curl -sI /embed /embed.html`: one CSP, `frame-ancestors *`, no XFO; other pages `frame-ancestors 'self'`; framing test green x3. **Risks** verify the docs vignette id (V-018 is Cushing's Battery, V-010 Chamberlain [pages-C-88]).

### C. Collector, CSP, script origins

#### WP-INFRA-15 First-party collector `/api/ingest`, Functions baseline
**Covers** infra-netlify-10, -17, -31 (limits, kill switch), -32 (vitals); qa-ci-16; perf-cwv-17 (client, perf chapter); MISSED-2 | T2, P1, X3 | D-TELEMETRY | 1/A | L 3-5 d.
**Fix.** (1) `netlify/functions/ingest.mts` (Functions v2): `config = { path: '/api/ingest', method: 'POST', rateLimit: { windowLimit: 200, windowSize: 60, aggregateBy: ['ip','domain'] } }` (200 because a class of 30 shares one NAT IP [pages-C-47]); uses 1 of the 2 code rule slots on Free/Personal, the second is reserved for WP-34 (the Watch Together relay of WP-PAGEC-17 would want it too: only one of the two conditional functions can exist). (2) Typed messages `vitals|error|csp|event`, per-type field whitelist and ranges, no spreading of client keys (qa-ci M4), 2 KB cap (8 KB for a csp batch), `Sec-Fetch-Site: same-origin` required except on `csp` [U]. (3) Stored: normalised path (no query, `.html` folded), template and device class, metric/value/rating, LCP element selector, INP target and phases, top CLS source, versions, error class, `map_error` status; never IP, id, cookie, UA, query or free text. UA is checked in memory to drop `HeadlessChrome|Lighthouse|GTmetrix|Pingdom|PTST|Prerender`; the client sends nothing on `navigator.webdriver`, prerender, hidden-at-load, GPC or DNT. (4) Blobs `agg/<day>/<type>/<class>/<device>` histograms: aggregate-on-write with conditional retry if supported [U], else an identifier-free buffer compacted by a scheduled function and purged within 24 h; 13-month retention. (5) CSP reports (`report-uri .../api/ingest?type=csp`, `report-to csp`): drop extension schemes and `source-file`-less inline reports; dedupe per `directive|host|path|day` (base `tmp-infra-netlify/csp-report.mjs`). (6) A scheduled summary is pulled by CI into `ops/exports/`, no public read endpoint; `INGEST_ENABLED=false` kill switch (always 204). (7) Ships by `netlify deploy` after WP-26; order vitals, errors/CSP, events.
**Accept.** A seeded violation appears within 60 s; oversize 413; 201st request/min/IP 429; a forged `kind` key is ignored; an owner Lighthouse run is absent; GPC-on sends nothing; a schema test rejects extra keys. **Risks** Blobs/Functions v2 shapes [U]; blocker users are invisible (record in `docs/traffic-quality.md`).

#### WP-INFRA-16 CSP stages 0-2
**Covers** infra-netlify-01 (0-2), deploy-history-18, qa-ci-13, pages-C-11, MISSED-1/2 | X3, P7 | D-CSP | 1/A | L 2-3.5 d.
**Fix.** *Stage 0:* per-class Report-Only (Appendix A): drop `fonts.googleapis.com`, `fonts.gstatic.com` (no font loads), `*.tiles.mapbox.com`, `events.mapbox.cn`; add the RUM host to `connect-src` (Lighthouse `inspector-issues`); move `cdn.jsdelivr.net` and `0.peerjs.com` to the Watch Together class; `frame-src https://www.google.com/maps/embed/ https://www.nps.gov/media/video/` on the app class only (today's `www.google.com` alone blocks the NPS panel); add `frame-ancestors`, `form-action`, `manifest-src`, `upgrade-insecure-requests`, reporting. *Stage 1 (no rendering risk; ships with WP-10 in R1):* enforced second header `frame-ancestors 'self'; base-uri 'none'; object-src 'none'; form-action 'self'` on every HTML path (embed `*`); no page uses `<base>`, and the only `<form>` is in `historian.html` [V grep]. This header restricts no script or style source, so D-CSP's "static pages first, `/map` last" ordering applies to `script-src`/`style-src` enforcement (WP-17), not to it. *Stage 2:* `csp-crawl.mjs` on a preview (Drawer off, ignore Netlify hosts) plus Street View and video clicks, Watch Together in two contexts, AR with fake media, a 3 s export; fix what remains (`report.html:67`, `site-nav.js:71`, `index.html:651`); read 7 days of production reports.
**Accept.** Crawl `violations: 0`; no new signature class for 7 days; enforced mini CSP on every sitemap URL; `inspector-issues` passes. **Risks** needs WP-15 data; preview scripts cause false positives.

#### WP-INFRA-17 CSP enforcement by class (hash-based)
**Covers** infra-netlify-01 (3a-3c), -03 (interim), deploy-history-18 | D-CSP | 1/P | L 2-3.5 d.
**Fix.** The generator hashes each inline script/style per page (normalise CRLF first: 11 pages use CRLF, browsers hash LF [-03]); JSON-LD excluded; interim `VENDOR_CDN=1`, `STYLE_ATTR=1`; no `strict-dynamic` (the injected RUM tag has no nonce), no nonce extension (an Edge Function per HTML view). Order: 3a legal, 404, static tool pages after 7 clean days; 3b AR, map sub-pages, cinematic, Watch Together after crawl, two-browser session, real-phone AR; 3c the app page LAST after 14 clean days with RUM beacons still 2xx. Keyed by page class, so S3's move to `/map` changes nothing. `CSP_MODE=enforce` is a generator switch (one production deploy); rollback = Publish previous deploy.
**Accept.** No `unsafe-inline` in `script-src`; crawl 0; Observatory >= 100 after 3c; CSP Evaluator no High. **Risks** an inline write the crawl misses (Mapbox popup `innerHTML` with `style=`), hence a documented `style-src-attr` exception on the app class; `'wasm-unsafe-eval'` only if the crawl shows it.

#### WP-INFRA-18 CSP end state, Trusted Types, source maps (after Astro)
**Covers** infra-netlify-03 (end), -06, -01 (4-5), D-CSP source-map rule | P6 | D-CSP, D-SITEGEN | 1/P | M-L 1.5-3.5 d.
**Fix.** Page code becomes external hashed files: `script-src 'self'`, `style-src 'self'`, delete hashes and `STYLE_ATTR`; 40 markup and 11 JS-string `style=` become classes or CSSOM; `site-nav.js:71` sprite `hidden`. Trusted Types: Report-Only `require-trusted-types-for 'script'; trusted-types default gtbg-static`, one `setHtml()` for the about 24 data-interpolating sinks, enforce on static pages after 14 empty days (app page only if React/Mapbox allow). Source maps: first-party maps with `X-Robots-Tag: noindex`, vendor `sourcesContent` stripped; the self-hosted map chunk ships its npm `.map` stripped, else a dated `valid-source-maps` exception.
**Accept.** `grep -c "<script>" dist/*.html` and `grep -c ' style=' dist/*.html` are 0 (JSON-LD excluded); no hash, no `unsafe-*`; TT stream empty 14 days. **Risks** TT versus React/Mapbox; Astro option names unverified (WP-DEC-04).

#### WP-INFRA-19 Third-party script origins
**Covers** infra-netlify-08, deploy-history-20, pages-C missed (Mapbox CSS) | P4, X3 | D-MAP-ENGINE | 1/A | M 0.5-2 d.
**Fix.** *Interim:* `integrity` plus `crossorigin="anonymous"` on the 8 live pages loading `api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js|css` (camera, cinematic-export, compare, ground-remembers, immersive, sandbox, viewshed, watch-together) and PeerJS 1.5.4 (`watch-together.html:19`); sha384 values in Ref D.1 (recompute with `openssl dgst -sha384 -binary FILE | openssl base64 -A`). Do NOT add `defer` alone: inline scripts call `mapboxgl` at parse time [deploy-history-20]; wrap them in `DOMContentLoaded` in the same change. *End state:* per D-MAP-ENGINE sub-page maps become click-or-idle activation over an own-data SVG poster, GL only for Compare, Cinematic Export, ground-remembers, self-hosted under `/vendor/mapbox-gl/<ver>/`; PeerJS leaves with WP-28; upgrades (3.24.1 vs 3.32.0) only behind the parity harness.
**Accept.** `grep -R "api.mapbox.com/mapbox-gl-js\|cdn.jsdelivr" dist` empty (end state); a wrong hash fails in preview. **Risks** a bad hash blanks the map pages.

### D. DNS, mail, contact

#### WP-INFRA-20 DNS records, verification, HSTS preload
**Covers** infra-netlify-34 (DNS half), -35, deploy-history-12, seo-growth-01 (DNS half) | D-URL, D-CONTACT, D-CSP | 1/A | M 0.5-1.25 d.
**Fix.** (1) First (owner action 2, before S1): TXT for the GSC Domain property (Bing: import from GSC; its own DNS method is a CNAME [U]); re-add the 53-byte `google0dca4879c9657741.html` (still in Downloads; measured 53 B, the register says 52)  to the R0 tree to recover the old property with its history; export baselines and start the 28-day clock before S1. (2) CAA only after the October renewal is confirmed (WP-01), account-bound form `0 issue "letsencrypt.org;accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/54403714"` (also `issuewild`; re-read Netlify's HTTPS page first; plain `letsencrypt.org` admits any customer); `iodef` to `security@` only once WP-21 works; then force a renewal from the Netlify UI. (3) HSTS preload: the header qualifies; submit only after S1 is stable, `embed.`/`api.` names are final and every future subdomain is HTTPS-only (removal takes months). (4) No DNSSEC (Netlify DNS lacks it; do not move DNS). IndexNow belongs to the SEO chapter.
**Accept.** DoH `CAA`/`TXT` return the records; GSC and Bing verified via DNS; renewal succeeds after CAA; hstspreload reaches `preloaded`. **Risks** CAA can block renewal; preload is near-irreversible.

#### WP-INFRA-21 Contact architecture, mail DNS, security.txt
**Covers** D-CONTACT; infra-netlify-09, -34 (mail half, overridden), -39; seo-growth MISSED-8; pagesA-08; critic-2 contact; WP-DEC-06 | 1/A | M 1-2 d. Null MX, SPF `-all` and DMARC reject (infra-netlify-34) would make role addresses impossible.
**Fix.** (1) `contact@`, `security@`, `corrections@`, `dmarc@` through a forwarder that works with Netlify DNS; candidates (terms UNVERIFIED): the registrar's forwarding, ImprovMX, ForwardEmail (not Cloudflare Email Routing: DNS stays at Netlify); no open catch-all. (2) Send-as through Gmail's SMTP is DKIM-signed as gmail.com, so DMARC fails alignment for the domain: use the forwarder's SMTP with a domain DKIM key, or reply from Gmail with `Reply-To` [U]. (3) DMARC ladder `p=none; rua=...` 4 weeks, `quarantine` (pct 25 to 100), `reject` only after 4 clean weeks and a passing send-as test. (4) Report-a-problem form (Netlify Forms, honeypot, no third-party captcha) plus a script-assembled address; auto-responder, 3-day SLA; disclosed in privacy. (5) `well-known/security.txt` plus `/.well-known/* /well-known/:splat 200` (CLI/API deploys strip dot-folders [forum]); `Contact: mailto:security@...`, `Expires` <= 1 year (CI fails under 60 days); `text/plain`; production-only noindex. (6) Remove the Gmail address from `privacy.html:47`, `terms.html:42`, `site-nav.js:194` and the timeline credit (`:112359-112366`, in the T0 C1 patch).
**Accept.** Test mail to every alias arrives; DMARC aligned on the forwarder path; `/.well-known/security.txt` 200 text/plain; `grep -R "@gmail.com" dist` empty. **Risks** DMARC blocking the owner's mail (ladder); alias spam; free-tier terms [U].

### E. Service worker and PWA

#### WP-INFRA-22 R0 service worker, kill switch, head edits
**Covers** infra-netlify-21, -22 (subset), -27 (head half); deploy-history-02/-03/-27/-28; qa-ci-08 | C6, P1, P5, P7 | D-SW, D-ORDER (b)+(c) | 1/A | M-L 1.5-3 d.
**Fix.** (1) New `sw.js` (Appendix C): no `skipWaiting`, no install precache, no reload; never intercepts navigations or cross-origin requests; bypasses `/hx/`, `/api/`, `/.netlify/`; runtime caching only (hashed `/assets/*` cache-first, `/data/*` stale-while-revalidate, both only when `ok && type === 'basic'`); purges only other `gbg-*` names; `SKIP_WAITING` message for the toast. (2) Registration replaces `index.html:255-277`: after `load` plus `requestIdleCallback` (8 s timeout), app page only, no `reg.update()` on load, reload on `controllerchange` only after the user accepted; toast on a D-SHELL layer, not bottom-anchored (C2), Reload/Later, no focus steal (base `tmp-infra-netlify/sw-register.js`). (3) Same atomic release: plain `<link rel="stylesheet">` replaces the preload/onload swap (`index.html:55-58`; removes the handler a strict CSP blocks); keep one `preconnect` (`https://api.mapbox.com`, crossorigin), delete the other nine hints (`:41-52`). (4) Kill switch `ops/kill/sw.js` applied by `kill-sw.yml` as a commit on the `production` tip replacing only `sw.js` (a stale pre-built deploy would roll back the site); `/reset` page with `Clear-Site-Data: "cache", "storage"` (Safari [U]) and a JS fallback warning that bookmarks are removed. (5) Keep the fetch handler only if warm-visit LCP improves >= 100 ms against a no-handler variant. (6) The old worker is network-first for HTML, so new HTML arrives on the next navigation; the new worker deletes `gbg-v5`.
**Accept** (qa-ci A.4). Fresh profile: one Document request, `controller` set without navigation, one style request (one `sku`); a profile seeded with the Sep-29 bundle and old SW gets new bytes on the next navigation with 0 console errors and Help/Bookmarks opening without remounting the old app; a 503 for a hashed asset is not cached; rename and kill-switch drills on staging. **Moves** Lighthouse `redirects` (9,066 ms), first-visit double load, Mapbox sessions; do NOT gate R0 on a lab score (may fall to about 51 until the boot is deferred [perf-cwv-01/02]). **Risks** poisoning; iOS evicts idle storage after about 7 days; stale lazy chunks need hashed names (patch-runner chapter).

#### WP-INFRA-23 Manifest, icons, screenshots, OG integrity
**Covers** infra-netlify-24, -25, -26 (needed for shortcuts); deploy-history-13/-24; pages-C-02; seo-growth-02/-08/-11 | E1, E2, T1 | D-ROOT, D-MEDIA, D-NAME, WP-DEC-09 | 1/A | M-L 1.5-3 d.
**Fix.** New `manifest.webmanifest`: `id: "/"` from the first manifest release (R1, WP-T0-14), never changed (installs already derive it from `start_url "/"`); `scope: "/"`; `start_url: "/?source=pwa"` (S3: `/map?source=pwa`); `display: "standalone"`; NO `orientation` (E1; after the T0 mobile fixes and D-SHELL); separate icon entries (art: WP-UX-28): any 192/512 PNG + SVG and maskable 192/512 full-bleed `#0a0a14` with the glyph in the central 60-66% (current icons are 22-24% alpha-0 [verifiers]); opaque 180x180 `apple-touch-icon` (iOS renders alpha black); `shortcuts` Historian, Search, Turning Points; `name`/`short_name` keep today's values ("Gettysburg Animated Battlefield Map" / "Gettysburg" [V]) until S2 (D-NAME), then `name` "Gettysburg Interactive Map" and `short_name` "Gettysburg Map" as chapter 10's WP-SEO-07 states (the register writes "Gettysburg Map" for both fields: ambiguity flagged for the owner); WP-T0-14 edits `manifest.json` in place while this WP proposes a new `manifest.webmanifest` (file name unresolved between chapters 02 and 09; the old SW serves `/manifest.json` cache-first [V `sw.js:52-56`], so an in-place edit reaches returning visitors only after R0's SW has replaced it, whereas a new file name is picked up at once). `screenshots`: omit until own-basemap renders exist (D-MEDIA option 1; the current pair is one corrupt file), then wide 1280x720 and narrow 750x1334. Link, `theme-color`, apple-touch icon on every page via the shared head partial. Interim OG card: 1200x630, <= 150 KB, 8-bit RGB, name-neutral, own vector art (a screenshot would bake in C1/C3/C4), `og:image:width/height/alt`, hashed name. CI decode check: every `og:image`, `twitter:image`, icon opens in PIL/sharp with the declared size, <= 300 KB, no alpha on apple-touch or maskable.
**Accept.** CDP `Page.getInstallabilityErrors` empty; all images decode; a real Android and iPhone install per release candidate. **Moves** installability, social sharing. **Risks** `id` is permanent; installed apps update icons slowly.

#### WP-INFRA-24 Offline pack (Workbox), ToS-bounded tile cache [deferred, Tier 2]
**Covers** infra-netlify-22 (rest), -23, MISSED-5 | D-SW (Workbox only when the opt-in pack ships) | 2/D | L 4-6 d, unscheduled until On-site mode is funded and the Mapbox Product Terms of 2026-07-21 are read.
**Design.** `vite-plugin-pwa` `injectManifest` (Workbox 7.4.x): precache hashed assets, `offline.html`, icons, manifest, the 37 boot data files (138,605 B br), NOT the app document (MISSED-5: precaching it makes `/` cache-first); `/map` and tool pages `NetworkFirst` (3 s) with navigation preload and a catch handler to `offline.html`; `maximumFileSizeToCacheInBytes` 4 MiB until the 2.28 MB chunk splits; prompt-only updates; an explicit "Download for offline" with size and progress. Tiles: on-device, <= 30 days, populated from the API (strip `sku` and `access_token` from the key, 400 entries, 14 days); SW control of blob-worker tile fetches is [U].
**Accept.** Offline reload shows shell and notice; a v2 deploy with a v1 tab open shows the toast and no reload until accepted. **Risks** iOS eviction; ToS reading pending.

#### WP-INFRA-25 Cutover infrastructure (S3 SW scope, /next, /classic, flags)
**Covers** D-SOURCE 7, D-ROOT, D-SW; qa-ci 4.6/4.9; seo-growth MISSED (landing versus SW) | 1/P | M 1-2 d.
**Fix.** (1) `/next/` beta: `X-Robots-Tag: noindex`, own CSP class, no SW; `/classic/` 60 days after cutover: noindex. (2) `/flags.json` `no-cache`, 1 s client timeout with safe defaults (L0 kill switches); `/version.json` `{sha, build, dataVersion, timeModel}`. (3) S3: the landing at `/` registers no SW and unregisters the old `/`-scoped registration; `/map` registers `/sw.js` with `{scope: '/map'}` and unregisters the `/` one; old links `/?tick=`, `/?ancestor=` are forwarded by one inline script when deep-link params or `gtbg_seen`/`gtbg_onboarded` exist. (4) `start_url` to `/map?source=pwa`, `id` unchanged. (5) Rollback: L0 flag, L1 Publish previous deploy, L2 kill SW, L3 data-manifest swap; Netlify Split Testing is unavailable and would set a cookie.
**Accept.** After S3 the landing has 0 registrations and `/map` one; `/next/` and `/classic/` return noindex; a flag flip removes a feature within 5 s. **Risks** installed PWAs opening `/map` directly (cleanup must run there too).

### F. Privacy and legal

#### WP-INFRA-26 Interim privacy correction, data-flow inventory
**Covers** infra-netlify-36, deploy-history-17, docs-copy-25, pages-C-81 (interim); WP-DEC-07 | X5 | D-LEGAL step 1, D-TELEMETRY gate | 1/A | M 0.5-1.5 d.
**Fix.** (1) `docs/data-inventory.md` is the source of truth: every origin, storage key, cache, first-party field and retention (seed: Appendix D). (2) Facts-only correction of `privacy.html` from Ref H.1: Street View belongs to the app walkthrough (`:110660`), not documentary/report pages; add the NPS frame, PeerJS + Google STUN + PeerJS TURN + jsDelivr, Mapbox telemetry fields, AR permissions (on-device), Netlify server-side analytics, the storage table and, once WP-15 is live, the collector fields; replace "collects no personal information" with "no accounts; our host and Mapbox receive IP addresses"; dated, with a change log; children paragraph without the COPPA/GDPR-age simplification. (3) Terms: only the embed sentence and third-party statement now. (4) CI `inventory-check.mjs` (ORG-01): every origin contacted in the scripted session and every CSP host is in the inventory, and so is every storage key found in the bundle and pages.
**Accept.** Check passes; policy date >= inventory commit date. **Moves** Privacy B+ to A (A+ after counsel). **Risks** not legal advice; gates WP-15; ships in R1.

#### WP-INFRA-27 Legal pack, counsel packet, data controls
**Covers** infra-netlify-36/37/38, docs-copy-25, pages-C-81/82/83/84 (84 NOT_VERIFIED), deploy-history-17, critic-2 legal pack; WP-DEC-08 | X5 | D-LEGAL, D-LICENSE | 1/P | L 3-5 d + counsel (cost unverified).
**Fix.** (1) Merge the five drafts into ONE Privacy and ONE Terms (plus an accessibility statement "partially conforms" until D-EVIDENCE (a)) from Ref H, replacing its licence recommendation with D-LICENSE (code all rights reserved, narrative quote-with-credit, no open data licence before the provenance audit) and its "under 13 / under 16" wording. (2) Counsel packet: facts sheet (Appendix D), drafts and questions: GDPR (legitimate interest for logs; Art. 8 concerns consent-based services), ePrivacy 5(3)/PECR on the Mapbox ID and Cache Storage, COPPA (mixed audience; IPs collected by Netlify, Mapbox, Google), CCPA/CPRA, student privacy in Classroom mode, ACR, open data licence, LLM tier for minors, age wording, trademark and confusion with ABT, NPS and the paid app, share-alike embeddings, Busey and Martin figures, liability limits; send by 2026-12-15; sign-off before the licence, any LLM tier, Classroom statements and age wording go live. (3) Terms (Ref H.2): embedding matches headers (only `/embed`), licence per D-LICENSE, AR safety, takedown contact, non-affiliation only if the owner confirms (action 10c). (4) "Privacy and data" footer panel: lists the inventory; "Clear my saved data" deletes every inventory key (`gtbg_*`, `gettysburg_bookmarks`, `mapbox.eventData*`), `gbg-*` caches and the SW registration after confirmation; states GPC is honoured; no cookie banner unless counsel says. (5) Requests within 30 days (45 in California) logged in `ops/dsar.md`; change log, sitemap, footer link on every page.
**Accept.** Counsel sign-off dated; ORG-01 stays green; every claim maps to an inventory row. **Risks** counsel lead time; never publish age or licence text before review.

### G. Labs, traffic, schools, hostile environments

#### WP-INFRA-28 Watch Together hotfix (relay conditional)
**Covers** infra-netlify-07, pages-C-46/47/48, pages-C missed (viewers trust host messages) | D-SCOPE-TIERS (default: retire, `#tour=` fragment tours instead) | 3, mandatory until retired | M 0.5-1 d (relay 3-5 d, unscheduled).
**Ownership.** Same fix as WP-PAGEC-15 (owner; chapter 15 RM-14). Its default is to PAUSE Live Sync in R1 (chapter 08b O-4), which removes the PeerJS/STUN/TURN/jsDelivr exposure at once; Part A below is the fallback if the owner overrides O-4 and keeps Live Sync running, and its parameters (note <= 140 characters, 31-character code alphabet, 20 connections) are superseded by WP-PAGEC-15 (note <= 280) and WP-PAGEC-17 (28-character alphabet, about 481 M codes).
**Fix (Part A, R1, unless retired first).** In `watch-together.html`: `:172` build rows with `createElement`/`textContent`; validate on load (`:159`, `JSON.parse` in try/catch) and import (`:326`): <= 64 KB, <= 100 stops, integer `tick` 1..675, `note` <= 140 chars, control characters stripped; guest handler `:256` accepts only `{type:'goto', tick, note}` with the same checks; room codes from `crypto.getRandomValues`, 6 characters of a 31-character alphabet (about 887 M); host cap 20 connections (`:230-236`); PeerJS SRI (WP-19); privacy discloses PeerJS/STUN/TURN while live (WP-26). *Part B (only if funded):* an owned Function v2 + Blobs polling relay keyed by room token, not per-IP (a 1 Hz per-IP limit would 429 a classroom NAT [pages-C-47]); Functions have no WebSockets.
**Accept.** Unit test with the PoC, 20 fuzz payloads and a 10 MB file: none executes, invalid input rejected, DOM text-only; a corrupt `gtbg_watch_together_tour` loads empty; the 21st connection is closed. **Moves** Security. **Risks** page UX belongs to the pages chapter.

#### WP-INFRA-29 Bot and traffic-quality strategy
**Covers** infra-netlify-14, -32; seo-growth-06, -36; critic-2 vendor cost | T2 | D-TELEMETRY, D-LICENSE | 1/A | M 0.5-1.5 d.
**Fix.** Ignore scanners (about 1,900 404s per 30 days; delete the 19 rules); no geo-blocking or WAF (18.5% DE/CN/SG/HK views are mostly cloud crawlers and discovery; WAF and log drains are not on the credit tiers); the owner blocks `/.netlify/scripts/rum` in test profiles and every CI browser (Netlify injects it on previews too) before any Lighthouse run (register action 12b); human-only first-party vitals (WP-15); run the seo-growth-36 protocol and record the human-share estimate in `docs/traffic-quality.md`; rate limits only on `/api/*`; robots per D-LICENSE (SEO chapter owns the content: training-crawler group `Disallow: /data/`, OAI-SearchBot and user fetchers allowed; advisory only); Mapbox cost breaker (WP-07).
**Accept.** `docs/traffic-quality.md` states method and estimate; robots parser matrix passes; the WP-07 headless probe passes; no geo rule exists. **Risks** blockers skew first-party data.

#### WP-INFRA-30 School-network readiness
**Covers** critic-2 schools gap, seo-growth-31 (IT-admin half) | D-SCHOOLS | 1/P | M-L 1.5-3 d.
**Fix.** (1) Generate the allow-list from a HAR of a full Classroom-mode session (`?mode=classroom`: third-party frames and WebRTC off): the site (apex, `www`) and `api.mapbox.com`, with `events.mapbox.com` and `ingesteer.services-prod.nsvcs.net` optional (the map must still work when blocked [U]); a CSP-derived list omits jsDelivr and Google hosts [seo-growth-31]. (2) After the landing and `/learn` stabilise, submit the domain to filter vendors' categorisation forms (Education/Reference/History; e.g. GoGuardian, Securly, Lightspeed, Cisco Umbrella; portals UNVERIFIED), logged in `ops/filters.tsv`; the domain is 3.5 months old and likely uncategorised. (3) Feed `/teach/it-admin` (learn chapter). (4) ChromeOS profile (4 GB, 4x CPU, Slow 4G, 30 concurrent sessions) and one real Chromebook per release candidate.
**Accept.** Classroom mode passes with every other host aborted (Playwright routes): map and Historian work, 0 page-originated console errors; the HAR host set equals the published list. **Risks** per-vendor behaviour unverified.

#### WP-INFRA-31 In-app browser and hostile-environment matrix
**Covers** critic-2 in-app-browser and hostile-environment gaps | D-BROWSERS, D-LANG | 1/P | M 1-2 d. The app chapters implement; this WP owns the matrix, CI and header/meta prerequisites.
**Fix.** Playwright matrix: (a) IAB UAs (FBAN/FBAV, Instagram, TikTok/musical_ly, Line, Reddit, GSA): Lite boot, URL-first resume, "Open in your browser" for export and AR, no install prompt; (b) Chrome auto-translate es/de on 3 flows with `translate="no"` on the stage; (c) forced dark (`--enable-features=WebContentsForceDark`) with `<meta name="color-scheme" content="dark">`; (d) content blockers (uBlock default lists in a Playwright extension context, Brave shields): "zero console errors" means 0 page-originated errors and a working app, because browser-generated `ERR_BLOCKED_BY_CLIENT` lines cannot be silenced by page code (`performanceMetricsCollection:false` removes only the load-metrics event, so blockers still log the other Mapbox event POSTs [V `:91907`, `:94340`]); (e) Referer stripping shows the tile notice and Text route; (f) AZERTY `KeyboardEvent {key:'&', code:'Digit1'}` jumps to Day 1; (g) WebGL2 off shows the Text route; `WEBGL_lose_context` recovery.
**Accept.** Every row green in CI; real-device log archived (E12). **Risks** UA strings drift.

### H. Gates, evidence, Historian reservation

#### WP-INFRA-32 Infra CI gates
**Covers** infra-netlify-29 (corrected), qa-ci-02/13/19/29 | D-CI-HOST | 1/P | L 2.5-4.5 d.
**Fix.** Scripts in `tests/infra/`: `verify-headers-invariant.mjs`, `check-headers.sh` (Ref D.4), `csp-crawl.mjs`, `redirect-matrix.mjs`, `inventory-check.mjs`, `dns-check.mjs` (DoH: CAA, TXT, SPF, DMARC), `img-decode.py`, `keys-check.sh` (KEY-01/02), `security-txt-check`, `sw-kill-drill.spec`, `observatory.mjs`, and the attribution check (`.mapboxgl-ctrl-logo`/`-attrib` on every map; T0 owner). Placement: T1 push (invariant, golden snapshot); T2 preview (headers, crawl, redirects, inventory, decode); T4 post-deploy; T5 6-hourly SYN-01; nightly KEY and DNS. Lighthouse by LHCI on the preview with the preview token, NOT `@netlify/plugin-lighthouse` with `fail_deploy_on_score_thresholds` (it serves the build on localhost where the production token 403s [-29]); previews assert the `noindex` header and skip SEO and `is-crawlable` [qa-ci M2]; the nightly matrix targets staging, never production.
**Accept.** A PR that adds `unsafe-inline`, breaks embed framing, repeats a header name, reuses an asset name or leaks a key turns the check red. **Risks** Actions minutes [U]; runner software WebGL.

#### WP-INFRA-33 Security evidence dossier
**Covers** critic-2 verification gap (security), D-EVIDENCE (c) | 1/P | M 0.5-1.5 d (+ outside reviewer, unverified).
**Fix.** Archive in `docs/evidence/security/<date>/`: Observatory, securityheaders, CSP Evaluator, TLS report, hstspreload status, the framing test, console evidence, DMARC reports, the network-log test, device install logs; one outside peer review of CSP and headers; link each artefact from its scorecard row. **Accept.** Every security row cites a non-author artefact <= 90 days old. **Risks** reviewer availability.

#### WP-INFRA-34 Historian platform reservations
**Covers** infra-netlify-31, D-HIST-ARCH | 1/A | S 0.25-0.5 d now; the C-lite function is 3-5 d, deferred behind gate G-X.
**Fix (planned with WP-10 in R1; nothing is built by this plan).** Reserve `/hx/*` in the generator (immutable, noindex, nosniff), bypass it in the SW (WP-22), keep `connect-src 'self'`, never use `/data/` for Historian shards; `'wasm-unsafe-eval'` only on `/historian` if semantic WASM is ever adopted (Design B, off by default). **Deferred (after G-X and counsel):** `POST /api/historian` Function v2 on the second rate-limit slot: same-origin, body <= 2 KB, secrets flagged secret in Netlify env, Blobs budget guard (USD 25/month, 2/day per D-HIST-ARCH), 30-day cache keyed by normalised query plus data version, answers rendered as text nodes with validated citation ids, no query text or IP in logs, `HISTORIAN_ENABLED=false`, privacy paragraph H.3.
**Accept.** `curl -sI /hx/x` shows immutable + noindex; the SW bypasses `/hx/`. **Risks** slot budget; provider policy for minors unverified.

---

## 5. In-domain sequencing

**Date rule (consistency review):** every date and train name here is a ceiling taken from the register (sections 4.1-4.3), not a capacity forecast; chapter 15's calendar (which divides the effort by the owner's real hours) governs when work lands, and at 10-15 h/week almost everything after R1 lands later than the dates quoted in this section.

Trains and dates are the register's (section 4). Header, SW and privacy work is not an identity-level SEO change but stays 48 h clear of an S-train. No promotion 2026-11-15..20, 2027-06-25..07-05, 2027-11-15..20 or Fridays after 12:00 ET.

| Wave | Window | Content (WP numbers) | Gate |
|---|---|---|---|
| I0 | plan approval to 2026-10-07 (no bytes shipped; owner actions and drafts only) | 01, 02; 03 (1-2, 5); 04 (1); 05; 08 monitors; 20 TXT; 26 draft inventory; 06 once the repo exists | none |
| I1 | S0 to R0, <= 2026-10-21 (one atomic deploy) | 09A; 22; 11 (naming rule; `site-nav.*` versioned `?v=<release id>` per WP-T0-11 and revalidated until it is fingerprinted, then immutable; `/data` SWR); GSC file; WP-DEC-05 spike | R0 acceptance |
| I2 | R1, <= 2026-11-05 | 13; 10 (Stage-1 CSP; Permissions-Policy unchanged until DG-2); 14; 28A (only if Live Sync stays live: WP-PAGEC-15 pauses it by default); 26; 19; 15 (CLI, after 26); 16 Stage 0; 23 (orientation lock only after the T0 mobile fixes) | R1 stable 48 h |
| I3 | S1, <= 2026-11-10 (>= 28 d after GSC verify) | 12; 10 both spellings; 23 OG; 20 CAA (after 2026-10-25); 21 at `p=none` | redirect matrix |
| I4 | 2026-11-21 to 2027-01-26 | 16 Stage 2; 17 (3a, 3b); 21 rest; 06, 07, 08 (DG-2); 29; 09B; 25 before S3; 27 packet by 2026-12-15, texts by DG-3 | 7 and 14 clean days |
| I5 | 2027-02 to 2027-04-30 | 17 (3c); 18; 30; 31; 32; 33 by DG-4; 20 HSTS preload | D-EVIDENCE |
| I6 | cutover 2027-05-15 | 25; 24 only if funded; 34 only after G-X | freeze 2027-06-25..07-05 |

Critical path: 09A -> 22 (R0) -> 10/26 -> 15 -> 16 -> 17 -> 18; owner lead times (counsel, filters, DMARC ladder, outside review) run in parallel. Bundle patches outside the closed T0 list (04 facade, 03 literals) wait for an ADR amendment or cutover.

---

## 6. Security and privacy checklist (tick when verified; WP in brackets)

**Headers.** [ ] HSTS everywhere incl. 404, preload (10, 20) [ ] enforced CSP on every HTML page: no `unsafe-*` in `script-src`, `frame-ancestors`, `object-src 'none'`, `base-uri`, `form-action` (16-18) [ ] reporting live (15) [ ] Permissions-Policy per class (10) [ ] one rule per header name; Referrer-Policy kept; COOP on, COEP off (10) [ ] only `/embed` frameable (14) [ ] SRI or self-hosted scripts (19) [ ] `security.txt` (21) [ ] no `immutable` on un-fingerprinted files (11) [ ] noindex on `/data/`, `/hx/`, `/api/`, previews, source maps (10, 18).
**Code and keys.** [ ] no inline handlers or `style=` at the end state (18) [ ] `textContent`/`esc()` for non-static DOM writes (18, 28) [ ] dev pages absent (13) [ ] third-party frames click-to-load (04) [ ] Mapbox allow-list, dev/preview tokens, one config module, alerts (03) [ ] Google key restricted (04) [ ] gitleaks clean (05).
**Platform and continuity.** [ ] Git deploys, `noindex` previews, rollback drilled (09) [ ] CI gates (32) [ ] plan known (02) [ ] monitors (08) [ ] one URL form (12) [ ] CAA, SPF/DKIM/DMARC, role addresses (20, 21) [ ] 2FA, term to 2031, private recovery mailbox, delegate (01) [ ] restore drill, lite snapshot, letter (06) [ ] vendor register (07).
**PWA and privacy.** [ ] no forced reload, kill switch drilled (22) [ ] valid manifest and icons (23) [ ] SW scope migrated (25) [ ] policy matches inventory (26) [ ] "Privacy and data" panel, GPC (27) [ ] collector stores no IP, id, UA, query or free text (15) [ ] counsel sign-off (27).

---

## 7. Verification debt (verify first; close with evidence or drop)

1. **Netlify:** plan and credits; preview and branch-deploy metering; `pretty_urls=false` on the deploy path; `_headers` versus `netlify.toml` precedence and same-name merge; Edge Function versus header ordering; Drawer switch; deploy files API; rollback `restore`/`unlock`; Forms, Functions v2 and Blobs limits; code rate-limit slots on the actual plan; primary-domain versus host rule for `netlify.app`.
2. **Mapbox:** allow-list, scopes, spend cap; Product Terms of 2026-07-21 (caching, self-hosting, screenshots and video); map behaviour with `events.mapbox.com` blocked; SW control of blob-worker tile fetches. **Google:** key restrictions, enabled APIs.
3. **DNS and mail:** forwarder terms and MX with Netlify DNS; DMARC for forwarded and send-as mail; overriding Netlify-managed apex records; current CAA account URI. **Legal:** WP-27 (2); Terms clauses (pages-C-84 NOT_VERIFIED).
4. **Browsers and devices:** Permissions-Policy console warnings; `Clear-Site-Data` in Safari; frame-block signals in Firefox and WebKit; installability without a fetch handler; iOS SW eviction and PWA install.
5. **Schools and traffic:** vendor categorisation processes; whether filters block `events.mapbox.com` or WebRTC; whether Netlify Analytics counts HEAD; whether the Sep 7-8, 18, 26 RUM spikes match owner tests (infra-netlify-32, deploy-history-33 UNVERIFIABLE); account 2FA (-39 UNVERIFIABLE); GitHub plan and Actions minutes.

---

## 8. Owner decisions and actions (B = blocking; ADR in brackets)

1. Netlify plan, credits, this month's deploys (action 5) [D-CI-HOST].
2. Mapbox dashboard evidence; dev and preview tokens; `netlify.app` on the preview token or not (action 3) [D-MAP-ENGINE, D-NETLIFY-DOMAIN].
3. Google key restriction (action 4); NPS video frame versus link-out; approve an ADR amendment for Street View click-to-load and the two bundle token literals [D-SOURCE].
4. **B** Contact plan: forwarder, role names, send-as, DMARC ladder, private recovery mailbox, delegate (actions 6, 11) [D-CONTACT, D-CONTINUITY].
5. **B** Legal: operator identity, governing law, whether "not affiliated with the NPS or ABT" is true, any registered mark, counsel budget (action 10) [D-LEGAL, D-LICENSE, D-NAME].
6. Watch Together: hotfix in R1, earlier retirement, or a funded relay; alert channel; GitHub plan; the 10 h/month ceiling; fund On-site mode (WP-24) or not [D-SCOPE-TIERS, D-CI-HOST, D-SW].
7. HSTS preload go/no-go and a widget subdomain, decided before submission; source maps `noindex` or an exception; outside CSP reviewer; hosted versus own collector in the interim [D-CSP, D-EVIDENCE, D-TELEMETRY].

---

## 9. Decision conflicts (deviations or clarifications against `01-decision-register.md`)

1. **Envelope.** The register lists infra/legal at 12-18 d in the Tier-1 envelope; this chapter totals 43-85 d gross (A-line 24-49, A+ line 16-31, deferred 4-6) because the critics added continuity, vendors, schools, hostile environments and evidence to infra-netlify's 35-45 d. Re-total in the master schedule; the minimum path is 14-29 d.
2. **D-CONTINUITY alerts.** "Domain/TLS at 90/30/7 days" is applied as domain 90/30/7 and TLS 20/10/5 (Netlify renews at <= 30 days; a 90-day threshold on a 90-day certificate always fires).
3. **D-SOURCE closed list.** Street View click-to-load, frame attributes (`:110660-110665`, `:100461-100466`) and the token literals (`:97210`, `:102899`) are bundle patches not on the list: amendment requested, else defer to cutover.
4. **D-MEDIA.** With option 1 (Mapbox imagery only in the live map) the manifest `screenshots` array is omitted until own-basemap renders exist.
5. **D-SW, embed, contact.** infra-netlify-22's Workbox design moves to WP-24 as the register says (MISSED-5: never precache the app document); pages-C-87's Edge Function is a tested fallback only; infra-netlify-34's null MX, SPF `-all` and DMARC reject are not used (register conflict 4).
6. **D-CI-HOST.** Required checks are unavailable for private repos on GitHub Free: `release.yml` as sole writer of `production` plus Netlify "Stop auto publishing".
7. **Zero console errors** with uBlock lists means 0 page-originated errors (`ERR_BLOCKED_BY_CLIENT` lines cannot be suppressed). **D-TELEMETRY** "only daily aggregates" is aggregate-on-write, else a buffer purged within 24 h.
8. **Consistency-review clarifications (2026-09-30).** (a) Manifest `name`/`short_name` change at S2 (D-NAME), not earlier; the target values are `name` "Gettysburg Interactive Map" / `short_name` "Gettysburg Map" per WP-SEO-07, and the register's single string "Gettysburg Map" for both is ambiguous. (b) R1 keeps today's Permissions-Policy; the per-class narrowing waits for DG-2 (D-CSP; WP-T0-15 agrees). (c) Watch Together: WP-PAGEC-15 (Live Sync paused) is the default and WP-INFRA-28 Part A is only the fallback. (d) The claim that `performanceMetricsCollection` is absent from 3.24.1 was wrong and is corrected in section 2 and WP-INFRA-31. (e) `google0dca4879c9657741.html` is 53 bytes, not 52; inline-code counts are 29 scripts and 27 style blocks. (f) In Phase A the generator's output is committed into `legacy/dist` because no build exists yet. (g) The manifest file name (`manifest.json` in place vs `manifest.webmanifest`) is unresolved with chapter 02. (h) `site-nav.*` is versioned `?v=<release id>` at R0 and fingerprinted later, not immutable at R0.

---

## 10. Cross-domain dependencies and overlaps (count effort once)

- **03 source/rebuild (T0 runner):** hashed asset and lazy-chunk names (D-ORDER (a)) before WP-22; WP-ARCH-30 owns the `/next/` and `/classic/` routes and flags (WP-25 adds headers and SW scope); Gmail credit removal and attribution on two maps; token literals and Street View facade need an ADR amendment.
- **05 performance:** WP-PERF-05 ships with WP-22 in one deploy; WP-PERF-03 is the vitals client for WP-15; WP-PERF-24/25 set cache values and SW acceptance implemented by WP-10/11/22. **06 UX:** WP-UX-28 draws the icon art (WP-23 owns manifest, headers, decode gate); update toast, "Privacy and data" UI, Classroom mode, blank-map state.
- **10 SEO:** WP-SEO-01 (GSC, Bing, IndexNow; DNS side is WP-20), -03 (host redirect, dev pages = WP-12/13), -05 (`pages.manifest.json` and content edits; WP-10/12 own the generator and redirect rows), -06 (robots, `llms.txt`). **11 copy:** WP-CONTENT-24 wording of Privacy/Terms (WP-26/27 own the substance).
- **12 QA/CI:** WP-QA-03 owns HP tests and the probe cron and must consume WP-10's generator, not build `tools/gen-headers.mjs` as a second emitter; Permissions-Policy is per class, not in `/*`. **14 Historian:** WP-03 owns the `/hx/` platform (WP-34 only reserves headers), gate G-X. **A11y:** toast and form semantics.
- **02 runbook and the page/UX chapters (count once; chapter 15 RM-13..16):** WP-T0-11..15 are the R1 slices of WP-INFRA-10/13/14/23 and of the page WPs of chapters 08a/08b; WP-INFRA-13 = WP-PAGEC-34, WP-INFRA-14 = WP-PAGEC-31, WP-INFRA-28 = WP-PAGEC-15 (owners are named inside each WP); WP-INFRA-23's manifest fields and WP-UX-28's icon art are one PR; WP-INFRA-27 (4) is the panel WP-UX-26 builds; WP-INFRA-31 is the CI matrix for WP-UX-22 and WP-A11Y-17; WP-INFRA-21 is the form WP-UX-24 links. The R1 header work (WP-T0-15) changes no Permissions-Policy and enforces only the `frame-ancestors` family (D-CSP DG-2 governs the rest).

---

## 11. Traceability

Every infra-netlify-01..39 id appears in a Covers line (script-checked; -20 under WP-03, -26 under WP-23, -28 under WP-09). Findings not listed belong to other chapters (deploy-history 04-10, 14-16, 21-23, 25, 26, 29-32; qa-ci suites; pages-C UX, AR, export; capacity, browser floor, historical review, soak). No REFUTED finding exists in these sources; audit ids are in each WP header. UNVERIFIABLE or NOT_VERIFIED (verify first): infra-netlify-32, -39; deploy-history-31, -33; pages-C 21, 25, 40-43, 84.

---

## Appendix A. CSP classes and Permissions-Policy

Common tail: `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; object-src 'none'; manifest-src 'self'; upgrade-insecure-requests; report-uri https://gettysburginteractivemap.com/api/ingest?type=csp; report-to csp` (embed: `frame-ancestors *`; Report-a-problem page: `form-action 'self'`). Interim `script-src`/`style-src` = `'self'` plus per-page sha256 hashes.

| Class | Pages | img-src | connect-src | Other |
|---|---|---|---|---|
| static, legal, ar | landing, 11 static tool pages, privacy, terms, 404, ar | 'self' data: | 'self' + RUM host | camera and sensors are not CSP-governed |
| map | camera, compare, ground-remembers, immersive, sandbox, viewshed | 'self' data: blob: api.mapbox.com | 'self' api.mapbox.com events.mapbox.com + RUM host | `worker-src 'self' blob:; child-src 'self' blob:`; pinned CDN path until WP-19 |
| cinematic | cinematic-export | as map | as map | + `media-src 'self' blob:` |
| peer | watch-together | as map | + `https://0.peerjs.com wss://0.peerjs.com` | + `cdn.jsdelivr.net/npm/peerjs@1.5.4/` until WP-28 |
| app | `/`, `/map` after S3 | as map | as map | + `frame-src https://www.google.com/maps/embed/ https://www.nps.gov/media/video/`; documented `style-src-attr 'unsafe-inline'` |
| embed | embed | none | 'self' + RUM host | `frame-ancestors *`; hashed script and style |
| next, classic | `/next/`, `/classic/` | as app | as app | `X-Robots-Tag: noindex` |

Permissions-Policy baseline: `accelerometer=(), autoplay=(self), camera=(), display-capture=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=()`; `/ar`: camera, geolocation, accelerometer, gyroscope, magnetometer `=(self)`; app class: `fullscreen=(self "https://www.google.com" "https://www.nps.gov")` with `allow="fullscreen"` on both frames; no `interest-cohort`; check for console warnings in 3 engines first.

## Appendix B. Vendor register (`ops/vendors.yaml`) and operations duties

| Vendor | Dependency | Numeric trigger [E] | Exit path |
|---|---|---|---|
| Netlify | hosting, DNS, RUM, Functions, Blobs | credits >= 70% of month; cost rise > USD 20/month; outage > 4 h | lite snapshot on a second host; edit records in Netlify DNS (drill 2x/year) |
| Mapbox | live map | > 35,000 loads/month (70% of free tier; today's bound about 3.4k); price or ToS change; unexplained 403 rate | D-MAP-ENGINE O3/O5 behind the facade (WP-DEC-02) |
| Google, NPS.gov | Street View Embed key, video frames | any billing alert over USD 1; XFO added on video pages | link-out |
| GitHub | repo, CI | Actions minutes > 80% of month; plan change | second remote, GitLab CI |
| Name.com | registrar | renewal price > 2x; lock or 2FA incident | transfer per the continuity letter |
| LLM provider (only C-lite) | Historian | USD 25/month cap; provider terms change for minors | `HISTORIAN_ENABLED=false` |

Ops duties (h/month [E]): dependency and security PRs 1.0 (Renovate auto-merge on green CI); monthly review of credits, usage, keys, DMARC, certificates 1.0; quarterly drills (restore 2 h, kill switch 1 h, rollback 0.5 h; DNS cut-over 2x/year) 1.5 average; corrections and contact triage (3-day acknowledgement) 2.0; filter follow-ups and reminders 0.5; incident buffer 1.0. **Total 7.0 (ceiling 10)**, excluding Historian review (12-16 h/month), content and outreach. Maintenance mode pauses outreach and new content, never security, renewals or corrections.

## Appendix C. R0 service worker (`sw.js`) and kill switch

Base: `tmp-infra-netlify/sw-register.js` (registration), `sw-workbox.mjs` (WP-24).

```js
const A = 'gbg-assets-r0', D = 'gbg-data-r0';               // VERSION injected at build
self.addEventListener('install', () => {});                  // no precache, no skipWaiting
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('gbg-') && k !== A && k !== D) await caches.delete(k);
  await self.clients.claim(); })()));
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
const ok = r => r && r.ok && r.type === 'basic';
async function get(e, name, q, swr) {
  const c = await caches.open(name), h = await c.match(q);
  if (h && !swr) return h;                                   // assets: cache-first
  const n = fetch(q).then(r => { if (ok(r)) c.put(q, r.clone()); return r; });
  if (h) { e.waitUntil(n.catch(() => {})); return h; }       // data: stale-while-revalidate
  return n;
}
self.addEventListener('fetch', e => {
  const q = e.request, u = new URL(q.url);
  if (q.method !== 'GET' || u.origin !== location.origin || q.mode === 'navigate' || q.headers.has('range')) return;
  if (/^\/(hx|api|\.netlify)\//.test(u.pathname)) return;
  if (u.pathname.startsWith('/assets/')) e.respondWith(get(e, A, q, false));
  else if (u.pathname.startsWith('/data/')) e.respondWith(get(e, D, q, true));
});
```
Kill switch (`ops/kill/sw.js`): `install` calls `skipWaiting()`; `activate` deletes every cache, calls `registration.unregister()` and `client.navigate(client.url)` on each window client.

## Appendix D. Data-flow inventory (seed of `docs/data-inventory.md`, WP-26)

| Origin or store | Data | When |
|---|---|---|
| Netlify host and server-side Web Analytics | IP, UA, path, referrer, time | every request |
| `/.netlify/scripts/rum` to `ingesteer.services-prod.nsvcs.net` | hostname, path, browser/OS family, device class, screen size, timings; no cookie or storage; top-level only | every top-level HTML |
| `api.mapbox.com` | IP, UA, Referer, tiles | map load |
| `events.mapbox.com` | anonymous ID (`mapbox.eventData*`, about 24 h), UA, screen and window size, DPR, connection, GPU strings | map load |
| `www.google.com/maps/embed`, `www.nps.gov/media/video` | IP, UA, page URL, third-party cookies | walkthrough, "Show Video" (after a click once WP-04 ships) |
| `0.peerjs.com`, `stun.l.google.com`, `*.turn.peerjs.com`, `cdn.jsdelivr.net` | IP to broker, STUN, TURN and peer; PeerJS code | Watch Together host or join |
| camera, location, motion | stays on the device | `/ar` |
| localStorage `gtbg_onboarded`, `gtbg_prefs`, `gettysburg_bookmarks`, `gtbg-ef-hidden`, `gtbg_watch_together_tour`, `mapbox.eventData*`; Cache Storage `gbg-*` | prefs, bookmarks, tour, IDs, site copies | use; after SW install |
| `/api/ingest`, Netlify Forms | aggregates only (no IP, id, UA, query, free text); form text | after WP-15; on submit |
