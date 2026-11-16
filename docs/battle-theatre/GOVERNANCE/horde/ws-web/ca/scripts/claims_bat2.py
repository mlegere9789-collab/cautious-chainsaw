"""Battle-day claims, second set (June 26 to July 12, 1863): what 1863 newspapers literally print.

Written on 2026-11-16 from the whole issues of the Library of Congress pages saved on that day (1 to 9 July: Herald, Tribune, Chicago Tribune, Evening Star,
National Intelligencer; 2 to 9 July: Republican, Worcester Spy, Portland Press, Wheeling Intelligencer; 26 to 30 June and 10 to 12 July: the five dailies).
Same rules as claims_epi.py and claims_bat.py: quotes are cut by the builder from the saved reading text; a quoted fragment of a sub_claim must stand in the
reading of the print (readings_overlay.json, made by looking at the image crops) of one of the citations; a paper named in a sub_claim must be cited.
Tier rule (DD-NEWS-01): the statement as printed is 'documented'; a step beyond the printed words is marked in row_effect.
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
AP = {'status': 'wire', 'from': 'Associated Press (the Star prints "[Correspondence of the Associated Press.]")', 'basis': 'the same dispatch stands in the Star, Intelligencer, Tribune and Herald of 6-7 July'}

CLAIMS = [
    dict(ids=['T2-212', 'T2-225'], key='crounse-moonlight-0702',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-07-02',
         cites=[dict(page=INT6_2, span=('The battle lasted till fully', 'winrows of hay.'),
                     attribution='Mr.M. L. CROUNSE, another New York correspondent, thus graphically describes the battle of Thursday:',
                     reprint={'status': 'reprint', 'from': 'Mr. M. L. Crounse, a New York correspondent (the Intelligencer\'s heading: "another New York correspondent")', 'basis': 'Mr.M. L. CROUNSE, another New York correspondent'}),
                dict(page=WHIG8, span=('The battle lasted till fully half past 8', 'winrows of hay.'),
                     reprint={'status': 'reprint', 'from': None, 'basis': 'the same account as the Intelligencer of 6 July; the Whig names no source in the text read'})],
         row_effect='adds to T2-212 (moon, fairly bright on the night of 2 July): a correspondent walked "some portions of the line by moonlight" after the battle ended about half past eight; adds to T2-225 a statement of how the rebel dead lay in front of brigades with walls or fences, without naming the place',
         remains='the place of the line he visited; the hour; the moon is not described beyond the word moonlight',
         independence='one letter, printed twice'),

    dict(ids=['T2-173', 'R03.C-037'], key='whig-barksdale-found-0702',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-07-02',
         cites=[dict(page=WHIG8, span=('In front of General Webb', 'must die.'), reprint={'status': 'reprint', 'from': None, 'basis': 'the same account as the Intelligencer of 6 July (which stops after "winrows of hay")'})],
         row_effect='adds to the Barksdale entries: a Richmond paper of 8 July prints the Northern correspondent\'s lines that Barksdale\'s body was found "not far from" the ground in front of Webb\'s brigade, still living and "must die"',
         remains='the date and hour; whether the Thursday or the Friday fighting is meant',
         caution='the Intelligencer of 6 July prints the same letter without this paragraph (its OCR text ends the paragraph after "winrows of hay")'),

    dict(ids=['T3-150'], key='ap-burying-dead-0705',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-07-05',
         cites=[dict(page=STAR6_2, span=('Near Gettysburg, July 5.', 'belonged to the rebels.'), attribution='[Correspondence of the Associated Press.]', reprint=AP),
                dict(page=INT7_3, span=('Near Gettysburg, July 5', 'belonged to the rebels.'), reprint=AP),
                dict(page=TRIB7_1, span=('Near Gerryssuna, July 5', 'belonged to the Rebels.'), reprint=AP),
                dict(page=HER7_10, span=('Nbab GarTTHBraa,ialy 6,1803.', 'belonged to the rebels'), reprint=AP)],
         row_effect='adds to T3-150: troops of the Army of the Potomac "engaged all day in burying the dead, relieving the wounded, and collecting arms" on 5 July (the Herald prints a different date line, read from the print)',
         remains='how many were buried; where; whether townspeople and farmers helped (not in the passage)',
         independence='one dispatch, four printings'),

    dict(ids=['T1-197'], key='cemetery-tombstones-0703',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-07-03',
         cites=[dict(page=WOR7_1, span=('Gen. Howard’s headquarters were in the cemetery', 'continued till four o’clock,'), reprint=NOSRC),
                dict(page=TRIB6_12, span=('Tombstones uno beautiful monuwets were demolished', 'checkered with fulowe.'), reprint=NOSRC)],
         row_effect='supports T1-197 for the damage to the cemetery by artillery fire ("tombstones and beautiful monuments were demolished"); the passage is about the cannonade of Friday 3 July, not the evening of 1 July, so the row\'s split between 1 and 2 July is not touched',
         remains='which cemetery (the passage says "the cemetery" with Gen. Howard\'s headquarters in it: the position on Cemetery Hill); which monuments; the fences are not mentioned',
         independence='one account, two printings'),

    dict(ids=['T3-075', 'T3-094'], key='worcester-cannonade-times-0703',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-07-03',
         cites=[dict(page=WOR7_1, span=('At 2 o’clock on Friday afternoon Lee open', 'artillery battle on this continent.'), reprint=NOSRC),
                dict(page=WOR7_1, span=('The artillery fire continued till four', 'and 2d corps.'), reprint=NOSRC)],
         row_effect='adds two printed values for the cannonade: opening "at 2 o\'clock on Friday afternoon" with "three hours of cannonading", and fire that "continued till four o\'clock"; the row\'s opening (about 13:00) and end (14:00 to 15:00) are the Official Records and later accounts; the newspaper hours are carried as a further selectable value, no default',
         remains='the writer\'s clock; whether "three hours" is a count or a figure of speech',
         conflict='opening of the cannonade: about 13:00 (Official Records and later accounts) against 14:00 (this newspaper); end: 14:00 to 15:00 against 16:00'),

    dict(ids=['T3-148', 'R05.0000', 'R13.0000'], key='times-barn-hospital-0706',
         sub_claim='PROVISIONAL',
         tier='documented', state_date='1863-07-06',
         cites=[dict(page=STAR7_2, span=('The enemy were abandoning their wounded', 'besides the wounded.'),
                     reprint={'status': 'reprint', 'from': 'a special dispatch of the New York Times, Gettysburg, July 6 (the Star prints "The Times contains the following special dispatch")', 'basis': 'The Times contains the following special dispatch'}),
                dict(page=INT8_3, span=('The enemy are abandoning all their wounded', 'besides wounded.'), reprint=NOSRC),
                dict(page=WOR8_1, span=('The ene my are abandoning all their wounded', 'besides the wounded.'), reprint=NOSRC)],
         row_effect='adds to the hospital rows: on 6 July the Union side reported Confederate wounded left behind on the road of the retreat, "every house and barn for fifteen miles" a hospital (a figure of speech, not a count)',
         remains='the places; the number of wounded; the dispatch is a report of what was heard at the front',
         independence='one dispatch of the New York Times in three printings'),
]
