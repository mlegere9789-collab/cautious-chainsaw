# Strategy Premium: the specification

Art direction 2 of the Gettysburg Battle Studio redesign: the visual language of a campaign map in the grand-strategy tradition (Total War's campaign banners, Civilization VI's clean standards, Humankind's polish), adapted for a serious history site.  A unit is one small standard.  The crowd mark is a gilt-counted stack of standards.  Every popup is restyled in the same language.  The work is a fork of the prototype engine (`docs/pitch/anim/prototype`) running on the real aerial ground (`docs/pitch/anim2/basemap`), with the tokens in one JSON file and the skin in one module.

Everything below was produced and measured in this folder.  Numbers in the tables are written by `tools/spec-tables.mjs` from the result files in `results/`, so they cannot drift from the commands that produced them (`node tools/spec-tables.mjs --check`).

## 0. How to read the evidence labels

The site labels every claim with one of six words.  This document uses them the same way, and the legend inside the page does too.

| Label | Meaning here |
| --- | --- |
| Documented | Comes from the repo's source data (order of battle, registry, the circular of 21 March 1863 for corps badges). |
| Measured | A number a command in this folder produced on this build, in real Chrome or in node. |
| Computed | Derived by code from the data (a crowd's count, a unit's age since its last keyframe). |
| Modelled | The site's own hand-authored keyframes and what is interpolated between them (positions, strength at a placement, posture). |
| Contested | The data disagree (ten ids whose prefix and state code name different sides). |
| Unknown | No record at all (an id with no order-of-battle entry). |

A seventh word, **Design**, marks an interface choice that says nothing about the battle (the gilt selection ring, the fly shape that repeats the side).  It is never used for a claim about 1863.

## 1. What the brief asked, and where it is met

| Binding rule | How it is met | Evidence |
| --- | --- | --- |
| One object per unit: symbol with its code inside; names appear on hover, selection and close zoom as the same object growing, never a second box | The banner is the only box.  Its code sits in the cloth; the full name unfolds downward inside the same banner (zoom 15.6 to 16.1 in the layout; hover and selection draw the same unfold into ground the renderer has checked free).  The footprint the layout reserves is the footprint painted. | Section 5, section 6; `tools/ink.mjs`: 15,440 paints, 0 outside the reserved box |
| At most 3 weight levels (formation marks > unit marks > secondary detail) | Corps/division/brigade standards (gilt-framed, finial, 30 to 38 px) > unit banners (22 to 24 px) > the name line and strength line.  Crowd marks sit at the formation level (30 px, gilt pill). | Section 7 |
| At most two type sizes plus one numeral style; minimum 11 px at 1x; contrast at least 4.5:1 | The marks use two sizes only: 11 px (unit code, name, second line) and 13 px (formation code and every count; the numeral style is Barlow Semi Condensed 700, tabular).  The interface uses the same two text sizes plus one 17 px serif size, for titles and for the long-form passages of a story or tour in the reading panel, nothing else.  Nothing is smaller than 11 px.  | Section 3 (rendered DOM audit of all 14 scenes), section 4 (48 rendered-pixel samples, lowest 4.77:1) |
| Quiet: no dashed outlines, no tiny badges; crowds merge into an elegant formation mark; one consistent provisional device | No dashed outline on any mark, ring or card (rings are solid; the ring around a parent tile is a thinner solid line; the identity-only mark has a dotted rule under its code, a type device, not an outline).  The two plain fallback backdrops inherited from the engine (ink and paper, not used by this style) still draw eight doubtful place marks dashed.  Crowds are a stack of banners with a gilt count pill, never a badge.  Carried-forward positions are the same mark mixed toward grey and matte: one device, continuous in age. | Sections 6 and 7 |
| Motion: easing, arrival settle, entry and exit specified | Every curve and duration is in section 8 and in the tokens. | Section 8, `results/motion.json` |
| Popups: restyle all, keep content and purpose, anchor to what they describe, never cover a vital tile | Event card, story card, unit inspect, tooltip, day banner, clock, legend, narration, command toasts, cross-out, minimap, hints, chronicle, tour: one stylesheet (`popups.css`), one card anatomy. | Section 9; every Studio frame of the 60-second Showcase certified, no card on a tile (node test) |
| Extensibility: skin module plus token JSON | `studio/src/skins/premium.mjs` plus `design/premium.tokens.json` (65 tokens); two variants are 6 and 7 tokens; every token is a live slider in the Tune panel. | Section 11 |
| Fix jitter; tiles never obscure each other | The layout is certified every frame and the display layer verifies what it draws.  The sweep checks the drawn frames with a routine that shares no code with the engine. | Section 13: 0 overlaps of solid marks in 162 settled samples, 0 overlap frames in real-time playback; dimmed travelling marks are the exception (section 14) |
| Every claim labelled with the six evidence labels | Every encoding of the mark has its label in the legend; the list is generated in section 10. | Section 10 |

## 2. Principles

1. **One object, one box.**  A unit is a banner.  There is no label box, no chip beside the symbol, no second popup at the mark.  When more is known (the name), the same banner grows.
2. **The layout owns the space, the skin only paints inside it.**  The skin declares its footprint (`layout(skin)`: `leaf`, `agg`); the layout engine places those boxes with a clearance and guarantees no two overlap.  What the skin paints stays inside the box it was given; this is tested on pixels.
3. **Scale tells the formation.**  Regiment 22 px, battalion 24, brigade 30, division 34, corps 38 (body heights); gilt trim and a finial appear from brigade up.  The reader sees rank before reading a word.
4. **Colour tells the side, shape repeats it.**  Blue fabric with a swallow-tailed fly (Union), red with a pointed fly (Confederate), gold with a square end for a side the data cannot decide.  The fly shape survives greyscale, which the cloth colours alone do not (section 4).
5. **Light comes from the north-west.**  It matches the hillshade of the ground (the `campaign` look inverts the hillshade so it is lit from the north-west): a light rim on the north and west edges, a soft shadow to the south-east, a dark hairline everywhere.  Height is carried by the shadow alone; the cloth does not move when a mark is lifted (a moving cloth would leave its footprint).
6. **One provisional device.**  A position carried forward from an old keyframe is the same mark mixed toward grey and darkened, continuously with age.  Nothing else (no dashes, no ghost, no second glyph) says "not fresh".
7. **Honest by construction.**  Every channel the mark can express is backed by a field of the tile and has a row in the legend with its evidence label.  A crowd's count is placement records, never men; a strength line is a placement value, not a casualty record.
8. **Tokens, not code, set the look.**  Colours, sizes, lights, states and motion times are tokens.  A designer changes a value and the next frame uses it.

## 3. Grid, geometry and type

### Grid

The base unit is 2 px: the reserved air around every body (`geo.ring`), the layout clearance between footprints (`layout.gapPx`, set to 1 px by the style, so bodies stand 5 px apart at the least), the stack offset of a crowd mark (3 px), the fly depth (6 px).  Everything else is derived from text widths measured in the real font (`studio/data/text-widths.json`, re-measured by `tools/measure-text.mjs`; the page also measures them in the viewer's browser at start-up).

A unit footprint is `ceil(hoist + padL + textWidth + padR + fly) + 2 ring` wide and `ceil(bodyHeight + k * nameLine) + 2 ring` high, where `k` rises from 0 to 1 between zoom 15.6 and 16.1 (smoothstep) and the name line is 17 px (the last 4 px of it hold the strength line).  A crowd footprint adds the stack offset in both directions.  The footprint is the layout's only input from the skin and it is tested: no pixel of a mark falls outside it.

### Type

Two text sizes for the marks, and the same two for the interface plus one serif size for titles and long reading.  Face: Barlow Semi Condensed (sans, the language of the marks, the controls and the running text) and Source Serif 4 (titles and reading).  Both are SIL OFL 1.1, inlined into the page as `data:` URIs so the page loads nothing from outside, and the licence texts are in `fonts/`.

| Role | Size | Weight | Face | Where |
| --- | --- | --- | --- | --- |
| Unit code, unfolded name, second line, caption, evidence label, kicker | 11 px | 500 / 600 / 700 | Barlow Semi Condensed | marks, cards, dock |
| Formation code, every count, running text, controls, clock numerals | 13 px | 500 / 600 / 700 | Barlow Semi Condensed, and Source Serif 4 400 for reading passages | marks, cards, rail, narration |
| Title (card title, reading-panel title, brand, narration title, the date in the clock card) and the long-form passages of a story or tour in the reading panel | 17 px | 600 for titles, 400 for passages | Source Serif 4 (the unit-card title is Barlow Semi Condensed 600) | cards, rail, brand |

The numeral style is one: Barlow Semi Condensed with tabular lining figures (`font-variant-numeric: tabular-nums lining-nums`), weight 700 for counts and clock readouts.  The text the page actually draws is audited on the rendered page, scene by scene, from every visible text node:

<!--T:type-->
| Scene | Sizes on screen (px) | Smallest |
| --- | --- | --- |
| s1a | 11 / 13 / 17 | 11 |
| s1b | 11 / 13 / 17 | 11 |
| s1c | 11 / 13 / 17 | 11 |
| s2 | 11 / 13 / 17 | 11 |
| s3 | 11 / 13 / 17 | 11 |
| s4 | 11 / 13 / 17 | 11 |
| s5 | 11 / 13 / 17 | 11 |
| s6 | 11 / 13 / 17 | 11 |
| s7 | 11 / 13 / 17 | 11 |
| s8 | 11 / 13 / 17 | 11 |
| s9 | 11 / 13 / 17 | 11 |
| s10 | 11 / 13 / 17 | 11 |
| s11 | 11 / 13 / 17 | 11 |
| s12 | 11 / 13 / 17 | 11 |

All scenes: sizes 11, 13, 17 px.  By style:

| Size | Weight | Face | Characters | Scenes | Example |
| ---: | ---: | --- | ---: | ---: | --- |
| 11 px | 700 | Barlow Semi Condensed | 629 | 14 | Modelled |
| 13 px | 400 | Source Serif 4 | 814 | 2 | Shot through the head by a sharpshooter  |
| 13 px | 500 | Barlow Semi Condensed | 4314 | 14 | positions are hand-authored keyframes; m |
| 13 px | 500 | Source Serif 4 | 23 | 1 | The Race for the Summit |
| 13 px | 600 | Barlow Semi Condensed | 1071 | 14 | Auto tour |
| 13 px | 700 | Barlow Semi Condensed | 931 | 14 | Day 3 · Tick 551 / 675 |
| 17 px | 400 | Source Serif 4 | 683 | 1 | On the afternoon of July 2, Confederate  |
| 17 px | 600 | Source Serif 4 | 301 | 14 | Gettysburg |
| 17 px | 600 | Barlow Semi Condensed | 76 | 3 | 106th Pennsylvania Volunteer Infantry |
<!--/T:type-->

Fonts shipped:

<!--T:fonts-->
| Family | Weight | Style | File | Size | Licence |
| --- | ---: | --- | --- | ---: | --- |
| barlow semi condensed | 500 | normal | `fonts/barlow-semi-condensed-latin-500-normal.woff2` | 21.9 KB | SIL OFL 1.1 |
| barlow semi condensed | 600 | normal | `fonts/barlow-semi-condensed-latin-600-normal.woff2` | 22.4 KB | SIL OFL 1.1 |
| barlow semi condensed | 700 | normal | `fonts/barlow-semi-condensed-latin-700-normal.woff2` | 22.7 KB | SIL OFL 1.1 |
| source serif 4 | 400 | italic | `fonts/source-serif-4-latin-400-italic.woff2` | 19.6 KB | SIL OFL 1.1 |
| source serif 4 | 400 | normal | `fonts/source-serif-4-latin-400-normal.woff2` | 19.6 KB | SIL OFL 1.1 |
| source serif 4 | 600 | normal | `fonts/source-serif-4-latin-600-normal.woff2` | 21.0 KB | SIL OFL 1.1 |
<!--/T:fonts-->

Fallbacks, if a font fails to load: `Bahnschrift SemiCondensed`, `Segoe UI`, `system-ui`.  The page waits for the fonts before it boots (so the first measured widths are the real ones).

## 4. Colour tokens and contrast tests

All colour is a token (`design/premium.tokens.json`, W3C design-token shape).  The complete token list, generated from the file:

<!--T:tokens-->
**Colour** (21 tokens)

| Token | Value | Unit | What it sets |
| --- | --- | --- | --- |
| `color.union.hi` | `#2b629f` |  | Union fabric, lit end of the gradient (top) |
| `color.union.lo` | `#183f6f` |  | Union fabric, shaded end of the gradient (bottom) |
| `color.union.strip` | `#0f2342` |  | Union hoist band (the dark band that carries the arm or echelon sign) |
| `color.union.edge` | `#08142a` |  | Union outer hairline |
| `color.csa.hi` | `#b1432d` |  | Confederate fabric, lit end of the gradient (top) |
| `color.csa.lo` | `#86291b` |  | Confederate fabric, shaded end of the gradient (bottom) |
| `color.csa.strip` | `#43160f` |  | Confederate hoist band |
| `color.csa.edge` | `#2a0b07` |  | Confederate outer hairline |
| `color.unk.hi` | `#e2be58` |  | Contested side fabric, lit end (a unit whose side is not decided is gold, never a side colour) |
| `color.unk.lo` | `#c49e3a` |  | Contested side fabric, shaded end |
| `color.unk.strip` | `#4f3d0e` |  | Contested hoist band |
| `color.unk.edge` | `#251c05` |  | Contested outer hairline |
| `color.ink` | `#faf4e4` |  | Text and signs on fabric (ivory) |
| `color.inkOnGold` | `#140f03` |  | Text on the contested gold fabric |
| `color.giltHi` | `#f3d98a` |  | Gilt trim, lit |
| `color.giltLo` | `#b98f33` |  | Gilt trim, shaded |
| `color.keyline` | `#060a10` |  | Dark outer hairline under every mark (separation on bright ground) |
| `color.bone` | `#f2ecdc` |  | Light keyline of a unit mark (separation on dark ground) |
| `color.accent` | `#f5cd62` |  | Selection ring and hover glow |
| `color.carriedGrey` | `#7d8794` |  | The neutral a carried-forward mark is mixed toward |
| `color.gaugeTrack` | `#050912` |  | Empty part of the strength line |

**Geometry** (18 tokens)

| Token | Value | Unit | What it sets |
| --- | --- | --- | --- |
| `geo.ring` | `2` | px | Air between the body and the footprint edge; the selection ring lives here |
| `geo.radius` | `4` | px | The one corner radius of every mark |
| `geo.hairline` | `1` | px | The one line weight (keylines, trim); selection uses 1.5x |
| `geo.h0` | `22` | px | Body height of a regiment or battery mark |
| `geo.h1` | `24` | px | Body height of a battalion mark |
| `geo.h2` | `30` | px | Body height of a brigade standard |
| `geo.h3` | `34` | px | Body height of a division standard |
| `geo.h4` | `38` | px | Body height of a corps standard |
| `geo.hAgg` | `30` | px | Body height of a crowd (formation) mark |
| `geo.hoist0` | `17` | px | Width of the hoist band of a unit mark |
| `geo.hoist1` | `20` | px | Width of the hoist band of a formation standard |
| `geo.padL` | `5` | px | Space between the hoist band and the text |
| `geo.padR` | `5` | px | Space between the text and the fly edge |
| `geo.fly` | `6` | px | Depth of the fly edge shape (notch for the Union, point for the Confederacy) |
| `geo.nameLine` | `17` | px | Height added when the full name unfolds under the code (the last 4 px of it are the strength line) |
| `geo.stack` | `3` | px | Offset of each banner behind a crowd mark |
| `geo.nameZoom0` | `15.6` |  | Zoom at which names begin to unfold into the marks |
| `geo.nameZoom1` | `16.1` |  | Zoom at which names are fully unfolded |

**Type** (6 tokens)

| Token | Value | Unit | What it sets |
| --- | --- | --- | --- |
| `type.family` | `"Barlow Semi Condensed", "Bahnschrift ..` |  | Face of every mark (open licence: SIL OFL 1.1, bundled) |
| `type.unitSize` | `11` | px | Type size 1: unit codes, names and the second line (11 px is the floor of the language) |
| `type.unitWeight` | `600` |  | Weight of a unit code |
| `type.formSize` | `13` | px | Type size 2: formation marks (standards and crowd marks) and their counts |
| `type.formWeight` | `700` |  | Weight of a formation code and of every count |
| `type.nameWeight` | `500` |  | Weight of the unfolded name |

**Light** (10 tokens)

| Token | Value | Unit | What it sets |
| --- | --- | --- | --- |
| `light.shadowAlpha` | `0.4` |  | Strength of the soft ground shadow (light from the north-west: it falls south-east) |
| `light.shadowDx` | `1.6` | px | Horizontal offset of the ground shadow |
| `light.shadowDy` | `2.8` | px | Vertical offset of the ground shadow |
| `light.shadowBlur` | `5` | px | Blur of the ground shadow |
| `light.contactAlpha` | `0.5` |  | Strength of the tight contact shadow right under the edge |
| `light.rimAlpha` | `0.55` |  | Strength of the light rim on the north and west edges |
| `light.keyline` | `0.5` |  | Strength of the light keyline of a fresh unit mark (the dark hairline outside it is always there) |
| `light.sheen` | `0.05` |  | Strength of the soft diagonal sheen across the cloth |
| `light.gloss` | `0.06` |  | Top-light sheen over the upper half of the fabric |
| `light.liftPerEchelon` | `0.35` | px | How far a formation standard floats above the ground per echelon (shadow grows with it) |

**State** (4 tokens)

| Token | Value | Unit | What it sets |
| --- | --- | --- | --- |
| `state.carriedMix` | `0.32` |  | How far a carried-forward mark is mixed toward grey (the one provisional device) |
| `state.carriedDark` | `0.28` |  | Extra darkening of a carried-forward mark |
| `state.carriedKeyline` | `0.5` |  | Strength of the light keyline of a carried-forward mark |
| `state.flutter` | `1.1` | px | Amplitude of the fly-edge flutter of a unit in transit (0 turns it off) |

**Motion** (6 tokens)

| Token | Value | Unit | What it sets |
| --- | --- | --- | --- |
| `motion.selectMs` | `170` | ms | Selection ring and name unfold glide |
| `motion.hoverMs` | `110` | ms | Hover lift glide |
| `motion.growMs` | `150` | ms | Glide of the hover and selection unfold of a name into the banner |
| `motion.flutterMs` | `240` | ms | Time the fly takes to start and stop fluttering when a unit starts or stops marching |
| `motion.dropPx` | `5` | px | Height a mark drops from when it arrives (the arrival settle) |
| `motion.unfurl` | `0.6` |  | Share of the arrival in which the banner unfurls from the hoist |

65 tokens in all.
<!--/T:tokens-->

### Variants

A variant is a token file that overrides only what differs.  Two ship, selected by `?style=premium&variant=cvd|contrast` or the Tune panel.

<!--T:variants-->
**Colour-blind safe** (`design/variants/cvd.json`, 6 tokens differ from the standard look): Union blue and Confederate vermilion, in the spirit of Okabe and Ito, kept dark enough for ivory type (4.5:1 on rendered pixels); the fly-edge shapes carry the side without colour, which matters most in greyscale.

| Token | Value |
| --- | --- |
| `color.union.hi` | `#2468ad` |
| `color.union.lo` | `#154a80` |
| `color.union.strip` | `#0f2a4f` |
| `color.csa.hi` | `#a8481a` |
| `color.csa.lo` | `#823613` |
| `color.csa.strip` | `#4a1e0c` |

**High contrast** (`design/variants/contrast.json`, 7 tokens differ from the standard look): Deeper fabric, stronger keylines, no gloss.

| Token | Value |
| --- | --- |
| `color.union.hi` | `#1a4f93` |
| `color.union.lo` | `#123a73` |
| `color.csa.hi` | `#a63826` |
| `color.csa.lo` | `#862a1c` |
| `light.gloss` | `0` |
| `light.rimAlpha` | `0.9` |
| `state.carriedKeyline` | `0.8` |
<!--/T:variants-->

### Contrast: the tokens

<!--T:pairs-->
| Palette | Side | Cloth | Type colour | Cloth colour | Contrast |
| --- | --- | --- | --- | --- | ---: |
| standard | Union | hi | `#faf4e4` | `#2b629f` | 5.71 |
| standard | Union | lo | `#faf4e4` | `#183f6f` | 9.66 |
| standard | Confederate | hi | `#faf4e4` | `#b1432d` | 5.15 |
| standard | Confederate | lo | `#faf4e4` | `#86291b` | 8.15 |
| standard | Contested (gold) | hi | `#140f03` | `#e2be58` | 10.68 |
| standard | Contested (gold) | lo | `#140f03` | `#c49e3a` | 7.55 |
| standard | Union | hoist band | `#faf4e4` | `#0f2342` | 14.28 |
| standard | Confederate | hoist band | `#faf4e4` | `#43160f` | 14.06 |
| colour-blind safe | Union | hi | `#faf4e4` | `#2468ad` | 5.23 |
| colour-blind safe | Union | lo | `#faf4e4` | `#154a80` | 8.23 |
| colour-blind safe | Confederate | hi | `#faf4e4` | `#a8481a` | 5.30 |
| colour-blind safe | Confederate | lo | `#faf4e4` | `#823613` | 7.69 |
| colour-blind safe | Contested (gold) | hi | `#140f03` | `#e2be58` | 10.68 |
| colour-blind safe | Contested (gold) | lo | `#140f03` | `#c49e3a` | 7.55 |
| colour-blind safe | Union | hoist band | `#faf4e4` | `#0f2a4f` | 13.06 |
| colour-blind safe | Confederate | hoist band | `#faf4e4` | `#4a1e0c` | 12.90 |
| high contrast | Union | hi | `#faf4e4` | `#1a4f93` | 7.40 |
| high contrast | Union | lo | `#faf4e4` | `#123a73` | 10.18 |
| high contrast | Confederate | hi | `#faf4e4` | `#a63826` | 5.95 |
| high contrast | Confederate | lo | `#faf4e4` | `#862a1c` | 8.10 |
| high contrast | Contested (gold) | hi | `#140f03` | `#e2be58` | 10.68 |
| high contrast | Contested (gold) | lo | `#140f03` | `#c49e3a` | 7.55 |
| high contrast | Union | hoist band | `#faf4e4` | `#0f2342` | 14.28 |
| high contrast | Confederate | hoist band | `#faf4e4` | `#43160f` | 14.06 |

The type sits on the gradient between the two cloth ends, so the lower of the two ratios of a row is its token-level floor; the cloth runs from `hi` at the top to `lo` at the bottom and gloss and sheen lift it by at most 0.11 of white, which only the pixel test below includes.
<!--/T:pairs-->

### Contrast: the rendered pixels (the binding test)

The type colour is tested against the pixels the mark really draws (gloss, sheen, keyline and carried-forward mixing included), in every state that carries type, for every palette.

<!--T:legibility-->
Bar: 4.5:1.  Method: ink luminance against the lightest (darkest for dark ink) background pixel within 3 px of the glyphs, 99th percentile (1st for dark ink), rendered at 3x on a transparent canvas.

| Palette | Samples | Lowest ratio | Mean ratio | Below the bar |
| --- | ---: | ---: | ---: | ---: |
| standard | 16 | 4.77 | 6.08 | 0 |
| contrast | 16 | 4.90 | 7.19 | 0 |
| cvd | 16 | 4.83 | 5.91 | 0 |

Standard palette, every state that carries type:

| Case | Ink | Worst background luminance | Contrast | Result |
| --- | --- | ---: | ---: | --- |
| union fresh | `#faf4e4` | 0.115 | 5.81 | pass |
| union carried 100% | `#faf4e4` | 0.069 | 8.06 | pass |
| union carried 50% | `#faf4e4` | 0.091 | 6.79 | pass |
| confederate fresh | `#faf4e4` | 0.131 | 5.27 | pass |
| confederate carried 100% | `#faf4e4` | 0.071 | 7.90 | pass |
| confederate carried 50% | `#faf4e4` | 0.099 | 6.40 | pass |
| contested fresh | `#140f03` | 0.404 | 8.25 | pass |
| contested carried 100% | `#140f03` | 0.340 | 7.10 | pass |
| union brigade standard | `#faf4e4` | 0.107 | 6.08 | pass |
| confederate corps standard | `#faf4e4` | 0.120 | 5.64 | pass |
| union name line (unfolded) | `#faf4e4` | 0.130 | 5.33 | pass |
| confederate name line (unfolded) | `#faf4e4` | 0.145 | 4.90 | pass |
| crowd, one side (Union) | `#faf4e4` | 0.132 | 5.25 | pass |
| crowd, one side (Confederate) | `#faf4e4` | 0.150 | 4.77 | pass |
| crowd, both sides | `#faf4e4` | 0.150 | 4.77 | pass |
| crowd, contested | `#140f03` | 0.219 | 4.90 | pass |

48 samples, 0 below the bar.
<!--/T:legibility-->

The interface colours (evidence inks, tone inks, button text) are tested against the card backgrounds of both themes in `studio/test/popups.test.mjs` (4.5:1 for text, 3:1 for shapes).

### Side colours under colour-vision deficiency and in greyscale

<!--T:cvd-->
CIEDE2000 between the cloth colours (the bar is 20; the vision rows simulate the deficiency with the Machado et al. matrices, severity 1.0, applied in linear sRGB).

| Palette | Pair | Normal | Protanopia | Deuteranopia | Tritanopia | Lowest |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| standard | union vs confederate | 40.0 | 38.7 | 45.7 | 55.6 | 38.7 |
| standard | union vs contested | 60.4 | 59.2 | 64.7 | 52.7 | 52.7 |
| standard | confederate vs contested | 44.7 | 40.3 | 30.8 | 35.0 | 30.8 |
| contrast | union vs confederate | 39.7 | 39.8 | 47.5 | 53.4 | 39.7 |
| contrast | union vs contested | 65.8 | 63.6 | 69.7 | 60.2 | 60.2 |
| contrast | confederate vs contested | 46.6 | 42.4 | 33.1 | 37.3 | 33.1 |
| cvd | union vs confederate | 42.3 | 44.5 | 48.9 | 55.7 | 42.3 |
| cvd | union vs contested | 59.3 | 58.3 | 64.0 | 50.1 | 50.1 |
| cvd | confederate vs contested | 40.4 | 38.1 | 30.6 | 34.2 | 30.6 |

Pairs below the bar: 0.  Greyscale (luminance ratio, 1.00 means identical): standard union vs confederate = 1.14; high contrast union vs confederate = 1.25; colour-blind safe union vs confederate = 1.03.  The fly shape, not the colour, carries the side in greyscale.
<!--/T:cvd-->

The honest reading of this table: the three cloth colours stay far apart for every simulated deficiency (every pair 30 or more CIEDE2000, bar 20).  In greyscale Union and Confederate cloth are close in luminance (ratio 1.14 standard, 1.25 high contrast, 1.03 colour-blind-safe), so greyscale readers rely on the fly shape and on the word in a crowd mark.  This is the weakest colour result of the language and it is a design choice: a premium look wants saturated cloth.

## 5. Symbol anatomy

A unit mark, drawn by `skins/premium.mjs`, from left to right (the legend in the page shows the same diagram, drawn by the same code):

| Part | What it is | Encodes | Evidence |
| --- | --- | --- | --- |
| Staff | A gilt pole on the hoist edge; a finial on formation standards | Nothing (it is the banner) | Design |
| Hoist band | The dark band on the staff side, carrying a white sign: crossed muskets, a sabre, a gun on its wheel; for a brigade, division or corps record, the echelon marks (X, XX, XXX) | The arm (infantry, cavalry, artillery), or the echelon where the data give a formation no arm | Documented |
| Cloth and fly | A gradient of the side colour; the fly edge is a swallow-tail (Union), a point (Confederate) or square (undecided) | The side | Documented; Contested for the ten ids whose prefix and state code disagree |
| Short code | The unit's short designation, 11 px (13 px on a formation standard), ivory, centred in the cloth | The unit, from the order of battle | Documented |
| Name line | Unfolds under the code with zoom, hover and selection: the full designation with its trailing parenthesis dropped, ordinals shortened, cut at a word | The unit's name | Documented |
| Strength line | A gilt line along the lower edge, filled to this keyframe's strength over the unit's reference strength | A placement value, not a casualty record | Modelled |
| Dotted rule under the code | Only on a mark with no order-of-battle record | Identity from the id alone | Unknown |
| Shadow | A soft shadow to the south-east, in its own pass beneath every mark | Nothing (separation from the ground) | Design |

Corps badges (Union infantry only, where the order-of-battle chain documents the corps) follow the circular of 21 March 1863 in the legend; Confederate corps appear as text only, because no source assigns them badges.

## 6. States

| State | What changes | How | Evidence |
| --- | --- | --- | --- |
| Rest | The mark as described above | Cloth gradient, gloss, rim, shadow | |
| Hover | A warm edge light, a deeper shadow (the mark seems to lift), the name unfolds inside the banner into free ground (paused only), the tooltip card appears | `motion.hoverMs` 110 ms for the lift, `motion.growMs` 150 ms for the unfold | Design |
| Selected | A gilt ring inset in the reserved band, a soft glow, the name unfolded, the highest placement priority; the Inspect card opens with a leader to the mark | `motion.selectMs` 170 ms; the ring and glow stay inside the footprint | Design |
| Carried forward | Cloth mixed 32 percent toward grey and darkened 28 percent, no gloss, a quieter keyline; continuous between 0 and a whole battle day of age | `state.carriedMix`, `state.carriedDark`; legend row "Last report" | Computed |
| In transit | The fly flutters while the battle plays: three vertex offsets of at most 1.1 px, ramped in and out over 240 ms; off when paused | `state.flutter`, `motion.flutterMs` | Modelled |
| Identity only | A dotted rule under the code | | Unknown |
| Displaced | A peg at the true position and a thin leader to the mark that had to stand aside | The layout's displacement is at most 48 px (`layout.dMaxPx`) | Modelled |
| Arriving | Drops 5 px onto the ground while the banner unfurls from the hoist | Section 8 | Design |
| Leaving | Lifts 2.5 px and fades | Section 8 | Design |

## 7. Formation marks

There are two kinds of formation mark, and they are the heavy objects of the map.

**Formation standards** are ordinary unit marks of brigade, division and corps records: bigger (30, 34, 38 px body height), a 20 px hoist band with the echelon marks, a 13 px code, a gilt frame and a finial, a small float (the shadow grows 0.35 px per echelon).

**Crowd marks** appear when records cannot all stand on their true places at the current zoom.  A crowd mark is a stack of two or three banners (three from four records up; each 3 px behind the last), a gilt pill on the hoist side with the count (13 px, 700), and a name:

| Records in the crowd | Name | Fabric |
| --- | --- | --- |
| All of one formation | That formation's code (brigade, division, corps) | The side colour |
| One side, several formations | `Union` or `Confederate` | The side colour |
| Union and Confederate records together | `Both sides` | Split blue and red |
| One side together with records whose side is not decided | `Part contested` | Split side colour and gold |
| Only undecided records | `Contested` | Gold |

The count is the number of placement records here (Computed), never a number of men.  No crowd name claims contact, an engagement or a lead unit: the earlier names `Contact` and `lead +k` were dropped because they read as claims the data do not make.  A crowd mark never hides a unit: every record is represented by a live mark in every sampled frame (section 13, "unrepresented 0").

At the site's opening zoom (13.5) the whole field is 125 marks: 55 crowd marks standing for 381 of the 451 records on the field at tick 551, and the units that stand alone are the big formation standards and the isolated regiments.  Zoom in and the crowds split into their records; the split is sticky (a crowd does not re-form the instant it could) and its marks glide to their new places.

## 8. Motion

Easing is a decision, not a default.  Positions use a critically damped follower (no overshoot, frame-rate independent: `interp/damp.mjs`).  Appearances use a cubic ease-out.  Cards use the site-wide arrival curve (`cubic-bezier(0.2, 0.8, 0.2, 1)`) in and an accelerating curve out, shorter than in.

| Motion | Curve | Duration | Where it is set |
| --- | --- | --- | --- |
| A mark follows its solved place (march, regroup, crowd split) | Critically damped follower, time constant 120 ms (99 percent of a move in about 360 ms); speed cap 1,600 px/s | 120 ms constant | style dial `motion.smoothMs` |
| Footprint changes (a name unfolding, a crowd gaining a record) | The same follower | 90 ms constant | `motion.sizeMs` |
| Arrival (a mark appears) | Fade and drop with cubic ease-out `1-(1-x)^3`; the drop is 5 px; the banner unfurls from the hoist over the first 60 percent of the arrival; birth size 0.96 | 340 ms | `motion.fadeMs`, `motion.dropPx`, `motion.unfurl` |
| Exit (a mark leaves) | Fade out, lifting 2.5 px | 340 ms | `motion.fadeMs` |
| Long hop (the solved place is more than 24 px from where the mark stands) | The mark dims to 42 percent opacity, glides at 60 ms constant and solidifies on arrival, so it never pushes through its neighbours | 60 ms constant | `motion.travelPx`, `motion.travelMs`, `motion.dimOpacity` |
| Contact between marks while gliding | Eased apart by at most 1.5 px per pass, 4 passes per frame; whatever still overlaps is repaired by the safety net (counted, and 0 in every sample below) | per frame | `motion.maxPushPx`, `motion.collisionIters` |
| Cut (a jump in time or zoom too big to glide) | Cross-fade, old marks out and new in, in sequence | 140 ms | `motion.cutFadeMs` |
| Hover lift | Smooth follower on the shadow only | 110 ms | `motion.hoverMs` |
| Selection ring, glow | Smooth follower | 170 ms | `motion.selectMs` |
| Name unfold on hover or selection | Smooth follower on the banner height; the name is revealed inside the banner after 40 percent growth | 150 ms | `motion.growMs` |
| Name unfold with zoom | Smoothstep between zoom 15.6 and 16.1, in the layout | follows the camera | `geo.nameZoom0`, `geo.nameZoom1` |
| Fly flutter | Sinusoid, amplitude 1.1 px, ramped in and out | 240 ms ramp | `state.flutter`, `motion.flutterMs` |
| Card enters | Ease-out `cubic-bezier(0.2, 0.8, 0.2, 1)`, rises 6 px, scale from 0.985 | 220 ms | `popup.motion.enterMs`, `risePx` |
| Card exits | Ease-in `cubic-bezier(0.4, 0, 1, 1)`, sinks 3 px | 160 ms | `popup.motion.exitMs` |
| A card whose place was taken | Fades out where it was (it never glides across tiles), fades in at the new place | 110 ms out, 200 ms in | `popup.motion.moveOutMs`, `moveInMs` |
| Leader line from card to subject | Draws itself from the card to the mark, ease-out | 240 ms | `popup.motion.leaderMs` |
| Subject pulse | A ring on the subject grows 2 to 11 px and fades once | 700 ms | `popup.motion.pulseMs` |
| Reduced motion (system setting, or the dial) | Seeks land at once, the layout is shown as solved, fades are at most 60 ms, no flutter, no rise | 60 ms | `motion.reduced` |

Measured, in real Chrome 1440x900 (the engine's own recorder; a pop is a mark whose offset from its true position changes by more than 3 px in one frame beyond the unit's own motion, a teleport 12 px, a jump a sudden hop):

<!--T:motion-->
Real-time playback in real Chrome (each row 8 s of the page's own animation loop):

| Condition | Frames | fps | Frame p95 (ms) | Frames over 20 ms (%) | Engine (ms) | Pops/s | Teleports/s | Largest excess (px) | Jumps/s | Solid jumps/s | Largest step (px) | Overlap frames | Unrepresented unit-frames | Long hops/s (dimmed) | Dimmed tiles per frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| The Angle z15 1x, DPR 2 | 482 | 60 | 16.8 | 0 | 4.08 | 2.988 | 0 | 4.69 | 0.124 | 0 | 73.52 | 0 | 0 | 3.486 | 4.63 |
| The Angle z15 4x, DPR 2 | 481 | 60 | 16.8 | 0 | 4.28 | 0.249 | 0 | 3.26 | 0.125 | 0 | 38.25 | 0 | 0 | 6.861 | 5.09 |
| Whole field z13.5 4x, DPR 2 | 435 | 54.5 | 33.3 | 10.11 | 1.6 | 0.125 | 0 | 5.88 | 0.125 | 0 | 19.65 | 0 | 0 | 1.127 | 0.3 |
| Cemetery Hill z15.5 1x, DPR 2 | 481 | 60 | 16.8 | 0 | 2.06 | 0.624 | 0 | 6.07 | 0 | 0 | 11.46 | 0 | 0 | 0.998 | 1.14 |
| The Angle z15 1x, DPR 1 | 481 | 60 | 16.7 | 0 | 3.83 | 2.62 | 0 | 4.05 | 0.125 | 0 | 72.86 | 0 | 0 | 3.992 | 4.44 |
| The Angle z15 4x, DPR 1 | 481 | 60 | 16.8 | 0 | 3.97 | 0.249 | 0 | 3.23 | 0.125 | 0 | 38.25 | 0 | 0 | 5.614 | 4.81 |
| Whole field z13.5 4x, DPR 1 | 480 | 60 | 16.8 | 0 | 2.5 | 0 | 0 | 2.07 | 0.125 | 0 | 16.19 | 0 | 0 | 2 | 0.84 |
| Cemetery Hill z15.5 1x, DPR 1 | 481 | 60 | 16.8 | 0 | 2.22 | 0.873 | 0 | 4.89 | 0 | 0 | 13.92 | 0 | 0 | 1.622 | 1.73 |

Driven frame by frame at 60 Hz (zoom glides and selections):

| Condition | Frames | fps | Frame p95 (ms) | Frames over 20 ms (%) | Engine (ms) | Pops/s | Teleports/s | Largest excess (px) | Jumps/s | Solid jumps/s | Largest step (px) | Overlap frames | Unrepresented unit-frames | Long hops/s (dimmed) | Dimmed tiles per frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zoom 14.5 -> 16.5 (180 ms glide, 2 s) | 130 | 60 | 16.67 | 0 | 3.28 | 0 | 0 | 2.46 | 0 | 0 | 5.66 | 0 | 0 | 58.154 | 47.5 |
| zoom 16.5 -> 14.5 (2 s) | 130 | 60 | 16.67 | 0 | 5.86 | 22.154 | 0 | 7.43 | 0 | 0 | 0.97 | 0 | 0 | 17.077 | 28.02 |
| wheel-like slow zoom 15 -> 16.2 over 3 s | 200 | 60 | 16.67 | 0 | 3.11 | 0 | 0 | 2.46 | 0 | 0 | 2.91 | 0 | 0 | 30 | 18.82 |
| select a unit at zoom 16.5 | 90 | 60 | 16.67 | 0 | 3.23 | 0 | 0 | 0.29 | 0 | 0 | 0.44 | 0 | 0 | 1.333 | 0.52 |
| deselect | 90 | 60 | 16.67 | 0 | 2.91 | 0 | 0 | 0.24 | 0 | 0 | 0.44 | 0 | 0 | 0 | 0.78 |
| select at zoom 15 (name unfolds in a crowded place) | 90 | 60 | 16.67 | 0 | 3.69 | 0 | 0 | 1.18 | 0 | 0 | 10.95 | 0 | 0 | 1.333 | 1.44 |
<!--/T:motion-->

The honest reading: playback at 1x holds 60 fps with no teleport, no solid jump and no overlap frame.  The whole field at 4x and DPR 2 is the one weak case: 54.5 fps with 10 percent of the frames over 20 ms in the run above (49 fps and 22 percent in an earlier run of the same tool, 52 fps at DPR 1 in that run and 60 in this one); the engine takes 1.6 ms of each frame, so the rest is drawing and compositing the real aerial at 2880x1800 (not profiled further).  The zoom-out from 16.5 to 14.5 in two seconds shows 22 pops per second (0.13 percent of the mark-frames) with a largest single-frame excess of 7.4 px and no teleport: while the names fold back and the camera scales the whole field, the followers lag the moving anchors by a few pixels; no mark jumps.  Zooming in shows none.  Other agents' browsers were running on the same machine while these were measured, so treat the frame rates as lower bounds and the run-to-run spread above as the noise.

One more thing the table shows, and the specification does not hide: while the camera zooms, many marks must travel far, so they dim to 42 percent and glide (the long-hop rule of the table above).  In the two-level zoom in two seconds an average of 47 of about 300 marks are dimmed at any moment (28 in the zoom out, 19 in the slow wheel-like zoom, 0 to 5 in playback).  A dimmed mark may pass under a solid one; the no-overlap guarantee is for solid marks (opacity of 0.5 or more), and so are the overlap counts of this document.

The 8-frame motion strip of a march and an arrival: `shots/motion-strip.png`.

## 9. Popups

All popups are restyled in one language.  A card is ink-navy glass (a vertical gradient, 94 percent opaque, 12 px backdrop blur), a one-pixel hairline, a 10 px radius, a shadow that lifts it, a tone ribbon (a small bookmark flag at the top-left in the colour of the tone: critical, high, story, info, Union, Confederate), a kicker (the tone's word in 11 px capitals with its shape), an optional serif title (17 px), running text (13 px), evidence labels, and actions.  The gilt of the language appears as hairlines, rules and primary buttons.

Evidence labels are shape plus word, so they survive greyscale: Documented a disc, Measured a diamond, Computed a triangle, Modelled a half disc, Contested a hollow diamond, Unknown a ring, Design a square.

| Popup | Purpose (unchanged) | Anchored to | Forms |
| --- | --- | --- | --- |
| Event card | A chronicle event: signal, text, place, units, linked narrative | The event's units or place, by a leader line; stays on free ground | full, compact, peek, mini, chip |
| Story card | A story of the battle: title, summary, minutes to read | Its subject on the map; opens the story in the reading rail | peek, compact, mini |
| Unit inspect card (and the Details rail) | The selected unit: side, formation chain, arm, strength at this placement, commander, evidence per fact | The selected mark, with a leader and a gilt ring on the mark | card, tooltip, bottom sheet on a phone |
| Tooltip | A pointed-at mark or crowd: name, strength, disposition, members of a crowd | The pointed mark, never over it | tooltip |
| Day banner | The start of a day and each night, raised when the clock lands on or crosses it | A free slot (top centre first), placed like every card | ribbon, chip |
| Clock | The date, the time, the clock's uncertainty with its evidence label | Fixed, top-left | full, mini |
| Legend | What every mark claims, with its evidence label: an annotated mark, rows grouped by what they encode, the ground, the place marks | A small pill; opens the reading rail (the map makes room, nothing is covered) | pill, rail |
| Narration | The welcome ("Play the battle" / "Explore"), tour captions, the measured results | The left side of the map; the camera frames the subject of the step in the part the card leaves free | card, bottom card on a phone |
| Command toasts and cross-out | A change of command: the old name struck through, the new one after an arrow | The unit that changed command | toast, tag, mini, chip |
| Minimap | Where the camera is on the field | Fixed, a free corner | full |
| Hints | Keys and what the evidence labels mean | The tool strip | compact |
| Chronicle and tours | Everything that has happened so far; the guided tours | The reading rail | list, tour |

How "never cover a vital tile" is kept: the vital core of a mark is its footprint plus the peg of a displaced mark.  The host places a card in the first of its preferred slots that is free of every vital core, and falls back to a smaller form of the same card (full, compact, peek, mini, chip) before it would cover anything.  The 60-second Showcase test drives every popup for 3,600 frames and fails if any card lies on a tile.  The reading rail and the bottom sheet are panels that take part of the map by design; the map makes room (the camera's safe area), and the scenes that open them are reported in the shot table below.

The pictures (all DPR 2; 1440x900 unless noted):

<!--T:shots-->
| Scene | Picture | 100% crop of the busiest free window (600x400; 390x300 on the phone) | Zoom | Tick | Marks | Crowd marks | Units in crowds | Units on the field | Overlaps (independent) | Overlaps (engine) | Pins covered | Unrepresented | Smallest gap (px) | Marks under fixed chrome | Marks touched by a card |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| s1a | `shots/s1a-field-z13.5-tick551.png` | `shots/s1a-field-z13.5-tick551-crop-busiest-600x400.png` | 13.5 | 551 | 125 | 55 | 381 | 451 | 0 | 0 | 0 | 0 | 1 | 13 | 0 |
| s1b | `shots/s1b-assault-z13.5-tick556.png` | `shots/s1b-assault-z13.5-tick556-crop-busiest-600x400.png` | 13.5 | 556 | 126 | 60 | 390 | 456 | 0 | 0 | 0 | 0 | 1 | 11 | 0 |
| s1c | `shots/s1c-angle-z15-tick556.png` | `shots/s1c-angle-z15-tick556-crop-busiest-600x400.png` | 15 | 556 | 330 | 44 | 170 | 456 | 0 | 0 | 0 | 0 | 1 | 7 | 0 |
| s2 | `shots/s2-wheatfield-rosewoods-z15-tick293.png` | `shots/s2-wheatfield-rosewoods-z15-tick293-crop-busiest-600x400.png` | 15 | 293 | 277 | 31 | 95 | 341 | 0 | 0 | 0 | 0 | 1 | 9 | 0 |
| s3 | `shots/s3-cemetery-hill-z15.5-tick346.png` | `shots/s3-cemetery-hill-z15.5-tick346-crop-busiest-600x400.png` | 15.5 | 346 | 345 | 19 | 59 | 385 | 0 | 0 | 0 | 0 | 1 | 3 | 0 |
| s4 | `shots/s4-close-selected-inspect-z16.5.png` | `shots/s4-close-selected-inspect-z16.5-crop-busiest-600x400.png` | 16.5 | 556 | 401 | 44 | 99 | 456 | 0 | 0 | 0 | 0 | 1 | 2 | 0 |
| s5 | `shots/s5-phone-z14.5-sheet.png` | `shots/s5-phone-z14.5-sheet-crop-busiest-390x300.png` | 14.5 | 556 | 260 | 49 | 245 | 456 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| s6 | `shots/s6-event-and-story-in-situ.png` |  | 14.5 | 28 | 85 | 3 | 6 | 88 | 0 | 0 | 0 | 0 | 1 | 2 | 0 |
| s7 | `shots/s7-legend.png` |  | 15 | 551 | 321 | 29 | 159 | 451 | 0 | 0 | 0 | 0 | 1 | 4 | 5 |
| s8 | `shots/s8-hover-tooltip.png` | `shots/s8-hover-tooltip-crop-busiest-600x400.png` | 16 | 556 | 366 | 70 | 160 | 456 | 0 | 0 | 0 | 0 | 1 | 5 | 0 |
| s9 | `shots/s9-day-banner-and-clock.jpg` |  | 14 | 226 | 158 | 46 | 158 | 270 | 0 | 0 | 0 | 0 | 1 | 8 | 0 |
| s10 | `shots/s10-narration-welcome.jpg` |  | 14 | 28 | 79 | 6 | 15 | 88 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| s11 | `shots/s11-auto-tour-in-the-reading-panel.jpg` |  | 14.5 | 272 | 178 | 22 | 148 | 304 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| s12 | `shots/s12-chronicle-in-the-reading-panel.jpg` |  | 14 | 120 | 105 | 39 | 144 | 210 | 0 | 0 | 0 | 0 | 1 | 1 | 6 |

Every scene was checked by the independent routine on the frame that was drawn.  "Under fixed chrome" counts marks more than half covered by the brand and clock chips, the tool strip, the dock or a side panel; "touched by a card" counts marks any pixel of which lies under a popup card or the reading rail.
<!--/T:shots-->

## 10. Documented, Modelled and the rest, in every encoding

Every encoding the marks use, with what it claims and its label.  The list is the skin's own legend data (`skins/semantics.mjs`), the same rows the legend in the page draws.

<!--T:channels-->
| Encoding | Value | What it claims | Evidence |
| --- | --- | --- | --- |
| Side | union | Union: blue fabric, notched (swallow-tailed) fly. From the order of battle, or the id prefix U- for ids it does not list | Documented |
| Side | confederate | Confederate: red fabric, pointed fly. From the order of battle, or the id prefix C- for ids it does not list | Documented |
| Side | unknown | Side not decided: gold fabric. The id prefix and the state code in the id disagree (10 ids); never drawn as a side | Contested |
| Side | mixed | Both sides: a crowd mark whose fabric is split blue and red | Computed |
| Arm | infantry | Infantry: crossed muskets on the hoist band | Documented |
| Arm | cavalry | Cavalry: a sabre | Documented |
| Arm | artillery | Artillery (battery or battalion): a gun on its wheel | Documented |
| Arm | mixed | A crowd of one side, several arms: the side word and a count | Computed |
| Arm | formation | Brigade, division or corps record: the data gives a formation no arm, so the band carries its echelon marks (X, XX, XXX) and no arm | Documented |
| Arm state | mounted | Mounted cavalry (keyframe posture) | Modelled |
| Arm state | dismounted | Dismounted cavalry (keyframe posture) | Modelled |
| Arm state | deployed | Deployed artillery (keyframe posture) | Modelled |
| Arm state | limbered | Limbered artillery (keyframe posture) | Modelled |
| Size of the mark | 1 | Battalion: a taller banner with two bars on the hoist band (registry kind) | Documented |
| Size of the mark | 2 | Brigade standard: larger, gilt-framed, one X (registry kind) | Documented |
| Size of the mark | 3 | Division standard: larger again, two X (registry kind) | Documented |
| Size of the mark | 4 | Corps standard: the largest, three X (registry kind) | Documented |
| Posture | line | Line of Battle | Modelled |
| Posture | charge | Charging Line | Modelled |
| Posture | retreat | Chaotic Retreat | Modelled |
| Posture | march | Line of March | Modelled |
| Posture | skirmish | Skirmish Line | Modelled |
| Posture | reserve | Reserve | Modelled |
| Posture | bivouac | Bivouac | Modelled |
| Strength line | 1 | The gilt line along the lower edge: this keyframe's strength over the unit's reference strength (the larger of its registry strength and its largest keyframe strength); a full line is 100 %. A placement value, not a casualty record | Modelled |
| Strength line | 0.4 | A part-filled line (shown at 40 %) | Modelled |
| Last report | fresh | Glossy fabric, bright keyline: the unit's latest keyframe is less than 112.5 ticks old | Computed |
| Last report | carried | Matte, greyed fabric, quiet keyline: the latest keyframe is 225 ticks (a whole battle day) or more old, so the position is carried forward, not a fresh report; it fades in between | Computed |
| In transit | moving | The fly flutters while the battle plays: the unit is between two keyframes at different places, so the position is an interpolation | Modelled |
| Identity | idOnly | A dotted rule under the code: no order-of-battle record for this id, the name comes from the id alone | Unknown |
| Crowd mark | agg | A stack of banners with a gilt count: N placement records that cannot all stand on their true positions (records, never men). It names their formation or their side; "Both sides" when Union and Confederate records are in it, "Part contested" when one side shares it with records whose side is not decided | Computed |
| Corps badge | sphere | I Corps: sphere (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863) | Documented |
| Corps badge | trefoil | II Corps: trefoil (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863) | Documented |
| Corps badge | lozenge | III Corps: lozenge (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863) | Documented |
| Corps badge | maltese | V Corps: Maltese cross (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863) | Documented |
| Corps badge | cross | VI Corps: cross (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863) | Documented |
| Corps badge | crescent | XI Corps: crescent (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863) | Documented |
| Corps badge | star | XII Corps: star (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863) | Documented |
| Division colour | red | Badge colour of a first division: red (circular of 21 March 1863) | Documented |
| Division colour | white | Badge colour of a second division: white | Documented |
| Division colour | blue | Badge colour of a third division: blue | Documented |
| Confederate corps | csa | Roman numeral: the corps named in the order of battle (text only: no source assigns Confederate badges) | Documented |
| Selection | selected | Gilt ring and the full name unfolded under the code: the selected unit keeps the highest placement priority (interface state, not a claim about the battle) | Design |
| True position | pin | Peg and line: the true (hand-authored) position of a mark that had to stand aside | Modelled |

44 rows: Documented 21, Contested 1, Computed 5, Modelled 15, Unknown 1, Design 1.
<!--/T:channels-->

The legend's rows about the ground and the place names (they are not encodings of the marks, so they are not in the table above):

| Row | What it claims | Evidence |
| --- | --- | --- |
| The ground | The photograph is USGS NAIP imagery of April-May 2022 with 3DEP hillshade, contours, streams, roads: modern ground, never the 1863 landscape (the caption of the real backdrop, shown in the legend) | Measured |
| Filled dot | A place whose position was measured against the elevation model (a hill moved to its summit) | Measured |
| Open ring | The site's own position of the place | Modelled |
| Open ring with an italic name | A landmark check found no building of that name at the mark | Contested |
| "Every swatch is drawn by the active skin" | The legend rows are read from the skin on every frame, so the legend cannot describe a renderer that is not drawing | Computed |

## 11. Extensibility

- **Skin module.**  `studio/src/skins/premium.mjs` defines the family with `defineFamily`, which wraps the kit (`skins/kit.mjs`): eased state (selected, hovered, entering, carried, grown), a recording-context contract (a skin that paints outside its footprint or reads a tile field it did not declare fails the contract tests), the legend data and the token documents.  A new skin is one module, one entry in `skins/index.mjs` and, for a style, one entry in `styles/index.mjs`.  `skins/_template.mjs` is the starting point.
- **Token JSON.**  `design/premium.tokens.json` is the whole look: colour, geometry, type, light, state, motion.  `tools/make-skin-tokens.mjs` compiles it to `skins/premium.tokens.gen.mjs` (`--check` for CI); `studio/build.mjs` runs it.  Edit a `$value`, run `node studio/build.mjs`, reload.
- **Variants.**  `design/variants/*.json` override only what differs; a variant is a skin id (`premium/cvd`).
- **Live.**  The Tune panel lists every token of the active skin as a slider, colour picker or readout, applies it on the next frame, and "Copy changes" prints only the changed tokens in the shape of a variant file.
- **Ground.**  Five looks of the real ground (campaign, dim, natural, slate, paper) are registered; the skin runs unchanged on all of them (`shots/variants/`).
- **Specimen.**  `dist/specimen.html` draws every part of the language with the skin's own painter on three grounds and in three palettes (`shots/specimen/`); a designer sees a token change there without opening the page.

## 12. What changed in the engine

The fork keeps the prototype's engine, layout, display layer, popups kernel, tuning, tours and tests.  Changes, each with the reason:

| Where | Change | Why |
| --- | --- | --- |
| `layout/spec.mjs`, `layout/tiles.mjs` | The skin declares its footprint through `layout(skin)` (`leaf`, `agg`, `nameK`); crowd names are honest; the selected unit's placement priority is raised so it is never merged into a crowd | One footprint for layout and painter; PITCH-REVIEW fix 2 |
| `layout/text.mjs`, `data/text-widths.json` | Fonts are Barlow Semi Condensed; widths re-measured in Chrome | The names unfold to a measured width |
| `scene/display.mjs`, `scene/engine.mjs` | Size glide (`motion.sizeMs`); side and arm sets pass through to the painter | A name unfolding and a crowd gaining a record glide |
| `render/canvas.mjs` | A shadow pass, a place-name layer, hulls only on hover or selection, the hover unfold into verified-free ground (paused only), no hover box | One object per unit; the shadow cannot overlap as it is its own pass |
| `render/real-ground.mjs`, `render/places.mjs` | The `campaign` look; place names drawn by the Studio with avoidance and cached sprites | The real ground; names that do not sit under marks |
| `skins/kit.mjs` and the skin contract | `layout`, `shadow`, `grow` hooks, a `fonts` function, eased state, token documents | The premium skin's needs; the contract still rejects a skin that leaks |
| `ui/*` | Shell, studio and popup stylesheets rewritten; the popup layer, legend and effects redrawn; look panel in Tune; research controls behind `?lab=1` | One language for every popup and the chrome |
| `tokens/` | 177 dials (motion size glide added, popup defaults) | Single source of defaults |
| Removed | The prototype's other skins (war room, field manual, map 1863, minimal, glyphs, specs) and their tests | This fork ships one language |

The prototype under `docs/pitch/anim/prototype`, the basemap, the symbology and every product file are untouched.

## 13. Verification

<!--T:tests-->
`node --test studio/test/*.test.mjs`: 157 tests, 157 pass, 0 fail (full log: `results/node-tests.txt`).
<!--/T:tests-->

The footprint contract on pixels (a mark paints nothing outside the box the layout reserved, in four states at two pixel ratios):

<!--T:ink-->
| Scene | Zoom | Marks | Paints (4 states x 2 DPR) | Paints outside the footprint |
| --- | ---: | ---: | ---: | ---: |
| s1a | 13.5 | 125 | 1000 | 0 |
| s1c | 15 | 330 | 2640 | 0 |
| s2 | 15 | 278 | 2224 | 0 |
| s3 | 15.5 | 345 | 2760 | 0 |
| s4 | 16.5 | 401 | 3208 | 0 |
| s6 | 14.5 | 85 | 680 | 0 |
| s8 | 16 | 366 | 2928 | 0 |

15440 paints in all, 0 outside the box the layout reserved (tolerance 0.5 px).
<!--/T:ink-->

The zero-overlap sweeps of the drawn page (an independent brute-force routine checks every sample: no two solid marks overlap, no mark covers another mark's true position, every unit has a live mark):

<!--T:sweep-->
**desktop** 1440x900 at DPR 1: 99 settled samples (11 zooms x 9 ticks x 4 places), 76.5 s.  Totals: independent overlaps 0, engine overlaps 0, pins covered 0, unrepresented units 0, pairs closer than the clearance 0; page errors 0, external requests 0.

| Zoom | Samples | Most marks | Most crowds | Most units in crowds | Overlaps (independent) | Overlaps (engine) | Clearance violations | Pins covered | Unrepresented | Smallest gap (px) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 11 | 9 | 17 | 13 | 478 | 0 | 0 | 0 | 0 | 0 | 1 |
| 12 | 9 | 30 | 24 | 473 | 0 | 0 | 0 | 0 | 0 | 1 |
| 13 | 9 | 84 | 45 | 439 | 0 | 0 | 0 | 0 | 0 | 1 |
| 13.5 | 9 | 136 | 62 | 410 | 0 | 0 | 0 | 0 | 0 | 1 |
| 14 | 9 | 206 | 68 | 342 | 0 | 0 | 0 | 0 | 0 | 1 |
| 15 | 9 | 346 | 54 | 187 | 0 | 0 | 0 | 0 | 0 | 1 |
| 15.5 | 9 | 414 | 30 | 97 | 0 | 0 | 0 | 0 | 0 | 1 |
| 16 | 9 | 381 | 77 | 174 | 0 | 0 | 0 | 0 | 0 | 1 |
| 16.5 | 9 | 419 | 52 | 112 | 0 | 0 | 0 | 0 | 0 | 1 |
| 17 | 9 | 449 | 29 | 59 | 0 | 0 | 0 | 0 | 0 | 1 |
| 18 | 9 | 463 | 15 | 30 | 0 | 0 | 0 | 0 | 0 | 1 |

**phone** 390x844 at DPR 2: 63 settled samples (7 zooms x 9 ticks x 4 places), 35.9 s.  Totals: independent overlaps 0, engine overlaps 0, pins covered 0, unrepresented units 0, pairs closer than the clearance 0; page errors 0, external requests 0.

| Zoom | Samples | Most marks | Most crowds | Most units in crowds | Overlaps (independent) | Overlaps (engine) | Clearance violations | Pins covered | Unrepresented | Smallest gap (px) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 11 | 9 | 17 | 13 | 478 | 0 | 0 | 0 | 0 | 0 | 1 |
| 12 | 9 | 30 | 24 | 473 | 0 | 0 | 0 | 0 | 0 | 1 |
| 13 | 9 | 84 | 45 | 439 | 0 | 0 | 0 | 0 | 0 | 1 |
| 14 | 9 | 206 | 68 | 342 | 0 | 0 | 0 | 0 | 0 | 1 |
| 15 | 9 | 346 | 54 | 187 | 0 | 0 | 0 | 0 | 0 | 1 |
| 16 | 9 | 381 | 77 | 174 | 0 | 0 | 0 | 0 | 0 | 1 |
| 17 | 9 | 449 | 29 | 59 | 0 | 0 | 0 | 0 | 0 | 1 |
<!--/T:sweep-->

The mark, crowd and unit counts are the same on the phone because the layout is a function of the tick and the zoom, not of the viewport (that is what lets panning run without re-solving it); what the phone run adds is the drawn page at 390x844, DPR 2, with touch emulation.

## 14. Limits, said plainly

- The ground is the modern 2022 NAIP aerial, not 1863; the placements are in the site's own frame.  The ground is a backdrop, not a claim.
- Marks can sit under the fixed chrome (brand and clock chips, the tool strip, the dock): the layout is independent of the viewport so that panning never re-solves it, which means it cannot route around controls.  The counts are in the shot table ("marks under fixed chrome": at most 13 of 125 at the opening zoom).  A card never covers a mark (0 in every scene with a card); a rail or sheet does by design.
- Place names can be partly covered by a card (they avoid marks, not cards).
- Union and Confederate cloth are close in greyscale luminance (section 4); the fly shape and the crowd-mark word carry the side.
- While the camera zooms, a mark that must travel far dims to 42 percent and glides; it can pass under a solid mark for a few frames (section 8).  The overlap guarantee and every overlap count here are about solid marks (opacity 0.5 or more).
- Names unfold from zoom 15.6, which makes the marks wider and so produces more crowd marks around zoom 16 than a two-line design would.
- The hover and selection unfold only grows into free ground and only while paused; in a crowded place the name stays folded and the tooltip carries it.
- Phone, Safari and Firefox were not tested; the phone was tested as a 390x844 Chrome viewport with touch emulation.
- The whole field at 4x and DPR 2 ran at 49 to 55 frames per second in the two runs made; I did not profile where the rest of the frame goes.
- The colour-vision simulation uses the Machado matrices typed from memory; the CIEDE2000 arithmetic is checked against the published Sharma, Wu and Dalal test pairs (maximum error 0), the greyscale figure is a plain luminance ratio.
