"""Close-out rows of shard tl-08 (T2-179 .. T2-235)."""
from tl58lib import *

D, I, P, G = 'documented', 'inferred', 'plausible-procedural', 'open gap'
S_, U_, C_, X_, K_ = 'supported', 'unsupported', 'conflict', 'contradicted', 'computed'
NR = 'shard audit entry not re-found as a quotation in this close-out'

ROW('T2-179', 'unsupported',
    'No OR passage lists Confederate hospital sites (Seminary, McPherson barn, Lady, Slyder, Rose, Bushman) or the 400-wounded Seminary figure; Dance names only a battery near "the seminary used as a Yankee hospital" (an artillery position, not a statement about Confederate wounded or counts).',
    [SUB('Confederate wounded at the Seminary (over 400 in about two days), McPherson barn, Lady, Slyder, Rose and Bushman barns', G, U_, [], 'INTRUST, ECW-HOSP, GBPA-LADY secondary; Guild R427 covers the retreat only'),
     SUB('A battery stood near the seminary used as a Yankee hospital (Dance)', D, S_, ['da_sem'])],
    {'da_sem': ('OR27-2-R532', 'the seminary used as a Yankee hospital')},
    remains=['Confederate hospital sites and counts'], tier='inferred')

ROW('T2-180', 'partially_supported',
    'McGilvery: Bigelow was ordered to hold his position at all hazards to give time to form a new line of artillery; the line was assembled from several commands with batteries arriving and leaving, 6 to 23 guns, and an 8 p. m. detail to haul off guns is the shard\'s reading, not isolated here.',
    [SUB('McGilvery ordered Bigelow to hold as long as possible in order to give time to form a new line of artillery', D, S_, ['mc_new']),
     SUB('The new line was assembled from pieces of several commands, varying from 6 to 23 guns as batteries arrive and leave', I, U_, [], NR)],
    {'mc_new': ('OR27-1-R318', 'in order to give me time to form a new line of artillery')})

ROW('T2-181', 'partially_supported',
    'Greene: the First (Williams\') Division and the First and Second Brigades of the Second Division were ordered from his right, "leaving the intrenchments of Kane\'s brigade and Williams\' division unoccupied" at 6.30 p. m.; Johnson: Steuart\'s brigade carried a line of breastworks; Greene\'s strength 1,400 and a foot or several feet between men are not quoted.',
    [SUB('Greene: the troops were ordered from his right, leaving the intrenchments of Kane\'s brigade and Williams\' division unoccupied; he was ordered to occupy the whole of the intrenchments', D, S_, ['gr_unocc']),
     SUB('Johnson: Steuart\'s brigade, on the left, carried a line of breastworks which ran perpendicular to the enemy\'s main line', D, S_, ['jo_steu']),
     SUB('Greene\'s brigade about 1,400 in a thin single line of about 800 yards with a foot or several feet between men', I, U_, [], 'HMDB13997, GD219 secondary')],
    {'gr_unocc': ('OR27-1-R307', 'leaving the intrenchments of Kane\'s brigade and Williams\' division unoccupied'),
     'jo_steu': ('OR27-2-R481', 'Steuart\'s brigade, on the left, carried a line of breastworks which ran perpendicular to the enemy\'s main line')})

ROW('T2-182', 'partially_supported',
    'Barnes: Colonel Sweitzer directed his command to retire slowly, halting and firing; Sykes: Ayres\'s regulars "were at once ordered to attack"; Jeffords of the 4th Michigan and the 829 of 2,613 casualties are secondary.',
    [SUB('Barnes: Colonel Sweitzer directed his command to retire slowly, but orderly, halting and firing', D, S_, ['ba_sw']),
     SUB('Sykes: the regulars were at once ordered to attack', D, S_, ['sy_att']),
     SUB('Brooke escapes; Jeffords of the 4th Michigan killed saving the flag; Ayres 829 of 2,613 casualties', I, U_, [], 'SS2, NPS8, ABT-WF3 secondary')],
    {'ba_sw': ('OR27-1-R189', 'Sweitzer directed his command to retire slowly'),
     'sy_att': ('OR27-1-R187', 'were at once ordered to attack')})

ROW('T2-183', 'partially_supported',
    'Williams: Lockwood\'s brigade "reported on the 2d and 3d"; Hancock: by the advance of these regiments the artillery left on the field in the Third Corps line was recaptured; that Williams\'s division as a whole repulsed the 21st Mississippi at 18:30 is not stated (Hancock places the recapture after the Willard fight).',
    [SUB('Williams: Lockwood\'s brigade reported on the 2d and 3d', D, S_, ['wi_lock']),
     SUB('Hancock: by the advance of these regiments, the artillery which had been left on the field in the Third Corps line was recaptured from the enemy', D, S_, ['ha_rec']),
     SUB('Williams\'s division arrives from Culp\'s Hill about 18:30 and repulses the 21st Mississippi, recapturing Bigelow\'s guns', I, U_, [], 'division, hour and the Mississippi regiment not stated')],
    {'wi_lock': ('OR27-1-R272', 'reported on the 2d and 3d'),
     'ha_rec': ('OR27-1-R076', 'the artillery which had been left on the field in the Third Corps line was recaptured')})

ROW('T2-184', 'partially_supported',
    'Hancock: "The First Minnesota Regiment coming up at this moment, charged the rebel regiment in handsome style, capturing its colors"; Coates\'s report records the regiment\'s loss; the 215 of about 262 lost and the hour 18:30-19:00 are not isolated here (Coates\'s "about 5 p.m." is when the regiment came under fire, not the charge hour).',
    [SUB('Hancock: the First Minnesota Regiment, coming up at this moment, charged the rebel regiment in handsome style, capturing its colors', D, S_, ['ha_min']),
     SUB('215 of about 262 lost; the charge at 18:30-19:00 on Hancock\'s order; Colvill, Harrow\'s brigade', I, U_, [], 'Coates\'s passages not isolated as quotations; hour not printed in Hancock\'s sentence')],
    {'ha_min': ('OR27-1-R076', 'The First Minnesota Eegiment coming up at this moment, charged the rebel regiment in handsome style')})

ROW('T2-185', 'partially_supported',
    'Wright (Confederate): his brigade advanced across fields swept by artillery on the crest of the heights on McPherson\'s farm, reaching the crest and forced back for lack of support; the Union reports (R099 p.420, Meade R006 p.117) have the line holding; whether Wright reached the crest is a source conflict carried as scenarios without a default.',
    [SUB('Wright: the enemy\'s artillery was posted along the Emmitsburg road and upon the crest of the heights on McPherson\'s farm, a little south of Cemetery Hill', D, S_, ['wr_crest']),
     SUB('Whether Wright reached the crest (Wright, NPS) or was stopped short (Union reports, Wikipedia)', I, C_, [], 'Union passages not isolated as quotations here')],
    {'wr_crest': ('OR27-2-R539', 'upon the crest of the heights on McPherson\'s farm, a litle south of Cemetery Hill')},
    scenarios=[SCN('A', 'Wright reached the crest and was forced back for lack of support', 'Wright OR27-2-R539 p.623 (confederate version) and NPS per the seed', I), SCN('B', 'Wright stopped short; the 82nd NY and 15th Mass. fell back, batteries held', 'Union reports OR27-1-R099 p.420, R006 p.117; Wikipedia', I)])

ROW('T2-186', 'partially_supported',
    'Mahone: the brigade took no special or active part beyond its line of skirmishers; Posey: told to advance but two regiments and deploy them closely as skirmishers; neither joined the assault; "Mahone refuses an order" and "Posey never crosses the Emmitsburg Road" as worded are not in the passages.',
    [SUB('Mahone: the brigade took no special or active part in the actions beyond that which fell to the lot of its line of skirmishers', D, S_, ['ma_skm']),
     SUB('Posey: ordered to advance but two of his regiments and deploy them closely as skirmishers', D, S_, ['po_skm']),
     SUB('Mahone refuses an order; Posey never crosses the Emmitsburg Road', I, U_, [], 'not worded so in the reports (Posey: "could not comply" per the shard, p.634)')],
    {'ma_skm': ('OR27-2-R538', 'took no special or active part in the actions of that battle beyond that which fell to the lot of its line of skirmishers'),
     'po_skm': ('OR27-2-R546', 'to atlvance but two of my regiments, and deploy them closely as skirmishers')})

ROW('T2-187', 'partially_supported',
    'Named batteries engaged in the Peach Orchard area are in McGilvery\'s and Hunt\'s reports as the shard read them; the "about 30 Union guns" count around 17:00-18:00 is a secondary figure not found here.',
    [SUB('About 30 Union guns hold the Peach Orchard area around 17:00-18:00 (McGilvery, Hart, Phillips, Bigelow and Alexander\'s batteries)', I, U_, [], 'W-D2; guns count and hours not isolated as quotations here')],
    tier='inferred')

ROW('T2-188', 'partially_supported',
    'Computed row: sun altitude 9.771 deg and azimuth 291.929 deg at 18:30 LMT on Jul 2 reproduce from the project ephemeris; the row\'s "shadows pointing east-northeast" is wrong (they point opposite the sun, about east-southeast, 112 deg).',
    [SUB('Sun altitude 9.8 deg, azimuth 292 (WNW) at 18:30 LMT', I, K_, [], 'COMPUTED'),
     SUB('Long shadows pointing east-northeast', I, X_, [], 'shadows point opposite the sun: 292 - 180 = 112 deg, east-southeast')],
    tier='inferred')

ROW('T2-189', 'partially_supported',
    'Hancock describes intervals in the line on the left of the Second Corps and Meade bringing regiments forward; Wright reaches the heights; the Copse height, the pre-existing stone wall at the Angle and "no continuous works" are not OR statements here and Wright reaching the crest is the disputed claim of T2-185.',
    [SUB('Wright: the enemy\'s artillery on the crest of the heights on McPherson\'s farm (his own brigade\'s advance)', D, S_, ['wr_crest']),
     SUB('A broad gap exists in the Union line south of the Copse and Wright reaches the crest; the Copse under ten feet high in 1863; a pre-existing stone wall marks the Angle', I, C_, [], 'NPS10, NPS-ANGLE, SS-COPSE; the crest question is disputed (see T2-185)')],
    {'wr_crest': ('OR27-2-R539', 'upon the crest of the heights on McPherson\'s farm, a litle south of Cemetery Hill')})

ROW('T2-190', 'partially_supported',
    'Hancock and Wright\'s report describe Union reinforcements and Wright\'s withdrawal in outline; the sunset hour 19:00, the I and II Corps troops and Meade leading some of them are not isolated as quotations here.',
    [SUB('Union I and II Corps troops, some led by Meade, drive Wright back at sunset about 19:00', I, U_, [], 'Hancock p.371 and Wright p.624 passages not isolated as quotations here')], tier='inferred')

ROW('T2-191', 'partially_supported',
    'Coulter: "About 10 p. m. were placed in position on the Emmitsburg and Gettysburg road and in front of the cemetery"; this is Jul 2 (printed after the noon-next-day sentence), consistent with the 19:00 move left; the seed\'s Baxter and the 13th Massachusetts are not quoted.',
    [SUB('Coulter: about 10 p. m. the brigade was placed in position on the Emmitsburg and Gettysburg road in front of the cemetery', D, S_, ['co_10']),
     SUB('Robinson\'s division, including the 13th Massachusetts, hurried left; Coulter and Baxter hold a new line about 20:00-21:00', I, U_, [], 'Baxter and the 13th Massachusetts not quoted; Coulter\'s own hour is 22:00')],
    {'co_10': ('OR27-1-R044', 'About 10 p. m. were placed in position on the Emmitsburg and Gettysburg road and in front of the cemetery')},
    scenarios=[SCN('A', 'New line by about 20:00-21:00', 'seed', I), SCN('B', 'In position about 22:00', 'Coulter OR27-1-R044 p.294', D, ['co_10'])])

ROW('T2-192', 'partially_supported',
    'Greene: the brigade was "attacked on the whole of our front ... a few minutes before 7 p. m."; Walker (Stonewall brigade): after nightfall took position near the Hanover road on the extreme left; Johnson: dusk-dark; the 19:00-20:00 window is carried as a range, no default.',
    [SUB('Greene: attacked on the whole of our front a few minutes before 7 p. m.', D, S_, ['gr_att', 'gr_7']),
     SUB('Walker: after nightfall took position on the southeast side of the town near the Hanover road, on the extreme left of the line', D, S_, ['wa_han']),
     SUB('Attack begins about 19:00 (Wikipedia/NPS), 19:30 (EPP), 20:00 (NPS11); about 4,700 Confederates against about 1,400', I, C_, [], 'hour disagreement is real')],
    {'gr_att': ('OR27-1-R307', 'attacked on the whole of our front'),
     'gr_7': ('OR27-1-R307', 'a few minutes before 7 p. m'),
     'wa_han': ('OR27-2-R488', 'after nightfall took position on the southeast side of the town, near the Hanover')},
    scenarios=[SCN('A', 'About 19:00', 'Greene OR27-1-R307 p.856', D, ['gr_att', 'gr_7']), SCN('B', 'About 19:30', 'seed (EPP)', I), SCN('C', 'About 20:00', 'NPS section 11', I)])

ROW('T2-193', 'partially_supported',
    'Crawford: the Pennsylvania Reserves moved toward a wheat-field between two thick belts of woods; the counterattack hour is not printed; the seed\'s Wofford pushed back to Stony Hill and Crawford pulling back to the east edge of the Wheatfield are not quoted.',
    [SUB('Crawford describes a descent across low marshy ground to a wheat-field lying between two thick belts of woods', D, S_, ['cr_wheat']),
     SUB('McCandless\'s counterattack at 19:00-19:30; Wofford pushed back to Stony Hill; Crawford pulls back to the east edge of the Wheatfield', I, U_, [], 'hour not printed; Crawford p.653-654 sentences not isolated here')],
    {'cr_wheat': ('OR27-1-R218', 'wheat-field lying } between two thick belts of woods beyond')})

ROW('T2-194', 'partially_supported',
    'Kershaw: the division was formed along the wall, Semmes in reserve to him and Barksdale on his left supported by Wofford in reserve; Wofford\'s advance and the push east into the Valley of Death have no OR clock hour.',
    [SUB('Kershaw: along the wall the division was formed, Semmes in reserve, Barksdale on his left, supported by Wofford in reserve', D, S_, ['k_res']),
     SUB('Wofford advances about 19:00-19:30; Anderson, Semmes and Kershaw push east into the Valley of Death', I, U_, [], 'no clock hour; Kershaw p.369-370 sentences not isolated here')],
    {'k_res': ('OR27-2-R432', 'Semmes in reserve to me and Barksdale on my left, supported by Wofford, in reserve')})

ROW('T2-195', 'partially_supported',
    'Garrard: Weed, the brigade commander, was mortally wounded on the summit of the ridge a few moments after placing his command in position; Hunt: Rittenhouse commanded Hazlett\'s battery; "about 19:00", the Devil\'s Den sharpshooters and Weed\'s death in the Weikert basement are not quoted.',
    [SUB('Garrard: a few moments after General Weed, the brigade commander, had placed his command in position on this ridge, he was mortally wounded', D, S_, ['ga_weed']),
     SUB('Hunt: Rittenhouse\'s (late Hazlett\'s, D, Fifth United States) battery', D, S_, ['hu_rit']),
     SUB('Sharpshooters at Devil\'s Den fire on Ayres\'s division about 19:00 and kill Hazlett; Weed carried to the Weikert basement and dies before dawn', I, U_, [], 'W-D2, W-LRT, HN-WEI, CWE-HAZ')],
    {'ga_weed': ('OR27-1-R217', 'General Weed, the brigade commander, had placed his command in position on this ridge, he was mortally wounded'),
     'hu_rit': ('OR27-1-R028', 'Rittenhouse\'s (late Hazlett\'s, D, Fifth United States')})

ROW('T2-196', 'partially_supported',
    'Fisher: at 10 p. m. he ascended Round Top and "at once threw up a stone wall across the entire ravine and up the hill"; the seed has Weed\'s brigade, an Ohio battery and construction from about 20:00 on Little Round Top\'s south slope, which is not in the OR; no profile may be taken from the rebuilt modern wall.',
    [SUB('Fisher: the brigade at once threw up a stone wall across the entire ravine and up the hill (after 22:00 on Jul 2)', D, S_, ['fi_wall']),
     SUB('Weed\'s brigade, five Pennsylvania Reserves regiments and an Ohio battery hold Little Round Top\'s south slope and fortify it from about 20:00', I, C_, [], 'NPS-LRT, W-LRT, AH-LRT; not in the OR')],
    {'fi_wall': ('OR27-1-R220', 'at once threw up a stone wall across the entire ravine and up the hill')},
    scenarios=[SCN('A', 'Fisher\'s stone wall between the Round Tops after 22:00 on Jul 2', 'OR27-1-R220 p.658', D, ['fi_wall']), SCN('B', 'Weed\'s brigade builds the south-slope wall from about 20:00', 'seed (NPS-LRT, W-LRT)', I)])

ROW('T2-197', 'partially_supported',
    'Chamberlain: "At dusk. Colonel Rice informed me of the fall of Colonel Vincent ... and that Colonel Fisher had come up with a brigade to our support. These troops were massed in our rear." The place "behind the line east of the Round Tops" is the seed\'s wording.',
    [SUB('At dusk Colonel Rice informed Chamberlain of the fall of Colonel Vincent, which had devolved the command of the brigade on him', D, S_, ['c_rice']),
     SUB('Colonel Fisher had come up with a brigade to their support; these troops were massed in their rear', D, S_, ['c_fish', 'c_rear']),
     SUB('The place is behind the line east of the Round Tops', I, U_, [], 'Chamberlain says only "in our rear"')],
    {'c_rice': ('OR27-1-R196', 'At dusk. Colonel Rice informed me of the fall of Colonel Vincent'),
     'c_fish': ('OR27-1-R196', 'Fisher had come up with a brigade to our supporf'),
     'c_rear': ('OR27-1-R196', 'These troops were massed in our rear')})

ROW('T2-198', 'partially_supported',
    'Early: "as soon as Johnson became warmly engaged, which was a little before dusk, I ordered Hays and Avery to advance and carry the works on the heights"; the unit sizes, the 17th Connecticut gap, the pre-existing stone wall, the damage to the Evergreen gatehouse and cemetery are not in this passage.',
    [SUB('Early: as soon as Johnson became warmly engaged, which was a little before dusk, he ordered Hays and Avery to advance and carry the works on the heights', D, S_, ['ea_dusk']),
     SUB('Hays about 1,200 and Avery about 900; 17th Connecticut gap at the wall; Hays enters the batteries of Wiedrich and Ricketts; Harris holds a pre-existing wall; cemetery damage', I, U_, [], 'W-ECH, SS2, EPP, NPS12, W-EVER, NPS-BLD, GD-HOUSCH')],
    {'ea_dusk': ('OR27-2-R470', 'as soon as Johnson became warmly engaged, which was a little before dusk, I ordered Hays and Avery to advance and carry the works on the heights')},
    scenarios=[SCN('A', 'About 19:30', 'SS2, W-ECH', I), SCN('B', 'About 20:00', 'EPP, W-D2', I), SCN('C', '20:00-21:00', 'NPS section 12', I), SCN('D', 'A little before dusk (about 19:00-19:30)', 'Early OR27-2-R470 p.470', D, ['ea_dusk'])])

ROW('T2-199', 'partially_supported',
    'Hampton: "Night coming on, I held the ground until morning, when I found that the enemy had retreated from Hunterstown, leaving some of his wounded"; Kilpatrick ordered to Two Taverns at 11 p. m.; the seed (Hampton withdraws toward Gettysburg and camps north of town) conflicts.',
    [SUB('Hampton: night coming on, he held the ground until morning, when he found the enemy had retreated from Hunterstown', D, S_, ['ha_held']),
     SUB('Hampton withdraws toward Gettysburg and camps north of town; Union cavalry stays at Hunterstown', I, C_, [], 'W-HUN, W-ECF; contradicted by Hampton\'s own report')],
    {'ha_held': ('OR27-2-R567', 'Night coming on, I held the ground until morning, when I found that the enemy had retreated from Hunterstown, leaving some of his wounded officers and men in the village')},
    scenarios=[SCN('A', 'Hampton withdraws toward Gettysburg and camps north of town', 'seed (W-HUN, W-ECF, HAMP)', I), SCN('B', 'Hampton holds the ground through the night; the Union cavalry leaves Hunterstown by morning', 'Hampton OR27-2-R567 p.724; Kilpatrick OR27-1-R359 p.992', D, ['ha_held'])])

ROW('T2-200', 'partially_supported',
    'Stuart: his advance reached Gettysburg Jul 2; Jenkins was "wounded the day previous, before reporting to me"; Colonel Ferguson commanded the brigade on Jul 3; where and when Jenkins was wounded and the evening arrival hours of the brigades are a gap.',
    [SUB('Stuart: Jenkins was wounded the day previous, before reporting to him', D, S_, ['s_jenk']),
     SUB('Stuart\'s advance reached Gettysburg July 2', D, S_, ['s_jul2']),
     SUB('Stuart\'s brigades arrive that evening; Stuart\'s gear (red-lined cape, yellow sash, plumed hat)', I, U_, [], 'W-ECF, W-STU, OOB-C, W-3DCAV')],
    {'s_jenk': ('OR27-2-R565', 'wounded the day previous, before reporting to me'),
     's_jul2': ('OR27-2-R565', 'My advance reached Gettysburg July 2')})

ROW('T2-201', 'partially_supported',
    'Computed row: sunset at 19:31.8 LMT on Jul 2 reproduces from the project ephemeris; astronomical horizon only.',
    [SUB('Sunset 19:32 LMT, Jul 2', I, K_, [], 'COMPUTED')], tier='inferred')

ROW('T2-202', 'partially_supported',
    'Greene: the intrenchments of Kane\'s brigade and Williams\' division were left unoccupied at 6.30 p. m.; Johnson: Steuart\'s brigade carried a line of breastworks; the units named (the 23rd and 10th Virginia, 1st Maryland Bn), the outflanking of the 137th NY and the friendly volley are the shard\'s reading and are not isolated here.',
    [SUB('Greene: the intrenchments of Kane\'s brigade and Williams\' division were left unoccupied', D, S_, ['gr_unocc']),
     SUB('Johnson: Steuart\'s brigade, on the left, carried a line of breastworks', D, S_, ['jo_steu']),
     SUB('After dark Steuart pushes up the swale against the 149th and 137th NY; the 23rd and 10th Virginia take the empty works; the 14th Brooklyn drives them back; a mistaken volley by the 1st NC hits the 1st Maryland Bn', I, U_, [], 'Steuart R482 p.510 sentences not isolated here')],
    {'gr_unocc': ('OR27-1-R307', 'leaving the intrenchments of Kane\'s brigade and Williams\' division unoccupied'),
     'jo_steu': ('OR27-2-R481', 'Steuart\'s brigade, on the left, carried a line of breastworks which ran perpendicular to the enemy\'s main line')})

ROW('T2-203', 'gap',
    'Muzzle flashes, shell bursts and fuse trails as the main light sources during the evening attacks: a night-light hypothesis, plausible-procedural, no accounts found; not an OR claim.',
    [SUB('Muzzle flashes, shell bursts and fuse trails are the main light sources during the evening attacks (orange, short)', P, 'procedural', [], 'ENV-NIGHT hypothesis')],
    tier='plausible-procedural')

ROW('T2-204', 'partially_supported',
    'Greene lists the reinforcements from the First and Eleventh Corps (the 147th New York and the 82nd Illinois, 45th New York and 61st Ohio); Hancock: the 71st Pennsylvania and 106th Pennsylvania were sent from the Second Corps; Schurz names the 157th New York as a fourth Eleventh Corps regiment guided to the hill; three or four XI Corps regiments is a unit-list scenario; the 137th NY refusing into the traverse and losing nearly a third are not quoted.',
    [SUB('Greene: reinforcements included the One hundred and forty-seventh New York from the First Corps and the Eighty-second Illinois, Forty-fifth New York and Sixty-first Ohio', D, S_, ['gr_reinf']),
     SUB('Hancock: the Seventy-first Pennsylvania and the One hundred and sixth Pennsylvania were directed to Greene\'s point', D, S_, ['ha_71']),
     SUB('Schurz: two regiments (the One hundred and fifty-seventh New York and the Sixty-first Ohio) were guided by a First Corps staff officer', D, S_, ['sc_157']),
     SUB('The 137th NY refuses its line into the traverse and loses nearly a third; about 750 together', I, U_, [], NR)],
    {'gr_reinf': ('OR27-1-R307', 'and the Eighty-second Illinois, Lieutenant-Colonel Salomon; Fortyfifth New York, Colonel Amsberg'),
     'ha_71': ('OR27-1-R076', 'The Seventy-first Pennsylvania, Col. R. Penn Smith, and the One hundred and sixth Pennsylvania'),
     'sc_157': ('OR27-1-R253', 'Two regiments (the One hundred and fifty-seventh New York and the Sixty-first Ohio) were guided by one of these officers')},
    scenarios=[SCN('A', 'Three XI Corps regiments (Greene)', 'Greene OR27-1-R307 p.856', D, ['gr_reinf']), SCN('B', 'Four (Schurz adds the 157th NY)', 'Schurz OR27-1-R253 p.731', D, ['sc_157'])])

ROW('T2-205', 'partially_supported',
    'Greene: "an incessant attack of two and a half hours"; Johnson: fire "until late in the night"; the end of the fighting about 22:00 is audit-attested and the "about 4 hours" is W-CH, not an OR statement; Jones wounded and Nicholls\'s four hours are not isolated here.',
    [SUB('Geary: the brigade sustained an incessant attack of two and a half hours', D, S_, ['ge_25']),
     SUB('Fighting about 20:00-22:00 versus about four hours (W-CH); Jones wounded; Nicholls fights about four hours with few Union losses', I, C_, [], 'the end of fighting at 22:00 and the other passages are not isolated here')],
    {'ge_25': ('OR27-1-R293', 'an incessant attack of two and a half hours')},
    scenarios=[SCN('A', 'About 2.5 hours', 'Greene/Geary OR27-1-R293 p.827', D, ['ge_25']), SCN('B', 'About 4 hours', 'W-CH', I)])

ROW('T2-206', 'confirmed',
    'Meade to Halleck, headed "July 2, 1863, 8 p. m." and received July 3 at 5.15 p. m.: the enemy attacked about 4 p. m. and, after one of the severest contests of the war, was repulsed at all points.',
    [SUB('The dispatch is headed Headquarters Army of the Potomac, July 2, 1863, 8 p. m. (received July 3, 5.15 p. m.), to Maj. Gen. H. W. Halleck, General-in-Chief', D, S_, ['m_head']),
     SUB('The enemy attacked about 4 p. m. and, after one of the severest contests of the war, was repulsed at all points', D, S_, ['m_rep'])],
    {'m_head': ('OR27-1-R006', 'Headquarters Army of the Potomac, July 2, 1863—8 p. m. (Received July 3, 5.15 p. m.) Maj. Gen. H. W. Halleck, General-in-Chief'),
     'm_rep': ('OR27-1-R006', 'The enemy attacked me about 4 p. m. this day, and, after one of the severest contests of the war, was repulsed at all points')})

ROW('T2-207', 'partially_supported',
    'Hancock: a brigade (Carroll\'s) was sent to Howard\'s front; Lee: Rodes not ready; Ramseur halted at dark; Avery mortally wounded and the roles of Krzyzanowski\'s regiments and Gordon are not isolated as quotations here.',
    [SUB('Carroll\'s brigade (II Corps) is sent to Howard\'s front and retakes the position; Rodes is not ready; Ramseur halts; Avery mortally wounded; Krzyzanowski\'s regiments help', I, U_, [], 'Hancock p.372, Lee p.319 and Ramseur p.587-588 sentences not isolated here')], tier='inferred')

ROW('T2-208', 'partially_supported',
    'Computed row: civil dusk 20:04.4 LMT and astronomical dusk 21:33.1 LMT on Jul 2 reproduce from the project ephemeris.',
    [SUB('Civil twilight ends 20:04; astronomical twilight ends 21:33, Jul 2', I, K_, [], 'COMPUTED')], tier='inferred')

ROW('T2-209', 'partially_supported',
    'Kilpatrick: attacked at sundown near Hunterstown; at 11 p. m. ordered to Two Taverns, reached at daylight; the gap partly closes by his report (night position Hunterstown then Two Taverns, the 8 a. m. Jul 3 order); Custer\'s redirection to Gregg is in Gregg\'s report and was not re-read here.',
    [SUB('Kilpatrick: attacked by Stuart, Hampton and Lee at sundown near Hunterstown', D, S_, ['ki_sun']),
     SUB('Custer is redirected to Gregg on Jul 3; Farnsworth\'s brigade moves toward Gettysburg', I, U_, [], 'Gregg R344 p.956 not re-read')],
    {'ki_sun': ('OR27-1-R359', 'Was attacked by Stuart, Hampton, and Lee at sundown near Hunterstown')}, tier='open gap')

ROW('T2-210', 'partially_supported',
    'Lee\'s decision to continue and the assignments of Longstreet and Ewell are in his report; Stuart\'s orders to operate on Ewell\'s left are in his own; "no council of war" and Lee\'s reconnaissance are the seed\'s statements not isolated here.',
    [SUB('Lee resolves to continue; Ewell is ordered to attack the Union right at daylight; Stuart to operate on Ewell\'s left; no council of war', I, U_, [], 'Lee R426 p.320 and Stuart R565 p.689 sentences not isolated here')], tier='inferred')

ROW('T2-211', 'partially_supported',
    'Pickett\'s arrival conflicts inside the OR (Lee\'s two reports: morning of Jul 3 versus afternoon of Jul 2; Peyton: reached the field about 9 a. m.); Stuart\'s advance reached Gettysburg Jul 2; the ledger B.2.4 forbids showing Pickett before the earliest selectable arrival.',
    [SUB('Stuart\'s advance reached Gettysburg July 2', D, S_, ['s_jul2']),
     SUB('Pickett\'s division on the field by night of Jul 2 (Wikipedia) or not until Jul 3 (Stone Sentinels, Lee 1863)', D, C_, [], 'Lee\'s two reports disagree')],
    {'s_jul2': ('OR27-2-R565', 'My advance reached Gettysburg July 2')},
    scenarios=[SCN('A', 'On the field the night of Jul 2', 'Lee\'s later report; W-D2', I), SCN('B', 'Joined Longstreet the morning of Jul 3', 'Lee OR27-2-R426 p.308', I), SCN('C', 'Reached the field about 9 a. m. Jul 3', 'Peyton OR27-2-R441 p.385', I)])

ROW('T2-212', 'partially_supported',
    'Computed row: moonrise 20:37.6 LMT, altitude 3.07 deg at 21:00, 13.05 at 22:00, 29.2 at 24:00, 35.9 at 02:00, 29.8 at 04:00 and illumination 94.9-95.5 percent reproduce from the project ephemeris; the cirrus at 21:00 and Nofi\'s remark are secondary and the 0.1-0.2 lux is an estimate.',
    [SUB('Moonrise 20:38 LMT and the moon altitudes listed (project ephemeris)', I, K_, [], 'COMPUTED'),
     SUB('Cirrus at 21:00 (Jacobs); the moon fairly bright (Nofi); moonlight 0.1-0.2 lux', I, U_, [], 'secondary and estimate')], tier='inferred')

ROW('T2-213', 'gap',
    'A Confederate picket singing hymns after the moon rises, applauded by nearby Union soldiers: a soldier anecdote bounded below by the computed moonrise 20:38; the NPS account was not read (audit downgrade to inferred).',
    [SUB('Picket sings hymns after the moon rises; Union soldiers applaud', I, U_, [], 'NPS8 account not read')], tier='inferred')

ROW('T2-214', 'partially_supported',
    'Ramseur halted at dark judging the position too strong; Rodes was not ready; the quotations (halt, two lines behind stone walls and artillery) are not isolated here; Ramseur\'s own wording is "halt" at p.587-588.',
    [SUB('Rodes deploys late; Ramseur pushes back Union skirmishers and halts, judging a night attack futile against two lines behind stone walls and artillery about 21:00', I, U_, [], 'Ramseur p.587-588 sentences not isolated as quotations here (the passage has an order to halt and form line and a later "halt and confer with General Doles")')], tier='inferred')

ROW('T2-215', 'partially_supported',
    'Chamberlain: "It was now 9 p. m. ... with bayonets fixed ... 200 men pressed up the mountain side ... we laid hold of 25 prisoners"; Fisher dates the ascent at 10 p. m.; the hour is carried as scenarios (21:00 Chamberlain, 22:00 Fisher).',
    [SUB('Chamberlain: it was now 9 p. m.', D, S_, ['c_9pm']),
     SUB('Chamberlain: with bayonets fixed, 200 men pressed up the mountain side', D, S_, ['c_200']),
     SUB('Chamberlain: they laid hold of 25 prisoners', D, S_, ['c_25']),
     SUB('Fisher: at 10 p. m. ascended the hill with the Fifth and Twelfth Reserves and the 20th Maine', D, C_, ['f_10'])],
    {'c_9pm': ('OR27-1-R196', 'It was now 9 p. m'),
     'c_200': ('OR27-1-R196', '200 men pressed up the mountain side'),
     'c_25': ('OR27-1-R196', 'we laid hold of 25 prisoners'),
     'f_10': ('OR27-1-R220', 'at 10 p. m. ascended the hill')},
    scenarios=[SCN('A', 'About 21:00', 'Chamberlain OR27-1-R196 p.625', D, ['c_9pm']), SCN('B', 'About 22:00', 'Fisher OR27-1-R220 p.658', D, ['f_10'])])

ROW('T2-216', 'partially_supported',
    'The OR gives no start hour for the council of war at Meade\'s headquarters; Gibbon says the sitting ran to nearly midnight, Slocum says evening; the windows 21:00-24:00 are carried as scenarios without a default; the OR minutes name Birney among the attendees (the seed says not named).',
    [SUB('Council of corps commanders on the night of Jul 2 at army headquarters', I, U_, [], 'start hour not printed; Gibbon R006 p.127 "nearly midnight" and the minutes p.74 not isolated as quotations here'),
     SUB('Leister house details (two rooms, shot damage and fence loss on Jul 3)', I, U_, [], 'SS-LEISTER, NPS-H1, W-PC secondary')],
    scenarios=[SCN('A', 'About 21:00', 'SS2', I), SCN('B', 'Nearly midnight', 'NPS Handbook 9, Gibbon (not re-quoted)', I), SCN('C', 'Evening, no hour', 'Slocum (not re-quoted)', I)])

ROW('T2-217', 'gap',
    '76 F and cirrus at 21:00 (Jacobs) and the humidity estimates reach the repository only through secondary summaries; Jacobs\'s original thermometer sheets were not read.',
    [SUB('76 F; cirrus sky at 21:00; humidity 75-90% at dawn, 55-70% in the afternoon', G, U_, [], 'secondary; humidity inferred')], tier='inferred')

ROW('T2-218', 'unsupported',
    'Letterman names none of the III Corps hospital sites or counts; HMDB17931 was requested on 2026-11-04 and answered HTTP 403 (not circumvented).',
    [SUB('III Corps division hospitals on the Taneytown Road move that night to the south side of White Run about 300 yards from Rock Creek; over 2,500 wounded; closed about Aug 6', G, U_, [], 'HMDB17931 blocked; Letterman is general only')],
    remains=['III Corps hospital sites'], tier='inferred')

ROW('T2-219', 'unsupported',
    'No OR passage for the V Corps hospital moves; HMDB17934 not requested after the 403 of the same host; the Weikert timing conflict (overnight versus early Jul 3) is carried.',
    [SUB('V Corps hospitals at the Weikert house move overnight across Rock Creek; Weed dies in the Weikert basement before dawn; about 1,400 wounded', G, C_, [], 'HMDB17934, HN-WEI not local; timing early Jul 3 versus overnight')],
    remains=['V Corps hospital sites and the Weikert timing'], tier='inferred')

ROW('T2-220', 'unsupported',
    'Spangler details (four operating tables under the barn forebay, lanterns, chloroform, about 80 amputees, no hand washing) are not in the OR; two guessed NPS URLs returned 404 and were not used; a site-limited NPS search found no support.',
    [SUB('Surgeons at four tables under the Spangler barn forebay operating night and day with lanterns; chloroform; about 80 amputees; no hand washing', G, U_, [], 'HN-SPG, TRE, GETEXP not local')],
    remains=['a non-lead source for the Spangler hospital details'], tier='inferred')

ROW('T2-221', 'unsupported',
    'No OR support for the Rose, Trostle, Hummelbaugh, Bushman, Slyder and Lady hospital assignments or Sickles\'s amputation location; the secondary pages (NPS9, ROSEB, NPS8, ECW-HOSP, SS-*) were not re-fetched.',
    [SUB('Rose barn Confederate hospital; Trostle farm III and V Corps wounded; Hummelbaugh II Corps; Bushman barn with 8 Confederates buried; Slyder and Lady farms; Sickles\'s leg amputated that night', G, U_, [], 'secondary pages not read')],
    remains=['hospital assignments and the amputation location'], tier='inferred')

ROW('T2-222', 'partially_supported',
    'Martin: "Rittenhouse, upon whom the command of the battery devolved after the death of the lamented Hazlett"; that the battery fired until after dark at about 22:00 is not stated.',
    [SUB('Martin: Rittenhouse, upon whom the command of the battery devolved after the death of the lamented Hazlett', D, S_, ['ma_rit']),
     SUB('The battery fires until after dark about 22:00', I, U_, [], 'no hour in the quoted passage')],
    {'ma_rit': ('OR27-1-R221', 'Rittenhouse, upon whom the command of the battery devolved after the death of the lamented Hazlett')})

ROW('T2-223', 'partially_supported',
    'Chamberlain: the regiment was placed in a strong position among the rocks and took 25 prisoners; Fisher: at 10 p. m. he ascended the hill and took over 30 prisoners; 25 versus over 30 is a range and the hour is carried (see T2-215).',
    [SUB('Chamberlain: we laid hold of 25 prisoners', D, S_, ['c_25']),
     SUB('Fisher: at 10 p. m. ascended the hill', D, S_, ['f_10']),
     SUB('The 20th Maine holds the crest about 21:00-22:00', I, C_, [], 'hour differs by one hour between the two reports')],
    {'c_25': ('OR27-1-R196', 'we laid hold of 25 prisoners'), 'f_10': ('OR27-1-R220', 'at 10 p. m. ascended the hill')},
    scenarios=[SCN('A', '25 prisoners (Chamberlain)', 'OR27-1-R196 p.625', D, ['c_25']), SCN('B', 'Over 30 prisoners (Fisher)', 'OR27-1-R220 p.658', I)])

ROW('T2-224', 'corrected',
    'McNulty (XII Corps), quoted by Letterman, means the six hours "after the battle ended"; the standard was that the wounded be removed, sheltered, fed and dressed within six hours after the battle ended and every capital operation done within twenty-four hours after the injury; it is not a statement about the night of Jul 2.',
    [SUB('Every capital operation performed within twenty-four hours after the injury was received', D, S_, ['le_24']),
     SUB('The six hours run after the battle ended', D, S_, ['le_after']),
     SUB('The XII Corps wounded were removed, sheltered, fed and dressed within six hours on the night of Jul 2', D, X_, [], 'mis-timed: after the battle ended, not Jul 2 night')],
    {'le_24': ('OR27-1-R016', 'every capital operation performed within twenty-four hours after the injury was received'),
     'le_after': ('OR27-1-R016', 'after the battle ended')})

ROW('T2-225', 'gap',
    'Appearance of bodies in the Plum Run valley by moonlight and recovery by lantern: no OR passage; an open gap already declared by the seed; the regimental histories named were not searched.',
    [SUB('Dead and wounded in the valley by moonlight; lantern recovery', G, U_, [], 'not found')],
    remains=['regimental histories of the 40th NY, 124th NY, 4th Maine; Benning\'s and Robertson\'s brigades'], tier='plausible-procedural')

ROW('T2-226', 'partially_supported',
    'Crawford: the Jul 3 charge recovered "all of our wounded, who, mingled with those of the rebels, were lying uncared for"; this supports wounded of both sides left in the Wheatfield ground on the morning of Jul 3; crawling toward Plum Run on Jul 2 night and the Jul 4 flooding are not in the OR.',
    [SUB('Crawford: the charge recovered all of our wounded, who, mingled with those of the rebels, were lying uncared for', D, S_, ['cr_wd']),
     SUB('Wounded crawl toward Plum Run on Jul 2 night; Plum Run floods on Jul 4', I, U_, [], 'NPS8, AMS secondary')],
    {'cr_wd': ('OR27-1-R218', 'all of our wounded, who, mingled with those of the rebels, were lying uncared for')}, tier='inferred')

ROW('T2-227', 'gap',
    'Guild\'s report begins with the withdrawal orders at midnight of Jul 3 and says nothing of the Jul 2-3 night: the seed\'s gap statement is correct.',
    [SUB('Confederate hospital organisation on the night of Jul 2-3', G, U_, [], 'Guild R427 p.326 starts at the withdrawal')],
    remains=['hospital organisation before the withdrawal'], tier='plausible-procedural')

ROW('T2-228', 'partially_supported',
    'Geary: "an incessant attack of two and a half hours"; Johnson: fire kept up "until late in the night"; the Culp\'s Hill fighting ended about 21:30-22:00; no OR statement ends the fighting on the whole field at 22:30.',
    [SUB('Geary: the brigade sustained an incessant attack of two and a half hours', D, S_, ['ge_25']),
     SUB('Fighting ends about 22:30 on the whole field, both armies', I, U_, [], 'no OR statement; Culp\'s Hill about 21:30-22:00')],
    {'ge_25': ('OR27-1-R293', 'an incessant attack of two and a half hours')})

ROW('T2-229', 'partially_supported',
    'Letterman: the Ambulance Corps lost "1 officer and 4 privates were killed and 17 wounded"; that by early Jul 4 no wounded remained within Union lines is attested by the shard\'s audit and was not re-found; burial parties, lanterns and torches remain the gap the seed states.',
    [SUB('Ambulance Corps loss: 1 officer and 4 privates were killed and 17 wounded', D, S_, ['le_loss']),
     SUB('Burial parties, lanterns and torch use at night; night rescue detail', G, U_, [], 'not found')],
    {'le_loss': ('OR27-1-R016', '1 officer and 4 privates were killed and 17 wounded')}, tier='open gap')

ROW('T2-230', 'partially_supported',
    'Ruger: returning in the dark he found the breastworks "occupied by the enemy in force" and "deemed it unwise to attack the enemy, owing to the darkness"; the return hour differs (about 21:00 Geary; about 23:00 EPP; to 01:00; about 04:00 CWN) and the OR does not support the seed\'s 02:00-04:00 animation window.',
    [SUB('Ruger: returning in the dark, he found the breastworks occupied by the enemy in force', D, S_, ['ru_occ']),
     SUB('Ruger: he deemed it unwise to attack the enemy, owing to the darkness', D, S_, ['ru_dark']),
     SUB('Return of Geary and Ruger about 23:00 (EPP) or about 04:00 (CWN); animation window 02:00-04:00', I, C_, [], 'hour disagreement; not an OR statement')],
    {'ru_occ': ('OR27-1-R273', 'occupied by the enemy in force'),
     'ru_dark': ('OR27-1-R273', 'I deemed it unwise to attack the enemy, owing to the darkness')},
    scenarios=[SCN('A', 'About 21:00', 'Geary OR27-1-R293 p.827 (not re-quoted)', I), SCN('B', 'About 23:00', 'seed (EPP)', I), SCN('C', 'To about 01:00', 'Geary, First Brigade (not re-quoted)', I), SCN('D', 'About 04:00', 'seed (CWN)', I)])

ROW('T2-231', 'partially_supported',
    'Slocum and Williams describe the XII Corps wrong-road march and return in outline (Two Taverns versus Littlestown); the sentences are not isolated here; the daybreak attack plan is Geary\'s (p.827-828).',
    [SUB('Geary misread orders, marched down the Baltimore Pike, then returned; scouts report Confederates in the works; a daybreak attack is planned', I, U_, [], 'Slocum R271 p.764 and Williams R272 p.774 sentences not isolated as quotations here')], tier='inferred')

ROW('T2-232', 'partially_supported',
    'Ruger: the Union decision not to attack in the dark ("I deemed it unwise to attack the enemy, owing to the darkness"); Johnson pulling back two brigades and leaving Steuart on the lower heights is the seed\'s statement not isolated here.',
    [SUB('Ruger deemed it unwise to attack the enemy, owing to the darkness', D, S_, ['ru_dark']),
     SUB('Johnson pulls back two brigades, leaving Steuart on the lower heights', I, U_, [], 'Johnson R481 p.504 sentence not isolated here')],
    {'ru_dark': ('OR27-1-R273', 'I deemed it unwise to attack the enemy, owing to the darkness')})

ROW('T2-233', 'partially_supported',
    'Hunt: "At 1 a. m. of the 3d, Muhlenberg\'s ... and Kinzie\'s ... batteries were posted opposite the center of the line of the Twelfth Corps ... Soon after daylight, Rigby\'s battery ... was also placed on the hill"; the place names (the Pike, Powers Hill, McAllister Hill) are not in Hunt\'s sentence and the seed marks the placement inferred.',
    [SUB('Hunt: at 1 a. m. of the 3d, Muhlenberg\'s and Kinzie\'s batteries were posted opposite the center of the line of the Twelfth Corps', D, S_, ['hu_1am']),
     SUB('Hunt: soon after daylight Rigby\'s battery was also placed on the hill', D, S_, ['hu_rig']),
     SUB('Muhlenberg along the Pike, Rigby on Powers Hill, another battery on McAllister Hill', I, U_, [], 'place names not in Hunt\'s sentence (NPS-H1)')],
    {'hu_1am': ('OR27-1-R028', 'At 1 a. m. of the 3d, Muhlenberg\'s (F, Fourth United States, six 12-poun(iers) and Kinzie\'s (K, Fifth United States, four 12-pounders) batteries were posted opposite the center of the line of the Twelfth Corps'),
     'hu_rig': ('OR27-1-R028', 'Soon after daylight, Rigby\'s battery (A, Maryland, six 3-inch) was also')})

ROW('T2-234', 'partially_supported',
    'Duplicate anchor of T2-216: the council of war on the night of Jul 2; the OR gives no start hour (Gibbon: nearly midnight); carried as scenarios within 21:00-24:00, no default.',
    [SUB('Council of corps commanders at Meade\'s headquarters about midnight (NPS Handbook)', I, C_, [], 'Gibbon R006 p.127 and the minutes p.74 not isolated as quotations here; start hour not printed')],
    scenarios=[SCN('A', 'About 21:00', 'T2-216 seed (SS2)', I), SCN('B', 'Nearly midnight', 'NPS Handbook, Gibbon (not re-quoted)', I)])

ROW('T2-235', 'partially_supported',
    'Fisher: "at 10 p. m. ascended the hill" with the Fifth and Twelfth Reserves and the 20th Maine; Chamberlain: Fisher\'s brigade "massed in our rear" and "I saw no more of them that night"; the seed\'s about-midnight arrival is a conflicting hour.',
    [SUB('Fisher: at 10 p. m. ascended the hill with the Fifth and Twelfth Reserves and the 20th Maine', D, S_, ['f_10']),
     SUB('Chamberlain: these troops were massed in our rear', D, S_, ['c_rear']),
     SUB('Two regiments of Fisher\'s brigade arrive near the summit about midnight', I, C_, [], 'CHAM as cited by the seed; Chamberlain gives no hour for the supports')],
    {'f_10': ('OR27-1-R220', 'at 10 p. m. ascended the hill'), 'c_rear': ('OR27-1-R196', 'These troops were massed in our rear')},
    scenarios=[SCN('A', 'About midnight', 'seed (CHAM)', I), SCN('B', 'Ascent at 22:00', 'Fisher OR27-1-R220 p.658', D, ['f_10'])])
