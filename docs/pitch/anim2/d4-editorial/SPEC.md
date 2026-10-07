# Dispatch: the Editorial Annotation language (art direction 4)

*The map is the hero. The marks are quiet narrators.* A design language for the Battle Studio's unit marks, formation marks and popups, in the register of a newspaper graphics desk (the New York Times, the Washington Post, the Guardian, Esri's story maps at their best). It is a skin module plus a token file of the engine, a stylesheet, and a handful of small engine hooks; nothing else changed. Everything below was drawn by the code in this folder, on the real USGS aerial ground, from the real order of battle, and measured by the scripts in `tools/` and `studio/test/`. Pictures are in `shots/`; how they were made is in section 12; the log of what was seen and changed is `ITERATIONS.md`.

| What | Where |
|---|---|
| The working fork (engine, skin, popups, tokens, stylesheet) | `studio/` (build: `node studio/build.mjs` -> `dist/battle-studio.html`) |
| The skin and its token file | `studio/src/skins/editorial.mjs`, `studio/src/skins/editorial.spec.mjs` |
| The interface and the popups | `studio/src/ui/editorial.css`, `studio/src/popups/fxdraw.mjs`, `studio/src/popups/legend.mjs` |
| The two typefaces, their licences and sources | `fonts/`, `fonts/SOURCES.md` |
| The scenes S1 to S8, the popups, the motion strips, the specimens | `shots/` |
| Colour tests, pixel-ink check, scene checks, tests | `results/`, `tools/`, `studio/test/editorial.test.mjs` |

## 1. Principles

1. **The map is the hero.** The ground is a real photograph of the real hills (USGS NAIP, April to May 2022), lit by a USGS elevation model, with contours and TIGER roads, in two looks: *paper* (the aerial ghosted into warm paper, brown relief: a survey print) and *aerial* (the photograph dimmed and calmed). A mark is small, flat and quiet; it sits on the ground like ink on a printed map. No plate, no shadow, no gradient on a mark. The interface around the map is paper (or ink) with a hairline, never glass.
2. **One object per unit.** A unit is one mark: a bold disc (a regiment, a battery, a battalion) or a standard (a brigade, division or corps record), one white glyph inside it, and its short code written beside it with a halo, as part of the same object. There is no caption box behind the text and no second box. The full name is *that same text growing*: it wipes out to the right of the code, in the free ground the layout reserved for it, on hover, on selection and, where there is room, at close zoom. The code gives way to the name in place; nothing appears beside it.
3. **Three levels of weight, no more.** (1) formation marks: a standard (brigade, division, corps) and the crowd mark (a standard with a count); (2) unit marks: discs; (3) secondary detail: the strength ring, the hull, the leader and the pin, the place names. Two type sizes on the map (12 px for a unit's code and name, 13 px for a formation or a count) and one numeral style (Inter 700). Nothing that must be read is under 11 px at 1x.
4. **Quiet.** No dashed outline anywhere (an approximate place is a soft disc, a Modelled age is a fade). No tiny badge: a mark has no corner chips. Crowds merge into a standard with a number whose pile behind it says "several"; its hull and the true position of each record appear on interaction only. Age is **one** device, used everywhere: a mark whose latest keyframe is old *fades* (its colour drains toward the grey of the same lightness, its ring thins, its glyph softens), gradually, over half a battle day to a whole one.
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
| Standard (body), brigade / division / corps | 26x17, 32x21, 38x25 | `flag.w.*`, `flag.h.*` |
| Crowd mark body, pile offset | 28x19, 3.5 | `flag.w.crowd`, `flag.h.crowd`, `flag.stack` |
| Notch of a Union standard, point of a Confederate one | 5 | `flag.notch` |
| Pips of a formation record (1 brigade, 2 division, 3 corps), radius, pitch | 2.1, 4.6 | `pip.r`, `pip.pitch` |
| Gap mark to text, left pad, right pad, reserved band | 3, 2, 2, 2 | `gap.text`, `pad.*` |
| Box height: unit / battalion / brigade / division / corps / crowd | 24 / 26 / 26 / 30 / 34 / 32 | derived by `sizeOf()` |
| Pin box (a true position) | 7x7 | `pinHalf` 3.5 |
| Clearance between two boxes | 2 | `layout.gapPx` |

The box of a mark is what the layout reserves, and the layout's guarantee (no two boxes overlap, no box covers another mark's true position, every unit represented) holds for *that* box. `tools/skin-ink.mjs` proves the other half: it draws every tile alone and measures the pixels it painted (section 12).

## 3. Type

| Role | Face | Size / weight | Where |
|---|---|---|---|
| Code of a unit mark; the name that grows out of it | Inter | 12 / 600 | map |
| Code of a formation mark and a crowd; the name of a formation | Inter | 13 / 700 | map |
| The count in a crowd mark, the pips | Inter (numerals) | 13 / 700 | map |
| Place names | Source Serif 4 italic | 12 / 400 | map |
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

The interface palette lives in `editorial.css` (`--bg --panel --text --muted --accent`, the tone inks and the six evidence colours), in a light and a dark theme that follow the ground.

Every pair is tested (`tools/contrast-tests.mjs`, also run by `editorial.test.mjs`; the ground is **measured**: seven luminance bands of the real backdrop at three zooms and four scenes in each look, `results/ground-bands.json`):

<!--CONTRAST-->
**134 of 134 checks pass** (6 skins x the mark tests, 2 themes x the card tests).

| Group | Pass | Weakest pair | Measured | Bar |
|---|---:|---|---:|---:|
| glyph on fill | 30 of 30 | dispatch-aerial/contrast: white glyph on Confederate, fresh | 4.78:1 | 4.5:1 |
| text | 6 of 6 | dispatch-paper: ink on its halo | 14.3:1 | 7:1 |
| ring on ground | 6 of 6 | dispatch-paper: best ring on the worst of 28 measured ground colours (#a09270) | 3.33:1 | 3:1 |
| selection | 6 of 6 | dispatch-paper: amber ring against its dark underlay, worst ground | 3.31:1 | 3:1 |
| side separation | 36 of 36 | dispatch-paper/cvd: Union against Confederate, luminance ratio (greyscale print) | 1.32:1 | 1.3:1 |
| age | 12 of 12 | dispatch-aerial/contrast: a battle-day-old Union mark against a fresh one (the fade must be visible), CIEDE2000 | 4.25 dE2000 | 4 dE2000 |
| card text | 38 of 38 | light: --evi-Contested (an evidence label) on the card | 5.66:1 | 4.5:1 |

Full list: `results/contrast-tests.json`.
<!--/CONTRAST-->

The honest limits of these tests: the colour-vision figures are a software simulation (Machado, Oliveira and Fernandes 2009 matrices, severity 1.0), not people; the CIEDE2000 bar of 20 is this project's own, not a WCAG number; the ring test uses seven percentile colours of each backdrop, not every pixel (a dark hairline outside a light ring guarantees at least 4.6:1 for one of them on any ground, which is why it works).

## 5. The anatomy of a mark

The specimen sheets draw every encoding with the skin's own code on the real ground: `shots/specimen-paper.png`, `shots/specimen-aerial.png`, and the variants `specimen-paper-cvd.png`, `specimen-aerial-contrast.png`.

```
        unit mark                                         formation standard                              crowd mark
   (ring: light 1.5 + hairline 1)                    (ring of the same two widths)               (the pile behind it, offset 3.5)
        .--------.                                      ______________                              ______________
       / ( X )    \  14 VT   <- code, haloed           |  .  .        >  I/3/2  <- code, 13/700    |   9        <  II/2  <- the lead record or the formation
       \  disc 15 /                                    |_____________>                              |___ count __>
        '--------'                                      brigade: 26x17, Union swallow-tail,        a standard that stands for N records
   the glyph centre IS the true position                Confederate point; pips = echelon
```

### 5.1 The glyph stands on the true position

A mark is wider than its disc, because the text is part of it. The engine's first prototype centred every box on the unit's position; for a mark whose glyph stands left of its text that would put the disc 15 to 30 px away from the place it claims. Here every tile has a *true position* (`px, py`, where the pin and the hull dots stand) and a *home* (`ax, ay`, the centre of its box when it is undisplaced), and `hx = ax - px` is the offset the skin's `size()` returns. The layout works in home coordinates (its guarantee machinery is unchanged); the pin protection, the leader, the pin, the hull and the minimap use the true position. The test `the glyph stands on the true position` checks every tile of a real frame: an undisplaced mark has its glyph within 1.6 px of its unit, a displaced one has a pin there.

### 5.2 Encodings

| Channel | Encoding | Field of the data | Label |
|---|---|---|---|
| **Side** | colour *and* silhouette: Union a blue circle (unit) or swallow-tailed standard; Confederate a red rounded square or pointed standard; the **contested** side (10 ids whose state code contradicts the prefix) a hatched amber diamond; a crowd of both sides a standard split blue and red | `side` (order of battle, id prefix) | Documented; **Contested** for the ten; **Computed** for a mixed crowd |
| **Arm** | one white glyph in the disc: infantry a saltire, cavalry a slash, artillery a dot (the APP-6 convention; cavalry and artillery states are not drawn) | registry `arm` | Documented |
| **Echelon** | size and shape: a battalion's disc is larger; a brigade, division, corps record is a standard with 1, 2, 3 pips and a larger body. A formation record has **no arm glyph**: the data gives a formation none | registry `kind` | Documented |
| **Identity** | the code beside the mark; italic when the id has no order-of-battle record | `short`, `inOob` | Documented; **Unknown** for the 95 ids with no record |
| **Strength** | the light ring of a unit disc is a four-arc gauge: the lit arcs are the keyframe's strength over the unit's reference strength, in quarters (a state, not a number) | keyframe `strength`, `strengthRef` | **Modelled** (a placement value, not a casualty record) |
| **Age** | the fade (principle 4): fill, ring and glyph, from half a battle day to a whole one | ticks since the latest keyframe | **Computed** |
| **Crowd** | a standard with a number: that many placement records share the mark (records, never men); the pile behind it; a trailing plus when the name is the lead record's | the layout's aggregate | **Computed** |
| **Position** | the glyph centre; a displaced mark has a thin leader and a dot at the true place (drawn only when that place is clear of the mark and not under its own text) | keyframe lat/lng | **Modelled** (hand-authored; between keyframes an interpolation) |
| **Hull** | the soft shape of the formation's records, on hover or selection | order-of-battle chain, true positions | **Computed** from Modelled positions |
| **Place names** | italic serif with a dot (a ring: the site's own coordinate; a filled dot: moved to the summit the elevation model measures; a trailing "?" on the two names whose coordinate has no building of that name: the Lutheran Seminary, 679 m from its cupola, and the Evergreen Cemetery gatehouse, nothing within 25 m); a name steps aside, fading, for any mark that would stand on it | `terrain.json`, 3DEP, the basemap's landmark check | Modelled; **Measured** for three hills |

### 5.3 The unit's name grows out of the mark

The layout already places a secondary label in free ground after every box is placed (it never moves a box). This language uses that mechanism for the name: the label rectangle is only the *overhang*, the part of the name beyond the room the code already has, adjacent to the mark (gap 0) and only to the right (`layout.labelSlots = r`). When it is shown, the mark's code fades and the name wipes out along the same baseline from the same x. Names are the order of battle's own words: a regiment's designation without the nickname in brackets (the nickname stays on the unit card), a formation's short name when whole, otherwise its designation with ordinals as figures ("Third Brigade, Second Division, Third Corps" -> "3rd Bde, 2nd Div, 3rd Corps"); `editorial.test.mjs` checks that every word of every name is in the unit's own record and that none is cut with an ellipsis (the dataset's `label` is cut at 24 characters: "Battery A, 4th US Artil..."). The hovered unit takes its room first and without the show delay, at any zoom; names appear everywhere else from zoom 15, where they fit.

### 5.4 The hull and the leader

On hover or selection the formation's hull appears beneath every mark: the convex hull of the true positions of the unit's brigade (or of a crowd's records), padded 15 px, in the side colour at 13 percent with a soft rim where the stroke and the fill overlap, and a dot at each record's true position. It is a soft translucent shape, not a claim about a line of battle. A displaced mark's leader is 1.1 px in its side colour over a 3 px halo, from the true position to the edge of the disc; the pin is a 2 px dot with a white ring and a hairline. Neither is drawn when the true position is inside the mark's own box.

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

A **formation record** (a brigade, division or corps that has its own placement) is a standard: larger with echelon, side by silhouette, pips for the level, its short name in 13/700. A **crowd** is what the layout makes when marks cannot all stand on their true positions within the displacement budget (48 px): the nearest records merge, deepest common ancestor first, into one standard with a count. A crowd is named by what its records share: the formation's code ("II/1/2"), "Contact" when both sides are in it, otherwise its lead record's code with a plus. Nothing is dropped: the engine's guarantee (every unit in exactly one mark) is checked on every drawn frame.

At the opening zoom 13.5 at the Day 3 assault, 456 units stand as 141 marks, 68 of them crowd marks standing for 383 records (`results/scenes-final.json`).

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
| DPR 2, no slowdown | The Angle, z15.5 | 1x | 60 | 16.8 | 0 | 6.45 | 0.6 | 10.3 | 0.25 | 0 |
| DPR 2, no slowdown | The Angle, z15.5 | 4x | 60 | 16.8 | 0 | 6.13 | 0.6 | 11.1 | 0.13 | 0 |
| DPR 2, no slowdown | Wheatfield, z15 | 1x | 60 | 16.8 | 0 | 4.33 | 0.8 | 5.4 | 0 | 0 |
| DPR 2, no slowdown | Wheatfield, z15 | 4x | 60 | 16.8 | 0 | 5.08 | 0.8 | 28.2 | 0.13 | 0 |
| DPR 2, no slowdown | whole field, z13.5 | 1x | 60 | 16.8 | 0 | 2.97 | 1.2 | 18.3 | 0.25 | 0 |
| DPR 2, no slowdown | whole field, z13.5 | 4x | 60 | 16.8 | 0 | 2.72 | 1.1 | 13.4 | 0.25 | 0 |
| DPR 1, no slowdown | The Angle, z15.5 | 1x | 60 | 16.8 | 0 | 6.94 | 0.7 | 10.3 | 0.25 | 0 |
| DPR 1, no slowdown | The Angle, z15.5 | 4x | 60 | 16.8 | 0 | 6.34 | 0.7 | 11.1 | 0.13 | 0 |
| DPR 1, no slowdown | Wheatfield, z15 | 1x | 60 | 16.8 | 0 | 4.6 | 0.8 | 7.6 | 0 | 0 |
| DPR 1, no slowdown | Wheatfield, z15 | 4x | 60 | 16.8 | 0 | 4.55 | 0.8 | 28.2 | 0.25 | 0 |
| DPR 1, no slowdown | whole field, z13.5 | 1x | 60 | 16.8 | 0 | 3.82 | 1.2 | 25.5 | 0.25 | 0 |
| DPR 1, no slowdown | whole field, z13.5 | 4x | 60 | 16.8 | 0 | 3.78 | 1 | 13.4 | 0.25 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | The Angle, z15.5 | 1x | 26.3 | 66.7 | 73 | 25.68 | 4.2 | 14.9 | 2.13 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | The Angle, z15.5 | 4x | 26.9 | 66.7 | 74.1 | 23.96 | 4.1 | 31 | 4 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | Wheatfield, z15 | 1x | 31 | 66.6 | 59.4 | 18.26 | 5.2 | 14.5 | 0.63 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | Wheatfield, z15 | 4x | 29.9 | 66.6 | 70.8 | 18.4 | 5.9 | 14.6 | 1.75 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | whole field, z13.5 | 1x | 32.3 | 66.6 | 52.9 | 15.32 | 6.8 | 18.6 | 0.25 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | whole field, z13.5 | 4x | 31.7 | 66.6 | 58.7 | 14.1 | 7.7 | 15 | 0.25 | 0 |

*Largest step of a solid mark* and *sudden steps* come from an instrument of the driver's own (every tile that is solid in two consecutive frames; a step of 8 px or more that is at least 3 times the step before it is sudden), independent of the engine's recorder; the recorder also counts dimmed travelling marks, which can step farther (it reported up to 161 px at The Angle at 1x) and are not solid.
<!--/PACING-->

**Jitter.** The engine fork keeps the first prototype's display layer (a critically damped glide of every tile's offset, collision-aware pushing, sequenced fades, the verified safety net); what this language adds to stillness is that a mark is a sprite blitted at a snapped position once it stops (no sub-pixel shimmer), its text is rasterised once per device-pixel ratio, and a name never changes a box. `studio/test/editorial.test.mjs` plays 1,440 frames at 4x in three scenes with a unit hovered and one selected and counts 0 overlaps on every frame.

**What is left, measured and not hidden.** In real time at 60 fps the independent instrument finds 0 to 0.25 sudden steps of a solid mark per second (a step of 8 px or more that is at least 3 times the step before it), the largest 28 px (a single hop at 4x in the Wheatfield). `tools/jitter-probe.mjs` plays a scene on the virtual clock and lists each such step with the tile's key and kind. Three causes show: (a) a displaced mark shoved by contacts that compound (its unit at rest, its drawn box moving 2.5 px a frame and then 8 px in one): `motion.maxPushPx` went from the first prototype's 1.5 to 0.75, which cut the Wheatfield's hops at 4x from about 6 to about 2 in 600 frames, with 0 overlaps either way and the number of dimmed travelling frames within 10 percent (from 8 percent fewer to 9 percent more across the runs); (b) a crowd whose member list changes (the engine absorbs the centroid's jump into the offset; steps of 8 to 12 px still occur about once in 10 s); (c) a mark that passes 50 percent opacity on a travel hop. The counts differ by up to 2 between identical runs (not yet explained), so single digits mean the same thing. Under a 4x main-thread slowdown (26 to 32 fps) the rate is 0.25 to 4 a second, because a frame then covers 3 to 4 times the motion. The first prototype's audit counted 277 position pops a second for the *shipped* renderer at 4x (`docs/pitch/anim/06-layout.md`), but defined a pop differently (3 px beyond the true position's motion), so the two numbers are not a like-for-like comparison.

## 9. Popups

All twelve popups of the first prototype are kept, with their content and purpose, restyled from one stylesheet and one set of curves, each anchored to what it describes and placed on free ground by the director (the guarantee: a card never lies on a mark, a name or a pin; `cardsOver` is 0 in every scene, section 12).

| Popup | In this language |
|---|---|
| Event card | a paper card with a 3 px rule in the tone's colour (critical red, high amber, medium olive), a kicker in caps with the clock, the chronology sentence in Inter 13.5, the place and the units named as quiet meta lines, evidence as a dot and a word, "Show on map" as an underlined link; a thin leader ends in a small ring on the glyph of its subject, and the subject marks are highlighted as with a pen |
| Story card | the same card with the title in Source Serif 4 19/600, the summary, the read time; the whole story in the reading rail in 16/1.68 serif |
| Unit card (and the unit panel in the rail) | the unit's side colour on the rule and the leader, the name, the chain of command, the strength bar (3 px), the commander, **Details** (the rail) and **Show on map** |
| Hover tooltip | the smallest callout (2 px rule), the name, the strength, the posture and the age, after the dwell |
| Command toasts, cross-out | the same card; the old commander struck through, the successor after an arrow |
| Day banner | a dateline across the ground: "Day 2", the date in 26 px serif, the tick range |
| Clock | the date in serif, the time in tabular Inter, the uncertainty, a day-progress ring in ink |
| Legend | a pill on the map; a click opens the whole key in the reading rail, grouped by what a mark says, each row a swatch drawn by the skin and an evidence label |
| Narration (tours, the welcome) | the same card family in a column: kicker, serif title at 25 px, the text, the evidence labels, a hairline progress bar |
| Hints, Chronicle, overview map | the same card; Chronicle chips with the tone's rule |

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
| S1a-field-z13.5-t551 | 551 / 13.5 | 137 (61 crowds for 375 records) | 451 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |
| S1b-field-z13.5-t556-assault | 556 / 13.5 | 141 (68 crowds for 383 records) | 456 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |
| S2-wheatfield-rosewoods-z15-t295 | 295 / 15 | 276 (28 crowds for 96 records) | 344 | **0** | **0** | **0** | **0** | 2 | 125 | 0 |
| S3-cemetery-hill-z15.5-t346 | 346 / 15.5 | 341 (18 crowds for 62 records) | 385 | **0** | **0** | **0** | **0** | 2 | 183 | 0 |
| S4-selected-z16.5-t556 | 556 / 16.5 | 450 (4 crowds for 10 records) | 456 | **0** | **0** | **0** | **0** | 2 | 249 | 0 |
| S6-event-and-story-in-situ-z15.5-t551 | 551 / 15.5 | 389 (26 crowds for 88 records) | 451 | **0** | **0** | **0** | **0** | 2 | 181 | 0 |
| S7-legend-z15.5-t551 | 551 / 15.5 | 389 (26 crowds for 88 records) | 451 | **0** | **0** | **0** | **0** | 2 | 181 | 0 |
| S8-hover-tooltip-z16.5-t556 | 556 / 16.5 | 450 (4 crowds for 10 records) | 456 | **0** | **0** | **0** | **0** | 2 | 249 | 0 |
| S5-phone-z14.5-t556 | 556 / 14.5 | 276 (49 crowds for 229 records) | 456 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |

**Over the 9 scenes: 0 overlapping vital cores, 0 covered true positions, 0 overlapping names, 0 unrepresented units; the engine's own verifier reports 0 overlapping pairs on the same frames.** A *core* is the box of a mark (the glyph and its code, one object); a *crowd* is a standard that stands for several records, so every unit is represented. Console errors: 0; requests that left the machine: 0.
<!--/SCENES-->

<!--TESTS-->
### The ink stays in its box (`tools/skin-ink.mjs`, pixels, DPR 2)

777 real tiles of 5 scenes were drawn alone in 3108 states (rest, hover, selected, arriving): **0 of them paint more than 0.5 px outside the box the layout reserved**; 306 grown names: **0** outside their tile's box plus label rectangle; 309 pins: **0** outside the pin box. The worst overrun is 0.50 px (anti-aliasing).

### Tests

* editorial (this language: sizing, anchors, layout and played frames with its footprint, names, hull, legend, colour): **11 of 11 pass** (13 s)
* engine: layout, display, interpolation, time, data, tuning, extension, production reproduction, build: **88 of 88 pass** (66 s)
* engine: fuzz (random actions on every API, three seeds), popups, assembled tours: **56 of 56 pass** (174 s)
* colour tests (tools/contrast-tests.mjs): **134 of 134 pass** (0 s)
<!--/TESTS-->

<!--CHROMECOVER-->
### The interface over the marks (`tools/chrome-cover.mjs`: five points of every solid mark's box are asked of the browser)

| Scene | Marks on screen | Hidden under an opaque panel | Partly hidden | By |
|---|---:|---:|---:|---|
| S1b whole field z13.5 | 117 | 14 (12%) | 5 | topbar 5, dock 14 |
| S2 Wheatfield z15 | 74 | 7 (9%) | 4 | dock 11 |
| S3 Cemetery Hill z15.5 | 60 | 4 (7%) | 3 | dock 3, topbar 4 |
| S4 z16.5 | 32 | 2 (6%) | 2 | dock 4 |
| S5 phone z14.5 | 31 | 2 (6%) | 2 | dock 2, topbar 2 |

**This is not solved.** The layout and the popup director treat the dock and the top bar as part of the map; a card never lies on a mark (section 9), but the dock and the top bar do. Panning reveals a hidden mark; no one can see it where it stands.
<!--/CHROMECOVER-->

How to regenerate everything: `node tools/run-all.mjs` (about 25 minutes: build, tests, colour tests, pixel check, the scenes, popups, strips, specimens, the report); `node tools/report.mjs` rewrites the measured tables of this file and of the README from `results/`.

## 13. Not verified, limits, risks

See the README's section "Limits" and the findings of the run; in short: one machine, one Chrome (155, headless, an Intel GPU), no phone, no Safari or Firefox; the language was designed and looked at by one author (no designer, no historian reviewed it); the aerial photograph is modern and leaf-off; the unit placements and the ground's place names sit in different frames; the colour-vision work is a simulation.
