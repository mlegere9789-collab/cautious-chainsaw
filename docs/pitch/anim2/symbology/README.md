# Battle Studio symbol pipeline

A build-time pipeline that turns a design-token file and the real order-of-battle data into a **pre-rendered symbol atlas** (SVG sources, plus PNG and lossless WebP atlases at 1x, 2x and 3x), in **three frame languages**, with a tiny runtime that only copies rectangles out of the atlas. Nothing heavy runs in the browser: no SVG parsing, no icon font, no third-party artwork. Every frame and glyph is drawn from paths in `src/`.

Written 2026-10-07 by resuming and finishing an earlier run's work (the pipeline, tokens, sheets and tests existed; the README, the source evaluation and the fixes below did not). Nothing outside `docs/pitch/anim2/symbology/` and `tmp/look-dev/symbology/` was written; no product code was touched.

## 1. Look first

All pictures are in `sheets/`. They are generated from the same code that makes the atlas, so they cannot show a symbol the atlas lacks.

| Picture | What it shows |
|---|---|
| `nato-vocabulary.png`, `shield-vocabulary.png`, `minimal-vocabulary.png` | Every symbol a language can say (side x arm x echelon, fresh and carried) on a dark and a light aerial swatch, with the honest-naming table (NATO / wargame practice / invented here) and, under each symbol, how many of the 478 placed units wear it. |
| `*-vocabulary-highContrast.png` | The same with the high-contrast palette variant. |
| `nato-context.png`, `shield-context.png`, `minimal-context.png` | A tile in every state (fresh, carried, hover, selected, chip, gauge, identity chip, corps badge), the label tab, the aggregate marks (4 sides x 9 arm sets x 2 depths, drawn on a dark and a light ground), the symbols at true 1x size on six backdrops, and the atlas pixels exactly as shipped at 1x, 2x and 3x. |
| `overlays.png` | The language-independent layers: 9 status chips, the 5-step strength gauge, the pin and leader line, the Union corps badges (7 shapes x 3 colours; the data needs 19 of the 21). |
| `cvd-simulation.png` | All three languages under protanopia, deuteranopia, tritanopia and greyscale on four backdrops. |
| `scene-*`, `stress-*` | The runtime drawing real units of real ticks (see section 6). |
| `naip-*`, `naipstress-*` | The same on real public-domain aerial imagery (see section 7). |

The `scene-*`, `stress-*` and `naip-*` pictures on an aerial ground are JPEG (quality 92) because the backdrop is noise-like and PNG made the folder 40 MB; the pixel truth of the symbols is the atlas PNG and the "pixels as shipped" section of the context sheets.

## 2. Run it

```
node tools/run-all.mjs            # build both palettes, colour tests, every sheet, demo pictures, size experiments, the tests (3 min 27 s here)
node tools/run-all.mjs --quick    # without the demo pictures and the size experiments
node build.mjs                    # only the atlases (dist/), results/atlas-sizes.json, results/webp-pack.json
node tools/sheets.mjs             # only the sheets
node --test test/symbology.test.mjs
node tools/serve.mjs 9820         # then http://localhost:9820/demo/index.html  (the atlas in use)
```

Needs node 20+ (24.19 used), Chrome (path in `tools/chrome.mjs`), `playwright-core` from the repo's `node_modules`, and python 3 with Pillow and numpy (the WebP step, the pixel tests and the size experiments). Build time only: the product loads `dist/atlas/*` and `runtime/atlas.mjs`.

## 3. What an order of battle needs, from the data's real fields

Source of the counts: `docs/pitch/anim/prototype/data/dataset.json` (478 placed units), the unit registry `data-src/build/unit_registry.json` (569 units) and `docs/pitch/anim/03-data-fuel.md`. The data is a **candidate** release: its own notice says the anchors are "not reviewed by a historian, not approved by the owner", so every position and time is Modelled, whatever label a symbol carries.

| Channel | Real field and values | How it is drawn | Evidence label |
|---|---|---|---|
| Side | `side`: Union 255, Confederate 213, **unknown 10** (the id prefix and the state code disagree) of 478 | Plate colour (blue, brick-vermilion, gold). NATO language adds frame shape (rectangle, diamond, quatrefoil). A mixed-side aggregate gets a split plate. | Documented; Contested for the 10 |
| Arm | registry `arm`: infantry 406, artillery 95, cavalry 58, horse_artillery 9, sharpshooter 1 (of 569). Placed: infantry 253, artillery 51, cavalry 16, horse artillery 5, sharpshooters 1, formations 152. 255 of the 326 non-formation placed units get their arm from the registry, 71 from the dataset's own (id-derived) arm | Per-language glyph (saltire / double chevron / circle; slash / horse head / triangle; dot / gun wheel / square; ...) | Documented for regiments, batteries, battalions |
| Echelon | `kind`: regiment 283, brigade 115, battery 38, division 31, corps 6, battalion 5. `army` exists in the order-of-battle nodes but is never placed; the vocabulary includes it | NATO: I, II, III, X, XX, XXX, XXXX above the frame. Shield: marks in a header band for battalion and up. Minimal: number of nested hexagon outlines. All three: **plate size grows with echelon** (a test proves it). | Documented |
| Headquarters / command | **Not in the data.** There is no HQ unit type, no HQ arm and no HQ position. Commanders are a field of the unit (543 of 569 units; 158 of 158 formations) | The brief's "headquarters/command" is the **formation** symbol (brigade, division, corps), drawn with **no arm**, because the data gives a formation none. No HQ symbol was invented. | Documented |
| Posture / arm state | `disposition`, 11 values. The three defaults (Line of Battle, Mounted Cavalry, Deployed Artillery) draw the plain symbol; 8 get a chip: charging line (243 keyframe rows, 175 units), retreat (161, 125), line of march (132, 105), bivouac (131, 88), skirmish line (62, 35), reserve (53, 36), limbered artillery (18, 17), dismounted cavalry (13, 8) | A 15 u round chip at the north-east corner. **Skirmish and dismounted exist in the data** and have their own chips. No chip points anywhere: the data has no reliable heading (03-data-fuel.md E12, bearing agrees with the real move 47% of the time). | Modelled (hand-authored per keyframe; 28 duplicate keys disagree) |
| Identity unknown | 95 placed units have no order-of-battle record (name and arm come from the id alone) | A "?" chip | Unknown |
| Strength | keyframe strength over `strengthRef` | 4-segment gauge in quartiles (no false precision) | Modelled |
| Freshness | age of the latest keyframe; the reference skin's own threshold is 225 ticks (one battle day) | `carried` sprite: dotted light ring, greyer plate, no shadow. The atlas holds the two states; a skin can cross-fade them by age. | Computed |
| Selected / hover | interface state | Rings in the same dual-ring grammar, glow on hover only | Design |
| Corps | Union infantry whose chain documents the corps (7 corps, 3 division colours: 19 badge sprites needed) | Badge at the left of the tile | Documented (circular of 21 March 1863; Union infantry only) |
| Crowd | the layout solver's merged tiles: 988 solves, 29,150 aggregate tiles, 48 side/arm-set/depth combinations (`results/agg-census.json`) | Aggregate mark: 2 or 3 stacked plates, side colour, a row of arm glyphs (I infantry, C cavalry, A artillery, F formation records), a count slot the skin fills with text | Computed (a count of placement records, never of men) |
| Moved tile | layout displacement | Pin (side-coloured) at the true position and a leader line to the tile | Computed |

The label set is the owner's six (Documented, Measured, Computed, Modelled, Contested, Unknown) plus **Design**, which I added for interface-only elements (rings, tab, pin) that make no claim about the battle. No channel here is Measured. If the owner wants only the six, those three rows should carry no label.

## 4. The three frame languages, honestly named

The three languages differ in silhouette, glyph grammar and echelon grammar, and they were drawn separately (different shapes, different ways to say "brigade"), so they are not recolours of one drawing. They do, deliberately, **share one tile anatomy** (section 5: label to the right, chip at the north-east corner, gauge below), so a skin can switch language without relayout. If the owner wants the *looks* to differ in layout, typography and motion as well, that belongs to the skins on top of this pipeline and is not done here.

**(a) NATO-spirit frames** (`src/lang-nato.mjs`)
- *NATO / APP-6 convention*: frame shape = affiliation (rectangle friend, diamond hostile, quatrefoil unknown); saltire = infantry, one diagonal = cavalry / reconnaissance, a filled circle for field artillery; echelon marks above the frame (I, II, III, X, XX, XXX, XXXX).
- *Common wargame practice*: horse artillery as the gun dot over the cavalry slash (NATO has no horse artillery symbol).
- *Invented here*: flat plates with a light and a dark ring, soft shadow and top light (NATO draws line work); the diamond means "the other army", **not** "hostile"; plate size grows with echelon (NATO frames are one size); split plate for both sides; dotted ring for carried-forward; sharpshooters as saltire with a scope ring; formations as an inset outline with no arm.

**(b) Flat pictograms in a rounded shield** (`src/lang-shield.mjs`)
- *NATO convention reused*: the echelon marks (bars, X), moved into a header band.
- *Wargame practice*: gun wheel for artillery (the NATO field-artillery circle drawn as a spoked wheel); horse artillery as wheel over slash.
- *Invented here*: the shield silhouette; double chevron (infantry), horse head (cavalry), target (sharpshooters), three dots for a formation; regiments and batteries carry no echelon mark (they are the unit of account).

**(c) Minimal glyphs for editorial maps** (`src/lang-minimal.mjs`)
- *Common cartographic practice, no standard*: solid markers coloured by side and sized by importance.
- *Invented here*: circle infantry, triangle cavalry, square artillery, diamond horse artillery, ringed dot sharpshooters; a hexagon is a formation and its number of nested outlines is the echelon (1, 2, 3, 4). Nothing here is NATO.

All three: the carried-forward dotted ring and the split mixed-side plate are invented here.

## 5. Anatomy of a tile

```
                 [ echelon marks / header band / nested outlines ]
      status chip  (NE corner badge: posture, arm state, or "?")
   +----------------------------+
 badge  |        symbol        |==( label tab: pill tucked behind symbol and chip )
 (left) +----------------------------+
            [ strength gauge ]  (below)
   moved tile:  pin at the true position -- leader line --> tile
```

Anchors come with every base sprite in the atlas index (`ne`, `below`, `left`, `right`, `tab`, `tabChip`), plus its solid `core`, its `box` (with echelon marks), `boxFull` (with every layer), `ink` (the glyph's ink box, where there is a glyph), and `strip` (the echelon marks, NATO). Paint order (see `drawTile` in `runtime/atlas.mjs`): leader lines under everything, hover or select ring, label tab, base symbol, chip, gauge, corps badge; aggregate count text last; **pins on top of all tiles** so a pin is seen whole or not at all.

**The one-tile rule.** The old prototype drew a plate plus a separate caption chip (two boxes per unit). Here the label is a pill that tucks *behind* the symbol (and behind the chip when the tile wears one: `anchors.tabChip`), drawn from three slices of one sprite so any text width costs no new sprite. A browser test proves the three slices equal a pill rendered directly (stretched middle within 3/255 of a direct render at 1x, 2x and 3x; the end caps differ by a few anti-aliased arc pixels, documented in `results/tab-slice-test.json`).

**The chip rule** (`chipCentre` in `src/common.mjs`, one rule for every language and silhouette). Walk the chip along the diagonal leaving the symbol's north-east box corner and stop at the first position, closest to the symbol, where (1) the chip body is at least `chip.clearance` (1 u) from the glyph ink and from the echelon marks, and (2) the chip covers at most `chip.maxCoverage` (10%) of the silhouette. A chip therefore never covers an arm glyph or an echelon mark. Measured on the 3x atlas pixels by `test/chips.py` (rings and ink included, so slightly above the analytic 10%):

| Language / shape | Symbols | Chip covers |
|---|---|---|
| NATO rectangle | 18 | 4.9% to 9.1% |
| NATO diamond | 18 | 0.6% to 8.8% (large diamonds are pushed out to clear the glyph; the chip then only touches) |
| NATO quatrefoil | 2 | 2.9% to 3.1% |
| Shield | 38 | 5.0% to 10.0% |
| Minimal circle, square, triangle, diamond, hexagon | 8, 10, 4, 4, 12 | 7.7% to 10.0% |

**Crowds never drop a unit.** When tiles cannot all stand, they merge into an aggregate mark. The demo (section 6) proves it with the shipped runtime: 85 units at zoom 13.5 are all represented, with zero overlap.

**A moved tile** keeps a side-coloured pin at its true position and a leader line, drawn from tokens `pin.*` and `leader.*`; `drawLeaderLine` and `drawPin` in the runtime draw them identically in every skin.

## 6. The atlas in use (demo and numbers)

`demo/index.html` draws real units of three real ticks through the shipped runtime, with a plain greedy placement (it is **not** the product's layout engine). Rules it enforces and tests: footprints from `tileBox` (symbol + chip + label tab) never overlap; tiles move at most 150 px before a unit merges into a mark; the pins of moved tiles are keep-outs for every other tile (the passes settle in 3); any unit still unplaced is listed and fails the test. Result of the browser test (3 languages x 3 device-pixel ratios x 4 scenes = 36 runs, real Chrome, no console error; `results/demo-test.json`):

| Scene | Units on canvas | Overlapping footprints | Unplaced | Pins lying on another tile | Formation marks (units merged) |
|---|---|---|---|---|---|
| The Angle, tick 551, zoom 16 | 10 | 0 | 0 | 0 | 0 |
| Culp's Hill, tick 451, zoom 16 | 14 | 0 | 0 | 0 | 0 |
| Cemetery Hill, tick 120, zoom 14.5 | 53 | 0 | 0 | 0 | 2 to 5 (6 to 15) |
| Cemetery Hill, tick 120, zoom **13.5** (the site's start zoom) | 85 | 0 | 0 | 0 | 7 to 8 (31 to 45); NATO 8 marks / 45 units, shield 8 / 45, minimal 7 / 31 |

A skin can also load the lossless WebP atlas (`?webp=1` in the demo); a test checks that the layout is identical.

## 7. Colour

Palette `standard` (`tokens/symbology.tokens.json`): Union `#1B4B91`, Confederate `#C8491F`, contested `#EEC63F`, glyph ink white (dark `#1A1408` on the gold), light ring `#F7F3E8`, dark ring `#0B1118`. Blue against brick-vermilion is in the spirit of Okabe and Ito's colour-blind-safe blue and vermilion (not their exact values). Every plate is wrapped in a **dual ring** (light inside, dark outside) so that at least one ring clears 3:1 on any backdrop.

The tested pairs (`tools/colour-tests.mjs`, `results/colour-tests.json`, 69 checks, all pass, in both palettes):

| Test | Result | Bar |
|---|---|---|
| Glyph on plate, fresh: Union / Confederate / contested / bone on chip | 8.53 / 4.74 / 11.14 / 16.41 : 1 | 4.5:1 (WCAG 1.4.3 applied to glyphs) |
| Glyph on plate, carried-forward: Union / Confederate / contested | 4.90 / 4.11 / 6.10 : 1 | 3:1 (non-text) |
| Best ring on six backdrops plus the darkest 5% (forest shadow, forest, field, pale field, bare soil, paper, ink) | 16.09, 12.33, 6.10, 5.04, 8.31, 11.48, 16.08 : 1 (weakest: pale field 5.04) | 3:1 (WCAG 1.4.11) |
| Best ring on 28 luminance bands of 4 **real NAIP-derived** backdrops (7 bands each) | 3.99 to 14.55 : 1 (weakest: brightest band of Wheatfield z15, 3.99, dark ring wins) | 3:1 |
| Union vs Confederate CIEDE2000: normal / protanopia / deuteranopia / tritanopia | 46.1 / 48.1 / 57.0 / 59.2 | 20 (this project's own bar, not a WCAG number) |
| Union vs contested | 70.8 / 68.5 / 74.5 / 61.8 | 20 |
| Confederate vs contested | 41.9 / 34.3 / 24.4 / 30.3 | 20 |
| Corps badge colours red/white/blue, worst of the three vision types | 36.8 | 20 |
| Union vs Confederate in greyscale | luminance ratio 1.8:1 (CIEDE2000 14.3) | luminance ratio 1.3:1 |

`sheets/cvd-simulation.png` shows all of it. **Honest limit**: in greyscale, Union and Confederate differ by lightness (1.8:1) in the shield and minimal languages, which share silhouettes across sides; only the NATO language adds shape redundancy (rectangle vs diamond). That passes this project's own bar (1.3:1) but is thinner than the hue case.

Backdrop swatches: forest, field and pale field are measured from two satellite screenshots (`results/backdrop-sample.json`); **bare soil and paper are assumed, not measured**; the NAIP bands are measured from `assets/naip` (`results/naip-bands.json`).

## 8. Token spec for a designer

`tokens/symbology.tokens.json`: 151 leaves in 17 groups, in the shape of the W3C Design Tokens draft (`$value`, `$type`, `$description`; not validated against its tooling). Lengths are CSS px at 1x ("u"); the pipeline renders the same drawing at 1x, 2x and 3x. A test requires every leaf to carry a description and a valid type.

| I want... | Edit |
|---|---|
| a different side colour, ink or ring colour | `palettes.standard.union` / `confederate` / `unknown` / `ink` / `bone` / `keyline` |
| bigger or smaller symbols | `scale.ech.*` (plate multiplier per echelon), `nato.frame.w/h`, `nato.diamond.diag`, `shield.w/h`, `minimal.size`, `minimal.formation.size` |
| heavier or lighter outlines | `ring.light`, `ring.dark`, `ring.darkAlpha`; glyph strokes `nato.glyph.stroke`, `shield.glyphStroke`, `chip.stroke`, `minimal.inner.stroke` |
| rounder or squarer corners | `nato.frame.radius`, `shield.cornerRadius`, `minimal.cornerRadius`, `tab.radius`, `gauge.radius` |
| flatter or deeper plates | `fill.lift` (top light), `shadow.dy/blur/alpha` |
| calmer carried-forward look | `carried.mix`, `carried.fillOpacity`, `carried.ringDash`, `carried.glyphOpacity` |
| a smaller chip or a different clearance | `chip.size`, `chip.clearance`, `chip.maxCoverage` |
| the label pill | `tab.h`, `tab.padX`, `tab.tuck`, `tab.font`, `tab.tones.*` |
| the pin and leader | `pin.radius`, `pin.ring`, `leader.width`, `leader.keyline`, `leader.alpha`, `leader.minLength` |

Change a value without editing the file: `node build.mjs --tokens my.json`, where `my.json` has the same tree and only the leaves you change, for example

```json
{ "palettes": { "standard": { "union": { "$value": "#1F5AA6" } } },
  "ring": { "light": { "$value": 1.5 } },
  "nato": { "frame": { "radius": { "$value": 3 } } } }
```

`node build.mjs --palette highContrast --tokens tokens/variants/high-contrast.json` builds the high-contrast variant into `dist-highContrast/` (git-ignored, regenerated by `run-all`; heavier rings, no shadow, no top light; 69/69 colour checks pass). Every atlas index records a hash of the tokens it was built from, and a test fails if `dist/` is out of date.

## 9. Pipeline, outputs and byte sizes

tokens -> **needed set** (19 side/arm/echelon specs derived from the 478 units, 48 aggregate combinations from the census, 9 chips, 5 gauge steps, 3 pins, 2 tabs, 19 corps badges) -> **sprites** (code-drawn SVG, byte-deterministic: a test builds twice and compares) -> **atlas** (Chrome rasterises each sprite once at 1x, 2x, 3x; shelf-packed with a 2 u transparent gutter; one JSON index per atlas) -> **WebP pack** (lossless, proven pixel-identical, or removed) -> byte accounting (`results/atlas-sizes.json`). `node build.mjs --all` renders the whole vocabulary (152 base sprites per language) for design review.

| Atlas | Sprites | PNG 1x / 2x / 3x (bytes) | SVG sources (bytes, gzip) |
|---|---|---|---|
| NATO | 110 (38 base, 24 rings, 48 aggregate) | 156,101 / 455,078 / 894,633 | 194,683 / 52,842 |
| Shield | 98 (38, 12, 48) | 157,967 / 450,013 / 874,005 | 231,091 / 59,818 |
| Minimal | 104 (38, 18, 48) | 165,012 / 474,231 / 909,109 | 174,689 / 50,340 |
| Overlays (all languages) | 38 (9 chips, 5 gauge, 3 pins, 2 tabs, 19 badges) | 26,331 / 70,891 / 127,360 | 50,187 / 16,019 |
| Total | 350 | 505,411 / 1,450,213 / 2,805,107 | 650,650 / 179,019 |

A skin loads **one language atlas plus the overlays** at the device's scale (the runtime picks the smallest shipped scale >= the device-pixel ratio). The SVG files in `dist/svg/` are the designer's source of truth and never ship at runtime.

**What a skin actually downloads** (`results/size-experiments.json`, `results/webp-pack.json`):

| Language + overlays | PNG 1x / 2x / 3x | Lossless WebP 1x / 2x / 3x |
|---|---|---|
| NATO | 182,432 / 525,969 / 1,021,993 | 61,662 / 133,700 / 245,092 |
| Shield | 184,298 / 520,904 / 1,001,365 | 76,558 / 172,344 / 304,786 |
| Minimal | 191,343 / 545,122 / 1,036,469 | 83,676 / 183,616 / 309,074 |

Lossless WebP saves 61.5% (1x), 70.2% (2x) and 72.6% (3x) over the whole set with a maximum premultiplied difference of 0 against the PNG, checked twice (build step and an independent test). Rejected after measurement: 8-bit palette PNG (about one sixth of the bytes, but up to 51/255 error on shadow and edge pixels) and lossy WebP quality 90 (up to 78/255). The PNG stays the reference and the fallback: `loadAtlas(..., { webp: canWebp() })` opts in.

Determinism: SVG is byte-identical build to build (tested). Two consecutive builds gave identical pixels (0 of 13,654,256 differ). Across sessions I saw 6 pixels of the NATO 3x atlas differ by at most 5/255 (its PNG moved between 894,307 and 894,633 bytes, the 3x total between 2,804,781 and 2,805,107); the cause was not investigated.

## 10. Sources and licences

Full machine-readable record: `results/sources.json`. Everything below was read on 2026-10-07 unless stated.

| Source | Licence | Used? |
|---|---|---|
| [milsymbol](https://github.com/spatialillusions/milsymbol) (README, LICENSE, package.json v3.0.5, docs/README.md) | **MIT**, Måns Beckman 2017. Implements MIL-STD-2525C/D/E, FM 1-02.2, STANAG APP-6 B/D/E; SVG and canvas output; echelon, headquarters, task force, dummy modifiers; Light/Medium/Dark colour modes | **No, and not downloaded or executed.** Evaluated from its repository files. Needs a SIDC per symbol, so the 1863 vocabulary (horse artillery, sharpshooters, formations with no arm) would have to be mapped onto standard codes; I did not enumerate its symbol sets. Its options include a `stack` effect, but the pages I read show no count slot, arm-set row, carried-forward state or atlas output. As a build-time source it could back a strict APP-6 language through `src/languages.mjs`; whether it would look better than the hand-drawn NATO language was **not tested**. npmjs.com answered 403 (not worked around); milsymbol.com did not resolve. |
| [Game-icons.net](https://game-icons.net/about.html) | CC BY 3.0, attribution required (horse-head icon page, by Delapouite, states the same) | No: per-author attribution, mixed styles |
| [Font Awesome Free](https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/LICENSE.txt) | icons CC BY 4.0, fonts SIL OFL 1.1, code MIT | No: attribution |
| [Tabler Icons](https://raw.githubusercontent.com/tabler/tabler-icons/main/LICENSE) | MIT, Paweł Kuna 2020-2026 | No |
| [Lucide](https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE) | ISC; MIT for about 150 Feather-derived icons | No |
| [Material Design Icons](https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE) | Apache 2.0 | No |
| [Maki](https://github.com/mapbox/maki) | CC0 1.0 (repository page) | No: 15 px map points |
| [OpenMoji](https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/LICENSE.txt) | CC BY-SA 4.0 (the repository's LICENSE.txt is the CC BY-SA 4.0 text; applying it to the graphics is inferred) | No: share-alike would reach every derived sprite |
| [NATO Joint Military Symbology, Wikipedia](https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology) | CC BY-SA (facts only) | Frame shapes, basic icons |
| [NATO Unit Counter Guide](https://militaryhistoryvisualized.com/?p=397) | web page (facts only) | Echelon marks |
| [army.ca NATO Map Symbols](https://army.ca/wiki/index.php/NATO_Map_Symbols) | web page | Not relied on: it calls the enemy frame an inverted pentagon, in conflict with APP-6A's diamond; unresolved |
| [USGS EROS NAIP](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip) | Public domain (stated in search-result summaries; the page fetch itself returned 504) | Backdrop texture in `assets/naip` |
| WCAG 2.x luminance and contrast; Machado, Oliveira and Fernandes (2009) CVD matrices | W3C; published matrices | Cited in `src/colour.mjs`; read on 2026-10-06 and **not re-read** on 2026-10-07 |
| Union corps badges, circular of 21 March 1863 | historical fact | Read on 2026-10-06 (civilwarnews.com, via 03-data-fuel.md); **not re-read**; shapes redrawn from geometry |

Why no icon set was adopted: none has the vocabulary (horse head, gun wheel, chevrons, echelon marks) in one consistent style, mixing sets breaks consistency, and the attribution and share-alike obligations would attach to every shipped sprite. I checked only that Game-icons has a horse head; I did **not** check the other sets icon by icon. Ranked by licence friction if a designer wants to swap a glyph: CC0 (Maki), then MIT or ISC (Tabler, Lucide), then Apache (Material), then CC BY (Font Awesome, Game-icons), then CC BY-SA (OpenMoji). **No font ships**: label and count text is drawn at runtime in `'Segoe UI', system-ui, sans-serif` (tokens `tab.font`, `agg.count.font`), measured in the same context it is drawn in.

## 11. Verification

`node --test test/symbology.test.mjs`: **28 tests, all pass** (25 s). They cover: every token documented and typed, override and palette handling; the colour maths against published CIEDE2000 vectors and the 69 contrast and separation checks in both palettes; every sprite well-formed, whole-unit sized, anchored and boxed; the vocabulary complete (side x arm x echelon x state, every language); footprint grows with echelon; every one of the 478 placed units has a sprite, chip and badge in every language; every aggregate the real layout solver produced exists; every legend row names a real sprite and an evidence label and a formation never claims an arm; `dist/` in sync with the tokens (every SVG regenerated and compared); determinism; atlas file sizes, gutters and byte budgets; pixel checks on every sprite at 1x, 2x, 3x (gutters transparent, nothing clipped, ink inside its box); chip clearance and coverage on the shipped pixels; artillery and sharpshooter glyph centring; pin and leader tokens and runtime; `tileBox`; WebP identical to PNG; NAIP hashes and ring contrast; a new frame language added by one file and one registry line; and the real-Chrome browser tests (demo scenes at 1x, 2x, 3x including the WebP path; the three-slice tab against a direct render).

## 12. What the pass found and fixed

Found by looking at the sheets and by writing the tests, not by the earlier run's tests:

1. **Aggregate glyphs**: the artillery dot and the sharpshooter ring were drawn at the sprite origin, not the glyph box centre, so on every aggregate mark with an artillery member the dot sat on top of the count.
2. **Chips hid information**: the status chip covered the end of the saltire, the dot and the slash on NATO plates, the echelon marks on divisions, and 25% to 62% of the small minimal markers (the chip was as big as the marker). Replaced by the chip rule (section 5); the minimal marker also grew from 14 u to 16 u (brigade hexagon 21 u to 24 u).
3. **Label text under chips**: a chip sat on the first letters of the label. The pill now tucks behind the chip (`tabChip`).
4. **Leader underlay never drew**: the atlas index stored the leader's dark *colour* under the same name as its numeric *width*, so the runtime set a NaN line width and the dark underlay silently vanished. Caught by the pin test; the fields are now `keylineColour` and `boneColour`.
5. **Pins hidden or half hidden** under other tiles, and **pins on label text**: pins are now sprites painted on top, and moved tiles' pins are keep-outs (0 pins on tiles in all 36 runs; up to 16 in the crowded scene before).
6. **Demo dropped units** it could not place; it now merges them into aggregate marks (all 85 represented at zoom 13.5).
7. **Sheets**: the vocabulary sheets wrapped their third panel; captions floated between rows; the strength gauge looked like part of the next row and was clipped at the panel edge; the colour-vision sheet had a blank 300 px band and clipped row labels; the label-tab section overlapped tiles; the corps badge landed on the neighbouring cell.

## 13. Not verified, limits and risks

- **Only Windows Chrome was tested** (headless, device-pixel ratios 1, 2, 3 emulated). Firefox, Safari and phones were not. WebP needs a browser that decodes it; `canWebp()` guards it and the PNG is the default.
- The colour-vision check is **software simulation** (Machado matrices, severity 1.0, applied in linear sRGB, an assumption their page does not settle), not people; no anomalous trichromacy; the CIEDE2000 bar of 20 is this project's own.
- The demo's placement is a greedy search, not the product layout engine. "Zero overlap" is about the footprints `tileBox` reports (halo of 3 px, no hover or selection ring). A layout engine must adopt `tileBox` and treat pins as keep-outs.
- The NAIP backdrops are the parallel basemap job's *dimmed previews*, copied read-only and hashed; they are texture only, **not georeferenced to the unit positions**, and carry their own baked-in place labels. The two soil and paper swatches are assumed.
- NATO conventions come from secondary sources (Wikipedia, a hobby counter guide), **not** from the APP-6 or MIL-STD-2525 documents; one source conflicts on the hostile frame. Nobody with military-symbology expertise has reviewed the frames.
- The horse head, gun wheel, chevrons and chips are my own hand-drawn paths, **not reviewed by a designer**. I looked at every sheet and fixed what I saw; whether the result meets the owner's "AAA" bar is the owner's call.
- The label font is a Windows system font with a `system-ui` fallback; widths are measured at runtime, but how it looks on other systems was not seen.
- No assistive-technology test. `dist/legend.json` carries 41 sentences per language with evidence labels, enough to generate an accessible legend; this was not tried with a screen reader.
- Position and time of every unit are Modelled in a candidate dataset; the evidence label on a symbol says what is documented about the *unit*, not that the position is exact.
- `runtime/atlas.mjs` repeats the disposition-to-chip table of `src/chips.mjs`; a test keeps the two equal.
- Out of scope here and not done: the animation, layout and popup work (other tasks) and integration into the product skins.

## 14. Extending

- **A new frame language**: write `src/lang-<id>.mjs` with a default export `{ id, label, silhouette, aggFrame, base, glyph }` (copy `lang-minimal.mjs`, the shortest), have `base` return the anchors (`ne`, `below`, `left`, `right`, `tab`, and `tabChip` when the chip can meet the label), placing the chip with `chipCentre` from a signed-distance function of the silhouette (`sdfCircle`, `sdfRoundRect`, `sdfPoly`, `sdfUnion` in `src/svg.mjs`), add one line to `src/languages.mjs`, and add its sentences to `src/legend.mjs` and `src/sheets.mjs`. The `extension` test builds a throwaway language this way (without the chip rule: the chip test only measures the three shipped languages).
- **A new status chip**: name in `CHIPS`, glyph and text in `src/chips.mjs`, mapping in `CHIP_OF_DISPOSITION` (and in `runtime/atlas.mjs`; a test keeps them equal).
- **A new arm or echelon**: `src/common.mjs` (`ARMS`, `LABEL`, `ECHELONS`), then each language's glyph and scale token.
- **A new palette**: a sibling of `palettes.standard` in the token file, then `node build.mjs --palette <name>`.
- **A new layer for the atlas**: add a `render*` in `src/overlays.mjs`, list it in `src/build-sprites.mjs`; the pixel, gutter and index tests pick it up.

## 15. File map

```
README.md  build.mjs                      this file; the pipeline entry point
tokens/symbology.tokens.json              the token spec;  tokens/variants/high-contrast.json  the override file for the variant
src/                                      tokens, colour maths, svg toolkit, the three languages, overlays, chips, legend, atlas packing, sheets
runtime/atlas.mjs                         the only code that ships with the atlas: loadAtlas, drawTile, tileBox, drawLeaderLine, drawPin, drawCount
dist/atlas/                               <id>.json index, <id>@1x|2x|3x.png and .webp   (dist/svg: every sprite as SVG; dist/legend.json)
demo/  tools/  test/                      the demo, the build helpers (sheets, shots, colour tests, WebP pack, size experiments, run-all), the tests
assets/naip/                              four real-imagery backdrops with provenance.json
results/                                  every number quoted above, as JSON
sheets/                                   the pictures
```
