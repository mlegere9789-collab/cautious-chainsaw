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

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-117
ROWS.append(dict(
    id='T1-117', verdict='corrected',
    limits={'start': 'the earliest hour given for the arrival (Wainwright, about 10.30 a. m., and McFarland of the 151st Pennsylvania, 10.30 a. m.)',
            'end': 'the latest hour given for the arrival (Wister, about 12 m., and Huidekoper, about noon, both of the Second Brigade of the Third Division)'},
    claim=claim('The rest of the First Corps comes up west of the seminary: Wainwright\'s artillery, Robinson\'s Second Division (in reserve at the seminary) and Rowley\'s Third Division, with Stone\'s brigade on the right of the wood and Biddle\'s on the left and rear of the Iron Brigade toward the Millerstown road',
                'First Corps: Artillery Brigade (Col. C. S. Wainwright), Second Division (Brig. Gen. J. C. Robinson), Third Division (Brig. Gen. T. A. Rowley: Col. R. Stone\'s and Col. C. Biddle\'s brigades), under Maj. Gen. A. Doubleday',
                'West and south-west of the Lutheran Theological Seminary, Gettysburg (Stone\'s brigade between Cutler\'s and Meredith\'s brigades with its right on the Chambersburg road; Biddle\'s on the extreme left a third of a mile in front of the seminary, facing west)',
                'Jul 1, about 10:30 to about noon (the hours differ by regiment)',
                'Wainwright OR27-1-R071 p.354; Rowley OR27-1-R055 p.312; Biddle R056 p.315; McFarland R060 p.327; Stone R061 p.329; Dana R063 p.335; Wister R062 p.333; Huidekoper R067 p.346; Doubleday R029 p.247; Robinson R043 p.289; Baxter R052 p.307',
                'Wainwright joined Doubleday at about 10.30 a. m. and moved the three batteries with him across the fields toward the seminary. The Third Division reached the field toward 11 (Rowley): Biddle\'s brigade about 11 a. m., formed on the extreme left a third of a mile in front of the seminary facing west (the 151st Pennsylvania, 10.30 a. m.); Stone posted his brigade at 11 a. m. between the two brigades of Wadsworth\'s division, right on the Chambersburg road and left nearly to the wood held by Meredith; the 150th Pennsylvania gives about noon. '
                'Robinson\'s division was placed in reserve near the seminary and the First Brigade (Paul) set to intrench the ridge; Baxter reached the front at 11 a. m. Doubleday directed Robinson to the seminary, sent Stone to the open space on the right of the wood and Biddle to the left and rear of the Iron Brigade toward the Millerstown road, Rowley having charge of that part of the line. '
                'CORRECTED: Rowley did not take command of the division on Jul 1: his report says the command had devolved on him the day previous (Jun 30). NOT documented: the hour at which each battery of the Artillery Brigade came up.',
                'documented', '1863-07-01T10:30', '1863-07-01T12:00', marking='arrival hours by regiment: documented; the Jul 1 change of division command: contradicted (Jun 30)'),
    subs=[
        ('Wainwright\'s Artillery Brigade: about 10.30 a. m. Wainwright joined Doubleday and by his order moved the three batteries remaining with him across the fields toward the seminary; the Third Division with Cooper\'s battery arrived soon afterward', 'documented', 'supported', ['w1030', 'w_third']),
        ('Third Division, First (Biddle\'s) Brigade: about 11 a. m. within a mile of the town, then formed on the extreme left, a third of a mile in front of the seminary and facing west; the 151st Pennsylvania of that brigade formed at 10.30 a. m.; the version of Biddle\'s report dated Jul 2 and printed in Pennsylvania at Gettysburg has the brigade reaching the front about 11 a. m.', 'documented', 'supported', ['b11', 'b_left', 'mcf1030', 'b11_pa']),
        ('Third Division, Second (Stone\'s) Brigade: posted at 11 a. m. between the two brigades of Wadsworth\'s division, right on the Chambersburg road and left nearly to the wood held by Meredith (Dana: into position about 11 a. m.)', 'documented', 'supported', ['s11', 'dana11']),
        ('Rowley: toward 11 o\'clock the two portions of the Third Division reached the field from the south and took positions on the right and left of the seminary, half a mile or more west of it', 'documented', 'supported', ['row11']),
        ('Doubleday\'s dispositions: Robinson in reserve at the seminary with slight intrenchments; Stone to the open space on the right of the wood between Cutler and Meredith; Biddle on the left and rear of the Iron Brigade toward the Millerstown road; Rowley in charge of that part of the line', 'documented', 'supported', ['d_rob', 'd_stone', 'd_biddle']),
        ('Second Division (Robinson): placed in reserve near the seminary; Baxter\'s brigade reached the front at 11 a. m.; the First (Paul\'s) Brigade, massed near the railroad embankment at about 11 a. m., was set to intrench the ridge of the seminary', 'documented', 'supported', ['rob_res', 'rob_intr', 'bax11', 'coul11']),
        ('Rowley takes command of the Third Division on Jul 1', 'documented', 'contradicted', ['row_cmd'], 'the command had devolved on Rowley the day previous, Jun 30 (Doubleday p.244 has Reynolds direct him on Jun 30 to take command of the First Corps)'),
        ('Doubleday commands the corps from the death of Reynolds and makes the dispositions', 'documented', 'supported', ['d_cmd', 'd_burden']),
        ('The arrival hour of each battery of the Artillery Brigade (Cooper\'s, Stewart\'s, Breck\'s, Whittier\'s)', 'open gap', 'unsupported', []),
    ],
    cites={
        'w1030': OR('at about 10.30 a. m. I immediately joined General Doubleday, and by his order moved the three batteries remaining with me across the fields toward the seminary or college', R071, '354'),
        'w_third': OR('Soon afterward the Third Division, with Cooper\'s battery, arrived and took position along the open part of the crest', R071, '355'),
        'b11': OR('The route taken by the brigade brought us, about 11 a. m., to within 1 mile of the town, in a westerly direction from it', 'OR27-1-R056', '315'),
        'b_left': OR('formed in line as soon as possible on the extreme left, in a field one-third of a mile in front of the seminary and facing west', 'OR27-1-R056', '315'),
        'b11_pa': L('PA-GB-1914-v2', 'The brigade reached the front about 11 a. m.', note='Biddle\'s report as printed in Pennsylvania at Gettysburg (the passage introduces it as dated July 2)'),
        'mcf1030': OR('where it formed in line of battle, at 10.30 a. m., on the left flank of the First Corps', 'OR27-1-R060', '327'),
        's11': OR('at 11 o\'clock a. m., July 1, I posted my brigade', 'OR27-1-R061', '329'),
        'dana11': OR('The brigade went into position at about 11 a. m.', 'OR27-1-R063', '335'),
        'row11': OR('Toward 11 o\'clock these two portions of my division reached the battle-field from the south', R055, '312'),
        'd_rob': OR('I immediately directed General Robinson to station his division in reserve at the seminary, and to throw up some slight intrenchments, to aid me in holding that point in case I should be driven back', R029, '247'),
        'd_stone': OR('I divided Rowley\'s division, sending Stone\'s brigade to the open space on the right of the wood, to close the interval between Cutler and Meredith', R029, '247'),
        'd_biddle': OR('was posted on the left and rear of the Iron Brigade, toward the Millerstown road. General Rowley had charge of this part of the line', R029, '247'),
        'rob_res': OR('was placed, by order of the majorgeneral commanding First Corps, in reserve, near the seminary', R043, '289'),
        'rob_intr': OR('the First Brigade, under Brigadier-General Paul, was set at work to intrench the ridge on which it is situated', R043, '289'),
        'bax11': OR('arriving near the front where the battle was raging at 11 a. m.', R052, '307'),
        'coul11': OR('about 11 a. m., was massed on the west side and near the embankment of the railroad', 'OR27-1-R044', '292'),
        'row_cmd': OR('The command itself had devolved upon me the day previous', R055, '312'),
        'd_cmd': OR('he directed me to take command of the First Corps', R029, '244'),
        'd_burden': OR('The whole burden of the battle was thus suddenly thrown upon me', R029, '245'),
        'wis12': OR('Having first taken position about 12 m.', 'OR27-1-R062', '333'),
        'hui12': OR('and about noon arrived on the battle-field at Gettysburg', 'OR27-1-R067', '346'),
    },
    scenarios=[
        sc('A', 'Stone\'s brigade in position about 11:00', 'Stone OR27-1-R061 p.329 (11 o\'clock a. m.); Dana R063 p.335 (about 11 a. m.); Rowley R055 p.312 (toward 11 o\'clock)', 'documented', ['s11', 'dana11', 'row11']),
        sc('B', 'The 150th Pennsylvania of the same brigade arrives about noon', 'Wister OR27-1-R062 p.333 (took position about 12 m.); Huidekoper R067 p.346 (about noon arrived on the battle-field)', 'documented', ['wis12', 'hui12']),
    ],
    default=None,
    remains=['the arrival hour of each battery of the Artillery Brigade'],
    searched=['OR vol.27 pt.1 reports R029 (Doubleday), R043 (Robinson), R044, R052, R055, R056, R060-R063, R067, R071 read for hours of arrival and for the positions; regex scan of reports R044-R068 for hour statements (about 11 a. m. Biddle, Dana, Coulter, Baxter; 10.30 a. m. McFarland; about 12 m. Wister; about noon Huidekoper); R055 (Rowley) read in full: the command devolved on Jun 30',
              LIB182 + ' regex (Rowley|Biddle|Stone|Robinson|Wainwright) near 10.30 / 11 o\'clock / about 11 / toward 11, restricted to the ten state and battle volumes: one hit, Biddle\'s report as printed in Pennsylvania at Gettysburg vol.2 (the brigade reached the front about 11 a. m.)',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): Doubleday p.247 supports the positions; "Rowley takes command" is not a change of command in the passage and no hour in Doubleday. Applied: the arrival hours are now cited from Wainwright, Rowley, the brigade and regiment reports (10:30 to noon); Rowley\'s own report (R055 p.312) shows the change of division command was Jun 30, so that sub-claim is marked contradicted.',
    register=reg('Arrival minute of the batteries of the First Corps Artillery Brigade on Jul 1', 'Wainwright gives one hour (about 10.30 a. m.) for himself and the three batteries with him and none for Cooper\'s, Stewart\'s, Breck\'s and Whittier\'s batteries.',
                 'Brigades and regiments placed at their reported hours (documented); the batteries placed in the same window as their divisions, marked inferred', 'documented', competing='Stone\'s brigade 11:00 (Stone, Dana, Rowley) vs about noon (Wister, Huidekoper)', impact='the batteries appear with their division within the window; the minute is not shown as fact', ask='none: both hours stay selectable', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-118
ROWS.append(dict(
    id='T1-118', verdict='partially_supported',
    limits={'start': 'noon, the hour by which the National Park Service Cultural Landscape Report says Carter\'s guns occupied Oak Hill (secondary; no report of the Official Records gives an hour)',
            'end': '1 p. m., the hour the National Park Service Handbook gives for Rodes\' troops reaching Oak Hill and the hour Doles gives for forming his line (R514 p.581)'},
    claim=claim('Carter\'s artillery battalion (Carter\'s and Fry\'s batteries, then Page\'s and Reese\'s) opens from the high ground in front of Rodes\' line and enfilades the Union line; Page\'s battery suffers heavily from the Union guns across the valley, Carter\'s battery too',
                'Carter\'s Artillery Battalion (Lt. Col. T. H. Carter): Capt. W. P. Carter\'s, Capt. C. W. Fry\'s, Capt. R. C. M. Page\'s and Capt. W. J. Reese\'s batteries, with Rodes\' division',
                'The high ridge (Oak Hill) north-west of Gettysburg in front of Rodes\' line, then the foot of the ridge in rear of Doles\' brigade',
                'Jul 1, about noon to 1 p. m. (no hour in the Official Records; secondary sources by noon and at 1 o\'clock)',
                'Carter OR27-2-R531 pp.602-603; Rodes R506 p.552; Ewell R467 p.444; hour: National Park Service CLR First Day and Handbook 9 (1954)',
                'On reaching the field Carter\'s and Fry\'s batteries were ordered to a high point in front of Rodes\' lines to enfilade the Union lines and batteries; Carter\'s own battery, exposed, had 4 men killed outright and 7 severely wounded (OCR "\'7"); Page\'s battery, ordered to the left, opened on the infantry advancing on O\'Neal, came under the oblique fire of Union artillery in the valley north of the town, and lost 2 killed, 2 mortally wounded, 26 badly wounded and 17 horses. '
                'Rodes says Carter\'s battalion "soon opened fire" as the division moved by the right flank; Ewell that it opened with fine effect on the flank of the Union force engaged with Hill. NOT documented in the Official Records: the hour (12:30 in the seed); the name Oak Hill is the National Park Service\'s (Rodes: "a prominent hill on the ridge"); any loss figure of Fry\'s battery (Carter gives none). The hour is secondary only (by noon / 1 o\'clock).',
                'documented', '1863-07-01T12:00', '1863-07-01T13:00', marking='event and losses: documented (Carter); hour: inferred, secondary sources only; name Oak Hill: National Park Service'),
    subs=[
        ('Carter\'s and Fry\'s batteries were ordered to a high point in front of Rodes\' lines, near the Cashtown turnpike, to enfilade the Union lines and batteries', 'documented', 'supported', ['c_enf']),
        ('Carter\'s own battery, exposed, had 4 men killed outright and 7 more or less severely wounded', 'documented', 'supported', ['c_loss']),
        ('Page\'s battery opened from the foot of the high ridge on the infantry advancing on O\'Neal and lost 2 killed, 2 mortally wounded, 26 more or less badly wounded and 17 horses killed and disabled under the oblique fire of the Union artillery in the valley', 'documented', 'supported', ['p_open', 'p_loss']),
        ('Rodes: Carter\'s battalion was ordered forward and soon opened fire (a prominent hill on the ridge); Ewell: it opened with fine effect on the flank of the force engaged with Hill', 'documented', 'supported', ['r_open', 'e_open', 'r_hill']),
        ('Carter\'s guns occupied Oak Hill by noon (National Park Service, Cultural Landscape Report First Day)', 'inferred', 'supported', ['nps_noon'], 'secondary source without a stated basis; the passage mixes "brigades" and "battalion"'),
        ('Rodes\' troops reached Oak Hill at 1 o\'clock (National Park Service Handbook 9, 1954); Doles formed his line about 1 p. m. (OR)', 'inferred', 'supported', ['nps_1', 'doles1']),
        ('Artillery duel starts at 12:30 (seed hour, secondary "SS")', 'open gap', 'unsupported', []),
        ('Any loss figure of Fry\'s battery (Carter reports none)', 'open gap', 'unsupported', []),
    ],
    cites={
        'c_enf': OR('were ordered to a high point in front of Rodes\' lines, near the Cashtown turnpike, to enfilade the enemy\'s lines and batteries', R531, '602'),
        'c_loss': OR('it suffered much at this point, having 4 men killed outright', R531, '602'),
        'p_open': OR('Captain Page opened from a point at the foot of the high ridge on the infantry advancing on Colonel O\'Neal', R531, '603'),
        'p_loss': OR('His loss here was heavy — 2 men killed, 2 mortally wounded, 26 more or less badly wounded, and 17 horses killed and disabled', R531, '603'),
        'r_open': OR('Carter\'s battalion was ordered forward, and soon opened fire upon the enemy', 'OR27-2-R506', '552'),
        'r_hill': OR('a prominent hill on the ridge', 'OR27-2-R506', '552'),
        'e_open': OR('and Carter\'s artillery battalion, of Rodes\' division, had opened with fine', 'OR27-2-R467', '444'),
        'nps_noon': L('NPS-CLR-1STDAY', 'talion who occupied Oak Hill by noon', reading='the text layer interleaves two columns: "... four Confederate brigades of Carter\'s Artillery Bat-" continues "talion who occupied Oak Hill by noon"'),
        'nps_1': L('NPS-HB9-1954', 'When Rodes\' Confederate troops reached Oak Hill at 1 o\'clock'),
        'doles1': OR('This brigade was formed into line of battle about 1 p. m. July 1', 'OR27-2-R514', '581'),
    },
    scenarios=[
        sc('A', 'Carter\'s guns on Oak Hill by noon', 'National Park Service CLR First Day (secondary)', 'inferred', ['nps_noon']),
        sc('B', 'Rodes\' troops reach Oak Hill at 1 o\'clock; Doles forms about 1 p. m.', 'National Park Service Handbook 9 (1954, secondary); Doles OR27-2-R514 p.581 (the line of battle, a Confederate clock)', 'inferred', ['nps_1', 'doles1']),
        sc('C', 'About 12:30 (the seed value)', 'seed note "SS" (secondary site; no text read supports it)', 'open gap', []),
    ],
    default=None,
    remains=['the hour at which Carter\'s battalion opened (no report of the Official Records gives one)', 'any loss figure of Fry\'s battery'],
    searched=['OR27-2-R531 (Carter) read in full; Rodes R506 pp.552-554 read; Ewell R467 pp.443-445 read; Doles R514 p.581; Page\'s own report not in the volume (no report of Page in the index)',
              'OR vol.27 pts 1-3 and ' + LIB182 + ' regex (Carter|Page|Rodes) ... (Oak Hill|artillery) ... hour: hits only in the National Park Service texts (CLR First Day: occupied Oak Hill by noon; Handbook 9: reached Oak Hill at 1 o\'clock) and unrelated text',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): casualty figures match Carter p.602-603; the 12:30 hour and "Oak Hill" and Fry\'s enfilade are not in the passage. Applied: the hour is moved to a window noon-1 p. m. with secondary basis (National Park Service), the figures are cited verbatim, and the Fry\'s battery figures are marked unsupported.',
    register=reg('Hour at which Carter\'s artillery battalion opened on Oak Hill, Jul 1', 'Carter, Rodes and Ewell give no hour for the opening of Carter\'s guns; only National Park Service texts give noon and 1 o\'clock and they cite no source.',
                 'Event and losses as documented; the opening placed in the window noon to 1 p. m., marked inferred; no minute drawn as fact', 'inferred', competing='noon (NPS CLR) / 12:30 (seed) / 1 o\'clock (NPS Handbook 9, Doles)', impact='the opening of the Confederate guns on Oak Hill is shown inside a one-hour window with the tier glyph', ask='none: all three values stay selectable', rids='R11, R04'),
    related=[]))
