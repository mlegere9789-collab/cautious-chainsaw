# app-a11y — WCAG 2.2 AA (+ cheap AAA) audit and fix plan for the MAIN APP shell and bundle UI

Site: https://gettysburginteractivemap.com  |  Specialist: app-a11y  |  Date: 2026-09-29/30  |  Mode: read-only, no build

Conventions used below
- `bundle.pretty.js:N` = line N of `plan-work/bundle.pretty.js` (prettier-formatted copy of the deployed `assets/index-Cg8FAMXN.js`). `bundle.min.js` = the deployed minified file (byte-identical content).
- `index.html:N` = line N of the deployed `index.html` (SRC_DIR / DEPLOY_DIR, identical).
- `site-nav.css:N`, `site-nav.js:N` likewise. Chunk files: `HelpModal-CFV9T0zH.js`, `BookmarkPanel-C5YT4b5k.js` (minified, no line numbers; I quote strings).
- Component names are mine (the bundle is minified): e.g. `IO` = desktop timeline bar, `pO` = mobile layout, `dO` = layout chooser, `tO` = intro splash, `bO` = onboarding modal, `AO` = app root/toolbar, `gF` = desktop map canvas, `MF` = unit panel, `CF` = story panel, `LF` = event card, `FF` = search panel, `OF` = filter panel, `VF` = legend, `WF` = minimap, `qF` = toast stack, `nO` = commander-change cards, `XF` = NPS auto-tour, `KF` = monument markers, `Zk` = Follow Your Ancestor, `Yk` = Soldier's Eye View, `Xk` = Order of Battle modal, `Jk` = unit roster, `_O` = Virtual Walkthrough, `Vs` = toolbar button.
- Finding IDs are `app-a11y-NN`; audit references use the BRIEF IDs (C1…, H3…, A1…, N1).
- "Computed" = I computed it with the scripts saved in `plan-work/tmp-app-a11y/` (`contrast2.py`, `tokens.py`, `cvd.py`, `inventory.py`, `extract_styles.js`, `bridge_patch_check.py`). "Lighthouse" = the axe-core 4.13 results inside the live Lighthouse 13 JSON (`lh_mobile.json`, `lh_desktop.json`, run against the live home page).

---------------------------------------------------------------------------------------------------

## 0. Method, evidence quality and limits (read this first)

What I did
1. Read BRIEF and the earlier audit, then read the whole application region of the bundle (`bundle.pretty.js` lines ~96200–113377 = every React component the app ships, plus the zustand store at 9361–9449 and the map-layer/overlay helpers at 9746–10001) and both lazy chunks, `index.html` (all 760 lines, incl. 8 inline scripts), `site-nav.js/css`, `manifest.json`, `sw.js`, `assets/index-B4G7Z_2G.css`.
2. Built machine inventories: every `V.jsx/jsxs("tag", {...})` call in the app region (632 element sites), classified by tag/handlers/ARIA (`inventory.py` → `inventory.out.txt`); evaluated every inline style-object literal (294 sub-styles) with node (`extract_styles.js` → `styles.json`); computed WCAG contrast for 234 styled-text entries and for the non-text pairs (`contrast2.py`, `tokens.py`); simulated colour-vision deficiencies (Machado 2009 matrices, CIEDE2000) for the map palette (`cvd.py`).
3. Cross-checked my computed contrast against Lighthouse's own axe numbers on the live DOM: #777 on #0a0a14 = 4.39 (mine 4.40), #555 on #0a0a14 = 2.64 (mine 2.64), #8b6914 on #050508 = 4.00 (mine 4.00), #666 on #050508 = 3.54 (mine 3.55). The method reproduces axe.
4. Dry-ran the proposed Tier-0 string patches against the deployed `bundle.min.js` in a scratch copy: every FIND string matches exactly the expected number of times and the patched file passes `node --check` (`bridge_patch_check.py`). Nothing under DEPLOY_DIR / SRC_DIR / RECON_SRC was touched.

What I could NOT do (rules: no browser tools, no build, no installs)
- No screen-reader, keyboard or zoom run on the live site; no runtime `getBoundingClientRect()` measurements. Runtime-behaviour claims are labelled "from code" and each has a verification step in the test plan (§9).
- Target sizes and toolbar overflow widths are ESTIMATES from style objects (default `button` padding is 0 because `index.html:61` resets `padding:0` on `*`; glyph widths approximated). The earlier audit's measured values (toolbar buttons 28x26; 47 of 54 interactive elements < 32 px on desktop) are the better data; my estimates agree with them.
- Lighthouse only exercised the state on screen at load (onboarding/layout chooser + toolbar). Most panels were never open, so the "90" hides most defects (see §1).
- Screen-reader announcements described (e.g. "emoji names") are the typical behaviour of NVDA/JAWS/VoiceOver, not something I heard.

---------------------------------------------------------------------------------------------------

## 1. Executive summary

Verdict: the Lighthouse accessibility score of 90 (both form factors) is an automated-subset score on one screen state. Judged against WCAG 2.2 A+AA by code reading, the main app is not usable by keyboard-only or screen-reader users, and is only partly usable by low-vision, colour-blind, switch and voice users. I would grade it D (desktop) and D (mobile) for accessibility, not C+/C. The map experience — the product — has no non-visual or keyboard alternative at all.

Counts (from the code, see §4): of 55 Level A + AA success criteria, 23 fail, 10 partially pass, 12 pass, 10 are not applicable. Level A failures: 1.1.1, 1.3.1, 1.3.3, 1.4.1, 2.1.1, 2.1.4, 2.2.1, 2.4.1, 2.4.3, 2.5.1 (mobile), 3.3.1, 3.3.2, 4.1.2. Level AA failures: 1.3.4 (installed PWA), 1.4.3, 1.4.10, 1.4.11, 1.4.12 (likely), 1.4.13, 2.4.6, 2.4.11, 2.5.8, 4.1.3.

The seven facts that matter most

1. ZERO ARIA in the app. `grep aria-` over the whole app region (`bundle.pretty.js` 96200–113377) returns nothing; no `role:`, no `aria-live`, no `<main>/<nav>/<header>/<h1>` (only one `<h2>` at `:110648` and one `<h3>` at `:110700`, both inside the Walkthrough). All 75 `<button>` sites, 10 `<input>/<select>` sites and 7 `<a>` sites are unlabelled or named only by a glyph. Lighthouse's own axe output on the live page says: "No valid skip link found / Page does not have a heading / Page does not have a landmark region" (`lh_desktop.json`, audit `bypass`). (Lighthouse also reports `landmark-one-main` as passing; I cannot reconcile that with the code — the app renders no `<main>` — so treat it as an axe/Lighthouse quirk, not as evidence of a landmark.)
2. Keyboard-only users cannot get past the first screen. The "Choose Your Experience" cards (`bundle.pretty.js:102767`, `:102789`) and the intro "Skip intro ›" (`:101569`) are `<div onClick>` with no `tabIndex`, `role` or key handler. 17 functional controls across the app are click-only `div`/`canvas` (list in §2.1), including unit selection on the map itself (`:97365`), search results (`:98878`), the story-panel dots (`:98365`), monument markers (`:100914`), timeline event markers (`:112272`) and the mobile scrubber (touch-only, `:103177`).
3. The map is a `<canvas>` with no alternative. Units are drawn with `CanvasRenderingContext2D` (`lS`, `:96506–96688`); selection is `canvas.onClick` → nearest-unit hit test (`:97365–97377`, `:97327–97351`). Nothing exposes units, positions, events or state to the accessibility tree, and nothing lets a keyboard user select a unit. The 467-unit Order of Battle (`Xk`, `Jk`) is a useful start for a text alternative but is itself 8–11 px, unlabelled, non-interactive rows.
4. The global shortcut handler is hostile to AT and to the map. One `window` keydown listener (`:112966–113052`) fires on bare `S F L M H B ? 1 2 3 0 + - = Space ArrowLeft ArrowRight`, ignores only `INPUT` targets (`:112967`), never checks Ctrl/Alt/Meta (so Ctrl+F/Ctrl+S/Ctrl+L/Ctrl+1 also fire app actions), swallows Space on focused buttons, and runs at the same time as Mapbox's own keyboard handler when the map canvas (`tabindex=0`, `:94008`) is focused (Mapbox: arrows pan, Shift+arrows rotate/pitch, `+ - =` zoom, `:89742–89811`; app: arrows step the clock, Shift+arrows jump 12 ticks, `+ -` change speed). It fails 2.1.4 outright, and the timeline wrapper adds a second `onKeyDown` that double-fires (`:112216–112224`).
5. No dialog is a dialog. 13 overlays (splash, layout chooser, onboarding, help, bookmarks, ancestor, Soldier's Eye, Order of Battle, roster, tools sheet, walkthrough, layers, distance) have no `role=dialog`/`aria-modal`, no focus move (only 3 `autoFocus`/`.focus()` calls in the whole app), no trap/inert, no focus restore, and Esc is ignored inside text inputs (`:112967`) — including the search box that auto-focuses. Esc also fails to close the unit panel because it clears `selectedUnitId` but not `pinnedUnitId` (`:113034–113038` vs `MF` `:97909` `Ee = c || f`).
6. Colour carries meaning with nothing else. Union `#3a6bc4` and Confederate `#c43a3a` have identical luminance (computed contrast 1.02:1; achromatopsia ΔE2000 = 0.4) and the eleven "dispositions" are 3.5 px coloured dots on the canvas (`:96644–96651`). 62 of 234 text styles fail 4.5:1 (e.g. `#555` 2.64:1 ×12 uses, `#666` 3.43:1 ×31 uses, `#444` 2.02:1); 133 of 268 `fontSize` literals are below 12 px, 21 are ≤ 9 px, the smallest is 7 px (`:102611`).
7. The mobile layout is not a separate app: `AO` renders the desktop `IO` timeline, `XF` tour button, `VF` legend, `WF` minimap, `CF`/`LF` panels, `KF` monuments and `qF` toasts unconditionally (`:113244–113259`) underneath/over `pO` (`:113061–113064`). That is the root cause of audit C1/C2 (the off-screen 572 px transport row IS `IO`'s `Po.controls`, and it paints over `pO`'s bottom bar because both are `zIndex:100` and `IO` is later in DOM order) and also means duplicate Play/Prev/Next controls and focusable controls hidden under other UI for AT users.

Fastest path to visible improvement (Phase 0, ≈ 2–3 developer-days, no source needed; details in findings 01, 02, 29)
1. `index.html`: skip link, one sr-only `h1`, `<main id="root">`, `<nav id="extra-features">`, `color-scheme`, reduced-motion flag; add `a11y-shim.css` (two-tone focus ring, attribute-selector contrast overrides for the 8 failing inline colours, 12 px font floor, 44 px touch minimum, reduced-motion and forced-colors rules).
2. Validated string patches to the minified bundle (18 FIND strings, each verified to match exactly once and to leave a syntactically valid file): native integer timeline slider with name + `aria-valuetext`; remove the wrapper key handler that double-fires; guard the global key handler (modifiers, selects, buttons, Mapbox canvas, dialogs); keyboard-operable layout cards and a real Skip button; names for toolbar and ✕ buttons; labels for search/range inputs; toast stack as a polite `role=log`; reduced-motion flags for the intro/glow/interpolation.
3. `manifest.json`: drop `"orientation":"landscape"`.
Expected result: Lighthouse a11y 90 → ≈ 100 on the loaded state, keyboard users can enter the app and scrub time, forced-colors/reduced-motion baseline exists. It does NOT create the missing map alternative (Data View, unit cursor), dialog semantics or the non-colour encodings — those are findings 05, 08, 09, 17 and need source (N1).

Facts that refine or correct the earlier audit (all verified in code)
- The index.html "label patch" script is inert. It skips any button that already has a `title` or `aria-label` (`index.html:414`); every desktop toolbar button has a `title` (`:113287–113298`), and mobile tool buttons have text like "FFilter" that never equals a key of `LABELS` (`index.html:405–408`). So `labeled` stays 0 and no `aria-label` is ever added. Real accessible names today: "S", "F", "L", "B", "?" (letter content) and emoji CLDR names ("moai", "telescope", "star", "straight ruler", …) for the rest; `title` only becomes the description.
- Toasts DO auto-dismiss (4.5 s, `:99909`/`:99913`; commander cards 3 s, `:101707–101714`). I could not reproduce "toasts never auto-dismiss" from code. The WCAG problem is the opposite: information vanishes on a fixed 2.2.1 timer with no live region.
- The hover popup for units (`fF`, `:97063`) is dead code: it destructures `{hoveredUnit, mousePos}` but is rendered as `<fF map=… canvas=… />` (`:97384`) → always returns `null`. Unit info is click-only.
- The `H` "Toggle heatmap" shortcut (in the code `:113022`, in Help and the onboarding shortcut list `:111995`) toggles `showCasualtyHeatmap`, which nothing reads (grep: only the store `:9419/:9435` and the destructure `:112930`). A documented shortcut that does nothing.
- Share links `?t=…&u=…&z=…&ll=…` are written (`$k`, `:97823–97830`, bookmark URLs `:97862`) but never read: the only `URLSearchParams(...).get` in the app is `ancestor` (`:101019`). Copy-link and bookmark URLs do not restore state — which also blocks deep-link based testing.
- Two contradictory dates are on the desktop screen at once: the toolbar shows `July {day}` (`:113084–113087`, correct) while the clock chip shows `July {day+2}, 1863` (`:97428`, audit C3). The mobile layout's clock is correct (`:103144`). Three tick→clock formulas exist (`getTickTime` `:9371–9383` = 06:00 base on day 1, 04:00 on days 2–3; `JF` `:100836` and `QF` `:100998` = 05:00 base every day; `M4` `:9856` = 05:00 base for the day/night tint). Any accessible time string (slider `aria-valuetext`, announcements, transcript) must come from ONE formatter once C3/C4 are fixed.
- `assets/index-B4G7Z_2G.css` contains only Mapbox GL CSS. The app ships no focus, reduced-motion or forced-colors CSS of its own. The only global focus rule is `:focus-visible {outline:2px solid #c9a24b}` in `site-nav.css:138`, which inline `outline:"none"` (search input `:98996`, ancestor input `:101356`, timeline wrapper `:112385`) defeats, and `site-nav.css:43-47`/`:110` explicitly remove the outline on the "Ask the Historian" pin and on menu cards (replacement indicator: 1.14:1 and 1.71:1 background change, computed).
- `animation: "slideIn 0.2s ease"` on toasts (`:100024`) references a keyframes rule that exists nowhere (checked index.html, site-nav.css, app CSS) — dead.

---------------------------------------------------------------------------------------------------

## 2. Inventory (the "every interactive control and dialog" deliverable)

### 2.1 Click-only, non-focusable "controls" (WCAG 2.1.1, 4.1.2, 2.5.3) — 17 functional + 7 backdrop sites

| # | Component (line) | Element | What it does | Fix (finding) |
|---|---|---|---|---|
| 1 | LayoutChooser `dO` (`bundle.pretty.js:102767`, `:102789`) | `div` cards ("Select Desktop →" / "Select Mobile →" are inner divs) | Chooses the whole UI; `onMouseEnter` styling only | `button`/radio card, focus style, persist (03, 04) |
| 2 | IntroSplash `tO` (`:101569`) | `div` "Skip intro ›" (#444 on dark, 11 px) | Skips the 4.3 s auto fast-forward | real `button`, 44 px (03) |
| 3 | MapCanvas `gF` (`:97365–97377`) | `canvas onClick` | Selects/pins nearest unit | keyboard unit cursor + Data View (09, 08) |
| 4 | Minimap `WF` (`:99811–99818`) | `canvas onClick`, `title="Click to navigate"` | Fly-to; only single-pointer pan alternative on desktop | focusable control + "Go to location" select (10) |
| 5 | StoryPanel `CF` (`:98365–98376`) | `div` dots (6 px) | Jump between stories | `button` list with `aria-current`, 24+ px hit area (04) |
| 6 | SearchPanel `FF` (`:98855–98866`, `:98878–98940`) | `div` quick-links and result rows | Selects a unit | combobox/listbox pattern (14) |
| 7 | NpsAutoTour `XF` (`:100366–100379`) | `div` dots (8 px) | Jump between tour stops | `button`s (04) |
| 8 | MonumentMarkers `KF` (`:100914–100940`) | `div` (emoji 🏛) with `onClick`+`onMouseEnter/Leave`; tooltip is hover-only `pointerEvents:none` (`:100974`) | Jump to a moment | `button` + focus/hover popover (22) |
| 9 | FollowAncestor `Zk` (`:101173`, `:101249`) | `div` result rows, `div` journey entries | Pick regiment / jump to tick | listbox / buttons (04, 14) |
| 10 | SoldiersEye `Yk` (`:101992`) | `div` location rows | Opens Street View link view | buttons (04) |
| 11 | Timeline `IO` markers (`:112270–112293`) | 8 px `div`, `title` only | Jump to key tick | `button` w/ 24+ px hit area (07) |
| 12 | MobileLayout `pO` scrubber (`:103177–103188`) | `div` with `onTouchStart/Move` only | Scrubs time; no mouse, no keyboard, no AT | native slider (07, 24) |
| 13 | Walkthrough `vA` monument cards (`:110690–110731`) | `div onClick` (the mobile-branch cards even receive a no-op `onClick:()=>{}`, `:110961`) | Fly to monument (desktop branch only) | `button`/link (25) |
| 14 | BookmarkPanel chunk | `div itemLeft onClick` | Jump to bookmark | `button` (04) |
| — | Backdrops: `Zk :101135`, `Yk :101963`, `Xk :102373`, `pO tools :103368/:103371`, HelpModal + BookmarkPanel chunk overlays | `div onClick` "click outside to close" | Close | acceptable as extra, never as the only way; needs Esc (05) |

### 2.2 Buttons and their accessible names today (75 JSX sites; many render several instances)

Counts by component (from `inventory.py`): MobileLayout 11, Walkthrough 9, Timeline 7, FilterPanel 6, NpsAutoTour 6, StoryPanel 5, OnboardingModal 5, UnitPanel 3, Legend 3, FollowAncestor 3, SearchPanel 2, Minimap 2, SoldiersEye 2, Toolbar 2 (+`Vs` ×13 instances), MapCanvas 1, EventCard 1, ToastStack 1, OrderOfBattle 1, UnitRoster 1, SoundToggle 1, MapLayers 1, DistanceTool 1; plus HelpModal (3) and BookmarkPanel (7) chunks. 0 of 75 have any `aria-*` attribute. Grouped problems:

| Group | Sites | Accessible name today | Needed |
|---|---|---|---|
| Glyph "✕" close/dismiss | 18 in main bundle (`ji :97976`, `Cr :98343`, `Vc :98635`, `ar :98815`, `zr :99140`, `Fr :99457`, `Td :99808`, `eh :99939`, `Zr :100396/:100454`, `lr :101157`, `Or :101985`, `jo :102386`, `gp :102691`, `pO :103250/:103379/:103516/:103628`) + 3 in chunks + 2 letter-"X" (`GtbgLayers :112532`, `GtbgDist :112881`) | "✕" / "multiplication x" / "X" | `aria-label="Close <thing>"` (icon component) |
| Transport glyphs | `IO :112309–112338` (⏮ ◀ ⏸/▶ ▶ ⏭), `pO :103218–103233` (◀ ⏸/▶ ▶ + "1×"), `CF :98357/:98378` (◀ ▶) | the glyph; Play and Next are both "▶" | text names: "Back one hour", "Previous tick", "Play"/"Pause", "Next tick", "Forward one hour"; `title` kept only as tooltip |
| Toolbar `Vs` ×13 (`:113145–113229`, `:113287–113298`) | S, F, ☰, L, 🗿, 🔭, ⭐, 📏, 🗺, 📍, 🔍, B, ? | letters / emoji names; `title` = description; active state colour-only | `aria-label` from title, `aria-pressed` for toggles, SVG icons `aria-hidden` |
| Two buttons, same function | "S" (`:113145`) and "🔍 Find Unit / Location" (`:113212`) both toggle the search panel | different names for one action (3.2.4) | one control |
| Toggle chips | Filter side/type/disposition chips (`:99152`, `:99185`, `:99224`), Search sort (`:98833`), Trails (`:97378`), Toggle Units (`:113096`), Sound (`:111774`), Video (`:100427`), Legend/day/speed/chip groups | on/off = colour only (`#555` on `#111` off) | `aria-pressed` (or `role=radio/tab`), non-colour state cue |
| Tabs | Legend tabs (`:99439`), Help tabs (chunk), Walkthrough tabs (`:110879`, `:111156`), mobile day tabs (`:103161`) | plain buttons | `role=tablist/tab/tabpanel` + arrow keys, or radio group |
| Mobile Tools grid (14) | `:103488` | icon span + label text ("FFilter", "BBookmarks", "??Help") | `aria-hidden` on icon span |
| Symbol-only FABs | Legend `⊞` (`:99568`), Minimap `⊡` (`:99825`), share `⎘` (`:97963`), unpin `📌` (`:97970`) | glyph names ("squared plus", "next page"…) with `title` as description | labelled |

### 2.3 Form controls (10 sites) and links (7)

| Control | Line | Label today | Issue |
|---|---|---|---|
| Timeline slider (`IO`) | `:112294–112303` | none (Lighthouse `label` failure) | `min=0 max=100 step=.01` → SR announces "45.32" (percent), no unit/valuetext; `outline` removed on parent; value is not a tick |
| Filter min-strength range | `:99255–99263` | none | no name, no valuetext |
| Search input | `:98818–98826` | placeholder only; `outline:none` (`:98996`); Esc swallowed | 3.3.2 / 2.4.7 |
| Ancestor input | `:101163` | placeholder only; `outline:none` (`:101356`) | same |
| Walkthrough monument search ×2, group `select`, 2 checkboxes | `:110928`, `:111213`, `:111241`, `:111038`, `:111074` | placeholder only; checkbox text is a sibling `span` inside `label` (OK) | global key handler ignores `select` |
| Map Layers checkboxes ×7 | `:112556` | text is a sibling `span`, not a `label` — clicking text does nothing | 1.3.1 / 3.3.2 / 2.5.3 |
| Bookmark name (chunk) | `BookmarkPanel` `form` | placeholder only, `autoFocus` | no error/empty states |
| Links | `:113114` (tutorial PDF `download`), `:112362` (mailto), Street View `:102036/:102057/:110666`, NPS video `:110676`, "View on map ↗" ×100 `:110720` | text present | repeated identical "View on map ↗" ×100 (2.4.4 in context is fine inside cards; give `aria-label="View {name} on Google Maps"`) |

### 2.4 Dialogs, overlays and panels

| Overlay | Code | z | `role`/`aria-modal` | Initial focus | Trap / inert | Esc | Focus restore | Backdrop |
|---|---|---|---|---|---|---|---|---|
| Intro splash `tO` | `:101472` | 1000 | none | none | none | no | — | — |
| Layout chooser `dO` | `:102752` | 1000 | none | none | none | no | — | — |
| Onboarding `bO` | `:111856` | 1000 | none | none | none | no (has Skip buttons) | — | no |
| Help (chunk) | HelpModal | 600 | none | none | none | yes (global `pe`) | no | click |
| Bookmarks (chunk) | BookmarkPanel | 600 | none | `autoFocus` on new-bookmark input only | none | yes (`ht`) | no | click |
| Follow Ancestor `Zk` | `:101008` | 700 | none | `.focus()` on input (`:101016`) → then Esc is swallowed | none | yes (`hi`) but not from input | no | click |
| Soldier's Eye `Yk` | `:101958` | 800 | none | none | none | yes (`ki`) | no | click |
| Order of Battle `Xk` | `:102321` | 900 | none | none | none | yes (`Br`) | no | click |
| Unit roster `Jk` (desktop, non-modal) | `:102660` | 900 | none | none | none | yes (`vi`) | no | — |
| Tools sheet (mobile) | `:103368` | 500 | none | none | none | no | no | click |
| Roster/legend slide panels (mobile) | `:103505`, `:103617` | 400 | none | none | none | no | no | — |
| Walkthrough `_O` (full screen) | `:110733` | 500 | none | none | none | yes (`Ut`) | no | — |
| Search panel `FF` | `:98808` | 95 | none | `autoFocus` input | none | yes via store, not from input | no | — |
| Filter panel `OF` | `:99117` | 95 | none | none | none | yes via store | no | — |
| Legend `VF`, Story `CF`, Event card `LF` | `:99426`, `:98307`, `:98614` | 85–92 | none | none | none | NO (local state) | — | — |
| Unit panel `MF` | `:97936` | 92 | none | none | none | NO if unit pinned | — | — |
| Layers `GtbgLayers`, Distance `GtbgDist` | `:112505`, `:112853` | 1000 | none | none | none | NO | no | — |
| NPS tour panel/PiP `XF` | `:100382`, `:100442` | 300/400 | none | none | none | NO (tour autoplay only stops via ✕) | — | — |
| Extra Features menu (`index.html`) | `:176–237`, `:285–353` | 999999 | `aria-expanded` on button ✓ (`:313–314`); menu `div` no role | none (stays on button) | none | yes (`:323`), focus not returned | n/a | outside-click |

### 2.5 Keyboard handlers (all of them)

| Handler | Where | Keys | Problems |
|---|---|---|---|
| Global | `bundle.pretty.js:112966–113052` (`window`) | Space, ←, →, Shift+←/→, 1 2 3, + = -, 0, F, S, L, M, H, B, ?, Esc | skips only `INPUT`; no `SELECT/TEXTAREA/contenteditable/dialog` guard; no Ctrl/Alt/Meta guard; no `event.repeat` guard; Space `preventDefault` on any target incl. buttons/links; conflicts with Mapbox handler (`:89757–89811`) when map focused; `H` no-op; Esc misses 12+ overlays (§2.4) and the pinned unit; speed +/- go to 16× while UI offers 8× |
| Timeline wrapper | `IO :112216–112224`, `tabIndex:0` `:112223`, `outline:"none"` `:112385` | Space, ←, →, Shift | fires for every keydown bubbling from its buttons; then the global handler fires too → ← / → advance 2 ticks (or 24 with Shift), Space toggles twice (net no-op) when focus is on a transport button/wrapper; focusable wrapper with no visible focus |
| Help chunk `useGlobalKeyboard` | `HelpModal-…js` export `b` | duplicate of the above | appears unused (no import in main bundle) — dead code to delete |
| Extra Features | `index.html:323` (`document`) | Esc | closes menu; ok |
| Site-nav (sub-pages) | `site-nav.js` Esc | Esc | ok |
| Mapbox (built in) | `:89742–89811` | arrows pan, Shift+arrows rotate/pitch, + = - zoom | on by default (`keyboard: !0`, `:91902`); collides with app keys |

### 2.6 Time-limited or auto-changing content

| Item | Code | Duration | Live region | Pause/extend |
|---|---|---|---|---|
| Battle toasts (KIA/wounded/captured) | `qF :99909–99916` | 4.5 s | none | none (2.2.1) |
| Commander-change cards | `nO :101707–101714` | fade 1.2 s, gone 3 s | none | none |
| "Link copied" text/✓ | `MF :97931` (2 s), `Zk :101122` (4 s), bookmarks chunk (2.5 s) | 2–4 s | none | none |
| Intro auto fast-forward | `tO`, `eO=3500` `:101471` | ≈ 4.4 s + 0.6 s fade | none | only mouse-only Skip |
| NPS Auto Tour | `XF :100329–100341` | sets `isPlaying:true`, speed 2, then a `setTimeout` stops it | none | Esc does not stop it |
| Contact-glow pulse on canvas | `lS :96615` `0.4+0.6·abs(sin(t/300))` ≈ 1.06 Hz (below 3 Hz flash threshold: 2.3.1 pass) | while playing | — | Pause works (2.2.2 pass for playback) |
| Day/night tint | `A4 :9889–9896` `transition: background 8s ease` | 8 s | — | none (slow; not a flash) |
| FPS debug text drawn on canvas and in `_F` | `:96684–96687`, `:97446–97448` | when FPS < 45 / < 55 | — | user-visible debug (H7) |

---------------------------------------------------------------------------------------------------

## 3. Visual accessibility measurements (computed)

### 3.1 Text contrast — 62 of 234 styled-text entries fail AA (full JSON: `tmp-app-a11y/contrast2.json`)

Method: every `color` in every inline style object, against the nominal opaque background of its panel (panels are 0.80–0.98 alpha dark over the map; nominal backgrounds `#03030a … #1d2330`); large-text threshold (>= 24 px, or >= 18.66 px bold) uses 3:1. Reproduces Lighthouse on the live DOM (see §0).

Failing colour tokens (ratio on `#0a0a14` unless stated; uses = number of style entries):

| Text colour | Ratio | Uses | Typical elements |
|---|---|---|---|
| `#444` | 2.02 | 3 | intro "Skip intro ›" 11 px (`:101670`), layout-chooser note 11 px (`:102891`), mobile tick counter 10 px (`:103853`) |
| `#555` | 2.64 | 12 | "Skip introduction" 12 px (`:112097`, Lighthouse fail), toast ✕ + tick (`:100041`, `:100056`), event-card ✕ 14 px (`:98694`), filter range labels (`:99375`), OOB unit counts 9 px (`:102512`), "No placement data" (`:101463`) |
| `#666` | 3.43 | 31 | close ✕ on 5 panels (`:98169`, `:98468`, `:99329`, `:99619`, `:103870`…), "Dismiss" (`:98532`), unit id 10 px (`:98140`), roster status 9 px (`:103977`), toolbar tick label 11 px (`:113354`, Lighthouse fail), legend notes (`:99634`) |
| `#777` | 4.40 (4.25 on `#0f0f19`) | 6 | onboarding hero line 13 px (`:112059`, Lighthouse fail), breadcrumbs 10 px (`:98176`), legend row desc 10 px (`:99633`) |
| `#8b6914` (gold-dim text) | 3.87 | 7 | toolbar day label (`:113348`, Lighthouse fail 4.0), section heads 9–10 px (`:99010`, `:100524`), chooser subtitle 13 px (`:102841`), intro subtitle 14 px (`:101626`) |
| `#3a6bc4` (as text) | 3.83 | 1 | Street View link 11 px (`:102207`) |
| `#cc4444` (as text) | 4.20 | 1 | "old commander" 11 px (`:101792`) |
| `rgba(200,168,74,.45)` | 2.54 | 1 | "Created by" 11 px (`:101594`) |
| `#6d7a8a` | ≈3.6 on `#1c2230` | 1 | walkthrough monument GPS 10 px (`:111644`) |

Passing but notable: `#888` 5.56:1 on `#0a0a14` (used 30×) is AA (4.48 on `#1d2330`, borderline); black `#000` badge text on the 11 disposition colours passes for 10 of 11 (the default `#445566` badge = 2.74:1 fails, `:98104`). Lighthouse mobile lists 2 contrast nodes and desktop 4 — all inside the token set above.

Site-nav/overlay text (index.html + site-nav.css): menu group subtitle `#6f7686` on `#12121e` = 4.08 (`site-nav.css` `.gtbg-group-why`), footer and boot caption `#6f7686` on `#0a0a14` = 4.32 — both fail 4.5:1.

### 3.2 Non-text contrast (1.4.11) and colour-only encodings (1.4.1)

| Element | Measurement | Verdict |
|---|---|---|
| Side colours on map (`sA #3a6bc4`, `aA #c43a3a`, `:96427–96428`) | luminance contrast 1.02:1; ΔE2000 (protan 42, deutan 51, tritan 66, achromat **0.4**) | hue-only encoding: fine for most dichromats, indistinguishable in grayscale/achromatopsia/low-vision monochrome and print; fails 1.4.1 unless redundantly coded |
| Side text labels on canvas (`#aaccff` / `#ffbbaa`, `:96680`) | luminance 1.01:1, achromat ΔE 0.3 | same |
| Unit fill vs imagery | blue vs typical satellite tones: forest 1.91, field 1.51, road 2.23, wheat 2.47; red: 1.88, 1.53, 2.27, 2.51 | fails 3:1 (1.4.11); needs an outline/halo — the existing 1 px `#1a3a7a/#7a1a1a` stroke (`:96603`, `:96639`) is dark-on-dark |
| Disposition dot (`Lp`, `:96306–96318`) | 7 px dots; Reserve `#226622` vs forest `#2f4a2b` = 1.40; Bivouac `#555` vs shadow = 2.14; Dismounted `#88cc88` vs field = 1.79; "Line of Battle" (most common) has no dot colour at all (`null` → falls back to side colour) | 11 categories encoded by colour alone at 7 px |
| Legend vs canvas | Legend `NF` (`:99384`) and unit-panel badges `fA` (`:98090`) use `#44aaff/#668844/#888866/#ffdd00/#ccaa00/#44cc88/#228855`; canvas `Lp` uses `#66aaff/#226622/#555555/#f5c518/#c8a84a/#44aa44/#88cc88` for the same dispositions; Legend "Sides" tab says "Dot outline = side color / Dot fill = disposition color" but the canvas draws no outline | three palettes for one concept; legend does not describe the map |
| Toolbar toggle state (`Vs`, `:113287`) | active = `rgba(200,168,74,.15)` fill + `#8b6914` border (4.0:1) + `#e8d5a3` text vs inactive `#888` | colour/fill only, no `aria-pressed`; border passes 3:1 |
| Filter chips OFF | text `#555` on `#111` = 2.53; border `#333` on panel = 1.56; disposition chip OFF text `#444` on `#111` = 1.94, border `#222` = 1.24 | state and boundary fail 3:1 |
| Text inputs | border `#445` on panel `#0f0f19` = 2.00; fill `#1a1a2a` = 1.11 | control boundary fails 3:1 |
| Timeline slider | native track hidden (`appearance:none; background:transparent`, `:112416–112424`); day tints are 25% opacity (≈1.9:1); event markers `#0044cc` = 2.35 vs bar, `#cc0000` 3.11, `#888800` 4.85, all 8 px | track/markers fail 3:1; thumb uses the UA default |
| Map line layers | roads `#44bb44` vs forest 3.95; breastworks `#884422` vs forest 1.36; rivers `#8844cc` vs forest 1.75; farm outlines `#886633` @0.5 opacity 1 px = 1.33 (`:9752–9838`) | informational lines below 3:1 over imagery; needs casing/halo |
| Focus ring `#c9a24b` | 8.21 on `#0a0a14`, 4.10 vs forest, **1.15 vs wheat-field imagery** | ring disappears over bright imagery; needs two-tone ring |
| Menu-card focus (`site-nav.css:110`) | bg change `#12121e`→`#1a3a7a` = 1.71 | weak indicator; `outline:none` |
| "Ask the Historian" pin focus (`site-nav.css:43–47`) | bg/glow change ≈ 1.14 | effectively invisible focus |

Proposed replacements are in §5.1 (tokens, all ≥ 4.5:1 and most ≥ 7:1 on every panel background) and §5.2 (palette and redundant coding).

### 3.3 Type size (1.4.4, 1.4.12, BRIEF "text ≥ 12 px")

`fontSize` literals in the app region: 268; < 12 px: 133 (50%); ≤ 10 px: 67 style entries; ≤ 9 px: 21; smallest 7 px (`:102611`, OOB strength numbers) and 8 px ×7 (`:102287–102310`, `:102594–102599`, `:103294`). Distribution (px: count): 7:1, 8:7, 9:13, 10:56, 11:56, 12:52, 13:23, 14:16, 15:6, 16:13, 18:5, 20:7, 22:4, 24+: 9. All sizes are absolute px in inline styles: nothing scales with the user's browser/OS text-size preference (only page zoom). Canvas labels are 8/9/10 px bold (`:96663`); Mapbox layer labels 9 px (rivers `:9788`), 10 px (roads `:9763`), 12–13 px elsewhere (`:112656`, `:9830`).

### 3.4 Target size (2.5.8 min 24 px; BRIEF 44 px touch) — ESTIMATES (height ≈ 1.2·fontSize + 2·padY + 2·border; `padding:0` reset at `index.html:61`)

| Control | Style (line) | Est. box | 2.5.8 | 44 px touch |
|---|---|---|---|---|
| Toolbar `Vs` ×13 | `padding 4px 10px`, 12 px mono (`:113356`) | 28–40 × 26 (audit measured 28×26) | pass | fail |
| ✕ close buttons (no padding) | `closeBtn` 14 px (`:98169`, `:98468`, `:99329`), 18 px (`:100540`), 11 px (`:99870`) | 11–16 × 13–21 | **fail** (unless spacing exemption) | fail |
| Mobile `popupClose` 20 px, `slidePanelClose` / `toolsClose` 22 px | no padding (`:103870`, `:103937`, `:104061`) | ≈ 18–20 × 23–25 | **fail** / borderline | fail |
| Story dots 6 px, tour dots 8 px, timeline markers 8 px, legend dots | `:98500`, `:100497`, `:112277` | 6–8 px | **fail** | fail |
| Speed buttons ×6 (`Po.speedBtn`) | 11 px, `padding 3px 7px` (`:112442`) | ≈ 26 × 20 | **fail** (height) | fail |
| Desktop transport buttons (`Po.btn`) | 14 px, `padding 4px 10px` (`:112431`) | ≈ 34 × 27 | pass | fail |
| Filter chips / disposition chips | `zr.chip` 12 px `4px 12px`; `zr.dispChip` 10 px `4px 6px` (`:99357`, `:99366`) | ≈ 60 × 26 / ≈ 90 × 22 | pass / **fail** (height) | fail |
| Mobile day tabs | `minHeight:42` (`:103763`) | 42 | pass | fail by 2 px |
| Mobile `ctrlBtn` 52, `playBtn` 64, `speedBtn`/`moreBtn` `minHeight:44`, `toolBtn` 72 | `:103820–104085` | ≥ 44 | pass | pass |
| Modal close buttons (`lr`, `Or`, `jo`, `gp`) | `minWidth/minHeight:44` (`:101341`, `:102118`, `:102485`, `:102744`) | 44 | pass | pass |
| Mobile scrubber | track 36 px, thumb 24 px (`:103784`, `:103802`) | 36 / 24 | pass (24) | fail |
| Mapbox zoom/compass (library-created; absent on mobile) | library CSS | 29 × 29 | pass | fail |
| Extra Features `#ef-toggle` / `#ef-btn` | `index.html:212–236` | 30 × 30 / ≈ 32 × 130 | pass | fail |

Lighthouse `target-size` passed in the lab run, but it evaluates only the DOM present at load (layout chooser + toolbar) and exempts spacing-compliant controls; it does not test any open panel.

### 3.5 Reflow, zoom, text spacing, orientation (1.4.4, 1.4.10, 1.4.12, 1.3.4) — from code, verify in §9

- `index.html:62` `html, body {overflow:hidden; width/height:100%}` and `:66–70` `#root {position:fixed; contain:strict}`: nothing can scroll; anything wider or taller than the viewport is simply lost.
- Desktop toolbar (`bundle.pretty.js:113074–113232`): left cluster (title + day + tick label ≈ 290–300 px) + an absolutely centred cluster (`toolbarCenter`: left 50%, translateX(-50%), `:113336`; Toggle Units + Download Tutorial PDF + Walkthrough ≈ 540 px) + right cluster (13 buttons ≈ 420–470 px). Using the measured 28 px button width the centre and right clusters begin to overlap below ≈ 1400 px viewport width, and left/centre below ≈ 1150 px. At 200% zoom on a 1920 px screen (960 CSS px) the toolbar is overlapping/clipped; at 400% (480 CSS px) most of it is unreachable. Estimate — verify with the overlap sweep in §9.
- Fixed pixel panels: search 440 px centred with `translateX(-50%)` (`:98953–98968`) overflows both sides below 460 px; timeline controls row (`Po.controls`, `:112425–112430`) is `nowrap` and roughly 800 px wide by my estimate (5 buttons + 6 speed buttons + tick counter + credit line + e-mail) with `justify-content:center` → negative left overflow — the same defect as audit C1 but on the desktop layout at any viewport narrower than that (estimate; verify).
- Style constants evaluated ONCE at module load: `ji.panel` `window.innerWidth < 500 ? … : …` (`:98111–98115`) and `gp.panel` `window.innerWidth < 560` (`:102708–102712`). Zooming or rotating after load never re-lays them out. `gO()` (`:110614`, 860 px) is the only reactive breakpoint.
- Mobile layout: fixed 52 px top bar + 42 px day tabs + 140 px bottom bar (`:103715`, `:103744`, `:103770`): at 400% zoom / landscape phones (812×375) map height ≈ 141 px or less; `overflow:hidden` and `touch-action:none` on the root (`:103704–103705`) — likely blocks browser pinch-zoom of the UI on Android Chrome (verify on device).
- Text spacing (1.4.12): fixed heights (toolbar `height:48`, mobile bars 52/140, `dayTab minHeight`), `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` on roster names and unit-panel values (`:97198–97207`, `:103968–103976`, `:102279–102282`) will clip when line-height/letter-spacing are increased. Expected fail; verify with the WCAG text-spacing style injection in §9.
- Orientation (1.3.4): `manifest.json` `"orientation": "landscape"` locks the installed PWA to landscape (E1). In-browser use is unaffected.
- Language: `<html lang="en">` ✓ (`index.html:2`); no foreign-language passages.


---------------------------------------------------------------------------------------------------

## 4. Criterion-by-criterion table — WCAG 2.2 Level A and AA (main app: index.html shell + bundle UI, desktop and mobile layouts)

Status legend: FAIL = definite failure from code/measurement; PARTIAL = passes in some places/states; PASS; N/A. "(verify)" = needs the runtime check named in §9. WCAG 2.2 removed 4.1.1 Parsing; 3.2.6 and 3.3.7 are Level A, 2.4.11/2.5.7/2.5.8/3.3.8 are AA.

| SC | Lvl | Status | Evidence (file:line) | Fix |
|---|---|---|---|---|
| 1.1.1 Non-text Content | A | FAIL | Map units/labels/trails are canvas pixels with no alternative (`:96506–96688`, `:97365`); minimap canvas `title` only (`:99811`); emoji/glyph icons carry meaning ("🗿", "⊞", "⎘"); SVG arc in clock unlabeled (`:97451`); Street View/NPS iframes are titled ✓ (`:110665`, `:100466`) | 08, 09, 12, 13 |
| 1.2.1 / 1.2.2 / 1.2.3 / 1.2.4 / 1.2.5 Time-based media | A/AA | N/A (verify NPS video) | App plays generated cannon audio only (`jk :96327`, opt-in, off by default); NPS videos are third-party pages (`:100079`, `:110675`) — confirm captions + audio description exist on nps.gov | 25 |
| 1.3.1 Info and Relationships | A | FAIL | No headings/lists/tables/landmarks; hierarchy by `padding-left` in OOB/roster (`:102251`, `:102558`); key/value rows and sections are `div>span` (`:98014–98086`); tabs/toggles are plain buttons; mobile day tabs, legend tabs no roles; unit panel sections are `div`s | 04, 13, 15 |
| 1.3.2 Meaningful Sequence | A | PARTIAL | DOM order ≠ visual: `MF` unit panel is the last child of `AO` (`:113283`) though it renders top-left; `#extra-features` is first in DOM but top-right; overlays at DOM start | 05, 15 |
| 1.3.3 Sensory Characteristics | A | FAIL | "Dot outline = side color / Dot fill = disposition color" (`:99519`); tour text "large blue dot in Herbst Woods", "the red wave", "bottom-left cluster" (`:111839`, `:111851`, `:111846`); onboarding banner "top right" (`index.html:377`) | 17, 27 |
| 1.3.4 Orientation | AA | FAIL (installed PWA) | `manifest.json` `"orientation":"landscape"` (E1) | 29 |
| 1.3.5 Identify Input Purpose | AA | N/A | No personal-data fields | — |
| 1.4.1 Use of Color | A | FAIL | Side and disposition colour-only (§3.2); filter/toolbar state colour-only; legend/canvas palette mismatch | 17, 13 |
| 1.4.2 Audio Control | A | PASS | Sound is opt-in, default off (`yO :111768`); no autoplay audio | 13 (name/`aria-pressed`) |
| 1.4.3 Contrast (Minimum) | AA | FAIL | 62/234 text styles < 4.5:1 (§3.1); Lighthouse fails on live DOM | 16 |
| 1.4.4 Resize Text | AA | PARTIAL | Page zoom to 200% works (viewport meta has no `maximum-scale`, `index.html:5`) but clips/overlaps (§3.5); all sizes px → ignores OS/browser text-size setting; mobile root `touch-action:none` (`:103705`) | 18, 20 |
| 1.4.5 Images of Text | AA | PARTIAL | Unit labels/fps text drawn on canvas (`:96663–96687`); essential map labelling but not reproducible as text | 08, 18 |
| 1.4.10 Reflow | AA | FAIL | `overflow:hidden` shell + fixed clusters; toolbar/timeline overlap or clip < ~1400 px; 400% unusable (§3.5). (The map itself is exempt as 2-D content; controls and panels are not) | 20 |
| 1.4.11 Non-text Contrast | AA | FAIL | Chips/inputs/slider/markers/lines/focus ring below 3:1 (§3.2) | 16, 17, 23 |
| 1.4.12 Text Spacing | AA | FAIL (likely; verify) | Fixed heights + `nowrap/ellipsis` clip (§3.5) | 18, 20 |
| 1.4.13 Content on Hover or Focus | AA | FAIL | Monument tooltip is hover-only, `pointer-events:none` (not hoverable), not dismissible, no focus trigger (`:100944–100959`, `:100974`); timeline markers/toolbar rely on native `title` (`:112275`, `:113291`); injected star overlay uses `title` (`index.html:667`) | 22 |
| 2.1.1 Keyboard | A | FAIL | 17 click-only controls (§2.1) incl. layout chooser, unit selection, results lists; mobile scrubber touch-only; Distance tool is click-only on the map (`:112758`); map units unreachable | 03, 04, 08, 09, 14, 24 |
| 2.1.2 No Keyboard Trap | A | PASS (verify iframes) | No trap code; modals do not trap either (that is a separate failure, 2.4.3). Verify Google Street View iframe (`:110660`) is Tab-escapable | 05 |
| 2.1.4 Character Key Shortcuts | A | FAIL | Bare-letter/number/symbol shortcuts with no off/remap/focus-scope (`:112966–113052`) | 06 |
| 2.2.1 Timing Adjustable | A | FAIL | Toasts 4.5 s, commander cards 3 s, copy messages 2–4 s: no extend/disable (§2.6) | 11 |
| 2.2.2 Pause, Stop, Hide | A | PARTIAL | Playback is pausable ✓; intro fast-forward (≈4.4 s, under the 5 s threshold) has mouse-only skip; NPS tour autoplay not stoppable with Esc; loop `boot-bar` is loading (exempt) | 21 |
| 2.3.1 Three Flashes | A | PASS | Pulse ≈ 1.06 Hz (`:96615`) | 21 |
| 2.4.1 Bypass Blocks | A | FAIL | Lighthouse `bypass`: no skip link/heading/landmark; app toolbar (13 buttons) + overlay precede the map | 01, 15 |
| 2.4.2 Page Titled | A | PASS | `<title>` present (`index.html:14`); SPA state does not update it (optional) | 15 |
| 2.4.3 Focus Order | A | FAIL | Panels open later in DOM than their trigger (Filter/Search/Legend/Story/Unit follow the map canvas, `:113242–113283`); modal layers don't inert what's behind; hidden layers focusable | 05, 15 |
| 2.4.4 Link Purpose (in context) | A | PARTIAL | Nav links fine; "View on map ↗" ×100 identical (`:110726`) | 25 |
| 2.4.5 Multiple Ways | AA | PASS | Extra Features menu, sitemap, search (sub-pages) | — |
| 2.4.6 Headings and Labels | AA | FAIL | No headings in app shell; unlabeled slider/inputs | 13, 14, 15 |
| 2.4.7 Focus Visible | AA | PARTIAL/FAIL | Global ring exists (`site-nav.css:138`) but `outline:"none"` inline on search/ancestor inputs and timeline wrapper; ring removed on Historian pin/menu cards (`site-nav.css:43–47`, `:110`); ring vanishes over bright imagery (1.15:1) | 23 |
| 2.4.11 Focus Not Obscured (Min) | AA | FAIL (verify) | `#extra-features` `position:fixed; z-index:999999` moves among six screen positions (`index.html:176–206`, `:535–590`) and overlays the story panel (`top:60;right:16`, `:98418`), toasts (`top:60;right:16`, `:100008`), Mapbox controls; mobile bottom bars cover content | 15, 23 |
| 2.5.1 Pointer Gestures | A | FAIL (mobile) / PASS (desktop) | Mobile map has no zoom buttons (`pO` map init `:102981–102989`, no `addControl`; desktop has `NavigationControl` `:97252`) → zoom-out needs a two-finger gesture | 10, 24 |
| 2.5.2 Pointer Cancellation | A | PASS | Actions on `onClick`; mobile scrubber acts on touchstart but is reversible | — |
| 2.5.3 Label in Name | A | PARTIAL | Voice users cannot say "Search"/"Filter" for an "S"/"F" button; glyph buttons have no speakable name | 13 |
| 2.5.4 Motion Actuation | A | N/A | No device-motion input in the main app (AR page separate) | — |
| 2.5.7 Dragging Movements | AA | PARTIAL/FAIL (mobile) | Desktop: minimap click and keyboard-pan exist; mobile: pan is drag-only, no pan buttons, minimap is a static picture (`:103288–103340`); scrubber tap works | 10, 24 |
| 2.5.8 Target Size (Minimum) | AA | FAIL | ✕ buttons, dots, markers, speed/disposition chips < 24 px (§3.4). Lighthouse `target-size` passed only for the initial state | 19 |
| 3.1.1 Language of Page | A | PASS | `lang="en"` | — |
| 3.1.2 Language of Parts | AA | PASS | None needed | — |
| 3.2.1 On Focus | A | PASS | — | — |
| 3.2.2 On Input | A | PASS | Filters update the map live (not a change of context) | — |
| 3.2.3 Consistent Navigation | AA | PASS | Toolbar identical on every desktop state (mobile layout intentionally differs) | 24 |
| 3.2.4 Consistent Identification | AA | PARTIAL | Same function, different names: "S" vs "🔍 Find Unit / Location" (`:113145`, `:113212`); ✕ vs "X" (`:112532`, `:112881`) vs "Dismiss"; Legend "L" vs "⊞" | 13, 27 |
| 3.2.6 Consistent Help | A | PASS | `?` Help in toolbar on every screen (mobile: inside Tools sheet) | — |
| 3.3.1 Error Identification | A | FAIL | Failures are silent: data `fetch(...).then(r=>r.json())` without catch (`:96836`, `:96920`, `:96930`), map `error` event unhandled, clipboard failure → `window.prompt` (`:97932`); "No units found" text not announced (`:98946`) | 28 |
| 3.3.2 Labels or Instructions | A | FAIL | Placeholder-only inputs (7 sites), unlabelled ranges, Layers checkbox text not a label | 14 |
| 3.3.3 Error Suggestion | AA | N/A | No validated inputs | — |
| 3.3.4 Error Prevention (data) | AA | PARTIAL | Bookmark delete has no confirm/undo (BookmarkPanel chunk) | 11, 14 |
| 3.3.7 Redundant Entry | A | N/A | — | — |
| 3.3.8 Accessible Authentication (Min) | AA | N/A | No authentication | — |
| 4.1.2 Name, Role, Value | A | FAIL | 0 ARIA; 17 click-only controls; toggles/tabs/sliders/dialogs without roles/states/values | 02, 04, 05, 07, 13 |
| 4.1.3 Status Messages | AA | FAIL | No `role=status/alert/log/aria-live` anywhere in the app (toasts, event card, copy, results count, loading, errors) | 11 |

Totals for A+AA (55 criteria): FAIL 23 (A 13, AA 10), PARTIAL 10, PASS 12, N/A 10.

### 4.1 Cheap Level AAA (worth doing while the code is open)

| SC | Status now | Cheap route | Fix |
|---|---|---|---|
| 1.4.6 Contrast (Enhanced, 7:1) | FAIL (many) | Tokens text-1…text-3 and the gold text tokens in §5.1 are ≥ 7:1 on every panel background ≤ `#1a1a2a`; text-4/muted-floor stay AA-only | 16, 30 |
| 1.4.8 Visual Presentation | PARTIAL | line-height ≥ 1.5 already in story/unit prose; add text-size control, no horizontal scroll at 200% | 18, 20 |
| 1.4.9 Images of Text | PARTIAL | Canvas labels are essential; provide DOM labels in Data View | 08 |
| 2.1.3 Keyboard (No Exception) | FAIL | Achieved by unit cursor + Data View + on-screen pan | 08–10 |
| 2.2.3 No Timing / 2.2.4 Interruptions | FAIL | Persistent event log; toasts optional | 11 |
| 2.3.3 Animation from Interactions | FAIL | reduced-motion mode disables fly-to/fast-forward/interpolation | 21 |
| 2.4.10 Section Headings | FAIL | headings in every panel and view | 15 |
| 2.4.12 Focus Not Obscured (Enhanced) | FAIL | Move Extra Features into the toolbar (H1); no fixed overlays over focusable content | 15, 23 |
| 2.4.13 Focus Appearance | FAIL | Two-tone 2 px ring, ≥ 3:1 vs any background (§5.1) | 23 |
| 2.5.5 Target Size (Enhanced, 44 px) | FAIL | 44 px on coarse pointers, ≥ 32 px on fine pointers (documented deviation for the dense desktop toolbar) | 19 |
| 3.1.4 Abbreviations | FAIL | `MG/BG/LG/Gen/Col` in OOB (`:102536–102547`) → full titles or `<abbr title>` | 27, 30 |
| 3.2.5 Change on Request | FAIL | Remove first-visit `location.reload()` on `controllerchange` (`index.html:264–268`, C6) | 29 |
| 3.3.5 Help / 3.3.6 Error Prevention (All) | FAIL | Per-panel "How to use" link; bookmark undo | 11, 26 |

---------------------------------------------------------------------------------------------------

## 5. Design decisions the fixes depend on

### 5.1 Design tokens (one source of truth; every value computed on the panel backgrounds `#03030a … #1d2330`)

Text tokens (contrast vs `#0a0a14` / worst case `#1d2330`): `--text-1 #f4f0e4` 17.3 / 13.8; `--text-gold #e8d5a3` 13.6 / 10.8 (existing headline colour, keep); `--text-2 #c8c8d2` 11.9 / 9.5; `--text-3 #a8a8b8` 8.4 / 6.7 (replaces `#888 #999 #aaa`, and `#777`); `--text-4 #9a9aab` 7.1 / 5.7 (replaces `#666`); `--text-muted-floor #8f8fa3` 6.2 / 5.0 (replaces `#555 #444`; only for non-essential metadata); `--gold-text #c8a84a` 8.6 / 6.9 (existing); `--gold-text-dim #b8963c` 7.0 / 5.6 (replaces `#8b6914` **as text**; `#8b6914` stays valid as a border, 3.87:1); `--link #7fa8ff` 8.4 / 6.7 (replaces `#3a6bc4` as text); `--danger-text #f07a7a` (replaces `#cc4444` as text, ≥ 5.8); `--ok #6fd08c` 10.4 / 8.3; `--warn #ffb454` 11.2 / 8.9. Body/secondary text on `#1a1a2a` chips is ≥ 7.3:1 with `--text-3`, so 1.4.6 AAA is reachable for text-1…text-3 and the gold text tokens; `--text-4` (6.2:1 on chips) and `--text-muted-floor` are AA-only there and are reserved for non-essential metadata.

Non-text tokens: `--border-ui #7a7a92` (4.7 on `#0a0a14`, 4.5 on `#111`) for inputs/chips/OFF states; `--border-ui-soft #6a6a80` (3.7) for decorative-but-meaningful dividers; `--gold-border #8b6914` (3.87–4.0) fine; focus ring: `outline:2px solid #fff; outline-offset:2px; box-shadow:0 0 0 4px #000` — for ANY background one of white/black is ≥ 4.58:1 (I sampled the sRGB cube: min over colours of max(contrast vs white, vs black) = 4.58), so the two-tone ring satisfies 1.4.11 and 2.4.13 over imagery, panels and the existing gold accent can be kept as an inner accent.

Type scale (rem, root 16 px): `--fs-xs 0.75rem (12 px)` is the floor; `--fs-sm 0.8125rem`, `--fs-md 0.875rem`, `--fs-lg 1rem`, headings 1.125–2rem. Canvas label font follows `--gt-font-scale` (min 12 px at zoom ≥ 14, hidden below).

Target tokens: `--hit-min-fine 32px` (desktop pointer), `--hit-min-coarse 44px`; small visuals (dots 6–8 px, markers) get an invisible ≥ 24 px (fine) / 44 px (coarse) hit area via `::after{content:"";position:absolute;inset:-9px}` on a `position:relative` button.

Motion tokens: `--motion-ok` (0/1) from `prefers-reduced-motion` + user override; JS reads `document.documentElement.dataset.motion`.

### 5.2 Colour-independent encoding

Sides: keep hue (blue/red is historically expected) but separate by luminance and add a redundant cue.
- Default palette: Union `#6fb1ff` fill (L-contrast vs Confederate 2.9:1) / Confederate `#b3261e` fill; both get the two-tone halo (1 px `#fff` outer + 1 px `#000` inner). Computed: protan ΔE 59, deutan 56, tritan 65, achromat 29 (vs current 42/51/66/0.4).
- Redundant shape/pattern: Union = solid fill; Confederate = same rectangle with a 45° hatch (canvas `createPattern`) and a notch on the trailing edge; text labels prefixed "U"/"C" (`"U 20 ME"`), matching the list-view letter tags that already exist in the panels (`:97945`, `:98887`).
- "Colour-blind safe" preference: Okabe–Ito `#0072B2` (Union) / `#D55E00` (Confederate) + hatch (ΔE protan 50, deutan 57, tritan 66).
Dispositions (11 states): add a glyph drawn next to the unit (not colour): ▲ charging, ▼ retreat, ▬ line of battle, ⤳ march, ◆ reserve, ● bivouac, ✱ artillery firing, ✕ limbered…; keep colour as secondary; glyph set defined once and used by canvas, legend and lists. One palette object feeds canvas (`Lp`), legend (`NF`), badges (`fA`), roster, so they can never disagree again.
Imagery contrast: two-tone halo on every unit rectangle and glyph; casing (2 px black under 1 px colour) on map lines; label plates `rgba(0,0,0,.72)` (already 12:1) stay.

### 5.3 What "A+" means for accessibility here (release gate)

1. Lighthouse Accessibility = 100 on mobile and desktop for the home URL in each of the 6 entry states and 30+ panel states (via the Playwright state matrix, not just the load state).
2. axe-core 4.13 (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice): 0 violations and 0 "incomplete" items left unreviewed across the state matrix; pa11y-ci (htmlcs+axe) clean.
3. Manual: the 15 core tasks of §9.3 completed with NVDA+Firefox, NVDA+Chrome, VoiceOver+Safari (macOS), VoiceOver+Safari (iOS), TalkBack+Chrome, keyboard only, Windows forced-colors, 200%/400% zoom, and voice control (Dragon or Windows Voice Access) with 100% task success and ≤ 2× the median sighted-mouse time.
4. Published WCAG 2.2 AA Accessibility Conformance Report (VPAT 2.5) with no "Does Not Support" rows on the main app, plus an accessibility statement with a working feedback address.
5. All AAA items in §4.1 that are marked "cheap" implemented; the two deliberate deviations (2.5.5 on the dense desktop toolbar; 1.4.6 for `--text-muted-floor`) documented.


---------------------------------------------------------------------------------------------------

## 6. Design: a fully keyboard- and screen-reader-usable battle map

### 6.1 Principles

1. The canvas stays the primary sighted experience; it must never be the only representation. Every fact drawn on it (units, positions, dispositions, events, casualties) also exists as DOM text, generated from the same data (`placementsByTick`, `oobData`, `chronology_*`, `terrain.json`) by pure functions that both the canvas and the DOM consume.
2. Two entry points for non-visual users, chosen on the first screen and switchable anytime (persisted): "Map" (canvas + keyboard unit cursor) and "Text view" (Data View + situation summary + chronology). Text view is also the automatic fallback when WebGL/Mapbox fails (§ finding 28) and is server-renderable for crawlers (SEO benefit, T1).
3. Native elements first (`button`, `input type=range`, `dialog`, `table`, `label`), ARIA only for what HTML cannot express (tabs, combobox, live regions, `role=application` on the single map surface).
4. One clock formatter, one palette/glyph object, one shortcut registry, one dialog primitive — no per-component copies (the current bundle has 3 clock formulas, 3 disposition palettes and 3 keyboard handlers).
5. Nothing important is time-limited or hover-only; every message persists in a log.

### 6.2 Semantic skeleton (desktop and mobile share it; layout is CSS, not different component trees)

```html
<body>
  <a class="gt-skip" href="#gt-main">Skip to the battle map</a>
  <a class="gt-skip" href="#gt-timeline">Skip to timeline controls</a>
  <a class="gt-skip" href="#gt-dataview">Skip to the unit list</a>
  <header class="gt-header">                       <!-- role=banner -->
    <h1>Gettysburg Interactive Map <span class="gt-sub">July 1–3, 1863</span></h1>
    <nav aria-label="Extra features"> Ask the Historian link + Extra Features menu button (moved out of index.html overlay) </nav>
    <div role="toolbar" aria-label="Map tools" aria-orientation="horizontal"> …13 labelled toggle buttons… </div>
  </header>
  <main id="gt-main" tabindex="-1">
    <section aria-labelledby="map-h"> <h2 id="map-h" class="sr-only">Battle map</h2>
       <div id="gt-map" role="application" aria-roledescription="battle map" aria-label="Battle map. Press Enter to explore units with the arrow keys." aria-describedby="gt-summary" tabindex="0"> …mapbox canvas + overlay canvases (aria-hidden) … </div>
       <p id="gt-summary" class="sr-only">{situation summary — §6.6}</p>
    </section>
    <section id="gt-timeline" role="group" aria-labelledby="tl-h" tabindex="-1"> §6.9 </section>
    <aside aria-labelledby="unit-h"> <h2 id="unit-h">Selected unit</h2> … </aside>
    <section id="gt-dataview" aria-labelledby="dv-h"> <h2 id="dv-h">Units on the field</h2> §6.5 </section>
  </main>
  <footer> Privacy · Terms · Contact · User Guide · Accessibility statement </footer>
  <div id="gt-live-status" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
  <div id="gt-live-alert" role="alert" class="sr-only"></div>
  <ol id="gt-event-log" role="log" aria-live="off" aria-label="Battle events">…</ol>   <!-- visible as the toast stack; aria-live toggled by the "Announce events" preference -->
</body>
```
`role="application"` is used only on the single map surface (NVDA/JAWS need it to pass arrow keys through in browse mode); it is not used on the page, the panels or mobile. Everything else is ordinary document semantics, so browse-mode users can also read the whole page with headings/landmarks/tables.

### 6.3 Keyboard model

| Scope (where focus is) | Key | Action |
|---|---|---|
| Anywhere in the app | Tab / Shift+Tab | native order: skip links → header → toolbar → map → timeline → unit panel → Data View → footer; no traps |
| Anywhere (only if "Single-key shortcuts" is ON, default ON; ignored in text fields, selects, sliders, open dialogs; ignored with Ctrl/Alt/Meta) | `S` `F` `L` `M` `B` `?` `1` `2` `3` `H`(removed until heatmap exists) | open Search / Filter / Legend / Minimap / Bookmarks / Help / jump to day 1–3 (WCAG 2.1.4: persistent off-switch in Settings and Help; also active only inside the app region) |
| Anywhere | `Esc` | closes the top-most overlay/panel (stack), else deselects unit; never swallowed by text inputs — in an input the first Esc clears the text, the second closes (Combobox pattern) |
| Timeline group | slider native: ←/→ ±1 tick (5 min), `PageUp/PageDown` ±12 ticks (1 h), `Home/End` tick 1/675; `Space` on Play button = activate (native); no global Space steal | |
| Map surface (`role=application`) | `Enter` | enter/leave "unit cursor" mode (announces "Unit cursor on. Arrow keys move between units.") |
| Map, cursor mode | ←/→/↑/↓ | move to nearest unit in that direction (algorithm §6.4); announce it |
| Map, cursor mode | `Enter` again / `Space` | select and pin the unit (opens unit panel; focus moves to its heading); `Esc` deselect |
| Map, cursor mode | `[` / `]` | previous/next unit in order-of-battle order (corps→division→brigade→regiment) |
| Map | `Shift+←/→/↑/↓` | pan the camera 100 px (replaces Mapbox's arrow-pan; Mapbox built-in keyboard handler disabled with `keyboard:false` to prevent double handling) |
| Map | `+` / `-` (or `=`) | zoom (Mapbox default keys) — playback speed moves to timeline group (`Shift+.` / `Shift+,` when the timeline group is focused, plus buttons) |
| Map | `,` `.` | step time −1 / +1 tick without leaving the map (single-key, follows the off-switch) |
| Map | `G` | open "Go to location" (combobox of the 30 named locations + tour stops) |
| Map | `D` | describe this moment (re-announce the situation summary) |
| Dialog open | Tab / Shift+Tab | trapped inside (native `<dialog>` modal); `Esc` closes; focus returns to opener |

### 6.4 Unit cursor algorithm (reuses the existing on-screen projection and spatial index)

The app already projects every visible unit each frame (`lS`, `bundle.pretty.js:96541–96552`, array `pe` of `{p,x,y}`) and builds a grid index per tick (`aT`, `:96388`; `Xx`, `:96400`). Extract that into a pure `projectVisible(units, map, filters)` and add:

```ts
type P = { id: string; x: number; y: number };
const DIR = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] } as const;
export function step(cur: P | null, key: keyof typeof DIR, pts: P[], viewCenter: P): P | null {
  if (!cur) return nearest(viewCenter, pts);
  const [dx, dy] = DIR[key];
  let best: P | null = null, bestScore = Infinity;
  for (const p of pts) {
    if (p.id === cur.id) continue;
    const vx = p.x - cur.x, vy = p.y - cur.y, dist = Math.hypot(vx, vy);
    if (dist < 1) continue;
    const cos = (vx * dx + vy * dy) / dist;            // 1 = straight ahead
    if (cos < 0.5) continue;                            // outside a ±60° cone
    const score = dist * (1 + 2 * Math.acos(Math.min(1, cos)));   // penalise off-axis
    if (score < bestScore) { bestScore = score; best = p; }
  }
  return best;                                          // null → announce "No units further north in view"
}
```
Rendering: the cursor is a two-tone ring drawn on the overlay canvas plus the existing `selected/pinned` highlight (`shadowColor #e8d5a3`, `:96612`). Announcement (polite live region, ≤ 1 per 150 ms): `"{designation}, {Union|Confederate}, {activity text}, {men} men, facing {compass}, {distance} {direction} of {nearest landmark}. {i} of {n} in view."` Landmark = nearest of the 30 `terrain.json` `key_locations` by haversine, bearing via the existing 8-point table (`hF`, `:97050`). If the cursor unit scrolls off screen, the camera eases to keep it inside a 20% margin (instant under reduced motion).

### 6.5 Data View (the text alternative to the canvas; also the mobile/SR default when chosen)

`<table>` with `<caption>` "Units positioned at {July 2, 4:30 PM}: {n} of 467 units have modeled positions (the rest are in the order of battle but not yet positioned in this dataset)". Note the data reality this must state honestly: placements cover 152 unique units in 694 keyframes over 117 ticks (computed from `data/placements_*.json`), positions are carried forward by `y1` (`:96266–96305`, with module-global `i2` accumulating every unit ever seen), while `Xk`/`Jk` label unmodeled units "Not on field" (`:102303`, `:103555`) — wrong wording; use "No position modeled".

Columns: Unit (row header, `<th scope="row">`, contains the "Select" button), Side (text "Union"/"Confederate", never colour only), Formation (Corps › Division › Brigade, from `oobData`), Commander (with succession, `vF :97540`), Men now / at start, Activity (disposition text + glyph, `h2` map `:102901`), Near (landmark phrase §6.4), Losses %. Sortable headers = `<button aria-sort>`; filters (Side radio, Corps select, Area select, Min strength, "Only units in contact" using `X4 :96480` threshold) above the table with a result count in the `role=status` region; 50 rows per page with `<nav aria-label="Unit list pages">` (467 rows total max, so no virtualization needed; if virtualized use `aria-rowcount/aria-rowindex`). "Show on map" button per row flies the map (instant under reduced motion) and selects the unit. Updates at most once per second while playing and never while focus is inside the table. Same component powers the Order of Battle modal (`Xk`), the roster (`Jk`, mobile `:103505`), search results and the Follow-Your-Ancestor picker, replacing four bespoke unlabeled lists.

### 6.6 Situation summary (the "audio description" of the current moment)

Pure function `describeMoment(tick)` → one paragraph, used as `aria-describedby` of the map, at the top of Data View, and on demand (`D`, or the "Describe this moment" button):
"{July 2, 4:30 PM}. {u} Union and {c} Confederate units have modeled positions. Contact: {k1} units near Little Round Top, {k2} near the Wheatfield, {k3} near the Peach Orchard. Since {previous event time}: {latest event}. Casualties so far in the modeled units: {n}."
Contact clusters come from the existing proximity test (`X4`) grouped by grid cell and named by nearest landmark; the latest event is the highest-significance chronology entry `<= tick` (`LF` logic `:98607–98611`). Date/time strings come from the single formatter (depends on C3/C4).

### 6.7 Narrative alternative: chronology transcript

Static, crawlable page `/battle-chronicle.html` (and the same component inside the app as "Battle Log") generated at build time from `chronology_day1..3.json` (137 events: 45 critical, 73 high, 16 medium, 3 low) and `vignettes_part1..3.json` (24 vignettes, ≈ 7,200 words of scripts): `h1` page title; `h2` per day; `h3` per hour block; each event a `<p>` with `<time>`, a text significance label ("Critical", "High"), the text, units involved as links, and "Show this moment on the map" (`/?t=TICK`, which requires finding 26 because share params are never read today). Table of contents `<nav aria-label="Chronicle">`; "Skip to Day 2/3" links; print stylesheet. This doubles as the SEO content the `#seo-content` block was trying to be (E4) and as the corpus for the Historian expansion.

### 6.8 Announcement policy (what is spoken, when, how loudly)

| Trigger | Channel | Politeness | Text | Throttle |
|---|---|---|---|---|
| Unit selected/cleared | `#gt-live-status` | polite | "Selected 20th Maine Infantry, Union, 358 men, Line of Battle. Unit panel open." | none |
| Time changed with slider/keys | native slider `aria-valuetext` | (native) | "July 2, 4:30 PM" | — (no extra live region) |
| Day/moment jump by button/link | status | polite | "July 2, 4:30 PM. 41 units in contact near Little Round Top." | 400 ms debounce |
| Play/Pause | status | polite | "Playing at 2×." / "Paused at July 2, 4:30 PM." | — |
| Battle event while playing | `#gt-event-log` (`aria-live=polite` only when "Announce battle events" is ON; default OFF) | polite | "General Reynolds killed — July 1, 10:15 AM." | ≤ 1 per 5 s, coalesced ("3 events: …") |
| Battle event while paused/stepping | status | polite | events at the new tick | — |
| Copy/share success | status | polite | "Link copied." | — |
| Search | status | polite | "5 units match 'maine'." | 500 ms debounce |
| Load/skip/layout | status | polite | "Loading battle data." … "Battle data loaded." | once |
| Errors | `#gt-live-alert` | assertive | "The map could not load. Text view is open instead." | once |

The log stays visible and reachable (toasts become non-blocking list items with pause-on-hover/focus, a Pause button and "Clear"), which resolves 2.2.1/2.2.3/2.2.4 and 4.1.3 together.

### 6.9 Timeline group

```html
<section id="gt-timeline" role="group" aria-labelledby="tl-h" tabindex="-1">
  <h2 id="tl-h" class="sr-only">Battle timeline</h2>
  <div role="radiogroup" aria-label="Day"> <button role="radio" aria-checked="true">July 1</button> … </div>
  <label for="tl-slider" class="sr-only">Battle time</label>
  <input id="tl-slider" type="range" min="1" max="675" step="1" value="267"
         aria-valuetext="July 2, 4:30 PM (moment 267 of 675)" aria-describedby="tl-keys">
  <span id="tl-keys" class="sr-only">Arrow keys move five minutes. Page Up and Page Down move one hour.</span>
  <button aria-label="Back one hour">⏮</button> <button aria-label="Previous five minutes">◀</button>
  <button aria-label="Play">▶</button> <button aria-label="Next five minutes">▶</button> <button aria-label="Forward one hour">⏭</button>
  <div role="radiogroup" aria-label="Playback speed"> ¼× ½× 1× 2× 4× 8× </div>
  <button aria-haspopup="listbox">Key moments</button>       <!-- replaces the 8 px event dots as the accessible route -->
</section>
```
Fix the real defects behind this: slider domain `0–100 step .01` (`:112295–112301`) → integer ticks; remove the parent `onKeyDown` (`:112216`) and `outline:none` (`:112385`); "1x (real time)" label is wrong (H9): show "1× = 10 game-minutes per second" from the actual rate (`cF=500 ms` per tick, `:96948`, i.e. 2 ticks/s × 5 min); 8 px event dots stay decorative on the track but each gets an invisible ≥ 24/44 px button and appears in the Key-moments list.

### 6.10 Dialog and panel primitives (React 18.3.1)

```tsx
// Dialog.tsx — modal dialogs (layout chooser, onboarding, help, bookmarks, ancestor, Soldier's Eye, OOB, walkthrough, tools sheet)
export function Dialog({ open, onClose, titleId, children, initialFocusSelector = '[data-autofocus]' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const d = ref.current!;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();                                   // top layer + focus trap + inert background + Esc → 'cancel'
      (d.querySelector<HTMLElement>(initialFocusSelector) ?? d.querySelector<HTMLElement>('[tabindex="-1"]'))?.focus();
    } else if (!open && d.open) {
      d.close(); opener.current?.focus?.();            // restore focus
    }
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} className="gt-dialog"
                 onCancel={e => { e.preventDefault(); onClose(); }}
                 onClick={e => { if (e.target === ref.current) onClose(); }}>{children}</dialog>;
}
```
`showModal()` also places the dialog in the top layer, above the currently 999999-z-indexed `#extra-features` overlay, and makes that overlay inert. Non-modal panels (search, filter, legend, unit, story, event, layers, distance) use `<section role="region" aria-labelledby>` (or `<aside>`), move focus to their heading when opened by keyboard, close on Esc while focus is inside, restore focus to the invoking toolbar button (`aria-expanded` + `aria-controls` on the button), and are placed in DOM order right after the map.

### 6.11 Mobile (TalkBack / VoiceOver / switch / large text)

- One responsive tree: below a container-width breakpoint the toolbar collapses into a labelled "Tools" `menu-button` that opens a `<dialog>` sheet (44 px rows). No second component tree, so no duplicate Play controls or controls stacked under other UI (finding 24).
- The map surface is NOT `role=application` on touch devices (it swallows swipe navigation); TalkBack/VoiceOver users use Text view or the on-screen controls: 44 px D-pad (pan N/S/E/W by 25% of the view), zoom in/out, "Center on selected unit", and "Go to location" (combobox of 30 locations + 16 tour stops) — the single-pointer alternatives WCAG 2.5.1/2.5.7 require. Mapbox `NavigationControl` (with compass hidden) is added to the mobile map (it is missing today, `:102981`) and enlarged to 44 px on `(pointer:coarse)`.
- Scrubber = the same native `<input type=range>` (min 44 px thumb hit area), not a touch-only `div`.
- All bottom/top bars use `env(safe-area-inset-*)` and collapse in landscape; no fixed 94 + 140 px chrome.
- Text scale honours `--gt-font-scale` (Settings) and OS text-size where the browser supports `text-size-adjust`; layouts use `rem` and `min-height` instead of fixed heights.

### 6.12 Accessibility settings (persisted in the existing `gtbg_prefs`, `:9327–9341`)

`view: map|text`, `motion: system|reduce|full`, `contrast: system|high`, `palette: default|cvd`, `textScale: 100|125|150|200`, `shortcuts: on|off`, `announce: {events: bool, clock: off|30min|hour}`, `toasts: persist|auto`. Exposed as a labelled "Accessibility" toolbar button (dialog) reachable from the first screen, and mirrored in URL params for testing (`?view=text&motion=reduce&palette=cvd&intro=0&layout=desktop`).

### 6.13 Forced-colors / Windows High Contrast and dark-only theme

- `<meta name="color-scheme" content="dark">` and `:root{color-scheme:dark}` so native controls (range, select, scrollbars) render dark.
- `@media (forced-colors: active)`: buttons/inputs get real borders (`ButtonText`), active/pressed states use `aria-pressed` + `outline`/`Highlight` (background tints disappear in forced colours, so colour-only states must have a border/underline/glyph), focus ring `Highlight`, `forced-color-adjust:none` only on canvases whose colours are data, with halo + glyph + hatch guaranteeing legibility on any forced background.
- Every state that today depends on `background:rgba(…)` tint alone (toolbar active, chips, tabs, day tabs, speed buttons) gets `aria-pressed`/`aria-current` and a non-colour cue.


---------------------------------------------------------------------------------------------------

## 7. Fix specs (findings)

Index:

| ID | Finding | Severity | Effort |
|---|---|---|---|
| app-a11y-01 | Tier-0 shell + CSS shim (landmarks, skip link, h1, focus ring, contrast, font floor, reduced-motion, forced-colors, coarse targets) | critical | S |
| app-a11y-02 | Tier-0 bundle string patches (validated on the deployed bundle) + safe re-hash pipeline | critical | M |
| app-a11y-03 | Entry flow: intro, layout chooser, onboarding (keyboard, SR, persistence, auto-detect, text-view option) | critical | M |
| app-a11y-04 | Replace every click-only `div`/`canvas` control with native semantics (17 sites) | critical | M |
| app-a11y-05 | Dialog / overlay / panel system (semantics, focus, inert, Esc stack, z-index scale) | critical | L |
| app-a11y-06 | One keyboard/shortcut module: 2.1.4 compliance, no conflicts, correct Esc, truthful Help | critical | M |
| app-a11y-07 | Timeline and clock semantics (slider, day, speed, transport, key moments) | critical | M |
| app-a11y-08 | Data View: the accessible table/list alternative to the canvas + situation summary | critical | L |
| app-a11y-09 | Keyboard unit cursor + map surface semantics + Mapbox keyboard integration | critical | L |
| app-a11y-10 | Single-pointer / non-drag alternatives: on-screen pan and zoom, Go-to-location, mobile NavigationControl, minimap semantics | high | M |
| app-a11y-11 | Live regions, event log, status messages and time-limited content | high | M |
| app-a11y-12 | Screen-reader narrative alternative: chronology transcript ("Battle Chronicle") | high | M |
| app-a11y-13 | Accessible names, roles and states for every control (75 button sites) | high | M |
| app-a11y-14 | Forms and search: labels, combobox pattern, Distance tool without a mouse, errors and empty states | high | M |
| app-a11y-15 | Landmarks, headings, skip links, document title; fold the injected "Extra Features" overlay into the real header | high | M |
| app-a11y-16 | Design tokens and contrast to AA (and AAA where cheap) | high | M |
| app-a11y-17 | Colour-independent encoding, CVD-safe palette, imagery halo, one palette for canvas/legend/badges | high | L |
| app-a11y-18 | Type scale in `rem`, 12 px floor, user text-size control, canvas label scaling | high | L |
| app-a11y-19 | Target size: 44 px on touch, ≥ 32 px on desktop pointers, never < 24 px | high | M |
| app-a11y-20 | Reflow, zoom, text spacing, landscape: responsive layout by width (not by user choice), toolbar overflow, no load-time constants | high | L |
| app-a11y-21 | Motion: honour `prefers-reduced-motion`, add in-app control, make intro/tour stoppable | medium | M |
| app-a11y-22 | Hover-only and `title`-only content (1.4.13): monuments, timeline markers, toolbar tooltips; remove the duplicate injected star overlay | medium | S |
| app-a11y-23 | Focus visibility and focus-not-obscured | high | S |
| app-a11y-24 | Mobile layout accessibility: one control set, native scrubber, dialog sheets, zoom buttons, no covered/hidden focusables, pinch-zoom allowed | high | M |
| app-a11y-25 | Virtual Walkthrough view (`_O`): tabs, cards, headings, labels, iframe titles | medium | M |
| app-a11y-26 | Accessibility settings dialog + deep links (state in the URL) + working share links | medium | M |
| app-a11y-27 | Copy, debug text and dead-code hygiene that affects AT and clarity | medium | S |
| app-a11y-28 | Errors are invisible: map/WebGL/data failures need messages and a fallback to Text view | medium | M |
| app-a11y-29 | PWA and reload behaviour: remove landscape lock and the first-visit forced reload | medium | S |
| app-a11y-30 | Cheap AAA set: sign-off checklist | low | M |
| app-a11y-31 | Retire the legacy injected scripts in `index.html` (they are accessibility liabilities) | medium | S |
| app-a11y-32 | Automated accessibility test infrastructure and CI gates | high | L |
| app-a11y-33 | Manual assistive-technology program (scripts, matrix, exit criteria) | high | M |
| app-a11y-34 | Accessibility statement, Accessibility Conformance Report and feedback channel | medium | S |

Effort: S < 0.5 d, M 0.5–2 d, L 2–5 d, XL > 5 d. All "depends on N1" items assume there is a buildable source (N1). Findings 01–02 are Tier-0 bridge fixes that do NOT need source and can ship first; everything else should be done in the rebuilt source and (where the bridge already covered it) replaces the bridge.

---

### app-a11y-01 — Tier-0 shell + CSS shim (landmarks, skip link, h1, focus ring, contrast, font floor, reduced-motion, forced-colors, coarse targets)
Severity: critical | Effort: S | audit_refs: A1, A3, A4, A6, D2, E3 | depends_on: none

Evidence
- No skip link/heading/landmark: Lighthouse `bypass` output "No valid skip link found / Page does not have a heading / Page does not have a landmark region" (`lh_desktop.json`, `lh_mobile.json`). `index.html:716` `<div id="root">`; `:285` `<div id="extra-features">`; 3 `<h1>` pre-mount (`:744` splash `<h1>`, styled by the `#boot-splash h1` rule at `:107`; `:718` `#seo-content h1`; `:753` noscript) and none after mount (React clears `#root`).
- Contrast/type/focus/motion/forced-colors: §3 (62 failing text styles; 133 sub-12 px sizes; inline `outline:"none"` at `bundle.pretty.js:98996`, `:101356`, `:112385`; `site-nav.css:43–47`, `:110` remove outlines; no `forced-colors` anywhere; app CSS file has no rules, `assets/index-B4G7Z_2G.css`).

Root cause: shell and styling are inline-style React with no global layer; index.html is the only place that can be changed without source.

Fix (exact)
1. `index.html` (diff sketch):
```diff
-<html lang="en">
+<html lang="en">
   <meta name="theme-color" content="#0a0a14" />
+  <meta name="color-scheme" content="dark" />
   ...
   <link rel="stylesheet" href="/site-nav.css">
+  <link rel="stylesheet" href="/a11y-shim.css">
+  <script>
+    (function(){try{var mq=matchMedia('(prefers-reduced-motion: reduce)');
+    window.__gtbgReduceMotion=mq.matches||localStorage.getItem('gtbg-motion')==='reduce';
+    mq.addEventListener&&mq.addEventListener('change',function(e){window.__gtbgReduceMotion=e.matches;});}catch(e){window.__gtbgReduceMotion=false;}})();
+  </script>
 ...
 <body>
-  <div id="extra-features">
+  <a class="gt-skip" href="#root">Skip to the battle map</a>
+  <a class="gt-skip" href="#gt-timeline">Skip to timeline controls</a>   <!-- target id added by bundle patch 02-B -->
+  <h1 class="gt-sr-only">Gettysburg Interactive Map: the Battle of Gettysburg, July 1–3, 1863</h1>
+  <nav id="extra-features" aria-label="Extra features">
 ...
-  </div>
+  </nav>
 ...
-  <div id="root">
+  <main id="root" tabindex="-1" aria-label="Interactive battle map">
-      <h1>Gettysburg Animated Battlefield Map</h1>   <!-- inside #seo-content -->
+      <h2>Gettysburg Animated Battlefield Map</h2>
-    <div id="boot-splash"> … <h1>Gettysburg</h1>
+    <div id="boot-splash"> … <p class="boot-title">Gettysburg</p>   <!-- and rename the CSS selector #boot-splash h1 → .boot-title -->
-  </div>
+  </main>
```
(`#extra-features`, `#root` are referenced only by id in the inline CSS/JS, so changing the tag is safe; the noscript `h1` stays because scripts are off.)
2. New `a11y-shim.css` (linked after `site-nav.css`; remove piece by piece as source-level fixes land — finding 16/18/19/23):
```css
.gt-sr-only{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.gt-skip{position:fixed;left:8px;top:-120px;z-index:1000001;padding:10px 16px;background:#0a0a14;color:#f4f0e4;border:2px solid #fff;border-radius:6px;font:600 14px/1.2 system-ui,sans-serif;text-decoration:none}
.gt-skip:focus{top:8px}
/* 2.4.7 / 2.4.13: two-tone ring; !important beats inline outline:none and site-nav.css:43-47,110 */
:focus-visible{outline:2px solid #fff!important;outline-offset:2px!important;box-shadow:0 0 0 4px #000!important}
/* 1.4.3: React serialises color:#555 as "color: rgb(85, 85, 85)" (confirmed by the Lighthouse snippets); leading-space form avoids border-color/background-color */
[style*=" color: rgb(68, 68, 68)"],[style^="color: rgb(68, 68, 68)"],
[style*=" color: rgb(85, 85, 85)"],[style^="color: rgb(85, 85, 85)"]{color:#8f8fa3!important}
[style*=" color: rgb(102, 102, 102)"],[style^="color: rgb(102, 102, 102)"]{color:#9a9aab!important}
[style*=" color: rgb(119, 119, 119)"],[style^="color: rgb(119, 119, 119)"]{color:#a8a8b8!important}
[style*=" color: rgb(139, 105, 20)"],[style^="color: rgb(139, 105, 20)"]{color:#b8963c!important}
[style*=" color: rgb(58, 107, 196)"]{color:#7fa8ff!important}
[style*=" color: rgb(204, 68, 68)"]{color:#f07a7a!important}
[style*=" color: rgb(109, 122, 138)"]{color:#9aa6b6!important}
[style*=" color: rgba(200, 168, 74, 0.45)"]{color:rgba(200,168,74,.8)!important}
.gtbg-group-why,#gtbg-footer,#boot-splash .boot-caption{color:#9a9aab!important}
/* BRIEF: text >= 12px (inline sizes 7-11) */
[style*="font-size: 7px"],[style*="font-size: 8px"],[style*="font-size: 9px"],[style*="font-size: 10px"],[style*="font-size: 11px"]{font-size:12px!important}
@media (pointer:coarse){#root button,#extra-features button,#extra-features a{min-width:44px;min-height:44px}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
@media (forced-colors:active){button,[role=button],input,select{border:1px solid ButtonText!important}
  :focus-visible{outline:2px solid Highlight!important;box-shadow:none!important} canvas{forced-color-adjust:none}}
```
All replacement colours were computed ≥ 4.96:1 on every panel background (§5.1). Risk: the font floor enlarges dense rows (roster/OOB use `nowrap` + ellipsis so they truncate rather than wrap) — take before/after screenshots at 1440, 1280, 768, 375; if a row breaks, exclude it with a more specific selector.
3. Delete the inert label-patch script (`index.html:398–440`; finding 31).

Acceptance test: Lighthouse a11y ≥ 97 on the loaded state (both form factors) — the four live `color-contrast` nodes and the `bypass` heading/landmark/skip link findings disappear (`label` needs finding 02); `document.querySelectorAll('h1').length===1`; Tab from page load focuses "Skip to the battle map" first and Enter moves focus to `#root`; with `emulateMedia({forcedColors:'active'})` every `button` has computed `border-top-width` > 0; with `reducedMotion:'reduce'` no element has an animation/transition duration > 0.01 ms (except canvases). Screenshot diff review at 4 widths.
Metric/grade: Lighthouse Accessibility 90 → ~97–100 (initial state), removes 1.4.3 failures in the loaded states, adds 2.4.1 bypass; Fit & finish (type floor); Accessibility C+/C → C+/B- until 02+ land.

---

### app-a11y-02 — Tier-0 bundle string patches (validated on the deployed bundle) + safe re-hash pipeline
Severity: critical | Effort: M | audit_refs: A2, A5, A6, H2, D2, N1 | depends_on: 01 (for `window.__gtbgReduceMotion`); independent of source recovery

Evidence: prior sessions already patched the minified bundle with string edits (BRIEF N1). I verified 18 FIND strings (15 distinct edits) against `bundle.min.js` in `tmp-app-a11y/bridge_patch_check.py`: each matches the expected count (1, or 14/4/2 for the regex and paired ones) and `node --check` passes on the patched copy (+1,850 bytes).

Fix (exact FIND → REPLACE; component variable names `V, Po, tc, yn, R, c, M, P` are as in the deployed file):
- A. Timeline slider → integer domain, name, valuetext: FIND `V.jsx("input",{type:"range",min:0,max:100,step:.01,value:he,onChange:Ie=>P(Math.round(1+Ie.target.value/100*(M-1))),style:Po.scrubInput})` → `V.jsx("input",{type:"range","aria-label":"Battle time","aria-valuetext":R(),min:1,max:M,step:1,value:c,onChange:Ie=>P(Number(Ie.target.value)),style:Po.scrubInput})` (`R()` is `getTickTime`, `:112226`; once C3/C4 fix the clock the valuetext follows automatically).
- B. Remove the double-firing wrapper handler and expose a labelled group: FIND `V.jsxs("div",{style:Po.wrap,tabIndex:0,onKeyDown:Se,children:` → `V.jsxs("div",{style:Po.wrap,id:"gt-timeline",role:"group","aria-label":"Battle timeline controls",children:` (fixes ←/→ = 2 ticks, Shift = 24, Space no-op, focusable wrapper without ring).
- C. Global handler guard: FIND `if(Ur.target.tagName==="INPUT")return;` → guard that returns for: `defaultPrevented`, Ctrl/Meta/Alt, INPUT/TEXTAREA/SELECT/contenteditable, Space/Enter on button/link, arrows and `+ = - _` when the Mapbox canvas is focused, and everything except Esc while a `[role=dialog][aria-modal=true]` is open (exact replacement in the script).
- D. Toolbar names/state: FIND `V.jsx("button",{onClick:M,title:f,style:{...tc.toolBtn,` → `V.jsx("button",{type:"button",onClick:M,title:f,"aria-label":f,"aria-pressed":x===void 0?void 0:!!x,style:{...tc.toolBtn,`.
- E. Layout cards keyboard-operable (two patches `onClick:()=>c("desktop"),onMouseEnter…` / `"mobile"`): add `role:"button",tabIndex:0,"aria-label":"Select the desktop layout",onKeyDown:e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),c("desktop"))},onFocus/onBlur` mirroring the hover style.
- F. Intro skip → real button: FIND `V.jsx("div",{style:Va.skip,onClick:()=>{` → `V.jsx("button",{type:"button",style:{...Va.skip,background:"none",border:"none",padding:12,fontFamily:"sans-serif"},onClick:()=>{`.
- G. 14 generic close glyph buttons (`style:X.closeBtn|close|dismiss|dismissBtn|pipClose,children:"✕"`) and 4 mobile ones (`tn.popupClose|toolsClose|slidePanelClose`) → add `"aria-label":"Close"` (regex patch, counts 14 and 4).
- H. Labels: filter range (`"aria-label":"Minimum unit strength","aria-valuetext":…`), search input ("Search units"), ancestor input ("Regiment name"), two monument search inputs.
- I. Toast stack always mounted as a polite log: FIND `x.length===0?null:V.jsx("div",{style:eh.container,children:x.map(` → `V.jsx("div",{style:eh.container,role:"log","aria-live":"polite","aria-relevant":"additions","aria-label":"Battle events",children:x.map(`.
- J. Reduced motion (flag from 01): `eO=3500` → `eO=(window.__gtbgReduceMotion?1:3500)`; `Math.abs(Math.sin(l/300))` → `(window.__gtbgReduceMotion?.7:Math.abs(Math.sin(l/300)))`; both `ut=Hc/Pe` → `ut=window.__gtbgReduceMotion?0:Hc/Pe` (no sub-tick interpolation).
Delivery pipeline (IMPORTANT — do not patch in place): assets are `immutable`, cache-first in `sw.js` and modulepreloaded by name, and both lazy chunks import `./index-Cg8FAMXN.js` by name (`HelpModal-…js`, `BookmarkPanel-…js` first line). The script must (1) read `assets/index-Cg8FAMXN.js` from the correctly-cased source tree (not the case-mangled deploy zip, N1), (2) assert each FIND count, (3) write `assets/index-<sha8>.js`, (4) rewrite the name in `index.html` (`:55`, `:282`), `sw.js` PRECACHE and both chunks, (5) bump `CACHE_NAME` (`sw.js`), (6) `node --check`, (7) refuse to run if any count differs (i.e. if the bundle changed). Keep the script + patch list in the repo so the patches survive until the source rebuild replaces them.

Acceptance test: script run is idempotent and fails loudly on a changed bundle; keyboard smoke test (Playwright): Tab → Enter on "Select the desktop layout" enters the app; focus timeline slider, press → three times → tick +3 and `aria-valuetext` changes; press Space with focus on ⏭ → play state unchanged and one activation; Ctrl+F does not open the filter panel; Lighthouse `label` audit passes; NVDA reads "Battle time, slider, July 1, 6:00 AM".
Metric/grade: removes the last two Lighthouse failure classes (label, plus contrast via 01) → Accessibility 100 on load state; unblocks keyboard entry (2.1.1) for the two blocking screens; fixes the double-fire keyboard bugs; A6/H2 partially.

---

### app-a11y-03 — Entry flow: intro, layout chooser, onboarding (keyboard, SR, persistence, auto-detect, text-view option)
Severity: critical | Effort: M | audit_refs: H3, A6, C6 | depends_on: N1, 05 (Dialog), 26 (settings)

Evidence: `dO` cards are `div onClick` (`:102767`, `:102789`), copy says "Best for mouse and keyboard" (`:102778`) and "Power User… keyboard shortcuts" on touch (`:111815`); `tO` "Skip intro ›" `div` `#444` (`:101569`, `:101670`); choice never stored (only `gtbg_onboarded`, `:113068`); render order puts the onboarding modal over the chooser (`:113059–113070`); the injected banner searches the DOM for the text "Choose Your Experience" (`index.html:369–379`).

Root cause: one-off screens built as styled divs; no persistence layer; injected script compensates.

Fix
1. Replace with a single `EntryDialog` (modal `<dialog>`, `aria-labelledby`, initial focus on the heading `tabindex=-1`): title "Choose how to explore"; three real `<button>`/radio cards — "Map (desktop)", "Map (touch layout)", "Text view (screen readers, keyboard, low bandwidth)"; the recommended one preselected by `matchMedia('(pointer: coarse)')` + width (H3 auto-detect); "Remember my choice" default ON writes `gtbg_prefs.view/layout`; returning visitors skip straight in.
2. Intro fast-forward becomes optional and skippable by keyboard (a real button, also Esc), auto-skipped when `prefers-reduced-motion` or `prefs.motion==='reduce'` or for returning visitors; the splash gets `role="status"` "Loading battle data…" text.
3. Move the "20 more tools" banner into the dialog as static content (delete the DOM-scraping script, finding 31).
4. Onboarding tour steps are a `<dialog>` with `aria-labelledby`, a visible "Step 2 of 5", Esc = skip, focus to the step heading on Next.
5. Remove touch/desktop mismatches: "Power User / keyboard shortcuts" only when a fine pointer is present; "Best for mouse and keyboard" copy removed.

Acceptance test: keyboard-only from cold load: Tab reaches the three options, Enter selects, focus lands on the app heading; reload → no chooser/splash (unless "Reset" in Settings); with `reducedMotion:'reduce'` no splash; NVDA announces the dialog title and the option names; axe 0 violations on all 3 entry states.
Metric/grade: 2.1.1/4.1.2/2.4.3 (A) cleared for the entry path; Usability/learnability (D+ mobile → B+ with H3); removes ≈ 15 s repeat splash.

---

### app-a11y-04 — Replace every click-only `div`/`canvas` control with native semantics (17 sites)
Severity: critical | Effort: M | audit_refs: A5, A6 | depends_on: N1

Evidence: §2.1 table (16 functional sites in the main bundle + BookmarkPanel chunk + 7 backdrops).

Root cause: `onClick` on non-interactive elements; no shared list/row primitives.

Fix (per site; all keep their visuals, add `type="button"` + focus ring from tokens)
- Story dots (`:98365`) → `<ol aria-label="Stories at this moment"><li><button aria-current="true|undefined" aria-label="Story 2 of 3: {title}">`; dot glyph 6 px inside a ≥ 24 px (44 coarse) hit area.
- Tour dots (`:100366`) → same pattern ("Stop 4 of 8: Little Round Top").
- Search quick links + results (`:98855`, `:98878`) → combobox/listbox (finding 14) — rows are `<li role=option>` inside `role=listbox`, or simply `<button>` rows in a `<ul>` if combobox is deferred.
- Ancestor results + journey entries (`:101173`, `:101249`) → `<ul>` of `<button>`; journey = `<ol>` with `<time>`.
- Soldier's Eye rows (`:101992`) → `<ul>` of `<button>` with name + "Opens Street View in Google Maps (new tab)" as description.
- Monument markers (`:100914`) → finding 22. Walkthrough monument cards (`:110690`) → finding 25. Bookmark row (chunk) → `<button>` + separate Delete button `aria-label="Delete bookmark {label}"`.
- Layout cards/Skip intro → finding 03/02. Mobile scrubber → finding 24. Timeline markers → finding 07. Map canvas → finding 09. Minimap canvas (`:99811`) → finding 10.
- Backdrops stay as a convenience only; `<dialog>` Esc/close button remain the accessible paths.
Enforce with `eslint-plugin-jsx-a11y` (`click-events-have-key-events`, `no-static-element-interactions`, `interactive-supports-focus`) set to error in CI (finding 32).

Acceptance test: React attaches handlers at the root, so there is no `onclick` attribute to grep; use a Playwright sweep instead — for every visible element whose computed `cursor` is `pointer`, `el.matches('button,a[href],input,select,summary,[role=button],[role=option],[role=tab],[role=radio],[tabindex]')` must be true (exception list empty); Tab/Enter/Space operate every former click-only control; `eslint-plugin-jsx-a11y` rules pass in CI.
Metric/grade: 2.1.1, 4.1.2, 2.5.3 (A); "Core function" for keyboard/AT users from unusable to complete.

---

### app-a11y-05 — Dialog / overlay / panel system (semantics, focus, inert, Esc stack, z-index scale)
Severity: critical | Effort: L | audit_refs: A6, H1, H2, H4 | depends_on: N1

Evidence: §2.4 table — 13 modal-style overlays, 0 with `role=dialog`/`aria-modal`; only 3 focus calls in the app; Esc misses Layers, Distance, Legend, Story, Event card, Tools sheet, NPS tour and the pinned unit panel (`:113033–113046` vs `MF :97909`); Esc ignored in inputs (`:112967`); z-indexes 85…1000 and 999999 ad hoc.

Root cause: each overlay hand-rolled; no primitive; global Esc handler enumerates state setters manually.

Fix
1. Implement `Dialog` (modal, native `<dialog>`, §6.10) and `Panel` (non-modal region) primitives; migrate all overlays: modal = Entry, Onboarding, Help, Bookmarks, Follow Ancestor, Soldier's Eye, Order of Battle, Tools sheet, Walkthrough, Accessibility settings; non-modal = Search, Filter, Legend, Unit, Story, Event log, Layers, Distance, NPS tour, Roster.
2. A tiny overlay stack (`useOverlayStack`): Esc pops the top-most open item (dialog or panel); in text inputs the first Esc clears the field, second closes; unit deselect clears both `selectedUnitId` and `pinnedUnitId` (fixes the pinned-panel bug).
3. Toolbar buttons get `aria-expanded` + `aria-controls`; opening by keyboard moves focus to the panel heading (`tabindex=-1`) or its first control (`data-autofocus`); closing returns focus to the opener; panel DOM sits immediately after the map so Tab order matches.
4. Z-index scale tokens: map overlays 1–9, panels 20, sheets 40, dialogs 60 (dialogs use the top layer, so no z-index race with `#extra-features`), toasts 80.
5. `overscroll-behavior: contain` on scrollable panels; `body { overflow:hidden }` already set.
Acceptance test (Playwright + axe): for each overlay — open by keyboard → `document.activeElement` is inside; Tab ×30 never leaves a modal; Esc closes and `document.activeElement === opener`; background elements report `inert`; axe `aria-dialog-name`, `aria-required-attr` pass; NVDA announces "{title}, dialog".
Metric/grade: 2.4.3, 4.1.2, 2.1.1 (A), 2.4.11 (AA); removes H1/H2 root causes; Reliability/Usability.

---

### app-a11y-06 — One keyboard/shortcut module: 2.1.4 compliance, no conflicts, correct Esc, truthful Help
Severity: critical | Effort: M | audit_refs: H2, A6, D2 | depends_on: N1, 05

Evidence: §2.5. The global handler (`:112966–113052`) — single-character shortcuts with no off-switch (fails 2.1.4); ignores only `INPUT` (`:112967`); no modifier guard (Ctrl+F/S/L/1 also trigger); Space `preventDefault` on any target; conflicts with Mapbox keyboard handler on the focused canvas (Mapbox: `:89757–89811`; canvas `tabindex=0` `:94008`; `keyboard:!0` `:91902`); duplicate wrapper handler (`:112216`); dead duplicate in HelpModal chunk (`useGlobalKeyboard`); `H` toggles a state nothing reads (`:9419`, `:9435`, `:112930`); Help/onboarding text lists `H Heatmap` and "Esc: Dismiss panel / deselect unit" (partly false); speed keys reach 16× while UI shows 8× (`:112998` vs `wO :112185`).

Fix
1. Replace with `shortcuts.ts` registry: `{ id, keys, scope: 'app'|'map'|'timeline', handler, description }`, one `keydown` listener on `#root` (focus scope) — WCAG 2.1.4 "active only on focus" plus a persistent `prefs.shortcuts` on/off switch surfaced in Help and Settings.
2. Guards (§6.3): ignore `defaultPrevented`, IME composition, Ctrl/Alt/Meta, `event.repeat` for toggles, targets matching `input,textarea,select,[contenteditable],[role=textbox|combobox|slider|spinbutton],[role=dialog][aria-modal=true] *`; Space/Enter never intercepted on `button,a,[role=button]`.
3. Map keyboard: construct Mapbox with `keyboard:false` and implement pan/zoom/rotate on the map surface with the documented keys (§6.3) so app and Mapbox never both act.
4. Delete `H` until the heatmap exists; align speed range (max 8× or show 16×); Help table generated from the registry (single source of truth) and shown in Help + a printable "Keyboard shortcuts" section in the User Guide.
5. Add `aria-keyshortcuts` on the buttons the shortcuts operate.
Acceptance test (Playwright): with focus on the map canvas, ArrowRight moves the unit cursor (or Shift+Arrow pans) and the tick does not change; Ctrl+F leaves the filter panel closed; with shortcuts OFF pressing `s` does nothing; Space on a focused button activates once; Esc closes top overlay then deselects unit (pinned too); Help list equals registry (unit test).
Metric/grade: 2.1.4 (A), 2.1.1; removes the keyboard/Mapbox double-action; H2.

---

### app-a11y-07 — Timeline and clock semantics (slider, day, speed, transport, key moments)
Severity: critical | Effort: M | audit_refs: A2, D2, H9, C3, C4 | depends_on: N1; clock owner's fix for C3/C4 (single `formatBattleTime`)

Evidence: slider `min 0 max 100 step .01` (`:112294–112303`) → SR value = percent; no label (Lighthouse `label`); wrapper handler (`:112216`) + `outline:"none"` (`:112385`); transport = glyph buttons with `title` only (`:112309–112338`); event markers 8 px `div title` (`:112270–112293`); mobile scrubber touch-only (`:103177`); Day buttons/speed buttons state by bg colour only (`:112234`, `:112346`); "1x (real time)" mislabel (`_F :97429`); three clocks (`:9371`, `:100836`, `:100998`); two dates on the desktop screen (`:113086` vs `:97428`).

Fix: implement §6.9 exactly: native `<input type=range min=1 max=675 step=1>` with `aria-valuetext={formatBattleTime(tick)}`, visible `<label>`, `aria-describedby` key help, PageUp/PageDown ±12 ticks; day selector as `radiogroup` (or `role=tab`) with `aria-checked/current`; speed radiogroup with real rate ("2× = 20 game-minutes per second"); transport buttons with text names; markers → keyboard-reachable "Key moments" listbox (8 named ticks `TO :112192` + the 118 high/critical chronology events) and invisible 24/44 px buttons over the dots; remove `tabIndex` wrapper handler; ONE `formatBattleTime(tick)`/`getDay(tick)` module used by toolbar, clock chip, slider, announcements, monuments, ancestor timeline, transcript. Do not ship until C3/C4 fix lands or valuetext will announce wrong times.

Acceptance test: Lighthouse `label` passes; NVDA: "Battle time, slider, July 2, 4:30 PM, moment 267 of 675"; ←/→ change exactly one tick; PageUp/PageDown 12; unit test: `formatBattleTime` identical across all 6 call sites for ticks 1, 17, 226, 451, 538, 675; toolbar and chip show the same date.
Metric/grade: 4.1.2, 2.4.6, 3.3.2, 1.3.1; Core function/consistency; H9.

---

### app-a11y-08 — Data View: the accessible table/list alternative to the canvas + situation summary
Severity: critical | Effort: L | audit_refs: (new; supports A5, H8) | depends_on: N1, 07

Evidence: units exist only as canvas pixels (`lS :96506`) and non-interactive text rows in OOB/roster (`Xk :102321`, `Jk :102660`, mobile `:103505`) with 7–11 px text (`:102611`, `:102287`) and the wrong wording "Not on field" for unmodeled units (`:102303`); data reality: 152 positioned units in 694 keyframes (`data/placements_*.json`, computed), positions carried forward with a module-global (`i2 :96265–96305`).

Root cause: no DOM representation of the map's data; four separate ad-hoc lists.

Fix: build the Data View and `describeMoment()` exactly as §6.5–6.6: `<table>` with caption, sortable header buttons (`aria-sort`), filters, pagination (50/page), per-row "Show on map", landmark phrases from `terrain.json` `key_locations` (30) via haversine + 8-point bearing, contact clusters via `X4`; wording "No position modeled" instead of "Not on field"; reuse the same component for Order of Battle, roster, search results and ancestor picker (deletes ~500 lines of bespoke list code); available as a full-page view (`?view=text`), a side panel, and the fallback when WebGL/Mapbox fails (finding 28). Generate the same content server-side for `/battle-chronicle.html` (finding 12).

Acceptance test: NVDA table navigation (Ctrl+Alt+arrows) reads "Unit, 20th Maine Infantry, Side Union, Men 358 of 386, Activity Line of Battle, Near Little Round Top"; axe `table` rules pass; a keyboard user completes tasks 5–8 of §9.3 with the map hidden; changing tick while focus is inside the table does not move focus or re-read; Lighthouse a11y 100 on `?view=text`; performance: table render < 30 ms for 467 rows (INP budget).
Metric/grade: 1.1.1, 1.3.1, 2.1.1, 2.1.3 (AAA), 1.4.9 (AAA); Accessibility → A-range for non-visual users; SEO/text content; H7-adjacent copy cleanup ("Not on field").

---

### app-a11y-09 — Keyboard unit cursor + map surface semantics + Mapbox keyboard integration
Severity: critical | Effort: L | audit_refs: A5 | depends_on: N1, 06, 08 (formatters)

Evidence: unit selection = `canvas.onClick` only (`:97365–97377`); Mapbox canvas is the only tabbable map element (`role=region aria-label=Map`, `:94008–94023`) and its keys collide with the app (`:89757`, `:113050`); the overlay canvases have no `aria-hidden` (trail `so :96697`, labels `Uc :9846`, tint `qc :9889`).

Fix: implement §6.4 and §6.3: `role=application` map surface with `aria-roledescription`, instructions and `aria-describedby` (situation summary); "unit cursor" mode with `step()` navigation over `projectVisible()`; announcements per §6.8; `Enter` selects+pins and moves focus to the unit panel heading; `[`/`]` order-of-battle traversal; `G` Go-to-location combobox; `Shift+arrows` pan, `+/-` zoom via `keyboard:false` custom handler; two-tone cursor ring on the overlay canvas; `aria-hidden="true"` + `pointer-events:none` on decorative canvases; cursor auto-pans the camera (instant under reduced motion).

Acceptance test: unit tests for `step()` (grid of synthetic units: right/left/up/down pick expected neighbours; off-axis penalty; null at the edge); Playwright: focus map, Enter, ArrowRight ×3 → live region text matches the Data View row for the selected unit; Enter → unit panel heading focused; Esc → cursor off; NVDA/JAWS pass arrow keys through (role=application) and Tab leaves the map.
Metric/grade: 2.1.1, 2.1.3, 4.1.2, 1.1.1; unit selection possible without a mouse.

---

### app-a11y-10 — Single-pointer / non-drag alternatives: on-screen pan and zoom, Go-to-location, mobile NavigationControl, minimap semantics
Severity: high | Effort: M | audit_refs: (new; supports D3) | depends_on: N1

Evidence: mobile map created without any control (`:102981–102989`) vs desktop `addControl(new NavigationControl(), "top-right")` (`:97252`) → zoom-out on mobile needs a two-finger gesture (2.5.1) and panning is drag-only (2.5.7); mobile minimap is static divs (`:103288–103340`); desktop minimap is a click-only canvas (`:99811`).

Fix: add `NavigationControl({showCompass:false})` to the mobile and walkthrough maps and enlarge Mapbox controls to 44 px on `(pointer:coarse)` (CSS `.mapboxgl-ctrl-group button{width:44px;height:44px}`); add a `role=group aria-label="Pan the map"` D-pad (4 buttons + "Center on selected unit") in the map controls; "Go to location" combobox (30 `key_locations` + 16 tour stops) shared with `G`; make the minimap a `<button>`-wrapped image with keyboard arrow support or hide it from AT and rely on Go-to-location.

Acceptance test: on a 375 px touch viewport, zoom in/out and pan 25% N/S/E/W with single taps only; Go-to-location "Little Round Top" flies there (instant with reduced motion); axe/pa11y clean; manual TalkBack check.
Metric/grade: 2.5.1, 2.5.7 (AA), 2.5.8; mobile usability.

---

### app-a11y-11 — Live regions, event log, status messages and time-limited content
Severity: high | Effort: M | audit_refs: H4 | depends_on: N1, 05

Evidence: §2.6; no `aria-live`/`role=status|alert|log` in the app; toasts 4.5 s (`:99909`), commander cards 3 s (`:101707`), copy messages 2–4 s; results text `No units found` (`:98946`) not announced; clipboard failure → `window.prompt` (`:97932`).

Fix: implement the three live regions and the persistent event log of §6.2/§6.8; toasts become log entries with Pause/Clear, pause-on-hover/focus, no auto-removal for errors, auto-removal only if `prefs.toasts==='auto'` (default persist but collapsed to the last 4 visible); commander-change cards and event card feed the same store; announcements via a single `announce(text, {politeness})` helper (debounced, de-duplicated); copy/share result messages via `announce`; replace `window.prompt` fallback with an inline read-only input + "Copy" instructions; bookmark delete gets Undo (3.3.4/3.3.6).

Acceptance test: NVDA reads "Selected 20th Maine…" once per selection; battle events are read only when "Announce battle events" is on, ≤ 1 per 5 s; toasts remain until dismissed or paused; axe `aria-live` regions exist on load (not created on demand); Playwright asserts `#gt-live-status` text after each trigger in §6.8.
Metric/grade: 4.1.3 (AA), 2.2.1 (A), 2.2.3/2.2.4 (AAA), 3.3.1; H4 (toasts clutter).

---

### app-a11y-12 — Screen-reader narrative alternative: chronology transcript ("Battle Chronicle")
Severity: high | Effort: M | audit_refs: E4, T1, C4 | depends_on: C3/C4 (times), 08

Evidence: narrative content exists only as time-triggered panels (`CF :98252`, `LF :98595`) — 137 chronology events (45 critical / 73 high / 16 medium / 3 low) and 24 vignettes (≈ 7,200 words) — that appear and disappear with playback and are not reachable statically.

Fix: generate `/battle-chronicle.html` at build time (static HTML, no JS required) from `data/chronology_day*.json` + `vignettes_part*.json` per §6.7; in-app "Battle Log" panel uses the same component; add to sitemap, footer, Help and Extra Features menu; cross-link each entry to `/?t=TICK`; replaces the crawler-only `#seo-content` (E4).

Acceptance test: page validates (axe/pa11y 0), has exactly one `h1`, `h2` per day, chronological order verified by a script that compares tick order and times against the data; Lighthouse 100/100/100/100; every entry link opens the map at that tick (needs finding 26); NVDA "headings list" shows Day 1/2/3 and hour groups.
Metric/grade: 1.1.1/1.2.x-alternative, 2.4.10 (AAA), SEO T1; Content depth for AT users.

---

### app-a11y-13 — Accessible names, roles and states for every control (75 button sites)
Severity: high | Effort: M | audit_refs: A5, D2, H6 | depends_on: N1

Evidence: §2.2; toolbar `Vs :113287` name = letter/emoji, state colour-only; two toolbar buttons for one function (`:113145`, `:113212`); 18 "✕" (§2.2); tabs/toggles/segmented groups without roles/states; Sound button name = emoji (`:111774`).

Fix: an `IconButton` component `{icon, label, pressed?, expanded?, controls?, keyshortcut?}` that renders `<button type="button" aria-label={label} aria-pressed aria-expanded aria-controls aria-keyshortcuts title={label}>` + `<svg aria-hidden>` from the existing site-nav SVG sprite (replaces emoji/letter glyphs; H6) — so names/tooltips/icons cannot drift; segmented groups (`Side`, `Unit type`, `Disposition`, `Sort`, `Speed`, `Day`, `Legend tabs`, `Walkthrough tabs`) as `role=radiogroup`/`tablist` or `aria-pressed` toggle sets per APG; `aria-current` for the active day/stop/story; text names from §2.2; merge "S" and "🔍" buttons into one "Search units and places"; unify "Close" naming and icon.

Acceptance test: axe `button-name`, `aria-toggle-field-name`, `aria-allowed-attr` pass; a unit test asserts every `<button>` in every state has a non-empty accessible name that contains any visible text (2.5.3) — implemented with `@testing-library` `getByRole('button', {name})` sweep; Dragon "Click Search" / "Click Filter" works.
Metric/grade: 4.1.2, 2.5.3, 3.2.4, 1.3.1 (A/AA); toolbar iconography consistency (H6).

---

### app-a11y-14 — Forms and search: labels, combobox pattern, Distance tool without a mouse, errors and empty states
Severity: high | Effort: M | audit_refs: A2, H2 | depends_on: N1, 05

Evidence: §2.3; search/ancestor/monument inputs placeholder-only with `outline:none` (`:98996`, `:101356`); range without name (`:99255`); Layers checkbox text not a `label` (`:112556–112564`); Distance tool is click-on-map only (`GtbgDist :112758–112837`, uses `ev.target` canvas rect) with results not announced; filter chips `aria-pressed` missing.

Fix: visible `<label>`s (or `aria-label` where a label would clutter) for all 10 inputs; unit search = ARIA 1.2 combobox with listbox popup (`aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete=list`, ↑/↓/Enter/Esc, result count via status region); Layers panel = `<fieldset><legend>Map layers</legend>` with real `<label>`s; Distance tool gets a form alternative ("From [combobox of units/locations] To [combobox] → Distance 3,104 yd / 2,838 m / 9,311 ft, march time 42 min") plus the existing click mode, results in a `role=status`, drawing the line for both modes (fixes H12 too); Bookmark name input labelled with validation message when empty; filter sliders with `aria-valuetext`.

Acceptance test: axe `label`, `aria-input-field-name`, `autocomplete-valid` pass; keyboard-only user measures Little Round Top → Cemetery Hill without a pointer and hears the result; combobox tested with NVDA/VoiceOver (announces "5 results").
Metric/grade: 3.3.2, 4.1.2, 2.1.1, 1.3.1; H12.

---

### app-a11y-15 — Landmarks, headings, skip links, document title; fold the injected "Extra Features" overlay into the real header
Severity: high | Effort: M | audit_refs: H1, D2, E3, E4 | depends_on: N1, 01

Evidence: 0 landmarks/1 heading in the app (`:110648`, `:110700`); `#extra-features` is a `position:fixed; z-index:999999` element outside React whose corner is chosen by a collision-mover script (`index.html:176–206`, `:521–606`), is force-revealed after 5 s even during onboarding (`:202`), sits first in DOM order, and overlays story panel/toasts (`bundle.pretty.js:98418`, `:100008`).

Fix: implement the §6.2 skeleton: `<header>` with `h1`, toolbar (`role=toolbar`, `aria-label`), Extra Features + Ask the Historian as a normal menu-button inside the header `<nav>` (delete the fixed overlay, the collision mover, the reveal script and the 10 s timers — findings 23/31), `<main>`, `<aside>`, `<footer>`; an `h2` for every panel/dialog; skip links (map, timeline, unit list); update `document.title` on view/day/panel change (`"Gettysburg Interactive Map — July 2, 4:30 PM"`, throttled) and set focus to the `h2` of the newly opened panel; Extra Features menu: `aria-haspopup`/`aria-controls`, focus moves into the menu, arrow keys optional, Esc returns focus.

Acceptance test: axe `landmark-*`, `region`, `page-has-heading-one`, `heading-order`, `bypass` pass on every state; NVDA landmarks list = banner, navigation ×1–2, main, complementary, contentinfo; headings list is coherent; with the overlay gone no focused element is ever covered (Playwright hit-test at each Tab stop: `document.elementFromPoint(center)` is the focused element or its descendant).
Metric/grade: 2.4.1, 2.4.6, 1.3.1, 2.4.11 (AA), 2.4.10/2.4.12 (AAA); H1, E3.

---

### app-a11y-16 — Design tokens and contrast to AA (and AAA where cheap)
Severity: high | Effort: M | audit_refs: A1, C8 | depends_on: N1 (01 covers the interim)

Evidence: §3.1 (62 fails; `#444/#555/#666/#777/#8b6914/#3a6bc4/#cc4444/#6d7a8a` text), §3.2 (chips, inputs, slider, markers); Lighthouse fails on the live DOM.

Fix: `tokens.css` (CSS custom properties from §5.1) consumed by all components (delete inline hex literals — enforce with `stylelint-declaration-strict-value` or an ESLint rule banning `#[0-9a-f]{3,6}` in `.tsx`); disabled state via `aria-disabled` + `--text-muted-floor` (not `opacity:.3`, e.g. story nav `:98359`, `:98380`); non-text tokens for borders/OFF states/inputs; `contrast.test.ts` reads `tokens.css` and asserts every declared text/background pairing ≥ 4.5 (≥ 7 for AAA-marked) and every border/background pairing ≥ 3 — fails CI on regressions.

Acceptance test: `contrast.test.ts` green; axe `color-contrast` 0 across the state matrix (finding 32); Lighthouse a11y 100 both form factors in all states; spot check with a colour picker on 20 random elements.
Metric/grade: 1.4.3, 1.4.6 (AAA), 1.4.11, 1.4.12-friendly; Visual design & brand consistency.

---

### app-a11y-17 — Colour-independent encoding, CVD-safe palette, imagery halo, one palette for canvas/legend/badges
Severity: high | Effort: L | audit_refs: (new; supports A1, H6) | depends_on: N1, 16

Evidence: §3.2 — side colours share luminance (1.02:1, achromat ΔE 0.4); disposition = 7 px colour-only dot (`:96644–96651`) with `Lp` (`:96306`) ≠ legend `NF` (`:99384`) ≠ badges `fA` (`:98090`); "Line of Battle" has no colour (`Lp` `null`); legend "Dot outline = side color" untrue (`:99519`); unit fill vs imagery 1.5–2.5:1; map lines 1.3–3.9:1.

Fix (§5.2): single `palette.ts` `{side:{union,confed}, disposition:{…glyph,color}}` feeding canvas, legend, badges, roster, Data View; luminance-separated default pair + hatch pattern for Confederate + "U/C" letter prefix on labels; disposition glyphs drawn beside units (≥ 12 px) and shown in legend/lists; two-tone halo on units and glyphs; 2 px black casing under map lines with `line-gap`/`line-blur` tuned; Settings → "Colour-blind safe" (Okabe–Ito) and "High contrast" (bolder outlines, larger glyphs); legend text rewritten to describe what is really drawn.

Acceptance test: `cvd.py`-style unit test on `palette.ts` (protan/deutan/tritan/achromat ΔE2000 ≥ 25 between sides; luminance contrast between sides ≥ 2.5:1); visual test under DevTools "Emulate vision deficiencies" (protanopia, deuteranopia, tritanopia, achromatopsia) — all 11 dispositions and both sides identifiable using glyph/pattern alone; canvas pixel test: unit halo contrast ≥ 3:1 against five sampled satellite tiles.
Metric/grade: 1.4.1, 1.4.11, 1.3.3 (A/AA); Visual design B- → A-; Historical-data legibility.


---

### app-a11y-18 — Type scale in `rem`, 12 px floor, user text-size control, canvas label scaling
Severity: high | Effort: L | audit_refs: A4, D2, S4 | depends_on: N1, 16

Evidence: 268 `fontSize` literals in the app region, 133 below 12 px, 21 ≤ 9 px, min 7 px (`:102611`), 8 px ×7 (`:102287–102310`, `:102594–102599`, `:103294`); all px so nothing follows OS/browser text-size preferences; canvas labels 8/9/10 px (`:96663`) and Mapbox layer labels 9–10 px (`:9763`, `:9788`); text-spacing clipping risk (§3.5).

Fix: `--fs-*` rem tokens (§5.1) replace every literal (codemod: `fontSize: (\d+)` → token via a lookup table; 12 px floor, so 7–11 → `--fs-xs`); `html{font-size:calc(16px*var(--gt-font-scale))}` driven by Settings (100/125/150/200%) and OS text size where supported; replace fixed `height`/`minHeight` on text containers with `min-height` + padding; remove `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` from OOB/roster/unit-value rows in favour of wrapping (title/`aria-label` not needed once text is complete); canvas labels drawn at `max(12, 12*scale)` px with collision culling (already present: `Ee >= it` zoom gating, `:96653–96663`) and Mapbox symbol layers at ≥ 12 px (`text-size` 12–13); the interim shim (finding 01) handles inline 7–11 px until the codemod lands.

Acceptance test: script `no-small-text.test`: computed `font-size` of every visible text node ≥ 12 px in all states (Playwright sweep); WCAG text-spacing injection (line-height 1.5, paragraph spacing 2×, letter-spacing .12em, word-spacing .16em) produces no clipped text (`scrollWidth ≤ clientWidth` and `scrollHeight ≤ clientHeight` for text containers) and no overlap; Settings text scale 200% keeps every control reachable.
Metric/grade: BRIEF "text ≥ 12 px"; 1.4.4, 1.4.12 (AA), 1.4.8 (AAA); Fit & finish (D+ mobile).

---

### app-a11y-19 — Target size: 44 px on touch, ≥ 32 px on desktop pointers, never < 24 px
Severity: high | Effort: M | audit_refs: A3, D2, S4 | depends_on: N1, 13

Evidence: §3.4 — `padding:0` reset (`index.html:61`) leaves ✕ buttons at ≈ 11–20 × 13–25 px, dots 6–8 px, speed buttons ≈ 26 × 20, disposition chips ≈ 22 px tall, toolbar 28 × 26, Mapbox controls 29 × 29; only a few buttons carry 44 px (`:101341`, `:102118`, `:103820`).

Fix: `IconButton`/`Chip`/`Tab` primitives enforce `min-width/min-height: var(--hit-min)` where `--hit-min` = 44 px under `(pointer: coarse)` and 32 px otherwise (desktop toolbar keeps 32 — documented AAA deviation); small visuals get an invisible hit area (`position:relative` + `::after{content:"";position:absolute;inset:-9px}` for 6–8 px dots; for the timeline markers use the Key-moments list as the primary target); 8 px gap between adjacent targets; mobile scrubber thumb hit area 44 px; Mapbox controls 44 px on coarse pointers; keep the 2.5.8 spacing exemption out of the design (never rely on it).

Acceptance test: Playwright sweep over every visible `button,a,input,select,[role=button|tab|radio|option],[tabindex]:not([tabindex="-1"])` in each state — assert bounding box ≥ 24×24 (fine) / ≥ 44×44 (context with `hasTouch:true, isMobile:true`) with an explicit allow-list (inline links, native slider track); report CSV for review; axe `target-size` passes on all states.
Metric/grade: 2.5.8 (AA), 2.5.5 (AAA); mobile usability D+ → B+ (with 20/24); BRIEF "≥ 44×44 CSS px on touch".

---

### app-a11y-20 — Reflow, zoom, text spacing, landscape: responsive layout by width (not by user choice), toolbar overflow, no load-time constants
Severity: high | Effort: L | audit_refs: C1, C2, D2, S4, E1 | depends_on: N1, 18, 19; coordinate with the mobile-layout specialist

Evidence: `html, body {overflow:hidden}` + `#root{position:fixed; contain:strict}` (`index.html:62–70`); toolbar = three clusters that collide below ≈ 1400 px (`:113074–113232`, `toolbarCenter` `:113336`); timeline controls `nowrap` ≈ 800 px (`:112425`); search panel 440 px centred (`:98953–98968`); style constants computed once (`:98111–98115`, `:102708–102712`); desktop vs mobile is a user click (`dO`), so a desktop-layout user at 200–400% zoom is never switched; mobile fixed 52+42+140 px chrome (`:103715`, `:103744`, `:103770`).

Fix
1. One component tree, CSS layout modes by container width (container queries / `ResizeObserver` class on `#root`): ≥ 1100 "wide" (current desktop), 640–1099 "medium" (toolbar icons only + overflow menu, timeline two rows), < 640 "narrow" (mobile sheet layout). The chooser becomes a preference for the *default*, not a hard fork (finding 03). At 200%/400% zoom the viewport shrinks and the layout mode follows automatically.
2. Toolbar: priority+ pattern — visible priority buttons (Play/Search/Filter/Help) + a "More tools" `menu-button` with the rest; measured with `ResizeObserver`; never overlap; 12 px text.
3. Timeline: wraps into two rows (transport + slider) under 720 px; speed becomes a `<select>` under 480 px; credit/e-mail line moves to the footer.
4. Panels: `width:min(440px, calc(100vw - 24px))`, `max-height: calc(100dvh - var(--chrome))` with internal scroll; no `translateX(-50%)` centring (use `inset-inline`/`margin-inline:auto`); style constants replaced with CSS (`@media`/container queries) — no `window.innerWidth` reads at module load.
5. Allow the app container to scroll (`overflow:auto`) below 320×256 rather than clipping; map remains fixed 2-D content (exempt).
6. Landscape phones (812×375): bars collapse to 44 px; map ≥ 55% of height; `env(safe-area-inset-*)` padding.
7. `manifest.json`: drop `"orientation":"landscape"` (finding 29).

Acceptance test: Playwright viewports 1440×900, 1280×720, 1024×768, 768×1024, 375×812, 812×375, 320×256 (400% of 1280×1024): (a) `document.documentElement.scrollWidth <= innerWidth` outside the map; (b) an overlap detector (pairwise `getBoundingClientRect` intersection of all visible interactive elements) returns none; (c) every toolbar action reachable by Tab; (d) text-spacing injection leaves no clipping (finding 18); (e) toolbar at 1366 px shows no overlap (the estimate above says the current one overlaps).
Metric/grade: 1.4.10, 1.4.4, 1.4.12, 1.3.4 (AA); "no overlapping/clipped UI at 320–2560 and in landscape" (BRIEF A+); Fit & finish/Usability on mobile.

---

### app-a11y-21 — Motion: honour `prefers-reduced-motion`, add in-app control, make intro/tour stoppable
Severity: medium | Effort: M | audit_refs: A6 | depends_on: N1, 26 (setting), 01 (interim flag)

Evidence: only boot splash, `#extra-features` and the site-nav overlays respect reduced motion (`index.html:139`, `:206`, `:252`; `site-nav.css:14`, `:53`, `:82`); the app itself does not: intro fast-forward `eO=3500` (`:101471`), contact-glow `0.4+0.6|sin(t/300)|` (`:96615`), sub-tick interpolation (`ut = Hc/Pe`, `:97001`), 8 s tint transition (`:9895`), NPS tour autoplay with timeouts (`:100329–100341`) that Esc cannot stop, fly-to animations (Mapbox itself respects reduced motion for `flyTo`: `matchMedia` at `:11447`), trails on by default (`:97219`).

Fix: read `prefs.motion` (system → `matchMedia`) in one `useMotion()` hook/global; when reduced: skip intro entirely, no glow (solid halo), no interpolation (positions step per tick), trails default OFF, tint changes instantly, `flyTo`→`jumpTo`, tour advances only on user action (no autoplay), playback default speed 1×; when full: keep everything but give the tour/intro visible Pause/Skip buttons and Esc; document in Help. (Interim: bridge patch J in 02.)

Acceptance test: `emulateMedia({reducedMotion:'reduce'})` → splash absent within 200 ms, canvas frame hash identical across two frames at the same tick (no interpolation), no `requestAnimationFrame` loop while paused; toggling the in-app setting overrides the OS; tour has Pause and stops on Esc.
Metric/grade: 2.2.2, 2.3.3 (AAA), 1.4.13-adjacent; vestibular safety; reliability of first impression.

---

### app-a11y-22 — Hover-only and `title`-only content (1.4.13): monuments, timeline markers, toolbar tooltips; remove the duplicate injected star overlay
Severity: medium | Effort: S | audit_refs: (new; H6-adjacent) | depends_on: N1

Evidence: monument markers are `div` with `onMouseEnter/Leave` and a `pointerEvents:none` tooltip (`:100914–100959`, `:100974`) — not focusable, not hoverable, not dismissible; timeline markers rely on `title` (`:112275`); toolbar buttons rely on `title` (`:113291`); `index.html:608–714` injects a *second*, hard-coded star overlay on the same Monuments button with `title` tooltips and known drift when panning (its own comment, `:620–622`); dead hover popup `fF` (`:97063`).

Fix: monument markers → `<button aria-label="{name}. {label}. Jump to {time}" aria-describedby=popover-id>`; content shown in a native Popover (`popover="manual"` + show on hover/focus, hide on Esc/blur/pointerleave with a 300 ms grace so it stays hoverable), text persistent while focused; timeline markers → Key-moments list (finding 07) with visible names; toolbar buttons show a visible-label tooltip built from the same label (Esc dismisses, hoverable), never native-`title`-only; delete the injected star overlay and the dead `fF`.

Acceptance test: Tab to a monument marker → popover text visible and read (`aria-describedby`); pointer can move onto the popover without it closing; Esc hides it; exactly one marker per monument exists (the 20 React markers from `mA :100615`; none from the injected star overlay, which loads a different 9-entry file `data/monuments.json`).
Metric/grade: 1.4.13 (AA), 2.1.1, 1.3.1; removes a DOM/overlay duplicate.

---

### app-a11y-23 — Focus visibility and focus-not-obscured
Severity: high | Effort: S | audit_refs: A6, H1 | depends_on: 01 (interim), 05, 15

Evidence: inline `outline:"none"` on the search input (`:98996`), ancestor input (`:101356`) and timeline wrapper (`:112385`); `site-nav.css:43–47` and `:110` `outline:none` on the Historian pin and menu cards (replacement change 1.14:1 and 1.71:1); global ring `#c9a24b` is 1.15:1 over wheat-field imagery (`tokens.py`); `#extra-features` fixed overlay z 999999 moving around the screen (`index.html:176–206`, `:535–590`) can cover the focused control; mobile bottom bars cover content.

Fix: focus token `--focus-ring: 2px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 4px #000` on `:focus-visible` for every focusable (inputs get it too — remove the three inline `outline:none`); delete the two `site-nav.css` outline removals; add `scroll-padding-top/bottom: var(--chrome-h)` so focused rows aren't hidden under fixed bars; remove the floating overlay (finding 15) so nothing fixed sits over focusable content; add a Playwright "focus not obscured" sweep.

Acceptance test: Tab through every state — `elementFromPoint(center of focused element)` is the focused element (or descendant) for 100% of stops; focus ring pixel contrast ≥ 3:1 against 5 imagery samples; axe `focus-order-semantics`/`tabindex` clean; manual: ring visible on Historian pin.
Metric/grade: 2.4.7, 2.4.11 (AA), 2.4.13 (AAA), 1.4.11.

---

### app-a11y-24 — Mobile layout accessibility: one control set, native scrubber, dialog sheets, zoom buttons, no covered/hidden focusables, pinch-zoom allowed
Severity: high | Effort: M | audit_refs: C1, C2, H3, S4 | depends_on: N1, 05, 10; the mobile-layout specialist owns C1/C2 layout; this finding states the a11y acceptance

Evidence: `AO` renders `IO` (`:113249`), `XF` (`:113252`), `VF` (`:113244`), `WF` (`:113245`), `KF` (`:113250`), `CF/LF/_F` (`:113246–113248`), `qF` (`:113259`), `MF` (`:113283`) for every layout, while `pO` is another full-screen tree (`:113061–113064`, root `zIndex:100` `:103703`); `IO` (`zIndex:100`, `:112386`) is later in DOM order so it paints over `pO`'s bottom bar → C1/C2 (the 572 px transport row is `IO`'s `Po.controls`). Consequences for AT: duplicate Play/Prev/Next controls, focusable controls hidden under other UI; mobile scrubber touch-only (`:103177`); tools sheet is a `div` overlay (`:103368`); `touch-action:none` root (`:103705`) — likely disables browser pinch-zoom; mobile map has no zoom buttons (`:102981`); mobile minimap static (`:103288`); toolbar icon spans duplicate the label ("FFilter", `:103494`).

Fix: mount only the active layout's controls (or, per finding 20, a single responsive tree); anything not visible is unmounted or `inert`; scrubber → native slider (finding 07); Tools sheet → `<dialog>` with `aria-labelledby`, 44 px rows, icon spans `aria-hidden`; root `touch-action: pan-x pan-y pinch-zoom` (the Mapbox canvas keeps its own `touch-action:none`); add NavigationControl/D-pad (finding 10); safe-area insets; 44 px targets (finding 19); landscape behaviour (finding 20); TalkBack/VoiceOver pass over the sheet and Text view.

Acceptance test: in the mobile layout `document.querySelectorAll('button')` contains exactly one Play button; hit-test of every focusable centre returns itself (C2 acceptance); browser pinch-zoom to 200% works (Chrome Android manual); TalkBack swipe order = top bar → day tabs → map summary → timeline → tools; axe clean on 6 mobile states.
Metric/grade: 2.1.1, 2.4.3, 2.5.1, 2.5.7, 2.5.8, 1.4.4; Mobile Core function D → A- (with C1/C2), Usability.

---

### app-a11y-25 — Virtual Walkthrough view (`_O`): tabs, cards, headings, labels, iframe titles
Severity: medium | Effort: M | audit_refs: H13, D2 | depends_on: N1, 04, 13

Evidence: view has its own header `span` title (`:110869`, `:110989`) but no `h1`; `h2` stop title (`:110648`) and `h3` cards (`:110700`) exist; tab buttons without `role=tab` (`:110879`, `:111156`); stop/side chips = plain buttons with active class only (`:110901`, `:111227`); monument cards `div onClick` with 100 identical "View on map ↗" links (`:110690–110731`, `:110726`); search inputs placeholder-only (`:110928`, `:111213`); `select` unlabeled (`:111241`); `dangerouslySetInnerHTML` for stop history (`:110653`, static data — acceptable but keep sanitised); Street View iframe title = stop name only (`:110665`); list capped at 100 with "Refine your search" text not announced (`:110963`, `:111291`); Mapbox map created without attribution control (`:110777`, `:102988` — verify licensing).

Fix: `h1` "Virtual Walkthrough" in the header; tabs `role=tablist/tab/tabpanel` with arrow keys; stop chips `aria-current`; monument list `<ul>` of `<article>` (`h3`) with "Fly to on map" `<button>` and "View {name} on Google Maps (opens new tab)" link; labelled search/select; result count `role=status` ("Showing 100 of 512 — refine your search"); iframe `title="Street View panorama near {name}"` plus the existing "Open in Google Maps" link as fallback; NPS video link `aria-label="Watch NPS video for {name} (opens nps.gov)"`; ensure the map itself has an accessible name and a text alternative (the lists are the alternative).

Acceptance test: axe/pa11y clean on both walkthrough branches (mobile `kr`, desktop `Tn`); NVDA headings list shows H1 → stops; keyboard user opens stop 5 and reaches its Street View link; count announced after each filter.
Metric/grade: 1.3.1, 2.4.6, 2.4.4, 4.1.2, 3.3.2.

---

### app-a11y-26 — Accessibility settings dialog + deep links (state in the URL) + working share links
Severity: medium | Effort: M | audit_refs: H3, (new) | depends_on: N1, 05

Evidence: share/bookmark URLs `?t=&u=&z=&ll=` are written (`:97823–97830`, `:97862`) but never read (only `ancestor`, `:101019`); preferences store exists but holds only `showLegend`, `showMinimap` (`:9327–9341`, `:9417–9418`); layout choice/`view` unpersisted (H3).

Fix: `parseUrlState()` on load and on `popstate` for `t,u,z,ll,ancestor,view,layout,intro,motion,palette,contrast` (validated/clamped); `history.replaceState` when the user shares/bookmarks; Settings dialog (§6.12) with live preview; every setting mirrored in `gtbg_prefs`; test hooks (`?intro=0&layout=desktop&view=map&motion=reduce`) documented for the CI state matrix.

Acceptance test: opening a copied link restores tick, selected unit, zoom and centre; invalid params are ignored silently; settings persist across reloads and apply before first paint (no flash); Playwright state matrix uses only URL params.
Metric/grade: supports 2.2.6-style continuity, 3.2.6; unblocks findings 12, 32; fixes a functional bug.

---

### app-a11y-27 — Copy, debug text and dead-code hygiene that affects AT and clarity
Severity: medium | Effort: S | audit_refs: H7, H10 | depends_on: N1

Evidence: user-visible debug FPS text on the canvas (`:96684–96687`) and in the clock chip (`:97446–97448`); dead hover popup `fF` (`:97063`); dead `H` heatmap shortcut (`:113022`, Help `HelpModal` chunk, onboarding `:111995`); dead HelpModal `useGlobalKeyboard`; undefined keyframes `slideIn` (`:100024`); Help "About" says "445+ units" (H10) and Esc "Dismiss panel / deselect unit" (partly false); OOB abbreviations `MG/BG/LG/Gen/Col` (`:102536–102547`); "Not on field" for unmodeled units (`:102303`, `:103555`); "Trails ON/OFF" with a "〰" glyph read aloud (`:97382`); two names for one action ("S" vs "🔍 Find Unit / Location").

Fix: delete FPS overlays (keep an opt-in `?debug=fps`); delete dead code; make Help generated from the shortcut registry (finding 06) and from data (`unitCount` computed, not typed); expand abbreviations (or `<abbr title>`); wording "No position modeled"; decorative glyphs `aria-hidden`; single search entry point.

Acceptance test: grep of the built bundle for `fps`, `hoveredUnit`, `toggleHeatmap`, `slideIn`, `445+` returns nothing; Help table equals registry (unit test); 3.1.4 AAA check on OOB.
Metric/grade: 3.2.4, 3.1.4 (AAA), professional copy voice (H7).

---

### app-a11y-28 — Errors are invisible: map/WebGL/data failures need messages and a fallback to Text view
Severity: medium | Effort: M | audit_refs: (new) | depends_on: N1, 08, 11

Evidence: bulk data loads have no error path (`iF` `:96834–96899` Promise.all with `.json()` and no catch; `rF :96919`; `oF :96923`), `zp` swallows failures as empty arrays (`:96909`); Mapbox `error` event unhandled (map init `:97237–97261`); no WebGL capability check (`mapboxgl.supported()`); boot splash has no timeout/failure state (`index.html:742–748`); `role="progressbar"` has no name update; clipboard failure → `window.prompt` (`:97932`).

Fix: central `loadData()` with per-file retry (2×, back-off) and a visible `role=alert` banner ("Some battle data could not be loaded (3 of 30 files). Retry / Continue in Text view"); `map.on('error')` → announce + offer Text view; WebGL unsupported → open Text view automatically; boot splash gets `role="status"` text updated with progress ("Loading battle data 12 of 30") and a 10 s timeout message with Retry; `aria-busy` on the map region while loading.

Acceptance test: Playwright with `route.abort()` on 3 JSON files and with WebGL disabled (`--disable-gpu --disable-webgl`) → alert text present and Text view usable; with the Mapbox token blocked → banner; NVDA announces the alert.
Metric/grade: 3.3.1 (A), 4.1.3 (AA); Reliability (B-/C → A-).

---

### app-a11y-29 — PWA and reload behaviour: remove landscape lock and the first-visit forced reload
Severity: medium | Effort: S | audit_refs: E1, C6 | depends_on: none

Evidence: `manifest.json` `"orientation": "landscape"`; `index.html:263–268` `controllerchange → location.reload()`; `sw.js` `skipWaiting()` + `clients.claim()` (C6).

Fix: delete the `orientation` member (or `"any"`); remove the forced reload — show a non-blocking "A new version is available — Refresh" status message (`role=status`, keyboard-reachable button) when a waiting worker exists, and only reload on user request (3.2.5); keep `skipWaiting` off.

Acceptance test: installed PWA rotates in portrait; first visit performs a single navigation (`performance.getEntriesByType('navigation').length === 1`, no `redirectCount`); the update message appears after a deploy and is announced.
Metric/grade: 1.3.4 (AA), 3.2.5 (AAA); also C6/P1 performance.

---

### app-a11y-30 — Cheap AAA set: sign-off checklist
Severity: low | Effort: M | audit_refs: A1, A3 | depends_on: 16, 19, 21, 11, 15, 23, 27

Implement and record in the ACR: 1.4.6 (7:1 body tokens), 1.4.8 (line-height ≥ 1.5, text-size control, no horizontal scroll at 200%), 2.1.3, 2.2.3/2.2.4 (persistent log, optional toasts), 2.3.3 (reduce motion), 2.4.10 (headings in every panel), 2.4.12 (no fixed overlays), 2.4.13 (two-tone ring), 2.5.5 (44 px on touch; documented desktop toolbar deviation), 3.1.4 (abbr), 3.2.5, 3.3.5 (per-panel "How to use" link to the Help section), 3.3.6 (undo bookmarks). Acceptance: each item has a test or manual step in §9 and a row in the ACR marked "Supports".

---

### app-a11y-31 — Retire the legacy injected scripts in `index.html` (they are accessibility liabilities)
Severity: medium | Effort: S | audit_refs: H1, E4 | depends_on: 15, 03, 22

Evidence and disposition:
| Script (`index.html`) | Lines | Problem | Action |
|---|---|---|---|
| Label patch | 398–440 | inert (`b.title` check, §1); 25× polling; deletes `#seo-content` | delete |
| Onboarding banner injector | 355–396 | scrapes DOM text "Choose Your Experience"; fragile | move copy into Entry dialog (03) |
| Reveal script | 441–519 | click-text sniffing, 1.5 s/10 s timers, overlay revealed over onboarding by 5 s CSS fallback (`:202`) | delete with overlay (15) |
| Collision mover | 521–606 | moves a fixed overlay among six corners after every click; 2.4.11 risk | delete (15) |
| Populate | 294–353 | fills overlay after idle; ok logic | port into header component (15) |
| Star overlay | 608–714 | duplicate of `KF` monuments; wrong after pan/zoom | delete (22) |
| SW registration | 255–277 | forced reload | see 29 |
Acceptance test: `index.html` contains no inline `<script>` other than the reduced-motion flag and JSON-LD; all removed behaviours exist as React components with tests.
Metric/grade: perf (main thread), reliability, 2.4.11.

---

### app-a11y-32 — Automated accessibility test infrastructure and CI gates
Severity: high | Effort: L | audit_refs: N1 | depends_on: N1, 26 (URL state hooks)

Fix: see §9.1–9.2 for the full spec. Deliverables: `tests/a11y/state-matrix.spec.ts` (Playwright + `@axe-core/playwright`, ≈ 45 states × {desktop 1440×900, mobile 390×844 touch} × {default, reduced-motion, forced-colors}); `pa11y-ci.json` with `actions` for panels; `lighthouserc.js` (a11y = 1.0, `color-contrast`, `label`, `button-name`, `aria-*` as errors) for the home URL, `/?view=text`, `/battle-chronicle.html`; `eslint-plugin-jsx-a11y` (recommended + strict) as errors; `vitest` + `@testing-library/react` + `vitest-axe` component tests for the primitives; token contrast test (finding 16); target-size / overlap / focus-obscured / no-small-text sweeps; keyboard journey specs; CI on every PR and nightly against production; Netlify deploy preview check.
Acceptance test: CI fails on any new axe violation, contrast token regression, missing accessible name, or target < 24 px; green baseline committed; nightly production run posts results.
Metric/grade: locks in A+ (regression protection); "tested" bar in BRIEF.

---

### app-a11y-33 — Manual assistive-technology program (scripts, matrix, exit criteria)
Severity: high | Effort: M | audit_refs: (new) | depends_on: 08, 09, 05, 07

Fix: §9.3–9.5 scripts executed on: NVDA (latest) + Firefox and Chrome; JAWS (trial) + Chrome; VoiceOver macOS + Safari; VoiceOver iOS + Safari; TalkBack + Chrome; Windows Voice Access / Dragon; Windows High Contrast (Aquatic/Desert/Dusk/Night sky); Chrome/Firefox 200% and 400% zoom; keyboard-only (no mouse plugged in); switch-access emulation via the keyboard; results logged in `docs/a11y/test-log.md` with defects filed and re-tested; invite 2–3 real AT users for a paid usability session before "A+".
Acceptance test: every §9.3 task passes on every row of the matrix with no workaround; log committed.
Metric/grade: converts "no known automated violations" into verified usability; feeds the ACR.

---

### app-a11y-34 — Accessibility statement, Accessibility Conformance Report and feedback channel
Severity: medium | Effort: S | audit_refs: G1 | depends_on: 33

Fix: `/accessibility.html` (linked from footer, Help, Extra Features): conformance claim "WCAG 2.2 Level AA (with noted AAA items)", scope (main map, extra features, PDF guide), technologies, known limitations (Mapbox raster imagery is decorative; third-party NPS video captions, Google Street View embeds), how to use the Text view/keyboard help, contact e-mail with 2-business-day response, date of last test; `docs/a11y/ACR-WCAG2.2.md` (VPAT 2.5 layout) generated from the §9.3 log; PDF user guide gets tagged/accessible (real headings, alt text, document title/metadata replacing "(anonymous)" — G1) and a keyboard-shortcuts page.
Acceptance test: page passes axe/pa11y and Lighthouse; ACR rows = the §4 table with "Supports" evidence links; the PDF passes the PAC 2024 / Acrobat accessibility checker.
Metric/grade: Documentation (B → A), Privacy/legal pages (B+ → A-).


---------------------------------------------------------------------------------------------------

## 8. Sequencing, effort and expected movement

### 8.1 Phases (solo developer; effort per finding above; total ≈ 50 developer-days ≈ 10 calendar weeks, less with parallel AI-assisted work)

| Phase | Findings | Why this order | Outcome |
|---|---|---|---|
| 0 — Bridge (days 1–3, no source needed) | 01, 02, 29, start 31 | 5 blocking defects (keyboard entry, slider label, double-fire keys, contrast, landmarks) are fixable today by editing `index.html`, adding one CSS file, and validated string patches with a safe re-hash pipeline | Lighthouse a11y ≈ 100 on the loaded state; keyboard users can enter and time-scrub; forced-colors/reduced-motion baseline |
| 1 — Primitives (weeks 1–3, needs source N1) | 16, 13, 05, 06, 23, 04, 03, 07, 11 | Tokens, `IconButton`, `Dialog/Panel`, shortcut module, live regions are dependencies of everything else; start lint/unit-test part of 32 here | All 17 click-only controls native; every overlay is a real dialog/panel; one keyboard model; named controls; live regions |
| 2 — Non-visual map (weeks 3–6) | 08, 09, 10, 12, 14, 15, 25, 26, 28 | The product's core alternative; needs 07 (formatter) and 06 (keys) | Data View + unit cursor + chronicle + forms/combobox + landmarks/header (overlay retired) + deep links + error handling |
| 3 — Visual/responsive (weeks 5–8) | 17, 18, 19, 20, 21, 22, 24, 27 | Larger refactors of layout and canvas drawing; coordinate with the mobile-layout owner (C1/C2/H3) | Redundant encoding, type/targets/reflow/motion, mobile single tree |
| 4 — Proof (weeks 7–10) | 32 (complete), 33, 34, 30, 31 (finish) | Nothing is "A+" until tested with AT and documented | State-matrix CI, manual AT log, ACR + statement |

Critical path: N1 (source) → 16/13/05 primitives → 08/09 → 33. Independent of N1: 01, 02, 29 (manifest), 34 draft.

### 8.2 Expected movement (targets, not promises)

| Metric | Now | After Phase 0 | After Phase 4 |
|---|---|---|---|
| Lighthouse Accessibility mobile / desktop (loaded state) | 90 / 90 | 100 / 100 | 100 / 100 in all ≈ 45 states |
| WCAG 2.2 A+AA criteria failing (of 55) | 23 | ≈ 15 | 0 |
| Text styles failing 4.5:1 | 62 of 234 | 0 (shim, inline colours) | 0 (tokens, CI-enforced) |
| Font-size literals < 12 px | 133 of 268 | 0 effective (shim) | 0 (rem tokens) |
| Click-only controls | 17 | 2–3 (entry + skip fixed) | 0 |
| Controls without accessible name | ≈ 60 | ≈ 15 | 0 |
| Keyboard task success (15 tasks, §9.3) | ≈ 2/15 (can't pass the chooser or select a unit) | ≈ 6/15 | 15/15 |
| Screen-reader task success | ≈ 0/15 for map tasks | ≈ 2/15 | 15/15 |
| Accessibility grade (audit scale) | D desktop / D mobile (C+/C in earlier audit) | C | A+ |

---------------------------------------------------------------------------------------------------

## 9. Test plan

### 9.1 Automated — Playwright + axe-core state matrix (the tests Lighthouse cannot do)

Prerequisites: URL test hooks (finding 26) so every state is reachable without clicking through onboarding: `?intro=0&layout=desktop|mobile&view=map|text&t=<tick>&u=<unitId>&panel=<id>&motion=reduce&palette=cvd&contrast=high`.

```ts
// tests/a11y/state-matrix.spec.ts
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const btn = (name: RegExp | string) => (p: Page) => p.getByRole('button', { name }).click();
type S = { id: string; url: string; setup?: (p: Page) => Promise<void> };
const BASE = '/?intro=0&layout=desktop';
const STATES: S[] = [
  { id: 'boot',           url: '/' },
  { id: 'entry-dialog',   url: '/?intro=0' },
  { id: 'onboarding',     url: BASE + '&tour=1' },
  { id: 'day1-dawn',      url: BASE + '&t=1' },
  { id: 'pickett',        url: BASE + '&t=538' },
  { id: 'unit-selected',  url: BASE + '&t=267&u=U-20ME' },
  { id: 'story-panel',    url: BASE + '&t=28' },
  { id: 'search',         url: BASE, setup: btn(/search units/i) },
  { id: 'filter',         url: BASE, setup: btn(/filter/i) },
  { id: 'legend',         url: BASE, setup: btn(/legend/i) },
  { id: 'roster',         url: BASE, setup: btn(/unit roster/i) },
  { id: 'oob',            url: BASE, setup: btn(/order of battle/i) },
  { id: 'ancestor',       url: BASE, setup: btn(/follow your ancestor/i) },
  { id: 'soldiers-eye',   url: BASE, setup: btn(/soldier.s eye/i) },
  { id: 'bookmarks',      url: BASE, setup: btn(/bookmarks/i) },
  { id: 'help',           url: BASE, setup: btn(/help/i) },
  { id: 'layers',         url: BASE, setup: btn(/map layers/i) },
  { id: 'distance',       url: BASE, setup: btn(/distance/i) },
  { id: 'settings',       url: BASE, setup: btn(/accessibility settings/i) },
  { id: 'extra-menu',     url: BASE, setup: btn(/extra features/i) },
  { id: 'walkthrough',    url: BASE, setup: btn(/virtual walkthrough/i) },
  { id: 'text-view',      url: '/?intro=0&view=text' },
  { id: 'chronicle',      url: '/battle-chronicle.html' },
  { id: 'a11y-statement', url: '/accessibility.html' },
];
for (const s of STATES) {
  test(`axe ${s.id}`, async ({ page }) => {
    await page.goto(s.url);
    await page.waitForFunction(() => document.fonts.ready.then(() => true));
    await page.getByRole('main').waitFor();
    await s.setup?.(page);
    const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(r.incomplete.filter(i => i.impact === 'serious' || i.impact === 'critical'), 'needs review').toEqual([]);
    expect(r.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
  });
}
```
`playwright.config.ts` projects: `desktop-chrome` (1440×900), `mobile-chrome` (Pixel 7, `hasTouch`, `isMobile`), `firefox`, `webkit`; each state also runs with `reducedMotion:'reduce'` and `forcedColors:'active'` (contexts), and mobile projects repeat with `layout=mobile`.

Regression specs (each maps to a finding):
```ts
// 06 — key conflicts and 2.1.4
test('map focus: arrows move the unit cursor, never tick+pan together', async ({ page }) => {
  await page.goto(BASE + '&t=100'); const t0 = await tick(page);
  await page.locator('#gt-map').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight');
  expect(await tick(page)).toBe(t0);                                   // time unchanged
  await expect(page.locator('#gt-live-status')).toContainText(/Union|Confederate/);
});
test('Ctrl+F does not open the filter panel; shortcuts off = inert', async ({ page }) => {
  await page.goto(BASE); await page.keyboard.press('Control+f');
  await expect(page.getByRole('region', { name: /filters/i })).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem('gtbg_prefs', JSON.stringify({ shortcuts: 'off' }))); await page.reload();
  await page.keyboard.press('s'); await expect(page.getByRole('combobox', { name: /search units/i })).toHaveCount(0);
});
test('Space on a focused button activates once and never steals playback', async ({ page }) => {
  await page.goto(BASE); const play = page.getByRole('button', { name: 'Play' }); const fwd = page.getByRole('button', { name: /forward one hour/i });
  await fwd.focus(); await page.keyboard.press('Space');
  await expect(play).toBeVisible();                                    // still paused
  expect(await tick(page)).toBe(13);                                   // moved exactly one hour (12 ticks) from tick 1
});
// 05 — dialogs
for (const [name, opener] of DIALOGS) test(`dialog ${name}: focus in, trap, Esc, restore`, async ({ page }) => {
  await page.goto(BASE); const trigger = page.getByRole('button', { name: opener }); await trigger.focus(); await page.keyboard.press('Enter');
  const dlg = page.getByRole('dialog'); await expect(dlg).toBeVisible();
  expect(await dlg.evaluate(d => d.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); expect(await dlg.evaluate(d => d.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Escape'); await expect(dlg).toBeHidden(); await expect(trigger).toBeFocused();
});
// 24/20 — target size, overlap, focus-not-obscured, small text
const VIS = (e: Element) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[inert],[aria-hidden=true]'); };
test('target size', async ({ page, isMobile }) => {
  await page.goto(BASE); const min = isMobile ? 44 : 24;
  const bad = await page.evaluate(([min, vis]) => { const V = eval(vis);
    return [...document.querySelectorAll('button,a[href],input,select,summary,[role=button],[role=tab],[role=radio],[role=option],[role=slider]')].filter(V)
      .map(e => { const r = e.getBoundingClientRect(); return { n: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter(x => x.w < min || x.h < min); }, [min, VIS.toString()] as const);
  expect(bad).toEqual([]);
});
test('no overlapping controls at 1366x768 and 375x812', async ({ page }) => { /* pairwise getBoundingClientRect intersection of visible interactive elements, ignoring ancestor/descendant pairs */ });
test('focus never obscured', async ({ page }) => {
  await page.goto(BASE);
  for (let i = 0; i < 120; i++) { await page.keyboard.press('Tab');
    expect(await page.evaluate(() => { const a = document.activeElement as HTMLElement; const r = a.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return a === top || a.contains(top); })).toBe(true); }
});
test('font-size >= 12px everywhere', async ({ page }) => { /* walk text nodes' parents; assert parseFloat(getComputedStyle(p).fontSize) >= 12 */ });
// 18/20 — text spacing (WCAG 1.4.12) and reflow (1.4.10)
test('text spacing does not clip', async ({ page }) => {
  await page.goto(BASE + '&panel=unit&u=U-20ME&t=267');
  await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' });
  const clipped = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => !e.children.length && e.textContent!.trim() &&
    getComputedStyle(e).overflow !== 'visible' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map(e => e.textContent!.trim().slice(0, 40)));
  expect(clipped).toEqual([]);
});
test('reflow at 400% (320x256)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 }); await page.goto(BASE);
  expect(await page.evaluate(() => document.getElementById('root')!.scrollWidth <= innerWidth)).toBe(true);
  // every toolbar action reachable by Tab: collect focusable names, compare with registry
});
// 21 — reduced motion
test('reduced motion: no splash, no interpolation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' }); const page = await ctx.newPage(); await page.goto('/');
  await expect(page.getByText(/fast-forwarding/i)).toHaveCount(0);
});
// 17 — colour-vision (CDP), visual review baselines + palette unit test
test('cvd screenshots', async ({ page }) => { const cdp = await page.context().newCDPSession(page);
  for (const t of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']) { await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: t });
    await expect(page.locator('#gt-map')).toHaveScreenshot(`map-${t}.png`, { maxDiffPixelRatio: 0.02 }); } });
```
Also: `contrast.test.ts` (tokens), `palette.test.ts` (ΔE2000 and luminance between sides, same numbers as `cvd.py`), `step.test.ts` (unit cursor), `formatBattleTime.test.ts` (identical output at all call sites), `shortcuts.test.ts` (guard matrix: input/select/modifier/dialog/button-space), `announce.test.ts` (debounce/dedupe).

### 9.2 Other automated gates
- pa11y-ci (`pa11y-ci.json`): runners `axe` + `htmlcs`, standard WCAG2AA, `actions` to open panels (`"click element button[aria-label='Search units']"`, `"wait for element [role='combobox'] to be visible"`), URLs: home (entry), `?view=text`, `/battle-chronicle.html`, `/accessibility.html`, walkthrough.
- Lighthouse CI (`lighthouserc.js`): `categories:accessibility` `minScore 1` (error) mobile and desktop for `/`, `/?intro=0&layout=desktop`, `/?view=text`, `/battle-chronicle.html`; individual audits `color-contrast`, `label`, `button-name`, `aria-allowed-attr`, `heading-order`, `landmark-one-main`, `bypass`, `target-size` as errors.
- ESLint: `plugin:jsx-a11y/strict` with `no-static-element-interactions`, `click-events-have-key-events`, `interactive-supports-focus`, `label-has-associated-control`, `no-noninteractive-tabindex` = error; `stylelint` rule banning raw hex colours and `font-size` < `0.75rem`.
- Cadence: every PR (state matrix subset ≈ 8 min), nightly full matrix against production, weekly Lighthouse CI against production; Netlify deploy preview must pass before promote.

### 9.3 Manual assistive-technology tasks (each must be completable without sighted help, without a mouse, in ≤ 2× the median sighted-mouse time)
1. Cold load: identify what the page is (title, `h1`) and reach the map using the skip link.
2. Choose how to explore (entry dialog), dismiss/skip intro; confirm the choice is remembered on reload.
3. Start and pause playback; set speed to 2×.
4. Go to Pickett's Charge (Day 3, mid-afternoon on the corrected clock) via Key moments; the time is announced.
5. Ask for the situation summary of the current moment.
6. Find the 20th Maine with Search, select it, read commander/strength/status.
7. Step forward three ticks; hear the unit's status change.
8. Read the story/narrative for the current moment (story panel and Battle Log).
9. Filter to Confederate artillery; hear the result count.
10. Follow Your Ancestor: pick the 15th Alabama, read the journey, copy the share link; open it in a new tab and confirm state restores.
11. Bookmark the moment; delete it; use Undo.
12. Open Extra Features → Ask the Historian; return with browser Back and state intact.
13. Virtual Walkthrough: read stop 5, open its Street View link, return.
14. (Map mode) Use the unit cursor to travel from Little Round Top to the Peach Orchard and select a unit.
15. Measure the distance between Little Round Top and Cemetery Hill without a pointer; hear yards/metres/march time.

### 9.4 AT matrix and expected speech (examples)

| Platform | Browser | Notes |
|---|---|---|
| NVDA (latest) | Firefox, Chrome | primary; test browse and focus mode on the map (`role=application`) |
| JAWS (trial) | Chrome | forms-mode transitions, table navigation |
| VoiceOver macOS | Safari | rotor: landmarks, headings, form controls; `<dialog>` support |
| VoiceOver iOS | Safari | Text view default; swipe order; 44 px targets; rotor |
| TalkBack | Chrome (Android) | explore-by-touch on the sheet/Text view; on-screen D-pad |
| Windows Voice Access / Dragon | Chrome | "click Search", "click Filter", "click Close unit details" (2.5.3) |
| Windows contrast themes | Edge/Chrome | Aquatic, Desert, Dusk, Night sky (forced-colors) |
| Zoom | Chrome/Firefox | 200% and 400%; text-only zoom in Firefox |

Expected NVDA+Firefox output (cold load, after finding 01–03): "Gettysburg Interactive Map, main landmark … Skip to the battle map, link" → Enter → "Choose how to explore, dialog … Map desktop, radio button, 1 of 3, checked" → after entering: "Battle time, slider, July 1, 6:00 AM (moment 1 of 675)" (the clock text must be whatever the corrected formatter returns) → ArrowRight → "July 1, 6:05 AM" → map focus + Enter: "Unit cursor on. Arrow keys move between units." → ArrowRight: "20th Maine Infantry, Union, holding position, 358 men, facing southwest, about 300 yards north of Little Round Top. 3 of 41 in view."

### 9.5 Manual visual checks
Forced colours (all four Windows themes and Chrome DevTools "Emulate CSS forced-colors"): every control has a visible boundary, pressed/current states visible without background tints, canvases legible via halo/glyph/hatch. Vision deficiencies (DevTools "Emulate vision deficiencies": protanopia, deuteranopia, tritanopia, achromatopsia, blurred vision): both sides and all 11 dispositions distinguishable using glyph/pattern alone. Text spacing bookmarklet (WCAG 1.4.12). 200%/400% zoom on 1280×1024 and 1920×1080 displays; Android font-size "Largest" and iOS Larger Text (Text view uses `rem`). Orientation: installed PWA rotates. Print preview of the chronicle. Paid session with 2–3 AT users before declaring A+.

### 9.6 Definition of done for any PR touching UI
Lint + unit tests + state matrix subset green; new interactive element has role/name/state, ≥ 44/32 px hit area, keyboard path, focus ring, contrast from tokens, reduced-motion behaviour, and an entry in `docs/a11y/shortcuts.md` if it adds a key.

---------------------------------------------------------------------------------------------------

## 10. Open questions, risks and things I could not verify

1. Source (N1). Findings 03–34 assume a buildable source. If none is recovered, only Phase 0 is possible (Lighthouse ≈ 100 but real conformance stays low: no Data View, no unit cursor, no dialog semantics). Decide this first.
2. The Tier-0 shim's font floor and contrast overrides change inline-styled dense panels; review screenshots at 4 widths before deploying; failure mode is cosmetic.
3. `role="application"` on the map surface is the right tool only because the surface implements its own arrow-key model; it must be tested with NVDA/JAWS (browse/focus mode transitions) and never applied to containers of ordinary content. Text view is the safety net.
4. Native `<dialog>` + top layer above Mapbox and the (soon deleted) 999999 overlay must be verified on iOS Safari and Firefox ESR; React 18.3 has no `inert` prop (use the string attribute `inert=""` or set `el.inert`), React 19 does.
5. `aria-valuetext` and every announced time depend on the C3/C4 clock fix; do not ship announcements before that lands or they will speak wrong times.
6. Lighthouse reports `landmark-one-main` as passing, which contradicts the code (no `<main>`). I could not explain it; the `bypass` audit output is unambiguous.
7. Target sizes and toolbar overlap widths are estimates from style objects, not measurements; run the §9.1 sweeps first and treat their output as the source of truth.
8. Unknown: whether NPS videos linked from the tour/walkthrough have captions and audio description (`nps.gov`, third party); whether the Google Street View iframe traps Tab (verify); how NVDA voices some of the glyphs (e.g. "〰", "⏩") — irrelevant once replaced by labelled SVG icons.
9. Performance: Data View, unit cursor and the dialog primitives must be code-split (P2) — target ≤ 25 KB gzip on the critical path, the rest lazy-loaded on first use; Data View render < 30 ms for 467 rows so INP stays in the green.
10. Announce-events default (OFF) is a judgement call; validate with real AT users.
11. Nothing in this report was tested with a real screen reader; §9.3–9.5 is the plan to do so.

Incidental findings for other specialists (not a11y, seen while reading)
- Mobile and Walkthrough Mapbox maps disable the attribution control (`bundle.pretty.js:102988`, `:110777`) — check Mapbox ToS (legal/security).
- Share/bookmark URLs are write-only (`:97823` vs `:101019`) — functional bug (fold into finding 26).
- `y1` carries positions forward via module-global `i2` (`:96265–96305`), so units never leave the map once seen and state leaks across days — data/logic specialist.
- Style objects computed once at module load from `window.innerWidth` (`:98111`, `:102708`) — layout specialist.
- Three tick→clock formulas (`:9371`, `:100836`, `:100998`, plus `M4 :9856` for the tint) — clock owner (C3/C4).
- Placement data cover 152 units in 694 keyframes over 117 ticks (computed) while the UI says 467 units — data specialist / H10.

---------------------------------------------------------------------------------------------------

## Appendix — files produced (scratch only)
`plan-work/tmp-app-a11y/`: `inventory.py`/`inventory.out.txt`/`inventory.json` (element inventory), `extract_styles.js`/`styles.json` (evaluated style objects), `contrast2.py`/`contrast2.json` (234-entry contrast table), `tokens.py`/`tokens.out.txt` (token and pair ratios), `cvd.py`/`cvd.out.txt` (CVD simulation), `bridge_patch_check.py`/`bundle.bridge.mjs` (validated Tier-0 patches; syntax-checked copy), formatted copies of the two lazy chunks.


---------------------------------------------------------------------------------------------------

## Verification

Adversarial verifier pass (read-only; scripts and outputs in `plan-work/tmp-verify-app-a11y/`: `lines.py`, `cr.py`, `bpc.py` = copy of the specialist's patch check, re-run, `cvd_v.py`). Method: re-opened every cited `bundle.pretty.js` line (about 150 citations spot-checked, all within 0-2 lines; function anchors `i2 96265`, `X4 96480`, `lS 96506`, `hF 97049`, `gF 97213`, `MF 97897`, `CF 98252`, `Xk 102321`, `tO 101472`, `IO 112202` etc. are exact), `index.html`, `site-nav.css`, `sw.js`, `netlify.toml`, the two lazy chunks, `data/*.json`, `lh_desktop.json`/`lh_mobile.json`, and cross-checked against `app-mobile.md` and `tmp-app-mobile/apply_patches.py`. Overall: the evidence base is unusually accurate (every number I recomputed reproduces: contrast ratios, 62/234, 133/268/21/7 px, 152/694/117, 137 = 45/73/16/3, 24 vignettes = 7,205 words, 18 FIND counts, +1,850 B, `node --check` OK). The defects are in delivery mechanics, one data claim, acceptance arithmetic, and effort. The report cites no external URLs, so there was nothing to fetch and no licence statements to check.

### Verdict table

| ID | Verdict | Notes (what I checked / correction) |
|---|---|---|
| 01 | CORRECTED | Real: `index.html` 716/285/718/744/753, site-nav.css 43-47/110/138, no `forced-colors` anywhere, Mapbox-only CSS; LH nodes (2 mobile / 4 desktop contrast, 1 label); all replacement colours >= 4.96:1 on nine panel backgrounds (recomputed); React inline colours serialise as `color: rgb(119, 119, 119)` (LH snippets) so the attribute selectors are valid. Corrections: (a) the acceptance "LH a11y >= 97 after 01 alone" is wrong. Only two scored a11y audits fail (label weight 10, color-contrast 7, total weight 164): fixing contrast alone = 93.9, fixing both = 100. `bypass` is `scoreDisplayMode: informative`, score 1, with the PASS title, and `landmark-one-main` is score 1 in both JSONs, so neither is a scored failure; do not present them as Lighthouse failures (the code-level absence of skip link/h1/main still stands). (b) Skip link `href="#root"` bypasses nothing: the 13-button toolbar is inside `#root` before the map, so focus lands on `<main>` and the next Tab is still the toolbar. The target must be the map container (needs a patch adding `id`/`tabIndex:-1` to the `gF` container). (c) The sr-only `<h1>` and skip links sit directly under `<body>`, outside any landmark: axe `region` (best-practice, in the report's own TAGS) will flag the h1; wrap it in `<header>`. (d) `#seo-content h1` CSS (`index.html:160`) must be retargeted when demoted to h2. (e) Colour ladder: `#666->#9a9aab`, `#777->#a8a8b8` end up brighter than untouched `#888` (5.56:1) and narrow chip ON/OFF text (`#bbb` vs `#8f8fa3` = 1.65:1); acceptable but review. (f) `outline:"none"` is at 98995 (not 98996) and there are 2 more inline sites the report missed: 111557 and 111744 (Walkthrough search inputs); the shim covers them, the source fix (16/23) must list them. (g) Effort S is optimistic once screenshot QA of ~17 dense panels at 4 widths is included: M. |
| 02 | CORRECTED | Real: I re-ran the 18 FINDs against `bundle.min.js` (md5 identical to `src/assets/index-Cg8FAMXN.js`): counts 1/14/4/2, +1,850 B, `node --check` OK, output byte-identical to the specialist's. Semantics of A-J read against `IO`, `Vs`, `dO`, `tO` and the global handler: sound (`R()` = store `getTickTime`, returns "July N, h:mm AM", so valuetext includes the date; `M` = `maxTick` 675). Corrections: (1) STALE-CHUNK TRAP: the pipeline rewrites the two lazy chunks' `import ... from "./index-Cg8FAMXN.js"` in place but keeps their filenames. `/assets/*` is `max-age=31536000, immutable` (`netlify.toml:23-25`) and cache-first in `sw.js`, and the main bundle loads them via `import("./HelpModal-CFV9T0zH.js")` (`bundle.pretty.js:112469-112470`). A returning visitor who ever opened Help/Bookmarks keeps the OLD chunk, which imports the OLD `index-Cg8FAMXN.js`; that file's last statement is `createRoot(document.getElementById("root")).render(...)` (module top level), so it re-mounts the old app (or 404s if the old file is not deployed). Fix: content-hash and rename both chunks too (new names, patch the two `import()` specifiers inside the new main bundle, update the SW precache list). (2) 02-I: `role="log"` implies `aria-live="polite"`, so this ships battle-event chatter ON by default (playback reaches 16 ticks/s: `Math.min(16, jr*2)` at :112998), contradicting the report's own default-OFF policy (6.8, open question 10). Add `"aria-live":"off"` in Tier-0. (3) COLLISION with app-mobile's `tmp-app-mobile/apply_patches.py` (see MISSED-1): applying the 18 FINDs to `tmp-app-mobile/patched/assets/index-mHF1a.js` gives G-close-mobile 3 (expects 4) and J1 0 (expects 1), so "refuse on any count mismatch" aborts. (4) Patch C's `[role=dialog][aria-modal]` clause is dead until finding 05 lands (no such element exists today); harmless. Effort M is fine only if the pipeline merge and chunk rename are counted: M-L. |
| 03 | CORRECTED | Evidence verified (`dO` divs 102767/102789, copy 102778, `gtbg_onboarded` at 113068 is the only layout-adjacent storage, `Power User` 111815, banner scraper index.html 355-396). Correction: `depends_on` omits 08 (the "Text view" card cannot ship without Data View) and 28 (fallback); either ship the chooser without the Text card first or add both dependencies. |
| 04 | CONFIRMED | Reproduced inventory: 21 non-semantic click/touch sites in the main bundle = 16 functional (incl. the touch-only scrubber 103177) + 5 backdrops; plus the BookmarkPanel row and 2 chunk backdrops = 24 total. Grep of `onMouseDown/onPointerDown/onKeyDown/role:/tabIndex` in the app region finds only the `IO` wrapper, so no click-only site is missing. (Body says "17", structured finding says "16 functional + Bookmark row"; consistent.) |
| 05 | CONFIRMED | 13 overlays and 3 focus calls (98819 autoFocus, 101016 `.focus()`, Bookmark autoFocus) reproduced; the Esc handler 113033-113046 closes selected unit, filter, search, ancestor, Soldier's Eye, roster, OOB, bookmarks, help and walkthrough only (misses Layers/Distance/Legend/onboarding and the local-state panels); `MF` `Ee = c \|\| f` confirmed. React 18.3.1 and mapbox-gl 3.24.1 confirmed in the bundle, so "no `inert` prop in React 18" is right. Caveat: MISSED-3 (live regions in an inert page are silent while a modal is open). Effort L plausible. |
| 06 | CORRECTED | Evidence verified: only `INPUT` guarded (112967), no modifier check (Ctrl+F -> `Se()`), Mapbox keydown ignores modifiers and `preventDefault()`s non-shift arrows (89757-89811), `keyboard` defaults true (91902; the app passes no option at 97237), speed 16 vs UI max 8 (112998 vs `wO` 112185), `H` writes `showCasualtyHeatmap` that nothing reads. Correction: the proposed single listener on `#root` is inert when focus is on `<body>` (page load, or after clicking outside `#root`), yet the onboarding copy says "Press Space or click Play to begin". Attach to `document` and gate with `activeElement===document.body \|\| root.contains(activeElement)`. |
| 07 | CONFIRMED | Slider 0-100 step .01 with `value:he` (112294-112303), wrapper handler + `outline:none` (112216-112224, 112385), three clock formulas plus `M4` (9371, 100836 `JF`, 100998 `QF`, 9856). NOTE `JF`/`QF` also emit `July {f+2}` (C3 lives in the ancestor timeline too). `_F` "1x (real time)" (97428-97429) vs `cF=500` (96948). 118 = 45 critical + 73 high recomputed. The "July 2, 4:30 PM at tick 267" example matches app-time's proposed remap (`app-time.md:518,627`), not today's `getTickTime` (7:25 AM); 02-A ships valuetext from the current (wrong) clock, which at least equals what the sighted toolbar shows. |
| 08 | CORRECTED | Line refs confirmed. THE DATA CLAIM IS WRONG: "152 positioned units in 694 keyframes over 117 ticks" counts only `placements_*.json`. `zp()` (96900-96917) loads both `tF[day]` (9 placements files, 96771) and `nF[day]` (38 `density_*.json`, 96788+) and merges them. Recomputed: placements 694 rows / 152 ids / 117 ticks; density 1,110 / 412 / 175; UNION 1,804 keyframes / 478 unit_ids (regiment ids plus brigade-level ids such as `C-II-...`) / 188 ticks. The Data View caption, `describeMoment`, page sizing and the "n of 467" wording must be built from the merged stream. Effort L is optimistic (table + filters + sort + pagination + contact clusters + landmark phrases + replacing 4 lists + SSR + tests): XL. |
| 09 | CONFIRMED | 97365-97377 canvas onClick, 94003-94025 canvas `tabindex 0`/`role=region`/`aria-label`, overlay canvases created without `aria-hidden` (9846, 96697; the only `aria-*` in the whole bundle are Mapbox's), `lS` projection array `pe` (96541-96552) and `aT/Xx` grid (96388/96400) exist. See MISSED-4 (second tab stop). |
| 10 | CONFIRMED | The only `addControl` in the app is the desktop `NavigationControl` (97252); the mobile map (102981-102989) and walkthrough map (110770) have none and set `attributionControl:false`. Note for acceptance tests: app-mobile mobile-02 shows the mobile overlay canvas (`pointer-events:auto;z-index:10;touch-action:none`, 102993+) swallows pan/pinch entirely on the deployed build, so gesture-based expectations fail until that hot-fix; DOM buttons that call the map API are unaffected. |
| 11 | CONFIRMED | Toasts `setTimeout 4500` (99907-99917, spawned only while `isPlaying`), commander cards 3 s (101707), copy 2 s/4 s (97931/101122), `window.prompt` fallback (97932), "No units found" (98946); no live region anywhere. The audit's H4 claim "toasts never auto-dismiss" is refuted by the code; the specialist is right. |
| 12 | CONFIRMED | 137 events (45/73/16/3), 24 vignettes, `full_script` = 7,205 words (matches ~7,200). |
| 13 | CONFIRMED | 75 `button` sites, 0 aria; all 13 `Vs` calls carry `title`, so the `index.html:398-440` label patch is inert (`if (b.title...) return`); "S" (113145, title "Search") and "magnifier" (113212, title "Find Unit / Location") both call `toggleSearchPanel`. Note: `role=toolbar` (6.2) also obliges the APG roving-tabindex/arrow-key model (MISSED-5). |
| 14 | CONFIRMED | 9 `input` + 1 `select` sites; range unnamed (99255); Layers rows are `div > input + span` (112545-112565), not `label`; outline none at 98995 (report says 98996). |
| 15 | CONFIRMED | `#extra-features` `position:fixed; z-index:999999` (index.html 176-185), 5 s CSS force-reveal (202), collision mover 521-606, reveal script 441-519. The overlay already has a persisted user "hide" toggle (`#ef-toggle`, key `gtbg-ef-hidden`, 294-353) that disappears if the overlay is folded into the header. |
| 16 | CONFIRMED | Every ratio recomputed (`#444` 2.02, `#555` 2.64, `#666` 3.43, `#777` 4.40, `#8b6914` 3.87, `#3a6bc4` 3.83, `#cc4444` 4.20, `#6f7686` 4.08/4.32; chip border 1.56, input border 2.00, markers 2.35, badge 2.74; token table 17.3/13.8 ... 6.2/5.0; `#7a7a92` 4.71/4.52). |
| 17 | CONFIRMED | Side pair 1.017:1 (report 1.02), labels 1.012; proposed `#6fb1ff`/`#b3261e` 2.93:1 with dE protan 59.5 / deutan 56.0 / tritan 65.3 / achromat 29.4 (`cvd.out.txt`); the white/black halo bound 4.58:1 is analytically exact (L=0.179). UNVERIFIABLE piece: the "typical satellite tones" (`#2f4a2b`, `#8a8f5a`, `#b9a98a`, `#c9b26e`) are assumed hex values, not sampled from Mapbox tiles; keep the sampled-tile acceptance test. The Okabe-Ito pair is 1.34:1 in luminance so hatch is mandatory there (the report says so). |
| 18 | CONFIRMED | Exactly 268 numeric `fontSize` literals from line 96200, 133 < 12, 21 <= 9, minimum 7 (102611). |
| 19 | CORRECTED | Estimates plausible; the `padding:0` reset is at `index.html:61`. Correction: Mapbox v3.24.1 control buttons are 32x32 (`.mapboxgl-ctrl-group button{height:32px;width:32px;outline:none}` in `index-B4G7Z_2G.css`), not 29x29 (still < 44). That CSS also sets `outline:none` on the controls (the shim covers it; add to 23). |
| 20 | CONFIRMED (structure) / UNVERIFIABLE (numbers) | Structure verified: absolute centre cluster `left:50%` (113336), 440 px search panel with `translateX(-50%)` (98953-98968), load-time `window.innerWidth` constants (98111, 102708), `nowrap` controls (112425). Overlap thresholds are estimates (no browser allowed); my arithmetic (left ~300 + centre ~540 + right ~450 px) gives a centre/right collision below ~1,470 px, consistent with the report's ~1,400. Run the sweep first, as the report says. |
| 21 | CONFIRMED | `eO = 3500` (101471, a module-scope const so the flag is read at load), glow (96615), interpolation `ut = Hc/Pe` at 97001-97002, tint 8 s, NPS tour timeouts (100329-100341), `[H,l]=useState(!0)` trails (97219), Mapbox reduced-motion `matchMedia` (11447). |
| 22 | CONFIRMED | `data/monuments.json` has 9 entries vs 20 React markers `mA` (100615+, counted 20); the star-overlay comment discloses drift (index.html 618-622). |
| 23 | CORRECTED | As 01(f): outline sites are 98995, 101356, 112385 plus 111557 and 111744; Mapbox control CSS also removes outline; `site-nav.css` 43-47/110 confirmed (they are editable now, not source-dependent, so the two deletions belong in Phase 0). |
| 24 | CONFIRMED | `AO` gates only the toolbar + `gF` with `Zn !== "mobile"` (113071/113233) while `IO`, `VF`, `WF`, `CF`, `LF`, `_F`, `KF`, `XF`, `qF`, `MF` are unconditional (113242-113283); independently confirmed live by app-mobile (the `IO` rect covers the mobile dock; a tap on mobile Play hits the IO range input). `touch-action:none` on `tn.root` (103705) confirmed. |
| 25 | CONFIRMED | No `h1`; `h2` 110648, `h3` 110700; `dangerouslySetInnerHTML` 110653; mobile-branch cards get `onClick:()=>{}` (110961); 100-cap message 110963/111291. |
| 26 | CONFIRMED | `$k` writes t/u/z/ll (97822+), only `ancestor` is read (101019); `gtbg_prefs` (9327-9339) holds only showLegend/showMinimap. |
| 27 | CONFIRMED | FPS text 96684-96687, `fF` dead (97063), "445+" in the HelpModal chunk, `slideIn` keyframes absent, "Trails" glyph (97382). |
| 28 | CONFIRMED | `zp` swallows failures (96909), `iF`/`rF`/`oF` have no catch, `mapboxgl.supported` is exported in this build (92667) so the proposed check works; the splash has `role=progressbar` with only a static label. |
| 29 | CORRECTED | manifest `orientation: landscape` and `controllerchange -> location.reload()` (index.html 263-268) confirmed. Correction: the first-visit double load comes from `clients.claim()` firing `controllerchange` into that reload handler, so deleting the handler is sufficient for C6; "drop skipWaiting" is not needed for it and would leave the new SW waiting (old `gbg-v5` cache kept) while the report's own pipeline relies on a CACHE_NAME bump to purge. `sw.js` navigations are network-first, so new HTML still reaches users either way. Decide skipWaiting together with the chunk-rename fix. |
| 30 | CONFIRMED | Checklist item; every AAA row maps to an existing finding. |
| 31 | CONFIRMED | Line ranges 255-277, 355-396, 398-440, 441-519, 521-606, 608-714 verified. Deleting the label patch is safe: it only removes `#seo-content` after >= 3 labels (never happens) and React 18 `createRoot` clears the container anyway. |
| 32 | CORRECTED | The `STATES` array has 24 entries while the finding/8.2 say "about 45 states"; the whole matrix depends on URL hooks from 26 (source-level), so a Tier-0 version needs a `gtbg_onboarded` seed + click-through harness; the reduced-motion test asserts "no fast-forwarding text" immediately after `goto` (racy); LHCI asserts on `bypass`, which is informative in Lighthouse 13 (cannot fail): run axe directly for it. |
| 33 | CORRECTED | 15 tasks x ~8 AT/browser rows = ~120 runs plus logging, defect re-test and 2-3 paid user sessions: L, not M. |
| 34 | CORRECTED | No accessibility page exists (grep of deployed html + site-nav.js); `user-guide.pdf` metadata confirms `title/author '(anonymous)'`, producer "ReportLab PDF Library - (opensource)". To my knowledge ReportLab open-source cannot emit a PDF/UA structure tree, so a tagged PDF likely means changing the generator (UNVERIFIED by me). ACR (55 rows) + statement + PDF rework: M, not S. |

### MISSED issues

1. **Tier-0 patch pipelines collide (high).** `tmp-app-mobile/apply_patches.py` (68 edits) patches the same minified bundle plus index.html/sw.js and also renames the output (`index-mHF1a.js`). Overlaps: `eO=3500` (HF-10h vs 02-J1), `style:tn.toolsClose,onClick:...,children:"✕"` (HF-6l vs the 02-G regex), `Va.skip`/`skipBtn` (HF-10f/HF-11c vs 02-F), `tn.root` touch-action (HF-8a vs finding 24), and both rewrite `index.html:55,282` and `sw.js`. Evidence: `bpc.py` run against `tmp-app-mobile/patched/assets/index-mHF1a.js` gives 16/18 OK, `G-close-mobile` 3 vs 4, `J1-intro-duration` 0 vs 1. The mobile pack also renames only the main bundle and leaves both chunks importing `./index-Cg8FAMXN.js` (same stale-chunk defect as 02, and the old bundle stays in `assets/`). Fix: one merged, ordered patch list (mobile then a11y), one count-asserting script, one output hash, chunks renamed too, one CACHE_NAME bump.
2. **Tier-0 shell skeleton gaps (medium).** The skip link `#root` bypasses nothing (see 01b); the second skip link targets `#gt-timeline`, which lives on `IO`, and app-mobile HF-1a unmounts `IO` in the mobile layout, so on phones the link is dead; the sr-only `h1` outside a landmark trips axe `region`. Fix: `id="gt-map"` + `tabIndex:-1` on the map container via patch; emit the timeline skip link only when the element exists (or give the mobile dock a target); put the h1 inside `<header>`.
3. **Modal `<dialog>` makes the announcement regions inert (medium).** `showModal()` inerts everything outside the dialog, including the always-mounted `#gt-live-status/#gt-live-alert/#gt-event-log` proposed in 11; Bookmarks "Link copied", Follow-Ancestor copy and search counts inside a modal would be silent. Fix: `announce()` writes into a live region inside the top-most open dialog when one exists (keep the global regions for non-modal state); test with NVDA+Firefox and VoiceOver.
4. **Mapbox canvas remains a second tab stop under the proposed `role=application` surface (medium).** Mapbox sets `tabindex=0` and `role=region aria-label=Map` on its own canvas (94003-94025); finding 09 adds a wrapper `#gt-map tabindex=0`. Result: two stops and nested roles. Fix: after `load`, `map.getCanvas().tabIndex=-1` + `aria-hidden=true`, or make the canvas itself the application surface and drop the wrapper stop.
5. **`role=toolbar` without its keyboard model (low).** 6.2/13/15 add `role=toolbar` over 13 individually tabbable buttons. APG expects one tab stop plus arrow keys/Home/End; otherwise omit the role (a plain labelled group is enough) or implement roving tabindex.
6. **Inline flag script vs the enforced-CSP goal (low).** 01 adds an inline `<script>` (reduced-motion flag) and 31 keeps it, but `netlify.toml:19` shows the report-only policy allows scripts only via `'unsafe-inline'`. Ship the flag as same-origin `/a11y-flags.js` so an enforced `script-src 'self'` needs no hash/nonce.
7. **Acceptance arithmetic to keep straight (low).** State in 8.2/8.3 that 01 alone lifts Lighthouse a11y only to about 94; the 100 needs 02-A (label). Record that `bypass` and `landmark-one-main` are Lighthouse-informative/passing, so the CI gate must use axe, not Lighthouse, for them.

Verifier conclusion: keep all 34 findings and apply the corrections above. The chunk rename and the pipeline merge with app-mobile are the two that would cause a production regression if shipped as written; the density-file correction changes the Data View design numbers.
