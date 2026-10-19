# Director review, round 2 (acting for the owner)

Verdict: **NOT APPROVED. The look is A (Standards), and it is close, but 8 required fixes remain.** `APPROVED-LOOK.md` is not written.
B (Glyph) is not approved and is not part of the bundle: I opened only its opening still this round (`b-glyph/final/s1a`), which is clean and legible, but I did not re-judge B in full, so the "Survey" switch in the top bar must not ship with the look (remove it, or have B judged on its own).

Judged on: every still in `shots/a-standards/final` (the 15 full-size scenes, the 200 % crops that exist, all 20 popup pictures: 01 to 18, 21, 22; the phone ones at 390 px), the owner's references (`refs/ref-campaign-map.webp`, `ref-battle-closeup.webp`, `rejected-first-prototype-compare.png`), plus two crops I cut myself (`tmp/look-director/crops/`: Codori Farm on the phone, the ghost flags of popup 06, the white flags of s1b). Gates were run by me, in my own Chrome profile on ports 9420 and 9422, against the pages as committed (9bd5cf0).

## 1. Round 1 fixes: what I found

| R1 fix | Status | Seen in |
|---|---|---|
| 1 legend sample row | closed | `s7-legend-t60`, `popups/21-phone-legend`: the four samples sit in one two-column grid; the phone card is as wide as the sheet |
| 2 marks over lettering | closed | `s8` scale bar reads "100 m"; `popups/07` "Barlow's Knoll" is clean |
| 3 names decluttered | **partly closed**: duplicates gone, but see R2-3 and R2-2 | `popups/02`, `s6` have one "Railroad Cut"; `s5` phone still has a pin on a place name |
| 4 legend states | closed | the figure draws fresh, carried, selected, bar full and 40 %, contested hatch, crowds of each side, both armies, ranks with pips; the source (`skins/standards.mjs` lines 262 to 273) also draws the ground marks, which sit below the fold of every still, so I read them in the source, not in a picture |
| 5 phone event card and story | closed | `popups/17`, `18`: sheet open, Coster's flag and ring visible above it |
| 6 selected unit on the phone | closed | `s5`: 14 VT has its flag, its name and a ring above the sheet |
| 7 contrast | **accepted, with the method change** | see section 2 |
| 8 rank devices | closed | one, two, three pips on brigade, division, corps (`s2`, `s3`, `s9`, legend) |
| 9 unique crowd words | closed on the stills | `s9` has "Pickett's Div, 1st Corps" and "... east"; "Anderson's Div, 3rd Corps, east" and "west". It brought a new wording problem (R2-7) |
| 10, 11 (B only) | not judged | B is not in the bundle |

## 2. Objective gates (run by me)

| Gate | Result | Evidence |
|---|---|---|
| Vital overlaps (core overlap, covered pin, unrepresented unit, mark under chrome) | **0 in 288 frames**: A and B, desktop 1440 x 900 (80 frames each) and phone 390 x 844 (64 each), 16 ticks over 5 views | `tmp/look-director/sweep.mjs`, `sweep2.log`; closest approach 1 px (the design gap). **Limit: this gate measures tile footprints only. It does not see a pin on a place name (R2-3), a ghost mid-fade (R2-2) or the words of a mark.** |
| Text at least 11 px | **PASS** | DOM text minimum 11 px in the legend, the unit card and the event and story states (sizes 11, 13, 17 only); canvas lettering sprites 24 to 25 css px tall (`audit-a3.log`) |
| Lettering contrast, median neighbour, 6 scenes | **PASS**, worst median 6.68 (s3) | `audit-a3.log`, my script `audit-dir.mjs` |
| Same, worst-decile neighbour, **the old method** (anti-aliased fringe of the numeral counted as background) | **FAILS where I last failed it, but for the reason the builder gave**: share of labels at 4.5 or more is 100 % in four scenes, 97.3 % in s3 (worst 2.82), 84.6 % in s4 (worst 2.84) | I reproduced the builder's `results/audit-a-nofringe.json` exactly. I opened `final/evidence-p10-fringe-s3-4VA.jpg`: every failing pixel (magenta) is a half-covered edge pixel of the numeral, none on plain cloth or on the flag edge. **I accept the new method (the glyph's own edge is ink).** The median is the gate that counts, and it passes with margin. |
| Numeral on cloth, token arithmetic | 5.14 (standard set), 5.05 (colour-blind set), 6.23 (high-contrast set) | `results/audit-a.json` |
| Mark against the ground, at least 3:1 | PASS, worst 3.83 (three-days-z12.5, median band) | same |
| Sides under protan, deutan, tritan, CIEDE2000 (need 20 or more) | **PASS**: 51.2, 57.7, 64.9 (normal 45.6) | same |
| Sides in greyscale | luminance ratio **1.09:1**: colour alone does not separate the armies; the second cue is geometry (flag flies right for Union, left for Confederate; swallow-tail and arrow ends). **Not tried with real colour-blind readers.** | same |
| Bytes | 2,512,520 (A page), 2,512,323 (B page); 16 MB cap | `ls -l` |

Not run by me: real phone, Safari, Firefox, any motion. Every statement above about marks "gliding" or "fading" comes from stills.

## 3. What is good (so the fixes are read against it)

A answers the references: a planted standard per unit, hierarchy by pole height and flag size, pips for rank, one warm grade on the aerial, a calm dark chrome with a brass hairline, short codes on the cloth, names in white on a dark halo (legible at every zoom I opened), popups anchored by a leader to the mark, the legend generated from the skin. The rejected prototype's faults (two boxes per unit, no hierarchy, tiny text) are gone.

## 4. Required fixes (all must be closed before approval)

**R2-1. Invented echelons are printed as fact (a wrong displayed name).**
The look prints "4th Div, 3rd Corps", "5th Div, 1st Corps", "4th Div, 2nd Corps", "3rd Bde, 4th Div, 3rd Corps", "4th Bde, 4th Div, 3rd Corps". The Confederate army had no such divisions: its Third Corps had Anderson, Heth and Pender, its First had McLaws, Hood and Pickett. In `data/dataset.json` these are records `C-III-4`, `C-II-4` (and the parent `C-I-5` of `C-I-5-1` and `-2`) with `inOob: false`, `parentSource: "idpattern"`, label "III/4", no designation, and strengthRef 6100 (III/4) and 4700 (II/4): the loader invented the parent from the id; no order of battle names them. `src/layout/words.mjs` already refuses this for the cavalry ("Cavalry group 2/1") and does not for these.
Seen in: `s1a` (4th Div, 3rd Corps, left of centre), `s1b` ("5th Div, 1st Corps", lower centre), `s3` ("4th Div, 2nd Corps" on the Culp's Hill side), `popups/03`, `07`, `09`, `11`, `15`, `s9`. (B's opening still prints "4th Div, 3rd Corps" too.)
Fix: every unit with `inOob` false gets words that say what the record says ("group III/4, not in the order of battle", or the record's own id) and the Contested/unknown state of the legend, never an ordinal division or brigade; one rule for all arms and sides; and a count in the report of how many displayed names come from an id pattern.

**R2-2. Ghost tiles are in the stills, and the place names under them fade with them.**
`popups/06-tour-little-round-top`: two translucent blue flags ("3rd, 5th Corps, east" and "west") at about 40 % opacity, their words printed over the words "Plum Run" and "The Wheatfield" (my crop `tmp/look-director/crops/ghost.png`). The owner's decision is "no ghost tiles; what cannot glide clear swaps in one frame". `src/scene/display.mjs` still states fades, dissolves and a relocate that "fades out where it stands" as the behaviour of the dynamics mode (header lines 9 to 17, `RELOC_MS = 130`).
Fix: no tile is ever drawn between about 0.9 and 0 alpha for more than one frame; a tile that cannot glide clear swaps in one frame; show it in a settled still and in a stills strip taken at every frame of the 130 ms that contained the swap (so the claim can be read), and the reduced-motion path draws no fade at all. Place names yield in one frame too, not by a half-transparent overlap.

**R2-3. A pin on a place name, on the phone.**
`s5-phone-z14.5-sheet-t551`: a blue unit pin sits on the "o" of "Codori Farm" ("C●dori"; my crop `crops/codori.png`). The R1 fix 3 rule was that a place name yields when it would touch a mark; the sweep and the label count (`results/labels-after.json`) do not test pins, only footprints and rotated road boxes.
Fix: place names yield to every part of every mark (pin foot, ring, bar, words), checked over the same 288 sweep frames; report the count of name-versus-mark touches before and after, with the pin and the ring included.

**R2-4. The contested flag reads as a white flag of surrender, and says nothing of itself.**
`s1b`: four pale hatched flags (crop `crops/white.png`) on a dark field read as white flags. Seen at the opening zoom the others are also unnamed (owner's default), but those are coloured by side; these have no colour at all. Fix: a neutral tone that is not white (warm grey-brown hatch with the side-neutral ring), and the legend's word "contested" must also appear in the hover and card of such a unit with the two sources that disagree. The legend row is right; the pale tone is not.

**R2-5. The overview (minimap) has no ground.**
`s9-minimap-in-the-rail`: the rail shows a black box of dots with four faint grid lines, no aerial, no town, no ridge, and about 60 % of the rail empty below it. The reference minimap has terrain and the same hue as the map. Fix: draw the aerial or the relief behind the dots, label the town and the four ridges, enlarge to the rail's width, and let the camera box carry the zoom.

**R2-6. Ground marks are noise at the opening zoom.**
`s1a`, `s1b`, `s2`: strings of blue and red dashes over the street grid of the town and the woods read as scratches on the aerial; at 16.5 (`s4`) they are dashes, not the fallen figures of the owner's closeup reference. They are modelled (the legend says so). Fix: below zoom 15 draw one soft density wash per side (what the field remembers), and from 15 up the individual figures; keep the keep-out of R1 fix 2.

**R2-7. Crowd flag sizes and crowd words.**
(a) `s1a`: "2nd Corps 13" is drawn at about twice the size of the other crowds (and of "3rd Corps + 4 regiments, 4 contested, 36") with no pips, while the legend says every crowd is one size and rank is shown by pips. I cannot tell from the stills if it is the corps' own standard with others folded in or a crowd; either answer is a defect: a corps flag carries three pips, a crowd carries the crowd size. (b) "3rd, 5th Corps", "1st, 2nd Corps", "11th, 12th Corps" and "2nd Corps, Union" read as the name of a corps; add "units of" or a second word ("3rd and 5th Corps units"). "2nd Corps + 1 regiment" with a count of 2 does not say what the other unit is. State the part of the count each word stands for.

**R2-8. The tour and event cards need a place on the map.**
`popups/03` ("Garnett KIA. Shot from his horse at The Angle"): the card floats at the top of the map with no leader, no ring and no "The Angle" label; `popups/06` ("Little Round Top"): two rings on the map with no leader, and "Little Round Top" is not drawn on the map. Where an event has no linked unit, draw a ring at its place with the name of the place beside it and the leader from the card to it, as is done for a linked unit (`popups/01`, `04`).

## 5. Smaller points (fix in the same pass; none blocks)

- The `crop.png` and `crop-200pct.png` files in `shots/a-standards/final/` are dated 11:54 to 11:56, before the 13:19 re-render of the full stills. They were not re-cut from the committed build. Re-cut them.
- `popups/09` says "drawn so that no mark covers another". That is true of tiles (288 frames, 0), not of the ground marks, the place names or the card. Say "no unit mark covers another".
- Names of menu entries "Pile A (carry-forward)", "Pile B", "Pile C" (`popups/14`, `22`) are jargon; name them by place.
- Legend: the word beside a sample sits below the flag's centre in the "A unit" row (`s7`).
- On the phone the sheet's text fades into the transport bar at the bottom of the sheet (`popups/18`); add a visible end to the scroll.

## 6. Data defects seen in the pictures (not mine to patch; reported to the DATA owner)

- **Iron Brigade strength:** `popups/04`, `05` print "Strength at this placement 1,600 of 3,865" and draw a 41 % bar. In `dataset.json` `U-I-1-1` has strengthRef 3865 while its five regiments sum to 1,814 and its own keyframe strengths run 1883, 3865, 1883, 1883, 1800, 1600: the 3865 is an outlier of the same series, so the "of 3,865" and the bar are very probably wrong. I did not check a published source for the true figure.
- `C-III-4`/`C-II-4` strengthRef 6100 and 4700 (R2-1) are also unexplained numbers.
- A unit appears on the map before its historical arrival in some ticks (for example "1st Div, 6th Corps" east of the town at 4:30 AM July 2, `popups/07`); I did not verify the arrival times against a source.
- The legend says each ground mark "stands for about ten men"; the builder's note says 70 % of modelled men. I did not verify either figure.

## 7. Not claimed

I did not verify the data behind the pictures (counts, casualty totals, clock text, positions), real devices, other browsers or any motion. I did not judge B except its opening still. Colour-blind readers were not used; the sides' separation is by simulation and geometry.

## 8. Next step

Builder closes R2-1 to R2-8, re-shoots (settled stills, the swap strip of R2-2, the phone with the place-name check, the overview, the opening with the density wash, `popups/03`, `06`), re-cuts the crops, and re-runs `tools/audit.mjs`, the select sweep and a place-name-versus-mark count; the director re-runs `tmp/look-director/audit-dir.mjs` and `sweep.mjs` and then writes `APPROVED-LOOK.md`.
