"""Ledger E claims: 154th New York (Coster's brigade) from New York at Gettysburg vol. 3, section NY3-S009 pp. 1046-1056 (commission
caption; address of Col. Daniel B. Allen, the regiment's commander at Gettysburg: documented; unsigned HISTORICAL SKETCH pp. 1053-1056:
inferred) and 157th New York from NY3-S010 pp. 1056-1060 (inscription; address of Col. James C. Carmichael, regimental officer:
documented; letter of Capt. J. H. Connolly, 44th Georgia). Full sections read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

S = 'NY3-S009'
U = 'us-11c-2d-coster-154ny'
AL = 'Col. Daniel B. Allen (commanded the 154th New York at Gettysburg; dedication address)'
HS = 'HISTORICAL SKETCH (unsigned; the commission\'s historian)'
R = 'Unsigned historical sketch (not a regimental officer): tier inferred.'
CAP = 'commission caption of the monument photograph'

# the brigade's detail and reserve (Allen)
add('us-11c-2d-coster', 'march', 'at daybreak of July 1st', 'along the left flank of the corps upon its march (observing party of 50 men from each regiment)', "At daybreak July 1, 50 men from each of Coster's four regiments were detailed as an observing party, a picket force marching along the left flank of the corps on its march to look out for the enemy; the brigade (about 1,000 men after Chancellorsville) went into action with probably not more than 800.",
    'NY3', S, "to march along the left flank of our corps upon its march", 'documented', author=AL, date='1863-07-01',
    note='The flank guard marched off the road on the left (west) of the column; the road itself is not named by Allen (the sketch, below, prints the Emmitsburg Pike for the division).')
add('us-11c-2d-coster-73pa', 'position', '(afternoon, July 1)', 'in reserve, back by the railroad, in the outskirts of the village', "Of Coster's brigade the 73rd Pennsylvania was held in reserve back by the railroad in the outskirts of the village (Allen).",
    'NY3', S, "the Seventy-third Pennsylvania was held in reserve", 'inferred', author=AL, date='1863-07-01', reasoning='Stated by the commander of a sister regiment.', note='Agrees with the 134th NY sketch (near the railway station).')
add('us-11c-2d-coster', 'movement', 'About 3 o’clock (July 1)', 'from Cemetery Hill down through the principal street and out the one running parallel to it, across the open field, past the brick house', "About 3 o'clock Coster's three regiments marched from Cemetery Hill down through the principal street, out the street running parallel to the one by the monument, across the open field and past the brick house; when the rear had crossed the street the line halted and came to a front: 134th New York on the right in a wheatfield, 154th in the centre, 27th Pennsylvania on the left toward the brick house.",
    'NY3', S, "About 3 o’clock we marched from Cemetery Hill down through the principal street", 'documented', author=AL, t_iso='1863-07-01T15:00', date='1863-07-01', approx=True,
    road='the principal street, then the street running parallel (streets not named by Allen; the sketch names the Harrisburg Road)',
    note="Monument location (caption): the field at the north end of Stratton Street. Allen's '3 o'clock' versus Steinwehr's 'about 2 o'clock' arrival of the division (POS-A-11B-002): the brigade moved out about an hour after reaching the hill.", conflicts=['POS-A-11B-029'])
add(U, 'position', '(about 3 o’clock, July 1)', 'the centre of the brigade line, where the monument stands (field at the north end of Stratton Street), on low ground', 'The 154th New York formed the centre of the brigade line where its monument stands, on low ground where nothing could be seen on its immediate left or in front of its left wing; a post-and-rail fence kept the left from the higher ground.',
    'NY3', S, "the One hundred and fifty- fourth in the centre, along where we stand", 'documented', author=AL, date='1863-07-01',
    extra_quote="In field at the north end oJ Stratton street", note='OCR "oJ" = of; hyphen "fifty- fourth" is the printed line break (joined in matching).')
add('us-11c-2d-coster-134ny', 'position', '(about 3 o’clock, July 1)', 'the right of the brigade line, in what was then a wheatfield', 'The 134th New York held the right of the brigade line in what was then a wheatfield (Allen).',
    'NY3', S, "with the One hundred and thirty- fourth on the right in what was a wheatfield then", 'inferred', author=AL, date='1863-07-01', reasoning='Stated by the commander of a sister regiment.')
add('us-11c-2d-coster-27pa', 'position', '(about 3 o’clock, July 1)', 'the left of the brigade line, out towards the brick house', 'The 27th Pennsylvania held the left of the brigade line out towards the brick house, and was withdrawn by the brigade commander before the 154th received any order (Allen).',
    'NY3', S, "the Twenty-seventh Penn- sylvania on the left, out towards the brick house", 'inferred', author=AL, date='1863-07-01', reasoning='Stated by the commander of a sister regiment.',
    extra_quote="I found that they had been withdrawn without my knowledge")
add(U, 'engagement', '(after about 3 o’clock, July 1)', 'the brigade line north of the town; retreat impeded by village lots and board fences in rear', "Early's whole division came down on the line almost before it was formed; the enemy overlapped the 134th on the right and the 27th Pennsylvania had been withdrawn on the left, so the 154th, ordered to fall back toward the left, found itself almost surrounded among village lots and board fences and many men were compelled to surrender.",
    'NY3', S, "The enemy consisting of Early’s whole division came down upon us", 'documented', author=AL, date='1863-07-01')

# historical sketch: approach road and hour
add('us-11c-2d', 'arrival_road', '(July 1, afternoon)', 'Cemetery Hill, by the Emmitsburg Pike', 'The Second Division was the last of the Eleventh Corps to reach Cemetery Hill, by the Emmitsburg Pike (154th NY sketch).',
    'NY3', S, "the last one of the Eleventh Corps to reach Cemetery Hill by the Emmitsburg Pike", 'inferred', author=HS, date='1863-07-01', reasoning=R, road='Emmitsburg Pike', gaz='GZ-041',
    note="Road of approach printed for the division: 'the Emmitsburg Pike' (gazetteer Emmitsburg Road GZ-041 by name). This is the only passage read so far that names the Second Division's road into Gettysburg; the commission narrative (POS-E-US-11C-2D-001) has the division on the route by Horner's Mills, which joins the Emmitsburg road south of the town. Both carried.", conflicts=['POS-E-US-11C-2D-001'])
add(U, 'arrival_road', 'at about 4 p. m. (July 1)', 'Cemetery Hill (the cemetery), then down through the town and out on the Harrisburg Road to the monument, a short distance north of Stevens Run', "The 154th New York arrived at Cemetery Hill at about 4 p. m. on the double-quick, filed into the cemetery, cleaned guns, and immediately (with the 27th Pennsylvania and 134th New York only) double-quicked down through the town and out on the Harrisburg Road, forming line where its monument stands, a short distance north of Stevens Run (sketch).",
    'NY3', S, "double-quicked down through the town, out on the Harrisburg Road, and formed line of battle", 'inferred', author=HS, t_iso='1863-07-01T16:00', date='1863-07-01', approx=True, reasoning=R, road='Harrisburg Road', gaz='GZ-045',
    extra_quote="The One hundred and fifty-fourth New York arrived there at about 4 p.", conflicts=['POS-A-11B-002'],
    note="Hour conflict: the sketch's 'about 4 p. m.' arrival against Allen's 'about 3 o'clock' march out of the cemetery (same section) and Steinwehr's 'about 2 o'clock' (OR). All carried. Road out of town: Harrisburg Road (GZ-045).")
add('us-11c-2d-coster', 'movement', '(after about 4 p. m. per the sketch, July 1)', 'down through the town, out on the Harrisburg Road, line a short distance north of Stevens Run', "Coster's three regiments (154th, 27th Pennsylvania, 134th) double-quicked down through the town and out on the Harrisburg Road to the line north of Stevens Run (154th NY sketch).",
    'NY3', S, "double-quicked down through the town, out on the Harrisburg Road, and formed line of battle", 'inferred', author=HS, date='1863-07-01', reasoning=R, road='Harrisburg Road', gaz='GZ-045',
    note='The 134th NY sketch names Baltimore Street for the passage through the town; this sketch names the Harrisburg Road for the exit. Both carried.')

# 157th New York (NY3-S010)
S2 = 'NY3-S010'
U2 = 'us-11c-3d-schimmelfennig-157ny'
CM = 'Col. James C. Carmichael (157th New York; dedication address)'
add(U2, 'position', 'July i, 1863 (inscription)', 'fields north of the town, near the Carlisle Road (monument); the advance position 300 yards in advance, marked by a marker', 'Inscription: 300 yards in advance of the monument position (fields north of the town near the Carlisle Road) the regiment lost 4 officers and 23 men killed, 8 officers and 158 men wounded, 6 officers and 108 men captured, 307 in all, July 1, 1863; the advance position is designated by a marker.',
    'NY3', S2, "300 yards in advance of this position were Killed 4 officers, 23 men", 'documented', author='monument inscription and commission caption', date='1863-07-01', gaz='GZ-046', ocr_uncertain=True,
    extra_quote="north oi the towu, near the Carlisle", note='OCR "oi the towu" = of the town; casualty digits partly garbled ("2/", "II4"). The regiment also has a second (veteran association) monument near the Mummasburg Road on the extreme left of the corps line (NY3-S011 caption).')
add(U2, 'engagement', 'that day (July 1)', 'this field (north of the town), marching forward through the pouring rain storm', 'Carmichael: the regiment, under 500 strong, marched forward that day through the pouring rain storm and met on this field a storm of shell and bullets; 309 men were killed, wounded and missing on the first day, thirty-three falling in line of battle at the extreme advance.',
    'NY3', S2, "as they marched forward that day through the pouring rain storm", 'documented', author=CM, date='1863-07-01',
    note="'Pouring rain storm' on July 1 conflicts with the 58th NY sketch (a shower on the Emmitsburg road that 'did not extend to Gettysburg'); weather claims are outside this ledger's scope and only noted.")
add(U2, 'engagement', '(July 1, the advance)', 'the wheatfield across the Pike (the 44th Georgia crossing the Pike into the wheatfield where the 157th went down)', "Letter of Capt. J. H. Connolly, 44th Georgia: Lieut. Col. Lumpkin fell 'just as we were crossing the Pike into the wheatfield where so many of the gallant One hundred and fifty-seventh went down'.",
    'NY3', S2, "crossing the Pike into the wheatfield where so many of the gallant One hundred", 'inferred', author='Capt. J. H. Connolly, 44th Georgia (letter printed in the section)', date='1863-07-01', reasoning='A Confederate officer\'s letter about the ground, not the regiment\'s own officer.',
    note='"The Pike" is not named; by the monument position it is the Carlisle or Mummasburg road. No gazetteer id assigned.')
print('done 11c_f')
