"""Round-3 patch to horde/terrain-1/scripts/gen_register.py: hand-written register text for the rows that changed (G-02, G-04, G-09, G-10, G-12, G-13, G-14, G-16, EG-17) and the provenance text."""
import os, re
S_DIR = '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/horde/terrain-1/scripts'
p = os.path.join(S_DIR, 'gen_register.py')
s = open(p, encoding='utf-8').read()
def sub1(s, old, new):
    if s.count(old) != 1: raise SystemExit('PATCH MISS (%d): %r' % (s.count(old), old[:100]))
    return s.replace(old, new)
def set_field(s, key, field, value):
    start = s.index(" '%s': dict(" % key)
    nxt = s.find("\n '", start + 5)
    end = nxt if nxt >= 0 else s.index('\n}', start)
    seg = s[start:end]
    m = re.search(r'\n   %s=("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')(,|\))' % field, seg)
    if not m: raise SystemExit('FIELD MISS %s.%s' % (key, field))
    tail = m.group(2)
    new_line = '\n   %s=%s%s' % (field, repr(value), tail)
    seg = seg[:m.start()] + new_line + seg[m.end():]
    return s[:start] + seg + s[end:]

s = sub1(s, 'SRCTXT = ("Searched with tools/bt/or27_find', 'SRCTXT = ("Round 3 (2026-11-16) added a digit audit of every Official Records quote against the four other archive.org scans, a page-image reading of one digit (OR p.882), a second scan of Battles and Leaders III, and a search of the Official Records, the 99-text library, 154 NPS texts, 90 histories and regimental books and the 1863 newspaper OCR (Chronicling America). Earlier: searched with tools/bt/or27_find')
s = sub1(s, "('Category', 'evidence missing / source conflict (close-out 2026-11-13)')", "('Category', 'evidence missing / source conflict (close-out 2026-11-13, round 3 2026-11-16)')")
s = sub1(s, "desc = 'Close-out 2026-11-13 (verdict %s; earlier text of 2026-11-04 superseded). %s Still unsupported: %s.'", "desc = 'Close-out 2026-11-13, round 3 2026-11-16 (verdict %s; earlier text of 2026-11-04 superseded). %s Still unsupported: %s.'")
s = sub1(s, "'open (updated by the close-out 2026-11-13; row verdict %s)' % r['verdict']", "'open (updated by the close-out 2026-11-13 and round 3 2026-11-16; row verdict %s)' % r['verdict']")

# ---- G-02
s = set_field(s, 'G-02', 'open', "The PDF's 'behind the E-01 rail barricade' is supported as a relative position: a regimental commander (Robinson) found a battery directly in his rear on the ridge and the loose-rail breastwork some 40 yd down the slope in front of it; Cooper's own battery address (Pennsylvania at Gettysburg II p.909) calls it 'the rail barricade in front of us' and 'our works'; the NPS Cultural Landscape Report (printed p.40) and Bates (1875, p.79) agree. The rails were the infantry's work, Breck's sections stood behind a pre-existing stone wall on the crest, and no gun pit or earth is named. Gun count 22 (Hunt) vs 12 (Wainwright) vs the PDF's 20-22; withdrawal clock about 16:00 (Hunt) / 'after 4 p.m.' (Cooper's address) vs about 17:00 (Cooper's report, Wiedrich) vs the PDF's 16:30; Cooper's battery left on the north side of the seminary (its address) vs down the Cashtown pike (Wainwright, Hunt); the street name 'Chambersburg Street' is in no OR text. The first close-out (2026-11-13) called the position contradicted; that is withdrawn.")
s = set_field(s, 'G-02', 'substitute', "Four batteries (Cooper 4, Stevens 6, Reynolds 6, Stewart 6 = 22) on the seminary crest with the E-01 loose-rail work about 40 yd down the slope in front of them and Breck's sections at the pre-existing stone wall; window 16:00-17:00 for the withdrawal along the Cashtown pike and through the town.")
s = set_field(s, 'G-02', 'ask', "None beyond the delegated defaults; the PDF's 'behind the E-01 rail barricade' is kept as a relative position (the rails are the infantry's work).")
# ---- G-04
s = sub1(s, "'G-04': dict(title=\"Latimer's battalion on Benner's Hill (G-04): per-battery counts, the 37 Union guns, 'Rockbridge loaned'\",", "'G-04': dict(title=\"Latimer's battalion on Benner's Hill (G-04): the 37 Union guns and 'Rockbridge loaned'\",")
s = set_field(s, 'G-04', 'open', "Documented: 14 guns of the battalion on the hill plus two 20-pounder Parrotts in rear (16; Andrews), twenty with Graham's four 20-pounder Parrotts (Ewell: 'Andrews' battalion and Graham's battery, the whole under Major Latimer'; Cooper's battery address, Pennsylvania at Gettysburg II pp.910-911, which also gives the guns of each battery: Brown 4, Carpenter 4, Dement 4, Raine 2 on the hill and 2 beyond the Hanover road, Graham 4; New York 1900), four guns left at the end (Johnson, Andrews); the Union batteries that answered are counted at 19 guns (the same address; Hunt's OR figures agree). Not found: the PDF's 37 Union guns and the wording 'loaned from Dance'; the per-battery figures rest on one retrospective address (the OR give none). The place name is in Bachelder, the Maine and New York books, not in the OR.")
s = set_field(s, 'G-04', 'why', "The Official Records give no per-battery gun counts and no source read gives 37 Union guns (Law cl.3).")
s = set_field(s, 'G-04', 'substitute', "Five batteries (Brown, Carpenter, Dement, Raine, Graham), 20 guns with the per-battery composition of Cooper's address marked retrospective and 16 (Andrews' battalion) selectable, no works, withdrawal to four guns.")
s = set_field(s, 'G-04', 'recon', "As substituted; the 37-gun figure kept as a marked PDF-only value beside the documented 19.")
# ---- G-09
s = set_field(s, 'G-09', 'open', "Confirmed with additions: 16 guns in four batteries; stone/rock fences in front of two batteries on 2 Jul; the six-gun group near 'a small brick house' on 3 Jul. Open: which house is meant (no source read names it); two Emmitsburg Road houses are documented as brick (Codori's: Bachelder 'a small brick house, known as Cordora's house', New York 1900, NPS; Sherfy's: New York 1900) and neither is tied to Cabell.")
s = set_field(s, 'G-09', 'substitute', "A house marker on the Emmitsburg road with the two documented brick candidates (Codori, Sherfy) offered, marked as open.")
# ---- G-10
s = set_field(s, 'G-10', 'open', "Documented: second position at a corner of two stone walls (Milton), the Trostle farm wall (NPS), 'close by' or 'near the Trostle house' (Hunt in B&L, Meade, Toombs); hand-to-hand fighting and the 21st Mississippi (Hunt in B&L p.310, one retrospective source; the NPS names the regiment); retirement 300 yd (Milton) or 250 yd (McGilvery's order to the batteries; the Cornell OCR text reads 350, an OCR error shown by the printed page and two other scans) not 400 (McGilvery's new line). Horse losses: 60 (Milton 45 + 15), 65 (Hunt in B&L, read identically in two scans; Fox's reading of Milton), 80 of 88 (Hunt in the Century via Fox), 80 (Meade). Not found: the 18:30 overrun hour (between about 17:45 and 21:00) and 'Wheatfield Road' / 'Ziegler's Grove' as OR place names.")
s = set_field(s, 'G-10', 'substitute', "Capture window 17:45-21:00 with the PDF's 18:30 selectable; retirement 300 yd (Milton) with 250 (McGilvery's order) and 400 selectable; horse losses as a selector (60 default per the OR, 65, 80 of 88, 80).")
# ---- G-12
s = sub1(s, "'G-12': dict(title=\"Cushing's battery (G-12): earthwork, guns run to the wall, double canister\",", "'G-12': dict(title=\"Cushing's battery (G-12): earthwork, guns run to the wall, the canister states\",")
s = set_field(s, 'G-12', 'open', "Documented: six 3-inch guns in the Second Corps line in place on the morning of 2 Jul; all guns but one silenced by 14:45 (Webb); three guns run to the fence (Webb), one (Hall) or two (NPS); no earthwork or gun pit named anywhere. Canister: the battery's sergeant Fuger (1907, as quoted in the NPS study) has single canister from about 400 yd, double and treble charges from 200 yd and Cushing killed when the enemy was within about 100 yd; the PDF's 'double canister at about 100 yd' joins the last two. Not found: 'four of six', 'between the 71st and 72nd'.")
# ---- G-13
s = set_field(s, 'G-13', 'open', "Counts: 75 (Hunt OR), 77 (Hunt B&L), 108 Reserve guns on the field (Tyler), 166-220 (Alexander 1907). Not found: 'up to 120 (ABT)' as a Union count (120 is a documented Confederate count: Newton's report and four books and papers; Meade's own dispatch has 150) and '34 disabled' (the '34' occurs for other things: the Peach Orchard artillery of 2 Jul, six batteries of 34 guns sent left). The order dispute is documented from Hart's report and Hunt's B&L article, not from Hancock's report.")
# ---- G-14
s = set_field(s, 'G-14', 'open', "Counts: nearly 150 (Pendleton), 115-150 (Hancock), 150 (Meade's dispatch), about 120 (Newton), at least 140 (McGilvery), 138 (New York 1900), 137 (a participant narrative, Pennsylvania at Gettysburg II p.633), about 115 (an 1863 Richmond account: Longstreet 55, Hill some 60), 172 (Alexander 1907, with a breakdown). Not found: Alexander's 179; 'more than 2 miles from the Peach Orchard along the Emmitsburg Road' for the guns (Alexander has about 1,300 yd for the First Corps line; the NPS has over two miles for the whole Confederate line). The NPS lists Poague's Battalion lunettes and Reilly's Section stone lunettes as battle-origin works: their dates inside the battle are not given.")
# ---- G-16
s = set_field(s, 'G-16', 'open', "Documented: two Whitworths moved on the morning of 3 Jul to a commanding point north of the railroad cut (McIntosh), the highest position on Oak Hill (NPS), nearly a mile north of the Third Corps line (Alexander), two Whitworths at Oak Hill (New York 1900), two miles from Milton's guns. Not found: 'two 3-inch rifles' at the marker (a pair of 3-inch rifles of Hurt's battery stood with Johnson's battery near the Fairfield road, inferred; Hardaway's battery had two 3-inch rifles and a Whitworth in Feb 1863) and a Whitworth signal on Oak Ridge (one 1863 Richmond narrative has a Whitworth open the cannonade, no place; four witnesses give Miller's two guns).")
s = set_field(s, 'G-16', 'substitute', "Two Whitworths on Oak Hill; signal by two guns of Miller's battery 13:00-14:00; the Whitworth alternative kept as a marked scenario (one 1863 newspaper narrative, no place).")
# ---- EG-17
s = sub1(s, 'desc = ("Close-out 2026-11-13. R13.0000 cannot pass: G-01..G-16 are confirmed (4: G-03, G-08, G-09, G-15), corrected (6: G-01, G-02, G-06, G-10, G-11, G-12) or partially supported (6: G-04, G-05, G-07, G-13, G-14, G-16)',
 'desc = ("Close-out 2026-11-13, round 3 2026-11-16. R13.0000 cannot pass: G-01..G-16 are confirmed (4: G-03, G-08, G-09, G-15), corrected (5: G-01, G-06, G-10, G-11, G-12) or partially supported (7: G-02, G-04, G-05, G-07, G-13, G-14, G-16)')
s = sub1(s, "Andrews' battalion (14 + 2).\")", "Andrews' battalion (14 + 2, with per-battery guns in Cooper's battery address, retrospective).\")")
s = sub1(s, "'open (updated by the close-out 2026-11-13)')", "'open (updated by the close-out 2026-11-13 and round 3 2026-11-16)')")
open(p, 'w', encoding='utf-8').write(s)
print('patch D done')
