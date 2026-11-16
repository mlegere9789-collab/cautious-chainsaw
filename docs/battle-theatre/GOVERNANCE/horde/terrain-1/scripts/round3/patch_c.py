"""Round-3 patches, part C: corrections of my own first edits (Newton, not Meade, at R030), Meade's dispatch, the 1863 newspaper accounts, wording tightened to the quotes."""
import os
S_DIR = '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/horde/terrain-1/scripts'
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

ENQ = "tmp/library/web/ca/pages/sn84024735/1863-07-24/ed-1/seq-1.txt"
HAWK = "tmp/library/web/ca/pages/sn84027060/1863-08-01/ed-1/seq-3.txt"
ENQ_CLS = "primary (1863 newspaper, The Richmond Enquirer, semi-weekly edition of 24 Jul 1863; Chronicling America OCR, single witness)"
HAWK_CLS = "primary (1863 newspaper, The Burlington Weekly Hawk-Eye of 1 Aug 1863, reprint headed 'Further Rebel Accounts of the Battle of Gettysburg'; Chronicling America OCR, single witness; the paper the account came from is not named in the OCR)"

# ======================================================================================================== spec_g13_g16.py
s = load('spec_g13_g16.py')
s = sub1(s, 'from spec_lib import C, S, R, B, L\n', 'from spec_lib import C, S, R, B, L, F\n\nENQ = "%s"\nHAWK = "%s"\nENQ_CLS = "%s"\nHAWK_CLS = "%s"\n' % (ENQ, HAWK, ENQ_CLS, HAWK_CLS))
# --- G-14.a : Newton (not Meade) 120; Meade's dispatch 150; the Richmond account 55 + 60
s = sub1(s, "Hancock 115-150; Meade about 120 (report, near 1 p.m.); McGilvery at least 140;",
 "Hancock 115-150; Meade 150 (dispatch of 3 Jul, 8.35 p.m.); Newton (First Corps) about 120 (near 1 p.m.); McGilvery at least 140;")
s = sub1(s, "a Philadelphia Brigade narrative (Pennsylvania at Gettysburg II p.633) 137;", "a participant narrative of the Second Corps line (Pennsylvania at Gettysburg II p.633) 137; a Confederate newspaper account of 1863 about 115 (Longstreet 55, Hill some 60);")
s = sub1(s, '''C('OR1', 'R030', "Near 1 p. m. the enemy opened with about one hundred and twenty guns upon the position of the army", note="Meade's report (p.262): a Confederate count, not a Union one"),''',
 '''C('OR1', 'R030', "Near 1 p. m. the enemy opened with about one hundred and twenty guns upon the position of the army", note="Newton's report (First Corps, p.262): a Confederate count, not a Union one"),
            C('OR1', 'R006', "The enemy opened at 1 p. m. from aboiit 150 guns, concentrated upon my left and center", note="Meade's dispatch to Halleck of 3 Jul, 8.35 p.m. (p.74); OCR 'aboiit', the two other scans read 'about 150'; printed in more than ten 1863 newspapers"),
            F(HAWK, "guns-fifty-.five in n umber upon the crest", 'BURLINGTON-HAWKEYE-1863-08-01', HAWK_CLS, note="OCR for 'fifty-five in number': Longstreet massed 55 long-range guns"),
            F(HAWK, "Lieut. Gen. Hill mass ed Home sixty guns along", 'BURLINGTON-HAWKEYE-1863-08-01', HAWK_CLS, note="OCR 'Home' for 'some': Hill massed some sixty guns; with Longstreet's 55 the account reaches about 115 ('our one hundred and fifteen' in its next sentence, OCR garbled)"),''')
s = sub1(s, "a participant narrative of the Second Corps line near General Gibbon's headquarters; the speaker is not named in the extract", "a participant narrative of the Second Corps line near General Gibbon's headquarters; the speaker is not named in the extract", count=1)
# --- G-13: Newton, not Meade
s = sub1(s, "all are Confederate counts (Meade's report p.262 'about one hundred and twenty guns' at 1 p.m.; New York 1900; Pennsylvania 1914; Philadelphia Brigade): no Union 120",
 "all are Confederate counts (Newton's report p.262 'about one hundred and twenty guns' at 1 p.m.; New York 1900; Pennsylvania 1914; the Philadelphia Brigade history; two 1863 papers): no Union 120")
s = sub1(s, "120 is documented only as a Confederate count (Meade, OR p.262, and three books)", "120 is documented only as a Confederate count (Newton, OR p.262, and four books and papers; Meade's own dispatch has 150)")
s = sub1(s, "    lookups=[L('%s', \"179 / one hundred and seventy-nine guns, pieces, cannon\", 0, \"no hit\")," % "round 3 corpus (OR vol. 27, the 99-text library, 154 NPS texts, 90 histories and regimental books; 2026-11-16)",
 "    lookups=[L('round 3 corpus, 1863 newspapers (933 Chronicling America pages; 2026-11-16)', \"gun counts for the 3 Jul cannonade (one hundred and ... guns, 1xx pieces)\", 54, \"Meade's dispatch of 3 Jul (about 150 guns) reprinted in more than ten papers; also 130 pieces, over 125 guns and 120 (two papers); '118' is the false rumour of captured guns\"),\n             L('round 3 corpus (OR vol. 27, the 99-text library, 154 NPS texts, 90 histories and regimental books; 2026-11-16)', \"179 / one hundred and seventy-nine guns, pieces, cannon\", 0, \"no hit\"),")
# --- G-16.f : an 1863 newspaper narrative has a Whitworth open the cannonade
NEW_F = '''        S('f', 'movement', "'One account says Whitworths on Oak Ridge fired the signal': four witnesses (above) have the signal as two guns of Miller's battery and no report puts a Whitworth on it. One 1863 Confederate newspaper narrative (The Richmond Enquirer of 24 Jul 1863, reprinted in the Burlington Weekly Hawk-Eye of 1 Aug 1863 under 'Further Rebel Accounts of the Battle of Gettysburg') has, at nearly noon, 'presently the shrill sound of a Whitworth awakes the silence, then batteries slowly open from this point and that', and the reprint has 'At twelve o'clock, the signal gun was fired and the cannonading commenced': a Whitworth opens the cannonade in that narrative, without a place and without being called the signal. The PDF's 'on Oak Ridge' is in neither.", 'documented', 'partial', [
            F(ENQ, "presently the shrill sound of a Whitworth awakes the silence, then batteries", 'RICHMOND-ENQUIRER-1863-07-24', ENQ_CLS, note="a correspondent's narrative of the day (Pickett's division); OCR has a stray mark after 'batteries'"),
            F(HAWK, "presently the shrill sound of a Whitworth awakes the silence, then batteries slowly open from this point and that", 'BURLINGTON-HAWKEYE-1863-08-01', HAWK_CLS, note="the same narrative reprinted"),
            F(HAWK, "At twelve o'clock, the signal gun", 'BURLINGTON-HAWKEYE-1863-08-01', HAWK_CLS, note="OCR after this: 'was fireO and the cannonading commenced'")],
          note="Round 3: the first close-out had this as unsupported ('in no source read'); the 1863 newspapers were not searched then. This is a literary narrative (a correspondent writing days later); the signal itself is two guns of Miller's battery in Eshleman, Furlong, the NPS handbook and Alexander. The Whitworth sentence is a possible origin of the PDF's 'one account'; it does not say Oak Ridge."),
'''
s = between(s, "        S('f', 'movement', \"'One account says Whitworths on Oak Ridge fired the signal'", "        S('g', 'state_at_start', \"Works: none described; on 2 Jul the battalion stood behind", NEW_F)
s = sub1(s, '''"A Whitworth signal (forum/HistoryNet claim; no primary witness)",''',
 '''"A Whitworth signal on Oak Ridge (one 1863 Richmond newspaper narrative has a Whitworth open the cannonade but names no place and does not call it the signal; four witnesses have two guns of Miller's battery as the signal)",''')
s = sub1(s, "remove the 'Whitworths fired the signal' alternative or mark it unsupported",
 "keep the 'Whitworths fired the signal' alternative only as a marked scenario: one 1863 Richmond newspaper narrative has a Whitworth open the cannonade (no place, not called the signal) against four witnesses for Miller's two guns")
s = sub1(s, "\"no hit: a Whitworth signal stays unsupported\"),", "\"no hit in the books and NPS texts; the 1863 newspapers are in the next line\"),\n             L('round 3 corpus, 1863 newspapers (933 Chronicling America pages)', \"Whitworth within 350 characters of 'signal'\", 2, \"the Richmond Enquirer of 24 Jul 1863 and its reprint in the Burlington Hawk-Eye of 1 Aug 1863 (one narrative): a Whitworth heard before the batteries opened, no place\"),")
s = sub1(s, 'the 3-inch pair is plausible (Hardaway\'s battery had two 3-inch rifles and a Whitworth in Feb 1863; McIntosh has a remaining section of Hurt\'s with Johnson\'s battery) but stood elsewhere"',
 'the 3-inch pair is plausible (Hardaway\'s battery had two 3-inch rifles and a Whitworth in Feb 1863; McIntosh has a remaining section of Hurt\'s with Johnson\'s battery) but stood elsewhere", "G-16.f: a Whitworth opening the cannonade is in an 1863 Richmond Enquirer narrative (24 Jul 1863; reprinted 1 Aug 1863): the PDF\'s one account has a documented candidate, without a place and without the word signal"')
save('spec_g13_g16.py', s)

# ======================================================================================================== wording tightened (spec_g01_g02.py, spec_g03_g04.py, spec_g09_g12.py)
s = load('spec_g01_g02.py')
s = sub1(s, "and 'our works' and fired double charges of canister over it (the battery's own address in Pennsylvania at Gettysburg, vol. II, p.909); the NPS Cultural Landscape Report (printed p.40) and Bates (1875, p.79) put the Union artillery behind the fence-rail breastworks.",
 "and 'our works' and fired double charges of canister at Perrin's troops (the battery's own address in Pennsylvania at Gettysburg, vol. II, p.909); the NPS Cultural Landscape Report (printed p.40) puts the Union artillery 'behind breastworks built of fence rails' and Bates (1875, p.79) has Wainwright post his batteries 'at a barricade of rails'.")
s = sub1(s, "and 'our works' and cleared its front of infantry to fire double charges of canister over it (the battery's own address, 1914 volume); the NPS Cultural Landscape Report and Bates (1875) put the artillery behind the fence-rail breastworks.",
 "and 'our works', cleared its front of infantry and fired double charges of canister at Perrin's troops (the battery's own address, 1914 volume); the NPS Cultural Landscape Report puts the artillery 'behind breastworks built of fence rails' and Bates (1875) has Wainwright post his batteries 'at a barricade of rails'.")
s = sub1(s, "the NPS CLR (printed p.40) and Bates (1875, p.79) all put the artillery behind the rails;", "the NPS CLR (printed p.40) and Bates (1875, p.79) all put the artillery at or behind the rails;")
save('spec_g01_g02.py', s)
s = load('spec_g03_g04.py')
s = sub1(s, "with part of Knap's Pennsylvania battery and a section of Battery K, 5th US helping later.", "with part of Knap's Pennsylvania battery and a section of Battery K, 5th US assisting for about half an hour of the duel.")
save('spec_g03_g04.py', s)
s = load('spec_g09_g12.py')
s = sub1(s, "the NPS: 'the red brick Codori farmhouse', the objective of Pickett's division)", "the NPS: 'the red brick Codori farmhouse', named as the objective point in Confederate accounts of Pickett's attack)")
save('spec_g09_g12.py', s)
print('patch C done')
