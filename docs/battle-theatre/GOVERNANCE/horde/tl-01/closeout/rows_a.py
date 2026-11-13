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
                'documented', '1863-06-25T01:00', '1863-06-25T23:59'),
    subs=[
        ('On the night of the 24th Hampton\'s, Fitz. Lee\'s and W. H. F. Lee\'s brigades rendezvoused secretly near Salem Depot and at 1 o\'clock at night moved out (about 01:00 on Jun 25)', 'documented', 'supported', ['rend', 'move']),
        ('Federal infantry blocked the planned route: Hancock\'s corps occupied Thoroughfare Gap and was marching through Haymarket; Hancock had the right of way on Stuart\'s road', 'documented', 'supported', ['hanc', 'hanc2', 'hanc3']),
        ('Robertson\'s and Jones\' brigades were left in observation of the enemy on the usual front', 'documented', 'supported', ['rob']),
        ('Lee\'s army lacked its main cavalry on the approach to Gettysburg: Lee says the absence of the cavalry made accurate information impossible and embarrassed the movements before the battle', 'documented', 'supported', ['lee307', 'lee321']),
        ('Stuart\'s advance reached Gettysburg on July 2', 'documented', 'supported', ['arr']),
        ('Jenkins\' cavalry was with Ewell\'s corps at Carlisle and advanced toward Harrisburg; Stuart\'s command was increased by Jenkins\' brigade only on Jul 3', 'documented', 'supported', ['jenk', 'jenk3']),
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
        'jenk3': OR('My command was increased by the addition of Jenkins\' brigade', R565, '697'),
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
        'morn': OR('and on the morning of the 2Gth, having sent all my trains to Chambersburg, excepting the ambulances, one medical wagon for a brigade, the regimental ordnance wagons, one wagon with cooking utensils for each regiment, and fifteen empty wagons to gather supplies with', R470, '465'),
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
                'Stevens\' iron works at Caledonia, 15 miles west of Gettysburg (Adams Sentinel), on the rebels\' route toward Gettysburg (Compiler)',
                'Date in conflict, no hour: Thursday Jun 25 (Tribune letter and Adams Sentinel) or Friday Jun 26 (Gettysburg Compiler, "on Friday")',
                'Adams Sentinel Jul 21 1863 p.3 and Sep 8 1863 p.2 (Thursday); Gettysburg Compiler Jun 29 1863 p.2 (Friday)',
                'The works were burned by the rebels: the Gettysburg Compiler of Jun 29 says on Friday (Jun 26) on their route hitherward; the Adams Sentinel (Jul 21 and Sep 8 1863) puts General Early at the works on Thursday Jun 25 and has Col. French\'s cavalry apply the torch, the works reduced to ashes. '
                'Both dates are carried as scenarios, no default. NOT documented: the hour, the place "about 2 miles out from camp", and any construction-schedule detail.',
                'documented', '1863-06-25T00:00', '1863-06-26T23:59',
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
                'Gordon\'s brigade with White\'s cavalry battalion (on the pike); Early with the rest (Hays, Hoke, Smith, artillery) by Hilltown to Mummasburg; French\'s 17th Virginia Cavalry with him',
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
                'The regiment started for Gettysburg by rail on Jun 23-24 (Richards: Jun 23; Pennypacker: Jun 24) and was held up at Swift Run (6 miles below) by a railroad accident; a detail of 100 men reached the town on the evening of Jun 25 and the regiment came in on the morning of Jun 26 (Jacobs: 9 a.m., from its camping ground, not by train). '
                'Early says the regiment had arrived the night before (Jun 25); the regiment\'s own monument text says it reached Gettysburg June 25. The seed reading (by train, about 09:00) is not supported as a train arrival. Scenarios carried, no default.',
                'documented', '1863-06-25T18:00', '1863-06-26T10:30'),
    subs=[
        ('Held up by a railroad accident at Swift Run, 6 miles below Gettysburg, on the way up (train off the track after striking a cow, per the Compiler); the regiment encamped on the spot', 'documented', 'supported', ['cmp_swift', 'penny_acc', 'rich_acc']),
        ('Scenario A: the regiment reached the town on the morning of Jun 26, at 9 a.m., from its camping ground', 'documented', 'conflict', ['jac_9', 'cmp_swift', 'penny_100']),
        ('Scenario B: it had arrived the night before (Jun 25); regimental monument: reached Gettysburg June 25', 'documented', 'conflict', ['early_night', 'mon_25']),
        ('Strength: 735 men (Jacobs) or 800 or 900 men (Early)', 'documented', 'conflict', ['jac_735', 'early_800']),
        ('A detail of 100 picked men came up to Gettysburg on the evening of Jun 25 and the rest of the regiment joined them on the morning of Jun 26', 'documented', 'supported', ['jac_100', 'penny_100']),
        ('The arrival was by train (seed)', 'documented', 'contradicted', ['jac_9', 'cmp_swift']),
    ],
    cites={
        'early_night': OR('had arrived in Gettysburg the night before, and moved that morning a', R470, '465'),
        'early_800': OR('Twentysixth Pennsylvania Militia, consisting of 800 or 900 men', R470, '465'),
        'jac_735': L('JACOBS-1864', 'numbering 735 men'),
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
        'jac_hall': L('JACOBS-1864', 'by order of Major Haller, although contrary to the earnest remonstrances of Jennings, Colonel of the regiment, was sent forward, at 10 J a. m., on the Chambersburg turnpike', note=HALF('10:30 a.m.')),
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
                '26th Pennsylvania Militia (Jennings) with Bell\'s cavalry vs White\'s cavalry battalion', 'Chambersburg pike about 3 to 3.5 miles west of Gettysburg (Marsh Creek area); the retreat ran across the fields toward Hunterstown',
                'Jun 26, from the march out on the pike at 10:00-10:30 (row T1-008) to about 15:00 (Jacobs: at about 3 p.m. the Rebels in force appeared)', 'Early OR27-2-R470 p.465; Jacobs 1864 p.14; Richards (BL-3); Pennypacker (PA-GB-1914-v2)',
                'The regiment went three to three and a half miles out the pike, halted, threw out pickets and encamped; at about 3 p.m. the Rebels in force appeared and captured nearly all the pickets (40); Colonel Jennings divided the regiment into three squads to look like a large body, the Rebels did not press it at first, and the regiment withdrew. Early: it fled at the first approach of White\'s cavalry, taking across the fields between Mummasburg and Gettysburg toward Hunterstown. '
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
                'White\'s cavalry battalion (Lt. Col. E. V. White) vs the 26th Pennsylvania Militia and pickets', 'In front of Gettysburg, on the Chambersburg pike',
                'Jun 26 afternoon (about 15:00 by Jacobs and the Compiler); no morning hour', 'Gordon OR27-2-R477 p.491; Ewell OR27-2-R467 p.443; Jacobs 1864 p.14; Compiler Jun 29 1863 p.2',
                'In front of Gettysburg the Pennsylvania militia regiment was charged and routed by White\'s cavalry battalion (Gordon); about 15:00 the Rebels in force captured nearly all the pickets, 40 (Jacobs); the Compiler counts 36 prisoners of the 26th paroled at Gettysburg and two officers taken along. '
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
        sc('A', 'About three dozen captured (36 paroled, two officers)', 'Gettysburg Compiler Jun 29 1863 p.2; Jacobs 1864 (40 pickets)', 'documented', ['cmp_stevens', 'jac_3pm']),
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

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-011
ROWS.append(dict(
    id='T1-011', verdict='corrected',
    claim=claim('The 26th Pennsylvania Militia retires from the Chambersburg pike across the fields toward Hunterstown, pursued by Confederate cavalry',
                '26th Pennsylvania Militia (Col. Jennings) with Capt. Bell\'s cavalry; pursued by White\'s battalion and French\'s 17th Virginia Cavalry',
                'Across the fields between the Mummasburg and Chambersburg roads toward Hunterstown (Mummasburg road near Mr. Leer\'s; Witmer\'s house on the Hunterstown/Carlisle road); not toward the rail station',
                'Jun 26 afternoon, after about 15:00 (Jacobs: Rebels in force at about 3 p.m.; Richards: overtaken in the afternoon)', 'Early OR27-2-R470 p.465; Jacobs 1864 pp.14-15; Richards (BL-3); Compiler Jun 29 1863 p.2',
                'In the afternoon of Jun 26 the militia took across the fields between Mummasburg and Gettysburg toward Hunterstown (Early), retreating eastward over the fields and by country roads under skirmishing and losing 120 more men near Hunterstown (Jacobs); the cavalry caught up at Witmer\'s house about 4.5 miles out on the Carlisle road (Richards) and some were taken near Mr. Leer\'s on the Mummasburg road (Compiler). '
                'The seed route (Belmont Road, Mummasburg Road, to the rail station) and the disbanding of the cavalry at Rock Creek on the Hanover Road are not supported; the sources send the regiment toward Hunterstown, York Springs and Harrisburg. Both versions are carried as scenarios.',
                'documented', '1863-06-26T15:00', '1863-06-26T20:04', marking='route toward Hunterstown: documented; Belmont Road, rail station and Rock Creek disbanding: gap'),
    subs=[
        ('The militia took across the fields between Mummasburg and Gettysburg and went toward Hunterstown', 'documented', 'supported', ['early_fields']),
        ('Jennings\' regiment retreated eastward over the fields and by country roads, skirmishing with the pursuing cavalry, and lost 120 more men near Hunterstown', 'documented', 'supported', ['jac_retreat', 'jac_120']),
        ('The pursuing cavalry overtook the regiment in the afternoon at Witmer\'s (Whitmer\'s) house, about four and a half miles from Gettysburg on the Carlisle road / four miles out on the Hunterstown road, and was repulsed', 'documented', 'supported', ['rich_witmer', 'penny_witmer']),
        ('Rebel cavalry captured a number near Mr. Leer\'s on the Mummasburg road and some more lower down; about 100 were paroled at Hunterstown on Saturday', 'documented', 'supported', ['cmp_leer', 'cmp_hunters']),
        ('Bell\'s cavalry and the City Troop retired from town a short time before the rebels entered', 'documented', 'supported', ['cmp_retired']),
        ('The destination of the fleeing militia was the rail station (seed); the sources say Hunterstown, York Springs and Harrisburg', 'documented', 'contradicted', ['early_fields', 'cmp_york_springs']),
        ('Jacobs: at about 3 p.m. the Rebels in force made their appearance and captured nearly all the pickets, 40 in number', 'documented', 'supported', ['jac_3pm']),
        ('The flight went by the Belmont Road and then the Mummasburg Road', 'open gap', 'unsupported', []),
        ('Bell\'s cavalry galloped through town and disbanded near Rock Creek on the Hanover Road', 'open gap', 'unsupported', []),
    ],
    cites={
        'jac_3pm': L('JACOBS-1864', 'At about 3 p. m., the Rebels in force made their appearance, and captured nearly all their pickets, 40 in number.'),
        'early_fields': OR('taking across the fields between Mummasburg and Gettysburg, and going toward Hunterstown', R470, '465'),
        'jac_retreat': L('JACOBS-1864', 'Jennings\' band however, hastily retreated eastward over the fields, and by country roads, occasionally skirmishing with the enemy\'s cavalry'),
        'jac_120': L('JACOBS-1864', 'and after losing 120 more of their number near Tlunterstown'),
        'rich_witmer': L('BL-3', 'These latter overtook us in the afternoon at Witmer\'s house, about four and a half miles from Gettysburg on the Carlisle road'),
        'penny_witmer': L('PA-GB-1914-v2', 'Overtaken by White\'s cavalry on the Hunterstown road at the farmhouse of Henry Whitmer'),
        'cmp_leer': CMP('Mr. Leer’s,on thje. Mummapburg road,', 'LATER. Monday Morning.- The 26th Reg. P. V. M. retreated to York Springs, where about 600 were encamped on Saturday morning. The rebel cavalry captured a number of them near Mr. Leer\'s, on the Mummasburg road, and some more lower down. They paroled about 100 at Hunterstown on Saturday, we are informed. ... The report that Capt. Bell, of the Cavalry, was captured, is not credited.'),
        'cmp_hunters': CMP('about lfu at Hunterstown on-Saturday', 'They paroled about 100 at Hunterstown on Saturday, we are informed.'),
        'cmp_york_springs': CMP('re.\'eatcif to York Springs', 'The 26th Reg. P. V. M. retreated to York Springs, where about 600 were encamped on Saturday morning.'),
        'cmp_retired': CMP('Bell V Cavalry retiriií fron» town a short', 'The Philadelphia City Troop and Bell\'s Cavalry retired from town a short time before the rebels entered. We presume they made their retreat safely. The telegraph operator also got away, with his instrument, in time.'),
    },
    scenarios=[
        sc('A', 'Seed: militia flee east across fields to the Belmont Road, then the Mummasburg Road toward the rail station; cavalry gallop through town and disband near Rock Creek on the Hanover Road', 'seed source ABT-Early (lead); no text read supports the road names, the station or the disbanding', 'open gap', []),
        sc('B', 'Across the fields between Mummasburg and Gettysburg toward Hunterstown, caught at Witmer\'s house, some taken on the Mummasburg road at Leer\'s; the regiment then went on to York Springs and Harrisburg', 'Early p.465; Jacobs pp.14-15; Richards; Pennypacker; Compiler Jun 29', 'documented', ['early_fields', 'jac_retreat', 'rich_witmer', 'cmp_leer']),
    ],
    remains=['the Belmont Road and Mummasburg Road route to the rail station', 'Bell\'s cavalry galloping through town and disbanding near Rock Creek on the Hanover Road'],
    searched=['OR27-2-R470 p.465, R467, R477 read: direction only (toward Hunterstown); Library: Jacobs 1864 pp.14-15, Compiler 1863-06-29 p.2 (page image), Pennypacker PA-GB-1914-v2 pp.786-787, Richards in BL-3 read',
              'Library regex Belmont|rail station near Jennings in the Jun 1863 newspapers, Jacobs, Pennypacker, Richards: no hit connecting the militia flight to the Belmont Road or the station',
              'Compiler 1863-06-29 p.2: Bell\'s cavalry retired from town before the rebels entered; the report that Capt. Bell was captured is not credited (no Rock Creek disbanding)'],
    recheck='OR-RECHECK: the stored quote was found at p.465. Shard verdict "unsupported" (OR direction differs from the row) applied: the displayed route is the documented one; the seed route stays as a marked scenario.',
    register=reg('Road-by-road flight of the militia (Belmont Road, rail station) and the Rock Creek disbanding of Bell\'s cavalry', 'No account read gives these roads or the disbanding; Early, Jacobs, Richards and Pennypacker give Hunterstown, Witmer\'s house and Harrisburg.',
                 'Flight across the fields toward Hunterstown and the Mummasburg road with captures at Leer\'s and Witmer\'s (documented); the seed road names are not shown as fact', 'documented',
                 competing='seed Belmont Road / rail station / Rock Creek against Hunterstown / York Springs / Harrisburg', impact='path of the militia and of Bell\'s cavalry on the map', ask='none: both scenarios stay selectable, no default', rids='R11, R13'),
    related=['tl-01-EG-004']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-012
ROWS.append(dict(
    id='T1-012', verdict='corrected',
    claim=claim('The militia rear company is overtaken and captured on the road toward Hunterstown, about four miles from Gettysburg; 175 prisoners in all',
                'Militia rear guard (Company B, Capt. Carnaghan, of the 26th Pennsylvania) against Confederate cavalry: Col. French\'s 17th Virginia Cavalry (Early) or White\'s battalion (Pennypacker)',
                'Witmer\'s (Whitmer\'s) farmhouse on the Hunterstown/Carlisle road, 4 to 4.5 miles from Gettysburg',
                'Jun 26 afternoon (Richards: overtaken in the afternoon; no hour is given in the sources of this row)', 'Early OR27-2-R470 p.465; Pennypacker (PA-GB-1914-v2 p.786); Richards (BL-3)',
                'In the afternoon of Jun 26 the cavalry overtook the militia regiment at Witmer\'s house; the rear company (Co. B, Capt. Carnaghan) was almost all captured. Early reports 175 prisoners in all and sends Col. French\'s 17th Virginia Cavalry in pursuit with two regiments of Hays\' brigade following; Ewell reports 170; Pennypacker counts 176 captured. '
                'The regimental account names White\'s cavalry as the attacker; Early names French. Both are carried. NOT documented: the wooden bridge and Bayly\'s Hill.',
                'documented', '1863-06-26T12:00', '1863-06-26T20:04', marking='capture, place and counts: documented; wooden bridge and Bayly\'s Hill: gap'),
    subs=[
        ('Early sent Col. French with his cavalry to pursue the militia, capturing a number of prisoners; two regiments of Hays\' brigade went to aid French and could not get up with the fugitives', 'documented', 'supported', ['early_french', 'early_hays']),
        ('Pennypacker: the regiment was overtaken by White\'s cavalry on the Hunterstown road at the farmhouse of Henry Whitmer, four miles from the town; the attack was repulsed after twenty to thirty minutes, but the rear company, Co. B under Capt. Carnaghan, was almost all taken prisoner', 'documented', 'conflict', ['penny_witmer', 'penny_time', 'penny_miles', 'penny_carn']),
        ('Richards (a member of Co. A): the cavalry overtook the regiment in the afternoon at Witmer\'s house, about 4.5 miles from Gettysburg on the Carlisle road, and was repulsed after an engagement', 'documented', 'supported', ['rich_witmer']),
        ('The count of prisoners: 175 in all paroled (Early); 170 (Ewell); 176 captured (Pennypacker)', 'documented', 'conflict', ['early_175', 'ewell_rout', 'penny_176']),
        ('The prisoners were taken at a wooden bridge near Bayly\'s Hill', 'open gap', 'unsupported', []),
    ],
    cites={
        'early_french': OR('I immediately sent forward Colonel French with his cavalry to pursue this militia force, which he did, capturing a number of prisoners', R470, '465'),
        'early_hays': OR('two regiments were sent to aid French in the pursuit of the fugitive militia', R470, '465'),
        'early_175': OR('Of this force, 175 prisoners in all were captured and subsequently paroled.', R470, '465'),
        'ewell_rout': OR('of whom 170 were taken and paroled', 'OR27-2-R467', '443'),
        'penny_witmer': L('PA-GB-1914-v2', 'Overtaken by White\'s cavalry on the Hunterstown road at the farmhouse of Henry Whitmer'),
        'penny_time': L('PA-GB-1914-v2', 'An engage ment ensued lasting for \'from twenty minutes to half a hour.'),
        'penny_miles': L('PA-GB-1914-v2', 'At this obscure, unknown and unvisited spot, four miles from the town'),
        'penny_carn': L('PA-GB-1914-v2', 'the rear company, commanded by Captain Carnaghan, were almost all taken prisoners'),
        'penny_176': L('PA-GB-1914-v2', 'It had lost 176 men captured'),
        'rich_witmer': L('BL-3', 'These latter overtook us in the afternoon at Witmer\'s house, about four and a half miles from Gettysburg on the Carlisle road'),
    },
    scenarios=[
        sc('A', 'The pursuing cavalry was Col. French\'s 17th Virginia Cavalry (Jenkins\' brigade)', 'Early OR27-2-R470 p.465 (seed also names French)', 'documented', ['early_french']),
        sc('B', 'The pursuing cavalry was White\'s battalion', 'Pennypacker, regimental address of 1892 (PA-GB-1914-v2 p.786)', 'documented', ['penny_witmer']),
        sc('C', 'Prisoner count 170 / 175 / 176', 'Ewell p.443 / Early p.465 / Pennypacker p.787', 'documented', ['ewell_rout', 'early_175', 'penny_176']),
    ],
    remains=['a wooden bridge and Bayly\'s Hill as the place of capture'],
    searched=['OR vol.27 pts 1-3 regex Carnahan|Carnaghan|Bayly|Bayley: no hit in OR27 (hits are OR vols 25 and 29 and the Fox register); Library regex same: Carnaghan only in Pennypacker (PA-GB-1914-v2 p.786)',
              'Library regex wooden bridge near Whitmer|Witmer in the 1863 newspapers, Jacobs, Pennypacker, Richards: no wooden bridge named',
              'Early p.465 and Ewell p.443 re-read; Pennypacker pp.786-787 and Richards read'],
    recheck='OR-RECHECK: the item without a stored quote (175 prisoners) now carries the verbatim Early passage at p.465. Shard note applied: 17th VIRGINIA Cavalry (not Pennsylvania) confirmed by Early p.464-465; the regimental source names White, carried as a scenario.',
    register=reg('Wooden bridge and Bayly\'s Hill (Jun 26 capture of the militia rear guard)', 'No account read names a wooden bridge or Bayly\'s Hill; the sources give Witmer\'s house on the Hunterstown/Carlisle road.',
                 'Capture at Witmer\'s house about four miles from town with the counts as a range 170-176 (documented)', 'documented',
                 competing='French\'s 17th Virginia (Early) against White\'s battalion (Pennypacker); 170 / 175 / 176 prisoners', impact='place of the capture on the map and the attacker\'s unit', ask='none: scenarios stay selectable', rids='R11, R13, R04'),
    related=['tl-01-EG-004']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-013
ROWS.append(dict(
    id='T1-013', verdict='partially_supported',
    claim=claim('Private George W. Sandoe of Bell\'s cavalry is shot dead by a Confederate trooper on the Baltimore turnpike, near Nathaniel Lightner\'s',
                'Bell\'s Adams County cavalry (later Co. B, 21st Pennsylvania Cavalry): Pvt. George W. Sandoe and one other trooper; one Confederate cavalryman of the entering force (White\'s battalion)',
                'Baltimore Street and the turnpike beyond it, as far as Nathaniel Lightner\'s',
                'Jun 26, shortly after the Confederate cavalry entered the town at about 15:00 (Compiler) / 15:30 (Jacobs); the body was removed the same evening', 'Gettysburg Compiler Jun 29 1863 p.2; regimental monument inscription (PA-GB-1914-v2); Jacobs 1864 p.15',
                'On Jun 26, after the rebel cavalry entered Gettysburg at about 3 p.m., one rebel went down the turnpike as far as Nathaniel Lightner\'s, came upon two of Bell\'s cavalry and shot one, Mr. George Sandoe, killing him on the spot (Compiler of Jun 29, printed three days later); the body was removed to his home the same evening. '
                'The regimental monument text gives Private George W. Sandoe, an advance scout of the company later Co. B, 21st Pennsylvania Cavalry, as the first Union soldier killed at Gettysburg, June 26 1863. '
                'NOT documented: a second named trooper "Lightner" who escaped, and the hour 16:00 (window about 15:00-18:00).',
                'documented', '1863-06-26T15:00', '1863-06-26T18:00', marking='death, name, place and day: documented (newspaper of the time and monument text); hour: inferred; the second trooper: gap'),
    subs=[
        ('Mr. George Sandoe, one of two of Bell\'s cavalry, was shot and killed on the spot by a rebel who went down the turnpike as far as Nathaniel Lightner\'s', 'documented', 'supported', ['cmp_sandoe', 'cmp_two']),
        ('The body was removed to his home the same evening; he left a wife', 'documented', 'supported', ['cmp_body']),
        ('Date June 26 1863; the monument text calls Pvt. George W. Sandoe the first Union soldier killed at Gettysburg', 'documented', 'supported', ['mon_sandoe']),
        ('The rebel cavalry entered the town at about 3 o\'clock (Compiler) / 3.30 p.m. (Jacobs: 180 to 200 cavalry), so the shooting followed that entry', 'documented', 'supported', ['cmp_entry3', 'jac_cav']),
        ('The hour was about 16:00', 'inferred', 'unsupported', []),
        ('A second trooper, Pvt. Lightner, escaped; the Confederate was one of White\'s men', 'open gap', 'unsupported', []),
    ],
    cites={
        'cmp_sandoe': CMP('Sandoe, killing him on the spot.', CMP_SANDOE),
        'cmp_two': CMP('where he came upon two of Bell\'s cavalry', CMP_SANDOE),
        'cmp_body': CMP('The body was removed to bis home the same evening', CMP_SANDOE),
        'mon_sandoe': L('PA-GB-1914-v2', 'Near this spot on June 26 1863 fell Private George W. Sandoe', witness='inscription on the 21st Pennsylvania Cavalry monument, text as printed in Pennsylvania at Gettysburg'),
        'cmp_entry3': CMP('sere enough, the+tbel aiivance (cavalry) entered charging up Chambersburg street', CMP_ENTRY),
        'jac_cav': L('JACOBS-1864', 'The advance guard of the enemy, consisting of 180 to 200 cavalry, rode into Gettysburg at 3J p. m.', note=HALF('3:30 p.m.')),
    },
    scenarios=[],
    remains=['the hour 16:00 (the sources give only after the entry at 3-3.30 p.m. and the same evening)', 'a second named trooper "Lightner" who escaped, and the attribution to White\'s men'],
    searched=['OR vol.27 pts 1-3 regex Sandoe|Lightner: 0 hits (OR-RECHECK-2); Library, whole 108-text set, regex Sandoe: Compiler 1863-06-29 p.2 (page image read), Pennsylvania at Gettysburg monument inscription; Jacobs 1864 has no mention',
              'Compiler 1863-06-29 p.2 read on the page image (closeout/acquired_tl01.json); Adams Sentinel Jul 7 and Jul 14 1863 searched for Sandoe: no hit',
              'web lookup tl-01-LK-01 (modern articles, forums): failed to reach a primary; superseded by the Compiler'],
    recheck='OR-RECHECK-2 (not_found in the OR; failed_lookup) applied: the OR has no Sandoe text; the death is now documented by the Gettysburg Compiler of Jun 29 1863 (read on its page image) and the regimental inscription.',
    register=reg('Sandoe: hour of the shot and the second trooper "Lightner"', 'The Compiler names the place (Nathaniel Lightner\'s) and the victim but not the second trooper or an hour; the seed\'s "Pvt. Lightner" may be the place name.',
                 'Death of Pvt. Sandoe on the Baltimore turnpike on the afternoon of Jun 26 (documented); hour as a window 15:00-18:00 (inferred)', 'documented',
                 competing='seed about 16:00 against after 3-3.30 p.m. and before the evening removal', impact='time of the first Union death on the screen is a window', ask='none', rids='R05, R11'),
    related=['tl-01-EG-004']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-014
ROWS.append(dict(
    id='T1-014', verdict='partially_supported',
    claim=claim('The Confederates occupy Gettysburg: demands on the borough, a search of the stores, rations issued, a railroad bridge and cars burned',
                'White\'s cavalry (about 150-200), Gordon\'s infantry brigade (2,500-5,000 by the estimates), Early; borough council members D. Kendlehart and A. D. Buehler',
                'Gettysburg (Chambersburg Street, the Court-house), its railroad and the Rock Creek railroad bridge',
                'Jun 26 from about 15:00 (cavalry) to the evening (Early arrives late; bridge and cars burned in the evening)', 'Compiler Jun 29 1863 p.2; Jacobs 1864 pp.15-17; Early OR27-2-R470 p.465; Pierce 1889',
                'Cavalry (about 150, "180 to 200") entered at about 3 to 3.30 p.m., followed half an hour later by Gordon\'s infantry (Compiler 2,500-4,000; Jacobs 5,000); Early arrived late in the day, demanded supplies (Jacobs lists 1,200 lb sugar, 600 lb coffee, 60 barrels of flour, 1,000 lb salt, 7,000 lb bacon, 10 barrels of whisky, 10 barrels of onions, 1,000 pairs of shoes, 500 hats, or $5,000 cash). '
                'Council members D. Kendlehart and A. D. Buehler answered that the goods were not in town, the borough had no funds and the Confederates could search; no attempt was made to enforce the requisition (Jacobs); Early reports a search of the stores found very little and about 2,000 rations in a train of cars issued to Gordon; the troops were quartered in town including the Court-house, and in the evening the railroad bridge across Rock Creek and 10-17 cars were burned. '
                'NOT documented: prisoners locked in the Court-house, a covered bridge, torn-up telegraph lines.',
                'documented', '1863-06-26T15:00', '1863-06-26T23:59', marking='occupation, demands, search, rations, burning: documented; prisoners in the Court-house, covered bridge and telegraph: gap'),
    subs=[
        ('The rebel cavalry (about 150, per Jacobs 180 to 200) entered at about 3 to 3.30 p.m.; half an hour later a Georgia brigade of infantry (Gordon), variously estimated at 2,500 to 4,000 (Compiler) or 5,000 (Jacobs), followed', 'documented', 'supported', ['cmp_entry3', 'cmp_est', 'jac_cav', 'jac_inf']),
        ('Early came late in the day and demanded supplies; Jacobs lists the demand (sugar, coffee, flour, salt, bacon, whisky, onions, 1,000 pairs of shoes, 500 hats; $6,000 or $5,000 cash)', 'documented', 'supported', ['early_late', 'early_demands', 'jac_early', 'jac_demand']),
        ('Council members D. Kendlehart and A. D. Buehler replied it was impossible to comply; the goods were not in town and the borough had no funds; they could search; no attempt was made to enforce the demand', 'documented', 'supported', ['jac_kend', 'jac_robbed']),
        ('A search of the stores secured only a very small quantity of commissary supplies, and about 2,000 rations found in a train of cars were issued to Gordon\'s brigade', 'documented', 'supported', ['early_auth', 'early_rations']),
        ('The troops were quartered in town, in the Court-house and on the pavements, the balance in the neighbourhood', 'documented', 'supported', ['cmp_quarter']),
        ('Troops searched the town in squads for booty and took horses; Jacobs says only few houses of citizens were robbed', 'documented', 'supported', ['pierce_booty', 'jac_horses', 'jac_robbed']),
        ('Evening of Friday: the Rebels burned the railroad bridge and cars (Early: 10 or 12 cars and a small railroad bridge; Compiler: 17 cars and the Rock Creek bridge)', 'documented', 'supported', ['jac_evening', 'early_cars', 'cmp_bridge']),
        ('Prisoners were marched in and locked in the Court-house', 'open gap', 'unsupported', []),
        ('A covered bridge was burned, and telegraph lines were torn up', 'open gap', 'unsupported', []),
    ],
    cites={
        'cmp_entry3': CMP('sere enough, the+tbel aiivance (cavalry) entered charging up Chambersburg street', CMP_ENTRY),
        'cmp_est': CMP('variously estimated at from 2500 to 4000', CMP_ENTRY),
        'jac_cav': L('JACOBS-1864', 'The advance guard of the enemy, consisting of 180 to 200 cavalry, rode into Gettysburg at 3J p. m.', note=HALF('3:30 p.m.')),
        'jac_inf': L('JACOBS-1864', 'This advance party was soon followed by 5,000 infantry, being General Gordon\'s brigade of Early\'s division of Ewell\'s corps.'),
        'early_late': OR('and as it was late when I reached the place', R470, '465'),
        'early_demands': OR('I had no opportunity of coTupelling a, compliance with my demands in this town', R470, '465'),
        'jac_early': L('JACOBS-1864', 'General Early, who accompanied this brigade, and remained in town over Friday night, demanded of the authorities of our borough'),
        'jac_demand': L('JACOBS-1864', 'demanded of the authorities of our borough 1,200 pounds of sugar, 600 pounds of coffee, 60 barrels of flour, 1,000 pounds of salt, 7,000 pounds of bacon'),
        'jac_kend': L('JACOBS-1864', 'Messrs. D. Kendlehart and A. D. Buehler, as representatives of the town council, replied in substance, that it was impossible to comply with their demands'),
        'jac_robbed': L('JACOBS-1864', 'No attempt was made to enforce the requisition, and but few of the houses of citizens wTere robbed'),
        'early_auth': OR('The authorities of Gettysburg declared their inability to furnish any supplies', R470, '465'),
        'early_rations': OR('about 2,000 rations were found in a train of cars, and issued to Gordon\'s brigade', R470, '465'),
        'cmp_quarter': CMP('quartered in town—in the Ct urthoute and on the pavements', CMP_QUARTER),
        'pierce_booty': L('TPIERCE-1889', 'While the infantry were moving about the town in squads searching for booty', witness='eyewitness narrative of 1889 (T. Pierce, then 15)'),
        'jac_horses': L('JACOBS-1864', 'rushing from stable to stable in search of horses, the most of which, however, had fortunately a few'),
        'jac_evening': L('JACOBS-1864', 'During the evening of Friday, however, the Rebels burned the railroad bridge and a few cars'),
        'early_cars': OR('The cars, numbering 10 or 12, were burned, as was also a small', R470, '465'),
        'cmp_bridge': CMP('The railroad bridge across Bock i geek ...wa* soon set on firij by the rebela,', CMP_BRIDGE),
    },
    scenarios=[],
    remains=['prisoners marched in and locked in the Court-house (the Compiler has troops quartered in the Court-house and the 36 militia prisoners paroled)', 'a covered bridge', 'telegraph lines torn up (the Compiler has the telegraph operator escaping with his instrument)'],
    searched=['OR27-2-R470 p.465 and R477 p.491 read; OR vol.27 pts 1-3 regex Kendlehart|Kendlehard: 0 hits',
              'Library: Jacobs 1864 pp.15-18 (Early\'s demands, Kendlehart and Buehler); Compiler 1863-06-29 p.2 (page image); Pierce 1889 pp.26-28; regex court.?house in Jacobs, Pierce, Compiler Jun 29, Adams Sentinel Jun 30-Jul 28 and Compiler Jul 13-Aug 3: the Court-house is a quarters for troops (Compiler) and a meeting place (Jacobs, Jun 20), never a prison for the militia',
              'Library regex telegraph/rails torn in Jacobs, Compiler Jun 29, Sentinel Jun 30-Jul 14, Pierce: the operator escaped (Compiler); Pierce has the track destroyed at the bridge east of town; no telegraph destruction',
              'Library regex covered bridge: no hit; the sources call it the railroad bridge across Rock Creek / a small railroad bridge'],
    recheck='OR-RECHECK: both stored quotes found at p.465. Shard note applied: the OR has the supply demands, the search and the bridge and cars; the courthouse prisoners, tribute figures, looting and the covered bridge now rest on Jacobs, the Compiler and Pierce or stay open.',
    register=reg('Prisoners in the Court-house; covered bridge; torn telegraph lines (Jun 26 occupation of Gettysburg)', 'No text read puts the militia prisoners in the Court-house (the Compiler has them paroled and the troops quartered there), names a covered bridge, or has telegraph lines destroyed.',
                 'Occupation, demands, search, quartering in the Court-house and the evening burning shown as documented; the unsupported items are not shown as fact', 'documented',
                 competing='troops quartered in the Court-house (Compiler) against prisoners locked in it (seed); 10-12 cars (Early) against 17 cars (Compiler)', impact='Court-house interior use and the number of burning cars', ask='none', rids='R05, R11, R13'),
    related=['tl-01-EG-002', 'tl-01-EG-004']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-015
ROWS.append(dict(
    id='T1-015', verdict='partially_supported',
    claim=claim('Railroad cars and the Rock Creek railroad bridge are burned on the evening of Jun 26; the track is destroyed',
                'Early\'s troops (Gordon\'s brigade and White\'s cavalry)', 'Gettysburg railroad and the railroad bridge over Rock Creek east of town',
                'Jun 26 evening (Jacobs: during the evening of Friday)', 'Jacobs 1864 p.17; Early OR27-2-R470 p.465; Compiler Jun 29 1863 p.2; Pierce 1889',
                'During the evening of Friday Jun 26 the rebels burned the railroad bridge across Rock Creek and cars: Early reports 10 or 12 cars and a small railroad bridge near the place (no railroad buildings of consequence); the Compiler counts 17 cars and says the centre span of the bridge was burnt and fell in; Pierce adds that the track was destroyed at the bridge east of the town. '
                'NOT documented: a covered bridge and torn-up telegraph lines.',
                'documented', '1863-06-26T18:00', '1863-06-26T23:59', marking='cars, bridge, track: documented; covered bridge and telegraph: gap'),
    subs=[
        ('Cars were burned: 10 or 12 (Early) or seventeen, of named owners (Compiler)', 'documented', 'conflict', ['early_cars', 'cmp_cars']),
        ('A railroad bridge was burned: a small railroad bridge near the place (Early); the bridge across Rock Creek, centre span burnt and fell in (Compiler)', 'documented', 'supported', ['early_cars', 'cmp_bridge']),
        ('The burning was in the evening of Friday (Jacobs); Early reached the place late in the day', 'documented', 'supported', ['jac_evening', 'early_late']),
        ('The track was destroyed at the railroad bridge east of town', 'documented', 'supported', ['pierce_track']),
        ('There were no railroad buildings of consequence', 'documented', 'supported', ['early_nobuild']),
        ('A covered bridge was burned and the telegraph lines were torn up', 'open gap', 'unsupported', []),
    ],
    cites={
        'early_cars': OR('The cars, numbering 10 or 12, were burned, as was also a small', R470, '465'),
        'early_nobuild': OR('There were no railroad buildings of consequence', R470, '465'),
        'early_late': OR('and as it was late when I reached the place', R470, '465'),
        'jac_evening': L('JACOBS-1864', 'During the evening of Friday, however, the Rebels burned the railroad bridge and a few cars'),
        'cmp_bridge': CMP('The railroad bridge across Bock i geek ...wa* soon set on firij by the rebela,', CMP_BRIDGE),
        'cmp_cars': CMP('Altogether, wfi are fold Uzat seventeen oars were bumtjj', CMP_BRIDGE),
        'pierce_track': L('TPIERCE-1889', 'That evening: when these raiders were leaving, they ran all the cars that were about, out to the railroad bridge east of the town, set the bridge and cars on fire and destroyed the track.', witness='eyewitness narrative of 1889 (T. Pierce, then 15); she places the burning when the raiders were leaving'),
    },
    scenarios=[
        sc('A', '10 or 12 cars and a small railroad bridge', 'Early OR27-2-R470 p.465', 'documented', ['early_cars']),
        sc('B', 'Seventeen cars; the Rock Creek bridge\'s centre span burnt and fell in; the other two spans standing but badly damaged', 'Gettysburg Compiler Jun 29 1863 p.2 ("we are told")', 'documented', ['cmp_cars', 'cmp_bridge']),
    ],
    remains=['a covered bridge', 'telegraph lines torn up'],
    searched=['OR27-2-R470 p.465 read (Early); Library: Jacobs p.17, Compiler 1863-06-29 p.2 (page image), Pierce pp.27-28; regex covered bridge: no hit; regex telegraph destroyed in Jacobs, Compiler Jun 29, Adams Sentinel Jun 30-Jul 14: none (the telegraph operator escaped with his instrument, Compiler)',
              'OR vol.27 pts 1-3: regex railroad bridge|covered bridge near Gettysburg: only Early p.465'],
    recheck='OR-RECHECK: quote found at p.465. Shard note applied ("Torn rails/telegraph not in OR"): the track is now supported by Pierce, the telegraph stays open; the covered bridge is not in any text read.',
    register=reg('Covered bridge and torn-up telegraph lines (Jun 26 evening burnings at Gettysburg)', 'No text read names a covered bridge or telegraph destruction at Gettysburg on Jun 26.', 'Cars and the Rock Creek railroad bridge burned on the evening of Jun 26 (documented); counts as a range 10-17 cars', 'documented',
                 competing='10 or 12 cars (Early) against 17 (Compiler)', impact='number of burning cars and the bridge type', ask='none', rids='R14, R05'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-016
ROWS.append(dict(
    id='T1-016', verdict='corrected',
    claim=claim('The railroad bridge over Rock Creek east of Gettysburg is burned on the evening of Jun 26; further bridges on the line are burned by White\'s cavalry from Jun 27',
                'Early\'s troops (Jun 26); Col. White\'s cavalry battalion (the bridges eastward, ordered for Jun 27)', 'Rock Creek crossing east of Gettysburg (Gettysburg Railroad), then the line toward Hanover Junction',
                'Rock Creek bridge: evening of Jun 26; other bridges: from Jun 27', 'Jacobs 1864 p.17; Compiler Jun 29 1863 p.2; Early OR27-2-R470 pp.465-466',
                'The railroad bridge across Rock Creek was set on fire by the rebels on the evening of Friday Jun 26 (Jacobs; Compiler: the centre span burnt and fell in). On Jun 27 Early had directed Colonel White to burn the railroad bridges on the way to Hanover Junction, and the Compiler reports that all the bridges on the Gettysburg Railroad were burnt. '
                'The seed range "Jun 26 or 27" is therefore two events: the Rock Creek bridge on Jun 26, the other bridges on Jun 27. The sources call it a bridge, not a trestle.',
                'documented', '1863-06-26T18:00', '1863-06-27T23:59'),
    subs=[
        ('The railroad bridge across Rock Creek was set on fire by the rebels; its centre span burnt and fell in', 'documented', 'supported', ['cmp_bridge']),
        ('The burning was in the evening of Friday, Jun 26', 'documented', 'supported', ['jac_evening', 'early_cars']),
        ('On Jun 27 Early directed Colonel White to burn the railroad bridges to Hanover Junction and on to York', 'documented', 'supported', ['early_white']),
        ('All the bridges on the Gettysburg Railroad were burnt', 'documented', 'supported', ['cmp_allbridges']),
    ],
    cites={
        'cmp_bridge': CMP('The railroad bridge across Bock i geek ...wa* soon set on firij by the rebela,', CMP_BRIDGE),
        'jac_evening': L('JACOBS-1864', 'During the evening of Friday, however, the Rebels burned the railroad bridge and a few cars'),
        'early_cars': OR('The cars, numbering 10 or 12, were burned, as was also a small', R470, '465'),
        'early_white': OR('and I also directed Colonel White to proceed with his cavalry to Hanover Junction, on the Northern Central road, destroying the railroad bridges on the way', R470, '466'),
        'cmp_allbridges': CMP('were bunit bn the Gettysburg Railroad', 'No depredations of consequence were committed at Oxford or Hanover. All the bridges were burnt on the Gettysburg Railroad.'),
    },
    scenarios=[],
    remains=[], searched=['Compiler 1863-06-29 p.2 (page image), Jacobs p.17, Early pp.465-467 read; Library regex trestle near Rock Creek: no hit'],
    recheck='OR-RECHECK: quote found at p.465 (Early\'s Jun 26 narrative). Shard note applied (narrowed to Jun 26, Rock Creek not named in the OR): Rock Creek and the evening of Jun 26 now rest on the Compiler and Jacobs; the Jun 27 burnings are the other bridges.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-017
ROWS.append(dict(
    id='T1-017', verdict='partially_supported',
    claim=claim('Night of Jun 26: Early\'s division bivouacs in and around Gettysburg and near Mummasburg',
                'Early\'s division (Gordon\'s brigade and White\'s cavalry in and around the town; Hays\' brigade about a mile out; the other brigades and artillery near Mummasburg)', 'Gettysburg (Court-house, pavements, neighbourhood), about a mile from town, and near Mummasburg (battery with infantry and wagons on the Mummasburg road a mile out)',
                'Evening and night of Jun 26 to the morning of Jun 27', 'Early OR27-2-R470 p.465; Compiler Jun 29 1863 p.2; Jacobs 1864 p.16',
                'Early reports the other brigades with the artillery halted and encamped near Mummasburg and Hays\' brigade encamped about a mile from Gettysburg; the Compiler adds that about half of the brigade was quartered in town, in the Court-house and on the pavements, the balance in the neighbourhood, that several hundred more cavalry and a battery came in in the evening and that another battery with infantry and baggage wagons encamped on the Mummasburg road a mile from town; Jacobs has Early himself in town over Friday night. '
                'NOT documented: militia prisoners confined in the Court-house, and rain on the night itself (the day was rainy).',
                'documented', '1863-06-26T18:00', '1863-06-27T04:03', marking='camp near Mummasburg and quartering in town: documented (promotion adopted, DD-08); prisoners in the Court-house and rain during the night: gap'),
    subs=[
        ('The other brigades with the artillery were halted and encamped near Mummasburg; Hays\' brigade encamped about a mile from Gettysburg', 'documented', 'supported', ['early_mum', 'early_hays']),
        ('A large body of rebels encamped near Mummasburg on Friday night and moved east on Saturday morning; a battery with infantry and baggage wagons encamped on the Mummasburg road a mile from town', 'documented', 'supported', ['cmp_battery']),
        ('Gordon\'s brigade and White\'s cavalry held the town: about half quartered in town, in the Court-house and on the pavements, the balance in the neighbourhood; several hundred more cavalry and a battery came in in the evening; guards were posted around the town', 'documented', 'supported', ['cmp_quarter', 'cmp_guards']),
        ('Early himself remained in town over Friday night', 'documented', 'supported', ['jac_early']),
        ('Citizens stayed in their houses under the occupation, keeping at a respectful distance from the troops', 'documented', 'supported', ['jac_citizens']),
        ('Militia prisoners were confined in the Court-house', 'open gap', 'unsupported', []),
        ('The troops bivouacked in rain during the night', 'open gap', 'unsupported', []),
    ],
    cites={
        'early_mum': OR('the other brigades with the artillery were halted and encamped near Mummasburg', R470, '465'),
        'early_hays': OR('Hays\' brigade was halted, and encamped about a mile irom Gettysburg', R470, '465'),
        'cmp_battery': CMP('encam p^ oh she Mummasburg rajad. a mile from tjown.', CMP_QUARTER),
        'cmp_quarter': CMP('quartered in town—in the Ct urthoute and on the pavements', CMP_QUARTER),
        'cmp_guards': CMP('town, and their (guards around it.', CMP_ENTRY),
        'jac_early': L('JACOBS-1864', 'General Early, who accompanied this brigade, and remained in town over Friday night, demanded of the authorities of our borough'),
        'jac_citizens': L('JACOBS-1864', 'Our citizens, with a few exceptions, kept at a respectful distance from them during their stay amongst us'),
    },
    scenarios=[],
    remains=['militia prisoners confined in the Court-house', 'rain during the night (Early: the day was rainy; Jacobs: rain most of the day)'],
    searched=['OR27-2-R470 p.465 read (the Mummasburg camp, Hays); Compiler 1863-06-29 p.2 (page image) read; Jacobs pp.16-19; Library regex court.?house in the 1863 newspapers and Jacobs, Pierce: no prisoners in the Court-house',
              'OR vol.27 pts 1-3 regex prisoners.{0,80}Gettysburg.{0,80}(Court|jail|confined): no hit'],
    recheck='OR-RECHECK: both stored quotes found at p.465. Delegated decision DD-08 applied (Mummasburg camp promoted from inferred to documented for that sub-claim only); the Compiler adds the quartering in town; the prisoners in the Court-house stay open.',
    register=reg('Militia prisoners in the Court-house and the rain during the night of Jun 26', 'No text read confines prisoners in the Court-house (it quartered troops) or gives the weather of the night.', 'Bivouac positions documented; prisoners and night rain not shown as fact', 'documented',
                 competing='troops quartered in the Court-house (Compiler) against prisoners in it (seed)', impact='Court-house interior and night weather on Jun 26', ask='none', rids='R05, R15, R18'),
    related=['tl-01-EG-002']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-018
ROWS.append(dict(
    id='T1-018', verdict='partially_supported',
    claim=claim('Night of Jun 26 at Gettysburg: guards around the town and troops quartered in it; campfires, lights and sentries on prisoners are not documented',
                'Early\'s troops; civilians', 'Gettysburg and its neighbourhood', 'Night of Jun 26-27', 'Compiler Jun 29 1863 p.2 (guards around the town; quartering)',
                'The Compiler of Jun 29 reports that as the rebels took possession their guards were placed around the town and that about half of the brigade was quartered in town, in the Court-house and on the pavements, with several hundred more cavalry and a battery coming in in the evening. '
                'Campfires, picket posts by name, lights in houses and sentries on prisoners are not documented in any text read and stay a marked gap.',
                'open gap', '1863-06-26T20:04', '1863-06-27T04:03', marking='guards around the town and quartering: documented; fires, lights, sentries on prisoners: open gap'),
    subs=[
        ('As the rebels took possession of the town their guards were placed around it', 'documented', 'supported', ['cmp_guards']),
        ('About half of the brigade was quartered in town, in the Court-house and on the pavements; several hundred more cavalry and a battery came in in the evening', 'documented', 'supported', ['cmp_quarter']),
        ('Campfires, named picket posts, lights in houses, sentries on prisoners', 'open gap', 'unsupported', []),
    ],
    cites={
        'cmp_guards': CMP('town, and their (guards around it.', CMP_ENTRY),
        'cmp_quarter': CMP('quartered in town—in the Ct urthoute and on the pavements', CMP_QUARTER),
    },
    scenarios=[],
    remains=['campfires', 'picket posts by name and place', 'lights in houses', 'sentries on prisoners'],
    searched=['Library regex camp.?fire|bivouac fires|lights? in the windows near Jun 26 in Jacobs 1864, Pierce 1889, Compiler Jun 29, Adams Sentinel Jun 30-Jul 14: no night-life passage for Jun 26 (Compiler, Jacobs and Pierce give the day and the evening only)',
              'Broadhead diary (Cornell scan): HTTP 403, not circumvented (tl-01-LK-03); archive.org title search numFound 0 (tl-01-LK-04); Myers and McCreary accounts: no copy in the library (named in the seed as sources to acquire)',
              'OR vol.27: Early p.465 gives positions only'],
    recheck='OR-RECHECK-2 (not_found: the row is itself an open gap) applied: two sub-claims are now documented from the Compiler; the rest stays the open gap named in the seed.',
    register=reg('Camp and civilian night life at Gettysburg on the night of Jun 26', 'No diary or account of the night was read: Broadhead (Cornell scan) refused, no copy on archive.org; the Compiler gives the guards and quarters only.',
                 'Guards around the town and quartering documented; fires, lights and sentries drawn only as marked plausible-procedural scene detail under the luminance floor', 'plausible-procedural',
                 competing='-', impact='night scene of Jun 26 shows documented positions only; fires and lights are marked procedural', ask='Acquire the Broadhead, Myers and McCreary diaries from an open source if one exists (delegated: free public-domain retrieval only, no circumvention)', rids='R18, R05, R21', subst='procedural night scene with the Q10 luminance floor, tier-marked'),
    related=['tl-01-EG-002']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-019
ROWS.append(dict(
    id='T1-019', verdict='partially_supported',
    claim=claim('Jun 27 morning: wet, muddy ground after the heavy rains of the days before; the hour the rain ended and the temperatures are not documented',
                'Environment (Gettysburg area; regional evidence from Chambersburg and Harrisburg)', 'Gettysburg area; Chambersburg; Camp Curtin, Harrisburg', 'Jun 27 (morning); 07:00 as the end of the rain is not documented',
                'Fremantle (Chambersburg, Jun 27); Forbes OR27-2-R417 p.259 (Harrisburg, Saturday morning Jun 27)',
                'On the morning of Saturday Jun 27 the ground was wet: Col. Forbes found the camp ground at Camp Curtin, Harrisburg, very muddy owing to the late heavy rains, and Fremantle saw Hood\'s men at Chambersburg who had discarded their shoes in the mud. '
                'NOT documented: that the rain ended at 07:00 at Gettysburg, and the readings 61 F (07:00), 63 F (14:00), 67 F (21:00), which stay a marked value of the weather model.',
                'documented', '1863-06-27T00:00', '1863-06-27T23:59', marking='wet ground: documented (regional); end of rain and temperatures: gap / plausible-procedural'),
    subs=[
        ('The camp ground at Camp Curtin, Harrisburg, on Saturday morning (Jun 27) was very muddy owing to the late heavy rains', 'documented', 'supported', ['forbes']),
        ('At Chambersburg on Jun 27 many of Hood\'s men had discarded their shoes in the mud', 'documented', 'supported', ['frem_mud']),
        ('The rain ended at 07:00 on Jun 27 at Gettysburg', 'open gap', 'unsupported', []),
        ('Temperatures 61 F at 07:00, 63 F at 14:00 and 67 F at 21:00', 'plausible-procedural', 'unsupported', []),
    ],
    cites={
        'forbes': OR('The camp ground was very muddy, owing to the late heavy rains', 'OR27-2-R417', '259'),
        'frem_mud': L('FREMANTLE-1864', 'many have discarded their shoes in the mud'),
    },
    scenarios=[],
    remains=['the hour the rain ended (07:00 in the seed)', 'the thermometer readings 61 F / 63 F / 67 F'],
    searched=['Library regex thermomet|Fahrenheit|meteorolog, whole set: no 1863 reading; Jacobs 1864 pp.18-19 (Jun 27) has no weather; Jacobs 1885 and Smithsonian sheets not found (see T1-003)',
              'OR vol.27 pts 1-3 sentence scan for weather words near Jun 25-30 dates: Jun 27 hits only R417 p.259',
              'Fremantle 1864 pp.236-246 read for Jun 26-29 weather'],
    recheck='OR-RECHECK-2 (not_found: Jacobs-sourced weather row) applied: regional wet-ground evidence added from the OR and Fremantle; the end of the rain and the temperatures stay open.',
    register=reg('Jun 27 weather: end of the rain and temperatures', 'No text read gives the hour the rain ended on Jun 27 or any temperature; the evidence is regional (Harrisburg, Chambersburg).', 'Wet muddy ground on the morning of Jun 27 (documented, regional); temperatures as a marked range', 'plausible-procedural',
                 competing='-', impact='ground wetness on Jun 27 morning; temperature values marked', ask='see T1-003 (Jacobs 1885 readings)', rids='R15, R03'),
    related=['tl-01-EG-001']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-020
ROWS.append(dict(
    id='T1-020', verdict='corrected',
    claim=claim('Jun 27 at daylight Gordon\'s brigade, with Tanner\'s battery and a company of cavalry, leaves Gettysburg on the York turnpike; the rest of Early\'s division moves by Hunterstown toward Dover',
                'Gordon\'s brigade with Tanner\'s battery of Jones\' battalion and a company of French\'s cavalry (York turnpike); the rest of Early\'s division (Hays, Hoke, Smith, artillery) from Mummasburg', 'York turnpike east from Gettysburg; the rest by Hunterstown, New Chester, Hampton and East Berlin toward Dover',
                'Jun 27 from daylight (civil dawn 04:03) to 08:00 (Compiler: no Confederate left in town by 8 o\'clock); the rest of the division marched during the day', 'Early OR27-2-R470 p.466; Gettysburg Compiler Jun 29 1863 p.2; Gordon OR27-2-R477 p.491',
                'At light on Jun 27 Gordon\'s brigade with Tanner\'s battery and a company of French\'s cavalry marched on the turnpike toward York (Early); the Compiler says the division moved off down the York turnpike and by 8 o\'clock there was not a rebel in the town; the rest of the division moved from Mummasburg that morning through Hunterstown, New Chester, Hampton and East Berlin toward Dover (Early; the Compiler gives the same route). '
                'The whole division did not leave Gettysburg by the York Pike. The flag was taken down at York by Gordon\'s provost guard (Gordon); the cutting down of a flagpole at Gettysburg is not documented.',
                'documented', '1863-06-27T04:03', '1863-06-27T23:59', marking='Gordon\'s departure and the Dover route: documented; flagpole at Gettysburg: gap'),
    subs=[
        ('Gordon, with Tanner\'s battery and a company of French\'s cavalry, was directed to move on the turnpike toward York at light next morning (Jun 27)', 'documented', 'supported', ['early_light', 'early_tanner']),
        ('The Confederate division moved off down the York turnpike on Saturday morning and by 8 o\'clock there was not a rebel in the town (Compiler)', 'documented', 'supported', ['cmp_york']),
        ('The rest of the command moved on the 27th from Mummasburg through Hunterstown, New Chester, Hampton and East Berlin toward Dover (Early); the Compiler gives the same route and Dover on Saturday night', 'documented', 'supported', ['early_dover', 'cmp_route']),
        ('The whole division left Gettysburg east on the York Pike at daybreak (seed)', 'documented', 'contradicted', ['early_light', 'early_dover', 'cmp_route']),
        ('Colonel White\'s cavalry was sent to Hanover Junction destroying the railroad bridges on the way', 'documented', 'supported', ['early_white']),
        ('Gordon\'s provost guard was sent ahead to take down the Federal flag left flying over the principal street (at York)', 'documented', 'supported', ['gord_flag']),
        ('Gordon\'s men chopped down the flagpole at Gettysburg', 'open gap', 'unsupported', []),
    ],
    cites={
        'early_light': OR('and directed him to move with them and his brigade on the turnpike toward York at light next morning', R470, '466'),
        'early_tanner': OR('T ordered Tanner\'s battery, of Jones\' battalion, to vejjortto (-Jeueral Gordon during the night, and also a company of French\'s cavalry', R470, '465'),
        'early_dover': OR('New Chester, Hampton, and East Berlin, toward Dover', R470, '466'),
        'early_white': OR('and I also directed Colonel White to proceed with his cavalry to Hanover Junction, on the Northern Central road, destroying the railroad bridges on the way', R470, '466'),
        'gord_flag': OR('take down the Federal flag left flying over the jDrincipal street', R477, '491'),
        'cmp_york': CMP('Y ork turnpike, and by S. , \'ct - tk -thert W»s n o t a greybaok m -tbe', 'On Saturday morning the division moved off, down the York turnpike, and by 8 o\'clock there was not a greyback in the town.'),
        'cmp_route': CMP('p-occeded by the way of Hunterstown, New', 'The force encamped at Mummasburg proceeded by the way of Hunterstown, New Chester, Hampton and Berlin, and encamped near Dover, in York county, on Saturday night, evidently making for the turnpike between York and Harrisburg.'),
    },
    scenarios=[
        sc('A', 'Seed: the whole division leaves Gettysburg east on the York Pike at daybreak', 'seed sources ABT-Early, W-GC (Wikipedia: "morning of June 27") - no text read supports the whole division on the pike', 'open gap', []),
        sc('B', 'Gordon\'s brigade (with Tanner\'s battery and a company of cavalry) on the York turnpike at light; the rest by Hunterstown, New Chester, Hampton and East Berlin toward Dover', 'Early OR27-2-R470 p.466; Compiler Jun 29 1863 p.2', 'documented', ['early_light', 'early_dover', 'cmp_york', 'cmp_route']),
    ],
    remains=['the chopping down of a flagpole at Gettysburg (Gordon\'s report has the flag taken down at York)'],
    searched=['OR27-2-R470 pp.465-467 and R477 p.491 read; Compiler 1863-06-29 p.2 (page image); Jacobs p.18 (hurried forward that night and the next morning toward Hanover and York)',
              'Library regex flag.?pole|flag.?staff|liberty.?pole|pole.{0,40}(cut|chop) in the 1863 newspapers, Jacobs, Pierce, Pennsylvania at Gettysburg, BL-3 and SHSP 4-6: no flagpole cut down at Gettysburg (hits are Charleston, Mobile and Mississippi River flags)'],
    recheck='OR-RECHECK: both stored quotes found at p.466. Shard verdict "conflict" applied: the seed whole-division reading is kept only as a marked scenario; the Compiler of Jun 29 independently gives the Hunterstown-Dover route, so the conflict is between the seed and two witnesses.',
    register=reg('Flagpole cut down at Gettysburg on Jun 27', 'Gordon\'s report has the Federal flag taken down at York, not Gettysburg; no text read has a flagpole cut down at Gettysburg.', 'Departure of Gordon\'s brigade on the York turnpike and of the rest by Hunterstown documented; flagpole not shown', 'documented',
                 competing='whole division on the York Pike (seed) against Gordon only on the pike (Early, Compiler)', impact='the flagpole is not drawn as chopped; the route of the rest of the division follows Early', ask='none: scenarios stay selectable, no default', rids='R11, R13'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-021
ROWS.append(dict(
    id='T1-021', verdict='partially_supported',
    claim=claim('The President relieves Hooker and appoints Meade (General Orders No. 194, Washington, Jun 27); the order reaches Meade at about 03:00 on Jun 28',
                'The President (Lincoln), Maj. Gen. Hooker, Maj. Gen. Meade; Col. J. A. Hardie of Halleck\'s staff', 'Washington (order); Meade\'s camp near Frederick, Md. (delivery)',
                'Order dated Jun 27 (hour not stated); delivered to Meade at about 03:00 on Jun 28', 'General Orders No. 194, OR27-3-D0831 p.369; Halleck to Meade, OR27-1-R006 p.61; Life and Letters of G. G. Meade vol.2 p.1',
                'By direction of the President, Maj. Gen. Hooker was relieved from command of the Army of the Potomac and Maj. Gen. Meade appointed to it, by General Orders No. 194 of the War Department dated Washington, June 27, 1863; Halleck\'s covering letter of the same date sends Meade the order of the President. The order reached Meade at about three o\'clock on the morning of Jun 28, brought by Col. Hardie. '
                'NOT documented: that the order was issued in the evening of Jun 27.',
                'documented', '1863-06-27T00:00', '1863-06-28T03:00', marking='date and content: documented; "evening" hour: gap'),
    subs=[
        ('By direction of the President Hooker is relieved from command of the Army of the Potomac and Meade appointed (G.O. No. 194, War Department, Washington, Jun 27, 1863)', 'documented', 'supported', ['go194']),
        ('Halleck\'s letter of Jun 27 tells Meade he will receive with it the order of the President placing him in command', 'documented', 'supported', ['halleck']),
        ('The order was delivered to Meade, in his camp at Ballinger\'s Creek just outside Frederick, at about three o\'clock on the morning of Jun 28 by Col. J. A. Hardie of Halleck\'s staff', 'documented', 'supported', ['hardie', 'll_camp']),
        ('The order was issued in the evening of Jun 27', 'open gap', 'unsupported', []),
    ],
    cites={
        'go194': OR('By direction of the President, Maj. Gen. Joseph Hooker is relieved from command of the Army of the Potomac, and Maj. Gen. George G. Meade is appointed to the command of that army', 'OR27-3-D0831', '369'),
        'halleck': OR('the order of the President placing you in command of the Army of the Potomac', 'OR27-1-R006', '61'),
        'hardie': L('MEADE-LL-v2', 'General Meade lay quietly asleep in his tent at three o\'clock of the morning of June 28', page='1', page_basis='first page of Part V of the volume (opening narrative of the Gettysburg campaign); no running head is printed on it', witness='narrative by G. Meade, aide-de-camp and son of the general (1913)'),
        'll_camp': L('MEADE-LL-v2', 'arrived toward afternoon at Ballinger\'s Creek, just outside of Frederick City', page='1', page_basis='first page of Part V of the volume (opening narrative of the Gettysburg campaign); no running head is printed on it', witness='narrative by G. Meade, aide-de-camp and son of the general (1913)'),
    },
    scenarios=[],
    remains=['the hour of issue on Jun 27 ("evening" in the seed)'],
    searched=['OR27-3-D0831 (G.O. 194) and OR27-1-R006 (Meade, Halleck\'s letter) read; OR vol.27 pt.3 regex relieved.{0,200}Hooker and Hooker.{0,300}request.{0,60}relieved: no dispatch with an hour for the issue of the order',
              'Life and Letters of G. G. Meade vol.2 pp.1-2 read (delivery at about 03:00 on Jun 28)'],
    recheck='OR-RECHECK: the stored quote was found at OR27-3-D0831 p.369. Shard note applied ("Lincoln not named, no hour"): the order says "the President"; the evening hour is withdrawn from the displayed claim; the delivery hour is added from the Meade biography.',
    register=reg('Hour of issue of G.O. 194 on Jun 27', 'The order is dated Jun 27 without an hour; the delivery to Meade is at about 03:00 on Jun 28.', 'Order of Jun 27, delivered about 03:00 Jun 28 (documented); no issue hour shown', 'documented',
                 competing='-', impact='none beyond the window Jun 27 - 03:00 Jun 28', ask='none', rids='R11'),
    related=[]))
