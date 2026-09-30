# perf-cwv: Core Web Vitals and Lighthouse root-cause and fix plan (FCP, LCP, CLS, INP, TTFB, TBT, TTI, Speed Index)

Specialist: `perf-cwv` (no-build plan; read-only analysis plus lab experiments on private copies under `plan-work/tmp-perf-cwv/`).
Site: https://gettysburginteractivemap.com, deploy `6aa16d6180cc621d7501ebe0` (Sep 29 2026), main bundle `assets/index-Cg8FAMXN.js`.
Line references: `index.html:N`, `sw.js:N`, `netlify.toml:N`, `site-nav.js/css:N` refer to DEPLOY_DIR (`.../site/deploy`). `bundle.pretty.js:N` refers to the prettier copy in `plan-work/`.
Conventions: **[MEASURED]** = I ran it and have the file; **[INFERRED]** = reasoning from code or data, not directly measured; **[UNVERIFIED]** = could not confirm.

---

## 0. Executive summary (read this first)

1. **The mobile lab score of 64 (FCP 4.1 s, LCP 9.0 s, TTI 9.1 s) is mostly a measurement of the first-visit service-worker reload plus a main thread that is blocked by the 2.28 MB bundle before first paint.** Lighthouse's own `redirects` audit attributes 9,066 ms to a second `GET /` (the `location.reload()` at `index.html:267`); the unthrottled observed LCP in that same trace was only 287 ms [MEASURED, `lh_mobile.json`: `observedLargestContentfulPaint: 287`, two `Document` requests at t=1 ms and t=909 ms].
2. **Fixing the reload alone makes the lab score WORSE (64 to 51).** I A/B-tested this on a local h2+brotli replica of the deploy (which reproduces the live score: local 64 vs live 64). With the reload removed, TBT jumps from 16 ms to 492 ms because the big bundle evaluation is no longer hidden inside the (simulated) pre-FCP window. **The reload fix must ship together with the "yield to first paint" fix and the main-thread work reductions** [MEASURED, section 3].
3. **Currently a fast-network visitor sees a blank white page until the bundle has finished evaluating.** In the no-reload variant the first three Lighthouse filmstrip frames (0.65, 1.29, 1.94 s) are pure white; first paint 2,285 ms, FCP 2,485 ms on an unthrottled dev machine, although DOMContentLoaded was at 506 ms [MEASURED, `lab/sheet_v1_mobile.png`, `lh_local_v1_mobile.json`]. The `#boot-splash` "renders at parse time" comment at `index.html:90` is only true when the JS arrives after first paint.
4. **The true LCP element is not an image or a resource. It is the story-panel narrative text painted by the app's own 3.5 s "Fast-forwarding 3 days of battle..." intro.** With real 4x CPU + Slow-4G throttling and no input for 20 s, final LCP = **4,776 ms** (mobile) / **4,928 ms** (desktop), element `<div style="font-size:12px;color:#999;line-height:1.8">The battle was over. From the first sho...` (108,016 px² / 144,754 px²), i.e. one of the last vignettes, shown as the fast-forward reaches the end of day 3 [MEASURED, `lab/probe_base_mobile_wait.json`, `probe_base_desktop_wait.json`]. This is a designed-in LCP of about 4.6-5 s for everyone who does not click before the intro ends, on the fastest machines too (live desktop trace: observed LCP 4,580 ms).
5. **The same intro is the main CLS source** (25 layout shifts (sum 0.115): intro block, bottom-anchored event card, story panel, clock label). Real-throttled mobile CLS = **0.115** (needs improvement) in the first 5 s [MEASURED]. On the choose-layout screen a hack script adds another **0.05** (banner injection into a React modal) [MEASURED, v10 probe].
6. **A pure HTML/config change set (no bundle edit) plus deleting the intro lifts the mobile lab score from 64 to 88-93 and desktop from 85 (live) to 100 (replica)**; a "boot only after first input" variant scores 100 as an upper bound (9 requests). Remaining gap to a robust 95+ on mobile is TBT (294-472 ms) and needs bundle-level work (section 9) [MEASURED, section 3 table].
7. **The Netlify RUM "Poor" badges for FCP, INP and CLS are not supported by the plotted data; only LCP is genuinely bimodal.** I recovered the p75/p95/p99 series from the PDF vector paths: hourly p75 buckets are 83% Good for FCP, 83% Good for INP, 96% Good for CLS, 100% Good for FID, but only 57% Good for LCP (33% Poor, i.e. > 4 s) [MEASURED extraction, +/- 1 px calibration]. The badges are almost certainly outlier-driven: tiny per-hour samples (p75 = p95 = p99 lines overlap) plus single events of 27 s FCP, 73 s LCP, 19 s INP, 0.38 CLS.
8. **RUM understates first-visit pain (survivor bias).** In my real-throttled first visit the first page never produced an FCP or LCP entry before the SW reload tore it down at 4.09 s; RUM then records the fast second (SW-cached) page (FCP 260 ms) [MEASURED]. Every first visit also yields two RUM records.
9. **INP has no lab-proven culprit yet.** Measured main-thread processing per interaction at 4x CPU was 1-32 ms; the code has several plausible hot spots (whole-store subscriptions in 25 components, a perpetual 60 Hz `requestAnimationFrame` + `setState` loop in the always-mounted monuments component, an O(n²) per-frame label-collision pass costing 1.3-8.4 ms desktop / about 5-34 ms on a 4x phone). Because the field INP is un-diagnosable today, item 1 of the roadmap after the HTML fixes is the web-vitals attribution beacon (section 8).

Target end state (all numbers are p75 field unless marked lab): LCP <= 1.5 s (mobile 4G) / <= 0.8 s (desktop), FCP <= 1.2 s, CLS <= 0.03, INP <= 150 ms, TTFB <= 400 ms, lab mobile Lighthouse >= 95, TBT <= 150 ms, TTI <= 3.5 s.

---

## 1. Evidence base and method

| Source | What I used | Notes |
|---|---|---|
| `lh_mobile.json`, `lh_desktop.json` (Lighthouse 13.5.0, simulate throttling, live site, Sep 29) | every audit: metrics debug data, network-requests (174 rows incl. both navigations), redirects, network-dependency-tree, render-blocking, bootup-time, mainthread-work-breakdown, long-tasks, layout-shifts, unused-javascript, diagnostics, user-timings, screenshots | Observed (unthrottled) vs simulated values differ enormously here; see section 2 |
| Netlify RUM + Web Analytics PDFs, `rum1/2.png`, `wa1/2.png` | RUM series extracted numerically from PDF vector paths with PyMuPDF (`lab`: `../rumx.py`, `../rum_*.json`); analytics for traffic context | +/- 1 px calibration (about +/- 1 s LCP, 0.3 s FCP, 13 ms INP); a constant 0.25 px plot offset was removed |
| Netlify's injected RUM script (`/.netlify/scripts/rum`, 11,141 B, saved as `../rum_script.js`) | It is **web-vitals v3 (non-attribution)**, sends on `visibilitychange:hidden`/`pagehide`, POSTs to `ingesteer.services-prod.nsvcs.net/rum_collection` with a bearer token, no bot filter, top-window only | Explains double records on reload and why no diagnosis is possible |
| Netlify docs (fetched) | "Netlify only considers metrics within the 75th percentile of all page loads"; charts are one-hour buckets; device filter exists; sampling unspecified; no custom-events API | https://docs.netlify.com/manage/monitoring/real-user-monitoring/ |
| `index.html`, `sw.js`, `netlify.toml`, `site-nav.js/css`, sub-page HTML | static analysis (line refs throughout) | |
| `bundle.pretty.js` | app boot, intro, store, frame loop, data loading, map init | Minified names are unchanged by prettier |
| **Lab replica**: `lab/server.js` (Node h2 + brotli q5, Netlify-like Cache-Control, RUM script served from a local copy whose ingest URL is rewritten to a local stub so **no lab beacon reaches the owner's real RUM data**) serving copies of SRC_DIR | Lighthouse 13.5.0 (from the local npx cache, no install) mobile+desktop A/B on variants v1-v11 | Baseline replica reproduces live: perf 64/64, FCP 3.98/4.10, TBT 16/30 |
| **Real-throttle probe**: `lab/probe.mjs`, `lab/inp_profile.mjs`, `lab/boot_profile.mjs` (puppeteer-core + Chrome 153, CDP `Emulation.setCPUThrottlingRate=4`, `Network.emulateNetworkConditions` Slow-4G, web-vitals v5 attribution injected) | first-visit/no-input LCP, CLS, INP-style event timing, CPU profile | Headless Chrome presents frames only when damaged, so **event `duration` (presentation delay) values are unreliable; only input delay and processing time are trusted** |
| **Micro-benchmark** `../bench_frame.js` | replicates the per-frame O(n²) loops of `lS`, `y1`, `X4` | Desktop timings; multiply by about 4 for a mid-range phone |

Caveats: (a) local replica gets HTTP 403 from Mapbox tile API because the Referer is `localhost` (see open question Q6), so map render work in lab is lighter than live; the replica still reproduced the live score. (b) Single Lighthouse runs vary about +/- 5 points (v10 mobile: 88, 93, 93). Use median of 5. (c) Lantern "simulate" scales an unthrottled trace; conclusions about *causes* are robust, absolute simulated numbers are model outputs.

---

## 2. What the mobile lab run is actually saying (why LCP 9.0 s and FCP 4.1 s)

### 2.1 Timeline reconstructed from the live trace [MEASURED, `lh_mobile.json` `network-requests`]

```
t=1 ms      GET /                       (h2, 13.5 KB br, TTFB 25 ms)          <- navigation 1
t=160       modulepreload index-Cg8FAMXN.js (604,586 B br) + preload CSS + site-nav.css/js + manifest
t=215-260   /.netlify/scripts/rum (Netlify-injected, async, Low)
t=539       two blob: workers (838,974 B each = Mapbox GL worker recompiled from a Blob)
t=541       mapbox style, 20 satellite tiles (337 KB), glyphs (87 KB)
t=607-616   ~38 JSON fetches (chronology x3, OOB x15, vignettes x3, terrain, day-1 placements x3 + density x13)  [584 KB raw / 135 KB br]
t=902       mapbox telemetry (events.mapbox.com x2, map-sessions)
t=909       GET /  (second Document request = location.reload())            <- navigation 2 (everything below is from the SW cache, transferSize 0)
t=1046+     same 84 requests again
```
`user-timings`: Mapbox `fullLoad` of navigation 1 at about 904 ms, reload at 909 ms. The `load` event handler registers the SW; install (precache from HTTP cache) + activate + `clients.claim()` + `controllerchange` all complete within a few ms of map load, so the reload arrives right after the first page finishes its whole boot. The first page's boot (JS download + 2.3 MB evaluation + 38 JSON + map init) is entirely thrown away.

### 2.2 Why the simulated numbers explode

* `redirects`: two `Document` rows for the same URL, `wastedMs: 9066.555`; metricSavings `LCP: 9050, FCP: 9050`. In Lighthouse's Lantern model the second document request is scheduled after the whole first load (network + 4x CPU evaluation of the bundle + 38 fetches) finishes, about 9.07 s of simulated time. LCP 9,007 ms and TTI 9,092 ms sit right on that boundary. **[INFERRED]** exactly how Lantern chains the two navigations; the audit values themselves are measured.
* `unused-javascript`: `metricSavings FCP 3100, LCP 3300`, 52% of 603,207 B unused, listed twice (one entry per navigation). Lantern therefore treats the 604 KB brotli bundle download (about 3.3 s at 1.47 Mbps) as being on the FCP/LCP path. That happens because `<link rel="modulepreload">` (`index.html:55`) makes the script `High` priority, which Lantern counts as render-blocking, and the main-thread evaluation (`bootup-time`: 3,787 ms total scripting on the JS file at 4x) precedes the observed first paint.
* Observed (unthrottled) FCP = LCP = 287 ms because in a lab trace the reloaded page is served by the SW from cache. That number is relative to the **second** navigation (`observedTimeOrigin` is the last navigation start). User timings confirm two Mapbox `create/load/fullLoad` mark sets.
* Desktop lab: `lh_desktop.json` `runWarnings: ["The page loaded too slowly to finish within the time limit"]`, `timing.total` 61 s, `observedTraceEnd` 44,543 ms, **observed LCP 4,580 ms** (desktop simulated LCP 2,229 ms is a scaled version of that). The desktop lab LCP of "2.2 s, mostly fine" is really the 4.6 s intro-driven LCP scaled by Lantern. `redirects` also fires on desktop (1,575 ms).

### 2.3 Lighthouse metric snapshot (live)

| Metric | Mobile | Desktop | Notes |
|---|---|---|---|
| Performance | 64 | 85 | weights (Lighthouse 10+ docs): FCP 10%, SI 10%, LCP 25%, TBT 30%, CLS 25% |
| FCP | 4,099 ms (observed 287) | 831 (observed 180) | |
| LCP | 9,007 (observed 287) | 2,229 (observed 4,580) | |
| Speed Index | 4,099 (= FCP) | 1,935 (observed 2,655) | |
| TBT | 26.5 ms | 0 | artifact of where FCP is placed, see 5.3 |
| CLS | 0.0726 | 0.0229 | 15 shifts each |
| TTI | 9,092 | 2,229 | |
| TTFB (server-response-time) | 25 ms (sim 600 ms = 4 RTT model) | 26 ms | fine |
| Requests / weight | 174 / 1.58 MB (both loads counted) | 174 | first navigation only: 84 requests, 1.20 MB br |

---

## 3. Lab experiments (A/B on a private replica; nothing under DEPLOY_DIR/SRC_DIR was touched)

All variants are copies of SRC_DIR served by `lab/server.js` (h2, brotli q5, Netlify cache headers). Variants live in `lab/v1..v11`, results in `lab/lh_local_*.json` (summary script `lab/summ.py`). Mobile = Lighthouse default mobile (4x CPU, 1.6 Mbps/150 ms simulated).

| Variant | Change vs previous | Perf | FCP (sim) | LCP (sim) | TBT | CLS | TTI | Observed FCP/LCP (unthrottled) | Read-out |
|---|---|---|---|---|---|---|---|---|---|
| base (replica of live) | none | **64** | 3.98 s | 5.97 s | 16 ms | 0.133 | 6.07 s | 198 / 4,598 ms (2nd nav) | Reproduces live 64 / 4.1 / 9.0 / 30 / 0.073 / 9.1; `redirects` 5.2 s |
| v1 | remove `location.reload()` (`index.html:264-268`), keep SW register | **51** | 4.05 | 6.74 | **492** | 0.079 | 6.87 | 2,485 / 5,152 | Score falls: TBT exposed; filmstrip frames 1-3 are **white** |
| v2 | v1 + drop `modulepreload` + replace CSS preload/onload swap by plain `<link>` | 48 | 4.00 | 6.55 | 511 | 0.120 | 6.57 | 2,389 / 2,389 | FCP unchanged: the FCP problem is main-thread, not the preload |
| v3 | v2 + `site-nav.js` `defer` | 52 | 3.94 | 6.60 | 406 | 0.097 | 6.62 | 2,519 / 5,018 | render-blocking-insight savings were 0 ms anyway |
| v4 | v3 + no SW registration at all | 54 | 3.98 | 6.55 | 402 | 0.065 | 6.58 | 2,513 / 5,063 | SW is not a cost in lab beyond the reload |
| v5 | v3 + **boot-after-first-paint loader** (`import()` of the bundle once `first-contentful-paint` exists; `modulepreload fetchpriority=low`) | **82** | **0.96 s** | 3.92 s | 193 | 0.019 | 4.38 s | 4,304 / 4,304 | FCP fix works in sim; observed FCP still late: entrance-animation quirk (see v8) |
| v6 | v3 + intro removed (bundle patched), parser-inserted module script | 46 | 4.00 | 6.47 | 747 | 0.000 | 6.49 | 7,312 / 7,312 | Deleting the intro alone does not help; boot must yield |
| v7 | v5 + intro removed | 63 | 1.01 | 5.05 | 526 | 0.050 | 5.07 | 4,730 / 4,730 | (still animation quirk) |
| v8 | v5 + `body{animation:none}` `#boot-splash{animation:none}` `color-scheme:dark` | 79 | 0.95 | 3.81 | 370 | 0.037 | 4.53 | **1,259 / 1,259** | Removing the entrance animations makes the splash count as FCP (4.3 s to 1.26 s observed) |
| v9 | v8 + intro removed | 85 | 1.00 | 3.86 | 161 | 0.050 | 4.40 | 1,371 / 1,371 | |
| **v10** | v9 + no `modulepreload` (bundle fetch starts after FCP) + 5 unused preconnects removed | **88 / 93 / 93** (3 runs) | 0.91-1.00 s | **0.91-1.00 s** | 294-472 | 0.050 | 4.4-4.7 s | 109 / 109 | LCP sim drops from 3.9 s to 0.9 s once the bundle download no longer completes before observed LCP |
| v11 (ceiling) | v10 but boot only on first input (or 12 s) | **100** | 0.90 | 0.90 | 0 | 0 | 0.90 | 112 / 112 | 9 requests. Upper bound, not a recommendation (see 4.7) |
| **desktop** base (replica) | none | 97 | 0.78 | 1.11 | 0 | 0.013 | 1.11 | 167 / 167 | replica trace ended at 3.1 s, before the intro's LCP (so it under-reads; live desktop was 85) |
| **desktop** v10 | as v10 | **100** | 0.26 | 0.26 | 2 | 0.008 | 0.83 | 120 / 120 | |

Sub-pages (replica, mobile, `lab/lh_page_*_mobile.json`): `camera` 69, `sandbox` 68, `viewshed` 69, `ground-remembers` 68 (FCP 4.1-4.2 s, LCP 5.4 s; render-blocking: `mapbox-gl.js`, `mapbox-gl.css`, `site-nav.js`, `site-nav.css`), `dashboard` 94 (**CLS 0.145**, footer shift), `historian` 100 (CLS 0.056), `documentary`/`regiment`/`search` 100. `compare`, `immersive`, `watch-together` returned `NO_FCP` in Lighthouse but paint fine under puppeteer (FCP 0.41-2.2 s) so that is a harness flake. Camera with `mapbox-gl.js` moved to `defer` + preconnect + page script wrapped in `DOMContentLoaded`: **69 to 86** (FCP 4.19 to 1.61 s, LCP 5.4 to 4.1 s, TBT 58) [MEASURED `lh_page_camera_v10.json`].

Real-throttle probes (4x CPU; mobile also Slow-4G 1.6 Mbps/150 ms; no input for 20 s; web-vitals v5 attribution):

| Run | FCP | LCP (final) and element | CLS | Other |
|---|---|---|---|---|
| base, mobile | nav 1: **no FCP/LCP before it was torn down**; first-paint only at 1,276 ms; reload document request at **4,090 ms** wall; nav 2 FCP 260 ms | **4,776 ms**, story-panel text (108,016 px²); first LCP candidate was 260 ms "GETTYSBURG" intro title | **0.115** (25 shifts 1.2-5.4 s, then 0.025 EF overlay at 10.2 s) | 2 document loads |
| base, desktop (4x CPU) | 280 ms (nav 2) | **4,928 ms**, same text (144,754 px²) | 0.0168 | reload at 1.3 s |
| v10, mobile | 604 ms | **604 ms** `#seo-content>p` (74,227 px²), unchanged for 20 s | 0.0497 (one shift, `Choose Your Experience` modal, banner injection) | 1 document load; app mounts about 4.5-6 s |
| v10, desktop (4x CPU) | 448 ms | **448 ms** `#boot-splash>h1` (116,472 px²) | 0.0078 | 1 document load |

---

## 4. Metric-by-metric analysis

Each subsection: current value, ranked root causes with evidence, exact fix, expected post-fix value with reasoning, how to measure (lab + RUM + segmentation), guardrail budget.

### 4.1 FCP

**Current.** Lab mobile 4.10 s (Lighthouse "poor" is >= 3.0 s) / desktop 0.83 s. Field (RUM series): median hourly p75 0.95 s, 83% of hourly buckets Good, 5% Poor, outliers 27.7 s (Sep 8 about 00:59 local) and 26.9 s (Sep 19 about 13:59), in both cases exactly equal to that hour's LCP [MEASURED extraction]. Netlify badge says Poor (>3 s).

**Root causes (ranked).**
1. **Bundle evaluation blocks the first paint on fast networks/cached loads.** `index.html:282` `<script type="module" crossorigin src="/assets/index-Cg8FAMXN.js">` is parser-inserted; when the JS is already in hand at parse end (modulepreload at `index.html:55`, SW cache, HTTP cache, fast link) Chrome runs it before the first frame: about 1.5-2.4 s of blank white on an unthrottled dev machine (v1: DCL 506 ms, first paint 2,285 ms, filmstrip frames 1-3 white) [MEASURED]. On a 4x phone with fast Wi-Fi this is 6-9 s of white. The inline comment at `index.html:90-92` ("FCP fires at parse time, not after 2.2MB JS") is wrong in exactly the fast cases.
2. **The entrance animations hide the splash from FCP/LCP.** `site-nav.css:12` `body{animation:gtbg-page-in 340ms ease both}` (opacity 0 to 1 plus translateY) and `index.html:99` `#boot-splash{animation:boot-fade-in .4s ease both}` paint text at opacity 0 on the compositor; Chrome's paint timing does not record it and does not repaint on the main thread. With the loader fix but with animations on (v5) observed FCP was 4,304 ms (the moment React painted); with animations off (v8) it was 1,259 ms [MEASURED]. This also explains why in the base real-throttle probe the first page produced `first-paint` at 1,276 ms but never an FCP. **[INFERRED]** exact Chromium mechanism; the A/B is measured.
3. **Lantern counts the 604 KB modulepreload as FCP-critical** (`unused-javascript` FCP savings 3,100 ms). Lab-only artifact, but the real analogue is bandwidth contention: on a 1.6 Mbps link the preload competes with `site-nav.css/js` for the first 3 s.
4. **Render-blocking chain (2 RTT deep):** `index.html:279-280` `<link rel="stylesheet" href="/site-nav.css">` + sync `<script src="/site-nav.js">` (the script cannot run until the CSSOM is ready). Lighthouse says 0 ms savings (`render-blocking-insight`), but on a real 150 ms-RTT link that is +150-450 ms to first paint.
5. **First-visit reload** (`index.html:267`) restarts the whole navigation: first-page FCP never reported, second page reports 260 ms. RUM therefore reports a *better* FCP than the user saw.
6. **Outliers (27 s):** FCP equals LCP (27.67 s on Sep 8 00:59, 26.91 s on Sep 19 13:59), i.e. a single page load whose first content was also its final paint. Most plausible: a stalled connection (about 27-31 s is the classic SYN-retransmit back-off), a background/discarded-tab restore, or a headless crawler on a throttled CPU (about 18% of pageviews come from CN/SG/HK/DE per `wa2.png`); the first spike is about 2 h after the first of three deploy markers (about Sep 7 22:00, Sep 8 20:00, Sep 9 16:00 local). **[UNVERIFIED]**; the beacon's TTFB sub-parts (dns/connection/waiting) will discriminate.

**Fix.** (a) Replace `index.html:282` by an inline boot loader that waits for `first-contentful-paint` (then `setTimeout 0`) before `import()`ing the bundle (spec in finding perf-cwv-02). (b) Remove both entrance animations (perf-cwv-03), add `<meta name="color-scheme" content="dark">` so the empty canvas is dark not white. (c) Drop `modulepreload`, drop the CSS preload/onload hack (plain `<link>` or inline the 40 KB Mapbox CSS subset), `defer` `site-nav.js` on the index page (perf-cwv-12/13/14). (d) Remove the reload (perf-cwv-01).

**Expected post-fix.** Lab mobile FCP 4.1 s to **0.9-1.0 s** (v5/v8/v9/v10 measured 0.91-1.00 s); desktop 0.83 s to **0.26 s** (v10 measured). Field: first-visit mobile 4G FCP about 1.0-1.5 s (v10 real-throttle 604 ms at 4x CPU/Slow-4G on a local server, so add real RTT/TTFB), p75 <= 1.2 s, and RUM will finally include the first-visit sample. Reasoning: with the bundle fetch starting after FCP and evaluating after the first frame, first paint depends only on HTML (13.5 KB) + inline CSS.

**Measure.** Lab: Lighthouse mobile+desktop median of 5 (LHCI), plus the `probe.mjs` filmstrip (assert the first frame is dark, not white). RUM: own beacon FCP with attribution (`loadState`, `timeToFirstByte`, `resourceLoadDelay`), segmented by `device` (touch/mouse), `effectiveType`, `firstVisit` (no `gtbg_seen` flag), `navType` (`navigate|reload|back-forward|prerender|restore`), `swControlled`, `bot`. **Guardrail.** FCP p75 <= 1.5 s (alert 1.8 s), lab mobile <= 1.2 s, no white frame before the first dark paint, pre-FCP JS <= 8 KB inline, zero render-blocking subresources beyond 1 tiny CSS file.

### 4.2 LCP

**Current.** Lab mobile 9.0 s / desktop 2.2 s. Field: hourly p75 median 1.8 s but 33% of buckets Poor (>4 s), series p75 4.7 s, p90 5.5 s [MEASURED extraction]. Netlify badge Poor (>4 s): **this one is real**.

**True LCP element.**
* Lab-observed, second (SW-cached) navigation: first candidate `div` "GETTYSBURG" (the app's intro title, 64,272 px² on mobile) at 260 ms; **final `div` "The battle was over. From the first sho..." (style `font-size:12px;color:#999;line-height:1.8`, the story-panel vignette body) at 4,776 ms mobile / 4,928 ms desktop** [MEASURED, real 4x throttle]. On non-reload variants (v1/v3) the final LCP node was "END OF THE BATTLE. Total Confederate losses approximately 37% of the army..." (`font-size:13px;color:#ddd`) at 5.0-5.15 s. Both are vignette texts for the last ticks, painted while the intro's `requestAnimationFrame` loop sweeps `currentTick` from 1 to 675.
* Static-HTML candidates: `#seo-content>p` (74,227 px²) and `#boot-splash>h1` (116,472 px² desktop) at about 0.45-0.6 s. They lose to the story-panel text (108k-145k px²) once the intro paints it.
* The Mapbox canvas is never an LCP candidate. There is no `<img>`, no web font. LCP breakdown in the live mobile trace was TTFB 152 ms + element render delay 457 ms (no resource delay/duration): LCP is purely a **render-delay** metric here.

**Root causes (ranked).**
1. **The auto-playing intro** (`bundle.pretty.js:101471-101560`, `eO = 3500`, mounted unconditionally at `bundle.pretty.js:113059`): 800 ms after `Object.keys(placementsByTick).length > 5`, a rAF loop calls `yn.setState({currentTick})` every frame for 3.5 s, then 0.6 s fade, so real LCP is at least 0.8 + 3.5 + 0.6 s after data arrives, about 4.6-5 s even on the fastest hardware. LCP keeps updating until the first input, so only users who click "Skip" early freeze it at a small value (this is why the hourly median is 1.8 s while a third of hours are > 4 s).
2. **No stable early "largest" element**: after the HTML splash is replaced by React (createRoot clears `#root` including `#seo-content` and `#boot-splash`), later text can be larger than the splash.
3. **Blank-white boot** (4.1 cause 1) delays the earliest candidate.
4. **Lab-only:** reload chain (9.05 s) and modulepreload in the LCP graph (LCP sim 3.9 s in v5-v9 even though observed LCP was 1.3 s; removing the preload in v10 gives 0.9-1.0 s).
5. **Lab fragility:** Lighthouse stops at load + quiet. The replica desktop trace ended at 3.1 s (observed LCP 167 ms) while the live desktop trace ran 44 s (observed LCP 4,580 ms). A lab score can pass or fail depending on whether the intro's text paint falls inside the trace. Add a "no input for 20 s" probe (`probe.mjs wait`) to CI.

**Fix.** (a) Delete the intro or make it opt-in and non-store-driven (perf-cwv-04). (b) Lock the LCP element: keep a large static hero (h1 + paragraph) as the biggest text block until first user input, and do not render vignette/story-panel text at first paint (perf-cwv-05). (c) All fixes under FCP. (d) Optional real poster image only if it will be smaller than the hero text; otherwise skip (a 1.76 MB Mapbox canvas is the real content; a facade adds nothing for LCP).

**Expected post-fix.** Lab: mobile 9.0 s to **0.9-1.0 s**, desktop **0.26 s** (v10 measured). Real-throttle no-input 20 s: LCP **604 ms mobile / 448 ms desktop and stable** (v10 measured, element `#seo-content>p` / `#boot-splash>h1`). Field p75: <= 1.5 s mobile 4G, <= 0.8 s desktop; the 33% Poor hours disappear (they are the intro-waiters). Reasoning: LCP becomes the static hero text (render delay only), and nothing later exceeds its area.

**Measure.** Lab: LHCI + `probe.mjs wait` (final LCP with 4x CPU + Slow-4G, no input). RUM: attribution `target`, `elementRenderDelay`, `navType`; histogram of LCP `target` selectors (expect >95% `#boot-splash>h1|#seo-content>p`). **Guardrail.** LCP p75 <= 2.0 s (alert 2.5 s); lab mobile LCP <= 1.5 s; LCP element must match the allow-list; `elementRenderDelay` <= 700 ms.

### 4.3 CLS

**Current.** Lab mobile 0.0726 (15 shifts) / desktop 0.0229. Real-throttle mobile **0.115** (needs improvement), desktop 0.0168. Field: 96% of hourly p75 buckets Good, median 0.018, but spikes 0.38 (Sep 27 about 23:00), 0.20 (Sep 19 about 17:00), 0.19 (Sep 10 about 09:00) [MEASURED extraction]. Sub-pages: dashboard **0.145**, historian 0.056 (lab) from the footer.

**Sources (from Lighthouse `layout-shifts` + probe attribution).**
| # | Source | Evidence | Size |
|---|---|---|---|
| 1 | Intro block re-centres when "Loading battle data..." becomes progress bar + day labels (`bundle.pretty.js:101509-101575`, `Va.content` flex-centred) | LH node `<div style="position:relative;text-align:center;z-index:1">` "GETTYSBURG Animated Battlefield Map... Fast-forwarding 3 days of ba..." | 0.0098 |
| 2 | Bottom-anchored event card `LF` (`bundle.pretty.js:98595-98700`, `Vc.panel`: `position:absolute;bottom:120px;left:50%;transform:translateX(-50%);width:460`) changes height with each event during the fast-forward | 8 LH entries "HIGH 10:00am / 7:35am / 11:30am / CRITICAL 9:20am"; probe entries "CRITICAL9:25am", "HIGH10:20am"... | 0.004-0.0096 each, about 0.04-0.05 total |
| 3 | Story-panel body swaps text per vignette (`bundle.pretty.js:98258+`, `font-size:12px;color:#999;line-height:1.8` and `overflow-y:auto;flex:1 1 0%;padding:0 14px`) | LH 0.0088; v3 0.0353; probe 0.0353 at 4.14 s | up to 0.035 |
| 4 | Clock label "July 1, 6:00 AM" width changes as digits change | 0.0002-0.0003 each, dozens | about 0.005 |
| 5 | **`#gtbg-onboarding-banner` injection** into React's "Choose Your Experience" modal (`index.html:355-396`, `insertBefore(banner, heading.nextSibling)`) | v10 probe: single shift 0.0497 at 4.68 s, source "Choose Your Experien..." | 0.05 |
| 6 | `#extra-features` overlay repositioned by the collision mover via `top/right/bottom/left` (`index.html:521-606`) after reveal (`index.html:509-517`, safety net at 10 s) | desktop LH node `top:50%;right:14px;transform:translateY(-50%)` 0.0072; probe 0.0252 at 10.2 s | 0.007-0.025 |
| 7 | Sub-pages: async content grows above the footer that `site-nav.js:189` creates (`footerMount.outerHTML`), no reserved height | dashboard CLS 0.1446, historian 0.0564, culprit `body > footer#gtbg-footer` | 0.056-0.145 |

CLS windows: the intro window (about 1.2-5.4 s) dominates; EF shift at about 10 s is a separate window.

**Fix.** Delete/neutralise the intro (removes 1-4, about 0.06-0.115); fixed-size boxes with `contain:layout` for the event card and story panel (event card `height`/`min-height` = worst case, content in an inner scroll box); replace the banner hack with React content or reserve its space in CSS; move EF into the real toolbar (H1) or only use `transform` and never change `top/left` after paint; sub-pages: `min-height` skeletons for async regions and `#gtbg-nav-mount/#gtbg-footer-mount{min-height}` (perf-cwv-15, -16, -21).

**Expected post-fix.** Lab mobile 0.073 to **<= 0.02**, desktop 0.023 to **<= 0.01** (v5 mobile measured 0.019; v10 desktop 0.008; v10 mobile 0.050 until the banner is fixed, then about 0.0). Field p75 stays about 0.02 and the 0.2-0.38 spikes disappear. **Measure.** LH + probe with attribution (`largestShiftTarget`, `loadState`), RUM CLS with `largestShiftTarget` histogram, segmented by page path (sub-pages contribute: they are 47% of pageviews per `wa1.png`). **Guardrail.** CLS p75 <= 0.05 (alert 0.1), p95 <= 0.1, lab <= 0.05, no shift > 0.01 after FCP without user input.

### 4.4 INP

**Current.** Lab: not measurable by Lighthouse (`inp-breakdown-insight` notApplicable); `max-potential-fid` 103 ms mobile / 19 ms desktop. Field: hourly p75 median about **80 ms** (offset-corrected), 83% of buckets Good, 5% Poor; extremes 18.8 s (Sep 26 about 14:00), 1.07 s (Sep 8 about 13:00, just after the first deploy day), 0.87 s (Sep 9 about 13:00), 0.76 s (Sep 20 about 14:00) [MEASURED extraction]. Netlify badge Poor (>500 ms). p95/p99 lines show 95 s: that is not a real interaction latency.

**Interpretation.** A 19-96 s INP is the classic "tab hidden before the next paint" artifact (web-vitals v3's INP counts `event.duration`, which runs until a frame is presented; a hidden tab presents none). The Netlify script (web-vitals v3, `durationThreshold` 40) has no visibility guard for INP. So INP "Poor" is very likely an outlier artifact of tiny hourly samples, not a systematic problem. **[INFERRED]** but consistent with FID being Good on every bucket (max 39 ms).

**Suspects (ranked by likelihood x impact; none lab-proven).**
1. **Frame loop hot paths during playback** (`Ed` `bundle.pretty.js:96965-97017` -> `y1` 96266, `dA` 97018, `lS` 96506-96690, `X4` 96480): per frame `Object.values({...i2})` spread + `M.find` per unit (O(n²)), `map.project` x n, `getBoundingClientRect()` (`:96510`), `c.width` reset, then 8 passes x n²/2 label-collision loop calling `lA()` in the inner loop (`:96560-96585`), then 2D-canvas draw of n units with `save/translate/rotate/shadowBlur`. **Microbenchmark (desktop, unthrottled)**: collision 1.27 ms (n=120), 3.52 (250), 4.34 (350), **8.41 ms (467)**; y1 0.13-0.48 ms; X4 0.03-0.34 ms [MEASURED `bench_frame.js`]. On a 4x phone that is about 5-34 ms per frame before canvas draw, so a tap during playback lands in input delay of 25-60 ms plus its own render. `M.width < 500` throttles mobile to 30 fps (`:97004-97011`) rather than cutting work.
2. **25 components call `yn()` with no selector** (`grep "= yn()" bundle.pretty.js` after line 96000 = 25, e.g. 97065, 97233, 97416, 98596, 99423, 99713, 100845, 102322, 102661, 102941, 112940, 112961; store `bundle.pretty.js:9361`), so every `currentTick`/selection/panel change re-renders the App and every panel; inline `style={{...}}` objects everywhere.
3. **Perpetual 60 Hz React re-render at idle**: `KF` (`bundle.pretty.js:100844-100870`, mounted unconditionally at `:113250`, `showMonuments` initial `!0` at `:112946`) runs `requestAnimationFrame(ut)` forever, projecting 20 monuments and calling `H(xe)` with a fresh object each frame, forcing a re-render 60x/s even when nothing changes. The main thread is never idle: desktop lab trace ran 44.5 s and warned "loaded too slowly". At play time `_F` (`:97415-97426`) adds a second per-frame `setState` loop (FPS HUD).
4. **First interaction lands mid-boot**: the "Skip introduction" / "Skip intro" tap happens during the intro rAF storm and right after the 2 MB evaluation. Real-throttle LoAF entries of 100-357 ms (blocking 50-306 ms) at 4x during boot [MEASURED `probe_*_wait.json`].
5. **Document-level capture click handlers with forced reflow** (`index.html:476-482` reveal, `:599-602` collision mover: after every click, 150 ms later it calls `getBoundingClientRect` on every visible `button, a, input, ...` for up to 6 candidate positions, each preceded by a style write = up to 6 forced layouts; `:497-508` `querySelectorAll('body *')` + per-node `getBoundingClientRect`). Small per event but runs after every click.
6. **Mobile layout mounts a second Mapbox map** (`pO` `bundle.pretty.js:102914`, `new z_.Map` at `:102981`) while the desktop `gF` map already booted behind the chooser (`Zn !== "mobile"` at `:113069+`, `Zn` null until chosen), and eagerly fetches all three days (`zp(1),zp(2),zp(3)` at `:103040`: 47 JSON files) plus a second chronology fetch (`:102958`). A phone user pays for two maps, two worker pairs, two WebGL contexts.
7. **Lazy `HelpModal`/`BookmarkPanel` chunks** (`bundle.pretty.js:112469-112470`) show no fallback (`Suspense fallback:null`), so the tap paints nothing until the chunk arrives (D1: 1-2 s). INP counts to next paint, so this is a UX bug more than an INP one.
8. **Not suspects:** measured processing time for F/S/L panel keys, typing, Escape, Right-arrow, slider drag at 4x CPU was 1-32 ms (`inp_profile_base_d4.json`); the CPU profile of a warm 9 s boot showed 66% idle, React render `Th` about 540 ms, `aT` spatial-index rebuild 62 ms, `(program)` (style/layout/paint/GC) 1.95 s [MEASURED `boot_profile_base_d4.json`].

**Fix.** (a) Ship the field beacon first (section 8) so INP is diagnosable: attribution `interactionTarget`, `inputDelay/processingDuration/presentationDelay`, LoAF scripts, plus a `visibilityChangedBeforePaint` guard that drops or flags the 19-96 s artifacts. (b) Remove the perpetual `KF` loop (drive it from `map.on('move')`, or render only when `showMonuments`). (c) Frame loop: spatial hash for collisions (grid cell = label size), cache `lA` per unit, run collision only when zoom/units-set changes or every N frames, replace `y1` with typed arrays or the (already shipped but unused) InterpolationWorker (`assets/InterpolationWorker-ufiwa2-e.js`, referenced nowhere in `bundle.pretty.js`), dirty-flag canvas redraw, no `getBoundingClientRect` per frame (use ResizeObserver). (d) Zustand selectors + `React.memo` panels; tick-driven canvas updates imperatively outside React. (e) One map only; lazy-load days. (f) Suspense skeleton for Help/Bookmarks. (g) Scripted INP harness with CPU 4x in CI (perf-cwv-28).

**Expected post-fix.** Field p75 INP 80-150 ms typical (unchanged medians, spikes filtered/explained); lab scripted INP (4x) <= 150 ms for panel toggles, <= 200 ms for unit select during playback; frame cost at n=467 from 9 ms to < 2 ms desktop. Reasoning: hot loops move from O(n²) to O(n); idle CPU returns to about 0%.

**Measure.** Lab: `inp_profile.mjs` scenario (extend with `long-animation-frame` attribution; run at 4x on the `desktop` and `mobile` layouts), Chrome Performance panel LoAF view. RUM: INP by `interactionTarget`, by `loadState` (`loading` vs `dom-interactive` vs `complete`), by `firstVisit`, by device; report `n` and only alert when n >= 30. **Guardrail.** INP p75 <= 200 ms (alert 300 ms), scripted lab INP <= 200 ms at 4x, no rAF/timer activity > 0.5 ms/frame when idle, per-frame playback cost <= 6 ms at 4x with n=467.

### 4.5 TTFB

**Current.** Lab server response 25-30 ms (Netlify edge hit, `Cache-Status: "Netlify Edge"; hit`); simulated 600 ms is the 4-RTT model. Field TTFB is collected by Netlify's script (`ttfb`, `V("performance")` in `rum_script.js`) but not shown in the UI. Fine (Good) and not a cause of any Poor rating.

**Risks.** (1) SW-controlled navigations pay SW start-up + `fetch()` because `sw.js:73` intercepts HTML network-first without navigation preload. (2) `Cache-Control: no-cache, must-revalidate` on HTML (`netlify.toml:63-71`) costs a conditional request every navigation (edge 304, tens of ms). (3) `site-nav.js/css` and `manifest.json` have no versioned URLs (`public,max-age=0,must-revalidate` for site-nav; 3600 for manifest).

**Fix.** Enable `navigationPreload` and answer navigations with `event.preloadResponse` (or stop intercepting navigations); version `site-nav.vN.js/css` with `immutable`; keep HTML `no-cache`. **Expected.** Repeat-visit TTFB -30 to -150 ms on slow phones (SW boot removed); no lab change. **Measure.** RUM TTFB with attribution subparts (`waitingDuration`, `cacheDuration`, `dnsDuration`, `connectionDuration`, `requestDuration`) by `swControlled`. **Guardrail.** TTFB p75 <= 400 ms (alert 800 ms), lab server-response-time <= 200 ms.

### 4.6 TBT

**Current.** Lab mobile 26.5 ms (score 100), desktop 0 ms. **This is a false comfort** **[INFERRED]**: with the reload, Lantern places almost all long tasks (433, 207, 133, 125, 108, 86, 85 ms...) before the simulated FCP at 4.1 s; only the reload's 103 ms task at 9,066 ms counts. Once FCP moves to about 1 s, the same tasks land after FCP and TBT rises to **294-511 ms** (v1-v10 measured), and the perf score falls before it rises. TBT carries 30% of the score.

**Where the time goes (v10, observed at 1x, `lab/lh_local_v10_mobile.json` main-thread-tasks):** evaluation of the entry chunk as three tasks of 58 + 67 + **142 ms** at about 0.6-0.9 s (Mapbox IIFE + React + app init), later 60-135 ms tasks (first React render, data JSON handling, Mapbox first frame). Mapbox GL is about **1.76 MB of the 2.28 MB** (about 77%, estimated from stripped source characters: React/ReactDOM about 158 KB, app about 297 KB, store/glue about 12 KB). Two Mapbox workers are spun up from a **Blob** (`bundle.pretty.js:10024` `workerUrl = URL.createObjectURL(new Blob([...]))`, 838,974 B each) so each load recompiles the worker text; no HTTP/V8 code cache. Bootup: `index-Cg8FAMXN.js` total 3,787 ms scripting 3,019 ms (mobile sim), `mainthread-work-breakdown` 5.6 s (script evaluation 3.3 s, style/layout 0.78 s).

**Fix (ordered).** (1) Boot-after-first-paint loader (removes evaluation from the pre-FCP window, no TBT change by itself). (2) Split the entry: React+app chunk (about 150 KB br) and a separate Mapbox chunk loaded as its own file; evaluate them in separate tasks with `scheduler.yield()`/`MessageChannel` between them; create the map inside `requestAnimationFrame` after React's first commit (perf-cwv-09). (3) Mapbox CSP build with `mapboxgl.workerUrl='/vendor/mapbox-gl-csp-worker.js'` (171 KB br at Mapbox's q11; cacheable, code-cacheable, removes `blob:` from CSP) (perf-cwv-24). (4) Lazy-load everything not needed for the chooser: OOB panels, Search, Legend, Minimap, Walkthrough, Help, Bookmarks, Documentary tools. (5) Static chooser (native HTML buttons) so the boot can wait for the user's choice or idle instead of racing the TBT window (perf-cwv-26). (6) Data: `core.json` first (perf-cwv-11). (7) Kill perpetual loops (perf-cwv-06).

**Expected post-fix.** HTML-only + intro removal: TBT **294-472 ms** (measured v10; score 88-93). With splitting + yields + lazy panels: **150-250 ms** (score about 94-97), **[INFERRED]** from splitting a 284 ms task into <= 4 tasks of <= 70 ms plus removing 3 of the 6 later tasks. With a static chooser and boot after the user's choice/idle >= 3 s: TBT <= 50 ms (v11 measured 0 as the ceiling). **Measure.** Lab: LHCI TBT (median of 5) mobile; `long-tasks` list; `bootup-time`. RUM: LoAF (`blockingDuration`) summed per page load as a proxy. **Guardrail.** TBT <= 150 ms lab mobile (alert 200), no task > 250 ms at 4x, JS main-thread scripting until TTI <= 1.2 s at 4x.

### 4.7 TTI (and interaction readiness)

**Current.** Mobile 9,092 ms (= the reload boundary), desktop 2,229 ms. TTI is not in the score, but the never-idle main thread (perpetual rAF, `setInterval` bursts at `index.html:388, 432, 710`) prevents a quiet window, and the desktop trace ran to 44.5 s.
**Fix.** Same as TBT + idle loops. **Expected.** v10 mobile 4.4-4.7 s; with bundle splitting and no perpetual loops **3.0-3.8 s**; desktop **0.8 s** (v10 measured). **Caution on the ceiling variant:** "boot on first input" (v11) makes the *first input's* INP equal to the boot cost unless the handler paints a state first and defers the boot by one frame; it also delays the map for users who wait. Use it only behind a genuinely static chooser. **Measure.** Lab TTI, plus a custom `gtbg:interactive` mark (map `load` + first `idle`) reported in the beacon. **Guardrail.** TTI <= 3.8 s lab mobile; custom "map ready" p75 <= 4 s on 4G.

### 4.8 Speed Index

**Current.** Mobile 4,099 ms (equal to FCP: Lantern floors SI at FCP), desktop 1,935 ms (observed 2,655 ms; `observedLastVisualChange` 7,764 ms because of the intro overlay fade and panel reveals).
**Fix.** First frame early (FCP items) and no late large visual changes (intro fade, panel reveal): keep the chooser as the visually complete state. **Expected.** v10 mobile 1.5-1.95 s; v11 0.90 s; desktop 0.53 s (v10 measured). **Measure.** LH SI (median of 5) plus `observedLastVisualChange` in the trace. **Guardrail.** SI <= 2.0 s mobile, <= 1.0 s desktop; last visual change <= 4 s on a 4x device.

---

## 5. The RUM data: what is real, what is outlier, and why field looks worse than lab desktop

### 5.1 Series recovered from the Netlify PDF [MEASURED extraction; +/- 1 px; times +/- 0.7 day at the left edge, +/- 0.2 day elsewhere; local time]

Netlify draws only p75 (blue), p95 (purple) and p99 (orange) lines; in every chart the three lines overlap almost exactly, which means each one-hour bucket holds only a handful of page loads (about 113 pageviews/day site-wide; the FCP series has only 174 plotted hourly points out of 720 possible hours). Docs: "charts are populated in one hour increments"; "when calculating the overall status ... Netlify only considers metrics within the 75th percentile of all of your production site's page loads". The vector paths of the p75 line give:

| Metric | Non-empty hourly buckets | median of bucket p75 | mean | p75 of buckets | p90 | max (when) | Good / NI / Poor buckets | Netlify badge |
|---|---|---|---|---|---|---|---|---|
| LCP | 166 | 1.80 s | 3.32 s | **4.68 s** | 5.51 s | 72.9 s (Sep 27 about 15:00) | 94 / 18 / **54** (57% Good) | Poor >4 s |
| FCP | 174 | 0.95 s | 1.46 s | 1.50 s | 2.39 s | 27.7 s (Sep 8 about 01:00) | 145 / 20 / 9 (83% Good) | Poor >3 s |
| INP | 99 | 0.080 s | 0.33 s | 0.14 s | 0.35 s | 18.8 s (Sep 26 about 14:00; p99 line 95.7 s) | 82 / 12 / 5 (83% Good) | Poor >500 ms |
| CLS | 105 | 0.018 | 0.029 | 0.028 | 0.051 | 0.381 (Sep 27 about 23:00) | 101 / 3 / 1 (96% Good) | Poor >0.25 |
| FID | 60 | 13.5 ms | 13.9 ms | 20.5 ms | 30 ms | 39 ms | 60 / 0 / 0 (100% Good) | Good |

Files: `rum_LCP.json`, `rum_FCP.json`, `rum_INP.json`, `rum_CLS.json`, `rum_FID.json`, script `rumx.py`. Three deploy markers are visible as grey bars near Sep 7-9 (x about 229-255 pt).

**What this means**
* **LCP is a real, bimodal problem.** A third of all hourly p75s exceed 4 s while the median bucket is 1.8 s: two populations, the visitors who click within the first 1-2 s (LCP frozen early) and those who wait through the intro (LCP about 4.6-5 s). The lab reproduces exactly that (section 3 probes).
* **FCP, INP and CLS "Poor" are outlier artifacts, not the typical user.** The badge statement ("p75 of all page loads") cannot be reproduced from the plotted hourly p75s: FCP p75-of-buckets is 1.50 s but the badge says >3 s; CLS p75-of-buckets is 0.028 but the badge says >0.25. The only statistic that reproduces all five badges is the **maximum bucket** (LCP 72.9 > 4; FCP 27.7 > 3; INP 18.8 > 0.5; CLS 0.381 > 0.25; FID 0.039 < 0.1). **[INFERRED]** that Netlify's headline uses a peak-sensitive aggregate; **[UNVERIFIED]**. Consequence: the badges will stay red until the outlier hours age out of the 30-day window, whatever you deploy. Test: switch the dropdowns to Mobile / Desktop and to a 24 h / 7 d range and see whether the badge tracks the last outlier.
* **INP outliers of 19-96 s are "hidden tab before next paint" artifacts** (web-vitals v3 uses `event.duration`; the Netlify script has no visibility guard, `rum_script.js` INP block).

### 5.2 Outlier clusters and their most likely causes (each with a test the beacon can answer)

| Cluster | Data | Candidate causes | Test |
|---|---|---|---|
| Sep 7-8 | FCP 27.67 s = LCP 27.67 s in the same hour (Sep 8 about 01:00); INP 1.07 s Sep 8 about 13:00; three deploy markers Sep 7-9; pageviews peak about 230 on Sep 7 (`wa1.png`) | busiest traffic day plus deploy windows: a stalled connection (FCP = LCP = 27.7 s is a single page load whose first paint was its final paint; SYN-retransmit back-off is about 27-31 s), lab/crawler loads on throttled CPUs, users caught mid-deploy (new `sw.js` activates and `controllerchange` reloads their open tab, `index.html:264-268`) | beacon: `bot`, `navType`, `swControlled`, `buildId`, `effectiveType`, TTFB sub-parts (`dns/connection/waiting`) |
| Sep 18-19 | FCP 26.91 s = LCP 26.91 s same hour (Sep 19 about 14:00); unique visitors peak about 99 on Sep 18 (`wa2.png`) | referral/bot burst | same |
| Sep 26-27 | INP 18.8 s (p99 95.7 s) Sep 26 about 14:00; LCP 72.9 s Sep 27 about 15:00; CLS 0.38 Sep 27 about 23:00 | backgrounded/discarded tabs (LCP is only finalised on input/hidden, a tab left open reports minutes; INP hidden-tab artifact); the audit's own Lighthouse runs on Sep 29 are not in these dates | beacon: `visibilityChangedBeforePaint`, `document.wasDiscarded`, `timeToHidden`, cap/flag values > 60 s |

### 5.3 Why field is "worse" than lab desktop, and why mobile lab is "worse" than reality

1. **Lab LCP is a scaled/short trace; field LCP runs until first input.** Live desktop lab: simulated 2.2 s from an observed 4.58 s; replica desktop trace ended at 3.1 s and read 0.17 s. The field sees the full 4.6-5 s.
2. **Survivor bias on first visits.** The first page is torn down at about 4.1 s (4x/Slow-4G) with no FCP/LCP recorded; RUM records only the fast SW-cached reload. Every first visit therefore = 2 RUM rows (`navType: navigate` partial, `navType: reload` full).
3. **Mixed pages.** RUM aggregates all pages: 47% of pageviews are sub-pages (home 1,713 of 3,389). Map sub-pages block on a parser-blocking Mapbox script (lab 68-69) and dashboard/historian have footer CLS 0.145/0.056.
4. **Bots and lab tools run JS and the RUM script.** About 18% of views from CN/SG/HK/DE (`wa2.png`), scanner traffic (about 1,900 404s). Netlify's script has no bot filter (`rum_script.js`: only `window===window.top`).
5. **Tiny samples**: p75 = p95 = p99 in every hour; one 27 s event is the entire bucket.
6. **Mobile lab 9 s** is chiefly the Lantern-modelled reload chain; the real first-visit user does pay a genuine double load (about 4 s to reload at 4x/Slow-4G), but not 9 s of LCP.
7. **Device mix unknown.** The Netlify UI offers a Mobile/Desktop filter; the PDF was exported "All Devices". Export both segments (Q2).

### 5.4 Segmentation to add (beacon fields) so every future question is answerable

`device` (touch vs mouse from `matchMedia('(pointer:coarse)')` and viewport), `vp` (w x h), `dpr`, `effectiveType`, `saveData`, `deviceMemory`, `hardwareConcurrency`, `navType`, `swControlled`, `firstVisit` (localStorage flag set after the first beacon), `layout` chosen (desktop/mobile), `introSkipped`, `path`, `buildId`, `country` (from the Netlify function `context.geo`), `bot` (`navigator.webdriver` or UA `HeadlessChrome|Lighthouse|PTST|Chrome-Lighthouse`), `visibilityChangedBeforePaint`, `timeToHidden`.

---

## 6. Sub-page loading (20 static pages)

Static inventory (all `.html` in DEPLOY_DIR, sizes: 3-19 KB, inline JS 0-10 KB, no `<img>`, no web fonts):
* **9 pages load Mapbox GL from the CDN as a parser-blocking `<script>` + render-blocking `<link>` in `<head>`**: `camera`, `cinematic-export`, `compare`, `ground-remembers`, `immersive`, `sandbox`, `viewshed`, `watch-together` (also `peerjs@1.5.4` from jsDelivr, blocking), plus dev page `unit-rendering-reference` (`<script src="https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js">` at e.g. `camera.html` char 1,523 of 11,602, before `<body>` at 3,421). `mapbox-gl.js` is 385 KB br (Mapbox q11, `Cache-Control: max-age=31536000`), 1.8 MB raw, 1.7 MB parse/compile at 4x. Lab mobile 68-69, FCP 4.1-4.2 s, LCP 5.4 s. [MEASURED]
* Every page loads `site-nav.css` (render-blocking) and `site-nav.js` (parser-blocking, not deferred) at the end of body; the nav (`#gtbg-nav-mount.outerHTML` at `site-nav.js:164`) and footer (`:189`) are injected client-side at `DOMContentLoaded`, so they need reserved space.
* `dashboard.html` CLS 0.145 and `historian.html` 0.056 (footer moves when async content renders above it).
* `search.html`, `historian.html`, `regiment.html`, `report.html`, `find-ancestor.html` fetch `/data/oob/*` (6 to 17 files); `camera`/`compare`/`immersive`/`cinematic-export` fetch 9 placement files (about 130 KB) plus 6 OOB files **before** creating the map (`camera.html` inline `await Promise.all(...)`).
* Two byte-identical og images: `screenshots/day1.png == day3.png` (17,585 B, 1280x720 near-black) (S/E finding, trivial).

**Fix pattern for the 9 map pages** (perf-cwv-20): `<link rel="preconnect" href="https://api.mapbox.com" crossorigin>`; `<script defer src=".../mapbox-gl.js">` (or inject after first paint with the same loader as the home page); keep `mapbox-gl.css` non-blocking (`<link rel=preload as=style onload>` is fine on these pages, or inline the 5 KB) ; wrap the inline script in `DOMContentLoaded` (or make it `type="module"`, which is deferred and runs after `defer` scripts); reserve `#map-wrap{min-height:...}` with a background; fetch placement/OOB data in parallel with (not before) map creation. Measured on `camera.html`: 69 to **86**, FCP 4.19 to 1.61 s, TBT 58 (v10 replica). Remaining LCP 4.1 s is again the High-priority deferred script in Lantern's LCP graph; injecting it after first paint (as for the home page) should take these pages to >= 90.

**Sub-page CLS** (perf-cwv-21): `#gtbg-nav-mount{min-height:57px}` `#gtbg-footer-mount{min-height:120px}` (or render the nav/footer server-side into every HTML file at deploy), skeleton/`min-height` for the dashboard chart and historian log, `content-visibility:auto` only below the fold. **Sub-page caching:** version `site-nav.vN.js/css` (`immutable`), `defer` the script (safe: it reads `document.currentScript` while executing, which is valid for deferred scripts, and renders immediately when `readyState !== 'loading'`).

---

## 7. Performance budget file and CI guardrails

### 7.1 `perf-budget.json` (Lighthouse budget format; sizes in KB transfer, timings in ms)

```json
[
  {
    "path": "/",
    "resourceSizes": [
      { "resourceType": "document",   "budget": 18  },
      { "resourceType": "script",     "budget": 640 },
      { "resourceType": "stylesheet", "budget": 20  },
      { "resourceType": "font",       "budget": 0   },
      { "resourceType": "image",      "budget": 60  },
      { "resourceType": "total",      "budget": 1500 }
    ],
    "resourceCounts": [
      { "resourceType": "script",      "budget": 8  },
      { "resourceType": "third-party", "budget": 45 },
      { "resourceType": "total",       "budget": 90 }
    ],
    "timings": [
      { "metric": "first-contentful-paint",   "budget": 1500 },
      { "metric": "largest-contentful-paint", "budget": 2000 },
      { "metric": "speed-index",              "budget": 2500 },
      { "metric": "total-blocking-time",      "budget": 150  },
      { "metric": "cumulative-layout-shift",  "budget": 0.05 },
      { "metric": "interactive",              "budget": 3800 }
    ]
  },
  {
    "path": "/*.html",
    "resourceSizes": [
      { "resourceType": "script", "budget": 450 },
      { "resourceType": "stylesheet", "budget": 20 },
      { "resourceType": "total", "budget": 900 }
    ],
    "timings": [
      { "metric": "first-contentful-paint",   "budget": 1500 },
      { "metric": "largest-contentful-paint", "budget": 2200 },
      { "metric": "total-blocking-time",      "budget": 200  },
      { "metric": "cumulative-layout-shift",  "budget": 0.05 }
    ]
  }
]
```
Rationale for the numbers: today's home JS is 604 KB br (single file) and total first-navigation transfer 1.2 MB; the budget keeps total JS about equal but requires it to arrive **after** first paint (enforced by the timings and by the custom rules below). The `image` budget covers an optional poster; `font: 0` keeps the system-font stack (there is no web font today, `numFonts: 0`).

### 7.2 Custom budgets (not expressible in Lighthouse's file), enforced by script

| Budget | Limit | Enforced by |
|---|---|---|
| JS executed before FCP | inline only, <= 8 KB; zero `<script src>` without `defer/type=module` on `/` | HTML lint in CI (`tools/check-index.mjs`: parse `index.html`, fail on sync scripts, on `modulepreload` of the entry, on `animation` on `html/body`) |
| Render-blocking subresources on `/` | <= 1 (small CSS) | same, plus Lighthouse `render-blocking-insight` |
| LCP element | matches `#boot-splash h1, #seo-content p`; final LCP with no input for 20 s <= 2.0 s at 4x/Slow-4G | `probe.mjs wait` in CI |
| Scripted INP (4x CPU) | <= 200 ms per scripted step, <= 150 ms median | `inp_profile.mjs` extended with LoAF |
| Idle CPU | <= 2% main-thread busy over 5 s idle, no rAF callback > 0.5 ms | CDP profile assertion (`boot_profile.mjs` idle window) |
| JSON before first interaction | <= 12 requests and <= 60 KB br | request count/size assertion from HAR |
| Bundle | `mapbox` chunk <= 420 KB br, `app+react` <= 240 KB br, any lazy chunk <= 60 KB br, no duplicate module across chunks | `size-limit` or `rollup-plugin-visualizer` gate in CI (requires a real source, N1) |
| Third-party origins on `/` | `api.mapbox.com`, `events.mapbox.com`; no Google origin until Street View is opened | CSP `connect-src/frame-src` plus request assertion |
| Field | LCP p75 <= 2.5 s, INP p75 <= 200 ms, CLS p75 <= 0.1, FCP p75 <= 1.8 s, TTFB p75 <= 800 ms; internal alert thresholds at 80% of these; alert only when n >= 30 per segment per day | own beacon report (section 8) |

### 7.3 `lighthouserc.json` (LHCI; run on the deploy preview and nightly on production)

```json
{
  "ci": {
    "collect": {
      "url": ["https://<deploy-preview>/", "https://<deploy-preview>/search.html", "https://<deploy-preview>/camera.html", "https://<deploy-preview>/dashboard.html", "https://<deploy-preview>/historian.html"],
      "numberOfRuns": 5,
      "settings": { "budgetsFile": "perf-budget.json" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95, "aggregationMethod": "median-run" }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 150 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
        "redirects": ["error", { "maxLength": 0 }],
        "render-blocking-insight": ["error", { "minScore": 1 }],
        "unused-javascript": ["warn", { "maxNumericValue": 150000 }],
        "valid-source-maps": ["warn", { "minScore": 1 }]
      }
    }
  }
}
```
Run both `--preset=mobile` (default) and `--preset=desktop` as separate collect blocks. Netlify option: `@netlify/plugin-lighthouse` in `netlify.toml` with `[plugins.inputs.thresholds] performance=0.95 accessibility=0.95 best-practices=0.95 seo=0.95` for deploy previews. Pair with a nightly `probe.mjs` job because Lighthouse may stop before the LCP-affecting content (section 4.2).

---

## 8. Field-data plan: web-vitals attribution beacon to your own Netlify function

Why: Netlify RUM is web-vitals v3 without attribution, shows five metrics as 30-day headline badges with hourly p75/p95/p99 lines, cannot be segmented beyond mobile/desktop, has no bot filter, no custom events API (per docs), and does not export raw rows. The beacon must make every future question ("which element is LCP for mobile first-visit?", "what target caused INP 600 ms?") answerable.

### 8.1 Client (`/vitals.js`, about 1.6 KB gz + web-vitals attribution build about 1.5 KB br over the standard 3 KB; `defer`, loaded after `load` + idle; same-origin so `connect-src 'self'` covers it)

```js
// /vitals.js  (module; bundle web-vitals/attribution v5 into it, or self-host dist/web-vitals.attribution.js)
import { onLCP, onCLS, onINP, onFCP, onTTFB } from '/vendor/web-vitals.attribution.js';

const BUILD = document.documentElement.dataset.build || 'dev';
const nav = performance.getEntriesByType('navigation')[0];
const q = [];
let sent = 0, hiddenAt = null;
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { hiddenAt = performance.now(); flush(); } });

const base = () => ({
  v: 1, b: BUILD, p: location.pathname.replace(/\.html$/, ''),
  vp: innerWidth + 'x' + innerHeight, dpr: Math.round(devicePixelRatio * 10) / 10,
  d: matchMedia('(pointer:coarse)').matches ? 'touch' : 'mouse',
  ect: navigator.connection?.effectiveType, sd: !!navigator.connection?.saveData,
  mem: navigator.deviceMemory, cpu: navigator.hardwareConcurrency,
  nt: nav?.type, sw: !!navigator.serviceWorker?.controller,
  first: !localStorage.getItem('gtbg_seen'),
  bot: !!navigator.webdriver || /HeadlessChrome|Lighthouse|PTST/i.test(navigator.userAgent),
  disc: !!document.wasDiscarded,
  layout: window.__gtbgLayout, intro: window.__gtbgIntroSkipped,
});

function slim(m) {
  const a = m.attribution || {};
  const o = { n: m.name, v: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value), r: m.rating, id: m.id };
  if (m.name === 'LCP') Object.assign(o, { t: a.target, u: a.url && a.url.slice(-60), ttfb: Math.round(a.timeToFirstByte), ld: Math.round(a.resourceLoadDelay), lD: Math.round(a.resourceLoadDuration), rd: Math.round(a.elementRenderDelay) });
  if (m.name === 'CLS') Object.assign(o, { t: a.largestShiftTarget, at: Math.round(a.largestShiftTime), sv: Math.round(a.largestShiftValue * 1000), ls: a.loadState });
  if (m.name === 'INP') {
    const l = (a.longAnimationFrameEntries || [])[0]; const s = l?.scripts?.[0];
    Object.assign(o, { t: a.interactionTarget, it: a.interactionType, id_: Math.round(a.inputDelay), pr: Math.round(a.processingDuration), pd: Math.round(a.presentationDelay), ls: a.loadState,
      loaf: l && { d: Math.round(l.duration), b: Math.round(l.blockingDuration), src: s?.sourceURL?.slice(-40), fn: s?.sourceFunctionName, inv: s?.invoker },
      hid: hiddenAt !== null && hiddenAt < a.interactionTime + m.value });   // "hidden before the next paint" artifact flag
  }
  if (m.name === 'FCP') Object.assign(o, { ls: a.loadState, ttfb: Math.round(a.timeToFirstByte) });
  if (m.name === 'TTFB') Object.assign(o, { w: Math.round(a.waitingDuration), c: Math.round(a.cacheDuration), dns: Math.round(a.dnsDuration), cn: Math.round(a.connectionDuration), rq: Math.round(a.requestDuration) });
  return o;
}
[onLCP, onCLS, onINP, onFCP, onTTFB].forEach(f => f(m => q.push(slim(m)), { reportAllChanges: false }));

// custom app marks (performance.mark in app code): gtbg:boot, gtbg:data-core, gtbg:map-load, gtbg:choice, gtbg:interactive
function marks() { const o = {}; performance.getEntriesByType('mark').forEach(e => { if (e.name.startsWith('gtbg:')) o[e.name.slice(5)] = Math.round(e.startTime); }); return o; }

function flush() {
  if (!q.length || sent >= 3) return;
  const body = JSON.stringify({ ...base(), m: q.splice(0), k: marks() });
  sent++; try { localStorage.setItem('gtbg_seen', '1'); } catch (_) {}
  if (!(navigator.sendBeacon && navigator.sendBeacon('/api/vitals', new Blob([body], { type: 'application/json' })))) fetch('/api/vitals', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
}
addEventListener('pagehide', flush);
```
Loading: `<script type="module" src="/vitals.js" defer>` in `index.html` and via `site-nav.js` on sub-pages, after `load` (`requestIdleCallback`). Sample 100% (traffic is about 50 visitors/day).

### 8.2 Server (`netlify/functions/vitals.mjs` + redirect `/api/vitals` to `/.netlify/functions/vitals` status 200)

```js
import { getStore } from '@netlify/blobs';
export default async (req, ctx) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const text = await req.text();
  if (text.length > 4096) return new Response(null, { status: 413 });
  let j; try { j = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  if (j.v !== 1 || !Array.isArray(j.m) || j.m.length > 12) return new Response(null, { status: 400 });
  j.cc = ctx.geo?.country?.code;                     // country only, no IP stored
  j.t = Date.now();
  const day = new Date(j.t).toISOString().slice(0, 10);
  const store = getStore(j.bot ? 'vitals-bot' : 'vitals');
  await store.setJSON(`${day}/${j.t}-${crypto.randomUUID().slice(0, 8)}.json`, j);
  return new Response(null, { status: 204 });
};
export const config = { path: '/api/vitals' };
```
(Alternative: an Edge Function writing the same rows; or forward to a free analytics sink. Netlify Blobs keeps everything first-party.) Volume is trivial (<= 5 k beacons/month). Add a per-IP soft rate limit via `ctx.ip` hash in memory or a Blobs counter; validate names against an allow-list; never store the UA string, IP or URL query.

### 8.3 Reporting (`tools/vitals-report.mjs`, runs locally or in a weekly scheduled task)

Reads the last N days from the store, drops `bot:true`, computes per segment `n, p50, p75, p95` for LCP/FCP/INP/CLS/TTFB with the segment set from 5.4, prints: LCP-`target` histogram; INP top `interactionTarget` with `pr` vs `id_` vs `pd` split; CLS `largestShiftTarget` histogram; share of `hid:true`; first-visit vs repeat; `sw` true/false; per-`path`. Output as Markdown table + CSV. Alert lines when n >= 30 and p75 crosses 80% of the Good threshold.

### 8.4 Also: keep Netlify RUM (it is free) and fix its inputs
* Add `https://ingesteer.services-prod.nsvcs.net` to `connect-src` before enforcing CSP (`inspector-issues` currently reports exactly that host); the script itself is same-origin `/.netlify/scripts/rum` so `script-src 'self'` covers it (the docs mention `netlify-rum.netlify.app` for older injection).
* Because Netlify's script fires on `pagehide`, removing the SW reload also removes the duplicate first-visit rows.
* Privacy page: add one sentence for the first-party vitals beacon (no cookies, no IP stored, country only).

### 8.5 Verification checklist
1. In DevTools > Network, first visit produces exactly 1 document request and 1 `/api/vitals` POST after hide.
2. Force a hidden-tab INP (interact, switch tab): `hid:true` appears.
3. LCP `t` for a no-input session equals the hero selector; after interacting `t` freezes.
4. Store shows `bot:true` rows for a Lighthouse run and none for a real visit.

---

## 9. Target boot architecture (what "A+" performance needs beyond the HTML patches)

### 9.1 Options and measured/expected outcomes (mobile lab unless stated)

| Option | What | Mobile perf | Desktop perf | TBT | Real-user effect | Effort |
|---|---|---|---|---|---|---|
| A. HTML-only (no bundle edit) | remove reload, boot-after-FCP loader, no entrance animations, no modulepreload, trim preconnects, `site-nav.js` defer, keep intro | **79-85** (v8/v9-like; observed lab LCP hidden by short trace, **field LCP still 4.6-5 s**) | about 97-100 | 160-370 | FCP fixed; LCP/CLS unchanged in field | S (0.5 d) |
| B. A + delete intro (patch min bundle or source) | `setTimeout(()=>{x("done"),c()},0)` replaces the fast-forward (patch verified in v9/v10, `lab/v9`) | **88-93** | **100** | 294-472 | field LCP ~0.5-1.5 s, CLS 0.02-0.05 | S-M (1 d) |
| C. B + bundle split, yields, lazy panels, one map, no perpetual loops, CSP worker | needs real source or careful patching | **94-97 (expected)** | 100 | 150-250 (expected) | INP and mid-range phones improve most | L (3-5 d) plus source recovery (N1) |
| D. C + static HTML chooser, map boots behind the user's choice/idle | native buttons for archetype/layout, then boot | **97-100** (v11 ceiling 100) | 100 | <= 50-100 | cleanest UX: instant choice screen; map arrives as they read | L-XL |

Notes: (1) The ceiling (v11) is achieved by *not booting inside Lighthouse's window*; it is legitimate only if the static screen is a real, useful screen (the chooser is, since the user must decide anyway). It is not legitimate to delay the app merely to dodge the trace. (2) In option D the first user input must never be the trigger that also blocks the main thread for 1-3 s: paint the "Loading map" state first, then start the boot one frame later, and pre-fetch the bundle at low priority before the click. (3) Keep `modulepreload`/fetch of the bundle **after FCP** (fetch can start right after first paint; evaluation is what must be scheduled).

### 9.2 Target boot timeline (mobile 4G, mid-range phone)

```
0 ms      HTML (13.5 KB br, inline CSS <= 9 KB, dark canvas via color-scheme)         <- FCP/LCP candidates: #boot-splash h1, #seo-content p
~0.6-1.2s FCP = LCP (static text, animation-free); chooser buttons already usable (native <button>)
+1 frame  PerformanceObserver(paint) -> setTimeout(0) -> start fetch of app.js (~150 KB br) and mapbox-gl.js (~385 KB br) at low priority, in parallel
+~1-3 s   evaluate app chunk (React) in its own task; render chooser shell in startTransition; yield (scheduler.yield)
          evaluate mapbox chunk in a separate task; create map in requestAnimationFrame after React commit; CSP static worker file
          load core.json (<= 40 KB) then day-1 placements; other days/OOB/vignettes on demand or idle
          performance.mark('gtbg:interactive') when map 'idle'
```

### 9.3 Bundle split spec (needs source or an equivalent patch pipeline; see perf-cwv-09)
* `vendor-mapbox` (about 1.76 MB raw / about 385-435 KB br): externalise `mapbox-gl`; on the home app import the same UMD/CSP build the sub-pages use (or a hashed vendor chunk with a stable cache-key) so **the map library is downloaded once and shared across home + 9 map pages** (today the home app bundles its own copy and each map page downloads Mapbox again from the CDN).
* `vendor-react` (about 158 KB raw, about 50 KB br) + `app` (about 297 KB raw) as the entry (target <= 240 KB br together).
* Lazy chunks (each <= 60 KB br): Help, Bookmarks, Search panel, Filter panel, Legend, Minimap, OOB roster/succession panels, Walkthrough (+ Street View iframe), monuments overlay, GtbgDist/GtbgLoc/GtbgLayers tools, Sound engine (`bundle.pretty.js:96317+` WebAudio code only needed if sound is toggled).
* Delete dead assets: `assets/InterpolationWorker-*.js` is not referenced by the bundle (either wire it in for `y1` or delete).
* Source maps: publish `.map` files privately (Sentry-style upload) or serve them with `noindex`; resolves `valid-source-maps` (P6) and lets LoAF attribution resolve function names. Without real source (N1) this is impossible: **recovering a buildable source tree is a hard dependency for options C/D**.

---

## 10. Ordered roadmap with checkpoints (moves each metric from Poor to Good)

Scores are lab mobile / desktop unless "field". Checkpoint = the measurement that must pass before the next step.

**Phase 0: baseline and safety (0.5 d).**
1. Freeze evidence: keep `lh_mobile.json`, `lh_desktop.json`, this report's `lab/` results. Export Netlify RUM for Mobile and Desktop separately (screenshots/PDF) and 24 h / 7 d ranges (Q2).
2. Restore correct-case asset filenames before any redeploy (N1: the deploy zip has lower-cased asset names; deploy from SRC_DIR).
3. Stand up the lab harness (`lab/server.js`, `probe.mjs`) or use LHCI on a deploy preview.
**CP0:** baseline recorded: mobile 64 / desktop 85; probe no-input LCP 4.8-4.9 s, CLS 0.115 mobile.

**Phase 1: HTML/config only, no bundle edit (0.5-1 d). Ship as ONE release (the reload fix alone lowers the score).**
3. perf-cwv-01 remove reload + move SW registration to idle; perf-cwv-02 boot-after-first-paint loader; perf-cwv-03 kill entrance animations, add `color-scheme`; perf-cwv-12 plain stylesheet; perf-cwv-13 trim preconnects; perf-cwv-14 `site-nav.js` defer/versioned; perf-cwv-22 SW: no `skipWaiting/claim`-driven reload, navigation preload; perf-cwv-25 netlify.toml headers (versioned assets, data SWR), CSP allow-list incl. the RUM host.
**CP1:** desktop lab >= 95; mobile lab 79-85 (TBT 160-370); FCP lab <= 1.0 s; filmstrip first frame dark; `redirects` audit passes; console free of preload warnings; single document request on first visit.

**Phase 2: fix LCP/CLS definition (1 d; needs the minified-bundle patch or source).**
4. perf-cwv-04 remove/opt-in the intro; perf-cwv-05 lock the LCP element; perf-cwv-15/16 CLS fixes (event card box, story panel box, banner, EF overlay).
**CP2:** `probe.mjs wait` final LCP <= 1.0 s mobile 4x/Slow-4G, <= 0.6 s desktop, element on the allow-list; CLS <= 0.02; mobile lab 88-93, desktop 100.

**Phase 3: make field data diagnosable (1 d, can run in parallel with Phase 2).**
5. perf-cwv-17 beacon + function + report; perf-cwv-18 bot/outlier hygiene; perf-cwv-19 budgets/CI skeleton (`lighthouserc.json`, `perf-budget.json`, `tools/check-index.mjs`).
**CP3:** 7 days of first-party data with n >= 30 per (device x firstVisit); first segment table published; Netlify badges re-read (expect LCP badge to improve once the 30-day window rolls; do not chase FCP/INP/CLS badges).

**Phase 4: main-thread and INP work (3-5 d, needs source or a patch pipeline).**
6. perf-cwv-06 kill the perpetual monuments loop; perf-cwv-07 selectors/memo; perf-cwv-08 frame-loop rewrite; perf-cwv-10 one map, no eager 47-file load on mobile; perf-cwv-11 data batching/lazy; perf-cwv-09 bundle split + yields + CSP worker (perf-cwv-24); perf-cwv-23 Mapbox init options; perf-cwv-28 INP harness.
**CP4:** TBT <= 200 ms mobile lab (median of 5), scripted INP <= 200 ms at 4x, idle CPU <= 2%, frame cost <= 6 ms at n=467 (4x); mobile lab >= 94.

**Phase 5: architecture polish (2-4 d).**
7. perf-cwv-26 static chooser + boot behind the choice/idle; sub-page fixes perf-cwv-20/21; perf-cwv-27 lab harness "no early quiet" guard.
**CP5:** mobile lab >= 97 median-of-5, desktop 100, all sub-pages >= 90; field (after 14 days of data): LCP p75 <= 1.5 s, FCP p75 <= 1.2 s, CLS p75 <= 0.03, INP p75 <= 150 ms, TTFB p75 <= 400 ms, all four with n >= 100.

**Phase 6: hold the line.** CI gates (LHCI, HTML lint, probe, size-limit) block regressions; weekly `vitals-report`; quarterly review of the budget.

---

## 11. Findings (fix specs)

Format per finding: **ID, title (severity, effort)**; `audit_refs`; evidence; root cause; exact fix; expected effect; acceptance test; dependencies. Effort: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d. "Patch" means editing the minified bundle in place (the only artefact that exists today, N1); "source" means the same change in a recovered Vite/React project.

### perf-cwv-01. Remove the service-worker reload; register the SW on idle (critical, S)
* audit_refs: C6, P1, P5, P7. Moves: mobile lab LCP/FCP (redirects 9.07 s to 0), TTI 9.1 s to about 4.4 s, RUM duplicate rows, first-visit UX.
* Evidence: `index.html:263-268` `navigator.serviceWorker.addEventListener('controllerchange', ... location.reload())`; `index.html:269-275` registers on `load` then `reg.update()`; `sw.js:17` `self.skipWaiting()`, `sw.js:30` `clients.claim()`. Lighthouse `redirects`: 9,066.6 ms (mobile) / 1,575 ms (desktop); network log shows `Document` at t=1 ms and t=909 ms with the whole first boot repeated from the SW cache (`transferSize 0`). Real-throttle probe: reload issued at 4,090 ms wall (4x CPU, Slow-4G); first page produced no FCP/LCP. Every deploy that changes `sw.js` re-fires `controllerchange` in open tabs: three deploys Sep 7-9 would have reloaded live sessions.
* Root cause: `skipWaiting()` + `clients.claim()` make the SW take control of the already-loaded first page, which fires `controllerchange`; the handler reloads unconditionally.
* Fix:
```diff
-      var gtbgReloadedForSW = false;
-      navigator.serviceWorker.addEventListener('controllerchange', function () {
-        if (gtbgReloadedForSW) return;
-        gtbgReloadedForSW = true;
-        location.reload();
-      });
-      window.addEventListener('load', function() {
-        navigator.serviceWorker.register('/sw.js').then(function (reg) { reg.update(); }).catch(...);
-      });
+      addEventListener('load', function () {
+        (window.requestIdleCallback || function (f) { setTimeout(f, 3000); })(function () {
+          navigator.serviceWorker.register('/sw.js').catch(function (e) { console.warn('SW registration failed', e); });
+        }, { timeout: 8000 });
+      });
+      // stale lazy chunk after a deploy (old hashed file no longer exists): reload at most once per session
+      addEventListener('vite:preloadError', function () {
+        try { if (sessionStorage.getItem('gtbg_chunk_reload')) return; sessionStorage.setItem('gtbg_chunk_reload', '1'); } catch (e) {}
+        location.reload();
+      });
```
In `sw.js`: delete `self.skipWaiting()` and `clients.claim()` (see perf-cwv-22 for the full SW). If you want fast updates, keep `skipWaiting` but show an "Update available, reload" toast instead of auto-reloading.
* **Release coupling (important):** shipped alone this drops the lab score from 64 to about 51 (TBT 16 to 492 ms, v1). Ship with 02 and 03 in one deploy.
* Acceptance: Lighthouse `redirects` passes; `probe.mjs` `docs.length === 1` on first visit; Network panel shows one document request; RUM/beacon shows one row per first visit; `location.reload` does not appear in an "SW controlled" first-visit trace.
* Depends on: none (couple with 02, 03).

### perf-cwv-02. Yield to first paint before evaluating the 2.28 MB bundle (critical, S)
* audit_refs: P2, P7, C6. Moves: FCP, LCP, SI, blank-white boot; TBT position.
* Evidence: `index.html:55` `<link rel="modulepreload" href="/assets/index-Cg8FAMXN.js" crossorigin />`, `index.html:282` `<script type="module" crossorigin src="/assets/index-Cg8FAMXN.js">`. v1 filmstrip: frames at 0.65, 1.29, 1.94 s are pure white; DCL 506 ms; first paint 2,285 ms; FCP 2,485 ms (unthrottled). Lab FCP sim 3.98-4.05 s in base/v1-v4; 0.91-1.00 s in v5-v11 (`lh_local_*`).
* Root cause: a parser-inserted module script whose bytes are already available runs at end-of-parse without a rendering opportunity; evaluation is 1.5-2.4 s here (about 6-9 s on a 4x phone with fast Wi-Fi). The modulepreload additionally makes Lantern count the 604 KB transfer as FCP-critical.
* Fix (HTML only; replace lines 55 and 282):
```html
<!-- head: remove the modulepreload line; add: -->
<meta name="color-scheme" content="dark">
<!-- end of body, in place of <script type="module" ... src="/assets/index-Cg8FAMXN.js"> -->
<script>
(function () {
  var started = false;
  function start() {
    if (started) return; started = true;
    setTimeout(function () {                 // one more task so the paint that triggered us is on screen
      import('/assets/index-Cg8FAMXN.js').catch(function () { location.reload(); });
    }, 0);
  }
  try {
    new PerformanceObserver(function (list, obs) {
      if (list.getEntriesByName('first-contentful-paint').length) { obs.disconnect(); start(); }
    }).observe({ type: 'paint', buffered: true });
  } catch (e) { addEventListener('load', function () { requestAnimationFrame(function () { setTimeout(start, 0); }); }); }
  setTimeout(start, 3000);                   // safety net (3 s, not 4: with animations gone FCP arrives at about 0.5 s)
})();
</script>
```
Keep the `#seo-content`/`#boot-splash` markup as is. For hashed filenames, patch per deploy with a 10-line `tools/patch-index.mjs` (or a Vite `transformIndexHtml` plugin in a recovered source). When enforcing CSP replace `'unsafe-inline'` with the SHA-256 of this script (compute on the *served* HTML; Netlify post-processing rewrites hrefs and injects the RUM tag but does not alter inline script bodies, [UNVERIFIED]).
* Expected: mobile lab FCP 4.1 s to 0.9-1.0 s, filmstrip first frame dark, desktop FCP 0.83 to 0.26 s. TBT rises (see 4.6): ship with 04 and follow with 09.
* Acceptance: `probe.mjs` first frame is not white; FCP (4x/Slow-4G) <= 1.2 s; Lighthouse `unused-javascript` FCP savings 0; app still mounts (gtbg-map ready mark) within 6 s at 4x/Slow-4G; works when `PerformanceObserver` is absent (Safari fallback path).
* Depends on: 03 (else FCP is not recorded until React paints, v5 = 4.3 s observed).

### perf-cwv-03. Remove the entrance animations that hide the splash from FCP/LCP; use a dark canvas (high, S)
* audit_refs: P1, P7. Moves: field and lab FCP/LCP/SI.
* Evidence: `site-nav.css:12` `body { animation: gtbg-page-in 340ms ease both; }` (opacity 0 + translateY(6px)), `index.html:99` `#boot-splash { animation: boot-fade-in 0.4s ease both; }`. A/B: v5 (animations on) observed FCP/LCP 4,304 ms; v8 (animations off) 1,259 ms (`lh_local_v5/v8_mobile.json`); base real-throttle probe: `first-paint` 1,276 ms but no FCP entry on the first page.
* Root cause: text painted while the compositor-driven opacity is 0 is not recorded as contentful and is not re-recorded when opacity animates up. **[INFERRED]** exact mechanism.
* Fix: delete `body{animation}` from `site-nav.css` (all 20 pages) or replace by a non-hiding effect (e.g. `transform` only, no opacity); delete the `#boot-splash` fade; add `<meta name="color-scheme" content="dark">` and `html{color-scheme:dark}` so the pre-paint canvas is dark instead of white; keep `prefers-reduced-motion` rule.
* Acceptance: `PerformanceObserver('paint')` reports `first-contentful-paint` <= 1.2 s at 4x/Slow-4G on `/` and `/search`; LCP element is the splash h1/p.
* Depends on: none.

### perf-cwv-04. Delete or make opt-in the 3.5 s "Fast-forwarding 3 days of battle" intro (critical, M)
* audit_refs: H3, P1 (LCP, CLS, INP), P7. Moves: real LCP (4.8-4.9 s to <= 1 s), CLS (0.115 to <= 0.02), TBT/INP, TTI, every-visit splash (H3).
* Evidence: `bundle.pretty.js:101471` `eO = 3500`; `:101472-101591` `tO`: `Ee = Object.keys(he).length > 5` then `setTimeout(..., 800)`; rAF loop `yn.setState({currentTick: Math.round(1 + kt*674)})` each frame; 600 ms fade; mounted unconditionally at `bundle.pretty.js:113059` (`!vn && V.jsx(tO, ...)`). Probe (4x, no input): final LCP 4,776 ms mobile / 4,928 ms desktop = the vignette text painted during the sweep; mobile CLS 0.115 from 25 shifts between 1.2 and 5.4 s (intro block, event card "CRITICAL 9:25am", story panel, clock label).
* Root cause: the intro drives the real app UI (story panel, event card, clock, map) through all 675 ticks, so the largest text paints at its tail and every card/panel change shifts layout; LCP stops only on first input.
* Fix (recommended A): **delete**. Patch (verified in `lab/v9`, `lab/v10`): replace `const Ie=setTimeout(()=>{x("playing"),l.current=performance.now(),Se()},800)` with `const Ie=setTimeout(()=>{x("done"),c()},0)` in the minified `tO`. Source: remove `tO` and initialise `vn = true`. Option B: a CSS-only 1.2 s title card (opacity/transform only, no store writes, no story panel). Option C: keep the fast-forward behind a "Watch the whole battle in 60 seconds" button inside the chooser (opt-in, user-initiated, so it no longer defines LCP/CLS).
* Expected: probe LCP 604 ms mobile / 448 ms desktop stable for 20 s; CLS 0.05 (banner) then about 0 after 15; lab mobile 88-93 with 01-03 (v10); H3's 15 s splash gone.
* Acceptance: `probe.mjs wait` (4x, Slow-4G) final LCP <= 1.0 s mobile / <= 0.6 s desktop and element on the allow-list; CLS <= 0.02; no `Fast-forwarding` string on screen.
* Depends on: 02, 03 (patch pipeline or source).

### perf-cwv-05. Lock the LCP element: one visible hero, and no big text before first input (high, S)
* audit_refs: P1, E3, E4. Moves: field LCP stability, SEO block honesty.
* Evidence: `#seo-content` (`index.html:717-741`, 640 px column, LCP candidate 74,227 px² on mobile) sits **under** the fixed `#boot-splash` (`index.html:742-748`); LCP candidates: `#boot-splash>h1` 116,472 px² (desktop). After React mounts (`Rk(document.getElementById("root")).render(...)`, `bundle.pretty.js:113365`) both are removed; any later text block larger than the largest earlier one takes over LCP.
* Fix: (a) make the hero a single visible element (h1 + one paragraph, the current SEO copy moved into the splash so users and crawlers see the same text; also fixes E3's three `<h1>`); (b) do not render the story panel, event card or vignette text until the first user interaction (or render them with `content-visibility:hidden`/collapsed to a title bar at first paint); (c) fixed-size chooser modal text (already small); (d) lint: `tools/check-index.mjs` fails if more than one `<h1>` or if `#root` contains text nodes larger than the hero.
* Acceptance: attribution `target` for LCP is `#boot-splash>h1` (or the chosen hero selector) in >= 95% of beacon rows; probe final LCP equals the hero for 20 s with no input.
* Depends on: 04.

### perf-cwv-06. Kill the perpetual 60 Hz rAF + setState loop in the always-mounted monuments component (high, S)
* audit_refs: P1 (INP), P7 (TTI, trace never quiet). Moves: idle CPU, INP, TTI, battery.
* Evidence: `bundle.pretty.js:100844-100870` `KF`: `function ut(){ ... H(xe); Se.current = requestAnimationFrame(ut) }` runs forever (and re-arms even when the map is missing); mounted unconditionally `bundle.pretty.js:113250` `V.jsx(KF, { mapRef: Nn, showMonuments: sn })`, with `sn` initially `!0` (`:112946`). `H(xe)` stores a fresh object each frame so React re-renders 60x/s. Second per-frame `setState` loop `_F` (`:97415-97426`, FPS HUD) while playing. Desktop lab trace ran 44.5 s with the warning "loaded too slowly"; the 2 s no-interaction CPU profile at 4x still shows `ut@index-Cg8FAMXN.js` (the loop) and `requestAnimationFrame` samples and 43% `(program)` native time (`inp_profile_base_d4.json` "idle-2s": 1,300 ms of 3,011 ms profiled; attribution of native time is not possible from a JS profile).
* Fix: drive monument positions from `map.on('move', update)` + `map.on('resize', update)` and call `update()` once per change; only `setState` when a projected position changed by >= 0.5 px; render nothing when `!showMonuments`; for the FPS HUD update state at 1 Hz only while playing. Better: render monuments as a Mapbox symbol layer (GPU) and delete the DOM markers.
* Acceptance: 5 s idle CDP profile shows no app rAF callbacks; main thread busy <= 2%; Lighthouse desktop trace no longer hits the 45 s cap.

### perf-cwv-07. Zustand selectors and memoisation instead of 25 whole-store subscriptions (high, L)
* audit_refs: P1 (INP), P7 (TBT). Moves: INP, TBT, frame cost.
* Evidence: store `bundle.pretty.js:9361` (`yn = y4((c, f) => ({ currentTick, isPlaying, playbackSpeed, ... placementsByTick, ... }))`); 25 `= yn()` call sites after line 96000 (e.g. 97065, 97233, 97416, 97572, 97665, 97907, 98258, 98596, 98747, 99088, 99423, 99713, 99889, 100324, 100845, 101009, 101478, 101680, 102322, 102661, 102941, 112213, 112940). App root `AO` (`:112921`) destructures 20+ fields, so every tick re-renders the whole tree; panels `Xk`/`Jk` recompute 50-100-tick look-backs per render (`:102322-102340`, `:102661-102670`).
* Fix: `const tick = useStore(s => s.currentTick)` style selectors with `shallow` for multi-field; split the store into `playback`, `ui`, `data` slices; `React.memo` on panels; drive the canvas/map imperatively via `useStore.subscribe` (no React render per tick); wrap non-urgent updates in `startTransition`; hoist style objects out of render; `useDeferredValue` for search results.
* Expected: commits during 8x playback <= 20/s and <= 4 ms each at 4x; scripted INP for panel toggles <= 100 ms at 4x.
* Acceptance: React Profiler capture in CI (`probe`), scripted INP harness (perf-cwv-28).
* Depends on: source (N1) or a large patch.

### perf-cwv-08. Frame-loop rewrite: O(n²) label collision, interpolation, per-frame layout reads (high, L)
* audit_refs: P1 (INP), P7 (TBT), D3 (label collisions). Moves: playback FPS, INP during playback, mobile battery.
* Evidence: `Ed` `bundle.pretty.js:96965-97017` (rAF; mobile throttled to 33 ms at `:97004-97011`), `y1` `:96266-96296` (`{...i2}` spread + `M.find` per unit = O(n²)), `X4` `:96480-96505` (union x confederate pairs), `lS` `:96506-96690`: `getBoundingClientRect()` (`:96510`), `c.width = Se` reset, `project()` x n, then `for Jt<8 { for Lt { for Ci>Lt { ... lA() ... } } }` label collision (`:96560-96585`), then per-unit `save/translate/rotate/shadowBlur/fillRect/strokeRect/arc` and label `measureText`. Microbenchmark (`bench_frame.js`, desktop): collision 1.27 / 3.52 / 4.34 / **8.41 ms** for n = 120 / 250 / 350 / 467; y1 0.13-0.48 ms; X4 0.03-0.34 ms. Unused `InterpolationWorker-ufiwa2-e.js` implements the same interpolation off-thread but nothing imports it.
* Fix: (1) precompute unit tracks into typed arrays per tick at load time (worker); interpolate in the existing worker or on the GPU; (2) collision by spatial hash (12 px cells), 2 relaxation passes, cached until zoom/unit-set/selection changes, recomputed at most every 100 ms during playback; (3) render markers as a Mapbox `symbol`/`circle` layer from one GeoJSON source `setData` per tick (or a sprite-atlas `drawImage` canvas), no per-unit `save/restore/shadowBlur`; (4) `ResizeObserver` for canvas size, never `getBoundingClientRect` per frame; (5) draw only on dirty (`tick`, `zoom`, `selection`, `filters`); (6) cap mobile to 30 fps by skipping work, not by re-arming.
* Expected: per-frame cost at n=467 from about 9-20 ms to < 2-4 ms desktop (< 8-16 ms at 4x); sustained >= 55 fps at 8x on a Moto G Power emulation.
* Acceptance: CDP profile of 5 s at 8x playback: main-thread busy <= 35% at 4x; LoAF entries > 50 ms: none; `bench_frame.js`-style unit benchmark in CI.

### perf-cwv-09. Split the bundle, share Mapbox, yield between chunks, publish source maps (high, L; hard dependency N1)
* audit_refs: P2, P6, P7. Moves: TBT, TTI, unused-JS, repeat-visit cost, sub-page cost.
* Evidence: `assets/index-Cg8FAMXN.js` 2,280,438 B raw / 603,995 B br; Lighthouse `unused-javascript` 52% (315,185 B wasted) ; composition estimated from prettier-line character share: Mapbox GL v3.24.1 (`bundle.pretty.js:53873`, lines 10015-96205) about 1.76 MB (77%), React/ReactDOM about 158 KB, app about 297 KB; only `BookmarkPanel` (4.8 KB), `HelpModal` (7 KB) are lazy (`bundle.pretty.js:112469-112470`); `InterpolationWorker` dead. The 9 map sub-pages download Mapbox GL again from the CDN. `valid-source-maps` fails. Bottleneck task (v10 unthrottled): 142 ms Mapbox+app evaluation task.
* Fix: (1) Externalise `mapbox-gl`: home + 9 sub-pages load the same `/vendor/mapbox-gl-3.24.1.js` (CSP build, br q11 at build time is not possible on Netlify, so accept q4-5 or keep Mapbox's CDN with preconnect); (2) `manualChunks` react/zustand/app; (3) `React.lazy` for Search, Filter, Legend, Minimap, OOB roster/succession, Walkthrough (+ Street View), monument overlays, GtbgDist/Loc/Layers, Sound engine; (4) evaluate chunks in separate tasks:
```js
const yieldToMain = () => (self.scheduler && scheduler.yield) ? scheduler.yield() : new Promise(r => setTimeout(r));
await import('./react-app.js'); await yieldToMain(); const mb = await import('./mapbox.js'); await yieldToMain(); createMap();
```
(5) `build.sourcemap: 'hidden'` and upload maps privately (or serve with `noindex`); (6) `vite build` budget gate via `size-limit`.
* Expected: TBT 294-472 to 150-250 ms (mobile lab), unused-JS at boot < 150 KB, mobile lab 94-97, sub-page repeat loads share cache.
* Acceptance: bundle report shows `mapbox` chunk <= 420 KB br, entry <= 240 KB br; no task > 250 ms at 4x; LHCI TBT <= 200.
* Depends on: N1 (recovered buildable source), 02.

### perf-cwv-10. Mobile layout: one map, and no eager 47-file data load (high, M)
* audit_refs: C1/C2 (mobile), H3, P3. Moves: mobile LCP/TBT/INP, data transfer, memory.
* Evidence: `AO` mounts the desktop shell and map `gF` while `Zn` is null (`bundle.pretty.js:113069+`, `Zn !== "mobile"`), so the desktop map boots behind the chooser; choosing Mobile mounts `pO` (`:102914`) which creates a **second** `mapboxgl.Map` (`:102981`) with a second 2D canvas and, on map load, calls `zp(1), zp(2), zp(3)` (`:103040-103042`) = 3+13 + 3+14 + 3+11 = 47 JSON files, plus a second chronology fetch (`:102958-102960`) and `Hk()`/`PF()` duplicates (`commander_successions.json` and `icon-192.png` appear twice in the network log).
* Fix: decide the layout before mounting anything (auto-detect: `matchMedia('(pointer:coarse) and (max-width: 900px)')`, persist choice, H3), mount one shell and reuse one map instance across layouts; remove `zp(2)/zp(3)` from `pO` and use the same lazy loader as desktop (perf-cwv-11); dedupe fetches with a module-level promise cache.
* Acceptance: mobile first visit shows one `mapboxgl.Map` (one `blob:`/static worker pair); <= 12 JSON requests before first interaction; mobile memory in Chrome task manager < 200 MB after 60 s.

### perf-cwv-11. Data loading: 38 JSON at boot to a small core set, and a correctness fix for jumps (high, M)
* audit_refs: P3, D3, H4. Moves: bandwidth contention with tiles, parse cost, LCP under slow networks; fixes empty map after day jumps.
* Evidence: first navigation = 38 data requests, 584 KB raw / 135 KB br (`lh_mobile.json` network-requests grouped: OOB 15 files 326 KB raw, density 13 files 78 KB, vignettes 3 files 59 KB, chronology 3 files 61 KB, placements 3 files 48 KB, terrain 13 KB); `sF()` `bundle.pretty.js:96939` (`iF()` OOB, `rF()` terrain, `oF()` vignettes, `zp(1)` = 16 files) all at boot; `PF()` chronology (`:98543-98560`); day 2/3 loaded only when **playback** crosses tick 200/420 (`Ed` `:96991-96992`); `jumpToDay`, key `2`/`3`, slider and bookmark links set `currentTick` without loading (grep shows no other caller of `zp(2)/zp(3)` on desktop), which is the likely cause of "July 3 dawn showed empty fields" (D3). `Cache-Control: public, max-age=3600` (`netlify.toml:28-30`) means hourly revalidation; SW puts every response into Cache Storage on each visit (`sw.js:61-69`).
* Fix: build step (or one-off script) merges into `core.json` (unit id/name/side/corps/commander, day-1 first 50 ticks, <= 40 KB br) loaded first; everything else via a `ensureDay(day)` called from a store subscription on `currentTick` (so jumps, scrubbing, deep links load the day they need, with a small skeleton while loading); `fetch(url, {priority:'low'})` for non-critical; content-hashed immutable URLs (`/data/v/<hash>/day2.json`) so `Cache-Control: immutable` is safe and the SW can use cache-first; JSON to compact arrays (drop repeated keys) to cut the 584 KB raw parse cost.
* Acceptance: requests before first interaction <= 12 and <= 60 KB br; jump to July 2/3 from a cold start renders units within 1 s; no duplicate URL in the network log.

### perf-cwv-12. Remove the CSS preload/onload swap; the 40 KB CSS is only Mapbox's stylesheet (medium, S)
* audit_refs: P5, P7. Moves: console warnings, duplicate request, FCP path.
* Evidence: `index.html:56-58` `<link rel="preload" as="style" href="/assets/index-B4G7Z_2G.css" crossorigin onload="this.onload=null;this.rel='stylesheet'" />` + `<noscript>`; network log shows the CSS requested twice per navigation; `assets/index-B4G7Z_2G.css` (40,827 B, 5.2 KB br) contains only `.mapboxgl-*` rules (the app is inline-styled), and no fonts (`numFonts: 0`). Preload vs SW `crossorigin` mode mismatch produces "preload not used" warnings.
* Fix: plain `<link rel="stylesheet" href="/assets/index-B4G7Z_2G.css">` in `<head>` (5 KB is negligible) or load it inside the boot loader right before `import()`; remove `crossorigin` (same origin); delete the `<noscript>` twin.
* Acceptance: zero console warnings on load; one CSS request.

### perf-cwv-13. Trim preconnect/dns-prefetch to what is used (medium, S)
* audit_refs: P7 (network-dependency-tree). Evidence: `index.html:41-52` 7 preconnects (`api.mapbox.com`, `events.mapbox.com`, `a.tiles.mapbox.com`, `b.tiles.mapbox.com`, `www.google.com`, `maps.googleapis.com`, `streetviewpixels-pa.googleapis.com`); Lighthouse `network-dependency-tree-insight` score 0: "More than 4 preconnect connections" and 5 flagged "Unused preconnect" (a.tiles, b.tiles, google x3). Tiles are served from `api.mapbox.com` over h3 (`/v4/mapbox.satellite/...`).
* Fix: keep `<link rel="preconnect" href="https://api.mapbox.com" crossorigin>` only; add Google origins on user intent (hover/focus of the Street View/Soldier's Eye buttons) with a tiny script. Drop the `iframe[title][src*="streetview"]{contain:strict}` global CSS or scope it to the walkthrough.
* Acceptance: `network-dependency-tree-insight` passes; no unused-preconnect warnings.

### perf-cwv-14. Take `site-nav.js/css` off the home page's critical path and version them (medium, S)
* audit_refs: P4, P7. Evidence: `index.html:279-280` render-blocking link + parser-blocking script (`render-blocking-insight`); `network-dependency-tree` depth 354 ms; `site-nav.*` served `max-age=0,must-revalidate` (live headers). The home page needs only `GTBG_MENU.buildGroupsHtml` for the deferred Extra Features menu (`index.html:294-353`).
* Fix: home: `<script src="/site-nav.v3.js" defer>` and move `site-nav.css` to load after first paint (or inline the 7 KB it needs into the boot loader); sub-pages: `defer` + `min-height` mounts (perf-cwv-21). Version filenames and serve `Cache-Control: public, max-age=31536000, immutable` (add a `[[headers]] for="/site-nav.*"` rule).
* Acceptance: `render-blocking-insight` passes on `/`; repeat visit makes no request for site-nav (cache hit).

### perf-cwv-15. CLS in the app shell: fixed boxes for event card, story panel, clock; kill banner shift (high, M)
* audit_refs: P1 (CLS), H1. Evidence: section 4.3 table (sources 1-5). `LF` `bundle.pretty.js:98595-98700` (`Vc.panel` bottom-anchored, variable height), story panel `bundle.pretty.js:98258+`, clock label (`July 1, 6:00 AM` text width changes), `#gtbg-onboarding-banner` `index.html:355-396`.
* Fix: event card: fixed `min-height` = tallest event (or render text in a fixed 132 px inner box with `overflow:auto`) plus `contain: layout paint`; story panel: fixed-height scroll box, replace text without changing outer size; clock: `font-variant-numeric: tabular-nums; min-width: 9ch`; onboarding banner: render inside the React modal (or reserve its 60 px in CSS) instead of `insertBefore` after mount.
* Expected: lab CLS <= 0.02; the 0.2-0.38 field spikes disappear. Acceptance: probe CLS <= 0.02 after boot; no shift > 0.005 without user input.

### perf-cwv-16. Replace the injected hack scripts in `index.html` with in-app components (medium, M)
* audit_refs: H1, H6, P1 (INP, CLS). Evidence: `index.html:294-353` (populate), `355-396` (banner via 200 ms polling x 25, `querySelectorAll('body *')`), `398-440` (label sniffing by glyph, polling x 25), `441-519` (reveal after click sniffing, `querySelectorAll('body *')` + `getBoundingClientRect` on every leaf), `521-606` (collision mover: on every click, +150 ms, 6 candidate positions each = style write + `getBoundingClientRect` on all interactive elements = up to 6 forced layouts), `608-714` (monuments star overlay, 200 ms polling x 40). Three document-level capture click handlers. Measured shifts: 0.0072 desktop, 0.025 mobile (EF reposition), 0.05 (banner).
* Fix: implement the Extra Features button, historian pin, labels (proper `aria-label`s), onboarding banner and monuments overlay as React components inside the toolbar; delete all timers and capture listeners; if any script must stay, make it event-driven (single `MutationObserver` on the target container, no `body *` scans, no `getBoundingClientRect` loops, position via CSS not JS).
* Acceptance: no `setInterval` in `index.html`; no forced reflow in a click trace (Chrome "Forced reflow" insight = 0); CLS from EF = 0.

### perf-cwv-17. First-party web-vitals attribution beacon (high, M)
* audit_refs: P1. Spec in section 8 (client, Netlify function `/api/vitals`, Blobs storage, report script, CSP, privacy sentence). Acceptance: section 8.5 checklist; 7 days of data with n >= 30 per (device x firstVisit) segment.
* Depends on: none for the client on sub-pages/home HTML; custom marks (perf-cwv-29) need the app.

### perf-cwv-18. RUM hygiene: read the series not the badge; bot and outlier handling (medium, S)
* audit_refs: P1, T2. Evidence: section 5.1 (badges reproducible only by the maximum bucket; hourly n tiny; INP 19-96 s artifacts; no bot filter in `rum_script.js`). Fix: (a) export Netlify RUM for Mobile/Desktop and 24 h/7 d; (b) treat Netlify's chart as a smoke alarm only; (c) in the beacon store, split `bot:true`, flag `hid:true` INP and cap analysis at n >= 30; (d) after rollout, do not expect the FCP/INP/CLS badges to flip until outlier hours age out (30 days); optional: disable then re-enable Netlify RUM after Phase 2 to start a clean window (history is lost, "charts will not backfill"). Acceptance: monthly report shows p75 by segment with n and excludes bots.

### perf-cwv-19. Performance budgets and CI gates (high, M)
* audit_refs: P7. Spec in section 7 (`perf-budget.json`, `lighthouserc.json`, custom budgets, `tools/check-index.mjs`, `probe.mjs wait`, `size-limit`, Netlify Lighthouse plugin). Acceptance: a PR that re-adds `modulepreload`, a sync script, an entrance animation, `location.reload`, or grows the entry beyond budget fails CI.
* Depends on: N1 (for bundle gates); the HTML/probe gates can be added now.

### perf-cwv-20. Map sub-pages: defer the parser-blocking Mapbox script (high, M)
* audit_refs: S3, S4, P7. Evidence: section 6 (9 pages, render-blocking `mapbox-gl.js` + `.css`, lab 68-69 with FCP 4.1-4.2 s, LCP 5.4 s; camera fix 69 to 86). Fix pattern and page-by-page checklist in section 6; also `peerjs` on `watch-together.html` to `defer`/dynamic import on "Host" click; data fetch in parallel with map creation. Acceptance: each of the 9 pages >= 90 mobile lab, FCP <= 1.5 s, LCP <= 2.5 s, TBT <= 200.

### perf-cwv-21. Sub-page CLS: reserve nav/footer/async-content space (medium, S)
* audit_refs: S4, P1 (CLS). Evidence: dashboard CLS 0.1446 and historian 0.0564, culprit `body > footer#gtbg-footer`; nav/footer injected at `site-nav.js:164`/`:189`. Fix: `#gtbg-nav-mount{display:block;min-height:57px}`, `#gtbg-footer-mount{display:block;min-height:120px}` or inline the nav/footer HTML at deploy time; skeleton `min-height` for `dashboard` chart/cards and `historian` transcript; `contain: layout` on async panes. Acceptance: CLS <= 0.02 on all sub-pages (LHCI on 5+ pages).

### perf-cwv-22. Service worker redesign (medium, M)
* audit_refs: C6, P5, TTFB. Evidence: `sw.js:15-31` install/activate; `sw.js:41-49` cache-first for hashed assets; `sw.js:61-69` `/data/` network-first + `cache.put` for each of ~40 files every visit; `sw.js:73` network-first for HTML without navigation preload (adds SW boot + `fetch` to every navigation TTFB); `CACHE_NAME 'gbg-v5'` is hand-bumped (`sw.js:2-3`) while `PRECACHE_ASSETS` lists hashed names.
* Fix: `install` precaches only the shell (HTML skeleton not needed) and the hashed entry files via a build-generated manifest; no `skipWaiting/claim` (update on next visit) or an explicit "reload for update" toast; enable `navigationPreload` and `respondWith(preloadResponse || fetch())` for navigations (or do not intercept navigations); `/data/*` stale-while-revalidate with versioned URLs; never cache Mapbox tile/API responses; version via `self.registration` build id, delete old caches in `activate`.
* Acceptance: navigation TTFB with SW <= no-SW + 20 ms; offline repeat visit still opens the app; Application panel shows one cache with the current build id.

### perf-cwv-23. Mapbox map options and request trimming (medium, S)
* audit_refs: P2, P3. Evidence: `bundle.pretty.js:97237-97256` `new z_.Map({container, style, center, zoom, minZoom:11, maxZoom:18, maxBounds, dragPan, scrollZoom})` with defaults for the rest; Lighthouse third-party Mapbox 368 KB (20 tiles 337 KB, glyphs 87 KB) plus 4 telemetry POSTs at load.
* Fix (verify each in Mapbox GL JS v3 docs; defaults per docs: `fadeDuration` 300, `collectResourceTiming` false, `performanceMetricsCollection` true, `refreshExpiredTiles` true, `antialias` false): set `fadeDuration: 0`, `refreshExpiredTiles: false`, `renderWorldCopies: false`, `performanceMetricsCollection: false` (do not disable core telemetry if Mapbox's terms require it, [UNVERIFIED]); remove the two road/river label layers (`bundle.pretty.js:9746-9841`, glyph PBFs 87 KB) or draw them on the existing canvas; request 512 px tiles/`tileSize` where possible to cut tile count; `maxBounds` already limits panning.
* Acceptance: first-load tile+glyph bytes <= 250 KB; no long task > 50 ms in first 3 s of map life after the split.

### perf-cwv-24. Mapbox worker from a static, cacheable file (medium, S-M)
* audit_refs: P2, X3 (CSP `worker-src blob:`). Evidence: `bundle.pretty.js:10011-10027` builds the worker from a `Blob` (`workerUrl = URL.createObjectURL(new Blob([Ee]))`), 2 workers x 838,974 B recompiled every load (network log `blob:` rows). Mapbox ships `mapbox-gl-csp.js` (1.74 MB raw) + `mapbox-gl-csp-worker.js` (780 KB raw, 195 KB br q5 / 171 KB br q11) and the documented `mapboxgl.workerUrl = '/dist/mapbox-gl-csp-worker.js'`.
* Fix: self-host both files under `/vendor/` (immutable), set `mapboxgl.workerUrl` before `new Map`, remove `blob:` from `worker-src` in CSP, precache the worker in the SW. Expected: worker compile becomes code-cache eligible on repeat visits (about 50-150 ms per worker on a mid-range phone, [INFERRED]); simpler CSP.
* Acceptance: no `blob:` script rows in the network log; `worker-src 'self'` enforced without violations.

### perf-cwv-25. `netlify.toml` headers, caching and CSP that match the new boot (medium, S)
* audit_refs: X3, P4, P5, TTFB. Evidence: `netlify.toml:19` CSP is Report-Only with `'unsafe-inline'` and no RUM host (`inspector-issues`: `ingesteer.services-prod.nsvcs.net`); `:28-30` data `max-age=3600`; no rule for `site-nav.*`, `/screenshots/*` (og image `max-age=0`), `/vendor/*`.
* Fix: add `[[headers]] for="/site-nav.*"` and `for="/vendor/*"` immutable; `for="/data/*"` `public, max-age=0, stale-while-revalidate=86400` until data is hashed, then `immutable`; `Link: </assets/index-XXXX.js>; rel=modulepreload; fetchpriority=low` is **not** recommended (it would reintroduce the Lantern FCP artifact); add `connect-src ... https://ingesteer.services-prod.nsvcs.net` and `/api/vitals` (covered by `'self'`); replace inline-script `'unsafe-inline'` by hashes of the loader and the (few) remaining inline scripts computed on the served HTML (Netlify post-processing rewrites hrefs and injects the RUM tag, live HTML differs from the deploy zip: `/historian` vs `/historian.html`).
* Acceptance: enforcing CSP shows no violations in the beacon/console across all 20 pages.

### perf-cwv-26. Static chooser and map boot behind the user's choice / idle (medium, L)
* audit_refs: H3, P2, P7 (TBT). Evidence: v11 (boot deferred to first input or 12 s) scores 100 with 9 requests; chooser screens (`bO` `bundle.pretty.js:111856+`, `dO` `:102752+`) are simple static forms rendered by React only after the 2.3 MB evaluation.
* Fix: render "How do you want to explore" and "Choose Your Experience" as native HTML in `index.html` (buttons work without JS; persist `gtbg_layout`, `gtbg_onboarded`; auto-select mobile on coarse pointers); start fetching the bundle at low priority after FCP; evaluate it when the user chooses or at `requestIdleCallback` (timeout 3-5 s) whichever first, painting a "Loading the battlefield" state before starting the boot (so the choosing tap costs < 100 ms INP). Never make the very first input the same task as the boot.
* Expected: TBT <= 100 ms, mobile lab 97-100, INP of the first tap <= 100 ms. Acceptance: probe with a tap at 1.5 s: INP <= 150 ms and map ready <= 6 s at 4x/Slow-4G.
* Depends on: 04, 09 helps.

### perf-cwv-27. Lab harness guard: catch the LCP that Lighthouse's early stop hides (medium, S)
* audit_refs: P7. Evidence: replica desktop trace stopped at 3.1 s (LCP 167 ms) while live desktop ran to 44.5 s (observed LCP 4,580 ms); LCP outcome depends on whether the intro's text paints before "quiet". Fix: add `probe.mjs wait` (20 s, no input, 4x CPU, Slow-4G) as a required CI check and pass Lighthouse `--max-wait-for-load` >= 15 s in LHCI; record the final LCP element. Acceptance: CI fails if final LCP > 2.0 s or element not on the allow-list.

### perf-cwv-28. Scripted INP harness with long-animation-frame attribution (medium, M)
* audit_refs: P1 (INP). Evidence: field INP un-diagnosable; headless event `duration` is unreliable (frames only when damaged), so the harness must assert **input delay + processing + LoAF blocking**, not presentation. Fix: extend `lab/inp_profile.mjs` into `tools/inp-scenario.mjs`: cold visit, choose layout, panel toggles (F/S/L/M), search typing, unit click while paused and while playing at 8x, slider drag, Help open, all at CPU 4x on desktop and mobile emulation; collect `PerformanceEventTiming` (`processingStart-startTime`, `processingEnd-processingStart`) and LoAF `blockingDuration` and CPU profile top functions; fail on `inputDelay > 100 ms` or `processing > 100 ms`. Run also on a real mid-range Android over USB debugging once per release. Acceptance: report table per step in CI artefacts.

### perf-cwv-29. App performance marks and a "map ready" definition (low, S)
* audit_refs: P1. Fix: `performance.mark('gtbg:boot')` at entry, `gtbg:data-core`, `gtbg:map-load` (Mapbox `load`), `gtbg:choice` (chooser click), `gtbg:interactive` (map `idle` after first render); `measure`s between them; included in the beacon (`k` field, section 8) and visible in Chrome's Performance panel Timings track. Acceptance: p75 of `interactive - navigationStart` <= 4 s on 4G.

### perf-cwv-30. Housekeeping that shows up in vitals audits (low, S)
* audit_refs: E-series, P7. (a) `screenshots/day1.png` and `day3.png` are byte-identical near-black 1280x720 placeholders (og:image, 17,585 B) (replace with real, optimised 1200x630 images; add `Cache-Control: public, max-age=86400`); (b) remove dead `assets/InterpolationWorker-*.js` or use it; (c) `<link rel="dns-prefetch">` lines that duplicate preconnects; (d) `index.html` has 24 KB of inline JS + 9 KB CSS (`script-treemap-data` marks about 25% unused): move to a cached file after 16 is done.

---

## 12. Open questions and things I could not verify

* **Q1 (N1):** Is there any buildable source for the deployed bundle? Options C/D and findings 07-11, 19 assume a recovered Vite/React project (or a careful patch pipeline). Everything in Phases 1-2 works on the minified bundle plus `index.html`.
* **Q2:** RUM device split. Please export Mobile and Desktop, 24 h / 7 d / 30 d. If mobile share is low, the mobile-lab work is still right for A+ but field impact differs.
* **Q3:** Does Netlify's headline badge use a peak-sensitive aggregate? Test: filter and re-read; my reproduction from the plotted p75 series says only "max bucket" fits (section 5.1).
* **Q4:** True field INP baseline is unknown; all INP suspects are code-derived. Need the beacon (17) and one real-device run.
* **Q5:** Safari/Firefox: boot loader falls back to `load`+rAF; `PerformanceObserver paint` exists in Safari, LCP does not (no field LCP from Safari either way). Test on iOS.
* **Q6 (security agent, X1):** Mapbox tile requests (`api.mapbox.com/v4/mapbox.satellite/15/9354/12427.webp`) return **403** with `Referer: https://localhost:8443/`, `https://example.com/` or no referer, and 200 with `Referer: https://gettysburginteractivemap.com/`, while the styles endpoint answers 200 for all referers. The token therefore appears to be URL-restricted for tiles (this also explains the many `Failed to load resource ... 403` lines in my local replica). This partially contradicts X1 (which probably only tested the styles endpoint): please confirm in the Mapbox dashboard.
* **Q7:** Are the 27-s FCP/LCP hours real users (stalled connections), crawlers, or lab tools? The beacon's TTFB sub-parts, `bot` and `effectiveType` will tell.
* **Q8:** Did the Sep 7-9 deploys change `sw.js` (mid-session reload of open tabs)? Netlify deploy log/diff.
* **Q9:** Netlify post-processing (Pretty URLs, RUM injection) alters served HTML; CSP hashes must be computed on the served bytes; I verified href rewriting and RUM injection (`live_home.html` vs deploy `index.html`), not whether inline script bodies are ever modified.
* **Not tested:** real touch devices, iOS Safari, Firefox, screen readers, real mid-range Android CPU/GPU, Netlify Edge behaviour under load, INP under real GPU rendering (headless uses software GL, which inflates presentation delay).

---

## Appendix A. Artifacts (all under `plan-work/tmp-perf-cwv/`)

* `lab/server.js` (h2+brotli Netlify-like server, RUM stubbed), `lab/base`, `lab/v1..v11` (variants), `lab/lh_local_*.json` (Lighthouse results), `lab/summ.py`, `lab/runlh*.sh`.
* `lab/probe.mjs` (real-throttle vitals + attribution), `lab/showprobe.py`, `lab/probe_*.json`, `lab/inp_profile.mjs`, `lab/inp_profile_base_d4.json`, `lab/boot_profile.mjs`, `lab/boot_profile_base_d4.json`, `lab/pagecheck.mjs`, `lab/sheet_v1_mobile.png` / `sheet_v5_mobile.png` (filmstrips), `lab/lh_page_*_mobile.json` (sub-pages), `lab/wv_attr.js` (web-vitals v5 attribution IIFE).
* `rumx.py`, `rum_LCP/FCP/INP/CLS/FID.json` (series recovered from the PDF), `rum_script.js` (Netlify RUM script), `rum.txt`, `wa.txt`, `live_home.html` (live HTML vs deploy), `bench_frame.js`, `lh1..5.py` (Lighthouse JSON analysis), thumbnails and screenshots extracted from the Lighthouse JSON.

## Appendix B. Reproduce

```
cd plan-work/tmp-perf-cwv/lab
node server.js base 8443 &                                  # replica of the deploy
./runlh.sh 8443 mine_mobile ; ./runlh_desktop.sh 8443 mine_desktop ; python summ.py
node probe.mjs https://localhost:8443/ mobile 4 slow4g wait out.json ; python showprobe.py out.json
node inp_profile.mjs https://localhost:8443/ 4 out.json
```
Lighthouse 13.5.0 and puppeteer-core 25.12.0 came from the existing npx cache; nothing was installed and no file under DEPLOY_DIR, SRC_DIR or RECON_SRC was modified. All lab servers and browsers were stopped at the end.


---

## Verification (adversarial verifier pass, 2026-09-30)

Scope: every critical/high finding (01-11, 15, 17, 19, 20) and 15 medium/low (12-14, 16, 18, 21-30). Method: re-opened DEPLOY_DIR files, `bundle.pretty.js` lines, `lab/` result JSON (re-ran `lab/summ.py`), `lh_mobile.json`/`lh_desktop.json`, the RUM PDF vector paths (PyMuPDF), live `curl` (headers, Mapbox dist files, live HTML vs deploy), and fetched the cited docs (Netlify RUM docs, LHCI configuration doc, Netlify Functions deploy doc, web-vitals README). Nothing outside this file was modified. Overall: the measurement work is unusually solid (all lab numbers, line references and probe values reproduced); the defects are in a few proposed fixes/snippets, three severity calls, and one invalid test harness.

### Verdict table

| ID | Verdict | Key check / correction |
|---|---|---|
| 01 | CONFIRMED | `index.html:263-268/269-275`, `sw.js:17/30` exact. `summ.py` reproduces base 64 / v1 51 (TBT 16 to 492). Root cause right. Note: the comment at `index.html:257-262` justifying the reload is moot (HTML and `/data/` are already network-first, `sw.js:61-75`; hashed assets never stale). v10 still had SW registration + skipWaiting, so the exact "idle register / no skipWaiting" variant was not lab-measured (v4 "no SW" was). |
| 02 | CORRECTED | Evidence real (`index.html:55`, `:282`; v1 filmstrip frames 1-3 white, v5 splash from frame 1; v10 = 88/93/93). Corrections: (a) the proposed `.catch(function(){ location.reload(); })` was NOT what v5/v10 tested (bare `import()`), and it can reload forever: bundle 404 (BRIEF's case-mangled redeploy trap), CSP enforcement, offline, or a top-level throw all reject the promise. Use a once-per-session guard (as 01 does for preloadError) and render a visible retry state in `#boot-splash`. (b) `:282` is inside `<head>` (`</head>` is `:283`), not "end of body". (c) The hashed name appears in three places to patch: `index.html:55`, `:282`, and `sw.js:6` (+ css `sw.js:7`), not only index. |
| 03 | CONFIRMED (caveats) | `site-nav.css:12`, `index.html:99` exact; site-nav.css is linked by 22 pages (not 20). v5 to v8 changed three things at once (body animation, splash animation, `color-scheme`), so attribution to the animations is inferred, as the report says. Caution: `html{color-scheme:dark}` site-wide changes UA-default controls (unstyled button, select, range, scrollbars) on sub-pages; scope it to `index.html` or check `search.html` chips (C8) and forms first. |
| 04 | CONFIRMED | Byte diff of `lab/base` vs `lab/v10` bundle shows exactly the claimed change at `tO` (`setTimeout(()=>{x("playing"),l.current=performance.now(),Se()},800)` to `setTimeout(()=>{x("done"),c()},0)`). Skipped side effects are no-ops at boot (`Kx()` clears an empty trail canvas; `currentTick:1,isPlaying:false` are the initial store values, `bundle.pretty.js:9361-9364`). The intro does NOT incidentally preload days 2/3 (it uses `yn.setState`, not the `isPlaying` branch of `Ed`, `:96991-96992`), so no data regression. Probe numbers reproduced: base mobile final LCP 4,776 ms / 108,016 px2, CLS sum of the 25 shifts = 0.115. Caveat: measured on a replica whose Mapbox requests 403 (see MISSED-06); "88-93" is an upper bound. |
| 05 | CORRECTED | Severity high to low/medium. `probe_v10_*_wait.json` already show LCP frozen (604 ms mobile `#seo-content>p`, 448 ms desktop `#boot-splash>h1`) for 20 s after 04 alone; any later text only matters if larger, and LCP stops at the first tap (the chooser tap). Residual value is the 3x `<h1>` cleanup (`index.html:718,744,753` confirmed) and the LCP element being text occluded by the opaque fixed splash on mobile. |
| 06 | CORRECTED | Code evidence exact (`KF` `bundle.pretty.js:100844-100870`, mount `:113250`, `sn` initial `!0` `:112946`; fresh object each frame forces a KF re-render). Corrections: (a) the causal link to "desktop trace ran 44.5 s" is REFUTED by the report's own data: the replica runs the identical bundle (same KF loop) and desktop ended at 3,146 ms with no warning, while replica MOBILE hit 44,639 ms and live MOBILE ended at 2,860 ms while live DESKTOP hit 44,543 ms (`observedTraceEnd`, re-read from the JSON). The cap is nondeterministic; drop "trace no longer hits the 45 s cap" from the acceptance test. (b) Magnitude is tiny: in `inp_profile_base_d4.json` idle-2s, `ut` (the KF loop) has 5 ms self time and `requestAnimationFrame` 10 ms in a 3,011 ms profile; the "43% (program)" is present at ~20-23% in every scenario and is not attributable to KF. Re-render is confined to KF (20 markers), not the tree. Keep as an S hygiene fix (battery/idle), severity medium/low, not an INP fix. |
| 07 | CORRECTED | 25 `= yn()` sites re-counted exactly (lines match); `AO` `:112921` destructures 17 store fields (not "20+"). Overstated: `Xk`/`Jk` (`:102321`, `:102660`) already `useMemo` the look-back on `[tick, placements]` and are mounted only while the OOB panel is open (`:103363-64`, `:113257-58`), so it is per tick change while open, not "per render". No per-tick commit-cost baseline exists, and the report's own scripted INP (1-32 ms) is invalid for playback (see 28). Severity high to medium until a React Profiler baseline exists; effort L holds only with recovered source (patching the minified bundle: XL). |
| 08 | CORRECTED | All line refs exact (`lS :96506`, `getBoundingClientRect :96510`, 8-pass loop `:96560-96585`, `y1 :96266`, mobile 33 ms re-arm `:97004-97011`, `_F :97415-97426`). The collision loop only runs during playback (`Gk` is started only when `isPlaying`, `:97285-97296`); when paused a single static `e1` redraw runs. Correction: "interpolate in the existing InterpolationWorker" is not viable as written: the 672 B worker expects `{placementsByTick (the whole map), fromTick, toTick, fraction}` per message, i.e. structured-cloning all placements every frame, and its math differs from `y1` (no unit-set union). Needs a redesigned protocol (init once, transferable typed arrays). The typed-array/spatial-hash/dirty-flag parts stand. Effort L assumes source; XL if patching minified code. |
| 09 | CONFIRMED | Entry 2,280,438 B; I re-derived composition from whitespace-stripped prettier chars: Mapbox region (`:10007-96205`) 79.5% (1.81 MB), pre-Mapbox (React) 7.2% (~165 KB), app 13.3% (~303 KB) vs report 77% / 1.76 MB / 158 KB / 297 KB. Lazy chunks `:112469-112470` confirmed; Mapbox v3.24.1 `:53873` confirmed. Notes: "9 map pages" includes the noindex dev page `unit-rendering-reference` (8 real); Mapbox CDN `mapbox-gl.js` is 385,039 B br with `max-age=31536000` and ACAO `*`, and CSP `script-src` already allows `api.mapbox.com`, so "share one Mapbox file across home + sub-pages" can simply mean home loads the same versioned CDN URL (requires source change, N1). |
| 10 | CORRECTED | The eager 3-day load in `pO` (`zp(1..3)` `:103040-42`, 3+13 / 3+14 / 3+11 files per the report's count) and the duplicate chronology fetch (`:102958-60`) confirmed; `commander_successions.json` and `icon-192.png` duplicated within the first navigation confirmed in `lh_mobile.json`. Correction: the two Mapbox maps are sequential, not co-resident: `gF` mounts whenever `Zn !== "mobile"` (`:113234`, also behind the intro/chooser) and its cleanup calls `Xe.remove()` (`:97262`) before `pO` creates its map (`:102981`). Cost is a double create/load, not two live WebGL contexts. Ordering hazard: removing `zp(2)/zp(3)` from `pO` before 11's `ensureDay` ships would newly break mobile day jumps (`pO` uses the same `jumpToDay`, `:102924`). Ship 11 first. |
| 11 | CONFIRMED (stronger) | Re-counted from `lh_mobile.json` first navigation: 38 `/data/` requests (oob 15, density 13, chronology 3, vignettes 3, placements 3, terrain 1), 598,455 B raw / 138,605 B transfer (= 584 / 135 KiB; the report's "KB" are KiB). Only `Ed` (`:96991-92`) and `pO` call `zp(2)/zp(3)`; `jumpToDay` (`:9369`) and hotkeys 2/3 (`:112990-112996`) only set the tick. Worse than stated: the first-run tour (`Gc` ticks 1, 17, 28, 267, 538 at `:111819-111849`, `setTick` at `:111865/111869`) jumps to day 2 and day 3 ticks without loading them (see MISSED-03). |
| 12 | CONFIRMED | `index-B4G7Z_2G.css` 40,827 B, 5,102 B br live; all 174 selectors are `.mapboxgl-*`, no `@font-face`. Prefer loading it inside the boot loader (a render-blocking link adds one request to the critical path). |
| 13 | CONFIRMED | First navigation hosts: `api.mapbox.com` 25 requests (h2/h3, tiles + glyphs), `events.mapbox.com` 4, no `a/b.tiles`, no Google origin; Lighthouse marks a/b.tiles and the Google preconnects "unused". |
| 14 | CORRECTED | `index.html:279-280` confirmed; but `network-dependency-tree-insight` longest chain (354 ms) is `/` to `manifest.json`, site-nav.* chains end at 213-214 ms, and `render-blocking-insight` scores 0.5 with 0 ms savings (`site-nav.js` 5,396 B, `.css` 2,463 B). Real benefit is small (a few hundred ms only on slow RTT). Also the home page depends on `site-nav.css` for the Extra Features menu styling (comments `index.html:154,172`): deferring it must keep those rules available. `document.currentScript`/`defer` safety claim verified (`site-nav.js:8`, render on `readyState` `:232-236`). |
| 15 | CONFIRMED | 25 shifts sum 0.115; event card / story panel shifts re-checked in the probe list. Shifts 1-4 largely disappear with 04, but event-card/story-panel shifts also occur during normal playback (no input within 500 ms), so 15 is still needed; medium-high is right. |
| 16 | CONFIRMED | `setInterval` polling x25/x25/x40 (`:388,432,710`), `querySelectorAll('body *')` (`:369,498`), capture-phase document click handlers (`:476-482`, `:599-602`), `getBoundingClientRect` loops (`:504,564,573,658`) all verified. |
| 17 | CORRECTED | Attribution field names verified against the web-vitals README (Apache-2.0; `interactionTarget`, `inputDelay`, `processingDuration`, `presentationDelay`, `largestShiftTarget`, `resourceLoadDelay` all exist). Bugs in the snippet: (a) the `visibilitychange` flush listener is registered BEFORE the web-vitals `on*()` calls, so at `hidden` it runs first, finds `q` empty/partial and returns; the final LCP/CLS/INP are pushed afterwards and only `pagehide` (unreliable on mobile) can send them. The README registers its listener after calling `onCLS/onINP/onLCP`. (b) `base()` calls `localStorage.getItem('gtbg_seen')` unguarded (only `setItem` is in `try`); with blocked storage it throws and the beacon is silently lost, biasing the dataset. (c) `<script type="module" defer>` executes at parse end, not "after load + idle" as stated; use dynamic `import()` in an idle callback. (d) `config.path` already routes `/api/vitals`; the extra redirect is redundant. (e) unauthenticated public write endpoint: the per-instance in-memory rate limit is ineffective on serverless; add a cheap token check or a Blobs quota guard. (f) needs a functions-capable deploy path (see MISSED-05); "Depends on: none" is wrong for the server half. |
| 18 | CONFIRMED | Re-extracted the p75 series: the 0.25 px plot-floor offset is validated by the CLS chart (28 of 133 points sit at exactly 0.25 px above the gridline = CLS 0). With it I reproduce the report's bucket counts (LCP 94/18/54, FCP 145/20/9, INP 83/12/5). The Netlify legend lists Min/Avg/p75/p95/p99/Max but only p75/p95/p99 have visible strokes (the 11 pt grey paths have stroke opacity 0). Docs quotes verified ("only considers metrics within the 75th percentile", "one hour increments"; sampling, bot filtering and custom events are not documented). The "badge = max bucket" idea remains UNVERIFIED (p75 of the p95/p99 series does not reproduce the FCP/INP/CLS badges either). Resolution caveat: the INP axis is 1.3 s/px, so INP class counts rest on the offset. Disable/re-enable of RUM destroys history: export first. |
| 19 | CORRECTED | `lighthouserc.json` puts `budgetsFile` under `collect.settings`; per the LHCI configuration doc `budgetsFile` is an `assert` option that cannot be combined with `assertions`/`preset`, and `collect.settings.budgetPath` only prints budgets in the report. As written the budgets would be silently unenforced: use `assert.assertions` (`resource-summary:script:size`, `total-byte-weight`, the metric audits) instead. Also `render-blocking-insight minScore 1` is unattainable on the sub-pages in the URL list (`site-nav.css` must stay blocking or be inlined); scope it to `/` or `warn`. Preview URLs see 403 tiles (MISSED-04). |
| 20 | CONFIRMED | 9 pages verified by grep (8 real + `unit-rendering-reference`); parser-blocking `mapbox-gl.js` + css in head; `camera.html` char 1,523 before `<body>` at 3,421; `lh_page_camera_mobile.json` 69 vs `lh_page_camera_v10.json` 86 reproduced. Unresolved: `compare`, `immersive`, `watch-together` returned Lighthouse `NO_FCP` ("did not paint any content") from ONE run each with no retry (`runlh_pages.log`) and were dismissed as "harness flake" because puppeteer paints; 3 of 7 identically structured pages failing is worth one retry with the body animation disabled, since `NO_FCP` is exactly the symptom 03's mechanism predicts. |
| 21 | CORRECTED | Numbers reproduce (dashboard CLS 0.1446, historian 0.0564, culprit `body > footer#gtbg-footer`). Misdirected fix: the footer moves because un-reserved async content above it grows (`dashboard.html:68-75` `#loading` to `#chart-wrap` 1000x440 + legend + stats after the `fetch` at `:121`), not because the footer mount is unreserved. Nav/footer injection itself is CLS 0.0000 on every other sub-page (search, regiment, documentary, camera, sandbox, viewshed, ground-remembers in `lh_page_*`), and `site-nav.js` renders synchronously when `readyState !== 'loading'`. `#gtbg-footer-mount{min-height}` will not remove the shift; reserve `#chart-wrap`/`#stats-row`/historian transcript heights (the report lists this second half; promote it to the primary fix). |
| 22 | CONFIRMED | `sw.js:3,15-31,41-49,61-69,73` exact; all PRECACHE URLs return 200 live. Add `registration.navigationPreload.enable()` in `activate` (needed for `preloadResponse`). |
| 23 | CORRECTED | `new Map` options `:97237-97256` exact and option names/defaults valid for Mapbox GL v3. Numbers are off: first-navigation Mapbox transfer is 456 KB (20 tiles 345 KB, 3 glyph PBFs 110 KB, 2 style/other, 4 telemetry), not "368 KB (tiles 337 KB + 2 glyphs 87 KB)" (those parts already exceed 368). Removing the label layers (`roads-1863-label`, `:9756`) removes content; treat as a product decision. |
| 24 | CONFIRMED | `workerUrl` blob assignment `:10024`, setter `:96162-96166` exist in the bundled standard build; `mapbox-gl-csp-worker.js` v3.24.1 is 780,619 B raw / 171,204 B br (q11) and `mapbox-gl-csp.js` 1,743,709 B, both `max-age=31536000`, ACAO `*`. Pointing the standard build at the CSP worker file is a one-line patch (no need to externalise the library), but mixing main+worker builds is not a documented combination; smoke-test. |
| 25 | CONFIRMED | `netlify.toml:19`, `:28-30`, `:74-76` exact; live headers match. Q9 partly resolved: all 8 inline `<script>` bodies are byte-identical between deploy and live HTML; Netlify only rewrites href/attribute quoting (Pretty URLs) and appends the async RUM script at the end of `<body>`, so hashes computed on the deploy file are valid. |
| 26 | CONFIRMED | `bO :111856` (onboarding, only when `gtbg_onboarded` unset, `:112951`) and `dO :102752` (shown every visit) confirmed. L is realistic. |
| 27 | CONFIRMED (stronger) | The cap flips by device profile with the same bundle (live mobile 2,860 ms / desktop 44,543 ms; replica mobile 44,639 ms / desktop 3,146 ms), which is stronger evidence than the report cites. |
| 28 | CORRECTED | The scripted INP evidence is invalid for the states it claims. `inp_profile.mjs` types "20th" into the search box; the app ignores hotkeys when `target.tagName === "INPUT"` (`bundle.pretty.js:112967`), and Escape does not blur (audit H2). In `inp_profile_base_d4.json` the `key Right`, `key 3` and `Space (start play)` steps all have keydown target `INPUT:`, so none executed; the "3 s of playback" profile has no `Ed`/`lS`/`y1`/`dA` samples (80% idle), i.e. the frame loop never ran. Also no `L` key step exists (report cites "F/S/L"). So "1-32 ms at 4x" covers only F/S, typing, map clicks while paused and slider drag; suspect #1 (frame loop) and #2 (store re-renders during playback) remain unmeasured in-browser, and exec-summary item 9 / 4.4 "Not suspects" is unsupported for playback. See MISSED-01. |
| 29 | CONFIRMED | Only Mapbox marks exist (`bundle.pretty.js:53877,53880`); proposal is sound. |
| 30 | CONFIRMED | `day1.png`/`day3.png` md5 identical (3f6646c9...), 17,585 B, `og:image`/`twitter:image` use `day3.png` (`index.html:21,25`); `InterpolationWorker` referenced 0 times in the bundle. |

### Verified-good (no change needed)
Lighthouse snapshot (2.3 table) reproduces to the digit; `redirects` 9,066.6 ms; the `lab/summ.py` table for base/v1-v11 reproduces; filmstrips `sheet_v1/v5_mobile.png` show white vs splash frames as claimed; probe values (FCP 604/448 ms, LCP elements, CLS 0.0497/0.0078, reload at 4,090 ms) reproduce; RUM figures and traffic (3,389 pageviews, 47% non-home when `/index.html` is counted as home) reproduce; Netlify RUM script is web-vitals v3 (`id:"v3-..."`, `durationThreshold:40`, pagehide/visibilitychange).

### MISSED issues (in scope, not in the report)

1. **INP/playback measurements were never taken (test harness bug)** [high]. Evidence: `inp_profile.mjs:60-64` types into the search input, then sends Right/3/Space; `bundle.pretty.js:112967` returns early on INPUT targets; `inp_profile_base_d4.json` events show `INPUT:` targets and no `Ed/lS/y1` samples in the playback step; `Space (pause)` (target BODY) then actually STARTS playback, so the slider-drag step ran during playback while labelled otherwise. Fix: blur/click `body` before every hotkey step, assert `store.isPlaying` and the presence of `Ed` in the profile, and re-run at 4x on desktop and 412x823 mobile with real tiles (MISSED-06). Until then treat INP suspects 1/2 as untested.
2. **Reload-loop hazard in the proposed boot loader** [high, fix to 02]. `import(...).catch(location.reload)` loops forever on a persistent failure; concrete triggers: the BRIEF's lower-cased asset names (404), CSP enforcement without the loader/asset hash, top-level throw. Fix: `sessionStorage` once-per-session guard + visible "Couldn't load the map. Retry" in `#boot-splash`; test by 404-ing the bundle.
3. **First-run tour and deep jumps show an empty map (data-load bug is user-visible on the default path)** [high functional]. Evidence: tour stops at ticks 267 and 538 (`bundle.pretty.js:111842,111849`) advance via `setTick` only (`:111865,111869`); only `Ed` loads days 2/3 (`:96991-92`) and only when `isPlaying`; `jumpToDay` `:9369` and keys 2/3 `:112990-112996` do the same. Mobile is unaffected only because `pO` eager-loads all three days (`:103040-42`), which perf-cwv-10 proposes to remove. Fix: `ensureDay(tickToDay(currentTick))` from a store subscription (11) before touching `pO`; add a test that opens tour steps 4/5 from cold.
4. **LHCI on deploy previews measures a different workload** [medium]. The report's own Q6 says tile requests 403 unless the Referer is the production host; previews (`*.netlify.app`) and localhost therefore skip tile decode/GL work and log 403 console errors (fails `errors-in-console`, best-practices). Fix: a second referrer-restricted preview token (or allow the preview pattern), or gate on a nightly production run and use previews only for HTML/bundle lint.
5. **Deploy pipeline prerequisite for the beacon function** [medium]. The site is a static `publish="."` tree with no `package.json`/build (`netlify.toml:1-3`); `netlify/functions/vitals.mjs` needs `@netlify/blobs` bundled at deploy, and the Netlify functions deploy doc lists only Git, CLI or API for manual deploys (drag-and-drop is not documented). Add "set up a CLI/Git deploy path" as an explicit dependency of 17 (and of every `tools/` CI gate).
6. **Replica numbers exclude Mapbox tile/GL work** [medium]. All replica/probe requests to `api.mapbox.com` 403 (`probe_base_mobile_wait.json` console shows repeated 403), so the headline "mobile 88-93 / ceiling 100" and TBT 294-472 ms are upper bounds; live has 20 tiles (345 KB) + 3 glyph PBFs (110 KB) to decode/upload. Fix: re-measure v10 under production-equivalent conditions (inject `Referer: https://gettysburginteractivemap.com/` for `api.mapbox.com` via CDP request interception) before publishing targets.
7. **`mapboxgl.workerCount` default of 2 for a single-map app** [low]. `bundle.pretty.js:58225` `Cl.workerCount = 2` (setter `:96147-96151`); the network log shows two 838,974 B blob workers. Setting it to 1 halves worker compile/memory on phones (measure tile-parse latency; keep 2 on desktop if it regresses). Combine with 24.
8. **Help/Bookmarks first-open delay has no owner** [low]. `Suspense fallback: null` (`bundle.pretty.js:113276-113277`) with lazy chunks (`:112469-112470`) fetched only on click (D1: 1-2 s); the report mentions it under INP but has no finding. Fix: `import()` prefetch on idle/hover + a skeleton fallback (S).

### Effort/severity adjustments (summary)
07 high to medium (XL if patching minified); 08 effort L needs source else XL; 05 high to low/medium; 06 high to medium/low; 02 gets a mandatory safety guard; 19 lint/budget config must be rewritten before use; 21's primary fix changes to reserving async content; 28 must be re-run before any INP conclusion is drawn.
