# Bachelder 1876 sheets: line STATE of every unit label, read by eye (2026-10-30)

Companion to `TROOP-MAPS-NOTES.md` (sections 7 and 8 record why the automatic legend-swatch classifier was rejected). This pass read, by eye and per claim, the legend's line state of the line each label belongs to, for all 458 claims of `history/positions/troopmap_jul1_b1876.jsonl` (115), `troopmap_jul2_b1876.jsonl` (178) and `troopmap_jul3_b1876.jsonl` (165). Frozen copies of the three files as they were before this pass: `history/positions/_orig_linestate/`. Tools: `tools/bt/troopmaps/linestate_crops.py` (crops, reading montages, calibration set), `linestate_record.py` (running record of the readings, `terrain/troopmaps/line_state_readings.json`), `linestate_writeback.py` (writes the readings into the claim files). Nothing here changes a position, a unit assignment, a tier, `when.printed`, `t_iso`, `t_start_iso`, `t_end_iso` or `clock_attachment`.

## 1. The legend (each sheet prints its own; reference crops at 5x in `terrain/troopmaps/crops_state/_legend_<sheet>_<side>.png`)

Each sheet's legend has two columns of four swatches, Union (blue) on the left and Confederate (red) on the right, with the row heads "First Position", "Intermediate", "Evening", "All Day". Scan boxes of the swatch blocks (scan px, x0 y0 x1 y1): sheet 1 US 2475 10245 2615 10380, CS 2685 10243 2825 10372; sheet 2 US 2510 10405 2655 10540, CS 2695 10422 2840 10555; sheet 3 US 2475 10520 2625 10655, CS 2672 10515 2815 10645 (`crops_state/_manifest.json` carries them with a 10 px margin).

| Legend state | What is printed (all three sheets, both colours) | Reference crop |
|---|---|---|
| First Position | a hollow outlined bar whose fill is a dark wedge: solid at one end, tapering to the bare outline at the other | top swatch of `_legend_a_US.png`, `_legend_b_CS.png`, `_legend_c_CS.png` (and the other three) |
| Intermediate | a thin line (about a quarter of the bar width) with a short perpendicular tick at each end | second swatch |
| Evening | a solid bar of full width, no outline, no hollow strip | third swatch |
| All Day | a hollow outlined bar with a solid band of constant width along one long side and a hollow strip along the other (no taper) | bottom swatch |

Printing differences that matter when reading the map: the Confederate swatches are a light red and the wedge or band inside the outline is easy to see at 3.5x; the Union swatches are dense dark blue and the wedge of the first-position bar reads as a solid bar below about 5x (the 5x checks on TMJ1-020, TMJ1-037, TMJ1-038 and TMJ1-048 showed the hollow outline at one end that a 3.5x view had hidden). The sheet-2 Union first-position swatch itself is weakly printed (the taper is faint); the distinction used on sheet 2 was taper (first) against even band (all day). Symbols the legend assigns no state to: artillery (rows of gun marks, "comb" symbols), dotted lines of squares and dashed lines with arrowheads (movements), the skirmisher rows of small squares, and the rows of short solid blocks that draw the Pickett-Pettigrew line of July 3 (not one of the four swatches; no state was claimed for them).

## 2. Method

1. For every claim a crop of the scan around `geo.scan_px` (line-symbol anchor, green ring) and `geo.label_px` (label centre, magenta ring) was stored losslessly at native resolution with the sheet's own legend swatches of the same colour beside it: `terrain/troopmaps/crops_state/<claim_id>.png` (465 files, 60 MB; `_manifest.json` gives origin, size and the reading zoom per crop: scan = origin + img px). Windows: 180 x 126 px for Union anchored claims (read at 5x), 200 x 140 for Confederate anchored claims (3.5x), 300 x 210 centred on the label for label-only claims (2.33x).
2. The reading was done in montages of those windows at the stated zoom (tmp/troopmaps/ls_mont/, not committed), one claim at a time, comparing the bar texture with the legend strip of the same sheet. Where the montage left a doubt the symbol was re-cropped at 5x or 7x (`crop.py`).
3. Per claim the record holds `when.line_state` (first | intermediate | evening | all_day | mixed | unreadable), `when.line_states` (the states present, mixed only), `when.line_state_basis` (what was seen: style, tint, position relative to the label, and for an unreadable claim why), `when.line_state_crop`, `when.line_state_read` (method tag) and `when.printed_clock_near_line` (any clock or time word printed beside the line, verbatim, or null). Earlier non-null values of `line_state` / `line_state_legend` (three sheet-1 claims) are kept in `when.line_state_prev`; all three agree with this read.
4. Rules applied, so that nothing is guessed: (a) a state is claimed only when the bar's texture matches one swatch and the bar runs along or through the label (or is the anchored symbol of the claim); (b) a label that names a division, corps, commander, staff officer or headquarters, or a battery drawn as a comb, has no line of its own and is `unreadable` with that reason, even when a brigade's bar stands beside it; (c) a brigade label whose anchor sits on its own letters or on empty ground, with the regiment bars not shown to belong to it in the crop, is `unreadable` ("tie not shown") rather than assigned the nearest bar; (d) when two bars of different styles carry the same label the claim is `mixed` and both states are listed; (e) a thin line without visible end ticks is still the thin-line class of the legend (intermediate) and the basis says the ticks were not resolved.

## 3. Calibration (brief step 3): 30 of 30

`terrain/troopmaps/line_state_calibration.json`. 30 claims, 10 per sheet, drawn with `random.Random(20261030)`, read first in 3x per-claim crops, then a second time blind (ids hidden, order shuffled, numbered 1-30) in 2x tiles of a different window. The two reads agree on all 30 (threshold in the brief: 28). Composition of the 30: evening 14, unreadable 10, first 3, intermediate 2, all_day 1. Caveat: agreement is between two reads by the same reader, not against an external truth; no hand-classified reference set exists for these sheets. The full pass then used a larger zoom than either calibration pass (section 2).

## 4. Counts

| State | Sheet 1 (July 1), 115 | Sheet 2 (July 2), 178 | Sheet 3 (July 3), 165 | All, 458 |
|---|---|---|---|---|
| first | 18 | 11 | 9 | 38 |
| intermediate | 10 | 15 | 2 | 27 |
| evening | 34 | 46 | 40 | 120 |
| all_day | 4 | 16 | 2 | 22 |
| mixed (two states at one label) | 5 | 1 | 4 | 10 |
| unreadable | 44 | 89 | 108 | 241 |
| readable, of the anchored claims | 70 of 90 | 86 of 123 | 51 of 67 | 207 of 280 |
| readable, of the label-only claims | 1 of 25 | 3 of 55 | 6 of 98 | 10 of 178 |
| printed clock or time word recorded beside the line | 39 | 26 | 4 | 69 |

Mixed claims (both states listed in `line_states`): sheet 1 TMJ1-064 (Devin, Morning), TMJ1-092 (O'Neal 1 P.M.), TMJ1-095 (Iverson), TMJ1-096 (Gordon), TMJ1-100 (Hoke); sheet 2 TM2-015 (Gordon); sheet 3 TM3-117 (Kemper 11 Va.), TM3-129 (Wilcox), TM3-144 (Scales), TM3-145 (Mahone). In every case one bar is first-position and the other evening on the same line or at the same label.

Why sheet 3 has so many unreadable claims: 98 of its 165 claims are label-only (the July 3 pass read many division, corps and commander labels, and brigade labels in the Ridge and Culp's Hill zones, without anchoring a bar), and the Pickett-Pettigrew line is drawn in a block style the legend does not define.

Readings that differ from an earlier note: the sheet-1 bars of Pettigrew (TMJ1-009, TMJ1-111), Daniels (TMJ1-113) and Ramseur (TMJ1-115), called "hatched, not matched" in TROOP-MAPS-NOTES section 8, are the all-day style (outlined bar, solid band along one long side); the Ramseur, Daniels and Rodes-front bars TMJ1-036/061/065 are plain solid (evening). Clock re-reads: TM2-089 and TM2-153 print "[?] A.M. to 12 M." by this read (the glyph before A.M. is not legible at 7x; the earlier reads give "A.M. to P.M." and "A.M. to 12 N."); `when.printed` was not changed, the re-read is in `printed_clock_near_line`. Two time words beside a line belong to a neighbouring label and are marked so: TMJ1-026 ("Morning" is printed with the 3' Ill. Cav. regiment label), TM2-068 ("6 P.M." belongs to BREWSTER 2'd, TM2-090).

## 5. Unreadable claims (241) and the reason recorded for each

By reason class: 110 labels of a division, corps, commander, staff officer, headquarters or artillery command (text only, no line of their own); 41 brigade labels whose bar tie is not shown in the crop (anchor on the letters or on empty ground); 37 artillery comb symbols; 22 labels on movement lines or arrows (dashed or dotted); 12 labels in overprinted zones (Cemetery Hill, East Cemetery Hill, Culp's Hill) where no bar can be tied; 7 labels on the row-of-short-blocks line of July 3 (Davis, Lane, Pettigrew, Archer-Frye, Scales, Garnett, Armistead, Kemper, Perry, Wilcox: not one of the four swatches); 2 skirmisher symbols; 10 other (notes, Not Engaged labels, bars hidden by tree symbols, a thin line too short to classify). The full list (claim, printed text, reason as recorded in `when.line_state_basis`):

- TMJ1-002 (POAGUE'S BATT.): artillery comb symbol (gun rows), not a line-state style
- TMJ1-004 (PENDER'S ... DIVISION): division label, text only; the adjacent bars (38', 13') are the brigade lines, not the label's own
- TMJ1-007 (GARNETT'S BATT.): artillery comb symbol (gun rows)
- TMJ1-010 (BROCKENBROUGH Va. (in Reserve)): text only, printed BROCKENBROUGH Va. (in Reserve); no bar belongs to the label
- TMJ1-011 (McGOWAN S.C.): label-only claim; the nearest bar (solid, about 60 px east, running NE) is not shown to be this label's line
- TMJ1-015 (HETH'S DIVISION): division label, text only
- TMJ1-017 (McINTOSH BATT.): artillery comb symbol
- TMJ1-019 (HILL'S COR[PS]): corps label, text only
- TMJ1-022 (HALL 2 Me.): artillery comb symbol (Hall's battery)
- TMJ1-023 (ROWLEY): division label (Rowley), text only; the 150 Pa. bar beside it is Stone's
- TMJ1-025 (BUFORD 1st Div. Cav. 3.30 P.M.): division label block (BUFORD 1st Div. Cav. 3.30 P.M.), text only; the 3 Ill. Cav. bar beside it is Gamble's
- TMJ1-027 (REYNOLDS L.I. N.Y.): artillery comb symbol (Reynolds's battery)
- TMJ1-034 (WADSWORTH'S DIV.): division label, text only; the 76 N.Y. 10.15 A.M. bar beside it is Cutler's
- TMJ1-039 (ROBINSON'S DIVISION): division label, text only
- TMJ1-041 (WAINWRIGHT Comds. 1st Corps Chief ): staff label, text only
- TMJ1-042 (GEN. DOUBLEDAY comds. 1st Corps): corps commander label, text only
- TMJ1-043 (COL. WAINWRIGHT, Chief [Arty.]): staff label (Col. Wainwright, chief of artillery), text only
- TMJ1-045 (STEVENS 5'Me.): artillery comb symbol (Stevens's battery)
- TMJ1-046 (ROBINSON'S DIV.): division label, text only
- TMJ1-049 (GEN. WADSWORTH 3 P.M.): headquarters label (GEN. WADSWORTH 3 P.M.), text only; the 19 Ind. bar beside it is Meredith's
- TMJ1-051 (COOPER B.1'Pa.): battery label with gun comb symbols; the thick bar at the anchor is the 14 N.Y.S.M. infantry bar, not the battery's
- TMJ1-057 (GAMBLE 1'Brig. 1'Div. Cav. 4 P.M. ): the symbol at the anchor is a thin line with dotted segments (dotted = movement per the legend; dismounted cavalry noted in the label), not one of the four line styles
- TMJ1-060 (RODES ... DIVISION): division label, text only
- TMJ1-070 (Skirmishers of Devin's Cavalry. MO): skirmisher symbol (row of small squares) above a thin line; not one of the four line styles
- TMJ1-071 (WHEELER 13'N.Y. (Independent)): artillery comb symbol (Wheeler's battery)
- TMJ1-073 (DILGER 1.1'Ohio): artillery comb symbol (Dilger's battery)
- TMJ1-074 (SCHURZ'S DIVISION): division label, text only
- TMJ1-075 (SCHIMMELPHENNIG Commanding): commander label, text only
- TMJ1-076 (GEN. SCHURZ Com'dg 11' CORPS.): corps commander label, text only
- TMJ1-077 (OSBORNE Chief Arty.): staff label (chief of artillery), text only
- TMJ1-085 (O'Neal's Brigade (dotted line)): dotted line of small squares (dotted lines are movements per the legend), no line state
- TMJ1-086 (BARLOWS DIVISION): division label, text only
- TMJ1-087 (G 4 U.S. WILKINSON): artillery comb symbol (Wilkeson's battery)
- TMJ1-091 (EWELL'S CORPS): corps label, text only
- TMJ1-093 (RODES' DIVISION): division label, text only; the 5' In Reserve bar below is another unit's
- TMJ1-094 (CARTER'S BATT.): artillery comb symbol (Carter's battalion)
- TMJ1-098 (EARLY'S DIVISION): division label, text only
- TMJ1-099 (JONES' BATT.): artillery comb symbol (Jones's battalion)
- TMJ1-104 (K.1'Ohio HECKMAN): artillery comb symbol (Heckman's battery)
- TMJ1-106 (GENL. HOWARD Com'd the field after): headquarters label (Howard), text only
- TMJ1-107 (STEINWEHR'S DIV.): division label, text only
- TMJ1-108 (WIEDRICH): artillery comb symbol (Wiedrich's battery)
- TMJ1-112 (ARCHER): the anchor sits in the wood where the bar is covered by tree symbols; a wide solid bar is visible further east but its tie to this ARCHER label is not certain
- TMJ1-114 (CARTER'S BATT.): artillery comb symbol (Carter's battalion)
- TM2-003 (HETH'S DIVISION): division label, text only
- TM2-004 (NELSON BATT. (Not Engaged)): artillery comb symbol; printed (Not Engaged)
- TM2-005 (O'NEAL ALA.): label O'NEAL ALA. text; anchor on black road linework; no red bar in the tile
- TM2-006 (CARTER'S BATT. (Not Engaged)): artillery comb symbol; printed (Not Engaged)
- TM2-007 (HETH'S DIVISION (Not Engaged)): division label, text only; printed (Not Engaged)
- TM2-008 (PETTIGREW N.C.): label text only, anchor on a black stream line; no bar in the tile
- TM2-010 (DANIELS N.C.): label text (DANIELS N.C.) with the anchor on a thin red outlined bar at the tile edge, too little of it visible to read the style
- TM2-014 (Sharpshooters O'Neal's Brigade): sharpshooter note (Sharpshooters O'Neal's Brigade), anchor on black town linework; no bar of its own
- TM2-016 (LT. GENL. HILL'S CORPS): corps label, text only
- TM2-017 (GARNETT BATT. (In Reserve)): artillery comb symbol; printed (In Reserve)
- TM2-021 (PENDER'S DIV.): division label, text only; the 38', 13', 6' bars beside are brigade lines
- TM2-023 (McINTOSH BATT.): artillery comb symbol
- TM2-024 (GARNETT BATT. (vertical)): artillery comb symbol
- TM2-026 (RODES DIVISION): division label, text only
- TM2-027 (RODES DIVISION): division label, text only
- TM2-032 (8 P.M. EARLY'S DIVISION): division label with a clock, on a dashed red movement line; no bar
- TM2-035 (PEGRAM'S BATT.): artillery comb symbol
- TM2-038 (PENDER'S DIVISION): division label along the bar, text only; the bar is McGowan's (TM2-037)
- TM2-041 (SMITH 2D): anchor falls on a small square (building) symbol; the thick solid bar 60 px east is not shown to be this label's line; label text outside the 5x tile
- TM2-043 (STEINWEHR): division label (Steinwehr) text only in the crowded Cemetery Hill zone
- TM2-044 (HOWARD): corps commander label text only in the crowded Cemetery Hill zone
- TM2-045 (SCHURZ): division label text only in the crowded Cemetery Hill zone
- TM2-046 (D. HARRIS): anchor on a small square symbol in a zone of overprinted thin lines (East Cemetery Hill); no bar can be tied to the HARRIS label
- TM2-048 (EARLY'S DIVISION 6.45 P.M.): division label (EARLY'S DIVISION 6.45 P.M.) with the anchor on a black road; the solid red bar in the tile (SE) is a brigade line, not tied to the division label
- TM2-049 (COL. WAINWRIGHT Chief 1' Corps Art): staff label (chief of artillery), text only
- TM2-050 (ROBINSON'S D.. Morning): division label (ROBINSON'S D.. Morning), text only, on the sheet edge
- TM2-051 (POAGUE'S BATT. Not Engaged): artillery label; printed Not Engaged; no bar
- TM2-052 (WRIGHT GA.): anchor on contour linework; the solid red bar east is Wright's line but the label text is out of the tile; style read on TM2-056/057
- TM2-053 (GENERAL LEE (Afternoon)): headquarters label (GENERAL LEE (Afternoon)), text only
- TM2-054 (PERRY.- LANG.): label on dashed red lines (movement per the legend); no bar
- TM2-058 (ROBINSON Early morning): division label (ROBINSON Early morning), text only
- TM2-059 (BAXTER 2'D): anchor on an artillery comb symbol; no bar for BAXTER 2'D in the tile
- TM2-060 (PAUL- COULTER 1'D): label text only; the anchor is empty, an artillery comb below
- TM2-061 (HAYS): label (HAYS) text only, anchor on the letters; bars east belong to regiments
- TM2-062 (ANDERSON'S DIVN): division label, text only
- TM2-064 (WILCOX ALA. 6 P.M.): anchor in a zone of overprinted blue bars and red dashed lines; no red bar can be tied to the WILCOX 6 P.M. label
- TM2-069 (3'd HALL): label text with an empty anchor; the solid bar beside (19 Me.) carries a regiment name of another brigade
- TM2-070 (RANSOM): artillery comb symbol (Ransom's battery)
- TM2-072 (HUMPHREY'S DIV.): division label, text only
- TM2-076 (BARKSDALE MISS.): label text with the anchor on a red bar partly hidden by the wood symbols at the tile edge; too little visible
- TM2-079 (RANDOLPH Chf. 3' Corps Arty.): staff label (chief of artillery), text only
- TM2-080 (GRAHAM): anchor on empty ground beside red artillery marks; the solid bar NE carries another regiment label (4' Ex.)
- TM2-084 (HUMPHREYS Afternoon): division label with the word Afternoon, text only
- TM2-085 (ALEXANDER'S BATT. 7 P.M.): artillery comb symbol; printed 7 P.M.
- TM2-086 (GEN. SICKLES Com'd 3' CORPS): corps commander label, text only
- TM2-094 (ROBINSON Not Engaged): division label with Not Engaged; the solid bar beside is Thompson's battery line
- TM2-096 (1'D CARR): label text with an empty anchor; the solid bars north carry other regiment labels
- TM2-099 (ALEXANDER BATT. MAJ. HUGER Com'd): artillery comb symbol
- TM2-100 (LT. GEN. LO[NGSTREET]): corps commander label, text only
- TM2-105 (ZOOK 3'd): anchor on empty ground; the solid bar west is labelled KELLY, the bars south-east are unlabelled in the tile; ACCURACY.md already notes the Zook anchor as offset
- TM2-108 (SWEITZER): anchor on ink fragments among tree symbols; the solid bar NE is not shown to be this label's line
- TM2-109 (COL. McGILVERY Reserve Arty.): artillery comb symbols (Reserve Artillery)
- TM2-110 (BIRNEY): division label with the corps badge, text only
- TM2-111 (BARNES): division label with the corps badge, text only
- TM2-112 (CALDWELL): division label with the corps badge, text only
- TM2-113 (GEN. SYKES Com'd 5 Corps): corps commander label, text only
- TM2-116 (NEVIN WHEATON): brigade label (NEVIN WHEATON) text only; the solid bars either side carry regiment names (102 Pa., 93 Pa.) that are this brigade's but the anchor sits on the label, so the tie is not shown in this crop
- TM2-117 (BARTLETT): anchor on contour and tree linework; no bar for the vertical BARTLETT label in the tile
- TM2-120 (LONGSTREET'S CORPS): corps label, text only
- TM2-124 (CABELL'S BATT.): artillery comb symbol
- TM2-125 (HOOD'S DIVISION HOOD LAW): division label on a dotted blue line; no red bar
- TM2-130 (CRAWFORD): division label (CRAWFORD), text only
- TM2-131 (McCANDLESS): anchor on thin black map linework; no blue bar can be tied to the vertical McCANDLESS label in the tile
- TM2-136 (DOUBLEDAY [...] till 6.30 P.M.): division label (DOUBLEDAY ... till 6.30 P.M.), text only; the solid bars north are regiments
- TM2-141 (GIBBON): division label, text only; the outlined bars above are Harrow's / Webb's regiments
- TM2-142 (GENERAL MEADE'S Head Quarters): headquarters label, text only
- TM2-143 (Capt. HAZARD Chief 2' Corps Arty.): staff label (chief of artillery), text only
- TM2-144 (CALDWELL, morning till 4 P.M. then): division label with a stated span (CALDWELL, morning till 4 P.M. then moved), text only
- TM2-145 (STONE WISTER DANA 2'd Not Engaged): brigade label (STONE WISTER DANA 2'd Not Engaged) text only; the solid bars either side carry other regiment names
- TM2-147 (DOUBLEDAY): division label, text only
- TM2-148 (GEN. NEWTON 1' CORPS): corps commander label, text only
- TM2-149 (GEN. HANCOCK Com'd 2' CORPS): corps commander label, text only
- TM2-155 (RUGER - WILLIAMS CORPS 7.45 P.M. N): corps label (RUGER - WILLIAMS CORPS 7.45 P.M. Not Engaged), text only
- TM2-156 (GEN. TYLER Com'd Reserve Arty.): artillery commander label, text only
- TM2-159 (WHEATON): brigade label (WHEATON) text only; the solid bars beside carry regiment names (65 N.Y., 23 Pa., 82) but the anchor sits on the label
- TM2-161 (TORBERT 1'd): anchor on the letters of the vertical TORBERT label beside the corps-badge cross; no bar
- TM2-162 (RUSSELL 3'd): anchor on the letters of the vertical RUSSELL label; no bar
- TM2-163 (WRIGHT): corps commander label (Wright), text only; agrees with calibration
- TM2-164 (GEN. SEDGWICK Com'd 6 Corps): corps commander label, text only
- TM2-165 (GEN. SYKES Com'd 5 Corps): corps commander label, text only
- TM2-166 (Capt. MARTIN Chief 5 Corps Arty.): staff label (chief of artillery), text only
- TM2-167 (HENRY'S BATT.): artillery label on dashed red lines (movement); no bar
- TM2-170 (ANDREWS' Batt MAJ. LATIMER Com'd): artillery label, text only; no comb at the anchor
- TM2-171 (GEN. EWELL'S CORPS): corps label, text only
- TM2-174 (JOHNSON'S DIVISION): division label (vertical) in the wood, text only
- TM2-175 (STEUART): anchor on contour and tree linework; the wide solid red bar NE of it is not shown to be this label's line (STEUART label outside the tile)
- TM2-176 (KANE, PA. 2'd): label text only (KANE, PA. 2'd), anchor on empty ground
- TM2-177 (Von AMSBERG 1'd): label text only in an overprinted zone (Cemetery Hill), no bar at the anchor
- TM2-178 (GEARY): division label (GEARY) with the corps star, text only
- TM3-002 (PENDER'S DIV. N.C.): division label, text only
- TM3-005 (RODES DIVISION): division label, text only
- TM3-007 (EARLY'S DIV.): division label, text only; agrees with calibration
- TM3-008 (ROBINSON'S DIV.): division label in the crowded Cemetery Hill zone, text only
- TM3-009 (BAXTER 2D): anchor in a zone of overprinted thin lines and bars (Cemetery Hill); no bar can be tied to the BAXTER 2D label
- TM3-010 (1ST PAUL): brigade label (1ST PAUL) in the crowded zone; the hatched thin bars beside are not tied to it in the crop
- TM3-011 (WADSWORTH'S DIV.): division label (Wadsworth) on Culp's Hill, overprinted, text only
- TM3-013 (GEARY): division label (GEARY) with the corps star, text only
- TM3-014 (CANDY 1st): brigade label (CANDY 1st) in the overprinted Culp's Hill zone; no bar tied
- TM3-015 (KANE): brigade label (KANE) with the corps star in the overprinted Culp's Hill zone; the thick bars NE carry 147 Pa. but the tie is not shown
- TM3-016 (LOCKWOOD Independent): brigade label (LOCKWOOD Independent Brigade), text only; the thick bar above is 150 N.Y. (Lockwood's) but the anchor sits on the label; tie not shown in the crop
- TM3-019 (JOHNSON'S DIVISION): division label, text only
- TM3-026 (RUGER): division label (RUGER) with the corps star, text only; the thick bars south are regiments (46 Pa., 5 Ct., 3 Wis.) of its brigades
- TM3-029 (WILLIAMS Com'd'g 12 Corps): corps commander label, text only
- TM3-030 (GEN. SLOCUM Comd'g Right Wing): wing commander label, text only
- TM3-031 (GEN TYLER Com. Reserve Arty. Not E): artillery commander label with Not Engaged, text only
- TM3-032 (GEN. MEADE'S HEAD QRS.): headquarters label, text only
- TM3-033 (EUSTIS 2'): the anchor is on a thin dark line with end ticks (7 Ms, 10 M regiment names beside); the thin line is the intermediate style but the EUSTIS label is 60 px south and other regiments stand between: tie not shown
- TM3-035 (SHERRILL): brigade label (SHERRILL MacDOUGALL) text only; the thick bars north carry regiment names but the anchor sits on the label
- TM3-036 (HALL 3'): brigade label (HALL 3') text only in the Ridge zone; bars not tied
- TM3-038 (GEN. HANCOCK Com. LEFT CENTRE): commander label, text only; agrees with calibration
- TM3-039 (DOUBLEDAY): division label, text only
- TM3-040 (NEWTON): corps commander label, text only
- TM3-041 (HUMPHREYS DIVISION): division label, text only
- TM3-045 (BIRNEY Com. 3' CORPS): corps commander label, text only
- TM3-046 (CAPT. RANDOLPH Chf. 3' Corps Arty): staff label (chief of artillery), text only
- TM3-047 (CROSS): brigade label (CROSS) text only in a zone of overprinted bars; no bar tied
- TM3-048 (BROOK 2): brigade label (BROOK 2) text only; thin dotted lines and bars beside not tied
- TM3-049 (ZOOK 3d): brigade label (ZOOK 3d) text only; no bar tied
- TM3-050 (BREWSTER 2'): brigade label (BREWSTER 2') text only here; the vertical solid bars of this brigade are read on TM3-042
- TM3-051 (BURLING 3'): brigade label (BURLING 3') text only here; the bars of this brigade are read on TM3-043
- TM3-052 (BIRNEY Com'd'g 3' [Corps]): corps commander label, text only
- TM3-053 (WARD'S DIVISION): division label, text only
- TM3-055 (MADILL 1'): brigade label (MADILL 1') with the corps badge, text only
- TM3-056 (3d RICE): brigade label (3d RICE) text only; the thick bars east (20 Me., 44 N.Y.) are this brigade's regiments but the anchor sits on the label; tie not shown
- TM3-057 (1st TORBERT): brigade label (1st TORBERT) text only in the wood; no bar tied
- TM3-058 (WRIGHT): brigade label (WRIGHT) text only in the wood; the thick bars beside are not tied
- TM3-059 (SWEITZER 2'): brigade label (SWEITZER 2') vertical, text only; the thick solid bar beside it is not shown to be its line in this crop
- TM3-060 (COL. TOMPKINS Chf. 6' Corps Arty): staff label (chief of artillery), text only
- TM3-061 (SEDGWICK Com. 6' CORPS): corps commander label, text only
- TM3-062 (SYKES Com 5' CORPS): corps commander label, text only
- TM3-063 (BARTLETT 2): brigade label (BARTLETT 2) with the corps badge, text only
- TM3-065 (DAY 1'): brigade label (DAY 1') text only; no bar tied
- TM3-066 (AYRES): division label (AYRES) in the wood, text only
- TM3-067 (CAPT. MARTIN Chief 5' Corps Arty): staff label (chief of artillery), text only
- TM3-069 (HOWE): division label (HOWE) with the corps badge and the note These Troops not engaged, text only
- TM3-070 (RUSSELL 3'): anchor on the corps badge (cross) beside the RUSSELL label; the solid bar SW carries 6 Me.; tie not shown
- TM3-072 (PENDER'S DIV. LANE Com'g): division label, text only
- TM3-074 (DAVIS): the DAVIS label stands on a line of short solid red blocks (row of dashes); the row-of-blocks symbol is not one of the four legend swatches, so no state is claimed
- TM3-075 (HETH'S DIVISION): division label, text only
- TM3-076 (LANE): LANE label on a dashed red arrow line among rows of short solid red blocks; neither the arrow nor the block row is one of the four legend swatches
- TM3-077 (PETTIGREW): PETTIGREW label on a dashed red arrow line beside rows of short solid blocks; not one of the four swatches
- TM3-078 (ARCHER FRYE): ARCHER FRYE label beside dashed arrows and rows of short solid blocks; not one of the four swatches
- TM3-079 (SCALES): SCALES label beside dashed arrows and rows of short solid blocks; not one of the four swatches
- TM3-081 (SMYTH 2d): SMYTH 2d label (vertical) between a red row of short blocks and thick blue bars (12 N.J., 1 Del.); the blue bars belong to the regiments but the anchor is on the label; read as all_day on TM3-152 from the regiment bars
- TM3-082 (SHERRILL 3d): SHERRILL 3d label (vertical) text only; the thick blue bars beside carry regiment names; tie not shown in this crop
- TM3-083 (HAYS): HAYS label (vertical) text only among bars; tie not shown
- TM3-084 (GARNETT): GARNETT label among rows of short solid red blocks (Pickett's line); the row-of-blocks symbol is not one of the four swatches
- TM3-085 (PICKETT'S DIV.): division label, text only; dashed arrows beside
- TM3-086 (ARMISTEAD): ARMISTEAD label beside rows of short solid red blocks; not one of the four swatches
- TM3-087 (KEMPER): KEMPER label beside short solid red blocks; not one of the four swatches
- TM3-088 (Garnett): script label on a dashed movement arrow; movement, no line state
- TM3-089 (Armistead): script label on a dashed movement arrow; movement, no line state
- TM3-090 (Kemper): script label on a dashed movement arrow; agrees with calibration
- TM3-091 (Perry): script label on a dashed movement arrow; movement, no line state
- TM3-092 (DEARINGS Batt.): artillery comb symbol
- TM3-093 (CABELL'S BAT.): artillery comb symbol
- TM3-094 (STANNARD 3'): anchor on the letters of the STANNARD label; the solid bar at the right edge carries 14 Vt. but the tie is not shown in the crop
- TM3-095 (HALL 3'd): HALL 3'd label (vertical) text only on the Ridge; thick bars beside belong to regiments; tie not shown
- TM3-096 (WEBB 2d): WEBB 2d label (vertical) text only; the regiment bars are read on TM3-037
- TM3-097 (ROWLEY): ROWLEY label text only; the thick bar beside carries 20 N.Y.S.M. and 151 Pa.; tie not shown in this crop
- TM3-098 (Wilcox): script label (Wilcox) on a dotted line of squares (movement per the legend); no line state
- TM3-099 (PERRY. FLA.): PERRY FLA. label along a row of short solid red blocks (regiment blocks); the row-of-blocks symbol is not one of the four legend swatches
- TM3-100 (WILCOX. ALA.): WILCOX ALA. label along a row of short solid red blocks; not one of the four swatches
- TM3-101 (BARKSDALE'S BRIGADE as Skirmishers): skirmisher symbol (row of small red squares), printed Skirmishers; not a line-state style
- TM3-102 (MAJ. McGILVERY Reserve Arty.): artillery label block (battery names), no bar
- TM3-103 (BARTLETT 2d): brigade label (BARTLETT 2d) on a movement arrow with 5 P.M.; the arrow is a movement, no line state
- TM3-104 (WHEATON): brigade label (WHEATON) text only; the thick solid bar NE is not shown to be its line
- TM3-105 (NEVIN 3d): brigade label (NEVIN 3d) along a thick solid blue bar (NW-SE): the bar runs through the label letters but the anchor sits on the letters; the bar is solid (evening style) but the tie to NEVIN rather than a regiment is not shown
- TM3-106 (McCANDLESS): brigade label (McCANDLESS) vertical, text only
- TM3-107 (CRAWFORD'S DIV.): division label, text only; agrees with calibration
- TM3-111 (1' TILTON): brigade label (1' TILTON) text only in contour hatching; no bar
- TM3-112 (3d FISHER): brigade label (3d FISHER) text only in contour hatching; no bar
- TM3-114 (HOOD'S DIV. LAW.): division label, text only
- TM3-115 (COL. WALTON Chief 1' Corps Arty.): staff label (chief of artillery), text only
- TM3-119 (ALEXANDER'S COM'DS BATT'S): artillery comb symbols
- TM3-120 (CABELL'S Batt's): artillery comb symbols
- TM3-122 ([PENDER'S] DIVISION ...BLE Com'd'g): division label (vertical), text only; the dashed arrow beside is a movement
- TM3-126 (PICKETT'S VA.): division label (PICKETT'S VA.), text only; dashed arrows beside
- TM3-130 (PENDER'S DIV. moved to its right a): division label with the note moved to its right at 1 P.M., on a dashed red line (movement); no bar
- TM3-135 (HETH'S DIVISION): division label (HETH'S DIVISION, vertical) text only; the outlined bars beside (12', 19') are brigade lines
- TM3-137 (POAGUE Not Engaged): artillery label with Not Engaged and comb symbols; no bar
- TM3-139 (SCHURZ): division label in the overprinted Cemetery Hill zone; agrees with calibration
- TM3-140 (HOWARD Com'd. 11 Corps): corps commander label, text only
- TM3-141 (STEINWEHR D[IV.]): division label (STEINWEHR), text only
- TM3-142 (AMSBERG 1[st]): brigade label (AMSBERG 1st) in the overprinted Cemetery Hill zone; no bar tied
- TM3-143 (COSTER): brigade label (COSTER) in the overprinted Cemetery Hill zone; thick bars beside not tied
- TM3-147 (PEGRAM'S BATT'S): artillery comb symbols
- TM3-148 (McINTOSH Batt.): artillery comb symbols
- TM3-153 (HAYS): brigade label (HAYS) vertical among thick bars; the bars carry regiment names; tie not shown
- TM3-154 (SHERRILL MacDOUGALL): brigade label (SHERRILL MacDOUGALL) text only; the thick bars north are regiments; tie not shown
- TM3-155 (ROBINSON'S DIV.): division label (ROBINSON), text only
- TM3-156 (PAUL 1st): brigade label (PAUL 1st, printed PAUL - BAXTER) text only in the overprinted zone; the hatched bars above are not tied
- TM3-157 (HENRY'S BATT.): artillery label (HENRY'S BATT.) text only; comb symbols below
- TM3-160 (MERRITT (Reserve Brigade) CAV.): cavalry label (MERRITT Reserve Brigade) on a dotted blue line of squares (movement per the legend); no line state
- TM3-163 (FITZHUGH): artillery label (FITZHUGH K 1 N.Y.), text only
- TM3-164 (CAPT. HAZARD Chf. 2' Corps Arty.): staff label (chief of artillery), text only
- TM3-165 ([C]ARROLL): brigade label (CARROLL) rotated in the overprinted East Cemetery Hill zone; thin hatched bars beside not tied

## 6. Proposed rule for the history layer: line state to time window (PROPOSAL, DEC-017 provisional, NOT applied by this pass)

The legend defines the states by position in the day, not by clock. The proposal below is the conservative reading of that definition and would be applied by the history layer only after an owner decision (Law 6); this pass changes no layer file and no default.

*Applied later the same day as a provisional builder choice, DEC-018 (history layer v7, `app/data-contract.md` contract 1.7, `app/HISTORY-LAYER-NOTES.md` subsection "Line states"), with these differences from the text below: the state is carried as documented for (unit, place, state) and the window as modelled (item 7's tier `inferred` was not used); a printed span does NOT override the all-day reading (item 3): only a complete clock printed beside the line is used as a time; two or more intermediates are ordered only by complete clocks (item 4); a mixed label is one item of both states (item 5); an evening line with no known daytime place is drawn at the evening position with the card saying the daytime place is unknown; where a window cannot be met from the gate the difference is a reported state offset. The owner decides whether to keep it.*

1. `first`: the unit is on this line from its arrival gate (PDF B.2.4 ledger; a unit is never on the sheet before its documented arrival) until it moves; the window closes at the start of its next documented line (`intermediate` or `evening` of the same day) or, absent one, at the evening convention. Where the label prints a clock in its own run (`clock_attachment` same_run) that clock bounds the window as the earlier passes already record (`t_iso`); the state adds nothing to a printed clock.
2. `evening`: the unit holds this line at the end of the day; the window opens when its previous documented line closes (or at a printed clock) and runs to the day's end (midnight of the sheet's date, or the unit's documented night move if the ledger has one).
3. `all_day`: the unit is on this line for the whole day from its arrival gate to the day's end; a printed span ("morning till noon", TM2-091/154; "[?] A.M. to 12 M.", TM2-089/153) overrides the whole-day reading with the printed span.
4. `intermediate`: between the unit's first and evening lines; the order among several intermediate lines of one unit is unknown unless a printed clock says. The layer should draw it as an unordered stop between first and evening, with the card saying that the order is not known.
5. `mixed`: two lines carry one label; treat as two claims (first and evening) at the two bars; the DEC-011 rule (several labels are several states, listed on the card, none drawn as one place) already covers the case.
6. `unreadable` and label-only claims: no window from the state; the day-level treatment of DEC-010/011 stands.
7. Tier: a window derived from a state is `inferred` (the map prints the state; the clock is modelled from the legend's definition and the ledger), never `documented`; a window from a printed clock in the label's own run stays as the earlier passes classed it. Every such window is marked on the card as read from the legend's line style with the crop reference.
8. Conflicts: where the state's window contradicts an OR-derived gazetteer time for the same unit and day, the two are carried as a selectable scenario, no default picked (CLAUDE.md hard rules).

## 7. Cost and files

About 100 image views (87 montages, 30 calibration tiles in 5 images, 20 zoom checks, 6 legend crops), roughly 0.6 million tokens. Files written: `history/positions/troopmap_jul{1,2,3}_b1876.jsonl` (new `when` fields only), `history/positions/_orig_linestate/` (frozen copies), `terrain/troopmaps/crops_state/` (465 PNG), `terrain/troopmaps/line_state_readings.json`, `terrain/troopmaps/line_state_calibration.json`, `tools/bt/troopmaps/linestate_crops.py`, `linestate_record.py`, `linestate_writeback.py`, this file, DEC-017 in `GOVERNANCE/decision_log.md`, a line in `GOVERNANCE/progress.md`.
