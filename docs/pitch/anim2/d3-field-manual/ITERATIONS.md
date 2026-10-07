# ITERATIONS: what I saw, what I changed

Method. Render every scene of the brief (and then every popup) in real Chrome at DPR 2, **look at every picture at full size and at 100 percent like a hostile creative director who ships AAA UI**, write down what is ugly, noisy, wrong or untrue, fix it, render again. Four full iterations, each a complete render of the scene set; the whole pictures of the first three are in `shots/iterations/` (JPEG, `i1-` to `i3-`), the fourth is the set in `shots/`. Between them, smaller renders of one scene checked a single fix; they are named where they matter. Every number below was read from a script's output (`tools/`, `results/`).

## Iteration 0: the first render (a smoke test, one scene)

First pass of the skin on the real aerial at zoom 15, with the prototype's glass chrome still around it. Not a full set.

**Saw**
* The pipeline works end to end (real tiles, fonts loaded, marks drawn, zero overlaps), and the marks already read as one object each: a coloured cell with the arm symbol, the code, a dark plate.
* The strength gauge I had drawn as four inset segments **under the text read as an underline of the code**, and clashed with the underline that means "no order-of-battle record".
* The echelon marks in the tab were 4 px specks: a brigade and a division looked alike.
* The prototype's chrome (glass pills, rounded cards, a gold bar down the side of every card) belonged to another design.

**Changed**: the gauge became the **foot of the plate** (flush, full width of the code field, 3 px, ticks at the quartiles); the tab grew from 8 to 10 px and its crosses from 4.4 to 5.2 px; I wrote `fm.css`, the one stylesheet of the chrome and the popups (flat, hairline, one radius, one signal colour, two sizes).

## Iteration 1 (`shots/iterations/i1-*`)

All nine scenes at DPR 2 (the first complete set).

**Saw**
1. **Place names under marks.** The ground's own labels ("Herbst Woods", "Cemetery Hill", "Lutheran Theological S") were placed without knowing where the marks are; marks covered half of them. A name is not a unit, but a name cut in half is the thing the review of the first prototype complained about.
2. **The legend was empty** ("The active skin does not publish a legend"). My edit of the kit's swatch function had put a comment in the middle of a one-line statement and the function threw; the kit swallowed the exception. (Fixed, and the kit now reports a failing swatch once.)
3. The legend's sentences still described the old designs ("dotted, dulled plate", "a pill with the count").
4. **Scene S4**: selecting a unit also opened the Studio's Inspect panel over a quarter of the map.
5. **Scene S6** was a flood: a dozen cards and toasts fired by the clock passing back and forth over four ticks, and the Inspect panel from the scene before.
6. State leaked between pictures (the reading rail of one scene was still open in the next, the speed was still 2x).
7. **Phone**: the top bar was cut off ("REFO"); the event text in the sheet was set entirely in bold.
8. The dock was three rows tall (Chronicle strip, transport, scrubber, honesty line).
9. The unit card's kicker wrapped ("infantry" alone on a second line).
10. A hint card ("press ? for all keys") sat in the overview.
11. Deployed artillery (a dot with a trail) looked like a map pin, next to real pins.

**Changed**: wrote `fx/places.mjs` (every place name laid out against the marks of every frame, in the first free slot, or not at all; the check "no name under a mark" joined every sweep); rewrote the legend sentences; closed the panel and reset the state between scenes; S6 became Herbst Woods at tick 28 (an event and a story that arrive together); the phone bar wraps; the lead paragraph is regular weight; the Chronicle strip moved into the transport row; the kicker does not wrap; hints off for the pictures; the two default arm states (mounted, deployed) draw the plain symbol, so the dot is a dot.

## Iteration 2 (`shots/iterations/i2-*`)

All nine scenes again, plus the new Herbst Woods scene and the rail.

**Saw**
1. **The legend card never opened on the map.** 25 rows at true size are 800 px tall; the director found no free ground and fell back to the pill, so the legend was unreachable. **Changed**: the legend is a pill that opens in the reading rail; the swatches are the real marks at true size (they were scaled to fit a 56 px box and the text came out 8 px: a legend must not break the 11 px floor); the swatch box grew to 124 x 40 so that "Contact x12" is not clipped; the sentences shrank to a few words each.
2. With the rail open the top bar clipped ("BEFORE" half hidden): the bar's groups now shrink (labels to icons) when the rail is open.
3. **The i2 pictures are the first in which I looked at the 100-percent crops of the busiest area** (`*-crop.png`): the system holds; pins read as deliberate; the strength foot reads as a gauge.
4. Selecting needed more presence than a hairline ring: the selected plate now lightens as well.
5. The scrubber's day labels were overdrawn by the event ticks on the phone: the ticks are now sized to the scrubber's height and stay below the label band.

## Iteration 3 (`shots/iterations/i3-*`)

All scenes, then for the first time every popup (`i3-P1` to `P11`), the motion strips and the colour tests.

**Saw**
1. **The colour tests failed 16 of 140 checks.** (a) The plate's boundary on a mid-grey ground was **2.35:1** (the keyline at 0.34); the bar is 3:1 on any ground, and the first version only looked fine on the grounds I had looked at. (b) A day-old contested cell had 4.29:1 for its glyph. (c) The fresh and the washed Union cell differed by a CIEDE2000 of 8.0, too little for "the one provisional device" to be seen. (d) In the day set the pins' ink on a dark underlay was 2.5:1. (e) The day signal colour and the day "faint" ink fell under 4.5:1 on a darker panel. **Changed** (`ITERATIONS` is the only place the first values are kept): keyline 0.34 to 0.55 (day 0.7), Union washed `#4a648a` to `#56657a`, contested washed `#8a7740` to `#988548`, a new token `color.underlay` (dark on night, paper on day), the day panel inks darkened, the colour-blind set's washed Union `#5d6f7f`; all 136 measured checks now pass.
2. **The test also showed that the two armies' fresh cells have a luminance ratio of 1.04:1**: a blue and a vermilion chosen for hue differ in nothing else, so in greyscale the sides are the same grey. **Changed**: Confederate marks are **mirrored, the cell on the right** (decision D1 in SPEC.md): side is now hue and position; `shots/cvd-simulation.png` is the proof.
3. **M3 (the mark growing to its name)**: while the code turned into the name both were drawn over each other for several frames ("14 VT" with "Vermont Vol" on top). **Changed**: the code fades out, then the name fades in, never both.
4. The same strip showed that a mark grows about its centre (the cell slides sideways as the plate widens, because the layout centres a footprint on its unit's true position). Kept and documented: moving the anchor to the cell would mean separating "the pin" from "the anchor" throughout the layout, the display layer and the popups (decision D4 of the prototype's engine, not mine to take lightly).
5. **Untrue words on screen.** The About tab and the welcome card still said "schematic backdrop" and "no network request". The ground is now a photograph and the page loads tile files (locally). Rewritten; the dock's honesty row now carries a **Measured** label and the sentence that the ground is a 2022 photograph, not the 1863 landscape (the basemap's README requires its caption on any screen that shows the ground); the About tab prints the full caption and attribution, and says that the placements were authored in an older frame that puts some places up to 733 m elsewhere.
6. **A synthesised italic.** The ground's water names were an oblique of a bold sans (no italic file exists for FM Sans): "flawless typography" forbids that. **Changed**: the ground is annotated in FM Serif (place names bold, roads regular, water names in the true italic); the marks stay in the sans.
7. The narration picture was taken mid-fade and on the wrong tour step: the capture waits for the CSS entrance and no longer steps the tour while settling.
8. Two of my own checks were wrong: the "name under a mark" check compared a place name's ring-plus-slot bounding box (which includes empty corner) against the marks, and in the wrong coordinate frame. Fixed to compare the ring and the slot separately in screen coordinates; the sweeps were rerun.

## Iteration 4 (the pictures in `shots/`)

The final set, after the fixes above.

**Saw**
1. In the colour-vision sheet the design does what the tests promised: in greyscale the cells are the same grey and the side is still unmistakable from the cell's position; under protanopia and deuteranopia the Confederate cell turns olive against the grey-blue of the Union; under tritanopia red and teal.
2. **M3 again**: on a mirrored (Confederate) mark the growing name ran **under the cell** while the plate was still narrower than the text. **Changed**: the type is clipped to the field beside the cell, so it is revealed as the plate widens; the gap between the code leaving and the name arriving was shortened (code out 0 to 40 %, name in 40 to 90 %).
3. The mirrored layout, the type rule and the grid hold on the phone (S5), the day set (V1), the colour-blind-safe set (V2) and the high-contrast set (V3).
4. The numbers are final: 13 scenes, 126 + 98 + 18 sweep samples, 0 overlaps, 0 pins covered, 0 units unrepresented, 0 names under marks, 0 ink outside the footprint (SPEC.md, section 12); the type audit finds only 11 and 13 px; 136 of 136 colour checks pass.

**What I would still change with another round** (and did not, because each is a decision or needs more than a round): the whole-field overview is 85 percent stacks (SPEC.md section 7 and 12), so it reads as formation blocks; the two-size rule leaves the day banner flat; the mark's symbol is not anchored on the true position; the legend is long; and nobody but me has looked at it.

## The five strongest things of this result

1. **One mark per unit, with a guarantee that is measured, not claimed.** The independent brute-force check of 126 + 98 + 18 settled frames and 13 scene pictures finds zero overlapping marks, zero pins covered, zero units without a mark, zero place names under a mark and zero ink outside a footprint; the engine's own verifier saw 22,894 frames without an overlap. The footprint and the drawing are the same code (`layoutOf` and `paintMark`).
2. **The side is carried three ways.** Hue, the position of the cell (the armies face each other) and the legend. The tests found that hue alone is 1.04:1 in luminance; the design answers it, and `shots/cvd-simulation.png` shows the answer.
3. **A language audited on the running page.** Only 11 and 13 px, only FM Sans and FM Serif (open-licence files, renamed as the licence requires), ten digits of one width; 136 colour checks, each with a bar, in four sets; every encoding labelled Documented, Modelled, Computed, Contested or Unknown, and the honesty texts rewritten where the new ground made them untrue.
4. **Formation marks and stacks that say what they stand for.** Side, arm when shared, echelon in the APP-6 tab, the formation's code, and a count of records; one drawing function shared by the tile, the legend and the footprint, so the true-size legend cannot disagree with the map.
5. **Extensible and complete.** The look is a token file (`tokens/d3.skin.tokens.json`) and one module; every popup of the prototype is kept and restyled by one stylesheet; the legend, the narration, the strips and the audits are scripts that regenerate every picture and every number in the spec.

## The five weakest things

1. **The whole-field overview is mostly stacks.** At zoom 13.5 only about 14 percent of the units stand as themselves (66 of 451); the rest are inside 55 stacks. That is the certified layout at this footprint, and the clearance experiment buys only 2 to 6 points; but it means the opening picture shows formations, not regiments, and a viewer who expects a regiment-level overview will not get one.
2. **The type rule costs hierarchy in the popups.** With nothing larger than 13 px the day banner, the welcome headline and every card title are told apart by face and a rule, not by size; they are calm and they are flatter than the prototype's 24 px headlines. I followed the owner's rule; I do not think the result is the strongest it could be.
3. **Weak devices.** Under a 4x CPU slowdown the page runs at 18 to 39 frames a second in dense scenes (two runs, desktop and phone viewports); the engine (layout and display) dominates and no sprite cache or cadence was built. At normal speed it holds 60 frames a second with a 16.8 ms p95 (SPEC.md, section 12), on one machine.
4. **The symbol is not on the true position.** A mark is centred on its unit's true position, so the cell sits left or right of it, and the cell slides sideways when a mark grows to its name; the pin only appears when a mark is displaced. Anchoring on the symbol is the better cartography and is a change to the layout, the display layer and the popups.
5. **Unreviewed, and some things unverified.** No designer, historian or person with a colour-vision deficiency has looked at it; the APP-6 conventions come from secondary sources; the font files were made from the copies an installed application carries (their own licence notices say OFL, their identity with the upstream release was not checked); only Chrome was run; the dispositions (charging, retreat ...) are not on the map at all; the legend has 23 rows; and a mark under the bar or the dock is at the edge of the viewport, partly hidden by the interface.
