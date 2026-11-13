"""Epilogue claims (requirement R22, November 18 and 19, 1863): what 1863 newspapers literally print.

Every quote is cut by the builder out of the saved reading text (span = first marker .. end of second marker),
so it is verbatim by construction. 'reading' is what the print says in the same passage (the page image region was
viewed, see images.jsonl); a correction pair is [text in the OCR layer, text in the print].
Tier rule (DD-NEWS-01): the statement as printed is 'documented'; a step beyond the printed words is 'inferred'.
Row texts are those of epilogue_seed.jsonl (E-001 .. E-014); R22.00NN is the sub-requirement of the same row.
"""

INT21 = 'sn83026172/1863-11-21/ed-1/seq-2'    # Daily National Intelligencer, Washington City, Sat. Nov. 21, 1863, image 2
INT20 = 'sn83026172/1863-11-20/ed-1/seq-3'    # same paper, Fri. Nov. 20, image 3
STAR20 = 'sn83045462/1863-11-20/ed-1/seq-2'   # Evening Star, Washington, Fri. Nov. 20, image 2
STAR19 = 'sn83045462/1863-11-19/ed-1/seq-2'   # Evening Star, Thu. Nov. 19, image 2
REP20 = 'sn86053570/1863-11-20/ed-1/seq-2'    # Daily National Republican, Washington, Fri. Nov. 20, image 2
TRIB20 = 'sn83030213/1863-11-20/ed-1/seq-1'   # New-York Daily Tribune, Fri. Nov. 20, image 1
TRIB21 = 'sn83030213/1863-11-21/ed-1/seq-2'   # New-York Daily Tribune, Sat. Nov. 21, image 2 (special correspondent)
CHI21 = 'sn84031490/1863-11-21/ed-1/seq-1'    # Chicago Daily Tribune, Sat. Nov. 21, image 1
NASH24 = 'sn83025718/1863-11-24/ed-1/seq-4'   # Nashville Daily Union, Tue. Nov. 24, image 4
HER20 = 'sn83030313/1863-11-20/ed-1/seq-4'    # New York Herald, Fri. Nov. 20, image 4
GATE20 = 'sn83025182/1863-11-20/ed-1/seq-4'   # Daily Gate City, Keokuk, Fri. Nov. 20, image 4

INT23 = 'sn83026172/1863-11-23/ed-1/seq-3'    # National Intelligencer, Mon. Nov. 23, image 3 (B. B. French's letter)
REP19 = 'sn86053570/1863-11-19/ed-1/seq-2'    # Daily National Republican, Thu. Nov. 19, image 2 (journey, from the Baltimore Sun)
STAR19P1 = 'sn83045462/1863-11-19/ed-1/seq-1' # Evening Star, Thu. Nov. 19, image 1
INT18 = 'sn83026172/1863-11-18/ed-1/seq-3'    # National Intelligencer, Wed. Nov. 18, image 3
STAR18 = 'sn83045462/1863-11-18/ed-1/seq-2'   # Evening Star, Wed. Nov. 18, image 2

# The Intelligencer's own note of 23 Nov says its account (21 Nov) was copied from other papers.
PAGE_REPRINT = {
    INT21: {'status': 'reprint', 'from': 'other papers, not named', 'basis': 'the Intelligencer\'s note of 23 Nov: "the papers from which we copied our account of the Gettysburg ceremonies"',
            'basis_page': INT23, 'basis_quote': 'papers from which we copied our account of the Gettys burg ceremonies'},
}

WIRE_NOTE = ('The same sentences stand in several papers of 19 to 21 November (see shares_text_with); the page text read '
             'names no news agency or paper as their source, so they are one dispatch, not several witnesses.')

CLAIMS = [
    # ------------------------------------------------------------------ E-001  arrival, lodging
    dict(ids=['E-001', 'R22.0001'], key='arrival-1830-wills',
         sub_claim=('On the evening of Wednesday 18 November the President reached Gettysburg at about half past six: the National '
                    'Intelligencer (Washington, 21 Nov) prints "about half past six o\'clock in the evening" and the Evening Star '
                    '(Washington, 20 Nov) prints "6½ o\'clock on Wednesday evening" (read from the print); a large gathering of citizens '
                    'greeted him at the depot and followed him to his lodgings at the residence of David Wills, Esq.; in the Republican '
                    '(Washington, 20 Nov) a great throng lingered round "the residence of Mr. David Wills, the hospitable entertainer of '
                    'the President and his accompanying party".'),
         tier='documented', state_date='1863-11-18',
         cites=[
             dict(page=INT21, span=('reached there about half past six', 'Band of the Fifth New York Artillery'), img='int21_arr',
                  reading=('the Cabinet; the French and Italian Ministers, and other guests, reached there about half past six o\'clock in the '
                           'evening. The President was greeted at the depot with much enthusiasm by a large gathering of citizens, who followed him '
                           'to his lodgings at the residence of David Wills, Esq., where soon after his arrival he was serenaded by the Band of the '
                           'Fifth New York Artillery, in response'),
                  corrections=[['o’clock iu the evening', 'o\'clock in the evening']],
                  reprint={'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read; the same account stands in the Evening Star of 20 Nov and the Republican of 20 Nov'}),
             dict(page=STAR20, span=('The President and his suite reached Gettysburg at', 'Davfd Wills, Esq.'), img='star20_arr',
                  reading=('The President and his suite reached Gettysburg at 6½ o\'clock on Wednesday evening and was greeted at the Depot with much '
                           'enthusiasm by a large gathering of citizens, who followed him to his lodgings at the residence of David Wills, Esq.'),
                  corrections=[['0# o\'clock', '6½ o\'clock'], ['Davfd', 'David'], ['eve ning', 'evening']],
                  reprint={'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read'}),
             dict(page=REP20, span=('During Wednesday evening a great throng', 'Magis trate of the Nation.'), img='rep20_wills',
                  reading=('During Wednesday evening a great throng lingered around the residence of Mr. David Wills, the hospitable entertainer of the '
                           'President and his accompanying party, anxious to obtain a glimpse of the honored Chief Magistrate of the Nation.'),
                  corrections=[['Will-,', 'Wills,'], ['Prcsl dent', 'President'], ['honon d ( hlef Magis trate', 'honored Chief Magistrate']],
                  reprint={'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read'}),
         ],
         row_effect=('agrees with the row on the evening arrival and on the lodging at David Wills\'s house (the row notes that an encyclopedia page marks '
                     'the Wills-house claim as failing verification: three Washington papers of 20-21 Nov print it); the hour differs by half an hour from '
                     'the row\'s "about 18:00" (see the other arrival claims)'),
         remains=('the walk uphill from the station (the papers say citizens "followed him to his lodgings", not how he went); William McDougall and the '
                  'Seward address "at the Wills house" are not in these passages (Seward spoke at Mr. Harper\'s house adjoining, see E-002 claim)'),
         independence='the three papers print largely the same account; counted as one report with three printings'),

    dict(ids=['E-001', 'R22.0001'], key='arrival-1700-tribune',
         sub_claim=('The New-York Tribune\'s special correspondent (printed 21 Nov) writes that "the President, Secretary Seward, Blair, and Usher, and '
                    'some seven of the foreign ministers, arrived at about 5 o\'clock" on the Wednesday: an arrival hour of about 17:00, against the '
                    'half past six of the Washington papers.'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=TRIB21, span=('The Yresident, Secretary Seward, Blair, and Uber', 'about 5 o\'clock.'), img='trib21_arr',
                     reading=('Trains are constantly arriving crowded with strangers. The President, Secretary Seward, Blair, and Usher, and some seven '
                              'of the foreign ministers, arrived at about 5 o\'clock. The President is the guest of Mr. Wills; Secretary Seward and '
                              'others, of Mr. Harper. Serenades seem to be the order of the evening.'),
                     corrections=[['Yresident', 'President'], ['Uber', 'Usher'], ['arrived et', 'arrived at']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent (heading "From Our Special Correspondent")', 'basis': 'From Our Special Correspondent.'})],
         row_effect='differs from the row\'s "about 18:00" by about an hour (earlier); carried beside the 6:30 reports, no default',
         conflict='arrival hour: about 5 (Tribune correspondent), "about sundown" (Herald), 6:30 (Intelligencer, Star), "yesterday afternoon" (dispatch)',
         remains='the page text also says the President is the guest of Mr. Wills and Seward of Mr. Harper, but that sentence is scrambled in the OCR layer and stands only in the print'),

    dict(ids=['E-001', 'R22.0001'], key='arrival-sundown-herald',
         sub_claim=('The New York Herald (20 Nov) prints that the Marine Band accompanied the President\'s train from Washington and that "the party arrived '
                    'at Gettysburg about sundown" (read from the print; the OCR layer of the line is damaged).'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=HER20, span=('and Il.e party arlived ai', 'awnd\'-wn.'), img='her20_sundown',
                     reading='and the party arrived at Gettysburg about sundown.',
                     corrections=[['Il.e', 'the'], ['arlived ai', 'arrived at'], ['Oetlyabttrgaboul awnd\'-wn.', 'Gettysburg about sundown.']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'the passage sits in a longer account whose heading was not read'})],
         row_effect='consistent with an arrival at dusk; sunset at Gettysburg on 18 November was about 16:50 local clock time (not computed here), so "about sundown" is the earliest of the hour statements',
         remains='the OCR layer of this page is poor; only the viewed print supports the wording; the account\'s author and heading not read'),

    dict(ids=['E-001', 'R22.0001'], key='arrival-wire-afternoon',
         sub_claim=('A dispatch printed from Gettysburg on 19 Nov (Evening Star, National Intelligencer, Daily Gate City of Keokuk) says the President and the '
                    'party accompanying him "arrived here yesterday afternoon, and soon thereafter a special train from Harrisburg brought" Governor Curtin '
                    'and several other Governors; it gives no hour.'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=INT20, span=('arrived yesterday afternoon', 'military and civil life.'), reprint={'status': 'wire', 'from': None, 'basis': WIRE_NOTE}),
                dict(page=GATE20, span=('arrived here yest', 'military and civil life.'), reprint={'status': 'wire', 'from': None, 'basis': WIRE_NOTE}),
                dict(page=STAR19, span=('yesterday afternoon, and soon thereafter', 'e\'.vil life.'), reprint={'status': 'wire', 'from': None, 'basis': WIRE_NOTE})],
         row_effect='consistent with the row (arrival in the evening is not contradicted; "afternoon" is vague)',
         remains='no hour; one dispatch printed three times',
         independence='one dispatch, three printings'),

    # ------------------------------------------------------------------ E-001 / E-002  Seward at the Harper house
    dict(ids=['E-001', 'R22.0001', 'E-002', 'R22.0002'], key='seward-at-harper',
         sub_claim=('After serenading the President at Mr. Wills\'s residence, the band of the Fifth New York Artillery "proceeded to the residence of Mr. '
                    'Harper, adjoining, where Secretary Seward was stopping, and serenaded him also"; Seward answered with a brief speech (text printed). '
                    'The press places the Seward address at Mr. Harper\'s house adjoining Mr. Wills\'s, not at the Wills house.'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=INT21, span=('After serenading the President, the band proceeded', 'making a brief speech, as follows'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; same text as the Star and Republican of 20 Nov'}),
                dict(page=STAR20, span=('After serenading the President, the band pro', 'brief speech, as follows'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; same text as the Intelligencer'}),
                dict(page=REP20, span=('After serenading the President, the band pro', 'making a brief speech'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; same text as the Intelligencer'})],
         row_effect='differs from E-001 (Seward addresses a crowd at the Wills house) and agrees with E-002 (house of Mr. Harper near the square); the first name of Mr. Harper is not printed',
         remains='the hour of the Seward speech is not printed in these passages; "Robert Goodloe Harper" (the row) is not named, only "Mr. Harper"',
         independence='one account, three printings'),

    # ------------------------------------------------------------------ E-002  serenades, Glee Club
    dict(ids=['E-002', 'R22.0002'], key='glee-club-harper',
         sub_claim=('The Daily National Republican (Washington, 20 Nov) prints: "President Lincoln was also serenaded by the Baltimore Glee Club whilst '
                    'making a social visit to Mr. Harper." (Seward\'s speech just before it was at Mr. Harper\'s house).'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=REP20, span=('President Lincoln was also serenaded', 'visit to Mr. Ilarper.'), img='rep20_harper',
                     reading='President Lincoln was also serenaded by the Baltimore Glee Club whilst making a social visit to Mr. Harper.',
                     corrections=[['Ilarper', 'Harper']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read'})],
         row_effect='agrees with the row (Lincoln goes to Seward at the Harper house, the Glee Club serenades); no hour printed; the "two Bigham brothers as guards" are not in the pages read',
         remains='no hour, no Bigham brothers; one paper (the Intelligencer and Star, which carry the neighbouring Seward text, do not carry this sentence in the pages read)'),

    dict(ids=['E-002', 'R22.0002', 'E-001', 'R22.0001'], key='serenade-late-hour',
         sub_claim=('The Nashville Daily Union (24 Nov), quoting "the reporter of the Cincinnati Gazette", prints: "Last evening, the 18th, at a late hour, '
                    'the President and others were serenaded; in response to which Mr. Lincoln excused himself, and speeches were made by Judge Shannon, of '
                    'Pittsburg, Mr. [McNeagh?] of Philadelphia, J. W. Forney, and Montgomery Blair." The New-York Tribune (20 Nov) prints that the train '
                    'carrying the Governors "was delayed by a slight accident until nearly midnight", and that the President, Secretary Seward and Col. '
                    'Forney "were serenaded, and each replied to the compliment".'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=NASH24, span=('Last evening, the ISth, at a late hour', 'excus cuied himself,'), img='nash24_gaz',
                     attribution='The reporter of the Cincinnati Gazette adds the fallowing:',
                     reading='Last evening, the 18th, at a late hour, the President and others were serenaded; in response to which Mr. Lincoln excused himself, and speeches were made by Judge Shannon, of Pittsburg, Mr. McNeagh [as printed] of Philadelphia, J. W. Forney',
                     corrections=[['ISth', '18th'], ['ia response', 'in response'], ['excus cuied', 'excused']],
                     reprint={'status': 'reprint', 'from': 'the reporter of the Cincinnati Gazette', 'basis': 'The reporter of the Cincinnati Gazette adds the fallowing:'}),
                dict(page=TRIB20, span=("The President's party arrived last evening", 'were serenaded, and cach replied to the compliment.'), img='trib20_serenade',
                     reading=("The President's party arrived last evening, but the train which conveyed the Governors was delayed by a slight accident until nearly "
                              "midnight, so that they were not able to participate in the proceedings of the night, which were of a marked character. The "
                              "President, Secretary Seward, and Col. Forney were serenaded, and each replied to the compliment."),
                     corrections=[['conveved', 'conveyed'], ['de layed', 'delayed'], ['cach', 'each']],
                     dateline='GersyeBURe, Thursday, Nov. 19, 1563.',
                     reprint={'status': 'unknown', 'from': None, 'basis': 'the dispatch of 19 Nov is unsigned on the page text read'})],
         row_effect='agrees with E-002 that there was a late serenade on the night of 18 Nov; "about 23:00" is not stated by either paper ("a late hour", "nearly midnight" is the Governors\' train)',
         remains='the exact hour of the Glee Club serenade; the order of the speakers; the Nashville text names a "Mr. McNeagh" (print) whose identity is not established here',
         independence='the Nashville passage is a reprint of a Cincinnati Gazette report; the Tribune passage is an unsigned dispatch'),

    # ------------------------------------------------------------------ E-004  procession
    dict(ids=['E-004', 'R22.0004'], key='procession-0900-1000-guns',
         sub_claim=('The National Intelligencer (21 Nov) prints: "At nine o’clock the military portion of the procession began to assemble on Carlisle '
                    'street, north of the public square, and the civic portion on York street", the national ensign was at half-mast "and soon the mournful '
                    'booming of minute guns smote upon the ear", and "At ten o’clock the procession commenced moving over the route designated toward '
                    'the Cemetery". The Tribune (20 Nov) agrees: "The line of march was taken up at 10 o\'clock".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('At nine o', 'published in the Intelligencer of Tuesday last.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; the Evening Star of 20 Nov prints the same passage'}),
                dict(page=TRIB20, span=('The line of march was taken up at 10', 'saluted the President,'), img='trib20_1115',
                     reading='The line of march was taken up at 10 o\'clock, and the procession marched through the principal streets to the Cemetery, where the military formed in line and saluted the President.',
                     corrections=[['prines. pal', 'principal'], ['w here', 'where']],
                     dateline='GersyeBURe, Thursday, Nov. 19, 1563.',
                     reprint={'status': 'unknown', 'from': None, 'basis': 'unsigned dispatch'})],
         row_effect=('differs from the row\'s start time conflict: the row gives 09:30 (one source) against "planned 10:00 and about an hour late, about 11:00" '
                     '(another); these papers print assembly from 9:00 and a start at 10:00 and say nothing of a late start. Minute guns are printed (the row\'s '
                     '"minute guns" is supported); "along the Emmitsburg Road" is not in the passage'),
         remains='whether the head of the column really moved at 10:00 (both papers report the hour; neither is a clock reading); the place of the minute guns (the row says along the Emmitsburg Road; the passage says only that they sounded)',
         independence='two different accounts (the Intelligencer\'s own; the Tribune\'s dispatch)'),

    dict(ids=['E-004', 'R22.0004', 'E-005', 'R22.0005'], key='programme-route-10am',
         sub_claim=('The order of procession published by the marshal (printed in the Tribune of 21 Nov) fixes the plan: "The head of the column will move at '
                    'precisely 10 o\'clock a. m. The route will be up Baltimore street to the Emmittsburg road; thence to the junction of the Taneytown road; '
                    'thence by the latter road, to the Cemetery, where the military will form in line, as the General in command may order, for the purpose of '
                    'saluting the President of the United States." This is a printed plan, not a report of what happened.'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=TRIB21, span=('he bosd of the column will move', 'of saluting the President of the United States.'), img='trib21_route',
                     reading=('The head of the column will move at precisely 10 o\'clock a. m. The route will be up Baltimore street to the Emmittsburg road; thence '
                              'to the junction of the Taneytown road; thence by the latter road, to the Cemetery, where the military will form in line, as the '
                              'General in command may order, for the purpose of saluting the President of the United States.'),
                     corrections=[['bosd', 'head'], ['st precisely', 'at precisely'], ['mn.', 'm.'], ['ba up', 'be up'], ['tha.', 'the'], ['Tansytowu rond', 'Taneytown road'], ['for the pu of', 'for the purpose of']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'reprint', 'from': 'the programme issued by Ward H. Lamon, Marshal in Chief (the order of procession), as the page prints it', 'basis': 'WARD H. LAMON, Marshal in Chief.'})],
         row_effect='agrees with the row\'s route (Baltimore Street, Emmitsburg Road, Taneytown Road to the cemetery) and with the planned 10:00 start; the salute of the President by the military at the cemetery is the plan\'s wording',
         remains='the plan, not the event; the Tribune prints it inside its correspondent\'s letter',
         independence='the programme is an official document printed by the paper'),

    dict(ids=['E-004', 'R22.0004'], key='order-president-mounted',
         sub_claim=('In the order of march "Next came the Marshal-in-Chief, Ward H. Lamon, Esq., and his numerous staff of Aides ... Next came the President of the '
                    'United States, and Secretaries Seward, Usher, and Blair, all finely mounted"; the Republican adds "The President wore a plain suit of black '
                    'and white kid gauntlets." (a 1863 printing of who rode with the President, against the row\'s 1907 recollection).'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('Next came the Marshal in-Chief', 'all finely mounted.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; the Republican and Star print the same order'}),
                dict(page=REP20, span=('Next came the President of the United States', 'kid gauntlets.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'})],
         row_effect='adds: the row says the riding order (Seward and Blair on Lincoln\'s right, Usher and Lamon on his left) rests on a 1907 recollection only; these 1863 papers name Seward, Usher and Blair riding with the President but give no right/left placing, and put Lamon ahead of him with his aides; the horse\'s colour is not printed',
         remains='left/right placing of the riders; the colour or breed of the President\'s horse (a chestnut bay in the row is not in these papers)',
         independence='one account, printed in the Intelligencer, the Republican and the Star'),

    # ------------------------------------------------------------------ E-005  arrival at the cemetery, salute
    dict(ids=['E-005', 'R22.0005'], key='cemetery-arrival-times',
         sub_claim=('The papers disagree on the hour the head of the procession reached the platform: the Chicago Tribune prints "just two minutes before eleven '
                    'o\'clock" and that "at half-past eleven the great assemblage was called to order"; the New-York Tribune prints "At a quarter past 11 the head '
                    'of the procession arrived at the main stand"; the Republican (and the Intelligencer, Star) print "a quarter before noon" and, in the Republican '
                    'and Star, that "it was not until after 12 o\'clock that the President and others, assigned to seats upon the platform, were all in their places".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=CHI21, span=('The procculoh arrived', 'iu Hie delivery.'), img='chi21_times',
                     reading=('The procession arrived on the ground just two minutes before eleven o\'clock, and at half-past eleven the great assemblage was called to order. '
                              'Mr. Everett, the orator, proceeded with a discourse occupying two hours and four minutes in the delivery. [the letter o of "four" is damaged in the print]'),
                     corrections=[['procculoh', 'procession'], ['two\'minutes', 'two minutes'], ['half-paat', 'half-past'], ['fiur', 'four (damaged letter)'], ['iu Hie', 'in the']],
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune (the print gives Harrisburg, Nov. 20, 1863)', 'basis': '[Special Dispatch to the Chicago Tribune.]'}),
                dict(page=TRIB20, span=('At a quarter past 11 the head of the procession', 'took positions on the stand.'), img='trib20_1115',
                     reading=('At a quarter past 11 the head of the procession arrived at the main stand. The President and members of the Cabinet together with the chief military and civic dignitaries, took positions on the stand.'),
                     corrections=[['ar- ived', 'arrived'], ['Phe President', 'The President'], ['eivie', 'civic']],
                     dateline='GersyeBURe, Thursday, Nov. 19, 1563.',
                     reprint={'status': 'unknown', 'from': None, 'basis': 'unsigned dispatch'}),
                dict(page=REP20, span=('The head of the procession reached the plat', 'were all In their places.'), img='rep20_noon',
                     reading=('The head of the procession reached the platform erected in the centre of the cemetery a quarter before noon; but some time was consumed in assigning the different bodies their position round the stand; and it was not until after 12 o\'clock that the President and others, assigned to seats upon the platform, were all in their places.'),
                     corrections=[['plat form creeled', 'platform erected'], ['consumrd', 'consumed'], ['U o\'clock', '12 o\'clock'], ['tbat', 'that']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; the Star of 20 Nov prints the same passage'})],
         row_effect='the row has the troops forming a line "about 11:00 to noon"; the three hours printed (10:58, 11:15, 11:45) all lie in that range and differ from one another by up to 47 minutes; carried as selectable values, no default',
         remains='which clock the writers used; whether "the head of the procession" and "the assemblage" are the same event',
         independence='three accounts; the Republican/Star passage is one text, the Chicago dispatch and the New-York dispatch are separate'),

    dict(ids=['E-005', 'R22.0005'], key='military-salute-line',
         sub_claim=('The New-York Tribune (20 Nov) prints that the procession "marched through the principal streets to the Cemetery, where the military formed in line '
                    'and saluted the President"; the Chicago Tribune (special dispatch) prints that during the exercises the Fifth New York Artillery Regiment, "richly dressed, stood in single rank, in a '
                    'segment of a circle, outside the crowd".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=TRIB20, span=('the procession marched through the', 'saluted the President,'), img='trib20_1115',
                     reading='and the procession marched through the principal streets to the Cemetery, where the military formed in line and saluted the President.',
                     corrections=[['prines. pal', 'principal'], ['w here', 'where']],
                     dateline='GersyeBURe, Thursday, Nov. 19, 1563.', reprint={'status': 'unknown', 'from': None, 'basis': 'unsigned dispatch'}),
                dict(page=CHI21, span=('Daring the exercises, the sth New York Artillery', 'outside the crowd.'), img='chi21_end',
                     reading='During the exercises, the 5th New York Artillery Regiment, richly dressed, stood in single rank, in a segment of a circle, outside the crowd.',
                     corrections=[['Daring', 'During'], ['sth', '5th'], ['dreseed', 'dressed']],
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'})],
         row_effect='agrees with the row ("Troops form a line to salute the President at the cemetery")',
         remains='the hour (see the arrival-time claim); the strength of the line'),

    # ------------------------------------------------------------------ E-006  opening music, start time
    dict(ids=['E-006', 'R22.0006'], key='birgfelds-band',
         sub_claim=('The New-York Tribune\'s special correspondent (21 Nov) prints, after the Everett party reached the platform: "after which Birgfeld\'s band struck up a '
                    'noble air. The Rev. Dr. Stockton ... then followed in a fervent prayer." The Chicago Tribune prints that the opening piece was played by a band "furnished '
                    'by Gov. Curtin", "performed with pre eminent skill".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=TRIB21, span=('On the arrival of the Hon. Ed ward Everett and party', 'followed in a fervent prayer'), img='trib21_birg',
                     reading='On the arrival of the Hon. Edward Everett and party, they were presented to the President, after which Birgfeld\'s band struck up a noble air. The Rev. Dr. Stockton, Chaplain of the United States Senate, then followed in a fervent prayer.',
                     corrections=[['Blrgfeid\'s', 'Birgfeld\'s'], ['& noble', 'a noble']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=CHI21, span=('After the performance of an original piece', 'eminent skill'), img='chi21_band',
                     reading='After the performance of an original piece by the band, furnished by Gov. Curtin, a piece eloquently suited to the occasion, which was performed with pre eminent skill, Rev. Mr. Stockton, the venerable Chaplain of',
                     corrections=[['famished', 'furnished'], ['w Hch wac', 'which was']],
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'})],
         row_effect='agrees with the row (Birgfeld\'s Band, opening music); the 1863 spelling is "Birgfeld\'s" in the Tribune print',
         remains='the band\'s home town and size; the piece played; the other papers call the opening piece a funeral dirge by "the band"'),

    dict(ids=['E-006', 'R22.0006', 'E-012', 'R22.0012'], key='opening-dirge',
         sub_claim=('The Republican and the Evening Star (20 Nov) print that "the solemn ceremonies were commenced by the performance of a funeral dirge by the band, '
                    'stationed in front of the platform" (signal given by B. B. French, one of the Chief Marshal\'s aides); the Intelligencer prints the same sentence.'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=REP20, span=('gave tho signal, and the sol emn ceremonies', 'front of the platform.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; the Star prints the same sentence'}),
                dict(page=STAR20, span=('the sol emn ceremonies were commenced', 'frout of tbe platform.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'})],
         row_effect='adds to E-006 (opening music: a funeral dirge by the band, not a named band) and to E-012 (a "dirge" is also printed at the opening, not only after Lincoln)',
         remains='the name of the band at this point; the title of the piece',
         independence='one account, two printings'),

    dict(ids=['E-006', 'R22.0006'], key='start-after-noon',
         sub_claim=('The Republican and the Evening Star (20 Nov) print that "it was not until after 12 o\'clock that the President and others, assigned to seats upon the '
                    'platform, were all in their places"; the Chicago Tribune prints that "at half-past eleven the great assemblage was called to order". So the exercises '
                    'began between 11:30 and shortly after 12:00 in the press, well before the row\'s "about 15:00".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=REP20, span=('it was not until after', 'were all In their places.'), img='rep20_noon',
                     reading='and it was not until after 12 o\'clock that the President and others, assigned to seats upon the platform, were all in their places.',
                     corrections=[['U o\'clock', '12 o\'clock'], ['tbat', 'that']], reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=CHI21, span=('and at half-paat eleven', 'called to order.'), img='chi21_times',
                     reading='and at half-past eleven the great assemblage was called to order.', corrections=[['half-paat', 'half-past']],
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'})],
         row_effect=('differs from the row: the row says the start time was not found and derives it backward from a 16:00 end ("the photo caption says about 15:00 for the '
                     'ceremony"); the press says the stand was filled and the exercises opened about 11:30-12:00 and ended about 14:00-14:30 (see the end-time claim)'),
         remains='what the 15:00 photograph caption refers to; the programme hour if the papers\' clocks differ',
         independence='two accounts'),

    # ------------------------------------------------------------------ E-007  prayer, weather
    dict(ids=['E-007', 'R22.0007'], key='prayer-stockton',
         sub_claim=('The prayer was offered by Rev. Thomas H. Stockton: the Intelligencer and the Republican print "Chaplain of the House (of Representatives)", the New-York '
                    'Tribune and the Chicago Tribune print "Chaplain of the United States Senate"; the Intelligencer adds "the most profound silence prevailed and very '
                    'many were affected to tears".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('A most impressive prayer was offered by', 'to tears.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; the Republican prints the same'}),
                dict(page=TRIB21, span=('The Rev. Dr. Stockton, Chaplain of the United States Senate', 'fervent prayer'), img='trib21_birg',
                     reading='The Rev. Dr. Stockton, Chaplain of the United States Senate, then followed in a fervent prayer.',
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'})],
         row_effect='agrees with the row (Rev. T. H. Stockton, prayer); the papers differ on his office (House or Senate chaplain)',
         remains='the length of the prayer'),

    dict(ids=['E-007', 'R22.0007', 'R15.0000'], key='weather-1119',
         sub_claim=('Weather on Thursday 19 November at Gettysburg as printed: the Evening Star (20 Nov) "Thursday morning opened bright and beautiful"; the Republican (20 Nov) '
                    '"the sun rose brightly, and after being temporarily obscured, smiled pleasantly throughout the day"; the Tribune\'s correspondent (21 Nov, dated Nov. 19) '
                    '"The sky is bright, and all nature has donned her best attire"; a dispatch of 19 Nov "The weather is fine to-day". None of these prints "cloudy".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=REP20, span=('On Thursday morning the sun roso brightly', 'smiled pleasantly throughout tho Jay,'), img='rep20_sun',
                     reading='On Thursday morning the sun rose brightly, and after being temporarily obscured, smiled pleasantly throughout the day, and the ceremonies proceeded',
                     corrections=[['roso', 'rose'], ['tho Jay', 'the day']], reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=STAR20, span=('I hursday morning opened bright', 'bean tiful,'), img='star20_morning',
                     reading='Thursday morning opened bright and beautiful, and at an early hour the streets of Gettysburg were thronged with the gathering thousands',
                     corrections=[['I hursday', 'Thursday'], ['bean tiful', 'beautiful']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read (heading THE CELEBRATION)'}),
                dict(page=TRIB21, span=('The eky is bright, and al nature has donned her best attire', 'at least 15,000'), img='trib21_15000',
                     reading='The eventful morning has at last dawned. The sky is bright, and all nature has donned her best attire. The streets are thronged; it is estimated that at least 15,000 persons are in town.',
                     corrections=[['eky', 'sky'], ['al nature', 'all nature'], ['sirects', 'streets']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=INT20, span=('The weather is fine to-day', 'successfully.'), reprint={'status': 'wire', 'from': None, 'basis': WIRE_NOTE})],
         row_effect=('the row carries a weather conflict (a New York paper: cloudy, turning sunny during the prayer; the other source: the morning "perfect"); none of these four '
                     'passages prints cloud except the Republican\'s "temporarily obscured"; the claim "turned sunny during the prayer" is not in them'),
         remains='the hour of any change; cloud amount; temperature; wind',
         independence='the Star, Republican and Tribune passages are three separate writers; the "fine to-day" dispatch is one text in several papers'),

    # ------------------------------------------------------------------ E-008  music
    dict(ids=['E-008', 'R22.0008'], key='marine-band-train',
         sub_claim=('The New York Herald (20 Nov) prints that "The Marine Band accompanied this train" (the President\'s train from Washington, with an escort from the First '
                    'regiment Invalid Corps) (read from the print); the Republican of 19 Nov, copying the Baltimore Sun, prints that "The Marine Band, from the Washington navy-yard, under the charge of Capt. '
                    'Ramsey and Lieut. Cochran, ... accompanied the party to Gettysburg". The Intelligencer prints that after the prayer "the band appropriately performed the grand old hymn of Luther, '
                    '\'Old Hundred\'" without naming the band.'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=HER20, span=('Tlie Marine Band a', 'tr tla,'), img='her20_marine',
                     reading='The Marine Band accompanied this train, and the President had also an escort from the First regiment Invalid corps, under command of Lieutenant Fred.',
                     corrections=[['Tlie', 'The'], ['a < mtipanied', 'accompanied'], ['Ibia tr tla', 'this train']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'heading and author of the account not read'}),
                dict(page=REP19, span=('Tbe Marine Band, from the Washington', 'party to Gettysburg.'), img='rep19_marine',
                     reading='The Marine Band, from the Washington navy-yard, under the charge of Capt. Ramsey and Lieut. Cochran, were also in attendance, and accompanied the party to Gettysburg.',
                     corrections=[['Tbe', 'The'], ['nnvyyard', 'navy-yard'], ['ofCapt. Ramsey snd Lieut. Cocbrsn', 'of Capt. Ramsey and Lieut. Cochran'], ['arrompanlml', 'accompanied']],
                     attribution='Bail. Sun.',
                     reprint={'status': 'reprint', 'from': 'the Baltimore Sun (the account ends "Balt. Sun.")', 'basis': 'Bail. Sun.'}),
                dict(page=INT21, span=('At the conclusion of the prayer the band', 'Old Hun dnd.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'})],
         row_effect='supports that the U.S. Marine Band (from the Washington navy-yard, under Capt. Ramsey and Lieut. Cochran) travelled to Gettysburg with the President (the row: "U.S. Marine Band, music" at the platform); that the Marine Band played at the stand is NOT printed in the passages read; the Intelligencer\'s "the band" after the prayer is unnamed',
         remains='the band that played at the platform; the programme position "Music" after the prayer is carried by the order of exercises (see the programme claim)'),

    # ------------------------------------------------------------------ E-009  Everett
    dict(ids=['E-009', 'R22.0009'], key='everett-introduced-two-hours',
         sub_claim=('Everett was introduced, as the papers first printed it, by B. B. French (Intelligencer 21 Nov: "Hon B. B. French now introduced the Hon. Edward Everett, who advanced to the '
                    'front of the platform and pronounced the eloquent oration"; Republican 20 Nov the same); the Chicago Tribune (special dispatch, 21 Nov) prints that he "proceeded with a '
                    'discourse occupying two hours and four minutes in the delivery" (the letter o of "four" is damaged in the print). B. B. French himself corrected the first point (see the '
                    'correction claim).'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('Hon B. B. French now introduced', 'pronounced the eloquent oration'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=REP20, span=('now introduced too lion. Edward Ererelt', 'pronounced TUK ORATION.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=CHI21, span=('Mr. Everett, tbe orator, proceeded', 'iu Hie delivery.'), img='chi21_times',
                     reading='Mr. Everett, the orator, proceeded with a discourse occupying two hours and four minutes in the delivery. [damaged letter in "four"]',
                     corrections=[['tbe', 'the'], ['fiur', 'four (damaged letter)'], ['iu Hie', 'in the']],
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'})],
         row_effect='agrees with the row on the length ("about two hours": the Chicago dispatch prints two hours and four minutes); on who introduced him the first printings say B. B. French and the row says Lamon (one source, GC-COMP): French\'s own letter of 21 Nov settles it for Lamon (next claim)',
         remains='the 13,607-word count of the row is not in these papers; the clock times of the oration are not printed beyond "half-past eleven" (assembly called to order)'),

    dict(ids=['E-009', 'R22.0009', 'E-006', 'R22.0006', 'E-011', 'R22.0011'], key='french-correction-lamon',
         sub_claim=('B. B. French, the marshal\'s aide, wrote to the National Intelligencer on 21 Nov (printed 23 Nov): "I perceive, in your account ... I am mentioned as having introduced Mr. Everett '
                    'to the audience, and it is also said that I announced the receipt of General Scott\'s letter. That is an error. Marshal Lamon made all the introductions and announcements from the '
                    'stand, with the single exception of calling upon the band to play the opening music, which I did in consequence of the temporary absence of the Marshal-in-Chief." The editor '
                    'adds that the omission was "made by the papers from which we copied our account of the Gettysburg ceremonies".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT23, span=('That is an error. Marshal Lamon made all', 'Marshal-in Chief.'), img='int23_french',
                     reading=('That is an error. Marshal Lamon made all the introductions and announcements from the stand, with the single exception of calling upon the band to play the opening music, '
                              'which I did in consequence of the temporary absence of the Marshal-in-Chief. It is due to Marshal Lamon that I should say this'),
                     corrections=[['announce ments', 'announcements'], ['Marshal-in Chief', 'Marshal-in-Chief']],
                     attribution='B. B. FRENCH.', dateline='Washington, NOVEMBER 21, 1863.',
                     reprint={'status': 'original', 'from': 'a signed letter of B. B. French to the editors, dated Washington, Nov. 21, 1863', 'basis': 'B. B. FRENCH.'}),
                dict(page=INT23, span=('[We are glad that our friend', 'Nat. fat.]'), img='int23_note',
                     reading=('[We are glad that our friend, Major French, has taken the trouble to do justice to our energetic and efficient Marshal Lamon by supplying an omission made by the papers from '
                              'which we copied our account of the Gettysburg ceremonies.\u2014Nat. Int.]'),
                     corrections=[['Gettys burg', 'Gettysburg'], ['Nat. fat.]', 'Nat. Int.]']],
                     reprint={'status': 'original', 'from': 'editorial note of the National Intelligencer', 'basis': 'Nat. Int.'})],
         row_effect=('agrees with the row\'s E-009 note (Lamon introduces; role from GC-COMP only): a signed first-hand statement of 21 Nov, printed 23 Nov, supports it, and says the opening music was '
                     'called for by French because Lamon was briefly away (adds to E-006); it also corrects the Intelligencer\'s, Republican\'s and Star\'s printed account (French introduced Everett)'),
         remains='when in the programme Lamon was absent; whether French\'s correction reached the other papers',
         independence='one signed letter; it is evidence about the first printings, which share one text'),

    dict(ids=['E-009', 'R22.0009', 'E-011', 'R22.0011'], key='marshal-introduces-lincoln',
         sub_claim=('The Marshal introduced the President: Republican "Marshal Lamon introduced to the assemblage the President of the United States, who delivered the following '
                    'dedicatory remarks"; Intelligencer "The President then appeared at the foot of the platform, and, upon being introduced by the Marshal, was vociferously cheered '
                    'by the vast audience"; Chicago Tribune "The Marshal then introduced President Lincoln".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=REP20, span=('after which, Marshal Lamon Introduced', 'dedicatory remarks'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=INT21, span=('The President then appeared at the foot of the plat', 'He spoke as follows'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=CHI21, span=('The Marshal then introduced President Lincoln', 'epske as follows'),
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'})],
         row_effect='adds to E-009: "Lamon introduces" is printed for the introduction of Lincoln, not of Everett; E-011: Lincoln was introduced by the Marshal and cheered',
         remains='whether the Marshal in each paper is Lamon (only the Republican names him)'),

    # ------------------------------------------------------------------ E-010  hymn
    dict(ids=['E-010', 'R22.0010'], key='ode-after-everett',
         sub_claim=('After Everett and before Lincoln the hymn (ode) written by B. B. French was sung: Intelligencer "When Mr. Everett had concluded the following Hymn, composed by Hon. '
                    'B. B. French, was sung with excellent effect by the Baltimore Glee Club" (text of the hymn printed); Republican the same; the Tribune\'s correspondent "At the close '
                    'of Mr. Everett\'s oration, the Baltimore Glee Club sung the following Ode written for the occasion by B. B. French"; the Chicago Tribune "a choir from the Musical '
                    'Association, of Baltimore, treated the people to the following beautiful Dirge" (same text); the Evening Star prints "the Union Glee Club" (read from the print).'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('When Mr. Everett had concluded the following Hymn', 'Baltimore Glee Club:'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=REP20, span=('W ben Mr. Everett hud concluded', 'Baltimore uieo Club'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=TRIB21, span=('At the close of Mr. Everett\'s oration, the Laltmore Glea Club', 'French esq. of Washiagten.'),
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=CHI21, span=('At the conclusion of the oration, a choir from the Murical', 'Dirge.'),
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'}),
                dict(page=STAR20, span=('by the *Jnion Glee Clnb', 'Glee Clnb'), img='star20_glee',
                     reading='... a [hymn] sung by the Union Glee Club. President Lincoln then ap[peared]',
                     corrections=[['*Jnion Glee Clnb', 'Union Glee Club']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'})],
         row_effect=('agrees with the row\'s two readings: the hymn follows Everett (printed order) and "one account has the Baltimore Glee Club sing French\'s ode after Everett and '
                     'before Lincoln": four papers say so; the Star prints "Union Glee Club"; no paper prints the hymn after Lincoln'),
         remains='the title of the hymn (the Tribune and Chicago call it an Ode or a Dirge, the Intelligencer a Hymn); the size of the choir',
         independence='Intelligencer and Republican share a text; the Tribune and Chicago dispatches are separate accounts that agree'),

    # ------------------------------------------------------------------ E-011  the address and who was present
    dict(ids=['E-011', 'R22.0011'], key='address-printings-east',
         sub_claim=('Lincoln\'s dedicatory remarks as printed on 20-21 Nov in the New-York Tribune, the Republican, the Intelligencer and the Star begin "Four score and seven years ago '
                    'our fathers brought forth upon [on, in the Intelligencer] this continent a new nation, conceived in liberty and dedicated to the proposition that all men are '
                    'created equal" with "[Applause]" after "created equal", and end "... shall not perish from the earth. [Long-continued applause.]" with "under God" in the '
                    'sentence on "a new birth of freedom" (printed readings differ in small words between the papers).'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=REP20, span=('Four score and seven years ago our fathers brought forth upon', 'created equal. Ap plause.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'}),
                dict(page=TRIB20, span=('that we here highly resolve', 'shall not perish from'),
                     dateline='GersyeBURe, Thursday, Nov. 19, 1563.',
                     reprint={'status': 'unknown', 'from': None, 'basis': 'unsigned dispatch'}),
                dict(page=INT21, span=('are engaged in a great equal. [Applause ]', 'Now we'),
                     note='in the Intelligencer\'s text the lines of two neighbouring columns are interleaved by the OCR layout, so the sentence is broken in the saved text',
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'})],
         row_effect='adds to E-011 ("a few minutes at most"): the text printed on 20 Nov (the day after) as Lincoln\'s remarks; the printed readings vary and none is the later Bliss copy; applause marks are printed (applause after "created equal", after "detract", after "did here", after "nobly carried on", after "in vain", and "Long-continued applause" at the end)',
         remains='the wording is a transcription by reporters; the differences between printings are listed in address_printings.json when it exists; which wording the film speaks is an owner decision (the row carries it as a scenario)',
         independence='the four printings are not independent copies of a manuscript; their common source is the reporters\' transcription'),

    dict(ids=['E-011', 'R22.0011'], key='address-printings-western',
         sub_claim=('A second, different text of the remarks was telegraphed west and printed by the Chicago Tribune (21 Nov, special dispatch) and the Nashville Daily Union (24 Nov): '
                    '"Four score and seven years ago, our fathers established upon this continent a Government subscribed in liberty and dedicated to the fundamental principle that all '
                    'mankind are created equal by a good God, and [applause] now we are engaged in a great contest" (Chicago, read from the print); it is a corrupt or paraphrased '
                    'report of the speech, not the text of the eastern papers.'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=CHI21, span=('Four score and seven years ago, oar', 'created equal by a good God'),
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'}),
                dict(page=NASH24, span=('ago our fathers established upon this continent', 'by a good God'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'the heading and source of this passage were not read'})],
         row_effect='adds a printed variant to E-011 (selectable scenario of the wording as reported in 1863); not a reading to be used as Lincoln\'s text',
         remains='who produced the variant; whether other Western papers print it',
         independence='the Chicago and Nashville passages are the same text'),

    dict(ids=['E-011', 'R22.0011'], key='platform-governors',
         sub_claim=('Who stood on the platform as printed: the New-York Tribune\'s correspondent lists "Governor Curtin of Pennsylvania, Governor Seymour of New-York, Ex-Governor Tod of Ohio, '
                    'Governor Brough of Ohio, Governor Coburn of Maine, Governor Morton of Indiana, Ex-Governor Wright of Indiana, Governor Bradford of Maryland, Ex-Governor Pierpont of West '
                    'Virginia ... Gov. Parker of New-Jersey, Ex-Gov. Dennison of Ohio"; the Chicago Tribune: "Gov. Tod, Hon. John Brough, Governor elect of Ohio, Gov. Seymour, Gov. Curtin '
                    'and others" behind the President. The six governors of the row (Curtin, Bradford, Morton, Seymour, Parker, Tod) are all named in the Tribune list, with Tod called '
                    '"Ex-Governor" and Brough "Governor".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=TRIB21, span=('we noticed Governor Curtin of Pennsylvania', 'Gov, Parker of New-Jersey,'), img='trib21_govs',
                     reading=('In addition to the Presidential party we noticed Governor Curtin of Pennsylvania, Governor Seymour of New-York, Ex-Governor Tod of Ohio, Governor Brough of Ohio, '
                              'Governor Coburn of Maine, Governor Morton of Indiana, Ex-Governor Wright of Indiana, Governor Bradford of Maryland, Ex-Governor Pierpont of West Virginia, '
                              'Mrs. Commander Henry A. Wise, daughter of the Hon. Edward Everett, Gen. A. L. Russell, Adjutant-General of Pennsylvania, the Hon. J. W. Forney, Gov. Parker of New-Jersey, '
                              'Ex-Gov. Dennison of Ohio, the Hon. S. Cameron, Major Gens. Schenck, Stahel, Doubleday, Stoneman, Couch, Brig. Gen. Gibbon, and Provost-Marshal General Fry.'),
                     corrections=[['Beymour', 'Seymour'], ['Obie [iavernor Erough of Oldo', 'Ohio, Governor Brough of Ohio'], ['Pirrpons', 'Pierpont'], ['Olio', 'Ohio']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=CHI21, span=('behind the President su Gov. Tod', 'Gov. Curtin and others.'),
                     attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'})],
         row_effect='agrees with the row\'s six governors being present and adds: Coburn (Maine), Brough (Ohio governor-elect), Wright, Pierpont and Dennison (ex-governors) are also named; titles of Tod and Brough are printed inconsistently (Tod was in office in 1863; the Tribune calls him ex-governor)',
         remains='where each stood; the Intelligencer\'s separate list of those who came by the President\'s train (Curtin, Morton, Tod, Brough, Seymour and others)'),

    # ------------------------------------------------------------------ E-012 / E-013  close
    dict(ids=['E-012', 'R22.0012', 'E-013', 'R22.0013'], key='close-dirge-benediction',
         sub_claim=('After the address: the New-York Tribune (20 Nov) "After the delivery of this address the dirge and the benediction closed the exercises, and the immense assemblage '
                    'separated at about 2 o\'clock"; the Nashville Daily Union (24 Nov) "The Baltimore band thereupon, assisted by a troupe of ladies of Gettysburg, performed an '
                    'appropriate piece, after which the Rev. Mr. Bonher [as printed] pronounced a benediction, and the ceremonies closed"; the New-York Tribune\'s correspondent "The '
                    'exercises were closed by a song from the choir present."'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=TRIB20, span=('After the delivery of this address the dirge and the benediction', 'separated at about 2 o'), img='trib20_2oclock',
                     reading='After the delivery of this address the dirge and the benediction closed the exercises, and the immense assemblage separated at about 2 o\'clock.',
                     corrections=[['lnmncise', 'immense']],
                     dateline='GersyeBURe, Thursday, Nov. 19, 1563.', reprint={'status': 'unknown', 'from': None, 'basis': 'unsigned dispatch; the Portland Daily Press and the Indianapolis Daily State Sentinel print the same sentence'}),
                dict(page=NASH24, span=('The Baltimore band thereupon', 'the cereaiomes closed.'), img='nash24_ben',
                     reading='The Baltimore band thereupon, assisted by a troupe of ladies of Gettysburg, performed an appropriate piece, after which the Rev. Mr. Bonher pronounced a benediction, and the ceremonies closed.',
                     corrections=[['asiis ted', 'assisted'], ['Etv. Mr.Bjnher', 'Rev. Mr. Bonher (name as printed)'], ['cereaiomes', 'ceremonies']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'heading and source not read'}),
                dict(page=TRIB21, span=('The cxercises wers closed Ly a soi from the ehalr resent.', 'resent.'), img='trib21_close',
                     reading='The exercises were closed by a song from the choir present. The procession then returned to the town.',
                     corrections=[['cxercises wers', 'exercises were'], ['Ly a soi', 'by a song'], ['ehalr resent', 'choir present']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'})],
         row_effect=('agrees with the row\'s order (a dirge or piece after Lincoln, then the benediction) and adds that the piece after the address was played by the Baltimore band "assisted by a '
                     'troupe of ladies of Gettysburg" (Nashville) or sung by "the choir present" (Tribune correspondent); the benediction giver is printed "Rev. Mr. Bonher" (Nashville), so the row\'s '
                     '"Rev. H. L. Baugher" is matched to the print only by inference (a damaged or garbled name); the hour printed is about 2 o\'clock, against the row\'s "about 16:00"'),
         remains='the name Baugher is not printed in the pages read; the hour of the end (see the end-time claim)',
         independence='three separate accounts'),

    dict(ids=['E-013', 'R22.0013', 'E-006', 'R22.0006'], key='end-time-1400-1430',
         sub_claim=('End of the exercises as printed: the New-York Tribune (20 Nov) and, in the same words, the Portland Daily Press and the Indianapolis Daily State Sentinel: the assemblage '
                    '"separated at about 2 o\'clock"; the Chicago Tribune (special dispatch): "The ceremonies at the stand were concluded at 2½ o\'clock" (read from the print), and '
                    '"As soon as the benediction was pronounced, Gen. Couch called for cheers for Gov. Curtin and Gen. Schenck."'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=CHI21, span=('The ceremonies at the stand Were conclu', 'ded at SX o\'clock.'), img='chi21_end',
                     reading='The ceremonies at the stand were concluded at 2½ o\'clock.',
                     corrections=[['conclu ded at SX', 'concluded at 2½']],
                     dateline='HAUBzestißO, Nov. 20,1803.', attribution='[Special Dispatch to the Chicago Tribune.]',
                     reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune (dated Harrisburg, Nov. 20, 1863 in the print)', 'basis': '[Special Dispatch to the Chicago Tribune.]'}),
                dict(page=TRIB20, span=('the lnmncise assemblage separated at about 2 o', 'clock.'), img='trib20_2oclock',
                     reading='and the immense assemblage separated at about 2 o\'clock.', corrections=[['lnmncise', 'immense']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'unsigned dispatch'}),
                dict(page='sn82015683/1863-11-24/ed-1/seq-2', span=('the immense assemblage separated at about', 'o\'clock'),
                     reprint={'status': 'reprint', 'from': 'same sentence as the New-York Tribune of 20 Nov (source not named on the page text read)', 'basis': 'identical wording'})],
         row_effect=('differs from the row: the row says the program ended about 16:00 and derives the start backwards from it; the press prints an end at about 14:00 to 14:30. Opening at about 11:30 '
                     '(Chicago) plus a two-hour-four-minute oration leaves little room for the prayer, the music and Lincoln before 14:30, so the printed hours are carried beside the row\'s 16:00 as '
                     'selectable values, no default'),
         conflict='end of the exercises: about 14:00 / 14:30 (press) against about 16:00 (row; photograph caption "about 15:00")',
         remains='which of the printed hours is right; the clock used by each writer'),

    dict(ids=['E-013', 'R22.0013'], key='salute-fired',
         sub_claim=('The Intelligencer (21 Nov) and the Republican (20 Nov) print: "After the ceremonies were concluded, a salute was fired by the artillery, and the military portion of the '
                    'procession re-formed and escorted the President to his lodgings".'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('After the ceremonies were concluded, a salute', 'escorted the President to his lodgings'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; the Republican prints the same'}),
                dict(page=REP20, span=('salute w as fired by tho artillery', 'escorted me rresuient to tils lodgings'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named'})],
         row_effect='adds a second source for the salute (the row: "an eight-shot salute by a 5th New York battery; one source only"); the papers print "a salute" by "the artillery" without a number of shots or the unit',
         remains='the number of rounds; the battery',
         independence='one account, two printings'),

    # ------------------------------------------------------------------ E-014  church, Burns, train
    dict(ids=['E-014', 'R22.0014'], key='church-burns-train',
         sub_claim=('The New-York Tribune\'s special correspondent (21 Nov) prints that on the Thursday "In the afternoon, President Lincoln attended the Presbyterian Church, where Mr. Anderson, '
                    'the Lieutenant-Governor elect of Ohio, eloquently addressed the Ohio and other delegations"; that "The President walked to the Church arm and arm with John Burns, the '
                    'heroic Gettysburger, who fought voluntarily in the ranks of the army during the great battles of the 1st, 2d, and 3d of July"; that he "was escorted by Marshal Lamon, and '
                    'about 100 of his special aids"; and that "The President\'s train leaves at 8 to-night". The Nashville Daily Union (24 Nov): "At night Lieutenant-Governor Anderson, of Ohio, '
                    'delivered an oration in the Presbyterian Church."'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=TRIB21, span=('In the afternoon, President Lincoln attended the Presby', 'the Lien'), img='trib21_church',
                     reading='In the afternoon, President Lincoln attended the Presbyterian Church, where Mr. Anderson, the Lieutenant-Governor elect of Ohio, eloquently addressed the Ohio and other delegations.',
                     corrections=[['Presby (cian', 'Presbyterian'], ['the Lien', 'the Lieutenant-Governor elect of Ohio, eloquently addressed the Ohio and other delegations (the OCR layer of the next lines is scrambled with the neighbouring column)']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=TRIB21, span=('The Pres\'doat walked to the Church arm and arm with John Paros', 'tock part inthe three dase git.'), img='trib21_church',
                     reading='The President walked to the Church arm and arm with John Burns, the heroic Gettysburger, who fought voluntarily in the ranks of the army during the great battles of the 1st, 2d, and 3d of July, and the only man from the place who took part in the three days\' fight.',
                     corrections=[['Pres\'doat', 'President'], ['John Paros', 'John Burns'], ['herolo Gettysburger', 'heroic Gettysburger'], ['hatties of the Int, 24, and 34', 'battles of the 1st, 2d, and 3d'], ['tock part inthe three dase git', 'took part in the three days\' fight']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=TRIB21, span=('The FPresidert was es orted by Marshal Lamon', 'pass to Baltimore thereon.'), img='trib21_church',
                     reading='The President was escorted by Marshal Lamon, and about 100 of his special aids, together with the Commissioners representing the several States. The President\'s train leaves at 8 to-night, and through the kindness of Provost-Marshal-General Fry, I have received a pass to Baltimore thereon.',
                     corrections=[['FPresidert was es orted', 'President was escorted'], ['shout 100', 'about 100'], ['sey: eral', 'several'], ['straln leaves at # to; feht', 'train leaves at 8 to-night'], ['throngh the kinduess', 'through the kindness'], ['Frv, have', 'Fry, I have']],
                     attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=NASH24, span=('At night Lieutenant-Governor Ander', 'Presbyterian Church.'),
                     reprint={'status': 'unknown', 'from': None, 'basis': 'sits in an account whose first part has no named source (a later paragraph quotes the Cincinnati Gazette reporter)'})],
         row_effect='supports the row (Lincoln attends a church service with John L. Burns, the veteran); the hour is printed as "afternoon" (Tribune) and "At night" (Nashville, for Anderson\'s oration) against the row\'s "evening"; the train hour printed is 8 (Tribune)',
         remains='how much of the service he attended (the row\'s "most of a church service" is not printed); the other papers do not print the church visit in the pages read; the Tribune\'s OCR layer garbles the name and hour, which are read from the print',
         independence='the two papers are separate accounts'),

    dict(ids=['E-014', 'R22.0014'], key='train-seven',
         sub_claim=('The National Intelligencer (21 Nov) prints that after the ceremonies the President was escorted to his lodgings where "he was subsequently visited by a large number of citizens. '
                    'He returned to Washington in a special train, which left Gettysburg about seven o\'clock, and arrived here about one o\'clock on Friday morning."'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('He returned to Washington in a special train', 'on Friday morning.'), img='int21_seven',
                     reading='He returned to Washington in a special train, which left Gettysburg about seven o\'clock, and arrived here about one o\'clock on Friday morning.',
                     corrections=[['train. which', 'train, which'], ['o’clock. and', 'o\'clock, and']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named; the Republican prints the same account (its hour is not legible in the OCR layer)'})],
         row_effect='differs from the row\'s "leaves by train about 18:00" (printed: about seven o\'clock in the Intelligencer, 8 in the Tribune correspondent); the arrival at Washington about one o\'clock on Friday morning is printed',
         remains='the hour is printed twice with different values (7 and 8); the row\'s 18:00 is in neither'),

    dict(ids=['E-001', 'R22.0001'], key='announced-plan-wills',
         sub_claim=('Before the event the Washington papers of Wednesday 18 November announced the plan: the National Intelligencer "It is announced that the President will leave here at noon to-day for '
                    'Gettysburg, so as to enable him to be there early on Thursday morning. While there he will be the guest of D. Willis [sic], Esq. He will be accompanied by Mr. Nicolay, his private secretary"; '
                    'the Evening Star "President Lincoln will leave in a special train this afternoon, and while at Gettysburg will be the guest of David Wills, Esq., the Pennsylvania State agent. The procession is '
                    'to be formed in the town of Gettysburg, in the morning at nine o\'clock, and proceed to the cemetery grounds, where the exercises will take place."'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=STAR18, span=('President Lincoln will leave in a special train', 'where the exercises will take place.'), img='star18_plan',
                     reading=('President Lincoln will leave in a special train this afternoon, and while at Gettysburg will be the guest of David Wills, Esq., the Pennsylvania State agent. The procession is to be '
                              'formed in the town of Gettysburg, in the morning at nine o\'clock, and proceed to the cemetery grounds, where the exercises will take place.'),
                     corrections=[['Will be the guest of 1)avid j. ? Penns> Ivania State agent', 'will be the guest of David Wills, Esq., the Pennsylvania State agent'], ['nine o clock', 'nine o\'clock']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read'}),
                dict(page=INT18, span=('It is announced that the President will leave', 'private secretary.'), img='int18_guest',
                     reading=('It is announced that the President will leave here at noon to-day for Gettysburg, so as to enable him to be there early on Thursday morning. While there he will be the guest of D. Willis, Esq. '
                              'He will be accompanied by Mr. Nicolay, his private secretary.'),
                     corrections=[['nuol', 'noon'], ['guest 01 D. Willis, Esq II. ..', 'guest of D. Willis, Esq.']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'an editorial paragraph; no source named on the page text read'})],
         row_effect='agrees with the row (a lodging at David Wills\'s house was the plan on the day before; the Intelligencer prints the name as "D. Willis"); the Star\'s plan puts the formation of the procession at nine o\'clock, as the later reports say it happened',
         remains='plans, not events; "Willis" is the Intelligencer\'s spelling in print',
         independence='two separate announcements'),

    dict(ids=['E-001', 'R22.0001'], key='journey-washington-baltimore',
         sub_claim=('The journey to Gettysburg on Wednesday 18 November as printed: the Republican of 19 Nov, copying the Baltimore Sun, prints "At ten minutes past twelve o\'clock the train left the depot at Washington, and arrived at the '
                    'Camden street depot twenty minutes past one, having made the run in one hour and ten minutes", and that "They ... did not leave for Gettysburg until three o\'clock" (the city '
                    'officials\' train); the Evening Star of 19 Nov prints that the President and suite "passed through Baltimore at 2 o\'clock this afternoon in a special train of four elegant cars".'),
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=REP19, span=('At ten minutes past twelve', 'ten minute.'), img='rep19_left',
                     reading='At ten minutes past twelve o\'clock the train left the depot at Washington, and arrived at the Camden street depot twenty minutes past one, having made the run in one hour and ten minutes.',
                     corrections=[['ten minute.', 'ten minutes.']],
                     reprint={'status': 'reprint', 'from': 'the Baltimore Sun (the account ends "Balt. Sun.")', 'basis': 'Bail. Sun.'}),
                dict(page=STAR19P1, span=('Baltimore. Nov. I1-.?President Lincoln', 'tional Cemetery.'), img='star19_balt',
                     reading=('BALTIMORE, Nov. 18.\u2014President Lincoln and his suite, private secretary, and many other distinguished gentlemen from Washington, accompanied by a military guard and a band of music, '
                              'passed through Baltimore at 2 o\'clock this afternoon in a special train of four elegant cars, arranged by J. Prescott Smith, master of transportation, and furnished by the Baltimore and '
                              'Ohio Railroad Company. They proceeded to Gettysburg to attend the dedication of the National Cemetery.'),
                     corrections=[['I1-.?', '18.\u2014'], ['snite', 'suite'], ['ti ilitary', 'military'], ['pa>*ed', 'passed'], ['Hailroad', 'Railroad']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'a dispatch dated Baltimore, Nov. 18; no agency named on the page text read'})],
         row_effect='adds the journey to E-001: departure from Washington 12:10 pm, Baltimore 1:20 to about 2 pm, arrival at Gettysburg about 6:30 pm (other papers: about 5 pm and about sundown)',
         remains='the intermediate times (Hanover Junction, Hanover); the Intelligencer\'s noon announcement is a plan; the three-o\'clock train is the city officials\' train, not the President\'s'),

    # ------------------------------------------------------------------ crowd size (R22 top level)
    dict(ids=['R22.0000', 'E-009'], key='crowd-size',
         sub_claim=('Crowd estimates as printed: the New-York Tribune prints that the area at the stand was occupied "by civilians comprising about 15,000 people, and including men, women, and children" '
                    'and its correspondent "it is estimated that at least 15,000 persons are in town" (morning of 19 Nov); the Chicago Tribune prints the headline "50,000 PERSONS IN ATTENDANCE"; '
                    'the Nashville Daily Union prints "The number of persons in attendance is variously estimated—some placing it at 30,000; others as high as 50,000."'),
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=TRIB20, span=('civilians comprising about 15,000 people', 'children.'), img='trib20_15000',
                     reading='the area between the stand and military being occupied by civilians comprising about 15,000 people, and including men, women, and children.',
                     corrections=[['land including', 'and including']], dateline='GersyeBURe, Thursday, Nov. 19, 1563.', reprint={'status': 'unknown', 'from': None, 'basis': 'unsigned dispatch'}),
                dict(page=TRIB21, span=('it is estimated that at least', 'rsons are in town.'), img='trib21_15000',
                     reading='it is estimated that at least 15,000 persons are in town.', corrections=[['rsons', 'persons']], attribution='From Our Special Correspondent.',
                     reprint={'status': 'original', 'from': 'the Tribune\'s own correspondent', 'basis': 'From Our Special Correspondent.'}),
                dict(page=CHI21, span=('The Consecration of the Battle Cemetery, 50,000 PERSONS', 'ATTENDANCE.'), img='chi21_head',
                     reading='The Consecration of the Battle Cemetery, 50,000 PERSONS IN ATTENDANCE.', corrections=[['IST ATTENDANCE', 'IN ATTENDANCE']],
                     attribution='[Special Dispatch to the Chicago Tribune.]', reprint={'status': 'original', 'from': 'special dispatch to the Chicago Tribune (headline)', 'basis': '[Special Dispatch to the Chicago Tribune.]'}),
                dict(page=NASH24, span=('placing it at SO.COO; others aa high as MJ.OOO.', 'MJ.OOO.'), img='nash24_num',
                     reading='tendance is variously estimated—some placing it at 30,000; others as high as 50,000.', corrections=[['SO.COO', '30,000'], ['aa', 'as'], ['MJ.OOO', '50,000']],
                     reprint={'status': 'unknown', 'from': None, 'basis': 'heading and source not read'})],
         row_effect='adds: contemporaneous estimates of 15,000 (at the stand and in town), 30,000 and 50,000 (the row/NPS crowd conflict is carried as a range; no default)',
         remains='how any of the figures was obtained',
         independence='four separate writers'),
]
