"""Ledger E claims: 134th New York (Coster's brigade), New York at Gettysburg vol. 2, section NY2-S029 pp. 906-922: oration of Hon. T. L.
Barhydt (not an officer: inferred) and the unsigned HISTORICAL SKETCH (commission historian: inferred). Full section read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

S = 'NY2-S029'
U = 'us-11c-2d-coster-134ny'
HS = 'HISTORICAL SKETCH (unsigned; the commission\'s historian)'
OR_ = 'Oration of Hon. T. L. Barhydt (civilian orator)'
R = 'Unsigned historical sketch of the commission volume (not a regimental officer): tier inferred.'

add(U, 'night_position', 'June 29th (arriving); resting there on the morning of July 1st', 'Emmitsburg, Md.', 'The 134th New York marched through Jefferson, Middletown and Frederick to Emmitsburg, arriving June 29, and was resting at Emmitsburg on the morning of Wednesday July 1 when orders came for the corps to march to Gettysburg, ten miles distant.',
    'NY2', S, "to Emmitsburg, arriving at the latter place June 29th", 'inferred', author=HS, date='1863-06-29', reasoning=R)
add('us-11c-2d', 'march', 'on the morning of Wednesday, July 1st', 'the road from Emmitsburg to Gettysburg, Steinwehr\'s division bringing up the rear of the corps', "On the morning of July 1 the Eleventh Corps marched from Emmitsburg to Gettysburg, Steinwehr's division bringing up the rear; about half way the news spread that the First Corps was fighting and Reynolds killed, and the pace increased.",
    'NY2', S, "The Eleventh Corps was soon on the road, Steinwehr’s Division bringing up the rear", 'inferred', author=HS, date='1863-07-01', reasoning=R,
    road='from Emmitsburg to Gettysburg (road not named; the division was the rear of the corps)', conflicts=['POS-A-11B-012'],
    note='Smith (OR, POS-A-11B-012) says his brigade brought up the rear of the entire corps; here the division is the rear. Road not named.')
add('us-11c-2d', 'arrival_road', 'about 2 o’clock (July 1)', 'Gettysburg; ordered to occupy Cemetery Hill', "Steinwehr's division arrived at Gettysburg about 2 o'clock and was immediately ordered to occupy Cemetery Hill (134th NY sketch; agrees with Steinwehr, OR).",
    'NY2', S, "Steinwehr’s Division arrived at Gettysburg about 2 o’clock", 'inferred', author=HS, t_iso='1863-07-01T14:00', date='1863-07-01', approx=True, reasoning=R, conflicts=['POS-A-11B-002'],
    note='Same hour as Steinwehr\'s report (POS-A-11B-002); listed as a conflict entry only to link the two sources.')
add('us-11c-2d-coster', 'position', '(about 2 o’clock, July 1)', "the northeast part of Cemetery Hill, in support of Wiedrich’s Battery", "Coster's First Brigade (Colonel Coster commanding in the absence of General Buschbeck) was placed on the northeast part of Cemetery Hill in support of Wiedrich's battery.",
    'NY2', S, "was placed on the northeast part of Cemetery Hill, in support of Wicdrich’s Battery", 'inferred', author=HS, date='1863-07-01', reasoning=R, ocr_uncertain=False,
    note='OCR "Wicdrich" for Wiedrich.')
add('us-11c-2d-coster', 'movement', '(afternoon, July 1)', 'down Baltimore Street through the town to the fields on the farther (north) side, three regiments in line not far from the houses', "On Schurz's urgent call Coster was ordered to Schurz's assistance; the brigade marched down Baltimore Street through the town and, entering the fields on the farther side, deployed three regiments in line of battle not far from the houses, the 73rd Pennsylvania in the edge of the town near the railway station; Heckman's Ohio battery unlimbered on the brigade's left.",
    'NY2', S, "marching down Baltimore Street, passed through the town", 'inferred', author=HS, date='1863-07-01', reasoning=R, road='Baltimore Street through the town',
    note="Street named for the passage through the town (Baltimore Street). The field position is the brick-yard field at the north end of Stratton Street (commission caption of the 154th NY inscription, NY3). Coster brigade's own hour and road of arrival remain unprinted here beyond the division's 'about 2 o'clock'.")
add('us-11c-2d-coster-73pa', 'position', '(afternoon, July 1)', 'the edge of the town near the railway station', "Coster placed his fourth regiment, the 73rd Pennsylvania, in the edge of the town near the railway station while the other three deployed in the fields beyond (134th NY sketch).",
    'NY2', S, "placed his fourth regiment, the Seventy-third Pennsylvania, in the edge of the town", 'inferred', author=HS, date='1863-07-01', reasoning=R)
add('us-11c-art-1ohk', 'position', '(afternoon, July 1)', "the left of Coster's brigade, north side of the town", "Heckman's Ohio battery unlimbered its guns on the left of Coster's brigade in the fields north of the town and opened fire (134th NY sketch).",
    'NY2', S, "Hcckman’s Ohio Battery unlimbered its guns and opened fire", 'inferred', author=HS, date='1863-07-01', reasoning=R, ocr_uncertain=False, note='OCR "Hcckman" for Heckman.')
add(U, 'engagement', '(afternoon, July 1; a few minutes after deploying)', 'the right of Coster\'s brigade, in the fields north of the town', "The 134th New York (Lieutenant Colonel Allan H. Jackson, about 430 officers and men) held the right of the brigade; a few minutes after deploying, Hays's and Hoke's brigades of Early's division attacked; the 134th remained after the other regiments had joined the retreat and lost more than half its men on the exposed flank, the remnant escaping to Cemetery Hill.",
    'NY2', S, "held the right of the brigade. It numbered about 430, officers and men", 'inferred', author=HS, date='1863-07-01', reasoning=R)
add(U, 'position', 'during the two succeeding days of the battle (July 2-3)', 'Cemetery Hill', 'The regiment remained on Cemetery Hill July 2 and 3; it took part in the repulse of the Louisiana brigade on the evening of July 2 and was under severe artillery fire on July 3 (losses 42 killed, 151 wounded, 59 missing: 252).',
    'NY2', S, "The regiment remained on Cemetery Hill during the two succeeding days of the battle", 'inferred', author=HS, date='1863-07-02', reasoning=R)
add('us-11c-2d-coster', 'position', 'on the third day and until the Confederates retired from the field on the fourth day', 'the square in the town, barricaded', "The orator says the brigade, with other troops, occupied the square in the town, which it barricaded and held on the third day until the Confederates retired on the fourth (Barhydt).",
    'NY2', S, "occupying the square in the town which you barricaded and held on the third day", 'inferred', author=OR_, date='1863-07-03', reasoning='Civilian orator, not an officer; the statement is addressed to the veterans as their own memory.', weak_source=True,
    note='Weak source (orator). Agrees with the 58th NY sketch of houses on the outskirts held on July 3.')
add('us-11c-2d-coster', 'movement', '(afternoon, July 1)', 'between the Eleventh Corps retiring by the Mummasburg and Carlisle Roads and Hays\'s and Hoke\'s brigades on its left flank', "Barhydt: the Eleventh Corps was retiring on the town by the Mummasburg and Carlisle Roads; Hays's and Hoke's brigades moved on its left flank to cut off the retreat, and Coster's three regiments (134th, 154th NY, 27th PA) were moved out by Howard's order between the two bodies.",
    'NY2', S, "upon which they were retiring by the Mummasburg and Carlisle Roads", 'inferred', author=OR_, date='1863-07-01', reasoning='Civilian orator.', weak_source=True, gaz=None,
    note='Roads named for the corps\' retirement (Mummasburg GZ-047 and Carlisle GZ-046 roads), not for an approach. Weak source (orator); the sketch (above) carries the same movement without the roads.')
print('done 11c_d')
