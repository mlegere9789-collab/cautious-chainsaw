# pages-A report — dashboard, search, compare, camera, report + shared site-nav (js/css)

Specialist: pages-A. Scope: `dashboard.html`, `search.html`, `compare.html`, `camera.html`, `report.html`, `site-nav.js`, `site-nav.css` in DEPLOY_DIR (`C:/Users/mlege/AppData/Local/Temp/claude/site/deploy`). All line numbers below refer to those deployed files unless prefixed `bundle.pretty.js:` (the prettified deployed main bundle in PLAN_WORK). Finding IDs are `pagesA-NN`; audit IDs (C7, C8, S1, ...) are cross-referenced.

Everything here is a NO-BUILD plan. Nothing in DEPLOY_DIR, SRC_DIR or RECON_SRC was modified.

---------------------------------------------------------------------------------------------------

## 0. How the evidence was gathered (and what is verified vs inferred)

Read-only tooling only:

* Full read of the 5 pages + `site-nav.js` + `site-nav.css`, `sw.js`, `netlify.toml`, and the data files they consume.
* A private headless Chrome (own throw-away profile, own debugging port; NOT the shared browser pane) driven over the DevTools protocol by scripts in `plan-work/tmp-pages-A/` (`cdp.mjs`, `probe.mjs`, `analyze.js`, `dashrace*.mjs`, `idcollide.mjs`, `livecollide.mjs`, `perf.mjs`, `menu.mjs`, `reportflow.mjs`, `searchsim.mjs`). Pages were served either from a local static server on 127.0.0.1:8765 (deploy folder, byte-for-byte) or fetched from the live site (GET only, fresh profile each run).
* `curl` GET/HEAD against the live site and `api.mapbox.com` (one tile + one style request per Referer variant).
* Data analysis in Python/Node against `data/**.json`.

Legend used in this report: **[V-live]** verified on the live site; **[V-local]** verified against the deployed files served locally; **[code]** established by reading code only; **[?]** inferred / could not verify.

What I could NOT do / caveats (also listed at the end): no real phone, no Safari/Firefox, no screen reader, no authenticated Netlify or Mapbox dashboards, no Mapbox tile checks from a real deploy-preview URL. Headless Chrome with SwiftShader renders Mapbox fine, so WebGL-specific problems on real GPUs are not covered.

---------------------------------------------------------------------------------------------------

## 1. Executive summary

The five pages plus the shared nav look finished but contain one **critical reliability bug shared by four pages**, one **critical dead-link contract**, and a cluster of **CSS-cascade** and **data-shape** bugs that produce exactly the symptoms the audit saw (C7, C8, S1, S4, H7). Most of it is small code; the big-ticket items are (a) a shared build/manifest/module layer so these pages stop being five hand-copied files, and (b) giving Compare/Camera/Report the same position and unit data the main map has.

Top discoveries (all with reproduction below):

1. **`site-nav.js` injects an icon sprite whose `<symbol id="chart|search|clock|...">` collides with page element ids.** `document.getElementById('chart')` then returns the hidden `<symbol>`, so on `dashboard.html` the chart is drawn *inside the sprite* and the visible SVG stays empty; on `report.html` (and `regiment.html`) the search input never gets its listener; on `living-ledger.html` the clock element is the symbol. It is a race between the data fetch and a `requestIdleCallback`, hence "intermittent, fine on reload". Reproduced on the LIVE site: report search dead in 2/4 fresh loads (4/4 throttled), regiment 3/4 (4/4), dashboard chart empty in 1/4 throttled loads; deterministic with 2.5 s injected latency. This is the root cause behind C7's empty chart and very likely behind S1 ("lone search box"). [pagesA-01]
2. **All "open on the map" deep links are inert.** The deployed app reads exactly one query parameter (`?ancestor=`, `bundle.pretty.js:101019`). Search results link to `/index.html?unit=`, `?tick=&vignette=`, `?lat=&lng=`; documentary/education/embed/historian/regiment/turning-points use `?tick=`/`?unit=`. It even *writes* `?t=&u=&z=&ll=` share links (`bundle.pretty.js:97822-97830`) that nothing reads. So every Search result lands on the splash screen with no effect. [pagesA-03]
3. **`site-nav.css:143-147` resets `font`/`color` on `button.<class>` selectors with higher specificity than the pages' own `.<class>` rules.** Verified computed styles: search chips `#E8E6DF` on UA-gray `#F0F0F0` = **1.10:1** (C8); Play button (camera, ground-remembers, immersive, watch-together) `#E8E6DF` on gold = **1.92:1** (pages intended `#0A0A14`, 8.21:1); Compare's style toggles render 16 px, not the designed 10 px, so the row overflows and clips ("Parc…" S4). [pagesA-02, pagesA-16, pagesA-26]
4. **Dashboard:** `highest_single_regiment_rate` has a nested `{union:{…},confederate:{…}}` shape the generic loop doesn't handle → card title is the raw key and body is `undefined` (C7). That unbreakable 28-char word also widens the mobile layout viewport to 446 px, which (with the fixed 1000-px SVG) is the real cause of S4's sideways scroll. The visible "data note" is a real 335- and 100-casualty discrepancy in the JSON (U-I 6,059 vs 6,394; C-CAV 583 vs 483) that should be fixed in the data, not shown to users. Dashboard total 46,163 also contradicts vignette copy "51,000 casualties". [pagesA-10..15]
5. **Compare and Camera use only the 9 `placements_*` files: 152 unit ids (only 23 are regiments; 92 are brigade ids like `U-I-1-1`, 29 batteries, 8 other) with median 26 ticks between keyframes; the main app also loads 38 `density_*` files (478 ids; at tick 300: 349 positioned units vs Compare's 123).** Camera's "Follow a Unit" lists just 23 regiments, 11 of which have a *single* keyframe; the default 20th Maine first exists at tick 225 so choosing Follow at tick 1 does nothing. [pagesA-27, pagesA-31]
6. **Mobile performance of the map sub-pages is not green:** `mapbox-gl.js` (1.8 MB, 471 KB brotli) + CSS load synchronously in `<head>` from a third party → throttled-mobile FCP 3.6–3.8 s, LCP 3.6–4.2 s, TBT 137–491 ms (compare/camera). Search shows CLS 0.147 under mobile throttling (footer pushed by late-rendered results). [pagesA-28, pagesA-33, pagesA-20]
7. **Report:** `undefined / C-CAV-1` shown for all 22 Confederate cavalry regiments; alias record renders as an empty report; 221 units show "—" for casualty rate although strength and casualties exist; matches are `<div>`s (not keyboard-operable); print output includes the site nav and footer and gold-on-white headings; description promises reports "on any regiment or moment" but only regiments exist. [pagesA-21..25]
8. **Every page's `og:image` (and the manifest "screenshots") is the same corrupt PNG:** `screenshots/day1.png` and `day3.png` are byte-identical (md5 `3f6646c9…`), IHDR says RGB but the IDAT inflates to RGBA size (3,687,120 vs 2,765,520 bytes), PIL cannot decode it, and Chrome renders a blank light-grey frame. Social cards for the whole site are blank. [pagesA-37]
9. **Token check corrects audit X1:** the Mapbox token in `compare.html:97`/`camera.html:64` is URL-restricted for *tile* requests (403 with Referer `example.org`, `127.0.0.1`, or none; 200 with `https://gettysburginteractivemap.com/...`) but the *styles* endpoint answers 200 to any Referer. Consequence: local dev and `*.netlify.app` deploy previews show blank maps (403 tiles) unless those origins are allowed or a dev token is used. [pagesA-38]

Estimated grades (my assessment, before → after the plan; "mobile/desktop" merged where equal):

| Page | Function | UX | Mobile | A11y | Perf | SEO | Overall now → A+ target after |
|---|---|---|---|---|---|---|---|
| dashboard | C (intermittent empty chart, `undefined` card) | C | D (446-px layout, 1000-px chart) | D | A | C+ (no static text) | C- → A+ |
| search | C- (dead links, noisy ranking, alias rows) | C | C+ (CLS 0.147) | C (1.1:1 chips, no label) | B | C | C- → A+ |
| compare | C | C | D- (panes side by side at 375) | D | C mobile (FCP 3.7 s) / A desktop | C | D+ → A+ |
| camera | D+ (Follow essentially broken) | C- | C | C- (Play 1.92:1) | C mobile | C | D+ → A+ |
| report | D (search dead half the time, sparse) | D | C | D (div-buttons) | A | C | D → A+ |
| site-nav (shared) | B- | B | B- | C+ | B | C (JS-injected nav) | B- → A+ |

---------------------------------------------------------------------------------------------------

## 2. Cross-cutting root causes (each is a finding below)

| # | Root cause | Symptom(s) | Finding |
|---|---|---|---|
| RC-1 | Sprite symbol ids share the global id namespace with page ids; sprite is injected first in `<body>` on idle | Dashboard chart empty (C7); report/regiment search dead (S1); living-ledger clock static | pagesA-01 |
| RC-2 | `site-nav.css` global button reset out-specifies page classes | Search chips 1.10:1 (C8); Play 1.92:1 ×4 pages; Compare toggles 16 px overflow | pagesA-02 |
| RC-3 | Deep-link schema (`?unit ?tick ?vignette ?lat ?lng`) not implemented in app | Search/Documentary/Education/Turning Points/Regiment/Historian CTAs do nothing | pagesA-03 |
| RC-4 | Data JSON authored for the animation engine, rendered raw by the pages (dev notes, alias rows, raw ids, `--`, `undefined`) | C7, H7, report `undefined / C-CAV-1` | pagesA-10/11/17/21 |
| RC-5 | Sub-pages consume a thinner position dataset than the main map and re-implement its logic | Compare 152 of 478 units, Follow 23 units, three different clocks | pagesA-27/31/36 |
| RC-6 | Blocking third-party `mapbox-gl.js` in `<head>`, serial fetch waterfalls, JS-injected nav/footer, no pre-rendering | Mobile FCP/LCP/TBT, CLS 0.147 (search), no-JS crawl of nav | pagesA-05/28/33/20 |
| RC-7 | Each page is a hand-copied 100–280-line file with inline CSS+JS, its own error handling and its own head boilerplate | Inconsistency, CSP can't be enforced, OG image bug repeated everywhere | pagesA-37/38/39 |
| RC-8 | No source control/tests/CI for the sub-pages (N1) | Regressions like RC-1/RC-2 shipped unnoticed | pagesA-40 |

---------------------------------------------------------------------------------------------------

# PART A — Shared components: `site-nav.js` / `site-nav.css` (and defects that originate there)

## pagesA-01 — Icon-sprite id collision: dashboard chart empty, report/regiment search dead, ledger clock static  (CRITICAL, effort S)

Audit refs: C7 (empty chart), S1 (report/regiment = "lone search box"). Also affects `living-ledger.html` (pages-B) — hand-off.

**Evidence**
* `site-nav.js:71-91` sprite defines `<symbol id="compass|sabers|film|book|pin|pulse|broadcast|search|clock|chart|camera|eye|eye-off|shuffle|download|users|phone-ar|flag|menu">`.
* `site-nav.js:97-109` `loadIconSprite()`; `:105` `document.body.insertBefore(wrap, document.body.firstChild)` (sprite becomes the FIRST node in `<body>`, so it wins tree-order in `getElementById`); `:107` `requestIdleCallback(inject, { timeout: 1500 })`; `:230` called unconditionally at script start.
* Colliding page ids: `dashboard.html:71` `<svg id="chart">` + `:144` `const svg = document.getElementById('chart')` (executed after `await fetch`, line 121); `report.html:54` `<input id="search">` + `:81` `document.getElementById('search')` (after `await Promise.all(...)` at :78); `regiment.html:70/:151`; `living-ledger.html:64` `id="clock"` + `:126`.
* No other page collides (grep of all `*.html` for the 19 symbol ids). `index.html:309,310,337,376` *use* `#broadcast/#menu/#eye/#eye-off` (must be migrated together).

**Root cause** Duplicate ids in one document. Once the sprite is in the DOM, `getElementById('chart')` returns `<symbol id="chart">` (inside a `display:none` wrapper). Whether the page script runs before or after the idle callback decides success: fast repeat loads (data cached, resolves in ms) win; slower first loads lose. The dashboard then appends 27 gridline/label/path elements into the hidden symbol while `#chart-wrap` becomes visible with an empty `<svg>`; `report.html` attaches `input` handlers to the symbol so typing does nothing.

**Reproduction (all mine)**
* [V-local] `idcollide.mjs`, JSON delayed 2.5 s: `getElementById('chart')` → `symbol`, inside `#gtbg-icon-sprite`; visible `svg#chart` has **0 children**, the symbol has 27. `report.html`: typing "20th Maine" → **0** `.match` nodes.
* [V-live] fresh profile per run, 375×812: `report.html` search returned matches 2/4 (fast) and 0/4 (throttled Slow-4G/4×CPU); `regiment.html` 1/4 and 0/4; `dashboard.html` chart children 24 (=complete) 4/4 fast, 3/4 throttled (1/4 empty = 0).
* [V-local] with un-delayed fetch the same pages work — matching "worked on reload".

**Fix (defence in depth, all four together)**
1. `site-nav.js`: namespace every symbol: `id="gtbg-i-chart"` etc.; change `icon()` (`:61-63`) to `'<use href="#gtbg-i-' + name + '">'`; export `GTBG_MENU.icon(name)` and update the 4 `index.html` uses to call it (or to the prefixed ids).
2. Inject the sprite **synchronously** at the top of `render()` (or inline it into the static HTML at build time, see pagesA-39). 3 KB; removes the icon pop-in caused by the idle callback and removes the race entirely. Keep `insertAdjacentHTML('afterbegin', …)` once.
3. Pages: rename the four ids (`strength-chart`, `report-search`, `regiment-search`, `ledger-clock`) and **capture element references before the first `await`** (`const $ = id => document.getElementById(id); const svg = $('strength-chart');` at top of the script). Never call `getElementById` for a static element after an await.
4. CI lint (pagesA-40): Playwright test "no duplicate ids after network idle" on every page, plus a test that delays every `/data/**` route by 0/300/1500/4000 ms and asserts the page still works.

Sketch (`site-nav.js`):
```js
var P = 'gtbg-i-';
function icon(name, extra){ return '<svg class="gicon'+(extra?' '+extra:'')+'" aria-hidden="true" focusable="false"><use href="#'+P+name+'"></use></svg>'; }
// SPRITE string: replace  <symbol id="chart" ...>  with  <symbol id="gtbg-i-chart" ...>  (19 symbols)
function ensureSprite(){ if (document.getElementById('gtbg-icon-sprite')) return;
  document.body.insertAdjacentHTML('afterbegin','<div id="gtbg-icon-sprite" hidden>'+ICON_SPRITE_SVG+'</div>'); }
function render(){ ensureSprite(); /* then build nav/footer */ }
```
**Acceptance test** (a) `document.querySelectorAll('[id]')` has no duplicates on all 20+ pages at `networkidle` and at +3 s; (b) with Playwright `page.route('**/data/**', r => setTimeout(() => r.continue(), N))` for N in {0,300,1500,4000} the dashboard `svg#strength-chart` has ≥ 24 direct children, `report` and `regiment` show ≥1 match for "20th Maine", ledger clock text changes after Play; 20/20 runs each.
**Moves:** Reliability (B-/C → A), Function; fixes C7-empty-chart, S1. **Depends on:** pages-B for `regiment.html`/`living-ledger.html`, app agent for `index.html` icon references.

---

## pagesA-02 — Global button reset out-specifies page classes (chips 1.10:1, Play 1.92:1, toggles 16 px)  (HIGH, effort S)

Audit refs: C8, A1, S4.

**Evidence**
* `site-nav.css:140-147` — comment claims the reset "just removes the browser's native button chrome … so nothing changes visually", but the rule
  `button.mode-btn, button.play-btn, button.toggle-btn, button.day-tab, button.filter-chip, button.btn, button.match { font: inherit; color: inherit; appearance: none; … }` has specificity (0,1,1) > the pages' `.filter-chip`/`.toggle-btn`/… (0,1,0), so it silently overrides their `font`, `font-size`, `font-weight`, and `color`.
* Computed styles [V-local], desktop:
  * `search.html .filter-chip:not(.active)`: color `rgb(232,230,223)` on `rgb(240,240,240)` (UA `ButtonFace`, the class sets no background) → **1.10:1** (`search.html:30`).
  * `camera.html .play-btn`: color `rgb(232,230,223)` on `rgb(201,162,75)` → **1.92:1**, font-weight 400 (page asks `#0a0a14`, bold) (`camera.html:34`). Same on `ground-remembers.html`, `immersive.html`, `watch-together.html` (`play-btn` measured 1.92:1 on each) and probably `unit-rendering-reference.html`.
  * `compare.html .toggle-btn`: **font-size 16 px** (page asks 10 px, `compare.html:38`), inactive color ink not muted → the 4-button row is ~330 px wide inside a 163-px pane on phones (S4 "Parc…").
* Blast radius: `button.btn` appears on 10 pages, `button.day-tab` on `education.html`.

**Fix**
1. `site-nav.css`: make the reset zero-specificity so page classes always win:
   ```css
   :where(button, input, select, textarea) { font: inherit; color: inherit; }
   :where(button) { appearance: none; -webkit-appearance: none; margin: 0; text-align: inherit; background: none; border: 0; padding: 0; }
   ```
   and delete the 7-class selector list. (Supported in every current browser; `:where()` adds 0 specificity.) Update the misleading comment.
2. Stop relying on UA `ButtonFace`: every interactive class must declare `background`, `color`, `border`, `font-size`, `min-height`. Put these into shared `.chip`, `.btn`, `.btn-primary`, `.seg` components (pagesA-39) so pages don't invent them.
3. Regression tests: computed-contrast assertion (≥ 4.5:1) for every `button, a.btn, .chip` on every page in default, hover, focus, active, disabled states; snapshot test of computed `font-size` for `.toggle-btn` (=12+ px, see pagesA-42).
**Acceptance** axe `color-contrast` = 0 violations on search/camera/ground-remembers/immersive/watch-together/compare; computed contrast of `.play-btn` ≥ 8:1; `.filter-chip` ≥ 6:1; `.toggle-btn` font-size ≥ 12 px and row wraps without overflow at 320 px.
**Moves:** Accessibility (C+/C → A-), Fit&finish; fixes C8, part of S4, A1. **Effort** S (0.25 d + tests).

---

## pagesA-03 — Deep-link contract: every "See it on the map" link is inert  (CRITICAL, effort L (app-side) — hand-off)

Audit refs: new (discovered here); makes Search's core function fail (C8/H7 family); relates to H3/H4 (splash behaviour).

**Evidence**
* The only place the app reads the URL: `bundle.pretty.js:101019` `new URLSearchParams(window.location.search).get("ancestor")` (Follow-Your-Ancestor panel, mounted only when open). grep of `bundle.pretty.js` for `.get("…")`, `location.search`, `searchParams`, `location.hash` returns only mapbox-internal hits plus that one line. `index.html` inline scripts never read query params (grep `location.`, `URLSearchParams` → only `location.reload()` at :267).
* The app *writes* `?t=<tick>&u=<unit>&z=<zoom>&ll=<lat>,<lng>` share links (`bundle.pretty.js:97822-97830` function `$k`, used by `TF` at :97831 and the Share button at :97929) — nothing parses them back.
* Pages generating links the app ignores: `search.html:114,127,139` (`/index.html?unit=…`, `?tick=…&vignette=…`, `?lat=…&lng=…`), `documentary.html:92`, `education.html:81`, `embed.html:60`, `historian.html:110`, `regiment.html:247` (`/?unit=…&tick=…`), `turning-points.html:118` (`/?tick=…`).
* Store actions available to implement it: `bundle.pretty.js:9366-9370` `setTick`, `jumpToDay`; `selectUnit`/`pinUnit` (:9410-9411); `mapRef` (:9412).
* Confidence: high for "no parser in the shipped bundle" [code]; not verified by driving the live app through its 15-s splash [?].

**Root cause** The deep-link schema was designed on the sub-page side; the (reconstructed/minified) app never got the receiving half.

**Fix (contract + two implementation options)**
* Define ONE schema, accepted by the app and produced by all pages (aliases kept for old links): `?tick=<1-675>` (alias `t`), `?unit=<unit_id>` (alias `u`), `?vignette=<V-###>`, `?ll=<lat>,<lng>` (aliases `lat`+`lng`), `?z=<zoom>`, `?day=1|2|3`, `?ancestor=<id>` (existing).
* App boot rule: if any deep-link param is present → **skip splash/fast-forward and onboarding** (H3), jump to the tick, select/pin the unit, `flyTo` (unit location at that tick, else `ll`), open the vignette card, then `history.replaceState` to strip nothing (keep the params so the URL stays shareable).
* Implementation option A (rebuild path): implement in the React source once the app source is recovered/rebuilt (N1). Option B (patch path, no source): a small `<script>` in `index.html` `<head>` parses the URL into `window.__GTBG_DEEPLINK` and the patched bundle calls `applyDeepLink()` after `setOobData/zp(day)` resolve (`sF()` at `bundle.pretty.js:96897`).
* Pages: add `/lib/deeplink.js` with `mapUrl({tick,unit,vignette,ll,z})` used by every page so the schema lives in one place; unit tests for the builder.
**Acceptance** Playwright on `/?tick=300&unit=U-20ME`: no splash, `currentTick===300`, the 20th Maine panel is open and the map centre is within 300 m of its position; `/?vignette=V-011` opens that vignette; every result link on `search.html` for 10 sample queries lands on the expected state; old `?t=&u=&ll=` share links round-trip.
**Metric moved** Function (B/D → A), UX, SEO (shareable URLs). **Depends on** app agent (mobile/bugs agents own splash H3). Effort L for the app half, S for the page half.

---

## pagesA-04 — `site-nav` menu accessibility and focus  (HIGH, effort M)

Audit refs: A1, A3, A4, A6, D2.

**Evidence** (all [V-local] via `menu.mjs` / `menuA11y.mjs`)
* `site-nav.js:169` button has `aria-expanded` only; no `aria-controls`, no `aria-haspopup`, panel has no role/label (`aria-controls`/`role` = null).
* Current page is marked only by CSS class `.current` (`site-nav.js:121`) and a "you are here" chip (`:140`); links have **no `aria-current="page"`** (measured `ac:null`).
* Opening the menu doesn't move focus into it ([V-local]: after `click()` the active element stayed on the page's search box), and **Escape closes the panel but never returns focus to the button** — `closePanel()` (`:175`) and the keydown handler (`:184`) contain no `btn.focus()` [code].
* `site-nav.css:44,110` `outline: none` on `.gtbg-historian-pin:hover/:focus-visible` and `.gtbg-item:focus-visible` — the only focus cue is a background change to `#1a3a7a` on `#12121e` ≈ 1.5:1 (fails focus-visible/non-text contrast 3:1).
* Contrast: `.gtbg-group-why` (`site-nav.css:96`) `#6f7686` on `#12121e` = **4.08:1**; `#gtbg-footer` (`:129`) `#6f7686` on `#0a0a14` = **4.32:1** (measured on every page: `© 2026 …`) — both fail 4.5:1.
* Type: `.gtbg-here` 9.5 px (`:98`), `.gtbg-group-why` 11 px (`:96`), `.gtbg-item-desc` 11.5 px (`:124`), `.gtbg-item-label` 13 px — below the 12 px floor in the brief.
* Targets: brand link 137×18, historian pin 156×34 / 48×34 (mobile), Explore button 98×34, footer links 31–90×16 [V-local]; touch min is 44×44.
* Panel is a `div` soup (`<div class="gtbg-group">…`), not lists; no scrim; page behind stays scrollable (`overscroll-behavior` unset); no roving/arrow-key support (acceptable for a disclosure, but the disclosure pattern must be complete).

**Fix (disclosure-navigation pattern)**
```html
<button id="gtbg-menu-btn" class="gtbg-menu-btn" aria-expanded="false" aria-controls="gtbg-menu-panel">…Explore</button>
<div id="gtbg-menu-panel" role="region" aria-label="All tools" hidden>
  <section aria-labelledby="g-explore"><h2 id="g-explore">Explore</h2><ul><li><a href="/search.html" aria-current="page">…</a></li>…</ul></section>
```
* Toggle `hidden` (or `inert` + `visibility`) instead of only classes; on open focus the first link (or the panel with `tabindex="-1"`); on Esc/close **restore focus to the button**; trap nothing (it's a disclosure) but close on focus-out (`focusout` when `relatedTarget` outside nav) and on link click.
* `aria-current="page"` on the current link; keep the visual tag but as `<span class="visually-…">`-free text "You are here" ≥ 12 px.
* Keep `:focus-visible` outline (2 px gold, offset 2) on all items; hover style may change background, never remove the outline.
* Colours: raise `#6f7686` → `#9aa3b8` (7.3:1 on panel, 7.8:1 on bg); footer text same token; all nav text ≥ 12 px (`0.75rem`), descriptions 0.8125rem.
* Targets: brand/pin/button `min-height:44px; min-width:44px`; footer links `display:inline-flex; min-height:44px; align-items:center` on coarse pointers (`@media (pointer:coarse)`), 24 px minimum on fine pointers.
* Add a scrim (`.gtbg-scrim` fixed, `rgba(0,0,0,.5)`, click closes) on ≤ 720 px and `overscroll-behavior: contain` on the panel; make the panel `max-height: calc(100dvh - 72px)`.
**Acceptance** axe-core (wcag2a, wcag2aa, wcag22aa) 0 violations with the menu open on all pages; keyboard script: Tab to Explore → Enter opens and focus lands inside; Esc closes and focus is on the button; screen-reader tree shows `aria-current`; all nav targets ≥ 44 CSS px on `pointer:coarse`.
**Moves** Accessibility (C+ → A), Usability. Applies to ~24 pages at once.

---

## pagesA-05 — Nav is JS-injected: not crawlable, sprite pops in, flat 20-item menu is long on phones  (MEDIUM, effort M)

Audit refs: P4, D2, T1 (sub-page discovery), A6; relates to H1 (floating overlay).

**Evidence**
* `site-nav.js:161-171` replaces an empty `<div id="gtbg-nav-mount">` with the whole `<nav>` at `DOMContentLoaded` (`:232-236`); the footer likewise (`:187-198`). No `<noscript>` fallback: with JS off (and for crawlers that don't execute JS) sub-pages have **no links to any other page** and no footer/Privacy/Terms.
* CLS risk: the mount is 0 px tall until replaced; on my fast local runs CLS was 0, but any delay between first paint and DCL shifts the entire page down by the nav height (~55 px). [code] (I could not provoke it because the script sits at the end of `<body>` and pages are tiny; compare/camera paint after the blocking mapbox script, which hides it.)
* Icons render blank until the idle callback (`:107`) — see pagesA-01.
* Open-menu height on phones: `panel.scrollHeight` **1,471 px** at 375 wide (client 615), 1,616 at 320, 1,407 at 812×375 landscape (panel 285 px tall) [V-local, `menu.mjs`]. Twenty items with two-line descriptions = 2.4 screens of scrolling, no group index.
* Naming: button "Explore" opens a menu whose first group is also "Explore"; index.html's overlay calls the same content "Extra Features" (H1). Three names for one thing.
* The same menu content is also generated by the index overlay via `window.GTBG_MENU.buildGroupsHtml(null)` (`index.html:307-311`) — good single source, keep it.

**Fix**
1. Pre-render nav + footer at build time into every page (`<nav id="gtbg-nav">…</nav>` static HTML, sprite inlined once at top of `<body>`), keep `site-nav.js` only for behaviour (menu toggle, back-link logic). Result: no CLS, no icon pop-in, links visible without JS, crawlers see 20 internal links from every page (T1). Until the build exists (pagesA-39), at minimum reserve space: `#gtbg-nav-mount{display:block;min-height:56px}` and `#gtbg-footer-mount{display:block;min-height:120px}`.
2. Rename: nav button **"All tools"** (icon + text), groups keep names; "Extra Features" (overlay) → "All tools" too (H1 hand-off).
3. Mobile menu IA: turn groups into `<details name="gtbg-groups">` accordions (only one open) with the current group open by default; keep "Ask the Historian" pinned at top as a full-width row; add a filter box only if > 25 items later. Landscape phones: two-column grid when `(orientation:landscape) and (max-height:500px)`.
4. Group names/descriptions from the shared page manifest (pagesA-39) so nav, sitemap, search index and OG data can't drift.
**Acceptance** `curl` of any sub-page contains all 20 `href="/*.html"` links and the footer links in raw HTML; Lighthouse "CLS" 0; with menu open on 375×812 the first group + two more headings are visible without scrolling; landscape shows ≥ 6 items.
**Moves** SEO (T1), Perf (CLS), Usability, Fit&finish.

---

## pagesA-06 — `wireBackLinks()` returns to the previous *same-origin page*, not the map  (MEDIUM, effort S)

**Evidence** `site-nav.js:211-228`: `cameFromThisSite = document.referrer && document.referrer.indexOf(location.origin) === 0` then `history.back()`. A visitor who goes Map → Search → Compare and clicks "← GETTYSBURG" is sent back to *Search*, not the map. Only `a[href="/"]` is wired (`:212`); the pages' own "Back to the map" links are authored as `href="/index.html"` (`dashboard.html:58`, `search.html:50`, `compare.html:53`, `camera.html:46`, `report.html:49`). On the live site Netlify's post-processing (Pretty URLs) rewrites them to `<a class='back' href='/'>` [V-live: live HTML differs from deployed file at exactly that line], so it works in production **only because of a Netlify setting**; local/preview builds without it lose the behaviour. `document.referrer` also survives reloads and is empty after some referrer-policy hops.
**Fix** (a) author `href="/"` everywhere; select `a.back, #gtbg-nav a.brand, a[href="/"], a[href="/index.html"]`. (b) Track intent explicitly: `index.html` (app) sets `sessionStorage.gtbg_map_seen = '1'` on mount; each sub-page increments `sessionStorage.gtbg_subdepth` on `pageshow` when `!e.persisted` and the referrer is same-origin non-map; the back link calls `history.go(-depth)` only if `gtbg_map_seen` is set; otherwise plain navigation to `/`. (c) rename brand text to "← Back to map" + `aria-label="Gettysburg Interactive Map — home"` (the arrow entity is read aloud as "leftwards arrow").
**Acceptance** Playwright: map → search → compare → click brand ⇒ URL is `/` and the app is restored instantly (bfcache `pageshow.persisted`); direct open of `/compare.html` → brand click navigates to `/`; behaviour identical with Netlify Pretty URLs on/off.
**Moves** Usability, UX polish.

---

## pagesA-07 — `esc()` incomplete, not shared, and pages inject unescaped strings via `innerHTML`  (MEDIUM, effort S)

**Evidence** `site-nav.js:60` `esc()` handles `& < > "` but not `'` and is private to the IIFE; `search.html:194-196` builds result rows with `${item.title}`/`${item.meta}` unescaped into `innerHTML`; `dashboard.html:196,212,253` inject `corps.…`, `c.note` unescaped; `compare.html:216` and popup `setHTML` unescaped `p.unit_id`/`p.disposition`. Data is first-party today, so this is hygiene rather than an exploitable bug — but it blocks a strict CSP posture review and any future user-supplied data (Watch Together, share links, Historian).
**Fix** Export `window.GTBG.esc` (also escape `'` → `&#39;`, `` ` `` → `&#96;`, coerce `null/undefined` to `''`), add tagged template `html\`…${x}…\`` that auto-escapes interpolations, and make the shared `dom.js` (pagesA-39) the only way pages build markup; prefer `textContent` for single values. Add an ESLint `no-unsanitized/property` rule (in CI) once pages are in git.
**Acceptance** unit test `esc("<img onerror=x>'")`; grep shows zero raw `${…}` inside `innerHTML =` templates except through `html\`\``; a payload (`"<img src=x onerror=alert(1)>"`) placed in a fixture regiment name renders as text on search/report/compare.

---

## pagesA-08 — Footer/brand/copy: sources, accessibility, name consistency  (MEDIUM, effort S)

**Evidence** `site-nav.js:187-198` footer: `© <year> Gettysburg Animated Battlefield Map` (title mismatch with domain "…InteractiveMap": E2), links Privacy/Terms/Contact(`mailto:` — harvestable)/User Guide (PDF); no "Sources & credits", "Accessibility statement", "About", "Sitemap"; year computed by JS; text contrast 4.32:1 (pagesA-04). Data/attribution lives nowhere on the sub-pages although every claim rests on Busey & Martin, OR, Pfanz, etc. (`data/oob/*.json` metadata lists them).
**Fix** Footer (from manifest): © + single canonical product name; links: About & Sources, Accessibility, Privacy, Terms, Contact (form or `mailto:` with `data-`-assembled address), User Guide (PDF, "≈ N KB"), Sitemap; a one-line data credit ("Unit data: Busey & Martin (1994), Official Records vol. 27; map © Mapbox © OpenStreetMap") and Mapbox/OSM attribution on every map page is already in the control. Create `/about.html` (sources, method, corrections policy, how to report an error) — this doubles as the E-E-A-T page for SEO (T1).
**Acceptance** every page footer has the credits line and ≥ 6 links; contrast ≥ 7:1; no JS needed (pre-rendered).

---

## pagesA-09 — Motion, dead assets and cache headers in the shared layer  (LOW–MEDIUM, effort S)

**Evidence**
* `site-nav.css:12` `body { animation: gtbg-page-in 340ms ease both; }` (opacity+transform) also loads on the map SPA (`index.html` links `site-nav.css`): delays first paint by a few frames on every page and makes `<body>` a containing block during the animation (fixed/sticky children misplace during 340 ms). Reduced motion is honoured (`:14`).
* `site-nav.css:41` `.gtbg-historian-pin { animation: gtbg-pin-glow 3.4s … infinite }` animates `box-shadow` (paint-only, non-composited) forever on every page — Lighthouse "avoid non-composited animations" candidate and constant repaint on phones.
* Dead code: `.gtbg-lift` (`site-nav.css:151-152`) used by no page (grep = 0); `/icons.svg` (3,938 B) is referenced only in a comment (`site-nav.js:66`).
* `site-nav.js` / `site-nav.css` are served `Cache-Control: public,max-age=0,must-revalidate` [V-live] → a conditional request on every page view, on the render-blocking CSS's critical path.
**Fix** delete the body animation (or scope to `main` and only when `!document.referrer`); make the glow a pseudo-element `opacity` animation or drop it; delete `.gtbg-lift` and `icons.svg`; fingerprint (`site-nav.<hash>.css/js`) + `Cache-Control: public, max-age=31536000, immutable` via a `netlify.toml` header for `/assets/*` (pages' own build output goes there too, pagesA-39). Keep `index.html`/sub-page HTML `no-cache`.
**Acceptance** Lighthouse: no non-composited animations, repeat-view request for nav css = 0 network; FCP delta ≥ −100 ms mobile.

---

# PART B — `dashboard.html` (Casualty & Strength Dashboard)

Inventory: 280 lines; inline CSS (`:19-52`) + inline async IIFE (`:78-275`); one data fetch `/data/casualty_apportionment.json` (2,992 B brotli, `Cache-Control: public,max-age=3600`); no third-party code except Netlify's injected RUM (`/.netlify/scripts/rum`, async) on the live site; `site-nav.css/js`. Perf [V-live, throttled mobile, 2 runs]: FCP 0.88–1.18 s, LCP = same (`<p class="sub">`), TBT 77–159 ms, CLS 0, 23 KB / 6 requests — already green; the page's problems are correctness, layout and accessibility, not speed.

## pagesA-10 — Stat cards: `highest_single_regiment_rate` / `undefined`, and the card that widens the phone layout  (HIGH, effort S)

Audit refs: C7, S4, H7.

**Evidence**
* `dashboard.html:244-249`:
  ```js
  for (const key in data.notable_intensity_notes) {
    const n = data.notable_intensity_notes[key];
    cards.push({ num: n.unit || key, lbl: key.replace(/_/g,' '), note: n.note });
  }
  ```
  and `:253` `card.innerHTML = \`<div class="num">${c.num}</div>…<div class="note">${c.note}</div>\``.
* `data/casualty_apportionment.json` `notable_intensity_notes`: three entries are `{unit, note, tick_range}` but `highest_single_regiment_rate` is `{ "union": {"unit":"U-1MN","rate":85.5,"note":"1st Minnesota — 224 of 262 casualties in 15 minutes July 2"}, "confederate": {"unit":"C-26NC","rate":69.7,"note":"26th North Carolina — 588 of 843 casualties across July 1 and 3"} }` → `n.unit` undefined → `num = 'highest_single_regiment_rate'`, `n.note` undefined → body literal `undefined`. [V-local screenshot `shots/local_dashboard_html_*.png`].
* Side effect [V-local]: at 375 px with mobile emulation `innerWidth` becomes **446** (layout viewport widened) — the 26-px Georgia-bold unbreakable string is ~446 px wide (`.stat-card .num`, `:47`), overflowing the card and the page. So the phone user sees a zoomed-out page, not just an ugly card.

**Root cause** Generic key→card loop with no schema awareness and no guard; raw `snake_case` keys used as UI copy; `innerHTML` of possibly-undefined fields.

**Fix**
```js
const NOTE_TITLES = {
  most_compressed_union: 'Most compressed Union action',
  most_compressed_confederate: 'Most compressed Confederate action',
  longest_sustained_action: 'Longest sustained action',
  highest_single_regiment_rate: 'Highest single-regiment loss rate',
};
function notesToCards(notes, unitName /* id -> designation from oob */) {
  const out = [];
  for (const [key, n] of Object.entries(notes || {})) {
    const title = NOTE_TITLES[key] || sentenceCase(key);           // never show snake_case
    if (n && typeof n.note === 'string') out.push({ big: n.unit || '', label: title, text: n.note });
    else if (n && typeof n === 'object') for (const side of ['union','confederate']) {
      const s = n[side]; if (s && typeof s.note === 'string')
        out.push({ big: `${s.rate}%`, label: `${title} · ${side === 'union' ? 'Union' : 'Confederate'}`, text: s.note, unitId: s.unit });
    } else console.warn('[dashboard] unrecognised notable_intensity_notes shape:', key);
  }
  return out;
}
```
Render with `textContent`/`html` template (pagesA-07); CSS: `.stat-card .num{overflow-wrap:anywhere;font-size:clamp(20px,6vw,26px)}`, `.stats-row{grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))}`, `.stat-card{min-width:0}`. Add a build-time schema check (pagesA-40) that fails when a note has neither `.note` nor `union/confederate.note`.
**Acceptance** DOM has no text `undefined`, no `_` in any `.lbl`; card for highest single-regiment rate appears twice (Union/Confederate) with designations; on 375-px mobile emulation `innerWidth === 375` and `scrollWidth === innerWidth`.
**Moves** Function/Polish (C7), Mobile (D → B+ with pagesA-12).

---

## pagesA-11 — Developer "Data note", real data discrepancies, and unreconciled totals  (HIGH, effort M — needs research)

Audit refs: C7, H7; content accuracy.

**Evidence**
* `dashboard.html:257-265` renders: "⚠ Data note: for Union I Corps and Confederate CAV Corps … the source data's summary field for these two corps should be reconciled against the underlying research." Legend also appends ⚠ (`:212`), tooltip shows "source data flags … see footnote" (`:199`).
* The discrepancies are real [V-local, `casualty_apportionment.json`]: `U-I` `total_casualties` 6,059 vs sum of `engagement_periods` 6,394 (difference 335 = the Day-3 "Stannard's Vermont Brigade" period); `C-CAV` 583 vs 483 (exactly 100 — reads like a typo); `overall_rate` also inconsistent: U-I 49.6 vs computed 52.3, C-CAV 6.1 vs 5.1, U-CAV 6.9 vs 6.8.
* Grand totals: engagement-period sums Union **23,138**, Confederate **23,025** = **46,163** (this is what the cards show, `:238-243`); the `total_casualties` fields sum to 22,803 + 23,125 = 45,928; vignette copy says "51,000 casualties" (`data/vignettes_part1.json` V-001 panel + full_script, `vignettes_part3.json`). Three different totals on one site.
* Accuracy watch-list (verify against Busey & Martin, which the JSON cites): "1st Minnesota — 224 of 262 casualties" (85.5%) vs the widely quoted 215 of 262 (82%); "26th North Carolina 588 of 843 (69.7%)" vs commonly quoted ~72% of ~820; "Pickett's division ~2,700 casualties" appears in `notes`. I did not verify these (no source access) — treat as research tasks, not as errors.
* The chart title says "effective strength" but the lines are a **model**: `buildStrengthCurve` (`:98-118`) holds flat, drops 70% of a period's casualties at the peak tick and the rest at period end. Nowhere does the page say "modeled".

**Root cause** Source-data hygiene issue exposed verbatim to users as a to-do note; no data validation step; no statement of method.

**Fix**
1. Research + correct the data: set `U-I.total_casualties` to the verified figure (likely 6,394 if the Vermont Brigade belongs to I Corps' 3rd Division, which the OOB says it does), fix `C-CAV`, recompute every `overall_rate`. Add `scripts/validate-data.mjs` (CI) asserting `total_casualties == Σ periods`, `overall_rate == round(total/initial*100, 1)`, unit ids resolve in OOB, tick ranges inside 1..675 and non-overlapping.
2. Delete the footnote, the ⚠ glyphs and the tooltip warning. Replace with an "About these figures" `<details>` (sources from `metadata.sources`, definition of "casualties" as killed+wounded+captured/missing per source, "curves are modeled from each period's peak tick — they show *when* losses concentrated, not observed daily strength", link to `/about.html#sources`).
3. Reconcile the site-wide total: pick one canonical statement, e.g. "Union 23,138 / Confederate 23,025 per the map's corps-level data (Busey & Martin). Older estimates run to about 51,000 including all losses." and edit `vignettes_part1/3.json` to match (pages-B/history agent owns vignette copy; hand-off).
4. Rename the chart heading to "Modeled strength by corps".
**Acceptance** CI validation script exits 0; page contains no "Data note", no ⚠; sum of cards equals sum of table rows; text search of `data/*.json` and pages for "51,000" returns only the reconciled sentence; a historian sign-off checklist for the four watch-list figures.
**Moves** Historical/data consistency (C- → B+), Copy/voice, Trust.

---

## pagesA-12 — Chart is a fixed 1000-px SVG: sideways scroll on phones, 10-px labels  (HIGH, effort M)

Audit refs: S4, A4.

**Evidence** `dashboard.html:71` `<svg id="chart" width="1000" height="440" viewBox="0 0 1000 440">`; `:31` `#chart-wrap{overflow-x:auto; padding:20px}`; `:33` `.axis-label{font-size:10px}`, `:38` `.day-label{font-size:11px}`; `:81` fixed `W=1000,H=440`; probe at 375: `svg#chart w=1000 r=1040`, only "July 1" label visible [V-local screenshot]. Simply adding `width:100%` would scale the SVG to 34% and make 10-px labels ~3.4 px — so it must be re-laid-out, not scaled.
**Fix** Render at the container's pixel width and re-render on resize:
```js
function layout(){
  const w = Math.max(300, wrap.clientWidth - 2*20), narrow = w < 560;
  return { W: w, H: narrow ? 340 : w < 900 ? 400 : 440,
           PAD: { top: 16, right: narrow ? 12 : 20, bottom: 44, left: narrow ? 44 : 60 },
           yStep: narrow ? 5000 : 2500, font: 12 };
}
const ro = new ResizeObserver(debounce(() => draw(layout()), 120)); ro.observe(wrap);
```
* `svg{width:100%;height:auto;display:block}` + `viewBox` set per draw; y-axis title "Men"; x-axis labels "Jul 1 · Jul 2 · Jul 3" and (after pagesA-36) clock ticks (6 am … 8 pm) on wide screens; day bands shaded alternately instead of dashed markers.
* `#chart-wrap{overflow:visible}`; `touch-action: pan-y` on the plot so vertical page scroll still works while horizontal drag scrubs.
* On phones show **small multiples** (Union panel above, Confederate below, shared y scale) instead of 12 lines in one 340-px plot.
**Acceptance** widths 320/360/375/414/768/1024/1440/2560 and 812×375 landscape: `scrollWidth === innerWidth`, no horizontal scroll inside `#chart-wrap`, all three day labels visible, every SVG text ≥ 12 px computed, chart resizes on rotation without reload.
**Moves** Mobile (D → A-), A4 (≥ 12 px), S4.

---

## pagesA-13 — Chart accessibility and interaction (touch, keyboard, colour)  (HIGH, effort M)

Audit refs: A1, A3, A4; WCAG 1.1.1, 1.4.1, 1.4.11, 2.1.1, 2.5.8.

**Evidence**
* `dashboard.html:71` SVG has no `role`, `<title>`/`<desc>`, or accessible name; paths (`:187-203`) are mouse-only (`mousemove`/`mouseleave`) → no touch, no keyboard.
* Legend items are `<div class="legend-item">` with click handlers (`:209-218`) — not focusable, no role/state; dimmed state is `opacity:.3` (`:41`) which also drops text contrast.
* Tooltip is positioned with `e.clientX - svgRect.left` but is a child of `#chart-wrap` (`position:relative`, padding 20, horizontally scrollable, `:31,:43,:192-195`) → offset by ≥ 20 px and by `scrollLeft`, and clipped near the edges by `overflow-x:auto`.
* Colour: the Union palette (`:88`) on the panel `#12121e`: `#1a4488` (Union XII) **1.97:1**, `#2255aa` (Union VI) **2.61:1** — below the 3:1 non-text minimum; eight nearly identical blues and four reds are not distinguishable without colour-vision aids or hover.
* Controls: checkboxes 13×13 (`:30`), rows 16 px tall [V-local] (target < 24/44).
* `toLocaleString()` without a locale (`:158,196,198,241`) → different separators per visitor.
**Fix**
* `<figure role="group" aria-labelledby="chart-title" aria-describedby="chart-desc">`; SVG `role="img"` with `<title>`/`<desc>` summarising the trend; each series `<path tabindex="0" role="img" aria-label="Union I Corps: started 12,222, lost 6,394 (52.3 percent) mostly on July 1">`; Arrow keys move a crosshair along ticks (announce value in a visually-hidden `aria-live="polite"` node); Esc clears.
* Pointer Events (`pointermove/down/leave`) with a snapping crosshair and one tooltip card positioned relative to the figure; on touch, tap selects a series and shows a persistent readout under the chart (no hover dependence).
* Legend → `<button type="button" aria-pressed>` chips, ≥ 44 px, with the line style swatch (colour + dash pattern + end marker); "isolate" state announced.
* Palette: validated ≥ 3:1 vs panel and ≥ 1.5 ΔL between neighbours; e.g. Union `#6ea8ff #4f8df0 #8ec5ff #a5b4fc #7dd3fc #93c5fd #60a5fa #bfdbfe` cycling dash patterns `none 6 3 2 2 8 3` and 4 Confederate `#ff7a66 #ff9a8a #f4a261 #ffb4a2` — run the validator in CI; do not rely on hue alone.
* "View as table" `<details>` (also the no-JS/SEO fallback, see pagesA-14): columns Corps, Initial, Casualties by day (Jul 1/2/3), Total, Rate, Peak period.
* Number formatting: `Intl.NumberFormat('en-US')` once.
* Checkbox row → segmented control "Both · Union · Confederate" (`role=radiogroup`) at 44 px.
**Acceptance** axe: 0 violations incl. `color-contrast`, `svg-img-alt`, `target-size`; keyboard-only user can read every corps' figures; palette validator passes (min 3:1 vs panel for every series); tooltip stays inside viewport at 320 px; automated check that legend `<button>`s are ≥ 44×44 on `pointer:coarse`.
**Moves** Accessibility (D → A), Usability.

---

## pagesA-14 — Loading / error / empty states, no-JS content, request waterfall  (MEDIUM, effort S–M)

**Evidence** `dashboard.html:68-69` "Loading casualty data…" / error copy "This page reads `/data/casualty_apportionment.json` directly — try reloading." (developer voice, no retry, no `role`); no timeout (`fetch` at `:121` has no `AbortController`); `#chart-wrap` is `display:none` until *all* work (chart, legend, cards, footnote) finishes (`:70,:267-268`) so the chart area has no reserved height (layout jumps as content arrives); the page has essentially no server-rendered text (no `<noscript>`, no table) so crawlers/AT/no-JS see only the heading; the service worker's `/data/` handler can hand `respondWith(undefined)` on an offline cache miss (`sw.js:61-68` `.catch(() => caches.match(e.request))` at :67, same pattern for HTML at :74) → the fetch rejects → the generic error text.
**Fix** (1) Inline the 3-KB JSON at build time (`<script type="application/json" id="data">`) — removes the request, the loading state, and 1 RTT of LCP/INP work; keep `fetch` as fallback. (2) Skeleton with reserved `min-height` (`aspect-ratio`) for chart and cards. (3) `<noscript>` message + the server-rendered data table from pagesA-13. (4) Error UI: `role="alert"`, plain copy ("We couldn't load the casualty figures. Check your connection and try again."), a **Try again** button, 8-s timeout. (5) SW: `.catch(() => caches.match(e.request).then(r => r || Response.error()))`.
**Acceptance** offline first-visit shows the friendly error with retry; throttled slow-3G shows skeleton then chart with CLS 0; page text (no JS) contains all corps figures; no `console.error` on success.
**Moves** Reliability, SEO (indexable text), Copy.

---

## pagesA-15 — Dashboard feature completions needed for A+  (MEDIUM, effort L)

* **Metric switch** (Strength · Cumulative casualties · Casualty rate %) and **cumulative-by-tick** view; day filter chips.
* **Corps drawer**: the JSON already has `engagements[]` and `notes` per period (e.g. "Nearly all I Corps casualties fell in a 3-hour window July 1") that the page never shows. Show them as a timeline per corps with "Watch on the map" deep links to the peak tick (`?tick=…`, pagesA-03) and the clock (pagesA-36).
* **KPI cards** rebuilt from data: total, worst rate by corps, most compressed action (already in JSON), highest regiment rates (Union/Confederate) linking to `/report.html?unit=U-1MN` / `C-26NC`.
* **Actions**: Download CSV of the table, Copy link (state in URL: metric, side, isolated corps), Print stylesheet (white background, table + chart, sources footer).
* **Context**: "How to read this" explainer, definitions, source list from `metadata.sources`, "Last updated", link to `/about.html`.
* **Head/SEO**: JSON-LD `Dataset` (name, description, creator, license/`isBasedOn`, variableMeasured, distribution → CSV), dashboard-specific OG image (pagesA-37), noscript table.
**Acceptance** Playwright: metric toggle changes y-axis title and values; URL state restores on reload; CSV has 12 rows + header; print emulation shows no nav/footer and readable table; JSON-LD validates in the Rich Results / Schema.org validator.

---

# PART C — `search.html` (Search Everything)

Inventory: 205 lines; inline CSS (`:19-44`) + async IIFE (`:68-200`). Fetches 12 JSON files on every load (8 OOB `:69-73`, 3 vignette `:74`, `terrain.json`) = 74 KB / 17 requests [V-live perf run]; builds an in-memory index of **521 entries** (467 regiments + 24 vignettes + 30 locations; the page logs exactly this, `:144-147`). Scoring is a home-grown `score()` (`:83-96`). Not indexed although the description promises them ("Search every regiment, **battery**, vignette, and battlefield location", `:8`): the 95 batteries (`oob/union_artillery.json` 50 + `confederate_artillery.json` 45), 88 brigades, divisions, corps, commanders as people, 137 chronology events, commander successions, monuments, roads/structures.

## pagesA-16 — Filter chips unreadable (C8): missing styles + cascade  (HIGH, effort S)

Audit refs: C8, A1, A3.
**Evidence** `search.html:30` `.filter-chip{padding:5px 12px; border-radius:14px; border:1px solid var(--line); color:var(--muted); cursor:pointer; user-select:none}` — no `background`, `min-height`, or `font`; the elements are `<button>`s (`:56-59`). `site-nav.css:143-147` (`button.filter-chip{font:inherit;color:inherit;…}`, see pagesA-02) makes the text `#E8E6DF`, and the UA button background stays `#F0F0F0` → measured **1.10:1** on Regiments / Vignettes / Locations (only the active chip is styled, `:31`). Chips are 26 px tall, 39–83 px wide [V-local]; the border `--line #1e1e2e` is 1.2:1 against the page (invisible boundary).
**Fix**
```css
:root{ --line-strong:#5b6478; }             /* 3.3:1 on #0a0a14, 3.1:1 on #12121e */
.chip{ display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 14px;
       border:1px solid var(--line-strong); border-radius:22px; background:transparent;
       color:var(--muted); font:600 14px/1 var(--sans); cursor:pointer; }
.chip:hover{ border-color:var(--gold); color:var(--ink); }
.chip[aria-pressed="true"]{ border-color:var(--gold); color:var(--gold); background:rgba(201,162,75,.12); }
.chip .n{ font-variant-numeric:tabular-nums; opacity:.85; }       /* result count per type */
```
`<button class="chip" type="button" aria-pressed="true" data-filter="all">All <span class="n">521</span></button>`; wrap chips in `<div role="group" aria-label="Filter by type">`; on phones allow horizontal scroll-snap only if > 6 chips, otherwise wrap.
**Acceptance** computed contrast of every chip state ≥ 4.5:1 (inactive text `#8a93a8` on transparent over `#0a0a14` = 6.4:1); chip ≥ 44×44 (`pointer:coarse`); axe `color-contrast` 0 on `/search.html`; visual regression at 375/1440.

---

## pagesA-17 — Alias rows, "Commander unrecorded ·", dangling separators  (HIGH, effort S)

Audit refs: H7 (dev-log copy), C8 note ("alias rows / empty commander rows").
**Evidence** [V-local, `searchsim.mjs`, exact re-implementation of `search.html:106-117` on the deployed data]
* `data/oob/union_regiments_i_ii_corps.json`: `U-14BK` `"designation":"14th Brooklyn (alias for U-84NY)"`, `"alias_for":"U-84NY"`, `strength:0`, no commander, `key_action:"Dual designation alias -- see U-84NY."` — indexed as a normal regiment (`search.html:108-115` never checks `alias_for`), so searching "14th brooklyn" returns the alias row *first* (score 90) and the real 84th New York second (score 60) [see screenshot `shots/local_search_html_mobile.png`].
* `:112` `meta: \`${reg.state||''} · ${reg.commander?.name || 'Commander unrecorded'} · ${reg.casualty_percentage != null ? … : ''}\`` → **27** records show "Commander unrecorded" (1 alias + 22 Confederate cavalry + 4 detachments) and **222** show a dangling trailing " · " because `casualty_percentage` is absent — although **221** of those have `strength` and `casualties` so the rate is computable.
* Other dev-voice strings: `:64` "No results. Try a different search term.", `:61` "Building search index…", `:163` "Couldn't build the search index -- try reloading." (double hyphen).
**Fix**
1. Index build (`build-search-index.mjs`, pagesA-39): skip records with `alias_for`; add their designation text (minus the "(alias for …)" suffix) to the target's `aliases[]` so "14th Brooklyn" finds the 84th New York *once* (title shown: "84th New York Volunteer Infantry (14th Brooklyn)").
2. Meta builder that omits empty parts:
   ```js
   const pct = r.casualty_percentage ?? (r.strength ? +(r.casualties / r.strength * 100).toFixed(1) : null);
   const meta = [r.state, r.commander?.name, pct != null ? `${pct}% casualties` : null].filter(Boolean).join(' · ');
   ```
   Never print placeholder text for missing data; if commander is missing, omit (or show the parent brigade commander in muted "brigade: …").
3. Convert ` -- ` to an em dash at index-build time for every user-visible string (`key_action`, fate, notes) — pagesA-41.
4. Copy: "Searching…" (skeleton), "No matches. Try a unit, commander, place, or moment — for example “20th Maine”, “Wheatfield”, “Cushing”." ; error: "We couldn't load the search data. Please try again." + button.
**Acceptance** search for "14th brooklyn" → exactly 1 regiment result; `document.body.innerText` on 30 sampled queries contains no "Commander unrecorded", no "alias for", no line ending in " ·"; a unit test asserts the index contains no record where `strength===0`.

---

## pagesA-18 — Ranking is noisy: subsequence matching, no tokenisation, no aliases  (HIGH, effort M)

Audit refs: H8 (relevance), UX.
**Evidence** `search.html:83-96` scores exact/prefix/word-prefix/substring and then a **character-subsequence fallback (score 20)**; `:113,126` build `searchText` by concatenating designation + state + commander + id (and, for vignettes, title + location + full `panel_summary`), so almost any 3-letter query is a subsequence of some long string. Measured [V-local, `searchsim.mjs`]:

| Query | Raw hits | True hits | Observation |
|---|---|---|---|
| `lee` | **453** | 5 | 448 are score-20 subsequence noise ("Archer Captured", "Reynolds Falls"… shown after real matches) |
| `lincoln` | **348** | 0 | shows 19th Indiana etc.; should say "no matches" |
| `devils den` | 33 | 0 | apostrophe-less spelling misses the location (`Devil's Den` needs the apostrophe); the exact location isn't even in the noise |
| `devil's den` | 13 | 2 | ok (Devil's Den, Triangular Field) |
| `20 maine` | 5 | 0 | first result is 20th **Massachusetts** (tie at 20) |
| `maine 20th` | 4 | 0 | all noise |
| `irish brigade` / `iron brigade` | 30 / 45 | 0 / 4 | no brigade *entity* is indexed (they exist in `union_oob_brigades.json` with nicknames); "iron brigade" only matches vignettes/locations that mention it |
| `bloody angle`, `copse of trees` | 17, 24 | 0 / 1 | alias of "The Angle (High Water Mark)" missing |
| `hancock` | 55 | 3 | top hit is *Captain David Hancock, 7th US* — the II Corps commander W. S. Hancock isn't a searchable entity |
| `buford`, `longstreet`, `lee` (people) | — | 0 people | commanders exist only as strings inside regiment records |
| `1st minnesota` | 9 | 3 | correct top hit; fine |

Result cap `.slice(0,40)` (`:180`) with no "show more"; empty query shows the first 30 records in file order (`:174`) — arbitrary regiments from the I/II Corps file.
**Fix** Replace `score()` with token-AND, field-weighted retrieval; no subsequence matching.
```js
// build time: doc = { id, kind, title, aliases[], commander, place, state, body, link, meta, boost }
const norm = s => s.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/[’'`]/g,'')            // devil's -> devils
  .replace(/\b(\d+)(?:st|nd|rd|th)\b/g,'$1')   // 20th -> 20
  .replace(/[^a-z0-9]+/g,' ').trim();
const SYN = { 'high water mark':['the angle','copse of trees','bloody angle'], 'iron brigade':['black hat brigade'], … };
const W = { title:10, alias:8, commander:6, place:4, state:2, body:1 };
function scoreDoc(doc, qt){                    // qt = tokens (AND)
  let total = 0;
  for (const t of qt){
    let best = 0;
    for (const f in W){ const toks = doc.t[f]; if (!toks) continue;
      if (toks.has(t)) best = Math.max(best, W[f]);                       // whole-word
      else if (t.length>=2 && doc.p[f].some(x=>x.startsWith(t))) best = Math.max(best, W[f]*.6);  // prefix
      else if (t.length>=5 && withinEdit1(t, toks)) best = Math.max(best, W[f]*.35);              // typo
    }
    if (!best) return 0; total += best;
  }
  return total + (doc.tn.startsWith(qt.join(' ')) ? 8 : 0) + doc.boost;
}
```
* Order: score desc, then kind priority (exact-title first), stable; show ≤ 8 per kind with **"Show more"**; group headings with counts; `did you mean` when 0 results and an edit-1 title exists.
* Query normalisation handles "20th/20/twentieth", "Maine 20th" (order-free), state abbreviations, "St."/"Saint", diacritics; synonyms list in `data/search-synonyms.json` (owner-editable).
* Ship the pre-tokenised index as one file `data/search-index.v1.json` (≈ 150 KB raw, ≈ 35 KB brotli) instead of 12 fetches; or a tiny inverted index. Library option if the owner prefers: MiniSearch (MIT) or FlexSearch (Apache-2.0) vendored — verify current version/licence at adoption.
* Boost: exact designation, then vignettes/locations for well-known names, then units by strength.
**Golden-query acceptance suite** (Playwright + Node unit test): `20th maine`, `20 maine`, `maine 20th` → U-20ME first; `14th brooklyn` → U-84NY only; `devils den` = `devil's den` → Devil's Den first; `cushing` → vignette Cushing's Battery then The Angle; `wheatfield` → location first; `hancock` → Winfield Scott Hancock (after pagesA-19) then Captain Hancock; `iron brigade` → U-I-1-1; `bloody angle`/`high water mark`/`copse of trees` → The Angle; `lee` → ≤ 25 results, none via subsequence; `lincoln` → 0 results and the friendly empty state; p95 query latency < 30 ms on a 4×-throttled CPU.
**Moves** Function/Usability (C → A), H8 relevance.

---

## pagesA-19 — Index coverage: make the copy true, then go far beyond it  (MEDIUM, effort L)

**Evidence** Coverage today: 467 regiments (incl. 1 alias and 1 horse-artillery record), 24 vignettes, 30 key locations. Available in the repo but unindexed: 95 batteries (`battery_id`, gun type/count, commander), 88 brigades (`union_oob_brigades.json` 51 + `confederate_oob_corps_div_bde.json` 37; nicknames in designation "(Iron Brigade)", "(Irish Brigade)", "(Stannard's Vermont Brigade)"…), divisions (`*_corps_division*.json`, 9 Confederate), 12 corps, commanders (every OOB record has `commander.name`/`fate`; `commander_successions.json` has KIA/wounded successions), 137 chronology events (`chronology_day1..3.json`: 42 + …, each with `time`, `location`, `units_involved`), `terrain.json` `roads`/`structures`/`terrain_features`, and the 512 monuments (only 9 are in `data/monuments.json`; the app's 512 live inside the bundle — extraction needed, hand-off to app agent).
**Fix** Build a typed entity index (shared with Historian, Report, Regiment, Find-Ancestor — `data/entities.v1.json` built by `scripts/build-entities.mjs`): kinds `regiment | battery | brigade | division | corps | commander | vignette | event | location | monument | page`. Each doc: `id, kind, title, aliases, side, state, parents[], commander, dates{day,tick,clock}, place{lat,lng}, summary, sources[], link`. `page` docs give "Search Everything" its promised reach over the 20 tools (Compare, Camera, …). Copy in `<title>`/description must match coverage at every phase.
**Acceptance** search for "Battery" returns batteries; "Hancock", "Buford", "Longstreet" return people cards linking to the commander's unit pages; "Iron Brigade" returns the brigade and its 5 regiments; index count shown in the page ≥ 1,000 (proposed) and the meta description states real counts generated at build time.
**Depends on** pagesA-39 (build), Historian data-expansion plan (other agent), monuments extraction.

---

## pagesA-20 — Search UX/a11y completions: label, keyboard, highlight, URL state, live region, CLS  (HIGH, effort M)

Audit refs: A2/A5-class labels, D2, H2 (Esc), P1 (CLS).
**Evidence**
* `search.html:54` `<input id="search-box" type="text" placeholder="…" autofocus />` — no `<label>`/`aria-label` (probe: `unlabeled: ['input#search-box[type=text]']`), `type=text` (no clear button/keyboard "search" key), `autofocus` (raises the on-screen keyboard on phones and hides the results); border `--line` 1.2:1.
* No `<form role="search">`, no Enter behaviour, no `aria-live` for the count (`:62,:187`), `#empty`/`#loading` have no `role="status"`; results are plain links (`.result`) with `:hover` only; no arrow-key navigation; **Esc does nothing** (H2); `.kind` pill is 10 px (`:35`).
* No highlighting of matched terms; no result grouping; no recent searches; no URL state (`?q=`) so results can't be shared or restored with Back.
* **CLS 0.1466 [V-live, throttled mobile, 2/2 runs]**: the only shift source is `FOOTER#gtbg-footer` at ~1.0 s (the JS-built footer is inside the first viewport on phones, then 30 result cards render above it, `:149,:189-198`). Above the 0.1 "good" threshold.
* Every keystroke re-renders synchronously (no debounce, `innerHTML = ''`, `:151,:184`).
**Fix**
* Markup: `<form role="search" action="/search.html" method="get"><label for="q" class="vh">Search regiments, commanders, places and moments</label><input id="q" name="q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false"> <button>Search</button></form>`; remove `autofocus` on coarse pointers (`matchMedia('(pointer:fine)').matches && input.focus()`); results `<ol id="results" aria-label="Search results">`; count `role="status" aria-live="polite"`.
* Keyboard: `/` focuses the field from anywhere; ↓ moves to first result, ↑/↓ roving between results, Enter opens, **Esc clears then blurs**; Home/End; visible focus ring (site-wide).
* Highlighting: wrap matched tokens in `<mark>` (build from normalised offsets); show a 1-line snippet for body matches.
* URL state: `?q=…&type=…` via `history.replaceState` (debounced 300 ms) and read on load; browser Back/Forward restore.
* Empty state (no query): "Try" chips (20th Maine · Wheatfield · Cushing · Pickett's Charge · Little Round Top), recent searches (`localStorage`, try/catch), and 3 featured units; no arbitrary first-30 dump.
* Layout stability: reserve `min-height:70vh` for the results region, render a skeleton list (5 rows) instantly, mount the footer *after* the results container, or pre-render the footer statically (pagesA-05) so it never moves.
* Performance: debounce 120 ms (`requestIdleCallback` for index warm-up), render in chunks of 20, cap DOM at 60 rows + "Show more".
* Results carry a working destination (pagesA-03): unit → `/regiment.html?unit=ID` (works today: `regiment.html:252`) *and* "View on map" once the deep-link contract exists; vignette → documentary page anchor + map; location → map `?ll=`.
**Acceptance** axe 0 violations on `/search.html`; keyboard-only script completes a search and opens the 3rd result; NVDA/VoiceOver announces "12 results" after typing (manual, listed in test plan); Lighthouse mobile CLS ≤ 0.02 under throttling; `/search.html?q=cushing&type=vignette` renders the filtered list on load; Esc clears.
**Moves** Accessibility (C → A), UX, Perf (CLS red→green), H2.

---

# PART D — `report.html` (Battle Reports)

Inventory: 118 lines; inline CSS (`:19-43`) + IIFE (`:72-113`); 8 OOB fetches (`:73-78`, ~47 KB/13 requests total); a search field, a 10-row match list of `<div>`s, and a 9-row "report" card. Print CSS at `:37-42`.

## pagesA-21 — Report data bugs: `undefined / C-CAV-1`, blank alias report, "—" for computable rates, raw ids  (HIGH, effort S)

Audit refs: S1, H7.
**Evidence** [V-local, `reportflow.mjs`]
* `report.html:101` `parent_corps_id + ' / ' + parent_brigade_id`: 22 Confederate cavalry records (`confederate_cavalry.json`) have no `parent_corps_id` → the card shows **"undefined / C-CAV-1"** (measured for 1st South Carolina Cavalry).
* Choosing the alias match (`14th Brooklyn (alias for U-84NY)`) renders a report with commander "—", strength **0**, casualties **0**, rate "—", days "—" and key action "Dual designation alias -- see U-84NY." (dev-log copy).
* `:106` shows "—" whenever `casualty_percentage` is missing although `strength`/`casualties` exist for **221** units (e.g. 52nd New York 134/37).
* `:101` prints raw ids ("U-V / U-V-1-3") instead of the OOB names ("Fifth Corps / Third Brigade, First Division (Vincent's)"); the brigade/division/corps names and commanders exist in `oob/union_oob_brigades.json`, `union_oob_corps_division.json`, `confederate_oob_corps_div_bde.json`.
* `:107` "Days engaged" prints `2` or `1, 2, 3` (numbers, not dates; C3 date convention: July 1–3); 37 records have empty `days_engaged` → "—" (36 excluding the alias).
* `key_action`, `fate` contain ` -- ` double hyphens (`"Survived -- Medal of Honor 1893 for Gettysburg"`).
* Label "Initial strength" (`:62`) — the field is *strength engaged* per Busey & Martin; label is inaccurate.
**Fix** (one `unitView(r, oob)` function shared with Search/Regiment/Find-Ancestor, pagesA-39):
```js
const dayNames = {1:'July 1',2:'July 2',3:'July 3'};
function unitView(r, ctx){
  if (r.alias_for) return unitView(ctx.byId[r.alias_for], ctx);           // never render alias records
  const pct = r.casualty_percentage ?? (r.strength ? +(r.casualties/r.strength*100).toFixed(1) : null);
  return {
    title: r.designation, state: r.state,
    chain: [ctx.corps(r.parent_corps_id ?? ctx.brigade(r.parent_brigade_id)?.parent_corps_id)?.designation,
            ctx.brigade(r.parent_brigade_id)?.designation].filter(Boolean).join(' → '),  // no "undefined"
    commander: r.commander?.name ?? null, fate: r.commander?.fate ? typo(r.commander.fate) : null,
    strength: r.strength || null, casualties: r.casualties ?? null, pct,
    days: (r.days_engaged||[]).map(d=>dayNames[d]).join(', ') || 'Not engaged in the fighting',
  };
}
```
Rows whose value is `null` are **omitted**, not printed as "—". Typography pass (`typo()` turns ` -- ` into ` — `) at build time. Rename label to "Strength engaged".
**Acceptance** unit test over all 467 records: no output string contains `undefined`, `null`, `NaN`, ` -- `, or "alias for"; every unit with strength>0 has a rate; 22 cavalry reports show "Cavalry Corps"/brigade names; alias search results resolve to the real unit.
**Moves** Function/Polish (D → A-).

---

## pagesA-22 — Match list is not keyboard-operable; search field unlabeled  (HIGH, effort S)

Audit refs: A2, D2.
**Evidence** `report.html:90-94` `const div = document.createElement('div'); div.className='match'; … div.addEventListener('click', …)` — no `tabindex`, no `role`, no key handler (measured `tabindex=null role=null`); `site-nav.css:143-147` lists `button.match`, i.e. an earlier version used buttons and was regressed; `:54` `<input id="search" type="text">` unlabeled (probe `unlabeled: input#search`); results list has no live region; after choosing a match the card appears with no focus move (screen-reader users don't learn it changed); `:67` `onclick="window.print()"` inline handler.
**Fix** Render matches as `<li><button type="button" class="match">…</button></li>` in a `<ul aria-label="Matching units">`; arrow-key navigation; `role="status"` count; on selection set `#report` heading `tabindex="-1"` and focus it; label the field; replace inline `onclick` with `addEventListener` (CSP, pagesA-38); input `type="search"`, `enterkeyhint`, and 44 px rows.
**Acceptance** keyboard-only: type, ↓, Enter → report shown and focus on its `<h2>`; axe 0 violations; no inline handlers (grep).

---

## pagesA-23 — Print stylesheet: nav and footer print, empty shell prints, gold headings on white  (HIGH, effort S)

**Evidence** [V-local `Page.printToPDF`, `shots/report_maine_print.png`, `report_empty_print.png`]: `report.html:37-42` hides `header,#search,#matches,.print-btn,.back` but not `#gtbg-nav` or `#gtbg-footer` — the PDF text ends with "© 2026 … Privacy Terms Contact User Guide (PDF) ← GETTYSBURG Ask the Historian Explore"; `#report{display:block !important}` forces the card visible even when nothing was chosen (empty "State / Corps / Commander…" shell prints); `#report h2` stays gold `#c9a24b` on white (**2.4:1**) and `.row span:first-child` stays `#8a93a8`; no `@page` margins, no page header (site name/URL/date), no source/citation footer, no break control.
**Fix**
```css
@page { size: Letter; margin: 0.6in; }
@media print {
  #gtbg-nav, #gtbg-footer, header, .back, #search, #matches, .print-actions, .skip-link { display:none !important; }
  body { background:#fff; color:#111; font: 11pt/1.45 Georgia, serif; }
  #report { display:none !important; } #report.has-unit { display:block !important; border:0; padding:0; }
  #report h2 { color:#111; font-size:20pt; border-bottom:2px solid #111; }
  .row { break-inside:avoid; border-color:#999; } .row span:first-child { color:#444; }
  .report-print-head, .report-print-foot { display:block; }   /* site name · URL · generated date ; sources list */
  a[href]::after { content:""; }                              /* suppress URL spam */
}
```
Add a print-only header ("Gettysburg Interactive Map — Regimental Report — generated {date} — {canonical URL}") and footer (sources from OOB metadata + "Figures per Busey & Martin (1994); see /about.html#sources"). Add QR/short URL of the deep link (`/report.html?unit=U-20ME`).
**Acceptance** print emulation: no nav/footer text, contrast ≥ 7:1, fits one Letter/A4 page for the 20th Maine, empty state prints nothing (or "Choose a regiment"), PDF text extraction contains the source line and the URL.

---

## pagesA-24 — Report is sparse (S1): content model, featured/sample state, deep link  (HIGH, effort L)

Audit refs: S1.
**Evidence** The page is a search box with nothing else until a unit is chosen (`report.html:54-68`); the card just echoes the raw OOB record (10 fields, ids not names, no context); nothing links out (map, regiment story, vignettes); no default content; no `?unit=` deep link although `regiment.html` already reads `URLSearchParams` (`regiment.html:252`) and `regiment.html:247` links to `/?unit=…`; the meta, OG and Twitter descriptions promise reports on "any regiment or moment of the battle" (`:8,:11,:17`) but only regiments exist. Data available but unused: brigade/division/corps names and commanders, `commander_successions.json`, `vignettes[].units_featured`, `chronology_*.json[].units_involved`, `placements`/`density` keyframes (disposition + location over time), monuments, corps-level context from `casualty_apportionment.json`, per-file `metadata.sources`. **Warning:** `flag_notes` / `notes` in OOB records are *animation-engine instructions* ("CRITICAL: refused flank (bent back ~90 degrees) from arrival…") — whitelist fields; never render them.
**Fix — A+ content model** (all client-side, from data already deployed; one `unit-report.js` module):
1. **Landing state**: "Featured regiments" (12 curated cards with 1-line stakes: 20th Maine, 1st Minnesota, 26th North Carolina, 24th Michigan, 69th Pennsylvania, 14th Brooklyn (84th NY), 15th Alabama, 16th Maine, 6th Wisconsin, 1st Texas, 8th Ohio, 140th New York), "Browse by side → corps → brigade" tree, and a rendered **sample report** for the 20th Maine so the page shows its value before any interaction.
2. **URL state**: `/report.html?unit=U-20ME` (canonical per unit, `history.pushState`), shareable; per-unit `<title>`/description updated; JSON-LD `Article`-lite optional.
3. **Report sections** (`<article>`, `<dl>` for facts): Header (designation, side badge, state, "also known as"); *Command* (commander, fate, succession events); *Organisation* (corps → division → brigade with names, sibling regiments linked); *Numbers* (strength engaged, casualties, rate, **rank among 467 by rate** and a bar showing the corps' rate for context); *Timeline* (dispositions over time from placements/density with the shared clock, pagesA-36); *In the story* (vignettes/events that feature the unit with deep links); *Monuments* (name match); *Sources* (metadata.sources + record-level source); *Data notes* (e.g., "casualty rate computed from strength and casualties").
4. **Mini-map**: inline SVG schematic of the unit's known positions (no API key, prints cleanly) with link "Watch on the map" (pagesA-03).
5. **Actions**: Print / Save PDF, Copy link, Copy citation (Chicago style), Download JSON.
6. **Batteries and brigades**: extend beyond regiments (`battery_id`, brigade records) so the page fulfils "Battle Reports" for all ≈ 560 unit records (466 regiments + ≥ 95 batteries).
7. Copy fix: meta description/OG/Twitter → "Look up any regiment, battery or brigade at Gettysburg and print a one-page reference report" (until "moments" exist); if a "Moment report" is desired, add tick-snapshot reports later.
**Acceptance** `/report.html` (no params) shows featured cards + sample and no empty shell; `/report.html?unit=U-20ME` shows all sections with no dashes; keyboard and print pass (pagesA-22/23); Lighthouse a11y/SEO ≥ 95; content lint: no `flag_notes` text on page.
**Moves** Content depth (A-), Usability, S1.

---

## pagesA-25 — Report/Search/Camera copy claims vs coverage; field hygiene  (MEDIUM, effort S)

* `report.html:8,11,17` (meta/OG/Twitter descriptions) "any regiment **or moment**" → only regiments; `search.html:8` "every regiment, **battery**, vignette…" → batteries missing; `camera.html:48` "Follow Cam locks onto one regiment and tracks it through the whole battle" → false for 20 of 23 options (pagesA-31); `compare.html:55` "Units snap to the nearest recorded position at or before the tick" (honest but jargon). Fix each to match reality now (S), then expand coverage (pagesA-19/24/31).
* Add a `whitelist` for user-visible unit fields in `unitView()` and a CI check that fails if any rendered text equals a `flag_notes`/`notes` value.

---

# PART E — `compare.html` (Compare Two Moments)

Inventory: 285 lines; inline CSS (`:21-47`) + async IIFE (`:96-280`); **Mapbox GL JS v3.24.1** CSS + JS from `https://api.mapbox.com/mapbox-gl-js/v3.24.1/` loaded synchronously in `<head>` (`:19-20`; the deployed main bundle also contains v3.24.1 — `bundle.pretty.js:53873`, so versions are consistent); public token hard-coded (`:97`); styles `satellite-v9`, `dark-v11`, `light-v11`, DEM `mapbox.mapbox-terrain-dem-v1` (`:185-189,:225`); nine `placements_*.json` fetches (`:100-110,:133`, ~126 KB total); two independent `mapboxgl.Map` instances; `events.mapbox.com` telemetry fires.

## pagesA-26 — Mobile layout is broken: side-by-side maps at 375 px, toggle rows overflow  (HIGH, effort M)

Audit refs: S4 ("Compare style tabs clip 'Parc…'"), A3, D2.
**Evidence** [V-live screenshot `shots/live_compare_html_mobile.png`, V-local probe]
* `compare.html:29-33` `.split{display:flex; height:62vh; min-height:420px}`, `.pane{flex:1}`: two maps of ~187 px width each at 375 px; `.pane-controls{position:absolute; top:12px; left:12px; right:12px}` overlays ~110 px of each map with sliders and buttons.
* `:37` `.toggle-row{display:flex; gap:8px}` (no wrap) with four buttons ("Satellite/Dark/Parchment/3D Terrain"). `:38` asks 10 px type, but `site-nav.css:143-147` makes them **16 px** (pagesA-02): the row is ~330 px inside a 163-px control → overflows; the right pane paints over the left row ("Parc…" hidden) and the right row runs off-screen ("3D Terrain" at x≈528). The layout viewport widens to **528 px** (`innerWidth` 528 in mobile emulation) so the page loads zoomed-out with a dead strip on the right.
* Sliders: `input[type=range]` 16 px tall (`:34`), targets far below 44 px; 4 buttons × 2 rows of 26-px height; Mapbox controls 32×32; `min-height:420px` exceeds a 375-px-high landscape phone viewport.
**Fix**
```css
.split{ display:grid; grid-template-columns:1fr 1fr; height:clamp(420px, 68dvh, 780px); }
.pane{ position:relative; min-width:0; }
.pane-controls{ position:absolute; top:12px; left:12px; right:12px; }
@media (max-width: 760px){
  .split{ grid-template-columns:1fr; height:auto; }
  .pane{ height:min(62dvh, 520px); }
  .pane + .pane{ border-left:0; border-top:2px solid var(--gold); }
  .pane-controls{ position:static; background:var(--panel); border-radius:0; padding:12px 16px; }  /* controls above map, not over it */
  .pane .map{ position:relative; height:min(48dvh, 420px); }
  .seg{ display:flex; flex-wrap:wrap; gap:8px; } .seg button{ min-height:44px; padding:0 14px; font-size:14px; }
  input[type=range]{ height:44px; }                    /* 44px hit area, visual track via ::-webkit-slider-runnable-track */
  .mapboxgl-ctrl-group button{ width:44px; height:44px; }
}
@media (orientation:landscape) and (max-height:500px){ .split{ grid-template-columns:1fr 1fr; height:calc(100dvh - 64px); } }
```
* Use a real segmented control component (`role="radiogroup"` for style, `aria-pressed` toggle for terrain) and rename **Parchment → "Light"** (the code comment at `:188` admits it is `light-v11`); create the second map only when it enters the viewport (`IntersectionObserver`) and cap `devicePixelRatio` at 2 to cap GPU memory; use `dvh/svh` so browser chrome doesn't clip.
**Acceptance** widths 320/375/414/768: `innerWidth == device width`, no horizontal scroll, all controls fully visible and ≥ 44×44 on coarse pointers, each map ≥ 320 px tall and not covered by controls; landscape 812×375 shows both maps side by side within the viewport; visual regression baselines at 320/375/768/1440/2560.
**Moves** Mobile (D- → A-), A3, S4.

---

## pagesA-27 — Compare shows a third of the units, stale positions, and raw ids  (HIGH, effort L)

Audit refs: C4 (clock), H10 (counts), new.
**Evidence** [V-local data analysis; code]
* `compare.html:100-110,:133-146` loads only `placements_*.json`: **152 unit ids / 694 keyframes**; only **23 are regiments** (92 brigade ids like `U-I-1-1`, 29 batteries, 8 other). The main app additionally loads **38** `density_*.json` files (`bundle.pretty.js:96788-96831`) → **478 ids**. Units with any position at tick 60/300/553: Compare 56/123/147 vs app data 126/349/454.
* `:149-160` snaps to the latest keyframe ≤ tick with no age limit: at tick 300 the median keyframe is **150 ticks (12.5 sim-hours) old** and 85 % are older than 30 ticks (max gap 658 ticks) — "compare the Union line at 4 pm vs 6 pm" (the page's own example, `:55`) compares mostly stale dots.
* `:216` popup shows `<b>${p.unit_id}</b>` (e.g. `U-I-1-1`), `p.disposition`, "Strength: N" and "as of tick N" — raw ids and jargon; no designation, commander, side name, or clock time; `properties.strength` assumed numeric (`toLocaleString` would throw on undefined).
* Clock: `:120-129` `approxTimeForTick` = 5:00 + 5 min/tick from each day's first tick (dead "next day" branch) — differs from the app's `getTickTime` (`bundle.pretty.js:9371-9383`: Day 1 starts 6:00, Days 2–3 start 4:00): same tick, Compare vs map: tick 60 → 9:55 am vs 10:55 am; tick 300 → 11:10 am (seen in the live screenshot) vs 10:10 am (pagesA-36).
* Semantics: the main app carries the last position forward and interpolates only between adjacent ticks (`bundle.pretty.js:96266-96300` `y1`/`F4`), so Compare also lacks the app's motion between keyframes.
**Fix**
1. Shared `positions.js` loading the merged `positions.v1.json` (pagesA-39; placements + density, one file) and `units.v1.json` (id → designation, side, state, brigade/corps names, commander, strength engaged). API: `positions.at(tick,{maxAge})` returns `{unit, lat, lng, bearing, disposition, strength, asOfTick, ageTicks, interpolated}`.
2. Mirror the app's semantics (carry-forward + interpolation) and make them explicit: markers older than `maxAge` (default 24 ticks = 2 h) render as hollow rings with "last seen 3:40 pm" instead of pretending to be current; legend explains solid = confirmed, ring = last known.
3. Popup content: designation, side/corps/brigade, commander, disposition in plain words ("Line of battle"), strength then (`strength` field) vs engaged, clock time and "last confirmed N minutes earlier"; link "Regimental report" → `/report.html?unit=` and "Watch on map" (pagesA-03).
4. Add brigade-level markers as a distinct shape and a "Units shown: N of M" line (honest coverage).
**Acceptance** at ticks 60/300/553 the number of markers ≥ the app's (within 5 %; test computes both from data); no popup contains a raw id or "tick"; 95th percentile marker age ≤ 24 ticks for units flagged "confirmed"; unit tests for `positions.at()` (carry-forward, interpolation, maxAge).
**Depends on** pagesA-36 (clock), pagesA-39 (derived data), possibly app agent for the exact regiment-from-brigade placement rules (unknown, [?]).

---

## pagesA-28 — Map pages block first paint on a 1.8 MB third-party script; misleading and missing error handling  (HIGH, effort M)

Audit refs: P1, P2, P4-class (render-blocking), D1-style "no loading state".
**Evidence**
* `compare.html:19-20` (`camera.html:19-20` identical): render-blocking `<link rel=stylesheet>` (41 KB) and synchronous `<script src=…/mapbox-gl.js>` (1,796,551 B raw; ≈ 385 KB brotli) from `api.mapbox.com` in `<head>`; no `preconnect`, no `defer`.
* Measured [V-live, cache disabled; mobile = 375×812 DPR2, 4× CPU, 150 ms RTT, ~1.4 Mbps; desktop unthrottled; 2 runs each]: **compare mobile FCP 3.61–3.73 s, LCP 3.61–4.16 s, TBT 137–364 ms, 1.13 MB / 49 requests**; desktop FCP 0.64–0.68 s, CLS 0.013, 65–67 requests. FCP > 3 s is "Poor"; green is ≤ 1.8 s.
* Error handling: single `try/catch` (`:131,:275-279`) whose message says "Couldn't load placement data" for *any* failure — a blocked/failed `mapbox-gl.js` (`ReferenceError: mapboxgl is not defined` inside `setupPane`), lack of WebGL, or a token 403 all show that text; no `map.on('error')`; no WebGL detection; tile 403s (any origin not allowed by the token) fill the console (`qt at mapbox-gl.js:11:22827`) and leave a blank map with no explanation (verified with origin 127.0.0.1).
* `r.ok` is checked for placements (`:134`) — good; `r.json()` failures caught — good; nothing for Mapbox.
**Fix**
1. `<link rel="preconnect" href="https://api.mapbox.com" crossorigin>`; load the map library **after first paint**: `<script defer src=…>` with SRI (`integrity` + `crossorigin="anonymous"` — the CDN sends `Access-Control-Allow-Origin: *`; hash computed at build), CSS as a non-blocking `<link rel="stylesheet" media="print" onload="this.media='all'">` *or* keep blocking CSS but move it below the fold-critical styles. Page shell (header, controls skeleton, reserved map boxes with `aspect-ratio`) paints immediately; LCP becomes the H1/lead text.
2. Create maps only when `window.mapboxgl` exists (poll/`load` event with 10-s timeout) and when `canvas.getContext('webgl2')||getContext('webgl')` succeeds; otherwise show a friendly "Your browser can't show the interactive map — here is a text list of units at this moment" fallback (which is also the a11y table, pagesA-29).
3. Error taxonomy with retry buttons: *data* ("We couldn't load the troop positions"), *library* ("The map engine didn't load — check your connection or ad-blocker"), *tiles* (`map.on('error', e => e.error?.status === 403 …)` → "Map tiles are unavailable from this address", pagesA-38), each `role="alert"`.
4. One shared `map.js` (token config, style fallbacks, reduced-motion, resize, error UI, `data-map-ready` flag on first `idle`).
**Acceptance** Lighthouse mobile (Moto G Power, Slow-4G): Compare FCP ≤ 1.5 s, LCP ≤ 2.0 s, TBT ≤ 200 ms, CLS ≤ 0.05; blocking `mapbox-gl.js` absent from `renderBlockingResources`; Playwright blocks `api.mapbox.com/mapbox-gl-js/**` and asserts the library-error message; blocks WebGL (`--disable-gpu --disable-webgl`) and asserts the text fallback.
**Moves** Performance (mobile C → A), Reliability.

---

## pagesA-29 — Compare accessibility: unlabeled sliders, div-soup controls, no text alternative, no landmarks  (HIGH, effort M)

Audit refs: A2, A3, A4, D2.
**Evidence** [V-local probe] `compare.html:63-65` `<label style="…">Left: <span id="day-label-a">Day 1</span></label><input type="range" id="slider-a" min="1" max="675" value="60">` — the label has no `for`; probe: `unlabeled: ['input#slider-a[type=range]', 'input#slider-b[type=range]']`; no `aria-valuetext` (screen reader says "60"); `.tick-label` text 11 px (`:35`, probe smallFont 11px) and Tick number in `<b>`; style/terrain buttons have no `aria-pressed`/`role`; no `<main>` landmark (probe `main:false`) and no skip link; no text alternative for the map content (WCAG 1.1.1, 1.3.1); Mapbox zoom/compass buttons 32×32; popup `setHTML` (`:216`) unescaped; no keyboard shortcut to step time.
**Fix** `<section aria-labelledby="left-h"><h2 id="left-h">Left map</h2><label for="slider-a">Time on left map</label><input id="slider-a" type="range" …>` with `aria-valuetext="July 2, 4:25 PM (moment 300 of 675)"` updated on input; live region (`role=status`) announcing changes throttled to 500 ms; `<details><summary>Units on the left map (348)</summary>` containing a sortable table (designation, side, disposition, strength, last seen) — reuse for the hidden-fallback in pagesA-28; `<main id="main">` + skip link; keyboard: `[`/`]` step ±1 tick, `Shift+[`/`]` ±12 ticks (1 h), `A`/`B` focus sliders; ensure the map canvas exposes `aria-label` (Mapbox sets `role=region`/`aria-label="Map"`; extend with what it shows).
**Acceptance** axe 0 violations on `/compare.html` (default + popup open + mobile); screen-reader smoke test reads "Time on left map, July 2, 4:25 PM"; all controls reachable and operable by keyboard; touch targets ≥ 44 px.

---

## pagesA-30 — Compare feature completions for A+  (MEDIUM, effort L)

Order by value: (1) **Linked view**: "Sync pan & zoom" toggle (default on) using `move` events with a re-entrancy guard; "Swap sides"; (2) **Presets** ("Day 1 morning vs afternoon", "Little Round Top: 3 pm vs 6 pm", "Before and after Pickett's Charge") sourced from `chronology_*.json`/vignettes with correct clock (pagesA-36); (3) **URL state** `?a=<tick>&b=<tick>&style=&sync=1&ll=&z=` restored on load and "Copy link"; (4) **Curtain/swipe mode** (single map with a draggable divider, two GeoJSON layers clipped) as an alternative to side-by-side on phones; (5) **What changed** panel: counts of units that moved > 300 m, changed disposition, or lost > 10 % strength between A and B, list with deep links; (6) day chips + "jump to event" list; (7) Map auto-fit to units on load (currently a fixed `[-77.235, 39.81]` zoom 13 with only 2 dots at tick 60); (8) keep both pans in a stable bounding box (`maxBounds` around the battlefield) so users can't get lost; (9) print/export image (`map.getCanvas().toBlob`) with caption.
**Acceptance** each feature has a Playwright test; sync stays in lock-step within 1 frame; `?a=60&b=300` round-trips; "what changed" counts equal an independent Node computation on the data.

---

# PART F — `camera.html` (Camera Modes)

Inventory: 243 lines; inline CSS (`:21-40`) + async IIFE (`:63-238`), **no try/catch**; Mapbox GL 3.24.1 (same sync head include, `:19-20`), token `:64`; style `satellite-v9`; 9 placements files + 6 OOB files (**sequential** `await`s, `:77-78`); ~1 MB / 51 requests on phone, 1.5 MB / 98 requests desktop (tiles) [V-live]. `#atmosphere` overlay with `mix-blend-mode:multiply` (`:38`).

## pagesA-31 — "Follow a Unit" offers 23 regiments, 11 with a single position; default unit doesn't exist yet  (HIGH, effort L)

Audit refs: new; overpromise (H8 family).
**Evidence** [V-local data analysis, exact reimplementation of `camera.html:89-103`]
* Options = OOB regiments (6 files, cavalry/artillery excluded, `:72-75`) that have a *placement* keyframe → **23** (`U-12NJ, U-13VT, U-140NY, U-14VT, C-15AL, U-16ME, U-16MI, U-16VT, U-17ME, U-19MA, U-1MD-EH, U-1MN, U-1US-SS, U-20ME, U-27IN, U-2MA, C-2MS, C-42MS, U-44NY, U-6WI, U-83PA, U-84NY, U-8OH`). **11 have exactly one keyframe** (a single tick); only 20th Maine (13 keyframes, first at tick 225), 1st Minnesota (11, first 200), 15th Alabama (7, first 260) have more than 3.
* `:103` defaults to `U-20ME`; `:190-211` `placementAtTick` returns `null` before the first keyframe and `if (p) map.flyTo(...)` (`:208-209`) silently does nothing → choose "Follow a Unit" at tick 1 (the initial state) and nothing happens, no message.
* With positions this sparse the "follow" dot jumps between keyframes (median 26 ticks apart) — not "tracks it through the whole battle" (`:48`).
* Regiments with any keyframe across placements ∪ density: **217 of 467** (median 2 keyframes; 32 have ≥ 5); 231 of the 250 without own keyframes have a parent brigade that does have keyframes.
**Fix**
1. Use the merged positions (pagesA-27/39). For regiments without own keyframes inherit the brigade track (flag "approximate: brigade position") — confirm with the app's rules [?].
2. Replace the `<select>` with a labeled searchable combobox (type-ahead) over all units (regiments, batteries, brigades) grouped by side → corps, showing "first seen 4:05 PM July 2 · 13 positions" and disabling nothing; add **"Jump to when this unit first appears"** and automatically do it when following a unit that isn't present at the current time; message via `aria-live`: "20th Maine appears at 4:05 PM on July 2."
3. Follow view: unit label, breadcrumb trail of past positions (GeoJSON line), disposition chip ("Line of battle"), small timeline of dispositions; camera easing with hysteresis (don't retarget for < 50 m moves).
4. Copy: "Follow one regiment through the fighting — where we have positions for it." until coverage is real.
**Acceptance** follow options ≥ 217 (or all units with any position) and no option is a no-op: for every option, jumping to its first appearance shows its marker within the viewport; automated test iterates all options.

---

## pagesA-32 — Controls: no timeline, fixed 1 tick/s, jargon, small targets, unlabeled select  (HIGH, effort M)

Audit refs: H9 (speed labelling), D2, A3, A5.
**Evidence** `camera.html:50-56` controls: mode buttons, a `<select id="unit-select">` (no `<label>`; shown only in follow mode, `:33,:218`), play button, `Tick 1 / 675` text — no scrubber, no day jump, no speed control, no clock/date. `:226-236` play uses `setInterval(…, 1000)` (1 tick/s, wrap-around `tick >= 675 ? 1 : tick+1` with no pause at the end, not cleared on `pagehide`/tab hidden); button state toggled by rewriting `innerHTML` (`:228`) with no `aria-pressed`/label. Targets 31 px (`.mode-btn`) and 33 px (`.play-btn`) [V-local]; the play button text contrast 1.92:1 (pagesA-02). `#tick-display` (`:36`) 12 px muted. "Tick" is developer jargon (C4/H9 family).
**Fix**
* Add: `<input type="range" id="scrub" aria-label="Time in the battle">` with `aria-valuetext` = clock/date; day buttons (Day 1 / 2 / 3) ; speed segmented control (0.5× / 1× / 2× / 4× — label the unit honestly: "1× = 10 battle-minutes per second", H9); Replay at end instead of silent loop; `requestAnimationFrame` accumulation loop instead of `setInterval`; pause on `visibilitychange`.
* Keyboard: Space play/pause, ←/→ step 1 tick, Shift+←/→ 1 h, Home/End day start/end; visible shortcut hint; `aria-pressed` on Play (label toggled via `aria-label`, not innerHTML).
* Display "July 2 · 4:25 PM" + (optional) caption of the nearest chronology event (pagesA-35) instead of "Tick 1 / 675".
* Targets ≥ 44 px; controls in a sticky bottom bar on phones (thumb reach), map above.
**Acceptance** scrub to any moment ≤ 100 ms visual update; play/pause via keyboard; at 4× the clock advances 40 battle-minutes/s; `aria-valuetext` changes; axe 0 violations; no interval leaks (Playwright `page.evaluate(() => performance.now())` after hidden tab shows no advance).

---

## pagesA-33 — Camera: no error handling, request waterfall, blocking script, heavy phone cost  (HIGH, effort M)

Audit refs: P1, P2, D1.
**Evidence** `camera.html:63-238` is one `async` IIFE with no `try/catch`: any failed fetch or missing `mapboxgl` becomes an unhandled promise rejection and the page shows an empty map region with no message [code]; `:77` `await Promise.all(placements)` **then** `:78` `await Promise.all(oob)` (serial waterfall; 15 requests that could be one); `r.json()` without `r.ok`; blocking head script/CSS (pagesA-28). [V-live] mobile: **FCP 3.70–3.79 s, LCP same, TBT 416–491 ms (6–8 long tasks), 966 KB/51 requests**; desktop FCP 0.53 s, LCP 0.72 s, 1.50 MB/98 requests (tile burst). Play runs `render()` every second which calls `setData` + `fitBounds` (`:190-211`), so the phone GPU/CPU work is continuous.
**Fix** as pagesA-28 plus: parallelise data (or one merged file), try/catch + error UI with retry, `map.on('error')`, reduced update frequency (`setData` only when the visible set changes), cap `devicePixelRatio`, `fadeDuration: 0`, `maxTileCacheSize`, hide the atmosphere overlay when `prefers-reduced-motion` or low-power, pause everything when the tab is hidden.
**Acceptance** Lighthouse mobile FCP ≤ 1.5 s, TBT ≤ 200 ms; Playwright: `page.route('**/data/**', r => r.abort())` shows the friendly error; blocking mapbox script shows the library error; CPU profile shows < 20 % main-thread busy during playback at 4× on a 4× throttled CPU.

---

## pagesA-34 — S3 "canvas painted incompletely": not reproducible; hardening + atmosphere model  (MEDIUM, effort M)

Audit refs: S3.
**Evidence (negative + hypotheses)**: I loaded `https://gettysburginteractivemap.com/camera.html` in headless Chrome (SwiftShader WebGL) at 1440×900 and 375×812: screenshots at 1.8 s and 9 s show fully painted satellite tiles, dots, and controls (`shots/live_camera_html_*.png`, `live_early_camera_html_mobile.png`). The audit's partial paint therefore may be a capture-timing artifact. Plausible causes to eliminate: (1) capture before tiles finish after `fitBounds({duration:800})` fired from the `load` handler (`:157-173,:206`); (2) `#atmosphere{position:absolute; inset:0; mix-blend-mode:multiply; transition:background 1.5s}` over the WebGL canvas (`:38-39`) — blend modes over WebGL force an isolated compositing group and are a known source of stale/partial frames in remote/headless/low-end GPU setups [?, not reproduced]; (3) the container `#map{height:62vh;min-height:420px}` resized by emulation without `map.resize()` (Mapbox v3 observes container size, so unlikely); (4) fetch failure leaving the map uncreated (no try/catch; pagesA-33).
**Fix** (removes every candidate): (a) replace the blended overlay with a plain-alpha `rgba` overlay (`mix-blend-mode:normal`) *or* drive the mood through the map (raster paint properties `raster-brightness-max`, `raster-saturation` on the satellite layer, or `map.setFog`); (b) expose `document.body.dataset.mapReady = '1'` on the first `idle` event and have tests wait on it; (c) call `map.resize()` on `visualViewport`/`orientationchange`; (d) skeleton background (`#0d0d18`) behind the map container so unpainted areas never look broken; (e) `dvh` heights.
**Atmosphere model** (`camera.html:175-188`): hard-coded hour bands (dawn 5–7, day 7–17, dusk 17–20, night after) applied to the page's clock, which itself disagrees with history and with the app (pagesA-36). Replace with a solar model for the battlefield (lat ≈ 39.82°N, lon ≈ −77.23°) and the real dates (1–3 July 1863, local mean time): compute sunrise/sunset/altitude with the NOAA solar-position equations (public algorithm, ~30 lines, no dependency) and drive tint alpha from altitude (`smoothstep`); test that sunrise/sunset land in the expected windows (roughly 4:45–5:00 and 7:30–7:45 local — verify numerically, do not hard-code).
**Acceptance** 20/20 headless loads on a throttled profile have `dataset.mapReady` and an entirely painted canvas (pixel-sampling test: < 1 % transparent/black pixels inside the map box after `idle`); overlay has no `mix-blend-mode`; sun model unit tests.
**Status** S3 remains "unreproduced — hardened", not "fixed".

---

## pagesA-35 — Director Mode heuristic and camera feature completions  (MEDIUM, effort L)

**Evidence** `camera.html:125-142` `densestClusterBounds` counts *all* placements in ~1-km grid cells (`CELL=0.01`) regardless of disposition (bivouac/reserve counted equally), picks the max cell each tick and `fitBounds`es to it (`:206`, 800 ms, `maxZoom:15`) — so at night (all units in bivouac) it "auto-flies to wherever the most units are engaged" (`:48`) is false, and the camera retargets every second; it also fights the user (after a drag the next tick recenters); `Math.round(lat/CELL)` cell boundaries split clusters; no smoothing, no captions.
**Fix / completions**
* Engagement score per unit by disposition (`Charging Line` 3, `Line of Battle` 2, `Deployed Artillery` 2, `Skirmish Line` 1.5, `Chaotic Retreat` 1.5, `Mounted/Dismounted Cavalry` 1, `Line of March` .5, `Reserve/Bivouac/Limbered` .1) × sqrt(strength); score cells with a 3×3 kernel; **hysteresis** (retarget only if a new cell > 1.25× current for ≥ 6 s wall-clock), minimum dwell, `easeTo` with duration scaled by distance.
* **Auto/Manual handoff**: on `dragstart/zoomstart` from a user gesture switch to Manual and show a "Resume Director" button; never recenter while Manual.
* **Event cues**: `chronology_day*.json` (137 events, each with `tick`, `time`, `location`, `units_involved`, `significance` = critical 45 / high 73 / medium 16 / low 3; the `flag` field on 66 of them is engine-internal — never render it) → the director flies to critical/high events and shows a caption ("Vincent's brigade reaches Little Round Top"); captions in an `aria-live=polite` region announced only on change.
* Follow mode: trail, label, dispositions timeline (pagesA-31); "Cinematic" toggle adds gentle bearing/pitch; `prefers-reduced-motion` → jump cuts (`duration:0`).
* Mobile: bottom control bar, gestures don't fight playback.
**Acceptance** camera retargets ≤ 1× per 6 s during a Day-2 playback; at night ticks it holds position and says "Quiet — armies in camp"; Manual mode never recenters; reduced-motion emulation has `duration 0`; captions match chronology data (test compares).

---

# PART G — Cross-cutting fixes for these pages

## pagesA-36 — One clock: three implementations disagree with each other, the app, the schema, and history  (HIGH, effort M — depends on the time-facts decision)

Audit refs: C4, C3.
**Evidence**
* Sub-pages: `compare.html:120-129` (`approxTimeForTick`: 5:00 am + 5 min × (tick − first tick of that day), each day) and `camera.html:175-179` (`hourForTick`, same base) — plus `living-ledger.html` (pages-B).
* App: `bundle.pretty.js:9371-9383` `getTickTime`: `R = (P===1 ? 6*60 : 4*60) + H` → Day 1 starts 6:00, Days 2 and 3 start **4:00**; header uses `July ${l + 2}, 1863` in several places (`bundle.pretty.js:97428,100842,101006` — the +2-day bug, C3).
* Data: `data/placement_schema.json` says tick 1 = 5:00 am; `ticks_per_day` claims Day 1 ends "12:40am July 2", Day 2 "7:50pm July 2", Day 3 "8:05pm July 3" while every day has 225 ticks (225 × 5 min = 18 h 45 m ⇒ 11:45 pm); `placements_day3_ticks601_675.json` metadata says ticks 601–675 are "approximately 3:20pm to 8:05pm" (75 ticks = 6 h 15 m, i.e. not 5 min/tick if the day starts at 5:00).
* Result at the same tick: Compare 60 → 9:55 am vs app 10:55 am (Compare −1 h); tick 300 → Compare 11:10 am (seen in the live screenshot) vs app 10:10 am (Compare +1 h) [computed from code; Compare's labels verified live].
**Fix (contract; the *values* come from the C4 time-facts work)**
* `lib/clock.js` (ES module, no deps) driven by one data table (`data/clock.v1.json`) of piecewise anchors per day, each anchor carrying a source citation: `[{tick:1,day:1,clock:'05:30'…}, …]`; API: `tickToTime(tick) → {day, date:'July 2, 1863', clock:'4:25 PM', minutes, label}`, `timeToTick(day, 'h:mm AM')`, `dayOf(tick)`, `sun(tick) → {altitudeDeg, isDaylight, phase}`.
* Every consumer imports it: app `getTickTime` (via patch/rebuild), Compare/Camera/Dashboard/Search/Report/Living-Ledger/Documentary/Sandbox; **no `* 5`/`% 12` clock arithmetic elsewhere** (ESLint `no-restricted-syntax` + grep in CI).
* User-facing "Tick N" text is replaced by date+clock everywhere on these pages.
**Acceptance** unit tests: anchors round-trip; monotonic; every anchor cites a source; 20 sampled ticks render identical clock strings in app, Compare, Camera and Report; CI grep finds no local clock functions.
**Moves** Historical consistency (C- → A-), Fit&finish. **Depends on** time-facts agent (values), app agent (getTickTime patch).

---

## pagesA-37 — Head/SEO: corrupt shared OG image, no structured data, duplicate URL forms  (HIGH, effort M)

Audit refs: T1, T3, E2, E5.
**Evidence**
* Every page in scope: `<meta property="og:image" content="https://gettysburginteractivemap.com/screenshots/day3.png">` and `twitter:image` (`dashboard.html:14,18`, `search.html:14,18`, `compare.html:14,18`, `camera.html:14,18`, `report.html:14,18`; same in `index.html`). `screenshots/day1.png` and `day3.png` are **byte-identical** (17,585 B, md5 `3f6646c99f3416a1aa35fea67bed21c5`) and **corrupt**: IHDR = 1280×720 RGB but the IDAT inflates to 3,687,120 bytes (= RGBA rows) instead of 2,765,520; PIL raises "unrecognized data stream"; Chrome renders a blank light-grey frame with a green top line (`shots/og_day3_rendered.png`); the image API rejected it. The PWA `manifest.json` "screenshots" entries point to the same files. So every shared link on every network gets a blank card, and 1280×720 (16:9) is not the 1.91:1 (1200×630) Open-Graph ratio.
* Missing on all five pages: `og:site_name`, `og:image:width/height/alt`, `twitter:image:alt`, `<link rel="icon">`/`apple-touch-icon`/`manifest` (only `index.html` has icons), any JSON-LD (`grep application/ld+json` = 0), `<noscript>` content, `robots` hints. Titles are "Search — Gettysburg Animated Battlefield Map" (vague; site-name mismatch E2).
* Duplicate URL forms [V-live]: `/dashboard` → 200 and `/dashboard.html` → 200; `/index.html` → 200 (T3); canonical tags point to `.html`. Netlify rewrote `href="/index.html"` to `'/'` in the served HTML [V-live diff] — i.e. post-processing is active but no canonical redirect exists.
* Thin indexable text: `dashboard`, `compare`, `camera`, `report` have almost no server-rendered prose (content is built by JS) — weak for T1.
**Fix**
1. Regenerate real assets: `og/<page>.png` at **1200×630** (dark brand background, page title, one-line promise, map crop), 8-bit RGB, < 200 KB, plus `og/default.png`; replace `screenshots/day1.png`/`day3.png` with genuine, decodable 1280×720 screenshots for the manifest; validate with `pngcheck`/PIL in CI and with the Facebook Sharing Debugger / LinkedIn Post Inspector after deploy.
2. Head template (pagesA-39) emits per page: unique `<title>` "Casualty Dashboard — Gettysburg Interactive Map", unique ≤ 155-char description, canonical, OG (type, site_name, title, description, url, image + width/height/alt), Twitter card + alt, icon/apple-touch-icon/manifest links, `theme-color`, `color-scheme`.
3. JSON-LD: `WebPage` + `BreadcrumbList` (Home › Data & Records › Casualty Dashboard); `Dataset` on the dashboard (measurementTechnique, isBasedOn Busey & Martin, CSV `distribution`); `WebApplication` stays on home with `potentialAction: SearchAction` → `/search.html?q={search_term_string}`.
4. Canonical policy: choose extensionless URLs; `netlify.toml` `[[redirects]] from="/*.html" to="/:splat" status=301 force=true` and `from="/index.html" to="/" status=301 force=true` (verify against the Pretty-URLs setting to avoid loops; test with `curl -I` for all 20 pages), update sitemap + internal links + canonicals together.
5. Add crawlable static text: a 2–3 paragraph intro, the data table (dashboard), an explanatory "How this works" section on Compare/Camera, and `<noscript>` blocks.
**Acceptance** `pngcheck` clean; scrapers show unique 1200×630 cards for each page; `curl -sI /dashboard.html` → 301 to `/dashboard`; Rich Results/Schema validator passes; Lighthouse SEO 100 with "structured data valid"; Search Console URL Inspection shows the extensionless canonical.
**Moves** SEO (A- → A+), T1, T3, E2.

---

## pagesA-38 — External dependencies, Mapbox token, and CSP enforceability  (HIGH, effort M)

Audit refs: X1 (correction), X3, X5, P5.
**Evidence**
* Third-party on these pages: `api.mapbox.com` (GL JS/CSS 3.24.1, styles, tiles, DEM), `events.mapbox.com` (telemetry, fires on map load) on Compare/Camera; Netlify RUM (`/.netlify/scripts/rum`, injected by Netlify, connects to `ingesteer.services-prod.nsvcs.net`) on all pages. Dashboard/Search/Report have no other third-party.
* Token `pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoi…` is duplicated in `compare.html:97`, `camera.html:64` (and other map pages). **Verified [V-live]: tile requests (`/v4/mapbox.satellite/14/4676/6213.webp`) return 200 with Referer `https://gettysburginteractivemap.com/camera.html` but 403 with Referer `https://example.org/`, `http://127.0.0.1:8765/`, or none; the styles endpoint (`/styles/v1/mapbox/satellite-v9`) returned 200 for every Referer.** So the token *is* URL-restricted for tiles (correcting audit X1's "unrestricted") but style JSON isn't gated. Consequences: local dev and Netlify deploy previews (`*.netlify.app`) render blank maps with 403 console errors.
* `netlify.toml` CSP is Report-Only with `'unsafe-inline'` and lacks the RUM host; enforcement blockers on these pages: inline `<style>` (all five), inline `<script>` (all five), static inline `style=""` attributes (`dashboard.html:66,70`; `compare.html:59,63,77`; `search.html:62,64`; `report.html:51`) and runtime `innerHTML` strings carrying `style=` (`dashboard.html:199,212`) — CSSOM assignments such as `footnote.style.cssText` (`:260`) are *not* blocked; inline `onclick` (`report.html:67`).
**Fix**
1. One `config.js` (`export const MAPBOX_TOKEN`, style URLs, mapbox version) imported by every map page; rotate nothing unless leaked; in Mapbox: keep URL restrictions, add `https://www.gettysburginteractivemap.com/*` (if www exists), decide on `*.netlify.app` for previews **or** create a second `pk` token for previews/dev with its own restriction and quota, and select it by hostname; restrict scopes to styles:tiles, styles:read, fonts:read, (no secret scopes).
2. Pin Mapbox 3.24.1 with SRI + `crossorigin="anonymous"` on both CDN tags; mirror version in one constant; test that the version equals the bundle's.
3. Make the pages CSP-clean: move CSS/JS to files (pagesA-39), replace `style=""` with classes, no inline handlers, no `eval`. Target enforced policy for these pages:
   ```
   default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
   script-src 'self' https://api.mapbox.com;
   style-src 'self' https://api.mapbox.com;            /* + 'unsafe-inline' only as style-src-attr if Mapbox popups require it — test */
   img-src 'self' data: blob: https://api.mapbox.com https://*.tiles.mapbox.com;
   connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://ingesteer.services-prod.nsvcs.net;
   worker-src 'self' blob:; child-src blob:; font-src 'self'; form-action 'self'
   ```
   Run Report-Only with a reporting endpoint for one release; flip to enforcing when the violation log is empty (X3).
4. Privacy page: disclose Mapbox telemetry (`events.mapbox.com`) and RUM (X5) since Compare/Camera trigger them.
**Acceptance** Playwright from a preview URL renders tiles; CSP enforced with 0 violations on the 5 pages in Chromium+Firefox; `curl` header check; automated test asserts Mapbox script version == bundle version.

---

## pagesA-39 — Shared-component extraction and derived-data pipeline (the structural fix)  (LARGE, effort L–XL)

Audit refs: N1, P3, P4, X3, and enabler for every page-level item.
**Evidence** Five pages, ~1,100 lines, duplicate `:root` tokens and ~20 lines of head boilerplate each, 4 different OOB fetch lists (`search.html:69-73`, `report.html:73-77`, `camera.html:72-75`, `regiment.html` …), 3 clock functions, 3 error-handling styles, `esc()` private to the nav. There is no source control or test for these pages (N1) and `SRC_DIR` is a copy of the deploy.
**Target layout** (a small repo, plain ES modules, one Node build script, no framework):
```
gtbg-site/
  pages/                 dashboard.html search.html compare.html camera.html report.html ...   (body markup only; front-matter: id, group, title, description, ogImage)
  partials/              head.html  nav.html  footer.html  sprite.svg
  css/                   tokens.css  base.css  components.css  pages/<page>.css
  js/
    lib/  dom.js(esc, html``)  data.js(fetchJSON w/ timeout/retry, cache)  clock.js  units.js(unitView)  positions.js
          map.js(config, init, errors, ready flag)  search.js(index, score)  a11y.js(announce, focusTrap, roving)  deeplink.js
    nav.js               menu behaviour + back-link logic (no markup building)
    pages/<page>.js      one module per page (no inline JS)
  data/ (source)  →  build →  dist/data/derived/{units,positions,search-index,casualties,clock,manifest}.v1.<hash>.json
  scripts/  build.mjs  validate-data.mjs  build-search-index.mjs  build-og-images.mjs  check-links.mjs
  tests/    playwright/*.spec.ts  data/*.test.mjs
  netlify.toml
```
* `pages.manifest.json` is the **single source of truth**: id, path, group, icon, title, description, OG image, priority; it generates nav HTML, footer links, sitemap.xml (with `lastmod`), `<head>`, breadcrumbs JSON-LD, the Search "pages" docs and the Historian's tool directory. It replaces `GROUPS` in `site-nav.js` and the app overlay's copy (`index.html:307-311` already reads `GTBG_MENU`).
* Build steps (Node ≥ 20, no bundler required; esbuild optional): render templates → inline sprite once → hash & rewrite asset URLs → emit derived JSON → run validators → emit `dist/`. Output filenames **lower-case, hash-suffixed** (avoids the case-mangling seen in the deploy zip, N1).
* Derived data replaces per-page fetch lists: `units.v1` (466 regiments + batteries + brigades/divisions/corps with names, parents, commanders, sources, computed rate), `positions.v1` (id → keyframes from placements+density; ≈ 1,800 keyframes, a few tens of KB compressed), `search-index.v1`, `casualties.v1` (validated), `clock.v1`. Pages fetch 1–2 files (or inline the small ones), down from 8–12 (search 12, report 8, camera 15, compare 9).
* Component CSS (`components.css`): `.btn`, `.btn-primary`, `.chip`, `.seg`, `.card`, `.stat`, `.field`, `.table`, `.tag`, `.skeleton`, `.vh` (visually hidden), `.skip-link`; tokens: colours (contrast-validated), spacing, radii, `--tap:44px`, `--fs-*` (rem, min 0.75), `--line-strong`, `--focus`.
* Migration order (each step ships independently): (1) hotfixes pagesA-01/02/10/21/22/23 in place; (2) add git + Playwright + CI on current files; (3) extract `tokens.css`/`base.css`/`components.css`; (4) extract `lib/*` and convert pages one by one (dashboard → report → search → compare → camera); (5) introduce the manifest + build + partials; (6) derived data; (7) enforce CSP.
**Acceptance** `npm run build` (later) produces a `dist/` where: no inline `<script>`/`<style>`/`style=`; every page's head validated by a schema; all 20 nav links present in static HTML; Lighthouse ≥ 95 in 4 categories (pagesA-43); the repo builds from a clean clone; `SRC_DIR` is no longer the source of truth.
**Moves** Every category via consistency; unblocks CSP enforcement (X3), P3, N1.

---

## pagesA-40 — Tests, CI and source control for the sub-pages  (HIGH, effort M)

Audit refs: N1, and the reason RC-1/RC-2 shipped.
**Suite** (Playwright + axe-core + Lighthouse-CI + Node unit tests; run on every PR against a Netlify deploy preview; matrix = Chromium desktop 1440×900, Chromium mobile 375×812 (touch), Chromium 320×568, 768×1024, 2560×1440, landscape 812×375, plus WebKit and Firefox smoke):
1. `no-duplicate-ids.spec` — every page, after `networkidle` and +3 s (would have caught pagesA-01).
2. `race-injection.spec` — `page.route('**/data/**')` delay {0,300,1500,4000} ms; dashboard chart present, search/report functional (pagesA-01).
3. `axe.spec` — `wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice`, default state + menu open + result list + popup open; **contrast** tokens spec computing every button/chip state (pagesA-02).
4. `target-size.spec` — under `hasTouch` all interactive ≥ 44×44 CSS px (except inline text links per WCAG exception) and ≥ 24×24 on fine pointers.
5. `layout.spec` — at each width `scrollWidth === innerWidth`; mobile emulation `innerWidth === device width` (would have caught the 446/528-px expansion); no element clipped by an ancestor (`overflow`), min computed font ≥ 12 px.
6. `console-clean.spec` — zero `console.error/warn` and zero failed requests (allow-list none).
7. Page specs: `dashboard` (no "undefined", no snake_case, 12 series, table rows = 12, metric toggle); `search` (golden queries table from pagesA-18, URL state, keyboard, Esc); `report` (no `undefined`, alias resolved, print emulation has no nav/footer, featured + sample states); `compare` (stacked on mobile, sync, URL state, coverage ≥ app); `camera` (all follow options resolve, scrubber, director hysteresis, S3 pixel test); `nav` (aria-current, focus return, menu on mobile).
8. `seo.spec` — unique title/description/canonical/OG per page; og images decode and are 1200×630; JSON-LD parses; sitemap URLs 200 with self-canonical; no duplicate URL forms.
9. Data tests (`validate-data.mjs`): casualty sums, OOB ids referenced by placements/vignettes/chronology exist, tick ranges, no alias records rendered, no `flag_notes` text in output.
10. Lighthouse-CI budgets per page (mobile & desktop): Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO 100; LCP ≤ 2.0 s, TBT ≤ 150 ms, CLS ≤ 0.05, JS transferred ≤ 60 KB (non-map) / ≤ 150 KB before the map library.
11. Manual checklist per release: NVDA+Chrome, VoiceOver+Safari (macOS/iOS), TalkBack; real iPhone SE/Android low-end for maps; forced-colors mode; 200 % zoom / 400 % reflow.
**Repo/process** put `SRC_DIR` contents in git; protect `main`; Netlify deploy previews per PR (with the preview token/URL allow-list from pagesA-38); CI blocks merge on any failure; `CODEOWNERS`, `CONTRIBUTING.md` (voice guide, tokens, how to add a page via the manifest).
**Acceptance** the suite fails on `main@today` in exactly the ways described here (dup ids, contrast, layout expansion, CLS, `undefined`) and passes after the fixes.

---

## pagesA-41 — Copy, voice and typography pass  (MEDIUM, effort S–M)

Museum voice: plain, specific, second-person sparingly, no developer talk ("tick", "index", file paths, "data note"), sentence case, consistent product name.
| Where | Now | Replace with |
|---|---|---|
| dashboard `:69` | "Couldn't load casualty data. This page reads `/data/casualty_apportionment.json` directly — try reloading." | "We couldn't load the casualty figures. Check your connection and try again." + button |
| dashboard `:257-265` | "⚠ Data note: … should be reconciled against the underlying research." | removed; "About these figures" disclosure (pagesA-11) |
| dashboard card | `highest_single_regiment_rate` / `undefined` | "Highest single-regiment loss rate · Union — 1st Minnesota, 85.5 %" (pagesA-10) |
| dashboard `h1`/sub | "Casualty & Strength Dashboard" / "Corps-by-corps effective strength …" | "Casualty dashboard" / "How each corps' strength fell across July 1–3 (modeled from Busey & Martin's corps totals)." |
| search `:61,:163,:64` | "Building search index…", "Couldn't build the search index -- try reloading.", "No results. Try a different search term." | "Searching…", "We couldn't load the search data. Please try again.", "No matches for “{q}”. Try a unit, commander, place, or moment." |
| search rows | "14th Brooklyn (alias for U-84NY) · New York · Commander unrecorded ·" | one row "84th New York (14th Brooklyn) · New York · Col. Edward Fowler · 42.5 % casualties" |
| compare `:55,:58` | "Set each map to a different tick … Units snap to the nearest recorded position at or before the tick you choose." / "This tool reads the same public /data/*.json files … try reloading." | "Set each map to a different moment and compare where the units stood. Solid dots are confirmed positions; rings show where a unit was last seen." / "We couldn't load the troop positions. Please try again." |
| compare `:69` | "Parchment" (is Mapbox Light) | "Light" |
| camera `:48,:55` | "…tracks it through the whole battle." / "Tick 1 / 675" | "Follow one regiment through the fighting, where we have positions for it." / "July 1 · 6:00 AM" |
| report meta `:8` | "…any regiment or moment of the battle…" | "Look up any regiment, battery or brigade at Gettysburg and print a one-page reference report." |
| report row | "Initial strength" / "Days engaged 2" / "undefined / C-CAV-1" | "Strength engaged" / "July 2" / "Cavalry Corps → First Brigade" |
| data strings (all) | "Survived -- Medal of Honor 1893…", "Dual designation alias -- see U-84NY." | em dash (`—`) via build-time `typo()`; alias records never displayed |
| footer/nav | "© 2026 Gettysburg Animated Battlefield Map"; button "Explore" + group "Explore" + overlay "Extra Features" | one product name (decide E2), button "All tools" |
Also: `Intl.NumberFormat('en-US')` for numbers; consistent "July 2, 4:25 PM" date/time format; abbreviations spelled on first use (OOB, OR).
**Acceptance** grep-based lint over rendered text finds none of: `--`, `undefined`, `tick`, `Tick`, `alias for`, `.json`, `Commander unrecorded`, snake_case words; copy review checklist signed off.

---

## pagesA-42 — Type scale, touch targets and layout tokens  (MEDIUM, effort M)

Audit refs: A3, A4, D2, S4.
**Evidence** [V-local probes] Font sizes below 12 px present: dashboard `.stat-card .lbl` 11 px (`:48`), `.axis-label` 10 px (`:33`), `.day-label` 11 px; search `.kind` 10 px (`:35`); compare `.tick-label` 11 px (`:35`); nav 9.5/11/11.5 px (pagesA-04). Interactive targets < 44 px per page: dashboard 10 (checkboxes 13×13, links 14–18 px), search 12 (chips 26 px), compare 32 (18 on mobile), camera 18/15, report 9 (input 43 px). Layout: `header{padding:32px 5% 16px}` is left-aligned at 5 % while `main{max-width:1100px; margin:0 auto}` (dashboard `:23,:27`) / 800 px (search `:26`) / 700 px (report `:26`) centres content — heading and content don't share a left edge (visible in the dashboard screenshot: heading x=72, content x=242). Fonts: pages use the generic `sans-serif`/`Georgia` while the nav uses `system-ui`.
**Fix** tokens in `tokens.css`: `--fs-1: .75rem` (12 px floor) … `--fs-6: 2.375rem`; body 1rem; `--tap: 44px` with `@media (pointer:fine){ --tap: 32px }`; `--content: min(1100px, 100% - 2*max(16px, 5vw))`; one `.container` used by header, main and footer; `scroll-padding-top` for the sticky nav; `:root{color-scheme:dark}` so native controls/scrollbars match; unified `--sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, `--serif: Georgia, "Times New Roman", serif`; `:focus-visible` ring token; `prefers-contrast: more` variant (borders 4.5:1).
**Acceptance** `layout.spec` + `target-size.spec` pass; computed min font ≥ 12 px on every page; header/main/footer left edges equal at 1440.

---

## pagesA-43 — Performance budgets and how each page turns green  (MEDIUM, effort M)

| Page | Measured now [V-live, mobile-throttled unless noted] | Target | How |
|---|---|---|---|
| dashboard | FCP 0.88–1.18 s, LCP same, TBT 77–159 ms, CLS 0 | FCP ≤ 1.2 s, TBT ≤ 100 ms | inline the 3-KB JSON (no fetch), skeleton, keep JS < 30 KB; nav/footer pre-rendered |
| search | FCP 0.9 s (one 8.5-s outlier run), **CLS 0.147**, 74 KB/17 req | CLS ≤ 0.02, ≤ 3 requests | pre-rendered footer, reserved results area, single `search-index.v1.json` (or inlined), chunked render |
| report | FCP 0.77–1.52 s, TBT 79–297 ms, 47 KB/13 req | FCP ≤ 1.2 s, ≤ 2 requests | `units.v1.json` instead of 8 files; no work before first paint |
| compare | **FCP 3.61–3.73 s, LCP 3.61–4.16 s**, TBT 137–364 ms, 1.13 MB/49 req | FCP ≤ 1.5 s, LCP ≤ 2.0 s | defer `mapbox-gl.js` (+SRI, preconnect), shell first, lazy 2nd map, cap DPR 2 |
| camera | **FCP 3.70–3.79 s**, TBT 416–491 ms, 966 KB/51 req | FCP ≤ 1.5 s, TBT ≤ 200 ms | same + parallel/merged data, throttle `setData`, pause when hidden |
| (desktop, all) | FCP 0.4–1.2 s; camera/compare LCP 0.7 s | keep | — |
Common: fingerprinted immutable CSS/JS (`site-nav.*` currently `max-age=0,must-revalidate` — pagesA-09), remove the body fade animation, `Cache-Control` for `/data/*` `max-age=3600, stale-while-revalidate=86400` and versioned filenames for derived data, `<link rel=modulepreload>` for the page module, no layout-affecting late injections. RUM: add `web-vitals` attribution (INP target element) to the pages or rely on Netlify RUM p75 ≤ LCP 2.5 s / INP 200 ms / CLS 0.1 / FCP 1.8 s. Lighthouse-CI budgets in pagesA-40.
Measurement caveat: headless SwiftShader Chrome, cache disabled, 2 runs per cell — directional; confirm with Lighthouse/CrUX after changes.

---

## pagesA-44 — Motion, visibility and reduced-motion in map pages  (LOW, effort S)

`camera.html:206,209` `fitBounds/flyTo` (800 ms) every tick and `compare.html:263-264` `easeTo(600)` ignore `prefers-reduced-motion`; playback `setInterval` isn't paused on `visibilitychange`/`pagehide`; `site-nav.css:41` glow animation infinite (pagesA-09). **Fix** `const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches` → `duration: 0` and no overlay transition; pause timers when hidden; `will-change` not needed. **Acceptance** emulate `reduce` → no animated camera moves (`map.isMoving()` false after 50 ms); tab hidden → tick counter stops.

---

# PART H — Shared-component extraction plan (summary of pagesA-39 with concrete APIs)

```js
// js/lib/dom.js
export const esc = s => String(s ?? '').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
export const html = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? (vals[i]?.__safe ? vals[i].html : esc(vals[i])) : ''), '');
export const $ = (sel, root = document) => root.querySelector(sel);

// js/lib/data.js
export async function getJSON(url, { timeout = 8000, retries = 1 } = {}) { /* AbortController, r.ok check, retry, typed errors: DataError('network'|'http'|'parse') */ }

// js/lib/units.js — the ONLY place that turns an OOB record into user-visible text
export function unitView(rec, ctx) { /* alias → target; names not ids; computed rate; omitted nulls; typography; day names; whitelist fields */ }

// js/lib/clock.js — see pagesA-36            // js/lib/positions.js — see pagesA-27
// js/lib/map.js
export async function createMap({ container, style, onReady, onError }) { /* waits for mapboxgl, WebGL check, token, reduced-motion, resize, data-map-ready, error taxonomy */ }

// js/lib/a11y.js
export const announce = (msg, {politeness='polite'} = {}) => { /* single visually-hidden live region */ };
export function roving(listEl, itemSel) { /* arrow-key roving tabindex */ }
export function disclosure(btn, panel, {onClose}) { /* aria-expanded/controls, Esc, focus return, outside click */ }
```
`site-nav.js` after extraction: ≤ 60 lines (menu disclosure + back-link logic), markup pre-rendered.
Data contracts (build-time JSON Schema in `schemas/`): `units.v1` (`id, kind, designation, aliases[], side, state, corps{id,name}, division{…}, brigade{…}, commander{name,fate}, strength, casualties, ratePct, daysEngaged[], sources[]`), `positions.v1` (`{[id]: [[tick, lat, lng, bearing, dispCode, strength], …]}`), `search-index.v1`, `casualties.v1`, `clock.v1`.

---

# PART I — Sequencing, dependencies, effort roll-up

**Wave 0 — hotfixes (≈ 2 days, ship immediately, each independent):** pagesA-01 (sprite ids), pagesA-02 (`:where` reset) + pagesA-16 (chips), pagesA-10 (cards), pagesA-11 step 2 (hide the dev note now; data fix follows), pagesA-21 (`undefined`, alias), pagesA-22 (buttons/labels), pagesA-23 (print CSS), pagesA-28 step 1 (`defer` + preconnect), pagesA-37 step 1 (real OG image), pagesA-04 colour tokens, pagesA-26 CSS media query. These alone remove every critical page-level defect and most contrast failures.
**Wave 1 — correctness + a11y (≈ 1–1.5 weeks):** pagesA-12/13/14 (dashboard), 17/18/20 (search), 24 (report content), 26/27/29 (compare), 31/32/33 (camera), 04/05/06/07 (nav), 41/42.
**Wave 2 — platform (≈ 1 week):** pagesA-39 build + manifest + derived data, 40 tests/CI, 38 CSP enforcement, 37 SEO template + redirects, 43 budgets.
**Wave 3 — features (≈ 1.5–2 weeks):** 15, 19, 30, 34, 35, report packs; then data-expansion tie-ins with the Historian plan.
Critical-path dependencies: pagesA-03 (deep links, app agent) and pagesA-36 (clock values, time-facts agent) gate several acceptance tests; pagesA-39 gates 05, 19, 27, 31, 38.

---

# PART J — Open questions and things I could not verify

1. **Deep links (pagesA-03):** established from code (no parser in `bundle.pretty.js` or `index.html`); I did not drive the live app through its 15-s splash to observe a `?tick=` link failing. Please have the app agent confirm in a browser.
2. **Intermittent empty chart (C7):** root cause reproduced (pagesA-01) — but the audit's "5+ s empty on first load" may also have involved a slow network; the mechanism (idle-callback vs fetch race) explains the intermittency and "fine after reload".
3. **S3 (camera canvas):** not reproduced in my headless Chrome on the live site (desktop or phone). Hypotheses and hardening are in pagesA-34; a real-device check is still needed.
4. **Mapbox token restrictions:** behaviour observed by curl (tiles 403 off-domain, styles 200). I have no access to the Mapbox dashboard to see the actual allow-list or scopes; the owner should confirm, and confirm whether `www.` and `*.netlify.app` should be allowed.
5. **Casualty figures:** discrepancies in `casualty_apportionment.json` are real; which number is correct (U-I 6,059 vs 6,394; C-CAV 583 vs 483) and the Busey & Martin totals need a source check by the owner. The watch-list figures (1st Minnesota 224/262; 26th NC; 20th Maine "nearly 400 prisoners") are *unverified*, not asserted wrong.
6. **How the main map places regiments that have no keyframe:** 250 regiments have none (231 with a parent brigade that does). The app may synthesise positions; I did not find the resolver in the bundle. The Compare/Camera plan assumes brigade inheritance flagged as approximate until the app agent confirms.
7. **Monuments:** the app shows 512 monuments but `data/monuments.json` has 9; source of the rest is inside the bundle (extraction needed for Search).
8. **Netlify Pretty URLs:** live HTML shows `/index.html` links rewritten to `/` while `/x.html` and `/x` both return 200 — please confirm the Post-processing settings in the Netlify UI before adding redirect rules.
9. **CLS on search** appears only under mobile throttling in my runs (0 unthrottled); RUM/CrUX should confirm.
10. **Screen readers/Safari/Firefox/real phones** untested by me (see the manual checklist in pagesA-40).

---

# APPENDIX A — Measurements (all from `plan-work/tmp-pages-A/`)

**Contrast ratios** (WCAG relative luminance): `#e8e6df` on `#f0f0f0` 1.10 (search chips now); `#e8e6df` on `#c9a24b` 1.92 (Play now) vs `#0a0a14` on `#c9a24b` 8.21 (intended); `#6f7686` on `#12121e` 4.08 and on `#0a0a14` 4.32 (nav group text, footer); proposed `#9aa3b8` 7.34/7.79; `#8a93a8` (muted) 6.03/6.39; `#c9a24b` gold 7.74/8.21; `--line #1e1e2e` 1.20 on bg (borders invisible) → proposed `--line-strong #5b6478` 3.32 / 3.13; chart lines on `#12121e`: `#1a4488` 1.97, `#2255aa` 2.61, `#3366bb` 3.32, `#4477cc` 4.21; `#c9a24b` on white 2.40 (print h2).
**Interactive targets < 44 px** (CSS px, [V-local]): nav brand 137×18, pin 156×34 (48×34 phone), Explore 98×34; dashboard checkboxes 13×13; search chips 39–83×26; compare toggles 52–95×26, sliders ×16, Mapbox controls 32×32; camera mode 105–112×31, play 78×33; footer links 31–90×16.
**Small fonts:** nav 9.5/11/11.5 px; dashboard 10/11 px; search 10 px; compare 11 px.
**Search relevance simulation:** `searchsim.mjs` (521 entries; 222 rows with dangling " · "; 27 "Commander unrecorded").
**Data facts:** 467 regiment records (1 alias `U-14BK`, 1 horse-artillery, 22 CSA cavalry without `parent_corps_id`, 27 without commander, 222 without `casualty_percentage` of which 221 computable, 37 with empty `days_engaged`); 95 batteries (50 Union + 45 Confederate) in separate files; 88 brigades; placements: 152 ids/694 keyframes (23 regiments, 92 brigades, 29 batteries, 8 other), median inter-keyframe gap 26 ticks, max 658; density: 38 files/1,110 records/412 ids; union 478 ids; regiments with any keyframe 217/467; units positioned at tick 60/300/553: placements-only 56/123/147 vs merged 126/349/454; 137 chronology events; 24 vignettes; 30 key locations; `monuments.json` 9 entries.
**Perf table** in pagesA-43; **live reproduction table** in pagesA-01.
**Files:** `probe1.json` (all 5 pages × 2 viewports), `probe_live*.json`, `perf.json`, `dashrace*.json`, `shots/*.png` (dashboard, search, compare, camera, report screen/print, menu, OG render).



---------------------------------------------------------------------------------------------------

## Verification

Adversarial verifier pass on this report. Method: private headless Chrome (own throw-away profile and port, not the shared pane) driven over CDP; a local static server on 127.0.0.1:8877 serving DEPLOY_DIR unchanged (plus one patched copy of compare.html to test the report's CSS); curl GET/HEAD against the live site and api.mapbox.com; Node/Python re-implementations against `data/**`; web sources for two historical figures. Scripts and outputs are in `plan-work/tmp-verify-pages-A/` (`livecollide_*.out`, `searchsim2.mjs`, `perf_verify*.out`, `cmpfix.mjs` + `cmp_fixed.png`, `menu2.mjs`, `w320*.mjs`, `cls.mjs`). Nothing in DEPLOY_DIR, SRC_DIR or RECON_SRC was touched.

Not re-done by me: `Page.printToPDF` output (pagesA-23 checked by code only: `report.html:37-42`, and there are no print rules in `site-nav.css`), screen-reader behaviour, real devices, Safari/Firefox, Lighthouse itself (not installed; no `npm install` per BRIEF). Those items keep the specialist's confidence level.

### Verdict table

Legend: C = CONFIRMED, CORR = CORRECTED (evidence largely real, but something material is wrong or missing), REF = REFUTED, UNV = UNVERIFIABLE by me.

| ID | Sev | Verdict | What I checked / correction |
|---|---|---|---|
| pagesA-01 | crit | C | 19 symbol ids at `site-nav.js:72-90`, sprite inserted as first child `:105`, idle callback `:107`. Only the 4 cited pages collide (grep of all html for static ids and `getElementById('<symbol id>')`; nothing in `bundle.pretty.js`). Own live repro (fresh profile, 375x812): report search worked 3/3 fast (but `getElementById('search')` resolves to `symbol@sprite` after 5 s in every run), regiment 0/3; throttled: report 0/2, regiment 0/2, dashboard chart empty 1/2 (24 children vs 0). `living-ledger.html:126` `getElementById('clock')` is after an `await` (:91) so it collides too. The 4-part fix (namespace + sync inject + rename ids + capture refs before await) is sound. |
| pagesA-02 | high | CORR | Specificity argument, `site-nav.css:143-147` and contrast numbers reproduce (E8E6DF on F0F0F0 = 1.10; on gold = 1.92; #0a0a14 on gold = 8.21). Corrections: (a) "`button.btn` on 10 pages" is wrong: `<button class="btn">` exists only in `sandbox.html:58-59`; `button.match` matches nothing today (report.html builds `div.match`). The reset really touches camera (mode + play), compare (toggle), search (chips), education (day-tab), sandbox (btn) and five pages' `.play-btn`. (b) `site-nav.css` is also loaded by `index.html:279` (the React SPA), so a global `:where(button){background:none;border:0;padding:0;appearance:none}` changes every unclassed `<button>` in the app as well. I checked the unclassed sub-page buttons (`ar.html:29,47`, `cinematic-export.html:36`, `historian.html:38`, `index.html:212-236`): they already set their own padding/border/background, so sub-page risk is low, but the SPA bundle's buttons were not audited. Do a visual-regression pass on `/` before shipping, or first ship the smaller safe variant (`:where(button.mode-btn, button.play-btn, ...){font:inherit;color:inherit;background:none;...}`). |
| pagesA-03 | crit | C | `bundle.pretty.js:101019` is the only page-level URL read (`get("ancestor")`); `:88800/:88813` `location.hash` are Mapbox's own `hash` option; a grep of `bundle.min.js` for `get("tick"/"unit"/"t"/"u"/"ll")` finds only Mapbox fog `vignette` properties; `index.html` only has `location.reload()` `:267`. The 9 emitting links are exactly as cited (`search.html:114,127,139`, `documentary.html:92`, `education.html:81`, `embed.html:60`, `historian.html:110`, `regiment.html:247`, `turning-points.html:118`). Store actions at `bundle.pretty.js:9366-9370, 9410-9411`. Caveats: MISSED-5 (units without keyframes; schema clash with `ux-flows.md` s5.6). |
| pagesA-04 | high | C | Reproduced in `menu2.mjs`: no `aria-controls/haspopup/role`, no `aria-current`; focus stays on `INPUT#search-box` after open and after Esc; `closePanel :175`, keydown `:184`, `outline:none` at `site-nav.css:44,110`; targets: brand 137x18, pin 48x34 (156x34 landscape), button 98x34, footer links 16 px tall. Contrast 4.08 / 4.32 exact. Minor corrections: the focus-state colour `#1a3a7a` on `#12121e` is 1.71:1 (not ~1.5:1); and the APG "disclosure navigation" pattern does not move focus into the panel on open, yet the acceptance test requires "focus lands inside" (that is the menu-button pattern): pick one. |
| pagesA-05 | med | C | Panel `scrollHeight/clientHeight`: 1471/615 @375, 1616/430 @320, 1407/283 @812x375 (report says 285). Nav mount replaced at DCL `:232-236`; no noscript. |
| pagesA-06 | med | C | Live vs deployed diff of report/dashboard/search: exactly `<a class="back" href="/index.html">` -> `<a class='back' href='/'>` plus the injected async Netlify RUM script; `site-nav.js:211-228` selects only `a[href="/"]`. |
| pagesA-07 | med | C | `site-nav.js:60` esc omits `'`; unescaped interpolation at `search.html:194-196`, `dashboard.html:196,212,253`, `compare.html:216`. |
| pagesA-08 | med | C | `site-nav.js:187-198` footer text and links as cited (name mismatch, mailto). |
| pagesA-09 | low | C | `.gtbg-lift` and `/icons.svg` unused (grep; icons.svg only in a comment `site-nav.js:66`); live `Cache-Control: public,max-age=0,must-revalidate` on site-nav.css/js and icons.svg; note `/assets/*` already carries `immutable` in `netlify.toml`, so fingerprinted files only need to live under `/assets/`. The glow animation does honour reduced motion (`site-nav.css:53`): it is a perf item, not an a11y one. |
| pagesA-10 | high | C | Data shape and `dashboard.html:244-253` exact; `local_dashboard_html_mobile.png` is 446 px wide with the key overflowing and body "undefined"; at 320 the dashboard's layout viewport is 444 (`w320.mjs`). Correction: the other three cards' big text is a raw id string ("U-III (Third Corps)", "C-I-3 (Pickett's Division)", "U-XII and C-II-2 (Culp's Hill)"); the proposed `big: n.unit` keeps that, so map ids to names too. |
| pagesA-11 | high | CORR | Numbers reproduce (U-I total 6,059 vs periods 6,394; C-CAV 583 vs 483; totals 46,163 / 45,928; "51,000" in `vignettes_part1.json` and `vignettes_part3.json` x2). The fix direction is very likely wrong: the U-I Day-1 period is 6,059 casualties by itself (equal to the corps total) and the Day-3 335 is "Stannard's Vermont Brigade", which the OOB places in I Corps (`union_oob_brigades.json` U-I-3-3). The official I Corps loss is 6,059 (1906 park marker text: 42+624 killed, 262+2,969 wounded, 83+2,079 missing) or 6,044 in another table, and that already includes Stannard's brigade (350). So `total_casualties` 6,059 is right and the periods double-count: reduce the Day-1 period by about 335 so the periods sum to 6,059; do NOT raise the total to 6,394 (this also matches `data-integrity.md` "re-derive periods"). C-CAV 583 vs 483 could not be verified by me. Sources: hmdb.org/m.asp?m=255536, gettysburg.stonesentinels.com (strength-casualties-usa). |
| pagesA-12 | high | C | `dashboard.html:71,81` fixed 1000 px; screenshot shows only "July 1"; svg right edge 1037-1040 at 320-375. |
| pagesA-13 | high | CORR | Contrast values reproduce (1.97, 2.61, 3.32, 4.21; 13x13 checkboxes; mouse-only handlers `:187-203`; `div.legend-item` `:209-218`). The proposed replacement palette fails its own stated criterion: CIELAB dE76 between `#8ec5ff` and `#93c5fd` is 1.6 and between `#6ea8ff` and `#60a5fa` is 3.0 (indistinguishable); neighbour dL* as low as 2.7; it is still eight near-identical light blues. Contrast vs `#12121e` is fine (5.7-13.1). Derive the palette with a validator (min dE about 15, or dash/marker redundancy) and prefer small multiples or direct labels; do not ship the example values. |
| pagesA-14 | med | C | `sw.js:61-68,73-74`: `caches.match` on a miss resolves `undefined` (net effect = offline fetch failure plus a console error); dashboard error copy `:69`. |
| pagesA-15 | med | C | `engagements[]` and per-period `notes` exist in the JSON (seen for U-I). Feature list is a proposal (UNV as to value). |
| pagesA-16 | high | C | `search.html:30-31`; chips are `<button>` `:56-59`; `--line-strong #5b6478` = 3.32 / 3.13 and `#8a93a8` = 6.39 exact. |
| pagesA-17 | high | C | Independent re-implementation of `search.html:106-117` (`searchsim2.mjs`): index 521 = 467/24/30; "Commander unrecorded" 27; dangling " . " 222 of which 221 computable; one alias `U-14BK` (strength 0); "14th brooklyn" returns alias (90) before U-84NY (60). Note: the target's designation already contains "(14th Brooklyn)" (`U-84NY`), so skipping `alias_for` records is sufficient; the `aliases[]` merge is only needed for other aliases. |
| pagesA-18 | high | C | All hit counts reproduce: lee 453, lincoln 348, devils den 33, devil's den 13, 20 maine 5 (top = 20th Massachusetts), maine 20th 4, hancock 55 (top = 7th US), iron brigade 45, irish brigade 30, bloody angle 17, copse of trees 24, cushing 37. One wording error: "Archer Captured" under `lee` scores 80 (a word-start match inside `panel_summary`), a real substring hit and not subsequence noise. The "~150 KB index" size is an unverified estimate. |
| pagesA-19 | med | C | 50+45 batteries, 51+37 brigades, 9 CSA divisions, 42 successions (25+17), terrain roads 8 / structures 8 / features 4, `monuments.json` 9; `search.html:8` promises batteries. Note: there is no C-CAV corps record in the corps files (see MISSED-4). |
| pagesA-20 | high | C | CLS reproduced exactly: 0.14655, single shift at 1,088 ms, sole source `FOOTER#gtbg-footer` (previous rect y=463..582 = 119 px of an 812 px viewport = 0.1466 impact fraction). `search.html:54` input has no label and `autofocus`; `:174,:180` caps. Caveat: `min-height:70vh` on the results only avoids the shift on viewports where the footer would start below the fold; on taller screens use a skeleton with the height of the first render (30 rows), or mount the footer after results. |
| pagesA-21 | high | CORR | Bug reproduces (22 CSA cavalry without `parent_corps_id`, `report.html:101`; 37 empty `days_engaged`; 221 computable rates; lines 101/106/107 exact). Two problems in the fix: (1) names for "corps -> brigade" cannot be produced for 58 regiments: 13 `parent_brigade_id` values (8 `U-VI-*`, `C-CAV-1..5`) resolve to no record in `union_oob_brigades.json` / `confederate_oob_corps_div_bde.json` (88 brigades only), and there is no C-CAV corps record, so the acceptance "22 cavalry reports show Cavalry Corps/brigade names" is unattainable until data-integrity adds those group records; (2) the fallback string "Not engaged in the fighting" for empty `days_engaged` asserts a fact the data does not make (the flag is simply empty); omit the row, as the report says elsewhere. |
| pagesA-22 | high | C | `report.html:90-91` div.match with click only; `:54` input unlabeled; `:67` inline onclick. |
| pagesA-23 | high | C (code only) | `report.html:37-42` hides header/#search/#matches/.print-btn/.back but not `#gtbg-nav`/`#gtbg-footer`; `#report{display:block !important}` `:40`; gold `#c9a24b` on white = 2.40. printToPDF not re-run. |
| pagesA-24 | high | C | All 12 featured ids exist in the OOB with data (U-20ME, U-1MN, C-26NC, U-24MI, U-69PA, U-84NY, C-15AL, U-16ME, U-6WI, C-1TX, U-8OH, U-140NY); `regiment.html:252-253` reads `?unit=`; `flag_notes` (31 records) and `notes` (4) exist and must not render. Effort "L" is optimistic: brigade names (MISSED-4), monuments extraction, rank computation, timeline, mini-map SVG, batteries + brigades: closer to XL. |
| pagesA-25 | med | C | `report.html:8,11,17`, `search.html:8`, `camera.html:48`, `compare.html:55` strings exist as quoted. |
| pagesA-26 | high | CORR | Evidence reproduces in my render (`cmpfix.mjs`): layout viewport 528, two panes 187 px wide side by side, `.toggle-btn` computed 16 px. But the CSS sketch does NOT fix it: `compare.html:163` sets `document.getElementById('split').style.display = 'flex'` inline, which beats `.split{display:grid}`, so `grid-template-columns:1fr` is ignored and the panes stay side by side at 188 px (verified with the sketch applied: panes 0-188 / 188-375, `cmp_fixed.png`). Also `.pane-controls{position:static}` comes AFTER `.map` in the DOM, so controls render below the map (324 px tall in a 188 px column), not above as written; and a fixed `.pane{height:min(62dvh,520px)}` plus a 48dvh map plus static controls overflows the pane. Fix: change line 163 to toggle a class/`hidden` (no inline display), put the controls before the map in the markup (or use `order`), and drop the fixed `.pane` height in the stacked layout. |
| pagesA-27 | high | C | 152 ids / 694 keyframes, 23 regiments, 92 brigade-pattern ids; density 38 files / 412 ids / 1,110 kf; merged 478; positioned at tick 60/300/553: 56/123/147 vs 126/349/454; median age at tick 300 = 150, 84.5% > 30, gap median 26 / max 658; `bundle.pretty.js:96788-96831` lists the 38 density files; `compare.html:120-129`, `:163`, `:216` as cited. |
| pagesA-28 | high | C | `compare.html:19-20` / `camera.html:19-20` blocking CSS + JS. mapbox-gl.js is 1,796,551 B raw, 385,039 B br, 481,197 B gzip, ACAO `*` (curl). My throttled runs (same profile as the specialist): compare FCP 4.08 / 4.68 s, LCP 4.63 / 4.68 s, TBT 563 / 227 ms, 1,130 KB / 49 req; camera FCP 4.08 / 3.78 s, TBT 185 / 322 ms, 966 KB / 51 req (specialist: 3.61-3.73 and 3.70-3.79 s); desktop FCP about 1.0 s (compare) / 0.5 s (camera). Correction: fix step 1's non-blocking CSS trick `media="print" onload="this.media='all'"` is an inline event handler and contradicts the CSP target in pagesA-38 (script-src without 'unsafe-inline' blocks it); use self-hosted/critical CSS or preload plus an external script. |
| pagesA-29 | high | C | `compare.html:63-65` label without `for`, no `<main>`, `.tick-label` 11 px `:35`. |
| pagesA-30 | med | UNV | Fixed centre/zoom and single-dot-at-tick-60 observation match the screenshot; the feature list is a proposal. |
| pagesA-31 | high | C (1 minor number) | 23 options, 11 with one keyframe; U-20ME 13 kf first tick 225, U-1MN 11 / 200, C-15AL 7 / 260; 217/467 with any keyframe; 231 of the other 250 have a brigade with keyframes; median 2. Minor: regiments with >= 5 keyframes = 37 (not 32). `camera.html:208-209` `if (p) flyTo` no-op confirmed. |
| pagesA-32 | high | C | `camera.html:230` setInterval 1000; no pagehide/visibilitychange; `#unit-select` unlabeled; targets and Play contrast as cited. |
| pagesA-33 | high | C | No try/catch in `camera.html` (grep), serial awaits `:77-78`, `r.json()` without `r.ok`; my throttled runs above. |
| pagesA-34 | med | C / cause UNV | `#atmosphere{mix-blend-mode:multiply}` at `camera.html:38`, hour bands `:175-188` exist; the S3 cause remains unreproduced by anyone (I did not attempt it). |
| pagesA-35 | med | C | `densestClusterBounds` `:125-142` counts all placements; all disposition strings in the scoring table exist in data (`Mounted Cavalry` and `Dismounted Cavalry` are separate strings, also `Bivouac`, `Reserve`, `Limbered Artillery`); chronology 137 events, critical 45 / high 73 / medium 16 / low 3, 66 with `flag`. |
| pagesA-36 | high | C | `bundle.pretty.js:9371-9383` (Day 1 = 6:00, Days 2-3 = 4:00), `:97428,100842,101006` `+2`; `compare.html:120-129`; `camera.html:175-179`; `placement_schema.json` (tick 1 = 5:00am; day1 "12:40am July 2", day2 "7:50pm", day3 "8:05pm"); `placements_day3_ticks601_675` "3:20pm to 8:05pm". Recomputed: tick 60 compare 9:55 vs app 10:55; tick 300 compare 11:10 vs app 10:10. |
| pagesA-37 | high | CORR | Image evidence exact: day1.png and day3.png md5 `3f6646c9...` (live too), IHDR 1280x720 RGB, IDAT inflates to 3,687,120 B vs 2,765,520 (ratio 1.3332), PIL "unrecognized data stream"; only day1/day3 exist; manifest uses them; no og:site_name / ld+json on the five pages; icon/manifest links exist only in `index.html:7-12` (root `/favicon.ico` and `/apple-touch-icon.png` exist, so practical icon impact is small). Correction: step 4 (extensionless canonical + `301 /*.html -> /:splat`) is unsafe as written because live headers differ by URL form and the `netlify.toml` header rules are path-literal. `curl -I`: `/embed.html` -> `Content-Security-Policy: frame-ancestors *` (+ `X-Frame-Options: DENY`); `/embed` -> `X-Frame-Options: DENY` only, no frame-ancestors override, so every existing third-party iframe of `/embed.html` would break after the 301; `/dashboard.html` gets `no-cache,must-revalidate` (`for="/*.html"`), `/dashboard` gets `public,max-age=0,must-revalidate`. Duplicates are already consolidated by the existing `rel=canonical` tags, so either keep `.html` canonical (lowest risk) or migrate with duplicated header rules and an explicit `/embed*` exclusion, and test every URL form with `curl -I`. |
| pagesA-38 | high | C | Live curl: tile 200 with Referer `https://gettysburginteractivemap.com/camera.html`, 403 with `https://example.org/` and with no Referer; style JSON 200 with `example.org`. The same token is in `bundle.min.js` and 9 html pages (compare, camera, cinematic-export, ground-remembers, immersive, sandbox, unit-rendering-reference, viewshed, watch-together). Live CSP is Report-Only with `'unsafe-inline'` and no RUM host (header on every path incl. the PNG). Inline style attrs and onclick lines as cited. The proposed enforced policy is plausible but untested against Mapbox v3 (the report itself says "test"). |
| pagesA-39 | high | C | Four different OOB fetch lists confirmed (`search.html:69-73`, `report.html:73-77`, `camera.html:72-75`, `regiment.html`). Effort: the structured finding says XL, the heading says "L-XL": keep XL. |
| pagesA-40 | high | CORR | Suite content is right. Effort "M" is understated (6 viewports x 3 engines x ~24 pages + axe + Lighthouse-CI + data tests + deploy previews): L. Budget problem: see MISSED-6. |
| pagesA-41 | med | CORR | Table strings exist as quoted. The replacement copy in the "dashboard card" row hard-codes "1st Minnesota, 85.5 %", a figure contradicted by sources (MISSED-2). Also missing from the table: `search.html:125` "Tick N" in vignette rows. |
| pagesA-42 | med | C | Font-size and container facts match CSS (`dashboard.html:33,38,48`, `search.html:35`, `compare.html:35`; header `padding:5%` vs `main` max-width). |
| pagesA-43 | med | C | Reproduced: dashboard mobile FCP 0.82-0.85 s, TBT 95-129 ms, CLS 0, 23 KB / 6 req; search mobile CLS 0.1466 both runs, 74 KB / 17 req, LCP element `DIV.meta`; camera desktop FCP 0.48-0.50 s, LCP 0.66 s, 1.5 MB / 98 req (exact match). Budget caveat: MISSED-6. |
| pagesA-44 | low | C | `camera.html:206,209` and `compare.html:264` animate unconditionally; no `matchMedia` or `visibilitychange` in either page. |

### Corrections that change what gets built

1. pagesA-11: do NOT raise `U-I.total_casualties` to 6,394; 6,059 is the official figure and already contains the Vermont Brigade, so fix the Day-1 period (about 5,724 + 335 = 6,059).
2. pagesA-26: the CSS sketch is defeated by `compare.html:163` (`style.display='flex'`); fix that line and the DOM order first, otherwise nothing stacks.
3. pagesA-37: the extensionless-canonical migration would break `/embed` framing and change cache headers; keep `.html` canonical or duplicate the header rules.
4. pagesA-13: replace the example palette (two pairs are visually identical).
5. pagesA-21/24: names for VI Corps and CSA cavalry brigades do not exist in the data yet.
6. pagesA-28 step 1 vs pagesA-38: the inline `onload` conflicts with the CSP goal.
7. pagesA-02: scope or regression-test the global button reset because `index.html` loads the same stylesheet.

### MISSED issues (in scope, not in the report)

1. **Nav bar overflows at 320 px on every page (medium, effort S).** Evidence [V-local `w320.mjs`, `w320b.mjs`]: at 320x568 mobile emulation `innerWidth` becomes 329 on search, report, camera, historian, regiment and education (dashboard 444 and compare 502 for other reasons); `#gtbg-nav` has `padding:10px 16px` and `gap:10px`, brand 137 + pin 48 + button 98 px puts the button's right edge at 329 > 320 (`site-nav.css:17-25`, `:31-36`). The BRIEF bar is no clipped UI from 320. Fix: `min-width:0` on nav children, smaller or shortened brand text under 360 px, `flex-wrap` fallback; add a 320x568 case to `layout.spec` (pagesA-40 lists 320x568 but no page passes it today).
2. **The 1st Minnesota "224 of 262 in 15 minutes" (85.5%) figure conflicts with sources and is baked into new copy (high for credibility, effort S).** `data/oob/union_regiments_i_ii_corps.json` U-1MN: `casualties:224`, key_action "224 of 262 men fell in approximately 15 minutes"; `casualty_apportionment.json` repeats it. Sources found: 262 men charged, 215 killed or wounded (82%), 47 unhurt, 17 more lost on July 3 (civilwarmed.org/1st-minnesota-at-gettysburg; a Minnesota state proclamation quoted in search results: "215 of 262 ... 82 percent"). So 224 looks like a whole-battle figure mislabelled as the 15-minute charge (85.5% = 224/262 mixes bases). pagesA-11 lists it only as "unverified", but pagesA-41 writes "1st Minnesota, 85.5 %" into replacement copy and pagesA-24 features the unit. Fix: correct the record (215/262 = 82.1% for the charge; whole-battle total stated separately per Busey & Martin, which I could not access) and generate the copy from the data, never hard-coded. The 26th NC figure was not checked.
3. **Path-literal header rules vs the proposed URL policy (high if implemented, effort S to avoid).** Evidence: `curl -I` results in the pagesA-37 verdict. Add a test that, for each URL form (`/x`, `/x.html`, `/x/`), asserts identical security and cache headers, and exclude `/embed*` from any redirect.
4. **Data prerequisites for report and browse pages are missing (medium, dependency).** 58 regiments reference 13 brigade ids with no record (8 `U-VI-*`: `U-VI-1-1..3`, `2-1..2`, `3-1..3`; and `C-CAV-1..5`); the `U-VI` corps record exists but there is no `C-CAV` corps record (corps files: 8 Union incl. U-CAV, 3 Confederate; the dashboard shows 12). pagesA-21 (names), pagesA-24 (browse tree, organisation section) and pagesA-19 (brigade entities) cannot meet their acceptance tests until the data-integrity group records exist. Add the explicit dependency on `data-integrity.md` and a fallback ("Brigade C-CAV-1 (name not in database)") rather than blank or `undefined`.
5. **"View on map" targets for units that have no position (medium, effort S design).** Only 217 of 467 regiments have any keyframe (231 of the other 250 have a brigade with keyframes; app behaviour for the rest is unknown). pagesA-03/20 acceptance tests only U-20ME. Define the rule: unit without own track -> fly to its brigade track flagged "approximate", else hide the button; otherwise Search and Report offer about 250 links that land on an empty map. Also reconcile the URL schema with `ux-flows.md` s5.6 (`?v=`, `at=`, `dv=` there vs `?vignette=`, `ll=` here) before anyone implements the parser.
6. **Lighthouse >= 95 is not reachable on the Mapbox pages with the planned changes, and the targets disagree (medium, planning).** pagesA-40 sets Performance >= 95 and TBT <= 150 ms for every page; pagesA-43 sets camera TBT <= 200 ms. Measured mobile TBT on the map pages is 137-563 ms (my runs 185-563) with FCP 3.8-4.7 s before deferral. Deferral fixes FCP/LCP but not the parse and init cost of a 385 KB (br) library, which Lighthouse charges through TBT (30% weight) unless the library loads only after user intent or once the page is quiet. Plan a facade (poster plus "Load interactive map") or state a separate mobile budget for compare/camera (for example Performance >= 85 with all CWV green); keep 95+ for dashboard, search and report.
7. **Landmarks, skip link, and two jargon strings (low, effort S).** `camera.html` has no `<main>` (only dashboard/search/report do; the report notes compare); none of the five pages has a skip link; `search.html:125` prints "Tick N" in vignette rows and the location rows print "Days 1, 2, 3": neither is in the pagesA-41 replacement table.
8. **Mapbox billing side effect (low).** Each `new mapboxgl.Map` is a billable map load; Compare creates two per visit, Camera one. The lazy second map in pagesA-26 helps; record map loads per visit in the budget and consider whether both Compare maps need to load on phones.
