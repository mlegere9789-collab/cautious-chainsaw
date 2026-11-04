"""Hand-read labels from Bachelder 1876 sheet 1 (First day's battle), scan cw0325000a.jp2 (LOC 99447491). Read by eye in the ink-layer windows of crops_j1 (win_j1.py, 900x720 at 1.33x; scan = origin + img/1.33).
add(win, text, side, kind, ix, iy, clock=None, state=None, aix=None, aiy=None, aw=None, note=''): (ix,iy) label centre in window image px; (aix,aiy) centre of the line symbol the label belongs to; aw half-extent of that symbol in SCAN px.
text is as printed (brackets mark cut/illegible letters). state: line style per the legend (first position / intermediate / evening / all day) when resolvable, else None."""
import json, os
_R = json.load(open(os.path.join(os.path.dirname(__file__), 'crops_j1.json')))
L = []
def add(win, text, side, kind, ix, iy, clock=None, state=None, aix=None, aiy=None, aw=None, note=''):
    r = _R['a_' + win]; ox, oy = r['origin']; s = r['scale']
    lx, ly = round(ox + ix / s), round(oy + iy / s)
    ax = ay = None
    if aix is not None: ax, ay = round(ox + aix / s), round(oy + aiy / s)
    L.append(dict(text=text, side=side, kind=kind, lx=lx, ly=ly, ax=ax, ay=ay, aw=aw, clock=clock, state=state, note=note, crop='a_' + win))
# --- W_1150_1160 ---
add('W_1150_1160', "THOMAS GA.", 'CS', 'brigade', 705, 600, None, None, 640, 640, 280, "regiment bars 35' 14' 45' 49' 33' (as printed with prime marks); dotted advance arrow SE of the label")
# --- W_450_1720 ---
add('W_450_1720', "POAGUE'S BATT.", 'CS', 'artillery_battalion', 740, 380, None, None, 770, 300, 300, 'two rows of gun symbols NW of the Chambersburg Pike, label along the rows')
# --- P_1000_1950 (plain, origin 650,1650, 2x) ---
add('P_1000_1950', "LANE'S BATT.", 'CS', 'artillery_battalion', 810, 770, None, None, 800, 780, 250, "printed LANE'S BATT.; gun symbols in diagonal rows; not an artillery battalion recorded in units.json by that name (check)")
add('P_1000_1950', "SCALES N.C.", 'CS', 'brigade', 160, 1050, None, None, 245, 765, 200, "bars 38' 13' 34' 22' (16' beyond the crop); this is Scales's WEST line, no clock printed on this line (he is printed again at 4 P.M., see U1 area)")
add('P_1000_1950', "PENDER'S ... DIVISION", 'CS', 'division', 600, 655, None, None, None, None, None, "printed in two parts along the line: PENDER'S (lower left) and DIVISION (upper right); label centre taken between them")
# --- Q_450_2840 (plain, origin 0,2480, 1.5x) ---
add('Q_450_2840', "McGOWAN S.C.", 'CS', 'brigade', 610, 190, None, None, 570, 215, 215, "bars 7' 14' 13' (and 12' in the window above) as printed; the printed Mc is run into GOWAN; label rotated along the line")
# --- Q_1150_1720 (plain, origin 700,1360, 1.5x) ---
add('Q_1150_1720', "LANE N.C.", 'CS', 'brigade', 610, 330, None, None, 495, 405, 230, "bars 33' 18' 28' 37' 7'; printed above the word DIVISION (the PENDER'S ... DIVISION label)")
# --- Q_1850_2280 (plain, origin 1400,1920, 1.5x) ---
add('Q_1850_2280', "GARNETT'S BATT.", 'CS', 'artillery_battalion', 570, 590, None, None, 590, 480, 260, 'gun symbols in parallel rows either side of the Chambersburg Pike; label along the lower row')
# --- Q_1850_2840 (plain, origin 1400,2480, 1.5x) ---
add('Q_1850_2840', "SCALES N.C.", 'CS', 'brigade', 760, 520, None, 'first_position', 690, 730, 217, "second SCALES label on the sheet (the first is further west); bars 13' 34' 22' 16' (38' above): outlined bars with a dark wedge end, the legend's first-position style; no clock printed")
add('Q_1850_2840', "PETTIGREW N.C.", 'CS', 'brigade', 760, 740, None, None, 870, 750, 130, "four wide hatched bars (fill does not match one legend swatch with certainty, so no line state is claimed); label rotated along the bars")
add('Q_1850_2840', "BROCKENBROUGH Va. (in Reserve)", 'CS', 'brigade', 990, 540, None, None, None, None, None, "printed BROCKENBROUGH / Va. / (in Reserve); the words 'in Reserve' are part of the label")
add('Q_1850_2840', "WALLACE", 'CS', 'battery', 1070, 650, None, None, None, None, None, "printed WALLACE beside gun/battery symbols; not an entry of units.json (batteries of McIntosh's battalion are not listed)")
add('Q_1850_2840', "Opening Guns of the Battle. Marye's Arty.", 'CS', 'battery', 940, 190, None, None, 1130, 200, 120, "printed 'Opening Guns of the Battle' and \"Marye's Arty.\" along a line of bars; a battery label, not a units.json entry")
add('Q_1850_2840', "McGOWAN S.C.", 'CS', 'brigade', 1050, 990, None, None, None, None, None, "second McGOWAN S.C. label (first at x 400), bars 12' beside it; line anchor not isolated")
# --- Q_2550_2280 (plain, origin 2100,1920, 1.5x) ---
add('Q_2550_2280', "THOMAS GA.", 'CS', 'brigade', 440, 540, None, None, 335, 635, 220, "second THOMAS label (first at x 1230); bars 14' 45' 49' with a printed 'Supporting ... Artillery' note beside them")
add('Q_2550_2280', "McGRAW. ZIMMERMAN. BATT.", 'CS', 'battery', 470, 900, None, None, 470, 880, 130, "printed McGRAW. ZIMMERMAN. [and] BATT.; comb-shaped gun symbols; batteries of Pegram's battalion, not listed individually in units.json")
add('Q_2550_2280', "DAVIS 9 A.M. MISS.", 'CS', 'brigade', 880, 950, '9 A.M.', None, 830, 960, 110, "printed DAVIS, 9 A.M., MISS. along the line; bars 2' 55' as printed; the clock is part of the printed label text")
# --- Q_2550_2840 (plain, origin 2100,2480, 1.5x) ---
add('Q_2550_2840', "ARCHER 9AM", 'CS', 'brigade', 560, 700, '9AM', None, 545, 640, 140, "printed ARCHER 9AM beside the regiment labels 14 Tenn. and 7 Tenn.; the clock is part of the printed label text")
add('Q_2550_2840', "HETH'S DIVISION", 'CS', 'division', 760, 740, None, None, None, None, None, "red label running up the slope west of Spangler's")
add('Q_2550_2840', "DAVIS MISS.", 'CS', 'brigade', 1240, 630, None, None, 1230, 640, 110, "second DAVIS label, further east (first printed DAVIS 9 A.M. MISS. at x 2690); bars 42' and 55'N.C. as printed")
add('Q_2550_2840', "McINTOSH BATT.", 'CS', 'artillery_battalion', 240, 720, None, None, 200, 700, 150, "printed McINTOSH BATT. beside the comb gun symbols west of Herr Tavern; WALLACE and RICE are printed on the same group")
# --- Q_2550_3400 (plain, origin 2100,3040, 1.5x) ---
add('Q_2550_3400', "BROKENBOROUGH Va.", 'CS', 'brigade', 650, 440, None, None, 600, 330, 150, "second Brockenbrough label (printed spelling as read BROKENBOROUGH); bars in the wood; no clock printed")
add('Q_2550_3400', "HILL'S COR[PS]", 'CS', 'corps', 790, 330, None, None, None, None, None, "red letters HILL'S CORPS running up the slope; split by a fence, the S of CORPS at the upper end")
# --- Q_3250_3400 (plain, origin 2800,3040, 1.5x) ---
add('Q_3250_3400', "CUTLER 2' [with 14 N.Y.S.M. 10.15 A.M.]", 'US', 'brigade', 355, 215, '10.15 A.M.', None, 400, 150, 50, "printed CUTLER, the brigade badge 2' and, in the same text block, '14 N.Y.S.M. 10.15 A.M.'; the clock sits with the regiment label of the line the name belongs to")
add('Q_3250_3400', "CUTLER [with 95'N.Y.]", 'US', 'brigade', 335, 320, None, None, 345, 320, 55, "second CUTLER label (line of the 95th N.Y.); no clock printed on this label")
add('Q_3250_3400', "CALEF 2 U.S.", 'US', 'battery', 655, 225, None, None, 640, 215, 40, "Calef's battery (2 U.S.) printed with 'Opening of the Battle' above it")
add('Q_3250_3400', "HALL 2 Me.", 'US', 'battery', 770, 110, None, None, 735, 70, 40, "Hall's 2nd Maine battery; the printed 'N.Y.S.M.' above it belongs to the 14th regiment label")
add('Q_3250_3400', "ROWLEY", 'US', 'division', 695, 520, None, None, 665, 480, 90, "printed ROWLEY beside STONE and the 150'Pa. bar; Rowley (1st Brigade, later the division) as printed; mapping to units.json is inferred")
add('Q_3250_3400', "STONE 2' [11 A.M. in the text block]", 'US', 'brigade', 750, 490, None, None, 665, 480, 90, "printed STONE with the badge 2'; '11 A.M.' is printed in the next column (BUFORD block) and is carried as nearby, not attached")
add('Q_3250_3400', "BUFORD 1st Div. Cav. 3.30 P.M.", 'US', 'division', 828, 570, '3.30 P.M.', None, None, None, None, "printed BUFORD, '1st Div. Cav.', '3.30 P.M.' (and '11 A.M.') in one text block")
add('Q_3250_3400', "GAMBLE 1'Brig. 1'Div. Cav.", 'US', 'brigade', 905, 590, None, None, 990, 560, 100, "printed GAMBLE 1'Brig. 1'Div.Cav.; the bar to its right is labelled '3'Ill. Cav. Morning'; the word Morning is printed with the neighbouring regiment labels")
add('Q_3250_3400', "REYNOLDS L.I. N.Y.", 'US', 'battery', 915, 810, None, None, 925, 755, 70, "Reynolds's battery (L, 1st N.Y. Light), gun symbols above the label")
add('Q_3250_3400', "SCALES N.C. 4 P.M.", 'CS', 'brigade', 1065, 720, '4 P.M.', 'evening', 1130, 660, 230, "bars 38' 13' 34' 22' 16'; solid red bars (the legend's Evening swatch is the solid bar); third SCALES label on the sheet")
add('Q_3250_3400', "STONE 2' 4 P.M.", 'US', 'brigade', 1310, 650, '4 P.M.', None, 1265, 700, 90, "second STONE label with 143'Pa. 149'Pa. 150'Pa.")
# --- Q_3250_2840 (plain, origin 2800,2480, 1.5x) ---
add('Q_3250_2840', "DAVIS MISS. 10.15 A.M.", 'CS', 'brigade', 1010, 430, '10.15 A.M.', None, 1020, 440, 100, "large red label rotated along a bar; '2 MISS.' (regiment label) beside it")
add('Q_3250_2840', "DAVIS MISS. 3.30 P.M.", 'CS', 'brigade', 555, 790, '3.30 P.M.', None, 580, 800, 70, "printed DAVIS MISS. with '3.30 P.M.' below and 32'N.C. beside; bar west of the Pike")
add('Q_3250_2840', "DAVIS MISS. 3 1/2 P.M.", 'CS', 'brigade', 950, 610, '3 1/2 P.M.', None, 930, 590, 100, "printed DAVIS, MISS. and '3 1/2 P.M.' (printed as 3 with a half); the same text block holds DANIELS N.C.")
add('Q_3250_2840', "DANIELS N.C. 3 1/2 P.M.", 'CS', 'brigade', 1040, 725, '3 1/2 P.M.', None, 1050, 730, 110, "printed DANIELS N.C. along a bar; the '3 1/2 P.M.' above is carried verbatim, attachment to this label not proven")
add('Q_3250_2840', "WADSWORTH'S DIV.", 'US', 'division', 1240, 480, None, None, None, None, None, "blue label running up at the right edge; the divisional badge circle is beside it")
add('Q_3250_2840', "CUTLER 2' 56'Pa. 10.15 A.M.", 'US', 'brigade', 1205, 690, '10.15 A.M.', None, 1220, 700, 80, "third CUTLER label: 56'Pa. bar; '10.15 A.M.' and 76'N.Y. printed in the adjacent column; the clock is carried verbatim")
# --- Q_3950_2840 (plain, origin 3500,2480, 1.5x) ---
add('Q_3950_2840', "RAMSEUR N.C.", 'CS', 'brigade', 555, 235, None, None, 520, 240, 70, "bars 30' 14' as printed; the label is rotated; a further red label IV[ERSON] is cut by the top edge of this window")
add('Q_3950_2840', "BAXTER 2' 1-3 P.M.", 'US', 'brigade', 620, 250, '1-3 P.M.', None, 690, 330, 100, "printed BAXTER with badge 2' and '1-3 P.M.'; regiment labels 97'N.Y. 83'N.Y. 11'Pa.")
add('Q_3950_2840', "PAUL 1' 3-4 P.M.", 'US', 'brigade', 860, 280, '3-4 P.M.', None, 800, 240, 100, "printed PAUL 1' and '3-4 P.M.'; regiment labels 107'Pa. 16'Me. 13'Mass.")
add('Q_3950_2840', "ROBINSON'S DIVISION", 'US', 'division', 910, 420, None, None, None, None, None, "blue label across the slope")
add('Q_3950_2840', "CUTLER 94'N.Y. 3-4 P.M.", 'US', 'brigade', 705, 570, '3-4 P.M.', None, 700, 720, 100, "printed CUTLER, 94'N.Y. and '3-4 P.M. along a blue bar; fourth CUTLER label")
add('Q_3950_2840', "WAINWRIGHT Comds. 1st Corps Chief Arty.", 'US', 'artillery_brigade', 950, 830, None, None, None, None, None, "printed text '[COL. WAINWRIGHT] Comd'g 1st Corps Chief Arty.' read in part (T., comds. 1st CORPS, Chief Arty.); the name is not fully legible in this window (it is printed in full in the 'GEN. DOUBLEDAY / COL. WAINWRIGHT, Chief' block)")
# --- Q_3950_3400 (plain, origin 3500,3040, 1.5x) ---
add('Q_3950_3400', "GEN. DOUBLEDAY comds. 1st Corps", 'US', 'corps', 830, 470, None, None, None, None, None, "printed (read) GEN. DOUBLEDAY ... comds. 1st Corps; Doubleday commanded the I Corps after Reynolds fell; one text block with COL. WAINWRIGHT, Chief Arty.")
add('Q_3950_3400', "COL. WAINWRIGHT, Chief [Arty.]", 'US', 'artillery_brigade', 905, 380, None, None, None, None, None, "printed COL. WAINWRIGHT, Chief ... Arty. (read in part) in the same text block as the Doubleday line; the artillery of the corps")
add('Q_3950_3400', "BAXTER 2' 3-4 P.M.", 'US', 'brigade', 830, 330, '3-4 P.M.', None, 750, 300, 100, "second BAXTER label, with regiment labels 88'N.Y. 97'N.Y. 11'Pa. 12'Mass. 86'Pa.")
add('Q_3950_3400', "STEVENS 5'Me.", 'US', 'battery', 475, 800, None, None, 440, 800, 70, "Stevens's 5th Maine battery, gun symbols (comb) beside the label")
add('Q_3950_3400', "ROBINSON'S DIV.", 'US', 'division', 900, 910, None, None, None, None, None, "second Robinson label (the first reads ROBINSON'S DIVISION); the five bars below belong to PAUL's line")
add('Q_3950_3400', "MEREDITH 1'", 'US', 'brigade', 305, 850, None, None, 345, 760, 90, "printed MEREDITH with the badge 1' along a blue bar at the Seminary; no clock printed on it")
# --- Q_3250_3960 (plain, origin 2800,3600, 1.5x) ---
add('Q_3250_3960', "MEREDITH 1' 10.15 A.M.", 'US', 'brigade', 335, 290, '10.15 A.M.', None, 290, 330, 90, "printed MEREDITH 1' and '10.15 A.M.' in one column (Iron Brigade bars 2 Mich./18'Ind. beside it)")
add('Q_3250_3960', "GEN. WADSWORTH 3 P.M.", 'US', 'division', 430, 170, '3 P.M.', None, None, None, None, "printed 'WADSWORTH 3 P.M.' with 'GEN.' in the next column and the divisional circle badge; division commander label with its own clock")
add('Q_3250_3960', "PETTIGREW N.C.", 'CS', 'brigade', 545, 220, None, None, 470, 330, 206, "second PETTIGREW label; bars 26' 47' 52' as printed; no clock printed")
add('Q_3250_3960', "COOPER B.1'Pa.", 'US', 'battery', 595, 400, None, None, 610, 480, 80, "Cooper's battery B, 1st Pa. Light; the 20 N.Y.S.M. regiment label is printed beside it")
add('Q_3250_3960', "ROWLEY BIDDLE 1' [11 A.M.]", 'US', 'brigade', 745, 340, '11 A.M.', None, 740, 300, 100, "printed ROWLEY and BIDDLE with the badge 1' along the 142'Pa. bar; '11 A.M.' and '8 N.Y. Cav. Morning' are printed in the next column and are carried as nearby")
add('Q_3250_3960', "BIDDLE 1' 2.30 P.M.", 'US', 'brigade', 790, 575, '2.30 P.M.', None, 825, 545, 105, "printed BIDDLE 1' and '2.30 P.M.' under the horizontal blue bars")
add('Q_3250_3960', "McGOWAN S.C. 4 P.M.", 'CS', 'brigade', 1015, 500, '4 P.M.', None, 1075, 380, 150, "bars 12' 13' as printed; third McGOWAN label")
# --- Q_3950_3960 (plain, origin 3500,3600, 1.5x) ---
add('Q_3950_3960', "BIDDLE 1' 4 P.M.", 'US', 'brigade', 330, 320, '4 P.M.', None, 385, 300, 100, "printed BIDDLE 1' and '4 P.M.' along the heavy blue line west of the Seminary; regiment label 151'Pa. below")
add('Q_3950_3960', "PAUL 1' 1-3 P.M.", 'US', 'brigade', 760, 290, '1-3 P.M.', None, 770, 180, 90, "printed PAUL 1' and '1-3.P.M.' under the five blue bars at the Seminary")
add('Q_3950_3960', "GAMBLE 1'Brig. 1'Div. Cav. 4 P.M. (dismounted)", 'US', 'brigade', 600, 980, '4 P.M.', None, 535, 900, 110, "printed GAMBLE, 1'Brig. 1'Div. Cav., '4 P.M.', '(dismounted)' along a blue bar south of the Pike")
# --- Q_3250_4520 (plain, origin 2800,4040, 1.5x) ---
add('Q_3250_4520', "LANE N.C. 4 P.M.", 'CS', 'brigade', 1160, 520, '4 P.M.', 'evening', 1235, 480, 257, "bars 33' 28' 18' 37'(as printed) in solid red; a second line of dashes '(Deployed)' with the numeral 7 south of it is a printed note for the 7th regiment, not read as a brigade label")
# --- Q_3950_4520 (plain, origin 3500,4040, 1.5x) ---
add('Q_3950_4520', "BUFORD 1'Div. Cavalry 4.30 P.M.", 'US', 'division', 1240, 720, '4.30 P.M.', None, 1190, 620, 150, "printed 1'Div. Cavalry BUFORD 4.30 P.M. beside a massed group of cavalry bars east of the Seminary (the group is a mass symbol, not a line)")
# --- Q_3950_2280 (plain, origin 3500,1920, 1.5x) ---
add('Q_3950_2280', "RODES ... DIVISION", 'CS', 'division', 800, 100, None, None, None, None, None, "printed in two parts: RODES (left, at the foot of Oak Hill) and DIVISION (right); label centre taken between them")
add('Q_3950_2280', "RAMSEUR N.C.", 'CS', 'brigade', 845, 415, None, None, 890, 385, 200, "horizontal line of bars (regiment numerals 2 4 12 as printed) east of Mummasburg Rd; no clock printed")
add('Q_3950_2280', "O'NEAL ALA.", 'CS', 'brigade', 990, 595, None, None, 1130, 640, 150, "printed ONEAL / ALA. (the apostrophe is not legible); bars 6'")
add('Q_3950_2280', "IVERSON N.C.", 'CS', 'brigade', 560, 740, None, None, 560, 640, 150, "bars 5' 20' 23' 12' as printed; label rotated along the line")
add('Q_3950_2280', "Devin's Brigade 1'Div. Cavalry Morning", 'US', 'brigade', 400, 790, 'Morning', None, 420, 760, 220, "printed Devin's Brigade 1'Div. Cavalry Morning along the blue cavalry bars; 'Morning' is the printed time label (no clock)")
# --- Q_3250_2280 (plain, origin 2800,1920, 1.5x) ---
add('Q_3250_2280', "DANIELS N.C.", 'CS', 'brigade', 1050, 350, None, None, 1000, 390, 270, "bars 32' 43' 45' 53' (as printed); horizontal line north of the Mummasburg Rd; no clock printed (the same name is printed again with '3 1/2 P.M.')")
add('Q_3250_2280', "BRANDER", 'CS', 'battery', 340, 420, None, None, 330, 380, 60, "five comb-shaped gun symbols above the name; a battery label, not a units.json entry")
# --- Q_4650_2280 (plain, origin 4200,1920, 1.5x) ---
add('Q_4650_2280', "DOLES GA.", 'CS', 'brigade', 1140, 70, None, None, 900, 85, 200, "northern horizontal line (a long thin bar) at the foot of Oak Hill; no clock printed")
add('Q_4650_2280', "DOLES GA. 3.30 P.M.", 'CS', 'brigade', 935, 455, '3.30 P.M.', None, 900, 540, 180, "printed DOLES GA. along a heavy red bar with regiment numerals 21' 44' 4'; '3.30 P.M.' is printed in the next column, just before the words O'Neal's Brigade (a separate dashed line); the clock is carried verbatim")
add('Q_4650_2280', "AMSBERG 3.30 P.M.", 'US', 'brigade', 810, 640, '3.30 P.M.', None, 880, 540, 170, "printed AMSBERG and '3.30 P.M.' along the blue bars north of Gettysburg; another label VON AMSBERG 1' is printed further south")
add('Q_4650_2280', "VON AMSBERG 1'", 'US', 'brigade', 700, 965, None, None, 620, 940, 150, "printed VON AMSBERG with the badge 1'; a thin blue line with squares (skirmish line) above it; no clock on this label")
add('Q_4650_2280', "Skirmishers of Devin's Cavalry. MORNING", 'US', 'brigade', 700, 880, 'MORNING', None, 750, 900, 250, "printed 'Skirmishers of Devin's Cavalry' with 'MORNING'; a skirmish line (dots), not a brigade line; Devin's brigade of Buford's division")
add('Q_4650_2280', "Battalion of Sharpshooters of O'Neal's Brigade", 'CS', 'battalion', 700, 815, None, None, 700, 830, 220, "printed in red italics along a dashed red line; the 5th Alabama Battalion; bar numeral 5")
add('Q_4650_2280', "WHEELER 13'N.Y. (Independent)", 'US', 'battery', 1000, 1045, None, None, 960, 1010, 80, "printed WHEELER ... N.Y. (Independent); a battery with comb gun symbols above the name (the word Independent is printed as read)")
# --- Q_4650_2840 (plain, origin 4200,2480, 1.5x) ---
add('Q_4650_2840', "V. AMSBERG 1'", 'US', 'brigade', 700, 440, None, None, 690, 470, 200, "second AMSBERG label: outlined bars 157'N.Y. 74'Pa. 61'Ohio 45'N.Y. 82'Ill. as printed; no clock printed on this label")
add('Q_4650_2840', "DILGER 1.1'Ohio", 'US', 'battery', 500, 260, None, None, 460, 215, 60, "Dilger's battery I, 1st Ohio, four comb gun symbols above the name")
add('Q_4650_2840', "SCHURZ'S DIVISION", 'US', 'division', 710, 600, None, None, None, None, None, "large letters along the bars of AMSBERG's line")
add('Q_4650_2840', "SCHIMMELPHENNIG Commanding", 'US', 'division', 790, 680, None, None, None, None, None, "printed SCHIMMELPHENNIG Commanding under the SCHURZ'S DIVISION label (he commanded the division after Schurz took the corps)")
add('Q_4650_2840', "GEN. SCHURZ Com'dg 11' CORPS.", 'US', 'corps', 760, 785, None, None, None, None, None, "printed GEN. SCHURZ Com'dg 11' CORPS. (Schurz commanded the XI Corps on July 1)")
add('Q_4650_2840', "OSBORNE Chief Arty.", 'US', 'artillery_brigade', 870, 860, None, None, None, None, None, "printed OSBORNE ... Chief Arty. (read through the overprint of the owner name KITSMAN); XI Corps artillery chief")
add('Q_4650_2840', "Portions of the 1st & 3d Divs. 11' Corps 3.45 P.M.", 'US', 'division', 990, 1010, '3.45 P.M.', None, 1050, 965, 270, "printed text under a line of outlined bars with end ticks (intermediate-state style): portions of two XI Corps divisions at 3.45 P.M.; recorded for both divisions")
# --- Q_5350_2840 (plain, origin 4900,2480, 1.5x) ---
add('Q_5350_2840', "KRYZANOWSKI 2'", 'US', 'brigade', 260, 350, None, None, 230, 190, 150, "printed KRYZANOWSKI with badge 2'; regiment labels 119'N.Y. 26'Wis. 58'N.Y. 82'Ohio 75'Pa. beside the bars")
add('Q_5350_2840', "AMES 2'", 'US', 'brigade', 990, 600, None, None, 950, 675, 130, "printed AMES with badge 2'; regiment labels 25'Ohio 107'Ohio 17'Con 75'Ohio; outlined bars")
add('Q_5350_2840', "HAYS LA.", 'CS', 'brigade', 830, 935, None, None, 680, 950, 150, "red label across the bars east of the Almshouse (the A and the stop are worn); regiment numerals 5' 6' as read")
# --- Q_5350_2280 (plain, origin 4900,1920, 1.5x) ---
add('Q_5350_2280', "GORDON GA. 3 P.M.", 'CS', 'brigade', 1090, 255, '3 P.M.', None, 830, 200, 211, "printed GORDON GA. and '3 P.M.' (the P.M. is run into the label) along a red line with bars 31' 13' 60' 38' as printed")
add('Q_5350_2280', "DOLES GA. 3'P.M.", 'CS', 'brigade', 290, 395, "3'P.M.", None, 250, 450, 180, "third DOLES label: printed DOLES GA. along a bar with 44' 4' and a clock printed 3'P.M. (the prime mark is part of the print); the two clocks are not the same: this line stands at 3 P.M.")
add('Q_5350_2280', "O'Neal's Brigade (dotted line)", 'CS', 'movement', 230, 600, None, None, 330, 520, 200, "printed O'Neal's Brigade along a dotted line of squares running up from the lower left; a dotted line is a movement per the legend; the clock fragment P.M. at its left end belongs to the DOLES 3.30 P.M. label")
add('Q_5350_2280', "BARLOWS DIVISION", 'US', 'division', 780, 725, None, None, None, None, None, "large blue label across Blocher's Knoll (Barlow's Knoll), the divisional badge below")
add('Q_5350_2280', "G 4 U.S. WILKINSON", 'US', 'battery', 880, 590, None, None, 810, 610, 70, "printed G.4.U.S. WILKINSON (read as Wilkeson's battery G, 4th U.S.) with comb gun symbols on the knoll")
add('Q_5350_2280', "Von GILSA 1'", 'US', 'brigade', 940, 490, None, None, 850, 440, 120, "printed Von GILSA with badge 1'; regiment labels 54'N.Y. 153'Pa. 68'N.Y.; bars along the north slope of the knoll")
add('Q_5350_2280', "AMES 2' (knoll line)", 'US', 'brigade', 500, 645, None, None, 520, 560, 150, "printed AMES with badge 2' on the knoll; regiment labels 75'Ohio 107'Ohio 25'Ohio 17'Conn; the second AMES label (the first stands at the Almshouse)")
# --- Q_4650_1720 (plain, origin 4200,1360, 1.5x) ---
add('Q_4650_1720', "DOLES GA. 1'P.M.", 'CS', 'brigade', 1040, 160, "1'P.M.", None, 950, 115, 260, "printed DOLES GA. and '1'P.M.' (prime mark as printed); bars 21' 44' 4' 12' (as printed) in the same long row as O'NEAL")
add('Q_4650_1720', "EWELL'S CORPS", 'CS', 'corps', 700, 590, None, None, None, None, None, "large red label EWELL'S CORPS north of the town")
# --- Q_3950_1720 (plain, origin 3500,1360, 1.5x) ---
add('Q_3950_1720', "O'NEAL ALA. 1'P.M.", 'CS', 'brigade', 1130, 135, "1'P.M.", None, 1000, 80, 240, "printed O'NEAL ALA. and '1'P.M.' (prime mark as printed; the P.M. lies in the window to the east) under a long outlined bar with numerals 12' 20' 6' 5'; one continuous row with DOLES's bars")
add('Q_3950_1720', "REESE", 'CS', 'battery', 1050, 240, None, None, 1040, 220, 50, "Reese's battery (Alabama, Carter's battalion) comb gun symbols beside the name; not an entry of units.json")
add('Q_3950_1720', "RODES' DIVISION", 'CS', 'division', 1080, 485, None, None, None, None, None, "red label RODES' DIVISION across the slope of Oak Hill (printed twice more: RODES / DIVISION at the foot of the hill)")
add('Q_3950_1720', "CARTER'S BATT.", 'CS', 'artillery_battalion', 410, 840, None, None, 430, 790, 150, "printed FRY. CARTER. / CARTER'S BATT. under comb gun symbols on Oak Hill; battery names Fry and Carter are printed above")
# --- Q_3250_1720 (plain, origin 2800,1360, 1.5x) ---
add('Q_3250_1720', "[IV]ERSON N.C.", 'CS', 'brigade', 930, 160, None, None, 920, 125, 260, "label printed (IV)ERSON N.C.: the first letters are covered by a road line; bars 12' 23' 20' 5' as printed; the same long row as O'NEAL and DOLES; no clock printed on this label")
# --- Q_6050_1720 (plain, origin 5600,1360, 1.5x) ---
add('Q_6050_1720', "GORDON GA.", 'CS', 'brigade', 390, 385, None, None, 345, 410, 257, "bars 60' 31' 13' 38' (as printed, 38' near the Harrisburg Rd) in one row with HAYS and HOKE; no clock printed")
add('Q_6050_1720', "HAYS LA.", 'CS', 'brigade', 650, 355, None, None, 760, 450, 250, "printed HAYS LA. (the A is partly under the road line); bars 6' 7' 8' 9' as printed; '26 Ga.' under the line belongs to Gordon's row")
add('Q_6050_1720', "EARLY'S DIVISION", 'CS', 'division', 1060, 310, None, None, None, None, None, "large red label along the row of bars")
add('Q_6050_1720', "JONES' BATT.", 'CS', 'artillery_battalion', 940, 860, None, None, 900, 840, 200, "printed JONES' BATT. with the battery names GARBER. GREEN. TANNER. beside comb gun symbols east of the Harrisburg Rd")
# --- Q_6750_1720 (plain, origin 6300,1360, 1.5x) ---
add('Q_6750_1720', "HOKE N.C.", 'CS', 'brigade', 250, 790, None, None, 230, 700, 175, "bars 9' 6' 7' 21' 8' 57' as printed; east end of EARLY's row; no clock printed")
# --- Q_5350_3400 (plain, origin 4900,3040, 1.5x) ---
add('Q_5350_3400', "HAYS LA. 3.45 P.M.", 'CS', 'brigade', 840, 235, '3.45 P.M.', None, 880, 330, 336, "printed HAYS LA. and '3.45 P.M.' along a long red line with numerals 9' 7' 6' 8' 5' as read; the line runs from Stevens Run toward the Harrisburg Rd")
add('Q_5350_3400', "HOKE N.C.", 'CS', 'brigade', 1255, 440, None, None, 1200, 470, 180, "second HOKE label, bar numeral 57'; this label carries no clock (the 3.45 P.M. belongs to the HAYS label west of it)")
add('Q_5350_3400', "COSTAR 3.45 1'", 'US', 'brigade', 545, 430, '3.45', None, 660, 500, 170, "printed COSTAR (Coster) with '3.45' (no P.M. printed) and badge 1'; bars 27'Pa. 154'N.Y. 34'N.Y.")
add('Q_5350_3400', "K.1'Ohio HECKMAN", 'US', 'battery', 280, 380, None, None, 310, 330, 100, "Heckman's battery K, 1st Ohio Light, comb gun symbols NW of the label")
# --- Q_4650_5080 (plain, origin 4200,4720, 1.5x) ---
add('Q_4650_5080', "SMITH 2'", 'US', 'brigade', 1115, 470, None, None, 1080, 555, 107, "printed SMITH with badge 2' beside the long outlined bars west of the Baltimore Pike; regiment labels 136'N.Y. 33'Mass. 55'Ohio 73'Ohio (as read)")
add('Q_4650_5080', "GENL. HOWARD Com'd the field after GEN. REYNOLDS' Death", 'US', 'corps', 1180, 470, None, None, None, None, None, "printed annotation in blue along the bars of STEINWEHR'S division: GENL. HOWARD Com'd the field after GEN. REYNOLDS' Death; recorded for the XI Corps commander")
# --- Q_5350_5080 (plain, origin 4900,4720, 1.5x) ---
add('Q_5350_5080', "STEINWEHR'S DIV.", 'US', 'division', 290, 305, None, None, None, None, None, "blue label with the divisional badge on the slope of Cemetery Hill")
add('Q_5350_5080', "WIEDRICH", 'US', 'battery', 440, 145, None, None, 465, 180, 70, "Wiedrich's battery (I, 1st N.Y. Light) comb gun symbols beside the name, on the knoll at the Cemetery")
# --- Q_6050_3400 (plain, origin 5600,3040, 1.5x) ---
add('Q_6050_3400', "DEVIN 2 Brig. Cav. 1st Division", 'US', 'brigade', 520, 890, None, None, 490, 750, 100, "printed DEVIN / 2 Brig. Cav. / 1st Division under six blue bars at Rock Creek (York Pike); no clock printed on this label (the other Devin label reads Morning)")
# --- Q_1850_3960 (plain, origin 1400,3600, 1.5x) ---
add('Q_1850_3960', "LANE N.C. 3 P.M.", 'CS', 'brigade', 715, 820, '3 P.M.', None, 810, 750, 228, "printed LANE N.C. and '3 P.M.' (the printed form shows 3 with a prime mark before P.M.) along a red line with bars 33' 18' 28'; a second LANE position south-west of the Fairfield Rd")
# --- Q_2550_3960 (plain, origin 2100,3600, 1.5x) ---
add('Q_2550_3960', "PETTIGREW N.C.", 'CS', 'brigade', 345, 175, None, None, None, None, None, "third PETTIGREW label (west of the woods, x about 2330); label rotated; line anchor not isolated")
add('Q_2550_3960', "HART. JOHNSON. (Not Engaged)", 'CS', 'battery', 330, 560, None, None, 270, 600, 90, "printed HART., JOHNSON. and '(Not Engaged)' beside comb gun symbols; batteries of McIntosh's battalion; recorded as printed")
# --- P_2150_4150 (plain, origin 1800,3850, 2x) ---
add('P_2150_4150', "ARCHER", 'CS', 'brigade', 690, 740, None, None, 680, 760, 185, "printed ARCHER along the diagonal bars at Willoughby Run; regiment labels 1'Tenn. and 13 Ala. as read; no clock printed on this label (the other label reads ARCHER 9AM)")
# --- Q_3950_1160 (plain, origin 3500,800, 1.5x) ---
add('Q_3950_1160', "DANIELS N.C.", 'CS', 'brigade', 730, 505, None, None, 770, 380, 120, "third DANIELS label: four wide hatched bars north of Oak Hill (fill not matched to a single legend swatch, no line state claimed); no clock printed")
add('Q_3950_1160', "CARTER'S BATT.", 'CS', 'artillery_battalion', 930, 690, None, None, 850, 710, 180, "second CARTER'S BATT. label with comb gun symbols on the east slope of Oak Hill")
# --- Q_4650_1160 (plain, origin 4200,800, 1.5x) ---
add('Q_4650_1160', "RAMSEUR N.C.", 'CS', 'brigade', 235, 660, None, None, 255, 520, 90, "four wide hatched bars north of the Mummasburg Rd (fill not matched to a single legend swatch, no line state claimed); no clock printed; the first RAMSEUR label of the sheet")
