"""Ledger E claims: the Pennsylvania regiments of the XI Corps from Pennsylvania at Gettysburg (1914 printing) vol. 1: 27th (PA1B-S004,
pp. 199-200, the commission's regimental summary, unsigned: inferred), 73rd (PA1B-S021, pp. 421-431, address of Colonel William Moore,
the regiment's officer, quoting Bates' history: documented for Moore's own statements, inferred for the Bates quotations), 74th
(PA1B-S022, address of Colonel A. von Hartung: no narrative of the regiment's movements at Gettysburg is printed; no claim) and 75th
(PA1B-S023, pp. 434-439, ACCOUNT ... BY FIRST SERGEANT H. NACHTIGALL: a regimental non-commissioned officer's account printed as the
regiment's own: documented). Full sections read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

# 27th Pennsylvania
S = 'PA1B-S004'; U = 'us-11c-2d-coster-27pa'
SUM = "the commission's regimental summary (unsigned) printed under the dedication heading"
R = 'Unsigned commission summary (not a regimental officer): tier inferred.'
add(U, 'arrival_road', 'about noon (July 1)', 'Gettysburg (Cemetery Hill)', 'The 27th Pennsylvania under Lieutenant-Colonel Cantador arrived at Gettysburg July 1 about noon and was at once ordered to advance from Cemetery Hill to north of the town to support the First Corps.',
    'PA1B', S, "arrived at Gettysburg, July 1, 1S63, about noon", 'inferred', author=SUM, t_iso='1863-07-01T12:00', date='1863-07-01', approx=True, reasoning=R, ocr_uncertain=True, conflicts=['POS-A-11B-002', 'POS-E-US-11C-2D-COSTER-154NY-003'],
    note='OCR "1S63" = 1863. Hour conflict within the brigade: 27th PA "about noon"; Steinwehr (OR) about 2 o\'clock for the division; 154th NY sketch about 4 p. m. All carried. Road not named.')
add(U, 'movement', '(after about noon, July 1)', 'from Cemetery Hill to north of the town', 'The regiment advanced from Cemetery Hill to north of the town to support the First Corps, became engaged as soon as the line was formed, and, greatly outnumbered, fell back to Cemetery Hill.',
    'PA1B', S, "ordered to advance from Cemetery Hill to north of the town", 'inferred', author=SUM, date='1863-07-01', reasoning=R)
add(U, 'engagement', '(evening, July 2)', 'East Cemetery Hill, the batteries', 'July 2: when the batteries on East Cemetery Hill were attacked the regiment took a prominent part in repelling the charge.',
    'PA1B', S, "the batteries on East Cemetery Hill were at- tacked by the enemy", 'inferred', author=SUM, date='1863-07-02', reasoning=R, conflicts=['POS-A-EXT-010'])
add(U, 'position', 'July 3d; until about 3 p. m.', 'Cemetery Hill', 'July 3 the regiment held its position on Cemetery Hill until ordered to support troops in distress about 3 p. m.; it was one of the first battalions to enter Gettysburg on July 4.',
    'PA1B', S, "July 3d the regiment held the position on Cemetery Hill until ordered to support", 'inferred', author=SUM, t_iso='1863-07-03T15:00', date='1863-07-03', approx=True, reasoning=R,
    extra_quote="It was one of the first battalions to enter Gettysburg, July 4, 1863")

# 73rd Pennsylvania
S = 'PA1B-S021'; U = 'us-11c-2d-coster-73pa'
MO = 'Colonel William Moore (73rd Pennsylvania; dedication address)'
BA = "Bates' History of Pennsylvania Volunteers, as quoted in Colonel Moore's address"
add(U, 'arrival_road', 'shortly after noon (July 1)', 'the junction of the Emmitsburg and Taneytown roads', 'The 73rd Pennsylvania (Coster\'s brigade) left Emmitsburg on the morning of July 1 and arrived at the junction of the Emmitsburg and Taneytown roads shortly after noon; the First Corps, which preceded the Eleventh on the road, had marched to the left beyond Seminary Ridge.',
    'PA1B', S, "arriving at the junction of the Emmitsburg and Taney town roads shortly after noon", 'documented', author=MO, t_iso='1863-07-01T12:00', date='1863-07-01', approx=True, road='the Emmitsburg road (the corps followed the First Corps "on the road"); halt at the junction with the Taneytown road', gaz='GZ-041',
    extra_quote="The First Corps, which preceeded the Eleventh on the road", conflicts=['POS-A-11B-002'],
    note='Road of approach: the regiment arrived at the Emmitsburg-Taneytown junction (south of Cemetery Hill), which places the march on the Emmitsburg road; Moore says the First Corps preceded the Eleventh "on the road". OCR "Taney town". Hour: shortly after noon versus Steinwehr about 2 o\'clock.')
add(U, 'position', '(afternoon, July 1)', 'deployed across the Emmitsburg and Baltimore roads, facing north, below Cemetery Hill', "When the corps was ordered to retire to the south side of the town and Steinwehr's batteries opened, the 73rd was deployed across the Emmitsburg and Baltimore roads facing north; Bates: it charged through the orchard just below the cemetery, checking the pursuit, and occupied the houses on either side of the Baltimore pike.",
    'PA1B', S, "deployed across the Emmitsburg and Baltimore roads, facing north", 'documented', author=MO, date='1863-07-01', gaz='GZ-039',
    extra_quote="occupying the houses on either side of the Baltimore pike", note='A column of the enemy was seen approaching on the Hanover road (Moore) at the time of the deployment. Bates quotation: inferred layer within a documented address.')
add(U, 'movement', 'Late in the evening (July 1)', 'a reconnaissance into the town: through the gardens and alleys east of Baltimore street, up Baltimore street, left of Baltimore street through the wheatfield; reserve at the (later) Battlefield Hotel', 'Late in the evening of July 1, at a general officer\'s request for a Pennsylvania regiment, the 73rd reconnoitred into the town by companies (F and D through the gardens and alleys east of Baltimore street, E and H up Baltimore street, B, C and K left of Baltimore street through the wheatfield, G and I in reserve at what is now the Battlefield Hotel), then retired to its former position.',
    'PA1B', S, "F and D through the gardens and alleys east of Baltimore street", 'documented', author=MO, date='1863-07-01', road='Baltimore street')
add(U, 'position', 'On the morning of July 2; until near dusk', 'the old cemetery, as a support to the batteries on the hill', 'July 2 the regiment was posted in the old cemetery supporting the batteries; near dusk, when the Louisiana Tigers charged the batteries on East Cemetery Hill and were among Wiedrich\'s guns advancing on Ricketts\', the 73rd with the 27th Pennsylvania rushed to the rescue and held the ground until reinforcements arrived.',
    'PA1B', S, "the regiment was posted in the old cemetery as a support to the batteries on the hill", 'documented', author=MO, date='1863-07-02',
    extra_quote="with the Twenty-seventh Penn- sylvania Regiment rushed to the rescue", conflicts=['POS-A-11B-009', 'POS-A-EXT-010'])
add('us-11c-2d-coster-27pa', 'engagement', 'near dusk (July 2)', "East Cemetery Hill, Wiedrich's and Ricketts' batteries", "The 27th Pennsylvania rushed with the 73rd to the rescue of Wiedrich's and Ricketts' batteries near dusk July 2 (Moore).",
    'PA1B', S, "with the Twenty-seventh Penn- sylvania Regiment rushed to the rescue", 'inferred', author=MO, date='1863-07-02', reasoning='Stated by the officer of a sister regiment.')
add(U, 'night_position', 'after the repulse (night of July 2) until the morning of the 3d', 'in support of several pieces of artillery placed at the head of Baltimore street near the cemetery', 'After the repulse a new line was formed and several guns were placed at the head of Baltimore street near the cemetery to command the approaches from the town; the 73rd supported them until the morning of July 3, when it was sent back to the old cemetery.',
    'PA1B', S, "several pieces of artillery were placed at the head of Baltimore street near the cemetery", 'documented', author=MO, date='1863-07-02', road='Baltimore street')
add(U, 'movement', '(afternoon, July 3, during the final charge)', "the Taneytown road, close to Ziegler's Grove", "Bates: when Pickett's and Pettigrew's charge was made the 73rd was moved to the Taneytown road close to Ziegler's Grove, where it remained until the day's fighting ended.",
    'PA1B', S, "the Seventy-third was moved to the Taneytown road, close to Ziegler’s Grove", 'inferred', author=BA, date='1863-07-03', gaz='GZ-042', road='Taneytown road', reasoning="A quotation of Bates' history inside the address, not Moore's own statement: tier inferred.")
add(U, 'movement', 'On the morning of the 4th; until nine o’clock', 'into the town, deployed as skirmishers along the streets on the west side as far as the Chambersburg road; prisoners taken to the square', 'On the morning of July 4 the regiment was ordered into the town and deployed as skirmishers along the streets on the west side until it reached the Chambersburg road, where a body of the enemy surrendered when cavalry appeared in their rear; the regiment was busy until nine o\'clock, when the enemy fell back.',
    'PA1B', S, "deployed as skirmishers along the streets on the west side of the town", 'documented', author=MO, date='1863-07-04', t_iso='1863-07-04T09:00', gaz='GZ-040', road='the Chambersburg road')

# 75th Pennsylvania
S = 'PA1B-S023'; U = 'us-11c-3d-krzyzanowski-75pa'
NA = 'First Sergeant H. Nachtigall (75th Pennsylvania), "Account of the part taken by the Seventy-fifth Regiment" printed in the section'
add(U, 'departure', 'early on the morning of July 1', 'the bivouac at Emmitsburg, Maryland', 'The 75th Pennsylvania (Krzyzanowski\'s brigade), having bivouacked at Emmitsburg, broke camp early on the morning of July 1 with orders to march to Gettysburg.',
    'PA1B', S, "having bivouacked at Emmitsburg, Maryland, broke camp early on the morning of July 1", 'documented', author=NA, date='1863-07-01')
add(U, 'march', '(forenoon, July 1)', 'within five miles of Gettysburg', 'Within five miles of Gettysburg the regiment received orders to advance at the double-quick, the First Corps having engaged the enemy.',
    'PA1B', S, "Having arrived within five miles of that town, further orders were received to advance at double-quick", 'documented', author=NA, date='1863-07-01', note='Road not named.')
add(U, 'arrival_road', 'about half- past one o’clock (July 1)', 'through the town, from its northern extremity north-easterly near the county almshouse to the west side of the Carlisle road, left wing on the right of the 82nd Ohio', 'On reaching Gettysburg the regiment marched through the town and from its northern extremity proceeded north-easterly near the county almshouse to the west side of the Carlisle road, taking position with its left wing on the right of the 82nd Ohio about half-past one o\'clock; Colonel Mahler fell mortally wounded before the position was reached.',
    'PA1B', S, "to the west side of the Carlisle road, where it took up its position", 'documented', author=NA, t_iso='1863-07-01T13:30', date='1863-07-01', approx=True, gaz='GZ-046', road='through the town, then north-easterly past the county almshouse to the west side of the Carlisle road',
    extra_quote="It was about half- past one o’clock when the regiment reached the aforesaid position", conflicts=['POS-A-11B-052'] if False else [],
    note='OR (Ledig, 75th PA) is in ledger A; the hour there is to be compared by the reader (the A ledger lists arrival hours of 12 to 3.30 p. m. within the brigade).')
add('us-11c-3d-krzyzanowski-82oh', 'position', 'about half-past one o’clock (July 1)', 'west side of the Carlisle road near the county almshouse, on the left of the 75th Pennsylvania', 'The 82nd Ohio stood on the left of the 75th Pennsylvania, west of the Carlisle road near the county almshouse, about half-past one (Nachtigall, 75th PA).',
    'PA1B', S, "its left wing leaning on the right of the Eighty-second Ohio Regiment", 'inferred', author=NA, date='1863-07-01', gaz='GZ-046', reasoning='Stated in the 75th Pennsylvania account about a sister regiment.')
add(U, 'engagement', 'for several hours (afternoon, July 1)', 'west side of the Carlisle road near the almshouse', 'The regiment was severely pressed for several hours by outnumbering forces from the north and west and by several well-posted batteries until the order to retreat was given; to reach safety garden fences had to be torn down, all roads and avenues being in the enemy\'s possession.',
    'PA1B', S, "garden fences had to be torn down, since all the roads and avenues were already", 'documented', author=NA, date='1863-07-01')
add(U, 'position', '(evening of July 1) where it remained during the course of the battle', 'the plateau of Cemetery Hill, the northern extremity of the ridge', 'After passing through the town the regiment was assigned its new position on the plateau of Cemetery Hill, the northern extremity of the ridge, where it remained during the course of the battle.',
    'PA1B', S, "assigned its new position upon the plateau of Cemetery Hill", 'documented', author=NA, date='1863-07-01')
print('done 11c_g')
