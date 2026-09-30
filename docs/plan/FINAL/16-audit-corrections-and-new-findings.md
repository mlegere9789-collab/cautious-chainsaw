# 16 - Audit corrections and new findings (annex)

Status: PROPOSED 2026-09-30. Nothing built or deployed. This annex adds no work packages and no effort of its own: every fix named here is a WP in chapters 02-14 (`WP-<PREFIX>-NN`) or a decision package in chapter 01 (`WP-DEC-NN`). It obeys `01-decision-register.md` and finds no conflict between itself and it (section 6 lists inconsistencies between chapters and the deviations they record). Effort: S < 0.5 d, M 0.5-2, L 2-5, XL > 5.

Evidence tags: **[V]** re-checked by me for this annex (grep of `bundle.pretty.js`, the deployed tree, data files, Lighthouse JSON); **[S id]** stated or corrected by a specialist or verifier (`plan-work/merged/*.json`, `critics.json`); **[E]** my estimate or judgment; **[U]** unverified. Line numbers are `bundle.pretty.js` unless a file is named; `R` = reproduced live by a specialist in headless Chrome over raw CDP (no real device, no WebKit). WP prefixes: T0 = chapter 02, ARCH 03, TIME 04, PERF 05, UX 06, A11Y 07, PAGE 08a, PAGEC 08b, INFRA 09, SEO 10, CONTENT 11, QA 12, DATA 13, HIST 14, DEC 01.

## 0. Summary, exit criteria, work packages

**What this is.** The first audit (`gettysburg-site-audit.md`, 2026-09-29) came from one headless-Chrome pass, two Lighthouse runs, the Netlify PDFs and curl. Twenty-four specialists and their verifiers re-derived it: 852 findings (523 CONFIRMED, 285 CORRECTED, 25 UNVERIFIABLE, 18 NOT_VERIFIED, 1 REFUTED). This annex records (1) what the audit got wrong or overstated, with a corrected scorecard; (2) defects found beyond it; (3) the WPs that close each of the 57 audit ids; (4) the findings that were not confirmed.

**Headline.**
- 42 of the 57 audit ids have a fact or cause corrected or materially extended (1.2), 5 more a grade or framing, and 10 stand as written. All 57 are declared by at least one WP (430 WPs in chapters 02-14, plus 17 in chapter 01).
- The audit's largest miss was structural: it never dragged or wheeled the map, so it missed that an overlay canvas swallows all pan, zoom and tap input (NF-01), and it read the mobile transport row as a layout bug when the desktop timeline bar is mounted over the mobile UI (NF-02).
- Corrected scorecard (1.4): desktop C (mean 2.08), mobile D (mean 1.53, capped at D by the F on core function); the audit said B- and C-. Accessibility is D/D by code, not C+/C; mobile core function is F because pan, zoom, tap-select and the playback controls are blocked.
- 54 new findings, NF-01..NF-54: 34 already indexed in chapter 12 Appendix A and 20 added here.

**Exit criteria for this annex (measurable).** X-1: no plan or user-facing text repeats a claim refuted in 1.2 (grep of `docs/`, guide, Help rows, chapters; WP-CONTENT-05/10). X-2: the first machine scorecard run matches 1.4 within one step per cell or the PR explains the difference (WP-QA-23). X-3: 57 of 57 audit ids and all NF ids trace to a WP and a gate, 0 orphans, NF-35.. added to the catalogue (WP-QA-23). X-4: each of the 44 non-confirmed findings is verified, dropped or waived with a date before the WP it feeds is scheduled (WP-DEC-16). X-5: the conditional grades in 1.4 are re-graded after the headed real-mouse test, the device matrix and one assistive-technology pass (WP-DEC-16, WP-QA-21, WP-A11Y-30).

**Work packages.** None new. Small tasks are absorbed by existing WPs and must not be added to their totals: ingest NF-35.. into the gate catalogue and record 1.4 as baseline (WP-QA-23); run the section 4 verification bundle (WP-DEC-16, already 2-3 d). Annex-only residue: 0.5-1 person-day [E].

## 1. What I got wrong or overstated in the first audit

### 1.1 The pattern

(1) **Blind spots from the test method:** headless Chrome with synthetic input, no drag or wheel on the map, no phone; so the two worst defects (NF-01, NF-02) were invisible and a "Works" list was published that they contradict. (2) **Symptom mistaken for cause:** C1/C2, C8 and D3 were real but the cause I named was wrong, and C7, S1, S4, H2, H11 and D4 stopped at the symptom; the audit's C1 fix (wrap or scroll the transport row) would have been a no-op. (3) **Simulated numbers read as observed:** Lighthouse's 9.0 s mobile and 2.2 s desktop LCP are Lantern simulations and the RUM "Poor" badges are outlier-driven. "Lower" marks a correction that shrinks a claim, "worse" one that enlarges it.

### 1.2 Corrections table

| # | Audit ids | The audit said, and the corrected statement (evidence) | Effect on the plan |
|---|---|---|---|
| 1 | X1 | **Said:** the Mapbox token answered 200 to a foreign Referer, so "likely unrestricted". **Corrected (lower):** tile, TileJSON, geocoding and static requests return 403 for no, foreign, localhost and netlify.app Referers and 200 only for the production origin; only style, sprite and glyph endpoints answer 200 for any Referer (what I hit). Tiles ARE URL-restricted. Unverified: allow-list, scopes, spend cap, and one verifier's 200 for a foreign Referer on an unspecified endpoint. Localhost and previews get blank maps; the token has 11 literal copies. [S infra-netlify-18, mobile-20, pagesA-38; register 8] | Owner verification, not an emergency: WP-DEC-15, WP-INFRA-03, WP-T0-17; dev and preview tokens. |
| 2 | X4, G1 | **Said:** the guide PDF is "served inline"; `X-Frame-Options: DENY` "blocks all embedding"; `diagnostics.html` "correctly 404s" (brief). **Corrected:** (a) the PDF is an attachment (`netlify.toml:200-204` [V]). (b) `/embed.html` sends BOTH DENY and `frame-ancestors *` (the empty-string override at `netlify.toml:80-85` [V] is a no-op), so frame-ancestors-aware browsers probably embed it: hygiene (lower); the real defect is the clean URL `/embed` (DENY only). (c) only `/diagnostics.html` is force-404'd; `/diagnostics` and `/unit-rendering-reference` (a dev page) return 200, and old deploy permalinks and `friendly-lolly-da85c0.netlify.app` serve the whole site. [S infra-netlify-02/12/16, pages-C-87, seo-growth-03] | WP-T0-12/15, WP-INFRA-14, WP-SEO-03, WP-PAGEC-31/34. |
| 3 | H3 | **Said:** a "~15 s" fast-forward splash every visit. **Corrected:** the sweep is `eO = 3500` (`:101471` [V]) plus a 0.6 s fade and about 0.8 s delay (about 4.9 s forced); measured 5.5-8.2 s to an interactive chooser including the first-visit reload. About 14-15 s fits only the whole first run (splash, chooser, onboarding modal, tour). **Worse:** no auto-detect, no persistence, a false "settings menu" promise, and a second Mapbox map mounted behind the chooser. [S app-latent, perf-cwv-04, bundle-anatomy-13, mobile-05/06, ux-flows-02] | Intro deletion is one R0 patch (WP-PERF-07) but the sweep primes carry-forward cache `i2`, so jumps change: O-T0-3 (WP-T0-07). |
| 4 | P1, P7, C6 | **Said:** mobile LCP 9.0 s, desktop 2.2 s; the first-visit reload is the root cause. **Corrected:** 9.0 s and the 4.1 s FCP are Lantern-simulated; the same trace observed FCP = LCP = 287 ms, and desktop's simulated 2.23 s hides an observed 4.58 s [V: `lh_mobile.json`, `lh_desktop.json`]. The LCP element is the story-panel text painted by the app's own 3.5 s intro (4,776 ms mobile, 4,928 ms desktop at 4x CPU, Slow 4G, no input), also the main CLS source (25 shifts, 0.115). The reload is real (Documents at 1 and 909 ms; redirects audit 9,066 ms) but fixing it alone lowers the lab score (64 to 51). [S perf-cwv-02/04, deploy-history-26, perf-runtime-04/05] | R0 must be atomic: reload fix, boot after first paint, no fades, intro deletion (WP-T0-04/05, WP-PERF-05/07); A/B before any "green" claim. |
| 5 | P1 | **Said:** RUM Poor for LCP, INP, CLS, FCP; spikes Sep 7-8, 18, 26 "match your big deploy day". **Corrected (lower for three):** only LCP is bimodal (33% of hourly p75 buckets above 4 s); the FCP, INP and CLS badges are outlier-driven (83%, 83%, 96% of buckets Good; single loads of 27 s FCP, 19 s INP in a hidden tab, 0.38 CLS). **Worse:** RUM understates first-visit pain (the reload tears the page down before FCP and LCP are recorded) and INP has no lab evidence (the scripted run never executed playback; focus stayed in the ignored search input). The live deploy dates from Sep 9 and nothing shipped since, so Sep 18 and 26 are not code. [S perf-cwv-18 and verifier, deploy-history-01/33] | Fix LCP, not badges; first-party RUM (WP-PERF-03/04); official green needs 30 days (earliest 2026-12-03). |
| 6 | C1, C2 | **Said:** the 375 px transport row is 572 px wide, centred, no wrap: wrap or scroll it. **Corrected (worse):** that row (scrollWidth 574, clientWidth 343) is the DESKTOP timeline bar `IO` (`:113249`) mounted in the Mobile layout with 14 other desktop overlays; `IO` (z100, later in the DOM) ties the mobile root (z100, `:103699`) and paints over the whole mobile dock and the Tools sheet's bottom 127 px; the real dock is underneath and tapping the mobile Play button scrubs `IO`'s range. Wrapping the row (the audit's fix) or removing a z-index is a no-op. [S mobile-01, app-design-01/02 verifier, deploy-history-07; [V] `:113242-113284` has no mobile guard] | Unmount desktop overlays in compact and re-host panels: WP-T0-08, WP-UX-01/14, WP-ARCH-19/27. |
| 7 | C7, S1 | **Said:** the Dashboard chart is empty "intermittently"; Battle Reports and Regimental Biography are "a lone search box". **Corrected:** one root cause: `site-nav.js` injects an icon sprite whose `<symbol id="chart">`, `search`, `clock` collide with page ids, so `getElementById` returns the hidden symbol: the chart draws inside the sprite, report and regiment search never bind, the ledger clock is dead. A race with `requestIdleCallback` (live: report search dead on 2 of 4 fresh loads). The `highest_single_regiment_rate` / `undefined` card is a separate nested-shape bug; the dev "data note" reports real discrepancies (U-I 6,059 vs 6,394; C-CAV 583 vs 483). [S pagesA-01/10/11] | WP-T0-11, WP-PAGE-01 (rename atomic with `index.html`), WP-PAGE-16/17. |
| 8 | C8, S4, A1 | **Said:** chips are 1.10:1 for want of button styles; Compare tabs clip; "mobile sub-pages generally good, no horizontal overflow". **Corrected:** the shared reset `site-nav.css:143-147` (`color:inherit`, specificity 0,1,1) outranks page classes: chips 1.10:1, Play 1.92:1 on four pages, Compare toggles 16 px instead of 10 px. **Worse:** the Dashboard's unbreakable stat-card key widens the phone layout viewport to 446 px, Compare to 528 px, and Documentary renders 24 of 24 multi-paragraph narratives as one paragraph. [S pagesA-02/10/26, deploy-history MISSED-1, pagesB-14] | WP-T0-11, WP-PAGE-02, WP-UX-06; WP-PAGE-16/18/30/38. |
| 9 | C5 | **Said:** `setGoldUnit is not defined` is a console error in an `onClick`, "probably the Monuments path". **Corrected:** three names are undefined (`setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment`: `:101086`, `:101101`, `:101229` [V]) plus `CanvasRenderer` (`:96556` [V]); the throw is in the Follow-Ancestor pick handler and, with no error boundary, the root loses all children. A shared `?ancestor=` link does not crash on load: it is read only when the panel mounts (`:101019` [V]), so it never worked cold. The gold-trail engine has been absent since Jun 13. [S app-latent-01 verifier, app-time missed 2, deploy-history-06] | WP-T0-06 (O-T0-5), WP-ARCH-24; UG-01. |
| 10 | C4, C3, H9 | **Said:** "likely the tick to clock mapping is compressed relative to real time"; "1x (real time)" is about 10 sim-min/s. **Corrected:** neither an offset nor a uniform scale: nine independent implementations, `July ${l + 2}` at `:97428` [V], `:100842`, `:101006`. Real minus label rises from about 0 at each day's start to +5-6 h (Day 1 afternoon), +7-9.5 h (Day 2), +3.2-3.9 h (Day 3) and back; over 102 events the label is off by a mean 4.8 h (5 within 30 min), the map clock 4.8 h (1). The fix is a piecewise time-warp through 33 anchors (12 solid, 13 medium, 5 needing a historian, 3 design) whose 21-min mean error is in-sample (off-anchor 28.8 min). 27 of 137 chronology events are content defects no clock fixes (12 misordered, 4 wrong-day, 9 composite, 2 unverified quotes). "1x" is false under any reading (2 ticks/s = 1.7-84.7 battle-min/s); `+2` alone leaves 149 ticks with a date that differs from their Day tab. [S time-facts-01/03, app-time-01/02/03, ch04] | WP-TIME-02..10 with a named reviewer and DG-3 sign-off; T0 ships only `+2` (WP-T0-07, WP-TIME-01). |
| 11 | H2 | **Said:** Esc is ignored in Search and does not close panels. **Corrected (cause found):** the global handler returns for `tagName INPUT` (`:112967`) while Search autofocuses; `Escape` clears `selectedUnitId` but not `pinnedUnitId`, and the unit panel renders for selected-or-pinned (`:97909` vs `:113033-113046` [V]); story, event, legend, layers untouched; no modifier check, so Ctrl+F opens Filter and Ctrl+= / - / 0 change speed. [S app-latent-17, app-bugs-09] | Key guard in T0 (WP-T0-06); `LayerStack` at rebuild (WP-UX-18, WP-A11Y-06/08). |
| 12 | H4, A6 | **Said:** toasts "don't auto-dismiss". **Corrected (lower):** they do: `setTimeout` 4,500 ms (`:99912-99916`), commander cards 3 s; headless timer throttling likely explains the observation. Real defects: no live region (WCAG 4.1.3, 2.2.1), up to four stale succession toasts replayed after a paused seek, commander toasts dead. [S app-latent, app-bugs-10, app-time-08] | WP-A11Y-11, WP-UX-18, WP-TIME-12. |
| 13 | H10 | **Said:** "467 regiments/batteries" vs "445+". **Corrected:** 467 regiment records plus 103 batteries = 570 records [V]; 569 distinct units (465 regiments plus 104 batteries) once the alias stub `U-14BK` and one battery filed as a regiment are reclassified [S ch13 [V]]; "445+" is 467 minus 22. Only 217 regiments and 38-41 batteries have own positions (231 via a brigade, 19 none); the 103 batteries are never loaded by Search, Regiment, Report, Find Ancestor or the Historian. Re-run here: 1,804 keyframe rows, 188 populated ticks, 478 placed ids [V]. [S app-bugs-15, docs-copy-08, data-integrity-03/09] | Derive counts (WP-CONTENT-04, WP-DATA-19); batteries are a coverage bug (NF-26). |
| 14 | P3, P2 | **Said:** "~30 JSON fetches"; "52% unused JS". **Corrected (worse):** 38 boot fetches (37 unique; 598 KB raw, 138.6 KB wire) on desktop, 72 on mobile (two maps, all three days eager). The bundle is 79.2% Mapbox GL (1.81 MB), 6.5% React and zustand, 14.2% app code, 46% of that inline data. [S bundle-anatomy, perf-runtime-07, perf-cwv-10] | WP-PERF-09/11/12, WP-ARCH-10/16. |
| 15 | D3, D4 | **Said:** the empty July 3 dawn is a camera problem; no discoverable Order of Battle on desktop. **Corrected:** a data-loading bug: Day 2/3 placements are fetched only when playback crosses tick 200 or 420 (`:96991-96992`), so every jump shows forward-filled Day-1 positions; not flying to the action is secondary. Order of Battle: the desktop state can never become true and the panel is not hierarchical. [S app-bugs-06/13/21, app-latent-05] | Data first (WP-T0-07, WP-PERF-09, WP-TIME-12); auto-fly in WP-UX-18; OOB in WP-ARCH-24. |
| 16 | H11 | **Said:** the minimap label is stale. **Corrected (worse):** the tick itself is frozen: `subscribe(selector, listener)` on a plain zustand store (`:99650` [V]), so the listener never fires. [S app-latent-19, app-bugs-16] | WP-T0-07, WP-ARCH-15/21. |
| 17 | H12 | **Said:** the Distance tool shows one marker and no line. **Corrected (lower):** did not reproduce fresh (two markers, dashed line, "7,013 ft / 2,338 yd / 32 min"); `GtbgDist` already shows ft/yd/m and march time; empty catches and a one-time `mapRef` read are unproven suspects. [S app-latent missed 8, deploy-history-30 and app-bugs-17 verifiers] | No T0 fix; WP-ARCH-25; verify first. |
| 18 | H13 | **Said:** Walkthrough caption identical for stops 1 and 8; Soldier's Eye hands off to Google Maps. **Corrected:** the hand-off is confirmed (`:101961-101963`, empty pano id); the caption theory is unproven (pano ids differ); stops 3 and 5 have no pano id (14 of 16 do). **Worse:** the Walkthrough cannot be opened in the Mobile layout at all. [S app-bugs-18/19, deploy-history-31 UNVERIFIABLE] | WP-ARCH-25/26, WP-UX-31, WP-CONTENT-10. |
| 19 | S3 | **Said:** Camera and Viewshed canvas painted incompletely. **Corrected (unreproduced):** camera.html was fully painted at 1.8 s and 9 s at 1440x900 and 375x812; the suspect `#atmosphere{mix-blend-mode:multiply}` (`camera.html:38-39`) is unconfirmed. [S pagesA-34] | Verify first: headed GPU run and paint gate (WP-PAGE-36, WP-QA-21). |
| 20 | S2, P4 | **Said:** Ground Remembers is blank about 3 s. **Corrected:** a synchronous 1.8 MB Mapbox script (385 KB brotli) plus a map created only after 9 serial fetches; nine map pages block first paint (FCP 3.3-5.5 s). Adding `defer` breaks all 8 product map pages (inline scripts set the token at parse time). The heat reflects keyframe authoring density (21% non-combat keyframes). [S pagesB-02/49, perf-runtime-11, deploy-history-20] | WP-T0-13, WP-PAGE-10/46, WP-PERF-19 (facade, not `defer`). |
| 21 | T1, T3, E5 | **Said:** only about 8% of referrals from search "despite SEO 100"; sitemap 20 URLs. **Corrected:** the gap is domain age and surface: registered 2026-06-13, Search Console verification lapsed, JS-rendered thin pages (regiment median 17 words; 0 of 101 brigades reach 250; 127 units share one `key_action`); Bing, DuckDuckGo and Yahoo (110) out-refer Google (63). The sitemap has 21 `<loc>`, no `lastmod` [V]; 10 pages link to `/index.html`. [S seo-growth-01/03/13/14] | Outcome KPI, not a bug: WP-SEO-01/02 first; trains S1-S4 four weeks apart after a 28-day baseline. |
| 22 | T2 | **Said:** about 18% of views (CN, SG, HK, DE) "look like bot traffic". **Corrected (unverified):** the human share is unknown; Netlify's script is web-vitals v3 without attribution. [S infra-netlify-32 UNVERIFIABLE, seo-growth-36] | Measure and segment, do not block: WP-INFRA-29, WP-SEO-02. |
| 23 | X3, X5 | **Said:** CSP is Report-Only with `unsafe-inline` and lacks the RUM host; privacy omits PeerJS, Mapbox telemetry, AR. **Corrected (worse):** the policy has no `report-uri` and `/api/csp-report` is 404, so its soak is blind; an enforcing CSP as first drafted by a specialist would break Watch Together (`cdn.jsdelivr.net`) and the NPS frame. The privacy text is wrong, not just incomplete: it puts Street View on the documentary and report pages and omits the NPS frame, jsDelivr, PeerJS defaults (0.peerjs.com, Google STUN, PeerJS TURN), Mapbox telemetry, AR sensors and Netlify analytics. [S deploy-history-17/18, infra-netlify missed 2, pages-C-81/83] | WP-INFRA-15/16/26/27, WP-DEC-07/08. |
| 24 | A1-A6, D2 (grading) | **Said:** Lighthouse a11y 90 plus manual findings, so C+/C. **Corrected (worse):** Lighthouse is a subset on one screen state. By code 23 of 55 WCAG 2.2 A+AA criteria fail (13 Level A), 10 partial; zero `aria-*` or `role` in about 17,000 lines of app code; 75 glyph-named buttons; 17 click-only div or canvas controls; the map is a canvas with no keyboard or text alternative; 15 of 27 HTML files lack `<main>`, none has a skip link or live region. [S app-a11y, ch07 [V]] | Grade D/D (1.4); WP-A11Y-01..33; Lighthouse 100 after the T0 bridge is not conformance. |
| 25 | (Works list; sub-pages framing) | **Said:** works: playback, day tabs, Follow Ancestor with share link, Roster; Documentary and Regimental Biography "strong". **Corrected:** pan and zoom were never exercised and are blocked (NF-01); the ancestor share link never worked cold; tap-select throws on phones (NF-35); Follow Ancestor lists 217 of 478 units on a fresh load; opening Roster adds 4,989 DOM nodes (680 ms); Regimental Biography's join finds 1 of 467 regiments. [S perf-runtime-01/09, app-latent-01/04/06, pagesB-44] | The "Works" list is withdrawn; WP-QA-04/05 and journeys J1-J8 (WP-T0-18) replace it. |
| 26 | N1 | **Said (in the brief, not the audit text):** no real source exists; the case-mangled deploy zip would 404 when redeployed. **Corrected:** the "source" zip equals the deploy (119 files) and `index-Cg8FAMXN.js` (md5 7ef75b95f4) is byte-identical since Jul 29. But modular trees from older lineages exist in Downloads (`COMPLETE_FIXED`, `v2_fixed`, `FINAL_v24`, `FIXED_v25`); none reproduces the deployed bytes, and RECON_SRC is one of them. Netlify serves paths case-insensitively (live `/assets/index-cg8famxn.js` returns 200): hygiene only. The live trap is that the entry name carried 45 byte streams across 86 of 189 zips under `immutable` caching and a cache-first worker. [S prov-recon verifier, mobile-19, deploy-history-01] | D-SOURCE: closed Tranche 0 plus strangler rebuild, quarries widened; R0 first, new hashed names for entry AND both lazy chunks. |
| 27 | E1 | **Said:** the manifest locks landscape, bad for phones and the PWA. **Corrected:** `orientation` affects only an installed standalone PWA, not a browser tab; but landscape is unusable (map 141 px at 812x375) and the first hotfix layout query sent 844x390 and 915x412 phones to the desktop layout. [S mobile-08/13/18, app-mobile missed 2] | WP-T0-08/14, WP-A11Y-21. |
| 28 | E3, E4 | **Said:** three `<h1>` in the home HTML; the crawler-only `#seo-content` "adjacent to cloaking". **Corrected:** the extra h1s and the Monuments overlay hack came with the Sep 9 deploy; `#seo-content` is not cloaking by Google's definition (it matches visible content) but is fragile. [S deploy-history-23, seo-growth-09] | WP-T0-10, WP-SEO-10. |

### 1.3 What stood

- Every critical bug C1-C8 reproduced (causes refined above); the +2 date, dev-log copy (H7), the count inconsistency (H10), the Historian overpromise (H8), unlabeled slider and tiny targets (A2, A3) and the Help delay (D1) hold.
- The traffic figures (3,389 views, 1,529 visitors, 173 of 2,221 referrals from search, ChatGPT 14) reproduce from the PDFs [S seo-growth; register 8]; scanner paths all return 404.
- The verdict's shape holds (strong concept and prose, weak integration layer). The fix order's priorities stand (mobile, one clock, leaked strings, layout persistence, guide); its mechanisms do not: the row-wrap fix was a no-op (row 6), the reload fix must ship atomically (row 4), the Mapbox half of item 7 rested on a wrong premise (row 1), and the order missed the input-swallowing canvas and the stale-code trap.

### 1.4 Corrected scorecard

The audit's 13 categories and rubric, re-graded from the specialists' evidence and my re-checks. Grades are judgments [E]; chapter 12's machine scorecard (WP-QA-23) replaces them. "ch02" is `02-tranche0-hotfix-runbook.md` section 10. `*` marks a conditional grade.

| Category | Audit (desktop / mobile) | ch02 baseline | Corrected (desktop / mobile) | Why (evidence; differences from the audit and ch02) |
|---|---|---|---|---|
| Concept, ambition, content depth | A / A- | A / A- | **A- / B+** | Ideas and prose hold; depth is thinner than presented (1,804 keyframes on 188 of 675 ticks, 217 of 467 regiments tracked, 11,088 words indexed by the Historian, no mention of slavery or civilians); on phones the story panels never appear (NF-03). |
| Historical/data consistency | C- / C- | C- / C- | **D / D** | Clock label off by a mean 4.8 h (5 of 102 events within 30 min); 27 content defects; 10 Confederate regiments keyed as Union; 95 of 478 placed ids lack an OOB record; casualty totals with no authority; no per-record provenance; rights-tainted rows live. |
| Visual design and brand | B+ / B- | B+ / B- | **B / C+** | 307 colour literals, two golds, 165 sub-12 px font declarations, 27 z-index levels; 8 of 11 legend colours differ from the map; canvases not DPR-aware; social image corrupt. Phones: desktop overlays over the dock, 1.10:1 icons. |
| Fit and finish | C+ / D+ | C+ / D+ | **C / D-** | "undefined" on 137 Historian answers and a Dashboard card, raw ids, 1,591 " -- " dashes, dev-log copy, a live dev page, a z-999999 overlay. Phones: five dead tiles, invisible panels, clipped title, unusable landscape. |
| Usability / learnability | B- / D+ | C+ / D | **C+ / D-** | Three blocking screens before the map; keyboard-only users cannot enter; every deep link lands on tick 1; jumps show stale data. Phones: pan, zoom, tap-select and story panels unreachable. |
| Core function (does it work) | B / D | C / D- | **D+* / F** | Desktop: pan and zoom swallowed by the overlay canvas (three live reproductions; C- if a headed real-mouse test passes), Day 2/3 jumps show Day-1 positions, sound freezes playback. Phones: no pan or zoom, tap-select throws, playback controls under the desktop bar: not operable. |
| Reliability | B- / C | C / C- | **C- / D** | No error boundary or boot-fetch handling, uncaught ReferenceErrors, a loop throwing 20 TypeErrors per frame (45-59 commits/s idle), a cache-first SW that stores 404/500 under a reused immutable name, hidden-tab clock leap. |
| Performance (real users) | C / D+ | C / D+ | **C / D+** | Same grade, different reasons: only LCP is truly poor; FCP, INP, CLS badges are outliers; 64 lab and 9.0 s LCP are simulated (observed 287 ms) while the real LCP element is the 3.5 s intro text (4.8-4.9 s at 4x/Slow 4G); INP unmeasured; 38 boot fetches (72 mobile). |
| Accessibility | C+ / C | D / D | **D* / D*** | Lighthouse 90 is a subset; by code 23 of 55 A+AA criteria fail (13 Level A), zero aria or role, canvas map with no keyboard alternative, 62 of 234 text styles fail 4.5:1, 15 of 27 pages without main. |
| SEO / metadata | A- / A- | A- / A- | **B / B** | Tags, canonical, JSON-LD, sitemap sound (Lighthouse SEO 100) but social image corrupt on 21 pages, 16 of 27 root pages lack twitter:card, Search Console ownership lapsed, duplicate URL spellings and host, every deep link dead, domain 3.5 months old. |
| Security hygiene | B / B | B / B | **B- / B-** | Up: tiles URL-restricted. Down: stored XSS in Watch Together, blind Report-Only CSP with unsafe-inline, contradictory embed headers, dev pages live, no CAA/SPF/DMARC, one Gmail as contact and recovery identity, attribution disabled. |
| Documentation (guide PDF) | B / - | B- / - | **C / -** | Guide: 95% of text under 10 pt, untagged, metadata "(anonymous)", 11 claims false or stale, no generator script; every trust page (about, sources, faq, accessibility, corrections, contact, security.txt) returns 404. |
| Privacy / legal pages | B+ / B+ | C+ / C+ | **D+ / D+** | Privacy text materially wrong (1.2 row 23); Terms invite an embed widget the headers contradict; no counsel review; rights exposure live (Busey and Martin figures, 18 monument rows, notes citing a paid app); attribution off. |
| **Overall, unweighted mean** | 2.85 (B-) / 2.25 (C+) | 2.48 (C+) / 2.01 (C) | **2.08 (C) / 1.53 (C-)** | Mean of the letter grades on a 4.3-to-0 scale; mobile omits documentation. The audit's own mobile overall (C-) was judged, not a mean. |
| **Overall, judged** | B- / C- | C+ / D+ | **C / D** | Rule: the overall cannot exceed the mean and is capped at D on a device class whose core function is F. The gap between the mobile mean and the judged grade is that cap. |

Three grades are conditional: desktop core function moves from D+ to C- if a headed real-mouse test shows pan and zoom work (register action 12a; three live reproductions with a hidden-canvas control say they do not); every mobile grade assumes the device matrix confirms the headless results (iOS and real Android are unverified); accessibility is by code, pending one screen-reader pass.

### 1.5 Facts re-checked for this annex [V]

`July ${l + 2}` at `:97428`; `eO = 3500` at `:101471`; only URL reader `get("ancestor")` at `:101019`; `CanvasRenderer._lastSoundMs` at `:96556`; `setGoldUnit(...)` at `:101086`, `:101229`; `ux.canvas` `pointerEvents:"auto"` at `:97396`; `attributionControl:!1` at `:102988`, `:110777`; Escape clears `selectedUnitId` only (`:113033-113046`); `controllerchange -> location.reload()` at `index.html:263-268`; attachment header at `netlify.toml:204`; embed override at `netlify.toml:78-85`; sitemap 21 `<loc>`; `day1.png` and `day3.png` identical (md5 3f6646c9...); 467 regiment ids plus 103 battery ids; 1,804 keyframe rows, 188 populated ticks, 478 placed ids; 137 chronology events keyed `event`; Lighthouse mobile observed FCP and LCP 287 ms vs simulated 4,099 and 9,007 ms, desktop observed LCP 4,580 ms vs simulated 2,229 ms. Placed ids without an OOB record: 100 by record-type ids, 87 if parent references and battalion ids count as defined (specialists reported 100, 95 and 87; chapter 13 uses 95).

## 2. New findings beyond the audit

NF-01..NF-34 use the ids indexed in chapter 12 Appendix A (gate ids in the last column); NF-35..NF-54 are additions from the specialists' and verifiers' "missed" lists and my re-checks, not yet in that index ("add gate"). "Cause of" means the defect is the real root cause of an audit id.

### 2.1 Critical (C-level had the audit found them)

| NF | Finding, evidence | Fixed by (WP; gate) |
|---|---|---|
| NF-01 | The z-10 unit canvas has `pointer-events:auto` above Mapbox's container, so drag, wheel, pinch, tap-select and the desktop zoom control never reach the map (desktop and mobile). R: container got 0 events, centre and zoom unchanged, zoom-in hit-tests to the canvas, screenshot diff 0.014-0.018 vs 26.7 with the canvas hidden; present in every archived build since Jun 13. Not yet confirmed with a real mouse (register action 12a); if confirmed it outranks C1. The fix must rewire `_gbDist` and redraw on camera move. [`:97393-97399`, `:102994`; S mobile-02, app-latent-04/07, perf-runtime-01] | WP-T0-06, WP-UX-01, WP-ARCH-18; INP-01..03 |
| NF-02 | Cause of C1/C2: 15 desktop overlays (FF OF VF WF CF LF _F IO KF XF iO nO yO qF MF) render with no layout guard in the Mobile layout; `IO` ties the mobile root at z100 and covers dock and Tools sheet; `_F` and `KF` run always-on rAF setState on phones. R. [`:113242-113284`; S mobile-01, prov-recon MISSED, deploy-history-07] | WP-T0-08, WP-UX-01/02/14, WP-ARCH-19/27; MSH-03 |
| NF-03 | Search, Filter, story, event card and unit panels render at z85-95 under the opaque mobile root: invisible on phones, so the 24 vignettes and 137 events stay unseen unless the T0 pack re-hosts them. R. [`:98964`, `:99288`, `:103698-103705`; S mobile-03, app-bugs missed 3] | WP-T0-08, WP-UX-01/18, WP-ARCH-23/27; LAY.OCCLUDED |
| NF-04 | Five of 14 mobile Tools tiles are dead (Help, Bookmarks, Map Layers, Monuments, NPS Auto Tour); Walkthrough, Distance, Locations, Sound have no mobile entry. R. [S mobile-04, app-latent-09] | WP-T0-08, WP-UX-02, WP-ARCH-25/27; MSH-02 |
| NF-05 | `CanvasRenderer` is an undefined global: turning sound on freezes playback or blanks the app (owner wanted no audio: D-SOUND). [`:96556-96557` [V]; S app-bugs-03, app-latent-03] | WP-T0-06, WP-ARCH-33; UG-01 |
| NF-06 | Beyond C5: one throw in the Follow-Ancestor pick handler blanks the root (no boundary); `?ancestor=` has never worked cold; the gold-trail engine is absent from the bundle (1.2 row 9). R. [S app-latent-01, deploy-history-06] | WP-T0-06, WP-ARCH-24; UG-01, ANC |
| NF-07 | A dead monuments loop (ref-of-ref bug) throws 20 TypeErrors per frame and forces 45-59 React commits/s on an idle map (top JS self-time on mobile); it also breaks NPS Tour and Ancestor fly-to. R. [`:100330-100334`; S perf-runtime-02, app-latent-21] | WP-T0-06, WP-PERF-06, WP-ARCH-21; CON-IDLE |
| NF-08 | The map parses only `?ancestor=` (`:101019`), inside the Follow panel's mount effect; it writes `?t=&u=&z=&ll=` (`:97823-97832`) that nothing reads; nine link builders on 9+ pages emit `?tick=`, `?unit=`, `?vignette=`, `?lat=&lng=`: 521+ generated links and every "See it on the map" land on tick 1. The splash resets `currentTick`, so a minimal reader patch fails. [S app-bugs-05, pagesA-03, pagesB-01, pages-C-01, infra-netlify-26, ux-flows-01] | WP-T0-09, WP-UX-04, WP-ARCH-28, WP-PAGE-03, WP-PAGEC-03; DLK |
| NF-09 | Day 2/3 placements load only when playback crosses tick 200/420 or at mobile boot; jumps, keys 2/3, bookmarks, deep links and the first-run tour (ticks 267, 538) show forward-filled Day-1 positions; 217 of 478 units are missing from Follow Ancestor on a fresh load. This, not the camera, is D3's empty July 3. R. [`:96991-96992`; S app-bugs-06, app-latent-05, perf-cwv missed 3] | WP-T0-07, WP-PERF-09, WP-TIME-12, WP-ARCH-12; JMP-DATA |
| NF-10 | History-dependent data and renderer: 1,804 keyframes on 188 of 675 ticks; 1,116 of 1,209 transitions hold then snap; the module-global cache `i2` (`:96271`) is never cleared and is primed by the boot splash (a Day-1-only simulation draws 186 units at tick 1 against 70 with a row), so backward seeks show future units; the loader drops 127 rows; 117 duplicate (unit, tick) pairs (73 conflicting) resolve by load order. [S data-integrity-01, app-latent-08, app-bugs-07 and missed 1, app-time missed 4, prov-recon MISSED-4] | WP-T0-07 (O-T0-3), WP-DATA-10/11/12, WP-ARCH-14, WP-TIME-12; DV-28 |
| NF-11 | Cause of C7 and S1: icon-sprite `<symbol id>` collisions (1.2 row 7). R. [S pagesA-01] | WP-T0-11, WP-PAGE-01; SL-31 |
| NF-12 | One corrupt PNG is `og:image` on 21 pages and both manifest screenshots (IHDR RGB, RGBA-sized IDAT; `day1.png` = `day3.png`, md5 3f6646c9... [V]); icons are 22-24% transparent yet marked `maskable`. [S deploy-history-13 and missed 5, pages-C-02, infra-netlify-25] | WP-T0-14, WP-SEO-04, WP-INFRA-23, WP-DEC-09; SL-09/10 |
| NF-13 | All 137 Historian chronology answers print "undefined": `historian.html:113-125` reads `e.title`/`e.description`; the data key is `event` [V]; raw ids leak into prose; fixing it naively surfaces the C4 clock, so clock labels stay held. [S hist-current-01, ux-flows-19, pages-C-16] | WP-T0-12, WP-CONTENT-01, WP-HIST-01, WP-PAGEC-06; HC |
| NF-14 | Watch Together stored XSS: imported tour notes go through `row.innerHTML` (`watch-together.html:172`); guessable global room codes; PeerJS defaults to 0.peerjs.com, Google STUN and PeerJS TURN. [S pages-C-46/47, app-latent-16, infra-netlify-07] | WP-T0-12 (fix only), WP-PAGEC-15/16/35, WP-INFRA-28; XSS-WT |
| NF-21 | No error boundary; boot fetches unguarded (a `Promise.all` of 14 OOB fetches with no catch: one failure leaves every unit click blank; a day-1 failure hangs the splash); unguarded `localStorage` read in the root's first render. [`:96834-96838`, `:112962`; S app-latent-02/10, app-bugs-04] | WP-ARCH-20, WP-UX-22 (T0 boundary: AMD-T0-1); FLT-01..06 |
| NF-27 | Stale-code trap: the entry name carried 45 byte streams; `/assets/*` is `immutable`, `sw.js` is cache-first, stores error responses (`sw.js:41-50`, `:58-68`), precaches 2 of 5 hashed names and reloads every tab on any SW change; renaming only the entry blanks Help and Bookmarks (React #321); `/data/*` is `max-age=3600` under fixed names. [S deploy-history-01, mobile-19, app-time missed 1, app-latent-11] | WP-T0-03/04, WP-INFRA-22, WP-PERF-25, WP-QA-07; AI-02, R0-ACC |
| NF-35 | Mobile tap-select throws `Invalid LngLat object: (NaN, NaN)`: the `touchend` handler reads `touches[0]` (empty on touchend) and `preventDefault` suppresses the click fallback. R at 375x812 DPR 2. [`:102998-103008`, `:103076-103108`; S app-latent-06] | WP-T0-08, WP-UX-01; add gate |

### 2.2 High

| NF | Finding, evidence | Fixed by (WP; gate) |
|---|---|---|
| NF-16 | Search Console and Bing ownership lapsed (verification file 404, no DNS TXT): no baseline for any SEO change. [S seo-growth-01, deploy-history-12] | WP-SEO-01, WP-T0-14/17, WP-INFRA-20; SYN-06 |
| NF-17 | Privacy and Terms are materially wrong (1.2 row 23); five reports each draft their own rewrite with no counsel review. [S infra-netlify-36..38, pages-C-81..84, deploy-history-17] | WP-DEC-07/08, WP-INFRA-26/27, WP-CONTENT-24, WP-PAGEC-29; ORG-01 |
| NF-18 | No backups or continuity: 126 zips exist only on one PC, four folders hold `.env.local`; one public Gmail is contact and likely recovery identity; domain expires 2027-06-13; no delegate. [S prov-recon-02/08, critic-2] | WP-T0-01, WP-INFRA-01/06, WP-DEC-13; OPS-02/03 |
| NF-19 | Capacity: about 385-445 gross person-days across seven specialist roll-ups before de-duplication, for one solo owner. [S critic-2] | WP-DEC-14, D-SCOPE-TIERS; OPS-05 |
| NF-22 | Backgrounding the tab during playback makes the simulation leap ahead by hundreds of ticks (no dt clamp or `visibilitychange`). [S app-latent-18] | WP-T0-06, WP-ARCH-15, WP-QA-22; PLY-VIS |
| NF-23 | The unit canvas ignores `devicePixelRatio` (map 2880x1704, unit canvas 1440x852 at DPR 2) and the trails canvas is stuck at 300x150, so about 92% of trail segments draw off-canvas. [`:97260`, `:97274`; S app-latent missed 2-3] | WP-ARCH-18/21, WP-UX-20; VIS-CANVAS |
| NF-24 | The mobile map has no `maxBounds` (desktop has one, `:97240-97244`); once pan works users can leave the battlefield. [S app-latent missed 6] | WP-ARCH-16/27; MSH-04 |
| NF-25 | 10 Confederate regiments are keyed `U-` and render as Union (15AL, 44AL, 48AL, 4TX, 5TX, 1TX, 26NC, 11NC, 47NC, 52NC; the specialist's "15" wrongly included five real brigades); 95 of 478 placed ids (216 rows) have no OOB record (1.5); 28 ids denote two formations; side is inferred from the `U-` prefix at 19+ sites. [S app-latent-14, data-integrity-02, qa-ci-07] | WP-DATA-06/07, WP-ARCH-11, WP-QA-11; DV-03 |
| NF-26 | 103 artillery batteries are never loaded by Search, Regimental Biography, Battle Reports, Find Ancestor or the Historian (they fetch the 8 regiment files only). [S app-latent missed 1, docs-copy-08, pagesB-44] | WP-HIST-05, WP-DATA-20, WP-PAGE-21/24; SRC-BATTERY |
| NF-28 | Mapbox attribution is disabled on two deployed maps (`attributionControl:!1`, `:102988`, `:110777` [V]): a terms issue. [S prov-recon-09, app-design-24, infra-netlify-20] | WP-T0-06, WP-ARCH-16, WP-UX-21; ATTR-01 |
| NF-29 | The Report-Only CSP reports nowhere (`/api/csp-report` is 404), so every soak is blind; Deploy Previews inject Netlify's own script and Drawer frame, breaking "0 violations" gates. [S infra-netlify missed 1-2, app-latent-35] | WP-INFRA-15/16; CSP-COLLECT |
| NF-36 | Landscape and short viewports are unusable (map 141 px at 812x375; Tools sheet header off-screen); the first hotfix layout query sent 844x390 and 915x412 phones to the desktop layout and never re-evaluated on rotation. [S mobile-08, app-mobile missed 2] | WP-T0-08, WP-UX-02, WP-A11Y-21; add gate |
| NF-37 | `index.html:72-78` `.mapboxgl-map{height:100%!important}` makes the mobile map 812 px tall instead of 578 (centre 117 px off; Mapbox logo and attribution behind the dock). R. [S mobile-07] | WP-T0-08, WP-UX-01; add gate |
| NF-38 | Phones build two Mapbox maps per visit (one behind the chooser), eagerly fetch all three days (72 fetches) and, with the first-visit reload, open two billable map sessions. [S bundle-anatomy-12, perf-cwv-10, infra-netlify-21/22, mobile-15] | WP-T0-04/05, WP-PERF-08/11, WP-ARCH-16; BUD-req |
| NF-39 | Six divergent moment lists (Pickett's Charge is tick 538, 551 or 560 by entry point); 6 of 9 Turning-Points anchors land on another event; Day-1 ticks 101-225 (56% of Day 1) have no chronology event or vignette. [S ux-flows-05/26, pages-C-58] | WP-T0-09, WP-UX-05, WP-PAGEC-18, WP-TIME-05/22; needs a historian |
| NF-40 | Living Ledger starts at 4 casualties and overshoots the dataset by 838 (47,001 vs 46,163) and ignores the file's bell-curve model. [S pages-C-75/76] | WP-T0-12, WP-PAGEC-26/27; add gate |
| NF-41 | Casualty numbers have no authority: Union 22,803, 23,138, 23,049, 23,055 and Confederate 23,125, 23,025, 28,000, 23,231 across files; "51,000" (6 literals) adds a Union OR figure to a Confederate estimate; 22 of 22 Union divisions do not sum from children; VI Corps (36 regiments) has no brigade records. [S data-integrity-03/04, pagesA-11] | WP-DATA-07/08, WP-CONTENT-08, WP-PAGE-17, WP-PAGEC-26; reviewer |
| NF-42 | `terrain.json` disagrees with USGS 3DEP (mean 62 ft; 13 of 30 features off by more than 50 ft; the Big Round Top point is 365 m from the summit); place coordinates are hard-coded in six places and differ by up to 2.1 km. [S pagesB-36, app-bugs-38, data-integrity-13] | WP-PAGE-15, WP-DATA-14 |
| NF-44 | AR: iOS motion permission requested after two awaits (gesture loss is inference, high until iPhone-tested), relative alpha used as compass, declination ignored (about 490 ft of error), camera and GPS leaks, 22 of 30 labels stacked. [S pages-C-34..37, app-latent-15] | WP-PAGEC-12 (hide, noindex), WP-PAGEC-13/14 [Cond]; D-SCOPE-TIERS |
| NF-45 | Cinematic Export throws unhandled on Safari before 18.4; captions, badge and credit are not in the video; derived Mapbox imagery in video has no rights decision. [S pages-C-68/69, critic-2] | WP-PAGEC-24/25; D-MEDIA |
| NF-46 | Regimental Biography's join finds 1 of 467 regiments (444 empty timelines although 422 have brigade placements); Documentary shows 24 of 24 narratives as one paragraph; Dashboard widens the phone layout to 446 px, Compare to 528 px. [S pagesB-44/14, pagesA-10/26] | WP-PAGE-27/38, WP-PAGE-16/18/30 |
| NF-47 | The unit panel reads exact-tick rows only, so disposition, strength bar and notes are absent for about 97% of (unit, tick) pairs. [`:97909-97911`; S app-bugs missed 2] | WP-ARCH-14/23, WP-DATA-10; add gate |
| NF-53 | No named historical reviewer or second reader: C4, H10, data consistency and the Historian's phase P4 cannot be certified by the owner or the toolchain. [S critic-1, time-facts-05] | WP-DEC-10/11, WP-TIME-04, WP-DATA-23, WP-HIST-35 |
| NF-54 | Rights exposure already live: Busey and Martin-derived numbers; 18 shipped monument coordinates from Stone Sentinels (8), HMDB (4), Wikipedia (6); strings citing a paid app's YouTube vignette; derived Mapbox imagery. [S hist-sources-1-04, hist-sources-2-15; ch13 [V]] | WP-DATA-04/05, WP-HIST-02, WP-DEC-08; D-LICENSE |

### 2.3 Medium and low

| NF | Finding | Fixed by (WP; gate) |
|---|---|---|
| NF-15 | Nine tick-to-clock implementations; the error is piecewise (1.2 row 10). | WP-TIME-02..10; TM-V1..21 |
| NF-20 | Esc leaves `pinnedUnitId` (1.2 row 11). | WP-T0-06, WP-UX-18; KBD-ESC |
| NF-30 | GPU context loss is unhandled (no `webglcontextlost`); up to 3 Mapbox instances plus a full-viewport canvas coexist. [S critic-2] | WP-ARCH-16/20, WP-QA-08; FLT-GPU |
| NF-31 | In-app browsers: storage does not persist to the default browser, no service worker, no Web Share or MediaRecorder, sensors blocked. [S critic-2] | WP-INFRA-31, WP-QA-21; IAB-01 |
| NF-32 | Long sessions, projectors and kiosks are untested. [S critic-2] | WP-QA-22; SOK |
| NF-33 | The global keydown switches on `key`, not `code`: AZERTY digit keys never fire day jumps and IME composition can trigger shortcuts (`:112966-112993`). [S critic-2] | WP-A11Y-08; KBD-CODE |
| NF-34 | Browser-injected transformations: auto-translate (React `removeChild` crash class, not reproduced), forced dark, content blockers vs "zero console errors". [S critic-2; D-LANG] | WP-INFRA-31, WP-QA-21; HOST-01..03 |
| NF-43 | Immersive: Pause leaves the drone running; volume slider exists but no mute button, limiter or warning (simulated peaks -26 to -12 dBFS, no clipping: severity lowered by the verifier); cannon is eligible in 662 of 675 ticks including all 135 night ticks, contradicting its copy. [S pages-C-24/26/27] | WP-PAGEC-09, WP-T0-12; D-SOUND |
| NF-48 | Stale toasts replay after a paused seek; commander toasts are dead; the desktop toolbar prints the date twice (`:113084-113088`). [S app-time-08 and missed 5, app-bugs-10] | WP-TIME-12/17, WP-ARCH-23 |
| NF-49 | Help renders behind OOB and Roster (z600 vs 800-900); 27 z-index levels up to 999999. [S app-design, app-a11y-05] | WP-UX-18, WP-A11Y-06 |
| NF-50 | Schools: web filters may block an uncategorised 3.5-month-old domain and WebRTC; the Historian's default (quote period racial language) is unsafe for under-18 Classroom mode. [S critic-2] | WP-INFRA-30, WP-CONTENT-25; D-SCHOOLS |
| NF-51 | Dev and hidden pages are live (`/diagnostics`, `/unit-rendering-reference`); old permalinks and the `netlify.app` host serve the whole site (1.2 row 2). [S infra-netlify-12, seo-growth-03] | WP-T0-12/15, WP-SEO-03, WP-PAGEC-34 |
| NF-52 | Interaction hot spots: Roster open +4,989 DOM nodes (680 ms), "Select Mobile" INP 584 ms, boot "Skip intro" 984 ms; INP itself is unmeasured. [S perf-runtime-09, perf-cwv missed 1] | WP-PERF-08/15/17 |

## 3. Traceability appendix: which chapter WPs close each of the 57 audit ids

### 3.1 Method

`plan-work/tmp-annex/audit_trace.py` reads the 15 chapter files in `plan-work/FINAL/`, finds every WP (430 in chapters 02-14, 17 decision packages in chapter 01) and extracts the audit ids each WP declares in its own audit field: the "Moves" column and the "Findings and audit ids per WP" list in chapter 02; the audit column of the WP table in chapters 04, 06, 08a, 08b, 12, 13 and 14; the `Audit:` line or the covers list of the spec in chapters 03, 05, 07, 10 and 11. Loose mentions inside a WP block are kept apart because letters collide (section 6, item 3). Result: 57 of 57 ids are declared by at least one WP; none is unmentioned. "Decl." is the number of WPs that declare the id (full lists in `tmp-annex/trace_report.txt`). "Primary closing WPs" is my selection from those lists, validated against the chapters; `(c)` marks a WP that does not declare the id in its own field (chapter 09 has no audit field; chapter 01 packages declare none). Status is chapter 02 section 10: 12 closed by Tranche 0 trains, 4 substantially closed, 23 partial, 18 open until the rebuild, a decision or an owner action.

### 3.2 Primary closing WPs (trains and dates: chapter 02 and the register)

| ID | Audit item | Status (ch02 s10); when, how | Primary closing WPs | Decl. |
|---|---|---|---|---|
| C1 | Mobile transport row off-screen at 375 px | closed; R1b 2026-10-27 after device check; rebuild | WP-T0-08, WP-UX-01, WP-UX-14, WP-ARCH-27 | 12 |
| C2 | Mobile Tools sheet rows covered by timeline bar | closed; R1b; rebuild | WP-T0-08, WP-UX-01, WP-UX-02, WP-ARCH-27 | 11 |
| C3 | Date +2 days (header, ancestor panel) | closed; R1c 2026-11-03 (+2 only); clock in TIME | WP-T0-07, WP-TIME-01, WP-TIME-02, WP-TIME-10 | 13 |
| C4 | Clock vs history vs own narrative | open; TIME programme; needs named historian and D-TIME sign-off (DG-3); not in T0 | WP-TIME-02, WP-TIME-03, WP-TIME-05, WP-TIME-07, WP-TIME-10, WP-TIME-04, WP-DEC-11 (c) | 43 |
| C5 | setGoldUnit ReferenceError in production | closed; R1a 2026-10-20 | WP-T0-06, WP-ARCH-24, WP-QA-02 | 6 |
| C6 | First-visit SW reload (double load) | closed; R0 2026-10-13 | WP-T0-04, WP-T0-05 (c), WP-PERF-05, WP-INFRA-22 (c), WP-QA-07 | 13 |
| C7 | Dashboard raw key, undefined, dev note, empty chart | closed; R1a | WP-T0-11, WP-T0-12, WP-PAGE-01, WP-PAGE-16, WP-PAGE-17 | 14 |
| C8 | Search filter chips contrast 1.10:1 | closed; R1a | WP-T0-11, WP-PAGE-02, WP-UX-06 | 9 |
| H1 | Floating Ask/Extra Features overlay collides | partial; R1b hides on mobile; overlay deleted at rebuild | WP-T0-08, WP-UX-15, WP-A11Y-09 | 11 |
| H2 | Esc ignored in search; does not close panels | substantial; R1a key guard; LayerStack at rebuild | WP-T0-06, WP-UX-18, WP-A11Y-06, WP-A11Y-08 | 13 |
| H3 | Layout choice not persisted; long splash; no mobile auto-detect | substantial; R0 intro removal, R1b auto-detect; rebuild removes chooser and onboarding | WP-T0-05, WP-T0-08, WP-PERF-07, WP-UX-03, WP-UX-16 | 22 |
| H4 | Load/jump clutter; toasts | partial; T0 clears the data cause (R1c); rebuild rules P1-P8 | WP-UX-18, WP-A11Y-11, WP-TIME-12 | 15 |
| H5 | Follow-Ancestor list sorts as text | open; rebuild only | WP-ARCH-24, WP-UX-19, WP-PAGEC-23 | 10 |
| H6 | Toolbar iconography inconsistent, small | open; rebuild (icon system) | WP-UX-09, WP-UX-12, WP-UX-02 | 11 |
| H7 | Dev-log copy in user-facing text | partial; R1a/R1c subset; content WPs | WP-T0-12, WP-T0-16, WP-CONTENT-01, WP-CONTENT-02, WP-CONTENT-03 | 27 |
| H8 | Overpromising names (Historian is keyword search) | partial; R1a Historian "undefined"; expansion P0-P4 | WP-T0-12, WP-CONTENT-01, WP-HIST-01, WP-HIST-08, WP-PAGEC-06 | 31 |
| H9 | "1x (real time)" label wrong | substantial; label held; full with D-TIME | WP-TIME-11, WP-TIME-16, WP-CONTENT-09 | 20 |
| H10 | Count inconsistency 467 vs 445+ | partial; counts subset in R1c; facts.json | WP-CONTENT-04, WP-DATA-19, WP-PAGE-09, WP-T0-16 | 29 |
| H11 | Minimap label stale | closed; R1c | WP-T0-07, WP-ARCH-21, WP-PERF-13 | 9 |
| H12 | Distance tool one marker, no line | open; rebuild only; root cause unproven | WP-ARCH-25, WP-QA-10 | 4 |
| H13 | Soldier's Eye to Google Maps; Street View caption | open; rebuild; verify first | WP-ARCH-25, WP-ARCH-26, WP-UX-31, WP-CONTENT-10 | 8 |
| D1 | Help modal 1-2 s late, no loading state | open; rebuild (skeleton, prefetch) | WP-UX-18, WP-PERF-12, WP-PERF-15 | 8 |
| D2 | 9-11 px type, tiny targets, unlabeled slider, no landmarks | partial; R1b bridge; rebuild design system | WP-T0-10, WP-A11Y-05, WP-A11Y-07, WP-UX-08, WP-UX-12 | 27 |
| D3 | Label collisions; no auto-fly after day jump | partial; R1c day data; auto-fly at rebuild | WP-T0-07, WP-PERF-09, WP-TIME-12, WP-UX-18 (c) | 20 |
| D4 | No discoverable Order of Battle on desktop | open; rebuild; guide claim by copy | WP-ARCH-24, WP-UX-15, WP-CONTENT-10 | 7 |
| S1 | Battle Reports/Regimental Biography lone search box | partial; R1a | WP-T0-11, WP-T0-12, WP-PAGE-01, WP-PAGE-23 | 11 |
| S2 | Ground Remembers map blank ~3 s | partial; R1a (non-blocking Mapbox) | WP-T0-13, WP-PAGE-10, WP-PAGE-46, WP-PERF-19 | 10 |
| S3 | Camera/Viewshed canvas painted incompletely | open; hardening plus real-device check; unreproduced | WP-PAGE-36, WP-QA-21 | 9 |
| S4 | Mobile sub-pages: Dashboard chart, Compare tabs, targets | partial; R1a partial; page WPs | WP-T0-11, WP-T0-12, WP-PAGE-02, WP-PAGE-16, WP-PAGE-18, WP-PAGE-30 | 28 |
| P1 | RUM Poor (LCP, INP, CLS, FCP), spikes | substantial; R0/R1; official green 30 days after last deploy | WP-PERF-05, WP-PERF-06, WP-PERF-07, WP-PERF-08, WP-PERF-03, WP-PERF-04 | 32 |
| P2 | 2.28 MB bundle, 52% unused, boot time | open; rebuild (split, lazy map) | WP-PERF-11, WP-PERF-12, WP-ARCH-10, WP-ARCH-16 | 17 |
| P3 | ~30 JSON fetches on load | open; stage 1 R1; stage 2 rebuild | WP-PERF-09, WP-PERF-08, WP-ARCH-11 | 13 |
| P4 | Render-blocking site-nav.js/css | partial; R0/R1a | WP-T0-05, WP-T0-13, WP-PERF-05, WP-PERF-19 | 14 |
| P5 | "preload not used" / SW mismatch warnings | closed; R0 | WP-T0-04, WP-T0-05, WP-PERF-05 | 10 |
| P6 | No source maps | open; decision D-CSP (source maps); rebuild | WP-INFRA-18 (c), WP-PERF-12, WP-ARCH-31, WP-QA-06 | 5 |
| P7 | Lighthouse failing audits | partial; measurement and gates | WP-PERF-01, WP-PERF-02, WP-QA-06 | 7 |
| T1 | Only ~8% of referrals from search | partial; outcome KPI; baseline first | WP-SEO-01, WP-SEO-02, WP-SEO-04, WP-SEO-05 (c), WP-SEO-10 | 44 |
| T2 | ~18% of views likely bots; scanner 404s | open; policy: measure, do not block | WP-INFRA-29 (c), WP-SEO-02, WP-PERF-03, WP-QA-17 | 9 |
| T3 | Duplicate URL forms | partial; R0/R1c; S1 train | WP-SEO-05, WP-SEO-03, WP-INFRA-12 (c), WP-T0-15 | 13 |
| E1 | Manifest orientation landscape | closed; R1a manifest; S2 identity | WP-T0-14, WP-SEO-07, WP-INFRA-23 (c), WP-UX-28 | 13 |
| E2 | Name mismatch (Animated Battlefield Map / interactive) | open; S2 train (D-NAME) | WP-SEO-08, WP-CONTENT-07 | 10 |
| E3 | Three h1 elements in home HTML | closed; R1b a11y shim; landing at S3 | WP-T0-10 (c), WP-A11Y-01, WP-A11Y-09, WP-SEO-10 | 9 |
| E4 | Crawler-only #seo-content block | open; S3 train (landing) | WP-SEO-10, WP-SEO-11 | 11 |
| E5 | Sitemap 20 URLs, no privacy/terms | open; S1 train; generator | WP-SEO-06, WP-SEO-05, WP-INFRA-12 (c), WP-QA-03 | 11 |
| X1 | Mapbox token looks unrestricted | open; owner verification; contract test | WP-DEC-15 (c), WP-INFRA-03 (c), WP-T0-17, WP-QA-15 | 11 |
| X2 | Google Maps key restriction unknown | open; owner verification | WP-DEC-15 (c), WP-INFRA-04 (c), WP-T0-17 | 6 |
| X3 | CSP Report-Only, unsafe-inline, RUM host missing | partial; R1c host list; CSP stages after | WP-INFRA-15 (c), WP-INFRA-16 (c), WP-INFRA-17 (c), WP-T0-15, WP-PAGEC-04 | 15 |
| X4 | embed.html headers; guide PDF; diagnostics | closed; R1a dev pages, R1c embed headers | WP-T0-15, WP-T0-12, WP-INFRA-14 (c), WP-INFRA-13 (c), WP-PAGEC-31, WP-PAGEC-34 | 14 |
| X5 | Privacy omits PeerJS, Mapbox telemetry, AR | partial; interim R1c; counsel | WP-DEC-07 (c), WP-DEC-08 (c), WP-INFRA-26 (c), WP-INFRA-27 (c), WP-PAGEC-29, WP-CONTENT-24 | 17 |
| G1 | User-guide PDF defects | open; R2 | WP-CONTENT-10, WP-CONTENT-11 | 21 |
| A1 | Colour-contrast failures | partial; R1b bridge; tokens | WP-T0-10, WP-T0-11, WP-A11Y-04, WP-UX-07, WP-UX-11 | 23 |
| A2 | Unlabeled slider | partial; R1b bridge | WP-T0-10, WP-A11Y-10, WP-A11Y-07 (c) | 19 |
| A3 | Tiny targets | partial; R1b bridge | WP-T0-08, WP-T0-10, WP-A11Y-05, WP-UX-02 | 24 |
| A4 | 9-11 px fonts | partial; R1b bridge (12 px floor) | WP-T0-10, WP-A11Y-05, WP-UX-08 | 19 |
| A5 | Unlabeled close buttons | partial; R1b bridge | WP-T0-10, WP-A11Y-07, WP-UX-09 | 11 |
| A6 | Modal focus, landmarks, reduced motion | partial; R1b bridge; primitives at rebuild | WP-T0-10, WP-A11Y-06, WP-A11Y-09, WP-UX-18 | 31 |
| N1 | No editable source; case-mangled zip | partial; 0.0 safety net; strangler rebuild | WP-T0-01, WP-T0-03, WP-ARCH-01, WP-ARCH-02, WP-ARCH-30, WP-ARCH-32 | 33 |

### 3.3 Declarations per chapter

| Chapter | WPs | WPs declaring an audit id | Audit ids declared (distinct) |
|---|---|---|---|
| 02 T0 | 19 | 19 | 42 |
| 03 ARCH | 34 | 30 | 40 |
| 04 TIME | 23 | 22 | 15 |
| 05 PERF | 28 | 25 | 27 |
| 06 UX | 34 | 33 | 44 |
| 07 A11Y | 33 | 24 | 29 |
| 08a PAGE | 47 | 40 | 33 |
| 08b PAGEC | 35 | 33 | 30 |
| 09 INFRA | 34 | 0 | 0 |
| 10 SEO | 31 | 29 | 21 |
| 11 CONTENT | 27 | 22 | 23 |
| 12 QA | 25 | 24 | 54 |
| 13 DATA | 24 | 24 | 19 |
| 14 HIST | 36 | 10 | 17 |

## 4. Specialist findings that were not confirmed

44 of 852 findings (5.2%) were not confirmed: 1 REFUTED, 25 UNVERIFIABLE, 18 NOT_VERIFIED. Rule used by every chapter and adopted here: a REFUTED finding is dropped; UNVERIFIABLE and NOT_VERIFIED findings are verify-first items, not defects and not work. No WP that depends on one should be scheduled before its check has run, and none of them blocks R0 or R1. "Handled by" lists the WPs whose covers list cites the id (`tmp-annex/unv_lookup.py`; `TIME:09` means WP-TIME-09); "topic only" means the id is not cited but the topic is.

**REFUTED (dropped)**

| Finding | Topic and what to know | Handled by |
|---|---|---|
| time-facts-15 | **Option B: resample placements to a uniform 5-minute grid.** Premise false: "430k placement records" is bad metadata in `placement_schema.json`; the data has 1,804 rows on 188 ticks, so re-keying is S-M not XL, and July 1 05:00 to July 4 00:00 is 804 ticks, not about 840. Supports D-TIME (ticks stay permanent); the false schema text is fixed by WP-TIME-06. | TIME:09 |

**UNVERIFIABLE, design or process proposal with nothing to test (18)**

| Finding | Topic and what to know | Handled by |
|---|---|---|
| app-bugs-37 | **Test harness and `?debug=1` hook.** Proposal only; its one factual claim (no window hook) is true. | topic only |
| app-latent-36 | **Observability pipeline.** Design only; gated by D-TELEMETRY and D-LEGAL step 1. | ARCH:20; QA:17 |
| app-latent-43 | **Prevention infrastructure (recover source, lint, Playwright).** Premise consistent with N1; realised as the T0 harness and rebuild gates. | T0:18; ARCH:20; QA:08 |
| hist-current-27 | **Privacy-safe feedback and query logging.** Design only; chapter 14: no Historian telemetry in Stage A. | HIST:34 |
| hist-sources-1-13 | **OCR quality gates and re-OCR.** Data points confirmed; the OCR proxy vocabulary was not reproduced. Measure each source first. | HIST:04 |
| hist-sources-1-16 | **100-passage source audit and 25-question gold set.** Design; evidence real; becomes the Golden-Passage set. | HIST:07,19 |
| infra-netlify-32 | **Bot handling and first-party vitals.** RUM script facts verified; the human share of traffic is unknown. | T0:19; PERF:01,03; INFRA:15,29; SEO:02,13; QA:17 |
| infra-netlify-39 | **Account, secret and supply-chain security.** Not observable from outside; owner-executed checklist. | T0:01,17; INFRA:01,05,21; QA:18 |
| pagesA-15 | **Dashboard feature completions.** Proposal; A+ only. | PAGE:19 |
| pagesA-30 | **Compare feature completions.** Proposal; A+ only. | PAGE:33 |
| pagesB-23 | **Students classroom kit.** Proposal; Tier 2. | UX:30; PAGE:41; CONTENT:22,23 |
| pagesB-33 | **Sandbox feature completions.** Default disposition is retire (D-SCOPE-TIERS). | PAGE:43 |
| pagesB-38 | **Real viewshed UX spec.** Optional Labs, default off. | A11Y:27; PAGE:45 |
| perf-runtime-33 | **Historian scale budgets.** Arithmetic correct; budgets are targets, not measurements. | PERF:17,23 |
| seo-growth-28 | **Keyword and intent map.** Method only; no volume data exists, so traffic targets are planning bands re-based at day 30. | SEO:27 |
| seo-growth-37 | **Monitoring and SEO CI routines.** Design; nothing to test. | SEO:30 |
| ux-flows-22 | **Research programme (card sort, tree test, moderated rounds).** No users were observed, so usability numbers are predictions from code. | UX:33; A11Y:30,32; CONTENT:27; QA:24 |
| ux-flows-27 | **UX release-gate checklist.** Process item; reasonable. | UX:33 |

**UNVERIFIABLE, needs a browser or device (5)**

| Finding | Topic and what to know | Handled by |
|---|---|---|
| app-a11y-20 | **Reflow, zoom, landscape thresholds.** Structure verified; overlap widths are estimates (collision below about 1,470 px): run the sweep first. | UX:14; A11Y:21 |
| pagesB-16 | **Documentary mobile nav overflow.** Arithmetic confirmed; wrapping needs a browser. | A11Y:27; PAGE:38 |
| pagesB-31 | **Sandbox fragile first render.** Speculative; harmless to harden. | PAGE:43 |
| pagesB-32 | **Sandbox mobile layout and a11y.** Plausible; needs 320 and 375 browsers. | A11Y:28; PAGE:43 |
| perf-runtime-36 | **Boot long-task profile.** CPU profile not re-run; needed before budgets are locked. | PERF:12 |

**UNVERIFIABLE, unproven theory or opaque source (2)**

| Finding | Topic and what to know | Handled by |
|---|---|---|
| deploy-history-31 | **Street View pano ids and iframe re-key.** Stops 3 and 5 lack pano ids (verified); the re-key theory is unproven. | ARCH:25,26 |
| deploy-history-33 | **Per-deploy baselines and RUM annotation.** The grey RUM bands and the 30-day headline are opaque; process advice sound. | ARCH:31; PERF:01,04; INFRA:02 |

**NOT_VERIFIED (18: 17 from pages-C, 1 from app-latent)**

| Finding | Topic | Handled by |
|---|---|---|
| pages-C-21 | Historian conversation features | PAGEC:08 |
| pages-C-25 | Immersive volume control | PAGEC:09 |
| pages-C-30 | Immersive reduced motion, captions, a11y | A11Y:28; PAGEC:09 |
| pages-C-32 | Immersive start-up gated behind all data | PERF:19; PAGEC:11 |
| pages-C-33 | Immersive controls (loop wrap, scrubber) | PAGEC:11 |
| pages-C-40 | AR disclaimer voice and safety notice | PAGEC:12 |
| pages-C-41 | AR permission education and status | PAGEC:14 |
| pages-C-42 | AR battery, wake lock, layout | PAGEC:14 |
| pages-C-43 | AR non-visual alternative | A11Y:28; PAGEC:14 |
| pages-C-61 | Turning Points accordion semantics | A11Y:27; PAGEC:19 |
| pages-C-62 | Turning Points feature completion | PAGEC:21 |
| pages-C-67 | Find Ancestor a11y, mobile, URL state | A11Y:12,27; PAGEC:23 |
| pages-C-73 | Cinematic Export geometry and presets | PAGEC:25 |
| pages-C-74 | Cinematic Export a11y and mobile | A11Y:28; PAGEC:24,25 |
| pages-C-79 | Living Ledger a11y and reduced motion | A11Y:27; PAGEC:28 |
| pages-C-80 | Living Ledger 10 ms timer loop | PAGEC:28 |
| pages-C-84 | **Terms missing clauses (NPS independence, AR safety, user content, liability, takedown).** Legal wording: needs counsel (D-LEGAL), not a browser. | PAGEC:29; INFRA:27; CONTENT:16,24 |
| app-latent-42 | **Touch and cursor indicators re-render per pointer event.** Minor. | PERF:06 |

None of the NOT_VERIFIED findings was run in a browser or on a device; all but pages-C-84 (legal wording) and app-latent-42 (minor) concern Labs or optional pages.

**What the owner should take from this list.** (1) Only one finding was refuted outright, and it supports the plan (D-TIME keeps ticks as permanent frame ids); the false "430,000+ records" text in `placement_schema.json` is still live and is fixed by WP-TIME-06. (2) 17 of the 18 NOT_VERIFIED findings are Labs pages whose default disposition is hide or retire (D-SCOPE-TIERS), so their verification can be deferred with the page; the two that matter whatever the disposition are pages-C-84 (Terms clauses need counsel) and pages-C-21 (the Historian is Tier 1). (3) The 18 design proposals cannot be "verified"; they are decisions for the infra, QA and Historian chapters, several gated by D-TELEMETRY and D-LEGAL. (4) The 5 browser or device items belong to the real-device programme (WP-QA-21, WP-DEC-16), which needs hardware the owner has not yet supplied (a mid-range Android, an iPhone SE, a Chromebook).

**Verifier corrections that would have broken fixes as first written** (already incorporated in the WPs; do not re-introduce them from a specialist report): renaming only the entry bundle blanks Help and Bookmarks, whose chunks import it by name; `defer` on the CDN Mapbox script breaks all 8 product map pages; the boot-loader `.catch(location.reload)` can loop forever; a pointer-transparent overlay canvas breaks the Distance tool and unit hiding unless `_gbDist` and the Toggle Units gate are rewired; the first mobile hotfix pack sent 844x390 and 915x412 phones to the desktop layout; an enforcing CSP as first drafted omitted `cdn.jsdelivr.net` and the NPS frame; a clock string such as "July 1, 1863, 7:30 AM" would render "1863" on the mobile clock (`:102977`); "Netlify Split Testing is unavailable to new projects since 2026-08-26" comes from one verifier and is unverified.

## 5. Coverage checks and verification debt

### 5.1 Checks run

- **Audit ids to WPs:** 57 of 57 ids are declared by at least one WP in chapters 02-14 (min 4, max 44 declaring WPs per id); 0 ids are unmentioned anywhere in chapters 01-14 (declared or loose). Thinnest declared coverage: H12 (4), P6 (5), C5 (6), X2 (6), D4 (7), P7 (7), D1 (8), H13 (8). None of the thin ones is unowned: H12 and H13 are rebuild-only by design, P6 and X2 are decisions or owner actions.
- **WPs that declare audit ids:** 335 of 430 WPs in chapters 02-14 declare at least one audit id in their own field; the rest (95) declare none: ARCH 4, TIME 1, PERF 3, UX 1, A11Y 9, PAGE 7, PAGEC 2, INFRA 34, SEO 2, CONTENT 5, QA 1, HIST 26. Chapter 09 (infra) has no audit-id field at all, so its WPs are attributed by content: of 223 primary closers in 3.2, 25 do not declare the id in their own field (marked (c)); 18 of those mention it inside the WP block and 7 are attributed by content alone (for example WP-DEC-07 and WP-DEC-08 for X5).
- **Gate index (chapter 12 Appendix A):** lists 57 of 57 audit ids and 34 NF ids (NF-01..NF-34); section 2 adds NF-35 and later.
- **Specialist findings to WPs:** 831 of 852 finding ids (97.5%) are cited by id in at least one WP block; 21 are not (5.2). The lookup handles the abbreviations and list forms the chapters use (`bugs-01/02`, `pC-01, 05`, `-28`); it can under-count citations written in prose, which is why 5.2 checks each by topic.

### 5.2 Specialist findings not cited by id in any WP block (21 of 852)

Not necessarily gaps: chapters often cover a topic under a sibling id. Checked by topic; one is a real (low) gap.

- **covered by topic under a sibling id (16):** app-bugs-21 (WP-UX-18 jump hygiene, fly to the action); app-bugs-37 (WP-QA-04 hooks contract, WP-A11Y-18); app-latent-15 (WP-PAGEC-12/13/14 via pages-C-34..37); app-latent-16 (WP-PAGEC-15, WP-T0-12, WP-INFRA-28 via pages-C-46); app-latent-22 (WP-PAGEC-02, WP-PAGE-08); app-latent-25 (WP-PAGEC-24 via pages-C-68); app-latent-31 (WP-PAGE-20/21/23); app-latent-35 (WP-INFRA-16/17/18, WP-PAGEC-04, WP-PAGE-12); app-latent-38 (WP-PAGEC-28, WP-PAGEC-26); deploy-history-29 (WP-CONTENT-01/02); deploy-history-32 (audit ids H2, H3, H5, H9, H11 in section 3); hist-current-05 (WP-HIST-08); hist-current-07 (WP-HIST-10); hist-current-14 (WP-PAGE-21); hist-current-30 (WP-PERF-23); ux-flows-09 (WP-UX-19, WP-PAGE-24, WP-PAGEC-22/23).
- **partly covered (1):** perf-runtime-38 (WP-T0-08 setMapRef fix, WP-ARCH-16/20).
- **not a WP item (3):** hist-sources-2-27 (re-check task; belongs in WP-DEC-16); prov-recon-18 (a "do not port" note; nothing to do); prov-recon-41 (effort roll-up; superseded by WP-DEC-14).
- **GAP (1):** app-latent-41 (48 `value && <jsx>` zero-render sites; only the generic ESLint criterion E-04 in chapter 03).

### 5.3 Audit ids whose closure is not just a code change

- **Owner or console action:** X1, X2 (WP-T0-17, WP-DEC-15), T1 (WP-SEO-01), E2 (D-NAME, train S2).
- **A named historian:** C4, H9 wording, H10 headline figures (D-HIST-REVIEW, D-TIME at DG-3; NF-53).
- **Counsel:** X5 and the Terms clauses (WP-DEC-08).
- **Device evidence before shipping:** C1, C2 (device check before R1b), S3, H13, and every mobile grade.
- **A 30-day window:** P1 (official RUM green earliest 2026-12-03 after a 2026-11-03 last deploy), T1 outcomes (90 days).
- **No Tranche 0 fix, closed only at the rebuild cutover:** H5, H6, H12, H13, D1, D4, S3 hardening, D3 auto-fly, P2, P3 stage 2, P6, E2, E4, E5, G1 (chapter 02 section 10). Until then they stay open by design.

### 5.4 Verification debt specific to this annex (verify first, in this order)

1. **Headed real-mouse test of NF-01** on the live site (drag, wheel, zoom control; register action 12a; about 10 minutes). It sets the desktop core-function grade (D+ or C-) and confirms or lowers NF-01's rank against C1.
2. **Real devices** (iPhone SE, a mid-range Android, Samsung Internet) for every mobile grade and for NF-02, NF-03, NF-35, NF-36, NF-37; all mobile evidence is headless Chrome with emulated touch.
3. **One screen-reader pass** (NVDA plus VoiceOver) for the accessibility grade and NF-01's keyboard alternative.
4. **The placed-id definition** (87, 95 or 100 ids without an OOB record): DV-03 must state its rule (WP-QA-11); chapter 13's 95 is the best supported.
5. **The one Mapbox probe that returned 200** for a foreign Referer on an unspecified endpoint (X1): re-probe every endpoint family (WP-DEC-15).
6. **The corrected grades themselves** are judgments; re-grade from the machine scorecard after its first two weekly runs.
7. **iOS-only behaviours** (AR gesture chain, canvas memory, Safari MediaRecorder) remain inference.

## 6. Decision conflicts and cross-chapter inconsistencies

I found no conflict between this annex and `01-decision-register.md`; the register's section 8 ("Facts the ADRs rely on") agrees with section 1.2. Other chapters do deviate from the register in places, each recorded in its own decision-conflict section (chapter 11 DC-1 home title, chapter 13 s.9 items 1-6, chapter 14 H.2, chapter 15 s.13, chapter 10 s.9). Inconsistencies between chapters, for the master schedule:

1. **Two baselines.** Chapter 02 section 10 grades the "verified baseline" at overall C+/D+ (concept A/A-, data C-, SEO A-, privacy C+, core function C/D-); section 1.4 grades C (mean 2.08) desktop and D (mean 1.53, capped at D by the F on core function) mobile and lowers data (D), SEO (B), security (B-), privacy (D+), fit and finish and core function, for the reasons in its last column. Treat chapter 02's table as the T0 forecast and section 1.4 as the baseline of record until the scorecard exists (O-16-1).
2. **Unresolved placed ids:** 87 (chapter 12, DV-03), 95 (chapter 13) and 100 (app-latent; my record-type recount) differ only in what counts as defined; name the rule in WP-QA-11.
3. **Colliding tokens.** Audit ids S1-S4, T1-T3, P1-P7, E1-E5 and D1-D4 collide with SEO trains S1-S4 (chapter 10), tiers (T0-T6 in chapter 12, T1-T3 elsewhere), Historian phases P0-P5 (chapter 14), copy-table rows E1-E20 (chapter 11) and register ids `D-*`. A grep attributes them wrongly; the traceability generator therefore reads only each chapter's audit field. Recommend that every chapter cite audit ids only in an `Audit:` field or column and write "audit S3" in prose; chapter 09 has no such field (its coverage is attributed by content, section 3.1).
4. **Unit counts.** Register 570 records (467 + 103); chapter 13 569 distinct units (465 regiments + 104 batteries); chapter 14 a 570-unit crosswalk. They agree once record and distinct unit are named separately; `facts.json` should carry both. Review 3 found chapters 10, 11 (Appendix A row 11, Appendix C) and 14 still writing 466 regiments + 103 batteries (chapter 08a's `unit_counts` text too); chapters 10, 11 and 14 now use 465 + 104 (re-verified: `C-McClanahan-ART` is a horse-artillery battery inside `confederate_cavalry.json`), and 08a still needs the one-line fix.
5. **NF ids.** Chapter 12 Appendix A indexes NF-01..NF-34 only; NF-35..NF-54 are additions here; WP-QA-23 should ingest them (O-16-2).

6. **Dates in this annex.** The train dates quoted in 1.2 and 3.2 (R0 2026-10-13, R1a 10-20, R1b 10-27, R1c 11-03; "earliest 2026-12-03" for RUM green) are chapter 02's plan dates. Chapter 15 section 5.1 shows R0 itself shipping 2026-11-10 (30 h/week), 2026-12-15 (15 h/week) or 2027-01-19 (10 h/week), so every "closed by R1x on date" status here means "closed by that tranche", not "on that date"; the RUM-green floor moves to 30 days after the last performance deploy.
7. **Cross-chapter items settled by review 3 (chapters 10-15).** OG image in R1a and tag parity in S1; `/teach` (teachers) and `/learn` (students); `/sources` plus `/method` as one authoring package, `/data-notes` a 301 into `/corrections#data-versions`; casualty headline per chapter 13 Q-DATA-2; takedown SLA 24 h; home title without "five-minute steps" (chapter 11 DC-1); one generator `scripts/gen-netlify-config.mjs`; robots barring training crawlers from `/hx/`. Each is recorded in the "Decision conflicts" section of the chapter that owns it.
8. **Audit ids in prose.** Chapter 12 uses "S3" for the Camera-canvas audit id next to train S3; it is now written "Audit S3" there (item 3 above already recommends this everywhere).

## 7. Owner decisions (defaults apply unless overridden in writing)

| # | Decision | Default | By |
|---|---|---|---|
| O-16-1 | Adopt the section 1.4 grades as the baseline of record for scoring, replacing the audit's and chapter 02's baseline | yes | DG-0 (2026-10-07) |
| O-16-2 | Add NF-35..NF-54 to the gate catalogue and traceability generator (WP-QA-23) | yes | DG-0 |
| O-16-3 | Run the 10-minute headed real-mouse test on the live site this week and report the result (register action 12a) | do it now | 2026-10-07 |
| O-16-4 | Withdraw the audit's "Works" list, "SEO 100" and "Lighthouse 90 accessibility" as public or planning claims | yes | DG-0 |

## 8. Reproduce

`plan-work/tmp-annex/audit_trace.py` re-extracts the audit-id table from the chapter files (writes `trace.json`, `trace_report.txt`); `find_wps.py <finding-id>` finds the WPs covering a specialist finding; `unv_lookup.py` and `all_findings_cov.py` feed sections 4 and 5.2; `build_annex.py` assembles this file from `part_a.md`, `part_b.md`, `part_d.md` and `annex_data.py` and validates every `WP-<PREFIX>-NN` it cites against the chapters (a stale id fails the build). The scripts only read the chapter files.
