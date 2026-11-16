"""Epilogue claims, second set (requirement R22, 17 to 24 November 1863): what 1863 newspapers literally print.

Written on 2026-11-16 from the whole issues of the Library of Congress pages saved on that day (17-18 and 22-24 November, and the further titles of 19-24 November).
Same rules as claims_epi.py: every quote is cut by the builder out of the saved reading text; a quoted fragment of a sub_claim must stand in the reading
of the print (readings_overlay.json, made by looking at the image crops) of one of the citations; a paper named in a sub_claim must be cited.
Tier rule (DD-NEWS-01): the statement as printed is 'documented'; a step beyond the printed words is marked in row_effect.
"""

INT17 = 'sn83026172/1863-11-17/ed-1/seq-3'     # Daily National Intelligencer, Tue. 17 Nov 1863, image 3
STAR17 = 'sn83045462/1863-11-17/ed-1/seq-2'    # Evening Star, Tue. 17 Nov, image 2
REP17 = 'sn86053570/1863-11-17/ed-1/seq-2'     # Daily National Republican, Tue. 17 Nov, image 2
TRIB18 = 'sn83030213/1863-11-18/ed-1/seq-5'    # New-York Daily Tribune, Wed. 18 Nov, image 5
POR18 = 'sn83016025/1863-11-18/ed-1/seq-3'     # Portland Daily Press, Wed. 18 Nov, image 3
STAR20 = 'sn83045462/1863-11-20/ed-1/seq-2'    # Evening Star, Fri. 20 Nov, image 2
REP20 = 'sn86053570/1863-11-20/ed-1/seq-2'     # Daily National Republican, Fri. 20 Nov, image 2
TRIB20 = 'sn83030213/1863-11-20/ed-1/seq-1'    # New-York Daily Tribune, Fri. 20 Nov, image 1
HER20 = 'sn83030313/1863-11-20/ed-1/seq-4'     # New York Herald, Fri. 20 Nov, image 4
INT21 = 'sn83026172/1863-11-21/ed-1/seq-2'     # Daily National Intelligencer, Sat. 21 Nov, image 2
CHI21 = 'sn84031490/1863-11-21/ed-1/seq-1'     # Chicago Daily Tribune, Sat. 21 Nov, image 1
POR21 = 'sn83016025/1863-11-21/ed-1/seq-3'     # Portland Daily Press, Sat. 21 Nov, image 3
NASH24 = 'sn83025718/1863-11-24/ed-1/seq-4'    # Nashville Daily Union, Tue. 24 Nov, image 4
RIC24 = 'sn84024738/1863-11-24/ed-1/seq-1'     # Richmond Daily Dispatch, Tue. 24 Nov, image 1

NOSRC = {'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read'}
CHI_DISP = {'status': 'original', 'from': 'special dispatch to the Chicago Tribune', 'basis': '[Special Dispatch to the Chicago Tribune.]'}

CLAIMS = [
    # ------------------------------------------------------------------ E-001 / E-002  the President's words at the serenade, evening of 18 Nov
    dict(ids=['E-001', 'R22.0001', 'E-002', 'R22.0002'], key='lincoln-serenade-remarks',
         sub_claim='On the evening of Wednesday 18 November the President, serenaded at his lodging, answered the crowd with a short refusal to speak, which four papers print in three wordings. The Evening Star and the Daily National Republican (20 Nov) print "I appear before you, fellow-citizens, merely to thank you for this compliment", "The most substantial of these is that I have no speech to make [laughter.] It is somewhat important in my position that one should not say any foolish things if he can help it, and it very often happens that the only way to help it is to say nothing at all. [Renewed laughter.] Believing that that is my precise position this evening, I must beg of you to excuse me from saying \'one word.\'" and "The President was most enthusiastically greeted, and when he retired, he did so amid prolonged applause." The New-York Tribune (20 Nov) prints "After supper the President was serenaded by the excellent band of the 5th New-York Artillery" and, in a different wording, "In my position it is somewhat important that I should not say any foolish things. A VOICE—If you can help it. Mr. LINCOLN—It very often happens that the only way to help it is to say nothing at all. [Laughter.] Believing that is my present condition this evening, I must beg of you to excuse me from addressing you further. The President retired amid loud cheers." The Richmond Daily Dispatch (24 Nov), summarising a description printed by the New York Herald, prints "Lincoln was serenaded the night preceding the day on which the ceremony took place" and that he "declined to make a speech".',
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=STAR20, span=('I appear before yon, fellow-citizens', 'amid prolonged applause.'), reprint=NOSRC),
                dict(page=REP20, span=('I appear before on, fellow citizens', 'prolonged applause.'), reprint=NOSRC),
                dict(page=TRIB20, span=('After supper the President was serenaded', 'The President retired amid loud cheers.'), reprint=NOSRC),
                dict(page=HER20, span=('After re j ]n.ili', 'anudat loud clioer*.'), reprint=NOSRC),
                dict(page=RIC24, span=('Several column* of the MeraW', '[Laughter.]'),
                     reprint={'status': 'reprint', 'from': 'the New York Herald (the paragraph opens "Several columns of the Herald are occupied with a description")', 'basis': 'Several column* of the MeraW'})],
         row_effect='adds to E-001 and E-002: the President was serenaded on the evening of 18 Nov (the Star, Republican and Tribune print the same evening) and answered from the house with a short refusal to speak',
         remains='the hour; the exact words (the papers print three different wordings); where he stood',
         independence='the Star and the Republican print one text; the Tribune a different wording; the Richmond paper summarises another paper'),

    # ------------------------------------------------------------------ E-004 / E-005  the plan, published 17 Nov
    dict(ids=['E-004', 'R22.0004', 'E-005', 'R22.0005'], key='order-of-procession-published-1117',
         sub_claim='The National Intelligencer of Tuesday 17 November prints that "WARD H. LAMON, Esq., the United States Marshal of the District of Columbia, who has been appointed Marshal in Chief, has promulgated the following as the order of the procession: Military, under command of Major Gen. Couch. Major Gen. Meade and staff, and the officers and soldiers of the Army of the Potomac. Officers of the Navy and Marine Corps of the United States. Aids. Chief Marshal. Aids. PRESIDENT OF THE UNITED STATES. Members of the Cabinet" and later "Hon. Edward Everett, Orator of the day, and the Chaplain. Governors of the States and"; the same notice ends "The procession is to be formed in the town of Gettysburg on the morning of the 19th, at nine o\'clock, and proceed to the cemetery grounds, where the exercises will take place. The procession will then return to the town."',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT17, span=('CEMETERY AT GETTYSBURG. The opening of the National', 'Governors of the states and'), reprint=NOSRC),
                dict(page=INT17, span=('The procession is to be formed in the town of Gettys', 'return to the town.'), reprint=NOSRC)],
         row_effect='the plan of the procession as published on Tuesday 17 Nov, two days before; the 09:00 formation is the plan, not the event',
         remains='the plan, not the event',
         independence='one official order printed by one paper'),

    dict(ids=['E-004', 'R22.0004'], key='lamon-baltimore-press-place',
         sub_claim='The Daily National Republican of 17 November prints, in a special dispatch from Baltimore of that date, "Marshal Lamon and about twenty of his special aids arrived here at 1 o\'clock, en route to Gettysburg, and were handsomely entertained at dinner, at the Eutaw, as the guests of W. Prescott Smith, of the Baltimore and Ohio railroad. The Marshal and suite left this city for Gettysburg at ten minutes before three o\'clock"; the same page quotes the Washington correspondent of the New York Times: "A mild astonishment has been expressed in the newspaper offices here, and in Baltimore and Philadelphia, at Marshal Lamon\'s assignment of the Press to a place in the Gettysburg procession behind the Adams Express Company\'s wagons, instead of next to the two Houses of Congress."',
         tier='documented', state_date='1863-11-17',
         cites=[dict(page=REP17, span=('MARSHAf, LAMON AND PARTY KN ROUTE', 'before three o\'clock,'),
                     reprint={'status': 'original', 'from': 'a special dispatch to the National Republican', 'basis': 'SpecWl Dlinatch to the National Republican'}),
                dict(page=REP17, span=('A mild astonishment ha been expressed', 'next U the two nouses of Congress.'),
                     reprint={'status': 'reprint', 'from': 'the Washington correspondent of the New York Times, quoted by the Republican', 'basis': 'Wi. t?ar. A\'. Y. Tunti'})],
         row_effect='adds to E-004: the Marshal-in-Chief and about twenty aides were at Baltimore on 17 Nov on the way to Gettysburg; the place of the Press in the order of procession was disputed in the Washington papers',
         remains='whether the order was changed; the final place of the Press'),

    dict(ids=['E-004', 'R22.0004', 'E-005', 'R22.0005'], key='herald-procession-formation',
         sub_claim='The New York Herald of 20 November prints of the morning of Thursday 19 November: "The military formed in Gettysburg at nine o\'clock A. M., on Carlisle street, north of the square, its right resting on the square opposite McClellan\'s Hotel, under the direction of Major General Couch. The State marshals and chief marshal\'s aids assembled in the public square at the same hour. All civic bodies, except the citizens of States, assembled on York street at the same hour. The delegation of Pennsylvania citizens formed on Chambersburg street, its right resting on the square", and "The head of the column moved at precisely ten o\'clock. The route was up Baltimore street to the Emmettsburg road, thence to the junction of the Taneytown road, thence by the latter road to the cemetery, where the military formed in line, according to the order of the General in command, for the purpose of saluting the President of the United States. The military then closed up and occupied the space on the left of the stand. The civic procession advanced and occupied the area in front of the stand, the military leaving sufficient space between them and the line of graves for the civic procession to pass. The ladies occupied the right of the stand."',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=HER20, span=('Tbe military formed in (jcttvsbing', 'main prores?ion owed.'), reprint=NOSRC),
                dict(page=HER20, span=('The head of the co itiir. moved', 'rti;ht of the 1 land.'), reprint=NOSRC)],
         row_effect='gives the assembly places (Carlisle, York, Chambersburg streets), the hour of the start (ten o\'clock) and the route, with the military saluting the President at the cemetery: agrees with the Tribune and the Intelligencer and differs from the row\'s start-time conflict',
         remains='the printed hours are plan-and-report in one text; the OCR layer of the page is poor, the readings are from the print',
         independence='the Herald\'s own account'),

    dict(ids=['E-001', 'R22.0001'], key='herald-arrival-later-evening',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=HER20, span=('A review of the troopa In', 'and other notable* *'), reprint=NOSRC)],
         row_effect='the Herald prints a review of the troops at Gettysburg on the afternoon of 18 Nov and says the President\'s train arrived "later in the evening"; the same paper prints elsewhere that the party reached Gettysburg about sundown (see the arrival claim of the Herald): the two statements are carried as two values of the arrival hour, no default',
         remains='the hour of the arrival; which of the two statements of the same paper is the writer\'s own'),

    # ------------------------------------------------------------------ E-011  the Governors' train
    dict(ids=['E-011', 'R22.0011', 'E-001', 'R22.0001'], key='governors-train-harrisburg-plan',
         sub_claim='Two papers of Wednesday 18 November print dispatches of the 17th about the Governors\' special train: the New-York Tribune (dateline Philadelphia, Tuesday, Nov. 17, 1863) prints "Gov. Seymour arrived here last evening, en route to Gettysburg. A large crowd is congregating at Harrisburg to participate in the ceremonies of the dedication of the National Cemetery on Thursday. A special train, with the Governors and their suites, will leave for Harrisburg at about 1½ o\'clock to-morrow afternoon."; the Portland Daily Press prints "Gov. Sprague arrived here last evening, en route for Gettysburg. A large crowd is congregated at Harrisburg to participate in the ceremonies of the dedication of the National Cemetary on Thursday. A special train will leave Harrisburg at about half-past one to-morrow afternoon."',
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=TRIB18, span=('Gov. Sevmour arvived here last evening', 'alternoon,'), dateline='PRILADI LITA, Tuesday, Nov. 17, 1863,',
                     reprint={'status': 'wire', 'from': None, 'basis': 'a dispatch dated Philadelphia, Tuesday, Nov. 17; no agency named on the page text read'}),
                dict(page=POR18, span=('Gov. Sprague arrived here last evening', 'half-past one to-morrow afternoon.'),
                     reprint={'status': 'wire', 'from': None, 'basis': 'a dispatch in the Portland paper\'s telegraph column of 18 Nov; no agency named on the page text read'})],
         row_effect='adds to E-011: the Governors were to leave Harrisburg by special train at about half past one on Wednesday 18 Nov (a plan); the Tribune of 20 Nov prints that their train was delayed until nearly midnight',
         remains='plans, not events'),

    # ------------------------------------------------------------------ E-006 / E-008  Bergfeld's band
    dict(ids=['E-006', 'R22.0006', 'E-008', 'R22.0008'], key='chicago-bergfeld-band',
         sub_claim='The Chicago Tribune (21 Nov, special dispatch) prints "The band that filled the post of honor at the stand, was Bergfield\'s band of Philadelphia, and the magnificent dirge with which the ceremonies were commenced was the composition of Mr. Bergfield. It is a German band. After the prayer by Rev. Mr. Stockton, the band played Old Hundred."',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=CHI21, span=('The band that filled the post of honor at the stand', 'the band played Old Hundred.'), reprint=CHI_DISP)],
         row_effect='adds to E-006 (the band at the stand was a Philadelphia band under Bergfeld) and E-008 (not the Marine Band); the Chicago text says the band played Old Hundred after the prayer',
         remains='the size of the band',
         independence='one dispatch'),

    # ------------------------------------------------------------------ E-009 / E-010  the Baltimore choir and the Marshal
    dict(ids=['E-009', 'R22.0009', 'E-010', 'R22.0010'], key='nashville-dirge-marshal',
         sub_claim='The Nashville Daily Union (24 Nov) prints, after Mr. Everett\'s discourse, "musical association from Baltimore sang an impressive dirge written by B. B. French, Esq. The Marshal of the day then introduced President Lincoln, who spoke as follows." (the passage begins "When he concluded, a" in the print).',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=NASH24, span=('musical association from', 'rputwe as louown.'), reprint=NOSRC)],
         row_effect='adds to E-010 (a Baltimore choir sang a dirge written by B. B. French, after the oration) and E-009/E-011 (the Marshal of the day introduced the President)',
         remains='the heading and source of the account are not read; the OCR layer of this passage is poor'),

    # ------------------------------------------------------------------ E-009  French announced the General Scott letter
    dict(ids=['E-009', 'R22.0009'], key='french-announces-scott-letter',
         sub_claim='The National Intelligencer (21 Nov) prints "It was announced by B. B. French, Esq. that a letter had been received from Lieutenant General Scott regretting his inability to be present on the occasion" and the Daily National Republican (20 Nov) the same sentence ("Esq.,"); B. B. French\'s own letter of 21 Nov says Marshal Lamon made all announcements (see the correction claim).',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('It was announced by B B. French, Esq.', 'on the occasion.'), reprint={'status': 'reprint', 'from': 'other papers, not named', 'basis': 'the Intelligencer\'s note of 23 Nov: "the papers from which we copied our account of the Gettysburg ceremonies"'}),
                dict(page=REP20, span=('It was announced by B. B. French. Esq.', 'on me occasion.'), reprint=NOSRC)],
         row_effect='the first printings give French the announcement of General Scott\'s letter; French\'s own letter of 21 Nov (printed 23 Nov) says Lamon made all announcements',
         remains='who in fact announced it'),

    # ------------------------------------------------------------------ E-014  hands-shaking and the train
    dict(ids=['E-014', 'R22.0014'], key='republican-handshaking-train',
         sub_claim='The Daily National Republican (20 Nov) prints that after the ceremonies the President was escorted to his lodgings, "where he was subsequently visited by a large number of persons, and for more than an hour was the victim of a \'hands-shaking\' that must have tested his good nature to the utmost. The President returned to Washington in a special train, which left Gettysburg about 7 o\'clock."; the Portland Daily Press (21 Nov), in a dispatch of 20 Nov, prints "The President returned from Gettysburg by special train, arriving here in the night."',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=REP20, span=('where ho was subsequently visited', 'ueuysourg anom o\'clock.'), reprint=NOSRC),
                dict(page=POR21, span=('The President returned from Gettysburg by special train', 'in the night.'),
                     reprint={'status': 'wire', 'from': 'the Post\'s special Washington dispatch of 20 Nov (the paragraph follows "The Post\'s special Washington dispatch")', 'basis': 'The Post\'s special Washington dispatch'})],
         row_effect='adds to E-014: after the exercises the President received visitors "for more than an hour" (a hand-shaking); the train hour is printed in the Republican (read from the print) and the arrival at Washington in the night is printed in a dispatch of 20 Nov',
         remains='the hour of the train (Intelligencer: seven; Tribune correspondent: eight)'),

    # ------------------------------------------------------------------ R22 / R14.S-081  reburials
    dict(ids=['R22.0000', 'R14.S-081'], key='reburial-counts-chicago',
         sub_claim='The Chicago Tribune (21 Nov, special dispatch of 20 Nov) prints "The number of bodies exhumed and re-interred, up to the present date, is about fifteen hundred. The number still remaining where they were at first buried, is estimated at some two thousand."',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=CHI21, span=('The number of bodies exhumed and rein', 'some two thousand.'), reprint=CHI_DISP)],
         row_effect='a printed count of bodies reburied up to the date of the dispatch and of those still to be moved, beside the superintendent\'s list printed by the New-York Tribune (DD-F3-07)',
         remains='which list the figure is taken from; the date of the count',
         independence='one dispatch'),

    dict(ids=['E-001', 'R22.0001'], key='announced-plan-star-1117',
         sub_claim='The Evening Star of Tuesday 17 November prints, under the heading The Gettysburg Cemetery: "President will leave here at noon on Wednesday for Gettysburg, so as to enable him to be there on Thursday morning early, without fail. While there he will be the guest of D. Wills, Esq. He will be accompanied by his accomplished private secretary, J. G. Nicolay, Esq." (the word The of the run-in heading stands before President).',
         tier='documented', state_date='1863-11-17',
         cites=[dict(page=STAR17, span=('Pres ident will leave here at noon on Wednesday', 'J. G. Nicolay, E?q.'), reprint=NOSRC)],
         row_effect='the plan (leave at noon on Wednesday, the guest of D. Wills, Esq., Nicolay with him) was already printed on Tuesday 17 Nov',
         remains='a plan, not an event'),
]
