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

**Sliced work (PERF3, `tools/t0/PERF3-README.md`).** The two expensive things the engine does are a solve from clean state: the cold start after a cut (the first frame, a date jump, a zoom jump: the history is reset, 33 to 110 ms of work on a desktop for the densest scenes, 130 to 400 ms on a phone at 4x CPU) and the first probe of the rest canon. Warm frames cost 0.1 to 2 ms. They were two rAF tasks of 0.9 s and 0.6 s after a date jump on a 4x phone. In the browser (`createCore({ sliceMs: 4 })`, set by `host/app.mjs`) both run as resumable jobs: `layout/engine.mjs` `placePass` and `solve` are generators with a checkpoint every eighth tile that yields when the slice is spent (`drain()` runs the same generator to the end, which is the synchronous `solve`, bit-identical: T0-P3-01), `layout/strategies.mjs` adds `warmStart` / `warmStep(ms)` (the cold solve plus the settle runs of 250 ms of clock until the mark count has held for three, no longer cut by a wall-clock budget) and `canon(inp, budgetMs)`, and `core.mjs` runs one slice per frame (6 ms for the cold start, 4 ms for a probe). While a cold start is pending the old marks fade out as ghosts (a cut is a cross-fade anyway), the new picture is born with the same fade (`display.step` `cutIn`) when the layout is warm, then the ordinary solve (a few milliseconds) draws it. `?anim=sync` gives the one-call solves back; the node tests and the headless harness do not pass `sliceMs`. The solver itself is about 1.7 times faster (same frames): a column whose blocked intervals cover what the displacement circle leaves of it is skipped instead of tried row by row, `Math.hypot` only where its value decides, no allocation for obstacles outside the box, no `Set` per pair in `bestPartner`, priorities computed once per pass. The text table is no longer measured at engine creation with a face that is still loading (183 ms of a 4x phone's first render), but once after the face is ready, one font per task (`host/app.mjs` `lazyTable` / `measureSliced`).

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

**History dependence.** The layout has memory (crowds merge now and split later, a displaced mark relaxes slowly), so the SAME moment can show a different crowding depending on how it was reached (measured once: 8 marks for 29 units after a series of card and viewport changes, 24 marks for the same 29 units on a fresh page). To keep that from lasting, the engine has a rest canon: once the picture has been still for 20 frames and nothing on screen is fading, it solves the layout once from clean state and adopts that solution only if it shows MORE marks than the one on screen (never fewer, so no flicker and no cycle); not while a unit is selected; any change of camera, time or units re-arms it. What is deterministic and tested is every unit's true place and every mark that stands on its own unit (T0-ANIM-B5). Measured in R1E (`tmp/r1e-anim/canonprobe.mjs`, 12 pans in one session): the engine can fall asleep with the canon not yet started (it starts on a frame after the marks have settled, and a settled picture is the engine's cue to sleep), so the first wake after that runs the canon (3 of 12 pans adopted one, each on the first frames after the pan) and the marks relax afterwards; the time to rest after a pan ranged from 1.9 to 8.5 s of engine time in that session, the relaxation of the marks the pan re-laid (13 px/s) being the larger part. T0-ANIM-B14 therefore bounds the time to rest at 16 s of engine time, not at a few seconds. Letting the canon run before sleep would make the resting picture independent of the next wake, at the price of a longer first rest; it changes when marks re-form, so it is left to the owner.

**The look's known limits** (`APPROVED-LOOK.md`, 17 items), as they stand in this group: 1 (invented echelons) closed, tested (N7); 2 and 3 (strength references 3865, 6100, 4700) not closed: they are data, they only move a bar, and the hover card prints the placement value, not "of 3,865"; 4 (units before their arrival) data, not checked; 5 (the "ten men" claim of the ground marks) closed by leaving the ground marks out; 6 (ghost tiles) closed (N5); 7 (a pin on a place name) not tested: the place names are the map's own labels; 8 (contested flag) unchanged; 9 (overview map without ground) not improved: the overview is the app's own, restyled; 10 (ground marks read as noise) closed by leaving them out; 11 (crowd words) unchanged from the approved look; 12 (cards with no place on the map) closed for the event and story cards (a ring and a leader to the subject mark when it is on screen), not for the tour; 13 to 17 are pitch polish items that do not apply to this build.

**Known behaviours that are choices, not defects.** At the opening zoom a dense scene is a few named formation marks: that is what "no nudging and no overlap" costs; zooming in splits them. A crowd that re-forms because its members changed swaps in ONE frame (the brief's default over a ghost tile), and the new formation mark can stand 50 to 150 px from the old one: about 2 such steps per minute at the opening zoom (counted by N6 and B4, found with `tmp/motion-build/jumps.mjs`-style frame diffs: the same key, a new place). The pause is eased: at 8x the clock carries on for about one tick after Pause (a tenth of a tick at 1x). The legend opens closed (it opened over a fifth of the map); a viewer's own choice (`gtbg_prefs.showLegend`) is kept. The later days are fetched 1.5 s after the first frame: the minimap's unit count at tick 31 is 88, not 87, because `density_reserves.json` (listed under day 2) carries a row of `U-CAV-1` at tick 1 (T0-J2 of `journeys-desktop` encodes the lazy-loaded count and fails for that reason alone).

**Data defects met on the way (for the DATA owner; not patched here).** `U-CAV-1` has a tick-1 row in a day-2 file (above). 95 of the 478 placed records have no order-of-battle entry (`inOob: false`); the engine labels them by their code only. Some consecutive keyframes imply speeds no unit had (`U-8NY-CAV` 2.4 km in one tick, `U-I-2-2` 1.5 km in one tick, `C-I-3-3` 0.9 km in one tick, `C-7TN` 3.8 km in five): the engine draws them as what they are, a fast but smooth move. 59 (unit, tick) keys have conflicting rows across files (the later file wins, as in the shipped loader).

**Not shipped from the pitch.** The casualty memory (ground marks), the second look "Survey" (APPROVED-LOOK: B must not ship), the standalone narration, tours and Chronicle (the app's own popups are kept instead), the WebGL backend (the Canvas2D path meets the frame budget, section 7), a sprite atlas of the marks (the lettering is sprite-cached; the marks are vector draws).

**Tool panels not restyled.** Search, Filter, Roster, Order of Battle, Extra Features and Help keep their own look; the cards over the map (event, story, tour, unit panel, toasts, legend, overview, day badge, Monuments card) are restyled.


## 7. Tests

Everything is real Chrome (headless, `--enable-unsafe-swiftshader`), real mouse, keyboard and touch input through CDP, on a scratch tree built by `anim_build.py` (R1c + MON + ANIM, release id changes with every build) against a control tree built by the same wrapper with `--without-anim` (R1c + MON). Ports 9200 to 9209, one Chrome profile under `tmp/motion-build`, Mapbox tiles only through the harness (about 300 requests per process, so the browser tests are run in groups). Numbers below are from the final build of this group (`snap/s26`) unless a row says otherwise; they are measurements on one desktop, not guarantees.

**`tests/t0/anim.spec.mjs`** (`node tests/t0/anim.spec.mjs --dist <tree> --control <tree without ANIM> [--filter <regex>] [--quick] [--reps n] [--expect-red]`):

| id | what it proves | result |
|---|---|---|
| N1 N2 | the motion model is exact at every keyframe of all 478 units (1,687 keyframes checked, worst error 0) and monotone (1,209 segments, 0 samples outside the keyframe box; speed continuous through 297 moving keyframes) | pass |
| N3 | the clock: continuous, eased, glides under the cap, cuts beyond it, lands while playing, steps under reduced motion, stops at the end | pass |
| N4 | zero overlap in every one of 3,600 frames (3 scenes x 20 s), checked by an independent all-pairs test, nothing unrepresented | pass |
| N5 N6 | no ghost tiles (0 frames with a fading mark over a solid one); no teleports in normal playback (a few single-frame events per 20 s at the opening zoom: they are crowd re-anchors, counted and listed in the test notes) | pass |
| N7 N8 | no mark names an echelon the order of battle lacks; every token is read and every generated file is current | pass |
| B1 B2 | the engine draws in the real app, the shipped routine does not; a drawn unit stands where Mapbox projects its record (< 0.5 px) at every keyframe tick tried | pass |
| B3 | frame pacing, interleaved A/B windows on two long-lived sessions (relative thresholds, 3 repetitions): see the table below | pass |
| B4 | no spikes (limit 0.03 per frame) and at most 0.1 single-frame steps over 60 px per second in real playback, 1x and 4x, three zooms; the steps that do occur are a crowd's one-frame swap (a formation mark that re-forms 50 to 150 px away, about 2 in 60 s at the opening zoom), which the defaults of the brief choose over a ghost tile | pass (the earlier absolute limit of 0 failed in 3 of 4 runs and in 2 of 2 runs of the first build: it contradicted the default) |
| B5 B6 B7 B8 | reversing time gives the same positions; speed changes never step the displayed time back; short jumps glide under 650 ms, long ones cross-fade once; reduced motion steps | pass |
| B9 B13 | zero overlaps of the vital cores in real Chrome; on a rotated, tilted map every mark stands where Mapbox projects its unit, upright | pass |
| B10 | a real click selects the mark and opens its panel, Escape clears, the hover card names the mark, no card covers a mark | pass |
| B11 | cost (below); since R1E every long task of the page is explained by the engine's own time inside it, and the engine's frame cost has its own budget | pass |
| B11m | the JS heap is flat over 3 minutes of playback at 8x (the memory half of B11, a test of its own since R1E) | pass |
| B12 | `?tune=1`, a slider changes the picture, a skin switches by id, the export parses; the kill switch and the injected-fault fallback hand back to the shipped renderer | pass |
| B14 | idle means no frames (0 frames in 3 s at rest, and the engine is asleep: idle flag, no frame armed, no timer, `busy()` false); a pan or a tick step wakes the engine and it comes back to rest, measured on the engine's own clock with one bound of 16 s: from the jump 1.8 s, from a pan 1.9 or 6.1 s, from a tick step 4.8 to 5.3 s (marks pushed aside relax at 13 px/s by design) | pass |
| B15 | a change of the page does not render the map: 30 DOM insertions into a resting page cause 0 to 2 Mapbox renders (R1d: one per insertion) | pass |
| B16 | a story card that grows (as it does when the page's face finishes loading) wakes a sleeping engine and the placement runs within three animation frames; no two cards overlap afterwards (R1d: the engine stayed asleep and the card stood where it was) | pass |
| X | every browser test of the run: 0 uncaught exceptions, 0 first-party console errors | pass |

Red first: against the control tree (`--expect-red`) all 7 engine tests that run fail and B3 is skipped (it needs the engine); the smoothness metric itself fails there with a real number: 0.986 spikes per frame in the worst scene (limit 0.03), where a spike is a step above 8 px that is more than 6 times both of its neighbours.

**Before and after (B3, desktop 1x CPU and 4x CPU throttle as a phone proxy; mean of 3 interleaved windows of 10 s, same tick, same camera, zoom 13.2 and 4x speed):**

| | baseline (shipped) | ANIM |
|---|---|---|
| fps at 1x CPU | 52.4 | 60 |
| fps at 4x CPU | 16.8 | 40.8 (35.4 to 50.4 over the three windows) |
| main-thread busy at 1x CPU | 63.7 % | 29.9 % |
| frames over 33 ms at 1x CPU | 11.7 | 0 |
| long tasks (> 50 ms) per window at 4x CPU | 122 | 21 |
| spikes per frame at 1x CPU (as defined above) | 1.30 | 0.002 |
| spikes per frame at 4x CPU | 3.18 | 0.004 |
| marks drawn per frame | 381 (every unit, overlapping) | 27 to 51 (formation marks and leaves, zero overlap) |

B11 (final build): densest tick of the whole battle (478 units on the field) at 1x CPU: 60 fps, p95 16.8 ms, 0 long tasks, engine 1.9 ms per frame; at 4x CPU: 56.5 fps at 1x playback speed and 52.7 fps at 8x, with 1 and 4 long tasks above 50 ms in 10 s (these are not zero: the limit "no long task above 50 ms" is met on the desktop run only); JS heap after a forced GC at 0, 1, 2 and 3 minutes: 19, 24.3, 27.8, 27 MB (flat after the first minute).

**R1E (2026-10-22): why B11 and B14 flaked, and what was done.** Notes with the raw numbers: `docs/accept/R1E-NOTES-ANIM.md`. B11 used to count the long tasks of the whole page; with the engine switched off (`?anim=legacy`) the same page had as many (1 to 12 in 10 s against 2 to 7), because most of them were Mapbox renders that the engine's own page observer asked for on every DOM change (about ten a second during playback) plus the app's React commits, so the count followed the machine. The observer no longer asks the map to repaint; the frame no longer reads the page's layout (`map.transform` and a cached window width); phone playback at 4x CPU and 1x speed went from a median of 5 long tasks per 10 s (0 to 10 over 31 runs) to 0 to 3 (fps 55 to 58 became 58 to 59). B11 now explains every long task by the engine's own time inside it (core.step + draw + popups.update, measured in the page frame by frame) and holds that time to a budget: p95 <= 18 ms and p99 <= 34 ms at 4x on the phone, no long task in which the engine's frames add up to 25 ms or more on the desktop, at most one per 10 s on the phone (three at 8x); the old count of the page's long tasks still applies where the page has none of its own. B14 measures the time to rest on the engine's clock (jump 1.8 s, pan 1.9 to 6.2 s, tick 4.8 to 5.3 s in the B10/B13/B14 context; 11.8 s the largest in any sequence), with one bound of 16 s for a jump, a pan and a tick, and checks that the engine is asleep at rest. T0-POL-02 at 1024 had one intermittent line, "story-card x event-card, tick 12": the story card grew by 20 px when the page's face finished loading and the engine, asleep, did not place the cards again; a ResizeObserver on the cards now wakes it (B16), a card that React adds is placed before it is first painted, and the test scans when the boxes have stood still instead of 450 ms after the click.

**The repo's own suites (T0_PORT_BASE 9200, one process each, ANIM against the control built with the same MON):**

| suite | control | ANIM |
|---|---|---|
| journeys-desktop | 41 of 41 | 40 of 41: `T0-J2` (see below) |
| desktop-fixes | 10 of 10 | 10 of 10 |
| a11y | 26 of 28, 2 skipped | 26 of 28, 2 skipped |
| perf-fixes | 10 of 10 | 10 of 10 |
| mobile-fixes | 10 of 12 (`MFIX-11`, `MFIX-12` fail) | 10 of 12 (the same two) |
| deeplinks | 12 of 12 | 12 of 12 |
| verify-monuments | 14 of 16 (`VMON-05`, `VMON-14`) | 13 of 16 (`VMON-05`, `VMON-14`, and `VMON-04`) |

*R1e update (2026-10-29): `VMON-04` is no longer a skip on ANIM. Its premise was widened (marks whose centre lies in no other mark's box, the engine picker's own rule) and then showed a real defect of R1d and R1e: a click on a unit mark that lies over a monument dot opened the monument's card. Hook `ANIM:mon-unitdist` (`ANIM+mon@R1e.json`) fixes it; verify-monuments is 16 of 16 on R1e 56d302d7 (decision R1 of `docs/decisions/R1E-PROVISIONAL-DECISIONS-2026-10-22.md`).*
| monuments (MONL-01 to 19) | all pass except `MONL-08` (a map-load timeout, flaky) | all pass; 17a and 17b skipped in both |

The three differences, stated as they are. `T0-J2` expects the minimap's unit count at tick 31 to be 87, the count before the later days are loaded; the engine fetches them 1.5 s after the first frame, `density_reserves.json` (listed under day 2) carries a row of `U-CAV-1` at tick 1, so the count is 88: the defect is in the data's file layout, the engine only exposes it earlier. `T0-VMON-04` clicks each unit where its record is (the step-held position of the latest keyframe) and expects it to be selected; the engine draws the interpolated place, which for a fast unit is up to 57 px from the record (C-II-2-2 at tick 226), and one unit lies under the Extra Features pill: the test encodes the shipped step positions. The six tests that failed on the way and were fixed in this group are listed in the commit history (tour flight cancelled by the padding easeTo, trails dropped on pause, hidden units still hoverable, a card over a monument star, the phone shell's popup effect looping on fresh records, a focus ring that was not the app's).

**What was also run.** The build with `--extra CLOCK.json --extra DATA.json` (CLOCK and DATA first, then MON, then ANIM; either order of CLOCK and DATA gives the same release id): all anchors match, the builder's `data-untouched` gate fails by design (DATA edits data files); B1, B2, B5 and B7 pass on it. In that build a click on the mark of `U-ART-RES-1` ("McGilvery's") selects the unit but the shipped unit panel does not open: the app's `oobData` has no entry for it, while the order-of-battle file the engine reads lists it (a data or loader matter, seen with the engine on, not checked without it).


## 8. The pre-solve (R1f): the solve of the next frame runs in a task of its own

Why. On a slow device (a 4x throttled phone) the governor (`engine/core.mjs` `governorStep`) solves the layout every 2nd or 3rd frame and carries it between; the frame that solves took 20 to 70 ms for its solve and shared one animation-frame task with the map's render, the page's style, layout and paint and, at 8x, a React commit: tasks of 50 to 90 ms (T0-ANIM-B11, `docs/accept/R1E-NOTES-ANIM.md` section 6).

What. `core.wantsPre(tauNext)` says whether the next frame will solve (cadence) or a unit will come onto the field in it; `core.presolve(tauNext)` then solves it from the marks where that frame will have them and keeps the layout (`pre`). The host (`host/app.mjs`) calls them from a message to itself at the end of every frame it ends with a still camera and more to draw, so the solve is the next task after the animation-frame task, before the next frame's callbacks. The next `core.step` looks at `pre` before it would solve: it takes it when the zoom, the selection, the spec, the battle and the list of marks (ids, in order) are those it was made for and `layoutMod.refresh` brings it to the marks' places; otherwise it throws it away and solves as it always did. A taken layout is a carried layout (`solved: false`): a frame that touches a neighbour is solved exactly at once, so "zero overlaps in every displayed frame" holds as it does for the carried frames of the cadence.

Switches and numbers. `createCore({ presolve: true })` (the host sets it, `?anim=sync` clears it; the node harness never sets it, so the fingerprint scenes are the engine without it), `slowOnMs` (3.4, the mean engine cost per frame from which a device pre-solves at cadence 1 too; 0 forces it in tests). The cost of a pre-solve is added to the cost of the frame it serves, in `metrics` and in the governor. Counters on the core: `presolves`, `adopted`, `preMisses`, `forcedSolves`, `why` (solves at once by reason: set, forced, cold, due, other).

Tests. N10 (node) and B17 (Chrome) in `tests/t0/anim.spec.mjs`; B11 counts a pre-solve as engine time twice over (in the frame it serves and as a task of its own). N9 holds the engine's output to `tools/t0/anim/test/fingerprint.R1e.json`.

Not done, and why (the owner's call). The pre-solve of the entry of a dozen units at once (40 to 80 ms at 4x) is one task. To slice it the entries would be staggered over 2 to 4 frames (a unit is born transparent, so nothing would show), which relaxes the rule that every unit on the field is represented in every drawn frame for about 50 ms.
