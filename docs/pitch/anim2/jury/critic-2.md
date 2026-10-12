# Jury critic 2 of 3: hostile design critique of the four Battle Studio directions

Method: blind to the code. I opened every desktop screenshot, the 100 percent crops and the phone shot of D1, D2, D3 and D4 with the image viewer, read each SPEC.md, and compared against `docs/pitch/anim/shots/prototype/compare-z15.png`. Scale: 5 is mediocre, 8 is shippable at a good studio, 10 is exceptional. For "noise", a high score means quiet. No credit for effort, tests or sweeps: a spec full of zero-overlap tables does not make a picture beautiful. Where a score is below 8 there are numbered required fixes.

The owner's seven complaints, as the yardstick: (1) two boxes per unit, (2) no hierarchy, (3) heavy borders and tiny badges, (4) four recolours, (5) floating chips on a blank ground, (6) glitchy pins, (7) inconsistent radii and a hard-to-read serif.

## Verdict in one paragraph

All four are a real improvement on the first prototype: every unit is one object, nothing overlaps, the ground is now a real photograph. None of them is yet at "big AAA studio" calm. D4 (Dispatch) is the only one that feels like it belongs on a serious history site, with the best legibility and the best marriage of mark and ground. D1 (Quiet Cartographer) is the most disciplined and the closest to a professional map product, but at the opening zoom it is a scatter of anonymous dots. D2 (Strategy Premium) is the most memorable and the most polished object, but it answers a different question (a game) and drowns the battlefield in banners. D3 (Field Manual) is the clearest typography and the least beautiful: it brings back the plate-on-a-map look the owner called dogshit, with a spreadsheet gauge under every plate.

Ranking: **D4 > D1 > D2 > D3**.

---

## D1: Quiet Cartographer

Seen: `s1a` (opening), `s1a` crop, `s1b`, `s2` (night and day), `s3`, `s4` (selected, z16.5), `s5` phone, `s6`, `s7`, `s8`, `specimen-night`, `strip-march`, compare sheet.

What I see. A cold slate night aerial. Every unit is an 11 px pip (disc, diamond, triangle) with bold haloed code; formations are swallow-tail flags with 13 px tinted lettering; crowds are flags with a count inside. No boxes anywhere. At z15 (`s2`) it is genuinely handsome: type on photograph, no chrome, the eye goes to the formation names, then the pips. The specimen sheet is excellent and honest.

Scores

| line | score |
|---|---:|
| hierarchy | 7 |
| legibility | 8 |
| noise | 8 |
| polish | 8 |
| basemap_fit | 9 |
| identity | 6 |
| vital_info | 6 |
| phone | 7 |
| popups | 8 |
| brand_fit | 7 |

Why, and required fixes (for every line under 8)

- hierarchy 7. At z15 the loudest things on the screen are the long 13 px formation names ("2nd Bde, 2nd Div, 3rd Corps", "3rd Bde, 1st Div, 5th Corps"): they are four times the ink of the units they command, so the formations shout and the units whisper. Formation lettering is also the same weight and the same near-white tint as everything else; only size separates it.
  1. Cut formation names at brigade level to the short code or a two-word form until z16; keep the full designation for hover and the card.
  2. Give the formation tier one extra, non-size cue (a thin underline staff, or lettering in a lighter weight with the flag carrying the weight) so the unit pips are not out-shouted.
- identity 6. It is a very good default map layer, not a memorable design. Take away the pip shapes and it is Mapbox with flags. The day atlas (`s2-...-day.png`) is a flat grey wash: dull, no warmth, no sense of 1863.
  3. Pick one signature device that belongs to this battle (the flag shape is the closest) and carry it through the chrome and the crowd mark; today the chrome is generic dark glass.
  4. Retune the day ground: grey-green wash on a history site reads as a satellite error. Warm the paper.
- vital_info 6. The opening view is the weakest of the four: at z13.5 (`s1a`) most units are bare coloured dots with no code and no name; brigade flags have no name. A viewer cannot tell a regiment from a battery, or which brigade a cluster is, without hovering. The spec admits this ("the weakest point of the opening view"): admitting it is not fixing it. Also at z14 to z16 the pins and 1 px hairlines dangle from formation names to dots with nothing drawn at the end (`s8`: two vertical stubs under "Huey's Bde" and the "2nd Div" flag), which is complaint 6 again.
  5. At the opening zoom, merge dot clusters into a counted, named standard until each can carry a code (code appears at 14 today; bring it to 13 for the formations' own units, or make the crowd name do the work).
  6. Draw the unit mark at the true position with the displaced one linked, or drop the dangling hairline when the pin is hidden under another mark; never leave a stub with no visible end.
  7. Do not print both the code and the full name ("82 NY  82nd New York Infantry") at z16: the code is redundant once the name is there. Replace the code with the name, as D4 does.
- phone 7. `s5`: marks are legible and the sheet is tidy, but "3rd Bde, 3rd Div, 1st Corps" and "3rd Div, 2nd Corps" collide with the rotated road name "Emmitsburg Rd" and a pip's hairline; four flag names stack in a 200 px column; the pip codes are 11 px on a photograph at 390 px wide.
  8. On narrow windows show formation codes, not names, and move place and road names out of the way of marks.
- brand_fit 7. Calm and serious, but cold and corporate: a dark analytics dashboard (Night survey) is the default. A history site should open warm.
  9. Make the paper look the default and the night look the option.
- popups 8 (no fix required beyond noting): coherent dark glass cards, the evidence is a dot and a word, the legend moved to the rail and drawn by the skin. Note only that the story card's leader is a 250 px vertical hairline across the map (`s6`).

Worst thing: the opening view, a field of anonymous dots with dangling hairline stubs.

Steal-worthy: lettering with a halo instead of a box, with the same mark growing to include its name (the specimen sheet shows it perfectly). Also the honest crowd naming ("Both sides", "II Corps +2") that replaces "Contact".

---

## D2: Strategy Premium

Seen: `s1a` and crop, `s1b`, `s1c`, `s2`, `s3`, `s4`, `s5` phone, `s6`, `s7`, `s8`, `motion-strip`.

What I see. A dark, de-saturated aerial with every unit as a small cloth standard: gradient cloth, gilt trim, a dark hoist band with a white arm sign, gilt count discs on crowd stacks, soft south-east shadows. It is the most finished object of the four and the only one with real depth; the owner's complaint 5 (no light, no depth) is answered. At z15 it is rich, almost a Total War campaign map.

Scores

| line | score |
|---|---:|
| hierarchy | 5 |
| legibility | 7 |
| noise | 4 |
| polish | 8 |
| basemap_fit | 7 |
| identity | 9 |
| vital_info | 7 |
| phone | 6 |
| popups | 8 |
| brand_fit | 5 |

Why, and required fixes

- hierarchy 5. At z13.5 (`s1a`) the crowd stacks ("23 Confederate", "19 Confederate", "16 Union", "27 Both sides") are the largest, brightest objects on the screen, and they say the least. Brigade standards and regiment banners are close in size, so the formation tier barely reads above the unit tier. At z16.5 (`s4`) every regiment banner grows a second line and becomes a 230 to 270 px slab, so a regiment ("82nd New York Volunteer Infantry") is the same size and weight as a brigade ("1st Brigade, 2nd Division, 2nd Corps"): hierarchy flat, and the big rectangles are back.
  1. Cap the crowd mark's visual weight at the formation tier: lighter cloth, no stacked offset on the count disc, smaller than a brigade standard.
  2. Do not unfold the name into a second line for every unit at once; unfold only hover and selection, and let the name replace the code at a size that does not double the footprint.
  3. Make the echelon tier truly bigger than the unit tier (now 30 vs 22 px body); 1.5x or more.
- legibility 7. 11 px Barlow Semi Condensed in ivory on mid-blue/red cloth passes the pixel test (4.77 minimum), but the minimum is a mean-ish case and the small 11 px codes in the narrow banners ("11 VA", "I1US", "F1PA") look cramped. Evidence pills with outlines add yet more tiny 11 px caps.
  4. Raise the unit code to 12 px with a half-point of tracking and drop the tabular-narrow face for numerals under 11 px of x-height.
- noise 4. Gilt frames, gloss, rim light, drop shadow, hoist band, arm sign, finial, strength underline and dotted rule under identity-only codes: every unit carries nine decorations. Complaint 3 (heavy borders and detail) is only half answered. 125 marks at the opening zoom cover roughly a third of the visible aerial. The "Part contested" pill (`s1a`, top left) sits half under its neighbour and its gold plate reads as a rendering bug.
  5. Strip it back by half: remove the gloss and the rim light; keep the shadow and one hairline; make the gilt appear only on formations and on selection.
  6. Drop the dotted rule and the strength underline from the unit mark at rest; show them on hover and selection.
  7. Fix the "Part contested" crowd mark so its split cloth never reads as a second overlapping banner.
- basemap_fit 7. Shadows and stacking make the standards feel placed on the ground, which is right, but the heavy banners are far more opaque than the dimmed aerial; the aerial reads as wallpaper.
  8. Lighten the standards' footprint over the ground; let the relief breathe between marks.
- vital_info 7. Every unit is represented; side is reliable (fly shape plus cloth); arm is a small white sign, legible. But crowds are named only "Union" or "Confederate" with a number: 23 Confederate at a random place tells the viewer nothing about who, and no corps. D1 does better ("II Corps +2").
  9. Name a crowd by the corps or division its members share before falling back to the side word.
- phone 6. `s5`: banners are clipped at the left edge, the unfolded names exceed the 390 px column, the clock chip overlays a banner, and the evidence pills on the bottom sheet take half the card.
  10. At phone width disable unfolded names, enlarge the unit code, and clamp the chrome so it never overlaps a banner.
- brand_fit 5. This is a game skin: gilt, gloss, bevels, a gold "Showcase" button. A serious, beautiful history site is calm and restrained; this is loud and ornamental.
  11. Remove the gold glow on controls and the bookmark ribbons on cards, or make them hairline and one ink colour.
- polish 8, popups 8: consistent 4 px radius, one shadow model, ribbon-tagged cards, serif titles; the best-crafted set of cards. Minor: the leader line from the event card runs 600 px across the map (`s6`).

Worst thing: the opening view, a wall of oversized "Union / Confederate" stacks that outranks every real formation.

Steal-worthy: light and depth, and the north-west lit shadows that sit on the hillshade; also the popup system's ribbon tone cue and card craft.

---

## D3: Precision Field Manual

Seen: `S1a` and crop, `S1b` crop, `S2`, `S3`, `S4`, `S5` phone, `S6`, `S7`, `P7`, `M2`.

What I see. Flat dark plates with a bold white 11 px code, a coloured square cell (left for Union, right for Confederate), an echelon tab above, a row of tick marks under it (the strength gauge), a thin keyline and a faint shadow. Typography is the clearest and most disciplined of all four, and the cell/arm symbol reads instantly. The ground is the same dark aerial.

Scores

| line | score |
|---|---:|
| hierarchy | 6 |
| legibility | 8 |
| noise | 4 |
| polish | 7 |
| basemap_fit | 4 |
| identity | 7 |
| vital_info | 7 |
| phone | 7 |
| popups | 7 |
| brand_fit | 6 |

Why, and required fixes

- hierarchy 6. The tab plus 13 px type does separate formations, but at the opening zoom (`S1a`) 121 near-identical dark rectangles in a grid-like scatter are all equally loud; the eye has nowhere to go. The cryptic tails ("+13", "x9", "+16") are the same weight as the codes.
  1. Make the formation tier a different shape, not a bigger plate (a taller staff or a pennant), so it breaks the rectangle repetition.
  2. Set the stack count as a numeral inside a coloured token, not as a muted tail after the code.
- noise 4. A tick-mark gauge on every plate (3 px bar with quartile ticks) reads as a row of dashes under every label across 120 plates; D1's own log called the same device "dashes". The corner tab, the cell, the keyline, the stack edge and the gauge give a mark five borders. `S1a` crop is a wall of black tiles.
  3. Remove the gauge from every plate at rest; show it on selection.
  4. Drop one of the cell, the tab or the keyline; pick one structural cue for side and one for echelon.
- polish 7. Corner radii are consistent, the grid is clean, but the stack edge (3 px lower-right plate) looks like a drop shadow, and the "Paper" quick-switch of the chrome uses a different uppercase tracking system from the cards. Selected state (`S5`) is a gold keyline that fights the amber signal colour of the chrome.
  5. Use one selection colour that is not also the primary action colour.
- basemap_fit 4. This is the old failure: an opaque dark box floating on a photograph, with a pin and a leader to nowhere (complaint 5, complaint 1). The plates have no halo, no light, no relation to the ground. On the dark aerial they glow like UI chips. Where a plate stretches (`S4`: "First Brigade, Third Division, Second Corps (Carroll's Brigade)" is 560 px of black bar) it blanks the photograph entirely.
  6. Replace the opaque plate with a translucent glass at 55 percent plus a halo; the information survives and the ground shows through.
  7. Never grow a plate to the full designation; cap the name at one line of 30 characters.
- identity 7. Distinct, with a clear concept (a staff map), and the left/right mirror for the armies is clever. But it looks like data-table UI, not a battle.
- vital_info 7. Side by hue plus cell position plus legend: strong. But the grey-washed "carried" cells (`S1a`, `S5`: many Union cells are a flat slate grey) look like a different side or "unknown" at a glance; the washed grey reads as a missing value rather than "old". The roman codes ("III/2/4 +13") are unreadable to a visitor. The spec still describes a stack of both sides as "Contact" (section 10) and the cell as "a contact"; that is the engagement claim the pitch review flagged; check that no on-screen text says it.
  8. Wash toward the side's own darker tone, never toward grey; grey must mean unknown.
  9. Replace "+13" with the counted-formation name ("II Corps, 14 records") or the legend's word; remove "contact" everywhere.
- phone 7. `S5` is legible and the sheet is clean, but the selected plate's gold leader runs off screen, the plate "I/3/3 +10" is cut by its own pin, and plates collide with the legend chip.
- popups 7. Opaque cards with a top rule, caps buttons: coherent, but the hover and unit cards are plain black boxes with the "MODELLED" outlined pill; there is no memorable language; and the narration, tune and chronicle panels add uppercase tracking everywhere.
  10. Give the cards one more cue of the language (the cell, the tab) so they look related to the marks.
- brand_fit 6. Serious, even austere, but it feels like a Bloomberg terminal, not a history site; the uppercase buttons, black chrome, amber signal.
  11. Warm the neutrals; set titles in the serif at 17 px (the 13 px title cap hurts the card).

Worst thing: the opaque black plates, which reproduce the floating chip look the owner hated, now with a dash gauge under every one.

Steal-worthy: the typographic discipline and the arm-in-a-cell symbol (white cross, slash, dot on a colour square): it reads at a glance at 20 px. Also the pixel-snapping at rest.

---

## D4: Dispatch (Editorial Annotation)

Seen: `S1a` and crop, `S1b` and crop, `S2` and crop, `S3`, `S4` and crop, `S5` phone, `S6`, `S7`, `S8`, motion strips.

What I see. The ground is a warm, ghosted aerial like a survey print, with contour lines and serif place names; marks are small coloured discs and rounded squares with a white glyph and a bold haloed code, standards for brigades and above with a swallow-tail or point and pips for echelon, crowds as a standard with a count and a soft pile behind. Cards are paper with a coloured top rule. It is warm, calm and a serious history-site look, and the one direction whose marks seem printed on the ground.

Scores

| line | score |
|---|---:|
| hierarchy | 7 |
| legibility | 9 |
| noise | 7 |
| polish | 7 |
| basemap_fit | 9 |
| identity | 8 |
| vital_info | 7 |
| phone | 7 |
| popups | 8 |
| brand_fit | 9 |

Why, and required fixes

- hierarchy 7. The standard is clearly the formation tier and the disc the unit tier, and the cream halo makes code text the star. But formation code (13/700) and unit code (12/600) are almost the same, and at z13.5 (`S1b`) the field is a uniform spray of 141 same-sized standards with number badges; there is no sense of which are the corps and which are tiny crowds.
  1. Scale the crowd standard with its count (clamped), or tint the standard strength by echelon, so a 12-record crowd is not the same as a 2-record crowd.
  2. Separate formation from unit lettering by weight and case, not 1 px of size.
- noise 7. Quiet overall. Faults: the hull is a translucent red wedge (`S4`) that reads as an attack arrow reaching across Union marks (it stretches from the 14th Virginia past Union standards to the 53rd Virginia); and the long red leader across the map from the card to the selected mark.
  3. Draw the hull as a dotted outline of the formation's own records only, or a convex hull limited to its own brigade, never a wedge; and shorten the leader.
- polish 7. Real defects in the cards: `S4` unit card prints "CONFEDERATE · REGIMENT" and then "infantry" wrapped and right-aligned on a second line; "Strength at this placement 261 of 435" wraps to "261 of / 435" in the tooltip (`S8`); "order of battle" wraps in three lines in the Documented row. The chrome bar overlaps map text at the top (a stray "th" next to the Paper switch; marks cut off under the top bar in `S1b`). The ageing fade turns many crowd marks slate and brown, so at overview a third of the field looks washed.
  4. Fix the three card wraps (kicker on one line, strength on one line, evidence label never wraps its basis).
  5. Make the ageing fade lighten toward the paper, not toward grey, so old Union and old Confederate marks stay different hues.
  6. Keep marks out from under the top bar and dock (the spec itself admits 12 percent hidden).
- identity 8. A distinct, mature voice (warm survey print plus serif place names), more cohesive than the other three. It is still, a little, "a good default": discs plus a swallow-tail.
- vital_info 7. Side by silhouette as well as colour (circle vs square) is the best colour-blind-safe scheme here; arm glyph reads; names grow from the code. But the crowd label breaks the honesty rule: the spec (section 7) and the on-screen legend (`S7`) say "Contact" for a crowd of both sides, which claims an engagement the data does not record and which the earlier review rejected; and the rest of the crowds are named by a lead record plus a "+" ("I/3/2 +", "II/4 +"), or by a bare numeral ("I", "III"), which says nothing to a visitor.
  7. Replace "Contact" with "Both sides" everywhere (spec, legend, tooltip, data), as D1 and D2 do. This is a truth fix, and a blocker.
  8. Name crowds by the formation or corps they share ("II Corps, 12 records") rather than a lead-record code and a plus.
- phone 7. `S5`: legible, readable marks, a good bottom sheet; the chrome bar eats a quarter of the map, a wide "Paper" dropdown sits where the marks are, and the sheet shows a big empty "infantry" line. Marks are tinted slate and cropped.
  9. Collapse the top bar to one row on phone and move the style switch into the menu.
- popups 8: paper cards with a tone rule and kicker, serif titles, evidence as dot plus word, a reading rail with a real title, the best legend in the set (`S7` is genuinely beautiful and useful). Subtract the card wraps above.
- brand_fit 9: closest to a serious, beautiful history site. The remaining gap is the generic Inter chrome next to the serif, a small mismatch.

Worst thing: the "Contact" crowd label and the red hull wedge that looks like an attack arrow, both of which make a claim the data does not support.

Steal-worthy: the paper ground with serif place names; the cream halo on code lettering; silhouette-plus-colour for side; the legend in the reading rail.

---

## Cross-cutting findings (all four)

1. The top bar and dock still sit on top of marks in every direction (D1 `s1b` top right, D2 `s1a` top left, D3 `S1a` bottom, D4 `S1b` top): "never hide vital information" is violated by the chrome. D4's own table says 12 percent at the overview. Fix by reserving a layout safe area, or fade marks under chrome and add a count badge.
2. Pins and leaders still look like glitches in all four. Rule: never draw a leader unless both ends are visible and the end is on a distinct mark.
3. Overview legibility is the shared weakness: the opening view should be the hero shot and in every direction it is either dots (D1), a banner wall (D2), a table of plates (D3) or a slate spray (D4). Whoever wins must redesign the zoom-13.5 view first.
4. Ageing: three of the four wash the colour toward grey; grey reads as missing data. Use lightness toward the paper or ground, keeping the hue.
5. Crowds: all four still print numbers on a mark that is a different weight from a single unit but not a different species; the best naming is D1's.

## Single best next step for the winner

Take D4's ground, halo type and legend; D1's crowd naming and quiet pips; D3's arm-in-a-cell glyph at small sizes; D2's lighting only under selected and formation marks.
