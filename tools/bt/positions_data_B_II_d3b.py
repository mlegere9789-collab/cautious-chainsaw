"""Scope B, II Corps, Third Division, Third Brigade (Willard) R128-R131 and the Artillery Brigade (Hazard) R132."""
from positions_claims import claim, gap

BU = 'OR27-1-R128'
MD = 'OR27-1-R129'
SE = 'OR27-1-R130'
HK = 'OR27-1-R131'
HZ = 'OR27-1-R132'
D = 'us-2c-3d'
A = 'us-2c-art'
JULY3_OTHERS = ['label:cal_noon', 'label:burke_10am', 'label:mul_noon', 'label:crs_2pm', 'label:mck_4pm3', 'label:sch_12', 'label:coa_10am', 'label:hanc_1pm', 'label:gib_1pm', 'label:hal_1pm', 'label:hay_430', 'label:smy_2to5']
ITEMS = [
    # ------------------------------------------------------------ Bull (R128): Third Brigade
    claim(D + '-willard', 'position', BU, r'in mass near a barn a little south of the hill', 'Morning of July 2 the brigade, under Colonel Willard, took its position by direction of the division general by battalion in mass near a barn a little south of the hill known as Cemetery Hill',
          when_printed='first took its position', date='1863-07-02', approx=True, place_printed='near a barn a little south of the hill known as Cemetery Hill', gz='GZ-003'),
    claim(D + '-willard-39ny', 'engagement', BU, r'sent to the front as skirmishers', 'The 39th NY (Major Hildebrandt) was sent to the front as skirmishers by order of the division general and for some four hours did very effective service; loss 26 enlisted killed and wounded, 2 officers wounded',
          when_printed='for some four hours', date='1863-07-02', approx=True, place_printed='the front'),
    claim(D + '-willard-39ny', 'movement', BU, r'About noon, the division general ordered the regiment withdrawn', 'About noon the division general ordered the 39th NY withdrawn from the skirmish line; the brigade soon after changed position and was massed by battalion on a hill to the left of Cemetery Hill',
          when_printed='About noon', date='1863-07-02', t_iso='1863-07-02T12:00', approx=True, place_printed='a hill to the left of Cemetery Hill', gz='GZ-003'),
    claim(D + '-willard', 'movement', BU, r'At about 4 p\. m\., by order of the division general', 'At about 4 p. m. by order of the division general the brigade moved by the left flank about a quarter of a mile toward the left of the line, formed in line of battle and was ordered by Colonel Willard to charge two rebel batteries supported by infantry on the hill in front',
          when_printed='At about 4 p. m.', date='1863-07-02', t_iso='1863-07-02T16:00', approx=True, place_printed='about a quarter of a mile toward the left of the line', label='bul_4pm',
          conflicts=['label:hay_willard', 'label:see_5pm', 'label:cal_4to6'],
          note='Bull has the movement to the left at about 4 p. m.; Seeley (111th NY) about 5 p. m. and half a mile; Haskell (125th NY) just before sunset; Hays (division) says Willard was withdrawn "early in the day".'),
    claim(D + '-willard', 'engagement', BU, r'recaptured part of a battery previously taken from us', 'The brigade advanced through dense underbrush to the base of the hill, charged bayonets up the hill and recaptured part of a battery; continued to advance under fire from a battery higher up on the left and musketry on the right; ordered to retire; Willard killed after reforming; Sherrill took command and conducted the brigade to its original position',
          date='1863-07-02', approx=True, place_printed='a battery previously taken from us'),
    claim(D + '-willard', 'night_position', BU, r'the brigade reoccupied the position it held in the morning', 'After the firing ceased the brigade reoccupied the position held in the morning',
          when_printed='After the cessation of the firing', date='1863-07-02', approx=True, place_printed='the position it held in the morning'),
    claim(D + '-willard', 'engagement', BU, r'About 1 p\. m\. the enemy opened from his batteries', 'July 3: formed in two lines nearly parallel under the slope as supports to the artillery; about 1 p. m. the enemy opened a terrific cannonade lasting about two hours; near its close the regiments were formed on the hill to repel the infantry attack; engagement about an hour; Sherrill\'s death about 4 p. m., Bull took command',
          when_printed='About 1 p. m.', date='1863-07-03', t_iso='1863-07-03T13:00', approx=True, place_printed='under the slope of the hill', label='bul_1pm', conflicts=JULY3_OTHERS,
          note='The report places Sherrill\'s death "about 4 p. m." in the July 3 section although Bull\'s own earlier account and Hancock put Willard\'s death on July 2; Hays says Sherrill fell "next day". Recorded as printed.'),
    claim(D + '-willard-39ny', 'engagement', BU, r'at least two of these guns and caissons -were captured', 'On the afternoon of July 2 the 39th NY, detached by Willard about a third of a mile from the rest of the brigade, claims to have charged a line of rebel skirmishers and retaken four pieces with caissons of Battery I, 5th US Artillery; the other regiments claim at least two of the guns were captured in the advance of the brigade (conflicting claims; Bull cannot settle)',
          when_printed='During the afternoon of Thursday, the 2d instant', date='1863-07-02', approx=True, place_printed='about a third of a mile from the point where the residue of the brigade advanced', label='bul_guns',
          note='A conflict inside the brigade over which regiment retook the guns of Battery I, 5th US (Artillery Reserve, scope C).'),
    # ------------------------------------------------------------ MacDougall (R129), Seeley (R130): 111th NY
    claim(D + '-willard-111ny', 'movement', MD, r'ordered me with my regiment to the right in great haste', 'Evening of July 2, left in reserve about 200 yards in the rear when the brigade went down to re-enforce the Third Corps; Hancock ordered the 111th NY to the right in great haste to charge a rebel advance that had broken through; drove it beyond the brigade line almost into the mouth of its batteries',
          when_printed='On Thursday evening, July 2', date='1863-07-02', approx=True, place_printed='to the right', note='Hancock R076: "Colonel MacDougall bore a distinguished part" in Sherrill\'s advance. MacDougall gives "Thursday evening, July 2".'),
    claim(D + '-willard-111ny', 'strength_note', MD, r'out of about 390 taken into the', '111th NY lost 185 killed and wounded in less than twenty minutes out of about 390 taken into the fight',
          date='1863-07-02', place_printed='taken into the fight', support=True, label='mdg_390', conflicts=['label:see_400']),
    claim(D + '-willard-111ny', 'march', SE, r'marched at 3 a\. m\. to the heights south of Gettysburg', 'The 111th NY marched at 3 a. m. to the heights south of Gettysburg with the brigade on the morning of July 2 and lay in rear of the 126th and 125th NY with the 39th NY in its rear until about 5 p. m., under shelling',
          when_printed='at 3 a. m.', date='1863-07-02', t_iso='1863-07-02T03:00', place_printed='the heights south of Gettysburg', label='see_3am'),
    claim(D + '-willard-111ny', 'movement', SE, r'About 5 p\. m\. , by order of Colonel Willard', 'About 5 p. m. the regiment fell in and moved by the left flank about half a mile to the left, then a short distance to the right, formed on the right of the brigade line of battle, charged and drove the enemy from the four cannon taken earlier; returned to its original position; 39th NY afterward brought in the guns',
          when_printed='About 5 p. m.', date='1863-07-02', t_iso='1863-07-02T17:00', approx=True, place_printed='about half a mile to the left', label='see_5pm', conflicts=['label:bul_4pm']),
    claim(D + '-willard-111ny', 'engagement', SE, r'until about 1 p\. m\., when there was opened upon our position', 'July 3: fell in at 3 a. m. under shelling that died away at about 9 a. m.; quiet until about 1 p. m., when a cannonade opened; during its hottest the regiment marched by the right flank up to the crest and formed in rear of the 12th NJ, who were under a low stone wall; the shelling lasted about two hours; then the assault; over 400 prisoners counted',
          when_printed='about 1 p. m.', date='1863-07-03', t_iso='1863-07-03T13:00', approx=True, place_printed='in rear of the Twelfth New Jersey', label='see_1pm', conflicts=['label:hanc_1pm'] + JULY3_OTHERS),
    claim(D + '-willard-111ny', 'strength_note', SE, r'we took into the action about 400 men', 'The 111th NY took into the action about 400 men, rank and file; killed 57, wounded and missing 171',
          date='1863-07-02', place_printed='into the action', support=True, label='see_400', conflicts=['label:mdg_390'],
          note='MacDougall: about 390 taken into the fight; Seeley: about 400 men rank and file. Two estimates; recorded both.'),
    # ------------------------------------------------------------ Haskell (R131): 125th NY
    claim(D + '-willard-125ny', 'march', HK, r'arrived at Gettysburg on the morning of July 2', 'The 125th NY left Centreville June 25 and arrived at Gettysburg on the morning of July 2; took position on a nameless hill about half a mile from the village; three companies deployed as skirmishers',
          when_printed='on the morning of July 2', date='1863-07-02', approx=True, place_printed='a nameless hill, situated about half a mile from the village', ocr=True, note='The print reads "June 35" (OCR for June 25).'),
    claim(D + '-willard-125ny', 'movement', HK, r'Just before sunset of that day the brigade was ordered to take position on', 'Just before sunset July 2 the brigade was ordered to the left; the entire brigade charged the enemy and drove them; then ordered to retreat by Willard; about 9 p. m. the regiment took the position previously occupied and held it until after the battle',
          when_printed='Just before sunset', date='1863-07-02', approx=True, place_printed='the left', label='has_sunset', conflicts=['label:bul_4pm', 'label:see_5pm']),
    claim(D + '-willard-125ny', 'engagement', HK, r'About 3 p\. m\. the enemy formed line, and made a desperate charge', 'July 3 about 3 p. m. the enemy formed line and made a desperate charge on the position and was repulsed',
          when_printed='About 3 p. m.', date='1863-07-03', t_iso='1863-07-03T15:00', approx=True, place_printed='our position', conflicts=['label:hay_430']),
    claim(D + '-willard-125ny', 'departure', HK, r'The regiment left Gettysburg July 5', 'The regiment left Gettysburg July 5',
          when_printed='July 5', date='1863-07-05', place_printed='Gettysburg'),
    # ------------------------------------------------------------ Hazard (R132): Artillery Brigade
    claim(A, 'march', HZ, r'moved from Uniontown, Md\., to Taneytown, where a halt of three hours was made', 'Morning of July 1 the artillery brigade moved from Uniontown to Taneytown, halted three hours',
          when_printed='On the morning of July 1', date='1863-07-01', approx=True, place_printed='Taneytown', note='The brigade comprised Light Company I 1st US (Woodruff), A 4th US (Cushing), A 1st RI (Arnold), B 1st RI (Brown), B 1st NY (Rorty).'),
    claim(A, 'arrival_road', HZ, r'went into position 3 miles southeast of Gettysburg, on the Taneytown road', 'At 2 p. m. the brigade moved toward Gettysburg to support the First Corps; at 11 p. m. went into position 3 miles southeast of Gettysburg on the Taneytown road, facing Gettysburg',
          when_printed='at 11 p. m', date='1863-07-01', t_iso='1863-07-01T23:00', place_printed='3 miles southeast of Gettysburg', road='Taneytown road', gz='GZ-042', label='haz_11pm', conflicts=['label:brk_930'],
          note='Departure from Taneytown 2 p. m. (same passage); Hancock R076 gives the corps leaving Taneytown 1.30 p. m. The 11 p. m. arrival of the artillery brigade is the road-and-time claim for the Second Corps guns.'),
    claim(A, 'position', HZ, r'took position in the following order, as shown in diagram', 'July 2 at daylight the brigade moved toward Gettysburg and, on the establishment of the corps battle line to the left of the Taneytown road, took position (right to left): Light Company I in a grove; 150 yards to the left Batteries A 1st RI and A 4th US; on their left B 1st RI; to the extreme left, operating with the First Division, B 1st NY',
          when_printed='at daylight on July 2', date='1863-07-02', approx=True, place_printed='to the left of the Taneytown road', road='Taneytown road', gz='GZ-042'),
    claim(A + '-1usi', 'position', HZ, r'Oh the right, in a grove', 'Light Company I, 1st US (six light 12-pounders, Woodruff) on the right of the artillery line in a grove',
          when_printed='at daylight on July 2', date='1863-07-02', approx=True, place_printed='in a grove', ocr=True),
    claim(A + '-1nyb', 'position', HZ, r'to the extreme left, an\^ operating with the First Division', 'Battery B, 1st NY (four 10-pounder Parrotts, Rorty) on the extreme left, operating with the First Division of the corps',
          when_printed='at daylight on July 2', date='1863-07-02', approx=True, place_printed='the extreme left', ocr=True),
    claim(A, 'engagement', HZ, r'About 4 p\. m\. the Third Corps advanced to the Emmitsburg road', 'About 4 p. m. the Third Corps advanced to the Emmitsburg road and, repulsed, the enemy opened on the artillery brigade line; a vigorous fire was returned; at 6 p. m. the enemy advanced in force and the two left batteries (B 1st NY, B 1st RI) conformed to the infantry movement, being pushed back several hundred yards and then firing from the crest',
          when_printed='About 4 p. m.', date='1863-07-02', t_iso='1863-07-02T16:00', approx=True, place_printed='the Emmitsburg road', road='Emmitsburg road', gz='GZ-041', conflicts=['label:hanc_3pm', 'label:hal_430']),
    claim(A + '-1rib', 'engagement', HZ, r'This battery was exposed to a most severe infantry fire', 'Battery B, 1st RI (Brown) was exposed to a most severe infantry fire in a position to the front of the corps line on the afternoon of July 2; 24 horses killed; two guns sent to the rear; Brown wounded; command to Lt. Perrin',
          date='1863-07-02', approx=True, place_printed='a most severe infantry fire'),
    claim(A, 'engagement', HZ, r'The morning of July 3 was quiet until about 8 o\'clock', 'Morning of July 3 quiet until about 8 o\'clock, when the enemy opened on the position exploding three limbers of Battery A, 4th US; Light Company I fought eight separate engagements in the forenoon',
          when_printed='until about 8 o\'clock', date='1863-07-03', t_iso='1863-07-03T08:00', approx=True, place_printed='our position'),
    claim(A, 'engagement', HZ, r'At 1 p\. m\. the artillery of the enemy opened along the whole line', 'At 1 p. m. July 3 the enemy artillery opened along the whole line, for an hour and a quarter a very warm fire; the batteries returned fire later until their ammunition except canister was expended; Cushing and Milne fell; Cushing\'s and Arnold\'s batteries were taken away; Woodruff remained in the grove and fired',
          when_printed='At 1 p. m.', date='1863-07-03', t_iso='1863-07-03T13:00', place_printed='the whole line', label='haz_1pm', conflicts=['label:hanc_1pm'] + JULY3_OTHERS,
          note='"for an hour and a quarter" is the duration for which the brigade was under warm fire; Hancock has one hour and forty-five minutes.'),
    claim(A + '-1usi', 'position', HZ, r'Woodruff still remained in the grove', 'Woodruff (Light Company I, 1st US) still remained in the grove and fired into the rebel lines when Cushing\'s and Arnold\'s batteries had been withdrawn; Woodruff fell mortally wounded at the moment of victory',
          date='1863-07-03', approx=True, place_printed='in the grove'),
    claim(A + '-4usa', 'engagement', HZ, r'Gushing was killed', 'Lieut. Cushing (A, 4th US) killed on July 3; the battery was exhausted and taken away; Milne fell mortally wounded; Arnold withdrew the battery of A 4th US',
          date='1863-07-03', approx=True, place_printed='their battery was exhausted', ocr=True, note='"Gushing" is OCR for Cushing.'),
    claim(A + '-1nyb', 'engagement', HZ, r'Battery B, First New York Artillery, was entirely exhausted', 'Battery B, 1st NY exhausted, ammunition expended, horses and men killed or disabled; Capt. Rorty killed (assumed command only July 2), senior Lt. Sheldon wounded (July 3)',
          when_printed='At 1 p. m.', date='1863-07-03', approx=True, place_printed='its ammunition expended'),
    claim(A, 'strength_note', HZ, r'one-third were\s+either killed or wounded', 'Of the officers and men of the brigade one-third were killed or wounded; so great was the loss that Light Company I, A 4th US, A and B 1st RI were consolidated, reducing five batteries to three',
          date='1863-07-03', place_printed='the brigade', support=True),
    gap(A + '-1ria', 'engagement', ['or27_find "Arnold.{0,80}First Rhode Island" Part 1 within the Hazard and Hancock reports', 'index authors named Arnold/Brown/Cushing/Woodruff/Rorty in the Second Corps range R076-R132', 'or27_find "Battery A, First Rhode Island" Part 1'],
        'No own report by the battery commanders of the Second Corps Artillery Brigade (Arnold, Brown, Cushing, Woodruff, Rorty) is in the index; positions and actions come only from Hazard R132, Hancock R076, Gibbon R098, Webb R104, Hall R109.',
        reports=['OR27-1-R132', 'OR27-1-R076', 'OR27-1-R098', 'OR27-1-R104'], activity='No battery-level report for the Second Corps batteries'),
]
