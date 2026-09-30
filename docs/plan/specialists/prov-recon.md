# prov-recon: Provenance and Source-of-Truth Reconnaissance

Specialist: prov-recon. Date: 2026-09-29/30. Mode: read-only, no builds, no browser tools.
Compared: RECON_SRC (`C:/Users/mlege/Downloads/gettysburg-source-reconstructed/gettysburg-src`) against the DEPLOYED build (`bundle.pretty.js`, `DEPLOY_DIR/index.html`, `sw.js`, `netlify.toml`, `data/`).

Citation conventions: `bundle.pretty.js:LINE` always means the prettier-formatted copy in PLAN_WORK. `recon:path:LINE` means a file inside RECON_SRC. `deploy:path:LINE` means DEPLOY_DIR. Where I only reasoned from code and did not execute it, the text says "analysis only".

Scratch assets I generated (safe to reuse, all under `plan-work/tmp-prov-recon/`): `d2.json` (16 walkthrough stops with history/video/map coords), `monuments512_deployed_inline.json`, `nps_auto_tour_th.json`, `story_markers_mA.json`, `soldiers_eye_rO.json`, `onboarding_tour_Gc.json`, `onboarding_archetypes_xO.json`, `notable_units_zF.json`, `timeline_markers_TO.json`, plus the scripts `extract_all.mjs`, `recon_loader_test.mjs`, `zipscan.py`, `clocks.mjs`, `oobkeys.mjs`, `plc.mjs`, `cmp_data.py`.

---

## 0. Verdict in ten lines

1. RECON_SRC is not a usable source of truth. It is a 22-component skeleton (about 2,400 lines of JSX/JS) of a deployed app that has about 40 components plus a full mobile shell, a canvas renderer, a playback engine and a guided tour. I ran RECON's own data loader logic against the real data in Node: `oobData` comes out with **0 entries** (deployed logic yields 705). Search, Roster, Order of Battle and Follow-Your-Ancestor are therefore empty in RECON even before their own field-name bugs.
2. RECON has no unit renderer and no playback loop: `Play` toggles a boolean that nothing consumes (grep of `recon:src` for `requestAnimationFrame` finds only BootSplash and MonumentsLayer). The mobile layout renders nothing at all (`recon:src/App.jsx:153` hides both toolbar and map when `deviceMode === 'mobile'`).
3. The deployed main JS bundle (`index-Cg8FAMXN.js`, 2,280,438 bytes, md5 starts `7ef75b95f4`) is byte-identical to `gettysburg_v21_streetview_fix.zip` (Jul 29) and has not changed in any deploy zip from Aug 22 to Sep 29. RECON (Jul 30) was cut from this exact bundle. So there is no "drift after v21" in the React code; every post-v21 feature (Extra Features overlay, SEO block, SW registration, monument star overlay, 20 sub-pages) lives in `index.html` and static pages. RECON's gaps are its own incompleteness, not time.
4. The filename `index-Cg8FAMXN.js` has been reused for four different byte streams (2,279,751 / 2,280,389 / 2,280,438 / 2,287,335 bytes), and a fifth was hand-renamed `index-Cg8FAMXN-v36.js`. Combined with `Cache-Control: immutable` on `/assets/*` and a cache-first service worker, that is a live stale-code trap. Never patch a bundle in place without renaming it.
5. None of RECON's four claimed performance fixes is present in the deployed build, and three of the four are unsound as written (SW "race" is really stale-while-revalidate that can cache errors; the LCP placeholder is a CSS gradient that Chrome excludes from LCP and, by stacking-order analysis, sits above the whole React root; the Google-Fonts CLS "fix" fixes a font the deployed site never loads). Code splitting is directionally right but its numbers were measured on a 30%-complete app against mapbox-gl 2.x.
6. mapbox-gl: RECON pins 2.15.0, the deployed bundle contains 3.24.1 (`bundle.pretty.js:53873`), and every static page that loads Mapbox uses 3.24.1 too. v3 makes WebGL 2 mandatory (Mapbox v3.0.0 release notes). React 18.3.1 and zustand 4.5.x match on both sides.
7. Recommendation: **Strategy C, executed as a strangler**: TypeScript rebuild, deployed build as executable spec, parity harness built first, RECON demoted to a salvage quarry, and Strategy A kept only as a scripted, asserted, versioned hotfix bridge until cutover. Rough cost 38-50 focused developer-days for parity plus A+ work (details in section 6).
8. Framework for the 20+ static pages: **Astro (static output, React island for the map)**. It fixes head/OG/JSON-LD duplication, gives typed content, generates the sitemap, and emits external hashed scripts so CSP can drop `'unsafe-inline'`.
9. Biggest hidden contract: sub-pages, `embed.html` and the app's own share links deep-link into the map with `?tick=`, `?unit=`, `?vignette=`, `?t=`, `?u=`, `?z=`, `?ll=`, but the deployed bundle only reads `?ancestor=` (and only after the ancestor panel is already open). At least 8 deep links across 6 files silently do nothing today.
10. Biggest process trap: `netlify.toml` has `publish = "."` and no build command. Moving to a real repo without changing this would publish `src/`, `PENDING.md`, `vite.config.js` and RECON's hard-coded Mapbox token to the public web.

---

## 1. Method and evidence base

What I read in full: BRIEF.md; the audit; RECON `README.md`, `PENDING.md`, `package.json`, `package-lock.json` (versions only), `vite.config.js`, `index.html`, `public/sw.js`, `public/manifest.json`, `public/robots.txt`, every file in `src/` (26 files); deployed `index.html` (all 760 lines), `sw.js`, `netlify.toml`, `manifest.json`, `robots.txt`, `sitemap.xml` (head), `site-nav.js` (head and tail), `embed.html` (head), `unit-rendering-reference.html` (head and renderer script), `aftermath.html` (structure), the three small JS chunks under `assets/`.

What I read in `bundle.pretty.js`: the store (9,290-9,450), overlay GeoJSON and layer installer (9,450-9,840), daylight/trails/touch helpers (9,841-10,001), mapbox-gl version marker (53,873), then every application component from 96,209 to 113,377 except the 512-entry monument literal (104,440-110,610, extracted programmatically) and pure style objects (skimmed).

What I executed (all read-only Node/Python, outputs in `tmp-prov-recon/`):
- RECON's OOB flatten logic against `deploy/data/oob/*.json` (result: 0 entries vs 705).
- Placement counting across `placements_*.json` and `density_*.json` (694 base + 1,110 density records; 188 distinct ticks; 478 distinct unit ids; RECON would load only 694 records, 117 ticks, 152 units).
- Byte/hash comparison of `data/` (69 identical, 2 different, 1 RECON-only file).
- Zip scan (no extraction) of 16 historical zips for the main bundle name, size and md5.
- PNG structural validation of the two OG/PWA screenshots.
- Tick-to-clock comparison of the clock formulas found in the bundle against the NPS Auto Tour subtitles.

Limits: I did not run either app or a browser (hard rule). Findings marked "analysis only" are derived from code and CSS semantics. The Lighthouse JSONs (`lh_mobile.json`, `lh_desktop.json`) were used for layout-shift and redirect evidence.

---

## 2. Provenance timeline (what the zips prove)

`index-Cg8FAMXN.js` inside each zip, computed with `zipscan.py`:

| Zip | Date | Main bundle name | Size | md5 (first 10) |
|---|---|---|---|---|
| gettysburg_v21.zip | Jun 16 | index-anEySG9a.js | 2,258,564 | cb68e87434 |
| gettysburg_v21 (1).zip | Jun 22 | index-Cg8FAMXN.js (also C6D6ztO2, anEySG9a) | 2,279,751 | a6a94abc9c |
| gettysburg_v21 (2).zip | Jul 4 | index-Cg8FAMXN.js | 2,280,389 | 150ef117c1 |
| gettysburg_v21_streetview_fix.zip | Jul 29 | index-Cg8FAMXN.js | 2,280,438 | **7ef75b95f4** |
| deploy-6a2da5d2...zip | Jun 13 | index-dw1swkmu.js | 2,085,027 | 3844067012 |
| deploy-6a3a0355...zip | Jul 20 | index-bwvnl5jq.js (+2 others) | 2,101,203 | e81f1e9bde |
| currentdeployedbuild.zip | Aug 22 | index-cg8famxn.js | 2,280,438 | **7ef75b95f4** |
| deploy-6a8a9268...zip | Aug 29 | index-cg8famxn.js | 2,280,438 | **7ef75b95f4** |
| deploy-6aa06a6d...zip | Sep 9 | index-cg8famxn.js | 2,280,438 | **7ef75b95f4** |
| deploy-6aa16d61...zip (current) | Sep 29 | index-cg8famxn.js | 2,280,438 | **7ef75b95f4** |
| gettysburg_v36_busted_cache.zip | Jun 22 | index-Cg8FAMXN-v36.js | 2,287,335 | d4a7537677 |
| gettysburg_v37.zip | Jun 22 | index-Cg8FAMXN.js | 2,287,335 | b943b2fd9f |

Consequences:
- The main React bundle is frozen since Jul 29. Everything the audit calls "integration layer" is in `index.html`.
- RECON says (PENDING.md) it parsed `index-Cg8FAMXN.js` from "both uploaded zips"; that is this bundle. RECON's divergences are therefore ports that were skipped, simplified or mistranslated.
- The v36/v37 line (2,287,335 bytes) is a different lineage that also used the name `index-Cg8FAMXN.js`. It is unknown whether the owner considers it more "intended" than the deployed bytes (open question 2).

---

## 3. Parity matrix

Legend. Fidelity: **verified** (I compared code or data and RECON matches); **verified+defect** (matches but inherits or adds a defect); **different** (RECON implements a different behavior); **stub** (renders something but the core logic is absent); **wrong** (cannot work against real data); **missing** (no counterpart); **dead** (deployed code that is unreachable or broken; do not port, decide delete or implement). Effort is developer effort to reach *behavioral* parity in the new TypeScript build using the deployed code as spec: S <0.5d, M 0.5-2d, L 2-5d, XL >5d. All "deployed" line numbers are `bundle.pretty.js`.

### 3.1 Boot, shell, orchestration

| # | Feature | Deployed evidence | RECON counterpart | Fidelity | Notes | Parity effort |
|---|---|---|---|---|---|---|
| P-01 | HTML splash + crawler block | `deploy:index.html:717-748` (`#seo-content`, `#boot-splash`), `#root` contains both | `recon:index.html:149-158` splash only; adds `#map-lcp-placeholder` | verified+defect | Splash CSS is a straight copy. RECON drops canonical, OG, JSON-LD, seo-content, noscript text. Placeholder adds a stacking bug (section 5). | S |
| P-02 | React BootSplash | `tO` 101472; `eO = 3500` (101471); waits for `Object.keys(placementsByTick).length > 5`, +800 ms, animates tick 1..675 via rAF with a `setState` per frame, 600 ms fade, "Skip intro" | `recon:src/components/BootSplash.jsx` | different | RECON has same constants but App unmounts it the moment data loads (`recon:src/App.jsx:135`, `{!dataLoaded && <BootSplash/>}` and `dataLoaded` flips in the same tick as `dataReady`), so the 3.5 s fast-forward never plays. Deployed one runs every visit (H3) and thrashes the store 60x/s. | S |
| P-03 | Device chooser | `dO` 102752 ("Choose Your Experience", "Select Desktop/Mobile"), selection not persisted, no auto-detect | `DeviceSelect.jsx` | different | Different copy and card layout; neither persists (H3). The HTML hooks regex-match these button strings (P-56, P-57). | S |
| P-04 | First-visit onboarding | `bO` 111856 with archetypes `xO` 111799 (newcomer/buff/power), 5-step tour `Gc` 111819, shortcut grid; gated by `gtbg_onboarded` (113068) | `OnboardingModal.jsx` (invented "Welcome to the Battlefield" card); archetype text was folded into `VirtualWalkthrough.jsx` intro | wrong | RECON merged two different deployed features and invented a third. Real content: `tmp-prov-recon/onboarding_tour_Gc.json`, `onboarding_archetypes_xO.json`. | M |
| P-05 | App root, state and render order | `AO` 112921-113285 (18 `useState`s; renders splash, walkthrough, chooser, mobile shell, onboarding, toolbar, map, panels, `GtbgDist/GtbgLoc/GtbgLayers`, lazy Bookmarks/Help) | `App.jsx` | different | RECON re-arranged and omitted HUD, story panel, event card, minimap, legend, NPS tour, sound button, unit panel, toasts (real one). | L |
| P-06 | Desktop toolbar | `AO` 113082-113230 + `Vs` 113287 + `tc` styles; 13 icon buttons (S, F, list, L, monument, telescope, star, ruler, map, pin, magnifier, B, ?), "Toggle Units", PDF link, "Virtual Walkthrough" | `App.jsx:155-187` + `ToolbarButton.jsx` | verified | Same 13 glyph buttons and titles. Both 28x26 px, emoji-based (H6, D2). Toggle Units is a no-op in RECON (no canvas to hide). | S |
| P-07 | Global shortcuts | `AO` keydown 112966-113050: Space, arrows (+Shift=12), 1/2/3, +/=/-/0, f, s, l, **m**, h, b, ?, Escape; skips only `INPUT` targets | `App.jsx:80-128` | verified+defect | RECON lacks `m` (Help still lists it). Both ignore Esc in text inputs (H2). Deployed also has a second handler on the timeline wrapper (P-30). Esc leaves `pinnedUnitId` set, so the unit panel stays open (table 3.4a). | S |
| P-08 | Error boundaries | none | none | dead (absent) | An exception in an effect (see P-41 `setGoldUnit`) unmounts the whole root. | S |
| P-09 | Data orchestration | `sF` 96939 = `Promise.all([iF(), rF(), oF(), zp(1)])`; day 2 loaded when tick >= 200 (`aF`, 96991), day 3 at >= 420 (`lF`, 96992) | `dataLoader.js` | wrong | RECON eagerly loads 9 placement + 13 OOB + successions (23 requests), loads no density, terrain or vignette files, and `Promise.all` is all-or-nothing. | M |

### 3.2 Data layer and store

| # | Feature | Deployed evidence | RECON | Fidelity | Notes | Effort |
|---|---|---|---|---|---|---|
| P-10 | Store shape | `yn` 9361-9449 (49 members) | `store.js` (39 members) | wrong | See 3.2a below. | M |
| P-11 | OOB flatten | `iF` 96834-96899: reads `regiments, brigades, corps, divisions, cavalry_regiments, horse_artillery` arrays keyed by `regiment_id/brigade_id/corps_id/division_id/battery_id`, plus nested artillery batteries; result 705 keys from 712 records | `dataLoader.js:64-82` `absorb()` expects an `id` field or `U-`/`C-` object keys | wrong | Executed: RECON yields 0. The deployed loader keys 705 of the 712 raw records: the 7 `corps_artillery_brigades` wrapper records are not keyed (only their batteries are), and there are no id collisions in the current data; because the loader overwrites silently, the new build should assert id uniqueness. | M |
| P-12 | Placements and density | `tF` 96771 (9 files), `nF` 96788 (13 + 14 + 11 = 38 density files, which is every `density_*.json` on disk); merged into `placementsByTick` | 9 base files only | wrong | Real coverage: 694 base + 1,110 density records; 188 of 675 ticks have any record; 478 unit ids. RECON: 117 ticks, 152 units. | M |
| P-13 | Commander successions | `Hk` 97520, fields `unit_id, approx_tick, from_commander, to_commander, cause, event, notes` | `dataLoader.js:84-88`, `CommanderToasts.jsx` uses `ev.tick, commander_out, commander_in` | wrong | RECON toast can never match (`ev.tick` undefined). The deployed `nO` (101679) has the same class of bug: it filters on `H.tick` (undefined), so its cards never appear (P-34). | S |
| P-14 | Vignettes | `oF` 96923: 3 files, indexed by `trigger_tick` | not loaded | missing | Needed by Story panel P-32. | S |
| P-15 | Terrain | `rF` 96919 loads `terrain.json`; `terrainData` never read | not loaded | dead | Delete the load from the main app; sub-pages use it. | S |
| P-16 | Chronology | `PF` 98548 caches once; mobile shell fetches the same 3 files again (102958-102962) | not loaded | missing | Event cards, mobile scrub markers. | S |
| P-17 | Inline data literals | `mA` (20 story markers, 100615), `th` (16 NPS tour stops, 100063), `d2` (16 walkthrough stops, 104096), `_A` (512 monuments, 104440-110610), `rO` (8 Soldier's Eye sites, 101876), `zF` (7 notable units, 98729), `TO` (8 timeline markers, 112192), `Gc`/`xO`, GeoJSON `x4/b4/w4/S4` (9450-9745) | `tourStops.js` (16, partial), `monuments.json` (512), `monument_story_markers.json` (20) | verified+defect | 512 monuments and 20 markers verified identical to deployed (`diff entries 0`). `d2` is wrong (see P-52). `th`, `rO`, `zF`, `TO`, roads/rivers/works/farms GeoJSON not carried. | M |
| P-18 | Persistence keys | `gtbg_prefs` (9329: showLegend, showMinimap, onboardingComplete), `gtbg_onboarded` (112951), `gettysburg_bookmarks` (97821), `gtbg-ef-hidden` (deploy:index.html:328), `gtbg_watch_together_tour` (watch-together.html) | `gtbg_prefs` (same), `gtbg_onboarded` (same), **`gtbg_bookmarks`** (different) | verified+defect | RECON would orphan every existing user's bookmarks; bookmark record shape also differs (`id: Date.now()` + `created` + `url` vs `bm_...` string). | S |

**3.2a Store member parity.** Deployed (`bundle.pretty.js:9361-9449`) versus RECON (`recon:src/store/store.js`):

| Deployed member | In RECON? | Comment |
|---|---|---|
| currentTick, isPlaying, playbackSpeed, maxTick, setTick, setPlaying, setSpeed, jumpToDay | yes | identical |
| getTickTime | yes, **different** | deployed: base 6:00 (day 1) or 4:00 (days 2 and 3), returns `July {day}`; RECON: base 5:00 for all days, returns `July {day+2}` |
| getCurrentDay | no | never called in deployed (dead) |
| oobData, commanderSuccessions, placementsByTick | yes | loaded wrongly (P-09/11) |
| terrainData, setTerrainData | no | dead in deployed |
| vignetteData, setVignetteData | no | needed by Story panel |
| loadedDays, addPlacementsForDay, setOobData | no | lazy-by-day loader |
| activeMapRef, setActiveMapRef | no | written, never read (dead) |
| selectedUnitId, pinnedUnitId, selectUnit, pinUnit, mapRef, setMapRef | yes | identical |
| showFilterPanel/showSearchPanel + toggles | yes | identical |
| showLegend, showMinimap + toggles (persisted) | yes | identical |
| showCasualtyHeatmap, toggleHeatmap, casualtyData, setCasualtyData | yes | dead in both |
| showUnits, toggleUnits | yes | no consumer in RECON |
| filters `{sides[], dispositions[], unitTypes[], minStrength}`, setFilters, resetFilters | yes, **wrong schema** | RECON: `{side:'all', type:'all', disposition:'all'}`; FilterPanel and store agree with each other but not with the deployed renderer contract |
| onboardingComplete, setOnboardingComplete | yes | never used (the `gtbg_onboarded` key is used instead) |
| bookmarkCount, bumpBookmarkCount | yes, renamed `incrementBookmarkCount` | never read (dead) |

### 3.3 Map, renderer and playback

| # | Feature | Deployed evidence | RECON | Fidelity | Notes | Effort |
|---|---|---|---|---|---|---|
| P-19 | Map init (desktop) | `gF` 97213: satellite-v9, center [-77.235, 39.812], zoom **13.5**, min 11, max 18, `maxBounds` [[-77.36,39.72],[-77.12,39.91]], NavigationControl top-right, default attribution | `MapView.jsx`: zoom **13**, no maxBounds, no NavigationControl, `attributionControl:false` | different | `dragPan {inertia, inertiaDeceleration, inertiaMaxSpeed}` (97248) and `scrollZoom {speed, smooth}` (97249) are not options Mapbox reads: `bundle.pretty.js:88952` reads `deceleration, maxSpeed, linearity`; `89624` reads only `around`. They are silent no-ops in the deployed app; the new build should use defaults or real options. RECON hides attribution on the map that previously showed it. | S |
| P-20 | Overlay layers (1863 roads, rivers, breastworks, farms) | `T4` 9746-9840 adds 4 sources and 7 layers from hard-coded GeoJSON (coarse straight-line traces) | none | missing | `MapLayers.jsx` toggles layer ids that RECON never adds, so the whole panel is a no-op. | M |
| P-21 | Unit canvas renderer | `lS` 96506-96688: 2D overlay canvas, side/disposition/strength filters, shape per unit type (rect / artillery box / dashed skirmish), bearing rotation, strength-scaled size (`lA` 96433), collision spreading (8 iterations), leader lines, labels by zoom (`Y4` 96465), pulsing halo for Union/Confed proximity (`X4` 96480), FPS warning | none | missing | This is the product. Recommended replacement: GPU symbol layers per `unit-rendering-reference.html` (section 6.5). | XL |
| P-22 | Interpolation | `y1` 96266, `F4` 96238, easing per disposition (`z4` 96224), angle wrap `O4` | none | missing | **Stateful bug**: module-level `i2 = {}` (96265) accumulates every unit ever seen and is never cleared (only 3 references, 96271/96279/96291). Rendered set depends on navigation history (scrub Day 3 then back to Day 1 and Day 3 units sit at their last-seen positions). Also `y1` is called inside a React effect (97324) so it mutates state during render-adjacent work. Only 188 of 675 ticks carry records, so tick-to-tick lerp rarely engages; units mostly jump between keyframes. | L |
| P-23 | Spatial index and click picking | `aT/Xx` 96388-96413; picking at 97327-97351 and mobile 103008-103035 and 103076-103103; radius 0.002 (desktop) vs 0.003 (mobile/touch) degrees | none | missing | Reuse concept; replace with Mapbox `queryRenderedFeatures` once units are layers. | M |
| P-24 | Trails | `J4/K4/Q4/Kx/cA` 96689-96753, toggle button `〰 Trails ON/OFF` 97378 | none | missing | Trails reset on day change (97283). | M |
| P-25 | Daylight tint | `M4/E4/A4/C4` 9856-9908 (5:00 base clock!) | none | missing | Uses the 5:00-base formula (P-31). | S |
| P-26 | Touch tap select and indicator | `k4` 9909-9982, `P4` 9983 | none | missing | | S |
| P-27 | Playback loop | `Gk/Op/Ed` 96956-97018; `cF = 500` ms per tick at 1x (96948) = 10 simulated minutes per second (H9); mobile throttled to 33 ms frames (97004-97012); casualty flash `uF` 97033 | none (Play does nothing) | missing | Two more per-frame React updaters run alongside: HUD `_F` 97415 calls `sT()` (double-counting FPS) and toggles state every frame; `KF` 100844 sets state from its own rAF **all the time**, not only when playing. | L |
| P-28 | HUD (day, speed, arc) | `_F` 97415; `R = "July {l+2}, 1863"` (97428); label `1x (real time)` (97429) | none | missing (defective) | C3 and H9 live here. | S |
| P-29 | Hover popup | `fF` 97063 | none | dead | Called as `V.jsx(fF, {map, canvas})` (97384) but the component expects `{hoveredUnit, mousePos}`, so it always returns null. | delete |

### 3.4 Timeline and clocks

| # | Feature | Deployed evidence | RECON | Fidelity | Notes | Effort |
|---|---|---|---|---|---|---|
| P-30 | Timeline bar | `IO` 112202: day buttons, 8 event markers (`TO`), range slider 0-100 step 0.01, transport (-1h, prev, play, next, +1h), 6 speeds (`wO`), tick counter, credit + mailto | `TimelineScrubber.jsx` | different | RECON: different layout (integer slider, 5 transport buttons), no markers, no `-1h/+1h`. Deployed wrapper has `tabIndex=0 onKeyDown` (112223-112224) **and** the window handler acts on the same keys, so Space toggles twice (net no-op) and arrows step 2 whenever focus is inside the bar (analysis only). Slider unlabeled (A2). | M |
| P-31 | Tick to clock | Clock logic in six places, two formulas and two date conventions: `getTickTime` 9371 (6:00 day 1 / 4:00 days 2-3, "July {P}"), `M4` 9856 (5:00, day-night tint), `JF` 100836 and `QF` 100998 (5:00 base, "July {f+2}"), HUD `_F` 97428 ("July {l+2}"), bookmark labels `IF` 97865 | RECON store (5:00, +2) and MonumentsLayer (5:00, +2) | verified+defect | Table in section 3.7. All disagree with the NPS tour subtitles by 35 minutes to 9 hours (tick 264: subtitle "July 2, 4:00 PM", main clock 7:10 AM). Must become one module driven by a tick-to-timestamp table. | M |

**3.4a Keyboard shortcut parity** (deployed handler `AO` 112966-113050; RECON `recon:src/App.jsx:80-128`; Help text identical in both):

| Key | Deployed | RECON | Note |
|---|---|---|---|
| Space | toggles play | same | deployed also toggles in the timeline wrapper handler (112223), so it cancels out when focus is inside the bar (analysis only) |
| Left/Right, Shift+Left/Right | -/+1 tick, -/+12 ticks (clamped in window handler) | same | wrapper handler adds a second step when focus is in the bar |
| 1, 2, 3 | jump to ticks 1, 226, 451, pause | same | |
| + or =, -, 0 | speed x2 (max 16), /2 (min 0.25), reset 1 | same | Help says "Reset to 1x"; timeline speed buttons offer 0.25-8 only |
| f, s, l | toggle filter, search, legend | same | |
| m | toggle minimap | **missing** | Help lists it |
| h | toggle heatmap (dead) | same (dead) | Help lists it |
| b | bookmarks | same | |
| ? | help | same | |
| Esc | clears `selectedUnitId`, closes filter, search, ancestor, Soldier's Eye, roster, OOB, bookmarks, help, walkthrough | similar, plus distance and layers | **Does not clear `pinnedUnitId`**, and a click sets both (97348), while the unit panel shows when either is set (97909), so Esc never closes a clicked unit's panel. Does not touch story panel, event card, toasts, distance tool, map-layers panel, NPS tour (their state is local). Ignored when the target is an input (112968). |

### 3.5 Desktop panels

| # | Feature | Deployed evidence | RECON | Fidelity | Notes | Effort |
|---|---|---|---|---|---|---|
| P-32 | Story (vignette) panel | `CF` 98252-98416, styles `Cr`; shows vignettes for ticks c, c-1, c-2; read-time (200 wpm `AF`), progress bar, dismiss, dismiss-all, jump | none | missing | Not closed by Esc (H2). | M |
| P-33 | Event card | `LF` 98595; only significance != low; dismiss set resets on jumps > 1 tick | none | missing | | S |
| P-34 | Commander-change toasts (working) | `qF` 99888 uses `approx_tick`, 4.5 s timeout, max 4, only while `isPlaying` | `CommanderToasts.jsx` | wrong | `nO` 101679 (second toast system, dying/fading cards) is dead (`H.tick`). Delete `nO`. | S |
| P-35 | Unit panel | `MF` 97897-98089: share button, unpin, breadcrumb, disposition badge, `SF` strength bar (97664; hard-coded alerts for `U-1MN` ticks 302-310 and `C-26NC`), `wF` commander with succession (97571), key action, notes at tick, last 5 positions, casualty line | none | missing | Breadcrumb (`corps/division/brigade`), `type`, `casualties_killed/wounded` never render: those fields do not exist in the data (`oobkeys.mjs`: corps 7 records, division 0, brigade 0, type 0, casualties_killed 0). Parent chain is only available via `parent_*_id`. | L |
| P-36 | Search (units) | `FF` 98738: min 2 chars, matches id, name, state, `commander.name`; sort relevance/casualties; 12 results; "Notable Units" quick list `zF`; first-tick jump | `SearchPanel.jsx` | wrong | RECON calls `.toLowerCase()` on `u.commander` (fallback empty string) where commander is `{name, fate, ...}` (object in 685 of 712 records): TypeError once oobData is populated. No quick list, 40 results, different sort. | M |
| P-37 | Filter panel | `OF` 99082: multi-select sides, unit types, 11 dispositions, min strength slider 0-500 | `FilterPanel.jsx` | wrong | Different UI and schema; no consumer (no renderer). | M |
| P-38 | Legend | `VF` 99422 with 3 tabs (disposition, sides, size), FAB when closed | none | missing | | S |
| P-39 | Minimap | `WF` 99711 + `GF` 99644 tick hook + `HF` ridge lines; footer "N units · tick T" | none | missing | **H11 root cause**: `GF` calls `yn.subscribe(selector, listener)`; the store's `subscribe` (9134) accepts one argument, so the selector is registered as a plain listener and the listener never fires. Tick stays at its first value. Fix: `useStore(s => s.currentTick)`. | S |
| P-40 | Roster / OOB | `Jk` 102660 (flat two-column list, last-100-ticks status), `Xk` 102321 (two-column list, depth from dashes in id), shared row renderers `aO`, `hO` | `UnitRoster.jsx` (filterable list), `OrderOfBattle.jsx` (corps/division tree keyed on `u.corps`, `u.division`) | wrong | RECON tree would show one "Unassigned" bucket (those fields do not exist). Desktop toolbar has no OOB button in either (D4). Sorting is text (`localeCompare`), causing H5. | M |
| P-41 | Follow Your Ancestor | `Zk` 101008-101471: type-ahead over every unit that ever appears in placements, journey timeline with formation/casualty/position rows, `?ancestor=` deep link, share text, "gold trail" | `AncestorTracker.jsx` (select + prev/next stepper) | different | **C5 root cause**: `setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment` are referenced (101086, 101101, 101229) and defined nowhere in the deploy tree (grep of every html/js/chunk). `st()` throws before `flyTo` and before selecting the unit; on the `?ancestor=` mount path it throws inside `useEffect` (101019), which, with no error boundary, unmounts the app. | M |
| P-42 | Bookmarks | lazy chunk `BookmarkPanel-C5YT4b5k.js` + helpers `$k/TF/kO/PO/RO/IF` in main (97822-97896); share URL uses `?t=&u=&z=&ll=` | `BookmarkPanel.jsx` (UI verified, helpers reinvented) | verified+defect | Different storage key, id shape, share params (`?tick=&unit=`), default label (`IF` preset names vs clock). The chunk imports symbols from the entry by hard-coded filename `./index-Cg8FAMXN.js`. | S |
| P-43 | Help | lazy chunk `HelpModal-CFV9T0zH.js`; shortcuts + About ("445+ units" vs 467; 24 vignettes; 9 sources) | `HelpModal.jsx` | verified | Text is identical (including the wrong "445+"); the chunk also exports an unused `useGlobalKeyboard` (`b`). | S |
| P-44 | Distance tool | `GtbgDist` 112677 (injected vanilla-style code using `window.__gtbgApp._gbDist` seam, canvas click hook at 97368) | `DistanceTool.jsx` | verified | Same logic (haversine, 67 m/min march constant). Same H12 symptom. Effect depends on `mapRef` read once at effect time; if the map isn't ready it silently registers nothing. | S |
| P-45 | Map layers panel | `GtbgLayers` 112471 | `MapLayers.jsx` | verified (UI) / stub (function) | RECON has no layers to toggle (P-20). | S |
| P-46 | Locations labels | `GtbgLoc` 112573 (10 points) | `LocationLabels.jsx` | verified | Same 10 coordinates. | S |
| P-47 | Story markers (monument icons) | `KF` 100844 with `mA`, `JF` tooltip time (+2 bug) | `MonumentsLayer.jsx` | verified+defect | Copies the per-frame `setState` pattern and the +2 date. | S |
| P-48 | Monuments directory | inside walkthrough (`_A`, `vA` 110690) | inside `VirtualWalkthrough.jsx` | verified+defect | RECON lacks the "Group" dropdown (deployed 110733+, `ut`), and monument card click on desktop. | S |
| P-49 | NPS Auto Tour | `XF` 100323 + `th` 100063: 16 stops, narrative, fly-to, auto-play 2x for `tickWindow*250` ms, PiP NPS video iframe | none | missing | The mobile tools sheet has an "NPS Auto Tour" button (103447) that sets a state (`Dt`) nothing renders. Tour subtitles carry wall-clock times that contradict the map clock (P-31). `frame-src` in the CSP lacks `www.nps.gov`. | M |
| P-50 | Soldier's Eye View | `Yk` 101958 + `rO` (8 sites), hands off to Google Maps URLs (`M()` 101963) | `StreetView.jsx` (grid of **16** Google embed iframes) | different | RECON needs `VITE_GOOGLE_MAPS_KEY` (defaults to empty string), otherwise 16 broken iframes. Guide PDF says "Street View panoramas" (G1). | M |
| P-51 | Sound | `yO` 111768 toggle; engine `Uk/jk/N4/U4` 96319-96372; trigger inside renderer 96554-96557 | deleted (README) | dead / decision | `lS` calls `CanvasRenderer._lastSoundMs` (96556-96557), an identifier defined nowhere. With sound on and any Union/Confederate collision, that throws inside the rAF callback before the next frame is scheduled, freezing playback (analysis only). | S |

### 3.6 Walkthrough, mobile shell, HTML layer

| # | Feature | Deployed evidence | RECON | Fidelity | Notes | Effort |
|---|---|---|---|---|---|---|
| P-52 | Virtual Walkthrough | `_O` 110733: own Mapbox map (`#gtbg-wt-map`) with 16 stop circles + 512 monument dots, layer toggles, stop pages with 3 history paragraphs each (`dangerouslySetInnerHTML`, 110653), embedded Street View (Google key `mO`, 110610), NPS video link, separate mobile layout (`gO` at width <= 860), monuments tab with group filter | `VirtualWalkthrough.jsx` + `tourStops.js` | different | RECON `TOUR_STOPS` has no `history` (48 paragraphs lost), no `video` (16 lost), no `label/dayClass`, and stores the Street View coordinate as the map coordinate (all 16 map positions differ from `d2`). 6 stops differ in SV data (2, 3, 6, 12, 13, 15; stop 3 has an SV block in deployed but `null` in RECON). Extracted spec in `d2.json`. | L |
| P-53 | Mobile shell | `pO` 102914-103700 (+ styles `tn` to 104090): own map (zoom 13, no bounds, **attribution off**), own canvas and click picking, scrub track with event markers, 4 round 52 px transport buttons + 64 px play + speed + tick text in one nowrap row (root of C1), 14-tool bottom sheet (root of C2), unit popup, mini overview, mini legend, roster panel, legend panel | none (mobile mode renders nothing) | missing | Dead tool targets: Bookmarks, Help and Map Layers set `lo` values (`"bookmarks"`, `"help"`, `"layers"`) that have no renderer (only `"legend"` at 103617 does; the `"roster"` branch at 103505 is unreachable because the Roster tool uses a different state, `er`); "NPS Auto Tour" and "Monuments" set states nothing reads. | XL |
| P-54 | HTML: Extra Features overlay | `deploy:index.html:285-292, 176-237, 294-353`; populated from `window.GTBG_MENU` (site-nav.js); z-index 999999; persisted hide toggle `gtbg-ef-hidden` | none | missing (by design) | Replace with a native toolbar entry (H1). CLS source on desktop (layout-shift audit: `#extra-features` moved to `top:50%`). | M |
| P-55 | HTML: collision mover | `deploy:index.html:521-606` (`GTBG_REPOSITION_EF`) | none | missing | Delete with P-54. | delete |
| P-56 | HTML: reveal-after-onboarding | `deploy:index.html:441-519` regex `select desktop\|select mobile\|skip introduction\|skip tour\|skip intro` on click and a 1.5 s scan, 10 s fallback, CSS 5 s force-reveal | none | missing | Couples the overlay to React copy; delete. | delete |
| P-57 | HTML: onboarding banner injector | `deploy:index.html:355-396` (finds leaf text "choose your experience") | none | missing | Copy says "AI-style historian" and "live sound" (H8, sound decision P-51). Fold into real UI copy. | S |
| P-58 | HTML: toolbar label patcher | `deploy:index.html:398-440` | none | dead | `Vs` already sets `title` on every button (113287), so `if (b.title ...) return` skips them all: `labeled` stays 0 and the script never removes `#seo-content`. No-op. | delete |
| P-59 | HTML: monuments star overlay | `deploy:index.html:608-714`: absolutely positioned SVG stars at the *initial* view only, fed by `data/monuments.json` (`{_note, monuments[9]}`), wired to the 🗿 toolbar button in parallel with React's `KF` | none | missing (dead-ish) | Duplicate of P-47 and does not track pan/zoom. RECON's `monuments.json` (512-item array) would make `data.monuments` undefined and throw here. | delete |
| P-60 | HTML: SW registration + reload | `deploy:index.html:255-277` (`controllerchange` to `location.reload()`) | none (RECON registers nothing) | missing | C6. Lighthouse: redirect wasted 9,067 ms mobile / 1,575 ms desktop. | S |
| P-61 | Cross-page seams | `window.__gtbgApp._gbDist` (97370-97372, 112757), `GTBG_MENU`, `GTBG_REPOSITION_EF`, `history.back()` bfcache contract in `site-nav.js` `wireBackLinks` | none | partial | The new app must stay bfcache-eligible (no `unload` handlers) because sub-pages use `history.back()` to return to the map instantly. | S |
| P-62 | Deep-link contract | Sub-pages emit `/?tick=N`, `/?unit=ID&tick=N`, `/?tick=N&vignette=ID`, `/index.html?unit=...` (turning-points:118, historian:110, regiment:247, search:114 and 127, embed.html, find-ancestor via regiment page); app emits `?t&u&z&ll` (97823); ancestor emits `?ancestor=` (101117) | RECON emits `?tick=&unit=` | dead in deployed | Only `get("ancestor")` exists in the bundle (`bundle.min.js` search). None of the other 7 keys is parsed. | M |

### 3.7 Clock formulas compared (evidence for P-31)

Computed by `tmp-prov-recon/clocks.mjs` (tick is the same in every column):

| Tick | NPS tour subtitle (claim) | `getTickTime` (6:00 / 4:00 base) | daylight `M4` (5:00 base) | `JF/QF/HUD` (5:00 base, July+2) |
|---|---|---|---|---|
| 12 | July 1, 7:30 AM | Jul 1 6:55 AM | Jul 1 5:55 AM | Jul 3 5:55 AM |
| 62 | July 1, 2:30 PM | Jul 1 11:05 AM | Jul 1 10:05 AM | Jul 3 10:05 AM |
| 264 | July 2, 4:00 PM | Jul 2 7:10 AM | Jul 2 8:10 AM | Jul 4 8:10 AM |
| 322 | July 2, 8:00 PM | Jul 2 12:00 PM | Jul 2 1:00 PM | Jul 4 1:00 PM |
| 548 | July 3, 3:00 PM | Jul 3 12:05 PM | Jul 3 1:05 PM | Jul 5 1:05 PM |
| 610 | July 4-5 (retreat) | Jul 3 5:15 PM | Jul 3 6:15 PM | Jul 5 6:15 PM |

Conclusion: a linear `5 min x tick` formula cannot be right, because the data's ticks are event-indexed (188 populated ticks), not uniform in wall-clock time. The fix is a `ticks.json` table (tick to ISO timestamp, anchored on chronology `time` fields and interpolated) consumed by one `time.ts`; every consumer (HUD, toolbar, mobile clock, tooltips, ancestor journey, bookmarks, tour subtitles, daylight tint) uses it. RECON's `+2` in the store does not exist in the deployed store; it was copied from the HUD/monument helpers into a place where the deployed code does not have it.

### 3.8 Parity summary

Tally of rows P-01..P-62 (script-counted from the tables above): verified (functionally equal) 4; verified with a defect carried over or added 8; UI verified but function stub 1; different behavior 8; wrong (cannot work with real data) 9; missing 25 (21 plain plus 4 flagged as defective, by-design, dead-ish or partial); dead or decision items 6; one row (P-62) is a cross-page contract that is dead in the deployed app. Effort mix: 30 S, 20 M, 5 L, 2 XL, 5 delete-only. Summed at BRIEF midpoints (S 0.25 d, M 1.25 d, L 3.5 d, XL 7 d) that is about 65 unassisted developer-days for full behavioral parity; I plan 30-38 AI-assisted days because the rows share infrastructure (tokens, dialog primitive, data layer, store, test harness), not because any row is skippable.

In words: about a dozen surfaces in RECON are reusable as a starting point, and every one of those is a small leaf panel (distance, layers, locations, help, bookmarks UI, toolbar buttons). None of the seven core surfaces (renderer, interpolation, playback, mobile shell, data loader, unit panel, story/event/toasts) exists in working form.

---

## 4. Version drift

| Item | RECON | Deployed | Impact |
|---|---|---|---|
| mapbox-gl | `^2.15.0` (lock 2.15.0) | **3.24.1** (`bundle.pretty.js:53873`; pages load CDN 3.24.1 e.g. `unit-rendering-reference.html:9-10`) | v3 makes WebGL 2 mandatory and removes `optimizeForTerrain` (Mapbox v3.0.0 release notes); classic styles such as `satellite-v9` keep working (Mapbox: v3 is backwards-compatible for existing layers and APIs). Bundle size is much larger (about 3.27 MB of the 4.03 MB pretty file, roughly 81 %, is mapbox-gl). RECON's "986 KB chunk" is a v2 number. |
| react / react-dom | 18.3.1 | 18.3.1 (`bundle.pretty.js:440`, `8927`) | none |
| zustand | 4.5.7 | 4.5.x (`createWithEqualityFn` deprecation text at 9303; `getInitialState` at 9133) | none. Note the app relies on `subscribe(listener)` only; the `GF` bug (P-39) is app-level. |
| Vite / Rollup | 5.4.21 / 4.62.3 | unknown (uses `__vitePreload` and `vite:preloadError`, so Vite >= 4.4); asset naming `assets/[name]-[hash]` | RECON `vite.config.js` mirrors the naming; no `manualChunks`, no sourcemaps, no `build.target`. |
| vite-plugin-pwa | in devDependencies, imported nowhere | n/a | phantom dependency that drags workbox-build and its audit noise. |
| Fonts | Google Fonts `Spectral` link | none loaded; `'Spectral'` is named in 14 style declarations (toolbar 113108/113124, walkthrough and onboarding 111327-111740) but never fetched, so all of them render in Georgia | RECON adds a render-blocking third-party request and would silently change the typography (Spectral would start to apply), so it is a visual-parity diff, not a CLS fix. |
| Chunks | none (planned 12+ lazy panels) | `BookmarkPanel`, `HelpModal` lazy; `InterpolationWorker-*.js` present but **orphan** (0 references in `bundle.min.js`) | delete the orphan; both lazy chunks import from the entry by hashed filename. |
| Features after v21 | n/a | none in the bundle (md5 unchanged since Jul 29) | all newer behavior is in `index.html`, `sw.js`, `site-nav.*`, sub-pages, `data/` (OOB mojibake fix, 9-entry `monuments.json`), `user-guide.pdf` (14,321 B vs RECON 9,282 B), `netlify.toml`. |

Deployed-only features not in RECON (whether or not they pre-date v21 is unknowable from bytes, but all are present in the frozen bundle): mobile shell, canvas renderer and playback, HUD, story panel, event card, working toasts, unit panel with commander succession and strength bar, legend, minimap, NPS tour, walkthrough split-map, day-night tint, trails, touch tap, sound, roads/rivers/works/farms layers, deep-link handling for `?ancestor`.

RECON-only differences that look like improvements but change behavior: `attributionControl:false` on the main map, Google Fonts, `#map-lcp-placeholder`, a rewritten SW, `VITE_MAPBOX_TOKEN` fallback, 16-iframe Soldier's Eye, single-file `monuments.json` at a path that already exists with another schema.

---

## 5. Verification of RECON's claimed performance work

### 5.1 Presence in the deployed build

| RECON claim | In deployed? | Evidence |
|---|---|---|
| FCP: SW races cache vs network, 800 ms timeout | **No** | `deploy:sw.js` is pure network-first for HTML and `/data/`, cache-first for `/assets/`, with hard-coded hashed precache entries (`'/assets/index-Cg8FAMXN.js'`, `'/assets/index-B4G7Z_2G.css'`) |
| LCP: static gradient placeholder removed on map `idle` | **No** | `deploy:index.html` has `#boot-splash` and `#seo-content`, no `#map-lcp-placeholder` |
| LCP: code splitting into 171 KB entry + 986 KB mapbox chunk + 12 panel chunks | **No** | one 2,280,438-byte entry; only `BookmarkPanel` and `HelpModal` lazy; `import("./...")` calls at 112469-112470 |
| CLS: Google Fonts `display=optional` | **No** | no `fonts.googleapis.com` link in the deployed HTML |
| Also claimed: 12 lazy panels as 1-6 KB chunks | **No** | same as the code-splitting row: two lazy chunks exist |

### 5.2 Soundness of each approach

**SW race (`recon:public/sw.js:37-70`)** - unsound as written, direction is fine.
- `cacheAttempt = caches.match(request).then(finish)` resolves within milliseconds on a hit, so any cached URL is served from cache immediately. The 800 ms timeout only matters on a cache *miss*, where the timeout resolves with `undefined` and nothing happens. The behavior is stale-while-revalidate for every HTML and data URL, not a race.
- Consequences: a returning visitor sees the previous deploy's `index.html` until a second load, and data JSON can be one version behind the code. There is no update signal.
- `caches.open().then(c => c.put(request, clone))` runs for every response (no `res.ok` check, no method check, no 206 handling): a transient 500 or 404 is cached and then served forever; `put` rejects for non-GET and 206 and the rejection is unhandled.
- `recon:index.html` and `recon:src/main.jsx` contain no `serviceWorker.register`, so this file is dead in RECON. The already-installed deployed SW would keep controlling clients after a cutover.
- FCP is not SW-limited: the HTML splash paints at parse time, and Netlify serves HTML with `no-cache` and a 30 ms server response. Lighthouse mobile FCP 4.1 s is dominated by the first-visit reload (redirect audit: 9,066 ms wasted) and the modulepreload of 2.28 MB competing with the splash.

**LCP placeholder** - unsound; analysis only.
- Chrome excludes gradients from LCP: a CSS background image that is a gradient is treated as background (web.dev LCP article). The placeholder cannot become the LCP element. Real LCP candidates are the splash `h1` text or images.
- Stacking: `#map-lcp-placeholder` is `position:fixed; z-index:1` in `<body>`; `#root` is `position:fixed` with `z-index:auto` (contain:strict makes its whole subtree one stacking context at level 0). The placeholder paints above the entire React root, including the boot splash, and its bottom layer (`linear-gradient(#14161f,#0a0a14)`) is opaque. Users would see a blank dark screen until Mapbox fires `idle`.
- The placeholder is removed only in `MapView`'s `map.once('idle')`. `MapView` never mounts when `deviceMode === 'mobile'` (`recon:src/App.jsx:153`), so on mobile the placeholder would never be removed.

**Code splitting** - directionally right, numbers not transferable.
- Pieces that are good practice: dynamic `import('mapbox-gl')`, lazy panels, monuments as JSON instead of an inline 144 KB literal.
- Problems: (1) measured on an app that is about 30 % complete and on mapbox-gl 2.15; with 3.24.1 the map chunk is about 1.7-1.8 MB minified by my byte-share estimate (81 % of pretty bytes: 3,273,745 of 4,027,234). (2) `import('mapbox-gl')` starts only after `MapView` mounts, which is after React boots; a `<link rel="modulepreload">` for the map chunk in HTML, or starting the import in `main.jsx` before `createRoot`, would remove that waterfall. (3) 12 tiny lazy chunks add latency on each open; group them into 2-3 chunks and prefetch on idle. (4) No `manualChunks`, no sourcemaps (P6). (5) RECON's loader fetches 23 JSON files eagerly and is not lazy-by-day like the deployed one.

**Google Fonts** - unnecessary and mildly harmful.
- No web font is actually loaded in the deployed build (Spectral is named in 14 style declarations but never fetched, so everything renders in Georgia), so there is no font-swap CLS to fix; loading it would also change the look of the toolbar, walkthrough and onboarding. Real CLS contributors from the Lighthouse `layout-shifts` audit: the HTML-splash to React-splash swap (mobile: node `div style="position: relative; text-align: center; z-index: 1;"`, score 0.0098) and `#extra-features` being repositioned by the collision mover (desktop: 0.0072).
- Adds a cross-origin render-blocking stylesheet, two preconnects, a Google request per visit (privacy page does not mention it), and `display=optional` means the font is often never used on first visits.

### 5.3 Other RECON defects found while reading

- `recon:src/components/MonumentsLayer.jsx:43-55` runs `setPositions` inside a rAF loop (60 React renders/s) - the same INP hazard as the deployed `KF`.
- `recon:src/App.jsx:47-51` and `TimelineScrubber.jsx:8` call `useStore()` without selectors; every store write re-renders both (also true of the deployed `yn()` callers).
- `recon:src/lib/dataLoader.js:44-49` is all-or-nothing `Promise.all`; the deployed day loader tolerates per-file failure.
- Data copies are stale: `public/data/oob/union_oob_corps_division.json` carries double-encoded UTF-8 (`â€"` for an em dash; deployed uses `--`); `public/user-guide.pdf` is the older 9,282-byte file; `apple-touch-icon.png` is 32x32 (deployed 180x180); `favicon.ico` and `icon-192.png` differ; `robots.txt` has an extra `Disallow: /diagnostics.html`.
- README claims `npm run build` is verified (72 modules). I did not re-run it; nothing in the source proves runtime behavior, and the loader test above shows the runtime is hollow.
- Meta description and manifest say "430,000+ unit positions" (RECON) versus "467 regiments and batteries" (deployed). The 430,000 figure is unsupported by any file I found (H10).
- OG and PWA screenshots are corrupt in both trees: `screenshots/day1.png` and `day3.png` are byte-identical (md5 `3f6646c9...`) and structurally invalid: IHDR declares 8-bit RGB (3 bytes/pixel) but the decompressed IDAT is 3,687,120 bytes = 720 x (1 + 1280 x 4), i.e. RGBA-sized. Pillow refuses to decode it. `og:image` and manifest screenshots therefore point at an image most decoders will reject (browser behavior unverified). See finding prov-recon-42.

---

## 6. Source-of-truth strategy

### 6.1 The three options as evaluated

- **A. Keep patching the minified bundle.** Every past fix was a string or regex replacement on a 2.28 MB file with mangled names. The scars are visible in the current bundle: three helpers called but never defined (`setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment`, lines 101086, 101101, 101229), an undefined global in the sound path (`CanvasRenderer`, 96556), a component fed the wrong props (`fF`, 97384), an orphan worker chunk, options copied from another library (`dragPan.inertia*`, `scrollZoom.speed`), and vanilla-style `var` components spliced between React function components (`GtbgLayers/Loc/Dist`, 112471-112920). No test exists that would have caught any of these.
- **B. Finish RECON to parity, then cut over behind a harness.** RECON is JavaScript with inline-style objects, mapbox-gl 2.x and about 2,400 lines. Section 3 shows it is wrong at the data seam, missing the renderer, engine and mobile shell, and structurally different in several panels. Finishing it means touching essentially every file, then refactoring again for A+ (tokens, a11y, TypeScript).
- **C. Clean-room TypeScript rebuild using the live site as executable spec.** Not blind: the deployed logic is fully recoverable from `bundle.pretty.js` (about 17k readable lines of app code; 81 % of the file is the vendored map library), and the extractions in `tmp-prov-recon/` already give the inline data as JSON.

### 6.2 Decision matrix (my estimates; scale 1 worst to 5 best)

| Criterion | A: patch bundle | B: finish RECON | C: TS rebuild, strangler |
|---|---|---|---|
| Effort to parity (dev-days, AI-assisted, solo) | n/a; 6-10 d for the critical bug set only | 26-34 | 30-38 |
| Effort to A+ on every audit category | not reachable | 40-52 (parity, then refactor to tokens/a11y/TS) | 38-50 (parity and A+ done per component in one pass) |
| A+ ceiling | B to B+ overall. Cannot split the 2.28 MB monolith, cannot restructure markup for a11y, mobile Perf unlikely past roughly 75-85 | A- (JS, inline styles, refactor debt) | A+ |
| Failure risk | 2 (unbounded, invisible) | 3 | 4 (bounded by the parity harness) |
| Regression risk at release | 1 per patch, untestable | 2 at cutover unless a harness is added, at which point it converges on C | 4 |
| Maintainability afterwards | 1 (no source) | 3 | 5 |
| Time to first visible improvement | 5 (hours) | 2 (weeks) | 3 (about 2 weeks via sub-pages and bridge patches) |
| Reversibility | 4 | 4 | 5 (Netlify "Publish deploy" is instant and atomic; `/classic/` retained) |
| Fit for a solo, AI-assisted workflow | 1 (no ground truth) | 3 | 5 (typed, tested, spec-driven) |
| Weighted total (risk 25 %, ceiling 25 %, regression 20 %, maintainability 20 %, effort 10 %) | 1.9 | 2.9 | **4.3** |

Why B loses despite similar effort: (1) RECON's reuse value is small (list below); (2) B would ship parity on an architecture that then needs a second rewrite for A+; (3) B still needs the same parity harness, so its only saving is a head start of about four days that the wrong adapters consume.

### 6.3 Recommendation

**Strategy C, executed as a strangler with the parity harness built first, RECON demoted to a salvage quarry, and Strategy A kept alive only as a scripted, asserted, versioned bridge until cutover.**

Salvage list from RECON (each verified in section 3): `DistanceTool` math and seam logic, `LocationLabels` coordinate list, `MapLayers` ids, `HelpModal` text and shortcut list, `BookmarkPanel` markup, `monuments.json` (512 entries, to be renamed; verified identical to the deployed inline literal), `monument_story_markers.json` (20, to be renamed), splash CSS.

Do not salvage: `dataLoader`, `store` shape, `App`, `CommanderToasts`, `SearchPanel`, `OrderOfBattle`, `UnitRoster`, `FilterPanel`, `AncestorTracker`, the `StreetView` grid, `OnboardingModal`, `VirtualWalkthrough` and `tourStops` (superseded by `d2.json`), `MapView`, `BootSplash`, `sw.js`, the `index.html` additions (`#map-lcp-placeholder`, Google Fonts), `package.json` (phantom `vite-plugin-pwa`). Freeze RECON as `legacy/recon-2026-07-30/` (read-only, tagged) and never copy its `public/` over the deployed tree.

### 6.4 Phased plan (git init to cutover)

| Phase | Work | Days | Exit gate |
|---|---|---|---|
| 0. Freeze, archive, baseline | Copy every gettysburg-related zip from Downloads to cold storage outside the repo; write `ARCHIVE_MANIFEST.tsv` (name, mtime, size, sha256, main-bundle name and md5, lineage note) using `zipscan.py`; `git init` a **private** repo; commit `legacy/dist/` = current deploy with the five lower-cased asset names restored to the case the HTML references (`index-Cg8FAMXN.js`, `index-B4G7Z_2G.css`, `BookmarkPanel-C5YT4b5k.js`, `HelpModal-CFV9T0zH.js`, `InterpolationWorker-ufiwa2-e.js`), `legacy/analysis/bundle.pretty.js`, `legacy/recon-2026-07-30/`; tag `legacy-2026-09-29`. Connect Netlify to the repo with `publish = "legacy/dist"` and no build. Restrict the Mapbox and Google keys by referrer. | 1.5 | Git-driven deploy is byte-identical to production for every path (hash manifest); all referenced assets return 200 on a case-sensitive host |
| 1. Parity harness | Section 6.6, built against `legacy/dist` served locally, before any new app code | 4-5 | Legacy-vs-legacy run: zero diffs on 3 consecutive runs; data goldens committed |
| 2. Foundations | pnpm workspace, TS strict, current stable Vite, React 18.3.1, zustand 4.5.7 with selectors, mapbox-gl 3.24.1 pinned; `tokens`, `time.ts` (+ `ticks.json`), `data/` layer with zod, `deeplink.ts`, `storage.ts` (migrates old keys), `Dialog`/`Toast`/`Icon` primitives, hotkey registry, lint (eslint + jsx-a11y + stylelint), vitest, size-limit | 4-5 | `pnpm test` green; a11y primitives pass axe in isolation |
| 3. Core | Unit engine (keyframes, pure), Mapbox-layer renderer, playback loop outside React, timeline, HUD, unit panel, story/event/toasts | 8-10 | Parity T1 exact for 675 ticks; T2 diffs only from the intended-diff registry; INP lab < 200 ms during playback at 8x |
| 4. Desktop panels | Search, filter, legend, minimap, roster, OOB (with a toolbar entry), ancestor, bookmarks, help, layers, distance, locations, story-marker icons, overlay layers | 6-8 | Same gate per panel; a panel merges only when its checkpoints pass |
| 5. Mobile | One responsive shell, 44 px targets, tools sheet, safe areas, layout auto-detect and persistence | 4-5 | 320/375/390/768 checkpoints pass; every sheet item opens something |
| 6. Walkthrough, tour, onboarding, sound decision | `walkthrough_stops.json` from `d2.json`, NPS tour from `nps_auto_tour_th.json`, first-run flow, sound keep or remove per decision | 4-5 | Deep-link and tour checkpoints pass |
| 7. Sub-pages (parallel with 3-6) | Astro site, shared layout/nav/footer/tokens, batches of 4-5 pages | 6-8 | Old-sitemap crawl: every URL 200 or 301 to canonical; Lighthouse >= 95 per page |
| 8. Hardening and canary | CSP enforcement, SW rollout, Lighthouse CI budgets, RUM wiring, canary 10 % to 50 % to 100 % | 4-5 | RUM p75 green for a full week |

Total 38-50 solo, AI-assisted developer-days including the parallel sub-page track. Phase 0 and the bridge patches (6.10) deliver visible fixes within the first two weeks.

### 6.5 Renderer note (carry into Phase 3)

`deploy:unit-rendering-reference.html` is the owner's own "working, tested proof of concept" of four upgrades (smooth interpolation, bearing-driven icons, collision avoidance, engaged halo). It already contains the right data model: per-unit sorted keyframes, `placementAtOrBefore` by binary search, `nextPlacementAfter`, `angleLerp`, a Mapbox symbol layer with `icon-rotate`, `icon-allow-overlap:false`, `symbol-sort-key` by strength, and a circle halo layer. That replaces the legacy 2D overlay canvas, the adjacent-tick lerp `y1` and the global accumulator `i2`. Consequence for parity: the renderer cannot be pixel-compared with the old canvas. Compare **semantics** (unit set, coordinates at recorded ticks, bearing, strength, disposition) and use SSIM only as a smoke test.

### 6.6 Parity harness specification

Tooling: Playwright (Chromium desktop and mobile emulation; WebKit and Firefox smoke), Vitest for data goldens, `@axe-core/playwright`, `lighthouse-ci`.

Determinism:
- Serve `legacy/dist` locally; run the new build via `vite preview`.
- `page.route` every `api.mapbox.com` style, sprite, glyph and tile request and fulfill a stub style (`{version:8, sources:{}, layers:[{id:'bg', type:'background', paint:{'background-color':'#20242c'}}]}`) so pixels and timing never depend on Mapbox; block `events.mapbox.com`. Use Playwright's fake clock for animations, freeze `Date`, seed `Math.random`.
- Every checkpoint starts from a **fresh page load** and a scripted, identical navigation, because the legacy renderer is history-dependent (P-22).

Three comparison tiers:
1. **T1, data (exact, unit level).** Extract the legacy pure functions (`y1`, `F4`, easing, `iF`, `zp`, `Hk`, `vF`) into `legacy/spec/*.js` with a fresh accumulator and forward traversal and emit goldens for all 675 ticks (unit ids, lat, lng, bearing, strength, disposition). The new engine must match at every recorded keyframe. Also goldens for loader output (712 raw OOB records, 705 keys, 694 + 1,110 placements, 188 ticks, 478 unit ids), commander-succession lookups and search results for a fixed query list.
2. **T2, DOM and accessibility tree (exact modulo registry).** Text and ARIA snapshot of each panel at each checkpoint. The legacy app code contains no `aria-*` or `role` attributes (zero between lines 96,209 and 113,377), so T2 against legacy compares visible text and structure; the new build must additionally pass axe.
3. **T3, visual (tolerance).** Screenshot with the map stubbed; mask the HUD clock; SSIM >= 0.98 for chrome (toolbar, panels), advisory for the unit layer.

Observable state on legacy (no globals): "Tick N/675" text (`IO`, 112202), unit panel text (`MF`), toolbar labels, panel presence by visible heading, `localStorage`, request log, console log.

Checkpoints (minimum): first visit at 1440x900 and 375x812 through splash, chooser and each onboarding branch; returning visit; ticks 1, 12, 17, 28, 53, 226, 267, 302, 451, 538, 548, 551, 675; day buttons and skip 1 h; speeds; Space, arrows, shift-arrows, 1-3, +, -, 0, f, s, l, m, b, ? and Esc in and out of an input; search "20th Maine" and "Longstreet"; filter toggles; roster; OOB; legend tabs; minimap click; `?ancestor=U-20ME`; distance tool two clicks; layer toggles; locations; bookmarks add, share, reload; help tabs; walkthrough stops 1, 5, 16 and monument group filter; NPS tour stop 5; Soldier's Eye; every sub-page deep link (P-62); viewports 320, 375, 390, 768, 1024, 1440, 2560 and landscape 812x375; `prefers-reduced-motion`; offline reload; no-JS; console-error diff (new must be a strict subset of legacy).

**Intended-diff registry** (`docs/parity/intended-diffs.yml`): each entry carries audit id, checkpoint, rationale, expiry. Seed with C3/C4 (clock and date), C1/C2 (mobile), C5, C6, H2, H3, H4, H5, H9, H10, H11, H12, D3 and "ghost units" (P-22). Anything not in the registry fails the build.

Non-parity gates in the same harness: request count before first interaction (legacy: 34 JSON requests plus assets), console warnings, Lighthouse budgets, JS budget.

### 6.7 Feature flags and strangler routing

- Flags module `flags.ts`: sources in priority order: URL `?ff=a,b` (session), `localStorage['gtbg:ff']`, remote `/flags.json` (`no-cache`, 1 s timeout, safe defaults), build defaults. Flags: `renderer`, `mobileShell`, `walkthrough`, `tour`, `sound`, `deeplink`, `newSW`. The remote file is the kill switch (disable a panel without a deploy).
- Routing: the new app is built to `/next/` (noindex by header and robots), with no service worker registered there until cutover; root keeps serving legacy. Sub-pages migrate by URL (same path, same content, new implementation), so they are strangled per page. Panels cannot be mixed inside one React tree with the frozen bundle, so the per-panel dimension lives inside the new app: each panel ships behind a flag and shows a "Classic version" link to `/classic/` until its checkpoints pass.
- At cutover: publish the new app at `/`, move legacy dist to `/classic/` (noindex, `Cache-Control: no-cache`), keep it 60 days.
- Netlify Split Testing needs a Git-connected site with branch deploys and at least two deployed branches; `netlify deploy --alias` deploys are not eligible (Netlify docs). That is a second reason Phase 0 connects the repo.

### 6.8 Rollback

1. Netlify "Publish deploy" on the previous production deploy: atomic and instant, no rebuild (Netlify docs).
2. Remote kill-switch flags for panels and the SW.
3. Data versioning: new data lives under `/data/v2/` (content-hashed); legacy `/data/*.json` names stay frozen so the old bundle and `/classic/` never break.
4. Service worker: the new SW is a migration SW (deletes `gbg-*` caches, no auto-reload). If a canary shows a bad SW, ship a `sw.js` that unregisters itself; `sw.js` is already served `no-store`.
5. Storage: new keys are namespaced (`gtbg:v2:*`); old keys are read but never deleted for one release, so a rollback to legacy keeps users' bookmarks.

### 6.9 What Phase 0 must not do

Do not make the repo public, do not deploy from it while `publish="."` with any source present, and do not let any tool overwrite `data/` from RECON.

### 6.10 Bridge patches for strategy A (scripted, temporary)

Until cutover, critical defects can be fixed in the legacy bundle by a **patch runner** (`legacy/patches/*.mjs`) that: reads `legacy/dist/assets/index-*.js`; applies exact-string replacements with an asserted occurrence count of 1; emits a **new content-hashed filename**; rewrites references in `index.html`, the `sw.js` precache list and the lazy-chunk import specifiers; runs the parity harness; and refuses to run twice. Candidate patches, each small: define or remove the `setGoldUnit/clearGoldTrail/drawGoldTrailSegment` calls (C5); define `CanvasRenderer` locally or drop the branch (sound freeze); parse `tick`, `unit`, `t`, `u` on boot (8 dead links); mobile `playRow` `flexWrap` and smaller gap and buttons (C1); `GF` to a selector hook (H11); remove the `controllerchange` reload and stop hard-coding hashed names in `sw.js` (C6). Retire the runner the day `/` serves the new build.

---

## 7. Repository layout, static-page tooling, tokens, data pipeline, CI

### 7.1 Layout (pnpm workspace, four packages at most for a solo developer)

```
gettysburg/                        private GitHub repo, main + next branches
  README.md  CONTRIBUTING.md  .nvmrc  .env.example  .gitignore  netlify.toml
  docs/  adr/ (0001-source-of-truth, 0002-dependency-matrix, ...)  parity/intended-diffs.yml
  legacy/                          READ-ONLY, tagged
    dist/                          current deploy, correct-case filenames
    analysis/bundle.pretty.js  spec/*.js  extracted/*.json  (tmp-prov-recon assets)
    recon-2026-07-30/
    patches/                       bridge runner (retire at cutover)
  apps/
    web/                           Astro: index + 20 feature pages + privacy/terms/404/embed
      src/pages/*.astro  src/layouts/Base.astro  src/components/{SiteNav,Footer,Icon,SEO}.astro
      public/{icons,screenshots,robots.txt,manifest.webmanifest,user-guide.pdf}
    map/                           React + TS map app (library mounted by apps/web index page)
      src/{app, features/{playback,units,unit-panel,story,search,filter,legend,minimap,roster,oob,
           ancestor,bookmarks,help,layers,distance,walkthrough,tour,onboarding,mobile,sound?},
           lib/{time,engine,geo,data,storage,deeplink,flags,hotkeys}, store, styles}
  packages/
    tokens/                        tokens.json -> CSS variables + TS types (colors, type, space, z-index)
    data-schema/                   zod schemas -> JSON Schema + types (units, placements, chronology,
                                   vignettes, walkthrough, monuments)
  data/
    raw/  curated/  build/         authoring inputs, curated JSON, generated /data/v2 output + manifest
  pipeline/                        ingest, normalize, validate, build-search-index (Historian corpora plug in here)
  tests/  parity/  e2e/  a11y/  perf/   (playwright, axe, lhci configs)
  .github/workflows/  ci.yml  e2e.yml  a11y.yml  lhci.yml  parity.yml  links.yml
```

Archives: keep the zips **outside** git (cold storage plus `ARCHIVE_MANIFEST.tsv` in `docs/`). They contain the public tokens and 29 MB variants.

### 7.2 Static pages: Vite MPA vs Astro vs 11ty

Current reality: 20 feature pages plus legal, 404 and embed are hand-written HTML with a copy-pasted `<head>` (title, description, canonical, 8 OG/Twitter tags) and an inline `<style>`; shared behavior comes from runtime `site-nav.js` (`window.GTBG_MENU`, injected nav and footer) and `icons.svg`. Pages use a different gold (`#c9a24b`) from the app (`#c8a84a`, `#8b6914`, `#e8d5a3`).

| Criterion | Vite MPA | Astro (static) | 11ty |
|---|---|---|---|
| Templating and shared head | needs a plugin (handlebars/posthtml); weak | first-class layouts and components | first-class (Nunjucks) |
| Typed content and data | manual | content collections with zod; JSON imports | data cascade, untyped |
| Sitemap, canonical, JSON-LD | manual | `@astrojs/sitemap`, layout helpers | plugins |
| Hosting the React map | native | island (`client:only="react"`) or library import | needs a second bundler |
| CSP without `'unsafe-inline'` | possible | scripts and styles emitted as external hashed files with the right settings | possible, manual |
| Toolchain count | 1 | 1 (Vite underneath) | 2 |
| Migration cost of 20 pages | M per page (no templating) | S-M per page | S-M per page |
| Score | 3 | **5** | 3.5 |

Recommendation: **Astro static output**. `apps/web/src/pages/index.astro` holds the inline HTML boot splash and crawler-visible `<main>` text, then mounts the map. Keep `.html` canonical URLs to avoid SEO churn (`build.format: 'file'`), add 301s for the extensionless forms and `/index.html` (T3), regenerate the sitemap to include the legal pages (E5), and give `embed.html` its own header rule (X4). I verified none of the Astro option names against current docs (no build allowed); treat them as the intended configuration to confirm in Phase 2.

### 7.3 Shared tokens (`packages/tokens/tokens.json`)

Seed values observed in code: bg `#0a0a14`; panel `#12121e` (pages) and `#0f0f1a`, `rgba(8,8,18,.96)` (app); ink `#e8e6df`; muted `#8a93a8`; gold `#c9a24b` (pages) versus `#c8a84a`, `#8b6914`, `#e8d5a3`, `#d4a840` (app); union `#3a6bc4`; confederate `#c43a3a`. App z-index values range over 1, 6, 8, 9, 10, 85, 88, 92, 95, 100, 150, 160, 200, 300, 400, 500, 600, 700, 900, 950, 999, 1000 and the Extra Features overlay uses 999999. Replace with a named scale (`--z-map`, `--z-overlay`, `--z-hud`, `--z-panel`, `--z-modal`, `--z-toast`). Enforce with stylelint: no raw hex, no numeric z-index, minimum font-size 12 px, minimum hit target 44 px under `(pointer: coarse)`. Contrast is a build check (generate the token pairs and fail below 4.5:1).

### 7.4 Data pipeline directory

`data/raw` (as received), `data/curated` (hand-reviewed JSON, source and confidence per record), `pipeline/*` (ingest, normalize, validate, build) emitting `apps/web/public/data/v2/` with a content-hashed name per file plus `manifest.json`. Validators: unique ids; ticks within 1..675; lat/lng inside the map's `maxBounds`; every regiment's `parent_brigade_id` resolves; every commander has a `name`; every claim carries a source id. Historian corpora and the search index build live here (the Historian plan plugs into `pipeline/build-search-index`).

### 7.5 CI (GitHub Actions)

`ci.yml`: install with lockfile, eslint (react-hooks, jsx-a11y), stylelint, `tsc --noEmit`, vitest, build, size-limit, knip (dead exports), gitleaks, osv-scanner, hashed-asset assertion (T-02). `e2e.yml`: Playwright matrix. `a11y.yml`: axe on every route at desktop and mobile. `lhci.yml`: mobile and desktop budgets (LCP <= 2.5 s, TBT <= 200 ms, CLS <= 0.1, FCP <= 1.8 s, performance >= 95). `parity.yml`: legacy vs new, nightly and on a PR label. `links.yml`: lychee over the built site and sitemap. Netlify deploy previews on every PR with a required status. Add a probe against the preview (`/src/*`, `*.md`, `/package.json` must 404).

---

## 8. Trap catalogue

| ID | Trap | Evidence | Mitigation |
|---|---|---|---|
| T-01 | Case-mangled deploy zip: five `assets/*` names lower-cased; Netlify is case-sensitive; `sw.js` precache and both lazy chunks reference the original case; `cache.addAll` fails SW install if any URL 404s | `deploy:assets/` listing; `deploy:sw.js:6-7`; chunk heads (`from"./index-Cg8FAMXN.js"`) | Restore case in `legacy/dist` (Phase 0); never deploy the downloaded zip as-is |
| T-02 | Same filename, different bytes (4 variants of `index-Cg8FAMXN.js`, plus a hand-renamed fifth) plus `immutable` caching and SW cache-first for `/assets/*` | section 2; `deploy:netlify.toml` `/assets/*` rule; `deploy:sw.js` cache-first block | Build only in CI; assert content hash equals name; compare against the last production `asset-manifest.json`; never patch dist in place |
| T-03 | `publish = "."` with no build | `deploy:netlify.toml:1-2` | `publish="dist"`, build command, 404 rules for `/src/*`, `*.md`, config files; preview probe |
| T-04 | `monuments.json` name collision (RECON 512-item array vs deployed `{_note, monuments:[9]}` consumed by `deploy:index.html:677-679`) | `cmp_data.py` | New names `monuments_directory.json`, `story_markers.json`; delete the star overlay script |
| T-05 | RECON data is older: mojibake in `union_oob_corps_division.json`, older PDF, 32 px touch icon | section 5.3 | Data of record is the deployed `data/` |
| T-06 | Dead code carried over "deliberately" (RECON PENDING) | section 3; finding 32 | Decide per item; delete by default |
| T-07 | Sound: RECON deleted the toggle, but the deployed renderer still calls the sound engine, the HTML banner promises "live sound", `immersive.html` uses `AudioContext`; the guide may too (unchecked) | 96554-96557; `deploy:index.html:377`; `immersive.html` | Decide keep or remove for the whole product (finding 29) |
| T-08 | Tokens in client and in source: Mapbox `pk.` token at `bundle.pretty.js:97210` and `102899`, in 9 HTML pages, and as a default in `recon:src/components/MapView.jsx:19`; Google Maps key at 110610 | greps | Restrict by referrer now; env only; gitleaks; private repo until history is clean |
| T-09 | Mapbox attribution disabled on the mobile map (102988), the walkthrough map (110777) and RECON's main map | greps; Mapbox attribution docs | Restore attribution (finding 9) |
| T-10 | Storage compatibility: bookmarks key `gettysburg_bookmarks` vs RECON `gtbg_bookmarks`; record shape differs | 97821; `recon:BookmarkPanel.jsx:16` | Migration in `storage.ts` |
| T-11 | Deep-link vocabularies conflict (`tick/unit/vignette` vs `t/u/z/ll` vs `ancestor`) and none is parsed except `ancestor` | P-62 | Single router with aliases |
| T-12 | Legacy rendering is history-dependent (`i2` accumulator), so parity runs must start fresh | 96265-96291 | Harness rule; explicit carry-forward semantics in the new engine |
| T-13 | Clock logic duplicated in six places with two formulas and two date conventions, none consistent with the tour subtitles; RECON adds a third combination (5:00 base with July {day+2} in the store) | section 3.7 | One `time.ts` |
| T-14 | The old service worker stays installed on returning users' browsers and controls `/` after cutover | `deploy:index.html:255-277` | Migration SW; `sw.js` stays `no-store`; test old-SW to new-SW upgrade |
| T-15 | RECON `index.html` drops SEO essentials (canonical, OG, JSON-LD, noscript text) and the SW registration | `recon:index.html` | Do not copy RECON's HTML; the Astro base layout carries SEO |
| T-16 | RECON `#map-lcp-placeholder` stacking bug and never-removed-on-mobile | section 5.2 | Do not port |
| T-17 | Per-frame React state updates (`_F`, `KF`, splash, RECON MonumentsLayer) | 97423, 100854-100868, 101496-101505 | Engine outside React, selectors, throttle |
| T-18 | Undefined identifiers in production paths (`setGoldUnit`, `clearGoldTrail`, `drawGoldTrailSegment`, `CanvasRenderer`) | greps | TS strict and `no-undef`; error boundary; harness console gate |
| T-19 | `fF` never receives its props; `nO` filters on a nonexistent field; `GF` misuses `subscribe`; dead mobile tool targets | 97384; 101679; 99650; 103419-103470 | Rewrite; do not port |
| T-20 | Options Mapbox ignores (`dragPan.inertia*`, `scrollZoom.speed/smooth`) | 97248-97249 vs 88952, 89624 | Use documented options |
| T-21 | v3 requires WebGL 2; unsupported devices get a blank map | Mapbox v3.0.0 release notes | `mapboxgl.supported()` guard and message |
| T-22 | Three separate Mapbox map instances (main, mobile shell, walkthrough) plus per-page maps; each `new Map` is a map load | 97237, 102981, 110770 | One shared map component/loader; restrict token |
| T-23 | CSP: report-only, `'unsafe-inline'`, missing RUM host, missing `www.nps.gov` in `frame-src` (NPS tour iframe, `Zr.pip`), inline scripts in `index.html` | `deploy:netlify.toml`; 100323+ | Astro external scripts; enforce after a report-only soak |
| T-24 | `embed.html` receives both site-wide `X-Frame-Options: DENY` and `frame-ancestors *`; setting `X-Frame-Options = ""` does not remove it | `deploy:netlify.toml` embed block | Do not send the site-wide DENY on that path (path-scoped headers) or use CSP `frame-ancestors` everywhere |
| T-25 | Lazy chunks import symbols from the entry (entry exports `TF, RO, j, kO, r, PO, IF, yn`) | end of bundle; chunk heads | `manualChunks` shared chunk; no entry imports |
| T-26 | Orphan `InterpolationWorker-*.js` still shipped | 0 references in `bundle.min.js` | Delete |
| T-27 | Phantom dependency (`vite-plugin-pwa`), no lint, tests or TS in RECON | `recon:package.json` | Start clean |
| T-28 | OG and PWA screenshots are invalid PNGs and identical | section 5.3 | Regenerate (finding 42) |
| T-29 | bfcache contract: sub-pages return to the map with `history.back()` | `site-nav.js` `wireBackLinks` | No `unload` handlers; Playwright `pageshow.persisted` test |
| T-30 | `dangerouslySetInnerHTML` on tour history (`<span class='lead'>`) | 110653 | Structured content; no innerHTML |
| T-31 | Dev page `unit-rendering-reference.html` is public (noindex only) and loads Mapbox from a CDN | `deploy:unit-rendering-reference.html:8-10` | Move to `/dev/`, excluded from prod builds after the renderer ships |
| T-32 | `robots.txt` differs between trees (RECON adds `Disallow: /diagnostics.html`) | both files | One robots source in Astro |
| T-33 | Zero `aria-*` or `role` attributes in app code; the only `tabIndex` is the timeline wrapper (112223) | grep of 96,209-113,377 | a11y primitives first (finding 46) |
| T-34 | `y1` is called inside a React effect and mutates module state | 97324 | Pure engine |

---

## 9. Findings (actionable plan items)

Severity: critical, high, medium, low. Effort: S <0.5 d, M 0.5-2 d, L 2-5 d, XL >5 d. `audit_refs` use the BRIEF ids; an empty list means the item is new. Evidence line numbers refer to `bundle.pretty.js` unless prefixed `deploy:` or `recon:`.

| ID | Severity | Effort | Title |
|---|---|---|---|
| prov-recon-01 | critical | XL | Adopt Strategy C (TypeScript strangler rebuild); demote RECON to a salvage quarry; keep A only as a scripted bridge |
| prov-recon-02 | high | M | Phase 0: archive all zips, git init a private repo, commit the baseline of record, and prove a Git-driven deploy is byte-identical |
| prov-recon-03 | critical | L | Build the parity harness first (data goldens, DOM/ARIA snapshots, visual smoke, intended-diff registry) against a hermetic legacy build |
| prov-recon-04 | high | M | Implement one deep-link router; today 8 sub-page and embed links land on the default map and share links do nothing |
| prov-recon-05 | high | M | Stop reusing filenames for different bytes: enforce content-hash naming and build-only-in-CI |
| prov-recon-06 | high | S | Change netlify.toml from publish="." to a build/publish pair before any source enters the repo |
| prov-recon-07 | high | S | Resolve data name collisions and never copy RECON's public/ over the deployed tree |
| prov-recon-08 | high | M | Restrict and stop shipping-in-source the Mapbox and Google keys; add secret scanning before the first commit |
| prov-recon-09 | high | S | Restore Mapbox attribution on the mobile, walkthrough and (RECON) main maps |
| prov-recon-10 | medium | S | Pin mapbox-gl 3.24.1, guard WebGL 2, and drop no-op map options |
| prov-recon-11 | high | M | Rewrite the data layer to the deployed contract (712 OOB records, lazy days, density files, tolerant fetches) |
| prov-recon-12 | critical | XL | Replace the canvas renderer and stateful interpolation with a pure keyframe engine and Mapbox symbol layers |
| prov-recon-13 | critical | M | Single tick-to-clock module driven by a tick-to-timestamp table; remove the +2 date offset and the duplicate formulas |
| prov-recon-14 | critical | XL | Build one responsive mobile experience instead of the separate pO shell (fixes C1, C2 and 5 dead controls) |
| prov-recon-15 | high | L | Move the playback clock out of React and remove per-frame state updates (splash, HUD, story-marker layer) |
| prov-recon-16 | high | M | Redesign boot: HTML splash only until first map idle, no React splash on returning visits, no HTML-to-React swap |
| prov-recon-17 | critical | M | Replace sw.js and the controllerchange reload with a versioned, update-prompting service worker plus a migration SW |
| prov-recon-18 | low | S | Do not port RECON's Google Fonts change; fix the two real CLS sources |
| prov-recon-19 | high | M | Code-splitting and asset plan for mapbox-gl 3.24.1 with measured budgets |
| prov-recon-20 | medium | S | Freeze the dependency matrix and record bundle identity in ADR 0002 |
| prov-recon-21 | medium | S | Define the store contract in TypeScript with selectors and drop 13 dead members |
| prov-recon-22 | high | L | Rebuild the Unit panel (commander succession, strength bar, key action, history) with resolved parent chain and data-driven alerts |
| prov-recon-23 | high | M | Unify story panel, event card and commander toasts into one notification system with correct auto-dismiss and Esc behavior |
| prov-recon-24 | high | L | Rebuild Search, Filter, Legend, Minimap, Roster and Order of Battle against the real data shapes (fixes H5, H11, D4) |
| prov-recon-25 | high | M | Rebuild Follow Your Ancestor with a defined gold trail and a working ?ancestor= entry |
| prov-recon-26 | high | M | Extract Walkthrough and Soldier's Eye data to schema-validated JSON; do not use RECON tourStops |
| prov-recon-27 | medium | M | Extract NPS Auto Tour, story markers and the 512-monument directory into data with sources and corrected times |
| prov-recon-28 | high | M | First-run flow and layout persistence: merge chooser and onboarding, auto-detect device, remember the choice |
| prov-recon-29 | medium | S | Decide the sound policy for the whole product and remove the undefined-global freeze |
| prov-recon-30 | high | M | Retire the index.html hook scripts and integrate Extra Features and Ask the Historian into the toolbar |
| prov-recon-31 | medium | S | One hotkey registry: Esc works everywhere, no duplicate handlers, Help generated from the registry |
| prov-recon-32 | low | S | Disposition table for dead code and unfinished features (delete by default) |
| prov-recon-33 | medium | S | Storage migration module for old keys and bookmark shape |
| prov-recon-34 | high | M | Design tokens and CSS architecture (one gold, z-index scale, 12 px minimum, 44 px targets) |
| prov-recon-35 | high | L | Repository layout and Astro for the 20+ static pages |
| prov-recon-36 | high | L | Sub-page migration runbook that preserves URLs, bfcache back-navigation and embed behavior |
| prov-recon-37 | high | M | Data pipeline directory with schemas, validators and versioned /data/v2 output |
| prov-recon-38 | high | M | CI/CD pipeline with a11y, perf, parity, link and secret gates |
| prov-recon-39 | high | M | Cutover, feature flags and rollback runbook |
| prov-recon-40 | high | M | Scripted legacy bridge patches for the critical defects (asserted, versioned, retired at cutover) |
| prov-recon-41 | medium | S | Effort roll-up and critical path |
| prov-recon-42 | medium | S | Regenerate the OG and PWA screenshots and fix manifest hygiene |
| prov-recon-43 | low | S | Delete the orphan InterpolationWorker chunk and remove entry-chunk imports |
| prov-recon-44 | medium | L | Spec-extraction task: per-component spec sheets from bundle.pretty.js |
| prov-recon-45 | medium | M | Cut the boot request waterfall (34 JSON requests, duplicate chronology fetch, unused terrain) |
| prov-recon-46 | high | M | Accessibility primitives first: Dialog, landmarks, labelled controls, live regions, target sizes |

### prov-recon-01: Adopt Strategy C (TypeScript strangler rebuild); demote RECON to a salvage quarry; keep A only as a scripted bridge

- **Severity / effort:** critical / XL
- **Audit refs:** N1
- **Depends on:** none
- **Evidence:** RECON parity tally (section 3.8): 4 verified, 8 verified-with-defect, 8 different, 9 wrong, 25 missing of 62 surfaces; running RECON's own OOB flatten on the real data gives 0 entries (deployed logic gives 705, script recon_loader_test.mjs); recon:src has no rAF playback loop and mobile mode renders nothing (recon:src/App.jsx:153). The deployed bundle (md5 7ef75b95f4, 2,280,438 B) is frozen since Jul 29 and 81% of it is vendored mapbox-gl 3.24.1, so the app logic is about 17k readable lines in bundle.pretty.js:96209-113377.
- **Root cause:** No source of truth exists (N1). The only reconstruction is a partial JavaScript port on the wrong mapbox major with wrong data adapters, and patching the minified bundle has already produced undefined identifiers in production paths (bundle.pretty.js:96556, 101086).
- **Fix:** Decision recorded as docs/adr/0001-source-of-truth.md. Execute section 6: Phase 0 archive and byte-identical Git deploy; Phase 1 parity harness before any app code; Phases 2-6 TypeScript rebuild under /next/ behind flags with the deployed bundle as executable spec; Phase 7 Astro sub-pages in parallel; Phase 8 hardening and canary. RECON is frozen under legacy/recon-2026-07-30/ and only the salvage list in 6.3 is copied. Strategy A survives only as the scripted patch runner in finding 40 and is deleted at cutover.
- **Acceptance test:** ADR merged; legacy tag exists; parity harness green legacy-vs-legacy (finding 03) before the first line of new UI code; at cutover every audit category has an A+ verification test in CI (axe, Lighthouse CI, parity).
- **Metric or grade moved:** Enables A+ in every category and green Core Web Vitals; removes the maintainability ceiling (Documentation, Reliability, Fit and finish).

### prov-recon-02: Phase 0: archive all zips, git init a private repo, commit the baseline of record, and prove a Git-driven deploy is byte-identical

- **Severity / effort:** high / M
- **Audit refs:** N1
- **Depends on:** none
- **Evidence:** 16 gettysburg zips scanned by zipscan.py (section 2); deploy zip has five lower-cased assets (deploy:assets/ vs deploy:index.html:282 referencing index-Cg8FAMXN.js); deploy:netlify.toml:1-2 publish = "."; Downloads holds v2..v37 and dozens of variants with no manifest.
- **Root cause:** There is no repo, no lineage record and the downloadable deploy zip is not redeployable as-is (case).
- **Fix:** 1) Copy zips to cold storage outside the repo; write ARCHIVE_MANIFEST.tsv (name, mtime, size, sha256, main bundle name+md5, lineage). 2) git init (private). 3) Commit legacy/dist with the five asset names restored to the case referenced by index.html, sw.js and the two chunk imports; add legacy/analysis/bundle.pretty.js and legacy/recon-2026-07-30/. 4) Tag legacy-2026-09-29. 5) Connect Netlify to the repo with publish=legacy/dist, no build command. 6) Restrict the Mapbox and Google keys by referrer (finding 08). 7) Crawl index.html plus sw.js precache list and HEAD every asset.
- **Acceptance test:** sha256 of every file served by the Git-driven deploy equals the manifest of the current production deploy; all 119 files return 200 on Netlify (case-sensitive); the SW install (cache.addAll) succeeds in a clean profile.
- **Metric or grade moved:** Reliability (redeploy safety), Documentation; unlocks rollback and split testing.

### prov-recon-03: Build the parity harness first (data goldens, DOM/ARIA snapshots, visual smoke, intended-diff registry) against a hermetic legacy build

- **Severity / effort:** critical / L
- **Audit refs:** N1
- **Depends on:** prov-recon-02
- **Evidence:** Legacy exposes no state (the store yn at bundle.pretty.js:9361 is not global); legacy rendering is history-dependent (module-level i2 at 96265, never cleared); Mapbox tiles are non-deterministic; the legacy app code has zero aria/role attributes (grep 96209-113377); Lighthouse layout-shift audit shows motion sources (splash swap, #extra-features mover).
- **Root cause:** Without a harness a rewrite cannot prove behavior parity or distinguish intended fixes from regressions.
- **Fix:** Implement section 6.6: serve legacy/dist locally; stub Mapbox style/tiles/events via page.route; fake clock; fresh page per checkpoint; T1 data goldens from extracted legacy pure functions (y1, F4, iF, zp, Hk, vF) for all 675 ticks; T2 text/ARIA snapshots; T3 SSIM smoke; console and request diffs; checkpoint list (ticks, panels, shortcuts, deep links, viewports 320-2560, offline, no-JS, reduced motion); docs/parity/intended-diffs.yml keyed by audit id with expiry.
- **Acceptance test:** Three consecutive legacy-vs-legacy runs produce zero diffs; deliberately mutating one legacy string makes exactly the expected checkpoints fail; registry lint rejects entries without an audit id or expiry.
- **Metric or grade moved:** Regression control for every category; prerequisite for safe A+ work.

### prov-recon-04: Implement one deep-link router; today 8 sub-page and embed links land on the default map and share links do nothing

- **Severity / effort:** high / M
- **Audit refs:** H3
- **Depends on:** prov-recon-03
- **Evidence:** Only get("ancestor") exists in the bundle (bundle.pretty.js:101019); sub-pages emit /?tick=N (turning-points.html:118), /?unit=ID&tick=N (regiment.html:247), /?tick=N&vignette=ID (historian.html:110), /index.html?unit=... and ?tick=...&vignette=... (search.html:114,127; embed.html CTA); the app emits ?t&u&z&ll (bundle.pretty.js:97823) and ?ancestor= (101117); RECON emits ?tick&unit and parses nothing.
- **Root cause:** Three deep-link vocabularies were built independently and the consumer side was never written; ?ancestor only works if the panel is already open.
- **Fix:** Add lib/deeplink.ts: parse on boot and on popstate: tick|t, unit|u, vignette, ancestor (auto-opens the panel), z, lat+lng or ll, layout; validate (tick 1..675, unit id exists); apply after data load; write canonical URLs (tick, unit, vignette, ancestor, z, lat, lng) via history.replaceState when a share action runs; keep the legacy aliases forever. Update sub-page link generators to the canonical vocabulary. Add all eight links plus the share round trip to the parity harness. Optional bridge patch (finding 40) parses tick/unit in legacy now.
- **Acceptance test:** Playwright opens each of the eight links and the share-link round trip: expected tick label, unit panel and vignette are shown; unknown or out-of-range params degrade to defaults without console errors.
- **Metric or grade moved:** Function and Usability (map deep links), SEO engagement (Turning Points/Historian/Search click-throughs), Reliability.

### prov-recon-05: Stop reusing filenames for different bytes: enforce content-hash naming and build-only-in-CI

- **Severity / effort:** high / M
- **Audit refs:** N1, C6
- **Depends on:** prov-recon-02
- **Evidence:** index-Cg8FAMXN.js appears with four different md5s (a6a94abc9c 2,279,751 B; 150ef117c1 2,280,389 B; 7ef75b95f4 2,280,438 B; b943b2fd9f 2,287,335 B) and a fifth hand-renamed index-Cg8FAMXN-v36.js (section 2); deploy:netlify.toml serves /assets/* immutable for a year; deploy:sw.js cache-first for /assets/; lazy chunks import ./index-Cg8FAMXN.js by name.
- **Root cause:** Previous sessions patched bundles in place and kept the name, which defeats content hashing; immutable caching plus cache-first SW then pins returning users to old code (and explains the comment at deploy:index.html:259-262 and the reload hack).
- **Fix:** Build only in CI from git. scripts/assert-hashed-assets.mjs: every dist/assets file name suffix must equal Vite's content hash; fetch the last production asset-manifest.json and fail if any name repeats with different bytes; generate the SW precache list from the build manifest (no hard-coded names); manualChunks so lazy chunks do not import the entry (finding 19). Keep /assets/* immutable only after this check exists.
- **Acceptance test:** Synthetic test: patching one byte in a built asset without renaming fails CI; a clean build passes; grep of lazy chunks finds no import from ./index-.
- **Metric or grade moved:** Reliability (stale-code incidents), RUM stability; supports P1 recovery.

### prov-recon-06: Change netlify.toml from publish="." to a build/publish pair before any source enters the repo

- **Severity / effort:** high / S
- **Audit refs:** N1, X3
- **Depends on:** prov-recon-02
- **Evidence:** deploy:netlify.toml:1-2 has [build] publish = "." and no command; only /package.json and /package-lock.json are 404-redirected; RECON README/PENDING say to carry netlify.toml forward unchanged.
- **Root cause:** The publish root is the repo root, so committed source, docs and config would be served publicly (including RECON MapView.jsx with a hard-coded token default).
- **Fix:** Set [build] command = "pnpm build", publish = "dist" (or apps/web/dist), NODE_VERSION pinned; keep legacy/dist publish only for Phase 0; add explicit 404 rules for /src/*, /*.md, /vite.config.*, /pnpm-lock.yaml, /tsconfig.json, /.github/*; add a preview probe in CI.
- **Acceptance test:** curl against a deploy preview returns 404 for /src/main.tsx, /README.md, /PENDING.md, /package.json, /pnpm-lock.yaml; only dist contents are reachable.
- **Metric or grade moved:** Security hygiene (B to A), Reliability.

### prov-recon-07: Resolve data name collisions and never copy RECON's public/ over the deployed tree

- **Severity / effort:** high / S
- **Audit refs:** H10
- **Depends on:** prov-recon-02
- **Evidence:** cmp_data.py: 69 identical, 2 different, 1 RECON-only. data/monuments.json is {_note, monuments[9]} in deploy (consumed by deploy:index.html:677-679) but a 512-item array in RECON; union_oob_corps_division.json in RECON has double-encoded UTF-8 (â€”) where deploy has --; RECON user-guide.pdf 9,282 B vs deploy 14,321 B; RECON apple-touch-icon is 32x32 (deploy 180x180); icon-192, favicon.ico and robots.txt differ.
- **Root cause:** RECON copied an older data snapshot and reused a live filename for a different schema.
- **Fix:** Data of record is deploy/data. Rename the new datasets to data/v2/monuments_directory.json (512) and data/v2/story_markers.json (20) with schemas; delete the star-overlay script (finding 30); import only the salvage list from RECON; add a data checksum manifest to the repo.
- **Acceptance test:** cmp_data.py style diff between legacy/dist/data and the frozen legacy tree shows zero changes; schema validation passes for the renamed files; no code path fetches /data/monuments.json after the overlay script is removed.
- **Metric or grade moved:** Historical/data consistency, Reliability.

### prov-recon-08: Restrict and stop shipping-in-source the Mapbox and Google keys; add secret scanning before the first commit

- **Severity / effort:** high / M
- **Audit refs:** X1, X2
- **Depends on:** prov-recon-02
- **Evidence:** Mapbox pk. token at bundle.pretty.js:97210 and 102899, in 9 static pages (camera, cinematic-export, compare, ground-remembers, immersive, sandbox, unit-rendering-reference, viewshed, watch-together) and as a default in recon:src/components/MapView.jsx:19; Google Maps key at bundle.pretty.js:110610; audit X1 measured a 200 with a foreign Referer.
- **Root cause:** Public browser tokens are unavoidable, but they are unrestricted and duplicated across 12 places, and RECON would commit one into source history.
- **Fix:** Now: restrict the Mapbox token to the production domain (and one preview domain) and the Google key to HTTP referrers plus the Maps Embed API only. Create three tokens (prod, preview, localhost). In the rebuild use env (VITE_MAPBOX_TOKEN) with no default; one shared config module for pages and app; .env.example; gitleaks in pre-commit and CI; keep the repo private until legacy/ is either scrubbed or explicitly accepted (the tokens are public but restricted).
- **Acceptance test:** A request with Referer https://example.org returns 403 for the production token; gitleaks passes on apps/ and packages/; the built site contains no token except the injected production one.
- **Metric or grade moved:** Security hygiene (B to A), cost control (map loads).

### prov-recon-09: Restore Mapbox attribution on the mobile, walkthrough and (RECON) main maps

- **Severity / effort:** high / S
- **Audit refs:** new (none)
- **Depends on:** prov-recon-10
- **Evidence:** attributionControl: !1 at bundle.pretty.js:102988 (mobile shell) and 110777 (walkthrough); recon:src/components/MapView.jsx:44 removes it from the main map, which the deployed desktop map (97237-97250) keeps; Mapbox attribution docs: logo and text attribution are required and may not be hidden.
- **Root cause:** The option was copied from a first prototype and propagated to three of the four map instances.
- **Fix:** Single MapCanvas component always includes the Mapbox logo and AttributionControl (compact on width < 640 is fine); add a design-token-styled position that avoids the timeline bar and safe-area inset. Add a lint rule banning attributionControl:false.
- **Acceptance test:** Screenshots of every map surface at 320, 375, 768 and 1440 px show the Mapbox logo and attribution un-obscured by the timeline; grep gate finds no attributionControl:false.
- **Metric or grade moved:** Legal/terms compliance; Fit and finish.

### prov-recon-10: Pin mapbox-gl 3.24.1, guard WebGL 2, and drop no-op map options

- **Severity / effort:** medium / S
- **Audit refs:** P2
- **Depends on:** none
- **Evidence:** bundle.pretty.js:53873 R = "3.24.1"; RECON pins 2.15.0 (package-lock); Mapbox v3.0.0 release notes: WebGL 2 mandatory, optimizeForTerrain removed; dragPan {inertia, inertiaDeceleration, inertiaMaxSpeed} (97248) and scrollZoom {speed, smooth} (97249) are unread: the bundled v3 code reads deceleration/maxSpeed/linearity (88952) and only around (89624); desktop zoom 13.5 vs mobile/RECON 13; three new Map calls (97237, 102981, 110770).
- **Root cause:** Options were copied from another library and never verified; each surface builds its own map, multiplying billed map loads.
- **Fix:** package.json: "mapbox-gl": "3.24.1" exact; import the CSS from the same package; one lib/map.ts factory (token, style, center [-77.235, 39.812], zoom 13.5, minZoom 11, maxZoom 18, maxBounds [[-77.36,39.72],[-77.12,39.91]], NavigationControl); guard with mapboxgl.supported() and show a message when WebGL 2 is unavailable; use documented dragPan/scrollZoom options or defaults; reuse one map across desktop and mobile layouts.
- **Acceptance test:** Unit test asserts the factory options; a headless WebGL-disabled run shows the fallback message; only one Map instance is created on the home route (harness asserts map-load count).
- **Metric or grade moved:** Reliability, cost, parity of default view.

### prov-recon-11: Rewrite the data layer to the deployed contract (712 OOB records, lazy days, density files, tolerant fetches)

- **Severity / effort:** high / M
- **Audit refs:** P3
- **Depends on:** prov-recon-03
- **Evidence:** iF (bundle.pretty.js:96834-96899) keys by regiment_id/brigade_id/corps_id/division_id/battery_id and nested battery arrays: 712 raw records (467 regiments, 93 brigades, 31 divisions, 11 corps, 95 batteries, 8 horse artillery, 7 corps-artillery brigade wrappers) to 705 keys (the 7 wrappers are not keyed; their batteries are); zp (96900) merges base + density files by day; aF/lF load day 2 at tick >= 200 (96991) and day 3 at >= 420 (96992); placements: 694 base + 1,110 density records over 188 ticks and 478 unit ids (plc.mjs); RECON absorb() yields 0 entries (recon_loader_test.mjs) and loads only the 9 base files.
- **Root cause:** RECON guessed the loader shape; the deployed loader is the spec.
- **Fix:** data/index.ts with zod schemas: loadUnits() returns Map<string, Unit> and asserts id uniqueness (712 raw records minus 7 wrapper records = 705 keys) instead of overwriting silently; loadPlacements(day) fetches base plus density, merges deterministically (documented precedence per unit and tick), tolerates per-file failure with a visible notice; commander typed {name, fate, notes?, successor?}; prefetch days 2-3 on idle instead of tick thresholds; single-flight cache. Golden unit tests for the counts above.
- **Acceptance test:** Vitest: unit count (705) and the excluded-wrapper list match the golden; placements per day, ticks and unit ids match; a 404 on one density file yields a notice, not a blank app.
- **Metric or grade moved:** Performance (P3), Reliability, Function.

### prov-recon-12: Replace the canvas renderer and stateful interpolation with a pure keyframe engine and Mapbox symbol layers

- **Severity / effort:** critical / XL
- **Audit refs:** D3, P2
- **Depends on:** prov-recon-11, prov-recon-13
- **Evidence:** Legacy: lS 2D overlay canvas (96506-96688) with per-frame collision spreading (96561-96581) and labels; y1/F4 adjacent-tick lerp (96238-96305); module-level i2 accumulator (96265) never cleared (references only at 96271/96279/96291) and mutated from an effect (97324); only 188 of 675 ticks carry records so lerp rarely engages; fF hover popup unreachable (97384); RECON has no renderer. Owner's own reference: deploy:unit-rendering-reference.html (keyframes, binary search, symbol layer, symbol-sort-key, halo layer).
- **Root cause:** The renderer was built on a per-tick snapshot model with hidden global state; correctness depends on navigation history and every frame runs O(n^2) collision math on the main thread.
- **Fix:** lib/engine: per-unit sorted keyframes; stateAt(tick, frac) is pure; explicit carry-forward rule (visible from first record until last record + TTL or an explicit withdrawn marker; needs a data decision recorded in the intended-diff registry). Renderer: one GeoJSON source per side updated once per animation frame, symbol layer with icon-rotate from bearing, strength-based icon-size, icon-allow-overlap:false and symbol-sort-key, halo circle layer for engaged units, label layer with zoom expressions, trail line layer, filters as layer filter expressions; picking via queryRenderedFeatures; a keyboard-reachable unit list for accessibility.
- **Acceptance test:** Property test: random tick walks produce identical unit sets to a fresh load; at every recorded keyframe (694 + 1,110) engine output equals the record; no O(n^2) work on the main thread (Performance panel shows no long tasks over 50 ms during 8x playback); Day 3 label collisions absent at default zoom.
- **Metric or grade moved:** Performance (INP/TBT), Function, Usability (D3), Historical consistency (no ghost units).

### prov-recon-13: Single tick-to-clock module driven by a tick-to-timestamp table; remove the +2 date offset and the duplicate formulas

- **Severity / effort:** critical / M
- **Audit refs:** C3, C4
- **Depends on:** prov-recon-03
- **Evidence:** Clock logic in six places, two formulas (6:00/4:00 base and 5:00 base) and two date conventions (July {day} and July {day+2}): getTickTime 9371 (6:00 day 1, 4:00 days 2-3, July {P}); M4 9856 (5:00); JF 100836 and QF 100998 (5:00 base, July {f+2}); HUD _F 97428 (July {l+2}); RECON store adds 5:00 with July {day+2}. clocks.mjs: NPS tour tick 264 subtitle July 2, 4:00 PM vs store 7:10 AM; tick 548 July 3, 3:00 PM vs 12:05 PM; tick 12 July 1, 7:30 AM vs 6:55 AM. Only 188 ticks carry data, so ticks are event-indexed, not uniform in wall time.
- **Root cause:** The mapping was invented per component and never tied to the chronology data; a linear 5-minute formula cannot match event-indexed ticks.
- **Fix:** data/ticks.json (tick to ISO timestamp) built from chronology_day*.json time fields plus anchors and monotone interpolation, reviewed by the historian; lib/time.ts exports tickToClock, tickToDay, formatClock; every consumer (HUD, toolbar, mobile clock, tooltips, ancestor journey, bookmark labels, daylight tint, tour subtitles, Story and Event cards) uses it; delete all other formulas; lint rule bans arithmetic on day + 2.
- **Acceptance test:** Unit tests: monotone, day boundaries at ticks 1/226/451, every NPS tour stop and story marker time equals tickToClock within 5 minutes; grep gate finds no July {x + 2}; parity registry lists C3/C4 as intended diffs.
- **Metric or grade moved:** Historical/data consistency (C- to A), Usability trust.

### prov-recon-14: Build one responsive mobile experience instead of the separate pO shell (fixes C1, C2 and 5 dead controls)

- **Severity / effort:** critical / XL
- **Audit refs:** C1, C2, H3, S4
- **Depends on:** prov-recon-12, prov-recon-34, prov-recon-46
- **Evidence:** pO (bundle.pretty.js:102914-103700): own map without attribution (102981-102988), own canvas and picking (103008-103103), playRow = 4 round buttons at 52 px + play button 64 px + speed button + tick text in one centered flex row with gap 14 (styles playRow 103813, ctrlBtn 103820, playBtn 103834, speedBtn 103842, tickInfo 103853) = root of the 572 px row; tools sheet has 14 items (103419-103470) but only lo === "legend" (103617) renders (the roster branch at 103505 is unreachable; Roster uses state er); Br("layers") 103442, Br("bookmarks") 103463, Br("help") 103470 have no renderer; NPS Auto Tour (103447) and Monuments (103419) set states nothing reads; RECON renders nothing for mobile (recon:src/App.jsx:153).
- **Root cause:** The mobile shell duplicates the desktop map, renderer and picking, and its controls were sized in fixed pixels without a 320-390 px budget.
- **Fix:** One AppShell with layout modes selected by matchMedia (pointer: coarse and width) and persisted as gtbg:layout; shared MapCanvas, engine and panels. Mobile controls: transport row wraps or scrolls with 44x44 targets, tick text moves above the slider, safe-area insets, bottom sheet above the timeline via the token z-scale, all 14 tools wired (Bookmarks, Help, Layers, NPS Tour, Monuments, Desktop layout switch), sheet scrolls when taller than the viewport.
- **Acceptance test:** At 320, 375, 390, 768 and landscape 812x375: getBoundingClientRect of every transport control is inside the viewport; elementFromPoint at the centre of each sheet item returns that item; every sheet item opens a visible panel; axe target-size passes; parity checkpoints pass with C1/C2 in the registry.
- **Metric or grade moved:** Core function (mobile D to A), Usability, Accessibility targets, Performance (single map).

### prov-recon-15: Move the playback clock out of React and remove per-frame state updates (splash, HUD, story-marker layer)

- **Severity / effort:** high / L
- **Audit refs:** H9, P1
- **Depends on:** prov-recon-12
- **Evidence:** Splash sets store state on every frame (bundle.pretty.js:101486-101505); HUD _F runs its own rAF calling sT() and toggling state each frame (97419-97426) while Ed also calls sT() (96976), double-counting FPS; KF sets a new positions object every frame regardless of showMonuments (100850-100868, deps [c] only); tick interval cF = 500 ms (96948) so 1x is 10 simulated minutes per second, labelled real time (97429); RECON MonumentsLayer repeats the pattern (43-55). RUM shows INP poor (P1).
- **Root cause:** UI state and animation loops are coupled; no selectors are used (yn() callers re-render on every write).
- **Fix:** lib/playback.ts owns one rAF loop and a scheduler that writes to the store only when the integer tick changes; fractional progress is published through a lightweight external store read with useSyncExternalStore in the few components that need it; HUD and marker layer subscribe with selectors; markers become a Mapbox layer (no React per frame); speed label states the real ratio (for example 10 simulated min per second at 1x) or the speed model is redefined; pause on document.hidden.
- **Acceptance test:** React Profiler assertion: zero React commits between tick changes during 8x playback; INP lab under 200 ms while dragging the slider during playback; label test for the speed text.
- **Metric or grade moved:** Performance (INP, TBT), Usability (H9).

### prov-recon-16: Redesign boot: HTML splash only until first map idle, no React splash on returning visits, no HTML-to-React swap

- **Severity / effort:** high / M
- **Audit refs:** H3, P1
- **Depends on:** prov-recon-15, prov-recon-28
- **Evidence:** tO (bundle.pretty.js:101472-101600) waits for >5 placement ticks, then 800 ms, 3.5 s fast-forward (eO = 3500), 600 ms fade every visit; rAF-driven so a hidden tab never finishes; Lighthouse layout-shifts (mobile) attributes the first shift (0.0098) to the React splash node replacing the HTML splash; RECON unmounts its splash as soon as data loads so the fast-forward never plays (recon:src/App.jsx:135), and adds an opaque z-index:1 placeholder above #root that is never removed in mobile mode (recon:index.html:83-89, App.jsx:153).
- **Root cause:** Two splashes with different DOM and a timing model that depends on animation frames.
- **Fix:** index.astro contains the only splash (existing CSS); map app removes it on first Mapbox idle plus data ready; returning visitors (gtbg:layout and gtbg:intro set) never see an animated intro; first-time visitors get an optional intro (skippable, respects reduced motion) that is not the boot gate; never gate boot on rAF. Do not port #map-lcp-placeholder.
- **Acceptance test:** Lighthouse mobile: no layout-shift entry from the splash; returning-visit time to interactive map < 2.5 s lab; boot completes in a background tab; reduced-motion run skips the fast-forward.
- **Metric or grade moved:** LCP, FCP, CLS (P1), Usability (H3).

### prov-recon-17: Replace sw.js and the controllerchange reload with a versioned, update-prompting service worker plus a migration SW

- **Severity / effort:** critical / M
- **Audit refs:** C6, P1, P5
- **Depends on:** prov-recon-05
- **Evidence:** deploy:index.html:255-277 reloads on controllerchange and registers at window load; deploy:sw.js calls skipWaiting/clients.claim, precaches /assets/index-Cg8FAMXN.js and /assets/index-B4G7Z_2G.css by hard-coded name and is cache-first for /assets/; Lighthouse: redirects audit wastes 9,067 ms (mobile) and 1,575 ms (desktop); RECON sw.js is stale-while-revalidate for all cached URLs with no res.ok or method checks (recon:public/sw.js:37-70) and RECON registers nothing.
- **Root cause:** First visit installs the SW (its cache.addAll fetches the 2.28 MB bundle again unless the HTTP cache serves it), then claims and reloads the page: the measured mobile LCP of 9.0 s is essentially the 9.07 s the redirects audit attributes to that reload.
- **Fix:** Generate the SW at build time (Workbox injectManifest or a small hand-written worker) from the build manifest; precache only the app shell and small critical files; runtime caching: /data/v2 immutable cache-first, navigations network-first with a 3 s timeout and navigation preload, never cache non-ok or non-GET responses; no skipWaiting unless the user accepts an in-app Update available toast; no automatic reload; register on idle after first paint. Ship a migration SW on first deploy that deletes gbg-* caches and takes over cleanly. Keep sw.js Cache-Control no-store.
- **Acceptance test:** Clean-profile Lighthouse mobile: redirects audit passes (0 ms wasted) and LCP under 2.5 s; second visit offline serves the shell; test upgrading a browser controlled by the old SW: exactly one activation, no reload loop; injected 500 responses are not cached.
- **Metric or grade moved:** LCP (9.0 s to green), FCP, Best Practices, Reliability; removes the main RUM outlier source.

### prov-recon-18: Do not port RECON's Google Fonts change; fix the two real CLS sources

- **Severity / effort:** low / S
- **Audit refs:** P1
- **Depends on:** prov-recon-16, prov-recon-30
- **Evidence:** No font is loaded in the deployed HTML; 'Spectral' appears in 14 style declarations (bundle.pretty.js:111327-111740, 113108, 113124) but always falls back to Georgia; RECON adds a render-blocking fonts.googleapis.com stylesheet with display=optional (recon:index.html:44); Lighthouse layout shifts: splash swap (mobile 0.0098) and #extra-features repositioning (desktop 0.0072); the privacy page does not mention Google Fonts.
- **Root cause:** The CLS fix targeted a font that was never loaded.
- **Fix:** Decide the typeface deliberately: Georgia only, or self-host a latin subset with font-display: swap and a size-adjusted fallback; remove phantom family names; eliminate the two real shifts (finding 16 and 30).
- **Acceptance test:** No third-party font request in the network log; CLS from splash and overlay is 0 in Lighthouse and in the harness.
- **Metric or grade moved:** CLS, Privacy (no third-party font call), Fit and finish.

### prov-recon-19: Code-splitting and asset plan for mapbox-gl 3.24.1 with measured budgets

- **Severity / effort:** high / M
- **Audit refs:** P2, P3, P4, P6
- **Depends on:** prov-recon-05, prov-recon-10
- **Evidence:** Deployed: one 2,280,438-byte entry; mapbox-gl 3.24.1 is 3,273,745 of 4,027,234 pretty bytes (81%); React 236,040; app 490,084 (of which about 145 KB of JSON-equivalent is the inline 512-monument literal at 104440-110610); only BookmarkPanel and HelpModal lazy (112469-112470); Lighthouse unused-javascript 614 KiB mobile / 654 KiB desktop, bootup 3.3 s / 2.5 s; RECON's 171 KB + 986 KB split was measured on a partial app with mapbox-gl 2.15 and imports mapbox after MapView mounts.
- **Root cause:** The bundle has no vendor split and inlines large data; RECON's numbers do not transfer to v3.
- **Fix:** manualChunks: react-vendor (react, react-dom, zustand), mapbox (dynamic import started from a modulepreload link injected in the HTML and from main.ts before createRoot), panel groups panels-core, panels-tools, walkthrough-tour; data as JSON fetched on demand (monuments and tour history leave the JS); build.sourcemap true (or hidden with a deliberate Lighthouse exception) for valid-source-maps; render-blocking site-nav removed via Astro components. First build sets baseline; size-limit budgets = baseline + 5%; targets: initial route JS (entry + react) <= 120 KB brotli, map chunk measured and tracked.
- **Acceptance test:** size-limit passes in CI; Lighthouse unused-javascript under 100 KB before interaction; mobile bootup <= 2 s; no network-dependency-tree warning for critical chain.
- **Metric or grade moved:** LCP, TBT, Performance score (mobile 64 to 95+), Best Practices (source maps).

### prov-recon-20: Freeze the dependency matrix and record bundle identity in ADR 0002

- **Severity / effort:** medium / S
- **Audit refs:** N1
- **Depends on:** prov-recon-01
- **Evidence:** React 18.3.1 both sides (bundle.pretty.js:440, 8927; lock 18.3.1); zustand 4.5.x both sides (deprecation text 9303, getInitialState 9133; lock 4.5.7); mapbox-gl 2.15.0 vs 3.24.1; Vite 5.4.21 in RECON vs unknown in deploy (uses __vitePreload); vite-plugin-pwa unused; deployed bundle md5 7ef75b95f4 unchanged Jul 29 to Sep 29 (section 2).
- **Root cause:** No record of what produced the running site.
- **Fix:** docs/adr/0002-dependency-matrix.md listing exact versions, Node LTS, package manager, the legacy bundle md5, and an upgrade policy (stay on React 18.3.1 and zustand 4.5.7 through cutover; upgrade afterwards behind the harness); renovate or dependabot grouped weekly.
- **Acceptance test:** ADR merged; pnpm ls output matches the ADR in CI.
- **Metric or grade moved:** Documentation, Reliability.

### prov-recon-21: Define the store contract in TypeScript with selectors and drop 13 dead members

- **Severity / effort:** medium / S
- **Audit refs:** H8
- **Depends on:** prov-recon-03
- **Evidence:** Deployed store yn (bundle.pretty.js:9361-9449) has 49 members; 13 are dead: terrainData/setTerrainData (loaded but never read), activeMapRef/setActiveMapRef, getCurrentDay, bookmarkCount/bumpBookmarkCount, onboardingComplete/setOnboardingComplete (gtbg_onboarded is used instead), showCasualtyHeatmap/toggleHeatmap/casualtyData/setCasualtyData; filters schema {sides[], dispositions[], unitTypes[], minStrength} vs RECON {side, type, disposition}; RECON store also renames bumpBookmarkCount and changes getTickTime.
- **Root cause:** Store grew by accretion; components subscribe to the whole store.
- **Fix:** store/ slices (playback, selection, panels, filters, prefs) typed with selectors and subscribeWithSelector; delete dead members; keep persisted keys via storage.ts migration; useShallow where needed; the GF hook becomes a selector.
- **Acceptance test:** tsc strict passes with no any in store; a test restores showLegend and showMinimap from legacy gtbg_prefs; knip reports no unused store members.
- **Metric or grade moved:** Maintainability, Performance (renders).

### prov-recon-22: Rebuild the Unit panel (commander succession, strength bar, key action, history) with resolved parent chain and data-driven alerts

- **Severity / effort:** high / L
- **Audit refs:** H7
- **Depends on:** prov-recon-11, prov-recon-13, prov-recon-34
- **Evidence:** MF (bundle.pretty.js:97897-98089), wF commander with successions (97571), SF strength bar (97664) with hard-coded alerts for U-1MN ticks 302-310 and C-26NC (97743-97756); breadcrumb, type and casualties_killed/wounded never render because those fields do not exist (oobkeys.mjs: corps 7 records, division 0, brigade 0, type 0, casualties_killed 0, strength_at_start 0); RECON has no unit panel.
- **Root cause:** The UI expects a denormalized shape the data never had.
- **Fix:** Resolve parents through parent_brigade_id, parent_division_id, parent_corps_id to render Corps > Division > Brigade; move the two special alerts into casualty_highlights.json with sources; succession lookup from approx_tick/from_commander/to_commander; last-5 positions from the engine; non-modal aside landmark with a heading; copy-link uses the deeplink router.
- **Acceptance test:** Unit test: every one of the 467 regiments resolves a full parent chain or is on a documented exception list; U-20ME shows the correct commander at ticks 200 and 268; axe passes; keyboard focus moves to the panel on select and returns on close.
- **Metric or grade moved:** Function, Usability, Accessibility.

### prov-recon-23: Unify story panel, event card and commander toasts into one notification system with correct auto-dismiss and Esc behavior

- **Severity / effort:** high / M
- **Audit refs:** H4, H2
- **Depends on:** prov-recon-13, prov-recon-46
- **Evidence:** CF story panel (bundle.pretty.js:98252) and LF event card (98595) keep local dismissed-sets and are not touched by Esc or jumps; qF toasts (99888) work (approx_tick, 4.5 s) but only while playing; nO cards (101679) filter on H.tick which does not exist (data uses approx_tick) so they never appear; RECON toasts use ev.tick/commander_out/commander_in (recon:src/components/CommanderToasts.jsx:13).
- **Root cause:** Three overlapping notification implementations with inconsistent data fields and no shared lifecycle.
- **Fix:** One Notifications region (aria-live polite) with a queue (max 3), auto-dismiss 6 s that pauses on hover and focus, dismiss all; Story panel as a labelled aside; Esc closes the topmost transient; day jumps and tick jumps clear transient UI; delete nO; use approx_tick.
- **Acceptance test:** After clicking a day button, Story panel, event card and toasts are closed; fake-timer test: toast disappears after 6 s and pauses under hover; axe live-region checks pass; parity registry lists H4 and H2.
- **Metric or grade moved:** Usability (H4), Accessibility, Fit and finish.

### prov-recon-24: Rebuild Search, Filter, Legend, Minimap, Roster and Order of Battle against the real data shapes (fixes H5, H11, D4)

- **Severity / effort:** high / L
- **Audit refs:** H5, H11, D4, H2
- **Depends on:** prov-recon-11, prov-recon-21, prov-recon-34
- **Evidence:** FF search matches commander.name, min 2 chars, 12 results (bundle.pretty.js:98738-98807); RECON search calls string methods on commander which is an object in 685 of 712 records; OF filter uses sides/dispositions/unitTypes/minStrength (99082); GF calls yn.subscribe(selector, listener) but the store's subscribe takes one argument (9134), so the minimap footer never updates (99650, footer 99821); Xk OOB derives depth from dashes in the id (102321-102420) and has no desktop toolbar button; Jk/Xk sort with localeCompare (text order gives 102nd before 10th); RECON OOB groups on u.corps/u.division which do not exist.
- **Root cause:** Panels were written against imagined shapes, and one hook misuses the store API.
- **Fix:** Search: debounced, role=combobox listbox, matches designation, state, commander.name and aliases, natural sort (Intl.Collator numeric), Esc closes even from the input. Filter: layer filter expressions, chips with counts. Minimap: selector hook, correct count. Roster/OOB: one tree built from parent ids with a desktop toolbar entry and keyboard tree semantics. Legend: three tabs from tokens.
- **Acceptance test:** Search for 20th Maine returns U-20ME first; sort test shows 10th before 102nd; minimap footer changes while playing; OOB tree has no Unassigned bucket for regiments; Esc inside the search input closes the panel.
- **Metric or grade moved:** Usability, Function, Accessibility, Polish (H5, H11, D4).

### prov-recon-25: Rebuild Follow Your Ancestor with a defined gold trail and a working ?ancestor= entry

- **Severity / effort:** high / M
- **Audit refs:** C5, H5, H7
- **Depends on:** prov-recon-04, prov-recon-12
- **Evidence:** Zk (bundle.pretty.js:101008-101471) calls setGoldUnit, clearGoldTrail and drawGoldTrailSegment (101086, 101101, 101229), which are defined nowhere in the deploy tree (grep of all html and js); st() throws before flyTo and before selecting the unit; on the ?ancestor= mount path it throws inside useEffect (101019) and, with no error boundary, unmounts the app; unit list is sorted with localeCompare; RECON AncestorTracker is a different stepper with no trail and no deep link.
- **Root cause:** A half-applied patch added calls to helpers that were never written.
- **Fix:** Implement trail as a line layer plus highlighted symbol for the followed unit; journey timeline from engine keyframes and the time module; ?ancestor= auto-opens the panel and never throws; error boundary around every panel; natural sort; search includes alias names (fixes rows such as 14th Brooklyn alias U-84NY).
- **Acceptance test:** Playwright: open /?ancestor=U-20ME then panel, trail and journey render with zero console errors; ESLint no-undef gate; select any of 467 regiments without exceptions.
- **Metric or grade moved:** Reliability (C5), Function, Usability.

### prov-recon-26: Extract Walkthrough and Soldier's Eye data to schema-validated JSON; do not use RECON tourStops

- **Severity / effort:** high / M
- **Audit refs:** H13, G1, X3
- **Depends on:** prov-recon-11
- **Evidence:** d2 (bundle.pretty.js:104096) has 16 stops with distinct map lat/lng, sv {lat,lng,heading,pano?}, label, dayClass, video URL and 3 history paragraphs each (48) using <span class='lead'> injected via dangerouslySetInnerHTML (110653); RECON tourStops has no history or video, uses the sv coordinate as map coordinate (all 16 differ) and differs in sv data for stops 2, 3, 6, 12, 13, 15 (svdiff.mjs); rO has 8 Soldier's Eye sites that hand off to Google Maps (101958-102060) while RECON renders 16 Google embeds keyed by VITE_GOOGLE_MAPS_KEY defaulting to ''; the guide says Street View panoramas (G1).
- **Root cause:** RECON reconstructed the tour data from an older understanding and merged two different features.
- **Fix:** Use tmp-prov-recon/d2.json and soldiers_eye_rO.json as spec; data/v2/walkthrough_stops.json with zod schema (structured paragraphs with an emphasis flag instead of HTML); verify each pano id and heading against Google Street View; decide embed versus hand-off for Soldier's Eye (align copy and guide); add www.google.com and www.nps.gov to frame-src for the CSP that will be enforced.
- **Acceptance test:** Schema validation passes for 16 stops; a unit test asserts 48 history paragraphs and 16 video links; no innerHTML in the walkthrough; stops 1 and 8 load different panoramas (H13 verified on a real browser).
- **Metric or grade moved:** Content depth (A), Accessibility, Security (XSS surface).

### prov-recon-27: Extract NPS Auto Tour, story markers and the 512-monument directory into data with sources and corrected times

- **Severity / effort:** medium / M
- **Audit refs:** C4, H7
- **Depends on:** prov-recon-13, prov-recon-26
- **Evidence:** th (bundle.pretty.js:100063) 16 tour stops with subtitles containing wall-clock times, tick, tickWindow, narrative and videoUrl; mA (100615) 20 story markers with times embedded in labels; _A (104440-110610) 512 monuments; RECON's 512 monuments and 20 markers verified identical (d2cmp.mjs, diff entries 0); tour subtitle times contradict the map clock (section 3.7).
- **Root cause:** Narrative text carries hard-coded times that were never reconciled with the tick clock.
- **Fix:** Emit data/v2/nps_tour.json, story_markers.json, monuments_directory.json with schemas; replace embedded times with tick references formatted by the time module; add source fields (the monument src field is empty for many entries: report coverage) and a review checklist for the historian.
- **Acceptance test:** Schema validation passes; a test asserts each tour stop's displayed time equals tickToClock(tick) within 5 minutes; a coverage report lists monuments without src.
- **Metric or grade moved:** Historical consistency, Content quality.

### prov-recon-28: First-run flow and layout persistence: merge chooser and onboarding, auto-detect device, remember the choice

- **Severity / effort:** high / M
- **Audit refs:** H3, A6
- **Depends on:** prov-recon-14, prov-recon-46
- **Evidence:** dO chooser (bundle.pretty.js:102752) and bO onboarding (111856; xO archetypes 111799, Gc 5-step tour 111819) are both mounted on first visit (AO 113068 gate gtbg_onboarded); layout choice is never stored; Power User shortcut screen is offered on touch; deploy:index.html regex-matches these button labels; RECON invented a separate OnboardingModal and merged the archetype text into VirtualWalkthrough.
- **Root cause:** Two modal systems and no persisted layout.
- **Fix:** Auto-detect layout (coarse pointer and width), store gtbg:layout, drop the chooser except a small Switch layout menu item; single accessible Dialog for an optional 3-5 step intro using onboarding_tour_Gc.json copy, hide keyboard shortcuts on touch, remember dismissal.
- **Acceptance test:** Returning visitor lands on the map with no modal; first visit on 375 px never shows Desktop first; focus trap and Esc work; parity registry lists H3.
- **Metric or grade moved:** Usability (D+ to A), Accessibility.

### prov-recon-29: Decide the sound policy for the whole product and remove the undefined-global freeze

- **Severity / effort:** medium / S
- **Audit refs:** H8
- **Depends on:** none
- **Evidence:** yO toggle (bundle.pretty.js:111768), engine Uk/jk/N4/U4 (96319-96372); lS references CanvasRenderer._lastSoundMs (96556-96557), an identifier defined nowhere; when sound is enabled and any Union/Confederate pair collides it throws inside the rAF callback before the next frame is scheduled (analysis only); RECON README deleted sound as not wanted; deploy:index.html:377 banner promises live sound; immersive.html uses AudioContext (only page with audio).
- **Root cause:** The sound feature was half-integrated and RECON removal is inconsistent with the rest of the site.
- **Fix:** Owner decides: (a) remove entirely, updating banner copy, guide, Help, immersive page, and deleting the renderer hook; or (b) keep as opt-in: default muted, unlock on user gesture, local throttle variable, visual cue and caption, respect reduced-motion preference, include a test. Record the decision in an ADR.
- **Acceptance test:** grep finds no CanvasRenderer; a Playwright run of Day 3 with sound on completes without console errors; copy in banner, guide and Help matches the decision.
- **Metric or grade moved:** Reliability, Polish, Copy consistency.

### prov-recon-30: Retire the index.html hook scripts and integrate Extra Features and Ask the Historian into the toolbar

- **Severity / effort:** high / M
- **Audit refs:** H1, H6
- **Depends on:** prov-recon-34, prov-recon-35
- **Evidence:** deploy:index.html: overlay markup 285-292 and CSS 176-237 (z-index 999999), populate script 294-353, banner injector 355-396, toolbar label patcher 398-440 (no-op because every button already has a title), reveal script 441-519 (regex on button text), collision mover 521-606, monument star overlay 608-714 (fed by the 9-entry monuments.json, duplicates the toolbar monument toggle and never tracks pan/zoom), SW script 255-277; overlay repositioning causes the desktop layout shift.
- **Root cause:** The React app could not be edited, so features were bolted on from outside and coupled to React's strings.
- **Fix:** Delete all seven scripts. The toolbar gets a native Extra Features menu built from a shared nav data module used by the Astro pages and the app; Ask the Historian is a first-class toolbar button; banner copy becomes part of the first-run dialog (no 'AI-style' wording, per H8); one z-index scale.
- **Acceptance test:** DOM contains none of the injected ids (#extra-features, #gtbg-onboarding-banner, #gtbg-monuments-overlay); no overlay/panel overlap in the harness at 20 viewport sizes; CLS from the overlay is 0.
- **Metric or grade moved:** Fit and finish (C+ to A), Usability, CLS.

### prov-recon-31: One hotkey registry: Esc works everywhere, no duplicate handlers, Help generated from the registry

- **Severity / effort:** medium / S
- **Audit refs:** H2, A6
- **Depends on:** prov-recon-46
- **Evidence:** AO handler (bundle.pretty.js:112966-113050) returns for INPUT targets so Esc is ignored in search, and its Esc case clears selectedUnitId but not pinnedUnitId (a unit click sets both at 97348, and MF shows when either is set at 97909) so the unit panel never closes on Esc, while story panel, event card, toasts, distance tool, layers and NPS tour keep local state Esc cannot reach; IO wrapper has tabIndex 0 and its own onKeyDown (112223-112224) so Space toggles twice and arrows step 2 when focus is inside the bar (analysis only); Help lists M and H (H is dead); RECON omits M; HelpModal chunk exports an unused useGlobalKeyboard.
- **Root cause:** Keyboard handling is spread across three places with inconsistent guards.
- **Fix:** lib/hotkeys.ts registry with scope (global, panel, input), an escape stack that closes the topmost transient, blur on Esc in inputs, single window listener; Help renders from the registry; add aria-keyshortcuts; remove the H shortcut unless heatmap is implemented (finding 32).
- **Acceptance test:** Tests: Space toggles once with focus in the timeline; Esc in the search box closes search; every shortcut shown in Help works; no duplicate listeners (harness counts keydown handlers).
- **Metric or grade moved:** Accessibility, Usability (H2).

### prov-recon-32: Disposition table for dead code and unfinished features (delete by default)

- **Severity / effort:** low / S
- **Audit refs:** H8
- **Depends on:** prov-recon-01
- **Evidence:** Dead or unreachable: heatmap state, H key and Help row (bundle.pretty.js:9419, 9436, 112930; casualty_apportionment.json is used by dashboard and living-ledger only); terrainData load (96919); fF hover popup (97384); nO cards (101679); GF subscribe (99650); toolbar label patcher (deploy:index.html:398-440); InterpolationWorker chunk (0 references); getCurrentDay; mobile tool targets without renderers (103419-103470); Unit-panel conditionals for absent fields; sO expression (102236); HelpModal useGlobalKeyboard; RECON PENDING says to carry heatmap dead code over deliberately.
- **Root cause:** Accreted features without owners.
- **Fix:** docs/adr/0003-dead-code.md with one row per item: delete, implement, or replace, with owner and reason; default is delete; knip and no-unused-exports in CI so it cannot regrow. Heatmap: delete unless the owner wants a new feature (then spec it from casualty_apportionment.json).
- **Acceptance test:** ADR lists every item above with a decision; CI knip run is clean.
- **Metric or grade moved:** Maintainability, Polish.

### prov-recon-33: Storage migration module for old keys and bookmark shape

- **Severity / effort:** medium / S
- **Audit refs:** H3
- **Depends on:** prov-recon-21
- **Evidence:** Keys: gtbg_prefs (bundle.pretty.js:9329), gtbg_onboarded (112951), gettysburg_bookmarks (97821), gtbg-ef-hidden (deploy:index.html:328), gtbg_watch_together_tour (watch-together.html); deployed bookmark record {id: Date.now(), tick, label, unitId, center, zoom, created, url} vs RECON {id: 'bm_...', ...} under gtbg_bookmarks (recon:src/components/BookmarkPanel.jsx:15-29).
- **Root cause:** RECON changed key names and record shape, which would orphan existing users' data.
- **Fix:** lib/storage.ts: typed get/set wrapped in try/catch, namespaced gtbg:v2:*, one-time import of the old keys (kept for one release), bookmark shape converter, quota-safe writes.
- **Acceptance test:** Playwright storageState seeded with old keys: new app shows the same bookmarks and prefs; rollback to legacy still reads its own keys.
- **Metric or grade moved:** Reliability, Usability (no data loss).

### prov-recon-34: Design tokens and CSS architecture (one gold, z-index scale, 12 px minimum, 44 px targets)

- **Severity / effort:** high / M
- **Audit refs:** A1, A4, D2, H6
- **Depends on:** prov-recon-35
- **Evidence:** App inline style objects everywhere; app gold #c8a84a/#8b6914/#e8d5a3/#d4a840 vs pages #c9a24b; panel backgrounds #0f0f1a, #12121e, rgba(8,8,18,.96); app z-index values span 1 to 1000 plus 999999 on the overlay; 9-11 px fonts (for example Ar.sideBadge 9, Ar.lbl 10 at bundle.pretty.js:97177-97197); toolbar buttons padding 4px 10px and fontSize 12 (tc.toolBtn at 113356); emoji icons vs the existing SVG sprite icons.svg used by site-nav.
- **Root cause:** Styles were authored per component with no shared scale.
- **Fix:** packages/tokens (tokens.json to CSS variables and TS types): colors with contrast-checked pairs, type scale with 12 px floor, spacing 4-pt, radii, named z-index scale, motion tokens with prefers-reduced-motion; CSS Modules in the app, shared CSS in Astro; SVG icon set replaces emoji; stylelint rules ban raw hex, numeric z-index and font-size under 12 px; coarse-pointer rule enforces 44 px.
- **Acceptance test:** Stylelint clean; axe color-contrast zero violations; a script asserts no computed font-size under 12 px and no coarse-pointer target under 44 px in the harness checkpoints.
- **Metric or grade moved:** Accessibility, Visual design (B+/B- to A), Fit and finish.

### prov-recon-35: Repository layout and Astro for the 20+ static pages

- **Severity / effort:** high / L
- **Audit refs:** S1, S2, S3, S4, T3, E5
- **Depends on:** prov-recon-06
- **Evidence:** Pages are hand-written HTML with copy-pasted head and inline CSS (deploy:aftermath.html:1-30 shows 8 social tags per page) and runtime nav from site-nav.js (deploy:site-nav.js) plus icons.svg; sitemap has 20 URLs and omits privacy/terms (E5); /dashboard and /dashboard.html both return 200 (T3).
- **Root cause:** No templating or build for the static layer, so head data and design drift per page and CSP needs 'unsafe-inline'.
- **Fix:** Adopt the section 7.1 layout (apps/web Astro, apps/map React, packages/tokens, packages/data-schema, data, pipeline, tests, legacy). Base.astro owns title/description/canonical/OG/Twitter/JSON-LD; SiteNav.astro and Footer.astro replace runtime injection; @astrojs/sitemap includes legal pages; build.format file keeps .html URLs with 301s for extensionless and /index.html; scripts and styles are external hashed files so CSP can drop 'unsafe-inline'. Confirm Astro option names in Phase 2.
- **Acceptance test:** pnpm build emits every current URL; view-source of each page contains a single canonical and consistent OG tags; sitemap lists all indexable pages; a CSP report-only run shows no inline violations.
- **Metric or grade moved:** SEO, Security (CSP), Maintainability, Consistency across pages.

### prov-recon-36: Sub-page migration runbook that preserves URLs, bfcache back-navigation and embed behavior

- **Severity / effort:** high / L
- **Audit refs:** S1, S2, S3, S4, T3, E5, X4
- **Depends on:** prov-recon-35, prov-recon-34
- **Evidence:** 20 feature pages plus privacy, terms, 404, embed; site-nav wireBackLinks relies on history.back() and bfcache (deploy:site-nav.js); embed.html links back with /index.html?tick=&vignette= and currently receives both X-Frame-Options DENY and frame-ancestors * (deploy:netlify.toml embed block); unit-rendering-reference.html is a public noindex dev page; two pages pull /data/terrain.json only for search/historian/viewshed/ar.
- **Root cause:** Pages diverged in structure and behavior, and headers are site-wide with path overrides that do not remove earlier headers.
- **Fix:** Migrate in batches of 4-5 pages (legal and simple first, map pages last) keeping .html canonicals; build a redirect table (extensionless and /index.html to canonical); path-scoped header rules so embed.html gets only frame-ancestors *; no unload handlers so bfcache works; move unit-rendering-reference to /dev/ excluded from production; verify S1-S4 fixes per page (Reports/Biography layout, Ground Remembers blank map, Camera/Viewshed paint, mobile chart scroll and tab clipping).
- **Acceptance test:** Crawler diff: every URL in the old sitemap returns 200 or a single 301 to canonical; embed.html loads inside a cross-origin iframe; pageshow.persisted is true when returning to the map; Lighthouse 95+ in all four categories on each page at mobile and desktop.
- **Metric or grade moved:** SEO, Accessibility, Performance for 20 pages, Fit and finish.

### prov-recon-37: Data pipeline directory with schemas, validators and versioned /data/v2 output

- **Severity / effort:** high / M
- **Audit refs:** P3, H10
- **Depends on:** prov-recon-11, prov-recon-07
- **Evidence:** Legacy bundle fetches fixed names under /data/; deploy:netlify.toml caches /data/* for 1 h; RECON and deploy data differ (finding 07); counts disagree across the site (445+, 467, 430,000+); 188 of 675 ticks populated.
- **Root cause:** Data is edited in place and the same names serve both old and new code.
- **Fix:** data/raw, data/curated, pipeline/* and packages/data-schema with zod; build emits content-hashed files under /data/v2 plus manifest.json; validators: unique ids, ticks 1-675, coordinates inside maxBounds, parent ids resolve, sources present; a generated stats file feeds every count shown in the UI (fixes 445+ and 467); legacy /data names frozen until sunset except deliberate hotfixes; Historian corpora and search-index build attach here.
- **Acceptance test:** CI runs validators and fails on any violation; counts shown in UI come from the stats file (grep finds no hard-coded 445 or 467); legacy data hashes unchanged.
- **Metric or grade moved:** Historical consistency, Performance (cacheable data), Maintainability.

### prov-recon-38: CI/CD pipeline with a11y, perf, parity, link and secret gates

- **Severity / effort:** high / M
- **Audit refs:** P1, A1, X3
- **Depends on:** prov-recon-02, prov-recon-03
- **Evidence:** No CI, tests, lint or types exist in RECON or the deploy; audit shows regressions shipping (undefined identifiers, contrast failures, console warnings).
- **Root cause:** Nothing automated stands between an edit and production.
- **Fix:** GitHub Actions per section 7.5: ci (lint, tsc, vitest, build, size-limit, knip, gitleaks, osv, hashed-asset assertion), e2e, a11y (axe on every route, desktop and mobile), lhci (LCP <= 2.5 s, TBT <= 200 ms, CLS <= 0.1, FCP <= 1.8 s, score >= 95), parity (nightly and on label), links (lychee), Netlify previews with required status and the header/source probe.
- **Acceptance test:** Branch protection requires all checks; a PR that adds an inline hex color, an undefined identifier, a 300 KB dependency or a broken link fails.
- **Metric or grade moved:** All categories (prevents regression), Documentation, Security.

### prov-recon-39: Cutover, feature flags and rollback runbook

- **Severity / effort:** high / M
- **Audit refs:** N1
- **Depends on:** prov-recon-03, prov-recon-17
- **Evidence:** Netlify Split Testing requires a Git-connected site, branch deploys and two deployed branches; Publish deploy rolls back atomically (Netlify docs); current /sw.js is no-store; old SW remains installed on returning users; legacy data names must stay stable.
- **Root cause:** A big-bang replacement of a single-file app has no safety net today.
- **Fix:** Implement section 6.7-6.8: flags.ts (URL, localStorage, remote /flags.json kill switch); build to /next/ noindex; per-panel flags with Classic links; canary via branch split test 10/50/100 over about a week with RUM, JS-error beacon and nightly parity as gates; cutover moves legacy to /classic/ for 60 days; rollback steps 1-5 in section 6.8 rehearsed once before canary.
- **Acceptance test:** Rehearsal: publish previous deploy restores service in under a minute; flipping a kill-switch flag removes a panel without deploy; old-SW client upgrades cleanly.
- **Metric or grade moved:** Reliability, Risk management, Performance (RUM stays green through cutover).

### prov-recon-40: Scripted legacy bridge patches for the critical defects (asserted, versioned, retired at cutover)

- **Severity / effort:** high / M
- **Audit refs:** C1, C5, C6, H11
- **Depends on:** prov-recon-02, prov-recon-05
- **Evidence:** Undefined identifiers at bundle.pretty.js:101086/101101/101229 (setGoldUnit, clearGoldTrail, drawGoldTrailSegment) and 96556 (CanvasRenderer); mobile playRow single centered flex row (103813, buttons 103820-103860); GF subscribe misuse (99650); SW reload script (deploy:index.html:255-277); bundle is 2.28 MB minified with no source.
- **Root cause:** Critical user-visible bugs would otherwise wait 5+ weeks for the rebuild.
- **Fix:** legacy/patches runner: exact string anchors with asserted count 1, idempotent, output a new content-hashed filename and rewrite index.html, sw.js precache and lazy-chunk imports, run the parity harness, refuse re-run. Patches: (1) define no-op setGoldUnit/clearGoldTrail/drawGoldTrailSegment or remove calls; (2) local CanvasRenderer stand-in; (3) parse tick and unit params on boot; (4) mobile playRow flexWrap:wrap and gap 8; (5) GF to a selector-style subscription; (6) remove controllerchange reload and generate the SW precache list. Retire on cutover.
- **Acceptance test:** After patching: no ReferenceError in a scripted session (Ancestor, sound on, Day 3 playback); mobile transport row fully inside 375 px viewport; first-visit Lighthouse redirects audit passes; deep links work; patch runner refuses a second run.
- **Metric or grade moved:** Core function (mobile D to C+ interim), Reliability, LCP interim gain.

### prov-recon-41: Effort roll-up and critical path

- **Severity / effort:** medium / S
- **Audit refs:** N1
- **Depends on:** prov-recon-01
- **Evidence:** Parity matrix midpoints: 30 S + 20 M + 5 L + 2 XL + 5 delete = about 65 unassisted days; phases in 6.4 sum to 38-50 AI-assisted days including the parallel sub-page track.
- **Root cause:** Planning risk: underestimating verification effort.
- **Fix:** Critical path: Phase 0 (1.5) then harness (4-5) then foundations (4-5) then core (8-10) then desktop panels (6-8) then mobile (4-5) then walkthrough/tour/onboarding (4-5) then hardening (4-5); Astro sub-pages (6-8) and data pipeline run in parallel; bridge patches (2-3) run during Phases 1-2. Re-baseline after Phase 3.
- **Acceptance test:** Plan tracked with phase exit gates; slip greater than 20% triggers scope review (defer mobile-only polish, not harness or a11y).
- **Metric or grade moved:** Planning.

### prov-recon-42: Regenerate the OG and PWA screenshots and fix manifest hygiene

- **Severity / effort:** medium / S
- **Audit refs:** E1, T1
- **Depends on:** prov-recon-36
- **Evidence:** screenshots/day1.png and day3.png are byte-identical (md5 3f6646c99f3416a1aa35fea67bed21c5) in deploy and RECON; PNG validation: IHDR declares 8-bit RGB but the decompressed IDAT is 3,687,120 bytes = 720 x (1 + 1280 x 4), RGBA-sized; Pillow raises 'unrecognized data stream contents'; og:image and twitter:image point at day3.png (deploy:index.html:21,25) and the manifest lists both as different screenshots; manifest icons use purpose 'any maskable' combined; orientation landscape (deploy:manifest.json).
- **Root cause:** The screenshots were produced by a tool that wrote a mismatched header, and the same file was reused for two days.
- **Fix:** Generate real 1280x720 screenshots (day 1, day 3) and a 1200x630 OG image from the new build with Playwright in CI; separate any and maskable icons; remove orientation; add form_factor for wide and narrow screenshots; validate PNGs in CI.
- **Acceptance test:** Pillow decodes all images; Facebook, LinkedIn and Twitter validators render a preview; Lighthouse installability passes; distinct day1 and day3 files.
- **Metric or grade moved:** SEO/social sharing (T1), PWA, Best Practices.

### prov-recon-43: Delete the orphan InterpolationWorker chunk and remove entry-chunk imports

- **Severity / effort:** low / S
- **Audit refs:** P2
- **Depends on:** prov-recon-19
- **Evidence:** assets/interpolationworker-ufiwa2-e.js (672 B) is not referenced anywhere in bundle.min.js (0 matches); lazy chunks import { r, j, u, ... } from ./index-Cg8FAMXN.js and the entry exports TF, RO, j, kO, r, PO, IF, yn at the end of the bundle (bundle.pretty.js:113371-113377).
- **Root cause:** Leftover build output and a shared-module layout that lets the entry own shared code.
- **Fix:** Do not carry the worker; use manualChunks so shared code lives in a named shared chunk and lazy chunks never import the entry.
- **Acceptance test:** Built dist has no interpolation worker; grep of lazy chunks finds no import from the entry file.
- **Metric or grade moved:** Reliability (cache coupling), Performance.

### prov-recon-44: Spec-extraction task: per-component spec sheets from bundle.pretty.js

- **Severity / effort:** medium / L
- **Audit refs:** N1
- **Depends on:** prov-recon-02
- **Evidence:** The rewrite spec is spread over 17k lines with mangled names (AO, gF, pO, _O, Zk, MF, CF, LF, FF, OF, IO ...) and inline data literals; extraction already done for d2, _A, th, mA, rO, Gc, xO, zF, TO (tmp-prov-recon).
- **Root cause:** Without spec sheets each rewrite task re-reads the bundle.
- **Fix:** For each of the ~40 components produce docs/spec/<name>.md: original identifier and line range, props, state, effects, store fields read/written, data files, DOM copy strings, hooks into other files (P-61), known defects, and the harness checkpoint that covers it; commit extracted JSON assets under legacy/extracted with schemas.
- **Acceptance test:** Every component row P-01..P-62 links to a spec sheet; a reviewer can implement a panel from its sheet alone.
- **Metric or grade moved:** Documentation, Delivery speed, Parity fidelity.

### prov-recon-45: Cut the boot request waterfall (34 JSON requests, duplicate chronology fetch, unused terrain)

- **Severity / effort:** medium / M
- **Audit refs:** P3
- **Depends on:** prov-recon-11, prov-recon-37
- **Evidence:** sF (bundle.pretty.js:96939) fires 14 OOB files (eF 96755) + terrain.json + 3 vignette files + day 1: 3 base + 13 density = 34 requests before the app is usable; chronology (3 files) is fetched again by PF (98548) and by the mobile shell (102958); terrain.json is never read by the main app; /data/* cache is 1 h.
- **Root cause:** Many small files fetched on the critical path and refetched by independent components.
- **Fix:** Build merged artifacts: units.json (all OOB, ids and parents), placements-day1.json (base + density, sorted), placements-day2/3.json, chronology.json, vignettes.json; only units.json and day 1 on the critical path (about 3 requests); prefetch the rest on idle; content-hashed names with immutable caching; share one chronology cache; drop terrain from the map bundle.
- **Acceptance test:** Harness request log before first interaction shows at most 6 data requests; total JSON brotli bytes recorded and budgeted; no duplicate fetch of the same URL.
- **Metric or grade moved:** Performance (P3), LCP and TTI.

### prov-recon-46: Accessibility primitives first: Dialog, landmarks, labelled controls, live regions, target sizes

- **Severity / effort:** high / M
- **Audit refs:** A2, A3, A5, A6, D2
- **Depends on:** prov-recon-34
- **Evidence:** Zero aria-* or role attributes in application code (grep of bundle.pretty.js:96209-113377); the only tabIndex is the timeline wrapper (112223); the whole bundle has 12 aria-label lines, all inside the vendored map library; icon-only close buttons are the character x; range inputs unlabeled (IO 112202); RECON repeats the pattern.
- **Root cause:** Components were built as styled divs with click handlers.
- **Fix:** Build and test in Phase 2, before panels: Dialog (focus trap, initial focus, return focus, Esc via the escape stack, aria-modal), Panel aside with heading, Toast region, IconButton (required aria-label, 44 px hit area), labelled Slider with aria-valuetext (clock and tick), landmarks (header, nav, main, footer) and a visually hidden h1 plus skip link in the app shell; axe runs in every harness checkpoint.
- **Acceptance test:** axe reports zero violations at all checkpoints; keyboard-only run completes first-run, search, unit selection, playback and closing every panel; screen-reader labels exist for every control (script asserts accessible name non-empty).
- **Metric or grade moved:** Accessibility (C+/C to A+), Usability.

---

## 10. Open questions for the owner

1. Sound: keep (opt-in, fixed) or remove everywhere, including the banner copy, the guide and `immersive.html`? (finding 29)
2. Is the deployed bundle (md5 7ef75b95f4) the intended latest, or should behavior from the v36/v37 lineage (2,287,335-byte bundle) be carried over? (section 2)
3. Which is authoritative for the battle clock: the chronology text times, or the tick index? The rebuild needs one anchor table signed off by a historian. (finding 13)
4. Canonical URL style: keep `.html` (recommended, no SEO churn) or move to extensionless with 301s? (finding 35)
5. Is the Mapbox token already restricted since audit X1, and are the Google key restrictions known? I could not verify from outside. (finding 08)
6. Is the Netlify site Git-connected, or are deploys manual zip uploads? Split testing and rollbacks depend on this. (findings 02, 39)
7. Are the Extra Features pages (Watch Together, Sandbox, AR and others) in scope for the Astro migration in the first pass, or should they keep their inline scripts until the core app cuts over? (finding 36)
8. Not verified because no browser or build was allowed: RECON's placeholder stacking behavior (5.2), the sound-path freeze (P-51), the timeline double key handling (P-30), and browser handling of the invalid OG PNG. Each needs one confirming run in Phase 1.
9. Heatmap: delete the dead H key and store fields, or commission a real heatmap layer from `casualty_apportionment.json`? (finding 32)
10. Should the Mapbox style stay `satellite-v9` (classic) or move to a Standard-based style in the rebuild? Not needed for parity; noted for a later design pass.

---

## Appendix A. Files created

- This report: `plan-work/prov-recon.md`.
- Scratch: `plan-work/tmp-prov-recon/` containing extraction JSON (`d2.json`, `monuments512_deployed_inline.json`, `nps_auto_tour_th.json`, `story_markers_mA.json`, `soldiers_eye_rO.json`, `onboarding_tour_Gc.json`, `onboarding_archetypes_xO.json`, `notable_units_zF.json`, `timeline_markers_TO.json`, `day_buttons_f2.json`) and analysis scripts (`recon_loader_test.mjs`, `oobkeys.mjs`, `plc.mjs`, `clocks.mjs`, `svdiff.mjs`, `d2cmp.mjs`, `extract_all.mjs`, `cmp_data.py`, `oobshape.py`, `zipscan.py`, `findings.py`, `gen_md.py`, `part2.md`).
- No file outside `plan-work/` was modified; the extracted zips and RECON tree were only read.

## Appendix B. Sources consulted on the web

- Mapbox GL JS v3.0.0 release notes (WebGL 2 mandatory, `optimizeForTerrain` removed): https://github.com/mapbox/mapbox-gl-js/releases/tag/v3.0.0
- Mapbox attribution requirements (logo and text attribution must be visible): https://docs.mapbox.com/help/dive-deeper/attribution/
- web.dev LCP definition (gradient backgrounds excluded, candidate element types): https://web.dev/articles/lcp
- Netlify Split Testing (requires Git-connected site, branch deploys, at least two branches) and Manage deploys (Publish deploy is an instant rollback): https://docs.netlify.com/manage/monitoring/split-testing/ and https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/


---

## Verification

Adversarial pass, 2026-09-30. Read-only. Scripts and scratch output are in `plan-work/tmp-prov-recon-verify/`. Method: every cited `bundle.pretty.js` line was re-opened (about 60 anchors: all component function line numbers, the undefined identifiers, store, clocks, mobile shell, loaders), data numbers were recomputed independently (`oobcount.mjs`, `plc2.mjs`, `dups.mjs`), the Lighthouse JSONs were re-read, cited web pages were fetched, and the zips in Downloads were rescanned. The live site could not be reached from this machine during verification (TCP timeouts to both Netlify IPs), so live-header claims (X4, embed headers) rest on `netlify.toml` plus the audit; the Mapbox foreign-Referer test was repeated directly against api.mapbox.com (HTTP 200 with `Referer: https://evil.example/`).

Overall: evidence quality is high (every function line number and every data count checked out). The defects are in root-cause attribution and in what the report did not look for. The five that change the plan: (a) real modular source trees exist on disk, so N1 and the "RECON is the only quarry" premise are wrong; (b) the C1/C2 root cause is wrong (the desktop timeline bar is mounted over the mobile shell), which also invalidates bridge patch 4; (c) Netlify Split Testing cannot be added to new projects since 2026-08-26, which breaks the canary design; (d) the clock rationale is wrong (the chronology data is linear at 5 min per tick until about tick 340); (e) the CLS attribution misses that the boot fast-forward causes about 73% of mobile CLS.

### Verdict table

| ID | Verdict | Note (evidence of check, or the correction) |
|---|---|---|
| prov-recon-01 | CORRECTED | Numbers verified: md5 `7ef75b95f4`, 2,280,438 B; mapbox region lines 10002-96208 = 3,273,785 B of 4,027,235 (81.3%); app region 96209-113377 = 490,044 B; RECON `absorb` gives 0, deployed `iF` logic gives 705 (rerun). Corrections: (1) the tally "9 wrong" is 10 (P-04, 09, 10, 11, 12, 13, 34, 36, 37, 40); P-62 is already inside the 6 dead rows, not an extra "+1". (2) Premise false: RECON PENDING.md "No original source ever existed anywhere else" and report section 2 ignore `Downloads/gettysburg_v2_fixed/src` and `gettysburg_COMPLETE_FIXED (1)/src` (65 files, 8,423 lines, mapbox-gl ^3.2.0: CanvasRenderer, Interpolator, AnimationEngine, GoldTrailEngine, SoundEngine, TrailRenderer, NPSTour, FollowAncestor, OpeningSequence, MonumentSystem, StreetViewPanel) and `gettysburg_FINAL_v24` / `gettysburg_FIXED_v25` (40 files, `vite.config.js` with manualChunks, `tests/validate_data.py` 279 lines, CI). See MISSED-1. Strategy C direction is still defensible, but the salvage quarry and the 38-50 day estimate need redoing with these as the spec skeleton. |
| prov-recon-02 | CORRECTED | Verified: `netlify.toml:1-2` `publish = "."`; `index.html:282` script src `index-Cg8FAMXN.js`; deploy zip lists five lower-case assets. Correction: the Netlify "source" zip `6aa16d6080...zip` already has the correct-case names (`assets/BookmarkPanel-C5YT4b5k.js`, `HelpModal-CFV9T0zH.js`, `index-B4G7Z_2G.css`, `index-Cg8FAMXN.js`, `InterpolationWorker-ufiwa2-e.js`), so Phase 0 step 3 is "copy from the source zip and prove md5 equality with the deploy zip", not a manual rename. Scale: Downloads holds 126 zips (deploy-history.md), 86 of which contain a file named `index-Cg8FAMXN.js`; "16 zips scanned" understates the archive work. |
| prov-recon-03 | CONFIRMED | `i2` at 96265, store `yn` at 9361 not on `window` (only `window.__gtbgApp` at 112757), zero `aria-`/`role:` in 96209-113377 (count 0), 12 `aria-label` lines in the whole bundle, all in the map library. |
| prov-recon-04 | CORRECTED | Only `get("ancestor")` exists (101019; nothing else in min.js). But the link count is 9 across 8 files, not 8 across 6: also `documentary.html:92` (`/index.html?tick=&vignette=`), `education.html:81` (same) and `search.html:139` (`/index.html?lat=&lng=`), in addition to turning-points:118, regiment:247, historian:110, search:114/127, embed:60. Add those three to the router and the harness list. Also `?ancestor=` is read only inside `Zk`'s mount effect, i.e. after the user opens the panel. |
| prov-recon-05 | CORRECTED | Evidence is understated: rescanning Downloads finds 45 distinct byte streams (86 zips) under the name `index-Cg8FAMXN.js`, not four; 28 zips hold `7ef75b95f4`, 11 hold `37be334491`. Conclusion and fix stand and are stronger. |
| prov-recon-06 | CONFIRMED | `netlify.toml:1-2`. Note: the 404 rules for `/src/*` etc. are redundant once `publish` is a build output directory; the publish directory is the real control. |
| prov-recon-07 | CONFIRMED | `cmp_data.py` rerun: 69 same, 2 different, 1 RECON-only; mojibake confirmed (5-byte diff at the em dash); PDF 9,282 vs 14,321 B; favicon, icon-192 and robots.txt differ. Nit: RECON `apple-touch-icon.png` is actually an ICO container (16 and 32 px) with a .png name, not a 32x32 PNG; deploy is a real 180x180 PNG. |
| prov-recon-08 | CONFIRMED | Token at 97210 and 102899, in 9 pages (12 places with the RECON default), Google key at 110610. Foreign-Referer request to api.mapbox.com returned 200 today. Google key restriction not testable here (UNVERIFIABLE, as the report says). |
| prov-recon-09 | CONFIRMED | `attributionControl: !1` at 102988 and 110777; desktop map 97237-97250 keeps default attribution; RECON `MapView.jsx:44`. Mapbox attribution page: logo mandatory, text attribution may not be hidden; it names no compact-display exception (Mapbox's own compact control is fine). |
| prov-recon-10 | CONFIRMED | `R = "3.24.1"` at 53873; `dragPan {inertia...}` and `scrollZoom {speed, smooth}` at 97248-97249 vs bundled reads at 88952 (`deceleration/maxSpeed/linearity`) and 89624 (`around`). v3.0.0 release notes: WebGL 2 mandatory, `optimizeForTerrain` removed. `supported` is still exported in 3.24.1 (92669), so the `mapboxgl.supported()` guard is valid. |
| prov-recon-11 | CONFIRMED | Independent count: 467 regiments + 93 brigades + 11 corps + 31 divisions + 8 horse_artillery + 95 batteries + 7 wrapper records = 712; 705 keys; 0 collisions. 694 base + 1,110 density; 188 ticks; 478 unit ids; RECON base-only 117 ticks, 152 units. `sF` = `iF, rF, oF, zp(1)`. Nit: `eF` (96755) holds 13 OOB files plus `commander_successions.json`. Cross-ref MISSED-4 (duplicate keys) and MISSED-5 (jump never loads day 2/3). |
| prov-recon-12 | CORRECTED | Verified: `i2` accumulator (only 96271/96279/96291), `y1` called in an effect (97324), `fF` given wrong props (97384). Correction to the fix: a symbol layer with `icon-allow-overlap:false` (the owner's reference page does this, `unit-rendering-reference.html:155`) hides colliding icons; the deployed renderer draws every unit and only spreads labels with leader lines (96561-96588). In dense zones (Pickett's Charge, Wheatfield) units would vanish, so T1 "unit set" parity cannot hold on screen. Allow icon overlap (or use `icon-ignore-placement`) and apply collision only to text labels. Also `i2` carry-forward is today's de facto visibility rule (units persist after their last record), so the "explicit TTL" is a behavior change that needs owner sign-off (the report lists it as a decision, fine). |
| prov-recon-13 | CORRECTED | All six clock sites and July+2 verified (9371, 9856, 97428, 100836, 100998). The stated reason is wrong: "ticks are event-indexed (188 populated ticks), not uniform" conflates placements with the clock. The chronology files declare `tick_formula: "Tick 1 = 5:00am July 1. Each tick = 5 minutes"` (226 = 5:00am July 2, 451 = 5:00am July 3); the 137 events are monotone in all three days (0 inversions, scripted) and run at exactly 5.0 min/tick for most of days 1-2. They drift from about tick 340 (3.0 min/tick: tick 360 = 3:20pm, tick 450 = 7:50pm; day 3 ticks 480-500 at 3.0-3.7, 580-675 at 3.1-4.0). So `ticks.json` is right, but as a piecewise map anchored on chronology times (which are monotone), and the 6:00/4:00 base of `getTickTime` is the outlier, not the 5:00 base. NPS tour subtitles (tick 12 = 7:30 AM, tick 264 = 4:00 PM) fit history but not the chronology (tick 264 = 8:10 AM); reconcile them against the chronology. |
| prov-recon-14 | CORRECTED | 14 tools and 5 dead controls verified (103419-103470; states `An`, `Zn` set and never read; `lo` compared only at 103505 and 103617). The root cause of C1/C2 is wrong. `pO`'s `playRow` (103216-103241) has 5 children (2 round 52 px buttons, one 64 px play, one speed button, tick text), about 376 px wide, not "4 round buttons" and not 572 px. The 572 px off-screen row with Back/Prev/Play/Next/Fwd is the desktop `IO` timeline (112202; its buttons include the 12-tick skips), and `V.jsx(IO, {})` is mounted unconditionally at `bundle.pretty.js:113249` together with FF, OF, VF, WF, CF, LF, _F, KF, XF, iO, nO, yO, qF and MF (113242-113284), outside the `Zn !== "mobile"` guard, so it paints over the mobile root (`tn.root`, 103699, z-index 100). This matches app-mobile.md finding 1. See MISSED-2. The one-shell rebuild is still sensible, but C1 and C2 do not need it. |
| prov-recon-15 | CONFIRMED | Splash `setState` per rAF frame (101486-101505), `_F` own rAF plus `sT()` (97419-97426) and `Ed` `sT()` (96976), `KF` rAF runs regardless of `showMonuments` (100850-100868, deps `[c]`), `cF = 500` (96948). |
| prov-recon-16 | CONFIRMED | `tO` (101472), `eO = 3500`, `Object.keys(he).length > 5`, 800 ms, rAF loop, 600 ms fade; mounted whenever `!vn` at 113059, every visit. |
| prov-recon-17 | CONFIRMED | `sw.js` and `index.html:255-277` as described; Lighthouse redirects 9,066.6 ms mobile / 1,575.1 ms desktop, both chain entries are `/`. Supporting evidence for the causal claim: the LCP breakdown of the final navigation is only 609 ms (TTFB 152 + render delay 457) against a 9,007 ms LCP metric, consistent with the reload consuming the rest. It remains an inference from simulated throttling, not a measurement. |
| prov-recon-18 | CORRECTED | No font is loaded (font-display insight empty), so the Google Fonts point stands. But the CLS attribution is incomplete: mobile CLS is 0.0726 over 15 shifts; the splash swap is only 0.0098 (13%). Event-card (`LF`, `bottom:120px`) shifts sum to about 0.044 (61%) and story-panel text adds 0.0088, so about 73% comes from panels driven by the boot fast-forward. Desktop 0.0229: `#extra-features` 0.0072 plus about 0.016 in shifts Lighthouse could not attribute to a node. Fix: finding 16 (no fast-forward gate) must be listed as the CLS fix, with a CLS assertion at boot in the harness. See MISSED-3. |
| prov-recon-19 | CONFIRMED | 81.3% mapbox, unused JS 614/654 KiB, bootup 3.3/2.5 s, main-thread 5.6/5.1 s all match `lh_*.json`. Note the map is the index route, so the mapbox chunk still gates the map paint; the 120 KB budget applies to the shell only. |
| prov-recon-20 | CONFIRMED | React 18.3.1 (440, 8927), zustand 4.5.7 lock, Vite 5.4.21, mapbox 2.15.0 in RECON, `vite-plugin-pwa` 0.17.5 imported nowhere (the `vite.config.js` comment confirms). |
| prov-recon-21 | CONFIRMED | 49 store members counted; all 13 named members have no functional consumer (`toggleHeatmap` is called only from the H key and the Help chunk's unused hook). |
| prov-recon-22 | CONFIRMED | `MF` 97897, `wF` 97571, `SF` 97664, hard-coded alerts 97743-97756; field census: division 0, brigade 0, type 0, casualties_killed 0, strength_at_start 0. Nuance: `corps` exists on 7 records, so the breadcrumb can render for at most those. |
| prov-recon-23 | CONFIRMED | `qF` 99888 works (`approx_tick`, 4500 ms, only while playing); `nO` 101679 filters `H.tick`, which the successions data does not have (`approx_tick`). |
| prov-recon-24 | CONFIRMED | `GF` 99644 calls `yn.subscribe(selector, listener)` against a one-argument `subscribe` (9134); `Xk` depth from dashes (102359); `localeCompare` sorts at 101039, 102346-102354, 102674-102681; toolbar titles 113147-113226 contain no Order of Battle. |
| prov-recon-25 | CORRECTED | Undefined `setGoldUnit` (101086, 101229), `clearGoldTrail`, `drawGoldTrailSegment` (101101) verified (only in the bundle; no definition in any deployed file); `st()` throws before `flyTo`. Correction: the root cause is not "helpers never written". They exist in `Downloads/gettysburg_FIXED_circular/src/engine/GoldTrailEngine.js` and `gettysburg_COMPLETE_FIXED (1)/src/engine/GoldTrailEngine.js` (`setGoldUnit`, `drawGoldTrailSegment`, `clearGoldTrail`); the bug was born when `FollowAncestor` re-exported instead of importing them (deploy-history.md: `FollowAncestor.jsx:15`). The Mapbox line-layer plan is fine, but the canvas helper is a ready stopgap for a bridge patch. |
| prov-recon-26 | CONFIRMED | `d2` 16 stops, 48 paragraphs, 16 videos, 16 `sv` blocks; `rO` 8 sites; `dangerouslySetInnerHTML` at 110653. Nit: `svdiff.mjs` shows 7 differing stops (2, 3, 5, 6, 12, 13, 15); stop 5 is only `pano:null` vs absent and stop 2 is coordinate rounding, so 6 are substantive, as reported. |
| prov-recon-27 | CONFIRMED | 16 tour stops (`th` 100063), 20 markers, 512 monuments byte-identical to RECON (diff entries 0). `src` is empty on 503 of 512 monuments ("many" understates it). |
| prov-recon-28 | CONFIRMED | `dO` and `bO` both mounted on first visit (113059-113070, `gtbg_onboarded` gate at 112951); layout never persisted (`Zn` is plain state). |
| prov-recon-29 | CORRECTED | Freeze verified: `lS` reads `CanvasRenderer._lastSoundMs` only after `N4()` (sound on) returns true (96554-96557) and throws before the next `requestAnimationFrame` in `Ed` (97017). Additions: (1) the reference exists in the real source too (`COMPLETE_FIXED/src/engine/CanvasRenderer.js:130`), so it is a source bug, not a bundle-patch scar; (2) "the guide may too (unchecked)" is now checked: `user-guide.pdf` text says "Live cannon and musket sound tied to real troop density" and "A heatmap that builds across all three days"; `index.html:377` banner says "live sound". Removing sound or the heatmap therefore also means editing the guide, banner and Help copy. |
| prov-recon-30 | CONFIRMED | Script ranges 255-277, 294-353, 355-396, 398-440, 441-519, 521-606, 608-714 and CSS 176-206 (z-index 999999 at 185) match; `Vs` sets `title` on every button, so the patcher skips all; layout-shift audit names `#extra-features` at `top:50%` (desktop, 0.0072). Side effect the report did not note: accessible names of the icon buttons stay "S", "F", "L", "B", "?" (content beats `title`), which the patcher was written to fix. |
| prov-recon-31 | CONFIRMED | `AO` handler skips `INPUT` (112968); wrapper `tabIndex 0` and `onKeyDown` (112223-112224); Help chunk lists `m` and `h` and exports unused `useGlobalKeyboard`. |
| prov-recon-32 | CORRECTED | Dead items verified (`fF`, `nO`, `GF`, orphan worker with 0 references, `terrainData` set at 96921 and never read). "Delete by default" for the heatmap conflicts with published copy (guide text above, H key row in Help), so it is an owner decision with copy edits, not a default. |
| prov-recon-33 | CONFIRMED | Keys and shapes at 9329, 97821, `index.html:328`, `watch-together.html:159-161`, RECON `BookmarkPanel.jsx:16-20`; the share URL builder `$k` (97823) emits `?t&u&z&ll`. |
| prov-recon-34 | CONFIRMED | 41 uses of `#c8a84a`, one `#d4a840`; `#c9a24b` 40 times in pages; `Ar.sideBadge` 9 px, `Ar.lbl` 10 px, `tc.toolBtn` 12 px and `4px 10px`. The z-index census differs slightly (also 2, 3, 20, 30, 301, 800) but the conclusion holds. |
| prov-recon-35 | CORRECTED | Structure and 8 social tags verified. The sitemap has 21 `<loc>` entries (home plus 20 pages), not 20. Astro option names remain unverified, as the report states. |
| prov-recon-36 | CORRECTED | Deep-link and bfcache facts verified (no `unload` handler anywhere; `site-nav.js:206-221`). The header fix is under-specified: Netlify's headers documentation does not define what happens when two matching rules set the same header, and the report's own evidence (audit X4: `X-Frame-Options = ""` did not remove it) shows a narrower rule cannot delete a `/*` header. "Path-scoped header rules so embed.html gets only frame-ancestors *" will not work as written; generate an explicit `_headers` list of the non-embed paths at build time (or drop XFO and use CSP `frame-ancestors` per path) and test on a deploy preview. |
| prov-recon-37 | CORRECTED | Pipeline plan fine. Validators must add (unit_id, tick) uniqueness (MISSED-4) and can start from `gettysburg_FINAL_v24/tests/validate_data.py` (63 checks). |
| prov-recon-38 | CORRECTED | "No CI, tests, lint or types exist" is true for RECON and the deploy but not for the older lineage: `gettysburg_FINAL_v24/.github/workflows/ci.yml`, `tests/validate_data.py` (279 lines), `tests/perf_test.py` (103 lines). Reuse them. |
| prov-recon-39 | CORRECTED | Netlify docs (fetched twice) and a search confirm: "As of August 26, 2026, you can no longer add Split Testing to new projects. Split Testing never left Beta and isn't receiving further development." This project does not use it today, so the 10/50/100 canary in 6.7 is unavailable. Replace with client-side percentage bucketing in `/flags.json` (sticky via `localStorage`), or a cookie-conditioned rewrite set by the app (verify on a preview); keep the kill switch. The "Publish deploy" rollback claim is confirmed (instantaneous, atomic, no rebuild) and does not require a Git connection, contrary to what open question 6 implies. |
| prov-recon-40 | CORRECTED | Patches 1-3, 5, 6 are sound. Patch 4 targets the wrong element (`pO`'s `playRow` is not the overflowing row). The bridge patch for C1/C2 is to gate the desktop overlays (at minimum `IO` at 113249) with `Zn !== "mobile"`. For patch 1, port the real `GoldTrailEngine.js` helpers instead of no-ops. |
| prov-recon-41 | CORRECTED | Section 6.4 arithmetic: phase ranges sum to 35.5-44.5 days without Phase 7 and 41.5-52.5 with it; "38-50 including the parallel track" matches neither. Scope not costed: bridge patches, historian and data corrections, per-page A+ fixes, Historian expansion. Treat as optimistic. |
| prov-recon-42 | CONFIRMED | IHDR 1280x720, 8-bit RGB, decompressed IDAT 3,687,120 B = RGBA-sized (expected 2,765,520); Pillow raises "unrecognized data stream contents"; `day1.png` and `day3.png` share md5 `3f6646c9...`. Added check the report lacked: Windows GDI+ and WIC decode it without error but render horizontal striped noise (viewed), so the OG and PWA screenshots are visibly corrupt in lenient decoders and rejected by strict ones. og:image is 1280x720 rather than 1200x630. |
| prov-recon-43 | CONFIRMED | 0 references to `InterpolationWorker`; the entry exports 8 names at 113370-113377. |
| prov-recon-44 | CONFIRMED | 25 of 25 sampled component and data anchors match (`wF`, `SF`, `MF`, `CF`, `LF`, `FF`, `OF`, `VF`, `WF`, `Yk`, `Jk`, `XF`, `th`, `mA`, `d2`, `rO`, `bO`, `xO`, `Gc`, `GtbgDist/Layers/Loc`, `IO`, `gF`, `lS`). The "~40 components" count and the L effort are not independently checkable (UNVERIFIABLE). |
| prov-recon-45 | CORRECTED | 34 = 13 OOB + `commander_successions` + terrain + 3 vignettes + 16 day-1 files (3 base + 13 density). `commander_successions.json` is fetched a second time by `Hk` (97522) besides `eF`; the merged artifacts should share one successions fetch as well as one chronology fetch. Consistent with perf-cwv's 38 requests once chronology (3) and the second successions fetch are added. |
| prov-recon-46 | CONFIRMED | Zero aria/role in app code; single `tabIndex` at 112223. |

### MISSED issues (in this specialist's scope)

**MISSED-1 (high): real source trees exist and were not evaluated; N1 and the salvage plan are built on a false premise.**
Evidence: `Downloads/gettysburg_v2_fixed/src` and `gettysburg_COMPLETE_FIXED (1)/src` are 65 files, 8,423 lines (Jun 13), mapbox-gl ^3.2.0, containing `engine/{CanvasRenderer,Interpolator,AnimationEngine,GoldTrailEngine,SoundEngine,TrailRenderer,TimeOfDayLighting,OverlayLayers}.js` and `components/{FollowAncestor,NPSTour,OpeningSequence,MonumentSystem,StreetViewPanel,StrengthBar,PlaybackStatus,DistanceTool,...}.jsx`; string probes in `COMPLETE_FIXED/src` find "Fast-forwarding", "1x (real time)", "Highest Union regimental casualty" and `July ${`, the deployed strings. `gettysburg_FINAL_v24` / `gettysburg_FIXED_v25` (40 files) carry `vite.config.js` with `manualChunks` (mapbox, react, zustand, engine, components), `.github/workflows/ci.yml`, `tests/validate_data.py` (279 lines, 63 checks) and `tests/perf_test.py`. RECON `PENDING.md` states "No original source ever existed anywhere else", and the report repeats it (N1, section 2, section 6.1).
Fix: add these trees to Phase 0 (archive and commit under `legacy/source-2026-06/`); diff `COMPLETE_FIXED/src` against the app region 96209-113377 to build a component-to-minified-name map (this cuts finding 44 and the parity spec effort); salvage `GoldTrailEngine.js`, `validate_data.py`, `perf_test.py`, `ci.yml` and the manualChunks config; treat RECON as the weakest of the four quarries. Per string probes they lack the device chooser, Virtual Walkthrough, Gtbg layers/distance/locations and the mobile shell `pO`, so those still come from the bundle. Effort: S to add to Phase 0, M to diff.

**MISSED-2 (high): desktop-only overlays are mounted in the mobile layout; this is the real root of C1 and C2 and a source of per-frame work on phones.**
Evidence: `bundle.pretty.js:113242-113284` renders `VF, CF, LF, _F, IO, KF, XF, iO, nO, yO, qF, MF` (and `FF`/`OF`/`WF` behind flags) with no `Zn !== "mobile"` guard, while only the toolbar and `gF` are guarded (113233-113240). `IO` (112202) paints over `tn.root` (103699, z-index 100); `_F` and `KF` run always-on rAF state updates (97419, 100850) on phones as well.
Fix (bridge patch, S): gate every desktop overlay on `Zn !== "mobile"` except those the mobile shell relies on (audit each; keep `CF`/`LF`/`qF` only if repositioned above the mobile transport). In the rebuild: one layout switch, no unconditional siblings. Acceptance: at 375 px in Mobile layout the only transport row is the mobile one, Tools sheet rows 10-14 are tappable, and long-task count during playback drops. Moves: C1, C2, INP, TBT on mobile.

**MISSED-3 (medium): the boot fast-forward generates most of the mobile CLS.**
Evidence: `lh_mobile.json` layout-shifts: total 0.0726; the event-card node (`position:absolute; bottom:120px; left:50%; translateX(-50%)`, labels "HIGH 10:00am Coster's brigade...", "HIGH 7:35am...", "CRITICAL 9:20am McLaws's...") accounts for eight shifts summing about 0.044 (61%), a story-panel text block 0.0088, and the HTML-to-React splash swap only 0.0098. Cause: `tO` sets `currentTick` 1 to 675 in 3.5 s (101483-101494) behind the splash, which mounts and unmounts `LF` and `CF` content.
Fix: in the rebuild never drive the tick during boot; in the bridge, skip or shorten the intro for returning visitors and keep transient panels unmounted until `onComplete`; add a Lighthouse or Playwright CLS assertion for the first 5 s. Moves: mobile CLS 0.073 to about 0.01.

**MISSED-4 (medium): 117 duplicate (unit_id, tick) placement pairs, 73 of them conflicting, resolved today only by load order.**
Evidence: `tmp-prov-recon-verify/dups.mjs`: across 9 base and 38 density files (1,804 records) there are 117 repeated (unit, tick) pairs, 44 identical and 73 with a different lat, lng, strength or disposition (e.g. `C-III-1-3@304` twice in `placements_day2_ticks301_375.json`; `U-HAB-E4US@1` in base and in `density_artillery_positions.json`). The loader concatenates base then density (`[...x, ...M]`, 96906) and `y1` keeps the last, so the density record silently wins.
Fix: add (unit_id, tick) uniqueness to the validators (finding 37), decide per pair with a historian, and record "last record wins" as the T1 golden rule until resolved (finding 11 says "documented precedence" but does not quantify the problem). Effort: S to detect, M to adjudicate.

**MISSED-5 (medium): the parity harness would encode a legacy bug as a golden.**
Evidence: `zp` (96900) is called only from the playback loop at ticks 200 and 420 (96991-96992, only while playing) and from the mobile shell (103040-103042); `jumpToDay`, keys 1-3 and the day buttons only set the tick (9369-9370, 112979-113010). On desktop, a fresh page that jumps to Day 2 or 3 without playing has no data for those days (placements missing; ghost units from `i2`). The harness spec "fresh page per checkpoint, scripted navigation" (6.6) would capture that empty state as the expected result.
Fix: in T1, load all three days before each checkpoint (or call `zp(2)`/`zp(3)` in the legacy fixture) and register "jump while paused shows empty Day 2/3" as an intended diff keyed to D3; app-bugs.md already lists the defect, this only prevents the harness from freezing it in.

**MISSED-6 (medium): published copy promises the features that findings 29 and 32 propose deleting.**
Evidence: `user-guide.pdf` text: "Live cannon and musket sound tied to real troop density." and "A heatmap that builds across all three days."; `index.html:377`: "search, an AI-style historian, live sound, AR, and more"; Help row "Toggle heatmap" (`helpmodal` chunk, case "h"). The report only says the guide "may" mention sound.
Fix: turn 29 and 32 into a decision table with a copy checklist (guide PDF, banner, Help, meta description, JSON-LD) for each outcome; if the owner keeps "delete", the same PR edits every string, and a grep-based test fails the build if "heatmap" or "sound" appears in shipped copy while the feature is absent.
