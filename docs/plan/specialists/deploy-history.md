# deploy-history: regression archaeology for gettysburginteractivemap.com

Specialist: `deploy-history`. Scope: unzip and diff every historical deploy/build zip in `C:/Users/mlege/Downloads`, date each audit issue to the build that introduced it, decide rollback vs fix-forward, correlate deploys with the RUM spikes, list lost good things and secrets. Read-only; all scratch output lives in `plan-work/tmp-deploy-history/` (scripts: `inv.py`, `zipscan.py`, `probe*.py`, `chain2.py`, `chronofit.py`, `datacmp.py`; outputs: `inv.txt`, `zipscan.tsv`, `probe2.txt`, `probe3.txt`, `chain2.txt`, `diff_D_E_index.txt`, `diff_E_F_index.txt`).

Conventions: times are EDT (UTC-4) unless marked Z. "F" is the live deploy. Line refs: `bundle.pretty.js:N` = plan-work/bundle.pretty.js; `X/index.html:N` = extracted copy under `tmp-deploy-history/<dir>/`.

---

## 0. Executive summary (what the archaeology proves)

1. **The BRIEF's dates are download dates, not deploy dates.** Netlify deploy IDs are Mongo ObjectIds whose first 4 bytes are a UTC epoch. Decoded: the "Sep 29 current" deploy `6aa16d61...` was **created Sep 9 2026 10:29:53 EDT**; the "Jul 20" zip `6a3a0355...` was created **Jun 22 23:53:57 EDT**; the "Aug 29/Sep 7" zip `6a8a9268...` was created **Aug 23 02:25:44 EDT**; the "Sep 9" zip `6aa06a6d...` was created **Sep 8 16:05:01 EDT**. Live `index.html` differs from deploy F only by Netlify post-processing (pretty-URL href rewrite + RUM snippet, +430 B); `sw.js` and `site-nav.js` are md5-identical. **Nothing has been deployed since Sep 9**, so the RUM spikes on Sep 18 and Sep 26 cannot be code changes.
2. **The main JS has not changed since Jul 29.** `assets/index-Cg8FAMXN.js` md5 `7ef75b95` (2,280,438 B) = `gettysburg_v21_streetview_fix.zip` (Jul 29 15:00) and is byte-identical in deploys C, D, E, F. Every bundle bug (C1-C5, H2-H6, H9-H13, D*) therefore pre-dates the RUM window (Aug 30-Sep 29). What changed in Sep is only `index.html` (+inline scripts), `sw.js` registration, `site-nav.*`, `netlify.toml`, sub-pages.
3. **The data has not changed since Jun 12 22:56.** All 70 data JSON files are md5-identical across `gettysburg_FINAL_v24` (Jun 12), `FIXED_v25`, `v2_fixed`, deploy A and deploy F (only differences: 5 bytes of dash punctuation in `union_oob_corps_division.json` on Aug 22, and the new 9-entry `monuments.json` on Sep 9). Placements, chronology, vignettes, terrain: frozen for 110 days.
4. **Oldest bugs are day-one bugs.** `July ${day+2}` exists at 4 sites in the very first source (Jun 12-13). `setGoldUnit`/`clearGoldTrail`/`drawGoldTrailSegment` are unbound identifiers since `gettysburg_FIXED_circular` (Jun 13 13:57) and the **entire gold-trail engine is absent from the bundle** (0 references to `initGoldCanvas`/`getGoldUnitId`), so Follow-Your-Ancestor has never worked as advertised (108 days live). Text-sort of ancestors, minimap label, "445+", "1x (real time)", Esc-in-input guard, `fallback:null` Help lazy-load, 9-11 px type are all in the original source.
5. **C3/C4 (clock/date) is a partial-fix artifact.** v10 (Jun 13 18:49) re-based only the toolbar clock (`getTickTime`) from 5:00 to 6:00 (Day 1) / 4:00 (Days 2-3); v20 (Jun 16 10:48) fixed only that function's date (`+2` -> none). Three other sites still say `+2` and 5:00; Compare/Ledger/Documentary/Sandbox use other formulas. Data labels match the 5:00 uniform formula for only 43 of 137 events and match the toolbar clock for 2 of 137. The data's own `placement_schema.json` says Day 2 spans 5:00am-7:50pm in 225 ticks (3.97 min/tick), contradicting every 5-min/tick UI formula.
6. **C1/C2 (mobile) came with the mobile layout, not with the transport row.** Layout chooser v16 (Jun 16 09:55), Tools sheet v26 (11:31), credit text inside the transport row v28 (13:46). Root cause: `App` renders the desktop `Timeline` (`IO`), header (`_F`), toasts and Sound button **unconditionally**; only toolbar+map are gated by `Zn !== "mobile"` (`bundle.pretty.js:113071, 113233`); the unconditional widgets are listed at `:113240-113270` (`_F` 113248, `IO` 113249, Sound `yO` 113255). `IO` (z-index 100, later in DOM) paints above the mobile root (z-index 100) and its Tools sheet (z-index 500 but trapped inside the root's stacking context).
7. **C6 (double load) is two deploys old.** E (Sep 8 16:05) added the first service-worker registration seen in any known deploy (the Jun 13 launch-day build deliberately stripped it at 14:41 and shipped a kill-switch SW). F (Sep 9 10:29) added `controllerchange -> location.reload()` (`f_sep09cur/index.html:264-268`). Lighthouse trace: 2 Document requests (t=1 ms and t=909 ms), 37 distinct `/data/*.json` fetched twice (76), `redirects` audit "9,070 ms" vs simulated mobile LCP **9,007 ms**; *observed* (unthrottled) FCP/LCP = 287 ms. The mobile lab LCP/FCP failure is dominated by the reload artifact.
8. **C8 is E's span->button conversion.** D's `<span class="filter-chip">` rendered fine; E's `<button class="filter-chip">` has no `background`/`font` reset, so UA gray (#F0F0F0) sits under `color:var(--muted)`. Only search.html is affected (camera/education/sandbox/compare buttons define `background`).
9. **"Content hash" filenames lie.** `index-Cg8FAMXN.js` has been reused for at least **40 distinct byte-contents** (62 zips) since v29 (Jun 16 13:50). With `Cache-Control: immutable` (1 yr) and SW cache-first for `/assets/*`, patched builds can be served stale; F's reload hack is a band-aid on this.
10. **Rollback is not the answer for any item.** No earlier deploy is a better base overall. The best interim baseline is F itself minus its three F-only additions (reload, #seo-content/noscript h1s, Monuments overlay) - a pure index.html hotfix (Section 11).
11. **Good things lost:** code-splitting (v24 summary: 276 KB bundle; `DEPLOY_NOW` Jun 13 14:25: 6 KB entry; lineage Y Jun 18-22: 100 KB entry), a real 65-file React source tree + 63-check data validator + CI (Jun 12-13), lineage-Y features (Night Mode high-contrast, Distance panel with units+march time, Find Location vs Find Unit, unit-history, location timeline), Google Search Console verification file (deploy B only), a working strict enforcing CSP (Jun 22), A's canvas Distance tool with a visible line.
12. **Secrets:** no private keys anywhere. Mapbox `pk.` token #1 (`...8CDg`, id `cmqbrgx6p...`) in deploy A and 12 stale bundles: **now revoked** (`api.mapbox.com/tokens/v2` -> `TokenRevoked`). Token #2 (`...Eg5Q`, id `cmqpzm812...`) in B-F: valid. Google Maps Embed key `AIzaSyC-1e...xPF8` in the bundle since v19 (Jun 16). `.env.local` (token #1) sits in four source folders in Downloads. Old deploy permalinks are still live and serve `landing.html` (a $9.99 pricing page) and `diagnostics.html`; the default `friendly-lolly-da85c0.netlify.app` host serves the full site with no redirect.

---

## 1. Method and evidence sources

- Unzipped into `tmp-deploy-history/`: A `deploy-6a2da5d2...`, B `deploy-6a3a0355...`, C `currentdeployedbuild`, D `deploy-6a8a9268...`, E `deploy-6aa06a6d...`, F `deploy-6aa16d61...`; `gettysburginteractivemap{deployedfiles,sourcecode}.zip`; `gettysburg-site-fixed.zip`; `gettysburg-site-with-new-features` (0)-(6).
- Scanned **126** zips in Downloads (`zipscan.py`): 67 distinct single-bundle main JS contents ordered by zip mtime, probed with ~60 regex signatures (`probe2/3.py`), UI-string diffs between consecutive bundles (`chain2.py`), and read the real source trees `gettysburg_FINAL_v24`, `FIXED_v25`, `FIXED_circular`, `COMPLETE_FIXED (1)`, `v2_fixed` (65 files, 8,422 lines), plus the code-split lineage `v30 (1)`...`v31b`.
- Deploy timestamps: ObjectId decode (`int(id[:8],16)`). Cross-check that validates the method: A's ID decodes to 14:47:46 and `gettysburg_v4.zip` (its content) was written 14:47:25; B decodes to 23:53:57 and `gettysburg_sv_pano.zip` (its bundle md5) 23:53:31; D decodes to 02:25:44 and `with-new-features (6).zip` was written 02:20:30.
- Zip-internal file mtimes and zip mtimes are **download times** (Netlify regenerates the archive), never deploy times.
- Lighthouse artifacts read directly (`lh_mobile.json`, `lh_desktop.json`): `metrics`, `network-requests`, `layout-shifts`, `render-blocking-insight`.
- Live checks by curl (read-only): live vs F, permalinks, netlify.app host, Mapbox token validity endpoint (returns only valid/revoked, not the token).
- Uncertainty is stated inline. Things I could not determine statically: what happens visually (I did not run a browser), exact hourly RUM values, and any deploy for which no zip exists (Netlify's Deploys tab is the source of truth).

---

## 2. Chronological timeline

### 2.1 Deploys with a zip (the six that matter)

| # | Deploy ID | Created (Z / EDT) | Zips (download time) | Files | index.html | Main JS (name, bytes, md5) | sw.js | What this deploy changed | Regressions first visible here |
|---|---|---|---|---|---|---|---|---|---|
| A | `6a2da5d2972fd3fb2b7ed72e` | 2026-06-13 18:47:46Z / **Jun 13 14:47:46** | deploy zip (Jun 13 14:59); build = `gettysburg_v4.zip` | 80 | 958 B (no splash/meta) | `index-DW1sWkMU.js` 2,085,027 `38440670` | 407 B kill-switch (not registered) | Launch. Single 2 MB chunk, `landing.html` pricing page ($9.99), `diagnostics.html` public, no netlify.toml | C3 (4 sites), C5, H5, H9, H10-source, H11, H2, D1, D2, P2, P3 |
| B | `6a3a0355a036dd8d9892e747` | 2026-06-23 03:53:57Z / **Jun 22 23:53:57** | 29 MB zip (Jul 20 20:28); build = `gettysburg_sv_pano.zip` | 128 | 4,696 B (HTML boot splash, CLS reserve, preconnects) | `index-Cg8FAMXN.js` 2,280,095 `0903f96b` (+12 stale index bundles, 13 helpmodal, 13 bookmarkpanel copies) | 1,776 B `gbg-v2` (unregistered) | Layout chooser, mobile layout + Tools sheet, Virtual Walkthrough (512 monuments), Map Layers, Toggle Units, netlify.toml (security headers, scanner 404s, `/data` 1 h), GSC file `google0dca...html`, sitemap, robots | C1, C2, C4 (clock split), H3, H4, H6, H12 (GtbgDist), X1/X2 |
| C | *unknown* (<= Aug 22 22:56) | <= Aug 23 02:56Z / **<= Aug 22 22:56** | `currentdeployedbuild.zip` (Aug 22 22:56); build ~ `gettysburg-site-fixed.zip` (22:08) | 93 | 6,563 B | `index-Cg8FAMXN.js` 2,280,438 `7ef75b95` (Jul 29 patched build) | 2,274 B `gbg-v4` (unregistered) | SEO meta (canonical/OG/Twitter), CSS preload+`onload` swap, Street View preconnects, privacy/terms **templates** ("TEMPLATE -- DO NOT PUBLISH AS-IS"), `user-guide.pdf` as attachment | P5 (preload warnings), broken OG image, template legal pages live, GSC file lost |
| D | `6a8a92683645a40776217eee` | 2026-08-23 06:25:44Z / **Aug 23 02:25:44** | deploy zip (Aug 29 00:18 and Sep 7 19:02); `...deployedfiles.zip` (Sep 6 21:00) | 103 | 9,366 B | same JS | same sw.js | +10 sub-pages, `embed.html`, floating Extra Features overlay (`left:400px; z-index:999999`), `landing.html` removed (no redirect), sitemap 10 URLs | H1, C7 (dashboard), H7 copy (viewshed/dashboard/search), X4 (embed blocked by XFO DENY), S4 |
| E | `6aa06a6dec8bb35a1601a9fb` | 2026-09-08 20:05:01Z / **Sep 8 16:05:01** | deploy zip (Sep 9 09:52) | 118 | 28,222 B (6 inline scripts, 17 KB) | same JS | `gbg-v5` **first registered** | +12 pages (ar, cinematic-export, find-ancestor, ground-remembers, historian, immersive, living-ledger, regiment, turning-points, watch-together, unit-rendering-reference, 404), `site-nav.js/css` (render-blocking), overlay rewritten with collision-mover, CSP-Report-Only, Permissions-Policy loosened for AR, real privacy/terms, real icons, span->button conversion, sub-page Mapbox CDN 3.6.0->3.24.1, sitemap 20 URLs | C8, P4, X3, H10 (467 vs "445+"), X5, C6 prerequisite |
| F | `6aa16d6180cc621d7501ebe0` (source `6aa16d6080cc621d7501ebde`) | 2026-09-09 14:29:53Z / **Sep 9 10:29:53** | deploy zip (Sep 29 22:52); source zip | 119 | 39,638 B (8 inline scripts, 23.7 KB) | same JS | same sw.js | **`controllerchange -> location.reload()`**, `#seo-content` + JSON-LD, noscript content (3 `<h1>` total), Monuments star-overlay hack + `data/monuments.json` (9 entries), CSS force-reveal | C6, E3, E4, Monuments overlay hack |

Growth of the shell: `index.html` 958 -> 4,696 -> 6,563 -> 9,366 -> 28,222 -> 39,638 B (41x); inline JS 0 -> 0 -> 0 -> 0.6 KB -> 17 KB -> 23.7 KB.

Days each thing has been live (to Sep 29): A-era items 108 d; B-era 99 d; D-era 37 d; E-era 21 d; F-era 20 d; the current JS 62 d (Jul 29).

### 2.2 What was deployed between the zips (gaps)

Only six deploys have a zip. Netlify keeps every deploy; there were certainly others (e.g., the Jul 29 JS first ships somewhere between Jul 29 and Aug 22; three unlabeled grey vertical bands cluster at Sep 7-9 on every RUM chart; the "Deploys" tab has them). Action for the owner: export the Deploys list (`netlify api listSiteDeploys --data '{"site_id":"..."}'`) and label each. IDs to look for in the Sep 7-8 cluster: `6a9e52e0...` (Sep 7 06:00Z) to `6aa06a6d...` (E).

### 2.3 Build-chain milestones (single-bundle "X" lineage; zip-mtime order, EDT)

| Time | Build zip | Introduced |
|---|---|---|
| Jun 12 22:56 / 23:16 | `FINAL_v24` / `FIXED_v25` | Real 40-file React/Vite source, `tests/validate_data.py` (63 checks), CI, docs; PROJECT_SUMMARY says **bundle 276 KB** |
| Jun 13 13:57 | `FIXED_circular` (7 files) | Extracts `GoldTrailEngine.js` "to break circular dep"; `FollowAncestor.jsx:15` re-exports but does not import -> **C5 born** |
| Jun 13 13:59 / 14:11 | `COMPLETE_FIXED (1)` / `v2_fixed` | 65 src files (8.4 kLOC): all deployed features exist as readable JSX |
| Jun 13 14:25 | `DEPLOY_NOW` | Code-split dist: `index-*.js` 6.2 KB + `components/engine/react/zustand/mapbox` chunks |
| Jun 13 14:31 | `FIXED_FINAL` | Chunks merged into one 2.09 MB `index` (**P2 born**); SW registration still in bundle |
| Jun 13 14:37 -> 14:41 | `USEREF_FIXED` -> `FINAL_v2` | SW replaced by 407 B kill-switch; SW registration **stripped from bundle** |
| Jun 13 14:47 | `v4` | = **deploy A** |
| Jun 13 14:55 | `v5` | Onboarding tour ("Power User", "Skip tour"), Timeline row with `Back 1hr (Shift+Left)` labels (`⏮ ◀ ▶ ▶ ⏭` + 6 speed buttons + "Tick n/675") |
| Jun 13 18:49 | `v10` | Order of Battle panel; **toolbar clock re-based** (`getTickTime`: `5*60` -> `(day==1?6*60:4*60)`) |
| Jun 13 18:56 | `v13` | Street View -> "opens in Google Maps" hand-off (**H13/guide mismatch**) |
| Jun 13 19:02 | `v15` | Unit Roster |
| Jun 16 09:55 | `v16` | **"Choose Your Experience"** chooser + first mobile layout (H3 origin) |
| Jun 16 10:26 | `v18` | Virtual Walkthrough + 512-monument array (+306 KB, 2.42 MB) |
| Jun 16 10:31 | `v19` | Tour stops 3-16, Google Maps links; **Google Maps Embed key `AIza...` first appears** |
| Jun 16 10:48 | `v20` | `getTickTime` date fixed (`+2` sites 4 -> 3) |
| Jun 16 11:31 | `v26` | **Mobile "Tools" sheet** (Desktop View, Mini Map, NPS Auto Tour, Order of Battle, Soldier's View, Follow Ancestor) - C2 origin |
| Jun 16 13:46 | `v28` | "Created by: Mike Legere + email" added **inside the transport row** (C1 worsens) |
| Jun 16 13:50 | `v29` | Bundle filename `index-Cg8FAMXN.js` first used - reused for >= 40 contents afterwards |
| Jun 18 02:19-02:45 | `v30`...`v34`, `dist_final` | netlify.toml, SW `gbg-v1`, **HTML boot splash first appears in v34 (02:38)** (index.html 4,696 B = deploy B's) |
| Jun 18 18:20 -> Jun 22 14:32 | `v30 (1)`...`v31b` (lineage Y) | Real code-split build (entry 100-119 KB) + Night Mode, Distance Measurement panel, Find Unit/Location, Unit History; abandoned |
| Jun 22 14:24 | `v33_all_fixes` | back to single bundle; "User Guide" button |
| Jun 22 14:56 -> 15:37 | `final` / `v5 (1)` | Distance tool replaced by hand-patched Mapbox-layer `GtbgDist` (H12 origin) |
| Jun 22 18:26 | `v15 (1)` | `GtbgLayers`/`GtbgLoc` map-layer patches (roads/rivers/farms) |
| Jun 22 21:28 | `v17 (1)` | "Toggle Units" (via `window.__gtbgApp.__gbToggleUnits` global hack) + Tutorial PDF button |
| Jun 22 22:12-22:59 | `v17_toggle_fix`, `v17_csp_fix`, `v17_nocsp` | **Enforcing CSP** (`script-src 'self' blob:`) tried, widened for Google, then removed |
| Jun 22 23:03-23:53 | `sv_*` | Street View pano IDs (3) -> **deploy B** at 23:53:57 |
| Jul 4 13:26-17:00 | `sv_verified` ... `v21 (2)` | 14 pano IDs; small patches |
| Jul 29 15:00 | `v21_streetview_fix` | **= live JS** (`7ef75b95`): showUnits refactor replaces `__gbToggleUnits` hack; panos 3 -> 14 |
| Jul 30 14:40 | `gettysburg-source-reconstructed` | RECON_SRC ("from v21") |
| Aug 22 22:08 / 22:56 | `site-fixed` / `currentdeployedbuild` | deploy C |
| Aug 23 01:30-02:20 | `with-new-features` (0)-(6) | 10 pages + overlay; deploy D 5 minutes after (6) |
| Sep 6-7 | downloads | Input for the E session |
| Sep 10 18:51 / Sep 12 22:16 | `gettysburg_v11.zip` re-download / `gettysburg_v7` folder | Clue that older builds were tried after F (no zip exists of any deploy after F) |

---

## 3. Per-transition diffs (evidence)

### 3.1 A -> B (Jun 13 -> Jun 22)
- JS: 2,085,027 -> 2,280,095 B; +walkthrough/monuments, chooser, Tools sheet, Order of Battle panel, Unit Roster, Map Layers, Toggle Units, Street View panos. `pk.` token rotated (see Section 8). Google `AIza` key appears.
- HTML: 958 B bare shell -> 4,696 B shell with HTML boot splash (`#boot-splash`, "Splash: renders from HTML so FCP fires at parse time"), `#root{position:fixed;contain:strict}` "CLS fix", `.mapboxgl-canvas{width:100%!important}`, Mapbox preconnects, `modulepreload` + `preload as=style` (with the real `<link rel=stylesheet>` still present).
- New `netlify.toml` (B:1-176): security headers, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, `/assets/*` immutable 1 y, `/data/*` `max-age=3600`, `/*.html` **no-store**, scanner-path 404 rules (`status = 404`, no `force`), `/diagnostics.html` 404 rule that does not fire (no `force`).
- `sw.js` 407 B kill-switch -> 1,776 B `gbg-v2` precaching `/assets/index-Cg8FAMXN.js` cache-first. **Never registered** (no bundle or HTML calls `register`; verified `serviceWorker` count 0 in A/B/C/F bundles).
- Deploy hygiene: 13 index bundles + 13 helpmodal + 13 bookmarkpanel copies (29 MB) - dist folders merged.
- Lost: nothing of value except A's canvas Distance line (see Section 7).

### 3.2 B -> C (Jun 22 -> Aug 22) - 343-byte JS diff (`bdiff_B_C.txt`, 21 hunks)
- `showUnits`: `window.__gtbgApp.__gbToggleUnits` global hack -> zustand `toggleUnits` (16 -> 10 `__gtbgApp` references). Street View: pano IDs 3 -> 14, stop coords corrected. **Same filename, different bytes.**
- HTML: canonical/OG/Twitter meta; `<link rel=preload as=style ... onload="this.onload=null;this.rel='stylesheet'">` with the real stylesheet link **deleted** (`c_aug22cur/index.html:43-45`) - origin of P5 "preload not used" warnings; Google preconnects; `iframe[src*=streetview]{height:240px;contain:strict}`.
- `sw.js`: `gbg-v2` -> `gbg-v4`; `/data/*` network-first with `cache.put` of every response.
- `netlify.toml`: sitemap cache rule, `user-guide.pdf` `Content-Disposition: attachment`.
- `landing.html` 20,257 -> 22,125 B (pricing page still live and in sitemap); `privacy.html`/`terms.html` added as unfilled **templates**. **`google0dca4879c9657741.html` (Search Console verification) disappears** (present in B only).
- `data/oob/union_oob_corps_division.json`: 5 bytes (mis-encoded en dashes -> `--`).

### 3.3 C -> D (Aug 22 -> Aug 23 02:25)
- +10 sub-pages, `embed.html` (blocked by sitewide `X-Frame-Options: DENY`; no override yet). Sitemap 393 -> 1,733 B (10 URLs). `landing.html` removed with **no redirect** (now 404; still 200 at the B permalink).
- Extra Features overlay first appears: `d_aug23/index.html:138-146` `#extra-features{position:fixed;top:14px;left:400px;z-index:999999}` and its comment "calibrated to the reference screenshot at ~1917px width; it may not land in the exact same visual gap on other screen sizes".
- `index.html` noscript link to landing removed. Day-1 tick data unchanged.
- `search.html` chips are `<span class=filter-chip>` (readable). `dashboard.html` first release: card builder `n.unit || key`/`n.note` (line 247 in F) meets `highest_single_regiment_rate` = `{union:{...},confederate:{...}}` -> raw key + `undefined` (C7 born, data shape unchanged since Jun 12).

### 3.4 D -> E (Aug 23 -> Sep 8 16:05) - `diff_D_E_index.txt`, `diff_D_E_pages.txt`
- **SW registration added** (`e_sep08/index.html` ~209-217, comment: "sw.js existed before but nothing ever registered it"). No `skipWaiting` control in page; `sw.js` `gbg-v4` -> `gbg-v5`.
- `<link rel=stylesheet href=/site-nav.css><script src=/site-nav.js>` in `<head>` (`f_sep09cur/index.html:279-280`), 15.8 KB script with inlined 10 KB sprite -> **render-blocking** (Lighthouse `render-blocking-insight`: `site-nav.js` 5.4 KB, `site-nav.css` 2.5 KB).
- Overlay rewritten: hidden until an onboarding exit button is clicked (regex `/select desktop|select mobile|skip introduction|skip tour|skip intro/i` on `textContent` of 6 ancestors per click), 6-candidate collision mover (`querySelectorAll('button,a,input,...')` x 6 `getBoundingClientRect` after every click + resize), localStorage on/off toggle, banner injected into the chooser ("20 more tools ... an AI-style historian", `f_sep09cur/index.html:377`), title/aria-label patching of toolbar letter buttons. Lighthouse desktop `layout-shifts` includes `body > div#extra-features` (0.0072 of 0.0297).
- `netlify.toml` (E:8-19, 65-86, 189-198): **CSP-Report-Only** (`script-src 'self' 'unsafe-inline' api.mapbox.com cdn.jsdelivr.net`; `connect-src` lacks `ingesteer.services-prod.nsvcs.net`; `frame-src www.google.com` only), Permissions-Policy `camera=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)`, HTML `no-cache, must-revalidate` (was no-store), `/embed.html` override with `X-Frame-Options = ""` (does not remove the sitewide header -> XFO DENY + CSP `frame-ancestors *` both sent, X4), `force = true` on the diagnostics 404 (fix).
- Sub-pages: 12 new; `<span>` controls -> `<button>` on search/compare/camera/education/sandbox; **only search.html lacks a background reset** (C8); Mapbox CDN 3.6.0 -> 3.24.1 on camera/compare/sandbox/viewshed (matches the bundle's `mapbox-gl 3.24.1`); OG/Twitter/canonical on all; `site-nav` mount on all.
- Real `privacy.html` (dated Sep 7) and `terms.html`, real 180x180/192/512 icons (B-D `apple-touch-icon.png` was a 32x32 **ICO** with a .png name; PNG icons had transparent backgrounds under `purpose:"any maskable"`), manifest description 430,000+ -> "467 regiments and batteries" (creates the H10 conflict with Help's "445+").
- `data/*` unchanged; `robots.txt` drops `Disallow: /diagnostics.html`.

### 3.5 E -> F (Sep 8 16:05 -> Sep 9 10:29; only `index.html` + `data/monuments.json` differ)
- `controllerchange` listener (`f_sep09cur/index.html:258-268`) and `reg.update()` (270-272).
- `#seo-content` block (F:155-166 CSS, 717-741 markup: `<h1>` + 2 paragraphs + 18 links) + noscript `<h1>` -> **3 `<h1>` total** (splash, seo-content, noscript). JSON-LD `WebApplication` (27-38). `animation: gtbg-force-reveal 10ms linear 5s forwards` (202-205).
- "Monuments overlay" script (F:608-714): projects 9 monuments with a Web-Mercator formula from the *default view*, does **not** follow pan/zoom (comment: "Known, disclosed limitation"), adds a second dataset next to the app's own 20 story markers and 512-monument directory; claims the app's own 🗿 button "does nothing" (RECON README says it drives the 20 story markers).
- Inline-script count 6 -> 8.

---

## 4. Ancestry facts that change the plan

1. **Real source existed until Jun 13 14:21.** `gettysburg_v2_fixed/src` = 65 files, 8,423 lines; `FINAL_v24` (with `tests/validate_data.py` 279 lines, `perf_test.py` 103 lines, CI, PROJECT_SUMMARY: "Bundle size 276KB", "63 passing"); `README` of `FIXED_v25` ("46 passing"). Everything after Jun 13 is dist-only patching. The RECON README's "no original source ever existed anywhere" is false for the Jun 12-13 tree. RECON_SRC's `store.js:53-60` `getTickTime` (5:00 start, `day+2`) matches Jun 13's v4, **not** the deployed function (`bundle.pretty.js:9371-9382`: 6:00/4:00, correct date) - a fidelity defect; also `mapbox-gl ^2.15` vs deployed 3.24.1.
2. **Two lineages diverged Jun 18.** X (single bundle, hand-patched, deployed) and Y (real build, code-split, more features). Y contains everything X has plus Night Mode, Distance Measurement (feet/yards/meters, march time), Find Location/Find Unit, Unit History, location timeline (UI-string diff `ycmp.py`). Y has the same C5 bug (`setGoldUnit(s)` bare in `panels-*.js`). Y was dropped on Jun 22.
3. **The single 2 MB chunk is a workaround, not a design.** The source's `vite.config.js` uses `manualChunks` (mapbox/react/zustand/engine/components). `FIXED_circular` (Jun 13 13:57) patched a circular import between `FollowAncestor` and the engine; `DEPLOY_NOW` (14:25) was still chunked; `FIXED_FINAL` (14:31) is one 2.09 MB chunk. The reason for merging is not documented (most likely another circular/chunk-order runtime error), but lineage Y later shipped chunked without it, so it is solvable.
4. **Netlify "download deploy" lower-cases `assets/*`; "download source" keeps case** (Sep 6 pair: identical except case). So neither zip is ever "source".
5. **The SW story has repeated.** Jun 13: SW registered, then a kill-switch (14:37) and registration stripped (14:41) within 10 minutes of launch. Sep 8-9: registered again, then a reload band-aid the next morning.

---

## 5. Issue-by-issue: first appearance, earlier better?, rollback vs fix-forward

"First deployed" = first *known* deploy containing it (deploys without zips unknown). Findings referenced as `DH-NN` are in the structured output.

### Critical
| ID | First appeared (build) | First deployed / days live | Earlier build better? | Root cause | Verdict |
|---|---|---|---|---|---|
| C1 mobile transport row | Row: v5 Jun 13 14:55; mobile layout v16 Jun 16 09:55; credit text v28 Jun 16 13:46 | B, 99 d | A had no mobile layout (desktop UI on phone; different timeline) - not a target | `IO` (`bundle.pretty.js:112202`) always rendered; `Po.controls` `justifyContent:center`, no wrap (`:112425-112430`); 5 buttons + 6 speed buttons + tick + credit (`:112357-112366`) ~800 px | **Fix-forward** (DH-07) |
| C2 Tools sheet covered | v26 Jun 16 11:31 | B, 99 d | none | mobile root `tn.root` z-index 100 (`:103703`) vs `IO` `Po.wrap` z-index 100 (`:112386`), `IO` later in DOM (`:113249`); Tools overlay z 500 (`:104033-104038`) is inside the root's stacking context | **Fix-forward** (DH-07) |
| C3 date +2 | **first source** (`useAppStore.js:68`, `PlaybackStatus.jsx:32`, `FollowAncestor.jsx:28`, `MonumentSystem.jsx:48`); deployed A had all 4; store site fixed v20 (Jun 16 10:48) | A, 108 d | A is uniformly wrong; B-F wrong at 3 sites | bundle sites: header `:97428`, tooltip `JF :100842`, ancestor `QF :101006` (minified offsets 1988148 / 2053520 / 2056190) | **Fix-forward** 3 one-token patches (DH-04) |
| C4 clock/history | Data labels: Jun 12 (frozen). Clock re-base: v10 Jun 13 18:49. Other formulas: JF/QF (5:00), Compare/Ledger (5:00), Sandbox labels hand-written, Documentary text | A (data), B (re-base), 108 d | A internally uniform (5:00 everywhere) but dates wrong and history compressed | 4+ time formulas; labels fit the 5:00 formula for 43/137 events (Day 2 drift up to -230 min, Day 3 median -70); schema says Day 2 = 5:00am-7:50pm | **Fix-forward** (DH-05); no rollback can fix data |
| C5 setGoldUnit | `FIXED_circular` Jun 13 13:57 (`FollowAncestor.jsx:15` re-export, uses at 103/104/115/204) | A, 108 d | none | 3 unbound identifiers (`bundle.pretty.js:101086, 101101, 101229`); engine not in bundle at all | **Fix-forward** (DH-06); bigger than the audit says |
| C6 SW reload | Registration E Sep 8; reload F Sep 9 | F, 20 d | **D (no SW, no reload)**; also E (SW without reload) | `f_sep09cur/index.html:264-268`; `clients.claim()` on first install fires `controllerchange`; only first-time visitors + SW updates | **Fix-forward**: delete lines (DH-02); *or* index.html-only revert to E's block |
| C7 dashboard raw key + undefined | D (dashboard first release) | D, 37 d | none | `dashboard.html:244-249` expects flat `{unit,note}`, data has `{union,confederate}` | **Fix-forward** (DH-09) |
| C8 chips 1.10:1 | **E** (span->button) | E, 21 d | **D** (spans) | `.filter-chip` lacks `background`/`font` (`search.html:30-31,56-59`) | **Fix-forward** 1 line (DH-08); do not revert to spans |

### High
| ID | First appeared | Days live | Earlier better? | Root cause / note | Verdict |
|---|---|---|---|---|---|
| H1 overlay | D Aug 23 (fixed `left:400px`); E collision-mover; F force-reveal | 37 d | none (D's was also overlapping) | overlay outside React, `z-index:999999` | Fix-forward: fold into toolbar (DH-10) |
| H2 Esc | source (`:112967 tagName==="INPUT" return`); overlay adds its own Escape (E) | 108 d | none | key handler exits on INPUT; closes only 3 store flags + 7 local states | Fix-forward (DH-32) |
| H3 layout not persisted / splash | Chooser v16 (Jun 16); splash source | B, 99 d | A had no chooser | `Zn` state initial null (`:112949`), chooser shown when `!Zn` (`:113061`); `gtbg_onboarded` only. Intro is `eO = 3500` ms in every build; "~15 s" = data-load wait (`placementsByTick` > 5) + 3.5 s + 0.8 s + 0.6 s | Fix-forward (DH-32) |
| H4 clutter | Legend/minimap default true from source (`useAppStore.js:114`); toasts: **code auto-dismisses at 4.5 s in every build** (`bundle.pretty.js:99909-99915`) | 108 d | none | Toast complaint is **not reproducible from code**; needs a live retest (background-tab timer throttling likely) | Fix-forward legend defaults; retest toasts |
| H5 ancestor sort | source (`FollowAncestor.jsx:67 localeCompare`); `bundle.pretty.js:101039` | A, 108 d | none | text sort | Fix-forward (DH-32): `Intl.Collator(undefined,{numeric:true})` |
| H6 toolbar icons | first bundle (letters S F L B ?, emoji) | A | none | `Vs` buttons (S/F/L/B/? at `:113146, 113152, 113164`; component `:113287`) | Fix-forward (design pass) |
| H7 dev-log copy | viewshed "Earlier drafts" D; dashboard note D; AR text E; search "Commander unrecorded" D (`search.html:112`); "alias for U-84NY" is **data** (`union_regiments_i_ii_corps.json`, frozen since Jun 12) | 21-37 d | none | copy + data strings | Fix-forward |
| H8 historian overpromise | E (page first exists); "AI-style" banner E (`index.html:377`) | 21 d | none | keyword search over 4 static JSONs | Fix-forward (expansion plan) |
| H9 "1x (real time)" | source (`PlaybackStatus.jsx:38`); `:97429` | A | none | label constant | Fix-forward |
| H10 467 vs 445+ | "445+" in source (`HelpModal.jsx:67`) and `landing.html`; **E made it a conflict** by changing meta/manifest to "467" | E, 21 d | none (before E only "430,000+ unit positions") | copy drift | Fix-forward (DH-22) |
| H11 minimap label | source (`Minimap.jsx:159`); `bundle.pretty.js:99821` | A | none | label not recomputed | Fix-forward |
| H12 Distance one marker | **`GtbgDist` patch, Jun 22 (`final`/`v5 (1)`)**; deployed B | B, 99 d | **A** (source `DistanceTool.jsx` canvas dashed line, `setLineDash` x3) and lineage Y (units + march time) | `GtbgDist` adds a Mapbox source/layer in `try{}catch(e){}` (silently swallows "style not loaded"), `bundle.pretty.js:112677+` | Fix-forward; restore Y design (DH-30) |
| H13 Street View | Google hand-off v13 Jun 13 18:56; panos 3 (B) -> 14 (Jul 29) | B | C+ better than B (14 panos) | stops 3 and 5 have no `pano` (`:104149, 104188`); stop 1/8 panos differ (`NPoPaAZH82fn6rRlPiFK9w` vs `A7rGaIwx9lZjUK9N1PW0sA`) so the identical caption is an iframe/embed behavior, not data | Fix-forward (DH-31) |

### Desktop / sub-pages / perf / traffic / security
| ID | First appeared | Note | Verdict |
|---|---|---|---|
| D1 Help late | A (`helpmodal-*.js` lazy chunk exists in A) | `Suspense fallback:null` `bundle.pretty.js:113277` | Fix-forward (loading state / preload on hover) |
| D2 tiny type/targets | source (`fontSize:9-11` throughout) | design-system work | Fix-forward |
| D3 label collisions / no auto-fly | source | | Fix-forward |
| D4 no Order of Battle on desktop toolbar | never (`title:"Order of Battle"` count 0 in every build; mobile Tools sheet from v26) | | Fix-forward |
| S1 report/regiment sparse | report D, regiment E | | Fix-forward (content) |
| S2 Ground Remembers blank 3 s | E (page new) | CDN mapbox 3.24.1 sync `<script>` in head | Fix-forward |
| S3 Camera/Viewshed incomplete paint | camera/viewshed in D on 3.6.0; E moved to 3.24.1 | possible test artifact; pin/retest | Retest |
| S4 mobile sub-pages | dashboard `svg width=1000` D (`dashboard.html:71`); compare tabs D | | Fix-forward |
| P1 RUM Poor | see Section 6 | | |
| P2 2.28 MB single chunk | **Jun 13 14:31** | code-split builds existed: `DEPLOY_NOW` 6 KB entry, v24 276 KB, lineage Y 100 KB | Fix-forward via rebuild (DH-14) |
| P3 ~30 JSON fetches | A (70 data files unchanged; 37 distinct fetched per load, 76 total with the reload) | | Fix-forward |
| P4 render-blocking site-nav | **E** | D's shell had zero render-blocking resources | Fix-forward (DH-27) |
| P5 preload warnings | **C** (`onload` swap, stylesheet link deleted); amplified by E's SW | | Fix-forward (DH-28) |
| P6 no source maps | A | Vite default `sourcemap:false`; not a regression | Fix with pipeline |
| T1 weak search | SEO scaffolding is 1-2 months old: OG/canonical/sitemap (C-D), JSON-LD (F); **GSC file lost (C)**; `/landing.html` (in sitemap C, indexed with "free 7-day trial") now 404; OG image is a **corrupt PNG** (all deploys B-F) | | Fix-forward (DH-12/13) |
| T2 scanner 404s | B onward (rules use status 404, no 301) | expected noise | none |
| T3 duplicate URL forms | Netlify "Pretty URLs" post-processing rewrites hrefs (live index differs from F by exactly that) | | Fix-forward (DH-11) |
| E1 manifest landscape | A (unchanged in all 6 deploys, `manifest.json:9`) | | Fix-forward (DH-24) |
| E2 name mismatch | A | | Fix-forward |
| E3 3 h1 | **F** (B-E had 1) | | Fix-forward (DH-23) |
| E4 #seo-content | **F** | | Fix-forward (DH-23) |
| E5 sitemap 20 URLs | E | | ok |
| X1 Mapbox token | token #2 since B; #1 revoked | restriction unverifiable from outside | Owner action |
| X2 Google key | v19 Jun 16; B | | Owner action |
| X3 CSP RO | **E**; an *enforcing* CSP existed Jun 22 (`v17_csp_fix`) | inline scripts (23.7 KB) now block enforcement | Fix-forward (DH-18) |
| X4 embed conflict | embed.html D (blocked); E override ineffective | `netlify.toml:81-85` | Fix-forward (DH-19) |
| X5 privacy gaps | E (Watch Together + AR pages added; policy written Sep 7 does not cover PeerJS, Mapbox telemetry, AR permissions) | template pages were live Aug 22-Sep 8 | Fix-forward (DH-17) |
| G1 guide PDF | 4.6 KB (B) -> 9.3 KB (C) -> 14.3 KB (E) | "Street View panoramas" claim contradicts the v13 hand-off | Fix-forward |
| A1-A6 a11y | `aria-label` x12, no `role="dialog"`, `aria-modal`, `aria-live`, no `prefers-color-scheme` in the app; overlay/E adds partial aria | lineage Y had Night Mode but no aria either | Fix-forward |
| N1 no source | Jun 13 14:21 real source exists (Section 4) | | DH-15/16 |

---

## 6. RUM and traffic correlation

Facts: RUM window is Aug 30-Sep 29 (30 d) = **9 days of D + <1 day of E + 20 days of F**. Web analytics: 3,389 pageviews (~113/day, ~4.7/hour) so an hourly p75 is 0-5 sessions; the spikes are single sessions.

- **FCP/LCP ~27 s spike (Sep 7-8):** aligns with the *first* of three unlabeled grey vertical bands that cluster at Sep 7-9 on every RUM chart (estimated positions by pixel interpolation: Sep 7 ~06-13 EDT, Sep 8 ~00-05, Sep 8 ~17-Sep 9 00; +-0.75 d because tick labels are anchored differently on each chart). Only E (Sep 8 16:05) and F (Sep 9 10:29) have zips; the E->F spacing (18.4 h = 0.77 d) equals the spacing between the bands, so the bands are most likely {an un-downloaded Sep 7-8 deploy, E, F}. Pageviews peak the same days (~230 on Sep 8, ~225 on Sep 13).
- **CLS p75 0.19 / p99 0.32 spike (~Sep 9-10):** lands ~0.4-0.9 day after F (Sep 9 10:29). F added `#seo-content`, the Monuments DOM overlay and CSS force-reveal; E already added the overlay mover. Lighthouse lab CLS: mobile 0.072 (9 of 15 shifts = the `Vc.panel` EventPanel `position:absolute;bottom:120px;left:50%` re-laying out as ticks advance during the intro - present since the first source); desktop 0.030 (0.0072 = `#extra-features` re-placed by the collision mover, E).
- **Sep 18 spike (FCP/LCP ~27 s, CLS ~0.29) and Sep 26 spike (LCP ~1.7 min, INP ~2 min):** **no deploy** (F unchanged since Sep 9). Consistent with a single throttled/headless/backgrounded session (crawler, bot, or frozen tab). Not attributable to code.
- **INP p75 > 500 ms with FID Good:** bundle unchanged since Jul 29, so structural (full-store `yn()` subscriptions in `App` re-render the whole tree per tick; intro sets `currentTick` every rAF). Likely *added* by E/F: document-level click listeners in `f_sep09cur/index.html` (line 476: capture-phase reveal listener that never unbinds and reads `textContent` of up to 6 ancestors on every click; line 599: reposition listener that, 150 ms after every click, runs `querySelectorAll('button,a,input,...')` and 6 x `getBoundingClientRect` over every interactive element = forced layout, worst with the 467-unit Order of Battle open), plus two 200 ms `setInterval` pollers (lines 388, 432; the banner poller does `Array.from(document.querySelectorAll('body *'))` up to 25 times at boot, line 369) and a 1.5 s `querySelectorAll('body *')` + rect scan (line 498). Not measured - flagged as a contributor.
- **Mobile lab (Lighthouse):** the 9.0 s LCP and 4.1 s FCP are simulated numbers on top of a trace whose *observed* FCP=LCP=287 ms; two Document requests at t=1/909 ms; `redirects` audit 9,070 ms. Removing the reload (DH-02) should collapse most of the gap. Desktop observed LCP was 4.58 s (a later React overlay paint) even though the simulated LCP is 2.2 s - after the reload fix, LCP will be decided by which element is largest when the chooser/intro renders (the HTML splash `h1` is 44-96 px; React's `appName` is 52 px; chooser card text arrives at data-load time), so re-measure before claiming green.
- **Traffic bias:** since Sep 9 every first-time visitor produces two server-side document hits, inflating Netlify pageviews (estimate: up to ~2x for new visitors). Expect pageviews to fall after the fix without any real traffic loss.

---

## 7. Good things lost (what to restore or learn from)

1. **Code-splitting** - Jun 12 PROJECT_SUMMARY "Bundle size 276KB"; `DEPLOY_NOW` (Jun 13 14:25) entry `index-DZbqI9Qb.js` 6.2 KB + chunks; lineage Y entry 99.9 KB (`v30 (1)`) with `panels`/`engine`/`walkthrough`/`MonumentSystem`/`DistanceTool`/`UnitHistoryPanel` chunks.
2. **Lineage-Y features** absent from the deployed bundle (grep in `bundle.pretty.js`: `Night Mode` 0, `Distance Measurement` 0, `No history data for this unit` 0, `Click to jump to location` 0): Night Mode (high contrast), Distance panel with feet/yards/meters + march time, Find Location vs Find Unit, unit history, location timeline.
3. **Readable source + tests + CI:** `gettysburg_v2_fixed/src` (65 files), `FINAL_v24/tests/validate_data.py` (63 checks), `perf_test.py`, `.github/workflows/ci.yml` (references tests that are missing from `FIXED_v25`), docs (`PROJECT_SUMMARY.md`, `DEPLOYMENT_CHECKLIST.md`).
4. **A's canvas Distance tool** with a dashed line (source `DistanceTool.jsx:127-153`).
5. **Google Search Console verification file** `google0dca4879c9657741.html` (B only; now 404).
6. **A strict, working enforcing CSP** for the app (`script-src 'self' blob:` with Google/Mapbox hosts) from `v17_csp_fix` (Jun 22 22:54) - possible only because the shell had no inline scripts.
7. **A lean first-visit shell:** D's index.html (9.4 KB, 1 tiny inline script, zero render-blocking resources).
8. **The SW kill-switch** (A's `sw.js`) as a safe fallback.
9. Not worth restoring: `landing.html` ($9.99 pricing, "free 7-day trial", "30-day money-back", a competitor comparison table, "445+ regiments").

Gains worth keeping from D-F: real privacy/terms (E), real icons (E), 404 page (E), bfcache-friendly HTML cache header (E), security-header baseline (B), scanner-404 rules (B), CLS reservation + HTML splash (B).

---

## 8. Secrets, tokens, keys

| Item | Where | Status |
|---|---|---|
| Mapbox public token #1 `pk.eyJ1Ijo...8CDg` (user `mlegere9789`, auth `cmqbrgx6p0j9f2qq03g78n300`) | Deploy A JS; 12 stale bundles in B; `.env.local` in `gettysburg_FINAL_v24`, `FIXED_v25`, `COMPLETE_FIXED (1)`, `v2_fixed` (Downloads) | **Revoked** (`GET api.mapbox.com/tokens/v2` -> `TokenRevoked`) |
| Mapbox public token #2 `pk.eyJ1Ijo...Eg5Q` (auth `cmqpzm8120brt2rqaaif4dul0`) | `index-Cg8FAMXN.js` B-F (`bundle.pretty.js:97210, 102899`) | **Valid**; public tokens are meant to ship, URL restriction unknown (X1) |
| Google Maps Embed key `AIzaSyC-1e...xPF8` | bundle since v19 (Jun 16), B-F (`bundle.pretty.js:110610`, used `:110661` `embed/v1/streetview?key=`) | Valid; restrictions unknown (X2) |
| Placeholder `AIzaSyD-PLACEHOLDER` | `v2_fixed/src/components/StreetViewPanel.jsx:83` | not a key |
| Stripe/`pk_live`/`sk_`/private keys | none in any deploy or source folder searched | clean |

Related exposure: old deploy permalinks stay online. `6a3a0355...--friendly-lolly-da85c0.netlify.app` serves `/landing.html` (200), `/diagnostics.html` (200); the Aug 23 permalink serves `/diagnostics.html` (200); the Jun 13 permalink returns 404. `friendly-lolly-da85c0.netlify.app` serves the whole site with 200 and no redirect to the custom domain (canonical tag is the only mitigation). Never share the four source folders containing `.env.local`.

---

## 9. New findings not in the audit

1. Same-filename/different-content JS (>=40 contents) under immutable + SW cache-first.
2. `sw.js:41-47` caches **non-OK** responses for `/assets/*` (no `res.ok` guard) with cache-first: a transient 404/5xx during a deploy is stored and then served forever until `CACHE_NAME` changes; `PRECACHE_ASSETS` hardcodes hashed names, so every rebuild needs a manual edit or `cache.addAll` fails and the SW stops updating.
3. Corrupt OG/social image: `screenshots/day1.png` and `day3.png` are the same 17,585 B file; IHDR declares RGB (color type 2) but the inflated IDAT is 3,687,120 B (RGBA size); decoders reject it (PIL: "unrecognized data stream contents"). Every page's `og:image`/`twitter:image` and the PWA screenshots point to it (B-F).
4. `/landing.html` (pricing) indexed, listed in the Aug 22 sitemap, removed Aug 23 without a redirect.
5. F's Monuments overlay hack is misaligned by design and duplicates two existing features.
6. The whole gold-trail engine is missing, not just one identifier.
7. The mobile layout (`pO`, `bundle.pretty.js:102914`) creates a **second Mapbox map** and its own data fetch; the desktop tree (map + toolbar + intro) is already mounted underneath the chooser (`Zn` null) and is unmounted when Mobile is chosen - a mobile visitor pays for two maps.
8. RECON_SRC `getTickTime` is stale (5:00, `+2`).
9. Temp CSP history: an enforcing CSP worked on Jun 22 and was dropped.
10. `unit-rendering-reference.html` (dev page, E) is public.
11. Netlify Pretty-URLs post-processing rewrites `.html` hrefs (T3).
12. Chronology schema contradiction (Day 2 = 5:00-19:50 in 225 ticks).

---

## 10. Rollback vs fix-forward decision matrix

| Candidate | Fixes | Keeps / reintroduces | Verdict |
|---|---|---|---|
| Whole-site rollback to **E** | C6 reload, E3, E4, Monuments hack | keeps C8, P4, SW registration, overlay mover, CSP-RO; loses JSON-LD | Not worth it: an `index.html`-only edit of F achieves the same |
| Whole-site rollback to **D** | C6, C8 (spans), P4, SW, CSP noise | template privacy/terms live again, embed.html blocked, placeholder icons/ICO, 12 pages gone, overlay collides at `left:400px` | Reject |
| **C / B / A** | none of the audit criticals | worse in every dimension (template legal pages, no sub-pages, no security work) | Reject |
| **F minus F-only additions** (index.html hotfix) | C6, E3, E4, monuments misalignment | leaves everything older | **Do this first** |

Rule of thumb from the data: every critical bug (C3, C5) pre-dates every deploy I have, so no rollback can fix them; C6/C8 are one-file fixes; mobile bugs need code changes in the bundle (patch) or the rebuilt source.

---

## 11. Recommended hotfix order (archaeology-derived)

1. **HF-0 (0.5 d):** export the Netlify Deploys list; init git with F as commit 1 (deploy tree with correct-case assets from the "source" zip); commit the recovered ancestors as `research/` (v2_fixed src, lineage Y dist, FINAL_v24 tests).
2. **HF-1 (S, index.html only):** delete lines 258-268 (reload) - keep or drop registration per DH-02/03; remove the Monuments overlay (608-714) and one of the duplicate `<h1>`s (DH-23); defer `site-nav.js` (DH-27); replace the CSS `onload` swap with a real stylesheet link (DH-28).
3. **HF-2 (S):** `search.html` chips; `dashboard.html` cards; remove the dashboard data note.
4. **HF-3 (S, bundle patch, new filename):** three `+2` deletions (C3); Help "445+" -> "467"; Esc/INPUT guard; natural sort; `fallback` skeleton. Rename the patched bundle by content hash (DH-01).
5. **HF-4 (M):** gate desktop widgets in mobile layout (C1/C2); move credit line to footer.
6. **HF-5 (S):** Netlify hygiene (Section 8): delete stale deploys, redirect `.netlify.app`, redirect `/landing.html`, restore GSC verification via DNS, regenerate OG image.
7. Then the structural items: pipeline + source (DH-01, 14, 15, 16), time model (DH-05), gold trail (DH-06), CSP enforcement (DH-18).

---

## 12. Open questions / caveats

- Exact times of the un-downloaded deploys (Sep 7-8 cluster; anything Jul 29-Aug 22).
- Whether Netlify RUM draws deploy markers (the grey bands are unlabeled in the PDF).
- Whether the toast bug is real (code says 4.5 s auto-dismiss).
- Real-device confirmation of C1/C2 root cause (static read of z-index/DOM order; consistent with the audit's `elementFromPoint` result).
- Google/Mapbox key restrictions are only visible in their consoles.
- Whether `#seo-content` is judged as hidden text: it sits under a `position:fixed` splash (not `display:none`); keep it truthful and visible or drop it.

---

## Appendix A. Page/file presence matrix (bytes; `*` = content changed vs previous deploy)

| file | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| index.html | 958 | 4696* | 6563* | 9366* | 28222* | 39638* |
| sw.js | 407 | 1776* | 2274* | 2274 | 2274* | 2274 |
| netlify.toml | - | 2951 | 3247* | 3247 | 5499* | 5499 |
| landing.html | 20257 | 20257 | 22125* | - | - | - |
| google0dca4879c9657741.html | - | 53 | - | - | - | - |
| privacy.html / terms.html | - | - | tmpl | tmpl | real | real |
| site-nav.js / .css | - | - | - | - | 15829 / 7251 | same |
| user-guide.pdf | - | 4587 | 9282* | 9282 | 14321* | 14321 |
| sitemap.xml | - | 462 | 393* | 1733* | 3257* | 3257 |
| sub-pages (excluding privacy/terms/404/diagnostics/embed/uir) | 0 | 0 | 0 | 8 | 20 | 20 |
| icons (favicon/apple-touch) | - | ICO-as-PNG | same | same | real | real |
| screenshots/day1.png = day3.png | - | corrupt | corrupt | corrupt | corrupt | corrupt |
| data/*.json | 70 | 70 | 70* (5 B) | 70 | 70 | 71 (monuments.json) |

## Appendix B. Reproduce

```
python tmp-deploy-history/inv.py              # per-deploy file/hash matrix
python tmp-deploy-history/zipscan.py          # 126 zips, probes
python tmp-deploy-history/probe2.py && probe3.py   # first-appearance of features
python tmp-deploy-history/chain2.py           # UI-string changelog between consecutive bundles
python tmp-deploy-history/chronofit.py        # chronology labels vs formulas (43/137, 2/137)
python -c "import datetime;print(datetime.datetime.fromtimestamp(int('6aa16d61',16),datetime.timezone.utc))"
```

## Appendix C. Finding index (`DH-NN` = structured id `deploy-history-NN`)

| ID | Title | Sev | Effort | Audit refs |
|---|---|---|---|---|
| DH-01 | Content-hash every asset; kill same-name/different-content releases; generate SW precache list | critical | M | N1, C6, P1, P5 |
| DH-02 | Hotfix C6: delete `controllerchange -> location.reload()` (F index.html 258-272) | critical | S | C6, P1, P7 |
| DH-03 | Service worker: interim kill-switch, then guarded SW with user-initiated update | high | S/M | C6, P5 |
| DH-04 | C3: three unique one-token bundle patches + shared date helper | critical | S | C3, C4 |
| DH-05 | C4: one time model (tick -> clock/date) shared by app and sub-pages; reconcile data labels/schema | critical | L | C4, C3 |
| DH-06 | C5: restore the missing gold-trail engine and hooks; harden `activateAncestor` | critical | M | C5 |
| DH-07 | C1/C2: stop rendering desktop widgets in mobile layout; move credit line | critical | M | C1, C2 |
| DH-08 | C8: search chip button reset + focus style; audit other span->button conversions | critical | S | C8, A1 |
| DH-09 | C7: dashboard stat-card builder for nested notes; remove dev note | high | S | C7, H7 |
| DH-10 | H1: fold Extra Features/Historian into the real toolbar; delete collision-mover and force-reveal | high | M | H1, X3, P4 |
| DH-11 | Netlify hygiene: stale deploys, netlify.app host, pretty URLs, `/landing` redirect, dev pages | medium | S | T3, X-new |
| DH-12 | Search Console: re-verify (DNS), resubmit sitemap, remove `/landing.html` | medium | S | T1 |
| DH-13 | Replace corrupt `screenshots/day1.png`/`day3.png` and OG image; add image-decode CI check | medium | S | T1 |
| DH-14 | Restore code-splitting via rebuild (entry <= 150 KB gz) | high | L | P2, P7 |
| DH-15 | Recover/rebuild real source: baseline choice, fidelity diff, fix RECON defects | critical | XL | N1 |
| DH-16 | Restore the data validator/perf tests/CI and extend | medium | S | N1, C4 |
| DH-17 | Privacy/Terms completeness (PeerJS, Mapbox telemetry, AR, Google embed) | medium | S | X5 |
| DH-18 | CSP: recover Jun 22 enforcing allow-list, externalize inline scripts, add RUM host, enforce | medium | M | X3, P7 |
| DH-19 | embed.html header conflict cleanup | low | S | X4 |
| DH-20 | Sub-page map pages: pin/defer Mapbox CDN, skeletons, retest S2/S3 | medium | S | S2, S3 |
| DH-21 | Remove F's Monuments overlay hack; port natively | medium | S/M | new |
| DH-22 | Single source of truth for unit counts (445+ vs 467) | medium | S | H10 |
| DH-23 | One `<h1>`; reconcile splash/#seo-content/noscript; drop "AI-style" | medium | S | E3, E4, H8 |
| DH-24 | Manifest: drop landscape lock, align names | low | S | E1, E2 |
| DH-25 | CLS: EventPanel reserved height + overlay position without shifts | high | S/M | P1 |
| DH-26 | LCP/FCP: re-baseline after DH-02; stabilize the LCP element | high | M | P1, P7 |
| DH-27 | Defer `site-nav.js/css` on the home page | medium | S | P4 |
| DH-28 | Replace CSS preload+onload swap | medium | S | P5 |
| DH-29 | Dev-log copy and data strings | medium | S | H7 |
| DH-30 | Distance tool: fix or restore A/Y design | medium | M | H12 |
| DH-31 | Street View: missing panos (stops 3, 5), re-key iframe | low | S | H13 |
| DH-32 | Long-standing bundle fixes (Esc, layout persistence/auto-detect, defaults, natural sort, speed label, minimap label) | high | L | H2, H3, H4, H5, H9, H11 |
| DH-33 | Per-deploy performance baselines and RUM annotation | medium | S | P1 |
| DH-34 | Pre-deploy gate script | medium | S | X5, C7, T1 |

---

## Verification (adversarial pass, 2026-09-30)

Verifier method: re-opened every cited file/line (bundle.pretty.js, bundle.min.js offsets, DEPLOY_DIR files, tmp-deploy-history copies, Downloads zips/source trees, lh_*.json, rum PNGs), re-ran the numeric claims (chronofit, datacmp, zip name scan in `tmp-verify-deploy-history/namecount.py`), and re-curled the live site, old permalinks and the netlify.app host. Netlify header semantics were checked against Netlify's support forum (thread 26263: "no way to unset a default header; overwriting works"). Nothing outside this file and `tmp-verify-deploy-history/` was written.

Overall: the archaeology is largely sound (line numbers, offsets, byte counts, deploy-ID decoding and the live curls reproduce). The defects are in FIXES that would misfire (DH-06, DH-08, DH-18, DH-20, DH-28), in two claims that are wrong (DH-30 "lost" feature, DH-13/24 "icons fixed in E"), and in causal claims about the Lighthouse mobile numbers that are hypotheses, not findings.

### Verdict table

| ID | Verdict | Evidence / correction |
|---|---|---|
| DH-01 | CONFIRMED (notes) | Name reuse reproduced: my scan of all 189 zips in Downloads found 86 zips containing `assets/index-Cg8FAMXN.js` with 45 distinct md5 (report: >=40). B `0903f96b` 2,280,095 B vs C-F `7ef75b95` 2,280,438 B ok. sw.js:5-13 (hardcoded name), :41-47 (cache-first, no `res.ok`), netlify.toml:23, index.html:259-263 ok. Notes: rewrite must run in dependency order (leaf chunks, then entry, then index.html/sw.js) because the entry embeds chunk names (`bundle.pretty.js:112469-112470`); the "worker URL" rewrite is moot: `interpolationworker-ufiwa2-e.js` (672 B) is an orphan (0 case-insensitive hits in bundle, HTML, sw.js) - delete it. |
| DH-02 | CONFIRMED (fix); impact claim unproven | index.html:258-272 ok; sw.js:17 skipWaiting, :30 claim ok; no other `location.reload` in bundle (0 hits). Lighthouse: Document requests at 0.63 ms and 908.8 ms ok, 37 distinct /data URLs / 76 requests ok, `redirects` 9,066.6 ms ok, observed FCP=LCP=287 ms ok. But see DH-26: that the reload "dominates" the simulated 9.0 s LCP is a hypothesis. |
| DH-03 | CONFIRMED | History verified from zips: FIXED_FINAL (Jun 13 14:31) sw.js 4,060 B + 3 `serviceWorker` refs in index js; USEREF_FIXED (14:37) sw.js 407 B, refs still 3; FINAL_v2 (14:41) refs 0. Note A's 407 B sw is pass-through + `clients.claim()`, NOT self-unregistering; the proposed unregistering interim SW is correct (and better than A's). |
| DH-04 | CONFIRMED (notes) | Lines 97428, 100842, 101006 ok; bundle.min.js offsets 1988148 / 2053520 / 2056190 ok, each replace-string occurs exactly once ok; source sites useAppStore.js:68, PlaybackStatus.jsx:32, FollowAncestor.jsx:28, MonumentSystem.jsx:48 ok. Notes: the literal `+2}` also occurs once in Mapbox code (offset 659987), so scope the post-patch assertion to `July ${`; offsets are character offsets (file has 929 non-ASCII bytes) - use string replace, not byte offsets; fixing dates without DH-05 leaves JF/QF clocks at 5:00 vs toolbar 6:00. |
| DH-05 | CORRECTED | Reproduced: 43/137 exact vs 5:00 formula, 2/137 vs toolbar clock, Day 2 drift to -230 min, Day 3 median -70; schema `real_time` strings ok (`placement_schema.json`). Corrections: QF function head is `bundle.pretty.js:100998` with the 5:00 line at :101002 (not :100996); option (a) "piecewise scale from schema spans" does NOT reproduce existing labels (Day 2 labels are 5-min-exact for early ticks: 34/49, then compress - e.g. tick 267 at 3.97 min/tick = 7:43am vs label 8:25am), so it is a full relabel needing historian sign-off, not a formula fix; the "~7:30" first-shot text is vignette data (`data/vignettes_part1.json:32`, trigger_tick 12), not documentary.html. |
| DH-06 | CORRECTED | Root cause confirmed: bare `setGoldUnit/clearGoldTrail/drawGoldTrailSegment` at bundle.pretty.js:101086/101101/101229, zero definitions anywhere in DEPLOY_DIR (also not in index.html), 0 refs to `initGoldCanvas/getGoldUnitId/goldCanvas`; source FollowAncestor.jsx:15 re-export only, uses at 103/104/115/204 ok. Fix is wrong as specified: `st()` (:101081-101111) projects every trail segment with `map.project` BEFORE `flyTo(zoom 14, 1200 ms)` and draws on a screen-space canvas sized once at init, so the restored engine paints a trail at stale pixels after the fly-to and after any pan/zoom. Correct fix: draw the trail as a lng/lat GeoJSON LineString source+layer (same pattern as the working `GtbgDist`, :112677+), update with `setData`, clear on close; wrap the trail calls in try/catch so `flyTo`/`selectedUnitId` always run. Effort M-L. |
| DH-07 | CONFIRMED (caveats) | Gating at :113071 and :113233; unconditional widgets :113240-113270 (`_F` 113248, `IO` 113249, `yO` 113255) ok; tn.root zIndex 100 (:103703) vs Po.wrap `position:absolute;bottom:0;zIndex:100` (:112376-112387; cited 112386, off by one) ok; toolsOverlay zIndex 500 (:104037) ok; patch target `V.jsx(_F,{}),V.jsx(IO,{}),` occurs once (min.js 2277405), `yO` once (2277578) ok. Safe to gate: `IO` is display-only (:112202) and the mobile layout has its own play row (:103218-103246); data load is in App (`sF` :112963) so deferring the desktop map does not block the intro. Caveat: the patch as written gates only 3 widgets; `VF, CF, LF (EventPanel), KF, XF, iO, nO, qF, MF` still mount in mobile and each needs a device check. |
| DH-08 | CORRECTED | Timeline ok (d_aug23/search.html:44-47 spans; search.html:56-59 buttons). Root cause incomplete/misstated: `site-nav.css:143-147` `button.filter-chip{font:inherit;color:inherit;appearance:none}` (specificity 0,1,1) overrides search.html:30 `.filter-chip{color:var(--muted)}`, giving ink #E8E6DF on UA #F0F0F0 = 1.096:1 (computed). Muted #8A93A8 on #EFEFEF would be 2.68:1, so the 1.10:1 cannot come from the muted colour. "Safe on compare/camera/education/sandbox (verified)" is refuted for colour/font: `.play-btn{color:#0a0a14}` is overridden to ink on gold = 1.92:1 (camera, ground-remembers, immersive, watch-together, unit-rendering-reference; see pages-A pagesA-02). Proposed `button.reset{all:unset}` repeats the specificity trap (0,1,1 beats page classes and wipes padding/border/background) - use `:where()` or `@layer`. The search.html `background:transparent` line does cure the contrast, but inactive chips then read as ink, not muted; fix the shared reset at the source. |
| DH-09 | CONFIRMED (minor) | dashboard.html:244-247 loop, :258-263 note ok; data shape ok (`highest_single_regiment_rate = {union:{unit,rate,note}, confederate:{...}}`). Corrections: the svg ALREADY has `viewBox="0 0 1000 440"` (line 71); the scroll comes from the fixed `width="1000"` plus `#chart-wrap{overflow-x:auto}` (line 31) - fix is `svg{width:100%;height:auto}`; tooltip math uses `svg.getBoundingClientRect()` (:192), re-test after scaling; proposed `num:v.unit` would show raw ids like `U-1MN` - show the rate/name instead. |
| DH-10 | CONFIRMED (notes) | d_aug23/index.html:138-146 ok; F collision mover :520-606 (6 candidates, `applyPosition` + `getBoundingClientRect` over every interactive element per candidate, click capture + 150 ms timer) ok; 'AI-style' :377 ok; Lighthouse desktop `body > div#extra-features` 0.007165 ok. Corrections: F has 7 executable inline scripts (lines 255, 294, 355, 398, 441, 521, 608) plus one JSON-LD block (line 27, data, not subject to script-src) - "8" overstates the CSP burden; the "CSS grid slot in the toolbar row" short-term fix is not possible from outside React (toolbar is `tc.toolbar` in the bundle) - it needs a bundle patch or a fixed known-free slot (effort S -> M). |
| DH-11 | CONFIRMED | Live curl today: `6a3a0355...--friendly-lolly-da85c0.netlify.app` /landing.html 200 (20,718 B; contains "$9.99", "free trial", "7-day"), /diagnostics.html 200; `6a8a9268...` /diagnostics.html 200, /landing.html 404; `6a2da5d2...` 404 on all; `friendly-lolly-da85c0.netlify.app/` 200, no Location, XFO DENY, CSP-RO; live /landing.html 404, /diagnostics.html 404, /unit-rendering-reference.html 200; /dashboard and /dashboard.html both 200; live index vs deploy F differs only by pretty-URL/quote rewrite + injected RUM script (40,068 vs 39,638 B) ok. Deploy-ID decode (int(id[:8],16)) re-verified for all six IDs. Prefer the primary-domain setting over a `from=https://...netlify.app/*` rule (force semantics on the netlify.app host not verified). |
| DH-12 | CONFIRMED | `google0dca4879c9657741.html` only in b_jun23 ok, live 404 ok, no `google-site-verification` meta anywhere in F ok. Sitemap has 21 `<loc>` (home + 20 pages), not 20; privacy/terms absent ok. |
| DH-13 | CORRECTED | PNG corruption reproduced: day1.png = day3.png (md5 3f6646c9, 17,585 B), IHDR 1280x720 RGB, inflated IDAT 3,687,120 B, PIL "unrecognized data stream contents" ok; og:image/twitter:image index.html:21,25 and manifest.json:27,33 ok. Wrong: "PNG icons had transparent backgrounds with purpose 'any maskable' (fixed in E)". In F, icons/icon-192.png, icon-512.png and apple-touch-icon.png are still 22-24% fully transparent (corner/margin pixels alpha 0; only a rounded gold-bordered square is opaque) and manifest.json:15,21 still says `"purpose": "any maskable"`. Only the ICO-named-PNG problem was fixed. |
| DH-14 | CORRECTED | History ok (FINAL_v24 PROJECT_SUMMARY "Bundle size 276KB" line 27; vite.config.js manualChunks lines 11-19); Lighthouse 603,207 B / 52% unused ok. The budget "total initial JS <= 500 KB gz" is unattainable if mapbox-gl is in the initial payload: slicing bundle.pretty.js lines 10,500-96,000 (mapbox-gl 3.24.1 marker at :53873) is ~2.09 MB stripped / ~541 KB gzip (~490 KB scaled to the minified file); app code (lines ~96,000-113,378) is only ~360 KB raw / ~85 KB gzip and React etc. ~54 KB gzip (estimates from gzip -9 of stripped slices). Entry <=150 KB gz is feasible; Mapbox must load after first paint and be excluded from the "initial" budget, or the total budget must be ~700 KB gz. |
| DH-15 | CONFIRMED (alt. path) | RECON README/PENDING line 4 "No original source ever existed" ok; store.js:53-60 5:00 + `day + 2` ok; MonumentsLayer.jsx:21 `day + 2` ok; mapbox-gl ^2.15.0 (package.json:12) ok; v2_fixed 65 files / 8,423 lines ok. Not weighed: the deployed bundle's app region is only ~17k lines (bundle.pretty.js ~96,000-113,378, plus the store at ~9,300-9,500) with vendor code cleanly separable and all strings preserved; splitting that directly may be a cheaper and more faithful baseline than porting ~20 patches onto Jun-13 v2_fixed. XL is realistic for the port route. |
| DH-16 | CONFIRMED | tests/validate_data.py 279 lines, perf_test.py 103 ok; FIXED_v25 `.github/workflows/ci.yml` calls both, `tests/` missing ok; README 46 passing / 467 slots vs PROJECT_SUMMARY 63 passing ok; recomputed: placements+density = 47 files, 1,804 records, 478 unique unit_ids ok. |
| DH-17 | CONFIRMED | privacy.html has no PeerJS/WebRTC/AR-permission/telemetry text; says Street View on "documentary and report pages" while the main bundle embeds it (bundle.pretty.js:110610, 110661) ok; terms.html:27 "embedding its widget" ok; dated Sep 7; contact gmail ok. |
| DH-18 | CORRECTED | Quoted policy matches gettysburg_v17_csp_fix `dist/netlify.toml:13` ok. "worked for the app" is unsupported: the same zip history removed it ~5 minutes later (v17_nocsp) - treat as abandoned/untested, not known-good. Proposed `script-src` omits `cdn.jsdelivr.net`, which watch-together.html:19 loads (`peerjs@1.5.4`); the current RO policy includes it (netlify.toml:19), so enforcing as written breaks Watch Together. Also blocked under enforcement: the inline `onload="this.onload=null;this.rel='stylesheet'"` (index.html:56-57) and (needing `style-src 'unsafe-inline'`) every inline style attribute. Executable inline scripts = 7 (see DH-10). |
| DH-19 | CONFIRMED (caveats) | Live embed.html sends `X-Frame-Options: DENY` + `CSP: frame-ancestors *` and ALSO still the global `CSP-Report-Only` although netlify.toml:85 sets it to "" - the empty-value unset fails for every header. Netlify staff: no way to unset, overwriting works (forum thread 26263), so removing global XFO and using CSP is sound. Caveat: once DH-18 enforces a global CSP, the embed override REPLACES the entire CSP for that path (no merge), so it must repeat the full policy with only `frame-ancestors` changed; the override rule must stay after `/*` (it does). |
| DH-20 | CORRECTED (fix breaks pages) | Evidence ok (D 3.6.0 -> E 3.24.1 on camera/compare/sandbox/viewshed; sync CDN `<script>` in head, e.g. camera.html:20). Adding `defer` as written breaks every map page: classic inline scripts call `mapboxgl.accessToken=` / `new mapboxgl.Map` at parse time (camera.html:62-65,144; ground-remembers.html:54-69; viewshed.html:58-73) and inline scripts run before deferred ones -> `ReferenceError: mapboxgl is not defined`. Move the page code into a DOMContentLoaded/load handler (or make it `defer`/module) in the same change; then add preconnect + skeleton. |
| DH-21 | CONFIRMED (+extra) | index.html:608-714 overlay, "Known, disclosed limitation" comment ok; `data/monuments.json` 9 entries + `_note` ~1,328 ok; story-marker component `KF` (bundle :100845) ok. Extra: `sn` defaults to true (`[sn,$n]=useState(!0)`, :112946), so the app's markers are ON at load and the button toggles them; F's overlay hooks the same button, so the first click hides the app's markers and shows the stars (inverted state). |
| DH-22 | CONFIRMED | `445+` only in the HelpModal chunk (helpmodal-cfv9t0zh.js) and source HelpModal.jsx:67; 0 in main bundle ok; "467 regiments and batteries" in index.html:15/18/24/32/719/754 and manifest.json:4 ok. |
| DH-23 | CONFIRMED | `<h1>` count B-E = 1, F = 3 (index.html:718, 744, 753) ok; 'AI-style' :377 ok. |
| DH-24 | CORRECTED | manifest.json:9 `"orientation": "landscape"`, name "Gettysburg Animated Battlefield Map" ok. Icon statement inherits the DH-13 error: icons are still transparent and `any maskable`; the recommended split into an opaque maskable entry is right and still needed. |
| DH-25 | CORRECTED | `LF` = EventPanel (Vc.panel :98615, style :98659-98675, rendered unconditionally in App) ok. Lighthouse mobile: 15 shifts, total 0.0720-0.0726; 8 (not 9) are attributed to the `bottom:120px` div, summing 0.0441 (61%); one further shift (0.0079) is unattributed. RUM CLS p75 ~0.19 / p99 ~0.32 near Sep 9.9 and the ~0.29 spike ~Sep 18 match rum2.png, but are read off a chart (approximate). Fix (gate `LF` on intro-complete `vn`) is a one-token bundle patch and viable. |
| DH-26 | CORRECTED | Numbers ok (obs FCP=LCP 287; sim FCP 4,098.7, LCP 9,007.2, TTI 9,092; TTFB 152 + render delay 457; desktop obs LCP 4,580 vs sim 2,229). The claim that removing the reload "collapses most of the gap" is a hypothesis: Lighthouse's `document-latency-insight` reports "Avoids redirects" true / redirectDuration 0, and the `lcp-breakdown-insight` totals ~609 ms; the simulated 4.1 s/9.0 s could equally be driven by the 604 KB modulepreloaded JS on simulated 1.6 Mbps and 4x CPU. Require an A/B (preview deploy with and without the reload) before claiming green. Line drift: splash h1 clamp is index.html:108 (cited 91+); `appName` fontSize 52 is bundle :101618 (cited 101593+). |
| DH-27 | CONFIRMED | F:279-280 synchronous ok; Lighthouse render-blocking-insight 5,396 B + 2,463 B ok. `defer` is safe on index.html: the populate script waits for DOMContentLoaded (index.html:300) and `document.currentScript` is valid for deferred classic scripts (site-nav.js:8). |
| DH-28 | CORRECTED | F:56-58 ok, mapbox-gl.css 40,827 B ok, Lighthouse lists the CSS 3 requests. Fix caveats: a plain `<link rel=stylesheet>` puts 40 KB on the mobile FCP path; the media-swap alternative also relies on an inline `onload` handler, which conflicts with an enforced CSP (DH-18). Prefer importing the CSS from the entry JS or an external loader script. |
| DH-29 | CONFIRMED | viewshed.html:46 ("Earlier drafts...", "doesn't have access"), ar.html:56 ("we haven't been able to do from here"), search.html:112 ("Commander unrecorded"), `"14th Brooklyn (alias for U-84NY)"` in union_regiments_i_ii_corps.json, dashboard note ok. |
| DH-30 | CORRECTED (part REFUTED) | The deployed `GtbgDist` (bundle.pretty.js:112677-112919) ALREADY shows ft, yd, m and "March time" (`mtime`, 67 m/min), and draws two circle markers + a dashed line layer when `setData` succeeds - so "restore lineage-Y panel with feet/yards/meters and march time" is moot; only the header text differs ("Distance Tool" vs "Distance Measurement"). The `catch(e){}` swallowing hypothesis for the one-marker symptom is unproven. Keep the `isStyleLoaded()/once('idle')` guard + error logging as a diagnostic step; effort S-M. |
| DH-31 | UNVERIFIABLE (partly confirmed) | Stops 3 and 5 lack `pano` (bundle :104149, :104188; 14/16 stops have pano) ok. The iframe-reuse / `key` theory is unproven (changing an iframe's src always navigates; the identical caption may be a load-timing artifact in the audit) and pano IDs cannot be verified offline. |
| DH-32 | CONFIRMED | :112967 INPUT guard, :112949 `useState(null)`, :112951 gtbg_onboarded, :113061 chooser, :101039 localeCompare, :97429, :99821, toasts `setTimeout 4500` :99909-99915, Suspense `fallback:null` ok. Note the minimap label counts placements keyed at exactly that tick (`(x[z]\|\|[]).length`), so it is semantically wrong rather than stale. |
| DH-33 | UNVERIFIABLE (process) | Arithmetic ok (D live Aug 30 -> Sep 8 16:05; E 0.77 d; F 20.5 d). The meaning of the grey RUM bands is unknown; Netlify's 30-day headline ("Poor": LCP>4000, FCP>3000, CLS>0.25) is not obviously derivable from the hourly p75 lines in rum1/rum2.png (mostly low with single-session spikes), so the aggregation method is opaque - add a web-vitals beacon to own the data. |
| DH-34 | CORRECTED | Scope is wrong as written: banning `undefined`/`TODO` over raw file bytes fails on the 2.28 MB bundle, Mapbox code and inline scripts. Scope to rendered visible text / JSON string values; use `sk\.eyJ` for Mapbox secret tokens; count executable inline scripts and exclude JSON-LD. |

Summary counts (34 findings): CONFIRMED 19 (01, 02, 03, 04, 07, 09, 10, 11, 12, 15, 16, 17, 19, 21, 22, 23, 27, 29, 32), CORRECTED 13 (05, 06, 08, 13, 14, 18, 20, 24, 25, 26, 28, 30, 34), UNVERIFIABLE 2 (31, 33), REFUTED 0 whole findings (but DH-30's "lost feature" premise and DH-20's literal fix are refuted).

### Corrections to report prose (not structured findings)
- Section 2.2 "IDs to look for ... `6a9e52e0...` (Sep 7 06:00Z)": that is just the ObjectId prefix of the timestamp 06:00:00Z, not a known deploy ID.
- Section 6 / Section 0 item 7 "mobile lab LCP/FCP failure is dominated by the reload artifact" is a hypothesis (see DH-26).
- "Sitemap 20 URLs": 21 including the home page.
- Appendix A / Section 3.4 "icons fixed in E": only the ICO-as-PNG was fixed; transparency remains.

### Missed issues (added by the verifier)

1. **[high] `site-nav.css:143-147` shared button reset is the real cause of C8 and of 1.92:1 Play buttons, and it is still live on 10+ pages.** Evidence: `button.mode-btn, button.play-btn, button.toggle-btn, button.day-tab, button.filter-chip, button.btn, button.match{font:inherit;color:inherit;appearance:none...}` has specificity (0,1,1) and beats every page class (0,1,0), overriding colour, font-size and weight (compare `.toggle-btn` 10px -> 16px; see pages-A pagesA-02). Fix: make the reset zero-specificity (`:where(button,input,select,textarea){font:inherit;color:inherit}`), drop the `all:unset` idea, then add `background:transparent` to search `.filter-chip`.
2. **[high] Restoring the gold-trail engine as a screen-space canvas will draw a wrong trail.** Evidence: bundle.pretty.js:101081-101111 projects all points then `flyTo`; canvas sized once (`initGoldCanvas` in source GoldTrailEngine.js:8-16). Fix: GeoJSON line layer in lng/lat updated on `setData`, cleared on close (DH-06 correction).
3. **[medium] Any Lighthouse baseline taken today is contaminated by the reload beyond LCP.** Evidence: `unused-javascript` lists index-Cg8FAMXN.js twice (315,185 and 314,039 wasted B); network-requests shows the JS fetched at t=160 ms (604,586 B) and again at t=1,046 ms (0 B, cache), so `bootup-time` (3.3 s) and `mainthread-work` (5.6 s) cover two page loads; `document-latency-insight` simultaneously says no redirects. Fix: take the baseline with the SW blocked / on a preview build before setting budgets; expect bootup/main-thread to roughly halve independent of any code change.
4. **[medium] CSP enforcement blockers not in DH-18.** Evidence: watch-together.html:19 loads PeerJS from `cdn.jsdelivr.net` (needed in script-src); inline `onload=` on the CSS preload (index.html:56-57); the embed.html override replaces the whole CSP; RUM host `ingesteer.services-prod.nsvcs.net` (Lighthouse inspector-issues). Keep all of these in the allow-list and in the Report-Only trial.
5. **[medium] PWA/iOS icons are still transparent and the manifest still marks them maskable.** Evidence: icon-192/512 and apple-touch-icon 22-24% alpha-0 pixels, manifest.json:15,21. Fix: opaque 512x512 maskable with a safe zone, separate `any` entry, opaque 180x180 apple-touch-icon (iOS fills transparency black).
6. **[medium] `defer` on the CDN Mapbox script breaks every sub-page map** (DH-20 correction) - add a regression check that opens each map page and asserts no console errors.
7. **[low] Publish tree still ships dev pages and an orphan asset.** Evidence: the F permalink and the live site serve `/unit-rendering-reference.html` (200); `diagnostics.html` exists in the tree and is only hidden by the `force=true` 404 rule in netlify.toml (a rule regression re-exposes it); `assets/interpolationworker-ufiwa2-e.js` has no referrer. Fix: remove all three from the deploy tree instead of hiding them.
8. **[low] Monuments overlay inverts the button state** (DH-21 extra): app story markers default ON (`sn` true) and F's overlay defaults OFF on the same button, so the first click hides one layer while showing the other.
