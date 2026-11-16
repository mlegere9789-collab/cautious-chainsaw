"""tl-04 second reading (2026-11-16): patches applied to the rows after rows_a .. rows_g are loaded.

1. Quotes that stopped short of the claim they carry are extended to the verbatim passage that covers it (the extension always contains the old
   quote; build.py re-matches every new quote in the source text, report and page).
2. Wording of sub-claims that went beyond their passage is brought back to what the passage says.
3. Texts that were local after the first pass (USSC report of 1863, Souder 1864, 1863 newspapers, NPS landscape texts) are added where a passage
   supports exactly a sub-claim or a scenario; nothing is added that a text does not say.
Nothing here lowers a tier without cause or picks a default (Law cl.6)."""
from tl4lib import *
from or27_lib import norm_query


# ------------------------------------------------------------------ mutators
def QX(rid, key, quote):
    """extend the quote of citation `key` of row `rid`; the old quote must be inside the new one"""
    c = ROWS[rid]['cites'][key]
    old = norm_query(c['quote']).replace(' ', '')
    new = norm_query(quote).replace(' ', '')
    assert old in new, (rid, key, 'new quote does not contain the old one')
    c['quote'] = quote


def PG(rid, key, page):
    """state the printed page (or range) of a citation whose quote was extended across a page break"""
    ROWS[rid]['cites'][key]['page'] = page


def CF(rid, n, claim=None, note=None, tier=None, support=None, keys=None):
    """change fields of sub-claim n (1-based) of row rid"""
    cl, t, s, k, nt = ROWS[rid]['subs'][n - 1]
    ROWS[rid]['subs'][n - 1] = (claim or cl, tier or t, support or s, list(keys) if keys is not None else k, note if note is not None else nt)


def SA(rid, claim, tier, support, keys=(), note=None, pos=None):
    """add a sub-claim (at 1-based position pos, else at the end)"""
    item = SUB(claim, tier, support, keys, note)
    if pos is None:
        ROWS[rid]['subs'].append(item)
    else:
        ROWS[rid]['subs'].insert(pos - 1, item)


def NC(rid, key, cite):
    assert key not in ROWS[rid]['cites'], (rid, key)
    ROWS[rid]['cites'][key] = cite


def SN(rid, scn):
    ROWS[rid]['scenarios'].append(scn)


def RM(rid, *items, replace=False):
    if replace:
        ROWS[rid]['remains'] = list(items)
    else:
        ROWS[rid]['remains'].extend(items)


def CL(rid, **kw):
    ROWS[rid]['claim'].update(kw)


# ================================================================== 1. quote extensions (claims that went beyond their quotation)
QX('T1-173', 'w_late', "and after our infantry was driven out of the town, and the enemy made his appearance in our front, I received him with canister, which checked nis progress, and gave our troops time to rally in rear of the battery, to advance on the enemy again, and to drive him back into town, when the fire was kept up until late in the evening")
QX('T1-174', 'w_march', "On July 1, I marched from Emmitsburg with the Second Division (General Steinwehr), but, when within about 5 miles of Gettysburg, I was ordered to move forward .at double-quick")
QX('T1-176', 's_tt', "Oil the morning of July 1, the corps was moved to Two Taverns, and remained at that place until information was received that the First and Eleventh Corps were engaged at Gettysburg, when the march was at once resumed, and, agreeably to suggestion from General Howard, the First Division was put in position on the right of our line, near Rock Creek")
QX('T1-176', 'g_5pm', "By his direction, upon this threatening emergency, I took up a position on the extreme left of the line of battle, as the enemy was reported to be attempting to flank it, and cavalry were already skirmishing in front of that position. At 5 p. m. this movement was consummated, and my line extended at that time from about half a mile west of the Baltimore turnpike to the left of the First Army Corps, to a range of hills south and Avest of the town, which I occupied with two regiments of the First | Brigade")
CF('T1-176', 6, claim="Ruger (First Division, Twelfth Corps): about sunset the division took up a position about three-quarters of a mile in rear of the position previously occupied and so remained during the night of the 1st")
QX('T1-177', 'h_56', "Between 5 and 6 o'clock, my dispositions having been completed, Major-General Slocum arrived on the field, and, considering that my functions had ceased, I transferred the command to him")
QX('T1-178', 'w_back', "The hill was found in possession of the enemy, and the division, when about to assault the position, was ordered to withdraw, as our forces had retired behind!^ the town, which had fallen into the hands of tjie enemy")
QX('T1-178', 'r_cmd', "At daylight of July 2, shots were exchanged between our pickets and those of the enemy, with some slight loss on our side. About this time the advance of tlie Fifth Army Corps arrived, and took position on the right of the division. Up to this time the division was under the command of its commander proper— Brig. Gen. A. S. Williams. I now received orders from General Williams to take command of the division, General Williams having been placed in command of the corps")
QX('T1-180', 'bl_a', "As they reached the hill they were received by General Hancock, who arrived just as they were coming up from the town, under orders from Oeneral Meade to assume the command. His person was well known ; his presence inspired confidence, and it implied also the near approach of his army-corps. He ordered Wadsworth at once to")
QX('T1-186', 'ew_msg', "On entering the ttiwn, I received a message from the commanding general to attack this hill, if I could do so to advantage")
QX('T1-186', 'ew_jaded', "and all the troops Avith me were jaded by twelve hours' marching and fighting")
QX('T1-187', 'ea_urge', "As soon as my brigades had entered the town, I rode into that place myself, and, after ascertaining the condition of things, I rode to find General Ewell and General Bodes, or General Hill, for the purpose of urging an immediate advance upon the enemy before he should recover from his evident dismay, in order to get possession of the hills to which he had fallen back with the remnant of his forces")
QX('T1-187', 'ea_smith', "General Smith's son, who was acting as his aide, came to me with a message from the general, stating that a large force of the enemy, consisting of infantry, artillery, and cavalry, was advancing on the York road, and that we were about to be flanked ; and though I had no faith in this report,")
QX('T1-187', 'ea77_road', "Ewell, Rodes, and myself, while waiting for Johnson's arrival, rode out of the town a short distance to look out on the York road, which was visible for nearly or quite two miles, to see if we could discover any indications of the enemy's advance. I placed no confidence in the rumor, but Rodes was inclined to believe it, while Ewell seemed at a loss as to what opinion to form")
QX('T1-192', 'h_head', "Between 5 and 6 o'clock, my dispositions having been completed, Major-General Slocum arrived on the field, and, considering that my functions had ceased, I transferred the command to him. The head of the Third Corps appeared in sight shortly afterward, on the Emmitsburg road")
for rid in ('T1-195', 'T1-219', 'T1-225'):
    QX(rid, 'mca_fog', "Resumed the march at 7. 30 a. rii. Marched by way of Emmitsburg, and halted within 2 miles of Gettysburg, where we remained during the night. July 2. — Morning dawned j considerable fog; breakfast over")
QX('T1-203', 'let_day', "These officers were engaged assiduously, day and night, with little rest, until the 6th")
QX('T1-204', 'let_tents', "In most of the corps the wagons exclusively used for medicines moved with the ambulances, so that the medical officers had a sufficient supply of dressings, chloroform, and such articles until the supplies came up, but the tents and other appliances, which are as necessary, were not available until Julv 5")
QX('T1-209', 'on_form', "The greater portion of my brigade had passed through the town, and I had ordered up some pieces of artillery and had formed my brigade, and, in conjunction with General Doles, was in the act of charging the hill, when I was recalled, and ordered to form my brigade beyond the railroad")
CF('T1-209', 2, claim="Rodes: the second line, composed of the brigades of Daniel and O'Neal, extended along the railroad about 200 yards in rear of the first")
QX('T1-210', 'dol_st', "We followed through the town as far as the outer edge of town, when I received an order to halt the column, and to form line of battle in the street running east and west through the town")
QX('T1-210', 'rod_line', "My skirmishers were promptly thrown out so as to cover more than half the town and the front of the division, which was drawn up in two lines, Doles', Iverson's, and Ramseur's brigades making the front line, and extending from the left of the center of the town along one of its principal streets and out on the road to Fairfield")
QX('T1-211', 'bl_pos', "The whole command then moved up the pike, and, passing through the town, took up its position on the left of Ramseur's brigade, then lying in")
CF('T1-214', 2, claim="Jacobs (spelling 'Rhodes'): that portion of Rodes' division which lay down before his dwelling for the night was greatly elated with the results of the first day's battle and was anxious to engage in conversation")
CF('T1-215', 2, claim="Johnson's division threw pickets well to the front and slept on its arms, and Geary's command rested on its arms, during the night of Jul 1 (the passages of T1-214)")
QX('T1-216', 'st_shell', "I placed artillery in position commanding the' town, took possession of the main avenues to the place, and repeated the demand. It was again refused, and I was forced to the alternative of shelling the place")
CF('T1-216', 2, claim="He repeated his demand for surrender; it was again refused and he shelled the place; only the United States cavalry barracks were burned, by his order")
QX('T1-216', 'st_hampton', "I instantly dispatched to Hampton to move 10 miles that night on the road to Gettysburg, and gave orders to tlie other brigades, with a view to reaching Gettysburg early the next day, and started myself that night")
QX('T1-217', 'dev_tan', "The enemy not pressing his advance, and the Third Corps coming into position, we were ordered to march to Taneytown, where we bivouacked, and marched the next morning, July 3, to Westminster")
QX('T1-218', 'jac_pill', "Some, who in accordance with this advice left their houses, found to their sorrow, when afterwards they returned, that they had been pillaged by the Rebels during their absence")
QX('T1-218', 'rod_line', "the front of the division, which was drawn up in two lines, Doles', Iverson's, and Ramseur's brigades making the front line, and extending from the left of the center of the town along one of its principal streets and out on the road to Fairfield")
QX('T1-219', 'g_dark', "Without replying, the brigade was withdrawn to the turnpike, taken in past the rear of Greene's brigade and past Greene's right, when it was again met .with a volley, thus proving that the enemy still occupied the ground to Greene's right; a fact of which in the dark night there remained some doubt")
QX('T1-222', 'hum_bht', "but Lieutenant-Colonel Hayden was positive that General Sickles had instructed him to guide the division by way of the Black Horse Tavern, on the road from Fairfield to Gettysburg. Accordingly, I moved the division in that direction, but, upon approaching the Black Horse Tavern, I found myself in the immediate vicinity of the enemy, who occupied that road in strong force. He was not aware of my presence, and I might have attacked him at daylight with the certainty of at Ipast temporary success; but I was 3 miles distant from the remainder of the army")
QX('T1-222', 'hum_1am', "I accordingly retraced my steps, and marched by the route I have heretofore indicated, bivouacking at 1 a. m. on July 2 about 1 mile from Gettysburg and eastward of the Ernmitsburg road")
QX('T2-004', 'd_head', "5.25 [p. M., July 1, 1863,] General: When I arrived here an hour since, I found that our troops had given up the front of Gettysburg and the town. We have now taken up a position in the cemetery, and cannot well be taken. It is a position, however, easily turned")
CF('T2-004', 2, claim="The dispatch says: 'I will communicate in a few moments with General Slocum, and transfer the command to him'")
QX('T2-004', 'h_56', "Between 5 and 6 o'clock, my dispositions having been completed, Major-General Slocum arrived on the field, and, considering that my functions had ceased, I transferred the command to him")
QX('T2-005', 'g_5pm', "By his direction, upon this threatening emergency, I took up a position on the extreme left of the line of battle, as the enemy was reported to be attempting to flank it, and cavalry were already skirmishing in front of that position. At 5 p. m. this movement was consummated, and my line extended at that time from about half a mile west of the Baltimore turnpike to the left of the First Army Corps, to a range of hills south and Avest of the town, which I occupied with two regiments of the First | Brigade")
QX('T2-005', 'h_56', "Between 5 and 6 o'clock, my dispositions having been completed, Major-General Slocum arrived on the field, and, considering that my functions had ceased, I transferred the command to him")
QX('T2-005', 'g_5am', "At 5 a. m. on the 2d, having been relieved by the Third Army Corps, in obedience to orders from Major-General Slocum, the division was placed on the right of the center of the main line of battle, east of the turnpike")
CF('T2-005', 6, claim="Geary: at 5 a.m. on the 2d, relieved by the Third Army Corps, the division was placed on the right of the center of the main line of battle, east of the turnpike (the passage does not name Culp's Hill)")
CF('T1-182', 4, claim="The stone wall was there when the breastworks were built: the rear line lay behind a stone wall and the front line about 40 paces in advance of it, where the breastworks were built (McDougall)")

# pages of quotes that now cross a page break (the scan leaf decides; stated here so that the builder can compare)
PG('T1-177', 'h_56', '368-369')
PG('T1-192', 'h_head', '368-369')
PG('T2-004', 'h_56', '368-369')
PG('T2-005', 'h_56', '368-369')
PG('T1-178', 'r_cmd', '777-778')


# ================================================================== 2. a recipient that the text read does not print (T1-175, T2-004)
# The dispatch of 5.25 p.m. is printed in Hancock's report headed only 'General:'; Butterfield is not named in the text read.  Hancock's own
# report says he addressed a communication to 'the major-general commanding' (Meade), sent by Captain Parker, with the same content.
H_COMM = ("Shortly after, I addressed a communication to the major-general commanding, sending it by Captain Parker, of my staff, giving in detail the information in my possession, "
          "and informing him that the position at Gettysburg was a very strong one, having for its disadvantage that it might be easily turned.")
for rid in ('T1-175', 'T2-004'):
    NC(rid, 'h_comm', OR(H_COMM, 'OR27-1-R076', '368'))
CL('T1-175', unit="Maj. Gen. Winfield S. Hancock (commanding the field for Meade) to the major-general commanding (Meade, at Taneytown); the dispatch is headed 'General:' in the text read, no addressee is printed")
CF('T1-175', 1, claim="Dispatch headed 5.25 (p.m. bracketed by the Official Records editors), Jul 1, addressed 'General:' (no addressee printed in the text read); Hancock's report calls it a communication to the major-general commanding, sent by Captain Parker of his staff",
   keys=['d_head', 'h_comm'])
CL('T2-004', unit="Maj. Gen. Hancock to the major-general commanding (Meade, at Taneytown); the dispatch is headed 'General:' in the text read, no addressee is printed")
CF('T2-004', 1, keys=['d_head', 'd_fight', 'h_comm'])


def SD(rid, n):
    """delete sub-claim n (1-based) when its content is carried by another sub-claim of the row"""
    del ROWS[rid]['subs'][n - 1]


# ================================================================== 3. T1-213: the claim of sub-claim 4 repeated sub-claim 2 and went beyond the NPS fragment
SD('T1-213', 4)

# ================================================================== 4. texts local since the first pass: citations
USSC = 'USSC-GETTYSBURG-1863'
W_USSC = ('Report of J. H. Douglas, Associate Secretary of the U.S. Sanitary Commission, signed Washington, D. C., Aug. 15, 1863 (the hospitals were visited in the days after the battle; '
          'the figures are called approximative only; the date of each count is not printed)')
Q_SPANG = "The Eleventh Corps Hospital occupied the house and farm of Geo. Spangler. The divisions were consolidated under the charge of Dr. Armstrong. It contained 1,900 wounded, of whom 100 were said to be confederates."
Q_APPROX = "These figures are approximative only, as that was all we sought for at the time."
Q_TABLE = ("The number of wounded whose wants — beyond those that a beneficent government cared for — we were anxious to supply, can be stated briefly as follows : First Corps (2 portions) 2,519 Union, 260 Confederates, . . 2,779 "
           "Second \" 3,500 \" 1,000 \" . . 4,500 Third \" 2,300 '• 250 \" . . 2,550 Fifth \" 1,325 \" 75 '^ . . 1,400 Sixth \" 300 \" 300 Eleventh \" 1,800 \" 100 \" . . 1,900")
Q_FC = ("The First Corps Hospital was divided. A portion was in the town, occupying several churches and the Court-House. These buildings contained the wounded of the battle of July 1st, "
        "The number estimated, including those in private houses, was 400 to 450.")
Q_BUSH = ("(Most of the wounded of this day's fight, were carried into the churches and public buildings of the town, under the organization of the first and cavalry corps, and were prisoners at the close of the day.)")
W_BUSH = ("account of Major Bush, a representative of the Sanitary Commission, printed in the same report ('Wednesday morning, July 1, and first day of the battle ...'); the paragraph in parentheses is his note on the wounded of that day")
Q_DATE = "Respectfully, J. H. Douglas, Associate Secretary San. Com. Washington, D. C, Aug. 15, 1863."
NPS_SPANG = "The complex provided cover and concealment for Union reserve units of the 5th Corps and the Artillery Reserve and additionally served as the 11th Corps feld hospital."
NPS_BOUND = "The 11th Corps hospital located here was the site of General Armistead's death"


def ussc_cites(rid, keys):
    d = dict(spang=LIB(USSC, Q_SPANG, witness=W_USSC), approx=LIB(USSC, Q_APPROX, witness=W_USSC), table=LIB(USSC, Q_TABLE, witness=W_USSC),
             fc=LIB(USSC, Q_FC, witness=W_USSC), bush=LIB(USSC, Q_BUSH, witness=W_BUSH),
             date=LIB(USSC, Q_DATE, page='26', page_basis="the head '26' precedes the signature; the later heads are lost in the table of issues (OCR text; not read on the page image)"))
    for k in keys:
        NC(rid, 'ussc_' + k, d[k])


# ------------------------------------------------------------------ T2-003: the Spangler farm hospital
ussc_cites('T2-003', ['spang', 'approx', 'table', 'date'])
NC('T2-003', 'nps_clr', LIB('NPS-CLR-ROT-V1', NPS_SPANG, witness='National Park Service, Cultural Landscape Report for Gettysburg National Military Park, Record of Treatment, Volume I (2018); the printed page is 307 (PDF page 333)'))
NC('T2-003', 'nps_bound', LIB('NPS-BOUNDARY-1988', NPS_BOUND, witness='National Park Service, Gettysburg National Military Park boundary study (1988); text layer of a scan, not proofread'))
ROWS['T2-003']['subs'] = [
    ROWS['T2-003']['subs'][0],
    SUB("The Eleventh Corps hospital occupied the house and farm of Geo. Spangler, its divisions consolidated under Dr. Armstrong; it contained 1,900 wounded, of whom 100 were said to be Confederates (U.S. Sanitary Commission report of Aug. 15, 1863)",
        'documented', 'supported', ['ussc_spang', 'ussc_date'], "the figures are 'approximative only' and the date of the count is not printed (the hospitals were visited in the days after the battle)"),
    SUB("The report's table gives the Eleventh Corps as 1,800 Union and 100 Confederate wounded, 1,900 in all, and calls its figures 'approximative only'",
        'documented', 'supported', ['ussc_table', 'ussc_approx'], "the ditto marks of the Eleventh Corps line stand for 'Union' and 'Confederates' of the first line of the table"),
    SUB("The George Spangler farm complex 'additionally served as the 11th Corps field hospital' (NPS record of treatment, 2018); the 11th Corps hospital there was the site of General Armistead's death (NPS boundary study, 1988)",
        'documented', 'supported', ['nps_clr', 'nps_bound'], "government reports that name no primary source; neither gives an hour, a date of take-over or a count"),
    ROWS['T2-003']['subs'][1],
    SUB("Counts of about 2,000, about 1,500 and 1,000 at one point at the Spangler farm (delegated default C-038: range 1,000-2,000, all five values listed)", 'open gap', 'unsupported', [],
        "no passage read gives 2,000, 1,500 or 1,000; the 1,900 and the 1,800 are the Sanitary Commission's approximate figures"),
]
ROWS['T2-003']['scenarios'] = [
    SCN('S1', "About 1,000 wounded", "seed (HN-SPG/TRE); no passage read", 'open gap', []),
    SCN('S2', "About 1,500 wounded (the plan's recommended default, pending)", "seed; no passage read", 'open gap', []),
    SCN('S3', "About 1,800 Union wounded", "U.S. Sanitary Commission report of Aug. 15, 1863: Eleventh Corps 1,800 Union and 100 Confederate (approximate; undated count)", 'documented', ['ussc_table']),
    SCN('S4', "About 1,900 wounded (1,800 Union and 100 Confederate)", "U.S. Sanitary Commission report of Aug. 15, 1863, p.24: 'It contained 1,900 wounded, of whom 100 were said to be confederates'", 'documented', ['ussc_spang']),
    SCN('S5', "About 2,000 wounded", "seed; no passage read", 'open gap', []),
]
CL('T2-003',
   event="The Eleventh Corps hospital occupied the house and farm of George Spangler on the Baltimore pike side of the field (Sanitary Commission report of Aug. 15, 1863; National Park Service reports) and held about 1,900 wounded, 100 of them said to be Confederates, at a count whose date is not printed; the 1932 NPS list places a tablet on the Hospital Road 700 feet east of the George Spangler house; the take-over in mid-afternoon of Jul 1, the first wounded about 16:00, the operating through the night and the counts of about 2,000, 1,500 and 1,000 are not in any text read; the recorded delegated default C-038 keeps the range 1,000-2,000 with all five values and no headline number",
   when="Jul 1 afternoon onward (the hour of take-over is not in any text read); the count of 1,900 belongs to visits in the days after the battle (undated)",
   basis="U.S. Sanitary Commission report (Aug. 15, 1863) for the occupation and the count; NPS record of treatment (2018) and boundary study (1988) for the function of the farm; NPS list of 1932 for the tablet; the Official Records and the library read for the rest (see the register entry). No window limit is stated for the unsupported take-over hour.",
   text="Documented: the Eleventh Corps hospital occupied the house and farm of Geo. Spangler, its divisions consolidated under Dr. Armstrong; the Sanitary Commission's associate secretary (report signed Washington, Aug. 15, 1863) puts it at 1,900 wounded, 100 of whom were said to be Confederates, in a table (Eleventh Corps 1,800 Union and 100 Confederate) that he calls 'approximative only' and that does not date its counts. The National Park Service says the farm complex 'additionally served as the 11th Corps field hospital' and that this hospital was the site of Armistead's death; its 1932 list places the hospital tablet 700 feet east of the house. Not in any text read: the hour at which the staff took the farm, the first wounded, the operations through the night, the counts of 2,000, 1,500 and 1,000, and the date of the Sanitary Commission's count. The only George Spangler farm in the Official Records is the bivouac farm near Emmitsburg (R060 p.326), unrelated. The counts are carried as the recorded delegated default C-038 (range 1,000 to 2,000, all five values listed, no headline number), unchanged here; two of the five values, 1,800 and 1,900, now have a source.",
   tier='inferred', start=None, end=None,
   marking="documented place, unit and the Sanitary Commission's figures marked as approximate; the take-over hour and the counts without a source marked as open gaps; counts as a range with all values")
ROWS['T2-003']['verdict'] = 'partially_supported'
ROWS['T2-003']['remains'] = ["The hour of the take-over, the first wounded and the night's operations.", "The counts 1,000, 1,500 and 2,000 (no passage read); the date of the Sanitary Commission's count; a count by the Eleventh Corps medical director (not read)."]
ROWS['T2-003']['recheck'] = ("OR-RECHECK-2: not_found (OR search for the Spangler farm hits only George Spangler's bivouac farm near Emmitsburg, R060 p.326). This close-out repeated the search over the library and the NPS texts and, in the second reading of 2026-11-16, over the texts "
                             "that other workstreams saved after the first pass: the 1863 report of the U.S. Sanitary Commission (tmp/library/medical) puts the Eleventh Corps hospital at the house and farm of Geo. Spangler with 1,900 wounded; the NPS record of treatment (2018) and the boundary study (1988) say the farm served as the 11th Corps field hospital. "
                             "Verdict moved from gap to partially_supported; the hour and the other counts stay open.")
ROWS['T2-003']['searched'] += [
    SR('MED', r'Spang[l1]er', near=r'(hospital|wounded|Eleventh)', win=400, what="the Spangler hospital in the Sanitary Commission report and the 1864 letters of a relief worker"),
    SR('TOWN', r'Spang[l1]er', near=r'(hospital|wounded|Eleventh|barn)', win=400, what="the Spangler hospital in the town books (county history of 1886, Hoke 1887, Reily 1885, Barton 1898)"),
    SR('CA', r'Spang[l1]er', near=r'(hospital|wounded|Eleventh|barn|Armistead)', win=400, what="the Spangler hospital in the 1863 newspaper pages saved by the web workstream"),
]
ROWS['T2-003']['register'] = REG("T2-003: hour of take-over, first wounded and counts other than 1,800 and 1,900 at the Spangler farm hospital",
    "the place and unit are documented (Sanitary Commission report of 1863; National Park Service) and the Sanitary Commission's figures 1,800 Union and 1,900 in all are sourced as approximate and undated; no text read gives the hour of take-over, the first wounded, the operations of the night or the counts 1,000, 1,500 and 2,000",
    "Show the XI Corps hospital at the Spangler farm as documented (place, unit), the Sanitary Commission's 1,900 (1,800 Union) as sourced and approximate, the take-over from the afternoon or evening of Jul 1 as inferred, and the wounded as the range 1,000-2,000 with all five values selectable (C-038).",
    'inferred', category='evidence missing', competing='1,000; 1,500; 1,800 (Sanitary Commission, Union); 1,900 (Sanitary Commission); 2,000 (C-038)', impact='Spangler hospital (T2-003, T1-205, T1-140 of tl-03, C-038)', ask='none (default C-038 recorded); the integrator may want to review the C-038 status note "no primary or institutional count found", which the Sanitary Commission report of 1863 now answers for 1,800 and 1,900')

# ------------------------------------------------------------------ T1-205: Union hospitals on the night of Jul 1
ussc_cites('T1-205', ['spang', 'fc', 'bush'])
ROWS['T1-205']['subs'].insert(3, SUB("The Eleventh Corps hospital occupied the house and farm of Geo. Spangler (Sanitary Commission report of Aug. 15, 1863)", 'documented', 'supported', ['ussc_spang'], "no hour or date of take-over is printed"))
ROWS['T1-205']['subs'].insert(4, SUB("Most of the wounded of Jul 1 were carried into the churches and public buildings of the town, under the organization of the First and Cavalry Corps, and were prisoners at the close of the day (Major Bush, in the Sanitary Commission report)", 'documented', 'supported', ['ussc_bush'], "a representative's note of what he learned of the first day; it says nothing of the hours of the night"))
ROWS['T1-205']['subs'].insert(5, SUB("The First Corps hospital had a portion in the town, in several churches and the Court-House, which held the wounded of the battle of July 1st, estimated at 400 to 450 including those in private houses (same report, a footnote on the corps hospitals)", 'documented', 'supported', ['ussc_fc'], "the count is an estimate made at a visit after the battle, not a count of the night of Jul 1"))
CF('T1-205', 8, claim="Other specifics of the night of Jul 1 at the Union hospitals (operations, lighting, supplies, the hours at which the corps hospitals were set up)", note="general statements and the places of the Jul 1 wounded are documented (above); nothing read gives the work of the night itself")
ROWS['T1-205']['remains'] = ["Spangler first wounded by about 16:00 on Jul 1; barn forebay operations and lantern light; the work of the night of Jul 1 at the hospitals (the places of the wounded are documented)."]
CL('T1-205', text=ROWS['T1-205']['claim']['text'] + " Added by the second reading: the Sanitary Commission's report of Aug. 15, 1863 says the Eleventh Corps hospital occupied the house and farm of Geo. Spangler, that most of the wounded of Jul 1 were carried into the churches and public buildings of the town and were prisoners at the close of the day (Major Bush), and that the First Corps hospital in the town held the wounded of Jul 1 in several churches and the Court-House, estimated at 400 to 450 with those in private houses.")
ROWS['T1-205']['searched'] += [SR('MED', r'(wounded)', near=r'(Wednesday|July 1st|first day|that night).{0,300}(churches|hospital|public buildings)', win=300, what="the wounded of the first day in the Sanitary Commission report and the 1864 letters")]

# ------------------------------------------------------------------ T1-203: wounded, burial and water on the night of Jul 1
ussc_cites('T1-203', ['fc', 'bush'])
ROWS['T1-203']['subs'].append(SUB("Most of the wounded of Jul 1 were carried into the churches and public buildings of the town, under the organization of the First and Cavalry Corps, and were prisoners at the close of the day (Major Bush, in the Sanitary Commission report of Aug. 15, 1863)", 'documented', 'supported', ['ussc_bush'], "this bears on where the wounded were at the close of Jul 1; it does not say that none were left between the lines"))
ROWS['T1-203']['subs'].append(SUB("The First Corps hospital in the town (several churches and the Court-House) held the wounded of the battle of July 1st, estimated at 400 to 450 including those in private houses (same report)", 'documented', 'supported', ['ussc_fc'], "an estimate made at a visit after the battle"))
CL('T1-203', text=ROWS['T1-203']['claim']['text'] + " Added by the second reading: the Sanitary Commission's report of Aug. 15, 1863 (Major Bush) says that most of the wounded of Jul 1 were carried into the churches and public buildings of the town and were prisoners at the close of the day, and puts the Jul 1 wounded of the First Corps hospital in the town at 400 to 450 including private houses; this places the greater part of the first day's wounded, not the wounded 'between the lines', and does not date any burial or water detail.")
ROWS['T1-203']['searched'] += [
    SR('MED', r'(buried|burial|burying|water|canteens)', near=r'(Wednesday|July 1st|first day|that night).{0,300}(wounded|dead)', win=300, what="burial and water for the first day's wounded in the Sanitary Commission report and the 1864 letters"),
    SR('TOWN', r'(wounded)', near=r'(Wednesday (night|evening)|night of the (first|1st)|first night).{0,300}(water|buried|burial|lantern|between the lines)', win=300, what="the first night's wounded, water and burial in the town books"),
    SR('CA', r'(wounded)', near=r'(Wednesday night|night of the first|first night).{0,300}(water|buried|burial|between the lines|left on the field)', win=300, what="the wounded of the first night in the 1863 newspaper pages saved by the web workstream"),
]
ROWS['T1-203']['remains'] = ["Wounded left between the lines, burial parties and water details on the night of Jul 1 (the places of most of the wounded are documented, the rest is not)."]


# ------------------------------------------------------------------ T1-200: the Herald's despatch (Culp's Hill works), found by the web workstream
HERALD_Q = ("for three or four bourn on Ihursdav the men of I hat com maud di<l their inmost to strengthen Utc place, and by two o'clook f. M had coast rue tad, with timber, stooea and e.rth, a good breastwork, "
            "wh.ch extended tha wltola length of tha ridge, aad which numerous nffioers ot tha corps affirmed they could bold against any force")
NC('T1-200', 'herald', LIB('CA-sn83030313-1863-07-06-p4', HERALD_Q,
   witness="The New York Herald, July 6, 1863, page 4: 'MR. GEO. W. HOSMER'S DESPATCH. Army of the Potomac, July 4, 1863' (a journalist's report written two days after the day, from what he saw and was told)",
   reading="for three or four hours on Thursday the men of that command did their utmost to strengthen the place, and by two o'clock P. M. had constructed, with timber, stones and earth, a good breastwork, which extended the whole length of the ridge, and which numerous officers of the corps affirmed they could hold against any force (reading from a crop of the page image made by the web-evidence workstream on 2026-11-13, see timeline_corrections/web-newspapers.jsonl, id T1-200; the image was not viewed again in this close-out)"))
SA('T1-200', "The New York Herald (Hosmer's despatch of Jul 4): 'for three or four hours on Thursday' the men of the Twelfth Corps did their utmost to strengthen the place and 'by two o'clock P. M.' had constructed, with timber, stones and earth, a good breastwork along the whole length of the ridge",
   'documented', 'supported', ['herald'], "a journalist's report; it prints a duration and an end hour for Thursday (Jul 2) and no start hour; the OCR text of the quote is damaged and the reading above comes from a page-image crop of the web workstream")
SN('T1-200', SCN('S5', "Works of the Twelfth Corps: 'three or four hours on Thursday' of work and a good breastwork by 'two o'clock P. M.' (the start hour is not printed; the printed hours imply a start in the late forenoon, an inference)",
                 "The New York Herald, July 6, 1863, Hosmer's despatch (journalist; written Jul 4)", 'documented', ['herald']))
RM('T1-200', "The start hour of the works in the Herald's account (only a duration and an end hour are printed) and whether 'the corps' there includes Greene's sector.")

# ------------------------------------------------------------------ the sky of the night of Jul 1-2: one more selectable value (clear moonlight)
MOON_Q = "from all quarters Union and rebel troops were hastening Wednesday night—marching in the clear light of the full moon toward that pleas ant town tor one of the greatest conflicts of modern times"
MOON_W = ("a narrative of the first day printed in at least three newspapers in July 1863 (Dodgeville, Wis., Jul 23 [read here]; also the Mineral Point weekly tribune of Jul 22 and the Caledonian of Jul 17); "
          "the writer is not named in the page text read and no place is given; one text printed in several papers is one witness; the OCR text was not read on the page image")
for rid in ('T1-190', 'T1-195', 'T1-219'):
    NC(rid, 'moon_news', LIB('CA-sn85033078-1863-07-23-p2', MOON_Q, witness=MOON_W))
    SA(rid, "A newspaper narrative of July 1863 says that on Wednesday night Union and rebel troops marched toward Gettysburg 'in the clear light of the full moon'", 'documented', 'supported', ['moon_news'],
       "no place is given and the writer is not named; it conflicts with Everett's 'veiled by thin clouds' and Burling's 'very dark', which are carried beside it")
    SN(rid, SCN('S3', "The full moon shone clear (troops marching on Wednesday night 'in the clear light of the full moon')", "newspaper narrative printed Jul 17-23, 1863 (one text in three papers), no place or hour", 'documented', ['moon_news']))
RM('T1-190', "Which of the three readings of the sky (veiled by thin clouds, largely hidden, clear) holds at Gettysburg on the evening of Jul 1: no first-hand statement at Gettysburg.")

# ------------------------------------------------------------------ T1-197: iron railings, tombstones and monuments of the cemetery (1863 newspapers)
NC('T1-197', 'news_rail', LIB('CA-sn85033019-1863-07-23-p1',
   "His battery horses are knocked to pieces, the tombstones are knocked over, iron railings torn, shrubs and trees cut down, here and there a limb damaged, but he is not silenced.",
   witness="Dodgeville Chronicle (Dodgeville, Wis.), July 23, 1863, page 1: 'Special correspondence of the Boston Journal. A Graphic Account of the Third Day's Battle at Gettysburg' (the cannonade of Friday Jul 3 against Howard's batteries in the cemetery)"))
NC('T1-197', 'news_mon', LIB('CA-sn84022549-1863-07-10-p2',
   "Gen. Howard's headquarters were in the Cemetery, and were raked in a fearful man ner ; men fell all around him, but himself and staff escaped. The silent abode of the dead was made the theatre of deadly conflict. Tombstone and beautiful monuments were demolished ; great holes were torn in the earth by the explosion of shells",
   witness="Bellows Falls Times (Bellows Falls, Vt.), July 10, 1863, page 2: a narrative of the cannonade that preceded the infantry attack on the centre (Jul 3)"))
NC('T1-197', 'news_traces', LIB('CA-sn84031490-1863-07-12-p2',
   "Monuments and. headstones lie here and there overturned. Graves, once carefully tended by gome loving band, have been tram pled by horses' feet until the vestiges of ver dure have disappeared.",
   witness="Chicago Daily Tribune, July 12, 1863, page 2: 'TRACES OF THE STRUGGLE AT THE CEMETERY' (a visitor's description after the battle)"))
CF('T1-197', 8, claim="Iron railings were torn, tombstones knocked over and monuments demolished or overturned in the cemetery, and graves trampled by horses (newspapers of July 1863: the Boston Journal's correspondent on the cannonade of Jul 3, a narrative of the same cannonade, and a visitor's account after the battle)",
   tier='documented', support='supported', keys=['news_rail', 'news_mon', 'news_traces'],
   note="contemporary newspaper statements; the National Park Service report names no iron fence or monument, which the Chicago visitor and the two narratives do; the papers date the damage to the cannonade of Jul 3 (and the visitor to the days after the battle), not to the evening of Jul 1")
CL('T1-197', text=ROWS['T1-197']['claim']['text'] + " Added by the second reading: newspapers of July 1863 say that in the cannonade of Jul 3 the tombstones were knocked over and iron railings torn (Boston Journal's correspondent, printed Jul 23), that tombstones and beautiful monuments were demolished (Bellows Falls Times, Jul 10), and that monuments and headstones lay overturned and graves were trampled by horses (Chicago Daily Tribune, Jul 12); none dates this damage to the evening of Jul 1.")
RM('T1-197', replace=True, *["The Jul 1 evening share of the cemetery damage (the newspapers date the iron railings, tombstones and monuments to the cannonade of Jul 3); a contemporary (1863) description of the damage of Jul 1 itself."])
ROWS['T1-197']['searched'] += [SR('CA', r'(head-?stones?|tomb-?stones?|monuments?|iron rail)', near=r'(Cemetery|Evergreen|Howard).{0,300}(knock|overturn|demolish|torn|destroy|trampled)', win=300, what="damage to tombstones, monuments and iron railings in the cemetery in the 1863 newspaper pages saved by the web workstream")]

# ------------------------------------------------------------------ T1-214 / T1-218: civilians in the cellars (a relief worker's letter of July 22, 1863, second-hand)
SOU_CELL = LIB('SOUDER-LEAVES-1864', "The inmates of many houses hid themselves in their cellars. The rebels lay all about the streets and in the yards.",
               witness="letter of a relief worker (E. B. S.) dated Gettysburg, July 22, 1863, printed in 1864; what residents told her, second-hand; it speaks of the days of the occupation and gives no hour")
for rid in ('T1-214', 'T1-218'):
    NC(rid, 'sou_cellar', SOU_CELL)
SA('T1-214', "Residents' accounts of July 1863: 'The inmates of many houses hid themselves in their cellars. The rebels lay all about the streets and in the yards.' (letter of Jul 22, 1863, second-hand; the days of the occupation, no hour)",
   'documented', 'supported', ['sou_cellar'], "it does not separate the night of Jul 1 from the other nights of the occupation")
CF('T1-214', 7, note="Jacobs says the women and children went into the cellars 'whilst actual fighting was going on'; a relief worker's letter of Jul 22, 1863 says the inmates of many houses hid in their cellars while the rebels lay about the streets (second-hand, no hour); the night of Jul 1 itself is not separated")
SA('T1-218', "Residents' accounts of July 1863: 'The inmates of many houses hid themselves in their cellars. The rebels lay all about the streets and in the yards.' (letter of Jul 22, 1863, second-hand; the days of the occupation, no hour)",
   'documented', 'supported', ['sou_cellar'], "it does not separate the night of Jul 1 from the other nights of the occupation")
for rid in ('T1-214', 'T1-218'):
    ROWS[rid]['searched'] += [
        SR('MED', r'cellars?', near=r'(rebels?|Confederate|battle|women|children)', win=300, what="civilians in cellars in the Sanitary Commission report and the 1864 letters"),
        SR('TOWN', r'cellars?', near=r'(Wednesday|first day|night|rebel|Confederate).{0,300}(Gettysburg|town)', win=300, what="civilians in cellars in the town books"),
        SR('CA', r'cellars?', near=r'(Gettysburg).{0,400}(rebel|battle|shell|sharp-?shooters)', win=400, what="civilians in cellars in the 1863 newspaper pages saved by the web workstream")]

# ------------------------------------------------------------------ T1-186: Rodes' own reasons for not advancing on the evening of Jul 1
R506 = 'OR27-2-R506'
NC('T1-186', 'rod_ge', OR("the corps commander informed me, through one of his officers, that the general commanding did not wish a general engagement brought on", R506, '555'))
NC('T1-186', 'rod_why', OR("the enemy had begun to establish a line of battle on the heights back of the town, and by the time my line was in a condition to renew the attack, he displayed quite a formidable line of infantry and artillery immediately in my front, extending smartly to my right, and as far as I could see to my left, in front of Early. To have attacked this line with my division alone, diminished as it had been by a loss of 3,600 men, would have been absurd", R506, '555',
                           note="the OCR text of the archive.org item reads 'a loss of 3,600 men'; the page image (PDF page 561 of cu31924077728255.pdf, printed page 555, looked at on the rendered image and read by a second OCR, tesseract) prints 'a loss of 2,500 men'",
                           reading="diminished as it had been by a loss of 2,500 men, would have been absurd (page image; the OCR text reads 3,600)"))
NC('T1-186', 'rod_early', OR("Seeing no Confederate troops at all on my right; finding that General Early, whom I encountered in the streets of the town within thirty minutes after its occupation by our forces, was awaiting further instructions, and, receiving no orders to advance, though my superiors were upon the ground, I concluded that the order not to bring on a general engagement was still in force", R506, '555'))
SA('T1-186', "Rodes: the corps commander had told him in the midst of the engagement that the general commanding did not wish a general engagement brought on; the enemy was forming a line on the heights back of the town and displayed 'quite a formidable line of infantry and artillery' in his front; to attack it with his division alone, diminished by a loss of 2,500 men (the page image prints 2,500; the OCR text reads 3,600), 'would have been absurd'; seeing no Confederate troops on his right and Early awaiting instructions he concluded the order against a general engagement was still in force",
   'documented', 'supported', ['rod_ge', 'rod_why', 'rod_early'], "Rodes' own report; the figure 2,500 agrees with Early's 1877 'about 2,500' (SUB7); the digits were read on the page image because the OCR text is damaged", pos=8)
CL('T1-186', text=ROWS['T1-186']['claim']['text'] + " Rodes' own report (p.555) adds that the corps commander had told him in the midst of the engagement that the general commanding did not wish a general engagement brought on, that the enemy was forming a formidable line on the heights back of the town, and that to attack it with his division alone, diminished by a loss of 2,500 men (the page image prints 2,500; the archive.org OCR text reads 3,600), 'would have been absurd'; Early's 1877 figure for the same loss is about 2,500.")

# ------------------------------------------------------------------ T1-188: later texts on Lee's headquarters and the cupola
NC('T1-188', 'sou_hq', LIB('SOUDER-LEAVES-1864', "In the afternoon we rode to Seminary Hill, and saw Lee's headquarters and the spot where General Reynolds fell.",
   witness="a relief worker's letter of the day of the consecration of the cemetery, Nov 1863 ('Consecration ceremonies'), printed 1864"))
NC('T1-188', 'hoke_hq', LIB('HOKE-1887', "Along this road, a short distance out, stands a stone house in which General Lee had his headquarters."))
NC('T1-188', 'hoke_cupola', LIB('HOKE-1887', "That large white building to your left is Pennsylvania College. It was used as a hospital during the battle, and from its cupola General Lee took observations"))
SA('T1-188', "A relief worker's letter of the consecration day (Nov 1863): 'In the afternoon we rode to Seminary Hill, and saw Lee's headquarters and the spot where General Reynolds fell.'", 'documented', 'supported', ['sou_hq'], "a place known as Lee's headquarters on Seminary Hill by Nov 1863; no day, no hour, no house named")
SA('T1-188', "Hoke (1887): on the Chambersburg Pike, a short distance out, stands a stone house in which General Lee had his headquarters", 'inferred', 'supported', ['hoke_hq'], "a later book (twenty-four years after); no day or hour; the house is not named")
SA('T1-188', "Hoke (1887): Pennsylvania College 'was used as a hospital during the battle, and from its cupola General Lee took observations'", 'inferred', 'supported', ['hoke_cupola'], "a later book; no day or hour; the seed's Lee in a cupola is a rumour in the seed itself, which the other row of the plan (T1-049, shard tl-01) carries as scenarios")
CL('T1-188', text=ROWS['T1-188']['claim']['text'] + " Added by the second reading: a relief worker's letter of the consecration day (Nov 1863) says the party 'saw Lee's headquarters' on Seminary Hill; Hoke (1887) places Lee's headquarters in a stone house a short distance out on the Chambersburg Pike and says Lee took observations from the cupola of Pennsylvania College (a later book; no day, no hour, no house named).")
ROWS['T1-188']['searched'] += [
    SR('TOWN', r"(Lee's|General Lee's) (head-?quarters)", near=r'(Seminary|Chambersburg|stone house|Thompson|first day|July 1)', win=300, what="Lee's headquarters in the town books"),
    SR('MED', r"(Lee's|General Lee's) (head-?quarters)", near=r'(Seminary|Chambersburg|stone house|Thompson)', win=300, what="Lee's headquarters in the Sanitary Commission report and the 1864 letters"),
    SR('CA', r"(Lee's|General Lee's) (head-?quarters)", near=r'(Seminary|Chambersburg|Thompson|stone house|Gettysburg)', win=300, what="Lee's headquarters in the 1863 newspaper pages saved by the web workstream")]


# ================================================================== 5. further searches over the texts that were local after the first pass (TOWN, MED, CA), logged with their hit counts
def ADDS(rid, *specs):
    ROWS[rid]['searched'].extend(specs)


EXT3 = ('TOWN', 'MED', 'CA')
for sc in EXT3:
    ADDS('T1-206', SR(sc, r'K[lI1][il1]ng[l1e]{1,2}\b', what="Klingel or Klingle (OCR variants) in the %s texts" % sc))
    ADDS('T1-207', SR(sc, r'\bRose\b', near=r'(farm|barn|wheat|cavalry|Buford|Gamble|Devin|Merritt)', win=250, what="the Rose farm with cavalry or a wheat field in the %s texts" % sc))
    ADDS('T1-208', SR(sc, r'\bLady\b', near=r'(farm|house|barn|hospital|Daniel).{0,250}(wounded|Confederate|rebel|hospital)', win=300, what="the Lady farm as a Confederate hospital in the %s texts" % sc))
    ADDS('T1-213', SR(sc, r'(unburied|lay where they fell|lying where they fell|buried|burying)', near=r'(Wednesday|first day|July 1|McPherson|Seminary|Oak Ridge)', win=250, what="burial of the dead of the first day in the %s texts" % sc))
    ADDS('T1-214', SR(sc, r'(camp-?fires?|watch-?fires?|lanterns?|candles?)', near=r'(Wednesday (night|evening)|first night|night of the (first|1st))', win=250, what="fires and lights on the night of Jul 1 in the %s texts" % sc))
    ADDS('T1-218', SR(sc, r'(search(ed|ing)|ransack\w*|pillag\w*|plunder\w*|rifled)', near=r'(houses?|cellars?|garrets?)', win=200, what="house searches and plunder in the town in the %s texts" % sc))
for rid in ('T1-189', 'T1-190', 'T1-195', 'T1-219'):
    for sc in ('TOWN', 'MED', 'CA'):
        ADDS(rid, SR(sc, r'\bmoon(-?light|-?shine)?\b', near=r'(Wednesday|Thursday|first day|march|bivouac|Gettysburg).{0,200}(night|clouds?|dark|clear)', win=300, what="the moon on the night of Jul 1 in the %s texts" % sc))
for rid in ('T1-189', 'T1-190'):
    ADDS(rid, SR('CA', r'\b(cloudy|overcast|rain(ed|ing|y)?|clear sky|cloudless|sultry|oppressive)\b', near=r'(Wednesday|July 1|first day).{0,200}(Gettysburg|battle)', win=300, what="the weather of Wednesday Jul 1 at Gettysburg in the 1863 newspaper pages saved by the web workstream"))
    ADDS(rid, SR('TOWN', r'\b(cloudy|overcast|rain(ed|ing|y)?|clear sky|cloudless|sultry|oppressive)\b', near=r'(Wednesday|July 1|first day).{0,200}(Gettysburg|battle)', win=300, what="the weather of Wednesday Jul 1 at Gettysburg in the town books"))
for sc in EXT3:
    ADDS('T1-225', SR(sc, r'\b(fog|foggy|mist|misty|hazy|haze)\b', near=r'(Thursday|July 2|second day|morning).{0,200}(Gettysburg|battle|Cemetery|Culp)', win=300, what="the fog or mist of the morning of Jul 2 in the %s texts" % sc))
    ADDS('T1-183', SR(sc, r'(earthworks?|breast-?works?|intrench\w*|epaulements?)', near=r'(Cemetery Hill|cemetery gate|Wiedrich|Stewart|Cooper|Reynolds).{0,250}(night|dusk|evening|Wednesday)', win=300, what="light works at the batteries of Cemetery Hill on the evening of Jul 1 in the %s texts" % sc))
for sc in ('TOWN', 'MED'):
    ADDS('T1-203', SR(sc, r'(water|canteens?)', near=r'(wounded).{0,200}(Wednesday|first day|first night|July 1)', win=250, what="water for the wounded of the first day in the %s texts" % sc))


# ================================================================== 6. a digit that the OCR text of the archive.org item prints wrongly: Geary's hour of advance (page image: 2 p. m.)
# Official Records part 1, PDF page 849 (cu31924077699761.pdf), printed page 825: the OCR text reads 'at about 3 p. m. advanced rapidly on the road to the town'; the page
# image, looked at on the rendered page (crop of the line, head '825'), and a second OCR (tesseract) read 'at about 2 p. m.'.  Geary left Two Taverns at about 2 p.m.
GEARY_READING = ("at about 2 p. m. advanced rapidly on the road to the town (read on the page image: printed page 825, PDF page 849 of cu31924077699761.pdf; "
                 "the archive.org OCR text reads 3 p. m.)")
GEARY_NOTE = "the OCR text of the archive.org item prints '3 p. m.'; the page image prints '2 p. m.' (looked at on the rendered page and read by a second OCR)"
for rid in ('T1-176', 'T2-005'):
    c = ROWS[rid]['cites']['g_3pm']
    c['reading'] = GEARY_READING
    c['note'] = GEARY_NOTE
    cl = ROWS[rid]['claim']
    n_rep = 0
    for f in ('event', 'when', 'basis', 'text'):
        v = cl[f]
        for old, new in (("about 3 p.m.", "about 2 p.m."), ("advanced at about 3 p.m.", "advanced at about 2 p.m."), ("Geary advanced about 3 p.m.", "Geary advanced about 2 p.m."),
                         ("Geary advances about 15:00", "Geary advances about 14:00"), ("Jul 1, 15:00 to about 19:00", "Jul 1, 14:00 to about 19:00"),
                         ("the start 15:00 is the hour Geary printed for the advance from Two Taverns", "the start 14:00 is the hour Geary printed for the advance from Two Taverns (the page image prints 2 p. m.; the archive.org OCR text reads 3 p. m.)"),
                         ("the start 15:00 is Geary's printed hour for the advance", "the start 14:00 is Geary's printed hour for the advance (the page image prints 2 p. m.; the archive.org OCR text reads 3 p. m.)"),
                         ("15:00 advance, 17:00 in position", "14:00 advance, 17:00 in position")):
            if old in v:
                v = v.replace(old, new)
                n_rep += 1
        cl[f] = v
    if cl.get('start') == '1863-07-01T15:00':
        cl['start'] = '1863-07-01T14:00'
        n_rep += 1
    assert n_rep >= 4, (rid, n_rep)
CF('T1-176', 2, claim="Geary reached Two Taverns at 11 a.m. and about 2 p.m. (page image; the OCR text reads 3 p. m.) advanced rapidly on the road to the town")
CF('T2-005', 1, claim="Geary: about 2 p.m. (page image; the OCR text reads 3 p. m.) advanced rapidly on the road to the town; by 5 p.m. his line was on the extreme left, two regiments of the First Brigade on the hills south and west of the town")
RM('T1-176', "Geary's hour of advance is 2 p. m. on the page image of printed page 825; the OCR text of the archive.org item reads 3 p. m., which the first close-out and the seed's source chain carried (corrected here).")


# ------------------------------------------------------------------ T1-191: Wright's march 'from 32 to 35 miles' (page image of printed page 665; the OCR text reads 33)
c = ROWS['T1-191']['cites']['w_arr']
c['note'] = "the OCR text of the archive.org item prints \"33'\"; the page image (printed page 665, PDF page 689 of cu31924077699761.pdf, looked at on the rendered page and read by a second OCR) prints '32' followed by a small footnote mark"
c['reading'] = "after a march variously estimated at from 32 to 35 miles (read on the page image; the OCR text reads 33)"
cl = ROWS['T1-191']['claim']
nrep = 0
for f in ('event', 'when', 'basis', 'text'):
    for old, new in (("33 to 35 miles", "32 to 35 miles"), ("33-35 miles", "32-35 miles"), ("33 to 35", "32 to 35")):
        if old in cl[f]:
            cl[f] = cl[f].replace(old, new)
            nrep += 1
assert nrep >= 1, nrep
CF('T1-191', 3, claim="The corps arrived at Gettysburg about 4 p.m. after a march variously estimated at from 32 to 35 miles (page image; the OCR text reads 33)")
ROWS['T1-191']['recheck'] = (ROWS['T1-191']['recheck'] or '') + " Second reading of 2026-11-16: the page image of printed page 665 prints 'from 32 to 35 miles' where the OCR text reads 33; the row now says 32 to 35."


# ------------------------------------------------------------------ T1-188 sub-claim 4: the caption words 'as repaired after the battle, September 1866' were not in its quotations
NC('T1-188', 'nps_clr_cap', LIB('NPS-CLR-1STDAY', "Chambersburg Pike as repaired after the battle, September 1866.",
   note="fragment of the caption of Figure 1.17 ('The Mary Thompson house, looking north across the Chambersburg Pike as repaired after the battle, September 1866'); the text layer of the two-column page interleaves the caption with other lines, so the caption is cited as the contiguous fragments of which this is the second"))
NC('T1-188', 'nps_clr_cap0', LIB('NPS-CLR-1STDAY', "Figure 1.17. The Mary Thompson house, looking north across the", note="first fragment of the same caption (see nps_clr_cap)"))
CF('T1-188', 4, keys=['nps_clr_lossing', 'nps_clr_cap', 'nps_clr_cap0', 'nps_clr_hq'])


# ------------------------------------------------------------------ place wording: 'on the Baltimore pike' for the Spangler farm is in none of the texts read for these rows
CL('T2-003', place="George Spangler farm (Hospital Road; the 1932 NPS list puts the tablet 700 feet east of the house)",
   event=ROWS['T2-003']['claim']['event'].replace("the house and farm of George Spangler on the Baltimore pike side of the field (", "the house and farm of George Spangler ("))
CL('T1-205', place="George Spangler farm (Hospital Road) and the other corps hospitals; the churches and public buildings of the town")
CL('T2-003', unit="XI Corps hospital staff, the divisions consolidated under Dr. Armstrong (Sanitary Commission report); the seed's Spangler family in an upstairs room is not in any text read")
RM('T2-003', "That the Spangler family stayed in an upstairs room (seed detail; no passage read).")


# ------------------------------------------------------------------ names of the unit fields that no quotation carried (Colgrove in T1-201, Graham in T1-192)
QX('T1-201', 'r_9am', "I turned over the command of my brigade, the Third, to Col. Silas Colgrove, Twenty-seventh Indiana Volunteers, senior colonel, and assumed command of the division. About 9 a. m. I received orders from General Williams, commanding corps, to move the division by the Baltimore turnpike toward Gettysburg, and place it in position next on the right of the Second Division of the corps")
NC('T1-192', 'oob_birney', OR("FIRST DIVISION. Maj. Gen. David B. Birney. Brig. Gen. J. H. Hobart Ward. First Brigade. Brig. Gen. Charles K. Graham.", 'OR27-1-R009', None,
                              note="organization of the Army of the Potomac, June 30 to Jul 3 (Third Corps, First Division): the heading of each brigade names its commander; the brigade lines that follow are not quoted"))
CF('T1-192', 1, keys=['b_2pm', 'oob_birney'], note="the Third Brigade (De Trobriand) stayed at Emmitsburg; the brigade commanders Graham (First) and Ward (Second) are from the Organization of the Army of the Potomac (Official Records vol. 27 part 1)")

# ------------------------------------------------------------------ Souder p.137: the head of that page is damaged in the OCR text ('lo7'); the heads before and after read 136 and 138
ROWS['T1-188']['cites']['sou_hq']['page'] = '137'
ROWS['T1-188']['cites']['sou_hq']['page_basis'] = "the running heads before and after the passage read 136 and 138 (CONSECRATION CEREMONIES); the head of the page between them is damaged in the OCR text ('lo7'), so the page is 137 (not read on the page image)"
