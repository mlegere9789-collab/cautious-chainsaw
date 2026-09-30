# 10 - SEO, Discovery and Growth (WP-SEO-NN)

Status: PLAN ONLY, 2026-09-30. Nothing was built or deployed; live checks were read-only (`curl`, RDAP, `nslookup`, grep of the deployed tree, a Python recount). Owner: Mike Legere (solo). Binding input: `01-decision-register.md`; obeyed: D-URL, D-ROOT, D-NAME, D-ORDER, D-MEDIA, D-LICENSE, D-TELEMETRY, D-LEGAL, D-CONTACT, D-SW, D-SITEGEN, D-SCOPE-TIERS, D-TIME, D-HIST-ARCH/REVIEW, D-CWSS, D-SCHOOLS, D-NETLIFY-DOMAIN. Deviations and additions: section 9 only.

Id convention (review 3): inside this chapter a bare `WP-NN` means `WP-SEO-NN`; every other prefix is written in full; audit ids (T1, S3, E5, X4 ...) are quoted only in `Audit:` fields, and "S1..S4" always means the release trains of the register (audit S1-S4 are written "audit S1").
Tags: [V] re-checked by me 2026-09-30; [S id] stated or corrected by a specialist/verifier; [E] estimate; [U] unverified (section 7). Effort: S<0.5 d, M 0.5-2, L 2-5, XL>5 (AI-assisted person-days). `FILE:LINE` = `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy/FILE`; `bundle.pretty.js:LINE` = plan-work copy. Inputs: seo-growth (38 findings + 8 missed; none REFUTED; -28 and -37 UNVERIFIABLE = method designs) and the specialist reports cited per WP.

## 0. Summary

1. **The gap is identity plus surface, not Lighthouse.** The domain is 3.5 months old (registered 2026-06-13, expires 2027-06-13 [V RDAP]); Search Console ownership lapsed; the home page is a JS app with 3 `<h1>` and a crawler-only block deleted by script; the other 26 pages have no entity-level prose; every share card is one corrupt PNG [V]. Search sends 173 of 2,221 referrals (7.8%; Bing family 110 > Google 63) [S].
2. **Order (binds the calendar):** DNS-verify GSC/Bing now and bank a 28-day baseline; change identity one thing per train (S1 URL form, S2 name/titles, S3 landing `/` + app `/map`, S4 programmatic pages, C cutover); ship content through a thin-content + rights gate, <= 100 URLs/week.
3. **Trains (5.1):** S1 2026-11-03..05, S2 12-01..08, S3 2027-01-12..19, S4 02-16..04-17, C 05-15; freezes 2026-11-15..20 and 2027-06-25..07-05. **Calendar caveat (review 3):** these are the register's floor and latest dates. Chapter 15 section 5.1 governs delivery: R0 itself ships 2026-11-10 at 30 h/week, 2026-12-15 at 15 h/week, and S1 lands Mar 2027 / Aug 2027 respectively, so nothing below is a promise, only the earliest legal slot after the 28-day baseline and the 4-week train spacing.
4. **New here:** (a) a noindex `/map` cannot reach Lighthouse SEO 95 (`is-crawlable` weighs 4.04 of 12.04, ceiling 66 [V]; section 9.1); (b) at about 2 Google visits/day click-based rollback triggers have no power: use structural signals (WP-02); (c) the dataset landing is `/dataset`, not `/data`; (d) regiment pages cannot precede Historian P3 (seo-growth's "60 units by day 90" is dropped); (e) KPIs and outreach follow the register's trains.
5. **Effort:** 31 WPs, 70-126 person-days gross (T1 foundation 18-33; T2 growth 40-71; T3 gated 12-23); overlaps with other chapters are flagged. 90-day plan: Lane A (must) 10-19 d, Lane B (should) 6-11 d.
6. **Expectations (section 6):** no keyword-volume data exists; traffic figures are planning bands. Controllable by 2027-04-17: technical A+, instrumentation, landing page, about 140-200 indexable URLs. First outcome test: the 2027-06-26..07-25 window (only if S1-S4 shipped by then; under chapter 15's Plan L at 15 h/week they have not, so that window becomes a baseline, not a test).

## 1. A+ exit criteria for SEO (desktop AND mobile)

A+ = every TA gate passes on both device classes AND the outcome floors of 1.2 are met or an external-cause exception is logged. Gates feed the qa-ci scorecard (SL-02..07, SL-16, SL-27/28, HP-10..12, `seo-probe`); the category has >= 12 gates, so the D-EVIDENCE cap (< 6 gates = A-) does not apply.

### 1.1 Technical (owner CI plus Google/Bing tools)

| ID | Criterion | Test |
|---|---|---|
| TA-01 | GSC Domain property (DNS) + Bing verified, IndexNow key live, >= 2 owners, baseline archived, weekly KPI rows | `dig TXT`; consoles; `docs/seo-baseline-2026-10.md` |
| TA-02 | One URL identity: canonical, `og:url`, JSON-LD `url`, sitemap `<loc>`, internal `href` all extensionless apex https; every legacy form one 301 (`http://www` may take two); both spellings of every header/cache rule identical | matrix (App. B), HP-10..12, SL-07/16 |
| TA-03 | Sitemap = exactly the canonical, 200, `index` URLs; noindex pages (`/map`, `/search`, `/embed`, `/classic`, 404, AR) absent from it and never `Disallow`ed; `X-Robots-Tag: noindex` on `/data`, `/hx`, `/api`, previews | robots/sitemap CI, SL-06 |
| TA-04 | Unique title <= 60 and description 120-155 (Index pages), one `<h1>`, `<main>`, complete `og:*`/`twitter:*` incl. image w/h/alt, `og:description` = description, one brand string | SL-02..05, SL-27 |
| TA-05 | Every og/manifest image decodes, 1200x630, <= 150 KB, non-uniform, one distinct per template; cards show on 10 seed URLs | SL-09/10, Sharing Debugger |
| TA-06 | JSON-LD valid per template, no fabricated rating/FAQ/HowTo; Breadcrumb valid >= 95% within 30 days of each batch | Rich Results Test, schema CI, GSC |
| TA-07 | Mobile-first parity: raw HTML (no JS) holds h1, full copy, nav/footer links, breadcrumbs, sources; Googlebot-smartphone rendered HTML equals raw (one URL per template); visible text at 375 and 1440 is a superset of crawler text | URL Inspection monthly, SL-28 |
| TA-08 | 100% of published pages pass the thin-content + rights gate; 0 dev-copy/count/clock-string lint hits; <= 100 new URLs/week | `gate-report.json` |
| TA-09 | Depth <= 3, orphans 0, >= 3 inbound links per indexable page, 0 links to redirected/404 URLs | `linkgraph.mjs` |
| TA-10 | Content templates: Lighthouse mobile AND desktop >= 98 perf, SEO 100, a11y/BP >= 95, 0 third-party requests, HTML <= 35 KB; field p75 green on both devices (LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1, FCP <= 1.8 s; content budget LCP <= 1.5 s) | LHCI, Netlify RUM + first-party beacon |
| TA-11 | GSC 5xx = 0, soft-404 = 0, "Duplicate, Google chose different canonical" = 0 on primary URLs 60 days after S1, "Crawled - not indexed" <= 25% per section; Bing Site Scan 0 errors | weekly exports |
| TA-12 | Crawler policy per D-LICENSE live: answer/search bots allowed, training bots off `/data/`, accurate `llms.txt`, Terms agree | robots matrix, monthly prompt log |
| TA-13 | Events send nothing under GPC/DNT, no third-party request on content pages, privacy page lists every measurement, owner traffic excluded | network capture |
| TA-14 | Trust pack (About, Sources, Method, Corrections, Changelog, Press, Contact, Accessibility; the cite box is a section of `/sources`, no separate `/cite` page: WP-CONTENT-14; `/faq`, `/glossary`, `/guide`, `/teach` per chapter 11 X-06) in every raw-HTML footer; Tier-A pages show sources, last-reviewed date, reviewer or "Unreviewed reconstruction"; corrections acknowledged <= 3 business days | crawl, corrections log |
| TA-15 | `grep -ri "animated battlefield map"` only in `alternateName`/changelog; no "minute by minute", "AI-style", hard-coded 467/445/430,000; non-affiliation line | SL-20/27, lint |
| TA-16 | `/`: one h1, >= 250 words, hubs in raw HTML, no map JS/SW; `/map`: noindex,follow, one hidden h1; five-UA body-hash parity; forwarder matrix | Playwright, curl |
| TA-17 | Each train: matrix run, pre/post exports, versioned redirect map, release-log row; rollback drill ("Publish deploy" of the previous build) done once before S1 | `docs/seo-release-log.csv` |
| TA-18 | Domain renewed >= 5 years with auto-renew; DNS inventory lists every verification record | RDAP, `ops/inventory.yaml` |

TA-07/10/11 are read separately for smartphone Googlebot and desktop (GSC has device splits; Netlify Analytics has none). Lighthouse SEO applies to indexable URLs only (9.1).

### 1.2 Outcome (reported; not fully controllable; re-based at D30)

D-days from 2026-10-01: D90 = 12-29, D180 = 2027-03-29, D365 = 2027-09-30.

| Metric (source) | Baseline (Aug 30-Sep 29 2026) | Floor / target / stretch |
|---|---|---|
| Search referrals per 30 d (Netlify: Google+Bing+DDG+Yahoo) | 173 | D90 170 / 250 / 350; D180 300 / **500** / 800; anniversary window 06-26..07-25 1,000 / 2,500 / 6,000; Sep 2027 like-for-like 400 / 900 / 1,500 |
| Indexable URLs submitted -> indexed | 21 -> unknown | D90 30 -> >= 24; D180 140-200 -> >= 80% of batches older than 45 d; D365 350-450 |
| AI-assistant referrals per 30 d | 14 | D90 14 / 20; D180 35; D365 60 |
| New referring domains (human-checked) | measure at S0 | D90 +3; D180 +8; 2027-06-27 +20 (>= 8 .edu/.gov/.org); D365 +40 |
| Branded rank (GSC) | unknown | D60 top 3 for the domain; D180 top 5 for "gettysburg interactive map" |
| Landing -> `/map` launch (events) | n/a | >= 45% by 2027-04-19 (D-ROOT) |
| Manual actions / security issues | unknown | 0 |

Non-author evidence (D-EVIDENCE): GSC exports (indexing, Enhancements, CWV by device), Rich Results Test output, Bing Site Scan, and one independent SEO review (cost unverified); no public "A+ SEO" claim before it.

## 2. Verified current state (facts only)

- **Domain/DNS:** registered 2026-06-13, expires 2027-06-13, `client transfer prohibited`; Netlify DNS; `nslookup -type=TXT` returns only SOA [V]. `/google0dca4879c9657741.html` 404 [V]; the 52-byte original is in Downloads and `tmp-deploy-history/b_jun23` [S].
- **Traffic (Netlify, 30 d):** 3,389 PV, 1,529 UV; referrals 2,221 of which 2,034 direct (includes bots, dark social, typed URLs; not proof of returning users [S ux-flows-08]); search 173 = Google 63 + Bing 59 + DuckDuckGo 38 + Yahoo 13; ChatGPT 14; DE 210 + CN 170 + SG 152 + HK 96 = 628 PV (18.5%); about 1,900 scanner 404s [S].
- **URL forms:** `/`+`/index.html`, `/dashboard`+`.html`, `/historian`+`.html` all 200 [V]; Analytics splits them (`/` 1,713 vs `/index.html` 86) [S]; `friendly-lolly-da85c0.netlify.app` 200 [V]; `/landing.html` 404 [V]; `/diagnostics` 200 but `/diagnostics.html` 404 [V]; `/embed` and `/embed.html` 200 with different framing headers [S]; `http://www` 301 -> https://www -> apex [V first hop].
- **Sitemap/robots:** 21 `<loc>` (`.html`), 0 `<lastmod>`; robots.txt 3 directives (4 lines) [V]; `/llms.txt` 404; both cached 86,400 s [V].
- **Head, home, links, manifest, copy:** 16 of 27 root HTML files lack `twitter:card`; `og:image` is on 21 pages, `twitter:image` on 11; all use `screenshots/day3.png` (IHDR RGB 1280x720 but IDAT 3,687,120 B = RGBA size vs 2,765,520; an 80-colour near-black gradient; `day1.png` byte-identical; still served at 17,585 B) [V, S]. Home: name "Gettysburg Animated Battlefield Map", description with "real time" and "467 regiments and batteries", 3 `<h1>` (`index.html:718,744,753`), `#seo-content` inside `#root` removed at `:425`, JSON-LD only here (`:27-38`, `Event` without `location`), SW registration with `controllerchange -> location.reload()` (`:255-277`) [V]. Nav/footer are JS-injected (`site-nav.js:161-198`), empty without JS [S]; 10 back links use `/index.html` while `wireBackLinks` selects `a[href="/"]` (`site-nav.js:212`) [V]; the app parses only `?ancestor=` (`bundle.pretty.js:101019` [S]). Manifest: `orientation:"landscape"`, `any maskable` icons, no `id`/`lang` [V]. Titles > 60: aftermath 71, dashboard 67, find-ancestor 67, education 61; 11 descriptions < 110; 71 uses of "Animated Battlefield Map" [S].
- **Content (values only; my recount agrees with seo-growth) [V]:** 467 regiment records (465 regiments + alias stub `U-14BK` + the battery `C-McClanahan-ART` filed as a regiment [V, chapter 13 s.2.1]) + 103 batteries = 570 records; 569 distinct units = 465 regiments + 104 batteries; regiment median 17 words, 47 have >= 30, 1 has >= 100, 0 have >= 250; battery median 20; 127 units share 48 duplicate `key_action` strings; 24 vignettes 206-369 words (7.2k total); 9 turning points average 116 words in inline JS; 30 locations average 19 words; 512 monuments, `src` on 9; 93 of 101 brigade ids have records; brigade median 112-120 words, 0 of 101 reach 250 [S].
- **States incl. cavalry [V]:** NY 74 (+ stub), PA 74, VA 59, GA 38, NC 33, MA 18, AL 17, Regular Army 15, OH 14, SC 13, NJ 13, MS 12, MI 11, LA 10, ME 10, VT 9, WI 6, MD 5, IN 5, CT 5 (19 states + Regular Army >= 5); 11 smaller groups hold 25 records incl. a bogus "Multi-state".
- **Third-party product notes in data:** `terrain.json:38`, `union_artillery.json:91`, `placements_day1_ticks1_50.json:80`, `chronology_day1.json:31` [S].
- **Lighthouse (live, LH 13.5):** SEO 100 mobile and desktop; `is-crawlable` weight 4.04 of 12.04 [V].
- **Privacy/Terms:** privacy names Netlify RUM only and "no third-party analytics beyond the performance monitoring" (`privacy.html:35`); Netlify Web Analytics undisclosed; Terms invite embedding "its widget" yet forbid scraping data files (`terms.html:27`) [V, S].

Verifier corrections are applied inline ([S]). Those that change plans: Netlify redirects match query strings (no JS redirect for `/regiment?unit=`); state pages include cavalry (19 states + Regular Army, not 17); `teachthecivilwar.com` is a vendor's paid offering, not a target; the IT-admin list comes from a HAR, not the CSP; FAQPage/HowTo/QAPage do not fit; the audit's "175" search referrals is 173.

## 3. Work-package table

Tier proposal (D-SCOPE-TIERS): T1 = needed for technical A+; T2 = growth content; T3 = gated or stretch. Train = when bytes ship (D-ORDER 4.2).

| WP | Title | Tier | Train / when | Eff | Days | Depends |
|---|---|---|---|---|---|---|
| 01 | GSC, Bing, IndexNow re-verification and baseline | T1 | none now; GSC and key files in R1a | S | 0.4-0.8 | owner action 2 |
| 02 | Traffic-quality protocol, KPI ledger, rollback signals | T1 | none | M | 1-1.5 | 01 |
| 03 | Non-identity hygiene: netlify.app host, dev pages, `/landing.html` | T1 | R1a/R1c (WP-T0-12/15); not R0 | S | 0.3-0.6 | D-ORDER, WP-T0-15 |
| 04 | Social preview integrity: tag parity, decode gate, interim card | T1 | card R1a (WP-T0-14); tags S1 | S-M | 0.5-1 | WP-DEC-09, WP-T0-14 |
| 05 | One URL identity: canonical, generated redirects, both spellings | T1 | S1 | M-L | 2-3.5 | 01 + 28 d, WP-DEC-05 |
| 06 | Sitemap index, robots/AI policy, llms.txt, IndexNow | T1 | S1 | S-M | 0.8-1.5 | 05, D-LICENSE |
| 07 | Manifest and PWA identity | T1 | id R1; name S2; start_url S3 | S-M | 0.5-1.2 | 04 |
| 08 | Name, titles, descriptions, dispositions | T1 | S2 | M | 1.5-2.5 | 05 stable, D-NAME |
| 09 | Structured data per template | T1 | home S2; rest S4 | M | 1.5-2.5 | 08, 12, 15 |
| 10 | Landing `/` + app `/map`, forwarder, cloaking controls | T1 | S3 | L-XL | 4-7 | 08, 13, WP-DEC-01 |
| 11 | Crawlable link graph, breadcrumbs, link CI | T1 | S2, extended | M | 1-2 | 05, D-SITEGEN |
| 12 | E-E-A-T trust pack integration | T1 | S2 | M | 1-2 | D-CONTACT, D-HIST-REVIEW |
| 13 | First-party SEO measurement | T1 | before S3 | M | 1.5-3 | D-TELEMETRY, D-LEGAL |
| 14 | Static-first templates, SVG mini-maps, budgets | T2 | S4 prep | M | 2-3.5 | D-SITEGEN, D-MEDIA |
| 15 | Thin-content + rights gate, slug lock, release governance | T2 | S4 prep | L | 3-5 | 14, hf-01 |
| 16 | Enrichment: computed prose and excerpts | T2 | rolling | XL | 6-10 | hf-17..28, WP-DEC-08 |
| 17 | Moments (24), turning points (9), hubs | T2 | S4.0 | L | 3.5-6 | 14, 15, moments.json |
| 18 | Build-time OG images (own art) | T2 | S4.0 | M | 1.5-2.5 | 04, 14 |
| 19 | Ancestor funnel (20 state pages, guide) | T2 | S4.1 | L | 3-5 | 15 |
| 20 | Order-of-battle tree (Tier-B units gated) | T2 | S4.2+ | XL | 6-10 | 15, 16, P2/P3 |
| 21 | Places, commanders, monument groups | T3 | S4.3 | L-XL | 4-8 | pagesB-35, prov-recon-27 |
| 22 | Day and part-of-day pages | T3 | after D-TIME | L | 3-5 | D-TIME signed |
| 23 | Reviewed Q&A hub (about 60) = hf-32 | T2 | S4.3 | L | 4-7 | D-HIST-REVIEW |
| 24 | Classroom kit `/learn` v1/v2 | T2 | S4.1; v2 by 06-01 | L-XL | 4-8 | 17, D-SCHOOLS |
| 25 | Embeds, oEmbed, cite, print, share | T2 | S4.2 | M | 1.5-3 | 05, D-LICENSE |
| 26 | Open dataset + DOI (`/dataset`) | T3 | after DG-3 + counsel | M-L | 2-4 | D-LICENSE, WP-DEC-08 |
| 27 | Search intelligence: keyword map, competitors, SERP/AI logs | T2 | D14 v1; monthly | M | 1.5-2.5 | 01 |
| 28 | Outreach programme | T2 | from 2027-03 | L | 3-6 | 24, 17, 04 |
| 29 | Editorial calendar, style guide, lints | T2 | before S4 | M | 1-2 | docs-copy-26 |
| 30 | SEO CI suite, monitors, runbook | T1 | with S1, grows | M | 2-3.5 | 05, 15 |
| 31 | Video channel (own basemap only) | T3 | post-cutover | L | 3-6 | D-MEDIA, D-UNIT-RENDER |

Totals: T1 18.0-32.6 d; T2 40.0-70.5 d; T3 12.0-23.0 d; all 70.0-126.1 d. T1 (18.0-32.6 d) meets the register's 15-25 d SEO line only at its low end even after netting the shared redirect generator (part of WP-05) and collector (part of WP-13), which chapter 09 also budgets; chapter 15 (category table, section 3) carries SEO at 26 d P50 on the L path and 48 d on the full path, the figure to schedule against.

## 4. Work-package specifications

Each block: Covers (specialist ids) / Audit / Fix / Acceptance / Moves. Effort, tier, train, dependencies: section 3.

### WP-SEO-01 - GSC, Bing, IndexNow re-verification and baseline of record
**Covers:** seo-growth-01, -07 (verify part; execution is owner action 6), MISSED-4, MISSED-8 (DNS note); deploy-history-12; infra-netlify-35. **Audit:** T1.
**Fix:** (1) Netlify DNS: add the Google TXT for a **Domain** property now; never delete it; list it in `ops/inventory.yaml`; second owner and alerts on. (2) Check the builder's Google account for an old property (seo Q9) and verify it too. (3) Bing Webmaster Tools: "Import from Google Search Console" (Bing's own DNS method is a CNAME, not TXT [U]). (4) Submit the current `sitemap.xml` in both; leave it unchanged until S1. (5) Day-0 capture, no deploy: URL Inspection live test + rendered HTML + screenshot of `/`, `/historian`, `/documentary`, `/find-ancestor` (settles whether Google indexes the app shell or `#seo-content`); export GSC Performance (page x query x country x device, all history offered), Pages, Links, Crawl stats; Bing Performance, Inbound links, Site Scan; Netlify PDFs; summary in `docs/seo-baseline-2026-10.md`. (6) If GSC shows June-September 2026, the July 1-3 2026 curve calibrates section 6. (7) IndexNow: make the key now; `/<key>.txt` rides R1a with WP-T0-14 (R0 stays a minimal atomic mechanism release, D-ORDER); first POST after S1 (Google ignores IndexNow). (8) Restore the 52-byte `google0dca4879c9657741.html` in R1a with WP-T0-14 (register action 2 and chapter 02 ship it unconditionally; it is harmless and recovers any old property); it must return 200 at that path (never a `/*.html` wildcard redirect). Bing's own DNS method is a CNAME, not the TXT the register's action 2 names [U]: use "Import from Google Search Console" or the CNAME, whichever Bing offers (section 9 item 5).
**Acceptance:** `dig TXT` shows the token; both consoles "Ownership verified"; 6 seed URLs inspected within 14 days; baseline doc committed; RDAP expiry >= 2031-06-13. **Moves:** TA-01, TA-18.

### WP-SEO-02 - Traffic-quality protocol, KPI ledger, release annotations, rollback signals
**Covers:** seo-growth-36, -38; critics-2 SEO change management; infra-netlify-32, perf-cwv-18. **Audit:** T1, T2.
**Fix:** (1) `docs/kpi.xlsx`, one Monday row (15 min): search referrals by engine, AI referrals, GSC clicks/impressions/position for brand + top 20 queries, indexed/submitted per sitemap, Bing equivalents, referring domains, 404 rate, CWV; baselines per section 2. (2) `docs/seo-release-log.csv`: release id, train, date, WPs, redirect-map version, matrix result (GSC has no annotations). (3) E1 probe once: `curl` `/documentary` 5x with a default and 5x with a crawler UA from one IP; if the next hourly Netlify delta counts both, "pageviews" include bots. (4) Single-page + non-US + no events = bot-like; no geo-blocking. (5) Block `/.netlify/scripts/rum` in the owner's test profile (register action 12b). (6) Rollback triggers (about 2 Google visits/day cannot show a 30-50% click change): matrix failure; spikes in "Page with redirect", soft-404, "Duplicate, Google chose different canonical"; indexed URLs -20% vs pre-train; brand impressions -50% for 7 days; action = Netlify "Publish deploy" of the previous build (atomic, freeze-exempt). (7) Reviews at T+1, 7, 14, 28.
**Acceptance:** 12 consecutive weekly rows by 2027-01-01; `docs/traffic-quality.md` (human-share estimate) by 2026-10-31; a stored before/after export per train. **Moves:** TA-17.

### WP-SEO-03 - Non-identity hygiene: netlify.app host, dev pages, `/landing.html`
**Covers:** deploy-history-11; infra-netlify-12, -15; seo-growth-03 (host, `/landing`), MISSED-1 (diagnostics twin); pages-C-90/91. **Audit:** T3, X4. D-NETLIFY-DOMAIN allows R0 or R1; chapter 02 places the bytes in R1 (dev-page removal R1a = WP-T0-12/WP-INFRA-13; netlify.app host 301 R1c = WP-T0-15, one implementation with WP-INFRA-12; the `/landing.html -> /` row is a redirect-map row and ships in S1 with WP-05, since register 4.2 lists redirect maps as identity-level), keeping R0 atomic. This WP keeps the SEO acceptance and the owner deploy-deletion step (5).
**Fix:** (1) Primary-domain setting first; else `https://friendly-lolly-da85c0.netlify.app/* -> https://gettysburginteractivemap.com/:splat 301!` (http too). (2) Deploy-preview/branch contexts send `X-Robots-Tag: noindex`. (3) Remove `diagnostics.html` and `unit-rendering-reference.html` from the publish tree (`/diagnostics` is 200 today [V]). (4) `/landing.html -> /` 301 per D-URL (S1 row, WP-05; until then it stays a 404 today [V]). (5) After S0 the owner deletes non-current deploys, keeping two (old permalinks still serve the USD 9.99 pricing page [S]).
**Acceptance:** netlify.app `/` and `/historian` return 301; both dev pages 404 in both spellings; a Deploy Preview returns `noindex`. **Moves:** TA-02/03. **Risk:** the primary-domain setting may not redirect [U].

### WP-SEO-04 - Social preview integrity: tag parity, decode gate, interim card
**Covers:** seo-growth-02; infra-netlify-25; pages-C-02, -08; pagesA-37 (OG); pagesB-09; deploy-history-13; prov-recon-42; app-design-32; MISSED-7. **Audit:** T1, E1.
**Fix:** (1) Card from WP-DEC-09: 1200x630, <= 150 KB, 8-bit RGB PNG, own vector art, name-neutral (S2 renames without redoing it); the file is `/og/card-r1.png` as chapter 02 WP-T0-14 names it (scrapers cache; never reuse or rename it; S1 only points more tags at the same file); no screenshot art (it would bake in C1/C3/C4). (2) Every indexable page: `og:site_name`, `og:locale`, `og:image` + width/height/alt, `twitter:card summary_large_image`, `twitter:title/description/image/alt`, `og:description` = description; add the block to the 10 feature pages lacking `twitter:card` (ar, cinematic-export, find-ancestor, ground-remembers, historian, immersive, living-ledger, regiment, turning-points, watch-together) and og/twitter to privacy/terms. (3) The two corrupt manifest screenshots are deleted in R1a by WP-T0-14/WP-SEO-07 (real ones after C1/C3: WP-07); not a second edit here. (4) CI `SL-09`: Pillow decode + declared size + stddev threshold + distinct md5. (5) Refresh the Facebook and LinkedIn scrapers (Slack has no purge: use a new filename).
**Timing (resolved, was OD-SEO-3):** the image swap and manifest cleanup ship in R1a (chapter 02 WP-T0-14, chapter 15 RM-15): no URL, title, description or name changes, so it is not identity-level. Tag parity (`twitter:card` on 10 pages, image w/h/alt, `og:site_name`/`og:locale`, `og:description` = description) and the decode/distinct-md5 gate ship in S1 because register 4.2 lists "valid OG, twitter tags" there and `og:description` equalisation is a description change.
**Acceptance:** every referenced image decodes at 1200x630, <= 150 KB; `twitter:card` on 100% of indexable pages; debuggers show the card for `/`, `/documentary`, `/find-ancestor`. **Moves:** TA-04/05.

### WP-SEO-05 - One URL identity: canonical system, generated redirects, both-spelling rules (S1)
**Covers:** seo-growth-03; infra-netlify-11; pagesA-37 (canonical), pagesA-06, pagesB-09, pages-C-86; ux-flows-07; MISSED-1, MISSED-3 (selector). **Audit:** T3, E5, X4. **Decision:** D-URL.
**Mechanism is shared:** the generator, header invariant and redirect matrix are WP-INFRA-10/11/12 (chapter 09; one generator, `scripts/gen-netlify-config.mjs` per register D-URL; chapter 12's `tools/gen-headers.mjs` is only the tested sketch and WP-QA-03 owns the tests); this WP owns the SEO content of the S1 deploy (canonical/`og:url`/JSON-LD/sitemap/href rewrites, dispositions, matrix acceptance). Count the redirect work once (chapter 15 RM-23/24).
**Fix:** (1) `pages.manifest.json` (docs-copy-16/pagesA-39): slug, file, disposition, tier, title, description, `redirect_from[]`. (2) `scripts/gen-netlify-config.mjs` emits `_redirects` (`301!`; one row per page, 27 files incl. `/index.html -> /`, plus `/landing.html -> /`; `*` is valid only at path end, so no `/*.html` wildcard) and `_headers` for BOTH spellings of every path rule, one rule per header name (Netlify cannot unset a header): `/embed` and `/embed.html` get only `Content-Security-Policy: frame-ancestors *` + `X-Robots-Tag: noindex`; other paths `frame-ancestors 'self'`; HTML keeps `no-cache, must-revalidate` (not `no-store`: bfcache). Interim: the same rows hand-written in `netlify.toml`. (3) `[build.processing.html] pretty_urls = false` only if WP-DEC-05 shows `/x` still serves; else keep it on and rely on the rows. (4) One deploy rewrites canonical, `og:url`, JSON-LD `url`, sitemap, `site-nav.js` GROUPS, the `#seo-content` nav, the 18 static links, the 10 back links (aftermath:41, camera:46, compare:53, dashboard:58, documentary:47, education:42, report:49, sandbox:52, search:50, viewshed:43) and the emitters (documentary:92, education:81, embed:60, search:114/127/139) to `/` forms; S3 retargets back links and emitters to `/map`. (5) `redirects/vN.json` (WP-INFRA-12's format: from, to, status, since, reason; a `.tsv` export is fine for review): append-only, rows kept >= 12 months; the GSC file path has no row. (6) Appendix B matrix in CI and after deploy; expect weeks of "Alternate page with proper canonical"; request no removals.
**Acceptance:** matrix green (each legacy form one 301, final 200, canonical = final URL; `/embed` frameable cross-origin, `/` not); no `.html`/`/index.html` rows in Netlify Analytics after 14 days; GSC shows the extensionless URL as user-declared canonical by day 60. **Moves:** TA-02/11, HP-10..12. **Risk:** loop or a missed spelling; rollback = previous deploy.

### WP-SEO-06 - Sitemap index, robots and AI-crawler policy, llms.txt, IndexNow (S1)
**Covers:** seo-growth-06, -27 (a, g); infra-netlify-35; hist-final-plan `/hx/f/`. **Audit:** E5, T1. **Decision:** D-LICENSE.
**Fix:** (1) `sitemap.xml` becomes an index (same URL) -> `sitemap-core.xml` at S1; per-template children (`-moments`, `-units`, `-ancestors`, `-learn`, ...) join as templates ship, so "Indexed vs submitted" shows per template. (2) `<lastmod>` = last content change (git date; before Git deploys, a content-hash diff against the last production manifest); no `changefreq`/`priority`; only canonical, 200, `index` URLs. (3) `robots.txt` per Appendix A; never `Disallow` a noindex page; `X-Robots-Tag: noindex` header (tool pages can still fetch JSON) on `/data/*`, `/hx/*`, `/api/*`. (4) `robots.txt` and `sitemap*.xml` cache 3,600 s (86,400 today [V]). (5) `llms.txt` short and accurate; `max-image-preview:large` on indexable pages. (6) Verify vendor token spellings first (only OpenAI and Anthropic were checked [S]). (7) After S1: submit sitemap, IndexNow POST of the new URLs, GSC "Request indexing" for `/` + 5 hubs (quota about 10-12/day [U]).
**Acceptance:** `robotparser` matrix (Googlebot/Bingbot/OAI-SearchBot/PerplexityBot allowed on `/data/x.json`; GPTBot/ClaudeBot blocked there, allowed on `/moments/x`); every sitemap URL 200/`index`/self-canonical; `/llms.txt` 200 `text/plain`. **Moves:** TA-03/12.

### WP-SEO-07 - Manifest and PWA identity
**Covers:** seo-growth-08; infra-netlify-24; mobile-18; deploy-history-24; app-a11y-29; MISSED-7(b). **Audit:** E1, E2. **Decision:** D-ROOT.
**Fix:** R1a (with chapter 02 WP-T0-14, RM-15): `id:"/"` (installs derive their id from `start_url "/"`, so nothing re-identifies [S register]); drop `orientation`; `lang:"en-US"`; separate `any` and `maskable` icons (opaque full-bleed maskable, art inside the 60-66% safe zone; current corners are 22-24% transparent [S]); `application/manifest+json`; delete the corrupt screenshots. S2: `name` "Gettysburg Interactive Map", `short_name` "Gettysburg Map"; real wide (1280x720) and narrow (750x1334) screenshots after C1/C3. S3: `start_url:"/map?source=pwa"`, shortcuts (Day 1/2/3, Search). `id` never changes again.
**Acceptance:** DevTools Manifest pane 0 warnings; an Android PWA installed before S3 keeps its identity after; rotation free; `id` unchanged in git history. **Moves:** TA-04, SL-08/10.

### WP-SEO-08 - Name, titles, descriptions, page dispositions (S2)
**Covers:** seo-growth-04, -05; docs-copy-05, -29; ux-flows-16 (non-affiliation); pages-C-08; pagesA-37. **Audit:** E2, E3, T1. **Decision:** D-NAME (A).
**Fix:** (1) Base table: docs-copy-29's 21 rows (`plan-work/tmp-docs-copy/seo_replacements.json`): `{keywords} | Gettysburg Interactive Map`, brand dropped when > 60; Index-page descriptions 120-155 (about 12 of the 21 are shorter), unique; viewshed "High Ground: Battlefield Vantage Points" (D-VIEWSHED). Home title: chapter 11 DC-1 and chapter 15 s.13 item 7 replace the register's "Gettysburg Interactive Map: The Battle in Five-Minute Steps" (59) with "Gettysburg Interactive Map: The Battle, July 1-3, 1863" (54), because after the time-warp a step is 0.83-42.3 minutes and S2 ships before D-TIME is signed; the owner may keep the register text at DG-0 (section 9 item 4). Counts from `unit_counts` (today 465 regiments + 104 batteries = 569 units; never hard-coded 467/570/466). Authoring of the same table is WP-CONTENT-07 (one deploy, count once: chapter 15 RM-25). (2) Dispositions: Index = home, documentary, dashboard, historian, find-ancestor, turning-points, aftermath, regiment, report, privacy, terms, plus any tool page with >= 150 unique server-rendered words and its own card; noindex,follow = search, embed, 404, AR (until DG-4) and thin tool pages (compare, camera, sandbox, viewshed, ground-remembers, living-ledger, immersive; re-decide at S4). Retired Labs (Watch Together, Cinematic Export, Sandbox if DG-3 says so): out of nav and sitemap here, 301 rows in S4.0. (3) `WebSite.name` + transitional `alternateName` "Gettysburg Animated Battlefield Map"; footer/About line "Not affiliated with the National Park Service, the American Battlefield Trust or any publisher" (owner confirms it is true: register action 10c). (4) Purge "Animated Battlefield Map" (except `alternateName`/changelog), unhyphenated "minute by minute" (`site-nav.js:46`, living-ledger), "real time", "AI-style"; "Animated" stays a body word.
**Acceptance:** script asserts length, uniqueness, `og == meta`; SL-27 brand equality across title/og/twitter/manifest/JSON-LD/footer; grep rules; GSC site-name check after recrawl. **Moves:** TA-04/15. **Risk:** titles can move rankings for 2-6 weeks [U]; S2 travels alone.

### WP-SEO-09 - Structured data per template + validator
**Covers:** seo-growth-10; pagesA-37, pagesB-09, pages-C-08. **Audit:** T1.
**Fix:** `scripts/seo/jsonld/*.mjs` emits one `@graph` per template with stable `@id`s. **Home:** `WebSite` (name + alternateName), `Person` creator (real About page; OD-SEO-1), `WebApplication` (`offers` 0, `isAccessibleForFree`, `ViewAction` -> `/map`), `Event` `about` with `location`. **Every non-home page:** `BreadcrumbList` matching the visible trail. **Moment/turning point/Q&A/lesson/guide:** `Article` (`LearningResource` for lessons), `WebPage.reviewedBy` only with a reviewer decision. **Hubs:** `CollectionPage`+`ItemList`. **Unit/brigade:** `Organization` (`parentOrganization`, `location`, no invented dates). **Place:** `Place`+`geo`. **Commander:** `Person`, confirmed `sameAs` only. **Dataset:** `/dataset` only, without latitude/longitude/tick in v1. **Video:** only with real videos. Not used: FAQPage, HowTo, Sitelinks search box, AggregateRating (not offered/eligible; re-check the gallery at build). `dateModified` from git; home graph at S2, templates with their pages.
**Acceptance:** Rich Results Test + Schema validator 0 errors, one URL per template; GSC Breadcrumbs valid >= 95% within 30 days; CI fails on an `Event` without `location` or a `sameAs` outside the owner allow-list. **Moves:** TA-06.

### WP-SEO-10 - Landing `/` + app `/map`, forwarder, cloaking controls, keep/revert (S3)
**Covers:** seo-growth-09; MISSED-2, -3; deploy-history-23; perf-cwv-05; ux-flows-15. **Audit:** E3, E4, T1. **Decisions:** D-ROOT, D-ENTRY, D-SW.
**Interim (R1, non-identity, log it; not R0, which stays atomic and minimal per D-ORDER; boot chapter owns the code):** one visible `<h1>` on the current home (`index.html:744` splash h1 becomes `<p>`, shipped with the a11y shim WP-T0-10, R1b; `#seo-content` retires once a visible hero exists); "AI-style" wording replaced by WP-CONTENT-01/02 (Appendix A rows 7-10 of chapter 11 own the strings).
**Landing:** static (Astro; if D-SITEGEN is late, hand-authored HTML with the same partials): one `<h1>` "Gettysburg Interactive Map"; answer-first 40-60 words; >= 250 words; CTA "Open the map" + Moments, Order of battle, Find your ancestor, Teach; three sourced facts linking `/sources`; "How accurate is this map?" (478 placed ids carry keyframes: 217 of 465 regiments and 38-41 of 104 batteries have their own, 231 regiments are drawn through their brigade and 19 have none [V, chapter 13 s.2.1]; the earlier "152 units / 23 regiments own" figure is not reproducible and is dropped; numbers come from `facts.json`); own-data SVG poster as LCP (WP-14); no map JS, no SW.
**`/map`:** `noindex,follow`, self-canonical, not in the sitemap, never `Disallow`ed, real `<title>`, one visually hidden `<h1>` (<= 10 words, same as visible UI), full OG/Twitter tags (shared deep links unfurl with a map card); the SW registers only here (D-SW; the R0 SW never intercepts navigations, so `/` is unaffected). `wireBackLinks` (`site-nav.js:212`), back links and the PWA target `/map`; the brand link targets `/`; keep `history.back()` when the previous entry is the map (bfcache).
**Forwarder** (first inline script in `<head>`, CSP-hashed, before paint): send `/` + query + hash to `/map` when the query holds any D-URLSTATE canonical or alias param (list generated from that contract so it cannot drift) or `gtbg_seen` OR `gtbg_onboarded` is `1` (existing users only have the latter [S]), unless `?landing=1`; `/map` writes `gtbg_seen`. Nothing keys on user agent, referrer or geography. Optional hardening (WP-DEC-05): query-matched server 301 rows for the same params.
**Cloaking controls:** (1) same bytes for every UA: CI fetches `/` and 5 templates as {Googlebot smartphone, Bingbot, GPTBot, iPhone Safari, Chrome desktop} and compares body hashes; no `Vary: User-Agent`, no UA/IP/geo branch in `_redirects`, edge functions or JS on indexable URLs. (2) The `/map` cost breaker (poster for bots/headless) is interaction-based and only on the noindex app. (3) All landing text is visible at 375 and 1440 (SL-28); `<noscript>` mirrors it; `#seo-content` is deleted, not extended. (4) URL Inspection live test of `/` and `/?tick=300` at S3 and monthly.
**Keep/revert (D-ROOT):** `map_launch / landing_view` >= 45% by 2027-04-19; else add a hero preview; < 30% reverts to Option B via the next `redirects/vN.tsv`, agreed in advance. Only client-fired events count.
**Acceptance:** `curl -s /`: one `<h1>`, >= 250 words, all hub links, no external script; URL Inspection rendered HTML = raw; Playwright matrix (fresh -> landing; `gtbg_onboarded=1` -> `/map`; `/?tick=300` -> `/map?tick=300`; `?landing=1` -> landing); landing LCP <= 1.5 s lab mobile; `manifest.id` unchanged. **Moves:** TA-07/16. **Risk:** lower launch rate; users who cleared storage see the landing once.

### WP-SEO-11 - Crawlable link graph, breadcrumbs, HTML sitemap, link CI
**Covers:** seo-growth-24; pagesA-05 (SEO share). **Audit:** T1, E4.
**Fix:** nav and footer as real `<a href>` in raw HTML on every page (pre-rendering belongs to the site-generator chapter; mounts are empty without JS today [S]); visible breadcrumbs + JSON-LD; related blocks computed from the data graph (unit -> siblings, state, moment; moment -> previous/next, units, place; state -> units); `/site-map` HTML page for Tier-A hubs (authored in WP-CONTENT-17; not `/sitemap`, which would sit beside `/sitemap.xml`); descriptive anchors; `scripts/seo/linkgraph.mjs` prints depth, orphans, inbound counts, redirected/404 targets.
**Acceptance:** depth <= 3, orphans 0, >= 3 inbound links per indexable page, 0 links to redirected URLs; `curl` of a sub-page shows nav/footer links. **Moves:** TA-09.

### WP-SEO-12 - E-E-A-T trust pack integration
**Covers:** seo-growth-25; ux-flows-28; docs-copy-17, -18, -19, -22, -23 (authoring counted in the docs chapter, about 6-9 d). **Audit:** T1, G1, H10.
**Fix (SEO requirements; authoring is WP-CONTENT-14/16/17/19/20/21):** `/about /sources /method /corrections /changelog /press /contact /accessibility` (plus `/faq /glossary /guide /teach` from chapter 11; the cite box is a section of `/sources`, `/cite` is at most a 301 to `/sources#cite`; `/method` is authored together with `/sources` in WP-CONTENT-14), extensionless, in every page's raw-HTML footer; `/sources` generated from `sources.yaml` (hf-01/hf-38), not typed; `/method` states documented vs modeled with counts from `unit_counts`; reviewer credit and "Unreviewed reconstruction" badge per D-HIST-REVIEW (CI fails on "Reviewed" without a signed decision); `/corrections` with a dated seed entry (the counts fix) and the 3-business-day acknowledgement; role addresses (D-CONTACT), no personal Gmail in shipped HTML. The owner supplies real bio facts and reviewer consent; no invented credentials. Ships with S2 (drafts earlier; `/about` and `/corrections` may ship sooner if the legal chapter needs them).
**Acceptance:** pages live and linked in raw HTML; `/sources` names every source in `data/**/metadata.sources`; grep "minute-by-minute|467 regiments" empty; About names a real person and contact. **Moves:** TA-14/15.

### WP-SEO-13 - First-party SEO measurement under D-TELEMETRY
**Covers:** seo-growth-35, -36 (E2/E5); ux-flows-21 (SEO subset); infra-netlify-32. **Audit:** T1, T2, X5. **Decisions:** D-TELEMETRY, D-LEGAL step 1.
**Fix:** no separate vendor (supersedes seo-growth-35's Plausible/GoatCounter/Umami options): typed `event` messages to the single `/api/ingest`: `landing_view`, `map_launch{source}`, `moment_open`, `unit_open`, `search_used{bool, count bucket}`, `ancestor_lookup{state only}`, `share_copy{type}`, `embed_load{host}`, `kit_download`, `classroom_share_click`, `outbound_click{host}`, `cite_copy{format}`, `correction_click{path}`. Never query text or surnames; GPC/DNT send nothing; bot rules per D-TELEMETRY; no cookies or ids; owned outbound links carry UTM, stripped by `history.replaceState` after read; referrer buckets include `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `claude.ai`, `gemini.google.com`; owner-exclusion flag; the privacy page lists events in plain words in the same release. `landing_view` and `map_launch` must be live before S3.
**Acceptance:** dashboard shows events within 24 h; capture shows same-origin only and no personal fields; GPC test sends none; privacy diff dated. **Moves:** TA-13. **Risk:** small n; the collector itself is infra/perf work.

### WP-SEO-14 - Static-first template architecture, SVG mini-maps, budgets
**Covers:** seo-growth-12 (+4.6). **Audit:** T1, P1-P4, X1. **Decisions:** D-MAP-ENGINE, D-MEDIA.
**Fix:** per-page budget: HTML <= 35 KB raw/<= 12 KB br, inline critical CSS <= 10 KB, JS <= 15 KB deferred, 0 third-party requests, LCP = h1 or SVG, self-hosted Spectral WOFF2 (D-DESIGN). `scripts/minimap/render.mjs` emits an inline SVG <= 15 KB from own data only (`terrain.json` locations/roads/structures, USGS 3DEP contours, Census TIGER roads [U: confirm terms]; never Mapbox imagery): `role="img"`, `<title>/<desc>`, caption "Modeled positions; modern terrain (USGS 3DEP)". A live map only behind an explicit "Load interactive map" button on place/brigade pages (never scroll/IntersectionObserver). **Rights gate:** no unit-position art until the provenance audit (WP-DEC-08) clears positions; place-only maps first.
**Acceptance:** Lighthouse mobile >= 98 on one page per template; no `mapbox` request before the button; Mapbox map loads flat during a staging crawl. **Moves:** TA-10; Mapbox cost.

### WP-SEO-15 - Thin-content + rights gate, slug lock, release-train governance
**Covers:** seo-growth-13, -34 (lint share); ux-flows-25; hist-final-plan hf-28 (interface). **Audit:** T1, E4, E5.
**Fix:** `scripts/seo/gate.mjs` on built HTML with the Appendix G thresholds. **Field allow-list per template** (never spread a record): dev fields (`flag`, `flag_notes`, the four third-party-product notes in section 2) cannot render. **Rights gate:** every rendered field resolves in `sources.yaml` to Tier A/B with attribution; Tier C or A-pending fails. **Lints:** dev-copy regex; hard-coded 467/445/430,000; clock strings (`\d{1,2}:\d{2}` needs a signed anchor or a quoted source: D-TIME hold). On failure: a unit page is not emitted (folds into a brigade `#u-...` anchor); a Tier-A page fails the build; a Tier-B page ships `noindex,follow` and stays out of the sitemap. `slugs.lock.json` is append-only (a rename adds a 301 row forever); generated `/u/{unit_id}` and query rows (`/regiment unit=U-20ME /units/20th-maine-infantry 301!`; no JS redirect); alias stub `U-14BK` never a page (301 to the 84th New York + `alternateName`). Train: <= 100 new URLs/week, owner reads 10 random pages per batch, pause when a section's "Crawled - not indexed" > 25% two weeks after release. `scripts/seo/measure-corpus.mjs` regenerates the corpus numbers in CI.
**Acceptance:** `gate-report.json` lists every page; 0 Tier-A failures; GSC "Indexed/Submitted" >= 80% for batches older than 30 days. **Moves:** TA-08.

### WP-SEO-16 - Enrichment: computed prose and excerpts (SEO share of the Historian corpus)
**Covers:** seo-growth-14; MISSED-5, -6; hist-final-plan hf-17..28; hist-sources-1/2. **Audit:** T1, H8.
**Fix:** (1) Computed prose first (no licence question), 40-150 words/unit: loss-rate rank within side and corps ("9th of 274 Union regiments"), share of brigade/corps losses, days engaged, brigade displacement (worded "brigade position"), nearest landmark (haversine to `terrain.json`), sourced monuments within 300 m, succession chain (`commander_successions.json`: 42 events), state cohort, vignette links. (2) Public-domain text via the Historian pipeline: consume the WP-HIST-22 export (`units/<slug>.json` under `apps/web/public/hx/`: facts, <= 3 excerpts <= 120 words with cite, scan url, licence, reviewer, related; schema owned by chapter 14 WP-HIST-22, [U] until it is built; hf-28's `kb/export/unit_pages/{id}.json` path is superseded); never paste whole reports. (3) Busey and Martin: facts only, attributed (D-LICENSE); Wikipedia excerpts (CC BY-SA) never blended; ABT, Stone Sentinels, HMDB link-out only. (4) Provenance audit first (register action 10, WP-DEC-08): the four third-party-product notes, atlases (Gottfried, Laino, Desjardin), Google imagery, 18 monument coordinates from Stone Sentinels/HMDB/Wikipedia [S].
**Acceptance:** no Tier-B page before Historian P3 exits; then 60 pilot units, each with >= 1 approved excerpt and >= 250 words; any quoted sentence traces to a scan in <= 2 clicks. **Moves:** TA-08. **Risk:** P3 is months away; brigades need P2 or enough computed prose.

### WP-SEO-17 - Moments (24), turning points (9), hubs
**Covers:** seo-growth-15, -22; pages-C-58/59/60; pagesB-14/53; ux-flows-05, -25. **Audit:** T1, E4, C4.
**Fix:** `/moments` and `/moments/{slug}` from `moments.json` v0 + vignette schema v2 (`sources[]`): h1, eyebrow (day + place only until D-TIME is signed), answer-first 40-60 words (unlike the meta description), narrative, who was there, the ground (SVG), around this moment (chronology events by tick adjacency; no clock strings until signed), debate link, sources, map CTA `/map?tick=&vignette=`, previous/next, cite box; >= 400 words after enrichment. `/documentary` keeps the player and links each step to its moment URL. Turning points: prerender the nine `<article id>` (today an empty `<main id="list">`, `turning-points.html:48`) and `/turning-points/{slug}` >= 400 words with >= 2 sources; fix Ewell's tick 175 vs 75; honesty line ("a historians' debate, not a simulation"). Batches of 12 + hub.
**Acceptance:** 24 + 9 pass the gate; raw HTML holds the narrative; Article + Breadcrumb valid; GSC >= 20 of 24 indexed within 45 days; CTAs open the right tick once the T0 deep-link parser ships. **Moves:** TA-06/08.

### WP-SEO-18 - Build-time OG images (own vector art)
**Covers:** seo-growth-11. **Audit:** T1. **Decision:** D-MEDIA.
**Fix:** `scripts/og/render.mjs` (Satori + resvg-js + quantiser): 1200x630, <= 120 KB; `#0a0a14` field, gold rule, eyebrow (date/place only after D-TIME sign-off; before it "Battle of Gettysburg, 1863 - {place}"), title <= 2 lines in Spectral, the page's SVG mini-map, wordmark; hashed names `/og/<tpl>/<slug>.<hash8>.png` (immutable); descriptive alt; fallback card; one `docs/media-rights.csv` row per raster.
**Acceptance:** SL-09 + stddev check; 5 URLs in the Sharing Debugger and Post Inspector. **Moves:** TA-05.

### WP-SEO-19 - Ancestor funnel
**Covers:** seo-growth-20; pages-C-63/64/65/66. **Audit:** T1, H5. **Decision:** D-CWSS (link-out only).
**Fix:** `/ancestors` hub; `/ancestors/{state}` for the 19 states with >= 5 units + `/ancestors/regular-army` (20 pages); `/ancestors/other-states` (11 groups, 25 records); counts include cavalry and equal `unit_counts`. Each page: 150-word intro, full unit table (designation, corps/brigade, strength, losses, rate, days, link), mini-map, tracing checklist with archive links verified before publishing [U], FAQ (a regiment being present does not mean every man was [S NPS]), link-outs to NPS CWSS, NARA, FamilySearch, the ABT guide (nothing fetched or stored). Guide `/find-your-civil-war-ancestor-at-gettysburg` >= 1,500 words, no HowTo markup. The lookup gains commander and alias search ("14th Brooklyn"); no analytics on query text; honest "regiment-level" label; no roster shards before NPS confirms in writing.
**Acceptance:** 20 pages + guide pass the gate; guide indexed within 45 days; >= 3 genealogy-community mentions by 2027-06-27. **Moves:** TA-08; referring domains.

### WP-SEO-20 - Order-of-battle tree (Tier-B units gated)
**Covers:** seo-growth-17. **Audit:** T1, H10.
**Fix:** `/units`, side hubs, 11 corps, 31 divisions, 101 brigades (VI Corps only after its 8 missing brigade records exist [S]). Brigade page >= 250 words: nickname, commander + succession, regiments table, own-keyframe SVG track or an honest "no keyframes" line, monuments within 300 m, computed prose, OR excerpt after P2. Regiment/battery pages (Tier B): none before Historian P3; pilot 60, ceiling about 180 (the report's 180 candidates are not reproducible; verifier: 157 [S]); about 390 other units stay anchors (Tier C).
**Acceptance:** 101 brigades + 11 corps + 31 divisions (+ 2 army hubs; the earlier "13 corps" most likely counted the armies, chapter 13 s.2.1 lists 11 corps) pass the gate; `/u/U-20ME` and `/regiment?unit=U-20ME` reach the canonical; OOB sitemap >= 80% indexed 60 days after release. **Moves:** TA-08.

### WP-SEO-21 - Places, commanders, monument groups (T3)
**Covers:** seo-growth-18, -19, -21. **Audit:** T1.
**Fix:** 30 places (150-250 authored words each), no elevation printed until `terrain.json` is corrected (13 of 30 differ by > 50 ft from 3DEP [S pagesB-35]); about 40 Tier-A commanders (owner-approved; every claim sourced); 13 monument-group pages (the groups with >= 10 of 24: PA 122, NY 94, Individuals 64, MA 30 ...) after `src` is filled for 100% of rows (9 of 512 today; NPS catalogue is the natural source [U]) and the 18 legacy Tier-B/C coordinates are replaced or credited; never 512 thin pages.
**Acceptance:** each page passes the gate; elevations within 1 ft of the verified file; 100% of rows sourced. **Moves:** TA-08.

### WP-SEO-22 - Day and part-of-day pages (T3, blocked on D-TIME)
**Covers:** seo-growth-16; app-time. **Audit:** C4, T1.
**Fix:** only after D-TIME sign-off (DG-3) and `time_anchors.json`: `/battle/july-1|2|3` and about 13 part-of-day pages (boundaries from the corrected clock and event density), times from `TimeModel.format` only, >= 500 words, positions table per window; never hour pages. The all-in-one chronicle is `noindex,follow`.
**Acceptance:** no clock string disagrees with `TimeModel`; Pickett's Charge near 3 pm July 3, not 11:05 am. **Moves:** TA-08.

### WP-SEO-23 - Reviewed Q&A hub (about 60) = hf-32 = WP-HIST-26
**Covers:** seo-growth-23; hist-final-plan hf-32. **Audit:** H8, T1. One work package, two chapters: the 60 answers and their `rv.*` shards are authored and budgeted once in WP-HIST-26 (chapter 15 RM-76); this WP owns only the `/questions` templates, gate thresholds and indexing.
**Fix:** `/questions` + 60 human-authored answers (40-60-word answer, 150-300-word explanation, sources, last-reviewed date, links); no bulk LLM generation (scaled-content abuse; it would poison the Historian eval); the same 60 become gold items; the first 20 may start after G-A1; no FAQPage/QAPage markup.
**Acceptance:** 60 pages pass the gate (>= 250 words, >= 1 source); the Historian returns the cited fact for each. **Moves:** TA-08; AI citations. **Risk:** reviewer hours (D-HIST-REVIEW).

### WP-SEO-24 - Classroom kit `/teach` (teachers) and `/learn` (students)
**Covers:** seo-growth-31; ux-flows-13 (public pages); docs-copy-24. **Audit:** T1, G1. **Decision:** D-SCHOOLS. **URL naming (review 3):** this chapter's earlier `/learn` for the kit is replaced by chapter 11 DC-4/CD-7 and the register's D-SCHOOLS: `/teach` = teacher hub (lessons, printables, Classroom links, `/teach/it-admin`, `/teach/student-privacy`); `/learn` = the students' edition (`/education` folds into it, D-SCOPE-TIERS). Where sections 1.2, 5, Appendices C and E still say `/learn` for the lesson hub, read `/teach`. **No double budget:** lesson and student text is WP-CONTENT-22/23 (chapter 15 RM-83 counts them with this WP once); this WP owns templates, `LearningResource` JSON-LD, share links, sitemap child, PDFs' indexability and outreach hooks.
**Fix:** v1 (S4.1): hub + the 3 launch lessons of WP-CONTENT-22 (Reading a battle from maps, Decisions at Gettysburg, Casualties as data; this chapter's earlier working titles Battle in 60 Minutes, Reading a Battle Map, Numbers of War map onto the later lessons) + 2 printables + Google Classroom share links (`https://classroom.google.com/share?url=..&title=..&itemtype=material`, no script) + `/teach/it-admin` from a HAR of a full session + `/teach/student-privacy` (facts only; counsel before "student statements", D-LEGAL) + a standards table verified against current text (RH.6-8.7 fits maps, RH.9-10.7 the numbers lesson). v2 by 2027-06-01: L3, L5, L6, more printables. Static page + tagged PDF each; `LearningResource` JSON-LD; licence "free for classroom use, credit required" until D-LICENSE is decided; `?mode=classroom` is UX-chapter work; `/education` folds into `/learn` (301 in S4).
**Acceptance:** lessons and PDFs pass accessibility checks; the Classroom link prefills the title; >= 3 teacher-list mentions and >= 10 Classroom-share clicks within 90 days of v1. **Moves:** referring domains; TA-08.

### WP-SEO-25 - Embeds, oEmbed, cite, print, share
**Covers:** seo-growth-32; pages-C-87/88/89; docs-copy-23; ux-flows-06 (embed); infra-netlify-02. **Audit:** X4.
**Fix:** builder page with a snippet whose visible text link sits outside the iframe (UTM); `/embed/*` frameable only (headers in WP-05; this extends the register's embed class from `/embed` to `/embed/*`, so WP-INFRA-10/14 rules and WP-QA-03 HP tests must list both, and D-LICENSE's "only `/embed` frameable" sentence is read as "only the embed class"; section 9 item 8); embed body <= 10 KB, own SVG card, no third party; correct query param (`vignette`, not `story` [S docs-copy-23]); CTA `/map?tick=`; `/oembed?url=` (`type:rich`) + `<link rel="alternate" type="application/json+oembed">`; Web Share on mobile; cite box (APA/MLA/Chicago), print stylesheet; Terms wording matches (D-LICENSE).
**Acceptance:** the snippet renders on a cross-origin page; `curl -I /embed/x` has no `X-Frame-Options`; oEmbed validates. **Moves:** TA-02.

### WP-SEO-26 - Open dataset + DOI (T3, gated)
**Covers:** seo-growth-26; MISSED-5. **Decisions:** D-LICENSE, D-LEGAL step 3.
**Fix:** only after the provenance audit and counsel: facts dataset WITHOUT positions first (CC BY 4.0, Zenodo DOI; it also excludes Busey and Martin-derived per-regiment numbers and the Historian corpus until counsel clears them, chapter 13 s.9 item 2 and WP-DATA-05); landing **`/dataset`**, files `/dataset/v1.0.0/*` (not `/data`: that prefix is app data and stays `noindex`/training-blocked); `CITATION.cff`; Terms updated (drop the scraping sentence, keep the ban on hammering endpoints); `Dataset` JSON-LD without position fields.
**Acceptance:** Rich Results Test recognises `Dataset`; DOI resolves; Terms, robots and licence agree. Realistic: after DG-3 (2027-01-31), likely Q3 2027. **Moves:** TA-12 (Terms/robots/licence agreement), TA-06 (`Dataset` markup), referring-domain and citation outcomes (1.2).

### WP-SEO-27 - Search intelligence
**Covers:** seo-growth-27 (h, i), -28, -29. **Audit:** T1, E2.
**Fix:** `docs/keyword-map.csv` >= 60 rows (Appendix C is the hypothesis; volumes unmeasured), owner-approved by D14, re-scored at D30 with GSC/Bing data: priority = intent fit x winnability x readiness (0-3 each; winnability 0 when Wikipedia/ABT/NPS own the SERP). Positioning (<= 30 words) for hero, About, press: "The free, no-login, linkable map of Gettysburg for classrooms and family historians: every regiment and battery, moment by moment, with the sources on the page." ("Five-minute steps" is dropped for the same reason as the home title: after D-TIME a step is 0.83-42.3 minutes.) Never claim "minute-by-minute" or "most accurate". Monthly: manual SERP log for 30 queries; AI-assistant prompt check (10 questions x 4 assistants: cited? accurate? fix ambiguous copy). Competitors: Appendix D.
**Acceptance:** CSV approved and re-scored on those dates; SERP and prompt logs exist by D30. **Moves:** AI referrals; priorities.

### WP-SEO-28 - Outreach programme
**Covers:** seo-growth-30; MISSED-8. **Audit:** T1.
**Fix:** rules: no paid links, no exchanges at scale, no automation, disclose that you built the site, one personal email + one follow-up, never dictate anchor text, log every send, send from a role address (D-CONTACT). Sequence (re-dated to the trains): wave 0 (Oct-Jan) no asks, read each target's rules; wave 1 (2027-03, after `/learn` v1 and the first moments): teachers, libraries, round tables; wave 2 (2027-04, state pages): genealogy; wave 3 (2027-05..06): communities and press (press kit live 06-01); dataset outreach only after WP-26. Targets and templates: Appendix E.
**Acceptance:** tracking sheet (target, date, ask, response, live URL, `rel`); 60 personalised emails by 2027-06-01, >= 15 positive replies, >= 20 new referring domains (>= 8 .edu/.gov/.org) by 2027-06-27. **Risk:** read as spam; pausable in maintenance mode (D-CONTINUITY). **Moves:** the outcome floors of 1.2 (referring domains, search and AI referrals); no technical TA gate.

### WP-SEO-29 - Editorial calendar, style guide, lints
**Covers:** seo-growth-34; docs-copy-26 (link). **Audit:** H7, H10, T1.
**Fix:** `docs/editorial-calendar.md` to 2027-11 (Appendix F); PR template: sources present, gate and lints clean, alt text, one reviewer per Tier-A page; one-page style guide (museum-grade plain prose; numbers only from `unit_counts`/data; clock times only after D-TIME; hedges "about", "accounts differ"; no "tick N" or ids in prose); every user-visible change adds a changelog line.
**Acceptance:** calendar committed; lints in CI; 0 hits across generated pages.

### WP-SEO-30 - SEO CI suite, monitors, runbook
**Covers:** seo-growth-37 (UNVERIFIABLE design: validate on first run); qa-ci `seo-probe`. **Audit:** T1, T3, E5.
**Fix:** CI job `seo`: canonical self-consistency; matrix (App. B); og decode; JSON-LD; sitemap parity (indexable pages in, noindex/redirected/404 URLs out); link check; title/description/h1 rules; gate report; lints; robots matrix; five-UA parity; LHCI per template; no `Disallow` on CSS/JS. Post-deploy: IndexNow for changed URLs, smoke `curl`, uptime monitor on `/`, `/map`, `/sitemap.xml`, `/robots.txt`. `docs/seo-runbook.md`: weekly (GSC Performance, Pages reasons, Sitemaps, Crawl stats, Bing, Netlify pages/sources/404s, AI referrers) and monthly (KPI sheet, SERP log, prompt check, backlinks, refresh list); alerts on GSC email, deploy failure, uptime, sitemap fetch error, 404 rate > 2x baseline. Reading GSC: "Crawled - not indexed" = quality (pause rule); "Discovered - not indexed" = crawl scheduling; "Soft 404" = empty when rendered.
**Acceptance:** `seo` job fails on any violation; runbook exists; first weekly review logged in week 1. **Moves:** TA-02..11.

### WP-SEO-31 - Video channel (T3, post-cutover)
**Covers:** seo-growth-33. **Decisions:** D-MEDIA, D-SCOPE-TIERS (Cinematic Export retired unless rebuilt).
**Fix:** only videos rendered on an own basemap (no Mapbox imagery; Mapbox guidance does not address video [S]): 10 shorts (45-90 s) + 3 day overviews, captions, chapters, canonical link in every description; facade embed on moment pages (`youtube-nocookie`, disclosed in privacy, `frame-src`, off in Classroom mode); `VideoObject`. Not before the owned renderer exists (D-UNIT-RENDER) and the D-MEDIA rebuild is funded.
**Acceptance:** 10 videos with captions; valid `VideoObject`; `docs/media-rights.csv` row per video and per frame source. **Moves:** none gated (Tier 3); YouTube and AI-assistant referrals only.

## 5. In-domain sequencing

**Calendar rule for 5.1-5.3 (review 3).** Every date in this section is the register's floor or latest date, computed with a solo owner at about 1.9 working days a week for the SEO lane alone. Chapter 15 section 5.1 (capacity calendar) supersedes them for delivery: at 15 h/week R0 ships 2026-12-15, S1 Aug 2027, S2 Nov 2027, S3 May 2028; at 30 h/week S1 Mar 2027, S2 Apr 2027, S3 Jul 2027. What never moves: the 28-day GSC baseline before S1, >= 4 weeks between S-trains, freezes, and "nothing before R0". If chapter 15's Plan S (survival only, at most 12 h/week) is chosen, S1-S4 are shelved and only WP-01 (inside RM-01) stays in scope; WP-02, 03 and the R1a items of WP-04/07 (RM-15/16/49) join with Plan L, and S1 (RM-23/24) only if hours rise.

### 5.1 Release trains (D-ORDER 4.2; one identity change per train, >= 4 weeks apart)

Identity-level = URL forms/hosts/redirect map, canonical, site-wide name/titles/descriptions, the `/` split, mass URL additions, retirements, cutover. Performance, security, a11y and data releases are not, but stay 48 h clear of an S-train. Every train: matrix green, baseline export, versioned redirect map, release-log row, T+1/7/14/28 reviews.

| Train | Target (latest) | SEO content | Preconditions |
|---|---|---|---|
| R0 | by 2026-10-21 (chapter 15: 11-10 at 30 h/week) | no SEO bytes: R0 is the atomic mechanism release (D-ORDER) | S0 archive; plan/credits known |
| R1 | by 10-30 (11-05) | R1a: WP-04 card, WP-07 (`id`, orientation, icons, screenshots removed) and the GSC file (all in chapter 02 WP-T0-14) plus the IndexNow key file (one extra file this chapter adds to WP-T0-14's list); the re-cut `any` and `maskable` icon files of WP-07 are not in WP-T0-14, so they ship with it only if the art exists, else in S2; R1b: single visible h1 (WP-T0-10); R1c: WP-03 netlify.app host 301 and dev-page twins (WP-T0-15) | R0 acceptance green |
| S1 | 11-03..05 (11-10) | WP-04, 05, 06, back links | GSC verified >= 28 d (10-30), baseline archived, WP-DEC-05, rollback drill done |
| S2 | 12-01..08 (12-15) | WP-08, 09 (home), 12, 07 (name), 11 | S1 stable 4 w; D-NAME approved |
| S3 | 2027-01-12..19 (01-26) | WP-10, 07 (`start_url`) | S2 + 4 w; WP-DEC-01 spike; WP-13 events live |
| S4.0-4.3 | 02-16 (>= S3 + 4 w) .. 04-17 | 4.0 moments, turning points, Labs 301s; 4.1 ancestors, `/learn` v1; 4.2 corps/brigades, embeds; 4.3 places, commanders, Q&A | gate green; D-TIME for eyebrows/clocks; <= 100 URLs/week; batches >= 2 w apart |
| C | 2027-05-15 | none (`/map` is noindex); legacy at `/classic/` noindex | no S-train within 4 w |

Freezes: 2026-11-15..20, 2027-06-25..07-05, 2027-11-15..20; Fridays after 12:00 ET; rollback exempt. Critical path: WP-01 -> 28 d -> S1 (05, 06, 04) -> 4 w -> S2 (08, 09, 12) -> 4 w -> S3 (10, needs 13) -> 4 w -> S4 (14, 15, then 17 -> 19 -> 20/23). Parallel: 02, 27-30. External waits: WP-DEC-05/09, D-TIME, D-HIST-REVIEW, Historian P2/P3, provenance audit, counsel.

### 5.2 90-day plan (2026-09-28 .. 12-29)

Lane A (must, 10-19 d): WP-01..08 and the first parts of 09, 12, 27, 30. Lane B (should, 6-11 d): landing copy + poster (10), events (13), gate and mini-map prototypes (14, 15), computed prose (16). About 25 d of owner capacity exist in 13 weeks at 1.9 d/week and every chapter competes for it: if short, Lane A only.

| Weeks (Mon) | Actions |
|---|---|
| W0-W1 (09-28, 10-05) | WP-01 verify + baselines; register action 12b; approve D-NAME (DG-0 10-07); WP-02 ledger + E1 probe; feed WP-DEC-05; keyword map v0 |
| W2-W3 (10-12, 10-19) | R0 (no SEO bytes); WP-04 card prepared (WP-DEC-09, no deploy); WP-05 generator + matrix dry-run on a Deploy Preview (chapter 09 WP-INFRA-10/12); rollback drill |
| W4 (10-26) | R1a/R1c (WP-04 card, WP-07, GSC file, IndexNow key, WP-03 rows; chapter 02 WP-T0-14/15); GSC 28 days complete 10-30; D30 re-score of the keyword map |
| W5 (11-02) | **S1 11-03..05** (WP-04 tags, 05, 06); sitemap + IndexNow; T+1, T+7 exports (register dates; chapter 15 shifts the whole table with R0) |
| W6-W8 (11-09..11-23) | S1 monitoring; S2 titles table and trust drafts (WP-08, 12); freeze 11-15..20: gate and mini-map prototypes; T+28 report 12-03 |
| W9 (11-30) | **S2 12-01..08** (WP-08, 09 home, 12, 07 name, 11) |
| W10-W12 (12-07..12-21) | S2 monitoring; landing copy + poster; computed prose; events live; D90 review; S3 pre-flight; calendar committed |

The 2026-11-19 Address-anniversary content is dropped: the freeze leaves no window; aim for 2027-11-05.

### 5.3 12-month roadmap (to 2027-09-30)

- **Q4 2026:** TA-01..06, 15, 17, 18 met; S1, S2 stable; keyword map approved; KPI ledger running.
- **Q1 2027:** S3 (01-12..19); D-TIME gate 01-31; S4.0 02-16, S4.1 03-02, S4.2 03-16 (gate, mini-maps, moments, turning points, ancestors, `/learn` v1); outreach wave 1; keep/revert readout 04-19.
- **Q2 2027:** S4.3 (last batch 04-17); cutover 05-15; brigades, Q&A; `/learn` v2, press kit, embeds live by 06-01; outreach waves 2-3; domain renewal check 06-13; freeze 06-25..07-05.
- **Q3 2027:** anniversary-window readout 07-26; dataset if cleared; Tier-B pilot only after Historian P3; video post-cutover; D365 review 09-30 against Sep 2026.

## 6. Expectations, seasonality and measurement power

- No keyword-volume data exists: every number in 1.2 is a planning band, re-based at D30 from GSC/Bing data.
- The baseline (Aug 30-Sep 29) is off-peak. Peaks: July 1-3 (Thu-Sat in 2027), Nov 19 (Remembrance Day weekend [U]), school terms. Compare like with like (Sep 2027 vs Sep 2026).
- About 2 Google visits/day: changes show first in impressions, average position, indexed counts and canonical selection, not clicks (WP-02).
- Young domain: Google runs no formal sandbox, but trust builds over months [U]. Expect Bing/IndexNow indexing in days, Google in weeks, and no page-one ranking for competitive head terms ("gettysburg animated map", timelines: ABT, NPS, Wikipedia, Stone Sentinels) within 12 months. Winnable: brand and "interactive" queries, state/regiment/ancestor long tail, classroom, moment-level questions.
- Earliest by 2027-04-17 (a floor, not a promise; feasible only at chapter 15's 30 h/week Plan L and only after R0 has shipped in 2026): technical A+, instrumentation, a landing page, about 140-200 indexable URLs. Not promised at any capacity: any ranking or traffic figure. Refused: paid links, bulk LLM pages, machine translation, geo-blocking, Wikipedia self-links.

## 7. Verification debt (verify first)

1. Old GSC/Bing property? DNS token vs URL-prefix properties? GSC history for June-September 2026? Bing method.
2. WP-DEC-05: `pretty_urls=false` on the real deploy path; forced `/x.html -> /x` loop-free; query strings kept; primary domain redirects the netlify.app host; query-matched `_redirects` rows.
3. Netlify Analytics counts bots (E1 probe); path/country filtering.
4. Vendor token spellings (Google-Extended, Applebot-Extended, meta-externalagent, Bytespider, CCBot, PerplexityBot, Claude-SearchBot); any consumer of `llms.txt`; Google's sitemap ping retirement.
5. Rich-result gallery at build time; `WebPage.reviewedBy` acceptance.
6. Outreach targets marked [U]; CivilWarTalk (403 to fetchers; read by hand, incl. the thread titled like the old brand); state archive URLs; standards codes; Remembrance Day dates.
7. Mapbox free-tier numbers (50k loads, USD 5/1k); Census TIGER terms; Historian `kb/export/unit_pages` schema (hf-28) and P2/P3 dates.
8. 20th Maine strength (386 in data vs 358 elsewhere [S]) before printing figures; whether `landing.html` was ever indexed; ChatGPT search's reliance on Bing [U].

## 8. Owner decisions (defaults in bold; register ADRs not repeated)

- **OD-SEO-1** Named authorship, bio and reviewer credit (register action 8): **real name, factual bio, reviewers only with consent**.
- **OD-SEO-2** Keep S1 and S2 separate (**yes**) or combine (register option; unattributable movement).
- **OD-SEO-3** (settled by chapters 02 and 15) interim OG image in **R1a**, OG/twitter tag parity in **S1**.
- **OD-SEO-4** Landing hero: **static SVG poster**; a live-map preview only if the 45% rule fails.
- **OD-SEO-5** Approve the WP-13 event list; only client-fired events count.
- **OD-SEO-6** Crawler policy per D-LICENSE plus `Disallow: /hx/f/` for all bots (**yes**).
- **OD-SEO-7** Confirm the non-affiliation sentence is true; any registered mark (register action 10c-d).
- **OD-SEO-8** Tier mapping of section 3 (**as tabled**); T2 starts only when Lane A is done.
- **OD-SEO-9** Kit at `/teach` (students at `/learn`, chapter 11 CD-7): **3 lessons in v1, 6 by 2027-06-01**; two or three pilot teachers (D-SCHOOLS).
- **OD-SEO-10** Outreach: about 60 personal emails and round-table talks (**yes, from 2027-03**); video channel **deferred to post-cutover**.
- **OD-SEO-11** Steady-state SEO ops <= 3 h/month inside the D-CONTINUITY ceiling; outreach and content excluded and pausable.

## 9. Decision conflicts

1. **`/map` noindex vs Lighthouse SEO 95+.** D-ROOT makes `/map` `noindex,follow`; D-EVIDENCE publishes `/map` among the Lighthouse-scored URLs. `is-crawlable` weighs 4.04 of 12.04 [V], so a noindex page scores at most 66 in SEO (same for `/search`, `/embed`, 404); a robots block would likely fail the same audit [U]. Options: (a) **score SEO on indexable URLs only, record the intentional failure on noindex pages, keep the other three categories >= 95** (recommended; the qa-ci scorecard computes SEO on indexable pages); (b) amend D-ROOT so `/map` is indexable with a self-canonical and real static copy (risk: competes with `/`, thin-page scoring). Default (a).
2. **Superseded specialist items:** seo-growth-35 vendors by D-TELEMETRY; seo-growth-33 (video from Cinematic Export) by D-SCOPE-TIERS/D-MEDIA; seo-growth-08 (`id:"/map"`) and -02 (screenshot card) by the register.
3. **seo-growth roadmap** (redirects in W0, content from W3, 400 URLs by D90, outreach from W4) conflicts with D-ORDER/4.2: re-dated in 5.1-5.3 and 1.2.
4. **Home title and "five-minute" wording (deviation from D-NAME's home title text):** WP-SEO-08 and WP-SEO-27 follow chapter 11 DC-1 and chapter 15 s.13 item 7 ("Gettysburg Interactive Map: The Battle, July 1-3, 1863"; no "five-minute steps") because the clock is piecewise (0.83-42.3 min per moment) and S2 ships before D-TIME sign-off; the owner may restore the register text at DG-0.
5. **Bing verification method:** register action 2 says DNS TXT for both consoles; Bing's own DNS method is a CNAME and it also imports from GSC [U]. Default: verify GSC by TXT, then import into Bing; record the CNAME in `ops/inventory.yaml` if used.
6. **Manifest `name`:** D-NAME says manifest `name`/`short_name` "Gettysburg Map"; read here as `short_name` "Gettysburg Map" and `name` "Gettysburg Interactive Map", so SL-27 brand equality holds across title/og/manifest/JSON-LD. Chapter 11 WP-CONTENT-07 adopts the same reading.
7. **`/learn` vs `/teach`:** resolved as chapter 11 DC-4 (`/teach` teachers, `/learn` students); WP-SEO-24 renamed. **`/method`, `/cite`, `/site-map`:** `/method` and `/sources` are one authoring package (WP-CONTENT-14); `/cite` is a section of `/sources`; the HTML sitemap is `/site-map` (WP-CONTENT-17).
8. **Embed class:** WP-SEO-25's `/embed/*` extends the register's "only `/embed` frameable"; the generator and HP tests must cover both (chapter 09 WP-INFRA-14 and chapter 12 WP-QA-03 need the same one-line extension).
9. **Additions not in the register (OG image timing: R1a image, S1 tags, see WP-SEO-04):** dataset landing `/dataset` (not `/data`); `X-Robots-Tag: noindex` on `/data`, `/hx`, `/api` and `Disallow: /hx/f/` for all bots plus `/hx/` for training crawlers (hist-final-plan; Appendix A aligned with chapter 14 WP-HIST-03 in review 3); Tier-B units only after Historian P3; rights gate on position art; `/landing.html` stays a 301 to `/` per D-URL (a 410 is more precise but harmless either way).
10. **Effort envelope:** the register's Tier-1 line for SEO is 15-25 d; this chapter's Tier-1 WPs sum to 18.0-32.6 d and all 31 WPs to 70.0-126.1 d (section 3). Chapter 15 governs the schedule figure (SEO 26 d P50 on the L path, 48 d on the full path); Tier-2 growth WPs are unscheduled until D-SCOPE-TIERS is answered and Lane A is done (OD-SEO-8).

## 10. Cross-domain dependencies and top risks

**Dependencies:** *infra/Netlify* redirect/header generator (both spellings), `pretty_urls`, primary domain, `/api/ingest`, IndexNow deploy hook, preview noindex, contact DNS. *Boot/perf/app* `/map` static shell (h1, poster, intent buttons), R0 SW (no navigation intercept, `/map` only), D-URLSTATE parser + `moments.json` v0. *Site generator* Astro or fallback, pre-rendered nav/footer, shared head partial, `pages.manifest.json`, `unit_counts`, turning-points prerender. *Historian* `sources.yaml` tiers, entity cards, OR passages, static unit pages (hf-28), reviewed answers (hf-32 = WP-23), `/hx/` policy. *Time/data* D-TIME sign-off, VI Corps records, terrain elevations, monument sourcing, dev-note removal. *Docs/legal* name table, trust-page authoring, privacy/Terms, provenance audit, counsel, role addresses. *QA* SEO gates in the scorecard.

**Top risks:** overlapping identity changes without a baseline (trains, 28 d); scaled-content classification (gate, tiers, pause rule); capacity (Lane A first); rights/provenance exposure of positions, monuments and data notes (rights gate, audit); redirect/canonical error (both spellings, matrix, rollback); landing lowers map launches (keep/revert); unsigned clock strings (lint); measurement/privacy mismatch (same-release disclosure); new-domain expectations and low power (structural signals, banded targets); upstream slips (Astro, Historian P2/P3) starving S4 (stoppable batches); crawler-driven Mapbox cost (no maps on content); blocking answer bots such as OAI-SearchBot by mistake (robots matrix).

## 11. Coverage

Every WP header lists the specialist ids it covers: all 38 seo-growth findings and MISSED-1..8 appear; none was dropped or REFUTED. Non-obvious mappings: seo-growth-07 -> WP-01 (execution is register action 6); -27 -> WP-06, 27; -36 -> WP-02, 13; -34 -> WP-29, 15; -18/-19/-21 -> WP-21; infra-netlify-09 (security.txt) -> D-CONTACT; docs-copy-17..24 -> WP-12, 24, 25 (authoring in the docs chapter).

## Appendix A - robots.txt and llms.txt (D-LICENSE; verify token spellings first)

```
User-agent: *
Allow: /
Disallow: /hx/f/
Disallow: /api/

# training crawlers: a specific group replaces `*`, so repeat the shared rules
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bytespider
User-agent: meta-externalagent
Disallow: /data/
Disallow: /hx/
Disallow: /api/

Sitemap: https://gettysburginteractivemap.com/sitemap.xml
```
Training crawlers are barred from all of `/hx/` (chapter 14 WP-HIST-03 and H.2 item 3; `/hx/f/` is barred for every bot, `/hx/app/` stays crawlable for search bots); all `/hx/*` and `/data/*` responses also carry `X-Robots-Tag: noindex` (WP-06 step 3). Search/answer bots (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, DuckDuckBot, Applebot) and user fetchers (ChatGPT-User, Claude-User, Perplexity-User) fall under `*` and may fetch `/data/` (tool pages render from it). `llms.txt`: a two-sentence honest summary (counts from `unit_counts`) plus links to the hubs.

## Appendix B - Redirect and canonical matrix (both spellings; CI and after each deploy)

```bash
H=https://gettysburginteractivemap.com
chk(){ curl -s -o /dev/null -L --max-redirs 3 -w "%{http_code} hops=%{num_redirects} %{url_effective} <= $1\n" "$1"; }
for p in / /index.html /landing.html /dashboard /dashboard.html /historian /historian.html /embed /embed.html \
         /diagnostics /diagnostics.html "/?tick=300" "/regiment.html?unit=U-20ME"; do chk "$H$p"; done
# expect 200, hops<=1; /diagnostics* 404
curl -sI https://friendly-lolly-da85c0.netlify.app/historian | sed -n '1p;/^location/Ip'   # 301
for p in / /dashboard; do curl -s "$H$p" | grep -o '<link rel="canonical"[^>]*>'; done       # = final URL
curl -sI "$H/embed" | grep -i -E 'x-frame-options|frame-ancestors'   # frame-ancestors *, no XFO
curl -sI "$H/"      | grep -i -E 'x-frame-options|frame-ancestors'   # 'self' only
for ua in "Googlebot/2.1" "bingbot/2.0" "GPTBot/1.1" "Mozilla/5.0 (iPhone)" "Mozilla/5.0 (X11; Linux x86_64)"; do
  curl -s -A "$ua" "$H/" | sha256sum; done | sort -u | wc -l                                  # expect 1
```

## Appendix C - Keyword hypotheses (volumes unmeasured; directional SERP checks by seo-growth)

| Cluster | Target | Incumbents | Winnability / priority |
|---|---|---|---|
| gettysburg interactive map (brand) | `/` | Smithsonian 2013, LoC, ABT maps, paid app | medium / P1 |
| find my ancestor gettysburg regiment; {state} regiments at gettysburg | guide; `/ancestors/{state}` | NPS, Family Tree Magazine, FamilySearch, ABT, Wikipedia | medium(-high) / P1 |
| gettysburg regiment strength and casualties | `/units`, `/dataset` | CivilWarTalk, book listings; no free database | high, rights check / P1 |
| gettysburg battle map for students; lesson plan; worksheet | `/learn` | LessonPlanet, ABT, YMI, homeschool blogs | medium / P1-P2 |
| gettysburg animated map; order of battle; battle map by hour; {N}th {state} at gettysburg | `/` (secondary); `/units`; `/battle/*` after D-TIME; Tier-B units | ABT, YouTube, Wikipedia, Stone Sentinels | low to medium / P2-P3 |

Full 26-row list: `plan-work/seo-growth.md` section 5.

## Appendix D - Competitors (checked by seo-growth; corrections applied)

ABT animated map: owns "animated map" queries; 1,928 educators added it to Classroom [S]; static time-slice maps; copy the educator kit, avoid the video race (its 16:51 length is unverified). Savas Beatie "Gettysburg Animated Battle Map APP": paid (USD 49.95 lifetime), 430,000+ positioned units [S]; the reason for D-NAME; never claim granularity parity (1,804 keyframes on 188 of 675 moments; 217 of 465 regiments have their own positions [V]). NPS Gettysburg NMP: genealogy/teacher authority, no individual service records [S]; link to it. Stone Sentinels: per-regiment pages, July 2 about 9.4k words/22 entries [S]; model for unit anatomy, never copy text. Smithsonian 2013 (Knowles/Esri): ranks for "interactive"; a working High Ground page is an opening.

## Appendix E - Outreach targets (existence checked by seo-growth unless [U]; none contacted)

| Segment | Targets | Ask / wave |
|---|---|---|
| Teacher lists | Lesson Planet Gettysburg listings; YMI Classroom Gettysburg page; TheHomeSchoolMom Battle of Gettysburg; Dickinson House Divided; ABT educator pages; NPS "Gettysburg for Teachers" (staff, not an endorsement); Marine Corps University "Maps - Battle Studies: Gettysburg" LibGuide and university guides. Removed: teachthecivilwar.com (a vendor's paid offering) | list `/learn` / 1-2 |
| Round tables | Civil War Seminars directory; Emerging Civil War "At the Lectern"; CWRT Congress [U]; Seminary Ridge Museum events (promotes the paid app's creator: neutral tone); Gettysburg College Civil War Institute, Gettysburg Foundation, Adams County Historical Society [U] | free 20-minute virtual talk / 1-2 |
| Genealogy | FamilySearch Wiki "Civil War Battles, Gettysburg" (editable; disclose; only if neutral); Family Tree Magazine "7 Steps to Trace Gettysburg Ancestors"; ABT Ancestor Research Guide; NPS ancestor page; state societies and USGenWeb for the 19 states [U] | add state page as "find the regiment" / 2 |
| Communities | CivilWarTalk; r/CivilWar, r/Genealogy, r/dataisbeautiful, r/MapPorn; Show HN only for the dataset or an anniversary launch | participate first; post a finding, not a plug / 3 |
| Local/press | Gettysburg Times; Destination Gettysburg / Adams County visitor pages, PennLive, Evening Sun, B&B and museum pages [U] | pre-visit study tool / 3, June 2027 |

Personalised first line, disclose that you built the site, one follow-up, log every send. Permission emails to NPS CWSS, GNMP and ACHS belong to the Historian workstream.

## Appendix F - Editorial calendar (weekdays computed [V]; [U] = confirm)

2026-11-19 Address anniversary (Thu), Remembrance Day likely Sat 11-21 [U], inside the freeze: no release; 2027-05-31 Memorial Day; anniversary content live by 2027-06-01 (ready 05-15); 2027-06-13 domain renewal check; 2027-06-26..07-25 measurement window; 2027-07-01..03 anniversary (Thu-Sat); 2027-11-20 Remembrance Day [U].

## Appendix G - Thin-content gate thresholds (`scripts/seo/gate.mjs`)

| Template | Unique words | Distinct facts | Extra |
|---|---|---|---|
| moment / Q&A | 400 / 250 | 8 / 4 | sources >= 1; answer-first block; own lead |
| turning point | 400 | 6 | >= 2 cited sources |
| part-of-day | 500 | 10 | times from `TimeModel` only |
| place | 250 | 6 | verified elevation; >= 1 nearby monument or unit |
| corps / division | 200 | 6 | children listed |
| brigade | 250 | 8 | own keyframes or an honest "no keyframes" line |
| regiment / battery (Tier B) | 250 | 8 | >= 1 approved primary-source excerpt |
| commander | 200 | 6 | every claim sourced |
| state | 400 | 10 | archive links checked |
| monument group | 300 excl. table | table + provenance line | 100% rows sourced |
| lesson / guide | 600 / 1,500 | - | answer key / outbound authority links |

Common: unique words exclude nav, footer, template headings and any 5-gram on >= 50 siblings; boilerplate ratio <= 0.35; max 5-gram Jaccard to 25 siblings < 0.5; unique title/description; one h1; valid JSON-LD; zero lint hits.
