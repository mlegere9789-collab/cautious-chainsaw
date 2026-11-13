"""Battle-day claims (timeline rows with gaps, June 26 to July 24, 1863): what 1863 newspapers literally print.

Same rules as claims_epi.py: every quote is cut by the builder from the saved reading text; 'reading' is what the print
says in the same passage (the page image region was viewed, images.jsonl); a correction pair is [OCR text, printed text].
Tier rule (DD-NEWS-01): the statement as printed is 'documented'; a step beyond the printed words is marked in row_effect.
"""

STAR1 = 'sn83045462/1863-07-01/ed-1/seq-2'     # Evening Star, Washington, Wed. 1 July 1863, image 2
WOR2P = 'sn83021205/1863-07-02/ed-1/seq-1'     # Worcester Daily Spy, Thu. 2 July, image 1
WOR4_2 = 'sn83021205/1863-07-04/ed-1/seq-2'    # Worcester Daily Spy, Sat. 4 July, image 2
WOR4_3 = 'sn83021205/1863-07-04/ed-1/seq-3'    # same, image 3 (postscript, telegraph)
WHE4 = 'sn84026845/1863-07-04/ed-1/seq-3'      # Daily Intelligencer, Wheeling, Sat. 4 July, image 3
TRIB6 = 'sn83030213/1863-07-06/ed-1/seq-12'    # New-York Daily Tribune, Mon. 6 July, image 12
HER6_4 = 'sn83030313/1863-07-06/ed-1/seq-4'    # New York Herald, Mon. 6 July, image 4
HER6_10 = 'sn83030313/1863-07-06/ed-1/seq-10'  # same, image 10
INT6 = 'sn83026172/1863-07-06/ed-1/seq-1'      # Daily National Intelligencer, Mon. 6 July, image 1
POR6 = 'sn83016025/1863-07-06/ed-1/seq-3'      # Portland Daily Press, Mon. 6 July, image 3
WOR8 = 'sn83021205/1863-07-08/ed-1/seq-1'      # Worcester Daily Spy, Wed. 8 July, image 1
CHI10 = 'sn84031490/1863-07-10/ed-1/seq-2'     # Chicago Daily Tribune, Fri. 10 July, image 2
TRIB13 = 'sn83030213/1863-07-13/ed-1/seq-1'    # New-York Daily Tribune, Mon. 13 July, image 1
HER24 = 'sn83030313/1863-07-24/ed-1/seq-2'     # New York Herald, Fri. 24 July, image 2

UNK = {'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read'}

CLAIMS = [
    # ---------------------------------------------------------------- Jun 26-27: Early at Gettysburg, Stevens's furnace
    dict(ids=['T1-005'], key='stevens-furnace-destroyed',
         sub_claim=('Thaddeus Stevens\'s furnace near Gettysburg was destroyed by the Confederates: the Evening Star (Washington, 1 July 1863), printing a Philadelphia Inquirer correspondence from '
                    'Harrisburg dated June 30, quotes an informant who went on from Gettysburg toward Chambersburg after the rebels had left: "At Stevens\' Furnace, which, by the way, belongs to Hon. '
                    'Thaddeus Stevens, the rebels burned everything, and what could not be burned was destroyed"; the Worcester Daily Spy (2 July) prints "Hon. Thad. Stevens\' iron mills near Gettysburg have '
                    'been destroyed by the rebels. His loss is about $100,000."'),
         tier='documented', state_date='1863-06-26 to 1863-06-30',
         cites=[dict(page=STAR1, span=("At Stevens' Furnace", 'was destroyed.'), img='b_star_stevens',
                     attribution='Correspondence of the Philadelphia Inquirer.', dateline='J une 30.',
                     reading=('At Stevens\' Furnace, which, by the way, belongs to Hon. Thaddeus Stevens, the rebels burned everything, and what could not be burned was destroyed. About a mile and a half further out my informant met the outposts of A. P. Hill\'s corps.'),
                     corrections=[['Thaddens .steven?;', 'Thaddeus Stevens,'], ['ceuld', 'could'], ['way.', 'way,']],
                     reprint={'status': 'reprint', 'from': 'a correspondence of the Philadelphia Inquirer, Harrisburg, June 30 (the heading reads "[Correspondence of the Philadelphia Inquirer.]")', 'basis': '[Correspondence of the Philadelphia Inquirer.]'}),
                dict(page=WOR2P, span=('Hon. Thad. Stevens’ iron mills', 'IOO.OOO.'), img='b_wor_stevens',
                     reading='Hon. Thad. Stevens\' iron mills near Gettysburg have been destroyed by the rebels. His loss is about $100,000.',
                     corrections=[['§IOO.OOO.', '$100,000.'], ['Get tysburg', 'Gettysburg']],
                     reprint=UNK)],
         row_effect=('adds to the row (Caledonia Furnace burned; the row says the time is not stated, "about 2 miles out" on the Cashtown Pike): the 1863 press confirms the destruction of Stevens\'s works and prints a loss of about $100,000; '
                     'neither passage gives the hour or the day of the burning; the Star\'s informant passed it on the road toward Chambersburg after the rebels left Gettysburg'),
         remains='the hour and day of the burning; which building (the Star says "Furnace", the Spy "iron mills"); the loss figure is a newspaper figure',
         independence='the Spy item and the Star correspondence are separate reports; the Spy item is a short telegraphic paragraph with no source named'),

    dict(ids=['T1-014', 'T1-020'], key='early-occupation-star',
         sub_claim=('The Evening Star (1 July 1863), printing a Philadelphia Inquirer correspondence from Harrisburg dated June 30, quotes an informant who was in Gettysburg when the rebels entered: "The place was occupied on '
                    'Friday afternoon last by four thousand five hundred Rebels under command of General Early; they had with them twenty pieces of light artillery", and "The next morning after the occupation the rebels left '
                    'Gettysburg, after stealing everything they could lay their hands on. They pursued their way for York by way of Hanover. They left no troops whatever at Gettysburg, and the same force occupied York."'),
         tier='documented', state_date='1863-06-26 to 1863-06-27',
         cites=[dict(page=STAR1, span=('My informant was m Gettysburg', 'ot light artillery.'), img='b_star_inf1',
                     attribution='Correspondence of the Philadelphia Inquirer.',
                     reading='My informant was in Gettysburg at the time the Rebel troops entered the town. The place was occupied on Friday afternoon last by four thousand five hundred Rebels under command of General Early; they had with them twenty pieces of light artillery.',
                     corrections=[['m Gettysburg', 'in Gettysburg'], ['tim ? the', 'time the'], ['triday', 'Friday'], ['tour thousand', 'four thousand'], ['o! General', 'of General'], ['ot light', 'of light']],
                     reprint={'status': 'reprint', 'from': 'a correspondence of the Philadelphia Inquirer, Harrisburg, June 30', 'basis': '[Correspondence of the Philadelphia Inquirer.]'}),
                dict(page=STAR1, span=('The next morning after the occupation', 'occupied York'), img='b_star_inf2',
                     attribution='Correspondence of the Philadelphia Inquirer.',
                     reading='The next morning after the occupation the rebels left Gettysburg, after stealing everything they could lay their hands on. They pursued their way for York by way of Hanover. They left no troops whatever at Gettysburg, and the same force occupied York.',
                     corrections=[['eft Gettysburg', 'left Gettysburg'], ['"very! thing', 'everything'], ['Thev* pursued', 'They pursued'], ['lor Y"ork', 'for York'], ['Har over', 'Hanover'], ['whatever at Uetl tysburg', 'whatever at Gettysburg']],
                     reprint={'status': 'reprint', 'from': 'a correspondence of the Philadelphia Inquirer, Harrisburg, June 30', 'basis': '[Correspondence of the Philadelphia Inquirer.]'})],
         row_effect=('agrees with the row\'s occupation on the afternoon of Friday 26 June and the departure on the morning of 27 June (T1-020); the informant says the rebels went "for York by way of Hanover", the row says east on the York Pike; '
                     'the 4,500 men and twenty guns are the informant\'s figures (a second-hand number of an unnamed witness); "stealing everything they could lay their hands on" is consistent with the row\'s supply demands and looting (T1-014)'),
         remains='the informant is unnamed; the figures are his; no hour of arrival or departure is printed',
         independence='one informant\'s account'),

    # ---------------------------------------------------------------- Jul 2: Twelfth Corps works, weather at noon, Penn College
    dict(ids=['T1-200', 'T2-059', 'T2-061', 'T2-081', 'R14.0000'], key='twelfth-corps-works-hosmer',
         sub_claim=('The New York Herald (6 July 1863) prints Mr. Geo. W. Hosmer\'s despatch, dated "Army of the Potomac, July 4, 1863", on Thursday 2 July: the defence of the line from Cemetery Hill to Rock Creek "had been entrusted to '
                    'the gallant Twelfth corps, under General Slocum, and for three or four hours on Thursday the men of that command did their utmost to strengthen the place, and by two o\'clock P. M. had constructed, with timber, '
                    'stones and earth, a good breastwork, which extended the whole length of the ridge, and which numerous officers of the corps affirmed they could hold against any force."'),
         tier='documented', state_date='1863-07-02',
         cites=[dict(page=HER6_4, span=('for three or four bourn', 'any force,'), img='b_her_works',
                     attribution="MR. <;E0. w. HOSMRK'8 DESPATCH.",
                     reading=('...to the gallant Twelfth corps, under General Slocum, and for three or four hours on Thursday the men of that command did their utmost to strengthen the place, and by two o\'clock P. M. had constructed, '
                              'with timber, stones and earth, a good breastwork, which extended the whole length of the ridge, and which numerous officers of the corps affirmed they could hold against any force.'),
                     corrections=[['bourn', 'hours'], ['Ihursdav', 'Thursday'], ['I hat com maud di<l their inmost', 'that command did their utmost'], ['Utc place', 'the place'], ['o\'clook f. M', 'o\'clock P. M.'], ['coast rue tad', 'constructed'], ['stooea and e.rth', 'stones and earth'], ['wh.ch', 'which'], ['tha wltola length of tha ridge', 'the whole length of the ridge'], ['bold', 'hold']],
                     reprint={'status': 'original', 'from': 'the Herald\'s own correspondent (the heading reads "MR. GEO. W. HOSMER\'S DESPATCH. Army of the Potomac, July 4, 1863", read from the print)', 'basis': "MR. <;E0. w. HOSMRK'8 DESPATCH."})],
         row_effect=('bears on the start-time conflict of the Twelfth Corps works (T1-200: night of 1-2 July per DMNA, about 06:00 per HistoryNet; T2-081: largely complete from about 10:00 to noon): the Herald prints a duration and an end hour for Thursday '
                     '(three or four hours of work, a good breastwork finished by two o\'clock P. M.) and says nothing of night work; the words imply a start about 10:00 to 11:00 on 2 July, which is an inference from the printed hours, not a printed start time; '
                     'the writer says the works ran the length of the ridge and used timber, stones and earth'),
         remains='the start hour is not printed; whether "the corps" includes the lower-hill and Greene\'s sector in the same words; the despatch is a journalist\'s report written on 4 July from what he saw and was told',
         caution='conflicts with the night of 1-2 July start (DMNA) and agrees only loosely with the 06:00 start; carry as one more value of the conflict, no default'),

    dict(ids=['T2-113', 'R15.0000'], key='weather-0702-noon-sultry',
         sub_claim=('On Thursday 2 July at noon on the right of the line: "the day wore on, and the rebels did not come. Noon came, almost insufferably sultry; but still there was no rebel advance, and between three and four P. M. '
                    'the great battle broke out elsewhere" (Herald, 6 July, Hosmer\'s despatch of 4 July).'),
         tier='documented', state_date='1863-07-02',
         cites=[dict(page=HER6_4, span=('the rebe.s did not come.', 'broke out elsewhere.'), img='b_her_noon',
                     attribution="MR. <;E0. w. HOSMRK'8 DESPATCH.",
                     reading='but the day wore on, and the rebels did not come. Noon came, almost insufferably sultry; but still there was no rebel advance, and between three and four P. M. the great battle broke out elsewhere.',
                     corrections=[['rebe.s', 'rebels'], ['N"<>n <ame, almntt insufferably', 'Noon came, almost insufferably'], ['thiee aad four P. )(?', 'three and four P. M.'], ['greet', 'great']],
                     reprint={'status': 'original', 'from': 'the Herald\'s own correspondent Geo. W. Hosmer', 'basis': "MR. <;E0. w. HOSMRK'8 DESPATCH."})],
         row_effect='agrees with the row\'s heat at midday and afternoon (81 F at 14:00, heat index about 90 F); no drizzle or rain is printed for the noon hour on the right of the line (the row carries a drizzle versus clearing conflict)',
         remains='no temperature, no cloud amount, no wind; one writer; the left of the line is not described'),

    dict(ids=['T1-135', 'T1-111', 'T2-022'], key='penn-college-hospital-0702',
         sub_claim=('A special of the New York Times dated on the battle field on Thursday 2 July (the Wheeling Intelligencer, 4 July: "on the morning of Thursday"; the Worcester Daily Spy, 4 July: "at noon, Thursday") says: "The rebels occupy '
                    'Pennsylvania College as a hospital" (the Spy prints "Renna College") and "There has been skirmishing all the morning".'),
         tier='documented', state_date='1863-07-02',
         cites=[dict(page=WHE4, span=('A special to tbe Times', 'great contest.'), img='b_whe_penn',
                     reading=('A special to the Times, dated on the battle field on the morning of Thursday, says no general engagement has yet taken place, though a great battle will be fought this afternoon or to-morrow. The enemy is in great force. '
                              'Our troops are all up and well in hand. The rebels occupy Pennsylvania College as a hospital. There has been skirmishing all the morning. Both armies are preparing for the great contest.'),
                     corrections=[['tbe Times', 'the Times'], ['bas yet', 'has yet'], ['b? (ought tbis afternoon gr to morrow', 'be fought this afternoon or to-morrow'], ['Tbe eoemy ia', 'The enemy is'], ['np', 'up'], ['band', 'hand'], ['Tbe rebels', 'The rebels'], ['bas been', 'has been'], ['tbe morniog', 'the morning'], ['prepsriog', 'preparing']],
                     reprint={'status': 'reprint', 'from': 'a special of the New York Times (the passage begins "A special to the Times")', 'basis': 'A special to tbe Times'}),
                dict(page=WOR4_2, span=('A special to the Times, dated on the battle field', 'great con test.'), img='b_wor_penn',
                     reading=('A special to the Times, dated on the battle field at noon, Thursday, says no general engagement has yet taken place, although a great battle is to be fought this afternoon or to-morrow. The enemy is in great force. '
                              'Our troops are all up and well in hand. The rebels occupy Renna College as a hospital. There has been skirmishing all the morning, both the armies preparing for the great contest.'),
                     corrections=[['Thursday’,', 'Thursday,'], ['en gagement', 'engagement'], ['con test', 'contest']],
                     reprint={'status': 'reprint', 'from': 'a special of the New York Times (the passage begins "A special to the Times")', 'basis': 'A special to the Times'})],
         row_effect=('agrees with T1-135/T2-022 (the Confederates take over the Pennsylvania College hospital) and adds a dated press statement for the forenoon or noon of 2 July; the two papers give different hours (morning, noon) for the same special; '
                     'the Spy\'s "Renna College" is a printer\'s error for Pennsylvania College'),
         remains='what the hospital held and for how long; the special does not say whose wounded were in it',
         independence='one special printed twice (different time-of-dispatch wording)'),

    # ---------------------------------------------------------------- Jul 3: morning weather, Barksdale
    dict(ids=['T3-035', 'T3-048', 'R15.0000'], key='weather-0703-morning',
         sub_claim=('Friday 3 July in the morning: a special of the New York Times datelined Gettysburg July 3 (printed by the Worcester Daily Spy on 4 July) says "The third day\'s battle began at four this morning" and, later in the '
                    'morning, "The day is now overcast, and dark, and cool. The sky threatens rain, and fog already obscures the outer field of battle"; C. C. Coffin of the Boston Journal (printed by the Chicago Tribune, 10 July) '
                    'writes "Two guns, deep and heavy, at four o\'clock. It was a cloudy, sultry morning. The clouds hung thick and heavy, and came down low upon the hills."'),
         tier='documented', state_date='1863-07-03',
         cites=[dict(page=WOR4_3, span=('The day is now over cast', 'obscures the outer field of battle.'), img='b_wor_fog',
                     attribution='Special to the Now York Times.', dateline='Gettysburg, July 3.',
                     reading=('The day is now overcast, and dark, and cool. The sky threatens rain, and fog already obscures the outer field of battle.'),
                     corrections=[['over cast', 'overcast'], ['Tne sky', 'The sky']],
                     reprint={'status': 'reprint', 'from': 'a special to the New York Times (heading "Special to the New York Times.", datelined Gettysburg, July 3)', 'basis': 'Special to the Now York Times.'}),
                dict(page=CHI10, span=('Boom I boom I Two guns', 'low upon the hills.'), img='b_chi_coffin',
                     attribution='C. C. Coffin, esq., the correspondent of the Boston Journal',
                     reading='THE GREAT BATTLE OF FRIDAY. Boom! boom! Two guns, deep and heavy, at four o\'clock. It was a cloudy, sultry morning. The clouds hung thick and heavy, and came down low upon the hills.',
                     corrections=[['Boom I boom I', 'Boom! boom!']],
                     reprint={'status': 'reprint', 'from': 'C. C. Coffin, correspondent of the Boston Journal, as quoted by the Chicago Tribune (heading and first lines read from the print)', 'basis': 'C. C. Coffin, esq., the correspondent of the Boston Journal'})],
         row_effect=('agrees with the row (overcast at 08:00, very humid; "overcast skies" and possible ground fog) and adds the 1863 writers\' words: fog over the outer field and an overcast, dark sky (Times special), low heavy cloud (Coffin); '
                     'the two writers disagree on temperature ("cool" against "sultry") which the row carries as a wind/weather conflict set; rain "threatened" but is not said to have fallen on the morning of 3 July'),
         remains='no thermometer reading, wind, or humidity; the Times special is undated by hour except the "7 3-4 a.m." line after it; Coffin\'s account was written after the battle',
         independence='two separate writers'),

    dict(ids=['T2-173', 'R03.C-037'], key='barksdale-dead-0703',
         sub_claim=('The Times special datelined Gettysburg July 3 (Worcester Daily Spy, 4 July) prints at "7 3-4 A. M.": "Gen. Barksdale of Mississippi, wounded yesterday, is lying dead within our lines"; the New-York Tribune (6 July) prints '
                    '"Gen. Barksdale is dead, and buried in our lines."'),
         tier='documented', state_date='1863-07-03',
         cites=[dict(page=WOR4_3, span=('Gen. Barksdale of Mississippi', 'within our lines.'), img='b_wor_fog',
                     attribution='Special to the Now York Times.', dateline='Gettysburg, July 3.',
                     reading='7 3-4 A. M.—Gen. Barksdale of Mississippi, wounded yesterday, is lying dead within our lines.',
                     corrections=[['7 3-4 a. m.', '7 3-4 A. M.']],
                     reprint={'status': 'reprint', 'from': 'a special to the New York Times (datelined Gettysburg, July 3)', 'basis': 'Special to the Now York Times.'}),
                dict(page=TRIB6, span=('Ewo!l is reported wounded', 'woanded.'), img='b_trib_barks',
                     reading='Ewell is reported wounded. Gen. Barksdale is dead, and buried in our lines. The citizens of Gettysburg affirm that Lee is certainly wounded.',
                     corrections=[['Ewo!l', 'Ewell'], ['Gen, Barksdale', 'Gen. Barksdale'], ['snd buried', 'and buried'], ['Tie citizens of Gestysburg', 'The citizens of Gettysburg'], ['cortainly woanded', 'certainly wounded']],
                     reprint=UNK)],
         row_effect=('bears on the Barksdale death conflict (July 2 per SS-HUM, July 3 per other sources): the Times special puts him dead by about 07:45 on 3 July and "wounded yesterday" (2 July), which fits a death in the night of 2-3 July or early on 3 July '
                     'and does not fit a death on the afternoon or evening of 2 July as such a report would then say "died yesterday"; it is a first, fast report and prints no place; the hospital (Hummelbaugh farm) of the row is not named'),
         remains='the hour and place of death; the Tribune passage is undated within the page',
         independence='two separate reports'),

    # ---------------------------------------------------------------- Jul 4-5: rain
    dict(ids=['T3-164', 'T3-173', 'T3-174', 'R15.0000'], key='rain-meade-dispatch-0705',
         sub_claim=('Meade\'s dispatch to Halleck headed "Headquarters Army of the Potomac, July 5—8.20 A. M." (printed 6 July in the National Intelligencer; the same text is in many papers, other papers print 8.30 or 9.30) says: '
                    '"The enemy retired under cover of the night and heavy rain in the direction of Fairfield and Cashtown."'),
         tier='documented', state_date='1863-07-04 night to 1863-07-05',
         cites=[dict(page=INT6, span=('HEADQUARTERS Army of the Potomac, July 5', 'Cashtown.'), img='b_int_meade',
                     attribution='HEADQUARTERS Army of the Potomac, July 5', dateline='July 5',
                     reading=('HEADQUARTERS ARMY OF THE POTOMAC, July 5—8.20 A. M. Major General HALLECK: The enemy retired under cover of the night and heavy rain in the direction of Fairfield and Cashtown. My cavalry are in pursuit.'),
                     corrections=[['cav alry', 'cavalry']],
                     reprint={'status': 'wire', 'from': 'an official dispatch of General Meade to General Halleck, printed by many papers (the Herald, Chicago Tribune, Wheeling Intelligencer and others print it with 8.30 a.m.)', 'basis': 'Major General Halleck'})],
         row_effect=('supports heavy rain during the night of 4-5 July (T3-164 "very heavy rain" from 21:00 on 4 July, Strategypage) and rain at the time of the retreat (T3-173, T3-174 "Jul 5 rain"); an official dispatch, it prints the rain as a fact of the night, '
                     'with no hour; the time of the dispatch is 8.20 in this paper and 8.30 in others'),
         remains='the hour rain began; amount; whether the rain was at Gettysburg or along the retreat road (the dispatch says the enemy retired "under cover of the night and heavy rain")',
         independence='an official dispatch printed in many papers (one text)'),

    dict(ids=['T3-164', 'R15.0000'], key='rain-philadelphia-carlisle-0705',
         sub_claim=('A dispatch of 5 July printed by the Portland Daily Press (6 July) and the Worcester Daily Spy: "Philadelphia, July 5. The rain is falling copiously here. There was a severe storm near Carlisle yesterday. '
                    'It is hoped that the Potomac has risen by this time, rendering the ford useless."'),
         tier='documented', state_date='1863-07-04 to 1863-07-05',
         cites=[dict(page=POR6, span=('Philadelphia, July 5. The rain is falling', 'ford useless.'), img='b_por_rain',
                     reading='PHILADELPHIA, July 5. The rain is falling copiously here. There was a severe storm near Carlisle yesterday.—It is hoped that the Potomac has risen by this time, rendering the ford useless.',
                     corrections=[['l\'otomac', 'Potomac']],
                     reprint={'status': 'wire', 'from': 'a telegraphic dispatch (the same sentences stand in the Worcester Daily Spy of 6 July); no agency named on the page text read', 'basis': 'identical wording in a second paper'})],
         row_effect='adds a severe storm near Carlisle (about 35 miles north of Gettysburg) on 4 July and rain at Philadelphia on 5 July: consistent with the row\'s rain on 4-5 July, not a Gettysburg observation',
         remains='the hour of the Carlisle storm; Gettysburg is not named'),

    dict(ids=['T3-164', 'T3-173', 'R15.0000'], key='weather-herald-osborn-0705',
         sub_claim=('The New York Herald (6 July), in a despatch of Galen H. Osborn headed "Field of Battle, near Gettysburg, Pa., July 5—7 A. M.", prints: "As it always happens after a great battle, the weather yesterday and to-day is '
                    'vastly changed from that of Friday. The sky is overcast with heavy, dark, low hanging clouds, and at intervals the rain pours down in torrents. The fresh fields on which the battle was fought have become so softened '
                    'that the task of transporting the wounded in ambulances is one of no little difficulty."'),
         tier='documented', state_date='1863-07-04 to 1863-07-05',
         cites=[dict(page=HER6_10, span=('tbe weather yesterday and to day', 'in torrenU'), img='b_her_weather',
                     attribution="MR. GALEN H. OsllORN'S DESPATCH.",
                     reading='As it always happens after a great battle, the weather yesterday and to-day is vastly changed from that of Friday. The sky is overcast with heavy, dark, low hanging clouds, and at intervals the rain pours down in torrents. The fresh fields on which the battle was fought have be[come so softened that ...]',
                     corrections=[['tbe', 'the'], ['H vastly', 'is vastly'], ['Frl ?lav', 'Fri-day'], ['fbe sky', 'The sky'], ['ram pours do?n', 'rain pours down'], ['torrenU', 'torrents']],
                     reprint={'status': 'original', 'from': 'the Herald\'s own correspondent (the paragraph follows the heading "MR. GALEN H. OSBORN\'S DESPATCH. Field of Battle, near Gettysburg, Pa., July 5—7 A. M.", read from the print)', 'basis': "MR. GALEN H. OsllORN'S DESPATCH."})],
         row_effect=('supports rain at Gettysburg on 4 July and the morning of 5 July (T3-164, T3-173) and the soft, muddy ground; "yesterday and to-day" means 4 and 5 July as the despatch is dated 5 July, 7 a.m.; '
                     'the heading position of the paragraph (after a rule line) is read from the OCR layer and the print, the paragraph may belong to a following despatch of the same page'),
         remains='the hour rain began on 4 July; amounts; temperature',
         caution='the paragraph\'s own date is inferred from the despatch heading above it'),

    dict(ids=['T3-164', 'T3-173', 'R15.0000'], key='rain-since-friday-night',
         sub_claim=('The Worcester Daily Spy (8 July) prints: "The heavy and almost incessant rains since Friday night have rendered the soft country roads almost as impassable as in Virginia, and has raised the Potomac seven feet, '
                    'so that fording at present is impossible." (Friday night is 3 July).'),
         tier='documented', state_date='1863-07-03 night to 1863-07-07',
         cites=[dict(page=WOR8, span=('The heavy and almost incessant rains since Friday night', 'impossible.'), img='b_wor_rains',
                     reading='The heavy and almost incessant rains since Friday night have rendered the soft country roads almost as impassable as in Virginia, and has raised the Potomac seven feet, so that fording at present is impossible.',
                     corrections=[['since', 'since']],
                     reprint=UNK)],
         row_effect='differs from the row\'s rain beginning about 21:00 on 4 July: this summary puts the beginning of the rains on Friday night (3 July); a news-summary sentence with no place or source; carried beside the other rain hours',
         remains='source and place of the sentence; Friday night may be loose wording',
         conflict='start of the rain: Friday night 3 July (Spy summary), the afternoon or night of 4 July (other press, Strategypage), the night of 4-5 July (Meade)'),

    # ---------------------------------------------------------------- hospitals and the wounded
    dict(ids=['R05.0000', 'R13.0000', 'R03.C-047'], key='wounded-crowd-herald-0706',
         sub_claim=('The New York Herald (6 July) prints: "The country about Gettysburg is crowded with wounded men. Every house and barn is a hospital. Probably in the aggregate of both armies at least 50,000 men have been placed hors de combat. '
                    'The apportionment of this loss would probably be twenty thousand Union and thirty thousand rebels." (read from the print; the OCR layer has 60.000).'),
         tier='documented', state_date='1863-07-05',
         cites=[dict(page=HER6_4, span=('The country* about Gettysburg is erowded', 'thirty thousand rebels.'), img='b_her_wounded',
                     reading='The country about Gettysburg is crowded with wounded men. Every house and barn is a hospital. Probably in the aggregate of both armies at least 50,000 men have been placed hors de combat. The apportionment of this loss would probably be twenty thousand Union and thirty thousand rebels.',
                     corrections=[['country*', 'country'], ['erowded', 'crowded'], ['60.000', '50,000'], ['rebols', 'rebels']],
                     reprint=UNK)],
         row_effect='adds a first press estimate (50,000 both armies, 20,000 Union and 30,000 rebel) to the casualty-totals scenario list (C-047) and the 1863 words "every house and barn is a hospital" to the field-hospital evidence (R05, R13)',
         remains='the figure is an estimate by the writer, not a count; the writer, dateline and day are not read for this paragraph (it stands on the Herald page of Monday 6 July among despatches of 3-5 July)'),

    dict(ids=['T1-135', 'T2-178', 'R05.0000', 'R13.0000'], key='hospitals-herald-0717',
         sub_claim=('The New York Herald (24 July 1863) prints "Mr. N. Davidson\'s Despatch. Gettysburg, Pa., July 17, 1863": the wounded in the hospitals of the several army corps "will aggregate about 10,000. Of these there are still here about 3,500, '
                    'over half of which are amputations. Of the latter it is estimated that at least one in three will prove fatal. The deaths in hospital so far are about ten per cent of the original number"; "Our hospitals are situated in the town '
                    'churches and public offices, and in the country, from two to four miles out—chiefly the latter. Those in the town are a portion of the First army corps and the cavalry and reserve artillery corps. Then there are officers and '
                    'privates in many of the private houses".'),
         tier='documented', state_date='1863-07-17',
         cites=[dict(page=HER24, span=('Ihey can be obtained', 'The deaths In number.'), img='b_her24_num',
                     reading='They can be obtained after a time at Washington. The number will aggregate about 10,000. Of these there are still here about 3,500, over half of which are amputations. Of the latter it is estimated that at least one in three will prove fatal. The deaths in hospital so far are about ten per cent of the original number.',
                     corrections=[['Ihey', 'They'], ['wW ag?regale', 'will aggregate'], ['eliU here about ^,500.over half', 'still here about 3,500, over half'], ['Of U? latter it la estimated L?piUl eo far', 'Of the latter it is estimated ... in hospital so far'], ['lutai', 'fatal']],
                     reprint={'status': 'original', 'from': 'a despatch of the Herald\'s correspondent N. Davidson, Gettysburg, July 17, 1863 (heading read from the print)', 'basis': 'Gettysburg, Pa., July 17, 1863 (print)'}),
                dict(page=HER24, span=("Ol'ft HWPtlli are situated", 'reserve artillery corps.'), img='b_her24_where',
                     reading='OUR HOSPITALS are situated in the town churches and public offices, and in the country, from two to four miles out—chiefly the latter. Those in the town are a portion of the First army corps and the cavalry and reserve artillery corps. Then there are officers and privates in many of the private houses',
                     corrections=[["Ol'ft HWPtlli", 'OUR HOSPITALS'], ['.he town churches and publ*J***', 'the town churches and public offices, and in'], ['mitos out- chiefly', 'miles out—chiefly'], ['porfou', 'portion'], ['arm, cori*', 'army corps']],
                     reprint={'status': 'original', 'from': 'a despatch of the Herald\'s correspondent N. Davidson, Gettysburg, July 17, 1863', 'basis': 'Gettysburg, Pa., July 17, 1863 (print)'})],
         row_effect=('supports T1-135 (I Corps and cavalry hospitals in the town in churches and public buildings) and T2-178 (the other corps in the country out on the Baltimore turnpike side, to 2-4 miles from town); gives a 17 July census '
                     '(about 3,500 still in hospital, over half amputations; about 10,000 in all, ten per cent dead) for the Camp Letterman-era hospital population; the OCR layer of this page is poor, the readings are from the print'),
         remains='the Herald\'s later paragraphs on each corps hospital (Twelfth, Second, Third, Fifth) were not read in full; the 10,000 figure excludes two divisions the writer names',
         caution='the name N. Davidson and the dateline were read from the print; the OCR layer has them damaged'),

    dict(ids=['T3-211', 'T3-196', 'R03.C-044'], key='fly-tents-0711',
         sub_claim=('The New-York Tribune (13 July) prints: "Col. Colville, of the 1st Minnesota, is still lying wounded at Gettysburg with his men, refusing to be removed till they are cared for. Many of the wounded are still under fly-tents, '
                    'hospital-tents not having yet been received. The Rebel wounded are to be sent to Point Lookout Hospital, as well as to David\'s Island and Chester Hospital, Pa."'),
         tier='documented', state_date='1863-07-10 to 1863-07-12',
         cites=[dict(page=TRIB13, span=('Col. Colville, of the lst Minnesota', 'Chester Hospital, Pa.'), img='b_trib13_tents',
                     reading='Col. Colville, of the 1st Minnesota, is still lying wounded at Gettysburg with his men, refusing to be removed till they are cared for. Many of the wounded are still under fly-tents, hospital-tents not having yet been received. The Rebel wounded are to be sent to Point Lookout Hospital, as well as to David\'s Island and Chester Hospital, Pa.',
                     corrections=[['lst', '1st'], ['lyr wonnded', 'lying wounded'], ['wiih bus men, reiusu Lo Lt removed', 'with his men, refusing to be removed'], ['ure cared', 'are cared'], ['Many of wounded', 'Many of the wounded'], ['hospital-tents 1 having', 'hospital-tents not having'], ['Rebel woun led ur', 'Rebel wounded are'], ['Lookont', 'Lookout']],
                     reprint=UNK)],
         row_effect='adds to the Camp Letterman rows: in a Tribune dispatch of about 11 July many Gettysburg wounded were still under fly-tents because hospital tents had not arrived, i.e. before the Jul 20 or Jul 22 opening of the camp (C-044) and in the row\'s construction window (Jul 10-22); the passage does not name Camp Letterman',
         remains='the dateline of this paragraph (the page prints a dispatch "Frederick, Saturday, July 11" just after it); the source of the information; the name Camp Letterman is not printed',
         caution='the paragraph stands before the heading of a Frederick dispatch of 11 July; it is dated by position, not by a dateline of its own'),
]
