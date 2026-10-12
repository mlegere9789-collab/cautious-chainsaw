# Round 1, hostile design critic 2 of 3

Judged blind, from the PNGs and JPGs only (every scene at full size, the 200-percent and crop images, the strips, the specimens, the popups) and the two SPEC.md files. Directions: D4 Dispatch editorial (`d4-editorial/shots/round-1`), D1 Quiet Cartographer (`d1-quiet-cartographer/shots/round-1`). I did not read the code or the other critics, and I did not anchor on round 0.

Bar: 10 means I cannot name one thing to change. I could name something on every line of both directions, so no line is a 10 and none is a 9 either, except where noted. Numbered fixes are required.

## What I tried to break (and what broke)

- Edges at 200 percent: the busiest-area crops, the selected-mark crops, the day and night crops. Found: road-name collisions in D1, a box behind the selected label and a grey wedge in D4.
- Alignment and kerning: crowd counts in flags, formation names, card kickers, evidence labels, timeline labels. Found: D1 timeline day labels sit on the event bars; D4 card kicker has a stray square above it.
- Shadow and halo consistency: both consistent. No flaw worth a fix, except D1 halos on pale text (place names) are weak on the grey ground.
- Colour harmony: D4 sepia paper is warm and calm but every aged mark is a pastel on a tan ground; D1 grey day ground plus blue and vermilion is cleaner.
- Touch targets: D4 card chrome icons (panel, pin, close) are about 16 px; D1 phone buttons are fine, D1 desktop card icons are also small.
- Crowd handling at 13.5: counted marks, what they say, whether the same name repeats.
- Popup placement: leaders that cross labels, cards that cover marks, cards that stack awkwardly.
- Motion strips: whether each strip actually shows the thing it is titled with.

## D4 Dispatch editorial

Scores: hierarchy 7, legibility 8, noise 6, polish 6, basemap_fit 7, identity 7, vital_info 5, phone 8, popups 7, motion 5, brand_fit 7.

What is wrong

1. The opening view is a field of one repeated pill. S1a is 110 marks, 47 of them crowds, and the crowd lettering is the same few phrases over and over: "Union, no formation", "II Corps & others", "III Corps & others", "I & III Corps & others". "& others" and "no formation" are the data's bookkeeping, not what a viewer needs to know. The SPEC admits 87 percent of records stand in crowds at 13.5. A crowd that says "& others" does not "still say what it stands for": it says what it fails to say. The same name also appears on different marks (Pickett's Div, I Corps twice in S1b; Barksdale's Bde twice in S2), which is ambiguous.
2. Two naming systems for the same kind of object. In S2 and S3 some brigades are "III/2", "II/3/1", "XI/1" (Roman codes) while neighbours are "3rd Bde, 2nd Div, III Corps". A viewer cannot tell a code from a name from a crowd. The SPEC lists the Roman code at overview as a known weakness; it is also still there at zoom 15 and 16.5.
3. Marks are cut by the frame. The "interface is a frame, not a layer" claim is true for the dock and masthead, but marks are sliced by their edge: S1a "12 NC", "7 Union, no formation" and "II/3/5" at the top, S3 three mark slivers under the masthead, S2 "48th Alabama Infantry" and "3rd Bde, 1st Div, V Corps" half-cut above the dock, and a column of nine formation marks (VI/1/1 to VI/3/3) jammed against the right edge in S2 like a list. A cut label is hidden vital information. The count "5 of 72 cut" is a count, not an excuse.
4. The legend rail clips names. In S7 "111th New York Volunteer Inf", "125th New York Volunt", "126th New York" are chopped at the rail edge, and in S6 and S8 "12th New Jersey Volunteer Infant" at the right screen edge. The narration card and the tune panel also lie over marks (welcome: "I/3/1", "I/3/2", "III Corps" are half under the card; tune: "39th N" cut). "Tiles never obscure each other" is violated by popups, which the brief names as in scope.
5. The selected state draws a box. In S4, S6, S8 and the tune screenshot the selected or hovered mark has a pale salmon rounded rectangle with a red outline behind its label. This is the "plate plus caption box" the owner banned, only paler. The "highlighter" pen boxes on subject marks in S6 and the welcome shot (a red-bordered salmon box around "3rd Bde, 3rd Div, II Corps" and "34 III & V Corps & others") are the same thing.
6. A grey wedge. In S4 and the phone S5 the hull of the selected unit's brigade is a long, thin grey triangle tapering to the selected mark, running through other marks. The SPEC says explicitly it must not read as an arrow or taper. It reads as a beam or an attack cone, and with a three-record brigade the hull is always a skinny triangle. A claim about 1863 the data does not make.
7. Leader lines are hard red rules. S4 has a 1.2 px red horizontal line running about 370 px from card to mark; S6 has a red line through "Hall's Brigade"-type labels; the welcome shot's leader (about 320 px) runs across the map past other marks; the growth strip shows the tooltip leader slicing through the name "53rd Virginia Infantry" itself. These cross text, and the SPEC's 300 px cap is not honoured in the welcome shot.
8. The glyph vocabulary reads as UI. An X inside a circle (Union infantry) and an X inside a red rounded square (Confederate infantry) are, at a glance, "close" and "error" icons. The APP-6 convention is right on paper; on screen it is a semantic collision for every viewer who is not a staff officer. Meanwhile the strength ring on every disc (four arcs) is invisible at 1x in all screenshots; it costs ring weight and shows nothing.
9. Age. At 100 percent age (specimen) the blue and red discs go to a washed grey-blue and grey-pink with a dark glyph; on the tan ground the pale tint and the pale ground are close. In S1a most marks are in this state, so the opening view is mostly low-contrast pastel and the few saturated marks (CAV/1, I/3) shout for no reason except that they are fresh. Fresh and aged are a hierarchy of recency, but the viewer reads it as importance.
10. Cards. The unit card kicker has a stray hollow square on its own line above "CONFEDERATE · INFANTRY" (S4, tune). The chain "Armistead's Brigade · Pickett's Division, I Corps" wraps and leaves "I Corps" as an orphan (S4, tune, phone peek is fine). "Command passes" cards have tight leading (about 1.0) in the brigade line against 1.55 in the body, and "Lieutenant Colonel James / Bull" and "Brigadier General Fitzhugh / Lee" orphan a surname. The critical card sets its first sentence in capitals as prose. The events stack with arbitrary widths and a 16 px gap (S6, welcome) so they look dropped, not composed. "Details" is a dark button and "Show on map" an orange underlined link: two grammars for two siblings. The window icons are about 16 px.
11. The dev panel leaks. Tune shows an internal path "[docs/plan/specialists/app-time.md row J (bundle constant 500)]" in the product. The welcome card says "BATTLE STUDIO · PROTOTYPE".
12. Motion evidence does not show the motion. The growth strip titled "the name grows out of the mark" starts with the name already complete in frame 0 and never shows code giving way to name; the ring draws in frames 4 to 7 but the strip crop cuts the tooltip. The arrival strip spends 3 of 8 frames on empty ground and its "ring leaves it" is not visible. The deployment strip changes the camera so much that the members "gliding apart" are unreadable; it ends with the crowd and its members both half-transparent, so the end state is never shown. The march strip is 3 px per frame on a 400 px crop and proves nothing about easing; a crowd arrives overlapping "4 TX" in frames 2 to 7. "0 overlaps" in numbers, and the pictures do not rule it out.
13. Sepia paper at overview: the paper look ghosts the aerial to a brown wash; contours and the real photograph are barely there at S1a. The aerial look is stronger. The default sells the weaker one.

Best of D4

- The frame (masthead, dock, map between) is the cleanest chrome of the four directions, and the phone view is excellent: a 48 px masthead, a peek sheet at 61 percent map, a legible dock, marks sized for a thumb.
- Text legibility on the map is the best: Inter 12 and 13 in a dark halo, the formation tier set apart by deep side ink.
- The evidence labels (dot and word) in cards are quiet and consistent. The legend anatomy with numbered parts is a good idea.
- Honest instruments: pacing, step counts and scene checks are real.

Required fixes (D4)

1. Replace "& others" and "no formation" with words that name what is there; give every crowd an identity distinct from its neighbours; cut the share of records in crowds at 13.5 by letting the formation mark carry its brigade count.
2. One naming system for formations at every zoom; no raw Roman codes on screen.
3. Never cut a mark or its name at the masthead, dock, rail or screen edge: dissolve or keep a margin, and place the map inside a safe area.
4. Narration, tune and legend surfaces must not cover marks: dissolve marks behind them or move the camera.
5. Remove the box behind selected and hovered labels and the highlighter boxes; indicate selection with the ring only.
6. Draw the hull as dots and hairlines only, or a rounded blob; never a taper.
7. Leaders: 1 px, side colour, never across a label, never longer than 300 px (else a pulse only).
8. Rework the infantry glyph (a bar, a dot, a chevron or letters) so no mark reads as a close or error icon; drop the four-arc ring or make it readable at 1x.
9. Keep aged marks at the contrast of fresh ones (a hollow ring, not a pastel) so recency does not read as importance.
10. Card polish: remove the stray kicker square, fix orphans, one leading, one grammar for Details and Show on map, 24 px icon targets, no caps prose, align stacked cards on a column.
11. Remove internal paths and "PROTOTYPE" from the product surfaces.
12. Redo the strips: constant camera, the start and the end state, frames at the moment of change, and the claimed element visible (name growth, ring, members apart).
13. Default the ground to the look that shows the real terrain, or increase the aerial's presence in paper.

## D1 Quiet Cartographer

Scores: hierarchy 7, legibility 7, noise 6, polish 6, basemap_fit 8, identity 8, vital_info 7, phone 6, popups 7, motion 5, brand_fit 6.

What is wrong

1. Road names collide with marks. S3 crop: "Leininger Ave" runs through the "3" flag of "2nd Div, 11th Corps", "Clocon Ave" through the "31 GA" ring, "Baltimore Pike" through "25 OH" and "107 PA". S4 200 percent: "Hancock Ave" is overprinted by "2nd" in "1st Div, 2nd Corps" and is truncated ("Hancock A"). S8: "Hancock Ave" is overlaid by the "ART/II/CORPS" label and "Pleasanton Ave" by "16th Vermont Infantry" (garbled). Phone: "Taneytown Rd" passes through "1st Corps" of the long brigade label and "Emmitsburg Rd" through Kemper's flag and "Codori Farm". The SPEC says ground names never go under marks; the pictures say otherwise on three of eight scenes. This is the first thing a map-literate reviewer sees.
2. Text over everything. At 13.5 about 160 marks, almost all with 12 px lettering and tinted tails ("III Corps, 5 unlisted, 4 contested"). The flags themselves are 15 x 11 px and the pips 11 px: the label is the mark. The hierarchy is therefore text weight only (bold 13 vs semibold 12 differs little), and the flag is a bullet. "unlisted" and "contested" tails are bookkeeping words that still need a legend to decode. Names repeat on different marks (Iverson's Bde twice, Garnett's Bde twice, "II Corps" three times).
3. Ghosts and cut marks near the chrome. The "dissolve before the bars" rule leaves faint, illegible leftovers: "Tilton's Bde" and "I/1/7" dim over the dock in S1a, "Union, unlisted 2 NC" under the top pills in S1b, "Early's Div, 2nd Corps" under the clock pill and "Jones's Bde", "Candy's Bde" under the dock in S3, "15 AL" in S2. Marks and names are also cut hard at the window edge ("emper's Bde" on the phone, "n Ohio Infantry" in S8, "McLaws" flush at x=10, "2nd Div, 6th (" at the right edge) and by the legend rail ("Ramseur's Bde" half cut). Vital text cut or ghosted is hidden vital information. The floating dock still covers about a tenth of the map.
4. The selection is a capsule, a plate. S4, S8 and the specimen draw a rounded rectangle with a thick outline around the selected pip and name; in S4 it also holds a heavy black dash (the strength hairline) that looks like a minus sign, and the specimen's selected sample captioned "ring, name, hairline" shows no hairline at all. The leader from capsule to card is a straight line running over 140 px.
5. Leaders cross text. S6: a brown 500 px leader from the story card to the Iron Brigade runs through the "Fry commanding" label and past the unit rows, beyond the 300 px that D4 sets itself as the limit.
6. Copy and data leaks. "Gulp's Hill saddle [sic]" is printed on the map (S1b, welcome); "Brian Farm (Bryan Farm)" prints a correction inside the label; a code truncated to "Phillips/" is on S2; the unit-card chain repeats "Second Division, Second Corps" twice; the kicker appends a lowercase "infantry" after "UNION · REGIMENT"; the legend subtitle reads "What each mark of the Quiet Cartographer (day) claims" and the welcome kicker names the direction. These are the art-direction codename in the product.
7. Phone. The clock pill truncates its own caveat ("candidate…"); the timeline day labels ("July 1", "July 2", "July 3") are overprinted by the event bars; the peek sheet is only a title with a lot of empty space; the dock is a floating card over map; road names collide as above. The map share (70 percent) is good, the execution is not.
8. The legend is a wall: 17 rows plus a figure, with the evidence word set inline after the sentence so rows wrap unevenly ("...id prefix) Documented" then "Documented" alone on the next line). The top figure is the best part and should be the whole legend.
9. The playhead overlaps "July 1" in S6 ("Jul|y 1").
10. Motion evidence. The deployment strip is 4 empty frames of 8, then dots with labels that appear in one step; at 100 percent the lettering is too small to judge. The selection strip is titled "the 53rd Virginia grows its name and strength hairline", but the picture shows the 53 VA mark vanish into "Armistead's Bde" (3 becomes 5) and the capsule on that crowd: the title and the picture disagree, and a click made a unit disappear into a crowd. The march strip is a wide crop at 100 percent in which the marks are tiny and the lettering unreadable, and three frames pass with no mark entering; it shows that a unit moves, not how it eases.
11. The Tune panel still says "Variant" and "Renderer Before / After", and prints an internal doc path.
12. Flat, low-contrast grey ground. The day ground is elegant, but place names in 11 px regular grey ("Meade's Headquarters (Leister House)", "Cemetery Ridge (central)") are around 3:1 on the grey and the halo is thin.

Best of D1

- The cleanest map pictures of the round: the day atlas ground, the blue and vermilion pair, the facing flags (Union reads right, Confederate left) which make side readable without colour, the pale-flag-with-edge for aged marks, and the numbers on crowds inside the flag.
- More units stand on their own at 13.5 (about 144 of 198 marks) and each crowd says what it holds with a corps name rather than "& others".
- The specimen sheet and the true-size legend figure are the best explanation of a symbol language I saw this round.
- The 200-percent and night crops show a disciplined type system: one face, two weights, two sizes.

Required fixes (D1)

1. Ground names and road names must keep clear of every mark and label (a keep-out in the layout), or fade; fix the truncated "Hancock A".
2. Replace the dissolve with a real safe area: no ghosts at the bars, no cut at the screen or the rail; shift the dock to a frame or make the map the area it leaves.
3. Give the flag more weight (the flag, not only the text, carries echelon) and stop repeating identical names; resolve "II Corps" three times by what each mark holds; replace "unlisted" and "contested" tails with plain words or an icon.
4. Remove the capsule; show selection as a ring, and either show the strength as a readable gauge or drop it.
5. Leaders: no crossing of labels, no more than 300 px.
6. Clean the copy: no "[sic]", no "(Bryan Farm)" correction inside a label, no cut code "Phillips/", no repeated chain, no "Quiet Cartographer" in the product.
7. Phone: a clock pill that wraps instead of truncating, day labels above the bars not on them, a peek sheet that carries kicker, name, strength; a dock that does not float over map.
8. Cut the legend to the figure plus a short list; evidence labels on their own column.
9. Move the playhead off the day label.
10. Strips that start at the change, have a constant camera and match their title; show the name replacing the code and the pip standing still.
11. Remove "Variant" and "Before / After" and the internal path from the panel.
12. Lift place and road names to 4.5:1 with a real halo.

## Ranking and verdict

Ranking: D1 first, D4 second, by a thin margin. D1 wins on the owner's hardest requirement (vital information and what a crowd says) and on the beauty of the ground and symbol language; D4 wins on the frame and the phone, and loses on the amount of information that stands behind "& others". Neither passes: each has defects visible in its own hero scene (D1 the road-name collisions and ghosts, D4 the repeated crowd pills, cut edges and the wedge). The owner's bar is perfection; the two directions together contain the answer (D4's frame and phone with D1's ground, flags and crowd words), and a fix list of about a dozen items each. Neither is more than a 7 on any line.
