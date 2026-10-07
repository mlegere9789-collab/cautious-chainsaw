# Critic 3 of 3: hostile design review of the four Battle Studio directions

Reviewer role: creative director, game UI and data graphics. Blind to the code. Evidence: the PNG screenshots and the four SPEC.md files in `docs/pitch/anim2/d1..d4`, compared with `docs/pitch/anim/shots/prototype/compare-z15.png`. No praise for effort. A 5 is mediocre, an 8 is shippable at a good studio, a 10 is exceptional.

## What I actually looked at, and what I could not

- Opened with the image viewer and looked at: the original `compare-z15.png`; D1 scenes s1a, s1b, s2 (night and day), s3, s4, s5 (phone), s6, s7, s8, `specimen-night`, `cvd-night`; D2 s1a, s1c, s2, s3, s4, s5, s6, s7, s8; D3 S1a (plus its 100% crop), S2, S3, S4, S5, S6, S7, S8, V1 crop, P5, P7; D4 S1a (plus its 100% crop), S2, S3, S4, S5, S6, S7, S8.
- The viewer repeatedly answered "request limit" and returned nothing for some reads. I retried until each scene above rendered. I never got a rendered image for: the D1 and D2 100% crops, any motion strip (D1 `strip-*`, D2 `motion-strip`, D3 `M1..M3`, D4 `motion-*`), D1 `specimen-day`, D3 `P1..P4, P6, P8..P11`, D4 specimen sheets. **Motion is therefore judged from the SPEC numbers only, not from pictures, and I give no motion score.** D1 and D2 scenes were judged at the 2000 px downscale of the 2880 px shots, not at 100%.
- The rubric line "popups" is judged on the popups that appear in the scene shots (event, story, command, unit card, tooltip, legend, clock, minimap, chronicle strip) plus D3's P5 and P7. D3 is the only direction that documents every popup in its own picture.

## The original, for the record

`compare-z15.png` is four skins of the same layout: a symbol plate plus a caption chip per unit, same weight everywhere, 8 to 9 px text, dashed outlines and "x2" badges, a flat beige grid. All four new directions fix the two-box problem and all four sit on the real aerial. None of them is a regression. None is yet the "AAA" answer either: each trades one of the owner's binding requirements (hierarchy, calm, every unit named, true to the data) for another, and the opening view (zoom 13.5, the first thing the owner sees) is where all four are weakest.

## Cross-cutting findings (apply to all four)

1. **The opening view forces a choice nobody solved.** D1 draws 373 marks for 451 units and has no code or name on any pip (its own SPEC admits it, section 14). D2 draws 125 marks with 55 crowds standing for 381 of 451 records (85 percent). D4: 137 marks, 61 crowds for 375 records (83 percent). D3: 55 stacks, only 14 percent of units stand as themselves. So the owner's "a unit is always represented and its short name readable" is either nameless (D1) or hidden behind a count (D2, D3, D4). Nobody gets both at zoom 13.5.
2. **The bottom dock and top bar still sit on the map and cover marks** in every direction (D2 s1a: a crowd clipped to "onfederate" under the day chip; D4 admits 12 percent of marks hidden under chrome at 13.5, section 12; D1 and D3 docks take the bottom 15 percent of the frame). A designer would reserve the chrome as a keep-out for the layout; only D4 even measures it.
3. **Stale marks dominate the opening view.** At tick 551 most keyframes are a day old, so D1 (hollow), D3 (washed cell) and D4 (colour drained to grey) all show most of the field in the "old" state. Honest, but the hero frame is drab and the side colour of a stale Union mark (slate grey) is hard to tell from a stale Confederate mark (brown grey). The age device needs a channel that does not eat the side hue.
4. **Two of four keep the crowd names the first review rejected.** D3's legend still shows "Contact x12" and D4's SPEC section 7 and legend still say "(Contact)" for both-side crowds, a word that implies an engagement the data does not record. D1 and D2 changed to "Both sides". This is a truth failure under the owner's rule "every claim on screen must be true to the data".
5. **Pins and leader hairlines still look like glitches** (owner complaint 6) in D1 (s1a clusters), D3 (blue and red dots on lines in S2) and D4 (S2, S4). Only D2's are discreet.
6. **The owner's complaint 3 (heavy, noisy, tiny) is only fully solved by D1.** D2 re-adds ornament, D3 re-adds plates and ticks, D4 adds a lot of text.

## Scores

Scale 1 to 10. Lines below 8 carry numbered fixes in the per-direction sections.

| line | D1 Quiet Cartographer | D2 Strategy Premium | D3 Field Manual | D4 Dispatch |
|---|---:|---:|---:|---:|
| hierarchy | 7 | 6 | 5 | 7 |
| legibility | 8 | 7 | 8 | 8 |
| noise | 7 | 4 | 5 | 7 |
| polish | 7 | 7 | 7 | 7 |
| basemap_fit | 9 | 5 | 4 | 8 |
| identity | 5 | 9 | 8 | 7 |
| vital_info | 6 | 5 | 7 | 6 |
| phone | 7 | 6 | 8 | 7 |
| popups | 8 | 8 | 8 | 8 |
| brand_fit | 8 | 6 | 6 | 9 |
| mean | 7.2 | 6.3 | 6.6 | 7.4 |

**Ranking: 1 D4 Dispatch, 2 D1 Quiet Cartographer, 3 D3 Field Manual, 4 D2 Strategy Premium.** D4 and D1 are a point apart on the mean and it is a close call: D1 is the calmer and more honest object on the ground, D4 is the more finished product for a history site. None ships as is. The right move is a hybrid (see the end).

---

## D1 Quiet Cartographer

One small pip (shape = arm, colour = side) with haloed lettering, a swallow-tail standard per formation, no plates, night aerial default with a day atlas option.

**What a hostile director sees.** This is the only direction that looks like it belongs to the photograph. Haloed lettering on a graded aerial is exactly how a good atlas does it, there are no boxes anywhere, and at zoom 15 (s1b, s2) the field is readable and calm. The cost: at the default zoom (s1a) it is 300-odd identical dots with bare flags, and the eye has no place to go except the few long tinted formation names. The identity is "Apple Maps with a dark skin": competent, anonymous.

- hierarchy 7: three levels exist, but echelon is only 1 / 1.12 / 1.26 times flag size, so brigade, division and corps flags look the same (s2, s3). The loudest objects on the map are 13 px bold strings such as "2nd Bde, 2nd Div, 3rd Corps"; they outshout every unit.
- legibility 8: halo and tint work on the night ground; the count numerals sit in a 15 x 11 px flag and are the weakest text on the map. Code and name at zoom 16 are clean (s4).
- noise 7: calmest of the four, but the pin rings and white hairlines are back at the opening zoom (s1a around the two big clusters), the exact "glitch" the owner called out.
- polish 7: consistent, but the face is Liberation Sans, an Arial clone; the interface uses four sizes against the brief's two (SPEC section 14).
- basemap_fit 9: best in the set. The marks are light on dark with a hairline, nothing floats.
- identity 5: nothing memorable except the flag; reads as a default web map.
- vital_info 6: every unit is a mark (28 crowds for 106 units at 13.5, best representation of the four), but no code, no name and no strength state on any unselected mark at the default zoom, by its own admission. Crowd wording is honest ("Both sides", "II Corps +2").
- phone 7: s5 works, but three chips stack at the top, the sheet takes more than half the screen, and the flag counts are tiny.
- popups 8: glass cards, kicker, evidence dot and word, hairline leader, never over a mark. The legend is fixed so that it opens (in the rail). Fine, not beautiful.
- brand_fit 8: restrained, serious, atlas-like.

**Single worst thing.** The default view answers nothing: hundreds of unlabeled pips (no code, no name, no strength) that look like confetti, in a language that reads as the generic pip-and-label of every web map.

**Best thing, others should steal.** Lettering with its own halo instead of any plate, and "the same mark grows" progressive disclosure, plus a click below zoom 15 that moves nothing (SPEC section 9). The honest crowd names too.

**Required fixes (D1)**
1. Make the default view readable: draw the short code on every pip that has clear ground at zoom 13.5 (the layout already knows the free space) and keep bare pips only where it does not. Drop pins and hairlines at the opening zoom; show them on hover and selection only.
2. Make echelon unmistakable: add 1/2/3 pips or bars on the flag and a real size ladder (not 12 and 26 percent); let a corps name be the only all-caps level.
3. Shorten the formation strings ("3rd Bde, 3rd Div, 1st Corps") to the unit's own code plus its parent on hover; the long strings currently outrank the units.
4. Replace the Arial-class face with one with character, and cut the interface to two sizes as briefed.
5. Add a second side cue that survives greyscale (the SPEC admits 1.52 : 1 and says a notch or mirrored flag "was not tried"): try it.
6. Give a signature device so it stops being generic (for example a cartographic casing on formation standards, or a hoist band that carries the arm).
7. Phone: collapse the three top chips into one row, give the count flag a larger tap target, cap the sheet at 40 percent.

---

## D2 Strategy Premium

A unit is a small banner on a gilt staff with a hoist band (arm), cloth gradient, fly shape, gilt strength line, baked NW shadow; crowds are a stack of banners with a gilt count coin.

**What a hostile director sees.** The most crafted and most memorable of the four, and the furthest from the brief. It is Total War on a history site: bevels, gradients, gloss, shadows, finials, gilt hairlines, ribbon tabs on cards. Under the owner's complaint list it fixes (1) and (4) and re-introduces (3) in an expensive material.

- hierarchy 6: the gold coins of the crowd marks are the loudest objects and carry the least information; banners of equal height (22 to 38 px) compete with them; in s2 there is no focal point.
- legibility 7: 11 px condensed codes on a blue or red gradient are readable but small; the arm glyphs on the hoist band are about 9 px; "Part contested" in cream over a gold and brown cloth is the weakest line in s1a.
- noise 4: bevel, gradient, gloss, shadow, stack offset, finial, gilt frame, dotted rule under the code, gilt strength line, coin: ten ingredients per mark. The opening view (s1a) is a field of gold coins.
- polish 7: the craft is high and the gilt-navy language is consistent from banner to card to chrome. Defects: a crowd clipped under the day chip (s1a top left), the place name "BLISS FARM" clipped by a chip (s7), the hover card covering "CODORI FARM" (s8), "12 Confederate" cut at the screen edge on the phone.
- basemap_fit 5: opaque banners with drop shadows float over a grey photograph like stickers: the "floating chip look" the owner named, in a nicer wrapper.
- identity 9: unmistakable and distinct from the other three.
- vital_info 5: 85 percent of units sit behind a coin and a name that says only "Union" or "Confederate", repeated on twenty marks at the opening view (s1a); names unfold only from zoom 15.6; at zoom 15 (s2) there are still ten crowds called "Union" or "Confederate". The crowd "still says what it stands for" only as far as the side.
- phone 6: banners are 100 to 130 px wide on a 390 px screen, the selected mark's leader runs into the sheet, the top chip overlaps marks.
- popups 8: cohesive and the richest cards of the four; the legend with the anatomy diagram is the best legend here. The ribbon bookmark on every card is decoration, not information.
- brand_fit 6: gilt and ribbons risk reading as a strategy game, not a history site.

**Single worst thing.** The gold coin on 55 of 125 marks that says "Union" or "Confederate": the loudest object on the map says the least, and 85 percent of the field hides behind it.

**Best thing, others should steal.** The side carried by silhouette as well as colour (swallow-tail against point, so it survives greyscale), and the legend that draws one real mark with callouts (staff, code, cloth and fly, gilt line, hoist band).

**Required fixes (D2)**
1. Strip the ornament: flat cloth, one hairline, no gloss, gradient, finial or bevel; one shadow at most, 1 px and neutral. Replace the ribbon tabs on cards with a quiet top rule.
2. Replace "Union" / "Confederate" crowd names with what members share (corps, division, "Both sides") and make the count a plain numeral in the cloth, not a gold coin; demote the coin from loudest to quiet.
3. Shrink the footprint at overview (banners are 22 to 38 px high): at zoom 13.5 show code-only banners at 14 to 16 px so far fewer than 85 percent of units merge.
4. Fix the contrast of lettering that straddles two cloth colours ("Part contested"); add a halo or move the lettering off the seam.
5. Make the chrome a layout keep-out (the day chip clips a crowd; place names are clipped by chips) or fade marks under it.
6. Raise the map type to 12 px or use a non-condensed weight; enlarge the arm glyph to at least 12 px.
7. Phone: cap banner width at 90 px, never clip a crowd name, move the leader above the sheet.
8. Hierarchy: let formation standards be the only gilt objects; crowds and units go flat.

---

## D3 Field Manual

Flat APP-6 style plate per unit: a coloured cell (Union left, Confederate right), arm symbol, bold code, strength gauge, tab with echelon marks, stack edge for crowds. Opaque cards with an amber rule.

**What a hostile director sees.** The most legible direction at 100 percent and the most thoroughly documented (every popup has its own picture). It is also the original prototype's chip problem with the box turned into one object: a wall of identical black rectangles with white keylines that cover the very ground they are meant to sit on. It looks like an operations console, not a history site.

- hierarchy 5: unit plates are 20 px, formations 22 to 26 px: every mark is a black rectangle of about the same weight (S1a, S2). It reproduces the owner's complaint 2. The tab above the cell is the only differentiator.
- legibility 8: white bold 11 and 13 px on near-black is the crispest text of the four; the muted "+9" tails are fainter.
- noise 5: plate, keyline, shadow, cell, symbol, tab, a row of white gauge ticks under every code (on every plate in S1a, over a hundred on screen), stack edge, underline for unknown identity. The strength ticks alone are a field of dashes; D1's own SPEC found exactly that "read as dashes".
- polish 7: strict grid, good faces (Source Sans and Serif), consistent amber rule. But the SPEC says "no shadow" and the crop shows a lower-right shadow edge on single plates; and all type is two sizes, so card titles are not distinct.
- basemap_fit 4: opaque plates with a white keyline are the floating-chip look. They are heavy and large, covering a lot of ground; the dark ground at least keeps the contrast honest.
- identity 8: distinct and disciplined; the mirrored cell (Confederate on the right) is a genuinely smart idea.
- vital_info 7: best information per mark: code, arm, echelon, side, strength gauge, crowd count on every plate. But 86 percent of units merge at 13.5; two crowd conventions (`x7` for one formation, `+4` for a lead unit and others) have to be decoded; the stale Union cell washes to slate grey and looks "unknown"; "Contact x12" is still the label for both-side crowds (S7 legend).
- phone 8: S5 is the most usable phone shot: big plates, legible sheet, clear selection.
- popups 8: opaque cards, tone rule and shape as kicker, 11 px capital evidence tags in a hairline box, legend with true-size marks. Comprehensive, a bit austere; the three stacked event cards in S6 cover about 30 percent of the map and clip "Lutheran Theological Seminary".
- brand_fit 6: serious and rigorous, but Bloomberg-terminal austerity, in tracked capitals, is not "a beautiful history site".

**Single worst thing.** Every unit is a black rectangle with a white keyline: the same-weight wall of boxes the owner called "dogshit", now with a spreadsheet's worth of ticks on top.

**Best thing, others should steal.** A second side cue that is not hue (the cell position) and the discipline of documenting every popup in its own picture; the opaque card anatomy with its tone shape.

**Required fixes (D3)**
1. Kill the wall: make unit marks (regiments) light, a cell plus haloed code and no black plate; reserve plates for formations and stacks so there is a real second weight.
2. Remove the strength ticks from every plate; show strength only on hover and selection, or as one quiet fill fraction on the cell.
3. Keep a single, consistent drop shadow decision: either none (as the SPEC says) or one tuned shadow for all marks.
4. Fix the age device so a stale Union cell still reads blue: lower lightness or saturation modestly, never to slate grey.
5. Shrink plates (20 px high, about 100 px wide) so that more than half of the units stand alone at 13.5, not 14 percent.
6. Retire "Contact"; label both-side crowds "Both sides". One crowd convention, not `x7` and `+4`.
7. Compact the name form at zoom 16 (one plate reads "Third Brigade, Third Division, First Corps (Stannard's Vermont Brigade)", about 600 px wide) to the compacted designation D1 and D4 use.
8. Restore a title size on cards and soften the all-caps tracked buttons; add one warm paper variant for a history site.
9. Stack fewer event cards at once, or collapse to chips; do not let place names sit under cards.

---

## D4 Dispatch (Editorial Annotation)

A flat disc (arm glyph in white, light ring and dark hairline) with haloed code beside it; swallow-tail and point standards with 1, 2, 3 pips for echelon; crowds as a standard with a count and a pile; paper-and-ink ground (sepia ghosted aerial) and paper cards; serif titles; hull on hover; highlighter-pen anchoring for cards.

**What a hostile director sees.** The best brand idea and the best typography of the four: it looks like a newspaper graphics desk, which is exactly right for a serious history site. The mark language is flat and quiet, the cards are the nicest (S6: a "pen" ring on the subject marks and a thin leader to the card), and the hull on hover (S4) is the one genuinely elegant piece of data graphics in the set. It is weakened by the crowd labels, the faded opening view and a handful of visible defects.

- hierarchy 7: standards are clearly above discs, crowds above both; but at zoom 13.5 (S1a) 61 crowds of near-identical standards in slate and brown compete with each other, and the eye finds only the few fresh blue and red marks.
- legibility 8: ink on a cream halo (14.3 : 1 in its own test) at 12 px semibold is very legible, in both the 100 percent crop and the phone shot. Italic serif place names at 12 px are the weakest text (owner complaint 7, mildly).
- noise 7: calm marks, but every unit carries a full-width haloed name from zoom 15 (S2, S3: lots of text), and the pin rings with leaders are back (S2, S4).
- polish 7: Inter plus Source Serif is the best pairing; paper cards with a tone rule are consistent. Defects visible in the shots: a name truncated to "I" beside a "5" crowd in S2; place-name text ("th") peeking between the clock chip and the layer switch in S4; the unit card kicker wraps "infantry" onto its own line (S4); marks clipped under the top bar (S1a).
- basemap_fit 8: marks sit on the sepia ground "like ink on a printed map", flat, with a halo; no plates. The aerial variant is not shown in any picture.
- identity 7: the paper-and-serif world is distinct; the marks themselves (a ring disc, a pipped flag) are close to D1's pip and flag.
- vital_info 6: names are readable on every mark from zoom 15 and the hull is a good "what does this stand for" device; but 83 percent of units merge at the opening zoom behind a count and a cryptic lead code ("26 WI +", "I-4 +", "III-3", "II/1/3 +"); the four-arc strength ring is invisible at 15 px in the 100 percent crop, so "strength state readable" fails; the "+" is unexplained on the map.
- phone 7: S5 is clean and the sheet is beautifully set, but the top bar overlaps marks and the sheet covers more than half the map.
- popups 8: the best card language of the four (paper, serif title, kicker, tone rule, underlined "Show on map", highlighter pen, hull). Only four popups are pictured in the scenes, so "keep and improve every popup" is asserted by the SPEC, not shown.
- brand_fit 9: closest to a serious, beautiful history site. One caution: the antique sepia grade makes a 2022 photograph look like a period map, so the honesty line in the dock has to work harder.

**Single worst thing.** The crowd naming: "Contact" retained for both-side crowds in the SPEC and legend (a claim the first review rejected), and lead-code-plus labels ("26 WI +", "I-4 +") that say nothing about what 83 percent of the field stands for.

**Best thing, others should steal.** The paper ground with serif titles and the card language; the soft hull on hover and the highlighter-pen anchoring; and anchoring the box on the glyph, not the text, so the dot stands on the true position (SPEC 5.1).

**Required fixes (D4)**
1. Rename crowds to what members share ("II Corps +2", "Both sides") as D1 and D2 did; drop "Contact" and the trailing "+" from the legend and the SPEC.
2. Reduce the share of units hidden at zoom 13.5: smaller footprint (disc without name at overview) so far fewer than 83 percent merge.
3. Make the strength ring readable at 15 px (thicker arcs or a fill fraction) or stop claiming it; show it in the 100 percent crop.
4. Fix the age device: keep the side hue legible at every age; do not drain Union to slate, as the opening view reads as 80 percent stale.
5. Fix the visible defects: the truncated "I" label (S2), the "th" text under the chip row (S4), the wrapping "infantry" kicker, marks clipped under the top bar (S1a); make chrome a layout keep-out.
6. Hide the pin ring and leader at overview and keep them for hover and selection (owner complaint 6).
7. Add a persistent "2022 aerial, not 1863" badge on the map frame (not only in the dock) and show the aerial variant; ease off the sepia so the page does not pose as a period map.
8. Phone: the top bar must not overlap marks; the sheet should leave at least 50 percent of the map.
9. Show every other popup (day banner, hints, Chronicle, tour, narration) in its own picture, as D3 does.
10. Push identity: the disc and pipped flag are too close to D1; develop the editorial idea in the marks too (for example annotation-style leader and handwriting-free pen marks for selection).

---

## Hybrid recommendation

- Overview: D1's one small mark per unit and "the same mark grows", but with D4's anchored-on-glyph rule, a code on every pip that has room, and D1's/D2's honest crowd names.
- Ground and chrome: D4's paper look and typography as the default, with D1's night aerial as the second theme.
- Marks: flat, no plates (D1/D4); D2's silhouette cue (swallow-tail against point) and D3's cell-position idea for a second side cue that survives greyscale.
- Popups: D4's cards, D2's anatomy-diagram legend, D3's evidence tags and one picture per popup.
- Never ship "Contact", "Union" as a crowd's name, or a row of strength ticks on every unit.
