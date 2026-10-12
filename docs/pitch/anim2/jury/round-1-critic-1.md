# Round 1, hostile critic 1 of 3: Battle Studio marks, D4 Editorial (Dispatch) and D1 Quiet Cartographer

Blind to the code and to the other critics. Judged only from the PNGs and JPGs in `d4-editorial/shots/round-1` and `d1-quiet-cartographer/shots/round-1` (every scene at full size, the 200 percent and crop images, the popups, the strips, the specimens, the phone shots, night and aerial) and from the two SPEC.md files, which I used to test their claims against the pictures. Scale 1 to 10; a 10 means I cannot name one thing to change. Nothing below earns a 10 because in every line I could name several things.

What I tried when hunting for flaws: edges of the frame at 200 percent (clipped and half-faded labels under the top bar and the dock), label-on-label and label-on-road collisions, leader lines crossing other marks, popup placement against the marks beneath it, whether a crowd says what it stands for, label-length consistency (code versus full name), abbreviation consistency, touch-target sizes of card icons and phone chrome, chrome that is opaque over the map despite the spec saying it is not, the claims in the spec against the screenshots (pins at rest, "no two solid marks overlap", "nothing opaque lies on the map"), the motion strips frame by frame for overlap and pop, shadow/halo consistency, colour harmony of the paper ground against the age-tinted marks, and the phone sheets.

Overall: both directions are real progress over round 0 and neither is shippable as a 10. D4 reads as a designed product with one mark grammar; D1 reads as a competent map with a lot of lettering. Ranking: D4 above D1, both well short of the bar.

---

## D4 Editorial (Dispatch)

### What is wrong

1. **The crowd mark does not say what it stands for.** "Union, no formation" (S1a at 12, 19, 16, 3, 2 units; S1b; S2; S4 even at zoom 16.5 for two records) is a label that carries a number and no information: it says what the units are NOT. "II Corps & others", "I & III Corps & others", "XI Corps & others" say "others" without saying how many or which. The owner's rule is that a crowd is an elegant formation mark that still says what it stands for. At zoom 16.5 (S4) a crowd of 2 "Union, no formation" sits in free ground next to 4 and 4: there is no reason for it to be merged at all, and the reader cannot tell the two records apart. Two different crowds in S1b are both named "Pickett's Div, I Corps" (counts 5 and 9, about 150 px apart), which reads as a duplicate or a bug.
2. **The spec's headline promise is false in the pictures.** SPEC section 1 says "nothing opaque lies on the map, so no mark can ever be hidden under it". The pictures show an opaque clock card top-left or top-right in S2, S3, S4, S6 (about 300 x 140 px), an opaque minimap bottom-right in S1, S3, S4, S6, an opaque Legend button bottom-left in every scene, and the welcome card (popups-06), whose right edge slices through the "I/3/1", "I/3/2", "I/3/3" pips (they are half under it). Marks are also cut by the top bar and the dock: S1a "12 NC" and "II/3/5" half under the masthead, "16 I Corps & others" cut by the dock; S2 "48th Alabama Infantry" and "3rd Bde, 1st Div, V Corps" cut at the dock; S3 a mark cut at the dock bottom right. Claiming zero and showing this is an honesty failure on a project whose pitch is "animated honestly".
3. **Popups still cover the map.** Owner rule: every popup anchored without covering tiles. S6 / popups-01 stack four cards (2 changes, command passes, critical, story) of about 300 x 450 px each over the map; popups-06 stacks four more; the Story card alone hides a quarter of the stage. Leader lines are long and cross marks: in S6 the red line from the Critical card runs 300 px through "Armistead's Bde"'s pill; in popups-03 the red leader from the Critical card runs diagonally through the Harrow's Brigade mark; in S4 the card's leader runs 380 px at a pixel gap of about 20 px from two marks; the command-changes line joins II/3/2 to II/3/3 in S6 and reads as a relation that does not exist. The card is never visibly attached to the unit with a short, tidy elbow.
4. **Chrome is inconsistent between scenes.** The minimap is bottom-right in S1/S4/S6 and top-right in S3; the clock card appears in S2 to S8 and is absent in S1; the Legend button duplicates the "Legend" in the masthead (and in S7 both are lit at once). The top bar shows the time twice (masthead dateline and the clock card). The clock card with a half-ring spinner repeats information and costs a rectangle of map.
5. **Labels that should have been resolved are clipped or truncated.** "12th New Jersey Volunteer Infant", "111th New York Volunteer Inf", "125th New York Volunt" (S6, S7, popups-03/09 cut by the right rail), the right column VI/1/1 to VI/3/3 in S2 sits flush against the frame edge like a list, not a map. Story and Critical cards truncate mid-sentence ("the deepest...", "placed his hat on...").
6. **Naming is inconsistent.** In one view "Carr's Brigade", "Barksdale's Bde", "Texas Brigade", "Benning's Bde" (S2); regiments are "21st Mississippi Infantry", "3rd Arkansas Infantry", "48th Alabama Infantry" next to "13 MS", "17 ME", "1 MN", "A1RI", "B1NJ", "GLA/SHB"; S3 mixes "108th New York Volunteer Infantry" with "107 PA" and "RES". Italic means age, but a reader sees italic and roman codes at random ("1 US" italic, "B1NJ" roman, same size). The long full names also add noise at zoom 15 to 16.5 where the card already holds the name.
7. **The paper ground is muddy.** The default Paper skin washes the aerial into a flat yellow-brown. The pale salmon Confederate marks (age-tinted) sit on tan with a low figure/ground contrast (S1a, S1b, popups-06: "II/3/5", "II/3/4", "I/1", "I/2" read as ghosts), and the salmon fill and the sepia are the same temperature, so the weakest-looking marks are the Confederate ones. The 3-pip corps/division/brigade distinction is three tiny dots (about 4 px) that vanish at 1x; "..." versus ".." versus "." cannot be read at a glance.
8. **Mid-transition overlap contradicts "no two solid marks ever overlap".** motion-march frames 3 to 7: the new crowd "20 III & V Corps & others" slides over the label "4 TX" and over the remains of the faded II/1/4 pill. motion-deploy frame 5: the crowd label runs across the 140 PA disc. The deploy strip also ends with the camera having moved away so the six members are not shown arriving. The strip's own caption is the claim it fails.
9. **Pins and leaders at rest.** SPEC says hull and true position appear on interaction only. S1a shows small pin circles with hairlines at rest next to many crowds (for example under "26 I Corps & others", "3 III Corps", the vertical pin lines at 970,659 and 1063,690). They read as noise next to a mark.
10. **Phone.** S5: the selected unit's red leader line runs out past the right edge of the screen as a dangling hairline at y 890 (it is aimed at a desktop card that is not there); the pale grey trail wedge is a faint streak that reads as dirt; the masthead on the phone has only a play icon (no Paper/Aerial toggle, no Chronicle, no legend entry except the floating Legend button over the map); the sheet shows "53rd Virginia Infantry" while the highlighted mark on the map is the crowd "12 I & III Corps" (the unit is inside the crowd, and the sheet does not say so). Dock, speeds and the two-line evidence text take about 25 percent of the screen. No phone legend, no phone popup scene besides the unit sheet.
11. **Copy and typography in the interface.** Body text uses "--" for a dash (story text, chronicle: "Sherrill mortally wounded -- Bull assumes brigade"); the Critical card shouts an all-caps first sentence; the "Command passes" text sets a 15 px line at a leading of about 1.0 (the line "Third Brigade, Third Division, Second Corps (Willard's Brigade)" is nearly touching its neighbour); the chronicle link says "Go to Reopen". The Tune panel prints a repository path in user-facing copy ("[docs/plan/specialists/app-time.md row J...]"), and the panel text is cut mid-line at the dock. The three icon buttons on every card (dock, pin, close) are about 14 px glyphs on a 24 px target.
12. **The legend's last row is cut mid-line by the dock, and the anatomy figure's callout numbers touch the glyphs they annotate** ("1" and "2" crowd the ring and the saltire). The legend duplicates the permanent rows of the masthead "Legend" button.
13. **Contested hatch under a numeral.** The "Union, 1 contested" and "Confederate, 3 contested" crowd marks put a dark numeral on a diagonal hatch (S1a "23", specimen "5"): the digit is the least legible element of the mark that is meant to carry the count.
14. **The specimen's colour-blind sheet is visually identical to the normal sheet**, so it proves nothing a viewer can see; the skin's name "Dispatch on paper" appears twice in the heading.

### What is best

- One grammar. A disc for a regiment, a pennant for a formation, one white glyph, one code. Union notch / Confederate point plus hue plus a deep ink for formations: at the opening view the two armies separate at once and the formation tier is set by colour and weight, not by a different font.
- The legend opens with an annotated anatomy and carries evidence labels per encoding: the most designed explanatory panel of either direction.
- Frame rather than overlay on desktop (when it is honoured) and an elegant masthead with a serif dateline; the editorial voice is distinctive.
- The arrival strip (3 ME fades and settles with a ring) and the hover-to-selection name growth are the nicest motion shown by either direction.
- Aerial mode is handsome and legible (S1a-aerial).

### Required fixes (D4)

1. Replace "Union, no formation" and every "& others" with a name that carries information: the common parent that exists plus an explicit residual ("III Corps, 3 of 9" or "9 units: 2nd Div and 7 unlisted") and never a negative. Rename the duplicate "Pickett's Div, I Corps" pair so the two crowds are distinguishable.
2. Stop merging when there is room: no crowd of 2 at zoom above 15.
3. Correct the claim or remove the opaque rectangles: fold the clock into the masthead (it already prints the time), put the minimap in the dock or make it a toggle in a fixed place, and cut the Legend button that duplicates the masthead entry. Fade marks before the top bar, the dock and the side rail the way the other direction does, or reserve the band so none is cut.
4. Popups: a maximum of one floating card at a time; the rest become chips or dock entries. Anchor with a short elbow leader from the card edge nearest the unit, never through another mark; place cards by testing the free rectangle, not by a fixed corner. Never let a card edge slice a mark: a mark half under a card (popups-06) is a defect.
5. Make the chrome identical across scenes (minimap, clock, legend in one place).
6. Rule for names: one policy (code only below zoom X, full name only on hover/select, brigade always "Bde" or always "Brigade"), applied with no exceptions; one policy for italics (age only, with a legend swatch).
7. Calm the paper ground (cooler, lighter, lower sepia) and test the age-tinted salmon against it; give corps/division/brigade pips a size cue that survives 1x (bar count or width) instead of 4 px dots.
8. Prevent overlap during crowd transitions (hold the outgoing mark until the incoming mark's box is clear, or cross-fade in place) and re-render the deploy strip with a fixed camera so the six members are seen arriving. Re-title strips only with what they show.
9. Remove pins and hairlines at rest or state in the spec that they are drawn (the picture and the spec must agree).
10. Phone: crop the leader at the sheet edge, drop the trail wedge, add Paper/Aerial, Chronicle and Legend to the phone chrome, and say in the sheet that the unit stands inside crowd N (or draw it expanded when selected).
11. Copy: real em dashes, sentence-case first lines in cards, 1.35 leading minimum in every card, "Go to" without "Reopen", no repository paths in the UI, icon targets at 32 px (visually 14).
12. Legend: scroll with a fade or make it fit; give the callout numbers a 6 px clearance.
13. Put a halo or a solid ring behind a numeral on hatch, or move the hatch to the outline only.
14. Render a colour-blind specimen that is actually different from the standard one or drop it.

---

## D1 Quiet Cartographer

### What is wrong

1. **The opening view is a plate of lettering.** S1a shows about 110 labelled marks, many of them the full words of a crowd ("III Corps, 5 unlisted, 4 contested", "I Corps, 1 unlisted") at 12 to 13 px bold; the SPEC admits it itself (weakest 1). Quiet is the headline and the picture is not quiet. At 200 percent the lettering is crisp, but nothing is in charge: bold divisions and corps compete with each other and with the regiment codes.
2. **Four marks languages on one screen.** Circle for infantry, diamond for cavalry, triangle for artillery, flag for formation, plus a Union flag and a Confederate flag with different tails, plus a number badge, plus hollow rings for age, hatched discs for unknown, a pill ring for selection. Each is documented, but the identity of the system is "standard cartographic symbology", which any GIS can draw. Nothing makes it recognisably this product. The armies "face each other" is a sound idea but a 15 px flag tail is not a visible mark of identity.
3. **Marks and labels are hidden by the interface.** S1a "I/1/7" and "Tilton's Bde" fade under the dock (ghost text), S3 ghost "Early's Div, 2nd Corps" under the top bar and ghost "Jones's Bde", "Candy's Bde" under the dock, S2 "15 AL" half-faded, S1b "14 AL". The SPEC admits 12 of 162 marks lie under a control. A half-transparent label reads as a rendering glitch and removes vital information while it is on screen.
4. **Text collides with text.** S4: "Hancock Ave" (road label) is under "Brian Farm (Bryan Farm)" and the ART flags; S8: "Pleasanton Ave" under "16th Vermont Infantry"; "Hancock Ave" under "ART/II/CORPS"; S3: "Baltimore Pike" and "Clock..." under "31 GA / 25 OH"; popups-04: the pin circle for "Herr Ridge" sits on the "McPherson's" in the place-name "Herbst Woods (McPherson's Woods)"; popups-06 (tour) "Trostle Farm" is under the flag label "3rd Div, 5th Corps" and several ghosted mid-fade labels ("3rd Bde, 2nd Div, 3rd Corps", "1st Div, 3rd Corps") sit half transparent over other text. S5 (phone) "1st Corps" runs through "Taneytown Rd", "Kemper's Bde" runs through "Emmitsburg Rd".
5. **Truncation bugs that should be impossible in a 10.** "Phillips/" (S2) with a dangling slash, "Cobb/INF", "4AL/Law", "GLA/SHB", "ART/II/CORPS", "ART/II/CORPS" are raw ids shown as labels. "Brian Farm (Bryan Farm)" and "Gulp's Hill saddle [sic]" show the data's editorial notes on the map. Cards truncate in mid-word ("Pettigrew's Brigade (Marshall commandin...", "his body never officially identifie...").
6. **Popups: five unanchored floating cards.** popups-03 puts five command and critical cards on the map with only one thin leader (a gold line that crosses the labels "Zimmerman", "McGraw", "Fry commanding" in the Reynolds scene S6); the command-passes cards float in mid-map without any visible attachment to a unit. The anchor test ("cards.over is 0") counts marks, not text or road labels. The rail and card typography is good but the same engine problems of two or more cards at once are unsolved. The tour scene (popups-06) has the "Auto tour" button rendered white-on-white (contrast about 1.2:1) while it is active: invisible text in the chrome.
7. **The dock is a second opaque slab over the map and carries a duplicated evidence line** ("Modelled positions..." and "Modelled clock..." both printed as two Modelled chips). In S6 the dock grows (Chronicle chip plus event chip) and swallows more map. The timeline label "July 1" is crossed by the playhead or the event marks (S6, S7, phone). The scale bar is clipped by the dock edge ("200 m" touches the dock).
8. **Phone.** s5-phone: the sheet is mostly empty, the title only ("14th Vermont Volunteer Infantry") with an empty band under it: the sheet opens with nothing to read; the header says "July 3, about 3:35 PM (±20 min) · candidate..." with the ellipsis cutting the one word that makes the clock honest; the translucent dock lets the map bleed through under the timeline so "July 1/2/3" overprint the bars; labels at the screen edge are cut ("emper's Bde", "ding"). 17-phone-sheet-event: the sheet body type is 24 px against 15 px elsewhere, the bottom "Units" row is cut by the dock, and the map is only about 49 percent of the screen with the sheet open. The "Day" select is a wide native dropdown that costs a third of the header.
9. **Motion claims do not match the strips.** strip-select is titled "the 53rd Virginia grows its name" and shows the brigade pill "Armistead's Bde" outlined, the 53 VA dot gone after frame 1 and the brigade's count jumping from 3 to 5 between frames 1 and 2: selection changes crowd membership, a pop of the kind the spec says is solved. strip-deploy shows four empty frames (150 ms of nothing) and then nine marks in one step with no growth; strip-march moves dots and a flag with no arrival or easing visible. The SPEC concedes (weakest 4) that pops of 6 px or more did not fall and that a click takes 44 frames to rest.
10. **Spec leakage into the product.** The welcome card heads "Gettysburg · Quiet Cartographer" and the legend opens "What each mark of the Quiet Cartographer (day) claims"; the legend says "10 ids" and "U- id prefix". The Tune panel carries "Variant" and a "Before / After" renderer switch and the same repository path as D4. The welcome card says "a renderer that never lets a mark hide another", while marks are hidden under the bar and dock and cards cover a third of the map in S6.
11. **The legend is a long list.** s7-legend: sixteen rows with inline evidence chips run past the bottom of the panel, glyph baselines do not align with the text baseline, and the chips run on after the sentence as if they were words ("...Union reads left to right, Confederate right to left Design").
12. **Pins at rest.** Despite "no pins at rest", s4, s5 and S1 show small pins with hairlines for displaced marks (at 885,614 under "1st Div, 2nd Corps"; the dot at 298,658 on the phone).
13. **Selected state is feeble.** A grey pill with a tiny black bar (strength hairline) drawn into a 12 px label; with a leader 90 px to a card the selection is hard to find in a crowd of 40 labels.
14. **Left of the screen empty, right crowded** at S3: no balancing; the camera framing leaves 40 percent of the stage blank in two scenes.

### What is best

- The ground: the cool grey-scale aerial with white relief is the best basemap choice in either direction; marks stand off it cleanly, and the night ground (s1a night, specimen-night) is the strongest single image in the set.
- A halo, not a box: the lettering holds on the photograph and at 200 percent every character is crisp. Two sizes, one face (Source Sans), no capital shouting.
- The unit card (popups-04): clear title, strength hairline, evidence chips, two buttons, compact and quiet.
- The compare-first-vs-quiet image is an honest before and after.
- It states its own weaknesses plainly (section 15), and several of them match what the pictures show.

### Required fixes (D1)

1. Cut the number of lettered marks at the opening zoom by half: show codes only for the formations of the top two echelons and the selected side, and show the rest as bare pips until the camera is closer, so a calm hierarchy exists. One rank of bold only.
2. Choose one grammar and a signature: make the flag the only mark (a pip is a flag of unit size) or make the pip the only mark, and add one device that no other map has (the facing is a start; make it visible at a glance with a shape that is larger than a 3 px tail).
3. Retire the half-faded labels: either hold the whole mark clear of the chrome by layout or remove the whole mark; never draw half-opaque lettering under a bar. Same for ghost labels in transitions (tour popup scene).
4. Resolve every label collision: road and stream names step aside for any mark (and any pin) the way place names do; test text-on-text, not only box-on-box. Remove pins from the text of place names.
5. Fix the data strings on the map: no trailing slash, no raw ids ("ART/II/CORPS", "GLA/SHB"), no "[sic]" or parenthetical editorial notes; expand or label abbreviations consistently.
6. Popups: one card at a time; every card anchored with a short leader from its nearest edge that never crosses a label; no truncation mid-word (truncate at word boundaries with an ellipsis and a link). Fix "Auto tour" in its active state (ink on a light chip, 4.5:1).
7. Dock: one evidence line, two chips at most; stop the playhead crossing "July 1"; keep the scale bar clear of the dock.
8. Phone: open the sheet with the content (strength, what, evidence) or make the peek the same height as its content; give the header the full phrase or shorten it ("Candidate clock" must never be cut); remove the translucency under the timeline; replace the native Day select with a two-state toggle; cap the sheet body at 17 px; make the sheet scroll visible when its content runs under the dock.
9. Re-shoot the motion strips as what they say they are: select must not change crowd membership; deployment must show a growth/arrival from the unit's place, not four blank frames and a step; and fix the pops the spec admits.
10. Remove skin names, "10 ids", "U- prefix", "Before/After" and file paths from user-facing copy.
11. Legend: group (arm, side, age, crowd) in four short blocks with the evidence chip on its own line and glyph-text baseline alignment; fit in the panel.
12. Remove pins at rest or say they exist; add a stronger selected state (a 2 px side-coloured ring plus the card leader starting at the ring).
13. Frame scenes so the marks fill the stage (S3 leaves 40 percent empty).

---

## Scores (1 to 10)

| Line | D4 Editorial | D1 Quiet Cartographer |
|---|---:|---:|
| hierarchy | 7 | 6 |
| legibility | 7 | 7 |
| noise | 6 | 5 |
| polish | 6 | 6 |
| basemap_fit | 6 | 8 |
| identity | 7 | 5 |
| vital_info | 6 | 6 |
| phone | 6 | 5 |
| popups | 5 | 6 |
| motion | 6 | 5 |
| brand_fit | 7 | 6 |

Reasons in one line each. D4 hierarchy 7: one grammar and a colour tier; spoiled by louder bold-blue formations than crowds and by clipped labels. D1 hierarchy 6: bold versus regular but 110 labels compete. D4 legibility 7: crisp, 12 px, strong halos; muddy pale marks on paper. D1 legibility 7: crisp at 200 percent; ghost labels, collisions, white-on-white button. D4 noise 6: pins at rest, long full names, stacked cards; D1 noise 5: plate of lettering. Polish 6 each: clipped labels, truncations, "--", raw ids and slashes. D4 basemap 6: sepia mud; D1 basemap 8: cool aerial is the best in the set. D4 identity 7 (editorial pennants and serif); D1 identity 5 (generic map flags). Vital info 6 each: D4 "Union, no formation" and "& others"; D1 marks and labels half hidden under the chrome. Phone 6 and 5: D4's dangling leader and thin chrome; D1's empty sheet and truncated clock caveat. Popups 5 and 6: D4 covers tiles and slices marks with four stacked cards; D1 floats five cards with no anchor and crosses labels. Motion 6 and 5: D4's arrival and name-growth strips are good, its transition strips overlap; D1's strips contradict their captions. Brand fit 7 and 6: D4 matches "Gettysburg, animated honestly" with its editorial voice; D1's calm is on-brief but the density is not.

Ranking: D4 Editorial first, D1 Quiet Cartographer second. Neither passes. The next round should take D4's grammar, legend and motion, D1's ground, night mode and halo, and fix the lists above before it asks for a 10.
