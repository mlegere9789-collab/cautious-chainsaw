# Army headquarters and staff (units.json us-aop-hq) plus V/VI Corps approach evidence from OR27 Part 3 correspondence and Part 1 staff reports.
J1, J2, J3, J4, J5, J6, J7 = '1863-07-01', '1863-07-02', '1863-07-03', '1863-07-04', '1863-07-05', '1863-07-06', '1863-07-07'
S = []
a = S.append
HQ = 'us-aop-hq'

# ------------------------------------------------------------ headquarters chain
a(C(HQ, 'movement', 'R017', 'the headquarters of this army moved to Frederick', 'On the 27th', '1863-06-27',
    place='Frederick', act='Norton: on June 27 the headquarters moved to Frederick (from Poolesville on the 26th)', note='Itinerary R007 gives the same: June 27 from Poolesville to Frederick'))
a(C(HQ, 'night_position', 'R006', 'received the orders of the President of the United States placing me in command', 'On June 28', '1863-06-28',
    place='the army at and around Frederick, Md. (the headquarters were at Frederick per Norton and Letterman)', act='Meade took command of the Army of the Potomac on June 28; the army in and around Frederick',
    note='The place of the headquarters is not in this passage: Letterman (R016) gives "Frederick ... the day after the arrival of headquarters there" (arrival June 27); Ingalls: Meade assumed command June 28.'))
a(C(HQ, 'movement', 'R007', 'Headquarters Army of the Potomac moved from Frederick to Middleburg', 'June 29', '1863-06-29',
    place='Frederick -> Middleburg', act='Itinerary of the Army of the Potomac: June 29 headquarters from Frederick to Middleburg'))
a(C(HQ, 'movement', 'R007', 'Headquarters Army of the Potomac moved from Middleburg to Taneytown', 'June 30', '1863-06-30',
    place='Middleburg -> Taneytown', act='Itinerary: June 30 headquarters from Middleburg to Taneytown', note='Norton R017: "On the 30th, general headquarters removed to Taneytown." Ingalls R024: at Taneytown with headquarters on June 30. D0925 (Part 3) dateline: "Headquarters Army of the Potomac, Taneytown, June 30, 1863 - 11.30 a. m."'))
a(C(HQ, 'night_position', 'R017', 'On the 30th, general headquarters removed to Taneytown.', 'On the 30th', '1863-06-30',
    place='Taneytown (a signal station in the church steeple)', act='general headquarters moved to Taneytown June 30; signal station placed in the church steeple'))
a(C(HQ, 'night_position', 'OR27-3-D0925', 'Headquarters Army of the Potomac, Taneytown, June 30, 1863', 'June 30, 11.30 a. m. (dateline)', '1863-06-30', t='11:30',
    place='Taneytown', act='Meade to Reynolds dated from Army headquarters at Taneytown at 11.30 a.m. June 30', auth='Maj. Gen. George G. Meade', ocr=False))
a(C(HQ, 'night_position', 'R017', 'general headquarters remained near Taneytown', 'On July 1', J1,
    place='near Taneytown', act='July 1 headquarters stayed near Taneytown while the army concentrated at Gettysburg', note='Ingalls R024: "On July 1, the headquarters remained at that point [Taneytown]". Datelines "Taneytown" on D0962, D0968, D0969 (near Taneytown), D0976 (4.30 p.m.), D0982 (7.30 p.m.).'))
a(C(HQ, 'night_position', 'OR27-3-D0982', 'Headquarters Army op the Potomac, Taneytown, July 1, 1863 — 7.30 p. m.', 'July 1, 7.30 p. m. (dateline)', J1, t='19:30',
    place='Taneytown', act='Army headquarters at Taneytown at 7.30 p.m. July 1 (Butterfield to the commanding officer at Emmitsburg)', auth='Maj. Gen. Daniel Butterfield'))
a(C(HQ, 'departure', 'R006', 'I broke up my headquarters, which until then had been at Taneytown', 'At 10 p. m. of the 1st', J1, t='22:00',
    place='Taneytown -> the field of Gettysburg', act='Meade: at 10 p.m. July 1 the headquarters were broken up at Taneytown and he proceeded to the field',
    key='hq_depart_10pm', conflicts=['hq_depart_12'], note='Meade, army commander\'s report, printed p.115'))
a(C(HQ, 'departure', 'OR27-3-D1003', 'after waiting until 12 to see you, left for the field of operations', 'after waiting until 12 [midnight]', J2, t='00:00', approx=True,
    place='Taneytown -> the field of operations', act='Butterfield to Sedgwick, July 2 5.30 a.m.: Meade waited until 12 (midnight) to see Sedgwick, then left for the field; Butterfield remained at Taneytown to communicate with Sedgwick',
    key='hq_depart_12', conflicts=['hq_depart_10pm'], auth='Maj. Gen. Daniel Butterfield (to Sedgwick)',
    note='Part 3 correspondence, p.484. "12" is taken as midnight: the letter is of 5.30 a.m. July 2 and says "12" without a. m./p. m. Meade has the headquarters leaving at 10 p.m.'))
a(C(HQ, 'arrival_road', 'R006', 'and proceeded to the field, arriving there at 1 a. m. of the 2d', 'arriving at 1 a. m. of the 2d', J2, t='01:00',
    place='the field (Gettysburg)', act='Meade arrived on the field at 1 a.m. July 2', key='hq_arr_1am', conflicts=['hq_arr_2am', 'C-001'],
    note='Meade, army commander\'s report, printed p.115. Gate: arrivals.json Q04 gate for us-aop-hq has earliest 00:00, default 01:00, latest 04:00; nothing here contradicts it.'))
a(C(HQ, 'arrival_road', 'R028', 'reached Gettysburg about 2 a. m. of the 2d', 'about 2 a. m. of the 2d', J2, t='02:00', approx=True,
    place='Gettysburg', act='Hunt: on the night of July 1 the commanding general left Taneytown and reached Gettysburg about 2 a.m.',
    key='hq_arr_2am', conflicts=['hq_arr_1am', 'C-001'], auth='Brig. Gen. Henry J. Hunt',
    note='Hunt, Chief of Artillery, printed p.232. The PDF alternative "about 04:00 (EPP)" has no OR support (OR27-CLAIM-CHECKS d1).'))
a(C(HQ, 'position', 'R028', 'I examined the positions at Cemetery Hill, so far as the darkness would permit', 'soon after the arrival, about 2 a. m. (July 2)', J2, approx=True,
    place='Cemetery Hill', gz='GZ-003', act='Hunt: on arrival Meade told him to see to the artillery; Hunt examined Cemetery Hill by night, then accompanied the general and Howard on an inspection of the west front held by the Second and Third Corps',
    auth='Brig. Gen. Henry J. Hunt', note='Does not say where the headquarters stood on the night of July 1-2.'))
a(C(HQ, 'position', 'R017', 'at the point selected for headquarters of the army for that day', 'July 2, an early hour', J2,
    place='the point selected for the headquarters of the army (not named)', act='Norton: on July 2 the signal officers were already on the field and communication was open from General Meade\'s headquarters to every corps commander before 11 a.m.',
    note='The place is not named in the passage. The Leister house (ledger) is not named anywhere in the OR passages read for this scope.'))
a(C(HQ, 'position', 'OR27-3-D2099', 'The Second Corps is up and the Fifth is momentarily expected', 'July 2, 6.15 a. m.', J2, t='06:15',
    place='Army headquarters on the field (Williams to Butterfield at Taneytown)', act='S. Williams, Asst. Adjt. Gen., from the field at 6.15 a.m.: the Second Corps is up and the Fifth Corps is momentarily expected; the enemy is massing on our right',
    auth='Brig. Gen. Seth Williams (Asst. Adjt. Gen.)', key='hq_williams_615', conflicts=['hq_5c_7am', 'V_arr_sykes8'],
    note='Part 3, printed p.1086-1087 (page is interpolated). Signer read from the text "S. WILLIAMS". V Corps had NOT arrived at 6.15 a.m.'))
a(C('us-5c', 'arrival_road', 'OR27-3-D2099', 'the Fifth is momentarily expected', 'July 2, 6.15 a. m.', J2, t='06:15',
    place='on the field (Army headquarters expecting it)', act='at 6.15 a.m. the Fifth Corps was not yet on the field but "momentarily expected" (Williams)', key='V_arr_williams615', conflicts=['hq_5c_7am', 'V_arr_sykes8', 'C-003'],
    auth='Brig. Gen. Seth Williams (Asst. Adjt. Gen.)', note='Part 3, printed p.1086-1087 (interpolated)'))
a(C('us-5c', 'arrival_road', 'R006', '7 a. m. the Second and Fifth Corps, with the rest of the Third', 'By 7 a. m.', J2, t='07:00',
    place='the ground (Gettysburg)', act='Meade: by 7 a.m. the Second and Fifth Corps and the rest of the Third had reached the ground; the Fifth was held in reserve pending the Sixth',
    key='hq_5c_7am', conflicts=['V_arr_sykes8', 'hq_williams_615', 'C-003'], note='Meade, printed p.115. Compare Sykes (about 8 a.m.), Barnes and Chamberlain (about 7 a.m.), Williams at 6.15 a.m. (not yet up).'))
a(C('us-5c', 'position', 'R006', 'The Fifth Corps, pending the arrival of the Sixth, was held in reserve.', 'July 2, forenoon', J2,
    place='in reserve (Sykes: near the Rock Creek bridge on the Baltimore pike within reach of the XII Corps)', act='Meade: Fifth Corps held in reserve until the Sixth arrived', gz='GZ-039'))
a(C('us-5c', 'movement', 'R006', 'most fortunately arrived and took position on the left of the Third', 'soon after the assault commenced (July 2)', J2,
    place='on the left of the Third Corps', act='Meade: Fifth Corps arrived and took position on the left of the Third, Sykes sending a force to the Round Top ridge', gz='GZ-009'))
a(C(HQ, 'movement', 'R006', 'to await the arrival of the Fifth Corps and to post it', 'About 3 p. m.', J2, t='15:00', approx=True,
    place='the extreme left (found Sickles advanced half a mile or three-quarters in front of the Second Corps line)', act='Meade about 3 p.m. rode to the extreme left to await and post the Fifth Corps and found the Third Corps advanced; the enemy opened while he talked with Sickles',
    key='hq_3pm_left', conflicts=['C-010']))
a(C(HQ, 'movement', 'OR27-3-D2102', 'The commanding general desires to see you at headquarters', 'July 2, 3 p. m. (circular)', J2, t='15:00',
    place='at headquarters (hour left blank in the OCR text)', act='Butterfield circular of 3 p.m. July 2 to Sedgwick, Sickles, Sykes, Newton, Slocum, Howard, Hancock: Meade wants to see them at headquarters at "—" p.m. (the council of corps commanders)',
    auth='Maj. Gen. Daniel Butterfield', key='hq_council_call', conflicts=['C-024'],
    note='Part 3, printed p.1086-1087 (interpolated). The hour of the meeting is a blank in the printed text.'))
a(C(HQ, 'night_position', 'R006', 'council of war held at General Meade\'s headquarters', 'on the evening of the 2d July', J2,
    place='General Meade\'s headquarters', act='Gibbon (letter of March 1864 printed in Meade\'s report): a council of war was held at Meade\'s headquarters on the evening of July 2; the council met in a room not to exceed 10 feet square (Gibbon, p.127, separate claim)',
    key='hq_council_gibbon', conflicts=['C-024'], auth='Brig. Gen. John Gibbon',
    note='Quote is from Gibbon\'s letter inside R006; check the exact wording on the page. Sykes (R006 p.124): "a meeting on the night of the 2d and 3d of July". Sedgwick: "the evening".'))
a(C(HQ, 'night_position', 'R006', 'present at a meeting on the night of the 2d and 3d of July', 'on the night of the 2d and 3d of July', J2,
    place='(Meade\'s headquarters)', act='Sykes (letter of Mar 10, 1864, printed in Meade\'s report): present at a meeting of Meade and the corps commanders on the night of the 2d and 3d',
    key='hq_council_sykes', conflicts=['C-024', 'hq_council_gibbon'], auth='Maj. Gen. George Sykes', note='Sykes\' letter is dated March 10, 1864; it is a later recollection, not a contemporary record.'))
a(C(HQ, 'engagement', 'R017', 'that at General Meade\'s headquarters twice, broken up by the rapid advance', 'July 2, from about 5.30 p. m.', J2, t='17:30', approx=True,
    place='General Meade\'s headquarters (signal station)', act='Norton: the signal station at Round Top once, and that at General Meade\'s headquarters twice, were broken up by the enemy\'s advance and fire on July 2, then reoccupied',
    note='The sentence says the stations were "broken up by the rapid advance of the enemy and the severity of the fire"'))
a(C(HQ, 'movement', 'R028', 'found he had left his headquarters', 'July 3, after the cannonade began (about 1 p. m.)', J3, approx=True,
    place='Army headquarters (left by Meade)', act='Hunt, going to report to the commanding general after the cannonade began, found Meade had left his headquarters; then rode the line',
    auth='Brig. Gen. Henry J. Hunt', note='Norton: the signal station at Meade\'s headquarters was inoperative for a couple of hours at the cannonade/assault on July 3.'))
a(C(HQ, 'night_position', 'R017', 'removed his headquarters to a strip of woods on the Taneytown road', 'In the evening of July 3', J3,
    place='a strip of woods on the Taneytown road', gz='GZ-042', road='Taneytown Road', act='Norton: the evening of July 3 Meade removed his headquarters to a strip of woods on the Taneytown road; a signal station set up there',
    key='hq_jul3_eve', note='The ledger (arrivals.json) says on Jul 3 Meade moves to Powers Hill; the OR passages read here do not name Powers\' Hill. Both are recorded; not resolved here.'))
a(C(HQ, 'night_position', 'R017', 'General Meade\'s headquarters were removed to the Baltimore pike', 'July 4', J4,
    place='the Baltimore pike', gz='GZ-039', road='Baltimore Pike', act='Norton: July 4 Meade\'s headquarters were removed to the Baltimore pike, the terminus of all signal lines', key='hq_jul4_pike'))
a(C(HQ, 'night_position', 'OR27-3-D1120', 'Headquarters Army op the Potomac, Gettysburg, July 5, 1863 — 8 p. m.', 'July 5, 8 p. m. (dateline)', J5, t='20:00',
    place='Gettysburg', act='dateline "Headquarters Army of the Potomac, Gettysburg" at 8 p.m. July 5', ocr=True, note='Index signer for D1120 reads "WM. F. S. [SMITH.]" in the heading but the letter is Meade\'s reply to W. F. Smith; the OCR dateline is quoted exactly.'))
a(C(HQ, 'night_position', 'OR27-3-D1207', 'Headquarters Army of the Potomac, Gettysburg, July 6, 1863—4.40 p. m.', 'July 6, 4.40 p. m. (dateline)', J6, t='16:40',
    place='Gettysburg', act='Meade to Couch dated from Army headquarters at Gettysburg, 4.40 p.m. July 6', auth='Maj. Gen. George G. Meade',
    key='hq_jul6_gett', conflicts=['hq_ingalls_jul6']))
a(C(HQ, 'night_position', 'R024', 'The headquarters were in Frederick the night of the 6th.', 'the night of the 6th', J6,
    place='Frederick', act='Ingalls: headquarters were in Frederick the night of July 6 (Meade ordered the army to concentrate at Middletown on the evening of the 7th)',
    key='hq_ingalls_jul6', conflicts=['hq_jul6_gett', 'hq_jul7_fred'], auth='Brig. Gen. Rufus Ingalls'))
a(C(HQ, 'movement', 'R007', 'Headquarters Army of the Potomac moved from Gettysburg', 'July 7', J7,
    place='Gettysburg -> Frederick', act='Itinerary: July 7 headquarters from Gettysburg to Frederick', key='hq_jul7_fred', conflicts=['hq_ingalls_jul6'], note='Norton R017: "July 7, the headquarters of the army moved to Frederick".'))
# departure/final
a(C(HQ, 'departure', 'R017', 'July 7, the headquarters of the army moved to Frederick', 'July 7', J7,
    place='Frederick', act='Norton: headquarters moved to Frederick on July 7', conflicts=['hq_ingalls_jul6']))
# Cannonade-onset values (Union witnesses in this scope)
a(C(HQ, 'engagement', 'R006', 'when the enemy opened from over one hundred and twenty-five guns', 'At 1 p. m. on the 3d', J3, t='13:00',
    place=None, act='Meade: the enemy opened with over 125 guns at 1 p.m. July 3 against the centre and left; cannonade over two hours', key='cannon_meade', conflicts=['cannon_mcg'], ocr=True, note='The printed text reads "till 1 p. m. on the 3a" (OCR)'))
a(C(HQ, 'engagement', 'R028', 'when the enemy opened, at about 1 p. m., along his whole right', 'at about 1 p. m.', J3, t='13:00', approx=True,
    place='on top of Round Top with Lt. Rittenhouse', gz='GZ-010', act='Hunt was on the top of Round Top with Lt. Rittenhouse when the Confederate cannonade opened at about 1 p.m.; estimated 100-120 guns', key='cannon_hunt', conflicts=['cannon_mcg'],
    auth='Brig. Gen. Henry J. Hunt'))
a(C('us-5c', 'engagement', 'R187', 'At 1 p. m. the enemy commenced', 'At 1 p. m.', J3, t='13:00',
    place=None, act='Sykes: at 1 p.m. the enemy commenced a furious cannonade from more than one hundred guns, partly on the Fifth and Sixth Corps', key='cannon_sykes', conflicts=['cannon_mcg']))
a(C('us-art-reserve-mcgilvery-5ma', 'engagement', 'R319', 'About 1 o\'clock the enemy opened a heavy fire from a long line', 'About 1 o\'clock', J3, t='13:00', approx=True,
    place=None, act='Phillips: about 1 o\'clock the enemy opened from a long line of batteries, kept up for an hour', key='cannon_phillips', conflicts=['cannon_mcg']))
a(C(HQ, 'engagement', 'R316', 'About 2 p. m. the enemy commenced a heavy artillery fire', 'About 2 p. m.', J3, t='14:00', approx=True,
    place='that portion of our line behind which the ammunition train was parked', act='Gillett (ordnance officer, Artillery Reserve): about 2 p.m. heavy artillery fire on that part of the line behind which the train was parked', key='cannon_gillett', conflicts=['cannon_mcg'], auth='Lieut. Cornelius Gillett'))

# ------------------------------------------------------------ staff
a(C(HQ, 'movement', 'R189', 'Warren, of the staff of General Meade, came up, riding rapidly from the left', 'between 4 and 6 o\'clock in the afternoon (July 2)', J2, approx=True,
    place='the field near the Taneytown road, from the left; pointing out the Round Top', gz='GZ-009', road='Taneytown Road',
    act='Barnes: Warren (Meade\'s staff, chief engineer) rode up from the left, pointed out the Round Top and urged assistance; Sykes yielded and Vincent\'s brigade was sent', auth='Brig. Gen. James Barnes',
    note='Staff officer: Warren has no report in the volume index; his position is documented here from the divisions he directed.'))
a(C(HQ, 'movement', 'R217', 'under the direction of General Warren, chief engineer Army of the Potomac', 'about 4 p. m. (July 2)', J2, t='16:00', approx=True,
    place='Round Top ridge', gz='GZ-009', act='Garrard: Warren led the leading regiment of the Third Brigade (140th NY) to the left up Round Top ridge', auth='Col. Kenner Garrard'))
a(C(HQ, 'movement', 'R187', 'posted under the direction of General Warren, chief engineer of this army', 'afternoon of July 2', J2, approx=True,
    place='the rocky height (Vincent and Weed on the ridge)', gz='GZ-009', act='Sykes: Vincent\'s and Weed\'s troops posted under Warren\'s direction'))
a(C(HQ, 'movement', 'R218', 'Captain Moore, an aide of the general commanding the army', 'about 2 o\'clock (July 2)', J2, t='14:00', approx=True,
    place='from the field for fresh troops, to Crawford\'s division', act='Crawford: Capt. Moore, an aide of Meade, came from the field for fresh troops and guided the Pennsylvania Reserves to the left', auth='Brig. Gen. Samuel W. Crawford',
    note='Moore is Meade\'s aide; time from the 2 o\'clock order in the same paragraph'))
a(C(HQ, 'position', 'R335', 'whom I turned over to General Patrick', 'about noon on the 3d', J3, t='12:00', approx=True,
    place='on the road behind the left centre, where the Artillery Reserve ammunition train stood', act='Maj. Ewing handed 400-500 stragglers to the Provost-Marshal-General, Patrick, on the road behind the lines during the cannonade/assault of July 3', auth='Maj. Charles Ewing',
    note='Patrick has no operational report in the volume (R025 is a captures estimate).'))
a(C(HQ, 'arrival_road', 'R024', 'On the morning of July 3, 1 arrived at Gettysburg', 'On the morning of July 3', J3,
    place='Gettysburg', act='Ingalls (Chief Quartermaster) arrived at Gettysburg on the morning of July 3, having been at Taneytown with headquarters on June 30 and July 1', auth='Brig. Gen. Rufus Ingalls', ocr=True,
    note='OCR "1 arrived" for "I arrived"'))
a(C(HQ, 'position', 'R024', 'had been assembled at Westminster, on the pike and railroad leading to Baltimore', 'July 1', J1,
    place='Westminster, about 25 miles in rear of the army', act='Ingalls: the army\'s wagon trains were assembled at Westminster on the pike and railroad to Baltimore; no baggage allowed forward', auth='Brig. Gen. Rufus Ingalls',
    note='Letterman R016: on July 1 the trains were not permitted to go farther; on the 2d they were ordered farther to the rear, near Westminster.'))
a(C(HQ, 'night_position', 'R016', 'on the 2d, were ordered farther to the rear, near Westminster', 'July 2', J2,
    place='near Westminster, nearly 25 miles from the battlefield', act='Letterman: medical trains were ordered farther to the rear near Westminster on July 2', auth='Surg. Jonathan Letterman'))
a(C(HQ, 'position', 'OR27-3-D1003', 'proceed with your battalion to the vicinity of Westminster and Union Bridge', 'July 2, 5 a. m.', J2, t='05:00',
    place='Westminster and Union Bridge (to guard the trains)', act='Butterfield ordered Capt. Mendell\'s Battalion of Engineers to the vicinity of Westminster and Union Bridge to guard the trains against cavalry raids', auth='Maj. Gen. Daniel Butterfield (to Mendell)',
    note='Engineer Battalion (Mendell) is part of the Engineer Brigade (Benham), which has no unit id in units.json'))
a(C(HQ, 'night_position', 'OR27-3-D1001', 'Headquarters Army of the Potomac, [Ta7ieytown], July 2, 1863 — 2.40 a. m.', 'July 2, 2.40 a. m. (dateline)', J2, t='02:40',
    place='Taneytown (bracketed by the compiler)', act='Butterfield, chief of staff, still at Taneytown at 2.40 a.m. July 2 (after Meade left), awaiting Sedgwick', ocr=True, auth='Maj. Gen. Daniel Butterfield',
    note='The place in the dateline is the bracketed word "[Taneytown]" (OCR "Ta7ieytown") in the printed record'))
a(C(HQ, 'position', 'R017', 'A station was established upon Round Top Mountain, on the left of our line', 'Before 11 a. m. July 2', J2, t='11:00', approx=True,
    place='Round Top Mountain, on the left of our line', gz='GZ-009', act='Signal station on Round Top by 11 a.m. July 2; at 3.30 p.m. the signal officer saw the enemy massing on Sickles\' left', auth='Capt. Lemuel B. Norton',
    note='"Round Top Mountain" taken to be the Little Round Top station, with the signal officer at 3.30 p.m. reporting on Sickles\' left; the OR does not say which peak. Not resolved.'))

# ------------------------------------------------------------ V Corps approach, Part 3
a(C('us-5c', 'movement', 'OR27-3-D0919', 'Fifth Corps to Hanover', 'June 30 (orders of the day)', '1863-06-30',
    place='Hanover', act='Army orders of June 30: Headquarters at Taneytown; Fifth Corps to Hanover (ordered destination)', note='The corps actually reached Union Mills on June 30 (Sykes), going to Hanover July 1.', auth='Brig. Gen. Seth Williams (Asst. Adjt. Gen.)'))
a(C('us-5c-1d', 'night_position', 'OR27-3-D0935', 'Barnes and Ayres are here. I expect the artillery soon.', 'June 30, 6.30 p. m.', '1863-06-30', t='18:30',
    place='Union Mills (Headquarters Fifth Corps, Union Mills)', act='Sykes at Union Mills 6.30 p.m. June 30: the First (Barnes) and Second (Ayres) divisions there, artillery expected soon', auth='Maj. Gen. George Sykes'))
a(C('us-5c-3d', 'night_position', 'OR27-3-D0935', 'encamp between Frizellburg and this place', 'June 30, 6.30 p. m. (directed to march till dark)', '1863-06-30', t='18:30', approx=True,
    place='between Frizellburg and Union Mills', act='Crawford\'s division could not reach Union Mills; directed to march till dark and encamp between Frizellburg and Union Mills', auth='Maj. Gen. George Sykes',
    note='Crawford\'s men marched about 25 miles on June 30 (Sykes)'))
a(C('us-5c-3d', 'march', 'OR27-3-D1001', 'Crawford\'s division had not reached Hanover at the hour I left there', 'July 1, at 7 p. m.', J1, t='19:00',
    place='Hanover', act='Sykes (12.30 a.m. July 2): Crawford\'s division had not reached Hanover when the rest of the corps left at 7 p.m.', auth='Maj. Gen. George Sykes', ocr=False,
    note='Crawford R218: at daylight July 2 near McSherrystown, having marched most of the night'))
a(C('us-5c', 'night_position', 'OR27-3-D1001', 'I left Hanover at 7 p. m., and marched 9 miles to Bonaughtown', 'July 1, 7 p. m.', J1, t='19:00',
    place='Hanover -> Bonaughtown (9 miles), en route to Gettysburg; dateline "Headquarters Fifth Corps, Bonaughtown, July 2, 1863 - 12.30 a. m." (OCR 13.30)', ocr=True,
    act='Sykes to Butterfield: on receipt of Meade\'s note to Slocum of the 1st the corps left Hanover at 7 p.m. and marched 9 miles to Bonaughtown; to resume the march at 4 a.m.', auth='Maj. Gen. George Sykes',
    key='V_sykes_7pm_p3', conflicts=['V_rice_hanover_left5'], note='Contemporary dispatch (Part 3, printed p.483); agrees with the itinerary (7 p.m., Bonaughtown) and with Sheridan 6 p.m. only roughly. Rice (5 p.m.) differs.'))
a(C('us-5c', 'movement', 'OR27-3-D1001', 'I shall resume my march at 4 a. m.', 'July 2, 4 a. m.', J2, t='04:00',
    place='Bonaughtown -> Gettysburg', act='Sykes announced a 4 a.m. start from Bonaughtown on July 2', auth='Maj. Gen. George Sykes', note='Same document; the itinerary R187 says "Marched at 4 a. m. for Gettysburg, 6 miles"'))
a(C('us-5c', 'arrival_road', 'OR27-3-D0983', 'Sykes has been ordered up from Hanover to Gettysburg', 'July 1, 7.30 p. m. (dateline)', J1, t='19:30',
    place='Hanover -> Gettysburg', act='Butterfield to Sedgwick: Sykes had been ordered up from Hanover to Gettysburg (Slocum from Littlestown, Hancock from Taneytown)', auth='Maj. Gen. Daniel Butterfield (to Sedgwick)',
    note='Part 3 p.467-468. Index lists the signer as Slocum (OCR/segmentation); the closing signature in the text is Butterfield\'s. Sykes cites "General Meade\'s note to General Slocum of the 1st instant".'))
a(C('us-5c-1d-tilton', 'position', 'OR27-3-D1041', 'reported by Colonel Garrard and Colonel Tilton as advancing on our left', 'July 3, 1.45 p. m. (received 2.35)', J3, t='13:45',
    place='our left and front (the Fifth Corps line)', act='Sykes\'s dispatch of 1.45 p.m. July 3: the enemy reported by Garrard and Tilton advancing on the left and front', auth='Maj. Gen. George Sykes', ocr=False,
    note='Part 3 p.500; Tilton\'s First Brigade held Little Round Top from the morning of July 3 (Barnes)'))
a(C('us-5c-2d-weed', 'position', 'OR27-3-D1041', 'reported by Colonel Garrard and Colonel Tilton as advancing on our left', 'July 3, 1.45 p. m.', J3, t='13:45',
    place='our left and front', act='Garrard\'s brigade reporting the enemy advancing on the left at 1.45 p.m. July 3', auth='Maj. Gen. George Sykes'))
a(C('us-5c', 'departure', 'OR27-3-D1090', 'you can move out on the road to Emmitsburg, the left-hand road', 'July 5 (hour not printed)', J5,
    place='the road to Emmitsburg, the left-hand road, a short distance on the Taneytown road, leaving it before it crosses Rock Creek; then 4 or 5 miles, wait for Howard', road='Emmitsburg road (left-hand road)', gz='GZ-041',
    act='Butterfield\'s order of the route for the Fifth Corps on July 5', auth='Maj. Gen. Daniel Butterfield (to Sykes)', note='Part 3 p.530. Order only; hour not printed.'))
a(C('us-5c', 'departure', 'OR27-3-D1091', 'My troops are all in hand, excepting the pickets', 'July 5, 4.30 a. m.', J5, t='04:30',
    place='the Fifth Corps positions', act='Sykes 4.30 a.m. July 5: troops in hand except pickets; will move as soon as pickets are recalled', auth='Maj. Gen. George Sykes', key='V_dep_430', conflicts=['V_dep_morning5', 'V_dep_5pm']))
a(C('us-5c', 'night_position', 'OR27-3-D1122', 'My camp is on the south side of this creek, on the direct road', 'July 5, 9.30 p. m.', J5, t='21:30',
    place='Marsh Creek, south side, on the direct road from Gettysburg to Emmitsburg', gz='GZ-068', road='Emmitsburg road',
    act='Sykes\'s camp at 9.30 p.m. July 5 on Marsh Creek on the direct Gettysburg-Emmitsburg road; to march at 4 a.m.; Howard on the Taneytown road', auth='Maj. Gen. George Sykes',
    key='V_marsh_creek', conflicts=['V_clark_carolina'], note='Part 3 p.540 (interpolated page). Clark (20th Maine) bivouacked near Marsh Creek at midnight after a 10-mile night march.'))
a(C('us-5c', 'departure', 'OR27-3-D1160', 'My column was already en route for Emmitsburg', 'July 6, 4.20 a. m.', J6, t='04:20',
    place='toward Emmitsburg, on Marsh Creek on the direct road', gz='GZ-068', act='Sykes 4.20 a.m. July 6: the column was already en route for Emmitsburg; troops on Marsh Creek', auth='Maj. Gen. George Sykes', ocr=False))
a(C('us-5c', 'night_position', 'OR27-3-D1168', 'troops are encamped at the junction of the Emmitsburg pike and the Fairfield road', 'July 6, 1 p. m.', J6, t='13:00',
    place='the junction of the Emmitsburg pike and the Fairfield road (headquarters in the woods just behind it)', road='Emmitsburg pike / Fairfield road', act='Sykes July 6 1 p.m.: troops encamped at the junction of the Emmitsburg pike and the Fairfield road', auth='Maj. Gen. George Sykes'))
a(C('us-5c', 'night_position', 'OR27-3-D1173', 'I will move at 4 a. m. to-morrow', 'July 6, 7.30 p. m. (Moritz Cross-Roads)', J6, t='19:30',
    place='Moritz Cross-Roads', act='Sykes at Moritz Cross-Roads at 7.30 p.m. July 6 ("Morits Cross-Eoads" in the OCR dateline); will move at 4 a.m. July 7 by the Fairfield and Littlestown road', auth='Maj. Gen. George Sykes', ocr=True))
a(C('us-5c', 'march', 'R007', 'the Fifth Corps from Union Mills, via Hanover and McSherrystown, to Bonaughtown', 'July 1', J1,
    place='Union Mills -> Hanover -> McSherrystown -> Bonaughtown', act='Itinerary of the Army of the Potomac: July 1 the Fifth Corps from Union Mills via Hanover and McSherrystown to Bonaughtown', note='Printed p.144'))
a(C('us-5c', 'night_position', 'R007', 'the Fifth Corps from Ballinger\'s Creek, via Frederick and Mount Pleasant, to Liberty', 'June 29', '1863-06-29',
    place='Ballinger\'s Creek -> Frederick -> Mount Pleasant -> Liberty', act='Itinerary: June 29 the Fifth Corps to Liberty', note='Printed p.144'))
a(C('us-5c', 'march', 'R007', 'the Fifth Corps from Liberty, via Johnsville, Union Bridge, and Union, to Union Mills', 'June 30', '1863-06-30',
    place='Liberty -> Johnsville -> Union Bridge -> Union -> Union Mills', act='Itinerary: June 30 the Fifth Corps to Union Mills', note='Printed p.144'))
a(C('us-5c', 'departure', 'R007', 'the Fifth Corps to Marsh Run', 'July 5', J5,
    place='Marsh Run', act='Itinerary: July 5 the Fifth Corps to Marsh Run', note='Printed p.145; the corps\' own dispatch says Marsh Creek (D1122)'))
a(C('us-5c-art', 'movement', 'R028', 'of the Fifth Corps arrived on the field between 4 and 5 p. m.', 'between 4 and 5 p. m.', J2, approx=True,
    place='the field', act='Hunt: the Fifth Corps artillery (Hazlett, Walcott, Watson with the First Division; Gibbs and Barnes with the Second) arrived between 4 and 5 p.m.', auth='Brig. Gen. Henry J. Hunt',
    key='V_art_hunt', conflicts=['V_gibbs_8am']))
a(C('us-art-reserve-mcgilvery-9ma', 'position', 'R028', 'which I ordered into position on the left of Clark\'s', 'about 3.30 p. m. and after (July 2)', J2, approx=True,
    place='left of Clark\'s battery (III Corps line near the Peach Orchard)', gz='GZ-014', act='Hunt ordered McGilvery\'s three batteries (9th Mass.-Bigelow, 5th Mass.-Phillips, 15th NY-Hart) into position on the left of Clark\'s (III Corps) at about 3.30 p.m.', auth='Brig. Gen. Henry J. Hunt'))

# ------------------------------------------------------------ VI Corps approach evidence (Part 3)
a(C('us-6c', 'arrival_road', 'OR27-3-D2099', 'General Sedgwick was on the way with him to Taneytown', 'July 2, 6.15 a. m. (reporting the previous evening)', J1,
    place='the road to Taneytown, then turned back to come up via Littlestown', road='Littlestown route', act='S. Williams: Newton reports Sedgwick was on the way to Taneytown with him when he got the order to come up via Littlestown and turned back at once',
    auth='Brig. Gen. Seth Williams (Asst. Adjt. Gen.)', key='V6_road_williams', conflicts=['V6_road_wright', 'V6_road_nevin'],
    note='Part 3, printed p.1086-1087 (interpolated). Corroborates the Littlestown route (Nevin, Harn, Adams) and Butterfield\'s 11 p.m. order.'))
a(C('us-6c', 'arrival_road', 'OR27-3-D0983', 'you will use your discretion in taking it', 'July 1, 7.30 p. m.', J1, t='19:30', ocr=True,
    place='the shortest road to Gettysburg', act='Butterfield to Sedgwick: take the shortest road to Gettysburg at his discretion; report in person at Taneytown', auth='Maj. Gen. Daniel Butterfield (to Sedgwick)'))
