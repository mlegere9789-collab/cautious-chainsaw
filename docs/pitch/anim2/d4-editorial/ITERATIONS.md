# Iteration log

Method: render the scenes (and later the popups) from the built page, look at every picture as a hostile creative director who ships AAA interface would (what is ugly, noisy, unclear, untrue), write the list, fix, render again. Pictures of each pass are in `iterations/iN/` (JPEG at 1x so the folder stays light; the final set is in `shots/` at 2x). Numbers quoted are from commands in `tools/` (`results/`). Six passes; passes 2, 5, 6 and the final are complete sets of the scenes, 4, 5, 6 and the final of the popups.

## Pass 1: the first render (`iterations/i1/`)

**Looked at**: `i1-first-render-z15.5-t551.jpg`, `i1-first-render-crop-100pct.jpg`, `i1-first-render-z13.5-t551.jpg`: the new skin on the real paper ground with the first prototype's popups still in their old dress.

**Saw**
* The thing works: one mark per unit, a disc and a haloed code, the name growing out of it, a crowd as a standard with a number. At 100 percent it is calm next to the first prototype's compare-z15.
* The 4-segment strength gauge under the code read as a hyperlink underline on every mark.
* A brigade's single pip looked like a bullet point.
* The popups' map ink was the first prototype's: heavy red leader lines with a white underlay, a dashed ring for a place, a boxed ring above each subject mark.
* The top bar carried fifteen controls (brand, tick, three styles, a variant select, Before/After, Showcase, three popup buttons, four tool buttons) and the clock twice.
* The credit line for the ground overlapped the dock; the scale bar stood under marks.
* Names came out cut at 24 characters ("Battery A, 4th US Artil...": the dataset's `label`), and the About tab still said "a schematic backdrop".
* (Already in place at this first render, so not a finding: the card family of `editorial.css`: a 3 px rule in the tone's colour, a caps kicker, a serif title, evidence labels as a dot and a word (circle, square, diamond, ring: a second cue beside the colour) instead of outlined pills.)

**Changed**
* The strength gauge moved into the mark: the light ring of a disc is four arcs, the remaining quarters lit (no extra object, secondary by construction).
* Pips 1.7 px to 2.1 px radius.
* The popup ink rewritten (`fxdraw.mjs`): a highlighter behind the subject mark, a 1.2 px leader that ends in a small ring on the glyph, a soft disc for an approximate place, no dashed line anywhere.
* Names from the order of battle (designation without the nickname); the legend, the credit line and the stale claims are in the following passes.

## Pass 2: the first complete set (`iterations/i2/`: S1a, S1b, S2, S3, S4, S6, S7, S8)

**Saw**
* S7: the legend did not open at all. It has about twenty rows and no corner of the map is free for a card that tall; the director fell back to the pill.
* S4 and S8: the leader of a Confederate unit's card was blue (the tone had no family of its own); the hull of the selected brigade was a heavy salmon wedge; the card's kicker ("CONFEDERATE · REGIMENT" and the arm) wrapped, and a label touched its value ("Strength at this placement261 of 435").
* A carried-forward mark faded toward grey, which turned both sides into mud; the fresh ones popped, but the old ones looked dead.
* Selection opened the side panel as well as the card: the same facts twice.
* The credit line (bottom right) was overprinted by names; the phone's dock took 40 percent of the screen.

**Changed**
* The legend opens in the reading rail, grouped by what a mark says (side, arm, echelon, age, strength, crowd, selection, pin), the pill stays on the map.
* Tone families `union` and `confederate` for the cards and leaders of units; hull 17 to 13 percent; kicker may wrap, bar rows have a gap.
* The age device became a gentler fade toward a warm neutral (then, in pass 4, a desaturation: see there).
* A selection opens the card only; the Inspect button opens the panel on the selected unit.
* The credit moved into the dock; the phone dock lost three speed buttons and the stat line.

## Pass 3: S5 and S7 after the fixes (`iterations/i3/`)

**Saw**: the phone sheet (the unit's card in a bottom sheet, the map made room) and the legend in the rail both work; the legend rail is long but grouped. The phone's top bar had an empty white bar (see pass 5).

**Changed**: formation records named by rule when the dataset's label is cut ("Third Brigade, Second Division, Third Corps" -> "3rd Bde, 2nd Div, 3rd Corps"); the motion tokens (birth scale 0.85, fade 240 ms, card enter 240 ms rising 8 px on the expo-out curve `cubic-bezier(.16,1,.3,1)`); the settle of an arrival (the disc swells at most 7.5 percent inside its band).

## Pass 4: S1b, S3, S4 and the whole popup gallery (`iterations/i4/`)

**Saw**
* The scale bar of the ground stood under marks at the bottom left (a contested cluster sat on "500 m").
* Day banner, clock, event card, story card, the reading rail, the Chronicle rail, the narration card, the welcome card, the hint, the About and Tune panels: one family now; but the narration and the welcome still said "a schematic backdrop" and "everything runs in this one file with no network request", the About tab said "the backdrop is a grid, not terrain", and the Showcase tour would have thrown on `style: 'war-room'`.
* Hover tooltip, Details, evidence rows wrapped awkwardly.

**Found by the pixel check** (`tools/skin-ink.mjs`, written in this pass): crowd marks painted up to 8 px outside their box because the " +" of a crowd named after its lead record was drawn but not measured; formation names grew 1 to 6 px beyond their label rectangle because the label was measured in the 12 px font and drawn in the 13 px one. Both fixed at the root (the text drawn is the text measured; the mark's font travels with its size); after the fix: 0 tiles over 0.5 px of 3,100 tile-states.

**Changed**
* The scale moved into the dock (a bracket and a length: no mark can stand on it).
* Every stale claim corrected (welcome, About, the tours, the page's description); the Showcase uses the two looks (`dispatch-paper`, `dispatch-aerial`), six seconds each so it still lasts 60 s.
* The colour tests (`tools/contrast-tests.mjs`, 122 checks) failed on seven pairs: the faded Confederate glyph (2.9:1), the colour-blind palettes' Confederate orange (3.76:1, 3.05:1), the dark contrast variant's greyscale ratio (1.21:1). The palettes were retuned until every bar was met.

## Pass 5: the second complete set and the popups (`iterations/i5/`)

**Saw**
* The age fade, as a mix toward a light neutral, could not be made visible without failing the 3:1 bar for the white glyph on a faded Confederate mark. The fix is the better idea: age drains the *colour* toward the grey of the same lightness (so the glyph keeps its contrast) and touches it with the neutral. In `S1a.crop` at 100 percent the fresh marks are vivid blue and red and the old ones slate and brown: the eye goes to what is fresh.
* A displaced mark's pin sometimes stood on the letters of its own code.
* The selection ring of a standard was a small circle in the middle of a rectangle.
* On the phone an empty bar stood in the top row (the tool pill with no tools), and the scale was clipped at the dock's edge.

**Changed**
* The age device (above), shared by the skin and the colour tests (`fadeFill` in `editorial.spec.mjs`), with two new tests: a battle-day-old mark must differ from a fresh one by CIEDE2000 7 (4 for the high-contrast variant, which fades less on purpose), and old Union must still differ from old Confederate by 20.
* A pin inside its own mark's box is not drawn.
* The ring of hover and selection follows the shape of the mark (a circle for a disc, the outline of the standard for a formation or a crowd; the selection sweeps along it).
* The four tools became one pill; the Chronicle strip is a row only when a card had no room.

## Pass 6: the third complete set (`iterations/i6/`)

**Saw**
* `S1b` at 100 percent: the whole field at the assault is calm; fresh marks are vivid, old ones slate and brown; the four place names (Oak Ridge, Cemetery Hill, Spangler's Spring, Power's Hill) are the only serif on the map and step aside for marks.
* `S8`: the hover reads as one gesture: the name grows, the hull of Armistead's brigade appears, the tooltip follows with a thin red leader (the unit's own side).
* `S6`: three cards, no card on a mark, the subject marks highlighted as with a pen.
* The gallery's legend step opened nothing (the tool called the card by the wrong id; the page itself was right: `S7` opens it by its pill). Fixed in the tool.

**Changed**: the gallery tool; the final render and the measurements (`tools/pacing.mjs`, `tools/run-tests.mjs`) were then run on this code.

## Pass 7: the jitter tile by tile, and the interface over the marks (no new picture; every final picture and number was rendered again on this build)

**Saw**
* The real-time pacing run still showed 0.13 to 0.38 sudden steps of a solid mark per second and one step of 28 px. `tools/jitter-probe.mjs` (new) names the tile of each. A displaced mark whose unit stood still moved 2.5 px a frame and then 8 px in one: contacts that compound (a push of at most 1.5 px a pass, four passes). A crowd mark whose member list changes steps 8 to 12 px. A travelling mark passes the 50 percent opacity line in mid-hop.
* `tools/chrome-cover.mjs` (new): the dock and the top bar lie over 6 to 12 percent of the marks on screen (S1b: 14 of 117 marks hidden, 5 partly; S2: 7 of 74). The layout does not know the interface. Cards avoid marks; the dock does not.

**Changed**
* `motion.maxPushPx` 1.5 to 0.75 (`tools/derive-tokens.mjs`, one token): over 600 frames the Wheatfield at 4x went from about 6 hops to about 2, no other scene moved, overlaps stayed 0, the dimmed travelling frames stayed within 10 percent (`results/jp/`, three runs per setting; the counts vary by up to 2 between identical runs, cause not found). The node tests (11, 88, 56) and the colour tests (134) pass on it; the pacing and the final pictures were redone.
* The interface over the marks was **not** changed: it is a structural choice of the first prototype's page (a floating dock on a full-bleed map) and the honest remedies (a camera safe-area, or a canvas that ends above the dock) change every direction's framing. It is declared in `SPEC.md` section 12 and in the README's limits.

<!--FINAL-->
## Where the first six-plus passes left it (superseded in part by Round 1, below)

A hostile creative director opening `shots/` today would find:

* **Settled pictures are calm.** One bold mark per unit, the same two type sizes everywhere, no dashed outline and no tiny badge, a crowd as one standard with its count, age as colour drained from the mark and not as a second device, the name growing out of the mark it belongs to. `S1b` and `S2.crop` read at a glance, in greyscale as well (`specimen-paper-cvd.jpg`).
* **The checks are real.** 0 overlapping vital cores, 0 covered true positions, 0 overlapping names and 0 unrepresented units on all nine scenes, found by a routine that shares no code with the engine's verifier; 777 real tiles drawn alone in 3,108 states paint no more than 0.5 px outside their boxes; 134 of 134 colour checks.
* **It still had faults, and they were listed here and in the README, not hidden** (the dock and the top bar over 6 to 12 percent of the marks is fixed in Round 1; the rest stands unless Round 1 says otherwise): a solid mark still takes a sudden step of 8 px or more once in 4 to 8 s of real-time play (never in some scenes); under a 4x CPU slowdown the page runs at 26 to 32 fps in the dense scenes; from zoom 15 the names make the map dense (the dial is `layout.labelMinZoom`); the page needs the tile folder of the basemap beside it; nobody but its author has looked at it, and it has never run on a phone, in Safari or in Firefox.
<!--/FINAL-->

<!--ROUND1-->
# Round 1 of the polish (after the jury's first critique)

**Where it started.** Three blind critics scored the four directions on ten lines. Dispatch was first in all three (74 to 78 of 100, 7 to 9 on most lines), and none of the four passed the owner's bar: *"8/10 is not the bar, 10/10 perfection is."* The merged required fixes for Dispatch, with the cause I found for each, what I changed, and the picture or number that shows it:

| # | Required fix (who) | Cause | Change | Evidence |
|---|---|---|---|---|
| 1 | Drop "Contact"; stop naming a crowd after a lead record and a plus (all three, a truth blocker) | `layout/tiles.mjs aggregateName` returned "Contact" for two armies and the lead record's code with a plus otherwise; the skin drew the plus | Crowds are named in words from the order of battle (SPEC section 7): a formation's own name, the corps, "Both sides"; the legend, the hotspots, the data's own scene names ("Contact B") and the unit inspector lost the word too | `editorial.test.mjs` checks every crowd of three scenes against the record; S1, S2, S7 |
| 2 | The opening view is mud: stale marks drain to grey (all three) | `fadeFill` desaturated toward the grey of the same lightness | Age is a pale tint of the same hue mixed toward the ground, a thinner ring, and the better of white and dark ink for the glyph and the count; a quick change, so no mark rests in the mid-tone | S1a and S1b crops; the colour checks, including the worst of seven ages at 4.5:1 for the count |
| 3 | Marks under the dock and the top bar: 12 percent, "not solved" (all three) | A floating dock over a full-bleed canvas: the layout never knew the interface | The interface is a frame: masthead, map band (the stage), dock. The engine's viewport is the stage and the director sees no chrome on the map | `chrome-cover`: 0 hidden, 0 partly hidden, in all five scenes |
| 4 | The hull is a red wedge that reads as an attack arrow (all three) | A side-coloured fill and a rim over a thin convex hull | A very light wash in the neutral ink of the print, no rim, no side colour, a dot on each true position | S4, S8 |
| 5 | Card kicker wraps, "261 of / 435", "order of / battle", a leader runs across the map (all three) | The kicker carried the arm as a right-aligned aside; the strength row and the evidence basis could break; a leader was drawn however long | One-line kicker ("Confederate · Infantry"); the aside follows the label and wraps left aligned; figures never break; the basis dropped from the commander row; a leader longer than 300 px is not drawn | S4, S6, S8; token `popup.place.leaderShowPx` |
| 6 | Road names run through marks (critics 1 and 3) | The names were baked into the cached ground and could not know the marks | The skin draws the road and stream names, and they step aside, fading, for any mark or name that would lie on them (the place-name rule); their 10 px became 11 | S4 (Hancock Ave and Taneytown Rd step aside); text audit |
| 7 | Phone: the top bar covers marks, the sheet leaves a third of the map, an orphan "infantry" line (all three) | Two rows of chrome over the map; the sheet opened at half; the arm was a separate line | A 48 px masthead and a 120 px dock outside the map; a unit's sheet opens at its peek (kicker, name, strength bar); the look and colour sets moved into the menu; the Chronicle chips give the map their row back while the sheet is open | S5; measured on the page with default popups: the map above the sheet is 515 of 844 px, **61 percent** of the screen |
| 8 | Hierarchy: a crowd as loud as a brigade; formation and unit lettering differ by 1 px (all three) | A crowd standard was larger than a brigade standard; one ink for all text | Crowd 25x17 against brigade 28x18, crowd text in the neutral 12/600; formation names 13/700 in the side's deep ink | S2, S3 |
| 9 | Specks and stubs: pins and leaders look like dust (critics 2 and 3) | A ring was drawn for a place whose name had stepped aside | The bare ring goes with its name. The pin and leader of a displaced mark stay: they are the data's own statement that the mark stands aside (SPEC 5.4) | S1b crop |
| 10 | Steal the labelled anatomy of D2's legend, D3's true-size swatches (critic 1) | The legend was twenty rows of text | The rail opens with an anatomy of a mark drawn by the skin's own code, nine numbered parts and nine notes; the swatches stay true-size | S7 |
| 11 | Generic Inter chrome beside the serif; development language on the chrome (all three) | "shared animation engine · prototype", a variant select, "Tick 556 / 675" as the clock | A serif masthead and dateline, the look and colour sets in the menu, the tick as a quiet second line | S1 to S8 |

**Where the critics disagreed, and what I decided.** The hull: critic 1 wanted a neutral hairline convex shape, critic 2 a dotted outline (the language bans dashes), critic 3 a softer wash with no rim; I tried the hairline polygon first and it read as the outline of a wedge, so the answer is the wash without a rim plus the dots. Pins: critic 3 would show them only on hover, the others wanted fewer stubs; a displaced mark with no pin states a false position, so they stay and only the nameless rings went. Crowd names: "II Corps +2" (critic 1, from D1), "II Corps, 12 records" (critic 2), shared-formation words (critic 3): the count is on the mark, the words are what the records share. Age: all three asked for the hue to survive, critic 2 for "toward the paper", critic 1 for a second cue; both are done (the tint and the thinner ring). **Stolen, named:** D2's anatomy diagram (the legend), D1's honest crowd words (Both sides), D3's true-size swatches (already there).

**What I saw at 200 percent that no critic wrote** (and fixed): a crowd of Confederates and a contested record was drawn half blue (a contested record is never a side; it is now amber and hatched); the count of a split crowd was dark blue on blue; a stale count was 3.2:1 white on a pale fill (now 4.5:1 or better at every age; the ink flips to dark where that reads better); a command card's title was cut by the edge of the card and a kicker's clock wrapped under it; the road names were 10 px (the floor is 11); the dock grew by a row when the Chronicle strip appeared and moved the whole map (the ground now stays where it is on screen); a busy scene left no room for the legend pill and the legend could not be opened (the masthead has a Legend button); a hotspot and three scene names said "contact"; the timeline's day labels were 10 px and sat on the scene markers; a ring was left on the ground when its place name had stepped aside; the deployment strip could not show a crowd that never opens (some records stand on one coordinate), so the tool now finds one that does.

**Measured after the change** (`results/`, regenerated by `node tools/report.mjs`; the tables are in SPEC section 12): on all nine scenes (S1a to S8, DPR 2, 1440 x 900 and 390 x 844) the independent frame check finds **0 overlapping vital cores, 0 covered true positions, 0 overlapping names and 0 unrepresented units**, and the engine's own verifier 0 overlapping pairs on the same frames; **0 of 74, 62, 50, 24 and 23 marks are hidden or partly hidden by the interface** (the map's own edge cuts 5, 4, 6, 0 and 7 of them, as any screen's edge would); the pixel check draws 750 real tiles alone in 3,000 states and finds **0 painting more than 0.5 px outside their box**; the smallest text of the 11 interface states audited is **11 px**; **134 of 134 colour checks** pass, among them the count and glyph on an aged mark at 4.5:1 or better at every one of seven ages; **293 tests pass** (15 editorial, 88 engine, 56 fuzz, popups and tours, 134 colour). Motion (`tools/strips.mjs`, 60 Hz): the arrival (40 frames) and the deployment of a six-record crowd (152 frames, zoom 14.7 to 16.4) have **0 overlaps and 0 sudden steps** (largest step 4.1 px); the march (68 frames, 278 marks) has 0 overlaps and 3 sudden steps, two of them one regiment's own interpolated motion and one a crowd mark at 84 percent opacity (32 px, not reproduced on a second identical run). Pacing, real time at DPR 2: 60 fps and 0 frames over 20 ms in three scenes at 1x and 4x; under a 4x CPU throttle (a stand-in for a phone) 23 to 37 fps.

**What I could not fix, and why.** (1) At the opening zoom about 87 percent of the records still stand in crowds (43 to 49 crowds for 390 of 451 records): 456 units cannot each have a disc and a code in a 1,440 x 780 px map without overlap, and the language never allows overlap; the critics' target (about 80 percent standing alone) is not reachable here, so the crowds say what they hold and open as soon as the zoom allows. (2) Some crowds never open: their records are placed on one coordinate in the data (Graham's Brigade, four regiments). (3) A card whose subject has no free ground within 300 px gets no leader line, only the subject's highlighter and pulse: the association is weaker than a line, which I judged better than a hairline across the map. (4) In the march strip two consecutive frames of one regiment (U-1MN) take a step three times the one before: it is the unit's own interpolated motion (the clock's time-warp or a keyframe), not the display, and I did not smooth the data. (5) A mark at the edge of the map is cut by the edge (6 of 74 in S1b), as on any map. (6) At the overview a formation record still shows its Roman code ("II/1/2") where its name does not fit; the legend explains it. (7) The Tune, Inspect and Metrics panels are the first prototype's tools in the new paper; they were not redesigned. (8) Nobody but the author has looked at this: no designer, no historian, no real phone, Safari or Firefox.
<!--/ROUND1-->
