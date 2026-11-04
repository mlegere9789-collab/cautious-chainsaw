# V Corps 2nd Division (Ayres: Day, Burbank, Weed/Garrard), 3rd Division (Crawford: McCandless, Fisher), Artillery Brigade (Martin).
# OR27 pt.1 R203-R222.
J1, J2, J3, J4, J5 = '1863-07-01', '1863-07-02', '1863-07-03', '1863-07-04', '1863-07-05'
S = []
a = S.append

# ------------------------------------------------------------- 2nd Division (Ayres) R203
D2 = 'us-5c-2d'
a(C(D2, 'march', 'R203', 'The 28th of June found the division camped near Frederick, Md.', 'June 28', '1863-06-28',
    place='near Frederick, Md.', act='division camped near Frederick'))
a(C(D2, 'march', 'R203', 'On the 29th of June, marched 14 miles, and bivouacked near Liberty, Md.', 'June 29', '1863-06-29',
    place='near Liberty, Md.', act='marched 14 miles and bivouacked near Liberty'))
a(C(D2, 'march', 'R203', 'The division left Liberty June 30; marched 23 miles.', 'June 30', '1863-06-30',
    place='Liberty', act='left Liberty, marched 23 miles (Union Mills per the corps itinerary)', note='Destination not named in this passage; the corps itinerary (Sykes) names Union Mills for June 30'))
a(C(D2, 'march', 'R203', 'Left bivouac; marched 18 miles, and bivouacked 13 p. m. at', 'July 1', J1,
    place=None, ocr=True, act='left bivouac July 1, marched 18 miles and bivouacked at "13 p. m." (garbled; place name lost in the OCR)', note='OCR: place name missing after "at"; "13 p. m." is not a readable clock time. Not used for t_iso.'))
a(C(D2, 'arrival_road', 'R203', 'on the night of July 1 and 2 on the Gettysburg and Hanover road', 'night of July 1-2', J2,
    place='the Gettysburg and Hanover road', road='Hanover road (Gettysburg and Hanover road)', gz='GZ-043',
    act='division marched forward on the night of July 1-2 on the Gettysburg and Hanover road and formed line of battle in rear of and facing that road',
    note='Road named by the division commander; the same passage places the First Division on the right of the Second', ocr=True))
a(C(D2, 'position', 'R203', 'in rear of and facing that road, the First Division on its right', 'morning of July 2', J2,
    place='in rear of and facing the Gettysburg and Hanover road', road='Hanover road (Gettysburg and Hanover road)', gz='GZ-043',
    act='division formed in line of battle in rear of and facing the road, the First Division on its right', ocr=True))
a(C(D2, 'movement', 'R203', 'it was marched to the left and center, and massed there.', 'later in the day (July 2)', J2,
    place='the left and center', act='division marched to the left and centre and massed there'))
a(C(D2, 'position', 'R203', 'upon a rocky hill (usually called Round Top hill) of great importance', 'afternoon of July 2', J2,
    place='a rocky hill (usually called Round Top hill)', gz='GZ-009', act='the Third Brigade (Weed) placed on the general line upon Round Top hill facing the Emmitsburg and Gettysburg pike, ordered to hold it',
    ocr=True, note='Ayres\' "Round Top hill" here is the rocky hill held by Weed\'s brigade and Hazlett\'s battery, i.e. what the modern map calls Little Round Top (gazetteer GZ-009); the OR uses "Round Top" for both hills (Hancock, Rice, Garrard). Not resolved here.'))
a(C(D2, 'position', 'R203', 'The First and Second Brigades were placed on the general line', 'afternoon of July 2', J2,
    place='on the general line, to the right of the Third Brigade', act='Day\'s and Burbank\'s brigades placed on the general line to the right of the Third; shortly afterwards ordered to advance and carry a wooded rocky point about 350 yards in front'))
a(C(D2, 'engagement', 'R203', 'forming on the left of a division of the Second Corps', 'late afternoon, July 2', J2,
    place='woods about 350 yards in advance, across swampy ground', act='the First Brigade in rear of and supporting the Second advanced across the swampy ground on the left of a division of the II Corps (Caldwell)'))
a(C(D2, 'movement', 'R203', 'form on the general line of battle on the right of the Third Brigade', 'when the troops on his right gave way (July 2)', J2,
    place='the general line of battle on the right of the Third Brigade (Round Top hill)', gz='GZ-009', act='First and Second Brigades faced about and withdrew to the right and rear of the Third Brigade'))
a(C(D2, 'night_position', 'R203', 'these two brigades were massed in the woods, in rear of the Third', 'night of July 2', J2,
    place='in the woods, in rear of the Third Brigade', act='First and Second Brigades massed in the woods in rear of Weed\'s Third Brigade; division stayed there until the march on July 5'))
a(C(D2, 'departure', 'R203', 'marching 6 miles, camped on Marsh Creek', 'On the 5th of July', J5,
    place='Marsh Creek', act='division left its line of battle at Gettysburg on July 5, marched 6 miles and camped on Marsh Creek',
    note='Sheridan (3rd US) puts the 5 p.m. march about 5 miles on the Emmitsburg road; Clark (20th Maine, other division) bivouacked near Marsh Creek at midnight'))

# ---------------------------------------------------------------- 1st Brigade (Day)
BD = 'us-5c-2d-day'
a(C(BD, 'movement', 'R208', 'was moved to the front about 5 p. m. on the 2d instant', 'about 5 p. m.', J2, t='17:00', approx=True,
    place='the foot of a hill near our extreme left, in rear of a marsh', act='First Brigade, Second Division moved to the front; took position at the foot of a hill, then advanced through the marsh and formed three lines under the wood (12th US in rear)',
    key='V_day_5pm', conflicts=['V_sykes_3pm'], note='Quote from Capt. Dunn (12th US). Other regimental dates: Giddings (14th US) 4 p.m.; Bootes (6th US) about 4.30'))
a(C(BD, 'night_position', 'R208', 'moved to the left into the wood in rear of Lieutenant Hazlett\'s battery', 'About 8 p. m.', J2, t='20:00', approx=True,
    place='the wood in rear of Lieutenant Hazlett\'s battery', act='about 8 p.m. the 12th US moved to the left into the wood in rear of Hazlett\'s battery; stayed through the 2d and 3d'))
a(C(BD, 'movement', 'R204', 'commanding skirmishers on the reconnaissance of July 4', 'July 4', J4,
    place='forward of the line (the reconnaissance)', act='Day\'s brigade made a reconnaissance on July 4 with Capt. Thatcher (14th US) commanding the skirmishers',
    note='Day\'s own report is only a covering note on casualties, forwarded by Ayres as a substitute for a brigade report'))
a(C(BD, 'engagement', 'R204', 'My horse was killed in the affair of July 3.', 'July 3', J3,
    place=None, act='Colonel Day\'s horse killed in "the affair of July 3" (postscript)', note='No place or hour; whether it was a sharpshooter or shell event is not stated'))
# 3rd US
a(C('us-5c-2d-day-3us', 'march', 'R205', 'left at 6 p. m. same day, and marched in the direction of Gettysburg', 'July 1, 6 p. m.', J1, t='18:00',
    place='Hanover, Pa. -> toward Gettysburg, bivouacked on the road', act='3rd US reached camp near Hanover, left at 6 p.m. and marched toward Gettysburg, bivouacked on the road',
    key='V_3us_left6', conflicts=['V_rice_hanover_left5', 'V_sykes_bonaughtown'], note='Left Hanover at 5 p.m. (Rice), 6 p.m. (Sheridan), 7 p.m. (Sykes): three V Corps reports, three hours'))
a(C('us-5c-2d-day-3us', 'engagement', 'R205', 'was engaged with the enemy until 8 p. m.', 'until 8 p. m.', J2, t='20:00',
    place='near Gettysburg, in line of battle', act='3rd US in line of battle, engaged until 8 p.m. on July 2', ocr=True, note='OCR "formed m Ime of battle" in the same sentence'))
a(C('us-5c-2d-day-3us', 'position', 'R205', 'The regiment formed in line of battle, and remained so during July 3.', 'July 3', J3,
    place=None, act='3rd US remained in line of battle on July 3'))
a(C('us-5c-2d-day-3us', 'departure', 'R205', 'At 5 p. m. marched about 5 miles on the Emmitsburg road and encamped.', 'July 5, 5 p. m.', J5, t='17:00',
    place='the Emmitsburg road', gz='GZ-041', road='Emmitsburg Road', act='relieved from picket; marched at 5 p.m. about 5 miles on the Emmitsburg road and encamped',
    key='V_dep_3us', conflicts=['V_dep_morning5']))
# 4th US
a(C('us-5c-2d-day-4us', 'night_position', 'R206', 'passed on the Hanover and Gettysburg road, 5 miles east of the latter place', 'night of July 1', J2,
    place='the Hanover and Gettysburg road, 5 miles east of Gettysburg', road='Hanover road (Hanover and Gettysburg road)', gz='GZ-043',
    act='the 4th US spent the night of July 1 on the road 5 miles east of Gettysburg', key='V_4us_5mi', conflicts=['V_barnes_halt2mi', 'V_rice_halt3mi', 'V_sweitzer_halt45']))
a(C('us-5c-2d-day-4us', 'march', 'R206', 'we broke camp at 4 o\'clock, and marched 3 miles in a westerly direction', 'morning of July 2 (OCR "July 3"), 4 o\'clock', J2, t='04:00', ocr=True,
    place='3 miles westward, line of battle parallel to the road and about half a mile to the right of it', act='broke camp 4 a.m., marched 3 miles west and formed line parallel to the road'))
a(C('us-5c-2d-day-4us', 'position', 'R206', 'Leaving the city on our right, we halted at about 1 p. m.', 'about 1 p. m.', J2, t='13:00', approx=True,
    place='about 2 miles from the first line of battle, leaving the town on the right', act='regiment moved toward Gettysburg leaving the town on its right, halted about 1 p.m. and lay on its arms until 4 p.m.'))
a(C('us-5c-2d-day-4us', 'movement', 'R206', 'We lay on our arms here until 4 p. m.', 'until 4 p. m.', J2, t='16:00',
    place='moving to the front down a road to a position below the crest of a slight eminence between the two ranges of hills', act='moved to the front at 4 p.m. into line of battle below the crest of a slight eminence; after about half an hour ordered to fall back as troops on the right retired',
    key='V_4us_4pm', conflicts=['V_day_5pm', 'V_sykes_3pm']))
a(C('us-5c-2d-day-4us', 'night_position', 'R206', 'and then changed our position to one about 300 yards to the left', 'After 7 p. m.', J2, t='19:00', approx=True,
    place='about 300 yards to the left of the line of battle at the edge of the woods', act='after remaining in the edge of the woods until 7 p.m., moved about 300 yards left and encamped for the night; stayed there all of July 3'))
a(C('us-5c-2d-day-4us', 'movement', 'R206', 'until 10 a. m. on July 4, when we were ordered on a reconnaissance', 'until 10 a. m. on July 4', J4, t='10:00',
    place='1 1/2 miles beyond camp (OCR "1-J-")', ocr=True, act='reconnaissance in line of battle supporting skirmishers, then back; at 3 p.m. relieved the Third Division on picket'))
a(C('us-5c-2d-day-4us', 'departure', 'R206', 'we took up our line of march for Emmitsburg, Md.', 'until 5 p. m. on July 5', J5, t='17:00',
    place='Emmitsburg, Md.', road='Emmitsburg road', act='left the picket line at 5 p.m. on July 5 on the march to Emmitsburg', key='V_dep_4us', conflicts=['V_dep_morning5']))
# 6th US
a(C('us-5c-2d-day-6us', 'march', 'R207', 'left its bivouac about 4.30 o\'clock on the morning of the 3d', 'about 4.30 o\'clock on the morning of the 3d [sic, July 2]', J2, t='04:30', approx=True, ocr=True,
    place='to a wood in front of the enemy', act='6th US left bivouac about 4.30 a.m., marched to a wood in front of the enemy and lay in line a considerable time',
    note='The OCR date "3d" is taken as July 2: the report describes the first day of engagement and the brigade moved to the front the afternoon of July 2 (Dunn, Giddings)'))
a(C('us-5c-2d-day-6us', 'position', 'R207', 'About 4.30 o\'clock I received an order to march the regiment', 'About 4.30 o\'clock [p. m.]', J2, t='16:30', approx=True,
    place='the extreme left of the line of battle formed by the whole brigade', act='6th US moved by the left flank to the front near the pickets; its position was the extreme left of the brigade line of battle; then advanced through a small valley to high ground under fire',
    note='The report prints no a. m./p. m.; read as afternoon from the sequence (the regiment had lain in the wood "for a considerable time" after the morning march). Compare Dunn 5 p.m., Giddings 4 p.m.'))
# 12th US
a(C('us-5c-2d-day-12us', 'engagement', 'R208', 'I received from General Ayres, commanding division, the order to face', 'during the withdrawal, July 2', J2,
    place='from the hill under the wood back across the marsh to the position first occupied', act='12th US withdrew in quick time then double-quick to a stone wall about midway in the valley, then to the brow of the hill'))
a(C('us-5c-2d-day-12us', 'position', 'R208', 'The regiment remained in this position during the 2d and 3d instant.', 'July 2-3', J3,
    place='the wood in rear of Hazlett\'s battery', act='the 12th US stayed in the wood behind Hazlett\'s battery July 2 and 3'))
# 14th US
a(C('us-5c-2d-day-14us', 'march', 'R210', 'The regiment moved from bivouac in the road at 4 a. m.', '4 a. m.', J2, t='04:00',
    place='bivouac in the road; forward to a small piece of woods', act='14th US left its bivouac in the road at 4 a.m. and rested in a small piece of woods'))
a(C('us-5c-2d-day-14us', 'movement', 'R210', 'where it rested until 4 p. m., when it was ordered to the front', 'until 4 p. m.', J2, t='16:00',
    place='to the front as a support to the Second Brigade, crest of a small hill', act='14th US ordered to the front at 4 p.m. as support to the (regular) Second Brigade, lay down on a crest under fire about twenty minutes, fell back and bivouacked to the left',
    key='V_14us_4pm', conflicts=['V_day_5pm']))
a(C('us-5c-2d-day-14us', 'position', 'R210', 'we lay under a heavy artillery fire, with orders to hold ourselves in readiness', 'The next day, July 3', J3,
    place='our left', act='14th US under artillery fire on July 3, held in readiness to repel an expected attack on the left; not engaged'))
a(C('us-5c-2d-day-14us', 'departure', 'R210', 'ordered to withdraw the pickets and join the brigade on the march', 'At 4 p. m. of July 5', J5, t='16:00',
    place=None, act='14th US withdrew its pickets and joined the brigade on the march at 4 p.m. on July 5', key='V_dep_14us', conflicts=['V_dep_4us']))

# ---------------------------------------------------------------- 2nd Brigade (Burbank) R211
BB = 'us-5c-2d-burbank'
a(C(BB, 'arrival_road', 'R211', 'near Gettysburg, Pa. , on the morning of July 2', 'on the morning of July 2', J2,
    place='in the vicinity of the enemy, near Gettysburg', act='brigade arrived in the vicinity of the enemy after a series of long rapid marches'))
a(C(BB, 'position', 'R211', 'its left resting on the right of the Twelfth Army Corps', 'morning of July 2', J2,
    place='right of the Twelfth Army Corps (a thick woods, skirmishers in front)', act='brigade formed in line, left on the right of the XII Corps; advanced slowly through thick woods and halted at the edge for an hour or more, skirmishers feeling for the enemy; ordered back to a new position'))
a(C(BB, 'movement', 'R211', 'continued its march to the left for some 2 miles', 'July 2, forenoon', J2,
    place='the left, some 2 miles', act='instead of a new position the brigade marched left about 2 miles and halted; remained until about 5 p.m.'))
a(C(BB, 'movement', 'R211', 'There it remained until about 5 p. m.', 'until about 5 p. m.', J2, t='17:00', approx=True,
    place='the halt 2 miles left', act='at about 5 p.m. under heavy cannonading ordered forward; moved left, then at double-quick on a staff officer\'s direction',
    key='V_burbank_5pm', conflicts=['V_sykes_3pm', 'V_day_5pm']))
a(C(BB, 'position', 'R211', 'the left resting on a battery then in position', 'upon arrival at the field (about 5.30 p. m.)', J2, approx=True,
    place='left on a battery in position, right extending back into the woods; then right a short distance; left side of a rough rocky hill', act='brigade deployed into line; moved left to occupy ground supposed to have been left by the Third Brigade (Weed), found it still occupied, moved right a short distance',
    gz='GZ-009', note='Hancock (7th US) gives the formation at "Rock Hill [Round Top]" at about 5.30 p.m.'))
a(C(BB, 'engagement', 'R211', 'ascended to the crest of the hill on the opposite side', 'July 2 evening, before dark', J2,
    place='across a wide marsh to the crest of the hill opposite, then to a fence and stone wall at the edge of the woods', gz='GZ-013',
    act='brigade crossed the marsh at double-quick, took the crest opposite, advanced to the stone wall, relieved a II Corps regiment, was outflanked on the right and withdrawn through a wheat-field under fire',
    note='Quote is the end of "across this marsh at double-quick, and ascended to the crest of the hill on the opposite side"; check wording against page'))
a(C(BB, 'night_position', 'R211', 'It had now become nearly dark, and the brigade was reformed', 'nearly dark, July 2', J2,
    place='in rear of the battery and near the ground of its first deployment', act='brigade reformed in rear of the battery near its first deployment; not engaged again at Gettysburg'))
a(C(BB, 'strength_note', 'R211', 'the whole brigade went into action with less than 900 muskets', 'July 2', J2, place=None,
    act='fewer than 900 muskets in action; of 80 officers, 40 killed or wounded', note='A declared basis: brigade commander\'s count of muskets, July 2'))
# regiments of Burbank
a(C('us-5c-2d-burbank-2us', 'march', 'R212', 'About 3.30 a. m. the regiment marched from its place of bivouac', 'About 3.30 a. m.', J2, t='03:30', approx=True,
    place='its place of bivouac, 5 miles from Gettysburg', act='2nd US marched from a bivouac 5 miles from Gettysburg and took position about 1 1/2 miles southeast of the town',
    key='V_2us_330', conflicts=['V_arr_barnes7', 'V_arr_chamb7', 'V_arr_sykes8'], note='Compare Sykes: the corps reached the field about 8 a.m.'))
a(C('us-5c-2d-burbank-2us', 'position', 'R212', 'took position near Gettysburg, about 1^ miles southeast of the town', 'July 2, early morning', J2, ocr=True,
    place='about 1^ [sic, a fraction] miles southeast of the town', act='20 men thrown forward as skirmishers into a body of woods; skirmish for nearly two hours'))
a(C('us-5c-2d-burbank-2us', 'movement', 'R212', 'marched by a flank movement to the left and rear some 2 miles', 'after nearly two hours of skirmishing (July 2)', J2,
    place='left and rear some 2 miles, where the command rested until about 5 p. m.', act='moved left and rear some 2 miles and rested until about 5 p.m., then by the right flank toward the cannonading on the left'))
a(C('us-5c-2d-burbank-7us', 'position', 'R213', 'The regiment formed in line of battle on Rock Hill [Round Top]', 'at about 5.30 p. m.', J2, t='17:30', approx=True,
    place='Rock Hill [Round Top], immediately in front of the enemy', gz='GZ-009', act='7th US formed in line, advanced against the enemy down the hill and across an open field, sheltered by a stone fence, then wheeled left into woods and retired under fire',
    key='V_7us_530', conflicts=['V_burbank_5pm']))
a(C('us-5c-2d-burbank-7us', 'strength_note', 'R213', '116 officers and men went into the engagement', 'July 2', J2, place=None, act='116 officers and men engaged; half became casualties'))
a(C('us-5c-2d-burbank-10us', 'movement', 'R214', 'arrived in the vicinity of Gettysburg on the morning of the 2d instant', 'morning of July 2', J2,
    place='the right of our lines; then to the left, nearly opposite the center, then in the afternoon to the left', act='10th US arrived on the right; part detailed as skirmishers; moved left at double-quick to nearly opposite the centre and lay over until afternoon, then moved left to form line of battle'))
a(C('us-5c-2d-burbank-10us', 'strength_note', 'R214', 'numbering 10 commissioned officers and 83 enlisted men', 'July 2', J2, place=None, act='10th US numbered 10 officers and 83 enlisted men'))
a(C('us-5c-2d-burbank-11us', 'movement', 'R215', 'we moved about 5 p. m. from our resting place', 'about 5 p. m.', J2, t='17:00', approx=True,
    place='from "our resting place, nearly opposite the center of the army" to near the Sugar Loaf or Round Top Mountain, a point near the left of the line', gz='GZ-009',
    act='11th US moved with the other battalions to near Round Top, advanced in line across an open field with a heavy morass, halted before a piece of woods, relieved II Corps troops in the woods, fell back under crossfire'))
a(C('us-5c-2d-burbank-11us', 'strength_note', 'R215', 'Out of 361 enlisted men and 25 officers', 'July 2', J2, place=None, act='361 enlisted men and 25 officers engaged; lost 106 enlisted and 10 officers'))
a(C('us-5c-2d-burbank-17us', 'engagement', 'R216', 'went into pction at 6 p. m.', 'at 6 p. m.', J2, t='18:00', ocr=True,
    place='left of the brigade line', act='17th US formed the left of the brigade line and went into action at 6 p.m., engaged about two hours', note='OCR "pction" for action',
    key='V_17us_6pm', conflicts=['V_burbank_5pm', 'V_7us_530']))
a(C('us-5c-2d-burbank-17us', 'strength_note', 'R216', 'numbering 25 officers and 235 enlisted men', 'July 2', J2, place=None, act='17th US numbered 25 officers and 235 enlisted men'))

# ---------------------------------------------------------------- 3rd Brigade (Weed -> Garrard) R217
BW = 'us-5c-2d-weed'
a(C(BW, 'position', 'R217', 'remained idle, lying by their arms until about 4 p. m.', 'until about 4 p. m.', J2, t='16:00', approx=True,
    place=None, act='after changing position several times in the early morning, the brigade lay with the division until about 4 p.m.',
    key='V_garrard_4pm', conflicts=['V_sykes_3pm', 'V_burbank_5pm', 'V_wood_230']))
a(C(BW, 'movement', 'R217', 'At this time the brigade was moved rapidly forward', 'about 4 p. m.', J2, t='16:00', approx=True,
    place='forward nearly 1 mile (OCR "1^") to musketry range', ocr=True, act='the brigade moved rapidly, mostly at double-quick, until under the enemy\'s musketry'))
a(C(BW, 'position', 'R217', 'was led to the left, up on what is known as Round Top ridge', 'about 4 p. m.', J2, approx=True,
    place='Round Top ridge (the rocky ridge: the Little Round Top summit)', gz='GZ-009', act='the leading regiment (140th NY) under Gen. Warren was led to the left up Round Top ridge; Hazlett\'s battery ascended behind it and went into battery on the summit',
    note='Garrard writes that the 140th NY was "the leading regiment"'))
a(C('us-5c-2d-weed-140ny', 'engagement', 'R217', 'closely engaged with the enemy at short musket-range on the left slope', 'about 4-4.30 p. m.', J2, approx=True,
    place='the left slope of Round Top ridge', gz='GZ-009', act='140th NY (Col. O\'Rorke) formed in line on the left slope of the ridge and engaged at short musket range; O\'Rorke mortally wounded'))
a(C('us-5c-2d-weed-146ny', 'movement', 'R217', 'were led to the right and front some distance, and formed in line', 'about 4 p. m.', J2, approx=True,
    place='the right and front, a narrow valley, to support a portion of the Third Corps and Watson\'s battery', act='146th NY, 91st PA, 155th PA were first led to the right and front into a narrow valley; then ordered back at double-quick to Round Top ridge',
    note='the passage names the 146th NY and the 91st and 155th PA'))
a(C('us-5c-2d-weed-91pa', 'position', 'R217', 'The Ninety-first was posted on the left of the battery', 'after returning to the ridge (July 2)', J2,
    place='left of the battery on the summit, connecting with the 140th NY', gz='GZ-009', act='91st PA posted on the left of Hazlett\'s battery'))
a(C('us-5c-2d-weed-155pa', 'position', 'R217', 'forty-sixth and One hundred and fifty-fifth were posted on the right', 'after returning to the ridge (July 2)', J2,
    place='on the right, extending from the battery on the summit along the crest to the gorge on the right', gz='GZ-009', act='146th NY and 155th PA posted to the right of the battery along the crest, to the gorge'))
a(C(BW, 'night_position', 'R217', 'At night this ridge, naturally strong, was strengthened by building a stone wall', 'night of July 2', J2,
    place='about half way down the slope of Round Top ridge', gz='GZ-009', act='works built on screen at night July 2: a stone wall about half way down the slope wherever the rocks offered no protection',
    note='Evidence for a night-of-July-2 building window of a stone wall on the slope of Little Round Top (Weed\'s brigade). The wall site is "about half way down the slope"; no coordinates in the OR.'))
a(C(BW, 'position', 'R217', 'The next day the brigade remained in the same position', 'July 3', J3, place='Round Top ridge', gz='GZ-009', act='brigade stayed on the ridge, shelled and sharpshot, not engaged to any extent'))

# ---------------------------------------------------------------- 3rd Division (Crawford) R218
D3 = 'us-5c-3d'
a(C(D3, 'night_position', 'R218', 'having marched nearly all the previous night', 'night of July 1-2', J2,
    place='near McSherrystown (OCR "Mc- Sherrystown")', act='division rested near McSherrystown at daylight on July 2 after marching nearly all the previous night', ocr=True,
    note='Quote is the end of the first sentence; place phrase "near Mc- Sherrystown" is printed earlier in the sentence'))
a(C(D3, 'arrival_road', 'R218', 'by noon had arrived at the position occupied by the First and Second Divisions', 'by noon', J2, t='12:00', approx=True,
    place='the position of the First and Second Divisions, near the Gettysburg and Hanover turnpike', road='Hanover road (Gettysburg and Hanover turnpike)', gz='GZ-043',
    act='Crawford\'s division marched toward Gettysburg on a corps order received at daylight, arriving by noon at the First and Second Divisions\' position near the turnpike',
    key='V_crawford_noon', conflicts=['V_mccandless_1pm']))
a(C(D3, 'movement', 'R218', 'At 2 o\'clock an order reached me to form my command at once', 'At 2 o\'clock', J2, t='14:00',
    place='toward the left flank of our line', act='order to form at once and proceed toward the left flank; the First Division, which it was to follow, took a different road; guided by Capt. Moore (staff of the army commander) the division reached the field and reported to Sykes',
    key='V_crawford_2pm', conflicts=['V_sykes_3pm']))
a(C(D3, 'position', 'R218', 'to mass my troops upon the right or a road running through our line', 'on reporting to Sykes (July 2 afternoon)', J2,
    place='the right of a road running through our line near the left flank, down a rocky slope to a wheat-field', gz='GZ-013',
    act='Crawford ordered to mass on the right of the road near the left flank; a second order sent him across the road to the slope of the rocky ridge opposite the woods, to cover the troops in front'))
a(C(D3, 'movement', 'R218', 'The Third Brigade, under Col. J. W. Fisher, was detailed', 'afternoon of July 2', J2,
    place='the left of Barnes\' division on the crest of the ridge', gz='GZ-009', act='Fisher\'s Third Brigade detached to the crest of the ridge on the left of Barnes\' division'))
a(C(D3, 'engagement', 'R218', 'My command was formed in two lines, the second massed on the first.', 'late afternoon, July 2', J2,
    place='the slope of the rocky ridge above the marshy ground and stone wall', act='first line 6th PA Res. (right), 1st PA Res. (left), 11th PA Res. (centre); second line the Bucktails (13th) and 2nd; McCandless commanded; counter-charge down the slope to the stone wall',
    key='V_crawford_lines'))
a(C(D3, 'night_position', 'R218', 'to hold the line of the stone wall and the woods on the right', 'as night approached (July 2)', J2,
    place='the stone wall and the woods on the right', act='McCandless\' brigade held the stone wall line with skirmishers thrown out'))
a(C(D3, 'night_position', 'R218', 'During the night the division commanded by Brigadier-General Bartlett, of the Sixth Corps', 'night of July 2', J2,
    place=None, act='Bartlett\'s VI Corps brigade (called a division) moved up to support Crawford during the night', note='Bartlett was a brigade commander of the VI Corps First Division. The V Corps reports call his command a "division"; see scope C VI Corps claims for where it came from.'))
a(C(D3, 'movement', 'R218', 'At 5 o\'clock on the 3d, I received orders from General Sykes', 'At 5 o\'clock on the 3d', J3,
    place='the stone wall and the woods in front', act='orders to advance and enter the woods to the front; McCandless\' brigade with the 11th Regiment charged across the wheat-field and woods, routed Anderson\'s Georgia brigade and Robertson\'s Texans',
    note='a. m./p. m. not printed. McCandless: "On the evening of the 3d". The report mentions a battery established by the enemy at noon, which places the order after noon; no t_iso set.'))
a(C(D3, 'departure', 'R218', 'had been on incessant duty for fortyeight hours', 'On the 4th', J4,
    place='to the rear', act='arms collected on the 4th and the brigade withdrawn to the rear after forty-eight hours of incessant duty'))

# 1st Brigade (McCandless) R219
BM = 'us-5c-3d-mccandless'
a(C(BM, 'arrival_road', 'R219', 'the command arrived on the field about 1 p. m. of the 3d instant', 'about 1 p. m.', J2, t='13:00', approx=True, ocr=True,
    place='the field (near the left)', act='brigade arrived on the field about 1 p.m. (printed "3d instant"; the narrative is of the 2d); at 5 p.m. assigned a position near the left',
    key='V_mccandless_1pm', conflicts=['V_crawford_noon'], note='OCR/print "3d" for July 2: McCandless\' next sentence is the attack of that evening and Crawford dates the same movement to the 2d'))
a(C(BM, 'position', 'R219', 'at 5 p. m. was assigned a position near the left', 'at 5 p. m.', J2, t='17:00',
    place='near the left: a rocky, wooded hillside sloping to a plain extending about 700 yards to a stone wall', act='brigade assigned a position at the left; naturally strong ground',
    key='V_mccandless_5pm', conflicts=['V_crawford_2pm']))
a(C(BM, 'engagement', 'R219', 'together with the Eleventh Regiment of the Third Brigade, in two lines', 'after the front gave way (July 2)', J2,
    place='the hillside and plain down to the stone wall', act='brigade with the 11th PA Res. formed in two lines and charged down the hillside and across the plain to the stone wall'))
a(C(BM, 'night_position', 'R219', 'I remained in this position up to 0 p. m. of the 3d instant', 'up to 0 [6?] p. m. of the 3d', J3, ocr=True,
    place='the line along the stone wall', act='brigade held the stone wall with skirmishers in front and flankers right and left until the evening of the 3d', note='OCR "0 p. m." is not read as a clock time'))
a(C(BM, 'engagement', 'R219', 'I was ordered to advance and clear the woods on my front and left', 'On the evening of the 3d', J3,
    place='the woods in front and left across an open field about 800 yards wide', gz='GZ-013', act='brigade advanced across the open field and cleared the woods, capturing nearly 300 prisoners and a stand of colours'))
a(C(BM, 'departure', 'R219', 'About noon of the 4th instant, I was relieved by fresh troops', 'About noon of the 4th', J4, t='12:00', approx=True,
    place='former position at the stone wall', act='relieved about noon on July 4 by fresh troops and moved back to the former position at the stone wall'))
a(C('us-5c-3d-mccandless-6pareserves', 'engagement', 'R219', 'I pushed the Sixth Regiment through the woods on the right', 'evening of July 3', J3,
    place='the woods on the right', act='6th PA Reserves pushed through the woods on the right, drove out the skirmishers and annoyed the battery'))
a(C('us-5c-3d-mccandless-13pareserves', 'engagement', 'R219', 'viz, the First Rifles and Second Regiment, to the left', 'July 2 evening', J2,
    place='to the left, prolonging the first line', act='the second line (First Rifles = Bucktails, i.e. 13th PA Reserves, and the 2nd PA Reserves) deployed to the left; Col. Taylor of the Bucktails fell',
    note='"First Rifles (Bucktails)" is identified with 13th PA Reserves (units.json id mccandless-13pareserves) from the order of battle; the report does not give the number'))
a(C('us-5c-3d-mccandless-2pareserves', 'engagement', 'R219', 'viz, the First Rifles and Second Regiment, to the left', 'July 2 evening', J2,
    place='to the left, prolonging the first line', act='the 2nd PA Reserves deployed to the left with the First Rifles'))
a(C('us-5c-3d-mccandless-1pareserves', 'position', 'R219', 'the Sixth Regiment on the right, the First on the left', 'July 2 evening', J2,
    place='first line: left', act='first line formation: 6th PA Res. on the right, 1st on the left, 11th in the centre'))
a(C('us-5c-3d-fisher-11pareserves', 'position', 'R218', 'and the Eleventh Regiment, of Fisher\'s brigade, under Colonel Jackson, in the center', 'July 2 late afternoon', J2,
    place='the center of the first line', act='the 11th PA Reserves (Col. Jackson), belonging to Fisher\'s brigade, fought with McCandless\' brigade at the centre of the first line; also in the July 3 advance'))

# 3rd Brigade (Fisher) R220
BF = 'us-5c-3d-fisher'
a(C(BF, 'movement', 'R220', 'marched my brigade to the left of General Sykes\' corps', 'afternoon of July 2', J2,
    place='the extreme left of the Army of the Potomac', act='brigade marched to the left of Sykes\' corps (the extreme left of the army) and engaged the enemy, who soon retired'))
a(C(BF, 'night_position', 'R220', 'and at 10 p. m. ascended the hill', 'at 10 p. m.', J2, t='22:00',
    place='a hill called Round Top, "occupied by a full brigade of the enemy"', gz='GZ-010', act='Fisher took the 5th PA Res. (Dare), the 12th PA Res. (Hardin) and the 20th Maine and went up the hill in line of battle, taking over 30 prisoners',
    key='V_fisher_10pm', conflicts=['V_chamb_9pm'], note='Chamberlain puts his own advance at 9 p.m. and says Fisher\'s regiments came up about midnight; Fisher says 10 p.m. and that the regiments ascended with the 20th Maine'))
a(C(BF, 'position', 'R220', 'at once threw up a stone wall across the entire ravine', 'in the morning (July 3)', J3,
    place='across the ravine between the two hills and up the hill', gz='GZ-010', act='works built on screen on the morning of July 3: stone wall across the ravine between Little and Round Top and up the hill, by the two regiments not on the hill',
    note='"in the morning I discovered ... so I changed my position ... and at once threw up a stone wall". Evidence for a Jul 3 morning building window.'))
a(C('us-5c-3d-fisher-5pareserves', 'night_position', 'R218', 'the Fifth, under Lieutenant-Colonel Dare, and the Twentieth Maine Regiment, under Colonel Chamberlain', 'evening of July 2', J2,
    place='Round Top', gz='GZ-010', act='5th PA Reserves (Dare) detached by Fisher with the 12th and the 20th Maine to take Round Top',
    note='Fisher\'s own report (R220) also names the Fifth and the Twelfth'))
a(C('us-5c-3d-fisher-12pareserves', 'night_position', 'R218', 'He immediately detached the Twelfth Regiment, under Colonel Hardin', 'evening of July 2', J2,
    place='Round Top', gz='GZ-010', act='12th PA Reserves (Hardin) detached with the 5th PA Res. and the 20th Maine to occupy Round Top'))
a(C('us-5c-3d-fisher-10pareserves', 'engagement', 'R220', 'went into the engagement against my wishes', 'July 2', J2,
    place=None, act='Col. Warner of the Tenth Regiment (Pennsylvania Reserves), lame from Antietam wounds, went into the engagement with Fisher\'s brigade',
    note='Fisher names Warner "of the Tenth Regiment"'))
a(C('us-5c-3d-fisher-9pareserves', 'engagement', 'R220', 'evinced all the elements of a soldier in his calm and dignified demeanor', 'July 2', J2,
    place=None, act='Lt. Col. Snodgrass of the Ninth Regiment (Pennsylvania Reserves) praised for his demeanor in Fisher\'s brigade engagement', ocr=False,
    note='the 9th Reserves is named only through its lieutenant-colonel; no place or hour'))
a(C('us-5c-3d-fisher-9pareserves', 'position', 'R220', 'the two regiments which had not gone up the hill', 'morning of July 3', J3,
    place='the ravine between the two hills, covered by a stone wall thrown across it', gz='GZ-010', tier='inferred',
    act='the 9th and 10th Pennsylvania Reserves were, by elimination, the two regiments of Fisher\'s brigade that did not go up Round Top and built the stone wall across the ravine on the morning of July 3',
    reasoning='Fisher took the 5th and 12th Reserves up the hill with the 20th Maine (R220); the 11th fought in the centre of McCandless\' line on July 2 (R218, R219); the brigade is 5th, 9th, 10th, 11th, 12th. The two left are the 9th and 10th. Each step is read from R220/R218/R219; no passage says "Ninth and Tenth".'))
a(C('us-5c-3d-fisher-10pareserves', 'position', 'R220', 'the two regiments which had not gone up the hill', 'morning of July 3', J3,
    place='the ravine between the two hills, covered by a stone wall thrown across it', gz='GZ-010', tier='inferred',
    act='see the 9th Reserves claim: the 10th Reserves by elimination also stayed below and helped build the stone wall',
    reasoning='Same elimination as for the 9th Reserves (R220, R218, R219).'))

# ---------------------------------------------------------------- Artillery Brigade (Martin) R221, R222
BA = 'us-5c-art'
a(C(BA, 'movement', 'R221', 'The artillery entered the field between 4 and 5 p. m.', 'between 4 and 5 p. m.', J2, approx=True,
    place='the field; three batteries in rear of the First Division, two in rear of the Second', act='the Fifth Corps artillery entered the field: D 5th US, C Mass., I 5th US behind the First Division; L 1st Ohio and C 1st NY behind the Second',
    key='V_martin_4to5', conflicts=['V_gibbs_8am']))
a(C('us-5c-art-5usd', 'position', 'R221', 'Battery D, Fifth U. S. Artillery, was moved to the left', 'about 4.30 p. m.', J2, t='16:30', approx=True,
    place='an eminence known as Rock Hill [Round Top], about three-quarters of a mile to the left of the First Division', gz='GZ-009',
    act='Hazlett\'s Battery D, 5th US moved left and posted on Rock Hill [Round Top], a line nearly perpendicular to the First Division; fired continuously until dark',
    note='"Rock Hill [Round Top]" is the hill Hazlett\'s battery occupied (Little Round Top summit in Garrard and Sykes)'))
a(C('us-5c-art-5usd', 'position', 'R221', 'The battery remained in position until the 5th instant, when it was withdrawn', 'July 3-5', J5,
    place='the same position on Rock Hill', gz='GZ-009', act='D 5th US fired at intervals on July 3 and stayed in position until the 5th'))
a(C('us-5c-art-3ma', 'position', 'R221', 'Subsequently Battery C, Massachusetts Artillery, was found in rear of the Third Corps.', 'July 2 afternoon', J2,
    place='in rear of the Third Corps', act='Walcott\'s 3rd Mass. Battery (C), left in rear of the First Division awaiting orders, was found in rear of the Third Corps, taken there by an officer of Sickles\' staff'))
a(C('us-5c-art-3ma', 'night_position', 'R221', 'not having been relieved until about dark', 'about dark, July 2', J2,
    place='in rear of the Third Corps; not put in position with the Fifth Corps', act='3rd Mass. Battery not relieved until about dark and not posted with the Fifth Corps; lost 6 men slightly wounded'))
a(C('us-5c-art-3ma', 'movement', 'R221', 'moved to the extreme left of the line, and there remained in position', 'At 3 a. m. on the 8d [3d] instant', J3, t='03:00', ocr=True,
    place='the extreme left of the line, after reporting to Brig. Gen. Howe (VI Corps)', act='at 3 a.m. on July 3 the 3rd Mass. Battery and Battery C 1st NY reported to Howe\'s division of the VI Corps and moved to the extreme left; not engaged',
    note='OCR "8d instant" read as 3d'))
a(C('us-5c-art-1nyc', 'position', 'R221', 'took up position on the right of Battery L, First Ohio Artillery', 'July 2', J2,
    place='right of Battery L, 1st Ohio, with the First and Second Divisions in line covering its front', act='Barnes\' Battery C 1st NY took position, under orders not to fire; never fired; did not lose anything'))
a(C('us-5c-art-1nyc', 'movement', 'R221', 'moved to the extreme left of the line, and there remained in position', 'At 3 a. m. on the 8d [3d] instant', J3, t='03:00', ocr=True,
    place='the extreme left of the line, after reporting to Brig. Gen. Howe (VI Corps)', act='Battery C 1st NY moved to the extreme left at 3 a.m. on July 3 and remained, not engaged'))
a(C('us-5c-art-5usi', 'position', 'R221', 'was placed in position by some unknown officer of the Third Corps', 'July 2 afternoon', J2,
    place='in front of the Third Corps line (350 yards from the enemy), without support', act='Watson\'s Battery I, 5th US, taken by an officer of Sickles\' staff, was posted by an unknown III Corps officer; overrun; guns recaptured by Lt. Peeples with the Garibaldi Guard; battery unserviceable'))
a(C('us-5c-art-5usi', 'departure', 'R221', 'to go to Westminster, Md.', 'On the 3d instant [OCR "tlieSd"]', J3, ocr=True,
    place='Westminster, Md.', act='Battery I, 5th US reported unserviceable; Sykes with Hunt\'s approval sent it to Westminster, then Frederick, then Washington for re-equipment'))
a(C('us-5c-art-1ohl', 'position', 'R221', 'moved up to the field in rear of the Second Division', 'July 2', J2,
    place='behind the Second Division; one section (Guthrie) on the slope of Rock Hill [Round Top] right of Battery D; one section (Walworth) at the base of the hill commanding the ravine; one in reserve', gz='GZ-009',
    act='Battery L 1st Ohio posted in three sections on and at the foot of Rock Hill [Round Top]'))
a(C('us-5c-art-1ohl', 'position', 'R222', 'on the right slope of Little Round Top (Weed\'s Hill)', 'about the middle of the afternoon', J2, approx=True,
    place='left section (Guthrie) on the left of a road leading from the valley, on the right slope of Little Round Top (Weed\'s Hill); centre and right sections on the right of that road', gz='GZ-009',
    act='Gibbs reports the battery came on the trot at the call of an orderly to the assistance of the Fifth Corps and was placed by Sykes to cover the valley'))
a(C('us-5c-art-1ohl', 'position', 'R222', 'went into position about 8 a. m. on the morning of the 2d', 'about 8 a. m.', J2, t='08:00', approx=True,
    place='to the right of the Baltimore pike, in a field of wheat, 100 yards in front of infantry support, 60 yards behind the skirmish line', gz='GZ-039', road='Baltimore Pike',
    act='Battery L, 1st Ohio went into position about 8 a.m. right of the Baltimore pike (skirmish fire one hour), then crossed the pike and went into park on its left',
    key='V_gibbs_8am', conflicts=['V_martin_4to5'], note='Marching "nearly all night of July 1". Martin (artillery brigade commander) has the artillery entering the field between 4 and 5 p.m.'))
a(C('us-5c-art-1ohl', 'night_position', 'R222', 'crossing the Baltimore pike, and going into park on the left of it', 'after the skirmish hour (morning of July 2)', J2,
    place='the left of the Baltimore pike', gz='GZ-039', road='Baltimore Pike', act='battery crossed the pike and parked on its left before the afternoon call'))
a(C('us-5c-art-1ohl', 'position', 'R222', 'On the 3d, we remained in the same position, occasionally working the battery.', 'July 3', J3,
    place='the same position', act='Battery L fired occasionally on July 3; light 12-pounders out of range of the Confederate position (Martin)'))
