# The Quiet Cartographer: the design language

Art director 1 of the Battle Studio redesign, polish round 1. Apple Maps, Mapbox Studio, Swiss cartography and Eduard Imhof as the references; calm as the luxury. This is the specification of the design that is built in this folder (`quiet-cartographer.html` and `src/`), written after the pictures were made, so every rule below is a rule the pictures obey, and every number is a number a script printed (the scripts are in `tools/` and `test/`; the raw results are in `results/`). Round 0 was scored by three hostile critics (`../jury/critic-1.md` to `critic-3.md`) at 5 to 9 per line, 5 on the opening view; the fixes they required, and the others this round found, are in `ITERATIONS.md` (the last section).

How to look: `node tools/serve.mjs` then open `http://127.0.0.1:10020/d1-quiet-cartographer/quiet-cartographer.html` (the page finds the 9 MB of aerial tiles in `../basemap/assets/`; nothing else is requested; it opens on the day atlas, `?style=night` for the night ground). Start with `shots/round-1/s1a-opening-field-z13.5-t551.png` and its two crops, then `shots/round-1/specimen-day.png` (every mark and state), then the other scenes; `shots/round-1/compare-first-prototype-vs-quiet.png` is the same tick and camera before and after.

The sections: 1 principles, 2 grid, 3 type, 4 colour, 5 symbol anatomy, 6 states, 7 formation and crowd marks, 8 level of detail, 9 motion, 10 popups and the interface, 11 what is Documented and what is Modelled in every encoding, 12 extending it, 13 verification, 14 limits, 15 the five strongest and five weakest things. Appendix A is the token table, generated from the token file; the same tokens as JSON, with the interface's own, are in `tokens/skin-tokens.json`.

## 1. Principles

1. **One object per unit, standing on the unit.** A unit is one mark: a pip (its shape says the arm, its colour says the side) whose centre IS the unit's position, with its short code hung beside it. A formation is a flag on a staff whose foot IS its position. There is no caption chip and no outline: the lettering carries its own halo (no glass behind a resting mark, on either ground; round 0 had a faint one on the day ground). The full name is never a second box: when the map is zoomed in, or the mark is selected, **the same mark grows** and the name takes the place of the code inside the footprint the layout already reserved. Round 0 hung the box on the unit, so a pip stood up to half a box from its place; the layout now hangs the box on the pip (`layout/tiles.mjs`, `scene/display.mjs`) and a test (`test/skin-d1.test.mjs`) holds the pip on the true position, at rest and while a name grows.
2. **The armies face each other.** A Union mark reads from its pip to the right (a swallow-tail flag flying right), a Confederate mark from its pip to the left (a pointed flag flying left, the lettering to the left of the pip). Side is therefore told by hue, by direction and by the end of the flag: it survives a greyscale print, a colour-blind viewer and a pip too small to tell by colour. Round 0 had the hue and a little lightness only (a greyscale ratio of 1.5 : 1); critics 1 and 3 called it the weakest cue of the design.
3. **Hierarchy from size, weight and lightness only.** Three levels: formation marks (a flag, with a division or corps in bold 13 px, a brigade in semibold 12 px, both tinted with the side) over unit marks (a pip with a semibold 12 px code in full ink) over secondary detail (regular 12 px tails, hairlines). The flag grows with the echelon (1, 1.14, 1.3). No outline, no border, no shadow ranks anything.
4. **A halo, not a box.** Everything that must be read on a photograph is lettering with a soft halo (dark on the night ground, ivory on the day ground). Marks carry one hairline of the opposite lightness so they hold on any ground.
5. **Restraint is the luxury.** Nothing dashed, nothing glowing, nothing under 11 px, no colour that is not a side or an evidence label. The interface is neutral ink; the only saturated colours on screen are the two armies, the six evidence words, the small mark on a card that says what kind of card it is, and the event marks on the timeline. A pin and a hairline to the true place are drawn only for the mark you point at or select (round 0 drew them at rest, and two of three critics read them as wiring).
6. **A crowd is a standard, never a pile, and it always says what it stands for.** Marks that cannot stand clear of each other merge into one standard that carries the count and, from zoom 12, the words for what the members share; hovering or selecting it draws a hairline to the true position of every unit it stands for. No unit is ever dropped, and no number ever stands alone for hidden units.
7. **One device for "not a fresh report".** The mark hollows: a side-coloured ring round tinted glass, a pale flag with a side-coloured edge. The hue stays (never grey: grey means unknown), the lettering stays at full strength, and it is a continuous function of the age of the unit's latest keyframe, so nothing pops.
8. **Every pixel says what it knows.** Side, arm, echelon and identity are Documented; fix age and counts are Computed; position, strength and motion are Modelled; the 10 units of unknown side are Contested; 95 units known by their id alone are Unknown. The legend is drawn by the skin itself, so it cannot drift from the picture (section 11), and it opens with a figure of the marks at true size.
9. **Nothing hides under the interface.** The map is what the bars leave free: a mark that reaches into a control group of the top bar, into the dock or into the side panel dissolves over the last 16 px before it, like a mark at the edge of a scrolled map, and the opening scenes are framed so that few do (section 13 counts them).

## 2. Grid

All lengths are CSS px at 1x; the page draws at the device pixel ratio.

| Thing | Size | Token or source |
|---|---|---|
| Unit mark: body height | 14 px; footprint 18 px (a 2 px band on every side, which is where the selection ring lives) | `unit.h`, `FOOT.ring` in `quiet-cartographer.mjs` |
| Pip | 11 px across, ring 1.25 px (1.9 px when hollow), dark hairline 0.9 px outside it; its centre is the unit's position | `pip.size`, `pip.ring`, `pip.ringHollow`, `pip.hairline` |
| Pip to code | 4 px; name to strength hairline 7 px (the name replaces the code, it is not set beside it) | `pip.gap`, `gauge.gap` |
| Standard (brigade) | flag 15 x 11 px, a 3.5 px swallow-tail (Union) or point (Confederate), a 1.5 px staff running 5 px below the flag, the foot of the staff is the unit's position; body height 20 px, footprint 24 px | `flag.*`, `staff.width`, `formation.h` |
| Echelon | the flag grows: brigade 1, division 1.14, corps 1.3 times | `ECH_SCALE` |
| Clearance between two footprints | 1 px (so at least 5 px between the inks of two marks) | `layout.gapPx` |
| Displacement budget | a mark stands at most 56 px from its true position, else it merges | `layout.dMaxPx` |
| Interface spacing | 4 px grid (4, 8, 12, 16, 24, 32) | `studio.css` |
| Radii | 6 px for a control, 10 px for a surface; the seven buttons inside the speed switch are 4 px (concentric: its 6 px outline minus 2 px of padding); a rail docked to the window edge has none; a pill nowhere | `quiet.css` `--r1`, `--r2` |
| Hairline | 1 px at 9 to 13 % of the ink | `quiet.css` `--edge` |
| Chrome | four pills on top (brand and clock, Day / Night, Showcase, then Auto tour / ? / Chronicle and four icons, which are two joined pills); a dock of one row and the evidence line, 82 px high with no event chip (94 px from the window's bottom edge, which is the margin the renderer keeps) | `quiet.css` section 9 |

The footprint is the contract with the layout: the certified layout (the engine's, unchanged in principle) places these boxes so that no two overlap, and the skin draws nothing outside its own box (`test/skin-d1.test.mjs` checks the width holds every part, for all 478 units at six zooms; `tools/textfit.mjs` checks the real text against the reserved widths).

## 3. Type

One face, **QC Sans**: four static instances (Regular 400, SemiBold 600, Bold 700, Italic 400) of **Source Sans 3** (Adobe, Paul D. Hunt; SIL Open Font License 1.1), cut from the variable fonts of the Google Fonts repository (`github.com/google/fonts`, `ofl/sourcesans3`: two TTFs and `OFL.txt`, fetched once, 1.0 MB; the licence is in `assets/fonts/LICENSE-Source-Sans-3-OFL.txt`), subset to the 389 glyphs the page uses (Basic Latin, Latin-1, Latin Extended-A and the punctuation and arrows) and renamed because the licence reserves the name "Source". The files are `assets/fonts/QCSans-Regular.woff`, `-SemiBold.woff`, `-Bold.woff` and `-Italic.woff` (about 18 KB each), embedded in the page as data URIs; `python tools/make-fonts.py <folder>` rebuilds them. Round 0 set the map in Liberation Sans, an Arial clone: Source Sans 3 is drawn for small text, has the same x-height at 12 px as Liberation at 11 px and is narrower (a 12 px SemiBold `71 PA` is 28.4 px wide, round 0's 11 px Bold one 30.6 px), so the lettering is larger and the marks hold as many, and has a real SemiBold. WOFF (zlib), not WOFF2: no Brotli encoder was installed.

| Where | Cut | Size | Used for |
|---|---|---|---|
| Map, level 1 | Bold | 13 px | the name of a division or a corps (and of a crowd of them), tinted with its side |
| Map, level 1 | SemiBold | 12 px | the name of a brigade or a battalion (and of a crowd of them), tinted with its side |
| Map, level 2 | SemiBold | 12 px | the short code of a unit; its full name, which replaces the code from zoom 16 (or on a selected mark); the count inside a flag |
| Map, level 2 | Italic | 12 px | the code of a unit known by its id alone (no order-of-battle record) |
| Map, level 3 | Regular | 12 px | the tail of a crowd's words (", 3 unlisted", ", 1 contested") |
| Ground | Regular, Italic | 11 px | place names (upright), road names (upright, along the road), stream names (italic) |
| Interface | Regular, SemiBold, Bold | 11, 13, 17 px | 11 labels and notes, 13 body and controls, 17 every title (card, rail, narration) |

The map uses **two sizes and one numeral style** (semibold; the figures are tabular enough that a count changes the width of its flag by at most a digit). The interface uses **three** sizes (round 0: four, 11, 13, 16, 22; two critics counted it against the design); `tools/audit-dom.mjs` finds exactly 11, 13 and 17 px in every one of 8 interface states and 11 px as the minimum. Place names are upright and muted where round 0 set them in italic (the same italic as a unit known by its id alone: critics 3 and 1 could tell them apart only by a ring).

## 4. Colour and its contrast tests

Colours are tokens (`src/skins/quiet-cartographer.spec.mjs`, and as JSON in `tokens/skin-tokens.json`). The two grounds have their own palettes: **day** (a pale atlas sheet in the Swiss manner: ivory paper, relief lit from the north-west with cool grey-blue shadows, thin brown contours; the page opens on it) and **night** (slate relief); each has a colour-blind-safe variant and a high-contrast variant: six skins, ids `quiet-cartographer-day`, `/cvd`, `/contrast`, `quiet-cartographer`, `/cvd`, `/contrast`.

| Role | Day | Night |
|---|---|---|
| Union pip | `#1a58c4` | `#62a6ff` |
| Union flag cloth (white count: 6.5 : 1 day, 4.85 : 1 night) | `#1a58c4` | `#2d6fd3` |
| Confederate pip | `#d2441a` | `#e4522a` |
| Confederate flag cloth (white count 5.1 : 1) | `#c4401a` | `#c4401a` |
| Unknown side (Contested): the ink of the ground, hatched, never a side colour | `#2a323b` | `#e3e8ee` |
| Unit code and name ink | `#14202c` | `#f6f9fc` |
| Formation lettering, Union / Confederate | `#17418f` / `#8a2307` | `#d3e5ff` / `#ffdccd` |
| Halo | `#fbf8f0` (2.4 px at 90 %, then a wider soft one at 30 %) | `#070b11` (2.4 px at 66 %, then the soft one) |
| Pip ring and staff | `#142231` | `#f7fafd` |
| Glass inside a hollow mark | `#fbf8f0` at 90 %, tinted 16 % with the side colour | `#070b11` at 72 %, tinted 30 % |
| Ground (paper / relief) | `#efebe1` | `#0a0d10` |

Why these: Union against Confederate is blue against vermilion (the colour-blind-safe pair of Okabe and Ito in spirit, not their exact values); the flags are a deeper tone than the pips so that the white count inside them holds 4.5 : 1 without a box; and since greyscale lightness separates the armies by only 1.4 to 1.5 : 1 (listed under the weak points), the second cue is geometric: facing and the end of the flag. The unknown side stays the neutral ink of the ground with hatching: it is apart from both armies under every vision type, and grey means unknown, never old. A hollow mark is the side colour on tinted glass: the first version of round 0 dimmed the lettering of a stale mark to 74 %, and reading the pictures found the stale crowds illegible; the lettering of a stale mark is now at full strength and only the ring and the flag carry the age.

The tests (`tools/contrast.mjs`, results in `results/contrast.json`). The ground is rendered by the page's own backdrop code at five real views per ground and its pixel luminance is read at the 1st, 5th, 25th, 50th, 75th, 95th and 99th percentile; lettering is tested against **its own halo composited over every one of those bands** (the letters sit on the halo, not on the photograph); the count in a flag is tested against the flag's own cloth (no halo), and in a hollow flag against the tinted glass over the ground; marks are tested as non-text against their hairline over the bands, and the two sides are tested apart under simulated colour-vision deficiency (Machado, Oliveira and Fernandes 2009 matrices as the symbology job's colour module has them, severity 1.0, linear RGB). The bars are 4.5:1 for lettering (WCAG 1.4.3 applied to the map), 3:1 for marks (WCAG 1.4.11) and CIEDE2000 20 between the sides (this project's own bar, not a WCAG number).

<!--CONTRAST-->
| skin | worst lettering over 35 ground bands (bar 4.5) | worst mark over 35 bands (bar 3) | smallest CIEDE2000 between any two of the three sides, over four vision types (bar 20) | greyscale luminance ratio, Union against Confederate | verdict |
| --- | --- | --- | --- | --- | --- |
| night | 4.85 (count in a union flag, fresh) | 3.18 (pip ring confederate (carried)) | 25.1 (Union vs Confederate 49.1) | 1.52 : 1 | pass |
| night/cvd | 4.73 (count in a union flag, fresh) | 4.10 (pip ring confederate (carried)) | 25.9 (Union vs Confederate 49.2) | 1.14 : 1 | pass |
| night/contrast | 6.03 (count in a confederate flag, fresh) | 4.67 (pip ring confederate (carried)) | 25.4 (Union vs Confederate 47.1) | 1.15 : 1 | pass |
| day | 5.13 (count in a confederate flag, fresh) | 3.95 (pip ring confederate (carried)) | 22.2 (Union vs Confederate 47.7) | 1.42 : 1 | pass |
| day/cvd | 6.00 (count in a confederate flag, fresh) | 3.48 (pip ring confederate (carried)) | 20.5 (Union vs Confederate 48.6) | 1.68 : 1 | pass |
| day/contrast | 7.00 (count in a confederate flag, fresh) | 6.04 (pip ring confederate (carried)) | 21.4 (Union vs Confederate 44.9) | 1.39 : 1 | pass |

6 skins; 0 failing checks. The ground bands are in the result file (five views per ground, seven percentiles each).
<!--/CONTRAST-->

What these numbers are not: the halo is modelled analytically (halo colour over the ground band, with the two strokes combined), not read back from rendered pixels around each glyph; the colour-vision simulation is software, not people (`shots/round-1/cvd-day.png` shows it); and "worst band" is the worst of 35 sampled bands per ground, not every pixel. The flag cloth is not tested as a mark against its hairline: a flag is bounded by its own light (night) or dark (day) edge, and that edge, the same colour as a pip ring, is what the mark test measures.

## 5. Symbol anatomy

`shots/round-1/specimen-day.png` and `specimen-night.png` draw every mark with the skin's own code on real units, at 1x to 3x; the legend of the page opens with a figure of them at true size (`popups/legend.mjs`, drawn by `figure()` of the skin).

- **Unit mark** = pip + code, hung from the pip. The pip is a disc (infantry), a diamond (cavalry) or a triangle (artillery); the data has no other arm, and a formation record has none (it is a standard). Fresh: light ring, solid side colour. The code is semibold 12 px, `71 PA`, haloed. A Union mark reads pip, then code (to the right); a Confederate mark reads code, then pip (the code to the left of the pip, right-aligned on it). The pip is the unit's position: `pipX = box centre - sgn x (width / 2 - 7.5)` and the layout solves for the box that puts it there (`test/skin-d1.test.mjs`: a mark that is not displaced stands within the engine's own 1.5 px of its true position, for 3 zooms; during the 80 frames in which a name grows, the pip does not move by more than 0.05 px).
- **Standard** = staff + flag + words. The foot of the staff is the position; the flag flies from its top: a Union flag to the right, ending in a swallow-tail; a Confederate flag to the left, ending in a point; a flag for the unknown side is cut square and hatched. The words are tinted with the side: a brigade or a battalion in semibold 12 px, a division or a corps in bold 13 px. A crowd's flag carries its **count** in white semibold 12 px inside the cloth (the flag widens for two digits) and its words after it (section 7). A flag for both sides is split on the diagonal, Union at the staff, Confederate at the fly, and only a crowd that really holds Union and Confederate units gets it.
- **Grown mark.** At zoom 16 a unit's full name takes the place of its code (semibold 12 px, the same cut; the code fades out as the name fades in from the same place, 160 to 180 ms). Round 0 printed both, `82 NY  82nd New York Infantry`, and critic 2 called the code redundant. Selected, a mark grows from zoom 15 up (`detail.selectGrowZoom`; on a window narrower than 560 px it does not: the card has the name) and gains the **strength hairline**: a 22 x 3 px rounded bar, filled to this keyframe's strength over the unit's reference strength. The hairline exists only on a selected mark; a row of hairlines on every mark read as dashes in the first renders.
- **Pin and hairline.** Only for the mark you point at or select: a small ring on the true position and a 1 px hairline from it to the mark's pip, when they are more than 3.5 px apart. Never at rest. The pin is a keep-out for every other mark all the time (the layout guards the true position, `layout/engine.mjs` `pinRect`), so nothing covers it. The legend says that a mark may stand up to 56 px from its place and that pointing at it shows where.
- **Selection** is a 1.5 px ring in the footprint's own 2 px band; **hover** is a 1 px ring at half opacity. Neither changes the layout below zoom 15 (and on a narrow window never): nothing moves, and a unit that stands inside a crowd is shown by the ring on the crowd's standard and the hairlines to its members. From zoom 15 on a wide window the selected mark grows its name, takes the top placement priority and the layout makes room for it (section 9, Selecting).
- **Codes** are the data's `short`, with two repairs made in the skin and never in the data: where the data cut a code at 8 characters (`Zimmerma`, `Alexande`, `McGilver`) and the unit's own id says the rest, the id's word is used; and a Union battery's id, which is its letter, its regiment and its state run together, is set apart (`A1RI` as `A/1 RI`, `9MA` as `9 MA Bty`, `1NYIND` as `1 NY Ind`).
- **Place names** (the real ground's 41 marks) are upright, muted and set around the marks, never under them and never across the edge of the rail or sheet: each name tries four slots against the footprints and the interface, keeps the one it has while it stays free, and fades out and elsewhere when it is taken. A name that finds no slot is not shown; a unit never is dropped.

## 6. States

| State | Drawn as | Evidence |
|---|---|---|
| Fresh fix (latest keyframe under half a battle day, 112 ticks) | solid pip or saturated flag, light ring | Computed from the keyframe age |
| Carried forward (a battle day, 225 ticks, or more) | hollow pip: a 1.9 px side-coloured ring round tinted glass; a pale flag with a side-coloured edge and its count in ink; lettering unchanged | Computed |
| In between | a continuous blend (a smoothstep over 112 to 225 ticks), so nothing pops | Computed |
| Identity from the id alone (no order-of-battle record) | italic code | Unknown |
| Side unknown (10 ids whose prefix and state code disagree) | neutral ink colour with hatching; never a side colour; a crowd holding some says ", 2 contested" | Contested |
| Both sides in one standard | flag split on the diagonal; the lettering says "Both sides" | Computed |
| Displaced | a pin and a hairline, for the mark pointed at or selected (section 5) | Modelled |
| Selected | ring + name + strength hairline | Design |
| Hover | faint ring; the tooltip card opens after its delay | Design |
| Entering, leaving, travelling | section 9 | Design |

Posture (charging, retreating, line of march ...) and arm state (limbered, dismounted) exist in the data as Modelled values authored per keyframe (28 duplicate keys disagree). **This skin does not draw them**: they are not vital and every extra glyph is noise; they are in the inspector. The Union corps badges of the prototype's 1863 skin are not drawn either: the formation names carry the corps ("2nd Div, 2nd Corps"). This is a design choice, said here once.

## 7. Formation and crowd marks

A standard stands for a formation record (brigade, division, corps) or for a crowd. The words on a crowd are what its members share, from the order of battle and nothing else (`layout/tiles.mjs`, `aggregateName` and `scopeName`; round 0's "Contact" and "lead + k", which the review of the first pitch flagged as claiming an engagement the data does not record, were already gone, and "II Corps +2", which a critic found cryptic, is now words):

| Members | Lettering | Tail (regular, after the name) | Count |
|---|---|---|---|
| Both Union and Confederate units | "Both sides" | ", 2 contested" when some have an unknown side | plain number of placement records |
| One brigade, division or corps | its order-of-battle name ("Harrow's Bde", "2nd Div, 2nd Corps"), or its short code when the order of battle has none | ", 1 contested" when one member's side is unknown | plain number |
| Several formations of one side | the corps they belong to, read from their chains: "II Corps", "I, III Corps", "3 corps" when more than three | ", 3 unlisted" for the members the order of battle gives no parent (units known by their id alone); ", unlisted" when none has one ("Confederate, unlisted"); ", 1 contested" | plain number |

The data cuts 25 of the 157 formation labels at 24 characters with an ellipsis ("3rd Bde, 3rd Div, 1st C…"); the crowd standards that stand for those formations use the designation, compacted as the marks do (a test compares all 157). The count is **records, never men** (Computed). A crowd says its words from zoom 12 (`detail.crowdNameZoom`): a number alone never stands for hidden units. Hovering or selecting a standard draws a hairline from the foot of its staff to the true position of every unit it stands for, each with a small dot (`detail.hullZoom`, 12). The footprint of a crowd standard is the same kind of box as any other, so the layout treats it like any other mark: merging is the layout's guaranteed fallback and happens only when a unit cannot stand within 56 px of its true position without touching a neighbour, so the more a mark says (a code at the opening zoom, the words of a crowd) the more crowds the opening view has (section 8).

## 8. Level of detail

Progressive disclosure as a map does it. A unit is always drawn; its words come with the scale, and from the opening zoom every mark says what it is.

| From zoom | A unit mark | A formation or standard |
|---|---|---|
| any | the pip, bare | the flag, bare |
| 11 | | a corps names itself |
| 12 | | a crowd says what its units share |
| 12.5 | | a division names itself |
| 13 | **the short code appears** (the site opens at 13.5) | a brigade names itself |
| 16 | the full name replaces the code | |
| selected | name and strength hairline from zoom 15 (wide windows); below 15 only the ring, and nothing else moves (section 9, Selecting) | its name from zoom 15 |

All of these are tokens (`detail.*`). The footprint changes with the detail level, and the layout solves with the detail it will draw. The cost, measured (`tools/probes/tok-probe.mjs`): at the opening scene, tick 551 at zoom 13.5, round 0 (codes from 14, nothing named) drew 373 marks of which 28 were crowds standing for 106 of 451 units; with a code on every pip and words on every crowd the view has 198 marks, 54 of them crowds standing for 307 units (68 %): the first view says what it shows, and says it about fewer units one by one. Critic 1 asked for codes everywhere "or merge into named standards"; critic 3 asked for "fewer, more specific crowd standards": the two cannot both be had at 1440 px, and this is the choice made (the unit codes of the 144 marks standing alone are on the picture; each crowd names its formation).

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
- **A growing name does not move the pip.** The layout reserves the box for the size the mark will have and hangs it on the pip, and the display layer moves the box's centre by half of the width still to grow (`display.mjs` `cOff`), so the pip stands on the unit's place through the whole growth, in either army's direction: `test/skin-d1.test.mjs` follows a Confederate pip through 80 frames of a name growing and it moves by less than 0.05 px.
- **A mark that must move far** does not shove through the crowd: it dims to 42 % over about 60 ms, glides there (time constant 60 ms) and solidifies on arrival (140 ms); while it is dim it neither obscures nor is obscured. A mark that must make room is eased aside by at most 1.5 px per pass, never shoved.
- **Selection** ring 140 ms, **hover** ring 90 ms, **a name growing** 180 ms, **a code appearing with the zoom** 160 ms: all the same critically damped ease, the same curve in and out.
- **The camera** glides (zoom 180 ms, pan 120 ms time constants) and the ground under it is the basemap's own frame-cached painter, so the marks and the ground move together. `shots/strip-march.png` is a march at 4x; `strip-select.png` is a selection.
- **The interface** uses one curve, `cubic-bezier(.2, .72, .2, 1)`, at 140, 240 and 380 ms.
- **Reduced motion** (the engine's `motion.reduced`, which follows the system setting): fades 60 ms, no glide, the skin's own eases land at once.
- **Settling.** A paused picture comes to rest. This was measured, and the engine had a defect found on the way: in some dense scenes two or three displaced marks stood perfectly still but kept the engine "busy" for ever (a sub-pixel deadlock between a glide and a push; all three prototype skins showed it in at least one of the probed scenes), so the page redrew every frame while paused. The display layer now settles a mark by stagnation (`display.mjs`, 8b). Measured with `tools/rest-times.mjs` (4 s of 4x play, pause, frames until the engine is idle):

<!--REST-->
| scene | tick | zoom | Quiet Cartographer | prototype war-room | prototype field-manual | prototype map-1863 |
| --- | --- | --- | --- | --- | --- | --- |
| fresh2 | 548 | 14 | 351 (5.8 s) | 379 (6.3 s) | 355 (5.9 s) | never (30 s) |
| fresh2 | 556 | 15 | 280 (4.7 s) | never (30 s) | 1397 (23.3 s) | 242 (4 s) |
| field | 620 | 13.5 | 247 (4.1 s) | 224 (3.7 s) | 337 (5.6 s) | 136 (2.3 s) |
| carry1 | 295 | 14 | 365 (6.1 s) | 450 (7.5 s) | 320 (5.3 s) | 336 (5.6 s) |
| evening1 | 120 | 14 | 169 (2.8 s) | 190 (3.2 s) | 274 (4.6 s) | 133 (2.2 s) |
| fresh1 | 451 | 16 | 306 (5.1 s) | 305 (5.1 s) | 1052 (17.5 s) | 305 (5.1 s) |
| field | 226 | 13.5 | 375 (6.3 s) | 368 (6.1 s) | 375 (6.3 s) | 381 (6.3 s) |
| field | 538 | 14 | 335 (5.6 s) | 435 (7.3 s) | 384 (6.4 s) | 380 (6.3 s) |
| field | 620 | 12 | 412 (6.9 s) | 227 (3.8 s) | 198 (3.3 s) | 239 (4 s) |

Frames (at 60 per second) until `engine.busy()` is false; the probe gives up at 1,800 frames. The right-hand columns are the same probe on the same scenes with the three skins of the prototype (its own engine, read-only).
<!--/REST-->

In the final build all nine scenes rest within 412 frames (6.9 s; round 0: 375), two of the prototype's three skins never rest in one scene each and the third takes 1,397 and 1,052 frames in two others. The slowest here is the whole field at zoom 12 (412 frames), where there are most crowds. Round 0 had one outlier (`carry1`, tick 295, zoom 14: 1,120 frames, a displaced mark relaxing at 20 px/s) that disappeared when the widths of 25 crowd names changed; it stays away (365 frames) after this round's changes of width, nobody found why, and `test/rest.test.mjs` therefore bounds the rest at 600 frames and says so.

- **Selecting.** The engine gives the selected unit the top placement priority so that it stands at its true place. That re-orders the greedy placement, so at an overview a single click dissolved crowds and shifted 46 to 105 marks (`tools/probes/select-motion.mjs`; first measured at zoom 11 to 13.5), and in two of 21 views four marks of a crowd kept breathing by 0.7 px at about 5 Hz for ever (the layout's inertia reads the displayed offsets back, a loop with a delay in it). This skin therefore asks the layout for the priority only when the selection changes what must be reserved: from zoom 15 on a wide window (`sizer.selects`, `layout/tiles.mjs`). Below that the click draws a ring and moves nothing. The same probe on the final build:

<!--SELECT-->
| zoom | marks that moved more than a quarter pixel after one click (ticks 620 / 346 / 551) | largest one-frame step in the first second (px) | last frame with any step of 0.05 px or more (-1 = nothing ever moved) | largest step after frame 300 (px) |
| --- | --- | --- | --- | --- |
| 11 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 12 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 13 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 13.5 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 14 | 0 / 0 / 0 | 0.0 | -1 | 0.00 |
| 15 | 7 / 0 / 0 | 0.4 | 245 | 0.00 |
| 16.5 | 3 / 1 / 3 | 9.9 | 116 | 0.00 |

The mark nearest the middle of the view is selected after the picture has been at rest; 900 frames are watched (headless engine, the final dials; `tools/probes/select-motion.mjs`).
<!--/SELECT-->

From zoom 15 the selected mark grows its name, and since the name now REPLACES the code the box grows by about 100 px where round 0's grew by 130: the reflow is smaller. At zoom 15, 7, 0 and 0 marks moved by more than a quarter pixel after one click (ticks 620, 346, 551; round 0: 40, 8, 14) and at zoom 16.5 3, 1 and 3; all 21 probed views are still by frame 245 (round 0: the last by frame 527) and nothing moves by 0.05 px or more after frame 300. The sweeps below click a mark at every zoom and report the frames to rest.

## 10. Popups and the interface

All twelve popups of the Overlay Director are still there, with their content and purpose unchanged (the text is the same verbatim data; `src/popups/*` logic untouched except where this section says). They are restyled by one stylesheet, `src/ui/quiet.css`, loaded after the prototype's two, which only overrides: three type sizes (11, 13, 17 px), two radii, one curve, evidence as a dot and a word, and a kicker, a title and a hairline on every card. The director's guarantee is unchanged: a card is placed on free ground against the exact footprints of the marks, and a card with no free ground becomes a chip in the Chronicle strip.

| Popup (module) | In the Quiet Cartographer | Picture |
|---|---|---|
| Event card (`event-card`) | paper (day) or glass (night) card, a small tone mark and the word in the kicker (`CRITICAL`, 11 px), the chronology sentence at 13 px, the place and the units named as quiet rows, the evidence as a dot and a word, a hairline leader to the unit | `shots/round-1/popups/01`, `s6-...` |
| Story card (`story-card`) | the same card; the whole story opens in the reading rail (the map makes room, a bottom sheet on a phone) | `popups/02`, `18` |
| Command toast, cross-out (`command-toast`, `command-crossout`) | the same card at toast width; the old commander struck through in the muted ink, the successor beneath | `popups/01`, `03` |
| Unit card and hover tooltip (`unit-card`) | name at 17 px, strength as a 2 px hairline over its numbers, the commander with its evidence label; width 340 px; **a brigade, division or corps card no longer prints "infantry"** (those records have no arm: the card said what the loader's default said) | `popups/04`, `05`, `s4`, `s8` |
| Auto tour (`tour`) | in the rail, stops as dots; the two grounds are steps "Day ground" and "Night ground" | `popups/06` |
| Day banner (`day-banner`) | a card with the day, the tick range, two evidence labels | `popups/07` |
| Clock (`clock-hud`) | a small card: the date, "about 3:35 PM", the uncertainty, a progress ring (3 px), the word Modelled | in every scene |
| Legend (`legend`) | opens in the reading rail (round 0: a 19-row floating card that found no free ground), **and now opens with a figure**: a unit, a formation, a crowd and a carried-forward unit drawn at true size by the skin's own code, Union at the left reading rightward and Confederate at the right reading leftward, each with one sentence; the rows below are the skin's own drawing, one per encoding, with the evidence label | `s7`, `popups/` |
| Overview map (`minimap`) | the same glass, the marks as dots in the side colours; off on a phone | in the desktop scenes |
| Hints (`hints`) | one-time cards with a kicker; "?" opens the keys and the evidence labels in the rail | `popups/06`, `s8` |
| Chronicle (`chronicle`) | the strip chips are 6 px rectangles with a hairline, the list is in the rail; the strip shows in the dock only while it holds an event chip (the top bar has the Chronicle button) | `popups/08` |
| Narration (welcome, tours, toasts of the tour director) | one glass surface, kicker in sentence case, 17 px title, live numbers in 13 px | `popups/09`, `10` |

**The chrome** (`quiet.css`, `studio.mjs`). The top bar is four pills instead of eleven buttons: brand and clock (one surface), Day / Night, Showcase, then "Auto tour | ? | Chronicle" and four icons (two joined pills). The ground control says "Day" and "Night" (round 0: "Night survey", "Day atlas" next to a "Standard" menu and "Before / After", words two critics called development language; the variant menu and Before / After are now the first rows of the Tune tab, and the metrics button shows only with `?dev=1`). The dock is one row of transport, speed and timeline plus the evidence line, 82 px high (round 0: four rows, 230 px, a quarter of the screen). On a phone (under 760 px) the top is one row (clock, ground, Showcase) and the dock two rows plus the evidence line; a selected unit opens its card as a **peek** in the bottom sheet (kicker and title, 92 px; the handle pulls it up), so the map keeps 70 % of the screen (round 0: 45 %); the overview map is off.

**Anchoring.** Every card points at what it describes (a leader hairline to the tile, a ring with a gap at an approximate place, an edge arrow when the subject is off screen) and is drawn **beneath** the marks, so a mark always paints over the leader; the subject ring sits inside the mark's own 2 px band; on the day ground the ink of a leader has a paper underlay (round 0's dark rope under a hairline was the heaviest line of the page). A card read in the phone's bottom sheet draws no leader across the map. `tools/scenes.mjs` and the engine's popup tests check that no card lies on a mark: in the nine scenes, `cards.over` is 0 in every frame.

**The edge of the map.** The map is what the bars leave free. Each control group of the top bar, the dock and the side panel is a rectangle (`engine.chromeRects`); a mark whose footprint comes within 16 px of one dissolves (smoothstep) and is gone when it touches it, and the reading rail or sheet does the same at its edge; the gaps between the controls stay open map, and a place name is never set across any of these edges. Round 0 let the bars cut marks in half ("Battery B, 1st Rhode Island Artille|"), which three critics counted as hidden vital information.

## 11. What is Documented, Computed, Modelled, Contested or Unknown in every encoding

The evidence vocabulary is the site's six labels (Documented, Measured, Computed, Modelled, Contested, Unknown) plus **Design** for interface state that makes no claim about the battle. The legend rows and their labels are in `skins/semantics.mjs` and are rendered by the skin's own `sample()` (a test fails if a row has no label or is longer than 84 characters).

| Encoding | Says | Label | Source |
|---|---|---|---|
| Colour (Union, Confederate) | the side | Documented | the order of battle, or the id prefix for ids it does not list |
| Facing (Union reads rightward, Confederate leftward), end of the flag (swallow-tail, point) | the side again, for a viewer who cannot tell the colours | Documented | the same |
| Neutral hatched colour | side unknown | Contested | 10 ids whose prefix and state code disagree (`sideFlag`) |
| Pip shape | the arm | Documented for the 255 of the 326 non-formation placed units whose arm is in the registry; for the other 71 the arm is read from the id (ART, CAV), a convention not a record, drawn the same way | the registry; the id |
| Standard | a brigade, division or corps record; no arm is claimed (the card no longer says "infantry") | Documented | registry kind |
| Flag size | echelon | Documented | registry kind |
| Code | the short unit code (a cut word repaired from the id; a Union battery's id set apart) | Documented for units in the order of battle | the registry; the id |
| Italic code | no order-of-battle record | Unknown | 95 placed units |
| Full name | the order of battle's own words, compacted (ordinals as numerals, "Bde", "Div", the trailing parenthesis dropped) | Documented | `designation`; the record label is cut at 24 characters with an ellipsis for 122 of 478 units, so the designation is used |
| Hollow mark | the latest keyframe is a battle day old or more | Computed | ticks since the latest keyframe |
| Count in a flag | placement records in the crowd, never men | Computed | the layout |
| Words on a crowd, and ", 3 unlisted" / ", 1 contested" | what the members share, how many the order of battle gives no parent, how many have an unknown side | Computed | the order-of-battle chains and `sideFlag` |
| Where the pip stands | the unit's position | Modelled | hand-authored keyframes with no basis field; between keyframes an interpolation |
| Pin and hairline | where a displaced mark's unit really is | Modelled | the same |
| Strength hairline | this keyframe's strength over the reference strength; a state, not a casualty record | Modelled | the keyframe |
| Motion | the path between keyframes | Modelled | PCHIP through the keyframes |
| Clock | "about 3:35 PM (+-20 min)" | Modelled | the 33-anchor candidate clock, all anchors proposed |
| The ground | a 2022 aerial photograph, lit by 3DEP elevation | Measured, modern | USDA NAIP via USGS (24 April to 10 May 2022), **not the 1863 landscape**; the dock says so on every screen |
| Place names | orientation only; a ring with a gap means the two terrain frames disagree about this place | Modelled | the site's `terrain.json`, in the frame the units were placed in |
| Selection, hover | interface state | Design | |

Nothing on the map says where a unit was more exactly than its keyframes say: every position stays Modelled however crisp the mark. The pip now stands ON the modelled position where round 0's box only contained it; a mark that cannot stand there (a neighbour is in the way) stands up to 56 px away and says so when pointed at, and otherwise merges into a counted standard.

## 12. Extending it

The look is **a skin module plus a token JSON** of the engine:

- **Tweak a value (no code).** Every number and colour of the skin is a row of `src/skins/quiet-cartographer.spec.mjs` (`[name, value, what it does, { min, max, unit }]`; Appendix A lists every row, and `tokens/skin-tokens.json` is the same table as JSON with the day overrides, the four variants and the interface's own tokens, generated by `node build.mjs`). Edit the spec and `node build.mjs`. Or live: `quiet-cartographer.html?skinset={"*":{"halo.alpha":0.5,"pip.size":12}}` (`"*"` is every skin of the family; or the id of one); or in the console `__skinKit.setToken('quiet-cartographer-day', 'pip.size', 12)` and `__skinKit.exportTokens('quiet-cartographer-day')` to paste back. A bad value is refused against its own range. `test/skin-d1.test.mjs` fails on a token no drawing code reads.
- **A variant** (colour-blind, high contrast, a third ground) is a set of overrides at the bottom of the spec file (`QC_NIGHT_VARIANTS`, `QC_DAY_VARIANTS`, `QC_DAY`); `defineFamily` registers it as `<id>/<variant>`.
- **A new skin**: copy `src/skins/minimal.mjs` (35 lines) or this skin, change `defineSkin`, add it to `src/skins/index.mjs`. The contract is `src/skins/contract.mjs`; the parts of it new in this fork are `sizer` (`defineSkin({ ..., sizer: (skin) => ({ key, leaf, agg }) })`: a skin may size each mark by the detail level, so the layout reserves exactly what is drawn, and may return `dx, dy, sgn` so the box hangs on the unit's position and the display layer keeps the anchor still while the box grows) and `figure(c, g, w)` (the legend's figure).
- **A new ground**: `registerLook` of the basemap (`src/ground.mjs` registers `qc-day` and `qc-night` from two data objects: the grade of the photograph, the shading, the contours, the roads, the lettering; `?lookday={...}` merges a data object into the day look for an experiment).
- **A new popup**: copy `src/popups/_template.mjs`; its look is already in `quiet.css`.
- **A new arm or echelon**: `drawPip` / `ECH_SCALE` in the skin, and the channel row in `skins/semantics.mjs`.
- **A new naming rule for crowds**: `aggregateName` and `scopeName` in `layout/tiles.mjs`.
- **Build**: `node build.mjs` bundles `src/`, the data, the four font faces and the basemap's code and vectors into `quiet-cartographer.html` (2.2 MB, readable source). `python tools/make-fonts.py <folder>` and `node tools/measure-text.mjs` make the fonts and the width table.

## 13. Verification

Every number is from a command that was run on this machine (Windows 11, Chrome 155 headless, an Intel Arc iGPU, node 24), on a machine shared with other agents' browser captures and test runs: timings are slower and noisier than in round 0 and are labelled where they matter. The engine's own checks are used: the independent verifier of `layout/geom.mjs` on every displayed frame, and `tools/check.mjs` (a brute-force routine that shares no code with the engine) on the settled frame.

**Scenes** (`tools/scenes.mjs`, `results/scene-checks.json`; the page's default day ground, DPR 2, 1440 x 900, the phone 390 x 844; each camera shifted by the pan that `tools/probes/frame-search.mjs` found to leave the fewest marks under the interface):

<!--SCENES-->
| scene | view | marks (in view) | units on the field | crowd standards (units merged) | overlapping cores | pins covered | units unrepresented | smallest gap (px) | marks on the interface / within 16 px of it (dissolved) | frames with a card on a mark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s1a: s1a-opening-field-z13.5-t551.png | 1440x900 @2x, tick 551, zoom 13.5 | 198 (162 in view) | 451 | 54 (307 units) | 0 | 0 | 0 | 1 | 12 / 22 | 0 |
| s1b: s1b-angle-assault-z15-t556.png | 1440x900 @2x, tick 556, zoom 15 | 394 (98 in view) | 456 | 25 (87 units) | 0 | 0 | 0 | 1 | 5 / 8 | 0 |
| s2: s2-wheatfield-rose-woods-z15-t295.png | 1440x900 @2x, tick 295, zoom 15 | 311 (91 in view) | 344 | 15 (48 units) | 0 | 0 | 0 | 1 | 2 / 4 | 0 |
| s3: s3-cemetery-hill-z15.5-t346.png | 1440x900 @2x, tick 346, zoom 15.5 | 369 (68 in view) | 385 | 9 (25 units) | 0 | 0 | 0 | 1 | 4 / 7 | 0 |
| s4: s4-closeup-selected-z16.5-t551.png | 1440x900 @2x, tick 551, zoom 16.5 | 448 (32 in view) | 451 | 3 (6 units) | 0 | 0 | 0 | 1 | 1 / 1 | 0 |
| s5: s5-phone-z14.5-sheet-t551.png | 390x844 @2x, tick 551, zoom 14.5 | 329 (33 in view) | 451 | 41 (163 units) | 0 | 0 | 0 | 1 | 2 / 6 | 0 |
| s6: s6-event-and-story-in-situ-t28.png | 1440x900 @2x, tick 28, zoom 14.5 | 88 (48 in view) | 88 | 0 (0 units) | 0 | 0 | 0 | 1 | 0 / 0 | 0 |
| s7: s7-legend-t60.png | 1440x900 @2x, tick 60, zoom 14.5 | 126 (60 in view) | 126 | 0 (0 units) | 0 | 0 | 0 | 1 | 0 / 0 | 0 |
| s8: s8-hover-tooltip-z16-t551.png | 1440x900 @2x, tick 551, zoom 16 | 420 (34 in view) | 451 | 21 (52 units) | 0 | 0 | 0 | 1 | 0 / 1 | 0 |
<!--/SCENES-->

"Vital core" of a mark here is its whole footprint (everything the skin draws for it lives inside), plus the pin on its true position when it is displaced; this skin has no separate label boxes. In all nine scenes: 0 overlaps, 0 pins covered, 0 units unrepresented, 0 console errors, 0 requests outside this folder and the basemap. The night ground (s1a, s2, s4: `results/scene-checks-night.json`) and the colour-blind-safe and high-contrast variants (s2: `scene-checks-cvd.json`, `scene-checks-contrast.json`) were rendered and checked the same way: 0 overlaps, 0 pins covered, 0 unrepresented. The next-to-last column is the honest count of the interface: **marks that lie on a control, the dock or the panel (they are dissolved, not cut) / marks within the 16 px before one (partly dissolved)**; it is not zero because the field is taller than the part of a 900 px window the bars leave free at zoom 13.5; the opening scene keeps 12 marks of 162 in view under the interface (before framing: 21), and the close-ups one or none. Scenes S4, S5, S7 and S8 switch off the event, story and toast cards (`QUIET_CARDS` in `tools/scenes.mjs`; S4 also dismisses the ones already open) so that each picture shows the one card it is about. S6 shows the event and story cards, and all the cards are in `shots/round-1/popups/`.

**Sweeps** (`tools/sweep.mjs`: nine zooms x fourteen ticks x two grounds, the camera centred on the densest part of the field at each tick; with and without a selected mark; desktop and phone):

<!--SWEEPS-->
| sweep | settled samples | worst overlapping cores | worst pins covered | worst units unrepresented | engine verifier: frames with an overlap | unrepresented unit-frames | smallest gap in a sampled frame (px; design clearance 1) | views where a settling stage ran out of frames (160 per stage, 200 after a click) before the picture was at rest | frames to rest after the click: median / most (cap 200) | console errors / requests outside the folder |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop 1440x900, DPR 1 | 252 (2 grounds x 9 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 21242 | 0 | 1 | 60 | - | 0 / 0 |
| desktop, a mark selected | 252 (2 grounds x 9 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 39052 | 0 | 0.8 | 76 | 44 / 200 | 0 / 0 |
| phone 390x844, DPR 2 | 224 (2 grounds x 8 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 19654 | 0 | 1 | 54 | - | 0 / 0 |
| phone, a mark selected | 224 (2 grounds x 8 zooms x 14 ticks) | 0 | 0 | 0 | 0 of 24334 | 0 | 1 | 54 | 7 / 200 | 0 / 0 |
<!--/SWEEPS-->

A sample is checked at the first frame where the picture is at rest, or when a settling stage runs out of frames (160 per stage; 200 after the click). The next-to-last column counts the views where that happened: a crowd's split trial, a mark relaxing, or the reflow after a click at zoom 15 or 16 was still going, so the independent check ran on a frame in motion, and passed. The smallest gap between two footprints in a sampled frame is the design clearance, exactly 1 px, in three of the four sweeps; in the desktop sweep with a selected mark one view (zoom 15, tick 346, both grounds) was still reflowing when its 200 frames ran out and showed a pair 0.8 px apart (touching never, overlapping never): the same limit as round 0, which reached 1 px only after a fix of the selection logic that this round did not change. More views run out of their frames than in round 0 (60 of 252 in the desktop sweep against 40, 76 against 52 with a mark selected), and the wait after a click is longer: median 44 frames (round 0: 9), 184 at zoom 15, 134 at zoom 16, and in some views at zoom 11 to 13 up to 200. A control run of the same views (zoom 11, 12, 13, 15, 16 x six ticks, day ground; `results/rest-after-click-*.json`) gives the median frames to rest after a click: round 0's tree 7.5 / 24 / 7 / 140.5 / 60; this build 28 / 22.5 / 49.5 / 191 / 132.5; this build with the codes and crowd words held back to zoom 14 (as round 0 had them) 28 / 43 / 7 / 191 / 132.5. At zoom 13 the new lettering is the cause (7 without it); at zoom 15 and 16 the result is the same without it, so it is not the lettering. My reading, not tested further: a name now grows to one side of the pip (rightward for Union, leftward for Confederate) where round 0's box grew to both sides of the unit, so the neighbours are pushed up to twice as far and relax back at the engine's 20 px per second. The rest probe (section 9) says every one of its nine scenes rests within 412 frames, and `select-motion` that nothing moves by 0.05 px after frame 245 in any of 21 views, so it is longer to rest, not a motion that never stops. The engine's own verifier counted the pair-frames in which two footprints were nearer than 1 px without touching (the `clearanceViolations` of each result file; the 2 px ring bands of the marks keep the ink 4 px apart) and no frame with an overlap.

**Engine tests** (`node --test test/<name>.test.mjs`; the prototype's browser drivers are not carried, `tools/` replaces them):

<!--TESTS-->
| test file | tests | pass | fail | seconds |
| --- | --- | --- | --- | --- |
| test/layout.test.mjs | 12 | 12 | 0 | 11.5 |
| test/display.test.mjs | 20 | 20 | 0 | 49.2 |
| test/interp.test.mjs | 11 | 11 | 0 | 0.1 |
| test/time.test.mjs | 7 | 7 | 0 | 0.1 |
| test/data.test.mjs | 11 | 11 | 0 | 1.4 |
| test/tuning.test.mjs | 8 | 8 | 0 | 0.1 |
| test/extend.test.mjs | 9 | 9 | 0 | 6.1 |
| test/production.test.mjs | 6 | 6 | 0 | 17 |
| test/build.test.mjs | 5 | 5 | 0 | 0.6 |
| test/skin-d1.test.mjs | 12 | 12 | 0 | 4.6 |
| test/rest.test.mjs | 11 | 11 | 0 | 30.7 |
| test/assemble.test.mjs | 17 | 17 | 0 | 66.5 |
| test/popups.test.mjs | 36 | 36 | 0 | 187.4 |
| test/fuzz.test.mjs | 3 | 3 | 0 | 23.1 |
| test/fuzz.test.mjs (12 seeds x 500 actions) | 12 | 12 | 0 | 210.6 |

Total 180 tests, 180 pass, 0 fail (node v24.19.0). `skins.test.mjs` of the prototype tested three skins that are not in this fork and was removed; `skin-d1.test.mjs` replaces it.
<!--/TESTS-->

New in this round (`test/skin-d1.test.mjs`): the pip stands within the engine's 1.5 px of the true position in three views and does not move by more than 0.05 px while a name grows over 80 frames; both armies reserve the same width and hang to opposite sides of their position; the name replaces the code and is never printed beside it; a standard says "Both sides" only for Union and Confederate units; a crowd's words are a corps or a side with an optional tail of the two forms ", 3 unlisted" and ", 2 contested". Round 0's naming test failed on the new words and was rewritten; `test/assemble.test.mjs` expects the two ground steps of the tour in the order Day, Night.

**Frame pacing** (`tools/pacing.mjs`, real time in the page's own animation loop, popups off):

<!--PACING-->
DPR 1 (8 s per row, Chrome/155.0.0.0):

| place | speed | camera | frames per second | frame p95 (ms) | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) | largest one-frame step (px) | overlap frames | unrepresented unit-frames |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cemetery-hill z14 | 1x | still | 59.5 | 16.8 | 0.4 % | 6.33 | 0.13 (0) | 17.11 | 0 | 0 |
| cemetery-hill z14 | 1x | moving | 60 | 16.8 | 0 % | 5.12 | 0 (0) | 10.91 | 0 | 0 |
| cemetery-hill z14 | 4x | still | 60 | 16.8 | 0 % | 6.05 | 0.13 (0) | 25.99 | 0 | 0 |
| cemetery-hill z14 | 4x | moving | 59.9 | 16.8 | 0.2 % | 5.52 | 0 (0) | 37.4 | 0 | 0 |
| rose-woods z14 | 1x | still | 60 | 16.8 | 0 % | 5.2 | 0.25 (0) | 17.81 | 0 | 0 |
| rose-woods z14 | 1x | moving | 60 | 16.8 | 0 % | 4.47 | 0.25 (0) | 38.14 | 0 | 0 |
| rose-woods z14 | 4x | still | 60 | 16.8 | 0 % | 4.94 | 1.5 (0) | 96.72 | 0 | 0 |
| rose-woods z14 | 4x | moving | 60 | 16.8 | 0 % | 4.83 | 0.62 (0) | 38.32 | 0 | 0 |
| the-angle z15 | 1x | still | 60 | 16.8 | 0 % | 5.71 | 0.62 (0) | 27.79 | 0 | 0 |
| the-angle z15 | 1x | moving | 60 | 16.8 | 0 % | 5.49 | 0.13 (0) | 17.98 | 0 | 0 |
| the-angle z15 | 4x | still | 60 | 16.8 | 0 % | 5.76 | 1.12 (0.13) | 46.7 | 0 | 0 |
| the-angle z15 | 4x | moving | 60 | 16.8 | 0 % | 5.69 | 0.37 (0) | 29.06 | 0 | 0 |
| whole-field z13.5 | 1x | still | 60 | 16.8 | 0 % | 5.77 | 0 (0) | 4.05 | 0 | 0 |
| whole-field z13.5 | 1x | moving | 60 | 16.8 | 0 % | 4.75 | 0 (0) | 10.24 | 0 | 0 |
| whole-field z13.5 | 4x | still | 60 | 16.8 | 0 % | 5.2 | 0 (0) | 14.27 | 0 | 0 |
| whole-field z13.5 | 4x | moving | 60 | 16.8 | 0 % | 5.06 | 0.13 (0) | 19.07 | 0 | 0 |

DPR 2 (8 s per row, Chrome/155.0.0.0):

| place | speed | camera | frames per second | frame p95 (ms) | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) | largest one-frame step (px) | overlap frames | unrepresented unit-frames |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cemetery-hill z14 | 1x | still | 60 | 16.8 | 0 % | 5.47 | 1.62 (0) | 16.9 | 0 | 0 |
| cemetery-hill z14 | 1x | moving | 59.4 | 16.8 | 1.1 % | 4.75 | 0.13 (0) | 16.85 | 0 | 0 |
| cemetery-hill z14 | 4x | still | 60 | 16.8 | 0 % | 5.1 | 0.37 (0) | 41.98 | 0 | 0 |
| cemetery-hill z14 | 4x | moving | 59.5 | 16.8 | 0.8 % | 5.15 | 0 (0) | 11.29 | 0 | 0 |
| rose-woods z14 | 1x | still | 60 | 16.8 | 0 % | 5.03 | 0.62 (0) | 37.75 | 0 | 0 |
| rose-woods z14 | 1x | moving | 60 | 16.8 | 0 % | 4.34 | 0.13 (0) | 38.28 | 0 | 0 |
| rose-woods z14 | 4x | still | 60 | 16.8 | 0 % | 5.22 | 1.12 (0) | 92.41 | 0 | 0 |
| rose-woods z14 | 4x | moving | 60 | 16.8 | 0 % | 4.57 | 0.63 (0) | 38.12 | 0 | 0 |
| the-angle z15 | 1x | still | 60 | 16.8 | 0 % | 5.53 | 0.5 (0) | 23.63 | 0 | 0 |
| the-angle z15 | 1x | moving | 60 | 16.8 | 0 % | 5.63 | 0.25 (0) | 19.55 | 0 | 0 |
| the-angle z15 | 4x | still | 60 | 16.8 | 0 % | 6.05 | 0.75 (0) | 41.28 | 0 | 0 |
| the-angle z15 | 4x | moving | 59.8 | 16.8 | 0.4 % | 6.36 | 0.5 (0) | 29.06 | 0 | 0 |
| whole-field z13.5 | 1x | still | 59.4 | 16.8 | 0.6 % | 4.69 | 2.88 (2.75) | 57.69 | 0 | 0 |
| whole-field z13.5 | 1x | moving | 57.3 | 16.8 | 2 % | 4.71 | 0.5 (0) | 20.62 | 0 | 0 |
| whole-field z13.5 | 4x | still | 60 | 16.8 | 0 % | 4.35 | 3.88 (0) | 16.71 | 0 | 0 |
| whole-field z13.5 | 4x | moving | 55 | 16.8 | 4.1 % | 4.68 | 0.5 (0) | 28.24 | 0 | 0 |

DPR 1, main thread 4x slower (8 s per row, Chrome/155.0.0.0):

| place | speed | camera | frames per second | frame p95 (ms) | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) | largest one-frame step (px) | overlap frames | unrepresented unit-frames |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cemetery-hill z14 | 1x | still | 27.8 | 66.8 | 65.5 % | 21.56 | 4.86 (0.5) | 36.99 | 0 | 0 |
| cemetery-hill z14 | 1x | moving | 26.3 | 83.3 | 65.4 % | 21.84 | 3.36 (0) | 57.55 | 0 | 0 |
| cemetery-hill z14 | 4x | still | 24.4 | 83.3 | 81.6 % | 23.37 | 5.85 (0.25) | 86.43 | 0 | 0 |
| cemetery-hill z14 | 4x | moving | 22.3 | 99.9 | 79 % | 26.16 | 6.2 (0.51) | 74.3 | 0 | 0 |
| rose-woods z14 | 1x | still | 26.7 | 66.7 | 70.4 % | 21.85 | 8.78 (0) | 120.83 | 0 | 0 |
| rose-woods z14 | 1x | moving | 26.9 | 83.3 | 63 % | 22.28 | 6.74 (0) | 120.89 | 0 | 0 |
| rose-woods z14 | 4x | still | 25.6 | 83.4 | 65.9 % | 23.88 | 24.33 (3.49) | 130.49 | 0 | 0 |
| rose-woods z14 | 4x | moving | 22.5 | 99.9 | 74.4 % | 27.59 | 20.88 (2.75) | 58.14 | 0 | 0 |
| the-angle z15 | 1x | still | 24.9 | 66.7 | 79 % | 24.42 | 7.24 (2.37) | 54.69 | 0 | 0 |
| the-angle z15 | 1x | moving | 21.9 | 83.4 | 85 % | 27.71 | 7.96 (2.02) | 81.2 | 0 | 0 |
| the-angle z15 | 4x | still | 25.6 | 66.8 | 77.2 % | 23.92 | 22.91 (6.85) | 122.13 | 0 | 0 |
| the-angle z15 | 4x | moving | 24.7 | 66.7 | 81.3 % | 24.19 | 13.72 (2.12) | 85.89 | 0 | 0 |
| whole-field z13.5 | 1x | still | 26.3 | 66.7 | 77.6 % | 20.59 | 3 (0.5) | 76.13 | 0 | 0 |
| whole-field z13.5 | 1x | moving | 22.1 | 83.3 | 83.1 % | 24.84 | 2.74 (0.37) | 89.7 | 0 | 0 |
| whole-field z13.5 | 4x | still | 28.3 | 66.7 | 66.8 % | 19.04 | 2.5 (0.25) | 63.69 | 0 | 0 |
| whole-field z13.5 | 4x | moving | 27 | 66.7 | 69 % | 20.41 | 2.5 (0.38) | 76.63 | 0 | 0 |

A sudden jump is a mark that steps 8 px or more in one frame, at least 3 times its step in the frame before. The camera row "moving" pans and zooms continuously while the battle plays; a marching cavalry unit makes large smooth steps, which are not jumps.
<!--/PACING-->

Summary. DPR 1: 59.5 to 60 fps in all sixteen rows, the whole field at 60 in all four (round 0: 56 to 60), at most 0.13 sudden jumps of solid marks per second. DPR 2: 55 to 60 fps, the whole field with the camera in motion at 57.3 and 55 (round 0: 46 to 49), at most 4.1 % of frames over 20 ms. Main thread four times slower: 22 to 28 fps, the whole field at 22 to 28 (round 0: 15), at most 6.85 solid jumps per second (round 0: 4.5). The whole field is cheaper because the opening view has 200 marks (round 0: 379); the closer places draw more lettering and cost a little more per frame (section 13, Where the time goes). The machine was shared with other agents' captures, so these numbers carry that noise. **A correction to the measurement made in this round:** the recorder's "jumps" and "largest step" followed each mark's box centre, which moves by half the width when a name or a crowd's words grow; with the pip anchored that is not motion of the mark, and a first run of this round with the old code counted 100 to 250 jumps per second under the throttle, all of them that artefact. The recorder now follows the point the mark stands on (`ix`, `iy`, `ox`, `oy` of the display tile), which is the pip.

**Smoothness** (`tools/probes/jitter.mjs`, `results/jitter.json`; `jitter-round0-tree.json` is the same probe on a copy of round 0's tree). A mark's pip is followed through 480 frames at 60 per second in five scenes of play and camera motion; what is counted is the change of its DISPLACEMENT from the true position it stands for (a unit marching and a camera glide are not motion of the mark):

<!--JITTER-->
| headless engine, this skin, 60 frames per second (in brackets: the round 0 tree, same probe) | frames | marks followed | pops: a mark's displacement from its place changes by more than 6 px in one frame | jitter: its velocity flips, both sides above 0.12 px per frame | of those, both sides above 0.5 px | largest one-frame step (px) |
| --- | --- | --- | --- | --- | --- | --- |
| march of the Mississippi regiment, 1 July, 4x, zoom 15 | 480 | 153 | 27 (35) | 103 (149) | 13 (14) | 9.25 |
| the whole field in motion, 3 July afternoon, 4x, zoom 13.5 | 480 | 237 | 13 (10) | 86 (236) | 8 (12) | 19.98 |
| nine marks arriving on Seminary Ridge, 3 July, 1x, zoom 15.5 | 480 | 401 | 1 (1) | 0 (5) | 0 (1) | 6.29 |
| The Angle in motion, 4x, zoom 16 | 480 | 466 | 24 (18) | 78 (121) | 8 (11) | 8.01 |
| zoom glide 13.5 to 16 over a still Angle (camera in motion) | 480 | 459 | 11 (5) | 41 (83) | 6 (5) | 19.82 |

The motion strips of the shots folder, counted the same way over every engine frame between their eight pictures:

| strip | pictures | engine frames | marks followed | mark-frames | pops | jitter | largest step (px) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A march | 8 | 43 | 79 | 3198 | 0 | 2 | 3.16 |
| A selection | 8 | 15 | 425 | 5922 | 0 | 0 | 0.25 |
| A deployment | 8 | 22 | 396 | 7707 | 2 | 1 | 6.29 |
<!--/JITTER-->

A pop is one mark moving 6 px or more relative to its place in one frame; jitter is a flip of its velocity on an axis with both sides above 0.12 px per frame. The headline is that reversals, the visible back-and-forth, fell in every scene (by a third to the whole of them) and pops did not: they are the layout re-solving when a neighbour changes (a crowd forming or breaking), mostly in the first two seconds of play, and they stay 6 to 20 px in a frame in three scenes, which is the "not zero" of the weak points. A crowd's standard is the largest mover (20 px in the field at 4x when its membership changes).

**Where the time goes** (`tools/probes/engine-ms.mjs --compare`, `results/engine-ms.json`; headless engine, no drawing):

<!--ENGINEMS-->
| scene | marks | engine ms per frame (solve + display layer, no drawing) | of which the layout solve | prototype War Room, same scene |
| --- | --- | --- | --- | --- |
| fresh2 tick 548 zoom 14 | 279 | 8.8 | 5.44 | 168 marks, 5.06 ms (3.41 solving) |
| fresh2 tick 556 zoom 15 | 397 | 7.03 | 3.65 | 310 marks, 6.29 ms (3.62 solving) |
| field tick 620 zoom 13.5 | 200 | 5.13 | 3.52 | 117 marks, 2.9 ms (2.03 solving) |
| carry1 tick 295 zoom 14 | 219 | 5.44 | 3.38 | 143 marks, 4.15 ms (2.83 solving) |

Headless engine, node v24.19.0, 600 frames at 4x after 120 warm-up frames, solve every frame (`tools/probes/engine-ms.mjs --compare`).
<!--/ENGINEMS-->

The opening view is the heavy one. A CPU profile of it (`node --cpu-prof tools/probes/field-prof.mjs`, round 0) put 41 % of the whole frame inside the placement search itself; the search now filters the forbidden rectangles once per column, de-duplicates through a scratch set, takes its candidates from a lazy heap and tests components by squared distance, and returns exactly what the prototype's original returns (40,000 random scenes with ties and duplicates, 0 differences, `tools/probes/nf-diff.mjs`, and a 4,000-scene test in `test/layout.test.mjs`). The prototype's War Room costs a fraction of this on the same field because it draws 117 boxes where this skin draws one mark per unit: that is the price of one small mark per unit, not an accident. Round 0 measured 5.94, 4.87, 9.07 and 4.37 ms in the same four scenes on a quieter machine; this round, on a busy one, 8.80, 7.03, 5.13 and 5.44 ms: more at the closer zooms, where more marks stand alone, and less at the opening zoom, where the wider footprints (a code on every pip, words on every crowd) merge the field into 200 marks instead of 379. The load of the machine was not controlled between the two measurements, so only the ordering is claimed: cheaper at the opening zoom, dearer at the closer ones.

**Interface audit** (`tools/audit-dom.mjs`): the smallest font size in every one of 8 interface states is 11 px, and exactly three sizes (11, 13, 17) are in use; every text element was tested against its effective background over the darkest, middle and brightest 5 % of the map pixels (`results/dom-audit.json`):

<!--DOMAUDIT-->
| state | text elements | smallest px | sizes in use (px) | worst contrast over dark / middle / bright map (bar 4.5) | elements below 4.5 | corner radii in use |
| --- | --- | --- | --- | --- | --- | --- |
| night-popups | 48 | 11 | 11.0, 13.0, 17.0 | 8.93 / 8.23 / 7.31 | 0 / 0 / 0 | 10px x10, 6px x11, 0px x9, 4px x7 |
| night-unit-card | 107 | 11 | 11.0, 13.0, 17.0 | 8.95 / 8.32 / 7.41 | 0 / 0 / 0 | 10px x10, 0px x9, 6px x8, 4px x7 |
| night-tune | 728 | 11 | 11.0, 13.0 | 6.11 / 5.92 / 5.73 | 0 / 0 / 0 | 10px x7, 0px x9, 6px x21, 4px x7 |
| night-about-legend | 174 | 11 | 11.0, 13.0, 17.0 | 6.12 / 5.93 / 5.73 | 0 / 0 / 0 | 10px x10, 6px x10, 0px x9, 4px x7 |
| night-narration | 60 | 11 | 11.0, 13.0, 17.0 | 5.18 / 5.33 / 5.40 | 0 / 0 / 0 | 10px x7, 0px x9, 6px x8, 4px x7 |
| day-popups | 48 | 11 | 11.0, 13.0, 17.0 | 5.75 / 5.89 / 6.00 | 0 / 0 / 0 | 10px x10, 6px x11, 0px x9, 4px x7 |
| day-unit-card | 107 | 11 | 11.0, 13.0, 17.0 | 5.18 / 5.30 / 5.40 | 0 / 0 / 0 | 10px x10, 0px x9, 6px x8, 4px x7 |
| day-about-legend | 174 | 11 | 11.0, 13.0, 17.0 | 5.19 / 5.33 / 5.40 | 0 / 0 / 0 | 10px x10, 6px x10, 0px x9, 4px x7 |
<!--/DOMAUDIT-->

The seven 4 px radii are the buttons inside the speed switch (concentric with its 6 px outline); the 0 px ones are the reading rail docked to the window edge and the joined pills of the top bar, whose inner corners are square by design.

**Lettering fits its footprint** (`tools/textfit.mjs`, `results/textfit.json`): for every code, every unit name (which now takes the code's place and is set in the code's cut), every formation name and the words of a crowd, the width Chrome measures is below the width the layout reserved:

<!--TEXTFIT-->
| cut | strings | wider than reserved | worst real / reserved | the string |
| --- | --- | --- | --- | --- |
| code | 659 | 0 | 0.9547 | Washington Artillery of New Orleans |
| codeI | 66 | 0 | 0.9428 | McGilvery |
| name | 5 | 0 | 0.9447 | , 12 unlisted, 2 contested |
| brig | 125 | 0 | 0.9516 | Reserve Bde, 1st Div, Cavalry Corps |
| form | 46 | 0 | 0.9491 | Side unknown |

Glyph coverage: 67 characters of the data, 0 missing from QC Sans.
<!--/TEXTFIT-->

## 14. Limits and what was not done

- One machine, Chrome 155 headless, shared with other agents' browser captures and test runs; no phone, no Safari, no Firefox, no screen reader. The 4x CPU throttle is a stand-in for a phone, not a phone, and was not re-run in this round (the frame-pacing tables are the conditions their headings say).
- The 1863 landscape is not drawn: the ground is a 2022 photograph; the product's 1863 roads, rivers and breastworks are product data and are not reproduced. The basemap's own findings stand: the legacy place frame puts Culp's Hill 731 m from its summit.
- **The opening view is dense.** With a code on every pip and words on every crowd the opening scene (tick 551, zoom 13.5, 1440 x 900) has 54 crowd standards standing for 307 of the 451 units (68 %) and 144 marks standing alone; round 0 had 28 crowds and 106 units (24 %) and no codes. Every standard names its formation, but a reader who wants every regiment at the overview needs a larger screen or a closer zoom: a larger displacement budget would show more units one by one only by putting them farther from their place.
- **Marks still reach under the interface** at the overview (section 13 counts them per scene): they dissolve before the bar rather than being cut by it, but they are hidden while they are there. A zero would need a layout that depends on the camera, which would move marks while the camera pans.
- **A displaced mark at rest does not say that it is displaced.** Its place is shown for the mark pointed at or selected, and the legend says it; round 0 drew a pin for every displaced mark at rest and three critics read the pins as wiring.
- The two armies differ by 1.4 : 1 in lightness by day and 1.5 : 1 at night; the second cues are geometric (facing, the end of the flag) and the hatching of the unknown side. They were checked in the software simulation (`shots/round-1/cvd-day.png`), not with people.
- The map has two type sizes (12 and 13 px) and the interface three (11, 13, 17 px); the ground's own labels (place, road, stream names) are 11 px.
- The mid-point of the hollowing (a half-day-old fix) is a dark ring tinted by the side colour, a muddy brown in the specimen sheet; it is the continuous function and passes through quickly, and no scene I rendered shows it at rest.
- Two flags of one brigade can stand far apart with the same name when its regiments cannot stand near each other ("Armistead's Bde 3" and "Armistead's Bde 2" at The Angle): two crowds of one formation, which the layout produces and which no rule of the skin distinguishes.
- Road and stream names are the basemap's and still run under marks (the marks paint over them with their halo); the marks are tested for contrast against the halo, not against a road label.
- After a pause the layout can still be relaxing a displaced mark by a few pixels toward its true place; the page sleeps when nothing moves, so a later interaction may show that last step (`test/rest.test.mjs`).
- Selecting a mark at zoom 15 or more reflows its neighbours (8 to 40 marks); below zoom 15 nothing moves. The breathing of marks after a selection (a feedback loop between the displayed offsets and the solver) is avoided below zoom 15, not fixed above it; one view of the sweeps (zoom 15, tick 346, a mark selected) was still reflowing after 200 frames and showed a smallest gap of 0.8 px.
- Pops and crowd jumps: at 4x play a crowd's standard can move 15 to 20 px in one frame when its membership changes (section 13, Smoothness).
- The data labels the artillery battalion `C-ART-III-2` "Heth's Div" while its designation says McIntosh's Battalion; the marks use the designation (a data quirk reported, not corrected).
- The font was fetched once from the Google Fonts repository (two TTFs and the licence, 1.0 MB, read-only, one request each; nothing else was downloaded in this round).
- `compare-z15.png` of the first prototype was never displayed to me in either round; `shots/round-1/compare-first-prototype-vs-quiet.png` puts the prototype's own picture of the same tick beside this skin's. The first two rounds of round 0 were driven partly blind (the picture viewer answered "request limit"); every picture of this round was seen when it was made, and `ITERATIONS.md` says which were not.

## 15. The five strongest and the five weakest things

Written last, from the numbers above and the pictures, not from the intention.

**Strongest**

1. **One mark per unit, standing on the unit, with the guarantee that holds it up.** A pip's centre is the unit's modelled position, the foot of a staff a formation's (a test holds it within the engine's own 1.5 px at three zooms and still while a name grows); every unit is one mark or is inside a counted standard, never dropped. 0 overlapping marks, 0 covered pins and 0 unrepresented units in the nine scenes, in the night ground and both variants, in 952 independently checked sweep samples (two grounds, nine zooms, fourteen ticks, with and without a selected mark, desktop and phone) and in 104,282 engine-verified frames.
2. **The opening view names everything it shows.** At zoom 13.5 every pip carries its code and every crowd says what its units share ("II Corps, 5 unlisted", "Both sides"): 144 marks stand alone with a code and 54 standards stand for 307 units, each with its formation, its count and, where the order of battle is silent, how many it is silent about. The armies face each other, so side is told by hue, by direction and by the end of the flag (`shots/round-1/cvd-day.png`: the greyscale panel still tells them apart).
3. **Lettering that holds on a photograph without a box.** Haloed 12 and 13 px lettering: the worst of 35 ground bands per ground over six skins is 4.73 : 1 (the white count inside a Union flag in the colour-blind-safe night variant) against a bar of 4.5, the worst mark 3.18 against 3, 0 failures; the count inside a flag is white on cloth that holds 4.85 to 7 : 1; no text of the interface falls under 4.5 : 1 over the darkest, middle or brightest map in eight states (the worst is 5.18), in exactly three sizes; the text the skin sets is never wider than the width the layout reserved (worst 0.9547 over 901 strings).
4. **Honesty written into the pixels.** Every encoding carries an evidence label (section 11), the legend is drawn by the skin's own code and opens with a figure of the marks at true size, the unknown side is a neutral hatch and never a guessed colour, the hollow mark keeps its hue and is a continuous function of a computed age, a crowd says how many of its units the order of battle gives no parent or an unknown side, a brigade card no longer says "infantry", the ground says on every screen that it is a 2022 aerial, and the pip now stands where the data puts the unit instead of up to 100 m from it.
5. **One language from the mark to the last popup, and a quiet face.** A day atlas that is the default, four pills of chrome, a dock a little over a third of the old height, three interface sizes and two radii in every one of eight audited states, all twelve popups restyled by one stylesheet and anchored to what they describe and never on a mark (`cards.over` is 0 in every frame of every scene), a phone with 76 % of the screen for the map under a peek sheet, and 180 node tests (the old 179 and the new anchor test) that pass.

**Weakest**

1. **The opening view is dense.** 54 crowd standards stand for 307 of the 451 units (68 %) at the opening zoom and 144 marks stand alone: round 0's 28 crowds and 106 units (24 %) were calmer and said nothing. The words are true and the layout certified, but it is a plate full of lettering; a reader who wants every regiment at the overview needs a bigger screen.
2. **Marks still reach under the interface at the overview.** 12 of the 162 marks in view of the opening scene lie on a control or the dock (22 within 16 px of one), and one to five in the other desktop scenes; they dissolve before the bar instead of being cut by it, but they are hidden while there. Zero needs a camera-dependent layout, which would move marks as the camera pans.
3. **A displaced mark at rest does not say that it is displaced, and the two armies differ by only 1.42 : 1 in lightness by day (1.52 at night).** The first rests on the legend and on pointing; the second on facing and the end of the flag, which the software simulation shows and no person has been asked about.
4. **Smoothness is better, not perfect.** In five scenes of play the visible back-and-forth of marks fell by a third to all of it (103 against 149 flips in the march, 86 against 236 in the field, 0 against 5 at the guns' deployment, 78 against 121 at The Angle, 41 against 83 in a zoom glide), but the pops of 6 px or more did not fall (27 against 35, 13 against 10, 1 against 1, 24 against 18, 11 against 5) and a crowd's standard can move 20 px in one frame when its membership changes; the click at zoom 15 still reflows 7 marks in the worst view, and the picture takes longer to come to rest after a click than in round 0 (median 44 frames against 9; 60 of 252 desktop sweep views run out of their frames before rest against 40).
5. **What was not checked.** One machine shared with other agents, Chrome 155 headless only, no phone, no Safari or Firefox, no screen reader, no person: the greyscale and colour-blind judgements are a software simulation, the phone is an emulated 390 x 844 viewport, and the identity of the design ("the armies face each other, on an atlas") is my own claim about my own work that a reader has to judge.

## Appendix A. The token file

<!--TOKENS-->
66 rows (the night values; the day and variant overrides are at the bottom of the spec file):

| token | default | range | what it does |
| --- | --- | --- | --- |
| `color.union` | `#62a6ff` | colour | Union: the pip, the flag and the count disc.  Azure, light enough to read on a dark aerial |
| `color.confederate` | `#e4522a` | colour | Confederate: vermilion.  Blue against vermilion is the colour-blind-safe pair of Okabe and Ito in spirit (not their exact values) |
| `color.unknown` | `#e3e8ee` | colour | Side UNKNOWN (10 ids whose id prefix and state code disagree, Contested): the ink colour of the ground, hatched, never a side colour.  Neutral on purpose: it stays apart from both sides under every colour-vision type |
| `color.unionFlag` | `#2d6fd3` | colour | Union flag cloth and the count inside it: a deeper azure than the pip, so the white numeral holds 4.5:1 (4.85) |
| `color.confederateFlag` | `#c4401a` | colour | Confederate flag cloth: a deeper vermilion than the pip, white numeral at 5.1:1 |
| `color.glass` | `#070b11` | colour | The glass inside a carried-forward (hollow) pip or flag: dark on the night ground, paper on the day ground |
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
| `text.dimAlpha` | 1 | 0.3 to 1 | Opacity of lettering when the mark is carried forward (a fix a battle day old or more).  1: the lettering of a stale mark stays at full strength and keeps its 4.5:1 (round 0 dimmed it to 0.74 and 0.86, and a hostile reading found the stale crowds illegible); the hollow ring and flag carry the age |
| `pip.size` | 11 | 7 to 16 px | Width of the pip, ring included.  Infantry is a disc, cavalry a diamond, artillery a triangle |
| `pip.gap` | 4 | 2 to 8 px | Space between the pip and its lettering |
| `pip.ring` | 1.25 | 0.5 to 2.5 px | Width of the light ring round a fresh pip (it becomes the side colour when the mark is carried forward) |
| `pip.ringHollow` | 1.9 | 0.8 to 3 px | Width of the side-coloured ring of a carried-forward pip: thick enough to read at the opening zoom |
| `pip.hairlineAlpha` | 0.62 | 0.2 to 1 | Opacity of that hairline (the DAY ground uses a paper-white one at a higher opacity) |
| `pip.hairline` | 0.9 | 0 to 2 px | Width of the dark hairline outside the ring: the contrast guarantee on a pale ground |
| `unit.h` | 14 | 12 to 20 px | Height of the body of a unit mark (the footprint adds the selection band on each side) |
| `name.alpha` | 1 | 0.4 to 1 | Opacity of the grown-in full name (the code is bolder; both are full ink) |
| `code.baseline` | 4.1 | 2 to 6 px | Distance of the lettering baseline below the middle of a mark (the digits sit centred on the pip) |
| `flag.w` | 15 | 10 to 24 px | Width of a standard (the flag of a formation or of an aggregate), notch included |
| `flag.h` | 11 | 8 to 18 px | Height of the flag of a brigade standard; a division flies 12 % taller, a corps 26 % taller |
| `flag.notch` | 3.5 | 0 to 7 px | Depth of the swallow-tail |
| `flag.staff` | 5 | 0 to 12 px | How far the staff runs below the flag |
| `staff.width` | 1.5 | 0.75 to 2.5 px | Width of the staff (the flag is hung from its top, its foot stands on the true position) |
| `flag.gap` | 5 | 2 to 10 px | Space between a standard and its lettering |
| `flag.padX` | 3.5 | 1 to 6 px | Space round the count inside a flag that has to widen for two digits |
| `formation.h` | 20 | 16 to 26 px | Height of the body of a formation or aggregate mark |
| `detail.corpsNameZoom` | 11 | 10 to 18 zoom | From this zoom a corps (and an aggregate of one) says its name |
| `detail.divisionNameZoom` | 12.5 | 10 to 18 zoom | From this zoom a division (and an aggregate of one) says its name |
| `detail.brigadeNameZoom` | 13 | 10 to 18 zoom | From this zoom a brigade says its name |
| `detail.codeZoom` | 13 | 10 to 18 zoom | From this zoom a unit pip carries its short code (below it a pip is bare: the hover and the card say which unit it is).  13 is below the opening zoom of the site, 13.5: the first view names what it shows |
| `detail.crowdNameZoom` | 12 | 10 to 18 zoom | From this zoom a crowd standard says what its units share (a formation, a corps, both sides): a number alone never stands for hidden units |
| `detail.selectGrowZoom` | 15 | 10 to 18 zoom | From this zoom a selected mark grows its name (and a unit its strength hairline) and the layout makes room for it; below it the selection is a ring (the crowd standard that stands for a hidden unit gets the ring) and nothing moves, so selecting never re-flows a crowded overview |
| `detail.selectNameMinViewport` | 560 | 320 to 2000 px | A selected mark grows its full name only when the window is at least this wide (px); on a phone the card carries the name and the mark stays small |
| `detail.unitNameZoom` | 16 | 14 to 18 zoom | From this zoom a unit says its full name: the same mark grows, there is no second box |
| `detail.hullZoom` | 12 | 11 to 18 zoom | From this zoom an aggregate shows the true positions of the units it stands for |
| `carried.hollow` | 1 | 0 to 1 | How far a carried-forward pip or flag hollows: 0 = no change, 1 = fully hollow with a side-coloured ring |
| `carried.glass` | 0.72 | 0 to 1 | Opacity of the glass inside a hollow mark |
| `carried.tint` | 0.3 | 0 to 0.6 | How much of the side colour tints that glass (the hue stays, so a carried-forward mark is never grey) |
| `tail.alpha` | 1 | 0.4 to 1 | Opacity of the tail of a crowd name (", 3 unlisted": units the order of battle gives no parent), set in regular weight beside the semibold name, at full strength |
| `brig.alpha` | 1 | 0.5 to 1 | Opacity of a brigade name (semibold 12 px, tinted with its side: quieter than the bold 13 px of a division or a corps) |
| `gauge.h` | 3 | 1 to 4 px | Thickness of the strength hairline (Modelled: this keyframe's strength over the unit's reference strength; a state, not a casualty record) |
| `gauge.w` | 22 | 12 to 40 px | Length of the strength hairline that joins a SELECTED unit mark after its name |
| `gauge.gap` | 7 | 3 to 14 px | Space between the name and the strength hairline |
| `gauge.trackAlpha` | 0.3 | 0 to 0.8 | Opacity of the empty part of the hairline |
| `hull.dot` | 2.3 | 1 to 4 px | Radius of the dot on the true position of one unit an aggregate stands for (shown while the aggregate is hovered or selected) |
| `hull.leader` | 0.75 | 0 to 1 | Opacity of the hairlines from an aggregate to its units while it is hovered or selected |
| `pin.r` | 2.4 | 1 to 4 px | Radius of the true-position ring |
| `leader.width` | 1 | 0.5 to 2 px | Width of the hairline from the true position to its mark |
| `leader.alpha` | 0.78 | 0 to 1 | Opacity of that hairline |
| `sel.radius` | 7 | 2 to 12 px | Corner radius of the selection ring |
| `sel.width` | 1.5 | 1 to 3 px | Width of the selection ring |
| `hover.plate` | 0.18 | 0 to 0.5 | Extra glass behind the mark on hover |
| `motion.selectMs` | 140 | 0 to 600 ms | Ease of the selection ring (critically damped) |
| `motion.hoverMs` | 90 | 0 to 600 ms | Ease of the hover state |
<!--/TOKENS-->
