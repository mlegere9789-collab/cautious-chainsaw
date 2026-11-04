"""Ledger E claims: 13th New York Independent Battery (Wheeler), New York at Gettysburg vol. 3, inside index section NY3-S029 (the OCR
runs the 1st Light Artillery batteries and the independent batteries together); the 13th Battery's inscription, dedication address (a
veteran of the battery, name not recovered from the OCR) and unsigned sketch are at pp. 1315-1322. Tier inferred (no officer named as
author). Full passage read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

S = 'NY3-S029'; U = 'us-11c-art-13ny'
AD = 'dedication address to the "Veterans of the Thirteenth New York Independent Battery" (speaker a member of the battery; name not recovered)'
SK = 'unsigned sketch of the 13th Battery following the address (pp. 1318-1322)'
R = 'Speaker or sketch not identified as an officer of the battery: tier inferred.'

add(U, 'march', 'on July 1st', 'from Emmitsburg to Gettysburg, at a gallop', 'The battery made a rapid march from Emmitsburg to Gettysburg on July 1, galloping all that distance to join the fight of the First Corps.',
    'NY3', S, "the rapid march of the battery from Emmitsburg to Gettysburg, when on July 1st", 'inferred', author=AD, date='1863-07-01', reasoning=R, note='Road not named (Emmitsburg to Gettysburg).', conflicts=['POS-A-11C-015'])
add(U, 'night_position', 'on the morning of July ist (arrived); ready to move at short notice', 'Emmitsburg', 'The sketch: after long marches the battery arrived at Emmitsburg on the morning of July 1 and at an early hour was ready to move at short notice.',
    'NY3', S, "we arrived at Emmitsburg on the morning of July ist, and at an early hour were ready", 'inferred', author=SK, date='1863-07-01', reasoning=R,
    note='"Arrived at Emmitsburg on the morning of July 1" conflicts with the corps\' arrival at Emmitsburg on June 29 (Smith, POS-A-11B-011; 136th NY sketch); carried as printed.', conflicts=['POS-A-11B-011'])
add(U, 'arrival_road', '(July 1, when ordered forward)', 'through the town of Gettysburg and out on the Carlisle Road, position to the left of the road', 'When ordered forward the battery galloped all the way to and through the town of Gettysburg and out on the Carlisle Road, to the left (west) of which it took position.',
    'NY3', S, "galloped all the way to and through the town of Gettysburg, and out on tlie Carlisle Road", 'inferred', author=SK, date='1863-07-01', reasoning=R, road='through the town, out on the Carlisle Road', gaz='GZ-046', conflicts=['POS-A-11C-016'],
    note='OCR "tlie". Position: left of the Carlisle Road (the OR: on Dilger\'s right, POS-A-11C-016).')
add(U, 'movement', '(afternoon, July 1)', 'back to Cemetery Hill, with prolonges hitched so as to fire while retiring', 'When the enemy threatened to surround and capture the guns the battery fell back to Cemetery Hill with prolonges hitched so as to fire while retiring.',
    'NY3', S, "with prolonges hitched so as to fire while retiring, the battery fell back to Cemetery Hill", 'inferred', author=SK, date='1863-07-01', reasoning=R, conflicts=['POS-A-11C-017'])
add(U, 'position', 'July 2d (and 3d)', 'Cemetery Hill', 'The battery took part in the battles of July 2 and 3 at Cemetery Hill (inscription: July 2, on Cemetery Hill).',
    'NY3', S, "At that place it took part in tlie battles of July 2d and 3d", 'inferred', author=SK, date='1863-07-02', reasoning=R, extra_quote="July 2, on Cemetery Hill July 3, at repulse of Pickett", conflicts=['POS-A-11C-018'])
add(U, 'movement', 'On July 3d, when Pickett made his famous charge', 'the point known as the "Bloody Angle" (the Second Corps front)', "On July 3, when Pickett's charge was made, the battery was ordered to that part of the field, the point known as the Bloody Angle, and poured canister at close range into the advancing Confederates (address and sketch).",
    'NY3', S, "the battery was ordered to the point known as the \" Bloody Angle,\"", 'inferred', author=AD, date='1863-07-03', reasoning=R, conflicts=['POS-A-11C-020'],
    note='Wheeler\'s report (OR, POS-A-11C-020) has the move to the Second Corps front at about 4 p. m., after the charge; the address has the battery firing canister during the charge. Both carried.')
print('done 11c_i')
