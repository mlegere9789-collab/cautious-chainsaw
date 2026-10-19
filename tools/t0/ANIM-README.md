# ANIM: the unit-marker engine (optional group of the Tranche-0 builder)

Status: BUILT AND TESTED LOCALLY, NOT DEPLOYED, NOT REGISTERED in `tools/t0/trains.json` (the integrator's file). The group lives in `tools/t0/patches-next/` (inert, like `CLOCK.json`, `DATA.json` and `MON.json`) and is applied by the unmodified builder through a wrapper.

What it does, in one sentence: it replaces how the main map draws, moves and lays out the unit marks (the shipped `lS` / `y1` / `Ed` routine, the one that makes tiles teleport, overlap and jitter) with an engine that moves every unit continuously along a monotone cubic path through its own keyframes, never lets two marks overlap, never nudges a full mark, merges a crowd into one formation mark that says what it stands for, fades marks in and out instead of popping them, glides on jumps, and draws in the approved look ("Standards", `docs/pitch/anim2/release-look/APPROVED-LOOK.md`), while every popup of the app is kept, restyled in the same language and placed on ground the marks do not use.

Read this file with `tools/t0/README.md`, `docs/decisions/OWNER-DECISIONS-2026-10-05.md` and `docs/pitch/anim/` (the research this is built on: `01` root causes of the jitter, `02` popups, `05` architecture, `06` layout).

## 1. Build, register, switch off

```
node tools/t0/anim/build-anim.mjs                  # compile tools/t0/anim/src  ->  tools/t0/patches-next/ANIM.json and ANIM+mon.json   (--check: exit 1 when stale; --dev: also write tmp/motion-build/anim.dev.js, readable)
python tools/t0/anim/anim_build.py --train R1c --out tmp/motion-build/anim-R1c          # R1c + MON + ANIM in a scratch tree (never release/R1c); --without-anim = the control; --extra CLOCK.json --extra DATA.json
node tools/t0/anim/tokens/make-skin-tokens.mjs     # the look's token JSON (tokens/standards.tokens.json) from its source (--check)
node tests/t0/anim.spec.mjs --dist tmp/motion-build/anim-R1c/dist --control tmp/motion-build/ctl-R1c/dist       # the tests (see section 7)
```

Registration (the integrator): add `"ANIM"` to `optional_groups` AFTER `"MON"` and copy `patches-next/ANIM.json` (and `ANIM+mon.json`, an extension part whose one hook anchors on the Monuments runtime and is valid only when MON is in the build) to `tools/t0/patches/`; build with `--with MON,ANIM`. ANIM applies after MON (its Monuments hook anchors on MON's finished text) and needs groups A..CP, A2, SHELL, PERF (the entry text its anchors were written against) and B (the carry-forward `y1`). It does not overlap a single anchor of `CLOCK.json`, `DATA.json` or `MON.json` (checked: the three are built together with it, section 7).

Kill switches (the shipped renderer comes back, no deploy): `?anim=legacy`, `localStorage.gtanim_off = "1"`, the "Legacy renderer" button of the tuning panel, and an automatic fallback: an exception inside the engine switches it off for the session and the shipped routine draws from the next frame on (`?anim=strict` or `window.__gtanimStrict` rethrow instead, which the tests use).

Size: the engine adds 277,001 bytes to the entry bundle (2,338,435 to 2,615,436 raw, +11.8 %; gzip -9: 646,999 to 776,533, +129,534) (readable sources about 270 KB; fonts 73 KB of it, base64).

## 2. The nine hooks (all `expect: 1`)

| patch id | what the app hands to the engine |
|---|---|
| `ANIM:engine+e1` | the engine itself and its one `bind` line (store `yn`, prefetch of the later days, the reduced-motion flag, the trails flag `Vk`); the paused repaint `e1` (tick, selection, filter, resize, map move) goes to the engine, the shipped body stays as the fallback |
| `ANIM:Ed-top` | the playing loop `Ed`: the engine owns the clock; the shipped loop only keeps the fps counter and the wake-up |
| `ANIM:y1` | every other consumer of the units at a tick (minimap, picker index, fly-to) sees the positions the engine draws |
| `ANIM:pick-desktop`, `ANIM:pick-mobile` | the mark under the pointer as drawn (select and pin), empty ground deselects, a crowd moves the map in until it splits; a finger-sized reach on the phone |
| `ANIM:resize-guard` | `GtbgRepaint` must not reset the backing store the engine sized for the device pixel ratio |
| `ANIM:oob-files` | the order-of-battle files the loader fetched are handed to the engine (hierarchy, designations, battalions) |
| `ANIM:mon-units` (`ANIM+mon.json`) | the Monuments click arbitration uses the units as drawn instead of the latest keyframe |

Nothing else of the bundle is edited: the store, every popup, Soldier's Eye View, Follow Your Ancestor, the deep links, the mobile shell and the Monuments layer run as they did.

## 3. Architecture (tools/t0/anim/src)

```
engine/   DOM-free, loads in node (the tests run the same code):
  model.mjs           the battle: units, keyframes, the order-of-battle hierarchy; visibleAt(tau) = which units are on the field and where
  interp/             pchip (default), chord-smooth, linear: exact at every keyframe, monotone (no overshoot), C1 through keyframes, start and end at rest
  layout/             the certified layout (06-layout.md): exact minimum-displacement placement, aggregation along the order of battle as the guaranteed fallback, sticky crowds (merge now, split later)
  scene/display.mjs   the display layer: entry/exit fades, one-frame swaps, glide of a re-anchored crowd, the net (every displayed frame verified; a mark that overlaps because it is still gliding snaps onto its certified place)
  skins/              the look: kit.mjs (everything a skin needs that is not its design), semantics.mjs (what each mark may claim, evidence labels), standards.mjs (THE LOOK), minimal.mjs (a complete skin in 35 lines)
  core.mjs            composes them: step({tau, cam, project, ...}) -> frame
host/     the only code that knows the app:
  app.mjs             the glue and the entry points the hooks call; reads the store and the map, draws in the map's render event
  clock.mjs           the continuous fractional tick and its rules
  dataset.mjs         builds the engine's dataset at runtime from the app's own loaded data
  render.mjs trails.mjs   the canvas drawing, the stage, the trails of the app's "Trails" button
  popups.mjs chrome.css.mjs   the popups: style, free-ground placement, rings, legend, hover card
  studio.mjs          the hidden tuning panel (?tune=1)
  skins.mjs           the list of skins
tokens/   anim.tokens.json (every dial of the engine, with range, unit and documentation), standards.tokens.json (every token of the look)
```

Frame pipeline (one straight line, inside the map's own render event, so the overlay can never lag the map): clock -> `visibleAt(tau)` -> layout (in SCREEN pixels through the map's own projection: a rotated or tilted map works, the marks stay upright) -> display layer -> verifier -> draw. Idle means no frames: nothing moves, nothing is drawn.

The data is not embedded: the engine builds its dataset at runtime from `placementsByTick` (the app's own store) and the order-of-battle files the loader fetched, so a corrected data file (the DATA group) reaches the marks with no change here. The later days are fetched about 1.5 s after the first frame (they are 114 KB a day) so that a unit whose gap spans a day boundary is on its path from the start of play instead of jumping when the data arrives.

## 4. What the owner decided, and where it lives

| decision | how it is met | where it is tested |
|---|---|---|
| The wrong clock is corrected | Not this group (`CLOCK.json`). ANIM prints no time of its own: the popups keep the app's clock, the engine runs on ticks and the app's integer tick stays the key of everything | n/a |
| Every wrong displayed datum is fixed: verified, labelled with its uncertainty, or removed | What the marks print comes from the order of battle and the placements and from nothing else: names are the order of battle's own designations, a unit's code is its data code, strength is "N men at this placement" (a placement value, labelled Modelled, never called a casualty count), a unit whose records disagree about its side is Contested (hatched neutral cloth, never a side colour). **A record the order of battle does not list is never given an echelon**: the approved look printed "4th Div, 3rd Corps" for the record `C-III-4` (95 of the 478 records have no order-of-battle entry); it now reads "unit III/4". The legend and the hover card carry the site's evidence label on every claim (Documented, Modelled, Computed, Contested). The casualty-memory ground marks of the approved look are NOT shipped (their time and place were Modelled and read as noise at the opening zoom, `APPROVED-LOOK.md` limit 10) | N7, B10 (hover card) |
| The Monuments feature works and is accurate | Untouched. One hook (`ANIM+mon.json`) makes its click arbitration use the units as drawn. The stars and dots are Mapbox layers, so they stay glued to the ground while the marks glide | the MON suites, section 7 |
| Unit-marker movement is smooth and professional | One continuous clock, monotone cubic paths exact at every keyframe, eased entries and exits, an eased glide on jumps, a cross-fade beyond 40 ticks, steps under reduced motion, no mark moves beyond its unit's own motion except in a few discrete events (a crowd forms or splits) | N1, N2, N3, N6, B2, B4, B5, B6, B7, B8 |
| Tiles never obscure each other and never hide vital information | The certified layout (exact placement, aggregation as the guaranteed fallback), the verifier on every displayed frame with the net, the stage (a mark is whole or absent), and cards placed on ground the marks do not use | N4, N5, B9, B10 |
| Every popup is kept and improved | The same components, words, triggers and keys, restyled in the look, placed on free ground, with a ring and a leader to their subject, the legend generated from the skin, a hover card | B10 and the suites |
| Extensible: skin module plus token JSON, tuning panel | Section 5 | B12, N8 |
| No errors are permissible: say exactly what was verified | Section 6 and section 7 | the whole suite |

Defaults of the brief (the open decisions): at the opening zoom 13.5 small side-and-arm marks below zoom 15 and full marks above (`detail.fullZoom` of the skin, `layout.fullZoom`); crowds merge into a formation mark that names what it stands for; **no ghost tiles** (a mark the layout replaces is swapped in one frame; only a unit coming onto or leaving the field fades, in place, over nothing; only a jump too big to glide cross-fades, `motion.cutFadeMs`); **no nudging of full marks** (`layout.dMaxFullPx` 0; small marks may stand up to 56 px from their unit with a pin, `layout.dMaxPx`); reduced motion = steps, no glides. *Deviation:* "rotation and tilt locked on the unit layer" is met as "the marks never rotate or tilt" (they stay upright, the layout is done in screen pixels through the map's own projection), not by switching the map's rotation off: the A2 test T0-DF-02 documents Shift+arrows as rotating the map, and a rotated, tilted map works (T0-ANIM-B13).


## 5. Extending it

**A new skin in under 50 lines.** `src/engine/skins/minimal.mjs` is a complete, conforming skin in 35 lines: it declares its tokens, a footprint, the channels it draws and one `draw.tile(c, t, g)`; the kit supplies the honest view model (`g.vm`: side, arm, rank, strength, posture, fresh or carried), the eased selection and hover (`g.sel`, `g.hov`), the arrival progress (`g.enter`), device-pixel snapping (`g.cr`, `g.lw`), safe text (`g.text`) and the legend (generated from the `channels` and `sample`). To add one: write the module, add one import and one entry to `src/host/skins.mjs`, run `build-anim.mjs`. It appears in the tuning panel, in `?anim=skin:<id>`, and in the legend. At run time `GTANIM.registerSkin(skin)` adds one without a build.

**The look is a skin module plus token JSON.** The drawing is `src/engine/skins/standards.mjs`; its 92 tokens (colours, pole heights, flag sizes, halo, the detail zooms, motion constants) are one table in `standards.spec.mjs`, exported as `tokens/standards.tokens.json` (every token with its documentation, range and unit; the colour-blind-safe and the high-contrast sets). A designer changes a number and nothing else. Live: the tuning panel's Skin tab, or `window.__skinKit.setToken('standards', 'pole.brigade', 28)`.

**The hidden tuning panel, `?tune=1`.** Motion and layout (one control per token of `anim.tokens.json`), Skin (the active skin's tokens), Numbers (frames per second, p95 frame time, marks drawn, overlapping pairs found by the verifier (must be 0), pops and teleports, net snaps, solve and draw milliseconds, the JS heap), Export (the whole setting as JSON, `gtanim-settings/1`, plus the skin's tokens; Import; Reset; Legacy). Settings are remembered in this browser only while the panel is in use.

**A new motion model, layout strategy or skin** is a named registry entry (`kernel.interp`, `kernel.layout`, `kernel.skins`); the tuning panel offers every registered module.

## 6. Honest limits (what is not verified)

Everything below is stated as it is. Nothing here says the group is free of errors; section 7 says what was checked and with what.

**Not verified at all.** A real phone (the "phone" numbers are a 4x CPU throttle on this desktop's GPU, which throttles the main thread only), Safari, Firefox, battery and heat, a screen reader on the new cards, colour-blind readers beyond the pitch's simulation (the greyscale luminance ratio of the two armies is 1.09:1, so colour alone does not separate them: the flag's direction and the cloth do), Windows high-contrast mode.

**What the marks claim.** Every unit position is Modelled (hand-authored keyframes with no basis field); between two keyframes it is a Modelled interpolation. The monotone cubic path leaves the straight line between two keyframes by a median 0 m, 49 m at the 90th percentile and 390 m at most (939 moving segments, computed over the data of R1c); the unit panel and the hover card say "placement value", never "casualties". A mark in motion between keyframes is flagged `moving` to the skin; the look does not draw a distinct "in transit" cue.

**History dependence.** The layout has memory (crowds merge now and split later, a displaced mark relaxes slowly), so the SAME moment can show a different crowding depending on how it was reached (measured once: 8 marks for 29 units after a series of card and viewport changes, 24 marks for the same 29 units on a fresh page). To keep that from lasting, the engine has a rest canon: once the picture has been still for 20 frames and nothing on screen is fading, it solves the layout once from clean state and adopts that solution only if it shows MORE marks than the one on screen (never fewer, so no flicker and no cycle); not while a unit is selected; any change of camera, time or units re-arms it. What is deterministic and tested is every unit's true place and every mark that stands on its own unit (T0-ANIM-B5).

**The look's known limits** (`APPROVED-LOOK.md`, 17 items), as they stand in this group: 1 (invented echelons) closed, tested (N7); 2 and 3 (strength references 3865, 6100, 4700) not closed: they are data, they only move a bar, and the hover card prints the placement value, not "of 3,865"; 4 (units before their arrival) data, not checked; 5 (the "ten men" claim of the ground marks) closed by leaving the ground marks out; 6 (ghost tiles) closed (N5); 7 (a pin on a place name) not tested: the place names are the map's own labels; 8 (contested flag) unchanged; 9 (overview map without ground) not improved: the overview is the app's own, restyled; 10 (ground marks read as noise) closed by leaving them out; 11 (crowd words) unchanged from the approved look; 12 (cards with no place on the map) closed for the event and story cards (a ring and a leader to the subject mark when it is on screen), not for the tour; 13 to 17 are pitch polish items that do not apply to this build.

**Known behaviours that are choices, not defects.** At the opening zoom a dense scene is a few named formation marks: that is what "no nudging and no overlap" costs; zooming in splits them. The pause is eased: at 8x the clock carries on for about one tick after Pause (a tenth of a tick at 1x). The legend opens closed (it opened over a fifth of the map); a viewer's own choice (`gtbg_prefs.showLegend`) is kept. The later days are fetched 1.5 s after the first frame: the minimap's unit count at tick 31 is 88, not 87, because `density_reserves.json` (listed under day 2) carries a row of `U-CAV-1` at tick 1 (T0-J2 of `journeys-desktop` encodes the lazy-loaded count and fails for that reason alone).

**Data defects met on the way (for the DATA owner; not patched here).** `U-CAV-1` has a tick-1 row in a day-2 file (above). 95 of the 478 placed records have no order-of-battle entry (`inOob: false`); the engine labels them by their code only. Some consecutive keyframes imply speeds no unit had (`U-8NY-CAV` 2.4 km in one tick, `U-I-2-2` 1.5 km in one tick, `C-I-3-3` 0.9 km in one tick, `C-7TN` 3.8 km in five): the engine draws them as what they are, a fast but smooth move. 59 (unit, tick) keys have conflicting rows across files (the later file wins, as in the shipped loader).

**Not shipped from the pitch.** The casualty memory (ground marks), the second look "Survey" (APPROVED-LOOK: B must not ship), the standalone narration, tours and Chronicle (the app's own popups are kept instead), the WebGL backend (the Canvas2D path meets the frame budget, section 7), a sprite atlas of the marks (the lettering is sprite-cached; the marks are vector draws).

**Tool panels not restyled.** Search, Filter, Roster, Order of Battle, Extra Features and Help keep their own look; the cards over the map (event, story, tour, unit panel, toasts, legend, overview, day badge, Monuments card) are restyled.


## 7. Tests

TBD-TESTS
