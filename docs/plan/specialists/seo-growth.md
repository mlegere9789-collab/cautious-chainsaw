# SEO, Discovery and Growth Plan (specialist: seo-growth)

Site: https://gettysburginteractivemap.com (Netlify project friendly-lolly-da85c0). Plan only: nothing was built, deployed or written into the site folders. Scratch files: `plan-work/tmp-seo-growth/` (bash-visible) and `C:/Users/mlege/AppData/Local/Temp/claude/site/seo_tmp/` (short path, because Windows Python cannot open the long plan-work path).

Evidence conventions: `deploy:FILE:LINE` = `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy/FILE`, line number; `bundle.pretty.js:LINE` = plan-work copy; `[V]` = verified this session by command/fetch; `[C]` = read from code; `[U]` = unverified inference, with the test that would settle it. Effort: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d. Finding IDs: `seo-growth-NN`. Cross-references use other specialists' IDs (`prov-recon-35`, `pagesA-37`, `perf-cwv-05`, `app-time-02`, ...). All of those reports exist in `plan-work/` and were skimmed for overlaps; where I extend rather than duplicate, I say so.

---

## 0. Executive summary

1. **The traffic gap is mostly a young-domain and a thin-surface problem, not a Lighthouse problem.** RDAP says the domain was registered **2026-06-13** and expires **2027-06-13** [V]. It is 3.5 months old. Lighthouse SEO 100 only checks title/description/canonical/robots hygiene; it says nothing about rankable content, links or entity trust. Search referrals of 173/2,221 (7.8%; Google 63, Bing 59, DuckDuckGo 38, Yahoo 13; plus ChatGPT 14) are what a 3.5-month-old site with 21 sitemap URLs and almost no crawlable prose looks like.
2. **Bing-family engines send more than Google** (Bing 59 + DuckDuckGo 38 + Yahoo 13 = 110 vs Google 63 [V, Netlify Analytics PDF]). For most US sites Google sends several times more than Bing [U]. Either Google has barely indexed/ranked the site, or the audience skews to Edge/Copilot/school-managed browsers. ChatGPT search (which leans on Bing's index) already refers 14 visits. So Bing Webmaster Tools + IndexNow is as important as Search Console here.
3. **Search Console ownership is probably lost.** The Google verification file `google0dca4879c9657741.html` existed in deploy B and vanished in deploy C (deploy-history DH-12); today it 404s [V] and the domain has no TXT records at all [V, nslookup: SOA only]. Netlify DNS (NS1) makes DNS verification a 5-minute job. Without GSC there is no indexing data, no sitemap status, no query data. This is step zero.
4. **Every social share is broken.** `screenshots/day3.png` (used as og:image/twitter:image on 21 pages and as both PWA "screenshots") has an RGB header but RGBA-sized data; PIL refuses it [V]. I additionally decoded the pixels as RGBA: it is a near-black gradient with 80 distinct colours [V], i.e. it never contained a screenshot. `day1.png` is byte-identical to `day3.png` [V]. 10 of the 20 sub-pages have no `twitter:card` at all [V]. (Same defect found by pagesA-37, pagesB-09, prov-recon-42; I add the pixel decode and the tag census.)
5. **The site's best content is invisible to crawlers.** 24 vignettes (7,205 words) are shown one at a time behind Next buttons with no URLs (`deploy:documentary.html:88-91`); turning points, ancestor search, historian, regiment, education content are all `fetch()`-and-render. AI crawlers (GPTBot, ClaudeBot) do not execute JavaScript at all (Vercel/MERJ study, Dec 2024 [V via search summary]). Static (server-delivered) word counts for the 20 feature pages: 27 (search) to 330 (aftermath), median about 100 [V].
6. **The #seo-content pattern is not cloaking by Google's definition, but it is fragile and probably ineffective** (section 3, seo-growth-09): same HTML goes to every user agent, text is truthful; but users never see it (covered by the fixed splash, then deleted by script `deploy:index.html:425` and by `createRoot` clearing `#root`), it is the exact "text only crawlers see" shape the hidden-text policy warns about, and after JS runs Google indexes an app shell with no h1 and no copy. Recommendation: landing-first architecture (static `/` with real content, app at `/map`), with an interim single-visible-hero step that is already in perf-cwv-05.
7. **Programmatic pages from today's data would be thin.** I measured: regiment records carry a median of **17 words** of usable text (47 of 466 have >= 30; 1 has >= 100); brigade pages assembled from all their regiments have a median of **120 words** (0 of 101 reach 250) [V, prototype `tmp-seo-growth/tier_proto.py`]; 127 regiments share a duplicated `key_action` string ("Army reserve." x 20). Publishing 569 templated unit pages would trip Google's "scaled content abuse" definition. The plan therefore gates indexation on measured uniqueness and funds an enrichment corpus (Official Records Vol. 27 excerpts, state "X at Gettysburg" dedication volumes, monument inscriptions, computed comparisons) that the Historian-expansion workstream needs anyway.
8. **What can actually rank.** Head terms ("gettysburg animated map", "gettysburg battle timeline") are owned by American Battlefield Trust, Stone Sentinels (individual historian, 15,000-word day timelines), Wikipedia, NPS, YouTube and a paid app. Winnable: (a) "interactive" (not "animated") positioning, (b) genealogy intent ("Pennsylvania regiments at Gettysburg", "find my ancestor's regiment"), (c) time-slice + unit long tail that ABT only serves as static images, (d) teacher/classroom resources with real lesson plans, (e) order-of-battle/casualty data that exists nowhere free online (Busey and Martin is a book; the only web tools found were an RPubs map and a Shiny table).
9. **Analytics is blind by design** (privacy policy: RUM only; Netlify Web Analytics is server-log based, counts non-JS clients, has no user-agent breakdown). Plan: a cookieless first-party-proxied counter with a documented event list (no PII, no free-text queries), a policy update (Netlify Web Analytics is currently undisclosed on privacy.html), and a bot-segmentation protocol built on experiments, not guesses.
10. **90-day target (Oct 1 - Dec 29 2026):** GSC+Bing live in week 0; ~400 indexable URLs shipped in staged batches (about 100/week, each behind the gate); search-engine referrals 173 -> >= 500 per 30 days; AI referrals 14 -> >= 50; +20 referring domains; every share preview valid; Tier-A pages pass Rich Results/Schema checks. These are planning targets (no keyword-volume data was available to me), to be re-based at day 30 from real GSC impressions.

---

## 1. New ground truth established in this session

| # | Fact | Evidence |
|---|---|---|
| G1 | Domain registered 2026-06-13, expires 2027-06-13, status `client transfer prohibited` | `curl https://rdap.verisign.com/com/v1/domain/gettysburginteractivemap.com` [V] |
| G2 | DNS is Netlify DNS (NS1, `dns1.p09.nsone.net`...), no TXT records (no Google/Bing verification, no SPF) | `nslookup -type=TXT` returned only SOA [V] |
| G3 | GSC verification file absent (404); it existed in deploy B only | `curl -I /google0dca4879c9657741.html` = 404 [V]; `plan-work/deploy-history.md:114` |
| G4 | `friendly-lolly-da85c0.netlify.app` serves the full site with 200, no redirect, no `X-Robots-Tag`; deploy permalinks (`<id>--friendly-lolly-da85c0.netlify.app`) do send `X-Robots-Tag: noindex` | `curl -sI` of both [V]. Canonical tags (absolute, custom domain) are the only guard |
| G5 | `/landing.html` (an old pricing page with a "free 7-day trial", listed in the Aug 22 sitemap) now 404s with no redirect | `curl -I` = 404 [V]; deploy-history lines 114/118/267 |
| G6 | Duplicate URL forms all return 200: `/` and `/index.html`; `/dashboard` and `/dashboard.html`; `/historian` and `/historian.html`; `/search?q=x`; `/regiment.html?id=x`; `/dashboard/` 301 -> `/dashboard`; `http://www.` takes two hops (http://www -> https://www -> https://apex) | curl matrix [V] |
| G7 | Netlify Analytics lists `/index.html` (86 PV) separately from `/` (1,713), and `/historian` (68) separately from `/historian.html` (42) | `seo_tmp/wa_raw.txt` (pdftotext of the Web Analytics PDF) [V] |
| G8 | 10 sub-pages link "Back to the map" to `/index.html`: aftermath:41, camera:46, compare:53, dashboard:58, documentary:47, education:42, report:49, sandbox:52, search:50, viewshed:43; plus emitters `education.html:81`, `search.html`, `embed.html` that build `/index.html?tick=` | `grep -n 'href="/index.html'` [V] |
| G9 | `og:image`/`twitter:image` = `screenshots/day3.png` everywhere; file is corrupt (IHDR RGB 1280x720, IDAT inflates to 3,687,120 B = 720 x (1+1280x4), expected 2,765,520) and when read as RGBA is a near-black gradient (80 colours) | Python zlib + PIL [V], `seo_tmp/og_decoded.png` |
| G10 | 10 of 20 sub-pages lack `twitter:card`: ar, cinematic-export, find-ancestor, ground-remembers, historian, immersive, living-ledger, regiment, turning-points, watch-together; no page has `og:site_name`, `og:image:width/height/alt`; only `index.html` links icons/manifest; privacy/terms have no og tags | `grep -c` census [V] |
| G11 | Sitemap: 21 `<loc>`, 0 `<lastmod>`, only changefreq/priority (Google ignores both) | `deploy:sitemap.xml` [V] |
| G12 | 4 titles exceed 60 chars (aftermath 71, dashboard 67, find-ancestor 67, education 61) because the brand suffix is 37 characters; 11 descriptions < 110 chars | Python census [V] |
| G13 | JSON-LD exists only on `index.html` (`WebApplication` + nested `Event` without `location`, no `offers`); none of the 26 other pages has any | `deploy:index.html:27-38` [C] |
| G14 | Home HTML has 3 `<h1>`: `#seo-content` (line 718), `#boot-splash` (744), noscript (753). `#seo-content` is inside `#root` (717) and is removed by script at line 425 once >= 3 toolbar buttons are labelled | [C] |
| G15 | Home page in this session's search index is described with wording that mirrors the `#seo-content` paragraph (the "ask a data-grounded historian assistant" phrase); no sub-page of the domain surfaced for four distinctive title queries | WebSearch [V, weak evidence: not Google, US-only] |
| G16 | The unit count in copy is wrong or ambiguous: 467 OOB records include 1 alias stub; distinct = 466 regiments/cavalry regiments + 103 batteries = 569 units; copy says "467 regiments and batteries" (title description, JSON-LD, manifest) and "minute-by-minute" next to "five-minute snapshots" (`deploy:index.html:718-719`) | pagesB-53 [V]; my recount 467 records [V] |
| G17 | Positions are sparse: 152 placement unit ids, only 23 are regiment ids; 96 are brigade ids that parent 422 regiments; 33 are batteries/divisions | pagesB-44 [V], bundle-anatomy-24 (1,804 keyframes) |
| G18 | Text available per entity is small: regiments median 17 words (of 466); brigades median 120 words (0/101 >= 250); vignettes 206-375 words (avg 300, total 7,205); chronology events avg 30 words (137); locations avg 19 words (30); turning points avg 116 words (9); `key_action` >= 100 chars for only 40 of 467 | Python over `deploy:data/` [V] |
| G19 | Sources are cited only inside JSON metadata (29 distinct strings: OR Vol. 27 Parts I-II, Busey and Martin 1994, Pfanz trilogy, Desjardin, Wert, Gottfried, Hessler, Coddington, Sears ...), never shown to users. `monuments` (512 in bundle) carry `src` for only 9 | [V] |
| G20 | Data files contain three internal notes naming a third-party product: `terrain.json:38` ("Gettysburg Animated YouTube vignette subject"), `union_artillery.json:91`, `placements_day1_ticks1_50.json:80` | grep [V]. See open question Q3 |
| G21 | Privacy page says "Real User Monitoring (Netlify)" only and "no third-party analytics beyond the performance monitoring"; the site also uses Netlify Web Analytics (the PDF) which is undisclosed; Terms (`terms.html`) forbid scraping the data files for republication while inviting "embedding its widget" | `deploy:privacy.html`, `deploy:terms.html` [C] |
| G22 | Chronology time labels are compressed: Day 2 has 8 events at 8 am and 1 event/hour between 2 pm and 6 pm (the historical assault was 4-7 pm); publishing hour pages from these labels would mass-publish the C4 error | `seo_tmp` histogram of `chronology_day*.json` [V]; see app-time |
| G23 | Deep links from sub-pages into the map do nothing (only `?ancestor=` is read) | bundle.pretty.js:101019 [V]; app-time-06, pagesA-03, app-bugs-05 |
| G24 | Lighthouse (live): SEO 100 both form factors; mobile redirects audit 0 (9.07 s wasted); LCP 9.0 s mobile | `lh_mobile.json` [V] |

---

## 2. Diagnosis: why "SEO 100" and 8% search (T1), why 18% bot-like views (T2), why duplicate URLs (T3)

### 2.1 T1 hypotheses, ranked

| Rank | Hypothesis | Evidence for | Test that settles it | Addressed by |
|---|---|---|---|---|
| 1 | New domain, no authority, nearly no inbound links | G1; only 21 URLs; nothing in this session's searches links to it except a directory-like echo | GSC Links report + Bing "Inbound Links" after verification; `site:` counts in Bing | 28, 30, 31, 32 |
| 2 | Thin, JS-rendered, non-unique content: little to rank for | G13, G18, `documentary.html:88-91`; static words 27-330 | GSC URL Inspection > View crawled page > compare rendered HTML with `curl` HTML | 09, 13-23 |
| 3 | Search Console not verified, sitemap never re-submitted after Aug 22 | G2, G3 | Try to open Search Console; if the property is gone, re-verify | 01 |
| 4 | Brand collision with incumbents (ABT "Gettysburg Animated Map"; Savas Beatie/TVM "Gettysburg Animated Battle Map APP"; YouTube "Gettysburg - Fully Animated"; a 2019 "Gettysburg/Antietam: Animated Battle Map" film on Apple TV/Tubi) so the exact phrase in the site's title is the most contested phrase on the topic | WebSearch [V]: "animated" results are ABT, Savas Beatie, YouTube, Tubi, Apple TV | Compare GSC queries: impressions for "animated" vs "interactive" terms | 04, 29 |
| 5 | Mobile-first indexing sees a 2.28 MB bundle and 30+ JSON fetches; slow or partial render | G24, bundle-anatomy | URL Inspection live test: screenshot and "page resources not loaded" | 09, 12, perf-cwv-* |
| 6 | Titles/descriptions generic; brand suffix crowds out keywords | G12 | Manual: title lengths | 04, 05 |
| 7 | Duplicate URL forms dilute signals | G6, G7, G8 | GSC Pages report: "Duplicate, Google chose different canonical" | 03 |
| 8 | Poor CWV (RUM p75: LCP/INP/CLS/FCP Poor) | RUM PDF | CrUX exposure in PageSpeed Insights (may not exist: ~113 views/day) | perf-cwv, 09, 12 |

Realism note: Google does not officially operate a sandbox, but new domains empirically take months to earn trust, and the site's first deploy was Jun 13 (deploy-history). CWV field data at the page level probably does not exist for most URLs at this traffic (CrUX needs volume [U]); CWV matter more as user experience than as a ranking lever here.

### 2.2 T2: the 18% "bot-like" geographies

- Netlify Web Analytics is log-based (server-side); it counts requests from clients that never run JavaScript, so link previewers, uptime probes, SEO tools, AI fetchers, scrapers and prefetchers all count as pageviews [U for exact filtering; test in seo-growth-36].
- The ~1,900 scanner 404s are a separate table ("Top resources not found": `/wp-admin/install.php` 430, `/` 181, `/.git/config` 78, `/.env` 68, `/blog/` 60 ...). They do not inflate pageviews; they are noise for the 404 report only. All correctly 404 [V by audit].
- Foreign shares: Germany 210, China 170, Singapore 152, Hong Kong 96 = 628 of 3,389 PV (18.5%); these four are typical cloud-region egress points [U]. France 90 and UK 89 are plausibly human.
- Do not geo-block. 328 MB/month is trivial; blocking risks Bingbot/other crawlers from those regions and real users abroad. Segment, do not block (seo-growth-36).

### 2.3 T3: duplicate URL forms

See G6-G8 and seo-growth-03. Canonical tags (absolute, `.html` form) already tell Google which to keep, so this is an analytics-splitting and link-signal problem more than a penalty risk. The bigger risk is the **canonical form itself**: sitemap and canonicals currently say `.html`, real traffic reaches extensionless URLs (G7), and other specialists split (prov-recon-35 keeps `.html`; pagesA-37 and pagesB-09 recommend extensionless). My recommendation is extensionless (shorter, format-agnostic, matches observed traffic, matches how Netlify already serves the files) with explicit 301s; either choice is fine if applied consistently in one deploy.

---

## 3. Findings (fix specs)

### seo-growth-01 - Re-establish Search Console and Bing Webmaster ownership, submit sitemaps, add IndexNow (S, high)
- **Audit refs:** T1. **Depends:** none (do first). **Moves:** measurement, indexing speed, every KPI.
- **Evidence:** G2, G3; no `google-site-verification`/`msvalidate` meta in `deploy:index.html:1-30` [V grep]; deploy-history DH-12 ("re-verify (DNS), resubmit sitemap, remove /landing.html").
- **Root cause:** verification was an HTML file that was dropped by a later hand-assembled deploy; nothing durable (DNS/meta) replaced it.
- **Fix:**
  1. Netlify > Domains > DNS: add the TXT record Google gives for a **Domain property** (covers https/http/www/apex and the netlify.app host is separate, so also add a URL-prefix property for `https://friendly-lolly-da85c0.netlify.app/` only if you want to watch it disappear after seo-growth-03).
  2. Bing Webmaster Tools: sign in and use "Import from Google Search Console" (or add the Bing TXT/CNAME in DNS). Also enable Microsoft Clarity? **No**: Clarity is a third-party script and conflicts with the privacy stance; skip.
  3. Submit `https://gettysburginteractivemap.com/sitemap.xml` in both (after seo-growth-06 makes it an index). Use URL Inspection > Request indexing for `/`, `/moments`, `/units`, `/ancestors`, `/learn`, `/about` (the daily quota is small, commonly reported as about 10-12 per property [U]).
  4. IndexNow: generate a key, host `https://gettysburginteractivemap.com/<key>.txt`, and have the deploy step POST changed URLs (batch up to 10,000) to `https://api.indexnow.org/indexnow`. Bing, Yandex, Naver, Seznam participate; Google does not (documentation checked: batch format and key file [V], participation list not stated on that page [U]).
  5. Snapshot baselines on day 1: GSC Performance (last 3 months), Pages report, Links, Crawl stats; Bing Performance and Inbound links; Netlify Analytics screenshots. Store in `docs/seo-baseline-2026-10.md`.
  6. Put the GSC/Bing owners on a second Google account (bus factor: solo owner).
- **Acceptance:** both properties show "Ownership verified" via DNS; sitemap status "Success"; URL Inspection returns "URL is on Google" or a specific reason for the 6 seeded URLs within 14 days; IndexNow key file returns the key with 200 and the first POST returns 200/202.

### seo-growth-02 - Replace the corrupt OG/PWA image with valid distinct cards; complete the social tag set (S interim, high)
- **Audit refs:** T1. **Depends:** none for interim; final per-page images are seo-growth-11. **Overlaps:** pagesA-37 (1), pagesB-09, prov-recon-42. **Moves:** share previews on Facebook/LinkedIn/Slack/iMessage/WhatsApp/Discord/X, click-through from shared links, PWA install sheet.
- **Evidence:** G9, G10. `deploy:index.html:21,25`; `deploy:manifest.json` screenshots; `screenshots/day1.png` = `day3.png`.
- **Root cause:** the file was written by a tool that emitted an RGB IHDR with RGBA rows and was a generated gradient, not a capture; reused for two "days"; later pages copy-pasted the same head.
- **Fix (interim, hand-doable in an hour, no build):**
  1. Create `og/default.png` 1200x630, 8-bit RGB, <= 150 KB: dark `#0a0a14` field, gold `#c9a24b` rule, title "Gettysburg Interactive Map", tagline "The battle, five minutes at a time", a crop of a real map screenshot (take one screenshot of the map at Day 3 after the intro; that is a legitimate capture of the owner's own UI, but see seo-growth-11 for Mapbox attribution), and the wordmark. Validate with `python -c "from PIL import Image; Image.open('og/default.png').load()"`.
  2. Replace `screenshots/day1.png` and `day3.png` with two real 1280x720 captures (different days) for the manifest; add 750x1334 narrow captures with `form_factor` (seo-growth-08).
  3. Point every page's `og:image` and `twitter:image` at `/og/default.png`; add `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, `twitter:image:alt`, `og:site_name`, `og:locale=en_US`.
  4. Add the missing `twitter:card` + `twitter:title/description/image` block to the 10 pages listed in G10 and `og:*` to privacy/terms.
  5. Add `<link rel="icon" href="/icons/icon-192.png">`, `apple-touch-icon`, `<link rel="manifest">`, `theme-color` to every page (only home has them).
  6. Clear scraper caches after deploy: Facebook Sharing Debugger "Scrape Again", LinkedIn Post Inspector, the X card validator was retired [U], so paste the link into a draft post to preview, Slack `/unfurl` by re-pasting.
- **Acceptance:** PIL decodes every image referenced by any og:image/manifest entry; `curl -sI` returns `image/png` and size <= 200 KB; Facebook debugger shows a 1200x630 card with no warnings for `/`, `/documentary`, `/find-ancestor`; grep shows `twitter:card` on all 20 sub-pages; a CI check (seo-growth-37) fails if any og image fails to decode.

### seo-growth-03 - One canonical URL per page, one redirect hop, no duplicate hosts, internal links that match (S-M, high)
- **Audit refs:** T3, E5. **Depends:** none (decide canonical form first; if seo-growth-09 changes `/` semantics, keep these rules and add `/map`). **Overlaps:** pagesA-37 (4), pagesB-09, prov-recon-35/36 (divergence noted in 2.3). **Moves:** analytics accuracy, link consolidation, crawl efficiency.
- **Evidence:** G4-G8. `deploy:netlify.toml` comment on the diagnostics redirect proves `force = true` is needed because Netlify serves an existing file before evaluating redirects (`netlify.toml` "Internal tools" block).
- **Root cause:** Netlify serves `/x` and `/x.html` for the same file; nothing redirects; internal links use `/index.html` and `.html`.
- **Fix (decision: extensionless, no trailing slash, apex, https):**
  ```toml
  # netlify.toml (or generated _redirects; every row needs force because a file exists at the source path)
  [[redirects]]  # duplicate host
    from = "https://friendly-lolly-da85c0.netlify.app/*"
    to = "https://gettysburginteractivemap.com/:splat"
    status = 301
    force = true
  [[redirects]]
    from = "/index.html"
    to = "/"
    status = 301
    force = true
  [[redirects]]
    from = "/landing.html"      # old pricing page, deleted Aug 23 with no redirect
    to = "/"
    status = 301
    force = true
  # one row per legacy page (generate from the page manifest, do not hand-write a wildcard):
  #   /dashboard.html /dashboard 301!   /historian.html /historian 301!  ... (20 pages + privacy + terms)
  ```
  A wildcard `from="/*.html" to="/:splat"` (pagesA-37) works only if Netlify's Pretty URLs setting is off or consistent and needs a loop test; the repo already uses patterns like `/*.sql` (`netlify.toml`) but I could not verify wildcard-with-force behaviour without deploying [U], so prefer generated explicit rows and verify with the curl matrix in Appendix D.
  - Same deploy: change every canonical, `og:url`, sitemap `<loc>`, JSON-LD `url`, and internal `href` to the extensionless form (`site-nav.js` GROUPS hrefs, the `#seo-content` nav, the 18 static links, the 10 back links in G8, and all emitters that build `/index.html?tick=`: `documentary.html:92`, `education.html:81`, `search.html`, `historian.html:110`, `embed.html:60`, `regiment.html:247`, `turning-points.html:118`). Until seo-growth-09 ships they point to `/?tick=`; after it, to `/map?tick=` (app-time §8 URL contract keeps `tick`, `t`, `unit`, `vignette`, `ancestor` params).
  - `www` and `http://www`: set the Netlify primary domain to the apex so `http://www.x` goes to `https://x` in one hop (today two hops [V]).
  - Strip campaign parameters on arrival: `history.replaceState` to remove `utm_*`/`ref` once analytics has read them (keeps shared URLs clean). Canonicals already ignore parameters.
  - `robots`: leave duplicate hosts to 301s (no `Disallow`).
  - After 2 weeks, in GSC remove the `/landing.html` URL via Removals only if it still shows.
- **Acceptance:** Appendix D curl matrix: every legacy variant returns exactly one 301 to the canonical and the final response is 200 with matching `<link rel=canonical>`; netlify.app host returns 301; Netlify Analytics Top pages shows no `.html`/`/index.html` rows after 7 days; GSC Pages report shows the extensionless URL as "User-declared canonical".

### seo-growth-04 - Decide and apply the name: "Gettysburg Interactive Map" (S-M, medium; high leverage)
- **Audit refs:** E2, T1. **Depends:** owner decision D1. **Moves:** brand queries, SERP click-through, trademark/confusion risk, consistency.
- **Evidence:** names in use: title/H1/JSON-LD/manifest/OG "Gettysburg Animated Battlefield Map" (`deploy:index.html:14,718`, `manifest.json` name), domain "gettysburginteractivemap.com", nav brand "GETTYSBURG", splash "Gettysburg". Competitors: ABT "Gettysburg Animated Map" (battlefields.org), Savas Beatie "Gettysburg Animated Battle Map APP" ($49.95 lifetime [V via WebFetch, author name reported inconsistently as Tom March / Tom Marchesani: verify]), YouTube channel "Gettysburg - Fully Animated", 2019 film "Gettysburg/Antietam: Animated Battle Map" on Apple TV/Tubi [V]. A CivilWarTalk thread titled "New Gettysburg Animated Battlefield Map" exists [V title; body not fetched, forum returns 403 to fetchers; unknown whether it is about this site or the paid app].
- **Root cause:** the title was chosen from the feature ("animated") not from the search landscape; the exact-match phrase is shared with a paid product and video content.
- **Fix:**
  1. Primary name **Gettysburg Interactive Map**; descriptor "minute-by-minute" is dropped (data is five-minute, modeled: G16/G17), replaced by "in five-minute steps". "Animated" stays in body copy, not the brand.
  2. Title pattern: `{Page-specific keywords} | Gettysburg Interactive Map` (brand 26 chars; total <= 60). Home: `Gettysburg Interactive Map: The Battle in Five-Minute Steps` (59).
  3. `WebSite.name` = "Gettysburg Interactive Map", `alternateName` = ["Gettysburg Animated Battlefield Map"] for the transition (Google "site name" uses WebSite markup); `manifest.name` same, `short_name` "Gettysburg Map".
  4. Add an "Not affiliated with the National Park Service, the American Battlefield Trust or any publisher" line in the footer and About (the app reuses NPS Auto Tour text and Gettysburg NMP place names; reduces confusion).
  5. Legal: not legal advice: the similarity of "Gettysburg Animated Battlefield Map" to a commercially sold "Gettysburg Animated Battle Map APP" is a reason to move now rather than after backlinks accumulate. Ask the owner whether any term was ever registered.
  6. Update: `index.html` title/description/OG/JSON-LD, `site-nav.js` brand, every sub-page title suffix (23 pages), `manifest.json`, `sw.js` comment, `privacy/terms` text, the guide PDF (G1) footer, embed brand line.
- **Acceptance:** `grep -ri "Animated Battlefield Map"` finds only the `alternateName` and the changelog; title lengths <= 60 for all indexable pages; GSC "Site name" test (URL Inspection > Search appearance) shows the new name after recrawl.

### seo-growth-05 - Per-page metadata, indexability disposition and visible intro copy for all 27 HTML files (M, medium)
- **Audit refs:** T1, E3. **Depends:** 04 (names), 03 (URLs). **Overlaps:** pagesA-37 (2, 5). **Moves:** CTR, relevance, thin-content risk.
- **Evidence:** G12, G18, G10; static word counts: search 27, camera 50, education 49, turning-points 42, cinematic-export 60, documentary 66, dashboard 76 (`words=` census [V]).
- **Fix:** apply the table below. "Index" pages get >= 150 visible words of unique intro/FAQ/how-to text server-rendered in the HTML (not fetched), one `<h1>`, breadcrumbs, JSON-LD per section 4.5. "Noindex,follow" pages stay usable and linked but do not compete for thin-content scoring. New titles <= 60 chars and descriptions 120-155 chars (lengths computed [V] for the examples).

| File (new URL) | Disposition | Title (<= 60) | Notes |
|---|---|---|---|
| index.html (`/`) | Index | Gettysburg Interactive Map: The Battle in Five-Minute Steps (59) | Becomes landing (seo-growth-09); description: "Watch the Battle of Gettysburg unfold on an interactive map, July 1-3, 1863: 466 regiments and 103 batteries placed every five minutes. Free, no login." (151) |
| (app) `/map` | **noindex,follow** | Gettysburg Interactive Map (app) | thin by nature; excluded from sitemap |
| documentary (`/documentary`) | Index -> becomes hub to `/moments` | Documentary Mode: 24 Moments of Gettysburg | after seo-growth-15 the text lives on moment pages; page keeps the guided player |
| turning-points | Index | Turning Points of Gettysburg: 9 Decisions Historians Debate | expand to 9 pages (22) |
| find-ancestor | Index | Find Your Ancestor's Regiment at Gettysburg | becomes guide + tool (20) |
| education | Index | Gettysburg for Students: Battle Guide and Map Activities | merge into `/learn` (31); 301 |
| aftermath | Index | Aftermath of Gettysburg: Retreat, Hospitals, the Address | time-hook Nov 19 (34) |
| regiment (`/regiment`) | Index as tool | Regiment Search: Every Gettysburg Regiment and Battery | 301 old `?unit=` to unit page (JS `location.replace`) |
| dashboard | Index | Gettysburg Casualties and Strength by Corps: Dashboard | + static table of the same numbers (Dataset, 26) |
| report | Index | Printable Battle Reports for Any Gettysburg Regiment | needs static sample (pagesA-24) |
| historian | Index | Ask the Historian: Gettysburg Questions Answered | + static Q&A hub (23) |
| compare, camera, sandbox, viewshed, ground-remembers, living-ledger, immersive | Index **only if** >= 150 unique words + screenshot; else noindex,follow | e.g. "Compare Two Moments of Gettysburg on a Split Map" | tools do not need to rank on their own; do not spend content budget here first |
| search | **noindex,follow** | Search Gettysburg | internal search UI (27 words); search results pages should not be indexed |
| watch-together, cinematic-export, ar | Index low priority | short descriptive titles | utility; add 150-word explainers; ar page needs on-site instructions |
| privacy, terms | Index (harmless) | unchanged, add og tags | exclude from sitemap is acceptable |
| embed | noindex (already) | | |
| unit-rendering-reference | **remove from production** (currently noindex dev page loading mapbox-gl from CDN) | | X4 |
| 404 | noindex (already) | | |

- **Acceptance:** Screaming-Frog-style crawl (Appendix D script) shows: one h1 per page, title <= 60, description 120-155, no duplicate titles/descriptions, all "Index" pages >= 150 raw-HTML words; GSC shows no "Duplicate, submitted URL not selected as canonical".

### seo-growth-06 - Sitemap index with real `lastmod`, robots.txt with an explicit AI-crawler policy, llms.txt (S, medium)
- **Audit refs:** E5, T1. **Depends:** 03. **Moves:** discovery, per-section indexing stats, AI visibility.
- **Evidence:** G11. `deploy:robots.txt` is `User-agent: * / Allow: /` plus a Sitemap line (82 bytes). Live: `/llms.txt` 404 [V].
- **Fix:**
  1. `sitemap.xml` becomes a **sitemap index** (URL unchanged so Google and Bing keep discovering it) pointing to `sitemap-core.xml`, `-moments.xml`, `-battle.xml`, `-units.xml`, `-places.xml`, `-people.xml`, `-ancestors.xml`, `-learn.xml`, `-trust.xml`. Per-section files exist purely so Search Console reports "Indexed vs submitted" per template, which is how thin-content problems are detected. Total < 50,000 URLs and < 50 MB each (about 340-580 URLs planned).
  2. `<lastmod>` = last **content** change (git commit date of the source data/markdown, not build time). Omit `changefreq` and `priority` (ignored). Only canonical, 200, indexable URLs. Include privacy/terms optionally.
  3. `robots.txt` (validated with Python `urllib.robotparser` [V] in `seo_tmp/robots_sample.txt`; full text in Appendix A): default group allows everything; a training-crawler group (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, meta-externalagent) is `Disallow: /data/`. Search/answer bots (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, DuckDuckBot, Applebot) and user-triggered fetchers (ChatGPT-User, Claude-User, Perplexity-User) fall in the default group. Token spellings other than OpenAI's and Anthropic's come from memory: check each vendor's page before deploying. Do **not** disallow `/data/` for Googlebot/Bingbot: the tool pages render from it. User-agent names checked against OpenAI (GPTBot / OAI-SearchBot / ChatGPT-User, and that OAI-SearchBot must be allowed to appear in ChatGPT search [V]) and Anthropic (ClaudeBot training, Claude-User, Claude-SearchBot [V via search summaries]) documentation. Owner decision D2: whether to allow training crawlers at all; default recommendation is allow HTML, disallow bulk data (consistent with the Terms).
  4. `llms.txt` and `llms-full.txt` (Appendix A). Be honest about value: no major provider documents using it [U: verify against current docs]; cost is S; keep it accurate. Real AI visibility comes from server-rendered HTML (seo-growth-09, 13) and Bing indexing (01).
  5. Add `<meta name="robots" content="max-image-preview:large, max-snippet:-1">` to indexable pages (permits large previews; default is permissive, this makes it explicit).
- **Acceptance:** `robotparser` test matrix in Appendix A passes; sitemap index validates in GSC and Bing with each child "Success"; every URL in a child sitemap returns 200 with `index` and self-canonical (CI check); `curl -I /llms.txt` 200 `text/plain`.

### seo-growth-07 - Domain continuity: renew multi-year and lock (S, medium)
- **Evidence:** G1: expires 2027-06-13, one week before the 164th-anniversary traffic peak (June 26-July 3, 2027) [dates: expiry from RDAP; anniversary window from the battle dates]. Status `client transfer prohibited` (registrar lock on).
- **Fix:** at the registrar: enable auto-renew, renew for 5-10 years now, add a second contact email (currently the site footer uses one Gmail address `deploy:site-nav.js:194`), set a calendar reminder for 2027-05-13. Domain age is not a direct ranking factor, but a lapse would erase every backlink built in this plan.
- **Acceptance:** RDAP `expiration` >= 2031-06-13; registrar shows auto-renew on.

### seo-growth-08 - Manifest and PWA discoverability hygiene (S, medium)
- **Audit refs:** E1. **Overlaps:** prov-recon-42, app-a11y-29. **Moves:** installability, mobile UX, Best Practices.
- **Evidence:** `deploy:manifest.json`: `"orientation": "landscape"`, `"purpose": "any maskable"` on both icons, `start_url: "/"`, no `id`, no `lang`, screenshots = the corrupt duplicated file (G9). Icons themselves decode fine (4-colour, rounded border + star) [V PIL].
- **Fix:** remove `orientation`; add `id: "/map"` (a stable identity; use `/` until seo-growth-09 ships), `start_url: "/map?source=pwa"` once seo-growth-09 lands (until then `/?source=pwa`), `lang: "en-US"`, `name: "Gettysburg Interactive Map"`, `short_name: "Gettysburg Map"`; split icons into `purpose: "any"` and a dedicated `maskable` set with a 40%-safe-zone (current art has an inset border that a circle mask would clip); screenshots: two wide (`form_factor: "wide"`, 1280x720) and two narrow (`form_factor: "narrow"`, 750x1334) real captures; `shortcuts`: Day 1 (`/map?tick=1`), Day 2 (`?tick=226`), Day 3 (`?tick=451`), Search (`/units`); `categories` keep; `display: standalone` keep. Serve `manifest.webmanifest` with `application/manifest+json` (Netlify infers by extension).
- **Acceptance:** Lighthouse installability passes; Chrome DevTools > Application > Manifest shows no warnings and renders the install-sheet screenshots; portrait phone can install and rotate freely.

### seo-growth-09 - Landing-first home (static `/`, app at `/map`), one h1, and the #seo-content/cloaking decision (L, high)
- **Audit refs:** E3, E4, T1, C6-adjacent. **Depends:** prov-recon-35 (Astro or a static generator), prov-recon-16 / perf-cwv-04 / perf-cwv-26 (boot redesign), bundle-anatomy-15 (static LCP/HTML-first shell), app-time-06 (deep-link consumer). **Coordinates with:** perf-cwv-05 (one visible hero), pagesA-05 (pre-rendered nav), app-a11y-15 (landmarks/h1), app-a11y-12 (Battle Chronicle). **Moves:** SEO (indexable home with real copy), LCP/FCP (hero is HTML text/image, app JS off the landing path), bounce for search visitors, AI-crawler visibility.
- **Evidence:** G13-G15; `deploy:index.html:717-741` (18 links + h1 + two paragraphs inside `#root`), `:742-748` (splash h1), `:424-425` (removal), `:753` (noscript h1); perf-cwv-05 measured `#seo-content>p` (74,227 px2) as a leading LCP candidate in its prototype (about 0.6 s) and notes React's `createRoot` clears `#root`. The home page's description in search results mirrors the crawler-only paragraph (G15), so it is doing some work for non-JS pipelines.
- **Cloaking / hidden-text risk assessment** (against Google's published policy, fetched [V]: cloaking = "presenting different content to users and search engines"; hidden text = "placing content on a page in a way solely to manipulate search engines and not to be easily viewable by human visitors"):

  | Question | Finding | Risk |
  |---|---|---|
  | Different HTML per user agent? | No: one static document to everyone [C] | none |
  | Text truthful and consistent with the product? | Yes, but "minute-by-minute" vs five-minute snapshots and "467 regiments and batteries" are inaccurate (G16) | low (trust) |
  | Visible to humans? | No: `#boot-splash` (position:fixed) paints over it; script deletes it; nav links there are never shown | **medium**: fits the "easily viewable" clause in spirit; intent is benign (comment at `index.html:144-152` says so) |
  | Does it help Google? | Doubtful: Google renders JS, so its indexed DOM is the app shell after `createRoot` (no h1, no copy, toolbar letters "S F L B ?" per audit D2) [U: settle with URL Inspection] | ineffective |
  | Helps non-JS crawlers (AI fetchers, unfurlers)? | Yes for the home page only; 26 other pages are empty shells | partial |
  | Manual-action likelihood | Low (small, truthful), but non-zero and pointless to carry | low-medium |

  Verdict: not cloaking by definition; a fragile workaround that should be retired, not extended.
- **Options:**
  - **Option 0 (interim, S, already specified in perf-cwv-05):** make the hero one visible element (h1 + one paragraph) that users and crawlers both see; downgrade the splash `<h1>` to a `<p>`; keep exactly one h1; keep noscript as `<h2>`. Removes the "hidden" concern; does not fix "disappears after mount".
  - **Option A (recommended target, L):** `/` is a static, fast, content-rich landing page (Astro page, zero blocking JS); the app lives at `/map` (`noindex,follow`). Landing blocks: h1 "Gettysburg Interactive Map"; 40-60-word answer-first summary; primary CTA "Open the map" (`/map`) and secondary CTAs (Moments, Order of battle, Find your ancestor, Teach Gettysburg); three sourced facts with links to `/sources`; "How accurate is this map?" three bullets (documented vs modeled, 152 units with keyframes, corrections link); latest changes (3 items from the changelog); full crawlable footer with all hubs. Returning users and deep links skip it:
    ```html
    <script>
    // Same rule for every UA that runs JS; Googlebot has no local state and no params, so it sees the landing page.
    (function(){try{
      var q=location.search, deep=/[?&](tick|t|at|unit|u|vignette|ancestor|ll|z|lat|lng)=/.test(q);
      var seen=localStorage.getItem('gtbg_seen')==='1', force=/[?&]landing=1/.test(q);
      if(deep||(seen&&!force)) location.replace('/map'+q+location.hash);
    }catch(e){}})();
    </script>
    ```
    Preserve all printed/shared links (`/?tick=...`, `/?ancestor=...`) by this passthrough. PWA `start_url` = `/map?source=pwa` so installed users never see the landing. CTA `pointerenter`/`touchstart` injects `<link rel="prefetch" href="/assets/...">` for the app entry so the click feels instant without shipping 2.3 MB to every search visitor.
  - **Option B (fallback, M-L):** keep the app at `/` and SSR the app shell including a real, permanent "About this map" region (drawer) so text remains in the DOM after mount. Simplest for continuity, weakest for content depth and LCP.
- **Residual risk of A and mitigation:** redirecting returning users could be read as "sneaky redirect" only if crawlers were treated differently; here the rule keys on the user's own local state and explicit URL parameters, and the landing is fully visible to any crawler. Measure with URL Inspection (rendered HTML = landing) and monitor `map_launch / landing_view` (target >= 45%; if lower, add a hero map preview).
- **Effect on other work:** `/map` needs its own single `h1` (visually hidden is acceptable for an app shell: app-a11y-01/15) and a `<title>`; Extra Features/"Ask the Historian" overlay retires (H1, prov-recon-30).
- **Acceptance:** `curl -s /` shows exactly one `<h1>`, >= 250 words of unique text, all hub links and the footer without JS; GSC URL Inspection "rendered HTML" contains the same h1 and text; landing LCP <= 1.5 s mobile lab (element = h1 or hero image; LCP element check as in perf-cwv-27); `?tick=300` and `?ancestor=U-20ME` open the map directly; `/map` is `noindex,follow` and absent from the sitemap.

### seo-growth-10 - Structured data programme: one JSON-LD `@graph` per template, validated in CI (M, medium)
- **Audit refs:** T1. **Depends:** 04, 13. **Overlaps:** pagesA-37 (3), pagesB-09. **Moves:** entity understanding, Breadcrumb rich results, Dataset Search eligibility, GSC Enhancements cleanliness.
- **Evidence:** G13; the existing nested `Event` has no `location`, and `WebApplication` has no `offers`.
- **Fix:** see the matrix in section 4.5 and the validated samples (Appendix B; files `seo_tmp/jsonld_home.json`, `jsonld_moment.json`, `jsonld_dataset.json`, all parse as JSON [V]). Rules that keep the markup honest and GSC quiet:
  - Do **not** invest in FAQPage, HowTo or a Sitelinks search box: the Search Central gallery (fetched today [V]) lists Article, Breadcrumb, Carousel, Dataset, Event, Organization, Profile page, Software app, Video, Image metadata and others, and none of the three. Do not fabricate `aggregateRating` or `review` (Software app rich results require them; accept "not eligible").
  - Use `Event` only as the `about` node with `startDate`, `endDate` and `location` (Google's Event feature is for attendable events; a historical battle will not earn the rich result, but a complete node avoids "missing field" noise).
  - `Person` only for commanders with a sourced page (name, rank, unit); `sameAs` only for URLs the owner has opened and confirmed (Wikipedia). No invented birth/death dates.
  - `Dataset` only on the data landing page (26) with `license`, `distribution`, `temporalCoverage`, `spatialCoverage` (bounds from `terrain.json`: S 39.77, W -77.29, N 39.85, E -77.18), `identifier` (DOI once minted).
  - `BreadcrumbList` on every non-home page; visible breadcrumb HTML must match.
  - `dateModified` = real content change (from git), never build time.
- **Acceptance:** Rich Results Test and Schema Markup Validator show 0 errors on one URL per template; GSC Enhancements shows Breadcrumbs valid for >= 95% of indexable non-home URLs within 30 days; CI runs a JSON-LD schema check (custom `ajv` schema or `schema-dts`) and fails on missing `location` in any Event node.

### seo-growth-11 - Build-time dynamic OG images per page (M, medium)
- **Audit refs:** T1. **Depends:** 13 (entities), 12 (SVG mini-maps). **Moves:** share CTR, image-search eligibility, brand.
- **Evidence:** G9. No per-page images exist; all 26 pages share one broken file.
- **Fix:** a Node build step (`scripts/og/render.mjs`) using Satori (HTML/CSS to SVG) + resvg-js (SVG to PNG) + a palette quantiser (sharp or oxipng) to emit `/og/<template>/<slug>.<hash8>.png`, 1200x630, <= 120 KB (WhatsApp/iMessage prefer small [U]). Layout: `#0a0a14` field, gold `#c9a24b` rule, eyebrow ("JULY 2, 1863 · LITTLE ROUND TOP", from `TimeModel.format`), title max 2 lines at 68 px in an OFL serif (e.g., Source Serif 4), the page's own **SVG mini-map** (seo-growth-12) on the right, wordmark bottom-left. **Do not** composite Mapbox satellite tiles or screenshots into shareable images without reading the Mapbox terms (attribution/caching rules) [U]; the mini-map uses only own data plus USGS contour lines (public domain; the DEM pipeline in pagesB-36 already fetches 3DEP data). Cache by input hash so an edit regenerates only its image. Emit `og:image`, `og:image:width/height`, `og:image:alt` (describes the map, e.g., "Map of the Confederate assault on Little Round Top, July 2, 1863"), `twitter:image`, `twitter:image:alt`. Fallback `/og/default.png` for tool pages.
- **Acceptance:** CI decodes every image with Pillow, asserts 1200x630, <= 200 KB and non-uniform (stddev > threshold, to catch blank renders like G9); manual check of 5 URLs in Facebook Sharing Debugger and LinkedIn Post Inspector; image alt present on all.

### seo-growth-12 - Static-first content pages: SVG mini-maps, no map engine on content pages, click-to-load only (M, high)
- **Audit refs:** T1, P1-P4, X1. **Depends:** perf-cwv-20, bundle-anatomy-18. **Moves:** LCP/INP for entry pages (RUM p75 is site-wide, so more sessions landing on light pages lowers it), Mapbox quota and cost.
- **Evidence:** sub-pages load a second 1.8 MB mapbox-gl from a CDN (bundle-anatomy-18, pagesB-02); the Mapbox token appears unrestricted (X1); a JS-rendering crawler executing Mapbox GL on 600 pages would consume "map loads" that Mapbox bills (the free allowance was 50,000 web map loads per month when I last knew it; verify current pricing [U]).
- **Fix:** every programmatic page ships as static HTML with: inline SVG mini-map (<= 15 KB, `role="img"`, `<title>`/`<desc>`, real coordinates from placements/terrain/monuments, labelled landmarks), "Open on the interactive map" link (`/map?unit=...&tick=...`), zero third-party requests, total JS <= 15 KB (progressive enhancement only). Where a live map genuinely helps (places, brigades), use a "Load interactive map" button that injects Mapbox on click (one billable load per intentional action) and is never triggered by scroll or by `IntersectionObserver`. Budgets: HTML <= 35 KB raw (<= 12 KB brotli), CSS inline <= 10 KB, LCP element is text or the SVG.
- **Acceptance:** Lighthouse mobile >= 98 (perf) on one page per template with 0 third-party requests; Network panel shows no `mapbox` request until the button is pressed; Mapbox account "map loads" flat during a full-site crawl test (run a headless crawl of staging).

### seo-growth-13 - Content-gated programmatic engine: generator, URL taxonomy, tiers, thin-content gate, staged release (XL, high)
- **Audit refs:** T1, E4, E5. **Depends:** prov-recon-35 (static generator/Astro), prov-recon-37 (`data/v2`, `unit_counts`), pagesA-19 (`entities.v1.json`), pagesB-53 (`names.json`, vignette schema v2), 14 (enrichment), 03, 10, 11, 12. **Overlaps:** pagesB-47 (per-unit prerender: I keep the idea and add gating), app-a11y-12 (chronicle: see 16). **Moves:** indexable surface from 21 to about 340 URLs (up to about 580), long-tail impressions, AI-crawler visibility.
- **Evidence:** G17-G19, G22. Raw text per entity is small (regiment median 17 words, brigade median 120, 0/101 brigade pages >= 250), so a straight data-to-template dump violates Google's spam policy on scaled content ("many pages generated for the primary purpose of manipulating search rankings and not helping users" [V, fetched]); and the time labels are wrong (G22), so hour pages generated now would publish errors at scale.
- **Root cause:** the dataset is a game-engine database (positions, strengths) rather than an encyclopedic one; entity prose is a one-line `key_action`.
- **Fix:**
  1. **Generator** (`apps/web`, Astro `getStaticPaths` per template, or, if Astro is not ready, a plain Node script that writes HTML into the legacy tree so the first templates can ship on the current stack). Inputs: `data/v2/*.json` (validated, hashed), `entities.v1.json`, `names.json`, `unit_counts.json`, `excerpts.json` (14), `TimeModel` (app-time-02). Outputs: HTML, per-section sitemaps, `_redirects`, OG images, JSON-LD, `slugs.lock.json`.
  2. **URL taxonomy** (section 4.1): 13 templates, about 340 Tier-A URLs (up to about 580 with Tier B and Q&A); extensionless, lowercase, hyphenated; slugs derived from designation/title; `slugs.lock.json` is committed and append-only; a rename adds a 301 row forever; every unit page also answers `/u/{unit_id}` (301 to canonical) so old ids keep working.
  3. **Tiers.** Tier A (publish when the template passes the gate): moments, turning points, places, corps/division/brigade hubs, state pages, day/part-of-day pages, commander Tier-A list, trust pages, learn. Tier B (regiment/battery pages): publish a unit only when it clears the gate with enrichment; first 60 in the 90-day window, up to about 180 (candidates: featured in a vignette, >= 40% losses = 151, flagged = 31; union of the criteria = 180 [V]). Tier C (the other roughly 390 units): **no page**; each appears as an anchored section (`#u-U-19IN`) on its brigade page and stays reachable through search and the map. This avoids thin pages and avoids an index full of "Crawled - currently not indexed".
  4. **Thin-content gate** (section 4.2 and Appendix C) runs in CI on the built HTML: minimum unique words per template, boilerplate ratio <= 0.35, 5-gram similarity < 0.5 against 25 sibling pages, >= 6 distinct facts, >= 1 source, own lead paragraph, zero dev-copy regex hits (reuse pagesB-10's lint). On failure: a unit page is not emitted; any Tier-A page fails the build; a Tier-B page is emitted `noindex,follow` and left out of the sitemap.
  5. **Release train:** at most about 100 new URLs per week, each batch with a manual read of 10 random pages by the owner (quality, dates, spelling of names), then IndexNow + GSC "Request indexing" for the hubs. Pause rule: if any section's "Crawled - currently not indexed" share exceeds 25% two weeks after release, stop new URLs in that section and enrich instead.
  6. **Time-dependent pages** (day/part-of-day, any page printing a clock) are blocked on app-time-02..05; until then the generator prints prose times only (as written in vignette text) or omits them.
  7. **Counts** come from `unit_counts.json` everywhere ("466 regiments and 103 batteries"); a lint fails the build on hard-coded 467/445/430,000.
  8. **Redirects:** old tool URLs that become sections (`/education` to `/learn`; `/regiment?unit=` to the unit page via a 6-line `location.replace` on load because `_redirects` cannot read query strings) are emitted by the generator.
- **Acceptance:** `gate-report.json` lists every page with pass/fail; 0 Tier-A failures; per-template sitemaps exist; GSC per-sitemap "Indexed / Submitted" >= 80% for batches older than 30 days; no template exceeds 25% "Crawled - currently not indexed"; `curl` of any generated page shows all content in raw HTML.

### seo-growth-14 - Enrichment corpus that makes entity pages genuinely unique (XL, high; shared with the Historian expansion)
- **Audit refs:** T1, H8. **Depends:** historian-sources workstream (it is already ingesting Official Records Vol. 27 text: `plan-work/tmp-hist-sources-1/or27_*.txt`; I did not inspect its quality), 13. **Moves:** content depth, E-E-A-T (primary sources), Tier-B unit pages, AI citations.
- **Evidence:** G18-G20. Without enrichment the unit tier cannot exist. `key_action` >= 100 chars for 40 of 467.
- **Fix:** build `data/curated/excerpts.json` (schema: `{unit_id|entity_id, source_id, locator, text (<= 120 words), scan_url, license, reviewed_by, reviewed_on}`) from sources in four buckets:
  - **Computed (no licensing question, do first):** casualty-rate rank/percentile within side and corps ("9th of 274 Union regiments by loss rate"), share of brigade/corps losses, days engaged, distance and direction its brigade moved between first and last keyframe, nearest landmark at each keyframe (haversine to `terrain.json` `key_locations`), monuments within 300 m (from the 512-monument list), succession chain (`commander_successions.json`, 42 events), state-cohort context ("one of 9 Maine units"), vignette links via ancestors (pagesB-43: `U-20ME` to V-010). Each yields 40-150 words of real, unique, factual prose per unit.
  - **Public-domain primary/secondary text (owner verifies each item on Internet Archive/HathiTrust before use [U]):** Official Records Vol. 27 Parts I-III (US government, 1889-1890; report excerpts by regiment and brigade); state monument-commission volumes (for example "Pennsylvania at Gettysburg", "New York at Gettysburg", "Maine at Gettysburg", "Michigan at Gettysburg", all published before 1929) which give regimental narratives and inscriptions; Dawes (1890) and Oates (1905), already cited in `data/`; Fox, "Regimental Losses in the American Civil War" (1889) as a cross-check for casualty figures. Quote <= 120 words with citation and a link to the scan; never paste whole reports.
  - **Restricted (decision Q2):** Busey and Martin (1994, later editions, Longstreet House) is the strength/loss source for the site and is a copyrighted book. Facts are not protected in the US but selection/arrangement of a compilation can be. Publishing "every regiment's strength and losses" as browsable pages and as an open dataset (26) is a step beyond today's UI; get advice, attribute prominently, and consider asking the publisher (a friendly note is the cheapest insurance). Wikipedia text is CC BY-SA 4.0 (share-alike): use facts, not prose.
  - **NPS** web content is US-government work (generally public domain unless credited otherwise; verify per page) and is the safest modern source for place/monument descriptions.
  - Provenance check first: G20 shows three data notes naming a "Gettysburg Animated YouTube vignette", which is the channel promoting the paid Savas Beatie app. If any positions/text were derived from that product, do not scale or open-license them until that is resolved (Q3).
- **Process:** (1) extractor script over OR text keyed by unit designation aliases (pagesB-43 alias table); (2) human review queue (owner or reviewer volunteers) marking each excerpt approved; (3) lint (length, citation present, no OCR garbage: reject if > 3% non-dictionary tokens); (4) publish only approved.
- **Acceptance:** 60 Tier-B units each have >= 1 approved primary-source excerpt and >= 250 words; gate passes; a reviewer can trace every quoted sentence to a scan URL in <= 2 clicks.

### seo-growth-15 - Moment pages (24) and the `/moments` hub (L, high)
- **Audit refs:** T1, E4. **Depends:** 13, 10, 11, 12; pagesB-53 (vignette schema v2: `sources[]`, `historical_time`), pagesB-14 (paragraph splitting), app-time-02 (clock). **Moves:** long-tail queries (first shot, Reynolds killed, Chamberlain's charge, High Water Mark), AI citations, internal link hub.
- **Evidence:** G18 (7,205 words; 206-375 each), `deploy:documentary.html:88-91` (one vignette at a time, no URLs), `deploy:education.html:66` (same JSON). Search results for "what time did Pickett's Charge start" are ABT time-slice static maps (URL slugs such as `gettysburg-picketts-charge-july-3-1863-345-400-pm`), Wikipedia, HistoryNet, LoC [V].
- **Fix:** template `/moments/{slug}` (slug from title: `chamberlains-charge`, `the-first-shot`, `picketts-return`):
  - `<h1>` = vignette title; eyebrow = "July 2, 1863 (day/time from TimeModel) - Little Round Top" with link to the place page.
  - **Answer-first block** (40-60 words) that differs from the meta description.
  - Body: `full_script` split into paragraphs (pagesB-14), then "Who was there" (units_featured resolved through ancestors to linked hub/unit pages), "The ground" (mini-map + link to place), "Around this hour" (chronology events within +-60 min from the corrected clock), "What historians debate" (link to the matching turning point if any), "Sources" (per-vignette `sources[]`; today only file-level sources exist [G19]), "Open this moment on the map" (`/map?tick=&vignette=`), previous/next in time, cite box (32), corrections link.
  - Length target >= 450 words after enrichment; gate minimum 400.
  - Title `{Vignette title}, {Place}: July 2, 1863 | Gettysburg Interactive Map`, dropping the brand when the total exceeds 60; description 130-155 chars.
  - Hub `/moments`: static day sections (Day 1, 2, 3) with one-sentence teasers and thumbnails (OG art), `ItemList` JSON-LD.
  - Image search: each page's OG art has a descriptive `alt` and caption; images are ours (no third-party basemap imagery).
  - `/documentary` keeps the guided player but links every step to its moment URL.
- **Acceptance:** 24 pages pass the gate; each page's raw HTML contains the full narrative; Rich Results Test valid Article + Breadcrumb; Documentary "Watch this moment on the map" and each moment CTA open the right tick once app-time-06 ships; GSC shows >= 20 of 24 indexed within 45 days of release.

### seo-growth-16 - Battle-by-day and part-of-day pages, with hour anchors (L, high; blocked on the time model)
- **Audit refs:** C4, T1. **Depends:** app-time-02..05, 12 (captions), 13, 15. **Overlaps:** app-a11y-12 (`/battle-chronicle.html`): I keep its content but resolve the duplicate-content problem below.
- **Evidence:** G22 (label compression); SERP for "gettysburg battle timeline hour by hour" is CivilWarTalk, Stone Sentinels (three day pages; the July 2 page has 40-50 entries and over 15,000 words [V via WebFetch]), History.com, ABT, Wikipedia [V]. Hour-level chronology has only 137 events (38 distinct hours, 23 hours with >= 3 events using today's labels [V]), too sparse for 56 hour pages.
- **Fix:**
  1. Three day hubs `/battle/july-1|2|3` and roughly 13 part-of-day pages (`/battle/july-2/afternoon`, `/evening`, ...) whose boundaries come from the corrected clock and event density (not equal slices). Hour queries ("gettysburg july 2 4pm") land on the part-of-day page with `<h3 id="4pm">` anchors.
  2. Each page: 120-word authored intro, timeline of events (times from `TimeModel`), a computed "where the corps were" table at window start/end (from placements), static SVG casualty-accumulation chart (dashboard data), the moments and places that fall in the window, sources; >= 500 words.
  3. Title: `July 2, 1863, 4-7 PM at Gettysburg: Timeline and Map | Gettysburg Interactive Map` (drop brand if > 60).
  4. Duplicate-content rule: the all-in-one "read everything" page from app-a11y-12 is generated from the same partials but is `noindex,follow` (print view and screen-reader convenience), canonical to itself; the crawlable copies are the day/part pages. Do not publish the same paragraphs at two indexable URLs.
  5. Differentiate from Stone Sentinels/ABT: positions table + map link at each time slice, which neither offers interactively; keep prose original.
- **Acceptance:** no page prints a clock time that disagrees with `TimeModel.format(tick)` (link-checker script); each page >= 500 words; part-of-day pages cross-link in time order; Pickett's Charge appears at about 3 pm on July 3 (per app-time anchors), not 11:05 am.

### seo-growth-17 - Order-of-battle hub tree: corps, divisions, 101 brigade pages, gated regiment/battery pages (XL, high)
- **Audit refs:** T1, H10. **Depends:** 13, 14, pagesA-19, pagesB-44/45/53 (parent fallback, names, alias stub, 8 VI Corps brigades missing), prov-recon-37. **Overlaps:** pagesB-47 (per-unit pages). **Moves:** unit long tail, genealogy queries, internal-link depth, AI citations.
- **Evidence:** G16-G18; brigade records exist for 93 of 101 referenced parent ids (8 VI Corps brigades have none [V]); `union_oob_brigades.json` brigade records carry a long `key_action` and the nickname in `designation` ("Iron Brigade"); positions are brigade-level for 422 regiments (pagesB-44), so the brigade page is the correct home for most tracks. Competitors: Stone Sentinels per-regiment monument pages (location, GPS, inscriptions, casualties, commander, four photos, breadcrumbs [V]), Wikipedia OOB pages, ABT.
- **Fix:**
  1. Templates: `/units` (side tabs, static tree), `/units/union`, `/units/confederate`, corps (about 13), divisions (about 31), brigades (101), regiments/batteries (Tier B).
  2. **Brigade page** (min 250 words after enrichment): nickname + commander + succession chain, strength, losses, computed rank among brigades, regiments table (state, commander, strength, losses, rate, days), brigade track summary with SVG mini-map from **its own** keyframes (real data, not inherited), vignette links, monuments within 300 m, one OR report excerpt (14), sources. Unit rows link to the unit page when it exists, else the anchor `#u-...`.
  3. **Regiment/battery page** (Tier B, min 250 words): designation as h1, one-sentence answer-first built from data ("The 20th Maine Volunteer Infantry, Vincent's brigade, V Corps, fought on Little Round Top on July 2 and lost X of Y men (Z%)."), then the sections in 14, "Position on the map" with the honest label "Brigade position (Third Brigade, First Division, Fifth Corps)" when inherited (pagesB-44), monument block, sources, cite box.
  4. **Do not publish** the alias stub (`U-14BK` "14th Brooklyn (alias for U-84NY)") as a page; 301 `/units/14th-brooklyn` to `/units/84th-new-york-infantry` and add "14th Brooklyn" to the target's `alternateName`.
  5. Titles: `{Brigade nickname or commander}'s Brigade at Gettysburg: Regiments, Losses, Map` / `{Designation} at Gettysburg: Position, Losses and Commander`; drop the brand when > 60.
  6. JSON-LD: `WebPage` + `mainEntity` `Organization` (name, alternateName, `parentOrganization` brigade, `location` Place) + `BreadcrumbList` (Home > Order of battle > Union > V Corps > Vincent's Brigade > 20th Maine); no fabricated `foundingDate`.
  7. Cross-links: brigade siblings, division parent, "same state" list, "same moment", previous/next by order-of-battle sequence.
- **Acceptance:** 101 brigade pages + 13 corps + 31 division pages pass the gate (VI Corps only once its 8 brigade records exist); at least 60 regiment pages live within 90 days; `/u/U-20ME` 301s to the canonical; `regiment?unit=U-20ME` lands on the unit page; GSC shows the OOB sitemap >= 80% indexed by day 60 for released batches.

### seo-growth-18 - Place pages (30 key locations plus structures/roads) built from computed neighbours, gated on the elevation fix (L, medium)
- **Audit refs:** T1. **Depends:** pagesB-35 (terrain.json coordinates/elevations do not match USGS 3DEP: fix before publishing any elevation), pagesB-36..39 (DEM pipeline), 13, 12. **Moves:** landmark queries ("little round top elevation", "devil's den", "the angle"), map-to-page linking, Place entity graph.
- **Evidence:** `terrain.json`: 30 `key_locations` (`significance` avg 19 words [V]), 8 roads, 8 structures, 4 terrain features; 512 monuments with coordinates in the bundle; competitors NPS, Wikipedia, ABT (time-sliced maps per location).
- **Fix:** template `/places/{slug}`: authored 150-250 words per place (about 6,000 words total; 2-3 days with sources), plus computed sections: monuments within 400 m (name, honors, NPS MN number), moments and events at that location (vignette `trigger_location`, chronology `location` match), units whose brigade keyframes fall within 300 m (with times from `TimeModel`), day relevance, elevation (USGS-verified), static SVG mini-map with contours, `Place` JSON-LD with `geo` and `containedInPlace` (Gettysburg National Military Park; `sameAs` only for verified Wikipedia URLs). Title `{Place}, Gettysburg: What Happened, Units and Monuments`. Ship structures (Leister House etc.) only if content >= 250 words.
- **Acceptance:** gate pass; elevations equal the 3DEP-verified values within 1 ft (CI compares to `elevation.json`); each place lists >= 1 nearby monument or unit; Rich Results Test valid.

### seo-growth-19 - Commander pages: about 40 Tier-A people, not 686 (M, medium)
- **Audit refs:** T1. **Depends:** 13, 14, 17. **Moves:** "General X at Gettysburg" long tail, entity graph.
- **Evidence:** 686 distinct commander names across the OOB (including regiment level), 99 general-rank names, 42 succession events, 24 vignettes; individual monuments group has 64 entries [V]. Wikipedia owns head queries for the famous names.
- **Fix:** Tier-A = army/corps/division commanders and anyone who appears in a vignette, turning point or succession event (about 40; a selection script prints the list for owner approval). Page: rank/side/unit chain, "Fate at Gettysburg" (from `commander.fate`, quoted precisely), succession events, moments and turning points involved, unit pages, individual monument(s), primary-source excerpt(s), sources; no biography beyond what is cited. `Person` JSON-LD only with `name`, `jobTitle` and confirmed `sameAs`. Others remain rows on brigade pages. Title `{Rank} {Name} at Gettysburg: Command, Fate and Key Moments`.
- **Acceptance:** 40 pages pass the gate (>= 200 words each); every claim has a source; `sameAs` URLs resolve to the right person (manual check).

### seo-growth-20 - Ancestor funnel: state pages, a long-form guide, and a better lookup (L, high)
- **Audit refs:** T1. **Depends:** 13, 17, app-bugs / C3 / H5 (`?ancestor=` sort and dates). **Moves:** highest-intent genealogy queries, authority outbound links, backlinks from genealogy lists.
- **Evidence:** `deploy:find-ancestor.html:47-57` (honest caveat: unit-level only, NPS CWSS link `target=_blank rel=noopener`); OOB state counts [V]: New York 67, Pennsylvania 66, Virginia 42, Georgia 36, North Carolina 33, Alabama 17, Massachusetts 17, Ohio 13, New Jersey 12, South Carolina 11, Mississippi 11, Regular Army 11, Louisiana 10, Maine 9, Vermont 8, Michigan 7, Wisconsin 6, Connecticut 5, and 13 smaller. SERP for "find my ancestor gettysburg regiment": NPS ancestor-search page, Family Tree Magazine "7 Steps to Trace Gettysburg Ancestors", FamilySearch wiki, ABT Ancestor Research Guide, a Gettysburg Times column [V]. NPS states the park does not hold individual service or pension records and points to CWSS, civilwardata.com (subscription) and NARA [V via WebFetch].
- **Fix:**
  1. `/ancestors/{state}` for states with >= 5 units (17 states) plus `/ancestors/regular-army` and `/ancestors/other-states` (remaining 13). Each: 150-word authored intro (state's role, side, biggest fights), full table of units in HTML (designation, corps/brigade, strength, losses, rate, days engaged, link), mini-map, "how to trace your ancestor" checklist with state archive links (verify each URL before publishing [U]), FAQ ("Was my ancestor at Gettysburg?": a regiment being present did not mean every enlisted man was, per the NPS note [V]).
  2. `/find-your-civil-war-ancestor-at-gettysburg` (>= 1,500 words, step-by-step but no HowTo markup): confirm unit, confirm presence in July 1863, search CWSS (NPS), NARA pension/service records, state rosters, regimental histories, and how to use this map to follow the regiment (`/map?ancestor=`).
  3. Keep the interactive lookup; add commander search and alias search ("14th Brooklyn"); nothing typed is stored; **no analytics on query text** (seo-growth-35).
  4. Outbound links to NPS, NARA, FamilySearch Wiki and the ABT guide are deliberate: they are what users need and signal editorial quality.
- **Acceptance:** 19 state pages + guide pass the gate; each unit row resolves to a unit/brigade anchor; state totals equal `unit_counts`; guide indexed within 45 days; at least 3 genealogy-community mentions/links by day 90 (30).

### seo-growth-21 - Monument aggregation pages (13 groups) instead of 512 thin pages; source the data first (M, medium)
- **Audit refs:** T1, X5-adjacent (provenance). **Depends:** prov-recon-27 (extract the 512 with sources), 13. **Moves:** monument/place queries, provenance/E-E-A-T.
- **Evidence:** 512 monuments inline in the bundle (`bundle.pretty.js:104440-110610`, 111 KB); fields: no, name, honors, loc, lat, lon, mn (NPS-style "MN 366"), side, group; `src` filled for **9 of 512** [V]; groups: Pennsylvania 122, New York 94, Monuments to Individuals 64, Massachusetts 30, US Regulars/Sharpshooters 23, Maine 22, Ohio 21, Unit Monuments and Tablets 19, Other 15, Confederate States and State 14, New Jersey 13, Connecticut 10, Michigan 10, US and State 9, Indiana 7 ...; per-monument competition is Stone Sentinels, HMDB and Wikipedia.
- **Fix:** publish `/monuments` and about 13 group pages (groups with >= 10 monuments; the rest merged), each with a table (name, honors, location text, NPS number, coordinates, side), SVG mini-map, links to unit pages, and a provenance line per group. Do **not** generate 512 pages of about 40 words. Before publishing, fill `src` for every record (the NPS Gettysburg monument catalogue is the natural public-domain source [U: confirm]); do not copy text from Stone Sentinels/HMDB (copyrighted). Individual monument pages only where a unit/commander page already embeds the monument block (14).
- **Acceptance:** 100% of published rows have `src`; group pages pass the gate; `ItemList` JSON-LD valid; no monument row appears without coordinates inside the battlefield bounds.

### seo-growth-22 - Turning Points: nine pages that add sources, timeline and map (M, medium)
- **Audit refs:** T1, C4 (tick 175 vs chronology tick 75 for Ewell's order: app-time). **Depends:** 13, 15, app-time-04. **Moves:** "what if" and decision queries.
- **Evidence:** `deploy:turning-points.html:51-100` `POINTS[]` (9 entries, avg 116 words [V], content in JS, typed day-part strings); SERP for the Ewell/"if practicable" query is HistoryNet, Medium, an NPS symposium PDF, Wikipedia, ECW, Warfare History Network, CivilWarTalk [V], all essays; none interactive.
- **Fix:** `/turning-points/{slug}` (9): what happened (existing), the debate (existing) expanded to >= 400 words total with named positions and sources, "Who was there" and "the ground" blocks, the moment page link and map CTA, and an explicit honesty line ("This is a historians' debate, not a simulation"; the Sandbox stays labelled hypothetical). The hub keeps its accordion but server-renders all nine summaries. Fix the tick mismatch first (Ewell tick 175 vs 75).
- **Acceptance:** 9 pages >= 400 words with >= 2 cited sources each; hub raw HTML contains all nine summaries; times consistent with `TimeModel`.

### seo-growth-23 - "Gettysburg questions answered": a curated static Q&A hub of about 60 (L, medium; phase 4)
- **Audit refs:** H8, T1. **Depends:** 14, historian-expansion evaluation set. **Moves:** question-intent queries, AI answer citations, Historian quality (the same Q&A set is its regression suite).
- **Evidence:** the Historian today is client-side keyword search ("why did Lee lose the war" returned an irrelevant match per audit H8); answer engines favour concise sourced answers; ChatGPT already refers 14 visits/30 d [V].
- **Fix:** `/questions` hub and `/questions/{slug}` for about 60 authored questions ("Who fired the first shot at Gettysburg?", "What time did Pickett's Charge start?" (answer with the range and the sources: accounts vary between about 2 and 3 pm per the SERP summaries [V]; write from OR/Wert), "Why did Ewell not attack Cemetery Hill?", "How many soldiers died at Gettysburg?", "Where was Robert E. Lee on July 3?"). Each: 40-60-word answer-first block, 150-300-word explanation, sources, links to moment/unit/place pages, last-reviewed date. **Human-written and reviewed**; no bulk LLM generation (scaled-content abuse, and it would poison the Historian eval). FAQ rich results are no longer offered, so the payoff is snippets, People Also Ask and AI citations [gallery check V].
- **Acceptance:** 60 pages pass the gate (>= 250 words); every answer cites >= 1 source; the same 60 become the Historian's gold set (answer contains the cited fact).

### seo-growth-24 - Internal linking system: crawlable nav/footer in raw HTML, breadcrumbs, related graph, HTML sitemap, depth <= 3 (M, high)
- **Audit refs:** T1, E4. **Depends:** pagesA-05 (pre-rendered nav/footer), 13. **Moves:** discovery, link-equity flow, orphan prevention.
- **Evidence:** `deploy:site-nav.js:161-198` injects the entire nav and footer at DOMContentLoaded into empty mounts; with JS off the sub-pages contain no links to other pages and no privacy/terms/contact (pagesA-05); the home page's only static link list is the doomed `#seo-content` nav (G14); 10 pages link to `/index.html` (G8).
- **Fix:** rules enforced by a link-graph check in CI:
  - Every page's raw HTML contains the global nav (Map, Moments, Order of battle, Places, Find your ancestor, Teach) and a footer with About, Sources, Corrections, Data, Privacy, Terms, Contact, all as `<a href>`.
  - Breadcrumb trail (visible + JSON-LD) on every non-home page.
  - Related blocks computed from the graph, not hand-picked: unit -> brigade siblings, same state, same moment, same place; moment -> previous/next in time, units, place, turning point; place -> monuments, moments; state -> units; day page -> moments/places/turning points.
  - HTML sitemap `/sitemap` (human-readable index of all Tier-A hubs and their children; not a substitute for XML).
  - Depth: every indexable page <= 3 clicks from `/`; every indexable page has >= 3 inbound internal links from indexable pages; zero orphans; zero links to redirected URLs (crawl check).
  - Anchor text: descriptive ("20th Maine Infantry"), never "click here"; no keyword-stuffed footer blocks.
  - Deep links to the map always use the canonical `/map?...` contract (app-time section 8).
- **Acceptance:** `scripts/seo/linkgraph.mjs` prints max depth <= 3, orphans 0, broken 0, redirected-target links 0; `curl` shows nav/footer links with JS disabled.

### seo-growth-25 - E-E-A-T: real authorship, sources shown to users, method, corrections, changelog, cite, press (M, high)
- **Audit refs:** T1, G1 (guide metadata "(anonymous)"), H10. **Depends:** none (hand-written HTML is fine on the legacy stack). **Moves:** trust signals for quality raters and AI systems; honest positioning against a 430,000-placement paid competitor.
- **Evidence:** G19 (sources exist only in JSON metadata); `deploy:terms.html` promises "Where the underlying source data disagrees with itself, this site notes the discrepancy" but no page lists any; JSON-LD names an author (`Mike Legere`) with no bio or page (`deploy:index.html:35`); copy overclaims ("minute-by-minute", "467 regiments and batteries", "primary-source unit records", G16) while the placements are modeled and sparse (G17); competitor claim for scale: 430,000+ positioned units, 2,400+ components, 8,000 references, 54 hours [V via the Savas Beatie page].
- **Fix (all pages static, linked from every footer):**

  | Page | Contents |
  |---|---|
  | `/about` | who builds this and why (owner supplies real facts; do not invent credentials); no ads/no login/free; independence line ("not affiliated with NPS, ABT or any publisher"); contact; the reviewers (below); how the project is funded |
  | `/sources` | full bibliography: the 29 sources already named in `data/` (OR Vol. 27; Busey and Martin 1994; Pfanz First Day / Second Day / Culp's Hill and Cemetery Hill; Hessler and Motts; Desjardin; Wert; Alexander; Gottfried; Wittenberg; Coddington; Moe; Dawes; Oates; Hartwig; Hessler; Longacre; Sears; Desjardin map; Laino; USGS) [V list], mapped to which data each supports |
  | `/method` | how ticks, positions and counts are made: 675 five-minute ticks; positions are **modeled** (interpolated between documented keyframes); 152 units carry keyframes (23 regiments own; 96 brigades stand in for 422 regiments) [G17]; how casualties are apportioned (`casualty_apportionment.json`); what "documented vs modeled" labels mean; known limits; how disagreements are handled |
  | `/corrections` | policy (acknowledge within 5 business days, fix with a dated log line citing the source), a log table, a "Report a correction" mailto with the subject prefilled with the page URL |
  | `/changelog` | dated entries (data version numbers, features); feeds `dateModified` honestly |
  | `/cite` (and a "Cite this page" box on every content page) | APA/MLA/Chicago strings with author, title, site, date, URL, access date; supports student use and citation links |
  | `/press` | 3-sentence description, key facts, logo/screenshots (real), contact, embed instructions |

  - Copy repairs everywhere (title, description, `#seo-content`, JSON-LD, manifest): "five-minute steps", "modeled positions", counts from `unit_counts` (466 regiments + 103 batteries), no "AI-style" wording (H8).
  - **Reviewer programme:** invite 2-3 volunteers (a Licensed Battlefield Guide, a Civil War Round Table member/historian, a teacher) to read a page set and be named ("Reviewed by ..., date") with consent; JSON-LD `reviewedBy`. Ask for reviews of the 24 moments and 9 turning points first.
  - Show "Modeled" vs "Documented" chips on unit positions (app and pages); this also answers the honesty gap versus the paid competitor.
  - Guide PDF (G1): fill title/author/date metadata (currently "(anonymous)"), add version/date to the footer.
- **Acceptance:** all seven pages live and linked in raw-HTML footers; `/sources` names every source in `data/**/metadata.sources`; a grep for "minute-by-minute" and "467 regiments" returns nothing; About names a real person and a real contact; Corrections has at least one dated entry within 30 days (seed it with the counts fix).

### seo-growth-26 - Open dataset with a licence, a DOI and honest terms (M-L, medium; decision Q2)
- **Audit refs:** T1, X5-adjacent. **Depends:** 14 (provenance), 25, prov-recon-37 (`data/v2` schemas). **Moves:** citations, Dataset Search eligibility, backlinks from data journalists, academics, Kaggle/GitHub.
- **Evidence:** `deploy:terms.html` says "Please don't scrape the underlying data files for republication as your own dataset" yet the same files are public under `/data/*.json` (`Cache-Control: public, max-age=3600`); Google's Dataset guidance requires only `name` + `description` (50-5000 chars) and recommends `license`, `identifier` (DOI), `distribution` (DataDownload), `temporalCoverage`, `spatialCoverage`, `creator` (ORCID/ROR) [V]; the only "interactive" order-of-battle tools I found on the web were an RPubs map and a Shiny table [V via search summary], so a free, citable, documented dataset would be genuinely new.
- **Fix:** after provenance is settled (Q3) and the licence decision is made (Q2): publish `/data` (landing) with what is included (units, commanders, casualties, modeled positions, chronology, places; not the narrative vignettes, which stay "quote with credit" unless the owner chooses otherwise), a licence (recommend CC BY 4.0 for facts and compiled tables; a separate licence line for text), `v1.0.0` files (JSON + CSV, hashed under `/data/v2/`), a `CITATION.cff`, a Zenodo deposit for a DOI, and the `Dataset` JSON-LD (sample validated, Appendix B). Update Terms to match (allow reuse with attribution; keep the ban on hammering endpoints; drop the scraping sentence), and add `Disallow: /data/` for training crawlers only (seo-growth-06) as a courtesy signal.
- **Acceptance:** Rich Results Test recognises `Dataset`; DOI resolves; `/data` lists licence and version; Terms and robots agree with the licence; GitHub/Kaggle mirrors (optional) link back to the canonical page.

### seo-growth-27 - AI-search and answer-engine visibility (S-M, medium)
- **Audit refs:** T1. **Depends:** 06, 09, 13, 23. **Moves:** chatgpt.com/Perplexity/Copilot/Claude referrals (14 ChatGPT visits in 30 days today), citation accuracy.
- **Evidence:** Vercel/MERJ (Dec 2024): GPTBot and ClaudeBot fetch JS files but do not execute them [V via summary; re-verify, it is a dated study]; ChatGPT search uses `OAI-SearchBot` and inclusion requires not blocking it [V, OpenAI docs]; Anthropic runs ClaudeBot (training), Claude-User (user fetch) and Claude-SearchBot (search) with separate robots tokens [V via summaries]; 26 of 27 current HTML files carry no server-rendered prose worth quoting (G18).
- **Fix:** (a) everything a model should quote is in raw HTML (seo-growth-09/13); (b) an answer-first paragraph at the top of each entity page (40-60 words, plain sentences, unit/place/date/number/source in the sentence); (c) consistent entity names and the same numbers everywhere (`unit_counts`); (d) `dateModified` and a visible "Last reviewed" line; (e) sources cited inline so engines that show citations can attribute; (f) no `nosnippet`/`max-snippet:0`; (g) allow the search/answer bots in `robots.txt` (06); (h) monitor referrers `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `claude.ai`, `gemini.google.com` in analytics (35) and run a monthly prompt check (10 questions typed into each assistant; record whether the site is cited and whether the citation is accurate); (i) Bing indexing (01) matters because ChatGPT search partially relies on Bing results [U].
- **Acceptance:** the monthly prompt log shows the site cited for >= 3 of 10 questions by day 90; AI referrers >= 50/30 d; zero misquotes attributable to ambiguous copy (fix the copy if any appear).

### seo-growth-28 - Keyword and intent map with a measurement method that does not need paid tools (M, medium)
- **Audit refs:** T1. **Depends:** 01 (GSC/Bing data after week 4). **Moves:** page-to-query fit, prioritisation of Tier-B units, title tuning.
- **Evidence:** I had no access to Ahrefs/Semrush/Google Ads volumes, so the map in section 5 is built from SERP checks (WebSearch is US-only and its results are model-summarised, so rank order is directional, not a rank tracker) and from the site's own data. No search-volume number in this plan should be treated as measured.
- **Fix (method):** (1) week 0-4: use the section 5 map as the hypothesis; (2) from day 28 export GSC queries (page x query x country x device), Bing keyword data and Bing's own keyword research tool; (3) score each candidate query `priority = intent fit (0-3) x winnability (0-3) x page readiness (0-3)`, where winnability is 0 if the top results are Wikipedia/ABT/NPS, 1 if a paid or institutional site, 2 if forums/essays, 3 if no strong answer; (4) check People Also Ask and autocomplete manually for the 30 top queries once a month and add questions to the Q&A hub (23); (5) use Google Trends manually to time content (seasonality is expected around July 1-3, the Nov 19 Address anniversary and the school year [U]); (6) never write a page for a query the site cannot answer better than the current top result; (7) monthly: re-rank the map and log changes in `docs/keyword-map.csv`.
- **Acceptance:** `docs/keyword-map.csv` exists with >= 60 rows, each mapped to a target URL, owner-approved by day 14, re-scored on day 30 with real GSC/Bing data.

### seo-growth-29 - Competitive positioning: what to copy, what to avoid, what to own (S-M, medium)
- **Audit refs:** T1, E2. **Depends:** none. **Moves:** differentiation, messaging in title/description/About, outreach angles.
- **Evidence:** section 6 (nine competitors reviewed in this session). Summary: the field is video (ABT 16:51 animated map; YouTube; Tubi/Apple TV), a paid app with 430,000+ positions, thick single-author reference sites (Stone Sentinels), authority hubs (NPS, Wikipedia, ABT, Smithsonian 2013), forum threads (CivilWarTalk) and hobbyist data apps (RPubs, Shiny).
- **Fix:** adopt this positioning statement everywhere (home hero, About, press kit, outreach): "**The free, no-login, linkable map of Gettysburg for classrooms and family historians: every regiment and battery, in five-minute steps, with the sources on the page.**" Do not compete on granularity with the paid app (152 units carry keyframes versus its 430,000+ placements [V]); compete on: free and instant on any device, deep links and embeds, ancestor finder, classroom kit, open data, "modeled vs documented" honesty, sources visible. Do not claim to be "minute-by-minute" or "the most accurate". Keep "animated" as a body word, never the brand (seo-growth-04).
- **Acceptance:** the statement (<= 30 words) appears in About, home hero and press page; monthly manual SERP log for 30 tracked queries (who ranks, where the site ranks) exists by day 30.

### seo-growth-30 - Backlink and outreach programme (L, high; ongoing)
- **Audit refs:** T1. **Depends:** 02 (valid share cards), 25 (About/Sources), 31 (kit), 26 (dataset), 20 (ancestor pages), 15 (moments). **Moves:** referring domains (baseline unmeasured until 01), authority, referral traffic from teacher lists, round tables and genealogy pages.
- **Evidence:** domain is 3.5 months old (G1); no inbound-link data yet [U]; ABT reports 1,928 educators added its animated map to Google Classroom [V], so teacher channels are real. Targets below were found in this session's searches (URLs in the Sources list) unless marked with a dagger, which means "from general knowledge: verify existence and contact route before writing". I did not contact anyone.
- **Fix:** three rules first: no paid links, no exchanges at scale, no automated blasting; disclose that you built the site when posting; one personal email per target with one follow-up. Then the programme:

  | Segment | Named targets (verified to exist in searches) | Ask | Lead asset | Wave |
  |---|---|---|---|---|
  | Teacher-resource curators | Teaching the Civil War "Virtual Field Trips" list; Lesson Planet Gettysburg listings; YMI Classroom Gettysburg lesson page; homeschool lesson pages (TheHomeSchoolMom Battle of Gettysburg); Dickinson College "House Divided" Gettysburg Virtual Tour page (related resources); ABT educator pages ("Battlefields Educators"); NPS "Gettysburg For Teachers" (education staff, not an endorsement request) | list the classroom kit as a free third-party resource | `/learn` + kit | 1 |
  | Library research guides | Marine Corps University research guide "Maps - Battle Studies: Gettysburg" (libguides); university library guides on the Civil War | add the map/dataset as a resource | `/data`, `/units`, `/sources` | 2 |
  | Round tables and speakers | Civil War Round Table Congress (speaker registry, resources); Civil War Seminars round-table directory (hundreds of CWRTs by state); Emerging Civil War ("At the Lectern", speakers schedule); Seminary Ridge Museum events series; Gettysburg College Civil War Institute†; Gettysburg Foundation†; Adams County Historical Society (named as a partner in ABT's virtual field trip) | offer a free 20-minute "the battle in five-minute steps" virtual talk; newsletter mention | moments + map | 1-2 |
  | Genealogy | FamilySearch Research Wiki page "Civil War Battles, Gettysburg" (editable wiki; disclose your connection and add only if neutral); Family Tree Magazine "7 Steps to Trace Gettysburg Ancestors" (editor: suggest the regiment tool as a step); ABT "Ancestor Research Guide" and NPS ancestor page (contact forms); state/county genealogical societies and USGenWeb pages for the 17 states | add the state page as "find the regiment" | `/ancestors/*` | 2 |
  | Communities | CivilWarTalk forum (has "Interactive Order of Battle" and "Hourly timeline of Gettysburg" threads; returns 403 to fetchers so read its rules by hand); r/CivilWar, r/Genealogy, r/dataisbeautiful (OC rules), r/MapPorn; Hacker News Show HN (only for the open-data release or a July anniversary launch) | genuine participation first; post a specific finding (e.g., loss-rate ranking) not a plug | data story | 3 |
  | Local tourism/press | Destination Gettysburg† / Adams County visitor resources†; Gettysburg Times (appeared in results); PennLive† / Evening Sun†; B&B and museum "plan your visit" pages† | pre-visit study tool; anniversary story | press page | 3 and Jun 2027 |
  | Dataset/dev channels (only after licence) | GitHub topics†, Kaggle†, Data Is Plural newsletter†, Observable†, Mapbox community showcase†, Zenodo record† | citations, mentions | `/data` | 3 |
  | Wikipedia | Do not add links yourself (WP:ADV advises against linking a site you own, and links are nofollow; "Google and other search engines ignore links on Wikipedia" [V, fetched]); the only legitimate route is a talk-page suggestion if the dataset is openly licensed and the site is used as a source | none now | | - |

  Linkable assets in impact order: (1) open dataset + DOI, (2) classroom kit, (3) state and unit pages, (4) embed builder with a text-link snippet, (5) data stories built from the dataset ("The ten bloodiest regiments at Gettysburg by loss rate", each row sourced, methodology stated), (6) press kit, (7) OG map art under an open licence. Email templates: Appendix G.
- **Acceptance / KPIs:** 60 personalised emails sent by day 90; >= 15 positive replies; >= 20 new referring domains (from a GSC/Bing baseline taken in week 0), of which >= 8 are .edu/.gov/.org; a tracking sheet (target, date, ask, response, live link URL, rel attribute).

### seo-growth-31 - Classroom kit at `/learn` (L, high)
- **Audit refs:** T1, G1. **Depends:** 25 (cite), 13, 15, 17, 20, pagesB-21 (Students page is not written for students), pagesB-23, app-a11y (accessible PDFs). **Moves:** teacher discovery, backlinks from resource lists, "Students" queries, Google Classroom shares.
- **Evidence:** `deploy:education.html` (49 static words; content fetched); competitors' educator material: ABT (educator PDF with student questions, Google Classroom share, lesson plans, virtual field trip), NPS Gettysburg for Teachers, Dickinson (nine handouts, free for non-commercial educational use [V]); SERP for the student/classroom query is LessonPlanet, ABT lesson plans, homeschool blogs, ERIC, YMI [V]. Google documents a plain share URL `https://classroom.google.com/share?url={url}` with `title`, `body`, `itemtype` (announcement/assignment/material/question) and `courseid` parameters [V], so no third-party script is required.
- **Fix:** `/learn` hub plus:
  1. **Six lesson plans** (each a static page + accessible PDF): L1 "The Battle in 60 Minutes" (grades 6-8, uses 6 moments); L2 "Reading a Battle Map" (scale, elevation, orientation, time slices; worksheet); L3 "Decisions at Gettysburg" (document-based question on the 9 turning points, grades 9-12, two periods); L4 "The Numbers of War" (strength/casualties/loss rates, ratio and percent practice, grades 8-10, uses the dashboard data); L5 "Find a Regiment" (inquiry mini-project using state pages and NPS CWSS, grades 6-12); L6 "Primary Sources on the Field" (Dawes/Oates/OR excerpts, sourcing and corroboration, grades 9-12). Each: objective, time, materials, steps, discussion questions, answer key, differentiation (reading-level notes), assessment rubric.
  2. **Printables:** timeline poster, map worksheet, blank order-of-battle chart, vocabulary cards, QR cards that open a specific moment (`/map?tick=...` deep links; QR generated client-side, no third-party service).
  3. **Standards table:** C3 Framework Dimension 2 (History) indicators and Common Core ELA-Literacy RH.6-8.7 / RH.9-10.7 (integrating visual information such as maps) plus a column for the owner's state; verify each code against the current standards text before publishing [U].
  4. **Adoption plumbing:** "Share to Google Classroom" link on every lesson (plain URL form above), "Copy link", printable one-page teacher summary.
  5. `/learn/it-admins`: the exact domains a school firewall must allow, taken from the CSP allow-list (`netlify.toml`): `gettysburginteractivemap.com`, `api.mapbox.com`, `events.mapbox.com`, `*.tiles.mapbox.com`, `www.google.com` (Street View frames), `0.peerjs.com` (Watch Together only), Netlify RUM host `ingesteer.services-prod.nsvcs.net` (from the audit; only if RUM stays on), plus "needs WebGL", "no accounts", "no cookies of our own".
  6. `/learn/student-privacy`: plain statement of what is and is not collected (nothing personal; cookieless counts; see 35); owner to review wording (not legal advice).
  7. Licence for lesson materials (recommend CC BY 4.0 so resource sites can host copies with attribution); content note for graphic subject matter; reading-level targets and alt text on all figures.
  8. `/education` becomes a short student-facing overview that links to the kit and 301s or merges (seo-growth-05).
- **Acceptance:** 6 lessons + 4 printables + standards table live; every PDF passes an accessibility check (tagged, reading order, alt text); Classroom share link opens the share dialog with the lesson title prefilled; `/learn/it-admins` matches the enforced CSP; >= 3 teacher-resource listings and >= 10 Classroom-share clicks within 90 days (35).

### seo-growth-32 - Embeds, share links, citation and print: mechanics that earn links (M, medium)
- **Audit refs:** X4 (embed headers), T1. **Depends:** 25, 03, prov-recon-36 (embed header fix). **Moves:** backlinks (text link in snippet), share CTR, student citations.
- **Evidence:** `deploy:embed.html` is a small text card with a CTA to `/index.html?tick=...` (dead deep link: G23) and a brand link, `noindex`; it currently receives both `X-Frame-Options: DENY` and `frame-ancestors *` (X4); the Terms invite embedding "its widget" but there is no builder or snippet. Links **inside** an iframe live in our own document and do not create a link from the embedding page.
- **Fix:** (1) `/embed` builder: pick a moment/unit/place, copy a snippet that contains the iframe **and** a visible text attribution link outside it:
  ```html
  <iframe src="https://gettysburginteractivemap.com/embed/moment/chamberlains-charge" title="Chamberlain's Charge - Gettysburg Interactive Map" width="480" height="320" loading="lazy" style="border:0"></iframe>
  <p>Source: <a href="https://gettysburginteractivemap.com/moments/chamberlains-charge?utm_source=embed&amp;utm_medium=referral">Gettysburg Interactive Map</a></p>
  ```
  (2) `/embed/*` responses carry only `Content-Security-Policy: frame-ancestors *` (no `X-Frame-Options`) and `X-Robots-Tag: noindex`; content <= 10 KB, no third-party requests, brand line and CTA inside; (3) oEmbed: `/oembed?url=` returns `type: rich` JSON and pages carry `<link rel="alternate" type="application/json+oembed" ...>` so editors that support discovery can auto-embed (WordPress core only auto-embeds allow-listed providers [U]); (4) app "Share" uses the Web Share API on mobile and copies canonical URLs with `?ref=share` (stripped on load); (5) "Cite this page" (25); (6) print stylesheet on every content page (no nav, sources visible, URLs expanded); (7) update Terms to describe allowed embedding.
- **Acceptance:** the snippet renders on a cross-origin test page; `curl -I /embed/moment/x` shows no `X-Frame-Options`; oEmbed JSON validates against the oEmbed spec; the text link appears in the snippet and carries UTM.

### seo-growth-33 - Video: a YouTube channel built from Cinematic Export (L, medium; phase 3-4)
- **Audit refs:** T1. **Depends:** 15, 25, cinematic-export quality check (audit: Cinematic Export recording was **not tested**). **Moves:** video SERP carousels, brand queries, referral traffic, embeds on moment pages.
- **Evidence:** "animated" queries are answered by video: ABT (16:51 map video), a YouTube channel "Gettysburg - Fully Animated", Tubi and Apple TV listings, an article "This animated map shows Gettysburg in a whole new way" [V]; the site already ships `cinematic-export.html` ("export a narrated flyover video, right from your browser").
- **Fix:** test Cinematic Export output on 3 moments (resolution, frame pacing, audio); create the channel "Gettysburg Interactive Map"; publish 10 short videos (45-90 s, one per major moment) and 3 day overviews (5-8 min) using only the site's own visuals and original or licensed narration; captions (SRT), chapters, description with the canonical page link (UTM), playlists Day 1/2/3; add `VideoObject` JSON-LD (`uploadDate`, `thumbnailUrl`, `embedUrl`) on the moment page; embed with a click-to-load facade (youtube-nocookie) to avoid third-party weight and disclose in the privacy policy; add the channel URL to the Organization/Person `sameAs`.
- **Acceptance:** 10 videos live with captions; each moment page has a facade embed and valid VideoObject; channel links to the site in every description; 2,000 combined views in the first 90 days is a stretch goal (no baseline).

### seo-growth-34 - Editorial calendar, content operations and copy standards (M, medium)
- **Audit refs:** H7, H10, T1. **Depends:** pagesB-10 (dev-copy lint), 13. **Moves:** consistency, publishing rhythm tied to demand peaks, prevention of dev-log copy reaching users.
- **Evidence:** dev-log copy in user-facing text (audit H7, three data notes in G20); counts vary across pages (G16); a solo owner.
- **Fix:** (1) **Calendar** (dates to verify before committing): Nov 19 (Gettysburg Address anniversary; Gettysburg's Remembrance Day observance is held on the Saturday nearest Nov 19 [U: confirm the 2026 date]) so ship the upgraded Aftermath/Address content 3 weeks before; Nov 11 (Veterans Day) and Memorial Day for veteran/genealogy hooks; Sep-Nov and Jan-Mar for teacher unit planning and round-table programme booking [U]; June 26-July 3 2027 (164th anniversary; battle days July 1-3) is the annual peak: everything (press kit, embeds, kit, video) must be live by June 1; June 13 2027 domain renewal (seo-growth-07). (2) **Workflow:** content as Markdown/JSON in git; a PR template checklist (sources present, gate passes, dev-copy lint clean, counts from `unit_counts`, times from `TimeModel`, alt text, no unverified URL); one reviewer for every Tier-A page; monthly refresh sweep; every user-visible change adds a changelog line. (3) **Style guide** (one page): voice = museum-grade plain prose; numbers only from `unit_counts`/data; naming = "Gettysburg Interactive Map"; time format "July 2, 1863, about 4:30 PM"; hedge words for uncertain items ("about", "accounts differ"); no "AI-style", no "tick N" in prose, no ids ("U-I-1-1") in prose; state names spelled out. (4) **Dev-copy lint** (regexes): `/Earlier drafts|we haven't been able|alias for U-|Commander unrecorded|undefined|TODO|FIXME|subject of a Gettysburg|YouTube vignette|Tick \d+/i` fails CI on any content page.
- **Acceptance:** calendar committed to `docs/editorial-calendar.md` through July 2027; PR template and lint in CI; zero lint hits across all generated pages.

### seo-growth-35 - Privacy-respecting analytics, event taxonomy and goals; policy update (M, medium)
- **Audit refs:** T1, T2, X5. **Depends:** none (choose vendor first). **Moves:** the ability to see anything about behaviour; honest privacy page.
- **Evidence:** G21. Netlify Web Analytics (PDF: pageviews, uniques, top pages, sources, locations, 404s, bandwidth; "Log Drains" only via sales) is log-based with no events or user-agent breakdown; Netlify RUM is JS-based and covers only Web Vitals; `privacy.html` says "no third-party analytics beyond the performance monitoring" and does not mention Web Analytics.
- **Fix:**
  1. **Vendor choice (Q6).** Options: (a) Netlify Web Analytics only (no events, includes bots); (b) a cookieless hosted counter served through a **first-party path** on Netlify (rewrite `/a/*` to the vendor) so no third-party origin appears and ad-blocker loss shrinks: Plausible (paid), GoatCounter (free for non-commercial), Umami Cloud (free tier) [vendor features to re-verify at purchase [U]]; (c) a self-built Netlify Edge Function that increments daily counters in Netlify Blobs by page class and country (no IP or full user agent stored). Recommendation: (b) plus keep Netlify Web Analytics as the server-side cross-check (the gap between them is the bot/no-JS estimate, seo-growth-36).
  2. **Event taxonomy** (Appendix E): `map_launch`, `play`, `unit_open`, `vignette_open`, `search_used` (boolean and result-count bucket, **never the query text**), `ancestor_lookup` (state only, **never a surname**), `share_copy`, `embed_load` (referrer host only), `kit_download`, `classroom_share_click`, `outbound_click` (destination host), `cite_copy`, `correction_click`, `historian_feedback` (thumbs up/down count; a bad answer is reported by the user via mailto with the question prefilled by them).
  3. **Goals:** map launch from landing >= 45%; engaged session (>= 30 s active or >= 2 events) >= 55%; state page to unit link click >= 25%; kit download; outbound to NPS CWSS (a healthy sign); embed loads.
  4. **Privacy behaviour:** honour Global Privacy Control and Do Not Track (`navigator.globalPrivacyControl`, `navigator.doNotTrack`): send nothing; no cookies; no `localStorage` identifiers for analytics; owner-traffic exclusion via a local flag; retention statement.
  5. **Policy updates** (privacy.html and terms.html): add Netlify Web Analytics (server logs, aggregated), the chosen vendor, the event list in plain words, Mapbox telemetry and PeerJS (X5), student-privacy note, contact; update `Last updated`. CSP `connect-src` stays `'self'` if proxied.
  6. **UTM policy:** every owned outbound link is tagged (`utm_source`, `utm_medium`, `utm_campaign`), stripped by `history.replaceState` after the counter reads them.
- **Acceptance:** dashboards show pageviews, events and referrers within 24 h of launch; a network capture of a full session shows no request to a third-party origin and no personal fields in payloads; GPC-on test sends no events; privacy page diff reviewed and dated.

### seo-growth-36 - Bot-traffic segmentation protocol for Netlify analytics (S-M, medium)
- **Audit refs:** T2. **Depends:** 35 (for comparison data). **Moves:** trustworthy baselines and KPI denominators.
- **Evidence:** G7, section 2.2. The Netlify UI offers no user-agent breakdown; Log Drains require contacting sales (PDF).
- **Fix (in order; each step is cheap):**
  1. **E1 classification probe:** with `curl`, request `/documentary` 5 times with the default UA and 5 times with a spoofed crawler UA from one IP; after the next hourly update compare the pageview delta. If both count, Netlify Analytics includes non-JS/bot requests and its "pageviews" are an upper bound.
  2. **E2 ratio:** daily Netlify PV divided by the cookieless counter's daily PV (and by RUM sample counts): a persistent ratio > 1.3 estimates the non-human/no-JS share; record weekly.
  3. **E3 country cut:** in Netlify, filter by Germany, China, Singapore and Hong Kong (if the UI allows row filtering [U]) and note pages: bots typically touch one URL once; people traverse 2+ pages.
  4. **E4 fingerprint:** direct + non-US + single page + no events = bot-like; publish the rule in the KPI notes.
  5. **E5 optional edge counter:** a Netlify Edge Function on `/` and `/map` increments daily counters by (country, UA class = browser/known-bot/tool/unknown, `Sec-Fetch-Dest: document` present or not) into Netlify Blobs; store no IP and no full user agent. `Sec-Fetch-*` headers are sent by real browsers but not by most simple bots (they can be spoofed, so treat as a heuristic).
  6. **Do not geo-block or add a WAF now:** bandwidth is 328 MB/month; blocking risks legitimate crawlers and users abroad. Revisit only if bandwidth grows 10x.
  7. Separate "Resources not found" scanner noise from the KPI set; keep the existing scanner 404 rules (`netlify.toml`).
- **Acceptance:** by day 14 a note `docs/traffic-quality.md` states the measured human-share estimate with method; every KPI in seo-growth-38 says whether it uses human-adjusted or raw numbers.

### seo-growth-37 - Monitoring, CI checks and weekly/monthly routines (M, medium)
- **Audit refs:** T1, T3, E5. **Depends:** 01, 13, prov-recon-38 (CI). **Moves:** regressions are caught before Google sees them.
- **Fix:** **CI (on every deploy):** canonical present, absolute, self-consistent; redirect matrix (Appendix D); og images decode, 1200x630, <= 200 KB, non-uniform; JSON-LD validates; sitemap parity (every indexable page in a sitemap, no `noindex` page in a sitemap, no redirected/404 URL); internal link check (no broken, no redirected targets); title <= 60 and description 120-155, unique; exactly one h1; gate report; dev-copy and count lints; robots matrix; Lighthouse CI on one page per template; alt text present; no `Disallow` on CSS/JS. **Post-deploy:** IndexNow ping for changed URLs; smoke `curl` set; uptime monitor (free tier) on `/`, `/map`, `/sitemap.xml`, `/robots.txt`. **Weekly (15 min, Monday):** GSC Performance (7 vs prior 7), Pages report new reasons, Sitemaps status, Crawl stats (response codes, file types, purpose), Bing Performance/Inbound links, Netlify Analytics top pages/sources/404s, analytics goals, AI referrers. **Monthly:** KPI sheet, SERP log for 30 queries, prompt check on AI assistants, backlink review (new/lost), content refresh list, changelog review. **Alerts:** GSC email (coverage, manual actions, security), Netlify deploy failure, uptime alert, sitemap fetch error, 404 rate > 2x baseline.
- **What to read in GSC (definitions to avoid misreading):** "Crawled - currently not indexed" = quality/thin signal (pause rule in 13); "Discovered - currently not indexed" = crawl scheduling (add internal links); "Duplicate, Google chose different canonical" = canonical conflict (03); "Alternate page with proper canonical" = expected for parameter/netlify.app variants; "Soft 404" = pages that look empty when rendered (fix static content); Enhancements: Breadcrumbs, Dataset, Article/Video; Crawl stats: watch Googlebot fetch counts of `/data/*.json` to see rendering dependence on JSON.
- **Acceptance:** CI job named `seo` fails the build on any violation above; `docs/seo-runbook.md` contains the weekly/monthly checklist; first weekly review logged in week 1.

### seo-growth-38 - KPI dashboard, phase gates and risk register (M, high)
- **Audit refs:** T1-T3. **Depends:** 01, 35, 36. **Moves:** turns the plan into managed outcomes; see section 8.
- **Fix:** one sheet (`docs/kpi.xlsx` or a Google Sheet) with weekly rows and the KPIs in section 8.2; each KPI states source, definition, human-adjusted or raw, baseline, targets at day 30/60/90/180/365; phase gates in 8.1 (release only if the gate passes); risk register in 8.3 reviewed weekly.
- **Acceptance:** the sheet exists with week-0 baselines filled from Netlify PDFs (3,389 PV, 1,529 UV, referrals 2,221, search engines 173, ChatGPT 14) and GSC/Bing values after verification; weekly rows are filled for 12 consecutive weeks.

---

## 4. Cross-cutting specifications

### 4.1 URL taxonomy, counts and tiers

All URLs extensionless, lowercase, hyphenated, no trailing slash, absolute canonical on `https://gettysburginteractivemap.com`. Counts are from the data as measured (unit total 466 + 103 batteries; 101 brigade ids; 31 divisions; 11 corps plus cavalry/artillery groupings).

| Section | URL pattern | Count | Tier | Source data | Blocked on |
|---|---|---|---|---|---|
| Landing | `/` | 1 | A | new copy | 09 |
| App | `/map` | 1 | noindex,follow, not in sitemap | app | 09 |
| Moments | `/moments`, `/moments/{slug}` | 1 + 24 | A | vignettes | vignette schema v2 |
| Turning points | `/turning-points`, `/turning-points/{slug}` | 1 + 9 | A | turning-points.html POINTS | tick fix |
| Battle by day | `/battle/july-N`, `/battle/july-N/{part}` | 3 + about 13 | A | chronology, placements | app-time-02..05 |
| Order of battle | `/units`, `/units/union`, `/units/confederate`; corps/division/brigade slugs | 3 + about 13 + 31 + 101 | A (brigade gated) | OOB | pagesB-53 (VI Corps records) |
| Regiments/batteries | `/units/{designation-slug}` | 60 (day 90) to 180 | B | OOB + excerpts | 14 |
| Places | `/places`, `/places/{slug}` | 1 + 30 | A | terrain + monuments | pagesB-35 |
| Commanders | `/commanders`, `/commanders/{slug}` | 1 + about 40 | A | OOB + successions | 17 |
| Ancestors | `/ancestors`, `/ancestors/{state}` (17), `/ancestors/regular-army`, `/ancestors/other-states`, the guide | 21 | A | OOB by state | none |
| Monuments | `/monuments`, `/monuments/{group}` | 1 + 13 | A | 512 monuments with sources | prov-recon-27 |
| Learn | `/learn`, `/learn/{lesson}` (6), `/learn/it-admins`, `/learn/student-privacy`, teacher guide | about 10 | A | authored | none |
| Trust | `/about /sources /method /corrections /changelog /cite /press /data` | 8 | A | authored | none |
| Questions | `/questions`, `/questions/{slug}` | 1 + 60 | B (phase 4) | authored | 14 |
| Legacy tools | `/documentary /dashboard /compare /camera /sandbox /viewshed /ground-remembers /living-ledger /immersive /ar /watch-together /cinematic-export /regiment /report /historian` | about 15 | index only if >= 150 words, else noindex,follow | existing | 05 |
| Legal | `/privacy`, `/terms` | 2 | index, low priority | existing | |

Total: about 340 Tier-A URLs, plus 60-180 Tier-B and 61 Q&A, i.e. about 460-580 by the end of phase 4 (units without their own page live as anchors on brigade pages).

Slug rules: designation-based (`20th-maine-infantry`, `2nd-maine-battery`), `-usa`/`-csa` suffix only on a same-designation collision; punctuation stripped; `slugs.lock.json` append-only; alias records never get pages (redirect to the target); `/u/{unit_id}` short links 301.

### 4.2 Thin-content gate (thresholds)

| Template | Min unique words | Min distinct facts | Extra requirements |
|---|---|---|---|
| moment | 400 | 8 | sources[] >= 1; answer-first block; own lead |
| part-of-day | 500 | 10 | times from TimeModel |
| place | 250 | 6 | verified elevation; >= 1 nearby monument or unit |
| corps / division | 200 | 6 | children listed |
| brigade | 250 | 8 | own keyframes or an honest "no keyframes" line |
| regiment / battery (Tier B) | 250 | 8 | >= 1 approved primary-source excerpt |
| commander | 200 | 6 | every claim sourced |
| state | 400 | 10 | checked archive links |
| turning point | 400 | 6 | >= 2 cited sources |
| monument group | 300 words excluding the table | table + provenance line | 100% rows with `src` |
| lesson | 600 | | answer key |
| guide | 1,500 | | outbound authority links |
| Q&A | 250 | 4 | citation |

Common: boilerplate ratio <= 0.35; max 5-gram Jaccard similarity to any of 25 siblings < 0.5; zero dev-copy lint hits; unique `<title>` and description; exactly one h1; JSON-LD valid. "Unique words" excludes nav, footer, template headings and any shingle appearing on >= 50 sibling pages. Pseudo-code in Appendix C.

### 4.3 Template blueprints (what every page must contain)

| Template | H1 | Required blocks (in order) | Unique element that competitors lack |
|---|---|---|---|
| Moment | vignette title | answer-first 40-60 words; narrative; who was there; the ground (SVG); around this hour; debate link; sources; map CTA; prev/next; cite | positions + map link at the exact tick; linked unit graph |
| Day / part-of-day | "July 2, 1863, 4-7 PM at Gettysburg" | intro; timeline; where the corps were (table); casualty chart (SVG); moments; places; sources | positions table per time slice |
| Brigade | "{Nickname} at Gettysburg" | answer-first; commander + succession; numbers; regiments table; track mini-map; moments; monuments; excerpt; sources | brigade track from real keyframes; computed ranks |
| Regiment / battery | "{Designation} at Gettysburg" | answer-first; numbers and ranks; action; position (honest label); monuments; excerpts; sources; cite | computed comparisons; source excerpts |
| Place | "{Place}, Gettysburg" | answer-first; what happened; who fought; monuments nearby; elevation; mini-map; sources | neighbour graph computed from data |
| State | "{State} Regiments at Gettysburg" | intro; table; map; how to trace; FAQ; outbound links | regiment table with losses/rates; linked map |
| Commander | "{Rank} {Name} at Gettysburg" | chain of command; fate; succession; moments; units; monument; excerpts | tied to units/moments |
| Turning point | title | what; debate; who/where; map/time; sources | linked moment + positions |
| Lesson | title | objective; steps; materials; key; standards; share link | free, standards-aligned, map-based |
| Q&A | the question | answer-first; explanation; sources; related | consistent with the Historian gold set |

### 4.4 Title and description patterns (lengths checked in Python [V])

Pattern: `{Specific keywords} | Gettysburg Interactive Map`, drop the brand suffix whenever the total would exceed 60; description 120-155 characters, one benefit, one number, no clickbait, unique per page, generated from data fields.

| Page | Title (chars) |
|---|---|
| Home | Gettysburg Interactive Map: The Battle in Five-Minute Steps (59) |
| Moments hub | 24 Key Moments of the Battle of Gettysburg \| Interactive Map (60) |
| Moment | Chamberlain's Charge, Little Round Top: July 2, 1863 (52) |
| Order of battle | Gettysburg Order of Battle: Every Regiment and Battery (54) |
| Brigade | Iron Brigade at Gettysburg: Regiments, Losses and Map (53) |
| Regiment | 20th Maine at Gettysburg: Position, Losses and Commander (56) |
| State | Pennsylvania Regiments at Gettysburg: Find Your Ancestor (56) |
| Guide | Find Your Civil War Ancestor at Gettysburg: Step-by-Step (56) |
| Place | Little Round Top, Gettysburg: What Happened and Who Fought (58) |
| Part of day | July 2, 1863, 4-7 PM at Gettysburg: Timeline and Map (52) |
| Commander | Gen. John F. Reynolds at Gettysburg: Command and Fate (53) |
| Monuments | Gettysburg Monuments: Pennsylvania (122 Memorials) (50) |
| Turning points | Turning Points of Gettysburg: 9 Decisions Historians Debate (59) |
| Learn | Teach Gettysburg: Free Lesson Plans and Map Activities (54) |
| About | About Gettysburg Interactive Map: Author, Sources, Method (57) |
| Q&A hub | Gettysburg Questions Answered \| Interactive Map (47) |

Description examples (lengths [V]): Home 151, "What happened when the 20th Maine ran low on ammunition on Little Round Top: units, ground, timeline and sources, with a map you can open at that moment." 153, "All 66 Pennsylvania units at Gettysburg with corps, brigade, strength and losses, plus how to trace an ancestor's service record." 129. (Any number in a description must come from `unit_counts`; the "20th Maine" strength in the data is 386 with 130 casualties (33.7%) while another agent's screenshot shows 358: settle that before printing it [U].)

### 4.5 Structured data matrix

| Template | JSON-LD types | Key properties | Rich result? | Notes |
|---|---|---|---|---|
| Home | `WebSite`, `Person` (creator), `WebApplication` (+`offers` 0, `ViewAction`), `Event` (as `about`) | name/alternateName, url, `isAccessibleForFree`, `featureList`, Event `location` | none expected (Software app needs rating/review: do not fabricate) | GSC may list a Software-app warning; harmless |
| Moment / turning point / Q&A / lesson / guide | `Article` (or `LearningResource` for lessons), `BreadcrumbList` | headline, image, datePublished, dateModified, author, `about` Event, `mentions`, `citation` | Breadcrumb yes; Article no special | dateModified from git |
| Hubs | `CollectionPage` + `ItemList`, `BreadcrumbList` | itemListElement names/urls | Breadcrumb | |
| Unit / brigade / corps | `WebPage` + `mainEntity` `Organization` (`parentOrganization`, `alternateName`, `location`), `BreadcrumbList` | | Breadcrumb | no invented dates |
| Place | `Place` (`geo`, `containedInPlace`), `BreadcrumbList` | GeoCoordinates | Breadcrumb | elevation only after USGS verification |
| Commander | `Person` (`jobTitle`, `worksFor`?), `BreadcrumbList` | confirmed `sameAs` only | none | omit birth/death unless sourced |
| Data | `Dataset` (+ `DataDownload`) | license, identifier (DOI), temporal/spatialCoverage, variableMeasured | Dataset Search | sample in Appendix B |
| Video | `VideoObject` | uploadDate, thumbnailUrl, embedUrl | Video | after 33 |
| Not used | FAQPage, HowTo, Sitelinks search box, Review/AggregateRating | | not offered / not eligible (gallery checked 2026-09-29 [V]) | |

### 4.6 Content-page performance budget (feeds perf-cwv budgets)

HTML <= 35 KB raw and <= 12 KB brotli; critical CSS inline <= 10 KB, one external stylesheet <= 15 KB gzip only if needed; JS <= 15 KB total, deferred, progressive only; images: one OG-style SVG/PNG <= 60 KB above the fold, `width`/`height` set, `fetchpriority=high` on the LCP image only; fonts: system stack or one self-hosted WOFF2 <= 40 KB with `font-display: swap` and a size-matched fallback; zero third-party requests; LCP element is the h1 or the SVG; Lighthouse mobile >= 98 on one page per template; RUM p75 for these routes LCP <= 1.5 s, INP <= 100 ms, CLS <= 0.02. Because Netlify RUM p75 is site-wide, moving search entrants to these pages is also the fastest way to turn the four "Poor" badges green (see perf-cwv-18 on reading the series, not the badge).

### 4.7 Language, hreflang, translation

English only; no `hreflang`; `lang="en"` stays. Do **not** machine-translate pages to chase the German/Chinese traffic (scaled-content risk and no evidence those visits are human).

### 4.8 Header rules to add (with the redirects in 03)

`/og/*` and `/data/v2/*` (hashed names): `Cache-Control: public, max-age=31536000, immutable`; `/embed/*`: only `Content-Security-Policy: frame-ancestors *` plus `X-Robots-Tag: noindex` (remove `X-Frame-Options` for that path per X4/prov-recon-36); HTML stays `no-cache, must-revalidate` (existing); `sitemap*.xml` and `robots.txt`: `public, max-age=3600` (currently 86,400 s, which delays fixes by a day).

---

## 5. Keyword and intent map (hypotheses; volumes unmeasured)

"SERP-checked" = I ran the query through WebSearch this session; "hypothesis" = not checked. Winnability is my judgement from the incumbents (see 28 for the scoring method).

| # | Query (cluster) | Intent | Target page | Incumbents observed | Winnability | Priority |
|---|---|---|---|---|---|---|
| 1 | gettysburg interactive map | navigational / compare tools | `/` | Smithsonian 2013 feature, LoC maps, ABT maps and animated map, Savas Beatie app, a Marine Corps University LibGuide [SERP-checked] | medium (exact-match domain, "interactive" not "animated") | P1 |
| 2 | gettysburg animated map | navigational | `/` (secondary) | ABT (1st), YouTube, Tubi, Apple TV [SERP-checked] | low (video-dominated, brand collision) | P3 |
| 3 | gettysburg battle map by hour | informational | `/battle/july-2` | ABT (video/apps), Savas Beatie, YouTube [SERP-checked] | medium after time fix | P1 |
| 4 | gettysburg battle timeline hour by hour | informational | `/battle/*` | CivilWarTalk, Stone Sentinels x3, History.com, ABT, Wikipedia [SERP-checked] | low-medium | P2 |
| 5 | gettysburg july 2 4pm / little round top 4:30 pm map | informational | part-of-day pages | ABT time-slice static maps (`...-345-400-pm` slugs) [SERP-checked for Pickett] | medium | P2 |
| 6 | find my ancestor gettysburg regiment | informational/transactional | ancestor guide | NPS, Family Tree Magazine, FamilySearch wiki, ABT guide, Gettysburg Times [SERP-checked] | medium | P1 |
| 7 | pennsylvania / new york / virginia / north carolina / georgia regiments at gettysburg | informational | `/ancestors/{state}` | Wikipedia, a Gratz PA blog post, NPS state rosters [partly SERP-checked] | medium-high | P1 |
| 8 | confederate regiments at gettysburg by state | informational | `/ancestors/*`, `/units/confederate` | hypothesis | medium | P2 |
| 9 | gettysburg order of battle | informational | `/units` | Wikipedia Union and Confederate OOB, CivilWarTalk "Interactive Order of Battle", RPubs map, a Shiny app [SERP-checked] | medium | P2 |
| 10 | gettysburg regiment strength and casualties | data | `/units`, `/data` | CivilWarTalk thread on Busey and Martin, Amazon/IA/HathiTrust listings; no free database found [SERP-checked] | high (gap); legal check Q2 | P1 |
| 11 | {N}th {state} at gettysburg (400+ long-tail) | informational | Tier-B unit pages | Stone Sentinels, Wikipedia [SERP-checked pattern] | low per query, sizeable in aggregate | P2 |
| 12 | iron brigade / irish brigade / vermont brigade at gettysburg | informational | brigade pages | hypothesis | medium | P3 |
| 13 | gettysburg monuments {state} | informational | monument groups | Stone Sentinels, HMDB, Wikipedia | low | P3 |
| 14 | little round top {elevation/what happened/units} | informational | places | NPS, Wikipedia | low | P3 |
| 15 | gettysburg battle map for students / classroom | educational | `/learn` | LessonPlanet, ABT lesson plans, homeschool blogs, Smithsonian, ERIC [SERP-checked] | medium | P1 |
| 16 | gettysburg lesson plan middle/high school | educational | lesson pages | ABT, LessonPlanet, YMI [SERP-checked] | medium | P2 |
| 17 | gettysburg map worksheet printable | educational | printables | hypothesis | medium-high | P2 |
| 18 | what time did pickett's charge start | question | Q&A | ABT time-slice maps, Wikipedia, HistoryNet, LoC [SERP-checked] | low | P3 |
| 19 | who fired the first shot at gettysburg | question | Q&A | hypothesis | medium | P3 |
| 20 | ewell cemetery hill "if practicable" what if | informational | turning point | HistoryNet, Medium, NPS PDF, ECW, WHN, CivilWarTalk [SERP-checked] | low | P3 |
| 21 | gettysburg turning points | informational | `/turning-points` | hypothesis | medium | P3 |
| 22 | gettysburg casualties by day / by corps | informational | day pages, dashboard | Wikipedia, ABT sidebar (51,112 total per ABT page [V]) | low | P3 |
| 23 | gettysburg battlefield tour app / AR | informational | `/ar` | ABT Battle App (free, iOS/Android), NPS Auto Tour app [SERP-checked] | low | P4 |
| 24 | what could commanders see at gettysburg (viewshed) | informational | `/viewshed` after rename | Smithsonian 2013 (Knowles/Esri) [V] | medium | P4 |
| 25 | gettysburg what if simulator | navigational | `/sandbox` | hypothesis | low | P4 |
| 26 | gettysburg address anniversary / remembrance day | seasonal | `/aftermath` | very high competition | low | P4 (seasonal) |

Brand queries ("gettysburg interactive map", the domain, the owner's name) should own page 1 within weeks; the first success metric is a branded-query impression share in GSC.

---

## 6. Competitor and adjacent-site review (9 sites, all checked this session)

| Site | What it is and offers | Content depth | How it ranks / where it wins | Opportunity or threat for us |
|---|---|---|---|---|
| American Battlefield Trust: Gettysburg Animated Map (battlefields.org) | 16:51 narrated video with reenactment footage, Battle facts sidebar, educator PDF, Google Classroom share (1,928 educators added it [V]), sponsor History.com; also static time-slice maps (e.g., Pickett's Charge 3:30-3:45 and 3:45-4:00 pm URLs), free Battle App, Gettysburg 360 tour, Ancestor Research Guide, virtual field trip, lesson plans | thin text on the animated-map page; deep across the domain | #1-2 for "animated map" queries; owns the time-slice queries with static images | copy: educator PDF, Classroom share, time-slice naming; avoid: video race; opportunity: interactive positions per time slice; outreach target (educator resources) |
| Savas Beatie: Gettysburg Animated Battle Map APP (TVM Enterprises) | paid ($49.95 lifetime), web app, 430,000+ positioned units, 2,400+ components, 600-700 placements per 5-minute tick, 54 hours, 8 years of development, "8,000+ references", 5-star testimonials, companion YouTube channel "Gettysburg - Fully Animated" [V via WebFetch; author reported as Tom March or Tom Marchesani: verify] | product page | appears in every "animated battle map" SERP | threat: near-identical name to our old title and far richer placements; we differentiate on free/instant/linkable/open/education; watch the trademark question; do not claim parity; provenance question Q3 |
| NPS Gettysburg NMP (nps.gov/gett) | ancestor-search page (CWSS, civilwardata, NARA; park holds no individual service records [V]), park maps, teacher resources, distance-learning field trips, Auto Tour | authoritative, mostly text | tops genealogy and official queries | outbound-link target for our ancestor guide; outreach (education staff); cannot outrank |
| Stone Sentinels (gettysburg.stonesentinels.com) | single-author (Steve A. Hawks) reference site: per-regiment monument pages with location, GPS, inscriptions, dedication date, casualties, commander, strength, medals, 4 photos, breadcrumbs and heavy internal links [V]; day timelines: July 2 has 40-50 entries and over 15,000 words with four Hal Jespersen maps [V] | thick | dominates regiment-monument and timeline queries | model for unit-page anatomy (GPS, inscription-level detail, internal links); cannot copy text; compete with interactivity, ancestry paths and computed ranks; possible collaborator |
| Wikipedia (battle, second day, Union/Confederate order of battle, per-regiment pages) | encyclopedic | very deep | head terms; links nofollow; COI rules [V] | never outrank on head; target long-tail with structured tables; do not add own links |
| Smithsonian Magazine 2013 "A Cutting-Edge Second Look at the Battle of Gettysburg" (Knowles/Esri) | interactive troop movements, panoramas, viewshed maps [V]; functional status unverified | feature article | ranks for "interactive" Gettysburg map queries | our "What They Could See" name overlaps its concept; a modern, working viewshed is an opening (pagesB-36..39) |
| Dickinson College / Gilder Lehrman "Gettysburg Virtual Tour" (House Divided) | one-hour video tour, 13 stops, nine free handouts, free for non-commercial educational use [V] | medium | teacher lists | outreach: related-resource link; model for handouts |
| CivilWarTalk forum threads ("Interactive Order of Battle", "Hourly timeline of Gettysburg", "New Gettysburg Animated Battlefield Map") | community answers; blocks fetchers (403) | variable | rank for niche queries | outreach venue; read rules; the "New ... Animated Battlefield Map" thread title matches our old title: check who it is about [U] |
| Data-science hobby apps (RPubs "july1_map1", a Shiny "gettysburg" table by casualties/state/brigade) | interactive order-of-battle map and data table [V via search summary] | thin | appear for "interactive order of battle" | proof of demand and a weak field; our unit/state pages can outrank them |

Adjacent but not reviewed in depth: ABT Battle Apps (free iOS/Android, GPS-enabled) for on-site users; HistoryNet, Emerging Civil War and Warfare History Network essays for "what if" queries.

---

## 7. What SEO needs from other workstreams (dependency register)

| Need | Owner finding | Blocks |
|---|---|---|
| One corrected clock (`TimeModel`) and re-timed chronology | app-time-02..05, 12 | seo-growth-16, times printed on 15/17/18 |
| Deep-link consumer (`?tick`, `?unit`, `?vignette`, `?ancestor`, legacy aliases) | app-time-06, pagesA-03, app-bugs-05 | every "Open on the map" CTA, 09 redirect passthrough |
| Static generator/Astro, repo, CI, redirects, Node build | prov-recon-35, 38, 06 | 13, 24, 11 (or run standalone) |
| `data/v2`, `unit_counts`, `names.json`, alias table, VI Corps brigade records, vignette schema v2 | prov-recon-37, pagesB-53, pagesA-19 | 13, 15, 17 |
| Terrain elevation fix and DEM pipeline | pagesB-35..39 | 18 |
| Monument extraction with sources | prov-recon-27 | 21 |
| Boot redesign, LCP element, SW without reload, pre-rendered nav | perf-cwv-01..05, 14, 26; pagesA-05; bundle-anatomy-13/15 | 09, 24 |
| Historian corpus (OR Vol. 27, state volumes) and evaluation set | historian workstreams | 14, 23 |
| CSP enforcement and RUM host; embed header fix | perf-cwv-25, prov-recon-36 | 32, 35 |
| Mapbox token restriction | X1 owner | 12 (quota) |
| Accessible PDFs, headings, landmarks | app-a11y-* | 31, 25 |

---

## 8. 90-day roadmap (Sep 30 - Dec 29 2026), KPIs, risks

Capacity assumption: the plan totals about 77.5 person-days (S = 0.25 d, S-M = 0.75, M = 1, M-L = 2, L = 3.5, XL = 8). The 90-day scope below is about 50 person-days (about 4 days/week for 12 weeks; Claude-assisted implementation compresses coding time, not review time). If only about 2.5-3 days/week are available, do the **core subset** (33 person-days): 01, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13 (MVP), 15, 20, 22, 24, 25, 28, 29, 30, 31 (v1), 34, 35, 36, 37, 38 and defer 14/17/18/19/21/23/26/33 to Q1 2027.

### 8.1 Weekly plan and gates

| Week | Focus | Deliverables (finding ids) | Gate / checkpoint |
|---|---|---|---|
| W0 Sep 30-Oct 6 | Stop the bleeding, instrument | 01 GSC/Bing DNS verify + sitemaps + IndexNow key; 07 renew domain; 02 valid OG card + twitter tags; 03 redirects, netlify.app 301, `/landing.html`, fix `/index.html` links; baseline snapshots; decide Q1, Q4, Q6 | curl matrix passes; Facebook debugger shows a card; GSC verified |
| W1 Oct 7-13 | Names, metadata, trust | 04 rename; 05 metadata + noindex dispositions; 06 sitemap index, robots, llms.txt; 08 manifest; 25 part 1 (About, Sources, Corrections, Changelog) | title/description lint passes; one h1 per page |
| W2 Oct 14-20 | Measure and position | 35 analytics live + privacy update; 36 E1/E2 experiments; 25 part 2 (Method, Cite, Press); 28 keyword map v1; 29 positioning; outreach target sheet; owner drafts 3 lessons | analytics events visible; privacy page updated |
| W3 Oct 21-27 | Engine MVP | 13 generator + gate + per-section sitemaps + redirects (legacy-tree mode); 10 JSON-LD; 11 OG renderer; 12 SVG mini-map | gate passes on 3 sample templates; RRT clean |
| W4 Oct 28-Nov 3 | First release | 15 moments batch 1 (12) + hub; 24 static nav/footer/breadcrumbs/HTML sitemap; IndexNow; outreach wave 1 (10 emails) | **Gate G1:** owner reads 10 random pages; 0 dev-copy hits; GSC accepts sitemap |
| W5 Nov 4-10 | Second release | 15 batch 2 (12); 22 turning points (9); 20 part 1 (guide + 5 biggest state pages) | GSC: first indexed pages appear |
| W6 Nov 11-17 | Ancestors + classroom | 20 part 2 (remaining 14); 31 kit v1 (3 lessons, Classroom link, IT-admins, student privacy); wave 1 (20 emails total) | kit accessibility check |
| W7 Nov 18-24 | Address anniversary + first data | Nov 19 Aftermath/Address content live; first GSC review (4 weeks of data): re-score keyword map; indexing per sitemap; pause-rule check | **Gate G2:** indexed share >= 50% of released Tier-A; if "Crawled - not indexed" > 25%, enrich before adding URLs |
| W8 Nov 25-Dec 1 | Order of battle | 17 corps/division pages + first 40 brigades; 21 monument provenance | brigade gate passes |
| W9 Dec 2-8 | Units and places | 17 next 40 brigades + first 20 Tier-B units; 18 places (if elevation fixed); wave 2 (genealogy, libraries) | |
| W10 Dec 9-15 | Landing, embeds, data | 09 landing prototype + decision; 32 embed builder; 26 dataset page (if Q2/Q3 settled); wave 3 (communities: one data story) | landing `map_launch` rate test on staging |
| W11 Dec 16-22 | People and video | 19 commanders; Tier-B to 40; 31 lessons 4-6; 33 video pilot (3 shorts) | |
| W12 Dec 23-29 | Review | KPI sheet, prune or noindex failing pages, Jan-Jun plan, anniversary readiness checklist, changelog | **Gate G3:** targets in 8.2 |

### 8.2 KPIs (definition, source, baseline, targets)

| KPI | Source | Baseline (Aug 30-Sep 29) | D30 | D60 | D90 | D180 | D365 |
|---|---|---|---|---|---|---|---|
| GSC/Bing verified, data flowing | GSC, Bing | not verified | yes (day 3) | yes | yes | yes | yes |
| Indexable URLs submitted / indexed | GSC per-sitemap | 21 submitted / unknown | 60 / 40 | 200 / 140 | 400 / 300 | 500 / 400 | 580 / 480 |
| Search-engine referral visits per 30 d (google+bing+ddg+yahoo) | Netlify Analytics "Top sources" | 173 (63+59+38+13) | 200 | 300 | **500** | 1,500 | 6,000 (includes the July 2027 peak) |
| Google clicks per 28 d | GSC | unknown | 40 | 150 | 400 | 1,200 | 5,000 |
| AI-assistant referrals per 30 d | analytics referrers | 14 (chatgpt.com) | 20 | 35 | **50** | 120 | 400 |
| Referring domains (new, human-checked) | GSC Links, Bing inbound | measure at W0 | +4 | +10 | **+20** (>= 8 .edu/.gov/.org) | +50 | +120 |
| Share previews valid | validators on 10 URLs | 0 of 10 | 10 of 10 | 10 of 10 | 10 of 10 | 10 of 10 | 10 of 10 |
| Rich results | GSC Enhancements | none | Breadcrumb valid >= 90% | >= 95% | + Dataset (if published) | | |
| Landing to map launch rate | analytics event | n/a | n/a | n/a | >= 45% | 55% | 60% |
| Engaged-session rate | analytics | unknown | measure | 50% | 55% | 60% | 60% |
| Human-adjusted unique visitors per 30 d | analytics vs Netlify | 1,529 raw | measure | est. | 1,800 | 3,500 | 12,000 |
| Classroom-share clicks + kit downloads (30 d) | analytics events | 0 | 3 | 10 | 30 | 120 | 500 |
| Core Web Vitals on content routes (RUM p75) | Netlify RUM / own beacon | site-wide Poor | LCP <= 2.5 s | <= 2.0 | <= 1.5 | <= 1.5 | <= 1.5 |
| Branded-query impression share | GSC | n/a | measure | top 3 for domain name | top 3 for "gettysburg interactive map" | | |

These are planning targets, not forecasts: they were set without keyword-volume data and must be re-based at D30 from real GSC/Bing numbers. Leading indicators (indexed URLs, impressions, referring domains) are more controllable than clicks in the first 60 days.

### 8.3 Risk register

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | Thin/templated pages judged scaled content | medium / high | tiering, gate, release train, pause rule (13) |
| R2 | Wrong clock times mass-published | high if unmanaged / high | block time pages until app-time-02..05; prose-only times (13, 16) |
| R3 | Copyright/licence exposure (Busey and Martin, third-party product provenance, monument text) | medium / high | Q2, Q3; computed enrichment first; attribution; ask the publisher (14, 26) |
| R4 | Mapbox quota burn from JS-rendering crawlers | medium / medium | no maps on content pages; click-to-load; restrict token (12, X1) |
| R5 | Redirect loops or canonical conflicts | low-medium / high | explicit rows, curl matrix in CI, one deploy for URLs + canonicals + sitemap (03) |
| R6 | Landing-first lowers map launches or angers returning users | medium / medium | returning-user redirect; measure `map_launch`; Option B fallback (09) |
| R7 | Outreach read as spam | medium / medium | personal emails, disclosure, one follow-up, give value first (30) |
| R8 | Over-reliance on Bing/AI referrals | medium / low | keep Google fundamentals; monitor share |
| R9 | Google indexing delay on a 3.5-month-old domain | high / medium | patience, internal links, backlinks, IndexNow for Bing; do not panic-publish |
| R10 | Analytics/privacy mismatch | low / high | update policy in the same release as the counter (35) |
| R11 | Solo-owner capacity | high / high | core subset; Claude-assisted implementation; defer XL items |
| R12 | Trademark/brand confusion with the paid app | low-medium / medium | rename (04), positioning (29), independence line |

---

## 9. Decisions and questions for the owner

| # | Question | Why it matters | My default |
|---|---|---|---|
| Q1 | Approve the name "Gettysburg Interactive Map" as the brand? | title, JSON-LD, manifest, outreach | yes |
| Q2 | Licensing: (a) is Busey and Martin exposure acceptable (facts only, attributed, or ask the publisher)? (b) licence for the dataset (CC BY 4.0) and for the vignette text? | 14, 26 | CC BY 4.0 for facts and tables; text stays "quote with credit" |
| Q3 | Provenance: three data notes reference a "Gettysburg Animated YouTube vignette" (`terrain.json:38`, `union_artillery.json:91`, `placements_day1_ticks1_50.json:80`). Were any positions or texts derived from the paid app or that channel? Any affiliation? | open-licensing and scaling are unsafe until answered | answer before 26 |
| Q4 | Allow AI training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot ...) on HTML, and block them from `/data/`? | robots.txt | allow HTML, block `/data/` for training bots |
| Q5 | Landing-first (`/` landing, app at `/map`) or keep the app at `/`? | 09 | landing-first with returning-user redirect |
| Q6 | Analytics vendor: Plausible (paid), GoatCounter (free), Umami, or edge counters? | 35 | first-party-proxied cookieless counter |
| Q7 | Who can be named as reviewers, and what real background facts go on About? | E-E-A-T | 2-3 volunteers, real bio |
| Q8 | Weekly time budget and how much is implemented by Claude sessions? | roadmap scope | core subset if < 3 days/week |
| Q9 | Does an older Search Console or Bing property still exist under another account? | avoid duplicate/lost history | check first |
| Q10 | Confirm the site is free with no paid tier (the old `/landing.html` advertised a trial): are Terms/Privacy/About consistent with that forever? | trust, redirect target | yes |

---

## Sources checked this session (WebSearch/WebFetch/curl; none contacted)

- American Battlefield Trust: https://www.battlefields.org/learn/maps/gettysburg-animated-map ; https://www.battlefields.org/learn/maps/animated-battle-maps ; https://www.battlefields.org/visit/mobile-apps ; https://www.battlefields.org/learn/maps/gettysburg-picketts-charge-july-3-1863-345-400-pm ; https://www.battlefields.org/learn/educators/curriculum/gettysburg-virtual-field-trip-lesson-plan
- Savas Beatie app page: https://www.savasbeatie.com/copy-of-gettysburg-animated-battle-map-app/ ; Seminary Ridge Museum event: https://www.seminaryridgemuseum.org/events/an-evening-with-tom-march
- NPS ancestor search: https://www.nps.gov/gett/learn/historyculture/ancestor-search.htm
- Stone Sentinels: https://gettysburg.stonesentinels.com/union-monuments/pennsylvania/pennsylvania-infantry/23rd-pennsylvania/ ; https://gettysburg.stonesentinels.com/timeline-battle-july-2/
- Smithsonian 2013: https://www.smithsonianmag.com/history/A-Cutting-Edge-Second-Look-at-the-Battle-of-Gettysburg-1-180947921/
- Dickinson House Divided: https://housedivided.dickinson.edu/sites/civilwar/gettysburg-virtual-tour/
- Google Search Central: https://developers.google.com/search/docs/essentials/spam-policies ; https://developers.google.com/search/docs/appearance/structured-data/search-gallery ; https://developers.google.com/search/docs/appearance/structured-data/dataset
- Wikipedia external links: https://en.wikipedia.org/wiki/Wikipedia:External_links
- OpenAI crawlers: https://developers.openai.com/api/docs/bots ; Anthropic crawler summaries via search (support.claude.com article "Does Anthropic crawl data from the web ..."); Vercel: https://vercel.com/blog/the-rise-of-the-ai-crawler
- IndexNow: https://www.indexnow.org/documentation ; Google Classroom share button: https://developers.google.com/classroom/guides/sharebutton
- Communities and lists (seen in results, not fetched unless noted): https://civilwartalk.com/threads/new-gettysburg-animated-battlefield-map.153279/ ; https://civilwartalk.com/threads/interactive-map-of-gettysburg.209727/ (403) ; https://www.civilwarseminars.org/civil-war-round-table-directory ; https://emergingcivilwar.com/2025/03/02/at-the-lectern-booking-speakers-for-your-civil-war-round-table/ ; https://familytreemagazine.com/records/military/researching-gettysburg-soldiers/ ; https://www.familysearch.org/en/wiki/Civil_War_Battles,_Gettysburg ; https://www.teachthecivilwar.com/virtual-field-trips/ ; https://www.lessonplanet.com/lesson-plans/gettysburg ; https://grc-usmcu.libguides.com/battle-studies/gettysburg/maps
- Live checks: RDAP https://rdap.verisign.com/com/v1/domain/gettysburginteractivemap.com ; curl matrix (headers, redirects, 404s); nslookup TXT/NS.

---

## Appendix A - robots.txt, sitemap index and llms.txt samples

**robots.txt** (parsed with Python `urllib.robotparser`: GPTBot allowed `/moments/...` and blocked `/data/...`; ClaudeBot blocked `/data/terrain.json`; Googlebot, Bingbot, OAI-SearchBot, PerplexityBot allowed `/data/...`; Claude-SearchBot allowed `/units/...`; file `seo_tmp/robots_sample.txt`) [V]:

```
# gettysburginteractivemap.com crawler policy
# Search and answer engines (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, Applebot, DuckDuckBot ...)
# fall under the default group and may fetch everything, including /data/ (tool pages render from it).
User-agent: *
Allow: /

# Model-training crawlers: HTML pages are fine, bulk data files are not (see Terms, Acceptable use).
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bytespider
User-agent: meta-externalagent
Disallow: /data/

Sitemap: https://gettysburginteractivemap.com/sitemap.xml
```

**sitemap.xml (index)**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://gettysburginteractivemap.com/sitemap-core.xml</loc><lastmod>2026-10-07</lastmod></sitemap>
  <sitemap><loc>https://gettysburginteractivemap.com/sitemap-moments.xml</loc><lastmod>2026-11-03</lastmod></sitemap>
  <sitemap><loc>https://gettysburginteractivemap.com/sitemap-units.xml</loc><lastmod>2026-12-08</lastmod></sitemap>
  <!-- battle, places, people, ancestors, learn, trust ... -->
</sitemapindex>
```

**llms.txt**:

```
# Gettysburg Interactive Map
> Free interactive map of the Battle of Gettysburg (July 1-3, 1863): modeled unit positions every five minutes, an order of battle of 466 regiments and 103 batteries, and sourced narratives. No login. Built by Mike Legere. Positions are modeled between documented keyframes; every page lists its sources and a corrections link.

## Start here
- [The map](https://gettysburginteractivemap.com/map): the interactive battle map
- [Key moments](https://gettysburginteractivemap.com/moments): 24 pivotal moments with sources
- [Order of battle](https://gettysburginteractivemap.com/units): corps, divisions, brigades, regiments
- [Find your ancestor's regiment](https://gettysburginteractivemap.com/ancestors): regiments by state
- [Sources and method](https://gettysburginteractivemap.com/sources): bibliography and how positions are modeled
- [Corrections](https://gettysburginteractivemap.com/corrections): how to report an error

## Optional
- [Teach Gettysburg](https://gettysburginteractivemap.com/learn): free lesson plans
- [Data](https://gettysburginteractivemap.com/data): dataset, licence, citation
```


## Appendix B - JSON-LD samples (each parsed with `json.load`: valid JSON [V]; replace the DOI placeholder before publishing)

**Home (`@graph`)**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://gettysburginteractivemap.com/#website",
      "url": "https://gettysburginteractivemap.com/",
      "name": "Gettysburg Interactive Map",
      "alternateName": [
        "Gettysburg Animated Battlefield Map",
        "gettysburginteractivemap.com"
      ],
      "inLanguage": "en-US",
      "publisher": {
        "@id": "https://gettysburginteractivemap.com/#creator"
      }
    },
    {
      "@type": "Person",
      "@id": "https://gettysburginteractivemap.com/#creator",
      "name": "Mike Legere",
      "url": "https://gettysburginteractivemap.com/about"
    },
    {
      "@type": "WebApplication",
      "@id": "https://gettysburginteractivemap.com/#app",
      "name": "Gettysburg Interactive Map",
      "url": "https://gettysburginteractivemap.com/",
      "description": "An interactive map of the Battle of Gettysburg (July 1-3, 1863) with modeled unit positions every five minutes.",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Any (modern web browser)",
      "browserRequirements": "Requires JavaScript and WebGL",
      "isAccessibleForFree": true,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "creator": {
        "@id": "https://gettysburginteractivemap.com/#creator"
      },
      "about": {
        "@id": "https://gettysburginteractivemap.com/#battle"
      },
      "audience": {
        "@type": "EducationalAudience",
        "educationalRole": [
          "student",
          "teacher"
        ]
      },
      "screenshot": "https://gettysburginteractivemap.com/og/home.png",
      "featureList": [
        "Five-minute unit positions across three days",
        "Order of battle search",
        "Find an ancestor's regiment",
        "Documentary moments",
        "Classroom kit"
      ],
      "potentialAction": {
        "@type": "ViewAction",
        "name": "Open the map",
        "target": "https://gettysburginteractivemap.com/map"
      }
    },
    {
      "@type": "Event",
      "@id": "https://gettysburginteractivemap.com/#battle",
      "name": "Battle of Gettysburg",
      "startDate": "1863-07-01",
      "endDate": "1863-07-03",
      "location": {
        "@type": "Place",
        "name": "Gettysburg, Pennsylvania",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 39.8309,
          "longitude": -77.2311
        }
      },
      "sameAs": "https://en.wikipedia.org/wiki/Battle_of_Gettysburg"
    }
  ]
}
```

**Moment page (Article + BreadcrumbList)**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://gettysburginteractivemap.com/moments/chamberlains-charge#article",
      "headline": "Chamberlain's Charge at Little Round Top",
      "description": "The 20th Maine's bayonet charge on July 2, 1863: units, ground, timeline and sources.",
      "image": ["https://gettysburginteractivemap.com/og/moments/chamberlains-charge.png"],
      "datePublished": "2026-11-05",
      "dateModified": "2026-11-05",
      "inLanguage": "en-US",
      "author": { "@id": "https://gettysburginteractivemap.com/#creator" },
      "publisher": { "@id": "https://gettysburginteractivemap.com/#creator" },
      "mainEntityOfPage": "https://gettysburginteractivemap.com/moments/chamberlains-charge",
      "about": { "@id": "https://gettysburginteractivemap.com/#battle" },
      "mentions": [
        { "@type": "Place", "name": "Little Round Top", "url": "https://gettysburginteractivemap.com/places/little-round-top" }
      ],
      "citation": [
        { "@type": "Book", "name": "Stand Firm Ye Boys from Maine", "author": { "@type": "Person", "name": "Thomas A. Desjardin" }, "publisher": { "@type": "Organization", "name": "Thomas Publications" }, "datePublished": "1995" }
      ],
      "isPartOf": { "@type": "CollectionPage", "name": "24 Key Moments of the Battle of Gettysburg", "url": "https://gettysburginteractivemap.com/moments" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://gettysburginteractivemap.com/" },
        { "@type": "ListItem", "position": 2, "name": "Key moments", "item": "https://gettysburginteractivemap.com/moments" },
        { "@type": "ListItem", "position": 3, "name": "Chamberlain's Charge" }
      ]
    }
  ]
}
```

**Data landing page (Dataset)**

```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Gettysburg order of battle, casualties and modeled unit positions (v1)",
  "description": "Structured records for the Union and Confederate regiments, batteries, brigades, divisions and corps at Gettysburg (July 1-3, 1863): designations, states, commanders, strengths, losses, and modeled five-minute positions. Compiled from the Official Records and published regimental studies; every record carries its sources.",
  "url": "https://gettysburginteractivemap.com/data",
  "identifier": "https://doi.org/10.5281/zenodo.0000000",
  "version": "1.0.0",
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "creator": { "@type": "Person", "name": "Mike Legere", "url": "https://gettysburginteractivemap.com/about" },
  "temporalCoverage": "1863-07-01/1863-07-03",
  "spatialCoverage": { "@type": "Place", "geo": { "@type": "GeoShape", "box": "39.77 -77.29 39.85 -77.18" } },
  "variableMeasured": ["strength", "casualties", "casualty rate", "latitude", "longitude", "tick"],
  "distribution": [
    { "@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": "https://gettysburginteractivemap.com/data/v2/units.json" },
    { "@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": "https://gettysburginteractivemap.com/data/v2/units.csv" }
  ]
}
```

## Appendix C - Thin-content gate: measurements and pseudo-code

**Measured on today's data** (`seo_tmp/tier_proto.py`, values only, JSON keys excluded) [V]:

| Entity | Count | Usable words per page from data alone | Passing a 250-word gate |
|---|---|---|---|
| Regiment / cavalry regiment (excl. alias) | 466 | min 6, median 17, max 105; >= 30 words: 47; >= 60: 6; >= 100: 1 | 0 |
| Brigade page (brigade record + its regiments) | 101 referenced ids (93 with a record, 8 VI Corps without) | min 51, median 120, max 232; >= 100: 72; >= 150: 21; >= 200: 4 | 0 |
| Vignette | 24 | 206-375 (script) + 59 (summary) | 24 (with context) |
| Chronology event | 137 | avg 30 | needs grouping |
| Key location | 30 | avg 19 | needs authoring |
| Turning point | 9 | avg 116 | needs expansion |
| `key_action` duplicates | 127 units share 48 strings ("Army reserve." x 20) | | |
| Tier-B unit candidates (any of: `key_action` >= 100 chars 40; featured in a vignette; >= 40% loss 151; flag note 31) | 180 | | after enrichment |

**Pseudo-code** (`scripts/seo/gate.mjs`, runs on built HTML in CI):

```js
export function gate(page, corpus) {
  const text = visibleText(page.html, { exclude: ['nav', 'footer', '[data-boilerplate]'] });
  const words = countWords(text);
  const sh = shingle5(text);
  const boiler = share(sh, s => corpus.docFreq.get(s) >= 50);           // template phrases seen on >= 50 siblings
  const maxSim = Math.max(...corpus.sample(page.template, 25).map(o => jaccard(sh, o.shingles)));
  const facts = page.facts.filter(f => f.value != null && !f.fromTemplate).length;
  const checks = {
    minWords:  words >= MIN_WORDS[page.template],
    boiler:    boiler <= 0.35,
    sim:       maxSim < 0.5,
    facts:     facts >= MIN_FACTS[page.template],
    sources:   page.sources.length >= 1,
    lead:      page.lead && page.lead.length >= 200 && !looksTemplated(page.lead, corpus),
    noDevCopy: !DEV_COPY.test(text),
    oneH1:     page.h1Count === 1,
    jsonld:    validateJsonLd(page.jsonld),
  };
  return { pass: Object.values(checks).every(Boolean), checks, words, boiler, maxSim, facts };
}
// on fail: unit -> do not emit (fold into brigade anchor); Tier A -> fail build;
//          Tier B -> emit noindex,follow and omit from sitemap.
const DEV_COPY = /Earlier drafts|we haven't been able|alias for U-|Commander unrecorded|\bundefined\b|TODO|FIXME|subject of a Gettysburg|YouTube vignette|\bTick \d+\b/i;
```

Tier-B selection (`scripts/seo/select-units.mjs`): rank candidates by (featured in vignette) > (loss rate >= 60%) > (flag note) > (loss rate 40-60%) > (`key_action` >= 100 chars); take the top 60 for day 90; a unit is promoted only after it has an approved excerpt (14).

---

## Appendix D - Acceptance scripts

**Redirect / canonical matrix** (run against staging and production; expected: final status 200, at most one 301, canonical equals the final URL):

```bash
H=https://gettysburginteractivemap.com
chk(){ curl -s -o /dev/null -L --max-redirs 3 -w "%{http_code} redirects=%{num_redirects} %{url_effective}  <= $1\n" "$1"; }
for p in / /index.html /dashboard /dashboard.html /historian /historian.html /landing.html "/?utm_source=x" "/regiment.html?unit=U-20ME"; do chk "$H$p"; done
curl -sI https://friendly-lolly-da85c0.netlify.app/ | head -3        # expect 301 to the custom domain
curl -sI http://www.gettysburginteractivemap.com/ | grep -i '^location' # expect one hop to https://gettysburginteractivemap.com/
for p in /moments /units /ancestors; do curl -s "$H$p" | grep -o '<link rel="canonical"[^>]*>'; done
```

**Raw-HTML content check** (what non-JS crawlers see):

```bash
for p in / /moments/chamberlains-charge /units/20th-maine-infantry /ancestors/pennsylvania; do
  echo "$p  h1=$(curl -s $H$p | grep -o '<h1' | wc -l)  words=$(curl -s $H$p | python3 -c 'import sys,re;t=re.sub(r"<script.*?</script>|<style.*?</style>","",sys.stdin.read(),flags=re.S);print(len(re.sub(r"<[^>]+>"," ",t).split()))')"
done
```

**Googlebot render comparison** (settles the `#seo-content` question): in Search Console, URL Inspection > Test live URL > View tested page: compare "HTML" to `curl` output; confirm the h1 and copy exist in the rendered HTML; check "More info" for blocked/failed resources (`/data/*.json`, Mapbox).

**Image check**: `python -c "from PIL import Image; im=Image.open('og/default.png'); im.load(); print(im.size)"` must print (1200, 630).

**Crawl checks** (CI): title <= 60, description 120-155, unique; one h1; canonical present; JSON-LD parses; no link to a redirected or 404 URL; every sitemap URL 200 and indexable.

---

## Appendix E - Analytics event table (no personal data)

| Event | Trigger | Properties (all coarse) | Never collected |
|---|---|---|---|
| `page_view` | automatic | path (query stripped), referrer host, country (provider) | IP, full user agent, cookies |
| `map_launch` | app boots on `/map` | source = landing / deeplink / pwa / returning | |
| `play` | Play pressed | speed bucket | |
| `unit_open` | unit panel opened | unit_id (public entity) | |
| `vignette_open` | moment opened | V-id | |
| `search_used` | search submitted | boolean, result-count bucket | the query text |
| `ancestor_lookup` | ancestor lookup used | state only | surname, county |
| `share_copy` | link copied/shared | type (map/moment/unit) | |
| `embed_load` | embed iframe loads | embedding host only | |
| `kit_download` | lesson/printable download | lesson id | |
| `classroom_share_click` | Classroom link | lesson id | |
| `outbound_click` | link to NPS/NARA/FamilySearch etc. | destination host | |
| `cite_copy` | cite box used | format (APA/MLA/Chicago) | |
| `correction_click` | correction link | page path | |
| `historian_feedback` | thumbs up/down | up/down | question text |

All events are skipped when Global Privacy Control or Do Not Track is on.

---

## Appendix F - Search Console and Bing Webmaster setup checklists

**Day 1 (Google):** add a Domain property; add the TXT record in Netlify DNS (Domains > DNS records); verify; add sitemap `sitemap.xml`; open Settings > Crawl stats; note Pages report totals; run URL Inspection (live) on `/`, `/documentary`, `/find-ancestor`; save screenshots and rendered HTML; add a second owner.

**Day 1 (Bing):** Bing Webmaster Tools > Import from Google Search Console (or add site and verify by DNS); submit the sitemap; open Site Scan; enable IndexNow (key file at the root); record Inbound links and Performance baselines.

**Weekly (15 minutes):** Performance (7 vs prior 7 days; filter by page type using sitemap-per-section); Pages report reasons; Sitemaps status; Crawl stats (Googlebot requests by response and file type); Enhancements (Breadcrumbs, Dataset, Article); Manual actions and Security issues (should be empty); Bing Performance and Inbound links; Netlify Analytics top pages/sources/404s; analytics goals; AI referrers; log to `docs/kpi.xlsx`.

**Monthly:** KPI review; SERP log for 30 queries; AI-assistant prompt check (10 questions x 4 assistants); backlink new/lost; content refresh; changelog; prune list.

---

## Appendix G - Outreach email templates (personal, short, one follow-up)

**Teacher-resource curator**

> Subject: Free Gettysburg map and lesson plans for your list
> Hello {name}, I'm Mike Legere; I built gettysburginteractivemap.com, a free, no-login map of the Battle of Gettysburg with every regiment and battery placed in five-minute steps, and a classroom kit (six lesson plans, map worksheets, a Google Classroom share link, and a page listing the domains a school firewall needs to allow). I noticed {their page} lists Gettysburg resources. If it fits, I'd be glad if you considered listing https://gettysburginteractivemap.com/learn. There are no ads, accounts or tracking of students. Happy to fix anything you find wrong, and thank you for the work you do. Mike

**Round-table program chair**

> Subject: Free 20-minute talk: Gettysburg in five-minute steps
> Hello {name}, I'm Mike Legere, the builder of a free interactive map of Gettysburg (modeled unit positions every five minutes, with sources shown on each page). I'd be glad to give your round table a 20-minute virtual walk-through of July 2 (Little Round Top to the Wheatfield) and take corrections from members who know the ground better than I do. If a short item in your newsletter would help, here is the link: https://gettysburginteractivemap.com/moments. Either way, thank you for keeping this history alive. Mike

**Genealogy guide editor**

> Subject: Regiment finder that could complement your Gettysburg ancestor steps
> Hello {name}, your article "{title}" is a clear guide. I run a free tool that lets someone narrow down which of the 466 regiments and 103 batteries at Gettysburg their ancestor may have served in by state, then follow that unit across the battle, and points people to the NPS Soldiers and Sailors database for individual names (we hold no individual records). If useful as a step in your guide: https://gettysburginteractivemap.com/find-your-civil-war-ancestor-at-gettysburg. I welcome corrections. Mike

Rules for all: personalise the first sentence; disclose you are the builder; never send bulk; log every send; stop after one follow-up; never ask for a specific anchor text.


---

## Verification

Adversarial verification, 2026-09-30. Method: re-opened the cited deploy files and line numbers, re-ran the data analyses from `deploy/data`, decoded the PNG, extracted the Netlify Analytics/RUM PDFs with word coordinates, re-ran the live `curl` matrix, fetched the cited URLs (WebFetch/curl/WebSearch) and checked license and policy statements against the source pages. Scratch scripts are in `plan-work/tmp-verify-seo-growth/`. Nothing else was modified.

**Overall:** the evidence base is strong. Every headline number I re-derived matched or was within counting-method tolerance (PNG decode, 10 missing twitter:card pages, 10 `/index.html` back links, Analytics rows, RDAP dates, 686 commander names, 512 monuments/9 src, 48 duplicate `key_action` strings, 93/101 brigades, 9 turning points averaging 116 words). Errors found are mostly in secondary facts (competitor statistics, state counts, two Netlify behaviours, one Slack command) plus integration gaps between the SEO plan and existing site plumbing (`netlify.toml` path rules, `site-nav.js` back-link wiring, service worker, `gtbg_onboarded`) and a roadmap that is over capacity and omits its own prerequisite (finding 14).

### Verdict table

| ID | Verdict | What I checked / correction |
|---|---|---|
| seo-growth-01 | CONFIRMED (+addition) | `/google0dca4879c9657741.html` 404 live; `deploy-history.md:114` says present in deploy B only; `nslookup -type=TXT` SOA only; NS = `dns1-4.p09.nsone.net`; no `google-site-verification`/`msvalidate` in `index.html`. Addition: the original 52-byte file (`google-site-verification: google0dca4879c9657741.html`) still exists in `C:/Users/mlege/Downloads/google0dca4879c9657741.html` and `plan-work/tmp-deploy-history/b_jun23/`; re-adding it can re-verify the OLD property with its history in minutes, before or alongside the new DNS Domain property (see MISSED-4). IndexNow "POST from the deploy step" needs a pipeline that does not exist yet (deploys are manual zips): the S estimate holds for key file plus manual submit only. |
| seo-growth-02 | CORRECTED (minor) | IHDR (1280x720, 8-bit, colour type 2) vs inflated IDAT 3,687,120 B (RGBA size; RGB would be 2,765,520); PIL "unrecognized data stream contents"; decoded as RGBA = 80 colours, luma max 17; `day1.png` and `day3.png` md5 identical; twitter:card missing on exactly the 10 listed pages; no `og:site_name`/`og:image:width/height/alt` anywhere; only `index.html` has manifest/icon links (4 matches). Corrections: `og:image` is on 21 pages but `twitter:image` on only 11 (the finding says both 21); "Slack `/unfurl`" is not a real command (Slack has no purge API; cache about 30 min; use a new image URL, `?v=2`, or delete the message); interim "real screenshot" caveat in MISSED-7. |
| seo-growth-03 | CORRECTED | Confirmed: `/` and `/index.html`, `/dashboard` and `/dashboard.html`, `/historian` and `/historian.html` all 200; `friendly-lolly-da85c0.netlify.app` 200, no redirect, no X-Robots-Tag (deploy permalinks do send `noindex`); `/landing.html` 404; `http://www` two hops; Analytics rows from the PDF by coordinates: `/` 1,713, `/index.html` 86, `/historian` 68, `/historian.html` 42; 10 back-links exact lines; canonicals use the `.html` form. Netlify does not auto-redirect the default subdomain (search summary of Netlify docs/forum), so the `force` rule is the right fix. Corrections: (1) `historian.html:110`, `regiment.html:247`, `turning-points.html:118` already emit `/?tick=` / `/?unit=` (root form), not `/index.html?...`; the `/index.html` emitters are `documentary.html:92`, `education.html:81`, `embed.html:60`, `search.html:114/127/139`; (2) "set the primary domain to the apex so http://www is one hop" is a no-op: apex is already primary (www 301 to apex) and the extra hop is Netlify's HTTP-to-HTTPS upgrade preceding the alias redirect; (3) the plan does not re-key existing path-scoped rules for the extensionless form and does not resolve the conflict with prov-recon-35/36 (they keep `.html` canonicals): see MISSED-1. |
| seo-growth-04 | CONFIRMED (minor corrections) | `index.html:14` title, `:718` h1, `manifest.json` name; Savas Beatie page: $49.95, "more than 430,000 positioned units", 2,400+ components, 8,000+ references, 8+ years, author Tom Marchesani ("Tom March"); Tubi lists "Gettysburg/Antietam: Animated Battle Map" (2019, 33 min). Minor: the YouTube channel is "Gettysburg Battle - Fully Animated"; the Apple TV listing was not confirmed; that 2019 film is an American Battlefield Trust product, not an independent competitor; the acceptance grep for "minute-by-minute" misses the unhyphenated "minute by minute" in `site-nav.js:46` and `living-ledger.html`. |
| seo-growth-05 | CORRECTED (minor) | Titles over 60: aftermath 71, dashboard 67, find-ancestor 67, education 61 (exact). Descriptions under 110: 11 including privacy/terms (9 among the 20 feature pages). Static word counts re-run: search 20 to aftermath 321 (report: 27 to 330; same shape). Correction: turning-points content is an inline JS array (`const POINTS`, `turning-points.html:50-100`), not `fetch()`-rendered; documentary/education/find-ancestor/historian/regiment do `fetch('/data/...')`. |
| seo-growth-06 | CONFIRMED | Sitemap 21 `<loc>`, 0 `<lastmod>`; `robots.txt` is 3 lines; `/llms.txt` 404; sitemap and robots `Cache-Control: max-age=86400`. OpenAI bots page: OAI-SearchBot opt-out means not shown in ChatGPT search; ChatGPT-User "robots.txt rules may not apply"; about 24 h to pick up robots changes. Other vendors' token spellings remain unverified (the report says so). |
| seo-growth-07 | CONFIRMED | RDAP: registration 2026-06-13, expiration 2027-06-13, status `client transfer prohibited`. |
| seo-growth-08 | CORRECTED | manifest contents exactly as described (landscape lock, `any maskable`, no id/lang, both screenshots the same corrupt file). Hazard: the plan sets `id: "/"` now and `id: "/map"` when landing-first ships; changing `id` changes PWA identity for installed users. Pick a permanent `id` now and change only `start_url` (MISSED-7). |
| seo-growth-09 | CORRECTED | Confirmed: h1 at `index.html:718/744/753`; `#seo-content` inside `#root` (716-717); removal at `:424-425` only after >= 3 toolbar buttons are labelled; design comment `:140-152`; Google spam-policy definitions (cloaking, hidden text, sneaky redirects) quoted correctly. Root cause and Option A are sound. Gaps: (a) service-worker registration and `PRECACHE_ASSETS` live only in `index.html:258-275` and `sw.js`; a landing page that keeps them installs the whole app for every search visitor (MISSED-2); (b) `site-nav.js:212` back-link/bfcache logic keys on `a[href="/"]`, and the returning-user gate uses a new key `gtbg_seen` while existing users only have `gtbg_onboarded=1` (`bundle.pretty.js:112951, 113068`) (MISSED-3). |
| seo-growth-10 | CONFIRMED | JSON-LD only at `index.html:27-38`; nested Event without `location`; WebApplication without `offers`. Search gallery lists Article, Breadcrumb, Carousel, Dataset, Event, Organization, Profile page, Software app, Video, Image metadata; FAQ, HowTo, Sitelinks search box absent. (Gallery also lists Education Q&A and Course list: possible low-priority fit for `/learn`.) |
| seo-growth-11 | CONFIRMED (21, not 26) | The broken image is referenced by 21 pages (`og:image`); 6 files (404, diagnostics, embed, privacy, terms, unit-rendering-reference) have none, so "all 26 pages" is 21. |
| seo-growth-12 | CONFIRMED | 8 feature pages plus `unit-rendering-reference` load `mapbox-gl.js` 3.24.1 from `api.mapbox.com` (1,796,551 B raw): camera, cinematic-export, compare, ground-remembers, immersive, sandbox, viewshed, watch-together (not all sub-pages). Mapbox pricing page: 50,000 free map loads, $5 per 1,000 beyond, counted "every time Mapbox GL JS initializes". |
| seo-growth-13 | CORRECTED | Exact: 127 units share 48 `key_action` strings, "Army reserve." x 20; 40 units with `key_action` >= 100 chars; 93 brigade records for 101 ids, the 8 missing are `U-VI-1-1..U-VI-3-3`; 570 unit records (467 regiment records incl. 1 alias + 103 batteries); 151 units with loss rate >= 40%. Tolerance: regiment median 18 words (report 17), >= 30 words 33 (report 47), >= 100 words 0 (report 1); brigade median 112 with 0 >= 250 (report 120/0). The cited prototype `seo_tmp/tier_proto.py` itself prints median 146 and 4 brigades >= 250 because it counts JSON key names, so the report's headline numbers are not reproducible from the script it cites (conclusion unchanged). Factually wrong: item 8 says `_redirects` "cannot read query strings"; Netlify supports query matching (`/regiment unit=:unit /units/:unit 301!`, exact-match-only semantics; documented), so no JS `location.replace` is needed. Not reproducible: "flag note 31" and the union of 180 Tier-B candidates (chronology `flag` fields give 110 units; union with >= 40% loss and vignette-featured = 157). |
| seo-growth-14 | CONFIRMED (extended) | `key_action` >= 100 chars = 40; data notes at `terrain.json:38`, `union_artillery.json:91`, `placements_day1_ticks1_50.json:80` confirmed, plus a fourth at `chronology_day1.json:31` (`"flag": "Hall's Battery YouTube vignette subject..."`); `tmp-hist-sources-1/or27_1.txt`, `or27_2.txt`, `or27_3.txt` exist. License statements are consistent with sources (OR Vol. 27 US government work; pre-1931 monument volumes public domain in the US as of 2026, so "before 1929" is conservative; Wikipedia CC BY-SA; Busey and Martin's 1994 = 3rd edition). Extension: MISSED-5. |
| seo-growth-15 | CONFIRMED | 24 vignettes, 208-378 words each (total 7,271; report 206-375/7,205: counting method); schema has no per-vignette `sources`; `documentary.html:88-92` one at a time; `education.html:66` same fetch. ABT time-slice URL exists (200). |
| seo-growth-16 | CORRECTED (competitor stats) | Chronology facts exact: 137 events, 38 distinct hour keys; Day 2 has 8 events between 8:05 and 8:55 am and one event per hour 2:20-6:20 pm. Stone Sentinels numbers are overstated: my direct `curl` word counts are about 6.3k (July 1), 9.4k (July 2, 22 timestamped entry headings) and 7.0k (July 3) words, not ">15,000 words / 40-50 entries" (that came from a summarising fetch). Strategy unaffected. |
| seo-growth-17 | CONFIRMED | 93/101 brigades; alias stub `U-14BK` "14th Brooklyn (alias for U-84NY)" (`union_regiments_i_ii_corps.json:26`); 11 corps (8 Union + 3 Confederate) and 31 divisions (22 + 9); Stone Sentinels per-regiment page live (200). |
| seo-growth-18 | CONFIRMED | `terrain.json`: 30 key_locations (avg 19.2 words), 8 roads, 8 structures, 4 terrain features. Elevation-mismatch claim rests on pagesB-35 (not re-verified). |
| seo-growth-19 | CONFIRMED | 686 distinct commander names, 99 general-rank, 42 succession events (25 + 17), 64 individual monuments. |
| seo-growth-20 | CORRECTED (state counts) | NPS ancestor page says the park does not maintain individual service or pension records (quote verified); FamilySearch wiki and Family Tree Magazine article exist. The state counts exclude the 59 regiments in `union_cavalry_artillery.json` and `confederate_cavalry.json`. Full counts: NY 74, PA 74, VA 59, GA 38, NC 33, MA 18, AL 17, Regular Army 15, OH 14, SC 13, NJ 13, MS 12, MI 11, LA 10, ME 10, VT 9, WI 6, MD 5, IN 5, CT 5 (20 groups with >= 5, i.e. 19 states + Regular Army, not 17; Maryland and Indiana were dropped; Virginia is 59 not 42 because 17 Virginia cavalry regiments were left out; 11 smaller groups incl. a bogus "Multi-state"). State pages and "state totals equal unit_counts" must include cavalry. |
| seo-growth-21 | CONFIRMED | 512 monuments (`bundle.pretty.js:104440-110610`), `src` filled 9; 24 groups, 13 with >= 10 monuments; group counts exact (PA 122, NY 94, Individuals 64 ...). |
| seo-growth-22 | CONFIRMED | 9 POINTS averaging 116 words (137,139,128,104,81,118,91,123,128); Ewell `tick: 175` (`turning-points.html:58`) vs chronology tick 75 (11:15am). Content is inline JS (see 05). |
| seo-growth-23 | CONFIRMED (evidence-light) | ChatGPT referrals 14 verified in the Analytics PDF. Note: Google's `QAPage` rich result is for user-submitted answers, so it does not apply to a curated hub. |
| seo-growth-24 | CONFIRMED | `site-nav.js:161-198` injects nav/footer at render; `:194` single Gmail `mailto`; e.g. `search.html` has 1 raw `<a>` and empty `#gtbg-nav-mount`/`#gtbg-footer-mount`. |
| seo-growth-25 | CONFIRMED | 29 source strings exact (but 3 are Busey variants and "Pfanz trilogy" duplicates the Pfanz volumes, so about 25 distinct works); `terms.html` promise and scraping sentence quoted correctly; JSON-LD `author` Mike Legere at `index.html:35`; overclaims at `index.html:719/754` ("minute-by-minute", "467 regiments and batteries"). |
| seo-growth-26 | CONFIRMED (+MISSED-5) | Terms contradiction verified (scrape ban vs "free to reference ... please credit"); Google Dataset guidance verified (name + description 50-5,000 chars required; license, identifier, distribution, temporalCoverage, spatialCoverage, creator recommended). |
| seo-growth-27 | CORRECTED (minor) | Vercel/MERJ (published 2024-12-17): GPTBot and ClaudeBot fetch JS but do not execute it; Gemini and AppleBot do render; sample = nextjs.org plus two job boards (dated, small). "26 of 27 HTML files carry no quotable server-rendered prose" is overstated: static prose >= 150 words exists on aftermath (321), privacy and terms (296 each), watch-together (229), viewshed (159), unit-rendering-reference (158) and the hidden `index.html` block (160); none is entity content, so the point stands, but the count should read "no entity-level prose". |
| seo-growth-28 | UNVERIFIABLE | Method/process finding; no checkable evidence beyond the stated lack of volume data. |
| seo-growth-29 | CONFIRMED (minor) | Savas Beatie figures verified; ABT "Added by 1928 Educators" and "Estimated Casualties: 51,112" verified on the ABT page; the "16:51" ABT video length is not on the page (search says about 20 minutes) and is unverified. |
| seo-growth-30 | CORRECTED (minor) | Existence verified: Marine Corps University LibGuide (title "Maps - Battle Studies: Gettysburg"), Lesson Planet, Family Tree Magazine "7 Steps to Trace Gettysburg Ancestors", Civil War Seminars directory, Seminary Ridge Museum event, FamilySearch wiki page and ECW "At the Lectern" (403 to curl, confirmed by search), Wikipedia WP:ADV wording. Corrections: teachthecivilwar.com "Virtual Field Trips" is the vendor's own paid offering, not a third-party resource list, so it is a poor "list our kit" target; the Seminary Ridge Museum page promotes the paid app's creator (handle with care); CWRT Congress and daggered targets are unverified. |
| seo-growth-31 | CORRECTED (minor) | Classroom `share?url=` form documented with title/body/itemtype/courseid (no script needed). Standards note: CCSS RH.9-10.7 is "integrate quantitative or technical analysis (charts, research data)", not "integrating visual information such as maps" (that is RH.6-8.7); verify codes as the report says. IT-admin list derived from the report-only CSP omits `cdn.jsdelivr.net` (PeerJS, `watch-together.html:19`), `maps.googleapis.com` and `streetviewpixels-pa.googleapis.com` (`index.html:49-51`), and the CSP is known-incomplete: derive the list from a HAR of a full session instead. |
| seo-growth-32 | CONFIRMED (+MISSED-1) | `embed.html:60` builds `https://gettysburginteractivemap.com/index.html?tick=...`; live `/embed.html` returns both `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors *`; the toml's `X-Frame-Options = ""` does not remove it. `/embed` (extensionless) returns DENY with no frame-ancestors at all. |
| seo-growth-33 | CONFIRMED (partly unverified) | `cinematic-export.html` exists; ABT video length unverified (see 29). |
| seo-growth-34 | CONFIRMED | The dev-copy regex matches real strings: `search.html:112` "Commander unrecorded", `union_regiments_i_ii_corps.json:26` "alias for U-84NY", `documentary.html:89` "Tick N", four "YouTube vignette" notes. Calendar dates remain [U]. |
| seo-growth-35 | CONFIRMED | `privacy.html` lists Netlify RUM only and says no third-party analytics beyond monitoring; Netlify Web Analytics is undisclosed; PeerJS from `cdn.jsdelivr.net` is also undisclosed. Netlify Analytics counting bots is supported by Netlify forum/blog sources. |
| seo-growth-36 | CONFIRMED | Analytics PDF: Germany 210, China 170, Singapore 152, Hong Kong 96 = 628 of 3,389 (18.5%); scanner table exact. The "`/` 181 not found" row is consistent with non-GET probes: `OPTIONS /` returns 404 live (POST 400, PUT 405). |
| seo-growth-37 | UNVERIFIABLE | CI/monitoring design; no evidence to test. |
| seo-growth-38 | CORRECTED | Baselines verified (3,389 PV, 1,529 UV, search 63+59+38+13 = 173, ChatGPT 14; RUM LCP/INP/CLS/FCP Poor, FID Good). "referrals 2,221" includes 2,034 "Direct traffic". Roadmap is over capacity and omits finding 14 (MISSED-6). |

### Corrections in one place (copy into the plan)

1. `_redirects`/`netlify.toml` can match query strings; drop the JS redirect for `/regiment?unit=` (seo-growth-13 item 8).
2. State counts must include cavalry: 19 states + Regular Army with >= 5 units; Virginia 59, NY 74, PA 74 (seo-growth-20).
3. Stone Sentinels July 2 is about 9.4k words and 22 entries, not 15k+/40-50 (seo-growth-16, competitor table).
4. Primary-domain change does not reduce the http://www double hop (seo-growth-03).
5. Slack has no `/unfurl`; use a new image URL, `?v=`, or delete-and-repost (seo-growth-02).
6. `twitter:image` is on 11 pages; the broken image is on 21 pages, not 26 (02, 11).
7. `turning-points.html` is inline JS, not fetch (05); three of the listed `/?...` emitters are already root-form (03).
8. `tier_proto.py` prints different brigade numbers than the report; regenerate the appendix table from a script that reproduces it.

### MISSED issues (in scope, not in the report)

**MISSED-1 (medium, blocks 03/32).** Path-keyed `netlify.toml` rules do not cover the extensionless twin of a file. Live: `/diagnostics.html` 404 (force rule) but `/diagnostics` returns 200 with the internal diagnostics page (5,349 B, no robots meta); `/embed.html` gets `frame-ancestors *` but `/embed` gets `X-Frame-Options: DENY`; `for = "/*.html"` cache rule (no-cache for bfcache) does not apply to `/dashboard`. The report cites the diagnostics rule as proof of `force` but never notices the twin. Fix: add `from="/diagnostics" ... 404 force`; duplicate header blocks for `/embed` and `/embed/*`; in the redirect matrix (Appendix D) test every rule in both spellings; and settle the canonical-form conflict now (prov-recon-35/36 keep `.html`; this report goes extensionless): whichever wins, header/redirect rules must be re-keyed in the same deploy.

**MISSED-2 (medium, 09).** Service worker on the new landing. Only `index.html:258-275` registers `sw.js`, and `sw.js` precaches `/assets/index-Cg8FAMXN.js` (2.28 MB raw, about 600 KB brotli) plus CSS with `skipWaiting`/`clients.claim`, and the page reloads on `controllerchange`. If `/` becomes a landing that keeps this script, every search visitor silently downloads the app and can get a reload (C6) on a "static" page. Fix: register only on `/map`; landing has no SW; ship a one-time cleanup (bump `CACHE_NAME`, handle the old `/`-scoped registration) and make PRECACHE derive from the build, not hard-coded hashes.

**MISSED-3 (medium, 09/03).** `site-nav.js:212` `wireBackLinks()` selects `a[href="/"]` and uses `history.back()` to restore the map from bfcache (added deliberately, see comment). After landing-first, back links must target `/map` and the selector must follow, or "Back to the map" lands on the landing page. Today's ten `.back` links point at `/index.html` (not matched by the selector), so they already force a full reload with splash replay: fixing them to the canonical map URL is itself a UX win. Also: gate returning users on `gtbg_onboarded` as well as `gtbg_seen` (existing users only have `gtbg_onboarded=1`).

**MISSED-4 (medium, 01).** Restore the old Search Console verification file first (see verdict 01): 52 bytes, present in Downloads and `tmp-deploy-history/b_jun23/`. Must return 200 at its exact URL, so exclude it from any `/*.html` redirect (explicit-rows approach in 03 is safe; a `/*.html` wildcard is not).

**MISSED-5 (medium/high, 14/26).** Provenance is wider than Busey and Martin and one YouTube note. Metadata sources include copyrighted atlases (Gottfried, The Maps of Gettysburg, Savas Beatie 2013; Laino, Gettysburg Campaign Atlas 2014; Desjardin's map 2011) and "Google Maps / satellite imagery verification"; a fourth "YouTube vignette" note is at `chronology_day1.json:31`; the channel "Gettysburg Battle - Fully Animated" is run by the paid app's creator (Seminary Ridge Museum event page: "creator of Gettysburg Animated Battle Map APP"). Publishing modeled positions under CC BY 4.0 (26) needs a provenance audit of which keyframes came from which atlas/video and a check of Google imagery terms. Fix: extend Q2/Q3, publish the dataset without positions first, keep positions "view only" until cleared.

**MISSED-6 (medium, 38/17).** Roadmap feasibility: using the report's own sizes (S .25, M 1, L 3.5, XL 8) W3 sums to 11 person-days (13 + 10 + 11 + 12), W8 to 9, W9 to 11.5, against about 4 days/week; and finding 14 (enrichment, XL, prerequisite for brigade pages that need 250 words and an OR excerpt, and for all Tier-B pages) is not scheduled anywhere in W0-W12, although W8/W9 release brigade and Tier-B pages and the data alone gives 0 of 101 brigades >= 250 words. Fix: schedule 14 (computed bucket first) from W2, cut W3 to generator MVP, gate W8/W9 releases on 14 output, add a per-week capacity check row.

**MISSED-7 (low, 02/08).** Sequencing hazards: (a) real screenshots taken now bake known bugs into permanent share cards and PWA screenshots (C3 header "July 5" on Day 3, C4 clock errors, C1/C2 mobile layout at 375 px); crop them out, use an illustrated map card, or capture after the fixes; (b) `manifest.id`: choose the permanent value now and never change it (start_url can change).

**MISSED-8 (low, 30/25).** No email/DNS hygiene: `nslookup` shows no TXT/MX (G2 noted "no SPF" but no action). Outreach and Corrections depend on email from a Gmail address. Fix: role address at the domain via forwarding, SPF/DKIM/DMARC (or a null `v=spf1 -all` plus DMARC if no mail is sent), then use it in footer, About and outreach.
