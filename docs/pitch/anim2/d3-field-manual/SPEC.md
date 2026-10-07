# Precision Field Manual: the design language of the Battle Studio, direction 3

A modern staff map, made beautiful: APP-6 / MIL-STD-2525 frames with echelon marks, strength gauges and tabular numerals, set to Edward Tufte's data-ink discipline and the clarity of a Bloomberg terminal. Flat vector, a strict grid, two type sizes. It is a **skin module** (`engine/skins/d3.mjs`), a **token file** (`tokens/d3.skin.tokens.json`), a **stylesheet** for every popup and the chrome (`engine/ui/fm.css`) and a small **fork** of the prototype engine, rendered on the real aerial ground of `docs/pitch/anim2/basemap`.

Written 2026-10-07. Every number in this document is either typed here as a design value (a token, a size) or comes from a script in `tools/` that wrote `results/*.json`; the tables between `<!--T:...-->` markers are rewritten from those files by `node tools/spec-tables.mjs`. What was not verified is in section 13.

**Look first.** `shots/` (PNG, real Chrome, DPR 2; desktop 1440 x 900, phone 390 x 844), each scene also as a 100-percent crop of its busiest 600 x 400 area (`*-crop.png`):

| picture | what it shows |
|---|---|
| `S1a-field-z13.5-t551.png` | the opening zoom 13.5, the whole field at the tick of the first prototype's `compare-z15` (551) |
| `S1b-day3-assault-the-angle-z13.5-t556.png` | the Day 3 assault, zoom 13.5, tick 556 (the densest hotspot) |
| `S2-wheatfield-rose-woods-z15-t295.png` | The Wheatfield and Rose Woods, zoom 15, tick 295 |
| `S3-cemetery-hill-z15.5-t346.png` | Cemetery Hill, zoom 15.5, tick 346 |
| `S4-closeup-z16.5-selected-inspect.png`, `S4b-...-details-rail.png` | zoom 16.5, one unit selected, its card open; and the whole card in the reading rail |
| `S5-phone-z14.5-sheet.png` | the same moment on a phone with the bottom sheet |
| `S6-event-and-story-in-situ-herbst-woods-t28.png` | an event card and a story card in situ |
| `S7-legend.png` | the legend (true-size marks) in the rail |
| `S8-hover-tooltip.png` | a hover tooltip |
| `M1-deployment.png`, `M2-march.png`, `M3-grow.png` | eight-frame strips: arrival, a march (consecutive frames), the mark growing to a name |
| `P1` to `P11` | every other popup: day banner, toasts, narration (a caption, the measured results), welcome, hint, an aggregate under the pointer, the Tuning Studio, About, the Chronicle, the clock and overview |
| `V1`, `V2`, `V3` (whole frames JPEG, crops PNG), `cvd-simulation.png` | the day, colour-blind-safe and high-contrast sets; the colour-vision simulation |
| `iterations/` | the whole pictures of iterations 1 to 3 (JPEG), see `ITERATIONS.md` |

## 1. Principles

1. **One object per unit.** A unit is one mark: a plate carrying its symbol, its code and its strength. Never a plate plus a caption box. The full name is the same object grown wider (close zoom, selection) or the tooltip; nothing is ever a second box beside it.
2. **Three weights, no more.** Level 1, the *formation marks* (a brigade, division or corps record, and every stack): 13 px type, a tab with the echelon marks, a taller plate. Level 2, the *unit marks* (regiment, battery, battalion): 11 px type. Level 3, *secondary detail*: the strength gauge, the tail (a stack's count), a pin and its leader, a place name. The eye finds the formations, then the units, and reads the rest only when it asks.
3. **Quiet.** No dashed outline, no shadow, no glow, no gradient, no badge smaller than the type. Crowds merge into a stack, which has its own look; there is no dot cloud. The provisional state of a position is **one** device: the side colour of the cell, washed toward grey as the keyframe ages.
4. **Strict grid.** A 4 px module with a 2 px half step. Every plate, tab, ring, gauge and card sits on it. At rest a mark snaps to the device-pixel grid (the kit's snapping), so its edges are crisp at DPR 1, 2 and 3.
5. **Data-ink.** Every stroke and fill of a mark encodes a datum or separates two data. The one stroke that does neither, the 1 px keyline, exists for legibility on a photograph and is tested for it (section 5).
6. **True to the data.** Every encoding has an evidence label, in the legend and in section 10. A Modelled value never looks as firm as a Documented one; the side of a unit the data cannot settle is never drawn as a side.
7. **Two type sizes, one numeral style.** 11 px and 13 px, nothing else, on the map and in every card; FM Sans for the interface, FM Serif for titles and narrative; the ten digits of FM Sans have one width, so numbers align without a feature flag. Audited on the running page (section 4).
8. **Redundant where it matters.** Side is carried by hue, by the *position of the cell* (Union left, Confederate right: the armies face each other) and by the legend; it survives greyscale and every colour-vision deficiency simulated (`shots/cvd-simulation.png`).
9. **Flat.** Surfaces are opaque with a hairline. A card stands off the map by being opaque, by its keyline and by a 2 px rule in its tone colour on the top edge.

## 2. Anatomy of a mark

```
 unit mark (Union)                   unit mark (Confederate)            formation mark (a brigade record)       stack (7 records of one brigade)
 +----+----------------------+       +----------------------+----+      +---+                                    +---+
 |cell| CODE   tail          |       | CODE   tail          |cell|      |x  |  tab: echelon (X = brigade)        |x  |
 | X  |______strength_gauge__|       |______strength_gauge__| X  |      +---+--------------------+               +---+--------------------+--+
 +----+----------------------+       +----------------------+----+      |   | I/3/2              |               |   | II/3  x7           |  |
   20 px high plate, 11 px type        mirrored: the grid is the same     |   |____________________|               |   |____________________|  |   the plate behind: more than one
                                                                          22 to 26 px plate, 13 px type             24 px plate, 13 px type, stack edge 3 px
```

| part | what it is | evidence |
|---|---|---|
| **cell** | a square, as wide as the plate is high, at the left (Union, contested, contact) or at the right (Confederate). Fill = the side. Fresh: the full side colour; a day old or more: the same hue washed toward grey (`color.<side>.old`), blending from half a battle day (112.5 ticks) to a whole one (225) | side: Documented (order of battle, id prefix); wash: Computed (age of the latest keyframe, in ticks) |
| **arm symbol** | in the cell, white, 1.6 px stroke, half-size 27 % of the cell: infantry a cross, cavalry a slash, artillery a dot. Dismounted cavalry: the slash on a ground line; limbered artillery: gun and limber. The two default states (mounted, deployed) are the plain symbol. A brigade, division or corps record claims **no arm**: its cell stays empty (APP-6: a frame of unspecified function). A stack shows the arm when all its records share one, and none otherwise | Documented for regiments, batteries, battalions; formations: no claim; stacks: Computed |
| **code** | the short code (`14 VT`, `II/3`, `ART/II/CORPS`), bold, 11 px (13 px for the formation tier) | Documented (derived from the id and the order of battle) |
| **underline** | a 1 px line under the code: the unit has no complete order-of-battle record, its name comes from the id alone (95 of 478 units) | Unknown |
| **tail** | after the code, regular weight, muted: a stack's count. `x7` = seven records of the named formation; `+4` = the named unit and four others. Records, never men | Computed |
| **strength gauge** | the foot of the plate: 3 px, flush with the edges, the width of the code field, ticks at the quartiles. The keyframe's strength over the unit's reference strength | Modelled (a placement strength, not a casualty record) |
| **tab** | above the cell, 10 px high, on formation marks and battalions: the APP-6 echelon marks, `II` battalion, `X` brigade, `XX` division, `XXX` corps | Documented (registry kind); on a stack: Computed (the formation its records share) |
| **stack edge** | a second plate 3 px behind and to the lower right: "more than one record here" | Computed |
| **keyline** | 1 px around the whole mark, `color.keyline` at `alpha.keyline` (0.55 night, 0.7 day): legibility on a photograph | design (tested, section 5) |
| **cell of a contested unit** | ochre with 45-degree hatching (4 px pitch) and a dark glyph: never a side colour. 10 units | Contested |
| **cell of a contact** | split along the diagonal, Union blue and Confederate red: a stack with both sides in it | Computed |
| **pin and leader** | a displaced mark keeps a dot (r 2.6, side colour, light ring, underlay) on its true position and a 1 px line to the mark, under every mark | the displacement: Computed; the position: Modelled |
| **name form** | at zoom 16 and beyond, and for the selected mark at any zoom, the code is replaced by the unit's full name (the designation when it is 34 characters or fewer, else the registry label, or the designation again when that label is shortened with an ellipsis): the plate grows, the footprint is reserved first | Documented (designation) |

A mark is **drawn once, by one function** (`paintMark` in `engine/skins/d3.mjs`) that the tile, the legend swatch and the footprint (`layoutOf`) all use. The footprint the layout engine reserves is the plate plus the tab plus the stack edge plus a 2 px band on every side for the selection ring; `checkSkin` (ink stays inside the footprint) passes for every mark of every scene and sweep (section 12).

### Dimensions (CSS px at 1x; all tokens in section 5)

| mark | plate height | tab | stack | type | footprint height (with the 2 px band) |
|---|---:|---:|---:|---:|---:|
| regiment, battery | 20 | 0 | 0 | 11 px | 24 |
| battalion | 20 | 10 | 0 | 11 px | 34 |
| brigade record | 22 | 10 | 0 | 13 px | 36 |
| division record | 24 | 10 | 0 | 13 px | 38 |
| corps record | 26 | 10 | 0 | 13 px | 40 |
| stack | 24 | 10 (when the records share a formation) | 3 | 13 px | 31 or 41 |

Width = cell (as wide as the plate is high) + 6 + the text + 7 (+ 6 + the tail) + 4. The measured footprints on the real data are in the table "What the marks measure" in section 12.

## 3. Hierarchy

The three weights above are the only hierarchy. What carries each: **size of plate** (20 against 22 to 26), **size of type** (11 against 13), **the tab** (formations only), **the stack edge** (stacks only), **weight of face** (the tail and everything secondary is regular, the code bold). Nothing is louder by colour: the side colours belong to the units and to nothing else, the interface uses one signal colour (amber, `--signal`) for the primary action, the selected tab and the highest tier of a card.

## 4. Type

Two families, five files, both from the Source family of Adobe (SIL Open Font License 1.1), subset and **renamed** because the Reserved Font Name "Source" may not be used by a Modified Version: **FM Sans** (from Source Sans 3: Regular, Bold) and **FM Serif** (from Source Serif 4: Regular, Italic, Bold). `fonts/OFL.txt` carries the copyright notices and the licence text; `tools/make-fonts.py` rebuilds the files from the installed originals (no download; where the originals came from and what was not checked is in section 13). They are embedded in the page as data URIs (113 KB in all) and loaded before the first frame, because the canvas measures and draws with them.

<!--T:fonts-->
| file (fonts/) | family, style | made from | bytes | glyphs | digit advance (units / 1000) | sha256 (first 16) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `fm-sans-regular.woff` | FM Sans Regular | `SourceSans3-Regular.otf` | 17,636 | 270 | 497 (all ten digits equal: tabular) | 527d9df694849594 |
| `fm-sans-bold.woff` | FM Sans Bold | `SourceSans3-Bold.otf` | 17,544 | 270 | 528 (all ten digits equal: tabular) | 5048b349d3f7ce68 |
| `fm-serif-regular.woff` | FM Serif Regular | `SourceSerif4-Regular.otf` | 25,520 | 321 | 500 (all ten digits equal: tabular) | 3858cc1ca5d3fb3c |
| `fm-serif-italic.woff` | FM Serif Italic | `SourceSerif4-It.otf` | 24,760 | 328 | 511 (all ten digits equal: tabular) | ee1810e51256e581 |
| `fm-serif-bold.woff` | FM Serif Bold | `SourceSerif4-Bold.otf` | 27,920 | 321 | 542 (all ten digits equal: tabular) | 5017a3bdd97c2176 |
<!--/T:fonts-->

| size | where | face |
|---|---|---|
| **13 px** | formation marks and stacks; every card's title and body; the clock; buttons' content; the numerals of the dock | FM Sans Bold on the map and for emphasis, FM Sans Regular for reading, FM Serif Bold for titles and the brand, FM Serif Regular and Italic for narrative, quotes and the reading rail's script |
| **11 px** | unit marks; tails; labels, kickers and buttons in capitals with +0.08 em tracking; metadata; the evidence labels; the ground's names (serif: place names bold, road names regular, water names in the true italic) | FM Sans Bold and Regular; FM Serif for the ground |

There is **no third size**: a title is 13 px like its body and is told apart by face (serif bold), colour and the rule above the card; the day banner and the welcome headline are 13 px serif bold too. This is a deliberate cost of the rule and is listed among the decisions in section 13. Numerals: the ten digits of each face have one advance (table above), so a count, a code and a clock align in columns without `font-variant-numeric`; the canvas could not select a feature anyway. The measured audit of the running page:

<!--T:type-->
DOM text: 11px, 13px. Canvas text: 11px, 13px. Sizes outside 11 and 13 px: 0.

| rendered text style (size / weight / family) | elements seen | states |
| --- | :--- | :--- |
| 11px / 700 / FM Sans | 396 | welcome; map z13.5; map z15; map z16.5; selected + card + inspect panel; details rail; legend in the rail; panel tune; panel about; toasts and event cards; day banner; narration |
| 11px / 400 / FM Sans | 243 | welcome; map z13.5; map z15; map z16.5; selected + card + inspect panel; details rail; legend in the rail; panel tune; panel about; toasts and event cards; day banner; narration |
| 13px / 700 / FM Sans | 57 | welcome; map z13.5; map z15; map z16.5; selected + card + inspect panel; details rail; legend in the rail; panel tune; panel about; toasts and event cards; day banner; narration |
| 13px / 400 / FM Sans | 36 | welcome; map z13.5; map z15; map z16.5; selected + card + inspect panel; details rail; legend in the rail; toasts and event cards; day banner; narration |
| 13px / 700 / FM Serif | 24 | welcome; map z13.5; map z15; map z16.5; selected + card + inspect panel; details rail; legend in the rail; panel tune; panel about; toasts and event cards; day banner; narration |
| 13px / 400 / FM Serif | 1 | details rail |
<!--/T:type-->

## 5. Colour: tokens and their tests

The token file is `tokens/d3.skin.tokens.json` (the designer-facing one); the stylesheet's own variables are at the top of `engine/ui/fm.css` (`:root` for night, `:root[data-theme="light"]` for day). Colours are `#rrggbb`; lengths are CSS px at 1x.

<!--T:tokens-->
**Colour**

| token | value | what it does |
| --- | :--- | :--- |
| `color.plate` | `#0f151c` | Plate of a mark: the flat surface under the code. Opaque, so the text contrast is a property of the plate and never of the ground. |
| `color.plateHover` | `#1c2631` | Plate while the pointer rests on the mark (eased). |
| `color.keyline` | `#ffffff` | The one-pixel line around a mark. It is the only ink that is not data: it keeps a dark plate readable on a dark photograph. |
| `color.text` | `#f4f6f8` | Code, name and the strength gauge on the plate. 15:1 on the plate. |
| `color.textMuted` | `#aab5c1` | The tail of a mark (the count of an aggregate), in the regular weight. Secondary detail. |
| `color.glyph` | `#ffffff` | The arm symbol on a side colour. |
| `color.ringLight` | `#ffffff` | Selection ring, inner line, and the ring of a pin. |
| `color.ringDark` | `#05080c` | Selection ring, outer line, and the dark underlay of a leader and a pin: together with the light line it holds on any ground. |
| `color.underlay` | `#05080c` | The dark underlay of a leader, a pin and the members of an aggregate: it holds a light line on any ground. On the day ground it is the paper colour, so the dark line colours hold. |
| `color.union.fill` | `#2d6bc4` | Union cell: the side, when the keyframe is fresh. White glyph on it: 4.9:1 or better. |
| `color.union.old` | `#56657a` | Union cell once its keyframe is a whole battle day old: the same hue washed toward grey (the one provisional device). |
| `color.union.ink` | `#7db1f7` | Union as a line colour on the ground: pin, leader, the members of an aggregate. |
| `color.confederate.fill` | `#c4411d` | Confederate cell, fresh keyframe. White glyph on it: 4.9:1 or better. |
| `color.confederate.old` | `#8c5a4b` | Confederate cell once its keyframe is a whole battle day old. |
| `color.confederate.ink` | `#f28b5f` | Confederate as a line colour on the ground. |
| `color.contested.fill` | `#c99a1e` | Ochre cell of a unit whose side the data cannot settle (the id prefix and the state code disagree). Never a side colour. |
| `color.contested.old` | `#988548` | Contested cell once its keyframe is a whole day old. |
| `color.contested.ink` | `#e8c44f` | Contested as a line colour on the ground. |
| `color.contested.glyph` | `#161106` | Glyph ink on the ochre cell (dark: white would not reach 4.5:1 on ochre). |
| `color.contested.hatch` | `#161106` | Hatching of the contested cell. |

**Size and grid**

| token | value | what it does |
| --- | :--- | :--- |
| `size.plate.unit` | `20` px (layout) | Height of the plate of a regiment, battery or battalion; the cell is a square of the same side. 11 px type. |
| `size.plate.brigade` | `22` px (layout) | Plate height of a brigade record (formation tier, 13 px type). |
| `size.plate.division` | `24` px (layout) | Plate height of a division record. |
| `size.plate.corps` | `26` px (layout) | Plate height of a corps record. |
| `size.plate.agg` | `24` px (layout) | Plate height of an aggregate (the formation mark a crowd merges into). |
| `size.tab` | `10` px (layout) | Height of the tab above a formation, which carries the echelon marks (II, X, XX, XXX) the way APP-6 puts them above the frame. |
| `size.stack` | `3` px (layout) | Offset of the plate behind an aggregate: more than one record. |
| `size.padL` | `6` px (layout) | Space between the cell and the code. |
| `size.padR` | `7` px (layout) | Space after the last character of the mark. |
| `size.tailGap` | `6` px (layout) | Space between the code and its tail (the count of an aggregate). |

**Type**

| token | value | what it does |
| --- | :--- | :--- |
| `type.small` | `11` px (layout) | The small type size: unit codes, tails, secondary text. 11 px is the floor of the language. |
| `type.large` | `13` px (layout) | The large type size: formation marks and the primary text of every card. There is no third size. |

**Strength gauge**

| token | value | what it does |
| --- | :--- | :--- |
| `gauge.h` | `3` px (layout) | Thickness of the strength gauge: the foot of the plate, flush with its edges. |
| `gauge.segments` | `4` | Ticks of the strength gauge at the quartiles: it reads as a state and not as a measurement. |

**Shape**

| token | value | what it does |
| --- | :--- | :--- |
| `shape.radius` | `3` px | Corner radius of every mark, ring and card: the one radius of the language. |
| `shape.hatch` | `4` px | Pitch of the hatching on a contested cell. |

**Symbols**

| token | value | what it does |
| --- | :--- | :--- |
| `glyph.stroke` | `1.6` px | Stroke of the arm symbols and the echelon marks. |

**Opacity**

| token | value | what it does |
| --- | :--- | :--- |
| `alpha.keyline` | `0.55` | Opacity of the keyline. |
| `alpha.keylineHover` | `0.9` | Opacity of the keyline under the pointer. |
| `alpha.track` | `0.2` | Opacity of the empty part of the strength gauge. |
| `alpha.gauge` | `0.92` | Opacity of the filled part of the strength gauge. |
| `alpha.leader` | `0.95` | Opacity of the leader line of a displaced mark. |
| `alpha.leaderUnder` | `0.4` | Opacity of the dark underlay of a leader. |

**Name form**

| token | value | what it does |
| --- | :--- | :--- |
| `form.nameZoom` | `16` (layout) | Zoom from which a mark grows from its code to the unit's full name (the same object, wider). Below it only the selected mark is grown. |
| `form.nameHyst` | `0.2` (layout) | Hysteresis of that threshold in zoom steps: a camera that rests on the threshold does not flicker between forms. |
| `form.nameOnSelect` | `true` (layout) | The selected mark always grows to its full name, whatever the zoom (the layout makes room for it). |

**Motion**

| token | value | what it does |
| --- | :--- | :--- |
| `motion.selectMs` | `140` ms | Ease of the selection ring. |
| `motion.hoverMs` | `80` ms | Ease of the hover response. |
| `motion.growMs` | `180` ms | Cross-fade of the code into the full name while a mark grows. |

**Variants** (each is a set of overrides of the table above)

| variant | ground | overrides |
| --- | :--- | :--- |
| `d3/day` (Day (paper ground)) | `real-fmday` | `color.plate` #fbf8f0, `color.plateHover` #ece6d6, `color.keyline` #10161d, `color.text` #0f1720, `color.textMuted` #4a5663, `color.ringLight` #ffffff, `color.ringDark` #10161d, `color.union.ink` #1f55a6, `color.confederate.ink` #b03512, `color.contested.ink` #8a6508, `alpha.keyline` 0.7, `alpha.keylineHover` 0.95, `color.underlay` #fbf8f0 |
| `d3/cvd` (Colour-blind safe) | `real-fm` | `color.union.fill` #0072b2, `color.union.old` #5d6f7f, `color.union.ink` #6fb7e8, `color.confederate.fill` #c25400, `color.confederate.old` #8a6040, `color.confederate.ink` #f5a05a |
| `d3/contrast` (High contrast) | `real-fm` | `color.plate` #000000, `color.plateHover` #1f1f1f, `color.text` #ffffff, `color.textMuted` #d4d4d4, `alpha.keyline` 0.8, `alpha.keylineHover` 1, `alpha.track` 0.35, `color.union.fill` #00479b, `color.union.old` #586a82, `color.confederate.fill` #a83000, `color.confederate.old` #7a4b3c |
<!--/T:tokens-->

**Tests** (`tools/contrast.mjs`, no browser; colour maths of `docs/pitch/anim2/symbology/src/colour.mjs`). Bars: 4.5:1 for text and for a symbol on its cell (WCAG 1.4.3), 3:1 for a boundary and a line (WCAG 1.4.11), CIEDE2000 of 20 between the armies' fresh cells and 12 between the washed ones and between a fresh cell and its washed twin (this project's own bars, not WCAG numbers). The boundary of a plate is tested on every grey ground from black to white, taking the better of the plate itself and its keyline: that test **failed at the first keyline opacity (0.34: 2.35:1 on a grey of 82)** and set the present one (0.55, 3.06:1 at the worst grey). Four more kinds of check failed on the first tokens (the contested cell a day old, the fresh against the washed Union cell, the day variant line colours on a dark underlay, the day signal and faint inks on a darker panel) and were fixed; see `ITERATIONS.md`.

<!--T:contrast-->
| set of tokens | checks passed | weakest check (ratio against its bar) |
| --- | :--- | :--- |
| marks / standard | 23 of 23 | plate boundary on the worst grey ground (plate or keyline): 3.06 against 3 |
| marks / day | 23 of 23 | union: fresh vs a day old cell (the provisional device is visible): 12.3 against 12 |
| marks / cvd | 23 of 23 | plate boundary on the worst grey ground (plate or keyline): 3.06 against 3 |
| marks / contrast | 23 of 23 | arm symbol on contested cell, a day old: 5.18 against 4.5 |
| interface / night | 22 of 22 | --faint on --panel3: 5.09 against 4.5 |
| interface / day | 22 of 22 | --faint on --panel3: 4.64 against 4.5 |

Every check of the night set (`marks / standard`), as computed:

| check | ratio | bar |
| --- | ---: | ---: |
| code on plate (color.text on color.plate) | 16.94 | 4.5 |
| code on plate (hover, selected) | 14.14 | 4.5 |
| tail (muted) on plate | 8.82 | 4.5 |
| tail (muted) on plate (hover) | 7.36 | 4.5 |
| arm symbol on union cell, fresh | 5.23 | 4.5 |
| arm symbol on union cell, a day old | 5.94 | 4.5 |
| union line colour on its underlay (pin, leader) | 9.08 | 3 |
| arm symbol on confederate cell, fresh | 5.1 | 4.5 |
| arm symbol on confederate cell, a day old | 5.71 | 4.5 |
| confederate line colour on its underlay (pin, leader) | 8.25 | 3 |
| arm symbol on contested cell, fresh | 7.27 | 4.5 |
| arm symbol on contested cell, a day old | 5.18 | 4.5 |
| plate boundary on the worst grey ground (plate or keyline) (worst ground: grey 99) | 3.06 | 3 |
| Union vs Confederate cell, fresh, normal (CIEDE2000) | 45.78 | 20 |
| Union vs Confederate cell, a day old, normal (CIEDE2000; the washed colours are closer by design) | 26.69 | 12 |
| Union vs Confederate cell, fresh, protanopia (CIEDE2000) | 50.46 | 20 |
| Union vs Confederate cell, a day old, protanopia (CIEDE2000; the washed colours are closer by design) | 21.89 | 12 |
| Union vs Confederate cell, fresh, deuteranopia (CIEDE2000) | 55.88 | 20 |
| Union vs Confederate cell, a day old, deuteranopia (CIEDE2000; the washed colours are closer by design) | 26.39 | 12 |
| Union vs Confederate cell, fresh, tritanopia (CIEDE2000) | 65.59 | 20 |
| Union vs Confederate cell, a day old, tritanopia (CIEDE2000; the washed colours are closer by design) | 35.08 | 12 |
| union: fresh vs a day old cell (the provisional device is visible) (CIEDE2000) | 12.3 | 12 |
| confederate: fresh vs a day old cell (the provisional device is visible) (CIEDE2000) | 14.47 | 12 |
<!--/T:contrast-->

The two armies' fresh cells have almost the **same luminance** (1.04:1: a blue and a vermilion chosen for hue, as Okabe and Ito do). That is why the position of the cell carries the side as well: in greyscale the cells are the same grey, and the left or right of the cell still says which army (`shots/cvd-simulation.png`). The colour-vision simulation is the Machado, Oliveira and Fernandes (2009) matrices at severity 1.0 on linear sRGB, a software simulation and not a test with people.

## 6. States

| state | what changes | how (token or constant) |
|---|---|---|
| fresh | full side colour in the cell | latest keyframe under 112.5 ticks old |
| carried forward | the cell's hue washed toward grey, continuously | between 112.5 and 225 ticks, `color.<side>.old` |
| hover | the plate lightens (`color.plateHover`), the keyline brightens (`alpha.keylineHover`) | eased, `motion.hoverMs` 80 ms |
| selected | the plate lightens, the dual ring (1 px light inside, 1 px dark outside) fills the 2 px band, the mark grows to its name, the layout makes room first | eased, `motion.selectMs` 140 ms |
| arriving | the keyline first, then the cell's ink, then the type; the mark grows from 88 % of its size | the engine's fade 220 ms, `motion.birthScale` 0.88; ink in over the progress 0.15 to 0.7, type 0.4 to 1 |
| leaving | the same, backwards, with the engine's fade | 220 ms |
| growing to a name | the plate widens, the code fades out, then the name fades in (never both) | the engine's size glide (time constant 60 ms), `motion.growMs` 180 ms, code out over the first 40 %, name in from 40 to 90 % |
| displaced | a pin on the true position, a leader under the marks; the pin fades while it would lie under its own mark | the kit's `pinFade`; leader 1 px over a 3 px underlay |
| travelling | the engine's dimmed glide (opacity 0.42) when a mark must cross a neighbour | `motion.travelPx` 24, unchanged |
| aggregate hovered | the true positions of its records appear as small dots | `scene.hulls`, drawn only for the hovered stack |
| unknown identity | the code is underlined | 1 px |

## 7. Formation marks: how a crowd is said

When marks cannot stand clear of each other the layout engine merges them (it never drops one: unchanged and measured in section 12). A stack is the formation tier's own look: a taller plate, 13 px type, the stack edge, and, when its records share a brigade, division or corps, the tab with that formation's echelon marks. It says: **whose** (the cell: Union left, Confederate right, split for both, hatched for a contested one), **what** (the arm symbol when all its records share one, the formation's tab when they share one), **which** (the code of the formation, or of the lead unit), **how many** (the tail). Hovering a stack opens its tooltip (the first names, "records, never men") and shows the true positions of its records; clicking it selects nothing (a stack is not a unit) and opens the inspector.

At the whole-field zoom the field is mostly stacks: **at 13.5 only about 14 % of the units stand as themselves, the rest are inside 55 stacks** (table in section 12). That is the engine's certified layout at this footprint, not a design preference; the experiment that gave the plates 2 px less breathing room is in section 12 too.

## 8. Motion

One curve family, three durations. The engine's own motion (the continuous clock, monotone cubic interpolation between keyframes, the critically damped glide of every displaced mark, pushing, sequenced fades for merges and splits, the safety net that dims a mark rather than overlap) is the prototype's and is not changed; its guarantees are re-measured on this skin in section 12.

| motion | curve | duration | source |
|---|---|---|---|
| a mark moves to its solved place | critically damped (no overshoot) | time constant 110 ms | engine `motion.smoothMs` |
| a mark's footprint changes (grows to a name) | critically damped | time constant 60 ms (about 250 ms to 90 %) | engine display layer |
| arrival and departure | smooth S-curve of opacity, scale 0.88 to 1 | 220 ms | engine `motion.fadeMs`, `motion.birthScale` |
| hover, selection | critically damped | 80 ms, 140 ms | skin `motion.hoverMs`, `motion.selectMs` |
| code to name | two sequential fades | 180 ms | skin `motion.growMs` |
| a card arrives | ease-out `cubic-bezier(.2, .8, .2, 1)`, rises 4 px | 200 ms | `popup.motion.enterMs`, `risePx` |
| a card leaves | ease-in `cubic-bezier(.4, 0, 1, 1)` | 140 ms | `popup.motion.exitMs` |
| a card whose place is taken | fades out where it was (110 ms), fades in at its new place (200 ms); it never glides across the map | | `popup.motion.moveOutMs`, `moveInMs` |
| the leader of a card | draws itself from the card to the mark | 200 ms | `popup.motion.leaderMs` |
| the subject ring pulse | grows and fades once | 700 ms | `popup.motion.pulseMs` |
| interface hover and press | background and colour | 120 ms; panels 200 ms; entrances 320 ms | `--dur1`, `--dur2`, `--dur3` of `fm.css` |
| reduced motion | fades 120 ms, no movement, the layout as solved | | `motion.reduced` (follows the system) |

**Measured** (`tools/strips.mjs` and `tools/zoom-test.mjs`, results in `results/motion.json` and `results/zoom-test.json`; one machine, headless Chrome 155):

* **Arrival** (`shots/M1-deployment.png`): five regiments that take the field at tick 48, one frame every 33 ms: scale 0.882, 0.896, 0.919, 0.945, 0.971, 0.991, 1.0 and opacity 0.016, 0.131, 0.322, 0.545, 0.761, 0.926, 0.999: the arrival is over in about 200 ms and ends without a step.
* **March** (`shots/M2-march.png`): the 53rd Virginia on its way to The Angle, eight consecutive frames at 16 times: the step per frame rises 1.09, 2.07, 3.19, 4.39, 5.66, 6.93, 8.30 px from rest (a smooth ramp, no jump) and eases to 5.7 and 5.0 px as the keyframe segment ends.
* **Growing to a name** (`shots/M3-grow.png`): the selected mark's width over eight frames, 50 ms apart, rises on a decelerating curve (69, 89, 104, 114, 122, 127, 131, 133 px) and settles within 350 ms; the type is revealed as the plate widens and never drawn over the cell. The layout reserves the grown footprint first, so a neighbour in the way moves before the plate arrives (in this run none was in the way).
* **A camera glide across the zoom at which every mark grows to its name** (15.2 to 16.8, 240 frames), against a control that does not cross it:

<!--T:zoom-->
| camera glide | overlap frames | units unrepresented (frames) | pops per s | teleports per s | largest excess over the unit's own motion (px) | sudden solid jumps per s | jerk p99 (px/frame^2) |
| --- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| across the name zoom (15.2 to 16.8) | 0 | 0 | 1.75 | 0 | 6.84 | 0 | 0.1761 |
| control, no form change (14.2 to 15.0) | 0 | 0 | 0 | 0 | 2.83 | 0 | 0.2003 |
| across, at Cemetery Hill (15.2 to 16.8) | 0 | 0 | 2.75 | 0 | 6.71 | 0 | 0.1823 |
<!--/T:zoom-->

  Across the threshold there are no overlaps, no unit unrepresented and no teleport (a step of more than 12 px beyond the unit's own motion); there are about two "pops" a second (a mark moving more than 3 px beyond its unit's own motion in one frame, 6.8 px at most) that the control does not have: the cost of every plate changing size at once. It is not zero activity and is reported as measured.

## 9. Popups and the chrome

Every popup of the prototype is kept, with its content, its evidence labels and its purpose, and restyled **by one stylesheet** (`engine/ui/fm.css`, which replaces the prototype's `studio.css` and `popups.css` selector for selector) and a handful of small changes in the content model's renderer. A card is anchored to what it describes by the Overlay Director (unchanged): it is placed on free ground beside its subject, joined by a hairline leader drawn under the marks, and never covers a mark, a pin, the interface or another card (re-checked on every frame by the director, and in every scene here: the "cards over marks" column in section 12 is 0).

**Card anatomy**: an opaque plate (`--panel`), a 1 px hairline (`--line2`), a 2 px rule in the tone colour on the top edge, radius 3 px, no shadow, no blur. Kicker: 11 px bold capitals, +0.08 em, in the tone ink, with the tone's shape (star, dot, diamond, quote, cross, plus, flag ...) as the second cue after colour. Title: 13 px FM Serif Bold. Body: 13 px FM Sans Regular. Metadata: 11 px, muted. Evidence labels: 11 px bold capitals in a 1 px rectangle in the label's colour. Tones: one signal colour (amber) for the top tier, amber at 72 % for the second, ink for the rest; the two armies' colours only on unit cards. Buttons: 28 px high, 11 px capitals; the primary one is the signal colour, the others a hairline.

| popup (module) | what it shows | restyle and change |
|---|---|---|
| event card (`event-card`) | the chronology sentence, place, the units it names, the clock line | the card above; text verbatim from the data |
| story card (`story-card`) | title, summary, read time, units; the whole script in the rail | serif title, 13 px sans body; the rail is the reading surface |
| command toast, cross-out (`command-toast`, `command-crossout`) | who, what happened, the old commander struck through, the successor | the strike-through is a 1.5 px line in the text colour; no coloured bar |
| unit card, hover tooltip (`unit-card`) | name, side, strength (a 3 px bar, Modelled), commander, key action; the tooltip a smaller form; the whole panel in the rail | kicker in the army's ink; the bar is flat ink; every row keeps its evidence label |
| tour (`tour`) | the 16 stops | unchanged content, the rail |
| day banner (`day-banner`) | "Day 3, July 3, 1863", the tick range, the candidate-clock chip | centred, a 2 px rule, 13 px serif; no larger size |
| clock (`clock-hud`) | date, "about 3:35 PM", the uncertainty, the speed, a ring for the day's progress | the ring is a 3 px stroke in the text colour, butt caps |
| legend (`legend`) | the active skin's own legend, 23 rows | **moved**: a pill in a corner that steps aside for a mark; it opens in the reading rail, because 23 true-size marks (124 x 40 px swatches each, the real marks) do not fit on free ground. Texts shortened to a few words; each row keeps its evidence label |
| overview (`minimap`) | every mark, the camera box, click to fly | flat, hairline; marks in the armies' colours |
| hints (`hints`) | four one-time hints, the key list | the card above |
| Chronicle (`chronicle`) | every moment so far, Go to, Reopen | the rail; the strip moved into the transport row of the dock (one row fewer) |
| narration, welcome (`ui/narration.mjs`) | tour captions, the measured results table, the welcome | the card above with a 2 px signal rule; the table has hairline rows |

Note on `P4`: its figures (and a frame rate of 40 fps) come from a page stepped by hand at 25 ms a frame, which is how every picture here is made; in the live page the same card prints what the machine measured.

The chrome: a flat **bar** 40 px high (clock, style and variant, Before / After, Showcase, the popup buttons, the tools), the segmented controls with a 2 px signal underline for the selected one, one hairline between groups; the **dock** (transport, speeds, the Chronicle strip, a scrubber 30 px high drawn in the language's ink with the events as ticks below the day labels, and the honesty row: Modelled positions, Modelled candidate clock, Measured ground and the sentence that it is a 2022 photograph and not the 1863 landscape); the **panel** (Tune, Inspect, About) with hairline rows and signal values; the **menu**; the **metrics** overlay and the Before badge. The honesty texts that said "schematic backdrop" and "no network request" were rewritten, because the first is no longer true of the ground and the second is no longer true of the page (the aerial tiles load as files, from the local folder).

## 10. What is Documented, Measured, Computed, Modelled, Contested, Unknown in every encoding

| encoding | label | basis |
|---|---|---|
| side: hue and the position of the cell | Documented | order of battle, or the id prefix for ids it does not list |
| side of 10 units | Contested | the id prefix and the state code in the id disagree; hatched ochre, never a side |
| a stack with both sides (Contact) | Computed | the split cell |
| arm symbol of a regiment, battery, battalion | Documented | registry arm (255 of the 326 non-formation placed units from the registry, 71 from the id: symbology README, section 3) |
| no arm on a brigade, division, corps record | Documented (as an absence) | the data gives a formation no arm |
| echelon tab | Documented | registry kind; on a stack Computed (the lowest common ancestor of its records) |
| code | Documented | derived from the id and the order of battle |
| underlined code | Unknown | 95 of 478 units have no complete order-of-battle parent |
| full name (the grown form) | Documented | the designation of the order of battle |
| strength gauge | Modelled | a keyframe's placement strength over the unit's reference strength; not a casualty record |
| the wash of the cell | Computed | the age of the latest keyframe in ticks (112.5 to 225) |
| a mark's place on the ground | Modelled | hand-authored keyframes, interpolated between them; there is no basis field |
| pin and leader | Computed | the displacement the layout needed |
| stack count | Computed | records, never men |
| disposition (charging, retreat, march ...) | Modelled | not drawn on the map (the quiet rule); in the unit card and the tooltip, labelled |
| place names | Modelled | the production `terrain.json`, hills moved to the DEM's summits (a filled dot: Measured) |
| the ground | Measured, and modern | USGS NAIP photographed 24 April to 10 May 2022, leaf-off, not the 1863 landscape; the caption stays on screen |
| the clock | Modelled | a candidate: 33 anchors, all proposed, none reviewed |

## 11. Extending it

The look is **data plus one module**; nothing below needs a change to the engine.

* **Change a colour, a size, a duration**: edit a row of `tokens/d3.skin.tokens.json`, run `node build.mjs`, reload. Live, without a build: `?skinset={"d3":{"color.union.fill":"#2d6bc4"}}` (values are validated against the token's own range). A token marked `(layout)` sizes the footprint the layout engine reserves and only takes effect after a rebuild, because a footprint that changed while the page ran would break the guarantee.
* **Add a variant** (another palette): add an entry under `variants` with the overrides, and a line in `engine/styles/index.mjs` (`VARIANTS`) for the switcher; the family builder registers `d3/<name>` and the legend follows.
* **Add a ground look**: `registerLook({...})` of the basemap (see its README, section 11); `engine/builtins.mjs` registers `fm` and `fmday` and shows how.
* **Add a mark**: a new arm or echelon is a case in `armGlyph` / `echelonTab` and a row in `semantics.mjs` (`CHANNELS`, which the legend reads); the footprint follows `layoutOf`.
* **Add a popup**: copy `engine/popups/_template.mjs`, add it to `engine/popups/index.mjs`; it inherits this stylesheet through the content model (kicker, title, p, meta, chips, bar, kv, list, actions ...).
* **Restyle a popup**: every colour, size and radius is a variable at the top of `fm.css`; the type scale is `--fs-s` and `--fs-l`.
* **Add an engine dial**: `tools/patch-tokens.mjs` lists every change to `tokens/tokens.json` with its reason; add a row there (or edit the JSON), `node tokens/make-schema.mjs`, `node build.mjs`.

Files: `README.md` (how to run), `FORK.md` (every change to the prototype's engine), `tools/` (every script), `results/` (every number).

## 12. Verification

Everything below was run by the scripts named in `README.md`, in real Chrome 155 (headless, Windows, one machine), against the built page. "Cores overlapping" is an independent brute-force check of the frame the page drew (it shares no code with the engine): the whole mark, every channel of which lives inside its box, against every other mark; "the engine's verifier" is the prototype's, run on every displayed frame.

**The scenes of this document** (`tools/shoot.mjs`, `results/scenes.json`):

<!--T:scenes-->
| scene | view, tick | units | marks | stacks (units inside) | cores overlapping | pins covered | units unrepresented | names under marks | ink outside footprint | engine overlaps | cards over marks |
| --- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| S1a field z13.5 t551 | 1440x900, z13.5, tick 551 | 451 | 121 | 55 (385) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S1b day3 assault the angle z13.5 t556 | 1440x900, z13.5, tick 556 | 456 | 119 | 65 (402) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S2 wheatfield rose woods z15 t295 | 1440x900, z15, tick 295 | 344 | 268 | 26 (102) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S3 cemetery hill z15.5 t346 | 1440x900, z15.5, tick 346 | 385 | 346 | 21 (60) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S4 closeup z16.5 selected inspect | 1440x900, z16.5, tick 551 | 451 | 411 | 31 (71) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S4b closeup z16.5 selected details rail | 1440x900, z16.5, tick 551 | 451 | 411 | 31 (71) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S5 phone z14.5 sheet | 390x844, z14.5, tick 551 | 451 | 257 | 53 (247) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S6 event and story in situ herbst woods t28 | 1440x900, z14.5, tick 28 | 88 | 82 | 3 (9) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S7 legend | 1440x900, z15, tick 551 | 451 | 328 | 42 (165) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S8 hover tooltip | 1440x900, z16, tick 551 | 451 | 370 | 57 (138) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| V1 variant day cemetery hill z15.5 t346 | 1440x900, z15.5, tick 346 | 385 | 346 | 21 (60) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| V2 variant colour blind safe the angle z14.5 t556 | 1440x900, z14.5, tick 556 | 456 | 264 | 56 (248) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| V3 variant high contrast the angle z14.5 t556 | 1440x900, z14.5, tick 556 | 456 | 264 | 56 (248) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
<!--/T:scenes-->

**Sweeps** (`tools/sweep.mjs`): a ladder of zooms by 14 ticks (the hotspots, the densest tick, the three days), the camera centred on the densest part of the field from zoom 14, a settled frame each:

<!--T:sweeps-->
| sweep | samples (zoom x tick) | engine frames checked | worst: cores overlapping | pins covered | units unrepresented | names under marks | ink outside footprint | engine overlap frames | smallest gap between two footprints (px) | engine clearance counter (pairs closer than 1.95 px in motion) |
| --- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| desktop 1440 x 900, DPR 1, schematic ground | 126 | 11,473 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 344 |
| phone 390 x 844, DPR 2, schematic ground | 98 | 9,420 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 297 |
| desktop 1440 x 900, DPR 1, the real aerial ground | 18 | 2,001 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 64 |
<!--/T:sweeps-->

<!--T:sweepZoom-->
| zoom | samples | most marks | most stacks | most marks grown to a name | samples with a violation |
| --- | ---: | ---: | ---: | ---: | ---: |
| 11 | 14 | 16 | 11 | 0 | 0 |
| 12 | 14 | 31 | 26 | 0 | 0 |
| 13 | 14 | 81 | 50 | 0 | 0 |
| 13.5 | 14 | 132 | 64 | 0 | 0 |
| 14 | 14 | 204 | 65 | 0 | 0 |
| 15 | 14 | 346 | 52 | 0 | 0 |
| 16 | 14 | 394 | 64 | 334 | 0 |
| 17 | 14 | 450 | 26 | 426 | 0 |
| 18 | 14 | 468 | 11 | 460 | 0 |
<!--/T:sweepZoom-->

The last column of the first table counts, in the engine's own verifier, pairs of footprints that were closer than the 2 px design clearance for a frame **while marks were in motion**; none of them overlaps (the overlap columns are 0), and the prototype reported the same effect (0.2 to 1.0 such pairs a frame). At rest the smallest gap between two footprints is exactly the clearance, 2 px.

**What the marks measure on the real data** (footprints in CSS px at 1x, including the 2 px band on every side):

<!--T:marks-->
| zoom, tick | units on the field | marks | units as themselves | units inside stacks (stacks) | share as themselves | unit mark footprint w x h (min / median / max) | marks grown to a name |
| --- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 13.5, 551 | 451 | 121 | 66 | 385 (55) | 14.6 % | 59 / 64 / 87 x 24 / 24 / 24 | 0 |
| 13.5, 620 | 478 | 127 | 67 | 411 (60) | 14.0 % | 59 / 64 / 87 x 24 / 24 / 24 | 0 |
| 15, 551 | 451 | 312 | 272 | 179 (40) | 60.3 % | 51 / 65 / 93 x 24 / 24 / 34 | 0 |
| 15, 295 | 344 | 268 | 242 | 102 (26) | 70.3 % | 54 / 65 / 93 x 24 / 24 / 24 | 0 |
| 16.5, 551 | 451 | 411 | 378 | 73 (33) | 83.8 % | 55 / 151 / 338 x 24 / 24 / 34 | 378 |
<!--/T:marks-->

**The 2 px clearance between footprints** (`tools/gap-experiment.mjs`): the footprint already carries the selection band, so two plates stand 6 px apart at the default `layout.gapPx` 2 and 4 px apart (the module) at 0. Giving the plates the 2 px back buys a little density and costs breathing room; the default stays at 2 and the choice is the owner's.

<!--T:gap-->
| layout.gapPx | zoom, tick | marks | stacks | units inside stacks | units as themselves | cores overlapping |
| --- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | 13.5, 551 | 121 | 55 | 385 | 14.6 % | 0 |
| 2 | 15, 551 | 316 | 40 | 175 | 61.2 % | 0 |
| 2 | 15, 295 | 268 | 26 | 102 | 70.3 % | 0 |
| 1 | 13.5, 551 | 123 | 64 | 392 | 13.1 % | 0 |
| 1 | 15, 551 | 330 | 40 | 161 | 64.3 % | 0 |
| 1 | 15, 295 | 280 | 21 | 85 | 75.3 % | 0 |
| 0 | 13.5, 551 | 133 | 59 | 377 | 16.4 % | 0 |
| 0 | 15, 551 | 328 | 38 | 161 | 64.3 % | 0 |
| 0 | 15, 295 | 283 | 21 | 82 | 76.2 % | 0 |
<!--/T:gap-->

**Real time** (`tools/perf.mjs`; the page's own animation loop, DPR 2, the real aerial ground; the CPU slowdown throttles JavaScript, not the GPU, and stands in for a phone):

<!--T:perf-->
| case (real time, 8 s each) | frames per second | frame interval p95 (ms) | frames over 20 ms | renderer ms per frame (mean) | marks | frames with an overlap | sudden solid jumps per s |
| --- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| field-z13.5-4x | 60.0 | 16.8 | 0 % | 2.33 | 133 | 0 | 0 |
| angle-z15-4x | 60.0 | 16.8 | 0 % | 1.39 | 315 | 0 | 0 |
| angle-z16.5-1x (named marks) | 60.0 | 16.8 | 0 % | 0.66 | 428 | 0 | 0.249 |
| angle-z15-4x, CPU 4x slower | 20.7 | 99.9 | 95.8 % | 12.34 | 331 | 0 | 0.617 |
| phone angle-z14.5-4x (390x844, DPR 2) | 60.0 | 16.8 | 0 % | 0.79 | 240 | 0 | 0 |
| phone angle-z14.5-4x, CPU 4x slower | 38.8 | 50.0 | 43.7 % | 4.54 | 244 | 0 | 0.248 |
<!--/T:perf-->

## 13. Limits, decisions for the owner, and a self-assessment

**Not verified**

* One machine, one GPU, headless Chrome 155. No real phone (the phone figures are a 390 x 844 viewport with touch and DPR 2, and a CPU throttle), no Safari, no Firefox (the basemap's tiles are AVIF).
* **Fonts.** The five font files were made from the copies that Adobe Acrobat DC installs on this machine; each file's own name table says SIL OFL 1.1, Copyright Adobe, Reserved Font Name "Source". Whether those copies are byte-identical to Adobe's upstream release was **not checked**. No font was downloaded: a download needs the owner's approval, and none was needed. `fonts/OFL.txt` carries the licence text, copied from the one inside the installed `fontTools` package.
* The colour-vision check is a software simulation; the CIEDE2000 bars are this project's own; nobody with colour-vision deficiency looked at it. No screen-reader test.
* The APP-6 conventions (echelon marks above the frame, a frame of unspecified function) come from secondary sources (the symbology folder's README), not from the standard.
* No designer has reviewed it. I looked at every picture at 100 percent and fixed what I saw (`ITERATIONS.md`); whether it meets the owner's bar is the owner's call.
* The day, colour-blind-safe and high-contrast sets were tested by the contrast script and looked at once each (`V1` to `V3`), not swept like the night set.
* The aerial is modern and leaf-off; the unit placements were authored in an older frame that puts some places up to 733 m elsewhere (basemap README, section 8), so on this ground some groups stand away from where the photograph shows their place. The About tab says so.
* **Marks at the edge of the map.** The bar and the dock cover the outer 40 px and about 120 px of the map; a mark under them is at the edge of the viewport, like a mark half off the screen. The camera frames scenes in the free area; no mark is moved because of the interface.
* Under a 4x CPU slowdown the page runs at 18 to 39 frames a second in dense scenes (two runs: 17.9 and 20.7 on the desktop viewport, 27.1 and 38.8 on the phone viewport): the layout and display engine dominate (the prototype measured the same order). The sprite cache that would help the drawing was not built; it would not help the engine.
* The Before view still draws the prototype's reproduction of the shipped tiles (that is its purpose); it is not restyled.

**Decisions that are the owner's**

1. **D1 Mirrored cells.** A Confederate mark has its cell on the right. It adds a second, hue-independent cue for the side and makes the two armies face each other; it costs the identical left-to-right scan of every code. The alternative (every cell on the left) leaves the side to hue alone, which in greyscale is 1.04:1.
2. **D2 Two type sizes.** 11 and 13 px, nothing larger: titles, the banner and the welcome headline are 13 px serif bold. It is calm and consistent and it is flatter than the prototype's 24 px headline.
3. **D3 The name form at zoom 16.** Below it a mark says its code; at and above it, its name. A lower threshold shows names sooner and merges more marks into stacks.
4. **D4 The keyline at 0.55.** Chosen by the boundary test (3:1 on any grey ground); a fainter keyline looks calmer and fails on mid-grey ground.
5. **D5 The legend opens in the rail**, not on the map: 23 true-size marks need a reading surface.
6. **D6 The ground is annotated in the serif**, the marks are set in the sans; the dashed ring of two doubtful places remains, because it is the ground's own device.
7. **D7 Plates 4 or 6 px apart** (`layout.gapPx`, section 12).
8. **D8 Dispositions are not on the map** (charging, retreat, march ...: Modelled, hand-authored per keyframe); they are in the card and the tooltip. Showing them on the plate would add a badge or a glyph the quiet rule forbids.

**The five strongest things of this result, and the five weakest** are in the final report of the run that wrote this folder and are repeated at the end of `ITERATIONS.md`.
