# SEO and Core Web Vitals audit

Date: 2026-10-31. Method: static reading of `release/R1e/dist` (the frozen candidate; the R1f build adds only PERF5 on top) and the sources under `tools/t0`, plus polite plain GETs of the live production site (one request per 3 s, `robots.txt` honoured, User-Agent "GettysburgSEOAudit/1.0"). No browser, no build, no Lighthouse was run on this machine, so every number below is either (a) a byte count computed from the files, (b) a header/HTML fact read from the live site, or (c) labelled "expected" or "needs browser verification". Nothing here is a measurement of a vital.

This file is appended to as work proceeds. Sections: 0 key finding, A field vitals, B SEO, C implementation and verification, D what is already good, E needs browser verification.

## 0. Key finding (read this first)

**The Netlify RUM export measured the old production build, not R1e.** The live site today still serves the build the baseline lock describes: entry `assets/index-Cg8FAMXN.js` (`tools/t0/README.md`; the live `index.html` references exactly that file, and the live HTML is 40,415 bytes against R1e's 79,482). R1e is not deployed (CLAUDE.md: the owner publishes zips; the production deploy is `6abd6d62`, which is also the deploy id inside the RUM token in the live HTML). The head of the live page, read on 2026-10-31:

| Live production head (read) | Effect on a slow phone |
|---|---|
| `<link rel="modulepreload" href="/assets/index-Cg8FAMXN.js">`, 2,280,438 bytes raw, 604,236 bytes brotli (measured with `Accept-Encoding: br`) | The 604 KB download starts at HTML-parse time and competes for the same slow pipe as the render-blocking files below. At 1.6 Mbit/s (Lighthouse "slow 4G" class) 604 KB alone is about 3.0 s of transfer. |
| `<link rel="stylesheet" href="/site-nav.css">` (render-blocking, 2,312 B br, `max-age=0,must-revalidate`) and `<script src="/site-nav.js">` (classic, synchronous, in `<head>`, 5,312 B br, `max-age=0,must-revalidate`) | Parsing stops until it arrives; a revalidation round trip every visit. |
| 6 `preconnect` (api.mapbox.com, events.mapbox.com, a/b.tiles.mapbox.com, www.google.com, maps.googleapis.com, streetviewpixels-pa.googleapis.com) + 2 `dns-prefetch` | Five of the six origins are not needed for the first paint; each costs DNS+TCP+TLS on a high-latency link while the HTML is still arriving. |
| app stylesheet loaded with `rel=preload ... onload="this.rel='stylesheet'"`, 40,827 B raw / 5,108 B br | The app's CSS can arrive after React has painted: unstyled React DOM then restyled = layout shifts (CLS). |
| `<script async id="netlify-rum-container" src="/.netlify/scripts/rum">` injected by Netlify at the end of the page | Small, async; not a vitals cost of note (see A.6). |
| `Cache-Control: public,max-age=0,must-revalidate` on `/` | Correct for HTML. |

R1e (and R1f) already change every one of these (A.2): no modulepreload, one preconnect, stylesheets `media="print"` switched on after load, `site-nav.js` `defer`, the 2.3 MB app imported only after First Contentful Paint, a static HTML splash plus crawlable text as the first paint, the layout (`data-layout`) chosen by an inline script before first paint. The lab already shows R1e at FCP and LCP 344 ms and INP 152 (desktop) / 176 ms (phone) at 4x CPU (`tools/t0/PERF4-README.md` line 53). So:

1. **Highest expected field impact: deploy R1e/R1f.** Nothing else in this document can move the field numbers as much, because the field numbers describe a different head, different loader and different CSS strategy.
2. Then watch the Netlify RUM page for 28 days (the p75 window is 28 days, so the old data ages out only gradually; a 2-3 day look at the daily series is the earlier signal). "Green everywhere in the field" can only be confirmed with that data; nobody can promise it from the lab.
3. Remaining field risks in R1e itself, ranked in A.3 to A.5.

## A. Field vitals: why real visitors were Poor where the lab is green

Bytes are computed from the files (gzip level 9 and brotli quality 11 with Node zlib). Netlify's own brotli of the live files is smaller (live entry 604,236 B against 656,559 B here for R1e), so the R1e figures are upper bounds.

### A.1 Critical-path weight, per route (R1e dist)

| Route | HTML raw / gzip / br | Blocking in `<head>` | Needed for the app, deferred | Notes |
|---|---|---|---|---|
| `/` (the map) | 80,622 / 24,738 / 21,044 | nothing external (inline CSS 24.7 KB, inline JS 46.7 KB) | `site-nav.js` (20,493 raw / 6,118 br, `defer`), `site-nav.css` (12,721 / 3,363) and app CSS (52,444 / 7,248 br), both `media=print` then switched on; then `import()` of the entry `index-c2afeeda.js` 2,676,251 raw / 798,794 gzip / 656,559 br, one task after First Contentful Paint | live production today: HTML 40,415 raw; entry 2,280,438 raw / 604,236 br; classic blocking `site-nav.js` and `site-nav.css`; `modulepreload` of the entry in `<head>` |
| 19 sub-pages without a map | 4 KB to 33 KB raw | `site-nav.css` (render-blocking; no `Cache-Control` rule, so it revalidates on every view) | `site-nav.js` at the end of `<body>` (classic, harmless there) | page JavaScript is inline (3 KB to 22 KB) |
| 8 sub-pages with a map (camera, cinematic-export, compare, ground-remembers, immersive, sandbox, viewshed, watch-together) | 10 KB to 33 KB | `mapbox-gl.css` v3.24.1 from `https://api.mapbox.com` (cross-origin, render-blocking) and `site-nav.css` | `mapbox-gl.js` v3.24.1 from `https://api.mapbox.com` (`defer`) | a TLS connection to a third party before first paint |

Compression is applied by Netlify (live responses carry `Content-Encoding: br`); `_headers` need not set it.

### A.2 What the field numbers describe, and what R1e already changed

The live HTML read on 2026-10-31 (section 0) is the old head. The chain a slow phone runs on production is: DNS + TCP + TLS (about 4 round trips) -> HTML (40 KB) -> one parse pass discovers `site-nav.css` (blocking), `site-nav.js` (blocking), the 604 KB module preload and five extra preconnects -> first paint waits for the two blocking files while 604 KB of JavaScript shares the same link. That mechanically explains **FCP p75 over 3 s**. LCP on this site is text: the HTML splash and the crawlable `#seo-content` block paint together, so LCP follows FCP (a `<canvas>` is not an LCP candidate, so the Mapbox map, whose satellite tiles arrive late from `api.mapbox.com`, is **not** the LCP element). This is a derivation from the markup, not a trace; the check that confirms it is in section E (E1).

R1e removes every item of that chain (verified in `release/R1e/dist/index.html`: no `modulepreload`, one `preconnect`, both stylesheets `media="print"`, `site-nav.js` `defer`, the loader waits for the `first-contentful-paint` entry before `import()`).

### A.3 Ranked causes for the field, by expected impact

| # | Cause | Metric | Evidence | Expected impact | Action |
|---|---|---|---|---|---|
| 1 | The field was measured on the old build; R1e/R1f is not deployed | FCP, LCP, CLS, INP | section 0 | Very high: removes the 604 KB module preload and the blocking files from the first-paint path; adds PERF2 to PERF5 | Owner: publish the R1f zip; then read RUM daily |
| 2 | Execution cost of the entry (2.68 MB raw JavaScript, 17 percent more than production's 2.28 MB) on a low-end phone: parse, compile, evaluate right after FCP blocks input | INP, TBT | file sizes above; the lab figure (FCP/LCP 344 ms, INP 152/176 ms at 4x) is a fast machine slowed down, not a phone 6x to 10x slower on a 3G radio | High for field INP; cannot be quantified without the browser | Split features the first screen does not use (Walkthrough, Monuments, panels) out of the entry. That changes the bundle, so it is not a static patch: follow-up F1 |
| 3 | After the entry runs the app fetches data (terrain 18 KB, three chronology files 21-23 KB, placements, vignettes, order of battle 352 KB in `data/oob`) and Mapbox fetches style and satellite tiles from `api.mapbox.com` (a second origin, preconnected) | time until the map is usable; INP of the first taps | `index-c2afeeda.js`: `fetch("/data/chronology_day1.json")`, `mapbox://styles/mapbox/satellite-v9` | Medium, not a vital by itself | Already mitigated by PERF2 to PERF5 (program precompile, frame governor). Nothing static to add |
| 4 | The 8 map sub-pages load `mapbox-gl.css` from the Mapbox CDN as a render-blocking stylesheet | FCP, LCP on those routes | head of `camera.html` etc. | Medium on those routes | Self-hosting needs an owner decision (Mapbox terms); a non-blocking pattern needs a browser check for CLS: F2 |
| 5 | Cache lifetimes: `site-nav.css`, `site-nav.js` and `/img/*` have no `Cache-Control` rule (Netlify default `max-age=0, must-revalidate`); `/og/*` `max-age=0` | repeat-view FCP on sub-pages (one conditional request per blocking file) | `_headers` lines 391-428 | Low to medium for repeat views; none for first views, which dominate p75 for search traffic | The files are referenced as `?v=<release>` but `_headers` cannot match a query string, so `immutable` would also apply to the bare path; recommended `public, max-age=86400, stale-while-revalidate=604800` for the two files and `/img/*`. Needs a change in `tools/t0/config/gen.mjs` (shared, not mine): F3 |
| 6 | CLS: nodes inserted after first paint | CLS | (a) the splash and `#seo-content` are `position:fixed`/removed, so their removal moves no sibling; (b) `#gtbg-onboarding-banner` is inserted by an inline script under the chooser heading of the first-run screen, which shifts the chooser's centred content by about half the banner height on every first visit; (c) production painted React DOM before its CSS arrived (preload + onload swap), R1e switches the app CSS on before importing the entry (3 s cap) | (b) small, real: expected 0.01 to 0.05 on a first-visit phone, not 0.25 alone; (c) was the likely bulk on production and is gone in R1e | (b) needs the browser: record `layout-shift` entries on a first visit; the fix would be to reserve the banner's height in the chooser container: F4 |
| 7 | Third-party scripts | all | live HTML ends with `<script async id="netlify-rum-container" src="/.netlify/scripts/rum">` (added by Netlify, not in the dist); Mapbox GL and its telemetry `events.mapbox.com`; Google Street View only in the Walkthrough | Low (RUM is async and small) | None. The RUM script is what measures these vitals: keep it |
| 8 | Fonts | CLS, LCP | no `@font-face` and no Google Fonts link anywhere in `dist` (grep); system stack (`Georgia`, `system-ui`) | None | Nothing to fix; `font-display` does not apply |
| 9 | Images | LCP, CLS | the only `<img>` on the site: one each on aftermath, education, turning-points, all with `width`/`height`, `loading="lazy"`, `decoding="async"`, alt text, 1000 px JPEG | None on the map. If one is above the fold on a phone, `loading="lazy"` delays an LCP image | Check which element is LCP on those 3 pages (E3): F5 |
| 10 | Service worker | repeat views | `sw.js` registers on idle after `load`; caches only `/assets/*` and `/tiles1863/*`, never navigations | Positive for repeat views | None |
| 11 | Entry cache | repeat views | `/assets/*` `public, max-age=31536000, immutable`, hashed names | Good | None |

### A.4 What the lab cannot show

The lab is a desktop with 4x CPU throttling and a local server. The field p75 includes (i) 3G and slow 4G radios with 150 to 400 ms round trips, (ii) phones 6x to 10x slower than a desktop core, (iii) cold caches and no service worker on a first visit (which is what search traffic is), (iv) a CDN edge far from the user. None of that is reproducible on this machine, which is why "lab green" and "field Poor" are compatible. Conclusion: ship R1f, then judge by field data, then act on A.3 items 2, 4 and 6.

### A.5 Static facts used above

- `release/R1e/dist/index.html`: one `<link rel="preconnect" href="https://api.mapbox.com" crossorigin>`; both stylesheets `media="print" data-gt-defer`; the boot loader waits for `first-contentful-paint`, with a 3 s timer fallback.
- `_headers`: documents `no-cache, must-revalidate`; `/assets/*` and `/tiles1863/*` `max-age=31536000, immutable`; `/data/*` `max-age=3600`; `/icons/*` 86400; `/sw.js` no-store; HSTS `max-age=31536000; includeSubDomains; preload`.
- The home page runs two inline scripts that poll the DOM during boot (an 8 s `MutationObserver` on `body` and a 200 ms `querySelectorAll('body *')` poll, 25 tries) to inject the onboarding banner and label toolbar icons. At about 930 DOM nodes this is cheap; it is not a ranked cause, but it runs in the window where first taps land (E5 asks the browser run to confirm).

## B. SEO: technical state of every shipped page

Google guidance actually read (fetched 2026-10-31, plain GET, one request per 3 s; `developers.google.com/robots.txt` allows these paths):
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide (descriptive titles; meta description "short, unique to one particular page"; a sitemap "isn't required")
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics (links must be `<a>` elements with an `href`; use the History API, not fragments; error pages need a real 404 or a noindex)
- https://developers.google.com/search/docs/appearance/core-web-vitals and https://web.dev/articles/vitals (targets at the 75th percentile: LCP within 2.5 s, INP 200 ms or less, CLS 0.1 or less, segmented by mobile and desktop)
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies (mark up only what is visible on the page; no fake reviews, no misleading content; JSON-LD is the recommended format)
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap ("Google ignores `<priority>` and `<changefreq>`"; `<lastmod>` is used only "if it's consistently and verifiably accurate"; 50 MB or 50,000 URLs per file)

Note on targets: the Netlify "Good" bands are the same three thresholds Google publishes, so "green in the field" means p75 LCP 2.5 s, INP 200 ms, CLS 0.1. The lab figure for INP on the phone shell (176 ms at 4x) is inside that, but with only 24 ms of margin on a fast machine; a slow phone will exceed it (A.3 item 2).

### B.1 Per-page scan of R1e (script over all 27 files, counts exact)

| Check | Result |
|---|---|
| `<title>` | present on every HTML page except the 53-byte Search Console verification file; 28 to 71 characters; all unique; pattern "Page - Gettysburg Animated Battlefield Map" |
| meta description | present on all indexable pages; 72 to 175 characters; unique (privacy/terms differ too) |
| canonical | on every indexable page, self-referencing, `.html` form for sub-pages and `/` for the home page; equals the sitemap `<loc>` |
| robots meta | `noindex` only on `ar.html`, `embed.html`, `404.html` (intended: D-SCOPE-TIERS hide-now, embed framing, error page). No `X-Robots-Tag` in `_headers` (the staging variant adds it, see `netlify.toml` comment) |
| h1 | exactly one on every indexable page; the home page has it in a screen-reader-only header (text identical to the visible splash title) and a second inside `<noscript>`; `#seo-content` uses `h2` |
| Open Graph | complete (title, description, type, url, image 1200x630 with width, height, alt) on the home page; title/description/type/url/image on all sub-pages; none on privacy, terms (acceptable) |
| Twitter card | present on the home page and 10 of the 19 indexable sub-pages; missing on 9 of them (all 9 fixed by PG-zseo) and on `ar` (noindex, left out) |
| JSON-LD | one block, on the home page only (`WebApplication` with `about: Event`, July 1-3 1863, and `author: Person "Mike Legere"`). Valid JSON. No sub-page has structured data |
| images | 3 `<img>` in the whole site (aftermath, education, turning-points): alt text, width, height, `loading=lazy`, `decoding=async` present |
| viewport / lang | on every page (`lang="en"`); the GSC verification file has neither (a 53-byte file, correct) |
| internal links in static HTML | home -> 17 pages. Every sub-page carries only 2 static anchors (home); the navigation menu and footer (with Privacy, Terms, Contact, User Guide) are inserted by `site-nav.js` at load. `report.html`, `cinematic-export.html`, `privacy.html`, `terms.html` have **no static inbound link from any page** |
| text a crawler without JavaScript reads | sub-pages: 27 to 365 words (median about 100); the tools render their content with JavaScript. Home page: 249 words plus a 17-link tool list; the map itself is a canvas (no text) |
| sitemap.xml | 20 `<url>` (home + 19 pages), `https`, absolute, all exist in the dist, all equal their canonical, none noindex. No `<lastmod>`. `changefreq`/`priority` present (ignored by Google, harmless) |
| robots.txt | `User-agent: *`, `Allow: /`, `Sitemap: https://gettysburginteractivemap.com/sitemap.xml` (same as live) |
| HTTPS / redirects (live, read) | `http://` -> 301 `https://`; `www.` -> 301 apex; unknown path -> real `404`; HSTS `max-age=31536000; includeSubDomains; preload`; both `/search` and `/search.html` answer 200 with one canonical (duplicates consolidated by the canonical) |
| duplicate/thin content | no duplicate titles or descriptions; the tool pages are thin as text (they are tools), see B.2 item 1 |
| site name / manifest | `manifest.json` `description` still reads "467 regiments ... five-minute snapshots", contradicting the corrected home description ("405 units ... 675 snapshots"): a consistency and accuracy defect (F7) |

### B.2 Findings ranked by expected impact on search visibility

1. **There is nothing for the long-tail queries to land on.** The whole site is one map URL plus 19 tool pages. Queries such as "Gettysburg day 2 map", "Little Round Top map", "Pickett's Charge map", "20th Maine at Gettysburg", "Gettysburg monuments map", "Gettysburg order of battle by regiment", "Gettysburg timeline hour by hour" have no page of their own: the units, moments, landmarks and monuments live in JSON that the single-page app renders into one canvas. `regiment.html` and `/?tick=N` are parameterised views whose canonical is the bare page, so they cannot rank separately. Only static, linkable, content-bearing pages (one per day, per turning point, per key moment, per landmark, per regiment or brigade, per monument group) built from the site's own data can add ranking surface. This is the largest SEO lever, it is content creation under the evidence rules (tiers, "unreviewed" and "provisional" flags in `data/moments.json`; no invented facts), and it is a scope decision for the owner: **F8**, not done here. Nobody can guarantee that such pages would rank.
2. **Crawl paths in static HTML.** A crawler that does not run JavaScript, and Google's first pass before rendering, sees on a sub-page only a link to the home page; on the home page 17 links. Four pages (report, cinematic-export, privacy, terms) had no static inbound link. **Fixed in PG-zseo**: `ZSEO-home-crawl-text` adds a linked list of every tool with that tool's own meta description plus links to privacy, terms and the user guide (text sits in `#seo-content`, under the fixed splash, removed when the app mounts, exactly as the existing text is). Sub-page footer links (`ZSEO-OPT-footer-links-*`) are held back for a browser check (E4).
3. **Structured data is minimal.** Added: `WebSite` on the home page and `WebPage` + `BreadcrumbList` on the 19 pages, each built from the page's own title, description and canonical. Not added, on purpose: `Organization` (no truthful legal entity or logo is stated on the site), `AggregateRating`/`Review` (none exist), `Place`/`TouristAttraction` (the site is a map of a place, not a place; a `Place` with an invented address or geo would break the policy read above), `Dataset` (needs creator, licence and distribution statements the owner has not made; **F9**), `Event` beyond the existing `about` block, `Article` (needs an author and dates). The existing home `author: Person "Mike Legere"` is the owner's own name already in production; only the owner can say whether it stays (OWNER-ACTIONS).
4. **Titles.** The home title is the brand only (35 characters): `Gettysburg Animated Battlefield Map`. It lacks the words of the target queries ("interactive", "battle map"). Offered as an owner decision, not shipped: `ZSEO-OPT-home-title` = "Gettysburg Interactive Battle Map - Animated Map of July 1-3, 1863" (66 characters; Google may rewrite titles regardless). It changes a verified identity field (V6) and the brand wording, so it is the owner's call.
5. **Social cards.** `twitter:card` was missing on 9 indexable pages (all fixed; `ar` is noindex). X falls back to `og:` for title, description and image once `twitter:card` is present.
6. **Sitemap.** Complete for the indexable set. `lastmod` omitted: nothing in the dist records when a page last changed, and a uniform date would be untruthful (Google uses it only when it is "consistently and verifiably" accurate). Do not add `changefreq`/`priority` work: Google ignores both. If the owner wants `lastmod`, it must come from the build (the date of the last release in which that page's bytes changed), which is a build feature (F10).
7. **Manifest description stale** (F7): `tools/t0/overlay/common-r1d/manifest.json` (`description` only; V6 checks only name, short_name, start_url). It cannot be patched by a page group because the overlay is copied over the dist after the page phase.
8. **User guide PDF.** `user-guide.pdf` is 5,124,513 bytes, served `Content-Disposition: attachment` and linked from the footer. Fine for users; it will rarely be indexed as a page. Not a defect.
9. **Core Web Vitals as a ranking input.** Google documents page experience, including Core Web Vitals, as something its ranking systems "seek to reward", alongside many other signals (core-web-vitals page, read). Fixing section A is a sound step; the size of the ranking effect is not knowable, and relevance of content (item 1) matters more for the target queries.
10. **Mobile.** Viewport on every page; tap-target and layout work is in the POLISH/MOBILE groups; nothing static to add.

### B.3 Content depth against target queries (what exists today)

| Target query theme | Page that answers it today | Gap |
|---|---|---|
| Gettysburg battle map / interactive map | `/` | canvas-only; 249 words of static text; fine as the hub |
| day-by-day / timeline | `/documentary.html` (24 key moments, narrative text), `/turning-points.html` (9 moments) | text is JS-rendered; no per-day URL |
| monuments | `/` (Monuments layer in the app) | no static page; `data/monuments.json` is a 2.5 KB starter set of state monuments whose own note says it is not the park's full list and cites Wikipedia/NPS-derived listings (below the evidence standard of CLAUDE.md law 4 for any claim that would be published as a page); the Monuments layer's own features are inside the app bundle |
| virtual walkthrough | `/` (overlay) | no URL, no page |
| regiments / soldiers / ancestors | `/regiment.html`, `/find-ancestor.html`, `/search.html`, `/report.html` | one URL per tool; no per-regiment URL |
| casualties | `/dashboard.html`, `/living-ledger.html` | JS-rendered |
| aftermath, students | `/aftermath.html` (365 words), `/education.html` | the only text-heavy pages |

## C. Implementation (candidate; nothing built, nothing registered, nothing deployed)

| Item | File | What it does | Verified by |
|---|---|---|---|
| Generator | `tools/t0/seo/gen_zseo.py` (`--check` exits 1 on drift) | Writes the three files below; asserts every anchor (single-line, expect 1) against `release/R1e/dist` | `python tools/t0/seo/gen_zseo.py --check` -> "differs: (nothing)" |
| Page group | `tools/t0/patches-next/PG-zseo.json` (22 patches, `"train": "R1f"`, sorts after `PG-zperf5`) | `ZSEO-head-<page>` x19: `WebPage` + `BreadcrumbList` JSON-LD after the canonical line, plus `twitter:card` on the 9 pages without one; `ZSEO-home-website-jsonld`: `WebSite` block; `ZSEO-home-crawl-text` and `ZSEO-home-crawl-css`: linked tool list with each page's own description, and links to privacy, terms and user guide, in `#seo-content` | `node tests/t0/seo.spec.mjs` replays the group in memory on R1e: 17/17; `python tools/t0/overlap.py` shows no overlap involving these anchors; `python tools/t0/hygiene.py` ok |
| Identity list | `tools/t0/seo/identity-zseo.json` | the 9 `twitter:card changed undefined -> "summary_large_image"` lines `verify_release.mjs` V6 will report; merge into `tools/t0/identity-R1f.json` (R1f currently falls back to `identity-R1d.json`, so the pack agent creates it as R1d's list plus these) | strings built from the same template V6 uses (`${f}: ${k} changed ${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`); not run (no build allowed) |
| Held-back candidates | `tools/t0/seo/optional/PG-zseo-opt.json` (22 patches, `"optional": true`, NOT in `patches-next`) | `ZSEO-OPT-home-prefetch-entry` (E2), `ZSEO-OPT-home-title` (owner decision), `ZSEO-OPT-footer-links-<page>` x20 (E4) | anchors asserted by the generator; behaviour needs the browser |
| Test | `tests/t0/seo.spec.mjs` | 17 checks: title length and uniqueness, one h1 outside noscript, description length and uniqueness, canonical self-reference, noindex only on ar/embed/404 and no `X-Robots-Tag`, sitemap (absolute, exists, equals canonical, not noindex, complete, no invented lastmod), robots.txt, JSON-LD parses and holds no rating/review/address/phone/e-mail/price/date, WebPage + BreadcrumbList agree with canonical/title/description, Open Graph and `twitter:card`, image attributes, internal links resolve, every sitemap page plus privacy and terms reachable from the home page through static links, no AI/Claude/Anthropic/how-it-was-built string | `node tests/t0/seo.spec.mjs` (replay, 17/17), `--dist release/R1f/dist` after the R1f build (no replay), `--no-patch` shows the three patched-only checks failing on R1e (proof they test something) |

Not done by design (shared files or other owners): `_headers` cache rules (`tools/t0/config/gen.mjs`), `manifest.json` description (overlay file), sitemap `lastmod`, any change to the app bundle.

Registration for the R1f pack agent: add `PG-zseo` to `PAGE` in `tools/t0/r1f_sync.py` (it reads `patches-next/PG-zseo.json`), add a `tests` row for `seo.spec.mjs` in `tools/t0/run_suites.mjs` (`[SP('seo'), '--dist', R1F_DIST]`, no browser, 1 s), merge `identity-zseo.json` into `identity-R1f.json`.

### C.1 Recommended follow-ups that are not static patches

- **F1 (INP, high)**: split features the first screen does not use out of the 2.68 MB entry (Walkthrough, Monuments, panels) so a slow phone parses less before the first tap. Measure in the browser (E5) before and after.
- **F2 (FCP on 8 map pages)**: `mapbox-gl.css` render-blocking from the Mapbox CDN. Options need the owner (self-host under Mapbox's terms) or a CLS test (non-blocking load with a reserved container).
- **F3 (repeat views)**: in `tools/t0/config/gen.mjs` give `/site-nav.css`, `/site-nav.js` and `/img/*` `public, max-age=86400, stale-while-revalidate=604800` (CACHE_FILES / CACHE_DIRS tables). The `/img/*` files have fixed names, so no `immutable`.
- **F4 (CLS)**: reserve the height of the first-run banner (`#gtbg-onboarding-banner`, about 60 px with margin) inside the chooser container, or add it without moving the chooser (absolutely positioned below it). Needs E3 to measure first.
- **F5**: confirm which element is LCP on aftermath, education, turning-points; if an image is above the fold on phones, drop `loading="lazy"` and add `fetchpriority="high"` on that one image.
- **F7**: change `description` in `tools/t0/overlay/common-r1d/manifest.json` to the home meta description (the "467 ... five-minute" text is stale and now contradicts the page).
- **F8 (the big one)**: owner decision on static, data-built content pages (per day, per turning point and key moment, per landmark, per regiment/brigade). Rules that would apply: text only from the site's own reviewed data; `unreviewed` and `provisional` items carry the tier mark in the page; no monument page from `data/monuments.json` until its sources meet law 4.
- **F9**: `Dataset` JSON-LD for the order of battle once the owner states creator and licence.
- **F10**: build-time `lastmod` per page.

## D. What is already good (kept as is)

- First paint is static HTML with real text, no render-blocking file, app imported after First Contentful Paint (R1e), `contain: strict` root, fixed-size splash.
- No web fonts, so no font swap CLS and nothing to preload.
- Hashed, immutable asset names with one-year cache; service worker is cache-first for assets only and never touches navigations.
- Every indexable page: unique title, unique description, self-referencing canonical, Open Graph with a real 1200x630 image and alt text, one h1, viewport, `lang`.
- Honest structured data on the home page; nothing invented anywhere (checked by T0-SEO-08).
- HTTPS everywhere: http -> https 301, www -> apex 301, HSTS with preload, real 404 for unknown paths, developer pages and scanner probes return 404, noindex on `ar`, `embed`, `404`.
- Image attributes (alt, width, height, lazy, async) on all three content images.
- No mention of AI, Claude, Anthropic or how the site was built in any shipped text file (T0-SEO-14).

## E. Needs browser verification (do not claim until measured; not possible on this machine during a release acceptance run)

| # | Check | How |
|---|---|---|
| E1 | The LCP element and time on `/` for a cold, uncached, throttled phone (Slow 4G, 6x CPU), R1f against production | Chrome DevTools Performance panel or `PerformanceObserver({type:'largest-contentful-paint', buffered:true})`; expected: a text block of `#seo-content` or the splash, at FCP; if a later element wins, name it |
| E2 | `ZSEO-OPT-home-prefetch-entry`: FCP, LCP, time to first interactive control, with and without the patch, n >= 10 interleaved, throttled | Accept only if FCP and LCP do not move and time to interactive improves; else drop |
| E3 | CLS on a first visit (phone, desktop): list `layout-shift` entries and their sources on `/` including the chooser screen and the banner insertion; also aftermath, education, turning-points (lazy images) | `PerformanceObserver({type:'layout-shift', buffered:true})` with `sources` |
| E4 | `ZSEO-OPT-footer-links-*`: no visible flash of the static footer links before `site-nav.js` replaces them; CLS 0 on a 3G-throttled load; screenshot compare of the footer | |
| E5 | INP on `/` during the first 10 s on a 6x CPU throttle: first taps on the chooser, Play, a date jump; main-thread long tasks while the entry evaluates | DevTools trace; compare with the 4x figures in `docs/accept/PERF4-NOTES.md` |
| E6 | Rich Results Test / Schema Markup Validator on `/` and one sub-page for the new JSON-LD | https://search.google.com/test/rich-results (owner or any browser session; not a build step) |
| E7 | After deployment: Netlify RUM daily series for 7 days, then the 28-day p75 | the Netlify RUM page named in the task |
