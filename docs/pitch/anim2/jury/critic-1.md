# Jury critique 1 of 3: hostile creative-director review of the four Battle Studio directions

Method: blind to the code. I judged only the PNG screenshots and the four SPEC.md files. I opened the first-prototype comparison (`docs/pitch/anim/shots/prototype/compare-z15.png`) and then every scene PNG of each direction at full size (opening field z13.5, assault, Wheatfield z15, Cemetery Hill z15.5, close-up/selected z16.5, phone 390 px, event+story popups, legend, hover tooltip), plus the 100 percent crops where they exist and the motion strips I could open (D4 march, D3 M2 march, D1 strip-march and D2 motion-strip returned no image on my reads, so I do not score motion from them; I score motion only from what the SPECs state and flag that as unseen). I did not read the other critics. No credit for effort, for test counts, or for SPEC prose: only what is on the screen.

Scale: 5 is mediocre, 8 is shippable at a good studio, 10 is exceptional. Every line below 8 carries numbered fixes.

## Scores

| line | D1 Quiet Cartographer | D2 Strategy Premium | D3 Field Manual | D4 Dispatch (Editorial) |
|---|---:|---:|---:|---:|
| hierarchy | 7 | 5 | 7 | 8 |
| legibility | 7 | 7 | 8 | 8 |
| noise | 7 | 4 | 6 | 7 |
| polish | 8 | 7 | 7 | 8 |
| basemap_fit | 9 | 6 | 6 | 9 |
| identity | 6 | 9 | 7 | 7 |
| vital_info | 6 | 5 | 7 | 7 |
| phone | 7 | 6 | 7 | 7 |
| popups | 8 | 7 | 7 | 8 |
| brand_fit | 8 | 5 | 6 | 9 |
| total / 100 | 73 | 61 | 68 | 78 |

Ranking: **D4 > D1 > D3 > D2.**

Against the original: all four are real improvements over `compare-z15.png`. The double box (symbol plate plus caption chip) is gone in every direction, the dashes and the 8 px badges are gone, and the ground is a real photograph. D3 is the one that drifts back toward the original complaint (a plate per unit). None of the four is yet at the level of "calm, confident, every pixel intentional" without the fixes below.

---

## D4 Dispatch (Editorial Annotation): 78, rank 1

What I see. The ground is a ghosted sepia survey print under the marks; the marks are bold discs and swallow-tailed or pointed standards with one white glyph and a haloed code right beside them. At z15.5 (S3) the picture is excellent: full unit names as plain haloed type on the print, discs that read as ink on paper, a calm blue/red pair, no boxes. S4 (selected, z16.5) is the most beautiful single frame of the four: the selected disc with a gold ring, its name growing out of the code, a pale card with a serif title and an evidence chip, the formation shown as a soft hull. The paper UI (cream cards, serif titles, caps kickers) is the only chrome that feels like a history publication, not a game or a dashboard.

Worst thing. At the opening zoom (S1a, S1b) most marks are in the faded "carried forward" state, so the dominant colour of the opening view is mud: slate-grey Union and brown Confederate standards on a tan ground, with only a handful of saturated fresh marks shouting. The age device is true, but the cost is that the first screen the owner sees looks washed out and the side is much harder to read than in the close-ups. The stale Confederate brown on the tan ground is the weakest pair on the page.

Steal this: the true-position anchor (the glyph stands on the unit, the text hangs off it) and the paper chrome. Also the name that grows out of the code in place.

Problems that keep it below 9:
- Hierarchy 8: standards and crowds are the loudest objects, correct; but the crowd number sits on a "pile" and the pile plus ring plus halo makes the crowds heavier than the brigade standards they merge.
- Legibility 8: 12 px semi-bold haloed code is good; the white-on-halo place names compete with unit names at z15.5 (road names crossing marks).
- Noise 7: the trailing "+" after a crowd code ("26 WI +", "II/1/3 +") is a cryptic glyph that the legend explains only as "the name is the lead record's". On the opening view it appears on roughly half the crowds. Plus ring-in-ring discs with a hairline outside a light ring is three strokes per mark.
- Polish 8: the S4 card's kicker wraps ("CONFEDERATE · REGIMENT" then "infantry" right-aligned on its own line) which is a visible layout glitch; the horizontal red leader runs about 600 px across the map from the card to the unit.
- vital_info 7: the SPEC's own table says 12 percent (14 of 117) of the marks at z13.5 are hidden under the dock or top bar, and the shots confirm it ("Battery B, 1st Rhode Island Artille|" and "3rd Bde, 3rd" are cut by the dock in S3). A unit under the UI is a unit hidden. The SPEC says "This is not solved."
- The legend still says "(Contact)" for a both-sides crowd. The data does not record contact (another direction's SPEC explicitly removed that word for exactly this reason). This is a Documented/Computed violation on a serious history site.
- The hull in S4 is a long narrow red wedge from the selected regiment through six others. It reads as an attack vector or firing cone, which is a claim about 1863 the data does not make, whatever the SPEC says ("not a claim about a line of battle").
- Phone (7): clean marks and a legible sheet, but the top bar overlaps the first marks, the sheet leaves the map about a third of the screen, and "infantry" is orphaned as a body line.

Required fixes (D4):
1. Rebalance the age device so the opening view is not mud: keep hue and saturation floor for stale marks (drain lightness or ring weight, not chroma) so side stays readable at a glance; show the stale state with a second cue (thinner ring) and test it on the opening scene, not on a swatch.
2. Drop "Contact" from the crowd naming and the legend; use "Both sides". Replace the trailing "+" with something self-explanatory (the count already says "N records"; name the crowd by the shared formation or by "I Corps +2" like D1, never an unexplained glyph).
3. Pad the map by the dock and top bar (an inset camera safe area) so no mark is ever under opaque chrome; make the vital-info rule apply to chrome, not only to cards. Target 0 of 117.
4. Draw the hull as a quiet outline (a neutral hairline convex shape, no red wash, no long taper), or only the true-position dots, so it cannot read as a force vector.
5. Fix the card kicker wrap and shorten the card leader (route it to the nearest card edge, not a 600 px horizontal).
6. Reduce place-name collisions with unit names: increase the keep-out for road names and cap the road names under marks.
7. On the phone, put the top bar in the safe area and give the map at least 60 percent of the height with the sheet at a half detent.

---

## D1 Quiet Cartographer: 73, rank 2

What I see. A dark slate "night survey" ground (and a pale "day atlas"), tiny pips (disc, diamond, triangle for arm), small swallow-tail flags for formations, lettering with a soft halo and no boxes at all. It is the calmest and the most photographic of the four: nothing floats on the ground; the aerial is the hero; the flags and pips look like cartography. The crowd standards ("2 II Corps") say what they hold. The close-up (S4) is elegant: the selected unit's pill with a strength hairline, a clear card in glass.

Worst thing. The opening view is mute. At z13.5 (S1a) a unit is a bare coloured pip with no code and no name; the only text on the page is the formation lettering and a handful of crowd names, so the viewer cannot tell which regiment anything is without hovering ("the weakest point of the opening view" the SPEC concedes). Combined with the dark ground and 11 px lettering, the first screen looks like a scatter plot of dots, and the dense cluster at the right (S1a crop) still has the pin-and-hairline clutter that the owner called glitches (tiny white dots and thin lines between flags, 5/7/3/8 counts).

Steal this: the "halo not box" lettering, the one-curve motion table, the fact that every unit is on the map as itself (28 crowds for 106 units at the opening vs 55-68 crowds for about 380 in the others, which is the most honest representation), and the day/night ground pair.

Problems:
- Hierarchy 7: formation names (13 px bold, tinted) are right; but the pips are 11 px and the whole unit tier is a uniform small dot; nothing guides the eye to the front.
- Legibility 7: 82 percent grey regular names next to the code at z16 are dim on the dark ground; hollow "carried" pips are the thinnest mark on the page and almost invisible at the opening zoom; 11 px haloed text is on the floor, not above it.
- Noise 7: pin hairlines and member hairlines in the crowded clusters; the chrome carries development language ("Before / After", "Night survey", "Standard" dropdown) that is noise on a history site.
- Polish 8: very consistent; two radii; but the top chrome collides with map labels in S1b (the "1st Div, Cavalry Corps" lettering runs under the Chronicle button and icons) and the dock cuts off marks at the bottom edge in S3.
- Identity 6: well made, but it is a recognisable "good web map" skin (circles, triangles and flags with halo text). Memorable only through restraint. Beside D2/D4 it will be forgotten.
- vital_info 6: see worst thing; side is carried by hue only at 11 px (the SPEC concedes greyscale ratio 1.5:1 and has no second cue except arm shape).
- Phone 7: legible and clean, but the sheet takes half the screen and the pip text is the smallest in the set.

Required fixes (D1):
1. Show the short code on every unit from z13 (the opening view must name what it shows). If the footprints are too big, show the code only for units that are not in a crowd and move the whole crowd threshold; do not ship an unnamed opening.
2. Add a second side cue that survives greyscale (a notch, a mirrored flag, a ring weight) and raise the Union/Confederate lightness separation; the SPEC admits this was "not tried".
3. Remove pins and hairlines from the resting view entirely (show them on hover/selection only) or reduce them to a single small tick; the opening cluster must read as marks, not wiring.
4. Raise the name lettering to full opacity and the hollow pip's ring to 1.75 px; test the carried state at the opening zoom on the night ground.
5. Keep the day ground as the default for a history site's first view or at least test the photo-grade; the night ground at the opening zoom is murky. Rename the controls ("Night survey", "Before/After", "Standard") to plain labels or hide the dev ones.
6. Inset the camera by the chrome (top bar, dock) so labels never run under it.
7. Give the unit tier an echelon-by-size progression (regiments slightly larger when selected neighbours exist) so the eye has a path.

---

## D3 Precision Field Manual: 68, rank 3

What I see. Flat, opaque plates with a square coloured cell (left for Union, right for Confederate), bold code, a count tail ("+13", "×9"), a strength gauge of ticks along the foot, and an APP-6 echelon tab above. It is the most information-dense and the most legible direction at 100 percent; a staff officer would parse it. The legend swatches at true size are clear.

Worst thing. The plates are a table of boxes. At the opening view (S1a) there are more than 120 heavy black rectangles with white keylines, each with a coloured square, scattered over the aerial: the "floating chip" look the owner called out in the original has come back, only prettier. And the stale state washes the Union cell to a flat blue-grey with no glyph, so the majority of Union formations read as a neutral grey block: indistinguishable from "side unknown" until you notice the left position. Side by position is a clever cue but a cue that has to be learned.

Steal this: the strength gauge idea (a hairline in the footprint), true-size legend swatches in the rail, and the evidence chips (outlined caps, consistent).

Problems:
- Hierarchy 7: the tab and the 13 px type help, but at the opening view every plate has the same black weight and same width, so formations do not out-rank regiments.
- Legibility 8: best of the set at 100 percent.
- Noise 6: three notations on every tile (cell, tab, gauge ticks) plus a tail whose two forms ("×12" and "+13") are not self-explaining; the white keyline on black plates glitters on dark aerial.
- Polish 7: consistent, but the chrome is a hard black bar with caps labels (more terminal than atlas); in S6 the event card covers part of a place name ("Lutheran Theological Seminary") and three leaders cross the map for 200+ px.
- Basemap_fit 6: opaque black rectangles do not belong to the photograph; there is no light, no depth, no integration.
- Identity 7: mirrored cells are a real idea; the rest is a defence-app look.
- vital_info 7: every unit has a code and a gauge; the stale grey cell loses the side; "Contact ×12" appears in the legend and in the march strip (M2): the data does not record contact.
- Brand_fit 6: serious, but cold; it looks like software for operators, not a beautiful history site.
- Phone 7: the plates hold up and are legible; the top bar is crowded ("FIELD MANUAL ▾ BEFORE AFTER ▶" on one line).

Required fixes (D3):
1. Cut the plate: remove the outer keyline box and the black fill; letter on halo with the side cell only, or reduce the plate to a 60 percent glass so the aerial shows through. The goal is that the ground, not the plate, is the dominant surface.
2. Keep side hue under age: stale means lower lightness or thinner, never grey. A stale Union cell must still be blue.
3. Merge the two tail notations (×N / +N) into one phrase with words ("+13 more"), or put the count in the cell for crowds.
4. Delete "Contact" from the legend and the crowd naming.
5. Remove the strength tick-gauge from the resting view; show it only on selection (it is a Modelled value and it adds six marks per tile).
6. Calm the chrome (sentence-case labels, one weight, lower the black) and keep leaders short and out of the unit column.
7. Give formations (brigade and up) a distinct silhouette, not only a taller plate.

---

## D2 Strategy Premium: 61, rank 4

What I see. A grand-strategy banner per unit: a gilt staff, blue or red cloth with a fly shape, gloss, bevel, baked shadow, a hoist band with a white arm sign, a strength line in gold, and gold count pills on stacked banners for crowds. The chrome is ink-navy with gilt hairlines. Technically the most finished-looking surface and the most original; it is also a different product from a serious history site.

Worst thing. The opening view is a wall of heavy objects: 125 banners, 55 of them crowd stacks labelled with the useless words "Union" and "Confederate" (S1a: "6 Union", "10 Union", "19 Confederate", "27 Both sides"), each with a gold pill, a gilt frame and a drop shadow. The crowds are the loudest things on the screen and they say the least: roughly 85 percent of the units are hidden behind generic side words. That is "vital information hidden", delivered in the most expensive artwork on the page.

Steal this: the legend's labelled anatomy diagram (the only direction that teaches the mark), the cloth fly shape that survives greyscale (swallow-tail vs point), and the discipline of "one language from mark to popup".

Problems:
- Hierarchy 5: gold appears on staff, pill, strength, frame, ring, buttons and chips, so gold means everything and nothing; formations (30-38 px) do not out-rank the count pills.
- Legibility 7: 11 px Barlow Semi Condensed on cloth is readable in the close-up (S4) but small and compressed at the opening zoom; "Part contested" in S1a sits half on gold and drops contrast.
- Noise 4: gloss, bevel, shadow, gilt frame, hoist band, sign, strength line, fly shape, stack offset, pill: 10 devices per mark. The owner asked for "no heavy borders, no badges".
- Polish 7: well executed; but there are visible glitches: crowd banners clipped under the header in S1a ("onfederate"), the ribbon bookmark above every card looks like a stray mark, the unit-card top edge is crowded, cards sit close to the chronicle.
- Basemap_fit 6: baked drop shadows and gradients are the floating-chip look in a better costume.
- Identity 9: unmistakable; no one will call it a recolour.
- vital_info 5: crowd names are the weakest of the four.
- Phone 6: the banners are enormous relative to the 390 px screen (they run off the left edge in S5) and the all-caps place name "CEMETERY RIDGE (CENTRAL)" is heavy.
- Popups 7: consistent and anchored, good evidence chips; the ribbon device and gilt hairlines are decoration.
- Brand_fit 5: it looks like a game launcher; it risks the credibility the evidence labels are building.

Required fixes (D2):
1. Strip the object to cloth, hoist sign, code, and a hairline: remove gloss, bevel, the gilt frame, and the baked shadow from regiments; keep one subtle shadow only for the selected mark. Aim for four devices per mark.
2. Name crowds by what they hold ("II Corps +2", "Harrow's Bde"), never "Union" and "Confederate"; show the count as plain number in the cloth, not a gold pill.
3. Gold only for selection and for the strength line; use one accent for everything else.
4. Make the opening view lighter: smaller banners (or discs) until z15, banners only at z15+.
5. Fix clipping under the header and the "Part contested" contrast; remove the bookmark ribbon on cards.
6. Phone: reduce the banner scale by 30 percent, left-align, use sentence-case place names.
7. Re-test the opening scene for visual weight, not only for overlap counts: a screenshot with half the objects at half the weight should still be fully legible.

---

## Single worst thing in each

- D1: the opening view names nothing: bare pips at z13.5, you must hover to know a regiment.
- D2: crowds called "Union"/"Confederate" in gold pills: the loudest objects say the least, 85 percent of units are behind them.
- D3: a black plate per unit brings the floating-chip look back, and stale Union cells turn grey so the side is lost.
- D4: the opening view is washed to mud by the age fade, and the legend still says "Contact" (a claim the data does not make).

## Best thing each does that the others should steal

- D1: letters on a halo, no box; and the honest crowd (a count and the corps in words).
- D2: the legend's annotated anatomy diagram; the fly shape that survives greyscale.
- D3: the strength gauge in the footprint and true-size legend swatches.
- D4: the glyph stands on the true position and the name grows out of the code; the paper-and-serif chrome.

## Ranking and reasoning

1. **D4**: only direction where the map, the marks and the chrome are one publication; legible at the opening zoom (every mark carries its code); the closest to "calm, confident, beautiful"; its faults (fade, "+", "Contact", the hull, chrome cover) are fixable without redesign.
2. **D1**: the best integration with the aerial and the calmest; fails the vital-information test at the opening zoom and has a weak identity; one round of fixes (codes at z13, no pins at rest, a second side cue) would make it a contender.
3. **D3**: the most functional and the most legible; but it brings back plates and loses side under age; it needs the plate removed to belong on the photograph.
4. **D2**: most polished surface, wrong register; it fails noise, hierarchy and brand, and its crowd naming hides the most information.

Combine (not as an option, as the fix list): D4's anchoring, name growth and paper chrome; D1's halo lettering and honest crowd naming; D3's gauge on selection only and legend swatches; D2's annotated legend.

## What I could not judge

Motion beyond the D4 and D3 strips and the SPEC tables (the D1 and D2 strips returned no image on my reads); dark-mode of D4; D3's tuning studio and variants; any real device. The phone judgments are from one 390 px shot per direction.
