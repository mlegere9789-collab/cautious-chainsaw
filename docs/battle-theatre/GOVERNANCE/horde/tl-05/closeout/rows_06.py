"""Close-out rows of shard tl-06 (T2-063 .. T2-120)."""
from tl58lib import *

D, I, P, G = 'documented', 'inferred', 'plausible-procedural', 'open gap'
S_, U_, C_, X_, K_ = 'supported', 'unsupported', 'conflict', 'contradicted', 'computed'

ROW('T2-063', 'partially_supported',
    'Hancock: the Second Corps was on the field about 7 a. m. of the 2d; Webb: his brigade was put in position at 6.30 a. m. on Granite Ridge; the seed\'s 06:00 start (EPP), "Cemetery Ridge, left" and "Gibbon\'s division per EPP" have no OR counterpart as worded.',
    [SUB('Hancock: Second Corps arrival on the field about 7 a. m. of the 2d', D, S_, ['h_7']),
     SUB('Webb: brigade put in position at 6.30 a. m. on the 2d, on Granite Ridge', D, S_, ['w_630']),
     SUB('The arrival is at 06:00 and on the left of Cemetery Ridge', I, U_, [], 'EPP 06:00 has no OR counterpart; Webb names Granite Ridge, not the left of the line')],
    {'h_7': ('OR27-1-R076', 'about 7 a. m. of the 2d'), 'w_630': ('OR27-1-R104', 'put in position at 6.30 a. m. on the 2d, on Granite Ridge')},
    scenarios=[SCN('A', 'About 06:00', 'seed (EPP)', I), SCN('B', '06:30-07:00', 'Webb OR27-1-R104 p.427, Hancock OR27-1-R076 p.369', D, ['h_7', 'w_630'])])

ROW('T2-064', 'gap',
    'No OR passage gives Hood\'s arrival behind Seminary Ridge at 05:30-07:30; Longstreet gives Hood within about 4 miles about midnight and Law joined about noon; the values are Freeman\'s computation (secondary).',
    [SUB('Hood\'s division arrives behind Seminary Ridge about 06:30', G, U_, [], 'Freeman computes head 05:30 and whole division 07:00-07:30; not contradicted, not found'),
     SUB('Hood got within nearly the same distance (about 4 miles) of the town about 12 o\'clock at night', D, S_, ['l_hood'])],
    {'l_hood': ('OR27-2-R430', 'got within nearly the same distance of the town about 12 o\'clock at night')},
    remains=['Hood\'s arrival hour behind Seminary Ridge'], tier='open gap',
    searched=[SR(r'Hood', near=r'(arrived|reached|came up).{0,80}(morning|a\. m\.)', win=200, what='Hood\'s arrival on Jul 2 morning, OR27 part 2', parts=(2,))])

ROW('T2-065', 'partially_supported',
    'Birney: "At 7 a. m., under orders from Major-General Sickles, I relieved Geary\'s division"; he reached Gettysburg at 5.30 p. m. on Jul 1; the verb "Arrives" at Little Round Top at 07:00 is not what the OR supports (Birney names Sugar Loaf Mountain; Chamberlain applies "Sugar Loaf, or Round Top" to the eminence southwest of Little Round Top).',
    [SUB('Birney: at 7 a. m., under orders from Sickles, he relieved Geary\'s division', D, S_, ['b_7am']),
     SUB('Birney: his command reached Gettysburg at 5.30 p. m. (Jul 1)', D, S_, ['b_530']),
     SUB('Birney\'s division arrives in the Little Round Top area at 07:00', I, C_, [], 'SS1 (arrival at dusk Jul 1) and EPP describe two different events; "Little Round Top area" not established by Birney')],
    {'b_7am': ('OR27-1-R133', 'At 7 a. m., under orders from Major-General Sickles, I relieved Geary\'s division'), 'b_530': ('OR27-1-R133', 'My command reached Gettysburg at 5.30 p. m')},
    scenarios=[SCN('A', 'Arrives about 07:00 Jul 2 (EPP)', 'seed', I), SCN('B', 'Arrived 17:30 Jul 1; took over the left 07:00 Jul 2', 'Birney OR27-1-R133 p.482', D, ['b_7am', 'b_530'])])

ROW('T2-066', 'confirmed',
    'Chamberlain: the 20th Maine reached Hanover just before sunset on Jul 1, marched at once to Gettysburg, slept an hour or two by the roadside just before daybreak and reached the heights southeasterly of Gettysburg about 7 a. m. on Jul 2; the brigade was Vincent\'s (Third Brigade, First Division, Fifth Corps).',
    [SUB('The 20th Maine reached Hanover, Pa., just before sunset on Jul 1 and orders came to march forthwith to Gettysburg', D, S_, ['c_han']),
     SUB('After an hour or two of sleep by the roadside just before daybreak, the regiment reached the heights southeasterly of Gettysburg at about 7 a. m., July 2', D, S_, ['c_7']),
     SUB('The brigade was commanded by Colonel Vincent', D, S_, ['c_vin']),
     SUB('The brigade was the Third Brigade, First Division, Fifth Army Corps', D, S_, ['c_corps'])],
    {'c_han': ('OR27-1-R196', 'my command on reaching Hanover, Pa., just before sunset on that day, were much worn'),
     'c_7': ('OR27-1-R196', 'After an hour or two of sleep by the roadside just before daybreak, we reached the heights southeasterly of Gettysburg at about 7 a. m., July 2'),
     'c_vin': ('OR27-1-R196', 'Colonel Vincent, commanding the brigade'),
     'c_corps': ('OR27-1-R196', 'Third Brig., First Div., Fifth Army Corps')})

ROW('T2-067', 'partially_supported',
    'Alexander\'s battalion "arrived at 9 a. m. on July 2"; the 07:00 approach at one mile west of Seminary Ridge is not in the OR (inferred placement).',
    [SUB('Alexander: the battalion arrived at 9 a. m. on July 2', D, S_, ['a_9']),
     SUB('At 07:00 the battalion is approaching, one mile west of Seminary Ridge', I, U_, [], 'inferred placement, not in the OR')],
    {'a_9': ('OR27-2-R464', 'arrived at 9 a. m. on July 2')})

ROW('T2-068', 'gap',
    'Jacobs\'s 74 F, overcast, wind S/SSW at 07:00 on Jul 2 reaches the repository through secondary summaries and typed transcriptions; the OR carries no instrument readings; the Jacobs sheets were not found (failed lookup, no local text).',
    [SUB('74 F; overcast; wind S/SSW light at 07:00 (Jacobs)', G, U_, [], 'secondary summaries only; primary sheets not read'),
     SUB('Columns raise dust on roads dry after Jun 28-30', P, 'procedural', [], 'inference')],
    remains=['Jacobs\'s original 07:00 reading and the wind speed (12 mph versus about 2 mph)'], tier='open gap')

ROW('T2-069', 'partially_supported',
    'Letterman: on Jul 1 the trains were not permitted farther and on the 2d were ordered farther to the rear, near Westminster, nearly 25 miles from the battlefield; the Weikert hospital, V Corps surgeons, the 950 figure and the Sanitary Commission are not in the OR.',
    [SUB('On the 2d the trains were ordered still farther to the rear and parked near Westminster, nearly 25 miles distant from the battlefield', D, S_, ['l_west']),
     SUB('Weikert farm V Corps hospital with surgeons operating the morning of Jul 2, about 950 patients, Sanitary Commission supplies', G, U_, [], 'HN-WEI, NPS-ESS5, HMDB17934 not local texts'),
     SUB('Which Weikert (George or Jacob)', G, C_, [], 'name conflict in the secondary sources; no primary read')],
    {'l_west': ('OR27-1-R016', 'On the 2d, these trains were ordered still farther to the rear, and parked near Westminster, nearly 25 miles distant from the battlefield')},
    remains=['hospital location, surgeons, count, Sanitary Commission'], tier='open gap')

ROW('T2-070', 'partially_supported',
    'Sykes: the troops were "massed near the bridge over Rock Creek"; "Power\'s Hill" is not named; the seed tier is inferred.',
    [SUB('V Corps massed near the bridge over Rock Creek', D, S_, ['s_mass']),
     SUB('V Corps goes into general reserve at Power\'s Hill about 08:00', I, U_, [], 'Power\'s Hill not named; Slocum\'s 08:00 is a move to the left, a different step')],
    {'s_mass': ('OR27-1-R187', 'massed near the bridge over Rock Creek')}, tier='inferred')

ROW('T2-071', 'partially_supported',
    'Lockwood\'s regiments "reported to the First Division, Twelfth Army Corps, at 8 a. m. July 3" (the report prints July 3; the seed says July 2); Williams says Lockwood "reported on the 2d and 3d"; the page-image comparison has not been done.',
    [SUB('Lockwood: reported to the First Division, Twelfth Army Corps, at 8 a. m. July 3', D, S_, ['lo_8']),
     SUB('Lockwood: posted until about 5 p. m. of that day', D, S_, ['lo_5']),
     SUB('Williams: Lockwood reported on the 2d and 3d', D, S_, ['w_2d3d']),
     SUB('Lockwood arrives and joins Williams on Culp\'s Hill on Jul 2 at 08:00; Williams\'s division builds a log breastwork on arrival', I, C_, [], 'date in conflict (print or OCR reading July 3 versus the seed July 2); breastwork not tied to Lockwood\'s arrival')],
    {'lo_8': ('OR27-1-R282', 'reported to the First Division, Twelfth Army Corps, at 8 a. m. July 3'), 'lo_5': ('OR27-1-R282', 'until about 5 p. m. of that day'),
     'w_2d3d': ('OR27-1-R272', 'reported on the 2d and 3d')},
    scenarios=[SCN('A', 'Lockwood reports 08:00 July 2', 'seed (SS2, HN-WF)', I), SCN('B', 'Lockwood reports 08:00 July 3', 'Lockwood OR27-1-R282 p.804', D, ['lo_8'])],
    remains=['page-image check of the date July 3 against July 2'])

ROW('T2-072', 'gap',
    'Kershaw: left camp about sunrise and halted until about noon; no OR hour for McLaws\'s arrival behind Seminary Ridge (08:00-08:30 is Freeman\'s estimate).',
    [SUB('McLaws\'s division arrives behind Seminary Ridge about 08:00', G, U_, [], 'Freeman estimate; not contradicted'),
     SUB('Kershaw did not leave camp until about sunrise', D, S_, ['k_sun'])],
    {'k_sun': ('OR27-2-R432', 'did not leave camp until about sunrise')}, remains=['McLaws\'s arrival hour'], tier='open gap')

ROW('T2-073', 'gap',
    'Overcast, humid, foggy dawn burning off and 81 F at 14:00 come from Strategypage and TeachersFirst; Jacobs\'s original is not retrievable; no OR claim.',
    [SUB('Overcast, humid, foggy dawn burning off slowly; 81 F at 14:00', G, U_, [], 'secondary only')], remains=['primary Jacobs readings'], tier='open gap')

ROW('T2-074', 'partially_supported',
    'Farnham (16th Maine): "sharpshooters firing from the windows" of the town is supported; "from dawn", the belfry, the Sweney House, the Rupp house and bullet pocks are not in the OR.',
    [SUB('Confederate sharpshooters fired from the windows in the town', D, S_, ['f_sharp']),
     SUB('From dawn, from a church belfry and the Sweney House; Union skirmishers hold the Rupp house; John Rupp alone in his house', G, U_, [], 'W-BATTLEFIELD, GD-TOWN not local texts')],
    {'f_sharp': ('OR27-1-R045', 'sharpshooters firing from the windows')}, remains=['dawn start, belfry, named houses'])

ROW('T2-075', 'gap',
    'Crop and vegetation state on Jul 2: the OR names a wheat field as ground (Hunt) but gives no height or ripeness; the 1860 Adams County agricultural census was not retrieved.',
    [SUB('Wheat standing, about 3.5-4.5 ft; oats 2.5-3 ft; corn knee to waist high; hay meadows part cut; woodlots in full leaf', P, 'procedural', [], 'inferred from the agricultural calendar; exact ripeness not documented')],
    remains=['1860 agricultural census figures for the township'], tier='plausible-procedural')

ROW('T2-076', 'partially_supported',
    'Barnes: Little Round Top "an elevated and rocky hill"; Hunt: "a high, rocky, and broken peak"; Big Round Top wooded, Devil\'s Den diabase, the Peach Orchard fruit state, and wooded versus unwooded Little Round Top are not settled by any primary source read.',
    [SUB('Barnes: Little Round Top is an elevated and rocky hill', D, S_, ['ba_rock']),
     SUB('Hunt: a high, rocky, and broken peak', D, S_, ['hu_peak']),
     SUB('Big Round Top heavily wooded; west face bare; Devil\'s Den boulder-strewn diabase; Peach Orchard fruit state', G, C_, [], 'W-BATTLEFIELD versus W-LRT disagree on wooding; no primary source read')],
    {'ba_rock': ('OR27-1-R189', 'an elevated and rocky hill'), 'hu_peak': ('OR27-1-R028', 'a high, rocky, and broken peak')},
    remains=['wooded or unwooded Little Round Top'])

ROW('T2-077', 'corrected',
    'Ewell: the order to delay his attack until he heard Longstreet\'s guns came from "the general commanding" (Lee) as day was breaking, not from Meade at about 09:00; the row\'s "Meade/Ewell" is a label error of the secondary source.',
    [SUB('Orders came from the general commanding for Ewell to delay his attack until he heard General Longstreet\'s guns open on the right', D, S_, ['e_delay']),
     SUB('"Day was now breaking" when the orders were delivered to Johnson', D, S_, ['e_day']),
     SUB('Ewell is told by Meade at about 09:00 to begin his attack when he hears Longstreet\'s opening', I, X_, [], 'sender is the Confederate commanding general; time is daybreak')],
    {'e_delay': ('OR27-2-R467', 'orders had come from the general commanding for me to delay my attack until I heard General Longstreet\'s guns open'),
     'e_day': ('OR27-2-R467', 'Day was now breaking')},
    scenarios=[SCN('A', 'About 09:00, Meade to Ewell', 'seed (EPP, single weak source)', I), SCN('B', 'Daybreak; Lee to Ewell', 'Ewell OR27-2-R467 p.446', D, ['e_delay', 'e_day'])])

ROW('T2-078', 'partially_supported',
    'Hunt: "Smith\'s battery (Fourth New York, six 10-pounders) on the extreme left"; Smith: two sections on a hill near the Devil\'s Cave, one section 150 yards in rear; 09:00 arrival and 135 men are not found; the OR says 10-pounders, Parrott comes from the monument.',
    [SUB('Smith\'s battery (Fourth New York, six 10-pounders) on the extreme left', D, S_, ['hu_smith']),
     SUB('Smith placed two sections on a hill near the Devil\'s Cave, one section with caissons 150 yards in the rear', D, S_, ['s_cave']),
     SUB('Arrives 09:00; 135 men; Parrott rifles', I, U_, [], 'hour and strength not found; piece type from the monument only')],
    {'hu_smith': ('OR27-1-R028', 'Smith\'s battery (Fourth New York, six 10-pounders) on the extreme left'),
     's_cave': ('OR27-1-R184', 'I placed two sections of my battery on a hill (near the Devil\'s Cave)')})

ROW('T2-079', 'partially_supported',
    'Alexander: the battalion "arrived at 9 a. m. on July 2"; the seed merges units: Eshleman\'s Washington Artillery is a separate battalion with its own report, and Huger\'s four batteries are those Alexander placed about 16:00.',
    [SUB('Alexander: the battalion arrived at 9 a. m. on July 2', D, S_, ['a_9']),
     SUB('Huger\'s four batteries and Eshleman\'s Washington Artillery reach the ridge at 09:00', I, C_, [], 'separate battalion; Eshleman\'s arrival hour not supported by this passage')],
    {'a_9': ('OR27-2-R464', 'arrived at 9 a. m. on July 2')})

ROW('T2-080', 'gap',
    'The OR has the 9.30 a. m. inquiry to the commanding officer Twelfth Corps on the practicability of attacking and Slocum\'s reply; it does not say that Meade cancelled an attack at about 10:00 nor that Sickles got discretion.',
    [SUB('At 9.30 a. m. army headquarters asked the commanding officer Twelfth Corps for his opinion on the practicability of attacking the enemy in his front', D, S_, ['hq_930']),
     SUB('Meade cancels Slocum\'s planned Culp\'s Hill attack about 10:00; Sickles receives discretion to place his corps', I, U_, [], 'EPP single weak source; not in the OR')],
    {'hq_930': ('OR27-3-D1006', 'The commanding general desires that you will at once examine the ground in your front, and give him your opinion as to the practicability of attacking the enemy in that quarter')},
    remains=['cancellation and Sickles\'s discretion'], tier='inferred')

ROW('T2-081', 'partially_supported',
    'Geary: "Breastworks were immediately thrown up along our entire line"; Greene: "By 13 o\'clock we had a good cover for the men" (OCR 13, probably 12); the 10:00 completion, 300-yard initial line and traverse supervision are not in these passages.',
    [SUB('Geary: breastworks were immediately thrown up along the entire line', D, S_, ['g_up']),
     SUB('Greene: by (OCR "13") o\'clock we had a good cover for the men', D, S_, ['gr_cover'], 'OCR digits 13; read as noon by the shard, not confirmed on the page image'),
     SUB('Works largely complete about 10:00; initial line about 300 yards; Greene supervises the traverse in person', I, U_, [], 'DMNA60, GD219, HN-KH secondary')],
    {'g_up': ('OR27-1-R293', 'Breastworks were immediately thrown up along our entire line'), 'gr_cover': ('OR27-1-R307', 'By 13 o\'clock we had a good cover for the men')},
    remains=['10:00 completion', '300 yard figure', 'traverse'])

ROW('T2-082', 'corrected',
    'Greene\'s skirmishers "were thrown out immediately on taking position" (about 06:00) and moved toward the creek; the seed\'s 10:00-14:00 placement of the skirmish line and the thin single line with a foot to several feet between men are not in the OR.',
    [SUB('Greene: skirmishers were thrown out immediately on taking position and moved toward the creek', D, S_, ['gr_skirm']),
     SUB('Skirmish line goes out 10:00-14:00 and the brigade spreads into a single thin line, a foot to several feet between men', I, X_, [], 'HN-KH, HN-WF; start differs by hours; spacing not in the OR')],
    {'gr_skirm': ('OR27-1-R307', 'Our skirmishers were thrown out immediately on taking position, and moved toward the creek in our front')},
    scenarios=[SCN('A', 'Skirmish line 10:00-14:00', 'seed (row placement)', I), SCN('B', 'Skirmishers out from taking position, about 06:00', 'Greene OR27-1-R307 p.856', D, ['gr_skirm'])])

ROW('T2-083', 'partially_supported',
    'Tyler: the remaining reserve batteries under McGilvery "reported to me with the ammunition train about 10.30 a. m."; Hart is not named in that sentence and the four Napoleons and about 70 men are not in the passage.',
    [SUB('The remaining reserve batteries under McGilvery reported with the ammunition train about 10.30 a. m.', D, S_, ['t_1030']),
     SUB('Hart\'s 15th New York Battery (four Napoleons, about 70 men) in reserve at 10:30', I, U_, [], 'Hart not named in Tyler\'s sentence; guns and men not found')],
    {'t_1030': ('OR27-1-R315', 'reported to me with the ammunition train about 10.30 a. m')})

ROW('T2-084', 'partially_supported',
    'Hunt: a "small earthwork thrown up in its front" for guns on Cemetery Hill; Whittier: "temporary earthworks were thrown up covering the pieces" during the night; the OR scale is a small per-gun work, not the seed\'s lunettes (a scenario), and the 16:00 hour is not in these passages.',
    [SUB('Hunt: a small earthwork was thrown up in front of the guns', D, S_, ['hu_work']),
     SUB('Whittier: temporary earthworks were thrown up covering the pieces', D, S_, ['wh_work']),
     SUB('East Cemetery Hill lunettes are in place by about 16:00 (builders and dimensions unknown)', I, C_, [], 'term from W-ECH and GD-HOUSCH; scale differs from the OR')],
    {'hu_work': ('OR27-1-R028', 'small earthwork thrown up in its front'), 'wh_work': ('OR27-1-R073', 'temporary earthworks were thrown up covering the pieces')},
    scenarios=[SCN('A', 'Lunettes in place by about 16:00', 'seed', I), SCN('B', 'Small per-gun earthworks thrown up (from Jul 1 evening or night)', 'Hunt OR27-1-R028 p.232, Whittier OR27-1-R073 p.361', D, ['hu_work', 'wh_work'])])

ROW('T2-085', 'partially_supported',
    'Lee gave the principal attack on the enemy\'s left to Longstreet and Longstreet delayed until Law\'s brigade joined; no OR gives the hour 11:00 (Ewell\'s orders show the plan existed at daybreak).',
    [SUB('Longstreet: fearing his force too weak, he delayed until General Law\'s brigade joined its division', D, S_, ['l_delay']),
     SUB('Lee orders the attack about 11:00', I, U_, [], 'Lee gives no hour; a forum claims 09:00 (low quality)')],
    {'l_delay': ('OR27-2-R430', 'I delayed until General Law\'s brigade joined its division')}, remains=['the 11:00 hour'])

ROW('T2-086', 'gap',
    'No OR passage records a morning complaint by Sickles; only Meade p.116 has Sickles found advanced about 3 p. m.',
    [SUB('Sickles goes to Meade\'s headquarters about 11:00 to complain about his position', G, U_, [], 'PHIF only; Sickles, Hood, McLaws, Law, Warren reports not in the OR index')],
    remains=['the complaint and its hour'], tier='inferred')

ROW('T2-087', 'partially_supported',
    'Berdan: "about 11 a. m. I received an order"; Birney: permission from Sickles "At 12 m."; Lakeman: 14 officers and 196 rifles; the seed\'s 11:15 (EPP) has no OR counterpart; Sharps rifles and green uniforms are not in Berdan\'s report.',
    [SUB('Berdan: about 11 a. m. he received an order', D, S_, ['be_11']),
     SUB('Lakeman: 14 officers and 196 rifles', D, S_, ['la_196']),
     SUB('Start hour 11:15', I, C_, [], 'EPP; Berdan about 11:00, Birney 12:00'),
     SUB('Berdan\'s men carried Sharps rifles and wore green', I, U_, [], 'HESS, AR USSS')],
    {'be_11': ('OR27-1-R149', 'about 11 a. m. I received an order'), 'la_196': ('OR27-1-R143', '14 officers and 196 rifles')},
    scenarios=[SCN('A', 'About 11:00', 'Berdan OR27-1-R149 p.515', D, ['be_11']), SCN('B', 'About 12:00', 'Birney OR27-1-R133 p.482 (not re-quoted)', I), SCN('C', '11:15', 'seed (EPP)', I)])

ROW('T2-088', 'partially_supported',
    'Madill: a road led "from the wooden house, near which General Sickles established" headquarters; the Trostle house is the seed\'s identification; the 18:00 wounding hour and "west of the barn" are not in the passage.',
    [SUB('Sickles established headquarters near a wooden house on a road (Madill)', D, S_, ['ma_hq']),
     SUB('The house was the Trostle farm with its listed outbuildings', I, U_, [], 'identification by SS-TROSTLE'),
     SUB('Sickles is wounded west of the barn about 18:00', I, U_, [], 'not in the passage')],
    {'ma_hq': ('OR27-1-R141', 'a road leading from the wooden house, near which General Sickles established')})

ROW('T2-089', 'partially_supported',
    'Jerome messages: 11.45 a. m. "Enemy\'s skirmishers are advancing from the west, 1 mile from here" and 11.55 a. m. "The rebels are in force, and our skirmishers give way"; the OR heads them Mountain / Round Top Mountain Signal Station, not Little Round Top.',
    [SUB('11.45 a. m., Mountain Signal Station: enemy\'s skirmishers are advancing from the west, 1 mile from here', D, S_, ['j_1145']),
     SUB('11.55 a. m., Round Top Mountain Signal Station: the rebels are in force, and our skirmishers give way', D, S_, ['j_1155']),
     SUB('The station is the Little Round Top signal station', I, U_, [], 'identification is the PDF\'s; the OR names Round Top Mountain')],
    {'j_1145': ('OR27-3-D1010', 'Enemy\'s skirmishers are advancing from the west, 1 mile from here'),
     'j_1155': ('OR27-3-D1011', 'The rebels are in force, and our skirmishers give way')})

ROW('T2-090', 'partially_supported',
    'Lakeman: "Advancing to and for some distance on the Emmitsburg road, I approached a dense wood on the west side"; the 3/4-mile distance is not stated.',
    [SUB('Lakeman advanced on the Emmitsburg road and approached a dense wood on the west side', D, S_, ['la_wood']),
     SUB('The 3rd Maine crosses about 3/4 mile of open ground to the wood line', I, U_, [], 'distance not stated')],
    {'la_wood': ('OR27-1-R143', 'Advancing to and for some distance on the Emmitsburg road, I approached a dense wood on the west side')})

ROW('T2-091', 'partially_supported',
    'Lakeman: "I sustained a loss of 48 in killed, wounded, and missing"; Anderson: a sharp skirmish with the Tenth Alabama; not found: 20-25 minutes, the 11th and 8th Alabama, 95 rounds a man in 15 minutes, the split of about 20 sharpshooters and 30+ captured.',
    [SUB('Lakeman: 3rd Maine loss of 48 in killed, wounded, and missing', D, S_, ['la_48']),
     SUB('Firefight of 20-25 minutes; 10th and 11th Alabama; Berdan withdraws citing ammunition (about 95 rounds a man in 15 minutes)', I, U_, [], 'not found in the OR; Berdan reports 14,400 rounds in three days for about 450 rifles'),
     SUB('Casualties about 20 sharpshooters and 48 Maine men (30+ captured)', I, C_, [], 'Birney gives about 60 combined; row 48 + 20 = 68')],
    {'la_48': ('OR27-1-R143', 'I sustained a loss of 48 in killed, wounded, and missing')})

ROW('T2-092', 'partially_supported',
    'Buford: held the left "until relieved by General Sickles\' corps"; the destination is in conflict inside the OR (Taneytown: Buford, Devin; Westminster: Butterfield, trains; Emmitsburg: Merritt) and "on Pleasonton\'s order" and "after a sharpshooter fight" were not found.',
    [SUB('Buford held the left until relieved by General Sickles\' corps', D, S_, ['bu_rel']),
     SUB('Destination after the withdrawal', I, C_, [], 'Taneytown (Buford, Devin), Westminster (Butterfield), Emmitsburg (Merritt) and secondary versions'),
     SUB('Withdrawn on Pleasonton\'s order after a sharpshooter fight', I, U_, [], 'not found')],
    {'bu_rel': ('OR27-1-R337', 'until relieved by General Sickles')},
    scenarios=[SCN('A', 'Taneytown', 'Buford OR27-1-R337 p.928', D, ['bu_rel']), SCN('B', 'Westminster', 'Butterfield D2100 (not re-quoted)', I), SCN('C', 'Emmitsburg', 'Merritt R340 (not re-quoted)', I)])

ROW('T2-093', 'corrected',
    'Humphreys: "Shortly after midday" he was ordered to form his division in line of battle near the foot of the Round Top ridge; his own advance to the Emmitsburg road was about 4 p. m.; the 400-500 yards and "by direction of Sickles" are not in the OR.',
    [SUB('Humphreys: shortly after midday he was ordered to form his division in line of battle', D, S_, ['hu_mid']),
     SUB('Humphreys: about 4 p. m. he moved his division forward', D, S_, ['hu_4pm']),
     SUB('About noon the division moves forward to the Emmitsburg Road, 400-500 yards in front of its night position', I, X_, [], 'noon is the formation of the line near the Round Top ridge foot; the road advance is 16:00')],
    {'hu_mid': ('OR27-1-R158', 'Shortly after midday, I was ordered to form my division in line of battle'), 'hu_4pm': ('OR27-1-R158', 'I moved my division forward')},
    scenarios=[SCN('A', 'Moves forward about noon', 'seed (HESS)', I), SCN('B', 'Forms at noon, advances about 16:00', 'Humphreys OR27-1-R158 pp.531-532', D, ['hu_mid', 'hu_4pm'])])

ROW('T2-094', 'partially_supported',
    'Hour of the Third Corps advance in the OR: about 14:00 (Hunt, "About 2 p. m. General Sickles formed his corps in line"), about 15:00 (Hancock), 15:30 opening (Birney), 16:00 (Gibbon, Humphreys); no OR passage gives noon; the 1,500 yards and "without informing Meade" are not in these passages.',
    [SUB('Hunt: about 2 p. m. General Sickles formed his corps in line', D, S_, ['hu_2pm']),
     SUB('Advance at noon (SS2) or 14:00 (Phifer)', I, C_, [], 'noon has no OR counterpart'),
     SUB('About 1,500 yards forward and without informing Meade', I, U_, [], 'not in these passages (Meade p.116: Sickles had misapprehended instructions)')],
    {'hu_2pm': ('OR27-1-R028', 'About 2 p. m. General Sickles formed his corps in line')},
    scenarios=[SCN('A', 'Noon', 'seed (SS2)', I), SCN('B', 'About 14:00', 'Hunt OR27-1-R028 p.234', D, ['hu_2pm']), SCN('C', 'About 15:00', 'Hancock R076 p.369 (not re-quoted)', I), SCN('D', 'About 16:00', 'Gibbon R098 p.416; Humphreys R158 p.532 (not re-quoted)', I)])

ROW('T2-095', 'gap',
    'Stuart: "My advance reached Gettysburg July 2"; Lee: "General Stuart arrived with the cavalry" (no hour); the clock times of the seed (noon-1 p. m., mid-afternoon, afternoon, brigades in the evening) are secondary and cannot be checked against a primary source.',
    [SUB('Stuart\'s advance reached Gettysburg on Jul 2', D, S_, ['s_jul2']),
     SUB('Lee: General Stuart arrived with the cavalry', D, S_, ['l_stuart']),
     SUB('Clock time of Stuart\'s arrival and of Hampton\'s; Anderson\'s division reaching Seminary Ridge north of Pitzer\'s Woods', G, U_, [], 'no OR hour; four conflicting secondary values')],
    {'s_jul2': ('OR27-2-R565', 'My advance reached Gettysburg July 2'), 'l_stuart': ('OR27-2-R426', 'General Stuart arrived with the cavalry')},
    remains=['hour of Stuart\'s arrival'], tier='inferred')

ROW('T2-096', 'partially_supported',
    'D. M. Gregg: the First and Third Brigades "arrived on the battle-field at Gettysburg, July 2, about noon, the Second Brigade having been sent to Westminster"; the brigade layout (McIntosh right, J. I. Gregg left) and "Low Dutch Road" are not OR wording; J. I. Gregg puts his brigade on the Hanover pike about 11 a. m.',
    [SUB('Gregg: First and Third Brigades arrived on the battle-field at Gettysburg, July 2, about noon, the Second Brigade having been sent to Westminster', D, S_, ['g_noon']),
     SUB('McIntosh on the right and J. I. Gregg on the left; Huey\'s brigade named; Low Dutch Road', I, U_, [], 'not OR wording'),
     SUB('J. I. Gregg\'s brigade took position on the Hanover pike about 11 a. m.', D, C_, [], 'hour differs from the division\'s about noon')],
    {'g_noon': ('OR27-1-R344', 'arrived on the battle-field at Gettysburg, July 2, about noon, the Second Brigade having been sent to Westminster')})

ROW('T2-097', 'partially_supported',
    'Longstreet: Law\'s brigade "was ordered forward to its division during the day, and joined about noon on the 2d" and the movement was begun as soon after his arrival as preparations could be made; the direction "south" is not stated; the forum 11:00-noon and Padre Steve\'s 45 minutes are not primary.',
    [SUB('Law\'s brigade was ordered forward to its division during the day, and joined about noon on the 2d', D, S_, ['l_noon']),
     SUB('As soon after his arrival as preparations could be made, the movement was begun', D, S_, ['l_begun']),
     SUB('The column starts south', I, U_, [], 'direction not stated (to gain the Emmitsburg road on the enemy\'s left)')],
    {'l_noon': ('OR27-2-R430', 'was ordered forward to its division during the day, and joined about noon on the 2d'),
     'l_begun': ('OR27-2-R430', 'As soon after his arrival as we could make our preparations, the movement was begun')})

ROW('T2-098', 'partially_supported',
    'Berdan: the Second Regiment of Sharpshooters was posted "on our left, to act as flankers", so the 2nd USSS was not in the Pitzer\'s Woods detachment (1st USSS and 3rd Maine); the 4th Maine\'s role at Pitzer\'s Woods remains open.',
    [SUB('Berdan: the Second Regiment was posted on our left, to act as flankers', D, S_, ['be_left']),
     SUB('Role of the 4th Maine at Pitzer\'s Woods', G, U_, [], 'Libby R145 gives casualties only')],
    {'be_left': ('OR27-1-R149', 'on our left, to act as flankers')}, remains=['4th Maine at Pitzer\'s Woods'], tier='open gap')

ROW('T2-099', 'partially_supported',
    'Ellis (14th Connecticut): "Having received orders to destroy these buildings, they were fired in several places"; Hays: "I caused the house and barn in our front"; the burning is on Jul 3, which supports the seed\'s correction; the name Bliss, the 75 x 33 ft barn and the midday alternating occupation are not in the OR.',
    [SUB('Ellis: having received orders to destroy these buildings, they were fired in several places', D, S_, ['el_fire']),
     SUB('Hays: I caused the house and barn in our front to be burned', D, S_, ['ha_burn']),
     SUB('Farm held alternately by both sides at midday; barn about 75 x 33 ft', I, U_, [], 'ECW-BLISS, SS-BLISS, HMDB not local texts')],
    {'el_fire': ('OR27-1-R124', 'Having received orders to destroy these buildings, they were fired in several places'), 'ha_burn': ('OR27-1-R115', 'I caused the house and barn in our front')},
    remains=['barn dimensions and the alternating occupation'])

ROW('T2-100', 'partially_supported',
    'Robertson: his batteries "arrived near the battle-ground of Gettysburg at 6.30 a. m. on the 2d" and were held in reserve "until nearly dark"; Imboden\'s position on Jul 2 has no OR report.',
    [SUB('Robertson: arrived near the battle-ground of Gettysburg at 6.30 a. m. on the 2d', D, S_, ['ro_630']),
     SUB('Robertson: held his batteries in reserve near the battle-ground until nearly dark', D, S_, ['ro_dark']),
     SUB('Imboden\'s whereabouts on Jul 2', G, U_, [], 'no Imboden report in the OR index; Lee gives Jul 4 only')],
    {'ro_630': ('OR27-1-R368', 'arrived near the battle-ground of Gettysburg at 6.30 a. m. on the 2d'), 'ro_dark': ('OR27-1-R368', 'held my batteries in reserve near the battle-ground until nearly dark')},
    remains=['Imboden on Jul 2', 'positions of most other horse batteries'], tier='open gap')

ROW('T2-101', 'partially_supported',
    'Kershaw: the command was halted "until about noon" and then directed to move under cover toward the right; Longstreet: the movement began as soon after Law\'s arrival as possible; "shortly after noon" is supported; the 14,500 troops, the 3-mile length and Herr\'s Ridge are not in the OR.',
    [SUB('Kershaw: moved to the right of the Third Corps and were halted until about noon', D, S_, ['k_halt']),
     SUB('Longstreet: as soon after Law\'s arrival as preparations could be made, the movement was begun', D, S_, ['l_begun']),
     SUB('About 14,500 troops, about 3 miles long, departing Herr\'s Ridge', I, U_, [], 'not in the OR')],
    {'k_halt': ('OR27-2-R432', 'and were halted until about noon'), 'l_begun': ('OR27-2-R430', 'As soon after his arrival as we could make our preparations, the movement was begun')})

ROW('T2-102', 'partially_supported',
    'Humphreys occupied a log house surrounded by an orchard on the east side of the Emmitsburg road with the 73rd New York; the occupation follows his about-16:00 advance, not "after 13:00"; the name Klingle is not in the OR.',
    [SUB('On the east side of the Emmitsburg road, opposite the middle of his line, was a log house surrounded by an orchard, occupied with the Seventy-third New York (Fourth Excelsior)', D, S_, ['hu_log']),
     SUB('The occupation is after 13:00 (HESS)', I, C_, [], 'passage order places it after the 16:00 advance'),
     SUB('The house is the Klingle house', I, U_, [], 'name not in the OR')],
    {'hu_log': ('OR27-1-R158', 'On the east side of the Emmitsburg road, opposite the middle of my line, was a log house surrounded by an orchard. This I occupied with the Seventy-third New York')},
    scenarios=[SCN('A', 'After 13:00', 'seed (HESS)', I), SCN('B', 'After the about-16:00 advance', 'Humphreys OR27-1-R158 p.532', D, ['hu_log'])])

ROW('T2-103', 'gap',
    'The OR carries none of the Sherfy, Klingle and Rogers family movements; the NPS search of 2026-11-04 returned no page (failed lookup); the fences and orchard intact at the hour are inferred.',
    [SUB('Sherfy family leaves morning or midday Jul 2; Klingle family leaves Jul 2; Peter Rogers stays and shelters wounded in his cellar; fences and orchard intact', G, U_, [], 'Stone Sentinels pages only; failed lookup for a non-lead source')],
    remains=['a non-lead source for the civilian movements'], tier='inferred')

ROW('T2-104', 'partially_supported',
    'Tyler and Milton place the Artillery Reserve in park behind the Third Corps line on Jul 2; the gun count is 106 (HN-SPG) against the OR returns of 110 and 150 (abstract footnote: "return of the Artillery Reserve gives only 110 guns"); the Spangler farm and the 2,300 men are not in the OR.',
    [SUB('The abstract of returns footnote: the return of the Artillery Reserve gives only 110 guns', D, S_, ['ab_110']),
     SUB('106 guns, about 2,300 men; camp on the Spangler farm with the wheat crushed', I, C_, [], 'HN-SPG; Spangler farm not named in the OR'),
     SUB('The Reserve was in park by 10:00-10:30 Jul 2, earlier than the seed\'s 13:00 onward', I, U_, [], 'Tyler p.872 hour quoted for T2-083; not repeated here')],
    {'ab_110': ('OR27-1-R008', 'return of the Artillery Reserve gives only 110 guns')},
    scenarios=[SCN('A', '106 guns', 'seed (HN-SPG)', I), SCN('B', '110 guns', 'OR27-1-R008 p.151 return', D, ['ab_110']), SCN('C', '150 guns', 'original reports per the abstract footnote (not re-quoted)', I)])

ROW('T2-105', 'partially_supported',
    'Signal station report at 1.30 p. m. of a heavy column of the enemy\'s infantry; the interpretation as the Confederate countermarch is the integrator\'s and rests on Kershaw and D1014.',
    [SUB('1.30 p. m.: a heavy column of enemy\'s infantry, about 10,000 strong', D, S_, ['j_1330']),
     SUB('The column is in fact the Confederate countermarch', I, U_, [], 'interpretation; the seed\'s own marker')],
    {'j_1330': ('OR27-3-D1013', 'A heavy column of enemy\'s infantry, about 10,000 strong')})

ROW('T2-106', 'partially_supported',
    'Kershaw: "About 3 p. m. the head of my column came into the open field"; the McLaws-Hood snarl, Johnston as guide, Black Horse Tavern and Alexander\'s nearly three hours lost are not in the OR.',
    [SUB('Kershaw: about 3 p. m. the head of the column came into the open field', D, S_, ['k_3pm']),
     SUB('McLaws and Hood snarl, Johnston guides, Black Horse Tavern route, nearly three hours lost', I, U_, [], 'PADRE, CWT secondary')],
    {'k_3pm': ('OR27-2-R432', 'About 3 p. m. the head of my column came into the open field')})

ROW('T2-107', 'partially_supported',
    'Clark: the battery stood between Sickles\'s headquarters and the Peach Orchard until about 2 p. m., when the enemy\'s infantry was discovered passing; that the column was Hood\'s is the seed\'s identification.',
    [SUB('Clark: enemy\'s infantry was discovered passing at about 2 p. m.', D, S_, ['cl_2pm']),
     SUB('The column crossing was Hood\'s', I, U_, [], 'Clark says enemy infantry')],
    {'cl_2pm': ('OR27-1-R182', 'At this time the enemy\'s infantry was discovered passing')})

ROW('T2-108', 'partially_supported',
    'Meade: "At 3 p. m. the Sixth Corps arrived, after a march of 33 miles"; Wright: "arrived about 4 p. m."; the seed\'s 14:00 head-of-column and 17:00 main body are scenarios without a default.',
    [SUB('Meade: at 3 p. m. the Sixth Corps arrived, after a march of 33 miles', D, S_, ['m_3pm']),
     SUB('Wright: arrived about 4 p. m.', D, S_, ['w_4pm'])],
    {'m_3pm': ('OR27-1-R006', 'At 3 p. m. the Sixth Corps arrived, after a march of 33 miles'), 'w_4pm': ('OR27-1-R224', 'arrived about 4 p. m')},
    scenarios=[SCN('A', 'Head about 14:00', 'seed (HESS)', I), SCN('B', '15:00', 'Meade OR27-1-R006 p.116', D, ['m_3pm']), SCN('C', 'About 16:00', 'Wright OR27-1-R224 p.665', D, ['w_4pm']), SCN('D', 'About 17:00', 'Stone Sentinels (SS2)', I)])

ROW('T2-109', 'partially_supported',
    'Berdan "reported about 2 o\'clock to Major-General Birney the result of our operations"; the place "Cemetery Ridge" is not OR wording (his men return to the Emmitsburg road line).',
    [SUB('Berdan reported about 2 o\'clock to Major-General Birney (OCR: Bimey) the result of the operations and discoveries', D, S_, ['be_2'], 'OCR reads Bimey for Birney'),
     SUB('The place is Cemetery Ridge', I, C_, [], 'not OR wording')],
    {'be_2': ('OR27-1-R149', 'reported about 2 o\'clock to Major-General Bimey the result of our operations and discoveries')})

ROW('T2-110', 'partially_supported',
    'Kershaw: "about 4 o\'clock, when I received orders to advance, I moved at once"; Maffett: "at 4 o\'clock our regiment ... was ordered forward"; Aiken\'s later recollection of a forward order by about 14:00 contradicts both; no OR passage gives the cannonade from about noon.',
    [SUB('Kershaw: about 4 o\'clock he received orders to advance and moved at once', D, S_, ['k_4']),
     SUB('Aiken (7th South Carolina) recalls a forward order by about 14:00 and cannonading from about noon', I, C_, [], 'NPS9 essay quoting a recollection; not a local text')],
    {'k_4': ('OR27-2-R432', 'about 4 o\'clock, when "I received orders to advance, I moved at once in this direction')},
    scenarios=[SCN('A', 'Forward order by about 14:00', 'seed (NPS9, later recollection)', I), SCN('B', 'Orders to advance about 16:00', 'Kershaw OR27-2-R432 p.368', D, ['k_4'])])

ROW('T2-111', 'partially_supported',
    'Smith: two sections near the Devil\'s Cave and one 150 yards in rear; "Total amount of ammunition expended, 240 rounds"; the Plum Run detachment and the 18:00 shift near Winslow are not in these passages.',
    [SUB('Smith: total amount of ammunition expended, 240 rounds', D, S_, ['s_240']),
     SUB('Two sections on a hill near the Devil\'s Cave, one section 150 yards in the rear', D, S_, ['s_cave']),
     SUB('Two guns later detached into the Plum Run valley; one section shifts right near Winslow about 18:00', I, U_, [], 'not in the passages read')],
    {'s_240': ('OR27-1-R184', 'Total amount of ammunition expended, 240 rounds'), 's_cave': ('OR27-1-R184', 'I placed two sections of my battery on a hill (near the Devil\'s Cave)')})

ROW('T2-112', 'confirmed',
    'Wheeler: his three 3-inch guns on Cemetery Hill replied at about 2 p. m. to the rebel batteries; at about 5.30 p. m. his ammunition was exhausted and another battery was sent to relieve him; he refilled with percussion and canister, the only 3-inch ammunition on hand; eight hundred and fifty rounds were expended.',
    [SUB('Wheeler was assigned a position on Cemetery Hill on the left wing of the corps batteries', D, S_, ['w_hill']),
     SUB('At about 2 p. m. the rebel batteries opened along the front and the battery replied', D, S_, ['w_2pm']),
     SUB('At about 5.30 p. m. the ammunition became exhausted and another battery was sent to relieve him', D, S_, ['w_530']),
     SUB('He refilled with percussion and canister, which was the only 3-inch ammunition on hand', D, S_, ['w_perc']),
     SUB('Eight hundred and fifty rounds of ammunition were expended (the number of guns is not stated in this passage, as the seed says)', D, S_, ['w_850'])],
    {'w_hill': ('OR27-1-R266', 'was assigned by you a position on Cemetery Hill, being on the left wing of the batteries of the corps'),
     'w_2pm': ('OR27-1-R266', 'At about 2 p. m. the rebel batteries opened along our front and on our right flank'),
     'w_530': ('OR27-1-R266', 'At about 5.30 p. m. my ammunition became exhausted'),
     'w_perc': ('OR27-1-R266', 'filled up with percussion and canister, which was the only 3-incli ammunition on hand'),
     'w_850': ('OR27-1-R266', 'Eight hundred and fifty rounds of ammunition were expended')})

ROW('T2-113', 'gap',
    '81 F at 14:00, afternoon cloud 3/10 or less, the drizzle versus clearing conflict and the heat-index figures reach the repository only through secondary articles; the Jacobs original is not retrievable.',
    [SUB('Jacobs 81 F at 14:00; cloud 3/10 or less; Strategypage notes afternoon drizzle; heat index at least 90 F', G, C_, [], 'secondary only; drizzle versus clearing carried as selectable scenario')],
    remains=['primary Jacobs readings'], tier='open gap')

ROW('T2-114', 'partially_supported',
    'Kershaw: about 3 p. m. the column formed behind a stone wall on the schoolhouse road; occupation of the Warfield property and the damage ($516) rest on an NPS page read through a summary (not a local text); Kershaw never names the Warfield house.',
    [SUB('Kershaw\'s column came into the open field about 3 p. m. and formed behind the road wall', D, S_, ['k_3pm']),
     SUB('Confederate occupation of the Warfield property on the afternoon of Jul 2; damage; artillery east of the house; counterbattery fire; orchard, garden, buildings and fences damaged', I, U_, [], 'NPS Warfield House page via a summary, not re-matched; Kershaw does not name the house')],
    {'k_3pm': ('OR27-2-R432', 'About 3 p. m. the head of my column came into the open field')}, remains=['verbatim NPS text for the Warfield claims'])

ROW('T2-115', 'partially_supported',
    'Kershaw: "The numerous fences in the way ... rendered it difficult to retain the line in good order" and Humphreys removed fences on his front "by removing such of the fences as were in the way"; the 836-hole rail, Klingle and Sherfy fence losses and the Jul 3 delay are not in the OR.',
    [SUB('Kershaw: the numerous fences in the way rendered it difficult to retain the line in good order', D, S_, ['k_fence']),
     SUB('Humphreys: communication across his front was made easy by removing such of the fences as were in the way', D, S_, ['hu_fence']),
     SUB('Post-and-rail fences on both sides of the road intact at the start of the attack; one 16-ft rail with 836 holes; Klingle and Sherfy fences destroyed', I, C_, [], 'Humphreys removed some fences; remainder not in the OR')],
    {'k_fence': ('OR27-2-R432', 'The numerous fences in the way'), 'hu_fence': ('OR27-1-R158', 'by removing such of the fences as were in the way')},
    scenarios=[SCN('A', 'Fences intact on Humphreys\'s front at the start of the attack', 'seed', I), SCN('B', 'Some fences on Humphreys\'s front removed before the advance', 'Humphreys OR27-1-R158 p.532', D, ['hu_fence'])])

ROW('T2-116', 'partially_supported',
    'Letterman: "Before the army left Gettysburg ... six ambulances and four wagons were ordered to be left from each corps ... From the Cavalry Corps but four ambulances"; the allotment is a post-battle arrangement, not a Jul 2 afternoon fact.',
    [SUB('Before the army left Gettysburg six ambulances and four wagons were ordered to be left from each corps; from the Cavalry Corps four ambulances', D, S_, ['le_amb']),
     SUB('Four-wheel spring ambulances with a driver and two stretcher-bearers carry wounded to division sites on the Taneytown Road and Baltimore Pike', I, U_, [], 'routes inferred; not in the passage'),
     SUB('The allotment is a Jul 2 afternoon fact', D, X_, [], 'Letterman places it before the army left Gettysburg (Jul 4-5)')],
    {'le_amb': ('OR27-1-R016', 'six ambulances and four wagons were ordered to be left from each corps')}, tier='inferred')

ROW('T2-117', 'partially_supported',
    'J. I. Gregg: his regiments on the Hanover pike were withdrawn about 3 p. m. and by order of General Gregg he threw forward the Tenth New York Cavalry and deployed skirmishers; "Brinkerhoff Ridge" and Rank\'s section of Battery H are not named.',
    [SUB('J. I. Gregg: the regiments were withdrawn about 3 p. m. and he threw forward the Tenth New York Cavalry, under Major Avery', D, S_, ['gr_10ny']),
     SUB('Rank\'s section of Battery H, 3rd Pennsylvania Heavy Artillery fires on the right; the ridge is Brinkerhoff Ridge', I, U_, [], 'not OR wording; Rank\'s Jul 2 position a gap')],
    {'gr_10ny': ('OR27-1-R355', 'These regiments were withdrawn about 3 p. m., and, by order of General Gregg, I threw forward the Tenth New York Cavalry, under command of Major Avery')})

ROW('T2-118', 'partially_supported',
    'Kershaw: Semmes in reserve to him and Barksdale on his left, supported by Wofford in reserve, about 3 p. m. behind a stone wall; "parallel to the Emmitsburg Road" is implied, not stated.',
    [SUB('Semmes was in reserve to Kershaw and Barksdale on his left, supported by Wofford, in reserve', D, S_, ['k_res']),
     SUB('The line deploys parallel to the Emmitsburg Road', I, U_, [], 'implied, not stated')],
    {'k_res': ('OR27-2-R432', 'Semmes in reserve to me and Barksdale on my left, supported by Wofford, in reserve')})

ROW('T2-119', 'partially_supported',
    'Meade to Halleck at 3 p. m.: "I have to-day, up to this hour, awaited the attack of the enemy"; Sickles asking to be excused and Warren reporting the III Corps misplaced are not in the OR.',
    [SUB('Meade: I have to-day, up to this hour, awaited the attack of the enemy', D, S_, ['m_await']),
     SUB('Sickles asks to be excused from Meade\'s meeting; Warren reports III Corps is not where expected', I, U_, [], 'not in the OR; hour of Meade\'s rebuke a gap')],
    {'m_await': ('OR27-1-R006', 'I have to-day, up to this hour, awaited the attack of the enemy')})

ROW('T2-120', 'partially_supported',
    'Meade: while he explained to Sickles "the enemy opened on him with several batteries in his front and on his flank"; the seed\'s Union artillery opening first on the arriving divisions is Clark\'s about-14:00 fire, not a 15:00 opening.',
    [SUB('Meade: the enemy opened on Sickles with several batteries in his front and on his flank', D, S_, ['m_open']),
     SUB('Union artillery opens on Longstreet\'s arriving divisions about 15:00', I, U_, [], 'Clark\'s fire on the column is about 14:00 (T2-107)')],
    {'m_open': ('OR27-1-R006', 'the enemy opened on him with several batteries in his front and on his flank')})
