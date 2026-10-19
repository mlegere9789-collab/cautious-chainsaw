# Release look: the chosen option (director, after two review rounds)

**Status: CHOSEN, NOT APPROVED.** This file is written at the orchestrator's instruction after two review rounds ended without approval. It names the best option and lists every flaw that is still open, honestly. It does not say the look is free of errors, and it must not be read as an approval of the open items in "Known limits".

## The choice

**A, Standards** (`option-a-standards.html`, tokens in `tokens/standards.tokens.json`, skin `src/skins/standards.mjs`).

Why A over B:
- A was judged in full in round 1 and round 2 (15 scenes, crops, 20 popup pictures, desktop and phone). B was judged only at its opening still in round 2, so it has no verdict.
- Round 1 fixes 1 to 9 are closed on A's stills (director round 2, section 1). Fixes 10 and 11 were B-only and are not judged.
- Gates on A (director round 2, section 2): 0 vital overlaps in 288 frames (A and B, desktop and phone; the gate measures tile footprints only); DOM text at least 11 px; lettering contrast median worst 6.68 (the glyph's own edge counted as ink; method change accepted); mark against ground at least 3:1 (worst 3.83); sides separated under protan, deutan and tritan (CIEDE2000 51.2, 57.7, 64.9; need 20 or more).

**B (Glyph, the "Survey" switch) must NOT ship.** Remove the A/B switch from the bundle, or have B judged separately first.

## Known limits (to be reported to the owner; nothing here is closed)

State of the source at commit 3330a5c: no builder change to `release-look/` since the round 2 review (bcfda1d). I re-checked two items directly in the current files; the rest are as seen in the round 2 stills.

### Wrong or unverified displayed data (these are the owner's binding "every wrong datum fixed" rule)

1. **Invented echelons printed as fact (R2-1).** Records `C-III-4` and `C-II-4` in `data/dataset.json` have `inOob: false`, `parentSource: "idpattern"`, label "III/4" / "II/4", no designation (checked just now). The look prints "4th Div, 3rd Corps", "5th Div, 1st Corps", "4th Div, 2nd Corps" and "3rd/4th Bde, 4th Div, 3rd Corps". The Confederate army had no such divisions. 95 of the 478 records in the dataset have `inOob: false`; I did not count how many of them reach a printed name. Seen in `s1a`, `s1b`, `s3`, `s9`, popups 03, 07, 09, 11, 15. B's opening still has the same fault. **Blocks approval: this is a wrong displayed name.**
2. **Iron Brigade strength (DATA owner).** The card prints "1,600 of 3,865" with a 41 % bar. `U-I-1-1` has `strengthRef` 3865 (checked just now), while its five regiments sum to 1,814 and its keyframes run 1883, 3865, 1883, 1883, 1800, 1600; 3865 is very probably an outlier. No published source was checked. **Not mine to patch; needs a source.**
3. `strengthRef` 6100 (III/4) and 4700 (II/4) are unexplained, with the invented echelons above.
4. Some units appear before their historical arrival (for example "1st Div, 6th Corps" east of town at 4:30 AM July 2). Not checked against a source.
5. The legend says each ground mark "stands for about ten men"; the builder's note says 70 % of modelled men. Neither figure is verified.

### Visual and behaviour defects seen in the round 2 stills

6. **Ghost tiles (R2-2).** `popups/06` shows two translucent flags over "Plum Run" and "The Wheatfield". `src/scene/display.mjs` still fades and dissolves tiles (`RELOC_MS = 130`, line 31, and the header describing a relocate that "fades out where it stands"). This is against the owner's "no ghost tiles" decision. **Blocks approval.**
7. **Pin on a place name (R2-3).** On the phone (`s5`, tick 551, zoom 14.5) a unit pin sits on the "o" of "Codori Farm". The 288-frame sweep does not test pins or ring against place names.
8. **Contested flag looks like a white flag (R2-4).** Four pale hatched flags in `s1b`; no side colour, and the card does not name the two disagreeing sources.
9. **Overview map has no ground (R2-5).** The rail minimap is dots on black with no aerial, no town or ridge names, and about 60 % of the rail is empty.
10. **Ground marks read as noise at the opening zoom (R2-6).** Dashes over the town and woods below zoom 15; they are modelled, not recorded.
11. **Crowd flag size and crowd words (R2-7).** One crowd flag ("2nd Corps 13") is drawn about twice the size of the others with no pips, against the legend; crowd words such as "3rd, 5th Corps" read as a corps name.
12. **Tour and event cards with no place on the map (R2-8).** `popups/03` (Garnett at The Angle) and `popups/06` (Little Round Top) have no leader, ring or place label.

### Smaller polish items (none blocks on its own)

13. Crop files in `shots/a-standards/final/` predate the re-render and were not re-cut.
14. `popups/09` overclaims "no mark covers another" (true of unit tiles only).
15. Menu entries "Pile A / B / C" are jargon.
16. In the legend the word beside a sample sits below the flag's centre.
17. On the phone the sheet text fades into the transport bar with no visible end to the scroll.

### Not verified at all

Real phone, Safari, Firefox; all motion (every statement about gliding or fading comes from stills); colour-blind readers (sides' separation is by simulation and geometry only; the greyscale luminance ratio is 1.09:1, so colour alone does not separate the armies); the ground-marks row of the legend (read in source `skins/standards.mjs`, not seen in a still); the data behind the pictures (counts, casualty totals, clock text, positions, arrival times); B beyond its opening still.

## What would make this an approval

Close items 1, 6, 7, 8, 9, 10, 11, 12, then re-shoot (settled stills, the swap strip across the 130 ms, the phone place-name check, the overview, the opening with a density wash, popups 03 and 06), re-cut the crops, re-run `tools/audit.mjs`, the select sweep and a name-versus-mark count; the director then re-runs `tmp/look-director/audit-dir.mjs` and `sweep.mjs`. Item 2 and items 4 and 5 need the DATA owner and a cited source.

Full evidence for every item: `DIRECTOR-r1.md` and `DIRECTOR-r2.md` in this folder.
