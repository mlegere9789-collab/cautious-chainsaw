# V Corps headquarters (Sykes) and 1st Division (Barnes): Tilton, Sweitzer, Vincent/Rice; OR27 pt.1 reports R187-R202.
J1, J2, J3, J4, J5 = '1863-07-01', '1863-07-02', '1863-07-03', '1863-07-04', '1863-07-05'
V = 'us-5c'
S = []
a = S.append

# ---------------------------------------------------------------- V Corps (Sykes) R187
a(C(V, 'march', 'R187', 'Left Frederick; marched to and encamped in the vicinity of', 'June 29', '1863-06-29',
    place='Liberty, Md.', act='left Frederick, marched 15 miles and encamped in the vicinity of Liberty', note='Sykes itinerary report of Aug 15, 1863'))
a(C(V, 'march', 'R187', 'Marched to Union Mills, via Johnsville, Union, and Frizellburg.', 'June 30', '1863-06-30',
    place='Union Mills, via Johnsville, Union, and Frizellburg', act='marched 23 miles to Union Mills and encamped on Big Pipe Creek along the Westminster-Gettysburg turnpike'))
a(C(V, 'march', 'R187', 'Marched to Hanover, and relieved the cavalry there under General Kilpatrick.', 'July 1', J1,
    place='Hanover', act='marched to Hanover and relieved Kilpatrick\'s cavalry there'))
a(C(V, 'night_position', 'R187', 'At 7 p. m. resumed the march, and at midnight bivouacked at Bonaughtown', 'At 7 p. m. ... at midnight', J1, t='19:00',
    place='Bonaughtown', act='resumed the march from Hanover at 7 p.m., bivouacked at Bonaughtown at midnight after 30 miles',
    key='V_sykes_bonaughtown', conflicts=['V_rice_hanover_left5'],
    note='Sykes gives 7 p.m. for leaving Hanover; Col. Rice (3rd Bde) gives 5 p.m. (V_rice_hanover_left5); Barnes puts the halt about 2 miles from Gettysburg'))
a(C(V, 'arrival_road', 'R187', 'Marched at 4 a. m. for Gettysburg, 6 miles; arrived early.', 'at 4 a. m. ... arrived early', J2, t='04:00',
    place='Gettysburg', act='marched from Bonaughtown 6 miles to Gettysburg, arriving early on July 2',
    note='Road not named in this passage. Compare the first Sykes report: about 8 a. m.', key='V_sykes_itin_jul2'))
a(C(V, 'arrival_road', 'R187', 'via Liberty, Union Mills; Hanover, &c., about 8 a. m.', 'about 8 a. m.', J2, t='08:00', approx=True,
    place='the field of Gettysburg, via Liberty, Union Mills; Hanover', act='reached the field of Gettysburg about 8 a.m. on July 2 by Liberty, Union Mills and Hanover',
    key='V_arr_sykes8', conflicts=['V_arr_barnes7', 'V_arr_chamb7', 'C-003'],
    note='Corps commander\'s own report. Division and regimental reports say about 7 a.m. (Barnes, Chamberlain)'))
a(C(V, 'position', 'R187', 'they were subsequently massed near the bridge over Rock Creek', 'subsequently (July 2, before 3 p. m.)', J2,
    place='near the bridge over Rock Creek, on the Baltimore and Gettysburg pike', gz='GZ-039', road='Baltimore Pike',
    act='after first taking position on the right of the line, massed near the Rock Creek bridge on the Baltimore pike within reach of the XII Corps',
    note='The same passage says the corps first "took position on the right of our line" and was then massed here; Sykes was directed to support III Corps with a brigade if required'))
a(C(V, 'movement', 'R187', 'At 3 p. m. General Meade sent for me', '3 p. m.', J2, t='15:00',
    place=None, act='Sykes summoned to Meade at 3 p.m.; as the enemy attacked on the left he was ordered to throw the whole corps to the left and hold it at all hazards',
    key='V_sykes_3pm', conflicts=['V_barnes_4to6', 'V_chamb_4pm', 'V_rice_4pm', 'V_wood_230'],
    note='Order to move the corps; the divisions report starting between 2.30 and 6 p.m.'))
a(C(V, 'movement', 'R187', 'I rode rapidly to the Taneytown pike to bring up the remaining troops', 'after posting Sweitzer and Tilton (July 2 afternoon)', J2,
    place='the Taneytown pike', gz='GZ-042', road='Taneytown Road', act='Sykes rode to the Taneytown pike to bring up the remaining troops of the corps to the left'))
a(C(V, 'position', 'R187', 'which I did with Sweitzer\'s and Tilton\'s brigades, of my First Division,', 'afternoon of July 2', J2,
    place='the gap between the rocky ridge and Birney\'s division (the "gorge")', act='Sykes posted Sweitzer\'s and Tilton\'s brigades himself to fill the gap beside the Third Corps; Vincent\'s brigade seized the rocky height followed by Weed\'s brigade'))
a(C(V, 'position', 'R187', 'Vincent\'s brigade, of this division, had seized the rocky height', 'July 2 afternoon', J2,
    place='the rocky height (the rocky ridge on the extreme left)', gz='GZ-009', act='Vincent\'s brigade seized the rocky height, closely followed by Weed\'s brigade; both posted under General Warren'))
a(C(V, 'engagement', 'R187', 'General Crawford\'s command (my Third Division) was ordered to the front', 'after Ayres fell back (July 2 evening)', J2,
    place='the woods in front (the front of the left)', act='Crawford\'s Third Division ordered to the front, entered the woods and fought until dusk, capturing prisoners and a Georgia flag'))
a(C(V, 'night_position', 'R187', 'Pickets were established, and the troops slept on their arms.', 'night of July 2', J2,
    place='the general line of battle on the left, "shortened, strengthened, firm"', act='Fifth Corps held the left of the line; pickets out; troops slept on their arms'))
a(C(V, 'position', 'R187', 'Crawford held his ground in front, sustained by Bartlett\'s division', 'July 3', J3,
    place='in front (the left front)', act='Crawford held his ground in front, supported by Bartlett (VI Corps); the troops remained as the day before', note='Bartlett was a brigade commander (First Division, VI Corps); Sykes calls it "division". See scope C VI Corps claims.'))
a(C(V, 'engagement', 'R187', 'furious cannonade from more than one hundred guns', 'At 1 p. m.', J3, t='13:00',
    place=None, act='the corps was occasionally under part of the Confederate cannonade'))
a(C(V, 'departure', 'R187', 'On the 5th, I began the march to Williamsport.', 'July 5', J5,
    place='Williamsport', act='Sykes began the march toward Williamsport; the itinerary says the corps marched via Emmitsburg', key='V_depart_jul5'))
a(C(V, 'departure', 'R187', 'Started en rottte for the Potomac.', 'July 5', J5,
    place='the Potomac', act='corps started for the Potomac; reached the Antietam at Delaware Mills on the 10th via Emmitsburg, Creagerstown, Utica, Middletown', ocr=True))

# ---------------------------------------------------------------- 1st Division (Barnes) R189
D1 = 'us-5c-1d'
a(C(D1, 'march', 'R189', 'the division encamped about 2 miles to the south of Frederick City, Md.', 'June 28', '1863-06-28',
    place='about 2 miles to the south of Frederick City, Md.', act='division encamped south of Frederick'))
a(C(D1, 'march', 'R189', 'passing beyond that place about 2 miles, bivouacked for the night.', 'June 29', '1863-06-29',
    place='2 miles beyond Liberty', act='moved through Frederick toward Liberty and bivouacked 2 miles beyond it'))
a(C(D1, 'march', 'R189', 'the march was resumed and continued toward Union Mills', 'at 4 a. m. (OCR "On the Both.", i.e. June 30)', '1863-06-30', t='04:00',
    place='Union Mills', act='marched at 4 a.m. toward Union Mills, which a Confederate cavalry force had left 3-4 hours earlier for Hanover; halted there for the night', ocr=True,
    note='OCR prints "On the Both." for the 30th. The same passage reports the enemy cavalry (8,000-10,000 reported) had gone toward Hanover'))
a(C(D1, 'march', 'R189', 'for Hanover, where it arrived at about 4 o\'clock in the afternoon.', 'about 4 o\'clock in the afternoon', J1, t='16:00', approx=True,
    place='Hanover', act='left Union Mills early and reached Hanover about 4 p.m.; halt ordered, then news of Gettysburg and immediate resumption of the march',
    key='V_barnes_hanover4', conflicts=['V_rice_hanover3', 'V_chamb_hanover_sunset']))
a(C(D1, 'night_position', 'R189', 'halting after midnight about 2 miles from that place.', 'after midnight', J2, approx=True,
    place='about 2 miles from Gettysburg', act='division halted for a brief rest of two or three hours about 2 miles from Gettysburg',
    key='V_barnes_halt2mi', conflicts=['V_sweitzer_halt45', 'V_sykes_bonaughtown', 'V_rice_halt3mi']))
a(C(D1, 'arrival_road', 'R189', 'the division reached Gettysburg at about 7 o\'clock in the morning of Jidy 3', 'about 7 o\'clock in the morning', J2, t='07:00', approx=True,
    place='Gettysburg', act='the division reached Gettysburg about 7 a.m. on July 2 (OCR "Jidy 3")', ocr=True,
    key='V_arr_barnes7', conflicts=['V_arr_sykes8'], note='OCR "Jidy 3": the context (the next day, the battle of "the 2d") fixes the date as July 2; Griffin and Sykes agree that the division was on the field early on July 2'))
a(C(D1, 'position', 'R189', 'direction of General Sykes, on the right of the Second Division of the corps', 'morning of July 2 (first position)', J2,
    place='south of and facing toward the village', act='division placed on the right of the Second Division, south of and facing the village; 9th Mass. deployed as skirmishers in front',
    note='Same sentence ends "south of and facing toward the village"'))
a(C(D1, 'position', 'R189', 'we were held in reserve in an orchard on the left of the road', 'after midmorning, "until long after midday" (July 2)', J2,
    place='an orchard on the left of the road, across the creek over a small bridge', gz=None, act='after two shifts of position the division crossed the creek by a small bridge and was held in reserve in an orchard on the left of the road',
    note='Sweitzer places this orchard "on the hill above the bridge on the Gettysburg turnpike"'))
a(C(D1, 'movement', 'R189', 'Between 4 and 6 o\'clock in the afternoon, orders were received from General Sykes', 'between 4 and 6 o\'clock in the afternoon', J2, approx=True,
    place='toward the left and to the front', act='orders from Sykes to move toward the left and front',
    key='V_barnes_4to6', conflicts=['V_sykes_3pm', 'V_chamb_4pm', 'V_wood_230']))
a(C(D1, 'movement', 'R189', 'moved rapidly up by the Taneytown road to the ground assigned to the division', 'between 4 and 6 o\'clock in the afternoon', J2, approx=True,
    place='the Taneytown road', gz='GZ-042', road='Taneytown Road', act='division column moved up the Taneytown road to the ground assigned by Sykes',
    note='Warren, of Meade\'s staff, rode up and pointed out the Round Top; Vincent was sent there; Sweitzer arrived next, then Tilton'))
a(C(D1, 'position', 'R189', 'The line was on the edge of a thick wood', 'July 2, about 4.30 to 6 p. m.', J2, approx=True,
    place='edge of a thick wood on the left of the ground assigned to the Third Corps (south of the Rose house per Tilton)', act='First and Second Brigades formed the right of the Fifth Corps, on the left of the Third Corps ground'))
a(C(D1, 'night_position', 'R189', 'In this position the two brigades remained during the night.', 'night of July 2', J2,
    place='the position taken after retiring from the woods', act='First and Second Brigades remained on the ground on the left, after retiring; the Ninth Massachusetts rejoined the Second Brigade'))
a(C(D1, 'position', 'R189', 'the First Brigade was directed to relieve the Third Brigade at Little Round Top', 'On the following day', J3,
    place='Little Round Top', gz='GZ-009', act='Tilton\'s First Brigade relieved Vincent/Rice\'s Third Brigade on Little Round Top on July 3'))
a(C(D1, 'strength_note', 'R189', 'in the three brigades, 2,664', 'upon entering the engagement', J2,
    place=None, act='total strength of the division entering the engagement: 2,664 in the three brigades; aggregate killed, wounded and missing 897', ocr=True,
    note='Digit OCR risk (2<->3). Strengths are ranges with a declared basis: this is the division commander\'s count, "upon entering the engagement"'))
a(C(D1, 'departure', 'R189', 'the division moved toward Middletown, where it arrived on July 8', 'July 8 (arrival)', '1863-07-08',
    place='Middletown', act='after Griffin relieved Barnes, the division moved toward Middletown, arriving July 8', key='V_barnes_middletown8', conflicts=['V_griffin_middletown7']))
a(C(D1, 'departure', 'R190', 'the division took up its line of march toward the Potomac', 'On the day following (July 5)', J5,
    place='toward the Potomac', act='Griffin: relieved Barnes on July 4; the division left for the Potomac on July 5, reaching Middletown on the 7th',
    key='V_griffin_middletown7', conflicts=['V_barnes_middletown8']))
a(C(D1, 'arrival_road', 'R190', 'I arrived at Gettysburg on July 3 last, and relieved General Barnes', 'July 3 (arrival); relieved on the 4th', J3,
    place='Gettysburg', act='Brig. Gen. Griffin arrived at Gettysburg on July 3 and relieved Barnes in command of the division on July 4',
    note='Barnes\' report says only that "the opportune arrival of General Griffin enabled me to relinquish" command'))

# ---------------------------------------------------------------- 1st Brigade (Tilton) R192
T = 'us-5c-1d-tilton'
a(C(T, 'movement', 'R192', 'At 4.30 p. m. on July 2, the brigade, under my command, advanced', '4.30 p. m.', J2, t='16:30',
    place='the front (a piece of woods south of Mr. Rose\'s house)', act='brigade advanced to the front on order of Barnes',
    key='V_tilton_430', conflicts=['V_rice_4pm', 'V_chamb_4pm'], note='Other brigades of the division: Rice about 4 p.m.; Barnes 4 to 6 p.m.'))
a(C(T, 'position', 'R192', 'in a piece of woods at the south of Mr. Rose\'s house', '4.30 p. m. and after', J2, t='16:30', approx=True,
    place='a piece of woods at the south of Mr. Rose\'s house', act='brigade placed in order of battle; Second Brigade on its left, no infantry on its right',
    note='No gazetteer id for the Rose house/farm; placement by the OR phrase only'))
a(C('us-5c-1d-tilton-118pa', 'position', 'R192', 'I made a crotchet by refusing the right wing of my right battalion', 'at the formation of the line (about 4.30 p. m.)', J2, approx=True,
    place='right of the brigade line', act='the 118th Pennsylvania on the brigade right was refused to make a crotchet, since there was no infantry to its right',
    note='The passage names the One hundred and eighteenth Pennsylvania (Col. Gwyn) as the right battalion; diagram of the line shows 22d Mass., 1st Mich., 118th Penn.'))
a(C(T, 'engagement', 'R192', 'I immediately retired and took up a new position (in two lines)', 'later in the fight, July 2', J2,
    place='left and rear of a battery posted about 300 yards to the right and rear', act='withdrew under flank threat from the Rose house direction, then retired firing through timber and across an open field'))
a(C(T, 'night_position', 'R192', 'took up a new position upon the right of the Second Division', 'night of July 2', J2,
    place='right of the Second Division (Ayres), reported to General Sykes', act='brigade formed a new line on the right of the Second Division, retained through the night'))
a(C(T, 'position', 'R192', 'we relieved the Third Brigade, on duty, holding the rocky hill', 'On the 3d', J3,
    place='the rocky hill upon the extreme left (Little Round Top)', gz='GZ-009', act='relieved the Third Brigade on the rocky hill at the extreme left',
    conflicts=[], note='Barnes: "relieve the Third Brigade at Little Round Top"; Conner: relieved about 8 a.m. by Col. Hayes, 18th Mass.; Rice: during the forenoon; Rice itinerary: about 9 a.m. with 9th Mass.'))
a(C(T, 'movement', 'R192', 'I advanced the brigade to the edge of the woods in our front', 'On the 4th', J4,
    place='the edge of the woods in front', act='advanced to the edge of the woods and sent a strong skirmish line forward to feel the enemy'))
a(C(T, 'strength_note', 'R192', 'we had remaining on the 2d only 474 men', 'July 2', J2, place=None,
    act='only 474 men remaining on July 2 (forced marches); losses that day 12 killed, 80 wounded, 17 missing = 109',
    note='Barnes gives the First Brigade as 654 "officers and men" (the figure is printed with a footnote mark and is not quotable verbatim)'))
a(C('us-5c-1d-tilton-18ma', 'position', 'R189', 'was immediately detached to support a battery', 'morning of July 2', J2,
    place='a battery upon the left of the road', act='the 18th Massachusetts (Col. Hayes) was detached on arrival to support a battery on the left of the road; rejoined the division later and was posted on the opposite side of the road',
    note='Barnes: the 18th Mass. rejoined the command at the orchard "and was posted on the opposite side of the road"'))
a(C('us-5c-1d-tilton-18ma', 'position', 'R200', 'relieved by Colonel Hayes, Eighteenth Massachusetts', 'the next morning about 8 a. m. (July 3)', J3, t='08:00', approx=True,
    place='Little Round Top / Round Top hill', gz='GZ-009', act='the 18th Massachusetts (Col. Hayes) relieved the 44th New York on the position on Round Top hill',
    key='V_relief_8am', conflicts=['V_relief_9am', 'V_relief_woodward10', 'V_relief_rice_forenoon']))

# ---------------------------------------------------------------- 2nd Brigade (Sweitzer) R193
W = 'us-5c-1d-sweitzer'
a(C(W, 'march', 'R193', 'by way of Hanover, the brigade bivouacked after 12 p. m.', 'July 1 (after 12 p. m. = after midnight)', J2, approx=True,
    place='from Unionville, Md., by way of Hanover', act='after a hard march on July 1 from Unionville, Md. by way of Hanover, bivouacked with the division after midnight in the woods by the roadside',
    note='Sweitzer writes "Unionville"; other reports of the corps name Union Mills (Sykes, Barnes). "12 p. m." is taken to mean midnight',
    conflicts=['V_barnes_halt2mi']))
a(C(W, 'night_position', 'R193', '4 or 5 miles distant from the battle-field', 'after 12 p. m.', J2, approx=True,
    place='woods by the roadside, 4 or 5 miles distant from the battle-field', act='bivouac before the final march', key='V_sweitzer_halt45', conflicts=['V_barnes_halt2mi', 'V_rice_halt3mi'],
    note='Distance to the field: Barnes about 2 miles; Rice (itinerary) 3 miles; Sweitzer 4 or 5 miles'))
a(C(W, 'arrival_road', 'R193', 'Next morning by daylight we were on the march again, the Second Brigade leading.', 'by daylight', J2, approx=True,
    place=None, act='the Second Brigade led the division on the final march at daylight on July 2',
    note='Barnes: arrived about 7 a.m.'))
a(C(W, 'position', 'R193', 'the brigades occiipying positions in the order of their numbers from right to left', 'morning of July 2', J2,
    place='near a farm-house and barn, near the right of the line', ocr=True, act='division massed: brigades in order of their numbers from right to left, General Sykes\' (Ayres\') division on their left'))
a(C(W, 'position', 'R193', 'massed in an orchard on the hill above the bridge on the Gettysburg turnpike', 'midday, until late afternoon (July 2)', J2,
    place='an orchard on the hill above the bridge on the Gettysburg turnpike', road='Baltimore Pike', act='after crossing the creek, brigade massed here; "there we remained until late in the afternoon"',
    note='The OR does not give the pike\'s name. Compare Sykes: troops massed near the bridge over Rock Creek on the Baltimore and Gettysburg pike (inferred identification; not asserted here)'))
a(C(W, 'movement', 'R193', 'moved quite a distance farther to the left, and diagonally to the front', 'soon after cannonading was heard on the left, late afternoon (July 2)', J2,
    place='the left, diagonally to the front, skirting woods', act='left the orchard; the Third Brigade first, then the Second and First in inverted order'))
a(C(W, 'position', 'R193', 'The Second Brigade was placed in position in a wood fronting an open field', 'late afternoon, July 2', J2,
    place='a wood fronting an open field (the First Brigade connecting on the left)', act='formed three regiments in line of battle (Ninth Mass. absent on picket), the 32nd Mass. refronted to the rear into the woods'))
a(C(W, 'engagement', 'R193', 'we started off across the wheat-field in a line parallel to the road', 'after about fifteen minutes in the rear woods (July 2 evening)', J2, approx=True,
    place='across the wheat-field to the stone fence beyond', gz='GZ-013', act='advanced across the wheat-field to support Caldwell, then was outflanked and fell back to the rear of a battery',
    note='General Caldwell (II Corps) asked for a brigade; Barnes assented'))
a(C(W, 'night_position', 'R193', 'where we remained until the evening of the 5th', 'About dark on the evening of the 2d', J2,
    place='on the right of the First Brigade, the position then occupied', act='at dark, on Sykes\' order carried by the First Brigade\'s staff officer, formed on the right of the First Brigade; stayed there until the evening of the 5th',
    note='Quote is the end of a longer sentence; the order to form on the right of the First Brigade is in the preceding words of the same passage'))
a(C(W, 'departure', 'R193', 'when the division advanced toward Emmitsburg', 'the evening of the 5th', J5,
    place='toward Emmitsburg', road='Emmitsburg road', act='division advanced toward Emmitsburg on the evening of July 5', key='V_dep_evening5', conflicts=['V_dep_morning5']))
a(C('us-5c-1d-sweitzer-9ma', 'engagement', 'R189', 'was here detailed from the Second Brigade as skirmishers', 'morning of July 2', J2,
    place='deployed at some distance in front of the line, south of the village', act='9th Massachusetts (Col. Guiney) deployed as skirmishers all day; rejoined the Second Brigade after the fight'))
a(C('us-5c-1d-sweitzer-9ma', 'night_position', 'R193', 'we were shortly afterward joined by the Ninth Massachusetts', 'evening of July 2', J2,
    place='in the rear of the battery', act='the 9th Massachusetts, absent all day on detached duty, rejoined the brigade in the rear of the battery'))
a(C('us-5c-1d-sweitzer-32ma', 'position', 'R193', 'I directed Colonel Prescott to change his front to the rear', 'upon forming (late afternoon July 2)', J2,
    place='in the wood fronting the open field, on the left of the brigade line', act='32nd Massachusetts on the brigade left was exposed in low cleared ground; refronted to the rear to the elevated ground in the woods',
    note='Prescott is named as the commander; the regiment is identified from the sentence before ("the Thirty-second Massachusetts, which was on the left")'))
a(C('us-5c-1d-sweitzer-4mi', 'engagement', 'R193', 'Foui-th Michigan and Sixty-second Pennsylvania had been surrounded', 'July 2 evening', J2,
    place='the stone fence beyond the wheat-field', gz='GZ-013', act='4th Michigan (right of the brigade, beyond the stone fence) and 62nd Pennsylvania surrounded; many missing; Col. Jeffords killed in a flag contest'))

# ---------------------------------------------------------------- 3rd Brigade (Vincent / Rice) R195, R189, R196-R202
B3 = 'us-5c-1d-vincent'
a(C(B3, 'march', 'R195', 'Left camp in the morning, and marched 2 miles beyond Liberty', 'June 29', '1863-06-29',
    place='2 miles beyond Liberty, in the direction of Johnsville', act='left camp near Frederick, marched 2 miles beyond Liberty and camped at 7 p.m. (OCR "7 a. m. [p. m.]")', ocr=True))
a(C(B3, 'march', 'R195', 'Left camp at 4 a. m., arriving at Union Mills about 4 p. m.', 'June 30', '1863-06-30', t='04:00',
    place='Union Mills', act='left camp 4 a.m., arrived Union Mills about 4 p.m. and bivouacked'))
a(C(B3, 'march', 'R195', 'Broke camp at 6 a. m., arriving at Hanover about 3 p. m.', 'July 1', J1, t='06:00',
    place='Hanover', act='broke camp 6 a.m., arrived Hanover about 3 p.m.', key='V_rice_hanover3', conflicts=['V_barnes_hanover4', 'V_chamb_hanover_sunset']))
a(C(B3, 'march', 'R195', 'Left again at 5 [p. m.J, and arrived within 3 miles of Gettysburg', 'left again at 5 [p. m.]', J1, t='17:00',
    place='within 3 miles of Gettysburg', ocr=True, act='left Hanover at 5 p.m. and bivouacked within 3 miles of Gettysburg at 1 a.m. (July 2)',
    key='V_rice_hanover_left5', conflicts=['V_sykes_bonaughtown'], note='OCR brackets: "5 [p. m.J" and the bracketed "[July 2]" are printed in the source'))
a(C(B3, 'night_position', 'R195', 'arrived within 3 miles of Gettysburg at 1 a. m.', '1 a. m.', J2, t='01:00',
    place='within 3 miles of Gettysburg', act='bivouac before the final march', key='V_rice_halt3mi', conflicts=['V_barnes_halt2mi', 'V_sweitzer_halt45']))
a(C(B3, 'position', 'R195', 'Started at 4 a. m.; went about 2 miles, when we got into position', '4 a. m.', J2, t='04:00',
    place='about 2 miles, "into position"', act='started 4 a.m., about 2 miles to a position, remained some 2 hours; crossed the creek and lay in position awaiting orders until about 4 p.m.',
    conflicts=['V_arr_barnes7'], note='Rice\'s itinerary puts the move at 4 a.m. and the first position after about 2 miles; the 3 miles from Gettysburg bivouac vs "about 2 miles" is the reporter\'s own figure'))
a(C(B3, 'movement', 'R195', 'ordered into position at about 4 p. m. of the 2d instant', 'about 4 p. m.', J2, t='16:00', approx=True,
    place='the extreme left of our line of battle', act='the brigade, under the late Colonel Vincent, detached from the division and ordered into position on the extreme left',
    key='V_rice_4pm', conflicts=['V_sykes_3pm', 'V_wood_230', 'V_barnes_4to6', 'V_tilton_430']))
a(C(B3, 'position', 'R195', 'The Twentieth Maine occupied the extreme left of the brigade line', 'about 4 p. m.', J2, t='16:00', approx=True,
    place='the extreme left of the brigade line (Little Round Top)', gz='GZ-009', act='brigade line left to right: 20th Maine (extreme left), 83rd Pennsylvania and 44th New York (centre), 16th Michigan (extreme right, connecting with the Third Division under Crawford)',
    note='Same line order in Barnes: 20th Maine left, 16th Michigan right, 83rd Pa and 44th NY centre'))
a(C(B3, 'engagement', 'R195', 'five regiments were at once sent to my support from the Third Division', 'evening of July 2', J2,
    place='Round Top hill and the left', gz='GZ-010', act='Rice asked for reinforcements; Fisher\'s five regiments from the Third Division were sent; Chamberlain\'s 20th Maine advanced to take Round Top'))
a(C(B3, 'night_position', 'R195', 'It was now 8 o\'clock in the evening', '8 o\'clock in the evening', J2, t='20:00',
    place='the ground gained in front (Round Top hill and the ravine)', act='ground recovered; wounded of both sides gathered in, over 500 prisoners and 1,000 stand of arms sent to the rear before 9 o\'clock'))
a(C(B3, 'position', 'R195', 'relieved during the forenoon of the 3d instant by the First Brigade', 'forenoon of July 3', J3,
    place='from the left (Little Round Top) to the center of the line, in reserve', gz='GZ-009', act='relieved by the First Brigade, then ordered to the centre of the line',
    key='V_relief_rice_forenoon', conflicts=['V_relief_8am', 'V_relief_9am', 'V_relief_woodward10']))
a(C(B3, 'position', 'R195', 'where it remained in reserve the balance of the day', 'balance of July 3', J3,
    place='the center of the line (under the cannonade)', act='brigade in reserve at the center of the line during the cannonade, with no loss'))
a(C(B3, 'movement', 'R195', 'until about 9 a. m., when we were relieved by the First Brigade', 'about 9 a. m.', J3, t='09:00', approx=True,
    place='farther to the right (their old position)', act='relieved at about 9 a.m. by the First Brigade and the 9th Massachusetts of the Second Brigade; the Third Brigade took their old position farther to the right',
    key='V_relief_9am', conflicts=['V_relief_8am', 'V_relief_woodward10', 'V_relief_rice_forenoon'],
    note='Itinerary of the Third Brigade, Aug 1863; text printed "Remained on the field of the previous day\'s fight until about 9 a. m., when we were relieved by the First Brigade and Ninth Massachusetts"'))
a(C(B3, 'departure', 'R195', 'Started about 5 p. m. in direction of Emmitsburg.', 'July 5, about 5 p. m.', J5, t='17:00', approx=True,
    place='in direction of Emmitsburg', road='Emmitsburg road', act='the brigade moved off at about 5 p.m. toward Emmitsburg, bivouacked on the road about 10 p.m.', key='V_dep_5pm', conflicts=['V_dep_morning5']))
a(C(B3, 'strength_note', 'R195', 'The muskets taken into action by the brigade numbered about 1,000.', 'July 2', J2,
    place=None, act='about 1,000 muskets taken into action', note='Barnes also states "The brigade numbered about 1,000 men"'))

# regiments of the 3rd Brigade
a(C('us-5c-1d-vincent-20me', 'arrival_road', 'R196', 'on reaching Hanover, Pa., just before sunset on that day', 'just before sunset', J1,
    place='Hanover, Pa.', act='20th Maine, advance guard of the division on the July 1 march, reached Hanover just before sunset and was ordered at once to Gettysburg',
    key='V_chamb_hanover_sunset', conflicts=['V_rice_hanover3', 'V_barnes_hanover4']))
a(C('us-5c-1d-vincent-20me', 'march', 'R196', 'Having acted as the advance guard', 'on the march of July 1', J1,
    place='the march from Union Mills to Hanover', act='20th Maine acted as advance guard of the division because of the proximity of the enemy\'s cavalry'))
a(C('us-5c-1d-vincent-20me', 'arrival_road', 'R196', 'we reached the heights southeasterly of Gettysburg at about 7 a. m., July 2', 'about 7 a. m.', J2, t='07:00', approx=True,
    place='the heights southeasterly of Gettysburg', act='after an hour or two of sleep by the roadside before daybreak, reached the heights southeast of Gettysburg about 7 a.m.',
    key='V_arr_chamb7', conflicts=['V_arr_sykes8']))
a(C('us-5c-1d-vincent-20me', 'position', 'R196', 'Massed at first with the rest of the division', 'July 2, forenoon', J2,
    place='on the right of the road, then moved several times toward the left', act='massed with the division on the right of the road, then moved several times farther toward the left'))
a(C('us-5c-1d-vincent-20me', 'movement', 'R196', 'Somewhere near 4 p. m. a sharp cannonade, at some distance to our left', 'near 4 p. m.', J2, approx=True,
    place='the left, then a farm road crossing Plum Run to Little Round Top', gz='GZ-065', act='the division moved rapidly toward the firing; the brigade took a farm road crossing Plum Run to gain Granite Spur / Little Round Top',
    key='V_chamb_4pm', conflicts=['V_sykes_3pm', 'V_barnes_4to6', 'V_wood_230']))
a(C('us-5c-1d-vincent-20me', 'position', 'R196', 'Passing to the southern slope of Little Round Top', 'about 4 p. m.', J2, approx=True,
    place='the southern slope of Little Round Top, the extreme left of the line', gz='GZ-009', act='Vincent placed the 20th Maine on the southern slope of Little Round Top: "the extreme left of our general line"; Company B (Capt. Morrill) skirmished across the hollow toward Round Top'))
a(C('us-5c-1d-vincent-20me', 'engagement', 'R196', 'for an hour the fighting was severe', 'after about 4 p. m.', J2, approx=True,
    place='Little Round Top, left flank refused at right angles', gz='GZ-009', act='attacked on the front and, later, left flank; bayonet charge swept the valley'))
a(C('us-5c-1d-vincent-20me', 'movement', 'R196', 'the little handful of 200 men pressed up the mountain side', 'It was now 9 p. m.', J2, t='21:00',
    place='the western slope / crest of Great Round Top', gz='GZ-010', act='at Rice\'s order the regiment advanced in extended order and seized the crest of Great Round Top, taking 25 prisoners',
    note='Rice\'s report (p.618) says Chamberlain was ordered to take possession of the mountain; Chamberlain\'s time is 9 p.m. while Rice writes that by 9 p.m. the ground was in hand', key='V_chamb_9pm', conflicts=['V_fisher_10pm']))
a(C('us-5c-1d-vincent-20me', 'night_position', 'R196', 'I placed the men in a strong position among the rocks', 'night of July 2', J2,
    place='the crest of Great Round Top', gz='GZ-010', act='held the crest; 83rd Pennsylvania and 44th New York came up; strong picket forward; two regiments of Fisher\'s brigade came up beyond the left about midnight'))
a(C('us-5c-1d-vincent-20me', 'position', 'R196', 'About noon on the 3d of July, we were withdrawn', 'About noon', J3, t='12:00', approx=True,
    place='the right of the brigade, in the front edge of a piece of woods near the left center of the main line', act='withdrawn from the Round Top crest to the brigade\'s new line',
    key='V_chamb_noon3', conflicts=['V_relief_8am', 'V_relief_9am', 'V_relief_woodward10', 'V_relief_rice_forenoon']))
a(C('us-5c-1d-vincent-20me', 'position', 'R196', 'near the left center of our main line of battle', 'afternoon of July 3', J3,
    place='the front edge of a piece of woods near the left center of the main line', act='held in readiness to support the troops receiving the afternoon attack'))
a(C('us-5c-1d-vincent-20me', 'strength_note', 'R196', 'We went into the fight with 386, all told', 'July 2', J2, place=None, act='386 all told (358 guns) at the start of the fight', ocr=True))
a(C('us-5c-1d-vincent-20me', 'departure', 'R196', 'took up our march on the Emmitsburg road', 'on the morning of the 5th', J5,
    place='the Emmitsburg road', gz='GZ-041', road='Emmitsburg Road', act='the regiment marched out on the Emmitsburg road on the morning of July 5',
    key='V_dep_morning5', conflicts=['V_dep_5pm', 'V_dep_evening5', 'V_clark_carolina']))
a(C('us-5c-1d-vincent-20me', 'departure', 'R197', 'occupied the Carolina road during the day.', 'July 5', J5,
    place='the Carolina road, then 10 miles toward Emmitsburg, bivouacked at midnight near Marsh Creek', act='regiment moved forward on the battlefield on the morning of the 5th, held the Carolina road by day and marched at night 10 miles toward Emmitsburg',
    key='V_clark_carolina', conflicts=['V_dep_morning5', 'V_dep_5pm'], note='Capt. A. W. Clark\'s report; Chamberlain\'s own gives the morning'))
a(C('us-5c-1d-vincent-16mi', 'position', 'R198', 'near and in rear of Gettysburg, to the left of the main road', 'most of the day (July 2)', J2,
    place='near and in rear of Gettysburg, to the left of the main road', act='regiment closed in mass with the Third Brigade during most of the day'))
a(C('us-5c-1d-vincent-16mi', 'movement', 'R198', 'About 4 p. m. we moved rapidly to the extreme left', 'About 4 p. m.', J2, t='16:00', approx=True,
    place='the extreme left of our line of battle, on a high rocky hill', gz='GZ-009', act='moved to the extreme left; went into position on the left of the brigade'))
a(C('us-5c-1d-vincent-16mi', 'position', 'R198', 'I was ordered at double-quick to the right of the brigade', 'about 4 p. m.', J2, approx=True,
    place='right of the brigade, on the right of the 44th New York', act='ordered to the right of the brigade line, on the right of the 44th New York'))
a(C('us-5c-1d-vincent-16mi', 'position', 'R198', 'we took up a new line farther to the right', 'On the 3d', J3,
    place='farther to the right, at the left of the brigade', act='moved to a new line farther right on July 3 and stood on its arms for twenty-four hours'))
a(C('us-5c-1d-vincent-16mi', 'strength_note', 'R198', 'The number of muskets taken in line was about 150', 'July 2', J2, place=None, act='about 150 muskets in line; two companies (about 50) skirmishing'))
a(C('us-5c-1d-vincent-44ny', 'position', 'R200', 'About 4 p. m. our regiment. Col. J. C. Rice commanding, was placed', 'About 4 p. m.', J2, t='16:00', approx=True,
    place='Round Top hill, 83rd Pennsylvania on the left and the "Sixteenth Massachusetts" (sic, the 16th Michigan) on the right', gz='GZ-009',
    act='44th New York placed in position on Round Top hill; Company B thrown out as skirmishers', ocr=False,
    note='The report prints "Sixteenth Massachusetts" for the right-hand regiment; the brigade had the 16th Michigan, not a Massachusetts regiment (the report\'s error, recorded as printed)'))
a(C('us-5c-1d-vincent-44ny', 'position', 'R200', 'We remained in our position until the next morning about 8 a. m.', 'next morning about 8 a. m.', J3, t='08:00', approx=True,
    place='Round Top hill; then moved to the right about three-eighths of a mile', gz='GZ-009', act='held position all night; relieved by Col. Hayes, 18th Mass., about 8 a.m. on July 3, then moved right about three-eighths of a mile with the 16th Michigan on its left and the 20th Maine on its right',
    key='V_relief_8am_44', conflicts=['V_relief_9am', 'V_relief_woodward10', 'V_chamb_noon3']))
a(C('us-5c-1d-vincent-83pa', 'position', 'R201', 'At about 2. .30 p. m. was ordered into position on our extreme left', 'At about 2. .30 p. m.', J2, t='14:30', approx=True, ocr=True,
    place='our extreme left, the 44th New York on the right and the 20th Maine on the left', gz='GZ-009',
    act='83rd Pennsylvania ordered into position at the brigade\'s extreme left, behind rocks and stones; engaged by 3.15 p.m.',
    key='V_wood_230', conflicts=['V_rice_4pm', 'V_sykes_3pm', 'V_barnes_4to6', 'V_chamb_4pm'], note='OCR prints "2. .30"; read as 2.30. Other reports of the brigade say about 4 p.m.'))
a(C('us-5c-1d-vincent-83pa', 'engagement', 'R201', 'At 3.15 p. m. the enemy advanced and engaged my skirmishers', 'At 3.15 p. m.', J2, t='15:15',
    place='extreme left, Little Round Top', gz='GZ-009', act='enemy attack on the 83rd Pennsylvania at 3.15 p.m., lively until nearly 6 p.m.',
    key='V_wood_315', conflicts=['V_rice_4pm', 'V_chamb_4pm'], note='3.15 p.m. is earlier than the 4 p.m. given by Rice, Chamberlain, Welch and Conner for the brigade\'s arrival'))
a(C('us-5c-1d-vincent-83pa', 'night_position', 'R201', 'At 1.30 a. m. on the 3d, moved, to the support', 'At 1.30 a. m.', J3, t='01:30',
    place='a high hill a little to the left of the former position (Round Top crest)', gz='GZ-010', act='moved to support the 20th Maine on the high hill taken to the left'))
a(C('us-5c-1d-vincent-83pa', 'position', 'R201', 'Remained here until 10 a. m., when, being relieved by a regiment', 'until 10 a. m.', J3, t='10:00', approx=True,
    place='the high hill; relieved by a regiment of the Pennsylvania Reserves, then massed in the woods just at the right of General Sykes\' headquarters', gz='GZ-010',
    act='relieved at 10 a.m. by a regiment of the Pennsylvania Reserves; rejoined the brigade massed in the woods at the right of Sykes\' headquarters',
    key='V_relief_woodward10', conflicts=['V_relief_8am', 'V_relief_9am', 'V_relief_rice_forenoon']))
a(C('us-5c-1d-vincent-83pa', 'movement', 'R201', 'when the brigade was thrown forward on a reconnaissance', 'until 13 m. [noon] the 4th', J4, t='12:00', ocr=True,
    place='the position occupied by the enemy the previous day; no opposing force within 2 miles', act='brigade reconnaissance to the enemy\'s position of July 3'))
a(C('us-5c-1d-vincent-83pa', 'movement', 'R202', 'ordered to relieve General Bartlett\'s brigade, of the Second [Sixth] Corps', 'July 4', J4,
    place=None, ocr=True, act='the Third Brigade was ordered to relieve Bartlett\'s brigade (VI Corps) on July 4',
    note='The OCR text has "Second [Sixth] Corps": the bracketed correction is in the source; links V Corps to VI Corps (Bartlett) on July 4'))
