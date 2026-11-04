"""Ledger E claims: 58th New York (Krzyzanowski's brigade), New York at Gettysburg vol. 1, section NY1-S084 pp. 426-432: monument
inscription and the unsigned HISTORICAL SKETCH (commission historian, not a regimental officer: tier inferred). Full section read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

U = 'us-11c-3d-krzyzanowski-58ny'
S = 'NY1-S084'
HS = 'HISTORICAL SKETCH (unsigned; the commission\'s historian)'
INS = 'monument inscription'
R = 'Unsigned historical sketch of the commission volume, not a regimental officer: tier inferred.'

add(U, 'position', 'JULY, 1, 1863 (inscription)', 'North of the town, near the Carlisle Road (monument)', 'Inscription: two companies of the regiment held the monument position (north of the town, near the Carlisle Road, the field on which the Eleventh Corps fought) July 1 until ordered to Cemetery Hill, where the other companies joined them.',
    'NY1', S, "North of the tuwn, near the Carlisle Road, Field on which the Eleventh Corps", 'documented', author=INS + ' and the commission\'s location caption', date='1863-07-01', gaz='GZ-046', ocr_uncertain=True,
    note='OCR "tuwn". The two-company strength on July 1 is explained by the sketch: the rest was on the Creagerstown reconnaissance (claims below). Carlisle Road = GZ-046 by name.',
    extra_quote="Two CoMPANIES OF THE REGIMENT HELD THIS POSITION JULY, 1")
add(U, 'night_position', 'During the night of June 30th', 'about five miles from Emmitsburg in the direction of Creagerstown (detachment of 100 men under Capt. Emil Koenig)', 'Night of June 30: Captain Koenig with 100 men made a reconnaissance from Emmitsburg in the direction of Creagerstown, halted about five miles out, and was recalled because the corps had started for Gettysburg; the rest of the regiment lay at Emmitsburg.',
    'NY1', S, "make a reconnoissance in the direction of Creagerstown", 'inferred', author=HS, date='1863-06-30', reasoning=R, note='Creagerstown is south of Emmitsburg (Maryland), outside the gazetteer.')
add(U, 'departure', '9 a.m. on July 1st', 'the abandoned camping ground of the regiment at Emmitsburg', 'At 9 a. m. July 1 Koenig\'s detachment, back at the abandoned camp at Emmitsburg, picked up the night picket (more than half the regiment) and started to overtake the corps, but was ordered to march with the wagon train.',
    'NY1', S, "It was 9 a.m. on July 1st, when Koenig and his men, returning to Emmits- burg", 'inferred', author=HS, t_iso='1863-07-01T09:00', date='1863-07-01', reasoning=R,
    note='The detachment marched with the wagon train; its road is not named. The main body (two companies) had marched with the corps earlier.')
add(U, 'arrival_road', 'about 3:30 p.m. (July 1)', 'Gettysburg; about four miles from the town the detachment left the train', 'The detachment (more than half the regiment) heard heavy cannonading about four miles from the town, left the wagon train, pressed forward and arrived at Gettysburg about 3:30 p. m.; after some delay it rejoined the regiment and brigade on Cemetery Hill.',
    'NY1', S, "pressed forward at a fast pace, arriving at Gettysburg about 3:30 p.m.", 'inferred', author=HS, t_iso='1863-07-01T15:30', date='1863-07-01', reasoning=R,
    road='with the wagon train from Emmitsburg (road not named)', conflicts=[],
    note='Road not named; the sketch says a shower drenched the men and damaged the roads on the way. The main body of two companies fought north of the town and fell back through the streets to Cemetery Hill (next claim).')
add(U, 'movement', '(afternoon, July 1)', 'the north side of the town, then through the streets to Cemetery Hill', 'The remainder of the regiment (two companies) was engaged on the north side of the town on July 1 and fell back through the streets to Cemetery Hill with the rest of the corps.',
    'NY1', S, "engaged in the battle of the First Day on the north side of the town", 'inferred', author=HS, date='1863-07-01', reasoning=R)
add(U, 'position', 'During the battle of the Second Day', 'Cemetery Hill, in support of the artillery', 'July 2: the regiment lay in support of the artillery on Cemetery Hill, under the afternoon fire of the Confederate batteries on Benner\'s Hill (Adjutant Dietrich killed).',
    'NY1', S, "the Fifty-eighth lay in support of the artillery on Cemetery Hill", 'inferred', author=HS, date='1863-07-02', reasoning=R)
add(U, 'engagement', 'At dusk (July 2)', "East Cemetery Hill, Wiedrich’s Battery", "At dusk July 2, when Hays's and Hoke's brigades charged through Wiedrich's battery on East Cemetery Hill, the 58th and 119th New York, led by Schurz in person, hastened to the rescue of the artillery; the assailants were repulsed without their assistance; the 58th remained there and sent a company out as skirmishers.",
    'NY1', S, "the Fifty-eighth and One Hundred and Nineteenth New York hastened to the rescue of the artillery", 'inferred', author=HS, date='1863-07-02', reasoning=R,
    note='"Repulsed without their assistance": the sketch denies the two regiments a part in the repulse itself.')
add('us-11c-3d-krzyzanowski-119ny', 'engagement', 'At dusk (July 2)', "East Cemetery Hill, Wiedrich’s Battery", "At dusk July 2 the 119th New York, with the 58th, led by Schurz in person, hastened to Wiedrich's battery on East Cemetery Hill during the assault of Hays's and Hoke's brigades (58th NY sketch).",
    'NY1', S, "the Fifty-eighth and One Hundred and Nineteenth New York hastened to the rescue of the artillery", 'inferred', author=HS, date='1863-07-02', reasoning=R)
add(U, 'position', 'On the morning of the 3d', "the right of the road leading into Gettysburg (Baltimore Pike), behind a stone fence on the left of Wiedrich’s Battery", 'Morning of July 3: the regiment moved to the right of the Baltimore Pike and took position behind a stone fence on the left of Wiedrich\'s battery; Lieutenant Schwartz with one company took the houses on the outskirts of the town.',
    'NY1', S, "took a position behind a stone fence on the left of Wiedrich’s Battery", 'inferred', author=HS, date='1863-07-03', reasoning=R, road='the road leading into Gettysburg (Baltimore Pike)', gaz='GZ-039')
add(U, 'movement', 'during the night of July 3d (enemy evacuated); shortly after (July 4)', 'the town (patrols from the houses on the outskirts)', 'After the enemy evacuated the town during the night of July 3, Schwartz\'s patrol of ten men and then Lieutenant Lauber with twenty men went into the town and brought back about 200 prisoners (the inscription: after the repulse of Pickett\'s charge the regiment skirmished into Gettysburg).',
    'NY1', S, "Schwartz sent out ten of his men as a patrol to gain information", 'inferred', author=HS, date='1863-07-04', reasoning=R)
print('done 11c_b')
