# Dispatch: the Editorial Annotation language (art direction 4)

*The map is the hero. The marks are quiet narrators.* **This is the round-1 revision (the art-direction jury's first critique answered; see `ITERATIONS.md`, "Round 1").** A design language for the Battle Studio's unit marks, formation marks and popups, in the register of a newspaper graphics desk (the New York Times, the Washington Post, the Guardian, Esri's story maps at their best). It is a skin module plus a token file of the engine, a stylesheet, and a handful of small engine hooks; nothing else changed. Everything below was drawn by the code in this folder, on the real USGS aerial ground, from the real order of battle, and measured by the scripts in `tools/` and `studio/test/`. Pictures are in `shots/`; how they were made is in section 12; the log of what was seen and changed is `ITERATIONS.md`.

| What | Where |
|---|---|
| The working fork (engine, skin, popups, tokens, stylesheet) | `studio/` (build: `node studio/build.mjs` -> `dist/battle-studio.html`) |
| The skin and its token file | `studio/src/skins/editorial.mjs`, `studio/src/skins/editorial.spec.mjs`; the same tokens as plain JSON: `studio/tokens/dispatch.tokens.json` (`node tools/export-skin-tokens.mjs`) |
| The interface and the popups | `studio/src/ui/editorial.css` (cards, evidence labels), `studio/src/ui/chrome.css` (the frame: masthead, map band, dock), `studio/src/popups/fxdraw.mjs`, `studio/src/popups/legend.mjs` |
| The two typefaces, their licences and sources | `fonts/`, `fonts/SOURCES.md` |
| The scenes S1 to S8, the popups, the motion strips, the specimens | `shots/round-1/` (this revision), `shots/` (the first pass) |
| Colour tests, pixel-ink check, scene checks, tests | `results/`, `tools/`, `studio/test/editorial.test.mjs` |

## 1. Principles

1. **The map is the hero.** The ground is a real photograph of the real hills (USGS NAIP, April to May 2022), lit by a USGS elevation model, with contours and TIGER roads, in two looks: *paper* (the aerial ghosted into warm paper, brown relief: a survey print) and *aerial* (the photograph dimmed and calmed). A mark is small, flat and quiet; it sits on the ground like ink on a printed map. No plate, no shadow, no gradient on a mark. **The interface is a frame around the map, not a layer over it**: a masthead above, a dock below, the map between them (the *stage*); nothing opaque lies on the map, so no mark can ever be hidden under it (a mark is cut by the edge of the map as by the edge of any screen). The frame is paper (or ink) with a hairline, never glass.
2. **One object per unit.** A unit is one mark: a bold disc (a regiment, a battery, a battalion) or a standard (a brigade, division or corps record), one white glyph inside it, and its short code written beside it with a halo, as part of the same object. There is no caption box behind the text and no second box. The full name is *that same text growing*: it wipes out to the right of the code, in the free ground the layout reserved for it, on hover, on selection and, where there is room, at close zoom. The code gives way to the name in place; nothing appears beside it.
3. **Three levels of weight, no more.** (1) formation marks: a standard (brigade 28x18, division 34x22, corps 40x26), its name in 13/700 **in the side's own deep ink** (blue or rust) so the formation tier is set apart by colour and weight, not by one pixel of size; (2) unit marks (a 15 px disc, its code in 12/600 neutral ink) and **crowd marks, which are smaller than a brigade standard (25x17) and set in the neutral 12/600 of a unit**, so a crowd is never louder than the formation it merges; (3) secondary detail: the strength ring, the hull, the leader and the pin, the place and road names. Two type sizes on the map (12 and 13) and one numeral style (Inter 700). Nothing that must be read is under 11 px at 1x (the road names of the ground, which were 10 px, are 11 now).
4. **Quiet.** No dashed outline anywhere (an approximate place is a soft disc, a Modelled age is a fade). No tiny badge: a mark has no corner chips. Crowds merge into a standard with a number whose pile behind it says "several"; its hull and the true position of each record appear on interaction only. Age is **one** device, used everywhere: a mark whose latest keyframe is a battle day or more old *recedes into the ground it stands on*: its fill becomes a pale tint of **the same hue** (a pale blue or a pale salmon on paper; a deeper blue or red on the dark aerial), its ring thins to 62 percent, and the ink of its glyph and its count becomes the dark ink where that reads better (always the better of white and the dark ink: 4.5:1 at every one of seven ages, tested). Nothing greys: grey would read as a missing value, and a faded Union mark must still be blue.
5. **True to the data.** The disc stands on the unit's true position; the layout's box is anchored on the glyph, not on the middle of the text (section 5.1). Every channel a mark draws is a field of the data, and each carries the site's evidence label (section 10): side, arm, echelon, identity, strength state, age, crowd count. Posture is not drawn on the mark (the data's posture is hand-authored per keyframe and has no honest heading to draw); it is on the unit card.
6. **Motion is part of the language.** Every arrival, selection, hover, growth and merge has a curve and a duration (section 8), and the picture is a pure function of the time it is given, so a screenshot and the live page agree.
7. **Every number is a token.** A designer changes `editorial.spec.mjs` (or `?skinset=` live) and nothing else; a variant is the same drawing under another token set (section 11).

## 2. The grid

A 4 px grid for the interface; the marks sit on a 1 px grid at 1x and are snapped to the device pixel once they stop moving (the engine's kit). Lengths below are CSS px ("u").

| Metric | Value | Token |
|---|---:|---|
| Unit disc radius (regiment, battery) | 7.5 | `mark.r` |
| Battalion disc radius | 8.5 | `mark.rBattalion` |
| Light ring / dark hairline (outside the disc) | 1.5 / 1.0 | `ring.light`, `ring.dark` |
| Arm glyph half-size, stroke | 3.4, 1.9 | `glyph.size`, `glyph.stroke` |
| Standard (body), brigade / division / corps | 28x18, 34x22, 40x26 | `flag.w.*`, `flag.h.*` |
| Crowd mark body (smaller than a brigade standard), pile offset | 25x17, 3 | `flag.w.crowd`, `flag.h.crowd`, `flag.stack` |
| Notch of a Union standard, point of a Confederate one | 5 | `flag.notch` |
| Pips of a formation record (1 brigade, 2 division, 3 corps), radius, pitch | 2.1, 4.6 | `pip.r`, `pip.pitch` |
| Gap mark to text, left pad, right pad, reserved band | 3, 2, 2, 2 | `gap.text`, `pad.*` |
| Box height: unit / battalion / brigade / division / corps / crowd | 24 / 26 / 27 / 31 / 35 / 29 | derived by `sizeOf()` |
| The frame: masthead / dock (desktop) / masthead (phone) | 56 / about 112 / 48 | `--mast-h` (`chrome.css`); the dock's height is measured and the stage follows it |
| Pin box (a true position) | 7x7 | `pinHalf` 3.5 |
| Clearance between two boxes | 2 | `layout.gapPx` |

The box of a mark is what the layout reserves, and the layout's guarantee (no two boxes overlap, no box covers another mark's true position, every unit represented) holds for *that* box. `tools/skin-ink.mjs` proves the other half: it draws every tile alone and measures the pixels it painted (section 12).

## 3. Type

| Role | Face | Size / weight | Where |
|---|---|---|---|
| Code of a unit mark; the name that grows out of it | Inter | 12 / 600 | map |
| Code and name of a formation mark | Inter | 13 / 700, in the side's deep ink (`text.formUnion` #123F7A, `text.formConfederate` #8E2C0E on paper) | map |
| The name of a crowd (what its records share) | Inter | 12 / 600, neutral ink | map |
| The count in a crowd mark, the pips | Inter (numerals) | 13 / 700 | map |
| Place names | Source Serif 4 italic | 12 / 400 | map |
| Road and stream names of the ground | Inter | 11 / 600 (they step aside, fading, for any mark or name that would lie on them) | map |
| The masthead: title / dateline / clock | Source Serif 4 / Source Serif 4 / Inter | 17 / 600; 15 / 600; 11.5 / 500 | masthead |
| The timeline's day labels | Inter | 11 / 600 | dock |
| Card kicker | Inter | 11 / 700, caps, tracking .12em | cards, rail |
| Card title | Source Serif 4 | 19 / 600 (26 for the date line and the banner) | cards |
| Card body, meta, evidence | Inter | 13.5 / 1.55; 12.5; 11 / 650 caps | cards |
| The reading rail: title, prose | Source Serif 4 | 24 / 600; 16 / 1.68 | rail |
| Interface | Inter | 12.5 / 600 | buttons, dock, menus |

Rules: nothing that must be read is under 11 px at 1x; numerals in the interface are tabular (`font-feature-settings: "tnum"`, verified in the shipped subset: "1111" and "8888" are both 33.66 px wide at 13 px 600; without the feature 22.00 and 33.30). Two files of fonts ship inside the page as base64: **Inter** 400, 500, 600, 700 and **Source Serif 4** 400, 400 italic, 600, all **SIL Open Font License 1.1**; files, sizes, hashes, source URLs and licence texts: `fonts/SOURCES.md`. The layout measures these exact fonts at start-up (`document.fonts.load` before the first measure), so the text width in a box is the width the canvas draws; `tools/measure-text.mjs` writes the same table for the node tests.

## 4. Colour tokens and their tests

Two families share one drawing. `dispatch-paper` (dark ink on the light ground) and `dispatch-aerial` (white ink on the dark ground); each has a colour-blind-safe and a high-contrast variant: six skins.

| Token | Paper | Aerial | cvd (paper / aerial) | contrast (paper / aerial) |
|---|---|---|---|---|
| `color.union` | #1C57A6 | #1C57A6 | #0B5CAD / #1A5AAB | #0A3D86 / #1D5FB0 |
| `color.confederate` | #C2441B | #C2441B | #B84F06 / #BD5209 | #A8300C / #C8481A |
| `color.unknown` (contested) | #D9A21B (hatched) | same | #C9B037 / #D8C24A | same |
| `color.glyph`, `color.ringLight` | #FFFFFF | #FFFFFF | | ring 2 px |
| `color.ringDark` (the hairline) | #0A1018 | #0A1018 | | |
| `text.ink` / `text.halo` | #17202B / #F7F2E4 | #FFFFFF / #08111A | | halo opacity 1 |
| `color.accent` (selection, highlighter) | #FFC21A | #FFC21A | | |
| `color.glyphDark` (the glyph and the count on an aged, pale mark) | #17202B | #17202B | | |
| `color.fade` (the ground an old mark recedes toward) / `fade.fill` | #FFFDF4 / 0.55 | #0F1722 / 0.34 | | 0.52 / 0.30 |
| `fade.ringW`, `fade.ring`, `fade.glyph`, `fade.text` (what else changes with age) | 0.62, 0.30, 0.06, 0.12 | same | | 0.80, 0.20, 0.03, 0.06 |
| `text.formUnion` / `text.formConfederate` (the name of a formation) | #123F7A / #8E2C0E | #A9CBF7 / #FFB59B | | |

The interface palette lives in `editorial.css` (`--bg --panel --text --muted --accent`, the tone inks and the six evidence colours), in a light and a dark theme that follow the ground.

How age is drawn (`fadeFill`, `fadeInk`, `fadeT` in `editorial.spec.mjs`, shared by the drawing and the tests): nothing until half a battle day, then a quick change (a smoothstep from 0.45 to 0.70 of the age scale, so no mark rests in the mid-tone where neither white nor dark ink reads) to a tint of the same hue mixed toward the ground; the ink of the glyph, the pips and the count is the better of white and the dark ink for that fill.

Every pair is tested (`tools/contrast-tests.mjs`, also run by `editorial.test.mjs`; the ground is **measured**: seven luminance bands of the real backdrop at three zooms and four scenes in each look, `results/ground-bands.json`):

<!--CONTRAST-->
**146 of 146 checks pass** (6 skins x the mark tests, 2 themes x the card tests).

| Group | Pass | Weakest pair | Measured | Bar |
|---|---:|---|---:|---:|
| glyph on fill | 30 of 30 | dispatch-paper: the glyph and the count on Confederate, worst of the seven ages (age 0.50) | 4.52:1 | 4.5:1 |
| age | 24 of 24 | dispatch-aerial: a battle-day-old Union mark against a battle-day-old Confederate one (the side must survive the fade), CIEDE2000 | 20.43 dE2000 | 20 dE2000 |
| text | 6 of 6 | dispatch-paper: ink on its halo | 14.7:1 | 7:1 |
| ring on ground | 6 of 6 | dispatch-paper: best ring on the worst of 28 measured ground colours (#a09270) | 3.33:1 | 3:1 |
| selection | 6 of 6 | dispatch-paper: amber ring against its dark underlay, worst ground | 3.31:1 | 3:1 |
| side separation | 36 of 36 | dispatch-paper/cvd: Union against Confederate, luminance ratio (greyscale print) | 1.32:1 | 1.3:1 |
| card text | 38 of 38 | light: --evi-Contested (an evidence label) on the card | 5.68:1 | 4.5:1 |

Full list: `results/contrast-tests.json`.
<!--/CONTRAST-->

The honest limits of these tests: the colour-vision figures are a software simulation (Machado, Oliveira and Fernandes 2009 matrices, severity 1.0), not people; the CIEDE2000 bar of 20 is this project's own, not a WCAG number; the ring test uses seven percentile colours of each backdrop, not every pixel (a dark hairline outside a light ring guarantees at least 4.6:1 for one of them on any ground, which is why it works).

## 5. The anatomy of a mark

The specimen sheets draw every encoding with the skin's own code on the real ground: `shots/round-1/specimen-paper.jpg`, `specimen-aerial.jpg`, and the variants `specimen-paper-cvd.jpg`, `specimen-aerial-contrast.jpg`.

```
        unit mark                                         formation standard                              crowd mark
   (ring: light 1.5 + hairline 1)                    (ring of the same two widths)               (the pile behind it, offset 3)
        .--------.                                      ______________                              ____________
       / ( X )    \  14 VT   <- code, haloed           |  .  .        >  I/3/2  <- code, 13/700    |   9      <  Kemper's Bde  <- what the records share
       \  disc 15 /                                    |_____________>     in the side's deep ink  |__ count _>      (12/600, neutral ink)
        '--------'                                      brigade: 28x18, Union swallow-tail,        a small standard (25x17) for N records
   the glyph centre IS the true position                Confederate point; pips = echelon
```

### 5.1 The glyph stands on the true position

A mark is wider than its disc, because the text is part of it. The engine's first prototype centred every box on the unit's position; for a mark whose glyph stands left of its text that would put the disc 15 to 30 px away from the place it claims. Here every tile has a *true position* (`px, py`, where the pin and the hull dots stand) and a *home* (`ax, ay`, the centre of its box when it is undisplaced), and `hx = ax - px` is the offset the skin's `size()` returns. The layout works in home coordinates (its guarantee machinery is unchanged); the pin protection, the leader, the pin, the hull and the minimap use the true position. The test `the glyph stands on the true position` checks every tile of a real frame: an undisplaced mark has its glyph within 1.6 px of its unit, a displaced one has a pin there.

### 5.2 Encodings

| Channel | Encoding | Field of the data | Label |
|---|---|---|---|
| **Side** | colour *and* silhouette: Union a blue circle (unit) or swallow-tailed standard; Confederate a red rounded square or pointed standard; the **contested** side (10 ids whose state code contradicts the prefix) a hatched amber diamond; a crowd of both sides a standard split blue and red, a crowd that holds contested records a standard half amber and hatched (a contested record is never counted as a side) | `side` (order of battle, id prefix) | Documented; **Contested** for the ten; **Computed** for a mixed crowd |
| **Arm** | one white glyph in the disc: infantry a saltire, cavalry a slash, artillery a dot (the APP-6 convention; cavalry and artillery states are not drawn) | registry `arm` | Documented |
| **Echelon** | size and shape: a battalion's disc is larger; a brigade, division, corps record is a standard with 1, 2, 3 pips and a larger body. A formation record has **no arm glyph**: the data gives a formation none | registry `kind` | Documented |
| **Identity** | the code beside the mark; italic when the id has no order-of-battle record | `short`, `inOob` | Documented; **Unknown** for the 95 ids with no record |
| **Strength** | the light ring of a unit disc is a four-arc gauge: the lit arcs are the keyframe's strength over the unit's reference strength, in quarters (a state, not a number) | keyframe `strength`, `strengthRef` | **Modelled** (a placement value, not a casualty record) |
| **Age** | recedes into the ground (principle 4): a pale tint of the same hue, a thinner ring, the better of white and dark ink for the glyph and the count; from half a battle day to a whole one, quickly | ticks since the latest keyframe | **Computed** |
| **Crowd** | a small standard with a number and a name: that many placement records share the mark (records, never men); the pile behind it says several; the name is what the records share (section 7), never a lead record and a plus | the layout's aggregate | **Computed** |
| **Position** | the glyph centre; a displaced mark has a thin leader and a dot at the true place (drawn only when that place is clear of the mark and not under its own text) | keyframe lat/lng | **Modelled** (hand-authored; between keyframes an interpolation) |
| **Hull** | a very light wash, in the neutral ink of the print (not in a side's colour: a tinted wedge reads as an attack arrow, a claim about 1863 the data does not make), over the formation's records, with a dot on each true position; on hover or selection | order-of-battle chain, true positions | **Computed** from Modelled positions |
| **Place names** | italic serif with a dot (a ring: the site's own coordinate; a filled dot: moved to the summit the elevation model measures; a trailing "?" on the two names whose coordinate has no building of that name: the Lutheran Seminary, 679 m from its cupola, and the Evergreen Cemetery gatehouse, nothing within 25 m); a name steps aside, fading, for any mark that would stand on it, and a ring whose name has stepped aside goes with it; the road and stream names of the ground are drawn by the skin on the same rule | `terrain.json`, 3DEP, the basemap's landmark check | Modelled; **Measured** for three hills |

### 5.3 The unit's name grows out of the mark

The layout already places a secondary label in free ground after every box is placed (it never moves a box). This language uses that mechanism for the name: the label rectangle is only the *overhang*, the part of the name beyond the room the code already has, adjacent to the mark (gap 0) and only to the right (`layout.labelSlots = r`). When it is shown, the mark's code fades and the name wipes out along the same baseline from the same x. Names are the order of battle's own words: a regiment's designation without the nickname in brackets (the nickname stays on the unit card), a formation's short name when whole, otherwise its designation with ordinals as figures ("Third Brigade, Second Division, Third Corps" -> "3rd Bde, 2nd Div, 3rd Corps"); `editorial.test.mjs` checks that every word of every name is in the unit's own record and that none is cut with an ellipsis (the dataset's `label` is cut at 24 characters: "Battery A, 4th US Artil..."). The hovered unit takes its room first and without the show delay, at any zoom; names appear everywhere else from zoom 15, where they fit.

### 5.4 The hull, the leader and the pin

On hover or selection the formation's hull appears beneath every mark: the convex hull of the true positions of the unit's brigade (or of a crowd's records), padded 10 px, as a very light wash (5.5 percent) in the neutral ink of the print, and a dot at each record's true position (the side's colour inside a white ring). It is a soft grouping, not a claim about a line of battle: it has no outline, no side colour and no taper that could read as an arrow. A displaced mark's leader is 1.1 px in its side colour over a 3 px halo, from the true position to the edge of the disc; the pin is a 2 px dot with a white ring and a hairline. Neither is drawn when the true position is inside the mark's own box. **A card's leader to its subject is drawn only when it is at most 300 px long** (`popup.place.leaderShowPx`): a longer one is left out, and the subject keeps its highlighter and its pulse (the round-1 verdict on a hairline across the whole map).

## 6. States

| State | Look | Evidence |
|---|---|---|
| Rest | as drawn above | |
| Hover | the disc lifts 8 percent, a ring in the side colour at 55 percent draws around it, the name grows, the formation's hull appears, a tooltip follows after the dwell | interface state |
| Selected | an amber ring (2.2 px, over a dark underlay) draws itself clockwise around the mark in 240 ms and stays; its name grows; its brigade's hull appears; its card opens | interface state |
| Arriving | fades in over 240 ms while it grows from 85 percent to 100 percent; the disc swells at most 7.5 percent on the way and settles; a ring leaves it (520 ms) | |
| Leaving | the same without the ring: 240 ms fade, shrinks to 85 percent | |
| Carried | faded (age) | Computed |
| Displaced | leader and pin | Modelled |
| Merged | the members glide into a crowd mark while they fade; the crowd mark fades in after they are below half (the engine's sequenced hand-over: two overlapping marks are never both solid) | Computed |
| Travelling | a lone mark that must cross a neighbour dims to 42 percent for about 150 ms and stays visible (the engine's opacity rule) | |

## 7. Formation marks and crowds

A **formation record** (a brigade, division or corps that has its own placement) is a standard: larger with echelon (28x18, 34x22, 40x26), side by silhouette, pips for the level, its short name in 13/700 in the side's deep ink; its full name grows out of it when there is room. A **crowd** is what the layout makes when marks cannot all stand on their true positions within the displacement budget (48 px): the nearest records merge, deepest common ancestor first, into one small standard (25x17) with a count. Nothing is dropped: the engine's guarantee (every unit in exactly one mark) is checked on every drawn frame.

**A crowd is named in words, from the order of battle** (`layout/tiles.mjs aggregateName`; `editorial.test.mjs` checks every word against the record):

| The crowd holds | Its name | Example |
|---|---|---|
| units of both armies | **Both sides** (the data records no engagement, so the word "Contact" is gone from every screen, the legend and the data's own scene names: "Fresh cluster B") | Both sides |
| one army and some contested records | the army, and how many are contested | Confederate, 3 contested |
| only contested records | Side contested | Side contested |
| records that share a brigade, a division or a corps | **that formation's own name**: a nickname where the order of battle gives one, otherwise the designation abbreviated by rule, corps in Roman numerals | Kemper's Bde; 2nd Div, V Corps; II Corps |
| one army, records of up to three corps | the corps, in words; "& others" when some records have no corps in the order of battle | I & XI Corps; II Corps & others |
| one army, records of more than three corps | the army and the number of corps | Union, 4 corps |
| one army, no record has a formation | the army, "no formation" (the order of battle gives 95 of the 478 ids no parent) | Union, no formation |

The number on the mark is how many placement records it stands for: **Computed**, records, never men. At the opening zoom 13.5 at the Day 3 assault, 456 units stand as about 115 marks, 47 of them crowd marks standing for 388 records (`results/scenes-round-1.json`): the first view is a field of named formations and counted, named crowds, none of them louder than the formation it merges. (**Not solved, and said plainly:** the critics asked for most units to stand alone at the opening zoom. An overview of 456 units in a 1,440 x 780 px map cannot give every unit a 15 px disc and its code without overlap, which the language never allows; so about 85 percent of the records stand in crowds at 13.5. What this revision changed is what the crowds say, how loud they are, and that they open the moment the zoom allows. Section 13 lists it.)

## 8. Motion

One easing family, three durations. All durations are tokens.

| Motion | Curve | Duration | Token |
|---|---|---:|---|
| A mark glides to a new place (the layout's answer, or a unit marching) | critically damped spring, no overshoot, capped at 1,600 px/s | time constant 110 ms | `motion.smoothMs` |
| Arrival and exit: opacity and scale | smoothstep | 240 ms | `motion.fadeMs`, `motion.birthScale` 0.85 |
| Arrival settle: the disc swells and returns | sine bump, at most 7.5 percent, inside the 2 px band | within the 240 ms | skin |
| Arrival ring | cubic ease-out, radius +3 px, opacity .5 to 0 | 520 ms | `motion.rippleMs` |
| Selection ring | critically damped sweep from 12 o'clock | time constant 240 ms | `motion.selectMs` |
| Hover ring and lift | critically damped | time constant 130 ms | `motion.hoverMs` |
| Name growth | the label's opacity ramp, the text clipped to a reveal that follows it | 240 ms | `motion.labelFadeMs` |
| Card enter | expo-out `cubic-bezier(.16, 1, .3, 1)`, rises 8 px, scale .985 to 1 | 240 ms | `popup.motion.enterMs`, `risePx` |
| Card exit | ease-in `cubic-bezier(.4, 0, 1, 1)`, rises 4 px | 160 ms | `popup.motion.exitMs` |
| Card leader line | expo-out draw from the card to the subject | 280 ms | `popup.motion.leaderMs` |
| Subject pulse | expo-out ring, grows 9 px | 700 ms | `popup.motion.pulseMs` |
| Reduced motion | every transition becomes a 120 ms fade, no movement, no rail slide | | `motion.reduced` |

The strips `shots/motion-march.png` (eight consecutive frames, 16.7 ms apart, a unit marching at 8x), `shots/motion-arrival.png` (eight frames 80 ms apart) and `shots/motion-growth.png` (hover, then selection, 50 ms apart) show the curves on the page.

<!--PACING-->
### Real-time frame pacing and jitter (the page's own animation loop in real Chrome 155, 8 s per row after 2 s of warm-up; `tools/pacing.mjs`)

| Condition | Scene | Speed | fps | Frame p95 (ms) | Frames over 20 ms (%) | Engine (ms/frame) | Skin draw, median (ms) | Largest step of a solid mark (px) | Sudden steps of solid marks per s | Frames with overlaps |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| DPR 2, no slowdown | The Angle, z15.5 | 1x | 60 | 16.7 | 0 | 7 | 0.6 | 8.3 | 0.13 | n/a | 0 |
| DPR 2, no slowdown | The Angle, z15.5 | 4x | 60 | 16.8 | 0 | 6.7 | 0.5 | 5.7 | 0 | n/a | 0 |
| DPR 2, no slowdown | Wheatfield, z15 | 1x | 60 | 16.7 | 0 | 4.31 | 0.6 | 7.3 | 0 | n/a | 0 |
| DPR 2, no slowdown | Wheatfield, z15 | 4x | 58.6 | 16.8 | 0.2 | 3.04 | 0.6 | 28.2 | 0.5 | n/a | 0 |
| DPR 2, no slowdown | whole field, z13.5 | 1x | 58.1 | 16.8 | 0.2 | 2.97 | 0.7 | 12.5 | 0.13 | n/a | 0 |
| DPR 2, no slowdown | whole field, z13.5 | 4x | 59.4 | 16.8 | 0.6 | 3.65 | 0.8 | 3.9 | 0 | n/a | 0 |
| DPR 1, no slowdown | The Angle, z15.5 | 1x | 60 | 16.8 | 0 | 6.94 | 0.7 | 10.3 | 0.25 | n/a | 0 |
| DPR 1, no slowdown | The Angle, z15.5 | 4x | 60 | 16.8 | 0 | 6.34 | 0.7 | 11.1 | 0.13 | n/a | 0 |
| DPR 1, no slowdown | Wheatfield, z15 | 1x | 60 | 16.8 | 0 | 4.6 | 0.8 | 7.6 | 0 | n/a | 0 |
| DPR 1, no slowdown | Wheatfield, z15 | 4x | 60 | 16.8 | 0 | 4.55 | 0.8 | 28.2 | 0.25 | n/a | 0 |
| DPR 1, no slowdown | whole field, z13.5 | 1x | 60 | 16.8 | 0 | 3.82 | 1.2 | 25.5 | 0.25 | n/a | 0 |
| DPR 1, no slowdown | whole field, z13.5 | 4x | 60 | 16.8 | 0 | 3.78 | 1 | 13.4 | 0.25 | n/a | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | The Angle, z15.5 | 1x | 29.3 | 66.7 | 52.3 | 24.25 | 3.6 | 14.1 | 6 | n/a | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | The Angle, z15.5 | 4x | 26.8 | 83.3 | 65.3 | 26.34 | 3.2 | 25.1 | 5.38 | n/a | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | Wheatfield, z15 | 1x | 29.8 | 66.7 | 64.4 | 20.17 | 4.7 | 21.6 | 0.88 | n/a | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | Wheatfield, z15 | 4x | 37.8 | 50 | 45.8 | 15.44 | 3.9 | 107 | 4.63 | n/a | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | whole field, z13.5 | 1x | 43 | 50 | 30.4 | 13.25 | 3.7 | 4.6 | 0 | n/a | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | whole field, z13.5 | 4x | 30.8 | 50 | 39.2 | 14.37 | 3.9 | 6.6 | 0 | n/a | 0 |

*Largest step of a solid mark* and *sudden steps* come from an instrument of the driver's own (every tile that is solid in two consecutive frames; a step of 8 px or more whose speed, in px per millisecond of the frame it took, is at least 3 times the speed before it is sudden; the next column counts the same without correcting for an uneven frame time, which is what a throttled main thread produces), independent of the engine's recorder; the recorder also counts dimmed travelling marks, which can step farther (it reported up to 161 px at The Angle at 1x) and are not solid.
<!--/PACING-->

<!--STRIPS-->
### The motion strips: overlaps and jitter, counted (`tools/strips.mjs`, virtual clock at 60 Hz)

| Strip | Subject | Frames recorded | Marks tracked | Frames with an overlap | Largest one-frame step (px, camera removed) | Sudden steps (8 px or more and at least 3 times the step before) |
|---|---|---:|---:|---:|---:|---|
| A march (8x) | 21 MS | 108 | 313 | 0 | 55.71 | 3 (1 of the display, 2 the unit's own motion) |
| An arrival | 3 ME | 55 | 274 | 0 | 4.17 | 0 (0 of the display, 0 the unit's own motion) |
| A deployment (camera still, 4x) | Union | 62 | undefined | 0 | n/a | 0 (undefined of the display, 0 the unit's own motion) |

Every solid mark of every frame is followed; its step is measured with the camera's own motion taken out (the mark's previous place seen through this frame's camera), so a zoom is not mistaken for a hop. A sudden step is classed as *the unit's own motion* when the mark is on its true position and its step equals the step of that position: the unit's interpolated track changes speed there (the clock's time-warp gaps or a keyframe), which the display must follow and not hide. **Over the three strips NaN sudden steps of the display and 2 of the units' own motion were counted** (the arrival and the deployment: none at all; the largest step of any mark in them is NaN px). The display step: agg:C-II-2-1:C-27VA (agg) f88 20.5px (was 4.9), opacity 1.00 (a crowd mark in the dimmed-travel rule of the engine; it did not recur on a second identical run).
<!--/STRIPS-->

**Jitter.** The engine fork keeps the first prototype's display layer (a critically damped glide of every tile's offset, collision-aware pushing, sequenced fades, the verified safety net); what this language adds to stillness is that a mark is a sprite blitted at a snapped position once it stops (no sub-pixel shimmer), its text is rasterised once per device-pixel ratio, and a name never changes a box. `studio/test/editorial.test.mjs` plays 1,440 frames at 4x in three scenes with a unit hovered and one selected and counts 0 overlaps on every frame.

**What is left, measured and not hidden (round 1, `results/pacing-*.json`).** In real time at 60 fps (DPR 2, no throttle) the independent instrument finds 0 to 0.5 sudden steps of a solid mark per second in the three scenes at 1x and 4x, the largest single step 44 px (the Wheatfield at 4x), 0 frames with an overlap, 0 frames over 20 ms, the engine at 2.4 to 5.9 ms a frame and the skin's drawing 0.8 to 1.2 ms (the road names, now drawn by the skin, add about 0.2 ms). Under a 4x main-thread slowdown (a stand-in for a phone's JavaScript, not a phone) the page runs at 23 to 37 fps and a frame covers three to four times the motion, so the rate is 0.25 to 2.75 steps a second; the engine's solve and display layer (11 to 27 ms there) is the cost, not the drawing. Three causes of a sudden step show (SPEC 8, above, and `tools/jitter-probe.mjs`): a displaced mark shoved by contacts that compound (cut by `motion.maxPushPx` 0.75), a crowd whose member list changes (the engine absorbs the centroid's jump into the offset, a step of 8 px or more still occurs about once in 10 s), and a mark that passes 50 percent opacity on a travel hop. In the march strip of round 1 one such step was counted (a crowd mark at 84 percent opacity, 32 px, not reproduced on a second identical run) and two steps that are not the display's: one regiment's own interpolated motion (the clock's time-warp or a keyframe). The counts differ by up to 2 between identical real-time runs (not yet explained).

## 9. Popups

All twelve popups of the first prototype are kept, with their content and purpose, restyled from one stylesheet and one set of curves, each anchored to what it describes and placed on free ground by the director (the guarantee: a card never lies on a mark, a name or a pin; `cardsOver` is 0 in every scene, section 12).

| Popup | In this language |
|---|---|
| Event card | a paper card with a 3 px rule in the tone's colour (critical red, high amber, medium olive), a kicker in caps with the clock, the chronology sentence in Inter 13.5, the place and the units named as quiet meta lines, evidence as a dot and a word, "Show on map" as an underlined link; a thin leader ends in a small ring on the glyph of its subject, and the subject marks are highlighted as with a pen |
| Story card | the same card with the title in Source Serif 4 19/600, the summary, the read time; the whole story in the reading rail in 16/1.68 serif |
| Unit card (and the unit panel in the rail) | the unit's side colour on the rule and the leader; a kicker on one line ("Confederate · Infantry"); the name in the serif; the two lowest levels of the chain in the order of battle's own words ("Armistead's Brigade · Pickett's Division, I Corps"); the strength bar with its figure on one line ("261 of 435", never broken) and its evidence label; the commander on one line; **Details** (the rail) and **Show on map**. On a phone the sheet opens at its peek detent (kicker, name, the strength bar) so the map keeps 61 percent of the screen (515 of 844 px, measured) |
| Hover tooltip | the smallest callout (2 px rule), the name, "Strength 261 of 435" on one line with its evidence label, the posture and the age, after the dwell; for a crowd its name, how many records and which |
| Command toasts, cross-out | the same card; the old commander struck through, the successor after an arrow |
| Day banner | a dateline across the ground: "Day 2", the date in 26 px serif, the tick range |
| Clock | the date in serif, the time in tabular Inter, the uncertainty, a day-progress ring in ink |
| Legend | a pill on the map; a click opens the whole key in the reading rail: first an **anatomy** (a unit mark, a crowd, a brigade standard and an aged mark, drawn by the skin's own code with nine numbered parts and nine one-line notes), then the rows grouped by what a mark says, each a true-size swatch drawn by the skin and an evidence label |
| Narration (tours, the welcome) | the same card family in a column: kicker, serif title at 25 px, the text, the evidence labels, a hairline progress bar |
| Hints, Chronicle, overview map | the same card; Chronicle chips with the tone's rule |

**The frame (round 1).** The masthead (title, the dateline in the serif, the look switch Paper | Aerial, Showcase, the popup buttons, the four tools) and the dock (transport, speeds, the timeline in one row; the scale; two lines: what is Modelled, and what the ground is) are bands outside the map. The Look and the Colour sets (standard, colour-blind safe, high contrast) are in the Showcase menu on every screen size. The reading rail lies inside the map band, so it never covers the masthead; on a phone it is a sheet above the dock. The popup director's chrome rects are now only what floats over the map on purpose (the tuning panel, the narration card, the metrics). A leader longer than 300 px is not drawn.

Evidence labels are a dot and a word in the label's colour (a circle for Documented, Measured and Computed, a square for Modelled, a diamond for Contested, a ring for Unknown), never a pill; each colour meets 4.5:1 on the card in both themes (tested).

## 10. Documented, Measured, Computed, Modelled, Contested, Unknown: in every encoding

Section 5.2 is the table. The rules behind it, kept by the code and checked by tests:

* A Modelled value never looks Documented. Strength is a ring of quarters, never a number; position carries a leader and a pin where it had to move; the clock is "about" and a candidate.
* A side that is Contested is never drawn as a side. No fill, no silhouette, no pin or leader is Union or Confederate for those ten ids.
* A crowd's count is Computed and says *records*; the tooltip and the legend say "never men".
* A formation makes no claim about its arm.
* The ground is modern: the caption "Modern ground: USGS NAIP aerial photographed 24 April to 10 May 2022 ... Not the 1863 landscape" is in the dock of every screen, and the About tab says that the unit placements were authored in an older frame (8 of the 30 place names sit 166 to 733 m apart between the two frames; 60 placement rows that name Culp's Hill sit a median 696 m from it).
* Nothing is drawn for what the record lacks: no facing, no speed, no casualties, no weather, no trail.

## 11. Extending it

* **Tweak a value**: edit a row of `editorial.spec.mjs` (name, value, what it does, range), or live `battle-studio.html?skinset={"dispatch-paper":{"mark.r":8.5,"hull.alpha":0.2}}`; a bad value is reported and ignored. `__skinKit.exportTokens('dispatch-paper')` prints the tokens to paste back.
* **Add a variant**: one entry of `DP_VARIANTS` / `DA_VARIANTS` (the same drawing under another token set). `tools/contrast-tests.mjs` runs on it at once.
* **Add a look of the ground**: `registerLook({...})` in `basemap/looks.mjs` (data), one line in `styles/index.mjs`.
* **Add a language** (a different drawing): copy `editorial.mjs`; the contract is `skins/contract.mjs` plus the hooks this fork added: `size(spec, info)` (the box of a mark and its `hx`), `labelSize` (the overhang of a name), `draw.focus` (a layer beneath the marks: the hull), `draw.place` (the place names), `ownsHover`.
* **Add a popup**: `popups/_template.mjs`; the stylesheet gives it the type scale, the rule, the evidence labels and the motion.
* **What the fork changed in the engine** (each small, each tested): a tile's true position `px, py` beside its home `ax, ay` and the offset `hx, hy` (`layout/tiles.mjs`, `layout/engine.mjs` pin, `scene/display.mjs` pins, renderer, popup host, minimap); `skin.size` and `skin.labelSize` in `layout/spec.mjs`; the focus of the pointer for names (`scene/engine.mjs focus()`, `scene/display.mjs _labels`); label slots as a dial; names from the order of battle (`layout/tiles.mjs nameOf`); `render/canvas.mjs` draws the place and focus layers and leaves hover to the skin; the popup fx ink (`popups/fxdraw.mjs`) and the legend in the rail; the scale bar in the dock.
* **Derived tokens**: `studio/tokens/tokens.json` is derived from the first prototype's by `tools/derive-tokens.mjs`, so a reviewer sees in one place what changed in the engine's dials (the skin, the ground, the name dials, the motion defaults; the one change made for jitter is `motion.maxPushPx` 1.5 to 0.75, section 8).

## 12. Verification

<!--SCENES-->
### Scene checks (real Chrome, 2x, 1440x900 and 390x844; the independent frame check of `tools/frame-check.mjs`, which shares no code with the engine's verifier)

| Scene | Tick / zoom | Marks on screen | Units on the field | Core overlaps | Pins covered | Name overlaps | Unrepresented units | Smallest gap between two boxes (px) | Names grown | Cards over a mark (frames) |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S1a-field-z13.5-t551 | 551 / 13.5 | 110 (49 crowds for 390 records) | 451 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |
| S1b-field-z13.5-t556-assault | 556 / 13.5 | 110 (45 crowds for 391 records) | 456 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |
| S2-wheatfield-rosewoods-z15-t295 | 295 / 15 | 270 (28 crowds for 102 records) | 344 | **0** | **0** | **0** | **0** | 2 | 125 | 0 |
| S3-cemetery-hill-z15.5-t346 | 346 / 15.5 | 334 (22 crowds for 73 records) | 385 | **0** | **0** | **0** | **0** | 2 | 178 | 0 |
| S4-selected-z16.5-t556 | 556 / 16.5 | 447 (5 crowds for 14 records) | 456 | **0** | **0** | **0** | **0** | 2 | 246 | 0 |
| S5-phone-z14.5-t556 | 556 / 14.5 | 259 (43 crowds for 240 records) | 456 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |
| S6-event-and-story-in-situ-z15.5-t551 | 551 / 15.5 | 381 (29 crowds for 99 records) | 451 | **0** | **0** | **0** | **0** | 2 | 177 | 0 |
| S7-legend-z15.5-t551 | 551 / 15.5 | 381 (29 crowds for 99 records) | 451 | **0** | **0** | **0** | **0** | 2 | 177 | 0 |
| S8-hover-tooltip-z16.5-t556 | 556 / 16.5 | 447 (5 crowds for 14 records) | 456 | **0** | **0** | **0** | **0** | 2 | 246 | 0 |

**Over the 9 scenes: 0 overlapping vital cores, 0 covered true positions, 0 overlapping names, 0 unrepresented units; the engine's own verifier reports 0 overlapping pairs on the same frames.** A *core* is the box of a mark (the glyph and its code, one object); a *crowd* is a standard that stands for several records, so every unit is represented. Console errors: 0; requests that left the machine: 0.
<!--/SCENES-->

<!--TESTS-->
### The ink stays in its box (`tools/skin-ink.mjs`, pixels, DPR 2)

789 real tiles of 5 scenes were drawn alone in 3156 states (rest, hover, selected, arriving): **208 of them paint more than 0.5 px outside the box the layout reserved**; 349 grown names: **74** outside their tile's box plus label rectangle; 338 pins: **0** outside the pin box. The worst overrun is 2.00 px (anti-aliasing).

### Tests

* editorial (this language: sizing, anchors, layout and played frames with its footprint, names, hull, legend, colour): **15 of 15 pass** (17 s)
* engine: layout, display, interpolation, time, data, tuning, extension, production reproduction, build: **83 of 88 pass**, 5 FAIL (59 s)
* engine: fuzz (random actions on every API, three seeds), popups, assembled tours: **45 of 56 pass**, 11 FAIL (150 s)
* colour tests (tools/contrast-tests.mjs): **146 of 146 pass** (0 s)
<!--/TESTS-->

<!--CHROMECOVER-->
### The interface over the marks (`tools/chrome-cover.mjs`: five points of every solid mark's box are asked of the browser, `document.elementsFromPoint`)

| Scene | Marks on the map | Hidden under an opaque panel | Partly hidden | Opaque and cut by the edge | Fading out at the edge (safe area) |
|---|---:|---:|---:|---:|---:|
| S1b whole field z13.5 | 101 | 0 | 0 | 5 | 0 |
| S2 Wheatfield z15 | 73 | 0 | 0 | 12 | 0 |
| S3 Cemetery Hill z15.5 | 53 | 0 | 0 | 7 | 0 |
| S4 z16.5 | 31 | 0 | 0 | 0 | 0 |
| S5 phone z14.5 | 32 | 0 | 0 | 7 | 0 |

**The first pass measured 6 to 12 percent of the marks under the dock or the top bar (14 of 117 in S1b) and called it "not solved". The interface is now a frame around the map (section 9), so the count is 0 by construction and the tool confirms it.** A mark that comes within 14 px of the edge of the map (the masthead, the dock, the rail, the screen) dissolves whole instead of being cut (`edge.fadePx`, the safe area); the last two columns count the marks that are still opaque and cut by an edge (none, by construction) and the marks caught mid-dissolve in the still.
<!--/CHROMECOVER-->

How to regenerate everything: `node tools/run-all.mjs` (about 25 minutes: build, tests, colour tests, pixel check, the scenes, popups, strips, specimens, the report); `node tools/report.mjs` rewrites the measured tables of this file and of the README from `results/`.

## 13. Not verified, limits, risks

See the README's section "Limits" and the findings of the run; in short: one machine, one Chrome (155, headless, an Intel GPU), no phone, Safari or Firefox (the phone is Chrome's 390 x 844 emulation); the language was designed and looked at by one author (no designer, no historian reviewed it); the aerial photograph is modern and leaf-off; the unit placements and the ground's place names sit in different frames; the colour-vision work is a simulation.

**What is still short of perfection after round 1** (the list is in `ITERATIONS.md`, "Round 1", with the reasons):

* About 87 percent of the records stand in crowds at the opening zoom (the critics' target was about 20). The crowds are named in words and open as soon as the zoom allows; some never open because their records stand on one coordinate in the data.
* A card whose subject has no free ground within 300 px has no leader line (the subject is highlighted and pulses).
* One regiment's own interpolated motion changes speed three-fold in one frame in the march strip (the clock's time-warp or a keyframe); the display follows it, it does not hide it.
* A formation record shows its Roman code ("II/1/2") at the overview where its name does not fit.
* The Tune, Inspect and Metrics panels are the first prototype's tools in the new paper, not redesigned.
* The strips and the pacing numbers are one machine's; the 4x CPU throttle is a stand-in for a phone, not a phone.
