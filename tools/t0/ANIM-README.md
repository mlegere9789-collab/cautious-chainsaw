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

Size: the engine adds about TBD-BYTES to the entry bundle (readable sources about 270 KB; fonts 73 KB of it, base64).

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

TBD-DECISIONS-TABLE

## 5. Extending it

**A new skin in under 50 lines.** `src/engine/skins/minimal.mjs` is a complete, conforming skin in 35 lines: it declares its tokens, a footprint, the channels it draws and one `draw.tile(c, t, g)`; the kit supplies the honest view model (`g.vm`: side, arm, rank, strength, posture, fresh or carried), the eased selection and hover (`g.sel`, `g.hov`), the arrival progress (`g.enter`), device-pixel snapping (`g.cr`, `g.lw`), safe text (`g.text`) and the legend (generated from the `channels` and `sample`). To add one: write the module, add one import and one entry to `src/host/skins.mjs`, run `build-anim.mjs`. It appears in the tuning panel, in `?anim=skin:<id>`, and in the legend. At run time `GTANIM.registerSkin(skin)` adds one without a build.

**The look is a skin module plus token JSON.** The drawing is `src/engine/skins/standards.mjs`; its 92 tokens (colours, pole heights, flag sizes, halo, the detail zooms, motion constants) are one table in `standards.spec.mjs`, exported as `tokens/standards.tokens.json` (every token with its documentation, range and unit; the colour-blind-safe and the high-contrast sets). A designer changes a number and nothing else. Live: the tuning panel's Skin tab, or `window.__skinKit.setToken('standards', 'pole.brigade', 28)`.

**The hidden tuning panel, `?tune=1`.** Motion and layout (one control per token of `anim.tokens.json`), Skin (the active skin's tokens), Numbers (frames per second, p95 frame time, marks drawn, overlapping pairs found by the verifier (must be 0), pops and teleports, net snaps, solve and draw milliseconds, the JS heap), Export (the whole setting as JSON, `gtanim-settings/1`, plus the skin's tokens; Import; Reset; Legacy). Settings are remembered in this browser only while the panel is in use.

**A new motion model, layout strategy or skin** is a named registry entry (`kernel.interp`, `kernel.layout`, `kernel.skins`); the tuning panel offers every registered module.

## 6. Honest limits (what is not verified)

TBD-LIMITS

## 7. Tests

TBD-TESTS
