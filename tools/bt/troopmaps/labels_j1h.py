"""Hand-read labels from LOC 99447494 (Battle of Gettysburg, July 1, 1863. First day. General position of troops, 2 to 3.30 P.M.; Commons copy 4462 x 4943 px, about 1.93 m per px).
Read by eye in the plain windows of crops_j1 (win_j1.py loc94 plain ...; scan = origin + img/scale). add(win, text, side, kind, ix, iy, aix, aiy, aw, note): (ix,iy) label centre in window px, (aix,aiy) centre of the
line (thick bar) the label belongs to, aw its half-length in SCAN px. The sheet prints one bar per brigade or division, labelled with the commander surname or the division/corps name; artillery is drawn as unlabelled comb symbols."""
import json, os
_R = json.load(open(os.path.join(os.path.dirname(__file__), 'crops_j1.json')))
L = []
def add(win, text, side, kind, ix, iy, aix=None, aiy=None, aw=None, note=''):
    r = _R['loc94_' + win]; ox, oy = r['origin']; s = r['scale']
    lx, ly = round(ox + ix / s), round(oy + iy / s); ax = ay = None
    if aix is not None: ax, ay = round(ox + aix / s), round(oy + aiy / s)
    L.append(dict(text=text, side=side, kind=kind, lx=lx, ly=ly, ax=ax, ay=ay, aw=aw, note=note, crop='loc94_' + win))
# H_1500_1500 (origin 1050,1150, 1.5x)
add('H_1500_1500', "HILL'S CORPS", 'CS', 'corps', 470, 380, None, None, None, "red letters spread along the Confederate lines: 'L'S' (upper) and 'CORPS' (lower left); label centre on the word CORPS; no bar belongs to the corps label")
add('H_1500_1500', "PENDER'S DIVISION", 'CS', 'division', 730, 330, 800, 300, 265, "red letters PENDER'S (upper) and DIVISION (lower) along the western of the two thick red bars; the bar is the division line (no brigade names printed on this sheet for the Confederate divisions of Hill's corps)")
add('H_1500_1500', "HETH'S DIVISION", 'CS', 'division', 880, 300, 900, 250, 290, "red letters HETH'S (upper) and DIVISION (lower) along the eastern thick red bar")
add('H_1500_1500', "MEREDITH", 'US', 'brigade', 940, 560, 910, 560, 85, "blue bar west of the Seminary Ridge, label rotated along it")
add('H_1500_1500', "BIDDLE", 'US', 'brigade', 1075, 730, 1055, 740, 85, "blue bar; label rotated along it")
add('H_1500_1500', "STONE", 'US', 'brigade', 1180, 335, 1180, 310, 45, "L-shaped blue bar at the McPherson buildings; label printed along the horizontal arm")
# H_2300_900 (origin 1850,550, 1.5x) and H_2100_1000 (origin 1700,800, 1.6x)
add('H_2300_900', "RODES DIV.", 'CS', 'division', 640, 290, 800, 330, 235, "red letters RODES DIV. (upside down) along the horizontal arm and DIVISION down the western arm of the Confederate bar at the Mummasburg Rd; printed here as RODES DIV. and (second part) ISION")
add('H_2300_900', "BAXTER", 'US', 'brigade', 520, 540, 480, 590, 110, "blue bar north-west of the town, label rotated along it")
add('H_2300_900', "PAUL", 'US', 'brigade', 585, 680, 600, 700, 80, "blue bar beside the Mummasburg Rd")
add('H_2100_1000', "CUTLER", 'US', 'brigade', 655, 630, 600, 640, 95, "blue bar in the wood west of Baxter and Paul")
add('H_2300_1500', "FIRST CORPS", 'US', 'corps', 330, 300, None, None, None, "large blue letters FIRST (lower left) CORPS (upper right) running behind the First Corps lines; label centre taken between the words")
add('H_2300_900', "AMSBERG", 'US', 'brigade', 960, 710, 880, 640, 120, "blue bar north of the town (Carlisle Rd), label under it; printed AMSBERG")
add('H_2300_900', "KRZYZANOWSKI", 'US', 'brigade', 1190, 600, 1160, 570, 120, "printed KRZYZANOWSKI (as read, spelling as printed) along the bar east of the Carlisle Rd")
add('H_2300_900', "ELEVENTH CORPS", 'US', 'corps', 1200, 770, None, None, None, "large blue letters ELEVENTH (here) CORPS (east of it) across the Eleventh Corps lines")
add('H_3100_900', "AMES", 'US', 'brigade', 205, 430, 180, 380, 100, "blue bar at the Harrisburg Rd, label rotated along it")
add('H_3100_900', "VON GILSA", 'US', 'brigade', 420, 330, 400, 270, 100, "blue bar at the Harrisburg Rd and Rock Creek; printed VON and GILSA")
add('H_3100_900', "GORDON", 'CS', 'brigade', 360, 160, 400, 220, 130, "red bar crossing Rock Creek; label printed upside down")
add('H_3100_900', "EARLY'S DIVISION", 'CS', 'division', 835, 770, None, None, None, "red letters DIVISION (upper) and EARLY'S (lower) running down the east side of Rock Creek; label point on the word EARLY'S")
add('H_3100_1500', "HAYS", 'CS', 'brigade', 460, 130, 430, 150, 130, "red bar west of Rock Creek, label printed upside down along it")
add('H_3100_1500', "HOKE", 'CS', 'brigade', 690, 290, 680, 300, 105, "red bar at Stevens Run / Rock Creek, label upside down")
add('H_3100_1500', "COSTER", 'US', 'brigade', 330, 370, 330, 330, 115, "blue bar at the north edge of the town (Stevens Run); label rotated along it")
add('H_3100_1500', "DEVIN (Cavalry)", 'US', 'brigade', 740, 540, 700, 520, 125, "blue bar north of the York Pike at Rock Creek; printed DEVIN (Cavalry)")
add('H_2900_2150', "SMITH", 'US', 'brigade', 320, 470, 330, 390, 85, "blue bar at the base of Cemetery Hill; printed SMITH along the bar")
add('H_2900_2150', "STEINWEHR", 'US', 'division', 380, 650, None, None, None, "large blue letters STEINWEHR on Cemetery Hill; the artillery comb symbols beside SMITH are unlabelled")
add('H_1500_2100', "GAMBLE (Cavalry)", 'US', 'brigade', 785, 205, 750, 190, 90, "blue bar west of the Willoughby Run and north of the Chambersburg Pike; printed GAMBLE (Cavalry)")
add('H_2600_420', "EWELL'S CORPS", 'CS', 'corps', 450, 660, None, None, None, "red letters CORPS (here) and EWELL'S (east of it, upside down) north of the town; label centre taken on the word CORPS")
