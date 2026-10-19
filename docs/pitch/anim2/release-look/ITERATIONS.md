# Iterations: what I saw, what I changed

Method. After every render I looked at the whole still at DPR 2, then the 100 % crop and the 200 % crop (nearest neighbour) of the busiest 600 x 400 px, as a hostile creative director would, and wrote down what was wrong before I changed anything. Each round below says what the pictures showed, what I changed, and which pictures show the result. Pictures are in `shots/a-standards/iter-N` and `shots/b-glyph/iter-N` (the iteration folders were reduced to 1440 px JPEGs to keep the folder committable and their 200 % crops dropped; the `final` folders are full size and are the last round of each). A had six rounds of changes, B five; both were then rebuilt and re-rendered once more as the final.

The starting point was not blank: both options reuse the first round's engine, layout, popups and tools, the symbology job's colour module and the basemap's aerial (see README). The first round's look boards (`../LOOK-BOARD.md`) and the owner's references (`../refs/`) are what I measured myself against: flags planted as the unit mark, a scale hierarchy, one grade on real terrain, a battle that remembers.

## Round 1: the first renders (A: opening and Wheatfield; B: Wheatfield and close-up)

**A, seen.** (1) The ground read as brown sepia mud: dark, one-note, and the cloth did not sit in it. (2) The flags were 10 to 21 px against 13 px bold lettering: the caption was louder than the standard, the opposite of "flag far, figures close". (3) A raw id reached the map: a crowd said "of C-ART-II-3". (4) A crowd read "of 2nd Corps + 2 regiments, 2 of unknown side": long, and for a Confederate flag the words come first and the number second, so "of 3rd Corps 33" read as a nonsense figure. (5) The casualty marks were 6 px sticks with a bright edge: confetti. (6) The chrome was the first round's generic navy.
**B, seen.** The ground was newsprint grey and dull, but the glyphs were strong: discs and rounded squares, rings for rank, stacks for crowds were read at once. The strength gauge was filled in the side's colour, so a ring of full strength read as a second outline of the glyph.

**Changed.** A: poles and flags about 30 % larger; the grade lifted and given an olive cast; the crowd words lost their "of" and "unknown side" became "contested" (the site's evidence word); a node that is no unit (an artillery battalion or corps artillery brigade) now takes the order of battle's own designation (`layout/words.mjs`); the casualty marks smaller. B: the gauge filled in dark ink.

## Round 2: A only (opening, Wheatfield, close-up)

**A, seen.** The ground was now a natural khaki and the planted standards stood in it: this was the right direction. Still: the unit flags were small tags with their code beside them as lettering, so a regiment read as "flag plus caption", two things; the formation flags only just outranked the regiment flags; the casualty marks still looked like sticks.
**Changed.** The chrome (`look-a.css`, `look-b.css`: tokens and the signature details of each language), a warm B ground, the first full scene set for both.

## Round 3: the full scene set for both options, with the first chrome

**Seen, A.** The popups sat in the same warm language as the marks, but (1) the flag-tab on the left of every card was not drawn: the first round's stylesheet had set the stripe to `display: none`; (2) the legend figure collided with itself: the Confederate specimen ran into the artillery one, the rank row was cut at the right edge ("1s"), and the last caption was cut at the bottom; (3) the crowd words were long ("3rd Corps + 4 regiments, 4 contested"), true, and left as they are.
**Seen, B.** A coherent editorial look, but (1) the top bar showed white blobs between its buttons (a shadow on every button of a joined row); (2) the same legend overflow as A (the third rank item clipped, the last caption missing); (3) the ground still cold grey.
**Changed.** The legend figure of both rows re-laid out (the Confederate specimen on its own row, the rank items shortened to "Bde / Div / Corps", the age row moved left, the figure height raised to 720); the button shadows removed from the joined rows; the B ground warmed and lightened (a paper with a hint of warmth); A's cloth given a slow wave and a light-to-shade gradient, the shadow darker; the casualty marks scaled with the zoom; A's ground a little lighter.

## Round 4: both options, crops at 200 %, A's popups, B's unit card

**Seen, A.** The 100 % and 200 % crops were clean: the pole has a dark line and a cream line, the foot a dot, the cloth an edge, no mark touches another. The strength bar under the flag read as a hem, not as strength, but it is quiet. The casualty marks at the closest zoom were still sticks, not fallen figures.
**Seen, B.** The crops were the cleanest picture yet: crosses on the ground read as marks at once. The gauge arc on a regiment glyph was the heaviest ring of the picture: a full-strength unit wore two dark rings.
**Seen, popups.** A's day banner, clock and narration were consistent with the marks. B's unit card had the serif title and the thin rule, but the 3 px tone rule at the top of every card was not drawn (the same `display: none` as A's tab).
**Changed.** The ground marks close up become fallen figures (a body and a head); B's gauge lightened to 62 % of the outline ink; the `display: none` of the first round's card stripe overridden in both stylesheets (A's flag-tab, B's top rule); the overview map restyled (the sides in each option's own colours, the ground marks as faint dots, the camera box in the option's ink); the formation font set to 13 px bold (the two map sizes are now 12 and 13 px) and the width table measured again in Chrome.

## Round 5: both options (minimap in the rail, B's Day 3 assault, B's phone)

**Seen, A.** The overview in the rail was in the same warm glass with the faint ground marks. But looking at A beside the brief: "short code on the flag only when it fits" was not done. The codes still stood beside the flags in a halo, so a regiment was still two things, and the formation flags were barely taller than a regiment's.
**Seen, B.** The Day 3 assault at the opening zoom showed the field remembering: the crosses gather in the town, along the western ridges where the first day was fought and in the south round the Wheatfield and Plum Run, and are thin elsewhere. The phone sheet and the crowd hulls (hairlines to each unit a crowd stands for) read well. No change needed.
**Changed (A).** The short code now stands ON the flag from the full zoom (the cloth is as long as the code needs; white on the cloth, ink on the glass of a hollow flag), and only the full name stands beside it; artillery's cloth is arrow-ended so the code fits it; formation poles 34 / 44 / 56 px and flags 30 x 20 / 38 x 26 / 48 x 32 px, so a brigade outranks a regiment even though the regiment's flag is long.

## Round 6: A only (Wheatfield, close-up, opening, legend)

**Seen.** A now reads as a set of nameplate flags on poles: the regiments' flags carry "13 MS", "21 MS", the brigades' and divisions' flags are larger and blank with their names beside them, and the crowds carry their counts. The hierarchy (pole height, flag size) is legible at the opening zoom. The selected 82nd New York grew its name beside its flag with a ground ring at its foot, and its card hangs from a flag-tab in the same blue.
**Seen by measuring (`tools/audit.mjs`).** (1) The mark's separation from the ground was 3.07:1 at the mid-tone band of the Wheatfield (the cream edge 3.07, the dark line at 62 % 3.06): a pass with no margin. (2) The interface used two sizes outside its scale: a 14 px brand and 12 px definition lists in the legend rail. (3) The legend figure of A still lost its last caption (the figure needs 744 px at the rail's width, I had given it 720).
**Changed.** The dark line under the pole and the flag at 88 % (a token, `pole.edgeAlpha`); the brand and the definition lists to the interface scale (11, 13, 17 px); A's figure height to 770 px.

## Final: both options

Pictures: `shots/a-standards/final` (A at round 6 plus the three fixes) and `shots/b-glyph/final` (B at round 5, rebuilt with the shared fixes), each with the 100 % crop and, for the opening, Day 3 and close-up scenes, the 200 % crop; `shots/*/final/popups` the popups; `shots/compare-A-vs-B.jpg` the two side by side. Numbers: SPEC.md section 9.

## What I could not fix, and why

- **The opening view is dense** (109 to 169 marks for 344 to 456 units, 65 to 79 % of the units inside counted crowds): the layout merges what cannot stand clear, and the owner's default says no nudging of full marks.
- **The two armies are almost the same lightness** (1.09 : 1 in A, 1.20 : 1 in B). The second cue is geometric (the way a flag flies; the shape family), not lightness.
- **Hollow formations in B** (a carried-forward brigade or division glyph with its rings) read as a target. It says what it should (the latest keyframe is a battle day old or more) but it is not elegant; a better device needs a decision about how formations age.
- **Place and road names of the ground** are the basemap's and sometimes run under a mark.
- **Casualty marks are a model** (70 % of the modelled men, secondary totals, modelled time and place); the legend says so, and they are the one device in either option that a historian should still check against Busey and Martin regiment by regiment.
