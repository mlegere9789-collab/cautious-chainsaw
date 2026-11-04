"""Ledger E claims: XI Corps, 3rd Division, 1st Brigade (Schimmelfennig / von Amsberg): 45th New York (New York at Gettysburg vol. 1,
section NY1-S080, pp. 374-383: monument inscriptions, the German address, and the regimental committee's narrative pp. 378-381) and
the commission narrative of vol. 1 (NY1-S001, p. 15) for the route of Schurz's and Steinwehr's divisions by Horner's Mills.
Full section read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

U45 = 'us-11c-3d-schimmelfennig-45ny'
S = 'NY1-S080'
COMM = 'the regimental committee of the 45th New York (narrative following the dedication address; vol. 1 p. 378)'
INS = 'monument inscription (bronze tablet text as printed by the commission)'
OR45 = ['POS-A-11B-038']  # OR: Dobke, arrived at 11 a. m.

# ---- commission narrative (compiler, inferred) : route by Horner's Mills for the 2nd and 3rd Divisions
for u in ('us-11c-3d', 'us-11c-2d'):
    add(u, 'arrival_road', '(July 1, forenoon)', "the circuitous route by Horner's Mills", "Schurz's and Steinwehr's divisions marched thirteen miles to Gettysburg on July 1, having taken the circuitous route by Horner's Mills (commission narrative).",
        'NY1', 'NY1-S001', "having taken the circuitous route by Horner’s Mills", 'inferred', author='New York Monuments Commission narrative (compiler)', date='1863-07-01',
        road="the circuitous route by Horner's Mills", note="Compiler's narrative, not a regimental officer: tier inferred. Names the route (Horner's Mills), not a road the gazetteer holds. Agrees with Howard's order (OR, 'the road past Horner's Mills', RC-07) and with the 45th NY committee (POS-E-US-11C-3D-SCHIMMELFENNIG-45NY).",
        reasoning="The commission's narrative of July 1 states the divisions 'marched thirteen miles, having taken the circuitous route by Horner's Mills'; the sentence is the compiler's summary, so the tier is inferred.")

# ---- 45th New York: regimental committee narrative (documented)
add(U45, 'departure', '6 A. M., July 1, 1863', "at or near St. Joseph’s College, Emmitsburg, Maryland", 'The 45th New York broke camp at 6 a. m. July 1 at or near St. Joseph\'s College, Emmitsburg, and was ordered to march towards Gettysburg at about 6:30 a. m.',
    'NY1', S, "This regiment broke camp at 6 A. M., July 1, 1863", 'documented', author=COMM, t_iso='1863-07-01T06:00', date='1863-07-01',
    road='towards Gettysburg (march ordered at about 6:30 a. m.)', note='Camp named (St. Joseph\'s College, Emmitsburg); Emmitsburg is not a gazetteer place.')
add(U45, 'arrival_road', '(July 1, forenoon)', "At or near Horner's Mills", "At or near Horner's Mills returning couriers and wounded cavalrymen reported the engagement; the regiment was directed by a shorter route to the town of Gettysburg, the greater part of the distance at the double-quick.",
    'NY1', S, "we were directed by a shorter route to the town of Gettysburg", 'documented', author=COMM, date='1863-07-01',
    road="from Horner's Mills by 'a shorter route' to the town (road not named)", note="Road of approach: the column was on the route by Horner's Mills and left it for 'a shorter route'; the shorter route is not named. Horner's Mills is not in the gazetteer.",
    extra_quote="At or near Horner's Mills, returning - couriers and wounded cavalrymen reported an engagement")
add(U45, 'march', '11:15 A. M., by the town clock', 'the town (Gettysburg)', 'The regiment arrived in the town of Gettysburg panting and out of breath at 11:15 a. m. by the town clock.',
    'NY1', S, "arrived, panting and out of breath, at 11:15 A. M., by the town clock", 'documented', author=COMM, t_iso='1863-07-01T11:15', date='1863-07-01',
    conflicts=OR45, note='OR (Dobke, POS-A-11B-038) prints 11 a. m.; the monument inscription prints "went into action about 11:30 a. m." (inscription claim below). The three hours are carried; none is chosen.')
add(U45, 'movement', '(on arrival, about 11:15 a. m., July 1)', "the Mummasburg Road, past the College, toward McLean’s red barn on Oak Hill", "Colonel von Amsberg ordered four companies under Capt. Francis Irsch to proceed at once on the Mummasburg Road past the College, taking McLean's red barn on Oak Hill as objective, and to deploy as skirmishers to the right of the road; the regiment followed in support.",
    'NY1', S, "proceed at once on the Mummasburg Road, past the College", 'documented', author=COMM, date='1863-07-01', road='Mummasburg Road', gaz='GZ-047',
    note='Direction of deployment: right (east) of the Mummasburg Road, fronting Oak Hill.')
add(U45, 'engagement', '(forenoon to about 1 o’clock, July 1)', "about four hundred yards forward toward Oak Hill, behind fences near Hagy’s farm and the lane at the foot of Oak Hill", "The four companies advanced about four hundred yards toward Oak Hill under artillery and sharpshooter fire (Page's Virginia battery near McLean's barn; Blackford's Alabama sharpshooters along the lane at the foot of Oak Hill to the orchard near Hagy's farm) and then sheltered behind fences.",
    'NY1', S, "gaining ground under a terrific artillery and sharpshooter fire, say about four hundred yards", 'documented', author=COMM, date='1863-07-01',
    note="Enemy units named by the committee (Page's battery, Blackford's battalion, later O'Neal's and Iverson's brigades) are the committee's identifications, not the regiment's observation at the time.")
add(U45, 'position', 'until about 4 Pp. M.', 'almost a mile in front of the town at Oak Hill, with a brigade of the First Corps', 'The regiment stood with a brigade of the First Corps almost a mile in front of the town at Oak Hill, unmolested except by batteries on the right, until about 4 p. m., when it was withdrawn to the rye field in support of the 157th New York.',
    'NY1', S, "in this position until about 4 Pp. M., when our regiment was withdrawn", 'documented', author=COMM, t_iso='1863-07-01T16:00', date='1863-07-01', approx=True,
    note='OCR "4 Pp. M." is the printed 4 P. M. with a doubled letter; the hour is legible.', ocr_uncertain=False)
add(U45, 'movement', '(after about 4 p. m., July 1)', 'the College, then into the town by way of the Eagle Hotel and Chambersburg street toward Cemetery Hill', 'After the division bugler sounded the retreat the regiment retired slowly, left in front, into the town; fired on from the west at the Eagle Hotel, it pushed another square toward Cemetery Hill, where Major Koch fell wounded, then turned back into Chambersburg street and passed through the alleys and yards by the Lutheran Church toward Cemetery Hill with its flags.',
    'NY1', S, "we retreated slowly left in front into the town, cautiously followed by the enemy", 'documented', author=COMM, date='1863-07-01', conflicts=['POS-A-11B-040'],
    note='OR (Dobke) says the regiment halted at the seminary to cover the retreat; the committee narrative has it retire from the College through the town. Both carried.')
add(U45, 'engagement', 'until towards sundown; inscription: about 5:30 P. M.', 'houses near the Eagle Hotel, Chambersburg street west of the town square', 'A portion of the regiment, cut off in the town, held connecting houses and yards on Chambersburg street near the Eagle Hotel against repeated demands to surrender until towards sundown, then destroyed its arms and surrendered (the inscription prints about 5:30 p. m.).',
    'NY1', S, "Repeated demands to surrender were refused until towards sundown", 'documented', author=COMM, date='1863-07-01', t_iso='1863-07-01T17:30', approx=True,
    extra_quote="UNTIL ABOUT 5:30 P. M. WHEN THEY SURRENDERED", note='The clock hour (5:30 p. m.) is from the monument inscription in the same section; the committee narrative says "towards sundown".')
add(U45, 'night_position', 'that night (July 1)', 'Cemetery Hill, supporting the artillery', 'The remnant of the regiment with its flags reached Cemetery Hill under Captain Searles and supported the artillery that night and the following day.',
    'NY1', S, "reached Cemetery Hill in safety under Captain Searles, and supported the artillery that night", 'documented', author=COMM, date='1863-07-01')
add(U45, 'movement', 'On the night of the second day', "Culp’s Hill, General Greene’s brigade, Twelfth Corps", "On the night of July 2 the regiment, with the 82nd Illinois of its brigade, went to the assistance of Greene's brigade at Culp's Hill and helped drive the Confederates out of rifle-pits taken in a night attack; it returned at daylight to protect the artillery on Cemetery Hill.",
    'NY1', S, "went to the assistance of General Greene’s Brigade, Twelfth Corps, at Culp’s Hill", 'documented', author=COMM, date='1863-07-02', conflicts=['POS-A-11B-041'],
    note='OR (Dobke) prints the return to Cemetery Hill at 2.30 a. m.; the committee says "at daylight"; the German address says the morning of July 3. All carried.')
add(U45, 'position', 'July 3 (returned at daylight)', 'Cemetery Hill, protecting the artillery', 'July 3: the regiment returned at daylight from Culp\'s Hill to Cemetery Hill to protect the artillery; exposed to artillery and sharpshooter fire; Sergeant Link with volunteers dislodged sharpshooters in the edge of the town (inscription).',
    'NY1', S, "The regiment returned at daylight to protect our artillery at Cemetery Hill", 'documented', author=COMM, date='1863-07-03')
add(U45, 'departure', 'In the afternoon (July 4)', 'in pursuit of the enemy', 'On the morning of July 4 the regiment rested; in the afternoon it went in pursuit of the enemy.',
    'NY1', S, "In the afternoon it went in pursuit of the enemy", 'documented', author=COMM, date='1863-07-04')
# inscription hour of going into action
add(U45, 'engagement', 'ABOUT I1:30 A. M., JULY IST, 1863', 'about one hundred yards to the rear of this monument (northwest of the town, near the Mummasburg Road)', 'Inscription: the regiment went into action about 11:30 a. m. July 1 by deploying four companies as skirmishers under Captain Irsch about one hundred yards to the rear of the monument, advancing about 540 yards to a point marked in front.',
    'NY1', S, "THIS REGIMENT WENT INTO ACTION ABOUT I1:30 A. M., JULY IST, 1863", 'documented', author=INS, t_iso='1863-07-01T11:30', date='1863-07-01', approx=True, ocr_uncertain=True,
    conflicts=OR45, note='OCR "I1:30" for 11:30 (the OR prints 11.30 a. m. for the skirmish deployment, POS-A-11B-039). Monument location printed: northwest of the town, near the Mummasburg Road, Pennsylvania College in the background.', gaz='GZ-047')

# ---- sister units named by the 45th NY committee (inferred: the author is not the unit's own officer)
add('us-11c-3d-schimmelfennig-61oh', 'arrival_road', 'say about 1 o’clock (July 1)', 'through the centre of the town, into skirmish line on the right of the 45th New York (toward Oak Hill)', 'The 61st Ohio and 74th Pennsylvania arrived about 1 o\'clock, pushing through the centre of the town and coming into skirmish line on the right of the 45th New York (45th NY committee).',
    'NY1', S, "pushing through the centre of the town, and coming into skirmish line", 'inferred', author=COMM, t_iso='1863-07-01T13:00', date='1863-07-01', approx=True,
    road='through the centre of the town (street not named)', conflicts=['POS-A-11B-043'], reasoning="Stated by the 45th New York's committee about a sister regiment; the 61st Ohio's own report (OR, Bown) gives about 1.30 p. m.",
    note='Witness statement by another regiment: tier inferred. OR Bown: about 1.30 p. m.')
add('us-11c-3d-schimmelfennig-74pa', 'arrival_road', 'say about 1 o’clock (July 1)', 'through the centre of the town, into skirmish line on the right of the 45th New York (toward Oak Hill)', 'The 74th Pennsylvania and 61st Ohio arrived about 1 o\'clock, pushing through the centre of the town and coming into skirmish line on the right of the 45th New York (45th NY committee).',
    'NY1', S, "pushing through the centre of the town, and coming into skirmish line", 'inferred', author=COMM, t_iso='1863-07-01T13:00', date='1863-07-01', approx=True,
    road='through the centre of the town (street not named)', reasoning="Stated by the 45th New York's committee about a sister regiment.", note='Witness statement by another regiment: tier inferred.')
add('us-11c-art-1ohi', 'position', '(forenoon, July 1)', 'a short distance behind the 45th New York on low ground (north of the town, Mummasburg Road front)', "Dilger's Ohio battery unlimbered a short distance behind the 45th New York on low ground and engaged the battery near McLean's barn and the enfilading battery to the east (45th NY committee).",
    'NY1', S, "our superb Ohio battery (Dilger’s) unlimbered a short distance behind us on low ground", 'inferred', author=COMM, date='1863-07-01',
    reasoning="Stated by the 45th New York's committee about the battery; Dilger's own report is in ledger A (POS-A-11C-021/022).", note='Witness statement by another unit: tier inferred.')
add('us-11c-3d-schimmelfennig-157ny', 'movement', '(about 4 p. m., July 1)', "forward to the right against Gordon’s Brigade (the rye field north of the town)", "The 157th New York had gone forward to the right against Gordon's brigade; about 4 p. m. the 45th New York was withdrawn to the rye field in its support (45th NY committee).",
    'NY1', S, "gone gallantly forward to the right against Gordon’s Brigade of Confederates", 'inferred', author=COMM, date='1863-07-01', approx=True,
    reasoning="Stated by the 45th New York's committee about a sister regiment.", note='Witness statement by another regiment: tier inferred.')
for u in ('us-11c-3d-schimmelfennig-82il', 'us-11c-3d-krzyzanowski-26wi'):
    add(u, 'movement', '(afternoon, July 1)', "the field to the right (east), to meet Early’s Division", "Several regiments including the 82nd Illinois and the 26th Wisconsin went to meet Early's division in the field to the right (45th NY committee; the committee calls the 26th Wisconsin 'from our brigade').",
        'NY1', S, "including the Eighty-second Ilinois and the Twenty-sixth Wisconsin from our brigade", 'inferred', author=COMM, date='1863-07-01',
        reasoning="Stated by the 45th New York's committee about sister regiments.", note="Witness statement by another regiment: tier inferred. The 26th Wisconsin belonged to Krzyzanowski's brigade in the OR organization; the committee's 'from our brigade' is carried as printed. OCR 'Ilinois'.", ocr_uncertain=False)
add('us-11c-3d-schimmelfennig-82il', 'movement', 'On the night of the second day', "Culp’s Hill, General Greene’s brigade", "On the night of July 2 the 82nd Illinois went with the 45th New York to the assistance of Greene's brigade at Culp's Hill (45th NY committee).",
    'NY1', S, "with the Eighty-second Illinois, of our brigade, it went to the assistance", 'inferred', author=COMM, date='1863-07-02',
    reasoning="Stated by the 45th New York's committee about a sister regiment; agrees with Schurz (POS-A-EXT-008).", note='Witness statement by another regiment: tier inferred.')
print('done 11c_a')
