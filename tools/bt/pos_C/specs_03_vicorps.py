# VI Corps (Sedgwick): Wright 1st Div (Torbert, Bartlett/Upton, Russell), Howe 2nd Div (Grant, Neill), 3rd Div Newton/Wheaton (Shaler, Eustis, Wheaton/Nevin),
# Artillery Brigade (Tompkins).  OR27 pt.1 R223-R242 plus neighbours' reports (R133 Birney, R293 Geary, R303 Cobham).
J1, J2, J3, J4, J5, J6 = '1863-07-01', '1863-07-02', '1863-07-03', '1863-07-04', '1863-07-05', '1863-07-06'
S = []
a = S.append
V6 = 'us-6c'

# ------------------------------------------------------------ corps (Sedgwick R223, Wright R224, Meade R006)
a(C(V6, 'arrival_road', 'R223', 'arrived on the field of Gettysburg on the afternoon of July 2', 'on the afternoon of July 2', J2,
    place='the field of Gettysburg, after a march of more than 30 miles', act='VI Corps reached the field on the afternoon of July 2',
    key='V6_arr_sedg', conflicts=['V6_arr_meade3', 'V6_arr_wright4', 'C-022']))
a(C(V6, 'arrival_road', 'R006', 'At 3 p. m. the Sixth Corps arrived, after a march of 33 miles', 'At 3 p. m.', J2, t='15:00',
    place='Gettysburg (the field), 33 miles in the march from 9 p. m. the day before', act='Meade reports the Sixth Corps arrived at 3 p.m. after a 33-mile march begun at 9 p.m. July 1',
    key='V6_arr_meade3', conflicts=['V6_arr_wright4', 'V6_arr_sedg', 'C-022'], note='Meade, army commander\'s report (printed p.116). Compare Wright 4 p.m., Bartlett and Howe 5 p.m., Torbert 4 p.m., Upton 3.30 p.m.'))
a(C(V6, 'arrival_road', 'R224', 'where it arrived about 4 p. m.', 'about 4 p. m.', J2, t='16:00', approx=True,
    place='Gettysburg', road='Baltimore Pike', gz='GZ-039',
    act='Wright: the corps was pushed on without halting except for a few moments each hour to Gettysburg, arriving about 4 p.m., then halted about two hours before moving up to support the II, III and V Corps',
    key='V6_arr_wright4', conflicts=['V6_arr_meade3', 'V6_arr_sedg', 'V6_arr_howe5', 'C-022'],
    note='The road is "the broad and excellent pike leading direct to Gettysburg" (see arrival road claim); the identification with the Baltimore Pike is the compiler\'s, from "the Baltimore and Gettysburg pike" named earlier in the same report'))
a(C(V6, 'march', 'R224', 'the corps being in camp near Manchester, orders were received to move to Taneytown', 'Just before dark on the evening of July 1', J1,
    place='camp near Manchester -> Taneytown', act='orders to move to Taneytown received just before dark July 1; troops immediately in motion',
    key='V6_wright_taneytown'))
a(C(V6, 'arrival_road', 'R224', 'some time after crossing the Baltimore and Gettysburg pike, other orders were received', 'during the night of July 1-2', J2,
    place='the Baltimore and Gettysburg pike', gz='GZ-039', road='Baltimore Pike (Baltimore and Gettysburg pike)',
    act='after crossing the Baltimore and Gettysburg pike the corps got new orders to go by rapid marches to Gettysburg; the column was extricated from a narrow road and formed on the broad pike leading direct to Gettysburg',
    key='V6_road_wright', conflicts=['V6_upton_330', 'V6_road_butterfield', 'V6_road_nevin']))
a(C(V6, 'arrival_road', 'R224', 'formed on the broad and excellent pike leading direct to Gettysburg', 'night of July 1-2', J2,
    place='the broad and excellent pike leading direct to Gettysburg', road='Gettysburg pike (unnamed in this passage)', act='VI Corps marched the last stretch on the broad pike direct to Gettysburg', ocr=False))
a(C(V6, 'arrival_road', 'R224', 'The corps here halted for about two hours', 'after arriving about 4 p. m.', J2, approx=True,
    place='Gettysburg', act='two-hour halt on arrival, then orders to move up with all dispatch to support the Second, Third and Fifth Corps on the left centre'))
a(C(V6, 'march', 'R224', 'the command broke camp near Edwards Ferry, and moved to Hyattstown', 'June 28, 4 a. m.', '1863-06-28', t='04:00',
    place='near Edwards Ferry -> Hyattstown (18 miles)', act='broke camp near Edwards Ferry and moved to Hyattstown', key='V6_jun28', conflicts=['V6_russell_jun28']))
a(C(V6, 'march', 'R224', 'Marched at 4 a. m., via Monrovia, New Market, Ridgeville, and Mount Airy', 'June 29, 4 a. m.', '1863-06-29', t='04:00',
    place='via Monrovia, New Market, Ridgeville, Mount Airy to near New Windsor (22 miles)', act='marched to near New Windsor'))
a(C(V6, 'march', 'R224', 'Marched at 4 a. m. through Westminster; encamped about 2 miles from Manchester', 'June 30, 4 a. m.', '1863-06-30', t='04:00',
    place='through Westminster to about 2 miles from Manchester (23 miles)', act='marched through Westminster and encamped about 2 miles from Manchester'))
a(C(V6, 'march', 'R224', 'resumption of the march at about 9 p. m. on the night of', 'about 9 p. m.', J1, t='21:00', approx=True,
    place='from near Manchester', act='the corps resumed the march at about 9 p.m. July 1', key='V6_leave_9pm', conflicts=['V6_howe_leave1am', 'V6_torbert_10pm']))
a(C(V6, 'engagement', 'R223', 'went into action about 5 p. m. on the left center', 'about 5 p. m.', J2, t='17:00', approx=True,
    place='the left center, between divisions of the Fifth Corps', act='Wheaton\'s and Eustis\' brigades (Third Division) and Bartlett\'s brigade (First Division) went into action about 5 p.m. and helped repel the assault',
    key='V6_5pm', conflicts=['V6_arr_wright4']))
a(C(V6, 'night_position', 'R223', 'were held in reserve that night', 'night of July 2', J2,
    place=None, act='Russell\'s and Torbert\'s brigades (Wright\'s division) held in reserve; Neill sent to the right (Slocum); Grant on the extreme left; Shaler in reserve near the left center'))
a(C(V6, 'departure', 'R223', 'Wright\'s division, supported by the rest of my command, was sent forward', 'On July 5', J5,
    place='forward of the lines, toward Fairfield (the enemy in retreat)', act='July 5: Wright\'s division, supported by the rest of the corps, sent forward to find the enemy, who was retreating through Fairfield toward Hagerstown'))
a(C(V6, 'departure', 'R223', 'During the night the corps marched to Emmitsburg, with the exception of Neill\'s brigade', 'night of July 6', J6,
    place='Emmitsburg', gz=None, act='corps marched to Emmitsburg the night of July 6; Neill\'s brigade detached in pursuit'))
a(C(V6, 'departure', 'R007', 'the Sixth Corps to Fairfield', 'July 5', J5,
    place='Fairfield', act='Itinerary of the Army of the Potomac: leaving Gettysburg July 5, the Sixth Corps to Fairfield', note='Itinerary record R007; printed p.145'))
a(C(V6, 'march', 'R007', 'the Sixth Corps from Manchester en route to Gettysburg', 'July 1', J1,
    place='Manchester, en route to Gettysburg', act='Itinerary: July 1 the Sixth Corps from Manchester en route to Gettysburg'))

# ------------------------------------------------------------ 1st Division (Wright) R224; brigades
D61 = 'us-6c-1d'
a(C(D61, 'night_position', 'R224', 'while my First and Third Brigades were massed and held in reserve', 'night of July 2', J2,
    place='massed in reserve near the left center', act='Wright: the Third Division and Second (Bartlett) brigade moved into position; First (Torbert) and Third (Russell) brigades massed in reserve'))
a(C(D61, 'position', 'R224', 'I posted Torbert\'s brigade near the center of the line', 'On the morning of the 3d, at an early hour', J3,
    place='near the center of the line, to fill a gap on the left of the First Corps', act='Torbert posted at the centre by Wright; then temporarily attached to Newton; Wright took Russell to the extreme left'))
a(C(D61, 'position', 'R224', 'on the ascending slope of Round Top Mountain', 'On the morning of the 4th', J4,
    place='to the left of the Fifth Corps, on the ascending slope of Round Top Mountain', gz='GZ-010', act='Russell\'s brigade posted left of the Fifth Corps on the slope of Round Top Mountain, where it stayed day and night'))
a(C(D61, 'movement', 'R224', 'to re-enforce the line on the right of the Fifth Corps', 'About 5 p. m. (July 3)', J3, t='17:00', approx=True,
    place='the line on the right of the Fifth Corps', act='Wright went with Russell\'s brigade to reinforce, found the enemy repulsed, held the brigade in reserve'))
a(C(D61, 'departure', 'R224', 'crossed the valley in our front, occupying the position held by the enemy', 'On the morning of the 5th', J5,
    place='the valley in front, then the enemy\'s position of July 4', act='reconnaissance by the corps: Wright\'s division crossed the valley and occupied the enemy\'s former position; artillery fired on a body of the enemy on the right that disappeared in retreat'))
# Torbert R225
T6 = 'us-6c-1d-torbert'
a(C(T6, 'march', 'R225', 'about 10 o\'clock, the brigade started from near Manchester, Md., for Gettysburg', 'about 10 o\'clock (p. m.)', J1, t='22:00', approx=True,
    place='near Manchester, Md. -> Gettysburg (about 35 miles)', act='brigade left Manchester at about 10 p.m. July 1; one hour for coffee about 1 p.m. July 2', key='V6_torbert_10pm', conflicts=['V6_leave_9pm', 'V6_howe_leave1am']))
a(C(T6, 'arrival_road', 'R225', 'we made it by 4 p. m. on the 2d', 'by 4 p. m. on the 2d', J2, t='16:00', approx=True,
    place='the battle-field (35 miles)', act='brigade arrived near the battle-field by 4 p.m., rested about two hours, then ordered to the left', key='V6_torbert_4pm', conflicts=['V6_arr_meade3', 'V6_upton_330']))
a(C(T6, 'night_position', 'R225', 'The brigade was held in this position in reserve till morning.', 'night of July 2', J2,
    place='the left of the line (arrived about dark)', act='in reserve on the left, 35 men absent who came up by morning'))
a(C(T6, 'position', 'R225', 'put in position in front and about the center of the line', 'Early on the morning of the 3d', J3,
    place='in front and about the centre of the line (on the left of the First Corps, right of the Fifth)', act='detached from the corps and held there until the morning of July 5, under Newton; picket line under Lt. Col. Wiebecke, 2nd NJ; 11 enlisted men wounded on the picket line',
    note='Wright: gap on the left of the First Corps. Torbert\'s second report: connecting on the right with the First Corps and on the left with the Fifth Corps'))
a(C(T6, 'position', 'R225', 'connecting on the right with the First Corps', 'July 3', J3,
    place='on the left with the Fifth Corps', act='brigade picketed its front, connecting right with the First Corps and left with the Fifth Corps'))
a(C(T6, 'departure', 'R225', 'joined my division and corps, taking the lead of the same', 'July 5, broke camp at 3 a. m.', J5, t='03:00',
    place=None, act='brigade rejoined and led the corps; started about 11 a.m. following the rear of the enemy, skirmish about 2 miles from Fairfield, drove the enemy to Fairfield about 5 p.m.'))
a(C('us-6c-1d-torbert-2nj', 'position', 'R225', 'Wiebecke, Second Regiment New Jersey Volunteers, in charge of the picket line', 'July 3', J3,
    place='the brigade picket line in front of the centre', act='2nd NJ Lt. Col. Wiebecke commanded the brigade picket line on July 3'))
# Bartlett / Upton
Bt = 'us-6c-1d-bartlett'
a(C(Bt, 'march', 'R227', 'It commenced its march from near Manchester, Md., toward Taneytown about 10 p. m.', 'about 10 p. m.', J1, t='22:00', approx=True,
    place='near Manchester -> toward Taneytown', act='brigade (Upton commanding) marched from near Manchester toward Taneytown about 10 p.m.', key='V6_upton_10pm', conflicts=['V6_leave_9pm']))
a(C(Bt, 'arrival_road', 'R227', 'its destination was changed to Gettysburg, where it arrived about 3.30 p. m.', 'arrived about 3.30 p. m.', J2, t='15:30', approx=True,
    place='Arriving near Westminster, its destination was changed to Gettysburg', act='near Westminster the destination was changed to Gettysburg; arrived about 3.30 p.m. after 32 miles', ocr=False,
    key='V6_upton_330', conflicts=['V6_torbert_4pm', 'V6_arr_wright4', 'V6_road_wright', 'V6_bartlett_5pm'],
    note='Upton: change of destination "near Westminster"; Wright: "some time after crossing the Baltimore and Gettysburg pike". Not resolved.'))
a(C(Bt, 'movement', 'R227', 'The brigade rested about three hours, when it was ordered to- reenforce', 'after arriving about 3.30 p. m.', J2, approx=True,
    place='that part of our line which was engaged near Round Top Mountain', act='after resting about three hours, ordered to reinforce the line near Round Top; Upton relieved by Bartlett on the march', ocr=False))
a(C(Bt, 'arrival_road', 'R226', 'The brigade arrived on the field a little after 5 p. m.', 'a little after 5 p. m.', J2, t='17:00', approx=True,
    place='the field; formed in two lines as a support to the forces under Sykes near the left of our line', act='Bartlett: arrived a little after 5 p.m., formed in two lines as a support; the Third Brigade, Third Division formed on its left and moved to the front masking it',
    key='V6_bartlett_5pm', conflicts=['V6_upton_330', 'V6_torbert_4pm']))
a(C(Bt, 'night_position', 'R226', 'The troops rested in this position until the morning of July 3', 'night of July 2', J2,
    place='near the left of the line, in rear of the Fifth Corps', act='brigade rested in the supporting position all night'))
a(C(Bt, 'movement', 'R226', 'About 5 p. m. I was ordered by Major-General Sedgwick to cooperate', 'About 5 p. m.', J3, t='17:00', approx=True,
    place='against the supposed position of Hood\'s division (the woods to the front)', act='Bartlett with Nevin\'s brigade as second line advanced with Crawford\'s Reserves; recalled at dusk and occupied a position a few hundred yards in advance of the original one for the night',
    key='V6_bartlett_jul3', note='Crawford (R218) puts his order at 5 o\'clock "on the 3d" and Bartlett moving up "during the night" before; Bartlett: morning of July 3 he took command of the Third Brigade of the Third Division with his own'))
a(C(Bt, 'movement', 'R226', 'as a support to Colonel Day, commanding a brigade of regular troops', 'At 8 a. m., July 4', J4, t='08:00',
    place='immediately in front of my position (not advanced more than 500 yards)', act='Second Brigade as support on a reconnaissance; back to camp about 1 p.m.'))
a(C(Bt, 'departure', 'R226', 'the First and Second Brigades moved from their position, near the center', 'On the morning of July 5, at 5 o\'clock', J5, t='05:00',
    place='from near the centre to near Sixth Corps headquarters; the corps moved forward on the Fairfield road about 8 a.m.', act='Bartlett commanding the Third Division on July 5; corps moved by the Fairfield road at about 8 a.m.'))
a(C('us-6c-1d-bartlett-121ny', 'position', 'R227', 'to support a battery to the right of the summit of Round Top', 'evening of July 2 and July 3', J2,
    place='to the right of the summit of Round Top; right of the regiment on the road leading out to the Emmitsburg pike', gz='GZ-010', act='121st New York took position in line of battle supporting a battery to the right of the summit of Round Top; one man wounded by artillery July 3'))
# Russell R228
Ru = 'us-6c-1d-russell'
a(C(Ru, 'arrival_road', 'R228', 'This brigade reached Gettysburg on the evening of July 2.', 'on the evening of July 2', J2,
    place='Gettysburg', act='Russell\'s brigade reached Gettysburg on the evening of July 2', key='V6_russell_evening', conflicts=['V6_arr_wright4', 'V6_arr_meade3']))
a(C(Ru, 'position', 'R228', 'it was put in position on the extreme left of our line of battle', 'July 3, early in the morning', J3,
    place='the extreme left of our line of battle', act='held there until late in the afternoon, then brought up to aid in opposing an anticipated attack on the centre; not engaged'))
a(C(Ru, 'position', 'R228', 'this brigade relieved a portion of the Fifth Corps', 'On the morning of July 4', J4,
    place='the steep hill to the left of the center of our line (Round Top ridge)', gz='GZ-009', act='Russell\'s brigade relieved a portion of the Fifth Corps on the steep hill to the left of centre and stayed until the morning of July 5',
    note='Rice and Lamont (83rd Pa): the Third Brigade (V Corps) was ordered to relieve Bartlett\'s brigade July 4'))
a(C(Ru, 'march', 'R228', 'this command broke camp near Edwards Ferry, Md., at 4 p. m.', 'June 28, 4 p. m.', '1863-06-28', t='16:00',
    place='Edwards Ferry, Md.', act='Russell\'s brigade broke camp near Edwards Ferry on June 28', key='V6_russell_jun28', conflicts=['V6_jun28'],
    note='Wright: the command broke camp near Edwards Ferry at 4 a.m. June 28; Russell: 4 p.m. (OCR single-digit risk is not the issue: "a. m." vs "p. m.")'))
a(C(Ru, 'departure', 'R228', 'was ordered in pursuit of the retreating enemy', 'the morning of July 5', J5,
    place=None, act='July 5 morning: with the rest of the corps ordered in pursuit of the retreating enemy'))

# ------------------------------------------------------------ 2nd Division (Howe)
D62 = 'us-6c-2d'
a(C(D62, 'march', 'R229', 'The division left Manchester at 1 a. m. on July 3', '1 a. m. on July 3 [sic]', J2, t='01:00', ocr=True,
    place='Manchester', act='Howe: the division left Manchester at 1 a.m. (printed "July 3"; the context is the march to the battle of July 2)', key='V6_howe_leave1am', conflicts=['V6_leave_9pm', 'V6_torbert_10pm'],
    note='OCR digit risk 2<->3; if "1 a. m." is right the division left Manchester at 1 a.m. July 2 and Grant says it marched 30 miles that day. Wright, Torbert, Upton, Nevin: left July 1 between 9 and 10 p.m.'))
a(C(D62, 'arrival_road', 'R229', 'reached the field at Gettysburg at 5 p. m.', 'at 5 p. m.', J2, t='17:00',
    place='the field at Gettysburg, 33 miles distant', act='Howe: division reached the field at 5 p.m.', key='V6_arr_howe5', conflicts=['V6_arr_wright4', 'V6_arr_meade3']))
a(C(D62, 'position', 'R229', 'was immediately placed in position to support artillery on one of the key-points', 'on arrival (5 p. m. July 2)', J2, t='17:00', approx=True,
    place='one of the key-points of the line', act='Third Brigade (Neill) placed to support artillery on a key-point; the remainder of the division ordered to the support of the Fifth Corps'))
a(C(D62, 'position', 'R229', 'ordered, with two batteries, to take position on the extreme left', 'July 2-3', J3,
    place='the extreme left, to hold the left flank of the army', act='the part of the division with the Fifth Corps was ordered with two batteries to the extreme left and held until the morning of July 5',
    note='The two batteries are Battery C 1st NY and Battery C Mass. of the Fifth Corps, ordered to report to Howe at 3 a.m. July 3 (Martin, R221)'))
G6 = 'us-6c-2d-grant'
a(C(G6, 'arrival_road', 'R230', 'arrived near the scene of action at about 5 p. m. July 2', 'at about 5 p. m.', J2, t='17:00', approx=True,
    place='near the scene of action, then the left center of our army', act='Vermont Brigade arrived about 5 p.m. after about 30 miles that day and moved out to the left centre', key='V6_grant_5pm'))
a(C(G6, 'night_position', 'R230', 'and tookposition on the extreme left of the army', 'soon after dark, July 2', J2, ocr=True,
    place='the extreme left of the army; the Fifth Vermont thrown out as pickets', act='soon after dark moved farther left and took position on the extreme left; the 5th Vermont on picket'))
a(C(G6, 'position', 'R230', 'its right resting on Round Top Mountain and its left on the Taneytown road', 'On the morning of the 3d', J3,
    place='right on Round Top Mountain, left on the Taneytown road', gz='GZ-010', road='Taneytown Road', act='brigade advanced a short distance and held this line July 3 and 4, exposed to shot and shell',
    note='gazetteer GZ-010 (Big Round Top) is the compiler\'s identification for "Round Top Mountain"; the passage does not say which peak'))
a(C('us-6c-2d-grant-4vt', 'engagement', 'R230', 'the Fourth Vermont, then on picket, was ordered forward to feel the enemy\'s position', 'On July 4', J4,
    place='about 1 1/2 miles forward (OCR "1^")', act='4th Vermont on picket advanced and skirmished with the enemy\'s pickets; one man wounded', ocr=True))
N6 = 'us-6c-2d-neill'
a(C(N6, 'arrival_road', 'R231', 'after a march of 30 miles, my brigade was detached', 'July 2, "Gp. m." (OCR; illegible hour)', J2, ocr=True,
    place='the battle-field of Gettysburg after a march of 30 miles', act='upon arrival detached by Meade\'s order to support a height crowned by a battery to be held at all hazards (OCR hour "Gp. m.")',
    note='The OCR hour is unreadable ("Gp. m."); Howe gives 5 p.m. for the division. Not used for t_iso.'))
a(C(N6, 'position', 'R231', 'to support a height crowned by a battery', 'on arrival, July 2', J2,
    place='a height crowned by a battery (to be held at all hazards); Slocum in command there', act='Neill sent by Meade to support a battery on a height; there Slocum had him support the front line then held by Geary and Wadsworth',
    ocr=False, note='The height is not named; inferred as Culp\'s Hill / Cemetery Hill area from Slocum and Geary being present (not asserted).'))
a(C(N6, 'position', 'R231', 'take position supporting the front line, then held by Generals Geary and Wadsworth', 'evening of July 2', J2,
    place='behind the front line held by Geary and Wadsworth (the right)', act='ordered by Slocum to support the front line; at midnight ordered back to the original position by Meade'))
a(C(N6, 'night_position', 'R231', 'At midnight was ordered to return to my original position', 'At midnight', J2, t='00:00',
    place='the original position (the height crowned by a battery)', act='returned to the original position at midnight on Meade\'s order'))
a(C(N6, 'position', 'R231', 'two of my regiments on the extreme right of the whole army', 'On the morning of the 3d', J3,
    place='the extreme right of the whole army', act='Slocum ordered two regiments (then the whole brigade) to the extreme right; skirmishing with sharpshooters; 1 officer and 13 enlisted killed and wounded',
    note='Slocum (R271): Neill\'s brigade "moved across Rock Creek and placed in position to protect our extreme right"'))
a(C(N6, 'departure', 'R231', 'On the morning of the 5th, rejoined my division', 'On the morning of the 5th', J5,
    place=None, act='Neill rejoined the division, marched with the corps and drove the enemy out of Fairfield; July 6 detached to command the Light Division'))

# ------------------------------------------------------------ 3rd Division (Newton -> Wheaton)
D63 = 'us-6c-3d'
Sh = 'us-6c-3d-shaler'
a(C(Sh, 'night_position', 'R232', 'in line of battle on the left of the position held by the army', 'At 7 p. m. on the 2d instant', J2, t='19:00',
    place='left of the position held by the army, in rear of the Second Brigade', act='Shaler\'s brigade formed in line of battle on the left, in rear of the Second Brigade (Eustis), by direction of Wheaton',
    key='V6_shaler_7pm', conflicts=['V6_sedg_shaler']))
a(C(Sh, 'movement', 'R232', 'I reported with my brigade to Brigadier-General Geary, commanding Second Division', 'At 8 a. m. of the 3d instant', J3, t='08:00',
    place='the right of the position the army occupied; a sheltered position in rear of a piece of woods', act='Shaler reported to Geary (XII Corps) at 8 a.m. July 3 and took a sheltered position behind a wood',
    key='V6_shaler_8am', conflicts=['V6_geary_845'], note='Geary says Shaler reported at 8.45 o\'clock (R293).'))
a(C(Sh, 'movement', 'R293', 'reported at 8.45o\'clock, and was posted as a reserve', '8.45 o\'clock', J3, t='08:45', ocr=True,
    place='the XII Corps right (Geary\'s front)', act='Geary: Shaler\'s First Brigade, Third Division reported at 8.45 and was posted as a reserve', key='V6_geary_845', conflicts=['V6_shaler_8am'],
    auth='Brig. Gen. John W. Geary', note='OCR "8.45o\'clock" has no space; reading 8:45 is the plain one. Neighbour report (XII Corps).'))
a(C('us-6c-3d-shaler-122ny', 'position', 'R232', 'At 9 a. m. the One hundred and twenty-second New York Volunteers', '9 a. m.', J3, t='09:00',
    place='the front line (the breastworks vacated by the 111th Pennsylvania)', act='122nd NY ordered to relieve the 111th Pennsylvania in the front line; reoccupied the breastworks hastily vacated and held them until relieved by the 82nd Pennsylvania at 11.30 a.m.',
    note='Quote from the enclosure (report to Geary, July 31)'))
a(C('us-6c-3d-shaler-23pa', 'position', 'R232', 'as support to, and 150 yards in rear of, the front line', '9.30 a. m.', J3, t='09:30',
    place='150 yards in rear of the front line', act='23rd Pennsylvania placed in support; after about three hours five companies went forward into the works'))
a(C('us-6c-3d-shaler-67ny', 'engagement', 'R232', 'marched into the woods and forward to the breastworks', 'At 11 a. m.', J3, t='11:00',
    place='the woods and breastworks in front, from which the enemy were fleeing', act='67th NY advanced to the breastworks, capturing about 20 prisoners'))
a(C('us-6c-3d-shaler-82pa', 'position', 'R232', 'advanced to the front line, relieving the One hundred and twenty-second New York', 'At 11.30 a. m.', J3, t='11:30',
    place='the front line (breastworks)', act='82nd Pennsylvania advanced to the front line relieving the 122nd NY; held until relieved by part of Geary\'s command about 3 p.m.'))
a(C('us-6c-3d-shaler-65ny', 'position', 'R232', 'occupied a position as support to the Twenty-third Pennsylvania Volunteers', 'At 11.15 o clock', J3, t='11:15', approx=True,
    place='in support of the 23rd Pennsylvania', act='65th NY in support of the 23rd Pennsylvania'))
a(C(Sh, 'movement', 'R232', 'under a terrific fire of artillery, to report to General Newton', 'At 3.30 o\'clock', J3, t='15:30',
    place='in rear of the position of the Third Corps, reporting to Newton', act='by direction of Wheaton the brigade was moved to report to Newton; an order from Meade directed it to remain in rear of the Third Corps position; about half a mile to the right at 7 (a.m. or p.m. not printed)',
    key='V6_shaler_330', conflicts=['V6_cobham_2pm'], note='Cobham (R303, XII Corps): about 2 p.m. the brigade (his) retook the breastworks, relieving Shaler\'s'))
a(C(Sh, 'position', 'R303', 'About 2 p. m. the brigade again took possession of the breastworks', 'About 2 p. m.', J3, t='14:00', approx=True,
    place='the breastworks on the Culp\'s Hill front (XII Corps right)', act='Col. Cobham (Geary\'s Second Division, XII Corps): about 2 p.m. his brigade retook the breastworks, relieving Shaler\'s brigade, which had relieved it for a short time',
    key='V6_cobham_2pm', conflicts=['V6_shaler_330'], auth='Col. George A. Cobham', note='Neighbour report (R303). Shaler\'s enclosure: relieved about 3 p.m. by part of Geary\'s command and the brigade reformed.'))
a(C(Sh, 'position', 'R232', 'about half a mile to the right, still in reserve', 'At 7 a. m. [sic, July 4 morning?]', J4, ocr=True,
    place='about half a mile to the right of the Third Corps position, reporting to Newton', act='moved by Newton half a mile to the right, still in reserve; remained until 6 a.m. July 4 when it rejoined the division on Meade\'s order',
    note='The report prints "At 7 a. m." after the 3.30 move; the sequence puts it on the evening of July 3 or the morning of July 4, the 6 a.m. rejoining being on the 4th. Not resolved.'))
a(C(Sh, 'position', 'R223', 'Shaler\'s brigade, of Wheaton\'s division, was held in reserve near the left center.', 'night of July 2', J2,
    place='near the left center', act='Sedgwick (Aug 8): Shaler in reserve near the left centre July 2; later "also ordered to the left, and then to the right, and subsequently returned to the left center"',
    key='V6_sedg_shaler', conflicts=['V6_shaler_7pm', 'V6_shaler_8am']))
a(C(Sh, 'position', 'R232', 'The First Brigade, and the First alone, was directed, and did report', 'July 3 morning (Shaler, Nov 20)', J3,
    place='Geary, commanding Second Division of the Twelfth Corps', act='Shaler\'s Nov 20 letter asks for a correction: Wheaton\'s brigade was not sent to the Twelfth Corps; the First Brigade alone reported to Geary',
    conflicts=['V6_meade_wheaton'], note='Meade/Slocum correspondence in R006/R271 shows the error began with Sedgwick\'s report; Sedgwick\'s endorsement (p.682) accepts the mistake.'))
a(C('us-6c-3d-wheaton', 'position', 'R232', 'brigade remained in the position in which it was placed', 'since the evening of July 2', J2,
    place='the left center (i. e. where it was placed on the evening of July 2)', act='Sedgwick\'s Nov 21 endorsement: Wheaton\'s brigade remained in the position where placed on the evening of July 2, on the left centre; not sent to the Twelfth Corps',
    key='V6_meade_wheaton', conflicts=['V6_sedg_shaler']))
# Eustis: no own report
Eu = 'us-6c-3d-eustis'
a(C(Eu, 'engagement', 'R223', 'went into action about 5 p. m. on the left center', 'about 5 p. m.', J2, t='17:00', approx=True,
    place='the left center, between divisions of the Fifth Corps', act='Sedgwick names Eustis\' brigade (Third Division, under Wheaton) among those that went into action about 5 p.m.', note='Eustis made no report in the volume (see summary: no report by Col. Henry L. Eustis); position claims come from the corps commander and neighbours'))
a(C(Eu, 'position', 'R223', 'brigade was sent to the right center, also reporting to Major-General Newton', 'the next morning (July 3)', J3,
    place='the right center, reporting to Major-General Newton', act='Eustis\' brigade sent to the right centre to report to Newton'))
a(C(Eu, 'night_position', 'R233', 'on the extreme left, and lay on our arms all night', 'night of July 2', J2,
    place='the extreme left', act='2nd Rhode Island (Eustis\' brigade) put in position on the extreme left on the afternoon of July 2 and lay on its arms all night',
    key='V6_rogers_left', conflicts=['V6_sedg_shaler'], note='Rogers writes "the extreme left"; Sedgwick has the Second Brigade of the Third Division go "into action ... on the left center" and then to the right centre'))
a(C('us-6c-3d-eustis-2ri', 'arrival_road', 'R233', 'arrived in the vicinity of Gettysburg on the afternoon of July 2', 'on the afternoon of July 2', J2,
    place='the vicinity of Gettysburg', act='2nd Rhode Island arrived in the vicinity of Gettysburg on the afternoon of July 2 with a battle going on'))
a(C('us-6c-3d-eustis-2ri', 'position', 'R233', 'being used as a reserve, it was always sent to the points most pressed', 'July 3', J3,
    place='various points most pressed', act='the brigade (Eustis) was used as a reserve on July 3, sent to the points most pressed; not called on to fire',
    note='Rogers describes "the brigade to which we are attached"'))
# Neighbour on Eustis: Birney R133
a(C(Eu, 'position', 'R133', 'with Colonel Eustis\' brigade, of the Sixth Corps, is on the front line', 'dispatch of a date to be read from the page', J2,
    place='on the front line, on the left of the Second Corps', act='Birney (III Corps) reports a portion of the First Division with Eustis\' brigade on the front line on the left of the Second Corps',
    auth='Maj. Gen. David B. Birney', note='Neighbour report R133; the sentence is cut by the quote limit. The report\'s date is NOT read here; check the page. Treat as a position at the time of the report.', quote=True))
# Wheaton/Nevin
Ne = 'us-6c-3d-wheaton'
a(C(Ne, 'march', 'R234', 'At 9 p. m. of July 1, left bivouac near Manchester, Md.', 'At 9 p. m. of July 1', J1, t='21:00',
    place='bivouac near Manchester, Md.', act='left Manchester at 9 p.m. with the other brigade of the division, marching toward Taneytown'))
a(C(Ne, 'arrival_road', 'R234', 'were countermarched to the pike, and continued on in the direction of Gettysburg', 'night of July 1-2', J2,
    place='a mile across the Gettysburg pike, countermarched to the pike', road='Gettysburg pike (unnamed in the passage)', act='after a mile beyond the pike the brigades were countermarched to the pike and went on in the direction of Gettysburg',
    key='V6_road_nevin', conflicts=['V6_road_wright', 'V6_upton_330', 'V6_road_butterfield']))
a(C(Ne, 'arrival_road', 'R234', 'At 8 a. m. of July 2, passed through Littlestown, Pa.', 'At 8 a. m. of July 2', J2, t='08:00',
    place='Littlestown, Pa.', act='passed through Littlestown at 8 a.m. July 2, a march of nearly 34 miles in seventeen hours when it halted',
    key='V6_nevin_littlestown', conflicts=['V6_harn_noon']))
a(C(Ne, 'arrival_road', 'R234', 'halted at 2 p. m. within 2 miles of Cemetery Hill', 'at 2 p. m.', J2, t='14:00',
    place='within 2 miles of Cemetery Hill', act='brigade halted within two miles of Cemetery Hill', key='V6_nevin_2pm', conflicts=['V6_arr_wright4', 'V6_arr_meade3', 'V6_arr_howe5']))
a(C(Ne, 'movement', 'R234', 'we were hastily marched forward and to the left of Rocky Hill [Round Top]', 'At 4.30 p. m.', J2, t='16:30',
    place='forward and to the left of Rocky Hill [Round Top], the extreme left, to support the Second and Fifth Corps', gz='GZ-009', act='brigade hastily marched to the left; having the advance, formed the first line of the Third Division',
    key='V6_nevin_430', conflicts=['V6_5pm']))
a(C(Ne, 'engagement', 'R234', 'crossed a narrow swamp, and was halted at 100 yards beyond', 'evening of July 2', J2,
    place='beyond a narrow swamp at the foot of Rocky Hill, left at the foot of a small hill, right in the works connecting with the advance line of the Corps', gz='GZ-009',
    act='after the charge the brigade crossed the swamp and halted 100 yards beyond; remained supporting two regiments of Crawford\'s Reserves until 6 p.m. July 3'))
a(C(Ne, 'position', 'R234', 'of General Crawford\'s Pennsylvania Reserves, until 6 p. m. July 3', 'until 6 p. m. July 3', J3, t='18:00',
    place='the position beyond the swamp', act='supported two regiments of the Pennsylvania Reserves there until 6 p.m. on July 3, then supported Crawford\'s reconnaissance to the left'))
a(C(Ne, 'movement', 'R234', 'orders were received to support a reconnaissance of General Crawford to the left', 'At 6 p. m. of July 3', J3, t='18:00',
    place='to the left', act='62nd NY and 139th Pa. took an active part; recaptured a Napoleon gun and three caissons', conflicts=['V6_bartlett_jul3']))
a(C('us-6c-3d-wheaton-62ny', 'engagement', 'R234', 'the Sixty-second New York having advanced to the extreme left', 'evening of July 3', J3,
    place='the extreme left of Crawford\'s command', act='62nd NY advanced to the extreme left of the reconnaissance, driving a rebel regiment half a mile and capturing many prisoners'))
a(C('us-6c-3d-wheaton-139pa', 'engagement', 'R234', 'advancing on the right of General Crawford\'s command', 'evening of July 3', J3,
    place='the right of Crawford\'s command', act='139th Pa advanced, drove the rebel picket line back half a mile, recaptured one Napoleon gun and three caissons of the Ninth Massachusetts Battery', ocr=False))
a(C('us-6c-3d-wheaton-98pa', 'arrival_road', 'R235', 'to the left of Gettysburg, about 3 p. m., where soon after it formed', 'about 3 p. m.', J2, t='15:00', approx=True,
    place='the vicinity of the battle-field, to the left of Gettysburg', act='98th Pa started from near Manchester about 9 p.m. July 1, marched all night and arrived about 3 p.m. to the left of Gettysburg, formed supporting the Second Corps'))
a(C('us-6c-3d-wheaton-98pa', 'position', 'R235', 'exposed to the enemy\'s fire, but protected by a stone wall', 'During the whole of the 3d', J3,
    place='the front line, behind a stone wall', act='98th Pa lay in the front line on July 3; nine companies on picket the evening of July 4',
    note='Quote is the last clause of "the regiment was lying in the front line of battle, exposed to the enemy\'s fire, but protected by a stone wall"'))
a(C('us-6c-3d-wheaton-139pa', 'arrival_road', 'R237', 'about 3 o\'clock on the afternoon of the 3d', 'about 3 o\'clock on the afternoon of the "3d" [sic, July 2]', J2, t='15:00', approx=True, ocr=True,
    place='the battle-field of Gettysburg, 36 miles', act='139th Pa reached the field about 3 p.m. (printed "the 3d"; the next sentence is the action of July 2)',
    key='V6_moody_3pm', note='Digit OCR "3d" for "2d" is the compiler\'s reading from the sequence (the action "about 5 o\'clock in the evening" and "that night and during the day of the 3d")'))
a(C(Ne, 'night_position', 'R237', 'in the second line of battle, supporting the Pennsylvania Reserves', 'night of July 2 and day of July 3', J3,
    place='the second line of battle, supporting the Pennsylvania Reserves', act='139th Pa lay in the second line supporting the Reserves', ocr=False,
    note='the Moody quote begins "We lay that night" after the evening action'))
a(C('us-6c-3d-wheaton-93pa', 'arrival_road', 'R234', 'the four regiments present comprising it', 'evening of July 1', J1,
    place=None, act='the brigade (Nevin) comprised the 62nd NY, 93rd, 98th and 139th Pa; the 102nd Pa was detailed to guard the wagon train at Westminster',
    note='Used only for the composition on the field (units.json lists the 102nd Pa as part of the brigade; it was at Westminster, see next claim)'))
a(C(Ne, 'position', 'R236', 'Arrived at the latter place on the morning of the 2d', 'morning of July 2', J2,
    place='Westminster (the 102nd Pa guarding the supply train)', gz=None, act='102nd Pennsylvania guarded the supply train to Westminster from Manchester, arrived the morning of July 2 and picketed the roads to Gettysburg, Emmitsburg and Taneytown under Buford\'s instructions',
    note='102nd Pa has no id in units.json; the claim is recorded on the brigade id and names the regiment. Never on the battle-field proper (rejoined the brigade at Middletown July 8).'))
a(C(Ne, 'departure', 'R234', 'I was relieved of the command of the brigade by General F. Wheaton', 'in the evening of July 4', J4,
    place=None, act='Nevin relieved by Wheaton who had temporarily commanded the Third Division'))

# ------------------------------------------------------------ road claims from correspondence (Part 3) for VI Corps
a(C(V6, 'arrival_road', 'OR27-3-D0985', 'to move up toward Gettysburg by Littlestown, as a better and clearer road', 'July 1, 11 p. m.', J1, t='23:00',
    place='toward Gettysburg by Littlestown', act='Butterfield to Sedgwick: in case the movement has not commenced, move toward Gettysburg by Littlestown as a better and clearer road',
    key='V6_road_butterfield', conflicts=['V6_road_wright', 'V6_road_nevin', 'V6_upton_330'], auth='Maj. Gen. Daniel Butterfield (to Sedgwick)',
    note='Part 3 correspondence; letter dated July 1, 1863, 11 p. m.; printed p.469. Order of Army headquarters, not a report of the unit\'s own march.'))
a(C(V6, 'march', 'OR27-3-D0976', 'move your command up to Taneytown to-night', 'July 1, 4.30 p. m.', J1, t='16:30',
    place='Taneytown', act='Butterfield to Sedgwick: move up to Taneytown tonight; train (except ambulances and ammunition) to Westminster south of the railroad', auth='Maj. Gen. Daniel Butterfield (to Sedgwick)',
    note='Part 3 correspondence; printed p.465; Wright confirms receiving orders for Taneytown "just before dark"'))
a(C(V6, 'march', 'OR27-3-D1003', 'orders were sent you to move up your command to Taneytown', 'July 2, 5.30 a. m. (about orders of July 1, 4.30 and 7.30 p. m.)', J2, t='05:30',
    place='Taneytown', act='Butterfield, July 2 5.30 a.m., to Sedgwick: the July 1 orders of 4.30 p.m. and 7.30 p.m. to move up to Taneytown',
    auth='Maj. Gen. Daniel Butterfield (to Sedgwick)', note='Part 3 correspondence, document D1003; printed p.484. The letter header in the index shows "Captain Mendell, 5 a. m." as the first document; this is the following 5.30 a.m. letter in the same record. Check the record boundary before relying on it.'))

# ------------------------------------------------------------ VI Corps artillery brigade (Tompkins)
A6 = 'us-6c-art'
a(C(A6, 'night_position', 'R223', 'The artillery of the corps was placed under the orders of the chief', 'July 2', J2,
    place=None, act='Sedgwick: the artillery of the corps was placed under the orders of the chief of artillery of the Army of the Potomac'))
a(C('us-6c-art-1maa', 'position', 'R238', 'ordered into position near the cemetery, on the left and rear of Gettysburg', 'At about 4 o\'clock p. m. July 3', J3, t='16:00', approx=True, ocr=True,
    place='near the cemetery, on the left and rear of Gettysburg; the first report adds "on the left of the cemetery ... to relieve the First New Hampshire Battery" by Major Osborn', act='Battery A Mass. (McCartney) ordered into position near the cemetery; the enemy was already repulsed; four solid shot fired',
    key='V6_mccartney_4pm', conflicts=['V6_edgell_230']))
a(C('us-6c-art-1maa', 'departure', 'R238', 'this battery marched toward Emmitsburg', 'In the afternoon of July 5', J5,
    place='toward Emmitsburg', act='Battery A Mass. marched toward Emmitsburg in the afternoon of July 5'))
a(C('us-6c-art-1ny', 'march', 'R239', 'I arrived near the battle-field of Gettysburg at 10 p. m. the 2d', 'at 10 p. m. the 2d', J2, t='22:00',
    place='near the battle-field of Gettysburg, having followed the leading brigade of the Third Division', act='Cowan\'s 1st NY battery left camp near Manchester at 9 p.m. July 1 and arrived near the field at 10 p.m. July 2',
    key='V6_cowan_10pm', conflicts=['V6_waterman_3pm', 'V6_adams_4pm', 'V6_harn_noon']))
a(C('us-6c-art-1ny', 'position', 'R239', 'which was less than 100 yards distant', 'early on the morning of the 3d to about 10 a. m.', J3, approx=True,
    place='the front with Newton (First Corps) and Doubleday\'s division; parked near by, then position less than 100 yards from the front', act='Cowan reported to Newton ~10 a.m., was told by Doubleday to park, then Newton showed a position; later (during the cannonade) moved up at a trot and came into position with Doubleday\'s division'))
a(C('us-6c-art-1ny', 'engagement', 'R239', 'to move to the crest farther to my right, with General Webb\'s brigade', 'after the cannonade began (July 3)', J3,
    place='the crest farther to the right, with Webb\'s brigade (II Corps), several other batteries on right and left', act='moved at a gallop to the crest with Webb\'s brigade and fired canister at 200 yards on the assault; the only remaining battery on this part of the hill', gz='GZ-007',
    note='The place is "the crest farther to my right, with General Webb\'s brigade"; GZ-007 The Angle is the compiler\'s identification (Webb\'s brigade held it) and is not named in the passage.'))
a(C('us-6c-art-1ny', 'departure', 'R239', 'I was relieved by Battery G, First Rhode Island Artillery', 'On the morning of the 5th', J5,
    place=None, act='Battery relieved by Battery G 1st RI on the morning of July 5; returned to camp and marched in pursuit with the Sixth Corps'))
a(C('us-6c-art-3ny', 'march', 'R240', 'passed through Littlestown, Pa., about noon of the 2d of July', 'about noon of the 2d of July', J2, t='12:00', approx=True,
    place='Littlestown, Pa.', act='3rd NY battery (Harn) left near Manchester about 8 p.m. July 1 and passed through Littlestown about noon July 2, then encamped near the battle-field',
    key='V6_harn_noon', conflicts=['V6_waterman_3pm', 'V6_adams_4pm', 'V6_cowan_10pm', 'V6_nevin_littlestown']))
a(C('us-6c-art-3ny', 'position', 'R240', 'Battery ordered in front ; went into position.', 'July 3', J3,
    place=None, act='3rd NY battery was in camp awaiting orders hitched up on July 3, then ordered to the front and went into position; moved to the rear July 4',
    ocr=True, note='Poor OCR record; no place named'))
a(C('us-6c-art-1ric', 'march', 'R241', 'at 3 p. m. on the 2d instant, parked near Gettysburg, Pa.', 'at 3 p. m. on the 2d instant', J2, t='15:00',
    place='Gettysburg, Pa. (35 miles; broke camp at 9 p. m. July 1)', act='Waterman\'s Battery C 1st RI parked near Gettysburg at 3 p.m. July 2', key='V6_waterman_3pm', conflicts=['V6_adams_4pm', 'V6_cowan_10pm', 'V6_harn_noon'], ocr=True))
a(C('us-6c-art-1ric', 'position', 'R241', 'took position to left of Gettysburg, supported by a portion of Brigadier-General Webb\'s division', 'July 3, started for the front at 4.30 p. m.; took position at 6 p. m.', J3, t='18:00', ocr=True,
    place='to left of Gettysburg', act='Battery C 1st RI started for the front at 4.30 p.m., stayed within supporting distance until 6 p.m., then took position left of Gettysburg and stayed the night; relieved 5 a.m. July 5'))
a(C('us-6c-art-1rig', 'arrival_road', 'R242', 'entered the Westminster and Gettysburg turnpike, and continued the march rapidly', 'July 1, broke camp at 8 p. m.; after 5 miles', J1, ocr=True,
    place='the Westminster and Gettysburg turnpike', road='Westminster and Gettysburg turnpike', act='Adams\' Battery G 1st RI broke camp at 8 p.m., after a march of 5 miles entered the Westminster and Gettysburg turnpike and marched rapidly throughout the night',
    key='V6_road_adams'))
a(C('us-6c-art-1rig', 'march', 'R242', 'arrived at Gettysburg at 4 p. m.', 'July 2, 4 p. m.', J2, t='16:00', ocr=True,
    place='Gettysburg, 35 miles; crossed the Maryland-Pennsylvania line at sunrise; Littlestown', act='Battery G 1st RI crossed the state line at sunrise, passed Littlestown, arrived Gettysburg at 4 p.m.',
    key='V6_adams_4pm', conflicts=['V6_waterman_3pm', 'V6_cowan_10pm', 'V6_harn_noon']))
a(C('us-6c-art-1rig', 'position', 'R242', 'halted on the right of Hazlett\'s battery', 'July 3', J3,
    place='the right of Hazlett\'s battery (Little Round Top), in reserve during the day; toward night moved 1 mile to the rear', gz='GZ-009', act='Battery G 1st RI moved forward toward the front and centre, formed sections and halted on the right of Hazlett\'s battery; reserve all day; encamped 1 mile to the rear at night'))
a(C('us-6c-art-1rig', 'departure', 'R242', 'relieved Cowan\'s New York Independent Battery', 'July 5, 4 a. m.', J5, t='04:00',
    place='the front (the position of Cowan\'s battery)', act='Battery G relieved Cowan\'s battery at 4 a.m. July 5 and advanced with the corps to Fairfield'))
