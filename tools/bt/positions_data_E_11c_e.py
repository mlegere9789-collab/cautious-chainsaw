"""Ledger E claims: 136th New York (Orland Smith's brigade), New York at Gettysburg vol. 2, section NY2-S030 pp. 921-933: address of
Gen. James Wood (the regiment's colonel at Gettysburg: documented) and the unsigned HISTORICAL SKETCH (inferred). The OCR file runs on
past p. 933 into an unrelated appended work (a Chancellorsville study): nothing after +45000 of the section is used. Full section read
2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

S = 'NY2-S030'
U = 'us-11c-2d-smith-136ny'
W = 'Gen. James Wood (colonel of the 136th New York at Gettysburg; dedication address)'
HS = 'HISTORICAL SKETCH (unsigned; the commission\'s historian)'
R = 'Unsigned historical sketch (not a regimental officer): tier inferred.'

add(U, 'march', 'Leaving Boonsboro Gap at 4:40 p. m., on Sunday, June 28th', 'by way of Frederick to Emmitsburg', 'The regiment left Boonsboro Gap at 4:40 p. m. June 28 and, moving by way of Frederick, marched thirty-eight miles within twenty-four and a half hours.',
    'NY2', S, "Leaving Boonsboro Gap at 4:40 p. m., on Sunday, June 28th", 'inferred', author=HS, t_iso='1863-06-28T16:40', date='1863-06-28', reasoning=R, road='by way of Frederick')
add(U, 'night_position', 'at 5 p. m., on the 29th (June)', 'Emmitsburg, Md.', 'The column arrived at Emmitsburg at 5 p. m. June 29 (twenty-two miles that day); on June 30 the general muster reported 2? officers and 529 men present for duty.',
    'NY2', S, "the column arrived at Emmitsburg at 5 p. m., on ilie 29lh", 'inferred', author=HS, t_iso='1863-06-29T17:00', date='1863-06-29', reasoning=R, ocr_uncertain=True, conflicts=['POS-A-11B-011'],
    note='OCR "ilie 29lh" for "the 29th". Same hour as Smith\'s brigade report (POS-A-11B-011). Officer count OCR "2^".')
add(U, 'march', 'On July 1st (started in the morning)', 'from Emmitsburg to Gettysburg, Smith\'s brigade bringing up the rear of the corps', "On July 1 the Eleventh Corps was ordered to Gettysburg; it started in the morning with Col. Orland Smith's brigade, to which the 136th belonged, bringing up the rear.",
    'NY2', S, "with Col. Orland Smith’s Brigade — to which the One hundred and thirty-sixth New York belonged", 'inferred', author=HS, date='1863-07-01', reasoning=R,
    road='from Emmitsburg to Gettysburg (road not named)', note='Road not named. Wood\'s address (same section): "the fatiguing march on the hot, dusty, first day of July"; the announcement of Reynolds\' death met the column on the march.')
add(U, 'position', '(July 1, on arrival)', 'in rear of Cemetery Hill, in line of battle by battalions in mass; then through the cemetery to the front of the hill overlooking Gettysburg', "On arriving at Gettysburg Steinwehr halted Smith's brigade and formed it by battalions in mass in rear of Cemetery Hill, the rest of the corps except Wiedrich's battery having passed through the town; the brigade then advanced through the cemetery to the front of the hill overlooking Gettysburg and Smith placed his four regiments to resist an attack on the hill.",
    'NY2', S, "formed it in line of battle, by battalions in mass, in rear of Cemetery Hill", 'inferred', author=HS, date='1863-07-01', reasoning=R, conflicts=['POS-A-11B-013'],
    note='Agrees with Smith (OR, POS-A-11B-013). Wood\'s address: "our arrival and taking position on the ground where this cemetery now is"; the Second Division displayed in column by company on Cemetery Hill with Buford\'s cavalry deployed in front.')
add('us-11c-2d-smith', 'position', 'during the fighting of the two succeeding days (July 2-3)', 'the base of Cemetery Hill (west and south-west slope), the 136th on the left joining the right of the Second Corps', "Smith's brigade held the exposed position at the base of Cemetery Hill during July 2 and 3; the 136th New York on the left held the extreme left of the Eleventh Corps line and joined the right of the Second Corps.",
    'NY2', S, "held this very important and exposed position at the base of Cemetery Hill", 'inferred', author=HS, date='1863-07-02', reasoning=R)
add(U, 'position', 'during the second and third days’ fighting', 'along the Taneytown Road behind a stone wall bounding the west side of the road, at the base of the western slope of Cemetery Hill, where the road is very near the Emmitsburg Road', 'The 136th New York lay along the Taneytown Road behind the stone wall on the west side of the road at the base of the western slope of Cemetery Hill, the extreme left of the Eleventh Corps joining the right of the Second Corps; Colonel Wood sent out most of his men as skirmishers and sharpshooters on July 2 and 3 under continuous fire.',
    'NY2', S, "It lay along the Taneytown Road behind a stone wall that bounded the west side", 'inferred', author=HS, date='1863-07-02', reasoning=R, gaz='GZ-042', road='Taneytown Road', conflicts=['POS-A-11B-017', 'POS-A-11B-018'],
    extra_quote="than when last we held the Taneytown Road", note='Wood\'s own words in the same section: "than when last we held the Taneytown Road" (documented confirmation of the road held). Agrees with Wood\'s OR report (POS-A-11B-017/018).')
add(U, 'engagement', 'At I o’clock (July 3)', 'Cemetery Hill / Cemetery Ridge position (the fire concentrated on Cemetery Hill)', 'Wood: at 1 o\'clock July 3 a signal gun near Gettysburg opened the enemy\'s cannonade along the whole line, a terrific fire of two hours concentrated on Cemetery Hill, after which Lee\'s columns emerged from the woods on Seminary Ridge and were repulsed.',
    'NY2', S, "At I o’clock the discharge of a cannon near Gettysburg gives the signal", 'documented', author=W, t_iso='1863-07-03T13:00', date='1863-07-03', ocr_uncertain=True, note='OCR "I o\'clock" for 1 o\'clock.')
add(U, 'departure', 'After Gettysburg (July 5 or after)', 'in pursuit of Lee\'s retreating army', 'After the battle the regiment took part in the pursuit of Lee\'s retreating army and returned with its corps to Virginia.',
    'NY2', S, "After Gettysburg the regiment participated in the pursuit of Lee’s retreating army", 'inferred', author=HS, date=None, reasoning=R, note='No date printed for the departure.')
print('done 11c_e')
