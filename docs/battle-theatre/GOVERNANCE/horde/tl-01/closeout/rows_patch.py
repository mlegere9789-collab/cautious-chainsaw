"""Fourth start of the close-out of shard tl-01 (2026-11-15): the additions that the texts saved after the earlier passes allow.

build.py applies apply(rows) to the row data of rows_a.py, rows_b.py and rows_c.py before it re-matches every quote. Nothing here lowers a tier without a
passage: a sub-claim is promoted only where a passage that supports exactly it was matched in the local text, and every conflict between the values of
different sources is carried as a scenario. The texts: the 1886 county history and Hoke (1887) (extra_sources.py), pages of 1863 newspapers
(Chronicling America, as saved by the web-evidence workstream; digits and hours read on the page image where the text layer could be wrong), the National
Park Service reports of 2021 and the study of the McPherson farm. Delegated decisions DD-TL01-11 to DD-TL01-13.
The quotes below were cut from the text with the builder's own normalisation (tmp/tl-01/run3/mkquotes.py of the run) and are re-matched on every build."""
from rowlib import *

QUOTES = {
    'cht_140': 'The rebels captured a train of 110 wagons near Rockville, Md.',
    'hist_10': "By ten o'clock the next day the rear of their army had moved out and were pursuing their way toward the east.",
    'hist_1030': "June 30, at half past ten o'clock in the morning, Buford passed through Gettysburg upon a reconnoisance in force",
    'hist_3pm': "the advance g^ard of the rebels, 200 strong, galloped into Gettysburg about 3 o' clock on the afternoon of the 26th,",
    'hist_735': 'On the 24th a regiment of Pennsylvania Volunteer MUitia, numbering 735 men, of which Company A was nearly entirely students from Pennsylvania College, had been started from Harrisburg and Carlisle to Gettysburg.',
    'hist_guards': 'Guards were posted about the public buildings and some of the stores, and a few, but very few, private houses.',
    'hist_sent': "Jennings and his command were sent out on the Chambersburg Turnpike on the morning of the 26th. When they met the rebels, in the afternoon, the enemy captured nearly all of Jenning's advance guard — about forty men",
    'hist_sidewalks': 'When permitted to stack arms, or put themselves at rest, they lay down on the sidewalks and in the streets with their knapsacks under their heads.',
    'hist_thu': 'Col. Jennings and his command had reached this place on Thursday',
    'hoke_arrive': "In the afternoon of this day Early's division reached Gettysburg",
    'hoke_buford': 'General Buford in command of a division of Federal cavalry passed through Gettysburg in the afternoon of the day (Tuesday)',
    'hoke_burn': 'While on their way across the mountain they burned the Caledonia Iron Works, which belonged to Hon. Thaddeus Stevens. These works were situated about two miles east of Greenwood, at the base of the South Mountain, and about ten miles from Chambersburg.',
    'hoke_date': "In the morning of this day — Friday, 26th, — Early's division left its camp at Greenwood, where it had remained",
    'hoke_ewell': 'These wagons proved to be part of EwelPs train',
    'hoke_fires': "The line of the railroad could be traced by the numerous fires still burning. The sound of the drum was heard in the direction of Pickett's Camp. Along the South Mountain, for miles up and down the valley, innumerable lights were seen.",
    'hoke_nocol': 'No column of our troops was sent to burn the iron works of Thaddeus Stevens',
    'hoke_order': 'they were burned by my order, and on my own responsibility.',
    'hoke_pettig': "About half past nine o'clock in the morning a detachment from Ileth's division under General Pettigrew left their encampment at Cashtown and advanced upon a reconnoisance to within about one mile of Gettysburg. They had with them a number of wagons, and it was supposed",
    'hoke_pettig2': 'Approaching the town, this detachment halted, and after a careful observation Ly the officers, through their Held -glasses, they withdrew and encamped at Marsh Creek.',
    'hoke_pike': 'turning east at the Public Square, drove on out the Gettysburg pike. Although these wagons were heavily loaded, as the grinding noise they made indicated, they were sometimes driven at a trot.',
    'hoke_road': 'I found the iron works above mentioned on the road aforesaid, where it begins to ascend the South Mountain',
    'hoke_rumble': 'A low, rumbling noise could be heard which sounded strange in the stillness of Cthe night, as if the whole valley were filled with moving trains.',
    'hoke_steeple': 'In the evening of this day — Monday, June 29th, — some time after dark, in company with two of our citizens, I went up into the steeple of the Reformed Church to take observations.',
    'hoke_stream': 'we saw a continuous stream of wagons driven hurriedly through our street.',
    'hoke_time': "probably about one or two o'clock, I was awakened",
    'hoke_union1': "At night the head of Stuart's column rested at Union Mills, half way between Westminster and Littlestown.",
    'hoke_union2': 'Stuart, who had bivouacked over night at Union Mills, midway between Westminster and Littlestown,',
    'nps_clr_schm': 'Schmucker Hall or Old Dorm (1832), the original seminary building with its cupola that served as a Union signal station',
    'nps_clr_sem': 'Arriving on June 30, General Buford used the cupola of the Seminary building as a signal station while his cavalry division encamped at the McPherson Farm',
    'press_9': 'The Press has the following: Columbia, Pa., Julyl.—TheSthNewYork, Ist Vermont, Ist Virginia and 18th Pcnnsyl vania cavalry regiments left Frederick, Md., on Saturday, moved forward to Hanover, and arrived there Tuesday morning, when they were charged upon In the rear by Stuart’s reb el cavalry, about six thousand strong. The National forces numbered 1,800. The battle commenced at 9 a. m., and continued until 7 in the evening.',
    'slentz_aff': "G e n l B u f o r d ' s com mand o c c u p i e d t h e p l a c e u n t i l 1 0 am n e x t d a y , t h e y c u t a n d t h r e w dow n a b o u t \\ m i l e p o s t an d r a i l f e n c e t o m ake w ay f o r t h e b a t t l e .",
    'slentz_pet': "B u f o r d ' s C a v a l r y who e n cam p e d on i t J u n e 3 0 1 8 6 3",
    'spy_14mi': 'Gregg, at Caledonia iron works, fourteen miles west of Gettysburg',
    'spy_iron': 'Hon. Thad. Stevens’ iron mills near Get tysburg have been destroyed by the rebels. His loss is about',
    'star_camp': 'The Rebel troops, forty-five hundred strong',
    'star_fri': 'The place was occupied on triday afternoon last by tour thousand five hundred Rebels under command o! General Early; they had with them twenty i pieces ot light artillery.',
    'star_furn': "At Stevens' Furnace, which, by the way. belongs to Hon. Thaddens .steven?; the rebels burned everything, and what ceuld not be burned was destroyed.",
    'star_left': 'The next morning after the occupation the rebels eft Gettysburg after stealing "very! thing they could lay their hands on. Thev* pursued their way lor Y\'ork by way of Har over.',
    'tri_175': 'Of the 170 wagons they captured near Rockville',
    'wni_fri': 'regi ment lefc Harrisburg on Thursday for Gettysburg. On Friday morning the regiment went to Gettysburg.',
}

IMG = {
    'star_stevens': 'page-image crop of the Evening Star page 2 (acquired_tl01.json, item ca-star-0701-stevens; viewed in the fourth start of the close-out) reads: "At Stevens\' Furnace, which, by the way, belongs to Hon. Thaddeus Stevens, the rebels burned everything, and what could not be burned was destroyed."',
    'star_fri': 'page-image crop of the Evening Star page 2 (acquired_tl01.json, item ca-star-0701-occupied) reads: "The place was occupied on Friday afternoon last by four thousand five hundred Rebels under command of General Early; they had with them twenty pieces of light artillery."',
    'star_left': 'page-image crop of the Evening Star page 2 (acquired_tl01.json, item ca-star-0701-left) reads: "The next morning after the occupation the rebels left Gettysburg, after stealing everything they could lay their hands on. They pursued their way for York by way of Hanover. They left no troops whatever at Gettysburg, and the same force occupied York."',
    'star_camp': 'page-image crop of the Evening Star page 2 (acquired_tl01.json, item ca-star-0701-camp) reads: "The Rebel troops, forty-five hundred strong, encamped about one miles [sic] from Gettysburg that night."',
    'spy_iron': 'page-image crop of the Worcester Daily Spy page 1 (acquired_tl01.json, item ca-spy-0702-stevens) reads: "Hon. Thad. Stevens\' iron mills near Gettysburg have been destroyed by the rebels. His loss is about $100,000."',
    'wni': 'page-image crop of the Weekly National Intelligencer page 3 (acquired_tl01.json, item ca-wni-0702-jennings) reads: "HANOVER JUNCTION, JUNE 27.-Col. Jennings\'s regi[ment] left Harrisburg on Thursday for Gettysburg. On [Friday] morning the regiment went to Gettysburg. The Philadelphia city troops and another cavalry company preceded them."; the word Friday is cut by the crop edge (its last letter y is on the line start)',
    'cht140': 'page-image crop of the Chicago Daily Tribune page 1 (acquired_tl01.json, item ca-cht-0629-140) reads, enlarged four times: "captured a train of 140 wagons"; the text layer prints 110',
    'tri175': 'page-image crop of the New-York Daily Tribune page 1 (acquired_tl01.json, item ca-tri-0701-175) reads, enlarged four times: "Of the 175 wagons they"; the text layer prints 170',
    'spy_14mi': 'page-image crop of the Worcester Daily Spy page 1 (acquired_tl01.json, item ca-spy-0708-gregg) reads: "A dispatch from Gen. Gregg, at Caledonia iron works, fourteen miles west of Gettysburg, at 4 A. M. to-day, says the rebels have turned to"',
    'press9': 'page-image crop of the Chicago Daily Tribune page 1 (acquired_tl01.json, item ca-cht-0703-press) reads: "...el cavalry, about six thousand strong. The National forces numbered 1,800. The battle commenced at 9 a. m., and continued until 7 in the evening."',
}

PB_HIST_154 = 'running head "154 HISTORY OF ADAMS COUNTY." before the passage and "HISTORY OF ADAMS COUNTY. 155" after it (a short line of the page that ends in the number 735 is not a head and is ignored by hand)'

def LH(quote, page=None, **kw):
    """History of Cumberland and Adams Counties 1886, Adams County part, page 154 (the passage lies between the heads of pages 154 and 155)"""
    if page == '154':
        return L('HISTORY-ADAMS-1886', quote, page='154', page_basis=PB_HIST_154, **kw)
    return L('HISTORY-ADAMS-1886', quote, **kw)

def CA(sid, quote, reading=None, image=None, **kw):
    d = dict(kw)
    if reading: d['reading'] = reading
    if image: d['image_check'] = image
    return L(sid, quote, **d)

def _by(rows):
    return {r['id']: r for r in rows}

def sub_append(r, n, text, *keys, tier=None, support=None):
    s = list(r['subs'][n - 1])
    s[0] = s[0].rstrip().rstrip('.') + text
    s[3] = list(s[3]) + [k for k in keys if k not in s[3]]
    if tier: s[1] = tier
    if support: s[2] = support
    r['subs'][n - 1] = tuple(s)

def sub_set(r, n, claim, tier, support, keys, note=None):
    r['subs'][n - 1] = (claim, tier, support, list(keys)) + ((note,) if note else ())

def sub_add(r, claim, tier, support, keys, note=None):
    r['subs'].append((claim, tier, support, list(keys)) + ((note,) if note else ()))

def scen(r, sid):
    for s in r['scenarios']:
        if s['id'] == sid: return s
    raise KeyError(sid)

def scen_extend(r, sid, basis_add=None, *keys):
    s = scen(r, sid)
    if basis_add: s['basis'] = s['basis'].rstrip(' .') + basis_add
    s['cites'] = list(s['cites']) + [k for k in keys if k not in s['cites']]

def apply(rows):
    by = _by(rows)
    Q = QUOTES
    SRCH4 = 'fourth start of the close-out, 2026-11-15, texts that were not local when the earlier passes searched: '

    # ------------------------------------------------------------------------------------------------------------------ T1-005
    r = by['T1-005']
    r['cites'].update({
        'hoke_date': L('HOKE-1887', Q['hoke_date'], note='the sentence continues on p.170 after the running head: "over the previous day"'),
        'hoke_road': L('HOKE-1887', Q['hoke_road'], note="General Early's letter of May 7th, 1886, printed by Hoke in a footnote"),
        'hoke_arrive': L('HOKE-1887', Q['hoke_arrive']),
        'hoke_burn': L('HOKE-1887', Q['hoke_burn']),
        'hoke_order': L('HOKE-1887', Q['hoke_order'], note="General Early's letter of May 7th, 1886 to Prof. J. Fraise Richard, printed by Hoke in a footnote of his book of 1887"),
        'hoke_nocol': L('HOKE-1887', Q['hoke_nocol'], note="the same letter of General Early of May 7th, 1886"),
        'star_furn': CA('CA-sn83045462-1863-07-01-p2', Q['star_furn'], reading="At Stevens' Furnace, which, by the way, belongs to Hon. Thaddeus Stevens, the rebels burned everything, and what could not be burned was destroyed.", image=IMG['star_stevens'],
                        witness='Evening Star (Washington), Jul 1 1863: a Philadelphia Inquirer correspondent at Harrisburg, Jun 30, reporting an informant who passed the works on the road from Gettysburg toward Chambersburg after the rebels had left'),
        'spy_14mi': CA('CA-sn83021205-1863-07-08-p1', Q['spy_14mi'], reading='A dispatch from Gen. Gregg, at Caledonia iron works, fourteen miles west of Gettysburg, at 4 A. M. to-day', image=IMG['spy_14mi'], witness='Worcester Daily Spy, Jul 8 1863: a dispatch from Gettysburg, Jul 6, quoting General Gregg at the Caledonia iron works (the skirmish of Jul 5-6); the distance is the dispatch\'s'),
        'spy_iron': CA('CA-sn83021205-1863-07-02-p1', Q['spy_iron'], reading="Hon. Thad. Stevens' iron mills near Gettysburg have been destroyed by the rebels. His loss is about $100,000.", image=IMG['spy_iron'],
                       witness='Worcester Daily Spy, Jul 2 1863: a short telegraphic paragraph with no source named; "iron mills near Gettysburg" is the paper\'s own wording for the works'),
    })
    sub_append(r, 1, '; the Evening Star of Jul 1 1863 (an informant who passed the works) and the Worcester Daily Spy of Jul 2 1863 report the destruction, the Spy with a loss of about $100,000', 'star_furn', 'spy_iron')
    sub_set(r, 5, "Place: the works lay about 15 miles west of Gettysburg (Adams Sentinel, Jul 21 1863) and, by Hoke (1887), at the base of the South Mountain about two miles east of Greenwood and about ten miles from Chambersburg",
            'documented', 'supported', ['sen_where', 'hoke_burn', 'spy_14mi'])
    sub_append(r, 5, '; a dispatch quoting General Gregg of Jul 6 (Worcester Daily Spy, Jul 8 1863) puts the Caledonia iron works fourteen miles west of Gettysburg')
    sub_set(r, 6, "Time of day: after Early's division left its camp at Greenwood in the morning of Friday Jun 26 and before it reached Gettysburg in the afternoon, within about two miles of that camp (the order of events in Hoke 1887); no source gives an hour",
            'inferred', 'supported', ['hoke_date', 'hoke_burn', 'hoke_arrive'])
    sub_add(r, "Early's own letter of 1886 (printed by Hoke): the iron works were burned by his order and on his own responsibility; he also says that no column of troops was sent to burn them (his division found them on its road)",
            'documented', 'supported', ['hoke_order', 'hoke_nocol', 'hoke_road'])
    sub_add(r, "The seed's \"about 2 miles out from camp\" is the distance from Early's camp at Greenwood: Hoke has the works about two miles east of Greenwood and the division in camp at Greenwood on Jun 25 (the identification of the seed's camp with Greenwood is inferred)",
            'inferred', 'supported', ['hoke_burn', 'hoke_date'])
    scen_extend(r, 'A', '; Hoke 1887 pp.169-170 (the division left Greenwood on the morning of Friday Jun 26 and burned the works on its way across the mountain, before it reached Gettysburg in the afternoon)', 'hoke_date', 'hoke_burn')
    r['claim']['text'] = ("The works were burned by the rebels: the Gettysburg Compiler of Jun 29 says on Friday (Jun 26) on their route hitherward; the Adams Sentinel (Jul 21 and Sep 8 1863) puts General Early at the works on Thursday Jun 25 and has Col. French's cavalry apply the torch, the works reduced to ashes. "
                          "Both dates are carried as scenarios, no default. Hoke (1887) agrees with the Compiler on the day: the division left its camp at Greenwood on the morning of Friday Jun 26 and burned the works, about two miles east of Greenwood, on its way across the mountain, before it reached Gettysburg in the afternoon; "
                          "he prints General Early's own letter of 1886: the works were burned by his order and on his own responsibility. The Evening Star (Jul 1) and the Worcester Daily Spy (Jul 2) of 1863 confirm the destruction (the Spy prints a loss of about $100,000). "
                          "NOT documented: the hour of the burning (the order of events in Hoke puts it in the forenoon of Jun 26, inferred) and any construction-schedule detail.")
    r['claim']['marking'] = 'event: documented from newspapers of the time, Hoke (1887) and Early\'s letter; date: two scenarios; time of day: inferred (forenoon, Hoke); hour: gap'
    r['remains'] = ['hour of the burning', 'which date is right (Jun 25 or Jun 26)']
    r['searched'] = list(r['searched']) + [
        SRCH4 + "Hoke, The Great Invasion of 1863 (HOKE-1887, tmp/library/town), pp.169-171 read: the division left Greenwood on the morning of Friday Jun 26, the works about two miles east of Greenwood burned on the way across the mountain, Early's letter of 1886 ('burned by my order'); History of Cumberland and Adams Counties 1886 (HISTORY-ADAMS-1886): regex Stevens.{0,100}(furnace|iron works|forge)|Caledonia (iron|furnace|works): only the later rebuilding of the works, no date or hour",
        SRCH4 + "1863 newspaper pages (tmp/library/web/ca, the pages dated Jun 26 - Aug 31 1863): regex Stevens.{0,80}(furnace|iron works|iron mill|forge)|Caledonia: the dispatches of Jun 30 - Jul 4 repeat the destruction; Evening Star Jul 1 and Worcester Daily Spy Jul 2 cited; none gives the day or the hour",
    ]
    r['register'].update(title='Caledonia iron works: date (Jun 25 or Jun 26) and hour',
        why="Two accounts disagree on the day (Friday Jun 26: Compiler of Jun 29 1863 and Hoke 1887; Thursday Jun 25: Tribune letter and Adams Sentinel); no source gives an hour; no report of the burning from Early's command is in the OR.",
        recon="Burned on Jun 25 or Jun 26 by order of General Early (his letter of 1886), the torch applied by Col. French's cavalry (Sentinel; Hoke); the works about two miles east of Greenwood; forenoon of Jun 26 inferred (Hoke); shown with both scenarios",
        competing='Friday Jun 26 (Compiler, Jun 29; Hoke 1887: forenoon, inferred) / Thursday Jun 25 (Tribune letter and Adams Sentinel) / seed Jun 26 after 08:00')

    # ------------------------------------------------------------------------------------------------------------------ T1-007
    r = by['T1-007']
    r['cites'].update({
        'hist_thu': LH(Q['hist_thu'], '154'),
        'hist_735': LH(Q['hist_735'], '154', note='the number 735 as read in the text layer; it agrees with the 735 of Jacobs 1864 p.13; page image not viewed'),
        'wni_fri': CA('CA-sn83045784-1863-07-02-p3', Q['wni_fri'], reading="Col. Jennings's regiment left Harrisburg on Thursday for Gettysburg. On Friday morning the regiment went to Gettysburg.", image=IMG['wni'],
                      witness='Weekly National Intelligencer, Jul 2 1863: a dispatch dated Hanover Junction, Jun 27 (the Philadelphia Bulletin special, also printed by the Chicago Daily Tribune of Jun 29)'),
    })
    sub_append(r, 2, '; a dispatch of Jun 27 from Hanover Junction (Weekly National Intelligencer, Jul 2 1863): the regiment left Harrisburg on Thursday and on Friday morning went to Gettysburg', 'wni_fri')
    sub_append(r, 3, '; the county history of 1886 has Col. Jennings and his command reached the place on Thursday', 'hist_thu')
    sub_append(r, 4, ' (the county history of 1886 also has 735)', 'hist_735')
    scen_extend(r, 'A', '; a dispatch of Jun 27 from Hanover Junction printed in the Weekly National Intelligencer of Jul 2 1863 (the regiment left Harrisburg on Thursday, on Friday morning went to Gettysburg)', 'wni_fri')
    scen_extend(r, 'B', '; History of Cumberland and Adams Counties 1886 p.154 (Col. Jennings and his command had reached this place on Thursday; written 23 years later)', 'hist_thu')
    r['claim']['text'] = r['claim']['text'].rstrip() + (" The Philadelphia Bulletin dispatch of Jun 27 (printed in the Weekly National Intelligencer of Jul 2 1863) has the regiment leave Harrisburg on Thursday and go to Gettysburg on Friday morning, which agrees with scenario A; "
                          "the county history of 1886 has Col. Jennings and his command reach the place on Thursday (scenario B), the regiment 735 men, sent out on the Chambersburg Turnpike on the morning of the 26th.")
    r['searched'] = list(r['searched']) + [
        SRCH4 + "town books (HISTORY-ADAMS-1886 p.154 read; HOKE-1887 regex Jennings|Twenty-sixth: no hit about the arrival) and 1863 newspaper pages (tmp/library/web/ca, Jun 26 - Jul 12): regex Jennings|Twenty.sixth|26th (Penn|P\\.? ?V|Reg|Mil)|Emergency|Haller|Carnahan|Strickler|Witmer|Marsh Creek: the dispatch of Jun 27 from Hanover Junction (Weekly National Intelligencer Jul 2; Chicago Daily Tribune Jun 29; Indiana State Sentinel Jun 30) cited once; the other hits are the same dispatch or concern other things",
    ]

    # ------------------------------------------------------------------------------------------------------------------ T1-009 and T1-010
    for rid_ in ('T1-009', 'T1-010'):
        r = by[rid_]
        r['cites']['hist_sent'] = LH(Q['hist_sent'], '154')
        sub_append(r, 2, '; the county history of 1886: sent out on the Chambersburg Turnpike on the morning of the 26th, the regiment met the rebels in the afternoon and the enemy captured nearly all of its advance guard, about forty men (it agrees with Jacobs and may rest on him)', 'hist_sent')

    # ------------------------------------------------------------------------------------------------------------------ T1-014
    r = by['T1-014']
    r['cites'].update({
        'hist_3pm': LH(Q['hist_3pm'], '154', note='the number 200 as read in the text layer; page image not viewed'),
        'star_fri': CA('CA-sn83045462-1863-07-01-p2', Q['star_fri'], reading="The place was occupied on Friday afternoon last by four thousand five hundred Rebels under command of General Early; they had with them twenty pieces of light artillery.", image=IMG['star_fri'],
                       witness='Evening Star (Washington), Jul 1 1863: an informant who was in Gettysburg when the rebel troops entered, reported by a Philadelphia Inquirer correspondent at Harrisburg, Jun 30'),
    })
    sub_append(r, 1, '; the county history of 1886 has the advance guard of the rebels, 200 strong, gallop into Gettysburg about 3 o\'clock on the afternoon of the 26th; an informant of the Evening Star of Jul 1 1863 says the place was occupied on Friday afternoon by 4,500 Rebels under General Early with twenty pieces of light artillery', 'hist_3pm', 'star_fri')

    # ------------------------------------------------------------------------------------------------------------------ T1-017
    r = by['T1-017']
    r['cites'].update({
        'hist_sidewalks': LH(Q['hist_sidewalks']),
        'star_camp': CA('CA-sn83045462-1863-07-01-p2', Q['star_camp'], reading='The Rebel troops, forty-five hundred strong, encamped about one miles [sic] from Gettysburg that night.', image=IMG['star_camp'],
                        witness='Evening Star (Washington), Jul 1 1863: an informant who was in Gettysburg when the rebel troops entered; only the first words of the sentence are in the text layer, the rest was read on the page image'),
    })
    sub_append(r, 3, '; the county history of 1886: when permitted to stack arms they lay down on the sidewalks and in the streets', 'hist_sidewalks')
    sub_add(r, 'An informant of the Evening Star (Jul 1 1863) says the Rebel troops, 4,500 strong, encamped about a mile from Gettysburg that night', 'documented', 'supported', ['star_camp'])

    # ------------------------------------------------------------------------------------------------------------------ T1-018
    r = by['T1-018']
    r['cites'].update({
        'hist_guards': LH(Q['hist_guards']),
        'hist_sidewalks': LH(Q['hist_sidewalks']),
    })
    sub_append(r, 1, '; the county history of 1886 adds that guards were posted about the public buildings and some of the stores, and a few, but very few, private houses', 'hist_guards')
    sub_append(r, 2, '; the county history of 1886: when permitted to stack arms they lay down on the sidewalks and in the streets', 'hist_sidewalks')
    r['searched'] = list(r['searched']) + [
        SRCH4 + "History of Cumberland and Adams Counties 1886 (HISTORY-ADAMS-1886) p.153 read: guards about the public buildings and some of the stores, the men lay down on the sidewalks and in the streets (cited); no campfire, no lights in houses, no sentries on prisoners; HOKE-1887 pp.170-172 read: the requisition and the borough's reply of Jun 26, no night scene",
    ]

    # ------------------------------------------------------------------------------------------------------------------ T1-020
    r = by['T1-020']
    r['cites'].update({
        'hist_10': LH(Q['hist_10']),
        'star_left': CA('CA-sn83045462-1863-07-01-p2', Q['star_left'], reading="The next morning after the occupation the rebels left Gettysburg, after stealing everything they could lay their hands on. They pursued their way for York by way of Hanover.", image=IMG['star_left'],
                        witness='Evening Star (Washington), Jul 1 1863: an informant who was in Gettysburg when the rebels entered; the route "by way of Hanover" is his, Early gives East Berlin and Dover for the main body'),
    })
    sub_append(r, 2, '; the county history of 1886 has the rear of their army move out by ten o\'clock the next day (a later hour than the Compiler\'s 8 o\'clock); an informant of the Evening Star (Jul 1 1863): the next morning after the occupation the rebels left Gettysburg for York by way of Hanover', 'hist_10', 'star_left', support='conflict')
    scen_extend(r, 'B', '; Evening Star Jul 1 1863 (the next morning the rebels left Gettysburg for York by way of Hanover)', 'star_left')
    r['scenarios'].append(sc('C', 'The rear of the Confederates had moved out of Gettysburg by ten o\'clock on Jun 27', 'History of Cumberland and Adams Counties 1886 p.155 (written 23 years later; against the Compiler of Jun 29 1863: not a rebel in the town by 8 o\'clock)', 'inferred', ['hist_10']))

    # ------------------------------------------------------------------------------------------------------------------ T1-026
    r = by['T1-026']
    r['cites'].update({
        'cht_140': CA('CA-sn84031490-1863-06-29-p1', Q['cht_140'], reading='... captured a train of 140 wagons ...', image=IMG['cht140'],
                      witness='Chicago Daily Tribune, Jun 29 1863: a Washington dispatch of Sunday Jun 28; other papers print "a train of 150 wagons" in dispatches of the same days'),
        'tri_175': CA('CA-sn83030213-1863-07-01-p1', Q['tri_175'], reading='Of the 175 wagons they ...', image=IMG['tri175'],
                      witness='New-York Daily Tribune, Jul 1 1863, in a report that follows the account of an officer captured by Stuart at Rockville, paroled and returned to Washington; the figure stands in the paper\'s own voice (the sentence continues: the rebels burned only three or four that were upset and broken)'),
    })
    sub_set(r, 4, 'A count of about 140 wagons: the Chicago Daily Tribune of Jun 29 1863 prints "captured a train of 140 wagons" near Rockville (page image; the text layer reads 110)', 'documented', 'supported', ['cht_140'])
    sub_add(r, 'The New-York Daily Tribune of Jul 1 1863, in a report that follows the account of an officer captured by Stuart at Rockville, has 175 wagons captured near Rockville (page image 175, the text layer reads 170)', 'documented', 'supported', ['tri_175'])
    c = scen(r, 'C')
    c.update(value='About 140 wagons (the seed)', basis='Chicago Daily Tribune, Jun 29 1863, p.1 (Washington dispatch of Jun 28; page image 140, the text layer reads 110)', tier='documented', cites=['cht_140'])
    r['scenarios'].append(sc('D', 'About 175 wagons (New-York Daily Tribune, in a report on an officer captured at Rockville)', 'New-York Daily Tribune, Jul 1 1863, p.1 (page image 175, the text layer reads 170)', 'documented', ['tri_175']))
    r['verdict'] = 'corrected'
    r['claim']['event'] = 'Stuart\'s cavalry captures a United States wagon train at Rockville on Jun 28: 125 to 175 wagons by the sources (train about eight miles long)'
    r['claim']['text'] = ("On Jun 28 at Rockville Stuart secured \"more than one hundred and twenty-five\" of the best United States model wagons with their teams, a train eight miles long (Alexander); the 1st Minnesota history says 125 six-mule wagons. "
                          "The Union side of the same day gives 150: Halleck wrote to Meade at 3 p.m. that his train of one hundred and fifty wagons had been captured by Fitzhugh Lee near Rockville, and Meigs wrote at 4.05 p.m. that carelessness had cost 150 wagons and 900 mules captured between Washington and Rockville. "
                          "The Chicago Daily Tribune of Jun 29 1863 prints 140 wagons (the seed value; page image, the text layer reads 110) and the New-York Daily Tribune of Jul 1 1863, in a report that follows the account of an officer captured at Rockville, has 175 (page image; the text layer reads 170). Scenarios carried, no default.")
    r['claim']['marking'] = '125 or more (Stuart), 140 (Chicago Daily Tribune), 150 (Union dispatches) and 175 (New-York Daily Tribune) wagons: documented, carried as scenarios'
    r['remains'] = []
    r['register'] = None
    r['searched'] = list(r['searched']) + [
        SRCH4 + "1863 newspaper pages (tmp/library/web/ca, Jun 27 - Jul 10): regex Rockville.{0,250}(wagons?|train)|(wagons?|train).{0,250}Rockville: 12 windows in 8 pages; counts printed: 100, 110 (text layer, read 140 on the page image), 150 (several papers), 170 (text layer, read 175 on the page image); the 140 and the 175 are cited, the 150 agrees with the Union dispatches already cited",
    ]
    r['recheck'] = r.get('recheck', '') + ' Fourth start of 2026-11-15: the seed value (about 140) is now found in the Chicago Daily Tribune of Jun 29 1863 (page image) and is carried as scenario C; a count of 175 is added as scenario D.'

    # ------------------------------------------------------------------------------------------------------------------ T1-043
    r = by['T1-043']
    r['cites'].update({
        'hoke_pettig': L('HOKE-1887', Q['hoke_pettig'], page='232', page_check=True,
                         page_basis='the head "232 THE GREAT INVASION." (damaged in the text layer: "2o2 TUN GREAT INVASION") before the passage and "POSITION OF THE CONFEDERATES, JUNE 30tH. 233" after it; the generic heads found 231 and 233'),
    })
    sub_add(r, "Hoke (1887): about half past nine o'clock in the morning of Jun 30 a detachment of Heth's division under General Pettigrew left its Cashtown camp and advanced upon a reconnaissance to within about one mile of Gettysburg (Hoke names no source for the hour, which is also the hour of Jacobs's sighting from Gettysburg, row T1-047; the seed's \"first light\" is in no source)",
            'inferred', 'conflict', ['hoke_pettig'])
    r['scenarios'].append(sc('H1', 'Departure from Cashtown at first light (seed)', 'PDF plan text; no source read', 'open gap', []))
    r['scenarios'].append(sc('H2', 'Departure from Cashtown about 09:30 a.m.', 'Hoke 1887 p.232 (a later book that names no source for the hour; may be the hour of the sighting from Gettysburg)', 'inferred', ['hoke_pettig']))
    r['searched'] = list(r['searched']) + [
        SRCH4 + "Hoke 1887 pp.232-233 read (cited): half past nine, within about one mile of Gettysburg, a number of wagons, observation through field-glasses, withdrew and encamped at Marsh Creek; no strength and no withdrawal order",
    ]

    # ------------------------------------------------------------------------------------------------------------------ T1-044
    r = by['T1-044']
    r['cites'].update({
        'press_9': CA('CA-sn84031490-1863-07-03-p1', Q['press_9'], reading='... about six thousand strong. The National forces numbered 1,800. The battle commenced at 9 a. m., and continued until 7 in the evening. (the part of the sentence before "about six thousand strong" is read in the text layer only)',
                      image=IMG['press9'], witness='Chicago Daily Tribune, Jul 3 1863: a Philadelphia Press special dispatch from Columbia, Pa., Jul 1; the same dispatch is in the Springfield Weekly Republican of Jul 4 ("9 o\'clock") and in the New-York Daily Tribune, New York Herald and Daily Evansville Journal of Jul 3'),
    })
    sub_set(r, 5, 'The 18th Pennsylvania rear guard hit Confederate vedettes before 10:00 and so opened the fight (seed): the vedette detail is in no text read; a start about 9 a.m. is in the Philadelphia Press special dispatch (next sub-claim)', 'open gap', 'conflict', [])
    sub_add(r, "A Philadelphia Press special dispatch of Columbia, Pa., Jul 1 (Chicago Daily Tribune, Jul 3 1863): the column arrived at Hanover on Tuesday morning and was charged upon in the rear by Stuart's rebel cavalry; the National forces numbered 1,800; the battle commenced at 9 a. m. and continued until 7 in the evening",
            'documented', 'conflict', ['press_9'])
    c = scen(r, 'C')
    c.update(value='About 9 a.m. (before 10:00): the column was charged in the rear on its arrival and the battle commenced at 9 a. m.', basis='Philadelphia Press special dispatch of Columbia, Pa., Jul 1, printed in the Chicago Daily Tribune of Jul 3 1863 p.1 (page image) and other papers; the seed\'s mechanism (the 18th Pennsylvania rear guard hits vedettes) is in no text read', tier='documented', cites=['press_9'])
    r['claim'].update(event='Hanover opens when Stuart\'s column meets Kilpatrick\'s rear: scenarios (about 9 a.m. / about 10 a.m. / about noon)',
                      when='Jun 30: about 9 a.m. (Philadelphia Press special), about 10 a.m. (Stuart) or about noon (Richmond, Hammond)',
                      basis='Philadelphia Press special in the Chicago Daily Tribune Jul 3 1863 p.1; Stuart OR27-2-R565 p.695; Richmond OR27-1-R362 p.1005; Hammond OR27-1-R363 p.1008; Kilpatrick OR27-1-R359 pp.986-987',
                      start='1863-06-30T09:00')
    r['claim']['text'] = r['claim']['text'].replace('The seed time (before 10:00) is earlier than every value in the OR.', 'The seed time (before 10:00) is earlier than every value in the OR; a Philadelphia Press special dispatch of Jul 1, printed in several papers on Jul 3-4 1863, has the column charged in the rear on its arrival on Tuesday morning and the battle commence at 9 a. m. (scenario C), which agrees with the seed\'s hour but not with its mechanism (vedettes).')
    r['searched'] = list(r['searched']) + [
        SRCH4 + "1863 newspaper pages (tmp/library/web/ca, Jul 1 - Jul 6): regex Hanover.{0,300}(10 o'clock|ten o'clock|noon|12 o'clock|forenoon|morning|2 o'clock|afternoon).{0,300}(Kilpatrick|Stuart|Farnsworth|Custer) and the reverse: 15 windows in 14 pages; the Press special of Jul 1 (9 a. m. to 7 in the evening) is printed in at least six papers and cited once (page image read); the Times special of Jun 30 (HQ, 8 p.m.): Gregg drove Stuart from Westminster to Hanover early on Tuesday, Kilpatrick and Custer drove Stuart out of Hanover 'during the forenoon' (no hour)",
    ]

    # ------------------------------------------------------------------------------------------------------------------ T1-046
    r = by['T1-046']
    r['cites'].update({
        'press_9': CA('CA-sn84031490-1863-07-03-p1', Q['press_9'], reading='... about six thousand strong. The National forces numbered 1,800. The battle commenced at 9 a. m., and continued until 7 in the evening. (the part of the sentence before "about six thousand strong" is read in the text layer only)',
                      image=IMG['press9'], witness='Chicago Daily Tribune, Jul 3 1863: a Philadelphia Press special dispatch from Columbia, Pa., Jul 1, printed in several papers'),
    })
    sub_set(r, 2, 'Start of the fight about 9 a.m. (Philadelphia Press special), about 10 a.m. (Stuart) or about noon (Richmond, Hammond); the Press special has the battle continue until 7 in the evening, against Kilpatrick\'s two hours', 'documented', 'conflict', ['press_9', 'stuart10', 'rich_noon', 'ham_noon'])
    r['scenarios'].append(sc('C', 'The battle begins about 9 a.m. (Press special) and, with Kilpatrick\'s two hours, ends about 11:00', 'Philadelphia Press special of Jul 1 printed in the Chicago Daily Tribune of Jul 3 1863 p.1 with Kilpatrick OR27-1-R359 p.986', 'documented', ['press_9', 'kil_two']))
    r['scenarios'].append(sc('D', 'The battle continues until 7 in the evening (19:00)', 'Philadelphia Press special of Jul 1 printed in the Chicago Daily Tribune of Jul 3 1863 p.1; contradicts Kilpatrick\'s fight of about two hours', 'documented', ['press_9']))
    r['claim']['event'] = 'Hanover fight: about two hours, from about 9 a.m. (Press special), 10 a.m. (Stuart) or noon (Richmond, Hammond); the 6th and 7th Michigan are engaged there'
    r['claim'].update(when='Jun 30: the fight lasted about two hours; its end is about 11:00 if it began about 9 a.m. (Press special) and lasted two hours, about 12:00 if it began about 10 a.m. (Stuart), about 14:00 if it began about noon (Richmond, Hammond); the Press special has it last until 19:00',
                      start='1863-06-30T11:00', end='1863-06-30T19:00')
    r['claim']['text'] = r['claim']['text'].rstrip() + ' A Philadelphia Press special dispatch of Jul 1 (Chicago Daily Tribune, Jul 3 1863) has the battle begin at 9 a. m. and continue until 7 in the evening (scenarios C and D); the second contradicts Kilpatrick\'s two hours and is carried as a value of the press, not chosen.'

    # ------------------------------------------------------------------------------------------------------------------ T1-045
    r = by['T1-045']
    r['cites'].update({
        'hist_1030': LH(Q['hist_1030']),
        'hoke_buford': L('HOKE-1887', Q['hoke_buford']),
    })
    sub_add(r, "Other hours: the county history of 1886 has Buford pass through Gettysburg at half past ten o'clock in the morning of Jun 30 upon a reconnaissance in force; Hoke (1887) has him pass through in the afternoon of Tuesday (neither names a source)",
            'inferred', 'conflict', ['hist_1030', 'hoke_buford'])
    r['scenarios'].append(sc('E', 'Arrival about 10:30 a.m. (county history of 1886)', 'History of Cumberland and Adams Counties 1886 p.156 (a later book that names no source for the hour)', 'inferred', ['hist_1030']))
    r['scenarios'].append(sc('F', 'Arrival in the afternoon, no hour (Hoke 1887)', 'Hoke 1887 p.559 (a later book that names no source); not used for the window limits, it gives no hour', 'inferred', ['hoke_buford']))
    r['claim']['when'] = 'Jun 30 at 10:30 a.m. (county history of 1886), 11 a.m. (Buford), 11.30 a.m. (Jacobs), a little before noon (Pierce): window 10:30-12:00'
    r['claim']['start'] = '1863-06-30T10:30'
    r['claim']['text'] = r['claim']['text'].rstrip() + " The county history of 1886 gives half past ten in the morning and Hoke (1887) the afternoon of Tuesday for Buford's passage through the town (scenarios E and F; later books naming no source)."

    # ------------------------------------------------------------------------------------------------------------------ T1-047
    r = by['T1-047']
    r['cites'].update({
        'hoke_pettig': L('HOKE-1887', Q['hoke_pettig'], page='232', page_check=True,
                         page_basis='the head "232 THE GREAT INVASION." (damaged in the text layer: "2o2 TUN GREAT INVASION") before the passage and "POSITION OF THE CONFEDERATES, JUNE 30tH. 233" after it; the generic heads found 231 and 233'),
        'hoke_pettig2': L('HOKE-1887', Q['hoke_pettig2']),
    })
    sub_add(r, "Hoke (1887): about half past nine in the morning of Jun 30 the detachment left Cashtown and went to within about one mile of Gettysburg with a number of wagons; approaching the town it halted, and after a careful observation by the officers through their field-glasses it withdrew and encamped at Marsh Creek (a later book that names no source)",
            'inferred', 'conflict', ['hoke_pettig', 'hoke_pettig2'])

    # ------------------------------------------------------------------------------------------------------------------ T1-049
    r = by['T1-049']
    r['cites']['nps_pahall'].update(page='57', page_basis='PDF page 62 of the text layer (marker === PAGE 62 ===); the printed page numbers read 56 at the foot of PDF page 61 and 58 at the foot of PDF page 63 (55 on PDF page 60), so PDF page 62 is printed page 57; the foot of PDF page 62 itself is not legible in the text layer')
    r['cites'].update({
        'nps_clr_sem': L('NPS-CLR-1STDAY', Q['nps_clr_sem'], page='35',
                         page_basis='PDF page 57 of the text layer (marker === PAGE 57 ===), whose last line is the page number 35; the string "First Day, Wednesday, July 1, 1863 99" just before the passage is carried in the text layer of that PDF page and is not its page number',
                         witness='National Park Service, Cultural Landscape Report for First Day - Union 1st Corps Battlefield (2021); the Cultural Landscapes Inventory of the same area (NPS-CLI-1STDAY, 2021) repeats the sentence word for word and is not an independent witness'),
        'nps_clr_schm': L('NPS-CLR-1STDAY', Q['nps_clr_schm'], page='266',
                          page_basis='PDF page 292 of the text layer (marker === PAGE 292 ===), whose last line is the page number 266 (the generic heads of the builder read 265 because the numbers stand at the foot of the pages)',
                          witness='National Park Service, Cultural Landscape Report for First Day - Union 1st Corps Battlefield (2021): the Seminary\'s original building, not the College\'s'),
    })
    sub_set(r, 5, "The steeple of the college (Norton, Jun 30) and the College cupola (Jacobs, Jul 1) are the cupola of Pennsylvania Hall, the college's signal building; this reading conflicts with the National Park Service report of 2021, which puts Buford's signal station of Jun 30 in the cupola of the Seminary building",
            'inferred', 'conflict', ['norton_steeple', 'jac_cupola', 'nps_pahall', 'nps_clr_sem'])
    sub_add(r, "National Park Service (2021): arriving on June 30 General Buford used the cupola of the Seminary building as a signal station while his cavalry division encamped at the McPherson Farm; the Seminary's original building is Schmucker Hall (Old Dorm, 1832), whose cupola served as a Union signal station",
            'documented', 'supported', ['nps_clr_sem', 'nps_clr_schm'])
    r['scenarios'] = [
        sc('A', "The Jun 30 station was in the steeple or cupola of Pennsylvania Hall, the college building", "Norton (the steeple of the college, Jun 30), Jacobs (the College cupola, Jul 1) and the National Park Service boundary study of 1988 (Pennsylvania Hall served as an observation post and signal station during the battle, no date); the identification of the Jun 30 steeple with the Hall is inferred", 'inferred', ['norton_steeple', 'jac_cupola', 'nps_pahall']),
        sc('B', "The Jun 30 station was in the cupola of the Seminary building (Schmucker Hall) on Seminary Ridge", "National Park Service, Cultural Landscape Report 2021 p.35 and p.266 (Buford used the Seminary cupola as a signal station on arriving on June 30)", 'documented', ['nps_clr_sem', 'nps_clr_schm']),
    ]
    r['claim']['place'] = 'The steeple of the college, Gettysburg (Pennsylvania College; the building, Pennsylvania Hall, is not named in the OR), or, by the National Park Service of 2021, the cupola of the Seminary building on Seminary Ridge: two scenarios, no default'
    r['claim']['text'] = r['claim']['text'].replace("which identifies the college's steeple or cupola with that building (inferred; the texts of Norton and Jacobs do not name it).",
        "which would identify the college's steeple or cupola with that building (inferred; the texts of Norton and Jacobs do not name it). "
        "The National Park Service report of 2021 instead puts Buford's signal station of Jun 30 in the cupola of the Seminary building (Schmucker Hall); both readings are carried as scenarios, no default.")
    assert 'Seminary building' in r['claim']['text']
    r['claim']['marking'] = 'steeple of the college: documented; the building: two scenarios (Pennsylvania Hall of the College, inferred; the Seminary\'s Schmucker Hall, National Park Service 2021)'
    r['remains'] = ['which building carried the Jun 30 station: Pennsylvania Hall of the College or the Seminary\'s Schmucker Hall (Norton and Jacobs name neither; the National Park Service 1988 names the Hall without a date, the report of 2021 names the Seminary building)', 'an hour for the Jun 30 station']
    r['searched'] = [x.replace('(another building, not cited)', '(another building; cited in the fourth start of 2026-11-15)').replace('; no text ties the Jun 30 station to a named building', '; of these texts only the National Park Service report of 2021 ties the Jun 30 station to a named building (the Seminary)') for x in r['searched']] + [
        SRCH4 + "National Park Service Cultural Landscape Report and Cultural Landscapes Inventory for the First Day battlefield (NPS-CLR-1STDAY p.35, p.266; NPS-CLI-1STDAY): Buford's signal station of Jun 30 is the cupola of the Seminary building (cited; the Inventory repeats the report); History of Cumberland and Adams Counties 1886 (the College building has an octagonal cupola with observatory) and Hoke 1887 (its index: the College cupola as an observatory of the Federals, of General Lee; the passages read are about Jul 1-3): neither names the Jun 30 station",
    ]
    r['register'].update(title='Identification of the Jun 30 signal station: the college\'s Pennsylvania Hall or the Seminary\'s Schmucker Hall',
        why="Norton says \"the steeple of the college\"; Jacobs \"the College cupola\"; neither names the building; the National Park Service names Pennsylvania Hall as signal station during the battle without a date (1988) and the Seminary building's cupola as Buford's signal station of Jun 30 (2021).",
        recon="Observation post on the college's cupola (inferred: Pennsylvania Hall) or on the Seminary's cupola (National Park Service 2021): both shown as scenarios",
        competing='Pennsylvania Hall of Pennsylvania College (inferred) / the Seminary building (Schmucker Hall), National Park Service 2021',
        impact='which building carries the Jun 30 post on the ridge or in the town')

    # ------------------------------------------------------------------------------------------------------------------ T1-050
    r = by['T1-050']
    r['cites'].update({
        'slentz_aff': L('NPS-HS-MCPHERSON', Q['slentz_aff'], page='104',
                        page_basis='PDF page 106 of the text layer (marker === PAGE 106 ===, Appendix B); the printed page is the PDF page minus 2, as on PDF page 100 (printed 98) and PDF page 28 (printed 26); the Appendix B page carries no legible number in the text layer',
                        reading="The day before the battle Gen'l Buford's command occupied the place until 10 am next day, they cut and threw down about 1/4 mile post and rail fence to make way for the battle.",
                        note='affidavit of Jno. T. Slentz, aged 60, tenant of the McPherson farm, sworn Jan 8 1883 (Ex. 6 of the claim file), as transcribed in Appendix B of the study; the letter-spaced text layer is quoted as it stands; the digits and the fraction were read in the text layer only, page image not viewed',
                        witness='Historical Study by the National Park Service (text layer of the PDF, spaced letters); the underlying claim file (Slentz, Adams County, McPherson claim of 1868) was not read'),
        'slentz_pet': L('NPS-HS-MCPHERSON', Q['slentz_pet'], page='98',
                        page_basis='printed page number 98 at the top of PDF page 100 (marker === PAGE 100 ===) in the text layer',
                        reading="... said farm was occupied by Buford's Cavalry who encamped on it June 30 1863 ...",
                        note='petition of John T. Slentz to the commissioners under the Act of Apr 9 1868 (sworn Nov 1868), as transcribed in the study; the letter-spaced text layer is quoted as it stands',
                        witness='Historical Study by the National Park Service (text layer of the PDF, spaced letters)'),
    })
    sub_append(r, 1, "; the tenant's own words, sworn in January 1883 and transcribed in Appendix B of the study (p.104): Buford's command occupied the place and \"cut and threw down about 1/4 mile post and rail fence to make way for the battle\"", 'slentz_aff')
    sub_add(r, "The tenant John T. Slentz's petition of 1868 (study p.98) says the farm was occupied by Buford's cavalry, who encamped on it June 30 1863; the fence statement above is his affidavit of January 1883 (p.104), twenty years after the event and in support of a damage claim",
            'inferred', 'supported', ['slentz_pet', 'slentz_aff'])
    r['searched'] = list(r['searched']) + [
        SRCH4 + "NPS-HS-MCPHERSON Appendix B read (PDF pages 100 and 106): the tenant's petition (p.98) and his affidavit of Jan 8 1883 (p.104), cited as the claimant's own words; the claim file itself and any wartime account of the fence remain unread",
    ]

    # ------------------------------------------------------------------------------------------------------------------ T1-040
    r = by['T1-040']
    r['cites'].update({
        'hoke_steeple': L('HOKE-1887', Q['hoke_steeple'], note="the author's own account of the evening of Jun 29 at Chambersburg (Hoke was a resident of the town); published in 1887"),
        'hoke_fires': L('HOKE-1887', Q['hoke_fires']),
        'hoke_stream': L('HOKE-1887', Q['hoke_stream']),
        'hoke_rumble': L('HOKE-1887', Q['hoke_rumble'], note='the text layer prints "Cthe night"'),
        'hoke_time': L('HOKE-1887', Q['hoke_time']),
        'hoke_pike': L('HOKE-1887', Q['hoke_pike']),
        'hoke_ewell': L('HOKE-1887', Q['hoke_ewell'], note='the text layer prints "EwelPs"'),
        'hoke_union1': L('HOKE-1887', Q['hoke_union1']),
        'hoke_union2': L('HOKE-1887', Q['hoke_union2']),
    })
    sub_append(r, 8, '; Hoke (1887) has the same on pp.251-252: the head of Stuart\'s column rested at Union Mills, half way between Westminster and Littlestown, and Stuart had bivouacked over night at Union Mills (a second later narrative, no source named)', 'hoke_union1', 'hoke_union2')
    sub_set(r, 9, "Campfires, picket lines, lights, sounds and civilians' contact with the troops of both armies on the night of Jun 29, on the Union side and around Gettysburg", 'open gap', 'unsupported', [])
    sub_add(r, "Chambersburg and the South Mountain after dark on Monday Jun 29, seen by Hoke from the steeple of the Reformed Church: the line of the railroad could be traced by the numerous fires still burning, the sound of the drum was heard toward Pickett's camp, and innumerable lights were seen along the South Mountain for miles up and down the valley",
            'documented', 'supported', ['hoke_steeple', 'hoke_fires'])
    sub_add(r, "About one or two o'clock in the night of Jun 29-30 a continuous stream of wagons (Ewell's train) was driven hurriedly through the street of Chambersburg and out the Gettysburg pike, at times at a trot, with a low rumbling noise as if the whole valley were filled with moving trains (Hoke)",
            'documented', 'supported', ['hoke_stream', 'hoke_rumble', 'hoke_time', 'hoke_pike', 'hoke_ewell'])
    r['claim']['text'] = r['claim']['text'].replace("Campfires, picket lines, lights, sounds and the civilians' contact with the troops on the night of Jun 29 across both armies remain an open gap: no passage found describes them for that night.",
        "Hoke, who watched from the steeple of the Reformed Church at Chambersburg after dark on Monday Jun 29, saw the line of the railroad by the numerous fires still burning, heard a drum toward Pickett's camp, saw innumerable lights along the South Mountain for miles, and was woken about one or two o'clock by a continuous stream of Ewell's wagons driven hurriedly through the street with a low rumbling noise (a later book, the author's own account). "
        "Campfires, picket lines, lights, sounds and the civilians' contact with the troops on the Union side and around Gettysburg on the night of Jun 29 remain an open gap: no passage found describes them for that night.")
    assert 'Hoke, who watched' in r['claim']['text']
    r['claim']['marking'] = 'night positions, fragments and the Chambersburg night (fires, lights, a drum, a wagon train): documented (one inferred); camp life on the Union side and around Gettysburg: open gap, shown only as marked procedural scene detail'
    r['remains'] = ["campfires, pickets, lights, sounds and civilians' contact with the troops on the Union side and around Gettysburg on the night of Jun 29 (positions and marches are documented, the life of the Union camps is not; the Chambersburg night is documented from Hoke)"]
    r['searched'] = list(r['searched']) + [
        SRCH4 + "Hoke 1887 p.217 read (cited): the night of Monday Jun 29 at Chambersburg; HISTORY-ADAMS-1886 pp.155-156: camp-fires of two armies are told for the night of Jun 30 only; none for the Union camps of Jun 29",
    ]

    # ------------------------------------------------------------------------------------------------------------------ rows where the fourth-start searches found nothing: the searches are recorded
    NONE = {
        'T1-003': "weather words and instruments (thermometer|meteorolog|Fahrenheit|barometer; rain|mud|dust|hot|cold near Jun 25-30) in HOKE-1887, HISTORY-ADAMS-1886, the other issues of the Adams Sentinel and the Compiler (1863-64) and the newspaper pages of Jun 27 - Jul 3 1863 (tmp/library/web/ca): no reading and no statement of the weather at Gettysburg on Jun 25-26",
        'T1-013': "Sandoe|Lightner (cavalry|killed|shot)|first man killed in HOKE-1887, HISTORY-ADAMS-1886, the National Park Service texts, the medical texts and the newspaper pages of Jun 26 - Sep 30 1863 (tmp/library/web/ca): no account of the shooting beyond the Compiler of Jun 29 already cited; Lightner appears only as a landowner and family name",
        'T1-019': "weather words and instruments for Jun 27 in the same corpora as T1-003: no reading and no statement for Gettysburg",
        'T1-022': "night positions (night of Saturday|Sunday|Monday; encamped over the night) in HOKE-1887 and HISTORY-ADAMS-1886, 22 windows skimmed: Hoke gives the positions of the Confederate divisions for the night of Monday Jun 29 (pp.221-222) and the date of Longstreet's scout (Jun 28 or 29); none for the night of Jun 27",
        'T1-023': "weather words and instruments for Jun 28 in the same corpora as T1-003: none",
        'T1-029': "night positions (night of Saturday|Sunday|Monday; encamped over the night) in HOKE-1887 and HISTORY-ADAMS-1886, 22 windows skimmed: positions for the night of Monday Jun 29 only (Hoke pp.221-222); none for the night of Jun 28",
        'T1-030': "weather words and instruments for Jun 29 in the same corpora as T1-003: none",
        'T1-041': "weather words and instruments for Jun 30 in the same corpora as T1-003: none",
        'T1-048': "Pancoast|Presbyterian.{0,200}(hospital|wounded|cavalry) in the town books (HISTORY-ADAMS-1886, HOKE-1887, WARCLAIMS-CHURCHES-1912: the list of church war claims has two Gettysburg churches, St. James Lutheran and St. Mark's German Reformed, both hospitals after the battle; none for the Presbyterian church), the National Park Service texts and the medical texts: no statement of a hospital at the Presbyterian Church on Jun 30",
    }
    NONE.update({
        'T1-006': "Comanche in the newspaper pages of Jun 26 - Sep 30 1863 and the town books: only an ironclad and the Carlisle Indian school; militia within 160 characters of Early or Gordon in the town books (14 windows): none says that Early learned that the force in Gettysburg was militia",
        'T1-011': "Knoxlyn|Belmont (road|school)|Bayly|Bayley in the town books and the National Park Service texts: nothing on the flight of the militia (the Belmont Schoolhouse hit is the 26th North Carolina on Jul 1)",
        'T1-012': "Bayly|Bayley in the town books and the National Park Service texts: family names only; Hunterstown.{0,200}(militia|Jennings|captured|paroled) in the newspaper pages of Jun 27 - Jul 25 1863: no window",
        'T1-015': "covered bridge.{0,200}(burn|fire|destroy) and telegraph.{0,120}(cut|torn|destroy) in the town books and the newspaper pages of Jun 26 - Aug 31 1863: no passage about Gettysburg",
        'T1-021': "newspaper dispatches of Jun 28 - Jul 1 1863 (8 windows): Hooker relieved at his own request and Meade appointed to the command, no hour of the order",
        'T1-042': "Littlestown.{0,300}(skirmish|Stuart|rebel|cavalry) in the town books (10 windows): Hoke gives the marches of Jun 29-30 (Kilpatrick's division from Frederick to Littlestown, the Twelfth Corps resting at Littlestown), no account of a skirmish there",
        'T1-051': "Stuart.{0,160}(ditch|leaped|jumped) in the newspaper pages of Jul 1-31 1863 and the town books: no account of Stuart escaping by jumping a ditch at Hanover; Hanover casualty figures in the town books: none",
        'T1-053': "Barlow.{0,200}(Emmitsburg|Gettysburg).{0,200}(June 30|30th|Tuesday)|Howard.{0,200}Emmitsburg in the town books and the National Park Service texts: Barton's book has General Howard's headquarters at Emmitsburg and General Schurz near St. Joseph's on the 28th to 30th; nothing on Barlow's division",
    })
    r = by['T1-009']
    r['searched'] = list(r['searched']) + [SRCH4 + "clover in the newspaper pages of Jun 26 - Aug 31 1863, the town books and the National Park Service texts: advertisements for clover seed only; Knoxlyn|Belmont (road|school)|Bayly|Bayley in the town books and the National Park Service texts: nothing on the militia camp"]
    for rid, text in NONE.items():
        r = by[rid]
        r['searched'] = list(r['searched']) + [SRCH4 + text]


# window limits whose origin changes with the fourth start (merged into build.LIMIT_NOTES)
LIMIT_NOTES_PATCH = {
    ('T1-044', 'start'): "the hour at which a Philadelphia Press special dispatch of Jul 1 has the battle begin (9 a.m., Chicago Daily Tribune Jul 3 1863 p.1); Stuart's about 10 a.m. is scenario A",
    ('T1-045', 'start'): "the hour the county history of 1886 gives for Buford's passage through the town (half past ten in the morning, p.156); Buford's own report has 11 a.m. (OR27-1-R337 p.923)",
    ('T1-046', 'start'): "the end of the fight if it began about 9 a.m. (Philadelphia Press special, Chicago Daily Tribune Jul 3 1863 p.1) and lasted about two hours (Kilpatrick)",
    ('T1-046', 'end'): "the hour to which the Philadelphia Press special says the battle continued (7 in the evening); the OR-based end of the fight if it began about noon (Richmond, Hammond) is about 14:00",
}
