# 02 - Popups and overlays during the animation

Study of everything that appears over the map while the battle plays or jumps: what it is, what it does to the unit tiles, and how to make it professional without taking anything away. Track 02 of the animation pitch (`docs/pitch/anim/`). Written 2026-10-05 by the popups agent. Design research and a prototype only: no product file was changed, nothing was deployed or sent.

## 0. In plain words (read this first)

**What pops up.** 51 inventory entries appear over the map (39 on the desktop shell, 12 on the phone shell; section 2). The ones the owner loves are the **event cards** (134 chronology moments, "REYNOLDS KILLED..."), the **story cards** (24 vignettes), the **command-change toasts** (42 generals who fall or are replaced), the **NPS tour**, the **unit panel**, plus the legend, minimap, day badge, "Extra Features" buttons, onboarding and the Monuments card.

**What is true today (all measured in real Chrome on the fixed build R1c; evidence in sections 3 and 4):**

1. **The cards cannot be read while the battle plays.** An event card stays on screen exactly as long as its five-minute tick: half a second at normal speed, a tenth of a second at 4x. Reading its 32 words takes about 8 seconds. A story card stays 1.5 s; its summary takes 15 s. They are drama at speed and a document only when you pause. Reading just the 45 critical events and the 24 stories takes 13.5 minutes; the whole battle plays in 5.6 minutes at normal speed.
2. **They sit on top of the soldiers.** At the landing view the event and story cards cover 55 of 281 unit tiles on average (170 at worst); in 24 % of the moments a card lies on a tile it is *about*. The timeline bar at the bottom hides another 13 % of the tiles. A small "Extra Features" button covers about 15 tiles at 132 of 135 sampled ticks of the landing view. On the phone a card lies on its own tile in about half the moments, and the first Play after a jump puts four stale toasts over about 95 % of the map.
3. **Nothing points at anything.** 22 of 24 stories and 108 of 134 events name units that have a tile at that tick, and the data even carry coordinates, but the app uses none of it: no line, no highlight, no camera move.
4. **Several things are wrong or contradict each other.** Three different clocks appear on one screen (the toolbar says 8:15 AM at tick 28, the card says 7:20am, the story says 10:15am). After a jump, Play fires four toasts about other days. The legend's colours match the tiles for 3 of 11 dispositions and its "Size" tab describes circles that no longer exist. Four popups are dead code (cross-out card, hover card, monument markers in R1c, sound button). The tour's one video says "not available". The phone minimap is empty on 72 % of ticks. The HUD flashes a false "0 fps" at every Play.

**What I propose (section 5 and 6): the Overlay Director.** Keep every popup, its words and its trigger; change where it lands, how long it lives and how it moves:

- **Captions that know where they are**: a card is placed on empty ground next to the unit it is about, joined to it by a thin line, with a ring on the tile.
- **Never on a tile**: every popup gets a ladder of forms (full, wider, compact, one-line chip) and a solver takes the first that fits on tile-free ground; long reading opens in a docked panel that makes the map smaller instead of covering it. On the phone the cards get a reserved lane.
- **Life measured by the viewer's clock**: a card stays for its reading time, whatever the playback speed; events are tiered (critical and stories get cards, the rest chips); nothing is dropped, everything is kept in a "Chronicle" strip you can step through.
- **One clock, honest labels**: popups ask the clock module and print "about 10:15 AM" with a **Modelled** chip; sources are shown only where the data have them (42 of 42 command changes do).
- **One motion language** shared with the tiles and the camera, so one edit retunes the whole show; and a test rig (this study's) that checks, on every one of the 155 popup ticks at three zoom levels, that no popup covers a tile.

**The prototype works on the real data.** On all 837 desktop snapshots (the 155 popup ticks at 3 zooms with the default camera, and the 124 of them that have a subject on screen at 3 zooms with the camera following it) no tile, label or subject tile lies under a prototype card, no two cards overlap and none lies on a persistent overlay; placement costs under 0.5 ms. On the phone free-standing cards find no room in about three quarters of the default snapshots, so the prototype's phone variant uses a 44 px lane that is part of the layout (section 5.7, 5.10).

**What I need from the owner (section 6.5):** D-1 Narrated mode (slow the animation while a critical card is read?), D-2 peek or full card as the default, D-3 clock on the cards or only in the toolbar, D-4 the "NPS Auto Tour" name, D-5 the fps text, D-6 reviving the dead popups.

**What I did not verify** is in section 7: no real device, no Safari/Firefox, the candidate clock is unsigned, reading speed is from a secondary summary, and the prototype is research code.

Contents: 1 Method - 2 Inventory (desktop, phone) - 3 Measurements - 4 Findings - 5 Design review - 6 The system - 7 Limits - 8 Reproduce.


## 1. What was examined and how

| item | detail |
|---|---|
| builds | **R1c** `release/R1c/dist` (release id 2531699e, the fixed build; every measurement), **production** `baseline/dist` (entry `index-Cg8FAMXN.js`; the live site served the same entry file name when read with `curl` on 2026-10-05; one screenshot and a code diff), **R1c + MON** `tmp/mon-fix/mon-R1c/dist` (release id e8a08faa; the Monuments card only) |
| code | the entry bundle prettified with terser (`tmp/pitch-anim/popups/r1c-pretty.js`, `base-pretty.js`; line numbers in this document are those files); the popup source of R1c differs from production only in ARIA attributes, the `data-gtbg-card` markers, the story card's position (production: right 16, 700 px tall, over the Mapbox controls; R1c: right 200), the dock-relative bottoms and the tour's speed restore (compared function by function) |
| data | `release/R1c/dist/data/**` (chronology 137 rows, vignettes 24, commander successions 42, placements 1,804 keyframes on 188 ticks, the order of battle) |
| browser | system Chrome 1440 x 900 at 1x (desktop) and 390 x 844 / 844 x 390 at 2x, touch (phone), through `tests/t0/lib.mjs` (Referer injection, tile budget 300 per process; used 52-183 per process); tiles blocked after boot for all geometry runs |
| tools | a canvas hook (every `fillRect/strokeRect/arc/fillText/moveTo/lineTo` of the unit canvas with its transform), a DOM probe for every popup, an in-page store handle (the entry module's `u` export), a polygon-exact coverage calculator, a summed-area free-space solver; scripts in `docs/pitch/anim/popups-lab/` |
| not changed | nothing under `tools/t0`, `baseline`, `legacy`, `release`, `src`, `data` or `tests`; the prototype is injected into a running page and leaves no file behind |

Evidence words used: **Measured** (a command I ran in Chrome or on the data), **Computed** (arithmetic on the data), **Modelled** (the candidate clock, inferred anchors), **Documented** (a source I read, with its URL), **Unknown**. Everything is R1c unless a sentence says otherwise.

Related tracks: `01-current-tiles-jitter.md` (the tile renderer, jitter and a short popup catalogue in its section 3.9; this document is the full one for popups and agrees with it where they overlap: legend 3 of 11, the size encoding, the two dead popups found there, the share of tiles under overlays at tick 556), `03-data-fuel.md` (the data), `04-benchmarks.md`, `06-layout.md` (the collision-free tile layout this document's director must read; section 6.6).

## 2. Inventory: everything that appears over the map

Conventions. `P-nn` is the id used by the findings (section 4) and the design review (section 5). "Tiles" answers: does it lie on the unit tiles, and can it hide the tile it is about? Rectangles are page pixels at 1440 x 900 (measured with `getBoundingClientRect` in real Chrome, R1c); z is the computed `z-index`. Code facts cite `release/R1c/dist/assets/index-2531699e.js` through the pretty-printed copy `tmp/pitch-anim/popups/r1c-pretty.js` (line numbers are that file's; component names are the minified names). "Dead" means: present in the bundle, proved not to render in R1c (code read plus a run in Chrome).

### 2.1 The transient popups (they come and go while the animation plays)

**P-01 Event card** (`LF`, style `Vc`, `data-gtbg-card="1"`; r1c-pretty.js:57621-57746)
- Trigger: the current tick has a chronology row whose `significance` is not `low` (`byTick[currentTick]`, exact tick only). Data: 134 such rows on 134 different ticks (critical 45, high 73, medium 16; 3 `low` rows never show); never two on one tick, so the "+N more events this tick" line is unreachable with today's data.
- Content: coloured border and icon by significance (critical `#ff2200` star, high `#ff8800` dot, medium `#ffcc44` diamond), the significance word, the hand-typed clock string of the row (`7:20am`), the event sentence, and for 25 rows an italic `narrative`. Event text is 19-78 words (median 32) including narrative.
- Timing: exists exactly while `currentTick === row.tick`. Measured on screen: 500 ms at 1x, 250 ms at 2x, 117 ms at 4x, 67 ms at 8x, 33 ms (two frames) at 16x (36 of 36 cards rendered at every speed in a 60 fps run, section 3.1). Stays up indefinitely when paused on the tick. Dismissal `x` is per row, forgotten when the tick moves by more than one (stepping one tick away and back keeps it dismissed; measured).
- Position: absolute, bottom `calc(var(--gt-dock-h,127px) + 9px)`, centred (`left:50%`, `translateX(-50%)`), 460 px wide, 128-215 px tall (measured 147 at tick 553, 214 at tick 556), z 85. At 1440 x 900 it occupies x 490-950, y 550-765: the middle of the map, directly above the timeline.
- Motion: none. No animation, no transition (computed `animation: none`, `transition: all 0s`); it appears and disappears in one frame. Backdrop blur 8 px.
- Tiles: lies on the centre-bottom of the map where the Pickett's Charge units are. Measured over all 155 event or story ticks at default camera, zoom 13.5: cards cover 55 tiles on average (62 median, 170 max) of 281 on screen (section 3.2).
- A11y: no role, no label, no live region, focus never moves to it; one focusable control (the close button, `aria-label="Close"`). A screen reader hears nothing when a card appears. Esc closes it (it is `data-gtbg-card="1"`, the last in the Esc order).
- Copy: significance words are shown in capitals ("CRITICAL"); the clock is the row's hand-typed `time`, which is the tick-formula label (tick 1 = 5:00 AM + 5 min per tick) and not the app clock; 6 events print an internal id in their sentence ("Commander succession CS-006 activates": ticks 298 `US-017`, 310 `CS-016`, 328 `CS-014`, 547 `CS-006`, 553 `US-023`, 563 `CS-017`). 66 of 137 rows carry a `flag` field that is a production note ("Place precisely", "HIGHEST PRIORITY ANIMATION"); the app does not print it, and no popup may.

**P-02 Story card** (`CF`, style `Cr`, `data-gtbg-card="2"`; r1c-pretty.js:57281-57566)
- Trigger: a vignette whose `trigger_tick` is within the last two ticks (`byTick[c], byTick[c-1], byTick[c-2]`). 24 vignettes on 23 ticks (two at tick 556), so the card is eligible on 63 of 675 ticks; up to 2 stacked (the card pages them with a dot row, "1/2").
- Content: "~N min read" (computed from 200 wpm), a badge with the first two `units_featured` ids printed raw (`U-I, U-I-1-1`; 23 of 24 stories), a jump button "⏩ tick" (calls `setTick(trigger_tick)`), close, title (Georgia 14 px), `panel_summary` (48-73 words), and the italic `full_script` (259-444 words with the summary) in a scrolling body with a 3 px scroll-progress bar; footer "Dismiss / Dismiss all" and `trigger_location`.
- Timing: 3 ticks: 1.5 s at 1x, 750 ms at 2x, 382 ms at 4x, 198 ms at 8x, 99 ms at 16x (measured). Reading the summary alone takes 14.6 s (median; 238 wpm); summary plus script 91 s.
- Dismissal: `Dismiss`/close adds the vignette to a `Set` that is never cleared: a dismissed story does not return when the tick is revisited (measured: tick 28, close, tick 100, tick 28: no card).
- Position: absolute, top 60, right 200, 340 px wide, max-height `calc(100vh - 400px)` (500 px at 900 px), z 92. Measured rect x 900-1240, y 60-560. Backdrop blur 10 px, 1 px gold border.
- Motion: none (static panel; only the scroll bar fill has `transition: width .1s`).
- Tiles: lies top-right over the Oak Ridge / Gettysburg-town area. With default camera at zoom 13.5 the story and event cards together cover 55 tiles on average (section 3.2). It sits 200 px left of the right edge, so it is overlapped by the toast column (x 1124-1424) by 116 px: toasts hide its jump and close buttons (screenshot `d06-unit-panel-ironbrigade-t28.png`).
- A11y: the card has no role; only its scrolling body is a labelled group (`role="group" aria-label="Event details"`, `tabindex=0`; the label is wrong: it is a story, not an event). No live region; focus does not move.
- Copy: raw ids in the badge; `~N min read` is computed at 200 wpm while the site's own research number is 238 wpm; the "Jump" button is labelled with a bare tick number.

**P-03 Command-change toasts** (`qF`, style `eh`; r1c-pretty.js:58862-59038)
- Trigger: only while playing. A rolling `H.current` remembers the last tick seen while playing; every row of `commander_successions.json` with `approx_tick` in `(last, current]` becomes a toast. 42 rows (26 distinct ticks; up to 4 on one tick, tick 550).
- Content: icon by cause (`†` killed, `⚕` wounded, `⚑` captured, `⇒` other), a title (`<from_commander> KIA|wounded|captured`, or the fixed words "Command change"), the row's `event` sentence, and `Tick N`. Every row has a per-row `source` ("Pfanz First Day p.65") that the toast does not show.
- Timing: 4.5 s each (`setTimeout`), at most 4 at once (`slice(-4)`). A burst drops the older ones early: measured minimum on-screen time 1.0 s at 1x, 117 ms at 8x, 51 ms at 16x.
- Position: container absolute, top 60, right 16, max-width 300, z 200; toasts 300 px wide, 88-106 px tall, 8 px gap. Measured x 1124-1424, y 60-462 for four toasts.
- Motion: `animation: slideIn 0.2s ease`, but no `@keyframes slideIn` exists in the page or the app stylesheet (measured: the page defines only mapboxgl-spin, mapboxgl-user-location-dot-pulse, boot-slide, boot-fade-in, gtbg-force-reveal, gtbg-banner-in, gtbg-pin-glow), so toasts appear without animation and vanish without animation.
- Tiles: right edge: the column lies over the Mapbox zoom buttons (z 200 over the controls) and over the right 116 px of the story card; the Extra Features cluster (z 450) draws over them (screenshot `d05-toasts-playing-tick550.png`: the pill overprints the second toast's title).
- A11y: container `role="log" aria-label="Battle events"` with `aria-live="off"`: announces nothing. Icons are glyphs, colour carries the category.
- Copy: 9 of the 42 rows get the neutral title "Command change" and the ⇒ icon because the title is guessed from the words of the `cause` field; 5 of those 9 report a wounding in their own sentence (Sickles, Hood, Armistead "mortally wounded", Avery "mortally wounded", Hampton), so icon, colour and title contradict the text, and one is an arrival ("Stuart arrives at Gettysburg"); the title repeats the body ("Scales wounded" twice); "Tick 52" is a raw tick on a screen whose clock reads a time.

**P-04 Commander cross-out card** (`nO`, style `nh`; r1c-pretty.js:60481-60601): **dead**. It reads `commanderSuccessions` from the store, which is initialised to `[]` and never set (the only two mentions of the name are the initial value and this component). It would draw an old commander crossed out then the new one, top-left (top 58, left 60, z 400), fading after 1.2 s and gone at 3 s. Its purpose (a visible hand-over of command) is exactly what the toasts do badly; section 5 revives the idea on the map.

**P-05 Unit hover popup** (`fF`, style `Ar`; r1c-pretty.js:56052-56207): **dead**. The call site passes neither `hoveredUnit` nor `mousePos`, so it returns `null` on every render. (260 px card, z 500.)

**P-06 Unit panel** (`MF`, `#gt-unit-panel`, `role="region" aria-label="Unit details"`; r1c-pretty.js:56953-57290)
- Trigger: a click on a unit tile (`selectUnit` + `pinUnit`), a search result, an ancestor pick, a deep link `?unit=`. Esc, the close button or a click on bare map clear it.
- Content: side letter, designation, id, copy-link, unpin, close; breadcrumb corps > division > brigade; disposition badge; a strength bar (`SF`: present / fallen / initial and a "Virtually destroyed" alert at 75 % losses, plus two hard-coded star lines for the 1st Minnesota and the 26th North Carolina); commander block (`wF`: succession with the cause in colour and notes); Key Action; "At tick N" notes; Recent Positions (up to 5); Battle Casualties.
- Position: fixed, top 60, left 16, 280 px wide, max-height `calc(100vh - 200px)`, z 92; measured 507 px tall for Armistead's brigade and 654 px for the Iron Brigade at tick 28.
- Motion: none; strength bar fill `transition: width .3s`.
- Tiles: opens on the left, so it lies on the left 280 px of the map. Of the unit tiles on screen at default camera and zoom 13.5, about 4 % (12 of 302 on average, sampled every 5th tick) have their centre inside that rectangle (taking the 654 px panel of the Iron Brigade): choosing one of them opens a panel that hides the tile just chosen. It also lies on top of the legend (z 92 over 88): measured overlap of 186 px of legend height.
- A11y: the best of the set (region with a label, focusable container), but focus is not moved to it when it opens and the data in it are not announced when the tick advances.
- Copy: "Fallen" for strength lost is not what the data says (a drop in `strength` between keyframes is a modelled estimate, not a casualty count); "Casualties" in the hover version and "Battle Casualties" here are percentages from the order of battle.

**P-07 NPS Auto Tour** (`XF`, style `Zr`, `data-gtbg-card="3"`; r1c-pretty.js:59218-59506; 16 stops in `th`, lines 59039-59216)
- Trigger: the gold button "NPS Auto Tour" (absolute, bottom 90, right 16, z 200, over the timeline dock at x 1295-1424, y 776-810). A stop: flies the map (`flyTo`, 1200 ms) to the stop's coordinates and zoom, clears the trail layer, jumps the tick to the stop's tick, sets speed 2x, plays for `tickWindow * 250` ms then pauses (timer never cleared). Closing restores the previous speed.
- Content: "STOP n OF 16", title, subtitle with a hand-typed day and clock, three paragraphs of narrative (94-129 words), 16 progress dots (clickable), Previous / Next, and for stop 1 only a "Show Video" button that opens an NPS iframe in a picture-in-picture box (z 400, top 58, right 16, 320 x 180).
- Position: absolute, left 60, right 0, bottom `calc(dock + 25px)`, max-height 38vh, z 300: a full-width drawer, measured x 60-1440, y 470-748 (1380 x 277 px; 36.6 % of the visible map).
- Motion: none (appears at once); the map flight is the only motion.
- Tiles: it covers the lower 38 % of the map and the flight puts the stop's coordinates in the exact centre of the map container (y 474 at 900 px), which is 4 px inside the drawer's top edge: the subject of every stop is under or on the edge of the panel that describes it (screenshot `d08c-tour-stop5.png`: Little Round Top and the 20th Maine cluster cut by the drawer).
- A11y: close button labelled; narrative is a focusable labelled group; no focus move; no live region; the video box is an iframe with a title.
- Copy: 13 of the 16 subtitles carry a hand-typed clock and 11 of those disagree with the toolbar clock at the stop's own tick by 175-620 min (section 3.4); stop 16 says "July 4-5, 1863" while the tick (610) is on the app's July 3; the video for stop 1 returns "The video you have requested is not available at this time." (curl 200 from nps.gov); the brand "NPS Auto Tour" names the National Park Service's route, which has 16 stops of its own (NPS Tour Stop #3 is Oak Ridge; here Oak Ridge is stop 2), so the numbering is the site's and not the NPS's.

**P-08 Monument markers and tooltip** (`KF`, array `mA` of 20 story markers; r1c-pretty.js:59507-59834): **dead in R1c**. Its position loop starts with `return;` (group A turned the per-frame loop off), so no marker is ever drawn and the hover tooltip ("Click to jump to 5:00 AM July 1") never shows. The toolbar button still looks pressed at load (`aria-pressed` true) and does nothing. The optional MON group (`tools/t0/MON-README.md`) restores it as map layers plus a card; see P-09.

**P-09 Monuments card** (group MON, scratch tree `tmp/mon-fix/mon-R1c`; `data-gtbg-card="4"`): a Mapbox popup anchored on the marker (desktop, z 120, follows the map) or a bottom sheet above the dock (phone, z 300), `role="dialog"`, closes on Esc and returns focus; story stars carry "Jump to this moment". Screenshots `d30`-`d33`, `p30`-`p31`. Its geometry on screen is measured in 3.8.

### 2.2 The persistent overlays (always there, always over the map)

| id | Element | Where (1440 x 900) and z | Notes |
|---|---|---|---|
| P-10 | HUD day badge (`_F`) | absolute, top 56 left 16, 160 x 43, z 88 | "July N, 1863", speed text ("1x (base speed)"), a green/grey dot, a progress ring for the day, and an orange "N fps" text when the frame counter is below 55 while playing: on every Play after a pause it shows "0 fps" for the first half second although the page renders at 60 fps (measured: 61 fps by `requestAnimationFrame`; the counter's first window spans the pause). The date is the tab day, not the calendar date. Opacity .9 paused, 1 playing (`transition: opacity .5s`). |
| P-11 | Trails button (`ux.trailBtn`) | top 10 right 56 of the map, 100 x 26, z 20 | "〰 Trails ON/OFF"; the trail layer is a separate canvas (z 8). |
| P-12 | Legend (`VF`) | fixed bottom 160 left 16, 240 x 359, z 88; open by default | Tabs Disposition / Sides / Size; closes to a ⊞ button. Its swatches match the colour the tile dot is really drawn in for 3 of 11 dispositions; the Size tab says "Dot radius scales with unit strength" while tiles scale in length and cap at 120 px (section 4, F-13). |
| P-13 | Minimap "OVERVIEW" (`WF`) | absolute bottom `dock + 25` right 16, 162 x 176, z 88; open by default | 160 x 120 canvas, ridge lines, every unit as a 2 px dot, the viewport box, "N units · tick T"; click flies the map (400 ms). Closes to ⊡. |
| P-14 | Toolbar (48 px, z 100) | top | title, "July N", tick clock, Toggle Units, User Guide (PDF), Virtual Walkthrough, 13 icon buttons. |
| P-15 | Timeline dock (`IO`, `#gt-timeline`, z 100) | absolute bottom 0, full width, 127 px | clock line, day buttons, scrubber with 8 px critical-event dots (`title` tooltips), transport, speed, "Tick n/675", credit. **It overlays the bottom 127 px of the unit canvas**: the unit canvas is 852 px tall but only 725 px are visible. Measured at default camera and zoom 13.5: the dock hides 39 of 302 tiles on average (13 %), 36 of them more than half. |
| P-16 | Extra Features cluster (static HTML, outside React) | fixed, z 450, `#extra-features`; moves | "Ask the Historian" pin, "Extra Features" button and menu. A script measures the free area every second after any DOM churn and moves the cluster; measured resting places: right-middle, top-left over the McPherson Ridge tiles, bottom-left over the timeline, bottom-right over the scrubber's critical dots, across five ticks of one session (section 3.5). Opened (`d22-extra-features-menu-open.png`), the menu is a panel of about 460 x 735 px that covers the left map, the legend and the left half of the transport controls (the Play button is behind it); no dim behind it. |
| P-17 | Mapbox controls | top-right stack (zoom, compass), attribution bottom-right, logo bottom-left | repositioned above the dock by `--gt-dock-h`. |
| P-18 | Cursor ring (`iO`) and touch ring (`P4`) | follows the pointer, z 30 / 999 | 36 px gold ring (52 px while pressed); a one-off decoration of the cursor. |
| P-19 | Day/night tint (`A4`/`C4`) | absolute inset 0 of the map, z 6, `mix-blend-mode: multiply`, `transition: background 8s ease` | An overlay on the whole map: colour by hour from the 05:00-base tick formula (`M4`: 5:00 + 5 min per tick on every day, not the toolbar's 06:00 / 04:00), 8 s transitions. It is the only popup-class element with a real animation, and it is driven by a different formula from the toolbar's. |
| P-20 | Trails canvas (z 8), z9 canvas, unit canvas (z 10) | inside the map container | unit canvas `pointer-events: none`; clicks come from the map. |
| P-37 | Canvas fps text | drawn on the unit canvas, bottom-left (10, height - 10), 10 px monospace orange | `N fps` whenever the frame counter is below 45, on desktop and phone; part of the tile canvas, so it is also a debug number in the visitor's picture |

### 2.3 Panels and modals opened by the toolbar (tools; they pause nothing)

| id | Element | Position, z | Behaviour |
|---|---|---|---|
| P-21 | Search `FF` | absolute top 56, centred, 440 px, max 75vh, z 95 | key S; result click sets the tick and selects a unit |
| P-22 | Filter `OF` | absolute top 56 left 0, 280 px, z 95 | key F; hides tiles by side, disposition, strength |
| P-23 | Unit Roster `Jk` | fixed top 48 left 0, 560 px, bottom 110, z 900 | covers the left 560 px of the map (39 %) |
| P-24 | Order of Battle `Xk` | full-screen dim, z 900 | **unreachable on the desktop**: its state setter is only ever called with false (close); on the phone it opens from the Tools tile "Order of Battle"; not screenshotted on desktop |
| P-25 | Soldier's Eye View `Yk` | full-screen dim, z 800, 8 Street View links | |
| P-26 | Follow Your Ancestor `Zk` | full-screen dim, z 700, `role=dialog aria-modal` | picks a unit, resets the tick to 1, flies to it |
| P-27 | Map Layers `GtbgLayers` | fixed top 60 right 10, z 1000 | |
| P-28 | Distance Tool `GtbgDist` | fixed top 60 centred, z 1000 | two clicks; "March time" uses 67 m/min |
| P-29 | Locations `GtbgLoc` | Mapbox symbol layer, 10 labels | |
| P-30 | Help / Bookmarks (lazy chunks) | modal overlays, z 600 | Help lists the keys |
| P-31 | Onboarding `bO` | fixed full-screen dim `rgba(0,0,0,.85)`, z 1000, `role=dialog aria-modal` | first visit only (no `gtbg_onboarded` and no deep-link parameter); archetype choice, a 5-step tour that jumps the tick to 1, 17, 28, 267, 538 behind the dim, a quick-reference page |
| P-32 | Loading layer `tO` | fixed full-screen, z 1000 | "Loading the battlefield…" until placements exist for more than five ticks; the 3.5 s fast-forward intro was removed from the build (its progress branch is unreachable) |
| P-33 | Boot splash (`#boot-splash` in `index.html`) | fixed full-screen | eyebrow, title "Gettysburg", "Watch the battle unfold in real time across 675 five-minute snapshots." (1x plays 5 battle minutes per 0.5 s, 600 times real speed), a sliding bar |
| P-34 | Walkthrough `_O` | fixed full-screen, z 500 | own map; out of scope (byte-identical rule) |
| P-35 | Layout chooser `dO` | z 1000 | unreachable in R1c (layout is auto-detected) |
| P-36 | Sound toggle `yO` | returns `null` | dead |
| P-38 | Hints and native tooltips | Distance Tool prompts ("Click map for point A", "Now click point B", "Click map to reset"); onboarding hint lines ("Click on a unit dot..."); the `title` attribute on the 13 toolbar icons, the scrubber's critical-event dots and the map controls (61 `title:` props in the app, earlier audit) | native browser tooltips: no styling, a delay the browser controls, not shown on touch; the onboarding hints and the legend still describe "dots" |
| P-39 | Day banners | none exist: the only day/date text is the HUD badge (P-10), the toolbar's "July N" and the dock's clock line; the date in the HUD is the Day tab, so between midnight and dawn it names the previous or next day (the corrected clock supplies "Night of July 1-2") | |

### 2.4 The phone layout (390 x 844, touch; `pO` and the CSS block in `index.html`)

A second, complete shell with its own Mapbox instance. It reuses the same card and toast components (`CF`, `LF`, `qF`) inside re-homing containers, so their trigger, content and timing are those of P-01 to P-03; what differs is placement, the unit popup and the sheets.

| id | Element | Trigger | Position, z (measured at 390 x 844) | Notes |
|---|---|---|---|---|
| P-40 | Top bar | always | fixed top, 52 px, z 200 | day and clock ("JULY 1 / 8:15 AM", the toolbar clock), "⋯ Tools" |
| P-41 | Day tabs | always | below the top bar, 45 px, z 200 | July 1 / 2 / 3 (jump) |
| P-42 | Dock | always | fixed bottom, 140 px, z 200 | scrubber with critical-event dots, step, play, speed, "Tick n/675" |
| P-43 | Mini legend | always | absolute bottom `dock + 32` left 10, z 150 | five colours: Union, Confed, Charging, Artillery, Retreat |
| P-44 | Minimap | always (a Tools tile toggles it) | absolute bottom `dock + 32` right 10, 80 x 64 plus label, z 150 | draws only the units that have a keyframe **exactly at the current tick** (`placementsByTick[tick].slice(0, 50)`), no carry-forward: measured 50 dots at tick 1, 0 at ticks 2 and 5, 3 at tick 553 and 600 while the map shows hundreds of tiles; the store has keyframes on 188 of 675 ticks, so it is empty or nearly so on 72 % of them (the desktop minimap uses the carry-forward) |
| P-45 | Story / event stack (`gtStk`) | P-01, P-02 | fixed, left/right 8, bottom `dock + 8`, z 260, max 68 % of the map zone; one card expanded, the others collapsed to a 44 px chip (story first) | measured at tick 28: story 374 x 291, event chip 374 x 44 |
| P-46 | Toast stack | P-03 | fixed, left/right 8, top below the day tabs + 8, z 270 | full width, no cap on height (4 toasts over the whole map at the first Play) |
| P-47 | Unit popup | tap on a tile, search, deep link | fixed bottom `dock + 8`, left/right 12, z 300; 366 x 162 for the Iron Brigade | hides the stack (CSS `visibility: hidden`); a subset of P-06; the map flies to the unit with a bottom padding of `min(170, 45 %)` |
| P-48 | Tools sheet | "⋯ Tools" | fixed full-screen scrim z 500 + sheet up to 88 dvh | 14 tiles + the Extra Features groups + Privacy / Terms |
| P-49 | Slide panels (roster, legend) | Tools tiles | fixed bottom, up to 65 vh, z 400, 12 px top radius | the legend lists dispositions with colour dots |
| P-50 | Onboarding | first visit | full-screen dim, dock left undimmed and tappable (`pointer-events: none` on the dim) | copy still says "dots" |
| P-51 | Monuments sheet (MON) | tap on a marker or Browse | fixed above the dock, z 300, sized to leave 110 px of map (213 px at 320 x 568) | 364 x 297 for the Armistead marker |

Phone-specific findings: the phone has no hover popup, no tour drawer (the Tools sheet has no NPS tour tile: `XF` is rendered only on desktop) and no HUD badge; its unit canvas is not repainted by camera moves while paused (3.7); its minimap is wrong on most ticks (P-44); and in portrait (canvas narrower than 500 px) its frame loop is throttled to one draw per 33 ms (`c - Ed._lastMobileMs < 33`), so a tile moves in 33 ms steps while a card enters at 60 Hz.

## 3. Measurements

All of this is R1c (`release/R1c/dist`, release id 2531699e) in system Chrome through the Tranche-0 harness (Referer injection, tile budget; every process stayed far under 300 Mapbox requests, the largest used 183), 1440 x 900 at device pixel ratio 1 for desktop and 390 x 844 at 2x with touch for the phone layout. Tiles are the real rectangles: a hook on `CanvasRenderingContext2D` records every `fillRect/strokeRect/arc/fillText` of the unit canvas with its transform (the four corners of each rotated bar, label boxes, disposition dots). Popups are the real DOM rectangles. Nothing in the product was modified; the hook is injected with `page.addInitScript`. After the first boot Mapbox requests were blocked (`setTiles('block')`), because tile imagery does not move a single unit or popup.

### 3.1 How long a popup is on screen (a 100-tick window, five speeds)

Window: ticks 254-356 (Day 2, Little Round Top to the Wheatfield; 36 event rows, 6 stories, 19 command changes), played for real at each speed with the page's own animation loop; a `MutationObserver` stamps every mount and unmount with `performance.now()`. The page ran at 60 frames per second (frame interval p50 16.7 ms, p95 16.9 ms at every speed, 0 long tasks); on a slower device a tick that is shorter than a frame is skipped altogether (the loop advances `floor(elapsed / (500 ms / speed))` ticks per frame), which the 60 fps run could not show.

| speed | ticks per second | event card on screen (median; min-max) | story card (median) | toasts on screen (median; min) | event cards rendered |
|---|---|---|---|---|---|
| 1x | 2 | **500 ms** (496-504) | 1,499 ms | 4,495 ms; 1,000 ms | 36 of 36 |
| 2x | 4 | 250 ms | 750 ms | 2,500 ms; 500 ms | 36 of 36 |
| 4x | 8 | 117 ms | 382 ms | 1,250 ms; 250 ms | 36 of 36 |
| 8x | 16 | 67 ms | 198 ms | 633 ms; 117 ms | 36 of 36 |
| 16x | 32 | **33 ms** (two frames) | 99 ms | 316 ms; 51 ms | 36 of 36 |

So a card lives for exactly the time its tick lasts. Against that, how long it takes to read it (Brysbaert's meta-analysis of 190 studies gives 238 words per minute for adult silent reading of non-fiction; [BPS Research Digest](https://www.bps.org.uk/research-digest/most-comprehensive-review-date-finds-average-persons-reading-speed-slower), unverified beyond that summary):

| card | words (min / median / max) | reading time at 238 wpm (median) | on screen at 1x |
|---|---|---|---|
| event card (event + narrative), 134 rows | 19 / 32 / 78 | 8.1 s (critical rows: median 35 words) | 0.5 s (6 %) |
| story summary, 24 vignettes | 48 / 58 / 73 | 14.6 s | 1.5 s (10 %) |
| story summary + script | 259 / 361 / 444 | 91 s | 1.5 s |
| command-change toast, 42 rows | 10 / 12 / 17 | 3.0 s | 4.5 s (fine, unless displaced) |

(`shots/popups/chart-dwell-vs-reading.png` draws this table against the measured times.)

Density matters as much as length. The 134 event rows fall 23.8 per minute at 1x; the median gap between consecutive event ticks is 2 ticks (1.0 s), the 90th percentile 10 ticks (5 s); the 45 critical rows are a median 3 ticks (1.5 s) apart. If every card lingered only 6 s at 1x there would be 2.4 cards alive on average and up to 11 at once (15 at a 10 s linger); at 4x, 9.4 on average and 28 at once. One card at a time cannot carry this; a queue with tiers can (section 5).

**The show is shorter than its reading (Computed, 238 wpm).** Reading every card once takes: the 45 critical events 7.5 min, the 24 story summaries 6.0 min (tier A together 13.5 min), the 73 high events 10.2 min, the 16 medium events 2.2 min. The whole battle plays in 5.6 min at 1x (675 ticks x 0.5 s). So even a visitor who reads at full speed cannot read the critical cards of the show in sequence: reading them takes 2.4 times as long as the animation, reading tiers A and B 4.2 times as long. Slowing the animation to 0.25x (22.5 min) is the speed at which reading A and B (23.7 min) and watching take about the same time. This is the arithmetic behind the queue, the Chronicle and the optional Narrated mode of section 5.6.

Toast bursts shorten the toasts themselves: `slice(-4)` keeps the last four, so a fifth arrival removes the oldest early (minimum 1.0 s at 1x, 51 ms at 16x). The 4 extra toasts in the 1x run (23 seen for 19 successions in the window) are the seek flood of F-05.

### 3.2 How many tiles do popups cover? (desktop)

155 ticks carry a transient popup (134 event ticks plus 63 ticks inside the 3-tick windows of the 24 stories; 42 ticks have both), each measured at three zoom levels (12, 13.5 = the app's default, 15.5) and two cameras: **default** (the camera a visitor lands on, centre -77.235, 39.812) and **follow** (centred on the centroid of the tiles the popup is about). 155 default and 128 follow snapshots per zoom (27 event ticks list no unit that has a tile). "Covered" = a tile polygon (rotated bar clipped to the canvas) overlaps a popup rectangle; "half hidden" = at least half of its area is under a popup. The persistent overlays (legend, minimap, HUD, trails button, tour button, Mapbox controls, the timeline dock) are counted separately from the transient cards.

| camera, zoom | tiles on screen (mean) | tiles under event/story cards: mean (median; p95; max) | half hidden (mean; max) | labels under cards (mean) | snapshots with at least one tile under a card |
|---|---|---|---|---|---|
| default, 12 | 345 | 36.5 (30; 99; 176) | 25.2; 154 | 22.5 | 155 of 155 |
| **default, 13.5** | **281** | **54.8 (62; 156; 170)** | **41.5; 132** | **43.9** | 121 of 155 |
| default, 15.5 | 33 | 7.8 (7; 19; 25) | 6.9; 23 | 6.0 | 153 of 155 |
| follow, 12 | 350 | 51.7 (17; 179; 252) | 41.3; 224 | 37.9 | 115 of 128 |
| follow, 13.5 | 239 | 40.7 (17; 154; 191) | 32.0; 166 | 31.2 | 116 of 128 |
| follow, 15.5 | 46 | 7.5 (4; 25; 30) | 6.1; 27 | 5.8 | 104 of 128 |

**The tile a popup is about.** Where at least one of the popup's own units has a tile on screen:

| camera, zoom | snapshots with a subject tile on screen | of which a card lies on a subject tile | subject tiles under cards / total |
|---|---|---|---|
| default, 12 | 128 | 12 | 28 / 304 |
| default, 13.5 | 113 | **27 (24 %)** | 43 / 259 (17 %) |
| default, 15.5 | 14 | 3 | 3 / 32 |
| follow, 12 | 128 | 4 | 11 / 304 |
| follow, 13.5 | 127 | 8 | 10 / 302 |
| follow, 15.5 | 114 | **21 (18 %)** | 25 / 255 (10 %) |

Centring the camera on the subject helps at zoom 12-13.5 and hurts at 15.5: the subject then sits in the middle of the screen, which is where the event card (bottom centre) and the story card (top right of centre) are. A fixed screen slot is wrong at every zoom; the slot has to be chosen against the tiles.

**Persistent overlays, every 5th tick (135 samples per zoom, default camera, no card needed).**

| zoom | tiles on screen (mean) | tiles under persistent overlays: mean (max) | of which the timeline dock | legend | Mapbox controls | HUD | samples with a tile at least half hidden |
|---|---|---|---|---|---|---|---|
| 12 | 366 | 2.1 (17) | 1.7 | 0.4 | 0 | 0 | 24 of 135 |
| **13.5** | **302** | **42.1 (65)** | **39.0** | 2.7 | 0.2 | 0.1 | **123 of 135** |
| 15.5 | 36 | 5.4 (11) | 4.3 | 0.3 | 0.4 | 0.5 | 117 of 135 |

The largest hider is not a popup in the usual sense: **the 127 px timeline dock lies over the bottom of the unit canvas**. The canvas is 852 px tall, the part you can see 725. At the default camera and zoom the dock covers 13 % of the units (mean 39 of 302), including the southern battlefield (Little Round Top, Devil's Den) that Day 2 is about. The cause is that the map's camera is never told about the dock: no `padding`, so the landing view is centred on the whole canvas.

**How much of the map the overlays take** (sum of measured rectangles, rasterised union over the 1440 x 725 visible map area): persistent overlays at their defaults 13.7 %; plus one event card 20.1 %; plus a story card and four toasts 42.6 %; plus an open unit panel 50.3 %. The NPS tour drawer alone is 36.6 %. The Roster is 39 %.

**Cross-check with the tile track.** `docs/pitch/anim/01-current-tiles-jitter.md` (section 0, item 7), using the shipped draw routine and its own rectangles, reports 177 of 414 tile centres (43 %) under the overlays at tick 556 with the legend, a vignette card and the event card showing. Here, at the same tick, zoom 13.5 and default camera: 443 tiles on screen, 232 touched by an overlay and 193 (44 %) at least half hidden (story card 83, event card 87, timeline dock 57, Extra Features 14, legend 2). Two independent measurements, the same answer; `03-data-fuel.md` section 9.7 reports 5 to 38 % of the tile centres in view under another element, a range of the same order (the 14 % of the persistent overlays alone lies inside it; the 44 % at tick 556 with everything up lies just above it), and `06-layout.md` leaves the placement of cards against tiles to this document ("not built, not measured").

**One day of playback at 1x, default camera (225 ticks = 112.5 s per day).** The persistent overlays are sampled at every 5th tick (45 samples per day); the cards exist only at their own ticks, so their coverage is the exact value at each of those ticks and zero elsewhere:

| zoom | day | tiles on screen (mean) | tiles under persistent overlays: mean (half hidden) | time with an event or story card up | time a card lies on a tile | tiles under the cards while one is up (mean) | ticks a card lies on a subject tile |
|---|---|---|---|---|---|---|---|
| 12 | July 1 | 195 | 6.3 (2.1) | 21 s (19 %) | 19 % | 13 | 0 |
| 12 | July 2 | 393 | 0 (0) | 30 s (27 %) | 27 % | 36.5 | 7 |
| 12 | July 3 | 510 | 0 (0) | 26.5 s (24 %) | 24 % | 55.1 | 5 |
| 13.5 | July 1 | 133 | 8.9 (8.7) | 21 s (19 %) | 4 % | 0.2 | 0 |
| 13.5 | July 2 | 333 | 56.1 (47.5) | 30 s (27 %) | 27 % | 55.5 | 21 |
| 13.5 | July 3 | 440 | 61.2 (52.7) | 26.5 s (24 %) | 24 % | 97.2 | 6 |
| 15.5 | July 1 | 14 | 2.4 (1.4) | 21 s (19 %) | 18 % | 1 | 0 |
| 15.5 | July 2 | 39 | 5.6 (4.6) | 30 s (27 %) | 27 % | 8 | 2 |
| 15.5 | July 3 | 55 | 8.2 (6.4) | 26.5 s (24 %) | 24 % | 13.1 | 1 |

Day 1's opening action lies in the north-west of the default view and partly beyond its edge (133 tiles on screen on average at zoom 13.5, against 333 and 440 on Days 2 and 3), so the cards rarely reach a tile there; on Days 2 and 3 they do for roughly a quarter of the day (26.7 % and 23.6 % of the playing time at zoom 13.5), and while a Day 3 card is up it lies on 97 tiles on average.

**Is there room?** For the same 155 ticks, a tile-free rectangle of a given size (6 px grid over tiles, labels, dots and the persistent overlays at their default places) exists as follows:

| camera, zoom | event card 460 x 150 | tall event card 460 x 215 | story card 340 x 500 | story peek 340 x 160 | toast 300 x 92 | chip 240 x 44 |
|---|---|---|---|---|---|---|
| default, 12 | 155 / 155 | 153 | **0** | 155 | 155 | 155 |
| **default, 13.5** | **42 / 155 (27 %)** | 42 | **37 (24 %)** | 155 | 155 | 155 |
| default, 15.5 | 155 | 146 | 103 (66 %) | 155 | 155 | 155 |
| follow, 12 | 128 / 128 | 112 | **0** | 128 | 128 | 128 |
| follow, 13.5 | 91 / 128 (71 %) | 72 | **18 (14 %)** | 110 (86 %) | 128 | 128 |
| follow, 15.5 | 124 | 115 | 64 (50 %) | 128 | 128 | 128 |

At the zoom a visitor lands on, the full-size event card finds clear ground in a quarter of the moments and the story card in a quarter; a compact 340 x 160 "peek" and a 300 x 92 toast find it every time. Placing the existing cards on empty ground is not enough; their compact form must exist, and the long text must open into a surface that does not lie on the map.

### 3.3 What the popups point at

Computed from the placement and density files (1,804 keyframes, 478 unit ids), the same data the animation reads. A unit has a tile at a tick when it has a keyframe at or before it (the app's carry-forward rule).

- 22 of 24 stories name at least one unit that has a tile at the trigger tick (42 of 47 featured ids). The vignette's own `trigger_lat/lng` is 0-1,915 m from those tiles (median about 190 m; seven of 42 distances over 500 m), so it can place a "location" marker but must not stand in for the tile. Neither field is read by the app: `trigger_lat`, `trigger_lng` and (for events) `units_involved` have no reference in the bundle; the camera does not move for a card and no tile is highlighted.
- 108 of the 134 events have at least one unit with a tile (241 of 295 listed ids); 12 list no unit; 14 list units that have no tile.
- Two of the 24 stories (V-007 at tick 248: `U-III`; V-024 at 675: none) have no tile to point at; they fall back to the vignette coordinates.

### 3.4 Clocks on one screen

The toolbar clock is the legacy formula (day 1 from 06:00, days 2 and 3 from 04:00, 5 minutes a tick). The popups print other clocks. For the 134 event rows the printed `time` differs from the toolbar clock at the same tick by -170 to +60 min; only 11 agree within 5 minutes, 38 within 30. Of the 16 tour subtitles 13 carry a clock; they differ from the toolbar clock at the stop's own tick by 35-620 min, 11 of them by 175 min or more (e.g. stop 5 "July 2, 4:00 PM" at tick 264 where the toolbar reads July 2, 7:10 AM). The story text at tick 28 says "approximately 10:15am"; the event card at tick 28 says "7:20am"; the toolbar says "8:15 AM". The day/night tint and the monument tooltip use the 05:00-base tick formula (the same as the event cards' strings, not the toolbar's).

The corrected clock exists as an unsigned candidate (`tools/time/build/gtbg-time.iife.js`, header "CANDIDATE (proposed, unreviewed anchors)"; `GTBGTime.f(28,'compat')` = "July 1, about 10:15 AM"). Against it the tour subtitles agree within 0-90 min (median 25 min) and the event cards' `time` strings differ by more than 60 min for 121 of 134 rows and by more than 180 min for 100. So the day the corrected clock ships, every event card that still prints its own `time` contradicts the toolbar. (Label: **Modelled**, candidate anchors; nothing here asserts a historical time.)

### 3.5 Behaviour probes (real clicks and keys)

| probe | result |
|---|---|
| Dismiss the story at tick 28, go to tick 100, come back | not shown again (the dismissed set is never cleared); the next vignette (tick 29) shows |
| Dismiss the event card, step +1 then -1 | not shown again; jump away to tick 60 and back: shown again |
| Click July 3 (tick 451) then Play | **4 toasts within 123 ms, none of them about Day 3**: "Scales wounded" (tick 52), "Avery mortally wounded" (328), "Jones wounded" (315), "Stuart arrives" (310), unsorted, on screen for the whole 2.9 s observed |
| First Play at tick 254 after a seek made while paused (timing run) and at tick 547 on the phone | the same 4 stale toasts appear (23 toasts for 19 successions in the window; `p04-toasts-playing.png`) |
| Esc with a story pair and an event card up | three presses: one per vignette, then the event card |
| NPS tour, press Next 400 ms after a stop | playback stopped after 900 ms (the new stop's own timer); the old stop's pause timer is never cleared but did not truncate this case |
| Keyframes defined by the page | mapboxgl-spin, mapboxgl-user-location-dot-pulse, boot-slide, boot-fade-in, gtbg-force-reveal, gtbg-banner-in, gtbg-pin-glow: no `slideIn` |
| Event card computed style | `animation-name: none`, `transition: all 0s` |
| Accessibility | toasts `role="log"` `aria-live="off"`; event card no role; story card no role (its body group is labelled "Event details"); focus stays on `<body>` when a card appears |

### 3.6 The Extra Features cluster moves over the map

Static script in `index.html` (z 450, outside React). After any element is added or removed under `#root` it re-measures every button, text leaf and floating panel and relocates the cluster. Measured resting places in one session at default camera: right edge middle (tick 1), top-left over the McPherson Ridge tiles (tick 28), bottom-left (tick 272), bottom-right over the scrubber's critical-event dots (tick 272 with the Roster open). It lies above every popup (z 450 > 300 > 200 > 92), so it overprints toast titles (`d05-toasts-playing-tick550.png`) and the story card's script (`d06-unit-panel-ironbrigade-t28.png`). Measured over plain playback (1x, ticks 1-95, default camera, 47 s): the cluster moved once (0.33 s after it was revealed, y 108 to y 124) and then rested at x 14-417, y 124-163 for the rest of the run, which is on the Day 1 opening action. Whenever panels were opened or closed in the other sessions it relocated (right-middle at tick 1, top-left at tick 28, bottom-left and bottom-right with the Roster or Monuments toggled). The placement script measures buttons, text leaves and floating panels, never the unit canvas (`if (tag === 'CANVAS') continue`), so it is blind to tiles. At the default camera and zoom 13.5 its resting place covers on average **15.0 tiles (max 19) and 8.1 labels, in 132 of 135 sampled ticks**; at zoom 12 and 15.5 it covers none (same place, different ground). It is the only overlay in this inventory that covers tiles at most ticks of the landing view.

### 3.7 Phone layout (390 x 844)

Layout: the map zone is 608 px tall at 844 px (top clock bar 52 px, day tabs 45 px, dock 140 px). Cards re-home into `.gtbg-mp-story` (z 260, bottom `dock + 8`) with one expanded and the others collapsed to 44 px chips; toasts into `.gtbg-mp-toast` (z 270, below the day tabs); a tapped unit opens a 366 x 162 popup (z 300) and hides the card stack. The map is a second Mapbox instance with its own canvas (z 10).

| what | measured |
|---|---|
| tick 28 (story + event) | story card 374 x 291 plus event chip 374 x 44: **335 of 608 px (55 %) of the map zone**, full width |
| first Play at tick 547 | four stale toasts (374 x ~107 each, full width) plus the event card: y 105-695, **about 95 % of the map zone**; the map shows only a few pixels at the screen edges (`p04-toasts-playing.png`) |
| tick 553 | the same stack (story 291 + chip 44) |
| unit popup | 366 x 162 at the bottom; a subset of the desktop panel (name, side, disposition, "1800 men", notes, commander); no strength bar, no key action, no casualties, no recent positions; "1800 men" is not grouped |
| landscape 844 x 390 | the story card takes the right half of the map; the event card is a chip above it (`p07-landscape-cards-tick28.png`) |

Coverage at the 155 popup ticks (same method as 3.2; phone default zoom is 13, minimum 11; each camera move is followed by a forced repaint, see below):

| camera, zoom | tiles on screen | tiles under cards: mean (median; max) | subject on screen: snapshots / a card on a subject tile | subject tiles under cards |
|---|---|---|---|---|
| default, 12 | 328 | 93.9 (46; 306) | 123 / 41 (33 %) | 93 of 295 |
| **default, 13** | **234** | **86.9 (101; 218)** | **97 / 46 (47 %)** | 93 of 218 (43 %) |
| default, 15 | 27 | 14.6 (10; 48) | 11 / 8 | 23 of 28 |
| follow, 12 | 310 | 115.2 (79; 431) | 127 / 59 (46 %) | 149 of 302 |
| follow, 13 | 161 | 60.2 (37; 205) | 127 / 58 (46 %) | 143 of 302 |
| follow, 15 | 27 | 11.6 (9; 53) | 111 / 59 (53 %) | 121 of 243 |

On the phone a card lies on a tile the card is about in roughly half of the moments, with or without the camera following (the cards are full-width, so centring cannot help). The persistent phone overlays hide little (mini legend 18.7 tiles on average at zoom 13, minimap 3.9; the dock and bars lie outside the canvas). Free space: a full-width chip (374 x 44) finds a tile-free place in only 43 of 155 default snapshots at zoom 13 (28 %), a 374 x 150 card in 23 (15 %): **on the phone the cards cannot be placed on empty ground at all**, the layout has to give them a lane (section 5.7).

**The phone unit canvas does not follow the camera while paused (Measured).** On the phone layout the map has no `move` listener that repaints the unit canvas (desktop group A2 added one; the phone code registers `click` and `resize` only). Test, tick 28 paused: a real two-finger pinch (CDP touch events, zoom 13 to 14.5) and a drag; the canvas still holds the same 41 tiles at identical screen positions (`phone-pinch.mjs`, screenshot `p09-phone-after-pinch-and-drag-paused.png`); `jumpTo` zoom 13 to 15 gives the same (`phone-repaint.mjs`); the next tick repaints. A pinch or a drag while paused leaves the tiles where they were on the screen while the map moves under them. A popup that is anchored to a tile has to read the unit's position from `map.project`, never from the last canvas frame.

### 3.8 The Monuments card (group MON, scratch tree)

Scratch tree `tmp/mon-fix/mon-R1c` (R1c + MON, release id e8a08faa; not registered in any train). Layer on: 512 dots and 20 stars drawn inside the map. The desktop card for the Reynolds Death Site (opened from the "Browse monuments" list, z 120, a Mapbox popup anchored on the marker) is 318 x 344 at (561, 101), `role="dialog"`, no animation; it names the linked unit ("19th Indiana Volunteer Infantry — on the field at this moment"), the clock of the story ("10:15 AM July 1") and "The moment the text names: July 1, tick 52 of 675", with Jump, Google Maps and "Open in Walkthrough list". The Browse list is a panel of about 300 x 425 under the Mapbox controls at the top right. On the phone the card is a 364 x 297 sheet above the dock. **After Jump the screen shows the popups of tick 52 (Iverson's Pits: a story card, a "Rodes attacks" event card, the 19th Indiana panel), none of them about the Reynolds marker the visitor came from**: Jump lands on the tick whose legacy clock reads the story's 10:15 AM (`d33-mon-after-jump.png`). With the corrected clock (owner decision 4) the jump lands on the marker's own tick 28, where the story and the event card are Reynolds'. The card is a separate layer (`data-gtbg-card="4"`, the first thing Esc closes) that knows nothing about the story, event or toast layers: no queue, no shared placement.

## 4. Findings

Ordered by how much they decide the design. Each cites the measurement (section 3) or the inventory id (section 2). "Computed", "Measured" and "Modelled" are the site's evidence words.

**F-01 The popups cannot be read while the animation plays (Measured, Computed).** An event card is on screen exactly as long as its tick: 500 ms at 1x, 33 ms at 16x. Reading its median 32 words takes about 8 s; the 45 critical rows are the same. A story card lives 1.5 s at 1x for 14.6 s of summary. The cards are drama at playback speed and a document only when paused. Their lifetime is a function of the playback speed, the one number a visitor changes most.

**F-02 Popups lie on the tiles, including the tiles they are about (Measured).** Default camera at the app's default zoom: event and story cards cover 55 of 281 tiles on average (170 at worst), 24 % of the moments that have a subject on screen put a card on a subject tile; at zoom 15.5 with the camera centred on the subject it is 18 %. The persistent overlays hide 14 % more, and nearly all of that is the timeline dock (F-09). The phone layout is in 3.7.

**F-03 Nothing points at anything (Computed).** 22 of 24 stories and 108 of 134 events have a unit with a tile at their tick, and the data carry coordinates for every story, but the app reads none of it (`units_involved`, `trigger_lat`, `trigger_lng` are unused). No leader line, no highlighted tile, no camera move; the card says "Eastern edge of Herbst Woods" in a corner of the screen while the tiles of that fight lie under the Extra Features button.

**F-04 The tour hides its own subject (Measured).** `flyTo` centres the stop's coordinates at y = 474 and the drawer's top edge is at y = 470: the Little Round Top stop describes ground that is under or cut by the panel (`d08c-tour-stop5.png`). The drawer is 36.6 % of the visible map. The fix is `padding`.

**F-05 Toast flood and stale toasts (Measured).** After a day jump or any seek, the first Play produces up to four toasts for events that happened hundreds of ticks earlier in other days (measured: Scales at tick 52, Jones 315, Avery 328, Stuart 310 after clicking July 3 then Play), in array order and not in time order, and the same happens on the first Play after any seek made while paused (in the timing run and on the phone too). Cause: the toast loop remembers the last tick it saw while playing only. A burst of more than four (tick 550 has four, 551 and 552 two each) silently drops the older toasts early.

**F-06 Toasts: the animation never runs, and 5 wounds are labelled "Command change" (Measured).** `slideIn` has no `@keyframes`; for 9 of 42 rows the title is the generic "Command change" and 5 of these are wounds in their own sentence (Sickles, Hood, Armistead, Avery, Hampton), because the category is guessed from words in the `cause` field. Colour is the only category cue.

**F-07 Several clocks and a hand-typed `time` (Computed, Modelled).** See 3.4. Whatever the corrected clock does, a popup must not print a clock of its own. Today at tick 28 the screen says 8:15 AM (toolbar), 7:20am (event card), "approximately 10:15am" (story text); the tour says 4:00 PM at a tick the toolbar reads 7:10 AM; the tint runs on the 05:00-base formula. The evidence words apply: the corrected clock prints "about" because its anchors carry uncertainty (**Modelled**); a vignette's "approximately 10:15am" is a sentence from the source text (**Documented** at the level of the vignette's source list, not per row; the vignette file lists sources for the whole file only).

**F-08 The Extra Features cluster is the most disruptive overlay (Measured).** z 450, above every popup; it relocates itself after layout changes (a card appearing is one), landing on tiles (top-left over McPherson Ridge at tick 28), on toast titles, on the scrubber's critical-event dots, and on the story card's text. It is not part of the app's overlay system and does not know the tiles.

**F-09 The timeline dock hides 13 % of the units at the default view (Measured).** The unit canvas extends under the 127 px dock, the camera never gets the dock as padding, so the southern battlefield (Little Round Top, Devil's Den, the Round Tops) sits under it at the landing view. 123 of 135 sampled ticks have at least one tile at least half hidden by a persistent overlay at zoom 13.5.

**F-10 No motion language (Measured, code).** Event card, story card, tour drawer and unit panel appear and disappear in one frame; toasts' animation is missing; the only real transitions are the day/night tint (8 s), the HUD opacity, the progress bar and the scroll bar. Meanwhile the tiles interpolate and the camera flies: the interface around them cuts. Reduced-motion is honoured by the unit loop and the phone flight, not by any popup (there is nothing to turn off).

**F-11 Accessibility (Measured, code).** Toasts `aria-live="off"`; cards have no role, no focus handling and no live announcement; the story card's labelled group says "Event details"; category by colour and glyph only; text sizes 9-12 px in toasts, minimap, legend and HUD (earlier report: `#555` on the dark panels is 2.64:1); the story and event cards cannot be reached except by Tab through the page.

**F-12 Dismissal and focus are inconsistent (Measured).** A dismissed story never returns; a dismissed event card returns after a jump but not after +1 -1; Esc removes one vignette at a time; `Dismiss all` and close are two buttons in the footer and the header; the footer's "Dismiss" and the location text run together when the location is long (`d02-cards-tick28.png`).

**F-13 The legend describes a renderer that no longer exists (Computed).** Swatches match the colour the tile dot is drawn in for 3 of 11 dispositions (Charging, Retreat, March; "Line of Battle" is drawn in the side colour, so Confederate lines carry a red dot where the legend says blue). The Size tab says "Dot radius scales with unit strength" and shows three circles; tiles scale by length (strength / 4 px, capped at 120), half of the 1,804 keyframes are at the cap, so brigades and divisions are the same length. The Sides tab says "Dot outline = side color / Dot fill = disposition color"; the tile body is filled in the side colour and the dot above it is the disposition. Onboarding step copy still says "blue dots", "large blue dot in Herbst Woods".

**F-14 Four popups are dead code and their purpose is unserved (Measured, code).** The commander cross-out card, the hover popup, the monument markers with their tooltip (in R1c; group MON restores them) and the sound toggle; a fifth, the Order of Battle panel, has no desktop trigger at all (only the phone's Tools tile opens it). The owner's rule is "never remove": each is a stated purpose that is not being met. Section 5 gives each a revival.

**F-15 Tour content (Measured, read).** One of 16 stops has a video, and its page, [nps.gov media page C92C2F74...](https://www.nps.gov/media/video/view.htm?id=C92C2F74-1DD8-B71C-07BF91D4DC85469C), answers HTTP 200 with "The video you have requested is not available at this time." (read with `curl` and seen inside the picture-in-picture box). The NPS lists its own [Tour Stop #1a](https://www.nps.gov/media/video/view.htm?id=BD55A1DC-B333-6D51-AF135A90E3C4DD91) and [#1b](https://nps.gov/media/video/view.htm?id=C0D68522-A132-738B-93FD5DB0E896E35C) McPherson Ridge videos under other ids, calls Oak Ridge [Tour Stop #3](https://nps.gov/media/video/view.htm?id=CBFB89E5-A5E3-F01B-E1808C01E01D39C0) where the site says stop 2, and describes the [Auto Tour](https://www.nps.gov/tours/view.htm?id=FEA56ACE-C373-F78E-5A3491D9146E882B) as 16 stops (all from a search's titles, URLs and one-line summary; those pages were not opened). The label "NPS Auto Tour" claims an authorship and a numbering the content does not have. Tour subtitle clocks: 3.4. Stop 16 says "July 4-5, 1863" for a tick the app calls July 3.

**F-16 Copy that leaks the data model (Computed).** Raw ids in 23 of 24 story badges (`U-I, U-I-1-1`), "Commander succession CS-006 activates" (an internal id) in 6 event sentences, "Tick 52" on toasts, "Fallen" for a strength delta, "real time" in the boot splash for a replay that runs 600 times faster than the clock at 1x (5 battle minutes per 0.5 s).

**F-17 What the data must not leak into a card (Computed).** `flag` (66 of 137 chronology rows) holds production notes ("Place precisely", "HIGHEST PRIORITY ANIMATION") and must never reach a popup; `time` is a tick-formula label; only the 42 command-change rows carry a per-row `source` (e.g. "Pfanz First Day p.65") that the toast does not show; events and stories have file-level source lists only. Evidence chips must be data-driven: a chip may only appear where the row can back it.

**F-18 Phone (Measured).** On the phone layout cards are full width: in 47 % of the moments with a subject on screen (zoom 13) a card lies on a tile it is about; at tick 28 the stack is 55 % of the map zone, and the first Play after a seek puts four stale toasts plus the event card over about 95 % of it. A full-width chip finds tile-free ground in 28 % of the moments, so the phone needs a reserved lane, not better placement (3.7). The phone unit popup is a subset of the desktop panel, and the phone minimap draws only the units that have a keyframe exactly at the current tick (0 dots at ticks 2 and 5, 3 at tick 553), so it is empty or nearly so on 72 % of ticks.

**F-19 The phone unit canvas is stale after a paused pan or zoom (Measured).** See 3.7. It is a tile-track defect; it matters here because a caption pinned to a tile must follow the map, not the last canvas frame.

**F-20 The HUD prints a false "0 fps" on every Play (Measured).** The frame counter's first one-second window spans the time the animation was paused, so the first reading after pressing Play is about 0 and the orange "0 fps" shows for about half a second while the page renders at 60 fps (`hud-fps.mjs`: 61 fps measured, HUD text "0 fps" in the first sample, none afterwards). A visitor is told, at the moment the show starts, that it is not running. The text and the `N fps` that the unit canvas draws below 45 fps are debug numbers (decision D-5).

**F-21 Production is worse than R1c on the same popups (Measured, one session).** The live site's build (`baseline/dist`) opens on the "Choose Your Experience" chooser at every load, with the Extra Features buttons floating beside the Mobile card (`d24-production-layout-chooser.png`); after "Select Desktop" its story card is 340 x 700 px at the right edge, over the zoom buttons and the minimap, the HUD badge reads "July 3, 1863" at tick 28, and the event card (bottom 120 px) is clipped by the 127 px timeline dock (`d25-production-build-tick28.png`). R1c already fixes these; the findings above hold for both, and the first-Play toast flood is in the same code.

## 5. Design review

The content is the asset: a three-day battle told in 134 timed events, 24 short stories, 42 command changes and 16 tour stops, each with a purpose a visitor feels. What is weak is everything around the content: where it appears, how long it stays, what it points at, what it sits on and what clock it quotes. Nothing below removes, renames or shortens a popup's content or purpose.

### 5.1 What is good, and what to keep exactly

- **Every popup the app has, with its content and its trigger.** Event card (significance, time, sentence, narrative), story card (title, read time, summary, italic script, scroll bar, pager, jump), command-change toasts (cause icon, name, fate sentence), unit panel (strength bar, commander and succession, key action, positions, casualties), NPS tour (16 stops, dots, previous/next, close restores speed), legend, minimap, HUD, onboarding archetypes, Esc order, 44 px phone targets.
- **Popups are born from the tick.** The card appears because the animation reached the moment. That cause-and-effect is what the owner loves; it stays. What changes is how long the effect lasts and where it lands.
- **The visual identity.** Dark glass panels (`rgba(8,8,18,.94-.97)` with a 1 px gold `#8b6914` / `#c8a84a` rule), Georgia titles in `#e8d5a3`, sans body, the red-orange-yellow significance colours, letter-spaced micro labels. The boot splash ("Gettysburg", the eyebrow, the slow bar) is already at the standard the rest should reach.
- **The scrubber's critical-event dots** (clickable, titled) and the phone's story stack with 44 px collapsed chips (`gtStk`): good patterns, kept and extended (5.6, 5.7).
- **Honest empty states.** "Not on the field", "Loading the battlefield…", the unit panel hiding rows it has no data for.

### 5.2 Ten rules the redesign obeys

1. **A caption, not a panel.** A popup says where it is: a leader line to the tile it is about, a ring on that tile; a dashed ring on the coordinates when there is no tile; nothing floating without a referent (3.3: 22 of 24 stories and 108 of 134 events have a tile to point at).
2. **Never on a tile.** The only way to hold that for every tick, zoom and device is to give each popup a ladder of forms (full, wider, compact, chip) and a solver that picks the first form that finds tile-free ground, plus a lane that is part of the layout when none does (phone). The prototype (5.10) holds it for all 155 popup ticks at three zooms and two cameras.
3. **Life in wall-clock time.** A card stays for its reading budget (words x 252 ms, the 238 wpm figure, clamped by tier), whatever the playback speed. The tick starts it; the viewer's own clock ends it.
4. **One clock.** A popup never prints a clock of its own. It asks the clock module (`GTBGTime.f(tick, 'compat')`) and prints "about 10:15 AM" with a **Modelled** chip while the anchors are candidates; a story's quoted time stays a quotation of its source.
5. **Tiers and a queue, nothing lost.** Critical events and all stories (tier A, 45 + 24) get a card; high events (73) a shorter one; medium events and command changes (16 + 42) a chip; at higher speeds the tiers fall back to chips and the **Chronicle** (5.6); every row is recoverable, none is silently dropped (today a fifth toast evicts the first after as little as a second).
6. **Jump hygiene.** A seek of more than three ticks clears what belongs to the old place and raises no toast for the ticks skipped; the card of the landed tick enters after the camera lands. (Today: four stale toasts, F-05.)
7. **One motion language, shared.** Enter 220 ms, exit 160 ms, relocation by cross-fade, leader draw 240 ms, one easing (`cubic-bezier(.2,.8,.2,1)`), the same tokens as the unit tiles and the camera (the tile track should adopt them, so one edit retunes the show); reduced motion: 120 ms opacity, no ring pulse, `jumpTo`.
8. **Honest evidence.** A chip appears only where the row can back it (5.9). No hand-typed clock. No internal id.
9. **Everything reachable.** Cards are announced (a polite live region, at most one message per 2 s), reachable by key (N / P: next / previous event, Enter: open), dismissable by Esc in one press per layer, with the focus returned.
10. **One module, one frame.** The director lives in the same bundle and the same store as the animation and reads the tick, the clock, the camera and the tile frame in the same animation frame. It is not a worker, a service or a second pipeline: the stale toasts, the several clocks and the stale phone canvas of section 4 are all failures of two things that should have read one state at one time.

### 5.3 Popup by popup

| id | Keep exactly | Improve | Evidence it needs |
|---|---|---|---|
| P-01 Event card | significance colour/icon, time line, sentence, narrative (italic), "+N more" idea | Lower-third form with leader line and ring; the clock from the module with a Modelled chip; natural height with no clamp (sentence never cut); the narrative opens on demand; tier B shorter; no internal id (6 rows: strip "Commander succession CS-006 activates" at build time or render it as a link to the toast); life = reading budget (min 3 s tier A); enter/exit motion; announced politely | per-row source does not exist (file-level list only): no "Documented" chip yet |
| P-02 Story card | title, read time, summary, italic script, scroll bar, pager, jump, dismiss | Peek (title + 3 lines + "Read the full story") that docks; the full text opens in a rail that **resizes the map container** (never over tiles); badge shows unit names (order of battle) not ids; read time at 238 wpm; "Jump" labelled with the clock, not "28"; a dismissed story returns after a seek away of more than a day or from the Chronicle | `units_featured` -> names (data present in the OOB) |
| P-03 Toasts | icon, name, fate sentence, tick | Chips in the lane (desktop: bottom-left above the dock; phone: the 44 px lane); cause from a typed field, not guessed words (9 of 42 get the neutral title; 5 contradict their own sentence); coalesce a burst ("4 commanders fall at 3:10 PM", expand on hover); show the per-row source ("Pfanz, First Day, p. 65") as the Documented chip (42 of 42 rows have it); the `slideIn` motion defined; no seek flood; life 2.5-4.5 s each, never evicted early | `source` is per row |
| P-04 Cross-out card | the idea: old commander struck through, new one slides in | Revive on the map: a badge on the unit tile (†, ⚕, ⚑) with the old name struck through then the new name sliding in over 2.4 s, anchored to the tile, tier C; the chip carries the text | none new |
| P-05 Hover popup | (dead) one-glance unit identity | Revive as a 220 px tile tooltip on hover/focus (name, strength, disposition) with a short leader, hoverable and dismissable (WCAG 1.4.13) | order of battle |
| P-06 Unit panel | all sections and the strength bar | Dock it (map container resizes) instead of overlaying 280 x 507-654 px of map; keyboard path to units; announce selection; fix "Fallen" wording against the data (a strength delta is Modelled, not a count); the phone popup gets the same sections in the sheet | "Fallen": label as Modelled |
| P-07 NPS tour | 16 stops, narrative, dots, previous/next, close restores speed, video pip | `flyTo` with `padding` so the stop sits in the free part of the map; a docked sheet instead of a 36.6 % drawer; clocks from the module; the dead video replaced by a link-check (hide "Show Video" when the page says "not available"); stop 16 date corrected; rename or caveat "NPS Auto Tour" (numbering is the site's) | NPS stop numbering: Documented only if re-keyed from the NPS list |
| P-09 Monuments card | the card, Jump, Google Maps, Walkthrough link | Register it with the director: anchored, queue-aware, same motion; Jump lands on the star's tick once the corrected clock ships | none |
| P-10 HUD | day, speed, progress ring | Make it the one place the clock lives (tick label in the toolbar becomes the same component); the date from the module ("Night of July 1-2" between midnight and dawn); the "N fps" text moves behind a performance preference (it shows a false "0 fps" at every Play) | clock Modelled |
| P-12 Legend | three tabs, swatches | Generate swatches and tile dots from one table (3 of 11 match today); replace "Dot radius" by the real size encoding (tile length, capped at 120 px for half of the keyframes: either change the encoding or say so); closed by default on first visit below 1280 px or when it would cover tiles | tile track |
| P-13 Minimap | overview, viewport box, click to fly | Pulse a ring on the minimap when a card concerns an off-screen subject (the cue the camera did not give); closed on the phone by default | none |
| P-15 Dock | clock, days, scrubber, critical dots | Give the camera the dock as `padding` (13 % of tiles recovered at the landing view); add event chips to the scrubber (the same rows); keep | none |
| P-16 Extra Features | the pill, the menu, hiding it | Make it part of the overlay system: placement against the same occupancy field (it covers 15 tiles at 132 of 135 ticks today), a fixed home in the toolbar row on desktop, below popups in z | none |
| P-19 Tint | the dusk/dawn feel | Drive it by the module's `phase` (one formula fewer) and ease at 3-4 s rather than 8 s so it follows seeks | clock Modelled |
| P-31 Onboarding | archetypes, 5-step tour, shortcuts | Copy: tiles are bars, not dots; stage the steps over a real scrim that leaves the subject lit (the jump to tick 28 happens behind an 85 % dim while two cards pop up) | none |

### 5.4 Anchoring: how a card points

Subjects, in order: the unit tiles listed by the row that have a tile at the tick (the app's carry-forward rule); for a regiment with no tile its parent brigade's tile, shown as such (**Modelled**, the same rule the MON glow uses); the vignette's `trigger_lat/lng` as a dashed ring labelled "approximate place" (its distance to the real tiles is up to 1.9 km); otherwise no anchor and the card goes to the lane. Draw: a 1.6 px hairline in the significance colour from the card edge to the nearest point of the tile polygon, a 3.5 px end dot, a polygon outline on the tile (not a circle: tiles are 120 px bars), the primary subject at full strength and up to two more at 50 %. The line is recomputed from `map.project` on every frame, so it stays glued through flights and drags. The camera is told about the subject (padding, framing) rather than asked to guess.

### 5.5 Avoiding tiles: forms, solver, lane

- **Give the camera the dock** (`map.setPadding({bottom: dock + lane})` at landing and on resize): the single cheapest change, 13 % of the units back at the default view.
- **A ladder of forms per popup**: event 340 / 400 / 460 px at natural height, then a one-line chip; story 340 px with 3 lines, 300 px with 2, then a chip; command change 300 then 220 px chip. The solver walks the ladder and takes the first form that has tile-free ground (grid of 8 px cells over tiles, labels, dots and the persistent overlays, a summed-area table, nearest fit to the anchor, 8 px clear gap). Cost in the prototype: under 0.5 ms of JavaScript per placement; the occupancy grid is the expensive part (about 3 ms, because the prototype collects overlay rectangles from the DOM; a renderer that publishes its tile frame avoids that).
- **Hysteresis.** A card keeps its place while it still fits within 1.35 x the best distance + 60 px, so it does not hop with every tick; when it must move it cross-fades to the new place (160 ms out, 220 ms in) and never glides across tiles.
- **Expansion never overlays.** Reading the full story or the unit panel opens a docked rail and the map container **resizes** (250 ms, camera padding), so the long text can never lie on a tile. On the phone the same rule is the sheet.
- The Roster, OOB and the tour drawer follow the same rule (they are 39 %, full-screen and 36.6 % of the map today).

### 5.6 Queue, priority, dwell, dismissal, recall

| tier | rows | form | life (wall clock) | at 4x | at 8x and 16x |
|---|---|---|---|---|---|
| A | 45 critical events + 24 stories | card with leader and ring | reading budget, 3-12 s | card | chip |
| B | 73 high events | shorter card | 2.2-8 s | chip | Chronicle only |
| C | 16 medium events + 42 command changes | chip in the lane | 2.5-4.5 s | chip | Chronicle only |

At most one A card, one B card and three chips are alive; a newer card of the same tier replaces the older (which becomes a chip), a chip never evicts a card. Coincident rows merge: tick 550's four command changes are one chip with a count. The **Chronicle** is a collapsed strip above the dock ("12 events since 8:15 AM") that lists every row that has passed, keyboard-steppable, each entry reopening its card and its tick; it is the answer to "what did I just miss?" at 1x, where an event comes every 2.5 s on average. Dismissal: Esc closes one layer per press, the focus returns; "Dismiss all" stays; a dismissed card returns from the Chronicle and after a seek.

**Why a queue alone cannot do it (Computed, 3.1).** The tier A cards alone need 13.5 minutes of reading in a show that lasts 5.6 minutes at 1x; the critical events are a median 1.5 s apart. Any rule that lets a card live for its reading time lets the next ones arrive on top of it. The prototype, restricted to one event card at a time, kept critical event cards on screen for a median 1.0 s (0.5-8.2 s) at 1x: better than the half second of today, still not the 8 s needed. Three honest options remain: stack up to three tier A cards (the placement ladder has the room), send everything else to the Chronicle, or slow the show while a critical card is read (Narrated, below). The owner chooses (D-1, D-2).

An optional **Narrated** mode (owner decision D-1, section 6.5): when a tier A card enters, the playback speed eases to 0.25x for the card's reading budget and eases back; the tiles keep gliding, nothing freezes. It is the one mode in which a critical card can be read without pausing; it is off by default at 4x and above.

### 5.7 Phone

The phone has 608 px of map and 374 px cards: no free ground exists (3.7), so the card becomes part of the layout. A **44 px lane** between the map zone and the dock carries the current chip (significance colour, one line, a count when others wait); a tap opens a **sheet with three detents** (peek 120 px, half, full) that holds the story, the event, the unit (the same sections as the desktop panel) or the Monuments card; opening it sets the camera padding to the sheet height so the subject stays in the free top region, and the leader line runs from the lane chip up to the tile. One sheet at a time, replace not stack, the existing `gtStk` expand/collapse logic and the "unit popup hides the stack" rule kept. Toasts never stack on the phone (a chip in the lane with a counter). Landscape: a right rail of 320 px instead of the lane. 44 px targets and the safe-area insets stay.

### 5.8 Typography, hierarchy, colour

Minimum 13 px for reading text (today 11-13), 11 px for captions (today 9-10 in toasts, minimap, legend, HUD), line-height 1.5, titles in Georgia 16-20 px, the significance word in 10 px letter-spaced capitals with the shape cue (star, dot, diamond) repeated on the scrubber dots and the chips so colour is never the only cue; secondary text at `#9aa0ad` or lighter (the earlier audit measured `#555` on these panels at 2.64:1). A card has three levels: the signal (significance, clock), the line (the sentence or title), the detail (narrative, location, source). Numbers in the unit panel use tabular figures and thousands separators ("1,800 men", not "1800 men").

### 5.9 Evidence chips (the site's vocabulary)

A chip is a promise, so it is data-driven. **Modelled** on every clock the module prints with "about" (candidate anchors); **Documented · Pfanz, First Day, p. 65** on the 42 command-change rows that carry a per-row `source`; **Modelled** on a position inferred from a parent brigade; **Computed** on distances and read times; **Unknown** where a row has no tile and no place. The 134 event rows and 24 stories carry file-level source lists only, so they get a "Sources" link to the list and no "Documented" chip until the data grow per-row provenance. Production notes (`flag`) are never rendered.

### 5.10 What the prototype shows, and what it does not

The prototype (`docs/pitch/anim/popups-lab/proto.js`, about 300 lines) is injected into the running R1c page. It hides the app's own event, story and toast layers with CSS and draws its own from the same data: the event sentence in full, the story title with three lines and "Read the full story", command changes as chips, a clock chip from the candidate clock ("July 1, about 10:15 AM · Modelled"), a leader line and a polygon outline on the tile (drawn on a canvas, not in the DOM), placement by the ladder of 5.5, a priority queue with reading-time dwell, seek hygiene. Screenshots: `before-after-tick28.png` and `before-after-tick553.png` (the app and the prototype side by side), `d50`-`d53` (desktop), `p50`-`p51` (phone lane).

The same 837 snapshots as 3.2 (155 popup ticks x 3 zooms, default and follow camera; the follow camera skips the ticks whose popup has no subject on screen), with the prototype's cards instead of the app's:

| camera, zoom | snapshots | cards per snapshot | tiles under a card (max) | labels under a card (max) | subject tiles covered / total | card pairs overlapping | cards on persistent overlays | snapshots with a card that found no room | event cards full / fallen to a chip | placement ms p50 / p95 |
|---|---|---|---|---|---|---|---|---|---|---|
| default, 12 | 155 | 1.56 | 0 | 0 | 0 / 304 | 0 | 0 | 0 | 272 / 0 | 0.1 / 0.2 |
| default, 13.5 | 155 | 1.64 | 0 | 0 | 0 / 259 | 0 | 0 | 0 | 252 / 46 | 0 / 0.2 |
| default, 15.5 | 155 | 1.64 | 0 | 0 | 0 / 32 | 0 | 0 | 0 | 298 / 0 | 0.1 / 0.2 |
| follow, 12 | 124 | 1.54 | 0 | 0 | 0 / 299 | 0 | 0 | 0 | 210 / 0 | 0.1 / 0.2 |
| follow, 13.5 | 124 | 1.54 | 0 | 0 | 0 / 295 | 0 | 0 | 0 | 160 / 50 | 0.1 / 0.1 |
| follow, 15.5 | 124 | 1.54 | 0 | 0 | 0 / 235 | 0 | 0 | 0 | 210 / 0 | 0.1 / 0.2 |

Result on desktop: **no tile, no label and no subject tile lies under any prototype card in any snapshot; no two cards overlap; no card lies on a persistent overlay.** The ladder makes it possible: at the default zoom (13.5, both cameras) the event card falls to a one-line chip in 96 of 508 placements (the crowded moments; none at zoom 12 and 15.5), and the story peek always fits. Every popup stays on screen with its text; the chip is the same sentence, shortened for the row and complete on expansion.

Phone (390 x 844), the same prototype with every form 358 px wide and free-standing cards (no lane):

| camera, zoom | snapshots | cards placed per snapshot (desktop 1.5-1.6) | tiles under a card (max) | subject tiles covered / total | snapshots in which a card found no room |
|---|---|---|---|---|---|
| default, 12 | 155 | 0.3 | 0 | 0 / 295 | 130 |
| default, 13 | 155 | 0.43 | 0 | 0 / 218 | 114 |
| default, 15 | 155 | 1.34 | 0 | 0 / 28 | 37 |
| follow, 12 | 124 | 0.65 | 0 | 0 / 297 | 68 |
| follow, 13 | 124 | 0.65 | 0 | 0 / 289 | 75 |
| follow, 15 | 124 | 1.19 | 0 | 0 / 213 | 34 |

No tile is covered, but on the phone at least one card cannot be placed at all in 114 of 155 default snapshots at zoom 13 (130 at zoom 12): there is no free ground. With the lane (`p50`, `p51`) the prototype shrinks the map container to end above a 44 px lane that shows the highest-priority card as a chip with a counter; no tile can lie under the lane by construction, the leader line runs from the lane up to the subject tile, and the mini legend and the minimap would move up with the map. Over the same snapshots the laned prototype placed its card in every one (837 snapshots; snapshots with a card that found no room: 0; most tiles under the lane: 0). The lane overlaps the app's own mini legend and minimap in every snapshot, because the injection leaves them where the app puts them; in a build they move up with the map.

**While the animation plays (real playback, Day 2).**
- **1x** (ticks 254-330, 200 samples, one every ~100 ms): 4 samples (2.0 %) had a tile under a card, at most 1 tile(s) (a sample can land between two solves while the tiles move); 24 card relocations; wall-clock life of the cards: event:B: 1 cards, 0.5-0.5 s (median 0.5 s); event:A: 16 cards, 0.5-8.1 s (median 1.0 s); story:A: 5 cards, 1.0-12.0 s (median 5.5 s); chip: 18 cards, 1.0-3.6 s (median 3.5 s).
- **4x** (ticks 254-420, 105 samples, one every ~100 ms): 13 samples (12.4 %) had a tile under a card, at most 11 tile(s) (a sample can land between two solves while the tiles move); 63 card relocations; wall-clock life of the cards: event:B: 1 cards, 0.5-0.5 s (median 0.5 s); event:A: 17 cards, 0.1-4.3 s (median 0.3 s); story:A: 5 cards, 0.3-3.2 s (median 1.4 s); chip: 19 cards, 0.9-3.6 s (median 3.5 s).
- Reading: at 1x the prototype keeps tiles clear in nearly every sample; at 4x tiles move eight ticks a second and the prototype's 66 ms solve interval is too slow, so a card briefly lies on a tile in about one sample in eight (12 %, up to 11 tiles). The production solver has to run in the tile renderer's own frame (it then sees the positions the tiles are drawn at), and a card must move only by cross-fade, never across tiles.
- Cost of the prototype's own work (JavaScript, on a shared and loaded machine): occupancy grid 3 ms median per solve (it collects overlay rectangles from the DOM; a renderer that publishes its tile frame removes most of it), placement 0 ms, drawing the outlines and leader lines 0.3 ms per frame, at most one solve every 66 ms while playing. Paired runs of the same 76 ticks (the sampling harness off), 60 Hz: frame interval p95 22 ms with the prototype against 18.6 ms without it, and 43 of 2265 frames (1.9 %) over 25 ms against 15 of 2274 (0.7 %): a small real cost on this software-rendered, shared machine and not a performance proof; the target for a build is under 1 ms per frame.

What it does not show: the Chronicle, Narrated mode, the demotion of a replaced card to a chip (it simply expires, which is why the critical event cards above live only about a second at 1x), the docked rail (the map container resizing), accessibility, the signed clock anchors, or the cost inside a real renderer.

## 6. The Overlay Director: a system that can be tuned and added to

The owner's brief asks for a system "we can consistently improve and tweak and even add things" to, not a one-off. The popups are the part of the show that changes most (a new event type, a new tour, a new evidence chip), so the system is a registry plus tokens plus a solver plus a test rig, small enough to read in an afternoon.

### 6.1 Parts

```
overlay-director/                      (one module in the app bundle; same store, same frame)
  tokens.js        every number that sets look, motion, timing, forms, tiers   <- the tweak surface
  registry.js      one entry per popup type ("channel"), declarative            <- the add-a-popup surface
  scheduler.js     tiers, queue, coalescing, dwell, jump hygiene, Chronicle
  placement.js     occupancy grid + summed-area table + form ladder + hysteresis
  leaders.js       tile outline, hairline, end dot, dashed place ring, off-screen arrow, drawn in the tile renderer's own canvas pass (no DOM work per frame)
  evidence.js      chips from data (never typed): Documented / Measured / Computed / Modelled / Contested / Unknown
  a11y.js          polite live region (<= 1 message / 2 s), key map (N P Enter Esc), focus return
  adapters/        data -> channel input: chronology, vignettes, successions, tour, monuments, unit
  tests/           the measurement rig of this study as CI (6.4)
```

It consumes four interfaces from the other tracks and defines none of their internals: **tile frame** (per animation frame: `[{unitId, polygon, labelRect, dotRect}]` and `pulse(unitId, ms)`; the renderer owns it), **camera** (`frame(subjectRects, safeRect)` and `padding`; the camera director owns it), **clock** (`GTBGTime.f(tick, style)`, `approx`), **motion tokens** (shared with the tile and camera tracks).

### 6.2 A channel is twenty lines

```js
registry.add({
  id: 'event',
  source: (tick) => chronology.byTick[tick] ?? [],            // trigger: the tick reached it
  tier: (row) => row.significance === 'critical' ? 'A' : 'B', // queue class
  subjects: (row) => row.units_involved,                      // tiles to point at; falls back to the parent brigade, then place, then none
  forms: [{ w: 340 }, { w: 400 }, { w: 460 }, { chip: 300 }], // the ladder, widest-readable first
  content: (row, ctx) => ({
    signal: [row.significance, ctx.clock(row.tick)],          // clock from the module, never row.time
    line: row.event,                                          // the sentence is never cut
    detail: row.narrative,                                    // opens on demand
    chips: ctx.evidence.forRow(row),                          // only what the row can back
  }),
  dwell: (c) => readingBudget(c.words, TOKENS.dwell.tierA),   // wall-clock
  dismiss: { persist: 'session', recall: 'chronicle' },
  a11y: { live: 'polite', role: 'status', key: 'N' },
});
```

A new popup (say "casualty milestone: a regiment passes 50 % losses") is one more `registry.add` and a data adapter; it inherits placement, leader, queue, dwell, evidence, motion, live announcement and the tests with it. Retuning the look is an edit of `tokens.js` (the prototype exposes it live at `window.__proto.tokens`).

### 6.3 Tokens (the first set; values are proposals, all measurable)

| group | token | value | why |
|---|---|---|---|
| grid | cell / clear gap | 8 px / 8 px (the free-space study of 3.2 used 6 px) | placement resolution; breathing room around tiles |
| forms | event | 340, 400, 460 px natural height, then chip 300 x 44 | tile-free ground exists for the chip in every measured desktop snapshot (3.2); the phone uses the lane |
| forms | story | 340 (3 lines), 300 (2 lines), chip | same |
| forms | max height | 235 px | taller text goes to the rail |
| dwell | tier A / B / chip | 3-12 s / 2.2-8 s / 2.5-4.5 s | reading budget `words x 252 ms + 1.5 s`, clamped |
| queue | alive at once | 1 A, 1 B, 3 chips | median gap between events is 1 s at 1x |
| motion | enter / exit / relocate | 220 / 160 / cross-fade (160 + 220) ms | one easing `cubic-bezier(.2,.8,.2,1)`; reduced motion 120 ms opacity |
| leader | width / dot / draw | 1.6 px / 3.5 px / 240 ms | |
| type | reading / caption / title | 13 / 11 / 16-20 px | today 11-13 / 9-10 / 14 |
| tiers by speed | cards at <= 2x, 4x, >= 8x | A+B, A, chips | events per minute: 24 at 1x, 95 at 4x |

### 6.4 The test rig is part of the system

The measurement tools of this study (`docs/pitch/anim/popups-lab/`) become the director's regression suite, because "never obscure a tile" is a property of every tick, not a screenshot:

| test | pass condition (all 155 popup ticks, 3 zooms, default and follow camera, desktop and phone) |
|---|---|
| coverage | tiles, labels and dots under any director card: 0; subject tiles under any overlay: 0 |
| overlap | director cards over persistent overlays or each other: 0 |
| dwell | with Narrated on, every tier A card is on screen for at least min(its reading budget, 12 s); with it off, a tier A card is on screen at least 2.5 s (a newer tier A card turns it into a chip); no card is on screen for less than 33 ms at any speed (a chip instead); the Chronicle holds 134 + 24 + 42 rows |
| flood | after any seek, 0 toasts for skipped ticks |
| clock | every clock string a popup prints equals the module's output for that tick |
| motion | every popup transition uses a token; reduced motion: no transform, no pulse |
| a11y | axe clean; one live message per 2 s at most; Esc closes one layer per press and returns focus |
| perf | layout pass p95 under 1 ms on the dev machine; no long task at mount; p95 frame interval no worse than without the director |

### 6.5 Decisions the owner must make

- **D-1 Narrated mode**: ease playback to 0.25x while a critical card is read (default off, or on at 1x only)? Reading the tier A cards takes 13.5 min against a 5.6 min show at 1x (3.1); without Narrated mode a critical card can only be read by pausing, or later from the Chronicle. It changes the feel of the show; the rest of this plan does not depend on it.
- **D-2 Peek or full card as the default at 1x on desktop**: the peek (340 px, three lines for stories) is what keeps tiles clear; the full text then lives in the docked rail.
- **D-3 The clock printed on cards**: the module's "about 10:15 AM" with a Modelled chip, or no clock on cards at all (the toolbar is the one place). The data's own `time` strings cannot stay (3.4).
- **D-4 "NPS Auto Tour"**: keep the name with a caveat line, rename ("Gettysburg Auto Tour"), or re-key the 16 stops to the NPS list.
- **D-5 fps text**: behind a performance preference, or removed (it is a debug element today).
- **D-6 Dead popups**: the cross-out card, hover tooltip and monuments tooltip are revived as in 5.3 (the owner's rule is never remove).

### 6.6 Where it plugs into the other tracks

- **Layout track (`06-layout.md`, the certified collision-free layout)**: its tiles are chips, labels, pins and leader lines, and some units live inside aggregate chips. The director's occupancy field must use exactly those (a card never covers a chip, a label, a pin or a displaced tile's leader line), a subject that sits inside an aggregate is anchored to the aggregate chip (ring on the chip, leader to its edge; a displaced tile is pointed at where it is drawn, not at its true position), and the frame it reads must be the frame being drawn: if the layout solve runs in a worker (06 proposes it for cold solves), its result must carry a frame id and the director must refuse to place a card against a frame older than the camera (my 4x playback sample, section 5.10, shows what a stale tile frame costs). The owner's own rule (no split that raises the error risk) points the same way: keep the solve and the director on one thread, or tag every result with its frame.
- **Tile track**: publish the tile frame and a `pulse`; adopt the motion tokens; repaint on paused camera moves on the phone (3.7); make the legend a function of the same colour table.
- **Camera track**: dock/lane padding; `frame(subject, safeRect)` for tour stops, story jumps and Monuments jumps; flights end before the card enters.
- **Clock track**: the module is the only source; the candidate anchors ship as Modelled until signed.
- **Data track**: strip internal ids from the 6 event sentences; `units_featured` to names; per-row provenance on events and stories if the owner wants Documented chips there; keep `flag` out of every build artefact a popup reads.

### 6.7 Order of work (effort in the site's tiers: S days to about 2 weeks, M 2 to 6 weeks)

| step | what | effort | depends on |
|---|---|---|---|
| 1 | Quick, safe fixes with no design: give the camera the dock as padding; seek hygiene for toasts (compare against the tick when the toast loop last ran *or* the last seek, not only the last playing tick); define the `slideIn` keyframe; correct the 9 toast titles by a typed `kind`; strip the 6 internal ids from event sentences at build time; generate legend swatches from the tile colour table; label the "Size" tab truthfully; hide the fps text; phone minimap with carry-forward; repaint the phone canvas on `move`; drop the dead NPS video link | S | none |
| 2 | Overlay Director core on the desktop: tokens, registry with the event, story and toast channels, placement ladder, leader layer, dwell and tiers, jump hygiene, evidence chips, live region | M | the tile frame interface from the tile track |
| 3 | Docked rail (map container resize) for the long story, the unit panel and the tour; tour and story flights with padding | M | step 2 and the camera track |
| 4 | Phone lane and sheet (replaces the story stack, toasts and unit popup positions) | M | step 2 |
| 5 | Chronicle strip, Narrated mode (D-1), scrubber chips | S-M | step 2 |
| 6 | Revive the dead popups (cross-out on the tile, hover tooltip, monuments card in the director) | S each | steps 2 and 4 |
| 7 | The rig as CI (it runs today; wiring only) | S | step 2 |

Step 1 changes behaviour only where it is wrong today and can ship on its own; steps 2-7 are the pitch.

### 6.8 My pitch line for the popups (for the merge)

**"Captions that know where they are."** Every card the owner loves stays, and every one is tied by a thin line to the soldiers it is about, never lies on a tile (checked on all 155 popup ticks in the prototype), stays for the time it takes to read, speaks with one clock, and comes from one small system whose every number can be tuned. The measured gap it closes: today a critical event is on screen for half a second at normal speed and lies on a tile it concerns in 24 % of the moments; with the Director it stays for its reading time and lies on none.

## 7. What is not verified, and the limits

- **Rendering environment.** Headless Chrome with software GL on a shared Windows machine (other agents were running heavy jobs during the later runs). Frame-interval numbers are a lower bound on what a real GPU does and are noisy under that load; no real phone, no Safari, no Firefox. The dwell numbers (3.1) do not depend on rendering speed except that a slow device would skip ticks at 8x and 16x, which a 60 fps run cannot show.
- **Tile imagery** was blocked after boot for every geometry run (it moves no unit and no popup). The screenshots show real imagery from the first 52-183 tile requests of each session.
- **Reading speed.** 238 wpm comes from a summary of Brysbaert (2019) at the BPS Research Digest; the paper itself was not opened. The site's own "~N min read" uses 200 wpm.
- **The candidate clock** is unsigned ("CANDIDATE (proposed, unreviewed anchors)"); every figure that uses it is Modelled and says nothing about the historical time of any event. The owner's decision of 2026-10-05 (correct the clock now) is the reason the popups must consume the module; its final anchors may differ.
- **Coverage is geometric.** Tiles are the rotated bars the canvas draws (a hook on the 2D context), not the future tile design; the other tracks will change tile shapes and sizes, and the numbers in 3.2 and 3.7 must be re-run on that renderer (the rig does it: 155 ticks x 3 zooms x 2 cameras takes about 3 minutes). Free-space results depend on the obstacle set (tiles, labels, dots, persistent overlays at their default places; the Extra Features cluster and the unit panel excluded) and on a 6 px grid.
- **The popups' own subjects** use the app's carry-forward rule (latest keyframe at or before the tick). A unit that has no keyframe at all has no tile and is counted as having none.
- **Production** was read in one screenshot and by diffing the popup functions; the numbers in section 3 are R1c's. The two differ where 1 says (the production story card is 700 px tall at the right edge and covers the zoom buttons; its HUD badge printed "July 3, 1863" at tick 28 in the screenshot, the +2 date bug fixed in R1c).
- **NPS.** The NPS pages were read through two `curl` requests and one search; the search results gave titles and URLs, not the pages' text. The claim that the NPS numbers Oak Ridge as Tour Stop #3 rests on the title of an NPS media page returned by the search.
- **Not done.** No keyboard or screen-reader walk-through (the a11y statements come from the DOM and the code); the Walkthrough (P-34) was inventoried only; the Soldier's Eye, OOB, Ancestor, Bookmarks and Help dialogs were screenshotted but not tested beyond opening and closing.
- **The prototype** is research code: it reads the tile rectangles from the capture hook, hides the app's own cards with CSS while it runs, is not accessible, does not implement the Chronicle, the rail, Narrated mode or the demotion of a replaced card to a chip, shows the phone lane only as a single chip with a counter (no sheet), and was run at three zooms and two cameras on desktop and, for the phone, as free-standing cards and as the lane. Its numbers show the placement idea works on the real data; they are not a promise about a finished build.

## 8. Reproduce

```
node tmp/pitch-anim/popups/<script>        # or docs/pitch/anim/popups-lab/<script> (paths rewritten)
  cover.mjs R1c        3.2   coverage of tiles by the app's popups   (PHONE=1 for the phone)
  free.mjs R1c         3.2   free-space ladder                        (PHONE=1)
  timing.mjs R1c       3.1   dwell at 1, 2, 4, 8, 16x               (analyze-timing.mjs)
  behaviour.mjs R1c    3.5   dismissal, flood, Esc, a11y, z-order
  clocks.mjs           3.4   clock labels vs the candidate clock
  anchors.mjs          3.3   what the popups point at
  data-stats.mjs / legend-check.mjs / dayplayback.mjs / hops.mjs / pillcover.mjs / tint.mjs / hud-fps.mjs
  phone-repaint.mjs / phone-pinch.mjs / phone-mini.mjs     3.7   the phone canvas and minimap
  proto.js + proto-cover.mjs / proto-play.mjs / proto-test.mjs     5.10   the prototype and its tests
```
Environment: `T0_AGENT=pitch-anim/popups T0_PORT_BASE=9520` (set inside `h.mjs`), `PORT_OFF` shifts the static-server ports when two runs overlap. Screenshots: `docs/pitch/anim/shots/popups/` (`d` desktop, `p` phone, `d5x`/`p5x` prototype). Raw results: `docs/pitch/anim/data/02-popups/*.json`.


## 9. Screenshot index (`docs/pitch/anim/shots/popups/`)

Every file was looked at. Desktop is 1440 x 900, phone 390 x 844 at 2x unless noted; all R1c unless the name says otherwise.

| file | shows |
|---|---|
| `d01-rest-tick1.png` | first screen after onboarding: legend open by default, minimap, HUD, Extra Features at right-middle |
| `d02-cards-tick12.png`, `d02-cards-tick28.png` | story + event card; tick 28: toolbar 8:15 AM, card 7:20am, story "10:15am"; Extra Features over the McPherson Ridge tiles |
| `d03-cards-tick553.png`, `d04-cards-tick556.png` | two stories (pager 1/2) + event at the Angle; the event card covers the centre of the Pickett's Charge units |
| `d05-toasts-playing-tick550.png` | four stale toasts after the first Play; the Extra Features pill overprints the second toast |
| `d06-unit-panel-ironbrigade-t28.png` | unit panel over the legend; toasts over the story card's jump and close buttons; the pill over the story text |
| `d07-legend-sides.png`, `d07-legend-size.png` | legend tabs: "Dot radius scales with unit strength" |
| `d08-tour-stop1.png`, `d08b-tour-stop1-video.png`, `d08c-tour-stop5.png` | the NPS drawer; the video box showing the NPS "not available" page; Little Round Top under the drawer |
| `d09`-`d17` | search, filter, layers, distance tool, roster (39 % of the map), help, bookmarks, ancestor, soldier's eye |
| `d18-monuments-btn-r1c-nothing.png` | Monuments toggled in R1c: nothing is drawn; the pill at bottom-left |
| `d20-onboarding-*.png` | first-run dialogs; step 3 jumps to tick 28 behind the 85 % dim while the cards pop up |
| `d21-crop-...`, `d22-extra-features-menu-open.png`, `d23-crop-...` | crops; the open menu covers the Play button |
| `d24-production-layout-chooser.png`, `d25-production-build-tick28.png` | production build: the chooser at every load; the 700 px story card over the zoom buttons, HUD "July 3, 1863" at tick 28, the pill over the story text |
| `d30`-`d33` | MON layer, Browse list, the Reynolds card, and the screen after Jump (cards of tick 52) |
| `d40-boot-*.png` | boot splash and loading layer (network throttled to 1.6 Mbit/s for the capture) |
| `chart-dwell-vs-reading.png` | on-screen time of an event card, a story summary and a toast at 1x, 4x and 16x against their reading time (3.1) |
| `before-after-tick28.png`, `before-after-tick553.png` | the app today (R1c) and the prototype side by side, same tick, same camera (made from `d02`/`d03` and `d50`/`d51`) |
| `d50`-`d53` | **prototype**: ticks 28, 553, 267 at zoom 13.5 and 302 at 15.5: peek cards, chips, leader lines, tile outlines, "about ... Modelled" clock chips; `d52` shows the arrow for a subject that the default camera leaves under the dock |
| `p01`-`p08` | phone: rest, story stack (55 % of the map zone), toasts (about 95 %), unit popup, Tools sheet, landscape, onboarding |
| `p09-phone-after-pinch-and-drag-paused.png`, `p09-phone-paused-zoom-stale-canvas.png` | the phone unit canvas after a real pinch and drag, and after `jumpTo`, while paused: the tiles did not move with the map |
| `p30`, `p30b`, `p31` | MON on the phone: layer, Browse sheet, Armistead sheet |
| `p50`, `p51` | **prototype on the phone** with the lane: the map ends above a 44 px lane that shows the top card as a chip with a counter and a leader line up to the tile (the mini legend and minimap still sit where the app puts them, partly under the lane in this injection) |

