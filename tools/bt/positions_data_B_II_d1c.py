"""Scope B, II Corps, First Division, Third Brigade (Zook): Fraser R088 (brigade and 140th PA), Scherrer R089, Chapman R090, Nelson R091."""
from positions_claims import claim, gap

F = 'OR27-1-R088'
SC = 'OR27-1-R089'
CH = 'OR27-1-R090'
NE = 'OR27-1-R091'
U = 'us-2c-1d-zook'
ITEMS = [
    # ------------------------------------------------------------ Fraser (R088) brigade report
    claim(U, 'march', F, r'this brigade arrived on the battle-field', 'Brigade arrived on the battlefield under Zook on the morning of July 2 and was placed in order of column in rear of the Second Brigade (road not named)',
          when_printed='On the morntag of July 2', date='1863-07-02', approx=True, place_printed='in rear of the Second Brigade', ocr=True,
          note='"morntag" is OCR for morning.'),
    claim(U, 'movement', F, r'About 4 p\. m\. on same day, the brigade was marched', 'About 4 p. m. the brigade was marched rapidly toward the left to assist the Third Corps, then engaged; formed in order of battle with 140th PA on the extreme right, 66th NY center, 52nd NY left, 57th NY a short distance in rear as reserve',
          when_printed='About 4 p. m.', date='1863-07-02', t_iso='1863-07-02T16:00', approx=True, place_printed='toward the left', label='fra_4pm', conflicts=['label:cal_4to6', 'label:str_5pm', 'label:bro_6pm'],
          note='Formation of the brigade in the advance: 140th PA right, 66th NY center, 52nd NY left, 57th NY reserve (same passage).'),
    claim(U, 'engagement', F, r'its most advanced position on the crest of a small hill', 'Brigade advanced steadily, driving the enemy, to its most advanced position on the crest of a small hill; held until forced to retreat when fresh troops flanked it on the right and left',
          when_printed='About 4 p. m.', date='1863-07-02', approx=True, place_printed='the crest of a small hill'),
    claim(U, 'night_position', F, r'formed in line of battle in the position assigned to it', 'Shortly after the action the brigade assembled and formed in line of battle on the left center of the battlefield, about 50 paces in rear of the Second Brigade',
          when_printed='Shortly after the close of this action, July 2', date='1863-07-02', approx=True, place_printed='the left center of the battle-field'),
    claim(U, 'engagement', F, r'enemy having failed to advance beyond our picket line', 'July 3 afternoon: the brigade took no active part in the repulse of the attack, the enemy not advancing beyond the picket line; artillery fire caused no loss',
          when_printed='on the afternoon of July 3', date='1863-07-03', approx=True, place_printed='our picket line'),
    claim('us-2c-1d-zook-140pa', 'march', F, r'this\s+regiment, under the command of Col\. R\. P\. Roberts, arrived on the battle-ground', '140th PA, under Col. Roberts, arrived on the battleground on the morning of July 2 and remained several hours in order of columns by wings, right wing in front, a few paces in rear of the Second Brigade',
          when_printed='On the morning of July 2', date='1863-07-02', approx=True, place_printed='a few paces in rear of the Second Brigade'),
    claim('us-2c-1d-zook-140pa', 'engagement', F, r'About 4 p\. m\. the brigade was marched rapidly to the left', '140th PA on the extreme right of the Third Brigade line advanced and opened fire, driving the enemy to the crest of a small hill; four left companies wheeled to the right; held the crest until flanked, then retreated with the four right companies halting and firing',
          when_printed='About 4 p. m.', date='1863-07-02', t_iso='1863-07-02T16:00', approx=True, place_printed='the crest of a small hill', nth=0),
    claim('us-2c-1d-zook-140pa', 'night_position', F, r'formed in line of battle on the left center of the battle-ground', 'After the action the regiment assembled with the brigade in line of battle on the left center of the battleground, about 50 paces in rear of the Second Brigade',
          when_printed='After this engagement', date='1863-07-02', approx=True, place_printed='the left center of the battle-ground'),
    claim('us-2c-1d-zook-140pa', 'position', F, r'constructed\s+breastworks immediately in front of its line', 'Morning of July 3: the regiment, pursuant to orders, constructed breastworks immediately in front of its line; the artillery fire before the attack in the afternoon harmed no one',
          when_printed='On the morning of July 3', date='1863-07-03', approx=True, place_printed='immediately in front of its line'),
    # ------------------------------------------------------------ Scherrer (R089) 52nd NY
    claim('us-2c-1d-zook-52ny', 'march', SC, r'arrived on the field near Gettysburg at about 10 a\. m\.', '52nd NY arrived on the field near Gettysburg at about 10 a. m. on July 2',
          when_printed='at about 10 a. m.', date='1863-07-02', t_iso='1863-07-02T10:00', approx=True, place_printed='the field near Gettysburg', label='sch_10am',
          note='Other Third Brigade reports say "morning". Hancock (R076) has the corps arriving about 7 a. m.; Kelly (R082) has his brigade marching at 4.30 a. m.'),
    claim('us-2c-1d-zook-52ny', 'movement', SC, r'At 4 p\. m\. the regiment, under command of', 'At 4 p. m. ordered by Zook to advance toward the left at double-quick, through a small wood to a corn-field where the battle had been raging for hours',
          when_printed='At 4 p. m.', date='1863-07-02', t_iso='1863-07-02T16:00', place_printed='a corn-field', label='sch_4pm', conflicts=['label:cal_4to6']),
    claim('us-2c-1d-zook-52ny', 'engagement', SC, r'Driving them about 1,500 or 2,000 yards through the woods', 'Fired volleys at about 100 yards, advanced and drove the enemy 1,500 or 2,000 yards through the woods and over rocks, halted at the edge of the woods about 25 minutes, then ordered back as the enemy flanked the right; engagement lasted over an hour',
          when_printed='About twenty-five minutes afterward', date='1863-07-02', approx=True, place_printed='through the woods and over the rocks',
          note='The 1,500 to 2,000 yards is the writer\'s figure and is far larger than other reports of the same advance (Nelson 66th NY: about 300 yards; McKeen 400 yards).'),
    claim('us-2c-1d-zook-52ny', 'night_position', SC, r'rested for the night near the Taneytown road', 'The regiment organized again and rested for the night near the Taneytown road',
          when_printed='for the night', date='1863-07-02', place_printed='near the Taneytown road', gz='GZ-042', road='Taneytown road'),
    claim('us-2c-1d-zook-52ny', 'position', SC, r'occupied a position on the left of the battle-field', 'July 3: occupied a position on the left of the battlefield opposite the enemy\'s batteries; shell fire began soon after 12 o\'clock, two men slightly wounded',
          when_printed='soon after 12 o\'clock', date='1863-07-03', approx=True, place_printed='the left of the battle-field', label='sch_12', conflicts=['label:hanc_1pm', 'label:cal_noon', 'label:burke_10am', 'label:mul_noon', 'label:mck_4pm3', 'label:crs_2pm'],
          note='Another start time for the July 3 cannonade: soon after 12 o\'clock.'),
    # ------------------------------------------------------------ Chapman (R090) 57th NY
    claim('us-2c-1d-zook-57ny', 'march', CH, r'having been detailed the day previous as guard to the wagon train', 'The brigade (57th NY) had been detailed July 1 as guard to the wagon train and did not arrive on the scene of action until the morning of July 2',
          when_printed='the morning of July 2', date='1863-07-02', approx=True, place_printed='guard to the wagon train',
          note='A different account of July 1 from the other regiments of the brigade (66th NY: marched from Uniontown the whole previous day and night).', conflicts=['label:nel_marchthrough']),
    claim('us-2c-1d-zook-57ny', 'movement', CH, r'the division was moved rapidly to the left, to the support of the Third Corps', 'Afternoon of July 2: the division moved rapidly to the left to support the Third Corps; 57th NY brought up the brigade rear, was moved to the right and posted by Zook within a few rods of the front line',
          when_printed='On the afternoon of that day', date='1863-07-02', approx=True, place_printed='to the left, to the support of the Third Corps'),
    claim('us-2c-1d-zook-57ny', 'engagement', CH, r'the whole line in front of me suddenly gave way', 'Zook mortally wounded; right of the line broke; the front line gave way through the regiment; the 57th retired in line in good order, halting several times, and reported to Caldwell',
          when_printed='soon after', date='1863-07-02', approx=True, place_printed='within a few rods of the front line'),
    claim('us-2c-1d-zook-57ny', 'position', CH, r'directed to erect slight breastworks in front of my regiment', 'Morning of July 3: erected slight breastworks in front of the regiment, the division being in line to the right of the field in which it was engaged the day before',
          when_printed='On the morning of July 3', date='1863-07-03', approx=True, place_printed='to the right of the field in which it was engaged the day previous'),
    # ------------------------------------------------------------ Nelson (R091) 66th NY
    claim('us-2c-1d-zook-66ny', 'march', NE, r'arrived on the ground on the morning of the 2d', '66th NY arrived on the ground on the morning of July 2 after a very fatiguing march from Uniontown, Md., which occupied the whole of the previous day and night',
          when_printed='on the morning of the 2d', date='1863-07-02', approx=True, place_printed='Uniontown, Md.', label='nel_marchthrough',
          note='Departure place Uniontown, march continuous day and night July 1-2: compare Hancock (R076): Uniontown to Taneytown by 11 a. m. July 1, bivouac, resume 1.30 p. m., halt for the night about 3 miles in rear.'),
    claim('us-2c-1d-zook-66ny', 'position', NE, r'We formed line of battle, with the One hundred and fortieth', 'On arrival formed line of battle with the 140th PA in front in two lines, the 52nd NY on the right and the 57th NY in the rear; stacked arms and rested',
          when_printed='on the morning of the 2d', date='1863-07-02', approx=True, place_printed='line of battle'),
    claim('us-2c-1d-zook-66ny', 'engagement', NE, r'About 4 p\. m\. the rebels opened on us with a severe fire', 'About 4 p. m. enemy artillery opened on the position, killing Capt. Munn of the regiment; the regiment moved to the left, then front and back to its first position, then by the left flank toward heavy firing',
          when_printed='About 4 p. m.', date='1863-07-02', t_iso='1863-07-02T16:00', approx=True, place_printed='our first position', label='nel_4pm', conflicts=['label:cal_4to6']),
    claim('us-2c-1d-zook-66ny', 'movement', NE, r'moved by the left flank, in the direction of which heavy firing', 'Moved by the left flank about a quarter of a mile, then by battalion to the right to form brigade line, right in front; then by the left flank into the woods in front',
          when_printed='Soon after halting', date='1863-07-02', approx=True, place_printed='a distance of about one-quarter of a mile'),
    claim('us-2c-1d-zook-66ny', 'engagement', NE, r'Arrived at a rocky ridge about 300 yards from where we commenced', 'Advanced through wheatfields, woods, stone walls and ravines at a run to a rocky ridge about 300 yards from the start, halted and engaged at short range; Col. Morris and Lt. Col. Hammell wounded; right turned; retired',
          when_printed=None, date='1863-07-02', approx=True, place_printed='a rocky ridge', note='The spelling "wheatfields" is plural in the print; no gazetteer id given for a plural.'),
    claim('us-2c-1d-zook-66ny', 'position', NE, r'Early on the morning of the 3d, orders were received', 'Early on the morning of July 3 ordered to intrench; under artillery fire all day, no serious injury',
          when_printed='Early on the morning of the 3d', date='1863-07-03', approx=True, place_printed='ourselves'),
    gap('us-2c-1d-zook', 'departure', ['or27_find "Zook.{0,200}(July 5|5th instant|marched)" Part 1', 'R088-R091 full-text reading of the four Third Brigade reports', 'Hancock R076, Caldwell R077 pp.379-381 for the brigade after July 3'],
        'No Third Brigade report states when the brigade left the field after July 3 (Caldwell R077 and McKeen R078 carry only the First Brigade departure; Kelly R082 carries the Second).',
        reports=['OR27-1-R088', 'OR27-1-R089', 'OR27-1-R090', 'OR27-1-R091', 'OR27-1-R077', 'OR27-1-R076'], activity='Departure of the Third Brigade (Zook) from the Gettysburg field after July 3'),
]
