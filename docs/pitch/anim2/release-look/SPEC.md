# The battle-map look: two options, specified

Two static looks for the Battle Studio, built as one fork of the first-round engine (`docs/pitch/anim2/d1-quiet-cartographer`, the working tree of 2026-10-12, which is itself the prototype engine of `docs/pitch/anim/prototype`), on the real aerial of `docs/pitch/anim2/basemap`. Nothing outside `docs/pitch/anim2/release-look/` and `tmp/look/` was written. No engine work was done for motion: the pictures are stills of the engine's own settled frames, so every layout number below is the engine's own certified layout, not a drawing of it.

- **Option A, Standards** (`option-a-standards.html`): a planted standard per unit on the real aerial under one warm grade.
- **Option B, Glyph** (`option-b-glyph.html`): an editorial glyph per unit with direct haloed labels on a pale survey sheet.

Both pages are the same bundle (2.4 MB, readable, no network request); each opens on its own look, and the top bar's two-way switch (A "Field", B "Survey") flips the look at the same tick and camera, which is the quickest way to compare them. Open with `node tools/serve.mjs 9400` then `http://127.0.0.1:9400/release-look/option-a-standards.html` (or `option-b-glyph.html`); `?tune=1` opens every dial, `?skinset={"standards":{"pole.brigade":38}}` sets one token live.

What the owner called "dogshit" in the first prototype (two boxes per unit, no hierarchy, tiny text and badges, a blank grid ground, recolours of one layout) is answered point by point in section 1.

## 1. Rules both options obey

| Rule from the brief | How both options keep it | Where it is measured |
|---|---|---|
| One object per unit | One mark per unit: a standard (A) or a glyph (B), standing on the unit's true position (the foot of the pole, the centre of the glyph). No caption chip, no second box. The name is the same mark growing, not another box. | `test/skin-look.test.mjs` (every unit, six zooms: footprint holds the ink), `tools/inkfit.mjs` |
| At most three weights of hierarchy | Rank is carried by size alone (A: pole and flag height; B: glyph size and rings). Lettering has three weights, one per role: 400 (ground names), 600 (a unit's code, the numeral in a count), 700 (a formation's or crowd's words). | section 3 |
| At most two type sizes plus one numeral style | On the map: **12 px** (unit codes and names, numerals, ground names) and **13 px** (formation and crowd words). The one numeral style is the 12 px semibold with the face's tabular figures. The interface (cards, rails, bars) uses 11, 13 and 17 px. | `tools/audit.mjs` reads every visible text node of the interface in nine states |
| 11 px minimum text | Map lettering is never smaller than 12 px; the interface never smaller than 11 px. | audit: minimum 11 px in all nine states |
| 4.5:1 text contrast on the aerial | Lettering is set on a halo (dark on A's ground, white on B's); numerals stand on the cloth or body they are measured against. Measured on rendered pixels, section 9. | `tools/audit.mjs` |
| No dashed outlines, no tiny badges | Nothing is dashed. A hatched cloth or octagon marks only the 10 ids of unknown side. No badge: the arm is the end of the cloth (A) or one white stroke inside the glyph (B). | the legend figure of each option is drawn by the same code as the map |
| Real terrain under one grade | A: one warm, muted grade with soft relief, a little haze at the far top and a vignette (`src/ground.mjs`, look `look-a`). B: the aerial ghosted into cool white paper with crisp relief and thin contours (`look-b`). Both are recipes of the basemap's look loader, so the tile files are the basemap's own. | pictures |
| Crowds merge into a formation mark that still names what it stands for | A crowd of units that cannot stand clear of each other is ONE larger mark (A: a formation flag with the count on it; B: a stacked glyph with the count in it) and the words say what the units share ("1st, 2nd Corps + 3 cavalry", "Garnett's Bde", "both armies"). Never a raw id, never "of unknown side": the contested ones are counted as "2 contested". | `test/skin-look.test.mjs` (the words), `layout/tiles.mjs aggregateName` |
| No ghost tiles, no nudging of full marks | The engine's certified layout is unchanged: a mark that cannot stand clear merges in one frame; a displaced mark shows a pin and a hairline to its true place only while pointed at or selected. | scene checks, section 9 |
| A battle that remembers | The casualty memory, section 5. | `test/skin-look.test.mjs` (the data), pictures |
| Popups all kept and restyled in the same language | Section 6. | pictures in `shots/*/final/popups` |
| Extensible: skin module plus token JSON | Section 8. | `tokens/*.tokens.json` generated from the spec files |

## 2. Level of detail (the default settled by the brief)

| Zoom | A and B |
|---|---|
| below 12 | corps and crowds only name themselves from zoom 11 (a corps) and 12 (a crowd) |
| 12.5 to 15 (the opening is 13.5) | a unit is a **small side-and-arm mark** with no lettering (A: a 17 px pole and an 11 x 8 px flag; B: a 10 px glyph). Formations and crowds are full size and named (division from 12.5, brigade from 13). |
| 15 and above | a unit is a **full mark**: A a 25 px pole with its short code ON the flag (the flag is as long as the code needs) and the strength bar under it; B a 13 px glyph with its short code beside it and the strength gauge round it |
| 17 and above, or selected from 15 | the same mark **grows its full name** beside it |

Reduced motion is the engine's own (steps, no glides); rotation and tilt do not exist on the unit layer.

## 3. Option A, Standards

A planted standard: a slim cream pole on a foot (the unit's true place), a flag in the side's cloth flying from its top, a soft shadow on the ground (lit from the north-west like the relief). One object.

| Channel | Encoding | Evidence |
|---|---|---|
| side | the cloth (Union blue, Confederate vermilion) AND the way it flies: a Union flag flies right, a Confederate flag left, so the armies face each other and the side survives a grey print | Documented (order of battle); the 10 ids of unknown side are a pale hatched cloth, never a side colour: Contested |
| arm | the end of the cloth: a regiment square-ended, cavalry swallow-tailed (a guidon), artillery arrow-ended; a formation record makes no arm claim | Documented |
| rank | the pole and the flag together: unit 17 / 25 px, brigade 34, division 44, corps 56 px; flag 30 x 20, 38 x 26, 48 x 32 px | Documented (registry kind) |
| identity | from the full zoom the short code stands ON the cloth in white (ink on the glass of a hollow flag); an id-only unit is italic | Documented; Unknown for id-only |
| strength | a slim bar under a regiment flag from the full zoom: placement strength over the unit's reference | **Modelled**, and not a casualty record |
| fix a battle day old or more | the cloth hollows into tinted glass with a light edge (the hue stays: never grey) | Computed |
| crowd | a larger flag with the count on it, the words beside it | Computed (the count is placement records, never men) |
| selection / hover | a ring lying on the ground round the foot, in the side's light colour | Design |

Colour (all tokens, `src/skins/standards.spec.mjs`): union `#2b64c8`, confederate `#c63d1f` (white on them 5.6 and 5.1 to 1), cream pole and edge `#f2e9d0`, dark line `#0e0c08` at 88 %, ink `#f7f1e1` on a `#0e0c08` halo. Chrome (`src/ui/look-a.css`): warm smoked glass, cream ink, one brass hairline, 3 and 5 px corners, and a flag-tab on the left edge of every card in its own tone.

## 4. Option B, Glyph

An editorial small glyph standing on the unit's true place, with its words set straight on the sheet in a white halo. One object.

| Channel | Encoding | Evidence |
|---|---|---|
| side | the colour AND the shape family: Union a disc, Confederate a rounded square, unknown side a hatched grey octagon | Documented; Contested |
| arm | one white stroke inside the glyph: nothing for infantry, a slash for cavalry, a dot for artillery | Documented |
| rank | size and rings: unit 10 / 13 px; brigade 17 px with one ring, division 20 with two, corps 23 with three | Documented |
| strength | a gauge arc round a regiment glyph from the full zoom | **Modelled**, not a casualty record |
| fix a battle day old or more | the glyph hollows into pale glass in a heavy side-coloured outline | Computed |
| crowd | a stacked glyph (two layers behind) with the count in it, the words beside it | Computed |
| selection / hover | a ring round the glyph (and its gauge or rings) | Design |

Colour (`src/skins/glyph.spec.mjs`): union `#1d5bc2`, confederate `#c23d1b`, outline `#0f1826`, white under-edge, ink `#151b24` on a white halo. Chrome (`src/ui/look-b.css`): white paper, ink, a serif (Source Serif 4, embedded) for what is read (card titles, the clock, the day), thin rules instead of boxes (every card hangs from a 3 px rule in its tone), 2 and 4 px corners.

## 5. The battle remembers (both options)

Ground marks, drawn beneath every mark and label (so they can never cover anything vital) from the tick on which they fall and never removed. One mark stands for about ten men killed, wounded or missing (A: a fallen figure, a short bar with a head close up, in dark cloth colour with a pale edge; B: an ink cross).

| Quantity | Status | Source |
|---|---|---|
| the total a unit lost | **Documented, secondary** (the registry figure, killed + wounded + missing, as the repository ingested it from Busey and Martin and the Official Records) | `data/popup-data.json` `oob.cas` (from `data-src/build/unit_registry.json`) |
| the days a unit fought | Documented, secondary | `oob.days` |
| when inside a day the losses fell | **Modelled**: a bell curve (sigma 8 ticks, the file's own figure) over the corps period of that day; a unit that fought several days loses an equal share a day | `baseline/dist/data/casualty_apportionment.json` |
| where they fell | **Modelled**: at the unit's own interpolated position at that tick, scattered along a 45 m front | `data/dataset.json` keyframes |

`data/build-memory.mjs` builds `data/memory.json` (1,942 marks for 199 units, 66 KB). Of the 27,742 men the apportionment allots to the 217 units that have a figure and a fighting day, 19,420 (70 %) appear as marks: the rest fell at ticks at which the unit has no keyframe within 25 ticks, and a unit with no figure, no fighting day or no corps period leaves no mark rather than an invented one (71 units have no figure, 38 no fighting day; artillery batteries under no corps leave none). The legend, the minimap (faint dots) and this section say so; the unit card already carries the Documented total.

## 6. Popups, all kept and restyled

The structure, the content and the behaviour of every popup are the engine's, unchanged; the two stylesheets change only tokens (`:root` blocks) and a few signature details, so a card is the same object in both options and a designer can re-theme it from one block. Listed with the pictures that show them (`shots/*/final/` and `shots/*/final/popups/`):

| Popup | Pictures |
|---|---|
| event card, story card, command change, cross-out, toasts | `s6`, `s6b`, `popups/01` to `03`, `15` |
| unit inspect card and the tooltip (hover) | `s4`, `s8`, `popups/04`, `05`, `12` |
| day banner and clock | `popups/07` |
| narration (welcome, tour step) | `popups/09`, `10` |
| legend (drawn by the skin itself, so it cannot disagree with the map) | `s7`, `popups/21` |
| overview map (restyled: sides in the option's own colours, the ground marks as faint dots) | `s9` |
| Chronicle, menu, tuning panel, about | `popups/08`, `14`, `11`, `13` |
| phone: lane, bottom sheet (event, story, unit), legend, menu | `s5`, `popups/16` to `22` |

Placement is the engine's: a card is anchored on free ground and never over a mark, a label or a pin; the scene check counted 0 frames with a card over a tile in all scenes.

## 7. The words

One naming policy (`layout/words.mjs`, `layout/tiles.mjs`), changed in two places by this fork: a crowd's words no longer start with "of" (a Confederate mark reads its words first and the number second, so "of 3rd Corps 33" read wrongly) and a contested count says "contested" (the site's own evidence word) instead of "of unknown side"; and an artillery battalion or corps artillery brigade that is a node and no unit takes the order of battle's own designation ("Jones's Battalion", "2nd Corps artillery") where it used to print its raw id (`C-ART-II-3`).

## 8. Extending

An option is four files and one line each: a **skin module** (`src/skins/<name>.mjs`: `plan` for the footprint, `tile` for the drawing, `sample` and `figure` for the legend), its **token file** (`src/skins/<name>.spec.mjs`: one row per token with its documentation and range; a test fails on a token nobody reads), a **stylesheet** (`src/ui/look-<x>.css`) and a **ground** (a look in `src/ground.mjs`). Register the skin in `src/skins/index.mjs`, the style in `src/styles/index.mjs`, add it to the `OPTIONS` list of `build.mjs`, and `node build.mjs` writes the page and `tokens/<name>.tokens.json` (every token with its documentation and range, the colour-blind-safe and high-contrast sets, and the interface's own tokens). `common.mjs` holds what the two share (what a mark says, haloed lettering, the level-of-detail rule), so a third option is the drawing only. The tuning panel (`?tune=1`) exposes every engine dial; `?skinset=` and `__skinKit.setToken()` set a token live with its range checked.

## 9. What was measured, and with what

Everything below was produced by a command in this folder and is in `results/`. Chrome 155 headless, Windows 11, DPR 2, desktop 1440 x 900 and phone 390 x 844; the real aerial; the engine's own layout.

<!--AUDIT-->
(filled by `node tools/spec-fill.mjs`)
<!--/AUDIT-->

## 10. What is not known

- **Not seen on a real phone, in Safari or in Firefox.** The phone pictures are Chrome's 390 x 844 emulation at DPR 2.
- **The two armies differ in luminance by only 1.09 : 1 (A) and 1.20 : 1 (B)**; their colour difference is large (CIEDE2000 above 45 under normal vision and the three simulated deficiencies). The grey-print cue is geometric: the way a flag flies (A) and the shape family (B). It was simulated by computation, not tried by colour-blind readers.
- **Placement strength is a hand-authored number.** The bar (A) and the gauge (B) are labelled Modelled everywhere they appear and must not be read as losses.
- **Casualty marks cover 70 % of the modelled men** (section 5); their time and place are modelled; the totals are secondary-source figures. 255 units have a registry figure; 217 of them have a fighting day.
- **The opening view is dense.** At zoom 13.5 about 40 to 70 marks stand for 344 to 456 units: the rest are inside counted crowds. That is the certified layout (nothing dropped, nothing nudged), and the cost of showing a whole corps field at one zoom.
- **Two crowds of one brigade can stand apart with the same words** ("Armistead's Bde 4" and "Armistead's Bde 2"): the layout produces them when the brigade's regiments cannot stand together.
- **Place and road names are the basemap's** and run under marks where a mark stands on a road; the marks paint over them with their halo. The measured contrast of ground names is part of the audit's labels count but is the basemap's, not this folder's, to fix.
- **The Showcase tour and the other tour copy are the first round's**, only retargeted at the two looks; the two inherited assertions about a 60-second Showcase and its measured table were updated to the 46-second tour without the Before/After step that the first round left in place (`test/assemble.test.mjs`, marked FORK).
