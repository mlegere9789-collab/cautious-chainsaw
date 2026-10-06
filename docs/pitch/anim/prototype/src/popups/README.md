# Popups: the Overlay Director

Everything that pops up over the Battle Studio's map, as registered modules of one small system. Twelve popup modules, one director that places and times them, one layer that draws them, one stylesheet, one JSON of dials. Written for the owner's brief of 2026-10-05: keep every popup the research found (`docs/pitch/anim/02-popups.md`), make each best in class, never let one cover a tile, and make the whole thing easy to tune and to add to.

Open `battle-studio.html`, press Play (Space) and watch the cards, or press `T` and open a "Popup: ..." group in the Tuning Studio: each popup style has its own dials and a **Show this popup now** button.

## 1. What is here

| module (`src/popups/`) | the product popup it keeps (02-popups.md) | words and facts it shows | forms, richest first |
|---|---|---|---|
| `event-card.mjs` | P-01 event card | the chronology sentence in full, place, the units it names, "Why it matters" | full, compact, peek, mini, chip |
| `story-card.mjs` | P-02 story card | title, summary, then the whole script in the rail, read time, named units | peek, compact, mini, chip |
| `command-toast.mjs` | P-03 command-change toast | who, what happened, the row's own source; bursts merged | toast, mini, chip |
| `command-crossout.mjs` | P-04 cross-out (dead in the product, revived) | the old commander struck through, the successor named | tag |
| `unit-card.mjs` | P-05 hover card (dead, revived) and P-06 unit panel | name, strength, commander, key action, positions, casualties | tooltip; card; the whole panel in the rail |
| `tour.mjs` | P-07 NPS Auto Tour | the 16 stops, their paragraphs, dots, Previous / Next | the rail |
| `day-banner.mjs` | P-39 (the product has none) | "Day 2, July 2, 1863", "Night of July 1-2" from the clock module | ribbon, chip |
| `clock-hud.mjs` | P-10 clock badge | date, "about 10:15 AM", uncertainty, speed, day-progress ring | full, mini |
| `legend.mjs` | P-12 legend | the active skin's own `legend()` | open, pill |
| `minimap.mjs` | P-13 overview | every tile of the frame, the camera box, click to fly | card |
| `hints.mjs` | P-38 hints, P-31 onboarding | four one-time hints, the key list and what the evidence labels mean | hint; help in the rail |
| `chronicle.mjs` | new (02-popups.md 5.6) | every moment so far, with Go to and Reopen | the rail; chips in the dock strip |

Not built, on purpose: the monuments markers and card (P-08, P-09: dead in the production build, and the card exists only in an unregistered scratch tree; a marker layer is a map concern, not a popup), the tools and modals (search, filter, roster, layers, distance, bookmarks, help, ancestor, Soldier's Eye, Order of Battle: tools that pause nothing, P-21 to P-35), the Extra Features cluster (not part of this page), and the fps text (decision D-5: it is a debug number and printed a false "0 fps" at every Play).

All text comes from the repo's own data files, **verbatim**: `data/build-popup-data.mjs` copies it (with the SHA-256 of every source file) into `data/popup-data.json`, which the build inlines. Not copied, so unable to reach a card: the hand-typed `time` of event rows and `approx_time` of command changes (clocks that contradict the clock module) and the production `flag` notes. The only transform is documented in `kit.displayText`: the internal sentence "Commander succession US-017 activates." (6 rows) is not shown and becomes a link to that command change.

## 2. The guarantee, and what checks it

**No visible card, chip-less or not, lies on a tile's chip, label, pin, aggregate member dot or displaced-tile leader; none lies on the interface, off the map, or on another card; the ink a popup draws on the map is drawn beneath the tiles.**

How it is kept: `host.mjs` rasterises the frame being drawn plus the interface into an occupancy grid (`geom.mjs`, conservative by construction), finds the nearest free ground for the card's form, re-checks every card against exact rectangles on every frame, fades a card out and in elsewhere when its place is being taken (it never glides across the map), and cuts a card at once if a tile actually touches it. A card with no free ground becomes a chip in the Chronicle strip inside the dock, never lost. Long reading opens in the **rail** (phone: a bottom sheet) and the map viewport shrinks to make room, the ground staying still, so reading cannot cover a tile either. Leader lines, place rings and arrows are drawn beneath the chips (`fxdraw.mjs`); the only ink above a chip is the subject ring, inside the 2 px band every skin reserves for selection.

Checked by `test/popups.test.mjs` (node, real engine frames, an oracle that shares no code with the director) and `test/popups-browser.mjs` (real Chrome, real DOM rectangles): see section 8 for the numbers.

## 3. How it works

```
engine.step(dt) -> frame                      scene/engine.mjs   tiles, labels, pins, camera, clock
host.frame(frame, now, dt) -> out             popups/host.mjs    pure, DOM-free: cards, strip, rail, inset, fx, live message, stats
layer.update(out, now)                        ui/popup-layer.mjs content model -> DOM, rail, strip, live region, keys
renderer.draw(frame, { popupFx, mapRect })    render/canvas.mjs  leaders and rings (popups/fxdraw.mjs), clipped to the map viewport
```

* **A popup is data.** A module returns cards; a card is `{ key, kind, tier, tone, subjects, forms: [{ id, level, w, content }], hold, doc, actions }`. `content` is a *content model* (blocks: kicker, title, p, meta, chips, bar, kv, list, actions, disclosure, scroll, swatches, canvas, swap, dots, pill, ring), rendered by one design system, so a new popup inherits the type scale, motion, focus and screen-reader behaviour. `kit.mjs` has the helpers (reading time, evidence chips, the clock line, tones and shapes).
* **State cards and event cards.** `update(frame, api)` returns the cards that should exist now (clock, legend, unit card, tooltip, tour), or calls `api.fire(card)` once when a trigger happens (`api.crossed(index)`: rows the clock has just passed; `api.landed(index)`: rows it has just stopped on). A seek raises nothing for the ticks it skipped (jump hygiene); what belongs to the old moment leaves.
* **Life is reading time.** `readMs(words) = base + words x 60000 / wpm`, clamped; it runs in wall-clock ms **only while the battle plays** and stops while a card is hovered, focused or pinned. Tiers A (critical events, stories), B (high), C (command changes, medium), D (decoration) and the speed (`popup.speed.*`) decide the richest form allowed; the queue (`popup.queue.*`) caps how many cards, peeks and chips live at once; older cards become chips, never vanish. Narrated mode (D-1, off by default) eases the clock down while a critical card is read.
* **Anchors.** `subjects: { units, place }` resolves to the tile being drawn (an aggregate, or the parent tile marked dashed and Modelled, when a unit has none), else a dashed ring at the place, else an edge arrow when off-screen. A chip's leader shows on arrival (fading), on hover, focus or pin.
* **Rail and sheet.** `host.openRail(id)` shrinks the map viewport (`engine.setViewport`, with `engine.shiftView` keeping the ground still and any camera glide alive), frames the subject if the rail would hide it, and announces it. On a phone (`popup.phone.belowPx`) free-standing cards do not exist: chips in the lane, a three-detent sheet above the dock.
* **Access.** One polite live region (at most one message per `popup.a11y.liveMinGapMs`; a burst is one message that counts the rest), `Esc` closes one layer per press (tooltip, rail, selection, newest card), `N` / `P` step between moments (pausing there), `C` opens the Chronicle, `U` / `Shift+U` select tiles, `Enter` opens the newest card, `?` the help; every card has pin and dismiss; reduced motion (the engine's `motion.reduced`) makes fades 120 ms with no movement and the rail instant; tone inks meet 4.5:1 on the card backgrounds in both themes (tested).

## 4. Dials

One group per popup style in the Tuning Studio, generated from `tokens/make-popup-tokens.py` (all in `tokens.json`, with the schema): **director** (motion, placement, queue, speed policy, reading speed and dwell per tier, landing, dismissal, narration, rail, sheet, phone), **look** (palette, density, radius, blur, title face, text size, elevation) and one group each for the event card, story card, toast, cross-out, unit card, tour, day banner, clock, legend, overview map, hints and chronicle. Every dial has a unit, a range, a doc line and an evidence label; `test/tuning.test.mjs` fails on a dial that is defined and never read.

## 5. Add a popup

1. Copy `_template.mjs` to `my-popup.mjs` (about 30 lines: a card for each chronology event, a leader to its units, reading-time life, a chip fallback).
2. Import it in `index.mjs` and add it to the array.
3. Optionally add dials (a group in `tokens/make-popup-tokens.py`), `enabled: (tok) => tok('popup.mine.enabled')`, `group` and `preview(api)` for a Tuning Studio entry with a button, `rows(ctx)` to list your moments in the Chronicle, `toolbar: [...]` for a button.
4. `python tokens/make-tokens.py` (only if you added dials) and `node build.mjs`.
5. The guarantee tests already cover it: the sweep and the monkey run use every registered popup.

Honesty rules a popup keeps: a clock comes from `clockLine()` (never typed), anything a reader could ask "says who?" about carries `ev('Documented' | 'Measured' | 'Computed' | 'Modelled' | 'Contested' | 'Unknown')`, and no internal id or production note is shown.

## 6. Decisions that are the owner's (02-popups.md 6.5)

* **D-1 Narrated mode**: built, **off** (`popup.narrate.mode`). Without it a critical card can be read only when the clock is paused or from the Chronicle (reading all tier A cards takes 13.5 minutes, the show 5.6).
* **D-2 Peek or full card at 1x**: the ladder starts at full for critical events and a peek for stories; the story's whole text is always in the rail.
* **D-3 Clock on cards**: every card prints "about ...", Modelled, from the clock module; set the card text to drop it if the toolbar alone should carry the clock.
* **D-4 "NPS Auto Tour"**: the tour card says "Auto tour" and carries an **Unknown** chip: the stop numbering is the site's own and has not been matched to the National Park Service's list.
* **D-5 fps text**: not built.
* **D-6 Dead popups**: cross-out and hover card revived; the monuments card is not (see section 1).

## 7. Not verified

* One machine, one Chrome 155, a laptop GPU. The phone is a 390 x 844 viewport with touch emulation, not a phone; the sheet drag was exercised by keyboard and tap, not by a finger.
* Screen readers: the structure is tested (roles, labels, live region, focus return); no NVDA, JAWS or VoiceOver pass.
* Every clock text inherits the candidate clock (all anchors proposed, none reviewed).
* Reading speed: 238 words a minute is a secondary summary of Brysbaert (2019), the paper itself was not opened (02-popups.md section 7).
* Casualty and strength totals shown on the unit card come from the order-of-battle files, whose metadata claims Busey and Martin; that source was not re-read here (the chip says so).
* The cross-out and day banner are decoration (tier D): on a dense scene they find no free ground and do not appear; the facts they carry are in the toast and the Chronicle.
* Events and stories carry only file-level source lists, so they get a "Sources of this file" disclosure and no per-row Documented chip; only the 42 command changes have per-row sources.

## 8. Commands and numbers

```
node --test docs/pitch/anim/prototype/test/popups.test.mjs      the popup suite (FULL=1: every popup tick; POPUP_SEEDS=30 POPUP_ACTIONS=150 for a long monkey run)
node docs/pitch/anim/prototype/test/popups-browser.mjs          real Chrome: real DOM rectangles on every popup tick at two zooms, frame pacing, keyboard, phone, reduced motion
node docs/pitch/anim/prototype/test/popups-shots.mjs            the screenshots in docs/pitch/anim/shots/prototype/popups-*.png
node docs/pitch/anim/prototype/data/build-popup-data.mjs        rebuild data/popup-data.json (SHA-256 of every source file)
```

Measured on one machine (Windows 11, system Chrome 155 headless, node), by the commands above, on 2026-10-05 and 2026-10-06. Nothing here is a claim about another machine.

| what | result |
|---|---|
| whole prototype suite, `node --test test/*.test.mjs` | 140 tests, 140 pass (about 215 s) |
| popup suite, `FULL=1` (every one of the 138 popup ticks) | 34 tests, all pass (about 350 s) |
| placement sweep, zoom 12.5, 13.5, 15 and follow-camera 13.5, 15 | 1,380 frames each, 0 violations of the guarantee |
| playback at 1x | 1,514 frames, 7,563 card-frames, 15 hard cuts, 0 frames on which a cut was needed |
| playback at 4x | 1,063 frames, 5,193 card-frames, 1 hard-cut frame |
| playback at 16x | 163 frames, 0 violations |
| every skin (11) | 880 frames each, 0 violations |
| monkey run (random clicks, keys, seeks, speeds, skins) | 12 seeds x 120 actions = 26,953 frames, 0 violations; placement 2.9 to 4.1 ms at most |
| real Chrome, `popups-browser.mjs --stride=1` | 21 of 21 checks pass; 690 frames per zoom, 4,173 (zoom 13.5) and 4,013 (zoom 15) card-frames: no card touches a tile, the interface or another card; every measured height equals the placed height |
| real Chrome, 9 s of 4x playback | 60.003 fps, 0% of frames over 20 ms; director p50 0.60 ms, p95 1.30 ms, max 5.3 ms; 51 cards fired, 9 relocations, 1 cut frame, 0 overlap frames |
| real Chrome, DOM size over 25 s at 8x | at most 3 cards and 3 chips on screen, at most +62 nodes |
| engine soak with popups running, 100 s at 8x | 6,020 frames, 59.94 fps, 0.1% over 20 ms, heap 26.3 MB and flat (0.0 growth), 0 errors |
| critical events shown as a floating card with the camera on the subject (zoom 13.5 / 14.5 / 15.5) | 30 / 34 / 40 of 45; the rest wait as chips |
| high events (same three zooms) | 44 / 50 / 58 of 73 |
| stories (same three zooms) | 18 / 13 / 17 of 24 |
| dials | 175 tokens in `tokens.json`, of which 106 or more are popup dials in 14 groups |
| sizes | `popup-data.json` about 307 KB; `battle-studio.html` 1,358 KB (706 KB before popups); 17 screenshots about 7.3 MB |

Raw results of the Chrome run: `results/popups-chrome.json`. Pictures: `docs/pitch/anim/shots/prototype/popups-01-...` to `popups-17-...`.

Known data flags found while building (not fixed here, this is a prototype and the data is not ours to change): 6 event sentences carry an internal id; the tick of 3 event rows differs from the tick of the matching command change (CS-006 547 vs 551, US-023 553 vs 552, CS-017 563 vs 556); 3 event rows (310, 560, 565, `C-CAV`) name no unit and no node, so they have no anchor and show as chips or a free-standing card.
