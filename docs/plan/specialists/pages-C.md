# pages-C — Deep code audit and fix specs for 14 feature/utility pages

Specialist: pages-C. Scope: `historian.html` (UI/UX only), `immersive.html`, `ar.html`, `watch-together.html`, `turning-points.html`, `find-ancestor.html`, `cinematic-export.html`, `living-ledger.html`, `privacy.html`, `terms.html`, `404.html`, `embed.html`, `diagnostics.html`, `unit-rendering-reference.html`.
Tree audited: DEPLOY_DIR `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy` (byte-identical to SRC_DIR). Line numbers are for those files unless marked `bundle.pretty.js:N` (plan-work/bundle.pretty.js) or `netlify.toml:N`.
Rules honoured: read-only; no builds; no browser tools; only curl/WebFetch/WebSearch plus node/python scripts under `plan-work/tmp-pages-C/`.

Effort key: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d. Severity: critical / high / medium / low.

---

## 0. Executive summary

These 14 pages are small, readable, single-file static pages with inline CSS and JS. They are not "broken" in the way the map shell is, but almost none is at A+ because of five recurring root causes:

1. **Features that promise more than they do** (Cinematic Export "narrated flyover", Living Ledger "minute by minute", Immersive "more units in contact means more and louder cannon", Historian "everything traces back to a source link", Find Your Ancestor searches commanders not ancestors, Watch Together "sees the same tick move in real time").
2. **Happy-path-only code**: no `res.ok`/catch on any of the 7 data-driven pages except embed (infinite "Loading..."), unguarded `localStorage`, unhandled `MediaRecorder` failures, camera stream and GPS watch never released, iOS permission chains that lose the user gesture.
3. **Data-shape drift that produces visibly wrong output**: all 137 Historian chronology answers render the word "undefined" (field is `event`, code reads `description`/`title`); Living Ledger starts at "4 casualties" and overshoots the dataset by 838; Turning Points ticks land on unrelated chronology rows.
4. **Site-wide plumbing that the pages inherit**: the app ignores `?tick=`/`?vignette=`/`?unit=` deep links (only `?ancestor=` is parsed), every `og:image` is a corrupt near-black placeholder, Mapbox GL is a render-blocking CDN script on 9 pages, the JS-injected nav shifts every page ~55 px, and there is no shared page shell (landmarks, skip link, reduced-motion, 44 px targets, 16 px inputs).
5. **Trust/legal gaps**: privacy page omits Watch Together (public PeerJS broker + Google STUN + PeerJS TURN), Mapbox telemetry, AR sensors; Terms invite embedding a widget that has no documentation and is served with conflicting frame headers; stored-XSS path through imported tour files.

Top 12 by impact (all detailed below): pages-C-01 dead deep links, pages-C-02 broken OG/manifest images, pages-C-16 chronology "undefined", pages-C-34 iOS compass permission chain, pages-C-35 heading/declination math, pages-C-46 XSS via tour import, pages-C-47 replace public PeerJS broker, pages-C-68 Safari recording failure, pages-C-69 attribution/captions not in export, pages-C-75 Living Ledger start value and overshoot, pages-C-81 privacy policy gaps, pages-C-87 embed header conflict.

### 0.1 What I verified (and how) vs. what is inference

| Claim | How verified | Confidence |
|---|---|---|
| App parses only `?ancestor=`; `?tick`, `?vignette`, `?unit`, `?t`, `?u`, `?ll`, `?z` are never read | grep of all 5 built assets: only `location.search).get("ancestor")` at `bundle.pretty.js:101019`; share-link writer at `bundle.pretty.js:97823-97832` has no reader; Mapbox's own hash handler is map-position only (`:88785-88870`) | High (static). Confirm in a browser |
| `screenshots/day1.png` and `day3.png` are byte-identical and malformed | `md5sum` (3f6646c9...); Python: IHDR says 8-bit colour type 2 (RGB) but inflated IDAT = 3,687,120 B = 720 x (1280x4+1) i.e. RGBA rows; PIL "unrecognized data stream"; re-wrapped as RGBA it is a near-black gradient | High |
| Bundled mapbox-gl = 3.24.1 = CDN pin on sub-pages | `bundle.pretty.js:53873` `var R = "3.24.1"`; `grep mapbox-gl-js/v` on 9 pages; CDN file 481,197 B brotli | High: no version skew today, only a drift risk |
| `/embed.html` live headers | `curl -D-`: `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors *` + still `Content-Security-Policy-Report-Only: default-src 'self'...`; `netlify.toml:83-85` tried `""` overrides | High |
| `/diagnostics.html` 404 (forced), `/unit-rendering-reference.html` 200 | curl | High |
| `/historian` and `/historian.html` both 200 with different Cache-Control | curl (`public,max-age=0,must-revalidate` vs `no-cache,must-revalidate`) | High |
| PeerJS 1.5.4 defaults: signalling `0.peerjs.com`, Google STUN, PeerJS-operated TURN with shared public credentials | downloaded `peerjs.min.js` (92,865 B; 25,491 B gzip): contains `stun:stun.l.google.com:19302`, `turn:eu-0.turn.peerjs.com:3478`, `turn:us-0.turn.peerjs.com:3478`, `credential:"peerjsp"`; broker returned HTTP 200 (EU) | High |
| Public PeerJS cloud has no SLA and is donation-funded | WebSearch (peerjs.com docs, GitHub issues on past outages 2020-2022) | Medium (secondary sources) |
| Safari MediaRecorder wrote only MP4 until Safari 18.4, which added WebM | WebSearch (MDN/compat write-ups) | Medium-high; test on real devices |
| iOS `DeviceOrientationEvent.requestPermission()` requires a user gesture (NotAllowedError otherwise) | WebSearch (Apple forums, multiple dev write-ups) | High that it needs a gesture; **that the await chain loses it is inference, verify on an iPhone** |
| Chrome >= 50 `deviceorientation` alpha is relative; absolute needs `deviceorientationabsolute` | WebSearch (developer.chrome.com "Device Orientation Changes Are Coming to Chrome 50") | High |
| Safari 16.4+ has `navigator.audioSession`; default Web Audio is muted by the iOS ring/silent switch | WebSearch | Medium-high |
| Mapbox requires logo + text attribution on maps and exported images/snapshots | docs.mapbox.com/help/dive-deeper/attribution (via WebSearch); video recordings not explicitly addressed | Medium: treat as required, confirm with Mapbox |
| NPS CWSS: 6.3 M index records from National Archives muster-roll index cards; NPS banner "This database is no longer maintained and updated"; no documented API/bulk download; form method/params not visible in my fetch | WebFetch of nps.gov pages + WebSearch; `https://www.nps.gov/civilwar/soldiers-and-sailors-database.htm` returned HTTP 200 | Medium: absence of an API is "not documented", not proven |
| Netlify Functions have no WebSocket support; function-level `rateLimit` config exists; Blobs is a zero-config KV | WebSearch (docs.netlify.com) | Medium-high; check plan limits |
| Netlify docs do not document removing an inherited header for one path | WebSearch of docs; empirical result above | Medium |
| WMM declination at Gettysburg is roughly -10 to -11 degrees (west) | Inference from NYC 2026 ~ -12.5 degrees (search result); exact value must come from NOAA/WMM | Low-medium: compute exactly at build time |

Everything labelled "verify on device" (iOS AR, Safari recording, VoiceOver) was **not** executed by me.

### 0.2 Findings index

| ID | Page | Sev | Effort | One-line |
|---|---|---|---|---|
| 01 | shared | high | M | `?tick=`/`?vignette=`/`?unit=` deep links are dead site-wide |
| 02 | shared | high | S | every og:image / manifest screenshot is a corrupt near-black placeholder |
| 03 | shared | high | M | Mapbox GL 481 KB render-blocking CDN script + token copy on 9 pages |
| 04 | shared | high | M | no fetch/storage error handling: infinite "Loading..." |
| 05 | shared | medium | S | 13-15 px inputs trigger iOS zoom |
| 06 | shared | high | S | nav injected after paint: ~55 px CLS on every sub-page; body fade delays paint |
| 07 | shared | medium | S | missing landmarks/skip link/reduced-motion/color-scheme |
| 08 | shared | medium | S | head-meta parity (twitter, og:alt, JSON-LD) |
| 09 | shared | medium | M | shared page CSS, type scale, 44 px targets |
| 10 | shared | medium | S | "Back to the map" can go back to the wrong page |
| 11 | shared | medium | M | CSP enforcement readiness for these pages |
| 12 | shared | low | S | copy voice pass (" -- ", dev-log text) |
| 13 | shared | medium | S | shared nav contrast and menu semantics |
| 14-23 | historian | | | see section 2 |
| 24-33 | immersive | | | see section 3 |
| 34-45 | ar | | | see section 4 |
| 46-57 | watch-together | | | see section 5 |
| 58-62 | turning-points | | | see section 6 |
| 63-67 | find-ancestor | | | see section 7 |
| 68-74 | cinematic-export | | | see section 8 |
| 75-80 | living-ledger | | | see section 9 |
| 81-82 | privacy | | | see section 10 |
| 83-84 | terms | | | see section 11 |
| 85-86 | 404 | | | see section 12 |
| 87-89 | embed | | | see section 13 |
| 90-91 | diagnostics / unit-rendering-reference | | | see section 14 |
| 92 | all | high | L | automated regression suite (Playwright + axe + Lighthouse CI) |

---

## 1. Cross-cutting findings (inherited by all 14 pages)

### pages-C-01 — `?tick=`, `?vignette=`, `?unit=` deep links are dead site-wide (app reads only `?ancestor=`)
- **Severity** high | **Effort** M (app patch) + S (link normalisation) | **Moves** Core function, UX, SEO (shareability) | **Depends** app deep-link router (owner: app-bugs / bundle-anatomy agents) | **audit_refs** [] (new; related H8, T1)
- **Evidence**
  - App reads exactly one query param: `bundle.pretty.js:101019` `new URLSearchParams(window.location.search).get("ancestor")`. No other reader exists in any built asset (`grep` over `assets/*.js` for `location.search`, `get("t"|"u"|"ll"|"z"|"tick"|"vignette"|"unit")` returned only `ancestor`).
  - The app *writes* share links `?t=&u=&z=&ll=` (`bundle.pretty.js:97823-97832`, `$k()`), which nothing reads back, so bookmark "copy link" also produces dead links.
  - Static pages emit links the app ignores: `historian.html:110` (`/?tick=..&vignette=..`), `turning-points.html:118` (`/?tick=N`), `embed.html:60` (`index.html?tick=..&vignette=..`), plus `regiment.html:247` (`/?unit=..&tick=..`), `documentary.html:92`, `education.html:81`, `search.html:127`.
- **Root cause** the deep-link contract was defined in the static pages but never implemented in the compiled bundle; there is no source project to edit (N1).
- **Fix**
  1. Define one canonical schema and document it: `/?t=<1-675>&v=<V-001..V-024>&u=<unit_id>&ll=<lat,lng>&z=<zoom>&ancestor=<unit_id>`; accept aliases `tick`, `vignette`, `unit` on read; emit only canonical on write.
  2. In the app (source or bundle patch): on store init parse once, validate (`Number.isInteger`, range, whitelist against loaded vignette/unit ids), call the store's `setTick`/`selectVignette`/`selectUnit`/`flyTo`, pause playback, open the vignette panel, then `history.replaceState` to strip consumed params. Skip the 15 s "Fast-forwarding" splash and layout chooser when a deep link is present (H3 interplay).
  3. Interim (no source): add `deeplink.js` loaded by index.html that waits for the timeline `input[type=range]`, sets value via the native setter and dispatches `input`; this is fragile, so ship it only until the router lands. Until either exists, change the CTA text on my pages from "See this moment on the map" to "Open the map" so the promise is not broken.
  4. Regenerate all static links from a single JS helper `gtbgLink({t,v,u})` so they cannot drift.
- **Acceptance test** Playwright: for each of 24 vignettes open `/?v=V-0NN` and `/?tick=<trigger_tick>&vignette=V-0NN`; assert timeline value == tick, vignette panel title == expected, URL cleaned; `/?ancestor=U-20ME` still works; `/?t=9999` and `/?v=<script>` are ignored without console errors. Crawl all static pages and assert every `href="/?..."` round-trips.

### pages-C-02 — Every `og:image` and both manifest screenshots are one corrupt near-black placeholder
- **Severity** high | **Effort** S | **Moves** SEO/social sharing (T1), installability, Fit and finish | **Depends** none | **audit_refs** [T1]
- **Evidence** `screenshots/day1.png` and `screenshots/day3.png` have identical md5 `3f6646c99f3416a1aa35fea67bed21c5`, 17,585 B, 1280x720. IHDR = 8-bit colour type 2 (RGB) but the inflated data is 3,687,120 B = 720 rows x 5,121 B = RGBA rows, so strict decoders (PIL) reject it and libpng-based browsers render a skewed near-black frame. Re-wrapped as RGBA the picture is a dark navy gradient (sampled pixels ~ rgb(13,10,24)). Referenced by `og:image` at line 14 of `historian.html`, `immersive.html`, `ar.html`, `watch-together.html`, `turning-points.html`, `find-ancestor.html`, `cinematic-export.html`, `living-ledger.html`, `index.html`, and by `manifest.json:27,33` (labelled "Day 1"/"Day 3"). The live image is served (200, 17,585 B).
- **Root cause** a placeholder was generated with the wrong PNG colour type and never replaced by real screenshots.
- **Fix** Capture real art (Playwright screenshot of the map at Day 1 08:00 McPherson's Ridge and Day 3 Pickett's Charge, plus one 1200x630 branded card per feature: title, one-line promise, map crop). Save as optimised PNG/JPEG or AVIF/JPEG (< 200 KB), 1200x630 for OG and 1280x720 + 750x1334 for manifest (`form_factor: "wide"|"narrow"`). Add per-page `og:image`, `og:image:width/height`, `og:image:alt`, `twitter:card=summary_large_image`, `twitter:image`. Use distinct filenames per page group so caches update.
- **Acceptance test** `identify`/PIL decodes every image; md5s are unique per page group; Facebook Sharing Debugger, LinkedIn Post Inspector, Slack/iMessage unfurl and Twitter card validator show the image; Lighthouse "installable" screenshots audit passes.

### pages-C-03 — Mapbox GL 3.24.1 is a render-blocking cross-origin script on 9 pages; token and version pinned in 9 places
- **Severity** high | **Effort** M | **Moves** Performance (FCP/LCP, Lighthouse), Security (X1, X3), Maintainability | **Depends** pages-C-11 for CSP | **audit_refs** [P4, X1, X3]
- **Evidence** `immersive.html:15-16`, `watch-together.html:15-16`, `cinematic-export.html:15-16`, `unit-rendering-reference.html:9-10` (and camera, compare, ground-remembers, sandbox, viewshed) load `mapbox-gl.css` and a synchronous `<script src=".../v3.24.1/mapbox-gl.js">` in `<head>`: 481,197 B brotli must download, parse and execute before the body renders. Public token `pk.eyJ1IjoibWxlZ2VyZTk3...` is pasted in each inline script (`immersive.html:68`, `watch-together.html:109`, `cinematic-export.html:85`, `unit-rendering-reference.html:56`). Bundle version is 3.24.1 (`bundle.pretty.js:53873`) so there is no skew today.
- **Root cause** each page was authored as an independent file; there is no shared module or config.
- **Fix**
  1. Quick: `<link rel="preconnect" href="https://api.mapbox.com" crossorigin>`, load `mapbox-gl.js` with `defer` (script order preserved), keep inline page script in `DOMContentLoaded`, render the header/explanatory copy and a skeleton `#map` (aspect-ratio box) immediately so FCP is not gated on Mapbox.
  2. Single source of truth: `/js/gtbg-config.js` (`MAPBOX_TOKEN`, `MAPBOX_VERSION`, tick constants, `PLACEMENT_FILES`, data base path) imported by all pages; one edit rotates the token.
  3. Better: publish the same npm build the app bundles as `/vendor/mapbox-gl-3.24.1.js|css` with SRI and `immutable` caching (removes the api.mapbox.com script origin from CSP). Check Mapbox licence terms for self-hosting the npm build before doing this.
  4. Restrict the token by URL in the Mapbox dashboard (X1) and create a separate, tightly-scoped token for sub-pages.
  5. Do not load Mapbox at all on pages that can render without it on first paint (Find Ancestor, Historian, Turning Points do not).
- **Acceptance test** Lighthouse mobile (Slow 4G, 4x CPU) on immersive/watch-together/cinematic-export: FCP <= 1.8 s, LCP <= 2.5 s, no "render-blocking resources" from api.mapbox.com; changing config token updates all pages; view-source shows no `pk.` outside config.

### pages-C-04 — No fetch or storage error handling: pages hang on "Loading..." or half-initialise
- **Severity** high | **Effort** M | **Moves** Reliability, Function | **Depends** none | **audit_refs** []
- **Evidence** `Promise.all(... fetch(...).then(r => r.json()))` with no `res.ok`, no `.catch`, no timeout: `historian.html:75-80`, `immersive.html:76`, `watch-together.html:117`, `cinematic-export.html:93-98`, `living-ledger.html:92-97`, `find-ancestor.html:75`, `ar.html:114` (inside a click handler, so an offline user gets an unhandled rejection and no UI). Any failed fetch leaves `#loading` visible forever. `watch-together.html:159` `JSON.parse(localStorage.getItem(...))` is unguarded: throws in Safari private mode / blocked storage / corrupt value, killing everything after line 159 (map renders, but Add stop/Play/Host/Join are dead). Only `embed.html:40-68` has try/catch.
- **Root cause** happy-path prototypes; no shared loader.
- **Fix** shared `gtbg-data.js`: `loadJson(path, {timeout:15000, retries:2})` using `AbortController`, `res.ok` check, `Promise.allSettled` for multi-file loads, structured error `{path,status}`; `safeStorage.get/set` with try/catch and in-memory fallback; a reusable `<div role="alert">` error card with a Retry button and a "still stuck? try the User Guide / contact" line; `<noscript>` message. Log with `console.error` once, never silently.
- **Acceptance test** Playwright `page.route('**/data/**', r => r.abort())` on each page: visible error + Retry, no infinite spinner, no uncaught exceptions; with the route restored, Retry succeeds. Chromium with `--disable-local-storage`-style stub: watch-together still works.

### pages-C-05 — Form controls under 16 px trigger iOS Safari focus-zoom
- **Severity** medium | **Effort** S | **Moves** Mobile UX (S4), Fit and finish | **audit_refs** [S4, A4]
- **Evidence** `historian.html:36` `#ask{font-size:15px}`; `find-ancestor.html:28-29` `#surname` 15 px, `#state` 14 px; `cinematic-export.html:35` inputs/selects inherit 13.33 px; `watch-together.html:40,54` 13 px and 14 px inputs; `living-ledger.html:76` select 13 px.
- **Root cause** iOS zooms the viewport when a focused input's computed font-size is < 16 px.
- **Fix** `input,select,textarea{font-size:16px}` (or `max(16px,1rem)`) in the shared CSS; do not use `maximum-scale=1` (fails WCAG 1.4.4).
- **Acceptance test** iOS Safari real device: focusing each control does not change `visualViewport.scale`; Playwright WebKit check `getComputedStyle(el).fontSize >= 16`.

### pages-C-06 — Nav/footer injected after first paint shifts every sub-page ~55 px; body fade-in delays paint
- **Severity** high | **Effort** S | **Moves** Performance (CLS, FCP, LCP), Fit and finish | **Depends** shared site-nav owner (pages-A/B) | **audit_refs** [P1, P4]
- **Evidence** every page has `<div id="gtbg-nav-mount"></div>` (0 px) that `site-nav.js:164` replaces via `outerHTML` at `DOMContentLoaded` with a sticky ~55 px `<nav>` (estimate: 10+10 px padding + ~34 px controls + 1 px border; measure), pushing the whole header/content down after the first paint (layout shift on essentially the full viewport). `site-nav.css:12` `body{animation:gtbg-page-in 340ms ease both}` starts at `opacity:0`; Chrome excludes opacity-0 elements from LCP candidates, so LCP/FCP-visible content is delayed >= 340 ms on every sub-page. `site-nav.css:41` also runs an infinite glow animation on the Historian pin (reduced-motion guard exists only there, `:53`).
- **Root cause** progressive-enhancement nav with no reserved space; decorative fade applied to `<body>`.
- **Fix** (a) `#gtbg-nav-mount{min-height:55px}` / `#gtbg-footer-mount{min-height:120px}` immediately (S); (b) preferred: inline the nav/footer HTML into each page at authoring time with a one-off script (no build system needed), keeping site-nav.js only for menu behaviour; (c) remove the body opacity fade or restrict to `@media (prefers-reduced-motion: no-preference)` with `transform`-only, 120 ms; (d) load `site-nav.js` with `defer`, `site-nav.css` with `media` preload pattern only after inlining critical nav CSS.
- **Acceptance test** Lighthouse/Chrome trace: CLS contribution from `#gtbg-nav` = 0 on every sub-page (mobile and desktop); LCP element visible at first paint; RUM p75 CLS <= 0.1 for sub-pages after deploy.

### pages-C-07 — Missing landmarks, skip link, reduced-motion handling and `color-scheme` on most pages
- **Severity** medium | **Effort** S | **Moves** Accessibility (A6, D2), Fit and finish | **audit_refs** [A6, D2]
- **Evidence** counted per file: no `<main>` on `immersive`, `ar`, `cinematic-export`, `privacy`, `terms`, `404`, `embed`, `diagnostics`, `unit-rendering-reference`; `watch-together`'s `<main>` wraps only the lower half. No skip link anywhere. Zero `aria-live`/`role=` attributes on all 14 pages. Zero `prefers-reduced-motion` blocks in the 14 pages (only shared `site-nav.css:14,53,82`). No `<meta name="color-scheme">`/`color-scheme: dark`, so native selects, range tracks, scrollbars and form controls render in light style on the dark UI.
- **Root cause** no shared page template.
- **Fix** shared shell: `<a class="skip" href="#main">Skip to content</a>`, `<header>`, `<main id="main" tabindex="-1">`, `<footer>`; `<meta name="color-scheme" content="dark">` + `:root{color-scheme:dark}`; global `@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}`; utility `.sr-only`.
- **Acceptance test** axe-core (`landmark-one-main`, `region`, `bypass`, `label`) 0 violations on each page; forced `prefers-reduced-motion: reduce` emulation shows no running animations (`document.getAnimations().length===0`).

### pages-C-08 — Head metadata parity: eight feature pages lack twitter cards, og:image:alt, JSON-LD, explicit icons
- **Severity** medium | **Effort** S | **Moves** SEO (T1, E2) | **Depends** pages-C-02 | **audit_refs** [T1, E2]
- **Evidence** `grep twitter:card` returns 0 for historian, immersive, ar, watch-together, turning-points, find-ancestor, cinematic-export, living-ledger (other pages such as index have it); none has `og:site_name`, `og:image:alt`, `<link rel="icon">`/`apple-touch-icon`, JSON-LD. All titles use "Gettysburg Animated Battlefield Map" (E2 name mismatch). `privacy.html`/`terms.html` have no OG (acceptable) but also are not in `sitemap.xml` (E5).
- **Fix** one shared `<head>` snippet (charset, viewport, theme-color, color-scheme, icons, manifest link, OG/Twitter, canonical, `WebPage`/`BreadcrumbList` JSON-LD; `Article`/`ItemList` on Turning Points; `SoftwareApplication`/`WebApplication` on interactive tools; `FAQPage` must not be added to Historian unless answers are real static Q&A). Decide the product name (E2) once and apply it to `<title>` suffix, `og:site_name`, footer, manifest. Add `privacy`/`terms` to the sitemap.
- **Acceptance test** Google Rich Results Test and Schema.org validator pass; Lighthouse SEO stays 100; social validators show title/description/image for all 8 pages.

### pages-C-09 — No shared page CSS: duplicated tokens, generic `sans-serif`, 26-40 px targets, 10-13 px text
- **Severity** medium | **Effort** M | **Moves** Fit and finish, Accessibility (A3, A4), Mobile UX (S4) | **audit_refs** [A3, A4, S4, D2]
- **Evidence** every page repeats `:root{--bg..--line}`, `header`, `h1`, `.sub`, `.caveat`, `.controls`, `.play-btn`, `#loading` (e.g., `immersive.html:19-38` == `watch-together.html:22-55`). Fonts: pages use `font-family: sans-serif` while nav uses `system-ui` (`site-nav.css:22`), so UI text renders as Arial/Helvetica beside a Segoe/SF nav. Sizes: 9.5-12 px (`.tp-day` 10 px `turning-points.html:29`; `.kind-tag` 10 px `find-ancestor.html:36`; `.sync-status` 10 px `watch-together.html:49`; `.ar-marker .dist` 10 px `ar.html:45`; `#ar-hud` 11 px; embed `.eyebrow/.brand` 10 px). Targets: `.play-btn` ~30 px, `.sugg` ~26 px, `.btn-sec` ~34 px, `#ar-exit` ~30 px, `.stop-row button` ~20 px.
- **Fix** `/css/pages.css`: tokens, type scale (body 16, UI 14 min, meta 12 min), `--tap:44px` min-height for buttons/chips/inputs, `system-ui` stack for UI and Georgia only for editorial text, focus ring, `.sr-only`, `.card`, `.btn`, `.chip`, `.field`, status/alert components. Remove per-page duplicates. Keep pages' unique layout in small page CSS files.
- **Acceptance test** automated check (Playwright) that every `button, a, input, select, [role=button]` on each page has `getBoundingClientRect` >= 44x44 on a 375 px viewport (>= 24 on desktop) and `fontSize >= 12`; visual regression baseline at 375/768/1440.

### pages-C-10 — "Back to the map" uses `history.back()` and can return to a different page
- **Severity** medium | **Effort** S | **Moves** UX, Function | **Depends** shared site-nav owner
- **Evidence** `site-nav.js:211-227` `wireBackLinks()`: if `document.referrer` starts with `location.origin` and `history.length>1` it `preventDefault()`s and calls `history.back()`. A visitor who goes map -> AR -> Historian -> "Back to the map" lands on the AR page, not the map. The 700 ms fallback only fires if `pagehide` did not.
- **Fix** only use `history.back()` when the *previous entry is the map*: record `sessionStorage.gtbg_from_map='1'` on the first sub-page entry from `/` (check `document.referrer` pathname is `/` or `/index.html`) and clear it on any navigation that is not the map; otherwise let the link go to `/`.
- **Acceptance test** Playwright: map -> historian -> ar -> Back to the map ends on `/`; map -> historian -> Back to the map uses bfcache (`pageshow.persisted===true`).

### pages-C-11 — CSP enforcement readiness for these pages
- **Severity** medium | **Effort** M | **Moves** Security (X3), Best Practices | **Depends** pages-C-03, pages-C-06 | **audit_refs** [X3]
- **Evidence** current header is Report-Only with `'unsafe-inline'` (`netlify.toml:19`); these pages rely on it: inline `<script>` on all 14, inline `<style>`, inline `style=""` attributes (watch-together 9, historian 3, find-ancestor 3, living-ledger 2, privacy/terms/embed/diagnostics 1 each), `innerHTML` templating, third-party scripts from `api.mapbox.com` and `cdn.jsdelivr.net`. RUM host `ingesteer.services-prod.nsvcs.net` is not in `connect-src` (X3).
- **Fix** move each inline script to `/js/<page>.js` (or hash/nonce it), replace `style=""` with classes, remove `'unsafe-inline'` from `script-src`; final policy for feature pages: `default-src 'self'; script-src 'self' [self-hosted mapbox]; style-src 'self'; img-src 'self' data: blob: https://api.mapbox.com https://*.tiles.mapbox.com; connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://ingesteer.services-prod.nsvcs.net [relay origin]; worker-src 'self' blob:; frame-src https://www.google.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`; embed gets its own policy (pages-C-87). Flip Report-Only to enforcing page-by-page after a clean report period (add `report-to`).
- **Acceptance test** securityheaders.com A+ (or A) and Mozilla Observatory >= A; zero CSP violations in console on all pages under Playwright; RUM beacon still sent.

### pages-C-12 — Copy voice: ASCII " -- " punctuation and developer-log phrasing in user copy
- **Severity** low | **Effort** S | **Moves** Fit and finish, Trust | **audit_refs** [H7, H8]
- **Evidence** " -- " used as punctuation in `historian.html:48`, `immersive.html:46-47`, `ar.html:56`, `watch-together.html:63-64,104`, `cinematic-export.html:49`, `living-ledger.html:59`, `find-ancestor.html:52`; dev-log phrases: `ar.html:56` "we haven't been able to do from here", `watch-together.html:64` "treat it as best-effort", `unit-rendering-reference.html:35`.
- **Fix** adopt the copy deck in section 15 (museum voice: plain, specific, honest about limits without narrating the build). Replace " -- " with an em dash or restructure.
- **Acceptance test** grep for ` -- ` in shipped HTML = 0; editorial read-through checklist signed off.

### pages-C-13 — Shared nav: contrast below AA and menu semantics
- **Severity** medium | **Effort** S | **Moves** Accessibility | **Depends** shared site-nav owner | **audit_refs** [A1, A6]
- **Evidence** computed contrast: `site-nav.css:96` `.gtbg-group-why` 11 px `#6f7686` on `#12121e` = 4.08:1; `:129` footer text `#6f7686` on `#0a0a14` = 4.32:1 (AA needs 4.5:1); `.gtbg-here` 9.5 px, `.gtbg-item-desc` 11.5 px. `site-nav.js:169` menu button has `aria-expanded` but no `aria-controls`/`aria-haspopup`; Escape closes the panel (`:184`) but focus is not returned to the button; the panel has no focus containment; below 640 px the Historian pin is icon-only (~32 px target).
- **Fix** raise muted colours to >= 4.5:1 (e.g. `#8a93a8` = 6.0:1), sizes to >= 12 px, add `aria-controls`, return focus on close, make the pin >= 44 px.
- **Acceptance test** axe `color-contrast` 0 violations on nav/footer; keyboard test: open menu, Esc returns focus to button.

---

## 2. historian.html — UI/UX (retrieval and databases are owned by other agents)

Page anatomy: static header + `.how` disclaimer, `#loading`, `#transcript` (flex column of `.msg` bubbles), five static `.sugg` chips, sticky `#ask-row` form. One inline script builds a 658-entry corpus (467 regiments, 24 vignettes, 137 chronology events, 30 terrain features) from **15 JSON fetches (350,723 B raw)** and answers by keyword score, rendering the top 3 as separate bubbles.

### pages-C-14 — Last answer hides behind the sticky input bar; auto-scroll goes to the end of the answer, not the start
- **Severity** high | **Effort** S | **Moves** Usability, Core function (H8), Mobile UX | **Depends** none | **audit_refs** [H8]
- **Evidence** `historian.html:35` `#ask-row{position:sticky;bottom:0;padding:16px 0;margin-top:20px;background:linear-gradient(...)}` is ~78 px tall (16+46+16; input 14 px padding x2 + 15 px text) and overlays the bottom of the scrollport. `:174` `div.scrollIntoView({behavior:'smooth', block:'end'})` aligns each new bubble's **bottom** with the scrollport bottom, i.e. directly under the bar. Each ask produces up to four `addMsg` calls (user echo + 3 results), each starting its own smooth scroll, so the final position is the end of the third result with its last ~78 px hidden. The sticky nav (`site-nav.css:17`, ~55 px) also covers the top if anything is aligned to `start`.
- **Root cause** scroll target ignores both sticky bars; answer split into 3 sibling bubbles; end-alignment is the wrong reading model for long text.
- **Fix**
  ```css
  :root{--nav-h:56px;--ask-h:84px}
  #transcript{padding-bottom:calc(var(--ask-h) + 24px)}
  .answer,.msg.user{scroll-margin-top:calc(var(--nav-h) + 12px)}
  ```
  ```js
  // one .answer group per question (primary card + collapsed "also relevant")
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  group.scrollIntoView({block:'start', behavior: reduce ? 'auto' : 'smooth'});   // start of the answer
  new ResizeObserver(([e]) => document.documentElement.style
      .setProperty('--ask-h', e.contentRect.height + 'px')).observe(askRow);
  ```
  If the answer is taller than the viewport, start-alignment shows the headline and first paragraph; show a "Jump to newest" pill when the user has scrolled away. Never auto-scroll if the user is reading an earlier answer (check `scrollY` vs previous group).
- **Acceptance test** Playwright at 375x667 and 1440x900: after asking "Pickett's Charge", `group.getBoundingClientRect().top` is within [navH, navH+24] and no part of the primary answer's first 6 lines intersects `#ask-row`; the last card's bottom edge has >= 16 px clearance above the bar when scrolled to the end; reduced-motion emulation uses instant scroll; visual regression baseline.

### pages-C-15 — Answers are walls of text: 206-375-word vignette dumps in a 14 px bubble, three at a time
- **Severity** high | **Effort** M | **Moves** UX, Fit and finish, Accessibility (reading level) | **audit_refs** [H8]
- **Evidence** `historian.html:109` renders `v.full_script` in full. Measured across the 24 vignettes: min 206, median 303, max 375 words (sampled entries run 1,213-2,042 characters); a query returns up to 3 such bubbles (e.g. "Chamberlain" = one 326-word vignette plus regiment and terrain bubbles). `.msg` is `max-width:88%`, 14 px/1.65, no paragraph breaks in the source string.
- **Root cause** the renderer treats every corpus row as a final answer; there is no answer model (summary vs detail vs sources).
- **Fix** answer-card anatomy (UI contract the retrieval agents can target):
  ```ts
  interface Answer { id; kind:'vignette'|'regiment'|'event'|'place'|'person'|'doc';
    title; summary;            // <= 2 sentences, always visible
    body?; facts?:{label,value}[]; // body collapsed by default
    time?:{day,clockLabel,tick}; place?; units?:{id,name}[];
    sources:{cite,href?}[];     // REQUIRED; from metadata.sources of the originating file
    links:{label,href,kind:'map'|'bio'|'page'|'embed'}[]; confidence:0..1 }
  ```
  Layout: one primary card (title, summary, fact chips for time/place/units, "Read the full account" `<details>`, "See on the map", "Sources" disclosure), then up to two "Also relevant" cards collapsed to title + one line. Body typography 16 px/1.6, `max-width:65ch`, paragraphs split every 2-3 sentences (`split(/(?<=[.!?])\s+(?=[A-Z])/)`), never more than ~120 words expanded by default. Vignette `panel_summary` (2-3 sentences) is the natural `summary`.
- **Acceptance test** for all 24 vignette queries the initially visible text is <= 120 words; expanded state reachable with keyboard (`<details>` toggle); Lighthouse a11y 100; visual regression at 375/1440; usability check with 5 testers (task: "find who commanded the 20th Maine" in < 15 s).

### pages-C-16 — All 137 chronology answers render the word "undefined"; intro overclaims sources; raw IDs leak into prose
- **Severity** high | **Effort** S-M | **Moves** Core function, Trust (H7, H8), Historical presentation | **Depends** coordinate with retrieval/data agents | **audit_refs** [H7, H8]
- **Evidence**
  - Chronology events in the data have keys `tick,time,event,units_involved,location,significance` (`data/chronology_day1.json`), but `historian.html:119` builds search text from `e.title`, `e.description`, `e.location`, and `:123` renders `${e.description || e.title}`. Simulation of the page logic: **137 of 137 chronology entries render "...: undefined"**, and they are searchable only by `location`. Real output for "Devil's Den": `<b>Day 2, 7:50am — Devil's Den / Little Round Top south slope:</b> undefined`.
  - `historian.html:48` claims "everything it tells you traces back to a real row of data, shown as a source link below each answer", but chronology answers set `srcHref:null` (`:123-124`) = 137 of 658 corpus entries (21%), and regiment/terrain links go to other pages rather than sources. The counts "467 ... 24 ... 137 ... 30" are hard-coded (`:48`).
  - `:93` prints internal IDs into prose: "part of U-I / U-I-1-1" (`r.parent_corps_id`, `r.parent_brigade_id`).
  - `index.html:377` promotes it as "an AI-style historian".
- **Root cause** page written against an earlier schema; no schema test; no ID-to-name lookup.
- **Fix** read `e.event` (and `e.significance`, `e.units_involved`) in both text and render; render chronology as `Day 2 · 7:50am · Devil's Den — <event>` with units resolved to designations and a "See on the map" link (`gtbg_link({t:e.tick})`); resolve corps/brigade IDs via `data/oob/*_oob_*.json` (corps names, division and brigade commanders); every answer gets a Sources row from its file's `metadata.sources`; compute counts from the loaded corpus; rewrite the intro (copy deck 15.1) and stop calling it AI. Add a load-time schema assertion (`console.error` if any field the renderer needs is missing) and a unit test that renders every corpus row and fails on the string "undefined".
- **Acceptance test** Node/Playwright test renders all 658 corpus entries: none contains "undefined", "null", `U-` ID patterns, or empty href; 100% have >= 1 source; intro counts equal `corpus.length` components.

### pages-C-17 — No loading skeleton, error, empty or low-confidence state; leading-space scoring bug hides the obvious answer
- **Severity** high | **Effort** M | **Moves** Reliability, UX (H8) | **Depends** retrieval agents own scoring; UI owns thresholds and states | **audit_refs** [H8]
- **Evidence** `:75-80` no catch (pages-C-04). `:160` `t.includes(' ' + w)` awards the word-boundary bonus only when the word is preceded by a space, but each regiment text *starts* with its designation, so the first word never gets it. Reproduced with the page's own scorer: "20th Maine" returns the Chamberlain vignette, the **15th Alabama** and Little Round Top, but not the 20th Maine regiment record; "who commanded the Iron Brigade" returns "Reynolds Falls" and "Archer Captured"; "Gettysburg Address" returns three vignettes at score 3.9; "what happened at the wheatfield" returns three unrelated regiments at 3.0. There is no minimum score, so weak substring hits (e.g. "war" matching "Warren"/"toward", "lose" matching "close") are presented as answers. `:186` empty message is generic.
- **Fix** (UI side) skeleton + progress while the corpus builds; error card with Retry; **confidence threshold**: below it, show "I don't have a good answer for that in the records" with the 3 closest matches labelled "Closest matches, not answers", the Search page link, and the example chips; "Did you mean..." for near-miss entity names; show a small "Matched on: 20th Maine" explanation line. Contract for retrieval agents: return `confidence` and `matchedOn`. Ask them to fix the boundary bug (prefix the text with a space or use regex `\b`) and stemming.
- **Acceptance test** golden set of 60 questions (regiments, commanders, places, moments, out-of-scope); precision@1 target and 100% of out-of-scope queries produce the "no good answer" state; offline test shows error card.

### pages-C-18 — Accessibility: unlabeled input, no live region, undersized chips
- **Severity** medium | **Effort** S | **Moves** Accessibility (A2, A3, A4) | **audit_refs** [A2, A3, A4]
- **Evidence** `:55` `<input id="ask" placeholder=...>` has no `<label>`/`aria-label` (axe `label`); `#transcript` (`:52`) has no `role="log"`/`aria-live`, so screen-reader users hear nothing after submitting; `.sugg` chips (`:33`) are ~26 px tall at 12 px; `header a.back` 12 px (`:21`); `.msg.bot .src` 11 px (`:30`); suggestions container has no group label; after a chip click focus stays on the chip.
- **Fix** visually-hidden `<label for="ask">Ask the Historian a question</label>`; `#transcript role="log" aria-live="polite" aria-relevant="additions"` and announce a short summary (not the whole 300 words) via a separate `role="status"` node: "Answer ready: Chamberlain's Charge. 2 related results."; chips `min-height:44px;font-size:14px` inside `role="group" aria-label="Suggested questions"`; return focus to `#ask` after a chip or submit (keep the mobile keyboard open); sizes >= 14 px; visible focus ring is already provided by `site-nav.css:138`.
- **Acceptance test** axe 0 violations; VoiceOver/NVDA script: ask a question, hear "Answer ready..." once; all interactive targets >= 44 px at 375 px.

### pages-C-19 — Mobile keyboard/viewport handling and 15 px input
- **Severity** medium | **Effort** S | **Moves** Mobile UX | **audit_refs** [S4]
- **Evidence** `:36` 15 px input (iOS zoom, pages-C-05); viewport meta lacks `viewport-fit=cover` and `interactive-widget`; sticky bar uses `bottom:0` with no safe-area padding; no `visualViewport` handling when the soft keyboard opens.
- **Fix** 16 px input; `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">` (Chrome Android honours `interactive-widget`; iOS ignores it, so also keep last answer visible via `visualViewport.addEventListener('resize', ...)` re-scrolling the group start); `#ask-row{padding-bottom:calc(16px + env(safe-area-inset-bottom))}`; `enterkeyhint="send"`, `autocapitalize="sentences"`, `autocomplete="off"`, `spellcheck="true"`; use `dvh` for min-heights.
- **Acceptance test** real iPhone and Pixel: focus input, keyboard opens, latest answer top stays visible, no page zoom; bar clears the home indicator.

### pages-C-20 — Chips and follow-ups are static and never adapt
- **Severity** medium | **Effort** S-M | **Moves** UX, Discoverability | **audit_refs** [H8]
- **Evidence** `:147` five hard-coded chips ('20th Maine', 'Little Round Top', "Pickett's Charge", 'Iron Brigade', 'Cemetery Hill') are rendered once between transcript and input and are pushed down as the conversation grows; no follow-up suggestions after an answer; chips click sets the input value (`:150`) and leaves it filled.
- **Fix** starter chips grouped by intent (Units, Commanders, Places, Moments, "How it worked") collapsing into a single "Suggestions" popover after the first question; after each answer show 2-4 contextual follow-up chips generated from the answer's `links`/`units`/`place` ("Who commanded it?", "What happened next?", "See it on the map"); clear the input on chip use; rotate a "Question of the day" from vignette titles.
- **Acceptance test** after "20th Maine" the follow-ups reference that unit; chips >= 44 px; input cleared after chip.

### pages-C-21 — Conversation features: no persistence, clear, copy/share, deep link or shortcuts
- **Severity** medium | **Effort** M | **Moves** UX, SEO (shareable answers) | **audit_refs** [H8, T1]
- **Evidence** no code for history, `?q=`, copy, keyboard shortcuts; the transcript is lost on reload.
- **Fix** `?q=` deep link (auto-runs the query, updates `document.title`), "Copy answer"/"Copy link" buttons (Clipboard API with fallback), "New conversation" button, keep the last 20 turns in `sessionStorage` (never localStorage, never sent anywhere), shortcuts: `/` focuses input, `Esc` clears, `ArrowUp` recalls the previous question; per-answer feedback "Was this right?" that only writes to local storage with an "Export my feedback" mailto (no analytics, keeps privacy page truthful) to seed the evaluation set.
- **Acceptance test** `/historian.html?q=20th+Maine` shows the answer without interaction; refresh keeps the session; keyboard shortcuts work; privacy page lists the sessionStorage key.

### pages-C-22 — `innerHTML` sinks with data-driven strings; partial escaping
- **Severity** low (rises to high when third-party text is ingested) | **Effort** S | **Moves** Security hygiene | **audit_refs** [X3]
- **Evidence** `:172` `div.innerHTML = html + (src ? '<a class="src" href="${src.srcHref}">...')` where `html` is assembled from regiment, vignette, chronology and terrain strings and `srcHref` is unescaped in an attribute; `:178` the user echo escapes only `<` (not `&`, `"`), harmless today but wrong.
- **Root cause** string-template rendering; data currently trusted because it is first-party.
- **Fix** build nodes with `createElement`/`textContent`; allow only whitelisted inline markup (`<b>`, `<i>`) via a tiny renderer or DOMPurify with an allow-list; validate `href` against `^/(?!/)`. This is mandatory before the databases are expanded with externally sourced text.
- **Acceptance test** unit test feeds `"<img src=x onerror=alert(1)>"` and `"\" onmouseover=\"..."` in every field: no script executes, DOM contains text only.

### pages-C-23 — Client architecture will not scale: 15 fetches (350 KB) and full corpus build on the main thread every visit
- **Severity** medium | **Effort M** | **Moves** Performance (INP/LCP), Scalability for the database expansion | **Depends** retrieval-architecture agent | **audit_refs** [P3]
- **Evidence** `:75-80`: 8 OOB + 3 vignette + 3 chronology + 1 terrain requests = 214,547 + 136,176 = 350,723 B raw; `Promise.all` waits for the slowest; corpus (658 entries) and closures are built on the main thread before the UI is shown (`:142-145`); `sw.js:61-70` serves `/data/` network-first with `Cache-Control: public, max-age=3600`.
- **Fix** show the UI immediately and build the index in a Web Worker (or precompute at authoring time into one `historian-index.json` + shards); lazy-load on first focus/keystroke or `requestIdleCallback`; cache the built index in IndexedDB with a data-version key; move to sharded/semantic retrieval per the databases plan. Keep the UI contract (pages-C-15) stable across engines (keyword, hybrid, optional streaming LLM).
- **Acceptance test** Lighthouse mobile: TBT <= 200 ms, INP <= 200 ms while typing; time-to-interactive input <= 1 s on Slow 4G; no request waterfall > 3 requests before first render.

---

## 3. immersive.html — Web Audio soundscape over the map

Page anatomy: Mapbox satellite map, multiply-blend `#vignette-overlay`, `#sound-gate` overlay with one button, controls row (Play, tick readout, volume slider). Audio is 100% procedural: a 55 Hz sine drone plus per-event noise buffers (cannon: 0.9 s, low-passed 180 Hz; musket: 0.15 s, high-passed 900 Hz) into one master gain (`immersive.html:112-161`). Tick advances every 350 ms and each tick may trigger cannon/musket (`:190-221`).

### pages-C-24 — No mute or silent mode; Pause leaves the drone running
- **Severity** high | **Effort** S | **Moves** Usability, Accessibility (WCAG 1.4.2), Trust | **audit_refs** [A2]
- **Evidence** the only entry is "Enable Sound & Start" (`:53-55,154-158`); Play stays `disabled` until sound is enabled (`:58`), so there is no visual-only path; `droneOsc.start()` (`:125`) is never stopped, and Pause only `clearInterval`s (`:219`), so the 55 Hz drone keeps sounding while "paused"; there is no mute toggle.
- **Fix** gate with two buttons: "Start with sound" / "Continue without sound"; persistent mute toggle (`<button aria-pressed>` + `M` key); on Pause ramp master gain to 0 over 150 ms then `audioCtx.suspend()`, on Play `resume()` + ramp up; stop the drone on `pagehide`.
- **Acceptance test** Playwright with an `AnalyserNode` probe: after Pause RMS < -80 dB within 300 ms; silent mode never creates an AudioContext; Play enabled in silent mode.

### pages-C-25 — Volume control: unlabeled, abrupt linear mapping, not persisted
- **Severity** medium | **Effort** S | **Moves** Accessibility (A2), Usability | **audit_refs** [A2]
- **Evidence** `:61-62` `<span>Volume</span>` + `<input type=range>` not associated (axe `label`); `:117,160` `masterGain.gain.value = v/100*0.35` sets value instantly (zipper noise) and linearly (slider mid = -15 dB; perceived loudness changes are bunched at the low end); no persistence: reload resets to 55.
- **Fix** `<label for="volume">Volume</label>` with `aria-valuetext="55 percent"`; gain curve `g = 0.35 * (v/100)^2` (or dB taper); `master.gain.setTargetAtTime(g, ctx.currentTime, 0.02)`; persist `{vol, muted}` to `localStorage` key `gtbg_immersive_v1` inside try/catch; restore at load (but never auto-start audio); range `step=5`, visible percentage.
- **Acceptance test** axe `label` passes; sweeping the slider produces no clicks (offline render, no discontinuities > 0.05); reload restores value.

### pages-C-26 — Hearing safety: no limiter, instantaneous attacks, no warning
- **Severity** high | **Effort** M | **Moves** Safety/Trust, Accessibility (sensory) | **audit_refs** []
- **Evidence** cannon buffer `data[i] = (rand*2-1) * (1 - i/N)^3` (`:133`) starts at full-scale noise on sample 0 (hard click/thump), gain 0.9 (`:136`); musket the same with power 6 (`:146`); no `DynamicsCompressorNode`, no polyphony cap, no fade-in. With the current constants the summed peak stays under ~0.8 at slider 100, so today's risk is a harsh transient, not clipping; but any change to density scaling removes that guard. No content warning is shown on the gate (`:53-55`).
- **Fix** master chain `voices -> masterGain -> DynamicsCompressor(threshold -18 dB, knee 12, ratio 8, attack 3 ms, release 250 ms) -> WaveShaper soft-clip or second compressor (threshold -3 dB, ratio 20) -> destination`; per-event envelope with an 8-15 ms linear attack and exponential decay; cap 4 simultaneous voices; 1.5 s master fade-in on start; hard ceiling at about -6 dBFS; default volume 35%; gate copy: "Contains sudden loud cannon and musket sounds. Turn your volume down before you start, especially with headphones."
- **Acceptance test** `OfflineAudioContext` render of 60 s at max intensity and slider 100: sample peak <= 0.5 (-6 dBFS), no single-sample jump > 0.2 at event onsets; gate warning visible; screenshot test.

### pages-C-27 — The sound model never goes quiet and does not do what the copy says
- **Severity** high | **Effort** L | **Moves** Historical accuracy, Function, Trust | **Depends** pages-C-31 (clock), data agents (engagement windows) | **audit_refs** [C4]
- **Evidence** copy `:46-47`: "cannon fire, musketry, and quiet", "more units in contact means more and louder cannon/musket cues". Code `:202-207`: cannon is eligible whenever `artilleryCount > 0` with fixed gain 0.9 regardless of count (so "more" is false for cannon); musket eligibility is `Charging Line + Line of Battle > 3` (formed lines, not contact). Measured over the placement data with the page's exact rules: cannon-eligible in **662 of 675 ticks**, musket-eligible in **640 of 675**; a simulated loop yields ~209 booms and ~400 crackles in 236 s (about one boom per second, continuously); the page's own atmosphere tints **135 ticks as night** (hour >= 20 by `hourForTick`, `:169-173`) and all 135 remain cannon-eligible, because forward-filled dispositions never expire (`:94-102`). Only 152 of 467 units have placements (694 records), so "real unit density" is a 152-unit sample.
- **Root cause** disposition strings are used as a proxy for combat, and forward-fill keeps units "Deployed" forever.
- **Fix** derive a per-tick **intensity series** from data that actually encodes fighting: `casualty_apportionment.json` engagement windows (`tick_range`, `peak_tick`, bell-curve), chronology `significance`, and artillery in range of enemy units (distance test on placements), smoothed with a 3-tick window; cannon rate ~ intensity x sqrt(artillery in view), musket density ~ intensity x infantry lines in view; **silence** outside windows and a night bed (crickets/wind, -30 dB); spatialise with `StereoPannerNode` from unit longitude offset relative to map centre and distance attenuation, so the mix follows the camera. Rewrite copy to describe the model truthfully (copy deck 15.2). Data note: the time labels in the source windows are compressed (C4), so map by tick, not clock.
- **Acceptance test** offline render shows RMS during the 22:00-04:00 (unified clock) window at least 20 dB below Pickett's cannonade; night ticks contain no cannon; cannon count per minute correlates (r >= 0.7) with the intensity series; copy claims match a data-driven test.

### pages-C-28 — Autoplay, iOS silent switch and lifecycle: context created correctly, then unmanaged
- **Severity** high | **Effort** S-M | **Moves** Function on iOS, Reliability | **audit_refs** []
- **Evidence** `AudioContext` is created inside the click handler (`:114-115,154`), which satisfies autoplay. Missing: (1) `navigator.audioSession` — on iOS a bare Web Audio context is muted by the ring/silent switch (Safari 16.4+ exposes `navigator.audioSession.type='playback'`; must be set before creating the context); (2) `statechange` handling: iOS moves the context to `interrupted`/`suspended` on calls, lock, and route changes, and nothing resumes it; (3) `visibilitychange`/`pagehide`: when the tab is hidden, `setInterval` is throttled to ~1 Hz but booms continue; (4) no headphone-unplug handling.
- **Fix**
  ```js
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  const ctx = new (window.AudioContext||window.webkitAudioContext)({latencyHint:'playback'});
  ctx.addEventListener('statechange', () => ui.setAudioState(ctx.state));
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : userWasPlaying && resumePrompt());
  addEventListener('pagehide', () => ctx.close());
  // fallback for iOS < 16.4: loop a 1-second silent <audio> element started in the same gesture
  ```
  Show "Audio paused by your device. Tap to resume." when state is `interrupted`/`suspended`.
- **Acceptance test** real iPhone with silent switch on: sound plays; lock/unlock and incoming-call test resumes with one tap; hiding the tab pauses.

### pages-C-29 — CPU/GC and GPU cost: new buffers per event, whole-map blend layer
- **Severity** medium | **Effort** S-M | **Moves** Performance (INP/battery), Mobile UX | **audit_refs** [P2]
- **Evidence** each cannon allocates a 0.9 s buffer (~43k samples at 48 kHz) and fills it with `Math.random()` on the main thread and builds a new filter/gain graph (`:128-152`); a loop allocates ~47 MB of short-lived buffers (209 x ~173 KB + 400 x ~29 KB). `#vignette-overlay` uses `mix-blend-mode:multiply` over the whole WebGL map (`:29`), forcing an extra compositing pass every frame on mobile GPUs; `backdrop-filter: blur(2px)` on the gate.
- **Fix** pre-render 4 cannon and 6 musket variants once at init (via `OfflineAudioContext`) and reuse with random `playbackRate` (0.9-1.1), `detune`, pan and filter; or ship 30 KB CC0 samples if procedural realism is insufficient (record licence in `CREDITS`); replace the multiply overlay with a normal-blend `rgba` overlay (or Mapbox `setFog`/light) and remove `backdrop-filter`.
- **Acceptance test** Chrome performance trace: no GC events > 5 ms during playback; scripting < 2% of frames; frame rate stays 60 fps on a mid-range Android.

### pages-C-30 — Reduced motion, captions and accessibility for an audio-only feature
- **Severity** medium | **Effort** M | **Moves** Accessibility | **audit_refs** [A2, A3, A6]
- **Evidence** no `prefers-reduced-motion` (overlay colour transition 1.2 s, `:29`); nothing for deaf/hard-of-hearing users: no captions or visual cues; `#tick-display` (`:59`) is a raw "Tick N / 675" with no day/time; `#map` has no `role="region"`/label; after the gate is removed (`:156`) focus falls to `<body>`; Play button ~30 px.
- **Fix** sound captions strip ("Distant cannon fire — Confederate artillery on Seminary Ridge", "Musket volleys, close") that also drives a subtle map pulse (disabled under reduced motion); `role="region" aria-label="Battle map with sound"`; move focus to Play after the gate; readout "Day 2, 4:35 PM" (needs pages-C-31); Play `aria-pressed`; controls >= 44 px.
- **Acceptance test** axe clean; reduced-motion emulation shows no transitions; with captions on, each audio event has a text equivalent within 250 ms.

### pages-C-31 — Atmosphere and readout use a third clock
- **Severity** medium | **Effort** S after C4 | **Moves** Historical consistency | **Depends** unified clock from time agents | **audit_refs** [C4]
- **Evidence** `hourForTick` (`:169-173`) = `5:00 + (tick - dayStart)*5 min` (data-formula "F" in time-facts.md), different from the main map (Day 1 base 6:00, Day 2/3 base 4:00) and from real events. Consequence: dusk tint from 17:00-20:00 and night tint after 20:00 land at wrong real moments; tick 675 reads 23:00-hour "night".
- **Fix** import the single `gtbg-clock.js` once defined (C4) and derive daylight from a solar model for Gettysburg (lat 39.83, lng -77.23) on the actual dates rather than fixed hour cut-offs.
- **Acceptance test** unit test: sunrise/dusk tints occur within 15 minutes of computed solar times for July 1-3, 1863 (verify constants with the time-facts agent).

### pages-C-32 — Start-up: map gated behind all data; blocking script; no error path
- **Severity** medium | **Effort** S | **Moves** Performance, Reliability | **audit_refs** [P3, P4]
- **Evidence** `:76` waits for 9 placement files (126,698 B raw) before `new mapboxgl.Map` (`:106`), so tiles cannot begin loading in parallel; Mapbox script blocks head (pages-C-03); no `map.on('error')` (bad token/style/WebGL failure leaves an empty box and an enabled Enable-Sound gate); `mapboxgl.supported` is not consulted (verify availability in v3).
- **Fix** construct the map immediately, fetch data in parallel, enable Play when both are ready; `map.on('error', showMapError)`; WebGL feature check with a static fallback message; `#map{aspect-ratio:16/10;min-height:360px;height:auto}` using `dvh`.
- **Acceptance test** offline/blocked-token Playwright run shows a visible error; LCP/FCP improve vs baseline.

### pages-C-33 — Controls and end-state: loop wrap, no scrubber, no key moments, no deep link
- **Severity** low | **Effort** M | **Moves** UX, Completeness | **audit_refs** [H9]
- **Evidence** `:217` wraps 675 -> 1 silently forever; fixed 350 ms/tick with no speed control; no timeline scrubber, day tabs or presets (e.g., Pickett's cannonade); no `?t=` deep link.
- **Fix** scrubber with day markers and key-moment presets from `vignettes_part*.json`, speed 0.5x/1x/2x labelled in sim-minutes per second (H9), end-of-battle card, `?t=`/`?v=` support (pages-C-01).
- **Acceptance test** presets jump within one tick of the vignette trigger; keyboard operable; `?v=V-018` starts at the vignette.

---

## 4. ar.html — Battlefield AR (camera + GPS + compass overlay)

Page anatomy: start card with a permission list and status rows; on Start the script loads `terrain.json` (30 `key_locations`), requests camera (`getUserMedia`), geolocation (`watchPosition`), then iOS motion permission, and renders absolutely-positioned marker `<div>`s over a `<video>` using a hard-coded 70 degree horizontal FOV (`ar.html:81-211`). It has never been field-tested (`:56`).

### pages-C-34 — iOS: compass permission is requested after two awaits and very likely loses the user gesture
- **Severity** critical (feature non-functional on iPhone if confirmed) | **Effort** S | **Moves** Core function (mobile), Reliability | **Depends** device test | **audit_refs** []
- **Evidence** the click handler (`:154-202`) runs: `await loadLocations()` (network fetch, `:156`) -> `await getUserMedia` (permission prompt, `:160`) -> `await` a geolocation promise (second prompt, `:170-177`) -> only then `DeviceOrientationEvent.requestPermission()` (`:184-186`). Web sources agree that iOS throws `NotAllowedError: Requesting device orientation or motion access requires a user gesture` when the call is not made in a gesture; after two OS permission dialogs and a network fetch the transient activation is gone. The `catch` (`:189`) then reports "Compass unavailable" and the stage opens with `heading` fixed at 0 (`:199-201`).
- **Root cause** permission order chosen for narrative flow, not platform constraints.
- **Fix** make the orientation request the **first synchronous call** in the click handler and split the flow into explicit steps:
  ```js
  startBtn.onclick = () => {
    const orient = (typeof DeviceOrientationEvent !== 'undefined' &&
                    typeof DeviceOrientationEvent.requestPermission === 'function')
        ? DeviceOrientationEvent.requestPermission()      // FIRST, no await before it
        : Promise.resolve('granted');
    preloadLocations();                                    // do not fetch inside the gesture
    orient.then(setCompassState)
          .then(() => getCamera())                         // camera/geolocation prompts do not need the gesture
          .then(() => getLocation());
  };
  ```
  Also fetch `terrain.json` at page load, not on click; add per-permission "Retry" buttons (each its own gesture) so a decline on one does not require restarting all.
- **Acceptance test** real iPhone (Safari, iOS 17/18): tapping Start shows the Motion & Orientation prompt first; heading updates when turning; Android Chrome unaffected. Unit test with a stub that records call order asserts `requestPermission` is called before any `await`.

### pages-C-35 — Heading math: relative alpha on Chrome, upright-only formula, magnetic vs true north, no smoothing or calibration
- **Severity** high | **Effort** M | **Moves** Core function, Accuracy claims | **Depends** device test | **audit_refs** []
- **Evidence** `:141-152` uses iOS `webkitCompassHeading` (a magnetic heading per Apple docs; verify) else `360 - e.alpha`. On Chrome for Android, `deviceorientation.alpha` has been relative to an arbitrary start since Chrome 50 (`absolute:false`); compass-referenced values require the separate `deviceorientationabsolute` event. `360 - alpha` is only the camera heading when the phone is upright with gamma ~ 0; held flat or tilted it is wrong. Bearings to locations are **true** bearings (`:103-107`) while device headings are **magnetic**: declination at Gettysburg is roughly -10 to -11 degrees (WMM 2025-2029 epoch; compute exactly), i.e. a ~10.5 degree systematic error = ~56 px at 375 px width and a 70 degree FOV (5.36 px/degree) and ~490 ft lateral error at 0.5 mi (computed). Every orientation event (up to 60 Hz) is applied raw (`:151`), so compass noise (+/- 3-5 degrees) jitters markers.
- **Fix**
  1. `getHeading(e)`: iOS `webkitCompassHeading` (+ read `webkitCompassAccuracy`, warn if < 0 or > 25); Chrome/Android listen to `deviceorientationabsolute` when `'ondeviceorientationabsolute' in window`, require `e.absolute === true`; fallback to `AbsoluteOrientationSensor` (Generic Sensor API, Chromium) or an "orientation unreliable" state.
  2. Camera direction from Euler angles with the W3C example formula (verify sign conventions on device):
     ```js
     function compassHeading(alpha, beta, gamma){ const r=Math.PI/180, x=beta*r, y=gamma*r, z=alpha*r;
       const cY=Math.cos(y), cZ=Math.cos(z), sX=Math.sin(x), sY=Math.sin(y), sZ=Math.sin(z);
       const Vx=-cZ*sY - sZ*sX*cY, Vy=-sZ*sY + cZ*sX*cY;
       let h=Math.atan(Vx/Vy); if(Vy<0) h+=Math.PI; else if(Vx<0) h+=2*Math.PI; return h*180/Math.PI; }
     ```
  3. `trueHeading = magneticHeading + declination(lat,lng,date)`; ship a 10 KB WMM implementation or the constant declination for the battlefield (the extent is ~10 km so variation < 0.2 degrees); recompute yearly.
  4. Circular low-pass filter on the unit vector (`alpha ~ 0.15`), dead-band 1 degree, update at <= 30 Hz.
  5. One-tap calibration: "Centre a landmark you can see, then tap Align" stores an offset in `sessionStorage`; show compass accuracy chip.
- **Acceptance test** on-site or with recorded sensor traces: bearing error to Big Round Top from Little Round Top < 5 degrees after filter + declination; heading stable within +/- 1 degree when the phone is still for 10 s; unit tests for `compassHeading`, declination, circular filter.

### pages-C-36 — Camera stream and GPS watch are never released on failure or exit
- **Severity** high (privacy and battery) | **Effort** S | **Moves** Privacy, Reliability | **audit_refs** [X5]
- **Evidence** `:159-167` acquires the camera; if geolocation then fails (`:178-181`) the handler `return`s without stopping the tracks, leaving the camera light on with the stage hidden. `:172` `watchPosition(...)` never stores its id and the Exit handler (`:204-210`) stops video tracks and the orientation listener but never `clearWatch`, so GPS keeps running after "Exit AR". Each extra Start click adds another stream and another watcher (the earlier `srcObject` is overwritten but its stream keeps running).
- **Fix** hold `state={stream,watchId,orientationHandler}`; single `stopAll()` called on every failure path, Exit, `pagehide`, `visibilitychange:hidden` (iOS suspends the stream anyway), and `track.onended`; disable Start while a session is starting; assert `stream.getTracks().every(t=>t.readyState==='ended')` after exit.
- **Acceptance test** Playwright with fake devices (`--use-fake-device-for-media-stream`): after a geolocation denial no live tracks remain; after Exit `navigator.geolocation` watcher count is zero (stub `clearWatch` spy); camera indicator off on device.

### pages-C-37 — Geolocation errors are conflated ("denied") and the 10 s timeout is unrealistic
- **Severity** high | **Effort** S | **Moves** Reliability, UX | **audit_refs** []
- **Evidence** `:174` the error callback ignores `err.code` and always says "Location denied"; `:175` `{enableHighAccuracy:true, timeout:10000}` with no `maximumAge`; cold GPS on phones often needs > 10 s outdoors, producing a false "denied". After the first error the promise resolves `false` but the watch keeps running (pages-C-36). No display of `coords.accuracy`.
- **Fix** branch on `err.code`: 1 PERMISSION_DENIED -> OS-specific recovery steps (pages-C-41); 2 POSITION_UNAVAILABLE -> "Move outdoors or check Location Services"; 3 TIMEOUT -> keep waiting with a spinner, retry with `timeout:30000, maximumAge:5000`, fall back to low accuracy for a first fix then upgrade. Query `navigator.permissions.query({name:'geolocation'})` first and skip the prompt when already `denied`. Show accuracy ("GPS +/- 12 m") and warn above 30 m. Remove the raw "39.8110, -77.2350" HUD text (`:137`), which means nothing to a visitor.
- **Acceptance test** simulate each error code (DevTools Sensors / Playwright `context.setGeolocation` + permission denial): each yields its own message and recovery action; `accuracy` chip updates.

### pages-C-38 — Desktop, no-sensor, and "not at Gettysburg" visitors get a broken experience
- **Severity** high | **Effort** L | **Moves** Function on desktop (audit "AR needs on-site phone"), UX, SEO/engagement | **audit_refs** [S4]
- **Evidence** `:192` `'DeviceOrientationEvent' in window` is true on desktop Chrome, so the page says "Compass active" although no event will ever fire; the webcam shows the user's room; markers stay fixed toward north (`heading=0`). No test for distance to the park: `terrain.json` metadata bounds are N 39.850, S 39.770, E -77.180, W -77.290; a visitor in Ohio still gets "Location granted" and zero markers. The page copy just says "This needs a phone" (`:56`).
- **Fix**
  1. Capability detection: wait <= 1.5 s for the first orientation event with non-null `alpha/beta/gamma`; if none, mark compass unsupported.
  2. Distance gate: if the fix is > 15 km from the battlefield centre, say so ("You are 214 miles from Gettysburg") and offer Preview.
  3. **Preview mode (no camera/sensors needed)**: choose a vantage (Little Round Top, Cemetery Ridge/Angle, Oak Ridge, Culp's Hill, Seminary Ridge, town), drag/arrow-key/gyro to look around, markers rendered over a Mapbox 3D terrain view (`pitch 80`, `setTerrain`) or a pre-rendered panorama; same marker component as live AR.
  4. **List view** always available (pages-C-43).
- **Acceptance test** desktop Chrome: Start offers Preview instead of a webcam; a mocked far-away location shows the distance message; keyboard can pan; Lighthouse a11y 100 in preview.

### pages-C-39 — Markers: unreadable pile-ups, not interactive, ignore elevation and pitch, hard-coded FOV, DOM rebuilt at sensor rate
- **Severity** high | **Effort** L | **Moves** Core function, Fit and finish | **audit_refs** [A3, A4]
- **Evidence** with the page's own rules (3 mi range, 70 degree FOV) a viewer at Little Round Top facing north sees **22 of 30** labels at once, all at `top:40%` with 12 px labels ~120 px wide, so most overlap (5.36 px/degree at 375 px means labels within ~22 degrees collide); from the town square facing south, 18 markers. `.ar-marker{pointer-events:none}` (`:41`) means labels cannot be tapped for details. Vertical position is constant (`:38`), ignoring the target's elevation angle and device pitch (`beta`). FOV = 70 (`:122`) is a guess; portrait rear cameras are narrower (about 50-60 degrees horizontal for typical main lenses; uncertain) and `object-fit:cover` crops further, so markers drift from the real objects. `renderMarkers()` sets `overlay.innerHTML=''` and rebuilds all nodes on every orientation event (`:120`, up to 60 Hz), causing layout thrash and defeating the `transition:left .1s` (`:40`); label text is 12 px and `.dist` 10 px.
- **Fix** persistent nodes keyed by `location_id`, positioned with `transform: translate3d(x,y,0)` in a `requestAnimationFrame` loop at <= 30 Hz; declutter: cap 6 labels, importance x proximity score, stack collisions into rows, scale/opacity by distance, show a "+N more" chip that opens the list; vertical placement `y = horizon - (elevAngle - pitch) * pxPerDeg` (`elevAngle = atan((targetElev - userElev)/distance)` with elevation from `terrain.json`); FOV from calibration slider defaulting per device class (verify on 3 phones); tap opens a bottom sheet (name, elevation, significance, day relevance, "See on the map", "Then and now" photo if licensed); >= 14 px labels and 44 px hit areas; skip markers within 30 m of the user.
- **Acceptance test** from LRT facing north at most 6 labels visible with zero overlaps (bounding-box test); tapping opens details; 60 fps and < 2 ms scripting per frame in a trace; marker moves smoothly (no innerHTML rebuild).

### pages-C-40 — Accuracy disclaimer voice, safety notice and beta labelling
- **Severity** medium | **Effort** S | **Moves** Trust, Legal, Voice (H7) | **audit_refs** [H7]
- **Evidence** `:56` "This is a real, working implementation, but its on-the-ground accuracy can only be confirmed by testing it while actually standing at Gettysburg, which we haven't been able to do from here." Developer narration; also no physical-safety or park-rules notice.
- **Fix** copy (deck 15.3): what to expect ("Compass direction is usually within 10-15 degrees and GPS within 5-30 m, so treat markers as pointers, not survey points"), a "Beta" badge until field-tested, "Tested on: iPhone 15 (iOS 18), Pixel 8 (Chrome) at Little Round Top, <date>" once done; safety line ("Keep your eyes on your surroundings, stay on paths, watch for traffic and uneven ground, respect monuments, private property and National Park Service rules"); link to NPS visitor info; mirror in Terms (pages-C-84).
- **Acceptance test** copy review; on-device test log attached to the plan.

### pages-C-41 — Permission education and persistent status
- **Severity** medium | **Effort** M | **Moves** UX, Reliability | **audit_refs** []
- **Evidence** `:60` lists permissions; statuses (`:62-66`) live only in the start card, which is hidden as soon as the stage opens (`:200`), so a denied compass or low-accuracy GPS is never visible again; `#err-box` has no `role="alert"`, statuses have no `aria-live`.
- **Fix** primer screen: three cards (Camera: to show the view; Location: to know where you stand; Motion: to know which way you face) with "Nothing leaves your device" (true for this page); sequential steps with visible success/failure and per-step Retry; on denial show platform steps (iOS: Settings > Safari > Camera / Location / Motion & Orientation; Android Chrome: lock icon > Permissions) using the Permissions API to detect state; keep compact status chips (Camera, GPS +/- m, Compass OK/limited) in the HUD; `role="status"` for changes, `role="alert"` for errors.
- **Acceptance test** deny each permission in turn: correct recovery text shown, HUD chip persists, screen reader announces.

### pages-C-42 — Battery, wake lock and layout: 60 Hz DOM churn, screen sleeps, portrait card only
- **Severity** medium | **Effort** M | **Moves** Reliability, Mobile UX, Performance | **audit_refs** [E1]
- **Evidence** no `navigator.wakeLock` use, so the screen dims/locks in ~30 s and the camera stops; continuous `enableHighAccuracy`; DOM rebuild at sensor rate (pages-C-39); the stage is a 68vh rounded card (`:34`) not a full-screen view, so the camera preview is small; manifest `orientation: landscape` (E1) conflicts with a portrait-held AR use in an installed PWA.
- **Fix** request a screen wake lock on start (release on exit/hidden; re-acquire on `visibilitychange`); "Battery saver" toggle (15 Hz UI, low-accuracy after first fix); auto-exit prompt after 10 min idle; full-viewport layout with `100dvh` and safe-area insets, landscape supported; remove the manifest orientation lock (E1).
- **Acceptance test** screen stays on during a 5-minute session; battery drain benchmark (<= 8%/10 min on a mid-range phone in saver mode); landscape and portrait both usable.

### pages-C-43 — No non-visual alternative (list view, spoken orientation)
- **Severity** medium | **Effort** M | **Moves** Accessibility | **audit_refs** [A6]
- **Evidence** AR is purely visual; `#ar-hud` 11 px, `.dist` 10 px, Exit ~30 px; no text equivalent of what is ahead.
- **Fix** "List view" tab always available: nearest-first list with compass words ("north-east, 0.4 mi, 650 ft, Little Round Top") and significance; "What am I facing?" button that announces via `aria-live` the 3 closest markers in view; works without camera or compass (uses bearing words from position only).
- **Acceptance test** screen-reader run-through completes the task "find the nearest high ground" without the camera.

### pages-C-44 — Data: `terrain.json` typo and thin point set for AR
- **Severity** low | **Effort** S | **Moves** Data accuracy, Function | **audit_refs** []
- **Evidence** `data/terrain.json:50` `"name":"Gulp's Hill saddle"` (should be Culp's; the only occurrence). AR uses only the 30 `key_locations` (`:115`); 29 of 30 are within 3 mi of Little Round Top, so the 3 mi filter (`:125`) rarely reduces the set.
- **Fix** correct the name; extend AR data with the 512 monuments (from the app data), NPS wayside/tour stops and walkthrough stops, each with `lat,lng,elevation_ft`, category and short text; add a `min_distance` and importance weight per POI; show "distance to nearest 3" instead of only count filter.
- **Acceptance test** data lint: names spell-checked against a gazetteer; AR list from the 5 sample vantages shows >= 6 relevant POIs each.

### pages-C-45 — Permissions-Policy grants camera, geolocation and motion sensors to every page
- **Severity** low | **Effort** S | **Moves** Security (least privilege) | **Depends** header-merge test (see pages-C-87) | **audit_refs** [X3]
- **Evidence** `netlify.toml:13` sets `camera=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)` on `/*`; only `/ar.html` needs them (the bundled Mapbox library contains `GeolocateControl`, `bundle.pretty.js:94853`; verify whether the app instantiates it before removing geolocation elsewhere). An XSS on any page (pages-C-46) could request the camera.
- **Fix** default `camera=(), accelerometer=(), gyroscope=(), magnetometer=()`, keep `geolocation=(self)` for the map, and grant camera/sensors only on `/ar.html`; because override semantics are unproven on Netlify (see pages-C-87) test on a deploy preview with `curl -I`; if merging duplicates the header, use an Edge Function for `/ar.html`.
- **Acceptance test** `curl -I` shows the expected policy per path; AR still works; other pages cannot call `getUserMedia`.

---

## 5. watch-together.html — tour builder + "Live Sync"

Page anatomy: lite Mapbox map (dots only), caption bar overlaid on the map, tour editor (tick number + note -> stops in `localStorage`), JSON export/import, and PeerJS-based Live Sync where a host shares a 5-letter code and viewers receive `{type:'goto', tick, note}` messages (`watch-together.html:107-334`). PeerJS 1.5.4 is loaded from jsDelivr in `<head>` without SRI (`:19`).

### pages-C-46 — Stored/self XSS: tour notes and imported tour files are injected with `innerHTML`
- **Severity** high | **Effort** S | **Moves** Security, Trust | **Depends** none | **audit_refs** [X3]
- **Evidence** `:172` builds each row with `row.innerHTML = ` and a template literal containing `Tick ${s.tick}` and `${s.note || '(no note)'}` unescaped. Import (`:320-333`) does `stops = data.stops` after only `Array.isArray`, then `saveStops()` writes it to `localStorage` (`:161`), so a crafted file executes on **every subsequent load** of the page in the site origin. Sharing a `.json` tour with strangers is the feature's stated use (`:63`). A PoC file: `{"type":"gtbg-watch-together-tour","version":1,"stops":[{"tick":1,"note":"<img src=x onerror=alert(document.domain)>"}]}`. `tick` is also interpolated unescaped, and file size and stop count are unbounded. Report-Only CSP with `'unsafe-inline'` blocks nothing (`netlify.toml:19`). Impact is bounded (no cookies/accounts; origin can request camera via the site-wide Permissions-Policy, see pages-C-45), but it is a same-origin script injection on the project's domain.
- **Root cause** string-template rendering of untrusted data, no schema validation.
- **Fix** build rows with `createElement`/`textContent`; strict validator:
  ```js
  function parseTour(text){ if(text.length>65536) throw new Error('too large');
    const d=JSON.parse(text); if(d?.type!=='gtbg-watch-together-tour'||d.version!==1||!Array.isArray(d.stops)||d.stops.length>100) throw 0;
    return d.stops.map(s=>{ const tick=Number(s.tick); if(!Number.isInteger(tick)||tick<1||tick>675) throw 0;
      const note=String(s.note??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,280); return {tick,note}; }); }
  ```
  apply the same validation when reading `localStorage`; render invalid files with an inline `role="alert"` message (no `alert()`); later, CSP without `'unsafe-inline'` (pages-C-11) is the backstop.
- **Acceptance test** unit test with the PoC and 20 fuzz payloads (`<svg onload>`, `"><script>`, huge strings, negative/float/string ticks, 10 MB file): none executes, invalid files rejected, DOM contains text nodes only; import of a valid exported file round-trips.

### pages-C-47 — Public PeerJS broker dependency: reliability, privacy and supply chain; replace with a small relay we control
- **Severity** high | **Effort** L (relay) | **Moves** Reliability, Privacy (X5), Function | **Depends** pages-C-48/49/50 (same design), pages-C-81 | **audit_refs** [X5]
- **Evidence** `:17-19` comment "free public broker (0.peerjs.com) -- no account, no server of ours"; `:224,251` `new Peer(...)` with no `config`. Verified in `peerjs@1.5.4/dist/peerjs.min.js` (92,865 B; 25,491 B gzip): default `host` is `0.peerjs.com` (broker returned HTTP 200, "location: EU"), default ICE servers are `stun:stun.l.google.com:19302` plus `turn:eu-0.turn.peerjs.com:3478` and `turn:us-0.turn.peerjs.com:3478` with the shared public credential (`peerjs` / `peerjsp`). Secondary sources describe the PeerJS cloud as donation-funded with no SLA and note past outages (GitHub issues 2020-2022) and say it is not suitable for production. Privacy: the broker, Google STUN, PeerJS TURN and jsDelivr all see participants' IP addresses; WebRTC exposes each participant's public IP to the other; `privacy.html` says none of this (X5). Supply chain: `<script src=".../peerjs.min.js">` has no `integrity`/`crossorigin` (`:19`); CSP allows the whole `cdn.jsdelivr.net`. Reliability: a peer-to-peer link needs TURN for symmetric NAT/carrier-grade NAT; the shared TURN is best-effort. A relay that forwards tiny `{tick, playing, rate, camera}` messages removes ICE/NAT/TURN/IP-exposure entirely; the payload (~100 B/s) does not need WebRTC.
- **Options (ranked)**
  | Option | Realtime | Cost/ops | Fit |
  |---|---|---|---|
  | **A. Netlify Function + Blobs, HTTP polling** (recommended first) | 1-2 s latency via ETag/304 polling | inside the existing Netlify project; zero servers; function-level `rateLimit`; no WebSocket support on Netlify Functions | ideal for "same tick, same moment" sync at this scale |
  | **B. Cloudflare Worker + Durable Object (WebSocket hibernation)** | ~100 ms push | second platform account, free tier likely sufficient (verify current limits) | best experience if sessions grow; still ~60 lines |
  | C. Self-host PeerServer + coturn | P2P | VM, TLS, monitoring, TURN bandwidth | highest ops burden for a solo dev |
  | D. Managed realtime (Ably, Pusher, Supabase Realtime, PartyKit) | push | free tiers; new vendor and privacy disclosure | fine, adds a third party |
  Keep PeerJS only if the owner wants a serverless P2P demo; if so pin `integrity`, lazy-load (pages-C-56), supply own TURN, and disclose everything.
- **Design for option A** (`netlify/functions/room.mts`, Functions v2 + `@netlify/blobs`; verify option names on your plan):
  ```ts
  export const config = { path: '/api/room/*',
    rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip','domain'] } };
  // POST /api/room                    -> { code, hostToken }        (creates room, TTL 6 h)
  // PUT  /api/room/:code   Bearer hostToken  body {seq,tick,playing,rate,serverT0,cam?,note?}
  // GET  /api/room/:code?since=seq    -> 200 {state} | 304          (ETag = seq; Cache-Control: no-store)
  // DELETE /api/room/:code Bearer hostToken                         (end session)
  const store = getStore({ name: 'rooms', consistency: 'strong' });
  ```
  Viewer clients poll every 1 s foreground / 5 s hidden with `If-None-Match`; payload < 400 B; server returns `serverNow` so clients compute `tick = tick0 + rate * (serverNow - t0) / tickMs` and interpolate locally (no per-tick messages). Function invocations scale as viewers x 1/s; check plan quotas (10 viewers x 30 min = 18,000 calls).
- **Acceptance test** host + 3 viewers on different networks (incl. mobile carrier CGNAT and a strict corporate firewall): all follow within 2 s p95; kill the host tab: viewers show "Host disconnected" within 10 s; no request to `0.peerjs.com`, `*.peerjs.com` or `stun.l.google.com` in the network log; privacy page updated (pages-C-81).

### pages-C-48 — Room codes: 5 letters from `Math.random()` in a shared global namespace; collisions handled only by a generic error
- **Severity** high | **Effort** M (with pages-C-47) | **Moves** Security, Reliability | **audit_refs** [X5]
- **Evidence** `:205-210` code = 5 of 24 letters (24^5 = 7,962,624) via `Math.random()`; peer id `gtbg-wt-CODE` (`:224`) lives in the global PeerJS namespace, so anyone can register or connect to any id; PeerJS reports `unavailable-id` on collision, which `:241` maps to "connection error -- try again" (user must click again); no host secret, no join authentication, no rate limits, no code expiry. An attacker can squat ids in bulk or brute-force live codes; joiners trust whoever owns the id.
- **Fix** server-issued code from `crypto.getRandomValues`, 6-8 characters of consonants+digits (`BCDFGHJKMNPQRSTVWXYZ23456789`, no vowels to avoid words, ~28^6 = 481 M), host token (256-bit) returned once and required for publish, viewers read-only, TTL 6 h with lazy deletion, `rateLimit` on create/poll, constant-time compare, join attempts throttled per IP; on collision the server retries silently.
- **Acceptance test** 1,000 create calls produce unique codes; publish without token returns 401; 200 rapid join attempts trigger 429; expired room returns 410 with friendly copy.

### pages-C-49 — "Live Sync" only shares stop-to-stop slide changes; viewers can still run their own tour; copy overpromises
- **Severity** high | **Effort** L | **Moves** Core function (feature completeness), UX | **Depends** pages-C-47, pages-C-01 | **audit_refs** [H8]
- **Evidence** `broadcastTick` fires only from `goToTick` when `isHost` (`:193`), and `goToTick` is called only when adding a stop (`:287`), playing the tour (`:301`) or loading stops (`:275,:328`): there is no live playback/scrub of the timeline, no shared play/pause/speed and no host camera; viewers compute their own bounds from the densest cluster (`:190-191`) and can press Play tour (`:291`), fighting the host's messages. Copy: "anyone who enters it sees the same tick move on their own screen in real time" (`:64`), "sees the same moment appear... within about a second" (`:104`). Sync lives on a stripped-down map (dots only, no OOB, labels, vignettes) rather than the real app.
- **Fix** shared state `{tick, playing, rate, serverT0, cam:{center,zoom,bearing,pitch}, note, seq}`; host controls (Play/Pause, scrub, speed, camera); viewers have a "Following host / Explore on my own" switch with a "Return to host" button and locked authoring controls while following; late-join snapshot; host hand-off; participants count (no names). Add real playback + scrubber to the lite map now, and treat "sync inside the main app" as a dependency on the app deep-link/store hooks (pages-C-01).
- **Acceptance test** host scrubs 200 ticks: viewers' tick within +/- 1 tick after 2 s; pause/resume propagates; viewer Play is disabled while following; late joiner lands on the current state.

### pages-C-50 — Connection robustness: no timeouts, reconnection, end-session or specific errors
- **Severity** high | **Effort** M | **Moves** Reliability, UX | **Depends** pages-C-47 (moot if relay replaces PeerJS) | **audit_refs** []
- **Evidence** joiner never times out: if ICE fails (symmetric NAT/CGNAT with STUN-only or unreachable TURN; commonly cited as 10-20% of WebRTC pairs, not measured here) `conn.open` never fires and status stays "connecting..." (`:250-255`); `peer.on('disconnected')` is unhandled, so a broker drop leaves the host UI saying "hosting" while new joins fail; errors collapse to "connection error -- try again" (`:241`) or "could not connect -- check the code" (`:260,:262`); there is no Leave/End session button (only reloading or re-clicking Host, which silently destroys the session, `:220`); iOS backgrounding kills the connection with no resume.
- **Fix** (if any WebRTC remains) 15 s connect watchdog; `peer.on('disconnected', () => peer.reconnect())`; map `err.type` (`peer-unavailable`, `unavailable-id`, `network`, `server-error`, `socket-error`, `webrtc`) to specific copy; explicit **Leave** and **End session** buttons; auto-retry on `unavailable-id`; own TURN via `config:{iceServers:[...]}` (Cloudflare Realtime TURN, Metered, Twilio) and an optional `iceTransportPolicy:'relay'` privacy mode. With the relay: heartbeat + resume-from-snapshot.
- **Acceptance test** block UDP (network conditioner) -> clear message within 15 s; kill broker connection -> auto-recovers; End session tears down and shows a confirmation.

### pages-C-51 — "Add stop" silently adds tick 1 when the field is empty; out-of-range ticks are clamped without telling the user
- **Severity** medium | **Effort** S | **Moves** Function | **audit_refs** []
- **Evidence** `:281-282` `const tick = Math.max(1, Math.min(675, parseInt(tickEl.value, 10) || 0)); if (!tick) return;` for an empty or non-numeric field `parseInt` gives NaN -> `0` -> `Math.max(1, 0)` = **1**, so `!tick` can never be true and clicking Add stop with nothing typed adds "Tick 1". `700` becomes 675 silently. The input is `type="text"` with `inputmode="numeric"` (`:79`) so letters are accepted.
- **Fix** strict parse; inline `role="alert"` error ("Enter a tick from 1 to 675 or pick a moment"); prefer the key-moment picker (pages-C-53) over raw ticks.
- **Acceptance test** unit tests: '', 'abc', '0', '676', '12.5', ' 12 ' -> errors except ' 12 ' (accepted as 12); Add stop with empty field adds nothing.

### pages-C-52 — Unguarded `localStorage` and `JSON.parse` kill the page's script
- **Severity** medium | **Effort** S | **Moves** Reliability | **audit_refs** []
- **Evidence** `:159` `JSON.parse(localStorage.getItem('gtbg_watch_together_tour') || '[]')` and `:161` `setItem` without try/catch; storage can throw (`SecurityError`) in blocked-storage/private modes and a corrupted value throws in `JSON.parse`; everything after `:159` (renderStops, all handlers) never runs while the map still renders.
- **Fix** `safeStorage` wrapper (pages-C-04) + schema validation (pages-C-46); when storage is unavailable show "Your tour won't be saved after you leave; export it to keep it" and keep working in memory.
- **Acceptance test** Playwright with `localStorage` stubbed to throw: page fully functional, message shown.

### pages-C-53 — Tour authoring and playback UX is a prototype
- **Severity** medium | **Effort** L | **Moves** UX, Completeness | **Depends** pages-C-31/C4 (clock labels) | **audit_refs** [C4, H9]
- **Evidence** stops are raw tick numbers with no day/time (`:172`, "Tick 262"); no picker of the 24 key moments; list is auto-sorted by tick (`:168`) so order cannot be curated; no edit, reorder, undo, title or author; delete buttons are 16 px with the same `aria-label="Remove stop"` on every row (`:172`); Play tour uses a fixed 3.2 s dwell (`:304`) regardless of note length; **Pause restarts from stop 1** (`:297` `playIdx = 0` on every play toggle); no prev/next; import replaces the whole tour with no confirmation or undo (`:326`) and reports errors with `alert()` (`:330`); `#stop-indicator` remains after the tour ends.
- **Fix** editor: key-moment picker (from vignettes/chronology, showing "Day 2, 4:35 PM" via the unified clock), "Add current moment" (from the map camera), inline note edit (280 chars, counter), per-stop duration (auto = 3 s + 60 ms/char), drag or up/down reorder (chronological order optional), title/author fields, autosave with "Saved" status, undo toast (10 s) for delete/import, confirm merge/replace on import. Player: Play/Pause/Resume, Prev/Next, Space/Arrow keys, progress `Stop 3 of 9`, end-of-tour state. Accessible names include stop info ("Remove stop 3, Day 2 4:35 PM").
- **Acceptance test** create/edit/reorder/undo in Playwright with keyboard only; Pause then Play resumes at the same stop; note of 280 chars is fully readable (dwell >= reading time at 200 wpm).

### pages-C-54 — Sharing: file-only, Safari download bug, keyboard-inaccessible import, no link/QR
- **Severity** medium | **Effort** M | **Moves** UX, Mobile | **audit_refs** [A6]
- **Evidence** export creates a Blob URL and calls `URL.revokeObjectURL(url)` immediately after `a.click()` (`:312-318`), which can cancel the download in Safari/iOS and older Firefox (anchor not attached to the DOM); import uses `<label class="btn-sec"><input type=file style="display:none">` (`:90`) so keyboard/AT users cannot focus it; the only share path is a `.json` file, awkward on phones.
- **Fix** "Copy share link" that encodes the tour in the URL **fragment** (`#tour=<base64url(deflate(json))>`, ~1-2 KB for 20 stops; fragments are never sent to the server), auto-loaded through the validator (pages-C-46); Web Share API (`navigator.share({url})` and `{files}` where supported); QR code generated locally; export with `a` appended to the DOM and `setTimeout(revoke, 1000)`; import via a real `<button>` that calls `input.click()` with a visually-hidden focusable input; `?join=CODE` link for live sessions.
- **Acceptance test** iOS Safari downloads the file; a 20-stop tour link opens on another device with identical stops; keyboard-only import works.

### pages-C-55 — Accessibility and mobile layout; caption bar sits over Mapbox logo/attribution
- **Severity** medium | **Effort** S-M | **Moves** Accessibility, ToS compliance | **audit_refs** [A2, A3, A4]
- **Evidence** inputs use placeholders only (`:79,80,97`); `.sync-status` is 10 px (`:49`) and not `aria-live`, so connection changes are silent; heading order h1 -> h3 (`:77,84,87,93`); buttons ~34 px (`.btn-sec` `:41`); `#stops` is a div list not `<ul>`; join input lacks `autocapitalize="characters" autocomplete="off" spellcheck="false"` and there is no form, so Enter does nothing (`:97`). `#caption-bar` (`:34`) is absolutely positioned at the bottom of `#map-wrap` with 20 px left padding, on top of the map's bottom-left Mapbox wordmark and next to the bottom-right controls; the control z-index (2) draws the logo over the caption text and the gradient dims the logo/attribution (visual verification needed; Mapbox requires them to remain visible).
- **Fix** labels, `<h2>` sections, `<ul>`, `aria-live="polite"` on status, wrap join in a `<form>`, 16 px inputs, 44 px controls; move captions **above** the map controls (`bottom: 44px`) or below the map as a caption panel.
- **Acceptance test** axe clean; screenshot at 375/1440 shows logo and attribution unobstructed.

### pages-C-56 — Blocking third-party scripts on every visit for a rarely used feature
- **Severity** medium | **Effort** S | **Moves** Performance, Privacy | **audit_refs** [P4]
- **Evidence** `:16` (Mapbox 481 KB br) and `:19` PeerJS (92.8 KB raw / 25.5 KB gz) both block parsing in `<head>` although only "Live Sync" users need PeerJS; the jsDelivr request happens for every visitor (IP disclosed to a third party) even if they only build a tour.
- **Fix** if PeerJS is retained, load it on first click of Host/Join with a dynamically inserted script carrying `integrity="sha384-..."` and `crossorigin="anonymous"`, pinned version; with the relay (pages-C-47) delete it. Mapbox per pages-C-03.
- **Acceptance test** network log shows no jsDelivr request until Host/Join is clicked; Lighthouse "third-party" shrinks.

### pages-C-57 — Copy inaccuracies: "nothing about your session is stored", lead message vs meta description
- **Severity** low | **Effort** S | **Moves** Trust, Privacy (X5) | **audit_refs** [H7, X5]
- **Evidence** `:104` "nothing about your session is stored anywhere" — but the broker sees IPs and ids, and tours are saved in `localStorage` (`:161`); `:64` leads with Live Sync while `<meta description>` (`:8`) and the page's first paragraph (`:63`) describe async sharing; "treat it as best-effort" is dev-log tone.
- **Fix** copy deck 15.4; disclose exactly what is transmitted and to whom (or, after pages-C-47, that only a room code and tick state pass through our relay for up to 6 hours).
- **Acceptance test** copy review against the final architecture; privacy page cross-checked line by line.

---

## 6. turning-points.html

Page anatomy: nine hard-coded points in an inline `POINTS` array rendered by JS into `<details>` cards (`turning-points.html:51-121`); the `<main id="list">` is empty in the served HTML.

### pages-C-58 — Deep links land on the wrong moment; tick anchors contradict the site's own chronology
- **Severity** high | **Effort** S-M | **Moves** Historical consistency (C4), Core function | **Depends** pages-C-01, unified clock | **audit_refs** [C3, C4]
- **Evidence** links are `/?tick=${p.tick}` (`:118`), which the app ignores (pages-C-01). Even if honoured, the ticks do not match the labels: joining `POINTS` to `chronology_day*.json`:
  | Point (page label) | tick | Chronology row at/near that tick (data clock) |
  |---|---|---|
  | Longstreet's delayed attack (Day 2 afternoon, ~4 pm) | 240 | 6:10am Berdan's sharpshooters into Pitzer's Woods |
  | Chamberlain's bayonet charge (Day 2 late afternoon) | 267 | 8:25am Vincent's brigade arrives on Little Round Top |
  | Wheatfield/Peach Orchard collapse (Day 2 evening) | 300 | 11:10am Bigelow's Trostle Farm withdrawal |
  | Night assault on Culp's/Cemetery Hill (Day 2 night) | 340 | 2:20pm "Fighting dies down across the battlefield" |
  | Cannonade (Day 3 afternoon, ~1 pm) | 540 | 11:15am Union artillery opens |
  | Pickett's Charge (Day 3 afternoon) | 560 | 12:55pm East Cavalry Field |
  The page's prose uses real-world times ("roughly 4:00pm", "Around 1:00pm") that the linked map moments contradict (C4).
- **Fix** key each point by `vignette_id`/chronology id rather than a hand-typed tick, derive the tick at build/load time, and display the unified clock; add an automated consistency test (page label time vs unified clock +/- 20 min) that fails the build; until C4 is resolved, drop clock words from the link label and say "Open the closest moment on the map".
- **Acceptance test** for each point: the map opens on an event whose title/units match the card; test asserts `abs(labelTime - clockTime(tick)) <= 20 min`.

### pages-C-59 — Content exists only after JS runs; the best evergreen content is invisible to crawlers, no-JS users and LCP
- **Severity** high | **Effort** M | **Moves** SEO (T1), Performance (LCP), Accessibility | **audit_refs** [T1, E4]
- **Evidence** `<main id="list"></main>` (`:48`) is empty; nine long articles are injected by JS (`:99-121`). The nine ~110-word "what/debate" texts are the site's most linkable, search-friendly copy (T1: only ~8% of referrals from search). No anchors, no per-item URLs, no JSON-LD.
- **Fix** pre-render static HTML (a one-off Node script that turns `POINTS` into markup; no build system needed): `<article id="bufords-decision">` with `<h2>`, `<details name="turning-points">` (exclusive accordion; check browser support), sources, and a "Share/Embed" control (pages-C-88); `Article` + `ItemList` JSON-LD; in-page anchors updated in `location.hash` when opened; remove the JS-only dependency (progressive enhancement for Expand all/Collapse all only).
- **Acceptance test** `curl` of the page contains all nine titles and bodies; Lighthouse LCP <= 1.5 s on mobile; Google URL Inspection renders content; `#bufords-decision` opens and scrolls to that card.

### pages-C-60 — No sources; several claims need verification; description contradicts body
- **Severity** medium | **Effort** M | **Moves** Historical accuracy, Trust | **audit_refs** [C4]
- **Evidence** the page cites nothing, though the data files list sources (Pfanz, Desjardin, Hessler and Motts, OR Vol. 27). Claims to verify before A+: "over 50% casualties among the attacking force" (`:94`; commonly cited figures for the assault run roughly 40-55% depending on who is counted), "troops from four different Union corps" (`:74`), superlatives "the most famous 'what if' of the entire battle" (`:60`) and "the second-most argued decision of the battle, after Ewell's discretion" (`:95`) presented as fact, and Longstreet "did not get his divisions into attack position until roughly 4:00pm" versus site clock labels (C4). `<meta description>` says "the nine moments historians **agree** could have changed the outcome" (`:8`) while the header says decisions "historians have actually **argued about**" (`:46`).
- **Fix** add a `Sources` list to every card (author, title, page or OR reference) and "Further reading" (NPS Gettysburg pages, key books); soften superlatives ("often called"); reconcile casualty figure with `casualty_apportionment.json` and cite; align meta and body voice; add a corrections contact and "Last reviewed" date.
- **Acceptance test** every factual sentence traceable to a listed source in a review sheet; a second reader (historian/volunteer) signs off.

### pages-C-61 — Semantics and accessibility of the accordion
- **Severity** medium | **Effort** S | **Moves** Accessibility (A6) | **audit_refs** [A4, A6]
- **Evidence** `.tp-title` is a `<div>` (`:109`); subsection headings are `<h4>` (`:114,116`) with no h2/h3 above, so the outline is h1 -> h4; `<div>` inside `<span>` inside `<summary>` is invalid content; `.tp-day` 10 px (`:29`), `.tp-body h4` 11 px (`:34`); chevron glyph not `aria-hidden` (`:111`); closed `<details>` content does not print; no Expand all / Collapse all.
- **Fix** `<summary><h2 class="tp-title">...</h2></summary>` (headings are allowed in summary), `<h3>` subsections, >= 12/14 px, `aria-hidden` on the chevron, `@media print{details:not([open])>*:not(summary){display:block}}` (or `beforeprint` handler), Expand/Collapse all buttons.
- **Acceptance test** axe heading-order clean; screen-reader heading list shows nine h2s; print preview shows all content.

### pages-C-62 — A+ feature completion for Turning Points
- **Severity** low | **Effort** M-L | **Moves** UX, Engagement, Education
- **Content** per-point mini-map (pre-rendered image; avoid live Mapbox per card), timeline strip navigator (Buford -> Pickett's Charge with time-of-day), "Related regiments" (links to `regiment.html?unit=U-20ME`, etc.), "What if?" jump into a matching Sandbox scenario preset, "Copy link"/"Embed" buttons, a "Verdict spectrum" showing where historians differ, glossary tooltips ("enfilade", "salient"), classroom worksheet PDF export.
- **Acceptance test** each card has >= 3 outbound internal links and >= 2 sources; Lighthouse 95+ maintained.

---

## 7. find-ancestor.html

Page anatomy: caveat box, commander-surname text input, state select, results list (max 100) built from the eight OOB regiment files (`find-ancestor.html:68-131`).

### pages-C-63 — The page finds commanders, not ancestors: promise mismatch and a weak funnel to real genealogy
- **Severity** high | **Effort** M | **Moves** UX, Trust (H8), Function | **audit_refs** [H8]
- **Evidence** nav label "Find Your Ancestor" (`site-nav.js:37`, desc "Search regiments by state or commander’s name"); the only text field filters `r.commander.name` (`:99-102`), so a visitor typing their ancestor's surname gets regiments whose *commander* has that string anywhere in his full name (first names included: "joh" matches 50 records). The honest caveat is below the H1 and easy to miss (`:51-53`). There is no next step other than one outbound link.
- **Fix** rename to "Find Your Ancestor's Regiment" everywhere; restructure as a three-step guide: (1) *Find your soldier* — outbound links to the NPS Soldiers and Sailors System search (verified reachable) plus state archives/FamilySearch/Fold3/Find a Grave with a short "what to write down" checklist (name variants, state, company, rank); (2) *Pick the regiment* — typeahead over designations ("20th Maine", "1st Minnesota") plus state/side filters; (3) *Follow it* — biography, battle path, and "Follow this regiment on the map" using the working `/?ancestor=<id>` parameter (`bundle.pretty.js:101019`). Keep the honest caveat, but as a one-line lead under the H1.
- **Acceptance test** usability test (5 genealogists): reach a regiment page from a soldier name in < 2 min; no participant believes the page searched soldier names.

### pages-C-64 — Feasibility: real individual lookup via NPS Soldiers and Sailors (CWSS)
- **Severity** medium (decision record) | **Effort** S (deep links) / XL (own rosters) | **Moves** Feature scope, Legal | **audit_refs** []
- **What I verified** CWSS is an index of ~6.3 M records built from National Archives muster-roll index cards ("name, rank in and out, unit, sometimes company"), ~3.5 M distinct men after duplicates/alias spellings; unit histories for 4,000+ regiments; NPS shows "This database is no longer maintained and updated"; no API, bulk download or licence statement appears on the pages I fetched; the search page's form method/parameters were not visible to my fetcher. `https://www.nps.gov/civilwar/soldiers-and-sailors-database.htm` returns 200; `/civilwar/search-soldiers.htm` and `/civilwar/search-regiments.htm` are the documented entry points. Not verified: any programmatic access, CORS headers, scraping terms.
- **Assessment** a live in-site lookup would need scraping an unmaintained government site without documented terms or CORS, would be fragile, and would send visitor-typed names to a third party via our server; **not recommended**. Feasible options: (1) **deep links** to the CWSS search and regiment pages with copy that explains how to use them (S; do now); (2) **static per-regiment rosters** built from public-domain sources you can lawfully redistribute — candidates to research and license-check: state adjutant-general rosters (e.g., Bates' *History of Pennsylvania Volunteers*, 1869), the *Official Army Register of the Volunteer Force*, Gettysburg Soldiers' National Cemetery burial lists; requires OCR, name normalisation and entity resolution against our 467 IDs (XL, and a separate legal review); (3) **contributed stories**: moderated "Tell us about your ancestor" submissions attached to regiments (needs a backend, moderation and privacy design; L). Recommend (1) now, prototype (2) for one state after the databases plan lands, skip live scraping. Also cite the CWSS provenance caveats (duplicates, alternate names) in the UI.
- **Acceptance test** decision recorded; deep links tested; any future roster ingestion has a per-source licence row.

### pages-C-65 — Matching and sorting: substring on full name, no fuzzy/phonetic, text sort
- **Severity** medium | **Effort** S-M | **Moves** Function, UX (H5) | **audit_refs** [H5]
- **Evidence** `:99-102` `name.includes(surname)` on the entire "Colonel Joshua Chamberlain" string (no word boundary, matches first names and titles); no alternate spellings; `:108` `a.designation.localeCompare(b.designation)` sorts as text: "102nd New York..." before "10th Alabama..." (reproduced); the state list includes "Regular Army" and "Multi-state" among 31 values; 27 of 467 records have no commander name.
- **Fix** token-prefix match on the last-name token plus optional exact-word mode; fuzzy fallback (Damerau-Levenshtein <= 1-2, Double Metaphone/Soundex) with a "Did you mean" line; highlight matches; natural sort `localeCompare(b, undefined, {numeric:true})` grouped by side, then corps/brigade order; add a side filter and a designation typeahead.
- **Acceptance test** "Chamberlain" finds 20th Maine's commander first; "Chamberlin" (typo) suggests Chamberlain; sorted output starts 1st, 2nd, ... 10th, ... 102nd.

### pages-C-66 — Result cards leak internal IDs and omit useful facts
- **Severity** medium | **Effort** M | **Moves** Fit and finish (H7), UX | **audit_refs** [H7]
- **Evidence** `:121` prints `${r.state} · ${r.parent_corps_id} / ${r.parent_brigade_id}` — e.g. "U-I / U-I-1-1"; the 22 Confederate cavalry rows have no `parent_corps_id` and render blank; records contain `strength`, `casualties`, `casualty_percentage`, `days_engaged`, `key_action` (all 467 populated) but none is shown; only one link ("Full regimental biography"); results capped at 100 silently (`:114`) while the count text says the total (latent: the largest state has 75). Six designations appear twice with identical or near-identical text and different IDs (`U-107NY`/`U-107NY-XII`, `U-11PA`/`U-11PA-B`, and the `-b` records of 2nd NY, 5th NY, 18th PA and 1st WV Cavalry), which render as look-alike duplicate cards; data agents should confirm whether these are legitimate second-phase records and add a disambiguating suffix ("Day 3" / "XII Corps").
- **Fix** resolve IDs to "I Corps, 1st Division, 2nd Brigade (Meredith)" from `data/oob/*_oob_*.json`; card facts (strength, losses and %, days engaged, one-line key action); actions: Biography, "Follow on the map" (`/?ancestor=ID`), "Find soldiers (NPS)"; "Showing N of M" and pagination if capped; `role="status"` on the count.
- **Acceptance test** no `U-`/`C-` codes in visible text; every card has >= 3 facts and >= 2 actions.

### pages-C-67 — Accessibility, mobile, URL state and empty-state
- **Severity** medium | **Effort** S-M | **Moves** Accessibility, UX | **audit_refs** [A2, A3, A4, S4]
- **Evidence** no labels on `#surname`/`#state` (`:56-59`); 15/14 px fonts cause iOS zoom (pages-C-05); `.kind-tag` 10 px (`:36`); results link 12 px with inline style (`:123`); the initial state shows nothing until a filter is used (`:106`); no `?state=&q=` URL state, no Clear button.
- **Fix** labels, 16 px, 44 px targets, URL state via `history.replaceState`, "Clear filters", starter cards per state with counts (New York 75, Pennsylvania 74, Virginia 59...) and "Popular: 20th Maine, 1st Minnesota, Iron Brigade", `aria-live` count.
- **Acceptance test** axe clean; a shared URL reproduces the result list.

---

## 8. cinematic-export.html — canvas recording to video

Page anatomy: Mapbox map with `preserveDrawingBuffer:true`, DOM caption bar and recording badge, start/end tick inputs, duration and captions selects, Record button. Recording = `canvas.captureStream(30)` + `MediaRecorder` while a `requestAnimationFrame` loop sets units and calls `fitBounds({duration:0})` per frame (`cinematic-export.html:143-251`).

### pages-C-68 — Recording fails silently where WebM is unsupported (Safari < 18.4) or MediaRecorder is absent; no try/finally
- **Severity** high (critical for iOS users) | **Effort** S | **Moves** Function on Safari/iOS, Reliability | **audit_refs** []
- **Evidence** `:190` `canvas.captureStream` is checked, but `:193-196` calls `MediaRecorder.isTypeSupported` unguarded (ReferenceError where `MediaRecorder` is undefined, e.g. older iOS) and falls back only through WebM variants; `new MediaRecorder(stream, {mimeType:'video/webm'})` throws `NotSupportedError` on Safari before 18.4 (web sources: Safari wrote only MP4 until 18.4, which added WebM). The throw occurs inside an async click handler before `btn.disabled = true` (`:201`) so the user sees nothing at all. Later exceptions (e.g., `recorder.start()`) leave the button disabled and the badge visible because there is no `try/finally`. Chrome writes MP4 only when the OS encoder is present, so MP4 support must be probed, not assumed.
- **Fix**
  ```js
  const CANDIDATES = ['video/mp4;codecs=avc1.640028','video/mp4;codecs=avc1.42E01E','video/mp4',
                      'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  const mime = typeof MediaRecorder !== 'undefined' && CANDIDATES.find(t => MediaRecorder.isTypeSupported(t));
  if (!mime) return showUnsupported();          // explain, link to a supported browser, hide Record
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  try { ... } catch (e) { showError(e) } finally { ui.reset() }
  ```
  Feature-detect at load and show a support notice instead of a live button when unsupported; keep the status region `role="status"`.
- **Acceptance test** browser matrix (below): Chrome, Edge, Firefox, Safari 17 and 18.4+, iOS Safari 17/18: each either records with a playable file or shows a specific unsupported message; forced exceptions restore the UI.

### pages-C-69 — Captions, logo and attribution are not in the exported video; Mapbox attribution is not carried into the file
- **Severity** high | **Effort** M | **Moves** Function (option does nothing), Legal/ToS, Fit and finish | **audit_refs** []
- **Evidence** only `map.getCanvas()` is captured (`:189-192`). The caption bar (`#caption-bar`, `:55`; text set at `:175,226`) is a DOM element, so the "Captions: Nearest moment" option (`:76`) produces nothing in the file; the "Recording" badge is also DOM; the Mapbox wordmark and attribution are DOM controls, so the exported clip is dots on satellite imagery with no title, clock, legend, credits or URL. Mapbox documentation (via search) states maps must display the Mapbox logo and text attribution and that exported images/snapshots require attribution; video is not addressed explicitly, so treat it as required until Mapbox confirms.
- **Fix** composite each frame on an offscreen 2D canvas and record **that** canvas: draw the map canvas, then a title card (first 1.5 s), lower-third caption (vignette title + place + unified clock "Day 2, 4:35 PM"), a small legend (blue Union / red Confederate), the Mapbox wordmark (as an image from the official asset) and the text attribution "(c) Mapbox (c) OpenStreetMap (c) Maxar" (read the real strings from `map.getStyle().sources` attribution / the DOM attribution control at record time), and a subtle site URL. Then `stream = compositeCanvas.captureStream(30)`. Add a "Usage and credits" note by the download button.
- **Acceptance test** exported file frame-grabbed at 0 s, 5 s, end shows title/caption/legend/attribution/wordmark; captions Off removes only the lower third (attribution always present); reviewer checks against Mapbox's current attribution guide.

### pages-C-70 — "Narrated flyover" is false: no audio track and no camera path
- **Severity** high | **Effort** S (copy) / L (narration and camera) | **Moves** Trust (H8), Function | **audit_refs** [H8]
- **Evidence** `<meta description>` (`:8`) "export a narrated flyover video" and `og:description` (`:11`) "Export a narrated flyover video"; the recording has no audio (`captureStream` from a canvas only; no `MediaStreamAudioDestinationNode`); the "flyover" is `map.fitBounds(densestClusterBounds(tick), {duration:0})` every animation frame (`:173,223`), so the camera teleports whenever the densest 0.01 degree grid cell changes.
- **Fix** now: replace copy with "record a silent, downloadable timelapse of any stretch of the battle"; later (L): (a) camera path = keyframes from the densest cluster sampled every ~10 ticks, interpolated with easing and low-pass filtered, applied with `jumpTo` per frame; (b) narration = pre-generated audio per vignette (record source/licence; do not use `speechSynthesis`, it cannot be captured), mixed with `AudioContext.createMediaStreamDestination()` into the recorded stream, captions burned in (pages-C-69).
- **Acceptance test** copy matches capability; when narration ships, exported file has an audio track (`ffprobe`) and camera moves have no jumps > 2% of viewport per frame.

### pages-C-71 — Real-time capture drops frames, misses tiles, varies with device speed; deterministic offline rendering is the A+ design
- **Severity** high | **Effort** XL | **Moves** Function, Performance, Quality | **Depends** pages-C-68/69, pages-C-72 | **audit_refs** [P2]
- **Evidence** progress is wall-clock (`:208-214`): on slow devices frames are skipped; no wait for tiles (`map.loaded()`/`idle`), so early frames show blurry or missing imagery; if the tab is hidden `requestAnimationFrame` stops and the resulting video has a frozen stretch while the status only says "stay on this tab" (`:203`); `setData` and `fitBounds` run every frame although the tick changes only every `duration*1000/tickSpan` ms (15 s over 60 ticks = 250 ms), i.e. ~900 redundant worker rebuilds per clip; `totalFrames` is computed and never used (`:206`); `preserveDrawingBuffer:true` (`:145`) permanently costs GPU memory and throughput on every device (needed only while capturing; test whether `captureStream` works without it).
- **Fix (design)** offline render loop that steps simulation and camera deterministically, waits for the map to be idle, and encodes frames with WebCodecs into an MP4 (H.264) via an MIT-licensed muxer (e.g., mp4-muxer/Mediabunny; check licence and size):
  ```js
  const enc = new VideoEncoder({ output:(c,m)=>muxer.addVideoChunk(c,m), error:showError });
  enc.configure({ codec:'avc1.640028', width:W, height:H, bitrate:10_000_000, framerate:30 });
  for (let i=0; i<N && !cancelled; i++) {
    applyState(i/N);                                   // tick + camera from keyframes
    map.triggerRepaint(); await once(map,'idle');      // tiles loaded, frame painted
    ctx.drawImage(map.getCanvas(),0,0,W,H); drawOverlays(ctx,i);
    const f = new VideoFrame(compositeCanvas,{timestamp: i*1e6/30}); enc.encode(f,{keyFrame:i%60===0}); f.close();
    ui.progress(i/N);
    if (document.hidden) await visible();              // never encode blank frames
  }
  await enc.flush(); muxer.finalize();
  ```
  Render in a separate off-screen `Map` sized W x H (so the UI map is not disturbed) with a fixed pixel ratio; WebCodecs availability must be feature-detected (Chromium, Safari 16.4+, Firefox 130+ per my recollection; verify) with the MediaRecorder path (pages-C-68) as fallback; cap clip length and resolution by device memory (`navigator.deviceMemory`).
- **Acceptance test** 30 s 1080p clip renders in < 3x real time on a mid-range laptop, is exactly 900 frames, frame-hash comparison across two runs equal (deterministic), no blank/blurry tile frames (automated Laplacian variance floor), works when the tab is briefly hidden (pauses and resumes).

### pages-C-72 — No progress, cancel or size limits; debug status text; memory leak; poor download path; low bitrate; unvalidated inputs
- **Severity** medium | **Effort** M | **Moves** UX, Reliability | **audit_refs** []
- **Evidence** status text only (`:203`); Record is disabled for the whole clip (`:201`) so there is no Cancel; done message "Done -- N chunks recorded." (`:240`) is a debug string (always 1 chunk since `recorder.start()` has no timeslice, `:205`); every recording is one in-memory Blob and `URL.createObjectURL` is never revoked (`:243`), leaking across recordings; download anchor uses `a.download` with `.webm` (`:246`) — WebM is not accepted by Instagram/TikTok/iMessage/Photos and iOS Safari may ignore `download` for blob URLs; no `videoBitsPerSecond` (browser default is low for 1080p+, blocky output); `Number('')` = 0 for start/end inputs and values outside 1-675 are not clamped (`:165,181`); only start-tick changes refresh the preview (`:177`); dead code at `:248`.
- **Fix** progress bar with elapsed/remaining and frame count; Cancel button that aborts and frees memory; estimated file size before recording; friendly done message with size, duration and format; revoke old URLs; `videoBitsPerSecond` scaled to resolution (8-12 Mbps for 1080p); MP4 by default; Web Share API with a `File` on mobile plus a plain download link; validation with inline errors; preview on end-tick change as well; presets (pages-C-73).
- **Acceptance test** cancel returns UI to ready within 500 ms and releases memory (heap snapshot); second recording does not grow retained Blob URLs; iOS share sheet offers Save Video; invalid inputs show messages.

### pages-C-73 — Output geometry is whatever the map box happens to be; no presets
- **Severity** medium | **Effort** M | **Moves** UX, Shareability | **audit_refs** []
- **Evidence** `#map{height:56vh;min-height:380px}` (`:27`) so exports are viewport-dependent (e.g., ~1440x500 on desktop = 2.9:1, ~375x380 on a phone, multiplied by device pixel ratio); default ticks 540-600 are arbitrary (`:60-64`); start/end are raw tick numbers.
- **Fix** format presets (16:9 1920x1080, 9:16 1080x1920, 1:1 1080x1080) using the off-screen renderer (pages-C-71) with on-screen crop guides; moment presets from vignettes ("Buford opens the fight", "Little Round Top", "Pickett's Charge") showing "Day 3, 1:05 PM to 2:00 PM" from the unified clock; duration options 8/15/30/60 s with "Match real pace / Compress" explanation; safe-area guides for vertical video.
- **Acceptance test** exported resolution equals the preset exactly on all devices; presets start at the vignette trigger.

### pages-C-74 — Accessibility and mobile polish
- **Severity** medium | **Effort** S | **Moves** Accessibility (A2, A3, A4) | **audit_refs** [A2, A3, A4]
- **Evidence** four `<label>` elements have no `for` and do not wrap their control (`:59-76`); 11 px uppercase labels (`:34`); inputs/selects ~28 px tall and 13.33 px (`:35`), Record ~36 px (`:36`); `#export-status` has no `role="status"`; `#rec-badge` pulse animation runs without a reduced-motion guard (`:30`); the page loads the whole map and 12 data files even on browsers that cannot record.
- **Fix** associate labels, 16 px/44 px controls, live status, reduced-motion, skip data load when unsupported (pages-C-68), focus the download link after completion.
- **Acceptance test** axe clean; keyboard-only record/download.

---

## 9. living-ledger.html — running casualty counter

Page anatomy: clock, giant counter, Union/Confederate split, progress bar, callout box, Restart/Play/speed controls. Cumulative curves are built client-side from `casualty_apportionment.json` engagement periods with a **linear ramp**, and vignette `panel_summary` callouts appear as ticks pass (`living-ledger.html:88-193`).

### pages-C-75 — Starts at "4 casualties" and overshoots the dataset by 838
- **Severity** high | **Effort** S | **Moves** Function, Historical accuracy, Trust | **Depends** none | **audit_refs** [S4]
- **Evidence** `render()` is called at tick 1 (`:193`) and reads `curve[1]`. `buildCurve` (`:102-118`) loops `t = start..end` **inclusive** and adds `casualties/span` per tick with `span = end - start`, so a period is applied over `span+1` ticks: total = casualties x (span+1)/span (up to +5% for 20-tick periods). The U-CAV period `[1,75]` (290 casualties) therefore contributes 290/74 = 3.9 at tick 1 (computed: Union 4, Confederate 0 at tick 1). At tick 675 the page shows **47,001** (Union 23,550, Confederate 23,451) versus the sum of the dataset's period casualties **46,163** (Union 23,138 + Confederate 23,025), an overshoot of 838 (1.8%).
  - Note: period sums are Union 23,138 and Confederate 23,025; `total_casualties` fields sum to 22,803 and 23,125 (the file disagrees with itself, see pages-C-76).
- **Root cause** off-by-one in the increment distribution and cumulative-at-end indexing.
- **Fix** `cum[t]` = casualties **before** tick t (so tick 0/1 = 0 and the header can say "Before the first shot"); distribute exactly with the data's own documented model (bell curve centred on `peak_tick`, sigma 8 ticks infantry / 4 artillery per `metadata.formulas`), normalised so each period sums to exactly `casualties`:
  ```js
  const w = ticks.map(t => Math.exp(-0.5*((t-peak)/sigma)**2)); const s = w.reduce((a,b)=>a+b);
  ticks.forEach((t,i)=> inc[t] += p.casualties * w[i]/s);
  ```
  use largest-remainder rounding so displayed integers sum to the total.
- **Acceptance test** unit tests: cum[0]=cum[1]=0; monotonic; cum[675] equals the sum of period casualties per side exactly; Playwright: initial page shows 0 and label "Before the first shot".

### pages-C-76 — Method, sources and data discrepancies are undisclosed; copy says "minute by minute"
- **Severity** medium | **Effort** S-M | **Moves** Trust, Historical accuracy, Terms consistency | **Depends** data agents to reconcile totals | **audit_refs** [C4]
- **Evidence** `<meta description>` "rise minute by minute" (`:8`) and `.sub` "rising minute by minute" (`:59`), but the data are per-corps engagement periods spread over 5-minute ticks, and the file's own metadata says "bell-curve intensity model weighted toward peak action ticks" while the page uses a linear ramp (comment at `:110`). The dataset contradicts itself: declared `total_casualties` sums (Union 22,803; Confederate 23,125) differ from period sums (23,138; 23,025); `notable_intensity_notes` say the Union III Corps lost ~4,200 "in approximately 2 hours" but `tick_range [256,330]` spans 75 ticks (6.25 h at 5 min/tick) and Pickett's Division "~2,700 in 30 minutes" over `[538,558]` (100 min) — the C4 compression again. `terms.html:30` promises "Where the underlying source data disagrees with itself, this site notes the discrepancy rather than silently picking one number." Nothing on this page does.
- **Fix** "About these numbers" disclosure (method in one paragraph, sources: Official Records and Busey and Martin, "estimates distributed within each corps' engagement window; not a record of individual moments"), label the counter "Estimated casualties so far", show per-period notes in callouts, a "Data notes" list with the two discrepancies and the chosen figure; reconcile `total_casualties` vs periods in the data (data agents); change "minute by minute" to "across the three days".
- **Acceptance test** disclosure present and reachable by keyboard; final totals equal published totals in the disclosure; Terms statement is true.

### pages-C-77 — Clock uses the 5:00 AM-per-day formula and ends "July 3, 11:40 PM"
- **Severity** medium | **Effort** S after C4 | **Moves** Historical consistency | **Depends** unified clock | **audit_refs** [C4]
- **Evidence** `timeForTick` (`:135-144`) = 5:00 + (tick - dayStart) x 5 min; tick 675 renders "July 3, 11:40 PM" (fighting ended late afternoon); initial header "July 1, 5:00 AM" (`:64`) differs from the map's 6:00 base.
- **Fix** shared clock module; show "Day 1 - July 1, 1863" plus clock; end state at the last tick of fighting rather than the last tick of the calendar day.
- **Acceptance test** header equals the map's clock at every tick (parametrised test of 675 ticks).

### pages-C-78 — Play-through UX: Play is dead after the end; no scrubber; labels "1x/3x/10x" are meaningless; no ending
- **Severity** medium | **Effort** M | **Moves** UX, Function (H9) | **audit_refs** [H9]
- **Evidence** at tick 675 `step()` clamps and immediately `stop()`s (`:165-169`), so pressing Play again does nothing until Restart is pressed; `#progress` is a plain div (`:71`), not a slider/progressbar; no scrubbing, no day markers, no keyboard control (Space), vignette callouts only fire on forward play (`lastCalloutTick`, `:157-162`) so seeking would need state re-derivation; speeds "1x/3x/10x" = 80/30/10 ms per tick = 12.5/33/100 ticks/s = 62/167/500 simulated minutes per second (H9 label problem); no closing moment (final totals, context, sources, a moment of reflection).
- **Fix** accessible scrubber (`<input type=range>` with day ticks and `aria-valuetext="July 2, 4:35 PM, 8,412 casualties"`), Play restarts from the beginning when at the end, Space toggles, speeds labelled "Slow / Normal / Fast (about N battle-minutes per second)", closing card (totals per side, comparison "more than the entire population of ..." only if sourced, link to Aftermath, National Cemetery), callouts recomputed from the last vignette <= current tick on seek.
- **Acceptance test** Play at end restarts; scrubbing to any tick shows the correct callout; keyboard operable; labels match measured speeds.

### pages-C-79 — Accessibility, reduced motion and sensitivity
- **Severity** medium | **Effort** S-M | **Moves** Accessibility, Trust | **audit_refs** [A2, A4]
- **Evidence** `#count` and side counters have no accessible name; live announcement would be chatter at 12-100 updates/s so none exists, leaving screen-reader users no way to read totals; `#callout` (`:38`) is not `role="status"`; speed `<select>` unlabeled (`:76`); 11 px labels (`:37`); no reduced-motion handling for rapid counting and the 0.5 s callout fade (`:41`).
- **Fix** names via `aria-labelledby`; `role="timer"`/`aria-live="off"` on counters with a polite `role="status"` region announcing totals on pause, on day change and for each callout; labelled speed control; `prefers-reduced-motion` mode that jumps between key moments instead of counting continuously; content-note line ("This page counts real people.") and a respectful pause option; >= 12 px, 44 px targets.
- **Acceptance test** screen-reader announces totals on pause and key moments only; reduced-motion emulation shows no continuous counting; axe clean.

### pages-C-80 — Timer-driven loop: `setInterval` at 10 ms, hidden-tab behaviour, share/OG
- **Severity** low | **Effort** S | **Moves** Performance (battery), Shareability | **audit_refs** []
- **Evidence** `setInterval(step, 10)` at "10x" performs three `toLocaleString`, several DOM writes and a `vignettes.find` up to 100 times/s (`:148-163,182`); not paused on `visibilitychange`; no share link/OG art (pages-C-02).
- **Fix** `requestAnimationFrame` loop advancing by elapsed time (dt), pause when hidden, cache formatted strings and skip identical writes, add "Share this moment" (`?t=`) and OG image.
- **Acceptance test** scripting < 1 ms/frame; paused when hidden.

---

## 10. privacy.html

### pages-C-81 — Policy is incomplete and in places inaccurate
- **Severity** high | **Effort** S | **Moves** Privacy/legal (X5), Trust | **Depends** final Watch Together architecture (pages-C-47) | **audit_refs** [X5]
- **Evidence** `privacy.html:26-38` lists only Netlify RUM, Mapbox, Google Street View, localStorage, cookies. Missing or wrong:
  1. **Watch Together**: the public PeerJS broker (`0.peerjs.com`) receives IP addresses, peer ids and room codes; WebRTC exposes participants' public IPs to each other; Google STUN and PeerJS TURN servers are in the library's default config (verified in `peerjs.min.js`); the library is served by jsDelivr.
  2. **Mapbox telemetry**: the CSP allow-list already includes `events.mapbox.com`/`.cn` (`netlify.toml:19`); the policy mentions only tile requests.
  3. **AR**: camera, location and motion sensors are used on-device; nothing is uploaded (say so).
  4. **Netlify hosting/analytics**: the owner uses Netlify server-side analytics (page views, referrers, countries) and hosting logs (IP addresses); the page says "no third-party analytics beyond the performance monitoring", which is inaccurate if Web Analytics is on. The RUM beacon host is `ingesteer.services-prod.nsvcs.net` (X3).
  5. **Storage inventory** incomplete: bookmarks (`gettysburg_bookmarks`, `bundle.pretty.js:97821`), onboarding flag (`gtbg_onboarded`), Watch Together tour (`gtbg_watch_together_tour`, `watch-together.html:159`), planned layout preference, service-worker Cache Storage, Immersive volume (pages-C-25), Historian session history (pages-C-21).
  6. `:41` "It collects no personal information from any visitor, including students" is too absolute: hosting and map providers process IP addresses.
  7. No mention of Google Street View iframe cookies beyond a generic line, of user-exported files staying on-device (tours, videos), of retention, or of user rights/contact for EU/UK/California visitors.
  8. "Last updated: September 7, 2026" (`:21`) predates the current build.
- **Fix** rewrite as a provider table (Provider | What they receive | When | Their policy), a "What stays on your device" list with each storage key, "What we never do", "Your choices" (block third-party requests, clear site data, use the User Guide offline?), retention statement for the relay (rooms expire after 6 h), children's paragraph rephrased, contact and date; owner to get counsel to review (this is not legal advice). Keep it plain-language (Flesch >= 60).
- **Acceptance test** a checklist maps every third-party origin in the CSP/network logs and every storage key in the code to a sentence in the policy; date updated; link present in footer of every page.

### pages-C-82 — Presentation, navigation and discoverability of policy pages
- **Severity** medium | **Effort** S | **Moves** Fit and finish, Accessibility, SEO (E5) | **audit_refs** [E5, A6]
- **Evidence** `privacy.html` and `terms.html` have no site nav/footer, no `<main>`, no skip link; body `p` renders Georgia 16 px while `ul` is `system-ui` 15 px (`privacy.html:16`), `.updated` is hard-coded text; no anchors on `h2`; not in `sitemap.xml` (E5); no print style; no OG.
- **Fix** use the shared shell (pages-C-07/09), `<time datetime>` for dates, `id` anchors on headings, print CSS, add both to the sitemap, add a "Changes" log.
- **Acceptance test** axe clean; both URLs present in sitemap; keyboard navigation from footer link to page and back.

---

## 11. terms.html

### pages-C-83 — Embedding and data-reuse terms are unsupported: no widget docs, no data licence, conflicting frame headers
- **Severity** high | **Effort** S (text) + M (data package) | **Moves** Legal, Docs, Ecosystem | **Depends** pages-C-87/88 | **audit_refs** [X4]
- **Evidence** `terms.html:27` invites "embedding its widget on your own page" while `/embed.html` returns `X-Frame-Options: DENY` plus `frame-ancestors *` (verified, pages-C-87) and no documentation exists (pages-C-88); the same paragraph forbids scraping "the underlying data files for republication as your own dataset" although `/data/*.json` is served publicly with `Cache-Control: public` and no licence; `:33` says the facts are free but asks for credit for "substantial excerpts" without defining a licence or citation format; `:30` cites Busey and Martin tabulations (a copyrighted compilation) without an attribution/permission statement.
- **Fix** decide and state a licence: e.g. text and vignettes CC BY 4.0, compiled data CC BY 4.0 or ODbL with the citation string "Legere, M. Gettysburg Interactive Map (gettysburginteractivemap.com), accessed <date>"; publish an official `data.zip` with `LICENSE`, `CITATION.cff` and a data dictionary to reduce scraping; per-source ledger for the historian databases (source, licence, redistribution permitted, attribution); link the widget docs from Terms; counsel review of use of Busey and Martin and any book-derived text.
- **Acceptance test** Terms link to embed docs and data licence; `data.zip` exists with checksums; an outside reader can cite the site correctly.

### pages-C-84 — Missing clauses: independence from NPS, AR safety, user content, third-party terms, liability, takedown
- **Severity** medium | **Effort** S-M | **Moves** Legal, Trust | **audit_refs** [X5]
- **Evidence** `terms.html` contains only service, acceptable use, accuracy, IP, no-warranty, changes, contact. Absent: statement that the site is independent and **not affiliated with the National Park Service, Gettysburg Foundation or Gettysburg Battlefield** (domain and title could imply otherwise); physical-safety and park-rules notice for AR; user-generated content (tour notes, exported videos) responsibility and licence; third-party terms (Mapbox, Google, Netlify); limitation of liability and governing law; DMCA/takedown and a corrections process for historical errors; accessibility statement link; the Terms claim of noting discrepancies (pages-C-76) is not currently true.
- **Fix** add those sections in plain language, link "Report an error" to a prefilled mailto (page, URL, what is wrong, source), publish an accessibility statement page; counsel review.
- **Acceptance test** checklist sign-off; footer links to Accessibility and Corrections.

---

## 12. 404.html

### pages-C-85 — 404 has good voice but no recovery paths
- **Severity** medium | **Effort** S | **Moves** UX, Fit and finish | **audit_refs** [T2]
- **Evidence** `404.html` has no nav/footer/`site-nav`, no search, no popular links, no `<main>`, does not show the path that failed; CTA is ~41 px tall (14 px + 24 px padding, `:18`). Voice ("This ground isn't on the map.") is strong. The scanner traffic (~1,900 404s/30 d, T2) is unaffected.
- **Fix** include the shared shell, show `location.pathname` in a `<code>` element, "Did you mean" from a static slug list using edit distance (also handles `.html` vs extensionless and case), a compact list of the 20 tools in five groups, search box to `/search.html?q=`, "Report a broken link" mailto with the path prefilled; keep `noindex` and status 404; CTA >= 44 px.
- **Acceptance test** `/historain` suggests `/historian`; Lighthouse a11y 100; status code 404.

### pages-C-86 — Duplicate URL forms with different cache policy
- **Severity** low | **Effort** S | **Moves** SEO (T3), Performance | **audit_refs** [T3]
- **Evidence** `curl`: `/historian` -> 200 `Cache-Control: public,max-age=0,must-revalidate`; `/historian.html` -> 200 `Cache-Control: no-cache,must-revalidate` (`netlify.toml:63` rule matches only `*.html`). Canonical tags point to the `.html` forms; the sitemap uses `.html`.
- **Fix** choose one form (recommend extensionless), 301 the other with `force = true`, update canonicals/sitemap/internal links, and test on a deploy preview for redirect loops (Netlify serves `/x` from `x.html` internally; unproven, so verify).
- **Acceptance test** exactly one URL form returns 200 per page; analytics no longer splits.

---

## 13. embed.html — the widget

### pages-C-87 — Header conflict: `X-Frame-Options: DENY` and `frame-ancestors *` on the same response, plus the site-wide report-only CSP
- **Severity** medium | **Effort** S | **Moves** Security hygiene (X4), Function | **audit_refs** [X4]
- **Evidence** live `curl -D-` of `/embed.html`: `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors *`, and still `Content-Security-Policy-Report-Only: default-src 'self'; ...`. `netlify.toml:6-13,19` sets the global values; `:81-85` tries `X-Frame-Options = ""` and `Content-Security-Policy-Report-Only = ""`, which did not remove them. Modern browsers give `frame-ancestors` precedence and ignore X-Frame-Options when both are present (CSP spec/MDN; verify in Safari and older browsers), so embedding likely works, but it is one header-change from failing and the state is unreviewable. Netlify docs do not document removing an inherited header for one path.
- **Fix** use a Netlify Edge Function bound to `/embed*` (deterministic, testable):
  ```ts
  export default async (req: Request, ctx: Context) => {
    const res = await ctx.next();
    res.headers.delete('x-frame-options'); res.headers.delete('content-security-policy-report-only');
    res.headers.set('content-security-policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors *");
    return res; };
  export const config = { path: ['/embed', '/embed.html'] };
  ```
  (Once inline script/style are moved out, pages-C-11.) Alternatively split the global rule into explicit path groups that exclude `/embed*` — not possible for `*.html` without negation, hence the Edge Function. Decide policy: `*` (any site) vs an allow-list; recommend `*` for a public read-only widget with no credentials.
- **Acceptance test** `curl -I /embed.html` shows exactly one CSP and no X-Frame-Options; a test page on another origin (localhost:8080, jsfiddle) embeds it in Chromium, Firefox and WebKit; `/index.html` still returns DENY.

### pages-C-88 — No widget documentation, generator or oEmbed; usage exists only in a JS comment
- **Severity** high | **Effort** M | **Moves** Docs, Ecosystem/SEO (T1), Education | **Depends** pages-C-87 | **audit_refs** [X4]
- **Evidence** usage is documented only at `embed.html:38-39` (`embed.html?vignette=V-018` or "today's pick"); Terms invite embedding (`terms.html:27`); vignette ids V-001...V-024 are not published anywhere; no snippet, size guidance, iframe `title`, theme option or resize protocol; no `<link rel="alternate" type="application/json+oembed">` on any page.
- **Fix** create `/embed-docs.html` ("Add a Gettysburg moment to your page") with live preview, vignette picker, theme (`dark|light|transparent`), size presets and a copyable snippet:
  ```html
  <iframe src="https://gettysburginteractivemap.com/embed.html?vignette=V-018&theme=light"
          width="480" height="260" style="border:0;max-width:100%" loading="lazy"
          title="Gettysburg moment: Chamberlain's Charge" referrerpolicy="strict-origin-when-cross-origin"></iframe>
  ```
  add "Embed this" buttons on vignette cards (Documentary, Turning Points, Historian answers); `postMessage({type:'gtbg-embed-resize',height})` from the embed with docs on validating `event.origin`; oEmbed: static JSON per vignette (`/oembed/V-018.json` with `type:"rich"`, `html` = the iframe, `width/height`, `provider_name`, `title`) and `<link rel="alternate" type="application/json+oembed">` on the corresponding pages, optionally a `/oembed?url=` Netlify Function; attribution requirement in Terms.
- **Acceptance test** an outside teacher can embed in Google Sites/Canvas from the docs in < 5 min; oEmbed validator (oembed.com tools) passes; iframe resizes to content.

### pages-C-89 — Widget quality: dead CTA, heavy data, timezone-dependent pick, tiny low-contrast text, no semantics
- **Severity** medium | **Effort** S-M | **Moves** UX, Accessibility, Performance | **audit_refs** [A1, A4]
- **Evidence** CTA `href` is `index.html?tick=..&vignette=..` (`:60`), ignored by the app (pages-C-01); three fetches of ~19-21 KB vignette files (`:44-46`) to show one blurb; the daily pick uses the viewer's local time `dayOfYear % 24` (`:53-55`), so the same page differs by visitor around midnight and never explains itself; invalid id shows a generic error with no fallback (`:51,67`); `.eyebrow` and `.brand` are 10 px (`:13,17`); `.brand` `#555` on `#0a0a14` is **2.64:1** and `.brand a` `#777` is 4.40:1 (both below 4.5:1); no heading elements (`div.headline`), dark only; `embed` sets `robots noindex` correctly.
- **Fix** precomputed `data/embed-index.json` (id, title, summary, tick; ~10 KB) or per-vignette JSON; UTC-based daily pick with a visible "Moment of the day" label; fall back to the daily pick for an invalid id; `<h1>`/`<p>`, >= 12 px, contrast >= 4.5, `prefers-color-scheme` and `?theme=`; CTA via `gtbgLink`; `lang`; keep no cookies/no third parties.
- **Acceptance test** axe clean inside an iframe; payload < 15 KB; screenshot in light and dark hosts.

---

## 14. diagnostics.html and unit-rendering-reference.html

### pages-C-90 — diagnostics.html ships in the publish directory and is hidden only by a forced redirect
- **Severity** medium | **Effort** S (remove) / M (support page) | **Moves** Security hygiene, Support | **audit_refs** [X4]
- **Evidence** live `/diagnostics.html` returns 404 (forced by `netlify.toml:189-196`, `force = true`); the file is still in the deploy (4,824 B). If the rule is edited or lost, a developer tool with no `noindex`, no viewport meta (`diagnostics.html:4-5`), and unsafe string concatenation via repeated `out.innerHTML +=` (unclosed `<div class="sec">` at `:30`, async rows appended out of order at `:72-74,109-114`) becomes public and indexable. It also leaks the full UA, GPU renderer strings and localStorage key names.
- **Fix** remove it from the publish directory (move to the repo's `tools/`); optionally replace with a user-facing `/support.html` ("Having trouble?"): WebGL2 check, storage, service worker, Mapbox reachability, screen/DPR, then a **Copy report** button producing a short text block for bug reports (shows exactly what will be copied, no automatic upload), using the shared shell, indexable, linked from the Help modal's "map won't load" case. Add `Disallow` lines to `robots.txt` only for paths that must not be crawled.
- **Acceptance test** `curl` shows 404 with the file absent (no reliance on the redirect); support page passes axe and copy report contains no PII beyond UA/GPU.

### pages-C-91 — unit-rendering-reference.html is a live developer prototype with dev-log copy and an always-on render loop
- **Severity** medium | **Effort** S | **Moves** Fit and finish, Security hygiene, Performance (battery), SEO cleanliness | **audit_refs** [X4]
- **Evidence** live 200 with `noindex` (`:8`); not in sitemap or any link (grep over all HTML/JS: no reference); loads Mapbox GL 3.24.1 from the CDN with the public token (`:9-10,56`); copy narrates the build: "the build plan", "compiled bundle with no source project to edit", "copied into the real app's source the moment that project is recovered or rebuilt" (`:34-35`); `pulseTick` calls `map.setPaintProperty` on **every animation frame forever**, even while paused or in a background tab (`:222-234`), keeping the GPU busy; no `robots.txt` Disallow. Version check: bundled app = 3.24.1 (`bundle.pretty.js:53873`) = CDN pin, so no skew today but the page pins a version in a ninth place (pages-C-03).
- **Fix** unpublish (move to `docs/prototypes/`, keep in git); port the four demonstrated techniques (interpolated movement, bearing icons, symbol collision, engaged halo) into the reconstructed app source (the deployed bundle already contains an `InterpolationWorker` chunk, so confirm what is shipped before re-implementing); if kept, gate behind `?dev=1`, add an `X-Robots-Tag: noindex` header, stop the rAF loop when idle/hidden, and rewrite copy.
- **Acceptance test** URL 404; no references in code; if kept, CPU idle < 1% when paused.

---

## 14.1 pages-C-92 — Automated regression suite (Playwright + axe-core + Lighthouse CI + data contracts)
- **Severity** high | **Effort** L | **Moves** every category (prevents regressions), Reliability | **Depends** none (can start first) | **audit_refs** [N1, P1, P2]
- **Evidence** none of the defects above (dead links, "undefined", 4 casualties, off-screen buttons, broken OG image) would survive a basic smoke test; the project has no tests and no source (N1).
- **Fix** create `tests/` in the reconstructed repository (or a standalone test repo that runs against the deployed URL/deploy preview): (1) **Data contract tests** in Node: every renderer field exists (no "undefined"), ids resolve, tick ranges valid, cumulative casualty invariants, vignette ids unique; (2) **Link crawler**: every internal href resolves (including query-param deep links round-tripping); (3) **Playwright** projects Chromium/WebKit/Firefox x desktop (1440x900) / mobile (375x812, 320x568, landscape 812x375): per-page smoke, offline/error states, keyboard-only flows, reduced-motion, scroll/keyboard behaviour for Historian, permission-denied AR flows with fake devices, MediaRecorder capability matrix; (4) **axe-core** on every page and modal state; (5) **Lighthouse CI** budgets per page (mobile: perf >= 95, a11y 100, best practices >= 95, SEO 100; LCP <= 2.5 s, CLS <= 0.1, TBT <= 200 ms; desktop the same) and header assertions (`curl -I` script for CSP/XFO/cache/Permissions-Policy per path); (6) visual regression at 320/375/768/1440. Run on every deploy preview; block promote on failure.
- **Acceptance test** suite fails today on each finding it targets and passes after fixes; CI runtime < 10 min.

---

## 15. Copy deck (museum voice: plain, specific, honest about limits, no build-log narration)

Style rules: no " -- "; no "we haven't been able to"; no "AI-style"; state what the tool does, what it does not, and what leaves the device. Verify every claim against the final behaviour before publishing.

| Page | Replace | Proposed copy |
|---|---|---|
| 15.1 Historian (`historian.html:48`) | 74-word "how" box | "Ask about a regiment, a commander, a place or a moment. Answers come only from this site's own records (**{n} regiments and batteries, {n} narrated moments, {n} timeline events, {n} terrain features**) and every answer shows its sources. This is a search tool, not an AI: if the records do not cover your question, it will say so." (counts computed at load) |
| 15.2 Immersive (`:46-47`) | sub + caveat | "Hear the battle as the map plays. Cannon and musket sound is synthesized in your browser from the artillery and infantry positions on the map. It is an impression, not a recording, and it goes quiet where the records show no fighting. Contains sudden loud sounds: lower your volume before you start, especially with headphones." |
| 15.3 AR (`ar.html:55-56`) | sub + caveat | "See where landmarks lie around you while you stand on the field. Battlefield AR uses your phone's camera, location and compass; nothing leaves your device. Expect compass direction to be off by 10-15 degrees and GPS by 5-30 metres, so treat labels as pointers, not survey marks. Beta. Keep your eyes up: watch traffic and uneven ground, and follow National Park Service rules." |
| 15.4 Watch Together (`:63-64,104`) | status note | "Build a guided tour of the battle and share it as a link, or watch the same moment together with someone else. In a live session only a room code and the current moment pass through our server, and they are deleted after six hours. Your tour is saved in this browser only." (adjust to final architecture) |
| 15.5 Cinematic Export (`:8,11,49`) | description/sub | "Record a silent, shareable video of any stretch of the battle, made entirely in your browser. Nothing is uploaded. Every video carries the map credits." |
| 15.6 Living Ledger (`:8,59`) | description/sub | "An estimate of the battle's human cost across the three days, spread over each corps' recorded engagement windows from published casualty totals. It is a model, not a record of individual moments. Every number is a person." |
| 15.7 Find Your Ancestor (`:48,51-53`) | sub + caveat | "This site does not list individual soldiers. Find your ancestor in a soldier database first (steps below), then come back to follow his regiment through the battle." |
| 15.8 Turning Points (`:8,46`) | description/sub | "Nine moments where the battle might have gone another way, and what historians actually argue about each one, with sources." |
| 15.9 404 (`:26`) | body | keep "This ground isn't on the map."; add "You asked for `{path}`." and the recovery list |

---

## 16. A+ target specification per page (definition of done)

Common to all pages (mobile 375x812 and desktop 1440x900): Lighthouse >= 95 in Performance, Accessibility (100 target), Best Practices, SEO; LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1, FCP <= 1.8 s, TBT <= 200 ms; zero console errors/warnings; axe 0 violations; all targets >= 44 px on touch, text >= 12 px (body 16 px); keyboard-complete; reduced-motion respected; no horizontal scroll 320-2560; CSP-clean; unified clock and shared deep links; copy deck applied; OG/Twitter art present.

| Page | Page-specific A+ criteria |
|---|---|
| historian | latest answer top always visible above the input (375 and 1440); answer card model with sources on 100% of answers; no-answer state for out-of-scope queries; screen-reader announcement; `?q=` share; no "undefined"/IDs; works offline with clear error |
| immersive | silent start, mute, persisted volume, limiter test passes (peak <= -6 dBFS), night/no-fight silence, iOS silent switch handled, captions, resume after interruption |
| ar | iOS and Android permission flows pass on device, heading error < 5 degrees at 3 test spots, declination applied, no leaked streams/watchers, list view, preview mode on desktop, tappable de-cluttered markers, honest disclaimer and safety text |
| watch-together | no third-party runtime dependency (or fully disclosed and lazy), sanitised import, share link, host/viewer roles with follow/explore, reconnect, end session, room-code security tests pass |
| turning-points | static prerendered HTML, anchors, sources per card, clock-consistent links that actually deep-link, print styles, Article JSON-LD |
| find-ancestor | truthful name and 3-step flow, fuzzy/phonetic matching, natural sort, names not IDs, per-regiment facts and actions, URL state |
| cinematic-export | records or explains on every supported browser (incl. iOS), MP4 with burned-in title/clock/legend/attribution, deterministic render, progress/cancel, presets, no false "narrated" claim |
| living-ledger | starts at 0, totals equal dataset exactly, method disclosure, scrubber, replay from end, accessible summaries, reduced-motion mode |
| privacy / terms | complete provider table and storage inventory, licence and embed terms, NPS independence and AR safety, corrections channel, shared shell, sitemap |
| 404 | recovery paths, did-you-mean, shows path, shared shell, status 404 |
| embed | one clean header set, docs + generator + oEmbed, resize protocol, theme param, contrast >= 4.5:1, < 15 KB payload |
| diagnostics / unit-rendering-reference | removed from publish directory (or replaced by a user-facing support page) |

---

## 17. Test matrix

- **Devices/browsers** iPhone SE (320/375) and iPhone 15 (Safari, iOS 17 and 18); Pixel 8 (Chrome); Samsung (Samsung Internet); iPad Safari; Windows Chrome, Edge, Firefox; macOS Safari 17 and 18.4+, Chrome. Legacy check for Safari < 18.4 (WebM absence) and iOS < 16.4 (no `audioSession`).
- **Assistive tech** VoiceOver (iOS and macOS), TalkBack, NVDA with Firefox and Chrome, keyboard-only, browser zoom 200% and 400%, forced-colors, `prefers-reduced-motion`.
- **Network and state** Slow 4G with 4x CPU throttle (Lighthouse), offline, blocked `/data/*`, blocked `api.mapbox.com`, blocked storage, blocked third-party, low-power mode, background/lock/unlock during audio, AR and export.
- **On-site** AR at Little Round Top, Cemetery Ridge (Angle), Oak Ridge and the town square with two phones; record heading/GPS traces to build replay fixtures.
- **Security** XSS fuzz for tour import and all `innerHTML` sinks; header assertions per path; room-code brute-force/rate-limit test; permission-policy checks.

## 18. Sequencing and dependencies

1. **Tier 0 (about 3-4 person-days): stop the visible wrongness.** pages-C-16 (chronology "undefined"), 51, 46, 75, 24 (drone on pause), 36 (leaked camera/GPS), 34 (iOS order), 68 (unsupported message), 02 (real OG art), 05, 12/40/57/70 copy edits, 90/91 unpublish, 87 header test, 10, 44.
2. **Tier 1 (about 8-10 days): shared plumbing.** pages-C-04 data/storage helpers, 06/07/09/13 shared shell and CSS (unblocks 18, 30, 55, 61, 67, 74, 79), 03 Mapbox loading/config, 08 head partial, 92 test suite skeleton. These parallelise everything else and lift Lighthouse on all pages.
3. **Tier 2 (about 20 days): page rebuilds that do not need new infrastructure.** Historian card UI (14, 15, 17, 18-23), Immersive engine v2 (25-33), AR v2 (35, 37-43), Turning Points prerender (58-61), Find Ancestor guide (63, 65-67), Living Ledger (76-80), 404/policy pages (81-86).
4. **Tier 3 (about 25-30 days): needs new infrastructure or cross-team inputs.** Watch Together relay and shared-state model (47-50, 53-54) [Netlify Functions/Blobs or Cloudflare]; Cinematic Export v2 (69-73) [WebCodecs + muxer, attribution decision]; embed docs/oEmbed (88-89); deep-link router in the app (01, external); unified clock (31, 58, 77, C4 external); data licence/legal review (83-84); roster/ancestor content (64 option 2).
- **Cross-agent dependencies** app deep-link router (01); unified clock module (C4: 31, 53, 58, 77); retrieval/database architecture (17, 23); data reconciliation (76); shared nav owner (06, 10, 13); security agent for header strategy and CSP (11, 45, 87).
- **Rough effort roll-up** 40 S (~12 d) + 41 M (~50 d) + 9 L (~30 d) + 1 XL (~7 d) = about 95-100 person-days if done serially by one developer; the shared shell, test suite and data helpers remove roughly 15-20% of the page-level effort. The owner can reach "no visibly broken behaviour" with Tier 0 plus Tier 1 (~2-3 weeks).

## 19. Open questions for the owner

1. Live Sync: adopt an owned relay (Netlify Function + Blobs recommended first) or keep PeerJS with disclosure? Any plan/quota constraints on Functions?
2. Content and data licence (CC BY 4.0? ODbL?) and comfort with publishing a `data.zip`; counsel review of Busey and Martin use.
3. Who can field-test AR on site, and with which phones? Until then keep the Beta label.
4. Narration for Cinematic Export: budget, voice, licence for audio.
5. Product name (E2): "Animated Battlefield Map" vs "Interactive Map" — apply once everywhere.
6. Is Netlify Web Analytics enabled (the privacy page must say so)?
7. Should the embed be allowed on any site (`frame-ancestors *`)?
8. Is the reconstructed source (N1) going to become the canonical repo? The regression suite and shared modules need a home.
9. Ancestor feature: link-out guide only, or moderated contributed stories later?

## 20. Uncertainties and things I did not do

- No browser was used (BRIEF), so nothing visual was rendered: caption/logo overlap (pages-C-55), marker pile-ups (pages-C-39, computed from data only), scroll behaviour (pages-C-14, derived from CSS/JS), and all iOS/Safari behaviours are inferred from code and web sources and must be confirmed on devices.
- The claim that the iOS user gesture is lost in the AR await chain is an inference from platform rules; confirm on an iPhone (pages-C-34).
- Declination value, portrait camera FOV, WebCodecs support versions, `details name` support, Netlify Blobs option names and Netlify header-override semantics were not verified against primary documentation.
- I did not test any third-party service beyond a GET to `0.peerjs.com` and the NPS pages; no data was sent anywhere.
- Legal points (licences, Mapbox video attribution, privacy wording) need professional review; the plan flags them as questions, not conclusions.
- Data-side issues that surfaced (duplicate designations, `total_casualties` vs period sums, `Gulp's` typo) are reported for the data agents to own.

## 21. Scripts and artefacts (all in `plan-work/tmp-pages-C/`)

`immersive_stats.js` (audio trigger statistics), `ledger_stats.js` (Living Ledger totals), `ancestor_stats.js` (regiment/state/matching stats), `historian_sim.js` and `historian_chron.js` (page-logic replays incl. the "undefined" proof), `tp_ticks.js` (turning-point ticks vs chronology and clocks), `ar_stats.js` (marker visibility and bearing-error magnitudes), `contrast.js` (WCAG ratios), `peerjs.min.js` (downloaded 1.5.4 for inspection), `day3_fixed_rgba.png`/`day3_preview.png` (the OG placeholder decoded as RGBA).

---

## Verification

Adversarial verifier pass. Verifier scripts and downloads are in `plan-work/tmp-verify-pages-C/` (`hist.js`, `imm.js`, `audio.js`, `ledger.js`, `tp.js`, `peer.min.js`, `mbgl.js`). Method: re-opened every cited line in DEPLOY_DIR and `bundle.pretty.js`, re-ran the specialist's numeric claims with my own scripts, curled the live site and third-party CDNs, cross-checked against other specialists' lab Lighthouse runs (`tmp-perf-cwv/lab/lh_page_*_mobile.json`), and fetched the cited web sources. No browser or device was used (BRIEF), so behavioural claims that need a device stay labelled "inference".

**Overall.** The report is evidence-dense and mostly accurate: line numbers matched everywhere I checked, and the headline numbers reproduce exactly (137/137 "undefined", Living Ledger 4 to 47,001 vs 46,163, 662/675 cannon ticks, 22/30 AR labels, identical corrupt PNG, live header conflict on `/embed.html`). Real errors found: gzip mislabelled as brotli (C-03), a wrong byte total (C-23), one refuted performance premise (C-06), three over-rated severities (C-24, C-26, C-63), an unsafe blanket declination fix on iOS (C-35), a rate-limit design that would 429 a classroom (C-47), a data-source gap that makes C-16's "every answer has a source" impossible without data work, and a wrong vignette id in the embed snippet (C-88).

### Verdict table (all critical/high, plus 30 medium/low)

| ID | Sev (report) | Verdict | Evidence / correction |
|---|---|---|---|
| C-01 | high | CONFIRMED | `bundle.pretty.js:101019` is the only `location.search` reader; writer `$k` at `:97823-97832` emits `t,u,z,ll` that nothing reads (`u` = selected unit id, `:97905-97929`). Dead emitters verified at `historian.html:110`, `turning-points.html:118`, `embed.html:60`, `regiment.html:247`, `documentary.html:92`, `education.html:81`, `search.html:114,127`. Note `regiment.html:252` does read `?unit=` itself (works), so `historian`/`find-ancestor` links to `regiment.html?unit=` are fine. |
| C-02 | high | CONFIRMED | Reproduced: md5 `3f6646c9...` for both files, 17,585 B, IHDR colour type 2, inflated IDAT 3,687,120 = RGBA size (RGB would be 2,765,520). Scope is wider than stated: `og:image` = `day3.png` on 21 HTML pages (all sub-pages plus index), not only the 9 listed. |
| C-03 | high | CORRECTED | 481,197 B is the **gzip** size, not brotli. Live `curl` of `mapbox-gl-js/v3.24.1/mapbox-gl.js`: `Accept-Encoding: br` = 385,039 B, `gzip` = 481,197 B, identity = 1,796,551 B (the "481 KB br" also recurs in the findings JSON). Everything else confirmed: 9 pages with the sync `<script>` in `<head>` and the pasted token; lab Lighthouse (perf-cwv) shows camera/viewshed/sandbox/ground-remembers at 68-69 mobile, FCP 4.1-4.2 s, LCP 5.4 s. |
| C-04 | high | CONFIRMED | No `res.ok`/catch/timeout at the cited lines; unguarded `JSON.parse(localStorage...)` at `watch-together.html:159` (the async IIFE rejects so every handler below never registers); only `embed.html:64` has try/catch. |
| C-06 | high | CORRECTED (severity high to low) | Premise refuted by measurement. `site-nav.js` is a parser-blocking script at the end of `<body>` (`historian.html:60`), so `render()` (`site-nav.js:164`) runs at DOMContentLoaded, normally before first paint. Lab Lighthouse 13.5 mobile on the replica: regiment, documentary, search CLS = 0; historian CLS 0.0564 and dashboard 0.1446 with a single shift each, culprit `body > footer#gtbg-footer` (async content growing above the footer), no nav shift; FCP 0.8-0.9 s, LCP 1.1-1.2 s, so the 340 ms body fade (`site-nav.css:12`, already disabled under reduced motion at `:14`) is not measurably harmful. Keep `min-height` on both mounts as cheap insurance, but the real CLS fix is reserving space for the async content above the footer (see pages-B). |
| C-10 | med | CONFIRMED | `site-nav.js:211-227` logic as described. |
| C-13 | med | CONFIRMED | Contrast recomputed: `#6f7686` on `#12121e` = 4.08, on `#0a0a14` = 4.32, `#8a93a8` on `#12121e` = 6.03. The Historian pin below 640 px is about 48x34 px (18 px icon plus 14 px side padding), so wide enough and about 10 px short in height. |
| C-14 | high | CONFIRMED (static reasoning) | `#ask-row` sticky at `historian.html:35`, `scrollIntoView({block:'end'})` at `:174`, up to 4 `addMsg` calls per ask (`:178,:191`). Behaviour not run in a browser. |
| C-15 | high | CONFIRMED | Recomputed 24 vignettes: min 206, median 303, max 375 words; `:109` renders full `full_script`; `.msg` 14px/1.65, `max-width:88%`. |
| C-16 | high | CORRECTED | Core confirmed exactly: chronology keys are `tick,time,event,units_involved,location,significance` (plus `narrative` on 9 Day-2 rows and `flag` on 20 Day-3 rows); 137/137 events lack both `title` and `description`; `historian.html:119,123` as cited; `index.html:377` says "an AI-style historian". Corrections: (1) the proposed "Sources row from file `metadata.sources`" and the 100%-source acceptance test are not achievable with current data: 5 of the 15 files the page loads have no source metadata (see MISSED-2); (2) do not render `flag` (MISSED-1); (3) rendering `e.time` re-publishes the C4 clock. |
| C-17 | high | CONFIRMED | Reproduced with the page's scorer (`hist.js`): "20th Maine" returns Chamberlain's Charge (14.3), 15th Alabama (11.0), Little Round Top (11.0) and not the 20th Maine record (9.5); "who commanded the Iron Brigade" returns Reynolds Falls, Archer Captured, 19th Indiana; "Gettysburg Address" three vignettes at 3.9; "what happened at the wheatfield" three regiments at 3.0; the page's own placeholder "What happened to the 1st Minnesota?" ranks 8th Alabama and Plum Run under the vignette and above the 1st Minnesota regiment record. Nuance: the 15th Alabama wins because its `key_action` contains "20th Maine" (whole-phrase +5), so the leading-space bug is only part of the cause; the apostrophe-split `s` token is a second cause and also defeats the no-answer path ("Napoleon's favorite pizza" returns 3 vignettes at 3.9). hist-current.md line 51 already owns the `s` bug. |
| C-18/19/20 | med | CONFIRMED | Lines `:55,:33,:36,:147` as cited; viewport meta is plain `width=device-width, initial-scale=1.0` (`historian.html:5`). |
| C-22 | low | CONFIRMED | `historian.html:172` innerHTML with unescaped `srcHref`; `:178` escapes only `<`. |
| C-23 | med | CORRECTED | 15 fetches is right, bytes are not: the 8 OOB files total **181,612 B** (not 214,547), so the total is **317,788 B**, not 350,723 B (hist-current.md independently says 318 KB). |
| C-24 | high | CORRECTED (severity high to medium) | The drone never stopping on Pause is real (`immersive.html:125,219`), but WCAG 1.4.2 (Audio Control) is cited wrongly: audio does not start automatically (gate click required, `:154`) and an independent volume slider exists (`:62`, 0 = silent). Drone level is 0.06 x master, very quiet. Still worth fixing (mute button, silent mode, suspend on Pause). |
| C-26 | high | CORRECTED (severity high to low/medium) | Simulated the actual graph (`audio.js`: RBJ 180 Hz low-pass on cannon noise, 900 Hz high-pass on musket, gains from `:117,136,148`): at the default slider (55) peaks are cannon -26.5 dBFS and 6-count musket -17.6 dBFS; at slider 100 cannon -21.4 dBFS, musket -12.4 dBFS; a worst-case straight sum of two overlapping cannons plus musket plus drone is -7.3 dBFS (an upper bound, peaks do not align). No clipping, and the low-passed cannon is quiet. A limiter, fade-in and warning are good hygiene but this is not a "high" hearing-safety defect. |
| C-27 | high | CONFIRMED | Reproduced (`imm.js`): 694 placement records, 152 units, cannon-eligible 662/675, musket-eligible 640/675, 135 ticks with hour >= 20 all cannon-eligible. Cannon rate about 1 per 3 ticks and musket about 1 per 1.7 ticks match the ~209/~400 per loop. |
| C-28 | high | CONFIRMED | No `visibilitychange/pagehide/statechange/audioSession` in any of the 5 audio/AR/export pages (grep = 0). Web search: Safari 16.4+ `navigator.audioSession.type='playback'` bypasses the ring/silent switch; the default follows it. |
| C-29 | med | CORRECTED (severity medium to low) | Allocation arithmetic is right (~47 MB per 236 s loop) but that is about 0.2 MB/s and a fraction of a millisecond of fill per boom, negligible GC. The multiply-blend overlay (`:29`) is the only plausible mobile GPU cost. |
| C-31 | med | CONFIRMED | `hourForTick` `:169-173` = 5:00 + minutes; tick 675 gives hour 23. |
| C-34 | critical | CONFIRMED (evidence); severity should read "high until device-tested" | Order verified line by line: `await loadLocations()` `:156`, `await getUserMedia` `:160`, `await` geolocation promise `:170-177`, `requestPermission()` `:186`; `catch` `:189-191`; the stage then opens with `heading=0`. iOS requires a user gesture (web search). That a promise chain over two OS prompts drops the gesture is inference (analogous to Safari clipboard-after-await reports), not verified. "Critical" is only justified if an iPhone confirms. |
| C-35 | high | CORRECTED | Line refs, `360-alpha`, Chrome relative alpha, 5.36 px/deg x 10.5 deg = 56 px and 490 ft at 0.5 mi all check out. But the fix "trueHeading = magneticHeading + declination" applied universally is unsafe on iOS: Apple's page says `webkitCompassHeading` is relative to magnetic north, while other write-ups report iOS returns true north when location is available (sources conflict). Measure on device and apply declination only to sources proven magnetic (Android `deviceorientationabsolute`), otherwise iOS gets a new ~10.5 degree error. |
| C-36 | high | CONFIRMED | `ar.html:159-167,172,178-181,204-210` as described; the Start button is never disabled. |
| C-37 | high | CONFIRMED | `:174` ignores `err.code`; `:175` `timeout:10000`, no `maximumAge`. |
| C-38 | high | CONFIRMED | `:192` is true on desktop; bounds N39.85 / S39.77 / E-77.18 / W-77.29 verified in `terrain.json` metadata. |
| C-39 | high | CONFIRMED | Recomputed: from Little Round Top facing north, 22 of 30 within 3 mi and inside +/-35 degrees; 29 of 30 within 3 mi of LRT. |
| C-44 | low | CONFIRMED | `terrain.json:50` "Gulp's Hill saddle" (only occurrence, 0 in bundle). The "512 monuments" exist only as the `_A` array in `bundle.pretty.js:104440` (keys `lat`, `lon`, no elevation; `data/monuments.json` holds 9), so using them requires extraction plus an elevation source (Mapbox terrain query). |
| C-45 | low | CORRECTED | The map never uses geolocation: no `new ...GeolocateControl` in the bundle (class exists at `bundle.pretty.js:94850` but is never instantiated) and `navigator.geolocation` is called only at `ar.html:171-172`. So `geolocation=(self)` can be restricted to `/ar.html` too; "keep geolocation for the map" is unnecessary. |
| C-46 | high | CONFIRMED | `renderStops` innerHTML `:172`, import `:320-333` assigns `stops = data.stops` after only `Array.isArray`, persisted at `:161`. Remote-controlled captions use `textContent` (safe). |
| C-47 | high | CORRECTED | Confirmed: PeerJS 1.5.4 = 92,865 B (25,489 B gzip), defaults `0.peerjs.com`, Google STUN, `turn:eu-0/us-0.turn.peerjs.com:3478`, `peerjs`/`peerjsp`; broker returns 200 "EU". Netlify facts check out (function `rateLimit` with `windowLimit/windowSize/aggregateBy` in the exported `config`, window capped at 180 s, not settable in `netlify.toml`; no WebSockets). Design flaw: `windowLimit:120` per 60 s `aggregateBy ['ip','domain']` on a 1 Hz poll means a classroom of 25-30 students behind one school NAT IP (the site's stated audience, `privacy.html:41`) generates 1,500+ polls/min and gets 429. Rate-limit only create/join, key polling by room token, or poll every 3-5 s. |
| C-48 | high | CONFIRMED | 24 letters (no I/O) ^5 = 7,962,624; proposed alphabet is 28 chars, 28^6 = 481,890,304. |
| C-49 | high | CONFIRMED | `broadcastTick` only from `goToTick` when host; viewers can press Play tour. |
| C-50 | high | CONFIRMED | No `peer.on('disconnected')`; errors collapse at `:241,:260,:262`. The "10-20% ICE failure" figure is unmeasured (the report says so). |
| C-51 | med | CONFIRMED | `NaN||0` gives 0, `Math.max(1,0)` gives 1, so `!tick` is dead and an empty field adds tick 1. |
| C-52 | med | CONFIRMED | `:159,:161`. |
| C-53/54 | med | CONFIRMED | `playIdx = 0` on every play toggle; `revokeObjectURL` immediately after `a.click()`; `display:none` file input inside a `<label>`. |
| C-55 | med | CONFIRMED | h1 to h3 order, 10 px `.sync-status`; caption bar vs Mapbox control z-index reasoning is consistent (visual check still needed). |
| C-56 | med | CONFIRMED | Mapbox (`:16`) and PeerJS (`:19`) are both sync scripts in `<head>`. |
| C-57 | low | CONFIRMED with nuance | `:64` already tells users it uses "a third-party public broker" and "best-effort" (honest, not dev-log); the real gap is `privacy.html` silence and `:104` "nothing ... stored". |
| C-58 | high | CONFIRMED | Table reproduced exactly from `chronology_day*.json` (240 = 6:10am Berdan, 267 = 8:25am Vincent, 300 = 11:10am Bigelow, 340 = 2:20pm, 540 = 11:15am, 560 = 12:55pm). Extra evidence: Chamberlain's Charge is vignette V-010 with trigger tick 275, not 267. Root cause is the C4 data clock, so re-pointing ticks may be the right fix rather than relabelling. |
| C-59 | high | CONFIRMED | `turning-points.html:48` empty `<main>`, content injected at `:99-121`. |
| C-60 | med | CONFIRMED | Lines 60, 64, 74, 89, 94, 95 contain the quoted claims; meta `:8` "agree" vs `:46` "argued about". |
| C-63 | high | CORRECTED (severity high to medium) | The page already says it: the H1 is "Find Your Ancestor's Regiment" (`find-ancestor.html:45`), the sub-line says "narrow down which of the 467 ... regiments", and the caveat with the NPS CWSS link is at `:51-53`. Only the nav label/desc (`site-nav.js:37`) overpromise. "joh matches 50 records" verified. |
| C-64 | med | CORRECTED (minor) | NPS: "over 6 million" records, "no longer maintained", no API or licence text (WebFetch). `search-regiments.htm` redirects to `search-battle-units.htm`; link to the final URL. |
| C-65 | med | CONFIRMED | 27 records without commander name, 31 state values including Regular Army and Multi-state, "102nd" sorts before "10th". |
| C-66 | med | CORRECTED | `casualty_percentage` is populated in only 245 of 467 records (strength, casualties, days_engaged, key_action are 467/467). The "duplicates" have distinct designations ("... (XII Corps)", "... (Baxter detachment)"), so they are look-alikes, not identical. 22 CSA cavalry rows without `parent_corps_id` verified. |
| C-68 | high | CONFIRMED | `:190-196` unguarded `MediaRecorder`, throw before `btn.disabled` at `:201`. Safari 18.4 added WebM `MediaRecorder` (WebKit release notes via search), so the pre-18.4 gap is real. |
| C-69 | high | CONFIRMED | Only `map.getCanvas()` is captured. The Mapbox attribution page (WebFetch) covers live maps and static/print maps only ("cite a photograph"); video is not addressed, so the report's hedge is correct. |
| C-70 | high | CONFIRMED | `cinematic-export.html:8,11,49` say "narrated flyover" / "camera flying"; no audio track; `fitBounds` per frame. |
| C-71 | high | CORRECTED | Design fine. Licence remark wrong: `mp4-muxer` is MIT but deprecated; its successor Mediabunny is MPL-2.0, not MIT. WebCodecs `VideoEncoder`: Safari 16.4 and Firefox 130 desktop confirmed (caniuse/Phoronix). `totalFrames` unused confirmed. |
| C-72/73/74 | med | CONFIRMED | Line refs OK (`URL.createObjectURL` never revoked; labels without `for`; `#map` 56vh). The source says "Done — N chunks recorded" with an em dash, not ASCII. |
| C-75 | high | CONFIRMED | Exact: tick 1 = 4 Union / 0 Confederate; tick 675 = 23,550 / 23,451 = 47,001; period sums 23,138 / 23,025 = 46,163 (+838); declared `total_casualties` 22,803 / 23,125; tick 675 clock "July 3, 11:40 PM". |
| C-76 | med | CONFIRMED | `notable_intensity_notes`: III Corps "approximately 2 hours" over `[256,330]`; Pickett's "30 minutes" over `[538,558]`; metadata says bell curve, page is linear. |
| C-77/78 | med | CONFIRMED | Clock formula; `step()` then `stop()` at 675 leaves Play inert. |
| C-81 | high | CONFIRMED | `privacy.html:21,28,35,41` verified; CSP lists `events.mapbox.com`, `0.peerjs.com`; page silent on WebRTC and AR. |
| C-82/85/86 | med/low | CONFIRMED | `privacy.html:16` Georgia vs system-ui 15 px; no nav/skip; `404.html` CTA 14 px + 24 px padding; live curl: `/historian` `public,max-age=0,must-revalidate` vs `/historian.html` `no-cache,must-revalidate`, both 200. |
| C-83 | high | CONFIRMED | `terms.html:27,30,33` quoted correctly. |
| C-87 | med | CONFIRMED | Live `curl -I /embed.html` returns `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors *` and the report-only CSP; `netlify.toml:81-85`. The Edge Function fix is plausible (Netlify edge functions can modify the response from `context.next()`); still test on a preview. |
| C-88 | high | CORRECTED (detail) | Core confirmed. The example is wrong: V-018 is "Cushing's Battery" (tick 553); Chamberlain's Charge is V-010 (tick 275). Fix the iframe `title` and oEmbed sample. |
| C-89 | med | CONFIRMED | `.brand` #555 on #0a0a14 = 2.64, `.brand a` #777 = 4.40; 10 px at `embed.html:13,17`; three vignette fetches of 19.6 / 21.1 / 19.9 KB. |
| C-90/91 | med | CONFIRMED | `diagnostics.html`: no viewport, 4,824 B, unclosed `.sec` div `:30`, live 404; `unit-rendering-reference.html`: live 200, noindex, rAF `setPaintProperty` loop `:222-234`, no inbound references. |
| C-92 | high | CORRECTED | Suite design is sound. The per-page budget "perf >= 95 mobile" is unrealistic for the 9 Mapbox pages: perf-cwv measured 68-69 and projects about 86 after deferring Mapbox (camera 69 to 86) and sets its own acceptance at >= 90. Harmonise: text pages >= 95, Mapbox pages >= 90 (or lazy/poster map), with LCP/CLS/TBT as hard gates. |
| C-05, C-07, C-09 | med | CONFIRMED | C-07 counts exact (0 `role=`, `aria-live`, `prefers-reduced-motion`, `color-scheme` on all 14; no `<main>` on 9). C-05/C-09 line refs verified (`historian.html:36`, `find-ancestor.html:28-29`, `turning-points.html:29`, `find-ancestor.html:36`, `watch-together.html:49`, `ar.html:45`, `embed.html:13,17`). |
| C-08 | med | CONFIRMED (low impact) | `/favicon.ico` and `/apple-touch-icon.png` exist at the root, so the missing `<link rel=icon>` is minor; twitter:card, og:image:alt and JSON-LD gaps confirmed (grep = 0 on 8 pages). |
| C-11 | med | CORRECTED | "inline `<script>` on all 14 pages" is wrong (privacy, terms, 404 have none); `watch-together` has 10 `style="` (report 9). Also see MISSED-6. |
| C-12 | low | CONFIRMED (incomplete) | Omits `turning-points.html:8,46,89,90`, `immersive.html:8`, `ar.html:165,179,196`, `cinematic-export.html:190`. |

Not re-checked in depth: C-21, C-25, C-30, C-32, C-33, C-40 to C-43, C-61, C-62, C-67, C-79, C-80, C-84. Numbers the report itself flags as unmeasured (ICE failure rate, WMM declination -10 to -11, portrait FOV, `details[name]` support, Blobs option names) remain UNVERIFIABLE here.

Effort and roll-up check. Tags in the report count 43 S, 12 S-M, 28 M, 1 M-L, 7 L, 1 XL (92 findings), not "40 S + 41 M + 9 L + 1 XL"; the roughly 95-100 person-day total is still plausible, but Tier 0 ("3-4 person-days") lists about 17 items (several S-M) and is closer to 6-7 days.

### MISSED issues (in this specialist's scope)

1. **Historian chronology payload carries developer notes and C4 clock labels** (medium). `chronology_day3.json` has a `flag` field on 20 events that is animation-engine instruction text, e.g. tick 460 "Mudge KIA. Colgrove's charge -- show regiments advancing across open ground ... Commander succession US-022 activates." and tick 516 "deploy to Online position". `e.narrative` (9 Day-2 rows) is user-worthy, `flag` is not. Separately the C-16 fix renders `e.time` ("8:25am" for Vincent, tick 267) while `turning-points.html` calls the same moment "late afternoon" (C4). Fix: whitelist fields (`event, significance, units_involved, narrative`), never render `flag`, and show the unified clock or "Day 2, tick 267" until C4 lands; add C4 as a dependency of C-16.
2. **Source metadata is missing for 5 of the 15 files Ask the Historian loads** (medium-high). `vignettes_part2.json`, `vignettes_part3.json` and `confederate_regiments_first/second/third_corps.json` have `metadata` without any `sources` key (171 CSA regiments, 16 of 24 vignettes), and records carry no per-record source. C-15/C-16 make `sources[]` REQUIRED and test for 100%. Fix: a data task first (add `metadata.sources` per file, or a `data/sources.json` ledger keyed by file/record kind); until then show a fallback line "Compiled by the site author from published sources" linking to a Sources page.
3. **Three different casualty models on three pages** (medium). `dashboard.html:98-118` uses a piecewise curve (70% at peak, 100% at end), `living-ledger.html:101-118` a linear ramp with an inclusive off-by-one, and `casualty_apportionment.json` `metadata.formulas` documents a bell curve. C-75 fixes only the ledger, so the ledger and the dashboard chart will disagree at every tick. Fix: one shared `casualty-model.js` (bell curve, normalised, largest-remainder rounding) used by both with a parity test; the dashboard already carries the period-sum vs declared-total note (`dashboard.html:130-136`).
4. **AR camera preview may stay black on iOS Safari** (medium, inference). `<video id="ar-video" autoplay playsinline muted>` sits inside `#ar-stage` (`display:none`, `ar.html:70`); `srcObject` is set at `:161` before the stage is shown at `:199`, and there is no `video.play()` anywhere. Hidden autoplay of MediaStream video is unreliable on iOS. Fix: show the stage first, then `await video.play()` in try/catch with a "Tap to start camera" fallback; verify on device.
5. **Watch Together viewers trust host messages unvalidated** (low-medium). `conn.on('data')` calls `goToTick(data.tick, data.note, true)` (`watch-together.html:256-257`) with no type or range check, and a 5-letter public room can be hosted by anyone. Captions use `textContent` (no XSS), but a malicious or buggy host can push arbitrary tick values and very long notes to viewers. Fix: schema-validate every message (integer 1..675, note <= 280 chars, control characters stripped) on the client and on the future relay.
6. **The proposed enforcing CSP would block the Mapbox map CSS** (low-medium). C-11's final feature-page policy has `style-src 'self'` and `script-src 'self' [self-hosted mapbox]`, but all 9 map pages load `mapbox-gl.css` from `api.mapbox.com` (`immersive.html:15`). Either self-host CSS and JS together (and use Mapbox's `mapbox-gl-csp.js` plus worker for strict CSP) or keep `https://api.mapbox.com` in `style-src`/`script-src`. Ship as a matched pair with C-03 item 3.
7. **Roll-up arithmetic and Tier-0 estimate** (low). Tag counts do not match the stated 40/41/9/1 split (see above) and Tier 0 is under-estimated; harmless to the plan but should be corrected so owner scheduling is not optimistic.
