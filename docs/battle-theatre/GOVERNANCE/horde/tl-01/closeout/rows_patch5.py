"""Fifth start of the close-out of shard tl-01 (2026-11-16): the additions that the newspaper pages saved after the fourth start allow.

The web-evidence workstream had saved 933 pages of 1863 newspapers when the fourth start searched (2026-11-15); at the start of the fifth the
folder held 1,546 (613 saved later, among them the Daily National Intelligencer, the New-York Daily Tribune of Jun 29, the Richmond Whig and more
copies of the dispatches of Jun 26-Jul 3). Every addition below rests on a passage that was matched in the saved text layer (quotes5.json, cut with
the builder's own normalisation; build.py re-matches every quote), and every digit or hour of a newspaper passage was read on the page image (IIIF
crop of the Library of Congress image service, one request each, DD-TL01-13). Every conflict between the values of different printings or sources
is carried as a scenario and no default is chosen. build.py applies apply() after rows_patch.apply(); nothing here lowers a tier or a verdict.
Delegated decision DD-TL01-15 (copies of one dispatch)."""
import json, os
from rowlib import *
from rows_patch import CA, sub_add, sub_append, sub_set, scen, scen_extend, _by

HERE = os.path.dirname(os.path.abspath(__file__))
Q = json.load(open(os.path.join(HERE, 'quotes5.json'), encoding='utf-8'))
S5 = 'fifth start of the close-out, 2026-11-16, newspaper pages that were not local when the earlier passes searched (tmp/library/web/ca grew from 933 to 1,546 pages): '
BUL = 'a special dispatch to the Philadelphia Bulletin dated Hanover Junction, Jun 27 1863 (the papers that print it name no informant); the same dispatch is printed in at least eight papers of Jun 27 - Jul 4, with differences in two figures between the printings and with the last lines left out in some'

def PIC(paper, page, item, reads):
    return ('page-image crop of the %s page %s (acquired_tl01.json, item %s; viewed in the fifth start of the close-out) reads: "%s"' % (paper, page, item, reads))

IMG5 = {
    'star_3pm': PIC('Evening Star', 2, 'ca5-star-0627-p2', 'about three o\'clock on Friday (yesterday) afternoon our cavalry left Gettysburg as the rebels entered. The telegraph operator, postmaster, and revenue assessor escaped. Before leaving, a train of thirteen freight cars, some with Col. Jennings\' supplies, were run to this side of the bridge at the edge of the town. The bridge and train were afterwards destroyed by the rebels."; the first word of the line (About) is cut by the crop edge'),
    'dnl_3pm': PIC('Daily National Intelligencer', 3, 'ca5-dnl-0629-p3', 'At three o\'clock on Friday afternoon our cavalry left Gettysburg as the rebels entered. The telegraph operator, postmaster, and revenue assessor escaped. Before leaving a train of thirteen freight cars, some with Col. Jennings\' supplies, were run to this side of the bridge, at the edge of the town. The bridge and train were afterwards destroyed by the rebels. On Friday night the rebels encamped on Wolf\'s farm, a mile and a half this side of the town. Their force was represented to be eight thousand strong, with"'),
    'star_wolf': PIC('Evening Star', 2, 'ca5-star-0627-p2b', 'On Friday night the rebels encamped on Wolf\'s farm, a mile and a half from this side of the town. The force was represented to be 8,000 strong, with artillery[; the end of the sentence is cut by the crop edge]"; the figure of the strength is not legible in the crop'),
    'cht_wolf': PIC('Chicago Daily Tribune', 1, 'ca5-cht-0629-p1d', 'On Friday night the rebels encamped on Wolf\'s farm, half a mile this side of the town. Their force is represented to be 8,000 strong, with artillery, under command of Gen. Robinson. Their pickets were near Oxford. All"'),
    'star_1230': PIC('Evening Star', 2, 'ca5-star-0629-p2c', 'in, however, did not appear to heed [the warn]ing, and at about half-past twelve [o\'clock], and when the head of the train was [within] a short distance of the town it was met [by two rebel cavalrymen]"; the ends of the lines are cut by the crop edge'),
    'spy_loss': PIC('Worcester Daily Spy', 1, 'ca5-spy-0703-p1b', 'The rebels admitted that their loss in killed and wounded was greater than ours. Our loss was two privates killed and twenty-eight taken prisoners. The rebels also captured Lieut. Bowman, and the provost marshal of Westminster, with ten of his men."'),
    'dnl_wolf': PIC('Daily National Intelligencer', 3, 'ca5-dnl-0629-p3-wolf', 'Wolf\'s farm, a mile and a half this side of the town. Their force was represented to be eight thousand strong, with artillery. Gen. Robinson is in command. At midnight their pickets were near Oxford. All the rolling stock of the Gettysburg and Hanover railroad has been saved. The cars destroyed belonged to the Pennsylvania Central rail-"'),
    'cht_cars': PIC('Chicago Daily Tribune', 1, 'ca5-cht-0629-p1', 'At 3 o\'clock Friday afternoon our cavalry left Gettysburg. As the rebels entered, the telegraph operator, post master, and revenue assessor escaped. Before we left a train of sixteen freight cars, some with Col. Jennings\' supplies, were run to this side of the bridge at the edge of the t[own]. The bridge and train were afterwards destroyed by the rebels, and three members of the city troops, and three of our infantry are reported to have been captured. On Friday night the rebels encamped on Wolf\'s farm, half a mile this side of the t[own]."; the right ends of the lines are cut by the crop edge'),
    'cht_thu': PIC('Chicago Daily Tribune', 1, 'ca5-cht-0629-p1-thu', 'the rolling stock of the Gettysburg and Hanover Railroad has been saved. The cars destroyed belonged to the Northern and Pennsylvania Central Railroads. On Thursday night the rebel encampment extended from Cashtown to Fayetteville. The editor of the Gettysburg Star has been captured, and it is reported that one of our scouts has been shot."'),
    'cht_26th': PIC('Chicago Daily Tribune', 1, 'ca5-cht-0629-p1-26th', 'A telegram received at 9 o\'clock this morning from Hanover, states that 8,000 rebels are at Gettysburg. Their pickets extend within eight miles of Hanover. Good authority says that yesterday the 26[th] Pennsylvania militia regiment, under Cap[t.] Jennings, went on a reconnoissance towar[d] Gettysburg. When near there a compan[y] visited the town. While there, some rebe[ls] rushed in and drove them out. On returnin[g]"; the right ends of the lines are cut by the crop edge, the figure 26 is plain'),
    'tri_scout': PIC('New-York Daily Tribune', 1, 'ca5-tri-0629-p1', '" One of our scouts was kil[led at Gettysburg yes]terday and several were taken" / "Information has been rece[ived that the Rebels] ran all the cars on to the Rock[Creek bridge and set] them on fire." / " Col. Jennings\'s regiment o[f Pennsylvania Militia,] in that neighborhood, was rou[ted by the Rebels, and] it is reported that 40 of them" (the right ends of the lines are cut by the crop edge; the words in brackets are those of the text layer; the figure 40 is plain)'),
    'tri_dowling': PIC('New-York Daily Tribune', 1, 'ca5-tri-0629-p1-dowling', 'Michael Dowling was taken prisoner by [a party] seven or eight hundred strong, two or thre[e miles] outside of Gettysburg, on the Chambersbu[rg pike,] and was paroled, on Friday afternoon." (the right ends of the lines are cut by the crop edge)'),
    'star_300': PIC('Evening Star', 1, 'ca5-star-0629-p1', 'Col. Jenning\'s regiment, which had the skirmish at Gettysburg, arrived here to-day. He lost about three hundred men in prisoners and stragglers. The officers were sent to Richmond, and the men paroled. Some of them have arrived."'),
    'star_100pris': PIC('Evening Star', 1, 'ca5-star-0701-p1', 'yesterday the officers appeared u[neasy for fear] their trains would be destroye[d, which] were in the rear. [Yester]day there arrived one hundred pri[soners] which the rebels captured at Gettysbur[g. They] were robbed of their boots, shoes, and a[ll valuables] after which they were let go, to work [th]eir way home barefooted as best th[ey could]." (the ends of the lines are cut by the crop edge)'),
    'star_noon25': PIC('Evening Star', 1, 'ca5-star-0627-p1', 'Rebels at Gettysburg. We learn that a force of rebel cavalry entered and took possession of Gettysburg at noon yesterday, when the telegraph operator secured his instruments and left, arriving here last evening. The force was said to be fully 1,000 strong, and there being no troops there the place surrendered without opposition."'),
    'dnl_wm4': PIC('Daily National Intelligencer', 2, 'ca5-dnl-0701-p2', 'A REBEL CAVALRY DASH NEAR BALTIMORE. About four o\'clock on Monday afte[rnoon the Federal] scouts reported a rebel force advancin[g on Westminster,] whereupon the Federals, consisting of [a part of the First] Regiment of Delaware cavalry, were i[mmediately placed] in position, when in the course of a ha[lf hour]" (the ends of the lines are cut by the crop edge)'),
    'spy_wm5': PIC('Worcester Daily Spy', 1, 'ca5-spy-0703-p1', 'We learn from a gentlema[n who was at] Westminster, and a prisoner in [the hands of] the rebels during their sojourn i[n that town,] that General Stuart, with his c[avalry force,] reached there about 5 o\'clock [in the after]noon, and did not leave until [daylight the] next morning. The rebel party [who had a] fight with the Delaware cavalry [was General] Stuart\'s advance guard, and nu[mbered about] 300. The rebels lost in that fi[ght two lieu]tenants killed, and fully a doz[en wounded."]; the text layer prints Smart\'s for Stuart\'s (the ends of the lines are cut by the crop edge)'),
    'dnl_178': PIC('Daily National Intelligencer', 3, 'ca5-dnl-0630-p3', '... we reduced the num[ber to one hundred] and twenty. We find, however, by [last evening\'s city] pap[e]rs, that rumor in this case fell short [of the truth, and that] the number of wagons captured was [one hundred and sev]enty-eight, and one thousand mules. [The capture occurr]ed about noon." (the ends of the lines are cut by the crop edge)'),
    'star_178h': PIC('Evening Star', 2, 'ca5-star-0629-p2b', 'ONE HUNDRED AND SEVENTY-EIGHT WAGONS AND OVER ONE THOUSAND MULES GOBBLED UP."'),
    'whig_9': PIC('Richmond Whig', 2, 'ca5-whig-0707-p2', 'A despatch to the New York Tribune, dated Columbia, Penn., July 1st, purports to give the particulars of a cavalry fight at Hanover on the previous day: I am just from York. Captain McIrvin, of the Harr\'s Light Guard, who, with about two hundred of Pleasonton\'s cavalry, captured yesterday and paroled by Stuart, reports a severe cavalry fight at Hanover yesterday. Stuart\'s force, six thousand strong, had reached Westminster from Rockville on Monday, ... They advanced on Tuesday to Hanover, at 9 o\'clock, charged on the rear and advance of Gen. Pleasonton\'s cavalry, composed of the 5th New York, 1st Vermont, 1st Virginia and 18th Pennsylvania—1,800 in all. Then entering the town, the battle raged furiously all day, charging and recharging, etc."'),
    'whig_35': PIC('Richmond Whig', 2, 'ca5-whig-0707-p2b and -p2c', 'Gen. Stuart admits a loss of 35 killed. A large number were wounded, and the entire First South Carolina Cavalry captured. Our prisoners were sent to the rear about 4 o\'clock P. M., but they heard heavy artillery firing until 7½." (the last figure is printed as a small fraction after the 7 and is read as one half; the text layer prints 74)'),
    'her_126': PIC('New York Herald', 10, 'ca5-her-0702-p10c', 'General Early took one hundred and twenty-six prisoners at Gettysburg. These prisoners were taken [to] Carlisle and placed under guard [in the market house]"'),
    'inq_cav': PIC('Worcester Daily Spy', 1, 'ca5-spy-0701-p1', 'It is ascertained that a large body of federal cavalry have reached Gettysburg, taken possession of the town, and captured quite a number of rebels. Our army is gradually moving in that direction."'),
    'tim_hanover': PIC('Worcester Daily Spy', 1, 'ca5-spy-0702-p1', 'During the forenoon, Gens. Kilpatrick and Custer drove Stuart out of Hanover, after a splendid fight, and are still pursuing him—a part of his force going toward Gettysburg and a part toward York. During the day, Gen. Buford drove a regiment of rebel infantry out of Gettysburg, who also retired in a north-easterly direction."; the text layer prints Castar for Custer'),
    'dnl_rail': PIC('Daily National Intelligencer', 3, 'ca5-dnl-0629-p3c and -p3d', 'Harrisburg, June 27, 5 P. M.\u2014The rebel column, under Gen. Early, which was at Gettysburg yesterday, reached the Northern Central railroad a few minutes after twelve to-day, at a point between York and Hanover Junction. The wires were cut, and no further news of their"'),
    'cht_rail': PIC('Chicago Daily Tribune', 1, 'ca5-cht-0629-p1e', 'Harrisburg, June 27\u20146 P. M.\u2014The rebel columns, under General Early, which were at Gettysburg yesterday, reached the Northern Central Railroad, about ten o\'clock to-day, at a point between York and Hanover Junction"'),
    'dnl_york': PIC('Daily National Intelligencer', 3, 'ca5-dnl-0629-p3f', 'YORK OCCUPIED BY THE ENEMY. Harrisburg, June 27.\u2014The rebels occupied York at [fi]ve o\'clock this evening. No resistance was made by our"; the first letters of five are cut by the crop edge'),
    'star_150': PIC('Evening Star', 2, 'ca5-star-0629-p2d', 'esterday morning, between seven and eight [o\'clo]ck, a train, consisting of 150 wagons, each [wag]on drawn by six mules, left this city, [hav]ing been ordered to join the army at Fred-[eric]k, Maryland."; the ends of the lines are cut by the crop edge'),
    'cht_seneca': PIC('Chicago Daily Tribune', 1, 'ca5-cht-0630-p1', 'rebel force of 3,000 cavalry and seven pieces of artillery, crossed the Potomac at Seneca, Montgomery county, last night, and this morning took the Darnestown road, as if for the purpose of either reaching the Washing[ton]"; the right ends of the lines are cut by the crop edge'),
    'star_granger': PIC('Evening Star', 2, 'ca5-star-0701-p2', 'ment, who left Edwards\' Ferry on Saturday evening, and arrived at Seneca Creek at 4 o\'clock on Sunday morning and found himself surrounded by the whole of the forces"'),
    'dnl_seneca': PIC('Daily National Intelligencer', 2, 'ca5-dnl-0701-p2b', 'REBELS AT SANDY SPRINGS. We learn that the main body of the rebel cavalry [the end of the line is cut by the crop edge] that crossed the Potomac near Seneca on Sunday mor[ning] camped the same night at the Old Quaker settleme[nt of] Sandy Springs, in Montgomery county"; the text layer has the word raid after cavalry, at the line end that the crop cuts'),
    'her_xii': PIC('New York Herald', 4, 'ca5-her-0702-p4 and -p4b', 'MR. G. W. HOSMER\'S LETTER. Headquarters, Twelfth Corps, June 28, 1863. Across the Potomac. Reveille sounded in the camp of the Twelfth c[orps at] three A. M. on Friday, the 26th, and in little more than an hour later we were on the march\u2014of course in the rain. When the corps last marched the day was terribly hot, sunny and dusty; and to all that, the present march formed the strongest possible contrast, for the day was cool, the roads were deep with soft mud, and the rain fell constantly."; the text layer reads tbo, throe, wero, tho, c< ntrast and cooi (the crops show the printed words)'),
    'tim_date': PIC('Worcester Daily Spy', 1, 'ca5-spy-0702-p1b', 'The Times prints the following special this afternoon:\u2014 Headquarters Army of the Potomac, Tuesday, 8 P. M.\u2014I am just in from the front, and send by a messenger to Frederick a brief dispatch of the occurrences of yesterday and today."; the text layer reads Bp. m. and the page image 8 P. M.'),
    'fre_rain': PIC('Monmouth Herald and Inquirer', 2, 'ca5-fre-0702-p2', 'Thursday, June 25 ... During the afternoon our forces could be seen advancing on the other side of the river. It commenced raining about 2 o\'clock P. M., and continued all night. The work on the fortifications progresses during the day."; the text layer reads 2 p. jf.y for 2 o\'clock P. M.'),
    'fre_rain26': PIC('Monmouth Herald and Inquirer', 2, 'ca5-fre-0702-p2b', 'Friday, June 26 ... They encamped in our rear, and report that the 11th Army Corps is close behind. It is still raining; no work has been done on the fortifications to-day, except mounting some guns. Heavy reenforcements are"'),
    'whig_18h': PIC('Richmond Whig', 2, 'ca5-whig-0702-p2', 'It is just reported that Hooker\'s right wing is in the vicinity of Hagerstown. It has rained for the last eighteen hours incess[antly], and the friendly showers are still falling. The Susquehanna has already risen twenty inches, and is exp[ected soon to be an impassable barrier]"; the ends of the lines are cut by the crop edge'),
    'sun_rain': PIC('Sunday Dispatch (New York)', 1, 'ca5-sun-0628-p1', 'Washington, June 27. There has been a considerable quantity of rain within the past few days, which will have the effect of making the roads, wherever an army passes over them, very heavy, and may mate[rially interfere]"; the text layer reads fleet for effect and oyer for over'),
    'ei_flag': PIC('Evening Star', 1, 'ca5-star-0702-p1b', 'Official advices from the Army of the Potomac state that a portion of our cavalry, under Gen. Kilpatrick, had a handsome fight yesterday with the enemy\'s cavalry at Hanover. He captured a battle-flag, a lieutenant [colonel, one] captain and forty-five privates. [Fifteen or] twenty of the enemy were killed."'),
    'ei_400': PIC('Evening Star', 1, 'ca5-star-0702-p1c', 'A Battle at Hanover. Harrisburg, July 1—9.30 p. m.—A battle took place yesterday afternoon at Hanover Junction between Pleasanton and the rebel cavalry. It lasted nearly the whole afternoon, and the result was the enemy lost 400 in killed, wounded and prisoners, besides six pieces of artillery."; the dispatch means Hanover (the Tribune of Jul 2 says "which probably means Hanover")'),
}

def cite(sid, key, reading, imgkey=None, witness=None, **kw):
    d = dict(kw)
    if imgkey: d['image'] = IMG5[imgkey]
    if witness: d['witness'] = witness
    return CA(sid, Q[key], reading=reading, **d)

def close_owed_readings(by):
    """readings that the fourth start had only in the text layer and that the fifth start read on the page image"""
    # the Press special of the Chicago Daily Tribune of Jul 3 (T1-044, T1-046): the first lines of the passage
    for rid in ('T1-044', 'T1-046'):
        c = by[rid]['cites']['press_9']
        c['reading'] = c['reading'].replace('(the part of the sentence before "about six thousand strong" is read in the text layer only)', '(the whole passage was read on the page image)')
        c['image_check'] = c['image_check'] + ' ' + PIC('Chicago Daily Tribune', 1, 'ca5-cht-0703-p1', 'Columbia, Pa., July 1.\u2014The 5th New York, 1st Vermont, 1st Virginia and 18th Pennsylvania cavalry regiments left Frederick, Md., on Saturday, moved forward to Hanover, and arrived there Tuesday morning, when they were charged upon in the rear by Stuart\'s rebel cavalry, about six thousand strong. The National forces numbered 1,800. The battle"')
    # the Tribune correspondent reprinted in the Adams Sentinel of Sep 8 1863 (T1-005): the sentence before "This occurred on Tuesday"
    c = by['T1-005']['cites']['trib_horses']
    c['reading'] = 'The horses were produced, and taken away by the General. This occurred on Tuesday, the 23d of June.'
    c['image_check'] = ('page 2 of the issue rendered from the archive.org PDF (acquired_tl01.json, item adams-sentinel-1863-09-08.pdf, 220 dpi, region x 2300, y 1090, 1500 by 260 pixels; viewed in the fifth start of the close-out) reads: '
                        '"...General Jenkins replied in the affirmative. The horses were produced, and taken away by the General. This occurred on Tuesday, the 23d of June. On Thursday the enemy again returned, when General Early"')

def apply(rows):
    by = _by(rows)
    close_owed_readings(by)

    # ------------------------------------------------------------------------------------------------------------------ T1-003
    r = by['T1-003']
    r['cites']['ptl_rain'] = cite('CA-sn83016025-1863-06-27-p3', 'ptl_rain', 'It has rained all day, and the river is rising.',
                                   witness='The Portland Daily Press, Jun 27 1863: a Harrisburg dispatch of Jun 26, 11 p.m.; the text layer only (no figure in it; the OCR reads Uie for the)')
    sub_add(r, 'Harrisburg had rain all day on Jun 26: a dispatch of Jun 26, 11 p.m. says "It has rained all day, and the river is rising" (the Susquehanna). It is the nearest dated weather statement of the day in the newspapers read: evidence for the weather of the region, not an observation at Gettysburg',
            'inferred', 'supported', ['ptl_rain'])
    r['cites']['her_xii'] = cite('CA-sn83030313-1863-07-02-p4', 'her_xii', 'Reveille sounded in the camp of the Twelfth corps at three A. M. on Friday, the 26th, and in little more than an hour later we were on the march\u2014of course in the rain. When the corps last marched the day was terribly hot, sunny and dusty; and to all that, the present march formed the strongest possible contrast, for the day was cool, the roads were deep with soft mud, and the rain fell constantly.', 'her_xii',
                                  witness='New York Herald, Jul 2 1863: the letter of G. W. Hosmer from the headquarters of the Twelfth Corps (Army of the Potomac), June 28, headed Across the Potomac; the place of the march of Jun 26 is not named in the passage')
    sub_add(r, 'The Twelfth Corps of the Army of the Potomac broke camp at three A. M. on Friday, Jun 26 and marched in the rain: "the day was cool, the roads were deep with soft mud, and the rain fell constantly" (letter of G. W. Hosmer, headquarters of the Twelfth Corps, June 28, New York Herald, Jul 2): a second regional statement for Jun 26 (the corps was south of the Potomac or just across it, not at Gettysburg); no temperature',
            'inferred', 'supported', ['her_xii'])
    r['cites'].update({
        'fre_rain': cite('CA-sn83032312-1863-07-02-p2', 'fre_rain', 'It commenced raining about 2 o\'clock P. M., and continued all night.', 'fre_rain',
                         witness='Monmouth Herald and Inquirer (Freehold, N.J.), Jul 2 1863: the letter of a soldier signed H. from the garrison of Maryland Heights, which "was now under Gen. Hooker", entry of Thursday, June 25; the text layer reads 2 p. jf.y'),
        'fre_rain26': cite('CA-sn83032312-1863-07-02-p2', 'fre_rain26', 'It is still raining; no work has been done on the fortifications to-day, except mounting some guns', 'fre_rain26',
                           witness='Monmouth Herald and Inquirer, Jul 2 1863: the same letter, entry of Friday, June 26'),
        'whig_18h': cite('CA-sn84024669-1863-07-02-p2', 'whig_18h', 'It has rained for the last eighteen hours incessantly, and the friendly showers are still falling. The Susquehanna has already risen twenty inches', 'whig_18h',
                         witness='Richmond Whig, Jul 2 1863: a dispatch from Harrisburg (the New York Herald of Jun 27 p.3 prints it under the head Harrisburg, June 26; that text layer is damaged and was not viewed on the image); the text layer reads incessautly and Susque hanna'),
    })
    sub_add(r, 'Regional statements for the rain of Jun 25-26: the letter of a soldier of the Maryland Heights garrison (Monmouth Herald and Inquirer, Jul 2): on Thursday, Jun 25 "It commenced raining about 2 o\'clock P. M., and continued all night" and on Friday, Jun 26 "It is still raining; no work has been done on the fortifications to-day"; a dispatch from Harrisburg (Richmond Whig, Jul 2): "It has rained for the last eighteen hours incessantly, and the friendly showers are still falling": none of them is for Gettysburg, and no text gives the 08:00 of Jun 25 that the seed has for the beginning of the rain',
            'inferred', 'supported', ['fre_rain', 'fre_rain26', 'whig_18h'])
    r.setdefault('searched', []).append(S5 + 'rain, mud, dust, heat and thermometer words (327 windows, 305 distinct) in the pages of Jun 27 - Jul 3 and near Gettysburg, Hanover, Frederick, York, Harrisburg, Chambersburg and Westminster in the pages of Jun 26 - Jul 3: the Harrisburg dispatch of Jun 26 and the Twelfth Corps letter above; no temperature and no statement for Gettysburg itself')

    # ------------------------------------------------------------------------------------------------------------------ T1-004
    r = by['T1-004']
    r['cites']['cht_thu'] = cite('CA-sn84031490-1863-06-29-p1', 'cht_thu', 'On Thursday night the rebel encampment extended from Cashtown to Fayetteville. The editor of the Gettysburg Star has been captured, and it is reported that one of our scouts has been shot.',
                                  'cht_thu', witness='Chicago Daily Tribune, Jun 29 1863: ' + BUL + '; the text layer reads Coshtown')
    sub_add(r, 'A dispatch of Jun 27 from Hanover Junction (a special to the Philadelphia Bulletin, printed in the Chicago Daily Tribune of Jun 29 and in at least four other papers; the text layer of the Evening Star of Jun 27 reads Easttown for the first name) says that on Thursday night, Jun 25, the rebel encampment extended from Cashtown to Fayetteville',
            'documented', 'supported', ['cht_thu'])
    r.setdefault('searched', []).append(S5 + 'Thursday-night and Cashtown-Fayetteville in the newspaper pages: the dispatch of Jun 27 above (8 printings); no hour of the start of the march on Jun 26 and no word on the temperature of the rain')

    # ------------------------------------------------------------------------------------------------------------------ T1-007
    r = by['T1-007']
    r['cites']['cht_26th'] = cite('CA-sn84031490-1863-06-29-p1', 'cht_26th',
                                   'Good authority says that yesterday the 26th Pennsylvania militia regiment, under Capt. [sic] Jennings, went on a reconnoissance toward Gettysburg. When near there a company visited the town. While there, some rebels rushed in and drove them out. On returning the cars with the regiment ran off the track six miles this side of Gettysburg. They were encamped there temporarily',
                                   'cht_26th', witness='Chicago Daily Tribune, Jun 29 1863: a dispatch of Jun 27 on the news of Hanover ("Good authority says that yesterday", i.e. Jun 26); the text layer reads 2Cth for 26th and the page image shows 26')
    # the crop of the fourth start had cut the word Friday of the Weekly National Intelligencer dispatch; the crop of the fifth start shows it plain
    r['cites']['wni_fri']['image_check'] = PIC('Weekly National Intelligencer', 3, 'ca5-wni-0702-p3', 'HANOVER JUNCTION, JUNE 27.—Col. Jennings\'s regiment left Harrisburg on Thursday for Gettysburg. On Friday morning the regiment went to Gettysburg. The Philadelphia city troops and another cavalry company preceded them. The cavalry was three miles beyond Marsh"; the word Friday, which the crop of the fourth start (ca-wni-0702-jennings) had cut, is plain')
    sub_add(r, 'A dispatch of Jun 27 (Chicago Daily Tribune, Jun 29) says that on Jun 26 the 26th Pennsylvania militia, under Jennings, went on a reconnoissance toward Gettysburg, that a company visited the town and was driven out by rebels who rushed in, and that on returning the cars with the regiment ran off the track six miles this side of Gettysburg, where the regiment encamped temporarily: the six miles (Pennypacker: detained at Swift Run, six miles from Gettysburg) and the encampment on the spot (Compiler: the locomotive struck a cow at Swift Run and the regiment encamped on the spot) agree with the derailment at Swift Run; the date (a return on Jun 26, not the way out from Harrisburg on Jun 24: Compiler, Pennypacker) and the reconnoissance disagree with them. Carried with no default',
            'documented', 'conflict', ['cht_26th', 'cmp_swift', 'penny_acc'])
    r.setdefault('searched', []).append(S5 + '26th, Jennings, Emergency and reconnoissance in the newspaper pages of Jun 26 - Jul 12 (92 windows against 47 before): the dispatch of Jun 27 above; no hour of arrival at Gettysburg')

    # ------------------------------------------------------------------------------------------------------------------ T1-010
    r = by['T1-010']
    r['cites'].update({
        'tri_jen40': cite('CA-sn83030213-1863-06-29-p1', 'tri_jen40', "Col. Jennings's regiment of Pennsylvania Militia, in that neighborhood, was routed by the Rebels, and it is reported that 40 of them were taken prisoners.", 'tri_scout',
                          witness='New-York Daily Tribune, Jun 29 1863: a dispatch from Hanover Junction "dated this morning" (Saturday Jun 27), printed under the head "All the Cars at Rock Creek Bridge Set on Fire by the Rebels - Rout of a Regiment of Pennsylvania Militia"'),
        'tri_dowling': cite('CA-sn83030213-1863-06-29-p1', 'tri_dowling', 'Michael Dowling was taken prisoner by a party seven or eight hundred strong, two or three miles outside of Gettysburg, on the Chambersburg pike, and was paroled, on Friday afternoon.', 'tri_dowling',
                            witness='New-York Daily Tribune, Jun 29 1863: an account of refugees from Gettysburg; Dowling is not further identified'),
        'star_300': cite('CA-sn83045462-1863-06-29-p1', 'star_300', "Col. Jenning's regiment, which had the skirmish at Gettysburg, arrived here to-day. He lost about three hundred men in prisoners and stragglers. The officers were sent to Richmond, and the men paroled.", 'star_300',
                         witness='Evening Star, Jun 29 1863: a Harrisburg dispatch of Jun 28 (the same words in the Chicago Daily Tribune of Jun 30, the Richmond Whig and other papers)'),
    })
    import copy
    for k_ in ('cmp_entry3', 'jac_cav'):
        r['cites'][k_] = copy.deepcopy(by['T1-014']['cites'][k_])
    sub_add(r, 'A dispatch of the morning of Jun 27 from Hanover Junction (New-York Daily Tribune, Jun 29) says that Col. Jennings\'s regiment was routed by the rebels and that it was reported that 40 of them were taken prisoners; a Harrisburg dispatch of Jun 28 (Evening Star, Jun 29) says that the regiment lost about three hundred men in prisoners and stragglers, the officers being sent to Richmond and the men paroled',
            'documented', 'conflict', ['tri_jen40', 'star_300'])
    sub_add(r, 'Strength of the force that took prisoners on the Chambersburg pike: "seven or eight hundred strong", two or three miles outside of Gettysburg, on Friday afternoon (the paroled Michael Dowling, New-York Daily Tribune, Jun 29), against about 150 (Compiler) and 180 to 200 (Jacobs) for the cavalry that entered the town',
            'documented', 'conflict', ['tri_dowling', 'cmp_entry3', 'jac_cav'])
    scen_extend(r, 'A', '; about forty reported taken in a dispatch of the morning of Jun 27 (New-York Daily Tribune, Jun 29, page image)', 'tri_jen40')
    r['scenarios'].append(sc('D', 'About three hundred men lost in prisoners and stragglers (the regiment as a whole; the officers sent to Richmond, the men paroled)',
                             'Harrisburg dispatch of Jun 28, printed in the Evening Star of Jun 29 1863 p.1 (page image) and in other papers', 'documented', ['star_300']))
    r.setdefault('searched', []).append(S5 + 'Jennings, militia, routed, prisoners and Dowling in the newspaper pages of Jun 26 - Jul 12: the three passages above; Co. E of the battalion, Lt. Strickler and the raid on the camp are in none of the 1,546 pages')

    # ------------------------------------------------------------------------------------------------------------------ T1-012
    r = by['T1-012']
    r['cites'].update({
        'star_100pris': cite('CA-sn83045462-1863-07-01-p1', 'star_100pris', 'Yesterday there arrived one hundred prisoners, which the rebels captured at Gettysburg. They were robbed of their boots, shoes, and all valuables, after which they were let go, to work their way home barefooted as best they could.', 'star_100pris',
                             witness='Evening Star, Jul 1 1863: a Harrisburg dispatch of Jun 30 from a citizen of Carlisle who left at eleven o\'clock; the prisoners arrived at Carlisle on Jun 29'),
        'her_126': cite('CA-sn83030313-1863-07-02-p10', 'her_126', 'General Early took one hundred and twenty-six prisoners at Gettysburg.', 'her_126',
                        witness='New York Herald, Jul 2 1863: a Carlisle dispatch; the text layer reads ?\'4* for and; the prisoners were taken to Carlisle and held twelve hours before they were paroled'),
        'star_300': cite('CA-sn83045462-1863-06-29-p1', 'star_300', "Col. Jenning's regiment, which had the skirmish at Gettysburg, arrived here to-day. He lost about three hundred men in prisoners and stragglers. The officers were sent to Richmond, and the men paroled.", 'star_300',
                         witness='Evening Star, Jun 29 1863: a Harrisburg dispatch of Jun 28'),
    })
    sub_append(r, 4, '; 100 prisoners captured at Gettysburg arrived at Carlisle on Jun 29, robbed of their boots and shoes (Evening Star, Jul 1); General Early took 126 prisoners at Gettysburg, held at Carlisle twelve hours and paroled (New York Herald, Jul 2); the regiment lost about 300 men in prisoners and stragglers (Harrisburg dispatch of Jun 28, Evening Star, Jun 29)',
               'star_100pris', 'her_126', 'star_300')
    s = scen(r, 'C')
    s['value'] = s['value'] + ' / 126 (New York Herald) / 100 arrived at Carlisle (Evening Star) / about 300 lost in prisoners and stragglers (Evening Star)'
    scen_extend(r, 'C', '; the newspaper values are those of dispatches of Jun 28 - Jul 1 (page images viewed in the fifth start)', 'star_100pris', 'her_126', 'star_300')
    r.setdefault('searched', []).append(S5 + 'prisoners, paroled, Carlisle and Gettysburg in the newspaper pages of Jun 28 - Jul 12: three further counts (100, 126, about 300); no wooden bridge near Bayly\'s Hill in any page')

    # ------------------------------------------------------------------------------------------------------------------ T1-013
    r = by['T1-013']
    r['cites'].update({
        'tri_scout': cite('CA-sn83030213-1863-06-29-p1', 'tri_scout', 'One of our scouts was killed at Gettysburg yesterday and several were taken prisoners', 'tri_scout',
                          witness='New-York Daily Tribune, Jun 29 1863: a dispatch from Hanover Junction "dated this morning" (Jun 27); the text layer is badly damaged (econts wag for scouts was, yesterdny, tukeu) and the page image reads as given'),
        'cht_scout': cite('CA-sn84031490-1863-06-29-p1', 'cht_thu', 'On Thursday night the rebel encampment extended from Cashtown to Fayetteville. The editor of the Gettysburg Star has been captured, and it is reported that one of our scouts has been shot.', 'cht_thu',
                          witness='Chicago Daily Tribune, Jun 29 1863: ' + BUL),
    })
    sub_add(r, 'Two dispatches of Jun 27, printed two days before the Compiler of Jun 29, report a Union scout shot at Gettysburg on Jun 26: "One of our scouts was killed at Gettysburg yesterday and several were taken prisoners" (a dispatch from Hanover Junction of the morning of Jun 27, New-York Daily Tribune, Jun 29) and "it is reported that one of our scouts has been shot" (the Bulletin special of Jun 27, Chicago Daily Tribune, Jun 29); neither names him, gives the hour or names the unit',
            'documented', 'supported', ['tri_scout', 'cht_scout'])
    r.setdefault('searched', []).append(S5 + 'Sandoe, Sandow, scout, shot and killed at Gettysburg in the newspaper pages of Jun 26 - Jul 12: the two dispatches above (no name in either); the hour 16:00 and the second trooper Lightner are in none of the pages')

    # ------------------------------------------------------------------------------------------------------------------ T1-014
    r = by['T1-014']
    r['cites'].update({
        'star_3pm': cite('CA-sn83045462-1863-06-27-p2', 'star_3pm', 'About three o\'clock on Friday (yesterday) afternoon our cavalry left Gettysburg as the rebels entered.', 'star_3pm',
                         witness='Evening Star, Jun 27 1863: ' + BUL + '; the text layer reads th^ee for three'),
        'dnl_3pm': cite('CA-sn83026172-1863-06-29-p3', 'dnl_3pm', 'At three o\'clock on Friday afternoon our cavalry left Gettysburg as the rebels entered.', 'dnl_3pm',
                        witness='Daily National Intelligencer, Jun 29 1863: ' + BUL),
        'cht_3pm': cite('CA-sn84031490-1863-06-29-p1', 'cht_3pm', 'At 3 o\'clock Friday afternoon our cavalry left Gettysburg.', 'cht_cars', witness='Chicago Daily Tribune, Jun 29 1863: ' + BUL),
        'star_noon25': cite('CA-sn83045462-1863-06-27-p1', 'star_noon25', 'We learn that a force of rebel cavalry entered and took possession of Gettysburg at noon yesterday, when the telegraph operator secured his instruments and left, arriving here last evening. The force was said to be fully 1,000 strong', 'star_noon25',
                            witness='Evening Star, Jun 27 1863: a report of the Baltimore American of the 26th ("yesterday" is Jun 25); the text layer reads lorce and oossession and the page image gives the words printed here'),
    })
    sub_add(r, 'Hour at which the Confederate force entered, by the Bulletin special of Jun 27: about three o\'clock on Friday afternoon our cavalry left Gettysburg as the rebels entered (Evening Star of Jun 27, Daily National Intelligencer of Jun 29, page images; "3 o\'clock Friday afternoon" in the Chicago Daily Tribune of Jun 29): the hour agrees with the Compiler and the county history',
            'documented', 'supported', ['star_3pm', 'dnl_3pm', 'cht_3pm'])
    sub_add(r, 'A report of the Baltimore American of Jun 26 (Evening Star, Jun 27) has a force of rebel cavalry, fully 1,000 strong, enter and take possession of Gettysburg at noon "yesterday" (Jun 25), the telegraph operator leaving with his instruments and arriving at Baltimore that evening, the place surrendering without opposition: a day and an hour that no other text read gives (Jacobs, the Compiler, the county history and the Bulletin special have the first rebel cavalry in the town on Friday afternoon, Jun 26)',
            'documented', 'conflict', ['star_noon25'])
    r['scenarios'].append(sc('C', 'First entry of the Confederate force at noon on Jun 25: cavalry fully 1,000 strong take possession; the telegraph operator leaves (Baltimore American of Jun 26)',
                             'Evening Star of Jun 27 1863 p.1 (page image); against about 15:00 on Jun 26 in the Compiler, Jacobs, the county history and the Bulletin special; no default', 'documented', ['star_noon25']))
    r.setdefault('searched', []).append(S5 + 'Gettysburg with entered, occupied, possession, Friday, 3 o\'clock and the unit names in the newspaper pages of Jun 26 - Jul 2 (161 distinct passages read): the hour of the cavalry\'s departure (3 o\'clock, three printings) and the report of noon on Jun 25; no passage for the Court-house prisoners, a covered bridge or the torn telegraph lines')

    # ------------------------------------------------------------------------------------------------------------------ T1-015
    r = by['T1-015']
    r['cites'].update({
        'star_cars13': cite('CA-sn83045462-1863-06-27-p2', 'star_cars13', 'Before leaving, a train of thirteen freight cars, some with Col. Jennings\' supplies, were run to this side of the bridge at the edge of the town. The bridge and train were afterwards destroyed by the rebels.', 'star_3pm',
                            witness='Evening Star, Jun 27 1863: ' + BUL + '; the text layer reads soms and atterwards'),
        'dnl_cars13': cite('CA-sn83026172-1863-06-29-p3', 'dnl_cars13', 'Before leaving a train of thirteen freight cars, some with Col. Jennings\' supplies, were run to this side of the bridge, at the edge of the town. The bridge and train were afterwards destroyed by the rebels', 'dnl_3pm',
                           witness='Daily National Intelligencer, Jun 29 1863: ' + BUL + ' (the Weekly National Intelligencer of Jul 2 and the Richmond Enquirer of Jul 3 print thirteen too)'),
        'cht_cars16': cite('CA-sn84031490-1863-06-29-p1', 'cht_cars16', 'Before we left a train of sixteen freight cars, some with Col. Jennings\' supplies, were run to this side of the bridge at the edge of the town.', 'cht_cars',
                           witness='Chicago Daily Tribune, Jun 29 1863: ' + BUL + ' (the Indiana State Sentinel of Jun 30 and the Burlington Weekly Hawk-Eye of Jul 4 print sixteen too); the sentence goes on: The bridge and train were afterwards destroyed by the rebels'),
        'dnl_own': cite('CA-sn83026172-1863-06-29-p3', 'dnl_cars_own', 'The cars destroyed belonged to the Pennsylvania Central railroad.', 'dnl_wolf', witness='Daily National Intelligencer, Jun 29 1863; the text layer reads hajonged t the Pannsylvania'),
        'cht_own': cite('CA-sn84031490-1863-06-29-p1', 'cht_cars_own', 'The cars destroyed belonged to the Northern and Pennsylvania Central Railroads.', 'cht_thu', witness='Chicago Daily Tribune, Jun 29 1863'),
        'tri_rock': cite('CA-sn83030213-1863-06-29-p1', 'tri_rock', 'Information has been received that the Rebels ran all the cars on to the Rock Creek bridge and set them on fire.', 'tri_scout',
                         witness='New-York Daily Tribune, Jun 29 1863: a dispatch from Hanover Junction "dated this morning" (Jun 27); the text layer reads {ran'),
    })
    sub_append(r, 1, '; thirteen freight cars were run to the town side of the bridge and destroyed with it (the Bulletin special of Jun 27 in the Evening Star of Jun 27 and the Daily National Intelligencer of Jun 29), sixteen in the Chicago Daily Tribune of Jun 29 (page images of the three printings)',
               'star_cars13', 'dnl_cars13', 'cht_cars16')
    sub_add(r, 'The owner of the cars destroyed: the Pennsylvania Central railroad (Daily National Intelligencer, Jun 29) or the Northern and Pennsylvania Central railroads (Chicago Daily Tribune, Jun 29); the Compiler names the owners of its seventeen cars',
            'documented', 'conflict', ['dnl_own', 'cht_own'])
    sub_add(r, 'A dispatch of the morning of Jun 27 (New-York Daily Tribune, Jun 29, page image) says that information had been received that the rebels ran all the cars on to the Rock Creek bridge and set them on fire',
            'documented', 'supported', ['tri_rock'])
    r['scenarios'].append(sc('C', 'Thirteen freight cars run to the town side of the bridge and destroyed with it (the cars belonged to the Pennsylvania Central railroad)',
                             'Bulletin special of Jun 27 as printed in the Evening Star of Jun 27 p.2, the Daily National Intelligencer of Jun 29 p.3 (page images), the Weekly National Intelligencer of Jul 2 and the Richmond Enquirer of Jul 3', 'documented', ['star_cars13', 'dnl_cars13', 'dnl_own']))
    r['scenarios'].append(sc('D', 'Sixteen freight cars run to the town side of the bridge and destroyed with it (the cars belonged to the Northern and Pennsylvania Central railroads)',
                             'Bulletin special of Jun 27 as printed in the Chicago Daily Tribune of Jun 29 p.1 (page image), the Indiana State Sentinel of Jun 30 and the Burlington Weekly Hawk-Eye of Jul 4', 'documented', ['cht_cars16', 'cht_own']))
    r.setdefault('searched', []).append(S5 + 'cars, bridge, burn and destroyed with Gettysburg and Rock Creek in the newspaper pages of Jun 26 - Jul 8 (21 new windows): thirteen (three printings) and sixteen (three printings) freight cars, the Rock Creek bridge; no covered bridge and no torn telegraph lines in any page')

    # ------------------------------------------------------------------------------------------------------------------ T1-017
    r = by['T1-017']
    r['cites'].update({
        'dnl_wolf': cite('CA-sn83026172-1863-06-29-p3', 'dnl_wolf', 'On Friday night the rebels encamped on Wolf\'s farm, a mile and a half this side of the town. Their force was represented to be eight thousand strong, with artillery. Gen. Robinson is in command. At midnight their pickets were near Oxford.', 'dnl_wolf',
                         witness='Daily National Intelligencer, Jun 29 1863: ' + BUL + '; the text layer reads Un for On and G.m. for Gen.'),
        'star_wolf': cite('CA-sn83045462-1863-06-27-p2', 'star_wolf', 'On Friday night the rebels encamped on Wolf\'s farm, a mile and a half from this side of the town.', 'star_wolf',
                          witness='Evening Star, Jun 27 1863: ' + BUL + ' (the Weekly National Intelligencer of Jul 2 prints a mile and a half too)'),
        'cht_wolf': cite('CA-sn84031490-1863-06-29-p1', 'cht_wolf', 'On Friday night the rebels encamped on Wolf\'s farm, half a mile this side of the town. Their force is represented to be 8,000 strong, with artillery, under command of Gen. Robinson, their pickets were near Oxford.', 'cht_wolf',
                         witness='Chicago Daily Tribune, Jun 29 1863: ' + BUL + ' (the Indiana State Sentinel of Jun 30 and the Burlington Weekly Hawk-Eye of Jul 4 print half a mile too); the text layer reads WolPs form'),
    })
    sub_add(r, 'The Bulletin special of Jun 27 says that on Friday night the rebels encamped on Wolf\'s farm, a mile and a half this side of the town (Evening Star, Jun 27, Daily National Intelligencer, Jun 29) or half a mile this side of the town (Chicago Daily Tribune, Jun 29), their force represented to be 8,000 strong with artillery under Gen. Robinson: the dispatch gives no bearing other than "this side of the town" (the side of the correspondent at Hanover Junction) and Wolf\'s farm is not identified on the ground; against Early (Hays\' brigade about a mile from Gettysburg, the other brigades near Mummasburg) and the Evening Star informant (about a mile). Carried with no default',
            'documented', 'conflict', ['dnl_wolf', 'star_wolf', 'cht_wolf', 'early_mum', 'early_hays', 'star_camp'])
    r['scenarios'].append(sc('A', 'A camp on Wolf\'s farm a mile and a half this side of the town; 8,000 strong with artillery', 'Bulletin special of Jun 27: Evening Star of Jun 27 p.2, Daily National Intelligencer of Jun 29 p.3 (page images), Weekly National Intelligencer of Jul 2', 'documented', ['dnl_wolf', 'star_wolf']))
    r['scenarios'].append(sc('B', 'A camp on Wolf\'s farm half a mile this side of the town; 8,000 strong with artillery', 'Bulletin special of Jun 27: Chicago Daily Tribune of Jun 29 p.1 (page image), Indiana State Sentinel of Jun 30, Burlington Weekly Hawk-Eye of Jul 4', 'documented', ['cht_wolf']))
    r.setdefault('searched', []).append(S5 + 'encamp, bivouac, camp, Wolf and Friday night with Gettysburg in the newspaper pages of Jun 26 - Jul 12: Wolf\'s farm (six printings, two distances); the militia prisoners\' lodging in the Court-house and the rain of the night are in none of the pages')

    # ------------------------------------------------------------------------------------------------------------------ T1-018
    r = by['T1-018']
    r['cites']['dnl_oxford'] = cite('CA-sn83026172-1863-06-29-p3', 'dnl_wolf', 'On Friday night the rebels encamped on Wolf\'s farm, a mile and a half this side of the town. Their force was represented to be eight thousand strong, with artillery. Gen. Robinson is in command. At midnight their pickets were near Oxford.', 'dnl_wolf',
                                     witness='Daily National Intelligencer, Jun 29 1863: ' + BUL + ' (the Chicago Daily Tribune of Jun 29 reads their pickets were near Oxford too)')
    sub_add(r, 'At midnight of Jun 26-27 the rebel pickets were near Oxford (the Bulletin special of Jun 27, Daily National Intelligencer, Jun 29, page image): the one named picket position in the texts read',
            'documented', 'supported', ['dnl_oxford'])
    sub_set(r, 3, 'Campfires, lights in houses, sentries on prisoners, and the posts of the pickets other than the one reported near Oxford', 'open gap', 'unsupported', [])
    r['remains'] = [x.replace('named picket posts, ', '') if isinstance(x, str) else x for x in r['remains']]
    r.setdefault('searched', []).append(S5 + 'picket, pickets, sentries, camp-fires and lights with Gettysburg in the newspaper pages of Jun 26 - Jul 12: pickets near Oxford at midnight; campfires, lights and sentries on prisoners are in none of the pages')

    # ------------------------------------------------------------------------------------------------------------------ T1-023
    # second reading (fifth start): the quote of sub-claim 2 held only the weather words; it now runs from the camp near Middletown to the march to Frederick that the claim names
    by['T1-023']['cites']['bown28']['quote'] = 'Kemained in camp, near Middletown, Md., until about 4 p. m., when -we marched to Frederick City, Md. ; weather rainy during the night.'

    # ------------------------------------------------------------------------------------------------------------------ T1-024
    r = by['T1-024']
    r['cites'].update({
        'cht_seneca': cite('CA-sn84031490-1863-06-30-p1', 'cht_seneca', 'rebel force of 3,000 cavalry and seven pieces of artillery, crossed the Potomac at Seneca, Montgomery county, last night, and this morning took the Darnestown road, as if for the purpose of either reaching the Washington Road, or the Baltimore and Ohio Railroad.', 'cht_seneca',
                           witness='Chicago Daily Tribune, Jun 30 1863: a Baltimore dispatch of Jun 28 (the Evening Star of Jun 29 prints it too, with the text layer damaged: croeted, luetnight; the Burlington Weekly Hawk-Eye of Jul 4 has "at Seneca Point this morning"); the text layer reads Washing ton and Rail road'),
        'star_granger': cite('CA-sn83045462-1863-07-01-p2', 'star_granger', 'who left Edwards\' Ferry on Saturday evening, and arrived at Seneca Creek at 4 o\'clock on Sunday morning and found himself surrounded by the whole of the forces', 'star_granger',
                             witness='Evening Star, Jul 1 1863: Capt. Granger of the Commissary Department; the sentence goes on: under Gens. Stuart, Fitzhugh Lee and McMahon, numbering about eight thousand men; the text layer reads lelt, Satur day and him self'),
        'dnl_seneca': cite('CA-sn83026172-1863-07-01-p2', 'dnl_seneca', 'the main body of the rebel cavalry that crossed the Potomac near Seneca on Sunday morning camped the same night at the Old Quaker settlement of Sandy Springs', 'dnl_seneca',
                           witness='Daily National Intelligencer, Jul 1 1863: the text layer has the word raid after cavalry'),
    })
    sub_add(r, 'Newspaper reports of Jun 28 - Jul 1: a Baltimore dispatch of Jun 28 says that a rebel force of 3,000 cavalry and seven pieces of artillery crossed the Potomac at Seneca "last night" and "this morning took the Darnestown road" (Chicago Daily Tribune, Jun 30); Capt. Granger, who arrived at Seneca Creek at 4 o\'clock on Sunday morning (Jun 28), found himself surrounded by the whole of the forces under Stuart, Fitzhugh Lee and McMahon (Evening Star, Jul 1); the main body of the cavalry that crossed near Seneca "on Sunday morning" camped that night at Sandy Springs (Daily National Intelligencer, Jul 1): the crossing in the night of Jun 27-28 and the force over by 4 a.m. agree with the documented crossing before midnight and contradict the dawn of the seed; "Sunday morning" is a later hour. Carried with no default',
            'documented', 'conflict', ['cht_seneca', 'star_granger', 'dnl_seneca'])
    r['scenarios'].append(sc('E', 'The force had crossed in the night of Jun 27-28 ("last night" in a dispatch of Jun 28) and was at Seneca Creek by 4 o\'clock on the morning of Jun 28',
                             'Chicago Daily Tribune of Jun 30 1863 p.1 and Evening Star of Jul 1 1863 p.2 (page images); against 03:00 and dawn of the seed; no default', 'documented', ['cht_seneca', 'star_granger']))
    r['scenarios'].append(sc('F', 'The crossing near Seneca on Sunday morning, Jun 28', 'Daily National Intelligencer of Jul 1 1863 p.2 (page image); against the crossing before midnight of Jun 27 in Stuart\'s report; no default', 'documented', ['dnl_seneca']))
    r.setdefault('searched', []).append(S5 + 'Seneca, Rowser, Edwards\' Ferry and crossed the Potomac in the newspaper pages of Jun 28 - Jul 5 (36 distinct passages): the three reports above; no hour of 03:00 and no dawn crossing in any page')

    # ------------------------------------------------------------------------------------------------------------------ T1-026
    r = by['T1-026']
    r['cites'].update({
        'star_178h': cite('CA-sn83045462-1863-06-29-p2', 'star_178h', 'ONE HUNDRED AND SEVENTY-EIGHT WAGONS AND OVER ONE THOUSAND MULES GOBBLED UP.', 'star_178h',
                          witness='Evening Star, Jun 29 1863 p.2: the head of an article that says a train of 150 wagons left Washington on the morning of Jun 28 and that twenty-eight wagons had been captured beyond Rockville that morning; the text layer reads IIIN\'DP.ED, FTf\'HT and Ml LES'),
        'dnl_178': cite('CA-sn83026172-1863-06-30-p3', 'dnl_178', 'We find, however, by last evening\'s city papers, that rumor in this case fell short of the truth, and that the number of wagons captured was one hundred and seventy-eight, and one thousand mules. The capture occurred about noon.', 'dnl_178',
                        witness='Daily National Intelligencer, Jun 30 1863: the paper had reduced the report of 150 to 120 in its issue of Jun 29; the text layer reads huinlrc\'1 and seeinly-ciaht'),
        'star_150': cite('CA-sn83045462-1863-06-29-p2', 'star_150', 'a train, consisting of 150 wagons, each wagon drawn by six mules, left this city, having been ordered to join the army at Frederick, Maryland.', 'star_150',
                         witness='Evening Star, Jun 29 1863 p.2: the account under the head of the 178 wagons; the train left between seven and eight o\'clock on the morning of Jun 28; the text layer reads Fred erick'),
        'star_1230': cite('CA-sn83045462-1863-06-29-p2', 'star_1230', 'at about half-past twelve o\'clock, and when the head of the train was within a short distance of the town it was met by two rebel cavalrymen', 'star_1230',
                          witness='Evening Star, Jun 29 1863 p.2: the account of the train'),
    })
    sub_add(r, 'Newspaper reports of Jun 29-30: a train of 150 wagons with six-mule teams left Washington on the morning of Jun 28 for Frederick; the Evening Star of Jun 29 heads its article "One hundred and seventy-eight wagons and over one thousand mules gobbled up" and the Daily National Intelligencer of Jun 30 says that the number of wagons captured was one hundred and seventy-eight, and one thousand mules, the capture about noon (the head of the train met two rebel cavalrymen at about half-past twelve, Evening Star)',
            'documented', 'supported', ['star_178h', 'dnl_178', 'star_1230', 'star_150'])
    r['scenarios'].append(sc('E', 'One hundred and seventy-eight wagons and about one thousand mules captured; the capture about noon (Evening Star, Daily National Intelligencer)',
                             'Evening Star of Jun 29 1863 p.2 (page image of the head) and Daily National Intelligencer of Jun 30 1863 p.3 (page image); against 125 to 150 in the Official Records, 140 and 175 in the Chicago and New-York Tribunes; no default', 'documented', ['star_178h', 'dnl_178']))
    r.setdefault('searched', []).append(S5 + 'Rockville, Capt. Page, Tenallytown and wagons in the newspaper pages of Jun 28 - Jul 5 (24 windows): a further count of 178 (two papers); the 120 of the Intelligencer of Jun 29 is its own reduction of a report of 150 and is not carried as a count')

    # ------------------------------------------------------------------------------------------------------------------ T1-037
    r = by['T1-037']
    r['cites'].update({
        'dnl_wm4': cite('CA-sn83026172-1863-07-01-p2', 'dnl_wm4', 'About four o\'clock on Monday afternoon the Federal scouts reported a rebel force advancing on Westminster, whereupon the Federals, consisting of a part of the First Regiment of Delaware cavalry, were immediately placed in position, when in the course of a half hour the enemy was observed advancing rapidly in two different directions.', 'dnl_wm4',
                        witness='Daily National Intelligencer, Jul 1 1863: an account of the Baltimore American of Jun 30 from Delaware cavalrymen who reached Baltimore'),
        'spy_wm5': cite('CA-sn83021205-1863-07-03-p1', 'spy_wm5', 'General Stuart, with his cavalry force, reached there about 5 o\'clock in the afternoon, and did not leave until daylight the next morning. The rebel party who had a fight with the Delaware cavalry was General Stuart\'s advance guard, and numbered about 300. The rebels lost in that fight two lieutenants killed, and fully a dozen wounded.', 'spy_wm5',
                        witness='Worcester Daily Spy, Jul 3 1863: a gentleman who was at Westminster and a prisoner of the rebels; the text layer reads Smart\'s for Stuart\'s'),
        'spy_loss': cite('CA-sn83021205-1863-07-03-p1', 'spy_wm_loss', 'Our loss was two privates killed and twenty-eight taken prisoners. The rebels also captured Lieut. Bowman, and the provost marshal of Westminster, with ten of his men.', 'spy_loss',
                         witness='Worcester Daily Spy, Jul 3 1863: the same account; the text layer reads ta ken'),
    })
    sub_add(r, 'Hours in the press: about four o\'clock on Monday afternoon the Federal scouts reported a rebel force advancing on Westminster and about half an hour later the enemy was advancing in two directions (Baltimore American, Daily National Intelligencer Jul 1); General Stuart reached the town about 5 o\'clock and did not leave until daylight, the rebel party that fought the Delaware cavalry being his advance guard of about 300 (Worcester Daily Spy, Jul 3); against about 3.30 p.m. in Knight and about 5 p.m. in Stuart',
            'documented', 'conflict', ['dnl_wm4', 'spy_wm5', 'knight_330', 'stuart5'])
    sub_add(r, 'Losses in the press: our loss two privates killed and twenty-eight taken prisoners and the capture of Lieut. Bowman and the provost marshal with ten men; the rebels lost two lieutenants killed and fully a dozen wounded (Worcester Daily Spy, Jul 3), against the General Return (2 men killed, 8 wounded, 3 officers and 36 men captured or missing, 49 in all)',
            'documented', 'conflict', ['spy_wm5', 'spy_loss', 'gr_westminster'])
    r['scenarios'].append(sc('A', 'Union loss 49: 2 men killed, 8 wounded, 3 officers and 36 men captured or missing (General Return of Casualties)', 'OR27-1 p.193', 'documented', ['gr_westminster']))
    r['scenarios'].append(sc('B', 'Union loss two privates killed and twenty-eight taken prisoners (30), with Lieut. Bowman and the provost marshal captured', 'Worcester Daily Spy of Jul 3 1863 p.1 (a prisoner of the rebels at Westminster)', 'documented', ['spy_wm5', 'spy_loss']))
    r.setdefault('searched', []).append(S5 + 'Westminster with Knight, Delaware, Stuart, charge and skirmish in the newspaper pages of Jun 29 - Jul 10 (10 new windows of 86): the hours and the losses above')

    # ------------------------------------------------------------------------------------------------------------------ T1-044
    r = by['T1-044']
    r['cites']['whig_9'] = cite('CA-sn84024669-1863-07-07-p2', 'whig_9', 'They advanced on Tuesday to Hanover, at 9 o\'clock, charged on the rear and advance of Gen. Pleasonton\'s cavalry, composed of the 5th New York, 1st Vermont, 1st Virginia and 18th Pennsylvania—1,800 in all.', 'whig_9',
                                witness='Richmond Whig, Jul 7 1863: a despatch to the New York Tribune dated Columbia, Penn., Jul 1, the report of Captain McIrvin (Harr\'s Light Guard), captured with about 200 of Pleasonton\'s cavalry and paroled by Stuart; the text layer reads Plcssonton\'n and ISth')
    sub_add(r, 'Captain McIrvin, paroled by Stuart (a despatch to the New York Tribune dated Columbia, Jul 1, in the Richmond Whig of Jul 7): Stuart\'s force advanced on Tuesday to Hanover at 9 o\'clock and charged on the rear and advance of Pleasonton\'s cavalry (the 5th New York, 1st Vermont, 1st Virginia and 18th Pennsylvania, 1,800 in all): the same hour as the Press special of Columbia, Jul 1 (the two dispatches may rest on one informant)',
            'documented', 'conflict', ['whig_9'])
    scen_extend(r, 'C', '; Captain McIrvin\'s report in the New York Tribune dispatch of Columbia, Jul 1, printed in the Richmond Whig of Jul 7 p.2 (page image): they advanced on Tuesday to Hanover, at 9 o\'clock', 'whig_9')
    r.setdefault('searched', []).append(S5 + 'Hanover with Stuart, Kilpatrick, Custer, hours and losses in the newspaper pages of Jun 30 - Jul 10 (31 of 346 windows read): Captain McIrvin\'s report (a second witness for 9 o\'clock); the vedette detail is in none of the pages')

    # ------------------------------------------------------------------------------------------------------------------ T1-045
    r = by['T1-045']
    r['cites'].update({
        'inq_cav': cite('CA-sn83021205-1863-07-01-p1', 'inq_cav', 'It is ascertained that a large body of federal cavalry have reached Gettysburg, taken possession of the town, and captured quite a number of rebels.', 'inq_cav',
                        witness='Worcester Daily Spy, Jul 1 1863: a special dispatch to the Philadelphia Inquirer from Baltimore of Jun 30 (also in the Portland Daily Press of Jul 1 and the Daily Evansville Journal of Jul 1); the text layer reads iederal and lebels'),
        'tim_date': cite('CA-sn83021205-1863-07-02-p1', 'tim_date', 'Headquarters Army of the Potomac, Tuesday, 8 P. M.\u2014I am just in from the front, and send by a messenger to Frederick a brief dispatch of the occurrences of yesterday and today.', 'tim_date',
                         witness='Worcester Daily Spy, Jul 2 1863: the head of the special dispatch of the New York Times that follows (Tuesday is Jun 30); the text layer reads Tues day, Bp. m. and dis patch'),
        'tim_buf': cite('CA-sn83021205-1863-07-02-p1', 'tim_hanover', 'During the day, Gen. Buford drove a regiment of rebel infantry out of Gettysburg, who also retired in a north-easterly direction.', 'tim_hanover',
                        witness='Worcester Daily Spy, Jul 2 1863: a special dispatch to the Times from the headquarters of the Army of the Potomac, dated 8 o\'clock of the evening of Jun 30 (the Daily National Intelligencer prints northeasterly, the Portland Daily Press and the Ellsworth American northwesterly, the Burlington Weekly Hawk-Eye easterly: text layers)'),
    })
    sub_add(r, 'The press of Jun 30-Jul 1: a large body of Federal cavalry reached Gettysburg, took possession of the town and captured quite a number of rebels (Philadelphia Inquirer special of Jun 30); Gen. Buford drove a regiment of rebel infantry out of Gettysburg, who retired in a north-easterly direction (New York Times special of Jun 30; north-westerly and easterly in other printings, text layers): the prisoners and the direction conflict with Buford\'s report and Jacobs (the enemy withdrew toward Cashtown, west)',
            'documented', 'conflict', ['inq_cav', 'tim_buf', 'tim_date'])
    r['scenarios'].append(sc('G', 'Buford\'s cavalry take possession of the town and capture quite a number of rebels; a regiment of rebel infantry is driven out and retires north-easterly',
                             'Philadelphia Inquirer special of Jun 30 and New York Times special of Jun 30 as printed in the Worcester Daily Spy of Jul 1 and Jul 2 (page images); the other printings of the Times special differ (north-westerly in the Portland Daily Press and the Ellsworth American, easterly in the Burlington Weekly Hawk-Eye; text layers); no default', 'documented', ['inq_cav', 'tim_buf']))
    r.setdefault('searched', []).append(S5 + 'Buford with 2,000-4,000, men, cavalry, Gettysburg and Jun 30 in the newspaper pages of Jun 30 - Jul 5 (15 windows): the two reports above; no strength of the division and no vedettes in any page')

    # ------------------------------------------------------------------------------------------------------------------ T1-046
    r = by['T1-046']
    r['cites'].update({
        'whig_9': cite('CA-sn84024669-1863-07-07-p2', 'whig_9', 'They advanced on Tuesday to Hanover, at 9 o\'clock, charged on the rear and advance of Gen. Pleasonton\'s cavalry, composed of the 5th New York, 1st Vermont, 1st Virginia and 18th Pennsylvania—1,800 in all.', 'whig_9',
                       witness='Richmond Whig, Jul 7 1863: Captain McIrvin\'s report (see T1-044); the sentence goes on: Then entering the town, the battle raged furiously all day'),
        'whig_35': cite('CA-sn84024669-1863-07-07-p2', 'whig_35', 'Gen. Stuart admits a loss of 35 killed. A large number were wounded, and the entire First South Carolina Cavalry captured. Our prisoners were sent to the rear about 4 o\'clock P. M., but they heard heavy artillery firing until 7½.', 'whig_35',
                        witness='Richmond Whig, Jul 7 1863: the same report; the text layer reads nuiu her wers, eutue, 4 oV.ock and 74'),
        'tim_date': cite('CA-sn83021205-1863-07-02-p1', 'tim_date', 'Headquarters Army of the Potomac, Tuesday, 8 P. M.\u2014I am just in from the front, and send by a messenger to Frederick a brief dispatch of the occurrences of yesterday and today.', 'tim_date',
                         witness='Worcester Daily Spy, Jul 2 1863: the head of the special dispatch of the New York Times that follows (Tuesday is Jun 30); the text layer reads Tues day, Bp. m. and dis patch'),
        'tim_fore': cite('CA-sn83021205-1863-07-02-p1', 'tim_hanover', 'During the forenoon, Gens. Kilpatrick and Custer drove Stuart out of Hanover, after a splendid fight, and are still pursuing him', 'tim_hanover',
                         witness='Worcester Daily Spy, Jul 2 1863: a special dispatch to the Times dated 8 o\'clock of the evening of Jun 30 (the Daily National Intelligencer, the Portland Daily Press and other papers of Jul 1-3 print it too, "During the forenoon"); the text layer reads Castar'),
    })
    sub_add(r, 'Captain McIrvin (Richmond Whig, Jul 7): after the advance to Hanover at 9 o\'clock the battle raged furiously all day, charging and recharging; the prisoners were sent to the rear about 4 p.m. and heard heavy artillery firing until 7½; Stuart admitted a loss of 35 killed, a large number wounded and the entire First South Carolina Cavalry captured; against Kilpatrick\'s fight of about two hours',
            'documented', 'conflict', ['whig_9', 'whig_35'])
    sub_add(r, 'A special dispatch to the New York Times of 8 o\'clock on the evening of Jun 30 (printed in the papers of Jul 1-3): during the forenoon Gens. Kilpatrick and Custer drove Stuart out of Hanover after a splendid fight and were still pursuing him',
            'documented', 'conflict', ['tim_fore', 'tim_date'])
    scen_extend(r, 'D', '; Captain McIrvin\'s report (Richmond Whig of Jul 7 p.2, page image): the battle raged furiously all day and the prisoners heard heavy artillery firing until 7½ (printed as a small fraction)', 'whig_9', 'whig_35')
    r['scenarios'].append(sc('E', 'The fight is over in the forenoon: Kilpatrick and Custer drove Stuart out of Hanover during the forenoon after a splendid fight',
                             'Times special of Jun 30 8 p.m. as printed in the Worcester Daily Spy of Jul 2 1863 p.1 (page image) and other papers; against Kilpatrick\'s two hours from about 10 a.m. to about noon (scenario A) and the fights of the afternoon in B to D; no default', 'documented', ['tim_fore', 'tim_date']))
    r.setdefault('searched', []).append(S5 + 'Hanover with Stuart, Kilpatrick, Custer, hours and losses in the newspaper pages of Jun 30 - Jul 10: Captain McIrvin\'s report (all day until 7½) and the Times special (forenoon); the Forney farm is in none of the pages')

    # ------------------------------------------------------------------------------------------------------------------ T1-051
    r = by['T1-051']
    r['cites'].update({
        'ei_flag': cite('CA-sn83045462-1863-07-02-p1', 'ei_flag', 'Official advices from the Army of the Potomac state that a portion of our cavalry, under Gen. Kilpatrick, had a handsome fight yesterday with the enemy\'s cavalry at Hanover. He captured a battle-flag, a lieutenant colonel, one captain and forty-five privates. Fifteen or twenty of the enemy were killed.', 'ei_flag',
                        witness='Evening Star, Jul 2 1863 p.1: official advices of Jul 1 from the Army of the Potomac (the Chicago Daily Tribune, the Portland Daily Press and the Daily Green Mountain Freeman print 45, the Daily National Intelligencer forty and the Worcester Daily Spy 44: text layers, not viewed on the image); the text layer of this page reads forty-live and Filteen'),
        'ei_400': cite('CA-sn83045462-1863-07-02-p1', 'ei_400', 'took place yesterday afternoon at Hanover Junction between Pleasanton and the rebel cavalry. It lasted nearly the whole afternoon, and the result was the enemy lost 400 in killed, wounded and prisoners, besides six pieces of artillery. Our loss is reported at 200', 'ei_400',
                       witness='Evening Star, Jul 2 1863 p.1: a Harrisburg dispatch of Jul 1, 9.30 p.m. (it says Hanover Junction and means Hanover); the text layer reads Haiiover, Ple&santon, ftii my and t>esides'),
        'whig_35': cite('CA-sn84024669-1863-07-07-p2', 'whig_35', 'Gen. Stuart admits a loss of 35 killed. A large number were wounded, and the entire First South Carolina Cavalry captured.', 'whig_35',
                        witness='Richmond Whig, Jul 7 1863: Captain McIrvin\'s report (see T1-044)'),
    })
    sub_add(r, 'Hanover-only losses as the press reported them, none of them from Stuart\'s report: the enemy lost 400 in killed, wounded and prisoners besides six pieces of artillery and our loss is reported at 200 (Harrisburg dispatch of Jul 1); a battle-flag, a lieutenant colonel, one captain and forty-five privates captured and fifteen or twenty of the enemy killed (official advices of Jul 1; forty privates in the Daily National Intelligencer); Stuart admits a loss of 35 killed, a large number wounded and the entire First South Carolina Cavalry captured (Captain McIrvin, Richmond Whig, Jul 7)',
            'documented', 'conflict', ['ei_flag', 'ei_400', 'whig_35'])
    r['scenarios'].append(sc('G', 'Confederate loss at Hanover as reported in the press of Jul 1-7: 400 killed, wounded and prisoners and six guns; or a battle-flag, a lieutenant colonel, a captain, 45 privates captured and 15 or 20 killed; or 35 killed admitted by Stuart',
                             'Evening Star of Jul 2 1863 p.1 (page images) and Richmond Whig of Jul 7 1863 p.2 (page image); against the casualty tables of the Official Records (scenarios A to F); no default', 'documented', ['ei_flag', 'ei_400', 'whig_35']))
    r.setdefault('searched', []).append(S5 + 'Hanover with killed, wounded, missing, captured and prisoners in the newspaper pages of Jun 30 - Jul 10: three press values for the Confederate loss; a Hanover-only figure of Stuart himself is in none of the pages')

    # ------------------------------------------------------------------------------------------------------------------ T1-019
    r = by['T1-019']
    r['cites']['sun_rain'] = cite('CA-sn85026213-1863-06-28-p1', 'sun_rain', 'There has been a considerable quantity of rain within the past few days, which will have the effect of making the roads, wherever an army passes over them, very heavy', 'sun_rain',
                                  witness='Sunday Dispatch (New York), Jun 28 1863: a Washington dispatch of Jun 27; the text layer reads fleet and oyer')
    sub_add(r, 'A Washington dispatch of Jun 27 (Sunday Dispatch, New York, Jun 28): "There has been a considerable quantity of rain within the past few days, which will have the effect of making the roads, wherever an army passes over them, very heavy": a regional statement for the ground of Jun 27, with no hour for the end of the rain and no temperature',
            'inferred', 'supported', ['sun_rain'])
    r.setdefault('searched', []).append(S5 + 'rain, mud and weather words in the newspaper pages of Jun 27 - Jul 3 (327 windows): the Washington dispatch of Jun 27 above; no hour at which the rain ended at Gettysburg and no temperature')

    # ------------------------------------------------------------------------------------------------------------------ T1-020
    r = by['T1-020']
    r['cites'].update({
        'dnl_rail': cite('CA-sn83026172-1863-06-29-p3', 'dnl_rail', 'Harrisburg, June 27, 5 P. M.\u2014The rebel column, under Gen Early, which was at Gettysburg yesterday, reached the Northern Central railroad a few minutes after twelve to-day, at a point between York and Hanover Junction. The wires were cut,', 'dnl_rail',
                         witness='Daily National Intelligencer, Jun 29 1863: a Harrisburg dispatch of Jun 27, 5 p.m.; the text layer reads HIARISNURG and Junc tion (the page image of the dateline line and of the hour line was viewed)'),
        'cht_rail': cite('CA-sn84031490-1863-06-29-p1', 'cht_rail', 'Harrisburg, June 27\u20146 P. M.\u2014The rebel columns, under General Early, which were at Gettysburg yesterday, reached the Northern Central Railroad, about ten o\'clock to-day, at a point between York and Hanover Junction', 'cht_rail',
                         witness='Chicago Daily Tribune, Jun 29 1863: the same dispatch with the dateline 6 p.m. and the hour ten; the text layer reads Habkbbceo, fi P. M. and TorkandHanovcr'),
    })
    sub_add(r, 'A Harrisburg dispatch of Jun 27 says that the rebel column under Early that was at Gettysburg yesterday reached the Northern Central railroad at a point between York and Hanover Junction a few minutes after twelve to-day (Daily National Intelligencer, Jun 29, dateline 5 p.m.) or about ten o\'clock to-day (Chicago Daily Tribune, Jun 29, dateline 6 p.m.) and that the wires were cut: a report of the Jun 27 march, naming Early\'s column where Early\'s report names White\'s cavalry (sub-claim 5), with an hour that differs between the printings. Carried with no default',
            'documented', 'conflict', ['dnl_rail', 'cht_rail'])
    r['scenarios'].append(sc('E', 'The column that was at Gettysburg on Jun 26 reaches the Northern Central railroad between York and Hanover Junction about noon of Jun 27 (a few minutes after twelve) and cuts the wires',
                             'Harrisburg dispatch of Jun 27, 5 p.m., Daily National Intelligencer of Jun 29 p.3 (page image); the Chicago Daily Tribune of Jun 29 p.1 has about ten o\'clock (page image); no default', 'documented', ['dnl_rail']))
    r['scenarios'].append(sc('F', 'The column that was at Gettysburg on Jun 26 reaches the Northern Central railroad between York and Hanover Junction about ten o\'clock of Jun 27 and cuts the wires',
                             'Harrisburg dispatch of Jun 27, 6 p.m., Chicago Daily Tribune of Jun 29 p.1 (page image); against a few minutes after twelve in the Daily National Intelligencer; no default', 'documented', ['cht_rail']))
    r.setdefault('searched', []).append(S5 + 'flagstaff, flagpole, liberty pole, cut down and chopped down with Gettysburg in the pages of Jun 26 - Jul 12 (17 windows, none about Gettysburg); Early, Gordon and the railroad on Jun 27: the Harrisburg dispatch above (eight printings)')

    # ------------------------------------------------------------------------------------------------------------------ T1-032
    r = by['T1-032']
    r['cites']['dnl_york'] = cite('CA-sn83026172-1863-06-29-p3', 'dnl_york', 'Harrisburg, June 27 \u2014 The rebels occupied York at five o\'clock this evening. No resistance was made by our troops.', 'dnl_york',
                                   witness='Daily National Intelligencer, Jun 29 1863: a Harrisburg dispatch of Jun 27 under the head York occupied by the enemy; the text layer reads at ) five and the first letters of five are cut by the crop edge of the page image')
    sub_add(r, 'A Harrisburg dispatch of Jun 27 says that the rebels occupied York at five o\'clock that evening (Jun 27) and that no resistance was made by our troops: a day earlier than Early\'s report (Gordon in the morning of Jun 28) and Jacobs (Jun 28). Carried with no default',
            'documented', 'conflict', ['dnl_york', 'early_28', 'jac_york'])
    r['scenarios'].append(sc('C', 'The rebels occupy York at five o\'clock in the evening of Jun 27, without resistance (Harrisburg dispatch of Jun 27)',
                             'Daily National Intelligencer of Jun 29 1863 p.3 (page image); against Gordon\'s entry in the morning of Jun 28 in Early\'s report and in Jacobs and the occupation on Jun 29 of the seed; no default', 'documented', ['dnl_york']))
    r.setdefault('searched', []).append(S5 + 'York with occupied, entered and Early in the pages of Jun 27 - Jul 3: a dispatch of Jun 27 with the occupation at five o\'clock that evening')

    # ------------------------------------------------------------------------------------------------------------------ T1-049
    r = by['T1-049']
    r['cites']['habs_cupola'] = L('NPS-HABS-pa0007', Q['habs_cupola'], page='2',
        page_basis='data page 2 of the 2-page PDF of the record (the marker === PAGE 2 === of the text file; the page carries the title of the survey sheet HABS No. PA-359); the text layer has no printed page number and the generic head rule would read the page of the book it cites (p. 36) as a head',
        reading='Cupola used as post of observation by Union Generals Buford and Reynolds, July 1, 1863. Building used as a hospital for Confederate wounded for several weeks after the battle.',
        image_check='page image of the data page (acquired_tl01.json, item NPS-HABS-pa0007.pdf; PDF page 2 rendered at 90 dpi and viewed in the fifth start of the close-out) reads, under Additional Data: "Cupola used as post of observation by Union Generals Buford and Reynolds, July 1, 1863. Building used as a hospital for Confederate wounded for several weeks after the battle. Leased in 1958 by the Adams County Historical Society for 39-year period." signed Frederick Tilberg, Senior Historian, Gettysburg National Military Park, March 21, 1966',
        note='Historic American Buildings Survey record HABS PA-359, Lutheran Theological Seminary, Main Building (Library of Congress item pa0007; National Park Service documentation, a government work); a statement of a park historian of 1966, not a text of 1863')
    sub_add(r, 'Historic American Buildings Survey record HABS PA-359 (Frederick Tilberg, Senior Historian of the Gettysburg National Military Park, March 21 1966) says of the Lutheran Theological Seminary Main Building: "Cupola used as post of observation by Union Generals Buford and Reynolds, July 1, 1863": the Seminary building again (scenario B), on Jul 1 and with Reynolds, where the 2021 report and Norton have Jun 30',
            'documented', 'conflict', ['habs_cupola'])
    scen_extend(r, 'B', '; Historic American Buildings Survey record HABS PA-359 of 1966 (the cupola of the Seminary Main Building used as a post of observation by Buford and Reynolds, July 1, 1863: page image viewed)', 'habs_cupola')
    r.setdefault('searched', []).append(S5 + 'cupola, steeple, belfry, signal and observation with Buford, Reynolds and the college or the seminary in the National Park Service texts (acquired_3.json, now 275 items): the HABS record PA-359 of the Seminary Main Building (fetched 2026-11-15 23:43 UTC by the web-evidence workstream)')

    # ------------------------------------------------------------------------------------------------------------------ T1-040
    r = by['T1-040']
    r.setdefault('searched', []).append(S5 + 'camp-fire, bivouac and lights with Emmitsburg, Taneytown, Westminster, Uniontown, Middleburg, Frederick, Gettysburg, Cashtown, Marsh Creek, Littlestown and Hanover in the newspaper pages of Jun 30 - Jul 10 (45 windows, 43 distinct passages): none about the night of Jun 29 or Jun 30; the open gap stays')

    # ------------------------------------------------------------------------------------------------------------------ register entries: competing values and remains
    def competing(rid, more):
        rg = by[rid].get('register')
        if rg:
            c = rg.get('competing') or '-'
            rg['competing'] = more if c in ('-', '') else c + '; ' + more
    competing('T1-010', 'about 40 taken (dispatch of Jun 27) against about 300 lost in prisoners and stragglers (dispatch of Jun 28); "seven or eight hundred" strong force against 150 to 200 cavalry')
    competing('T1-012', 'also 126 (New York Herald), 100 arrived at Carlisle (Evening Star), about 300 lost in prisoners and stragglers (Evening Star)')
    competing('T1-014', 'first entry at noon on Jun 25, cavalry fully 1,000 strong (Baltimore American of Jun 26) against about 15:00 on Jun 26 (Jacobs, Compiler, county history, Bulletin special); 13 or 16 freight cars (Bulletin special, two printings)')
    competing('T1-015', '13 freight cars (Evening Star, Daily National Intelligencer) against 16 (Chicago Daily Tribune): printings of one dispatch of Jun 27; the cars of the Pennsylvania Central or of the Northern and Pennsylvania Central railroads')
    competing('T1-017', 'camp on Wolf\'s farm a mile and a half this side of the town (Evening Star, Daily National Intelligencer) or half a mile (Chicago Daily Tribune) against Hays about a mile from the town and the rest near Mummasburg (Early)')
    competing('T1-045', 'Buford takes possession and captures quite a number of rebels and drives a regiment of infantry out to the north-east (press of Jun 30) against the enemy within half a mile and pushed back toward Cashtown (Buford, Jacobs)')
    competing('T1-046', 'a fight in the forenoon (Times special of Jun 30); all day until 7\u00bd p.m. (Captain McIrvin)')
    competing('T1-051', 'press values of the Confederate loss: 400 and six guns / 45 privates and 15 or 20 killed / 35 killed admitted by Stuart')
    def recon_add(rid, more):
        rg = by[rid].get('register')
        if rg:
            c = rg.get('recon') or '-'
            rg['recon'] = more if c in ('-', '') else c.rstrip(' .') + '; ' + more
    recon_add('T1-003', 'regional statements of the fifth start (tier inferred, none for Gettysburg): rain from about 2 p.m. on Jun 25 through the night and still raining on Jun 26 (Maryland Heights letter), eighteen hours of rain at Harrisburg on Jun 26, a cool day with deep soft mud and constant rain for the Twelfth Corps on Jun 26; no temperature')
    recon_add('T1-019', 'a Washington dispatch of Jun 27 (tier inferred, regional): considerable rain within the past few days, the roads very heavy; no hour for the end of the rain and no temperature')
    r = by['T1-018']
    r['remains'] = [x.replace('picket posts by name and place', 'picket posts by name and place other than the one near Oxford') if isinstance(x, str) else x for x in r['remains']]
