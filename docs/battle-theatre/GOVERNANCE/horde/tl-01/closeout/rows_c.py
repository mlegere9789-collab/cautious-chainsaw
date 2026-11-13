"""Close-out row data, T1-042 .. T1-057."""
from rowlib import *

R007 = 'OR27-1-R007'; R293 = 'OR27-1-R293'; R294 = 'OR27-1-R294'; R549 = 'OR27-2-R549'; R534 = 'OR27-2-R534'; R565 = 'OR27-2-R565'; R359 = 'OR27-1-R359'; R337 = 'OR27-1-R337'
R362 = 'OR27-1-R362'; R363 = 'OR27-1-R363'; R361 = 'OR27-1-R361'; R470 = 'OR27-2-R470'; R467 = 'OR27-2-R467'; R506 = 'OR27-2-R506'; R518 = 'OR27-2-R518'; R272 = 'OR27-1-R272'; R243 = 'OR27-1-R243'

ROWS = []

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-042
ROWS.append(dict(
    id='T1-042', verdict='corrected',
    claim=claim('Skirmish of Union cavalry with Confederate cavalry at Littlestown half an hour before the XII Corps arrives at about noon; Candy\'s brigade deploys skirmishers; the enemy retires toward Hanover',
                'Union cavalry (Kilpatrick\'s division) against Confederate cavalry (unit not named); XII Corps, 2nd Division (Geary), Candy\'s 1st Brigade; 123rd New York (1st Division) hurried through the town', 'Littlestown, Pa., and the Hanover road (woods on the right of the town toward Hanover)',
                'Jun 30 about 11:30 (skirmish half an hour before the division encamped near the town at noon)', 'Geary OR27-1-R293 p.825; Candy OR27-1-R294 p.836; Rogers OR27-1-R279 p.798',
                'The skirmish at Littlestown was fought by the Union cavalry with that of the rebels about half an hour before the Twelfth Corps\' Second Division reached the town and encamped at noon on Jun 30 (Geary); the enemy retired in the direction of Hanover as the infantry was hurried forward (Geary, Rogers). Candy\'s brigade was ordered to the woods on the right of the town toward Hanover, threw forward skirmishers and picketed there overnight. '
                'The seed time ("before dawn or morning") and the attribution of the skirmish to Candy\'s skirmishers driving off a Stuart detachment are not supported: the Confederate unit is not named in the OR, and the Union action was the cavalry\'s.',
                'documented', '1863-06-30T11:30', '1863-06-30T12:00', marking='skirmish and retreat toward Hanover: documented; Confederate unit and "before dawn": gap'),
    subs=[
        ('Kilpatrick\'s cavalry division moved from Littlestown to Hanover on Jun 30 (Itinerary)', 'documented', 'supported', ['it_kil']),
        ('A half hour before the division reached Littlestown (it encamped near the town at noon) our cavalry had there a skirmish with that of the rebels', 'documented', 'supported', ['geary_skirm', 'geary_noon']),
        ('The command was hastened forward and dispositions made; the enemy retired in the direction of Hanover (123rd New York: the rebels had flown)', 'documented', 'supported', ['geary_retired', 'rogers_double']),
        ('Candy\'s brigade was ordered to the woods on the right of the town toward Hanover; the cavalry skirmishing in front, it threw forward skirmishers and picketed to its front and right', 'documented', 'supported', ['candy_skirm']),
        ('The skirmish was before dawn or in the morning, by Union skirmishers who drove off Stuart\'s detachment (seed)', 'documented', 'contradicted', ['geary_skirm', 'geary_noon', 'candy_skirm']),
        ('The Confederate side was a detachment of Stuart\'s cavalry', 'open gap', 'unsupported', []),
    ],
    cites={
        'it_kil': OR('Kilptatrick\'s cavalry division from Littlestown to Hanover', R007, '144'),
        'geary_skirm': OR('A half hour before reaching this place our cavalry had there a skirmish with that of the rebels', R293, '825'),
        'geary_noon': OR('marched through Taneytown and Littlestown, encamping near the latter place at noon', R293, '825'),
        'geary_retired': OR('The command was hastened forward and dispositions at once made to receive the enemy, who, however, retired m the direction of Hanover', R293, '825'),
        'rogers_double': OR('While approaching Littlestown, our cavalry was attacked and the infantry ordered to be hurried forward', 'OR27-1-R279', '798'),
        'candy_skirm': OR('The cavalry skirmishing with the enemy in the front, I immediately moved with the brigade to the point designated', R294, '836'),
    },
    scenarios=[
        sc('A', 'Infantry skirmish before dawn or in the morning; Candy\'s skirmishers drive Stuart\'s detachment off', 'seed source W-Litt (lead); no text read supports it', 'open gap', []),
        sc('B', 'Cavalry skirmish about 11:30; the enemy retires toward Hanover; Candy deploys skirmishers on arrival', 'Geary OR27-1-R293 p.825; Candy OR27-1-R294 p.836; Rogers OR27-1-R279 p.798', 'documented', ['geary_skirm', 'candy_skirm', 'rogers_double']),
    ],
    remains=['the Confederate unit (the OR says "the rebels" / "the enemy")', 'the seed time "before dawn"'],
    searched=['OR27-1-R293 (Geary) and R294 (Candy) pp.825, 835-836 and R279 (Rogers, 123rd NY) pp.797-798 read; Stuart OR27-2-R565 p.695 (a Confederate force at Union Mills on the night of Jun 29, the enemy cavalry at Littlestown) read',
              'OR vol.27 pts 1-3 regex Littlestown near Stuart or a named Confederate unit on Jun 30: none gives the Confederate unit'],
    recheck='OR-RECHECK: both stored quotes found (p.825, p.836). Shard note applied: "before dawn" and the Candy attribution are replaced by the documented cavalry skirmish about 11:30; Rogers (123rd NY) is a third witness.',
    register=reg('Confederate unit in the Littlestown skirmish of Jun 30', 'The three reports read say "the rebels" and "the enemy"; Stuart\'s report does not mention Littlestown on Jun 30.', 'Cavalry skirmish about 11:30 with a Confederate cavalry party of unnamed unit (documented)', 'documented',
                 competing='seed: Stuart\'s detachment, before dawn', impact='the Confederate unit is not named on the screen', ask='none', rids='R16, R11'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-043
ROWS.append(dict(
    id='T1-043', verdict='partially_supported',
    claim=claim('Pettigrew\'s brigade goes from Cashtown toward Gettysburg on the morning of Jun 30 for army supplies, shoes especially, to return the same day (supply search with 15 wagons)',
                'Pettigrew\'s brigade (Heth\'s division, Hill\'s corps) with 15 wagons', 'Cashtown to the outskirts of Gettysburg on the Chambersburg Pike (8 or 9 miles)', 'Morning of Jun 30 (no hour in the OR; Jacobs\'s hours for a Confederate advance are in row T1-047); returned the same day',
                'Heth OR27-2-R549 p.637 (report dated Sept 13, 1863) and the same report in SHSP vol.6; Heth, SHSP vol.4 (1877); Jacobs 1864 p.21',
                'On the morning of Jun 30 General Heth ordered Brigadier-General Pettigrew to take his brigade to Gettysburg, search the town for army supplies, shoes especially, and return the same day (Heth\'s report of Sept 13, 1863, and his 1877 letter); Jacobs saw a Confederate advance with 15 wagons. '
                'The shoe motive is therefore in the contemporary report and the PDF "reconnaissance without shoe" reading is the alternative; the delegated default (DD-07) shows the supply search with shoes first, the PDF reading selectable. NOT documented: "first light", the strength about 1,800, the order to withdraw if resisted.',
                'documented', '1863-06-30T04:03', '1863-06-30T23:59', marking='supply search with shoes: documented (DD-07 default, PDF reading selectable); first light, 1,800, withdrawal order: gap'),
    subs=[
        ('On the morning of June 30 Heth ordered Pettigrew to take his brigade to Gettysburg, search the town for army supplies (shoes especially), and return the same day', 'documented', 'supported', ['heth_or', 'heth_shsp']),
        ('Heth\'s letter of 1877: hearing that a supply of shoes was to be had at Gettysburg, eight miles from Cashtown, he directed Pettigrew to get them; Pettigrew went near the town on Jun 30 and returned the same evening to Cashtown', 'documented', 'supported', ['heth77', 'heth77b']),
        ('The Confederates brought 15 wagons, probably to rob the town of merchandise and provisions (Jacobs, from Gettysburg)', 'documented', 'supported', ['jac_wagons']),
        ('The "shoe story" first appears in 1877 (seed note) - contradicted: the shoes are in the report of Sept 13, 1863', 'documented', 'contradicted', ['heth_or', 'heth_shsp']),
        ('Departure at first light', 'open gap', 'unsupported', []),
        ('Brigade strength about 1,800', 'open gap', 'unsupported', []),
        ('Ordered to withdraw if resisted', 'open gap', 'unsupported', []),
    ],
    cites={
        'heth_or': OR('On the morning of June .30, I ordered Brigadier-General Pettigrew to take his brigade to Gettysburg, search the town for army supplies (shoes especially), and return the same day', R549, '637'),
        'heth_shsp': L('SHSP-06', 'search the town for army supplies, shoes especially, and return the same day'),
        'heth77': L('SHSP-04', 'Hearing that a supply of shoes was to be obtained in Gettysburg, eight miles distant from Cashtown'),
        'heth77b': L('SHSP-04', 'returning the same evening to Cashtown'),
        'jac_wagons': L('JACOBS-1864', 'They brought with them 15 wagons, probably with the intention of coming to town and robbing us of such merchandise and provisions'),
    },
    scenarios=[
        sc('A', 'Reconnaissance and supply move without a "shoe" subtitle (PDF correction)', 'PDF plan text (secondary); contradicted by Heth\'s own report of Sept 13, 1863', 'open gap', []),
        sc('B', 'Supply search, shoes especially, to return the same day', 'Heth OR27-2-R549 p.637 and SHSP vol.6; Heth 1877 letter SHSP vol.4', 'documented', ['heth_or', 'heth_shsp', 'heth77']),
    ],
    default=dict(scenario='B', basis='DELEGATED DECISION DD-07 (2026-11-11): shoes motive shown first, PDF correction selectable; reversible by the owner'),
    remains=['"first light" (Heth: "the morning")', 'brigade strength about 1,800', 'an order to withdraw if resisted'],
    searched=['OR27-2-R549 (Heth) read; Heth\'s report as printed in SHSP vol.6 and his 1877 letter in SHSP vol.4 read; OR vol.27 pt.2 regex Pettigrew.{0,200}(1,[0-9]{3}|2,[0-9]{3}): 0 hits; R550 (Jones, commanding Pettigrew\'s brigade) read',
              'Jacobs 1864 p.21 (9.30 a.m. advance with 15 wagons); NPS Edward McPherson Farm Historical Study (NPS-HS-MCPHERSON pp.25-27) read: "first light" there refers to Heth\'s move of Jul 1 and the "fifteen empty wagons" to the Jun 30 return'],
    recheck='OR-RECHECK: stored quote found at p.637. Shard finding applied ("the report is contemporary; first light and 1,800 not in readable OR text"); the clean text of the report in SHSP vol.6 now confirms "shoes especially" and "return the same day", and delegated decision DD-07 is recorded as the default.',
    register=reg('Hour (first light), strength (about 1,800) and withdrawal order of Pettigrew\'s Jun 30 move', 'Heth says "the morning of the 30th"; no text read gives a strength for Pettigrew\'s brigade or a withdrawal order.', 'Supply search with shoes on the morning of Jun 30, return the same day (documented); hour, strength and withdrawal order not shown as fact', 'documented',
                 competing='PDF: reconnaissance without the shoe motive; Heth\'s report: shoes especially (DD-07 default)', impact='the movement is shown as a march of a brigade with 15 wagons toward Gettysburg and back; hour as a window', ask='none (DD-07 recorded)', rids='R04, R11, R10'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-044
ROWS.append(dict(
    id='T1-044', verdict='corrected',
    claim=claim('Hanover opens when Stuart\'s column meets Kilpatrick\'s rear: scenarios (about 10 a.m. / about noon)',
                'Kilpatrick\'s division (Farnsworth\'s brigade; 18th Pennsylvania Cavalry as the rear of the column) against Stuart\'s cavalry (Chambliss\' leading regiment, Hampton, Fitz. Lee)', 'Hanover, Pa. (the main street; the enemy\'s guns on the hills at the right of the town)',
                'Jun 30: about 10 a.m. (Stuart) or about noon (Richmond, Hammond)', 'Stuart OR27-2-R565 p.695; Richmond OR27-1-R362 p.1005; Hammond OR27-1-R363 pp.1007-1008; Kilpatrick OR27-1-R359 pp.986-987',
                'Stuart: about 10 a.m. the head of his column reached Hanover and found a large column of cavalry passing through; Union reports: about noon the advance of the column arrived (Richmond) and the column entered and halted in the main street (Hammond) when the rear, the 18th Pennsylvania, was attacked. '
                'Kilpatrick says five minutes after a dispatch that Stuart was making for Littlestown his rear guard was attacked in Hanover; he names Stuart\'s three brigades. The seed time (before 10:00) is earlier than every value in the OR. Scenarios carried, no default.',
                'documented', '1863-06-30T10:00', '1863-06-30T12:00'),
    subs=[
        ('Stuart: about 10 a.m. the head of the column reached Hanover, found a large column of cavalry passing through, and the enemy\'s demonstration was met by a charge of Chambliss\' leading regiment', 'documented', 'conflict', ['stuart10', 'stuart_chambliss']),
        ('Richmond: the advance of the column arrived about noon without meeting the enemy; as the 18th Pennsylvania, in the rear, entered the town the enemy\'s cavalry made a dash on it', 'documented', 'conflict', ['rich_noon', 'rich_18']),
        ('Hammond (5th New York): about noon the column entered the town and halted in the main street; an attack on ambulances and stragglers in rear of the 18th Pennsylvania broke up the column', 'documented', 'conflict', ['ham_noon', 'ham_rear']),
        ('Kilpatrick: his rear guard was attacked in Hanover and driven in; the enemy was Stuart with three brigades', 'documented', 'supported', ['kil_rear', 'kil_stuart']),
        ('The 18th Pennsylvania rear guard hit Confederate vedettes before 10:00 and so opened the fight (seed): no text read says so; it is earlier than every OR value', 'open gap', 'conflict', []),
    ],
    cites={
        'stuart10': OR('About 10 a. m. the head of the column reached Hanover', R565, '695'),
        'stuart_chambliss': OR('which was promptly met by a gallant charge by Chambliss\' leading regiment', R565, '695'),
        'rich_noon': OR('where the advance of the column arrived about noon of the same day', R362, '1005'),
        'rich_18': OR('As the Eighteenth Pennsylvania, which was in rear of the brigade, was entering the town, the enemy\'s cavalry made a dash upon it', R362, '1005'),
        'ham_noon': OR('About noon, we entered the town of Hanover, and halted in the main street', R363, '1008'),
        'ham_rear': OR('an attack was made upon the ambulances and stragglers in rear of the Eighteenth Pennsylvania', R363, '1008'),
        'kil_rear': OR('my rear guard was attacked in Hanover, driven in, and a vigorous charge was made upon the rear and flanks of my command', R359, '986'),
        'kil_stuart': OR('The enemy was under the command of Stuart, who had with him three brigades', R359, '987'),
    },
    scenarios=[
        sc('A', 'About 10 a.m.', 'Stuart OR27-2-R565 p.695', 'documented', ['stuart10']),
        sc('B', 'About noon', 'Richmond OR27-1-R362 p.1005; Hammond OR27-1-R363 p.1008', 'documented', ['rich_noon', 'ham_noon']),
        sc('C', 'Before 10:00 (the 18th Pennsylvania rear guard hits Confederate vedettes)', 'seed sources CAV-Hanover, W-GC (leads); no text read supports it', 'open gap', []),
    ],
    remains=[], searched=['OR27-2-R565 p.695, OR27-1-R359 pp.985-988, R362 p.1005, R363 pp.1008-1009 read; the 18th Pennsylvania\'s own report not searched for a clock time'],
    recheck='OR-RECHECK: the three stored quotes were found (p.695, p.1005, p.~1008). Shard verdict "ambiguous_conflict" applied; the attacker is Stuart\'s cavalry in both Kilpatrick and Stuart, so the seed note "attribution uncertain" is not an OR conflict.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-045
ROWS.append(dict(
    id='T1-045', verdict='corrected',
    claim=claim('Buford\'s division enters Gettysburg at about 11 a.m. on Jun 30, finds the enemy within half a mile, pushes him back toward Cashtown and sends parties out',
                'Buford\'s 1st Cavalry Division (Gamble\'s and Devin\'s brigades)', 'Gettysburg (Washington Street, then the Chambersburg Pike northwest toward the McPherson farm)',
                'Jun 30 at 11 a.m. (Buford), 11.30 a.m. (Jacobs), a little before noon (Pierce)', 'Buford OR27-1-R337 p.923; Devin OR27-1-R339 p.938; Jacobs 1864 p.22; Pierce 1889; Itinerary OR27-1-R007 p.144',
                'Buford: "I entered this place to-day at 11 a. m."; the enemy had approached to within half a mile of the town when the head of the column entered; Buford pushed him back toward Cashtown and sent parties to Mummasburg and Hunterstown, toward Cashtown and a strong force toward Littlestown; Devin sent scouting parties to observe the approaches from Carlisle, Harrisburg and York. '
                'Jacobs: 11.30 a.m., passing through Washington Street to the Chambersburg turnpike, encamping at the McPherson farm; Pierce: a little before noon. The strength of the division is not in the OR text read: civilian estimates are 6,000 (Jacobs, Pierce); the seed values 2,748 / 2,900 / 3,000 / 3,200 are leads. Scenarios carried, no default.',
                'documented', '1863-06-30T11:00', '1863-06-30T12:00', marking='arrival, movements and scouting: documented; strength: range of scenarios, none documented from a return'),
    subs=[
        ('Buford entered Gettysburg at 11 a.m.; found the town in a terrible state of excitement; the enemy had approached to within half a mile of the town when the head of his column entered', 'documented', 'supported', ['bu_11', 'bu_half']),
        ('He pushed the enemy back toward Cashtown and sent parties to Mummasburg and Hunterstown, toward Cashtown, and a strong force toward Littlestown', 'documented', 'supported', ['bu_parties']),
        ('Devin\'s brigade: marched by Emmitsburg to Gettysburg on the 30th, encamped, and scouting parties were immediately sent out toward Carlisle, Harrisburg and York', 'documented', 'supported', ['dev_scouts', 'it_buford']),
        ('Jacobs: at 11.30 a.m. 6,000 Federal cavalry under Buford arrived, passing through Washington Street to the Chambersburg turnpike; Pierce: a little before noon, about six thousand men', 'documented', 'conflict', ['jac_1130', 'pierce_noon', 'pierce_6000']),
        ('Strength of the division: 2,748 / about 2,900 / about 3,000 / about 3,200 (seed leads)', 'open gap', 'unsupported', []),
        ('Vedettes placed west and north', 'open gap', 'unsupported', []),
    ],
    cites={
        'bu_11': OR('I entered this place to-day at 11 a. m.', R337, '923'),
        'bu_half': OR('He had approached to within half a mile of the town when the head of my column entered', R337, '923'),
        'bu_parties': OR('I have sent parties to the two first-named places, toward Cashtown, and a strong force toward Littlestown', R337, '923'),
        'dev_scouts': OR('Scouting parties were immediately sent out to observe the approaches from Carlisle, Harrisburg, and York', 'OR27-1-R339', '938'),
        'it_buford': OR('Gamble\'s and Devin\'s brigades, of Buford\'s cavalry division, from near Fairfield, via Emmitsburg, to Gettysburg', R007, '144'),
        'jac_1130': L('JACOBS-1864', 'At 11J A. M., 6,000 Federal cavalry, under General Buford, arrived, passing through Washington street to the Chambersburg turnpike', note=HALF('11:30 a.m.')),
        'pierce_noon': L('TPIERCE-1889', 'A little before noon on Tuesday, June 30th, a great number of Union cavalry began to arrive in the town.', witness='eyewitness narrative of 1889 (T. Pierce, then 15)'),
        'pierce_6000': L('TPIERCE-1889', 'numbering about six thousand men', witness='eyewitness narrative of 1889 (T. Pierce, then 15); an estimate learned afterwards'),
    },
    scenarios=[
        sc('A', 'Arrival about 11:00 a.m.', 'Buford OR27-1-R337 p.923', 'documented', ['bu_11']),
        sc('B', 'Arrival at 11:30 a.m.; a little before noon', 'Jacobs 1864 p.22; Pierce 1889', 'documented', ['jac_1130', 'pierce_noon']),
        sc('C', 'Strength about 6,000 (civilian estimates)', 'Jacobs 1864 p.22; Pierce 1889', 'documented', ['jac_1130', 'pierce_6000']),
        sc('D', 'Strength 2,748 / about 2,900 / about 3,000 / about 3,200', 'seed sources W-FD, DW, CAV-ABT, W-McP (leads); no return read', 'open gap', []),
    ],
    remains=['the strength of Buford\'s division from a return (the OR returns are unreadable in the OCR)', 'vedettes west and north (Buford\'s reports speak of parties and pickets only)'],
    searched=['OR27-1-R337 pp.918-924 (Buford), R339 p.938 (Devin), R338 (Gamble) read; Itinerary p.144; Jacobs 1864 p.22; Pierce 1889 pp.28-29',
              'OR vol.27 pt.1 strength tables of the Cavalry Corps: the OCR of the returns is not readable (OR-RECHECK-2); not re-attempted by page image'],
    recheck='OR-RECHECK: stored quote found at p.923. Shard note applied ("strengths not in readable OR text"): the strengths stay unsupported by a return; the two civilian estimates of 6,000 are added as documented estimates; the arrival hour has three witnesses.',
    register=reg('Strength of Buford\'s division on Jun 30 (2,748 / 2,900 / 3,000 / 3,200 / civilian 6,000) and vedettes', 'No return of the division for Jun 30 is readable in the OCR text; the civilian estimates (6,000) are not returns.', 'Arrival documented; strength carried as scenarios with the declared basis, no point value', 'documented',
                 competing='2,748 / 2,900 / 3,000 / 3,200 (leads) against 6,000 (Jacobs, Pierce estimates)', impact='block size of the cavalry on Jun 30 and Jul 1', ask='none: read the Cavalry Corps return from the page image (owed work)', rids='R04, R16, R10'),
    related=['tl-01-EG-007']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-046
ROWS.append(dict(
    id='T1-046', verdict='corrected',
    claim=claim('Hanover fight: about two hours, from about noon (Richmond, Hammond) or 10 a.m. (Stuart); the 6th and 7th Michigan are engaged there',
                'Kilpatrick\'s division: Farnsworth\'s brigade (1st Vermont, 1st West Virginia, 18th Pennsylvania, 5th New York), Custer\'s brigade (6th and 7th Michigan; 1st Michigan supporting Battery M) against Stuart\'s column', 'Hanover, Pa. (the Forney farm is not named in the OR)',
                'Jun 30: the fight lasted about two hours; its end is about 12:00 if it began about 10 a.m. (Stuart), about 14:00 if it began about noon (Richmond, Hammond)', 'Kilpatrick OR27-1-R359 p.986; Richmond OR27-1-R362 p.1005; Hammond OR27-1-R363 p.1008; Custer OR27-1-R361 pp.997 and 999',
                'Kilpatrick: a fight of about two hours in which the whole command was engaged at different times; with the starts of about 10 a.m. (Stuart) and about noon (Richmond, Hammond) the end falls between about noon and about 14:00. Custer: the 6th Michigan, with the 5th, was at Littlestown, then went to Hanover, met the enemy\'s skirmishers, drove them to their guns and fought a sharp engagement against odds; the 7th Michigan was engaged at Hanover and the 1st Michigan supported Battery M without loss. '
                'The seed "ends just before noon" matches only the 10 a.m. start; it is carried as one scenario, no default.',
                'documented', '1863-06-30T12:00', '1863-06-30T14:00'),
    subs=[
        ('A fight of about two hours, in which the whole command was engaged at different times', 'documented', 'supported', ['kil_two']),
        ('Start of the fight about 10 a.m. (Stuart) or about noon (Richmond, Hammond)', 'documented', 'conflict', ['stuart10', 'rich_noon', 'ham_noon']),
        ('The 6th Michigan (with the 5th at Littlestown, then Hanover) met the enemy\'s skirmishers, drove them to their guns and fought a sharp engagement outnumbered; the 7th Michigan was engaged at Hanover; the 1st Michigan supported Battery M, not actively engaged', 'documented', 'supported', ['cust6', 'cust1']),
        ('The Forney farm as the place of the fight; the fight ended just before noon (seed)', 'open gap', 'unsupported', []),
    ],
    cites={
        'kil_two': OR('After a fight of about two hours, in which the whole command at different times was engaged', R359, '986'),
        'stuart10': OR('About 10 a. m. the head of the column reached Hanover', R565, '695'),
        'rich_noon': OR('where the advance of the column arrived about noon of the same day', R362, '1005'),
        'ham_noon': OR('About noon, we entered the town of Hanover, and halted in the main street', R363, '1008'),
        'cust6': OR('The remainder of the regiment proceeded to Hanover. Here we met the enemy\'s skirmishers; drove them to their guns', R361, '999'),
        'cust1': OR('On June 30, the regiment was ordered to support Battery M, Second U. S. Artillery, at Hanover, Pa.', R361, '997'),
    },
    scenarios=[
        sc('A', 'The fight begins about 10 a.m. and ends about noon', 'Stuart OR27-2-R565 p.695 with Kilpatrick\'s two hours; matches the seed "ends just before noon"', 'documented', ['stuart10', 'kil_two']),
        sc('B', 'The fight begins about noon and ends about 14:00', 'Richmond OR27-1-R362 p.1005; Hammond OR27-1-R363 p.1008 with Kilpatrick\'s two hours', 'documented', ['rich_noon', 'ham_noon', 'kil_two']),
    ],
    remains=['the Forney farm as a named place (the OR names the town only)'],
    searched=['OR27-1-R359 (Kilpatrick) pp.985-988, R361 (Custer) pp.997-998, R362 (Richmond) p.1005, R363 (Hammond) pp.1008-1009 read; OR vol.27 regex Forney: no hit for the Forney farm'],
    recheck='OR-RECHECK: the stored quotes were found (p.1005, p.~1008); the item without a stored quote (Kilpatrick p.986) now carries the verbatim passage. Shard note "a 6th Michigan role not found" corrected: Custer\'s report has it (the OCR of the Fifth Michigan section is not readable).',
    register=reg('The Forney farm as the place of the Hanover fight', 'The OR reports name the town and its streets; no passage names the Forney farm.', 'Fight in and around Hanover for about two hours, start per the scenarios', 'documented',
                 competing='fight ends just before noon (seed, 10 a.m. start) against ends about 14:00 (noon start)', impact='the fight is drawn around the town; the farm is not named', ask='none', rids='R16, R11, R13'),
    related=['tl-01-EG-007']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-047
ROWS.append(dict(
    id='T1-047', verdict='partially_supported',
    claim=claim('Pettigrew\'s brigade reaches the western approach to Gettysburg, sees Buford\'s cavalry (with infantry, per Heth), does not enter and returns toward Cashtown without fighting',
                'Pettigrew\'s brigade (Heth\'s division); Buford\'s cavalry; Hill\'s remark that it was probably a detachment of observation', 'Near the western approach to Gettysburg (the Seminary hill, Marsh Creek), then back to Cashtown (the brigade on picket half way between Cashtown and Gettysburg that night)',
                'Jun 30: Jacobs puts a Confederate advance at 9.30 a.m. with the withdrawal at 10.30 a.m.; Buford puts the enemy within half a mile when his column entered at 11 a.m.; Heth\'s report has Pettigrew meet a large force of cavalry after Buford\'s arrival', 'Heth OR27-2-R549 p.637; Hill OR27-2-R534 p.607; Jacobs 1864 pp.21-22; Buford OR27-1-R337 p.923; Jones OR27-2-R550 p.642',
                'Pettigrew found a large force of cavalry near the town, supported by an infantry force (Heth), judged it unadvisable to enter and returned to Cashtown (Heth) while the brigade picketed the pike half way between Cashtown and Gettysburg that night (Jones); Hill reported "principally cavalry", force undetermined, and later said it was probably a detachment of observation. '
                'No hour is in the OR; Jacobs has a Confederate advance as far as the Seminary hill at 9.30 and a withdrawal at 10.30 a.m. (unit not named), Buford the enemy within half a mile at 11 a.m. NOT documented: that Pettigrew took the force for militia.',
                'documented', '1863-06-30T09:30', '1863-06-30T14:00', marking='cavalry supported by infantry, no entry, return: documented; hour: window from two witnesses; militia judgment: gap'),
    subs=[
        ('Pettigrew found a large force of cavalry near the town, supported by an infantry force, did not deem it advisable to enter, and returned to Cashtown', 'documented', 'supported', ['heth_cav']),
        ('Hill: Heth reported Pettigrew had encountered the enemy at Gettysburg (principally cavalry), force undetermined; Hill: the only force at Gettysburg was cavalry, probably a detachment of observation', 'documented', 'supported', ['hill_cav', 'heth77_obs']),
        ('Jacobs: at 9.30 a.m. a portion of Hill\'s corps advanced on the Chambersburg turnpike as far as the Seminary hill crest; at 10.30 a.m. it withdrew toward Cashtown (unit not named)', 'documented', 'conflict', ['jac_930', 'jac_1030']),
        ('Buford: the enemy had approached to within half a mile of the town when the head of his column entered at 11 a.m.', 'documented', 'conflict', ['bu_half', 'bu_11']),
        ('That night the brigade was on picket on the turnpike half way between Cashtown and Gettysburg', 'documented', 'conflict', ['jones_picket']),
        ('Pettigrew took the force for militia', 'open gap', 'unsupported', []),
    ],
    cites={
        'heth_cav': OR('found a large force of cavalry near the town, sujjported by an infantry force', R549, '637'),
        'hill_cav': OR('Pettigrew had encountered the enemy at Gettysburg (principally cavalry)', R534, '607'),
        'heth77_obs': L('SHSP-04', 'the only force at Gettysburg is cavalry, probably a detachment of observation'),
        'jac_930': L('JACOBS-1864', 'At 9J a. m., a portion of Hill\'s corps advanced on the Chambersburg turnpike, as far as the crest of the Seminary hill', note=HALF('9:30 a.m.')),
        'jac_1030': L('JACOBS-1864', 'At 10| a. m., they again withdrew towards Cashtown', note=HALF('10:30 a.m.')),
        'bu_half': OR('He had approached to within half a mile of the town when the head of my column entered', R337, '923'),
        'bu_11': OR('I entered this place to-day at 11 a. m.', R337, '923'),
        'jones_picket': OR('ultimo, the brigade was on picket on the turiij)ike road leading from Chambersburg to Gettysburg, about half way between Cashtown and the latter place', 'OR27-2-R550', '642'),
    },
    scenarios=[
        sc('A', 'Confederate advance 9.30 to 10.30 a.m. (before Buford\'s arrival)', 'Jacobs 1864 pp.21-22 (eyewitness at Gettysburg; unit not named, "a portion of Hill\'s corps")', 'documented', ['jac_930', 'jac_1030']),
        sc('B', 'Pettigrew meets the cavalry after Buford\'s entry at 11 a.m. (late morning to midday)', 'Heth OR27-2-R549 p.637 (a large force of cavalry); Buford OR27-1-R337 p.923; seed window "late morning-midday"', 'documented', ['heth_cav', 'bu_half']),
    ],
    remains=['that Pettigrew took the force for militia'],
    searched=['Heth p.637 (and SHSP-06, SHSP-04), Hill p.607, Buford p.923, Jones (R550) p.642 read; Jacobs pp.21-22; OR vol.27 pt.2 regex Pettigrew near militia: no hit; NPS McPherson study read (it follows Jacobs and Heth)'],
    recheck='OR-RECHECK: both stored quotes found (p.637, p.607). Shard note applied ("no hour in OR; militia judgment and the Hill quote not verified"): the Hill remark is now verbatim from SHSP vol.4; the hour is a window from two witnesses; the militia judgment stays unsupported.',
    register=reg('Pettigrew\'s judgment that the force was militia, and the hour of his approach', 'No text read has Pettigrew take the force for militia; the hour differs between Jacobs (9.30-10.30) and Buford (11 a.m.).', 'Approach, sighting of cavalry with infantry, no entry, return: documented; hour as a window', 'documented',
                 competing='before Buford\'s arrival (Jacobs) against after it (Heth, Buford)', impact='time of the sighting on the screen is a window', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-048
ROWS.append(dict(
    id='T1-048', verdict='unsupported',
    claim=claim('Cavalry Corps medical director Surgeon G. L. Pancoast is documented; a First Division hospital at the Presbyterian Church on Jun 30 is not documented (a commemorative tablet of the Cavalry Corps hospital stands in front of that church)',
                'Cavalry Corps medical staff (1st Division); Surg. G. L. Pancoast, medical director', 'Gettysburg, the Presbyterian Church on Baltimore Street and nearby', 'Jun 30 midday (the date is not documented)', 'Pleasonton OR27-1-R336 p.918; NPS list of monuments, markers and tablets (1932)',
                'Surgeon G. L. Pancoast was the medical director of the Cavalry Corps (staff list). A Cavalry Corps hospital tablet is listed "in front of the Presbyterian Church, Gettysburg" by the National Park Service monuments list; that places the commemoration, not a hospital on Jun 30. '
                'No passage read puts a First Division hospital at the Presbyterian Church on Jun 30 or at any time before the battle. The hospital is shown as an inferred scene only, with its date marked as a gap.',
                'inferred', '1863-06-30T00:00', '1863-06-30T23:59', marking='Pancoast\'s office: documented; the hospital at the church on Jun 30: gap (commemoration only)'),
    subs=[
        ('Surg. G. L. Pancoast was the medical director of the Cavalry Corps', 'documented', 'supported', ['pancoast']),
        ('A Cavalry Corps hospital tablet is placed in front of the Presbyterian Church, Gettysburg (park monuments list)', 'documented', 'supported', ['nps_tablet']),
        ('First Division hospitals were set up in and near the Presbyterian Church at midday on Jun 30', 'open gap', 'unsupported', []),
    ],
    cites={
        'pancoast': OR('Surg. G. L. Pancoast, medical director', 'OR27-1-R336', '918'),
        'nps_tablet': L('NPS-MON-LOC-1932', 'The Cavalry Corps in front of the Presbyterian Church Gettysburg', page='25', page_basis='printed page number 25 in the running head of the PDF page that holds the quote (marker === PAGE 24 === of the text layer)', witness='National Park Service list of the park\'s tablets; a commemorative location, not a statement of the date'),
    },
    scenarios=[],
    remains=['a First Division hospital at the Presbyterian Church on Jun 30 (and the date and the First Division attribution of any hospital there)'],
    searched=['OR vol.27 pt.1 regex Pancoast: 3 hits (R336 p.918 staff list; p.1046, where he is named for arrangements for the wounded in an earlier action, not Gettysburg; the index); R016 (Letterman) read for the cavalry hospital: only four ambulances left for the Cavalry Corps',
              'Library regex Presbyterian in 16 texts (Pennsylvania, New York, BL-3, Letterman, Hospital Scenes, Pierce, Jacobs, Michigan, Adams Sentinel and Compiler Jul 1863): no hit about a cavalry hospital; the hits are the Nov 19 1863 visit of Lincoln and unrelated passages',
              'NPS texts under tmp/library/web/nps (another workstream\'s acquisition, acquired_3.json): the Cavalry Corps tablet in front of the Presbyterian Church (NPS-MON-LOC-1932 and 1993, NPS-BOUNDARY-1988); no text states a Jun 30 hospital',
              'HMDB marker (the seed source HOSP-17939): not retrieved; other shards recorded HTTP 403 from that host (not circumvented)'],
    recheck='OR-RECHECK-2 (not_supported) applied: only Pancoast\'s office is in the OR; the shard note stands; a commemorative marker location from the National Park Service list is added and stays a commemoration.',
    register=reg('First Division cavalry hospital at the Presbyterian Church on Jun 30', 'No passage read puts a hospital at the church on Jun 30; the NPS list only locates the Cavalry Corps tablet there.', 'Pancoast as Cavalry Corps medical director (documented); a hospital at the church as an inferred scene without a date', 'inferred',
                 competing='-', impact='the church interior is not drawn as a Jun 30 hospital', ask='none: the HMDB marker text or a regimental history of the 6th New York or 8th Illinois Cavalry would settle it (owed reading)', rids='R05, R17'),
    related=['tl-01-EG-006']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-049
ROWS.append(dict(
    id='T1-049', verdict='partially_supported',
    claim=claim('Jun 30: the signal officer with Buford takes position in the steeple of the college and reports the enemy\'s movements; the college cupola is used again on Jul 1',
                'Union signal officer with Buford\'s cavalry (Signal Corps)', 'The steeple of the college, Gettysburg (Pennsylvania College; the building, Pennsylvania Hall, is not named in the OR)',
                'Jun 30 (no hour); on Jul 1 a station was set up first on the college, then on the court-house; Jacobs: an officer on the College cupola at 8.30 a.m. on Jul 1', 'Norton OR27-1-R017 p.201; Jacobs 1864 p.25',
                'On Jun 30 the signal officer with Buford, who occupied Gettysburg, took position in the steeple of the college and reported to Buford the whereabouts and movements of the enemy (Norton); on Jul 1 a station of observation was set up first on the college and subsequently on the court-house, and Jacobs places an officer on the College cupola at 8.30 a.m. '
                'NOT documented in the sources read: that the building is Pennsylvania Hall (an identification of the college\'s cupola with its main building) and an hour.',
                'documented', '1863-06-30T11:00', '1863-06-30T23:59', marking='steeple of the college: documented; the building named Pennsylvania Hall: inferred'),
    subs=[
        ('The signal officer with Buford, who occupied the town of Gettysburg, took position in the steeple of the college and reported to Buford the whereabouts and movements of the enemy (Jun 30)', 'documented', 'supported', ['norton_steeple']),
        ('On Jul 1 a station of observation was established first on the college and then on the court-house', 'documented', 'supported', ['norton_jul1']),
        ('One of the signal officers was on the College cupola making observations at 8.30 a.m. on Jul 1', 'documented', 'supported', ['jac_cupola']),
        ('The steeple/cupola is that of Pennsylvania Hall', 'inferred', 'unsupported', []),
    ],
    cites={
        'norton_steeple': OR('took position in the steeple of the college', 'OR27-1-R017', '201'),
        'norton_jul1': OR('A station of observation was established, first on the college and subsequently on the court-house in Gettysburg', 'OR27-1-R017', '201'),
        'jac_cupola': L('JACOBS-1864', 'At 8J A. m., one of these officers was on the College cupola', note=HALF('8:30 a.m.')),
    },
    scenarios=[],
    remains=['that the "steeple of the college" is the cupola of Pennsylvania Hall (inferred; no text names the building)'],
    searched=['OR27-1-R017 (Norton) read in full; Library regex cupola|steeple|belfry in Jacobs, Pierce, Pennsylvania, BL-3, New York, Michigan: Jacobs has the College cupola on Jul 1; the Seminary cupola is Buford\'s Jul 1 post (other texts)'],
    recheck='OR-RECHECK: stored quote found at p.201. Shard note applied ("steeple of the college, not Pennsylvania Hall by name; hour not stated"): Jacobs\'s "College cupola" supports the cupola on Jul 1; the building name stays an inference.',
    register=reg('Identification of the college steeple/cupola with Pennsylvania Hall', 'Norton says "the steeple of the college"; Jacobs "the College cupola"; neither names the building.', 'Observation post at the college\'s cupola shown as the building the college\'s cupola belongs to (inferred: Pennsylvania Hall)', 'inferred',
                 competing='-', impact='which building carries the post', ask='none', rids='R05, R13'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-050
ROWS.append(dict(
    id='T1-050', verdict='partially_supported',
    claim=claim('Alleged: on the night of Jun 30 Buford\'s troopers cut and threw down fence on the McPherson farm for the battle and for firewood (a tenant\'s later claim, reported by the National Park Service)',
                'Buford\'s cavalry (troopers); John Slentz, tenant of the McPherson farm', 'McPherson farm and ridge (post-and-rail fence; the railroad grade is not named in the source)',
                'Night of Jun 30 (Tuesday night)', 'NPS Edward McPherson Farm Historical Study (NPS-HS-MCPHERSON p.26), citing the Slentz damage claim and Hall\'s history of the 6th New York Cavalry',
                'According to the National Park Service Historical Study of the Edward McPherson farm, on Tuesday night (Jun 30) the tenant John Slentz watched Buford\'s troopers cut and throw down about a quarter mile of post-and-rail fence "to make way for the battle" and use another cord of rails for firewood, and men tearing down his fencing for firewood and possible breastworks; the study cites the Slentz claims file and a regimental history of 1908, not a wartime record. '
                'The OR has no fence statement for Jun 30 (Gamble\'s "trees and fences" and Buford\'s stone fence are Jul 1). The location along the railroad grade and the restoration by the farmer are not in the source. Shown only as an alleged event with its basis stated.',
                'inferred', '1863-06-30T11:00', '1863-07-01T04:03', marking='alleged (tenant\'s claim relayed by an NPS study, no wartime account): inferred; location along the railroad grade and restoration: gap'),
    subs=[
        ('Buford\'s troopers cut and threw down about a quarter mile of post-and-rail fence "to make way for the battle" and another cord of rails was used for firewood (Tuesday night, Jun 30)', 'inferred', 'supported', ['nps_fence']),
        ('Men and horses trampled oats and wheat and tore down the tenant\'s fencing for firewood and for possible use as breastworks on the morrow', 'inferred', 'supported', ['nps_tore']),
        ('The fences were along the railroad grade, and were restored by the farmer', 'open gap', 'unsupported', []),
        ('A wartime account of the dismantling (a report or letter of Jun 30 - Jul 1)', 'open gap', 'unsupported', []),
    ],
    cites={
        'nps_fence': L('NPS-HS-MCPHERSON', 'A ft e r watching Buford\'s troopers cut and throw down about a qu arter mile o f post and r a i l fence', page='26', page_basis='printed page number 26 follows the marker === PAGE 28 === (PDF page 28) in the text layer; the quote is about 1,100 characters after it', witness='Historical Study by the National Park Service (text layer of the PDF, spaced letters); footnotes: Slentz claims file and H. A. Hall, History of the Sixth New York Cavalry (1908) p.134'),
        'nps_tore': L('NPS-HS-MCPHERSON', 'to re down his fen cin g f o r firewood and f o r possible use as breastworks on the morrow', page='26', page_basis='printed page number 26 follows the marker === PAGE 28 === (PDF page 28) in the text layer; the quote is about 1,000 characters after it', witness='Historical Study by the National Park Service (text layer of the PDF, spaced letters)'),
    },
    scenarios=[],
    remains=['a wartime account of the dismantling', 'the location along the railroad grade and the restoration by the farmer'],
    searched=['OR vol.27 pts 1-3 regex (rails?|fenc\\w+).{0,80}(fire-?wood|fires|breastwork|barricade|torn down|tore down|taken down|pulled down): pt1 10, pt2 3 hits, all Jul 1 or later; regex fenc\\w+|rails\\b in pt.1 (Buford, Gamble, Devin, Calef): 181 mentions, none dated Jun 30 for dismantling (Gamble p.934 trees and fences and Buford p.927 stone fence are Jul 1)',
              'Library (108 texts): Jacobs, Pierce, Pennsylvania at Gettysburg, New York at Gettysburg: no fence dismantling on Jun 30; NPS texts under tmp/library/web/nps (another workstream\'s acquisition): the McPherson Historical Study is the only text with the claim; the Slentz claims file itself was not read'],
    recheck='OR-RECHECK-2 (not_supported) applied: no OR passage supports the Jun 30 claim; the National Park Service study found in the NPS acquisition (relaying a tenant\'s claim) is the only support and keeps the row an alleged, inferred event.',
    register=reg('Wartime account of the alleged Jun 30 fence dismantling on the McPherson farm; location and restoration', 'The only source is a modern NPS study relaying the tenant\'s damage claim; no wartime account and no location along the railroad grade were found.', 'Shown as alleged, marked inferred, with the NPS study and the claimant named', 'inferred',
                 competing='alleged dismantling (Harrison, NPS) against "no wartime account describes fences along the cut" (critic)', impact='fence damage before the fight is not drawn as fact; shown as an alleged event only', ask='none: the Slentz claims file (Adams County, Gettysburg claims) would be the primary text; an owner step if access needs a request', rids='R14, R05'),
    related=['tl-01-EG-006']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-051
ROWS.append(dict(
    id='T1-051', verdict='partially_supported',
    claim=claim('Hanover: after the first charges, Hampton comes up and the sharpshooters dislodge the enemy; an artillery action of about two hours; Stuart cuts the Union column in twain; losses',
                'Stuart\'s brigades (Hampton, Fitz. Lee, W. H. F. Lee/Chambliss), horse artillery; Kilpatrick\'s division (Farnsworth, Custer), Elder\'s battery', 'Hanover, Pa.',
                'Jun 30 afternoon (about two hours of action; no 14:00 anchor in the OR)', 'Stuart OR27-2-R565 p.696 (the hour of the head of the column, p.695, is cited in row T1-046); Kilpatrick OR27-1-R359 pp.986-987; Richmond OR27-1-R362 p.1005; Hammond OR27-1-R363 p.1009',
                'Stuart: the head of the column reached Hanover about 10 a.m.; Hampton, arriving in the meantime, engaged the enemy farther to the right and with his sharpshooters dislodged him from the town; "we cut the enemy\'s column in twain"; Kilpatrick: a fight of about two hours, one battle-flag, a lieutenant-colonel, a captain and 45 privates taken, upward of 15 killed, "My loss is trifling". '
                'Losses in the reports read: Farnsworth\'s First Brigade 11 killed, 62 wounded, 89 missing (Richmond); the 5th New York 2 officers and 2 men killed, 25 wounded, 10 missing (Hammond). NOT documented: the 14:00 anchor, the totals 215 Union (18th Pennsylvania 57 missing) and 117 Confederate, and Stuart jumping a ditch.',
                'documented', '1863-06-30T10:00', '1863-06-30T16:00', marking='action and brigade losses: documented; the totals 215 / 117, the ditch and 14:00: gap'),
    subs=[
        ('Hampton came up and with his sharpshooters dislodged the enemy from the town; Stuart cut the enemy\'s column in twain', 'documented', 'supported', ['stuart_hampton', 'stuart_twain']),
        ('A fight of about two hours; one battle-flag, a lieutenant-colonel, 1 captain and 45 privates taken, upward of 15 of the enemy killed; Kilpatrick: "My loss is trifling"', 'documented', 'supported', ['kil_two', 'kil_taken']),
        ('Farnsworth\'s First Brigade lost 3 officers killed, 2 wounded, 3 missing and 8 enlisted men killed, 60 wounded, 86 missing', 'documented', 'supported', ['rich_loss']),
        ('The 5th New York lost 2 officers killed, 2 enlisted men killed, 25 wounded and 10 missing', 'documented', 'supported', ['ham_loss']),
        ('Union casualties 215 (the 18th Pennsylvania 57 missing) and Confederate 117; a 14:00 anchor; Stuart escaped by jumping a ditch', 'open gap', 'unsupported', []),
    ],
    cites={
        'stuart_hampton': OR('and Hampton, arriving in the meantime, engaged the enemy farther to the right', R565, '696'),
        'stuart_twain': OR('We cut the enemy\'s column in twain', R565, '696'),
        'kil_two': OR('After a fight of about two hours, in which the whole command at different times was engaged', R359, '986'),
        'kil_taken': OR('I have taken one battle-flag, a lieutenantcolonel, 1 captain, and 45 privates', R359, '987'),
        'rich_loss': OR('The brigade lost in this action : Commissioned officers, 3 killed, 2 wounded, and 3 missing ; enlisted men, 8 killed, 60 wounded, and 86 missing', R362, '1005'),
        'ham_loss': OR('Our loss was 2 officers killed, 2 enlisted men killed, 25 wounded, and 10 missing', R363, '1009'),
    },
    scenarios=[],
    remains=['the Union total 215 (18th Pennsylvania 57 missing) and the Confederate total 117', 'the 14:00 anchor and the ditch jump'],
    searched=['OR27-1-R359 pp.985-988, R362 p.1005, R363 pp.1008-1009 and OR27-2-R565 pp.695-696 read; OR27-1-R015 (General Return of Casualties) read for Hanover: the table cells are not readable in the OCR text',
              'OR vol.27 pts 1-3 and the 16 library texts of the regiments (Pennsylvania, New York, Michigan, New Jersey, Vermont, Minnesota, Maine) regex for a ditch jump near Stuart or Hanover: no hit (the New Jersey hit is the First Jersey Cavalry\'s charge of another day)'],
    recheck='OR-RECHECK: the stored citation without a quote (Kilpatrick p.986) now carries verbatim passages (the "loss is trifling" sentence is on p.987 at the page turn); both quotes found. Shard note applied: totals and the ditch jump are not in the OR; the brigade losses of Richmond and Hammond are added.',
    register=reg('Hanover casualty totals (215 Union, 117 Confederate), 14:00 anchor and the ditch jump', 'The General Return table cells are unreadable in the OCR text; no source read has the totals or the ditch jump.', 'Brigade-level losses of Farnsworth\'s brigade and the 5th New York (documented); totals as a range once a return is read', 'documented',
                 competing='-', impact='casualty figures on the card are brigade-level only', ask='none: read OR27-1-R015 and the Custer brigade losses from the page image (owed work)', rids='R03, R16'),
    related=['tl-01-EG-007']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-052
ROWS.append(dict(
    id='T1-052', verdict='confirmed',
    claim=claim('VI Corps (Sedgwick) is at Manchester on Jun 30, about 35 miles from Gettysburg, and is placed on the right flank by the Pipe Creek circular',
                'VI Corps (Sedgwick); 1st Division (Wright)', 'Manchester, Md. (Wright\'s division encamped about 2 miles from Manchester); the circular puts Sedgwick at Manchester on the right', 'Jun 30; the circular is headed Jul 1', 'Wright OR27-1-R224 p.666; Itinerary OR27-1-R007 p.144; circular OR27-3-D0962 p.458; Torbert OR27-1-R225 p.669',
                'On Jun 30 the Sixth Corps marched from New Windsor to Manchester (Itinerary); Wright\'s division marched at 4 a.m. through Westminster, 23 miles, and encamped about two miles from Manchester; the circular headed Taneytown, July 1 has Sedgwick at Manchester forming the right; Torbert\'s brigade put the march from Manchester to Gettysburg at about 35 miles. '
                'The circular is dated Jul 1, so its use as the Jun 30 layout is carried with that date.',
                'documented', '1863-06-30T00:00', '1863-06-30T23:59'),
    subs=[
        ('The Sixth Corps marched from New Windsor to Manchester on Jun 30', 'documented', 'supported', ['it_vi']),
        ('Wright\'s division marched at 4 a.m. through Westminster, 23 miles, and encamped about two miles from Manchester', 'documented', 'supported', ['wright_man']),
        ('The Pipe Creek circular (headed Taneytown, July 1): Sedgwick at Manchester will form the right', 'documented', 'supported', ['circ']),
        ('The march from Manchester to Gettysburg was about 35 miles (Torbert: about 35 miles; Wright: variously estimated at 33 to 35)', 'documented', 'supported', ['torbert35', 'wright35']),
    ],
    cites={
        'it_vi': OR('the Sixth Corps from New Windsor to Manchester', R007, '144'),
        'wright_man': OR('Marched at 4 a. m. through Westminster; encamped about 2 miles from Manchester, a distance of 23 miles', 'OR27-1-R224', '666'),
        'circ': OR('form the right', 'OR27-3-D0962', '458'),
        'torbert35': OR('Made a forced march from Manchester to Gettysburg, Pa. ; distance, about 35 miles', 'OR27-1-R225', '669'),
        'wright35': OR('a march variously estimated at from 33\' to 35 miles', 'OR27-1-R224', '665'),
    },
    scenarios=[], remains=[],
    searched=['Wright p.665-666, Torbert pp.668-669, the Itinerary p.144 and the circular D0962 read'],
    recheck='OR-RECHECK: both stored quotes found (p.666, p.458). Shard note applied ("35 miles not in the OR passage"): the distance is now cited from Torbert and Wright.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-053
ROWS.append(dict(
    id='T1-053', verdict='partially_supported',
    claim=claim('XI Corps (Howard) is at Emmitsburg on the evening of Jun 30, ordered to take position on the north side of the town',
                'XI Corps (Howard); Barlow\'s division', 'Emmitsburg, Md.; the north side of the town', 'Jun 30 (order at 8.30 a.m.; at Emmitsburg on the evening)', 'Howard OR27-1-R243 pp.701, 707',
                'Howard: at 8.30 a.m. on Jun 30 an order was received to take position on the north side of Emmitsburg, and on the evening of Jun 30 the Eleventh Corps was at Emmitsburg; the Itinerary has the First and Eleventh Corps at Emmitsburg on Jun 29. '
                'NOT documented in the OR read: that Barlow\'s division was the one north of town, and the 17th Connecticut\'s camp.',
                'documented', '1863-06-30T08:30', '1863-06-30T23:59', marking='corps at Emmitsburg north side: documented; Barlow\'s division: gap'),
    subs=[
        ('On the evening of June 30 the Eleventh Corps was at Emmitsburg', 'documented', 'supported', ['howard_evening']),
        ('At 8.30 a.m. on June 30 an order was received to take position on the north side of Emmitsburg', 'documented', 'supported', ['howard_north']),
        ('Barlow\'s division was north of the town', 'open gap', 'unsupported', []),
    ],
    cites={
        'howard_evening': OR('The Eleventh Corps was at Emmitsburg.', R243, '701'),
        'howard_north': OR('At 8. 30 a. m. June 30, an order was received from headquarters to take position on the north side of Emmitsburg', R243, '707'),
    },
    scenarios=[],
    remains=['Barlow\'s division north of the town (and the camps of its regiments)'],
    searched=['Howard pp.701 and 707 read; OR vol.27 pt.1 regex Emmitsburg.{0,200}(north|Barlow) and (Barlow|First Division).{0,200}Emmitsburg: 8 hits read, none places Barlow\'s division on Jun 30'],
    recheck='OR-RECHECK: stored quote found at p.701. Shard note applied ("Barlow\'s division north of town not verified"): the corps-level north side is now cited; the division stays open.',
    register=reg('Barlow\'s division north of Emmitsburg on Jun 30', 'No report read names Barlow\'s division\'s Jun 30 camp.', 'XI Corps at the north side of Emmitsburg (documented); division camps as areas, inferred', 'inferred',
                 competing='-', impact='division placement within the corps camp', ask='none', rids='R01, R07'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-054
ROWS.append(dict(
    id='T1-054', verdict='corrected',
    claim=claim('XII Corps, 1st Division (Williams): Taneytown to Littlestown on Jun 30, hurried through the town on a report of enemy cavalry with artillery, takes post north of it and camps; the 123rd New York halts a mile outside on the Hanover road',
                'XII Corps, 1st Division (Williams); 123rd New York (Rogers)', 'Taneytown to Littlestown, Pa. (the 123rd New York a mile outside Littlestown on the Hanover road; the division at Two Taverns only on Jul 1)', 'Jun 30', 'Williams OR27-1-R272 p.771; Rogers OR27-1-R279 p.798; Itinerary OR27-1-R007 p.144',
                'On Jun 30 the division marched from Taneytown to Littlestown, was hastened through on a report that the enemy\'s cavalry with artillery were near, took post to the north of the town and encamped (Williams); the 123rd New York passed through Taneytown and halted for the night a mile outside Littlestown on the Hanover road, marching through the town at the double-quick (Rogers). '
                'The seed places the 123rd New York at Two Taverns on Jun 30; the regiment went to Two Taverns on the morning of Jul 1.',
                'documented', '1863-06-30T00:00', '1863-06-30T23:59'),
    subs=[
        ('Williams: on the 30th the division marched from Taneytown to Littlestown; on approaching it, a report that the enemy\'s cavalry with artillery were near; the division was hastened through and took post to the north of it', 'documented', 'supported', ['williams_30', 'williams_post']),
        ('Itinerary, Jun 30: the Twelfth Corps from Taneytown and Bruceville to Littlestown', 'documented', 'supported', ['it_xii']),
        ('The 123rd New York halted for the night a mile outside Littlestown on the Hanover road, after hurrying through the town at the double-quick; the next morning it marched to Two Taverns', 'documented', 'supported', ['rogers_halt', 'rogers_double']),
        ('The 123rd New York was at Two Taverns on Jun 30 (seed)', 'documented', 'contradicted', ['rogers_halt']),
    ],
    cites={
        'williams_30': OR('June 29, through Frederick to Taney town, Md., and, on the 30th', R272, '771'),
        'williams_post': OR('The division was hastened through, and took post to the north of it', R272, '771'),
        'it_xii': OR('the Twelfth Corps from Taneytown and Bruceville to Littlestown', R007, '144'),
        'rogers_halt': OR('and halted for the night a mile outside of Littlestown, on the Hanover road', 'OR27-1-R279', '798'),
        'rogers_double': OR('While approaching Littlestown, our cavalry was attacked and the infantry ordered to be hurried forward', 'OR27-1-R279', '798'),
    },
    scenarios=[], remains=[],
    searched=['Williams p.771, Rogers (R279) pp.797-798, Itinerary p.144 read; OR vol.27 pt.1 regex 123d New York.{0,300}(Two Taverns|Littlestown): 0 hits (the regiment\'s own report was read by report id)'],
    recheck='OR-RECHECK: stored quote found at p.771. Shard note applied ("123rd NY at Two Taverns on Jun 30 not checked"): the 123rd New York\'s own report puts it a mile outside Littlestown on Jun 30 and at Two Taverns on Jul 1.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-055
ROWS.append(dict(
    id='T1-055', verdict='corrected',
    claim=claim('Army headquarters moves to Taneytown on Jun 30; the II Corps: scenarios (at Taneytown per the circular layout / at Uniontown on Jun 30, Taneytown on the morning of Jul 1)',
                'Meade\'s headquarters; II Corps (Hancock)', 'Taneytown, Md.; II Corps at Uniontown, 1 mile beyond on the night of Jun 29, in camp there on Jun 30', 'Jun 30 (HQ at Taneytown, dispatch of 11.30 a.m.); II Corps Jun 30 at Uniontown (Hancock), Jul 1 morning at Taneytown', 'Meade OR27-3-D0925 p.419; Itinerary OR27-1-R007 p.144; Hancock OR27-1-R076 p.367; circular OR27-3-D0962 p.458',
                'Headquarters Army of the Potomac was at Taneytown on Jun 30 (dispatch dated Taneytown, June 30, 11.30 a.m.; Itinerary: HQ moved from Middleburg to Taneytown). Hancock reports that his corps halted for the night of Jun 29 one mile beyond Uniontown, remained in camp at Uniontown on the 30th and marched to Taneytown on the morning of Jul 1 (in bivouac about 11 a.m.); the circular, headed Jul 1, has the Second Corps "now at Taneytown". '
                'The seed (II Corps at Taneytown on Jun 30) follows the circular; carried as a scenario, no default.',
                'documented', '1863-06-30T00:00', '1863-07-01T11:00'),
    subs=[
        ('Army headquarters at Taneytown on Jun 30 (dispatch dated Taneytown, June 30, 11.30 a.m.; the Itinerary has headquarters moving from Middleburg to Taneytown)', 'documented', 'supported', ['hq_30', 'it_hq']),
        ('II Corps: halted for the night of Jun 29 one mile beyond Uniontown; the corps remained in camp at Uniontown on the 30th', 'documented', 'conflict', ['hancock_night', 'hancock_30']),
        ('The II Corps marched to Taneytown on the morning of Jul 1, going into bivouac about 11 a.m.; the circular (headed Jul 1) says it is now at Taneytown', 'documented', 'conflict', ['hancock_jul1', 'circ_ii']),
    ],
    cites={
        'hq_30': OR('Headquarters Army of the Potomac, Taneytown, June 30, 1863—11.30 a. m.', 'OR27-3-D0925', '419'),
        'it_hq': OR('Headquarters Army of the Potomac moved from Middleburg to Taneytown', R007, '144'),
        'hancock_night': OR('At 10 p. m. the command was halted for the night 1 mile beyond Uniontown', 'OR27-1-R076', '367'),
        'hancock_30': OR('The corps remained in camp at Uniontown on the 30th.', 'OR27-1-R076', '367'),
        'hancock_jul1': OR('On the morning of July 1, the command marched to Taneytown, going into bivouac about 11 a. m.', 'OR27-1-R076', '367'),
        'circ_ii': OR('The Second Corps now at Taneytown', 'OR27-3-D0962', '458'),
    },
    scenarios=[
        sc('A', 'II Corps at Taneytown on Jun 30 (the circular layout)', 'seed sources W-GC, PC-buff; circular OR27-3-D0962 p.458 (headed Jul 1)', 'documented', ['circ_ii']),
        sc('B', 'II Corps at Uniontown on Jun 30, at Taneytown from the morning of Jul 1', 'Hancock OR27-1-R076 p.367; Itinerary OR27-1-R007 p.144 (Second Corps to Uniontown on Jun 29)', 'documented', ['hancock_30', 'hancock_jul1']),
    ],
    remains=[], searched=['OR27-3-D0925, D0962, OR27-1-R076 pp.367-368 and the Itinerary p.144 read'],
    recheck='OR-RECHECK: both stored quotes found (p.419, p.367). Shard verdict "conflict" applied; the circular\'s own date (Jul 1) explains the difference.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-056
ROWS.append(dict(
    id='T1-056', verdict='corrected',
    claim=claim('Rodes\' division marches from Carlisle through Petersburg to Heidlersburg on Jun 30, at least 22 miles; Ramseur\'s brigade guards the division train on the march from Heidlersburg on Jul 1',
                'Rodes\' division (Daniel, Iverson, Ramseur, Doles, O\'Neal); Ramseur\'s brigade in rear of the train on Jul 1', 'Carlisle through Petersburg to Heidlersburg, Pa.', 'Jun 30 (march and bivouac); Ramseur\'s guard duty: Jul 1', 'Rodes OR27-2-R506 p.552; Ewell OR27-2-R467 p.444; Ramseur OR27-2-R518 p.587',
                'On Jun 30 Rodes marched through Petersburg to Heidlersburg and bivouacked there after a march of at least 22 miles (Rodes); Ewell has Rodes at Heidlersburg on the night of Jun 30. Ramseur\'s guard in rear of the division train is the march of Jul 1 from Heidlersburg, not Jun 30.',
                'documented', '1863-06-30T00:00', '1863-06-30T23:59'),
    subs=[
        ('On the 30th Rodes marched through Petersburg and bivouacked at Heidlersburg after a march of at least 22 miles', 'documented', 'supported', ['rodes_hd']),
        ('On the night of June 30 Rodes\' division was at Heidlersburg (Ewell)', 'documented', 'supported', ['ewell_night']),
        ('Ramseur\'s brigade acted as guard in rear of the division train on the march from Heidlersburg (Jul 1, not Jun 30)', 'documented', 'contradicted', ['ramseur_rear']),
    ],
    cites={
        'rodes_hd': OR('bivouacking at Heidlersburg, after a inarch of at least 22 miles', R506, '552'),
        'ewell_night': OR('On the night of June 30, Rodes\' division, which I accompanied, was at HeidlersLurg ; Early 3 miles off, on the road to Berlin', R467, '444'),
        'ramseur_rear': OR('in rear of the division train, as a guard on the march from Heidlersburg', R518, '587'),
    },
    scenarios=[], remains=[],
    searched=['Rodes p.552, Ewell pp.443-444 and Ramseur pp.587-588 read'],
    recheck='OR-RECHECK: both stored quotes found (p.552, p.~587). Shard note applied: Ramseur\'s rear-guard duty is the Jul 1 march from Heidlersburg; the Ewell passage is added for the night of Jun 30.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-057
ROWS.append(dict(
    id='T1-057', verdict='confirmed',
    claim=claim('Early\'s division marches from York at daylight on Jun 30 by Weigelstown and East Berlin toward Heidlersburg and encamps about 3 miles short of it, on the road to Berlin',
                'Early\'s division (Gordon, Hays, Hoke/Avery, Smith); White\'s cavalry sent on the pike toward Gettysburg', 'York to Weigelstown, East Berlin, then 3 miles from Heidlersburg (the Berlin road)', 'Jun 30 from daylight; encamped the night of Jun 30', 'Early OR27-2-R470 pp.467-468; Ewell OR27-2-R467 p.444',
                'At daylight on the morning of Jun 30 Early put his whole command in motion by Weigelstown and East Berlin in the direction of Heidlersburg and sent White\'s cavalry on the pike from York toward Gettysburg; he encamped about 3 miles from Heidlersburg and rode to see Ewell; Ewell has Early 3 miles off on the road to Berlin on the night of Jun 30. The gap of the seed (Early\'s own report not read) is closed (delegated decision DD-08, promotion adopted).',
                'documented', '1863-06-30T04:03', '1863-06-30T23:59'),
    subs=[
        ('At daylight on the morning of the 30th Early put his whole command in motion by Weigelstown and East Berlin in the direction of Heidlersburg', 'documented', 'supported', ['early_dl', 'early_route']),
        ('He encamped about 3 miles from Heidlersburg and rode to see General Ewell', 'documented', 'supported', ['early_camp']),
        ('Ewell: on the night of June 30 Early was 3 miles off on the road to Berlin', 'documented', 'supported', ['ewell_night']),
    ],
    cites={
        'early_dl': OR('accordingly, at daylight on the morning of the 30th, I put my whole command in motion', R470, '467'),
        'early_route': OR('moving by Weigelstown and East Berlin', R470, '467'),
        'early_camp': OR('I encamped about 3 miles from Heidlersburg', R470, '468'),
        'ewell_night': OR('On the night of June 30, Rodes\' division, which I accompanied, was at HeidlersLurg ; Early 3 miles off, on the road to Berlin', R467, '444'),
    },
    scenarios=[], remains=[],
    searched=['Early pp.467-468 and Ewell p.444 read'],
    recheck='OR-RECHECK: stored quote found at p.468; the item without a stored quote (Ewell p.~444) now carries the verbatim passage. Delegated decision DD-08 (promotion open gap -> documented) is applied by this line.'))
