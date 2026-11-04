"""Ledger E claims: Battery I, 1st New York Light Artillery (Wiedrich), New York at Gettysburg vol. 3, section NY3-S024 (the index runs
Battery G and Battery I together; Battery I begins at p. 1242 with the inscription, the dedication address p. 1243-1245 and an unsigned
narrative pp. 1245-1248). The narrative is unsigned (commission historian or battery committee): tier inferred. Full passage read
2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

S = 'NY3-S024'; U = 'us-11c-art-1nyi'
NA = 'unsigned narrative following the Battery I dedication address (pp. 1245-1248)'
R = 'Unsigned narrative (not the battery\'s own officer as author): tier inferred.'

add(U, 'departure', 'In the morning of July ist', 'its camp at Emmitsburg, Md.; the road which led to Gettysburg, called the Emmitsburg Road', "In the morning of July 1 Wiedrich's battery left its camp at Emmitsburg, taking the road which led to Gettysburg, called the Emmitsburg Road.",
    'NY3', S, "taking the road which led to Gettysburg, called the Emmitsburg Road", 'inferred', author=NA, date='1863-07-01', reasoning=R, road='the Emmitsburg Road', gaz='GZ-041',
    note='Road of approach printed by name: the Emmitsburg Road. OCR "July ist".')
add(U, 'march', 'At about noon (July 1)', 'on the Emmitsburg Road, three or four miles from the smoke and exploding shell', "At about noon the bugle sounded 'Cannoneers mount!', then 'Trot' and 'Gallop', and the battery went off toward the smoke and shell, three or four miles distant.",
    'NY3', S, "At about noon the bugle sounded, \" Cannoneers mount! \"", 'inferred', author=NA, t_iso='1863-07-01T12:00', date='1863-07-01', approx=True, reasoning=R, gaz='GZ-041')
add(U, 'arrival_road', '(early afternoon, July 1; part of the Eleventh Corps already retreating through the town)', 'across the field near the junction of the Emmitsburg and Baltimore Roads at a gallop, up the hill on the Baltimore road, to East Cemetery Hill', 'Nearing the town the battery cut across the field near the junction of the Emmitsburg and Baltimore Roads at a gallop, went up the hill on the Baltimore road and took the position on East Cemetery Hill which it held through the three days; as it crossed the angle part of the Eleventh Corps could be seen retreating through the town.',
    'NY3', S, "cut across the field near the junction of the Emmitsburg and Baltimore Roads", 'inferred', author=NA, date='1863-07-01', reasoning=R, road='Emmitsburg Road to its junction with the Baltimore road, then up the Baltimore road', gaz='GZ-039', conflicts=['POS-A-11C-006', 'POS-A-11C-011'],
    extra_quote="part of the Eleventh Corps could be seen coming through the town on the retreat",
    note="Hour conflict: this narrative has the battery arrive while the corps was already retreating (after about 4 p. m. by the OR), whereas Wiedrich's report (POS-A-11C-011) and Osborn have the battery posted on arrival before the retreat, and Steinwehr's division reached the hill about 2 o'clock. Both carried.")
add('us-11c-art-1ohi', 'movement', '(afternoon, July 1, during the retreat)', 'coming up Baltimore street in column of pieces, prolonge fixed for firing in retreat', "Dilger's Ohio battery was coming up Baltimore street in column of pieces with prolonge rope fixed for firing in retreat as Wiedrich's battery crossed the road junction (Battery I narrative).",
    'NY3', S, "Dilger’s Ohio Battery was coming up Baltimore street in column of pieces", 'inferred', author=NA, date='1863-07-01', reasoning=R, road='Baltimore street', conflicts=['POS-A-11C-023'])
add(U, 'position', '(July 1, afternoon) held through the three days’ battle', 'East Cemetery Hill; redans or lunettes built for each gun', "The battery held East Cemetery Hill through the three days; Howard was on the spot when it arrived ('hold this position at all hazards'); it silenced a Confederate battery, fired on masses toward the York Road (Ewell's corps), and the men built redans or lunettes for each gun against sharpshooters in a steeple in the town.",
    'NY3', S, "took the posi- tion on East Cemetery Hill which they held through the three days", 'inferred', author=NA, date='1863-07-01', reasoning=R, conflicts=['POS-A-11C-006'],
    note="Fortification: lunettes built on July 1 (the OR's 'intrenchments of my battery', POS-A-11C-013). Earthwork timing: built on the evening of July 1, not pre-placed.")
add(U, 'movement', 'towards night (July 1)', 'a new position west of the Cemetery (left section, Lieut. Christopher Schmidt)', 'Towards night July 1 one section (the left, Lieut. Christopher Schmidt) was ordered to a new position west of the Cemetery, where it remained to the end of the battle, taking part in the artillery duel and the repulse of Pickett\'s charge on July 3.',
    'NY3', S, "Orders also came towards night for one section to take a new position west of the Cemetery", 'inferred', author=NA, date='1863-07-01', reasoning=R)
add(U, 'engagement', 'About 9 o’clock, p. m. (July 2)', 'East Cemetery Hill, the battery\'s lunettes', "On the evening of July 2, about 9 o'clock p. m., Hays's Louisiana brigade made a desperate assault; the infantry in front gave way and the enemy got within the battery for a moment, and were forced back by the cannoneers with sponge-staffs, handspikes and stones, then canister; a Confederate who planted his colors on a lunette of the first (left) section was knocked down and the flag taken.",
    'NY3', S, "About 9 o’clock, p. m,, they made a desperate assault on this position", 'inferred', author=NA, t_iso='1863-07-02T21:00', date='1863-07-02', approx=True, reasoning=R, conflicts=['POS-A-11C-013', 'POS-A-11C-009', 'POS-A-11B-009'],
    note='Hour: about 9 p. m. here and in Steinwehr (POS-A-11B-009); Wiedrich\'s own report about 8 p. m. (POS-A-11C-013); Osborn between 7 and 8. All carried. OCR "p. m,,".')
add(U, 'engagement', 'On the 3d, during the great artillery duel', 'East Cemetery Hill; target a Rebel battery on a hill near the Bonaughtown Road about 1,800 yards distant', "July 3, during the artillery duel, Wiedrich's men with a Pennsylvania battery on their right silenced a Confederate battery posted on a hill near the Bonaughtown Road about 1,800 yards away; a shell frightened the horses of the fourth gun's limber, which galloped down the Pike through the pickets into the enemy's lines.",
    'NY3', S, "silenced a Rebel battery, posted on a hill near the Bonaughtown Road, about 1,800 yards distant", 'inferred', author=NA, date='1863-07-03', reasoning=R, gaz='GZ-043',
    note='Bonaughtown Road = the Hanover Road (gazetteer GZ-043) by the contemporary name; the identification is the compiler\'s, the printed name is kept.')
add(U, 'departure', 'On the 5th, in the evening', 'with the rest of the army, in pursuit of Lee', 'On the evening of July 5 the battery left with the rest of the army in pursuit of Lee (casualties for the three days 3 killed and 9 wounded).',
    'NY3', S, "On the sth, in the evening, the battery left with the rest of the army", 'inferred', author=NA, date='1863-07-05', reasoning=R, ocr_uncertain=True, note='OCR "sth" = 5th.')
print('done 11c_h')
