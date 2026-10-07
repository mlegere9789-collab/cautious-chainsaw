# The Quiet Cartographer: the design language

Art director 1 of the Battle Studio redesign. Apple Maps, Mapbox Studio, Swiss cartography and Eduard Imhof as the references; calm as the luxury. This is the specification of the design that is built in this folder (`quiet-cartographer.html` and `src/`), written after the pictures were made, so every rule below is a rule the pictures obey, and every number is a number a script printed (the scripts are in `tools/` and `test/`; the raw results are in `results/`).

How to look: `node tools/serve.mjs` then open `http://127.0.0.1:9840/d1-quiet-cartographer/quiet-cartographer.html` (the page finds the 9 MB of aerial tiles in `../basemap/assets/`; nothing else is requested). Start with `shots/compare-first-prototype-vs-quiet.png` (the same tick and camera, before and after), then `shots/specimen-night.png` (every mark and state), then the nine scenes.

The sections: 1 principles, 2 grid, 3 type, 4 colour, 5 symbol anatomy, 6 states, 7 formation and crowd marks, 8 level of detail, 9 motion, 10 popups, 11 what is Documented and what is Modelled in every encoding, 12 extending it, 13 verification, 14 limits, 15 the five strongest and five weakest things. Appendix A is the token table, generated from the token file.

## 1. Principles

1. **One object per unit.** A unit is one mark: a pip (its shape says the arm, its colour says the side) with its short code set beside it. There is no caption chip and no outline: the lettering carries its own halo, and on the day ground only a faint glass fill (20 %, one rounded rectangle inside the footprint) lifts it off the pale sheet; the night ground has none (`halo.plate`). The full name does not appear as a second box: when the map is zoomed in, or the mark is selected, **the same mark grows** and the name joins the code inside the footprint the layout already reserved.
2. **Hierarchy from size, weight and lightness only.** Three levels and no more: formation marks (a standard with 13 px bold lettering) over unit marks (a pip with 11 px bold code) over secondary detail (11 px regular names, hairlines). No outline, no border, no shadow is used to rank anything.
3. **A halo, not a box.** Everything that must be read on a photograph is lettering with a soft dark halo (night) or a paper-white one (day). Marks carry one hairline of the opposite lightness so they hold on any ground.
4. **Restraint is the luxury.** Nothing dashed, nothing glowing, no badge under 11 px, no colour that is not a side or an evidence label. The interface is neutral ink; the only saturated colours on screen are the two armies, the six evidence words, the small mark on a card that says what kind of card it is, and the event marks on the timeline.
5. **A crowd is a standard, never a pile.** Marks that cannot stand clear of each other merge into one standard that carries the count and says what the members share; hovering or selecting it draws a hairline to the true position of every unit it stands for. No unit is ever dropped.
6. **One device for "not a fresh report".** The mark hollows (a side-coloured ring round dark glass; a paler flag). It is a continuous function of the age of the unit's latest keyframe, so nothing pops.
7. **Every pixel says what it knows.** Side, arm, echelon and identity are Documented; fix age and counts are Computed; position, strength and motion are Modelled; the 10 units of unknown side are Contested; 95 units known by their id alone are Unknown. The legend is drawn by the skin itself, so it cannot drift from the picture (section 11).

## 2. Grid

All lengths are CSS px at 1x; the page draws at the device pixel ratio.

| Thing | Size | Token or source |
|---|---|---|
| Unit mark: body height | 14 px; footprint 18 px (a 2 px band on every side, which is where the selection ring lives) | `unit.h`, `FOOT.ring` in `quiet-cartographer.mjs` |
| Pip | 11 px across, ring 1.25 px, dark hairline 0.9 px outside it | `pip.size`, `pip.ring`, `pip.hairline` |
| Pip to code | 4 px; code to full name 6 px; name to strength hairline 7 px | `pip.gap`, `name.gap`, `gauge.gap` |
| Standard (brigade) | flag 15 x 11 px with a 3.5 px swallow-tail, staff 5 px below the flag; body height 20 px, footprint 24 px | `flag.*`, `formation.h` |
| Echelon | the flag grows: brigade 1, division 1.12, corps 1.26 times | `ECH_SCALE` |
| Clearance between two footprints | 1 px (so at least 5 px between the inks of two marks) | `layout.gapPx` |
| Displacement budget | a mark stands at most 56 px from its true position, else it merges | `layout.dMaxPx` |
| Interface spacing | 4 px grid (4, 8, 12, 16, 24, 32) | `studio.css` |
| Radii | 6 px for a control, 10 px for a surface; the seven buttons inside the speed switch are 4 px (concentric: its 6 px outline minus 2 px of padding); a rail docked to the window edge has none; a pill nowhere | `quiet.css` `--r1`, `--r2` |
| Hairline | 1 px at 9 to 13 % of the ink | `quiet.css` `--edge` |

The footprint is the contract with the layout: the certified layout (the engine's, unchanged in principle) places these boxes so that no two overlap, and the skin draws nothing outside its own box (`test/skin-d1.test.mjs` checks the width holds every part, for all 478 units at six zooms).

## 3. Type

One face, **QC Sans**: a subset (362 to 363 glyphs per face: Basic Latin, Latin-1, Latin Extended-A and the punctuation and arrows the page uses) of **Liberation Sans 2.1.5**, SIL Open Font License 1.1, copyright Google Corporation 2010 and Red Hat 2012. Because the licence reserves the name "Liberation" and a subset is a modified version, the three faces are renamed QC Sans. The files are `assets/fonts/QCSans-Regular.woff` (30,716 bytes), `QCSans-Bold.woff` (30,008) and `QCSans-Italic.woff` (31,120), embedded in the page as data URIs; the licence text (4,414 bytes, fetched once from `https://raw.githubusercontent.com/liberationfonts/liberation-fonts/main/LICENSE`, a plain text file; that host has no `robots.txt`) is in `assets/fonts/LICENSE-Liberation-Fonts.txt`. They come from `C:/Windows/Fonts/LiberationSans-*.ttf` of the machine that built this, through `tools/make-fonts.py`; nothing else was downloaded for the fonts. WOFF (zlib), not WOFF2: no Brotli encoder was installed.

| Where | Cut | Size | Used for |
|---|---|---|---|
| Map, level 1 | Bold | 13 px | the name of a formation or a standard, tinted with its side |
| Map, level 2 | Bold | 11 px | the short code of a unit; the count inside a flag |
| Map, level 2 | Italic regular | 11 px | the code of a unit known by its id alone (no order-of-battle record) |
| Map, level 3 | Regular | 11 px | the full name of a unit (grown in), place names (italic), road and stream names |
| Interface | Regular and Bold | 11, 13, 16, 22 px | 11 labels and notes, 13 body and controls, 16 card titles, 22 the rail and narration title |

The map uses **two sizes and one numeral style** (bold, tabular: Liberation's figures are all one width, so a count never changes the width of its flag by more than a digit). The interface uses four steps: that is more than the brief's two, and it is listed under the weak points. The smallest text anywhere is 11 px (`tools/audit-dom.mjs` found 11 px as the minimum in every one of 8 states of the interface, and `tools/textfit.mjs` checks the canvas lettering).

## 4. Colour and its contrast tests

Colours are tokens (`src/skins/quiet-cartographer.spec.mjs`). The two grounds have their own palettes: **night** (slate relief, the default) and **day** (a pale atlas sheet); each has a colour-blind-safe variant and a high-contrast variant: six skins, ids `quiet-cartographer`, `/cvd`, `/contrast`, `quiet-cartographer-day`, `/cvd`, `/contrast`.

| Role | Night | Day |
|---|---|---|
| Union | `#62a6ff` | `#1a58c4` |
| Confederate | `#e4522a` | `#dd4a1f` |
| Unknown side (Contested): the ink of the ground, hatched, never a side colour | `#e3e8ee` | `#2a323b` |
| Unit code ink | `#f6f9fc` | `#14202c` |
| Formation lettering, Union / Confederate | `#d3e5ff` / `#ffdccd` | `#17418f` / `#8a2307` |
| Halo | `#070b11` (2.4 px at 66 %, then a wider soft one at 30 %) | `#fbf9f3` (2.4 px at 90 %) |
| Pip ring and staff | `#f7fafd` | `#142231` |
| Count inside a flag | `#ffffff` on its own dark halo `#0a1118` | the same |

Why these: Union against Confederate is blue against vermilion (the colour-blind-safe pair of Okabe and Ito in spirit, not their exact values), and since the first test run showed the greyscale difference was only 1.03:1, the two were also separated by lightness (greyscale luminance ratio 1.5:1 at night, 1.6:1 by day). The unknown side was gold in the first version; on the day ground the smallest distance between any two of the three sides fell to CIEDE2000 2.3, so it became the neutral ink of the ground with hatching.

The tests (`tools/contrast.mjs`, results in `results/contrast.json`). The ground is rendered by the page's own backdrop code at five real views per ground and its pixel luminance is read at the 1st, 5th, 25th, 50th, 75th, 95th and 99th percentile; lettering is tested against **its own halo composited over every one of those bands** (the letters sit on the halo, not on the photograph), marks are tested as non-text against their hairline over the bands, and the two sides are tested apart under simulated colour-vision deficiency (Machado, Oliveira and Fernandes 2009 matrices as the symbology job's colour module has them, severity 1.0, linear RGB). The bars are 4.5:1 for lettering (WCAG 1.4.3 applied to the map), 3:1 for marks (WCAG 1.4.11) and CIEDE2000 20 between the sides (this project's own bar, not a WCAG number).

<!--CONTRAST-->
| skin | worst lettering over 35 ground bands (bar 4.5) | worst mark over 35 bands (bar 3) | smallest CIEDE2000 between any two of the three sides, over four vision types (bar 20) | greyscale luminance ratio, Union against Confederate | verdict |
| --- | --- | --- | --- | --- | --- |
| night | 6.22 (unit name (grown in, carried), carried) | 3.18 (pip ring confederate (carried)) | 25.1 (Union vs Confederate 49.1) | 1.52 : 1 | pass |
| night/cvd | 6.22 (unit name (grown in, carried), carried) | 4.10 (pip ring confederate (carried)) | 25.9 (Union vs Confederate 49.2) | 1.14 : 1 | pass |
| night/contrast | 14.97 (tint-confederate, fresh) | 4.67 (pip ring confederate (carried)) | 25.4 (Union vs Confederate 47.1) | 1.15 : 1 | pass |
| day | 4.98 (unit name (grown in, carried), carried) | 3.59 (pip ring confederate (carried)) | 22.2 (Union vs Confederate 48.5) | 1.57 : 1 | pass |
| day/cvd | 4.76 (tint-union, carried) | 3.50 (pip ring confederate (carried)) | 20.5 (Union vs Confederate 48.6) | 1.68 : 1 | pass |
| day/contrast | 9.63 (tint-confederate, carried) | 6.08 (pip ring confederate (carried)) | 21.4 (Union vs Confederate 44.9) | 1.39 : 1 | pass |

6 skins; 0 failing checks. The ground bands are in the result file (five views per ground, seven percentiles each).
<!--/CONTRAST-->

What these numbers are not: the halo is modelled analytically (halo colour over the ground band, with the two strokes combined), not read back from rendered pixels around each glyph; the colour-vision simulation is software, not people (`shots/cvd-night.png` shows it); and "worst band" is the worst of 35 sampled bands per ground, not every pixel.

## 5. Symbol anatomy

`shots/specimen-night.png` and `specimen-day.png` draw every mark with the skin's own code on real units.

- **Unit mark** = pip + code. The pip is a disc (infantry), a diamond (cavalry) or a triangle (artillery); the data has no other arm, and a formation record has none (it is a standard). Fresh: light ring, solid side colour. The code is bold 11 px, `71 PA`, haloed.
- **Standard** = staff + swallow-tail flag + name (13 px bold, tinted with the side) + for a crowd the **count** inside the flag. The flag is the side colour; for both sides it is split on the diagonal, Union at the staff, Confederate at the tail; for the unknown side it is neutral and hatched.
- **Grown mark.** At close zoom a unit mark carries its name after the code (11 px regular, 82 % opacity: the code stays full strength). Selected, it grows from zoom 15 up (`detail.selectGrowZoom`; on a window narrower than 560 px it does not: the card has the name) and gains the **strength hairline**: a 22 x 3 px rounded bar, filled to this keyframe's strength over the unit's reference strength. The hairline exists only on a selected mark; a row of hairlines on every mark read as dashes in the first renders.
- **Pin and hairline.** A mark displaced from its true position gets a small ring on the true position and a 1 px hairline to the mark, only when the position is more than 18 px outside the mark (always on hover or selection) and from zoom 12.5 (full from 13.2), so the opening zoom of the site, 13.5, shows them. The pin is a keep-out for every other mark, so nothing covers it.
- **Selection** is a 1.5 px ring in the footprint's own 2 px band; **hover** is a 1 px ring at half opacity. Neither changes the layout below zoom 15 (and on a narrow window never): nothing moves, and a unit that stands inside a crowd is shown by the ring on the crowd's standard and the hairlines to its members. From zoom 15 on a wide window the selected mark grows its name, takes the top placement priority and the layout makes room for it (section 9, Selecting).
- **Place names** (the real ground's 41 marks) are set around the marks, never under them: each name tries four slots against the footprints and the interface, keeps the one it has while it stays free, and fades out and elsewhere when it is taken. A name that finds no slot is not shown; a unit never is dropped.

## 6. States

| State | Drawn as | Evidence |
|---|---|---|
| Fresh fix (latest keyframe under half a battle day, 112 ticks) | solid pip or saturated flag, light ring | Computed from the keyframe age |
| Carried forward (a battle day, 225 ticks, or more) | hollow pip: side-coloured ring, dark glass inside; a paler flag; lettering at 74 % | Computed |
| In between | a continuous blend (a smoothstep over 112 to 225 ticks), so nothing pops | Computed |
| Identity from the id alone (no order-of-battle record) | italic code | Unknown |
| Side unknown (10 ids whose prefix and state code disagree) | neutral ink colour with hatching; never a side colour | Contested |
| Both sides in one standard | flag split on the diagonal; the lettering says "Both sides" | Computed |
| Displaced | pin and hairline (section 5) | Modelled |
| Selected | ring + name + strength hairline | Design |
| Hover | faint ring; the tooltip card opens after its delay | Design |
| Entering, leaving, travelling | section 9 | Design |

Posture (charging, retreating, line of march ...) and arm state (limbered, dismounted) exist in the data as Modelled values authored per keyframe (28 duplicate keys disagree). **This skin does not draw them**: they are not vital and every extra glyph is noise; they are in the inspector. The Union corps badges of the prototype's 1863 skin are not drawn either: the formation names carry the corps ("2nd Div, 2nd Corps"). This is a design choice, said here once.

## 7. Formation and crowd marks

A standard stands for a formation record (brigade, division, corps) or for a crowd. The words on a crowd are what its members share, from the order of battle and nothing else (`layout/tiles.mjs`, `aggregateName`, changed from the prototype's "Contact" and "lead + k", which the review of the first pitch flagged as claiming an engagement the data does not record):

| Members | Lettering | Count |
|---|---|---|
| Both Union and Confederate units | "Both sides" | plain number of placement records |
| One brigade, division or corps | its short code (and, from the zoom of its echelon, its order-of-battle name: "Harrow's Bde", "2nd Div, 2nd Corps") | plain number |
| Several formations of one side | the corps they belong to, read from their order-of-battle chains: "II Corps", "I, III Corps"; "II Corps +2" when 2 members' chains name no corps; "3 corps" when more than three; "Union" or "Confed." when none does | plain number |

The data cuts 25 of the 157 formation labels at 24 characters with an ellipsis ("3rd Bde, 3rd Div, 1st C…"); the unit marks used the designation, but the crowd standards that stand for those formations printed the cut label (found in the last picture of the phone scene; `aggregateName` now uses the designation, compacted as the marks do, and a test compares the two over all 157). The count is **records, never men** (Computed). Hovering or selecting a standard draws a hairline from it to the true position of every unit it stands for, each with a small dot (`detail.hullZoom`, 12). The footprint of a crowd standard is the same kind of box as any other, so the layout treats it like any other mark: merging is the layout's guaranteed fallback and happens only when a unit cannot stand within 56 px of its true position without touching a neighbour.

## 8. Level of detail

Progressive disclosure as a map does it. A unit is always drawn; its words come with the scale.

| From zoom | A unit mark | A formation or standard |
|---|---|---|
| any | the pip, bare | the flag, bare |
| 11 | | a corps names itself |
| 12 | pins and member hairlines may show | |
| 12.5 | | a division names itself; pins start to fade in |
| 13.2 | pins fully shown | |
| 14 | the short code appears | a brigade names itself |
| 14.5 | | a crowd of several formations says what they share in words |
| 16 | the full name appears | |
| selected | code and name from zoom 15 (wide windows); below 15 only the ring, and nothing else moves (section 9, Selecting) | its name from zoom 15 |

All of these are tokens (`detail.*`, `pin.*`). The footprint changes with the detail level, and the layout solves with the detail it will draw. Honest cost: at the site's opening zoom 13.5 a unit mark has no code and a brigade standard has no name; the hover card says which unit it is (this is the weakest point of the opening view).

## 9. Motion

The engine owns position, size, fade and travel (`scene/display.mjs`, `interp/*`); the skin owns the easing of its own state. Every curve below is computed by `tools/curves.mjs` (`results/curves.json`); a "time constant" is the `smoothTime` of the critically damped step of `interp/damp.mjs` (no overshoot, exact for any frame time).

<!--CURVES-->
| what | time constant | 50 % / 90 % / 99 % reached after | where it is set |
| --- | --- | --- | --- |
| mark glide to its solved place | 120 ms | 101 / 234 / 399 ms | engine dial motion.smoothMs |
| travel of a dimmed mark | 60 ms | 51 / 117 / 200 ms | engine dial motion.travelMs |
| selection ring | 140 ms | 118 / 273 / 465 ms | skin token motion.selectMs |
| hover ring | 90 ms | 76 / 176 / 299 ms | skin token motion.hoverMs |
| name grows in or out | 180 ms | 152 / 351 / 598 ms | skin constant, ease("name") |
| code appears or goes (pip codes by zoom) | 160 ms | 135 / 312 / 532 ms | skin constant, ease("txt") |
| camera zoom glide | 180 ms | 152 / 351 / 598 ms | engine dial camera.zoomGlideMs |
| camera pan glide | 120 ms | 101 / 234 / 399 ms | engine dial camera.panGlideMs |

Fade in or out of a mark: 280 ms, smoothstep (10 % at 55 ms, 50 % at 140 ms, 90 % at 225 ms). cubic-bezier(.2, .72, .2, 1) at 140, 240 and 380 ms (quiet.css and studio.css).
<!--/CURVES-->

- **Between keyframes** a unit moves along a monotone cubic (PCHIP) through all its keyframes at once, exact at each keyframe, velocity continuous, never overshooting: it does not stop at a keyframe, and there is no hold-then-jump. (The engine's, kept.)
- **Arrival** (a mark enters the picture, or comes out of a crowd): it fades in over 280 ms (smoothstep) while its scale rises from 0.86 to 1 and the skin maps that progress through an ease-out cubic: the pip grows from 72 %, the flag unfurls from 25 % of its width, the code appears between 25 % and 100 % of the arrival and the count between 40 % and 100 %. A calm settle, no bounce. `shots/strip-deploy.png` shows the real frames.
- **Exit** is the same in reverse (opacity down, scale to 0.86) and is not a cut. A crowd forming (members into a standard) and a crowd breaking up are **sequenced dissolves**: the outgoing marks glide toward the incoming one and the incoming one starts only when they are below half opacity, so two overlapping marks are never both solid.
- **A mark that must move far** does not shove through the crowd: it dims to 42 % over about 60 ms, glides there (time constant 60 ms) and solidifies on arrival (140 ms); while it is dim it neither obscures nor is obscured. A mark that must make room is eased aside by at most 1.5 px per pass, never shoved.
- **Selection** ring 140 ms, **hover** ring 90 ms, **a name growing** 180 ms, **a code appearing with the zoom** 160 ms: all the same critically damped ease, the same curve in and out.
- **The camera** glides (zoom 180 ms, pan 120 ms time constants) and the ground under it is the basemap's own frame-cached painter, so the marks and the ground move together. `shots/strip-march.png` is a march at 4x; `strip-select.png` is a selection.
- **The interface** uses one curve, `cubic-bezier(.2, .72, .2, 1)`, at 140, 240 and 380 ms.
- **Reduced motion** (the engine's `motion.reduced`, which follows the system setting): fades 60 ms, no glide, the skin's own eases land at once.
- **Settling.** A paused picture comes to rest. This was measured, and the engine had a defect found on the way: in some dense scenes two or three displaced marks stood perfectly still but kept the engine "busy" for ever (a sub-pixel deadlock between a glide and a push; all three prototype skins showed it in at least one of the probed scenes), so the page redrew every frame while paused. The display layer now settles a mark by stagnation (`display.mjs`, 8b). Measured with `tools/rest-times.mjs` (4 s of 4x play, pause, frames until the engine is idle):

<!--REST-->
| scene | tick | zoom | Quiet Cartographer | prototype war-room | prototype field-manual | prototype map-1863 |
| --- | --- | --- | --- | --- | --- | --- |
| fresh2 | 548 | 14 | 282 (4.7 s) | 379 (6.3 s) | 355 (5.9 s) | never (30 s) |
| fresh2 | 556 | 15 | 244 (4.1 s) | never (30 s) | 1397 (23.3 s) | 242 (4 s) |
| field | 620 | 13.5 | 189 (3.1 s) | 224 (3.7 s) | 337 (5.6 s) | 136 (2.3 s) |
| carry1 | 295 | 14 | 286 (4.8 s) | 450 (7.5 s) | 320 (5.3 s) | 336 (5.6 s) |
| evening1 | 120 | 14 | 257 (4.3 s) | 190 (3.2 s) | 274 (4.6 s) | 133 (2.2 s) |
| fresh1 | 451 | 16 | 306 (5.1 s) | 305 (5.1 s) | 1052 (17.5 s) | 305 (5.1 s) |
| field | 226 | 13.5 | 375 (6.3 s) | 368 (6.1 s) | 375 (6.3 s) | 381 (6.3 s) |
| field | 538 | 14 | 335 (5.6 s) | 435 (7.3 s) | 384 (6.4 s) | 380 (6.3 s) |
| field | 620 | 12 | 271 (4.5 s) | 227 (3.8 s) | 198 (3.3 s) | 239 (4 s) |

Frames (at 60 per second) until `engine.busy()` is false; the probe gives up at 1,800 frames. The right-hand columns are the same probe on the same scenes with the three skins of the prototype (its own engine, read-only).
<!--/REST-->

In the final build all nine scenes rest within 375 frames (6.3 s), two of the prototype's three skins never rest in one scene each and the third takes 1,397 and 1,052 frames in two others. An earlier build of this skin had one outlier here (`carry1` tick 295, 1,120 frames: a displaced mark relaxing at 20 px/s); it disappeared when the widths of 25 crowd names changed (section 7), nobody found why, and `test/rest.test.mjs` therefore bounds the rest at 600 frames and says so.

- **Selecting.** The engine gives the selected unit the top placement priority so that it stands at its true place. That re-orders the greedy placement, so at an overview a single click dissolved crowds and shifted 46 to 105 marks (`tools/probes/select-motion.mjs`; first measured at zoom 11 to 13.5), and in two of 21 views four marks of a crowd kept breathing by 0.7 px at about 5 Hz for ever (the layout's inertia reads the displayed offsets back, a loop with a delay in it). This skin therefore asks the layout for the priority only when the selection changes what must be reserved: from zoom 15 on a wide window (`sizer.selects`, `layout/tiles.mjs`). Below that the click draws a ring and moves nothing. The same probe on the final build:

<!--SELECT-->
| zoom | marks that moved more than a quarter pixel after one click (ticks 620 / 346 / 551) | largest one-frame step in the first second (px) | last frame with any step of 0.05 px or more (-1 = nothing ever moved) | largest step after frame 300 (px) |
| --- | --- | --- | --- | --- |
| 11 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 12 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 13 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 13.5 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 14 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 15 | 40 / 8 / 14 | 29.5 | 527 | 0.30 |
| 16.5 | 5 / 2 / 0 | 13.6 | 154 | 0.00 |

The mark nearest the middle of the view is selected after the picture has been at rest; 900 frames are watched (headless engine, the final dials; `tools/probes/select-motion.mjs`).
<!--/SELECT-->

From zoom 15 the growth makes room, which is a reflow of marks by design (8 to 40 of them at zoom 15); 20 of the 21 views are still by frame 235 and the last one by frame 527 (tick 620, zoom 15: some marks of a crowd move by up to 0.3 px a frame until then, the same breathing as before, shorter). The sweeps below click a mark at every zoom: median 9 frames to rest, and the ones that need more are the zoom 15 and 16 views.

## 10. Popups

All twelve popups of the Overlay Director are still there, with their content and purpose unchanged (the text is the same verbatim data; `src/popups/*` logic untouched except the legend, below). They are restyled by one stylesheet, `src/ui/quiet.css`, loaded after the prototype's two, which only overrides. The director's guarantee is unchanged: a card is placed on free ground against the exact footprints of the marks, and a card with no free ground becomes a chip in the Chronicle strip.

| Popup (module) | In the Quiet Cartographer | Picture |
|---|---|---|
| Event card (`event-card`) | glass card, a small tone mark and the word in the kicker (`CRITICAL`, 11 px), the chronology sentence at 13 px, the place and the units named as quiet rows, the evidence as a dot and a word, a leader hairline to the unit | `shots/popups/01`, `shots/s6-...` |
| Story card (`story-card`) | the same card; the whole story opens in the reading rail (the map makes room, a bottom sheet on a phone) | `popups/02`, `18` |
| Command toast, cross-out (`command-toast`, `command-crossout`) | the same card at toast width; the old commander struck through in the muted ink, the successor beneath | `popups/01`, `03` |
| Unit card and hover tooltip (`unit-card`) | name at 16 px, strength as a 2 px hairline over its numbers, the commander with its evidence label; width 340 px (it wrapped at 300) | `popups/04`, `05`, `s4`, `s8` |
| Auto tour (`tour`) | in the rail, stops as dots | `popups/06` |
| Day banner (`day-banner`) | a card with the day, the tick range, two evidence labels | `popups/07` |
| Clock (`clock-hud`) | a small card: the date, "about 3:35 PM", the uncertainty, a progress ring (3 px), the word Modelled | in every scene |
| Legend (`legend`) | **changed**: it was a 19-row floating card that found no free ground on a crowded map (opening it did nothing), so it now opens in the reading rail like every long text; the pill stays; the rows are the skin's own drawing, in sentences of at most 84 characters | `s7`, `popups/` |
| Overview map (`minimap`) | the same glass, the marks as dots in the side colours | in every scene |
| Hints (`hints`) | one-time cards with a kicker; "?" opens the keys and the evidence labels in the rail | `popups/06`, `s8` |
| Chronicle (`chronicle`) | the strip chips are 6 px rectangles with a hairline, the list is in the rail | `popups/08` |
| Narration (welcome, tours, toasts of the tour director) | one glass surface, kicker in sentence case, 22 px title, live numbers in 16 px | `popups/09`, `10` |

Anchoring: every card points at what it describes (a leader hairline to the tile, a ring with a gap at an approximate place, an edge arrow when the subject is off screen) and is drawn **beneath** the marks, so a mark always paints over the leader; the subject ring sits inside the mark's own 2 px band. `tools/scenes.mjs` and the engine's popup tests check that no card lies on a mark: in the nine scenes, `cards.over` is 0 in every frame.

## 11. What is Documented, Computed, Modelled, Contested or Unknown in every encoding

The evidence vocabulary is the site's six labels (Documented, Measured, Computed, Modelled, Contested, Unknown) plus **Design** for interface state that makes no claim about the battle. The legend rows and their labels are in `skins/semantics.mjs` and are rendered by the skin's own `sample()` (a test fails if a row has no label or is longer than 84 characters).

| Encoding | Says | Label | Source |
|---|---|---|---|
| Colour (Union, Confederate) | the side | Documented | the order of battle, or the id prefix for ids it does not list |
| Neutral hatched colour | side unknown | Contested | 10 ids whose prefix and state code disagree (`sideFlag`) |
| Pip shape | the arm | Documented for the 255 of the 326 non-formation placed units whose arm is in the registry; for the other 71 the arm is read from the id (ART, CAV), a convention not a record, drawn the same way | the registry; the id |
| Standard | a brigade, division or corps record; no arm is claimed | Documented | registry kind |
| Flag size | echelon | Documented | registry kind |
| Code | the short unit code | Documented for units in the order of battle | the registry |
| Italic code | no order-of-battle record | Unknown | 95 placed units |
| Full name | the order of battle's own words, compacted (ordinals as numerals, "Bde", "Div", the trailing parenthesis dropped) | Documented | `designation`; the record label is cut at 24 characters with an ellipsis for 122 of 478 units, so the designation is used |
| Hollow mark | the latest keyframe is a battle day old or more | Computed | ticks since the latest keyframe |
| Count in a flag | placement records in the crowd, never men | Computed | the layout |
| Words on a crowd | what the members share | Computed | the order-of-battle chains |
| Mark position, pin and hairline | where the unit is (and where the mark stands instead) | Modelled | hand-authored keyframes with no basis field; between keyframes an interpolation |
| Strength hairline | this keyframe's strength over the reference strength; a state, not a casualty record | Modelled | the keyframe |
| Motion | the path between keyframes | Modelled | PCHIP through the keyframes |
| Clock | "about 3:35 PM (+-20 min)" | Modelled | the 33-anchor candidate clock, all anchors proposed |
| The ground | a 2022 aerial photograph, lit by 3DEP elevation | Measured, modern | USDA NAIP via USGS (24 April to 10 May 2022), **not the 1863 landscape**; the dock says so on every screen |
| Place names | orientation only; a ring with a gap means the two terrain frames disagree about this place | Modelled | the site's `terrain.json`, in the frame the units were placed in |
| Selection, hover | interface state | Design | |

Nothing on the map says where a unit was more exactly than its keyframes say: every position stays Modelled however crisp the mark.

## 12. Extending it

The look is **a skin module plus a token JSON** of the engine:

- **Tweak a value (no code).** Every number and colour of the skin is a row of `src/skins/quiet-cartographer.spec.mjs` (`[name, value, what it does, { min, max, unit }]`; Appendix A lists every row). Edit it and `node build.mjs`. Or live: `quiet-cartographer.html?skinset={"quiet-cartographer":{"halo.alpha":0.5,"pip.size":12}}`; or in the console `__skinKit.setToken('quiet-cartographer', 'pip.size', 12)` and `__skinKit.exportTokens('quiet-cartographer')` to paste back. A bad value is refused against its own range. `test/skin-d1.test.mjs` fails on a token no drawing code reads.
- **A variant** (colour-blind, high contrast, a third ground) is a set of overrides at the bottom of the spec file (`QC_NIGHT_VARIANTS`, `QC_DAY_VARIANTS`); `defineFamily` registers it as `<id>/<variant>`.
- **A new skin**: copy `src/skins/minimal.mjs` (35 lines) or this skin, change `defineSkin`, add it to `src/skins/index.mjs`. The contract is `src/skins/contract.mjs`; the new part of it in this fork is `sizer` (`defineSkin({ ..., sizer: (skin) => ({ key, leaf, agg }) })`): a skin may size each mark by the detail level, so the layout reserves exactly what is drawn.
- **A new ground**: `registerLook` of the basemap (`src/ground.mjs` registers `qc-night` and `qc-day` from two data objects: the grade of the photograph, the shading, the contours, the roads, the lettering).
- **A new popup**: copy `src/popups/_template.mjs`; its look is already in `quiet.css`.
- **A new arm or echelon**: `drawPip` / `ECH_SCALE` in the skin, and the channel row in `skins/semantics.mjs`.
- **A new naming rule for crowds**: `aggregateName` in `layout/tiles.mjs`.
- **Build**: `node build.mjs` bundles `src/`, the data, the three fonts and the basemap's code and vectors into `quiet-cartographer.html` (2.2 MB, readable source). `python tools/make-fonts.py` and `node tools/measure-text.mjs` make the fonts and the width table. `tokens/tokens.json` is edited by hand in this fork.

## 13. Verification

Every number is from a command that was run on this machine (Windows 11, Chrome 155 headless, an Intel Arc iGPU, node 24). The engine's own checks are used: the independent verifier of `layout/geom.mjs` on every displayed frame, and `tools/check.mjs` (a brute-force routine that shares no code with the engine) on the settled frame.

**Scenes** (`tools/scenes.mjs`, `results/scene-checks.json`; DPR 2, 1440 x 900, the phone 390 x 844):

<!--SCENES-->
| scene | view | marks (in view) | units on the field | crowd standards (units merged) | overlapping cores | pins covered | units unrepresented | smallest gap (px) | frames with a card on a mark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s1a: s1a-opening-field-z13.5-t551.png | 1440x900 @2x, tick 551, zoom 13.5 | 373 (105 in view) | 451 | 28 (106 units) | 0 | 0 | 0 | 1 | 0 |
| s1b: s1b-angle-assault-z15-t556.png | 1440x900 @2x, tick 556, zoom 15 | 379 (84 in view) | 456 | 33 (110 units) | 0 | 0 | 0 | 1 | 0 |
| s2: s2-wheatfield-rose-woods-z15-t295.png | 1440x900 @2x, tick 295, zoom 15 | 303 (60 in view) | 344 | 17 (58 units) | 0 | 0 | 0 | 1 | 0 |
| s3: s3-cemetery-hill-z15.5-t346.png | 1440x900 @2x, tick 346, zoom 15.5 | 360 (69 in view) | 385 | 13 (38 units) | 0 | 0 | 0 | 1 | 0 |
| s4: s4-closeup-selected-z16.5-t551.png | 1440x900 @2x, tick 551, zoom 16.5 | 445 (21 in view) | 451 | 5 (11 units) | 0 | 0 | 0 | 1 | 0 |
| s5: s5-phone-z14.5-sheet-t551.png | 390x844 @2x, tick 551, zoom 14.5 | 321 (28 in view) | 451 | 34 (164 units) | 0 | 0 | 0 | 1 | 0 |
| s6: s6-event-and-story-in-situ-t28.png | 1440x900 @2x, tick 28, zoom 14.5 | 88 (7 in view) | 88 | 0 (0 units) | 0 | 0 | 0 | 1 | 0 |
| s8: s8-hover-tooltip-z16-t551.png | 1440x900 @2x, tick 551, zoom 16 | 414 (45 in view) | 451 | 21 (58 units) | 0 | 0 | 0 | 1 | 0 |
| s7: s7-legend-t60.png | 1440x900 @2x, tick 60, zoom 14.5 | 124 (4 in view) | 126 | 2 (4 units) | 0 | 0 | 0 | 1 | 0 |
<!--/SCENES-->

"Vital core" of a mark here is its whole footprint (everything the skin draws for it lives inside), plus the pin on its true position when it is displaced; this skin has no separate label boxes. In all nine scenes: 0 overlaps, 0 pins covered, 0 units unrepresented, 0 console errors, 0 requests outside this folder and the basemap. Scenes S4, S5, S7 and S8 switch off the event, story and toast cards (`QUIET_CARDS` in `tools/scenes.mjs`; S4 also dismisses the ones already open) so that each picture shows the one card it is about; without that the director opens seven cards at tick 551 (`shots/iterations/it3-selected-closeup-z16.5.jpg`). S6 shows the event and story cards, and all the cards are in `shots/popups/`.

**Sweeps** (`tools/sweep.mjs`: nine zooms x fourteen ticks x two grounds, the camera centred on the densest part of the field at each tick; with and without a selected mark; desktop and phone):

<!--SWEEPS-->
| sweep | settled samples | worst overlapping cores | worst pins covered | worst units unrepresented | engine verifier: frames with an overlap | unrepresented unit-frames | smallest gap in a sampled frame (px; design clearance 1) | views where a settling stage ran out of frames (160 per stage, 200 after a click) before the picture was at rest | frames to rest after the click: median / most (cap 200) | console errors / requests outside the folder |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop 1440x900, DPR 1 | 252 (2 grounds x 9 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 18086 | 0 | 1 | 40 | - | 0 / 0 |
| desktop, a mark selected | 252 (2 grounds x 9 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 35314 | 0 | 1 | 52 | 9 / 200 | 0 / 0 |
| phone 390x844, DPR 2 | 224 (2 grounds x 8 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 16672 | 0 | 1 | 38 | - | 0 / 0 |
| phone, a mark selected | 224 (2 grounds x 8 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 20434 | 0 | 1 | 38 | 7 / 200 | 0 / 0 |
<!--/SWEEPS-->

A sample is checked at the first frame where the picture is at rest, or when a settling stage runs out of frames (160 per stage; 200 after the click). The next-to-last column counts the views where that happened: 38 to 52 views of 224 to 252 were still settling (a crowd's split trial, a mark relaxing), so the independent check ran on a frame in motion, and passed. The smallest gap between two footprints in a sampled frame is the design clearance, exactly 1 px, in all four sweeps (an earlier build of the selection logic showed 0.73 px in frames in motion after a click). The engine's own verifier counted 6,862 pair-frames of the 90,506 frames stepped where two footprints were nearer than 1 px without touching (the 2 px ring bands of the marks keep the ink 4 px apart) and no frame with an overlap.

**Engine tests** (`node --test test/<name>.test.mjs`; the prototype's browser drivers are not carried, `tools/` replaces them):

<!--TESTS-->
| test file | tests | pass | fail | seconds |
| --- | --- | --- | --- | --- |
| test/layout.test.mjs | 12 | 12 | 0 | 11.3 |
| test/display.test.mjs | 20 | 20 | 0 | 41.2 |
| test/interp.test.mjs | 11 | 11 | 0 | 0.1 |
| test/time.test.mjs | 7 | 7 | 0 | 0.1 |
| test/data.test.mjs | 11 | 11 | 0 | 1.3 |
| test/tuning.test.mjs | 8 | 8 | 0 | 0.1 |
| test/extend.test.mjs | 9 | 9 | 0 | 4.9 |
| test/production.test.mjs | 6 | 6 | 0 | 16 |
| test/build.test.mjs | 5 | 5 | 0 | 0.5 |
| test/skin-d1.test.mjs | 11 | 11 | 0 | 2.9 |
| test/rest.test.mjs | 11 | 11 | 0 | 31.4 |
| test/assemble.test.mjs | 17 | 17 | 0 | 62.5 |
| test/popups.test.mjs | 36 | 36 | 0 | 157.8 |
| test/fuzz.test.mjs | 3 | 3 | 0 | 22.3 |
| test/fuzz.test.mjs (12 seeds x 500 actions) | 12 | 12 | 0 | 196.7 |

Total 179 tests, 179 pass, 0 fail (node v24.19.0). `skins.test.mjs` of the prototype tested three skins that are not in this fork and was removed; `skin-d1.test.mjs` replaces it.
<!--/TESTS-->

**Frame pacing** (`tools/pacing.mjs`, real time in the page's own animation loop, popups off, popups-free):

<!--PACING-->
DPR 1 (8 s per row, Chrome/155.0.0.0):

| place | speed | camera | frames per second | frame p95 (ms) | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) | largest one-frame step (px) | overlap frames | unrepresented unit-frames |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cemetery-hill z14 | 1x | still | 60 | 16.8 | 0 % | 5.08 | 0.25 (0) | 15.3 | 0 | 0 |
| cemetery-hill z14 | 1x | moving | 59.9 | 16.7 | 0.2 % | 4.45 | 0 (0) | 12.49 | 0 | 0 |
| cemetery-hill z14 | 4x | still | 60 | 16.8 | 0 % | 4.78 | 0.37 (0) | 16.94 | 0 | 0 |
| cemetery-hill z14 | 4x | moving | 59.9 | 16.8 | 0.2 % | 4.49 | 0 (0) | 14.27 | 0 | 0 |
| rose-woods z14 | 1x | still | 60 | 16.8 | 0 % | 5.32 | 0.37 (0.13) | 19.14 | 0 | 0 |
| rose-woods z14 | 1x | moving | 60 | 16.8 | 0 % | 4.12 | 0.13 (0) | 17.47 | 0 | 0 |
| rose-woods z14 | 4x | still | 60 | 16.8 | 0 % | 4.93 | 1.5 (0.13) | 21.66 | 0 | 0 |
| rose-woods z14 | 4x | moving | 60 | 16.8 | 0 % | 4.49 | 0.37 (0) | 17.47 | 0 | 0 |
| the-angle z15 | 1x | still | 60 | 16.8 | 0 % | 4.83 | 0.38 (0) | 101.83 | 0 | 0 |
| the-angle z15 | 1x | moving | 60 | 16.7 | 0 % | 4.51 | 0.25 (0.13) | 37.77 | 0 | 0 |
| the-angle z15 | 4x | still | 60 | 16.8 | 0 % | 4.95 | 0.62 (0.13) | 44.83 | 0 | 0 |
| the-angle z15 | 4x | moving | 60 | 16.8 | 0 % | 4.52 | 0.38 (0) | 29.47 | 0 | 0 |
| whole-field z13.5 | 1x | still | 59.1 | 16.8 | 1.3 % | 10.62 | 1 (0) | 92.92 | 0 | 0 |
| whole-field z13.5 | 1x | moving | 56.4 | 16.8 | 4.2 % | 8.55 | 0.37 (0) | 27.26 | 0 | 0 |
| whole-field z13.5 | 4x | still | 59.8 | 16.8 | 0.2 % | 8.78 | 0.37 (0) | 93.02 | 0 | 0 |
| whole-field z13.5 | 4x | moving | 57.5 | 16.8 | 2 % | 8.43 | 0.37 (0) | 13.93 | 0 | 0 |

DPR 2 (8 s per row, Chrome/155.0.0.0):

| place | speed | camera | frames per second | frame p95 (ms) | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) | largest one-frame step (px) | overlap frames | unrepresented unit-frames |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cemetery-hill z14 | 1x | still | 60 | 16.7 | 0 % | 5.33 | 0.37 (0) | 20.47 | 0 | 0 |
| cemetery-hill z14 | 1x | moving | 59 | 16.8 | 1.7 % | 4.55 | 0.13 (0) | 31.14 | 0 | 0 |
| cemetery-hill z14 | 4x | still | 60 | 16.8 | 0 % | 4.67 | 0.25 (0) | 32.53 | 0 | 0 |
| cemetery-hill z14 | 4x | moving | 59.8 | 16.8 | 0.4 % | 4.35 | 0 (0) | 38.53 | 0 | 0 |
| rose-woods z14 | 1x | still | 60 | 16.8 | 0 % | 5.31 | 0.37 (0.13) | 19.69 | 0 | 0 |
| rose-woods z14 | 1x | moving | 60 | 16.8 | 0 % | 4.27 | 0 (0) | 7.76 | 0 | 0 |
| rose-woods z14 | 4x | still | 60 | 16.8 | 0 % | 4.81 | 1.13 (0.13) | 70.81 | 0 | 0 |
| rose-woods z14 | 4x | moving | 59.9 | 16.8 | 0.2 % | 4.5 | 0.38 (0) | 67.24 | 0 | 0 |
| the-angle z15 | 1x | still | 60 | 16.8 | 0 % | 4.75 | 1 (0) | 21.57 | 0 | 0 |
| the-angle z15 | 1x | moving | 60 | 16.8 | 0 % | 4.48 | 0.13 (0.13) | 23.6 | 0 | 0 |
| the-angle z15 | 4x | still | 60 | 16.8 | 0 % | 4.66 | 1.5 (0.13) | 68.23 | 0 | 0 |
| the-angle z15 | 4x | moving | 60 | 16.8 | 0 % | 4.4 | 0.5 (0) | 29.23 | 0 | 0 |
| whole-field z13.5 | 1x | still | 60 | 16.8 | 0 % | 6.87 | 0.13 (0) | 17.71 | 0 | 0 |
| whole-field z13.5 | 1x | moving | 45.9 | 49.9 | 17.7 % | 9.19 | 0.87 (0) | 32.83 | 0 | 0 |
| whole-field z13.5 | 4x | still | 60 | 16.8 | 0 % | 7.43 | 0.13 (0) | 15.65 | 0 | 0 |
| whole-field z13.5 | 4x | moving | 48.8 | 33.4 | 12.8 % | 9.3 | 2 (0) | 50.24 | 0 | 0 |

DPR 1, main thread 4x slower (8 s per row, Chrome/155.0.0.0):

| place | speed | camera | frames per second | frame p95 (ms) | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) | largest one-frame step (px) | overlap frames | unrepresented unit-frames |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cemetery-hill z14 | 1x | still | 26.2 | 66.7 | 74.6 % | 22.03 | 4.76 (0) | 40.23 | 0 | 0 |
| cemetery-hill z14 | 1x | moving | 24.9 | 83.3 | 70 % | 23.27 | 2.5 (0) | 52.16 | 0 | 0 |
| cemetery-hill z14 | 4x | still | 29.1 | 66.7 | 63.2 % | 19.05 | 5.1 (0.12) | 38.67 | 0 | 0 |
| cemetery-hill z14 | 4x | moving | 25.9 | 83.3 | 66 % | 22.32 | 5.95 (0) | 60.58 | 0 | 0 |
| rose-woods z14 | 1x | still | 31.8 | 66.7 | 47.2 % | 19.51 | 4.13 (0.38) | 45.86 | 0 | 0 |
| rose-woods z14 | 1x | moving | 29.4 | 66.6 | 58.1 % | 20.67 | 4.86 (0.25) | 51.54 | 0 | 0 |
| rose-woods z14 | 4x | still | 32.1 | 66.6 | 49.6 % | 19.06 | 18.42 (2.86) | 65.44 | 0 | 0 |
| rose-woods z14 | 4x | moving | 26.4 | 83.2 | 58.5 % | 24.22 | 18.34 (2.5) | 74.76 | 0 | 0 |
| the-angle z15 | 1x | still | 31.1 | 66.6 | 61.4 % | 18.74 | 9.73 (2.62) | 51.38 | 0 | 0 |
| the-angle z15 | 1x | moving | 25.3 | 66.7 | 80.3 % | 21.77 | 7.1 (1.25) | 51.38 | 0 | 0 |
| the-angle z15 | 4x | still | 29.8 | 66.6 | 65.7 % | 19.83 | 22.53 (4.48) | 267 | 0 | 0 |
| the-angle z15 | 4x | moving | 25.1 | 66.7 | 77.6 % | 22.65 | 17.88 (3.13) | 321.45 | 0 | 0 |
| whole-field z13.5 | 1x | still | 15.6 | 166.6 | 91.2 % | 44.71 | 2.74 (0) | 46.69 | 0 | 0 |
| whole-field z13.5 | 1x | moving | 14.6 | 166.7 | 93.2 % | 50.06 | 3.98 (0) | 123.62 | 0 | 0 |
| whole-field z13.5 | 4x | still | 14.9 | 166.7 | 85 % | 48.34 | 8.22 (0.87) | 66.85 | 0 | 0 |
| whole-field z13.5 | 4x | moving | 15.8 | 166.7 | 89.8 % | 43.99 | 7.73 (0.87) | 47.55 | 0 | 0 |

A sudden jump is a mark that steps 8 px or more in one frame, at least 3 times its step in the frame before. The camera row "moving" pans and zooms continuously while the battle plays; a marching cavalry unit makes large smooth steps, which are not jumps.
<!--/PACING-->

**Where the time goes** (`tools/probes/engine-ms.mjs --compare`, `results/engine-ms.json`; headless engine, no drawing):

<!--ENGINEMS-->
| scene | marks | engine ms per frame (solve + display layer, no drawing) | of which the layout solve | prototype War Room, same scene |
| --- | --- | --- | --- | --- |
| fresh2 tick 548 zoom 14 | 268 | 5.94 | 4.2 | 168 marks, 3.93 ms (2.74 solving) |
| fresh2 tick 556 zoom 15 | 368 | 4.87 | 2.99 | 310 marks, 5.11 ms (3.04 solving) |
| field tick 620 zoom 13.5 | 379 | 9.07 | 7.18 | 117 marks, 2.44 ms (1.74 solving) |
| carry1 tick 295 zoom 14 | 224 | 4.37 | 3.06 | 143 marks, 3.09 ms (2.17 solving) |

Headless engine, node v24.19.0, 600 frames at 4x after 120 warm-up frames, solve every frame (`tools/probes/engine-ms.mjs --compare`).
<!--/ENGINEMS-->

The opening view is the heavy one. A CPU profile of it (`node --cpu-prof tools/probes/field-prof.mjs`) put 41 % of the whole frame inside the placement search itself: a string key for the de-duplication of the forbidden rectangles, a full sort of every candidate column and row, and a pairwise test of the components with a hypot per pair. The search now filters the forbidden rectangles once per column, de-duplicates through a scratch set, takes its candidates from a lazy heap (the loop stops after the first few) and tests components by squared distance; it returns exactly what the prototype's original returns (40,000 random scenes with ties and duplicates, 0 differences, `tools/probes/nf-diff.mjs`, and a 4,000-scene test in `test/layout.test.mjs`). Measured back to back with the same probe: 20.3 ms per frame before (17.8 of it the solve), 12.3 after, 9.1 on a quiet machine. In real Chrome at DPR 1 the whole field played at 42, 39, 48 and 41 fps in the four rows before and plays at 59, 56, 60 and 58 now; The Angle, Cemetery Hill and the Wheatfield are at 60. At DPR 2 the whole field is 60 fps still and 46 to 49 with the camera moving (the aerial ground repaints at 2880 x 1800). Under the 4x CPU throttle the whole field runs at 15 fps and the other three places at 25 to 32; the solver's cadence governor (a solve every 2nd or 3rd frame) is on in the page, but a solve after three frames of motion costs about 1.5 times a solve after one (headless, whole field: 9.4 ms per frame at cadence 1 and 6.6 at cadence 3, `tools/probes/cadence-probe.mjs`), so it saves a third, not two thirds. Its window is now 45 frames or 0.8 s of slow ones, whichever comes first (at 15 fps it needed 3 s per step). The War Room of the prototype costs 2.4 ms on the same field because it draws 117 boxes where this skin draws 379 marks: that is the price of one small mark per unit, not an accident.

Tried and put back: shrinking `layout.kCap` and `layout.dMaxPx` (the real-Chrome probe `tools/probes/field-ms.mjs` shows frames of 16 to 28 ms instead of 28 to 33, at the price of more crowds and fewer exact places), packing the grid's cell keys into small integers (no measurable change), and removing the velocity that opposes a push in the display layer (no change in the breathing marks of section 9, and a 4 px late step in one view).

**Interface audit** (`tools/audit-dom.mjs`): the smallest font size in every one of 8 interface states is 11 px; every text element was tested against its effective background over the darkest, middle and brightest 5 % of the map pixels (`results/dom-audit.json`):

<!--DOMAUDIT-->
| state | text elements | smallest px | sizes in use (px) | worst contrast over dark / middle / bright map (bar 4.5) | elements below 4.5 | corner radii in use |
| --- | --- | --- | --- | --- | --- | --- |
| night-popups | 49 | 11 | 11.0, 13.0, 16.0 | 8.95 / 8.22 / 7.31 | 0 / 0 / 0 | 10px x12, 6px x17, 4px x7, 0px x1 |
| night-unit-card | 118 | 11 | 11.0, 13.0, 16.0, 22.0 | 8.95 / 8.31 / 7.39 | 0 / 0 / 0 | 10px x11, 6px x17, 4px x7, 0px x1 |
| night-tune | 729 | 11 | 11.0, 13.0 | 6.11 / 5.92 / 5.71 | 0 / 0 / 0 | 10px x7, 6px x28, 4px x7, 0px x1 |
| night-about-legend | 164 | 11 | 11.0, 13.0, 22.0 | 6.12 / 5.92 / 5.70 | 0 / 0 / 0 | 10px x10, 6px x17, 4px x7, 0px x1 |
| night-narration | 65 | 11 | 11.0, 13.0, 22.0 | 6.11 / 5.92 / 5.71 | 0 / 0 / 0 | 10px x8, 6px x15, 4px x7, 0px x1 |
| day-popups | 49 | 11 | 11.0, 13.0, 16.0 | 5.75 / 5.88 / 5.99 | 0 / 0 / 0 | 10px x12, 6px x17, 4px x7, 0px x1 |
| day-unit-card | 118 | 11 | 11.0, 13.0, 16.0, 22.0 | 5.19 / 5.29 / 5.38 | 0 / 0 / 0 | 10px x11, 6px x17, 4px x7, 0px x1 |
| day-about-legend | 164 | 11 | 11.0, 13.0, 22.0 | 5.17 / 5.32 / 5.39 | 0 / 0 / 0 | 10px x10, 6px x17, 4px x7, 0px x1 |
<!--/DOMAUDIT-->

The seven 4 px radii are the buttons inside the speed switch (concentric with its 6 px outline); the one 0 px is the reading rail docked to the window edge.

**Lettering fits its footprint** (`tools/textfit.mjs`): for every code (95 italic, the roman ones), every compacted name (260) and every formation lettering (243) the width Chrome measures is below the width the layout reserved (the worst ratio is 0.9565); QC Sans lacks none of the 67 characters of the data.

## 14. Limits and what was not done

- One machine, Chrome 155 headless; no phone, no Safari, no Firefox, no screen reader. The 4x CPU throttle is a stand-in for a phone, not a phone.
- The 1863 landscape is not drawn: the ground is a 2022 photograph; the product's 1863 roads, rivers and breastworks are product data and are not reproduced. The basemap's own findings stand: the legacy place frame puts Culp's Hill 731 m from its summit.
- At the opening zoom 13.5 a unit mark has no code and a brigade standard has no name (progressive disclosure); the hover card names it. A reader who wants every name at the overview would need bigger footprints, hence more crowds.
- The interface uses four type sizes (11, 13, 16, 22 px), not two; the map uses two.
- The day ground's relief is quieter than the night ground's; the day variant was verified for contrast, less looked at than the night one.
- After a pause the layout can still be relaxing a displaced mark by a few pixels toward its true place; the page sleeps when nothing moves, so a later interaction may show that last step (measured once, in an earlier build: one mark, 2.6 px over the next 40 frames; section 9, `test/rest.test.mjs`).
- Selecting a mark at zoom 15 or more reflows its neighbours (8 to 40 marks); below zoom 15 nothing moves. The breathing of marks after a selection (a feedback loop between the displayed offsets and the solver) is avoided below zoom 15, not fixed above it.
- Union and Confederate differ by lightness 1.52 : 1 at night and 1.57 : 1 by day: in greyscale only the arm (shape) and the hatching of the unknown side carry a second cue (`shots/cvd-night.png`).
- On a CPU four times slower than this machine the whole field runs at 15 fps and the other places at 25 to 32; on a retina display the camera in motion over the whole field is 46 to 49 fps (section 13).
- The data labels the artillery battalion `C-ART-III-2` "Heth's Div" while its designation says McIntosh's Battalion; the marks use the designation (a data quirk reported, not corrected).
- The first two rounds of this work were done while the picture viewer returned no image for many of my reads (the tool answered "request limit"); those rounds were driven by the data, the measured numbers and the pictures that did display. `ITERATIONS.md` says which.
- `compare-z15.png` of the first prototype was never displayed to me; the brief's list of what is wrong with it was my only description of it. I compared against the prototype's own `app-war-room-fresh2-z15-paper.png` (`shots/compare-first-prototype-vs-quiet.png`).

## 15. The five strongest and the five weakest things

Written last, from the numbers above and the pictures, not from the intention.

**Strongest**

1. **One small mark per unit, and the guarantee that holds it up.** At the opening zoom 451 units stand on 373 marks, 28 of them counted crowd standards (106 units); every unit is one mark or is inside a counted standard, never dropped. 0 overlapping marks, 0 covered pins and 0 unrepresented units in the nine scenes, in 952 independently checked sweep samples (two grounds, nine zooms, fourteen ticks, with and without a selected mark, desktop and phone), and in 90,506 engine-verified frames. A crowd says only what its members share ("Both sides", "II Corps +2"), never an engagement the data does not record.
2. **Lettering that holds on a photograph without a box.** Haloed 11 and 13 px lettering: the worst of 35 ground bands per ground is 6.22 : 1 at night and 4.98 : 1 by day against a bar of 4.5, marks are 3.18 and 3.59 against 3, 0 failures in six skins, and no text of the interface falls under 4.5 : 1 over the darkest, middle or brightest map in eight states (the worst is 5.17). Nothing is dashed, nothing is under 11 px.
3. **Honesty written into the pixels.** Every encoding carries an evidence label (section 11), the legend is drawn by the skin's own `sample()` so it cannot drift from the picture, the unknown side is a neutral hatch and never a guessed colour, the hollow mark is a continuous function of a computed age, and the ground says on every screen that it is a 2022 aerial.
4. **Calm motion that stops.** Every ease is one critically damped step with its time constant in a table; an arrival is a settle, never a bounce; all nine scenes come to rest within 375 frames where the prototype's skins never do in two and take 1,000 frames or more in two more; a click below zoom 15 moves 0 marks in all 15 probed views (it moved 46 to 105 before this round); 12 seeds of 500 random actions of the fuzz test leave no overlap.
5. **One language from the mark to the last popup.** All twelve popups of the Overlay Director are restyled by one stylesheet (two radii, one curve, evidence as a dot and a word, the legend fixed so that it opens), anchored to what they describe and never on a mark: `cards.over` is 0 in every frame of every scene.

**Weakest**

1. **The opening view says little.** At zoom 13.5 a unit is a bare pip and a brigade standard has no name; codes arrive at 14, names at 16. To know which regiment a pip is, the viewer must hover. 28 crowd standards at the opening view stand for 106 of the 451 units behind a count. This is the cost of one small mark per unit and of the calm.
2. **The two sides are told apart by hue and a little lightness.** The greyscale luminance ratio is 1.52 : 1 at night and 1.57 : 1 by day; in greyscale only the arm and the hatching help. A second cue (a mirrored flag, a notch) would fix it and was not tried.
3. **Slow machines.** On a CPU four times slower than this one the whole field runs at 15 fps and the other places at 25 to 32; on a retina display the camera in motion over the whole field is 46 to 49 fps. The engine is 2.2 times cheaper than it was and the field is at 56 to 60 fps here, but a skin that draws 379 marks costs 9.1 ms in the engine where the prototype's 117 boxes cost 2.4.
4. **Four interface type sizes and a few off-scale radii.** The map has two sizes and one numeral style, as asked; the interface has 11, 13, 16 and 22 px, and its speed switch has a third radius (4 px, concentric). The brief said two sizes.
5. **A click at zoom 15 and above still reflows.** The selected mark grows its name and the layout makes room: 8 to 40 marks move, one view takes 527 frames to be still, and the breathing found earlier (a feedback loop between the displayed offsets and the solver) is only avoided below zoom 15, not cured. One reviewer, one machine, no phone, and the day ground looked at less than the night ground are limits of the checking, listed in section 14.

## Appendix A. The token file

<!--TOKENS-->
60 rows (the night values; the day and variant overrides are at the bottom of the spec file):

| token | default | range | what it does |
| --- | --- | --- | --- |
| `color.union` | `#62a6ff` | colour | Union: the pip, the flag and the count disc.  Azure, light enough to read on a dark aerial |
| `color.confederate` | `#e4522a` | colour | Confederate: vermilion.  Blue against vermilion is the colour-blind-safe pair of Okabe and Ito in spirit (not their exact values) |
| `color.unknown` | `#e3e8ee` | colour | Side UNKNOWN (10 ids whose id prefix and state code disagree, Contested): the ink colour of the ground, hatched, never a side colour.  Neutral on purpose: it stays apart from both sides under every colour-vision type |
| `color.ink` | `#f6f9fc` | colour | Lettering of unit codes and numerals |
| `color.tintUnion` | `#d3e5ff` | colour | Lettering of a Union formation (the formation name is soft, haloed, tinted with its side) |
| `color.tintConfederate` | `#ffdccd` | colour | Lettering of a Confederate formation |
| `color.tintUnknown` | `#f2f5f9` | colour | Lettering of a formation of unknown side |
| `color.tintMixed` | `#eef1f4` | colour | Lettering of an aggregate of both sides, or of a side that is not one formation |
| `color.halo` | `#070b11` | colour | The dark halo behind every letter, the dark hairline round a pip and the dark glass of a carried-forward mark (on the DAY ground this is paper white) |
| `color.ring` | `#f7fafd` | colour | The light ring of a fresh pip and the staff of a standard (on the DAY ground this is dark ink) |
| `color.select` | `#ffffff` | colour | The selection ring and the fainter hover ring, in the margin of the footprint |
| `color.numeral` | `#ffffff` | colour | The count inside a standard: always light, with its own dark halo, on both grounds (the flag fill is mid-tone, so the halo carries the contrast) |
| `color.numeralHalo` | `#0a1118` | colour | The dark halo of that count |
| `halo.width` | 2.4 | 0 to 6 px | Width of the halo stroke behind lettering |
| `halo.alpha` | 0.66 | 0 to 1 | Opacity of the halo stroke |
| `halo.soft` | 0.3 | 0 to 0.6 | Opacity of the second, wider halo that softens the first |
| `halo.plate` | 0 | 0 to 0.6 | Opacity of the glass behind a mark (one rounded fill inside the footprint; costs about 3 ms per frame for 350 marks, so it is 0, lettering only, on the night ground and 0.2 on the day ground) |
| `text.dimAlpha` | 0.74 | 0.3 to 1 | Opacity of lettering when the mark is carried forward (a fix a battle day old or more) |
| `pip.size` | 11 | 7 to 16 px | Width of the pip, ring included.  Infantry is a disc, cavalry a diamond, artillery a triangle |
| `pip.gap` | 4 | 2 to 8 px | Space between the pip and its lettering |
| `pip.ring` | 1.25 | 0.5 to 2.5 px | Width of the light ring round a fresh pip (it becomes the side colour when the mark is carried forward) |
| `pip.hairlineAlpha` | 0.62 | 0.2 to 1 | Opacity of that hairline (the DAY ground uses a paper-white one at a higher opacity) |
| `pip.hairline` | 0.9 | 0 to 2 px | Width of the dark hairline outside the ring: the contrast guarantee on a pale ground |
| `unit.h` | 14 | 12 to 20 px | Height of the body of a unit mark (the footprint adds the selection band on each side) |
| `name.gap` | 6 | 3 to 12 px | Space between a unit code and its full name when the name has grown in |
| `name.alpha` | 0.82 | 0.4 to 1 | Opacity of the grown-in full name (the code stays full) |
| `flag.w` | 15 | 10 to 24 px | Width of a standard (the flag of a formation or of an aggregate), notch included |
| `flag.h` | 11 | 8 to 18 px | Height of the flag of a brigade standard; a division flies 12 % taller, a corps 26 % taller |
| `flag.notch` | 3.5 | 0 to 7 px | Depth of the swallow-tail |
| `flag.staff` | 5 | 0 to 12 px | How far the staff runs below the flag |
| `flag.gap` | 5 | 2 to 10 px | Space between a standard and its lettering |
| `flag.padX` | 3.5 | 1 to 6 px | Space round the count inside a flag that has to widen for two digits |
| `formation.h` | 20 | 16 to 26 px | Height of the body of a formation or aggregate mark |
| `detail.corpsNameZoom` | 11 | 10 to 18 zoom | From this zoom a corps (and an aggregate of one) says its name |
| `detail.divisionNameZoom` | 12.5 | 10 to 18 zoom | From this zoom a division (and an aggregate of one) says its name |
| `detail.brigadeNameZoom` | 14 | 10 to 18 zoom | From this zoom a brigade (and an aggregate of one) says its name |
| `detail.scopeZoom` | 14.5 | 10 to 18 zoom | From this zoom an aggregate that stands for several formations of one side, or for both sides, says so in words |
| `detail.codeZoom` | 14 | 10 to 18 zoom | From this zoom a unit pip carries its short code (below it a pip is bare: the hover and the card say which unit it is) |
| `detail.selectGrowZoom` | 15 | 10 to 18 zoom | From this zoom a selected mark grows its name (and a unit its strength hairline) and the layout makes room for it; below it the selection is a ring (the crowd standard that stands for a hidden unit gets the ring) and nothing moves, so selecting never re-flows a crowded overview |
| `detail.selectNameMinViewport` | 560 | 320 to 2000 px | A selected mark grows its full name only when the window is at least this wide (px); on a phone the card carries the name and the mark stays small |
| `detail.unitNameZoom` | 16 | 14 to 18 zoom | From this zoom a unit says its full name: the same mark grows, there is no second box |
| `detail.hullZoom` | 12 | 11 to 18 zoom | From this zoom an aggregate shows the true positions of the units it stands for |
| `carried.hollow` | 0.86 | 0 to 1 | How far a carried-forward pip or flag hollows: 0 = no change, 1 = fully hollow with a side-coloured ring |
| `gauge.h` | 3 | 1 to 4 px | Thickness of the strength hairline (Modelled: this keyframe's strength over the unit's reference strength; a state, not a casualty record) |
| `gauge.w` | 22 | 12 to 40 px | Length of the strength hairline that joins a SELECTED unit mark after its name |
| `gauge.gap` | 7 | 3 to 14 px | Space between the name and the strength hairline |
| `gauge.trackAlpha` | 0.3 | 0 to 0.8 | Opacity of the empty part of the hairline |
| `hull.dot` | 2.3 | 1 to 4 px | Radius of the dot on the true position of one unit an aggregate stands for (shown while the aggregate is hovered or selected) |
| `hull.leader` | 0.75 | 0 to 1 | Opacity of the hairlines from an aggregate to its units while it is hovered or selected |
| `pin.zoom0` | 12.5 | 10 to 18 zoom | Below this zoom the pins and hairlines of displaced marks are hidden (a whole-field view would be a chain of beads); hover and selection still show them.  12.5 keeps them on at the opening zoom of the site, 13.5, so a displaced mark never hides that it is displaced there |
| `pin.zoom1` | 13.2 | 10 to 18 zoom | At this zoom and above they are fully shown (they fade in between the two) |
| `pin.r` | 2.4 | 1 to 4 px | Radius of the true-position ring |
| `leader.width` | 1 | 0.5 to 2 px | Width of the hairline from the true position to its mark |
| `leader.alpha` | 0.78 | 0 to 1 | Opacity of that hairline |
| `pin.minPx` | 18 | 0 to 40 px | A pin and its leader are drawn only when the true position lies more than this far outside the mark (hovering or selecting a mark always shows them) |
| `sel.radius` | 7 | 2 to 12 px | Corner radius of the selection ring |
| `sel.width` | 1.5 | 1 to 3 px | Width of the selection ring |
| `hover.plate` | 0.18 | 0 to 0.5 | Extra glass behind the mark on hover |
| `motion.selectMs` | 140 | 0 to 600 ms | Ease of the selection ring (critically damped) |
| `motion.hoverMs` | 90 | 0 to 600 ms | Ease of the hover state |
<!--/TOKENS-->
