# Round 1, critic 3 of 3: hostile design critique of the two surviving Battle Studio directions

Scope: only the PNG and JPG files in `d4-editorial/shots/round-1/` and `d1-quiet-cartographer/shots/round-1/` (every scene at full size, the 200-percent and crop images, the specimens, the colour-vision sheets, the popups, the motion strips) and the two SPEC.md files. I did not open any code and did not read the other critics.

Bar: 10 means I cannot name one thing to change. I can name many things in both directions, so nothing here is a 10, and most lines are well under 9.

What I tried before scoring (so the scores are earned, not guessed): the 200-percent crops of the busiest field in both directions (edges, halo thickness, flag tail geometry, pip alignment); every label against the road names under it; selection pills against the text they are meant to enclose; every leader line against the label it ends on; kerning and weight of the two type systems on the dark and the light ground; the top and bottom edges of every scene for clipped marks; what the dock, the clock card, the minimap and the legend button cover; the phone images for touch size and for what the sheet and the dock hide; the eight-frame strips frame by frame for dead frames, ghosts and layout reflow; the specimens for age and contrast; the colour-vision sheets for whether the CVD claim is a simulation.

---

## D4 Editorial (Dispatch)

### What is wrong

1. **The opening scene is a wall of the same salmon and blue flags saying the same words.** SPEC section 13 admits it: about 87 percent of the records stand in crowds at the opening zoom. The picture shows it: "II Corps & others" eight times, "Union, no formation" six times, "III Corps & others" five times (S1a, S1b). A crowd is only 25x17 against a brigade standard of 28x18, so formation and crowd are nearly one shape; the hierarchy the SPEC promises (formation louder than crowd) is a colour of text, not a shape. The eye cannot find the army's structure; it sees confetti.
2. **A crowd does not "still say what it stands for".** "Union, no formation" is a negative description of an unknown heap (is it 7 regiments, 7 batteries, who?). "I Corps & others" gives no count of the others, no arm, no clue to where the 26 are. The merged mark says a number and a corps, never the thing the owner asked for: what the merged tiles are. The same name also appears on two different marks in one view ("Pickett's Div, I Corps" 5 and 9 in S1b; "Armistead's Bde" a selected standard and a crowd of 4 and another of 2 in S4/S6), which reads as a bug.
3. **The selection treatment is mis-drawn at 200 percent.** The salmon selection pill under "53rd Virginia Infantry" ends mid-name (S4 crop, growth strip frames 4 to 7: the pill spans about 140 of 300 px of the label). The red leader line then runs through the amber ring and through the pill and in the rail composite (popup 09) on through the label text to the panel edge. A grey wedge (a reach cone?) fans from the selected mark up toward Hall's Brigade with no legend entry: an unexplained smear on a design whose first principle is "no gradient".
4. **"Nothing opaque lies on the map" is false in every scene.** The SPEC says the interface is a frame and not a layer. The pictures show an opaque clock card (top left or top right), an opaque Legend button (bottom left) and an opaque minimap (bottom right) sitting on the map in every scene, plus the floating unit card, the welcome card (popup 06), the tour card (popup 05), the toasts. The welcome copy itself says the renderer "never lets a tile hide another" while the card hides the left third of the screen (marks cut at "I/3/1", "orps"). The chrome-cover table (0 hidden) only counts what the layout steered around; the stage is still cluttered with six surfaces.
5. **Marks are guillotined by the frame at the default view.** S1a: "12 NC" cut by the masthead, "16 I Corps" cut by the dock, I/1/2W cut at the left; popup 06: "10 Union, no formation" half under the masthead. "Cut by the edge as by any screen" is true for a pan, but the hero screenshot should be framed so nothing is sliced. Counts of 5, 4, 6, 7 per scene are in the SPEC itself.
6. **Faded (aged) marks look disabled, not old.** "Baxter's Brigade", "Paul's Brigade", "Huey's Brigade" (S3, S4): pale blue plate with a near-black dot, the plate's contrast against the paper ground is under 1.5:1 and the text is saturated blue on top of it, so the ink and the plate disagree. The specimen's "age 100 percent" (a pale grey-blue disc) is the weakest object in the sheet. The text test passes 4.5:1 for the label, not for the mark.
7. **Popups: restyled well, but they cover the ground and the copy is raw.** S6 shows four cards open at once (changes, command passes, critical, story) over the field, with the Command card cramped (heading, strapline and the cross-out in three different line heights; "Bull" and "Lee" are orphans on their own line in S6 and popup 09). Raw data caps ("ARMISTEAD LEADS MEN OVER THE WALL.", "BIGELOW'S TROSTLE FARM WITHDRAWAL. Bigelow's 9th..." truncated mid-word) sit in the middle of a serif and sans card system. Popup 09 shows the same unit twice at once (floating card and the rail), and the rail repeats DOCUMENTED / MODELLED on every row, which is noise.
8. **The legend rail crops the map instead of resizing it** (S7, popup 09, popup 11: "111th New York Volunteer Inf", "125th New York Volunt", "39th New" are cut by the rail), so opening a panel hides vital names. The anatomy figure is a good idea; its numbered leaders cross the glyphs they number (1 and 3 cross the circle).
9. **Phone.** The peek sheet gives a 61-percent map (S5), which is the best phone figure of the two. But the opaque Legend button sits on top of the map at top left, the selected object is a crowd ("12 I & III Corps") while the sheet says "53rd Virginia Infantry" (the selected thing and the card disagree on the page), a red leader runs to the screen edge, and the unlabelled red and blue dots (pins) mean nothing to a first-time viewer. Discs are 15 px; a thumb target is not.
10. **Motion strips show dead time and ghosts.** Arrival strip: frames 0 to 2 (240 ms) are empty ground, the mark is a grey ghost at frames 3 and 4, and the promised "ring leaves it" is not visible at any frame. Deployment strip: for five frames only the crowd mark is in the crop and the members are not visible until frame 5 as grey ghosts, so the claim "the members glide apart, no two solid marks overlap" is not shown by the picture. March strip: a flag "8 1st Div, II Corp" fades to a translucent plate with ghost text over the ground for frames 4 to 7 (an ugly semi-transparent overlap of plate, text and road).

### Numbered required fixes (D4)

1. Cut the number of crowds at the opening zoom to something a person can read as a battle (the SPEC's own target was about 20 percent, the picture is 87). Make a crowd's shape different from a brigade's (not a near-identical pentagon) and put a visible hierarchy of size (corps > division > brigade > crowd) instead of text colour only.
2. Replace "Union, no formation" and "X Corps & others" with a phrase that names the contents ("7 regiments, 2 batteries, 1 Corps"), keep it to one pattern, and never give two different marks the same name in one view.
3. Redraw the selection: pill sized to the whole label (growth strip), leader line ending at the pill edge and never crossing the amber ring or the text, and either label or remove the grey cone.
4. Remove opaque surfaces from the stage: move the clock into the masthead or dock, the Legend into the top bar, the minimap into the rail; make welcome, tour and toast cards live in the rail or in the free frame, not on the ground.
5. Frame the opening scenes so no mark is cut at an edge; show a mark leaving as a fade, not a slice.
6. Redesign the age device so a faded mark keeps a visible edge: plate 3:1 against the ground, ink and plate agree; show the 100-percent age in a state that still says "Union".
7. Limit simultaneous cards to one stack with one rhythm: fixed line heights, no orphans, sentence case, no truncation mid-word; show a unit once (floating or rail).
8. The rail must resize the stage (push the map left), never cover it.
9. Phone: no opaque control on the map; the selected thing must be the thing the sheet describes; touch targets of at least 44 px (hit area, drawn size may stay); explain or remove the pins.
10. Motion strips: no empty frames; a visible ring in the arrival; show the members of a deployment gliding out; no semi-transparent text overlap while a mark fades.

### What is best in D4

The frame idea (masthead, stage, dock, nothing laid over the map except the items above): it is the one decision that makes the opening scene look like a document rather than a game overlay and makes the 0-hidden claim credible. The pale paper ground with brown relief and the serif masthead (S2, S3, S5) read as a printed survey sheet; the wipe-out name growth is a good device; evidence labels in the rail are used as a system; the phone sheet is better than the other direction's.

---

## D1 Quiet Cartographer

### What is wrong

1. **Marks are hidden under the interface, and the SPEC admits it.** The dock is a glass panel laid on the map: ghosted "I/1/7" and "Tilton's Bde" sit under it in S1a and the night view, "Jones's Bde" and "Candy's Bde" under it in S3, a faded "Early's Div, 2nd Corps" shows through the top bar in S3. The SPEC counts 12 of 162 marks on the interface in the opening scene (22 within 16 px) and calls that honest. The owner's requirement is that tiles never hide vital information; "dissolve before the bar" is still hiding, and the screenshots show ghost text under glass.
2. **Unit text and ground labels collide.** S3: "Taneytown Rd", "Baltimore Pike", "Clock..on Ave" and "...ghe Ave" are overprinted by "14 IN", "31 GA", "25 OH", "2nd Div, 11th Corps" and "Louisiana Tigers"; S4: "Hancock Ave" runs through "1st Div, 2nd Corps"; popup 05: "Herbst Woods (McPherson's Woods)", "Herr Ridge" and the Willoughby Run label are overprinted by each other. The SPEC says a place name is never set across these edges; the aerial's own street names are, and they are not suppressed.
3. **Duplicates and a confusing count.** "Garnett's Bde" twice, "Iverson's Bde" twice, "Armistead's Bde 2 / 3 / 5", "Harrow's Bde" twice (S1a, S8, strip-select): a crowd that carries the brigade's name next to the brigade's own standard. A reader will think the army has two Garnetts. And the "I/1/7" style codes in the same view mix with names ("Lang commanding", "III Corps, 5 unlisted, 4 contested"): one mark, four vocabularies.
4. **The select strip does not show what its title claims, and shows reflow.** Title: "the 53rd Virginia grows its name and its strength hairline". Frame 1 has "53 VA" and "Armistead's Bde 3"; frames 2 to 8 have "Armistead's Bde 5" selected and no 53 VA anywhere: the selected unit has vanished into a crowd and the count changed from 3 to 5 on click. Either the strip shows the wrong unit or selection reflows the layout; both are failures and the SPEC itself reports a median 44 frames to rest after a click, up to 200.
5. **Selected-pill artifact.** In the 200-percent s4 crop, the pill "71st Pennsylvania Infantry" carries a thick black dash jammed at its right end (the strength hairline): unlabelled, overweight, and nothing explains it to a viewer; the hair then continues out through the leader. The ground under the pill is the same grey as the pill's tint, so the pill barely reads.
6. **Legibility on the aerial.** Regular-weight 11 to 12 px Source Sans in mid-blue (the crowd phrases "XI Corps, 1 unlisted", the lighter part of "II Corps, 5 unlisted") on grey photography is the weakest text in either direction; the pale ghost flags (Huey's Bde, I/1/7, Tilton's Bde) are close to invisible; the timeline's "July 1" label is overprinted by the activity ticks on desktop and phone.
7. **Noise.** The opening scene prints about 100 labels at once (a code on every pip from zoom 13), plus crowd phrases of up to 40 characters ("III Corps, 5 unlisted, 4 contested") that run into the next mark's box. The map is calm per mark but busy as a page. 
8. **Phone.** The top bar truncates ("candidat..."), the sheet is cut at "Units" by the dock which floats over its bottom (event sheet, popup 17), the 11-px pips are far below a thumb target, a marks column is clipped at the left ("emper's Bde", "Davis's Bde"), and the legend button floats over the map. The sheet's headline is also all-caps raw data.
9. **Popups: consistent glass, but leaders cross the map and labels.** Story card in S6: a long brown leader runs from the card across the field and through the label "Fry commanding" and the crowd of Union pips to a point in the street; popup 05 draws the leader through the pill, past the card and to the rail edge. The legend rail has 17 rows of specimens with Documented, Computed, Design, Contested chips on every line (read like a data dictionary), is cut at the bottom with no scroll hint, and covers the top bar (the Day/Night control disappears).
10. **Motion strips are too small to judge and show dead time.** The march strip's 2 MS and 55 NC pips enter from the left edge of the crop unlabelled and unannounced; the deployment strip is empty for four of eight frames (200 ms) and then shows nine labelless pips; the strips are 100-percent crops at a width where the marks are 10 px tall, and the dark strip chrome is another visual language from the product.

### Numbered required fixes (D1)

1. Make the dock and the bars a frame (as D4 does) or reserve the stage: no mark may exist under glass at any zoom, and no ghost may show through a bar.
2. Suppress or relocate the basemap's own street and place names where a unit label stands; pick one label layer and own it.
3. Give a crowd a name that is never the same string as a formation on the screen; one vocabulary per mark class; wrap or cap crowd phrases at one short line.
4. Make selecting a mark never merge or re-count anything at zoom 13 to 16; rebuild the select strip with the right unit and show the pill growing, the hairline drawing, and nothing else moving.
5. Redraw the selection pill and the strength hairline (a labelled hairline with a tick, not a dash at the end; a pill tint that separates from the ground).
6. Set label text at 12 px minimum in a heavier weight for the blue and the rust, drop the paler crowd weight, ink the ghost flags so that every one clears 3:1, and move the timeline day labels off the ticks.
7. Cut the opening scene's label count by half: codes from zoom 14, not 13, and formation names first.
8. Phone: top bar that fits (no ellipsis), sheet that scrolls above the dock (not under it), 44 px hit areas.
9. Cards: leaders that stop at the mark's edge, never across a label, shorter and underlaid by paper; legend as a three-row key with a link to the full list; rail resizes the map.
10. Strips: full-width frames at 200 percent, no dead frames, labelled arrivals, and a light page matching the product.

### What is best in D1

The facing devices are the one genuinely new idea in the field: Union flags read rightward with a swallow-tail, Confederate leftward with a point, so a side is legible with no colour (the greyscale panel proves it); the colour-vision sheet is a real Machado simulation, which D4's CVD specimen is not (it shows the unsimulated colours); the pip standing exactly on the unit with a code beside it is a more honest mark than a plate; the night ground (s1a night, 200 percent) is the most beautiful image in either folder; crowd phrases like "unlisted" and "contested" carry more information than D4's "no formation".

---

## Scores (1 to 10)

| Line | D4 Editorial | D1 Quiet Cartographer |
|---|---:|---:|
| hierarchy | 6.5 | 7.5 |
| legibility | 8 | 6.5 |
| noise | 5.5 | 6 |
| polish | 7 | 6 |
| basemap_fit | 8 | 7.5 |
| identity | 7.5 | 8 |
| vital_info | 6 | 6.5 |
| phone | 7 | 5.5 |
| popups | 7 | 6.5 |
| motion | 6 | 6 |
| brand_fit | 7.5 | 7 |
| mean | 6.9 | 6.6 |

Ranking: D4 Editorial > D1 Quiet Cartographer, narrowly, because its frame keeps marks out from under the interface and its phone and rail are the more finished, while D1's facing device, its night ground and its CVD work are what D4 should steal. Neither passes. Taken together, the best direction is D4's frame, D1's facing and crowd phrasing, and the fixes above.
