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
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=STAR20, span=('I appear before yon, fellow-citizens', 'amid prolonged applause.'), reprint=NOSRC),
                dict(page=REP20, span=('I appear before on, fellow citizens', 'prolonged applause.'), reprint=NOSRC),
                dict(page=TRIB20, span=('After repeated calls, Mr, Lincoln', 'The President retired amid loud cheers.'), reprint=NOSRC),
                dict(page=RIC24, span=('Several column* of the MeraW', '[Laughter.]'),
                     reprint={'status': 'reprint', 'from': 'the New York Herald (the paragraph opens "Several columns of the Herald are occupied with a description")', 'basis': 'Several column* of the MeraW'})],
         row_effect='adds to E-001 and E-002: the President was serenaded on the evening of 18 Nov (the Star, Republican and Tribune print the same evening) and answered from the house with a short refusal to speak',
         remains='the hour; the exact words (the papers print three different wordings); where he stood',
         independence='the Star and the Republican print one text; the Tribune a different wording; the Richmond paper summarises another paper'),

    # ------------------------------------------------------------------ E-004 / E-005  the plan, published 17 Nov
    dict(ids=['E-004', 'R22.0004', 'E-005', 'R22.0005'], key='order-of-procession-published-1117',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT17, span=('CEMETERY AT GETTYSBURG. The opening of the National', 'Governors of the states and'), reprint=NOSRC),
                dict(page=INT17, span=('The procession is to be formed in the town of Gettys', 'return to the town.'), reprint=NOSRC)],
         row_effect='the plan of the procession as published on Tuesday 17 Nov, two days before; the 09:00 formation is the plan, not the event',
         remains='the plan, not the event',
         independence='one official order printed by one paper'),

    dict(ids=['E-004', 'R22.0004'], key='lamon-baltimore-press-place',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-17',
         cites=[dict(page=REP17, span=('MARSHAf, LAMON AND PARTY KN ROUTE', 'before three o\'clock,'),
                     reprint={'status': 'original', 'from': 'a special dispatch to the National Republican', 'basis': 'SpecWl Dlinatch to the National Republican'}),
                dict(page=REP17, span=('A mild astonishment ha been expressed', 'next U the two nouses of Congress.'),
                     reprint={'status': 'reprint', 'from': 'the Washington correspondent of the New York Times, quoted by the Republican', 'basis': 'Wi. t?ar. A\'. Y. Tunti'})],
         row_effect='adds to E-004: the Marshal-in-Chief and about twenty aides were at Baltimore on 17 Nov on the way to Gettysburg; the place of the Press in the order of procession was disputed in the Washington papers',
         remains='whether the order was changed; the final place of the Press'),

    dict(ids=['E-004', 'R22.0004', 'E-005', 'R22.0005'], key='herald-procession-formation',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=HER20, span=('Tbe military formed in (jcttvsbing', 'main prores?ion owed.'), reprint=NOSRC),
                dict(page=HER20, span=('The head of the co itiir. moved', 'rti;ht of the 1 land.'), reprint=NOSRC)],
         row_effect='gives the assembly places (Carlisle, York, Chambersburg streets), the hour of the start (ten o\'clock) and the route, with the military saluting the President at the cemetery: agrees with the Tribune and the Intelligencer and differs from the row\'s start-time conflict',
         remains='the printed hours are plan-and-report in one text; the OCR layer of the page is poor, the readings are from the print',
         independence='the Herald\'s own account'),

    # ------------------------------------------------------------------ E-011  the Governors' train
    dict(ids=['E-011', 'R22.0011', 'E-001', 'R22.0001'], key='governors-train-harrisburg-plan',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-18',
         cites=[dict(page=TRIB18, span=('Gov. Sevmour arvived here last evening', 'alternoon,'), dateline='PRILADI LITA, Tuesday, Nov. 17, 1863,',
                     reprint={'status': 'wire', 'from': None, 'basis': 'a dispatch dated Philadelphia, Tuesday, Nov. 17; no agency named on the page text read'}),
                dict(page=POR18, span=('Gov. Sprague arrived here last evening', 'half-past one to-morrow afternoon.'),
                     reprint={'status': 'wire', 'from': None, 'basis': 'a dispatch in the Portland paper\'s telegraph column of 18 Nov; no agency named on the page text read'})],
         row_effect='adds to E-011: the Governors were to leave Harrisburg by special train at about half past one on Wednesday 18 Nov (a plan); the Tribune of 20 Nov prints that their train was delayed until nearly midnight',
         remains='plans, not events'),

    # ------------------------------------------------------------------ E-006 / E-008  Bergfeld's band
    dict(ids=['E-006', 'R22.0006', 'E-008', 'R22.0008'], key='chicago-bergfeld-band',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=CHI21, span=('The band that filled the post of honor at the stand', 'the band played Old Hundred.'), reprint=CHI_DISP)],
         row_effect='adds to E-006 (the band at the stand was a Philadelphia band under Bergfeld) and E-008 (not the Marine Band); the Chicago text says the band played Old Hundred after the prayer',
         remains='the size of the band',
         independence='one dispatch'),

    # ------------------------------------------------------------------ E-009 / E-010  the Baltimore choir and the Marshal
    dict(ids=['E-009', 'R22.0009', 'E-010', 'R22.0010'], key='nashville-dirge-marshal',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=NASH24, span=('musical association from', 'rputwe as louown.'), reprint=NOSRC)],
         row_effect='adds to E-010 (a Baltimore choir sang a dirge written by B. B. French, after the oration) and E-009/E-011 (the Marshal of the day introduced the President)',
         remains='the heading and source of the account are not read; the OCR layer of this passage is poor'),

    # ------------------------------------------------------------------ E-009  French announced the General Scott letter
    dict(ids=['E-009', 'R22.0009'], key='french-announces-scott-letter',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=INT21, span=('It was announced by B B. French, Esq.', 'on the occasion.'), reprint={'status': 'reprint', 'from': 'other papers, not named', 'basis': 'the Intelligencer\'s note of 23 Nov: "the papers from which we copied our account of the Gettysburg ceremonies"'}),
                dict(page=REP20, span=('It was announced by B. B. French. Esq.', 'on me occasion.'), reprint=NOSRC)],
         row_effect='the first printings give French the announcement of General Scott\'s letter; French\'s own letter of 21 Nov (printed 23 Nov) says Lamon made all announcements',
         remains='who in fact announced it'),

    # ------------------------------------------------------------------ E-014  hands-shaking and the train
    dict(ids=['E-014', 'R22.0014'], key='republican-handshaking-train',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=REP20, span=('where ho was subsequently visited', 'ueuysourg anom o\'clock.'), reprint=NOSRC),
                dict(page=POR21, span=('The President returned from Gettysburg by special train', 'in the night.'),
                     reprint={'status': 'wire', 'from': 'the Post\'s special Washington dispatch of 20 Nov (the paragraph follows "The Post\'s special Washington dispatch")', 'basis': 'The Post\'s special Washington dispatch'})],
         row_effect='adds to E-014: after the exercises the President received visitors "for more than an hour" (a hand-shaking); the train hour is printed in the Republican (read from the print) and the arrival at Washington in the night is printed in a dispatch of 20 Nov',
         remains='the hour of the train (Intelligencer: seven; Tribune correspondent: eight)'),

    # ------------------------------------------------------------------ R22 / R14.S-081  reburials
    dict(ids=['R22.0000', 'R14.S-081'], key='reburial-counts-chicago',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-19',
         cites=[dict(page=CHI21, span=('The number of bodies exhumed and rein', 'some two thousand.'), reprint=CHI_DISP)],
         row_effect='a printed count of bodies reburied up to the date of the dispatch and of those still to be moved, beside the superintendent\'s list printed by the New-York Tribune (DD-F3-07)',
         remains='which list the figure is taken from; the date of the count',
         independence='one dispatch'),

    dict(ids=['E-001', 'R22.0001'], key='announced-plan-star-1117',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-11-17',
         cites=[dict(page=STAR17, span=('Pres ident will leave here at noon on Wednesday', 'J. G. Nicolay, E?q.'), reprint=NOSRC)],
         row_effect='the plan (leave at noon on Wednesday, the guest of D. Wills, Esq., Nicolay with him) was already printed on Tuesday 17 Nov',
         remains='a plan, not an event'),
]
