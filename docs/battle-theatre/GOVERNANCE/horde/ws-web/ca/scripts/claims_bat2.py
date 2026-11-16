"""Battle-day claims, second set (June 26 to July 12, 1863): what 1863 newspapers literally print.

Written on 2026-11-16 from the whole issues of the Library of Congress pages saved on that day (1 to 9 July: Herald, Tribune, Chicago Tribune, Evening Star,
National Intelligencer; 2 to 9 July: Republican, Worcester Spy, Portland Press, Wheeling Intelligencer; 26 to 30 June and 10 to 12 July: the five dailies).
Same rules as claims_epi.py and claims_bat.py: quotes are cut by the builder from the saved reading text; a quoted fragment of a sub_claim must stand in the
reading of the print (readings_overlay.json, made by looking at the image crops) of one of the citations; a paper named in a sub_claim must be cited.
Tier rule (DD-NEWS-01): the statement as printed is 'documented'; a step beyond the printed words is marked in row_effect.
Every passage and every heading or dateline relied on was read from an image crop (readings_overlay.json; heading= with heading_img=).
"""

INT6_2 = 'sn83026172/1863-07-06/ed-1/seq-2'      # Daily National Intelligencer, Mon. 6 July 1863, image 2
WHIG8 = 'sn84024669/1863-07-08/ed-1/seq-2'       # Richmond Whig, Wed. 8 July, image 2
STAR6_2 = 'sn83045462/1863-07-06/ed-1/seq-2'     # Evening Star, Mon. 6 July, image 2
INT7_3 = 'sn83026172/1863-07-07/ed-1/seq-3'      # Daily National Intelligencer, Tue. 7 July, image 3
TRIB7_1 = 'sn83030213/1863-07-07/ed-1/seq-1'     # New-York Daily Tribune, Tue. 7 July, image 1
HER7_10 = 'sn83030313/1863-07-07/ed-1/seq-10'    # New York Herald, Tue. 7 July, image 10
WOR7_1 = 'sn83021205/1863-07-07/ed-1/seq-1'      # Worcester Daily Spy, Tue. 7 July, image 1
TRIB6_12 = 'sn83030213/1863-07-06/ed-1/seq-12'   # New-York Daily Tribune, Mon. 6 July, image 12
STAR7_2 = 'sn83045462/1863-07-07/ed-1/seq-2'     # Evening Star, Tue. 7 July, image 2
INT8_3 = 'sn83026172/1863-07-08/ed-1/seq-3'      # Daily National Intelligencer, Wed. 8 July, image 3
WOR8_1 = 'sn83021205/1863-07-08/ed-1/seq-1'      # Worcester Daily Spy, Wed. 8 July, image 1

NOSRC = {'status': 'unknown', 'from': None, 'basis': 'no source named on the page text read'}
AP = {'status': 'wire', 'from': 'Associated Press (the Star prints "[Correspondence of the Associated Press.]")', 'basis': '[Correspondence of the Associated Press.]'}
AP_SAME = {'status': 'wire', 'from': 'the same dispatch that the Evening Star of 6 July prints under "[Correspondence of the Associated Press.]"; this page names no agency',
           'basis': 'the dispatch agrees with the Star\'s printing except for a few words'}
TIMES_OTHER = {'status': 'unknown', 'from': None,
               'basis': 'this page text names no source at this dispatch; the same sentences stand in the Evening Star of 7 July as a special dispatch of the New York Times'}
WHIG_NYT = {'status': 'reprint', 'from': 'the special correspondent of the New York Times, writing from the battle-field near Gettysburg, July 3 (the Whig\'s heading, read from the print)',
            'basis': 'The special correspondent of the New York Times, writing from the battle-field near Gettysburg, July 3'}

CLAIMS = [
    dict(ids=['T2-212', 'T2-225'], key='crounse-moonlight-0702',
         sub_claim=('Two papers print one letter on the battle of Thursday (2 July). The Daily National Intelligencer of 6 July prints it under "ANOTHER ACCOUNT. Mr. M. L. Crounse, another New York correspondent, '
                    'thus graphically describes the battle of Thursday:" with these lines: "The battle lasted till fully 8½ o\'clock, when the enemy fell back to his old position, and left our veterans '
                    'the ensanguined victors of that field. Our pickets were thrown out, and our lines covered most of the field, including a great many of the enemy\'s dead and wounded. I visited some '
                    'portions of the line by moonlight, and can bear personal witness to the terrible ferocity of the battle. In front of some of our brigades, who had good protection from stone walls or '
                    'fences, the rebel dead lay piled in lines like winrows of hay." The Richmond Whig of 8 July prints the same letter under "The special correspondent of the New York Times, writing from '
                    'the battle-field near Gettysburg, July 3, gives the following account of Thursday\'s battle:" with "fully half past 8 o\'clock", "the most of the field, including great numbers of the '
                    'enemy\'s dead and wounded" and "stonewalls or fences" where the Intelligencer has the words above.'),
         tier='documented', state_date='1863-07-02',
         cites=[dict(page=INT6_2, span=('The battle lasted till fully', 'winrows of hay.'),
                     attribution='Mr.M. L. CROUNSE, another New York correspondent, thus graphically describes the battle of Thursday:',
                     heading='ANOTHER ACCOUNT. Mr. M. L. Crounse, another New York correspondent, thus graphically describes the battle of Thursday:', heading_img='r4_83026172_0706_crhead',
                     reprint={'status': 'reprint', 'from': 'a New York paper (not named on the page text read): the heading calls Mr. M. L. Crounse "another New York correspondent"',
                              'basis': 'Mr.M. L. CROUNSE, another New York correspondent'}),
                dict(page=WHIG8, span=('The battle lasted till fully half past 8', 'winrows of hay.'),
                     heading='THE BATTLE OF THURSDAY. The special correspondent of the New York Times, writing from the battle-field near Gettysburg, July 3, gives the following account of Thursday\'s battle:',
                     heading_img='r4_84024669_0708_nythead',
                     reprint=WHIG_NYT)],
         row_effect=('adds to T2-212 a printed statement that a New York correspondent "visited some portions of the line by moonlight" after the battle of Thursday, which "lasted till fully 8½ o\'clock" '
                     '(the Whig: "half past 8"); that this was the night of 2 July follows from "the battle of Thursday" and the order of the sentences, a step beyond the printed words; '
                     'adds to T2-225 how the rebel dead lay "piled in lines like winrows of hay" in front of brigades with stone walls or fences (no place named); no lantern, no Plum Run valley, no wounded in the passage'),
         remains='the place of the line he visited; how bright the moon was (the word moonlight only); whether the visit was on the night of 2 July (inferred from the order of the sentences)',
         independence='one letter, printed twice; the Whig text is longer and its words differ in a few places; the two papers name the writer differently (Mr. M. L. Crounse; the special correspondent of the New York Times)'),

    dict(ids=['T2-173', 'R03.C-037'], key='whig-barksdale-found-0702',
         sub_claim=('The Richmond Whig of 8 July prints, in the account headed "The special correspondent of the New York Times, writing from the battle-field near Gettysburg, July 3, gives the following '
                    'account of Thursday\'s battle:", the sentences: "In front of General Webb\'s (the Philadelphia) brigade, they lay so thick as to literally cover the ground. Not far from here was found '
                    'the body of poor Barksdale, that once haughty and violent rebel, who craved, as a dying boon, a cup of water and a scretcher from an ambulance boy. He is literally cut to pieces with '
                    'wounds, and must die." (the print spells the word "scretcher").'),
         tier='documented', state_date='1863-07-02',
         cites=[dict(page=WHIG8, span=('In front of General Webb', 'must die.'),
                     heading='THE BATTLE OF THURSDAY. The special correspondent of the New York Times, writing from the battle-field near Gettysburg, July 3, gives the following account of Thursday\'s battle:',
                     heading_img='r4_84024669_0708_nythead',
                     reprint=WHIG_NYT)],
         row_effect=('adds to the Barksdale entries (T2-173, R03.C-037) a Richmond paper\'s printing of a Northern correspondent\'s lines: Barksdale\'s body "was found" "not far from" the ground in front of '
                     'Webb\'s (the Philadelphia) brigade, "cut to pieces with wounds", having craved "a cup of water and a scretcher from an ambulance boy", and "must die"; the heading puts the writing at 3 July '
                     'about Thursday\'s battle; the row\'s treatment at the Hummelbaugh farm and the death date are not in the passage'),
         remains='the hour; where the brigade stood (the passage does not say); whether Barksdale died on 2 or 3 July (the lines are written on 3 July and say "must die")',
         caution='the Intelligencer of 6 July prints the same letter without this paragraph (after "winrows of hay." it goes on with "A great and magnificent feature of this fight")',
         conflict=('where Barksdale was found: "not far from" the front of Webb\'s (the Philadelphia) brigade (this letter) against the Plum Run valley and the Hummelbaugh farm (the row\'s sources); '
                   'the row already carries his death on 2 July against 3 July; this letter, written 3 July, has him still living')),

    dict(ids=['T3-150'], key='ap-burying-dead-0705',
         sub_claim=('Four papers print one dispatch dated July 5. The Evening Star of 6 July prints, under "[Correspondence of the Associated Press.]": "NEAR GETTYSBURG, July 5.—The enemy have retreated towards '
                    'the Potomac. ... Our troops have been engaged all day in burying the dead, relieving the wounded, and collecting arms, many thousands of which belonged to the rebels." The National '
                    'Intelligencer of 7 July prints the same words under "MOVEMENTS TO INTERCEPT THE ENEMY." The New-York Daily Tribune of 7 July (under "Retreat of the Enemy—The Pontoon Bridges Destroyed.") '
                    'prints "The Rebels have retreated toward the Potomac" and "collecting small-arms, many thousands of which belonged to the Rebels"; the New York Herald of 7 July (under "THE RETREAT OF '
                    'THE REBELS.") prints "collecting small arms, many thousands of which belonged to the rebels"; both give the date line "NEAR GETTYSBURG, July 5, 1863."'),
         tier='documented', state_date='1863-07-05',
         cites=[dict(page=STAR6_2, span=('Near Gettysburg, July 5.', 'belonged to the rebels.'), attribution='[Correspondence of the Associated Press.]', reprint=AP),
                dict(page=INT7_3, span=('Near Gettysburg, July 5', 'belonged to the rebels.'),
                     heading='MOVEMENTS TO INTERCEPT THE ENEMY.', heading_img='r3_83026172_0707_467137', reprint=AP_SAME),
                dict(page=TRIB7_1, span=('Near Gerryssuna, July 5', 'belonged to the Rebels.'),
                     heading='Retreat of the Enemy—The Pontoon Bridges Destroyed.', heading_img='r3_83030213_0707_198fef', reprint=AP_SAME),
                dict(page=HER7_10, span=('Nbab GarTTHBraa,ialy 6,1803.', 'belonged to the rebels'),
                     heading='THE RETREAT OF THE REBELS.', heading_img='r3_83030313_0707_cf2ea2', reprint=AP_SAME)],
         row_effect=('adds to T3-150 a printed statement for Sunday 5 July (not the morning of 4 July): the army\'s troops "engaged all day in burying the dead, relieving the wounded" and collecting arms, '
                     '"many thousands" of them the rebels\'; the passage does not mention townspeople or farmers, the number of dead (the row\'s 8,900) or the burning of horses'),
         remains='how many were buried; where; by whom beyond "our troops"; the arms are not counted',
         independence='one dispatch, four printings; the Star credits the Associated Press, the other three name no agency; the wording differs in a few words (see the sub-claim)'),

    dict(ids=['T1-197'], key='cemetery-tombstones-0703',
         sub_claim=('The Worcester Daily Spy of 7 July prints, in an account of the Friday artillery fire: "Gen. Howard\'s headquarters were in the cemetery, and were raked in a fearful manner; men fell all '
                    'around him, but himself and staff escaped. The silent abode of the dead was made the theater of a deadly conflict. Tombstones and beautiful monuments were demolished; great holes were '
                    'torn in the earth by the explosion of shells". The New-York Daily Tribune of 6 July prints the same account with "Tombstones and beautiful monuments were demolished; great holes were '
                    'torn in the earth by the explosion of shells, and the surface checkered with furrows."'),
         tier='documented', state_date='1863-07-03',
         cites=[dict(page=WOR7_1, span=('Gen. Howard’s headquarters were in the cemetery', 'continued till four o’clock,'), reprint=NOSRC),
                dict(page=TRIB6_12, span=('Tombstones uno beautiful monuwets were demolished', 'checkered with fulowe.'), reprint=NOSRC)],
         row_effect=('supports T1-197 for the damage to the cemetery by artillery fire ("Tombstones and beautiful monuments were demolished"); the passage belongs to the account of the cannonade of Friday 3 July '
                     '(it follows the paragraph "At 2 o\'clock on Friday afternoon Lee opened a line of artillery fire" and ends "The artillery fire continued till four o\'clock"), not to the evening of 1 July, '
                     'so the row\'s split between 1 and 2 July is not touched; the passage says nothing of tombstones laid flat or of fences'),
         remains='which cemetery (the passage says "the cemetery" and puts Gen. Howard\'s headquarters in it); which monuments; fences are not mentioned',
         independence='one account, two printings; a few words differ (the Spy: "the theater of a deadly conflict", the Tribune: "the theater of deadly conflict")'),

    dict(ids=['T3-075', 'T3-094'], key='worcester-cannonade-times-0703',
         sub_claim=('The Worcester Daily Spy of 7 July prints: "At 2 o\'clock on Friday afternoon Lee opened a line of artillery fire from about one hundred guns, concentrated against Cemetery Hill and the '
                    'position along the cent[r]e held by the second and a part of the first corps. The firing was responded to by all the batteries on the hill, and then ensued three hours of cannonading '
                    'unsurpassed in incessant fierceness by any artillery battle on this continent." and, further on: "The artillery fire continued till four o\'clock, when the solid columns of rebel '
                    'infantry were again seen moving in the wood in front of the center, held by the 1st and 2d corps."'),
         tier='documented', state_date='1863-07-03',
         cites=[dict(page=WOR7_1, span=('At 2 o’clock on Friday afternoon Lee open', 'artillery battle on this continent.'), reprint=NOSRC),
                dict(page=WOR7_1, span=('The artillery fire continued till four', 'and 2d corps.'), reprint=NOSRC)],
         row_effect=('adds printed values for the cannonade of 3 July: it opens "At 2 o\'clock on Friday afternoon" from "about one hundred guns" and the artillery fire "continued till four o\'clock"; '
                     'the row\'s opening (about 13:00), end (14:00 to 15:00) and gun counts (115 to 179) rest on other sources; the newspaper\'s hours and number are carried as further selectable values, no default is picked'),
         remains='whose clock the hours are; what "three hours" counts; the sources of the account (no source named on the page text read)',
         conflict=('opening of the cannonade: about 13:00 (the row\'s sources) against 2 o\'clock in the afternoon (this newspaper); end: 14:00 to 15:00 against four o\'clock; guns: 115 to 179 against about one hundred; '
                   'the passage does not agree with itself: it opens the fire at 2 o\'clock, counts "three hours of cannonading" and ends the fire at four o\'clock')),

    dict(ids=['T3-148', 'R05.0000', 'R13.0000'], key='times-barn-hospital-0706',
         sub_claim=('The Evening Star of 7 July prints, under "NEW YORK, July 7.—The Times contains the following special dispatch: GETTYSBURG, July 6.—Reports from the front are very cheering.": '
                    '"The enemy were abandoning their wounded on the retreat. Every house and barn for fifteen miles is a hospital. They are leaving their generals and colonels as well as privates. All the '
                    'wounded will fall into our hands. We have taken thus far over six thousand prisoners, besides the wounded." The Daily National Intelligencer of 8 July (under "GETTYSBURG, JULY 6.") prints '
                    '"The enemy are abandoning all their wounded on the retreat. Every house and barn for fifteen miles is an hospital." and "We have taken thus far six thousand prisoners, besides wounded." '
                    'The Worcester Daily Spy of 8 July (under "Gettysburg, Pa., July 6.") prints "The enemy are abandoning all their wounded on the retreat. Every house and barn for fifteen miles is a '
                    'hospital." and "We have taken thus far over six thousand prisoners, besides the wounded."'),
         tier='documented', state_date='1863-07-06',
         cites=[dict(page=STAR7_2, span=('The enemy were abandoning their wounded', 'besides the wounded.'),
                     heading='MORE GOOD NEWS FROM THE FRONT. LEE\'S ARMY DROPPING TO PIECES. NEW YORK, July 7.—The Times contains the following special dispatch: GETTYSBURG, July 6.—Reports from the front are very cheering.',
                     heading_img='r4_83045462_0707_timeshead',
                     reprint={'status': 'reprint', 'from': 'a special dispatch of the New York Times, datelined Gettysburg, July 6 (the Star prints "NEW YORK, July 7.—The Times contains the following special dispatch")',
                              'basis': 'The Times contains the following special dispatch'}),
                dict(page=INT8_3, span=('The enemy are abandoning all their wounded', 'besides wounded.'),
                     heading='FLIGHT OF GEN. LEE\'S ARMY. LOSS OF PRISONERS, CANNON, WAGONS, &c DESERTION OF THEIR WOUNDED. GETTYSBURG, JULY 6.—The reports from the front are very cheering.',
                     heading_img='r4_83026172_0708_fleehead', reprint=TIMES_OTHER),
                dict(page=WOR8_1, span=('The ene my are abandoning all their wounded', 'besides the wounded.'),
                     heading='PROGRESS OF LEE\'S RETREAT. PARTICULARS FROM THE FIELD. GETTYSBURG, PA., July 6.—The reports from the extreme front are very cheering.',
                     heading_img='r4_83021205_0708_leehead', reprint=TIMES_OTHER)],
         row_effect=('adds to the hospital rows (R05.0000, R13.0000) a further printed use of "Every house and barn for fifteen miles is a hospital": here said of the Confederate retreat, reported on 6 July '
                     '(a figure of speech, not a count; the Herald of 6 July prints "Every house and barn is a hospital" of the country about Gettysburg, see wounded-crowd-herald-0706); touches T3-148 only in '
                     'that Confederate wounded were being left behind, reported on 6 July; it does not date the collection of the wounded behind Confederate lines (the row\'s 4 and 5 July)'),
         remains='the places ("fifteen miles" is not tied to a place in the passage); the number of wounded; the dispatch reports what was heard at the front',
         independence='the same sentences in three papers; the Star names the New York Times as the source, the other two name none; the wording differs in a few words (see the sub-claim)'),
]
