# infra-netlify: Infrastructure, Security, Privacy, PWA plan

Specialist: infra-netlify. Site: https://gettysburginteractivemap.com (Netlify project friendly-lolly-da85c0).
Evidence date: 2026-09-30 (live probes 03:44 to 04:15 UTC). Everything below is a NO-BUILD plan: nothing was deployed, built or modified. Read-only curl probes, public DNS/RDAP lookups and public documentation only.

Conventions
- `DEPLOY` = C:/Users/mlege/AppData/Local/Temp/claude/site/deploy (identical bytes to `SRC`, same 119 files). Citations look like `netlify.toml:8` or `index.html:57`.
- `bundle.pretty.js:LINE` = plan-work/bundle.pretty.js (prettified deployed main bundle).
- Labels: VERIFIED = reproduced by me against the live site or a primary source on 2026-09-30; INFERRED = follows from verified facts but not directly observed; UNVERIFIED = could not be checked from outside (needs dashboard/browser).
- Effort: S under 0.5 d, M 0.5 to 2 d, L 2 to 5 d, XL over 5 d. Finding IDs are `infra-netlify-NN`.

---------------------------------------------------------------------------------------------------

## 0. Executive summary

The infrastructure is closer to good than the audit scorecard (Security B / B) implies, and it is also less safe than it looks in several places. Net:

1. Three claims in the earlier audit / BRIEF are wrong or incomplete and change the plan (details in section 1):
   - X1 (Mapbox token "unrestricted") is FALSE. The token is URL-restricted and enforced on tiles, TileJSON, geocoding and static endpoints (403 for no Referer, foreign Referer, localhost, netlify.app previews; 200 only for the production Referer). The earlier 200 came from the public-style endpoints (`/styles/v1`, sprite, glyphs), which are not restricted. The real residual risks are different: the exact allow-list is unknown, dev/preview builds get blank maps, users who strip Referer get a silent blank map, and the token is pasted as a literal in 11 places (2 in the bundle, 9 static pages).
   - X4 (diagnostics.html "correctly 404s") is INCOMPLETE. `/diagnostics` (extensionless) returns 200 because the `force` rule only matches `/diagnostics.html`. Same for `/unit-rendering-reference`. Netlify header/redirect rules match the path exactly as requested, and the site is served at both `/x` and `/x.html`.
   - N1 (redeploy trap: lowercased asset names would 404) is NOT supported by live evidence. Netlify matches paths case-insensitively (`/assets/index-cg8famxn.js`, `/assets/INDEX-CG8FAMXN.JS` and the correct-case URL all return 200 with identical bytes). Deploy the exact-case tree anyway, but this is hygiene, not an outage risk.
2. The single most damaging infrastructure defect is the service worker (C6): every first visit loads the app twice (Lighthouse trace: two Document requests at t=1 ms and t=909 ms) and, because each load creates a Mapbox `Map`, it creates two billable Mapbox map sessions (the same satellite tile appears twice with two different `sku=` values in the Lighthouse network log). The SW also provides no real offline support (HTML is never cached, no offline page), can cache error responses forever, and hard-codes hashed file names (install breaks on the next deploy that changes them).
3. CSP: enforcement is one config sprint away for static pages and two for map pages, because Netlify's edge processing does not alter inline script/style bytes (verified: sha256 of every inline block is identical live vs deployed), the bundle uses no `eval`/`new Function`, no web fonts and no `<img>` tags, and every runtime origin is known (on `/` the Lighthouse network log shows only same-origin, api.mapbox.com, events.mapbox.com and ingesteer.services-prod.nsvcs.net; two more origins appear only as user-opened frames: a Google Maps Embed Street View panel and an NPS.gov video page, see finding 19). MDN Observatory today: B (75), 11 of 12 tests passed; the missing test is almost certainly an enforced CSP.
4. Two security bugs are worth fixing regardless of CSP: a persistent DOM-XSS path in Watch Together (`watch-together.html:172` renders imported/stored tour notes with `innerHTML`; the page invites people to share tour files) and the guessable global room code (5 letters, `Math.random`, public PeerJS broker).
5. Privacy text is materially inaccurate/incomplete (privacy.html says Street View is embedded on documentary/report pages: there is no iframe in any static page; the Google frame is in the main app's walkthrough at `bundle.pretty.js:110661` and the app also frames an NPS.gov video page at `bundle.pretty.js:100461`; omits PeerJS + Google STUN + PeerJS TURN + jsDelivr; omits NPS; omits Mapbox telemetry fields; omits AR permissions; omits Netlify server-side analytics). Full replacement drafts for privacy and terms are in Appendix H.
6. New findings not in the audit: manifest/OG screenshots are one corrupt, duplicated placeholder PNG (IHDR says RGB, data is RGBA; day1.png == day3.png byte-identical, used by 21 pages as og:image); deep links `?t=&u=&z=&ll=`, `?tick=&vignette=`, `?unit=&tick=` are ignored by the app (only `?ancestor=` is parsed, `bundle.pretty.js:101019`); the `/icons/*` immutable-for-a-year rule sits on un-fingerprinted file names; two Mapbox maps disable attribution (ToS); Netlify serves the full site on friendly-lolly-da85c0.netlify.app (duplicate host); pretty-URL post-processing rewrites authored `.html` links to extensionless while canonical/sitemap/JSON-LD say `.html`.

What "A+" means for this area (targets used in the acceptance tests)
- MDN HTTP Observatory A+ (score 100+), securityheaders.com A+, Mozilla-style CSP Evaluator with no High findings; CSP enforced with no `unsafe-inline`/`unsafe-eval` in `script-src` and `style-src`; zero `securitypolicyviolation` events in the scripted crawl of all 25 public pages x 2 viewports.
- Lighthouse Best Practices 100 on both form factors (`csp-xss`, `inspector-issues`, `redirects`, `origin-isolation`, `errors-in-console` all passing); no self-redirect.
- PWA: installable on Android Chrome, desktop Chrome/Edge and iOS home screen with valid maskable icon, real screenshots (wide + narrow), shortcuts; offline fallback page; update prompt instead of forced reload; no forced reload anywhere.
- Every third-party origin is (a) inventoried, (b) minimal, (c) disclosed in privacy.html, (d) restricted at the provider (Mapbox URL restrictions, Google referrer + API restriction).

---------------------------------------------------------------------------------------------------

## 1. Corrections to the earlier audit / BRIEF (read first)

| Earlier claim | What I verified | Consequence for the plan |
|---|---|---|
| X1: Mapbox public token unrestricted ("answers 200 to a foreign Referer") | `GET api.mapbox.com/v4/mapbox.satellite/16/{x}/25030.jpg90?access_token=pk...` with Referer: none -> 403; `https://evil.example/` -> 403; `http://localhost:3000/` -> 403; `https://friendly-lolly-da85c0.netlify.app/` -> 403; `https://deploy-preview-1--friendly-lolly-da85c0.netlify.app/` -> 403; `https://gettysburginteractivemap.com.evil.example/` -> 403; `https://gettysburginteractivemap.com/` -> 200. Same enforcement on `/v4/mapbox.satellite.json`, `/v4/mapbox.mapbox-streets-v8/...mvt`, `/geocoding/v5/...`, static images. NOT enforced on `/styles/v1/mapbox/satellite-v9`, `/styles/v1/.../sprite.json`, `/fonts/v1/...pbf` (those returned 200 for every Referer; that is what the earlier test hit). Cache-buster (`&cb=`) used to rule out CDN caching. | infra-netlify-18 becomes "verify + harden + fix side effects", not "restrict". |
| X4: diagnostics.html correctly 404s | `/diagnostics.html` -> 404; `/diagnostics` -> 200 (serves the page; it only reads the visitor's own browser, so low risk); `/unit-rendering-reference` and `.html` -> 200 (noindex meta, loads Mapbox with the public token) | infra-netlify-12 |
| X4: embed.html has XFO DENY + frame-ancestors * ; `X-Frame-Options=""` "did not remove" | Confirmed. Additionally `Content-Security-Policy-Report-Only = ""` did not clear the site-wide Report-Only either. And the rule is keyed to `/embed.html` only: `/embed` (the clean URL) still gets XFO DENY and no `frame-ancestors`. Netlify staff (forum thread 26263): there is no way to unset an inherited header; empty values do nothing; more specific rules must come later to override. | infra-netlify-02 |
| N1: lowercased asset names in the zip = redeploy would 404 | Live: `/assets/index-Cg8FAMXN.js`, `/assets/index-cg8famxn.js`, `/assets/INDEX-CG8FAMXN.JS`, `/Assets/Index-Cg8FAMXN.js` all 200, 2,280,438 bytes; `/assets/helpmodal-cfv9t0zh.js` and `/assets/HelpModal-CFV9T0zH.js` both 200. Page URLs in the wrong case 301 to the lowercase canonical (`/Search.html`, `/SEARCH`, `/PRIVACY.HTML`). | Netlify serving is case-insensitive; the trap does not exist on Netlify. But URL-case variants are separate HTTP-cache and Cache Storage keys, so always ship and reference exact-case names. N1's real problem (no source) stands. |
| X3: CSP report-only lacks RUM host | Confirmed: Lighthouse `inspector-issues` lists `https://ingesteer.services-prod.nsvcs.net/rum_collection` as a CSP issue (lh_mobile.json). RUM beacon = `fetch(..., {method:"POST", keepalive:true, mode:"cors", headers:{Authorization:"Bearer <cwv-token>"}})` (`/.netlify/scripts/rum`, 11,141 bytes). It only runs when `window===window.top`, so framed embeds are not measured. | infra-netlify-01 |
| Privacy omits X | Also inaccurate: says Street View is embedded on documentary/report pages (there are no `<iframe>` tags in any static page; the Google frame is `bundle.pretty.js:110661` in the walkthrough panel; a second frame, `bundle.pretty.js:100461`, loads a full nps.gov video page from 17 `videoUrl` entries when the user presses "Show Video"). | infra-netlify-36 |
| T2: 181 "/" 404s not reproducible | Reproduced with `OPTIONS /` -> 404 and `GET /./` -> 404 (plain GET/HEAD 200, PUT/DELETE/PATCH/PROPFIND/TRACE -> 405, POST -> 400). Very likely the source of the "/" 404 line in Netlify Analytics. | infra-netlify-14 |
| Manifest/screenshots fine | `screenshots/day1.png` and `day3.png` are byte-identical (md5 3f6646c9...), 17,585 bytes, and corrupt: IHDR declares 1280x720 RGB (color type 2) but the inflated IDAT is 3,687,120 bytes = RGBA (1280*4+1)*720; PIL raises "unrecognized data stream contents". The decoded pixels are an 80-colour dark gradient placeholder, not a screenshot. 21 pages use it as `og:image`, 11 as `twitter:image`. | infra-netlify-25 |

---------------------------------------------------------------------------------------------------

## 2. Evidence log (how each fact was obtained)

Live headers (curl -I, 2026-09-30): `/`, `/embed.html`, `/embed`, `/privacy.html`, `/dashboard`, `/dashboard.html`, `/sw.js`, `/manifest.json`, `/assets/index-Cg8FAMXN.js`, `/data/chronology_day1.json`, `/user-guide.pdf`, `/icons/icon-192.png`, `/site-nav.js|css`, `/icons.svg`, `/screenshots/day3.png`, unknown path.
- Every response carries the identical site-wide header set from `netlify.toml:5-19`. Header rules match the path as requested: `/dashboard` got Netlify's default `public,max-age=0,must-revalidate` while `/dashboard.html` got the `/*.html` rule's `no-cache,must-revalidate`; `/embed` has no `frame-ancestors`, `/embed.html` has it.
- HTTP: `http://gettysburginteractivemap.com` -> 301 https apex; `https://www.` -> 301 apex (with HSTS); `http://www.` -> 301 https://www. (two hops). TLS: Let's Encrypt (CN=YE2), SAN apex + wildcard, valid 2026-08-12 to 2026-11-10 (Netlify auto-renews). TTFB from this machine 77 to 232 ms.
- Compression: `Content-Encoding: br` on JS (603,822 bytes), JSON, HTML.
- Netlify edge processing: live HTML differs from the deployed file by (a) Pretty-URL link rewriting (`href="/search.html"` -> `href='/search'`, attribute quotes normalised) and (b) an injected `<script async id="netlify-rum-container" src="/.netlify/scripts/rum" data-netlify-rum-site-id data-netlify-deploy-branch data-netlify-deploy-context data-netlify-cwv-token>` on EVERY HTML response (also 404, embed, dev pages). Inline `<script>`/`<style>` bodies are byte-identical (sha256 compared for index and dashboard).
- DNS (Cloudflare DoH): NS dns1-4.p09.nsone.net (Netlify DNS), A 98.84.224.111 and 18.208.88.157, no AAAA, no CAA, no MX, no TXT (no SPF/DMARC/verification), no DNSKEY/DS (DNSSEC off; Netlify DNS does not support DNSSEC per Netlify forum). RDAP (Verisign): registrar Name.com, registered 2026-06-13, expires 2027-06-13, status `client transfer prohibited`, `delegationSigned: false`.
- HSTS preload: hstspreload.org `status: unknown` (not submitted) and `preloadable` returns no errors/warnings (eligible).
- MDN Observatory v2 scan: grade B, score 75, 11/12 tests passed (test-level detail not retrievable).
- Google key probe (key `AIzaSyC-1eIr...`, `bundle.pretty.js:110610`): Geocoding, Directions, Distance Matrix, Elevation, Time Zone, Places (legacy and New), Static Maps, Street View Static -> all REQUEST_DENIED ("API not activated" / "legacy API not enabled"; project number 563067843889 appears in the error text). Maps Embed API works. Referrer restriction cannot be tested with curl: the Embed page shell is identical for every Referer.
- Mapbox probes with the public token (`pk.eyJ1IjoibWxlZ2VyZTk3ODki...`, payload `{"u":"mlegere9789","a":"..."}`, present in the bundle at `bundle.pretty.js:97210` and `:102899` and in 9 static pages): see section 1. `api.mapbox.com` and `events.mapbox.com` set no cookies. mapbox-gl.js v3.24.1 CDN file: `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=31536000`, sha384 computed (appendix D). Latest npm: mapbox-gl 3.32.0, peerjs 1.5.5, workbox-build 7.4.1, vite-plugin-pwa 1.3.0, @netlify/plugin-csp-nonce 1.6.2, @netlify/plugin-lighthouse 6.0.4.
- PeerJS 1.5.4 (downloaded from jsDelivr, 92,865 bytes): default ICE = `stun:stun.l.google.com:19302`, `turn:eu-0.turn.peerjs.com:3478`, `turn:us-0.turn.peerjs.com:3478` with the shared public credential `peerjs` / `peerjsp`; signalling broker `0.peerjs.com` is up (`{"name":"PeerJS Server",...,"location":"EU"}`). sha384 computed (appendix D).
- Lighthouse 13.5.0 JSONs (lh_mobile.json / lh_desktop.json): runtime origins on `/`: same-origin, api.mapbox.com (50 to 57 requests, all `/v4/mapbox.satellite/15/...webp`, glyph `.pbf`, `iconset.pbf`, style), events.mapbox.com (6 to 7 POST `/events`), ingesteer.services-prod.nsvcs.net (2 to 4 POST). No `a.tiles.mapbox.com`, no Google origin, no fonts. `redirects` audit: 9,070 ms wasted (two Document requests). `csp-xss`: "No CSP found in enforcement mode" (High).
- Static analysis: inline script/style inventory (script `tmp-infra-netlify/inventory.py`, `hashes.py`, `sinks.py`), storage keys, DOM sinks, browser-API use, external origin scan (`scan_origins.py`).
- Documentation (primary): Netlify redirect options (no mid-path `*`, force `!`, host-based rules), rate limiting, edge functions API/limits, credit plans, CSP nonce integration, post-processing/Pretty URLs; Mapbox GL JS security page (CSP directives), URL-restriction rules, attribution rules; Mapbox Product Terms Oct 1 2025 (on-device cache <= 30 days); RFC 9116.

Things I could NOT verify (need dashboard or a real browser): exact Mapbox allowed-URL list and scopes; Google key referrer restriction and API restriction list; Netlify plan and credit balance; whether Netlify applies `[build.processing.html]` on a manual (drag-and-drop) deploy; header merge semantics for overlapping same-name rules (docs silent; forum answers conflict); how Mapbox GL fetches tiles relative to the service worker (worker fetches through a blob worker); real-device PWA install behaviour on iOS; whether Chrome/Firefox/Safari all ignore `X-Frame-Options` when `frame-ancestors` is present (CSP3 says yes; a test page is provided in appendix C.5).

---------------------------------------------------------------------------------------------------

## 3. Findings index and phasing

Phase 0 (this week, no new tooling, edits to files that exist today)
- 21 SW forced reload hotfix; 12 remove dev pages; 02 embed header fix (interim toml); 15 netlify.app redirect; 16 PDF inline; 09 security.txt; 34 DNS records; 18/19 dashboard checks (token/key); 07 Watch Together XSS + RNG fix; 25 replace corrupt screenshot with any valid PNG.

Phase 1 (2 to 3 weeks)
- 01 CSP staged rollout starting report-only with corrected allow-list + reporting; 03 hash generator; 04 Permissions-Policy per page; 05 COOP; 11 URL canonicalisation; 13 cache policy; 14 prune scanner rules; 24 manifest; 26 deep-link contract (app team); 36/37 privacy + terms publish.

Phase 2 (needs Git + build, depends on N1 source recovery)
- 28 Git CD + previews; 22 Workbox SW; 08 self-host Mapbox GL + PeerJS; 03 externalise inline code; 29 CI gates; 31 Historian API skeleton; 32 own vitals.

Phase 3 (hardening / optional)
- 06 Trusted Types; 23 tile cache; 38 consent controls; 39 account/supply-chain; SRI n/a after 08; DNSSEC decision.

Dependency spine: 28 (Git CD) -> 22, 29, 31, 03(end state), 08; 11 (canonical URLs) -> 24 (manifest start/shortcuts), sitemap; 03 -> 01(enforce) -> 06; 26 (deep links) -> 24 (shortcuts with ticks).

---------------------------------------------------------------------------------------------------

## 4. netlify.toml: line-by-line review (DEPLOY/netlify.toml, 204 lines)

| Lines | Rule | Verdict | What to do |
|---|---|---|---|
| 1-2 | `[build] publish = "."` | OK for a manual folder deploy. Dangerous once Git deploys exist (would publish repo root incl. package.json, netlify.toml, scripts). The 404 rules for `/package.json`, `/vendor/*`, `/storage/*` (lines 167-176) show this was once a real concern. | Git era: `publish = "dist"`, `command = "npm run build"`. |
| 5-8 | `/*` `X-Frame-Options = "DENY"` | Root of the embed conflict (X4). It is applied to every path so it can never be removed for `/embed*` (Netlify cannot unset an inherited header). | Remove from `/*`; emit per document (infra-netlify-02). |
| 9 | `X-Content-Type-Options: nosniff` | Good. | Keep in `/*`. |
| 10 | `Referrer-Policy: strict-origin-when-cross-origin` | Good, and now load-bearing: Mapbox URL restrictions need a Referer (verified: no Referer -> 403) and so does Google's referrer restriction. | Keep. Document "never tighten to no-referrer/same-origin" in the config comment. |
| 11-13 | `Permissions-Policy: camera=(self), geolocation=(self), accelerometer/gyroscope/magnetometer=(self), microphone=(), payment=()` | Over-broad: camera/geolocation/sensors allowed on all 27 pages, needed only by `/ar`. Missing many powerful features. `magnetometer` may log an "unrecognized feature" console warning in Firefox (UNVERIFIED). | Per-document policy (infra-netlify-04). |
| 14 | HSTS `max-age=31536000; includeSubDomains; preload` | Good; header is preload-eligible (hstspreload.org: no errors/warnings) but the domain is NOT on the list (`status: unknown`). | Submit after checklist (infra-netlify-34). |
| 15 | `X-Permitted-Cross-Domain-Policies: none` | Harmless legacy (Flash/Acrobat). | Keep or drop; no grade impact. |
| 16-19 | `Content-Security-Policy-Report-Only` | Report-only, no `report-uri`/`report-to` (nobody can see violations), `'unsafe-inline'` in script/style, missing RUM host, five dead allowances, no `frame-ancestors`/`form-action`/`manifest-src`. Applied to images, JSON and PDFs too (pointless). | infra-netlify-01/10. |
| 22-25 | `/assets/*` immutable 1 y | Correct only because Vite fingerprints names. Note the 5 hashed names are referenced from `sw.js` and `index.html`. | Keep. |
| 27-30 | `/data/*` `max-age=3600` | Short TTL avoids code/data skew but forces ~76 conditional requests per revisit after an hour (46 `/data` + 30 `/data/oob` requests in the Lighthouse trace, several duplicated). | Hash + immutable (infra-netlify-13). |
| 32-35 | `/icons/*` immutable 1 y | Un-fingerprinted names (`icon-192.png`, `icon-512.png`) cached for a year, immutable: any icon fix will not reach existing visitors/installed PWAs for a year (browsers ignore revalidation for immutable). | Rename with content hash or drop `immutable` (infra-netlify-13/24). |
| 37-45 | favicon.ico and apple-touch-icon.png 7 d | Fine. `apple-touch-icon-precomposed.png` (byte-identical duplicate) has no rule and is unnecessary. | Delete duplicate. |
| 47-55 | robots.txt / sitemap.xml 1 d | Fine. | Keep. |
| 57-60 | `/manifest.json` 1 h | Fine; Content-Type is `application/json` (spec media type is `application/manifest+json`; Chrome accepts both). | Set explicit type or rename to `.webmanifest`. |
| 62-71 | `/*.html` `no-cache, must-revalidate` | Good and the comment is right about bfcache (Lighthouse `bf-cache` passes). But it matches ONLY the `.html` form: `/dashboard`, `/privacy`, `/embed`, `/` got the default `public,max-age=0,must-revalidate` (same effect today). | Becomes moot after infra-netlify-11 (one URL form). |
| 73-76 | `/sw.js` no-cache,no-store | Acceptable (browsers already bypass HTTP cache for the SW script). | Change to `no-cache` (keep `must-revalidate`). |
| 78-85 | embed.html override | Broken: `X-Frame-Options = ""` and `Content-Security-Policy-Report-Only = ""` are ignored by Netlify (verified live), and the path only matches `.html`. | infra-netlify-02. |
| 89-187 | 19 scanner redirects to `/404` with status 404 | Zero security value on a static site (unmatched paths already return the branded 404: verified `/.env`, `/wp-login.php`, `/.git/config`, `/phpmyadmin/`, `/server-status`, `/.aws/credentials`, `/backup.zip`, `/db.sql`, `/a.bak` all 404). `/*.sql` and `/*.bak` are invalid patterns (Netlify splat `*` is allowed only at the end of a path per redirect docs). | Delete (infra-netlify-14). |
| 189-196 | `/diagnostics.html` force 404 | Bypassed by `/diagnostics` (200). | Delete the file from the deploy (infra-netlify-12). |
| 200-204 | `/user-guide.pdf` `Content-Disposition: attachment` | Forces download; audit G1's "served inline" was wrong; the guide is a reading document and the footer link (`site-nav.js:196`) has no `download` attribute, so users get a surprise download. | `inline` + versioned filename (infra-netlify-16). |

Structural conclusions from the file:
1. There is no `[build.processing]` block, so Netlify's default Pretty URLs post-processing rewrites authored links (verified live) and both URL forms stay live (infra-netlify-11).
2. Rules are keyed by path-as-requested, so every per-page rule must cover the clean URL, not just `.html`.
3. No rule sets a header name that another matching rule also sets, EXCEPT the embed block (which overlaps `/*`). That is exactly why it fails. The plan's invariant (Appendix A) is: for any URL, each header name is produced by at most one matching rule.

---------------------------------------------------------------------------------------------------

## 5. Findings: headers, CSP, framing, URLs, caching, redirects

### infra-netlify-01 | Enforce a real, per-page CSP (staged Report-Only to Enforce) | severity: high | effort: L
Audit refs: X3, P7 (inspector-issues). Depends on: 10 (reporting), 03 (inline code), 12/11 (clean page list). Moves: MDN Observatory B(75) -> A+; securityheaders.com A+; Lighthouse Best Practices `csp-xss` + `inspector-issues`; security grade B -> A+.

Evidence
- `netlify.toml:19` single global `Content-Security-Policy-Report-Only` (quoted in section 4); Lighthouse `csp-xss`: "No CSP found in enforcement mode" (severity High); `inspector-issues`: CSP issue for `https://ingesteer.services-prod.nsvcs.net/rum_collection`; Observatory B/75.
- Runtime origin truth (lh_mobile.json / lh_desktop.json network log for `/`): self, `api.mapbox.com` (style, sprite, glyph pbf, iconset pbf, `/v4/mapbox.satellite/...webp`), `events.mapbox.com` (POST /events), `ingesteer.services-prod.nsvcs.net` (POST /rum_collection), `blob:` (workers), `data:` (SVG + webp probe). Nothing else at load. Two frames open only on user action: Google Maps Embed Street View (`bundle.pretty.js:110660-110665`, `https://www.google.com/maps/embed/v1/streetview?...`) and an NPS.gov video page (`bundle.pretty.js:100461-100466`, `src: M.videoUrl`, 17 URLs of the form `https://www.nps.gov/media/video/view.htm?id=...` at `bundle.pretty.js:100080, 104112-104432`). `frame-src` therefore needs `https://www.google.com/maps/embed/` and `https://www.nps.gov/media/video/` (the current policy has only `www.google.com`, so enforcing it as written would break the NPS video panel). nps.gov sends no `X-Frame-Options`/`frame-ancestors` (VERIFIED with curl), so framing works today.
- Dead allowances in the current policy: `fonts.googleapis.com`, `fonts.gstatic.com` (no `@font-face`, no Google Fonts link anywhere; all `font-family` values are system stacks or `'Spectral',Georgia,serif` with no font file behind it, e.g. `bundle.pretty.js:111327, 111364, 111419`); `*.tiles.mapbox.com` (no request in the log; TileJSON lists a/b hosts but GL JS rewrites to api.mapbox.com; the two `preconnect` hints at `index.html:43-44` are wasted sockets); `events.mapbox.cn` (string in GL JS only, used when API host is api.mapbox.cn); `cdn.jsdelivr.net` and `0.peerjs.com` on every page though only `watch-together.html:19,224,251` use them; `api.mapbox.com` in `script-src`/`style-src` only exists for the CDN `mapbox-gl.js/css` tags on 9 sub-pages (`camera.html:19-20` and 8 more; see finding 08).
- Missing from the current policy: RUM host, `frame-ancestors`, `form-action`, `manifest-src`, reporting, `upgrade-insecure-requests` (already present: `base-uri`, `worker-src`, `object-src`).
- Inline code that a strict policy must accommodate: 27 executable inline scripts (29 counting the two dev pages; index.html has 7, 23,146 bytes: `index.html:255-277, 294-353, 355-396, 398-440, 441-519, 521-606, 608-714`), 25 `<style>` blocks (27 with the dev pages; index 9,205 bytes `index.html:60-253`), 40 `style="..."` attributes in markup + 11 inside JS template strings, 2 inline event handlers (`index.html:57` `onload=` on the preload link; `report.html:67` `onclick=`), a `<noscript>` block with inline styles (`index.html:751`), `innerHTML` strings that carry style attributes (`site-nav.js:71`, `index.html:651`). No `eval`/`new Function` in pages or the bundle (bundle grep: 0), so `unsafe-eval` is not needed. WebAssembly appears in the bundle (`bundle.pretty.js:29464, 29592, 32588` Draco / meshopt / building-gen) but is only fetched for 3D features/Standard style; the satellite-v9 raster style does not use them, so `'wasm-unsafe-eval'` is expected NOT to be needed (Mapbox docs say add it only for 3D/Standard style). Verify with the crawl.
- Netlify's edge does not touch inline code: sha256 of every inline script/style block matched between the live response and the deployed file (index: 8 script blocks incl. JSON-LD, 1 style; dashboard: 1 and 1). So hash allow-lists are viable.

Root cause: one policy for 27 different pages, no reporting channel, so nobody ever saw a violation and enforcement never happened; inline code and third-party CDN tags block the strict form.

Fix (specification; full generator and per-class policies in appendices B and C)
1. Corrected allow-list (Stage 0, ship in Report-Only within a day, no rendering risk): drop `fonts.*`, `*.tiles.mapbox.com`, `events.mapbox.cn`; add `https://ingesteer.services-prod.nsvcs.net` to `connect-src`; move `cdn.jsdelivr.net` and `0.peerjs.com/wss` to the watch-together policy only; add `frame-ancestors`, `form-action`, `manifest-src`, `upgrade-insecure-requests`; add `report-uri` + `report-to` pointing at the collector (finding 10).
2. Enforce the un-breakable directives immediately (Stage 1): a separate enforced header `Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'` (multiple CSP headers are allowed; enforced + report-only coexist). This delivers the framing protection without XFO and cannot break rendering.
3. Per-class policies (appendix C.1): static pages, map pages, main app, watch-together, AR, cinematic-export, embed, 404/legal.
4. Interim script/style hashes from the generator for the 27+25 blocks (Stage 3a): `VENDOR_CDN=1 STYLE_ATTR=1 node scripts/gen-netlify-config.mjs dist` (tested against a copy of the deployed HTML on 2026-09-30: it produced 24 document rules and 27 redirects, and it correctly refuses to run until the two inline handlers `index.html:57` and `report.html:67` are removed); then externalise (finding 03) and delete the hashes and the two interim flags (Stage 3b).
5. Enforce page classes in order of risk: legal/404 -> static tool pages -> AR -> cinematic -> map sub-pages -> `/` last. Each promotion gated by zero violations in the scripted crawl (appendix C.4) plus 7 days of report data.
6. Keep RUM working: do NOT use `strict-dynamic` (the Netlify-injected RUM `<script src="/.netlify/scripts/rum">` has no nonce and would be blocked); hashes + `'self'` are compatible. Do not rely on Netlify's nonce extension for this site: it needs Edge Functions (manual drag-and-drop deploys cannot ship them), adds an edge invocation to every HTML view, and hash allow-lists are enough for a static site.
7. Keep Trusted Types out of enforcement until finding 06.

Acceptance test
- `curl -sI https://gettysburginteractivemap.com/ | grep -i '^content-security-policy:'` shows an enforced policy whose `script-src` has no `'unsafe-inline'`, and `connect-src` lists exactly api.mapbox.com, events.mapbox.com, ingesteer.services-prod.nsvcs.net, `'self'`.
- Playwright crawl (appendix C.4) over 25 pages x {375x812, 1440x900} x scripted flows (play, jump day, open Help, open Walkthrough and click Load Street View, Watch Together host and join in two contexts, AR page with fake media/geolocation, Cinematic Export record 3 s) prints `violations: 0`.
- Netlify RUM still receives beacons after enforcement (RUM chart keeps updating; `ingesteer...` POST returns 2xx in DevTools).
- MDN Observatory >= 100 (A+), securityheaders.com A+, CSP Evaluator no High.
- Lighthouse Best Practices `csp-xss` and `inspector-issues` pass on mobile and desktop.

### infra-netlify-02 | embed.html: fix the framing conflict and make the widget actually embeddable at both URLs | severity: high | effort: S (interim) / M (generator) 
Audit refs: X4. Depends on: 11 for the end state. Moves: security hygiene; Terms accuracy ("embedding its widget").

Evidence (VERIFIED live 2026-09-30)
- `/embed.html` returns both `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors *`, plus the site-wide `Content-Security-Policy-Report-Only`. `/embed` returns only `X-Frame-Options: DENY` (no frame-ancestors at all). `netlify.toml:80-85` tries `X-Frame-Options = ""` and `Content-Security-Policy-Report-Only = ""`.
- Netlify forum (thread 26263, staff): unsetting an inherited header "is not possible today"; empty values do nothing; a more specific rule must be listed AFTER the splat rule to override a same-named header. The docs (Custom headers page) document neither merge semantics nor unset.
- Per CSP Level 2/3, when `frame-ancestors` is present browsers ignore `X-Frame-Options`, so today's `/embed.html` probably works in current browsers, but (a) the response is self-contradictory, (b) `/embed` is broken, (c) the Report-Only leaks onto a page meant for third-party hosts.

Root cause: header rules are additive/ambiguous per name and matched on the as-requested path; a catch-all `/*` XFO cannot be selectively removed.

Fix
- Adopt the invariant "for any URL, each header name is emitted by at most one matching rule". Concretely: remove `X-Frame-Options`, `Content-Security-Policy*` and `Permissions-Policy` from `/*` (keep only headers that are identical everywhere: nosniff, Referrer-Policy, HSTS, COOP); emit document-level headers per HTML path (both `/name` and, until the redirects in finding 11 are live, `/name.html`), listing `/embed` and `/embed.html` separately with `Content-Security-Policy: frame-ancestors *; ...` and NO `X-Frame-Options`. For all other pages emit `Content-Security-Policy: ... frame-ancestors 'self'` and (optional legacy) `X-Frame-Options: SAMEORIGIN`. A ready-to-paste interim block is in appendix B.1; the generator (appendix B.2) does this for all pages.
- Give the embed its own tight policy (appendix C.1 "embed"): `default-src 'none'; script-src 'self' 'sha256-<inline>'; style-src 'sha256-<inline>'; connect-src 'self'; frame-ancestors *; base-uri 'none'; form-action 'none'` (its script only fetches `/data/vignettes_part1-3.json` and sets text/hrefs; `embed.html:36-70`).
- Add a Deploy-Preview acceptance test page (appendix C.5) served from another origin that iframes `/embed`, `/embed.html`, `/embed?vignette=V-018`, `/` and `/privacy`. Expected: embed variants render; the other two are blocked.
- Option B (later, M): host the widget on its own site/subdomain (`embed.gettysburginteractivemap.com`, second Netlify site with its own netlify.toml). Benefits: independent headers, no shared `localStorage`/origin with the main app (the widget runs inside strangers' pages), independent CSP. Costs: duplicate `vignettes_*.json` publish or CORS (`Access-Control-Allow-Origin: *` on those three files). Recommended once embed usage is real.
- Fix the CTA deep link (`embed.html:60` builds `index.html?tick=..&vignette=..`), which the app ignores (finding 26).

Acceptance test
- `curl -sI https://gettysburginteractivemap.com/embed | grep -i -E 'x-frame|content-security'` and same for `/embed.html`: no `X-Frame-Options`, `frame-ancestors *` present, no site-wide Report-Only.
- Same curl for `/`, `/privacy`, `/dashboard`: `frame-ancestors 'self'` present.
- Cross-origin iframe test page (appendix C.5) passes in current Chrome, Firefox, Safari (record results in the runbook).

### infra-netlify-03 | Externalise (or hash) inline scripts, styles, handlers and style attributes so CSP needs no `unsafe-inline` | severity: medium | effort: L (end state) / M (hash generator interim)
Audit refs: X3. Depends on: 28 (build) for the end state; 01. Moves: Security A+ (Observatory bonus for no unsafe-*), Lighthouse `csp-xss`.

Evidence: inventory in finding 01 (script `tmp-infra-netlify/inventory.py`, output `inventory.json`; per-page table reproduced in appendix C.2). DOM sinks: 50 `innerHTML`/`outerHTML`/`insertAdjacentHTML` assignments in pages + `site-nav.js`, 24 interpolate data (all from same-origin static JSON, except watch-together, finding 07). `script-src-attr` blockers: `index.html:57`, `report.html:67`.

Fix
1. Interim (no build, works with today's drag-and-drop deploys): run `scripts/gen-netlify-config.mjs` (appendix B.2) against the deploy folder before upload; it computes `sha256-` hashes of every inline `<script>` and `<style>` per page and writes them into that page's CSP. Add `style-src-attr 'unsafe-inline'` temporarily (style attributes are the smallest risk; script stays strict). Replace the two inline handlers now (S): `index.html:57` -> plain `<link rel="stylesheet">` (the CSS is 5 KB br; the preload/onload swap is also the source of the P5 "preload not used / cross-world SW" warnings); `report.html:67` -> `addEventListener` in the existing script.
2. Sub-page conversion (M): move each page's single inline script and style into `/assets/pages/<page>.<hash>.js|css` (hashed, immutable, precached by the SW). With Vite multi-page (`build.rollupOptions.input` = every html) this is automatic and also minifies. Then `script-src 'self'` and `style-src 'self'`, no hashes.
3. Home page (L): the 7 index scripts are workarounds for things the React app should own (floating Extra Features overlay, onboarding banner, label patcher, reveal logic, collision mover, monuments overlay). They disappear when the app absorbs them (audit H1/H6); until then bundle them into one external `boot.<hash>.js`.
4. Style attributes: convert the ~40 markup occurrences to classes; the 11 JS-string ones need CSSOM (`el.style.setProperty(...)`) or CSS custom properties, e.g. `dashboard.html:212` `style="background:${corps.color}"` becomes `swatch.style.background = corps.color` (CSSOM is allowed by CSP). `site-nav.js:71` sprite `style="display:none"` becomes `hidden` / `width=0 height=0 aria-hidden`; `index.html:651` star SVG `style="filter:drop-shadow..."` becomes a CSS class. `<noscript>` inline styles (`index.html:751`) become a class in the external CSS.
5. React/Mapbox note: React sets styles through CSSOM and Mapbox GL sets marker/canvas styles through CSSOM, so neither needs `style-src 'unsafe-inline'`; confirm with the crawl.

Acceptance test: `grep -c "<script>" dist/*.html` returns 0 inline executable blocks (JSON-LD excluded); `grep -c ' style=' dist/*.html` returns 0; final CSP has no hashes and no `unsafe-*`; crawl violations 0.

### infra-netlify-04 | Permissions-Policy: least privilege per page (camera/geolocation/sensors only on /ar) | severity: medium | effort: S
Moves: Security A+; privacy posture. Depends on: 02 (per-document headers).

Evidence: `netlify.toml:13` grants camera/geolocation/accelerometer/gyroscope/magnetometer to `self` on every page; only `ar.html:160,172,184-193` uses getUserMedia, geolocation and DeviceOrientation. The main bundle contains Mapbox's GeolocateControl code (`bundle.pretty.js:94853-95434`) but never instantiates it (`GeolocateControl(` has no call site). No page uses microphone, MIDI, USB, serial, HID, payment, screen capture (Cinematic Export uses `canvas.captureStream`, which needs no permission, `cinematic-export.html:190-196`).

Fix (exact strings; verify no console warnings in Chrome, Firefox, Safari)
- Baseline for all documents (this is what the generator emits):
  `Permissions-Policy: accelerometer=(), autoplay=(self), camera=(), display-capture=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=()`
- Optional additions after testing for console warnings in Firefox and Safari (Chromium-only Privacy Sandbox features): `browsing-topics=(), attribution-reporting=(), join-ad-interest-group=(), run-ad-auction=()`.
- `/ar`: same but `camera=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)`.
- `/` (Street View and NPS video iframes can go fullscreen): `fullscreen=(self "https://www.google.com" "https://www.nps.gov")`; and set `allow="fullscreen"` on both iframes (React prop `allow`; today only `allowFullScreen`, `bundle.pretty.js:110663` and `:100465`). If motion controls in Street View are wanted on phones, also `accelerometer=(self "https://www.google.com"), gyroscope=(self "https://www.google.com")` and `allow="accelerometer; gyroscope"`.
- Do NOT add `interest-cohort` (removed from Chrome; produces an "Unrecognized feature" console warning).
- Remove `X-Permitted-Cross-Domain-Policies` only if you want fewer headers (no grade effect).

Acceptance test: `curl -sI /ar | grep -i permissions-policy` shows camera=(self); `curl -sI /` shows camera=(); Chrome DevTools console shows zero "Permissions-Policy" messages on every page class; AR page permission prompts still fire on a phone.

### infra-netlify-05 | COOP yes, CORP optional, COEP no (with reasons) | severity: low | effort: S
Evidence: none of COOP/COEP/CORP is sent today (`curl -I`). Lighthouse Best Practices has an origin-isolation (COOP) informative check.
Decision record
- `Cross-Origin-Opener-Policy: same-origin` on documents: safe here (all external links use `target=_blank` + `rel="noopener noreferrer"`: `bundle.pretty.js:102038-102060, 110668-110723`; no OAuth/payment popups; no `window.open` in the bundle). Emit in `/*` (identical everywhere).
- `Cross-Origin-Embedder-Policy`: do NOT enable (`require-corp` or `credentialless`). The Street View iframe is a cross-origin frame that does not send COEP/CORP, so the walkthrough would break; nothing on the site needs cross-origin isolation (no SharedArrayBuffer).
- `Cross-Origin-Resource-Policy`: optional `same-site` on `/data/*` and `/sw.js` only; it affects no-cors loads (script/img tags), not `fetch` (CORS already blocks cross-origin JS reads: no ACAO on JSON). Low value; the Terms' anti-scraping intent is better served by rate awareness than headers. Skip unless hotlinking is observed.
Acceptance test: Observatory has no COOP warning; embedding `/` from another origin still yields a blocked frame; Street View panel still loads after COOP.

### infra-netlify-06 | Trusted Types (report-only first) and sink hygiene | severity: low | effort: M-L
Evidence: 50 HTML sinks (finding 03); React 18 assigns `innerHTML` in a few internal paths and `dangerouslySetInnerHTML` is used once in app code (`bundle.pretty.js:110653`, walkthrough paragraphs from static strings); Mapbox GL sets some `innerHTML` (attribution).
Fix
1. After 01 stage 3: add `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types default gtbg-static` and collect violations (they will name each sink).
2. Introduce one helper `setHtml(el, trustedStaticTemplate)` for the ~24 data-interpolating sinks (escape with a 6-line `esc()` + `textContent` for values) so no page needs a `default` policy; keep a small `default` policy that allows only strings produced by our helper.
3. Only enforce TT when the report stream is empty for 14 days. Third-party libraries (Mapbox GL, React) may force a permissive `default` policy; accept that and enforce with `trusted-types default gtbg-static` plus a DOMPurify-based default if needed. This is defense-in-depth for the future Historian answers (finding 31), where model output must never reach `innerHTML`.
Acceptance test: TT report-only stream empty for 14 days across the crawl; enforced header on static pages with the crawl clean.

### infra-netlify-07 | Watch Together: persistent DOM-XSS via imported/stored tour notes, guessable global room code, unbounded connections | severity: medium (high if same-origin APIs are added) | effort: M
Depends on: none (S hotfix possible today). Moves: Security; Reliability. New finding.

Evidence
- `watch-together.html:172`: ``row.innerHTML = `<span class="stop-tick">Tick ${s.tick}</span><span class="stop-note">${s.note || '(no note)'}</span>...` `` (template literal, values unescaped). `stops` come from `localStorage['gtbg_watch_together_tour']` (`:159`) and from an imported file: `:326` `stops = data.stops` (only `Array.isArray` validated), saved back to localStorage (`:161`) and re-rendered on every visit. The page explicitly invites sharing tour files (`:63` "then share it as a file for someone else to load"; export `:312-319`, import `:320-330`). Payload example: a stop with `note: "<img src=x onerror=...>"`. Today CSP is report-only with `unsafe-inline`, so it executes.
- `:205-209` `randomCode()`: 5 letters from a 24-letter alphabet with `Math.random()` (about 7.96 million codes, non-crypto RNG). `:224` `new Peer('gtbg-wt-' + code)` registers that ID on the PUBLIC broker `0.peerjs.com` (namespace shared with every PeerJS user); anyone can try codes or squat an ID. `:256` guests accept `{type:'goto', tick, note}` without validating `tick` type/range; host `:230-236` `connections.push(conn)` is unbounded (memory/CPU DoS by joining many peers).
- Third-party: PeerJS script from jsDelivr without SRI (`:19`); ICE servers are PeerJS defaults: Google STUN + PeerJS TURN with shared credentials (verified in peerjs.min.js 1.5.4).

Fix
1. XSS: build rows with DOM APIs (`document.createElement`, `textContent`) instead of template `innerHTML`; validate on load and on import with a schema: `stops` array length <= 200; each `{tick: integer 1..675, note: string <= 140 chars, control chars stripped}`; drop anything else; wrap `JSON.parse(localStorage...)` in try/catch (currently a corrupt value throws and blanks the page).
2. Guest messages: `if (data && data.type==='goto' && Number.isInteger(data.tick) && data.tick>=1 && data.tick<=675) goToTick(data.tick, String(data.note||'').slice(0,140), true)`; ignore all other shapes.
3. Room codes: 6 characters from a 31-character unambiguous alphabet using `crypto.getRandomValues` (about 887 million codes) and a host-side cap of 20 connections; optional "host approves joiner" confirm.
4. Prefer self-hosting PeerJS (finding 08) and disclose STUN/TURN/broker in the privacy policy (finding 36). Decide in Phase 3 whether Live Sync stays (analytics: this page gets 40 to 86 views per 30 days per the BRIEF) or is replaced by shareable-link tours (URL-encoded tour, zero infrastructure, no WebRTC IP exposure, removes 3 origins from CSP and 4 disclosures from privacy).
Acceptance test: import a file with an HTML/JS payload note: it renders as inert text and the page does not execute it; corrupt `gtbg_watch_together_tour` value loads an empty tour; `codes` generated by `crypto`; a 21st peer connection is closed by the host.

### infra-netlify-08 | Self-host Mapbox GL JS and PeerJS (or, interim, SRI + upgrade) | severity: medium | effort: M
Audit refs: P4 (render-blocking third party), X3. Depends on: 28 for a shared vendor chunk. Moves: Security A+ (no third-party script origins), Performance (sub-pages).

Evidence: 9 sub-pages load `https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js` and `.css` synchronously in `<head>` without SRI (`camera.html:19-20`, `cinematic-export.html:15-16`, `compare.html:19-20`, `ground-remembers.html:15-16`, `immersive.html:15-16`, `sandbox.html:19-20`, `unit-rendering-reference.html:9-10`, `viewshed.html:19-20`, `watch-together.html:15-16`) plus `watch-together.html:19` PeerJS from jsDelivr. The mapbox-gl.js file is 1,796,551 bytes; the main bundle also contains its own copy (`bundle.pretty.js:53873` `R = "3.24.1"`). Current releases: mapbox-gl 3.32.0 (8 minors newer), peerjs 1.5.5.
Fix
- Interim (S): add `integrity` + `crossorigin="anonymous"` (hashes computed in appendix D; `Access-Control-Allow-Origin: *` verified for both hosts) and keep the version pinned.
- End state (M): publish `/vendor/mapbox-gl/<ver>/mapbox-gl.js|css` and `/vendor/peerjs/<ver>/peerjs.min.js` from your own origin (hashed or versioned path, `immutable`), remove `api.mapbox.com` from `script-src`/`style-src` and `cdn.jsdelivr.net` from everything. Confirm the licence (mapbox-gl ships under the Mapbox Terms of Service; the same file is already inlined in your main bundle, so this is the same use). Better still (perf finding for the app team): stop inlining Mapbox GL into the 2.28 MB entry chunk; a shared `vendor-mapbox` chunk (about 600 KB br) keeps its hash across deploys, so returning visitors re-download only your own code after each release. The SW then precaches it once for all 9 map pages.
- Upgrade path: pin, upgrade to the current 3.x in a Deploy Preview, run the crawl and a visual regression pass; add Dependabot/Renovate for `mapbox-gl` and `peerjs` once source is in Git.
Acceptance test: `grep -R "api.mapbox.com/mapbox-gl-js\|cdn.jsdelivr" dist/` returns nothing; CSP `script-src 'self'`; Lighthouse: no third-party render-blocking on sub-pages.

### infra-netlify-09 | Publish /.well-known/security.txt (and survive Netlify's dot-folder stripping) | severity: low | effort: S
Evidence: `/.well-known/security.txt`, `/security.txt` -> 404 (verified). Netlify manual/CLI/API deploys strip dot-folders (forum threads 37728, 44897); Git deploys keep them.
Fix: add `well-known/security.txt` to the deploy folder and a rewrite `/.well-known/*  /well-known/:splat  200` in `_redirects` (works for all deploy methods). Content (RFC 9116 requires Contact and Expires; Expires must be under one year ahead, so set a calendar reminder for August 2027):
```
Contact: mailto:gettysburginteractivemap@gmail.com
Expires: 2027-09-30T00:00:00.000Z
Preferred-Languages: en
Canonical: https://gettysburginteractivemap.com/.well-known/security.txt
```
Add `X-Robots-Tag: noindex` and `Content-Type: text/plain; charset=utf-8` for that path, and link it from the privacy policy "Security" section. Make sure no future scanner-blocking wildcard for dotfiles (e.g. `/.*`) shadows `/.well-known/`.
Acceptance test: `curl -sI https://gettysburginteractivemap.com/.well-known/security.txt` -> 200 text/plain; `Expires` in the future.

### infra-netlify-10 | CSP/Reporting collector (report-to + report-uri) with noise filtering | severity: medium | effort: M
Depends on: 28 (Functions need Git/CLI build) or use a hosted collector. Moves: enables 01.
Options
- A (recommended once Git exists): Netlify Function `netlify/functions/csp-report.mjs` on `/api/csp-report` (code in appendix E.4): accepts `application/csp-report` and `application/reports+json`, drops noise (`chrome-extension:`, `moz-extension:`, `safari-web-extension:`, `webkit-masked-url:`, `about:`, `data:` with empty source, browser-injected `inline` with no `source-file`), rate-limits (code-based rule, 2 allowed on Free/Personal, 5 on Pro), truncates fields, returns 204, and writes one summary log line per unique (directive, blocked host, source path) per day (dedupe in Netlify Blobs) so function logs stay readable.
- B (works today with manual deploys): a hosted collector with a free tier (report-uri.com or a Sentry security endpoint). Disclose the processor in the privacy policy (it receives page URLs and violation details, no IP is needed by us but the vendor sees it).
Headers: `Reporting-Endpoints: csp="https://gettysburginteractivemap.com/api/csp-report"`, `Content-Security-Policy-Report-Only: ...; report-uri https://gettysburginteractivemap.com/api/csp-report; report-to csp` (report-uri is still needed for Firefox/Safari).
Acceptance test: seeded violation appears in the collector within a minute; extension noise filtered; the collector rejects bodies over 16 KB and more than N requests/min from one IP.

### infra-netlify-11 | One canonical URL form: clean URLs; stop Netlify rewriting authored links; 301 the other form | severity: high | effort: M
Audit refs: T3, E5. Depends on: none (redirects are one file). Moves: SEO consistency (T1), analytics accuracy (RUM/Web Analytics split `/dashboard` vs `/dashboard.html`), closes header-rule holes (02, 12).

Evidence
- Both forms return 200 (`/historian`, `/historian.html`, `/dashboard`, `/dashboard.html`, `/embed`, `/embed.html`, `/index.html`, `/404`, `/404.html`); `/x/` -> 301 to `/x`; `/index` -> 301 to `/`; wrong-case -> 301 to lowercase.
- Netlify's Pretty URLs post-processing is ON (default): live HTML has `href='/search'` where the file has `href="/search.html"` (diff of live vs deployed: `index.html:288, 722-739`, `dashboard.html:58`), yet `<link rel="canonical">`, `og:url`, sitemap `<loc>` (21 URLs, all `.html`) and JSON-LD say `.html`. Conflicting signals: internal links say `/search`, canonical says `/search.html`.
- Netlify staff (forum 102840): disabling Pretty URLs only stops link rewriting; the server keeps serving both forms; use redirects to enforce one.
- Redirects docs: `*` only at the end of a path, so a generic `/*.html -> /:splat` rule is not valid; list each page (27 rules, well under the 1,000-rule guidance).
- Header rules match the path as requested (section 2), so any per-page header rule keyed only on `.html` misses the clean URL.

Fix
1. Decision: clean URLs canonical (`/search`, `/dashboard`, `/historian`; home is `/`). Reasons: it is what visitors already see on internal navigation after Netlify's rewriting, shorter to share/cite, and independent of file extension when the app moves to a build.
2. `netlify.toml`: `[build.processing.html] pretty_urls = false` (overrides the UI setting; verify after the next deploy that authored hrefs are no longer rewritten; if a manual deploy ignores it, switch it off in Project configuration > Developer settings > Post processing).
3. `_redirects` (generated, appendix A.4 and B.2): `/index.html / 301!` and one line per page `/search.html /search 301!` (force). Preview test first: `curl -sI` each rule and confirm no loop (a request for `/search` is served from `search.html` by the CDN without re-entering the redirect engine; the forum evidence is that this pattern works; verify on a Deploy Preview).
4. Source edits (mechanical, one commit): all authored links/canonical/`og:url`/`twitter:url`/JSON-LD `url`/sitemap `<loc>` to clean form (about 27 files; `embed.html:31,60`, `documentary.html:92` use `/index.html?...`; `site-nav.js` menu hrefs; `find-ancestor`/`search` result links `search.html:192`, `regiment.html:247`). Sitemap: keep 21 URLs, add real `<lastmod>`, drop `changefreq`/`priority` (Google ignores them); privacy/terms may stay out.
5. Keep `/embed` and `/404` reachable (embed by design; `/404` must keep returning 404 semantics for unknown paths, see finding 17).
Acceptance test: `for p in search dashboard historian; do curl -sI https://.../$p.html | head -1; done` -> `301`; `Location` is the clean URL; `curl -s /search | grep canonical` -> `/search`; authored source has no `.html` links to internal pages (`grep -R 'href="/[a-z-]*\.html' dist/ | wc -l` = 0 except legacy redirects); Netlify Analytics shows one row per page.

### infra-netlify-12 | Remove developer pages from the deploy (diagnostics, unit-rendering-reference, duplicate icon) | severity: medium | effort: S
Audit refs: X4 (corrected). Moves: security hygiene; Best Practices.
Evidence: `/diagnostics` 200 (page body: browser/memory/SW/storage/Mapbox reachability readout, all client-side, `diagnostics.html:60-120`), `/unit-rendering-reference` 200 (`unit-rendering-reference.html:8` has `noindex`, loads Mapbox GL and the public token, `:56-57`), `/diagnostics.html` -> 404 only because of `netlify.toml:192-196`. Also `apple-touch-icon-precomposed.png` duplicate (byte-identical to `apple-touch-icon.png`, 1,423 bytes). `diagnostics.html` references a `gtbg_session` key that the app never writes (dead diagnostic).
Fix: delete `diagnostics.html`, `unit-rendering-reference.html` and the precomposed icon from the deployable tree (keep them in the source repo under `tools/` if useful, not in `publish`). Remove the two toml rules. If you want a diagnostics page for support, ship it as `/support/diagnostics` behind an explicit link, `noindex`, with a strict CSP.
Acceptance test: `curl -sI /diagnostics /unit-rendering-reference /unit-rendering-reference.html` -> 404 (all three).

### infra-netlify-13 | Cache policy rework: fingerprint everything cacheable, stop revalidating on every page, correct the icons rule | severity: medium | effort: M
Audit refs: P3, P4, P1. Depends on: 28 for full automation; interim edits possible. Moves: LCP/FCP repeat visits, INP indirectly; CDN cost.

Evidence (VERIFIED headers)
- `/site-nav.js`, `/site-nav.css`, `/icons.svg`, `/screenshots/*.png`: `public,max-age=0,must-revalidate` (revalidated on every page load; site-nav.* are render/parse-blocking on all 20 tool pages and `/`).
- `/icons/*` `immutable` 1 y on un-fingerprinted names (`netlify.toml:32-35`).
- `/data/*` `max-age=3600` with no SWR: after an hour a revisit triggers ~76 conditional GETs (46 `/data` + 30 `/data/oob` in the Lighthouse log; `commander_successions.json` is requested twice concurrently: `bundle.pretty.js:97522` called twice, plus the SW double hop).
- Edge already caches indefinitely and Netlify invalidates on every deploy (`Cache-Status: "Netlify Edge"; hit; ttl=31531328`), so long edge TTLs are safe.
Fix
1. Fingerprint: `/assets/site-nav.<hash>.js|css` (referenced by all pages), `/assets/icons.<hash>.svg`, `/icons/icon-192.<hash>.png` etc. (Vite plugin or the header generator's rename step), all `immutable`.
2. Data: content-hash each JSON (`/data/chronology_day1.<hash>.json`), publish a tiny manifest inlined into `index.html` as `<script type="application/json" id="gtbg-data">{"chronology_day1":"chronology_day1.3f9a1c.json",...}</script>` (JSON blocks are not subject to script-src) so there is zero extra round trip; `Cache-Control: public, max-age=31536000, immutable` for `/data/*`. This also removes code/data version skew, the only reason for the 1 h TTL. Interim without hashing: keep `max-age=3600` and add `stale-while-revalidate=86400` (browser-side: Chrome/Firefox honour it, Safari does not) plus `Netlify-CDN-Cache-Control: public, max-age=31536000, durable` (edge only).
3. HTML: keep `no-cache` (bfcache friendly); keep `/sw.js` `no-cache`; `robots.txt`/`sitemap.xml` 1 d; `/manifest.json` 1 h (or hashed name).
4. Add `X-Robots-Tag: noindex` to `/data/*` and `/api/*` (allow crawl so Googlebot can render pages that fetch JSON; block indexing of raw JSON).
5. Netlify duplicates-in-flight: coordinate with the perf specialist: fetch each JSON once (memoise the promise); precache via SW (finding 22).
Acceptance test: second visit within a day makes 0 conditional requests for `/data/*` (DevTools Network "(disk cache)"/"(ServiceWorker)"); `curl -sI /assets/site-nav.<hash>.js` -> immutable; `curl -sI /icons/icon-192.<hash>.png` -> immutable; a data change deploys a new file name and old clients keep working until the update prompt.

### infra-netlify-14 | Prune the scanner redirects; explain and de-noise the 404 stream | severity: low | effort: S
Audit refs: T2. Moves: config simplicity; analytics clarity.
Evidence: section 4 (19 rules, no effect; two invalid patterns). ~1,900 scanner 404s/30 d = 63/day; at 2 credits per 10,000 requests the cost is negligible. Root of the mysterious "/" 404s: `OPTIONS /` and `GET /./` return 404 (VERIFIED), i.e. non-GET probes and path oddities.
Fix
- Delete all 19 rules. Static hosting has nothing behind those paths; every miss already gets the branded 404.
- Optional: return 410 or 404 identically; no need for redirects.
- Analytics hygiene: treat `/wp-*`, `/xmlrpc.php`, `/.env*`, `/.git/*`, `/graphql`, `/wp/` as known scanner noise in reporting; use the client-side RUM (JS) for "human" traffic since scanners do not execute it; compare Web Analytics page views vs RUM sessions to estimate the bot share.
- Do not block countries; see finding 32 for the proportionate plan.
Acceptance test: `netlify.toml` (or `_redirects`) contains no scanner rules; `curl -s -o /dev/null -w '%{http_code}' /wp-login.php` still 404.

### infra-netlify-15 | Duplicate host friendly-lolly-da85c0.netlify.app serves the full site; add host redirect and noindex previews | severity: medium | effort: S
Evidence: `curl -sI https://friendly-lolly-da85c0.netlify.app/` -> 200 with the site's full header set (VERIFIED). robots.txt there is identical (allows crawling), canonical tags point at the custom domain (mitigation only). With the Mapbox token restricted to the custom domain, visitors of the netlify.app copy get a blank map (403 tiles).
Fix: `_redirects` (host-based rules are supported for domains assigned to the site):
```
https://friendly-lolly-da85c0.netlify.app/*  https://gettysburginteractivemap.com/:splat  301!
http://friendly-lolly-da85c0.netlify.app/*   https://gettysburginteractivemap.com/:splat  301!
```
Deploy-preview and branch-deploy hosts (`deploy-preview-N--friendly-lolly-da85c0.netlify.app`) are different hostnames and are unaffected. For those contexts add `[context.deploy-preview] [[headers]]`/`X-Robots-Tag: noindex` (also tell reviewers previews need their own Mapbox token, finding 18). Also `http://www.` currently takes two hops (http://www -> https://www -> apex); acceptable.
Acceptance test: `curl -sI https://friendly-lolly-da85c0.netlify.app/historian` -> 301 to `https://gettysburginteractivemap.com/historian`; a deploy preview responds 200 with `X-Robots-Tag: noindex`.

### infra-netlify-16 | user-guide.pdf: serve inline, version the file name, keep an explicit download link | severity: low | effort: S
Audit refs: G1 (correction: it IS an attachment). Evidence: `netlify.toml:200-204` `Content-Disposition: attachment; filename="Gettysburg-Interactive-Map-User-Guide.pdf"`; footer link `site-nav.js:196` has no `download` attribute, the app's Help link uses `download` (`bundle.pretty.js:113115-113117`). Fix: `Content-Disposition: inline; filename="Gettysburg-Interactive-Map-User-Guide.pdf"`; the PDF opens in the browser viewer (readable, printable), while the Help link keeps `download` for the save use case; name the file with a version/date (`/guide/user-guide-2026.10.pdf`) so cache rules can be `immutable` and the footer can show "User Guide (PDF, v2026.10)"; PDF metadata title/author is a docs finding (G1). Acceptance test: `curl -sI /user-guide.pdf | grep -i content-disposition` shows `inline`; clicking the footer link opens the viewer.

### infra-netlify-17 | 404 semantics and OPTIONS | severity: low | effort: S
Evidence: `/404` and `/404.html` return 200 (noindex meta present, `404.html:7`); `OPTIONS /` returns 404 (a CORS preflight from a third-party page to any URL of this site gets a 404, harmless because there is no CORS API, but a Historian API will need real OPTIONS handling in its function).
Fix: `_redirects`: `/404.html /404 404!` is unnecessary churn; simply keep `noindex`. For future `/api/*` functions handle `OPTIONS` explicitly and return `Allow`. Nothing to do for static paths.
Acceptance test: none beyond keeping `noindex` on 404.html.

---------------------------------------------------------------------------------------------------

## 6. Findings: keys, tokens, third-party frames, service worker, PWA

### infra-netlify-18 | Mapbox token: it IS restricted; verify the list, fix the side effects, split dev/preview tokens, single config, alerts | severity: medium | effort: S-M
Audit refs: X1 (corrected). Depends on: none for the dashboard steps; 28 for per-context env injection. Moves: Security B -> A, Reliability (silent blank maps), cost control.

Evidence (VERIFIED, cache-busted, see section 1 for the full matrix)
- Tile/TileJSON/vector/geocoding/static endpoints: 403 for no Referer, `https://evil.example/`, `http://localhost:3000/`, `https://friendly-lolly-da85c0.netlify.app/`, a deploy-preview host, and `https://gettysburginteractivemap.com.evil.example/`; 200 for `https://gettysburginteractivemap.com/`. Style/sprite/glyph endpoints: 200 for every Referer (public Mapbox style assets; not an issue).
- Token is a `pk.` token (`GET /tokens/v2?access_token=...` -> `TokenValid`, `usage: pk`, user `mlegere9789`); scopes and the exact URL list are UNVERIFIED (needs the dashboard). Mapbox matching rules (docs): subdomains of an allowed URL are allowed; no wildcards, no IP addresses; localhost must be listed explicitly; a request without Referer is rejected when any restriction exists; up to 100 URLs per token.
- Literal copies: `bundle.pretty.js:97210`, `:102899` and the 9 pages `camera.html:64`, `cinematic-export.html:85`, `compare.html:97`, `ground-remembers.html:56`, `immersive.html:68`, `sandbox.html:71`, `unit-rendering-reference.html:56`, `viewshed.html:57`, `watch-together.html:109`.
- Side effects of a restricted token: (1) `localhost` and every Deploy Preview will show a blank map (403 tiles) unless separate tokens exist; (2) users whose browser or extension strips `Referer` (privacy extensions, `Referrer-Policy: no-referrer` on a page, some in-app browsers) get a silently blank map: the app registers no visible map-error UI (the only `on("error")` hits are inside the Mapbox library, `bundle.pretty.js:61005`); (3) this makes `Referrer-Policy: strict-origin-when-cross-origin` (`netlify.toml:10`) load-bearing; tightening it to `no-referrer`/`same-origin` would black out every map.
- Billing: GL JS web is billed per map load (free tier 50,000/month, then USD 5 per 1,000). Current load is small (about 1,700 home views + about 1,600 other page views per 30 days per the BRIEF, of which only the 8 map pages create a map: an upper bound of about 3.4k loads), but C6 doubles home loads for first-time visitors (two `sku` values per tile in the Lighthouse log).

Fix
1. Dashboard verification (runbook F.1): open the token, confirm URL list is exactly `gettysburginteractivemap.com` (subdomains inherit; do NOT add `netlify.app`), confirm scopes are public-read only (`styles:tiles`, `styles:read`, `fonts:read`; drop `datasets:read`, `vision:read`, anything else), note the token's created date.
2. Create two more `pk.` tokens: `gtbg-dev` (URLs: `localhost`) and `gtbg-preview` (URL: `netlify.app` is the only way to cover `deploy-preview-N--friendly-lolly-da85c0.netlify.app`, which is a sibling label, not a subdomain of the site's default host; that authorises every Netlify site, so treat the preview token as low-value: minimum scopes, separate usage view, rotate monthly, or password-protect previews on Pro). Never ship the dev/preview tokens in production HTML.
3. One source of truth: replace the 11 literals with a single build-time constant (`VITE_MAPBOX_TOKEN`, per Netlify context: production/deploy-preview/branch-deploy/dev) or, without a build, a tiny `/assets/config.<hash>.js` exporting `window.GTBG_CONFIG = {mapboxToken}` loaded first by every page. Rotation then touches one file.
4. Rotation (optional hygiene, the token has always been public by design): create new token, deploy, wait out caches (device TTL 12 h, tile `max-age=43200`), delete the old token, verify the old token now returns 401. Do it when you do step 3.
5. Usage alerts: enable Mapbox usage/billing notifications (account.mapbox.com Billing; exact UI labels UNVERIFIED), and calendar a monthly look at Statistics for anomalies (no hard spending cap is documented).
6. In-app failure UX (app team): on GL `error` events with `status` 401/403 for the tile source show an inline notice ("Map imagery is blocked: your browser is hiding the referrer for this site. Allow referrers for gettysburginteractivemap.com or try another browser") and keep units/timeline usable on a plain dark background (`{version:8, sources:{}, layers:[{id:'bg',type:'background',paint:{'background-color':'#0a0a14'}}]}` fallback style needs no network).
7. Do not proxy or self-cache tiles server-side (Mapbox Product Terms prohibit redistribution/proxying; see finding 23 for the permitted on-device cache).
Acceptance test
- Re-run the referrer matrix (script `tmp-infra-netlify` commands in section 1): same results after any change; dev token works only from `http://localhost:*` and fails from production Referer; preview token fails from production.
- `grep -R "pk\.eyJ" dist/ | wc -l` = 1 (the config module) or 0 (build-time constant in the bundle only).
- Blank-map UX: with `Referrer-Policy: no-referrer` injected in DevTools override the notice appears and the timeline still works.

### infra-netlify-19 | Third-party frames (Google Street View, NPS video): restrict the Google key, sandbox the frames, click-to-load, disclose | severity: medium | effort: M
Audit refs: X2, X5, H13. Depends on: 01 (frame-src), 36 (privacy). Moves: Security, Privacy, Performance (INP: the Google frame is heavy), Best Practices.

Evidence
- Google Maps Embed key `AIzaSyC-1eIr...` at `bundle.pretty.js:110610`, used at `:110661` `https://www.google.com/maps/embed/v1/streetview?key=${mO}&...`. External probes (VERIFIED): Geocoding, Directions, Distance Matrix, Elevation, Time Zone, Places (legacy and New), Static Maps and Street View Static all return REQUEST_DENIED ("not activated"/"legacy API not enabled"), i.e. no paid API is callable with this key today. Referrer restriction and API restriction list: UNVERIFIED (embed shell is identical for every Referer). Maps Embed API is documented as free/no quota, so the exposure is bounded, but an unrestricted key can be enabled for paid APIs later by mistake.
- The Street View iframe (`bundle.pretty.js:110660-110665`) renders for EVERY walkthrough stop as soon as a stop is shown: no click-to-load, no `loading="lazy"`, no `referrerpolicy`, no `sandbox`, `allowFullScreen` only. So Google is contacted (IP, user agent, `Referer`=site origin, its own cookies) simply by opening the walkthrough.
- Second frame: NPS video panel `bundle.pretty.js:100461-100466` `src: M.videoUrl`, 17 URLs `https://www.nps.gov/media/video/view.htm?id=...` (`bundle.pretty.js:100080, 104112-104432`): loads a full nps.gov CMS page (jQuery, USWDS, jquery.cookie, oss.maxcdn.com shims) into a small picture-in-picture frame after the user presses "Show Video" (`:100426-100433`). nps.gov sends no XFO/frame-ancestors (VERIFIED) so it works, but the page can set its own cookies/analytics; no `sandbox`, no `allow`, no `loading`.
- `index.html:47-52` preconnects to `www.google.com`, `maps.googleapis.com`, `streetviewpixels-pa.googleapis.com` on every load: 3 idle sockets and DNS lookups to Google for visitors who never open Street View (also a privacy and Lighthouse "preconnect" hygiene issue).
Fix
1. Google Cloud (runbook F.2): key restrictions = HTTP referrers `https://gettysburginteractivemap.com/*` (+ `https://www.gettysburginteractivemap.com/*`), API restriction = Maps Embed API only, budget alert (USD 1) with 50/90/100% thresholds; create a second key for `http://localhost:*/*` dev. Rotate after restricting (old key public for months).
2. Click-to-load facade for Street View: show a static placeholder + button "Load Street View (contacts Google)"; remember the choice in `sessionStorage` (per visit, not persisted long-term) so it does not re-prompt per stop; then create the iframe. Also add `loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"`, `allow="fullscreen"`, `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"` (test: the embed needs scripts and same-origin; "View larger map" needs popups).
3. NPS frame: same attributes (`sandbox` without `allow-top-navigation`, `allow-forms` not needed), plus an inline disclosure line next to the "Show Video" button ("Opens a page from nps.gov"). Consider replacing the frame with an outbound link (`target=_blank rel="noopener noreferrer"`) if the small PiP proves unusable on phones (UX finding for the mobile specialist): a full nps.gov page in a tiny frame is a poor experience and the least-privilege option is a link.
4. Delete the three Google preconnects (`index.html:48-52`) and the two dead `*.tiles.mapbox.com` preconnects (`index.html:43-44`); keep `api.mapbox.com` (crossorigin) only.
5. CSP `frame-src https://www.google.com/maps/embed/ https://www.nps.gov/media/video/` on `/` only (finding 01); `Permissions-Policy` fullscreen entries (finding 04); disclose both in privacy (finding 36).
6. Longer-term option to remove the API key entirely: keyless `https://www.google.com/maps/embed?pb=...` URLs generated from Google Maps "Share > Embed a map" per stop. Trade-off: fragile encoded parameters; only worth it if key management becomes a burden.
Acceptance test
- Opening the walkthrough makes zero requests to `google.com`/`gstatic.com`/`googleapis.com` until the button is pressed (DevTools Network filter "google").
- Google Cloud console screenshot/export shows referrer + API restrictions; requests with the key from a non-allowed Referer to the Embed URL render Google's referer-denied message in a real browser.
- `curl` of Geocoding/Places/etc. with the key still REQUEST_DENIED.
- Lighthouse "Preconnect to required origins" no longer lists unused Google origins.

### infra-netlify-20 | Mapbox attribution is disabled on two maps (ToS compliance) | severity: low | effort: S
Evidence: `attributionControl: !1` at `bundle.pretty.js:102988` (mini map) and `:110777` (Watch Together in-app map). Mapbox docs: the Mapbox logo is mandatory and text attribution is required on maps using Mapbox designs/data; no small-map exception is documented. Cinematic Export records the canvas (`cinematic-export.html:141-196`), which has neither the logo nor attribution baked in.
Fix: enable a compact attribution control on both (`attributionControl: false` + `map.addControl(new mapboxgl.AttributionControl({compact:true}))`); do not hide the logo; in Cinematic Export burn a small "(c) Mapbox (c) [style attribution] | gettysburginteractivemap.com" line into each recorded frame (or the final second) and include the same text in the download filename/metadata description. Copy the text from the style's source `attribution` field so it stays current.
Acceptance test: every map instance shows the logo and an attribution toggle (`.mapboxgl-ctrl-logo`, `.mapboxgl-ctrl-attrib` present in the DOM for the 2 maps); an exported video shows the attribution line.

### infra-netlify-21 | HOTFIX: stop the service worker from forcing a second page load (and a second Mapbox map session) | severity: critical | effort: S
Audit refs: C6, P1, P5, P7 (redirects, LCP). Depends on: none. Moves: Lighthouse mobile Performance (removes the `redirects` audit: 9,070 ms), first-visit LCP/FCP in RUM, Mapbox billing (about 2x map loads on first visits), Reliability.

Evidence
- `index.html:263-268`: `navigator.serviceWorker.addEventListener('controllerchange', ... location.reload())`; `sw.js:17` `self.skipWaiting()`; `sw.js:30` `clients.claim()`. Sequence on a first visit: register (after `load`, `index.html:269-275`) -> install (`skipWaiting`) -> activate -> `clients.claim()` -> `controllerchange` -> `location.reload()`.
- Lighthouse network log (lh_mobile.json): Document `/` at t=1 ms and again at t=909 ms; the second load's script/CSS/manifest/data requests all have `transferSize: 0`; `redirects` audit lists `https://gettysburginteractivemap.com/` with `wastedMs: 9066`. Every map tile appears twice with different session tokens (`.../v4/mapbox.satellite/15/9354/12425.webp?sku=101h6qVkrIGrU` and `?sku=101OCegrJEdUH`): two `Map` instances = two billable map sessions.
- Additional install-time hazards in the same file: `sw.js:5-13` hard-codes hashed names for only 2 of the 5 hashed assets (missing `BookmarkPanel-C5YT4b5k.js`, `HelpModal-CFV9T0zH.js`, `InterpolationWorker-ufiwa2-e.js`), and `cache.addAll` is all-or-nothing: the next deploy that renames a file makes install fail forever (404) until `sw.js` is hand-edited; `sw.js:43-46` caches ANY response (including a 404/500) from `/assets/` cache-first forever; `sw.js:16-21` starts a precache of about 2.3 MB of JS in the same window as the page's own critical requests.

Root cause: an update-forcing pattern (skipWaiting + claim + reload) designed for "always-fresh" but it also fires on the very first install, when there is nothing to refresh.

Fix (edits to the two files that exist today)
`index.html` lines 255-277: replace the whole inline block with an idle registration and NO reload:
```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      (window.requestIdleCallback || function (f) { setTimeout(f, 3000); })(function () {
        navigator.serviceWorker.register('/sw.js').catch(function (e) { console.warn('Service worker registration failed:', e); });
      }, { timeout: 8000 });
    });
  }
</script>
```
`sw.js` (minimal safe version until finding 22 lands):
```js
const CACHE_NAME = 'gbg-v6';                       // bump: v5 caches are deleted on activate
const PRECACHE_ASSETS = [
  '/assets/index-Cg8FAMXN.js', '/assets/index-B4G7Z_2G.css',
  '/assets/BookmarkPanel-C5YT4b5k.js', '/assets/HelpModal-CFV9T0zH.js', '/assets/InterpolationWorker-ufiwa2-e.js',
  '/favicon.ico', '/icons/icon-192.png', '/icons/icon-512.png', '/apple-touch-icon.png', '/manifest.json',
];
self.addEventListener('install', e => {
  // no skipWaiting(): a new worker waits until the old one's tabs close
  e.waitUntil(caches.open(CACHE_NAME).then(c => Promise.allSettled(PRECACHE_ASSETS.map(u => c.add(u)))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
```
and in the same file replace the three `put` sites so error responses are never cached and a miss never becomes `respondWith(undefined)`:
```js
// /assets/ (cache-first)
e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
  if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.put(e.request, copy))); }
  return res;
})));
// /data/ (keep network-first for now, same guard, and a real fallback)
e.respondWith(fetch(e.request).then(res => {
  if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.put(e.request, copy))); }
  return res;
}).catch(() => caches.match(e.request).then(r => r || Response.error())));
// last handler (navigations and everything else): same `|| Response.error()` fallback instead of returning undefined
```
(`clients.claim()` on first install is fine once the page no longer reloads on `controllerchange`.) Preserve exact-case asset names as in the HTML. Because the old (v5) worker already in visitors' browsers is replaced by a worker that does not call `skipWaiting`, the change reaches them the next time all their tabs close, which is the standard behaviour.
Acceptance test
- Fresh profile, throttled 4G, DevTools Network: exactly ONE Document request for `/`; `navigator.serviceWorker.controller` becomes non-null without a navigation; exactly one `styles/v1/...satellite-v9` request per visit (one `sku`).
- Lighthouse mobile: `redirects` audit passes; Performance rises (the trace's 9 s of waste disappears).
- Deploy a change that renames the main JS; open an old tab: no console errors; new tab gets the new build; opening Help in the old tab still works (all 5 chunks precached).

### infra-netlify-22 | Rebuild the service worker properly (Workbox, prompt-based updates, navigation preload, offline page, versioned caches, kill switch) | severity: high | effort: L
Audit refs: C6, P1, P5. Depends on: 28 (build) for automatic manifest; 21 first. Moves: repeat-visit LCP/FCP/INP, offline/PWA grade, Reliability.

Evidence: `sw.js` (76 lines) reviewed line by line:
- `:35-76` fetch handler: every same-origin request goes through `respondWith`, including navigations, adding SW start-up latency (about 50 to 100 ms cold) with no caching benefit; HTML is never put in any cache (`:72-75` `fetch(e.request).catch(() => caches.match(e.request))` and `caches.match` returns `undefined` offline, so `respondWith(undefined)` throws a network error): there is NO offline capability, contradicting the header comment.
- `:53-56` precached static files are served cache-first but `/manifest.json` and icons are un-fingerprinted (stale forever for SW users until `CACHE_NAME` is bumped by hand).
- `:41-50` and `:61-70`: `caches.open(...).put(...)` not wrapped in `event.waitUntil`, no `res.ok`/`type` guard, no size or age cap: unbounded growth of `/data/` entries; error responses cached.
- `:61-70` `/data/` is network-first: online it never uses the cache (defeats the HTTP cache's `max-age`), so it makes repeat loads slower than no SW.
- Precaching by hand (`:5-13`) will break on every rename (finding 21).
- No update UX: none; the page forces a reload (C6).
- Lighthouse console spam "preload not used / cross-world SW mismatch" (P5) comes from `index.html:56-57` (`rel=preload as=style` + `onload` swap) interacting with SW-served responses.
- Real offline needs more than the shell: `map.on('load')` needs the Mapbox style JSON (network); without a fallback style the app never reaches 'load' offline (finding 18 step 6).

Design (target behaviour)
| Concern | Decision |
|---|---|
| Tooling | `vite-plugin-pwa` (1.3.x) with `strategies: 'injectManifest'` and `workbox-build` 7.4.x; SW source in `src/sw.js`; manifest injected at build. Until the Vite project exists, generate the precache list with `workbox-cli injectManifest` against the deploy folder (works with today's zip/drag-and-drop flow). |
| Registration | External deferred module, after `load` + `requestIdleCallback` (or 3 s) so the install-time precache never competes with LCP. No `reg.update()` on every load (browsers already check on navigation); call `reg.update()` on `visibilitychange` when hidden -> visible, at most hourly, for long-lived tabs. |
| Install | `precacheAndRoute(self.__WB_MANIFEST)`: all hashed `/assets/*` (including lazy chunks and the worker: fixes chunk-404-after-deploy for old tabs), fingerprinted `site-nav`, icons, `manifest`, `offline.html`, and the core boot data set (about 76 JSON files, roughly 825 KB raw / 170 KB br; Cache Storage holds the decoded bytes, so about 3.2 MB total including the 2.28 MB bundle). Set `maximumFileSizeToCacheInBytes: 4 * 1024 * 1024` (Workbox default is 2 MiB and would silently skip the 2.28 MB main chunk until code-splitting lands). |
| Activate | NO automatic `skipWaiting()`. `clientsClaim()` only (first install gets control without reload). One-time cleanup deletes legacy `gbg-v5`/`gbg-v6`. `cleanupOutdatedCaches()`. |
| Update UX | `workbox-window`: on `waiting`, show an accessible toast (`role="status"`, `aria-live="polite"`, text "A new version is available", buttons "Reload" and "Later"); on Reload -> `wb.messageSkipWaiting()`; on `controlling` reload ONLY if the user accepted. Before reload persist tick/day/speed (URL state, finding 26) so nothing is lost. Never reload during playback without consent. |
| Navigations | `NetworkFirst` (3 s timeout) + navigation preload for HTML documents (`/`, each tool page), runtime cache `pages-v1` (max 30 entries, 7 days), fallback `offline.html` (precached; friendly, branded, lists what still works offline). Redirect-safe response cleaning for 301s. |
| /data | If files are content-hashed and precached: no runtime rule. Else `StaleWhileRevalidate`, `data-v1`, max 120 entries, 14 days, `purgeOnQuotaError`. |
| Fingerprinted assets | Precached; fallback `CacheFirst` runtime `assets-v1` for anything not in the manifest. |
| Mapbox | Style/sprite/glyph/events: not intercepted (HTTP cache + Mapbox rules). Tiles: optional, finding 23. |
| RUM/Netlify/`/.netlify/*`, `/api/*` | Not intercepted (never cache, never delay). |
| Versioning | Precache cache name is versioned by Workbox; runtime caches suffixed `-v1`; bump suffix when a strategy's semantics change. |
| Kill switch | Ship a `sw-kill.js` procedure (runbook F.6) and a `/reset` page that sends `Clear-Site-Data: "cache", "storage"` (WARNING: storage also wipes bookmarks/prefs) so support can unstick a broken client. |
| Limits | Cap entries (above); `navigator.storage.estimate()` logged to the console in debug only; iOS Safari evicts unused origins after about 7 days: assume cold caches. |
| Safety | SW only ever handles same-origin GETs (plus the tile route); everything else falls through to the network. |

Full source (SW, registration module, offline page, Vite config) in appendix E. 
Acceptance test
- Lighthouse (installable + offline): DevTools "Offline" + reload of `/` shows the app shell and, if the map style is unreachable, the fallback style + notice; `/some-unvisited-page` shows `offline.html`, not the browser error page.
- Deploy v2 while a tab on v1 is open: toast appears; nothing reloads until the user clicks Reload; after Reload the new build loads; old chunk requests never 404 (precached).
- First visit: one Document request, SW installs after idle, `controller` set by claim, no `controllerchange`-driven navigation.
- Repeat visit (warm SW, 4G throttle): `/data/*` and JS served from cache (0 network for hashed files), LCP improves versus baseline.
- `caches.keys()` after two deploys contains only current precache + `pages-v1`, `assets-v1`, (`data-v1`), no `gbg-*` legacy caches.

### infra-netlify-23 | Mapbox tile caching: allowed on-device, bounded, per-device, optional | severity: low | effort: M
Depends on: 22. Moves: repeat-visit map paint (returning visitors), not billing.
Evidence: Mapbox Product Terms (Oct 1 2025 text; a 2026-07-21 revision exists that I could not read): licensed map content delivered through Mapping APIs may be cached on an end user's device for up to 30 days on the same device that made the request and the cache must be populated directly from the Mapping APIs; proxying/redistribution and server-side caching are prohibited; Mapbox docs: tile `Cache-Control: max-age=43200` (12 h device TTL), CloudFront `s-maxage`. Tile URLs carry a per-session `sku` token, so the raw URL is a different cache key every visit.
Decision: optional Phase-2 feature; only helps returning visitors (RUM p75 is dominated by first visits), does not reduce billing (map loads are counted on session creation, not tile fetches).
Fix if adopted: Workbox route for `https://api.mapbox.com/v4/mapbox.satellite/` with `CacheFirst`, cache `mapbox-tiles-v1`, `ExpirationPlugin({maxEntries: 400, maxAgeSeconds: 14*86400, purgeOnQuotaError: true})` (stays inside the 30-day rule), `CacheableResponsePlugin({statuses:[200]})`, and a `cacheKeyWillBeUsed` plugin that strips `sku` and `access_token` from the key. Never serve tiles to anyone else, never pre-fetch a "download the whole battlefield" pack on the server side. Verify that tile fetches from Mapbox's blob worker are actually controlled by the SW (dedicated workers created from a controlled page from a blob URL inherit the controller; UNVERIFIED for GL JS 3.x, test in DevTools "Application > Cache").
Acceptance test: revisit with SW warm: tile requests show "(ServiceWorker)"; entries never exceed 400 or 14 days; the map still shows fresh tiles after `maxAge`; re-read the current Product Terms text before shipping.

### infra-netlify-24 | Web app manifest and icon set overhaul | severity: medium | effort: M
Audit refs: E1, E2. Depends on: 11 (canonical URLs), 25 (screenshots), 26 (shortcuts with ticks). Moves: PWA/installability grade, mobile fit and finish, SEO branding consistency.
Evidence (`manifest.json`, `icons/*`, `apple-touch-icon*.png`):
- `:9` `"orientation": "landscape"` locks the installed app to landscape on phones while a mobile layout exists.
- `:12-22` both icons declare `"purpose": "any maskable"` in one entry. Pixel analysis (PIL): 192/512 icons have 4 colours, transparent corners (alpha 0) and artwork filling about 95 percent of the canvas. As `maskable` the OS crops to a circle/squircle and fills transparency with an arbitrary colour, clipping the artwork (maskable safe zone is the central 80 percent, radius 40 percent). `apple-touch-icon.png` (180x180) also has transparent corners: iOS renders transparent pixels black.
- `:2` name "Gettysburg Animated Battlefield Map" vs domain "interactive" (E2): the same string is in `<title>`, og/twitter titles, JSON-LD, privacy/terms titles, the footer `site-nav.js:190`. One brand string is needed everywhere.
- Missing: `id`, `scope`, `lang`, `shortcuts`, `screenshots[].form_factor`; the two screenshots are the corrupt duplicate (finding 25). `Content-Type` is `application/json`. `categories` includes non-registry values (harmless).
- `/icons/*` is `immutable` for a year on unversioned names (`netlify.toml:32-35`).
- `<link rel="manifest">` only in `index.html:7`.
Fix
1. New manifest (appendix E.2): `id: "/"`, `scope: "/"`, `start_url: "/?source=pwa"` (only after 26 lands; else `"/"`), `display: "standalone"`, NO orientation, `lang: "en-US"`, `dir: "ltr"`, separate icon entries: `any` PNG 192 and 512, `any` SVG (`sizes: "any"`), `maskable` PNG 192 and 512 (full-bleed `#0a0a14` background, glyph inside the central 60 to 66 percent), `shortcuts` (Ask the Historian `/historian`, Search `/search`, Turning Points `/turning-points`, Battlefield AR `/ar`; add tick deep links only after finding 26), `screenshots` with `form_factor` wide (1280x720, three) and narrow (750x1334, three) of REAL captures, `categories: ["education","entertainment","travel"]`, `prefer_related_applications: false`. Optional `launch_handler: {"client_mode":"navigate-existing"}`. `display_override` not needed.
2. Fingerprint the icon files (`icon-192.v2.<hash>.png`), keep `immutable`; add `/favicon.svg` and keep `favicon.ico` (16/32 present); make `apple-touch-icon.png` opaque full-bleed 180x180.
3. Serve with `Content-Type: application/manifest+json` (explicit `_headers` entry) or rename `manifest.webmanifest`.
4. Add `<link rel="manifest">`, `theme-color` and `apple-touch-icon` to every page via the shared head partial (build) or `site-nav.js`-independent static tags.
5. Brand name decision (single string) fed from one constant into title, og, JSON-LD, manifest, footer, privacy/terms.
6. Validate with Chrome DevTools > Application > Manifest (no warnings), maskable.app preview, Lighthouse installability, and a real Android + iOS install.
Acceptance test: DevTools Manifest pane shows zero warnings and previews of both purposes; installed Android app rotates freely; maskable icon is not clipped in the circle preview; iOS home-screen icon has no black corners; `curl -sI /manifest.json | grep -i content-type` = `application/manifest+json`.

### infra-netlify-25 | Social/OG and manifest screenshots are one corrupt, duplicated placeholder image | severity: medium | effort: S-M
Audit refs: new (relates to T1 discovery, E-series). Depends on: none. Moves: SEO/social sharing, PWA install UI, Best Practices.
Evidence (VERIFIED): `screenshots/day1.png` and `day3.png` are byte-identical (md5 `3f6646c99f3416a1aa35fea67bed21c5`, 17,585 bytes). PNG chunks are CRC-valid but IHDR = 1280x720, bit depth 8, colour type 2 (RGB) while the inflated IDAT is 3,687,120 bytes = (1280x4+1)x720, i.e. RGBA data; expected RGB size is 2,765,520. PIL: "unrecognized data stream contents"; libpng-based decoders will misinterpret rows. Decoded as RGBA it is an 80-colour dark gradient (placeholder, not a screenshot). Referenced by `index.html:21,25` (og:image/twitter:image) and 20 more pages (`og:image` on 21 pages, `twitter:image` on 11), and by the manifest (`:27-37`) with labels claiming different scenes.
Fix: generate real images with a repeatable script (Playwright): (a) OG images 1200x630 JPEG/WebP/PNG under 300 KB, one for home plus per-tool where useful (Turning Points, Compare, Documentary, Sandbox), with `og:image:width/height/alt`, `twitter:card summary_large_image` on every page (currently 11 of 21); (b) manifest screenshots as in finding 24; (c) name files with a content hash and cache immutably; (d) add a CI check that every `og:image` returns 200, is a decodable image, and the dimensions match the meta.
Acceptance test: Facebook Sharing Debugger and Twitter/X card validator render the intended image; `python -c "PIL.Image.open(...)"` opens every referenced image; distinct hash per scene.

### infra-netlify-26 | Deep-link contract is not implemented: share links, embed CTA, regiment map links, and future PWA shortcuts all land on the default state | severity: high | effort: M
Audit refs: new (H4/H13 adjacent; core function). Depends on: app source (N1) for a clean fix; interim patch possible in the bundle. Blocks: manifest shortcuts (24), embed (02).
Evidence: the only `location.search` read in the main app is `new URLSearchParams(window.location.search).get("ancestor")` at `bundle.pretty.js:101019` (plus Mapbox's own `#map=` hash handling `:88775-88850`). Yet the site emits: bookmark/share links `?t=&u=&z=&ll=` (`bundle.pretty.js:97823-97830`, `$k`), `embed.html:60` `index.html?tick=&vignette=`, `documentary.html:92` `/index.html?tick=&vignette=`, `regiment.html:247` `/?unit=&tick=`. None of `t`, `u`, `z`, `ll`, `tick`, `vignette`, `unit` is parsed. (Static evidence; confirm in a browser with `/?tick=300`.)
Fix (app team, spec here because infra and PWA depend on it): one documented URL-state contract, parsed after data load and applied through the store: `tick` (1 to 675; alias `t`), `day` (1 to 3), `unit` (regiment id; alias `u`), `vignette` (id; opens its card and flies to it), `z` zoom (11 to 18), `ll` lat,lng (within maxBounds), `ancestor` (existing), `speed`; validate/clamp everything; write state back with `history.replaceState` (debounced) so the address bar is always shareable; update all emitters to the canonical names; unit tests for parse/serialise round trip. Canonical URL of the app stays `/`; querystrings must not create separate analytics rows (Netlify Analytics groups by path).
Acceptance test: opening each emitted URL form restores tick/unit/zoom/center; `?tick=999` clamps to 675; invalid `unit` ignored; back/forward keeps working; manifest shortcut URLs (later) work.

---------------------------------------------------------------------------------------------------

## 7. Findings: Netlify platform, process, Historian API, traffic, DNS, legal, accounts

### infra-netlify-27 | index.html head: remove the CSS preload/onload swap, dead preconnects and the cross-world SW mismatch | severity: medium | effort: S
Audit refs: P4, P5, X3. Depends on: none (edit `index.html`); interacts with 01, 21, 22. Moves: Lighthouse render-blocking/console cleanliness, strict-CSP readiness.
Evidence
- `index.html:55-58`: `<link rel="modulepreload" href="/assets/index-Cg8FAMXN.js" crossorigin />` then `<link rel="preload" as="style" href="/assets/index-B4G7Z_2G.css" crossorigin onload="this.onload=null;this.rel='stylesheet'" />` plus a `<noscript>` copy. (a) The inline `onload` attribute is an inline event handler that a strict CSP blocks (it would need `script-src-attr` with `'unsafe-hashes'`). (b) Preload-then-swap combined with a service worker that answers the request is the likely source of the repeated console warnings "preload not used / cross-world service worker mismatch" (P5), and it makes the CSS depend on script execution. The CSS is small (5,224 bytes brotli, 40,827 raw per the Lighthouse network log) and the inline splash CSS already covers first paint.
- `index.html:41-52`: preconnect/dns-prefetch to `events.mapbox.com`, `a.tiles.mapbox.com`, `b.tiles.mapbox.com` (no request to the tile hosts in either Lighthouse run), and to `www.google.com`, `maps.googleapis.com`, `streetviewpixels-pa.googleapis.com` (used only after a user action): five origins that are never contacted at load (the two tile hosts and the three Google hosts) and `events.mapbox.com`, which is only contacted late; only `api.mapbox.com` is needed early.
- `index.html:279-280`: `site-nav.css` and `site-nav.js` are render/parse-blocking (P4); on `/` the script only provides `window.GTBG_MENU`, used at `DOMContentLoaded` (`index.html:307`).
Fix
1. Replace lines 56-58 with a plain `<link rel="stylesheet" href="/assets/index-B4G7Z_2G.css" crossorigin>`; verify FCP/LCP with a Lighthouse run (5 KB is not a meaningful block). If the swap is kept, attach it from an external deferred script (`document.getElementById('app-css').rel = 'stylesheet'`), never an inline handler, and make `crossorigin` identical on the preload and the stylesheet.
2. Keep the `modulepreload`; keep exactly one `preconnect` (`https://api.mapbox.com`, `crossorigin`); delete the other nine hints (including the redundant `dns-prefetch` lines).
3. `defer` on `site-nav.js` (order preserved relative to the module script) and test the Extra Features overlay; better, fold nav/footer into the build so it is not a separate blocking request (finding 13 fingerprints it meanwhile).
4. Cross-check with finding 21/22: after the SW no longer reloads and serves fingerprinted assets, the cross-world warnings should disappear; if not, drop the preload entirely.
Acceptance test: DevTools console shows zero "preload" warnings on a warm and a cold load; `grep -c ' onload=' index.html` = 0; `grep -c 'rel="preconnect"' index.html` = 1; Lighthouse render-blocking-resources savings shrink; Extra Features overlay still populates.

### infra-netlify-28 | Move to Git-connected deploys (previews, contexts, env vars, functions, build plugins) and retire drag-and-drop deploys | severity: high | effort: L-XL
Audit refs: N1, P6. Depends on: source recovery by the app specialists. Everything in phases 2 and 3 depends on this.
Evidence: Netlify's "Download source code" returns the deployed tree (SRC identical to DEPLOY, 119 files, BRIEF N1); `netlify.toml:1-2` `publish = "."`; the tree contains built output plus stray developer pages. Netlify docs: a manual (drag-and-drop/CLI/API) deploy runs no build command; build plugins and the CSP-nonce extension do not run; Netlify Functions/Edge Functions need a build (CLI `--build` or Git); manual/API deploys strip dot-folders (`.well-known`); Deploy Previews, branch deploys and per-context env vars exist only with Git. Live evidence of the missing safety net: the asset zip case-mangling, dev pages shipped (`/diagnostics`), placeholder screenshot, hand-patched minified bundle (README of RECON_SRC).
Fix
1. Private GitHub repo. Commit the recovered React/Vite source (RECON_SRC reconciled against the deployed 2.28 MB bundle by the app specialists) and keep the deployed tree under `legacy/deploy-6aa16d61/` as the reference until parity is proven. Add `.nvmrc`, lockfile, `package.json` scripts (`build`, `preview`, `test`, `check:headers`, `check:csp`).
2. Netlify: link the repo; production branch `main`; enable Deploy Previews for pull requests and branch deploys for `next`; build `npm run build`, publish `dist`; `[build.processing.html] pretty_urls = false`.
3. `netlify.toml` becomes small and static: build, processing, plugins, `[context.*]` env; ALL headers/redirects generated into `dist/_headers` and `dist/_redirects` by `scripts/gen-netlify-config.mjs` (appendix B) so there is one source of truth and no overlapping same-name rules.
4. Env vars: `VITE_MAPBOX_TOKEN` per context (production/deploy-preview/branch-deploy/dev; finding 18); secrets (future `ANTHROPIC_API_KEY`) marked "Contains secret values" and scoped to Functions/Runtime only.
5. Production safety: branch protection requiring CI (finding 29); optionally "Stop auto publishing" so a build only goes live after checks; documented rollback: Netlify UI > Deploys > pick the previous deploy > "Publish deploy" (instant, no rebuild).
6. Release hygiene: exact-case file names (N1 correction: Netlify matches case-insensitively, but browser/SW caches key on the exact string); CI job that resolves every `href/src` in `dist` with exact case.
7. Deploy notifications (email/Slack) for failed and succeeded production deploys.
Acceptance test: pushing a branch produces a preview URL with `X-Robots-Tag: noindex`, the dev Mapbox token, and passing checks; merging to `main` is the only path to production; `git log` explains every deploy; the Netlify "Download source" button is no longer needed; a bad deploy is rolled back in under 2 minutes using "Publish deploy".

### infra-netlify-29 | Automated quality gates (Lighthouse, headers, CSP crawl, links, images) | severity: medium | effort: M
Audit refs: P7. Depends on: 28. Moves: keeps every category green after the first fix pass.
Gates and where they run
| Gate | Tool | Pass condition |
|---|---|---|
| Lighthouse mobile + desktop on `/` and 6 key tool pages | `@netlify/plugin-lighthouse` 6.x (build-time, fails the deploy) or `treosh/lighthouse-ci-action` against the Deploy Preview URL (3 runs, median) | Perf >= 95, A11y >= 95, Best Practices >= 95, SEO >= 95 on both presets; LCP <= 2500, CLS <= 0.1, TBT <= 200 |
| Header regression | `scripts/check-headers.sh` (curl + grep against preview) | Asserts per page class: CSP enforced, no `unsafe-inline`, `frame-ancestors`, Permissions-Policy, COOP, HSTS, cache rules, embed framing, `/diagnostics` 404 |
| CSP crawl | Playwright script (appendix C.4) on the preview | 0 `securitypolicyviolation` events |
| Link/asset integrity | `netlify-plugin-checklinks` + custom exact-case resolver | 0 broken internal links; every `og:image` decodes and matches declared size |
| Manifest/PWA | Lighthouse installability + maskable.app / PWABuilder checks | no manifest warnings; icons decode |
| Dependency and secrets | `npm audit --omit=dev`, Dependabot/Renovate, `gitleaks` | no high vulns; no `sk.`/API keys in repo |
| Accessibility | axe-core in Playwright on every page class | 0 serious/critical |
Sample plugin config (thresholds are the A+ bar; audits list the pages):
```toml
[[plugins]]
  package = "@netlify/plugin-lighthouse"
  [plugins.inputs]
    fail_deploy_on_score_thresholds = "true"
  [plugins.inputs.thresholds]
    performance = 0.95
    accessibility = 0.95
    best-practices = 0.95
    seo = 0.95
  [[plugins.inputs.audits]]
    path = "/"
  [[plugins.inputs.audits]]
    path = "/search"
  [[plugins.inputs.audits]]
    path = "/compare"
  [plugins.inputs.settings]
    preset = "mobile"      # run a second [[plugins]] entry (or LHCI) with preset = "desktop"
```
Note: the plugin needs a static build directory (fine here) and does not audit SSR; the mobile preset is its default; a desktop run needs its own entry. Effort is mostly authoring the two scripts (check-headers, csp-crawl).
Acceptance test: a PR that reintroduces `unsafe-inline`, breaks the embed framing, or drops mobile perf below 95 turns the check red.

### infra-netlify-30 | Verify the Netlify plan and credit exposure; adopt deploy discipline | severity: medium | effort: S
Evidence: Netlify credit-based plans (docs): Free = 300 credits/month with a HARD limit (site pauses); production deploy = 15 credits; web bandwidth = 20 credits/GB; web requests (incl. edge functions) = 2 credits per 10,000; functions compute = 10 credits per GB-hour; Personal 1,000 credits; Pro 3,000+ credits; log drains, WAF and UI rate-limit rules are not on these tiers; RUM history windows differ by plan (Free: about a day; Personal: 24 h; Pro: 30 days). The RUM and Analytics PDFs show 30-day windows, which suggests Pro or a legacy plan; UNVERIFIED. Traffic: 328 MB/30 d = about 6.6 credits, scanner noise 63 requests/day is negligible; the only realistic burner is deploys: 20 production deploys/month = 300 credits (a full Free allowance) and the BRIEF shows heavy deploy days (Sep 7 to 9).
Fix: read Team > Usage and billing (plan, credits used, projected); if Free/Personal, batch releases, iterate on Deploy Previews (confirm in the docs/usage page whether previews consume credits), enable usage notifications; add "credits used" to the monthly ops checklist. Budget the Historian API compute (finding 31) before launch.
Acceptance test: plan and credit balance recorded in the runbook; deploy cadence policy written; alert at 70 percent of monthly credits.

### infra-netlify-31 | Historian platform skeleton: Netlify Functions v2 API with rate limits, secrets, budget guard, cache, graceful degradation | severity: medium | effort: L
Audit refs: H8. Depends on: 28, 07, 06, 10; the retrieval/LLM design from the historian specialists. Moves: enables the "greatly expanded Ask the Historian" without exposing keys or cost.
Requirements from the infrastructure side (design works whether the answer engine is static search, hybrid or an LLM):
1. Same-origin API `POST /api/historian` (Functions v2, `export const config = { path: "/api/historian", rateLimit: {...} }`). Same origin means no CORS surface, `connect-src 'self'` unchanged, and no new third-party origin in CSP.
2. Rate limiting (code-based, Netlify): `rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ["ip","domain"] }` (window 1 to 180 s; Free/Personal allow 2 code rules per project, Pro 5; path-only targeting; blocked requests get 429). Rate limits for functions must live in the function's exported config, not in `netlify.toml`. Budget the rule count: `/api/historian`, `/api/csp-report` and `/api/vitals` need three rules, but Free/Personal projects get two, so on those plans merge csp-report and vitals into one `/api/ingest` function that shares a single rule (Pro allows five).
3. Abuse resistance without third-party trackers: a small self-hosted proof-of-work challenge (for example altcha) verified in the function; or Cloudflare Turnstile if a third party is acceptable (must be disclosed). Validate `Content-Type`, body size (<= 2 KB), query length (<= 500 chars), `Sec-Fetch-Site: same-origin`, and reject `Origin` mismatch.
4. Secrets: provider API key only in Netlify env (marked secret, scope Functions + Runtime); never in the repo, bundle, Deploy Preview build logs, or client. Separate keys per context; preview key with a tiny cap.
5. Budget guard: daily/monthly spend counters in Netlify Blobs; hard stop returns `{mode:"static", results:[...]}` so the UI falls back to the local index (same code path used during provider outage); alert email at 80 percent.
6. Cache: normalise the question (lowercase, stopwords, synonyms), hash, store answers in Blobs with a 30-day TTL and a "data version" salt so corpus updates invalidate answers; expected 40 to 70 percent hit rate on repeated tourist/student questions (estimate, UNVERIFIED).
7. Streaming responses (SSE/`ReadableStream`) to keep first byte fast; function timeout/payload limits must be checked against the current plan limits (my fetch of the limits page was inconclusive: UNVERIFIED).
8. Output safety: answers are structured (`{answer_blocks:[{text, citations:[{id,url,label}]}]}`) and rendered with React text nodes or `textContent`, never `innerHTML`; a Trusted Types policy (finding 06) makes that enforceable. Citations must resolve to real corpus ids; reject uncited claims.
9. Prompt-injection posture: retrieved corpus text is data, not instructions; system prompt states so; user text is delimited; tool use disabled; test with an adversarial suite in CI.
10. Privacy/logging: no query text or IP in logs by default; log only counters and error classes; optional opt-in "send this question to improve the historian" stored 30 days; add the conditional privacy paragraph (appendix H) and a UI notice "Do not enter personal information".
11. Ops: `GET /api/health` (no dependencies), uptime monitor, error budget, kill switch env `HISTORIAN_ENABLED=false`.
12. If retrieval runs client-side (semantic search with WASM): allow `'wasm-unsafe-eval'` only on `/historian`; large model/index files need content-hashed immutable URLs and explicit SW `maxEntries`/quota handling; multi-threaded WASM would need cross-origin isolation (COOP+COEP), which conflicts with the third-party frames (finding 05), so prefer single-thread WASM or server-side embeddings.
Skeleton code: appendix E.4.
Acceptance test: 13 requests/minute from one IP -> the 13th gets 429; budget exhaustion returns static mode with HTTP 200; no secret appears in any client asset (`grep -R "sk-\|ANTHROPIC" dist/` empty); Playwright injection tests cannot make the UI execute script.

### infra-netlify-32 | Traffic quality: proportionate bot handling, RUM pollution control, and first-party Core Web Vitals with attribution | severity: medium | effort: M
Audit refs: T2, P1. Depends on: 28 (functions) for the collector; the exclusion trick is immediate. Moves: makes "RUM green" measurable and truthful.
Evidence: about 18 percent of page views from CN/SG/HK/DE (BRIEF); about 1,900 scanner 404s/30 d; traffic is only about 51 visitors/day and about 113 views/day, so a handful of synthetic or bot sessions can swing a p75 (RUM charts show LCP max 1.67 min, INP max 2.08 min, FCP max about 30 s: values that only occur in backgrounded tabs or automation; RUM script source shows it collects from every top-level document including 404 and dev pages and skips iframes). The owner's own Lighthouse/PageSpeed/DevTools runs on the live site report to the same RUM project. Netlify RUM shows no path or user-agent filter in the exported PDF (only the device selector, 'All Devices').
Fix (in order of cost)
1. Immediate, free: when testing the live site, block the RUM script in that browser profile (uBlock rule `||gettysburginteractivemap.com/.netlify/scripts/rum$script`, or DevTools "Block request URL") so your own audits and screenshots stop polluting p75. Ask the owner to compare the spike dates (Sep 7-8, 18, 26) with their own testing sessions.
2. Do not geo-block or challenge real users. Scanner traffic hits nothing dynamic; its cost is negligible; German/Singapore/HK cloud crawlers are also how search/AI engines discover the site. If abuse appears against `/api/*`, use the code-based rate limits in finding 31, not country rules (Netlify's edge `context.geo` offers country/city/subdivision but no ASN, and geo rules would block genuine tourists/students).
3. Measure humans: first-party vitals with attribution. Add the `web-vitals` library (attribution build, about 3 KB) and `navigator.sendBeacon('/api/vitals', ...)` to a Netlify Function that stores only: path, device class, connection effective type, metric name/value/rating, LCP element selector and resource timings, INP target and phase breakdown, CLS top source, app version; no IP, no ID. Discard reports where `navigator.webdriver`, UA matches `HeadlessChrome|Lighthouse|GTmetrix|Pingdom|PTST`, `document.prerendering`, or the page loaded hidden. A scheduled function computes daily p75 per metric/device and writes a JSON summary to Blobs; a private `/api/vitals-summary?key=...` renders it. This gives the acceptance numbers with the bot noise removed and shows WHY a metric is poor, which Netlify RUM cannot.
4. Keep Netlify RUM as the external witness; treat a divergence (first-party green, Netlify red) as evidence of pollution and investigate by device/browser.
5. Analytics hygiene: label the scanner paths as noise in reports; nothing to block. `robots.txt` stays permissive (see finding 35; AI crawlers are a discovery channel: ChatGPT already sent 14 referrals in 30 days).
Acceptance test: first-party dashboard shows p75 LCP/INP/CLS/FCP by device with bots excluded; a Lighthouse run triggered by the owner does not appear; scanner traffic requires no configuration.

### infra-netlify-33 | Monitoring, expiry and alerting | severity: low | effort: S
Evidence: no monitor is configured that I can see; dates that will bite: TLS certificate expires 2026-11-10 (Netlify auto-renews Let's Encrypt; verify renewal happens by 2026-10-25), domain expires 2027-06-13 (Name.com, one year), `security.txt` will expire (finding 09).
Fix: external uptime monitor (HEAD, not GET, to avoid running JS/RUM) on `/`, `/manifest.json`, `/data/chronology_day1.json`, `/api/health`; certificate-expiry check; Netlify deploy notifications; monthly automated MDN Observatory scan (`POST https://observatory-api.mdn.mozilla.net/api/v2/scan?host=gettysburginteractivemap.com`) and a weekly LHCI run against production, both writing a dated JSON to the repo; calendar reminders: security.txt renewal (Aug 2027), domain renewal, Mapbox/Google key review (quarterly). Register the domain for 5 years or enable auto-renew with a valid card.
Acceptance test: a deliberate 404 on `/data/chronology_day1.json` in a preview triggers an alert within 5 minutes; a calendar of expiries exists.

### infra-netlify-34 | DNS, email-spoofing, CAA, HSTS preload, registrar hardening | severity: medium | effort: S
Evidence (VERIFIED): NS = Netlify DNS (dns1-4.p09.nsone.net); A `98.84.224.111`, `18.208.88.157`; no AAAA; no CAA; no MX; no TXT (no SPF, DMARC, Search Console/Bing verification); DNSSEC unsigned (Netlify DNS does not support DNSSEC; forum: no plans); registrar Name.com, registered 2026-06-13, expires 2027-06-13, status `client transfer prohibited`; HSTS header valid but preload status `unknown`; `www` 301 to apex; http->https OK.
Fix (records to add in Netlify DNS; TTL 3600)
| Type | Name | Value | Why |
|---|---|---|---|
| CAA | @ | `0 issue "letsencrypt.org"` | only Let's Encrypt (Netlify's CA) may issue |
| CAA | @ | `0 issuewild "letsencrypt.org"` | the site has a wildcard SAN |
| CAA | @ | `0 iodef "mailto:gettysburginteractivemap@gmail.com"` | mis-issuance reports |
| MX | @ | `0 .` (null MX, RFC 7505; if the DNS UI rejects the dot, skip this row and rely on SPF/DMARC) | domain sends/receives no mail |
| TXT | @ | `v=spf1 -all` | nobody may send as the domain |
| TXT | _dmarc | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` | reject spoofed mail (add `rua=mailto:` only if you want reports) |
| TXT | @ | `google-site-verification=...` (from Search Console) | verification without HTML edits |
| TXT | @ | Bing Webmaster verification value | same |
Only use the mail records if you never send mail from an address at this domain (the published contact is a Gmail address). If you later want `hello@...`, replace with the provider's SPF/DKIM and keep DMARC.
HSTS preload: the header already meets the list's requirements (max-age >= 1 y, includeSubDomains, preload; `preloadable` check returned no warnings). Before submitting at hstspreload.org confirm every current and future subdomain (`embed.`, `api.`, `staging.`) will be HTTPS-only forever; removal takes months. Submit after finding 11/02 are live (so the apex behaviour is final).
DNSSEC: not available on Netlify DNS. Only revisit if DNS moves to a provider that supports it (for example Cloudflare DNS-only with A records to Netlify); cost: lose the automatic wildcard certificate and Netlify DNS conveniences. Recommendation: do NOT move; Observatory/securityheaders do not require it.
Registrar: enable 2FA on Name.com, keep `client transfer prohibited`, add `clientDeleteProhibited`/`clientUpdateProhibited` if offered, auto-renew, 3 to 5 year term, private WHOIS.
Acceptance test: `dig CAA/MX/TXT` (DoH) return the records; a DMARC checker shows `reject`; hstspreload.org shows "pending" then "preloaded"; Search Console property verified.

### infra-netlify-35 | Search Console/Bing verification, sitemap and robots hygiene (infrastructure side of T1) | severity: low | effort: S
Audit refs: T1, E5. Depends on: 11, 34.
Evidence: sitemap has 21 `<loc>` entries, all `.html`, no `<lastmod>` (`sitemap.xml`); `changefreq`/`priority` are ignored by Google; robots.txt is 4 lines with no `Disallow`; `data/*.json` are crawlable and could be indexed as text results; two URL forms both 200 (finding 11).
Fix: after finding 11 the sitemap lists clean URLs with accurate `<lastmod>` (build date of each page's source), drop `changefreq`/`priority`; verify Search Console + Bing via DNS TXT (finding 34) and submit; `X-Robots-Tag: noindex` on `/data/*`, `/api/*`, `/.well-known/*` (finding 13/09); keep robots.txt permissive, add explicit `Sitemap:`; decide AI-crawler stance in writing (recommended: allow, they are a discovery channel); add the privacy/terms URLs (optional). The SEO specialist owns page-level metadata; this finding only covers files and headers.
Acceptance test: Search Console "Sitemaps" shows 21 discovered URLs, 0 errors; "Pages" shows no `/data/*` entries.

### infra-netlify-36 | Privacy policy: replace with an accurate, complete text | severity: high | effort: M (owner and counsel review)
Audit refs: X5. Depends on: 19 (click-to-load wording), 07/08 (PeerJS handling), 31 (conditional Historian paragraph). Moves: Privacy/legal pages B+ -> A+, trust, GDPR/CCPA exposure.
Evidence: `privacy.html:21` "Last updated: September 7, 2026" (page predates the AR/Watch Together disclosures); `:28` Netlify RUM "cannot identify you" (it sends hostname, path, browser family, OS family, device class, screen size; verified in `/.netlify/scripts/rum`: no cookies/localStorage, skipped in iframes); `:29` Mapbox "standard request data" (actual: telemetry to `events.mapbox.com` with anonymous ID rotating daily, user agent, screen/window size, DPR, connection type, WebGL renderer/vendor, `bundle.pretty.js:54238-54290, 54560-54600`); `:30` Street View "(documentary and report pages)" is wrong (no iframe in any static page; the frame is in the main app's walkthrough, `bundle.pretty.js:110660`); no mention of the NPS video frame (`:100461`), PeerJS broker/STUN/TURN and jsDelivr (`watch-together.html:19, 224`; PeerJS defaults verified), AR camera/location/motion (`ar.html:160,172,184`), Cinematic Export (local), Netlify server-side Web Analytics (server logs), the full localStorage inventory (`gtbg_prefs`, `gtbg_onboarded`, `gettysburg_bookmarks`, `gtbg-ef-hidden`, `gtbg_watch_together_tour`, `mapbox.eventData*`) and Cache Storage; `:37-38` "This site does not set its own cookies" (true, verified: no `Set-Cookie`); no rights/legal-basis/retention/transfer text; children paragraph adequate but thin.
Fix: publish the full text in appendix H.1 (plain-language summary table, per-feature disclosures, storage inventory, rights, contact, security.txt link); regenerate the "last updated" date and keep a short change log; keep it in sync via a CI check that greps the repo for new third-party origins and localStorage keys and fails if they are not in `docs/data-inventory.md` (the inventory the policy is generated from).
Acceptance test: every origin in the CSP `connect-src/frame-src/script-src` and every localStorage key in the bundle appears in the policy; owner and counsel sign-off recorded; date updated.

### infra-netlify-37 | Terms of service: replace, scope embedding, decide the content licence | severity: medium | effort: M
Audit refs: X5. Evidence: `terms.html:27` invites "embedding its widget on your own page" but until finding 02 the widget was framed under conflicting headers and every other page cannot be framed; `:30` cites sources but not the licence of the compiled data; `:33` "credit ... if you republish substantial excerpts" is not a licence; no AR safety/battlefield-etiquette text; no third-party-terms clause (Mapbox, Google, NPS, PeerJS); no governing-law/contact-for-takedown text; no AI clause.
Fix: appendix H.2 (full draft). Decisions the owner must make (bracketed in the text): content licence (recommended options: CC BY-NC 4.0 for narrative text and compiled data with an explicit "educational use welcome" clause, or CC BY 4.0 if maximum reuse is wanted; code all rights reserved unless open-sourced), governing law/venue, whether to accept commercial embeds, DMCA agent (optional at this scale).
Acceptance test: the embed clause matches what the headers permit (only `/embed` can be framed); licence text linked from footer; sign-off recorded.

### infra-netlify-38 | Data controls and consent posture for EU/UK visitors | severity: medium | effort: S-M
Evidence: the site sets no cookies, but three things touch device storage or third parties without a banner: Mapbox anonymous ID in `localStorage` (`mapbox.eventData:*`, rotates about every 24 h, `bundle.pretty.js:54277-54290`) and telemetry POSTs to `events.mapbox.com` (billing/turnstile and performance metrics; the SDK sends `"enabled.telemetry": false` for the interaction-telemetry flag but still sends turnstile, map.load and metrics events, `:54381-54423`); Google/NPS frames and PeerJS connections, which only happen after user actions (after finding 19/07 they are all click-initiated). Under ePrivacy Art. 5(3) storage/access is exempt if strictly necessary for a service the user requested; Mapbox's own position is that these events support billing, but whether the anonymous ID is "strictly necessary" is arguable. Legal advice is needed for a definitive answer; I cannot resolve it from outside.
Fix (proportionate for a free, ad-free educational site): (1) disclose precisely (finding 36); (2) ship a small "Privacy and data" panel reachable from the footer: what is stored on this device, a "Clear my saved data" button (bookmarks, prefs, tours, Mapbox event data, SW caches, with confirmation), and per-feature notes ("Street View, NPS video and Live Sync contact third parties only when you press them"); (3) honour Global Privacy Control (nothing is sold/shared; state it); (4) do not add a cookie banner unless counsel says otherwise; (5) revisit if EU traffic share or complaints grow. The only real alternative, blocking Mapbox events for EU visitors, conflicts with Mapbox billing expectations; do not attempt to suppress Mapbox telemetry client-side.
Acceptance test: "Clear my saved data" empties every key in the inventory and `caches.keys()`; the panel lists every item in `docs/data-inventory.md`.

### infra-netlify-39 | Account, secret and supply-chain security for a solo maintainer | severity: medium | effort: S
Evidence: a single Gmail address (`gettysburginteractivemap@gmail.com`, `terms.html:42`, `privacy.html:47`) is the public contact and almost certainly the recovery address for Netlify, Mapbox, Google Cloud, Name.com and GitHub; the biggest realistic compromise path for this site is account takeover, not a web exploit. No repo/CI exists yet (finding 28).
Fix: passkeys or TOTP 2FA on every account above (Gmail first), recovery codes printed and stored offline; separate the public contact alias from the recovery mailbox if possible; Netlify: personal access tokens minimal, deploy keys per repo, audit log review if on Pro; GitHub: branch protection on `main`, secret scanning + push protection, Dependabot/Renovate, GitHub Actions pinned by commit SHA, no long-lived deploy tokens in repo; npm: committed lockfile, `npm ci`, `--ignore-scripts` in CI unless required, `npm audit` gate; document who can publish (one person) and what to do if the laptop is lost; keep a written token inventory (Mapbox prod/dev/preview, Google embed key, future API keys) with created dates.
Acceptance test: 2FA enabled on all listed accounts (checklist tick); Dependabot PRs appear; a test commit containing a fake `sk.` token is blocked by push protection.

---------------------------------------------------------------------------------------------------

## 8. Appendix A: target configuration architecture

Principles
1. One generator, one output: `scripts/gen-netlify-config.mjs` writes `dist/_headers` and `dist/_redirects` from a small `pages.config.mjs`. `netlify.toml` keeps only build/processing/plugins/contexts. (The generator also works today, run by hand against the deploy folder before a drag-and-drop upload.)
2. Invariant: for any URL, each header NAME is produced by at most one matching rule. Universal headers live in `/*`; document policy headers (CSP, Permissions-Policy, XFO) are emitted per document path; cache headers per asset group. This is robust whichever way Netlify merges overlapping same-name headers (docs are silent; forum answers conflict) and it is why the embed override could never work.
3. Rules are keyed on the path as requested: emit document headers for the clean URL (`/dashboard`); the `.html` forms only redirect (finding 11), so they need no document headers.
4. Every change ships behind a Deploy Preview and the header check script (finding 29).

### A.1 netlify.toml (target)
```toml
[build]
  publish = "dist"                 # "." while deploys are still manual
  command = "npm run build"        # omit while manual

[build.processing.html]
  pretty_urls = false              # stop Netlify rewriting authored links (finding 11)

[context.deploy-preview.environment]
  VITE_MAPBOX_TOKEN = "pk.PREVIEW_TOKEN_RESTRICTED_TO_netlify.app"   # finding 18 (low-value token)
[context.branch-deploy.environment]
  VITE_MAPBOX_TOKEN = "pk.PREVIEW_TOKEN_RESTRICTED_TO_netlify.app"

# [[plugins]] @netlify/plugin-lighthouse ... see finding 29
# NO [[headers]] / [[redirects]] here: generated into dist/_headers and dist/_redirects.
```

### A.2 Universal and cache rules emitted by the generator (`_headers`)
```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  X-Permitted-Cross-Domain-Policies: none
  Reporting-Endpoints: csp="https://gettysburginteractivemap.com/api/csp-report"
  # DO NOT add X-Frame-Options / CSP / Permissions-Policy here. DO NOT tighten Referrer-Policy:
  # Mapbox URL restrictions and the Google key referrer restriction need the Referer header.

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=31536000, immutable       # after content-hashing (finding 13)
  X-Robots-Tag: noindex
  # interim (un-hashed files):  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/icons/*
  Cache-Control: public, max-age=31536000, immutable       # only with fingerprinted names
/favicon.ico
  Cache-Control: public, max-age=604800
/apple-touch-icon.png
  Cache-Control: public, max-age=604800
/robots.txt
  Cache-Control: public, max-age=86400
/sitemap.xml
  Cache-Control: public, max-age=86400
/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: public, max-age=3600
/sw.js
  Cache-Control: no-cache
/guide/*
  Cache-Control: public, max-age=31536000, immutable
  Content-Disposition: inline
/.well-known/*
  X-Robots-Tag: noindex
/well-known/*
  X-Robots-Tag: noindex
```
(While files are not fingerprinted, keep today's `/data/*` 1 h and drop `immutable` from `/icons/*`.)

### A.3 Per-document rules (illustration; the generator emits one block per page in `pages.config.mjs`)
```
/
  Content-Security-Policy-Report-Only: <full app policy incl. hashes, C.1>
  Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'
  Permissions-Policy: <default + fullscreen for google/nps, finding 04>
  X-Frame-Options: SAMEORIGIN
/dashboard
  ... static-class policy ...
/embed
  Content-Security-Policy: <embed policy, frame-ancestors *>
  Permissions-Policy: <default>
  # no X-Frame-Options
/ar
  ... AR class ...
```

### A.4 Redirects emitted (`_redirects`)
```
# canonical host and previews
https://friendly-lolly-da85c0.netlify.app/*   https://gettysburginteractivemap.com/:splat   301!
http://friendly-lolly-da85c0.netlify.app/*    https://gettysburginteractivemap.com/:splat   301!

# one URL form (finding 11): one line per page, no mid-path wildcards
/index.html          /                301!
/search.html         /search          301!
/dashboard.html      /dashboard       301!
... (all 21 tool pages + privacy/terms/embed)

# .well-known survives manual deploys (finding 09)
/.well-known/*       /well-known/:splat   200
```


### A.5 Netlify feature assessment (what to use, what to skip)
| Feature | Status / evidence | Use here | Item |
|---|---|---|---|
| Brotli/gzip | on: `Content-Encoding: br` on JS (603,822 bytes), JSON, HTML (verified) | nothing to do | n/a |
| Asset optimization (bundle/minify/image compression) | deprecated 2023-07-17, end of service 2023-10-17 per Netlify | do NOT rely on it; minify in the build | 28 |
| Post processing: Pretty URLs | ON (rewrites authored links; verified) | turn off, enforce one URL form with redirects | 11 |
| Post processing: snippet injection | RUM script is injected at the edge into every HTML response | keep RUM; account for it in CSP (`script-src 'self'`, `connect-src` RUM host) | 01 |
| Web Analytics (server-side) and RUM | both active (PDFs; script verified) | keep both; add first-party vitals with attribution | 32 |
| Deploy Previews / branch deploys / contexts | need Git | adopt | 28 |
| Build plugins (Lighthouse, checklinks) | need a build | adopt as CI gates | 29 |
| Functions v2 (+ Blobs, Scheduled Functions) | need Git/CLI build | Historian API, CSP collector, vitals collector | 10, 31, 32 |
| Edge Functions | 50 ms CPU per request, not compatible with custom-header rules for their own responses, count toward request credits | not needed; avoid on the HTML path | 01 (rejected option) |
| Rate limiting | code-based rules for functions/edge/redirects on all plans (2 rules Free/Personal, 5 Pro, path-only, per IP/domain, 429) | `/api/*` only | 31 |
| Firewall/WAF, log drains | not on the credit-based tiers listed in Netlify docs | not available; do not plan around them | 32 |
| Password-protected previews | Pro | optional for previews | 18 |
| Netlify Image CDN | available; site has no `<img>` today | use if photos/portraits arrive with the expanded Historian | n/a |
| Forms, Identity, Split Testing | not applicable | skip | n/a |
| Notifications / usage alerts | available | enable | 28, 30 |

---------------------------------------------------------------------------------------------------

## 9. Appendix B: header/redirect generator (drop-in) and interim block

### B.1 Phase-0 interim `_headers` (hand-written, no generator)
Fixes the embed conflict and framing today. Put in the deploy folder as `_headers` and DELETE the `X-Frame-Options`, `Permissions-Policy` (moved), `Content-Security-Policy-Report-Only`, embed and scanner blocks from `netlify.toml` so no name overlaps. Repeat the per-page block for each clean path in the list (`/`, `/aftermath`, `/ar`, `/camera`, `/cinematic-export`, `/compare`, `/dashboard`, `/documentary`, `/education`, `/find-ancestor`, `/ground-remembers`, `/historian`, `/immersive`, `/living-ledger`, `/privacy`, `/regiment`, `/report`, `/sandbox`, `/search`, `/terms`, `/turning-points`, `/viewshed`, `/watch-together`) AND its `.html` twin until finding 11 ships.
```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin

/dashboard
  Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'
  Content-Security-Policy-Report-Only: default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://ingesteer.services-prod.nsvcs.net; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; report-uri https://gettysburginteractivemap.com/api/csp-report
  Permissions-Policy: accelerometer=(), autoplay=(self), camera=(), display-capture=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=()
  X-Frame-Options: SAMEORIGIN

/embed
  Content-Security-Policy: frame-ancestors *; base-uri 'none'; object-src 'none'; form-action 'none'
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=()

/embed.html
  Content-Security-Policy: frame-ancestors *; base-uri 'none'; object-src 'none'; form-action 'none'
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=()
```
(Report-only lines use `'unsafe-inline'` in this interim only, exactly to observe violations without breaking anything; the generator replaces them with hashes.)

### B.2 `scripts/gen-netlify-config.mjs`
```js
// Node >= 18. Usage: node scripts/gen-netlify-config.mjs dist
// env: CSP_MODE=report-only|enforce, STYLE_ATTR=1 (interim: allow style="" attributes), VENDOR_CDN=1 (interim: allow the pinned CDN tags until finding 08)
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const SITE = 'https://gettysburginteractivemap.com';
const RUM = 'https://ingesteer.services-prod.nsvcs.net';
const REPORT = `${SITE}/api/csp-report`;
const ENFORCE = process.env.CSP_MODE === 'enforce';
const STYLE_ATTR = process.env.STYLE_ATTR === '1';        // interim: allow style="" attributes
const VENDOR_CDN = process.env.VENDOR_CDN === '1';        // interim: pinned CDN tags still in the HTML
const MAPBOX_CDN = 'https://api.mapbox.com/mapbox-gl-js/v3.24.1/';
const PEERJS_CDN = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/';

const CLASSES = {                                          // extra sources per class
  static:   {},
  legal:    {},
  ar:       {},
  map:      { cdnMapbox: true, img: ['blob:', 'https://api.mapbox.com'], connect: ['https://api.mapbox.com', 'https://events.mapbox.com'], worker: ["'self'", 'blob:'], child: ["'self'", 'blob:'] },
  app:      { from: 'map', cdnMapbox: false, frame: ['https://www.google.com/maps/embed/', 'https://www.nps.gov/media/video/'] },  // the bundle inlines Mapbox GL
  peer:     { from: 'map', cdnPeer: true, connect: ['https://0.peerjs.com', 'wss://0.peerjs.com'] },
  cinematic:{ from: 'map', media: ["'self'", 'blob:'] },
  embed:    { embed: true },
};
const PAGES = {
  '/': 'app',
  '/camera': 'map', '/compare': 'map', '/ground-remembers': 'map', '/immersive': 'map', '/sandbox': 'map', '/viewshed': 'map',
  '/cinematic-export': 'cinematic', '/watch-together': 'peer', '/ar': 'ar',
  '/aftermath': 'static', '/dashboard': 'static', '/documentary': 'static', '/education': 'static', '/find-ancestor': 'static',
  '/historian': 'static', '/living-ledger': 'static', '/regiment': 'static', '/report': 'static', '/search': 'static', '/turning-points': 'static',
  '/privacy': 'legal', '/terms': 'legal', '/embed': 'embed',
};
const DEFAULT_PP = "accelerometer=(), autoplay=(self), camera=(), display-capture=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=()";
const PP = {
  '/ar': "accelerometer=(self), autoplay=(self), camera=(self), display-capture=(), fullscreen=(self), geolocation=(self), gyroscope=(self), magnetometer=(self), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=()",
  '/': DEFAULT_PP.replace('fullscreen=(self)', 'fullscreen=(self "https://www.google.com" "https://www.nps.gov")'),
};

const sha = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const norm = (s) => s.replace(/\r\n?/g, '\n');           // HTML parser normalises CR/LF before hashing

function inlineHashes(html) {
  html = norm(html);
  const scripts = [], styles = [], problems = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(m[1]) || /type\s*=\s*["']?application\/(ld\+)?json/i.test(m[1])) continue;
    scripts.push(sha(m[2]));
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) styles.push(sha(m[1]));
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))) problems.push('inline event handler');
  if (!STYLE_ATTR && /\sstyle\s*=\s*["']/i.test(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ''))) problems.push('style attribute');
  return { scripts, styles, problems };
}

function csp(cls, hashes) {
  const c = CLASSES[cls];
  if (c.embed) {
    return ["default-src 'none'", `script-src 'self' ${hashes.scripts.join(' ')}`.trim(), `style-src ${hashes.styles.join(' ')}`.trim(),
      "connect-src 'self'", `style-src-attr ${STYLE_ATTR ? "'unsafe-inline'" : "'none'"}`, "base-uri 'none'", "form-action 'none'", "frame-ancestors *", "upgrade-insecure-requests"].join('; ');
  }
  const list = (k, extra = []) => [...new Set([...(CLASSES[c.from]?.[k] ?? []), ...(c[k] ?? []), ...extra])];
  const mbCdn = VENDOR_CDN && (c.cdnMapbox ?? CLASSES[c.from]?.cdnMapbox ?? false);
  const peerCdn = VENDOR_CDN && !!c.cdnPeer;
  const d = [
    "default-src 'none'",
    ["script-src 'self'", mbCdn && MAPBOX_CDN, peerCdn && PEERJS_CDN, ...hashes.scripts].filter(Boolean).join(' '),
    ["style-src 'self'", mbCdn && MAPBOX_CDN, ...hashes.styles].filter(Boolean).join(' '),
    `style-src-attr ${STYLE_ATTR ? "'unsafe-inline'" : "'none'"}`,
    `img-src ${["'self'", 'data:', ...list('img')].join(' ')}`,
    "font-src 'self'",
    `connect-src ${["'self'", RUM, ...list('connect')].join(' ')}`,
    "manifest-src 'self'",
    "base-uri 'none'", "form-action 'none'", "frame-ancestors 'self'", "object-src 'none'", 'upgrade-insecure-requests',
  ];
  if (list('worker').length) d.push(`worker-src ${list('worker').join(' ')}`);
  if (list('child').length)  d.push(`child-src ${list('child').join(' ')}`);
  if (list('frame').length)  d.push(`frame-src ${list('frame').join(' ')}`);
  if (list('media').length)  d.push(`media-src ${list('media').join(' ')}`);
  d.push(`report-uri ${REPORT}`, 'report-to csp');
  return d.join('; ');
}

async function main() {
  const out = [];
  const fail = [];
  const files = (await readdir(DIST)).filter((f) => f.endsWith('.html'));
  const seen = new Set();
  for (const [route, cls] of Object.entries(PAGES)) {
    const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
    if (!files.includes(file)) { fail.push(`missing ${file} for ${route}`); continue; }
    seen.add(file);
    const h = inlineHashes(await readFile(path.join(DIST, file), 'utf8'));
    for (const p of h.problems) fail.push(`${file}: ${p} (blocks strict CSP)`);
    const policy = csp(cls, h);
    const isEmbed = CLASSES[cls].embed;
    const lines = [route];
    lines.push(`  ${ENFORCE ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'}: ${policy}`);
    if (!ENFORCE) lines.push(`  Content-Security-Policy: ${isEmbed ? "frame-ancestors *; " : "frame-ancestors 'self'; "}base-uri 'none'; object-src 'none'; form-action ${isEmbed ? "'none'" : "'self'"}`);
    lines.push(`  Permissions-Policy: ${PP[route] ?? DEFAULT_PP}`);
    if (!isEmbed) lines.push('  X-Frame-Options: SAMEORIGIN');
    out.push(lines.join('\n'));
  }
  for (const f of files) if (!seen.has(f) && !['404.html'].includes(f)) fail.push(`unlisted html file ${f} (add to PAGES or delete)`);
  if (fail.length) { console.error('gen-netlify-config FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }

  const staticRules = await readFile(new URL('./headers.static.txt', import.meta.url), 'utf8');   // Appendix A.2 verbatim: universal + cache rules
  await writeFile(path.join(DIST, '_headers'), staticRules.trimEnd() + '\n\n' + out.join('\n\n') + '\n');

  const red = [
    `https://friendly-lolly-da85c0.netlify.app/*  ${SITE}/:splat  301!`,
    `http://friendly-lolly-da85c0.netlify.app/*   ${SITE}/:splat  301!`,
    '/index.html  /  301!',
    ...Object.keys(PAGES).filter((r) => r !== '/').map((r) => `${r}.html  ${r}  301!`),
    '/.well-known/*  /well-known/:splat  200',
  ];
  await writeFile(path.join(DIST, '_redirects'), red.join('\n') + '\n');
  console.log(`wrote ${out.length} document rules, ${red.length} redirects; mode=${ENFORCE ? 'enforce' : 'report-only'}`);
}
main();
```
Notes: (0) save Appendix A.2's code block as `scripts/headers.static.txt` next to the script (it holds the universal `/*` block and the cache rules); (1) `default-src 'none'` needs the explicit lists above; add `media-src`, `frame-src`, `worker-src` only where used. (2) Failing the build on unlisted HTML, inline handlers and style attributes is intentional: it prevents regressions. (3) Hashes recompute on every build, so editing an inline script never breaks CSP silently. (4) When inline code is externalised (finding 03) the hash arrays are empty and the policy becomes `script-src 'self'`.

---------------------------------------------------------------------------------------------------

## 10. Appendix C: CSP details, staged rollout, crawl and framing tests

### C.0 Complete external-origin inventory (static scan of all 27 HTML files, `site-nav.js`, CSS, the 2.28 MB bundle, `sw.js`, plus the Lighthouse runtime network log)
Method: regex scan for `http(s)://` and `ws(s)://` in every text file (`tmp-infra-netlify/scan_origins.py`), then classification by whether the string is fetched at runtime, opened as a frame, only navigated to, or merely text.
| Origin | Purpose / evidence | Where | CSP directive | Verdict |
|---|---|---|---|---|
| `'self'` | app, data, assets, `/.netlify/scripts/rum` (injected) | all | all | keep |
| `https://api.mapbox.com` | style, sprite, glyph and iconset pbf, `/v4/mapbox.satellite` tiles, map session, TileJSON (`bundle.pretty.js:97239, 102983, 110772` style `mapbox://styles/mapbox/satellite-v9`; Lighthouse: 50 to 57 requests) | `/` and 8 map pages | `connect-src`; `img-src` (safe); interim `script-src`/`style-src` path `/mapbox-gl-js/v3.24.1/` only until self-hosted (finding 08) | keep |
| `https://events.mapbox.com` | billing/turnstile, map.load and metrics events (`bundle.pretty.js:54238-54423`; Lighthouse: POST `/events`) | map pages | `connect-src` | keep (cannot be suppressed) |
| `https://events.mapbox.cn` | string used only when the API host is api.mapbox.cn (`bundle.pretty.js:11332`, telemetry URL selector) | none | none | drop |
| `https://a.tiles.mapbox.com`, `https://b.tiles.mapbox.com` | TileJSON lists them, GL JS uses api.mapbox.com; only `preconnect` hints (`index.html:43-44`) and `diagnostics.html:112` | none at runtime | none | drop (and delete the hints) |
| `https://ingesteer.services-prod.nsvcs.net` | Netlify RUM beacon (`/rum_collection`, fetch POST + CORS) | every top-level HTML | `connect-src` | keep (was missing) |
| `https://www.google.com/maps/embed/` | Street View iframe (`bundle.pretty.js:110660-110665`) | `/` walkthrough | `frame-src` | keep, `/` only, click-to-load |
| `https://www.google.com/maps/...` links, `https://www.nps.gov/...` links (find-ancestor, tour) | outbound navigation (new tab, `noopener noreferrer`) | `/`, find-ancestor | none (navigation is not CSP-governed) | none needed |
| `https://maps.googleapis.com`, `https://streetviewpixels-pa.googleapis.com`, `www.gstatic.com`, fonts inside the Google frame | loaded by Google's own document inside the iframe under Google's CSP | inside frame | none in our policy | none; delete the parent `preconnect` hints (`index.html:48-52`) |
| `https://www.nps.gov/media/video/` | NPS video page iframe (`bundle.pretty.js:100461-100466`, 17 URLs) | `/` tour panel | `frame-src` | keep, `/` only, sandboxed |
| `https://oss.maxcdn.com` | html5shiv/respond shims loaded by the NPS page inside its frame | inside frame | none | none (disclosed indirectly) |
| `https://0.peerjs.com` and `wss://0.peerjs.com` | PeerJS broker signalling (`watch-together.html:224,251`; `/peerjs/id` HTTP, WebSocket) | watch-together | `connect-src` on that page only | keep, per-page |
| `https://cdn.jsdelivr.net/npm/peerjs@1.5.4/` | PeerJS library (`watch-together.html:19`) | watch-together | interim `script-src` path only; none after self-hosting | interim, then drop |
| `stun:stun.l.google.com:19302`, `turn:eu-0.turn.peerjs.com:3478`, `turn:us-0.turn.peerjs.com:3478` | WebRTC ICE defaults inside PeerJS 1.5.4 (shared TURN credential) | watch-together | not governed by CSP; disclose in privacy | keep, disclose |
| `https://fonts.googleapis.com`, `https://fonts.gstatic.com` | no Google Fonts anywhere (no `@font-face`, no link) | none | none | drop |
| `unpkg.com`, `cdnjs.cloudflare.com`, `googletagmanager.com`, any analytics | not present (grep) | none | none | none |
| `blob:` | Mapbox workers (`worker-src`, `child-src`), decoded imagery (`img-src`), Cinematic Export download preview (`media-src` on that page only) | map pages | as listed | keep, scoped |
| `data:` | inline SVG icons in CSS/JS and a WebP capability probe | `/` and map pages | `img-src` | keep |
| `https://gettysburginteractivemap.com/...` absolute URLs | canonical, og:url, JSON-LD, sitemap, share links | all | none | fine (to be clean URLs, finding 11) |
| `github.com`, `docs.mapbox.com`, `apps.mapbox.com`, `account.mapbox.com`, `www.mapbox.com`, `reactjs.org`, `example.com`, `www.w3.org`, `schema.org`, `www.sitemaps.org`, `policies.google.com` | comments, error-message text, XML namespaces, links in privacy text | library strings, sitemap, privacy | none | none |

### C.1 Policy per class (end state, no hashes, no unsafe-*)
Common tail for all: `base-uri 'none'; form-action 'none'; frame-ancestors 'self'; object-src 'none'; manifest-src 'self'; upgrade-insecure-requests; report-uri https://gettysburginteractivemap.com/api/csp-report; report-to csp` (embed differs: `frame-ancestors *`; legal/static pages may use `form-action 'none'` because they have no forms; `historian` has a `<form>` that only calls `preventDefault`, so `'none'` still works).
| Class | Pages | default | script | style | img | connect | other |
|---|---|---|---|---|---|---|---|
| static | aftermath, dashboard, documentary, education, find-ancestor, historian, living-ledger, regiment, report, search, turning-points | 'none' | 'self' | 'self' | 'self' data: | 'self' https://ingesteer.services-prod.nsvcs.net | none |
| legal | privacy, terms, (404 uses global headers only) | 'none' | 'self' | 'self' | 'self' | 'self' RUM | none |
| ar | ar | 'none' | 'self' | 'self' | 'self' data: | 'self' RUM | (getUserMedia/deviceorientation are not CSP-governed) |
| map | camera, compare, ground-remembers, immersive, sandbox, viewshed | 'none' | 'self' | 'self' | 'self' data: blob: https://api.mapbox.com | 'self' https://api.mapbox.com https://events.mapbox.com RUM | worker-src 'self' blob:; child-src 'self' blob: |
| cinematic | cinematic-export | as map | | | | | + media-src 'self' blob: |
| peer | watch-together | as map | (+ `https://cdn.jsdelivr.net/npm/peerjs@1.5.4/` only until self-hosted) | | | + `https://0.peerjs.com wss://0.peerjs.com` | ICE (STUN/TURN over UDP/TCP) is not governed by CSP |
| app | `/` | as map | 'self' (+ `'wasm-unsafe-eval'` only if the crawl shows a WASM violation) | 'self' | as map | as map | + `frame-src https://www.google.com/maps/embed/ https://www.nps.gov/media/video/` |
| embed | embed | 'none' | 'self' | 'self' | none | 'self' | frame-ancestors *; base-uri 'none' |
Interim (hash) variants add `'sha256-...'` sources to `script-src`/`style-src` and, if style attributes remain, `style-src-attr 'unsafe-inline'`. Worked example, the current `embed.html`: `script-src 'self' 'sha256-gxM+CLepqR71xvmx2haazQ7o2t5U+/yU8+MojS4+lP8='; style-src 'sha256-7p4GbcIB8xOYGUORI2J++dQyA3bGfsFx08qU3SPhBW0='` (plus `style-src-attr 'unsafe-inline'` because of its one `style=` attribute). The current `index.html` inline scripts hash to `aIlTHfH2ZazGWg3MX5GJEbs0wPwUdnyeNXqBawMLX8A=`, `ZxyYXvXT4OuSdC4RGNg7Aj6tFLkeLn1X7bMISP8WVm4=`, `5EeaGYKTKE5SXGD6UZMDjaKzjx+TOCAkh2kvhzsU0dw=`, `GzQ/YAYgyu4+FnE85Zh9U6adoD3Jm9TZMwCesqsg6Kw=`, `7KmIHQ4ZN6oHoCzhWciEevZsKKg2/iSPbif+v/yZ8mU=`, `BYjUbnQ/x0luBduqOKpmUgx/5d3Gl9/Fabts2vYrf/Q=`, `+4nCQjh+6RJkzNHBoDJomVqGK93D9otgO9WJk8oZ8kw=` and its style block to `IKjD7hdVN9a4TpbJjcMJ8tEdbdPCwoH3f0gbULlAGyc=` (valid for deploy 6aa16d61 only; the generator recomputes on every build). All hashes come from `tmp-infra-netlify/inline_hashes.json`.

### C.2 Inline-code inventory (current deploy; dev pages excluded)
| Page | inline scripts (bytes) | `<style>` blocks (bytes) | markup `style=` | inline handlers | third-party script/style tags |
|---|---|---|---|---|---|
| 404 | 0 | 1 (1,005) | 0 | 0 | none |
| aftermath | 0 | 1 (1,471) | 0 | 0 | none |
| ar | 1 (6,194) | 1 (3,146) | 0 | 0 | none |
| camera | 1 (7,254) | 1 (1,805) | 0 | 0 | mapbox-gl js+css |
| cinematic-export | 1 (7,969) | 1 (2,507) | 0 | 0 | mapbox-gl js+css |
| compare | 1 (7,982) | 1 (2,239) | 5 (+1 in JS string) | 0 | mapbox-gl js+css |
| dashboard | 1 (10,158) | 1 (2,940) | 2 (+3) | 0 | none |
| documentary | 1 (1,959) | 1 (1,782) | 1 | 0 | none |
| education | 1 (2,165) | 1 (1,612) | 0 | 0 | none |
| embed | 1 (1,629) | 1 (1,010) | 1 | 0 | none |
| find-ancestor | 1 (3,151) | 1 (2,391) | 2 (+1) | 0 | none |
| ground-remembers | 1 (3,309) | 1 (1,593) | 0 | 0 | mapbox-gl js+css |
| historian | 1 (6,596) | 1 (2,494) | 3 | 0 | none |
| immersive | 1 (6,918) | 1 (2,175) | 0 | 0 | mapbox-gl js+css |
| index | 7 (23,146) | 1 (9,205) | 3 (+1) | 1 (`onload`, `:57`) | none (bundle inlines Mapbox) |
| living-ledger | 1 (4,129) | 1 (2,725) | 2 | 0 | none |
| privacy | 0 | 1 (422) | 1 | 0 | none |
| regiment | 1 (7,113) | 1 (3,941) | 3 | 0 | none |
| report | 1 (2,205) | 1 (1,934) | 1 | 1 (`onclick`, `:67`) | none |
| sandbox | 1 (7,246) | 1 (2,431) | 2 (+2) | 0 | mapbox-gl js+css |
| search | 1 (5,308) | 1 (2,247) | 2 | 0 | none |
| terms | 0 | 1 (407) | 1 | 0 | none |
| turning-points | 1 (8,794) | 1 (1,947) | 0 | 0 | none |
| viewshed | 1 (3,390) | 1 (1,521) | 1 (+2) | 0 | mapbox-gl js+css |
| watch-together | 1 (10,082) | 1 (3,787) | 10 | 0 | mapbox-gl js+css, peerjs (jsDelivr) |
Totals: 27 executable inline scripts, 25 style blocks, 40 markup style attributes plus 11 in JS strings (`compare` 1, `dashboard` 3, `find-ancestor` 1, `index` 1, `sandbox` 2, `site-nav.js` 1, `viewshed` 2), 2 inline handlers, 50 HTML sinks (24 interpolating). Also `site-nav.js` is an external script but injects markup: its `ICON_SPRITE_SVG` carries `style="display:none"` (`site-nav.js:71`).

### C.3 Staged rollout with gates (calendar assumes work starts Monday, W0)
| Stage | When | Change | Gate to proceed | Rollback |
|---|---|---|---|---|
| 0 | W0 day 1 | Corrected Report-Only policy (RUM host added, dead origins removed, `frame-src` includes NPS), per-class, `report-uri`/`report-to` live (finding 10) | reports arriving; RUM still works | revert `_headers` (Publish previous deploy) |
| 1 | W0 day 2 | Enforced mini-CSP `frame-ancestors 'self'; base-uri; object-src 'none'; form-action` on all pages; embed gets `frame-ancestors *` (finding 02); remove XFO from `/*` | embed test page (C.5) passes; nothing else changes visually | same |
| 2 | W1 | Fix inline handlers, sprite `style=`, star SVG `style=`; run crawl (C.4) in Deploy Preview; watch report stream 7 days | crawl violations 0 and no new report types | same |
| 3a | W2 | Enforce hash-based full policy on legal, 404, static pages | 7 days clean reports | flip `CSP_MODE` back |
| 3b | W3 | Enforce on AR, map sub-pages (Mapbox), cinematic, peer | crawl + manual two-browser Watch Together + real-phone AR | same |
| 3c | W4 | Enforce on `/` (last: biggest page, most third parties) | 14 days clean, Netlify RUM beacons still arriving | same |
| 4 | Phase 2 | Externalise inline code, drop hashes and `style-src-attr`, self-host Mapbox/PeerJS, add `require-trusted-types-for 'script'` in Report-Only | Trusted Types reports empty 14 days | same |
| 5 | Phase 3 | Enforce Trusted Types on static pages | Observatory A+, securityheaders A+ | same |
Monitoring: daily collector summary (top 10 directive/blocked-host pairs), weekly review; noise filters as in finding 10; alert on any new `blocked-uri` host.

### C.4 Playwright CSP crawl (run against a Deploy Preview; fail on any violation)
```js
// scripts/csp-crawl.mjs   usage: BASE=https://deploy-preview-12--friendly-lolly-da85c0.netlify.app node scripts/csp-crawl.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE;
const PAGES = ['/', '/search', '/dashboard', '/compare', '/camera', '/documentary', '/report', '/education', '/aftermath', '/sandbox',
  '/viewshed', '/regiment', '/ground-remembers', '/historian', '/immersive', '/ar', '/watch-together', '/turning-points',
  '/find-ancestor', '/cinematic-export', '/living-ledger', '/privacy', '/terms', '/embed', '/no-such-page'];
const viewports = [{ width: 375, height: 812, isMobile: true }, { width: 1440, height: 900 }];
let bad = 0;
const browser = await chromium.launch();
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: !!vp.isMobile, permissions: ['geolocation', 'camera'],
    geolocation: { latitude: 39.81, longitude: -77.23 } });
  await ctx.addInitScript(() => {                       // collect violations (report-only ones fire this event too)
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push({ d: e.effectiveDirective, b: e.blockedURI, s: e.sourceFile, l: e.lineNumber, p: e.disposition }));
  });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[console ${m.type()}] ${p}: ${m.text()}`); });
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    if (p === '/') {                                     // scripted flows
      await page.waitForTimeout(3000);
      for (const name of [/skip/i, /select desktop|select mobile/i]) { const b = page.getByRole('button', { name }).first(); if (await b.count()) await b.click().catch(() => {}); }
      await page.keyboard.press('Space');                // play
      await page.waitForTimeout(4000);
      const help = page.getByRole('button', { name: /help/i }).first(); if (await help.count()) await help.click().catch(() => {});
      // TODO: open Virtual Walkthrough, press "Load Street View"; press "Show Video"
    }
    if (p === '/cinematic-export') { /* click record for 3 s */ }
    const v = await page.evaluate(() => window.__csp);
    for (const x of v) { bad++; console.log(`VIOLATION ${vp.width}px ${p}`, JSON.stringify(x)); }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(`violations: ${bad}`);
process.exit(bad ? 1 : 0);
```
(Extend the `/` flow to open the walkthrough and video panel once the click-to-load buttons exist; add a second browser context for the Watch Together join flow.)

### C.5 Framing test (host on any other origin, for example a local `python -m http.server` on a different port or a CodePen)
```html
<!doctype html><meta charset="utf-8"><title>frame test</title>
<style>iframe{width:420px;height:220px;border:1px solid #888;margin:6px}</style>
<h1>Expected: embed variants render, the other two are blocked</h1>
<iframe src="https://gettysburginteractivemap.com/embed"></iframe>
<iframe src="https://gettysburginteractivemap.com/embed.html?vignette=V-018"></iframe>
<iframe src="https://gettysburginteractivemap.com/"></iframe>
<iframe src="https://gettysburginteractivemap.com/privacy"></iframe>
<script>document.querySelectorAll('iframe').forEach(f=>f.addEventListener('load',()=>console.log('loaded',f.src)))</script>
```
Record Chrome/Firefox/Safari/Edge results in the runbook; on Firefox and Safari check the console for "refused to display" wording. This settles the XFO-vs-`frame-ancestors` behaviour on today's `/embed.html` too.

---------------------------------------------------------------------------------------------------

## 11. Appendix D: third-party pins, SRI, CI snippets

### D.1 Interim SRI (only until finding 08 self-hosts; hashes computed 2026-09-30 from the live CDN files)
```html
<link href="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.css" rel="stylesheet"
      integrity="sha384-rp1X/jJ9MpWPef9OimfXhOaOc4Gzs87yQvF+ajwY6X2H4PTeHNycNlLWiWvj7ehV" crossorigin="anonymous" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js"
        integrity="sha384-C88W+QUPtB6H9YRvK/B40dT5ez76/T8wGVlWpL3xkqfERnkaIJ4XrC+iPvWTECMH" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js"
        integrity="sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR" crossorigin="anonymous"></script>
```
Both CDNs send `Access-Control-Allow-Origin: *` (verified), which SRI requires. Recompute (`openssl dgst -sha384 -binary FILE | openssl base64 -A`) if the version changes. A wrong hash blocks the script and the page's map breaks, so test in a Deploy Preview.

### D.2 Version inventory to pin and watch
| Component | Deployed | Latest seen 2026-09-30 | Where |
|---|---|---|---|
| mapbox-gl | 3.24.1 (`bundle.pretty.js:53873`; 9 CDN tags) | 3.32.0 | finding 08 |
| peerjs | 1.5.4 (`watch-together.html:19`) | 1.5.5 | finding 07/08 |
| React | 18.3.1 (BRIEF) | n/a | app specialists |
| Workbox | n/a | workbox-build 7.4.1 | finding 22 |
| vite-plugin-pwa | n/a | 1.3.0 | finding 22 |
| @netlify/plugin-csp-nonce | n/a | 1.6.2 (not adopted, section 18) | finding 01 |
| @netlify/plugin-lighthouse | n/a | 6.0.4 | finding 29 |
(The npm queries returned, in order: mapbox-gl 3.32.0, peerjs 1.5.5, workbox-build 7.4.1, vite-plugin-pwa 1.3.0, @netlify/plugin-csp-nonce 1.6.2, @netlify/plugin-lighthouse 6.0.4. Treat these as a dated snapshot.)

### D.3 Lighthouse CI on Deploy Previews (GitHub Actions; alternative to the Netlify plugin)
```yaml
name: quality
on: pull_request
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pin-to-sha>
      - id: netlify                                  # wait for the Deploy Preview URL: a pinned "wait for Netlify" action or a curl poll loop
        run: echo "url=https://deploy-preview-${{ github.event.number }}--friendly-lolly-da85c0.netlify.app" >> "$GITHUB_OUTPUT"
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: BASE=${{ steps.netlify.outputs.url }} node scripts/csp-crawl.mjs
      - run: BASE=${{ steps.netlify.outputs.url }} bash scripts/check-headers.sh
      - uses: treosh/lighthouse-ci-action@<pin-to-sha>
        with:
          urls: |
            ${{ steps.netlify.outputs.url }}/
            ${{ steps.netlify.outputs.url }}/search
            ${{ steps.netlify.outputs.url }}/compare
          runs: 3
          configPath: .lighthouserc.json    # assert perf/a11y/bp/seo >= 0.95, LCP <= 2500, CLS <= 0.1, TBT <= 200; mobile and desktop presets
```

### D.4 `scripts/check-headers.sh` assertions (sketch)
```bash
set -euo pipefail
B="${BASE:?}"; fail=0
h() { curl -sSI "$B$1" | tr -d '\r'; }
assert() { if ! grep -qiE "$2" <<<"$3"; then echo "FAIL $1: expected /$2/"; fail=1; fi; }
refute() { if grep -qiE "$2" <<<"$3"; then echo "FAIL $1: unexpected /$2/"; fail=1; fi; }
for p in / /search /dashboard /compare /privacy /ar /watch-together; do
  H=$(h $p)
  assert "$p CSP"        '^content-security-policy(-report-only)?: .*frame-ancestors' "$H"
  refute "$p unsafe"     "script-src[^;]*'unsafe-(inline|eval)'" "$H"      # end state only
  assert "$p HSTS"       '^strict-transport-security: .*preload' "$H"
  assert "$p COOP"       '^cross-origin-opener-policy: same-origin' "$H"
  assert "$p PP"         '^permissions-policy: ' "$H"
done
H=$(h /embed);      assert /embed 'frame-ancestors \*' "$H"; refute /embed 'x-frame-options' "$H"
H=$(h /embed.html); assert /embed.html '^HTTP/[0-9.]+ 301' "$H"
for p in /diagnostics /unit-rendering-reference /unit-rendering-reference.html /wp-login.php; do
  assert "$p 404" '^HTTP/[0-9.]+ 404' "$(h $p)"; done
H=$(h /ar);         assert /ar 'camera=\(self\)' "$H"
H=$(h /);           assert / 'camera=\(\)' "$H"
H=$(h /assets/$(ls dist/assets | grep -m1 '^index-.*\.js$')); assert asset 'immutable' "$H"
exit $fail
```

---------------------------------------------------------------------------------------------------

## 12. Appendix E: service worker, manifest, registration, offline page, functions

### E.1 `src/sw.js` (Workbox 7, injectManifest)
```js
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { enable as enableNavigationPreload } from 'workbox-navigation-preload';

const TILE_CACHE = false;                       // flip on only after finding 23 sign-off
const LEGACY_CACHES = ['gbg-v5', 'gbg-v6'];

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);           // hashed /assets/*, index.html shell, offline.html, icons, manifest, boot data
enableNavigationPreload();
clientsClaim();                                 // first install controls the page without a reload
// NO skipWaiting() here: the page asks (update toast). Prevents the forced reload of C6.
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(Promise.all(LEGACY_CACHES.map((k) => caches.delete(k)))));

const ok200 = new CacheableResponsePlugin({ statuses: [200] });
const cleanRedirect = { handlerWillRespond: async ({ response }) => {      // Safari rejects redirected navigations
  if (!response || !response.redirected) return response;
  return new Response(await response.blob(), { headers: response.headers, status: response.status, statusText: response.statusText });
} };

// Tool pages and anything not precached: network first (3 s), preload on, cached copy, then offline page
registerRoute(({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages-v1', networkTimeoutSeconds: 3,
    plugins: [cleanRedirect, ok200, new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 })] }));

// Un-hashed data (only until /data files are content-hashed and precached)
registerRoute(({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/data/'),
  new StaleWhileRevalidate({ cacheName: 'data-v1', plugins: [ok200, new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 14 * 24 * 3600, purgeOnQuotaError: true })] }));

// Hashed assets missing from the manifest (lazy chunks)
registerRoute(({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/assets/'),
  new CacheFirst({ cacheName: 'assets-v1', plugins: [ok200, new ExpirationPlugin({ maxEntries: 80, purgeOnQuotaError: true })] }));

if (TILE_CACHE) {                               // finding 23: <= 30 days on the same device, populated from the API
  const stripSession = { cacheKeyWillBeUsed: async ({ request }) => { const u = new URL(request.url); u.searchParams.delete('sku'); u.searchParams.delete('access_token'); return u.href; } };
  registerRoute(({ url }) => url.origin === 'https://api.mapbox.com' && url.pathname.startsWith('/v4/mapbox.satellite/'),
    new CacheFirst({ cacheName: 'mapbox-tiles-v1', plugins: [stripSession, ok200,
      new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 14 * 24 * 3600, purgeOnQuotaError: true })] }));
}

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') { const r = await matchPrecache('/offline.html'); if (r) return r; }
  return Response.error();
});
// Never intercepted: /.netlify/*, /api/*, events.mapbox.com, styles/sprites/glyphs, Google/NPS frames.
```
No-build variant (until Vite exists): `npx workbox-cli copyLibraries dist/vendor`, write the same file with `importScripts('/vendor/workbox-v7.4.1/workbox-sw.js'); workbox.setConfig({modulePathPrefix: '/vendor/workbox-v7.4.1/'});` and the `workbox.*` globals, then `npx workbox-cli injectManifest workbox-config.cjs` with `globDirectory: 'dist'`, `globPatterns: ['index.html','offline.html','assets/**/*.{js,css}','icons/*.png','data/**/*.json','manifest.*']`, `maximumFileSizeToCacheInBytes: 4*1024*1024`.

### E.2 `manifest.webmanifest` (replacement; icon files to be produced)
```json
{
  "id": "/",
  "name": "Gettysburg Interactive Battle Map",
  "short_name": "Gettysburg",
  "description": "Watch the Battle of Gettysburg unfold minute by minute: 467 regiments and batteries across 675 five-minute snapshots of July 1 to 3, 1863.",
  "lang": "en-US",
  "dir": "ltr",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0a0a14",
  "theme_color": "#0a0a14",
  "categories": ["education", "entertainment", "travel"],
  "icons": [
    { "src": "/icons/icon-192.<hash>.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.<hash>.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon.<hash>.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/icons/maskable-192.<hash>.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/maskable-512.<hash>.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/wide-day1.<hash>.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide", "label": "Day 1: first contact on McPherson's Ridge" },
    { "src": "/screenshots/wide-day2.<hash>.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide", "label": "Day 2: the fight for Little Round Top" },
    { "src": "/screenshots/wide-day3.<hash>.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide", "label": "Day 3: Pickett's Charge" },
    { "src": "/screenshots/narrow-day1.<hash>.png", "sizes": "750x1334", "type": "image/png", "form_factor": "narrow", "label": "Day 1 on a phone" },
    { "src": "/screenshots/narrow-day2.<hash>.png", "sizes": "750x1334", "type": "image/png", "form_factor": "narrow", "label": "Day 2 on a phone" },
    { "src": "/screenshots/narrow-day3.<hash>.png", "sizes": "750x1334", "type": "image/png", "form_factor": "narrow", "label": "Day 3 on a phone" }
  ],
  "shortcuts": [
    { "name": "Ask the Historian", "short_name": "Historian", "description": "Search regiments, commanders and moments", "url": "/historian", "icons": [{ "src": "/icons/sc-historian-96.<hash>.png", "sizes": "96x96", "type": "image/png" }] },
    { "name": "Search everything", "short_name": "Search", "url": "/search", "icons": [{ "src": "/icons/sc-search-96.<hash>.png", "sizes": "96x96", "type": "image/png" }] },
    { "name": "Turning points", "short_name": "Turning points", "url": "/turning-points", "icons": [{ "src": "/icons/sc-turning-96.<hash>.png", "sizes": "96x96", "type": "image/png" }] },
    { "name": "Battlefield AR", "short_name": "AR", "url": "/ar", "icons": [{ "src": "/icons/sc-ar-96.<hash>.png", "sizes": "96x96", "type": "image/png" }] }
  ],
  "prefer_related_applications": false
}
```
Notes: no `orientation`; maskable art is full-bleed `#0a0a14` with the glyph inside the central 60 to 66 percent; when finding 26 lands add tick shortcuts (`/?tick=1`, `/?tick=226`, `/?tick=451`) and consider `"start_url": "/?source=pwa"`; `<link rel="manifest" href="/manifest.webmanifest">` plus `<meta name="theme-color" content="#0a0a14">` and `<link rel="apple-touch-icon" href="/apple-touch-icon.<hash>.png">` (opaque, 180x180) and `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` on every page.

### E.3 Registration module, update toast, offline page
`assets/sw-register.js` (external, `defer`, loaded by every page that should be installable; plain JS so it works before a bundler exists):
```js
(function () {
  if (!('serviceWorker' in navigator)) return;
  var accepted = false, reloading = false;
  function showUpdate(reg) {
    if (document.getElementById('gtbg-update')) return;
    var el = document.createElement('div');
    el.id = 'gtbg-update'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span>A new version of the map is available.</span>' +
      '<button type="button" data-a="reload">Reload</button><button type="button" data-a="later">Later</button>';
    el.addEventListener('click', function (e) {
      var a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'later') el.remove();
      if (a === 'reload' && reg.waiting) { accepted = true; reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }
    });
    document.body.appendChild(el);
  }
  function start() {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!accepted || reloading) return;        // never reload unless the user asked (first install fires this too)
      reloading = true; location.reload();
    });
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', function () { if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(reg); });
      });
      var last = Date.now();
      document.addEventListener('visibilitychange', function () {   // long-lived tabs: check at most hourly
        if (document.visibilityState === 'visible' && Date.now() - last > 36e5) { last = Date.now(); reg.update().catch(function () {}); }
      });
    }).catch(function (e) { console.warn('Service worker registration failed:', e); });
  }
  window.addEventListener('load', function () { (window.requestIdleCallback || function (f) { setTimeout(f, 3000); })(start, { timeout: 8000 }); });
})();
```
Toast CSS (external stylesheet, no inline styles): place at the TOP, not the bottom, because the mobile timeline bar occupies the bottom (audit C2): `#gtbg-update{position:fixed;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:2000;display:flex;gap:12px;align-items:center;padding:10px 14px;border:1px solid #c9a24b;border-radius:10px;background:#12121e;color:#e8e6df;font:14px/1.4 system-ui,sans-serif}` `#gtbg-update button{min-height:44px;min-width:44px;padding:0 14px}`; respect `prefers-reduced-motion` (no animation). The toast must not steal focus.
`offline.html` (precached, uses only external `/assets/offline.<hash>.css`): title "You are offline", one paragraph ("The map needs a connection for satellite imagery. Pages you have already opened, the timeline, orders of battle and the historian search still work"), a "Try again" button (`location.reload()` in the external script) and links to `/`, `/search`, `/historian`. Add `X-Robots-Tag: noindex`.

### E.4 Functions (skeletons)
`netlify/functions/csp-report.mjs` (finding 10; needs Git/CLI builds):
```js
import { getStore } from '@netlify/blobs';
export const config = { path: '/api/csp-report', rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
const NOISE = /^(chrome-extension|moz-extension|safari-web-extension|safari-extension|webkit-masked-url|about|resource|edge):/i;
export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (Number(req.headers.get('content-length') || 0) > 16384) return new Response(null, { status: 413 });
  let body; try { body = JSON.parse(await req.text()); } catch { return new Response(null, { status: 400 }); }
  const reports = (Array.isArray(body) ? body.map((r) => r.body) : [body['csp-report'] ?? body]).slice(0, 10);
  const store = getStore('csp-reports'); const day = new Date().toISOString().slice(0, 10);
  for (const r of reports) {
    if (!r) continue;
    const blocked = String(r.blockedURL ?? r['blocked-uri'] ?? ''), source = String(r.sourceFile ?? r['source-file'] ?? '');
    if (NOISE.test(blocked) || NOISE.test(source)) continue;
    const directive = String(r.effectiveDirective ?? r['violated-directive'] ?? '').split(' ')[0];
    let host = blocked; try { host = new URL(blocked).host || blocked; } catch {}
    let doc = '/'; try { doc = new URL(String(r.documentURL ?? r['document-uri'] ?? '/'), 'https://x').pathname; } catch {}
    const key = `${day}/${directive}|${host}|${doc}`.slice(0, 200);
    const cur = (await store.get(key, { type: 'json' })) ?? { n: 0, sample: { blocked: blocked.slice(0, 200), source: source.slice(0, 200), line: r.lineNumber ?? r['line-number'] ?? null } };
    cur.n += 1; await store.setJSON(key, cur);
  }
  return new Response(null, { status: 204 });
};
```
A second tiny function `csp-summary.mjs` (secret-header authenticated) lists today's keys sorted by `n`.

`netlify/functions/historian.mts` (finding 31; comments mark the steps, not a full implementation):
```ts
import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
export const config: Config = { path: '/api/historian', method: 'POST',
  rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export default async (req: Request, _ctx: Context) => {
  if (Netlify.env.get('HISTORIAN_ENABLED') === 'false') return json({ mode: 'static' });
  if (req.headers.get('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin') return json({ error: 'forbidden' }, 403);
  if (!(req.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'bad_type' }, 415);
  const raw = await req.text(); if (raw.length > 2048) return json({ error: 'too_large' }, 413);
  const { q } = JSON.parse(raw); if (typeof q !== 'string' || q.length < 2 || q.length > 500) return json({ error: 'bad_query' }, 400);
  // 1. verify proof-of-work / Turnstile token (optional)
  // 2. budget guard: read/increment daily counter in Blobs; if exhausted -> return json({ mode: 'static' })
  // 3. cache: sha256(normalise(q) + DATA_VERSION) -> Blobs (TTL 30 d)
  // 4. retrieval over the hashed static index shards (fetch from /data/historian/*), select top-k passages with ids
  // 5. (optional) model call with system prompt: passages are DATA, answer only from them, cite ids; provider key from Netlify.env (secret)
  // 6. validate: every citation id must exist in the retrieved set; reject otherwise; return { mode, answer_blocks: [{ text, citations }] }
  // 7. log counters only (no query text, no IP)
  return json({ mode: 'static' });
};
```

### E.5 Vite integration sketch
```js
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  build: { rollupOptions: { input: { /* every html: index, search, compare, ... */ } } },   // multi-page: hashed per-page js/css, no inline code
  plugins: [VitePWA({
    strategies: 'injectManifest', srcDir: 'src', filename: 'sw.js',
    registerType: 'prompt', injectRegister: null, manifest: false,          // own manifest + own registration module
    injectManifest: { globPatterns: ['index.html', 'offline.html', 'assets/**/*.{js,css,svg}', 'icons/*.{png,svg}', 'data/**/*.json'],
                      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 },
  })],
});
```

---------------------------------------------------------------------------------------------------

## 13. Appendix F: runbooks

### F.1 Mapbox token runbook
Goal: keep the map working from production only, keep dev/preview working, limit blast radius, get alerts.
1. Sign in at account.mapbox.com > Access tokens. Find the site token by its prefix `pk.eyJ1IjoibWxlZ2VyZTk3ODki...` (token id is the `a` claim of the JWT payload: decode the middle segment with base64url; it is public).
2. Record: created date, scopes, URL restrictions. Expected: URL list = `gettysburginteractivemap.com` only (subdomains inherit automatically; matching is by Referer; no wildcards or IP addresses allowed; paths allowed and case-sensitive; up to 100 URLs; a request with no Referer is rejected when any restriction exists). If the list contains `netlify.app`, remove it (it authorises every Netlify site); if it contains `localhost`, move that to the dev token.
3. Scopes: public token scopes only; keep `styles:tiles`, `styles:read`, `fonts:read`; remove `datasets:read`, `vision:read` and anything unused. Never create or paste a secret (`sk.`) token in client code.
4. Create `gtbg-dev` (URL `localhost`) and `gtbg-preview` (URL `netlify.app`, minimum scopes, note "low value, rotate monthly"). Store all three in the token inventory (name, purpose, created, rotate-by date).
5. Wire per-context values (Netlify env `VITE_MAPBOX_TOKEN`; local `.env.development`); until a build exists, one `assets/config.<hash>.js` per environment.
6. Verify from a shell (replace TOK; add a random `x` coordinate so nothing is served from the CDN cache):
```bash
t(){ printf '%-52s ' "$1"; curl -s -o /dev/null -w '%{http_code}\n' ${2:+-H "Referer: $2"} "https://api.mapbox.com/v4/mapbox.satellite/16/$((18000+RANDOM))/25030.jpg90?access_token=$TOK"; }
t "no referer (expect 403)"                       ; t "evil (403)" https://evil.example/
t "localhost (403 with prod token)" http://localhost:3000/ ; t "production (200)" https://gettysburginteractivemap.com/
```
7. Rotation (do after step 5): deploy with the new prod token, wait 48 to 72 h (tile device TTL 12 h, plus stale tabs), then delete the old token; confirm the old token returns 401; watch Statistics for 401 spikes for a week.
8. Alerts: Billing > usage/billing notifications (labels UNVERIFIED); calendar a monthly Statistics check; expected volume about 3 to 4 thousand map loads/month against a free tier of 50,000.
9. Attribution: logo and text visible on every map (finding 20).
10. Never loosen `Referrer-Policy`; document that in `docs/security.md` next to the header config.

### F.2 Google Cloud key runbook (Maps Embed key `AIzaSyC-1eIr...`, project number 563067843889)
1. Console > APIs and Services > Credentials > open the key.
2. Application restrictions: HTTP referrers (web sites): `https://gettysburginteractivemap.com/*` and `https://www.gettysburginteractivemap.com/*`. (Dev key: `http://localhost:*/*`, separate key.)
3. API restrictions: Restrict key > Maps Embed API only.
4. APIs and Services > Enabled APIs: disable everything except Maps Embed API (external probes already show Geocoding, Directions, Distance Matrix, Elevation, Time Zone, Places legacy and New, Static Maps, Street View Static are not usable with this key).
5. Billing > Budgets and alerts: USD 1 budget, alert at 50/90/100 percent to the owner mailbox.
6. Rotate: create a new restricted key, deploy, wait 48 h, delete the old key.
7. Verify in a browser from a non-allowed origin: the embed shows Google's referer-not-allowed error; from production it renders. (Cannot be tested with curl.)
8. Calendar: quarterly review of restrictions and enabled APIs.

### F.3 HSTS preload checklist
Before submitting at hstspreload.org: (a) every subdomain you may ever create will be HTTPS-only; (b) apex responds with HSTS `max-age>=31536000; includeSubDomains; preload` on HTTPS and redirects HTTP to HTTPS on the same host (already true); (c) findings 11/02 are live so nothing else changes; (d) accept that removal takes months. Submit, then monitor status.

### F.4 Netlify project settings checklist
- Project configuration > Build and deploy: connect Git; production branch `main`; Deploy Previews on; branch deploys optional; build settings; "Stop auto publishing" optional gate.
- Developer settings > Post processing: Pretty URLs OFF (or `[build.processing.html] pretty_urls = false`); snippet injection none; RUM stays on.
- Domain management: primary domain apex; HTTPS certificate auto-renew (expires 2026-11-10); DNS records per finding 34.
- Environment variables: per-context Mapbox tokens; secrets flagged "Contains secret values" with Functions/Runtime scopes only.
- Notifications: deploy failed and succeeded to email/Slack; usage-limit alerts.
- Team: 2FA required; audit log (if plan includes); minimal personal access tokens.
- Analytics and RUM: keep both; add own vitals (finding 32).

### F.5 Incident playbooks (one page each in the repo `docs/runbooks/`)
1. Bad or defaced deploy: Netlify > Deploys > select last good deploy > Publish deploy (no rebuild). Then rotate tokens if a secret may have leaked; review the audit log.
2. CSP enforcement broke a feature: set `CSP_MODE=report-only` in the generator (or publish the previous deploy); read the collector summary; fix the allow-list or the code; re-promote per Appendix C.3.
3. Mapbox usage spike or 401/403 flood: check Statistics; verify URL restrictions unchanged; create a new token, deploy, delete the old; if abuse continues, lower privileges/scopes and add the abuser's referer pattern to nothing (Mapbox has no deny list): rely on restriction plus rotation.
4. Google key abuse: check Metrics by API; confirm restrictions; rotate key; delete unused APIs.
5. Service worker poisoning or stuck clients: deploy the kill-switch `sw.js` (F.6); optionally point support at `/reset`.
6. Registrar/DNS compromise: recover Name.com/Netlify accounts (2FA recovery codes), restore NS records, re-check CAA/TXT; change all passwords; review Netlify domain settings.
7. Vulnerability report via security.txt: acknowledge within 3 days, fix, credit if the reporter wishes.

### F.6 Service-worker kill switch
Deploy this as `/sw.js` (keep `Cache-Control: no-cache`); clients pick it up on their next navigation or the 24-hour update check, clear every cache, unregister, and reload once:
```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  await self.registration.unregister();
  (await self.clients.matchAll({ type: 'window' })).forEach((c) => c.navigate(c.url));
})()));
```
Support page `/reset` (static, `noindex`) served with `Clear-Site-Data: "cache", "storage"` unregisters workers and clears storage for the origin (this also deletes bookmarks, prefs and tours, so the page must say so and ask for confirmation).

---------------------------------------------------------------------------------------------------

## 14. Appendix G: traffic classes and proportionate responses

| Traffic class | Evidence | Response | Cost |
|---|---|---|---|
| Scanner probes (`/wp-admin/install.php` 430, `/.git/config`, `/.env*`, `/xmlrpc.php`, `/graphql`, `/wp/`) | about 1,900 per 30 days in Netlify Analytics; all 404 (verified) | nothing; default branded 404; label as noise in reports (finding 14) | none |
| Non-GET probes and path oddities at `/` | `OPTIONS /` 404, `GET /./` 404 reproduced; 181 per 30 days | nothing (harmless); future `/api/*` must implement OPTIONS | none |
| Cloud-hosted crawlers (CN/SG/HK/DE about 18 percent of views) | BRIEF | do not block; measure humans with first-party vitals (finding 32) | none |
| Search-engine crawlers | Google 63, Bing 59, DDG 38 referrals | allow; clean sitemap; Search Console (finding 35) | none |
| AI crawlers / assistants | ChatGPT 14 referrals | allow (owner decision recorded in finding 35) | none |
| Owner's own synthetic testing (Lighthouse, PSI, DevTools) | RUM spikes on deploy days (BRIEF) | block the RUM script in the test profile (finding 32) | none |
| Data-file scrapers | unknown; 328 MB bandwidth per 30 days | Terms clause (finding 37), optional `noindex`, watch bandwidth (finding 33) | none |
| Abuse of a future `/api/*` | not applicable yet | code-based rate limits, proof-of-work, budget guard (finding 31) | small |
| Third-party hotlinking of OG images | none observed | ignore | none |

---------------------------------------------------------------------------------------------------

## 15. Appendix H: replacement legal text (drafts for owner and counsel review; not legal advice)

Bracketed items `[[...]]` are decisions or facts the owner must confirm. Facts stated here were verified from the code and live site on 2026-09-30 and cite the evidence in finding 36. Update the date and the storage table whenever the app changes (finding 36's CI check). Markup uses the site's existing heading/list structure; style it with the shared design system.

### H.1 privacy.html (body)
```html
<main id="content">
<h1>Privacy Policy</h1>
<p class="updated">Effective [[DATE]]. Replaces the version of September 7, 2026.</p>

<h2 id="summary">The short version</h2>
<ul>
  <li>There are no accounts, no sign-up, no ads, no advertising or analytics cookies, and we do not sell or share personal information.</li>
  <li>This site's own code sets no cookies. What you save (bookmarks, settings, a tour you build) stays in your browser and never reaches us.</li>
  <li>To show you the map and keep the site running, two services necessarily receive your IP address and basic browser details: Netlify (our host) and Mapbox (map imagery). A few features contact other services only when you use them: Google (Street View), the National Park Service (video), and PeerJS, Google and jsDelivr (Watch Together live sync).</li>
  <li>Battlefield AR uses your camera, location and motion sensors on your device only. Nothing from them is sent to us.</li>
</ul>

<h2 id="who">Who runs this site</h2>
<p>gettysburginteractivemap.com is an independent, non-commercial educational project run by [[Mike Legere, an individual, City/State if you wish to publish it]] ("we", "us"). Contact: <a href="mailto:gettysburginteractivemap@gmail.com">gettysburginteractivemap@gmail.com</a>. Security reports: <a href="/.well-known/security.txt">security.txt</a>.</p>

<h2 id="collect">What we collect</h2>
<p>We do not ask for, and our own code does not collect, your name, email address, account details or precise location. There are no forms, comments or log-ins. The sections below describe what our host and the services we use process automatically.</p>

<h2 id="hosting">Hosting and traffic statistics (Netlify)</h2>
<p>The site is hosted by Netlify, Inc. Like any web host, Netlify's servers receive your IP address, the pages and files you request, your browser's user-agent, the referring page and the time of each request, and keep server logs. Netlify's server-side Web Analytics turns those logs into aggregate reports for us (page views, unique visitors, referrers, countries, and pages that returned "not found"). It uses no cookies and no JavaScript in your browser, and we see aggregate counts, not individual visitors. See <a href="https://www.netlify.com/privacy/" rel="noopener noreferrer">Netlify's privacy policy</a>.</p>

<h2 id="rum">Performance monitoring (Netlify Real User Monitoring)</h2>
<p>Each page loads a small script from our own domain (<code>/.netlify/scripts/rum</code>) that measures how fast the page loads and responds. It sends Netlify (at ingesteer.services-prod.nsvcs.net) the page's hostname and path, the time of the visit, your browser family (for example Chrome or Safari), operating-system family, device type (mobile or desktop), your available screen size, and timing, layout and interaction measurements. It sets no cookies, stores nothing in your browser, and does not run inside embedded frames. Content blockers can block it without affecting the site.</p>

<h2 id="maps">Maps (Mapbox)</h2>
<p>Map imagery, styles, fonts and symbols come from Mapbox, Inc. (api.mapbox.com). Your browser contacts Mapbox directly, so Mapbox receives your IP address, your browser's user-agent, the address of the page you are on (the referrer) and the tiles you view. The map software also sends usage and performance events to events.mapbox.com: a random anonymous identifier (kept in your browser's localStorage under keys beginning <code>mapbox.eventData</code> and refreshed about every 24 hours), the software version, the map style and zoom, device pixel ratio, connection type, screen and window sizes, and your graphics card's renderer and vendor names. Mapbox uses these to bill for and secure its service and to operate and improve it, under <a href="https://www.mapbox.com/legal/privacy" rel="noopener noreferrer">its privacy policy</a> and <a href="https://www.mapbox.com/telemetry" rel="noopener noreferrer">telemetry notice</a>. We have not observed Mapbox setting cookies. Blocking events.mapbox.com normally leaves the map working.</p>

<h2 id="streetview">Street View (Google)</h2>
<p>[[When click-to-load ships: "Only when you press Load Street View,"]] the Virtual Walkthrough shows a Google Street View panorama in a frame served by google.com. Google receives your IP address, browser details and the page address, and may set or read its own cookies and identifiers, under <a href="https://policies.google.com/privacy" rel="noopener noreferrer">Google's privacy policy</a>. "Open in Google Maps" links open Google Maps in a new tab, where Google's policy applies.</p>

<h2 id="nps">National Park Service video</h2>
<p>[[When you press Show Video,]] some tour stops show a video page from the National Park Service (www.nps.gov) in a frame. The NPS site receives your IP address, browser details and the page address, and its pages may set cookies or use analytics under <a href="https://www.nps.gov/aboutus/privacy.htm" rel="noopener noreferrer">NPS privacy practices</a> [[verify URL]]. Other links to nps.gov on this site open the NPS site directly.</p>

<h2 id="watch">Watch Together (live sync)</h2>
<p>Building and playing a tour happens in your browser. Live Sync is optional and connects two browsers directly with WebRTC, arranged by the public PeerJS service. When you host or join a session: the PeerJS code is downloaded from cdn.jsdelivr.net [[or from this site, once self-hosted]]; your browser registers a random peer ID (and, for hosts, the session code) with the PeerJS broker at 0.peerjs.com over HTTPS and WebSocket, so the broker sees your IP address; WebRTC asks Google's public STUN server (stun.l.google.com) and, if a direct connection fails, PeerJS's relay servers (eu-0.turn.peerjs.com and us-0.turn.peerjs.com) how to reach you, so those services also see your IP address; and the other person in the session can see your IP address, as with any peer-to-peer connection. The only messages exchanged are the moment the host is showing (a tick number) and the host's optional note. Share a session code only with people you trust, and do not put personal information in tour notes. Policies: <a href="https://peerjs.com" rel="noopener noreferrer">PeerJS</a>, <a href="https://policies.google.com/privacy" rel="noopener noreferrer">Google</a>, <a href="https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net" rel="noopener noreferrer">jsDelivr</a> [[verify URLs]].</p>

<h2 id="ar">Battlefield AR</h2>
<p>The AR page asks your permission to use your rear camera, your location and your device's motion and orientation sensors. Camera video is shown on your screen only; it is not recorded or uploaded. Location is used on your device to work out distances and bearings to landmarks, and motion data aims the overlay. Our code sends none of these to us or to anyone else. You can withdraw permission at any time in your browser or phone settings; the rest of the site works without them.</p>

<h2 id="local">Tools that stay on your device</h2>
<p>Cinematic Export records the map canvas into a video file on your device. Immersive Mode generates sound in your browser. Ask the Historian searches this site's own data in your browser; the questions you type are not sent to us. [[If a server-side Historian ships, replace this paragraph with H.3.]]</p>

<h2 id="storage">What we store on your device</h2>
<table>
  <thead><tr><th>Name</th><th>Purpose</th><th>Contents</th><th>How long</th></tr></thead>
  <tbody>
    <tr><td><code>gtbg_onboarded</code></td><td>Remembers that you saw the intro</td><td>"1"</td><td>Until you clear site data</td></tr>
    <tr><td><code>gtbg_prefs</code></td><td>Legend and mini-map visibility, intro completion</td><td>Small JSON</td><td>Until cleared</td></tr>
    <tr><td><code>gettysburg_bookmarks</code></td><td>Your bookmarks</td><td>Tick, label, unit, map centre, zoom, time created, share link</td><td>Until cleared</td></tr>
    <tr><td><code>gtbg-ef-hidden</code></td><td>Whether you hid the Extra Features menu</td><td>true / false</td><td>Until cleared</td></tr>
    <tr><td><code>gtbg_watch_together_tour</code></td><td>The tour you build in Watch Together</td><td>Stops (tick numbers) and your notes</td><td>Until cleared</td></tr>
    <tr><td><code>mapbox.eventData…</code></td><td>Mapbox anonymous identifier and telemetry state</td><td>Random ID, timestamps</td><td>ID refreshed about every 24 hours</td></tr>
    <tr><td>Cache Storage (service worker)</td><td>Faster loading and offline use</td><td>Copies of this site's scripts, styles, data and pages</td><td>Replaced on updates; until cleared</td></tr>
  </tbody>
</table>
<p>[[After the data-controls panel ships: "Use Privacy and data in the footer to see and clear all of this."]] You can also clear it in your browser's site settings.</p>

<h2 id="cookies">Cookies</h2>
<p>This site sets no cookies. Google (Street View) and the National Park Service (video) may set their own cookies if you open those frames; see their policies above.</p>

<h2 id="children">Children</h2>
<p>The site is used in classrooms and is suitable for all ages. It collects no personal information from anyone and does not knowingly collect personal information from children under 13 (COPPA) or under 16 (GDPR). Background services (Netlify, Mapbox) and the optional features above receive technical data such as IP addresses under their own policies. No tool needs an account or personal details; teachers may wish to remind students not to type personal information into Watch Together notes or the historian box.</p>

<h2 id="rights">Your rights and choices</h2>
<p>We hold no profile about you and cannot look you up from an IP address. If you are in the EU, UK or EEA you can ask for access, correction, deletion, restriction or portability of personal data we hold, object to processing, and complain to your data-protection authority. If you are in California or another US state with a privacy law, you can ask what we hold, ask for deletion, and opt out of sale or sharing (we do neither). Email us; we reply within 30 days (45 where California law allows). Requests about data held by Netlify, Mapbox, Google, NPS, PeerJS or jsDelivr must go to them. We honour Global Privacy Control and Do Not Track because we do no tracking.</p>

<h2 id="basis">Legal bases (EU and UK)</h2>
<p>Operating, securing and measuring the performance of the site (Netlify logs and monitoring, Mapbox delivery) is our legitimate interest (GDPR Art. 6(1)(f)). Items stored on your device are used to provide features you request or, for the Mapbox identifier, to deliver the map you asked for. Optional frames and live sync are used only when you ask for them. [[Counsel: confirm the ePrivacy analysis for the Mapbox identifier and events.]]</p>

<h2 id="transfers">Where data goes</h2>
<p>Netlify, Mapbox, Google and jsDelivr operate mainly in the United States and elsewhere; PeerJS's public broker reports an EU location. If you visit from another country your data is transferred to those places under each provider's own safeguards.</p>

<h2 id="retention">How long data is kept</h2>
<p>We keep nothing ourselves. The providers above keep data under their own policies. Data on your device stays until you clear it.</p>

<h2 id="security">Security</h2>
<p>The site is served only over HTTPS with HSTS [[and an enforced content-security-policy, once live]], and accepts no logins or payments. Report vulnerabilities through <a href="/.well-known/security.txt">security.txt</a>.</p>

<h2 id="changes">Changes to this policy</h2>
<p>We will update this page and its date when what the site collects or how it works changes (for example if Ask the Historian starts sending questions to a server). [[Add a short change log.]]</p>

<h2 id="contact">Contact</h2>
<p><a href="mailto:gettysburginteractivemap@gmail.com">gettysburginteractivemap@gmail.com</a></p>
<p><a href="/">Back to the map</a></p>
</main>
```

### H.3 Conditional paragraph if Ask the Historian is served by our own API (publish only when live)
```html
<h2 id="historian">Ask the Historian</h2>
<p>When you ask a question, the text you type and the passages retrieved from this site's historical data are sent to our server (hosted on Netlify) [[and, when the AI mode is on, to [[model provider]] to compose an answer]]. We do not store your question or your IP address, except that short-lived counters keyed to a temporary hash are used to limit abuse and cost. If you press a feedback button we store that question with your rating for up to 30 days to improve the service. Answers are generated from cited sources and can contain mistakes; check the citations. Please do not enter personal information. [[Provider]] handles the text under its own terms (it does not use API inputs to train its models: confirm the current commitment before publishing).</p>
```

### H.2 terms.html (body)
```html
<main id="content">
<h1>Terms of Service</h1>
<p class="updated">Effective [[DATE]]. Replaces the version of September 7, 2026.</p>

<h2>1. About these terms</h2>
<p>By using gettysburginteractivemap.com ("the site") you agree to these terms. The site is an independent, non-commercial educational project run by [[Mike Legere]]. It is not affiliated with or endorsed by the National Park Service, Gettysburg National Military Park or the Gettysburg Foundation [[owner: confirm]].</p>

<h2>2. The service</h2>
<p>The site is free, has no accounts, subscriptions or ads, and offers an animated reconstruction of the Battle of Gettysburg (July 1 to 3, 1863) with research tools. Features may change or be withdrawn at any time.</p>

<h2>3. Acceptable use</h2>
<p>You are welcome to use the site for personal, educational and classroom purposes, including linking to it, citing it, and showing it in class. Please do not: disrupt the service or try to bypass its protections; send automated requests at a rate that affects other visitors (identify your tool in its User-Agent and respect <a href="/robots.txt">robots.txt</a>); bulk-download the data files to republish as your own dataset; upload or share tour files or notes that are unlawful, harassing or malicious; or use Watch Together to bother other people.</p>

<h2>4. Linking and embedding</h2>
<p>You may link to any page. You may embed the "Embedded Moment" widget (<code>https://gettysburginteractivemap.com/embed</code>, optionally with <code>?vignette=V-018</code>) in an iframe on your own page if you keep it unmodified with its link back to the site, do not imply endorsement, and do not place it on unlawful, hateful or harassing pages. We may change or disable the widget at any time. The main map and the other tools cannot be framed; ask first for any other integration.</p>
<pre><code>&lt;iframe src="https://gettysburginteractivemap.com/embed" title="Gettysburg: an embedded moment" width="480" height="260" loading="lazy"&gt;&lt;/iframe&gt;</code></pre>

<h2>5. Content and licence</h2>
<p>[[OPTION A (recommended for educators): The written text, vignettes and compiled data on this site are licensed under Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0). OPTION B: CC BY 4.0.]] Attribute as: "Gettysburg Interactive Battle Map, https://gettysburginteractivemap.com/ (accessed [date])". Historical facts and the public-domain sources they come from are free for anyone to use. The site's code, design and animation engine are all rights reserved unless stated otherwise.</p>

<h2>6. Third-party content and services</h2>
<p>Map imagery and styles are provided by Mapbox (attribution is shown on the map); Street View by Google; videos and links by the National Park Service; live sync by PeerJS and jsDelivr. Their content belongs to them, their terms apply when you use those parts, and we do not control or endorse them.</p>

<h2>7. Historical accuracy and educational use</h2>
<p>Unit positions, casualty figures and troop strengths are compiled from published sources (including the Official Records and Busey and Martin's strength tables) and researched in good faith, but this is not a peer-reviewed work. Where sources disagree we say so rather than silently choosing. Positions at five-minute resolution are a best-effort reconstruction, not forensic fact. Please check primary sources for research, and tell us about errors. The site holds regiment and commander records only, not the roughly 165,000 individual soldiers, and cannot prove genealogical claims.</p>

<h2>8. Ask the Historian</h2>
<p>[[Today: a search over this site's own data.]] [[When AI mode ships: Answers are generated with the help of software from retrieved sources and can be wrong or incomplete. Verify important facts against the citations.]]</p>

<h2>9. Your files, notes and live sessions</h2>
<p>Only import tour files from sources you trust. You are responsible for the notes you write and share. Session codes are not passwords: anyone who has one can join your session.</p>

<h2>10. Battlefield AR and visiting the park</h2>
<p>If you use the AR page on site: stay aware of your surroundings, traffic and terrain; do not use it while driving; keep to paths and off monuments and earthworks; follow National Park Service rules and respect private property and other visitors' privacy. AR positions depend on your phone's sensors and are approximate.</p>

<h2>11. Availability, changes and termination</h2>
<p>We aim to keep the site available but do not guarantee uninterrupted access. We may block access that abuses the service. We may change these terms; the effective date above will change with them and continued use means you accept the update.</p>

<h2>12. Disclaimer and limits on liability</h2>
<p>The site is provided "as is" without warranties of any kind. To the extent the law allows, we are not liable for indirect or consequential loss or for decisions made from the site's content. [[Counsel: adjust for consumer-protection laws that do not allow these limits.]]</p>

<h2>13. Copyright concerns</h2>
<p>If you believe content here infringes your copyright, email us with the page address, what is infringed and your contact details, and we will review it promptly.</p>

<h2>14. Governing law</h2>
<p>These terms are governed by the laws of [[State, USA]]. We would like to resolve any problem informally first: please email us before taking other steps.</p>

<h2>15. Contact</h2>
<p><a href="mailto:gettysburginteractivemap@gmail.com">gettysburginteractivemap@gmail.com</a></p>
<p><a href="/">Back to the map</a></p>
</main>
```

---------------------------------------------------------------------------------------------------

## 16. Appendix I: security and privacy checklist (tick when verified; each line names the finding that delivers it)

Transport and headers
- [ ] HSTS `max-age>=31536000; includeSubDomains; preload` on every HTTPS response (present) and domain submitted to the preload list (34)
- [ ] `X-Content-Type-Options: nosniff` everywhere (present)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` kept, with a comment that Mapbox/Google restrictions depend on it (present; 18, A.2)
- [ ] `Cross-Origin-Opener-Policy: same-origin` on documents (05); COEP intentionally absent (05)
- [ ] Enforced CSP on every HTML page, no `unsafe-inline`/`unsafe-eval` in `script-src`/`style-src`, no wildcard hosts, `frame-ancestors` set, `object-src 'none'`, `base-uri` locked, `form-action` locked, `upgrade-insecure-requests` (01, 03)
- [ ] `report-to` + `report-uri` collector live, noise filtered, weekly review (10)
- [ ] Per-page `Permissions-Policy` (camera/geolocation/sensors only on `/ar`) with zero console warnings in Chrome, Firefox, Safari (04)
- [ ] No `X-Frame-Options` conflict; embed framing works only for `/embed` (02)
- [ ] Trusted Types reporting clean, enforced on static pages (06)
- [ ] SRI on every remaining third-party script/style, or none remain (08)
- [ ] `/.well-known/security.txt` valid and unexpired (09)
- [ ] `Cache-Control` correct per asset class, no `immutable` on un-fingerprinted files (13)
- [ ] `X-Robots-Tag: noindex` on `/data/*`, `/api/*`, previews (13, 15, 35)

Content and code
- [ ] No inline event handlers, no inline `style=` in markup or JS strings (03)
- [ ] All DOM writes of non-static data use `textContent` or the escape helper (07, 06)
- [ ] Watch Together: imported/stored/remote data validated; crypto RNG codes; connection cap (07)
- [ ] No `eval`/`new Function` (verified today: none)
- [ ] Dev/diagnostic pages absent from the deploy (12)
- [ ] `target=_blank` links carry `rel="noopener noreferrer"` (verified today in the bundle)
- [ ] Third-party frames sandboxed, lazy, click-to-load, `allow` limited (19)

Keys, tokens, secrets
- [ ] Mapbox prod token restricted to the domain, public scopes only, dev/preview tokens separate, single config, rotation done, alerts on (18, F.1)
- [ ] Google Embed key: referrer + API restricted, budget alert, unused APIs disabled (19, F.2)
- [ ] No secret (`sk.` or provider API key) in repo, bundle or logs; env vars flagged secret with minimal scopes (28, 31, 39)
- [ ] Token inventory with created/rotate-by dates (39)

Platform and process
- [ ] Git-connected deploys, Deploy Previews, branch protection, required checks, rollback rehearsed (28)
- [ ] Lighthouse, header, CSP-crawl, link, image, axe gates in CI (29)
- [ ] Netlify plan and credit exposure known; alert set (30)
- [ ] Uptime, certificate and domain expiry monitoring (33)
- [ ] Pretty URLs processing off; one URL form; `.html` 301 to clean; netlify.app 301 to canonical host (11, 15)

DNS, domain, accounts
- [ ] CAA, null MX, SPF, DMARC published (34)
- [ ] Search Console and Bing verified via DNS TXT (34, 35)
- [ ] Registrar: 2FA, transfer lock, auto-renew, multi-year (34, 39)
- [ ] 2FA/passkeys on Gmail, Netlify, GitHub, Mapbox, Google Cloud, Name.com; recovery codes offline (39)
- [ ] Dependabot/Renovate, secret scanning, pinned Actions, lockfile, `npm ci` (39)

PWA and service worker
- [ ] No forced reload anywhere; update prompt only (21, 22)
- [ ] Offline page, versioned caches, entry/age caps, kill switch documented (22, F.6)
- [ ] Manifest valid, maskable + any icons, real screenshots with `form_factor`, shortcuts, no orientation lock (24, 25)
- [ ] Deep links restore state (26)

Privacy and legal
- [ ] Privacy policy lists every origin in the CSP and every storage key in the bundle (36)
- [ ] Terms embed clause matches the headers; content licence chosen (37)
- [ ] "Privacy and data" panel with clear-my-data (38)
- [ ] Street View, NPS video and Live Sync disclosures shown next to the controls (19, 07, 38)
- [ ] Historian: conditional paragraph, UI notice, no query logging, budget guard (31)

---------------------------------------------------------------------------------------------------

## 17. Grade and metric impact map

| Category (audit scorecard) | Now (Desktop / Mobile) | Findings that move it | Target |
|---|---|---|---|
| Security hygiene | B / B | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 12, 18, 19, 34, 39 | A+ / A+ (Observatory A+, securityheaders A+) |
| Privacy/legal pages | B+ / B+ | 36, 37, 38, 19, 07 | A+ / A+ |
| Reliability | B- / C | 21, 22, 07, 18 (blank-map notice), 26, 33 | A / A |
| Performance (real users) | C / D+ | 21 (double load), 22 (repeat visits), 13 (cache), 08 (vendor chunk, no third-party blocking), 32 (measure truthfully) | green RUM p75 |
| Core function | B / D | 26 (deep links), 21 | supports A+ |
| SEO / metadata | A- / A- | 11, 15, 25, 35 | A+ |
| Documentation | B / - | 16 (inline PDF, versioned name) | supports A+ |
| PWA (not scored in Lighthouse 13, part of "fit and finish" and mobile) | - | 22, 24, 25, 23 | installable, offline-capable |
Lighthouse items directly addressed: `redirects` (21), `inspector-issues` (01), `csp-xss` (01), `origin-isolation`/COOP (05), `bf-cache` (kept), `errors-in-console`/warnings (04, 01), `uses-long-cache-ttl` and render-blocking (13, 08), `valid-source-maps` (28).

Effort roll-up (S 0.25 d, M 1 d, L 3.5 d, XL 7 d): about 14 S + 18 M + 4 L + 1 L-XL is roughly 35 to 45 person-days for the infrastructure/security/privacy/PWA scope, with Phase 0 about 4 to 5 days and Phase 1 about 12 to 15 days. Much of Phase 2/3 shares work with the build migration owned by other specialists.

---------------------------------------------------------------------------------------------------

## 18. Options considered and rejected (so nobody re-litigates them)

| Option | Why not |
|---|---|
| Netlify CSP-nonce extension/plugin instead of hashes | Needs Edge Functions and builds (manual deploys cannot ship them), one edge invocation per HTML view, and `strict-dynamic` would block the Netlify-injected RUM script; hashes + `'self'` are simpler for a static site. Reasonable later if pages become dynamic. |
| COEP `require-corp`/`credentialless` | Breaks the cross-origin Google and NPS frames; nothing needs cross-origin isolation. |
| Geo-blocking or CAPTCHA on the site | The scanner/bot traffic touches nothing dynamic, the real audience is worldwide, and geo rules block genuine visitors; use code-based rate limits only where an API exists. |
| Cloudflare proxy in front of Netlify | Netlify discourages it; complicates cache invalidation/TLS; no need without a WAF requirement. |
| Moving DNS to get DNSSEC | Netlify DNS lacks DNSSEC; moving costs the wildcard certificate automation for a small gain that no grade requires. |
| Server-side tile proxy/cache | Prohibited by Mapbox terms (no proxying/redistribution). |
| Self-hosted PeerJS server | Needs a persistent WebSocket host (not Netlify); disproportionate for 40 to 86 views/month; prefer link-based tours or keep the public broker with disclosure. |
| Suppressing Mapbox telemetry client-side | Breaks Mapbox's billing/terms expectations; disclose instead. |
| Precaching every tile for offline | ToS-bounded (30 days, per device, populated from the API) and large; offer shell offline + optional bounded tile cache only. |

---------------------------------------------------------------------------------------------------

## 19. Open questions for the owner

1. Netlify: which plan is the team on, and how many production deploys were made this month? (findings 28, 30) Are all deploys drag-and-drop or zip uploads today?
2. Mapbox: please screenshot the token's scopes and URL list (finding 18). Do you want dev and preview tokens created now?
3. Google Cloud: please screenshot the key's application and API restrictions and the enabled-APIs list (finding 19).
4. Brand: one name for title/og/manifest/footer/legal ("Interactive" per the domain, or "Animated Battlefield Map")? (24)
5. Legal: operator identity to publish (name only, or city/state), governing-law state, content licence (CC BY-NC vs CC BY vs all rights reserved), counsel review, and whether the "not affiliated with the NPS" statement is accurate. (36, 37)
6. Watch Together: keep WebRTC live sync (with hardening + disclosure) or replace with shareable-link tours? (07, 36)
7. NPS video frame: keep the small picture-in-picture frame, or replace with outbound links? (19)
8. Offline scope: shell + data offline only (recommended), plus bounded tile cache (optional), or none beyond a friendly offline page? (22, 23)
9. Ask the Historian: is a server-side AI mode in scope (affects Functions, secrets, privacy text, budget)? If yes, provider, monthly cap, and whether questions may ever be stored. (31)
10. DNS: OK to publish deny-all mail records because no mail is sent from the domain? (34)
11. Search Console/Bing: who owns the properties, and can you add the TXT verification records? (34, 35)
12. Are you willing to enforce CSP on `/` last, after the tool pages, accepting 4 to 5 weeks end to end? (01)
13. Mapbox Product Terms revision of 2026-07-21: please read the caching clause before we enable tile caching. (23)


---------------------------------------------------------------------------------------------------

## Verification (adversarial verifier, 2026-09-30, read-only; scratch scripts in `tmp-verify-infra-netlify/`)

Method: re-opened the cited lines in DEPLOY_DIR / `bundle.pretty.js` / `lh_mobile.json` / `lh_desktop.json`, re-ran live curl probes (headers, redirects, case variants, Mapbox referrer matrix, DNS-over-HTTPS, RDAP, TLS, hstspreload, MDN Observatory rescan), recomputed SRI hashes and inline-block hashes for all 26 live pages, and checked the Netlify / Mapbox / Netlify-forum documentation the report leans on. Result: 39 findings reviewed; 28 CONFIRMED, 9 CORRECTED (evidence mostly right, but the claim or plan needs the fix listed), 0 REFUTED, 2 UNVERIFIABLE from outside. Evidence quality is high: every line number I sampled (about 60) was exact.

Re-verified independently (no change needed): `netlify.toml:5-19,80-85`; live headers on `/embed.html`, `/embed`, `/`, `/dashboard(.html)`; `index.html` block boundaries 255-277, 294-714, style 60-253, noscript 751, handlers `:57` and `report.html:67` (exactly 2, none inside JS strings, none in the bundle); Lighthouse two `Document /` requests (t=1 ms and t=909 ms mobile, 1 ms and 476 ms desktop), `redirects` wastedMs 9066.6, `csp-xss` High, `inspector-issues` RUM host; Observatory B/75, 11/12 (rescanned live); Mapbox matrix (no Referer, evil, netlify.app: 403; apex and www: 200; `/styles/v1` 200 without Referer); 11 identical token literals (2 in bundle, 9 pages); SRI hashes for mapbox-gl.js/css and peerjs 1.5.4 byte-exact, ACAO `*`; npm versions (3.32.0, 1.5.5, 7.4.1, 1.3.0, 6.0.4, 1.6.2); `/diagnostics` and `/unit-rendering-reference(.html)` 200, `/diagnostics.html` 404; `/.well-known/security.txt` 404; `OPTIONS /` and `GET /./` 404; netlify.app host 200 with full header set; case-insensitive assets and 301 for wrong-case pages; DNS (NS/A, no AAAA/CAA/MX/TXT/DNSKEY, `_dmarc` NXDOMAIN), RDAP (Name.com, 2026-06-13 to 2027-06-13, transfer-prohibited, unsigned), TLS (LE YE2, 2026-08-12 to 2026-11-10), hstspreload `unknown` and preloadable; SRC == DEPLOY (119 files, identical md5 multiset); corrupt `day1.png == day3.png` (md5 3f6646c9..., IHDR RGB, inflated 3,687,120 = RGBA); inline script/style sha256 identical live vs deployed on all 26 live pages (54 blocks, 0 mismatches; note 11 deployed pages use CRLF line endings, which is why the generator's `norm()` is required, since the browser hashes LF-normalised text); Watch Together lines `:19,159,172,205-209,224,256,326`; PeerJS ICE defaults and shared TURN credential; Mapbox `mapbox.eventData` 24 h UUID (`bundle.pretty.js:54237-54290`); `privacy.html:21,28-30,37-38,47`, `terms.html:27,42`; `user-guide.pdf` attachment and `site-nav.js:196`; Netlify docs for rate limits (2 code rules Free/Personal, 5 Pro, windowSize max 180), credits (300 Free hard limit, 15 per production deploy, 20 credits/GB, 2 per 10k requests), redirect docs (no mid-path `*`, files win unless force, host rules need the domain on the site), dot-folder stripping on manual deploys (forum 37728/44897), Pretty URLs (forum 102840: both forms keep working), CSP spec (XFO MUST be ignored when frame-ancestors is enforced), Mapbox attribution applies to mini maps, Mapbox Product Terms 30-day on-device cache (seen in the 2025-04-14 PDF; the Oct 2025 and Jul 2026 revisions were not readable by me).

### Verdict table

| ID | Verdict | Note |
|---|---|---|
| 01 | CORRECTED | Evidence and root cause confirmed. Three plan corrections: (a) the Stage 0 gate "reports arriving" is unreachable while deploys are manual: `/api/csp-report` returns 404 today (GET verified) and B.1 line 813 plus A.2 `Reporting-Endpoints` already point at it, so violation POSTs would hit the branded 404 and add to the 404 stream finding 14 wants to shrink; use the hosted collector (option B) or ship the one function with the Netlify CLI (docs: CLI/API deploys support Functions) and omit `report-uri` until it exists. (b) The Deploy-Preview crawl gate "violations: 0" cannot pass as written: Netlify injects `/.netlify/scripts/cdp` and the Netlify Drawer frames `https://app.netlify.com/`, which `frame-src`/`default-src` block (forum + GitHub reports); disable the Drawer or add a `[context.deploy-preview]` policy. (c) The `embed` class `connect-src 'self'` omits the RUM host (see MISSED-4). |
| 02 | CORRECTED | Live headers exactly as claimed, fix valid and cheap. Severity "high" is not supported: `/embed.html` carries `frame-ancestors *` and the spec says XFO MUST be ignored then (the report itself says it "likely works today"); the only documented embed URL is a code comment (`embed.html:38-39`), it is not linked from `site-nav.js`, and only `terms.html:27` mentions "its widget". Real defects: the `/embed` clean URL is framing-blocked and the headers contradict. Rate medium/low hygiene; keep in Phase 0 because it is S. |
| 03 | CONFIRMED | Counts reproduced: 27 executable inline scripts + 25 styles (54 blocks incl. unit-rendering-reference over 26 pages), 2 handlers, 54 sinks incl. diagnostics = 50 (my count of single-line interpolating sinks is 19 vs the report's 24, which includes multi-line templates; not material). Bundle has zero `style="` strings and no dynamic `<style>`/`<script>` creation. |
| 04 | CONFIRMED | `getUserMedia`, `navigator.geolocation`, `DeviceOrientationEvent` appear only in `ar.html:160,172,184-192`; all bundle hits sit inside the never-instantiated GeolocateControl class (`:94853-95434`). No `getDisplayMedia`, MIDI, payment or wake-lock use anywhere. |
| 05 | CONFIRMED | No `window.open` in pages or bundle; no `target=_blank` without `noopener`. |
| 06 | CONFIRMED | Sink counts approximately reproduced; feasibility of enforcing Trusted Types with React/Mapbox is honestly hedged by the specialist and stays unverifiable without a build. |
| 07 | CONFIRMED | XSS path real (`:172` unescaped `${s.note}`/`${s.tick}`; `:326` only `Array.isArray`; stored via `:161`). The guest caption uses `textContent` (`:192`), so a malicious host cannot XSS guests; import/localStorage is the only vector. Severity is arguably low today (needs the victim to import an attacker file, no same-origin session or API to steal); medium is defensible because the payload persists. |
| 08 | CONFIRMED | 9 pages, hashes byte-exact, versions current. Mapbox-GL self-hosting licence not checked by me (the same file is already inlined in the bundle). |
| 09 | CONFIRMED | 404 today; dot-folder stripping confirmed by forum; the `/well-known/` rewrite is the forum-recommended workaround (they use `200!`; the report's non-forced form also works because no file shadows the path). |
| 10 | CORRECTED | Dependency over-stated: "Depends on 28 (Git)" is not needed; docs list manual CLI/API deploys as a Functions path, so the collector (and 31/32) can ship in Phase 1 from a laptop with `netlify deploy`. See 01(a) for the Stage-0 reporting gap. |
| 11 | CONFIRMED | All evidence real (rewritten hrefs, `.html` canonical/og:url/sitemap/JSON-LD, 21 `<loc>`, no `<lastmod>`, `/x/` 301, `/index` 301, header rules matching the path as requested). Extra checks: the bundle contains no `.html` hrefs, so the edit is confined to 27 pages + `site-nav.js`; Netlify redirects keep the query string (tested `/index/?tick=5&vignette=V-018`), so `/index.html?tick=` deep links survive the forced 301. Severity is closer to medium (canonical, og:url, sitemap and JSON-LD agree with each other; only Netlify's link rewriting disagrees). Whether `pretty_urls=false` is honoured on manual deploys stays unverified (the specialist says so). |
| 12 | CONFIRMED | Only `diagnostics.html` references itself; `gtbg_session` is never written by the app or pages. `apple-touch-icon-precomposed.png` is byte-identical (md5 f8a85f27...). Caveat (UNVERIFIED): older iOS Safari probes the precomposed name first, so deleting may add 404 probes; a 301 to `/apple-touch-icon.png` is cheaper than deleting if that shows up in the 404 report. |
| 13 | CORRECTED | (a) "About 76 conditional GETs per revisit (46 + 30)" is an artefact of the double load (C6): both Lighthouse logs list 76 `/data/` requests but only 37 unique URLs, each requested exactly twice (`oob/commander_successions.json` four times = twice per load). One load = 39 requests; only 71 files exist under `data/` (57 root + 14 oob, 824,704 B; the 37 boot files transfer 138,605 B br). The benefit of 13 shrinks once 21 lands; fix the numbers here and in 22 ("about 76 JSON files" should read 37 boot / 71 total). (b) `Netlify-CDN-Cache-Control: ... durable` is a no-op for static files: docs say `durable` is for serverless functions only and static assets are already fresh for up to a year at the edge, invalidated on deploy (the report's own `Cache-Status: hit; ttl=31531328` shows this). Drop it. Rest verified (`site-nav.js` revalidates every load, `/data` max-age=3600, icons immutable on unversioned names). |
| 14 | CONFIRMED | Netlify docs: existing files win over non-forced redirects, so none of the 19 rules can fire on real files (the toml comment at `:104-106` says the same); `/*.sql` and `/*.bak` are invalid per docs. |
| 15 | CONFIRMED | netlify.app returns 200 with full headers, robots identical. The host-based rule form matches the docs example; deploy-preview hosts are different labels. |
| 16 | CONFIRMED | Header at `netlify.toml:200-204`, link `site-nav.js:196`, app link with `download` at `bundle.pretty.js:113115-113117`. |
| 17 | CONFIRMED | `/404` and `/404.html` 200; OPTIONS 404. |
| 18 | CONFIRMED | Matrix re-run with cache-busters (403/403/403/200/200; style endpoint 200 without Referer). Google key restriction and the Mapbox URL list remain unverifiable from outside, as the report says. |
| 19 | CONFIRMED | Lines `:110610,110660-110665,100461-100466` exact; nps.gov sends no XFO/frame-ancestors (HEAD verified). Google API probes not re-run by me (UNVERIFIED). |
| 20 | CONFIRMED | `attributionControl: !1` at `:102988` and `:110777`; Mapbox's attribution guide says it applies to all map sizes including mini maps. |
| 21 | CONFIRMED | Root cause and lines exact (`index.html:263-268`, `sw.js:17,30`). Nuances: the two-`sku` proof is in the mobile run only (2 skus, 2 blob workers, 2 style fetches); the desktop run shows one sku (first load aborted before tiles) though there are two Documents, so "two billable sessions" is proven on mobile and inferred elsewhere. Of the three "missing" chunks only `BookmarkPanel` and `HelpModal` are real (`bundle.pretty.js:112469-112470`); `InterpolationWorker-ufiwa2-e.js` is referenced nowhere (bundle, HTML), an orphan (harmless to precache, also worth deleting). The proposed `sw.js`/registration code is sound (`waitUntil` inside a `respondWith` chain is legal). |
| 22 | CORRECTED | (a) Numbers as in 13(a): 71 data files, 37 boot. (b) Internal contradiction, see MISSED-5: precaching `index.html` makes `/` cache-first via the Workbox precache route, so the "NetworkFirst + navigation preload for `/`" row cannot apply to `/`, and fresh deploys will not show until the toast is accepted, contrary to the intent recorded at `netlify.toml:65-71`. (c) Test the interaction with finding 11's forced `/index.html -> /` 301 (Workbox fetches `/index.html?__WB_REVISION__=...`; current Workbox copies redirected responses, but verify in Safari). (d) "preload/onload causes the P5 warnings" is speculation: `errors-in-console` has score 1 and zero items in both Lighthouse runs. Severity high is fair only for the PWA-grade goal; after 21 it is medium. |
| 23 | CONFIRMED | 30-day / same-device / populated-from-API clause found in the Product Terms (2025-04-14 PDF); later revisions unread by me. |
| 24 | CORRECTED | Icon metrics: the opaque area spans 11..181 of 192 px (89 %) and 30..482 of 512, not "about 95 %"; the farthest gold pixel is 1.40x the maskable safe radius, so the conclusion (needs separate maskable art) stands. `<meta name=theme-color>` already exists on 26 of 27 pages; only `<link rel=manifest>` and `apple-touch-icon` are index-only. Other facts verified (alpha-0 corners, 4 colours, `orientation: landscape`, `any maskable`). |
| 25 | CONFIRMED | Reproduced to the byte; 21 `og:image`, 11 `twitter:image`, 11 `twitter:card`, all 21 use `day3.png`. |
| 26 | CORRECTED | Core confirmed (no parser for `t,u,z,ll,tick,vignette,unit`; `index.html` has no `location`/`URLSearchParams` besides the reload). Corrections: (a) `ancestor` is not "existing": it is read only inside the Follow-Your-Ancestor panel's mount effect (`bundle.pretty.js:101018-101021`), and that panel renders only when `Jt`/`Yn` (both `useState(!1)`, `:102942`, `:112945/:112952`) are true, so links copied by `kt` (`:101117`) also land on the default state. (b) Emitters are understated: also `education.html:81`, `historian.html:110`, `search.html:114,127` (`/index.html?unit=...`), `turning-points.html:118` (`/?tick=`), i.e. every "See it on the map" link on the site. |
| 27 | CONFIRMED | Lines exact; 10 hints counted. The cause of P5 remains a hypothesis (see 22d). |
| 28 | CONFIRMED | SRC == DEPLOY verified; docs support Git-only previews/contexts. Note Functions do not require Git (see 10). The real bottleneck is source recovery (N1), which this XL item inherits. |
| 29 | CORRECTED | `@netlify/plugin-lighthouse` by default runs AFTER deploy on live content (non-gating). `fail_deploy_on_score_thresholds="true"` switches to `onPostBuild` and statically serves the build folder on localhost; with the URL-restricted production token (finding 18: localhost 403) tiles fail, `errors-in-console` trips and perf is unrepresentative. Gate with treosh/LHCI against the Deploy Preview using the preview token, or build that context with the dev token. Config keys otherwise match the plugin README. |
| 30 | CONFIRMED | Credit figures match the docs. Plan tier remains unknown. |
| 31 | CONFIRMED | Rate-limit numbers and config shape match the docs; note redirects in `netlify.toml` can also carry `[redirects.rate_limit]`, a third way around the 2-rule cap. Function timeout and streaming limits unverified (report says so). |
| 32 | UNVERIFIABLE | Traffic shares come from the BRIEF/PDFs. RUM facts verified: `window===window.top` guard, no cookie/storage, payload = protocol/hostname/pathname/platform/screen (no query string). |
| 33 | CONFIRMED | Cert, RDAP and DNS dates verified. |
| 34 | CORRECTED | DNS facts verified. CAA: Netlify's HTTPS docs recommend binding to Netlify's LE account (`0 issue "letsencrypt.org;accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/54403714"`); plain `letsencrypt.org` lets any Let's Encrypt customer issue. Use the bound form (also for `issuewild`) and trigger a renewal from the Netlify UI afterwards, since CAA mistakes block renewals (forum threads). |
| 35 | CONFIRMED | 21 `<loc>`, 21 `changefreq`, 21 `priority`, 0 `lastmod`, robots 4 lines. |
| 36 | CONFIRMED | Every cited privacy.html line and code line checked; no iframe in any static page. |
| 37 | CONFIRMED | `terms.html:27,42`. |
| 38 | CONFIRMED | Facts confirmed; the ePrivacy conclusion is legal and stays UNVERIFIABLE (specialist says so). |
| 39 | UNVERIFIABLE | Account posture cannot be observed externally; `terms.html:42` / `privacy.html:47` contact facts confirmed. |

### MISSED issues (in infra-netlify scope)

1. MISSED-1 (medium) Deploy Previews inject Netlify's own scripts/frames: `/.netlify/scripts/cdp` (same-origin) and the Drawer frames `https://app.netlify.com/`. Every acceptance gate that crawls a Deploy Preview expecting 0 CSP violations (appendix C.4, D.3, finding 29) will fail or need filtering. Fix: turn the Drawer off in Project configuration, or add to the deploy-preview context only `frame-src https://app.netlify.com` (and `https://netlify-cdp-loader.netlify.app` for `script-src`, per forum), and have the crawl ignore those two hosts.
2. MISSED-2 (medium) Stage 0 / Phase 0 points `report-uri` and `Reporting-Endpoints` at `/api/csp-report`, which is a 404 while deploys are manual (verified). No report ever arrives, the "reports arriving" gate is unreachable, and each violation POST adds a 404 to Netlify Analytics. Fix: ship the collector with `netlify deploy` (Functions are supported for CLI deploys) or use the hosted collector first; omit both headers until the endpoint answers 204.
3. MISSED-3 (low) B.1 interim keeps the `/*` block of `netlify.toml` (nosniff, Referrer-Policy, HSTS, X-Permitted-Cross-Domain-Policies) while `_headers` `/*` repeats three of the same names, violating the report's own invariant (one rule per header name; duplicate HSTS/Referrer-Policy values are harmless to browsers but muddy Observatory/securityheaders output). Fix: state explicitly that the whole `/*` block moves out of the toml.
4. MISSED-4 (low) The `embed` class policy (`connect-src 'self'`, generator `csp()` embed branch and C.1) omits the RUM host; when `/embed` is opened as a top-level page (allowed, not framed) the RUM beacon (`window===window.top`) is blocked, logging a console error and a CSP report. Fix: add `https://ingesteer.services-prod.nsvcs.net` to the embed `connect-src` or accept and filter.
5. MISSED-5 (medium) The service-worker design conflicts with the owner's fresh-deploy intent: E.1/E.5 precache `index.html`, so `/` is served cache-first from the precache route and only tool pages are NetworkFirst; after a deploy `/` stays on the old shell until the user accepts the toast (or all tabs close), while `netlify.toml:65-71` documents the opposite requirement. Fix: exclude `index.html` from `globPatterns` and route `/` NetworkFirst with navigation preload (offline fallback = precached `offline.html`), or explicitly adopt app-shell semantics and add a max-staleness rule.

Effort/realism notes: 21, 04, 05, 09, 12, 15, 16 (all S) are realistic. 01 (L) and 22 (L) are realistic only if MISSED-1/2/5 are folded in; 28 (XL) is bounded by source recovery, not by Netlify setup; 10/31/32 can start earlier than the phase plan implies because Functions deploy via CLI.
