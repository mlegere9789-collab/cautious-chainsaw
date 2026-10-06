# 07 Independent verification of the Battle Studio prototype

Verifier: agent `verify`, 2026-10-06. Object: `docs/pitch/anim/prototype/battle-studio.html` at commit `93ace54` (1,502,479 bytes, sha256 `5f6be41a57d21043...`). Nothing in the prototype, the product or any other agent's files was changed. All my code is in `docs/pitch/anim/07-verify/` (committed), scratch in `tmp/pitch-anim/verify/` (git-ignored). Evidence labels used below are the site's: **Measured** (a command I ran), **Computed** (derived from data by a stated rule), **Documented** (a page or source I read, URL given), **Unknown**.

The owner's rules I tested against: tiles never obscure each other and never hide vital information; the jitter is gone; every popup is kept and improved; every claim shown is true to the data and the sources; the system can be tweaked and extended.

---

## 0. Verdict

The prototype is a real piece of work and its data layer, clock, positions, popup texts and Before reproduction are **correct to the source, to the pixel**. On a **settled** picture it keeps its central promise: in 1,428 settled samples (desktop: all nine skin variants, zoom 11 to 18; phone: three skins, zoom 11 to 17) no two solid tiles overlap, no ink leaves its box, no unit is missing. The jitter of the old renderer is genuinely gone in normal playback: solid sudden jumps fall from 1.2 to 66 per second to 0 to 0.1 per second, the largest one-frame step from 311 to 1,550 px to 15 to 94 px.

**But the absolute promises are not met while the picture moves.** Measured on the page as drawn, in real Chrome, every frame:

| Owner rule | Verdict | Evidence in one line |
|---|---|---|
| Tiles never overlap, at all | **Holds when settled; fails in motion** | solid x solid overlaps in 0 to 0.8 % of playback frames (up to 1.9 px deep); dimmed tiles lie over solid ones in 5 to 41 % of frames (up to 27 px deep) |
| Tiles never hide vital information | **Fails in three ways** | a unit with no tile at all on 0 to 23 % of frames; units shown only by a 0.42-opacity tile in 27 to 100 % of frames; the interface covers 15 to 22 % of the tiles in view (26 to 30 % on the phone) |
| Jitter fixed | **Largely true, with four exceptions** | holds at 60 fps; returns under CPU load (4x slowdown), under reduced motion, after a pause (tiles still move for up to 15 s), and at hard cuts (the tile layer blanks for 3 frames) |
| Everything true to the data | **True for data, clock and text; some UI sentences are not** | 23 of 23 data checks, 11 of 11 clock checks, 263 of 263 unit-card facts; but "Shift steps an hour" is false and 3 cross-out cards say "Command passes" where the data says there is no successor |
| Popups kept and improved | **True** | 12 of 12 present; 11,256 frames at every event and story tick: cards on screen on average 4.8 to 6.4 (max 16), covering no tile |
| Extensible | **Mostly true, with friction** | a new skin took 45 lines, one import and one array entry, and passed the geometry sweep; but it breaks one repo test, escapes another, and a bad token string stops the whole page |

Defects are listed in section 2 with repro commands. The three that matter most for a designer: **V-01** (units vanish for up to 9 frames), **V-02** (dimmed tiles overlap and are hard to read: an opacity rule is not "never obscure"), **V-04** (the toolbar, dock, narration card and Inspector hide a fifth of the tiles).

---

## 1. Method and instruments (and how I checked the instruments)

**What I did not trust.** The prototype's own sweep checks the rectangles the engine says it will draw (`frame.tiles`), with popups switched off and the solve cadence forced to 1. I checked what the page **paints**, with popups on and the default settings.

* **The witness** (`lib.mjs`, injected before the page's scripts): wraps `CanvasRenderingContext2D`, tracks the transform, clip, alpha and path of every call, and records the painted ink box of every paint op per transform epoch (the renderer starts a new epoch with every `setTransform`: one per chip, label and pin). Each epoch is matched to a tile by its transform origin, which proves the painted position equals the one the engine reports. `recorder.js` then judges each frame with brute-force code that shares nothing with the engine: chip x chip, label x chip, label x pin, chip x pin, label x label (different tiles), at three opacity classes (solid x solid, both >= 0.5; solid x dim, one in [0.05, 0.5); dim x dim), ink outside the declared box, units missing or early (my own rule: a unit is on the field from the tick of its first keyframe), DOM overlays on chips, and per-frame steps of every tile.
* **Negative control.** The same harness on the Before view: **100 % of frames** have overlapping solid items in all 10 runs (deepest 25 to 80 px). A blind instrument would say zero.
* **Completeness.** For each settled sample and for 240 frames in motion the frame is drawn twice, once with the skin's tile, label and pin drawing switched off; every pixel that differs lies inside a recorded ink box: **0 unexplained pixels in 1,428 settled samples and 240 motion frames**. So box-disjoint means pixel-disjoint.
* **Own source reader** (`srcdata.mjs`): load order from the shipped bundle's own `tF`/`nF` arrays by regex, last row of a repeated `(unit, tick)` wins; the order of battle by a recursive scan of the raw files; my own Web-Mercator; the shipped `y1`/`F4`/`lS`/`Ed` run in a vm (cut out of `baseline/dist/assets/index-Cg8FAMXN.js` by text markers).
* **Where timing matters** (frame cadence, jitter per second) I ran **without** the witness (`v4-motion.mjs`: one `renderer.draw` wrapper and my own `requestAnimationFrame` loop); the witness runs are for geometry, their fps is lower.
* **Environment.** Chrome 155.0.0.0 headless (Playwright 1.63, system Chrome) on Windows 11, Intel Arc Pro 140T + NVIDIA RTX PRO 1000 laptop GPUs, 16 logical cores, one machine. Node 24.19. Desktop 1440x900 at DPR 1; phone emulation 390x844 at DPR 2 (not a handset). Ports 9700 to 9733 on 127.0.0.1; all browsers and servers were stopped at the end.
* **Errors I made and corrected** (so you can weigh the rest): my first chord metric measured the wrong thing (distance to the linear-in-time point instead of to the chord; corrected, see 3.3); my first clock check expected the current tick on an event card (corrected: the card shows its event's tick); a first "never idle after pause" finding was an artifact of my having switched popups off (see V-13); a first contrast reading counted decorative duplicate text passes (corrected by grouping).

---

## 2. Defects, ranked

Severity: **High** = breaks an owner "must" in normal use; **Medium** = visible quality problem or a claim the data does not support; **Low** = wording, friction, edge case. Counts are from the files in `07-verify/results/`; tables are in `results/tables.md`.

### V-01 [High] A unit on the field has no tile at all for 1 to 9 frames

Deterministic, 60 Hz, 1,200 frames per run (`v3b-gaps.mjs`). A unit is on the field when `tau >= its first keyframe tick` (the engine's own `visibleAt` agrees on every frame: 0 disagreements). On each frame I collect the units inside **any** tile (live or dying, opacity above 0.02). A unit in none is invisible.

| scene | 1x | 4x | 16x |
|---|---|---|---|
| Cemetery Hill | 1.3 % of frames | 3.7 % | 8.5 % |
| Rose Woods | 6.8 % | 6.4 % | 10.3 % |
| The Angle | 6.7 % | 5.8 % | 2.7 % |
| opening scene (tick 1) | 5.1 % | 10.3 % | 23.1 % |
| evening of day 1 | 2.2 % | 6.7 % | 15.4 % |
| default scene | 4.7 % | 3.9 % | 2.6 % |
| whole field | 0 % | 0 % | 0.4 % |

Episodes last a median 1 frame, p95 5 to 8, longest 9 frames (150 ms); up to **29 units are absent at the same moment**. Example trace (The Angle, 4x, war-room, 60 Hz): unit `U-5MI`, first keyframe tick 283, its fading tile goes 0.98, 0.94, 0.87, **absent for three frames**, then reappears at 0.45 and fades on; the aggregate that takes over appears (at 0.02) a frame after the old tile comes back.
Cause (partly): `scene/display.mjs` `_verifyAndRepair` sets `d.opacity = 0` for a dying tile that overlaps something, and the tile returns at its natural fade value a few frames later. Switching the safety net off (`motion.safetyNet=false`) cuts unit-frames without a tile by **25 to 60 %** (98 to 58, 178 to 133, 155 to 112, 298 to 188) but does not remove them, and solid overlaps rise (3 to 25, 2 to 30, 6 to 55, 9 to 57 frames per run). So the net is a contributor, not the only cause (`v3b2-net-off.mjs`).
Claim contradicted: "every unit on the field is represented by exactly one live tile" (README section 3, guarantee 2) and "0 unrepresented unit-frames".
Repro: `node docs/pitch/anim/07-verify/v3b-gaps.mjs` (table and episodes in `results/v3b-gaps.json`), `node docs/pitch/anim/07-verify/v3b2-net-off.mjs` (the net experiment).

### V-02 [High] "No overlap" is a rule about tiles at 50 % opacity or more; dimmed tiles overlap constantly, and a few solid ones touch

Every frame of a 20 s real-time playback, popups on, painted ink (`v3-play.mjs`, results `v3-play-1440x900-after.json`):

| scene | speed | frames | solid x solid overlap frames (deepest) | solid x dim overlap frames (episodes, longest) |
|---|---|---|---|---|
| Cemetery Hill | 1x | 939 | 2 (0.78 px) | 55 (13, 18 fr) |
| Cemetery Hill | 4x | 925 | 7 (1.88 px) | 147 (24, 21 fr) |
| Rose Woods | 1x | 1174 | 3 (1.69 px) | 206 (14, 147 fr) |
| Rose Woods | 4x | 1176 | 7 (1.93 px) | 116 (21, 24 fr) |
| The Angle | 1x | 1113 | 1 (0.29 px) | 328 (18, 174 fr) |
| The Angle | 4x | 1159 | 0 | 234 (17, 66 fr) |
| whole field | 1x | 854 | 1 (0.26 px) | 46 (7, 30 fr) |
| whole field | 4x | 410 | 0 | 84 (12, 25 fr) |
| default | 1x | 1200 | 2 (0.14 px) | 486 (22, 157 fr) |
| default | 4x | 1200 | 0 | 202 (20, 65 fr) |

* **Solid x solid**: 0 to 7 frames per 1,200 (0 to 0.8 %), at most 1.93 px deep. Classes: chip over another tile's true-position pin (the painted pin is 5.8 px, the layout reserves 4 px) and chip over chip (0.1 to 1.2 px) while a tile is being born or is dying (opacity 0.87 to 1). The prototype's guarantee is exact zero; its showcase caption prints "0 overlapping pairs in N frames so far" as **Measured**. On the same showcase run my witness found 19 frames with a solid overlap (3,002 frames of the Studio, deepest 1.9 px) and 3 in the Angle tour.
* **Solid x dim**: 5 to 41 % of frames, deepest 27 px. A dimmed travelling tile (0.42 opacity) crosses neighbours; summed over the ten runs the solid x dim pairs are 1,418 dim chip / solid label, 777 dim chip / solid chip, 275 dim pin / solid chip and 106 dim chip / solid pin. Pictures: `shots/verify/v3-the-angle-after-1x-1.png` (a dimmed "II/1" under "Contact x16", a dimmed "I/3/3" through a place name) and `v3-default-after-4x-2.png`. The README discloses decision D-3 ("a lone tile at 0.42 opacity crossing a neighbour for about 150 ms"). My numbers say how much: not 150 ms and not rare.
* **Solid x dim in the settled sweep: zero** (1,134 desktop + 294 phone samples). Transitions after a hard jump in that sweep: 12,071 of 175,268 settle frames (6.9 %) overlap.
* The owner's wording is "cannot obscure each other at all". Under that wording this is a failure in motion; under the prototype's own definition (opacity >= 0.5) it is a pass except for the 0 to 0.8 %.
Repro: `node docs/pitch/anim/07-verify/v3-play.mjs --scenes=the-angle --modes=after --speeds=1 --secs=20` (all runs: `--scenes=cemetery-hill,rose-woods,the-angle,field,default --modes=after --speeds=1,4 --tag=after`); the Before control: `--modes=before`.

### V-03 [High] A dimmed tile is a tile you cannot read, and units spend seconds that way

Frames with at least one unit in view shown **only** by a tile below 0.5 opacity: 27 to 100 % of frames (up to 67 units at once). Run length per unit (consecutive frames): median 10 to 36 (0.17 to 0.6 s), p95 31 to 219 (0.5 to 3.7 s), longest 626 frames (10 s; whole field at 1x, a unit in a crowded aggregate). Legibility of those tiles (`v8b-dim-contrast.mjs`, background sampled under every string at the moment it is drawn, WCAG ratio, decorative duplicate passes merged): median contrast **3.75:1 in War Room, 2.57:1 in Field Manual, 2.37:1 in 1863 Map**; 291 of 293, 244 of 244 and 327 of 327 strings are below 4.5:1, and 242 of 244 and 327 of 327 of the light-skin strings are below 3:1. So "it stays visible" (06, README) is true of ink and false of legibility.
Repro: `node docs/pitch/anim/07-verify/v8b-dim-contrast.mjs`; unit runs from `v3-play.mjs` (`unitDimOnlyRuns` in its JSON).

### V-04 [High] The interface covers the tiles the layout carefully keeps apart

The layout solves the whole canvas; the toolbar, the dock, the narration card and the Inspector lie on top. Painted chip boxes with at least 2 % of their area under a DOM overlay (`#topbar > *`, `#dock`, `#panel`, `#narration`, `#popups .pc`):

* settled sweep, desktop (camera centred on the densest cluster): 20.7, 20.5, 21.4, 22.2, 16.3, 20.8, 15.4 % of the solid chips in view at zoom 13, 13.5, 14, 15, 16, 17, 18 (zoom 11: 0 %, zoom 12: 0.9 %); phone: 26 % at zoom 13, 30 % at 14. About three quarters of them (78 %) are **half or more hidden**.
* the 60 s showcase (3,002 Studio frames): on average **14.8 of 55 visible chips per frame (27 %) are under the interface, 9.8 (18 %) half or more**; the narration card alone 4.1 chips per frame (fewer in the first steps, 6.0 per frame during the Angle tour), the dock 6.1, the toolbar 4.6.
* **Popup cards cover nothing**: `#popups .pc` never appears as the covering element in any run. At every event and story tick (134 ticks x 3 cameras x 28 frames = 11,256 frames, 4.8 to 6.4 cards on screen on average, up to 16) **0 chip-frames are covered by a card** (`v7c-cards-cover.mjs`). That claim of the prototype is verified.
* **The Inspector** (372 px, opens on the first selection and **stays open after Esc**) lies on the right quarter: of 26 tile centres I clicked with the real mouse at the default view, 13 selected the right unit; the other 13 were under the panel (`v12-input.mjs`, `elementFromPoint` names `#panel` for all 13).
* Picture: `shots/verify/fig-chrome-covers.png` (red outline = at least half under the interface; the tile is under the glass and invisible; 10 of 40 tiles in view, 13 partly).
Cause: `engine.safe` (the chrome insets) is used for scene jumps only; the layout, the camera padding and the tile culling ignore it. Report 02 made the same point about the production dock.
Repro: `node docs/pitch/anim/07-verify/v2-sweep.mjs --styles=war-room --variants=standard` (the `dom` field of each row), `node docs/pitch/anim/07-verify/v3c-showcase.mjs --tour=showcase --secs=75`, `node docs/pitch/anim/07-verify/v12-input.mjs`, `node docs/pitch/anim/07-verify/v7c-cards-cover.mjs`, `node docs/pitch/anim/07-verify/figs.mjs`.

### V-05 [Medium] A hard cut blanks the tile layer

The showcase, the hotspot tours and any scene jump without glide use `seek({glide:false})` plus a camera cut (six of the showcase's ten steps begin with a seek that does not glide). Frame by frame at 60 Hz (`v3d-cut.mjs`, 8 cuts, painted chip ink as a share of the final picture): the share falls to **0.00 to 0.001 in 8 of 8**, stays below 20 % for 8 to 12 frames and below 50 % for 11 to 22 frames, and reaches 90 % after 16 frames in one case and 34 or 35 in the other seven (0.27 and 0.57 s). Strip of frames: `shots/verify/fig-cut-strip.png`. By design (outgoing tiles fade below 0.5, then incoming ones start) the two fades do not overlap, so the middle of the cut is an empty map for about three frames.
Repro: `node docs/pitch/anim/07-verify/v3d-cut.mjs`, `node docs/pitch/anim/07-verify/figs.mjs`.

### V-06 [Medium] A paused picture is not at rest for seconds

Real time, popups on, real Space key (`v3k-after-pause.mjs`): after 8 s of play at 4x and a pause, tiles still moved by more than 5 px **2 to 15 s later in 5 of 5 scenes** (last move over 5 px at 14.75 s at The Angle, with six 250 ms windows after the tenth second containing moves up to 73 px). The README states "pausing a running battle comes to rest" and "0 changes, 0.00 px" over 60 s on four scenes; the node tests allow 3 s. Stateful scan (`v3g-rest-scan.mjs`): of 36 (tick, zoom) samples at the three hotspots reached by seeking 2 ticks from the previous one, **13 were still busy after 700 frames**, with 2 to 5 tiles drifting at 0.24 to 0.29 px per frame and two samples popping 5 px. In a **fresh** page the same scene (The Angle, zoom 14, tick 556) rested for the full 60 s, and zoom 15, tick 556 had one 75-frame episode 15 s in (`v3h-rest-cadence.mjs`; the setting `layout.solveEvery` makes no difference). So the picture at rest depends on how you got there. Once the engine does go idle the page stops drawing (0 frames per 250 ms after 30 s, popups on).
Repro: `node docs/pitch/anim/07-verify/v3k-after-pause.mjs` (real time), `v3g-rest-scan.mjs`, `v3h-rest-cadence.mjs` (manual 60 Hz).

### V-07 [Medium] The jitter fix is load- and mode-dependent

`v4-motion.mjs`, real time, 20 s per row, no witness.

| condition | Studio | Before | what changes |
|---|---|---|---|
| 1x CPU, 1440x900 | 60 fps, p95 16.8 ms in 8 of 10 runs; sudden steps 0.05 to 1.15/s (solid 0 to 0.1); largest step 15 to 94 px | 60 fps; sudden 1.15 to 65.9/s (all solid); largest 311 to 1,550 px | the headline claim holds |
| whole field | 56.2 and 58.1 fps, 6.8 % and 3.2 % of frames over 20 ms | 55 and 57.7 fps, 9.0 % and 3.9 % | both are slow here; not a regression |
| **4x CPU slowdown** | **21.8 to 27.6 fps**, p95 66.7 ms, 84 to 99.5 % of frames over 20 ms; sudden 2.2 to 5.9/s (solid 0.3 to 1.35); largest step 58 to 320 px; opacity flashes 10 to 14 per s | 34.7 to 58.2 fps; sudden 4.5 to 43.7/s | the Studio degrades more than the old renderer under load (README discloses fps, not the jitter) |
| **prefers-reduced-motion** | 54 to 60 fps; solid sudden steps **3.1 to 8.7/s**, steps up to 185 px, opacity flashes 12.7 to 28.9/s | n/a | in reduced mode the glide is off and tiles hop again |
| phone viewport 390x844, DPR 2 | 60 fps; sudden 0.15 to 0.55/s; largest 16 to 124 px | 60 fps; sudden 2.55 to 16.55/s; largest 520 to 534 px | holds |

Repro: `node docs/pitch/anim/07-verify/v4-motion.mjs` (add `--cpu=4`, or `--reduced=1`, or `--viewport=390x844 --dpr=2`).

Also in the Studio (all runs): labels switch on and off 0.75 to 9.3 times per second (5.2 to 9.3 at Rose Woods, The Angle and in the default scene), opacity flashes (a tile changes by more than 0.3 in one frame) 0.2 to 1.55 per second, and tiles that vanish and return within three frames 0 to 0.3 per second (Before: 0 to 2.25).

### V-08 [Medium] Tuning Studio: a bad module id breaks the "import never throws" promise, and design colours are not tunable

`v9-tuning.mjs`. Core round trip passes (section 3.7). Defects:
* Import of `layout.strategy`, `motion.mode` or `interp.model` with an unknown id **throws** (`layout: no module "does-not-exist" (registered: certified, raw, production)`) although the code comment says "never throws on bad data", and the dial is left holding the bogus value in memory while the engine runs the old module. The panel reports "import failed: ...", but `T.get(id)` already returns the bad value.
* Import of an unknown `skin.id` or `backdrop.id` is **applied silently** (`imported 1, rejected 0`): `skin.id = "does-not-exist"` draws every tile as a plain grey box, no side, no name, no strength.
* One default is off its slider grid: `popup.dwell.bMinMs` = 2200 with min 500, step 250: the slider shows 2250 for the stored 2200.
* Of the 177 dials, 155 are labelled `Design` (a label, not evidence), 22 carry real labels; **no skin colour or skin motion token is among them** (`skin.id` and `skin.ageChannel` only). Skin tokens are tunable only through the URL (`?skin=field-manual&skinset={"field-manual":{"color.union":"#ff00ff"}}`: tested, it applies) or the console (`window.__skinKit.setToken`), not in the panel, and they are **not in the exported settings file**, so a designer's colour tweak cannot travel with the other 177 dials.
Repro: `node docs/pitch/anim/07-verify/v9-tuning.mjs`, `v14-skin-routes.mjs`.

### V-09 [Medium] Accessibility

`v8-a11y.mjs` (axe-core 4.13.0, 11 states, WCAG 2.0/2.1/2.2 A and AA plus best practice) and real keyboard use.
* axe: **1 critical**: the Showcase `role=menu` contains `h4` headings (aria-required-children). **2 serious**: the selected speed button, white on `#5b9bf0`, 2.84:1 at 12 px (in 9 of 11 states); the About `.pane` scrolls but has no focusable content. Minor: popup `article role=group` not allowed; moderate: no landmarks around the canvas and menu. (A 1.11:1 reading for the welcome card's primary button appears only in the first state, with colours that look like the card mid-fade; I did not verify that and do not count it.)
* The canvas is the first Tab stop and has **no visible focus indicator** (all 37 other stops have one). Its `aria-label` is live ("tick 551 of 675, July 3, about 3:35 PM on a candidate clock; 451 units shown as 381 tiles"), which is good.
* `role=menu` without arrow-key navigation (ArrowDown does not move focus; Tab does). The popup cards come before the toolbar in the Tab order (up to 10 stops first).
* Canvas text contrast, settled, background sampled per string: War Room: all 178 strings at 6.4:1 or better (median 14.9); Field Manual and 1863 Map: all at least 4.5:1 in the standard and high-contrast variants (minimum 4.61), but **2 strings per colour-blind-safe variant at 3.77 and 4.05:1**; in the light skins the backdrop note "Schematic backdrop ... not terrain. Marks follow the placement frame." (the honesty text) is **3.32:1** at 10 px.
* All documented keys work (Space, arrows, Shift+arrows = 12 ticks, [ ], T, I, A, M, B, W, U, ?, C, N, P).
Repro: `node docs/pitch/anim/07-verify/v8-a11y.mjs` (the axe findings with their selectors are in `results/v8-a11y.json`, `axe`). Reduced motion: no transition or animation over 50 ms in 126 chrome elements; a seek lands at once. Phone: no horizontal scroll, every control at least 24x24 px (18 of 19 under 44 px).

### V-10 [Low] Wording that the data or the clock does not support

* The hint and the key list say **"Shift steps an hour"**. Shift + arrow is 12 ticks, which on the candidate clock is **10 to 386 minutes (median 49; only 15.2 % of positions within 60 +- 10 min; 19.5 % under 30 min, 12.7 % over 2 h)** (`v6b-shift-hour.mjs`, computed from the 33 anchors).
* Cross-out cards are titled **"Command passes"** for all 42 rows. For 3 rows (`CS-005`, `CS-007`, `CS-010`) the row's own successor text is "No clear successor", "No successor" or "No effective successor". `CS-016` names unit `C-CAV`, which resolves to no unit or node, so the raw id is printed.
* The Contested note printed to the viewer quotes a repo document id: "... (03-data-fuel.md, T7)".
* Before-step captions: for about a second after the step starts they quote the previous (Studio) frame ("309 tiles for 451 units"); later "131 tiles for 131 units" counts only the units the old renderer draws inside its window, not the 451 on the field.
* "833 hops of 8 px or more" is the narrow hold-then-jump count (reproduced exactly, section 3.8); all steps of 8 px or more are 1,061 (snap-backs and hand-overs included).
Repro: `v6b-shift-hour.mjs`, `v7b-fifteen.mjs`, `v7-popups.mjs`, `v4e-facts-replay.mjs`; the successions in `results/v1-data.json` and `data/popup-data.json`.

### V-11 [Low] Extension friction

`v10-skin.mjs`, on a copy of the tree in `tmp/pitch-anim/verify/proto-copy/` (the prototype itself untouched).
* The skin I wrote (`ribbon`: side stripe, arm glyph, code, strength gauge, count, selection ring, a generated 10-row legend) is **45 lines as written, longest line 240 columns, 8 lines over 100 columns; 54 lines when hard-wrapped at 100 columns**. The prototype's "50-line skin" (`minimal.mjs`) is 35 lines and 3,566 characters (longest 252), also 54 lines at 100 columns. Both lean on 543 lines of `kit.mjs`, `semantics.mjs`, `glyphs.mjs`.
* Registration is one import and one array entry as claimed; `node build.mjs` succeeded (0.26 s, three timed runs); `checkSkin` passes on 25 tiles; the zero-overlap sweep (7 ticks x 7 zooms, painted ink, pixels) passes with min gap 5 px; the legend lists its channels; a raw 11-line skin object registered at run time through `__studio.kernel.skins.register` also works with no build.
* **Adding the skin makes `test/skins.test.mjs` fail** ("the shell lists the reference skin, three families ... and the minimal skin": a hard-coded list) and the new skin is **not in the conformance tests** (`const MINE = [...FIELD_MANUAL, ...WAR_ROOM, ...MAP_1863, MINIMAL]`).
* My first draft had a token doc string shorter than 6 characters: `node build.mjs` passed and the built page **never started** (stuck on the splash, `pageerror: ribbon: token color.paper needs a doc string`): `shots/verify/v10-bad-skin-boot.png`. No fault isolation at registration.
Repro: `node docs/pitch/anim/07-verify/v10-skin.mjs` from a clean checkout. The script builds its own copy (`tmp/pitch-anim/verify/proto-copy`: the prototype's `src tokens data build.mjs test`, plus the committed skin `docs/pitch/anim/07-verify/skin/ribbon.mjs` and the two registration lines), builds it, and builds a second copy with the short doc string (`battle-studio-BAD.html`). Re-run from a clean state while writing this section: 8 checks pass, 4 fail (the two wrapped-line counts, the repo's skin tests, the bad-skin boot); the four are the findings above, not script errors.

### V-12 [Low] Disabling popups after playing leaves the page redrawing for ever

`popup.enabled` set to false after the battle has played: the five persistent cards stay in phase `in`, `host.busy()` stays true, and the page draws about 60 fps indefinitely (181 frames per 3 s, 14 s after the last action; with popups on, or off from the start, 0 frames). Cost: battery and CPU on a still picture.
Repro: `node docs/pitch/anim/07-verify/v13-popups-off.mjs`.

### V-13 [Info] Smaller facts

* Over HTTP the browser requests `/favicon.ico` (404) because no icon is declared; opened from `file://` with the network blocked the page makes **1 request (itself)**, 0 failed, 0 console errors, also after playing, opening every panel and running the showcase for 12 s. The statement "no network request of any kind" is true for the file, not for a server.
* The Before view's bar positions are **not** the shipped relaxation's: unit by unit only 36 % are within 0.5 px, median 3.2 px, p95 61 px, max 129 px (the iteration order is reconstructed). Aggregates agree within 4 %: hops per second 7.5 vs 7.55, 73.0 vs 71.6, 4.9 vs 5.1; overlapping pairs per frame 369 vs 383, 256 vs 247, 65 vs 64 (`v4c-before-relaxation.mjs`).
* Not a defect: the clock shows 12:00 AM of the next date for the two ticks within 2.5 minutes before midnight (ticks 159 and 367), because it rounds to 5 minutes before it takes the date.

---

## 3. What held, with the numbers

### 3.1 Data (`v1-data.mjs`, `v1b-badges.mjs`, `v1c-tour.mjs`): 23 of 23

1,804 rows read from the 47 placement and density files in the bundle's own order; 1,687 distinct `(unit, tick)` keys; 478 units; **every keyframe equals the source row** (tick, lat, lng to 6e-7 degrees, strength, bearing, disposition, note: 0 mismatches of 1,687); the 73 repeated keys that disagree are all reported by the page data; prefix side, designation (null when not in the order of battle) and strength reference (max of placement strengths and the order-of-battle strength) agree for all 478; the 10 Contested units are drawn amber (3 to 4 in view, a fill colour no Union or Confederate tile uses, all 9 skins); 137 events, 24 stories and 42 command changes verbatim; the 16 tour stops equal the shipped bundle's array on 9 fields each; the SHA-256 of all 97 listed source files equals the file on disk today. **Union corps badges**: 174 of 255 Union units get a badge, and all 174 agree with the order of battle's `parent_corps_id`; the shapes (I sphere, II trefoil, III lozenge, V Maltese cross, VI cross, XI crescent, XII star) and division colours (red, white, blue) are exactly the circular of 21 March 1863 as printed at <https://civilwarnews.com/issues/2022/may/the-library-of-congress-collection-may-2022/> (read 2026-10-06; it cites the Official Records p. 152); colours also at <https://civilwarnews.com/issues/2024/february/corps-badges/> and <https://en.wikipedia.org/wiki/American_Civil_War_corps_badges> (read 2026-10-06; the page names the colours and shows the shapes only as images). The NPS video page the tour names still answers HTTP 200 with "The video you have requested is not available at this time." (`https://www.nps.gov/media/video/view.htm?id=C92C2F74-1DD8-B71C-07BF91D4DC85469C`, read 2026-10-06).

### 3.2 Overlap on settled pictures (`v2-sweep.mjs`, `analysis-v2.mjs`)

Default configuration (popups on, solve cadence auto, no forced settings). Desktop 1440x900: **1,134 samples** = 3 styles x 3 variants x 9 zooms x 14 ticks (day boundaries, the five densest ticks by my own count, three seeded random ticks that fall **between** keyframes, tick 1 and 675), camera on the densest cluster. Phone 390x844 DPR 2: **294 samples** (3 styles standard x 7 zooms x 14 ticks).

| zoom | most chips in view (desktop) | solid overlaps | solid x dim | min gap between chips | ink outside box | unexplained pixels | missing / early / phantom units |
|---:|---:|---:|---:|---:|---:|---:|---|
| 11 | 25 | 0 | 0 | 2.0 px | 0 | 0 | 0 / 0 / 0 |
| 12 | 47 | 0 | 0 | 2.0 | 0 | 0 | 0 / 0 / 0 |
| 13 | 104 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 |
| 13.5 | 123 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 |
| 14 | 136 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 |
| 15 | 100 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 |
| 16 | 73 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 |
| 17 | 34 | 0 | 0 | 2.6 | 0 | 0 | 0 / 0 / 0 |
| 18 | 21 | 0 | 0 | 2.7 | 0 | 0 | 0 / 0 / 0 |

Largest excess of ink over the declared box 0.53 px (rounding of the stroke). Phone: 24 to 63 chips in view, 0 overlaps, min gap 2.09 px, 0 unexplained pixels. Console: 0 page errors, 0 requests (one 404 for the favicon).

### 3.3 Positions (`v5-positions.mjs`): 8 of 8

* The 11 place marks of `legacy/dist/data/terrain.json` in view are painted **0.000 px** from my projection at the page camera.
* At 24 keyframe ticks x 3 zooms: **1,040 true positions compared, max error 3.7e-9 px**; 0 duplicates (every unit in exactly one tile) in 72 settled frames; **no chip farther than 47.94 px** (budget 48) from its unit over 14,097 leaf tiles (3,848 displaced, each with a pin on the true position).
* Between keyframes (16 non-keyframe ticks, 2,419 positions): every position is inside the coordinate envelope of its two keyframes (monotone cubic does not overshoot); distance from the straight chord (perpendicular to the segment) median **2.6 m, p90 56.4 m, max 387.5 m** over 660 moving positions, against the README's 0 / 49 / 391 m.

### 3.4 Clock (`v6-clock.mjs`): 11 of 11

The page's clock equals my piecewise-linear interpolation of `data-src/time/time_anchors.json` for 2,023 ticks (integer and fractional; minutes within 1e-6) and the product's own `src/lib/time` module at all 675 ticks (5-minute rounding, calendar date; 2 midnight-rounding ticks noted above); passes exactly through all 33 anchors; strictly increasing; ± minutes equal the interpolated `sigma_min`; every time of day in the top bar, clock card, dock and scrubber tooltip equals the label of the tick it names (32 strings at 15 ticks); 79 distinct event cards printed 166 own clock strings, all equal to the model clock of **the event's tick** (cards linger, so the current tick may be later); popups print no clock of their own; every top-bar clock line says "about", "±n min" and "candidate clock". The 9 times typed inside source sentences (e.g. "11pm" at tick 100, "10:30am" and "1:00pm" at tick 38) are quoted verbatim; 3 differ from the model clock at their tick by more than 30 minutes, 2 by more than 60.

### 3.5 Popup texts (`v7-popups.mjs`, `v7b-fifteen.mjs`)

Method: every text leaf in the popup layer, the reading rail, the narration card, the top bar and the dock at all 140 event, story and command-change ticks, all 24 story rails and 60 unit cards (16,547 leaves) is classified against a corpus built from the raw `baseline/dist/data` files: **5,720 verbatim source text, 10,515 allow-listed interface phrases, 312 residue** (175 distinct strings; I read every one: interface sentences such as the hints, the honesty notes, the Contested note, and short codes the page derives from ids such as `12 IL`, `VI/1/1`). Unit-card facts checked against the order of battle and the keyframe for 60 random units: 263 facts (placement strength, strength reference, position, order-of-battle strength, casualties, commander): **0 mismatches**. Fifteen texts, fragment by fragment:

| # | Text on screen | Source | Result |
|---|---|---|---|
| 1 | event card, tick 28: "REYNOLDS KILLED. Shot through the head by a sharpshooter ... Doubleday assumes corps command."; place; unit; "about 10:15 AM" | `chronology_day1.json` tick 28 `.event` (minus its last internal sentence "Commander succession US-001 activates."), `.location`; OOB U-I-1-1 designation; clock = model at tick 28 | verbatim |
| 2 | event card, tick 551: "ARMISTEAD LEADS MEN OVER THE WALL ... Approximately 150-200 men cross with him." | `chronology_day3.json` tick 551 | verbatim |
| 3 | event card, tick 518: "THE CANNONADE BEGINS. At approximately 1:00pm ..." with its own clock "about 1:05 PM" | `chronology_day3.json` tick 518; model clock | verbatim; the two times differ by 5 minutes (labelled) |
| 4 | story peek "The First Shot" (tick 12) with place and unit | `vignettes_part1.json` V-001 `.title`, `.panel_summary`, `.trigger_location`; OOB U-CAV-1-1 | verbatim |
| 5 | story peek "Armistead at The Angle" with three units | V-016; `units_featured` mapped to OOB designations | verbatim |
| 6 | story rail, full script V-001 (5 paragraphs) | V-001 `.full_script` | verbatim |
| 7 | command toast, Reynolds (tick 28): from, to, event | `commander_successions.json` US-001 | verbatim; kind "Killed" typed from cause "KIA" |
| 8 | burst at tick 550: Garnett, Marshall, Hancock, Gibbon | CS-005, CS-010, US-009, US-010 | verbatim; label issue V-10 |
| 9 | cross-out Sherrill to Bull (tick 551) | US-015, US-016 | verbatim |
| 10 | unit card, Battery A 4th US Artillery (tick 552): commander, fate, strength 107, casualties 25, key action, "32 of 107" at this placement | OOB `U-ART-A4US`; keyframe tick 552 | verbatim, numbers equal |
| 11 | unit card of Contested `U-5TX` | the id prefix says Union, the state code TX appears only on Confederate units of the order of battle (10 such ids) | correct; quotes a repo doc id (V-10) |
| 12 | day banner: "Ticks 226 to 450 of 675", "about 4:30 AM" | `time_anchors.json` `tab_days`; model | correct |
| 13 | auto-tour stop 1: title, subtitle, three paragraphs | shipped bundle tour array | verbatim |
| 14 | showcase caption: "478 units and 1,687 hand-placed keyframes on 188 of 675 ticks", "July 3, about 3:25 PM" at tick 548 | counts from the data; model | correct |
| 15 | hint: "Press Space to play the battle. Arrow keys step one tick; Shift steps an hour." | the transport | arrow correct; **"an hour" false** (V-10) |

The showcase's "Measured on this run" table was also checked against my own runs of the same view: sudden jumps Before 7.3/s, After 0.6/s on its run; mine (The Angle, 4x, 20 s) 4.5/s and 0.45/s; largest step Before 545 px (mine 544.9 px), After 71 px (mine 94 px); frames with tiles on tiles 100 % before (mine 100 %), 0 % after (mine 0 to 0.8 % with solid tiles, 5 to 41 % when dimmed tiles are counted); frame rate 60 vs 60 (mine 60 vs 60).

### 3.6 Popups (`v7c-cards-cover.mjs`, `v7-popups.mjs`)

The registry holds exactly 12 popup modules (`clock-hud, day-banner, event-card, story-card, command-toast, command-crossout, unit-card, tour, legend, minimap, hints, chronicle`); nine kinds of card were on screen in the 11,256 frames (legend, overview, clock, event, story, cross-out, toast, day banner, hint), the unit card, the auto tour and the Chronicle in section 3.5 and in the keyboard run. They place on free ground (0 covered chips, section V-04). The ones that do cover tiles are the **interface** and the **narration card**, not the popups.

### 3.7 Tuning Studio (`v9-tuning.mjs`): 12 of 14

177 dials, one row each with a control, doc and evidence badge. Operated through the UI controls: 8 dials of 5 kinds move. **Export** (real download `battle-studio-settings.json`, 5,316 bytes, format `battle-studio-settings/1`, all 177 dials) equals the live values and **validates against `tokens/tokens.schema.json`** (ajv). **Reset all** returns every dial to the token default. **Import** through the real file input restores all 177 exactly ("imported 8, rejected 0, unknown 0"). **The picture is reproduced from the file alone**: canvas hash of a cold settled frame, settings applied by the API `efade700`, through the Import button in another fresh session `efade700` (defaults `3691f096`). Settings persist across a reload. Hostile inputs (wrong format string, unknown id, out of range, wrong type, null, string, array, empty object, bare map, prototype-pollution keys, a half-good file, a file that is not JSON): never an exception on the dial path, each reported as applied, rejected or unknown, no prototype pollution. The two failures are V-08.

### 3.8 The Before view is the shipped renderer (`v4b`, `v4c`, `v4e`)

Run with the **shipped code** (cut out of the bundle and executed in a vm), independent of the prototype and of report 01's harness:
* **Clock**: the shipped `Ed` rule (accumulate frame time, advance `floor(acc / (500 / speed))` ticks, draw the old tick plus the new fraction) matches the Before's `tau` on 1,560 frames at 1x and 4x: **0 mismatches**.
* **Tile set and positions**: for 522 frames the units the Before draws equal the units the shipped `y1` returns inside the window `lS` uses (x -200 to width + 200, y -40 to height + 40), and **111,564 true positions agree to 5e-10 px** with the shipped `y1`/`F4` projected by my Mercator.
* **The published numbers** (FACTS: 833 hops, 159 frames, 66 snap-backs, 407 one-frame absences, zoom 13.5): replaying the whole battle at exactly 60 Hz through the shipped loop and classifying the way report 01 does gives **833 hops, 159 frames, median 77.8 px, p95 667.4 px, max 1,096.3 px, 47 simultaneous, 66 snap-backs, 407 reappearances after one frame**, identical at 1x and 4x. The captions cannot be off.
* Relaxation: see V-13.

### 3.9 Other checks that passed

* **Real input** (`v12-input.mjs`): a click on empty ground clears the selection; the wheel zooms 15.00 to 15.64 and the ground under the pointer stays within 0.000 px; a drag of (60, 30) carries the ground point to within 3e-9 px.
* **Network** (`v11-net.mjs`): file of 1,502,479 bytes, no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, worker or external tag; two URL strings in the source (the NPS page as text, the SVG namespace); first frame 240 ms after load.
* **Frame cost**: 60 fps and p95 16.8 ms in 8 of 10 scenes on this machine.
* **Pause and the page loop**: with popups on the page stops drawing when nothing moves (0 frames per 250 ms after 30 s).

---

## 4. Not verified, and limits of what I measured

* One machine, one GPU path, headless Chrome 155 on Windows. No Firefox, Safari or Edge. The phone is a viewport emulation (touch, DPR 2), not a handset; real touch pinch and drag were not exercised.
* Timing numbers are for this machine; the CPU-throttled runs are a harsh stand-in, not a phone.
* My opacity classes (solid >= 0.5, dim in [0.05, 0.5)) and my overlap tolerance (0.02 px, touching allowed) are my own choices; the owner's wording is stricter than the first and the second is generous to the prototype.
* "Unit on the field" is my own rule (first keyframe tick onward), agreed with the engine's resolver on every frame tested.
* I did not re-run the prototype's own 163 tests (they share code with the engine), nor its soak/heap measurements; heap and long-session memory are unverified here.
* No historian read the popup texts; "verbatim" means equal to the repo's data files, and the data files are themselves secondary (strength and casualty figures cite Busey and Martin and others the page marks as not re-read). The clock is the unsigned candidate; every clock statement inherits that.
* Corps badge shapes: confirmed against the circular as printed at civilwarnews.com, not against the Official Records scan. WCAG thresholds (4.5:1 text, 3:1 large text, 24 px target) are the standard values as I know them; I did not re-read the specification this session.
* The Before view's draw routine (bars, labels, glow, colours) was checked for positions and set, not pixel by pixel against the production page; the production page itself was not run (no Mapbox tiles were requested).
* Mapbox integration, the product bundle and 05's architecture patch group are out of scope (the prototype touches no product file).

---

## 5. Files and how to reproduce

All under `docs/pitch/anim/07-verify/` (run from the repository root; each driver serves the prototype read-only on its own port and writes `results/*.json`; `node analysis-tables.mjs` and `node analysis-v2.mjs` rebuild the tables).

| script | what it measures |
|---|---|
| `lib.mjs`, `recorder.js`, `srcdata.mjs`, `scenes.mjs` | the witness, the per-frame analysis, my source reader and projection, the camera presets |
| `v1-data.mjs`, `v1b-badges.mjs`, `v1c-tour.mjs` | data, badges, tour text against the sources |
| `v2-sweep.mjs` | settled-frame sweep on painted ink (`--viewport=390x844 --dpr=2` for the phone) |
| `v3-play.mjs`, `v3c-showcase.mjs` | every frame of a 20 s playback and of the 60 s showcase / a hotspot tour |
| `v3b-gaps.mjs`, `v3b2-net-off.mjs` | units with no tile; the safety-net experiment |
| `v3d-cut.mjs`, `v3e-pixels-motion.mjs` | the hard cut, pixel completeness in motion |
| `v3f-rest.mjs`, `v3g-rest-scan.mjs`, `v3h-rest-cadence.mjs`, `v3i-pause.mjs`, `v3j-wake.mjs`, `v3k-after-pause.mjs` | rest and pause behaviour (v3j and v3i ran with popups off and are superseded by v3k) |
| `v4-motion.mjs` | frame cadence and displacement per frame, Studio against Before (`--cpu=4`, `--reduced=1`, phone) |
| `v4b-before-fidelity.mjs`, `v4c-before-relaxation.mjs`, `v4e-facts-replay.mjs` | the Before view against the shipped code |
| `v5-positions.mjs`, `v6-clock.mjs`, `v6b-shift-hour.mjs` | positions, clock, how long 12 ticks are |
| `v7-popups.mjs`, `v7b-fifteen.mjs`, `v7c-cards-cover.mjs` | popup texts, fifteen texts, cards against tiles |
| `v8-a11y.mjs`, `v8b-dim-contrast.mjs` | accessibility, contrast of dimmed tiles |
| `v9-tuning.mjs`, `v10-skin.mjs`, `skin/ribbon.mjs` | the Tuning Studio, the new skin experiment and the 45-line skin it uses |
| `v11-net.mjs`, `v12-input.mjs`, `v13-popups-off.mjs`, `v14-skin-routes.mjs`, `figs.mjs` | network, real input, popups off, skin token routes, the two figures |

Pictures in `docs/pitch/anim/shots/verify/`: `fig-cut-strip.png`, `fig-chrome-covers.png`, `v3-the-angle-after-1x-1.png`, `v3-default-after-4x-2.png`, `v10-ribbon-about.png`, `v10-ribbon-angle.png`, `v10-bad-skin-boot.png`.

Ports used: 9700 to 9733. Processes left running: none.
