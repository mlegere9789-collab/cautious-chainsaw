# Artillery Reserve (Tyler): brigades Ransom, McGilvery, Taft, Huntington, Fitzhugh; train guard; OR27 pt.1 R315-R335 (+ Hunt R028, Itinerary R007).
J1, J2, J3, J4, J5 = '1863-07-01', '1863-07-02', '1863-07-03', '1863-07-04', '1863-07-05'
S = []
a = S.append
AR = 'us-art-reserve'
RB = 'us-art-reserve-ransom'
MB = 'us-art-reserve-mcgilvery'
TB = 'us-art-reserve-taft'
HB = 'us-art-reserve-huntington'
FB = 'us-art-reserve-fitzhugh'

# ------------------------------------------------------------ Tyler R315 (corps level)
a(C(AR, 'night_position', 'R315', 'The reserve remained in camp near Frederick City.', 'June 28', '1863-06-28', place='near Frederick City', act='reserve in camp near Frederick'))
a(C(AR, 'march', 'R315', 'Marched from Frederick City to about 1 mile beyond Bniceville', 'June 29', '1863-06-29', place='about 1 mile beyond Bruceville (OCR "Bniceville")', ocr=True, act='marched from Frederick City to about a mile beyond Bruceville'))
a(C(AR, 'march', 'R315', 'encamped a short distance beyond the village, on the Emmitsburg turnpike', 'June 30', '1863-06-30',
    place='Taneytown, a short distance beyond the village, on the Emmitsburg turnpike', road='Emmitsburg turnpike (from Taneytown)', act='marched to Taneytown and encamped beyond the village on the Emmitsburg turnpike'))
a(C(AR, 'march', 'R315', 'I was ordered to proceed to Gettysburg with about eight batteries', 'On the evening of July 1', J1,
    place='Taneytown -> Gettysburg', act='Tyler ordered to Gettysburg with about eight batteries to report to Hancock; detailed the brigades of Ransom and Fitzhugh', key='AR_jul1_eve'))
a(C(AR, 'arrival_road', 'R315', 'in the absence of General Hancock, at about 10.30 p. m.', 'at about 10.30 p. m.', J1, t='22:30', approx=True,
    place='Gettysburg (reported to General Gibbon)', act='the two brigades (Ransom, Fitzhugh) left Taneytown about sundown and reported to Gibbon at about 10.30 p.m.',
    key='AR_gibbon_1030', conflicts=['AR_fitzhugh_8am', 'AR_weir_jul2']))
a(C(AR, 'night_position', 'R315', 'on the Taneytown road, near the cross-road leading to Two Taverns', 'night of July 1', J1,
    place='the Taneytown road, near the cross-road leading to Two Taverns', gz='GZ-042', road='Taneytown Road', act='Tyler encamped that night on the Taneytown road near the cross-road to Two Taverns'))
a(C(AR, 'position', 'R315', 'placed them in park behind the line of battle of the Third Corps', 'In the morning of July 2', J2,
    place='behind the line of battle of the Third Corps, about 1 1/2 miles from Gettysburg (OCR "li")', ocr=True, act='Tyler moved the brigades of Ransom and Fitzhugh and parked them behind the Third Corps line'))
a(C(AR, 'arrival_road', 'R315', 'left Taneytown at early dawn, under command of Major McGilvery', 'July 2, early dawn', J2,
    place='Taneytown', act='the remainder of the reserve batteries left Taneytown at early dawn under McGilvery with the ammunition train',
    key='AR_dawn', note='The reserve\'s own itinerary (R007) has Ransom\'s and Fitzhugh\'s brigades leave Taneytown for Gettysburg on July 1'))
a(C(AR, 'arrival_road', 'R315', 'reported to me with the ammunition train about 10.30 a. m.', 'about 10.30 a. m.', J2, t='10:30', approx=True,
    place='on a cross-road between the main road and the Baltimore turnpike', road='Baltimore Pike (cross-road to it)', gz='GZ-039', act='the rest of the reserve batteries and the ammunition train reported to Tyler at about 10.30 a.m. on July 2',
    key='AR_1030', conflicts=['AR_milton_10', 'AR_taft_1030', 'AR_edgell_10']))
a(C(AR, 'position', 'R315', 'held in reserve on a cross-road between the main road and the Baltimore turnpike', 'July 2 forenoon', J2,
    place='a cross-road between the main road and the Baltimore turnpike', gz='GZ-039', act='the reserve batteries were held in reserve there'))
a(C(AR, 'position', 'R315', 'along the Baltimore turnpike, at points designated by Generals Meade and Hunt', 'Early in the day, July 2', J2,
    place='along the Baltimore turnpike', gz='GZ-039', road='Baltimore Pike', act='Fitzhugh (K, 1st NY), Rigby (A, 1st Md.) and Parsons (A, 1st NJ) stationed along the turnpike at points designated by Meade and Hunt'))
a(C(AR, 'movement', 'R315', 'At 3.30 p. m., pursuant to instructions received, I ordered Major McGilvery', 'At 3.30 p. m.', J2, t='15:30',
    place='to report to Major-General Sickles', act='McGilvery with two batteries (15th NY and C&F Pa.) ordered to report to Sickles at 3.30 p.m.; the remaining batteries of his brigade, Sterling (2nd Conn.) and Ames (G, 1st NY) sent forward as called for, six batteries and 34 guns',
    key='AR_330', conflicts=['AR_mcg_330'], note='McGilvery gives the same hour for his own order'))
a(C(AR, 'engagement', 'R315', 'when, our infantry falling back, they were compelled to retire', 'about 6 p. m.', J2, t='18:00', approx=True,
    place='the left flank (the Peach Orchard line)', gz='GZ-014', act='McGilvery\'s batteries held until about 6 p.m. then retired; a new line formed on the crest reinforced by Dow\'s Sixth Maine'))
a(C(AR, 'position', 'R315', 'were ordered to Westminster, to remain with the supply train', 'July 2', J2,
    place='Westminster, with the supply train', act='the two batteries of 4 1/2-inch guns (B and M, 1st Conn.) ordered to Westminster; Tyler regrets they were not in the battle', key='AR_bm_westminster'))
a(C(AR, 'position', 'R315', 'form line of battle on the crest of the hill near General Meade\'s headquarters', 'when the action became general (July 2)', J2,
    place='the crest of the hill near General Meade\'s headquarters', gz='GZ-006', act='Ransom\'s Regular Brigade ordered to form on the crest near Meade\'s headquarters; Turnbull\'s and Ransom\'s batteries then ordered forward to General Humphreys; Eakin to Cemetery Hill; Thomas held the crest',
    note='This is evidence for the location of army headquarters on the evening of July 2: "near" the crest on which Ransom\'s brigade formed. Hunt (R028): "above general headquarters". The place name (Leister house) is not in these passages. GZ-006 Cemetery Ridge is the compiler\'s identification of "the crest of the hill".'))
a(C(AR, 'position', 'R315', 'were ordered to report to Major-General Howard, commanding the Eleventh Corps', 'July 2', J2,
    place='in the vicinity of the cemetery (Cemetery Hill)', gz='GZ-003', act='Huntington\'s brigade (H 1st Ohio; F&G 1st Pa.; A 1st NH; C 1st WV) and Taft\'s 5th NY of 20-pounders sent to Howard and placed by him near the cemetery'))
a(C(AR, 'night_position', 'R315', 'Seventy wagons were unloaded, which were sent to the rear', 'night of July 2', J2,
    place=None, act='Lt. Gillett issued ammunition to the batteries of the corps and the reserve through the night; 70 wagons unloaded and sent to the rear the morning of July 3'))
a(C(AR, 'position', 'R315', 'I found all the reserve batteries (twelve in number)', 'July 3 at daylight', J3,
    place='in position along the lines', act='Tyler found twelve reserve batteries, ordered to the corps the day before, in position along the lines'))
a(C(AR, 'position', 'R315', 'The infantry had constructed a slight breastwork of such materials', 'On the morning of July 3', J3,
    place='along the entire crest of the hill', gz='GZ-006', act='the infantry had built a slight breastwork of available materials along the crest, and some shelter for the artillery (works built by the army on the night of July 2-3)',
    note='Evidence for a night July 2-3 building window of a crest breastwork; the OR does not name who or where beyond "the entire crest".'))
a(C(AR, 'engagement', 'R315', 'Everything was moderately quiet until about 12 o\'clock', 'until about 12 o\'clock', J3, t='12:00', approx=True,
    place='the lines', act='Tyler: the Confederate cannonade began about 12 o\'clock; then reserve park and train moved to the rear out of range; cannonade lasted more than two hours',
    key='cannon_tyler', conflicts=['cannon_mcg']))
a(C(AR, 'night_position', 'R315', 'Most of the batteries remained in position until July 5', 'July 3-5', J5,
    place=None, act='most batteries remained in position until July 5, when withdrawn for the march'))
a(C(AR, 'departure', 'R315', 'marched about 3 p. m., proceeding to Littlestown, Pa.', 'July 5, about 3 p. m.', J5, t='15:00', approx=True,
    place='Littlestown, Pa. (camp about 10 p. m.)', act='July 5: the batteries drawn in and marched about 3 p.m. to Littlestown, camping about 10 p.m.', note='Part of the Oct 3 statement attached to Tyler\'s report'))
a(C(AR, 'departure', 'R007', 'the Artillery Reserve to Littlestown', 'July 5', J5, place='Littlestown', act='Itinerary: July 5, leaving Gettysburg, the Artillery Reserve to Littlestown'))
a(C(AR, 'march', 'R007', 'and the Artillery Reserve from Frederick to Bruceville', 'June 29', '1863-06-29', place='Frederick -> Bruceville', act='Itinerary: June 29 the Artillery Reserve from Frederick to Bruceville'))
a(C(AR, 'march', 'R007', 'the Artillery Reserve from Bruceville to Taneytown', 'June 30', '1863-06-30', place='Bruceville -> Taneytown', act='Itinerary: June 30 the Artillery Reserve from Bruceville to Taneytown'))
a(C(AR, 'strength_note', 'R315', 'The one hundred and eight guns which were on the field', 'July 2-3', J2,
    place=None, act='Tyler: 108 guns of the Artillery Reserve on the field, all in position; expended about 11,653 rounds; killed/wounded/missing 14 officers and 216 privates',
    note='arrivals.json prints 106 guns / 2,300 men for the Spangler farm camp (ledger); a conflict of numbers, not decided here'))
a(C(AR, 'position', 'R316', 'which place we reached soon after midday', 'July 2, soon after midday', J2, t='12:00', approx=True,
    place='the position then held by our army near Gettysburg; train parked in a field to the right of the road', act='Gillett brought the ammunition train from Taneytown to near Gettysburg, reaching it soon after midday and parking in a field to the right of the road',
    note='Compare Tyler: train reported about 10.30 a.m.'))
a(C(AR, 'movement', 'R316', 'to move to a field about 1,000 yards to the rear', 'July 3, after about 2 p. m.', J3, approx=True,
    place='a field about 1,000 yards to the rear and behind a small piece of woods', act='during the cannonade the train was moved about 1,000 yards to the rear, where it stayed until July 5, then back to Littlestown'))
a(C('us-4nj-train-guard', 'arrival_road', 'R335', 'my regiment arrived at the scene of action at Gettysburg, Pa.', 'on July 2', J2,
    place='the scene of action at Gettysburg', act='4th NJ, in charge of the ammunition train of the Artillery Reserve, arrived at Gettysburg July 2'))
a(C('us-4nj-train-guard', 'engagement', 'R335', 'I immediately deployed across the road and into the woods on my right flank', 'about noon on the 3d', J3, t='12:00', approx=True,
    place='across the road the ammunition train stood on (fugitives rushing to the rear)', act='4th NJ deployed across the road with fixed bayonets and reorganized 400-500 fugitives, handed them to Patrick',
    note='Tyler: the battalion of the Fourth New Jersey and the company of the 32nd Mass. formed in line during the afternoon\'s engagement'))
a(C('us-5c-1d-sweitzer-32ma-co-c', 'engagement', 'R315', 'were formed in line, and assisted in driving back stragglers', 'during the afternoon\'s engagement (July 3)', J3,
    place='guarding the Artillery Reserve train', act='Company C, 32nd Massachusetts (Capt. J. C. Fuller), guarding the Artillery Reserve train, formed in line with the 4th NJ and drove back stragglers'))

# ------------------------------------------------------------ Ransom's brigade (1st Regular)
a(C(RB, 'position', 'R317', 'marched to within a mile and a half of Gettysburg, Pa.', 'July 2', J2,
    place='within a mile and a half of Gettysburg', act='Weir\'s Battery C 5th US marched from Taneytown to within 1 1/2 miles of Gettysburg and parked; afternoon moved to the front by order of Tyler',
    key='AR_weir_jul2', conflicts=['AR_gibbon_1030'], note='Weir dates the departure from Taneytown to July 2; Tyler says Ransom\'s brigade left Taneytown on the evening of July 1'))
a(C('us-art-reserve-ransom-5usc', 'position', 'R317', 'to take up a position about 500 yards to the right and front', 'About 4 o\'clock', J2, t='16:00', approx=True,
    place='about 500 yards to the right and front (ordered by Hancock; Gibbon had the firing directed to the left)', act='Weir\'s Battery C 5th US took position by Hancock\'s order about 4 o\'clock, opened with solid shot, spherical case and canister; out of canister, limbered up; got three guns off, the rest brought off after the infantry drove the enemy back',
    key='AR_weir_4pm', conflicts=['AR_tyler_ransom_humph']))
a(C('us-art-reserve-ransom-5usc', 'position', 'R317', 'I was conducted to General Webb\'s position, and came into battery', 'July 3, after the cannonade', J3,
    place='General Webb\'s position (the center), under heavy musketry fire; relieved about 6.30', act='Weir\'s battery reported to Newton, was sent back, then ordered to the front about the center; conducted to Webb\'s position and fired canister during the assault',
    gz='GZ-007', note='"General Webb\'s position" is identified with The Angle (GZ-007) by the compiler; the OR passage says only Webb\'s position'))
a(C('us-art-reserve-ransom-5usc', 'night_position', 'R317', 'Remained in park until 1.3( o\'clock near General Tyler\'s headquarters', 'until 1.3( o\'clock July 3', J3, ocr=True,
    place='in park about 500 yards in rear of our lines, near General Tyler\'s headquarters', act='battery in park until about 1.30, then fell back out of range of the cannonade'))
a(C(RB, 'movement', 'R315', 'were ordered forward to General Humphreys', 'when the action became general (July 2)', J2,
    place='near the right center', act='Turnbull\'s (F and K, 3rd US) and Ransom\'s (C, 5th US) batteries ordered forward to General Humphreys; Turnbull retired with heavy loss; four guns left, brought off later by infantry',
    key='AR_tyler_ransom_humph', conflicts=['AR_weir_4pm'], note='Hunt (R028) names Turnbull\'s, Weir\'s and Thomas\' batteries as sent to join Humphreys\' division on the right of Seeley. Weir says Hancock ordered his battery at 4 p.m. to a position 500 yards right and front.'))
a(C('us-art-reserve-ransom-3usf', 'position', 'R028', 'was posted near the Emmitsburg road', 'July 2 evening', J2,
    place='near the Emmitsburg road', gz='GZ-041', road='Emmitsburg Road', act='Turnbull\'s Battery F and K, 3rd US posted near the Emmitsburg road (Hunt); lost 1 officer and 8 men killed and 14 wounded, 45 horses killed (Tyler)', auth='Brig. Gen. Henry J. Hunt'))
a(C('us-art-reserve-ransom-4usc', 'position', 'R315', 'held the crest of the hill, and did excellent service in repelling the attack', 'July 2 evening / July 3', J2,
    place='the crest of the hill', gz='GZ-006', act='Lt. Thomas\'s Battery C 4th US held the crest and repelled the attack on the centre; on July 3 posted on the left of the Second Corps batteries (Hunt)'))
a(C('us-art-reserve-ransom-1ush', 'position', 'R315', 'was ordered to Cemetery Hill, where he was wounded', 'July 2', J2,
    place='Cemetery Hill', gz='GZ-003', act='Lt. Eakin\'s Battery H 1st US ordered to Cemetery Hill; Eakin wounded soon after the guns went into battery; Lt. Mason took command (Hunt)'))

# ------------------------------------------------------------ McGilvery R318 + battery reports
a(C(MB, 'movement', 'R318', 'at about 3.30 p. m. on July 2, 1 received an order', 'at about 3.30 p. m.', J2, t='15:30', approx=True,
    place='in park at a central position near our line of battle -> Sickles\' position near a belt of oak woods', act='McGilvery ordered to report to Sickles with one light 12-pounder and one rifled battery; 5th Mass. and 9th Mass. marched at once; Hart\'s 15th NY reported then and was placed in a peach orchard on the right and a little in front of the New Jersey battery',
    key='AR_mcg_330', conflicts=['AR_phillips_4pm', 'AR_milton_4pm']))
a(C(MB, 'position', 'R318', 'placed the two Massachusetts batteries in a position that commanded', 'July 2, from about 4 p. m.', J2, approx=True,
    place='near a belt of oak woods considerably in front of the prolongation of the natural line of defenses of our army, on the left center; peach orchard for Hart', gz='GZ-014',
    act='front nearly at right angles to the position of our troops, facing the left; Thompson\'s battery on the right of the 15th NY, one section facing right at canister range'))
a(C(MB, 'engagement', 'R318', 'At about a quarter to 6 o\'clock the enemy\'s infantry gained possession', 'about a quarter to 6 o\'clock', J2, t='17:45', approx=True,
    place='the woods immediately on the left of the line of batteries', act='infantry fell back both flanks; batteries ordered to retire 350 yards and renew fire; the New Jersey battery out of ammunition retired; Bigelow held with prolonge firing canister, left four guns'))
a(C(MB, 'position', 'R318', 'formed a new line of artillery about 400 yards to the rear', 'after about 6 p. m., July 2', J2, approx=True,
    place='about 400 yards to the rear, close under the woods, covering the opening that led into the Gettysburg and Taneytown road', road='Taneytown Road', gz='GZ-042',
    act='new line: Battery I 5th US, an unnamed volunteer battery, three guns of 5th Mass., two of Thompson\'s Pa. battery; Sixth Maine reported just before sundown; Pettit\'s NY (B) briefly; Seeley\'s regular battery (Lt. James) at 8 p.m.'))
a(C(MB, 'position', 'R318', 'brought them into line on the low ground on our left center', 'early on the morning of July 3', J3,
    place='low ground on our left center, fronting the woods and elevated position the enemy held along the Gettysburg and Emmitsburg road', gz='GZ-041',
    act='39 guns in line July 3 from left: Ames (6), Dow\'s 6th Maine (4), a New Jersey battery (6), a section of Pa. (2), 2nd Conn. (6), Hart\'s 15th NY (4), Phillips\' 5th Mass. (6), Thompson C&F Pa. (5)', ocr=True,
    note='Quote is the end of "early on the morning of July 3 brought them into line on the low ground on our left center"; OCR "ihirtyruine guns" for thirty-nine'))
a(C(MB, 'position', 'R318', 'In front of these guns I had a slight earthwork thrown up', 'early on the morning of July 3', J3,
    place='in front of the line of 39 guns', act='McGilvery had a slight earthwork thrown up in front of the guns (works built on screen on the morning of July 3); batteries ordered to cover their men and not reply until ordered',
    note='Evidence for a Jul 3 morning building window. Dow also built earthworks; Phillips: "a slight parapet".'))
a(C(MB, 'engagement', 'R318', 'At about 12.30 o\'clock the enemy opened a terrific fire upon our lines', 'about 12.30 o\'clock', J3, t='12:30', approx=True,
    place=None, act='McGilvery: the Confederate cannonade began about 12.30, "at least one hundred and forty guns", lasting about an hour and a half before the slow return fire',
    key='cannon_mcg', conflicts=['cannon_tyler', 'cannon_hunt', 'cannon_dow', 'cannon_ames', 'cannon_edgell']))
a(C('us-art-reserve-mcgilvery-5ma', 'arrival_road', 'R319', 'I marched from Taneytown toward Gettysburg, and came into park near the battle-field', 'On the morning of the 2d', J2,
    place='from Taneytown, into park near the battle-field', act='Phillips\' 5th Mass. battery marched from Taneytown on the morning of July 2 and parked near the field'))
a(C('us-art-reserve-mcgilvery-5ma', 'position', 'R319', 'took position on the right of Captain Bigelow and left of Captain Hart', 'At 4 o\'clock', J2, t='16:00',
    place='on the right of Bigelow, left of Hart (the Peach Orchard line)', gz='GZ-014', act='5th Mass. ordered into action at 4 o\'clock; retired about 1,000 yards after the lines gave way, then into battery by the side of the Sixth Maine',
    key='AR_phillips_4pm', conflicts=['AR_mcg_330', 'AR_hart_430'], note='McGilvery: ordered to report at 3.30 p.m.; Hunt: McGilvery came up with the three batteries about 3.30 p.m.'))
a(C('us-art-reserve-mcgilvery-5ma', 'position', 'R319', 'took position to the right and rear of the position of the day before', 'At daylight on the 3d', J3,
    place='right and rear of the previous day\'s position, on the right of Hart and left of Thompson', act='5th Mass. position July 3; guns protected by a slight parapet; remained until Saturday forenoon (July 4)',
    key='AR_phillips_order', conflicts=['AR_thompson_order']))
a(C('us-art-reserve-mcgilvery-5ma', 'position', 'R319', 'Under your directions, the guns were protected by a slight parapet', 'July 3 morning', J3,
    place='the July 3 position', act='slight parapet in front of the 5th Mass. guns built July 3 under McGilvery\'s direction'))
a(C('us-art-reserve-mcgilvery-9ma', 'arrival_road', 'R320', 'Arrived at Gettysburg at 10 a. m.', 'at 10 a. m.', J2, t='10:00',
    place='Gettysburg; park on the left of the Taneytown road with the rest of the reserve', road='Taneytown Road', gz='GZ-042', act='9th Mass. (Milton) left Taneytown the morning of the 2d, arrived 10 a.m., parked on the left of the Taneytown road',
    key='AR_milton_10', conflicts=['AR_1030']))
a(C('us-art-reserve-mcgilvery-9ma', 'movement', 'R320', 'Remained in park until 4 p. m., when ordered by Lieutenant-Colonel McGilvery', 'until 4 p. m.', J2, t='16:00',
    place='to the left, to the support of Sickles\' corps', act='9th Mass. ordered to the left; went in battery in line with Third Corps batteries on the extreme left, left within 50 yards of a dense woods', key='AR_milton_4pm', conflicts=['AR_mcg_330']))
a(C('us-art-reserve-mcgilvery-9ma', 'position', 'R320', 'a position near which two stone walls met at an obtuse angle', 'about 5.30-6 p. m. (July 2)', J2, approx=True,
    place='300 yards back where two stone walls met at an obtuse angle; ordered to hold at all hazards without infantry support', act='after covering the withdrawal of the batteries on its right the 9th Mass. retired 300 yards by prolonge and held; four guns on the right lost, the section retired',
    note='McGilvery: Bigelow "forced to leave four guns and retire"; Milton and McGilvery both say two guns under Milton were saved'))
a(C('us-art-reserve-mcgilvery-9ma', 'night_position', 'R320', 'withdrew a mile and a half to the rear and went into park', 'it being then 9 p. m.', J2, t='21:00',
    place='a mile and a half to the rear', act='9th Mass. in park at 9 p.m.; its four guns recovered the same day'))
a(C('us-art-reserve-mcgilvery-9ma', 'position', 'R320', 'went into park near position of first day', 'July 3 morning', J3,
    place='near the position of the first day (the left-center)', act='9th Mass. drew ammunition and parked; at 12 o\'clock, after troops nearby fell back, retired to near reserve headquarters; ordered to Lt. Col. Warner and, with two pieces of Battery K, 3rd US, placed on the right center on the left of Cemetery Hill under Gen. Baxter (I Corps)'))
a(C('us-art-reserve-mcgilvery-9ma', 'position', 'R320', 'on right center, on left of Cemetery Hill, under immediate command of General Baxter', 'July 3, afternoon until about 10 p. m. of the 5th', J3,
    place='the right center, on the left of Cemetery Hill', gz='GZ-003', act='9th Mass. with two pieces of Battery K 3rd US (Lt. Turnbull) placed under Baxter, fired 15 rounds at skirmishers in a barn; stayed until about 10 p.m. July 5'))
a(C('us-art-reserve-mcgilvery-9ma', 'departure', 'R320', 'then on the right of the Baltimore pike, about 2 miles to the rear', 'about 10 p. m. of the 5th', J5,
    place='McGilvery then on the right of the Baltimore pike, about 2 miles to the rear', gz='GZ-039', road='Baltimore Pike', act='9th Mass. ordered to report to McGilvery, then on the right of the Baltimore pike about 2 miles to the rear'))
a(C('us-art-reserve-mcgilvery-15ny', 'position', 'R322', 'in a peach orchard on the left and center at 4.30 p. m.', 'at 4.30 p. m.', J2, t='16:30',
    place='a peach orchard on the left and center', gz='GZ-014', act='15th NY ordered to take position in the peach orchard at 4.30 p.m.; fired on a battery about 1,100 yards away; at 5.30 enemy infantry; canister; ordered to retire at 6.30 p.m.',
    key='AR_hart_430', conflicts=['AR_phillips_4pm', 'AR_mcg_330']))
a(C('us-art-reserve-mcgilvery-15ny', 'position', 'R321', 'ordered me to take a position on the left of the peach orchard', 'July 2', J2,
    place='the left of the peach orchard (Hunt\'s order)', gz='GZ-014', act='Hart: Gen. Hunt ordered him to a position on the left of the peach orchard; McGilvery pointed out the position before',
    key='AR_hart_left', conflicts=['AR_mcg_hart_right'], note='McGilvery places Hart in the peach orchard "on the right and a little in front of the New Jersey battery" and Phillips on Hart\'s left; Hart puts himself on the left of the orchard.'))
a(C(MB, 'position', 'R318', 'peach orchard on the right and a little in front of the', 'July 2, after 3.30 p. m.', J2, ocr=True,
    place='a peach orchard on the right and a little in front of the New Jersey battery', gz='GZ-014', act='McGilvery placed Hart\'s 15th NY in a peach orchard on the right of the New Jersey battery', key='AR_mcg_hart_right', conflicts=['AR_hart_left'],
    note='OCR in the source: "Sosition in a peach orchard on the right and a little in front of the few Jersey battery"'))
a(C('us-art-reserve-mcgilvery-15ny', 'night_position', 'R322', 'We were then ordered to retire, which we did at 6.30 p. m.', 'at 6.30 p. m.', J2, t='18:30',
    place='about 2 miles from the field (camp for the night)', act='15th NY retired at 6.30 p.m. and encamped about 2 miles from the field'))
a(C('us-art-reserve-mcgilvery-15ny', 'position', 'R321', 'I took position accordingly', 'Early on the morning of the 3d', J3,
    place='anywhere on Thompson\'s left, leaving room for Phillips (reported to Capt. Thompson; Hunt, then McGilvery repeated the hold-fire order)', act='15th NY ordered by McGilvery\'s orderly to the front early on July 3, reported to Thompson, took position on his left',
    key='AR_hart_morning', conflicts=['AR_mcmahon_12m']))
a(C('us-art-reserve-mcgilvery-15ny', 'position', 'R322', 'we were ordered to proceed to the front at 12 m.', 'On the 3d instant, at 12 m.', J3, t='12:00',
    place='on the left of the cemetery', act='McMahon: the 15th NY ordered to the front at noon July 3, position on the left of the cemetery',
    key='AR_mcmahon_12m', conflicts=['AR_hart_morning'],
    note='Hart and McGilvery place the battery on the line near Phillips and Thompson from early July 3; McMahon says noon and "on the left of the cemetery"'))
a(C(MB, 'strength_note', 'R319', 'making a total of 15 officers and 368 men', 'July 2', J2, place=None, act='First Volunteer Brigade batteries engaged: 15 officers and 368 men (5th Mass. 4/100; 9th Mass. 4/100; 15th NY 3/68; C&F Pa. 4/100)', key='AR_mcg_men', note='in a footnote of Phillips\' report'))
a(C('us-art-reserve-mcgilvery-15ny', 'engagement', 'R322', 'At 3 p. m. the rebels commenced a heavy firing', 'At 3 p. m.', J3, t='15:00',
    place=None, act='McMahon: the Confederate cannonade began at 3 p.m.; battery returned fire about 4 p.m. by Hancock\'s order', key='cannon_mcmahon', conflicts=['cannon_mcg', 'cannon_hunt']))
a(C('us-art-reserve-mcgilvery-15ny', 'departure', 'R321', 'until near noon on the 4th, when I was ordered to the rear', 'near noon on the 4th', J4, t='12:00', approx=True,
    place=None, act='15th NY remained in position until near noon July 4, then ordered to the rear'))
a(C('us-art-reserve-mcgilvery-pac', 'position', 'R323', 'occupying the angle where the right of our line was thrown back', 'at about 5 p. m.', J2, t='17:00', approx=True,
    place='the angle where the right of our line was thrown back, facing southward, about 2 miles from the town', act='Thompson\'s consolidated batteries C and F Pa. took a position assigned by McGilvery; two guns facing west and four facing south; one gun lost and recaptured, later lost; retired 300 yards and 1,200 yards',
    ocr=False, note='OCR: "at about 5 p. m. ^^ +iVo 9,1 instant" (garbled date); the narrative is July 2'))
a(C('us-art-reserve-mcgilvery-paf', 'position', 'R323', 'occupying the angle where the right of our line was thrown back', 'at about 5 p. m.', J2, t='17:00', approx=True,
    place='the angle where the right of our line was thrown back, facing southward, about 2 miles from the town', act='Battery F (Capt. Irish, wounded acting as aide to McGilvery), consolidated with C under Thompson: same position', note='Battery F is a component of the consolidated unit; units.json has separate ids for C and F.'))
a(C('us-art-reserve-mcgilvery-pac', 'position', 'R323', 'was placed in position in line with Battery K, Fourth U. S. Artillery', 'At about 5 a. m. July 3', J3, t='05:00', approx=True,
    place='in line with Battery K 4th US on his right and Hart\'s 15th NY on his left', act='Thompson: July 3 position with Battery K 4th US on the right and Hart on the left',
    key='AR_thompson_order', conflicts=['AR_phillips_order'], note='McGilvery\'s line July 3 (left to right): Ames, Dow, NJ, Pa section, 2nd Conn., Hart, Phillips, Thompson.'))
a(C('us-art-reserve-mcgilvery-paf', 'position', 'R323', 'was placed in position in line with Battery K, Fourth U. S. Artillery', 'At about 5 a. m. July 3', J3, t='05:00', approx=True,
    place='in line with Battery K 4th US on his right and Hart\'s 15th NY on his left', act='consolidated C and F, July 3 position'))
a(C('us-art-reserve-taft-2ct', 'position', 'R318', 'First [Second] Connecticut, four James rifled and two howitzers', 'July 3', J3,
    place='in McGilvery\'s line between the Pennsylvania section and Hart (OCR bracket "First [Second]")', act='Sterling\'s 2nd Connecticut battery (four James rifles, two howitzers) in McGilvery\'s July 3 line; Dow placed between it and Ames',
    key='AR_2ct_line', note='No report of Sterling\'s battery in the volume; Tyler: "No report has yetbeen received from Captain Ransom\'s (C, Fifth U. S. Artillery) or Captain Sterling\'s (Second Connecticut) batteries" (R315 p.873)'))
a(C('us-art-reserve-taft-1ctheavy-m', 'position', 'R324', 'it was ordered from Taneytown to Westminster', 'July 2', J2,
    place='from Taneytown to Westminster, where it stayed until July 6', act='Pratt\'s Battery M 1st Conn. (siege battery of 4 1/2-inch guns) was ordered on July 2 to Westminster and was never on the Gettysburg field; July 6 sent back toward Taneytown, recalled to Westminster; July 8 rejoined the reserve near Frederick',
    note='Tyler (R315) says B and M, 1st Conn. were ordered to Westminster on July 2 "to remain with the supply train". The same fact for B: only Tyler\'s statement names Battery B; no battery-B report.'))
a(C('us-art-reserve-taft-1ctheavy-b', 'position', 'R315', 'were ordered to Westminster, to remain with the supply train', 'July 2', J2,
    place='Westminster, with the supply train', act='Battery B 1st Conn. (4 1/2-inch guns), with Battery M, ordered to Westminster to remain with the supply train; never on the field',
    key='AR_b_westminster'))
a(C('us-art-reserve-taft-5ny', 'arrival_road', 'R325', 'where it halted in park about 10. 30 a. m.', 'about 10. 30 a. m.', J2, t='10:30', approx=True,
    place='near Gettysburg, in park', act='5th NY (20-pounders, Taft) marched from Taneytown the morning of July 2 and halted in park near Gettysburg about 10.30 a.m.', key='AR_taft_1030', conflicts=['AR_1030']))
a(C('us-art-reserve-taft-5ny', 'position', 'R325', 'marched from park to the cemetery, where we arrived at 4 p. m.', 'at 3. 30 p. m. marched; arrived 4 p. m.; position at 5 p. m.', J2, t='16:00',
    place='the cemetery; reported to Howard; took position in the cemetery at 5 p. m.', gz='GZ-003', act='5th NY marched from park to the cemetery, reported to Howard at 4 p.m., took position in the cemetery at 5 p.m. and engaged a battery north of the cemetery with four guns and one west with two; stayed in position through the night'))
a(C('us-art-reserve-taft-5ny', 'departure', 'R325', 'Remained in the same position until 10 a. m. of the 5th instant', 'until 10 a. m. of the 5th', J5, t='10:00',
    place='the cemetery position; then to the Artillery Reserve camp 2 miles from Gettysburg', gz='GZ-003', act='5th NY remained in the cemetery until 10 a.m. July 5, then rejoined the reserve camp on Tyler\'s order'))
a(C('us-art-reserve-taft-5ny', 'engagement', 'R325', 'The enemy opened fire again about 1.30 p. m.', 'about 1.30 p. m.', J3, t='13:30', approx=True,
    place='the cemetery', gz='GZ-003', act='Taft: the cannonade reopened about 1.30 p.m.; one gun burst; battery fired until about 6 p.m.', key='cannon_taft', conflicts=['cannon_mcg']))

# ------------------------------------------------------------ Huntington's brigade (3rd Volunteer)
a(C('us-art-reserve-huntington-1nh', 'arrival_road', 'R326', 'arrived on the field from Taneytown on July 2, at 10 a. m.', 'at 10 a. m.', J2, t='10:00',
    place='the field, from Taneytown', act='1st NH (Edgell) arrived 10 a.m. July 2', key='AR_edgell_10', conflicts=['AR_1030']))
a(C('us-art-reserve-huntington-1nh', 'position', 'R326', 'Cemetery Hill, immediately on the left of the cemetery, relieving a battery', 'at 4 p. m. (July 2)', J2, t='16:00',
    place='Cemetery Hill, immediately on the left of the cemetery', gz='GZ-003', act='1st NH, by order of Maj. Osborn (XI Corps), went into position relieving a battery; shelled batteries 2,000 yards or more; later moved to a corn-field near the Baltimore turnpike to cover a possible retreat, not engaged',
    note='Printed "at 4 p. m." precedes the quoted words. The corn-field move (hour not printed) was in the afternoon/evening.'))
a(C('us-art-reserve-huntington-1nh', 'movement', 'R326', 'move to a position in a corn-field near the Baltimore turnpike', 'later in the afternoon, July 2', J2,
    place='a corn-field near the Baltimore turnpike', gz='GZ-039', road='Baltimore Pike', act='Osborn directed the battery to a corn-field near the turnpike to cover a possible retreat of troops from the woods on the right; not employed; men kept at the guns through the night'))
a(C('us-art-reserve-huntington-1nh', 'position', 'R326', 'I was ordered to take up my old position on Cemetery Hill', 'At 2.30 p. m.', J3, t='14:30',
    place='Cemetery Hill, relieving Huntington\'s Ohio battery', gz='GZ-003', act='1st NH returned to its old position on Cemetery Hill at 2.30 p.m. relieving Huntington\'s battery; fired case shot on the assault about 4 p.m.',
    key='V6_edgell_230', conflicts=['V6_mccartney_4pm'], note='McCartney (6th Corps Battery A Mass.) reports being ordered at about 4 p.m. July 3 to a position near the cemetery to relieve the 1st NH battery'))
a(C('us-art-reserve-huntington-1nh', 'engagement', 'R326', 'the enemy opened a rapid artillery fire on our center and left', 'At about 1.30 p. m.', J3, t='13:30', approx=True,
    place=None, act='Edgell: the cannonade began about 1.30 p.m.', key='cannon_edgell', conflicts=['cannon_mcg']))
a(C('us-art-reserve-huntington-1ohh', 'position', 'R327', 'put in position on Cemetery Hill on the 2d instant, about 4 p. m.', 'about 4 p. m.', J2, t='16:00', approx=True,
    place='Cemetery Hill, under direction of Maj. Osborn, XI Corps', gz='GZ-003', act='Norton\'s Battery H 1st Ohio put in position and fired at a battery on the right of the town and at a wheat-field battery 1,800 yards away'))
a(C('us-art-reserve-huntington-1ohh', 'night_position', 'R327', 'the battery was relieved and went to the rear', 'after the close of the battle of July 3', J3,
    place='to the rear; next morning back up to relieve a First Corps battery (Wainwright), gun-covers near the cemetery until the afternoon of the 5th', gz='GZ-003', act='Norton: H 1st Ohio relieved after the close of the battle of Friday (July 3) and went to the rear; next morning sent up again to relieve a First Corps battery', key='AR_norton_relief', conflicts=['V6_edgell_230'],
    note='Edgell (R326): at 2.30 p.m. July 3 the 1st NH relieved the Ohio battery on Cemetery Hill; Norton puts the relief after the close of the battle'))
a(C('us-art-reserve-huntington-1ohh', 'departure', 'R327', 'when it rejoined the reserve, and proceeded that night to Littlestown', 'the afternoon of the 5th', J5,
    place='Littlestown', act='H 1st Ohio rejoined the reserve on the afternoon of July 5 and marched that night to Littlestown'))
a(C('us-art-reserve-huntington-1paf', 'arrival_road', 'R328', 'arriving on the field about noon', 'about noon', J2, t='12:00', approx=True,
    place='the field, with Huntington\'s brigade from Taneytown', act='Ricketts\' F and G 1st Pa. moved from Taneytown to Gettysburg with Huntington\'s brigade, arriving about noon', key='AR_ricketts_noon', conflicts=['AR_edgell_10', 'AR_1030']))
a(C('us-art-reserve-huntington-1paf', 'position', 'R328', 'who placed me in position on Cemetery Hill, to the right of the turnpike', 'At 4 p. m.', J2, t='16:00',
    place='Cemetery Hill, to the right of the turnpike leading into Gettysburg (Col. Wainwright placed the battery)', gz='GZ-003', act='Ricketts ordered at 4 p.m. by Huntington to report to Wainwright, placed on Cemetery Hill right of the turnpike; engaged batteries; the woods on the right occupied by the XII Corps',
    note='Hunt: Ricketts relieved Cooper\'s battery (B, 1st Pa.) after the afternoon duel'))
a(C('us-art-reserve-huntington-1paf', 'engagement', 'R328', 'a heavy column of the enemy charged on my battery', 'At about 8 p. m.', J2, t='20:00', approx=True,
    place='Cemetery Hill, the battery\'s position', gz='GZ-003', act='left piece captured and spiked; cannoneers fought with handspikes, rammers and pistols; part of the Second Corps drove the enemy back'))
a(C('us-art-reserve-huntington-1pag', 'position', 'R328', 'who placed me in position on Cemetery Hill, to the right of the turnpike', 'At 4 p. m.', J2, t='16:00',
    place='Cemetery Hill, to the right of the turnpike', gz='GZ-003', act='Battery G 1st Pa., consolidated with F under Ricketts: same position'))
a(C('us-art-reserve-huntington-wvc', 'position', 'R329', 'my battery was immediately ordered into position on Cemetery Hill', 'About 4.30 p. m. (Third Brigade ordered to the front)', J2, t='16:30', approx=True,
    place='Cemetery Hill', gz='GZ-003', act='Hill\'s Battery C 1st WV ordered to the front with the Third Brigade about 4.30 p.m. and placed on Cemetery Hill, where it stayed until the afternoon of July 5'))
a(C(HB, 'position', 'R028', 'on the south of the road', 'July 2 (morning-evening), batteries under Maj. Osborn', J2,
    place='Cemetery Hill: on the right resting next the Baltimore road facing the Emmitsburg: Dilger; Bancroft; Eakin; Wheeler; Hill; Hall; Taft\'s 20-pounders in rear; Huntington\'s 3-inch on Taft\'s right and rear', gz='GZ-003', auth='Brig. Gen. Henry J. Hunt',
    act='Hunt\'s arrangement of the Cemetery Hill batteries: Osborn commanding south of the road with five reserve batteries (Eakin H 1st US, Taft 5th NY, Hill C 1st WV, Huntington H 1st Ohio, Edgell 1st NH) added',
    note='Quote is the end of "Major Osborn, chief of artillery of the Eleventh Corps, was directed to take command on the south of the road"; the arrangement is the following sentences'))

# ------------------------------------------------------------ Fitzhugh's brigade (4th Volunteer)
a(C(FB, 'arrival_road', 'R330', 'Arriving on the field from Taneytown about 8 a. m. July 2', 'about 8 a. m.', J2, t='08:00', approx=True,
    place='the field, from Taneytown', act='Fitzhugh arrived about 8 a.m. July 2 and was ordered by Tyler to take K 1st NY and A 1st NJ and go into position on the Baltimore turnpike near Slocum\'s line',
    key='AR_fitzhugh_8am', conflicts=['AR_gibbon_1030', 'AR_1030']))
a(C('us-art-reserve-fitzhugh-1nyk', 'position', 'R330', 'and go into position on the Baltimore turnpike, near General Slocum\'s line', 'July 2, after about 8 a. m.', J2,
    place='the Baltimore turnpike, near General Slocum\'s line', gz='GZ-039', road='Baltimore Pike', act='K 1st NY (Fitzhugh) and A 1st NJ (Parsons) in position on the Baltimore turnpike near Slocum\'s line; unengaged until 1 p.m. July 3'))
a(C('us-art-reserve-fitzhugh-1nj', 'position', 'R330', 'and go into position on the Baltimore turnpike, near General Slocum\'s line', 'July 2, after about 8 a. m.', J2,
    place='the Baltimore turnpike, near General Slocum\'s line', gz='GZ-039', road='Baltimore Pike', act='A 1st NJ (Parsons) with K 1st NY on the Baltimore turnpike near Slocum\'s line'))
a(C('us-art-reserve-fitzhugh-1nyk', 'position', 'R330', 'by order of General Hunt, I put them in position near the stone fence', '1 p. m. of Friday, July 3', J3, t='13:00',
    place='near the stone fence in front of Webb\'s division of the Second Corps, A 1st NJ on the left of K 1st NY', gz='GZ-007', act='Fitzhugh put K 1st NY and A 1st NJ in position at 1 p.m. July 3 by Hunt\'s order; fired on the assault; stayed until about 10 a.m. July 5',
    key='AR_fitz_1pm', conflicts=['AR_parsons_3pm'], note='GZ-007 The Angle is the compiler\'s identification of "the stone fence in front of General Webb\'s division"; the passage does not name the Angle.'))
a(C('us-art-reserve-fitzhugh-1nj', 'position', 'R333', 'about 3 p. m., I received orders from General Hunt to move the battery', 'about 3 p. m.', J3, t='15:00', approx=True,
    place='about one-fourth of a mile south of Gettysburg Cemetery near the Second Division, Second Corps; Fitzhugh on his right', gz='GZ-007', act='Parsons: A 1st NJ moved to the front on Hunt\'s order about 3 p.m. July 3; opened with case shot, then shell; Fitzhugh\'s battery following and taking position on its right',
    key='AR_parsons_3pm', conflicts=['AR_fitz_1pm'], note='Fitzhugh puts A 1st NJ on the LEFT of K 1st NY at 1 p.m.; Parsons says Fitzhugh took position on his RIGHT about 3 p.m. Hunt: Fitzhugh\'s and Parsons\' batteries reached this point after about 3 p.m.'))
a(C('us-art-reserve-fitzhugh-1nyk', 'departure', 'R330', 'when I was ordered to rejoin the Artillery Reserve', 'about 10 a. m. July 5', J5, t='10:00', approx=True,
    place='the Artillery Reserve', act='K 1st NY and A 1st NJ ordered to rejoin the reserve about 10 a.m. July 5'))
a(C('us-art-reserve-fitzhugh-6me', 'engagement', 'R331', 'to report to General Sickles\' (Third) corps, on the left center', 'about 6 p. m. 2d instant', J2, t='18:00', approx=True,
    place='the left center; then McGilvery placed it in rear of the first line, then a woods line before Taneytown road', road='Taneytown Road', gz='GZ-042', act='Dow\'s 6th Maine ordered by Tyler through Lt. Blucher about 6 p.m., went into position, fired about an hour and a half; relieved by McGilvery at 7.30 p.m.',
    note='McGilvery: the 6th Maine reported "just before sundown"'))
a(C('us-art-reserve-fitzhugh-6me', 'position', 'R331', 'ordered into position between the Second Connecticut Battery and Ames\' (First New York) battery', 'July 3 morning', J3,
    place='between the 2nd Connecticut and Ames\' battery, supported by a brigade of the Second Corps', act='6th Maine put in line July 3 morning', key='AR_dow_line'))
a(C('us-art-reserve-fitzhugh-6me', 'position', 'R331', 'I built earthworks in front of my guns.', 'July 3 morning', J3,
    place='in front of the battery\'s guns, between the 2nd Conn. and Ames', act='Dow built earthworks in front of his guns on the morning of July 3 (works built on screen)', note='Evidence for a July 3 morning building window.'))
a(C('us-art-reserve-fitzhugh-6me', 'engagement', 'R331', 'when, at a signal of one gun, the whole rebel line opened', 'about 11 o\'clock', J3, t='11:00', approx=True,
    place=None, act='Dow: the cannonade began about 11 o\'clock at a signal of one gun; fire lasted about an hour and a half', key='cannon_dow', conflicts=['cannon_mcg']))
a(C('us-art-reserve-fitzhugh-1nyg', 'movement', 'R334', 'received orders from headquarters Artillery Reserve to report with my battery', 'At 11 o\'clock on the morning of the 2d', J2, t='11:00',
    place='to Major-General Sickles; sheltered behind the piece of woods on the Emmitsburg road near the stone barn', road='Emmitsburg Road', gz='GZ-041', act='Ames\' G 1st NY ordered to Sickles at 11 a.m., sheltered behind the woods on the Emmitsburg road near the stone barn until 3 p.m.'))
a(C('us-art-reserve-fitzhugh-1nyg', 'position', 'R334', 'take position in a thick peach orchard, and engage the enemy\'s batteries', 'At 3 p. m. (by Capt. Randolph)', J2, t='15:00',
    place='a thick peach orchard, about 800 yards forward, engaging batteries at 850 yards; relieved at 5.30 p.m. by Battery I 5th US', gz='GZ-014',
    act='Ames\' G 1st NY moved forward 800 yards to the peach orchard on Randolph\'s order at 3 p.m., 2 1/2 hours of fighting, relieved at 5.30 p.m.; parked near the reserve ammunition train',
    key='AR_ames_3pm', note='Tyler: Ames\' G 1st NY was among the batteries sent forward after McGilvery at 3.30 p.m. and later'))
a(C('us-art-reserve-fitzhugh-1nyg', 'position', 'R334', 'I took position on the left, near the mountain', 'about 12 m. (July 3)', J3, t='12:00', approx=True,
    place='on the left, near the mountain (Round Top)', gz='GZ-010', act='Ames took position July 3 on the left near the mountain and fired on the advancing lines; held it until 3 p.m. July 4',
    note='Dow/McGilvery place Ames at the left end of the 39-gun line in the low ground near an oak wood; this is compatible'))
a(C('us-art-reserve-fitzhugh-1nyg', 'engagement', 'R334', 'about 10 a. m., when the cannonading from the rebel lines commenced', 'about 10 a. m.', J3, t='10:00', approx=True,
    place=None, act='Ames: remained near the Frederick and Gettysburg pike until about 10 a.m., when the cannonading commenced; ordered behind a wood; at 12 m. ordered to the front', key='cannon_ames', conflicts=['cannon_mcg'],
    note='This is the earliest cannonade-onset time among the Artillery Reserve reports (compare 11, 12, 12.30, 1, 1.30, 3)'))
a(C('us-art-reserve-fitzhugh-1nyg', 'departure', 'R334', 'until 3 p. m. of July 4, when I was ordered to withdraw', 'until 3 p. m. of July 4', J4, t='15:00',
    place=None, act='Ames held the left position until 3 p.m. July 4 then ordered to withdraw'))
a(C('us-art-reserve-fitzhugh-mda', 'position', 'R332', '500 yards west of the Baltimore turnpike', 'On the morning of July 2', J2,
    place='a hill about 1 mile south of Gettysburg and 500 yards west of the Baltimore turnpike; the XII Corps in the woods in front', gz='GZ-039', road='Baltimore Pike',
    act='Rigby\'s Battery A Md. in position on the morning of July 2; opened at about 2 o\'clock on a battery 2,500 yards away then ceased; July 3 daylight shelled the woods in front for about three hours; stayed until the afternoon of July 5',
    note='Tyler: opened fire at daylight July 3 by direction of Slocum on troops across Rock Creek. The hill is called "Slocum\'s headquarters" in Hunt\'s account of Knap\'s battery ("the hill known as Slocum\'s headquarters, near the Baltimore pike").'))
a(C('us-art-reserve-fitzhugh-mda', 'departure', 'R332', 'I remained in this position until Sunday afternoon, July 5', 'Sunday afternoon, July 5', J5,
    place=None, act='Rigby\'s battery remained until the afternoon of July 5 then ordered to report to Artillery Reserve headquarters'))
