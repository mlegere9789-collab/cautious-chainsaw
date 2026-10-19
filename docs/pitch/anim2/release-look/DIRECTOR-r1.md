# Director review, round 1 (acting for the owner)

Verdict: **NOT APPROVED. Choose A (Standards) as the look, with the 11 fixes below.** `APPROVED-LOOK.md` is not written. B (Glyph) is not approved in any form.

Judged on: every still in `shots/a-standards/final` and `shots/b-glyph/final` (full size, the 200 % crops, all 20 popup pictures of A, the popups of B that differ), `shots/compare-A-vs-B.jpg` (opened; consistent with the still-by-still reading), the owner's references (`refs/ref-campaign-map.webp`, `ref-battle-closeup.webp`, `rejected-first-prototype-compare.png`). Gates were run by me in my own Chrome profile and port 9420-9422 (`tmp/look-director/`), against the builder's pages as committed (3449e82).

## 1. A or B

**A.** It is the only one of the two that answers the owner's references: a flag planted in the ground per unit, bigger flag = bigger force, one warm grade on the real aerial, a calm tooltip, dark period-leaning chrome with brass hairline, the same atmosphere as the campaign-map reference. Hierarchy reads at the opening view (the corps and division flags are found first, regiment tags last). The rejected prototype's faults (two boxes per unit, no hierarchy, tiny text, blank grid) are all answered.

B is clean and legible, but it is a different product: a pale survey sheet that washes out the aerial (the owner's reference is dark, graded, atmospheric), glyphs that read as GIS symbols, hollow carried-forward glyphs that read as a target, unexplained grey octagons (s1a), and on the phone a selected unit throws long leader lines to scattered pins (b-glyph `s5`: a spider of 8 lines from "1st, 2nd Corps" and its neighbours to black pins), which is exactly the clutter the owner rejected. The "Survey" switch may stay as an optional theme only after fixes 9 to 11 (or be removed from the shipped bundle: simplest and safest).

## 2. Objective gates (run by me)

| Gate | Result | Evidence |
|---|---|---|
| Vital overlaps (core overlap, pin covered, unrepresented unit, mark under chrome) | **0 in 288 frames** (2 options x desktop 1440x900 and phone 390x844, 16 ticks x 5 views each: zoom 12.5, 13.5, 14.5, 15, 16.5) | `tmp/look-director/sweep.mjs`, `results/sweep.json`. Closest approach of two footprints: 1 px (the design gap). Limit of this gate: it measures tile footprints only, not casualty marks or basemap place names (see fixes 2 and 3). |
| Text size at least 11 px | **PASS** both options | DOM text of the interface: minimum 11 px in 6 states per option (sizes 11, 13, 17 only); canvas lettering sprites 24 to 25 css px tall, fonts 12/13 px bold |
| Lettering contrast at least 4.5:1 on rendered pixels (median neighbour) | **A PASS** (every label, 6 scenes, worst median 6.73). **B FAIL at zoom 12.5**: 97.4 % of labels, worst 4.46:1 | `tmp/look-director/audit-a.log`, `audit-b.log` (the builder's `tools/audit.mjs`, run by me; reproduces the builder's numbers) |
| Same contrast, worst 10 % of neighbouring pixels | **A FAILS in 3 of 6 scenes**: share of labels reaching 4.5 is 93.3 % (s2), 81.1 % (s3), 96.2 % (s4); worst 3.23:1 (s3). A cream flag edge lies 2 to 3 px from the ink in the measuring ring, so part of this is the method, but it was not shown to be only that. B: 92.1 % at z12.5, worst 3.2:1 | same logs |
| Numerals on cloth (token arithmetic) | A: white on union 5.59, on confederate 5.14. B: 6.31 and 5.28 | `src/skins/*.spec.mjs` with `symbology/src/colour.mjs` |
| Sides under protan / deutan / tritan simulation, CIEDE2000 (need at least 20) | **PASS**: A 51.2 / 57.7 / 64.9 (normal 45.6); B 51.8 / 59.0 / 62.6 (normal 46.0) | computed by me |
| Sides in greyscale | luminance ratio 1.09 (A), 1.20 (B): colour alone does not separate them; the second cue is geometry (A: flag flies right or left, plus swallow-tail / arrow ends) | computed; **not tried with colour-blind readers** |
| Bytes | 2,489,712 (A page), 2,489,515 (B page), both under the 16 MB cap; one engine bundle serves both | `ls -l` |

Not run by me: real phone, Safari, Firefox; any motion (this round is stills).

## 3. Required fixes (all must be closed before approval)

Each is something I can see in the committed stills, with its place.

1. **Legend sample row is broken in A.** `a-standards/s7-legend-t60.jpg` and `popups/21-phone-legend-t28.jpg`: in "A unit" the fourth sample ("53 VA", Confederate) wraps onto a second line and sits right-aligned at the edge, away from its three siblings. On the phone the legend card stops 115 px short of the sheet's right edge (card 665 px wide in a 780 px sheet). Lay the four samples in one row (wrap to 2x2, aligned) and make the card full width at 390 px.
2. **Casualty marks print over text that must be read.** The scale bar reads "100 rn" in A and "100 [x]" in B (`s8-hover-tooltip-z16-t551.jpg`, a mark sits on the "m"); in A `popups/07-day-banner-and-clock-t226.jpg` the place name "Barlow's Knoll" is read as "B...ow's Knoll" with a cluster of blue ground marks on its "arl". Ground marks must never be drawn over the scale bar, a place name, a unit name, or any chrome: draw them under all lettering and keep them out of the scale bar's box.
3. **Place and road names are not decluttered.** Basemap names run under flags and under each other: "Railroad Cut" stacked on "Gettysburg & Harrisburg Railroad Cut" (`popups/02-story-in-the-rail-t28.jpg`), "Barlow's Knoll" under ground marks (fix 2); I did not measure how many names in total are covered, so the builder must count them before and after. Place names are displayed information too. Run a label pass: a place name yields (moves, shortens, or hides below a stated zoom) when it would touch a unit's footprint or another name; the same duplicate name is shown once.
4. **A mark state with no legend entry.** The hatched flags (A, `popups/07`, five flags at lower left) and the grey octagons (B, `s1a`) are never explained. The legend must show every mark state the map can draw: fresh, carried forward, selected, strength bar, crowd, mixed-side crowd (A draws it blue/red split, which is right: say so), unknown or contested side (the hatch), and ground marks.
5. **The phone event card was never shown.** `popups/17-phone-sheet-event-t28.jpg` shows no sheet (the builder says so). The phone's event card and story sheet must be shown open, in A, with a unit selected and the unit's flag visible above the sheet.
6. **Phone selected unit loses its mark.** `a-standards/s5-phone-z14.5-sheet-t551.jpg`: with 14 VT selected the only trace on the map is a bare ring dot at upper right, far from the sheet, with no flag and no name; the user cannot tell which unit the sheet is about. Keep the selected unit's full mark (flag and name) in the visible map, and pan the map so it clears the sheet.
7. **Contrast, stated gate.** Median contrast passes in A, the worst-decile does not (table above). Either put 3 px of cloth margin between the code or numeral and the flag edge so a clean ring is measurable and show p10 at 4.5 or more in all six scenes, or show by pixel evidence that the failing pixels are the flag edge and nothing else. Same gate for B if B stays (zoom 12.5 numeral: 4.46).
8. **Rank flags are blank rectangles.** `s2`, `s3`, `s4` A: brigade and division flags carry nothing; they read as placeholders next to the reference's flags with a device. Add a legitimate, derived device only (rank bars or pips: one, two, three for brigade, division, corps; the corps number if documented), no invented insignia.
9. **Duplicate crowd words.** `a-standards/s9-minimap-in-the-rail-t551.jpg` (overview): "Pickett's Div, 1st Corps" appears on three separate flags (and "Anderson's Div, 3rd Corps" twice, "Armistead's Bde 4" and "Armistead's Bde 2" in the builder's own note). A crowd's words must be unique on screen: add what distinguishes it (the number of its regiments out of the brigade's, or the part of the line, "north", "centre"), derived from the data.
10. **B only: mixed-side crowds.** `b-glyph/s1a`: "both armies 4" is drawn as a plain Union glyph. A mixed crowd must show both sides (A already does).
11. **B only: leader-line spider.** `b-glyph/s5`: displaced marks around the selection get long hairlines to far pins. Limit leader length, or draw one bundle.

## 4. Not claimed

I did not verify the data behind the pictures (counts, casualty totals, clock text), real devices, other browsers, or any animation.

## 5. Next step

Builder closes fixes 1 to 9 (A) and either 10 and 11 or drops B from the bundle; re-shoots the affected stills (legend, phone sheets, scale bar, overview, banner); the director re-runs the gates (`tmp/look-director/audit-dir.mjs`, `sweep.mjs`) and then writes `APPROVED-LOOK.md`.

## 6. Resume check (2026-10-19, 11:50)

The builder's latest report is still the round-1 report. Every still and result in `shots/` is older than this review (last write 00:31, review 01:14); nothing under `shots/` changed since. The working tree holds uncommitted builder edits (skins, layout, `crowdnames.mjs`, legend, rebuilt pages at 02:28) but no re-shot stills, so there is nothing new to judge: the look is judged on stills only.

Re-opened `a-standards/final/s7-legend-t60.jpg` and `s5-phone-z14.5-sheet-t551.jpg`: fix 1 (fourth legend sample "53 VA" wrapped and right-aligned) and fix 6 (selected 14 VT has no flag or name on the map, only a ring dot at upper right) are still present exactly as written. The verdict stands: NOT APPROVED, `APPROVED-LOOK.md` not written, the 11 fixes of section 3 all open. Next step is unchanged (section 5): commit the builder's fixes, re-shoot the affected stills, then the director re-runs `tmp/look-director/audit-dir.mjs` and `sweep.mjs`.
