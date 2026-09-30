# app-mobile — Main-app MOBILE layout: root causes, fix specs, A+ design, verified hot-fix pack

Specialist: `app-mobile` · Site: gettysburginteractivemap.com · Build analysed: `assets/index-Cg8FAMXN.js` (Sep 29 deploy, 119 files) · Line numbers refer to `plan-work/bundle.pretty.js` ("BP:nnn") unless a file is named.
No file in DEPLOY_DIR / SRC_DIR / RECON_SRC was modified. All scratch artefacts are in `plan-work/tmp-app-mobile/` (probe scripts, screenshots, the patch pack `apply_patches.py`, a patched **scratch copy** in `patched/`).

---

## 0. TL;DR

1. **C1 and C2 have one root cause, and it is a one-line bug.** The desktop timeline bar `IO` (BP:113249 `V.jsx(IO, {})`) and 14 other desktop-only overlays (FF, OF, VF, WF, CF, LF, _F, KF, XF, iO, nO, yO, qF, MF) are rendered *unconditionally* — including in the Mobile layout. `IO` (z-index 100, later in DOM) paints over the mobile root (`tn.root`, z-index 100, BP:103699-103706) and covers the whole mobile dock and the bottom 127 px of the Tools sheet. The "572 px row" is the *desktop* transport row (`scrollWidth 574 / clientWidth 343`, `justify-content:center; nowrap`), not the mobile one. The real mobile dock (52/64 px buttons, scrubber) is completely hidden behind it. Verified live.
2. **New critical finding (not in the audit): the map cannot be panned, pinch-zoomed or tap-selected on the deployed site — mobile *and* desktop.** A full-size `<canvas>` overlay with `pointer-events:auto; z-index:10` is a *sibling* of Mapbox's canvas container (mobile BP:102994-103035; desktop BP:97393-97399), so Mapbox's handlers (bound to `.mapboxgl-canvas-container`, BP:90310) never see an event. Measured in Chrome 153: 15 touch/pointer events reach the overlay, **0** reach the canvas container; desktop drag + wheel leave `center/zoom` unchanged. On touch, unit tap-to-inspect is *also* broken (`touchend` handler calls `preventDefault()` then reads `touches[0]`, which is empty at touchend, so coordinates are `NaN`). The same overlay style is present in every archived build back to Jun 13 (`deploy-6a2da5d2…`). Fix = 3 small edits (HF-3); verified.
3. **On phones the most important content is invisible.** Search panel, Filter panel, story/vignette panel, chronology event card and unit panel are all rendered by `AO` at z-index 85-95, i.e. *underneath* the opaque mobile root (z-index 100). They exist in the DOM and are never visible (5 panels checked). Tapping Tools → Search "does nothing".
4. **Five of the 14 Tools tiles are dead** (Map Layers, Bookmarks, Help, NPS Auto Tour, Monuments write to state that nothing reads — `Br("layers"|"bookmarks"|"help")`, `Dt(!0)` → unused `Zn`, `pi(!An)` → unused `An`), and the Virtual Walkthrough, Distance tool, Locations, Sound, Toggle Units and Trails have *no* mobile entry point. The mobile map also never gets the road/river/breastwork layers, day-night tint or trails that the desktop map gets.
5. **Layout chooser (H3) is worse than described:** no auto-detect, no persistence, promises a "settings menu" that does not exist, mounts (and then destroys) a *second* full Mapbox map behind it, and is **unusable at heights < ~380 px** (buttons below the fold, no scroll) — which is exactly what the manifest's `orientation: landscape` lock produces on phones.
6. **Landscape phone is unusable:** at 812×375 only **140 px (37 %)** of the screen is map; at 568×320 only **85 px (27 %)**; the Tools sheet header is pushed 55 px off-screen at 320 px height and cannot be closed.
7. **One CSS rule in index.html (`.mapboxgl-map { height:100% !important }`) breaks the mobile map box** (`top:94/bottom:140` ignored): the map is 812 px tall at 375×812 instead of 578 px, so its centre sits ~117 px below the visible centre, and the Mapbox logo/attribution (a Mapbox ToS requirement — the app also sets `attributionControl:false`) sit behind the dock.
8. **I built and verified a hot-fix pack** (`tmp-app-mobile/apply_patches.py`, 68 logged assert-unique find/replace edits to `index-Cg8FAMXN.js` + `index.html` + `sw.js`; output bundle renamed `index-mHF1a.js` because `/assets/*` is `immutable` and the SW is cache-first). On a *scratch copy* served locally, with real Chrome 153 touch/mouse input: pan, pinch, tap-select, transport, Tools sheet (all 14 tiles reachable), Search/Filter/Help/Bookmarks/Layers, story+event cards, returning-visitor load (626 ms to interactive shell), desktop pan/wheel/click, and a 10-viewport matrix (320×568 … 768×1024, landscape 812×375/667×375/568×320) all pass; 0 console errors on desktop. **Effort to apply and ship: S** (plus a real-phone smoke test — WebKit/iOS was *not* testable here).
9. **A+ design:** one shared `<BattleMap>` + a compact shell (52 px header, 100 px persistent dock, one-at-a-time bottom-sheet system with History-API back support, story chip, Tools grid incl. the 20 Extra Features), auto layout via `matchMedia`, safe-area/dvh tokens, 44 px targets, AA contrast tokens (computed), landscape rail, tablet side-sheets. Specs at 320/360/375/390/412/430/768 + landscape in §5; Playwright matrix in §8.
10. **RECON_SRC cannot host any of this**: it has no mobile shell (`deviceMode==='mobile'` renders a blank page), no unit-canvas engine, a 34-line `DeviceSelect`, a 70-line scrubber, mapbox-gl 2.15. The mobile shell (`pO`, `tn`, `AO`, `tO`, `dO`, `bO`) must be extracted from `bundle.pretty.js` (BP:102752-104095, 112921-113377, 101472-101678, 111799-112184). Mapping in §7.

---

## 1. Method and verification status

| Item | How |
|---|---|
| Static analysis | `bundle.pretty.js` (prettier of the deployed 2.28 MB bundle), `index.html` (760 lines), `manifest.json`, `sw.js`, `netlify.toml`, RECON_SRC. |
| Live probing | Headless Chrome 153 (Windows) driven over raw CDP from Node (`tmp-app-mobile/cdp.mjs`, `lib2.mjs`, `lib3.mjs`), device metrics override + touch emulation (`Emulation.setTouchEmulationEnabled`), **real** `Input.dispatchTouchEvent` taps/swipes/pinch and `Input.dispatchMouseEvent`. Service worker bypassed. ~25 page loads of the live site (splash, chooser, mobile layout, panels). The shared Browser pane / Chrome extension were **not** used. |
| Patch verification | Patch pack applied to a copy of SRC_DIR (`tmp-app-mobile/patched/`), served from `127.0.0.1:8123`, same probes re-run. Because the owner's Mapbox token is URL-restricted (403 from 127.0.0.1 — see mobile-20), the *test harness only* injects `Referer: https://gettysburginteractivemap.com/` on `api.mapbox.com` requests via CDP `Fetch`. A separate test copy (`patched_t/`) additionally exposes `window.__gtbgMap/__gtbgStore` so pan/zoom/selection can be asserted numerically; those hooks are **not** part of the pack. |
| Not verified | Real touch hardware, Safari/WebKit (iOS `dvh`, `env()` insets, `visualViewport`, standalone mode, back-swipe), Firefox, screen readers, low-end Android GPU behaviour, the SW first-visit reload (C6) path (bypassed in probes). Every claim below is tagged **[LIVE]** (measured on production), **[SCRATCH]** (measured on patched copy), **[STATIC]** (code reading only) or **[UNTESTED]**. |

Environment note: probes touch only the public site and a local copy; nothing was deployed or written into any listed folder.

---

## 2. Root-cause analysis (what is really going on)

### 2.1 Component map of the running app (BP line ranges)

```
AO  (BP:112921-113286)   root: tc.root {position:fixed; inset:0; touchAction:manipulation} (BP:113300-113307)  -- no z-index, but fixed => stacking context S0
 ├─ tO  splash (101472-101592, z1000)            ├─ dO  layout chooser (102752-102820, z1000)
 ├─ bO  onboarding tour (111856-112021, z1000)   ├─ _O  Virtual Walkthrough (110733-, z500; isMobile prop)
 ├─ pO  MOBILE shell (102914-103697)  root tn.root {fixed; inset:0; z100; bg #050508; touchAction:none} (103699-103706)
 │     children (all confined to tn.root's own stacking context):
 │       map div tn.map (top94 bottom140 z1) · topBar z200 · dayTabs z200 · bottomBar(dock) z200 · unitPopup z300 · slidePanel z400 · toolsOverlay z500
 ├─ [Zn!=="mobile"] desktop toolbar tc.toolbar z100 + gF (desktop map, 97213-97389)
 └─ ALWAYS rendered (BP:113242-113283): FF search z95 · OF filter z95 · VF legend z88 · WF minimap z88 · CF story z92 · LF event card z85 ·
      _F status z88 · IO desktop timeline z100 · KF monuments z160 · XF NPS-tour z200-400 · iO cursor-glow · nO commander toasts z400 ·
      yO sound button z200 · qF toasts z200 · MF unit panel z92 · Zk/Yk/Xk/Jk overlays z700-900 · GtbgDist/GtbgLoc/GtbgLayers z1000 · Help/Bookmarks (lazy, z600)
```

Stacking arithmetic: inside `S0`, `tn.root` (z100) and `IO`'s `Po.wrap` (`position:absolute; bottom:0; z-index:100`, BP:112375-112387) tie at 100, so **DOM order wins and `IO` (rendered after `pO`) paints on top of the entire mobile UI**, including the z500 Tools overlay (which is trapped inside `tn.root`'s stacking context). Everything below z100 (FF/OF/VF/WF/CF/LF/_F/MF) is painted *under* the opaque mobile root. Everything above z100 (XF launch button z200, yO sound z200, qF toasts z200, nO z400, Help/Bookmarks z600, Extra Features overlay z999999) floats *over* it. This single fact explains C1, C2, "NPS Auto Tour" being the element under the Tools tiles, the ghost sound button, and the invisible Search/Filter/story panels.

### 2.2 Evidence table — production, 375×812, real CDP touch, Mobile layout selected [LIVE]

| Observation | Value |
|---|---|
| `IO` rect | `[0, 685, 375, 127]` (covers mobile dock `[0,672,375,140]`) |
| `IO` transport row | `clientWidth 343`, `scrollWidth 574`, `justify-content:center`, `flex-wrap:nowrap` → ⏮ x=−215, ◀ −174, ▶(play) −132, ▶ −72, ⏭ −30; speed chips start x=24; credit link at x=412 |
| Mobile ◀ / ▶ / ▶ / 1× buttons (52/64/52/44 px) | `elementFromPoint` at their centre returns the **IO range `<input>`** (tapping the mobile Play button *scrubs the timeline*) |
| Tools sheet | panel `[0,437,375,375]`; tiles NPS Auto Tour / Legend (hit `IO`), Bookmarks / Help (hit NPS launch button), Mini Map / Desktop View (hit `IO`) unreachable |
| Search panel | `[−32,56,440,343]` (width:440 without max-width, BP:98965), z95 → hidden under mobile root |
| Story (z92) / event card (z85) / legend (z88) / minimap (z88) / status pill (z88) | present in DOM at tick 31, `visibleToUser:false` for all 5 |
| Map gestures | overlay canvas got `touchstart 1, touchmove 12, touchend 1, pointerdown 1`; `.mapboxgl-canvas-container` got **0**. Desktop (1440×900): drag + wheel → centre/zoom `-77.235/39.812/13.5` unchanged, container events 0 |
| Unit tap | touch tap on a unit → no popup; mouse click on same point → popup (`Second Brigade, First Division, Cavalry Corps…`) |
| Tools tiles (JS `.click()` bypassing hit-test) | Monuments, Map Layers, NPS Auto Tour, Bookmarks, Help produce **no DOM change** (page text length constant 763) |
| Map box | `.mapboxgl-map` `[0,94,375,812]` (CSS says top94/bottom140 → should be 578 tall) |
| Splash title | `GETTYSBURG` box x=−46.8, w=468.6 in a 375 viewport (`font-size:52px; letter-spacing:8px`, BP:101617-101624) → "ETTYSBUR" |
| First-visit blockers | tour modal at 1.2 s (z1000, sits above the splash), "Skip introduction" `[143,594,89,14]`, `rgb(85,85,85)` 12 px; splash "Skip intro ›" 12 px tall, `rgb(68,68,68)` 11 px |
| Chooser | cards 145-159 px wide (1-word lines); 320×568: "Select Mobile" bottom=583 > 568; 667×375 / 812×375: buttons y 344-376, title y −78, overlay `overflow:visible`, `html,body{overflow:hidden}` → unreachable |
| Landscape, mobile shell (IO hidden to simulate fix) | visible map = 140 px @812×375 (chrome 63 %), 85 px @568×320 (chrome 73 %); Tools panel top = −55 @320 tall |
| Extra Features overlay | `[184,387,177,39]` mid-screen on the map; toggle 30×30, pin 48×34; z999999 (over splash, chooser, Tools sheet) |

### 2.3 Why each audit item is what it is

* **C1** = desktop `IO` row (`Po.controls`, BP:112425-112430; buttons `Po.btn`, `speedGroup` 6 chips, tickNum, credit with `white-space:nowrap`) rendered in mobile; **C2** = z-order tie broken by DOM order (§2.1). **H1 (mobile)** = the injected overlay (z999999) + collision mover picks `top:50%` because every corner "collides" with real controls. **Duplicate time displays** = mobile `clockDay/clockTime` (BP:103141-103147) + `dayTabs` (BP:103158-103173) + `tickInfo` (BP:103238) + `IO` time/day buttons/tick (BP:112226-112246, 112357) + hidden `_F` "July {day+2}, 1863" (BP:97428, C3) + LF card clock ("7:35am" while the header says 8:30 AM at tick 31 — visible on one screen, C4).
* **H3** = §2.2 rows on splash/chooser/tour. Layout choice state `Zn` is a plain `useState(null)` (BP:112949); only `gtbg_onboarded` is persisted (BP:112951, 113068); `e2()/gtbg_prefs` (BP:9335-9341) already exists and stores `showLegend/showMinimap`.
* **Why the overlay canvas was probably added:** `pointerEvents:auto` + `onClick` lets the canvas do unit hit-testing, but it was placed as a sibling of the map div instead of using `map.on('click')`; Mapbox binds to `map.getCanvasContainer()` (BP:90310, 90323-90342) so nothing reaches it. `k4()` (BP:9909-9982) and `iO` (BP:101817) only *observe* touches/mouse; nothing forwards them.

### 2.4 index.html specifics that interact with the mobile shell (`index.html:n`)

* **Viewport/insets (5):** `width=device-width, initial-scale=1.0` — no `viewport-fit=cover`, so every `env(safe-area-inset-*)` in the bundle is 0; no `interactive-widget`; no iOS standalone meta; `theme-color #0a0a14` (shell paints `#050508`).
* **`#root { position:fixed; inset:0; contain:strict }` (66-70):** `contain:strict` = size+layout+paint+style. Layout containment makes `#root` the containing block for fixed descendants and a stacking context; paint containment clips everything to the root box. Consequences: (a) `#extra-features` (a *body* child, z999999) always paints above anything inside `#root`, whatever its z-index; (b) `#root` is a single compositor layer for the whole app (fine), but any future `position:fixed` popover portalled to `body` will escape the containment — portal targets must be inside `#root`.
* **Map pre-size rule (72-78):** `.mapboxgl-map{height:100%!important}` — the mobile map-box bug (mobile-07).
* **Inline boot splash (90-142, 742-748) + React splash `tO`:** two different splash designs flash in sequence (inline `h1` 44-96 px; React "GETTYSBURG" 52 px letter-spaced); both then give way to the tour modal / chooser.
* **Three text-matching scripts (294-606):** (1) banner injector polls for a leaf element whose text is "Choose Your Experience" (fragile; inert once the chooser is removed — harmless); (2) toolbar-label injector maps the *visible glyphs* `S F L B ?` to `aria-label`s (desktop toolbar only); (3) reveal script un-hides `#extra-features` on a click whose ancestor text matches `/select desktop|select mobile|skip introduction|skip tour|skip intro/i`, else after 1.5 s if none of those buttons is visible, else after 10 s — all keyed to strings the redesign removes, which is another reason to delete the overlay (mobile-10). A fourth script overlays a *static* Web-Mercator star layer for the desktop Monuments button (608-714) that never tracks pan/zoom.
* **Service worker (255-277):** `controllerchange → location.reload()` reloads the app on the first visit, mid-splash (C6); combined with the splash this is the "loads twice" the mobile user sees. Bundle interplay in mobile-19.

---

## 3. Findings (fix specs)

Format per finding: **Evidence · Root cause · Fix · Effort · Acceptance · Moves · Depends · Audit refs**. "HF-n" = an edit in the verified patch pack (§6). "Source" = where the durable fix lives in a proper tree (§7).

---

### mobile-01 — Desktop-only overlays render inside the Mobile layout (root cause of C1, C2, duplicate transport/time) — **critical**
* **Evidence:** BP:113242-113283 (`V.jsx(IO, {})` at 113249, VF/WF/CF/LF/_F/KF/XF/iO/nO/yO/qF/MF not gated; only the toolbar + `gF` are wrapped in `Zn !== "mobile"`, BP:113071/113233). §2.2 rows 1-4. **[LIVE]**
* **Root cause:** `AO` was written for desktop and the mobile layout was bolted on by hiding only the toolbar+map; every sibling overlay stayed mounted.
* **Fix (deployed bundle):** HF-1a/b — wrap the desktop-only set in `Zn!=="mobile"&&V.jsxs(V.Fragment,{children:[…]})` and gate `MF`:
  ```js
  // min:  …V.jsx(VF,{}),H&&V.jsx(WF,{}),V.jsx(CF,{}),V.jsx(LF,{}),V.jsx(_F,{}),V.jsx(IO,{}),V.jsx(KF,…),Yn&&V.jsx(Zk,…),V.jsx(XF,…),V.jsx(iO,…),V.jsx(nO,{}),V.jsx(yO,{}),…,V.jsx(qF,{}),
  // →     Zn!=="mobile"&&V.jsxs(V.Fragment,{children:[P&&FF,M&&OF,VF,H&&WF,CF,LF,_F,IO,KF,XF,iO,nO,yO,qF]}), Yn&&Zk,Pn&&Yk,lo&&Xk,_a&&Jk, …  and  …Zn!=="mobile"&&V.jsx(MF,{})
  ```
  Panels the phone *does* need (FF, OF, CF, LF, qF) are re-hosted inside `pO` (mobile-03).
* **Fix (source):** two shells — `DesktopShell` (toolbar + `IO`-equivalent `TimelineBar` + desktop panels) and `MobileShell` (header + `Dock` + sheets) — sharing a single `<BattleMap>`; a shell can only mount its own chrome. No conditional-in-JSX gating.
* **Effort:** S (patch) / L (shell split, part of mobile-22).
* **Acceptance:** Playwright at 320…430 px: `[data-testid=play]`, `[data-testid=step-back]`, … `elementFromPoint(center)` is the button and lies inside the viewport; no element whose text matches `/⏮|⏭|Created by/` exists in compact layout; `#tools-sheet` tiles all reachable (§8 T3/T4).
* **Moves:** Mobile *Core function* D→B+, *Fit & finish* D+→B; unblocks Performance (removes ~12 mounted components + a `KF` rAF loop, mobile-15).
* **Depends:** none. **Audit refs:** C1, C2, H1, N1.

### mobile-02 — Overlay canvas swallows all map gestures; touch unit-selection broken (mobile **and** desktop) — **critical (new)**
* **Evidence:** mobile overlay BP:102993-103035 (`pointer-events:auto;z-index:10;…touch-action:none`, `click` + `touchend`→`preventDefault(); ya(nr)`), `ya` BP:103076-103108 (`nr = touches?.[0] || $t` → at `touchend` `touches` is empty ⇒ `clientX` undefined ⇒ `NaN`); desktop `ux.canvas` BP:97393-97399 (`pointerEvents:"auto"`), sibling of the map div BP:97364-97377; Mapbox listener target BP:90310. Same string present in every archived index bundle Jun 13 → Sep 29. §2.2 rows "Map gestures", "Unit tap". **[LIVE]** (Chrome 153 synthetic input; **[UNTESTED]** on hardware).
* **Root cause:** DOM overlay used for both rendering and hit-testing; events never reach Mapbox.
* **Fix (deployed):** HF-3a/b/c.
  ```js
  // mobile: canvas becomes render-only, selection moves to the map's own click event (fires for taps, not drags)
  bn.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:10;width:100%;height:100%;"   // was pointer-events:auto…touch-action:none
  … Yn.current.appendChild(bn), hi.current=bn, $t.on("click", nr => { if(!ki.current) return; const bo=nr.lngLat; /* unchanged selection logic */ })
  // desktop: ux.canvas pointerEvents:"none"; in gF effect:
  Xe.on("click", ev => { const cv=x.current, r=cv.getBoundingClientRect(), e={target:cv, clientX:ev.point.x+r.left, clientY:ev.point.y+r.top};
                         if(window.__gtbgApp&&window.__gtbgApp._gbDist&&window.__gtbgApp._gbDist(e)) return; ht(e) })
  ```
  Also (HF-4) `$t.touchZoomRotate.disableRotation(), $t.dragRotate.disable()` (north-up battle map) and `maxBounds:[[-77.36,39.72],[-77.12,39.91]]` (desktop already has it, BP:97244).
* **Fix (source):** `BattleMap` keeps the overlay `aria-hidden`, `pointer-events:none`; selection via `map.on('click')`; long-term, render units as a Mapbox layer (mobile-24) so hit-testing is `queryRenderedFeatures`.
* **Effort:** S (patch; verified) / M (source).
* **Acceptance:** with a test hook exposing the map: swipe 200 px → centre changes ≥ 0.005°; pinch 60→200 px → zoom +≥1.5; tap a unit → sheet/popup shows that unit; desktop drag/wheel/click likewise; canvas-container receives ≥1 `touchstart`. **[SCRATCH]:** swipe moved centre `(-77.235,39.812)→(-77.2184,39.8063)`, pinch out `z 13→14.82`, pinch in `→12.65`, bearing stayed 0; touch tap selected `U-XI-2-1` popup; desktop drag `→(-77.2179,39.8067)`, wheel `z 13.5→14`, click selected `U-XI-2-1`.
* **Moves:** *Core function* mobile D→A, desktop B→A-; Usability D+→B; also enables keyboard/NavigationControl on the map.
* **Depends:** none. **Audit refs:** new (relates C1/C2 "mobile unusable"; desktop D-series).

### mobile-03 — Search, Filter, story, event card, unit panel are rendered *under* the opaque mobile root — **critical (new)**
* **Evidence:** z-indices FF/OF 95 (BP:98964, 99288), CF 92 (98431), MF/unit `ji` 92 (98124), LF 85 (98673), VF/WF/_F 88 (97497, 99587, 99844) vs `tn.root` z100 background `#050508` (BP:103699-103706). Search panel `width:440` no max-width (98965). FF: `[−32,56,440,343]`, input `visibleToUser:false`; filter checkbox `visible:false`; 5 panels `visibleToUser:false` at tick 31 (story "~2 min read", event card "HIGH 7:35am North of the pike…"). **[LIVE]**
* **Root cause:** desktop panels are absolutely positioned in `S0` with desktop widths; mobile root paints over them.
* **Fix (deployed):** HF-2 re-hosts them *inside* `pO` in three wrappers and CSS (HF-12c) re-positions them:
  ```js
  V.jsxs("div",{className:"gtbg-mp-top",  children:[kt&&V.jsx(FF,{onClose:xe}), pe&&V.jsx(OF,{onClose:Pe})]}),   // search / filter (display:contents; child fixed at top)
  V.jsxs("div",{className:"gtbg-mp-toast",children:[V.jsx(qF,{})]}),                                            // commander/casualty toasts
  V.jsxs("div",{className:"gtbg-mp-story",children:[V.jsx(CF,{}),V.jsx(LF,{})]}),                               // story + event card, stacked above dock
  ```
  ```css
  .gtbg-mp-top>div{position:fixed!important;left:max(8px,var(--gt-sal))!important;right:max(8px,var(--gt-sar))!important;top:calc(var(--gt-sat) + 8px)!important;width:auto!important;transform:none!important;z-index:450!important;max-height:calc(100dvh - 24px - var(--gt-sat))!important}
  .gtbg-mp-story{position:fixed;left:8px;right:8px;bottom:calc(var(--gt-dock) + var(--gt-sab) + 8px);z-index:260;display:flex;flex-direction:column-reverse;gap:8px;max-height:46dvh;pointer-events:none}
  .gtbg-mp-story>div{position:static!important;width:auto!important;max-width:none!important;transform:none!important;max-height:34dvh!important;pointer-events:auto;overflow-y:auto}
  ```
  This is deliberately a *bridge*; the real design (mobile-22/23) replaces the desktop story/event components with a **story chip + sheet**, because at 320 px the two stacked panels take 42 % of the map (see `pt6_320x568.png`).
* **Effort:** S (patch) / L (redesign).
* **Acceptance:** [SCRATCH] at 8 viewports story + event panels `visible:true`, search input `visible:true`, typing "20th Maine" returns the 20th Maine row; no console errors. Final design: T5/T6 in §8.
* **Moves:** Mobile *Core function*, *Usability*, *Concept/content depth* (the narrative layer becomes visible); H4 clutter needs mobile-23.
* **Depends:** mobile-01. **Audit refs:** H1, H4, H2 (Esc), new.

### mobile-04 — Dead Tools tiles and missing feature parity on the mobile map — **critical/high (new)**
* **Evidence:** tiles BP:103389-103486; `Zn` (NPS tour) declared BP:102946, never read (grep of `tmp-app-mobile/pO.js`); `An` (monuments) BP:102948, only toggled at 103421; `lo` handled only for `"roster"` (BP:103505, never set) and `"legend"` (103617), while tiles set `"layers"|"bookmarks"|"help"` (103442, 103462, 103468). Help/Bookmarks/Layers/Walkthrough/Distance/Locations exist only as `AO` state (`pe`, `ht`, `It`, `Ut`, `Lt`, `Xe`; BP:112941-112950) with no path from `pO`. Mobile map init BP:102981-103049 never calls `setMapRef`, `T4` (road/river/breastwork/farm layers, BP:9746-9840), `I4/A4/J4` (canvases, day-night tint, trails BP:9842-9900, 96693-96707). `KF` (monuments, BP:100844-101007) and `XF` (tour) take `mapRef` from `AO` = the *desktop* map ref (null in mobile). `GtbgLayers/GtbgLoc/GtbgDist` read `yn.getState().mapRef` (BP:112484, 112577, 112690) which `pO` never sets. Walkthrough map div lacks `id="gtbg-wt-map"` in its mobile branch (BP:110767 vs 111096; mobile branch at 110857-110880) so its map never initialises (blank ~40 % of the screen) — this branch is reachable **today** from the Desktop layout on any window ≤860 px wide (`gO()`, BP:110614-110626; e.g. a phone that picked "Desktop", or a narrow desktop window) via the toolbar's "Virtual Walkthrough". **[LIVE]** for dead tiles and blank walkthrough map (**[SCRATCH]**: blank map area observed with the pack minus HF-6m; `maps: 1 → 2` and a rendered map after HF-6m, screenshot `pt11_walkthrough.png` is the post-fix state); rest **[STATIC]**.
* **Root cause:** the mobile layout has its own map, its own state, and a hand-copied tool list; nothing was wired back to the shared features.
* **Fix (deployed, Phase 0):** HF-5c/d + HF-6a-m: pass `onHelp/onBookmarks/onLayers/onWalkthrough` from `AO` (`pe(!0)`, `ht(!0)`, `It(!0)`, `Ut(!0)`), drop the two tiles that cannot work yet (Monuments, NPS Auto Tour), add **Virtual Walkthrough**, **Ask the Historian**, **More tools** (the 20 Extra Features rendered from `window.GTBG_MENU.buildGroupsHtml(null)`, reusing site-nav.css), fix the walkthrough id (`V.jsx("div",{ref:P,id:"gtbg-wt-map",style:kr.map})`), make the grid `repeat(auto-fill,minmax(80px,1fr))` inside a scrolling flex panel (`max-height:88dvh`), fix the black-on-dark glyph colour (`toolIcon` had no `color` ⇒ `buttontext` black: contrast **1.10:1**, why "F ⚔ ☰ 🗺" looked invisible), `aria-label`s and 44 px close.
* **Fix (Phase 1, M):** give `pO` the full parity set — `setMapRef($t)` on load; call `T4($t)`, tint (`A4/C4`), trails (`J4/cA`) in the mobile map's load handler; render `KF`/`XF`/`GtbgDist`/`GtbgLoc`/`GtbgLayers` with the mobile map ref; re-add Monuments, NPS Auto Tour, Distance, Locations, Sound, Toggle Units, Trails tiles.
* **Fix (source):** these become `MobileShell` tool descriptors (`{id, icon, label, group, toggle?, open()}`) shared with the desktop toolbar so parity is structural (mobile-22).
* **Effort:** S (Phase 0, verified) + M (Phase 1) .
* **Acceptance:** every tile in `ToolsSheet` changes app state observable in DOM (Playwright asserts a visible `role=dialog`/`aria-pressed` change per tile); `queryRenderedFeatures({layers:['roads-1863-line']})` non-empty on the mobile map; Walkthrough map has `.mapboxgl-canvas` (`maps: 2` after opening, [SCRATCH] ✓).
* **Moves:** Mobile *Core function* D→A-, *Usability* D+→B+.
* **Depends:** mobile-01, mobile-02. **Audit refs:** C2, H1, new.

### mobile-05 — Layout chooser: no auto-detect, no persistence, double map init, unusable at short heights — **high**
* **Evidence:** dO BP:102752-102820; note "You can switch at any time from the settings menu" (BP:102815) — no settings menu exists (only mobile Tools→"Desktop View", one way; search of bundle shows no `Dt("mobile")`); `Zn` state BP:112949; chooser condition `vn && !Zn && !Vt` (113061); desktop `gF` mounts while `Zn===null` (`Zn !== "mobile"`, BP:113071/113233) so a full Mapbox map + layers is created behind the chooser and destroyed on "Mobile" (`Xe.remove()`, BP:97263) before `pO` creates a second one (BP:102981). Cards `flex:1;maxWidth:280;padding:32` in a row (`ko.cards`, BP:102849) ⇒ 145-159 px cards at 375. Overlay `display:flex;alignItems:center` with no `overflow` ⇒ content 485 px tall in a 375 px viewport: title at y −78, buttons at y 344-376. The app code contains no `matchMedia` and no `pointer: coarse` test at all (grep of BP:95000-113377). **[LIVE]**
* **Root cause:** device choice delegated to the user, implemented as a blocking modal on top of a live map.
* **Fix (deployed):** HF-5a — initialise `Zn` from `?layout=` / `sessionStorage` / `matchMedia("(max-width: 820px) and (pointer: coarse)")` (→ `"mobile"`, else `"desktop"`), so the chooser never renders and only one map mounts; "Desktop View" stores a *session* override (no cross-visit dead end); HF-5b sets `<html data-layout>` for CSS. `?layout=mobile|desktop` is the escape hatch.
* **Fix (source):** `useLayoutMode()` (auto | compact | full, `matchMedia` listener, user override in Settings → Layout, persisted in `gtbg_prefs.layout`), layout switches at runtime **without remounting the map**; delete `DeviceSelect`. Optional non-blocking toast once: "Using the compact layout for your screen · Change".
  ```js
  const MQ='(max-width: 820px) and (pointer: coarse), (max-width: 600px), (max-height: 480px) and (pointer: coarse)';
  ```
* **Effort:** S (patch) / S-M (source hook).
* **Acceptance:** UA/touch phone first visit → no element with text "Choose Your Experience", `data-layout="compact"`, exactly **1** `.mapboxgl-map`; desktop → `full`; rotate 375×812→812×375 keeps selection/tick/map centre; second visit after manual override honours it; `?layout=` wins.
* **Moves:** Mobile *Usability* D+→B+; INP/GPU (one map); LCP path shorter.
* **Depends:** mobile-01. **Audit refs:** H3.

### mobile-06 — Splash & first-run: clipped title, tiny targets, three blocking screens, repeated every visit, keyboard copy on touch — **high**
* **Evidence:** `tO` BP:101472-101592; `eO=3500` (BP:101471) + 800 ms pre-delay (101486) + 600 ms fade (101503) **every visit**, and the animation drives the entire store tick per `requestAnimationFrame` (BP:101487-101505) while the desktop map is mounted behind it; `Va.appName` `fontSize:52; letterSpacing:8` (101617-101624), `progressTrack/dayLabels width:320` (101647, 101661), `skip` 11 px `#444` div (101670-101677, contrast **2.09:1**, 12 px tall); tour `bO` (111856-112021) z1000 sits *above* the splash and chooser from first paint (DOM order), `skipBtn` 12 px `#555` 89×14 (contrast 2.64), archetype "Power User — Show me the keyboard shortcuts" offered on touch (BP:111813), hints "Press Space or click Play", "Scroll the map", "Press S", "Press 3" (BP:111825-111860, `Gc`). Two different splash designs (index.html `#boot-splash` h1 44-96 px vs React `tO`) flash in sequence. **[LIVE]**
* **Root cause:** desktop-first fixed pixel sizes; onboarding assumes keyboard+mouse.
* **Fix (deployed):** HF-10a-h (responsive title `clamp(32px,11vw,52px)` + `letter-spacing:clamp(3px,1.6vw,8px)`, `min(320px,80vw)` tracks, 44 px skip, contrast, **returning-visitor fast path** via `localStorage.gtbg_seen`, fast-forward 3.5 s→1.8 s, pre-delay 800→250 ms), HF-11a-d (hide "Power User" when `(pointer: coarse)`, touch copy for the first hint, 44 px/contrast for tour skip). **[SCRATCH]:** returning visit reaches the interactive shell in **626 ms** vs ≈6 s+; tour shows 2 archetypes on touch.
* **Fix (source):** *one* splash (the inline HTML node persists into React; progress from real events: style loaded, day-1 data ready, first `idle`), min 400 ms / max 6 s, no store animation, no "skip" needed; a single dismissible coach-mark card on first run ("Drag to pan · Pinch to zoom · Tap a unit · Play ▶") instead of three modals; keyboard tour only under `(hover:hover) and (pointer:fine)`; remove `Fast-forwarding…` (offer it as an opt-in "3-day overview" in the Timeline sheet, driven by CSS/`requestAnimationFrame` on a *copy* of tick state).
* **Effort:** S (patch) / M (source).
* **Acceptance:** 320…430 px: splash title fully inside viewport (`getBoundingClientRect` ⊂ viewport); all interactive splash/tour elements ≥44×44 and contrast ≥4.5; returning-visitor TTI (controls interactive) < 1.5 s on Moto G Power / 4× CPU; first visit shows ≤1 blocking screen.
* **Moves:** *Fit & finish* D+→B+, LCP/FCP (fewer blocking screens), INP (no per-frame store writes at boot).
* **Depends:** mobile-05. **Audit refs:** H3, C6 (indirect), P1.

### mobile-07 — Map container box broken by `!important` CSS; Mapbox logo/attribution hidden — **high (new)**
* **Evidence:** index.html:72-78 `.mapboxgl-map, .mapboxgl-canvas-container, .mapboxgl-canvas { width:100% !important; height:100% !important; }` vs `tn.map {top:94; bottom:140}` (BP:103707-103714): measured map `[0,94,375,812]` (bottom of canvas 94 px below the fold; visible-area centre vs canvas centre offset ≈117 px at 375×812; canvas 40 % larger than the visible map → extra GPU fill and tile requests). `attributionControl:!1` on the mobile map (BP:102988) and on the walkthrough map (BP:110777) — Mapbox's terms require the wordmark + attribution to remain visible. **[LIVE]**
* **Root cause:** a CLS "pre-size" hack applied to every `.mapboxgl-map`.
* **Fix (deployed):** HF-12b — drop `.mapboxgl-map` from the selector (keep canvas + container 100 % of their parent); HF-4 — `new z_.AttributionControl({compact:!0})` top-right; HF-7h/i — move legend/minimap up so the logo stays clear; CSS enlarges the attribution button to 44 px. **[SCRATCH]** map `[0,94,375,578]`.
* **Fix (source):** map container sized only by its own layout; reserve space with `aspect-ratio`/explicit box, never `!important` on Mapbox internals; add `logoPosition`, compact attribution in *all* Mapbox instances (desktop, walkthrough, sub-pages).
* **Effort:** S. **Acceptance:** `.mapboxgl-map` rect equals `[0, header+tabs, W, H-header-tabs-dock]` at every matrix viewport; `.mapboxgl-ctrl-logo` and attribution button intersect the visible viewport and are not covered (`elementFromPoint`).
* **Moves:** *Fit & finish*, Best-practices/ToS, GPU memory (-40 % canvas area). **Depends:** none. **Audit refs:** P2 (indirect), CLS, X1-adjacent.

### mobile-08 — Landscape / short viewports: 27-37 % map, Tools sheet trap, chooser off-screen, manifest locks landscape — **high**
* **Evidence:** manifest `"orientation":"landscape"` (`manifest.json`); mobile chrome = 52 + 42 + 140 = 234 px fixed (BP:103715-103782) ⇒ map 140 px @375 tall, 85 px @320 tall; `toolsPanel` has no `maxHeight`/scroll (BP:104041-104047) and 375 px of content ⇒ top at −55 px @320 tall, ✕ off-screen, overlay has no other dismissal; chooser rows in mobile-05. **[LIVE]**
* **Fix (deployed):** HF-12c landscape block (`--gt-hdr:48px; --gt-tabs:0; --gt-dock:60px`, day tabs hidden, single-row dock (`Play, step, step, speed | scrubber`), minimap hidden, Tools sheet as a right-side panel `min(440px,50vw)`, story cards side-docked). **[SCRATCH]** visible map: 267 px @812×375 (71 %), 267 @667×375, 212 @568×320 (66 %); all targets ≥44; Tools reachable. (One residual: "Dismiss" of the event card is off-screen at 568×320.)
* **Fix (source):** compact-landscape layout = header 48 / dock 60 / sheets as right rail (`--sheet-w:clamp(360px,36vw,480px)`); manifest `orientation` removed (or `any`); Tools/any sheet `max-height:calc(100dvh - …)` with sticky header.
* **Effort:** S (patch) / M. **Acceptance:** matrix T2: map ≥ 65 % of viewport height in landscape; every sheet's close control inside viewport at 320 px height. **Moves:** Mobile *Usability*, *Fit & finish*; PWA installability quality. **Depends:** mobile-18 (manifest). **Audit refs:** E1.

### mobile-09 — Duplicate and contradictory time displays; developer wording — **high**
* **Evidence:** list in §2.3. In the live mobile layout the user sees up to **five** time/day readouts (mobile clock, mobile day tabs, IO clock, IO day buttons, two "Tick n/675"), and at tick 31 the header shows **8:30 AM** while the visible event card says **7:35am** (BP:9371-9383 `getTickTime` uses `6:00 + (tick-1)*5 min` on day 1, `4:00` on days 2-3; `JF` (monument tooltips) and `QF` (Ancestor panel) use `5*60` and `July ${f+2}`, BP:100836-100842 and 100998-101006; `_F` `July ${l+2}`, BP:97428). "Tick 31/675" is meaningless to visitors; `1×` is labelled "real time" (H9); step glyph "▶" is used for both Play and Next-step.
* **Fix (deployed):** HF-1 removes the IO duplicates; HF-7 labels ("Step back 5 minutes", "Play/Pause", "Playback speed 1 times…"), glyphs (`‹ ›` for step, `▶/⏸` only for Play), `tickInfo` 12 px `#a9adb8`. (Tick text kept for now.)
* **Fix (source):** exactly **one** clock: header shows weekday + date + time from a single `formatBattleTime(tick)` (shared with Compare/Ledger/Documentary — data agent owns the mapping); scrubber exposes it as `aria-valuetext`; "Tick" appears only in a developer overlay (`?debug=1`); speed chip shows "10 min/s" style rate, not "1×".
* **Effort:** S (patch) / M (with clock reconciliation). **Acceptance:** compact layout contains one element matching `/\d{1,2}:\d{2} [AP]M/` in the header region; no text matching `/Tick \d+\/675/`; event-card time == header time ±0 for the same tick (property test over all 137 events). **Moves:** *Historical consistency*, *Usability*. **Depends:** data-clock agent (C3/C4). **Audit refs:** C3, C4, H9.

### mobile-10 — Extra Features / Ask-the-Historian overlay on phones — **high**
* **Evidence:** `#extra-features` `position:fixed; z-index:999999` (index.html:176-206), collision mover picks candidate #3 (`top:50%`, index.html:535-541) → measured `[184,387,177,39]` on the map; toggle 30×30 (index.html:212-223), pin 48×34; sits over splash (z1000), chooser cards, Tools sheet. **[LIVE]**
* **Fix (deployed):** HF-12c `html[data-layout="mobile"] #extra-features{display:none!important}`; the 20 features + Historian move into the Tools sheet (HF-6f/g). **[SCRATCH]** ✓.
* **Fix (source):** delete the injected overlay and its three inline scripts (index.html:294-606 region: populate, banner, reveal, collision); Extra Features is a toolbar/sheet entry in both shells fed by `site-nav` GROUPS as data; Ask the Historian gets its own sheet on mobile (historian agent).
* **Effort:** S / M. **Acceptance:** compact layout has no fixed element with `z-index>1000` outside the React root; Tools sheet lists 20 Extra Features links, each ≥44 px tall. **Moves:** *Fit & finish* D+→A-. **Depends:** none. **Audit refs:** H1.

### mobile-11 — Touch targets, type sizes and contrast on the mobile shell (measured) — **high**
* **Evidence [LIVE]:** day tabs 125×42; speed 53×44; ✕ (tools) ~22 px glyph no padding (`toolsClose`, BP:104061-104067); popup ✕ ~20 px (`popupClose`, 103870-103879); slide-panel ✕ (103937-103943); splash/tour skips (mobile-06); Extra Features controls (mobile-10); story/event ✕/Dismiss 11×19 / 39×12; Mapbox attribution 24×24. Fonts: `clockDay` 10, `tickInfo` 10, `toolLabel` 10, `miniLabel` 9, `OVERVIEW` 8, roster 10/9, popup 11, legendSub 10; OOB/roster panels: 2,093-2,095 text nodes with sub-12 px text (min 7-8 px), no virtualisation. Contrast (computed, WCAG 2.x, on the actual backgrounds):

  | Element | Colour / size | Ratio | Verdict |
  |---|---|---|---|
  | `tickInfo` | `#444` 10 px | 2.10 | FAIL |
  | `toolIcon` glyphs (F, ⚔, ☰, 🗺-text) | default black | **1.10** | FAIL |
  | dayTab off | `#666` 13 px | 3.56 | FAIL |
  | `clockDay`, `OVERVIEW`, chooser subtitle | `#8b6914` 10/8/13 px | 4.02-4.04 | FAIL (small text) |
  | `toolsClose`, `rosterStatus`, `legendSub` | `#666` | 3.54 | FAIL |
  | splash skip / loading / fast-forward / credit | `#444/#555/#666/gold45%` | 2.09/2.73/3.54/2.50 | FAIL |
  | tour skip / hero | `#555` / `#777` | 2.64 / 4.40 | FAIL |
  | chooser note | `#444` 11 px | 2.11 | FAIL |
  | toolLabel `#aaa`, speed `#888`, popup `#888`, miniLabel `#ccc` | | 8.2 / 5.2 / 5.7 / 12.5 | pass |
* **Fix (deployed):** HF-6j/k/l, HF-7e-g/j/k, HF-10e/f, HF-11c/d, CSS `min-width/height:44px` for re-homed panel buttons + attribution button. **[SCRATCH]** matrix: `small:[]` (no interactive control <44 px) at all 10 viewports.
* **Fix (source):** token set (below) — `--ink #f1eee4 17.5:1`, `--ink-2 #c9ccd6 12.7`, `--ink-3 #a9adb8 9.05`, `--ink-4 #8d92a0 6.5 (≥14 px only)`, `--gold #d4b25a 9.98`, `--gold-dim #b8963e 7.2`, `--union #6b9bf0 7.3`, `--confed #ef7d6b 7.6`, `--critical #ff5a3c 6.6` (all on `#05050c`; ≥5.6 on `--surface-2 #151524`); min font 12 px (`--fs-12`), body 15 px; lint rule (stylelint `declaration-property-value-disallowed-list`) forbids raw hex outside tokens and `font-size` < .75rem; roster/OOB use virtual lists (`@tanstack/virtual`).
* **Effort:** S (patch) / M. **Acceptance:** axe-core `color-contrast` = 0 violations on splash, dock, each sheet; Playwright: all visible interactive elements ≥44×44 (touch) and no text node computed <12 px (excluding canvas). **Moves:** *Accessibility* C→A-, *Fit & finish*. **Depends:** none. **Audit refs:** A1, A3, A4, A5, D2, H6.

### mobile-12 — Scrubber usability and semantics — **high**
* **Evidence:** `scrubTrack` BP:103178-103214 / 103783-103792: touch-only (`onTouchStart/Move`), no pointer/mouse/keyboard, no role/ARIA, 36 px tall, thumb 24 px `translate(-50%)` (x −11 at tick 1, clipped at edges), 675 ticks / 343 px = 1.97 ticks/px (10 sim-min per px), event dots 6/8 px `pointer-events:none` (not tappable, no snapping), no value bubble, `setPlaying(false)` on touchstart only. Verified tap at x=17 → "Tick 31" (8:30 AM), drag 20→200 → tick 360 (200/375·675). **[LIVE]**
* **Fix (deployed):** none beyond touch-action; (`role="slider"`/keyboard is source-level).
* **Fix (source):** pointer-events slider with `setPointerCapture`, `touch-action:none` on the track only, 44 px hit (8 px visual, 20/28 px thumb), magnetic snap to the nearest key event within 12 px, time bubble above the thumb while dragging ("Wed July 1 · 10:55 AM · Herbst Woods"), `role=slider aria-valuemin/max/now aria-valuetext`, Arrow ±1, Shift/PageUp/PageDown ±12, Home/End, haptic `navigator.vibrate(5)` on snap where available; day boundaries as labelled notches; prev/next **moment** buttons (jump between high/critical chronology events) replace the desktop-style ±1 h.
  ```jsx
  <div ref={ref} className="scrub" role="slider" tabIndex={0} aria-label="Battle timeline" aria-valuemin={1} aria-valuemax={max}
       aria-valuenow={tick} aria-valuetext={formatBattleTime(tick)}
       onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); setFromX(e.clientX)}}
       onPointerMove={e=>drag&&setFromX(e.clientX)} onPointerUp={()=>setDrag(false)} onPointerCancel={()=>setDrag(false)} onKeyDown={onKey}/>
  ```
* **Effort:** M. **Acceptance:** slider announces value text in VoiceOver/TalkBack; drag from 10 % to 90 % moves ≥50 % of ticks within one pointer stream; tap on an event dot lands exactly on that event tick; keyboard operable. **Moves:** *Usability*, *Accessibility*. **Depends:** mobile-22. **Audit refs:** A2, D2.

### mobile-13 — Viewport, safe areas, dvh, keyboard, overscroll, standalone — **high**
* **Evidence:** `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (index.html:5, no `viewport-fit=cover`) ⇒ `env(safe-area-inset-*)` used in `bottomBar`/`slidePanel`/`toolsPanel` (BP:103779, 103921, 104046) is inert; fixed heights 52/42/140 px; `vh` in `maxHeight:"65vh"` (103914) and `calc(100vh - 200px)` / `calc(100vh - 180px)` panels (BP:98116, 98424, 99290); no `overscroll-behavior`; no iOS standalone meta; `#root{contain:strict}` fine. On-screen keyboard: Search input is at the top so it survives, but any bottom-anchored control sits under the keyboard on iOS and jumps above it on Android Chrome (default `resizes-content`). **[STATIC]**, insets inert **[SCRATCH-verified var plumbing]**.
* **Fix (deployed):** HF-12a viewport `…, viewport-fit=cover` + `color-scheme` + `mobile-web-app-capable` + `apple-mobile-web-app-capable/status-bar-style`; HF-8 CSS variables `--gt-sat/sab/sal/sar`, `--gt-hdr/tabs/dock` applied to `map`, `topBar` (height + padding-top), `dayTabs`, `bottomBar` (height + safe-bottom), `unitPopup`, legend/minimap; `overscroll-behavior:none` on html and root; `dvh` for sheet heights.
* **Fix (source):** tokens in §5.1; `visualViewport` hook sets `--vvh`; while the Search sheet input is focused the dock is hidden (`[data-kbd=open]`), results list height = `var(--vvh) - header`; `interactive-widget=resizes-content` in the viewport meta for Android; `100dvh`/`svh` only (never `100vh`); tested with CDP `Emulation.setSafeAreaInsetsOverride` (top 47/bottom 34 portrait; left/right 47 landscape).
* **Effort:** S (patch) / M. **Acceptance:** with insets 47/34 the dock's controls are ≥8 px above the home indicator and the header text below the notch; in landscape with left/right 47 no control within 47 px of the sides is covered; keyboard emulation (viewport height −320) leaves the search input and first 3 results visible. **Moves:** *Fit & finish*, PWA quality. **Depends:** none. **Audit refs:** new (E1-adjacent).

### mobile-14 — Gesture conflicts, sheet/back-button behaviour, Escape — **high**
* **Evidence:** `tn.root touch-action:none` (BP:103705) makes the whole shell a no-pan zone (fine for the map only if Mapbox receives events — it did not, mobile-02); `toolsOverlay` is full-screen with click-to-close but no drag, no history entry (Android back leaves the site); `Escape` handler ignores `INPUT` targets (BP:112967-112968, H2) and does not close mobile Tools (`vi`) or any mobile-local sheet; slide panels/unit popup/tools sheet each have their own z-index (300/400/500) and can stack; iOS back-swipe edge conflicts with map pan at x<20 px. **[STATIC]** + Search Esc behaviour **[SCRATCH]** (Esc did not close search while input focused).
* **Fix (deployed):** none (structural).
* **Fix (source):** single `SheetHost` (state `stack: SheetId[]`, only top is interactive), each sheet: `role=dialog`, modal states `inert` the shell, `history.pushState({gtSheet})` on open + `popstate` closes, `Esc` closes (also when focus is in an input: clear text first, second Esc closes), focus trap + restore, scrim tap closes modals only, peek sheets are non-modal (map stays interactive). Gesture table:

  | Gesture | Target | Behaviour |
  |---|---|---|
  | 1-finger drag | map | pan (inertia off on `hardwareConcurrency<=4`) |
  | 2-finger pinch | map | zoom; rotation disabled (north-up) |
  | double-tap | map | zoom in ×1 (Mapbox default) |
  | tap | unit | select → Unit sheet (peek) ; tap empty → dismiss |
  | drag | scrubber | scrub (pointer capture, 44 px hit) |
  | drag/flick down | sheet handle/header | dismiss/snap (threshold 8 px, velocity 0.5 px/ms); content scroll independent (`overscroll-behavior:contain`) |
  | swipe up on dock | dock | opens Timeline sheet |
  | long-press | unit | (future) pin/follow |
  | edge zones (≤16 px) | screen edges | inert (reserved for OS back-swipe) |
* **Effort:** M-L. **Acceptance:** Playwright: open Tools, `page.goBack()` closes it and stays on site; Esc closes topmost only; focus returns to opener; a scrim tap never triggers a map click; sheet scroll never pans the map (map centre unchanged after scrolling sheet content). **Moves:** *Usability*, *Accessibility*. **Depends:** mobile-22. **Audit refs:** H2, A6.

### mobile-15 — GPU, memory and CPU on low-end phones — **high**
* **Evidence [STATIC unless noted]:** (1) up to **3** Mapbox instances alive: desktop `gF` behind the chooser (BP:97237), mobile `pO` (102981), walkthrough (110770) [LIVE: `maps:1` at chooser, `maps:2` with walkthrough on patched build]; (2) overlay canvas backing store = CSS px (no `devicePixelRatio`; grep finds none in app code) → blurry at 2-3×; `lS` re-reads `getBoundingClientRect()` every frame (BP:96510) and runs an 8-pass O(n²) label de-overlap per frame (BP:96558-96581); (3) `pO` subscribes to the whole store (`yn()` destructure BP:102916-102941) so it re-renders on every tick and recomputes a 100-tick scan (`Bo`, BP:103124-103127) and two 467-entry sorts (103128-103133) per render; duplicate fetch of the 3 chronology JSONs (BP:102957-102960); (4) `KF` runs an rAF loop calling `setState` with a fresh object every frame (BP:100845-100870) and stays mounted in mobile with a null map; (5) `Ed` throttles to 30 fps only when canvas width <500 (BP:97004-97012); (6) Mapbox options: none of `maxTileCacheSize`, `fadeDuration`, `performanceMetricsCollection` (telemetry to `events.mapbox.com` — privacy page X5) are set (grep) and no app listener for `webglcontextlost` (only Mapbox-internal, BP:94010/94110/94560); (7) `backdrop-filter: blur()` on panels (FF/CF/LF/MF/desktop toolbar) is expensive on GPUs that already carry a 3× map. INP source candidates: per-tick React work + full-canvas redraw.
* **Fix (deployed):** HF-1 (unmounts ~12 components incl. `KF` loop, `IO`, `WF`), HF-5a (one map, no desktop map behind chooser), HF-4 (`maxBounds`), HF-12b (map canvas 578 vs 812 px tall ⇒ ~29 % fewer pixels at 375×812).
* **Fix (source, in order):** (a) single `BattleMap` instance kept across layout switches, walkthrough re-uses it or unmounts its own on hide; (b) `useStore(selector)` everywhere + `React.memo` for `Dock/Header`; compute roster/key-event lists in the panel that shows them; move chronology to the store (fetch once); (c) canvas: `dpr=Math.min(devicePixelRatio, 2)`, `ctx.setTransform(dpr,0,0,dpr,0,0)`, cache `getBoundingClientRect` via `ResizeObserver`, replace the 8×O(n²) loop with a spatial-hash relaxation (≤2 passes) or delegate to Mapbox symbol collision (mobile-24), skip drawing while `document.hidden`/not playing/not changed; (d) Mapbox options: `maxTileCacheSize: 24`, `fadeDuration: 0`, `performanceMetricsCollection: false`, `collectResourceTiming: false`, `renderWorldCopies:false`, `antialias:false`; **verify** whether the installed mapbox-gl v3 exposes a pixel-ratio cap (not confirmed here — do not assume); (e) `map.on('webglcontextlost')` → non-blocking "Map paused, tap to resume" + `triggerRepaint()` on `webglcontextrestored`; (f) drop `backdrop-filter` in compact layout and under `prefers-reduced-transparency`; (g) `navigator.deviceMemory<=2 || hardwareConcurrency<=4` ⇒ "Lite" defaults: 30 fps cap, no trails, labels only when selected.
* **Effort:** M (b,c,d,e) / L. **Acceptance:** on a throttled profile (4× CPU, Slow-4G) 8× playback: median frame ≤ 16 ms scripting+paint at 300 units, long tasks (>50 ms) ≤ 1 per 10 s, INP ≤ 200 ms in a 5-min scripted session (web-vitals `onINP`), JS heap ≤ 150 MB, `document.querySelectorAll('canvas.mapboxgl-canvas').length === 1` at all times, no `WebGL context lost` warnings. **Moves:** RUM INP/LCP mobile, *Reliability* C→A-. **Depends:** mobile-01/05, perf agent (bundle split). **Audit refs:** P1, P2, P5, X5.

### mobile-16 — Accessibility semantics of the mobile shell — **medium**
* **Evidence [STATIC]:** no landmarks/headings in the mobile shell (only splash h1); buttons with glyph-only names (`◀ ▶ ⋯ ✕`), `div onClick` for splash skip (BP:101570-101582), day tabs without `aria-current`, scrubber div, sheets without `role=dialog`/focus management, time not exposed to AT, canvas units not exposed at all, no reduced-motion handling in app code (grep), colour-only status dots (charging/artillery legend).
* **Fix (deployed):** aria-labels on step/play/speed/close (HF-6l, HF-7a-d); rest source-level.
* **Fix (source):** `<header>`, `<main aria-label="Battlefield map">`, `<nav aria-label="Timeline">` for the dock, sheets `role=dialog aria-modal aria-labelledby`, `aria-current="date"` on day chips, live region `aria-live="polite"` announcing **pause** time and story titles (not every tick), off-screen unit list (`<ul>` of on-screen units, virtualised, reachable via "Units in view" sheet) as the accessible alternative to the canvas, `prefers-reduced-motion` → no sheet slide, no marker pulse, no auto-play of story chips; skip-link ("Skip to timeline"); focus ring tokens (2 px `--gold`, 3:1 vs adjacent).
* **Effort:** M. **Acceptance:** axe-core 0 serious/critical on every sheet; keyboard-only traversal covers header → map → dock → sheet; VoiceOver/TalkBack smoke script passes (manual, T-manual). **Moves:** *Accessibility* C→A. **Depends:** mobile-22. **Audit refs:** A2, A5, A6, D2.

### mobile-17 — 320 px, tablets and in-between widths — **medium**
* **Evidence [SCRATCH matrix]:** at 320×568 the transport fits but story+event panels take 58 % of the screen; the original playRow `Tick 1/675` label shrinks to 28 px (wraps); 768×1024 uses the phone shell stretched (dock centred, 4-col Tools grid at 180 px tiles); `AO`'s `window.innerWidth<500` style constants (BP:98111-98115, 102708-102712, 100900, 100948) are evaluated once at module load — rotation/resizing never re-evaluates them. **[STATIC]**
* **Fix (source):** ≥768 px: compact shell with **side sheets** (§5.4); ≥1024 px or fine pointer: full shell with `(pointer:coarse)` target scaling (`--tap:44px`); replace all `window.innerWidth` inline conditions with CSS `@media`/container queries; 320 px: header time shrinks to `--fs-time` 18 px, speed chip moves into Timeline sheet if scrub width <200 px.
* **Effort:** M. **Acceptance:** matrix T1/T2 at 320, 768, 820, 834, 1024 in both orientations: no horizontal overflow, targets ≥44, sheets don't exceed viewport. **Moves:** *Fit & finish*. **Depends:** mobile-22. **Audit refs:** D2.

### mobile-18 — Web app manifest / installability — **medium**
* **Evidence:** `manifest.json`: `orientation:"landscape"`, icons `purpose:"any maskable"` combined (should be separate entries), no `id`, `lang`, `scope`, `shortcuts`, no narrow/portrait `screenshots` (`form_factor`), `theme_color/background_color` `#0a0a14` (mobile shell uses `#050508`/`#05050c`). Chrome Android honours `orientation` in standalone.
* **Fix:** remove `orientation` (or `"any"`); split icons (`192/512 any` + `512 maskable` with safe-zone padding); add `id:"/"`, `lang:"en-US"`, `scope:"/"`, `shortcuts` (Day 1/2/3, Search), portrait `screenshots` with `form_factor:"narrow"`, `display_override:["standalone"]`; unify `theme-color` with `--bg`.
* **Effort:** S. **Acceptance:** Lighthouse PWA/installability audit clean; installed app rotates; `orientation` absent. **Moves:** *SEO/PWA*, mobile *Usability*. **Depends:** mobile-08. **Audit refs:** E1, E2.

### mobile-19 — Deploy traps for any bundle edit (same-name asset, immutable cache, cache-first SW, case-mangled zip) — **high (process)**
* **Evidence:** `netlify.toml` `/assets/*` → `public, max-age=31536000, immutable`; `sw.js` precaches `/assets/index-Cg8FAMXN.js` and serves `/assets/*` cache-first (`sw.js:6, 33-47`), `CACHE_NAME 'gbg-v5'`; `index.html:55,282` reference the exact name; the *deploy* zip has 5 lower-cased asset names (BRIEF N1) — deploying it as-is 404s JS/CSS.
* **Fix:** every bundle edit ships under a **new hashed name** with `index.html` (`modulepreload` + `<script>`) and `sw.js` (`PRECACHE_ASSETS`, `CACHE_NAME`) updated together — HF-13a/b/c automate this (`index-mHF1a.js`, `gbg-v6-hf1`). Always start from **SRC_DIR** (correct case), never the deploy zip. Keep the old file for one release so open tabs finish cleanly. In the real build pipeline Vite content-hashing does this automatically.
* **Effort:** S. **Acceptance:** after deploy, a browser that previously visited (SW v5 installed) loads the new bundle on 2nd navigation (assert `performance.getEntriesByType('resource')` contains `index-mHF1a.js`, not `index-Cg8FAMXN.js`); `curl -sI /assets/<each referenced file>` all 200. **Moves:** Reliability. **Depends:** none. **Audit refs:** N1, C6 (SW).

### mobile-20 — Mapbox token is URL-restricted (local dev impossible) — correction to audit X1 — **medium**
* **Evidence [LIVE/curl]:** raster tile request `…/v4/mapbox.satellite/14/4677/6213@2x.webp?access_token=<pk>` → `200` with `Referer: https://gettysburginteractivemap.com/`, **`403`** with `https://example.com/`, `http://127.0.0.1:8123/`, `http://localhost:8123/` and no Referer; the *styles* endpoint answered `200` for a foreign Referer — that endpoint is what the earlier audit probably tested. Result: the token **is** restricted for tiles (good), so X1 as written ("unrestricted") is likely wrong for tile/style-sprite usage; but local development shows a blank satellite map.
* **Fix:** create a second, dev-only public token restricted to `http://localhost:*`, `http://127.0.0.1:*`; inject via `VITE_MAPBOX_TOKEN` (already the pattern in RECON_SRC `MapView.jsx`); keep production token restricted to `https://gettysburginteractivemap.com/*` (+ `https://*.netlify.app/*` for deploy previews if used). Confirm in the Mapbox dashboard which resource types are covered before closing X1.
* **Effort:** S. **Acceptance:** `npm run dev` renders tiles; `curl` with foreign Referer 403 on tiles. **Moves:** Security hygiene, DX. **Depends:** none. **Audit refs:** X1.

### mobile-21 — Source adoption path for the mobile shell (RECON_SRC is not a base) — **medium (structural)**
* **Evidence:** RECON_SRC `App.jsx` (264 lines): `deviceMode==='mobile'` renders **nothing** (no mobile branch); `DeviceSelect.jsx` 34 lines with different copy; `TimelineScrubber.jsx` 70 lines; `MapView.jsx` 82 lines (no overlay canvas, no `T4/I4/A4/J4`, no trails, no interpolation engine); `mapbox-gl ^2.15` vs 3.x in the bundle; total 2,106 lines vs ~17,400 lines of app code in the bundle (BP:9326-9990 + 96266-113377). PENDING.md lists ports "at moderate confidence".
* **Fix:** treat `bundle.pretty.js` as the source of truth for the interim: (1) create `src/legacy/` by mechanically slicing the app ranges into ES modules with a script (function/const boundaries: `yn` store, `y1/lS/Ed/e1` engine, `gF`, `pO`+`tn`, `AO`+`tc`, `tO`/`Va`, `dO`/`ko`, `bO`/`tr`, `IO`/`Po`, panels); (2) rename minified identifiers with a mapping table generated from the names in this report (pO→MobileShell, tn→mobileStyles, IO→TimelineBar, Zn→layout…); (3) wire Vite (React 18.3.1, zustand, mapbox-gl 3.x pinned to the bundled minor — read the version string from `bundle.pretty.js`); (4) golden-master check: run the Playwright matrix + a 675-tick screenshot diff against the currently deployed build before refactoring anything; (5) only then apply the mobile-01…-16 changes as normal source edits, deleting the patch pack. Keep `apply_patches.py` as Phase 0 until step 4 is green.
* **Effort:** L (slice + golden master) — shared with other agents' N1 item. **Acceptance:** `npm run build` output executes the same 10 golden flows as the live bundle (pixel diff ≤0.5 % on 12 reference ticks × 3 viewports); bundle-size report attached. **Moves:** all (enabler). **Depends:** none. **Audit refs:** N1, P6.

### mobile-22 — A+ mobile information architecture and component system — **high (design + build)**
Defined in §5 (layout spec, components, states, gestures, acceptance). Build order: tokens → `BattleMap` → `Header` → `Dock` (Scrubber, SpeedChip) → `SheetHost` → `ToolsSheet` → `TimelineSheet` → `UnitSheet` → `SearchSheet`/`FilterSheet` → `StoryChip/StorySheet` → remaining panels re-skinned as sheets. **Effort:** XL. **Acceptance:** the whole §8 matrix green + manual device pass. **Moves:** Mobile *Usability* D+→A, *Fit & finish* D+→A, *Core function* D→A, *Accessibility* C→A. **Depends:** mobile-21, data-clock agent. **Audit refs:** H1, H3, H4, H6, D2.

### mobile-23 — Story and unit as sheets; clutter control (H4) — **high**
* Story = non-blocking **chip** (56 px, 44 px "Read" target) above the dock only when playback is paused or `Follow story` is on (never at ≥4×); tap opens the Story sheet (half); one story at a time, queue max 1, auto-hide after 8 s unless focused; toasts (commander/casualty) collapse into one "3 updates" chip and auto-dismiss at 4 s (`role=status`); jump/load never leaves stale panels: `onJumpToDay/onSearch` closes all non-modal chips (H4).
* Unit sheet: peek 132 px (side dot, designation Georgia 17 px, commander, strength now/original, disposition), actions Follow / Pin / Details; Details = half sheet (last 20 ticks, notes, successions).
* **Effort:** M-L. **Acceptance:** at a key-moment tick during pause, exactly one chip is visible and no panel covers >25 % of the map; after `jumpToDay`, zero stale panels. **Moves:** *Usability*, *Concept depth (visible)*. **Depends:** mobile-22, mobile-03. **Audit refs:** H4.

### mobile-24 — Render units as a Mapbox layer instead of a hand-synchronised canvas — **medium (Phase 3)**
* Rationale: the overlay approach caused mobile-02 (gestures), mobile-15 (DPR, per-frame layout, O(n²) declutter) and forces custom hit-testing. Replace by a GeoJSON source `units` (positions from the interpolation worker written via `source.setData` at ≤30 Hz, or `feature-state` for selected/charging) + `symbol` layer (`icon-rotate: bearing`, `text-field` with `text-allow-overlap:false` ⇒ free collision handling, `text-size` by zoom) + `line` layer for trails; hit-test via `map.queryRenderedFeatures`; DPR-correct; accessible list derived from the same features.
* **Effort:** XL; risk: animation smoothness at 300+ units on low-end GPUs — prototype behind a flag and compare against §8 perf gates before switching. **Depends:** mobile-21. **Audit refs:** P1/P2 (indirect).

### mobile-25 — Test infrastructure for mobile (matrix, CDP, devices) — **high**
Spec in §8: Playwright projects for 9 viewports, CDP helpers (touch, safe-area, keyboard), axe, visual snapshots, Lighthouse-CI mobile, `web-vitals` RUM beacon → Netlify RUM (or Plausible) tagged by `data-layout`; real-device checklist (iPhone SE 2020, iPhone 15, Pixel 6a, Galaxy A14, iPad 10th gen). **Effort:** M. **Acceptance:** CI red on any matrix failure; `apply_patches.py` output passes the suite (§9). **Depends:** none. **Audit refs:** all.

### mobile-26 — Mobile microcopy and voice — **low-medium**
False/dev-facing strings in the mobile flow: "You can switch at any time from the settings menu" (no settings menu), "Select the format that best fits your device", "Touch-optimized layout with large controls… swipe-friendly panels" (actual transport was off-screen), "Fast-forwarding 3 days of battle…", "Tick n/675", `1×` "real time", "Press Space…/Scroll the map/Press S" on touch, "Loading battle data...", `Skip intro ›`, `⋯ Tools` (icon+word). **Fix:** museum-voice copy deck: "Layout: Auto (compact)", "Opening the field at dawn, July 1…", touch-specific tour steps ("Tap Play to watch the morning unfold", "Pinch to zoom on McPherson's Ridge", "Tap a unit to see who they are"), "10 min of battle per second" speed label, "Tools" with an icon (not "⋯"). **Effort:** S. **Acceptance:** copy review checklist; no string matches `/Tick|keyboard|Press |Scroll the map/` in compact layout. **Moves:** *Fit & finish*. **Audit refs:** H7, H9.

### mobile-27 — Order-of-Battle / Roster panels on phones — **low-medium**
* Evidence: OOB (`Xk`, BP:102321-102659) and roster (`Jk`, 102660-102751) render every unit (2,093-2,095 text nodes each), text down to 7-9 px, lexicographic sort (`102nd, 104th … 10th`), header counts "410 units / 295 units" (=705, vs 467 elsewhere — H10) [LIVE].
* Fix: virtual list, natural sort (`localeCompare(…, {numeric:true})`), ≥13 px rows (48 px), sticky Union/Confederate segmented control instead of two 180 px columns, counts from one source. **Effort:** M. **Acceptance:** DOM nodes < 300 while open; sort test passes; no text <12 px. **Audit refs:** H5, H10.

---

## 4. Duplicate time/clock inventory (mobile) — for the single-clock refactor

| # | Element | Source | Shown when |
|---|---|---|---|
| 1 | header "JULY 1" + "6:00 AM" | `tn.clock*` BP:103141-103147 (`getTickTime()`) | always |
| 2 | day tabs "July 1/2/3" | BP:103158-103173 | always |
| 3 | "Tick f/675" | BP:103238 | always |
| 4 | IO clock "July 1, 6:00 AM" | BP:112226 | (bug) covers dock |
| 5 | IO day buttons | BP:112227-112246 | (bug) |
| 6 | IO scrub `<input type=range>` (unlabeled) | BP:112294-112303 | (bug) hit-tests over mobile buttons |
| 7 | IO "Tick n/675" + credit | BP:112357-112368 | (bug) |
| 8 | `_F` "July {day+2}, 1863 / 1x (real time)" | BP:97415-97440 | hidden under mobile root |
| 9 | LF event card clock ("7:35am") | data | story layer |
| 10 | `JF` / `QF` "July {day+2}" strings | BP:100836-100842, 100998-101006 | monument tooltips ("Click to jump to …") / Ancestor panel |

---

## 5. The A+ mobile experience — specification

### 5.1 Principles and tokens
1. Map first (≥70 % of viewport height in portrait, ≥65 % landscape). 2. One clock. 3. One sheet at a time. 4. Every target ≥44×44; text ≥12 px; contrast ≥4.5 (≥3 for non-text). 5. Thumb-reachable actions live in the bottom 60 %. 6. Same shell 320-1024 px; layout switches by CSS/`matchMedia`, never by remounting the map. 7. No developer vocabulary.

```css
:root{
  /* safe areas */
  --sat:env(safe-area-inset-top,0px); --sar:env(safe-area-inset-right,0px); --sab:env(safe-area-inset-bottom,0px); --sal:env(safe-area-inset-left,0px);
  /* sizing */
  --tap:44px; --gutter:clamp(12px,3.6vw,20px);
  --hdr-h:52px;                       /* content height; add var(--sat) */
  --dock-scrub-h:44px; --dock-ctl-h:56px; --dock-h:calc(var(--dock-scrub-h) + var(--dock-ctl-h)); /* 100px; add var(--sab) */
  --sheet-radius:16px; --sheet-w:clamp(360px,36vw,480px);
  /* type */
  --fs-12:.75rem; --fs-13:.8125rem; --fs-15:.9375rem; --fs-17:1.0625rem; --fs-time:clamp(1.125rem,4.8vw,1.375rem);
  /* colour (contrast measured on --bg #05050c) */
  --bg:#05050c; --surface:#0d0d18; --surface-2:#151524; --line:#26263a;
  --ink:#f1eee4;      /* 17.5:1 */  --ink-2:#c9ccd6;  /* 12.7 */  --ink-3:#a9adb8; /* 9.05 */  --ink-4:#8d92a0; /* 6.5, >=14px only */
  --gold:#d4b25a;     /* 9.98 */    --gold-dim:#b8963e; /* 7.2 */
  --union:#6b9bf0;    /* 7.3 */     --confed:#ef7d6b;   /* 7.6 */   --critical:#ff5a3c; /* 6.6 */  --ok:#5bd08a; /* 10.5 */
  /* z-scale */
  --z-map:0; --z-canvas:10; --z-hdr:100; --z-dock:110; --z-chip:120; --z-scrim:200; --z-sheet:210; --z-toast:300; --z-modal:400;
}
@media (max-height:480px) and (orientation:landscape){ :root{ --hdr-h:48px; --dock-h:60px } }
@media (prefers-reduced-motion:reduce){ *{ animation-duration:.01ms!important; transition-duration:.01ms!important } }
```

### 5.2 Layout spec by viewport (portrait unless stated; computed from the tokens)

| Viewport (example device) | Gutter | Time font | Play Ø | Ctl gap | Ctl row width (5 ctl) | Scrub width* | Ticks / px | Map area (no insets → with 47/34 insets) | Tools cols | Sheet |
|---|---|---|---|---|---|---|---|---|---|---|
| 320×568 (iPhone SE 1) | 12 | 18 | 52 | 7.7 | 258.7 (slack 37) | 232 | 2.9 | 416 px 73 % → 335 (59 %) | 3 | full-width bottom |
| 360×640 (small Android) | 13 | 18 | 52 | 8.6 | 262.6 | 270 | 2.5 | 488 (76 %) → 407 (64 %) | 3 | full-width |
| 360×740 (Galaxy A/S) | 13 | 18 | 52 | 8.6 | 262.6 | 270 | 2.5 | 588 (79 %) → 507 (69 %) | 3 | full-width |
| 375×667 (iPhone SE 2/3) | 13.5 | 18 | 52.5 | 9.0 | 264.5 | 284 | 2.4 | 515 (77 %) → 434 (65 %) | 4 | full-width |
| 375×812 (iPhone 13 mini) | 13.5 | 18 | 52.5 | 9.0 | 264.5 | 284 | 2.4 | 660 (81 %) → 579 (71 %) | 4 | full-width |
| 390×844 (iPhone 14/15) | 14 | 18.7 | 54.6 | 9.4 | 268 | 298 | 2.3 | 692 (82 %) → 611 (72 %) | 4 | full-width |
| 412×915 (Pixel 7) | 14.8 | 19.8 | 57.7 | 9.9 | 273 | 318 | 2.1 | 763 (83 %) → 682 (75 %) | 4 | full-width |
| 430×932 (iPhone Pro Max) | 15.5 | 20.6 | 60.2 | 10.3 | 277 | 335 | 2.0 | 780 (84 %) → 699 (75 %) | 4 | full-width |
| 768×1024 (iPad mini/Air portrait) | 20 | 22 | 64 | 14 | 296 | 664 | 1.0 | 872 (85 %) → 791 (77 %) | 7 | **side sheet** `--sheet-w` |
| **Landscape** 812×375 / 667×375 / 568×320 / 915×412 | `max(12,safe-l/r)` | 18 | 48 | 8 | single row | flex | — | **267 (71 %) / 267 / 212 (66 %) / 304 (74 %)** | list | **right rail** `min(440,50vw)` |

\* scrub width = viewport − 2·gutter − speed chip (56) − 8. Row formula: `4·44 + Play + 4·gap` (prev-moment, step-back, PLAY, step-fwd, next-moment). Play `clamp(52px,14vw,64px)`, gap `clamp(6px,2.4vw,14px)`, gutter `clamp(12px,3.6vw,20px)`, Tools grid `repeat(auto-fill,minmax(80px,1fr))` (verified to yield 3 cols at 320/360 and 4 at ≥375 in the scratch copy).

### 5.3 Screen anatomy (portrait)
```
┌──────────────────────────────────────────┐ safe-top
│ Wed, July 1, 1863           [🔍 44][☰ 44]│ 52  header  (time block is a 44px-high button → opens Timeline sheet)
│ 6:00 AM  (--fs-time, tabular-nums)       │
├──────────────────────────────────────────┤
│                                          │
│              MAP  (BattleMap)            │  flexible; controls (zoom ±, compass) top-right, attribution compact
│                                          │
│   [story chip 56px — only when paused]   │  above dock, left/right = gutter
├──────────────────────────────────────────┤
│ ━━━━●━━━━━━━━━━━━━━━━━━━━━  [10 min/s ⌄] │ 44 scrubber (8px track, 44px hit) + speed chip 56×44
│   ⏮    ‹     ( ▶ )     ›     ⏭          │ 56 controls: prev moment | step -5m | PLAY | step +5m | next moment
└──────────────────────────────────────────┘ safe-bottom
```
Header day/time is **one** readout; Day jump lives in the Timeline sheet (3 × 48 px chips) and via the scrubber's labelled day notches; `⏮/⏭` jump between key moments.

### 5.4 Components and states
| Component | States (all must be designed + tested) |
|---|---|
| Header | default · playing (time updates every tick; **no** live-region chatter) · paused (announce "Paused at 10:55 AM") · loading (skeleton time) · offline badge |
| Time button | default · pressed · (opens Timeline sheet) |
| Play | idle ▶ · playing ⏸ · buffering (spinner, `aria-busy`) · end-of-battle (↺ replay) · disabled (data not ready) · pressed (scale .96, 80 ms) · focus-visible ring |
| Step / moment buttons | default · pressed · disabled at ends · long-press repeat (step) · focus |
| Scrubber | idle · hover(desktop) · dragging (thumb 28, bubble visible) · snapped-to-event (bubble shows title) · keyboard-focused · disabled |
| Speed chip | default · open (mini popover with 0.25×…16× as 10 min/s labels) · disabled |
| Story chip | hidden · entering (translateY 8 px, 160 ms) · visible (auto-hide 8 s, pause on focus/hover) · expanded → sheet · dismissed (swipe down/✕ 44 px) |
| Sheet | closed · peek · half · full · dragging · closing · (modal vs non-modal) · loading skeleton · error ("Couldn't load this — Retry") |
| Tools tile | default · pressed · active (toggle, `aria-pressed`, gold ring) · disabled with reason (e.g. "Zoom in to use") |
| Unit marker/selection | default · selected (ring + label) · followed (camera lock, chip "Following 20th Maine ✕") · dimmed by filter |
| Toast | info · success · error · auto-dismiss 4 s · max 1 visible · `role=status` · reduced-motion no slide |
| Boot | inline splash (title, progress from real events) → cross-fade to app · error (WebGL unsupported / context lost) with **Lite fallback** (static day-snapshots page) and Retry |

### 5.5 Sheet system (contract)
```css
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:var(--z-sheet);display:flex;flex-direction:column;
  max-height:calc(100dvh - var(--hdr-h) - var(--sat));background:var(--surface);border-radius:var(--sheet-radius) var(--sheet-radius) 0 0;
  padding-bottom:var(--sab);transform:translateY(var(--sheet-y,100%));transition:transform .22s cubic-bezier(.2,.8,.2,1)}
.sheet[data-state=peek]{--sheet-y:calc(100% - var(--peek,132px))}
.sheet[data-state=half]{--sheet-y:calc(100% - min(60dvh,560px))}
.sheet[data-state=full]{--sheet-y:0}
.sheet__body{overflow:auto;overscroll-behavior:contain;touch-action:pan-y}
.sheet__handle{height:44px;touch-action:none;display:grid;place-items:center}   /* 36×4 visual bar */
@media (min-width:768px), (orientation:landscape) and (max-height:480px){
  .sheet{left:auto;width:var(--sheet-w);top:calc(var(--hdr-h) + var(--sat));border-radius:var(--sheet-radius) 0 0 0;transform:translateX(var(--sheet-x,100%))}
}
@media (prefers-reduced-motion:reduce){.sheet{transition:none}}
```
Behaviour: modal (half/full) → scrim `rgba(0,0,0,.5)` + `inert` on shell + focus trap; peek is non-modal. History: push on open, `popstate` closes. Snap by velocity (0.5 px/ms) or 40 % threshold. Only the topmost sheet accepts input.

Tools sheet content: search field (filters tiles + units) · **Explore** (Search, Filter, Order of Battle, Unit Roster, Follow Ancestor, Soldier's View) · **Map** (Layers, Legend, Monuments, Labels, Distance, Mini map, Toggle units, Trails) · **Guides** (Virtual Walkthrough, NPS Auto Tour, Help & Guide (PDF), Bookmarks) · **More features (20)** (site-nav GROUPS) · footer: Layout (Auto/Compact/Full), Sound, Report an issue.

### 5.6 Splash / first run / returning
First visit: inline HTML splash (same node continues into React) ≤ ~1.2 s or until day-1 data + first `idle`, cross-fade; then **one** dismissible coach-mark (3 tips, touch copy). Returning: no splash beyond the inline first paint; restore last tick/day, selected unit, sheet closed. `?t=<tick>&u=<unit>` deep links (also used by Ancestor share links).

### 5.7 Landscape phone (max-height 480 px)
Header 48 (time left, search/tools right) · dock 60 single row `[▶ 48][‹ 44][› 44][scrubber flex][speed 44][tools 44]` with 44 px scrub hit · sheets as right rail `min(440px,50vw)` · story chip becomes a card docked bottom-right · minimap hidden · insets `max(12px, env(safe-area-inset-left/right))`.

### 5.8 Pointer/gesture, a11y and performance acceptance summary
See mobile-12/-14/-15/-16 and §8. Performance budgets for the compact shell: entry JS ≤ 170 KB gz (mapbox-gl split to its own async chunk started at boot), shell CSS ≤ 12 KB, first interactive controls ≤ 2.5 s (Moto G Power, 4× CPU, Slow-4G), INP ≤ 200 ms (p75 RUM), CLS ≤ 0.02 (map box reserved by CSS, no `!important`), canvas frame ≤ 6 ms at 300 units.

---

## 6. Patch pack for the deployed bundle (verified)

**Location:** `plan-work/tmp-app-mobile/apply_patches.py` (full source in Appendix B). Usage: copy SRC_DIR (correct-case tree) to a scratch dir, `python apply_patches.py <dir>`. Every edit asserts its find-string occurs **exactly once** in `assets/index-Cg8FAMXN.js` (or `index.html`), so a stale/incorrect base aborts instead of half-patching. Result: 68 logged edits (67 exact-match `rep(...)` calls on the JS/HTML + 1 `sw.js` edit), output bundle `assets/index-mHF1a.js` (+6.5 KB), `index.html` +5.4 KB, `sw.js` cache `gbg-v6-hf1`. Syntax check: `node --check` (as `.mjs`) OK.

| Group | Edits | Fixes | Verified |
|---|---|---|---|
| HF-1a/b | gate desktop-only overlays incl. `IO`, `MF` in mobile | C1, C2 (mobile-01) | SCRATCH ✓ (all dock/transport `elementFromPoint` ✓) |
| HF-2 | re-home FF/OF/CF/LF/qF into `pO` wrappers | mobile-03 | SCRATCH ✓ |
| HF-3a/b/c | overlay canvas `pointer-events:none` + `map.on('click')` (mobile + desktop) | mobile-02 | SCRATCH ✓ (pan, pinch, wheel, touch tap, mouse click) |
| HF-4 | `maxBounds`, no rotation, compact attribution (mobile map) | mobile-02/07 | SCRATCH ✓ |
| HF-5a-d | layout auto-detect/`?layout=`/session override; `<html data-layout>`; prop wiring | mobile-05/04 | SCRATCH ✓ (1 map, no chooser) |
| HF-6a-m | Tools: wire Help/Bookmarks/Layers, remove dead tiles, add Walkthrough/Historian/More tools, scroll+grid, icon colour, labels, close 44 px, **walkthrough map id** | mobile-04 | SCRATCH ✓ (14 tiles reachable; Help/Bookmarks/Layers open; walkthrough map renders) |
| HF-7a-k | transport labels/glyphs, contrast, targets, legend offset, popup close | mobile-09/11 | SCRATCH ✓ (`small:[]` at 10 viewports) |
| HF-8a-f | safe-area/dvh CSS variables on map/top/tabs/dock/popup | mobile-13 | SCRATCH ✓ (rects); insets themselves UNTESTED on device |
| HF-9a-i | class hooks (`gtbg-m-*`) for CSS | enabler | ✓ |
| HF-10a-h | splash clipping, targets, returning-visitor fast path, shorter fast-forward | mobile-06 | SCRATCH ✓ (626 ms returning) |
| HF-11a-d | tour: hide keyboard archetype on touch, touch copy, skip target/contrast | mobile-06 | SCRATCH ✓ |
| HF-12a-c | viewport meta (+`viewport-fit=cover`), drop `.mapboxgl-map` `!important` height, CSS block (variables, panels, landscape, More tools) | mobile-07/08/10/13 | SCRATCH ✓ |
| HF-13a-c | **rename bundle + SW cache bump** | mobile-19 | file-level ✓; SW upgrade path UNTESTED |

**Known residuals of the pack (by design, fixed in Phase 1/2):** no Monuments / NPS Auto Tour / Distance / Locations / Sound / Trails on mobile; story+event cards still desktop components (small-screen density); Esc does not close Search while focused (H2, desktop code); "Tick n/675" still shown; event-card "Dismiss" off-screen at 568×320; iOS/WebKit behaviours unverified; hit-testing fix (HF-3) applies to Distance-tool clicks on desktop through the synthesised `{target, clientX, clientY}` event but the Distance tool's own two-point line bug (H12) is separate.

Rollback: redeploy the previous deploy folder (`index-Cg8FAMXN.js` untouched); users on `index-mHF1a.js` get the old HTML/SW on next navigation (SW `CACHE_NAME` differs, old caches purged in `activate`).

---

## 7. Mapping to a proper source tree

```
src/
  main.jsx  App.jsx                         <- AO data-boot + providers only
  layout/
    useLayoutMode.js                        <- HF-5a/b  (auto|compact|full; matchMedia; data-layout)
    DesktopShell.jsx                        <- tc.toolbar + IO(TimelineBar) + desktop panels (BP:113071-113283, 112202-112468)
    MobileShell.jsx                         <- pO + tn (BP:102914-104095), split below
  map/
    BattleMap.jsx                           <- gF+pO map effects merged; ONE instance; layers T4, tint A4/C4, trails J4/cA; click handler (HF-3)
    unitRenderer.js                         <- lS, X4, y1, lA, Ed/Gk/Op (BP:96266-97047, 96956-97018); DPR fix; later mobile-24 layer
    mapOptions.js                           <- token, maxBounds, performance options (HF-4, mobile-15d)
  mobile/
    Header.jsx  Dock.jsx  Scrubber.jsx  SpeedChip.jsx  StoryChip.jsx
    SheetHost.jsx  Sheet.jsx  useSheetHistory.js  useFocusTrap.js  useVisualViewport.js
    ToolsSheet.jsx  TimelineSheet.jsx  UnitSheet.jsx  SearchSheet.jsx  FilterSheet.jsx  LegendSheet.jsx  LayersSheet.jsx  StorySheet.jsx
    mobile.css                              <- HF-12c block, tokens, landscape/tablet rules
  features/  OrderOfBattle Roster AncestorTracker StreetView VirtualWalkthrough Help Bookmarks   <- Xk Jk Zk Yk _O EO MO (walkthrough id fix HF-6m lives here)
  shared/    store.js (yn, BP:9330-9449)  time.js (single clock)  tokens.css  icons (site-nav sprite)
  boot/      Splash.jsx (tO + inline HTML unify)  Coach.jsx (bO replacement)
tests/       playwright/*.spec.ts  unit/*.test.js
```
| Patch | Durable source location |
|---|---|
| HF-1 | not needed — shells own their chrome |
| HF-2 | `StorySheet/StoryChip`, `SearchSheet`, `FilterSheet`, `ToastHost` in `mobile/` |
| HF-3 | `BattleMap.jsx` (`map.on('click')`, overlay `pointer-events:none`) |
| HF-4, HF-7h/i | `mapOptions.js`, `mobile.css` |
| HF-5 | `layout/useLayoutMode.js` + Settings→Layout in `ToolsSheet` |
| HF-6 | `ToolsSheet.jsx` descriptors shared with desktop toolbar |
| HF-7/8/9 | `Dock.jsx`, `Header.jsx`, tokens |
| HF-10/11 | `boot/Splash.jsx`, `boot/Coach.jsx` |
| HF-12 | `index.html` (viewport, no `!important`), `mobile.css`, `manifest.json` |
| HF-13 | Vite content hashing + `vite-plugin-pwa`/Workbox precache manifest |

---

## 8. Playwright acceptance matrix (skeleton — copy into `tests/playwright/mobile-matrix.spec.ts`)

```ts
import { test, expect, Page, CDPSession } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const VIEWPORTS = [
  { name: 'se1',       w: 320, h: 568, dpr: 2 },  { name: 'android-s', w: 360, h: 640, dpr: 3 },
  { name: 'se3',       w: 375, h: 667, dpr: 2 },  { name: 'mini',      w: 375, h: 812, dpr: 3 },
  { name: 'i15',       w: 393, h: 852, dpr: 3 },  { name: 'pixel7',    w: 412, h: 915, dpr: 2.6 },
  { name: 'promax',    w: 430, h: 932, dpr: 3 },  { name: 'ipad-mini', w: 768, h: 1024, dpr: 2 },
  { name: 'land-812',  w: 812, h: 375, dpr: 3 },  { name: 'land-568',  w: 568, h: 320, dpr: 2 },
];
const cdp = async (page: Page) => page.context().newCDPSession(page);
const touch = (s: CDPSession) => ({
  swipe: async (x1:number,y1:number,x2:number,y2:number,steps=12) => {
    await s.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});
    for (let i=1;i<=steps;i++) await s.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/steps,y:y1+(y2-y1)*i/steps}]});
    await s.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  },
  pinch: async (cx:number,cy:number,d0:number,d1:number,steps=10) => {
    const p=(d:number)=>[{x:cx-d/2,y:cy,id:1},{x:cx+d/2,y:cy,id:2}];
    await s.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:p(d0)});
    for (let i=1;i<=steps;i++) await s.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:p(d0+(d1-d0)*i/steps)});
    await s.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  },
});

for (const vp of VIEWPORTS) test.describe(`${vp.name} ${vp.w}x${vp.h}`, () => {
  test.use({ viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:vp.dpr, isMobile:true, hasTouch:true });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('gtbg_onboarded','1'); });
    page.on('console', m => { if (m.type()==='error') throw new Error('console error: '+m.text()); });
    await page.goto('/?test=1');                                   // test build exposes window.__gtbg = { map, store }
    await page.getByTestId('play').waitFor();
  });

  test('T0 boots without chooser, single map, compact layout', async ({ page }) => {
    await expect(page.getByText('Choose Your Experience')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-layout','compact');
    expect(await page.locator('canvas.mapboxgl-canvas').count()).toBe(1);
  });

  test('T1 no horizontal overflow, no clipped text', async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => { const s=getComputedStyle(e); return (s.overflow==='hidden'||s.textOverflow==='ellipsis') && e.scrollWidth>e.clientWidth+1 && e.children.length===0 && !e.hasAttribute('data-allow-clip'); }).map(e=>e.textContent?.slice(0,30)));
    expect(clipped).toEqual([]);
  });

  test('T2 layout budget: map share + touch targets + min font', async ({ page }) => {
    const share = await page.evaluate(() => { const m=document.querySelector('[data-testid=map]')!.getBoundingClientRect(); return m.height/innerHeight; });
    expect(share).toBeGreaterThanOrEqual(vp.w > vp.h ? 0.65 : 0.70);
    const small = await page.evaluate(() => [...document.querySelectorAll('button,[role=button],[role=slider],a[href],input,select')]
      .filter(e => (e as HTMLElement).offsetParent!==null).map(e => { const r=e.getBoundingClientRect(); return {t:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,20), w:r.width, h:r.height}; })
      .filter(b => b.w<44 || b.h<44));
    expect(small).toEqual([]);
    const tiny = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.children.length===0 && e.textContent?.trim() && parseFloat(getComputedStyle(e).fontSize)<12).map(e=>e.textContent!.slice(0,20)));
    expect(tiny).toEqual([]);
  });

  test('T3 transport is on-screen and un-covered', async ({ page }) => {
    for (const id of ['play','step-back','step-fwd','prev-moment','next-moment','scrubber','speed']) {
      const ok = await page.getByTestId(id).evaluate(el => { const r=el.getBoundingClientRect(); const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight && (t===el||el.contains(t)); });
      expect(ok, id).toBe(true);
    }
    // nothing outside the React root may sit above the dock (Extra Features overlay etc.)
    expect(await page.evaluate(() => [...document.body.children].filter(e => e.id!=='root' && getComputedStyle(e).position==='fixed' && getComputedStyle(e).display!=='none').length)).toBe(0);
  });

  test('T4 Tools sheet: every tile reachable, closable, back closes it', async ({ page }) => {
    await page.getByTestId('tools').click();
    const sheet = page.getByRole('dialog', { name: 'Tools' }); await expect(sheet).toBeVisible();
    for (const tile of await sheet.getByRole('button').all()) { await tile.scrollIntoViewIfNeeded(); await expect(tile).toBeVisible(); }
    await page.goBack(); await expect(sheet).toBeHidden(); expect(new URL(page.url()).pathname).toBe('/');
  });

  test('T5 map gestures reach Mapbox', async ({ page }) => {
    const s = await cdp(page), t = touch(s);
    const c0 = await page.evaluate(() => (window as any).__gtbg.map.getCenter().toArray());
    await t.swipe(vp.w*0.8, vp.h*0.45, vp.w*0.2, vp.h*0.35);
    const c1 = await page.evaluate(() => (window as any).__gtbg.map.getCenter().toArray());
    expect(Math.hypot(c1[0]-c0[0], c1[1]-c0[1])).toBeGreaterThan(0.004);
    const z0 = await page.evaluate(() => (window as any).__gtbg.map.getZoom());
    await t.pinch(vp.w/2, vp.h*0.45, 60, 200);
    expect(await page.evaluate(() => (window as any).__gtbg.map.getZoom())).toBeGreaterThan(z0+1);
    expect(await page.evaluate(() => (window as any).__gtbg.map.getBearing())).toBe(0);
  });

  test('T6 tap selects a unit; sheet peek shows it; story chip appears when paused at a key moment', async ({ page }) => {
    await page.evaluate(() => { const g=(window as any).__gtbg; g.store.setState({currentTick:60,isPlaying:false}); const u=g.store.getState().placementsByTick[60][0]; g.map.jumpTo({center:[u.lng,u.lat],zoom:14}); });
    await page.waitForTimeout(500);
    const p = await page.evaluate(() => { const g=(window as any).__gtbg; const u=g.store.getState().placementsByTick[60][0]; const pt=g.map.project([u.lng,u.lat]); const b=document.querySelector('[data-testid=map]')!.getBoundingClientRect(); return {x:pt.x+b.left,y:pt.y+b.top}; });
    await page.touchscreen.tap(p.x, p.y);
    await expect(page.getByTestId('unit-sheet')).toBeVisible();
  });

  test('T7 contrast + a11y (axe) on shell and Tools sheet', async ({ page }) => {
    let r = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze(); expect(r.violations).toEqual([]);
    await page.getByTestId('tools').click();
    r = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze(); expect(r.violations).toEqual([]);
  });

  test('T8 safe areas and keyboard', async ({ page }) => {
    const s = await cdp(page);
    await s.send('Emulation.setSafeAreaInsetsOverride', { insets: vp.w>vp.h ? {top:0,bottom:21,left:47,right:47} : {top:47,bottom:34,left:0,right:0} });
    const gap = await page.getByTestId('play').evaluate(el => innerHeight - el.getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(vp.w>vp.h ? 4 : 8+34);
    await s.send('Emulation.setDeviceMetricsOverride', { width:vp.w, height:vp.h-320, deviceScaleFactor:vp.dpr, mobile:true });
    await page.getByTestId('search').click(); const input = page.getByRole('searchbox');
    await input.focus(); const r = await input.boundingBox(); expect(r!.y+r!.height).toBeLessThan(vp.h-320);
  });

  test('T9 rotate keeps state', async ({ page }) => {
    await page.evaluate(() => (window as any).__gtbg.store.setState({currentTick:120,isPlaying:false}));
    await page.setViewportSize({ width: vp.h, height: vp.w });
    expect(await page.evaluate(() => (window as any).__gtbg.store.getState().currentTick)).toBe(120);
    expect(await page.locator('canvas.mapboxgl-canvas').count()).toBe(1);
  });

  test('T10 reduced motion + persistence', async ({ page }) => {
    await page.emulateMedia({ reducedMotion:'reduce' });
    const dur = await page.getByTestId('tools').evaluate(() => getComputedStyle(document.body).transitionDuration);
    expect(parseFloat(dur)).toBeLessThan(0.05);
  });
});

test('T11 desktop full layout unaffected + gestures', async ({ page }) => { /* 1440x900: pan/wheel/click via page.mouse; assert data-layout=full */ });
test('T12 returning visitor reaches interactive dock < 1.5 s (4x CPU, Slow 4G)', async ({ page }) => { /* CDP Emulation.setCPUThrottlingRate + Network.emulateNetworkConditions */ });
```
Additional gates (CI): Lighthouse-CI mobile (`preset: 'perf'`, throttling `simulate`) budgets Perf ≥ 90 → target 95, A11y ≥ 95, BP ≥ 95, SEO 100; `web-vitals` beacon; visual snapshots per viewport for: boot, home, tools, story chip, unit sheet, search+keyboard, landscape. Real-device checklist (manual, every release): iPhone SE 2020, iPhone 15, iPad 10th gen (Safari + installed PWA), Pixel 6a, Galaxy A14 (low-end), one 2 GB Android Go device; VoiceOver + TalkBack smoke.

---

## 9. Phasing and dependencies

| Phase | Content | Effort | Exit gate |
|---|---|---|---|
| **0 — Hot-fix** | Apply `apply_patches.py` to SRC_DIR copy, deploy under new hash + SW bump; real-phone smoke (iOS Safari, Android Chrome) | **S** | Pack behaviours in §6 re-verified on 2 real phones; CSP/console unchanged; rollback rehearsed |
| **1 — Parity + polish on the bundle** | mobile-04 Phase 1 (setMapRef, layers, tint, trails, monuments, tour, sound, distance), story chip minimal, `Esc`, manifest (mobile-18), Mapbox options (mobile-15d), dev token (mobile-20), copy (mobile-26) | M-L | §8 T0-T8 green on scratch build |
| **2 — Source adoption + shell rewrite** | mobile-21, then mobile-22/23/12/14/16/17 in build order (§ mobile-22) | XL | Full matrix + axe + golden-master parity; patch pack deleted |
| **3 — Rendering** | mobile-24 GL units layer, virtual lists (mobile-27), perf gates (mobile-15) | XL | INP p75 ≤ 200 ms, LCP ≤ 2.5 s (RUM, mobile) |

Cross-agent dependencies: data-clock/date (C3/C4) → mobile-09 single clock; perf agent (code-split, SW C6) → mobile-15 gates, mobile-19; a11y agent → mobile-16 rules; historian agent → mobile chat sheet inside `SheetHost`; pages agents → shared tokens/sprite so the shell and sub-pages match; security agent → mobile-20/X1.

## 10. Open questions for the owner
1. Should tablets in portrait (768-834 px) get the compact shell with side sheets (recommended) or the full desktop toolbar with 44 px targets?
2. Is the "Fast-forward" intro a feature you want to keep? Recommendation: opt-in from the Timeline sheet, not a gate on every visit.
3. Keep a manual "Desktop layout" escape on phones? (Recommended: Settings → Layout: Auto / Compact / Full, persisted.)
4. Is Sound (cannon) meant to exist on mobile? (Currently unreachable on phones; RECON_SRC README says Sound was removed on purpose.)
5. Confirm in the Mapbox dashboard whether the production token also restricts the Styles API (curl showed 200 with a foreign Referer for styles but 403 for tiles).
6. **10-second sanity check of the biggest finding (mobile-02):** open the live site on a desktop, pick Desktop, and try to drag the map or scroll-zoom it. My synthetic-input test says nothing moves (0 events reach Mapbox, centre/zoom unchanged). If it *does* pan for you, tell me which browser — that would mean a real-browser behaviour my headless probe does not reproduce and the finding's severity should be revisited.

---

## Appendix A — Measurement tables

**A1. Live baseline (Chrome 153, Mobile layout, real CDP touch)** — see §2.2.

**A2. Mobile shell after removing IO (simulated with `display:none` on the live page)** — visible map height / chrome share: 320×568 333 px / 41 %; 360×640 405 / 37 %; 360×740 505 / 32 %; 375×667 432 / 35 %; 375×812 577 / 29 %; 390×844 609 / 28 %; 412×915 680 / 26 %; 430×932 697 / 25 %; 768×1024 789 / 23 %; **812×375 140 / 63 %; 667×375 140 / 63 %; 568×320 85 / 73 %**; Tools panel top: 157 (320×568), 256 (360×640), 292 (375×667), 437 (375×812), 0 (×375 tall), **−55 (×320 tall)**. Play row at 320 wide: tick label shrinks to 28 px.

**A3. Patched scratch copy, 10-viewport matrix** (`tmp-app-mobile/pt6.mjs`): map visible height 331/503/430/575/678/695/787/**267/267/212** px (58/68/64/71/74/75/77/**71/71/66** %); `small` (<44 px) controls: none at any viewport; unreachable: none except the event card "Dismiss" at 568×320.

**A4. Patched scratch copy, behaviour checks:** pan centre `(-77.235, 39.812)→(-77.2184, 39.8063)`; pinch out z13→14.82, pinch in →12.65; bearing 0; touch tap selects `U-XI-2-1` ("First Brigade, Second Division, Eleventh Corps (Coster's Brigade) · Chaotic Retreat · 436 men"); Tools: 14 tiles reachable, grid `repeat(4, 84.25px)` @375, `scrollHeight 1761 / clientHeight 640` (More tools); Search opens inside viewport, "20th Maine" → result; Help/Bookmarks/Layers open; Walkthrough opens with 2 maps; desktop 1440×900 drag `(-77.235,39.812)→(-77.2179,39.8067)`, wheel z13.5→14, click selects unit, 0 console errors; returning visit to interactive shell 626 ms; first visit tour has 2 archetypes.

**A5. Files in `plan-work/tmp-app-mobile/`:** `cdp.mjs`, `lib2.mjs`, `lib3.mjs` (CDP helpers), `probe1-11.mjs` (live probes), `pt1-11.mjs` (patched-copy probes), `serve.mjs` (static server), `apply_patches.py` (the pack), `patched/` (scratch copy, hooks-free), `patched_t/` (with test hooks), screenshots `m*_*.png` (live) and `pt*_*.png` (patched), `pO.js` (extracted mobile component for grep), `min_segments.txt`/`min_tools.txt` (minified anchors).

---

## Appendix B — `apply_patches.py` (verbatim)

```python
#!/usr/bin/env python3
"""
Mobile hot-fix patch pack (app-mobile specialist). Operates ONLY on a scratch COPY of the deployed tree.
Usage: python apply_patches.py <src_tree_copy_dir>
Every find-string is asserted to occur EXACTLY ONCE in assets/index-Cg8FAMXN.js (or index.html) before replacing.
"""
import sys, os

root = sys.argv[1]
JS = os.path.join(root, 'assets', 'index-Cg8FAMXN.js')
HTML = os.path.join(root, 'index.html')
js = open(JS, encoding='utf8').read()
html = open(HTML, encoding='utf8').read()
log = []


def rep(tag, find, new, text_name='js', count=1):
    global js, html
    t = js if text_name == 'js' else html
    n = t.count(find)
    if n != count:
        raise SystemExit('[%s] expected %d match(es), found %d: %r' % (tag, count, n, find[:90]))
    t = t.replace(find, new)
    if text_name == 'js':
        js = t
    else:
        html = t
    log.append(tag)


# ---- HF-1  gate desktop-only overlays in Mobile layout (C1, C2, H1 partial)
rep('HF-1a AO gate desktop overlays',
    'P&&V.jsx(FF,{onClose:Ie}),M&&V.jsx(OF,{onClose:Se}),V.jsx(VF,{}),H&&V.jsx(WF,{}),V.jsx(CF,{}),V.jsx(LF,{}),V.jsx(_F,{}),V.jsx(IO,{}),V.jsx(KF,{mapRef:Nn,showMonuments:sn}),Yn&&V.jsx(Zk,{onClose:()=>hi(!1),mapRef:Nn}),V.jsx(XF,{mapRef:Nn}),V.jsx(iO,{containerRef:wi}),V.jsx(nO,{}),V.jsx(yO,{}),Pn&&V.jsx(Yk,{onClose:()=>ki(!1)}),lo&&V.jsx(Xk,{onClose:()=>Br(!1)}),_a&&V.jsx(Jk,{onClose:()=>vi(!1)}),V.jsx(qF,{}),',
    'Zn!=="mobile"&&V.jsxs(V.Fragment,{children:[P&&V.jsx(FF,{onClose:Ie}),M&&V.jsx(OF,{onClose:Se}),V.jsx(VF,{}),H&&V.jsx(WF,{}),V.jsx(CF,{}),V.jsx(LF,{}),V.jsx(_F,{}),V.jsx(IO,{}),V.jsx(KF,{mapRef:Nn,showMonuments:sn}),V.jsx(XF,{mapRef:Nn}),V.jsx(iO,{containerRef:wi}),V.jsx(nO,{}),V.jsx(yO,{}),V.jsx(qF,{})]}),Yn&&V.jsx(Zk,{onClose:()=>hi(!1),mapRef:Nn}),Pn&&V.jsx(Yk,{onClose:()=>ki(!1)}),lo&&V.jsx(Xk,{onClose:()=>Br(!1)}),_a&&V.jsx(Jk,{onClose:()=>vi(!1)}),')
rep('HF-1b AO gate desktop unit panel', 'V.jsx(MF,{})]})}function Vs(', 'Zn!=="mobile"&&V.jsx(MF,{})]})}function Vs(')

# ---- HF-2  re-home search/filter/story/event/toasts INSIDE the mobile root
rep('HF-2 rehome panels in pO',
    'vn&&V.jsx(Jk,{onClose:()=>er(!1)}),Ci&&V.jsx(Xk,{onClose:()=>yi(!1)})',
    'V.jsxs("div",{className:"gtbg-mp-top",children:[kt&&V.jsx(FF,{onClose:xe}),pe&&V.jsx(OF,{onClose:Pe})]}),V.jsxs("div",{className:"gtbg-mp-toast",children:[V.jsx(qF,{})]}),V.jsxs("div",{className:"gtbg-mp-story",children:[V.jsx(CF,{}),V.jsx(LF,{})]}),vn&&V.jsx(Jk,{onClose:()=>er(!1)}),Ci&&V.jsx(Xk,{onClose:()=>yi(!1)})')

# ---- HF-3  overlay canvas must not swallow map gestures (pan/zoom/tap)  [mobile + desktop]
rep('HF-3a mobile overlay canvas -> pointer-events:none + map click',
    'bn.style.cssText="position:absolute;inset:0;pointer-events:auto;z-index:10;width:100%;height:100%;touch-action:none;",bn.width=Yn.current.clientWidth,bn.height=Yn.current.clientHeight,bn.addEventListener("click",ya),bn.addEventListener("touchend",nr=>{nr.preventDefault(),ya(nr)},{passive:!1}),Yn.current.appendChild(bn),hi.current=bn,bn.addEventListener("click",nr=>{if(!ki.current)return;const Vi=bn.getBoundingClientRect(),Xr=nr.clientX-Vi.left,uo=nr.clientY-Vi.top,bo=$t.unproject([Xr,uo]);',
    'bn.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:10;width:100%;height:100%;",bn.width=Yn.current.clientWidth,bn.height=Yn.current.clientHeight,Yn.current.appendChild(bn),hi.current=bn,$t.on("click",nr=>{if(!ki.current)return;const bo=nr.lngLat;')
rep('HF-3b desktop overlay canvas pointer-events:none',
    'canvas:{position:"absolute",inset:0,pointerEvents:"auto",cursor:"crosshair",zIndex:10}',
    'canvas:{position:"absolute",inset:0,pointerEvents:"none",cursor:"crosshair",zIndex:10}')
rep('HF-3c desktop map click handler',
    'Xe.on("load",()=>{M.current=Xe,he(Xe),c&&c(M,f),T4(Xe),',
    'Xe.on("click",ev=>{const cv=x.current;if(!cv)return;const r=cv.getBoundingClientRect(),e={target:cv,clientX:ev.point.x+r.left,clientY:ev.point.y+r.top};if(window.__gtbgApp&&window.__gtbgApp._gbDist&&window.__gtbgApp._gbDist(e))return;ht(e)}),Xe.on("load",()=>{M.current=Xe,he(Xe),c&&c(M,f),T4(Xe),')

# ---- HF-4  mobile map options: bounds, no rotate, compact attribution (Mapbox ToS)
rep('HF-4 mobile map options',
    'attributionControl:!1});return $t.on("load",()=>{Pn.current=$t;',
    'attributionControl:!1,maxBounds:[[-77.36,39.72],[-77.12,39.91]]});$t.touchZoomRotate.disableRotation(),$t.dragRotate.disable(),$t.addControl(new z_.AttributionControl({compact:!0}),"top-right");return $t.on("load",()=>{Pn.current=$t;')

# ---- HF-5  layout auto-detect + session override + html[data-layout]
rep('HF-5a layout init',
    '[Zn,Dt]=pt.useState(null)',
    '[Zn,Dt]=pt.useState(()=>{try{var q=new URLSearchParams(location.search).get("layout"),s=sessionStorage.getItem("gtbg_layout");q=q||s;if(q==="mobile"||q==="desktop")return q}catch(e){}try{return matchMedia("(max-width: 820px) and (pointer: coarse)").matches?"mobile":"desktop"}catch(e){return"desktop"}})')
rep('HF-5b layout attr effect',
    'pt.useEffect(()=>{sF(yn.getState,yn.setState)},[])',
    'pt.useEffect(()=>{sF(yn.getState,yn.setState)},[]),pt.useEffect(()=>{document.documentElement.setAttribute("data-layout",Zn||"")},[Zn])')
rep('HF-5c pO props wiring',
    'V.jsx(pO,{onSwitchToDesktop:()=>Dt("desktop")})',
    'V.jsx(pO,{onSwitchToDesktop:()=>{try{sessionStorage.setItem("gtbg_layout","desktop")}catch(e){}Dt("desktop")},onHelp:()=>pe(!0),onBookmarks:()=>ht(!0),onLayers:()=>It(!0),onWalkthrough:()=>Ut(!0)})')
rep('HF-5d pO signature', 'function pO({onSwitchToDesktop:c}){', 'function pO({onSwitchToDesktop:c,onHelp:oH,onBookmarks:oB,onLayers:oL,onWalkthrough:oW}){')

# ---- HF-6  Tools sheet: wire dead tiles, add Walkthrough/Historian/Extra Features, scroll, icon colour, grid
rep('HF-6a drop dead Monuments tile', '{icon:"\U0001f5ff",label:"Monuments",action:()=>{pi(!An),vi(!1)}},', '')
rep('HF-6b NPS tour tile -> Virtual Walkthrough', '{icon:"\U0001f396",label:"NPS Auto Tour",action:()=>{Dt(!0),vi(!1)}},',
    '{icon:"\U0001f5fa",label:"Virtual Walkthrough",action:()=>{oW&&oW(),vi(!1)}},')
rep('HF-6c layers', 'action:()=>{Br("layers"),vi(!1)}', 'action:()=>{oL&&oL(),vi(!1)}')
rep('HF-6d bookmarks', 'action:()=>{Br("bookmarks"),vi(!1)}', 'action:()=>{oB&&oB(),vi(!1)}')
rep('HF-6e help', 'action:()=>{Br("help"),vi(!1)}', 'action:()=>{oH&&oH(),vi(!1)}')
rep('HF-6f historian tile + desktop view',
    '{icon:"\U0001f5a5",label:"Desktop View",action:()=>{c(),vi(!1)}}',
    '{icon:"\U0001f4ac",label:"Ask the Historian",action:()=>{location.href="/historian.html"}},{icon:"\U0001f5a5",label:"Desktop View",action:()=>{c(),vi(!1)}}')
rep('HF-6g append Extra Features groups to sheet',
    '].map(({icon:$t,label:bn,action:ai})=>V.jsxs("button",{style:tn.toolBtn,onClick:ai,children:[V.jsx("span",{style:tn.toolIcon,children:$t}),V.jsx("span",{style:tn.toolLabel,children:bn})]},bn))})',
    '].map(({icon:$t,label:bn,action:ai})=>V.jsxs("button",{style:tn.toolBtn,onClick:ai,children:[V.jsx("span",{style:tn.toolIcon,children:$t}),V.jsx("span",{style:tn.toolLabel,children:bn})]},bn)).concat([V.jsx("div",{key:"__more",className:"gtbg-mp-more",style:{gridColumn:"1 / -1"},dangerouslySetInnerHTML:{__html:window.GTBG_MENU?"<div class=\\"gtbg-mp-more-h\\">More tools</div>"+window.GTBG_MENU.buildGroupsHtml(null):""}})])})')
rep('HF-6h grid', 'toolsGrid:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:2,padding:"10px"}',
    'toolsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:6,padding:"10px",overflowY:"auto",overscrollBehavior:"contain",flex:"1 1 auto",minHeight:0}')
rep('HF-6i panel', 'toolsPanel:{width:"100%",background:"rgba(5,5,12,0.98)",borderTop:"2px solid #8b6914",borderRadius:"14px 14px 0 0",paddingBottom:"env(safe-area-inset-bottom, 16px)"}',
    'toolsPanel:{width:"100%",maxHeight:"88dvh",display:"flex",flexDirection:"column",background:"rgba(5,5,12,0.98)",borderTop:"2px solid #8b6914",borderRadius:"14px 14px 0 0",paddingBottom:"env(safe-area-inset-bottom, 16px)"}')
rep('HF-6j icon colour (was default black on dark)', 'toolIcon:{fontSize:22,lineHeight:1}', 'toolIcon:{fontSize:22,lineHeight:1,color:"#e8d5a3"}')
rep('HF-6k label size/contrast', 'toolLabel:{fontSize:10,color:"#aaa"', 'toolLabel:{fontSize:12,color:"#cfd2dc"')
rep('HF-6l close label+target', 'style:tn.toolsClose,onClick:()=>vi(!1),', 'style:{...tn.toolsClose,minWidth:44,minHeight:44,color:"#a9adb8"},"aria-label":"Close tools",onClick:()=>vi(!1),')

rep('HF-6m walkthrough (mobile branch) map container never initialised: missing id', 'V.jsx("div",{ref:P,style:kr.map})', 'V.jsx("div",{ref:P,id:"gtbg-wt-map",style:kr.map})')

# ---- HF-7  transport: labels, glyphs, contrast, targets
rep('HF-7a step back', 'V.jsx("button",{style:tn.ctrlBtn,onClick:xi,children:"◀"})',
    'V.jsx("button",{style:{...tn.ctrlBtn,fontSize:30,paddingBottom:4},onClick:xi,"aria-label":"Step back 5 minutes",title:"Step back 5 minutes",children:"‹"})')
rep('HF-7b step fwd', 'V.jsx("button",{style:tn.ctrlBtn,onClick:va,children:"▶"})',
    'V.jsx("button",{style:{...tn.ctrlBtn,fontSize:30,paddingBottom:4},onClick:va,"aria-label":"Step forward 5 minutes",title:"Step forward 5 minutes",children:"›"})')
rep('HF-7c play', 'V.jsx("button",{style:{...tn.ctrlBtn,...tn.playBtn},onClick:ls,children:x?"⏸":"▶"})',
    'V.jsx("button",{style:{...tn.ctrlBtn,...tn.playBtn},onClick:ls,"aria-label":x?"Pause":"Play",children:x?"⏸":"▶"})')
rep('HF-7d speed', 'V.jsxs("button",{style:tn.speedBtn,onClick:ii,children:[M,"×"]})',
    'V.jsxs("button",{style:tn.speedBtn,onClick:ii,"aria-label":"Playback speed "+M+" times. Tap to change.",children:[M,"×"]})')
rep('HF-7e tickInfo', 'tickInfo:{fontSize:10,color:"#444"', 'tickInfo:{fontSize:12,color:"#a9adb8"')
rep('HF-7f clockDay', 'clockDay:{fontSize:10,color:"#8b6914"', 'clockDay:{fontSize:12,color:"#c9a24b"')
rep('HF-7g day tab', 'color:"#666",fontSize:13,fontFamily:"sans-serif",cursor:"pointer",letterSpacing:1,minHeight:42', 'color:"#a9adb8",fontSize:13,fontFamily:"sans-serif",cursor:"pointer",letterSpacing:1,minHeight:44')
rep('HF-7h legend offset (clear Mapbox logo)', 'miniLegend:{position:"absolute",bottom:150,left:10', 'miniLegend:{position:"absolute",bottom:"calc(var(--gt-dock) + var(--gt-sab) + 32px)",left:10')
rep('HF-7i minimap offset', 'minimapBox:{position:"absolute",bottom:150,right:10', 'minimapBox:{position:"absolute",bottom:"calc(var(--gt-dock) + var(--gt-sab) + 32px)",right:10')


rep('HF-7j unit popup close target', 'popupClose:{position:"absolute",top:10,right:12,background:"none",border:"none",color:"#666",fontSize:20,cursor:"pointer"}',
    'popupClose:{position:"absolute",top:2,right:2,width:44,height:44,background:"none",border:"none",color:"#a9adb8",fontSize:20,cursor:"pointer"}')
rep('HF-7k unit popup name padding', 'paddingRight:24', 'paddingRight:44')

# ---- HF-8  safe-area / dvh via CSS variables (defined in index.html)
rep('HF-8a root', 'zIndex:100,overflow:"hidden",touchAction:"none"', 'zIndex:100,overflow:"hidden",touchAction:"none",overscrollBehavior:"none"')
rep('HF-8b map box', 'map:{position:"absolute",top:94,left:0,right:0,bottom:140,zIndex:1}',
    'map:{position:"absolute",top:"calc(var(--gt-hdr) + var(--gt-tabs) + var(--gt-sat))",left:0,right:0,bottom:"calc(var(--gt-dock) + var(--gt-sab))",zIndex:1}')
rep('HF-8c topBar', 'topBar:{position:"fixed",top:0,left:0,right:0,height:52,', 'topBar:{position:"fixed",top:0,left:0,right:0,height:"calc(var(--gt-hdr) + var(--gt-sat))",paddingTop:"var(--gt-sat)",')
rep('HF-8d dayTabs top', 'dayTabs:{position:"fixed",top:52,', 'dayTabs:{position:"fixed",top:"calc(var(--gt-hdr) + var(--gt-sat))",')
rep('HF-8e bottomBar', 'bottomBar:{position:"fixed",bottom:0,left:0,right:0,height:140,', 'bottomBar:{position:"fixed",bottom:0,left:0,right:0,height:"calc(var(--gt-dock) + var(--gt-sab))",')
rep('HF-8f unitPopup', 'unitPopup:{position:"fixed",bottom:140,left:12,right:12,', 'unitPopup:{position:"fixed",bottom:"calc(var(--gt-dock) + var(--gt-sab) + 8px)",left:12,right:12,')

# ---- HF-9  class hooks for CSS (landscape etc.)
rep('HF-9a root/map', 'return V.jsxs("div",{style:tn.root,children:[V.jsx("div",{ref:Yn,style:tn.map})', 'return V.jsxs("div",{className:"gtbg-m-root",style:tn.root,children:[V.jsx("div",{className:"gtbg-m-map",ref:Yn,style:tn.map})')
rep('HF-9b top', 'V.jsxs("div",{style:tn.topBar,children:[', 'V.jsxs("div",{className:"gtbg-m-top",style:tn.topBar,children:[')
rep('HF-9c days', 'V.jsx("div",{style:tn.dayTabs,children:', 'V.jsx("div",{className:"gtbg-m-days",style:tn.dayTabs,children:')
rep('HF-9d dock', 'V.jsxs("div",{style:tn.bottomBar,children:[', 'V.jsxs("div",{className:"gtbg-m-dock",style:tn.bottomBar,children:[')
rep('HF-9e scrub', 'V.jsxs("div",{style:tn.scrubTrack,onTouchStart', 'V.jsxs("div",{className:"gtbg-m-scrub",style:tn.scrubTrack,onTouchStart')
rep('HF-9f play', 'V.jsxs("div",{style:tn.playRow,children:[', 'V.jsxs("div",{className:"gtbg-m-play",style:tn.playRow,children:[')
rep('HF-9g minimap', 'V.jsxs("div",{style:tn.minimapBox,children:[', 'V.jsxs("div",{className:"gtbg-m-mini",style:tn.minimapBox,children:[')
rep('HF-9h legend', 'V.jsx("div",{style:tn.miniLegend,children:', 'V.jsx("div",{className:"gtbg-m-legend",style:tn.miniLegend,children:')
rep('HF-9i tools panel', 'V.jsxs("div",{style:tn.toolsPanel,onClick:', 'V.jsxs("div",{className:"gtbg-m-toolspanel",style:tn.toolsPanel,onClick:')

# ---- HF-10 splash: clipping, skip target, returning-visitor fast path
rep('HF-10a title', 'appName:{fontSize:52,fontWeight:"bold",color:"#e8d5a3",fontFamily:"Georgia,serif",letterSpacing:8',
    'appName:{fontSize:"clamp(32px,11vw,52px)",fontWeight:"bold",color:"#e8d5a3",fontFamily:"Georgia,serif",letterSpacing:"clamp(3px,1.6vw,8px)"')
rep('HF-10b track', 'progressTrack:{width:320,', 'progressTrack:{width:"min(320px,80vw)",')
rep('HF-10c labels', 'dayLabels:{display:"flex",justifyContent:"space-between",width:320,', 'dayLabels:{display:"flex",justifyContent:"space-between",width:"min(320px,80vw)",')
rep('HF-10d content', 'content:{position:"relative",textAlign:"center",zIndex:1}', 'content:{position:"relative",textAlign:"center",zIndex:1,padding:"0 16px",maxWidth:"100%"}')
rep('HF-10e subtitle', 'subtitle:{fontSize:14,color:"#8b6914",fontFamily:"sans-serif",letterSpacing:3,marginBottom:32', 'subtitle:{fontSize:"clamp(12px,3.4vw,14px)",color:"#c9a24b",fontFamily:"sans-serif",letterSpacing:2,marginBottom:32')
rep('HF-10f skip', 'skip:{marginTop:32,fontSize:11,color:"#444",cursor:"pointer",fontFamily:"sans-serif",letterSpacing:1}',
    'skip:{marginTop:24,fontSize:14,color:"#a9adb8",cursor:"pointer",fontFamily:"sans-serif",letterSpacing:1,minHeight:44,minWidth:44,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 20px"}')
rep('HF-10g fast path', 'x("playing"),l.current=performance.now(),Se()},800)',
    '{try{if(localStorage.getItem("gtbg_seen")==="1"){x("done"),c();return}localStorage.setItem("gtbg_seen","1")}catch(e){}x("playing"),l.current=performance.now(),Se()}},250)')
rep('HF-10h shorter ff', 'eO=3500', 'eO=1800')

# ---- HF-11 onboarding tour: no keyboard path / keyboard copy on touch
rep('HF-11a hide Power User on touch', 'children:xO.map(Ie=>', 'children:xO.filter(Ie=>!(Ie.id==="power"&&matchMedia("(pointer: coarse)").matches)).map(Ie=>')
rep('HF-11b touch copy', 'action:"Press Space or click Play to begin."', 'action:matchMedia("(pointer: coarse)").matches?"Tap Play at the bottom to begin.":"Press Space or click Play to begin."')

rep('HF-11c tour skip target/contrast', 'skipBtn:{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12,fontFamily:"sans-serif"}',
    'skipBtn:{background:"none",border:"none",color:"#a9adb8",cursor:"pointer",fontSize:14,fontFamily:"sans-serif",minHeight:44,minWidth:44,padding:"0 16px"}')
rep('HF-11d tour hero contrast', 'heroText:{fontSize:13,color:"#777",marginBottom:28}', 'heroText:{fontSize:13,color:"#a9adb8",marginBottom:28}')

# ---- index.html
rep('HF-12a viewport', '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n  <meta name="color-scheme" content="dark" />\n  <meta name="mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />', 'html')
rep('HF-12b mapbox !important height', '''    .mapboxgl-map,
    .mapboxgl-canvas-container,
    .mapboxgl-canvas {
      width: 100% !important;
      height: 100% !important;
    }''', '''    .mapboxgl-canvas-container,
    .mapboxgl-canvas {
      width: 100% !important;
      height: 100% !important;
    }''', 'html')
CSS = r'''
    /* ===== mobile hot-fix (app-mobile) ===== */
    :root {
      --gt-sat: env(safe-area-inset-top, 0px);
      --gt-sab: env(safe-area-inset-bottom, 0px);
      --gt-sal: env(safe-area-inset-left, 0px);
      --gt-sar: env(safe-area-inset-right, 0px);
      --gt-hdr: 52px; --gt-tabs: 42px; --gt-dock: 140px;
    }
    html { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
    html[data-layout="mobile"] #extra-features { display: none !important; }
    .gtbg-m-root { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    .gtbg-m-top { padding-left: max(14px, var(--gt-sal)) !important; padding-right: max(14px, var(--gt-sar)) !important; }
    .gtbg-m-dock { padding-left: var(--gt-sal); padding-right: var(--gt-sar); }
    .gtbg-m-scrub { touch-action: none; }
    .gtbg-m-play { gap: clamp(6px, 2.4vw, 14px) !important; padding-left: 12px !important; padding-right: 12px !important; }
    .gtbg-m-play > button { flex-shrink: 0; }
    /* re-homed desktop panels (search/filter/story/event/toasts) */
    .gtbg-mp-top { display: contents; }
    .gtbg-mp-top > div { position: fixed !important; left: max(8px, var(--gt-sal)) !important; right: max(8px, var(--gt-sar)) !important; top: calc(var(--gt-sat) + 8px) !important; bottom: auto !important; width: auto !important; max-width: none !important; transform: none !important; z-index: 450 !important; max-height: calc(100dvh - 24px - var(--gt-sat)) !important; }
    .gtbg-mp-story { position: fixed; left: max(8px, var(--gt-sal)); right: max(8px, var(--gt-sar)); bottom: calc(var(--gt-dock) + var(--gt-sab) + 8px); z-index: 260; display: flex; flex-direction: column-reverse; gap: 8px; max-height: 46dvh; overflow: hidden; pointer-events: none; }
    .gtbg-mp-story > div { position: static !important; width: auto !important; max-width: none !important; transform: none !important; max-height: 34dvh !important; pointer-events: auto; overflow-y: auto; }
    .gtbg-mp-toast { position: fixed; left: max(8px, var(--gt-sal)); right: max(8px, var(--gt-sar)); top: calc(var(--gt-hdr) + var(--gt-tabs) + var(--gt-sat) + 8px); z-index: 270; pointer-events: none; }
    .gtbg-mp-toast > div { position: static !important; max-width: none !important; }
    .gtbg-mp-story button, .gtbg-mp-top button, .gtbg-mp-toast button { min-width: 44px; min-height: 44px; }
    .mapboxgl-ctrl-attrib-button { width: 44px !important; height: 44px !important; }
    /* Extra Features groups inside the Tools sheet */
    .gtbg-mp-more-h { font: 700 12px/1 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #c9a24b; padding: 14px 4px 8px; }
    .gtbg-mp-more .gtbg-item { min-height: 48px; }
    .gtbg-mp-more .gtbg-item-desc, .gtbg-mp-more .gtbg-group-why { font-size: 12px; color: #a9b1c4; }
    /* phone landscape: give the map its height back */
    @media (orientation: landscape) and (max-height: 480px) {
      :root { --gt-hdr: 48px; --gt-tabs: 0px; --gt-dock: 60px; }
      html[data-layout="mobile"] .gtbg-m-days { display: none !important; }
      html[data-layout="mobile"] .gtbg-m-dock { flex-direction: row !important; align-items: center !important; border-top-width: 1px !important; }
      html[data-layout="mobile"] .gtbg-m-scrub { flex: 1 1 auto !important; order: 2; margin: 0 12px; border: 0 !important; background: rgba(255,255,255,.08) !important; border-radius: 22px; height: 44px !important; }
      html[data-layout="mobile"] .gtbg-m-play { order: 1; padding: 0 0 0 12px !important; gap: 8px !important; }
      html[data-layout="mobile"] .gtbg-m-play > button { width: 44px !important; height: 44px !important; min-height: 44px !important; padding: 0 !important; font-size: 22px !important; }
      html[data-layout="mobile"] .gtbg-m-play > button:nth-child(2) { width: 48px !important; height: 48px !important; }
      html[data-layout="mobile"] .gtbg-m-play > div { display: none !important; }
      html[data-layout="mobile"] .gtbg-m-mini { display: none !important; }
      html[data-layout="mobile"] .gtbg-m-toolspanel { max-width: min(440px, 50vw) !important; margin-left: auto; border-radius: 14px 0 0 0 !important; height: 100dvh !important; max-height: 100dvh !important; }
      .gtbg-mp-story { max-height: 50dvh; bottom: calc(var(--gt-dock) + var(--gt-sab) + 8px); left: auto; width: min(420px, 52vw); }
    }
'''
rep('HF-12c css', '    /* Splash: renders from HTML so FCP fires at parse time', CSS + '\n    /* Splash: renders from HTML so FCP fires at parse time', 'html')

# ---- HF-13  DEPLOY TRAP: /assets/* is `immutable, max-age=31536000` AND sw.js serves /assets/* cache-first, so a patched
#      bundle under the SAME filename would never reach returning visitors. Ship it under a NEW name, bump the SW cache.
NEW_NAME = 'index-mHF1a.js'
rep('HF-13a index.html modulepreload', '<link rel="modulepreload" href="/assets/index-Cg8FAMXN.js" crossorigin />', '<link rel="modulepreload" href="/assets/%s" crossorigin />' % NEW_NAME, 'html')
rep('HF-13b index.html script', '<script type="module" crossorigin src="/assets/index-Cg8FAMXN.js"></script>', '<script type="module" crossorigin src="/assets/%s"></script>' % NEW_NAME, 'html')
SW = os.path.join(root, 'sw.js')
sw = open(SW, encoding='utf8').read()
assert sw.count("const CACHE_NAME = 'gbg-v5';") == 1 and sw.count("'/assets/index-Cg8FAMXN.js',") == 1
sw = sw.replace("const CACHE_NAME = 'gbg-v5';", "const CACHE_NAME = 'gbg-v6-hf1';").replace("'/assets/index-Cg8FAMXN.js',", "'/assets/%s'," % NEW_NAME)
open(SW, 'w', encoding='utf8').write(sw)
log.append('HF-13c sw.js cache bump + precache rename')
open(os.path.join(root, 'assets', NEW_NAME), 'w', encoding='utf8').write(js)   # original index-Cg8FAMXN.js is left untouched
open(HTML, 'w', encoding='utf8').write(html)
print('applied', len(log), 'patches; new bundle assets/' + NEW_NAME)

```


---

## Verification (adversarial verifier, 2026-09-30)

Method: re-opened every cited bundle.pretty.js range, index.html, sw.js, manifest.json, netlify.toml, RECON_SRC and the archived deploys; re-ran live probes (headless Chrome 153 over CDP against the production site, my own scripts in `tmp-verify-app-mobile/`; the shared Browser pane and Chrome extension were not used); curl against Mapbox and the live site; re-applied `apply_patches.py` to a fresh copy of SRC_DIR (68 patches applied, `node --check` OK, output bundle is md5-identical to the specialist's `tmp-app-mobile/patched/assets/index-mHF1a.js`) and re-ran gesture, hit-test and Tools probes on it (map rect [0,94,375,578]; swipe moved centre (-77.235,39.812) to (-77.2165,39.80845); pinch z13 to 14.82; all 4 transport buttons hit-test true; 14 Tools tiles reachable). Nothing outside `plan-work/tmp-verify-app-mobile/` and this section was modified.

**Headline: the diagnosis is right and most evidence is real, but the Phase-0 patch pack as written is NOT safe to ship.** Opening Help or Bookmarks in the patched build blanks the whole app (MISSED-1), and three other defects sit in the pack (MISSED-2, -3, -4). Tags: [LIVE] production, [SCRATCH] patched copy, [STATIC] code reading.

### Verdict table

| ID | Verdict | Evidence / correction |
|---|---|---|
| mobile-01 | CONFIRMED | [LIVE] IO rect [0,685,375,127]; controls rows scrollWidth 574 / clientWidth 343, nowrap; `elementFromPoint` at the centre of all 4 mobile buttons returns `INPUT:range`; Tools tiles NPS/Legend/Bookmarks/Help/Mini Map/Desktop View unreachable (hit IO or the NPS launcher). [STATIC] BP:113249 `V.jsx(IO,{})` ungated, `Po.wrap` z100 (112375-112387) ties `tn.root` z100 (103699-103706), IO body has no mobile branch (112202+). |
| mobile-02 | CONFIRMED (3 nuances) | [LIVE] desktop 1440x900: overlay canvas (pe:auto, z10) got 16 mousemove / 2 mousedown / 1 wheel / 2 click, `.mapboxgl-canvas-container` got 0; drag, wheel and a click on the NavigationControl zoom-in button (hit-test returns CANVAS) all leave centre/zoom at -77.235/39.812/13.5. Mobile 375x812: overlay got pointerdown 1 / touchstart 1 / touchmove 12 / touchend 1, container 0, centre unchanged. `ya` reads `touches[0]` at touchend (BP:103076-103108), giving NaN as stated. Nuances: (a) `k4()` (BP:9909-9982) is not observe-only: on the desktop overlay it does tap-to-select from `changedTouches`, so touch taps DO select on the desktop layout today; HF-3b makes those listeners inert (only the touch-indicator ring is lost; map `click` replaces selection). (b) "same string in every archived bundle Jun 13-Sep 29": the desktop `pointerEvents:"auto",cursor:"crosshair"` string is in the Jun 13 bundle and every Jul 20-folder bundle; the mobile overlay string only exists in builds that have the mobile shell (the Jun 13 bundle contains no "Select Mobile"). (c) The current entry (Cg8FAMXN, 2,280,438 B) is already in the Jul 20 folder and the Aug 29 / Sep 9 zips, so the JS has not changed since Jul 20 or earlier. |
| mobile-03 | CONFIRMED | [LIVE] search input rect [-15,97,406,34]; `elementFromPoint` at its centre is the map overlay CANVAS; panel z95 (BP:98964-98966); CF 92, LF 85, VF/WF/_F 88, MF 92, tn.root 100 all match. |
| mobile-04 | CONFIRMED | [STATIC] `Zn` (NPS tour) declared and set, never read (pO body); `An` set only by the Monuments tile; `ht` (showMonuments) destructured and unused; `lo` handled only for "roster"/"legend"; `setMapRef` called only at BP:97222 (desktop gF); walkthrough mobile branch `V.jsx("div",{ref:P,style:kr.map})` has no id (BP:110767 reads `getElementById("gtbg-wt-map")`; id only at 111096); `_O` uses `f||gO()` so the branch is reachable from the Desktop layout at <=860 px. Caveat: HF-6c/6d turn two dead tiles into panels whose map actions are inert (MISSED-4). |
| mobile-05 | CORRECTED | Evidence confirmed: `[Zn,Dt]=useState(null)` BP:112949; no `matchMedia` in app code (>95500); chooser title at y=-78 @667x375 and y=-92 @320x568 with `overflow:hidden` [LIVE]. Correction: the shipped fix HF-5a (`max-width:820px and pointer:coarse`, evaluated once in a `useState` initialiser) sends phones in landscape wider than 820 px to the desktop layout (MISSED-2). The acceptance text uses `data-layout=compact\|full` but HF-5b writes `mobile\|desktop`. |
| mobile-06 | CONFIRMED | [LIVE] splash title x=-47 w=469 @375 (x=-74 @320), 52px/8px; `eO=3500` (BP:101471), 800 ms (101486), 600 ms (101503), skip 11px #444 (2.09:1); `xO` has id "power" (111813). Note HF-11b only rewrites the first tour hint; steps 2-5 ("Scroll the map", "Press S", "Press 3", BP:111825-111860) stay keyboard copy, so the mobile-26 acceptance regex cannot pass after Phase 0. |
| mobile-07 | CONFIRMED | [LIVE] `.mapboxgl-map` = [0,94,375,812] (should be 578); centre offset 500 vs 383 = 117 px. [SCRATCH] after HF-12b: [0,94,375,578]. index.html:73-78. |
| mobile-08 | CORRECTED (scope) | Arithmetic confirmed: 52+42+140 = 234 px chrome gives a 141 px map @375 tall and 86 @320; Tools panel is 375 px, bottom-anchored, so top = -55 @320 tall (toolsPanel has no maxHeight, BP:104041-104047). Correction: `manifest.orientation` only applies to an installed standalone PWA, not a browser tab, so it is not what makes short viewports common in ordinary use; and HF-12c's landscape CSS is keyed to `html[data-layout=mobile]`, which phones >=821 px wide never get (MISSED-2). |
| mobile-09 | CONFIRMED | BP:9371-9383 (tick 31 = 6:00 + 150 min = 8:30 AM); `July ${l+2}` at 97428; `July ${f+2}` at 100836-100842 and 100998-101006. |
| mobile-10 | CONFIRMED | [LIVE] `#extra-features.gtbg-visible` (z999999) is the element at (300,400) in the mobile layout and swallowed my first swipe; index.html:176-206. |
| mobile-11 | CONFIRMED | Recomputed WCAG ratios: #444 2.09-2.11, #555 2.73, #666 3.54-3.58, #8b6914 4.04, #777 4.55, #aaa 8.75, #888 5.80; token set 17.50 / 12.67 / 9.05 / 6.53 / 9.98 / 7.23 / 7.33 / 7.56 / 6.56 / 10.48 on #05050c, and ink-4/critical/confed/union/gold-dim all >= 5.8 on #151524. Minor: black `toolIcon` is 1.03 on #05050c (1.10 is on the tile fill); `#aaa` is 8.75 not 8.2 (background dependent). |
| mobile-12 | CORRECTED (minor) | `scrubTrack` spans the full 375 px (bottomBar has no horizontal padding), which is what the report's own taps imply (x=17 gives tick 31; 20 to 200 gives tick 360 = 200/375*675). So 675/375 = 1.8 ticks/px (9 sim-min/px), not "1.97 (=675/343)"; 343 is the desktop IO row width. Everything else (touch-only, 36 px, pointer-events:none dots, no ARIA) confirmed at BP:103178-103214. |
| mobile-13 | CORRECTED | Evidence confirmed (index.html:5 viewport; `vh` at BP:98116, 98424, 98966, 99290, 103619, 103914; env() at 103779, 103921, 104046). But HF-8c is broken on notched phones: it inserts `paddingTop:"var(--gt-sat)"` BEFORE the existing `padding:"0 14px"` shorthand, so the shorthand wins. [SCRATCH, CDP `Emulation.setSafeAreaInsetsOverride` top 47 / bottom 34]: topBar height 99 but computed `padding-top: 0px`; clock text spans y=31..67, overlapping the 0-47 status/notch band. Bottom is fine (dock 174 px, padding-bottom 34, Play bottom 68 px above the edge). Made worse by HF-12a's `black-translucent` standalone meta (MISSED-3). |
| mobile-14 | CONFIRMED | [STATIC] no `pushState/popstate/replaceState` in app code (>95500); `Ur.target.tagName==="INPUT"` early return BP:112967-112968; `tn.root` touchAction none 103705. |
| mobile-15 | CORRECTED (2 details) | Confirmed: no `devicePixelRatio`, `maxTileCacheSize`, `fadeDuration`, `performanceMetricsCollection`, `webglcontextlost` in app code; `lS` reads `getBoundingClientRect()` per frame (BP:96510) and runs the 8-pass O(n^2) declutter (96558-96581); `pO` calls `yn()` with no selector and scans 100 ticks (103124-103127); overlay backing store is CSS px; maps:1 at the chooser [LIVE]. Corrections: (4) `KF`'s rAF loop only calls `setState` when `mapRef.current` is non-null (BP:100845-100870: `if(!kt){rAF;return}`), so on mobile it is an idle rAF poll; the every-frame `setState({fresh object})` plus `project()` of all monuments is a DESKTOP cost (worth fixing there). (3) "two 467-entry sorts" is two sorts over the U- and C- partitions that total 467. |
| mobile-16 | CORRECTED (minor) | No `aria-label`, `role`, `aria-live`, `aria-modal` in app code outside Mapbox internals: confirmed. "No prefers-reduced-motion in app code" is true for the React code, but index.html has three reduced-motion blocks (lines 139, 206, 252) and Mapbox honours it internally (BP:11447). |
| mobile-17 | CORRECTED (numbers) | `window.innerWidth<500/<560` sit inside module-level `const ji` / `const gp` objects (BP:98107-98115, 102705-102712): confirmed. Story+event size: [SCRATCH] 320x568 at tick 31 the `.gtbg-mp-story` box is 261 px (46 % of the viewport; panels 193+60 px), i.e. 78 % of the 334 px map; the report quotes 58 % (mobile-17, -23) and 42 % of the map (mobile-03); neither reproduces. The conclusion (too large) stands. |
| mobile-18 | CORRECTED | Manifest facts confirmed (orientation landscape, `purpose:"any maskable"` on both icons, no id/lang/scope/shortcuts, 2 screenshots 1280x720 without form_factor, #0a0a14 vs shell #050508). Acceptance invalid: Lighthouse 13.5 in `lh_mobile.json` only has performance/accessibility/best-practices/seo; there is no PWA/installability audit any more. Use CDP `Page.getInstallabilityErrors`, DevTools Application > Manifest, or PWABuilder. |
| mobile-19 | CORRECTED (critical) | Confirmed: `/assets/*` immutable (netlify.toml:23-25), `sw.js` `gbg-v5`, `/assets/*` cache-first (sw.js:41-50), index.html:55,282. NOT supported: the "case-mangled zip would 404" trap. [LIVE] `/assets/index-cg8famxn.js`, `/assets/INDEX-CG8FAMXN.JS`, `/ASSETS/index-Cg8FAMXN.js`, `/assets/bookmarkpanel-c5yt4b5k.js` all return 200 with identical sizes, so Netlify serves these paths case-insensitively (keep "start from SRC_DIR" as hygiene only). Fatal omission: HF-13 renames only the entry, while the lazy chunks import it by name (MISSED-1). |
| mobile-20 | CONFIRMED | curl reproduces exactly: tile 200 with Referer https://gettysburginteractivemap.com/, 403 for example.com, 127.0.0.1:8123, localhost:8123 and no Referer; the styles endpoint returns 200 for a foreign Referer and for none. |
| mobile-21 | CORRECTED (effort) | Facts confirmed (App.jsx 264 lines with no mobile branch, DeviceSelect 34, TimelineScrubber 70, MapView 82, mapbox-gl ^2.15.0). Effort L is optimistic: scope-aware renaming of ~17k lines of minified code whose 1-2 letter identifiers are reused with different meanings (for example `Zn` is layout state in AO but NPS-tour state in pO) plus a golden-master pixel harness is XL in practice (L only for a mechanical slice with renames deferred). |
| mobile-22 | CONFIRMED (spec arithmetic) | Recomputed section 5.2 from the stated formulas: control row 258.7 / 262.6 / 264.5 / 268 / 273.2 / 277.5 / 296 px, scrub 232 / 270 / 284 / 298 / 318 / 335 / 664, ticks/px 2.9 down to 1.0, map 416 / 660 px (73 / 81 %) and 335 / 579 with insets: all match. Design quality itself is not verifiable. |
| mobile-23 | CORRECTED | "Toasts never dismiss / never cleared on jump" is not supported by code: `qF` toasts are removed by `setTimeout(...,4500)` (BP:99888-99930) and are only created while playing (`if(!P\|\|!f) return`); `nO` commander toasts fade at 1.2 s and are removed at 3 s (BP:101679-101715); the story `CF` only lists vignettes for ticks c, c-1, c-2 (BP:98262-98272). The 4 s auto-dismiss chip is therefore already today's behaviour. The real H4 clutter is story/event/legend panels persisting after a paused jump. Percentage figure: see mobile-17. |
| mobile-24 | CONFIRMED | Rationale checks out statically (overlay canvas, per-frame layout, custom hit-test). XL effort and the prototype-behind-a-flag risk statement are appropriate. |
| mobile-25 | CORRECTED | Helper scripts exist (`cdp.mjs`, `lib3.mjs`, `probe*.mjs`, `pt*.mjs`). But the T0-T12 skeleton cannot run against the deployed bundle or the patch pack: it needs `data-testid` (play, step-back, step-fwd, prev-moment, next-moment, scrubber, speed, tools, search, map, unit-sheet), `window.__gtbg`, `role=dialog name=Tools`, `role=searchbox` and `data-layout=compact`; HF-9 adds only `gtbg-m-*` class hooks and HF-5b writes `mobile\|desktop`. Yet section 9 (Phase 1 gate) and the mobile-25 acceptance say the patched output passes the suite. Add a test-hook step (or rewrite selectors to the class hooks) before promising that gate. |
| mobile-26 | CONFIRMED | Strings at BP:102762, 102800, 102815, 101535, 101542, 101581, 97429 all present. |
| mobile-27 | CONFIRMED (code) | Non-numeric `localeCompare` sorts at BP:102346-102354 and 102674-102681; header counts from `R.length` / `he.length` (102404, 102424). The live 2,09x text-node and 7-9 px counts were not re-measured. |

### MISSED issues (in scope, not listed by the specialist)

1. **CRITICAL: HF-13 rename breaks Help and Bookmarks (blank page) on every layout.** `assets/HelpModal-CFV9T0zH.js` and `assets/BookmarkPanel-C5YT4b5k.js` start with `import{r as g,j as e,u as a}from"./index-Cg8FAMXN.js"` (shared React, jsx runtime and the zustand store live in the entry chunk). With the entry renamed to `index-mHF1a.js` and the old file kept "for one release", opening Help (desktop `?` or the mobile tile) or Bookmarks makes the browser fetch and evaluate the OLD entry as a second module graph. [SCRATCH, 3/3 runs: Help x2, Bookmarks x1] React error #321 plus `removeChild` NotFoundError, `#root` has 0 children, `innerText` is empty, and the request log shows `index-Cg8FAMXN.js` loaded right after `HelpModal-CFV9T0zH.js`. (The specialist's `pt8_help.png` shows Help open; that does not reproduce with the pack as written, so it was captured on a build where the entry name was unchanged.) Proven fix [SCRATCH]: rename all three files together and rewrite specifiers: `HelpModal-HF1a.js` and `BookmarkPanel-HF1a.js` with `from"./index-mHF1a.js"`, and in the entry replace `"./HelpModal-CFV9T0zH.js"` and `"./BookmarkPanel-C5YT4b5k.js"` (each occurs exactly once) with the new names; then Help and Bookmarks open with 0 exceptions and 0 requests to the old entry. New chunk names are also required because the SW caches `/assets/*` cache-first by name (returning visitors would keep the old chunk that imports the old entry). Add as HF-13d/e/f in `apply_patches.py` and make the exit gate "open Help, Bookmarks and Walkthrough on both layouts, 0 console errors". Effort S.
2. **HIGH: HF-5a auto-detect sends landscape phones to the desktop layout and never re-evaluates.** [SCRATCH] `matchMedia("(max-width: 820px) and (pointer: coarse)")`: 812x375 gives mobile, but 844x390 (iPhone 14/15) and 915x412 (Pixel 7) give `data-layout=desktop` with the toolbar rendered and 42 controls under 44 px. The choice lives in a `useState` initialiser, so a phone opened in landscape stays desktop after rotating to portrait (the only way back is `?layout=mobile`). The report's section 5.2 lists 915x412 and its source-level `MQ` includes `(max-height:480px) and (pointer:coarse)`, but the deployed HF-5a omits it. Fix: query `(max-width:820px) and (pointer:coarse), (max-height:480px) and (pointer:coarse)` and add a `matchMedia().addEventListener("change")` that updates `Zn` unless a session override exists. Effort S.
3. **HIGH (iOS standalone): HF-8c safe-area top padding is overridden by the `padding` shorthand** (measured, see mobile-13), and HF-12a adds `apple-mobile-web-app-capable` plus `black-translucent`, so an installed iOS app draws the clock and Tools button under the status bar / Dynamic Island (text at y=31 with inset 47; iPhone 15 Pro inset is 59). Fix: replace the topBar `padding:"0 14px"` with `padding:"var(--gt-sat) 14px 0"` (keep the `.gtbg-m-top` left/right `!important` rules) and run the T8 safe-area test before shipping the meta tags. Effort S.
4. **MEDIUM: HF-6c/6d turn dead tiles into misleading ones.** `GtbgLayers` toggles call `m.setLayoutProperty` only `if (m)` with `m = yn.getState().mapRef` (BP:112484-112497), and `BookmarkPanel` reads `mapRef` from the store for `getCenter()` / `flyTo` (chunk source); `mapRef` is set only by the desktop map (BP:97222) and the mobile map never adds the T4 road/river layers. After the pack, Map Layers opens with checkboxes that change nothing and bookmarks save the tick only and cannot fly the map. Ship `yn.getState().setMapRef($t)` and `T4($t)` in the mobile `load` handler in Phase 0 (two calls, mirroring the desktop handler at BP:97260-97267) or keep those tiles hidden until Phase 1.
5. **LOW-MEDIUM: HF-1a silently removes features that work on mobile today.** `nO` (commander-succession toasts, `position:absolute; z-index:400`, BP:101679-101780) currently floats over the mobile root and is not re-homed by HF-2 (only `qF` is), and the "Created by: Mike Legere" credit/contact link lives only in `IO` (live text of the IO bar) so it disappears from the phone UI. Re-host `nO` in `gtbg-mp-toast` and add a credit/Privacy/Terms line to the Tools sheet footer.
6. **LOW: HF-3b side effects on desktop touch.** With `pointer-events:none` the `k4()` touchstart/move/end listeners on the desktop overlay (BP:9909-9982) never fire, so the finger-position ring (`P4`) is gone and `cursor:crosshair` no longer shows; selection still works through `map.on("click")`. Accept, or move the indicator to the map container.
7. **PROCESS: Phase-1 acceptance is unattainable as written** (see mobile-25): the tests need hooks the pack never adds and a `compact` naming the pack does not emit. The summary's "verified pack" should list Help/Bookmarks as verified only on an un-renamed build.
8. **PROCESS: mobile-18 and mobile-25 use a removed Lighthouse category** (PWA/installability); replace with CDP installability errors in CI.
