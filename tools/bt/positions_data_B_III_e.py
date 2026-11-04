"""Scope B, III Corps (part e): Second Division, Second Brigade (Brewster, Excelsior) and Third Brigade (Burling) with their regiments."""
from positions_claims import claim, gap

HM = 'OR27-1-R158'     # Humphreys
BR = 'OR27-1-R169'     # Brewster
HU = 'OR27-1-R170'     # Hugo, 70th NY
PO = 'OR27-1-R171'     # Potter, 71st NY
AU = 'OR27-1-R172'     # Austin, 72nd NY
LO = 'OR27-1-R173'     # Lockwood, 120th NY
BU = 'OR27-1-R174'     # Burling
BA = 'OR27-1-R175'     # Bailey, 2nd NH
WO = 'OR27-1-R176'     # Woolsey / Sewell, 5th NJ
GK = 'OR27-1-R177'     # Gilkyson, 6th NJ
CO = 'OR27-1-R178'     # Cooper, 7th NJ
B1 = 'OR27-1-R133'     # Birney

X = 'us-3c-2d-brewster'
Y = 'us-3c-2d-burling'


def C(unit, kind, rec, rx, act, wp=None, md='07-02', hm=None, pl=None, road=None, gz=None, tier='documented', **kw):
    t = '1863-%sT%s' % (md, hm) if hm else None
    return claim(unit, kind, rec, rx, act, when_printed=wp, date='1863-' + md, t_iso=t, place_printed=pl, road=road, gz=gz, tier=tier, **kw)


ITEMS = [
    # ================================================================ BREWSTER'S (EXCELSIOR) BRIGADE
    C(X, 'night_position', BR, r'to near Walkers ville, passing through Middletown and Frederick City', 'June 28 marched to near Walkersville through Middletown and Frederick City', wp='Ju/ne 28', md='06-28', pl='Walkers ville', ocr=True, note='OCR "Ju/ne 28", "Marchisd", "Walkers ville".'),
    C(X, 'march', BR, r'Marched to Taneytown, passing through Woodsborough and Middleburg', 'June 29 marched to Taneytown through Woodsborough and Middleburg', wp='June 29', md='06-29', pl='Taneytown'),
    C(X, 'night_position', BR, r'Marched about 6 miles beyond Taneytown, and bivouacked for the night', 'June 30 marched about 6 miles beyond Taneytown and bivouacked', wp='June 30', md='06-30', pl='6 miles beyond Taneytown', label='jun30-brewster', conflicts=['label:jun30-dep-carr']),
    C(X, 'arrival_road', BR, r'reaching there about midnight', 'July 1 marched to a point near Gettysburg through Emmitsburg, reaching there about midnight', wp='about midnight', md='07-02', hm='00:00', approx=True, pl='a point near Gettysburg', label='2d-arr-brewster', conflicts=['label:2d-arr-humphreys'],
      note='"About midnight" put at 00:00 of July 2; ledger value for the division is 00:00 (EPP) vs 02:00 (SS1).'),
    C(X, 'movement', BR, r'orders from the brigadier-general commanding the division to move', 'About 1 o\'clock on July 2 ordered by Humphreys to move the brigade to the front, form line of battle in rear of the First Brigade and send one regiment 250 yards in advance to the crest of the hill',
      wp="At about 1 o'clock on the afternoon of the 2d", md='07-02', hm='13:00', approx=True, label='brewster-1300'),
    C(X, 'position', BR, r'of battle in rear of the First Brigade', 'Line of battle in rear of the First Brigade (then going into position on the right of the First Division)', wp="At about 1 o'clock on the afternoon of the 2d", md='07-02', hm='13:00', approx=True, pl='in rear of the First Brigade'),
    C(X + '-73ny', 'position', BR, r'I detailed the Fourth Excelsior \(Seventy-third New York Volunteers\)', '73rd NY (4th Excelsior, Maj. Burns) detailed to hold the crest of the hill about 250 yards in advance of the First Brigade at all hazards', md='07-02', hm='13:00', approx=True, wp="At about 1 o'clock on the afternoon of the 2d", pl='the crest of the hill, about 250 yards in advance of the First Brigade'),
    C(X + '-71ny', 'position', BR, r'left of the First Brigade, and connected with the First Division', '71st NY (Potter) and 72nd NY (Austin) placed on the left of the First Brigade, connected with the First Division', md='07-02', approx=True, pl='left of the First Brigade'),
    C(X + '-72ny', 'position', BR, r'left of the First Brigade, and connected with the First Division', '72nd NY (Austin) placed on the left of the First Brigade, connected with the First Division', md='07-02', approx=True, pl='left of the First Brigade'),
    C(X + '-74ny', 'position', BR, r'was placed on the right of the First Bri', '74th NY (5th Excelsior, Lt.-Col. Holt) placed on the right of the First Brigade', md='07-02', approx=True, pl='the right of the First Bri'),
    C(X + '-70ny', 'position', BR, r'in support of the first line of battle of our division', '70th NY (1st Excelsior, Farnum) and 120th NY (Westbrook) in support of the first line of the division', md='07-02', approx=True),
    C(X + '-120ny', 'position', BR, r'in support of the first line of battle of our division', '120th NY (Westbrook) in support of the first line of the division', md='07-02', approx=True),
    C(X, 'movement', BR, r'At about 4 o.clock we advanced our line of battle', 'About 4 o\'clock the brigade advanced its line of battle into a position under a most terrible artillery fire from the left',
      wp="At about 4 o'clock", md='07-02', hm='16:00', approx=True, label='adv-brewster', conflicts=['label:adv-humphreys']),
    C(X + '-73ny', 'movement', BR, r'I was directed to send it to the support of General Graham.s brigade', 'About 5.30 o\'clock the 73rd NY, relieved from the crest, was sent to the support of Graham\'s brigade in the First Division',
      wp="At about 5.30 o'clock", md='07-02', hm='17:30', approx=True, pl="General Graham's brigade", label='73ny-graham'),
    C(X, 'engagement', BR, r'I made a charge at the head of about 150 men', 'Brewster charged with about 150 men of the 71st, 72nd, 73rd, 74th and 120th and recaptured three guns, taking the colors of the 8th Florida, its major and some 30 men',
      md='07-02', pl='three of our guns'),
    C(X, 'night_position', BR, r'Soon after sunset we were relieved by a brigade from the Second Corps', 'Soon after sunset relieved by a Second Corps brigade, reformed line in its rear and bivouacked', wp='Soon after sunset', md='07-02', pl='the rear'),
    C(X, 'movement', BR, r'we moved a little distance to the rear, to give the men rations', 'On the morning of July 3 moved a little distance to the rear for rations and ammunition', wp='On the morning of the 3d', md='07-03', pl='the rear'),
    C(X, 'movement', BR, r'we again moved to the front, in support of batteries', 'About 3 p. m. July 3 moved to the front in support of batteries, severe artillery fire; at sunset returned to the morning position', wp='At about 3 p. m.', md='07-03', hm='15:00', approx=True, conflicts=['label:2d-jul3-center']),
    C(X, 'night_position', BR, r'At sunset, we returned to the position occupied in the morning', 'At sunset July 3 returned to the position of the morning and bivouacked', wp='At sunset', md='07-03'),
    C(X, 'departure', BR, r'On the morning of the 7th, we started in pursuit of the retreating enemy', 'July 4-6 burying parties only; morning of July 7 started in pursuit', wp='On the morning of the 7th', md='07-07', conflicts=['label:dep-2d']),
    C(X, 'strength_note', BR, r'1,837 officers and men, out of which we lost 778', 'Strength at the commencement of the action 1,837 officers and men; lost 778 (nearly 45 per cent)', md='07-02', ocr=True, note='Digits as printed (the printed table of losses totals 778).'),

    C(X + '-70ny', 'march', HU, r'On the 29th, marched to Taneytown', '70th NY June 29 marched to Taneytown through Woodsborough, Ladiesburg, Middleburg', wp='On the 29th', md='06-29', pl='Taneytown'),
    C(X + '-70ny', 'night_position', HU, r'marched about 6 miles beyond Taneytown, where the regiment was detailed for picket duty', 'June 30 afternoon marched about 6 miles beyond Taneytown and detailed for picket duty', wp='On the afternoon of the 30th', md='06-30', pl='6 miles beyond Taneytown', conflicts=['label:jun30-brewster']),
    C(X + '-70ny', 'arrival_road', HU, r'arriving near Gettysburg at 12 m\., having passed through Emmitsburg', 'July 1 pickets withdrawn, march resumed at 7.30, arriving near Gettysburg at 12 m. having passed through Emmitsburg', wp='12 m.', md='07-01', hm='12:00', pl='Gettysburg', label='70ny-arr-noon', conflicts=['label:2d-arr-humphreys', 'label:2d-arr-brewster'],
      note='"12 m." on July 1 is not consistent with the arrival of the brigade after midnight (Brewster R169 about midnight; Humphreys R158 1 a. m.). Possibly 12 midnight meant; kept as printed, unresolved.'),
    C(X + '-70ny', 'position', HU, r'8 a\. m\. of the 2d, the regiment was formed in line of battle', 'At 8 a. m. July 2 formed in line of battle, remained until 1 p. m. when ordered forward halting in rear of the First Brigade as its support', wp='8 a. m. of the 2d', md='07-02', hm='08:00'),
    C(X + '-70ny', 'movement', HU, r'orders were received to advance, halting in rear of the First Brigade', 'At 1 p. m. advanced to halt in rear of the First Brigade as its support; lay under artillery fire until 4 o\'clock', wp='1 p. m.', md='07-02', hm='13:00', pl='rear of the First Brigade'),
    C(X + '-70ny', 'engagement', HU, r'held our ground against a superior force until dark', 'About 4 o\'clock engaged the enemy and held ground until dark, then relieved by the Second Corps; loss 112', wp="until 4 o'clock", md='07-02', hm='16:00', approx=True),
    C(X + '-70ny', 'position', HU, r'formed in line of battle, supporting the Fifth Corps', 'At daylight July 3 formed in line of battle supporting the Fifth Corps; 3 p. m. ordered to the right to support a battery of the Second Corps; at dark marched to the left to bivouac', wp='At daylight on the morning of the 3d', md='07-03'),
    C(X + '-70ny', 'movement', HU, r'when we were ordered to the right, to support a', 'About 3 p. m. July 3 ordered to the right to support a battery of the Second Corps', wp='3 p. m.', md='07-03', hm='15:00', conflicts=['label:2d-jul3-center']),
    C(X + '-70ny', 'departure', HU, r'started in pursuit of the enemy, passing through Emmitsburg', 'July 5 and 6 burying parties; morning of July 7 started in pursuit through Emmitsburg, bivouacking near Mechanicstown', wp='On the morning of the 7th', md='07-07', pl='Emmitsburg', conflicts=['label:dep-2d']),
    C(X + '-71ny', 'engagement', PO, r'The regiment was engaged at Gettysburg, Pa\., July 2', '71st NY engaged at Gettysburg July 2 (230 men and 13 officers, loss 90); recaptured a gun lost by a Battery K', wp='July 2', md='07-02', pl='Gettysburg'),
    C(X + '-71ny', 'position', PO, r'This regiment also participated with the brigade in the engagement', 'July 3 also participated with the brigade (loss only 3 wounded)', wp='July 3.', md='07-03'),
    C(X + '-72ny', 'night_position', AU, r'passing through Frederick to Walkersville, where we encamped for the night', 'June 28 left Middletown, through Frederick to Walkersville, encamped for the night', wp='June 28', md='06-28', pl='Walkersville'),
    C(X + '-72ny', 'march', AU, r'On the 29th, we marched through Woodsborough and Middleburg to Taneytown', 'June 29 marched to Taneytown via Woodsborough and Middleburg', wp='On the 29th', md='06-29', pl='Taneytown'),
    C(X + '-72ny', 'night_position', AU, r'marched through Bridgeport, and bivouacked for the night about 3 miles from the town', 'June 30 morning left Taneytown, through Bridgeport, bivouacked about 3 miles from the town', wp='on the morning of the 30th', md='06-30', pl='Bridgeport', conflicts=['label:jun30-dep-carr', 'label:jun30-brewster'],
      note='Austin says "Left Taneytown on the morning of the 30th", other regiments left in the afternoon.'),
    C(X + '-72ny', 'march', AU, r'July 1, we marched to Emmitsburg, and encamped about 2 p\. m\.', 'July 1 marched to Emmitsburg and encamped about 2 p. m.', wp='about 2 p. m.', md='07-01', hm='14:00', approx=True, pl='Emmitsburg'),
    C(X + '-72ny', 'march', AU, r'Broke camp at 4 p\. m\., and marched to Gettysburg', 'Broke camp at 4 p. m. and marched to Gettysburg', wp='4 p. m.', md='07-01', hm='16:00', pl='Gettysburg'),
    C(X + '-72ny', 'arrival_road', AU, r'arriving there at 2 a\. m\.', 'Arrived at Gettysburg at 2 a. m. (July 2)', wp='2 a. m.', md='07-02', hm='02:00', pl='Gettysburg', conflicts=['label:2d-arr-humphreys']),
    C(X + '-72ny', 'position', AU, r'ordered to the front about 10 a\. m\. of the 2d', 'About 10 a. m. July 2 ordered to the front and placed in reserve of the Second (Excelsior) Brigade', wp='about 10 a. m. of the 2d', md='07-02', hm='10:00', approx=True),
    C(X + '-72ny', 'position', AU, r'ordered to advance across an open field in line of battle', 'At 2 p. m. advanced across an open field in line of battle, left of the regiment (the extreme left of the brigade) resting on a cross-road, the line parallel with the main road and in rear of the peach orchard',
      wp='At 2 p. m.', md='07-02', hm='14:00', pl='in rear of the peach orchard', gz='GZ-014'),
    C(X + '-72ny', 'engagement', AU, r'We remained in line of battle about two hours, under a most terrific fire', 'About two hours in line under a terrific fire, pressed hard on the left flank and fell back to the crest from which the brigade started in the morning; then charged and retook guns and the 8th Florida colors',
      md='07-02', pl='the crest of the hill from which the brigade started'),
    C(X + '-72ny', 'night_position', AU, r'bivouacked for the night in an orchard near the Gettysburg road', 'Night of July 2 bivouacked in an orchard near the Gettysburg road', md='07-02', pl='an orchard near the Gettysburg road'),
    C(X + '-72ny', 'movement', AU, r'they were again moved to the front, to support a battery', 'At 2 p. m. July 3 moved to the front to support a battery, until 7 p. m., then back to the morning position', wp='At 2 p. m.', md='07-03', hm='14:00', conflicts=['label:2d-jul3-center']),
    C(X + '-72ny', 'departure', AU, r'the regiment marched to Mechanicstown', 'July 7 marched to Mechanicstown', wp='On the 7th', md='07-07', pl='Mechanicstown'),
    C(X + '-120ny', 'arrival_road', LO, r'arriving on the battle-field of Gettysburg about 2 o.clock', '120th NY, forced march by Frederick, Taneytown and Emmitsburg, arrived on the field about 2 o\'clock on the morning of July 2', wp="about 2 o'clock on the morning of July 2", md='07-02', hm='02:00', approx=True, pl='the battle-field of Gettysburg', conflicts=['label:2d-arr-humphreys']),
    C(X + '-120ny', 'movement', LO, r'to advance to a position in the left center, to support the First Division', 'Afternoon of July 2 brigade ordered to advance to a position in the left center to support the First Division, across an open field under artillery fire', wp='On the afternoon of July 2', md='07-02', pl='the left center'),
    C(X + '-120ny', 'departure', LO, r'Marched from Gettysburg on Tuesday, the 7th, to Williamsport', 'Marched from Gettysburg on Tuesday July 7', wp='Tuesday, the 7th', md='07-07', pl='Gettysburg', conflicts=['label:dep-2d']),
    C(X + '-73ny', 'movement', HM, r'sent to the support of General Graham.s brigade', '73rd NY (Maj. Burns) sent to the support of Graham\'s brigade (Humphreys: before Sickles was wounded)', md='07-02', approx=True, pl="General Graham's brigade", label='73ny-graham-humph',
      note='Humphreys R158 sends Burns\' regiment after Sewell relieved the pickets (about 4-4.30 p. m.); Brewster R169 gives about 5.30.'),

    # ================================================================ BURLING'S BRIGADE
    C(Y, 'night_position', BU, r'bivouacked 7 miles out on the Liberty turnpike', 'June 28 crossed the Catoctin Mountain, passed through Frederick City and bivouacked 7 miles out on the Liberty turnpike', md='06-28', pl='7 miles out on the Liberty turnpike', tier='inferred',
      reasoning='The date is not printed; the sentence follows "Bivouacked near Middletown that night" (June 27) and precedes "Marched the next morning at 5 o\'clock ... to Taneytown" (June 29). Humphreys R158 and Brewster R169 put the division on the Woodsborough road/Walkersville that night.'),
    C(Y, 'march', BU, r'through Woodsborough, Ladiesburg, and Bruceville to Taneytown, arriving near dark', 'June 29 marched at 5 o\'clock through Woodsborough, Ladiesburg and Bruceville to Taneytown, arriving near dark', wp="at 5 o'clock", md='06-29', hm='05:00', pl='Taneytown', tier='inferred',
      reasoning='Dated "the next morning" after the June 28 bivouac; the date is not printed.'),
    C(Y, 'night_position', BU, r'Marched the next day through Bridgeport, and bivouacked for the night', 'June 30 marched through Bridgeport and bivouacked', md='06-30', pl='Bridgeport', tier='inferred', reasoning='"The next day" after the Taneytown arrival; date not printed.'),
    C(Y, 'march', BU, r'July 1, we reached Emmitsburg, Md\., at 12 m\.', 'July 1 brigade reached Emmitsburg at 12 m. and was ordered by Hamlin to remain with Smith\'s battery to guard the Hagerstown road', wp='at 12 m.', md='07-01', hm='12:00', pl='Emmitsburg, Md.', label='burling-emm-noon', conflicts=['label:carr-emm', 'label:baldwin-emm'],
      note='Carr R160 has the division at Emmitsburg at 1.15 p. m. (Baldwin 2.30; Austin about 2) while Burling says 12 m.'),
    C(Y, 'position', BU, r'remain at this place with the brigade and Smith.s battery', 'Ordered by Major Hamlin to remain at Emmitsburg with the brigade and Smith\'s battery to guard the Hagerstown road', md='07-01', pl='this place', road='Hagerstown road', label='burling-emm'),
    C(Y + '-5nj', 'night_position', WO, r'on the road leading from that place to Hagerstown', '5th NJ on picket on the night of July 1 about 1.5 (printed "1^") miles from Emmitsburg on the road to Hagerstown; pickets called in at 2 a. m.', md='07-01', pl='Emmitsburg, Md.', road='road leading from that place to Hagerstown', ocr=True),
    C(Y, 'movement', BU, r'received orders from General Meade to immediately rejoin the corps', 'At 1.30 a. m. July 2 order from Meade to immediately rejoin the corps near Gettysburg', wp='At 1.30 a. m., July 2', md='07-02', hm='01:30', pl='near Gettysburg', label='burling-130', conflicts=['label:trob-order']),
    C(Y, 'departure', BU, r'it was nearly 4 a\. m\. before I was able to march', 'Brigade covered much ground in a very dark night; marched from Emmitsburg nearly 4 a. m.', wp='nearly 4 a. m.', md='07-02', hm='04:00', approx=True, pl='Emmitsburg'),
    C(Y + '-5nj', 'movement', WO, r'At 2 a\. m\. the pickets were called in, and the regiment joined the brigade', '5th NJ pickets called in at 2 a. m. July 2; regiment joined the brigade and at daybreak marched toward Gettysburg', wp='At 2 a. m.', md='07-02', hm='02:00', pl='Emmitsburg'),
    C(Y, 'arrival_road', BU, r'We joined the corps and division at 9 a\. m\., July 2', 'Brigade joined the corps and division at 9 a. m. July 2, massed in column of regiments', wp='9 a. m., July 2', md='07-02', hm='09:00', label='burling-arr-burling', conflicts=['label:burling-arr-humph']),
    C(Y + '-5nj', 'arrival_road', WO, r'reaching the battle-field at about 10 a\. m\.', '5th NJ reached the battle-field at about 10 a. m.', wp='about 10 a. m.', md='07-02', hm='10:00', approx=True, conflicts=['label:burling-arr-burling']),
    C(Y + '-6nj', 'arrival_road', GK, r'arrived on the battle-field about 8 a\. m\. of the 2d', '6th NJ with the brigade arrived on the battle-field about 8 a. m. of the 2d, massed and rested about an hour', wp='about 8 a. m. of the 2d', md='07-02', hm='08:00', approx=True, conflicts=['label:burling-arr-burling']),
    C(Y, 'position', BU, r'The brigade was massed in column of regiments', 'Brigade massed in column of regiments after joining at 9 a. m., until nearly noon; then ordered by Humphreys to its position as a reserve to the First and Second Brigades', wp='9 a. m., July 2', md='07-02', pl='column of regiments'),
    C(Y, 'movement', BU, r'to march to the left, and report to General Birney', 'Shortly after noon ordered by Humphreys to march to the left and report to Birney; ordered by Birney to mass in a piece of woods in rear of his division', md='07-02', pl='left'),
    C(Y, 'movement', BU, r'ordered by him to mass the brigade in a piece of woods in the rear of his division', 'Massed in a piece of woods in the rear of the First Division', md='07-02', pl='a piece of woods in the rear of his division'),
    C(Y, 'movement', BU, r'I ordered the brigade to fall back about 100 yards', 'After half an hour in an open field under artillery fire on the left flank ordered the brigade back about 100 yards under a small rise; then ordered by Birney to the left behind a piece of woods, front at right angles to the former front', md='07-02', pl='open field'),
    C(Y + '-2nh', 'movement', BU, r'detail two of my largest regiments to report to General Graham', 'Birney ordered Burling to detail two of his largest regiments to report to Graham: the 2nd New Hampshire and 7th New Jersey', md='07-02', approx=True, pl='General Graham', label='burling-graham-order'),
    C(Y + '-7nj', 'movement', BU, r'detail two of my largest regiments to report to General Graham', '7th NJ detailed to report to Graham', md='07-02', approx=True, pl='General Graham'),
    C(Y + '-5nj', 'movement', BU, r'I sent the Fifth New ersey Volunteers', 'Birney ordered the strongest regiment to report to Humphreys for picket; Burling sent the 5th New Jersey, leaving three small regiments', md='07-02', approx=True, ocr=True, note='OCR "New ersey" and a garbled "Hum- Shreys" (Humphreys).'),
    C(Y + '-8nj', 'movement', BU, r'the Eighth New Jersey Volunteers was taken from me without my knowledge', '8th NJ taken from the brigade without Burling\'s knowledge after Birney ordered the largest regiment to Ward\'s support', md='07-02', approx=True, pl="General Ward's support"),
    C(Y + '-115pa', 'position', BU, r'leaving me with the One hundred and fifteenth Pennsylvania Volunteers', 'Only the 115th Pa (140 muskets) left under Burling; no two regiments together; he reported to Humphreys', md='07-02', approx=True),
    C(Y, 'night_position', BU, r'we lay on our arms until daylight of the 3d', 'Night of July 2 on arms until daylight of the 3d, then joined the division', md='07-02'),
    C(Y, 'movement', BU, r'We then moved to the right, to support batteries', 'July 3 marched to the rear of the position occupied the day before, until some time after noon; then moved to the right to support batteries for two hours under severe artillery fire; at night back to the former position',
      wp='some time after noon', md='07-03', approx=True, pl='the right', conflicts=['label:2d-jul3-center']),
    C(Y, 'position', BU, r'we started after the fleeing enemy, but, after a very short march', 'Sunday July 5 ready to move on short notice; Monday morning (July 6) started after the enemy, after a very short march returned to the starting point', wp='Monday morning', md='07-06', approx=True),
    C(Y, 'departure', BU, r'started at 3 a\. m\., and marched through Emmitsburg', 'Tuesday (July 7) started at 3 a. m. and marched through Emmitsburg, reaching Mechanicstown at sunset', wp='3 a. m.', md='07-07', hm='03:00', pl='Emmitsburg', conflicts=['label:dep-2d']),
    C(Y, 'movement', B1, r'These regiments were sent to me during the contest', 'Birney: the 5th, 6th and 7th New Jersey and 2nd New Hampshire of Burling\'s brigade were sent to the First Division during the contest', md='07-02', approx=True, pl='the contest'),
    C(Y + '-8nj', 'movement', HM, r'were sent to the support of General Ward.s brigade', 'Humphreys: the 8th New Jersey (Ramsey), 6th New Jersey (Gilkyson) and 115th Pennsylvania (Dunne) were sent to the support of Ward\'s brigade', md='07-02', approx=True, pl="General Ward's brigade", label='ward-support-humph'),
    C(Y + '-6nj', 'movement', HM, r'were sent to the support of General Ward.s brigade', '6th NJ sent to the support of Ward\'s brigade', md='07-02', approx=True, pl="General Ward's brigade"),
    C(Y + '-115pa', 'movement', HM, r'were sent to the support of General Ward.s brigade', '115th Pa sent to the support of Ward\'s brigade', md='07-02', approx=True, pl="General Ward's brigade"),
    C(Y + '-7nj', 'movement', HM, r'were sent to the support of General Graham.s brigade', 'Humphreys: the 7th NJ (Francine) and 2nd NH (Bailey) were sent to the support of Graham\'s brigade', md='07-02', approx=True, pl="General Graham's brigade"),
    C(Y + '-2nh', 'movement', HM, r'were sent to the support of General Graham.s brigade', '2nd NH sent to the support of Graham\'s brigade', md='07-02', approx=True, pl="General Graham's brigade"),
    C(Y + '-5nj', 'position', HM, r'relieved the pickets of General Graham.s brigade', '5th NJ (Sewell) relieved Graham\'s pickets on Humphreys\' left, later returned to the line with heavy loss', md='07-02', approx=True),
    # ---------------------------------------------------------------- 2nd New Hampshire
    C(Y + '-2nh', 'movement', BA, r'I had the honor to receive your order to report to General Graham', 'At 3 p. m. ordered by Burling to report to Graham; moved at the double-quick with 24 commissioned officers and 330 rifles', wp='At 3 p. m.', md='07-02', hm='15:00', conflicts=['label:burling-graham-order']),
    C(Y + '-2nh', 'position', BA, r'I was at once ordered to support Battery G, First New York Artillery', 'Ordered to support Battery G, 1st NY Artillery (Ames) and one section of a battery unknown; left on the right of the 63rd Pa; right covered by a wood house on the Emmitsburg road; Third Maine skirmishing 200 yards in front',
      md='07-02', pl='a wood house situated upon the Emmitsburg road', road='Emmitsburg road', gz='GZ-041'),
    C(Y + '-2nh', 'engagement', BA, r'a brigade of the enemy was advancing on our right', 'At 5 o\'clock saw a brigade advancing on the right in column of battalions and two regiments to the left; charged 150 yards at a run; later fell back slowly', wp="At 5 o'clock", md='07-02', hm='17:00', approx=True),
    C(Y + '-2nh', 'night_position', BA, r'I rejoined the brigade at about 6\.30 p\. m\.', 'Rejoined the brigade at about 6.30 p. m. fearfully diminished', wp='about 6.30 p. m.', md='07-02', hm='18:30', approx=True),
    # ---------------------------------------------------------------- 5th New Jersey
    C(Y + '-5nj', 'position', WO, r'ordered to relieve another regiment in support of Battery K', 'At about 4 p. m. ordered to relieve another regiment in support of Battery K (Seeley), 4th US, near the Emmitsburg road just south of the apple orchard; deployed as skirmishers',
      wp='At about 4 p. m.', md='07-02', hm='16:00', approx=True, pl='near the Emmitsburg road, just south of the apple orchard', road='Emmitsburg road', gz='GZ-041', label='5nj-0400'),
    C(Y + '-5nj', 'position', WO, r'My orders were to report to General Graham, for the purpose of relieving', 'Sewell\'s correction: orders were to report to Graham to relieve the 63rd Pa on picket; right at a white house, left to a large barn on the Emmitsburg road, covering the front of the Second Division; Seeley\'s battery a few paces in rear of the center',
      md='07-02', pl='a white house'),
    C(Y + '-5nj', 'engagement', WO, r'the skirmishers in our front \(the First U\. S\. Sharpshooters\) were driven in', 'About 5 o\'clock the 1st US Sharpshooters in front were driven in; a Confederate line advanced about 600 yards to the left and front; regiments to the left fell back; regiment and Seeley\'s battery fell back firing', wp="At about 5 o'clock", md='07-02', hm='17:00', approx=True),
    C(Y + '-5nj', 'night_position', WO, r'That night the regiment bivouacked near the stream, in the rear of the battle-field', 'Night July 2 bivouacked near the stream in the rear of the battle-field', wp='That night', md='07-02', pl='the stream, in the rear of the battle-field'),
    # ---------------------------------------------------------------- 6th New Jersey
    C(Y + '-6nj', 'movement', GK, r'detached from the brigade, and ordered to the support of General Ward.s brigade', '6th NJ detached from the brigade and ordered to the support of Ward\'s brigade, engaged near the left of the line, partly in the woods', md='07-02', pl='near the left of our line'),
    C(Y + '-6nj', 'position', GK, r'directly in front of the Fourth New York Battery, Captain Smith', 'Advanced about 200 yards across the open field directly in front of Smith\'s 4th NY Battery, taking position on the left of Ward\'s brigade; about two hours',
      md='07-02', pl='the open field'),
    C(Y + '-6nj', 'night_position', GK, r'ordering me to join my brigade, which we did about 7 p\. m\.', 'Ward told him he had been relieved; rejoined the brigade about 7 p. m.', wp='about 7 p. m.', md='07-02', hm='19:00', approx=True),
    C(Y + '-6nj', 'movement', GK, r'we were ordered farther to the right, to support some batteries', 'July 3 massed in woods in rear and near the left until about 2 p. m., then ordered farther to the right to support batteries for about two hours', wp='about 2 p. m.', md='07-03', hm='14:00', approx=True, conflicts=['label:2d-jul3-center']),
    # ---------------------------------------------------------------- 7th New Jersey
    C(Y + '-7nj', 'movement', CO, r'Colonel Francine was ordered to report to Brigadier-General Graham', 'About 4 o\'clock in the afternoon of July 2 ordered to report to Graham; soon placed to support a battery', wp="About 4 o'clock in the afternoon of the 2d", md='07-02', hm='16:00', approx=True, conflicts=['label:burling-graham-order']),
    C(Y + '-7nj', 'engagement', CO, r'until 5\.30 p\. m\., when the enemy made a vigorous charge', 'Position exposed until 5.30 p. m. when the enemy charged a battery on the left; the battery broke through the ranks; Francine and Price wounded; regiment fell back to the woods; later joined the brigade', wp='5.30 p. m.', md='07-02', hm='17:30'),
    C(Y + '-7nj', 'movement', CO, r'we again moved with the brigade to the right', 'July 3 morning to the front, then about 5 p. m. again with the brigade to the right in support of two batteries; then back to the former position', wp='about 5 p. m.', md='07-03', hm='17:00', approx=True, conflicts=['label:2d-jul3-center']),
]

# ----------------------------------------------------------------------- gaps (own reports not in the index)
ITEMS += [
    gap(Y + '-8nj', 'position', ['Eighth New Jersey Ramsey Gettysburg', 'Colonel Ramsey Eighth New Jersey', '8th New Jersey July 2 position'],
        'No regimental report of the 8th New Jersey (Col. Ramsey) is indexed in OR vol. 27 (index: reports 174-178 cover Burling, 2nd NH, 5th NJ, 6th NJ, 7th NJ). The regiment appears only in Humphreys R158 (sent to the support of Ward\'s brigade), Burling R174 (taken from the brigade) and the casualty table.',
        reports=['OR27-1-R158', 'OR27-1-R174', 'OR27-1-R133', 'OR27-1-R135'], activity='8th NJ: no own report; times and ground unknown'),
    gap(Y + '-115pa', 'position', ['One hundred and fifteenth Pennsylvania Dunne', 'Major Dunne 115th', '115th Pennsylvania Ward support'],
        'No regimental report of the 115th Pennsylvania (Maj. Dunne) is indexed in OR vol. 27; positions come only from Humphreys R158 and Burling R174 (115th with 140 muskets sent to Ward\'s support).',
        reports=['OR27-1-R158', 'OR27-1-R174'], activity='115th Pa: no own report'),
    gap(X + '-74ny', 'position', ['Seventy-fourth New York Holt Gettysburg', 'Fifth Excelsior July 2', 'Lieut. Col. Thomas Holt'],
        'No report of the 74th New York (5th Excelsior, Lt.-Col. Holt) is indexed in OR vol. 27; its place comes only from Brewster R169 (right of the First Brigade) and Humphreys R158.',
        reports=['OR27-1-R169', 'OR27-1-R158', 'OR27-1-R171', 'OR27-1-R172'], activity='74th NY: no own report'),
    gap(X + '-73ny', 'position', ['Seventy-third New York Burns Gettysburg', 'Fourth Excelsior Major Burns', 'Maj. M. W. Burns'],
        'No report of the 73rd New York (4th Excelsior, Maj. Burns) is indexed in OR vol. 27; its movements come only from Humphreys R158 and Brewster R169 (log house, then Graham).',
        reports=['OR27-1-R169', 'OR27-1-R158', 'OR27-1-R171'], activity='73rd NY: no own report'),
]

ITEMS += [
    gap(X, 'arrival_road', ['Excelsior Brigade road Gettysburg July 1 midnight', 'Brewster brigade Emmitsburg Gettysburg route July 1', 'Seventieth Seventy-first Seventy-second New York road to Gettysburg July 1'],
        'Brewster (R169) and the regimental reports of the 70th, 71st, 72nd and 120th NY say only that the brigade passed through Emmitsburg and reached "a point near Gettysburg" after midnight; no report of the brigade names the road. The route of the division (western road, Marsh Run crossing, Black Horse Tavern road and counter-march) is given by Humphreys R158 and Carr R160 only.',
        reports=['OR27-1-R169', 'OR27-1-R170', 'OR27-1-R171', 'OR27-1-R172', 'OR27-1-R173', 'OR27-1-R158', 'OR27-1-R160'], activity='Excelsior Brigade: road of approach July 1 not named in its own reports'),
    gap(Y, 'arrival_road', ['Burling brigade road Emmitsburg to Gettysburg July 2 morning', 'Burling Third Brigade Smith battery route July 2 Gettysburg', 'Fifth Sixth Seventh Eighth New Jersey Second New Hampshire march to Gettysburg July 2'],
        'Burling (R174) and his regiments give no road for the march of the morning of July 2 from Emmitsburg to the field; Humphreys R158 says the Third Brigade and Smith\'s battery marched by the main road from Emmitsburg to Gettysburg and joined at 9 a. m.',
        reports=['OR27-1-R174', 'OR27-1-R175', 'OR27-1-R176', 'OR27-1-R177', 'OR27-1-R178', 'OR27-1-R158', 'OR27-1-R183'], activity='Burling\'s brigade: road named only by Humphreys'),
]
