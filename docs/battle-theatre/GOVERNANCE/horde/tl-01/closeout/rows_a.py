"""Close-out row data, T1-001 .. T1-021 (build.py re-matches every quote verbatim in the local source text and refuses the run if one is not found)."""
from rowlib import *

R16 = 'OR27-1-R016'; R565 = 'OR27-2-R565'; R470 = 'OR27-2-R470'; R477 = 'OR27-2-R477'; R426 = 'OR27-2-R426'; R506 = 'OR27-2-R506'

# the Compiler page 2 passages (page images read for this close-out; the OCR text layer interleaves columns, so the quote is the OCR fragment and `reading` the printed words)
CMP_SANDOE = ("Upon the rebel cavalry entering the town, they branched off into the several streets. One squad hurried out Baltimore street, in pursuit of persons taking away horses. "
              "They caught several of them and took their horses. One rebel went down the turnpike as far as Nathaniel Lightner's, where he came upon two of Bell's cavalry. The rebel shot one of them, "
              "Mr. George Sandoe, killing him on the spot. There was probably shooting on both sides, as several shots were heard. Mr. Sandoe was an estimable young man, and leaves a wife and many other "
              "relatives to mourn his early death. The body was removed to his home the same evening.")
CMP_STEVENS = ("Thaddeus Stevens' iron works at Caledonia were burnt by the rebels on their route hitherward, on Friday. The thirty-six prisoners of the 26th Reg. P. V. M. were paroled here by the rebels. "
               "Two officers captured they took with them.")
CMP_ENTRY = ("THE REBELS IN GETTYSBURG. ... all proved untrue until Friday. On that day persons from Cashtown and vicinity reported having seen them in force. The 26th P. V. M., Col. Jennings, was sent up the road, "
             "and when about three miles from town the rebel cavalry came upon them, capturing some forty of the regiment. The balance got off, but at the time of writing (Saturday noon) we are not advised of their "
             "whereabouts. At about 3 o'clock, sure enough, the rebel advance (cavalry) entered Gettysburg, charging up Chambersburg street at a rapid rate, in pursuit of a number of persons on horseback who were "
             "hurrying off down York street. They fired a few shots, and the pursued were halted. In a few moments they had entire possession of the town, and their guards around it. ... This advance consisted of about "
             "one hundred and fifty men - White's cavalry. In half an hour afterwards a (Georgia) brigade of infantry entered the town - Gen. Early in command.")
CMP_QUARTER = ("Probably half of them quartered in town - in the Court-house and on the pavements - the balance in the neighborhood. In the evening several hundred more cavalry came in; also a battery of artillery. "
               "We are told that another battery, with infantry and baggage wagons, encamped on the Mummasburg road, a mile from town.")
CMP_BRIDGE = ("The railroad bridge across Rock creek was soon set on fire by the rebels, and whilst in a blaze a number of cars were ignited and started down the track, but they passed over the bridge and were "
              "consumed just beyond. Altogether, we are told that seventeen cars were burnt, one belonging to W. E. Bittle, one to the Hanover Branch, two to Stein & Young, two to the Northern Central, and the balance to "
              "the Pennsylvania Central Railroad. The centre span of the bridge was burnt and fell in.")

ROWS = []

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-001
ROWS.append(dict(
    id='T1-001', verdict='confirmed',
    claim=claim('Hooker cuts the medical department transport to about two wagons a brigade, against the Medical Director\'s opinion',
                'Army of the Potomac, Medical Department (Surg. J. Letterman, Medical Director)',
                'Army on the march from before Fredericksburg toward the Potomac; headquarters near Fairfax Court-House, Va.',
                'Jun 19, 1863 (a day, no hour)', 'Letterman, OR27-1-R016 p.195: "On June 19, while the army was on the march"',
                'On June 19, 1863, while the army was on the march, Major-General Hooker cut the medical department\'s transport to an average of two wagons in a brigade, against the Medical Director\'s opinion given verbally and in writing. '
                'The reduction forced the department to turn in a large part of its supplies and tents; at Gettysburg shelter was less abundant than necessary because of the reduced transport.',
                'documented', '1863-06-19T00:00', '1863-06-19T23:59'),
    subs=[
        ('Hooker cut the department\'s transport to an average of two wagons in a brigade (the same report also says three wagons were assigned to a brigade of 1,500 men)', 'documented', 'supported', ['c1', 'c4']),
        ('This was against the Medical Director\'s opinion, expressed verbally and in writing', 'documented', 'supported', ['c1']),
        ('Date: June 19, 1863, while the army was on the march (before the Jun 26 start of the theatre clock)', 'documented', 'supported', ['c3']),
        ('The reduction forced the turning in of a large portion of the supplies and tents needed for the care of the wounded in a battle', 'documented', 'supported', ['c2']),
        ('At Gettysburg shelter and supplies for the wounded were less abundant than necessary because of the reduced transport (the report does not call this an ambulance shortage)', 'documented', 'supported', ['c5']),
    ],
    cites={
        'c1': OR('the transportation of the department was cut down by Major-General Hooker on an average of two wagons in a brigade, in oppposition to my opinion, expressed verbally and in writing', R16, '195'),
        'c2': OR('This reduction necessitated the turning in of a large portion of the supplies', R16, '195'),
        'c3': OR('On June 19, while the army was on the march', R16, '195'),
        'c4': OR('Three wagons were assigned to a brigade of 1,500 men', R16, '195'),
        'c5': OR('although not as abundant as necessary on account of the reduced transportation', R16, '199'),
    },
    remains=[], searched=['OR27-1-R016 (Letterman) read in full, pp.195-199; every sub-claim is in the report text'],
    recheck='none needed: the stored quote was found at OR27-1-R016 p.195 (OR-RECHECK). The date (June 19) is added from the text; the seed note "ambulance shortage" is shown as the report words it (supplies and shelter short).'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-002
ROWS.append(dict(
    id='T1-002', verdict='confirmed',
    claim=claim('Stuart leaves Salem Depot on the ride around the Union army; Federal infantry blocks the planned route',
                'Stuart\'s three cavalry brigades (Hampton, Fitz. Lee, W. H. F. Lee/Chambliss); Robertson\'s and Jones\' brigades left in Virginia',
                'Salem Depot, Va., then Thoroughfare Gap and Haymarket, Va.',
                'Night of Jun 24-25: rendezvous on the night of the 24th, brigades moved out at 1 o\'clock at night (Jun 25, about 01:00)',
                'Stuart, OR27-2-R565 p.692: "At 1 o\'clock at night, the brigades with noiseless march moved out"',
                'About 01:00 on Jun 25 Stuart\'s three brigades (Hampton, Fitz. Lee, W. H. F. Lee) moved out from their secret rendezvous near Salem Depot; Hancock\'s infantry corps was in Thoroughfare Gap and then marching through Haymarket and had the right of way on his road, so the planned route was blocked. '
                'Robertson\'s and Jones\' brigades stayed in Virginia. Lee\'s army had no main cavalry on the approach to Gettysburg (Lee: its movements were "much embarrassed" by the absence), and Stuart\'s advance reached Gettysburg on Jul 2. Jenkins\' brigade (with Ewell\'s corps) and Imboden (on Ewell\'s left in the Valley) operated separately.',
                'documented', '1863-06-25T00:30', '1863-06-25T23:59'),
    subs=[
        ('On the night of the 24th Hampton\'s, Fitz. Lee\'s and W. H. F. Lee\'s brigades rendezvoused secretly near Salem Depot and at 1 o\'clock at night moved out (about 01:00 on Jun 25)', 'documented', 'supported', ['rend', 'move']),
        ('Federal infantry blocked the planned route: Hancock\'s corps occupied Thoroughfare Gap and was marching through Haymarket; Hancock had the right of way on Stuart\'s road', 'documented', 'supported', ['hanc', 'hanc2', 'hanc3']),
        ('Robertson\'s and Jones\' brigades were left in observation of the enemy on the usual front', 'documented', 'supported', ['rob']),
        ('Lee\'s army lacked its main cavalry on the approach to Gettysburg: Lee says the absence of the cavalry made accurate information impossible and embarrassed the movements before the battle', 'documented', 'supported', ['lee307', 'lee321']),
        ('Stuart\'s advance reached Gettysburg on July 2', 'documented', 'supported', ['arr']),
        ('Jenkins\' cavalry operated apart from Stuart, advancing toward Harrisburg ahead of Rodes\' division at Carlisle', 'documented', 'supported', ['jenk']),
        ('Imboden operated separately on the left of Ewell\'s advance (Baltimore and Ohio Railroad raid)', 'documented', 'supported', ['imb']),
    ],
    cites={
        'rend': OR('the following brigades, Hampton\'s. Fitz. Lee\'s. andW. H. F. Lee\'s, rendezvoused secretly near Salem Depot', R565, '692'),
        'move': OR('At 1 o\'clock at night, the brigades with noiseless march moved out', R565, '692'),
        'hanc': OR('Hancock\'s corps occujjii\'d Thoroughfare Gaj)', R565, '692'),
        'hanc2': OR('we found thai Hancock\'s corps was en roiiie through Hay Market for Gum Springs', R565, '692'),
        'hanc3': OR('As Hancock had the right of way on my road', R565, '692'),
        'rob': OR('brigades, under command of the former, were left in observation of the enemy on tbe usual front', R565, '692'),
        'lee307': OR('and the absence of the cavalry rendered it impossible to obtain accurate information', R426, '307'),
        'lee321': OR('The movements of the army preceding the battle of Gettysburg had been much embarra.ssed by the absence of the cavalry', R426, '321'),
        'arr': OR('My advance reached Gettysburg July 2, just in time to thwart a', R565, '697'),
        'jenk': OR('On our arrival at Carlisle, Jenkins\' cavalry advanced toward', R506, '551'),
        'imb': OR('had been actively engaged on the left of General Ewell during the', R426, '307'),
    },
    remains=[], searched=['OR27-2-R565 (Stuart) pp.692-697 read; OR27-2-R426 (Lee) searched for the cavalry and Imboden passages; OR27-2-R506 (Rodes) read for Jenkins'],
    recheck='none needed: both stored quotes were found at OR27-2-R565 p.692 (OR-RECHECK). The context clauses of the seed row (route blocked, no cavalry screen until Jul 2, the separate commands) are now each tied to a passage.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-003
ROWS.append(dict(
    id='T1-003', verdict='partially_supported',
    claim=claim('Rain on the night of Jun 25 and through Jun 26 at Gettysburg and on the Cashtown road; roads wet and muddy',
                'Environment (Gettysburg area, Cashtown road)', 'Gettysburg area and the Chambersburg-Gettysburg turnpike',
                'Night of Jun 25 (evening on) through Jun 26 (rain "most of the day"); clock hours of the start and the end are not documented',
                'Early, OR27-2-R470 p.465 (the day was rainy, roads very muddy); Jacobs 1864 pp.14 and 16 (heavy rain that night; rain most of the day)',
                'Jun 26: a rainy day with very muddy roads (Early) and rain "during the most of the day" at Gettysburg (Jacobs), after a heavy rain on the night of Jun 25 (Jacobs). '
                'NOT documented and shown as marked gaps: the start (08:00 Jun 25) and end (07:00 Jun 27) of the rain, "cold", and the thermometer readings 60 F (07:00), 63 F (14:00), 62 F (21:00). '
                'The readings stay a marked plausible-procedural value of the weather model, not a record.',
                'documented', '1863-06-25T18:00', '1863-06-26T23:59',
                marking='rain and mud: documented; temperature values: plausible-procedural (original readings not read); hours of the rain: gap'),
    subs=[
        ('Rain on Jun 26: Early calls it a rainy day with very muddy roads; Jacobs says the Rebels were wet from the rain that fell during most of the day', 'documented', 'supported', ['rainy', 'jac_wet']),
        ('The mud slowed the march: Early\'s infantry was considerably delayed by the muddy condition of the roads', 'documented', 'supported', ['mud']),
        ('Heavy rain on the night of Jun 25 at Gettysburg (it kept 100 picked men of the 26th Pennsylvania from the mountain)', 'documented', 'supported', ['jac_night']),
        ('Rain at Williamsport on Jun 26 (a South Carolina regiment forded the Potomac in a rain)', 'documented', 'supported', ['will']),
        ('Rain began at 08:00 on Jun 25 and ended at 07:00 on Jun 27', 'open gap', 'unsupported', []),
        ('Cold weather with 60 F at 07:00, 63 F at 14:00 and 62 F at 21:00', 'plausible-procedural', 'unsupported', []),
    ],
    cites={
        'rainy': OR('The day was rainy and the roads very muddj\'.', R470, '465'),
        'mud': OR('whose march was considerably delayed by the muddy condition of the roads', R470, '465'),
        'jac_wet': L('JACOBS-1864', 'Being wet from the rain which had fallen during the most of the day'),
        'jac_night': L('JACOBS-1864', 'the heavy rain of that night caused them to be detained until the balance of the regiment arrived'),
        'will': OR('fording the Potomac in a rain at that point', 'OR27-2-R433', '371'),
    },
    scenarios=[],
    remains=['start (08:00 Jun 25) and end (07:00 Jun 27) of the rain', 'the word "cold" and the temperatures 60 F / 63 F / 62 F (readings of M. Jacobs, original sheets not read)'],
    searched=[
        'Library, whole 108-text set, regex thermomet|Fahrenheit|meteorolog|barometer: no reading for Jun 25-30 1863 (hits are 1862-64 Virginia winter, Jul-Aug 1863 Adams Sentinel and unrelated)',
        'Jacobs 1864 (JACOBS-1864) read in full from p.11 to p.25: rain Jun 25 night and Jun 26, no thermometer table',
        'OR vol.27 pts 1-3, sentence-level scan for rain, mud, dust, heat, cold within one sentence of a Jun 25-30 date: the Jun 26 hits are Early p.465 and Maffett p.371; none gives a temperature',
        'Gettysburg Star and Sentinel Aug 1885 (Jacobs readings): archive.org advancedsearch identifier per_the-star-and-sentinel_1885* returned 0 items (run covers 1867-71 only); Gettysburg Compiler Jul-Aug 1885, 8 issues searched for meteorolog|thermomet|Jacobs: no article (recorded in closeout/acquired_tl01.json)',
        'loc.gov item 02010458 (Jacobs 1864): HTTP 403, not circumvented (tl-01-LK-05)'],
    recheck='OR-RECHECK-2 (not_found: no OR citation) applied: the row now carries OR and library citations for the rain and mud of Jun 26 and the night of Jun 25; the readings stay open.',
    register=reg('Jun 26 weather: temperatures and the hours of the rain not found in any text read',
                 'The thermometer readings of M. Jacobs are known only through secondary summaries; the 1864 Notes carry no table; the 1885 publication is not on archive.org; loc.gov refused (HTTP 403).',
                 'Rain on the night of Jun 25 and on Jun 26 with muddy roads (documented); temperatures as a range around the secondary values, marked plausible-procedural',
                 'plausible-procedural', competing='PDF Table 1: rain began 08:00 Jun 25; Jacobs 1885 text in data-src: 8 p.m.; Jacobs 1864: the heavy rain of that night (night of Jun 25)',
                 impact='wet ground and no dust on Jun 26 (documented); air temperature only as a marked range',
                 ask='Fetch the Jacobs 1885 article or the Smithsonian observation sheets, or accept the marked range (delegated default: accepted, reversible)',
                 subst='weather_timeline.json range with the tier glyph', rids='R15, R03'),
    related=['tl-01-EG-001']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-004
ROWS.append(dict(
    id='T1-004', verdict='partially_supported',
    claim=claim('Early\'s division marches from its camp at Greenwood toward Gettysburg on the morning of Jun 26',
                'Early\'s division (Ewell\'s II Corps), with White\'s cavalry battalion attached; ambulances, medical wagons and 15 empty wagons only', 'Greenwood on the Chambersburg-Gettysburg turnpike, then the forks of the road about 1.5 miles from Cashtown',
                'Morning of Jun 26 (the hour is not stated)', 'Early, OR27-2-R470 p.465: "on the morning of the 2Gth ... I moved toward Gettysburg"',
                'On the morning of Jun 26 Early moved the division from its camp at Greenwood toward Gettysburg, trains sent back to Chambersburg except ambulances, one medical wagon a brigade, ordnance wagons, cooking wagons and 15 empty wagons; the roads were muddy and the day rainy. '
                'NOT documented: the 08:00 start, "cold" rain, and "west of Cashtown" as the camp (the report puts the camp at Greenwood).',
                'documented', '1863-06-26T00:00', '1863-06-26T12:00',
                marking='morning of Jun 26: documented; 08:00 and cold: gap'),
    subs=[
        ('On the morning of the 26th Early moved toward Gettysburg from the camp at Greenwood on the turnpike (the division had stayed in camp there on the 25th)', 'documented', 'supported', ['morn', 'camp']),
        ('Trains were sent back to Chambersburg, only ambulances, one medical wagon a brigade, regimental ordnance wagons, one cooking wagon a regiment and 15 empty wagons going forward', 'documented', 'supported', ['morn']),
        ('The roads were very muddy and the day rainy; the infantry march was considerably delayed', 'documented', 'supported', ['mud', 'rainy']),
        ('The column left at about 08:00', 'open gap', 'unsupported', []),
        ('The rain was cold', 'open gap', 'unsupported', []),
    ],
    cites={
        'morn': OR('and on the morning of the 2Gth, having sent all my trains to Chambersburg', R470, '465'),
        'camp': OR('At this i)uint, my division remained in camp on the 25th', R470, '464'),
        'mud': OR('whose march was considerably delayed by the muddy condition of the roads', R470, '465'),
        'rainy': OR('The day was rainy and the roads very muddj\'.', R470, '465'),
    },
    remains=['the 08:00 start (Early says only "the morning")', 'cold'],
    searched=['OR27-2-R470 (Early) read in full pp.459-474; OR27-2-R477 (Gordon) pp.491-493; OR vol.27 regex for "cold" within a sentence of a Jun 25-30 date: no hit',
              'Library: Pennypacker address (PA-GB-1914-v2 p.783) says the division started from Greenwood on the morning of Jun 26, no hour',
              'Jacobs 1864 pp.14-16: no hour for Early\'s start'],
    recheck='OR-RECHECK: both quotes found at p.465 and p.464. OR-RECHECK shard note "08:00 not in the OR" applied: the hour is withdrawn from the displayed claim and registered.',
    register=reg('Hour of Early\'s start on Jun 26 and the cold of the rain', 'No text read gives the hour; Early says "the morning".', 'Morning of Jun 26, hour unspecified; rain and mud documented', 'inferred',
                 competing='seed 08:00 (no source) against "morning" (Early)', impact='column departure time on the screen is a window, not a minute', ask='none: a later source with the hour would replace the window', rids='R11, R07'),
    related=['tl-01-EG-001']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-005
ROWS.append(dict(
    id='T1-005', verdict='partially_supported',
    claim=claim('Thaddeus Stevens\' Caledonia iron works (furnace, forge, rolling-mill, shops) burned by Confederate cavalry of Early\'s command',
                'Col. French\'s 17th Virginia Cavalry detachment (Jenkins\' brigade), ordered by General Early (Jenkins\' cavalry had visited the works on Jun 23)',
                'Stevens\' iron works at Caledonia, Franklin County, on the Chambersburg-Gettysburg turnpike (the Adams Sentinel puts it 15 miles west of Gettysburg)',
                'Date in conflict, no hour: Thursday Jun 25 (Tribune letter and Adams Sentinel) or Friday Jun 26 (Gettysburg Compiler, "on Friday")',
                'Adams Sentinel Jul 21 1863 p.3 and Sep 8 1863 p.2 (Thursday); Gettysburg Compiler Jun 29 1863 p.2 (Friday)',
                'The works were burned by the rebels: the Gettysburg Compiler of Jun 29 says on Friday (Jun 26) on their route hitherward; the Adams Sentinel (Jul 21 and Sep 8 1863) puts General Early at the works on Thursday Jun 25 and has Col. French\'s cavalry apply the torch, the buildings reduced to ashes, '
                'loss "not less than $50,000". Both dates are carried as scenarios, no default. NOT documented: the hour, the place "about 2 miles out from camp", and any construction-schedule detail.',
                'documented', '1863-06-25T06:00', '1863-06-26T23:59',
                marking='event: documented from newspapers of the time; date: two scenarios; hour and distance from camp: gap'),
    subs=[
        ('The works of Thaddeus Stevens at Caledonia were burnt by the rebels', 'documented', 'supported', ['cmp_stevens', 'sen_where']),
        ('Date, Compiler: on Friday (Jun 26), on the rebels\' route hitherward', 'documented', 'conflict', ['cmp_stevens']),
        ('Date, Adams Sentinel / Tribune letter: Early took possession of the works on Thursday (Jun 25) and the destruction began; the Jul 21 account has him return the day after his Wednesday visit and detail Col. French to apply the torch', 'documented', 'conflict', ['trib', 'sen_french']),
        ('Col. French of Jenkins\' command carried out the burning (French\'s 17th Virginia Cavalry had reported to Early on Jun 22 and stayed with him)', 'documented', 'supported', ['sen_french', 'early_french']),
        ('Place: about 15 miles west of Gettysburg (Sentinel); "about 2 miles out from camp" (seed)', 'documented', 'conflict', ['sen_where']),
        ('Time of day of the burning', 'open gap', 'unsupported', []),
    ],
    cites={
        'cmp_stevens': CMP("route hitherward, on Friday. The thirty-six prisoners of", CMP_STEVENS),
        'sen_french': L('ADAMS-SENTINEL-1863-07-21', 'but returned the next day, and peisonJly detailed Col French, of Jenkins\' guerillas, with his command',
                         reading='He then returned to Greenwood, where he had his head-quarters, but returned the next day, and personally detailed Col. French, of Jenkins\' guerillas, with his command, to illustrate southern chivalry and humanity by applying the torch to the private property of Mr. Stevens ... The work of destruction was well done, and soon all the works were in ashes.', image_check=IMG_S3),
        'sen_where': L('ADAMS-SENTINEL-1863-07-21', 'Thadileus fjU\'vens, 15 in lies wust of\' this- pl.icu',
                        reading='The only private property destroyed by the order of an officer in the valley was the extensive Iron Works of Hon. Thaddeus Stevens, 15 miles west of this place. They consisted of a large charcoal Furnace, Forge, Rolling-Mill, coal-house, shops, &c. On Tuesday the 23d a portion of Jenkins\' cavalry came upon the works ...', image_check=IMG_S3),
        'trib': L('ADAMS-SENTINEL-1863-09-08', 'This occurred on Tuesday, the 23d of June. On Thursday the enemy a«ain returned, when General Earloy took possession of the works and told the manager that they were to be tot.illy de.s-',
                   reading='This occurred on Tuesday, the 23d of June. On Thursday the enemy again returned, when General Earley took possession of the works and told the manager that they were to be totally destroyed. ... The work of destruction was then commenced. The large smelting furnace, two forges, a puddling-mill, the rolling-mill, saw mill, blacksmith shops, store houses, wagon-houses, and sheds were reduced to ashes. (a correspondent of the Tribune, reprinted)', image_check=IMG_S2),
        'early_french': OR('The Seventeenth Virginia Cavalry, under Col. William H. French, of Jenkins\' brigade, reported to me on this day', R470, '464'),
    },
    scenarios=[
        sc('A', 'Burned on Friday, Jun 26, on the rebels\' route to Gettysburg', 'Gettysburg Compiler Jun 29 1863 p.2 (printed three days after); also the seed date', 'documented', ['cmp_stevens']),
        sc('B', 'Destruction begun Thursday, Jun 25 (Early took possession of the works on Thursday)', 'Adams Sentinel Sep 8 1863 p.2 (Tribune correspondent) and Jul 21 1863 p.3 (written weeks after the event); Early\'s own report has his division in camp at Greenwood on Jun 25 and himself at Chambersburg that day (R470 p.464), so the two accounts cannot both be exact', 'documented', ['trib', 'sen_french']),
    ],
    remains=['hour of the burning', 'distance "about 2 miles from camp"', 'which date is right (Jun 25 or Jun 26)'],
    searched=['OR vol.27 pts 1-3, regex Caledonia|Stevens.{0,12}(iron|furnace|works|forge)|iron.?works: pt1 13, pt2 13, pt3 6 hits, all Jul 5 (Stevens\' Furnace skirmish), the Itinerary and the index; none for Jun 25-26 (search_log 2026-11-13T18:59)',
              'Library (108 texts) same regex: Adams Sentinel 1863-07-21 and 1863-09-08 (burning, read on the page images), Compiler 1863-06-29 (read on the page image), Meade letter (cavalry at Caledonia Iron Works Jul 4), PA-GB-1904/1914 (Jul 5-6 skirmish): the three newspaper accounts are the only Jun 1863 accounts',
              'Early OR27-2-R470 pp.464-466 read: no mention of the works; French\'s 17th Virginia Cavalry reported to him Jun 22',
              'web lookup tl-01-LK-02 (modern markers and blogs, no primary): failed, recorded'],
    recheck='OR-RECHECK-2 (not_found in the OR) applied: the row now rests on the three 1863 newspaper accounts read on their page images, not on the OR; the OR has nothing for Jun 25-26.',
    register=reg('Caledonia iron works: date (Jun 25 or Jun 26), hour and distance from camp', 'Two 1863 newspaper accounts disagree on the day and no report of the burning from Early\'s command is in the OR.',
                 'Burned by French\'s cavalry on the orders of General Early, Jun 25 or Jun 26; shown with both scenarios', 'documented',
                 competing='Friday Jun 26 (Compiler, Jun 29) / Thursday Jun 25 (Tribune letter and Adams Sentinel) / seed Jun 26 after 08:00',
                 impact='the burning of a building complex is placed in a window of two days; no hour is drawn', ask='none: both scenarios stay selectable, no default',
                 subst='structure-fire event shown in the 2-day window with both sources named', rids='R14, R05'),
    related=['tl-01-EG-005']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-006
ROWS.append(dict(
    id='T1-006', verdict='partially_supported',
    claim=claim('Early learns that a force may be at Gettysburg and splits his column at the forks 1.5 miles from Cashtown',
                'Gordon\'s brigade with White\'s 35th Virginia Cavalry Battalion (on the pike); Early with the rest (Hays, Hoke, Smith, artillery) by Hilltown to Mummasburg; French\'s 17th Virginia Cavalry with him',
                'Forks of the road about 1.5 miles from Cashtown on the Chambersburg-Gettysburg pike; Hilltown; Mummasburg',
                'Morning of Jun 26 (no hour)', 'Early, OR27-2-R470 p.465; Gordon, OR27-2-R477 p.491',
                'At the forks about 1.5 miles from Cashtown Early sent Gordon\'s brigade and White\'s cavalry on the pike through Cashtown toward Gettysburg and moved with the rest of the division to the left through Hilltown to Mummasburg, to get on the flank and rear of the force he had heard was probably at Gettysburg (size unknown). '
                'Gordon\'s own report confirms he was detached on a different road with White\'s battalion. NOT documented: that Early knew the force was militia; Gordon\'s strength of about 1,900; the name "Comanches".',
                'documented', '1863-06-26T00:00', '1863-06-26T12:00', marking='split and route: documented; militia identity, 1,900 and the nickname: gap'),
    subs=[
        ('At the forks about 1.5 miles from Cashtown Early sent Gordon with his brigade and White\'s battalion of cavalry on the pike through Cashtown, and went himself with the rest by Hilltown to Mummasburg', 'documented', 'supported', ['split', 'route']),
        ('Early had heard on the road that there was probably a force at Gettysburg, size unknown; the object was for Gordon to amuse and skirmish while Early got on the flank and rear to capture the whole force', 'documented', 'supported', ['heard', 'object']),
        ('Gordon\'s own report: detached from the division, ordered on a different road with a battalion of cavalry under Lt. Col. White', 'documented', 'supported', ['gord']),
        ('Early learned that the force in Gettysburg was militia before splitting the column', 'open gap', 'unsupported', []),
        ('Gordon\'s brigade strength about 1,900', 'open gap', 'unsupported', []),
        ('White\'s battalion called the "Comanches"', 'open gap', 'unsupported', []),
    ],
    cites={
        'split': OR('I sent General Gordon, with his brigade and White\'s battalion of cavalry', R470, '465'),
        'route': OR('moved with the rest of the command to the left, through Hill town to Mummasburg', R470, '465'),
        'heard': OR('I had heard on the road that there was probably a force at Gettysburg', R470, '465'),
        'object': OR('the object of this movement was for Gordon to amuse and skirmish with ihe enemy while I should get on his flank and rear', R470, '465'),
        'gord': OR('ordered on a different road, with a battalion of cavalry', R477, '491'),
    },
    remains=['that Early learned the force was militia before the split (his report says only "probably a force")', 'Gordon\'s strength about 1,900', 'the nickname "Comanches"'],
    searched=['OR27-2-R470 pp.465-466 and OR27-2-R477 pp.491-493 read in full',
              'OR vol.27 pts 1-3 regex Gordon.{0,200}(1,9\\d\\d|1900|1,8\\d\\d): no brigade-strength statement for Jun 26 (hits are index pages); Gordon reports about 1,200 men carried into action on Jul 1 (R477 p.493)',
              'Library (108 texts) regex Comanche: no hit connected to White\'s battalion (Mexican-border and Indian-war hits only)'],
    recheck='OR-RECHECK: both quotes found (p.465, p.491). Shard note "Early does not say he learned the militia is in Gettysburg" applied: Early\'s own words ("probably a force at Gettysburg") replace the row wording.',
    register=reg('Early\'s knowledge of militia, Gordon\'s strength (about 1,900), nickname "Comanches"', 'Not in the report text of Early or Gordon; no other source read gives them.',
                 'Split and routes documented; strength as a range around Gordon\'s 1,200 in action on Jul 1 plus the detached regiment (inferred)', 'inferred',
                 competing='1,900 (seed) against 1,200 carried into action on Jul 1 with one regiment detached (Gordon)', impact='block size of Gordon\'s brigade on the Jun 26 march', ask='none; the strength stays a range with its basis', rids='R04, R10'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-007
ROWS.append(dict(
    id='T1-007', verdict='corrected',
    claim=claim('The 26th Pennsylvania Emergency Militia reaches Gettysburg: scenarios (night of Jun 25 / morning of Jun 26)',
                '26th Pennsylvania Emergency (Militia) Infantry (Col. W. W. Jennings), 735 to 900 men', 'Gettysburg (the regiment was held up at Swift Run, 6 miles below, by a railroad accident)',
                'Night of Jun 25 to about 09:00 Jun 26 (the sources differ)', 'Early OR27-2-R470 p.465; Jacobs 1864 p.14; Compiler Jun 29 1863; Pennypacker (PA-GB-1914-v2 p.786); regimental monument text',
                'The regiment started for Gettysburg by rail on Jun 24 and was held up at Swift Run (6 miles below) by a railroad accident; a detail of 100 men reached the town on the evening of Jun 25 and the regiment came in on the morning of Jun 26 (Jacobs: 9 a.m., from its camping ground, not by train). '
                'Early says the regiment had arrived the night before (Jun 25); the regiment\'s own monument text says it reached Gettysburg June 25. The seed reading (by train, about 09:00) is not supported as a train arrival. Scenarios carried, no default.',
                'documented', '1863-06-25T18:00', '1863-06-26T10:30'),
    subs=[
        ('Held up by a railroad accident at Swift Run, 6 miles below Gettysburg, on the way up (train off the track after striking a cow, per the Compiler); the regiment encamped on the spot', 'documented', 'supported', ['cmp_swift', 'penny_acc', 'rich_acc']),
        ('Scenario A: the regiment reached the town on the morning of Jun 26, at 9 a.m., from its camping ground', 'documented', 'conflict', ['jac_9', 'cmp_swift', 'penny_100']),
        ('Scenario B: it had arrived the night before (Jun 25); regimental monument: reached Gettysburg June 25', 'documented', 'conflict', ['early_night', 'mon_25']),
        ('A detail of 100 picked men came up to Gettysburg on the evening of Jun 25 and the rest of the regiment joined them on the morning of Jun 26', 'documented', 'supported', ['jac_100', 'penny_100']),
        ('The arrival was by train (seed)', 'documented', 'contradicted', ['jac_9', 'cmp_swift']),
    ],
    cites={
        'early_night': OR('had arrived in Gettysburg the night before, and moved that morning a', R470, '465'),
        'jac_9': L('JACOBS-1864', 'The 26th regiment arrived at Gettysburg, from their camping-ground, at 9 a. m.'),
        'jac_100': L('JACOBS-1864', 'Thursday, June 25. Late on Thursday evening, however, 100 picked'),
        'cmp_swift': CMP('regiment encamped on the spot, and cam, to', 'The 26th Regiment P. V. M. was expected to arrive here on Wednesday evening. But upon the train passing Swift Run, a short distance below Goulden\'s Station, the locomotive struck a cow, which threw the machine and a number of the cars off the track. This promising to cause considerable delay, the regiment encamped on the spot, and came to town on Friday morning.'),
        'penny_acc': L('PA-GB-1914-v2', 'started for Gettysburg on the 24th, but meeting with a railroad accident it was detained at Swift run, six miles away from its destination'),
        'penny_100': L('PA-GB-1914-v2', 'The following evening a detail of one hundred men marched into the town where they were joined by the rest of the regiment on the morning of the 26th'),
        'rich_acc': L('BL-3', 'A railroad accident prevented this plan from being carried into effect, and kept us from reaching Gettysburg until the 26th'),
        'mon_25': L('PA-GB-1914-v2', 'Reached Gettysburg June 25 in advance of the Army of the Potomac'),
    },
    scenarios=[
        sc('A', 'Regiment (less the advance detail) arrives the morning of Jun 26, about 09:00, from its camp at Swift Run (not by train for the last six miles)', 'Jacobs 1864 p.14 (9 a.m.), Compiler Jun 29 (came to town on Friday morning), Pennypacker 1892 (rest joined on the morning of the 26th), Richards (BL-3: did not reach Gettysburg until the 26th)', 'documented', ['jac_9', 'cmp_swift', 'penny_100', 'rich_acc']),
        sc('B', 'Regiment arrived the night before, Jun 25, and moved out the next morning', 'Early OR27-2-R470 p.465 (Confederate report, hearsay from prisoners); regimental monument text "Reached Gettysburg June 25" (PA-GB-1914-v2); both may refer to the 100-man detail of the evening of Jun 25', 'documented', ['early_night', 'mon_25']),
    ],
    remains=[],
    searched=['OR27-2-R470 p.465 read; Compiler 1863-06-29 p.2 read on the page image; Jacobs 1864 pp.13-14; Pennypacker address PA-GB-1914-v2 pp.783-788 and the 26th Pennsylvania monument text read; H. M. M. Richards in Battles and Leaders vol.3 read'],
    recheck='OR-RECHECK-found quote kept; shard verdict "conflict" applied: the OR says the night before, the seed says about 09:00 by train; the newspaper and regimental sources now explain both (advance detail on the evening of Jun 25, regiment on the morning of Jun 26; derailment at Swift Run).'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-008
ROWS.append(dict(
    id='T1-008', verdict='corrected',
    claim=claim('Major Haller orders the 26th Pennsylvania Militia out the Chambersburg pike, with Bell\'s cavalry',
                '26th Pennsylvania Emergency Militia (Col. Jennings) and Capt. Robert Bell\'s Adams County Cavalry (later Co. B, 21st Pennsylvania Cavalry); Maj. G. O. Haller commanding the post',
                'Chambersburg (Cashtown) pike west of Gettysburg, to a camp about 3 to 3.5 miles out',
                'Jun 26 at 10:00 (Richards) or 10:30 (Jacobs): window 10:00-10:30', 'Richards (Battles and Leaders vol.3) and Jacobs 1864 p.14',
                'On the morning of Jun 26 Major Granville O. Haller, commanding the post, sent the 26th Pennsylvania Militia out on the Chambersburg pike against Colonel Jennings\' remonstrance; Major Robert Bell\'s troop of horse accompanied it. The hour is 10 a.m. (Richards, a company A member) or 10:30 a.m. (Jacobs); both carried. '
                'The purpose "to delay the Confederates" is not stated in these accounts (Jacobs calls the order a suicidal movement).',
                'documented', '1863-06-26T10:00', '1863-06-26T10:30'),
    subs=[
        ('Major Haller (commanding the post) ordered the regiment forward on the Chambersburg turnpike, against the earnest remonstrances of Colonel Jennings', 'documented', 'supported', ['jac_hall', 'rich_10']),
        ('Hour: 10 a.m. (Richards) or 10:30 a.m. (Jacobs: "10 J a. m.")', 'documented', 'conflict', ['rich_10', 'jac_hall']),
        ('Capt./Maj. Robert Bell\'s troop of horse (Adams County Cavalry, later Co. B, 21st Pennsylvania Cavalry) accompanied the regiment', 'documented', 'supported', ['rich_bell', 'haller_bell', 'mon_b']),
        ('Place: about three and a half miles out on the Chambersburg pike (Richards), about three miles west (Jacobs), where the regiment halted and threw out pickets', 'documented', 'supported', ['rich_10', 'jac_3mi']),
        ('The order was given in order to delay the Confederates', 'inferred', 'unsupported', []),
    ],
    cites={
        'jac_hall': L('JACOBS-1864', 'by order of Major Haller, although contrary to the earnest remonstrances of Jennings, Colonel of the regiment, was sent forward, at 10 J a. m., on the Chambersburg turnpike'),
        'jac_3mi': L('JACOBS-1864', 'But advancing to the distance of about three miles westward, our little band encamped, and threw out their pickets.'),
        'rich_10': L('BL-3', 'we were marched out on the Chambersburg pike at 10 A. M., June 26th'),
        'rich_bell': L('BL-3', 'Major Robert Bell, who commanded a troop of horse'),
        'haller_bell': OR('Captain [RohertJ Bell, of the Adams County Cavalry', 'OR27-2-S18-02', '999'),
        'mon_b': L('PA-GB-1914-v2', 'an ad vance scout of company of volunteer cavalry afterwards Co. B 21st Penn sylvania Cavalry'),
    },
    scenarios=[
        sc('A', 'Marched out at 10:00 a.m.', 'Richards, Company A, 26th Pennsylvania Militia (Battles and Leaders, 1887)', 'documented', ['rich_10']),
        sc('B', 'Sent forward at 10:30 a.m.', 'Jacobs 1864 p.14 (eyewitness at Gettysburg)', 'documented', ['jac_hall']),
    ],
    remains=['that the order was meant to delay the Confederates (inferred; no passage states the purpose)'],
    searched=['OR27-2-S18-02 (Haller, Wrightsville report pp.994-999) read: names Capt. Robert Bell of the Adams County Cavalry, says nothing of Jun 26 orders',
              'Jacobs 1864 p.14; Richards in BL-3; Compiler 1863-06-29 p.2 (Bell\'s cavalry officers; Haller swearing the company in); PA-GB-1914-v2 monument text read',
              'OR vol.27 pts 1-3 for "Haller" and "Jennings": nothing about Jun 26 beyond Early p.465'],
    recheck='OR-RECHECK-2 / shard note applied: the Haller report in S18-02 (p.997) does not mention the Jun 26 order (only Bell\'s unit and Jun 28 scouting); the 10:30 hour is carried with the 10:00 hour as two scenarios, from the two witnesses.',
    register=reg('Purpose of Haller\'s order of Jun 26', 'Jacobs and Richards state the order, the hour and the officer, not an aim.', 'Order, hour window and units documented; aim not shown as fact', 'inferred',
                 competing='10:00 (Richards) against 10:30 (Jacobs)', impact='none beyond the 30-minute window', ask='none', rids='R11, R16'),
    related=['tl-01-EG-004']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-009
ROWS.append(dict(
    id='T1-009', verdict='partially_supported',
    claim=claim('The militia camp about three miles out the pike; the regiment withdraws when White\'s cavalry is sighted',
                '26th Pennsylvania Militia (Jennings) with Bell\'s cavalry vs White\'s 35th Virginia Cavalry Battalion', 'Chambersburg pike about 3 to 3.5 miles west of Gettysburg (Marsh Creek area); the retreat ran across the fields toward Hunterstown',
                'Jun 26, from the arrival at about 10:30-11:00 to about 15:00 (Jacobs: at about 3 p.m. the Rebels in force appeared)', 'Early OR27-2-R470 p.465; Jacobs 1864 p.14; Richards (BL-3); Pennypacker (PA-GB-1914-v2)',
                'The regiment went three to three and a half miles out the pike, halted, threw out pickets and encamped; at about 3 p.m. the Rebels in force appeared and captured nearly all the pickets (40), the regiment withdrew without a fight. Early: it fled at the first approach of White\'s cavalry, taking across the fields between Mummasburg and Gettysburg toward Hunterstown. '
                'Marsh Creek is named by the regimental account; NOT documented: the clover-field camp, Knoxlyn/Wisler Ridge, the "about 2 miles off" sighting distance and the hour "midday".',
                'documented', '1863-06-26T10:00', '1863-06-26T16:00', marking='withdrawal and place: documented; clover field, Knoxlyn/Wisler Ridge, 2-mile sighting: gap'),
    subs=[
        ('The militia moved a short distance out the Cashtown road and fled on the first approach of White\'s cavalry', 'documented', 'supported', ['early_fled']),
        ('The regiment halted about three miles west, camped and threw out pickets; at about 3 p.m. the Rebels in force appeared and captured nearly all the pickets, 40 in number', 'documented', 'supported', ['jac_3mi', 'jac_3pm']),
        ('The regiment halted and was driven from the Chambersburg pike at Marsh Creek, where a shot or two was fired and pickets were lost', 'documented', 'supported', ['penny_mc', 'mon_mc']),
        ('Colonel Jennings divided the regiment into three squads to look like a large body, and the Rebels did not press', 'documented', 'supported', ['jac_squads']),
        ('Camp in a clover field, Knoxlyn / Wisler Ridge, cavalry sighted about 2 miles off, hour "midday"', 'open gap', 'unsupported', []),
    ],
    cites={
        'early_fled': OR('had fled on the first approach of White\'s cavalry', R470, '465'),
        'jac_3mi': L('JACOBS-1864', 'But advancing to the distance of about three miles westward, our little band encamped, and threw out their pickets.'),
        'jac_3pm': L('JACOBS-1864', 'At about 3 p. m., the Rebels in force made their appearance, and captured nearly all their pickets, 40 in number.'),
        'penny_mc': L('PA-GB-1914-v2', 'Driven by Early from the Chambersburg pike at Marsh creek, where a shot or two was fired and where he lost pickets'),
        'mon_mc': L('PA-GB-1914-v2', 'On the morning of June 26 marched out the Chambersburg Pike and met the Rebel Column at Marsh Creek'),
        'jac_squads': L('JACOBS-1864', 'The deception proved so far successful that the Eebels did not press them'),
    },
    scenarios=[],
    remains=['camp in a clover field; Knoxlyn / Wisler Ridge; the cavalry sighted about 2 miles off; the hour "midday"'],
    searched=['OR27-2-R470 p.465, R467 (Ewell), R477 (Gordon) read: the regiment fled on the first approach, no place names',
              'Library regex clover|Wisler|Knoxlyn|Witmer|Carnahan|Strickler|Haller, whole 108-text set: Witmer and Carnaghan only in Pennypacker (PA-GB-1914-v2) and Richards (BL-3); clover, Wisler and Knoxlyn: no hit in the Gettysburg 1863-1914 texts',
              'Jacobs 1864 pp.14-15; Pennypacker address pp.784-787; Richards (BL-3)'],
    recheck='OR-RECHECK: quote found at p.465. Shard note applied: Marsh Creek, the clover field and Knoxlyn/Wisler Ridge are not in the OR; Marsh Creek is now supported by the regimental sources, the others stay open.',
    register=reg('Clover-field camp, Knoxlyn / Wisler Ridge, hour "midday" (Jun 26 militia withdrawal)', 'None of the accounts read names these places or a midday hour (Jacobs: 3 p.m.).', 'Withdrawal at about 15:00 on the pike west of town (documented); other place names withheld', 'inferred',
                 competing='midday (seed) against about 3 p.m. (Jacobs)', impact='camp drawing and exact sighting distance', ask='none', rids='R11, R13'),
    related=['tl-01-EG-004']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-010
ROWS.append(dict(
    id='T1-010', verdict='partially_supported',
    claim=claim('White\'s cavalry charges and routs the militia; the prisoners are about three dozen (36 paroled, plus two officers)',
                'White\'s 35th Virginia Cavalry Battalion (Lt. Col. E. V. White) vs the 26th Pennsylvania Militia and pickets', 'In front of Gettysburg, on the Chambersburg pike',
                'Jun 26 afternoon (about 15:00 by Jacobs and the Compiler); no morning hour', 'Gordon OR27-2-R477 p.491; Ewell OR27-2-R467 p.443; Jacobs 1864 p.14; Compiler Jun 29 1863 p.2',
                'In front of Gettysburg the Pennsylvania militia regiment was charged and routed by White\'s cavalry battalion (Gordon); about 15:00 the Rebels in force captured nearly all the pickets, 40 (Jacobs); the Compiler counts 36 prisoners of the 26th paroled at Gettysburg and two officers taken along ("some forty" captured). '
                'The OR totals for the whole affair are 170 (Ewell) and 175 (Early). NOT documented: Co. E of the battalion under Lt. H. M. Strickler, and the raid on the abandoned camp.',
                'documented', '1863-06-26T10:30', '1863-06-26T16:30', marking='rout and counts: documented; Lt. Strickler and Co. E, the camp raid: gap'),
    subs=[
        ('White\'s cavalry battalion charged and routed the militia regiment in front of Gettysburg', 'documented', 'supported', ['gord_rout', 'ewell_rout']),
        ('About 3 p.m. the Rebels in force appeared and captured nearly all the pickets, 40 in number', 'documented', 'supported', ['jac_3pm']),
        ('The prisoners: 36 of the 26th Pennsylvania Militia were paroled at Gettysburg and two officers were taken along with the Rebels', 'documented', 'supported', ['cmp_stevens']),
        ('Whole-affair totals: 170 taken and paroled (Ewell), 175 prisoners in all (Early); these are not "about three dozen"', 'documented', 'conflict', ['ewell_rout', 'early_175']),
        ('Co. E of the battalion under Lt. H. M. Strickler made the charge, and the troopers raided the abandoned camp', 'open gap', 'unsupported', []),
    ],
    cites={
        'gord_rout': OR('a regiment of Pennsylvania militia was charged and routed by this', R477, '491'),
        'ewell_rout': OR('of whom 170 were taken and paroled', 'OR27-2-R467', '443'),
        'early_175': OR('Of this force, 175 prisoners in all were captured and subsequently paroled.', R470, '465'),
        'jac_3pm': L('JACOBS-1864', 'At about 3 p. m., the Rebels in force made their appearance, and captured nearly all their pickets, 40 in number.'),
        'cmp_stevens': CMP("route hitherward, on Friday. The thirty-six prisoners of", CMP_STEVENS),
    },
    scenarios=[
        sc('A', 'About three dozen captured (36 paroled, two officers; "some forty")', 'Gettysburg Compiler Jun 29 1863 p.2; Jacobs 1864 (40 pickets)', 'documented', ['cmp_stevens', 'jac_3pm']),
        sc('B', '170 taken and paroled (whole affair, including the pursuit)', 'Ewell OR27-2-R467 p.443', 'documented', ['ewell_rout']),
        sc('C', '175 prisoners in all, subsequently paroled', 'Early OR27-2-R470 p.465', 'documented', ['early_175']),
    ],
    remains=['Co. E under Lt. H. M. Strickler; the raid on the abandoned camp'],
    searched=['OR vol.27 pts 1-3 regex Strickler: 0 hits (Part 2 hits are Union cavalry captains of the 20th Pennsylvania in the 1864 volume); Library: same, no White\'s-battalion Strickler',
              'Gordon p.491, Early p.465, Ewell p.443 read; Compiler 1863-06-29 p.2 read on the page image; Jacobs 1864 p.14'],
    recheck='OR-RECHECK: Gordon and Ewell quotes found. Shard note applied: the OR totals (170, 175) are for the whole affair; "about 3 dozen" is now tied to the Compiler (36 paroled + 2 officers) and Jacobs (40 pickets), the three counts carried as scenarios.',
    register=reg('Lt. H. M. Strickler and Co. E of White\'s battalion; the raid on the abandoned camp', 'No text read names Strickler or Co. E for Jun 26.', 'Charge by White\'s battalion (documented); company and officer not shown', 'inferred',
                 competing='36 paroled + 2 officers / about 40 / 170 / 175 captured', impact='count shown as a range of the sources', ask='none', rids='R04, R11'),
    related=['tl-01-EG-004']))
