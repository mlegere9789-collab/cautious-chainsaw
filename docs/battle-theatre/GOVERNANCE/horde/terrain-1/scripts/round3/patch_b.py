"""Round-3 patches to the terrain-1 row specs, part B (G-05 to G-16 and R13.0000). Every replacement must match exactly once (or the stated count) or the run stops."""
import os, hashlib
S_DIR = '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/horde/terrain-1/scripts'
ROOT = '/home/user/cautious-chainsaw'
def load(n): return open(os.path.join(S_DIR, n), encoding='utf-8').read()
def save(n, s): open(os.path.join(S_DIR, n), 'w', encoding='utf-8').write(s)
def sub1(s, old, new, count=1):
    c = s.count(old)
    if c != count: raise SystemExit('PATCH MISS (%d matches, want %d): %r' % (c, count, old[:110]))
    return s.replace(old, new)
def between(s, start, end, new):
    if s.count(start) != 1: raise SystemExit('START MISS (%d): %r' % (s.count(start), start[:100]))
    a = s.index(start); e = s.index(end, a)
    return s[:a] + new + s[e:]
R3 = "round 3 corpus (OR vol. 27, the 99-text library, 154 NPS texts, 90 histories and regimental books; 2026-11-16)"

# ======================================================================================================== spec_g05_g08.py (round-3 searches only)
s = load('spec_g05_g08.py')
s = sub1(s, "    lookups=[L('OR Part 2', 'captured guns at Devil\\'s Den', 8,",
 "    lookups=[L('%s', \"Smith's battery or section shifted, changed position or moved to the right (18:00)\", 2, \"Birney (OR): 'Smith's battery of rifled guns was placed so as to command the gorge at the base of the Sugar Loaf Mountain'; no shift and no 18:00\"),\n             L('round 3 corpus', \"Smith or Fourth New York with 'arrived' / 'reached' near nine or morning\", 2, \"no new arrival statement (other regiments)\"),\n             L('OR Part 2', 'captured guns at Devil\\'s Den', 8," % R3)
s = sub1(s, "    lookups=[L('NPS texts', 'Hazlett', 26,",
 "    lookups=[L('%s', \"Hazlett within 500 characters of a clock between four and six\", 0, \"no first-fire clock in any local text\"),\n             L('round 3 corpus', \"Hazlett dragged / hauled / lifted / handspike / prolonge\", 9, \"Bachelder 1873 and 1889 (dragged), First Minnesota 1916 (dragged by hand, horses left in the rear), Maine 1898 (lifted by hand and handspike), Pennsylvania 1914 (155th Pa. dragged by hand), New York 1900 (teams plunging under the lashing of the drivers): all retrospective, the conflict stays\"),\n             L('round 3 corpus', \"Hazlett or Battery D with epaulement / earthwork / breastwork / gun pit / embrasure\", 1, \"no hit for Little Round Top (the one hit is a Confederate-side battery elsewhere)\"),\n             L('NPS texts', 'Hazlett', 26," % R3)
s = sub1(s, "    lookups=[L('OR Part 1', 'Wheatfield road', 0, \"no hit\"),",
 "    lookups=[L('%s', \"Wheatfield / Wheat-field / Wheat field road\", 214, \"the road's name only: Bachelder 1889 has McGilvery's batteries 'north of the Wheat-field road'; no text places Hart's battery on it; the park's monument lists have scrambled text layers and were not usable for the location of Hart's marker\"),\n             L('round 3 corpus', \"Knox with a gun / piece by hand, dragged, hauled, pulled\", 0, \"no relevant hit (Knoxville, Knox County)\"),\n             L('OR Part 1', 'Wheatfield road', 0, \"no hit\")," % R3)
s = sub1(s, "    lookups=[L('OR Part 2', 'Alexander, Huger, Moody, Parker, Taylor, Rhett', 10,",
 "    lookups=[L('%s', \"Parker, Rhett, Moody, Gilbert, Taylor, Jordan, Woolfolk, Eubank with a gun count\", 15, \"only the Chancellorsville order of battle (OR vol. 25, May 1863: Moody, Parker, Rhett, Woolfolk, Jordan and Eubank four guns each) and other campaigns: no Gettysburg count other than the OR's Taylor and Moody\"),\n             L('round 3 corpus', \"36 guns, pieces or cannon\", 12, \"Alexander 1907 (36 guns in action against the Peach Orchard about 3.45 p.m.); the other hits are other armies and dates\"),\n             L('OR Part 2', 'Alexander, Huger, Moody, Parker, Taylor, Rhett', 10," % R3)
save('spec_g05_g08.py', s)

# ======================================================================================================== spec_g09_g12.py
s = load('spec_g09_g12.py')
JP2 = os.path.join(ROOT, 'tmp/terrain-1/img/p1/cu31924077699761_0905.jp2')
PNG = os.path.join(ROOT, 'tmp/terrain-1/img/p1/retire_crop_new.png')
sha_jp2 = hashlib.sha256(open(JP2, 'rb').read()).hexdigest(); sha_png = hashlib.sha256(open(PNG, 'rb').read()).hexdigest()
s = sub1(s, 'from spec_lib import C, S, R, B, L\n', '''from spec_lib import C, S, R, B, L

# page-image reading of the McGilvery digit (round 3): the Cornell OCR text reads 350, the printed page reads 250
IMG_RETIRE = dict(
    reading="retire 250 yards", ocr_text_reading="retire 350 yards", printed_page="882", leaf=905,
    method="JPEG 2000 page image of the Cornell scan (archive.org item cu31924077699761, leaf 0905, taken from cu31924077699761_jp2.zip streamed through https://archive.org/cors/ on 2026-11-14) converted to PNG and read by eye on 2026-11-16 (the printed page is headed 882, 'N. C., VA., W. VA., MD., PA., ETC.' and 'CHAP. XXXIX'); the line reads 'retire 250 yards and renew their fire'",
    image_file="tmp/terrain-1/img/p1/cu31924077699761_0905.jp2", image_sha256="%s",
    crop_file="tmp/terrain-1/img/p1/retire_crop_new.png", crop_sha256="%s",
    other_scans="warofrebellion271unit and warofrebellion012701rootrich (archive.org) both read 'retire 250 yards and renew'")
''' % (sha_jp2, sha_png))

# --- G-09.h : two candidate houses
NEW_H = '''        S('h', 'place', "Identity of 'the small brick house': Cabell's report says only that his 3 Jul guns stood 'several hundred yards in front of the infantry, near a small brick house' fronting the road from Gettysburg to Emmitsburg, with Carlton's battery and a section of McCarthy's 'considerably to the left of the brick house'; no battery officer names it and the PDF row leaves it unplaced. Local sources call two Emmitsburg Road houses brick: the Codori farmhouse (Bachelder: 'a small brick house, known as Cordora's house'; New York at Gettysburg: 'the brick farm house known as the Codori House'; the NPS: 'the red brick Codori farmhouse', the objective of Pickett's division) and the Sherfy house (New York at Gettysburg: 'the brick house (Sherfy's)'). No source read links either house to Cabell, so the identity stays open between these candidates.", 'open_gap', 'partial', [
            C('OR2', 'R435', "These guns were placed several hundred yards in front of the infantry, near a small brick house, and fronted the road leading from Gettysburg to Emmitsburg"),
            C('LIB', 'BACH-REPULSE-1870', "is a small brick house, known as Cordora's house", note="Bachelder's key to his painting of the repulse (1870): the house midway between the town and the intersection with Seminary Ridge"),
            C('LIB', 'NY-GB-1900-v2', "the brick farm house known as the Codori House"),
            C('LIB', 'NY-GB-1900-v2', "to the right of the brick house (Sherfy's)", note="the editor's gloss on Hancock's 'brick house' in the Peach Orchard fight"),
            C('NPS', 'NPS-COMMON-PRIDE-1', "the red brick Codori farmhouse")],
          note="Round 3 narrows the gap to two named candidates, both documented as brick (secondary sources); none of them is identified with Cabell's house. The Union reports' 'brick house' on the Emmitsburg road (Hancock, Gibbon, Harrow, Ward) is a separate use of the phrase. The NPS 'small brick house' hits (Dustman/Riggs house, Chambersburg Road, First Day field) do not describe the Emmitsburg Road."),
'''
s = between(s, "        S('h', 'place', \"Identity of 'the small brick house': not named by Cabell", "    ],\n    stays_unsupported=[\"Identity and 1863 location of 'the small brick house' (gap for the basemap)\",", NEW_H)
s = sub1(s, '''"Identity and 1863 location of 'the small brick house' (gap for the basemap)",''', '''"Identity and 1863 location of 'the small brick house' (gap for the basemap; two brick-house candidates on the Emmitsburg Road ridge: the Codori and the Sherfy house)",''')
s = sub1(s, "Which house is the 'small brick house' is not stated by any source read (the NPS 'small brick house' hits are the Dustman/Riggs house on the First Day field).",
 "Which house is the 'small brick house' is not stated by any source read; two Emmitsburg Road houses are called brick in the local sources (Codori's, Sherfy's), neither tied to Cabell (the NPS 'small brick house' hits are the Dustman/Riggs house on the First Day field).")
s = sub1(s, "(house unplaced: marker on the map)", "(house unplaced: marker on the map; Codori's and Sherfy's are the two documented brick candidates)")
s = sub1(s, "    lookups=[L('OR Part 2', 'Cabell battery reports R436-R440', 5,",
 "    lookups=[L('%s', \"'small brick house' / 'brick house' near Cabell, Kershaw, Barksdale, Alexander, Pendleton or Longstreet\", 38, \"OR vol. 27: Cabell's phrase (R435 p.375) and the Union reports' 'brick house' on the Emmitsburg road (Hancock, Gibbon, Harrow, Ward, Huston); Bachelder 1870 and New York 1900 name Codori's and Sherfy's as brick; none ties a house to Cabell\"),\n             L('OR Part 2', 'Cabell battery reports R436-R440', 5," % R3)

# --- G-10 : McGilvery's order is 250 yards (page image and two scans); '65 of 88' read in two scans
n = s.count('C(\'OR1\', \'R318\', "whereupon I ordered them to retire 350 yards and renew their fire")')
if n != 2: raise SystemExit('retire quote count %d' % n)
s = s.replace('C(\'OR1\', \'R318\', "whereupon I ordered them to retire 350 yards and renew their fire")',
 'C(\'OR1\', \'R318\', "whereupon I ordered them to retire 350 yards and renew their fire", image=IMG_RETIRE, note="OCR text reads 350 (Cornell scan); the printed page and two other archive.org scans read 250: see image_reading")')
s = sub1(s, "Milton gives 300 yd, McGilvery ordered 350 yd for the batteries and formed his new line about 400 yd to the rear; the PDF's 400 yd is McGilvery's new-line figure.",
 "Milton gives 300 yd, McGilvery ordered 250 yd for the batteries (printed page and two scans; the Cornell OCR reads 350) and formed his new line about 400 yd to the rear; the PDF's 400 yd is McGilvery's new-line figure.")
s = sub1(s, "McGilvery's order to all batteries was 350 yd, his new line 400 yd to the rear",
 "McGilvery's order to all batteries was 250 yd (the Cornell OCR text reads 350; the printed page, read from its image, and two other scans read 250), his new line 400 yd to the rear")
s = sub1(s, "which two more scans confirm; Hunt in Battles and Leaders (p.310, one scan)", "which two more scans confirm; Hunt in Battles and Leaders (p.310, read identically in two scans)")
s = sub1(s, "Hunt in Battles and Leaders (p.310, text layer of one scan): the battery went into action", "Hunt in Battles and Leaders (p.310, read identically in two scans): the battery went into action")
s = sub1(s, '''note="Text layer of one scan; a second scan could not be fetched (archive.org data nodes answered 403 on 2026-11-13), so the digits '65' stay unchecked"''',
 '''note="Read identically ('65 out of 88 horses were killed or wounded') in a second scan (archive.org item battlesleadersci03underich, fetched 2026-11-14 through https://archive.org/cors/); the running heads of both scans (3IO and 3io) give p.310"''')
s = sub1(s, '"Retirement distance 300 (Milton) / 350 (McGilvery) / 400 (PDF)"', '"Retirement distance 300 (Milton) / 250 (McGilvery\'s order to the batteries; the Cornell OCR reads 350) / 400 (PDF; McGilvery\'s new line)"')
s = sub1(s, "retirement 300 yd by prolonge (Milton) default per DD-F2-04, 350 and 400 selectable;", "retirement 300 yd by prolonge (Milton) default per DD-F2-04, 250 (McGilvery's order to the batteries; the 350 of the 2026-11-13 close-out was an OCR error) and 400 (the PDF; McGilvery's new line) selectable;")
s = sub1(s, "    lookups=[L('OR Part 1', 'Bigelow, Milton, McGilvery', 12,",
 "    lookups=[L('round 3 digit audit (all 307 Official Records quotes against the four other archive.org scans; page image of leaf 905)', \"McGilvery 'retire N yards'\", 1, \"Cornell OCR 350; warofrebellion271unit 250; warofrebellion012701rootrich 250; the printed page 882 reads 250 (image read 2026-11-16): the 350 is an OCR error\"),\n             L('%s', \"Ziegler's Grove with Milton, Turnbull, Bigelow, Battery K, Whitworth\", 2, \"no hit pairing Milton or Turnbull with Ziegler's Grove (NPS HABS and a monument list mention the grove only)\"),\n             L('round 3 corpus', \"Bigelow / Ninth Massachusetts / 21st Mississippi with an hour between five and seven\", 0, \"no overrun hour in any local text\"),\n             L('OR Part 1', 'Bigelow, Milton, McGilvery', 12," % R3)
s = sub1(s, '    changes=["G-10 conflict -> corrected: the Trostle second position is documented',
 '    changes=["Round 3 (2026-11-16): McGilvery\'s order to the batteries is 250 yd, not 350 (OCR error of the Cornell text, found by the digit audit and confirmed on the printed page and in two other scans); \'65 out of 88 horses\' (Hunt, B&L III p.310) now read identically in two scans", "G-10 conflict -> corrected: the Trostle second position is documented')

# --- G-11 and G-12 lookups; G-12.i
s = sub1(s, "    lookups=[L('OR Parts 1-2 and library', 'twenty-three guns', 5,",
 "    lookups=[L('%s', \"six to twenty-three / 6 to 23 guns\", 0, \"no hit\"),\n             L('round 3 corpus', \"McGilvery with earthwork / breastwork / epaulement / rifle-pit; slight or small earthworks near guns or Plum Run\", 8, \"McGilvery (R318) and Maine 1898 already cited; the NPS CLI Landscape and CLR Record of Treatment list McGilvery's Battalion Lunettes (1863 origin, rebuilt 1891); no dimension\"),\n             L('OR Parts 1-2 and library', 'twenty-three guns', 5," % R3)
NEW_I = '''        S('i', 'other', "'Double canister at about 100 yd': for Battery A, 4th US the battery's sergeant (later Lt Col) Frederick Fuger has single charges of canister from about 400 yd, 'double and treble charges of canister' from 200 yd, and Cushing shot through the mouth and killed when the enemy had come within about 100 yd ('Cushing's Battery at Gettysburg', Journal of the Military Service Institution XLI (1907), p.408, as quoted in the NPS study 'A Common Pride and Fame'); the PDF's 'double canister at about 100 yd' joins the double charges (200 yd) and Cushing's death (100 yd); Hall (OR) says only 'his last canister'. Fuger's own article was not read, only the NPS quotation.", 'documented', 'partial', [
            C('NPS', 'NPS-COMMON-PRIDE-1', "When the enemy was within about 400 yards Battery A opened with single charges of canister.", page='170', note="the NPS study (Georg), printed p.170 (PDF p.186), quoting Fuger 1907"),
            C('NPS', 'NPS-COMMON-PRIDE-1', "When the enemy got within 200 yards double and treble charges of canister were used; those charges opened immense gaps in the Confederate lines.", page='170'),
            C('NPS', 'NPS-COMMON-PRIDE-1', "When the enemy came within about 100 yards from the battery Lieutenant Cushing was shot.through the mouth and instantly killed.", page='170', note="OCR 'shot.through'")],
          note="Round 3: the first close-out had this as unsupported ('in no source for Cushing's guns'). The NPS study quotes the battery's own sergeant for the canister states; the original article (JMSI XLI p.408) is not local, so the figures are second-hand through the NPS."),
'''
s = between(s, "        S('i', 'other', \"'Double canister at about 100 yd': in no source for Cushing's guns", "    ],\n    stays_unsupported=[\"'Four of six knocked out' (Webb: all but one silenced by 14:45)\",", NEW_I)
s = sub1(s, '''"Double canister at about 100 yd for Cushing",''', '''"'Double canister at about 100 yd' as one statement (the sources have double and treble charges from 200 yd and Cushing's death at about 100 yd, from Fuger via the NPS; Fuger's article itself is not local)",''')
s = sub1(s, "'Double canister' and 'about 100 yd' are in no source for Cushing's guns (the NPS gives Cowan's battery double canister at under 20 yd and Smith's account of the guns seen at about 200 feet).",
 "'Double canister at about 100 yd' joins two statements of the battery's sergeant Fuger (1907, as quoted by the NPS): double and treble charges of canister from 200 yd, and Cushing shot dead when the enemy was within about 100 yd (the NPS also gives Cowan's battery double canister at under 20 yd and Smith's account of the guns seen at about 200 feet).")
s = sub1(s, "Read the Warfare History Network page only for 'double canister at about 100 yd'.", "The 'double canister at about 100 yd' wording is now traced to Fuger (1907) through the NPS study; read the Warfare History Network page only to see whether it cites Fuger.")
s = sub1(s, "kit US.ART.4th_US_A: six 3-inch confirmed; mark double canister and 100 yd as PDF-only", "kit US.ART.4th_US_A: six 3-inch confirmed; canister states: single charges from about 400 yd, double and treble from about 200 yd, Cushing killed when the enemy was within about 100 yd (Fuger 1907 via the NPS study); the PDF's 'double canister at about 100 yd' is a joined reading and stays marked")
s = sub1(s, "    lookups=[L('OR Part 1', 'Cushing', 22,",
 "    lookups=[L('%s', \"double canister / double-shotted canister (all hits; Cushing, Angle, Webb, Hazard, Arnold, Rorty, Brown)\", 51, \"NPS Common Pride I (Fuger quoted: double and treble charges from 200 yd; Cowan, Rorty: double canister); Philadelphia Brigade and Pennsylvania books (Cooper's, Wheeler's and Cowan's batteries)\"),\n             L('round 3 corpus', \"Cushing with earthwork / epaulement / gun pit / breastwork / embrasure\", 3, \"no report names one; two secondary narratives (the Comte de Paris as printed in History of Cumberland and Adams Counties 1886, and Two Reunions) have Armistead 'pass the earthworks' before Cushing's guns, a loose word for the wall or rails\"),\n             L('round 3 corpus', \"Cushing with 100 yards\", 2, \"Fuger via the NPS: Cushing shot when the enemy was within about 100 yd\"),\n             L('OR Part 1', 'Cushing', 22," % R3)
s = sub1(s, '    changes=["G-12 conflict_with_seed -> corrected: arrival morning of 2 Jul; one gun serviceable at 14:45; earthwork unsupported; double canister unsupported',
 '    changes=["Round 3 (2026-11-16): the canister states are documented through Fuger (1907) as quoted by the NPS study: single from about 400 yd, double and treble from 200 yd, Cushing killed at about 100 yd; the PDF\'s \'double canister at about 100 yd\' joins two of them", "G-12 conflict_with_seed -> corrected: arrival morning of 2 Jul; one gun serviceable at 14:45; earthwork unsupported; double canister unsupported (superseded by round 3)')
save('spec_g09_g12.py', s)

# ======================================================================================================== spec_g13_g16.py
s = load('spec_g13_g16.py')
# --- G-13
s = sub1(s, "    lookups=[L('OR Parts 1-2', 'thirty-four', 6, \"no Union cannon-disabled count\"),",
 "    lookups=[L('%s', \"34 / thirty-four guns, pieces, cannon, batteries\", 19, \"none is a count of Union guns disabled on 3 Jul: 34 guns are the Peach Orchard artillery of 2 Jul (New York 1900; Pierce 1914), six batteries of 34 guns sent left (OR) and the I Corps batteries with Calef on 1 Jul (88th Pa.)\"),\n             L('round 3 corpus', \"120 / one hundred and twenty guns, pieces, cannon\", 10, \"all are Confederate counts (Meade's report p.262 'about one hundred and twenty guns' at 1 p.m.; New York 1900; Pennsylvania 1914; Philadelphia Brigade): no Union 120\"),\n             L('round 3 corpus', \"countermand near Hancock or Hunt\", 3, \"no hit about the artillery order\"),\n             L('OR Parts 1-2', 'thirty-four', 6, \"no Union cannon-disabled count\")," % R3)
s = sub1(s, '''"'As many as 120' Union guns (ABT)",''', '''"'As many as 120' Union guns (ABT): 120 is documented only as a Confederate count (Meade, OR p.262, and three books)",''')
# --- G-14
s = sub1(s, '''"Total: Pendleton nearly 150; Hancock 115-150; McGilvery at least 140; Hunt 100-120 (115 by a newspaper figure) and about 150; B&L 150; Alexander (1907) 172 used''',
 '''"Total: Pendleton nearly 150; Hancock 115-150; Meade about 120 (report, near 1 p.m.); McGilvery at least 140; Hunt 100-120 (115 by a newspaper figure) and about 150; B&L 150; New York at Gettysburg (1900) 138 for the whole Confederate line; a Philadelphia Brigade narrative (Pennsylvania at Gettysburg II p.633) 137; Alexander (1907) 172 used''')
s = sub1(s, '''the 172 is Alexander's Confederate count")],''',
 '''the 172 is Alexander's Confederate count"),
            C('OR1', 'R030', "Near 1 p. m. the enemy opened with about one hundred and twenty guns upon the position of the army", note="Meade's report (p.262): a Confederate count, not a Union one"),
            C('LIB', 'NY-GB-1900', "This long line of batteries contained 138 guns of field artillery, of various patterns and calibres", note="New York at Gettysburg (1900): 63 guns of Hill's Corps on Alexander's left, two Whitworths at Oak Hill, 138 in all"),
            C('LIB', 'PA-GB-1914-v2', "The whole hundred and thirty-seven guns which now began to play upon us", page='633', note="a participant narrative of the Second Corps line near General Gibbon's headquarters; the speaker is not named in the extract")],''')
s = sub1(s, "The PDF's range ends at 179 (Alexander): the memoir read gives 172 used;", "The PDF's low end 138 is the New York at Gettysburg (1900) figure for the whole line; the PDF's range ends at 179 (Alexander): the memoir read gives 172 used;")
s = sub1(s, '''C('OR2', 'R466', "of eight Napoleon guns and two 13-pounder howitzers"),''',
 '''C('OR2', 'R466', "of eight Napoleon guns and two 13-pounder howitzers", note="digit audit 2026-11-16: the Cornell OCR and warofrebellion272unit read '13-pounder', warofrebellionco272unit reads '12-pounder'; no 13-pounder howitzer was in service, so the printed digit is probably 12, but it was not read from a page image; the claim uses only the counts (eight Napoleons, two howitzers)"),''')
s = sub1(s, "    lookups=[L('library', '179 guns', 4,",
 "    lookups=[L('%s', \"179 / one hundred and seventy-nine guns, pieces, cannon\", 0, \"no hit\"),\n             L('round 3 corpus', \"two miles near guns, batteries or artillery with line, Peach Orchard or Emmitsburg\", 67, \"all about the Union front ('our whole front for two miles', Hunt in B&L; Alexander: the Federal line about two miles) or marches; none gives the length of the Confederate line\"),\n             L('round 3 corpus', \"Poague or Reilly with lunette / earthwork / breastwork\", 18, \"NPS CLI Pickett's Charge, CLI Landscape, CLR Record of Treatment, Treatment Philosophy: existence, 1863 origin and 1895/1903 rebuilding only; no builder or dimension\"),\n             L('library', '179 guns', 4," % R3)
# --- G-15
s = sub1(s, "    lookups=[L('NPS texts', \"Carter's battalion Oak Hill\", 8,",
 "    lookups=[L('%s', \"Carter's battalion or rifles near Oak Hill, the railroad cut or Cemetery Hill; Page, Reese, Fry, Graham with rifles\", 4, \"nothing new: the NPS CLI and CLR First Day state ten rifled guns of Carter's battalion on either side of the cut; no source names the batteries that supplied them\"),\n             L('NPS texts', \"Carter's battalion Oak Hill\", 8," % R3)
# --- G-16
s = sub1(s, '''same ridge", page='419')]),
        S('c', 'guns', "Guns: two Whitworths on 3 Jul''', '''same ridge", page='419'),
            C('LIB', 'NY-GB-1900', "On Walker’s extreme left, at Oak Hill, were two Whitworth guns with a range exceeding any other piece of artillery on the field", note="New York at Gettysburg (1900): a second secondary witness for the two Whitworths at Oak Hill")]),
        S('c', 'guns', "Guns: two Whitworths on 3 Jul''')
NEW_G16H = '''        S('h', 'guns', "Two 3-inch rifles with the Whitworths (the PDF's 'plus two 3-inch rifles per the Oak Hill marker'): McIntosh puts a section of Whitworths first in position beside the turnpike and 'the remaining section of Captain Hurt's' with Johnson's battery on a commanding hill near the Fairfield road, without naming the guns of that section; the battery, then Hardaway's, stands in the inspection report of the artillery of the Second Army Corps of February 1863 with 'two 3-inch rifles and one Whitworth'. A pair of 3-inch rifles in Hurt's battery is therefore plausible, but it stood with Johnson's battery, not at the Oak Hill Whitworth position, and the marker's own wording is unread.", 'inferred', 'partial', [
            C('OR2', 'R563', "Captain [M.] Johnson's battery and the remaining section of Captain [W. B.] Hurt's were jilaced on a commanding hill some distance to the right, near tlie Fairfield road", note="OCR 'jilaced', 'tlie'"),
            C('LIB', 'OR-25-1', "Captain Hardaway’s battery (on duty near Captain Carter’s).—Two 3-inch rifles and one Whitworth, in good order", note="inspection report of the artillery of the Second Army Corps, February 1863 (War of the Rebellion, vol. 25; the library file OR-25-1): four months before the battle, with one Whitworth")],
          note="Inferred: the July composition of the 'remaining section' is not stated in the Official Records; the February 1863 list is another date."),
'''
s = sub1(s, "    ],\n    stays_unsupported=[\"Two 3-inch rifles with the Whitworths at the Oak Hill marker (no source read)\",", NEW_G16H + "    ],\n    stays_unsupported=[\"Two 3-inch rifles with the Whitworths at the Oak Hill marker (no source read)\",")
s = sub1(s, '"Two 3-inch rifles with the Whitworths at the Oak Hill marker (no source read)",',
 '"Two 3-inch rifles at the Oak Hill Whitworth position (the OR puts the remaining section of Hurt\'s with Johnson\'s battery elsewhere; the tablet text is unread)",')
s = sub1(s, "no 3-inch rifles unless the tablet text is read;", "no 3-inch rifles at the Oak Hill position unless the tablet text is read (a pair of 3-inch rifles of Hurt's battery stood with Johnson's battery near the Fairfield road, inferred);")
s = sub1(s, "    lookups=[L('OR Part 2 and Part 1', 'Whitworth', 12,",
 "    lookups=[L('%s', \"Whitworth within 350 characters of 'signal'\", 0, \"no hit: a Whitworth signal stays unsupported\"),\n             L('round 3 corpus', \"Hardaway or Hurt with tablet, marker, Whitworth, three-inch\", 12, \"NPS CLR First Day and CLI Pickett's Charge (tablet group, two original Whitworths, 1906); Hurt's Whitworths at the Potomac in July (OR); the inspection list of Feb 1863\"),\n             L('round 3 corpus', \"Whitworth with two 3-inch\", 2, \"the Feb 1863 inspection list (two 3-inch rifles and one Whitworth) and a park list of guns on the field (text layer scrambled); no July statement\"),\n             L('round 3 corpus', \"Oak Hill or Oak Ridge with Whitworth\", 6, \"New York 1900 (two Whitworths at Oak Hill, Walker's extreme left); NPS CLR First Day; the park's monument list\"),\n             L('OR Part 2 and Part 1', 'Whitworth', 12," % R3)
s = sub1(s, '    changes=["G-16 conflict -> partially_supported:', '    changes=["Round 3 (2026-11-16): New York 1900 is a second secondary witness for two Whitworths at Oak Hill; the 3-inch pair is plausible (Hardaway\'s battery had two 3-inch rifles and a Whitworth in Feb 1863; McIntosh has a remaining section of Hurt\'s with Johnson\'s battery) but stood elsewhere", "G-16 conflict -> partially_supported:')
# --- R13.0000
s = sub1(s, "end as confirmed with additions (4: G-03, G-08, G-09, G-15), corrected (6: G-01, G-02, G-06, G-10, G-11, G-12) or partially supported (6: G-04, G-05, G-07, G-13, G-14, G-16)",
 "end as confirmed with additions (4: G-03, G-08, G-09, G-15), corrected (5: G-01, G-06, G-10, G-11, G-12) or partially supported (7: G-02, G-04, G-05, G-07, G-13, G-14, G-16)")
s = sub1(s, "end as confirmed (4), corrected (6) or partially_supported (6), each with an open register link", "end as confirmed (4), corrected (5) or partially_supported (7), each with an open register link")
s = sub1(s, "G-12 'double canister at 100 yd', G-13 '120' and '34', G-14 '179', G-16 '3-inch rifles' and Whitworth signal), the unplaced brick house of G-09, and blocked pages.",
 "G-12 'four of six knocked out' and any earthwork, G-13 '120' Union guns and '34' disabled, G-14 '179', G-16 Whitworth signal and the Oak Hill '3-inch rifles'), the unidentified brick house of G-09 (two candidates), and blocked pages.")
s = sub1(s, '    changes=["R13.0000 not_satisfied -> gap (same meaning; vocabulary of the close-out)"],', '    changes=["R13.0000 not_satisfied -> gap (same meaning; vocabulary of the close-out)", "Round 3 (2026-11-16): verdict counts now confirmed 4, corrected 5, partially_supported 7 (G-02 moved from corrected to partially_supported)"],')
save('spec_g13_g16.py', s)
print('patch B done')
