# Jury critic 3 of 3: hostile design critique of the four Battle Studio directions

Method. I am blind to the code. I judged only the PNG screenshots and the four SPEC.md files: D1 Quiet Cartographer, D2 Strategy Premium, D3 Field Manual, D4 Dispatch. I opened the opening view (S1a), the Wheatfield (S2), Cemetery Hill (S3), the close-up with a selected unit (S4), the 390 px phone shot (S5), the event and story cards (S6), the legend (S7) and the hover tooltip (S8) of each direction at full size and in the crops, plus D1's specimen sheet and day-atlas variant, D2's motion strip, D4's march strip, and the first prototype's `compare-z15.png` for reference. Scores are 1 to 10: 5 is mediocre, 8 is shippable at a good studio. No credit for effort, tests or sweeps: they show that nothing overlaps, not that anything is beautiful.

One finding is not subjective, so it comes first. The brief says every claim on screen must be true to the data, and the earlier crowd names ("Contact", "lead + k") were flagged because they claim an engagement and a lead the data do not record. D1 and D2 fixed this on purpose ("Both sides", "II Corps +2", "Union", "Confederate"). **D3 and D4 still ship it.** D4's SPEC section 7 names a crowd "Contact" when both sides are in it, otherwise "its lead record's code with a plus", and D4's own legend (S7) prints "a crowd of both sides (Contact)". D3 prints "x7" and "+4" ("the named unit and four others") and its SPEC and legend say "Contact". That is a binding-requirement failure in two of four directions, whatever they score below.

## Scores (1 to 10)

| line | D1 Quiet Cartographer | D2 Strategy Premium | D3 Field Manual | D4 Dispatch |
|---|---:|---:|---:|---:|
| hierarchy | 7 | 6 | 5 | 8 |
| legibility | 6 | 6 | 7 | 7 |
| noise | 8 | 4 | 4 | 6 |
| polish | 7 | 7 | 7 | 7 |
| basemap_fit | 8 | 6 | 3 | 8 |
| identity | 6 | 9 | 4 | 8 |
| vital_info | 5 | 6 | 6 | 7 |
| phone | 6 | 6 | 6 | 7 |
| popups | 6 | 7 | 7 | 7 |
| brand_fit | 7 | 5 | 4 | 9 |
| total (of 100) | 66 | 62 | 53 | 74 |

**Ranking: D4 > D1 > D2 > D3.** D4 is the only one that looks like it belongs on a history site and the only one whose opening view puts a readable code on every mark. D1 is the most restrained and the best at "no boxes", but its opening view is mute. D2 has the strongest identity and the worst taste for this subject. D3 is the original Field Manual skin tidied up: boxes with borders on a photograph, which is the owner's complaints 1, 3, 4 and 5 again.

Against the owner's seven complaints (looking at `compare-z15.png` first: every unit a symbol plate plus a caption chip, uniform weight, heavy and dashed borders, four recolours of one layout, a flat beige ground with floating chips, glitchy pins, a hard-to-read 1863 italic serif): all four now draw one object per unit. D1 and D4 have fixed 2, 3, 5 and 7. D2 fixed 1, 2 and 4, replaced 3 with ornament, and half-fixed 5. D3 fixed 1 and 7, kept 3 and 5 and, because it is the old Field Manual, fails 4. Pins and leader hairlines (6) remain in all four: small rings and thin lines that still read as specks at the opening zoom (visibly in D1 and D4, S1a).

---

## D1 Quiet Cartographer (night survey, day atlas)

What I see. Small ringed pips (disc, diamond, triangle) with haloed 11 px lettering and no plate; swallow-tail standards with 13 px side-tinted names for formations; counted crowd standards. A cool slate night ground (a day atlas variant exists and is the nicer of the two: pale grey sheet, navy and brick lettering, S2 day). The grammar is the calmest of the four and the specimen sheet is genuinely clean. At the opening zoom 13.5 (S1a), however, the view is about 100 dots and flags on a dark field: the pips carry no code or name, and the only words are on the formation standards.

**Worst thing.** The site's own opening view (zoom 13.5) is mute. A unit is a bare 11 px pip with no letters until zoom 14 and no name until 16 (the SPEC admits it: "the weakest point of the opening view"). The reader of the first screen cannot say which regiment any dot is. The design has traded the requirement "never hide vital information, short name readable" for calm.

**Does best, others should steal.** The halo-not-box lettering and the progressive-disclosure rule (a unit is always drawn, its words arrive with scale, the same mark grows its name), with the honest crowd vocabulary ("Both sides", "II Corps +2", the count labelled as records, never men). Also the pale day atlas as a second ground.

Line by line, with required fixes for anything under 8.

- hierarchy 7. Formation flags (13 px bold, tinted) clearly outrank pips, and selection and hover rings are quiet. But at 13.5 the eye has nowhere to go among 100 identical pips, and the long 13 px names ("3rd Bde, 3rd Div, 1st Corps") become the loudest objects on a map whose subject is the units. Fix 1: at zoom 13.5 and below, give every pip a code once there is room, or merge into named standards so the first view contains words for the units it shows. Fix 2: bring brigade names down a level at overview (a shorter form, or 11 px) so unit marks and formations are not competing.
- legibility 6. 11 px haloed lettering on a busy greyscale photograph is readable but thin; the grown names are set at 82 percent opacity in grey, and at 100 percent over wooded ground (S4) they are the weakest text on the screen. The phone shot (S5) puts "3rd Div, 2nd Corps" over a diagonal road name ("Emmitsburg Rd") so two labels cross. Fix 3: raise the grown-name opacity to full and add a wider halo step. Fix 4: keep ground labels (roads, streams) out of unit-label rectangles, as the layout already does for place names.
- noise 8. Very low. The remaining specks are the white pin rings and hairlines, drawn at zoom 13.5, which look like stray dust. Fix 5 (to reach 9): draw a displaced mark's pin only on hover and selection.
- polish 7. Consistent radii and weights, but the unknown-identity code is set in italic sans and so are the place names (S2 crop: "Cobb/INF", "16 GA" beside "Cemetery Ridge"); they are told apart only by a tiny ring marker. Hairline flag staffs vanish against the dark ground. The chrome (top bar, dock) is the prototype's, darkened; the dock is a three-row slab as heavy as a cluster of marks. Fix 6: mark unknown-identity codes with a device other than italic (a thin underline). Fix 7: give the staff a minimum 1.5 px stroke at DPR 1.
- basemap_fit 8. The best of the four after D4: no boxes, halos, a calm desaturated ground, lettering that sits in the photograph. Held back because the night grade is a flat blue-grey that flattens the hill relief the owner asked for (complaint 5).
- identity 6. A refined Mapbox or Apple Maps grammar. It is distinct from the other three only by being the quietest; nothing about it is memorable. Fix 8: one signature device (a recognisable echelon or side silhouette) that survives at 13.5.
- vital_info 5. Every unit is represented (373 marks, 28 counted crowds standing for 106 units, so about 80 percent of units keep their own mark) and side and arm read by hue and shape, but at the opening zoom there is no short name on those marks, and no strength state anywhere except a hairline on the selected unit. Fix 1 above, plus Fix 9: show the stale (hollow) state at overview with a ring thick enough to see; at 11 px it is nearly invisible.
- phone 6. The sheet takes about half the viewport, the marks are small but legible, and the label and road-name collision above appears. The bare-pip problem is worse on a 390 px screen. Fix 10: on a phone, start the code at zoom 13.5, not 14.
- popups 6. Dark glass cards in one language, and the legend moved into the rail (a good fix: it now opens), anchored with a hairline and off the marks. But there are four interface type sizes (11, 13, 16, 22), the cards are the prototype's cards in a dark coat, and the tooltip leader (S4) runs far across the map. Nothing in the popups is memorable. Fix 11: cut the interface to three sizes and give the card a distinctive head (kicker, title, rule) so it belongs to the same family as the marks.
- brand_fit 7. Serious and calm, but cold: a night survey on a history site reads as a defence ops room. The day atlas is better. Fix 12: make the day atlas the default.

---

## D2 Strategy Premium

What I see. Every unit is a small cloth banner on a gilt staff: a hoist band with a white crossed-musket, sabre or gun glyph, an ivory code, a gold strength line, a drop shadow baked toward the south-east. Crowds are stacks of banners with a round gilt count pill and the word "Union", "Confederate", "Both sides" or "Part contested". Popups are navy with gold hairlines, serif titles, outlined evidence pills and a small ribbon bookmark on the top edge of event and story cards. It is the one direction with a real point of view, and it is recognisably a campaign map.

**Worst thing.** Ornament on every one of 125 marks at the opening zoom: bevel, gradient, gloss, rim, gilt frame, finial, stacked shadow and pill. It is the opposite of "calm, quiet, no heavy borders" and, for a serious history site, reads as a game, not scholarship. And 84 percent of the field (381 of 451 records) sits behind crowds that say only "Union" and a number, which tells the reader nothing about which formation they are looking at.

**Does best, others should steal.** The per-unit information design: an arm glyph (muskets, sabre, gun) that reads at a glance, the strength line on the banner edge, echelon by banner size, and the family of popups (ribbon, serif title, outlined evidence pills). The evidence pill is the best treatment of the six labels in any direction.

- hierarchy 6. Size by echelon is a good idea (22, 24, 30, 34, 38 px), but everything is lit, glossed and gilded, so crowds and units are equally loud; the gilt pills dominate the field in S1a and the eye goes to counts, not to formations. Fix 1: drop the gloss and gradient from unit banners and keep gilt for formations only. Fix 2: make crowd marks one tonal step quieter than formation standards.
- legibility 6. 11 px condensed ivory type on a gradient cloth ("5 MI", "17 MS" in S2) is the smallest, thinnest text of the four; "Part contested" in S1a sits on a gold-to-red split so part of the word crosses the colour edge. Place names are heavy uppercase with a hard dark outline ("CEMETERY RIDGE (CENTRAL)" in the phone shot) that looks like a sticker. Fix 3: the banner code should be 12 px at weight 600 on a flat ink ground, not a gradient. Fix 4: split-colour crowd names get a flat dark plate behind the text. Fix 5: place names in the same halo language as the rest, not an outline stroke.
- noise 4. Second highest. Bevel, rim, shadow, finial, hoist band with a glyph, dotted rule for unknown identity, strength line, three-banner stack, pill: eleven devices per mark. Fix 6: halve them. A unit is a flat banner, a side colour, a glyph and a code; the rest moves to hover.
- polish 7. The craft is high and consistent, with a well-judged north-west light. The cost is kitsch. Fix 7: replace the glossy gradient with a flat cloth colour and a single 1 px edge.
- basemap_fit 6. The baked shadows and light direction are the only place a direction gives marks depth on the terrain, and the dark desaturated aerial supports them. But the banners are opaque, glossy stickers that float above the ground like game tokens. Fix 8: let the photograph show through (cloth at about 90 percent opacity, softer shadow).
- identity 9. Unmistakable and memorable; nobody will take it for a recolour.
- vital_info 6. Best per-unit content: side, arm, code, strength and echelon all readable. But crowds are generic ("Union" 16), so the formation is not stated. Fix 9: crowds name the formation or corps they share ("II Corps"), as D1 does. Fix 10: names unfold only from zoom 15.6, which is too late; start at 15.
- phone 6. Banners are large and legible, but the shot (S5) clips them at the left edge ("3 Union", "12 Confederate"), the sheet takes half the screen, and the outlined "MODELLED" chip in the top bar is as loud as the title. Fix 11: keep marks inside a safe area on narrow screens, and quiet the chip.
- popups 7. Strong and coherent: navy plus gilt hairline, serif titles, ribbon tab, outlined evidence pills, a leader that ends on a ring. The leader in S6 is a long gold diagonal across the map, and the ribbons are decorative. Fix 12: drop the ribbon, keep the pill, shorten long leaders.
- brand_fit 5. It looks like a game. If the site is to be taken seriously by historians, the gilt reads as costume. Fix 13: if this direction is chosen, desaturate the gold to a quiet brass and remove the gloss, and it moves toward D4's seriousness.

---

## D3 Field Manual

What I see. A rectangular plate per unit: a coloured cell (Union left, Confederate right, mirrored), a white symbol in the cell (X for infantry, slash for cavalry, dot for artillery), a bold code, a muted tail ("x7", "+18"), a 3 px gauge with ticks under the code, a small echelon tab ("X", "XX", "XXX"), all inside a white keyline. At the opening zoom the field is about 120 near-identical dark plates; names appear from zoom 16 as long plates. It is clean and legible. It is also, unmistakably, the first prototype's Field Manual skin with its dashed edges removed.

**Worst thing.** It is a field of opaque boxes with borders pinned to a photograph. In S1a only 14 percent of units stand alone as plates, the other 86 percent are "+18"-style stacks: the exact "floating chips on a ground" the owner called dogshit, in a dark skin. And its crowd names still say "Contact" (legend, SPEC) and "+4 = the named unit and four others".

**Does best, others should steal.** Contrast and discipline: white bold on near-black is the most legible text of the four on any ground; the strict grid; and the mirrored side cue (Confederate cell on the right) as a second, hue-independent side signal, which none of the others has in this form. The popup set is also the most complete (eleven extra popups shown: toasts, narration, tuning studio, about, chronicle).

- hierarchy 5. Plates are 20 px for units and 22 to 26 for formations with a 10 px tab above: not enough difference in weight. At 13.5 every plate is a dark rectangle with a white keyline, no formation stands out, and the eye has nowhere to go. Fix 1: formations get a different silhouette, not a plate 2 px taller. Fix 2: stacks must not look like units with a "+N" tail; give them their own shape. Fix 3: the echelon tab ("XX" at about 8 px) is a badge under the stated floor; fold the echelon into the plate at 11 px.
- legibility 7. The best contrast. Minus: the ticked gauge under each plate reads as a dashed underline, and the tabs are tiny; plates with full names ("Third Brigade, Third Division, First Corps (Stannard's Vermont Brigade)") are 600 px wide and run off the screen edge in S8. Fix 4: cap names at 28 characters and use the compact designation. Fix 5: remove the ticks from the gauge (a plain bar).
- noise 4. Plate, keyline, cell, symbol, code, tail, gauge with ticks, tab, stack edge, pin: ten devices per mark, times 120. The dashed-looking gauge is the thing the owner hated, back again. Fix 6: remove the gauge from unselected marks and keep one outline weight.
- polish 7. Strict grid, consistent radii, consistent type, serif for ground names and sans for marks. A real design system, with the polish of a spreadsheet.
- basemap_fit 3. Worst of the four. Opaque keylined plates sit on the photograph like stickers; the terrain and light do not touch them. Fix 7: no opaque plates. Use a halo-lettered mark with a small cell (D1 or D4 grammar) or a plate at no more than 70 percent.
- identity 4. This is the old Field Manual with the dashes taken off; the owner's complaint 4 ("recolours") applies. Fix 8: if it is kept, its distinguishing device must be the mirrored side cell and the data-ink discipline, drawn without plates.
- vital_info 6. Every unit is a plate with symbol, side and code, so on paper it is complete. But 86 percent of units hide behind "I/3 +18" tails that name a lead and a count, formation cells are blank grey or blue squares, and the gauge's ticks encode nothing a reader can use. Fix 9: crowds named by what members share, not lead plus count. Fix 10: remove "Contact" everywhere.
- phone 6. The plates survive on a 390 px screen and the white X is a clear signal, and the sheet is a clean amber-ruled panel. But a plate with gauge and tab at 14.5 fills about a third of the width, so about six marks fit.
- popups 7. Opaque, ruled in amber, uppercase labelled buttons, outlined amber evidence pills: consistent and the most complete. Long amber leaders cross the map (S6). The set is utilitarian: a Bloomberg terminal, not a battle. Fix 11: shorten leaders and let cards sit nearer the mark they describe.
- brand_fit 4. An ops dashboard. Serious, not beautiful, not historical. Fix 12: a warmer ground and no keyline, which is to say a different design.

---

## D4 Dispatch (the editorial annotation)

What I see. On a ghosted, warm paper-toned aerial: a bold disc for each regiment or battery (white arm glyph, white ring, dark hairline), a swallow-tailed (Union) or pointed (Confederate) standard for a brigade, division or corps with one, two or three pips for the echelon, and a standard carrying a count, a pile behind it and a lead code with a "+" for a crowd. Every mark has its code in 12 or 13 px bold with a paper-coloured halo, and names grow in place at close zoom. Stale positions drain to the grey of the same lightness. Cards are paper with a thin coloured rule, serif titles, small-caps kickers and evidence as a dot and a word. It is the only direction where the opening view carries a readable code on every mark and looks like a printed survey.

**Worst thing.** The crowd naming breaks the binding rule: "Contact" and "lead record plus a plus" are exactly what the brief says the earlier review flagged as claims the data do not make, and they are in the SPEC and the legend. On top of that, at the opening zoom 61 crowd standards stand for 375 of the 451 records (83 percent), so the first view is a field of numbered flags; and 12 percent of marks (14 of 117 at the whole-field view) sit under the top bar and dock, which the SPEC itself calls "not solved".

**Does best, others should steal.** The ground and the silhouette. The paper-toned aerial makes the marks read as ink on a survey print; the notch-versus-point flag gives a side cue that survives greyscale; the one, two or three pips for the echelon are the neatest hierarchy device of the four. The hover hull (a soft translucent shape over the formation's true positions) is the best explanation of what a crowd stands for.

- hierarchy 8. Standards over discs over codes, with echelon pips, is the clearest ladder in the set, and the eye lands on the formations. Held back from 9 because at 13.5 the numbered crowd flags are the loudest things on the screen and carry the least information.
- legibility 7. Bold haloed type on paper gives good contrast in the full screenshots and the crops. Lost points: the faded (stale) marks go to muddy slate and brown that read at a glance as a third side (S1a: "III/4/2", "II/1" greys); the tooltip wraps its figures ("261 of / 435", "order of / battle" over three lines); the unit card's "infantry" is right-aligned under the kicker and looks like a misplaced line. Fix 1: stale marks drain to a lighter tint of the side hue, not to grey. Fix 2: set the strength line on one row in cards and tooltips (tabular figures, no wrap). Fix 3: align the card kicker line.
- noise 6. Calm for a map this dense, but at 13.5 the scatter of small pin rings and hairline leaders around crowds (S1a, top right and centre) are specks, and the hover hull (S4) paints a long red wedge across six neighbours, plus a long red leader across about 360 px to the card. Fix 4: show pins and leaders only on hover and selection, or fade them below zoom 14. Fix 5: soften the hull (about 10 percent, no rim) and cap the leader length.
- polish 7. Good typographic discipline (Inter plus Source Serif 4, one numeral style), consistent rule-and-kicker cards. Defects: fragments of marks peek out between the top-bar segments (slivers beside the Paper control in S4 and S1a), the top bar's text truncates ("can...") when the legend rail is open, and the vertical road name "Hancock Av" runs through two marks in S4. Fix 6: reserve the top bar and dock in the layout (the engine already treats cards as occupied ground; treat chrome the same). Fix 7: keep ground labels off mark rectangles.
- basemap_fit 8. Best of the four for a history site. One point off because the ghosted paper treatment lowers the terrain relief (the reader sees a toned map, not a battlefield) and the white ring plus hairline on every disc is a small sticker device.
- identity 8. Distinct and recognisable: the swallow-tail and the pointed pennant, the pips, the paper, the serif. Not a recolour. Held back from 9 by the generic disc.
- vital_info 7. Every mark has a code at every zoom I looked at, side by silhouette and hue, arm by glyph, echelon by pips, age by drain. The "+", "Contact" and lead code on crowds mislead (truth rule), and strength is only on selection (a ring of quarters). Fix 8: crowd names become shared-formation words ("II Corps"), no "Contact", no lead "+". Fix 9: say in the legend what the count and the "+" mean at the mark (records, not men).
- phone 7. The best phone shot: legible standards with counts at zoom 14.5, a clean serif sheet with the chain of command and evidence labels. The top bar covers a mark, and the map above the sheet is only about 45 percent of the screen. Fix 10: shrink the top bar on phones and keep marks out from under it.
- popups 7. Paper cards, a coloured top rule, caps kicker, serif title, evidence dot and word, hull on hover: a coherent family with the strongest typographic voice. Minus the wraps and alignment slips above, and marks under the chrome. Fix 11: align and unwrap the card rows (see legibility). Fix 12: no card, rail or bar over a mark.
- brand_fit 9. Serious, warm, editorial. The one that looks like a newspaper graphic about Gettysburg.

---

## What to steal, as a build list

1. D1: halo-not-box lettering and the "same mark grows its name" disclosure, with its honest crowd words.
2. D2: arm glyph, strength line and the evidence pill.
3. D3: strict grid, mirrored side cue, highest-contrast ink, complete popup set.
4. D4: the paper ground, silhouette plus pips for echelon, the hover hull, the serif card voice.

## Recommendation

Build on D4. Before it ships it must (a) lose "Contact" and the lead-plus naming; (b) show a short name on every mark at the opening zoom with fewer, more specific crowd standards (D1's approach, about 80 percent of units standing alone, is the target if the labels can be earned at 13.5); (c) stop draining stale marks to grey; (d) keep marks out from under the chrome; and (e) take D2's arm glyph and strength line, D1's lettering rule and D3's mirrored cue as an optional second side signal. D1 is the fallback: its restraint is right and it needs words at overview. D3 should be dropped: it fails the owner's brief by being the thing the owner rejected, in a dark skin.
