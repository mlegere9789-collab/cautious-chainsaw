# app-design — Design System & Visual Polish Plan (NO-BUILD)

Specialist: **app-design** · Site: gettysburginteractivemap.com · Date: 2026-09-29/30
Scope: tokens, typography, icons, components + states, the floating "Ask the Historian / Extra Features" control (H1), splash/onboarding (H3), panel management, cartography, microinteractions, empty/loading/error states, theming (dark/light/forced-colors), print (Battle Reports), sub-page harmonisation, governance.

All line references are to: `bundle.pretty.js:LINE` (prettier-formatted copy of the deployed 2.28 MB bundle in PLAN_WORK), `DEPLOY/<file>:LINE` (deployed tree), or `assets/helpmodal-cfv9t0zh.js` / `assets/bookmarkpanel-c5yt4b5k.js` (single-line minified chunks, so cited by property name). Analysis scripts and raw outputs are in `plan-work/tmp-app-design/` (`inventory.py`, `cluster.py`, `contrast.py`, `cvd.py`, `tokens_check.py`, `sun.py`, `panels2.py`, `components.py`; outputs `inventory_out.txt`, `inventory_detail.json`, `inventory_summary.json`, `style_consts.json`).

---

## 0. Executive summary

**Diagnosis.** The product's *content, ideas and layout system* read as museum-grade; its *fit and finish* reads as three independently-styled products glued together:

1. **The map app** (one minified bundle): 613 inline `style:` objects, **zero** CSS classes of its own (the only stylesheet is vendor `mapbox-gl.css`; `assets/index-b4g7z_2g.css` has 154 rules, 149 are `.mapboxgl-*`), **zero** `aria-*`/`role` attributes, **zero** media queries, **zero** `prefers-reduced-motion` handling, **zero** `:hover`/`:focus-visible` (impossible with inline styles), 13 `window.innerWidth` reads instead of CSS breakpoints (8 sit inside style-object literals — `ji` `98111–98115`, `gp` `102708–102712` — that are evaluated **once at module load**, so they never react to resize or rotation), 108 emoji/glyph icons (44 distinct characters), 50 % of its font-size declarations below 12 px.
2. **Twenty-six static pages** each with their own inline `<style>`: the same brand tokens re-declared in 22 separate `:root` blocks, ~11 differently-padded "gold primary button" definitions, 8 different `h1` scales, one page (`education.html`) on an entirely different blue palette.
3. **An injection layer** in `index.html:294–714` (~420 lines of inline JS + `index.html:168–253` CSS) that reaches into the React DOM by text-matching button labels ("Skip tour", "Choose your experience", "S", "F", "L") to add the Historian pill, an onboarding banner, `title` attributes, a second monuments overlay and a collision-mover. This layer *is* the DIY tell; it is also the root of H1, part of H6 and a fragility risk.

**Prize.** Consolidating into one token-driven system moves grades directly (see §14): Fit & finish C+/D+ → A, Visual design B+/B- → A, Usability D+ (mobile) → A-/A, Accessibility C+ → A- (design-controlled portion: contrast, target size, focus, motion, forced-colors), and closes three of the eight critical bugs at the root (C1/C2 stacking, C8 chips) while supplying the state components C7 needs.

**Five discoveries that change the plan's shape** (all verified in code, details in §§2, 4, 6):

| # | Discovery | Consequence |
|---|---|---|
| D-1 | **The desktop timeline (`IO`, `bundle.pretty.js:113249`) and other desktop widgets are mounted unconditionally, *also in Mobile layout*.** `AO` gates only the toolbar (`113071`) and the map (`113233`) with `Zn !== "mobile"`. The mobile shell `pO` root is `position:fixed; z-index:100` (`103699–103705`), which creates a stacking context; `IO`'s wrapper is `position:absolute; bottom:0; z-index:100` (`112386`) and comes *later in DOM*, so it paints over the entire mobile UI and over the mobile Tools sheet (`toolsOverlay` z 500 is *inside* the z-100 context). The "572 px wide transport row" (C1) is `Po.controls` = 5 transport buttons + 6 speed buttons + tick label + the "Created by … e-mail" credit (`112361`). | C1 and C2 are **stacking-context and duplicate-shell bugs**, not "row too wide" bugs. The design fix is one responsive shell + a portal/z-scale, not tweaking widths. |
| D-2 | **Legend ≠ map.** The legend's disposition colours differ from the canvas colours for 9 of 11 postures; the legend says "Dot outline = side color / Dot fill = disposition" but the canvas draws a side-filled rectangle with a 3.5 px posture dot; the "Size" legend shows circles r=5/7/9 for regiment/brigade/division while units are rectangles sized by strength. | Cartography needs one symbology spec that drives both renderer and legend (§9). |
| D-3 | **Sides are colour-blind-safe; postures are not.** Measured ΔE2000 between Union `#3a6bc4` and Confederate `#c43a3a`: 41.7 normal / 42.3 protan / 51.0 deutan / 65.8 tritan. But Charging `#ff4422` vs Retreat `#ff8800` = 7.8 (deutan), Retreat vs Deployed Artillery `#f5c518` = 7.8, Legend "Line of Battle" vs "Skirmish" blue = 8.1. | Keep blue/red for side; encode posture with **shape/line-style**, not 11 hues. |
| D-4 | **The typefaces the code asks for are never loaded.** `'Spectral'` ×14 and `'Cormorant Garamond'` ×4 are referenced in the bundle, but there is no `@font-face`, no Google-Fonts `<link>` and no font file anywhere in the deploy → everything renders in Georgia (unavailable on Android/Linux → device serif) / system sans / `monospace`. | Self-host a 2-file Spectral subset (~45 KB) or go system-only; decide once (§3.3). |
| D-5 | **Brand/share assets are placeholders.** `screenshots/day1.png` and `day3.png` are byte-identical (md5 `3f6646c9…`), 17.5 KB for 1280×720, IHDR declares RGB but the decompressed stream is 5121 B/row (RGBA-sized) so Pillow refuses to decode it; a sampled decode gives ~80 distinct colours, a dark gradient starting `#0a0a14`. These are the `og:image`, `twitter:image` and manifest `screenshots`. Icons are flat 4-colour aliased PNGs with transparent corners, declared `"purpose":"any maskable"` in one entry. | Every social share / PWA-install card shows a placeholder. Fix in Phase 0 (cheap, high-visibility). |

**Deliverable structure.** §1 method/limits · §2 token inventory (proof) · §3 token system · §4 icons · §5 components + states + acceptance · §6 layout, z-scale, panel rules · §7 H1 integration · §8 H3 splash/onboarding · §9 cartography · §10 motion/microinteractions · §11 empty/loading/error · §12 theming, forced-colors, print · §13 sub-pages, brand assets · §14 governance/QA/roadmap · §15 findings register (long form) · Appendix.

---

## 1. Method, evidence, limits

* Read-only. No build, no browser tools (per BRIEF). Everything below comes from static analysis of `DEPLOY_DIR`, `bundle.pretty.js`, the two lazy chunks, `netlify.toml`, live `curl` (the live `screenshots/day3.png` is byte-identical to the deployed copy: md5 `3f6646c99f3416a1aa35fea67bed21c5`) and four web look-ups (Lucide licence = ISC with Feather portions MIT; Spectral = SIL OFL 1.1; Mapbox hillshade example uses `mapbox://mapbox.mapbox-terrain-dem-v1`; Mapbox `icon-color` works only for SDF images added with `sdf:true`; Georgia is Microsoft-owned and the "Core fonts for the Web" pack was never licensed for embedding; WCAG 2.2 SC 2.5.8 = 24×24 CSS px AA).
* **Token inventory method** (`tmp-app-design/inventory.py`): regexes over (a) `index.html` `<style>` + inline `<script>`, (b) `site-nav.css` + `site-nav.js`, (c) every other `*.html` `<style>`, `style="…"` attributes and inline JS, (d) `bundle.pretty.js` lines 96200–113377 (all app UI) — camelCase and kebab-case properties, hex normalised (`#fff`→`#ffffff`), `rgba()` whitespace-normalised, `clamp()` protected. Limits: (i) shorthand `padding: 6px 12px` contributes both values; (ii) some multi-value `box-shadow: … rgba(a,b,c,d)` strings are truncated at commas so **shadow counts are lower bounds**; (iii) the ~6,170 lines of **tour/monument data** (`bundle.pretty.js:104440–110610`) are content, not UI — excluded from glyph counts; (iv) values computed at runtime (canvas `he.font = \`bold ${vn}px sans-serif\``) are counted separately.
* **Colour maths:** WCAG relative-luminance contrast (`contrast.py`), CIEDE2000 with Machado-2009 CVD matrices at severity 1.0 (`cvd.py`), clustering by Lab ΔE76 < 6 (`cluster.py`). Satellite "typical" greens/browns in `cvd.py` are **assumptions**, not sampled from Mapbox imagery — flagged where used.
* **Solar times** (`sun.py`) are computed with the NOAA/Meeus equations for 39.8309 N 77.2311 W — *computed, not source-cited*; they are local mean solar time (LMT).
* **Not verified (be aware):** actual rendered pixels on device (no browser), Safari/Firefox behaviour, real Mapbox `satellite-v9` layer ids in GL JS 3.24.1 (the plan says "verify with `map.getStyle().layers`"), tile byte sizes for hillshade/contours (measure at implementation), performance impact of any proposal (no RUM run). Where the audit (`gettysburg-site-audit.md`) observed a behaviour the code seems not to cause (e.g. toasts "never auto-dismiss": `qF` at `99888` *does* set a 4.5 s timeout; `nO` at `101679` fades out at 3 s), I say so rather than assert.

---

## 2. Token inventory — proof of inconsistency

### 2.1 Distinct values by source

| Source | colour literals | font-size decls (distinct) | spacing values | radii | shadow recipes† | z-index levels | font-family strings | durations (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `index.html` `<style>` (60–253) | 21 | 7 | 13 | 4 | 1 | 1 (`999999`) | 3 | 5 |
| `index.html` inline JS | 5 | – | – | – | – | 1 (`400`, monuments overlay `index.html:645`) | – | – |
| `site-nav.css` | 25 | 7 | 14 | 4 | 5 | 1 (`500`) | 2 | 5 |
| 26 other `*.html` (CSS + attrs) | 83 | 22 | 30 | 11 | 2 | 5 | 4 | 7 |
| their inline JS | 44 | 3 | 6 | – | – | – | 1 | – |
| **bundle app UI (L96200–113377)** | **194** | 22 | 28 | 12 | 8 | **25** | 7 | 10 |
| **WHOLE SITE (union)** | **307** (185 opaque + 122 translucent) | **41** (30 fixed px + 11 `clamp()`) | 36 | 15 | ≥16 | **28 strings = 27 levels** | 10 | 20 |

† lower bound (see §1). Full detail: `tmp-app-design/inventory_detail.json`.

**Derived statistics (all from the same scripts):**

* 307 colour literals collapse to **140 perceptual clusters** at ΔE76 < 6 (`cluster.py`): 45 % of the palette is duplicates-by-eye; **95 of 185 opaque colours are used exactly once**.
* Family counts among the opaque 6-digit hexes (HSV thresholds: blue H200–250 S>.35 V>.4; red H<14 or ≥346 S>.4 V>.4; gold H32–56 S>.35 V>.35; neutral S<.12; near-black V<.25 — neutral/near-black overlap on e.g. `#000000`,`#111111`): **30 blue-ish** (Union-like), **31 red-ish** (Confederate-like), **17 gold-ish**, **27 neutral greys**, **28 near-blacks** (`#000000 #050508 #05050a #0a0a14 #0a0a18 #0c0f15 #0d0d16 #0d0d18 #111111 #11151d #12121e #161b25 #181826 #1a1a2a #1c2230 #1d2330 #1e1e2e #222222 #222233 #2a2a2a …`).
* **Two golds are the "same" gold:** `#c8a84a` (46 uses, app) vs `#c9a24b` (41 uses, every other page) — ΔE2000 2.9, invisible to users, guaranteed to drift. Add `#e8d5a3` (58), `#8b6914` (38), `#d4a840`, `#d6a44e`, `#ffd166` (education).
* **Union blue is spelled `#3a6bc4` (canvas, `bundle.pretty.js:96427`), `#4477cc` (`search.html` `:root`; unit panel side tag `97924`; search-panel results `98876`), `#3355cc` (legend `UF`, `99413`), `#5588dd` (mobile roster heads `103530`, legend dots `103647/103671`), `#4488ff` (legend Line of Battle `99385`), `#88ccff` (recently-moved highlight `H4`, `96431`).** Confederate red likewise: `#c43a3a`, `#cc5544`, `#cc4433`, `#dd5544` (`103575`), `#cc4444` (`98876`), `#ff9944` (highlight `W4`, `96432`).
* **Spacing:** 667 of 1,153 spacing declarations (58 %) sit on a 4 px grid; **42 % are off-grid** (bundle 47 %, `site-nav.css` 65 %). Worst offenders: `10px` ×122, `6px` ×96, `14px` ×76, `3px` ×28, `7px` ×26, `18px` ×25, `5px` ×22.
* **Type:** 165 declarations below 12 px (bundle 135 of 271 = 50 %; sub-pages 29; `site-nav.css` 3): `7px`×1, `8px`×7, `9px`×13, `9.5px`×1, `10px`×66, `11px`×76, `11.5px`×1. Plus canvas labels drawn at **8/9/10 px** (`bundle.pretty.js:96665`: `he.font = \`bold ${vn}px sans-serif\`` with `vn = Ci || Ee >= 16 ? 10 : Ee >= 14 ? 9 : 8` at `96663`).
* **Line-height:** 15 distinct (1, 1.02, 1.2, 1.3, 1.4, 1.5, 1.6, 1.65, 1.7, 1.72, 1.75, 1.8, 1.85, 1.9, 2).
* **`h1`:** 8 different scales across pages — `clamp(18px,3vw,26px)`, `clamp(20px,3.2vw,28px)`, `clamp(22px,3.5vw,32px)`, `clamp(24px,4vw,36px)`, `clamp(24px,4vw,38px)`, `clamp(26px,5vw,40px)`, `1.6rem` (`index.html:160`), `18px`; colours `#c9a24b` (22 pages), `#e8d5a3` (privacy, terms, diagnostics), `#f4f2ec` (splash, `index.html:110`), `#ffd166` (education).
* **Radii:** 15 values (0,2,3,4,5,6,7,8,10,12,14,16,20,24,50 %). `3px` ×26 and `4px` ×27 and `6px` ×35 and `8px` ×44 all coexist as "small control".
* **Durations:** 20 (10, 20, 100, 120, 150, 160, 200, 300, 340, 350, 400, 500, 600, 1000, 1200, 1400, 1500, 1800, 3400, 5000); easings `ease`×17, `linear`×3, `ease-in-out`×2, rest implicit.
* **Breakpoints:** the entire site has **one** CSS media query (`site-nav.css:52 @media (max-width:640px)`) plus JS thresholds `< 500` (`98111`, unit panel), `< 500` (canvas symbol size, `96604`; label tier `96653`), `< 560` (roster panel `102708`), `<= 860` (walkthrough, `110615`). Sub-pages are fluid-by-accident (`flex-wrap`, `clamp`), which is why S4 (dashboard chart, compare tabs) exists.
* **z-index:** 27 levels — `1, 2, 3, 5, 6, 8, 10, 20, 30, 85, 88, 92, 95, 100, 150, 160, 200, 300, 301, 400, 500, 600, 700, 800, 900, 1000, 999999`.

### 2.2 The gold primary button is defined eleven times

From `components.py` (base rules only, hover/active excluded) — same visual role (`background: var(--gold); color:#0a0a14`), seven paddings, three radii:

| Page:selector | padding | radius | font-size |
|---|---|---|---|
| `404.html a.cta` | 12px 26px | 8px | 14px |
| `ar.html #start-btn` | 12px 26px | 8px | 14px |
| `camera.html .play-btn` | 7px 18px | 6px | – |
| `cinematic-export.html #record-btn` | 10px 22px | 8px | – |
| `ground-remembers.html .play-btn` | 7px 16px | 6px | 13px |
| `historian.html #ask-btn` | 0 22px | 10px | – |
| `immersive.html #sound-gate button` | 14px 28px | 10px | 14px |
| `immersive.html .play-btn` | 7px 18px | 6px | 13px |
| `report.html .print-btn` | 10px 20px | 6px | – |
| `unit-rendering-reference.html .play-btn` | 7px 16px | 6px | 13px |
| `watch-together.html .play-btn` | 7px 18px | 6px | 13px |

Secondary/ghost buttons: `.mode-btn` (camera), `.btn` (sandbox), `.btn-sec` (watch-together), `.nav-btn` (documentary), `.ctl-btn` (living-ledger), `.toggle-btn` (compare, 10 px type, 3×8 px padding = a ~20 px-tall target), `.sugg` (historian), `.filter-chip` (search). 34 button/chip/tab-like base rules, 22 distinct paddings, 10 radii, 7 font sizes. In the map app the same role appears as `walkthroughBtn` (`113324`), the inline "Toggle Units" (`113112`), the inline "Download Website Tutorial PDF" (`113132`), `ko.cardBtn` (`102881`), `tr.nextBtn` (`112155`), and mobile `moreBtn` (`103993`, `minHeight:44`). Only a handful of app controls declare a 44 px minimum (`101342`, `102119`, `102486`, `102744`, `103851`, `104003`).

### 2.3 C8 is a design-system defect, not a one-off (verified root cause)

`search.html:30` defines `.filter-chip { padding; border-radius; border:1px solid var(--line); color: var(--muted); cursor:pointer }` — **no `background`, no `font`**. The chip became a `<button>` (line 56–59); `site-nav.css:143–147` then forces `button.filter-chip { font: inherit; color: inherit; appearance:none; … }`. Specificity of `button.filter-chip` (0,1,1) beats `.filter-chip` (0,1,0), so `color: var(--muted)` is overridden by inherited body ink `#e8e6df`; with no `background`, the UA `ButtonFace` (#efefef) shows → **1.10 : 1** (measured `#e8e6df` on `#efefef`). `.filter-chip.active` (0,2,0) wins, which is why only the active chip is legible. The same latent trap exists for `button.mode-btn / .play-btn / .toggle-btn / .day-tab / .btn / .match` (`site-nav.css:143–147`).

### 2.4 Legend vs canvas (D-2) — exact values

| Posture | Legend (`bundle.pretty.js:99384–99412`) | Canvas dot (`Lp`, `96306–96318`) | Same? |
|---|---|---|---|
| Line of Battle | `#4488ff` | `null` → side colour | no |
| Charging Line | `#ff4422` | `#ff4422` | yes |
| Skirmish Line | `#44aaff` | `#66aaff` | no |
| Chaotic Retreat | `#ff8800` | `#ff8800` | yes |
| Line of March | `#aaaaaa` | `#aaaaaa` | yes |
| Reserve | `#668844` | `#226622` | no |
| Bivouac | `#888866` | `#555555` | no |
| Deployed Artillery | `#ffdd00` | `#f5c518` | no |
| Limbered Artillery | `#ccaa00` | `#c8a84a` | no |
| Mounted Cavalry | `#44cc88` | `#44aa44` | no |
| Dismounted Cavalry | `#228855` | `#88cc88` (lighter than mounted; legend darker) | no |
| Union / Confederate swatch | `#3355cc` / `#cc4433` (`UF`, `99413`) | `#3a6bc4` / `#c43a3a` (`sA/aA`, `96427–96428`) | no |

Legend "Sides" note (`99519`): "Dot outline = side color / Dot fill = disposition color". Canvas (`96591–96640`): a side-filled rectangle (`fillRect(-Ut/2,-An/2,Ut,An)`, width `Ut = lA(strength)` 10–120 px, height `An = 8` or `4` for cavalry) with a **3.5 px radius posture dot 7 px above**; artillery = outlined rectangle + mid-line; skirmish = dashed line. Legend "Size" (`99559`): circles r=5/7/9 "Regiment (~400) / Brigade (~2000) / Division (~6000)". The mobile mini-legend (`103344` items, style `miniLegend` `104005`) shows a third variant (Union `#3a6bc4`, Confed `#c43a3a`, Charging `#ff4422`, Artillery `#f5c518`, Retreat `#ff8800`) with 9 px labels (`miniLabel`), and the mobile roster uses `#5588dd/#dd5544`. Onboarding copy says "blue = Union, red = Confederate … dots" (`111823–111824`) and "Yellow dots = artillery. Larger dots = larger units" (`111831`) for what are rectangles (artillery = outlined rectangle).

### 2.5 Contrast of what the app actually uses (`contrast.py`)

Text-colour declarations in the app UI (`bundle.pretty.js` 96200–113377, property `color` only, 260 declarations) against the darkest panel `#0a0a14`:

| Colour | uses | contrast | verdict |
|---|---:|---:|---|
| `#444` | 4 | **2.02** | fail (splash "Skip intro ›" `101581`, style `Va.skip` `101670`; mobile tick info `tn.tickInfo` `103853`) |
| `#555` | 14 | **2.64** | fail (`ji.histTick`, toast ticks `eh.toastTick`, minimap/legend captions) |
| `#666` | 32 | **3.43** | fail (tick label `tc.tickLabel`, close ✕, unit id) |
| `#777` | 7 | **4.40** | fail (unit-panel breadcrumb `ji.breadcrumb`; the Help modal's inactive tabs are `#777` too, in the lazy chunk) |
| `#8b6914` | 8 | 3.87 | fail as text (used as day label `tc.dayLabel`, splash subtitle `Va.subtitle`); OK for borders (≥3:1) |
| `#c43a3a` / `#3a6bc4` | 2 / 3 | 3.76 / 3.83 | fail as text; fine as marks |
| `#888` | 33 | 5.56 | pass |

**86 of 260 text declarations (33 %) and 17 of 57 distinct text colours fail 4.5:1.** Sub-pages: `#6f7686` (site-nav group descriptions `site-nav.css:96`, footer `129`) = 4.32 : 1 on `#0a0a14` / 4.08 : 1 on the `#12121e` menu panel; `#777` 4.40; `#555`/`#666` in a few widgets. Also translucent panels: `Sd.wrap` (speed HUD) is `rgba(8,8,18,0.80)`, mini-legend `0.82`, minimap `0.85`; over white imagery a 0.86 panel composites to `#2c2c35` where `#8a93a8` is 4.49 : 1 and `#888` fails — a panel needs α ≥ 0.92 **or** blur to guarantee AA over bright imagery.

Report print stylesheet (`report.html:37–43`): `#report .key-action { color:#ccc }` (line 35) is not overridden in print → **1.61 : 1** on white; `#report h2` gold `#c9a24b` on white = 2.40 : 1; row labels `#8a93a8` = 3.08 : 1; `#gtbg-nav`/`#gtbg-footer` are not hidden.

### 2.6 Icon inventory

* Shared sprite (`site-nav.js:71–91`, identical to `icons.svg`): **19 symbols** — `compass sabers film book pin pulse broadcast search clock chart camera eye eye-off shuffle download users phone-ar flag menu`. `sabers` is **referenced nowhere** (dead symbol). `book` is used for 3 different meanings (Learn group, For Students, Battle Reports), `pulse` 3× (Experience group, Turning Points, Living Ledger), `users` 3× (Share group, Find Ancestor, Watch Together), `broadcast` 2× (Historian and Immersive), `flag` 2× (Sandbox, Regimental Biography), `chart` 2×. Sprite is *only* loaded on pages that include `site-nav.js`; the React app never uses it.
* App UI (bundle, tour data excluded): **108 glyph/emoji uses, 44 distinct characters**: `✕`×19, `→`×10, `▶`×7, `←`×5, `🗺`×5, `★`×4, `⭐`×4, `🔭`×4, `◀`×3, `📍`×3, `↗`×3, `🎖`×2, `📹`×2, `⬛`×2, `🖥`×2, `⏸`×2, `🔍`×2, `☰`×2, `🗿`×2 … plus letters **S F L B ?** used as icons (`113146…`), `🏛` for monument markers (`KF`, `bundle.pretty.js:100938`) vs `★` SVG for the same button in `index.html:650–654`.
* Emoji render differently per OS (Segoe/Apple/Noto), can't take `currentColor`, and `🖥 📱` on the chooser cards are dark-on-dark (`ko.cardIcon` `102866` inherits colour).


---

## 3. The token system (target)

### 3.1 Architecture — one source, three tiers, three consumers

```
design/tokens.json  (W3C DTCG: { "$type":"color", "$value":"#c9a24b" }, hand-edited, reviewed)
        │  build step: 60-line node script (or Style Dictionary), runs in CI, fails on unknown refs
        ├─► /css/tokens.css      :root vars, dark default, light + forced-colors + contrast overrides
        ├─► /js/tokens.js (ESM)  numeric/hex constants for canvas + Mapbox paint expressions (map must not hard-code colours)
        ├─► /styleguide.html     generated swatches/type/spacing/z-scale (noindex) — see §14
        └─► tokens.d.ts          type-safe names for the React app
```

* **Tier 1 primitives** (`--ink-950`, `--brass-400`, `--union-500`): raw values, never referenced by components.
* **Tier 2 semantics** (`--bg`, `--surface-1`, `--text-2`, `--accent`, `--union`, `--focus-ring`): what components use; this is where light/dark/forced-colors/contrast swap.
* **Tier 3 component tokens** (`--btn-h`, `--panel-w`, `--toolbar-h`): optional, defined next to the component.
* **Cascade layers** end the specificity fights that caused C8: `@layer reset, tokens, base, components, utilities, page;` — `button.filter-chip` in a reset layer can never again beat `.gb-chip` in `components`. (Cascade layers are baseline in all evergreen engines since 2022; declare the layer order once at the top of `app.css`.)
* **Delivery.** One hashed stylesheet `/css/app.<hash>.css` (target ≤ 14 KB raw / ≤ 4 KB brotli: tokens + reset + base + ~25 components) linked normally from every HTML (`<link rel="stylesheet">`, *not* the preload/onload swap that `index.html:56–58` uses and that produces the P5 "preload not used" warnings). It replaces `site-nav.css`, the 26 inline `<style>` blocks and `index.html:60–253`; page-specific rules stay in a tiny `@layer page` block. `Cache-Control: public, max-age=31536000, immutable` (already configured for `/assets/*`; add `/css/*`, `/fonts/*`, `/icons/*`).
* **In the React app** the 613 inline `style:` objects become class names from the same stylesheet (CSS Modules or plain `gb-*` classes). Inline `style` is retained only for genuinely dynamic values (pixel position, percentage width) and then via CSS custom properties (`style={{'--pct': p}}`). Reasons this matters *for design quality*: inline styles cannot express `:hover`, `:focus-visible`, `:active`, `@media`, `@media (forced-colors)`, `@media print`, `::before`, `::-webkit-slider-thumb`, `:has()`, container queries or `prefers-reduced-motion` — which is exactly the list of things the app UI currently lacks. **Migration is mechanical**: every style const is a static object literal, so a codemod (`jscodeshift` over the reconstructed source, or a one-off script over `style_consts.json` — 33 consts / 462 keys already extracted by `panels2.py`) can emit `Component.module.css` with kebab-cased declarations, leaving the 13 `window.innerWidth` reads (8 in module-load style literals) to be rewritten by hand as `@media`/container rules.
* **CSP dividend (X3).** React writes `style` props through the CSSOM (`node.style.x = …`), which CSP does **not** block (only `style=""` attributes parsed from markup and `<style>` blocks are governed) — *verify in Report-Only before relying on this*. The static HTML has **27 `<style>` blocks and 51 `style="…"` attributes** (compare 6, dashboard 5, watch-together 10, index 4, sandbox 4 …). Moving them to `app.css` lets `style-src 'self'` be enforced without `'unsafe-inline'`.

### 3.2 Colour

**Rules.** (1) One gold, one Union blue, one Confederate red, one neutral ramp. (2) Text tokens ≥ 4.5 : 1 on every surface they may sit on; non-text marks/controls ≥ 3 : 1. (3) Side is never conveyed by colour alone in text (always the word, glyph or frame shape). (4) Translucent overlay panels use α ≥ 0.92 (+ blur), or the text tier drops one level. (5) Every colour is a token; a lint rule (§14) rejects hex/rgb literals outside `tokens.css`.

All values below were validated by `tokens_check.py`:

```css
/* tokens.css (excerpt) — dark is the default; light/contrast/forced-colors override Tier 2 only */
@layer tokens {
:root {
  color-scheme: dark light;

  /* Tier 1 — primitives */
  --ink-1000:#050508; --ink-950:#0a0a14; --ink-900:#12121e; --ink-800:#1a1a2a; --ink-700:#242438; --ink-600:#33334a;
  --slate-100:#f4f2ec; --slate-200:#e8e6df; --slate-300:#b9bac6; --slate-400:#8a93a8; --slate-500:#7b849a; --slate-600:#6a7390;
  --brass-200:#e8d5a3; --brass-300:#d9b65a; --brass-400:#c9a24b; --brass-600:#8b6914; --brass-800:#3d2f0b;
  --union-200:#bcd3ff; --union-300:#9dbcf0; --union-500:#3a6bc4; --union-700:#1a3a7a;
  --conf-200:#ffc4b5;  --conf-300:#f0a08f;  --conf-500:#c43a3a;  --conf-700:#7a1a1a;
  --sage-300:#6fcf97; --amber-300:#f2a541; --coral-300:#ff7b6e; --sky-300:#8fa8c9;

  /* Tier 2 — semantics (dark) */
  --bg:var(--ink-950);  --bg-void:var(--ink-1000);
  --surface-1:var(--ink-900);  --surface-2:var(--ink-800);  --surface-3:var(--ink-700);
  --surface-overlay:rgb(10 10 20 / .94);           /* + backdrop-filter:blur(10px) */
  --scrim:rgb(0 0 0 / .60);
  --text-1:var(--slate-200);  --text-2:var(--slate-300);  --text-3:var(--slate-400);
  --text-4:var(--slate-500);                        /* placeholder/disabled only; ≤ surface-2 */
  --text-on-accent:var(--ink-950);
  --border-subtle:#1e1e2e;                          /* decorative dividers only */
  --border:var(--ink-600);
  --border-control:var(--slate-600);                /* inputs/buttons boundary: ≥ 3.2:1 on surfaces 0-3 */
  --accent:var(--brass-400); --accent-hi:var(--brass-200); --accent-text:var(--brass-300); --accent-lo:var(--brass-600);
  --focus-ring:var(--brass-200);
  --union:var(--union-500); --union-text:var(--union-300); --union-fill:var(--union-700);
  --conf:var(--conf-500);   --conf-text:var(--conf-300);   --conf-fill:var(--conf-700);
  --ok:var(--sage-300); --warn:var(--amber-300); --danger:var(--coral-300); --info:var(--sky-300);
}
}
```

**Measured contrast (WCAG 2.x ratio) of the proposed dark tokens** — text on `--bg #0a0a14 / --surface-1 #12121e / --surface-2 #1a1a2a / --surface-3 #242438`:

| token | value | s0 | s1 | s2 | s3 |
|---|---|---:|---:|---:|---:|
| `--text-1` | `#e8e6df` | 15.77 | 14.87 | 13.73 | 12.15 |
| `--text-2` | `#b9bac6` | 10.22 | 9.64 | 8.90 | 7.87 |
| `--text-3` | `#8a93a8` | 6.39 | 6.03 | 5.57 | 4.93 |
| `--text-4` | `#7b849a` | 5.26 | 4.96 | 4.58 | **4.05 (don't use on s3)** |
| `--accent` (as text) | `#c9a24b` | 8.21 | 7.74 | 7.14 | 6.32 |
| `--accent-text` | `#d9b65a` | 10.12 | 9.54 | 8.81 | 7.79 |
| `--union-text` | `#9dbcf0` | 10.21 | 9.62 | 8.89 | 7.86 |
| `--conf-text` | `#f0a08f` | 9.50 | 8.96 | 8.27 | 7.32 |
| `--ok / --warn / --danger / --info` | `#6fcf97 / #f2a541 / #ff7b6e / #8fa8c9` | 10.36 / 9.60 / 7.79 / 8.08 | 9.77 / 9.05 / 7.35 / 7.61 | 9.02 / 8.35 / 6.78 / 7.03 | 7.98 / 7.39 / 6.00 / 6.22 |
| `--border-control` | `#6a7390` | 4.19 | 3.95 | 3.65 | 3.23 |
| `--accent-lo` (border/fill) | `#8b6914` | 3.87 | 3.65 | 3.37 | – |
| `--union` / `--conf` (marks) | `#3a6bc4` / `#c43a3a` | 3.83 / 3.76 | 3.61 / 3.55 | 3.33 / 3.28 | – |
| button: `--text-on-accent` on `--accent` | `#0a0a14` on `#c9a24b` | 8.21 | | | |
| white on `--union-fill #1a3a7a` / `--accent-lo` / `--conf-fill` | | 10.88 / 5.09 / 10.55 | | | |
| focus ring `#e8d5a3` | | 13.58 | 12.80 | 11.82 | |
| map label text on 80 % black halo: `#bcd3ff` / `#ffc4b5` / `#f4f2ec` | | 13.1 / 13.0 / 17.7 | | | |

**Note on the existing palette:** the brand *is preserved* — `--ink-950`, `--ink-900`, `--brass-400`, `--brass-200`, `--brass-600`, `--union-500`, `--conf-500` are today's most-used values; the change is removing ~250 stray variants and giving text greys a floor (`#444/#555/#666/#777` → `--text-3` or `--text-4`).

**Light theme ("Archive paper")**, validated (text/graphics contrast on `--paper-100 #f5f0e4 / --paper-50 #fffcf5 / --paper-200 #ece5d3`):

```css
:root[data-theme="light"]{
  --bg:#f5f0e4; --surface-1:#fffcf5; --surface-2:#ece5d3; --surface-3:#e0d7c1;
  --surface-overlay:rgb(255 252 245 / .94); --scrim:rgb(20 18 12 / .45);
  --text-1:#1b1a16 /*15.3*/; --text-2:#45413a /*8.9*/; --text-3:#5f5a4d /*6.0*/; --text-4:#6b6556 /*5.1 (s0,s1)*/;
  --border-control:#7d7767 /*3.9 on s0, 4.35 on s1*/; --border-subtle:#d9d0ba;
  --accent:#a67c1a /*graphic 3.35 on s0*/; --accent-text:#7a5a0a /*5.6*/; --text-on-accent:#1b1a16 /* on #c9a24b = 7.3 */;
  --union:#2f5fb0 /*5.5*/; --union-text:#1f4f9e /*6.9*/; --conf:#b03030 /*5.6*/; --conf-text:#a3262a /*6.4*/;
  --ok:#1f7a4a /*4.7 — don't use on s2/s3*/; --warn:#8a5200 /*5.6*/; --danger:#b3261e /*5.8*/; --info:#2b5d8c /*6.1*/;
  --focus-ring:#1f4f9e;
}
@media (prefers-color-scheme: light){ :root:not([data-theme="dark"]){ /* identical declarations — emitted twice from tokens.json by the build step, never hand-copied */ }}
```

Side-pair check under CVD for the *proposed* marks (`cvd.py`): proposals A `#2b6cb0/#d9541e` ΔE2000 47.2 / 49.0 / 55.8 / 66.0 (normal/protan/deutan/tritan); the **current pair is already fine** (41.7/42.3/51.0/65.8) — so **keep `#3a6bc4` / `#c43a3a`** for identity continuity and fix everything else (D-3).

**Forced-colors / high-contrast** (Windows): tokens map to system colours; borders replace fills for state:

```css
@media (forced-colors: active){
  :root{ --focus-ring:Highlight; --border-control:CanvasText; --accent:Highlight; --text-on-accent:HighlightText; }
  .gb-btn,.gb-chip,.gb-tab,.gb-panel,.gb-menu,.gb-input,.gb-toast{ border:1px solid CanvasText; }
  [aria-pressed="true"],[aria-selected="true"],[aria-current="true"]{ background:Highlight; color:HighlightText; forced-color-adjust:none; }
  .gb-icon{ forced-color-adjust:auto; }            /* SVG uses currentColor → follows ButtonText */
  canvas.gb-units{ forced-color-adjust:none; }     /* map is data; legend supplies shape/pattern redundancy */
}
@media (prefers-contrast: more){ :root{ --text-3:var(--slate-300); --border:var(--slate-500); --border-subtle:var(--border); } }
```

### 3.3 Typography

**Findings (D-4 + inventory):** `font-family` strings: `sans-serif` ×287, `Georgia` ×29 + `Georgia,serif` ×25, `monospace` ×28, `system-ui` ×14, `'Spectral'` ×14, `'Cormorant Garamond'` ×4; no font is ever loaded. Georgia is Microsoft-owned; the "Core fonts for the Web" pack was **never licensed for web embedding**, so self-hosting Georgia is not an option (licensed web-font purchase only) — it can only be a *fallback name* (uses whatever the visitor's OS provides; absent on Android/Linux where `serif` resolves to a different design → the desktop/mobile type mismatch). 28 uses of `monospace` for clock/tick/ID text.

**Options (sizes are the `latin` woff2 subsets served by Google Fonts on 2026-09-29, from `HEAD` Content-Length):**

| Option | Files | Bytes | Licence | Verdict |
|---|---|---:|---|---|
| A. System stack only | 0 | 0 | – | zero cost; inconsistent serif on Android/Linux |
| **B. Spectral 400 + 700 self-hosted (+ 600 optional)** | 2–3 | 21.7 KB (400) + 23.0 KB (700) [+22.9 KB (600)] ≈ **44.7 KB** (weights in the order Google's CSS returned them; re-measure at download) | SIL OFL 1.1 (Production Type) — self-host/redistribute OK; keep OFL text | **Recommended** for headings + narrative; matches what the code already requests |
| C. Inter variable (UI) | 1 | 48.3 KB | OFL | not needed if UI uses `system-ui` |
| D. Source Serif 4 var / Newsreader var / Literata var | 1 | 122 / 132 / 86 KB | OFL | too heavy for the LCP budget |
| Cormorant Garamond 600/700 | 1–2 | ~37.6 KB each | OFL | thin at small sizes; remove (4 refs) |

**Decision:** *Spectral for display + narrative, system UI sans for controls, tabular numerals for time.*

```css
@font-face{ font-family:"Spectral"; font-style:normal; font-weight:400; font-display:swap;
  src:url(/fonts/spectral-400-latin.woff2) format("woff2"); unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face{ font-family:"Spectral"; font-weight:700; font-display:swap; src:url(/fonts/spectral-700-latin.woff2) format("woff2"); /* same unicode-range */ }
/* metric-compatible fallback so swap causes CLS = 0 (compute size-adjust/ascent/descent/line-gap with @capsize/metrics against Georgia & "Times New Roman"; verify in DevTools) */
@font-face{ font-family:"Spectral Fallback"; src:local("Georgia"),local("Times New Roman"); size-adjust:/*computed*/; ascent-override:/*computed*/; descent-override:/*computed*/; line-gap-override:/*computed*/; }
:root{
  --font-serif:"Spectral","Spectral Fallback",Georgia,"Times New Roman",serif;
  --font-sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;   /* <kbd> and IDs only */
}
```

* **Do not gate FCP/LCP on fonts.** `#boot-splash` (`index.html:91–131`) must use the fallback stack only (no webfont), so the splash `h1` (the LCP element) paints immediately; the map app switches to Spectral after mount (splash is gone; no visible swap). On sub-pages preload **only** `spectral-700-latin.woff2` (the `h1`, ~23 KB) with `<link rel="preload" as="font" type="font/woff2" crossorigin>`.
* **Licensing hygiene:** ship `/fonts/OFL.txt` + a header comment naming "Spectral © Production Type, SIL OFL 1.1"; add `font-src 'self'` and *remove* `fonts.googleapis.com` / `fonts.gstatic.com` from CSP (`netlify.toml:19` allows them; nothing uses them → dead attack surface). Subsetting with `pyftsubset` counts as a modification under the OFL: check whether the shipped `OFL.txt` declares a Reserved Font Name and, if it does, rename the subset (e.g. "Spectral Latin") — *verify at download time*; the licence text itself must travel with the files.
* **Type ramp** (rem; all ≥ 12 px; body inputs 16 px to stop iOS zoom):

```css
:root{
  --fs-2xs:.75rem;   /* 12  captions, eyebrows (caps, tracked), tabular meta — HARD FLOOR */
  --fs-xs:.8125rem;  /* 13  secondary UI, chips */
  --fs-sm:.875rem;   /* 14  default UI / dense panels */
  --fs-md:1rem;      /* 16  body, inputs, narrative */
  --fs-lg:1.125rem;  /* 18  panel titles, lead */
  --fs-xl:1.375rem;  /* 22  section titles */
  --fs-2xl:clamp(1.5rem,1.15rem + 1.2vw,2rem);    /* 24-32 page h1 (replaces 8 different h1 scales) */
  --fs-3xl:clamp(2rem,1.4rem + 2.4vw,3rem);       /* 32-48 hero */
  --fs-display:clamp(2.25rem,1.2rem + 5.2vw,4.5rem); /* 36-72 splash wordmark */
  --lh-tight:1.15; --lh-snug:1.3; --lh-ui:1.5; --lh-read:1.65;
  --tracking-caps:.08em; --tracking-wide:.04em;
}
.gb-num{ font-variant-numeric:tabular-nums lining-nums; }   /* clock, tick, strength, casualty — replaces 28 `monospace` uses */
h1,h2,h3{ text-wrap:balance; } p{ text-wrap:pretty; }        /* progressive enhancement */
```

* **Mapping table (current → token):** 7/8/9/9.5/10/11/11.5 px → `--fs-2xs` (12) [grow the container, not shrink the type — see cartography label tiers for canvas], 12/12.5 → `--fs-2xs`/`--fs-xs`, 13 → `--fs-xs`, 14/14.4/15 → `--fs-sm`, 16/17/18/19 → `--fs-md`/`--fs-lg`, 20/22 → `--fs-xl`, 26/28/32 → `--fs-2xl`, 40/48/52/… → `--fs-3xl`/`--fs-display`.
* **Splash wordmark fix (H3 clip):** the React splash uses `fontSize:52; letterSpacing:8` on ALL-CAPS `GETTYSBURG` (`bundle.pretty.js:101618–101620`) ≈ 10×0.68 em + 10×8 px ≈ 434 px > 375 px viewport → "ETTYSBURC". `--fs-display` with `letter-spacing:.08em` fits a 320 px viewport (≤ 37 px at 320). The HTML boot splash already uses `clamp(2.75rem,11vw,6rem)` in mixed case (fits) — reuse that markup for the only splash (§8).
* **Narrative typography** (story panel `Cr.script`, Historian answers, Documentary, Aftermath): `--font-serif`, `--fs-md`/`--lh-read`, `max-inline-size:62ch`, paragraph spacing `--sp-md`, no all-caps paragraphs, first line of a vignette in `--fs-lg`. Data labels stay sans.

### 3.4 Spacing, size, radius, elevation, motion, breakpoints, z-index

```css
:root{
  /* spacing — 4 px grid (+2 px hairline) */
  --sp-2xs:2px; --sp-xs:4px; --sp-sm:8px; --sp-md:12px; --sp-lg:16px; --sp-xl:24px; --sp-2xl:32px; --sp-3xl:48px; --sp-4xl:64px;
  /* controls & hit targets */
  --hit-min:24px;                 /* WCAG 2.2 SC 2.5.8 floor (AA), desktop dense */
  --hit-touch:44px;               /* AAA / our touch standard */
  --control-sm:32px; --control-md:40px; --control-lg:48px;
  /* radius */
  --r-xs:4px; --r-sm:8px; --r-md:12px; --r-pill:999px; --r-round:50%;
  /* elevation (dark UI: also step surface lightness) */
  --elev-0:none;
  --elev-1:0 1px 2px rgb(0 0 0 / .40);
  --elev-2:0 4px 12px rgb(0 0 0 / .50);                       /* toasts, menus, popovers */
  --elev-3:0 12px 32px rgb(0 0 0 / .60);                      /* docked panels, sheets */
  --elev-4:0 24px 64px rgb(0 0 0 / .70);                      /* modals */
  --glow-accent:0 0 0 1px var(--accent), 0 0 16px rgb(201 162 75 / .25);
  /* motion */
  --dur-fast:120ms; --dur-base:200ms; --dur-slow:320ms; --dur-emph:500ms;
  --ease-standard:cubic-bezier(.2,0,0,1); --ease-out:cubic-bezier(.05,.7,.1,1); --ease-in:cubic-bezier(.3,0,.8,.15);
  /* layout chrome */
  --toolbar-h:56px; --transport-h:88px; --safe-t:env(safe-area-inset-top,0px); --safe-b:env(safe-area-inset-bottom,0px);
  /* z-index scale — the ONLY legal z-index values (stylelint enforced) */
  --z-map:0; --z-map-overlay:10; --z-hud:100; --z-dock:200; --z-sheet:300; --z-menu:400; --z-tooltip:500; --z-toast:600; --z-modal:700; --z-tour:800; --z-splash:900; --z-skip:1000;
}
@media (pointer:coarse){ :root{ --control-sm:44px; --control-md:44px; --control-lg:48px; } }
@media (prefers-reduced-motion:reduce){ :root{ --dur-fast:.01ms; --dur-base:.01ms; --dur-slow:.01ms; --dur-emph:.01ms; } }
```

**Migration map (default targets; a codemod applies them, a human reviews the diff):**

| current | → token | | current | → token |
|---|---|---|---|---|
| spacing 1, 2 | `--sp-2xs` (or 1 px border) | | radius 2, 3, 4, 5 | `--r-xs` |
| 3, 5 | `--sp-xs` | | 6, 7, 8, 10 | `--r-sm` |
| 6, 7, 9, 10 | `--sp-sm` (gaps) / `--sp-md` (padding) | | 12, 14, 16 | `--r-md` |
| 11, 13, 14 | `--sp-md` / `--sp-lg` | | 20, 24 | `--r-pill` |
| 18, 20, 22 | `--sp-lg` / `--sp-xl` | | shadows (≥16 recipes) | `--elev-1…4` |
| 26, 28, 30, 34 | `--sp-xl` / `--sp-2xl` | | durations 10–5000 (20) | `--dur-fast/base/slow/emph` (+ named one-offs for ambient loops: 1.4 s boot bar, 3.4 s pin glow) |
| 40, 48, 50, 60, 70 | `--sp-2xl` / `--sp-3xl` / `--sp-4xl` | | z-index (27 levels) | see §6.2 mapping table |

**Breakpoints** (CSS vars can't be used in `@media`; documented constants, used mobile-first): `480` (compact→ large phone), `768` (medium/tablet), `1024` (expanded desktop), `1440` (wide) + height query `(max-height:500px)` for landscape phones + `(pointer:coarse)` / `(hover:none)`. The app root gets `container-type:inline-size` so panels respond to *their* container (unit panel in a 320 px dock ≠ full width). This **replaces** the layout-deciding `window.innerWidth` reads (`98111–98115`, `102708–102712`, `110615`, canvas `c.width < 500` `96604`/`96653`) and the 500/560/860 JS thresholds.


---

## 4. Icon system (replaces emoji/letter icons)

**Goal:** one SVG icon family (24 × 24 grid, 1.75 stroke, round caps/joins, `currentColor`) used identically by the map app and all static pages; zero emoji or letters as icons; every icon-only control has an accessible name.

### 4.1 What exists (verified)

* **Sprite** `site-nav.js:71–91` (also `icons.svg`): 19 symbols — `compass sabers film book pin pulse broadcast search clock chart camera eye eye-off shuffle download users phone-ar flag menu`. Injected at idle by JS on every sub-page (`site-nav.js:97–109`), so icons appear *after* first paint into reserved 18 × 18 boxes (`site-nav.css:5–8`). **`sabers` is unused.** The map app's own toolbar never uses the sprite.
* **Meaning collisions inside the nav menu** (`site-nav.js:12–58`): `book` ×3 (Learn group, For Students, Battle Reports), `pulse` ×3 (Experience group, Turning Points, Living Ledger), `users` ×3 (Share group, Find Ancestor, Watch Together), `broadcast` ×2 (Historian, Immersive), `flag` ×2 (Sandbox, Regimental Biography), `chart` ×2. Icons that don't distinguish items add noise, not wayfinding.
* **App UI:** 108 glyph uses / 44 distinct characters (§2.6); toolbar = `S F ☰ L 🗿 🔭 ⭐ 📏 🗺 📍 🔍 B ?` (`113146–113240`), i.e. 5 letters + 8 emoji; **Search appears twice** (`S` → `toggleSearchPanel` `113146`, `🔍 "Find Unit / Location"` → the same `toggleSearchPanel()` `113213`); `🗺` means Map Layers on the toolbar (`113193`), Virtual Walkthrough on the header button (`113137`) *and* Map Layers (`103439`) / Mini Map (`103474`) in the mobile Tools sheet (14 tools, `103390–103481`); `🖥` "Desktop View" is dark-on-dark.
* **Icon-only buttons are labelled only by `title=`** (60 `title:` props; none has `aria-label`); `index.html:398–440` patches `title`/`aria-label` after the fact by matching the letter glyph ("S","F","L","B","?") — the fragile workaround for A5.

### 4.2 Target set (≈ 50 icons; candidate Lucide names — *verify each name exists at implementation time*)

Licensing: **Lucide = ISC** (Feather-derived icons MIT); both require the copyright/permission notice to ship with the software → put `icons/LICENSE-lucide.txt` (ISC + Feather MIT) in `/icons/` and link it from the Credits section of About. Custom historic icons (below) are project-owned.

| Group | Icons |
|---|---|
| Transport | `play` `pause` `step-back` (1 tick) `step-forward` `skip-back` (−1 h) `skip-forward` (+1 h) `rewind`/`fast-forward` (day jump) |
| Chrome | `x` (close) `chevron-left/right/up/down` `arrow-left/right` `external-link` `ellipsis` (More) `menu` `check` `info` `triangle-alert` `circle-help` `settings`/`sliders-horizontal` `keyboard` `sun` `moon` `link` `copy` `share-2` `printer` `download` `rotate-ccw` (reset) |
| Map tools | `search` `filter` (funnel) `list` (roster) `layers` (map layers) `legend` (**custom**: 3 swatches + rule lines) `landmark` (monuments; or custom obelisk) `binoculars` (Soldier's Eye) `star` (ancestor) `ruler` (distance) `map-pin` (locations) `bookmark` `swords` (Order of Battle) `route` (walkthrough / NPS tour) `map` `mountain` (relief) `flame` (heat-map) `eye`/`eye-off` (units on/off) `crosshair` (locate) `maximize-2/minimize-2` (minimap) `volume-2`/`volume-x` |
| Historic (custom, drawn to the same grid) | `infantry` (rect + crossed diagonals — APP-6 style), `cavalry` (rect + single slash), `artillery` (rect + filled dot), `commander-kia` (dagger †), `wounded` (`bandage`), `captured` (`flag`), `regiment-flag`, `sabers` (re-use for OOB / cavalry) |
| Feature nav (site menu) — make each distinct | Search `search`, Compare `columns-2`/`shuffle`, Camera `camera`, Viewshed `scan-eye`, Sandbox `flask-conical`, Historian `message-square-quote` (a dialog, **not** `broadcast`), Documentary `film`, Turning Points `signpost`, Students `graduation-cap`, Aftermath `hourglass`, Regiment `id-card`, Find Ancestor `user-search`, Dashboard `chart-column`, Reports `file-text`, Immersive `headphones`, Living Ledger `scroll-text`, Ground Remembers `flame`/`map-pin`, AR `smartphone`, Watch Together `users-round`, Export `clapperboard` |

**Mapping of every glyph currently used** (`→ replacement`): `S`/`🔍` → `search` (**delete the duplicate button**); `F` → `filter`; `☰` → `list`; `L`/`⊞` → `legend`; `🗿`/`🏛` (monument markers) → `landmark`; `🔭` → `binoculars`; `⭐`/`★` → `star`; `📏` → `ruler`; `🗺` (Map Layers) → `layers`; `🗺` (Virtual Walkthrough) → `route`; `📍`/`📌` → `map-pin`; `B` → `bookmark`; `?` → `circle-help`; `🎖` → `route`/`medal`; `⚔` → `swords`; `🖥`/`📱` → `monitor`/`smartphone`; `🔊/🔇` → `volume-2/volume-x`; `▶ ⏸ ◀ ⏮ ⏭ ⏩` → transport set; `✕` (×19) → `x`; `→ ← ↗` → `arrow-*`/`external-link`; `⚠` → `triangle-alert`; `✓` → `check`; `⎘` → `copy`; `🔗` → `link`; `📹` → `video`; `🪖` → `infantry`; `🔵🔴` and `⬛ UNION / CONFEDERATE` → a **side swatch** component (frame shape + fill + text label); `📚 ⚡ 🗺` (onboarding archetypes) → `book-open`, `keyboard` (only when `(hover:hover) and (pointer:fine)`), `compass`; `💡` → `lightbulb`; `⚕ ⚑ †` (commander toasts, `qF` `ZF()` at `99985`) → `bandage`, `flag`, dagger as *typographic* † (it is text in Spectral, acceptable) with a text label.

### 4.3 Pipeline & rules

1. `icons/src/*.svg` (24×24, no fills except `currentColor`, `stroke-width="1.75"`), linted by `svgo` with `removeViewBox:false`.
2. **React:** generated `icons.tsx` (`<Icon name="play" size={20} />`, each path as JSX; tree-shaken; ~50 icons ≈ 9 KB raw / ~3 KB gz).
3. **Static pages:** the sprite is inlined **at build time** into each HTML (`<svg hidden>` after `<body>`), replacing the runtime `loadIconSprite()` idle injection (`site-nav.js:97–109`) → no empty-box flash, no external `<use>` (Safari issue noted in `site-nav.js:65–70`). Without any build step, keep the runtime injector but move it into `app.js` `defer` — never in the critical path.
4. `.gb-icon{ inline-size:1.25em; block-size:1.25em; flex:none; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round }` with sizes 16/20/24 via `--icon-size`.
5. Decorative: `aria-hidden="true" focusable="false"`. Icon-only control: `aria-label` **and** the custom tooltip (§5.11) — never `title` alone.
6. **Acceptance:** `grep -P "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]"` over `src/` and all HTML returns nothing except tour/story *content* strings; no letter ("S","F","L","B","?") is used as an icon; every icon-only button has `aria-label` (axe rule `button-name` = 0 violations); the `sabers` symbol is used or removed; no two different features in the site menu share an icon.

---

## 5. Component inventory, states, acceptance criteria

Common rules for **every** interactive component: min hit area 24 × 24 CSS px on `pointer:fine`, **44 × 44 on `pointer:coarse`** (achieved with padding/`::after` inflation, not by making glyphs bigger); visible `:focus-visible` ring `outline:2px solid var(--focus-ring); outline-offset:2px` (≥ 3:1 vs adjacent colours; replaces the global rule at `site-nav.css:138`); `cursor:pointer` only on real controls; state via ARIA attributes (`aria-pressed`, `aria-selected`, `aria-expanded`, `aria-current`, `aria-disabled`) which are also the CSS hooks; transitions ≤ `--dur-base` and disabled under `prefers-reduced-motion`; no meaning by colour alone; all text ≥ 12 px and ≥ 4.5 : 1.

### 5.1 Button (`.gb-btn`) — replaces the 11 gold-button + 8 ghost-button definitions

| Variant | Use | Spec |
|---|---|---|
| `--primary` | one per view (Play, Ask, Print, Start tour) | bg `--accent`, text `--text-on-accent` (8.2 : 1), border `--accent`, height `--control-md` (40 / 44 coarse), padding `0 var(--sp-lg)`, radius `--r-sm`, `--fs-sm` 600 |
| `--secondary` | most actions | bg transparent, border `--border-control` (≥ 3.2 : 1), text `--text-1` |
| `--ghost` | toolbar/inline | no border, text `--text-2`; hover bg `--surface-3` |
| `--danger` | destructive (Delete bookmark) | text `--danger`, border `--danger` |
| `--icon` | icon-only | square `--control-md`, `aria-label` required |
| sizes | `sm` 32 (44 coarse), `md` 40 (44), `lg` 48 | |

States matrix (each must be designed & tested): default · hover (`bg` +1 surface step, never colour change alone) · focus-visible (ring) · active/pressed (`transform:scale(.98)`, 80 ms) · disabled (`aria-disabled="true"`, `opacity:.55` **and** `cursor:not-allowed`; text ≥ 3 : 1 — exempt from 4.5 but still legible) · loading (`aria-busy="true"`, spinner replaces icon, width locked to avoid CLS) · toggled (`aria-pressed="true"`: bg `rgb(201 162 75 / .16)`, border `--accent-lo`, text `--accent-hi`).
**Acceptance:** axe 0 issues; measured box ≥ 44 × 44 at `pointer:coarse` (Playwright `boundingBox`); one definition of `.gb-btn` in the repo (`grep -c "\.play-btn\|\.mode-btn\|\.ctl-btn\|\.btn-sec\|\.nav-btn\|\.cta\b" = 0` outside compatibility aliases); primary text/bg ≥ 8 : 1.

### 5.2 Toolbar button (icon + optional label)

`40 × 40` (44 coarse), icon 20; label shown ≥ 1280 px (`--fs-xs`, `--text-2`), icon-only 1024–1279 with tooltip; group separators (`1px --border-subtle`, 20 px tall); `aria-pressed` for toggles (Legend, Layers, Units, Relief), plain for openers. Replaces `Vs()` (`113287`, `toolBtn` `113356`: `padding:4px 10px; fontSize:12; fontFamily:monospace` ≈ 28 × 26). **Acceptance:** all toolbar controls ≥ 40 × 40 (desktop) / ≥ 44 × 44 (coarse); every one has `aria-label`, tooltip, and an accessible pressed/expanded state; no letter icons; keyboard: toolbar is `role="toolbar"` with roving tabindex (`←/→`, `Home/End`), one tab stop.

### 5.3 Chip / filter chip (`.gb-chip`) — fixes C8 permanently

Pill (`--r-pill`), height 32 (44 coarse via padding), `--fs-xs`, `border:1px solid var(--border-control)`, `background:var(--surface-1)`, `color:var(--text-2)`; selected → `aria-pressed="true"`/`aria-checked` + check icon (redundant cue) + `--accent-hi` text on `rgb(201 162 75 / .16)`; group is `role="group"` (multi) or `role="radiogroup"` with `role="radio"` (single, e.g. All/Regiments/Vignettes/Locations). **Acceptance:** unselected chip text/bg contrast measured ≥ 4.5 (was 1.10); the same class is used by Search filters, Historian suggestions, Compare toggles, Camera modes; selected state distinguishable in forced-colors and greyscale (icon + border).

### 5.4 Tabs (`role="tablist"`) — day tabs, legend tabs, help tabs, compare style tabs

Tab height 44 (coarse) / 36; active: `--text-1` + 2 px `--accent` underline (not colour only: weight 600 + underline); inactive `--text-3`; `aria-selected`, `tabindex` roving, `←/→/Home/End`, panels `role="tabpanel"` with `aria-labelledby`. Overflow: horizontal scroll with fade masks, **never clip** ("Parc…" in Compare, S4) — `overflow-x:auto; scroll-snap-type:x proximity`, or wrap to two rows ≤ 480 px. **Acceptance:** 0 clipped labels at 320–768 px; arrow-key navigation works; in the map app the Help/Legend/Layers tabs are real tabs (today `<button>` without roles: `zr`, `Fr.tab`, help chunk `t.tab`).

### 5.5 Segmented control (`role="radiogroup"`) — playback speed, layout (Auto/Compact/Full), theme (System/Dark/Light), units (ft/yd/m)

Replaces the 6 inline-styled speed buttons whose inactive state is `#eee` light pills on a dark bar (`112348`) and the mobile "cycle-on-tap" speed button (`ii()` `103118`, `onClick: ii` `103235`). Height 40/44; selected = filled `--surface-3` + `--accent` text + inset ring. Speed labels are **truthful**: show the *rate* ("×2 · 20 min/s") not "1x (real time)" (H9; **verified in code:** `Ed` `96965` advances one tick every `cF / playbackSpeed = 500 ms` at 1× (`96948`, `96982`) = 2 ticks/s = 10 simulated minutes per real second; 8× = 62.5 ms/tick).

### 5.6 Cards

* **Result row / unit summary card** (Search, Find Ancestor, Historian sources, Regiment picker): `--surface-1`, border `--border-subtle`, radius `--r-sm`, padding `--sp-md`; title `--fs-md` serif 600, meta `--fs-xs --text-3`; side tag = **swatch component** (`▮` frame shape + word "Union"/"Confederate", `--union-text`/`--conf-text`); whole row is one `<a>`/`<button>` (report.html `.match` divs and the Search-panel result rows (`div onClick`, around `98876`) are not focusable today).
* **Tool card** (Explore menu; `site-nav.css:104–125` is already a good base — keep, but text 13/11.5 px → 14/12 and hover `#1a3a7a` → `--surface-3` + accent icon).
* **Story/vignette card**: see panel §5.7 — serif narrative, read-time chip, "jump to tick" ghost button.
* **Hover-lift** (`.gtbg-lift` `site-nav.css:151–152`) only under `@media (hover:hover) and (prefers-reduced-motion:no-preference)`.
**Acceptance:** each card is keyboard-operable with a single tab stop; no `div onClick`; hit area = whole card; focus ring visible on the card, not the inner link.

### 5.7 Panel (docked, non-modal) & Sheet (compact)

**Panel** (`.gb-panel`): width `--dock-w: clamp(320px, 26vw, 400px)`, header 48 px (`--fs-md` serif title, close `x` 40 px, optional pin/share), body `overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable`, sticky footer for primary action, `max-block-size: calc(100dvh - var(--toolbar-h) - var(--transport-h) - var(--sp-lg))`, `--elev-3`, `--surface-overlay` + `backdrop-filter:blur(10px)`; enter/exit 200 ms (`translateX(±16px)` + fade); `role="complementary"` (or `role="dialog" aria-modal="false"` with label) + focus moves to panel heading on open **only when opened by keyboard/click on its opener**, and returns to the opener on close. Docks: **left** (Unit, Search, Filter, OOB, Roster, Ancestor), **right** (Story, Layers, Tour, Historian drawer) — see §6.4 for the one-per-dock rule.
**Sheet** (compact ≤ 767 px): bottom sheet, `inline-size:100%`, `max-block-size:min(85dvh,640px)`, top radius `--r-md`, grab handle (visual 36 × 4, hit area 44 × 24), snap points 40 / 65 / 92 dvh, `padding-bottom: max(var(--sp-lg), var(--safe-b))`, scrim `--scrim` when modal, `inert` on everything behind, History-API entry so Android/iOS back closes it, swipe-down dismiss (with button fallback). Replaces `tn.slidePanel` (`103909`: `maxHeight:"65vh"`, `zIndex:400` **inside a z-100 stacking context**) and `tn.toolsOverlay` (z 500, same context).
**Acceptance:** panel never overlaps another docked panel (§6.4), never covers the transport bar or toolbar (measured `getBoundingClientRect` intersection = ∅ at 320/375/768/1024/1440/2560 and landscape 667 × 375); Esc closes it (also when focus is in its input — H2); scrolls inside without scrolling the map; focus returns to opener; sheet is fully reachable at 320 × 568 and 667 × 375 (landscape).

### 5.8 Modal dialog — Help, Bookmarks, Layout/Settings, Tour, Follow-Ancestor, Soldier's Eye, OOB, Roster, Walkthrough

Use native `<dialog>` + `showModal()` (gives top-layer, focus trap, `inert` background, Esc, `::backdrop` for free — supported in evergreen browsers) or an equivalent ARIA implementation; `aria-labelledby` = title, initial focus = first meaningful control (or the dialog for read-only content), scrim `--scrim`, `--elev-4`, max width 560 (Help 640), radius `--r-md`, close `x` 44 px, footer actions right-aligned (primary last), **loading state** (skeleton) so lazy chunks don't feel broken (D1: HelpModal is `React.lazy` `112469–112470` with `Suspense fallback:null` `113276`). **Stacking bug fixed by the scale:** today Help/Bookmarks are `z 600` (`assets/helpmodal-cfv9t0zh.js`, `bookmarkpanel-c5yt4b5k.js`) but OOB (`jo` 900 `102441`), Roster (`gp` 900 `102706`), Soldier's Eye (`Or` 800 `102072`), Ancestor (`lr` 700 `101295`), Layers/Distance (1000, `112514`, `112863`) — so pressing `?` with OOB open renders Help *behind* OOB. **Acceptance:** exactly one modal open at a time (opening another closes/replaces it); focus never escapes; focus returns to the opener; `aria-modal`/`inert` verified with axe; Help opens with skeleton ≤ 100 ms and content ≤ 300 ms.

### 5.9 Menu / popover — Explore, Tools overflow, Speed, Share

Trigger `aria-haspopup="menu" aria-expanded`; panel `role="menu"` (actions) or a labelled group of links (navigation — the Explore menu is *navigation*, so use a `<nav>` disclosure with links, not `role=menu`); `--z-menu`; anchored below trigger, flips at viewport edge (`position-anchor`/`anchor()` progressive, JS fallback); close on Esc/outside/tab-out; arrow keys move focus; `max-block-size: min(76dvh, 560px)`. Existing `.gtbg-menu-panel` (`site-nav.css:68–82`) is the base — but positioned `absolute` inside `#extra-features` `position:fixed; z-index:999999` today (see §7).

### 5.10 Toast / snackbar (one system; today two)

Today: `qF` command-change toasts (`99888`, container `eh` `100008`: `top:60; right:16; z 200`; auto-dismiss 4.5 s via `setTimeout` `99909/99915`; animation `slideIn 0.2s ease` `100024` **references a keyframe that exists nowhere** — no `@keyframes slideIn` in any deployed CSS/JS, so the entrance animation silently never runs) and `nO` commander-succession cards (`101679`, container `nh` `101775`: `top:58; left:60; z 400`; fades at 1.2 s, removed at 3 s; note `opacity: z.phase === "dying" ? 1 : (z.phase === "fading", 0)` sets opacity 0 immediately in the fading phase so the declared 1.8 s transition has nothing to animate). Both stack in the corners other panels use.
Target: one `<ToastRegion role="status" aria-live="polite">` at `--z-toast`, bottom-centre on compact (above the transport bar; `bottom: calc(var(--transport-h) + var(--sp-md))`) / bottom-left on desktop; max **3** visible, newest first, **dedupe by key**, auto-dismiss 5 s (error 8 s / persistent with action), **pause on hover/focus**, dismiss `x` 44 px, `Esc` dismisses the newest; **flood control:** when the tick jumps by > 3 (scrub, day jump, bookmark) suppress event toasts and clear the queue (H4); announcements are throttled (no more than 1 `aria-live` message per 2 s). Type/side shown by icon + text label, not colour (`c2()` colours `#ff4444 #ff9944 #aa88ff #88aacc` at `99971–99982` become icon + label + token colours).
**Acceptance:** after a day-jump 0 toasts are visible; a 3-toast burst leaves ≤ 3; toasts never overlap a docked panel or the transport bar; the entrance animation actually runs (keyframe defined in tokens.css) and is skipped under reduced-motion.

### 5.11 Tooltip

Custom `.gb-tip` on `:hover` (500 ms delay) and `:focus-visible` (immediate), `role="tooltip"` + `aria-describedby`, `--z-tooltip`, `--fs-xs`, dismiss with Esc, hoverable content (WCAG 1.4.13); on touch no tooltip — the button label is visible (compact toolbar shows labels in the Tools sheet). Replaces 60 `title=` attributes, which are invisible on touch, unreliable for screen readers and not keyboard-triggered. Map-marker tooltips (`fF` hover popup `97063`, `Ar.popup` `97157`: `width:260; z 500`; monument tooltip `dx.tooltip` `100965` `width:280; z 600`) become one component with edge-flip.

### 5.12 Slider — timeline scrubber (highest-value control)

Today desktop: `<input type="range" min=0 max=100 step=.01>` with inline `appearance:none; height:4px; background:transparent` (`Po.scrubInput`), **no `::-webkit-slider-thumb`/`::-moz-range-thumb` rule exists anywhere** (grep = 0), **no accessible name** (A2), event markers are 8 × 8 px `<div>`s with `onClick` and `title` (`112275–112296`), colours `#0044cc` (2.5 : 1) and `#cc0000`; mobile: a `<div>` with `onTouchStart/Move` (no keyboard, no role, `103179–103184`).
Spec: native `<input type="range">` (keeps keyboard/AT semantics) styled with `::-webkit-slider-runnable-track` / `::-moz-range-track` (visual 6 px, hit 44 px) and thumb (visual 20 px, hit 44 px; ring on focus; grows to 24 px while dragging); `min=1 max=675 step=1` in **ticks** (not 0–100 % floats); `aria-label="Battle time"`, `aria-valuetext="July 2, 3:20 PM · step 312 of 675"` (formatted by the one canonical clock function — C3/C4 dependency); keyboard `←/→` ±1, `Shift+←/→` and `PgUp/PgDn` ±12, `Home/End` = day start/end (also `1/2/3`), **`[ ]` previous/next event**; a 24-px-tall **marker lane** above the track holds `<button>` markers (24 × 24 hit boxes) with shape+colour (diamond = critical, dot = high), each with name tooltip and `aria-label="Jump to Pickett's Charge (July 3, <canonical clock time>)"`; day segments are tinted with **token** colours (`--union-700`, `--ink-700`…) not pastel `#e8d5a3/#d3e8d3/#d3d3e8` (`112187–112191`); scrub preview tooltip follows the pointer ("Jul 2 · 3:20 PM · Wheatfield"); drag = pointer events with `setPointerCapture` (works for mouse, touch, pen, replaces separate touch code); `touch-action: pan-y` on the lane so vertical page/sheet scroll isn't hijacked (root `tn.root` sets `touchAction:"none"` on the whole mobile shell `103705`). **Acceptance:** axe `aria-input-field-name` 0; thumb hit area ≥ 44 × 44 (coarse); Playwright drag from 0 → 100 % updates tick monotonically; keyboard-only user can reach any event; RUM INP for scrubbing ≤ 200 ms (rAF-throttle tick commits to ≤ 60 Hz; heavy panels don't re-render on every tick).

### 5.13 Search field + results (`role="combobox"`)

16 px input (iOS won't zoom), 44 px tall, leading `search` icon, trailing clear `x` (44 px hit area), `aria-controls`/`aria-activedescendant` listbox, `↑/↓/Enter`, **Esc: first press clears text, second closes panel** (fixes H2 where `Ur.target.tagName === "INPUT"` returns early `112967`), result rows §5.6, empty state §11, `autoFocus` only on `pointer:fine` (mobile `autoFocus` `98819` summons the keyboard over the sheet). Results grouped (Units · Places · Moments) with counts; natural sort (H5) via `Intl.Collator(undefined,{numeric:true})`.

### 5.14 Switch / checkbox (Layers panel, settings)

Replaces native checkboxes (`GtbgLayers` `112534`, `accentColor:#c8a84a`, 13 px hit boxes) with a 44 × 24 switch or 24 px checkbox with a 44 px hit row; label on the left, state text ("On/Off") for greyscale/forced-colors; grouped under `<fieldset><legend>`.

### 5.15 Badge / tag / kbd / side swatch

Badge `--r-xs`, `--fs-2xs` 600 caps `--tracking-caps` (≥ 12 px), colours from semantic tokens; `<kbd>` `--font-mono` `--fs-xs` on `--surface-3` with 1 px `--border` bottom-heavy; **side swatch** = 14 × 10 px frame (Union solid, Confederate diagonal-hatched or notched — a shape/pattern difference) + word.

### 5.16 Progress / skeleton / spinner — see §11.


---

## 6. Layout, stacking and panel management

### 6.1 One responsive shell, not two forks (root cause of C1 / C2 — D-1)

**Evidence.**
* `AO` (`bundle.pretty.js:112921–113286`) mounts `tO`/`dO`/`pO`/`bO` (`113055–113070`) then `Zn !== "mobile" && <toolbar>` (`113071`) and `Zn !== "mobile" && <gF map>` (`113233`), **then unconditionally** `FF, OF, VF, WF, CF, LF, _F, IO, KF, Zk, XF, iO, nO, yO, Yk, Xk, Jk, qF …` (`113243–113270`). `IO` = desktop timeline (`113249`).
* Mobile shell `pO` (`102914–103697`) is a **second, complete app**: its own `new z_.Map` (`102981`; a second WebGL context whenever the layout switches), own canvas + click/touch picking (`ya` `103076`), own popup, roster, legend, minimap (hard-coded 80 × 64 px, `-77.27/0.09`, `39.86/0.08` constants at `103307–103317`), day tabs, scrubber, tools grid — plus 740 lines of styles `tn` (`103698–104440`).
* `tn.root` (`103699–103706`) = `position:fixed; inset:0; z-index:100; touch-action:none` → a stacking context. Its descendants (`toolsOverlay` z 500 `104037`, `slidePanel` z 400 `103918`, `unitPopup` z 300 `103868`) can never rise above a **sibling** with z ≥ 100 that comes later in DOM. `IO`'s wrapper `Po.wrap` is `position:absolute; bottom:0; z-index:100` (`112386`), later in DOM → **paints over the whole mobile UI**, including the Tools sheet's bottom rows (C2: "Legend, Bookmarks, Help, Mini Map, Desktop View" — exactly the last 5 items in the 14-tool grid `103390–103481` that fall behind IO's ~120 px bar). NPS Auto Tour launch (`Zr.launchBtn` z 200, `100473`), sound button (`vO.btn` z 200, `111796`), toasts (z 200/400) also float above the mobile shell.
* IO's transport row is `Po.controls` = 5 buttons (`⏮◀▶▶⏭`) + `speedGroup` of 6 buttons (`wO` `112185`) + `Tick n/675` + credit `"Created by: Mike Legere · gettysburginteractivemap@gmail.com"` (`112361–112370`, `white-space:nowrap`, `justify-content:center`) — the 572 px row of C1 that overflows a 375 px viewport both sides. **So C1 and C2 are the desktop timeline showing through the mobile layout.**
* **Even without `IO`, the mobile shell's own transport row is too wide for small phones** (arithmetic, *estimated — measure in DOM*): `tn.playRow` = `ctrlBtn` 52 px × 2 + `playBtn` 64 px + `speedBtn` (`padding:10px 18px`, ≈ 53–78 px) + `Tick n/675` (10 px monospace ≈ 72 px) + 4 × 14 px gaps + 2 × 16 px padding ≈ 380–405 px (`103813–103858`) → overflows 375/360/320 px viewports by 5–85 px (centred, so it clips both sides). The compact transport spec (§6.1: 3 × 44 px buttons + one speed control + time in ≤ 320 px) must be checked at 320 px, not 375.
* Mobile chrome is fixed: `topBar 52 + dayTabs 42 (minHeight)` = `map top:94` (`103709`), `bottomBar height:140` (`103775`, `map bottom:140` `103712`) = **234 px permanent chrome**. Portrait 375 × 667 leaves 433 px (65 %); 360 × 640 → 406 px (63 %); **landscape 667 × 375 → 141 px (38 %)** — and the manifest currently *locks landscape* (E1), so an installed PWA is *always* in the worst case.

**Design fix (structure).**

```css
.gb-app{ display:grid; block-size:100dvh; min-block-size:0; container-type:inline-size;
  grid-template: "top top" var(--toolbar-h) "dock map" minmax(0,1fr) "transport transport" auto / auto minmax(0,1fr); }
.gb-map{ grid-area:map; position:relative; isolation:isolate; min-inline-size:0; min-block-size:0; }   /* no top:94/bottom:140 magic */
@container (max-inline-size: 767px){
  .gb-app{ grid-template: "top" 48px "map" minmax(0,1fr) "transport" auto / minmax(0,1fr); }
  .gb-dock{ display:none }               /* docks re-parent into the sheet region */
}
@media (max-height: 500px) and (orientation: landscape){ .gb-app{ --toolbar-h:40px; --transport-h:56px } }
```

* **Compact chrome target:** top 48 + transport 88 (44 px scrubber lane with day segments labelled *on* the lane + one 44 px row: step-back, play, step-forward, speed segmented, time) = **136 px** → portrait 667 leaves **531 px (80 %)** (vs 433); landscape collapses to a single 56 px row + 40 px top = 96 px → 279 px (74 %) (vs 141). `100dvh` not `100vh`, `env(safe-area-inset-*)`, `viewport-fit=cover`, remove `"orientation":"landscape"` (`manifest.json`, E1).
* **One component tree**: `TopBar`, `Transport`, `MapView` (one map, one canvas/symbol layer), `Dock`/`Sheet` (same panel components, different container), `Legend`, `Minimap`. The mobile "Desktop View" escape hatch disappears (the layout is derived from the viewport; the override lives in Settings). Deleting `pO`+`tn` removes ≈ 1,500 lines and a WebGL context.
* If a rewrite is out of reach in the near term, **minimum fix** (Phase 0, effort S–M): (a) mount desktop-only components only when `layout==="full"` (`AO` `113243–113270`), (b) remove `zIndex` from `tn.root`/`tc.root` so nothing is trapped, (c) move `toolsOverlay`/`slidePanel`/modals to a body-level portal at `--z-sheet/--z-modal`, (d) delete the credit from `Po.controls`. This alone should clear C1 + C2; it is a prerequisite for everything in §§7–8.

### 6.2 z-index scale, stacking rules, mapping from today's 27 levels

**Scale (legal values only):** `--z-map:0 · --z-map-overlay:10 · --z-hud:100 · --z-dock:200 · --z-sheet:300 · --z-menu:400 · --z-tooltip:500 · --z-toast:600 · --z-modal:700 · --z-tour:800 · --z-splash:900 · --z-skip:1000`. Inside `.gb-map` (`isolation:isolate`) private layers 0–30 are allowed (Mapbox canvas 0, day/night overlay, trails canvas, units canvas 10, hit-test overlay, cursor glow) because they cannot escape the map.

| Today (component → z) | → token |
|---|---|
| day/night multiply `<div>` **6** (`9890`), trails canvas **8** (`96699`), map canvases **9/10**, trails btn **20**, cursor glow **30** (`101869`), monuments overlay **400** (`index.html:645`) | private to `.gb-map` (≤ 30) |
| toolbar **100** (`tc.toolbar`), timeline `Po.wrap` **100** (`112386`), speed HUD `Sd.wrap` **88**, legend fab/panel `Fr` **88**, minimap `Td` **88**, monument markers `KF` **160** (`100922`), sticky sub-page nav `#gtbg-nav` **500** (`site-nav.css:17`) | `--z-hud` (sub-page nav keeps its own `position:sticky; z-index:var(--z-hud)`) |
| unit panel `ji` **92**, story panel `Cr` **92**, event card `Vc` **85**, search `ar` **95**, filter `zr` **95**, NPS tour panel **300/301**, tour pip **400**, Layers/Distance **1000** | `--z-dock` (exclusivity by rule, not by z) |
| mobile popup **300**, slide panel **400**, tools overlay **500** | `--z-sheet` |
| Explore menu (in `#extra-features` **999999**) | `--z-menu` |
| hover popup `Ar.popup` **500**, monument tooltip `dx.tooltip` **600** | `--z-tooltip` |
| toasts `eh` **200**, commander cards `nh` **400** | `--z-toast` |
| Help **600**, Bookmarks **600**, Ancestor **700**, Soldier's Eye **800**, OOB **900**, Roster **900**, Walkthrough **500**, chooser **1000**, onboarding `tr.overlay` **1000**, splash `Va.overlay` **1000** | `--z-modal` (one at a time) / `--z-tour` / `--z-splash` |
| Extra Features overlay **999999** | **deleted** (§7) |

**Rules (enforced by tests, §14):**
1. **Portal all overlays** (menus, tooltips, toasts, sheets, modals, tour) to `<div id="overlay-root">` as a sibling of `#root`. Note `#root` currently has `contain:strict` (`index.html:66–70`), which makes it a stacking context *and* a containing block for fixed descendants — harmless for the full-viewport map, but overlays must not depend on it.
2. **No component root may set `z-index`, `transform`, `filter`, `opacity<1`, `will-change`, or `contain`** unless it is a documented stacking boundary (`.gb-map`, `#overlay-root` children).
3. Only `var(--z-*)` in `z-index` (stylelint: `declaration-property-value-allowed-list: {"z-index": ["/^var\\(--z-/", "auto", "0", "-1"]}`); no `zIndex:` in TS/JS (ESLint no-restricted-syntax on `Property[key.name="zIndex"]`).
4. **Reserved zones:** toolbar and transport are reserved; docks, toasts, sheets are sized against `--toolbar-h`/`--transport-h` — *replacing the magic bottoms* `160`, `150`, `130`, `120`, `90`, `58` and tops `56/58/60` that today guess the timeline height (`Fr` `99578/99591`, `Td` `99835/99848`, `Vc` `98662`, `Zr.launchBtn` `100475`, `Zr.dotsBar` `100490`, `Zr.panel` `100506`, `vO.btn` `111788`, `tn.miniLegend/minimapBox` `104007/104025`). The desktop timeline bar is roughly 120–130 px tall (8 + 16 + 6 + 26 + 8 + 28 + 27 + 6 from `Po` padding/line-heights — *estimated, measure in DOM*), so the sound button (`bottom:58`) and NPS launch (`bottom:90`) sit **inside** the bar's rectangle, above it in z (200 > 100), covering its right-hand controls.
5. Modal open ⇒ `inert` on `.gb-app` (or `<dialog>` top layer).

### 6.3 Collision matrix today (from `panels2.py`; desktop 1440 × 900)

| Slot | Claimants (top/left/right/bottom, z) |
|---|---|
| **Top-left, under toolbar** | speed HUD `Sd.wrap` (top 56, left 16, z 88); unit panel `ji.panel` (top 60, left 16, w 280, z 92); filter panel `zr.panel` (top 56, left 0, w 280, z 95); commander cards `nh.container` (top 58, left 60, w ≤ 240, z 400) |
| **Top-right, under toolbar** | story panel `Cr.panel` (top 60, right 16, w 340, z 92); toasts `eh.container` (top 60, right 16, w ≤ 300, z 200); tour PiP `Zr.pip` (top 58, right 16, w 320, z 400); Layers panel (`fixed`, top 60, right 10, z 1000, `112514`); Mapbox `NavigationControl` (map `top-right`); `ux.trailBtn` (top 10 + 48, right 56, z 20); **Extra Features overlay** (top 60, right 14, z 999999) → **7 claimants, six of them at `top≈58–60`, `right≈10–16`** |
| **Top-centre** | search panel `ar.panel` (top 56, left 50 %, w 440, z 95); Distance panel (`fixed` top 60, left 50 %, z 1000, `112863`) |
| **Bottom-left / centre** | legend `Fr` (bottom 160, left 16, w 240, z 88); event card `Vc.panel` (bottom 120, centre, w 460, z 85) crosses the legend column on narrow windows; NPS tour panel `Zr.panel` (left 60, right 0, bottom 86, max-h 38vh, z 300) spans the full width above the timeline |
| **Bottom-right** | minimap `Td` (bottom 130), NPS launch (bottom 90), sound (bottom 58) — three stacked with magic offsets over the timeline |

Fixed pixel panels (`width: 340/280/440/460/560`) vs a 1024 px window: story 340 + unit 280 + toasts + nav control already consume 1024 − (16+280) − (16+340) = 372 px of map; at 768 px the two panels alone overlap (280 + 340 > 768 − 32).

### 6.4 Panel management rules (state model)

**Classes.** (1) *Chrome* — toolbar, transport (never closes). (2) *HUD widgets* — legend, minimap, scale bar, attribution (user-toggled, persisted). (3) *Docked panels* — **left dock** ∈ {Unit, Search, Filter, Roster, Order of Battle, Ancestor, Soldier's-Eye list}; **right dock** ∈ {Story, Layers, Tour, Historian drawer, Bookmarks}; **exactly one panel per dock**; opening a second **replaces** the first (200 ms cross-fade) and pushes it on a "back" stack (breadcrumb chip "← Unit"). (4) *Modal* — Help, Settings, Walkthrough, Print; exactly one; `inert` behind. (5) *Transient* — toasts, tooltips, menus, event card.

| Rule | Behaviour |
|---|---|
| P1 | Selecting a unit (map click, search result, ancestor) → Unit panel in the left dock; Search/Filter panels close after a result is chosen (today Search closes itself `f()` at `98788`; Filter stays). |
| P2 | Story panel is lowest priority: auto-opens only during playback/jump when the right dock is empty; otherwise a "Story available" chip appears on the timeline. Dismissals persist for the session (today `R` resets on remount `98261`). |
| P3 | Event card becomes a **toast-class** transient (bottom-centre above the transport, ≤ 6 s or next tick change, pause on hover) — not a permanent `bottom:120` panel. |
| P4 (H4) | **Jump hygiene:** any `setTick` with \|Δ\| > 3, day jump, bookmark load or deep link → close story panel + event card, clear toasts, collapse legend on compact (explicit user choice persists), fly camera to the action (D3; `flyTo` in normal motion, `jumpTo` under reduced-motion). |
| P5 (H2) | **Esc chain** via a `LayerStack` (push on open/pop on close): modal → menu → tooltip → toast → *clear text in a focused input* → right dock → left dock → selection. Replaces the 10-setState cascade at `113033–113050`, which is skipped whenever `event.target.tagName === "INPUT"` (`112967`) and never touches Layers/Distance/legend/story/event card. Help chunk's own `Escape` list is dead code (`useGlobalKeyboard` is exported but never called — verified by grep). |
| P6 | Persist HUD choices and dock widths (`gtbg_prefs` currently stores only `showLegend/showMinimap` `9328–9341`; onboarding lives in a *different* key `gtbg_onboarded`). One key: `gb.v2.prefs` (§8). |
| P7 | Compact: one bottom sheet at a time, same exclusivity; legend/minimap live inside the Tools sheet by default (no floating widgets over a 375 px map). |
| P8 | Landmarks + focus: `<header>` toolbar, `<nav aria-label="Explore">`, `<main aria-label="Battle map">` with a visually-hidden `<h1>Gettysburg Animated Battlefield Map</h1>` (D2), `<aside aria-label="Unit details">` docks, `<footer role="region" aria-label="Timeline">`; skip link "Skip to map" (`--z-skip`); opening by keyboard moves focus to the panel heading, closing returns it. |

**Acceptance (Playwright, 320 / 375 / 768 / 1024 / 1440 / 2560 + 667 × 375 landscape):** open every pair of panels (13 × 13) — at most one panel per dock visible; no docked panel's `getBoundingClientRect()` intersects toolbar/transport/another dock; `Esc` closes the topmost layer every time (including with the caret in the Search field); after a day jump 0 toasts/story/event card remain; `getComputedStyle(el).zIndex` of every positioned overlay ∈ scale.

---

## 7. H1 — integrating "Ask the Historian" and "Extra Features"

### 7.1 What exists (verified)

* **Markup** `index.html:285–292` (`#extra-features` > `#ef-toggle` 30 px eye button, `.gtbg-historian-pin` link, `#ef-btn`, `#ef-menu`); **CSS** `168–237`: `position:fixed; top:60px; right:14px; z-index:999999; opacity:0; visibility:hidden` and a pure-CSS `animation: gtbg-force-reveal 10ms linear 5s forwards` (`202`) so it appears after 5 s even if JS fails.
* **Six inline scripts** (`index.html:294–714`, ≈ 420 lines): (1) populate the pill/button/menu from `window.GTBG_MENU` at idle (`294–353`); (2) inject an onboarding banner by scanning `document.querySelectorAll('body *')` for a leaf whose text is "choose your experience" every 200 ms × 25 (`355–396`) — copy "an AI-style historian, live sound…" (H8); (3) patch `title`/`aria-label` on buttons by matching their glyph text (`S F L B ?`) every 200 ms × 25, and **delete `#seo-content`** once ≥ 3 matched (`398–440`); (4) reveal only after a click whose ancestor `textContent` matches `/select desktop|select mobile|skip introduction|skip tour|skip intro/i` (up to 6 ancestors) or after 1.5 s if none visible or after 10 s (`441–519`; the comment block documents five failed approaches); (5) a **collision mover**: 6 candidate positions (top-right → top-left → mid-right → mid-left → bottom-right → bottom-left, `535–542`), measuring `getBoundingClientRect()` of *every* `button, a, input, select, [role]` on the page after every click and on resize (`562–602`) — so the entry point **changes corner** depending on what is open; and (6) the second monuments overlay (`608–714`).
* Because it is outside `#root` at `z-index:999999`, it paints above every React modal/scrim (H1: layout chooser, Help backdrop, walkthrough). On phones the pill collapses to a bare icon (`site-nav.css:52`) with `aria-label` only.
* The sub-page header already has the right pattern: `← GETTYSBURG · [Ask the Historian] · [Explore ▾]` (`site-nav.js:164–171`). The map is the only page where it's different.

### 7.2 Requirements

R1 one **stable** home for both entry points on every page/layout; R2 never above a modal, never over content; R3 same IA on map and sub-pages (the map top bar *is* the global header); R4 **contextual entry** from units/moments; R5 discoverable once (coach mark), then quiet; R6 keyboard shortcut; R7 zero DOM-scraping.

### 7.3 Desktop (≥ 1024): top bar, right cluster

```
[◈ Gettysburg]  [July 2 · 3:20 PM]                          [🔎 Search][⛃ Filter][▤ Layers] │ [Tools ▾] │ [💬 Ask the Historian] [☰ Explore ▾] │ [?]
                                                             (icon 40×40, labels ≥1280)                       (pill, 40 h)           (menu btn)
```
* **Ask the Historian** — pill, variant `--outline-accent` (border `--accent`, text `--accent-hi`), icon `message-square-quote`, label "Ask the Historian" (≥ 1280) / "Ask" (1024–1279); height 40; `href="/historian.html"` (a real link: middle-click, open in new tab). Attention pulse: **two pulses on first three visits, then never** (today `gtbg-pin-glow` runs forever at 3.4 s, `site-nav.css:41,48` — a permanent looping animation is both noise and a battery cost; WCAG 2.2.2 also requires a pause mechanism for > 5 s motion). Keyboard: `A`.
* **Explore ▾** — `menu` icon + label + chevron, `aria-expanded`, opens the existing 5-group card menu (`site-nav.js` `GROUPS`, 20 items) as a **navigation disclosure** (`<nav aria-label="Explore features">`, links, not `role=menu`), `--z-menu`, `inline-size:min(92vw,480px)`, right-aligned under the trigger, `max-block-size: calc(100dvh - var(--toolbar-h) - 16px)`, item titles 14 px / descriptions 12 px, "you are here" tag `--ok`. Keyboard: `E`.
* **Remove** the eye toggle `#ef-toggle` (hiding the site's primary navigation is an anti-pattern; a "Compact toolbar" setting covers the need) and the `gtbg-ef-hidden` key.
* **Grouping** of the 13 existing icon buttons + 3 header buttons (§5.2): *Find* (Search — one button, merge `S`+`🔍`; Filter; Locations), *View* (Layers, Legend, Units toggle, Minimap), *Tools ▾* (Roster, **Order of Battle — currently missing on desktop, D4**, Monuments, Soldier's Eye, Ancestor, Distance, Bookmarks, NPS Auto Tour, Virtual Walkthrough), then the two entry points, then Help. "Download Website Tutorial PDF" (`113115–113132`, a 12 px bold gold button in the top bar) moves into Help ("User guide (PDF)"); "Toggle Units" moves into the Layers panel switch. Command palette on `/` or `Ctrl/⌘+K` (Power-User path; replaces the "Power User: keyboard shortcuts" archetype).
* **Contextual entry (R4):** Unit panel footer and Story panel header get a ghost button "Ask the Historian about this…" → `/historian.html?q=<encoded>&unit=U-20ME&tick=268` (Historian reads the params; specialist "historian" owns that page). Phase 3: embed the Historian as a **right-dock drawer** so the map stays visible (same component as the page).

### 7.4 Compact (< 768) and mid (768–1023)

* **Compact top bar (48 px):** left = date/time chip; right = `[💬 Ask]` (a 44 × 44 icon button with `aria-label` "Ask the Historian"; its text label appears in the Tools sheet) and `[⋯ Tools]` (the existing 44 px `moreBtn`).
* **Tools sheet** (bottom sheet, §5.7): section 1 = two full-width 56 px cards **"Ask the Historian"** (accent) and **"Explore all 20 features"** (drills into a single-column grouped list, 56 px rows); section 2 = the map tools in a 4-column grid (min 72 px, labels 12 px — today `tn.toolLabel` is 10 px, `104088`); section 3 = Settings (Layout Auto/Compact/Full, Theme, Reduce motion) and Help. The sheet scrolls, `max-block-size:min(85dvh,640px)`, portaled at `--z-sheet`, bottom padding `max(16px, env(safe-area-inset-bottom))`, and never sits under the transport (it is *above* it with a scrim; §6.1 fix).
* **Mid (768–1023):** icon-only toolbar with visible labels for Ask/Explore only.
* **Landscape phone:** compact layout; sheet becomes a right-side sheet (`inline-size:min(420px,60vw); block-size:100dvh`) so it doesn't consume the whole 375 px height.

### 7.5 First-run discovery (replaces the injected banner)

One coach mark, shown once after the map is ready and the welcome card is dismissed: anchored to **Explore** — "20 more tools live here — search, compare, documentary, AR…". Persist `onboarding.seenExplore=true`. No perpetual glow; a small "New" dot on Explore for 14 days after each new feature (`GROUPS[].items[].added` date).

### 7.6 Interim options (choose after the N1 source decision)

* **Track 0a — CSS-only stopgap (effort S, fragile):** cannot be made correct — the overlay is outside the React tree and has no signal for modal state; the best CSS-only approximation is `#extra-features{ top:4px; right:12px; z-index:var(--z-hud) }` plus `#root > div > div[style*="height: 48px"]{ padding-right:300px }` to reserve space in the toolbar (attribute selector on the inline style string — brittle) and hiding the overlay whenever `body` contains an onboarding/modal marker. **Not recommended** beyond a week.
* **Track 0b — patch the minified bundle (effort M):** insert two `V.jsx("a"/"button")` children at the head of `toolbarRight` (`bundle.pretty.js:113146` region, `tc.toolbarRight` `113355`) and at `tn.topActions` (`103149`), add the Tools-sheet cards (`103390`), then delete `index.html:168–237`, `285–353`, `355–606` (keep the monuments script until §9 replaces it). Prior sessions patched this way (README of RECON_SRC) — regression risk is real; add a Playwright smoke test first.
* **Track 1 — do it properly in recovered/rewritten source (effort M once the shell in §6.1 exists):** `GlobalHeader` component shared by map and sub-pages (the sub-pages get it from the same package/HTML partial), `ExploreMenu`, `AskButton`, `CommandPalette`.

### 7.7 Acceptance criteria

* At 320–2560 px and landscape 667 × 375, `#extra-features` no longer exists (`document.getElementById('extra-features') === null`); Ask + Explore are in the top bar/Tools sheet; **their bounding rects never intersect** any other interactive element (Playwright over 200 randomised open-panel states).
* No element with `z-index > 1000` anywhere; Help/Layout/Tour scrims cover the header (verified: `elementFromPoint` at the Ask button centre while a modal is open returns the scrim/dialog).
* The Ask control is in the same DOM position (`getBoundingClientRect().right` within ±1 px) across 30 random app states (no more corner-hopping).
* `index.html` inline script bytes drop by ≥ 25 KB; `MutationObserver`/interval scrapers = 0; `querySelectorAll('body *')` calls in inline scripts = 0.
* Screen-reader path: `Tab` reaches Ask then Explore; Explore opens with focus on first item, `Esc` returns focus to the button.
* Touch targets ≥ 44 × 44; contrast of pill text ≥ 7 : 1.

---

## 8. H3 — splash and onboarding redesign

### 8.1 What happens today (verified)

1. `#boot-splash` (HTML, `index.html:91–131, 742–748`) — good: pure HTML/CSS, fades in 0.4 s (`boot-fade-in`, `index.html:99` — starts at `opacity:0`, so the LCP/FCP candidate is *invisible for the first frames*; drop the entrance fade, S).
2. React `tO` splash (`101472–101592`): waits until `Object.keys(placementsByTick).length > 5`, then **800 ms** (`101484`) → **3,500 ms** fake fast-forward (`eO = 3500`, `101471`) writing `yn.setState({currentTick})` **every animation frame** (`101492–101495`; all Zustand subscribers re-render for 3.5 s while RUM's INP/CLS windows are open — a plausible contributor to P1, *measure*) → 0.6 s opacity fade + 600 ms teardown (`101503`; overlay `transition:"opacity 0.6s ease"` `101520`) → total ≈ 4.9 s of forced splash after data is ready; the exit control is `<div onClick>` "Skip intro ›" (`101581`): 11 px, `#444` (2.02 : 1), not focusable, no role. Title `52 px + 8 px tracking` ALL-CAPS (`101618–101620`) clips at 375 px.
3. `dO` "Choose Your Experience" (`102752–102820`): two `div onClick` cards (`102768`, `102790`; no keyboard/role/focus trap), emoji icons `🖥 📱` (`102773`, `102795`; dark-on-dark), description "Best for mouse and keyboard" — shows **every visit**: `Zn` lives only in `AO` React state (`112949`; set via `Dt(ii)` `113061`), never stored; no auto-detect.
4. `bO` onboarding modal (`111856–112021`) on first visit only (`gtbg_onboarded`, `112951`, `113068`); archetypes `xO` (`111799–111816`) include "Power User — Show me the keyboard shortcuts" (`111814`) even on touch; the *tour steps* call `setTick(Gc[i].tick)` so the map jumps behind a full-screen modal; hints say "Press Space", "Press 3", "Search (press S)" (`111819–111845`).
5. The store also has `onboardingComplete` (`9441–9444`, persisted in `gtbg_prefs`) that `AO` ignores — two unsynchronised flags.

### 8.2 Target flow

```
HTML boot splash ──(map idle + Day-1 placements)──► app
        │                                              │
  0 artificial delay; determinate stages          resolveLayout(prefs, matchMedia) ─► full | compact   (no chooser)
  Map ▸ Units ▸ Story  (role=status)                   │
  > 4 s "Still loading…" · > 12 s error (§11)          ├─ first visit ► Welcome card (non-modal)
                                                       │     [Take the 60-second tour] [Explore on my own] [Watch the 30-second overview]
                                                       └─ returning  ► last view (if enabled & < 7 days) else Day 1 6:00; no card
```

| | First visit | Returning |
|---|---|---|
| Boot splash | HTML only, ≤ ~1 s typical | HTML only (≤ 400 ms) |
| Fast-forward film | **opt-in** button; runs on the real map, pausable, skipped for `prefers-reduced-motion` / `Save-Data` | never auto |
| Layout chooser | **removed** (auto-detect; override in Settings) | removed |
| Welcome card | yes (bottom-left desktop / bottom sheet compact; `role="region"`) | no |
| Tour | opt-in; 5 coach marks, resumable, `Esc` = skip | only "Resume tour" if `status="tour"` |
| Initial view | Day 1, 6:00 (deep link overrides) | last view if enabled |
| Coach mark on Explore | once | never |

**Layout resolution** (live, re-evaluated on `resize`/`orientationchange` via `matchMedia` listeners):

```js
const mqNarrow = matchMedia('(max-width: 767px)'), mqCoarse = matchMedia('(pointer: coarse)');
function resolveLayout(pref /* 'auto'|'compact'|'full' */) {
  if (pref === 'compact' || pref === 'full') return pref;
  const smallScreen = Math.min(screen.width, screen.height) < 768;
  return (mqNarrow.matches || (mqCoarse.matches && smallScreen)) ? 'compact' : 'full';
}
```
Tablets (≥ 768, coarse) get `full` with 44 px targets and docks that degrade to sheets ≤ 900 px container width.

**Persistence** — one versioned key, read synchronously before first render (no flash), every access in `try/catch`, memory fallback:

```json
// localStorage "gb.v2.prefs"
{ "v": 2, "layout": "auto", "theme": "system", "motion": "system",
  "onboarding": { "status": "new|tour|done|skipped", "step": 0, "exploreCoach": false },
  "hud": { "legend": true, "minimap": true },
  "resume": { "tick": 312, "center": [-77.235, 39.812], "zoom": 13.5, "unit": null, "savedAt": "2026-09-30T00:00:00Z" } }
```
Migration: `gtbg_onboarded === "1"` → `status:"done"`; merge `gtbg_prefs` (`showLegend/showMinimap/onboardingComplete`); delete legacy keys after one successful write. "Reset saved settings" in Settings. Privacy page (X5) lists this key.

**Splash content & copy** (museum voice; counts consistent with H10 = 467): eyebrow `July 1–3, 1863`; wordmark `Gettysburg` (Spectral 700, `--fs-display`, mixed-case so it fits 320 px); line `The three-day battle, five minutes at a time.`; caption `Loading the battlefield…` (stage text updates to `Map…`, `Units…`, `Story…`); no credit line (credit → About/footer; also removes the e-mail from the timeline row that feeds C1). Welcome card copy: **"Welcome. This map replays the Battle of Gettysburg in five-minute steps — 467 regiments and batteries across 675 moments."** Buttons: *Take the 60-second tour* · *Explore on my own*.

**Tour (5 coach marks, non-modal):** re-use the five existing `Gc` steps' content (Dawn; First artillery fire; Reynolds killed; Crisis at Little Round Top; Pickett's Charge — `111820–111852`) but (a) anchored to real controls (transport, scrubber, a unit, Explore) with a spotlight scrim that leaves the map interactive, (b) "2 of 5" progress + Back/Next/Skip, (c) copy uses actions per input type ("Press **Space**" only on `(hover:hover) and (pointer:fine)`; touch: "Tap ▶"), (d) symbol references corrected to the new symbology (§9: "blue and red **frames**", "cannon symbol"), (e) each step jumps by **tick id** with a visible confirmation (e.g. "Jumped to July 1, <canonical time>" — the clock text must come from the single canonical formatter after C3/C4, not from a hard-coded string), (f) `Esc` = skip and is remembered, (g) "Resume tour" in Help.

**Accessibility & motion:** splash container `role="status" aria-live="polite"`; on hand-off focus moves to `<main>`; entrance fades removed from the LCP element; shimmer/progress animation disabled under `prefers-reduced-motion` (already partly: `index.html:139–142`); the fast-forward film respects `prefers-reduced-motion` and `Save-Data`.

**Dependencies:** C6 (no `location.reload()` after the splash — a reload replays the boot; `index.html:264–268`), the shell (§6.1), tokens (§3), clock (C3/C4) for tour copy.

### 8.3 Acceptance

* First visit on a throttled "Fast 4G": interactive map (Play works) within 1.5 s of data-ready (no forced delay); Lighthouse mobile FCP/LCP no longer include a 4.9 s React splash; **0** full-screen modals before the map is usable (`grep`/Playwright: no `role=dialog` visible until user opens one).
* Second visit: no chooser, no welcome card, no tour; layout equals the first visit's resolved layout; `localStorage["gb.v2.prefs"]` present; legacy keys migrated.
* Resize 375 → 1024 in DevTools flips layout live without reload; rotate phone → layout adapts; Settings override persists.
* Splash wordmark fully visible at 320 × 568 (no clipped glyphs; screenshot diff), skip/continue controls are `<button>`s with ≥ 44 px targets and ≥ 4.5 : 1 text; `Esc` skips the tour.
* Touch devices never see "keyboard shortcuts" copy; desktop never sees "Tap".


---

## 9. Cartography polish

### 9.1 What the map layer does today (verified)

| # | Finding | Evidence |
|---|---|---|
| K-1 | Units are drawn on a **2-D `<canvas>` overlay** (`ux.canvas` z 10, `97393`), one `fillRect` per unit **per frame**, width `Ut = lA(strength)` = strength ÷ 4 px clamped 10–120 px (mobile ÷ 6, 10–60) — **constant screen size at every zoom**; height 8 px (cavalry 4 px). | `lA` `96433–96437`, draw `96596–96640` |
| K-2 | At low zoom 467 rectangles up to 120 px wide overprint each other, so a **hand-rolled relaxation** (8 passes, 12 px vertical spacing) *moves symbols off their true position* and draws 0.5 px leader lines at 40 % alpha. The map therefore misstates positions exactly when the user is looking at the whole battlefield. | `96558–96581` (relaxation), `96582–96594` (leaders, only when displaced ≥ 3 px) |
| K-3 | **Canvas is not DPR-aware** — `c.width = getBoundingClientRect().width` (CSS px), and `devicePixelRatio` appears **0 times** in the app UI region → blurry symbols/labels on every 2×/3× display (all phones, all Macs). | `96510–96512`; grep = 0 |
| K-4 | Labels are **8/9/10 px bold sans** on 72 % black plates (`he.font = \`bold ${vn}px sans-serif\``), only at zoom ≥ 11, content tiers by zoom (`Y4` `96465–96479`): ≥ 16.5 designation + strength, ≥ 15 designation, ≥ 14 short code, ≥ 12 code sliced to 6 chars, else none; below zoom 12 (14 on mobile) only selected/pinned units get labels. Violates the 12 px floor; plates cover imagery. | `96653–96682` |
| K-5 | **"Engaged" glow is defined in screen space**: two opposing units within **40 px** (`X4`, `96499`) — so at low zoom nearly every unit "is engaged"; the glow pulses forever (`0.4 + 0.6·|sin(t/300)|`, `96615`), no reduced-motion handling. | `96480–96505`, `96552` |
| K-6 | Picking radius is **0.002° (≈ 170–220 m)** regardless of zoom or input (`Xx(…,0.002)` `97336`; mobile `0.003` `103016/103087`) — imprecise at zoom 17, fiddly at zoom 11, no 44 px logic. | |
| K-7 | **Legend ≠ map** (D-2), **posture palette CVD-confusable** (D-3): §2.4. | `99384–99412` vs `96306–96318` |
| K-8 | Overlay styling is arbitrary: roads **`#44bb44`** (green line over green fields; ΔE2000 vs a *typical* field green `#6b7f3a` = 20.5 — *assumed imagery colour, not sampled*), rivers **`#8844cc` purple** (`9775–9780`), breastworks `#884422` dashed 3 px, farm labels `#f0c97a`; label sizes 9–13 px. | `T4` `9746–9840` |
| K-9 | Overlay **geometry is schematic**: Chambersburg Pike is 5 vertices at the *same latitude* `39.8306` (`9498–9520`), Baltimore Pike 5 vertices at `39.82` (`9484–9497`); roads/rivers/works are hand-typed GeoJSON in the bundle, while `data/terrain.json` holds 30 `key_locations`, 8 `roads`, 8 `structures`, 4 `terrain_features` that the map does not use (Locations toggle draws **10** hard-coded points, `112573–112676`). Expect visible mis-registration against imagery at z ≥ 15 (*not visually verified*). | |
| K-10 | **Two monument systems on one button**: React `KF` (20 story markers, `🏛` emoji DOM nodes, `position:fixed`, z 160, tinted by side; a `requestAnimationFrame` loop calls `map.project()` **and `setState` with a new object every frame, even while hidden** — `100850–100868`) and the `index.html:608–714` overlay (9 SVG stars from `monuments.json`, projected once from the *default* view, so they **drift on any pan/zoom**, z 400). | |
| K-11 | **Day/night**: a full-screen `<div>` with `mix-blend-mode:multiply` and `transition: background 8s` (`A4` `9885–9900`, `mix-blend-mode` `9895`), tint table by *clock hour* (`E4` `9861–9884`: `<5` night α .35, `<6` α .25, … `≥21` α .4) using `M4` = 5:00 + 5 min × tick (`9856–9860`) — a third clock (header uses 6:00 day 1 / 4:00 days 2-3; data labels 5:00). Real sunrise is **~4:34 LMT**, so the first hour of every day is rendered at twilight; the 8 s transition lags scrubbing. | see §9.7 |
| K-12 | **No relief** (no hillshade, no contours, no `setTerrain`), **no scale bar** (`ScaleControl` = 0), no north indicator except the `NavigationControl` compass; `fitBounds`/`easeTo` unused; base `satellite-v9`. | grep |
| K-13 | **Mapbox attribution hidden** on the mobile map (`attributionControl:!1` `102988`) and the walkthrough map (`110777`). Mapbox requires the logo *and* text attribution to remain visible (they may be moved/compacted) — [Mapbox attribution guidance](https://docs.mapbox.com/help/dive-deeper/attribution/). Desktop map uses the default (visible). | `102988`, `110777` |
| K-14 | Selected/pinned unit uses `shadowBlur 14 #e8d5a3`; hover popup `fF`/`Ar.popup` is a 260 px `position:fixed` card (z 500). No focus/keyboard path to any unit (map is canvas-only); the OOB/Roster/Search are the only accessible routes. | `96612`, `97157` |

### 9.2 Symbology system (one spec → renderer **and** legend)

**Principle: colour encodes side (only); shape encodes branch; line style encodes posture; a bar encodes strength; position on the map is never displaced.** Side colours stay `#3a6bc4` / `#c43a3a` (already CVD-safe: ΔE2000 41.7 / 42.3 / 51.0 / 65.8 for normal/protan/deutan/tritan — `cvd.py`); everything else moves off colour.

`data/symbology.json` (single source of truth; the legend, the canvas/GL renderer, the tour copy and the print report all read it):

```json
{ "frame":   { "w": 24, "h": 16, "outline": "rgba(255,255,255,.85)", "inner": "rgba(5,5,10,.9)" },
  "sides":   { "union": {"fill":"--union","text":"--union-text","label":"Union"}, "confederate": {"fill":"--conf","text":"--conf-text","label":"Confederate"} },
  "branch":  { "infantry":"x-cross", "cavalry":"slash", "artillery":"dot" },
  "posture": {
    "Line of Battle":     {"frame":"solid",  "mark":null,          "engaged":false, "desc":"Holding position"},
    "Charging Line":      {"frame":"solid",  "mark":"chevrons-fwd","engaged":true,  "desc":"Advancing to attack"},
    "Skirmish Line":      {"frame":"dashed", "mark":null,          "engaged":true,  "desc":"Screening / skirmishing"},
    "Chaotic Retreat":    {"frame":"solid",  "mark":"tail-back",   "engaged":false, "desc":"Broken, falling back"},
    "Line of March":      {"frame":"column", "mark":"arrow-fwd",   "engaged":false, "desc":"Moving toward the action"},
    "Reserve":            {"frame":"hollow", "mark":null,          "engaged":false, "desc":"Held in reserve"},
    "Bivouac":            {"frame":"hollow-dotted","mark":"tent",  "engaged":false, "desc":"Encamped"},
    "Deployed Artillery": {"frame":"solid",  "mark":"muzzle-ticks","engaged":true,  "desc":"Guns in battery"},
    "Limbered Artillery": {"frame":"hollow", "mark":"tail-back",   "engaged":false, "desc":"Guns moving"},
    "Mounted Cavalry":    {"frame":"solid",  "mark":"chevrons-fwd","engaged":false, "desc":"Cavalry mounted"},
    "Dismounted Cavalry": {"frame":"dashed", "mark":"horse-holder","engaged":true,  "desc":"Cavalry fighting on foot"} },
  "strength": { "bar": {"h":3,"pos":"below"}, "unit":"percent-of-initial", "numericFrom": 16 },
  "echelon":  { "regiment":"III", "brigade":"X", "division":"XX", "corps":"XXX" },
  "accent":   { "engagedRing":"#ffb020", "selected":"--accent-hi" } }
```

| Element | Today | Target |
|---|---|---|
| Symbol size | width ∝ strength (10–120 px), height 8 | **fixed frame** 24 × 16 (z 15) scaling 0.75× @ z 13 → 1.15× @ z 17; strength shown by a 3 px bar (fraction of *initial* strength) — no size pun |
| Branch | infantry = rect, cavalry = 4 px rect, artillery = outlined rect + line | APP-6-style inner glyphs (× / slash / dot) in a frame — instantly readable, greyscale-safe |
| Posture | 11 hues (dot 3.5 px radius above the frame) | line style + mark (above); at most two accent colours (engaged ring `#ffb020`, selected ring `--accent-hi`) |
| Side | side-filled rect, 1 px dark stroke | fill + 1.5 px light outline (separates from dark woods) + inner dark stroke; word "Union/Confederate" in every label/legend |
| Orientation | whole rect rotated by bearing−90° (unreadable) | icon upright; a small **facing arrow** = bearing; in *footprint mode* the frontage bar rotates to true frontage |
| Displacement | 8-pass relaxation (positions lie) | **none** — aggregate instead (§9.3) |
| Highlights | `#88ccff/#ff9944` "recently moved" tint (`H4/W4`) | 400 ms halo pulse when a unit changes posture/position materially; no persistent recolour |

**Footprint mode (z ≥ 16.5):** show each regiment's *line of battle* to scale — width in metres from strength (Civil-War line frontage ≈ 1 man per ~0.6 m in two ranks → ~0.3 m/man, *rule-of-thumb to be validated against Pfanz/Gottfried*; label it "approximate"), so zooming in shows real space rather than symbol soup.

### 9.3 Echelon aggregation + label declutter

* **Zoom tiers** (Mapbox zoom): z ≤ 12.5 → **corps/division** symbols only (from OOB `parent_*_id`; `data/oob/*` already has `parent_corps_id/parent_brigade_id`, `report.html` reads them); 12.5–14.5 → **brigades** (X) with regiment count badge; 14.5–16.5 → regiments (full frame, labels for selected/engaged/top-N); ≥ 16.5 → regiments + footprints + full labels. Clicking an aggregate zooms to its extent (`fitBounds`) — *no symbol is ever displaced from its true position*.
* **Labels ≥ 12 px** always (token `--fs-2xs`); canvas or GL. `text-size` = `interpolate(zoom, 12→12, 17→14)`; halo 1.5–2 px `rgba(5,5,10,.85)` (no black plates); colour from `--union-text/--conf-text` (13.1 / 13.0 : 1 on the halo).
* **Priority & placement:** `rank = 1000·selected + 500·engaged + 100·echelonRank + strength/100`; sort descending; for each label try anchors `[top,right,left,bottom]` with 4 px padding; accept if no overlap in a 64 px spatial hash; **cap ~60 labels per screen**; the rest show icon only (`text-optional`). In GL: `symbol-sort-key`, `text-variable-anchor`, `text-radial-offset`, `text-allow-overlap:false`, `text-optional:true`. Fixes D3 ("label collisions on Day 3") without displacement.
* **Content tiers** (unchanged intent, larger type): z 14.5 short code ("20 ME"), z 15.5 designation, z 16.5 designation + strength; selected/pinned always shows designation.

### 9.4 Legend (single source of truth)

Legend is generated from `symbology.json` with **the same drawing function** as the map (SVG from the glyph paths), so it can never disagree again (D-2 table). Sections: **Side** · **Branch** · **Posture** (11 rows: glyph + name + one-line description, from the same JSON that feeds Help/tour/print) · **Strength** (bar example with 100 % / 50 % / 20 %) · **Echelon** (III / X / XX) · **Map features** (1863 road, river, breastworks, farm, monument, relief) · note *"Positions are reconstructions from the Official Records and regimental histories; ± tens of metres."* (align the sentence with the data specialist). Behaviours: hover/focus a legend row → dim non-matching symbols on the map to 35 % (microinteraction §10); on compact it lives in the Tools sheet ("Map key"); on desktop it's a HUD widget (default **collapsed to a 44 px "Key" button** at bottom-left above the transport bar; state persisted). Deletes: `NF/UF/jF` (`99384–99420`), mobile mini-legend (`103344–103360`) and `tn.legend*` rows (`103620–103690`), "blue dots/yellow dots" copy (`111823–111831`).

### 9.5 Colour-blind & greyscale validation (numbers)

Side colours (current) are fine; **postures were not** (ΔE2000 normal / protan / deutan / tritan, `cvd.py`):

| Pair (current canvas colours) | normal | protan | deutan | tritan |
|---|---:|---:|---:|---:|
| Charging `#ff4422` vs Retreat `#ff8800` | 20.1 | 15.5 | **7.8** | 12.0 |
| Retreat `#ff8800` vs Deployed Art. `#f5c518` | 22.9 | 13.0 | **7.8** | 15.8 |
| Deployed Art. `#f5c518` vs Limbered `#c8a84a` | 11.0 | 10.3 | 10.9 | **7.9** |
| Mounted `#44aa44` vs Dismounted `#88cc88` | 12.8 | 12.5 | 13.0 | 12.1 |
| Charging `#ff4422` vs Confederate `#c43a3a` | 15.2 | 13.5 | 14.6 | **8.7** |
| Legend LoB `#4488ff` vs Skirmish `#44aaff` | 11.6 | **8.6** | **8.7** | **8.1** |
| Legend Reserve `#668844` vs Bivouac `#888866` | 11.8 | **8.1** | **7.0** | 18.0 |

(≥ 20 comfortably distinct, < 10 confusable.) Encoding posture by frame style + mark removes the dependency entirely; **acceptance:** the map is fully legible in `filter: grayscale(1)` and under the three CVD simulations (Chrome DevTools rendering emulation), and every posture is distinguishable by shape alone in the legend.

### 9.6 Overlays — road, river, works, farms, locations, monuments

* **All overlays come from `data/geo/*.geojson`** (roads, streams, works, farms, woods, monuments, key locations from `terrain.json`), loaded lazily after first idle; delete the hand-typed `x4 b4 w4 S4` literals (`9450–9740`) and the 10-point `GtbgLoc` list. Accuracy pass on geometry against imagery/NPS data (*NPS Gettysburg NMP GIS layers — verify availability and licence before use*).
* **Style (starting values; tune visually):**

| Layer | Today | Target |
|---|---|---|
| 1863 roads | line `#44bb44` 2 px α.7, labels `#88dd88` 10 px | casing 4 px `rgba(5,5,10,.55)` + core 2 px `#e4d3a6` (parchment) α.9; labels Open Sans Regular 12 px `#f4f2ec`, halo 2 px |
| Streams | `#8844cc` 2 px, labels `#aa66dd` 9 px italic | `#5aa9e6` 2 px α.85 + halo; labels 12 px italic `#bfe0f8` |
| Breastworks | `#884422` dashed 3 px | pattern line (tick marks) in the **side colour** (Union `#3a6bc4`, Confederate `#c43a3a`) with light casing — encodes who held it |
| Farms/structures | off by default; `#886633` α.5 outline; labels 13 px | small house icon + 12 px label, on by default ≥ z 15 |
| Key locations (30) | 10 hard-coded, 12 px Bold `#e8d5a3` | all 30 from data with elevation in the popup; 3 label tiers (ridges/hills > farms > minor); 12–14 px |
| Monuments | 20 🏛 DOM markers + 9 ★ overlay | one **symbol layer** (`landmark` icon SDF, side-tinted), clustered ≤ z 14, hover/tap card, keyboard-reachable list ("Monuments" in Tools) |

* Kill `KF`'s per-frame `setState` loop and the overlay projection script (K-10).

### 9.7 Day/night (single clock, computed sun)

Reference **computed** solar times (NOAA/Meeus, `sun.py`; 39.8309 N, 77.2311 W; **local mean solar time**, not railroad/standard time):

| 1863 | civil dawn | sunrise | solar noon | sunset | civil dusk | nautical twilight (start / end) |
|---|---|---|---|---|---|---|
| Jul 1 | 4:02 | 4:34 | 12:03 | 19:32 | 20:04 | 3:20 / 20:45 |
| Jul 2 | 4:02 | 4:35 | 12:03 | 19:31 | 20:04 | 3:21 / 20:45 |
| Jul 3 | 4:03 | 4:35 | 12:03 | 19:31 | 20:04 | 3:22 / 20:45 |

Design: derive tint from **solar altitude of the canonical map clock** (whatever C3/C4 settle on — the design must not add a fourth clock):

```js
// alt = solarAltitude(latLon, dateUtc)   // ~30 lines NOAA math, or SunCalc (BSD-2-Clause) — verify licence if vendored
const t = clamp((alt + 6) / 12, 0, 1);                       // −6° (civil twilight) … +6°
const day = t*t*(3 - 2*t);                                   // smoothstep 0 = night, 1 = day
setRaster({ 'raster-brightness-max': lerp(.42, 1, day),      // GPU paint props on the satellite raster layer
            'raster-saturation':     lerp(-.35, 0, day),
            'raster-hue-rotate':     lerp(12, 0, day) });
warmOverlayAlpha = .14 * Math.exp(-((alt - 3) ** 2) / (2 * 5 ** 2));   // golden-hour wash, soft-light blend
```

* Prefer **raster paint properties** on the satellite layer (`setPaintProperty(<layerId>, 'raster-brightness-max' …)` — *verify the layer id (`map.getStyle().layers`) in GL JS 3.24.1*) over a full-viewport `mix-blend-mode` div (a whole-screen composited layer) — units stay untinted (they already are: overlay z 6 < canvas z 10). Keep at most one `<div>` warm wash.
* **Transition:** 300–500 ms max (today 8 s → lags scrubbing); recompute on tick change; instant on drag.
* At night: raise unit outline opacity and label halo (readability), show a small "Night · civil dusk 8:04 PM" chip; **`prefers-reduced-motion`** → no animated transitions.
* Accept: sun-position unit tests (sunrise 4:34–4:35, sunset 19:31–19:32, ±2 min); first frame of each day is daylit; scrubbing across dusk changes brightness within 500 ms; no `mix-blend-mode` full-screen layer remains (or exactly one, documented).

### 9.8 Relief, scale, north, attribution, base style

* **Hillshade (low-risk, high polish):** `raster-dem` source `mapbox://mapbox.mapbox-terrain-dem-v1` (confirmed by the [Mapbox hillshade example](https://docs.mapbox.com/mapbox-gl-js/example/hillshade/)) + `hillshade` layer inserted **below overlays, above imagery**, exaggeration **0.25–0.4** (satellite already contains shading; start low), illumination 315°, shadow `#0b0f1a`, highlight `#fff4de`; added **after first idle**, toggle "Relief" in Layers (default on for full layout, off on `Save-Data`/low-end). Bounds are small (`maxBounds` ≈ 0.24° × 0.19°) so tile count is low, but **measure** requests/bytes in Lighthouse/RUM before shipping.
* **Do not enable 3-D terrain** (`setTerrain`) on the main map: the units canvas positions symbols with `map.project([lng,lat])` (`f.project([Xe.lng, Xe.lat])` `96544`) which is not guaranteed to include elevation — *test before considering*; offer 3-D only in a dedicated "Landscape" view.
* **Contours (optional):** Mapbox Terrain v2 `contour` vector layer (`mapbox://mapbox.mapbox-terrain-v2`, source-layer `contour`; filter on `index` for index contours) with 12 px `ele` labels in feet — *verify tileset/layer names and units at implementation.*
* **Scale + north:** add `ScaleControl({unit:'imperial'})` (feet/miles; toggle metric) bottom-left above the transport bar and keep the compass (`NavigationControl` `97252`, hide zoom buttons on touch). **Attribution:** keep the Mapbox logo and text visible on *every* map (mobile `102988`, walkthrough `110777`) — compact `AttributionControl` is allowed.
* **Base style:** keep `satellite-v9` initially; evaluate a custom Mapbox Studio style ("Gettysburg 1863": slightly desaturated imagery, warm cast, custom label fonts) — style URL includes the account name (public) and requires the token to have style-read scope.
* **Optional Phase 3:** georeferenced 1860s battlefield maps (public-domain LOC map collections — *verify item, rights statement and georeferencing accuracy*) as a tile overlay with an opacity slider ("Then/Now"), self-hosted WebP tiles ≤ z 17.

### 9.9 Interaction polish

* **Picking in screen space:** 14 px radius (fine) / 22 px (coarse) via `queryRenderedFeatures(bbox)`; nearest by pixel distance; tie-break by rank; replaces `Xx(...0.002)`.
* **Hover card** (fine pointer): 300 ms delay, 280 px, edge-flip, shows designation · commander · strength (n / initial) · posture *word* · side *word*; focus-equivalent for keyboard = the Roster/Search lists (each row highlights its unit on the map).
* **Selection:** 2 px `--accent-hi` ring + soft halo; a trail of the last N ticks in `--accent` (line-gradient fade); pin = solid ring + always-on label.
* **Engaged (K-5):** derive from data/world distance (metres) or the `engaged` flag in `symbology.json`; static amber ring (`#ffb020`, 1.5 px) + one 700 ms pulse on becoming engaged; reduced-motion → static.
* **Keyboard access to the map:** map region is focusable (`tabindex="0"`, `role="region" aria-label="Battle map"` — avoid `role="application"`), arrow keys pan, `+/-` zoom, `Tab` cycles the **top-N visible labelled units**, `Enter` selects — gives keyboard/AT users a path that today only Search/Roster provide.

### 9.10 Renderer migration (choose per N1)

* **Option A (interim, keeps canvas; L):** add DPR scaling (`canvas.width = cssW·dpr; ctx.scale(dpr,dpr)`), replace relaxation with aggregation + priority labels, new glyph draw functions, screen-space picking, data-driven engaged state, `symbology.json`-driven legend. Delivers K-1…K-7 visually; keeps per-frame `project()` costs.
* **Option B (target; XL):** GeoJSON **symbol layers** — the PoC already exists in `unit-rendering-reference.html` (symbol layer + collision + halo layer; **note:** its `map.addImage('unit-arrow', …)` omits `{sdf:true}`, so `icon-color` cannot recolour it — [SDF-only property](https://docs.mapbox.com/help/dive-deeper/using-recolorable-images-in-mapbox-maps/); add `{sdf:true}` and use two stacked icon layers: SDF frame (side colour) + SDF branch glyph (white)); `icon-image` = `['concat','frame-',['get','posture']]`; `symbol-sort-key` = priority; `feature-state` for hover/selected; `queryRenderedFeatures` for picking; trails as `line` layer with `line-gradient`. 467 points updated at ≤ 30 fps is trivial for GL and removes the per-frame `project()`/`measureText` main-thread work; consider `GeoJSONSource.updateData` diffs if available in 3.24 (*verify*).
* Either option: draw glyphs from the *same* SVG path definitions used by the legend (`symbology.json` → canvas `Path2D` or GL image).

### 9.11 Acceptance (cartography)

* Legend/map parity test: for each posture, render glyph via renderer and via legend → pixel diff ≤ 1 % (Playwright screenshot of a fixture tick).
* At zoom 11–13 no symbol is displaced from its true lng/lat (assert `project()` of symbol anchor = drawn anchor ± 0.5 px); label overlap count = 0 (bounding-box test); min label font 12 px; labels ≤ 60 on screen.
* HiDPI: on a 2× and 3× emulated device the symbol edge is crisp (canvas backing size = 2×/3× CSS size).
* CVD/greyscale: every posture and both sides distinguishable in the three simulations and greyscale (manual + automated ΔE on glyph masks).
* Day/night: sunrise/sunset unit tests; scrub across dusk < 500 ms; no `mix-blend-mode` full-screen div.
* Attribution + Mapbox logo visible on desktop, compact and walkthrough maps.
* Overlays: 100 % from `data/geo`; monuments = single symbol layer; `KF` rAF loop gone (Performance panel: no per-frame React commits when idle).

---

## 10. Microinteractions and motion

**Principles:** motion explains *state change* or *spatial relationship*, never decorates; ≤ 200 ms for controls, ≤ 320 ms for panels/sheets, ≤ 500 ms for camera/day changes; nothing loops forever except the (user-started) playback and a loading indicator; everything has a reduced-motion equivalent.

**Global policy (CSS + JS):**

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important; scroll-behavior:auto !important; }
}
```
```js
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
map.flyTo({ center, zoom, duration: reducedMotion.matches ? 0 : 800 /* never pass essential:true */ });
```
(Mapbox skips animated camera transitions under reduced motion unless `essential:true` — *verify on 3.24.1*.) Today: **0** `prefers-reduced-motion` references in the app UI; 6 across static CSS.

| # | Element / trigger | Motion (duration · easing) | Reduced-motion |
|---|---|---|---|
| 1 | Button press | `scale(.98)` + surface step · 80 ms · `--ease-standard` | none |
| 2 | Toggle on (toolbar/chip) | icon colour cross-fade + 2 px underline slides · 200 ms | instant |
| 3 | Docked panel open/close | `translateX(±16px)` + fade · 200 ms out / 120 ms in | fade only |
| 4 | Bottom sheet | `translateY` to snap · 320 ms `--ease-out`; drag follows finger; velocity snap | opacity only |
| 5 | Play ↔ Pause | icon cross-fade · 120 ms; `aria-label` toggles "Play"/"Pause"; announce nothing (time is not read every tick) | instant |
| 6 | Speed change | segmented thumb slides · 160 ms; toast "×2 · 20 min/s" 1.5 s | instant |
| 7 | Day change (tab/`1-3`) | title card "July 2 · Morning" in transport lane (fade 200 ms, hold 1.2 s) + `flyTo` ≤ 800 ms to the action (D3) | `jumpTo`, static card |
| 8 | Scrubber drag | thumb 20 → 24 px; floating time tooltip tracks pointer ("Jul 2 · 3:20 PM · Wheatfield"); optional `navigator.vibrate(8)` when crossing an event marker (Android; setting) | no vibrate animation |
| 9 | Unit hover (fine pointer) | 1 px accent ring; tooltip after 300 ms | ring only |
| 10 | Unit select | one 400 ms ring "ping", then steady halo | steady halo |
| 11 | Engaged units | static amber ring; one 700 ms pulse on becoming engaged (replaces infinite `sin(t/300)` glow `96615`) | static |
| 12 | Story panel enter | slide 16 px + fade · 200 ms; read-progress bar (existing `Cr.progressBar`) | fade |
| 13 | Toast | slide-up 16 px + fade in · 200 ms; out 120 ms; hairline countdown pauses on hover/focus | fade |
| 14 | Menu open (Explore) | `scale(.98→1)` + fade from trigger corner · 160 ms (existing `site-nav.css:74–81`) | fade |
| 15 | Legend row hover/focus | non-matching symbols dim to 35 % · 120 ms | instant |
| 16 | Search result hover/focus | matching unit gets ring on map (if in view) | same |
| 17 | Copy link | label morphs "Copy link → Copied ✓" for 2 s + `aria-live="polite"`; **replace `window.prompt("Copy this link:",…)`** fallback in Bookmarks (`bookmarkpanel-c5yt4b5k.js`) with an inline read-only field + auto-select | same |
| 18 | Skeleton shimmer | 1.4 s linear gradient sweep | static tint |
| 19 | Focus ring | instant (no animation) | – |
| 20 | Cursor glow (`iO` `101817–101875`: 36–52 px gold ring following the mouse; **`setState` on every `mousemove`**) | remove, or drive via a `transform` from a ref in `requestAnimationFrame`; hide on touch & reduced-motion | removed |
| 21 | Page-load entrance | **remove `body{animation: gtbg-page-in 340ms ease both}`** (`site-nav.css:12`) — it starts at `opacity:0`, delaying FCP/LCP on every sub-page; likewise drop `boot-fade-in` (`index.html:99`) from the LCP element | – |
| 22 | Ambient loops | Historian pin glow (`site-nav.css:41,48`, infinite 3.4 s) → 2 pulses then stop; boot bar keeps (loading indicator) | static |

**Missing keyframe:** `animation:"slideIn 0.2s ease"` (`100024`) has no `@keyframes slideIn` anywhere → define `gb-slide-in` in `tokens.css` (or delete). **Acceptance:** `grep` finds every `animation:`/`transition:` using a token duration; toggling the OS "reduce motion" leaves no animation > 1 frame (Playwright with `reducedMotion:'reduce'` asserts `getAnimations()` empty except loaders); sub-page FCP no longer waits on an opacity animation (Lighthouse trace: first paint contains text).

---

## 11. Empty, loading and error states

### 11.1 What exists

* **No error path for the boot:** `sF()` (`96939–96941`) = `Promise.all([iF(), rF(), oF(), zp(1)])`; `iF` (14 OOB fetches, `96834`), `rF` (`96919`), `oF` (`96923`) have **no `.catch`**; `AO` calls it with no handler (`112963`) — one 404/timeout leaves `placementsByTick` empty, so `tO` waits forever on `Object.keys(he).length > 5` (`101479`) → an infinite "Loading battle data…" splash. `zp` alone catches per-file (`96900–96918`).
* **No React error boundary** in the app code (grep = 0) → a render exception unmounts the whole tree (white screen).
* `Suspense fallback:null` for Help/Bookmarks (`113276–113284`) → nothing appears for 1–2 s (D1).
* Map creation has no WebGL/token failure UI (`gF` bails out when the token is missing `97235` and renders a literal `!a2` = `false` child `97386`); tile/ imagery errors are silent.
* Empty states that *do* exist: Search "No units found for "…"" (`98946`-area), Bookmarks "No bookmarks yet. Save your favorite moments.", Roster "Not on field". Missing: Filter → 0 units (map goes blank silently), Story/Ancestor no-selection, Historian low-confidence, Dashboard/Ledger baselines (S4 "starts at 4 casualties"), Report before search.

### 11.2 State catalog

| Surface | Loading | Empty | Error | Offline / degraded |
|---|---|---|---|---|
| **Boot** | HTML splash with staged progress (Map ▸ Units ▸ Story); > 4 s → "Still loading — slow connection?" | – | > 12 s or any failed critical fetch → *"We couldn't load the battlefield data."* + which file, **[Try again] [Copy details]** (mailto with prefilled diagnostics) | SW-served shell + last cached data; banner "Offline — showing saved data" |
| **Map** | tinted `--bg-void` + progress "Loading imagery…" until `idle`; poster image (real day-1 screenshot, ≤ 40 KB WebP) behind the canvas to protect LCP | – | WebGL unsupported/context lost → static poster + "Your browser can't show the interactive map. Try another browser or the Documentary (no WebGL needed)"; tile errors → non-blocking toast | cached tiles |
| **Unit panel** | header + 3 skeleton lines | – | data missing → "Details for this unit aren't in our records yet." | – |
| **Search** | 5 row skeletons (only if index build > 150 ms) | *No results for "x"* + 3 suggestions ("Try a state, a commander, or 'Wheatfield'") + examples | index failed → retry | – |
| **Filter → 0 units** | – | overlay chip on map: *"No units match these filters."* **[Reset filters]** | – | – |
| **Help / lazy chunks** | dialog skeleton ≤ 100 ms | – | chunk load failed → "Couldn't load Help. [Retry]" | – |
| **Story panel** | – | (not shown) | – | – |
| **Historian** | typing indicator + "Searching the records…" | first-run starter questions (chips) | *"I couldn't find a reliable answer in the records I have."* + nearest sources + [Rephrase] | – |
| **Dashboard / Ledger / Ground Remembers (S2, S4, C7)** | chart-shaped skeleton with **fixed aspect ratio** (CLS 0); Ground Remembers = poster + spinner (map blank ~3 s today) | baseline "0 casualties · start of battle" | *"We couldn't draw this chart."* + [Reload]; never raw variable names / `undefined` (C7) | – |
| **Battle Reports** | – | example chips ("20th Maine", "1st Minnesota") + recent | – | – |
| **404** | – | branded (exists: `404.html`) — add search + top 5 links | – | – |

**Components.** `<StateBlock icon title body actions variant="loading|empty|error">` (`role="status"` for loading/empty, `role="alert"` for error; icon + text, never colour alone). `<Skeleton>`: `background: var(--surface-2)` + shimmer `linear-gradient(90deg, transparent, rgb(255 255 255 / .06), transparent)`; **dimensions copied from the final content** (CLS 0); `aria-hidden` with a visually-hidden "Loading…". `<ErrorBoundary>` at app root and around each dock/panel: *"Something went wrong in this panel. [Reload panel]"* + `console.error` + optional Report (`mailto:` prefilled with `location.href`, layout, tick, UA, last 5 console errors); never blank the map for a panel failure.

**Copy voice** (museum, plain, specific): say what happened, what is still available, what to do; no jargon ("fetch", "chunk", "500"), no blame, no exclamation marks.

**Acceptance (Playwright `route.abort()`):** abort `/data/oob/*.json` → error state ≤ 12 s with Retry that recovers when the route is restored; abort Mapbox tiles → toast, UI remains usable; `--disable-gpu`/WebGL off → poster fallback; throw inside `Unit` panel → boundary fallback, map alive; offline → cached shell loads; **no infinite spinner anywhere** (every loader has a timeout to an error state); Help opens with skeleton ≤ 100 ms.


---

## 12. Theming, forced-colors, contrast preferences, print

### 12.1 Themes and user preferences

| Mode | Trigger | Notes |
|---|---|---|
| **Dark (default)** | default / `data-theme="dark"` | today's palette, consolidated (§3.2) |
| **Light ("Archive paper")** | `prefers-color-scheme: light` or `data-theme="light"` | parchment surfaces; validated contrast (§3.2); the satellite map is unchanged, only chrome/labels adapt; needed for classrooms/projectors/print-to-screen |
| **System** | Settings → Theme: System / Dark / Light | persisted in `gb.v2.prefs.theme`; live-follows OS changes |
| **High contrast** | `prefers-contrast: more` | `--text-3 → --text-2`, borders `--slate-500`, no translucency |
| **Forced colours** | `forced-colors: active` | system colours + 1 px borders (§3.2 block) |
| **Reduced motion / transparency / data** | `prefers-reduced-motion`, `prefers-reduced-transparency` (progressive), `navigator.connection.saveData` | `--surface-overlay → --surface-1` and `backdrop-filter:none` when transparency reduced; Save-Data disables hillshade, fast-forward film, cursor glow |
| **Density** | `[data-density="comfortable"]` (Settings "Larger text & targets") | +12 % type, 48 px controls — the classroom/older-user option; can replace the separate blue `education.html` palette |

**No flash of wrong theme:** a ~200-byte inline `<script>` in `<head>` reads `gb.v2.prefs.theme` inside `try/catch` and sets `document.documentElement.dataset.theme` before first paint (otherwise CSS `prefers-color-scheme` alone applies). Under an enforced CSP this needs a **hash** (`script-src 'sha256-…'`), not `'unsafe-inline'` (X3). Add `<meta name="color-scheme" content="dark light">` and media-specific `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a14">` / `… light content="#f5f0e4"` (today one static `#0a0a14`, `index.html:6`).

**Reflow / zoom (WCAG 1.4.4/1.4.10):** rem-based type; layout is derived from CSS width, so browser zoom 200–400 % (= 320–640 CSS px) selects the compact layout automatically. Today `html,body{overflow:hidden}` + fixed pixel panels (`index.html:62`, `Cr.panel width:340` …) cannot reflow. The *map* is exempt from 1.4.10; the chrome is not.

### 12.2 Print — Battle Reports (`report.html`) and friends

**Current print CSS** (`report.html:37–43`) hides `header, #search, #matches, .print-btn, .back`, sets `body{background:#fff;color:#000}` and `#report .row{color:#000}` — but (verified) `#report .key-action{color:#ccc}` (line 35) remains **1.61 : 1** on white, `#report h2` stays gold (2.40 : 1), row labels `#8a93a8` (3.08 : 1), the injected `#gtbg-nav`/`#gtbg-footer` are not hidden, there is no `@page`, no source line, no attribution/URL, and the report shows raw ids `parent_corps_id + ' / ' + parent_brigade_id` (`report.html:101`; `regiment.html:199` does the same with ` · `). Regimental Biography, Dashboard, Historian and Documentary have no print CSS at all.

**Target: a shared `@layer print` in `app.css` + a designed one-page report.**

```css
@page { size: auto; margin: 0.6in; }
@layer print { @media print {
  :root { color-scheme: light; --text-1:#000; --text-2:#222; --text-3:#444; --border:#8a8a8a; --accent-text:#5b4207; }
  html, body { background:#fff !important; color:#000 !important; animation:none !important; }
  body { font: 11pt/1.45 var(--font-serif); }
  .gb-header, .gb-footer, #gtbg-nav, #gtbg-footer, .gb-skip, .gb-toast, .gb-no-print, header .back, #search, #matches, .print-btn { display:none !important; }
  a[href^="http"]::after { content:" (" attr(href) ")"; font-size:9pt; color:#333; }
  #report { display:block !important; border:0; padding:0; background:none; }
  #report h2 { font-size:20pt; color:#000; border-bottom:2pt solid #000; padding-bottom:4pt; margin-bottom:8pt; }
  #report .row { display:grid; grid-template-columns:38% 1fr; gap:8pt; break-inside:avoid; border-bottom:.5pt dashed #777; }
  #report .row span:first-child { color:#333; }
  #report .key-action { color:#000; font-style:italic; break-inside:avoid; }
  .gb-side-band { print-color-adjust:exact; -webkit-print-color-adjust:exact; }   /* Union/Confederate band + word, pattern not only colour */
  .gb-report-footer { display:block; margin-top:14pt; font-size:9pt; color:#333; border-top:.5pt solid #777; padding-top:6pt; }
}}
```
* **Report anatomy:** header (unit designation, side word + band, corps/division/brigade as *names* via the OOB lookup, not ids), data table (state, commander + fate, strength, casualties, rate, days engaged), **"Where they stood"** — a small inline **SVG** trace of the unit's placements over the days (drawn from `placements_*.json`, on a parchment grid with 3–5 named landmarks; no map tiles → prints reliably, ~0 KB extra), key action paragraph (Spectral), and a footer: *"Gettysburg Animated Battlefield Map · gettysburginteractivemap.com/regiment.html?unit=… · Printed <date> · Positions are reconstructions; sources: Official Records; Busey & Martin …"* (source line comes from the data/citation layer). Optional client-side QR to the live view (tiny MIT lib; *check licence at adoption*).
* **Acceptance:** printing 5 sample regiments (Chrome "Save as PDF", Letter and A4, background graphics **off**) yields exactly one page each with black-on-white text ≥ 4.5 : 1 (measured on the PDF raster), no nav/footer/button artefacts, side identified by word + hatch, no raw ids, footer present; `@media print` exists on Regiment/Dashboard/Historian (Historian = "Print this conversation").

---

## 13. Sub-page harmonisation and brand assets

### 13.1 Page templates and shared parts

Four templates, one stylesheet: **Tool page** (Compare, Camera, Sandbox, Immersive, Cinematic Export, Watch Together, AR, Viewshed, Ground Remembers, Living Ledger), **Lookup page** (Search, Regiment, Report, Find Ancestor, Historian), **Content page** (Documentary, Turning Points, Aftermath, Students, Privacy, Terms, 404), **Map** (SPA).

* **Global header/footer in the static HTML, not injected after load.** Today `<div id="gtbg-nav-mount"></div>` is empty until `site-nav.js` (loaded at the *end* of `<body>`, `search.html:203`) runs on `DOMContentLoaded` and replaces it with `<nav id="gtbg-nav">` (`site-nav.js:161–171, 232–236`) — a ~47 px block appearing at DCL, i.e. a **layout shift on every sub-page** (*likely; verify with a sub-page Lighthouse/CLS trace — the audit only measured the home page*). Fix: emit the header/footer markup at build time (or `min-block-size:48px` on the mount div until then) and keep `site-nav.js` only for the menu behaviour, `defer`red.
* **`privacy.html`, `terms.html`, `404.html`, `embed.html`, `unit-rendering-reference.html` load no `site-nav`** (nav/footer/js/css counts = 0) → privacy/terms have no header/footer/skip link and only one inline back link; **none of the three has `<main>`** (`grep -c "<main"` on `privacy`, `terms`, `404` = 0). They join the Content template.
* **One "back to the map" link.** 20 pages carry both the nav brand `← GETTYSBURG` (`site-nav.js:166`, with `history.back()` logic `wireBackLinks` `211–228`) **and** a `header a.back` "← Back to the map" (12 px muted). Keep the nav brand; replace the page-level link with a **breadcrumb** (`Map › Extra Features › Search`, `<nav aria-label="Breadcrumb">`, plus `BreadcrumbList` JSON-LD — cheap SEO signal for T1).
* **One `h1` scale** `--fs-2xl`, colour `--accent-hi` (`#e8d5a3`, 13.6 : 1; unifies the 8 scales and 3 colours found in §2.1); sub-line `--text-3 --fs-sm`; `main` max-width `--content-w: 62ch` for Content pages, `72rem` for Tool pages.
* **`education.html`** is the outlier (`--bg:#0a3a6a; --panel:#0d4a80; --accent:#ffd166`). Decision for the owner (Q-2): (a) fold into the default theme with `data-density="comfortable"` (recommended: one brand, larger type/targets, same AA guarantees) or (b) keep as `data-theme="classroom"` implemented as a token override (never a fork). Either way its `.day-tab`/`.explore-btn` become `.gb-tab`/`.gb-btn`.
* **Component reuse map:** `.filter-chip/.sugg/.toggle-btn/.mode-btn` → `.gb-chip`; `.play-btn/.print-btn/#record-btn/#ask-btn/a.cta/#start-btn/#sound-gate button` → `.gb-btn--primary`; `.btn/.btn-sec/.nav-btn/.ctl-btn` → `.gb-btn--secondary`; `.match/.match-row/.result` → `.gb-card--row`; `.msg.bot/.msg.user` → `.gb-bubble`; `.stat`/dashboard cards → `.gb-stat`; compare `.pane-controls` → `.gb-panel--inline`.

### 13.2 Mobile sub-page items owned by design (S4)

* Dashboard chart: fixed 1000 px SVG → `viewBox` + `width:100%`; on ≤ 480 px show one day at a time with a segmented "July 1 / 2 / 3" (or small multiples) instead of horizontal scroll; ≥ 44 px hit areas on legend toggles.
* Compare style tabs clip ("Parc…") → tabs component with scroll-snap/wrap (§5.4); `.toggle-btn` 10 px type / 3×8 px padding → chip (32/44 px, 12 px+).
* "~10–12 sub-40 px targets per page" → all through `.gb-btn/.gb-chip` at `pointer:coarse`; min font 9.5 px (site-nav `.gtbg-here` `98`) → 12 px.
* Living Ledger "starts at 4 casualties" → baseline/skeleton state (§11.2).

### 13.3 Brand and share assets (D-5)

* **`screenshots/day1.png` = `day3.png`** (md5 `3f6646c99f3416a1aa35fea67bed21c5`, 17,585 B, 1280 × 720; IHDR colour-type 2 = RGB but the decompressed data is 5121 B/row = RGBA-sized so Pillow raises "unrecognized data stream"; sampling gives ~80 distinct colours, a dark gradient from `#0a0a14`) are the `og:image` / `twitter:image` on **all 20+ pages** and the manifest `screenshots`. Replace with: (1) real captures of Day 1 dawn / Day 2 Little Round Top / Day 3 Pickett's Charge (1280 × 720 PNG/WebP, manifest `screenshots` with `form_factor:"wide"` + a narrow 750 × 1334 set), (2) a designed **1200 × 630 OG card** per page family (title in Spectral 700, gold rule, a map crop) — 26 pages can share 5–6 cards; ≤ 100 KB each; set `og:image:width/height/alt` and `twitter:card=summary_large_image`.
* **Icons:** `icon-192/512.png` are flat 4-colour PNGs (`#0a0a14 / #c9a24b / #9a7a33 / transparent`; no anti-aliasing) with transparent corners and one manifest entry `"purpose":"any maskable"`. Provide: an SVG master (a mark that works at 16 px), `favicon.svg` (with `prefers-color-scheme` media query inside the SVG) + `favicon.ico` 32 px, `apple-touch-icon` 180 (opaque, no transparency), **separate** `any` and `maskable` 192/512 (maskable full-bleed with safe zone = central 80 %), monochrome variant for Android themed icons. Regenerate the sprite/logo from one source.
* **Wordmark/lock-up:** "Gettysburg" (Spectral 700) + small-caps "Animated Battlefield Map"; the domain says "interactive" and titles say "Animated" (E2) — settle the name once (open question Q-6) and use it in header, splash, `<title>`, manifest, OG.
* **Acceptance:** `curl -s /screenshots/day3.png | file -` reports a valid PNG that decodes; distinct images per file; Lighthouse "installable manifest" shows real screenshots; Facebook/Twitter/LinkedIn debuggers render a real card; maskable preview (maskable.app) shows no clipping.

---

## 14. Governance, QA, roadmap

### 14.1 Guard-rails (so it stays A+ for a solo developer)

| Guard | Tooling | Rule |
|---|---|---|
| Tokens only | stylelint `color-no-hex` (ignore `tokens.css`), `declaration-property-value-disallowed-list` for raw `px` on `font-size < 12`, `z-index` allow-list `var(--z-*)`, `selector-max-specificity: 0,3,0`, `declaration-no-important` (except reduced-motion) | fails CI |
| No inline styles / emoji / div-buttons | ESLint: `react/forbid-dom-props` (`style`, allow `--custom` via helper), `no-restricted-syntax` (`zIndex`, emoji literals via regex), `jsx-a11y/click-events-have-key-events`, `no-static-element-interactions`, `control-has-associated-label`, `interactive-supports-focus` | fails CI |
| Generated docs | `styleguide.html` (noindex): swatches with measured contrast, type ramp, spacing/elevation/motion, icon grid with names, every component × state forced via `data-state`, the **symbology sheet** (11 postures × 3 branches × 2 sides + legend) | visual QA target |
| Automated UI tests | Playwright matrix: viewports 320 × 568, 375 × 812, 414 × 896, 768 × 1024, 1024 × 768, 1440 × 900, 1920 × 1080, 2560 × 1440, **667 × 375, 812 × 375 (landscape)** × themes dark/light/forced-colors × states (home, each panel, each modal, toast burst) | assert no horizontal overflow; no docked-panel overlaps; target ≥ 24 (fine) / 44 (coarse); `axe` 0 serious/critical on all 27 pages; z-order; focus order; `getAnimations()` empty under reduced-motion; `toHaveScreenshot` (map masked) |
| Budgets | Lighthouse CI + bundlesize | `app.css` ≤ 4 KB br; fonts ≤ 50 KB; icons ≤ 10 KB br; LCP element on `/` = splash `h1` (no webfont) |
| Change checklist | PR template | tokens only · all states · keyboard · forced-colors · reduced-motion · 320 & 1440 screenshots · print where relevant |
| Versioning | `data-ds="1.0.0"` on `<html>` | changelog in `design/CHANGELOG.md` |

### 14.2 Phases and dependencies

| Phase | Contents | Effort | Depends on |
|---|---|---|---|
| **0 — Stop the bleeding** (days) | C8 chip fix + `@layer` reset; delete `body{animation}` and `boot-fade-in`; reserve/insert sub-page header (CLS); un-gate desktop widgets in mobile + drop `zIndex` on `tn.root`/`tc.root` + portal the Tools sheet (C1/C2); Esc works in inputs; `slideIn` keyframes; attribution on every map; real OG/screenshots + icons; gray-text floor (`#444–#777` → tokens) in CSS files; `#extra-features` z-index ≤ 100 + hide while any modal is open (interim) | S–M | none (bundle patch or source) |
| **1 — Foundations** (1–2 wk) | `tokens.json → tokens.css/js`, `app.css` (`@layer`), fonts self-hosted, icon sprite pipeline, migrate 26 sub-pages (mechanical), print layer, light theme scaffold, styleguide page, lint rules | L | Phase 0 |
| **2 — Shell & components** (2–4 wk) | AppShell (one responsive tree), GlobalHeader/Ask/Explore (H1), Transport + Slider, Panels/Sheets/Modals/Toasts/Menus/Tooltips, State components + ErrorBoundary, splash/onboarding (H3), a11y (roles/labels/focus) | XL | **N1** (source) or Track 0b patching; Phase 1 tokens |
| **3 — Cartography** (2–4 wk) | `symbology.json`, glyphs, legend, aggregation + labels, DPR, data-driven overlays, monuments layer, day/night (needs canonical clock — C3/C4), hillshade, scale/attribution; symbol-layer migration (Option B) | XL | Phase 1; C3/C4 for day/night; data `terrain.json`/GeoJSON |
| **4 — Polish & docs** (1–2 wk) | motion pass, print polish + SVG trace, forced-colors/contrast QA, OG cards, wordmark, historic-map overlay (optional), design docs | M–L | Phases 1–3 |

### 14.3 Expected effect (design-owned portions)

| Category (audit) | Now D / M | After (design scope) | Mechanism |
|---|---|---|---|
| Visual design & brand | B+ / B- | **A / A** | one token system, real assets, symbology, type |
| Fit & finish / polish | C+ / D+ | **A / A** | H1/H6/H7 integration, states, motion, no leaked strings |
| Usability / learnability (mobile) | B- / D+ | **A- / A-** | one shell (C1/C2), 44 px targets, sheets, onboarding |
| Accessibility | C+ / C | **A- / A-** (design-controlled: contrast, target size, focus, motion, forced-colors, labels) | §3.2, §5, §6.4 |
| Lighthouse A11y | 90 / 90 | **98–100** (colour-contrast + label + names) | §2.5, §5.12 |
| Performance (design-attributable) | – | small but real: −340 ms entrance-fade on sub-pages, −0.4 s splash fade on LCP element, −4.9 s forced React splash, no per-frame `setState` (KF, cursor glow, splash fast-forward), −420 lines injected inline JS and their `querySelectorAll('body *')` scans, font budget ≤ 45 KB with zero-CLS fallback | §8, §9.6, §10 |
| CLS | – | header reserved/static, `size-adjust` fallback, skeleton dimensions | §11, §13.1, §3.3 |

### 14.4 Risks

1. **Redesign ahead of a source of truth (N1).** Mitigation: Phase 0/1 are source-independent; Phase 2 starts only after the N1 decision; Track 0b patches are covered by a Playwright smoke suite first.
2. **Codemod regressions** (spacing/radius snapping changes pixels). Mitigation: screenshot baselines before/after, map-masked; apply in 3 passes (colour → type → spacing).
3. **Web-font CLS/LCP.** Mitigation: fallback with metric overrides, preload one file, splash on fallback stack, measure.
4. **Hillshade tile cost.** Mitigation: after-idle, toggle, Save-Data off, measure requests/bytes.
5. **Symbol-layer parity** (interpolation smoothness, hit-testing). Mitigation: Option A first; ship B behind a flag with A/B RUM.
6. **Scope creep (light theme, historic overlay).** Mitigation: they are Phase 4/optional.
7. **Licences:** Lucide ISC/MIT notices, Spectral OFL text, any vendored SunCalc (BSD-2) — collected in `/licenses/` and linked from About.
8. **Mapbox terms:** attribution always visible; custom style/fonts stay within terms.

### 14.5 Open questions for the owner

* **Q-1** Do you want a **light theme** (recommended for classrooms/print) or dark-only?
* **Q-2** `education.html`: fold into the default theme with a "larger text" density (recommended) or keep a distinct classroom theme?
* **Q-3** OK to spend ~45 KB on Spectral (two weights) — or system fonts only?
* **Q-4** OK to move "Download Website Tutorial PDF" and "Toggle Units" out of the top bar, and to remove the hide/show eye toggle?
* **Q-5** Which **clock convention** (LMT vs a "battle time" convention) will C3/C4 settle on — day/night and the tour copy depend on it.
* **Q-6** Product name: "Animated Battlefield Map" vs "Interactive Map" (E2) — one name everywhere?
* **Q-7** Are there licensed/own geodata sources (NPS GIS, LOC georeferenced maps) you want to use for accurate overlays?
* **Q-8** Track 0b (patch minified bundle now) vs wait for a proper source rebuild (N1)?
* **Q-9** Any brand assets/logo that already exist (the current icon looks generated)?

---


### 14.6 Before → after, by surface (descriptions)

| Surface | Before (verified) | After |
|---|---|---|
| **Top bar (desktop)** | 48 px bar: `GETTYSBURG · July N · tick` (11 px monospace `#666`), centre text buttons "Toggle Units" / "Download Website Tutorial PDF" / "🗺 Virtual Walkthrough", right cluster of 13 tiny monospace glyph buttons `S F ☰ L 🗿 🔭 ⭐ 📏 🗺 📍 🔍 B ?` (~28 × 26 px, no labels, two of them both "search"), plus a separate gold pill + eye toggle floating at `z 999999` that hops corners | 56 px header: brand + date/time chip; grouped 40 px icon buttons *Find · View · Tools ▾* (labels ≥ 1280 px); **Ask the Historian** pill and **Explore ▾** fixed at the right; Help; tooltips + roving tabindex; PDF/Toggle Units moved into Help/Layers |
| **Timeline / transport** | one ~120–130 px block: time, three pastel day buttons, 4 px range with 8 px event dots, 5 glyph transport buttons + 6 light-grey speed pills + `Tick n/675` + credit e-mail; on phones it shows through the mobile UI and overflows (C1) | 72 px (desktop) / 88 px (compact): one scrub lane with labelled day segments and 24 px-hit diamond/dot event markers, hover time tooltip; one control row *step-back · **Play** · step-forward · speed segmented "×2 · 20 min/s" · clock*; native slider semantics; credit moved to About |
| **Unit panel** | 280 px fixed, 10–12 px text, `#555–#777` labels, 14 px unlabeled ✕, `innerWidth<500` layout decided once | 320–400 px dock; serif title + side swatch **and word**, posture word, strength *n / initial* with bar, commander, history rows ≥ 13 px, footer *Ask about this · Copy link · Pin*; 40 px close; focus in/out |
| **Story panel** | 340 px at top-right competing with toasts, Layers, tour PiP and the Extra-Features pill; 12 px sans body; dismissals forgotten | right-dock item; Spectral 16/1.65 at ≤ 62 ch, read-time chip, jump-to-tick; replaces (never stacks with) Layers/Tour; "Story available" chip when the dock is busy |
| **Legend** | 240 px "⊞" fab at `bottom:160`, 3 tabs with colours that differ from the map, circles for size, mobile mini-legend with a third palette | collapsed "Key" button; one JSON-driven legend drawing the *same glyphs*; hover/focus highlights matching symbols; lives in the Tools sheet on compact |
| **Splash** | good HTML splash → React overlay with 52 px ALL-CAPS wordmark (clips at 375 px), 3.5 s fast-forward, 11 px `#444` "Skip intro ›" `<div>`, then the chooser | one HTML splash with staged progress, mixed-case wordmark, no artificial delay |
| **Layout chooser** | full-screen "Choose Your Experience" every visit, `🖥 📱` dark-on-dark `div` cards, injected "AI-style historian" banner | deleted — auto layout, override in Settings |
| **Onboarding** | full-screen modal with archetypes (incl. "Power User keyboard shortcuts" on touch), tour steps jump the map behind the modal | non-modal welcome card + 5 coach marks anchored to real controls, resumable |
| **Mobile Tools sheet** | 14 tools, 22 px emoji + 10 px labels, last five rows hidden behind the desktop timeline; "Desktop View" is the last row | portal sheet above everything; *Ask* and *Explore all 20* cards first; 12 px labels; Settings (Layout/Theme/Motion); scrolls; safe-area padding |
| **Search filter chips** | light-on-light 1.10 : 1 | `.gb-chip` with explicit states, ≥ 4.5 : 1 |
| **Toasts** | two systems in two corners, dead `slideIn`, colour-only categories | one live region, ≤ 3, dedupe, pause-on-hover, icon + label |
| **Help** | blank 1–2 s then a 500 px modal at z 600 (can sit behind OOB/Roster) | dialog with skeleton in ≤ 100 ms, tabs, `<kbd>` list, About with source list + licences |
| **Map units** | strength-wide rectangles + 3.5 px posture dot, 8-pass displacement, blurry on HiDPI, 8–10 px labels on black plates | fixed frames + branch glyph + posture mark + strength bar, true positions, aggregated at low zoom, crisp, ≥ 12 px haloed labels |
| **Day/night** | 8 s multiply overlay keyed to a third clock | computed solar tint (raster paint props), ≤ 500 ms |
| **Battle Report (print)** | grey-on-white 1.6 : 1, nav/footer print, raw ids | one-page designed report with side word + hatch, "Where they stood" SVG, sources footer |
| **Sub-page header** | injected after `DOMContentLoaded`, duplicate back link, 8 `h1` scales | static header, breadcrumb, one `h1` style |
| **Share/PWA** | identical malformed gradient "screenshots", flat aliased icons | real captures, designed OG cards, proper icon set |



---

## 15. Findings register (long form)

Each finding is a fix spec: evidence (file:line + snippet), root cause, exact fix, effort (S<0.5 d, M 0.5-2 d, L 2-5 d, XL >5 d), acceptance test, metric/grade moved, dependencies, audit refs. IDs `app-design-NN`. Ordered by dependency-aware priority, not by number: **Phase 0** = 01, 06, 24, 32 (+ quick parts of 05/27/30); **Phase 1** = 03, 04, 05, 07, 08, 11, 34; **Phase 2** = 02, 09, 10, 12, 13, 14, 15, 16, 17, 18, 26, 35, 36, 37; **Phase 3** = 19-23, 25; **Phase 4** = 27-29, 31, 33.

| ID | Title | Sev | Effort | Refs |
|---|---|---|---|---|
| app-design-01 | Desktop timeline & widgets mount in Mobile layout; shell roots create stacking contexts (true root cause of C1/C2) | critical | M | C1, C2, H1 |
| app-design-02 | Replace the two app forks with ONE responsive shell (grid regions, dvh, safe-area, landscape rule) | high | XL | C1, C2, H3, E1, N1 |
| app-design-03 | Introduce a token system (tokens.json -> tokens.css/js) with cascade layers and a single hashed app.css | high | L | A1, A4, X3, N1 |
| app-design-04 | Consolidate colour: one gold/Union/Confederate/neutral ramp, accessible text variants, light + forced-colors themes | high | M | A1 |
| app-design-05 | Contrast remediation: 33% of app text declarations fail 4.5:1; translucent panels; print colours | high | M | A1, D2 |
| app-design-06 | C8 root cause: chip has no background/font and a global `button.filter-chip{color:inherit}` outranks it | critical | S | C8, A1 |
| app-design-07 | Typography: load the fonts the code asks for (Spectral, self-hosted), 12 px floor, one ramp, tabular numerals | high | M | A4, D2, H3 |
| app-design-08 | Spacing / radius / elevation / motion / breakpoint tokens and a reviewed codemod | medium | M | - |
| app-design-09 | z-index scale, overlay root and reserved zones (27 ad-hoc levels; Help renders behind OOB; 999999 overlay) | high | M | H1, H4, C2 |
| app-design-10 | Panel management: one panel per dock, LayerStack Esc chain, jump hygiene, toast-class event card, persisted HUD prefs | high | L | H1, H2, H4 |
| app-design-11 | SVG icon system replacing 108 emoji/letter glyph uses (44 distinct characters) | high | M | H6, A5, D2 |
| app-design-12 | Toolbar/header redesign: grouped, labelled, 40/44 px, roving tabindex, command palette; add missing Order of Battle | high | L | H6, D2, D4, A3 |
| app-design-13 | H1: integrate Ask the Historian + Extra Features into the header/Tools sheet; delete the floating overlay and 6 injected scripts | high | M | H1, H6, H8 |
| app-design-14 | H3: splash & onboarding redesign - no forced React splash, auto layout, persisted prefs, welcome card, coach-mark tour | high | L | H3, C6, H10 |
| app-design-15 | Timeline/transport redesign + accessible slider (no thumb styles, unlabeled, 8 px markers, #eee speed pills, credit in row) | high | L | A2, A3, C1, H9, D2 |
| app-design-16 | Modal/dialog system with focus management; fix z-order inversion and blank lazy-load (Help 1-2 s) | high | M | A6, D1, H2 |
| app-design-17 | One toast system (today two) with live region, flood control, and the missing slideIn keyframe | medium | M | H4 |
| app-design-18 | Custom accessible tooltip replacing 60 title= attributes (invisible on touch, not keyboard-triggered) | medium | S | A5, D2 |
| app-design-19 | Cartography: one symbology spec (shape=branch, line style=posture, colour=side, bar=strength) driving renderer AND legend | high | L | D3, H6 |
| app-design-20 | Cartography: aggregate instead of displace, priority labels >=12 px, DPR-aware canvas, screen-space picking, data-driven 'engaged' | high | L | D3 |
| app-design-21 | Cartography renderer migration: GeoJSON symbol layers (fix SDF), single monuments layer, remove per-frame React loops | medium | XL | P1, P2 |
| app-design-22 | Cartography overlays from data with a real style (roads/streams/works/farms/locations) | medium | M | D3 |
| app-design-23 | Day/night styling from computed solar altitude on the single canonical clock (GPU raster props, 300-500 ms) | medium | M | C4 |
| app-design-24 | Mapbox attribution hidden on mobile and walkthrough maps; add scale bar; keep compass | high | S | - |
| app-design-25 | Relief (hillshade) and optional contours / historic map overlay | low | M | - |
| app-design-26 | Empty/loading/error states, ErrorBoundary and a boot-failure path (today: infinite splash, white screen on render error) | high | M | C7, S2, S4 |
| app-design-27 | Motion & microinteraction policy: reduced-motion everywhere, remove LCP-blocking entrance fades, ambient loops, cursor glow | medium | M | A6, P1 |
| app-design-28 | Theming: light theme, prefers-color-scheme, prefers-contrast, forced-colors, no-flash theme script, density option | medium | L | A1, A6 |
| app-design-29 | Print stylesheet + designed one-page Battle Report (and print layer for Regiment/Dashboard/Historian) | medium | M | S1 |
| app-design-30 | Sub-page harmonisation: templates, static header/footer (CLS), breadcrumbs, one h1 scale, component reuse, privacy/terms/404 parity | high | L | S1, S4, E3 |
| app-design-31 | Mobile sub-page items: dashboard chart, compare tabs, targets, min font | medium | M | S4, A3, A4 |
| app-design-32 | Brand & share assets are placeholders: identical malformed screenshots, flat icons, merged manifest purpose | high | M | T1, E1, E2 |
| app-design-33 | Unit/Story/Event panel content design: reading typography, fluid widths, contextual 'Ask about this' | low | M | H8 |
| app-design-34 | Design governance: lint rules, Playwright viewport/theme matrix, axe on 27 pages, living styleguide, budgets | high | L | N1 |
| app-design-35 | Core component library: button, chip, tabs, segmented, card, panel, sheet, menu, switch, badge/kbd (replaces ~34 button-like definitions + inline styles) | high | L | A3, A5, D2 |
| app-design-36 | Search field/combobox: Esc behaviour, natural sort, no autofocus on touch, 16 px input, empty-state suggestions | medium | M | H2, H5, A5 |
| app-design-37 | App-shell semantics: landmarks, h1, skip link, focus management, labels for 613 inline-styled controls | high | M | D2, A5, A6 |

### app-design-01 — Desktop timeline & widgets mount in Mobile layout; shell roots create stacking contexts (true root cause of C1/C2)
* **Severity / effort:** critical / M
* **Evidence:** bundle.pretty.js:113249 `V.jsx(IO, {})` is unconditional while only the toolbar (113071) and map (113233) are gated by `Zn !== "mobile"`; mobile shell `tn.root` = `position:fixed; inset:0; zIndex:100; touchAction:"none"` (103699-103706); IO wrapper `Po.wrap` = `position:absolute; bottom:0; zIndex:100` (112386) and comes later in DOM so it paints over the mobile UI; mobile Tools sheet `toolsOverlay zIndex:500` (104037) lives inside the z-100 context; IO's `Po.controls` row = 5 transport buttons + 6 speed buttons + `Tick n/675` + `"Created by: Mike Legere · gettysburginteractivemap@gmail.com"` nowrap (112361-112370) = the 572 px row of C1.
* **Root cause:** Two forked app shells (AO desktop, pO mobile) sharing one root; desktop-only components are never unmounted in compact layout; shell roots set z-index (stacking context) so descendants cannot rise above later siblings.
* **Fix:** Phase-0 minimum: (1) mount FF/OF/VF/WF/CF/LF/_F/IO/KF/XF/iO/nO/yO/qF only when layout==='full' (AO 113243-113270); (2) delete zIndex from tn.root and tc.root; (3) render toolsOverlay/slidePanel/modals through a body-level portal (#overlay-root) at --z-sheet/--z-modal; (4) delete the credit/e-mail from the transport row (move to About). Then continue with the single-shell rebuild (app-design-02).
* **Acceptance test:** Playwright at 375x667 and 320x568: `document.querySelector('[data-gb=timeline-desktop]')` absent in compact; `elementFromPoint` at the centre of each of the 14 Tools-sheet items returns that item; every transport button has boundingBox.x>=0 and right<=viewport width and >=44x44; no horizontal overflow; repeat at 667x375 landscape.
* **Moves:** C1, C2 closed; Usability (mobile) D+ -> B-; Core function (mobile) D -> B
* **Depends on:** none
* **Audit refs:** C1, C2, H1

### app-design-02 — Replace the two app forks with ONE responsive shell (grid regions, dvh, safe-area, landscape rule)
* **Severity / effort:** high / XL
* **Evidence:** pO (bundle.pretty.js:102914-103697) is a second complete app: own `new z_.Map` (102981; desktop map 97237; walkthrough map 110770 = three GL contexts in code), own canvas + picking `ya` (103076), popup, roster, legend, 80x64 minimap with hard-coded bounds (103307-103317), day tabs, scrubber, tools grid + 740 lines of styles `tn` (103698-104440). Fixed chrome: topBar 52 + dayTabs minHeight 42 => `map top:94` (103709); bottomBar `height:140` (103775) => 234 px permanent chrome: 375x667 leaves 433 px (65%), 667x375 leaves 141 px (38%). manifest.json `"orientation":"landscape"`.
* **Root cause:** Layout mode chosen by a chooser screen, implemented as two component trees with pixel-offset positioning instead of CSS layout; breakpoints implemented as 13 window.innerWidth reads (8 evaluated once at module load inside style literals ji 98111-98115 and gp 102708-102712).
* **Fix:** `.gb-app{display:grid; block-size:100dvh; grid-template:'top top' var(--toolbar-h) 'dock map' 1fr 'transport transport' auto}`; container query <768 px collapses docks into a bottom sheet; compact chrome = top 48 + transport 88 (scrubber lane with day segments + one 44 px control row) = 136 px (80% map in portrait); landscape rule (max-height:500px) => 40 + 56 px; viewport-fit=cover; remove manifest orientation lock. One MapView (one WebGL context), shared Dock/Sheet components. Delete pO + tn (~1,500 lines).
* **Acceptance test:** Playwright matrix 320x568, 375x812, 414x896, 768x1024, 1024x768, 1440x900, 2560x1440, 667x375, 812x375: map area >=74% of viewport height in every compact case; resize 375->1024 flips layout live without reload; only one Mapbox map instance exists (`mapboxgl` maps count === 1); no overlap between toolbar/transport/docks.
* **Moves:** Usability mobile D+ -> A-; Fit&finish mobile D+ -> A; removes 1 WebGL context and ~1,500 lines
* **Depends on:** app-design-01, app-design-03, N1 decision (source recovery)
* **Audit refs:** C1, C2, H3, E1, N1

### app-design-03 — Introduce a token system (tokens.json -> tokens.css/js) with cascade layers and a single hashed app.css
* **Severity / effort:** high / L
* **Evidence:** Whole-site inventory (tmp-app-design/inventory.py): 307 colour literals (185 opaque, 122 translucent; 140 perceptual clusters at dE76<6; 95 used once), 41 font-size declarations, 36 spacing values (42% off the 4 px grid), 15 radii, >=16 shadow recipes, 20 durations, 27 z-index levels, 10 font-family strings, 1 CSS media query (site-nav.css:52). Bundle app UI = 613 inline `style:` props, 33 style consts / 462 keys, 0 aria/role, 0 media queries; assets/index-b4g7z_2g.css is 149/154 `.mapboxgl-*` rules. Static HTML: 27 <style> blocks + 51 style="" attributes.
* **Root cause:** Design decisions live as copy-pasted literals in 27 <style> blocks, one CSS file and 613 inline objects; inline styles cannot express :hover, :focus-visible, @media, forced-colors, print, pseudo-elements.
* **Fix:** design/tokens.json (W3C DTCG) -> node build -> /css/tokens.css (Tier1 primitives, Tier2 semantics, dark default + light + prefers-contrast + forced-colors), /js/tokens.js (for canvas & Mapbox paint), tokens.d.ts, styleguide data. `@layer reset, tokens, base, components, utilities, page;` ONE hashed /css/app.<hash>.css linked with a normal <link> (no preload/onload swap). Replace site-nav.css, 26 inline <style> blocks and index.html:60-253. In React: codemod style consts (33 objects already extracted in style_consts.json) into CSS Modules / gb-* classes, keep inline style only for dynamic --custom-props.
* **Acceptance test:** `grep -RE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/ *.html` outside tokens.css returns 0; 0 <style> blocks and 0 style="" in HTML; stylelint + ESLint (forbid style prop) pass; app.css <= 4 KB brotli; CSP style-src 'self' enforced in Report-Only shows 0 violations for HTML pages.
* **Moves:** Visual design B+/B- -> A; Fit&finish +1 grade; enables CSP without unsafe-inline for styles (X3)
* **Depends on:** none
* **Audit refs:** A1, A4, X3, N1

### app-design-04 — Consolidate colour: one gold/Union/Confederate/neutral ramp, accessible text variants, light + forced-colors themes
* **Severity / effort:** high / M
* **Evidence:** 30 blue-ish hexes, 31 red-ish, 17 gold-ish, 27 greys, 28 near-blacks. Two golds for one role: #c8a84a (46 uses, app) vs #c9a24b (41 uses, pages), dE2000 2.9. Union blue spelled #3a6bc4 (bundle 96427), #4477cc (search.html :root; 97924; 98876), #3355cc (99413), #5588dd (103530); Confederate #c43a3a (96428), #cc5544, #cc4433, #dd5544 (103575), #cc4444 (98876). Legend vs canvas disposition colours differ for 9/11 postures (99384-99412 vs 96306-96318). education.html uses a separate blue palette (--bg:#0a3a6a).
* **Root cause:** No shared palette; each surface picked its own literals.
* **Fix:** Adopt the validated ramp in section 3.2 (ink-1000..600, slate-100..600, brass-200..800, union-200/300/500/700, conf-200/300/500/700, sage/amber/coral/sky) and semantic tokens (--bg, --surface-1..3, --text-1..4, --accent*, --union/--union-text, --conf/--conf-text, --border-control ...). Keep #3a6bc4/#c43a3a as side identity (already CVD-safe, dE2000 41.7/42.3/51.0/65.8). Run map_tokens.py codemod: 81/180 opaque colours auto-map (dE2000<6, 64% of uses); 99 need role review. Light theme + forced-colors + prefers-contrast per section 3.2/12.
* **Acceptance test:** Colour literal inventory <= 45 distinct values (tokens only); contrast script over all text/background token pairs: text>=4.5, UI/graphics>=3; axe color-contrast 0 violations on all 27 pages in dark, light and forced-colors.
* **Moves:** Visual design +1 grade; Accessibility (contrast) fixed; Lighthouse A11y 90 -> >=98
* **Depends on:** app-design-03
* **Audit refs:** A1

### app-design-05 — Contrast remediation: 33% of app text declarations fail 4.5:1; translucent panels; print colours
* **Severity / effort:** high / M
* **Evidence:** Bundle text `color` declarations (96200-113377): #444 x4 = 2.02:1, #555 x14 = 2.64, #666 x32 = 3.43, #777 x7 = 4.40, #8b6914 x8 = 3.87 (as text: day label tc.dayLabel, splash subtitle Va.subtitle) => 86/260 declarations, 17/57 colours fail. Examples: Va.skip #444 (101670), tn.tickInfo #444 (103853), tc.tickLabel #666. Sub-pages: #6f7686 (site-nav.css:96,129) = 4.32:1 on #0a0a14 / 4.08:1 on #12121e. Panels at alpha .80-.86 (Sd.wrap, tn.miniLegend, tn.minimapBox): #8a93a8 falls to 4.49:1 over white imagery. report.html:35 `#report .key-action{color:#ccc}` = 1.61:1 in print.
* **Root cause:** Greys chosen ad hoc for dark UI; no text tier floor; translucency not accounted for over bright satellite tiles.
* **Fix:** Text tiers only: --text-1 (#e8e6df) / --text-2 (#b9bac6) / --text-3 (#8a93a8, >=4.93 on surfaces 0-3) / --text-4 (#7b849a, placeholder/disabled, surfaces<=2 only). #444/#555/#666/#777 text -> --text-3 (or -4). #8b6914 only for borders/fills. Overlay panels alpha >= .92 + blur(10px) (text-3 stays >=5.6:1 over white). Print colours per section 12.2.
* **Acceptance test:** `contrast.py` on the built CSS/JS: 0 text declarations < 4.5:1 (non-disabled) and 0 UI-boundary colours < 3:1; axe `color-contrast` 0; panel contrast measured over a white test tile >= 4.5.
* **Moves:** Lighthouse A11y +8 pts; Accessibility C+/C -> B+ (contrast portion)
* **Depends on:** app-design-04
* **Audit refs:** A1, D2

### app-design-06 — C8 root cause: chip has no background/font and a global `button.filter-chip{color:inherit}` outranks it
* **Severity / effort:** critical / S
* **Evidence:** search.html:30 `.filter-chip { padding:5px 12px; border-radius:14px; border:1px solid var(--line); color:var(--muted); cursor:pointer; user-select:none }` (no background, no font); chips became <button> at 56-59; site-nav.css:143-147 `button.filter-chip {font:inherit; color:inherit; appearance:none; ...}` (specificity 0,1,1 > 0,1,0) => inherited ink #e8e6df on UA ButtonFace #efefef = 1.10:1; .filter-chip.active (0,2,0) wins so only the active chip is legible. Same trap for button.mode-btn/.play-btn/.toggle-btn/.day-tab/.btn/.match.
* **Root cause:** Component styles duplicated per page, plus a global specificity-raising reset in a different file.
* **Fix:** Immediate (S): add `background:transparent; font:inherit; font-size:12px` to .filter-chip and set color via `.filter-chip:not(.active){color:var(--muted)}`. Systemic: put the reset in `@layer reset`, define one `.gb-chip` (section 5.3) with explicit background/colour/font, use it for Search filters, Historian suggestions, Compare toggles, Camera modes.
* **Acceptance test:** Computed contrast of every unselected chip on search.html >= 4.5:1 (was 1.10); `grep -c 'button\.filter-chip' site-nav.css` = 0; all four chip variants render identically from `.gb-chip`.
* **Moves:** C8 closed; Lighthouse A11y color-contrast audit passes on /search
* **Depends on:** none
* **Audit refs:** C8, A1

### app-design-07 — Typography: load the fonts the code asks for (Spectral, self-hosted), 12 px floor, one ramp, tabular numerals
* **Severity / effort:** high / M
* **Evidence:** 'Spectral' x14 and 'Cormorant Garamond' x4 in the bundle but no @font-face / Google-Fonts link / font file anywhere in the deploy (grep) => all text is Georgia/system sans/monospace. font-family strings: sans-serif x287, Georgia x54, monospace x28, system-ui x14. 165 font-size declarations <12 px (7,8,9,9.5,10,11,11.5 px; bundle 135/271 = 50%); canvas labels bold 8/9/10 px (bundle.pretty.js:96663-96665). 8 different h1 scales across pages. Splash wordmark 52 px + 8 px tracking ALL-CAPS (101618-101620) clips at 375 px. Measured latin woff2 sizes (Google Fonts, 2026-09-29): Spectral 400 21.7 KB, 600 22.9 KB, 700 23.0 KB; Inter var 48.3 KB; Source Serif 4 var 122 KB; Newsreader var 132 KB; Literata var 85.7 KB. Georgia is Microsoft-owned; core-fonts-for-the-web pack never licensed for embedding.
* **Root cause:** Font intent declared in code but never delivered; no type scale or size floor.
* **Fix:** Self-host Spectral 400+700 latin WOFF2 (~45 KB, SIL OFL 1.1 - ship OFL.txt) with `font-display:swap` and a metric-override fallback (@capsize/metrics vs Georgia/Times); system-ui for controls; `.gb-num{font-variant-numeric:tabular-nums}` replaces monospace clocks; ramp --fs-2xs 12 px ... --fs-display clamp; splash and LCP text on fallback stack (no font gating); preload only spectral-700 on sub-pages; CSP font-src 'self' (drop fonts.googleapis/gstatic from netlify.toml:19). Drop Cormorant. Canvas/map labels >=12 px.
* **Acceptance test:** 0 font-size declarations < 12 px (stylelint) and canvas label size >= 12; Lighthouse shows 0 CLS attributable to fonts (trace); splash h1 is LCP and paints without a webfont; total font bytes <= 50 KB; OFL.txt served; splash wordmark fully visible at 320x568.
* **Moves:** Accessibility (A4/D2) fixed; Visual design +; CLS/LCP protected
* **Depends on:** app-design-03
* **Audit refs:** A4, D2, H3

### app-design-08 — Spacing / radius / elevation / motion / breakpoint tokens and a reviewed codemod
* **Severity / effort:** medium / M
* **Evidence:** 667 of 1,153 spacing declarations on a 4 px grid, 486 (42%) off-grid: 10px x122, 6px x96, 14px x76, 3px x28, 7px x26, 18px x25, 5px x22; site-nav.css 65% off-grid. Radii: 15 values (3/4/6/8 px all 'small control'). Durations: 20 values (10 ms ... 5000 ms). Breakpoints: one @media (site-nav.css:52) + JS thresholds <500 (98111, 96604), <560 (102708), <=860 (110615).
* **Root cause:** No spacing/radius/motion scale; layout logic in JS.
* **Fix:** Scale per section 3.4 (--sp-2xs..4xl, --r-xs/sm/md/pill, --elev-1..4, --dur-fast/base/slow/emph, easings, --hit-min 24, --hit-touch 44, --control-sm/md/lg + coarse override) and the migration table; container queries on .gb-app; codemod in three reviewed passes (colour -> type -> spacing) with map-masked screenshot baselines.
* **Acceptance test:** Spacing/radius/duration inventories: 100% of declarations resolve to tokens (stylelint); 0 JS innerWidth breakpoint reads; screenshot diff on baseline pages <= agreed threshold after pass 3.
* **Moves:** Fit&finish +; maintainability
* **Depends on:** app-design-03
* **Audit refs:** [] (new)

### app-design-09 — z-index scale, overlay root and reserved zones (27 ad-hoc levels; Help renders behind OOB; 999999 overlay)
* **Severity / effort:** high / M
* **Evidence:** 27 distinct levels: 1,2,3,5,6,8,10,20,30,85,88,92,95,100,150,160,200,300,301,400,500,600,700,800,900,1000,999999. Help & Bookmarks z600 (assets/helpmodal-cfv9t0zh.js `zIndex:600`, bookmarkpanel-c5yt4b5k.js) < Ancestor 700 (101295), Soldier's Eye 800 (102072), OOB 900 (102441), Roster 900 (102706), Layers/Distance 1000 (112514, 112863) => pressing ? with OOB open shows Help behind it. Magic pixel offsets guess the timeline height: legend bottom:160 (99578), minimap 130 (99835), event card 120 (98662), NPS launch 90 (100475), sound 58 (111788); estimated timeline height ~120-130 px so sound/NPS buttons sit inside the bar. #root has contain:strict (index.html:66-70).
* **Root cause:** No stacking model; components positioned against guessed neighbours; overlays nested in stacking contexts.
* **Fix:** Legal scale --z-map 0, -map-overlay 10, -hud 100, -dock 200, -sheet 300, -menu 400, -tooltip 500, -toast 600, -modal 700, -tour 800, -splash 900, -skip 1000; #overlay-root portal for all overlays; no z-index/transform/filter/contain on component roots; stylelint allow-list; reserved zones via --toolbar-h/--transport-h (delete magic bottoms); modal open => inert on .gb-app.
* **Acceptance test:** `[...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).zIndex!=='auto')` all in the scale; open every modal pair: exactly one visible and topmost (elementFromPoint at centre); no docked panel rect intersects toolbar/transport (Playwright over 6 viewports).
* **Moves:** H1/H4 collisions closed; Fit&finish; Reliability of UI layering
* **Depends on:** app-design-01
* **Audit refs:** H1, H4, C2

### app-design-10 — Panel management: one panel per dock, LayerStack Esc chain, jump hygiene, toast-class event card, persisted HUD prefs
* **Severity / effort:** high / L
* **Evidence:** Top-right slot claimed by 7 elements (story Cr top60/right16 z92; toasts eh top60/right16 z200; tour pip top58/right16 z400; Layers top60/right10 z1000; Mapbox nav; trails btn; Extra Features top60/right14 z999999); top-left by 5 (Sd, ji, zr, nh, tour panel). Esc handler ignores INPUT targets (bundle.pretty.js:112967) and its cascade (113033-113050) omits Layers/Distance/legend/story/event card; story dismissed-set resets on remount (98261); event card is a permanent bottom:120 panel (98660). No reset on jump (H4).
* **Root cause:** Each panel owns its position and visibility; no exclusivity or layer stack.
* **Fix:** Rules P1-P8 (section 6.4): left dock {Unit, Search, Filter, Roster, OOB, Ancestor}, right dock {Story, Layers, Tour, Historian drawer, Bookmarks}, replace-not-stack with back-stack breadcrumb; LayerStack Esc order modal>menu>tooltip>toast>input text>right dock>left dock>selection; jump hygiene on |delta tick|>3/day jump/bookmark/deep link (close story+event card, clear toasts, fly camera); event card -> transient; persist HUD/dock prefs in gb.v2.prefs.
* **Acceptance test:** Playwright: all 13x13 panel pairs at 6 viewports => <=1 panel per dock, no intersections; Esc closes topmost each time incl. caret in Search; after day jump 0 toasts/story/event card; prefs survive reload.
* **Moves:** H1/H2/H4 closed; Usability desktop B- -> A-
* **Depends on:** app-design-09, app-design-12
* **Audit refs:** H1, H2, H4

### app-design-11 — SVG icon system replacing 108 emoji/letter glyph uses (44 distinct characters)
* **Severity / effort:** high / M
* **Evidence:** Toolbar = letters S F L B ? + emoji (bundle.pretty.js:113146-113240); Search duplicated (S 113146 and 🔍 113213 both call toggleSearchPanel); 🗺 means Map Layers (113193), Virtual Walkthrough (113137) and Map Layers/Mini Map in the mobile sheet (103439, 103474); 🖥/📱 dark-on-dark (102773, 102795); ✕ x19 with no labels; sprite site-nav.js:71-91 has 19 symbols, `sabers` unused, book/pulse/users each used 3x for different features; React app never uses the sprite; icon-only buttons labelled only via title= (60) and by index.html:398-440 text-matching patch.
* **Root cause:** No icon system in the React app; sprite exists only for static pages.
* **Fix:** Section 4: 24x24, 1.75 stroke, currentColor; Lucide (ISC + Feather MIT notices in /icons/LICENSE-lucide.txt) for standard icons + custom historic set (infantry, cavalry, artillery, legend, commander-KIA, wounded, captured); build-time sprite inlined in static HTML, generated <Icon> in React; distinct icon per Explore item; full glyph->icon mapping table; aria-hidden decorative, aria-label + tooltip for icon-only.
* **Acceptance test:** Emoji/pictograph regex over src/ and HTML = 0 (except tour/story content); axe button-name 0; every Explore menu item has a unique icon; icons render identically Win/macOS/Android (screenshot).
* **Moves:** H6 closed; Visual design +; A5 fixed
* **Depends on:** app-design-03
* **Audit refs:** H6, A5, D2

### app-design-12 — Toolbar/header redesign: grouped, labelled, 40/44 px, roving tabindex, command palette; add missing Order of Battle
* **Severity / effort:** high / L
* **Evidence:** Desktop toolbar height 48 (tc.toolbar 113308); 13 icon buttons with `padding:4px 10px; fontSize:12; fontFamily:monospace` (113356) ~28x26 px; header holds 'Toggle Units', 'Download Website Tutorial PDF' (12 px bold gold), '🗺 Virtual Walkthrough' (113112-113137); no Order of Battle on desktop (exists only in mobile tool list 103404); no landmarks/h1.
* **Root cause:** Toolbar grown by accretion; no grouping or IA.
* **Fix:** 56 px header: [brand + date/time chip] ... [Search][Filter][Layers] | [Tools v] | [Ask the Historian][Explore v] | [?]; icon buttons 40 (44 coarse) with labels >=1280; Tools menu holds Roster, OOB, Monuments, Soldier's Eye, Ancestor, Distance, Bookmarks, NPS Tour, Walkthrough; PDF -> Help; Toggle Units -> Layers switch; role=toolbar with roving tabindex; command palette on / and Ctrl/Cmd+K.
* **Acceptance test:** All header controls >=40x40 (>=44 coarse); each has aria-label + tooltip; Tab order = one stop into toolbar, arrows move; OOB reachable from desktop header; axe 0 issues; screenshot review at 1024/1280/1440.
* **Moves:** H6/D2/D4/A3 closed; Usability desktop B- -> A-
* **Depends on:** app-design-11, app-design-09
* **Audit refs:** H6, D2, D4, A3

### app-design-13 — H1: integrate Ask the Historian + Extra Features into the header/Tools sheet; delete the floating overlay and 6 injected scripts
* **Severity / effort:** high / M
* **Evidence:** index.html:176-237 CSS (`position:fixed; top:60px; right:14px; z-index:999999; opacity:0; visibility:hidden`, force-reveal animation 5 s at 202); markup 285-292; injected scripts 294-714 (~420 lines): populate (294-353), onboarding banner via body-wide text scan every 200 ms x25 (355-396), title-patching + #seo-content removal (398-440), reveal by regex on clicked ancestors' textContent (441-519), collision-mover across 6 corners re-measuring every interactive element per click (521-606), monuments overlay (608-714). Overlay paints above every React modal (z 999999 vs <=1000). site-nav.css:41,48 infinite glow animation; :52 collapses pill to icon-only on phones.
* **Root cause:** Map SPA has no source and no global header, so the entry points were bolted on from outside the React tree.
* **Fix:** Section 7: desktop = Ask pill + Explore menu in the header right cluster (same component as sub-page header); compact = `Ask` + `Tools` in top bar and two cards at the top of the Tools sheet (Ask, Explore all 20); mid = icon-only with labels for Ask/Explore; landscape = right-side sheet; remove eye toggle; keys A / E; contextual 'Ask about this' on Unit/Story panels -> /historian.html?q=&unit=&tick=; one-time coach mark; glow = 2 pulses then stop. Interim: Track 0b bundle patch (toolbarRight at 113146/113355; tn.topActions 103149; sheet 103390) or, only briefly, CSS-only Track 0a. Delete index.html 168-253 (CSS), 285-353 and 355-606 (scripts); keep 608-714 until the monuments layer replaces it.
* **Acceptance test:** `#extra-features` absent; Ask/Explore bounding rect identical (+-1 px) across 30 random states and never intersect another interactive element (200 random panel states); no z-index >1000; scrim covers header while a modal is open; index.html inline JS shrinks >=25 KB; keyboard: Tab -> Ask -> Explore; Esc returns focus.
* **Moves:** H1 closed; Fit&finish desktop C+ -> A-, mobile D+ -> B+
* **Depends on:** app-design-09, app-design-12, app-design-01
* **Audit refs:** H1, H6, H8

### app-design-14 — H3: splash & onboarding redesign - no forced React splash, auto layout, persisted prefs, welcome card, coach-mark tour
* **Severity / effort:** high / L
* **Evidence:** tO (bundle.pretty.js:101472-101592): waits for placements, +800 ms (101484), 3,500 ms fake fast-forward (`eO = 3500` 101471) doing yn.setState({currentTick}) every rAF (101492-101497), 0.6 s fade (101503, 101520): ~4.9 s forced; 'Skip intro ›' is `<div onClick>` 11 px #444 (101581, 101670); wordmark 52 px/8 px tracking (101618-101620). dO chooser (102752-102820) `div onClick` cards, emoji icons, result kept only in React state Zn (112949) => shown every visit. bO (111856-112021) shows 'Power User keyboard shortcuts' on touch (111814) and tour steps setTick behind a modal; gtbg_onboarded (113068) vs unused store flag onboardingComplete (9441-9444); index.html:99 boot-fade-in starts at opacity 0.
* **Root cause:** Onboarding built as three blocking screens with state scattered across React state, two localStorage keys and injected scripts.
* **Fix:** Section 8: HTML boot splash only (no artificial delay, staged determinate progress, >4 s 'still loading', >12 s error); fast-forward film becomes opt-in on the real map (skipped for reduced-motion/Save-Data); layout chooser deleted (resolveLayout via matchMedia, live); single versioned key gb.v2.prefs {layout, theme, motion, onboarding, hud, resume} read synchronously, try/catch, legacy keys migrated; welcome card (first visit); 5 non-modal coach marks with Back/Next/Skip, Esc=skip, resume in Help; touch vs fine-pointer copy; remove entrance fade on LCP element; credit line moved to About.
* **Acceptance test:** Fast-4G first visit: Play works <=1.5 s after data-ready; 0 full-screen modals before map usable; 2nd visit: no chooser/card/tour, same layout, gb.v2.prefs present; splash wordmark fully visible at 320x568; skip/continue are <button> >=44 px, >=4.5:1; touch users never see keyboard-shortcut copy; live resize flips layout.
* **Moves:** H3 closed; FCP/LCP no longer include a 4.9 s React splash; INP contention at startup reduced; Usability D+ -> B+ (mobile)
* **Depends on:** app-design-01, app-design-03, C6 (no reload after splash), C3/C4 clock for tour copy
* **Audit refs:** H3, C6, H10

### app-design-15 — Timeline/transport redesign + accessible slider (no thumb styles, unlabeled, 8 px markers, #eee speed pills, credit in row)
* **Severity / effort:** high / L
* **Evidence:** Scrub `<input type=range min=0 max=100 step=.01>` with inline appearance:none/height:4px/transparent background (Po.scrubInput; IO 112202+); grep for ::-webkit-slider-thumb/::-moz-range-thumb across deploy = 0; no aria-label (A2); event markers are 8x8 `<div onClick title>` (112275-112296) coloured #0044cc (2.5:1) / #cc0000; inactive speed buttons `background:#eee` on a dark bar (112348); day buttons pastel #e8d5a3/#d3e8d3/#d3d3e8 (112187-112191); mobile scrubber is a `<div onTouchStart/Move>` (103179-103184) inside `touch-action:none` root (103705); speed label '1x' but real rate = 500 ms/tick => 2 ticks/s = 10 sim-min per real second (Ed 96965, cF 96948, 96982).
* **Root cause:** Custom controls built from divs/inline styles without the native-control semantics or CSS hooks.
* **Fix:** Section 5.12: native range in ticks (1-675), track 6 px/hit 44 px, thumb 20 px/hit 44 px with ring, aria-label 'Battle time' + aria-valuetext ('July 2, 3:20 PM - step 312 of 675', from the single canonical clock), arrows +-1, Shift/PgUp/PgDn +-12, Home/End, 1/2/3, [ ] prev/next event; 24 px marker lane with <button> markers (shape+colour), pointer-events with setPointerCapture (mouse/touch/pen), preview tooltip; day segments from tokens; speed as segmented radiogroup with true rates ('x2 - 20 min/s'); credit removed.
* **Acceptance test:** axe aria-input-field-name 0; thumb hit area >=44x44 (coarse); Playwright drag 0->100% monotonic; keyboard-only user reaches every event marker; scrubbing keeps INP <= 200 ms in lab (rAF-throttled commits, panels don't re-render per tick).
* **Moves:** A2/A3/H9/C1 closed; INP (scrub) protected; Accessibility +
* **Depends on:** app-design-03, app-design-01
* **Audit refs:** A2, A3, C1, H9, D2

### app-design-16 — Modal/dialog system with focus management; fix z-order inversion and blank lazy-load (Help 1-2 s)
* **Severity / effort:** high / M
* **Evidence:** Help is React.lazy (112469-112470) with `Suspense fallback:null` (113276-113284) => nothing for 1-2 s (D1); no focus trap/return/aria-modal anywhere (0 aria/role in app UI); help/bookmarks overlays have a backdrop-click + x close but no trap/return (assets/helpmodal-cfv9t0zh.js); Bookmarks falls back to `window.prompt('Copy this link:',url)`; z inversion see app-design-09.
* **Root cause:** Overlays are plain divs; no dialog primitive.
* **Fix:** Native <dialog>.showModal() (top layer, inert background, Esc, ::backdrop) or equivalent; aria-labelledby; initial focus; focus return; one modal at a time; skeleton within 100 ms for lazy chunks; inline read-only copy field instead of window.prompt.
* **Acceptance test:** axe dialog rules 0; Tab cycles inside; Esc closes; focus returns to opener; only one modal open (opening another replaces); Help skeleton visible <=100 ms, content <=300 ms on cached chunk; no window.prompt in bundle.
* **Moves:** A6/D1 closed; Accessibility +
* **Depends on:** app-design-09
* **Audit refs:** A6, D1, H2

### app-design-17 — One toast system (today two) with live region, flood control, and the missing slideIn keyframe
* **Severity / effort:** medium / M
* **Evidence:** qF (bundle.pretty.js:99888) container eh top60/right16 z200 (100008), setTimeout 4500 (99909/99915) - dismisses, animation `slideIn 0.2s ease` (100024) references a @keyframes that exists nowhere in deployed CSS/JS; nO (101679) container nh top58/left60 z400 (101775), fade 1.2 s / remove 3 s, `opacity: z.phase === "dying" ? 1 : (z.phase === "fading", 0)` (101731) zeroes opacity instantly; colours #ff4444/#ff9944/#aa88ff/#88aacc (99971-99982). Audit observed toasts persisting after a jump (H4) - code shows timeouts, so persistence is likely timer throttling in backgrounded/emulated tabs or many toasts fired by a large tick delta; reproduce before asserting.
* **Root cause:** Two independent toast implementations, no jump suppression, no live region, dead keyframe.
* **Fix:** Section 5.10: one <ToastRegion role=status aria-live=polite> at --z-toast, bottom-centre (compact, above transport) / bottom-left (desktop), max 3, dedupe, 5 s (errors 8 s), pause on hover/focus, Esc dismisses newest, suppress+clear on |delta tick|>3; icon+label instead of colour-only; define gb-slide-in in tokens.css; reduced-motion fade.
* **Acceptance test:** After day jump 0 toasts; burst of 6 events leaves <=3; toast never overlaps a docked panel/transport; entrance animation runs (getAnimations) and is off under reduced-motion; screen reader announces <=1 message/2 s.
* **Moves:** H4 closed; Fit&finish +
* **Depends on:** app-design-09, app-design-10
* **Audit refs:** H4

### app-design-18 — Custom accessible tooltip replacing 60 title= attributes (invisible on touch, not keyboard-triggered)
* **Severity / effort:** medium / S
* **Evidence:** 60 `title:` props in app UI as the only labels for icon-only controls (e.g. Vs() title at 113288); hover popups fF/Ar.popup (97063, 97157: width 260, z500) and monument tooltip dx.tooltip (100965: width 280, z600) with different styles; index.html:398-440 patches title/aria-label by matching letter glyphs.
* **Root cause:** No tooltip primitive; title used as accessible name.
* **Fix:** `.gb-tip` component: hover 500 ms / focus immediate, role=tooltip + aria-describedby, --z-tooltip, hoverable (WCAG 1.4.13), Esc dismiss, edge-flip; touch shows visible labels in the Tools sheet; replace all title= and the unit/monument hover popups with the same component.
* **Acceptance test:** 0 `title:` props on interactive elements; every icon-only control has aria-label AND tooltip; tooltip reachable by keyboard focus; hoverable without disappearing.
* **Moves:** A5/D2 closed
* **Depends on:** app-design-11
* **Audit refs:** A5, D2

### app-design-19 — Cartography: one symbology spec (shape=branch, line style=posture, colour=side, bar=strength) driving renderer AND legend
* **Severity / effort:** high / L
* **Evidence:** Legend NF/UF/jF (bundle.pretty.js:99384-99420) vs canvas Lp/sA/aA (96306-96318, 96427-96428): 9/11 posture colours differ (Reserve #668844 vs #226622; Dismounted Cavalry legend #228855 darker than Mounted while canvas #88cc88 lighter ...); legend note 'Dot outline = side color / Dot fill = disposition color' (99519) but canvas draws a side-filled rect + 3.5 px posture dot (96596-96640); 'Size' legend shows circles r=5/7/9 (99559) while units are strength-wide rectangles; onboarding copy 'blue dots / yellow dots' (111823-111831). CVD dE2000 (deutan): Charging vs Retreat 7.8, Retreat vs Deployed Artillery 7.8, legend LoB vs Skirmish blue 8.1; tritan Deployed vs Limbered Artillery 7.9. Side pair itself is safe (41.7/42.3/51.0/65.8).
* **Root cause:** Legend, map, mobile mini-legend and tour copy each hard-code their own colours; posture encoded by 11 hues.
* **Fix:** data/symbology.json (section 9.2) consumed by the renderer, the legend (same draw function), Help, tour copy and print; fixed frame 24x16 (0.75x@z13 - 1.15x@z17), APP-6-style inner glyphs (x / slash / dot), posture via frame style + mark (solid/dashed/hollow/column, chevrons, tail, muzzle ticks, tent), 3 px strength bar (fraction of initial), light outline for imagery contrast, upright icon + facing arrow, footprint mode >= z16.5 with true frontage (rule of thumb to be validated).
* **Acceptance test:** Legend/map parity: per-posture glyph pixel-diff <= 1% (Playwright fixture tick); greyscale + protan/deutan/tritan simulations: every posture and both sides distinguishable by shape alone; tour/Help text generated from the same JSON.
* **Moves:** Visual design & cartography A; Usability/learnability +; fixes D-2/D-3
* **Depends on:** app-design-03, app-design-04
* **Audit refs:** D3, H6

### app-design-20 — Cartography: aggregate instead of displace, priority labels >=12 px, DPR-aware canvas, screen-space picking, data-driven 'engaged'
* **Severity / effort:** high / L
* **Evidence:** Relaxation displaces symbols (8 passes, 12 px spacing) bundle.pretty.js:96558-96581 with 0.5 px leaders (96582-96594); width = strength/4 clamped 10-120 px constant across zoom (lA 96433-96437); `devicePixelRatio` occurs 0 times in the app UI region, canvas sized from getBoundingClientRect (96510-96512) => blurry on 2x/3x; labels bold 8/9/10 px on 72% black plates (96653-96682); engaged = opposing units within 40 screen px (X4 96480-96505, 96499) + infinite `|sin(t/300)|` glow (96615); pick radius 0.002 deg regardless of zoom/input (97336, 103016, 103087).
* **Root cause:** Screen-space heuristics used where world-space or data-driven logic is needed.
* **Fix:** Zoom tiers: <=12.5 corps/division, 12.5-14.5 brigades, 14.5-16.5 regiments, >=16.5 footprints (parent ids exist in OOB data); never displace; label rank = 1000*selected + 500*engaged + 100*echelon + strength/100, anchors top/right/left/bottom on a 64 px hash, cap ~60, halo 1.5-2 px instead of plates, min 12 px; canvas backing store = css*dpr; picking radius 14/22 px via screen distance; engaged from data flag or metres; one 700 ms pulse then static.
* **Acceptance test:** At z11-13 symbol anchor equals project(lng,lat) +-0.5 px for all units; label bbox overlaps = 0; min label 12 px; <=60 labels; on 2x/3x emulation canvas.width === cssWidth*dpr; click within 22 px selects nearest; reduced-motion => no pulse.
* **Moves:** D3 closed; crispness on all phones; map honesty (positions not displaced)
* **Depends on:** app-design-19
* **Audit refs:** D3

### app-design-21 — Cartography renderer migration: GeoJSON symbol layers (fix SDF), single monuments layer, remove per-frame React loops
* **Severity / effort:** medium / XL
* **Evidence:** Units drawn per frame on canvas with project()+measureText for 467 units; KF monuments: rAF loop calls map.project and `setState` with a new object every frame even when hidden (bundle.pretty.js:100850-100868), 20 emoji DOM markers z160; second overlay index.html:608-714 projected once from default view (drifts on pan/zoom) - both wired to the same button; unit-rendering-reference.html PoC (symbol layer + collision + halo) calls `map.addImage('unit-arrow', ...)` without {sdf:true} so icon-color cannot recolour it (Mapbox: icon-color works only for SDF images); cursor glow iO (101817-101875) does setState on every mousemove.
* **Root cause:** Hand-rolled canvas/DOM overlays instead of Mapbox layers; no source to iterate.
* **Fix:** Option B (section 9.10): SDF frame (side colour) + SDF branch glyph layers, icon-image = concat('frame-', posture), symbol-sort-key priority, feature-state hover/selected, queryRenderedFeatures picking, line-gradient trails, one clustered monuments symbol layer; delete KF loop, index.html monuments script, cursor glow (or transform-via-ref). Option A (canvas patch) first if source is unavailable.
* **Acceptance test:** React Profiler: 0 commits per frame while idle/playing due to overlays; frame time at 8x <= 16 ms p95 on a mid-range phone profile; hover/select via feature-state; monuments = 1 layer; rAF loops in overlays = 0.
* **Moves:** INP/main-thread relief; Fit&finish; map performance
* **Depends on:** app-design-19, app-design-20, N1
* **Audit refs:** P1, P2

### app-design-22 — Cartography overlays from data with a real style (roads/streams/works/farms/locations)
* **Severity / effort:** medium / M
* **Evidence:** Hand-typed GeoJSON x4/b4/w4/S4 in the bundle (bundle.pretty.js:9450-9740); Chambersburg Pike = 5 vertices all at lat 39.8306 (9498-9520), Baltimore Pike all at 39.82 (9484-9497); roads #44bb44 z-lines (9748-9760), rivers #8844cc purple (9773-9780), breastworks #884422 dashed 3 px; labels 9-13 px; Locations toggle draws 10 hard-coded points (112573-112676) while data/terrain.json has 30 key_locations, 8 roads, 8 structures, 4 terrain_features unused by the map.
* **Root cause:** Overlay data duplicated inside JS; styling chosen ad hoc.
* **Fix:** Load data/geo/*.geojson lazily after idle; accuracy pass vs imagery/NPS GIS (verify availability/licence); styles: roads parchment #e4d3a6 with dark casing, streams #5aa9e6 with halo, breastworks tick pattern in side colour, farms icon+label >=z15, 30 locations in 3 tiers (12-14 px), labels >=12 px.
* **Acceptance test:** 0 GeoJSON literals in JS; overlay colour contrast dE>=25 vs sampled imagery (measured, not assumed); all 30 key_locations render; labels >=12 px; roads visually registered at z16 (manual sign-off).
* **Moves:** Visual design/cartography; content consistency
* **Depends on:** app-design-03
* **Audit refs:** D3

### app-design-23 — Day/night styling from computed solar altitude on the single canonical clock (GPU raster props, 300-500 ms)
* **Severity / effort:** medium / M
* **Evidence:** A4 full-screen div with mix-blend-mode:multiply and `transition: background 8s` (bundle.pretty.js:9885-9900, 9895); E4 hour table (9861-9884) keyed to M4 = 5:00 + 5 min x tick (9856-9860) - a third clock beside getTickTime (6:00 day 1 / 4:00 days 2-3) and data labels (5:00). Computed local-mean-solar sunrise 4:34-4:35, sunset 19:31-19:32, civil dawn 4:02, civil dusk 20:04 (tmp-app-design/sun.py), so the first hour of every day renders at twilight (E4: <6 h alpha .25).
* **Root cause:** Tint keyed to an arbitrary clock and hour table, implemented as a DOM overlay.
* **Fix:** alt = solarAltitude(lat,lon,dateUtc(canonical clock)); day = smoothstep((alt+6)/12); set raster-brightness-max/saturation/hue-rotate on the satellite layer (verify layer id via map.getStyle().layers in GL JS 3.24.1); warm golden-hour wash alpha = .14*exp(-((alt-3)^2)/50) via one soft-light div; 300-500 ms transition, instant on drag; night boosts unit outline/halo and shows 'Night - civil dusk 8:04 PM' chip; reduced-motion no transitions. Starting values to be tuned by eye.
* **Acceptance test:** Unit tests: sunrise 4:34-4:35, sunset 19:31-19:32 (+-2 min) for Jul 1-3 1863; first frame of each day daylit; scrubbing across dusk changes brightness in <500 ms; no full-screen mix-blend-mode div (or exactly one documented).
* **Moves:** Cartography polish; removes an 8 s lag and a full-screen composited layer
* **Depends on:** C3/C4 canonical clock, app-design-03
* **Audit refs:** C4

### app-design-24 — Mapbox attribution hidden on mobile and walkthrough maps; add scale bar; keep compass
* **Severity / effort:** high / S
* **Evidence:** `attributionControl: !1` at bundle.pretty.js:102988 (mobile map) and 110777 (walkthrough map); desktop map default (visible). No ScaleControl (0). Mapbox attribution guidance: logo and text attribution must remain visible (may be moved/compact) - https://docs.mapbox.com/help/dive-deeper/attribution/.
* **Root cause:** Attribution removed to save space on small screens.
* **Fix:** Use compact AttributionControl (or customAttribution) on every map, keep the wordmark; add ScaleControl({unit:'imperial'}) with metric toggle above the transport bar; hide zoom buttons on touch but keep the compass.
* **Acceptance test:** Playwright: every page/mode with a Mapbox map shows `.mapboxgl-ctrl-attrib` and the logo; ScaleControl visible on desktop and compact.
* **Moves:** Compliance risk closed; Cartography polish
* **Depends on:** none
* **Audit refs:** [] (new)

### app-design-25 — Relief (hillshade) and optional contours / historic map overlay
* **Severity / effort:** low / M
* **Evidence:** No hillshade/terrain/contour code in the app UI (grep raster-, hillshade = 0); satellite-v9 only (97239, 102983, 110772). Mapbox hillshade example uses raster-dem source `mapbox://mapbox.mapbox-terrain-dem-v1`; maxBounds is small (97244-97247: [-77.36,39.72]-[-77.12,39.91]).
* **Root cause:** Imagery-only base; relief legibility left to satellite shading.
* **Fix:** After first idle add raster-dem source + `hillshade` layer below overlays, exaggeration .25-.4, illumination 315, shadow #0b0f1a, highlight #fff4de; 'Relief' toggle in Layers (off on Save-Data); do NOT enable setTerrain on the main map (canvas uses map.project, elevation-unaware - test first); optional Terrain v2 contours (verify tileset/layer names); optional georeferenced public-domain map overlay with opacity slider (verify rights and accuracy).
* **Acceptance test:** Relief toggle adds <=N tile requests (measure; set budget at implementation) and no LCP regression in Lighthouse; hillshade below overlays; setTerrain not used; toggle persists.
* **Moves:** Visual polish (relief legibility)
* **Depends on:** app-design-24
* **Audit refs:** [] (new)

### app-design-26 — Empty/loading/error states, ErrorBoundary and a boot-failure path (today: infinite splash, white screen on render error)
* **Severity / effort:** high / M
* **Evidence:** sF (bundle.pretty.js:96939-96941) = Promise.all([iF(), rF(), oF(), zp(1)]); iF (96834), rF (96919), oF (96923) have no .catch; AO calls sF without handler (112963); tO waits on `Object.keys(he).length > 5` (101479) => infinite 'Loading battle data...' on any failed fetch. No error boundary in app code (grep 0). `Suspense fallback:null` (113276-113284). Map creation has no WebGL/token failure UI (97235, 97386 `!a2`). Empty states missing: Filter->0 units, Historian low-confidence, dashboard/ledger baselines (S4 'starts at 4 casualties').
* **Root cause:** Happy-path-only implementation.
* **Fix:** Section 11: <StateBlock>, <Skeleton> (dimensions from final content, CLS 0), <ErrorBoundary> at root and per dock/panel, staged boot progress with 4 s/12 s thresholds and Retry, WebGL fallback poster, tile-error toast, offline banner, copy in museum voice, timeouts on every loader.
* **Acceptance test:** Playwright route.abort on /data/oob/* => error state <=12 s with Retry that recovers; block Mapbox tiles => toast and usable UI; WebGL disabled => poster fallback; throw in Unit panel => boundary fallback, map alive; no infinite spinner (each loader times out to an error).
* **Moves:** Reliability (mobile C -> A-, desktop B- -> A); Usability +
* **Depends on:** app-design-03
* **Audit refs:** C7, S2, S4

### app-design-27 — Motion & microinteraction policy: reduced-motion everywhere, remove LCP-blocking entrance fades, ambient loops, cursor glow
* **Severity / effort:** medium / M
* **Evidence:** 0 `prefers-reduced-motion` references in the app UI (6 in static CSS); site-nav.css:12 `body{animation:gtbg-page-in 340ms ease both}` starts at opacity:0 on every sub-page; index.html:99 `boot-fade-in .4s` on the LCP element; site-nav.css:41,48 Historian pin glow infinite 3.4 s; engaged-glow pulse forever (bundle.pretty.js:96615); cursor glow iO (101817-101875) setState per mousemove; animation `slideIn` (100024) has no keyframes.
* **Root cause:** Motion added as decoration without a policy or reduced-motion path.
* **Fix:** Section 10 catalogue (22 rows) with durations from tokens, global reduced-motion rule + JS matchMedia gate (never pass essential:true to flyTo), remove body page-in and boot-fade-in, loops limited to loaders, define gb-slide-in, pulse-once for engaged, cursor glow removed/transform-driven.
* **Acceptance test:** Playwright reducedMotion:'reduce' => document.getAnimations() empty except loaders; Lighthouse trace: first paint on sub-pages contains text (no opacity:0 wait); all animation/transition durations reference tokens.
* **Moves:** A6 closed; FCP/LCP (sub-pages, boot) improved by ~340-400 ms; INP contention reduced
* **Depends on:** app-design-03
* **Audit refs:** A6, P1

### app-design-28 — Theming: light theme, prefers-color-scheme, prefers-contrast, forced-colors, no-flash theme script, density option
* **Severity / effort:** medium / L
* **Evidence:** 0 occurrences of prefers-color-scheme / forced-colors / prefers-contrast / color-scheme across all HTML/CSS/JS (grep); single static `<meta name=theme-color content=#0a0a14>` (index.html:6); html,body overflow hidden + fixed pixel panels prevent reflow at 320 px (index.html:62; Cr.panel width 340).
* **Root cause:** Dark-only, JS-inline styling.
* **Fix:** Section 12.1: Tier-2 token swaps for light/contrast/forced-colors; Settings Theme System/Dark/Light + Density; ~200-byte head script sets data-theme before paint (needs CSP hash); media-specific theme-color metas; reflow at 320 CSS px via compact layout.
* **Acceptance test:** Light/dark/forced-colors screenshots pass axe contrast; theme persists and follows OS live; no theme flash (trace); 400% zoom uses compact layout with no horizontal scroll (chrome).
* **Moves:** Accessibility (forced-colors, contrast pref, zoom) +; Visual design +
* **Depends on:** app-design-03, app-design-04
* **Audit refs:** A1, A6

### app-design-29 — Print stylesheet + designed one-page Battle Report (and print layer for Regiment/Dashboard/Historian)
* **Severity / effort:** medium / M
* **Evidence:** report.html:37-43 print block hides header/#search/#matches/.print-btn/.back only; report.html:35 `#report .key-action{color:#ccc}` = 1.61:1 on white in print; #report h2 gold = 2.40:1; row labels #8a93a8 = 3.08:1; #gtbg-nav / #gtbg-footer not hidden; no @page, no source/URL footer; report shows raw ids `r.parent_corps_id + ' / ' + r.parent_brigade_id` (report.html:101; regiment.html:199) e.g. 'U-I / U-I-1-1'; no print CSS on regiment/dashboard/historian/documentary.
* **Root cause:** Print treated as an afterthought on one page.
* **Fix:** Section 12.2 shared @layer print + report anatomy (names not ids, side word + hatch band, data table, 'Where they stood' inline SVG trace from placements, key action, footer with URL/date/sources), @page margins, link expansion, break-inside rules; Historian 'Print this conversation'.
* **Acceptance test:** Save-as-PDF of 5 regiments (Letter+A4, background graphics off): one page each, text >=4.5:1 measured on raster, no nav/footer artefacts, side by word+hatch, footer present, no raw ids.
* **Moves:** S1 improved; Fit&finish (print)
* **Depends on:** app-design-03, app-design-07
* **Audit refs:** S1

### app-design-30 — Sub-page harmonisation: templates, static header/footer (CLS), breadcrumbs, one h1 scale, component reuse, privacy/terms/404 parity
* **Severity / effort:** high / L
* **Evidence:** <div id=gtbg-nav-mount> is empty until site-nav.js (end of body, e.g. search.html:203) replaces it at DOMContentLoaded (site-nav.js:161-171, 232-236) => ~47 px block inserted after first paint (likely CLS; verify); privacy/terms/404/embed/unit-rendering-reference load no nav/footer/js/css and privacy/terms/404 have no <main>; 20 pages carry both the nav brand '<- GETTYSBURG' and 'header a.back' '<- Back to the map'; 8 h1 scales and 3 h1 colours; education.html separate blue palette; 11 gold-primary button definitions with 7 paddings/3 radii; 34 button/chip/tab-like base rules with 22 paddings.
* **Root cause:** Pages authored independently with copy-pasted CSS; header injected by JS.
* **Fix:** Section 13.1: four templates on app.css; header/footer emitted in static HTML (or reserved height) with site-nav.js only for behaviour, deferred; breadcrumb + BreadcrumbList JSON-LD replaces duplicate back link; h1 --fs-2xl/--accent-hi; education folds into default with density option (owner decision Q-2); privacy/terms/404 adopt Content template; reuse map (.gb-btn/.gb-chip/.gb-card--row/.gb-bubble/.gb-stat/.gb-panel--inline).
* **Acceptance test:** Sub-page Lighthouse CLS <= 0.02 (header no longer shifts content); 1 back-link pattern; h1 computed size/colour identical across pages; every page has <main>, one h1, nav landmark; visual regression baselines green; app.css is the only stylesheet on all 27 pages.
* **Moves:** S1/S4 improved; Fit&finish +; CLS on sub-pages
* **Depends on:** app-design-03, app-design-06
* **Audit refs:** S1, S4, E3

### app-design-31 — Mobile sub-page items: dashboard chart, compare tabs, targets, min font
* **Severity / effort:** medium / M
* **Evidence:** Dashboard chart fixed 1000 px (audit S4); compare `.toggle-btn {font-size:10px; padding:3px 8px}`; site-nav.css:98 `.gtbg-here` 9.5 px; ~10-12 sub-40 px targets per page (audit).
* **Root cause:** Fixed-size SVG and undersized controls per page.
* **Fix:** Section 13.2: viewBox-fluid chart, one-day-at-a-time segmented control <=480 px, tabs with scroll-snap/wrap, chips at 32/44 px, 12 px minimum, baseline state for ledger.
* **Acceptance test:** No horizontal scroll at 320-480 px on dashboard/compare/living-ledger; all interactive targets >=44x44 (coarse); 0 text <12 px; no clipped tab labels.
* **Moves:** S4 closed; Usability mobile +
* **Depends on:** app-design-03, app-design-30
* **Audit refs:** S4, A3, A4

### app-design-32 — Brand & share assets are placeholders: identical malformed screenshots, flat icons, merged manifest purpose
* **Severity / effort:** high / M
* **Evidence:** screenshots/day1.png and day3.png md5 3f6646c99f3416a1aa35fea67bed21c5 (identical), 17,585 B for 1280x720; IHDR colour-type 2 (RGB) but decompressed stream 3,687,120 B = 5121 B/row (RGBA-sized) so Pillow raises 'unrecognized data stream'; sampled decode ~80 colours, dark gradient from #0a0a14. Used as og:image/twitter:image on all pages (index.html:21,25) and manifest screenshots. icons/icon-512.png has 4 distinct colours (#0a0a14,#c9a24b,#9a7a33,transparent), aliased, transparent corners; manifest single entry `purpose:"any maskable"`; only favicon.ico 32 px; no SVG favicon; title 'Animated' vs domain 'interactive' (E2).
* **Root cause:** Assets generated programmatically as stand-ins and never replaced.
* **Fix:** Section 13.3: real captures (3 moments, 1280x720 + narrow set) for manifest; designed 1200x630 OG cards per page family (Spectral title, gold rule, map crop, <=100 KB) with og:image:width/height/alt; SVG master + favicon.svg (dark-mode aware) + apple-touch 180 opaque + separate any/maskable 192/512 (maskable safe zone) + monochrome; settle product name once.
* **Acceptance test:** `file` reports valid decodable PNG/WebP for every image; day1/day3 differ; social debuggers (Facebook/Twitter/LinkedIn) render a real card; maskable.app preview shows no clipping; Lighthouse installable manifest shows real screenshots.
* **Moves:** Visual/brand B+/B- -> A; share/PWA polish; supports T1 (discovery)
* **Depends on:** none
* **Audit refs:** T1, E1, E2

### app-design-33 — Unit/Story/Event panel content design: reading typography, fluid widths, contextual 'Ask about this'
* **Severity / effort:** low / M
* **Evidence:** Fixed pixel panels: ji.panel width 280 (bottom:150 right:16 only when innerWidth<500 evaluated once, 98108-98118), Cr.panel 340 (98418), Vc.panel 460 (98660), ar.panel 440; body text in sans 12 px; story script long-form in Cr.script with no measure limit; unit id shown as monospace 10 px #666.
* **Root cause:** Panels sized in px; no reading style for narrative.
* **Fix:** Panel width clamp(320px,26vw,400px); story body Spectral 16/1.65, max-inline-size 62ch, read-time chip and progress bar kept; unit header serif title, side swatch + word, posture word, strength n/initial, commander; footer actions 'Ask the Historian about this...', 'Copy link', 'Pin'; ids hidden behind 'Details'.
* **Acceptance test:** Panels fit at 320/768/1024 without overlap; narrative line length 55-70 ch; all text >=12 px and >=4.5:1; 'Ask about this' deep-links with unit+tick.
* **Moves:** Visual/usability polish
* **Depends on:** app-design-10, app-design-13
* **Audit refs:** H8

### app-design-34 — Design governance: lint rules, Playwright viewport/theme matrix, axe on 27 pages, living styleguide, budgets
* **Severity / effort:** high / L
* **Evidence:** No tests, lint, style guide or budgets exist in the deploy/source zips (source zip is the built output + netlify.toml). Regressions found here (C8, z-index inversions, dead keyframe, unused sprite symbol, unwired onboardingComplete) are the class a linter/test would catch.
* **Root cause:** No automated design QA; solo maintainer; no source repo (N1).
* **Fix:** Section 14.1: stylelint (no hex outside tokens, font-size floor, z-index allow-list, specificity cap), ESLint (forbid style prop/zIndex/emoji/div-onClick via jsx-a11y), generated /styleguide.html (noindex) incl. symbology sheet, Playwright matrix (10 viewports x dark/light/forced-colors x key states) asserting overflow/overlap/targets/axe/z-order/reduced-motion + map-masked screenshots, Lighthouse CI budgets (app.css <=4 KB br, fonts <=50 KB, icons <=10 KB br), PR checklist, design-system version stamp.
* **Acceptance test:** CI red on: a hex literal, a z-index outside the scale, a <12 px font, a div with onClick, axe serious/critical on any of 27 pages, a docked-panel overlap; styleguide page renders every component state and passes axe.
* **Moves:** Keeps A+ durable; Reliability
* **Depends on:** app-design-03
* **Audit refs:** N1

### app-design-35 — Core component library: button, chip, tabs, segmented, card, panel, sheet, menu, switch, badge/kbd (replaces ~34 button-like definitions + inline styles)
* **Severity / effort:** high / L
* **Evidence:** 34 button/chip/tab-like base rules across sub-pages (22 paddings, 10 radii, 7 font sizes); app buttons inline: walkthroughBtn (113324), 'Toggle Units' (113112), PDF link (113132), ko.cardBtn (102881), tr.nextBtn (112155); only 6 app controls declare a 44 px min (101342, 102119, 102486, 102744, 103851, 104003); 75 <button> and 6 div/span onClick in app UI; Layers checkboxes 13 px (112534).
* **Root cause:** No shared components; styles per instance.
* **Fix:** Section 5: .gb-btn (primary/secondary/ghost/danger/icon; sm/md/lg; states default/hover/focus/active/disabled/loading/pressed), .gb-chip, tabs (role=tablist), segmented radiogroup, cards (row/tool/story), panel + sheet, menu/disclosure, switch (44x24) and checkbox (44 px row), badge/kbd/side swatch; ARIA attributes as CSS hooks; coarse-pointer sizing; per-component acceptance criteria in section 5.
* **Acceptance test:** One definition per component (grep of legacy class names = 0); all controls >=24 (fine) / 44 (coarse); focus ring >=3:1; axe 0 issues; every state rendered on /styleguide.html and covered by a screenshot test.
* **Moves:** Fit&finish A; Accessibility (targets/focus) A-; A3 closed
* **Depends on:** app-design-03, app-design-06, app-design-11
* **Audit refs:** A3, A5, D2

### app-design-36 — Search field/combobox: Esc behaviour, natural sort, no autofocus on touch, 16 px input, empty-state suggestions
* **Severity / effort:** medium / M
* **Evidence:** Search panel FF (bundle.pretty.js:98738-98951): `autoFocus: !0` (98819) opens the keyboard over the sheet on touch; Esc ignored while caret in input (112967); results are `div onClick` rows (98876 area); no combobox roles; results sorted as text elsewhere (H5: 102nd..109th before 10th Alabama); empty state only `No units found for "x"` (98947).
* **Root cause:** Custom search built from divs; text sort.
* **Fix:** Section 5.13: role=combobox + listbox + aria-activedescendant, Esc clears then closes, 16 px/44 px input, autofocus only on pointer:fine, results grouped Units/Places/Moments with counts, Intl.Collator numeric natural sort (also Follow-Ancestor list), empty state with suggestions.
* **Acceptance test:** Keyboard-only search->select works; Esc clears then closes; list order '10th Alabama' < '102nd ...'; no keyboard pop on touch open; axe combobox rules 0.
* **Moves:** H2/H5 closed; A11y +
* **Depends on:** app-design-35, app-design-10
* **Audit refs:** H2, H5, A5

### app-design-37 — App-shell semantics: landmarks, h1, skip link, focus management, labels for 613 inline-styled controls
* **Severity / effort:** high / M
* **Evidence:** 0 aria-*/role and 1 tabIndex in app UI (bundle.pretty.js:96200-113377); no <main>/<h1>/<nav> in the shell (only the crawler block index.html:717-741 which is removed once >=3 toolbar labels match, index.html:422-426); layout chooser/tour/help lack focus management; splash progressbar has no value (index.html:746); 19 unlabeled ✕ buttons.
* **Root cause:** UI built as styled divs; semantics never added.
* **Fix:** Section 6.4 P8: <header> toolbar, <nav aria-label=Explore>, <main aria-label='Battle map'> with visually hidden <h1>, <aside> docks with labels, <footer role=region aria-label=Timeline>, skip link 'Skip to map' (--z-skip), focus to panel heading on keyboard open and return on close, aria-label on every icon-only control, live regions for toasts and load stages; jsx-a11y lint.
* **Acceptance test:** axe 0 serious/critical on the map app in all layouts; landmark tree matches spec; Tab reaches skip link first; screen-reader smoke test (NVDA/VoiceOver) can open Search, select a unit and play/pause.
* **Moves:** D2/A5/A6 closed; Lighthouse A11y >=98; Accessibility C+/C -> A-
* **Depends on:** app-design-35, app-design-16
* **Audit refs:** D2, A5, A6


---

## Appendix A — colour migration map (top 70 by use; role rules)

Method: `map_tokens.py` — nearest proposed token by ΔE2000. Of **180 opaque hex colours**, **81 auto-map (ΔE2000 < 6) covering 642 of 1,010 declarations (64 %)**; 99 (36 % of uses) need a *role* decision. **Greys map by role, not by nearest colour:** text `#444/#555/#666/#777` → `--text-3` (or `--text-4` on ≤ surface-2) — they were failing 4.5 : 1; borders `#222/#333/#334/#444` → `--border-subtle`/`--border`; fills `#111/#1a1a2a/#222233` → `--surface-1/2/3`; control outlines → `--border-control`. Translucent colours (122 literals) become `rgb(var(--accent-rgb) / .16)`-style tokens (`--accent-rgb: 201 162 75`, `--union-rgb: 58 107 196`, `--conf-rgb: 196 58 58`, `--ink-rgb: 10 10 20`).

| uses | current | nearest token | ΔE2000 | action |
|---:|---|---|---:|---|
| 59 | `#0a0a14` | `--ink-950` `#0a0a14` | 0.0 | auto-replace |
| 58 | `#e8d5a3` | `--brass-200` `#e8d5a3` | 0.0 | auto-replace |
| 52 | `#888888` | `--slate-500` `#7b849a` | 10.2 | review (role-dependent) |
| 46 | `#c8a84a` | `--brass-400` `#c9a24b` | 2.9 | auto-replace |
| 41 | `#c9a24b` | `--brass-400` `#c9a24b` | 0.0 | auto-replace |
| 41 | `#1a1a2a` | `--ink-800` `#1a1a2a` | 0.0 | auto-replace |
| 38 | `#8b6914` | `--brass-600` `#8b6914` | 0.0 | auto-replace |
| 37 | `#666666` | `--slate-600` `#6a7390` | 13.7 | redesign |
| 28 | `#12121e` | `--ink-900` `#12121e` | 0.0 | auto-replace |
| 28 | `#1e1e2e` | `--ink-800` `#1a1a2a` | 1.3 | auto-replace |
| 28 | `#cccccc` | `--slate-200` `#e8e6df` | 6.9 | review (role-dependent) |
| 27 | `#e8e6df` | `--slate-200` `#e8e6df` | 0.0 | auto-replace |
| 26 | `#333344` | `--ink-600` `#33334a` | 2.7 | auto-replace |
| 25 | `#8a93a8` | `--slate-400` `#8a93a8` | 0.0 | auto-replace |
| 23 | `#555555` | `--ink-600` `#33334a` | 16.3 | redesign |
| 22 | `#ffffff` | `--white` `#ffffff` | 0.0 | auto-replace |
| 18 | `#dddddd` | `--slate-200` `#e8e6df` | 4.0 | auto-replace |
| 18 | `#3a6bc4` | `--union-500` `#3a6bc4` | 0.0 | auto-replace |
| 16 | `#4477cc` | `--union-500` `#3a6bc4` | 4.4 | auto-replace |
| 16 | `#aaaaaa` | `--slate-300` `#b9bac6` | 7.5 | review (role-dependent) |
| 15 | `#cc5544` | `--conf-500` `#c43a3a` | 6.9 | review (role-dependent) |
| 15 | `#c43a3a` | `--conf-500` `#c43a3a` | 0.0 | auto-replace |
| 15 | `#444444` | `--ink-600` `#33334a` | 13.2 | redesign |
| 10 | `#1a3a7a` | `--union-700` `#1a3a7a` | 0.0 | auto-replace |
| 10 | `#777777` | `--slate-500` `#7b849a` | 11.3 | review (role-dependent) |
| 10 | `#333333` | `--ink-700` `#242438` | 12.2 | redesign |
| 8 | `#ff9944` | `--amber-300` `#f2a541` | 7.4 | review (role-dependent) |
| 7 | `#111111` | `--ink-1000` `#050508` | 2.5 | auto-replace |
| 7 | `#dd9955` | `--amber-300` `#f2a541` | 6.3 | review (role-dependent) |
| 6 | `#44cc88` | `--sage-300` `#6fcf97` | 4.1 | auto-replace |
| 6 | `#ee9988` | `--conf-300` `#f0a08f` | 1.8 | auto-replace |
| 6 | `#bbbbbb` | `--slate-300` `#b9bac6` | 5.9 | auto-replace |
| 5 | `#3a2a10` | `--brass-800` `#3d2f0b` | 3.8 | auto-replace |
| 5 | `#ffdd66` | `--brass-300` `#d9b65a` | 9.9 | review (role-dependent) |
| 5 | `#5588dd` | `--union-500` `#3a6bc4` | 10.8 | review (role-dependent) |
| 5 | `#ff4422` | `--coral-300` `#ff7b6e` | 12.5 | redesign |
| 5 | `#ff8800` | `--amber-300` `#f2a541` | 9.4 | review (role-dependent) |
| 5 | `#1a1206` | `--black` `#000000` | 7.1 | review (role-dependent) |
| 4 | `#6fcf97` | `--sage-300` `#6fcf97` | 0.0 | auto-replace |
| 4 | `#000000` | `--black` `#000000` | 0.0 | auto-replace |
| 4 | `#8fa8c9` | `--sky-300` `#8fa8c9` | 0.0 | auto-replace |
| 4 | `#1a2a3a` | `--ink-700` `#242438` | 9.0 | review (role-dependent) |
| 4 | `#999999` | `--slate-400` `#8a93a8` | 9.8 | review (role-dependent) |
| 4 | `#eeeeee` | `--slate-100` `#f4f2ec` | 3.1 | auto-replace |
| 4 | `#668844` | `--sage-300` `#6fcf97` | 22.4 | redesign |
| 4 | `#222222` | `--ink-1000` `#050508` | 7.3 | review (role-dependent) |
| 4 | `#0c0f15` | `--ink-950` `#0a0a14` | 2.4 | auto-replace |
| 3 | `#6f7686` | `--slate-600` `#6a7390` | 5.1 | auto-replace |
| 3 | `#cc7766` | `--coral-300` `#ff7b6e` | 9.3 | review (role-dependent) |
| 3 | `#0a3a6a` | `--union-700` `#1a3a7a` | 3.6 | auto-replace |
| 3 | `#88aaee` | `--union-300` `#9dbcf0` | 5.1 | auto-replace |
| 3 | `#ff6644` | `--coral-300` `#ff7b6e` | 7.7 | review (role-dependent) |
| 3 | `#cc4433` | `--conf-500` `#c43a3a` | 5.0 | auto-replace |
| 3 | `#4488ff` | `--union-500` `#3a6bc4` | 12.3 | redesign |
| 3 | `#dd5544` | `--conf-500` `#c43a3a` | 9.2 | review (role-dependent) |
| 3 | `#d6a44e` | `--brass-400` `#c9a24b` | 3.5 | auto-replace |
| 3 | `#cc0000` | `--conf-500` `#c43a3a` | 9.3 | review (role-dependent) |
| 2 | `#f4f2ec` | `--slate-100` `#f4f2ec` | 0.0 | auto-replace |
| 2 | `#b9bac6` | `--slate-300` `#b9bac6` | 0.0 | auto-replace |
| 2 | `#6b7da3` | `--slate-600` `#6a7390` | 5.2 | auto-replace |
| 2 | `#9a9ba8` | `--slate-400` `#8a93a8` | 5.1 | auto-replace |
| 2 | `#0d0d18` | `--ink-950` `#0a0a14` | 1.4 | auto-replace |
| 2 | `#f0e8d0` | `--slate-200` `#e8e6df` | 6.6 | review (role-dependent) |
| 2 | `#ff4444` | `--coral-300` `#ff7b6e` | 9.6 | review (role-dependent) |
| 2 | `#ccddee` | `--union-200` `#bcd3ff` | 8.4 | review (role-dependent) |
| 2 | `#f5c518` | `--brass-300` `#d9b65a` | 8.6 | review (role-dependent) |
| 2 | `#44cc44` | `--sage-300` `#6fcf97` | 12.5 | redesign |
| 2 | `#222233` | `--ink-700` `#242438` | 1.5 | auto-replace |
| 2 | `#cc3322` | `--conf-500` `#c43a3a` | 5.9 | auto-replace |
| 2 | `#ffcc44` | `--brass-300` `#d9b65a` | 8.4 | review (role-dependent) |


---

## Appendix B — style const → component → geometry map (bundle.pretty.js)

Extracted by `panels2.py` (33 style consts / 462 keys → `style_consts.json`). Function line = start of the component; z = declared `zIndex`.

| Style const | Component (function @ line) | Position / size | z |
|---|---|---|---|
| `Ar` | hover popup (`fF` @97063) | fixed, w 260 | 500 |
| `ux` | map + units canvas (`gF` @97213) | canvas inset 0 (`pointerEvents:auto`); trails btn top 10/right 56 | 10 / 20 |
| `Sd` | speed / FPS HUD (`_F` @97415) | abs top 56, left 16 | 88 |
| `jc`, `oo` | Unit panel sections: commander / strength bars (`wF` @97571, `SF` @97664) | inside unit panel | – |
| `ji` | Unit panel (`MF` @97897) | fixed left 16, top 60, w 280 (`innerWidth<500` ⇒ bottom 150 / right 16, evaluated once) | 92 |
| `Cr` | Story / vignette panel (`CF` @98252) | abs top 60, right 16, w 340 | 92 |
| `Vc` | Event card (`LF` @98595) | abs bottom 120, left 50 %, w 460 | 85 |
| `ar` | Search panel (`FF` @98738) | abs top 56, left 50 %, w 440 | 95 |
| `zr` | Filter panel (`OF` @99082) | abs top 56, left 0, w 280 | 95 |
| `Fr` | Legend fab/panel (`VF` @99422) | fixed bottom 160, left 16, w 240 | 88 |
| `Td` | Minimap (`WF` @99711) | abs right 16, bottom 130 | 88 |
| `eh` | Command-change toasts (`qF` @99888) | abs top 60, right 16, max-w 300 | 200 |
| `Zr` | NPS Auto Tour (`XF` @100323) | launch btn right 16/bottom 90 (200); dots bar bottom 220 (301); panel left 60/right 0/bottom 86/max-h 38vh (300); PiP top 58/right 16/w 320 (400) | 200–400 |
| `dx` | Monument tooltip (`KF` @100844; markers z 160) | fixed, w 280 | 600 |
| `lr` | Follow Your Ancestor (`Zk` @101008) | fixed inset 0 | 700 |
| `Va` | React splash (`tO` @101472) | fixed inset 0 | 1000 |
| `nh` | Commander-succession cards (`nO` @101679) | abs top 58, left 60, max-w 240 | 400 |
| (inline) | Cursor glow (`iO` @101817) | abs, 36–52 px, follows mouse | 30 |
| `Or` | Soldier's Eye View (`Yk` @101958) | fixed inset 0 | 800 |
| `jo` | Order of Battle (`Xk` @102321) | fixed inset 0 | 900 |
| `gp` | Roster (`Jk` @102660) | fixed left 0, top 48/bottom 110, w 560 (`innerWidth<560` ⇒ full-screen) | 900 |
| `ko` | Layout chooser (`dO` @102752) | fixed inset 0 | 1000 |
| `tn` | **Mobile shell** (`pO` @102914) | root fixed inset 0 (100); map top 94/bottom 140 (1); topBar h 52 (200); dayTabs (200); bottomBar h 140 (200); unit popup bottom 140 (300); slide panel max-h 65vh (400); mini legend/minimap bottom 150 (150); tools overlay inset 0 (500) | 1–500 |
| `ln` | Virtual Walkthrough (`_O` @110733) | root fixed inset 0 (500); map legend (10); street-view overlay (500) | 500 |
| `vO` | Sound button (`yO` @111768) | abs right 16, bottom 58 | 200 |
| `tr` | Onboarding (`bO` @111856) | fixed inset 0 | 1000 |
| `Po` | **Desktop timeline** (`IO` @112202) | abs bottom 0, full width, ~120–130 px (est.) | 100 |
| (inline) | Map Layers (`GtbgLayers` @112471) | fixed top 60, right 10 | 1000 |
| (inline) | Distance tool (`GtbgDist` @112677) | fixed top 60, left 50 % | 1000 |
| `tc` | App root + toolbar (`AO` @112921) | root fixed inset 0 (no z); toolbar h 48 | 100 |
| chunk | Help / Bookmarks (`assets/helpmodal-cfv9t0zh.js`, `bookmarkpanel-c5yt4b5k.js`) | fixed inset 0 | 600 |
| index.html | `#extra-features` (`index.html:176–205`) | fixed top 60, right 14 (moves) | **999999** |
| index.html | monuments overlay (`index.html:645`) | abs inset 0 in `.mapboxgl-map` | 400 |
| site-nav.css | `#gtbg-nav` (`:17`) | sticky top 0 | 500 |

## Appendix C — reproduce the numbers

All scripts are in `plan-work/tmp-app-design/` (read-only inputs: `DEPLOY_DIR`, `bundle.pretty.js`, `helpmodal-*.js`, `bookmarkpanel-*.js`):

```
python inventory.py       > inventory_out.txt      # token counts per source; inventory_detail.json / inventory_summary.json
python cluster.py                                  # ΔE76 clusters, opaque/translucent split, family counts
python contrast.py                                 # WCAG contrast of every text colour + key pairs
python cvd.py                                      # ΔE2000 under protan/deutan/tritan (Machado 2009, severity 1)
python tokens_check.py                             # validates the proposed dark/light token contrasts
python map_tokens.py      > appendix_colors.md     # nearest-token map (81/180 auto, 99 role review)
python panels2.py                                  # style consts -> style_consts.json + positioned-element table
python components.py                               # button/chip/tab-like definitions across sub-pages
python sun.py                                      # NOAA solar times, Gettysburg, 1–3 Jul 1863 (LMT)
python assemble.py                                 # builds ../app-design.md from part*.md + findings.py
```
Web look-ups (2026-09-29/30): Lucide licence (ISC + Feather MIT) `github.com/lucide-icons/lucide` LICENSE; Mapbox hillshade example `docs.mapbox.com/mapbox-gl-js/example/hillshade/` (`mapbox://mapbox.mapbox-terrain-dem-v1`); Mapbox recolorable images (`icon-color` requires SDF) `docs.mapbox.com/help/dive-deeper/using-recolorable-images-in-mapbox-maps/`; Mapbox attribution `docs.mapbox.com/help/dive-deeper/attribution/`; Spectral = SIL OFL 1.1 (github.com/productiontype/Spectral, per search results); Georgia web-embedding not licensed via core fonts (fonts.com / MyFonts licence pages); WCAG 2.2 SC 2.5.8 (24 × 24 CSS px, AA); font sizes via `HEAD` on `fonts.gstatic.com` woff2 URLs from the Google Fonts CSS API.


---

## Verification

Adversarial verifier pass on the app-design report (2026-09-30). Method: every critical/high finding and 20 medium/low findings were re-opened against `bundle.pretty.js`, `DEPLOY_DIR` files, the two lazy chunks, `sw.js`, `manifest.json`, the PNGs, and the live site (curl); numeric claims were recomputed (WCAG contrast, CIEDE2000 under Machado 2009 CVD, NOAA solar times, `inventory.py` re-run into a scratch dir, PNG IDAT decode); external claims were fetched (Mapbox hillshade / recolorable-images / attribution pages, Lucide LICENSE, Spectral repo, Google Fonts CSS + `HEAD` on the 3 woff2 files, WCAG 2.5.8, Mapbox CSP search). Nothing outside this file was modified.

**Overall:** the report is unusually accurate. About 45 `bundle.pretty.js` line citations that were opened all resolved exactly (0-3 line drift), and the token inventory reproduces (307 colours, 41 font sizes, 36 spacings, 15 radii, 28 z strings, 20 durations, 27 `<style>` blocks, 51 `style=""` attrs, 22 `:root` blocks, 613 inline `style:` props, 0 aria/role, 13 `innerWidth`, 0 `devicePixelRatio`). The errors found are (a) two wrong fix mechanics (`zIndex` removal; `@container` sketch), (b) three false sub-claims (`nO` opacity, 9/11 postures, 768 px overlap), (c) a mis-diagnosis of the Compare tab clipping, and (d) omissions around the button-reset cascade, `sw.js` cache-first precache, and the Tools sheet in landscape.

### Verdict table

| ID | Sev | Verdict | Notes (evidence re-opened; corrections in bold) |
|---|---|---|---|
| app-design-01 | critical | **CORRECTED** | Root cause CONFIRMED: `V.jsx(IO,{})` unconditional (113249) while toolbar (113071) and map (113233) are gated; `tn.root` fixed z100 (103699-103706); `Po.wrap` absolute bottom0 z100 (112386), later in DOM; `toolsOverlay` z500 inside pO context (104037); `Po.controls` = 5 btns + 6 speed (`wO` 112185) + tick + credit nowrap (112361-112370). Mobile `playRow` arithmetic reproduces (~383 px). **Fix step (b) is wrong:** `tc.root` (113301, used at 113057) has no `zIndex` at all, and `tn.root`'s stacking context comes from `position:fixed`, not from `z-index`. Deleting `zIndex:100` from `tn.root` leaves it at the auto/0 level, so `Po.wrap` (z100) would still paint over it. Only (a) unmount IO in compact layout and (c) portal the sheet actually fix C1/C2. Also note other z>=100 siblings that poke through on Mobile today: sound button `vO.btn` z200 bottom58 right16 (111785-111797), toasts `eh` z200 top60 right16 (100008), commander cards `nh` z400 (101775) - gating `yO/qF/nO` removes those features on mobile; prefer mounting them inside the new single toast region (finding 17). |
| app-design-02 | high | **CORRECTED** | Evidence CONFIRMED: `pO` 102914, `tn` 103698, three `new z_.Map` (97237, 102981, 110770), map top 94 = 52+42 (103715-103760, `minHeight:42`), bottomBar 140 (103770-103783), manifest `"orientation":"landscape"`, 13 innerWidth reads (8 at module load in `ji` 98111-98115 and `gp` 102708-102712). **The CSS sketch is invalid:** `.gb-app{container-type:inline-size}` and then `@container (max-inline-size:767px){ .gb-app{grid-template:...} }` can never match - a container query matches descendants of the container, not the container itself. Use `@media (max-width:767px)` (the shell is viewport-sized anyway) or add a wrapper element as the container. Also the two maps are configured differently (desktop: `maxBounds`, `dragPan` inertia, `scrollZoom` speed, NavigationControl; mobile: none of these) - "one MapView" must reconcile them. XL is realistic only if source exists (N1). |
| app-design-03 | high | **CORRECTED** | Inventory numbers reproduce (re-ran `inventory.py` into a scratch dir: WHOLE SITE 307/41/36/15/16/28/10/5/20; sub-12px 165 excluding two `0px`). **"1 CSS media query" is imprecise:** static files hold 8 `@media` (1 layout `max-width:640px` at `site-nav.css:52`, 6 `prefers-reduced-motion` at `index.html:139,206,252` + `site-nav.css:14,53,82`, 1 `print` at `report.html:37`) and the vendor CSS has 18. Say "one layout breakpoint". **Counts:** `#c8a84a` = 41 in the bundle (46 only if the 5 static-page uses are added), `#c9a24b` = 40 in static files (not 41). CSP claim (CSSOM style writes are not blocked) is hedged by the report and consistent with Mapbox's CSP guidance (needs `worker-src blob:`, `img-src data: blob:`, `connect-src api/events.mapbox.com`; no `style-src 'unsafe-inline'` requirement was found - still test in Report-Only). **Effort:** L covers tokens + 26 static pages; the React half (613 inline props, 33 consts) needs source and belongs to the XL Phase 2, not to this L item. |
| app-design-04 | high | CONFIRMED | `#3a6bc4`/`#c43a3a` (96427-96428), `#4477cc` (97924, 98876; `search.html:20` `--union:#4477cc; --conf:#cc5544`), `#5588dd`/`#dd5544` (103530/103575), `#88ccff`/`#ff9944` (96431-96432). CVD numbers reproduce exactly (41.7/42.3/51.0/65.8). |
| app-design-05 | high | **CORRECTED** | All raw ratios reproduce: #444 2.02, #555 2.64, #666 3.43, #777 4.40, #8b6914 3.87, #6f7686 4.32 / 4.08, `.key-action` #ccc on white 1.61, brass on white 2.40, #8a93a8 on white 3.08. **Translucent-panel numbers are off:** `#8a93a8` over an `rgba(8,8,18,a)` panel on pure white = 3.69 (a .80), 3.98 (.82), 4.43 (.85), 4.58 (.86), 5.50 (.92), 5.79 (.94) - the claim "4.49 at .86" is wrong (it passes, marginally) and ">= 5.6 at alpha >= .92" only holds from about .94. The real failing panel is `Sd.wrap` at alpha .80 (97492). Direction of the fix is unchanged; set the token to .94 as already proposed. |
| app-design-06 | critical | **CORRECTED** | Root cause CONFIRMED (`search.html:30-31, 56-59`; `site-nav.css:143-147`; `#e8e6df` on `#efefef` = 1.09-1.10). **Two problems with the "Immediate (S)" fix:** (1) `font-size:12px` on `.filter-chip` is inert (`button.filter-chip{font:inherit}` wins) - harmless only because `#filters` is already 12 px; (2) the same override is **live, not latent** elsewhere: `camera/ground-remembers/immersive/watch-together .play-btn` render `#e8e6df` on `#c9a24b` = 1.92:1 with weight 400 (page asks `#0a0a14` bold; measured in pages-A.md:113-118), and `compare .toggle-btn` computes 16 px, not the declared 10 px. Put the reset at zero specificity (`:where(...)` or `@layer reset`) in the same change (see MISSED-1). |
| app-design-07 | high | CONFIRMED | `'Spectral'` x14 (all in app UI, lines 111327-113332), `Cormorant` x4, no `@font-face`/`<link>`/font file in deploy (the only `font-face` string in the bundle is an SVG-parser switch, 1567-1571), CSP `font-src 'self' fonts.gstatic.com` at `netlify.toml:19` with nothing using it. Re-measured on 2026-09-30: Spectral latin 400/600/700 = 21,696 / 22,936 / 23,036 B (matches). Spectral is SIL OFL 1.1 by Production Type (repo README); Reserved Font Name **not verified** (report correctly says to check). Georgia web-embedding restriction is consistent with search results (EULA forbids modification; web embedding needs a webfont licence) but is a legal statement - treat as UNVERIFIED legal advice. |
| app-design-08 | medium | **CORRECTED** | 13 `innerWidth`, 8 at module load: CONFIRMED. `one @media (site-nav.css:52)` -> **one layout media query** (see 03). Spacing/off-grid percentages come from the script and reproduce in the re-run; not independently re-derived. Migration table risk: mapping radius 20/24 px to `--r-pill` (999px) changes rectangular cards into stadium shapes - the "human reviews the diff" caveat is essential. |
| app-design-09 | high | CONFIRMED | z values verified at 101299 (700), 102076 (800), 102445 (900), 102716 (900), 112514 (1000), 112863 (1000); Help/Bookmarks z600 in the lazy chunks; all are siblings in `AO`'s fragment so the inversion is real. Magic offsets verified: legend bottom160 (99578), minimap 130 (99835), event card 120 (98662), NPS launch 90 (100475), sound 58 (111788, z200 so it is drawn over the timeline). `#root{contain:strict}` at `index.html:66-70`. App region has 23 levels; 27 site-wide reproduces. |
| app-design-10 | high | CONFIRMED | Esc guard `Ur.target.tagName==="INPUT"` (112967); Esc cascade (113033-113050) omits Layers/Distance/legend/story/event card; story dismissed `Set` initialised in component state (98258-98262); event card `bottom:120` permanent; top-right claimants verified (`Cr` 60/16 z92, `eh` 60/16 z200, tour pip 58/16 z400 at 100587, Layers 60/10 z1000). Errata in section 6.3 body: see below. |
| app-design-11 | high | **CORRECTED** | 13 toolbar buttons `S F list L monument telescope star ruler map pin magnifier B ?` (113144-113240), duplicate search (S and magnifier), mobile sheet map glyph (103439/103474) all CONFIRMED. Glyph total 108/44 is the right order (my broader count incl. variation selectors and arrows: 120/52). **Corrections:** the icon called a "globe" is U+1F5FA WORLD MAP, not a globe glyph; and `index.html:398-440` does **not** patch anything - it early-returns on `b.title` (line 414) and every `Vs` button already has a `title` (113287-113299), so `labeled` never reaches 3 (also true of the `#seo-content` removal it gates; React clears `#root`'s children on first render anyway). |
| app-design-12 | high | CONFIRMED | `tc.toolbar` height 48 (113308-113313), `toolBtn` padding `4px 10px` 12 px monospace (113356), header text buttons 113100-113137. Stronger than reported: the desktop `lo` state (`[lo,Br]` at 112954) is only ever set to `false`, so Order of Battle (`Xk`, 113257) **cannot be opened at all on desktop**, not just "not on the toolbar". |
| app-design-13 | high | CONFIRMED | `index.html:176-253` CSS (`#extra-features` fixed top60 right14 z999999, opacity 0, 5 s CSS force-reveal), markup 285-292, six inline scripts at 294-353 / 355-396 / 398-440 / 441-519 / 521-606 / 608-714 exactly as listed. The monuments overlay projects with a hand-rolled formula from the default view and re-renders on `resize` only (no pan/zoom hook), and is wired to the same button as React's `KF`. |
| app-design-14 | high | CONFIRMED | `tO` (101472-101592): 800 ms + `eO=3500` + 600 ms = 4.9 s plus data wait; `yn.setState({currentTick})` per rAF (101492-101497); `Va.skip` `<div onClick>` 11 px `#444` (101571-101581, 101670-101680); wordmark 52 px / 8 px tracking (about 434 px wide); `dO` cards `<div onClick>` (102769-102791); layout `Zn` starts `null` (112949); `gtbg_onboarded` (112951, 113068); store `onboardingComplete` never used (9441-9444); "Power User - keyboard shortcuts" (111814). Note for the effect table: removing the 4.9 s React splash improves time-to-map and main-thread contention, but the HTML splash `h1` is already the LCP/FCP element, so it does not by itself move LCP/FCP. |
| app-design-15 | high | CONFIRMED | Range `min0 max100 step.01` with `appearance:none` (112294-112303), zero `slider-thumb`/`range-thumb` strings anywhere in deploy, 8x8 marker divs with `onClick`+`title` (112270-112296), inactive speed pills `#eee`/`#333` (112348), mobile scrubber `<div onTouchStart/Move>` (103179-103184), rate: `cF=500` ms/tick (96948), label "1x (real time)" (97429) = 2 ticks/s = 10 sim-min/s. `#0044cc` on the bar composites to about 2.4:1 (report says 2.5). Cross-reference: `IO`'s wrapper `onKeyDown` (112216-112224) plus the window handler double-fires arrows/Space (app-bugs E3); the new slider spec must remove it. |
| app-design-16 | high | CONFIRMED | `React.lazy` Help/Bookmarks (112469-112470), `Suspense fallback:null` (113277), Bookmarks `prompt("Copy this link:",s.url)` in the chunk, no `role`/`aria-` in either chunk, `autoFocus` only in Bookmarks. |
| app-design-17 | medium | **CORRECTED** | `qF` 4.5 s timers (99909-99915), `slideIn` (100024) with no `@keyframes` anywhere (deploy keyframes are only mapboxgl-spin, user-location-dot-pulse, boot-fade-in, boot-slide, gtbg-*, and `pulse` in cinematic-export) - CONFIRMED. **REFUTED sub-claim:** `opacity: z.phase==="dying" ? 1 : (z.phase==="fading",0)` (101731) is a comma expression that yields 0 for the non-dying phase, and `transition:"opacity 1.8s ease"` is applied in the same style change, so the card **does** fade 1 -> 0 from t=1.2 s and is removed at t=3.0 s (1.8 s later). The report's "nothing to animate / zeroes opacity instantly" is wrong (the code is odd but works). The one-toast-system fix stands. |
| app-design-18 | medium | CONFIRMED | `Ar.popup` width 260 z500 (97157-97168), `dx.tooltip` width 280 z600 (100965-100975), both `pointerEvents:none` (fails WCAG 1.4.13 hoverable, as the report says). 61 (not 60) `title:` props - immaterial. |
| app-design-19 | high | **CORRECTED** | Legend `NF` (99384-99412) vs canvas `Lp` (96306-96318): **8 of 11 postures differ, not 9** (Charging, Retreat and March are identical; Line of Battle is `null` on canvas = side colour, blue `#4488ff` in legend - counted as differing). The report's own table shows 8 "no" rows. Legend note 99519, size circles r5/7/9 (99559), tour copy (111823-111831) verified. CVD numbers reproduce: Charging/Retreat deutan 7.8, Retreat/Deployed-Art deutan 7.8, Deployed/Limbered tritan 7.9; **legend LoB vs Skirmish is 8.7 deutan / 8.1 tritan** (the finding lists 8.1 under deutan). |
| app-design-20 | high | CONFIRMED | `lA` width = strength/4 clamp 10-120 (96433-96437), 8-pass 12 px relaxation (96558-96581), canvas sized from `getBoundingClientRect` with no dpr (96510-96512; 0 `devicePixelRatio`), labels bold 8/9/10 px (96663-96665), engaged = 40 screen px (96480-96505), `|sin(t/300)|` shadowBlur glow every frame (96615), picking radius 0.002 deg (96388, 97336). |
| app-design-21 | medium | CONFIRMED | `KF` rAF loop calls `project()` for every monument and `H(xe)` with a fresh object every frame even when hidden (100850-100868); `unit-rendering-reference.html:128` `map.addImage('unit-arrow', ctx.getImageData(...))` with no `{sdf:true}` while line 160 uses `icon-color` - Mapbox's recolorable-images page confirms `icon-color` needs SDF images. |
| app-design-22 | medium | CONFIRMED | Chambersburg Pike = 5 vertices, all lat 39.8306 (9498-9520); Baltimore Pike all 39.82 (9484-9497); roads `#44bb44`, rivers `#8844cc` purple; `data/terrain.json` = 30 key_locations / 8 roads / 8 structures / 4 terrain_features, and `terrainData` is only ever stored (9391, 9395) and never read, so the boot fetch is also wasted. |
| app-design-23 | medium | CONFIRMED | `M4` = 5:00 + 5 min x tick-in-day (9856-9860), `E4` hour table (9861-9884), `A4` multiply div z6 with `transition: background 8s` (9885-9900). Solar times recomputed with NOAA formulas for 1863-07-01..03 at 39.8309 N 77.2311 W (LMT): sunrise 4:35-4:36, sunset 19:32, civil dawn 4:02-4:03, civil dusk 20:04-20:05 (report: 4:34-4:35 / 19:31-19:32 / 4:02 / 20:04 - within 1 min). |
| app-design-24 | high | **CORRECTED** | `attributionControl:!1` at 102988 and 110777, no `AttributionControl`/`ScaleControl` anywhere in app code: CONFIRMED. Mapbox's attribution page (fetched) says logo and text attribution "usually must" be shown, the logo may be moved, and neither may otherwise be altered. **Nuance:** the page does not explicitly discuss `attributionControl:false`; and Mapbox's separate logo control is still added by default and nothing in `index.html`/CSS hides `.mapboxgl-ctrl-logo`, so what is actually missing on mobile/walkthrough is the **text** attribution, not the wordmark. The fix (compact `AttributionControl`) is right; effort S is realistic. |
| app-design-25 | low | **CORRECTED** | Hillshade example URL exists and uses `'url':'mapbox://mapbox.mapbox-terrain-dem-v1'` and `'type':'hillshade'`. **But** the example positions the layer with `'slot':'bottom'`, which only applies to Standard-style slots; `satellite-v9` is a classic style, so place it with `map.addLayer(layer, beforeId)` after checking `map.getStyle().layers` (the report already says to verify ids; make `beforeId` explicit). |
| app-design-26 | high | CONFIRMED | `iF` (96834), `rF` (96919), `oF` (96923) have no catch and no `r.ok` check; `zp` swallows errors into `{placements:[]}` (96909) which still leaves `Object.keys(he).length>5` false, so the splash waits forever; `AO` calls `sF` with no handler (112963); no error boundary in app code (only react-dom internals match); no WebGL support check; `Suspense fallback:null`. |
| app-design-27 | medium | CONFIRMED | 0 `prefers-reduced-motion` in app UI; 6 in static CSS; `body{animation:gtbg-page-in 340ms}` (`site-nav.css:12`, starts at opacity 0 + translateY); `boot-fade-in` on `#boot-splash` (`index.html:99`); glow loops. Note: Mapbox's camera methods already honour reduced motion unless `essential:true` (library has `_prefersReducedMotion`), and the app passes no `essential` - so the report's "never pass essential" rule is the right thing to record. |
| app-design-28 | medium | CONFIRMED | Zero `color-scheme`/`prefers-color-scheme`/`forced-colors`/`prefers-contrast` in any HTML/CSS/JS. All light-theme contrast values reproduce (text-1 15.31, text-2 8.92, text-3 6.04, text-4 5.10, border 3.92, accent 3.35, union-text 6.92, conf-text 6.44, ok 4.69, ...). See MISSED-6 for two small gaps. |
| app-design-29 | medium | CONFIRMED | `report.html:35` `.key-action{color:#ccc}` (1.61:1 in print), print block 37-43 hides only header/#search/#matches/.print-btn/.back, raw ids `parent_corps_id + ' / ' + parent_brigade_id` (`report.html:101`; `regiment.html:199`), no `@page`, only one `@media print` in the site. |
| app-design-30 | high | CONFIRMED | `<div id=gtbg-nav-mount>` empty until `site-nav.js` runs at DOMContentLoaded (`site-nav.js:155-171, 228-236`), no reserved height anywhere in `site-nav.css` (CLS remains "likely - measure", as the report hedges); privacy/terms/404/embed/unit-rendering-reference have no `site-nav`, no `<main>`; 20 pages carry `a.back` plus the nav brand; nav mount on 21 pages. Nit: there are 9 `h1` scales, not 8 (`404.html` `clamp(2rem,6vw,3rem)`; privacy/terms use the UA default). |
| app-design-31 | medium | **CORRECTED** | `dashboard.html:71` `<svg width="1000" height="440" viewBox="0 0 1000 440">` CONFIRMED (fluid fix = drop the width attr / `width:100%;height:auto`). **Root cause of the Compare tab clipping is mis-stated:** `.toggle-btn{font-size:10px;padding:3px 8px}` (`compare.html:38`) is declared but overridden by `button.toggle-btn{font:inherit}` (0,1,1); computed size is **16 px** (pages-A.md:117: row about 330 px in a 163 px pane). It is the cascade bug, not "undersized controls", that clips "Parc...". Consequence: once the reset is fixed the declared 10 px returns and violates the 12 px floor - bump the page rule in the same change. |
| app-design-32 | high | CONFIRMED | `day1.png` = `day3.png`, md5 `3f6646c9...`, 17,585 B, IHDR 1280x720 colour type 2, decompressed IDAT 3,687,120 B = 5,121 B/row (RGBA-sized: 1280x4+1), Pillow: "unrecognized data stream contents"; icons are RGBA colour type 6, manifest single `"any maskable"`. Nit: `og:image` is on 21 pages (index + 20), not "all pages"; privacy/terms/404/embed/diagnostics have none. |
| app-design-33 | low | CONFIRMED | `ji.panel` layout chosen once at module load (98108-98118). Nit: `Cr.panel` (98418) and `Vc.panel` (98660) already carry `maxWidth:calc(100vw - 32px)`, so "fixed pixel panels" is overstated for those two. |
| app-design-34 | high | CONFIRMED | Evidence is the absence of any tests/lint/budget in the zips (true); the proposed tooling is process, not falsifiable here. Effort L is reasonable; the 10-viewport x 3-theme matrix should be phased (start with 320/375/768/1440 + 667x375, dark only). |
| app-design-35 | high | **CORRECTED** | 6 `44 px` minimums (101341-101342, 102118-102119, 102485-102486, 102743-102744, 103851, 104003) and 75 `"button"` elements verified. **Interactive `div`/`span` `onClick` count is at least 13 (19 including backdrop overlays), not 6** (e.g. 98368, 98858, 98881, 100369, 100927, 101176, 101252, 101571, 101995, 102769, 102791, 110694, 112276). Layers checkboxes are native (`accentColor` only, 112557-112560) and their text is a `<span>`, not a `<label>` (112563) - unmentioned. |
| app-design-36 | medium | CONFIRMED | `autoFocus:!0` on the search input (98819), results are `div onClick` rows (98858/98881), Esc ignored while in the input (112967). Natural-sort claim (H5) not re-checked here. |
| app-design-37 | high | CONFIRMED | 0 `aria-`/`role:` and 1 `tabIndex` in app UI (the one is `IO`'s wrapper, 112223); no `<main>/<nav>/<h1>` emitted by the React shell; splash `role=progressbar` without value (`index.html` boot bar). Nuance: the crawler block `#seo-content` is not removed by the 398-440 script (see 11) but React replaces `#root`'s contents at first render regardless. |

### External / catalogue claims

| Claim | Result |
|---|---|
| Mapbox hillshade example uses `mapbox://mapbox.mapbox-terrain-dem-v1` | CONFIRMED (docs.mapbox.com/mapbox-gl-js/example/hillshade/); note the example positions with `slot:'bottom'` (Standard-style concept) |
| `icon-color` works only for SDF images added with `sdf:true` | CONFIRMED (docs.mapbox.com/help/dive-deeper/using-recolorable-images-in-mapbox-maps/) |
| Mapbox requires logo + text attribution visible; logo may be moved | CONFIRMED (docs.mapbox.com/help/dive-deeper/attribution/); the page does not mention `attributionControl:false` by name |
| Lucide = ISC with Feather-derived icons under MIT | CONFIRMED (github.com/lucide-icons/lucide `LICENSE`: ISC + a separate MIT block listing Feather-derived icons) |
| Spectral = SIL OFL 1.1 (Production Type); sizes 21.7/22.9/23.0 KB | CONFIRMED (repo README; `HEAD` Content-Length 21,696 / 22,936 / 23,036 on `fonts.gstatic.com/s/spectral/v15/...`). RFN not verified. |
| Georgia cannot be self-hosted as a webfont | Supported by search results (EULA: no modification; webfont licence needed) but legal - UNVERIFIABLE as advice |
| WCAG 2.2 SC 2.5.8 = 24x24 CSS px, AA | CONFIRMED (w3.org Understanding 2.5.8) |
| Mapbox `satellite-v9` layer ids, `GeoJSONSource.updateData` in 3.24, Terrain v2 contour layer names | UNVERIFIABLE here (report itself says verify) |

### Errata to the report body (not separate findings)

* Section 6.3, last paragraph: "at 768 px the two panels alone overlap (280 + 340 > 768 - 32)" is **wrong**. Unit panel occupies x 16-296; story panel's left edge at 768 is 768-16-340 = 412; they do not overlap. They collide only below about **652 px** (16 + 280 > W - 16 - 340). At 1024 the arithmetic (372 px of map) is right. The Playwright overlap test should therefore add 640 and 700 px, and the narrative should say that the story panel (`maxWidth:calc(100vw - 32px)`) and event card already shrink.
* Section 6.1 / roadmap Phase 0 (`14.2`): "drop `zIndex` on `tn.root`/`tc.root`" - see 01 (no-op for `tc.root`, ineffective for `tn.root`).
* Section 6.1 CSS sketch: `@container` cannot restyle its own container - see 02.
* Section 2.4 / D-2 / finding 19: "9 of 11" -> 8 of 11.
* Section 4 / finding 11: the patch at `index.html:398-440` is described as active; it is inert.

## Missed issues (in app-design scope)

The report failed to list these. They are also returned in the structured output.

1. **[high] The button-reset override is live on primary CTAs and the ordering of the fix matters.** `site-nav.css:143-147` (0,1,1) silently overrides page rules. Measured/derived: `.play-btn` on camera, ground-remembers, immersive, watch-together = `#e8e6df` on `#c9a24b` = **1.92:1**, weight 400 (page declares `#0a0a14` bold, 8.21:1); `compare .toggle-btn` computes **16 px** (declared 10 px). The report calls the trap "latent" (section 2.3) and its "Immediate (S)" fix only touches `.filter-chip`. **Fix (S, one PR):** wrap the reset in `@layer reset` (page `<style>` rules are unlayered and will win) or make it `:where(button.mode-btn, ...)`; in the same PR set `.toggle-btn` to >=12 px / >=32 px tall, give `.filter-chip` an explicit `background:transparent`, and add an axe/computed-contrast assertion for every `button, .chip` on all 27 pages. Otherwise fixing the cascade "restores" declared 10 px type that violates the report's own 12 px floor.
2. **[medium] Service worker precaches icons/manifest/apple-touch cache-first, so the brand-asset and manifest fixes (finding 32, E1) will not reach returning visitors.** `sw.js:5-13` `PRECACHE_ASSETS` lists `/icons/icon-192.png`, `/icons/icon-512.png`, `/apple-touch-icon.png`, `/manifest.json`; `sw.js:52-55` serves them cache-first with no revalidation; `CACHE_NAME='gbg-v5'`. Replacing the files under the same URL (or removing `orientation`) is invisible until the cache name changes, and the change then triggers the existing `skipWaiting`/`clients.claim`/controllerchange-reload path (C6). **Fix:** ship new icons/manifest under versioned URLs (`/icons/v2/...`, `manifest.v2.json` or network-first for `/manifest.json`), bump `CACHE_NAME`, and land it after the C6 fix.
3. **[medium] Mobile Tools sheet cannot scroll and overflows in landscape (the only orientation the PWA manifest allows).** `tn.toolsPanel` (104041-104047) has no `max-height`/`overflow`; 14 tools in a 4-column grid with `minHeight:72` (104074-104085) + `gap:2` + `padding:10` + header (about 52 px) + safe-area is about **380 px** > 375 px landscape height; the overlay is `align-items:flex-end`, so the header/close button and first row clip off the top, and the root is `touch-action:none` (103699-103706) so the panel gets no touch panning. (Derived by arithmetic - measure in DOM.) The report's target sheet spec (`max-block-size:min(85dvh,640px)`, scrolls) fixes it, but the defect is not in the findings list or Phase 0. **Fix (S) for Phase 0:** `max-height:calc(100dvh - 16px); overflow-y:auto; overscroll-behavior:contain; touch-action:pan-y` on `toolsPanel`.
4. **[low] Layers panel checkboxes have no label association and are swallowed by the global key guard.** `GtbgLayers` (112548-112565): native 13 px checkbox + `<span>` text (not `<label>`), so tapping the text does nothing; being `INPUT`s, they trigger the `tagName==="INPUT"` early return (112967), so Esc/shortcuts stop working after any checkbox click. **Fix:** `<label>` wrapper with 44 px row; narrow the guard to text-entry inputs (`INPUT` types text/search/number/email, `TEXTAREA`, `SELECT`, contenteditable).
5. **[low] Boot splash caption fails AA and the report's contrast sweep misses it.** `index.html:128-131` `.boot-caption{color:#6f7686; font-size:.8rem}` = 4.32:1 on `#0a0a14` (the report lists `#6f7686` only for `site-nav.css:96,129`); it is visible to every user for the whole boot. **Fix:** `var(--text-3)` (`#8a93a8`, 6.39:1).
6. **[low] Light-theme token gaps.** From the report's own tokens (recomputed): `--warn #8a5200` on surface-3 = 4.46:1 (text), `--accent #a67c1a` on surface-3 = 2.66:1 and on surface-2 = 3.03:1 (graphic), `--danger #b3261e` on surface-3 = 4.56:1 (borderline); only `--ok` carries a "don't use on s2/s3" note. **Fix:** darken `--warn` to about `#7f4b00`, restrict `--accent` marks to surfaces 0-1 or add a `--accent-on-s3`, and extend the "not on s2/s3" note.
7. **[low] Report-body arithmetic errata** (768 px overlap, 9/11 postures, `nO` opacity) can mislead the implementer - see Errata above; correct them in the report before it is used as a spec.
