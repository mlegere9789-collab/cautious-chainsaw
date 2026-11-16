"""Apply the fifth-incarnation edits to tmp/tl-02/rows_*.py, tl2lib.py (exact-once replacements; every old string must occur exactly the stated number of times)."""
import os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
T = os.path.join(ROOT, 'tmp', 'tl-02')
P = os.path.join(T, 'ver2', 'patch')
def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)
log = []
def rep(s, old, new, n=1, tag=''):
    c = s.count(old)
    if c != n:
        raise SystemExit('PATCH FAILED %s: expected %d occurrence(s), found %d of:\n%s' % (tag, n, c, old[:300]))
    log.append('%s x%d' % (tag, c))
    return s.replace(old, new)
def splice(s, start_pat, end_pat, new, tag):
    a = s.index(start_pat)
    m = re.search(end_pat, s[a:])
    if not m: raise SystemExit('no end for ' + tag)
    b = a + m.start()
    log.append('splice ' + tag)
    return s[:a] + new + s[b:]

# ------------------------------------------------------------------ tl2lib
s = rd(os.path.join(T, 'tl2lib.py'))
s = rep(s, "def OR(quote, report=None, page=None, note=None, supports=None, witness=None):\n    d = dict(src='OR27', quote=quote, report=report, page=page)\n    if note: d['note'] = note\n    if supports: d['supports'] = supports\n    if witness: d['witness'] = witness\n    return d",
        "def OR(quote, report=None, page=None, note=None, supports=None, witness=None, reading=None):\n    d = dict(src='OR27', quote=quote, report=report, page=page)\n    if note: d['note'] = note\n    if supports: d['supports'] = supports\n    if witness: d['witness'] = witness\n    if reading: d['reading'] = reading\n    return d", tag='tl2lib OR reading')
s = rep(s, "    'PIERCE-F-1914': 'F. C. Pierce, The Battle of Gettysburg, the Crest-Wave of the American Civil War (1914)',",
        "    'PIERCE-F-1914': 'F. C. Pierce, The Battle of Gettysburg, the Crest-Wave of the American Civil War (1914)',\n    'DTIC-ADA207999': 'A. W. Cameron (LTC, U.S. Army), A Communicator\\'s Guide to the Gettysburg Campaign (U.S. Army War College study project, Carlisle Barracks, 1989; DTIC ADA207999)',", tag='tl2lib LABEL')
s = rep(s, "    'CHANC-1910': 'secondary study (1910) of the spring 1863 campaign, quoting cavalry practice in general; not a report of the Gettysburg campaign',\n}",
        "    'CHANC-1910': 'secondary study (1910) of the spring 1863 campaign, quoting cavalry practice in general; not a report of the Gettysburg campaign',\n    'DTIC-ADA207999': 'secondary: U.S. Army War College study project (1989; a U.S. Government work) that prints a letter of 18 Oct 1865 by the signal officer (original in the Bachelder Papers, not seen) and quotes official reports',\n}", tag='tl2lib CLASS')
wr(os.path.join(T, 'tl2lib.py'), s)

# ------------------------------------------------------------------ rows_a
s = rd(os.path.join(T, 'rows_a.py'))
s = rep(s, """     'dbl_400': OR('about 400 yards to the west of the seminary', 'OR27-1-R029', '244'),""",
        """     'dbl_400': OR("soon overtook Wadsworth's division, which had left the main road and was filing rapidly through woods and fields toward a ridge which ran north and south, about 400 yards to the west of the seminary", 'OR27-1-R029', '244'),""", tag='a dbl_400')
s = rep(s, """SUB('At Dover Stuart could learn only that Early had marched in the direction of Shippensburg, and pushed on for Carlisle', 'documented', 'supported', ['stu_early']),""",
        """SUB('At Dover Stuart could learn only that Early had marched in the direction of Shippensburg, and pushed on for Carlisle', 'documented', 'supported', ['stu_early', 'stu_carl']),""", tag='a T1-065 sub')
s = rep(s, """     'stu_early': OR('The most I could learn was that General Early had marched his division in the direction of', 'OR27-2-R565', '696', note='the sentence continues "Shippensburg" (OCR "Shippeusburg"); the next sentence has the march on Carlisle'),""",
        """     'stu_early': OR('The most I could learn was that General Early had marched his division in the direction of', 'OR27-2-R565', '696', note='the sentence continues "Shippensburg" (OCR "Shippeusburg"); the next sentence has the march on Carlisle'),
     'stu_carl': OR('After as little rest as was compatible with the exhausted condition of the command, we pushed on for Carlisle, where we hoped to find a portion of the army.', 'OR27-2-R565', '696'),""", tag='a T1-065 cite')
s = rep(s, """SUB('At Dover Stuart could learn only that Early had marched toward Shippensburg, and pushed on for Carlisle', 'documented', 'supported', ['stu_early']),""",
        """SUB('At Dover Stuart could learn only that Early had marched toward Shippensburg, and pushed on for Carlisle', 'documented', 'supported', ['stu_early', 'stu_carl']),""", tag='a T1-069 sub')
s = rep(s, """     'stu_early': OR('The most I could learn was that General Early had marched his division in the direction of', 'OR27-2-R565', '696', note='the sentence continues "Shippensburg" (OCR "Shippeusburg")'),""",
        """     'stu_early': OR('The most I could learn was that General Early had marched his division in the direction of', 'OR27-2-R565', '696', note='the sentence continues "Shippensburg" (OCR "Shippeusburg")'),
     'stu_carl': OR('After as little rest as was compatible with the exhausted condition of the command, we pushed on for Carlisle, where we hoped to find a portion of the army.', 'OR27-2-R565', '696'),""", tag='a T1-069 cite')
s = rep(s, """SUB('III Corps reached Emmitsburg on Jul 1 (the row\\'s "Emmitsburg area" is the Jul 1 destination)', 'documented', 'supported', ['carr_em']),""",
        """SUB('III Corps reached Emmitsburg on Jul 1 (the row\\'s "Emmitsburg area" is the Jul 1 destination)', 'documented', 'supported', ['carr_em', 'carr_em2']),""", tag='a T1-066 sub2')
s = rep(s, """     'carr_em': OR('At 8 a. m, on Wednesday, July 1, left Bridgeport, and marched to', 'OR27-1-R160', '542', note='the sentence continues "Emmitsburg, reaching that place at 1,15 p. m."; the OCR prints "1,15"'),""",
        """     'carr_em': OR('At 8 a. m, on Wednesday, July 1, left Bridgeport, and marched to', 'OR27-1-R160', '542', note='the sentence continues "Emmitsburg, reaching that place at 1,15 p. m."; the OCR prints "1,15"'),
     'carr_em2': OR('Emmitsburg, reaching that place at 1,15 p. m.', 'OR27-1-R160', '542', note='continues the quotation before; a stray symbol stands before "Emmitsburg" in the OCR and is left out; the OCR prints "1,15" for the hour (second reading by tesseract: see audit/ocr2_report.txt)'),""", tag='a T1-066 cite carr_em2')
s = rep(s, """     'v_hq': OR('Headquarters Fifth Corps, Union Mills, June 30, 1863', 'OR27-3-D0935', '424'),""",
        """     'v_hq': OR('Headquarters Fifth Corps, Union Mills, June 30, 1863—6.30 p. m.', 'OR27-3-D0935', '424'),""", tag='a v_hq')
s = rep(s, """     'gam_notice': OR('the officer commanding the squadron on picket in front gave me notice that the enemy', 'OR27-1-R338', '934'),""",
        """     'gam_notice': OR('the officer commanding the squadron on picket in front gave me notice that the enemy, consisting of infantry and artillery, in column, were approaching his pickets from the direction of Cashtown, with deployed skirmishers in strong force, about 3 miles distant.', 'OR27-1-R338', '934'),""", tag='a gam_notice')
s = rep(s, """     'ooba_mar': OR('Capt. E. A. Marye.', 'OR27-2-R424', None),
     'ooba_bra': OR('Capt. T. A. Brander.', 'OR27-2-R424', None),
     'ooba_pee': OR('Pee Dee (South Carolina) Artillery', 'OR27-2-R424', None),
     'ooba_pur': OR('Capt. Joseph McGraw.', 'OR27-2-R424', None)},""",
        """     'ooba_mar': OR('Fredericksburg (Vii-ginia) Artillery, Capt. E. A. Marye.', 'OR27-2-R424', None, note='the OCR prints "Vii-ginia" for "Virginia"'),
     'ooba_bra': OR("Letcher (\\\\'irginia) Artillery, Capt. T. A. Brander.", 'OR27-2-R424', None, note='the OCR prints "(\\\\\\'irginia)" for "(Virginia)"'),
     'ooba_pee': OR('Pee Dee (South Carolina) Artillery , Lieut. William E. Zimmerman.', 'OR27-2-R424', None, note='the OCR prints a space before the comma'),
     'ooba_pur': OR("Purcell (Virginia) Artiller;', Capt. Joseph McGraw.", 'OR27-2-R424', None, note='the OCR prints "Artiller;\\'," for "Artillery,"')},""", tag='a Pegram batteries')
wr(os.path.join(T, 'rows_a.py'), s)

# ------------------------------------------------------------------ rows_b
s = rd(os.path.join(T, 'rows_b.py'))
s = rep(s, """     'hall_530': LIB('HALL-6NYCAV-1908', 'this exchange of shots between the Confederate videttes and a Ninth New York trooper is believed to have been the first fired at Gettysburg.', PG_HALL, witness='Hall, Besley and Wood, History of the Sixth New York Cavalry (1908)'),""",
        """     'hall_530': LIB('HALL-6NYCAV-1908', 'This occurred about 5.30 a.m., and this exchange of shots between the Confederate videttes and a Ninth New York trooper is believed to have been the first fired at Gettysburg.', PG_HALL, witness='Hall, Besley and Wood, History of the Sixth New York Cavalry (1908)'),""", tag='b hall_530')
old = """     'ny_marye': LIB('NY-GB-1900', "The opening gun of the battle was fired by the Confederates, the shot coming from a cannon in Marye's Virginia Battery, posted on the Chambersburg Pike on the first ridge west of Willoughby Run.", '10',"""
new = """     'ny_marye': LIB('NY-GB-1900', "The opening gun of the battle was fired by the Confederates, the shot coming from a cannon in Marye's Virginia Battery, posted on the Chambersburg Pike on the first ridge west of Willoughby Run. Calef's Horse Battery — A, Second United States Artillery— which was attached to Buford's Division, replied promptly from its position near the Chambersburg Pike, and the battle of Gettysburg began.", '10',"""
s = rep(s, old, new, tag='b ny_marye')
s = rep(s, """    {'gam_comp': OR('three squadrons of the Third Indiana, and two squadrons of the Twelfth Illinois Cavalry, about 1,600 strong, with Tidball\\'s battery', 'OR27-1-R338', '934'),""",
        """    {'gam_comp': OR('consisting of the Eighth New York, Eighth Illinois, three squadrons of the Third Indiana, and two squadrons of the Twelfth Illinois Cavalry, about 1,600 strong, with Tidball\\'s battery', 'OR27-1-R338', '934'),""", tag='b gam_comp')
s = rep(s, """    [SUB('Buford, 10.10 a.m.: Hill\\'s force advancing and "driving my pickets and skirmishers very rapidly"', 'documented', 'supported', ['buf_1010']),""",
        """    [SUB('Buford, 10.10 a.m.: Hill\\'s force advancing and "driving my pickets and skirmishers very rapidly"', 'documented', 'supported', ['buf_1010h', 'buf_1010']),""", tag='b T1-095 sub')
s = rep(s, """    {'buf_1010': OR('driving my pickets and skirmishers very rapidly', 'OR27-1-R337', '924'),""",
        """    {'buf_1010h': OR('Gettysburg, July 1, 1863—10.10 a. m.', 'OR27-1-R337', '924', note='time heading of Buford\\'s dispatch, printed in the line above the passage'),
     'buf_1010': OR('driving my pickets and skirmishers very rapidly', 'OR27-1-R337', '924'),""", tag='b buf_1010h')
# T1-086
s = rep(s, """     SUB('The signal officer in the belfry saw the First Corps flag; Buford climbed into the tower; Reynolds came up (New York commission history)', 'documented', 'supported', ['ny_belfry'], 'secondary'),""",
        """     SUB('Jerome, signal officer of Buford\\'s division (letter of 18 Oct 1865, printed in a 1989 U.S. Army study): Buford came up into the steeple of the Theological Seminary and looked at the enemy through his glass, then formed his small cavalry force (T1-092)', 'documented', 'supported', ['jer_glass', 'jer_src'], 'first-hand, written two years after the battle, printed second-hand; the original was not seen'),
     SUB('The signal officer in the belfry saw the First Corps flag; Buford climbed into the tower; Reynolds came up (New York commission history)', 'documented', 'supported', ['ny_belfry'], 'secondary'),""", tag='b T1-086 sub')
s = rep(s, """     'hall_white': LIB('HALL-6NYCAV-1908', "at the point of clanger on the old white horse", '440', witness='regimental address printed in Hall, Besley and Wood (1908)', note='the OCR prints "clanger"')},""",
        """     'hall_white': LIB('HALL-6NYCAV-1908', "at the point of clanger on the old white horse", '440', witness='regimental address printed in Hall, Besley and Wood (1908)', note='the OCR prints "clanger"'),
     'jer_glass': LIB('DTIC-ADA207999', 'General Buford came up and looked at them through my glass, and then formed his small cavalry force.', '9',
                      witness='A. B. Jerome, letter of 18 Oct 1865 to Maj. Gen. W. S. Hancock, as printed in LTC A. W. Cameron (1989)', note='page image read (PDF page 14 of DTIC_ADA207999.pdf)'),
     'jer_src': LIB('DTIC-ADA207999', '18 Oct, 1865, Bachelder Papers, U.S. Army Military History Institute', '10',
                    witness='LTC A. W. Cameron (1989), source line printed under the letter', note='the study gives the letter as "A. B. Jerome, Signal Officer, First Cavalry Division, Letter to Maj. Gen. W. S. Hancock, 18 Oct, 1865, Bachelder Papers, U.S. Army Military History Institute"; the original was not seen; page image read (PDF page 15)')},""", tag='b T1-086 cites')
s = rep(s, """Reynolds ride up to find him there; no report of the day states it.',""",
        """Reynolds ride up to find him there; Jerome\\'s own letter of 1865 (printed in a 1989 study) has Buford come up into the steeple and look through his glass (T1-092); no report of the day states it.',""", tag='b T1-086 text')
s = rep(s, """    remains=['Hour of the cupola observation; the 7-mile front figure; the horse\\'s name; no 1863 report places Buford in the cupola.'],""",
        """    remains=['Hour of the cupola observation; the 7-mile front figure; the horse\\'s name; no 1863 report places Buford in the cupola (the earliest first-hand statement is Jerome\\'s letter of 1865, printed in 1989: T1-092).'],""", tag='b T1-086 remains')
s = rep(s, """the name of the horse and the front figure remain open.',""",
        """the name of the horse and the front figure remain open. Review of 2026-11-15: Jerome\\'s own letter of 1865 (T1-092, found in a 1989 U.S. Army War College study) is a first-hand statement that Buford came up into the steeple of the Theological Seminary; an archive.org full-text search for "Grey Eagle" with Buford found no old text.',""", tag='b T1-086 recheck')
# T1-092 / T1-093 blocks
new = rd(os.path.join(P, 'new_t092_093.py'))
s = splice(s, "ROW('T1-092'", r"\n# -+ T1-094\n", new + '\n', 'b T1-092/093')
wr(os.path.join(T, 'rows_b.py'), s)

# ------------------------------------------------------------------ rows_c
s = rd(os.path.join(T, 'rows_c.py'))
s = rep(s, """     'how_1045': OR('General Reynolds attacked the enemy as soon as he arrived, with one division, about 10.45 a. m.', 'OR27-1-R243', '696', note='Howard\\'s dispatch, headed Headquarters Eleventh Corps, July 1, 1863, 5 p. m.'),""",
        """     'how_1045': OR('July 1, 1863—5 p. m. General: General Reynolds attacked the enemy as soon as he arrived, with one division, about 10.45 a. m.', 'OR27-1-R243', '696', note='Howard\\'s dispatch, headed Headquarters Eleventh Corps, July 1, 1863, 5 p. m.; the quotation begins with the date line of the heading'),""", tag='c how_1045')
s = rep(s, """'dbl_1000': OR('nearly 1,000 prisoners', 'OR27-1-R029', '245'),""",
        """'dbl_1000': OR('captured, after a sharp and desperate conflict, nearly 1,000 prisoners — all from Archer\\'s brigade — and reformed their lines on the high ground beyond the ravine', 'OR27-1-R029', '245'),""", n=2, tag='c dbl_1000')
s = rep(s, """     'dbl_hand': OR('The right section, while falling back, was charged', 'OR27-1-R029', '246'),""",
        """     'dbl_hand': OR('The right section, while falling back, was charged upon by the enemy\\'s skirmishers, and 4 of the horses of one piece shot. The cannoneers, however, drew off the piece by hand.', 'OR27-1-R029', '246'),""", tag='c dbl_hand')
s = rep(s, """    {'heth_hour': OR('After resting in line of battle for one hour or more', 'OR27-2-R549', '638'),""",
        """    {'heth_hour': OR('After resting in line of battle for one hour or more, orders were received to attack the enemy in my front, with the notification that General Pender\\'s division would support me.', 'OR27-2-R549', '638'),""", tag='c heth_hour')
s = rep(s, """    {'bar_church': LIB('BARTON-ANGELS-1898', 'The Catholic Church in Gettysburg was filled with sick and wounded.', '137', witness='George Barton, Angels of the Battlefield (1898)'),""",
        """    {'bar_church': LIB('BARTON-ANGELS-1898', 'The Catholic Church in Gettysburg was filled with sick and wounded. The stations of the cross hung around the walls, with a very large oil painting of St. Francis Xavier holding in his hand a crucifix.', '137', witness='George Barton, Angels of the Battlefield (1898)'),""", tag='c bar_church')
s = splice(s, "ROW('T1-103'", r"\n# -+ T1-104\n", rd(os.path.join(P, 'new_t103.py')), 'c T1-103')
s = splice(s, "ROW('T1-111'", r"\n# -+ T1-112\n", rd(os.path.join(P, 'new_t111.py')), 'c T1-111')
wr(os.path.join(T, 'rows_c.py'), s)
print('\n'.join(log))
print('PATCH OK')
