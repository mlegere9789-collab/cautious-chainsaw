"""Close-out row data of shard tl-03 (rows_a). build.py re-matches every quote verbatim in the local source text and refuses the run if one is not found."""
from rowlib import *

ROWS = []

R007 = 'OR27-1-R007'; R336 = 'OR27-1-R336'; R340 = 'OR27-1-R340'; R359 = 'OR27-1-R359'; R361 = 'OR27-1-R361'; R367 = 'OR27-1-R367'; R344 = 'OR27-1-R344'; R352 = 'OR27-1-R352'
R071 = 'OR27-1-R071'; R029 = 'OR27-1-R029'; R055 = 'OR27-1-R055'; R057 = 'OR27-1-R057'; R043 = 'OR27-1-R043'; R052 = 'OR27-1-R052'; R032 = 'OR27-1-R032'
R531 = 'OR27-2-R531'; R549 = 'OR27-2-R549'; R534 = 'OR27-2-R534'; R243 = 'OR27-1-R243'; R514 = 'OR27-2-R514'; R076 = 'OR27-1-R076'
LOGNOTE = 'every search is logged with pattern, scope and hit counts per source in horde/tl-03/closeout/search_log.jsonl'
LIB182 = 'the 182 local library texts (acquired_2.json: 99 texts and the 9 earlier state volumes; acquired_3.json: 73 National Park Service texts; Pennsylvania at Gettysburg vol.1), regex search on whitespace-normalised text'

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-116
ROWS.append(dict(
    id='T1-116', verdict='corrected',
    limits={},
    claim=claim('Jul 1, the Cavalry Corps outside Buford\'s division: Kilpatrick\'s division marches from Hanover by Abbottstown to Berlin to intercept Stuart and fails; Merritt\'s Reserve Brigade is near Mechanicstown on picket; Gregg\'s division is at Hanover Junction and Manchester; the Corps headquarters is at Taneytown',
                'Cavalry Corps (Maj. Gen. A. Pleasonton): Third Division (Brig. Gen. J. Kilpatrick), Reserve Brigade (Brig. Gen. W. Merritt), Second Division (Brig. Gen. D. McM. Gregg)',
                'Hanover - Abbottstown - Berlin, Pa. (Kilpatrick); near Mechanicstown, Md. (Merritt); Taneytown, Md. (corps headquarters); Hanover Junction and Manchester (Gregg)',
                'Jul 1 (day; no hour is given for the marches)',
                'Kilpatrick OR27-1-R359 p.992; Pleasonton OR27-1-R336 p.915; Itinerary OR27-1-R007 pp.144-145; Capehart OR27-1-R367 p.1018; Merritt OR27-1-R340 p.943; Cavalry Corps dispatches OR27-3-D0988 pp.469-471',
                'The seed row says the positions of Kilpatrick and Merritt on Jul 1 were not found. The Official Records give them (no hour): Kilpatrick\'s division marched on Jul 1 from Hanover by Abbottstown to Berlin to intercept Stuart and failed (a detachment under Lt. Col. A. J. Alexander pursued Stuart to Rossville; the 1st West Virginia Cavalry went 10 miles beyond Berlin and moved back the same night); '
                'Merritt\'s Reserve Brigade was at Mechanicstown picketing the mountain roads until it marched to Emmitsburg on Jul 2; the Cavalry Corps headquarters was at Taneytown (dispatches of Jul 1 are dated there); Gregg\'s Second Division marched from Manchester to Hanover Junction, McIntosh\'s and J. I. Gregg\'s brigades going on to Hanover and Huey\'s returning to Manchester. '
                'NOT documented: any hour of these marches, where Pleasonton himself was, the road of Merritt\'s pickets. One list in Custer\'s report puts the engagement at Hunterstown on Jul 1 (Battery M), against Jul 2 at sundown in Kilpatrick\'s own summary: carried as two scenarios.',
                'documented', '1863-07-01T00:00', '1863-07-01T23:59', marking='positions by day: documented; hours: gap; Hunterstown date: two scenarios, no default'),
    subs=[
        ('Kilpatrick\'s division marched on Jul 1 to Berlin by Abbottstown to intercept Stuart, but failed', 'documented', 'supported', ['k_div', 'p_div', 'it_k']),
        ('A detachment under Lt. Col. A. J. Alexander (chief of staff) pursued Stuart to Rossville (Pleasonton spells it Rosstown)', 'documented', 'supported', ['k_div2', 'p_div']),
        ('The 1st West Virginia Cavalry of Kilpatrick\'s First Brigade marched to Abbottstown, then to Berlin and a point 10 miles beyond, and moved back on the night of the same day without finding the enemy', 'documented', 'supported', ['cap']),
        ('Merritt\'s Reserve Brigade lay near Mechanicstown, Md. (picketing, scouting and patrolling the mountain roads) and marched from Mechanicstown to Emmitsburg on Jul 2, so it was there at the end of Jul 1', 'documented', 'supported', ['m_camp', 'm_pick', 'm_2d', 'it_m']),
        ('The Cavalry Corps headquarters was at Taneytown on Jul 1 (orders to Buford, Kilpatrick, Gregg and Merritt dated there; no hour printed)', 'documented', 'supported', ['tt_k', 'tt_m']),
        ('Gregg\'s Second Division: headquarters at Hanover Junction on Jul 1; at 11.55 a.m. the Corps ordered the forces drawn in from Hanover Junction to Manchester; McIntosh\'s and J. I. Gregg\'s brigades went on to Hanover, Huey\'s returned to Manchester', 'documented', 'supported', ['g_hj', 'g_1155', 'it_g', 'g_huey']),
        ('Pleasonton\'s own position on Jul 1 (the person, as against the headquarters at Taneytown)', 'open gap', 'unsupported', []),
        ('The hour of Kilpatrick\'s march, of Alexander\'s pursuit and of Merritt\'s position', 'open gap', 'unsupported', []),
    ],
    cites={
        'k_div': OR('July 1, the division marched to Berlin, via Abbottstown, to intercept Stuart, but failed', R359, '992'),
        'k_div2': OR('A detachment under Lieut. Col. A. J. Alexander pursued Stuart to Rossville', R359, '992'),
        'p_div': OR('On July 1, they were pursued as far as Berlin, by the way of Abbottstown, a detachment under Lieutenant-Colonel Alexander, chief of staff, proceeding as far as Rosstown', R336, '915'),
        'it_k': OR('Kilpatrick\'s cavalry division moved from Hanover, via Abbottsville, to Berlin', R007, '145'),
        'cap': OR('thence to Berlin and a point 10 miles beyond, and moved back on the night of the same day, not finding any of the enemy', R367, '1018'),
        'm_camp': OR('and encamped near Mechanicstown, Md.', R340, '943'),
        'm_pick': OR('picketing, scouting, and patrolling the roads through the mountains', R340, '943'),
        'm_2d': OR('On the 2d instant, we marched to Emmitsburg', R340, '943'),
        'it_m': OR('Merritt\'s reserve brigade from Mechanicstown to Emmitsburg', R007, '145', supports='the Itinerary entry of Jul 2'),
        'tt_k': OR('Headquarters Cavalry Corps, Taneytown, Md., July 1, 1863. General Kilpatrick', None, '471', note='the index assigns this dispatch text to the record OR27-3-D0988 (the dispatches of Jul 1 of the Cavalry Corps run together in the OCR); the heading is the dispatch\'s own'),
        'tt_m': OR('fall back after the infantry have left Emmitsburg', None, '471'),
        'g_hj': OR('Headquarters Second Division, Cavalry Corps, Hanover Junction, July 1, 1863', None, '469'),
        'g_1155': OR('draw in your forces from Hanover Junction to Manchester', None, '470', supports='dispatch of the Cavalry Corps dated Jul 1, 11.55 a. m.'),
        'it_g': OR('Mcintosh\'s and J. I. Gregg\'s brigades proceeded to Hanover, while Huey\'s brigade returned to Manchester', R007, '145'),
        'g_huey': OR('was detached at Hanover Junction on July 1, and did not rejoin until the 9th', R344, '958'),
        'huey_jun30': OR('we arrived at Manchester at 11 p. m.', R352, '970'),
        'bat_jul1': OR('July 1. — Was engaged with the enemy at Hunterstown, silencing his battery', R361, '1000'),
        'k_hunter': OR('Was attacked by Stuart, Hampton, and Lee at sundown near Hunterstown', R359, '992'),
        'cap_hunter': OR('July 2, we marched from Abbottstown to Oxford; thence to Himterstown', R367, '1018', note='the OCR prints Himterstown for Hunterstown'),
    },
    scenarios=[
        sc('A', 'Engagement at Hunterstown on Jul 1 (Battery M, 2nd U.S. Artillery list in Custer\'s report)', 'Custer OR27-1-R361 p.1000 (a list headed July 1)', 'documented', ['bat_jul1']),
        sc('B', 'Engagement at Hunterstown on Jul 2 at sundown', 'Kilpatrick OR27-1-R359 p.992; Capehart OR27-1-R367 p.1018 (marched to Hunterstown on Jul 2)', 'documented', ['k_hunter', 'cap_hunter']),
        sc('C', 'Huey\'s brigade left Hanover Junction on Jun 30 and reached Manchester at 11 p.m.', 'Huey OR27-1-R352 p.970', 'documented', ['huey_jun30']),
        sc('D', 'Huey\'s brigade was detached at Hanover Junction on Jul 1 and returned to Manchester', 'Gregg OR27-1-R344 p.958; Itinerary OR27-1-R007 p.145', 'documented', ['g_huey', 'it_g']),
    ],
    default=None,
    remains=['hours of Kilpatrick\'s march and of Alexander\'s pursuit to Rossville', 'Merritt\'s exact bivouac near Mechanicstown and its hour', 'where Pleasonton himself was on Jul 1 (only his headquarters at Taneytown is dated)', 'which date is right for the Hunterstown fight listed under Battery M (Jul 1 or Jul 2)'],
    searched=['OR vol.27 pts 1-3 regex Abbott\'?s?town|Abbottsville|Rossville|Rosstown (pt.1 10 hits, pt.3 2 hits): Kilpatrick R359 p.992, Pleasonton R336 p.915, Itinerary R007 p.145, Capehart R367 p.1018, Custer R361 p.1000, Buford R337 p.923 (Jun 30)',
              'Pleasonton R336 pp.914-915 read; Merritt R340 pp.943-944 read in full; Kilpatrick R359 read (the Jun 30 dispatches, the Jul 5 dispatch and the summary p.992); Gregg R344 p.958, Huey R352 p.970, Itinerary R007 pp.144-146 read; the Cavalry Corps dispatches of Jul 1 in OR27-3-D0986 to D0989 (06:30, 08:30, 11:55, 13:30 and the Taneytown orders) read',
              LIB182 + ' regex Abbott\'?s?-?town|Mechanicstown|Rossville|Rosstown: hits in Battles and Leaders, Alexander, Longstreet, Meade L&L, Pennsylvania at Gettysburg, SHSP and others; none gives an hour for Kilpatrick or Merritt on Jul 1 (the hits are the Jun 30 fight at Hanover and later dates)',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial, open gap kept): the Itinerary line is confirmed at p.145; applied: the Kilpatrick, Pleasonton, Capehart and Merritt reports and the Cavalry Corps dispatches now give the positions the seed called not found, so the row is corrected from open gap to documented positions with hours as marked gaps.',
    register=reg('Hours of the Jul 1 cavalry moves outside Buford\'s division and the date of the Hunterstown fight in the Battery M list', 'No report read gives an hour for Kilpatrick\'s march, for the detachment to Rossville or for Merritt; Custer\'s battery list heads the Hunterstown fight July 1 while Kilpatrick and Capehart place it on Jul 2.',
                 'Day-level positions (documented); no hour drawn; the Hunterstown date as two selectable scenarios', 'documented', competing='Hunterstown on Jul 1 (Battery M list) vs Jul 2 at sundown (Kilpatrick, Capehart)', impact='the three formations are placed by day without an hour; the Jul 2 fight is not moved to Jul 1', ask='none: both dates stay selectable, no default', rids='R11, R16'),
    related=['tl-03-EG-07']))
