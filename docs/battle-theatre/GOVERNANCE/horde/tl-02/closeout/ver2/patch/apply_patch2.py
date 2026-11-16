"""Second pass of the fifth incarnation: hour statements of sources that were already local but not used (Jacobs 1864, New York vol. 1, Cheney, Tillie Pierce,
Beveridge, Meade 1913, regimental and brigade reports of the Official Records).  Every new quotation is matched verbatim by the builder."""
import os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
T = os.path.join(ROOT, 'tmp', 'tl-02')
MARK = 'Review of 2026-11-15 (second pass'
def q(s): return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"
def ORs(quote, report, page=None, note=None):
    return 'OR(%s, %s, %s%s)' % (q(quote), q(report), q(page) if page else 'None', (', note=' + q(note)) if note else '')
def LIBs(sid, quote, note=None, witness=None):
    return 'LIB(%s, %s, None%s%s)' % (q(sid), q(quote), (', witness=' + q(witness)) if witness else '', (', note=' + q(note)) if note else '')
def SUBs(claim, tier, support, keys, note=None):
    return 'SUB(%s, %s, %s, [%s]%s)' % (q(claim), q(tier), q(support), ', '.join(q(k) for k in keys), (', ' + q(note)) if note else '')
def SCNs(i, value, basis, tier, keys):
    return 'SCN(%s, %s, %s, %s, [%s])' % (q(i), q(value), q(basis), q(tier), ', '.join(q(k) for k in keys))
def SRs(scope, pattern, near, win, what):
    return 'SR(%s, %s, near=%s, win=%d, what=%s)' % (scope if scope in ('S_OR',) else q(scope), "r" + q(pattern), ("r" + q(near)) if near else 'None', win, q(what))
log = []
files = {f: open(os.path.join(T, f + '.py'), encoding='utf-8').read() for f in ('rows_a', 'rows_b', 'rows_c')}
def block(fn, rid):
    s = files[fn]
    a = s.index("ROW('%s'" % rid)
    m = re.search(r"\n# -+ T1-\d+\n", s[a + 10:])
    b = a + 10 + (m.start() if m else len(s) - a - 10)
    return a, b
def patch(fn, rid, subs=(), cites=(), scen=(), repl=(), recheck='', sr=()):
    a, b = block(fn, rid)
    blk = files[fn][a:b]
    if MARK in blk:
        raise SystemExit('%s already patched' % rid)
    if subs:
        m = re.search(r"\)\],\n    \{'", blk)
        assert m, (rid, 'subs end')
        blk = blk[:m.start()] + '),\n     ' + ',\n     '.join(subs) + "],\n    {'" + blk[m.end():]
    if cites:
        m = re.search(r"\)\},\n    (?=scenarios=|default=|remains=|recheck=|searched=|register=|related=)", blk)
        assert m, (rid, 'cites end')
        blk = blk[:m.start()] + '),\n     ' + ',\n     '.join(cites) + '},\n    ' + blk[m.end():]
    if scen:
        if re.search(r"\n    scenarios=\[\]", blk):
            blk = blk.replace('\n    scenarios=[]', '\n    scenarios=[' + ',\n               '.join(scen) + ']', 1)
        elif '\n    scenarios=[' in blk:
            i = blk.index('\n    scenarios=[')
            m = re.search(r"\)\],\n    (?=default=|remains=)", blk[i:])
            assert m, (rid, 'scen end')
            j = i + m.start()
            blk = blk[:j] + '),\n               ' + ',\n               '.join(scen) + '],\n    ' + blk[i + m.end():]
        else:
            m = re.search(r"\n    (?=default=|remains=|recheck=)", blk)
            assert m, (rid, 'remains anchor')
            blk = blk[:m.start()] + '\n    scenarios=[' + ',\n               '.join(scen) + '],' + blk[m.start():]
    for old, new in repl:
        assert blk.count(old) == 1, (rid, 'repl', old[:80], blk.count(old))
        blk = blk.replace(old, new)
    if recheck:
        m = re.search(r"(recheck='.*?)(',\n    searched=)", blk, re.S)
        assert m, (rid, 'recheck')
        blk = blk[:m.end(1)] + ' ' + MARK + '): ' + recheck.replace('\\', '\\\\').replace("'", "\\'") + blk[m.start(2):]
    if sr:
        m = re.search(r"searched=\[", blk)
        assert m, (rid, 'searched')
        blk = blk[:m.end()] + ',\n              '.join(sr) + ',\n              ' + blk[m.end():]
    files[fn] = files[fn][:a] + blk + files[fn][b:]
    log.append(rid)

HR = r"(?:\d{1,2}[.:]\d{2}|\d{1,2}[J½|]?) ?(?:[AaPp]\. ?[Mm]\b|o'clock)|\bnoon\b"
# ------------------------------------------------------------------------------------------------ T1-058
patch('rows_a', 'T1-058',
      subs=[SUBs('Jacobs (1864): on Tuesday Jun 30, at 9 1/2 a.m., a portion of Hill\'s corps advanced on the Chambersburg turnpike as far as the crest of the Seminary hill, half a mile north-west of Gettysburg, with about two dozen infantry pickets as far down as Mr. Shead\'s house; at 10 1/2 a.m. they withdrew toward Cashtown', 'documented', 'supported', ['jac_recon', 'jac_recon2'], 'a Gettysburg resident\'s account printed in 1864; the OCR reads "9J" and "10|" for 9 1/2 and 10 1/2 (printed pages 21 and 22 read on the page images of the item); Jacobs does not name the brigade (Heth names Pettigrew\'s)'),
            SUBs('The New York commission history (1900): about 10 o\'clock on the day before the battle Pettigrew\'s brigade of Heth\'s division appeared near the Lutheran Theological Seminary in the western suburbs of the town and halted, its pickets advancing close to the residences', 'documented', 'supported', ['ny_pett'])],
      cites=["'jac_recon': " + LIBs('JACOBS-1864', "At 9J a. m., a portion of Hill's corps advanced on the Chambersburg turnpike, as far as the crest of the Seminary hill, one-half of a mile northwest of Gettysburg, throwing about two dozen of infantry pickets as far down as Mr. Shead's house.", note='OCR reads "9J" for 9 1/2; the page image of printed page 21 reads "At 9½ A. M."', witness='Prof. M. Jacobs, 1864'),
             "'jac_recon2': " + LIBs('JACOBS-1864', "At 10| a. m., they again withdrew towards Cashtown, undoubtedly aware of the near approach of General Buford's Federal cavalry, which arrived in about an hour afterwards.", note='OCR reads "10|" for 10 1/2; the page image of printed page 22 reads "At 10½ A. M."', witness='Prof. M. Jacobs, 1864'),
             "'ny_pett': " + LIBs('NY-GB-1900', "About 10 o'clock, on the day before the battle, some Confederate infantry — Pettigrew's Brigade of Heth's Division— made their appearance near the Lutheran Theological Seminary in the western suburbs of the town and halted, their pickets advancing close to the residences along the outskirts.", witness='New York Monuments Commission, vol. 1')],
      scen=[SCNs('S4', 'Pettigrew\'s reconnaissance on Jun 30: at the Seminary hill about 09:30 and withdrawn about 10:30 (Jacobs); about 10:00 (New York 1900)', 'Jacobs 1864; New York at Gettysburg vol. 1', 'documented', ['jac_recon', 'jac_recon2', 'ny_pett'])],
      repl=[("when='Jun 30, evening (no hour in any source read)'", "when='Jun 30: the reconnaissance toward Gettysburg about 09:30-10:30 (Jacobs; New York 1900: about 10:00); Hill reached Cashtown in the evening (no hour in any source read)'"),
            ("remains=['The hour of Hill\\'s arrival and of the conference with Heth is not stated in any source read (the product shows \"evening\" only).']", "remains=['The hour of Hill\\'s arrival and of the conference with Heth is not stated in any source read (the product shows \"evening\" only); the hours of the reconnaissance come from Jacobs and the New York history, not from Heth or Pettigrew.']")],
      recheck='Jacobs 1864 (hours read on the page images of printed pages 21 and 22) and the New York history give the hours of the Jun 30 reconnaissance, which the first pass had not used.',
      sr=[SRs('LIB', HR, r'Pettigrew|Hill\'s corps|Seminary hill|Heth', 200, 'hours of the Jun 30 reconnaissance in the library')])
# ------------------------------------------------------------------------------------------------ T1-062
patch('rows_a', 'T1-062',
      subs=[SUBs('Hour of the arrival of Buford\'s cavalry in Gettysburg on Jun 30: 11 1/2 a.m. (Jacobs 1864), about 11 a.m. (Cheney 1901, 9th New York Cavalry), a little before noon (Tillie Pierce 1889), the afternoon (Beveridge 1891)', 'documented', 'conflict', ['jac_arr', 'chen_11', 'tp_noon', 'bev_aft'], 'the OCR reads "11J" for 11 1/2 (printed page 22 read on the page image) and "1 1" for 11')],
      cites=["'jac_arr': " + LIBs('JACOBS-1864', "At 11J A. M., 6,000 Federal cavalry, under General Buford, arrived, passing through Washington street to the Chambersburg turnpike", note='OCR reads "11J" for 11 1/2; the page image of printed page 22 reads "At 11½ A. M."', witness='Prof. M. Jacobs, 1864'),
             "'chen_11': " + LIBs('CHENEY-1901', "Buford's column entered Gettysburg about 1 1 a. m. and was given quite an ovation.", note='the OCR prints "1 1" for 11', witness='N. Cheney, History of the Ninth New York Cavalry (1901)'),
             "'tp_noon': " + LIBs('TPIERCE-1889', "A little before noon on Tuesday, June 30th, a great number of Union cavalry began to arrive in the town.", witness='Tillie Pierce, 1889'),
             "'bev_aft': " + LIBs('IL-MON-1892', "On the afternoon of June 30, 1863, the 1st and 2d brigades, Buford's division of cavalry, 8th Illinois in advance,", witness='Maj. J. L. Beveridge, address of 1891')],
      scen=[SCNs('S1', 'Buford\'s cavalry reached Gettysburg about 11:30', 'Jacobs 1864', 'documented', ['jac_arr']),
            SCNs('S2', 'Buford\'s column entered Gettysburg about 11:00', 'Cheney 1901', 'documented', ['chen_11']),
            SCNs('S3', 'a great number of Union cavalry began to arrive a little before noon', 'Tillie Pierce 1889', 'documented', ['tp_noon']),
            SCNs('S4', 'the two brigades marched through Gettysburg on the afternoon of Jun 30', 'Beveridge 1891', 'documented', ['bev_aft'])],
      recheck='the hour of Buford\'s arrival on Jun 30 is carried as four selectable values (Jacobs, Cheney, Tillie Pierce, Beveridge); only Jacobs\'s 11 1/2 had been named in the row text, without a quotation.',
      sr=[SRs('LIB', HR, r'Buford|cavalry', 160, 'hours of the arrival of Buford\'s cavalry on Jun 30 in the library')])
# ------------------------------------------------------------------------------------------------ T1-074
patch('rows_a', 'T1-074',
      subs=[SUBs('Howard sent an aide-de-camp at once to Reynolds to receive his orders; at 8 a.m. orders were received from him directing the corps to march to Gettysburg, and the column was set in motion', 'documented', 'supported', ['how_aide', 'how_8']),
            SUBs('Meade (1913): Howard with the Eleventh Corps had left the vicinity of Emmitsburg about 8.30 a.m. under orders from Reynolds to march to Gettysburg', 'documented', 'conflict', ['mea_830'], 'compiled account of 1913; Howard\'s own report has the column set in motion at 8 a.m.')],
      cites=["'how_aide': " + ORs('I immediately sent an aide-de-camp to General Reynolds to receive his orders.', 'OR27-1-R243', '701'),
             "'how_8': " + ORs('At 8 a. m. orders were received from him directing the corps to march to Gettysburg. The column was at once set in motion', 'OR27-1-R243', '701'),
             "'mea_830': " + LIBs('MEADE-LL-v2', "Howard, with the Eleventh Corps, had left the vicinity of Emmettsburg about 8.30 a. m., under orders from Reynolds to march to Gettysburg.", witness='George Meade (ed.), Life and Letters, vol. 2 (1913)')],
      scen=[SCNs('S1', 'the Eleventh Corps set in motion at 08:00 on Reynolds\' orders', 'Howard OR p.701', 'documented', ['how_8']),
            SCNs('S2', 'the Eleventh Corps left the vicinity of Emmitsburg about 08:30', 'Meade 1913', 'documented', ['mea_830'])],
      repl=[("remains=['Reynolds\\' own hour of receipt of the Jun 30/Jul 1 orders.']", "remains=['Reynolds\\' own hour of receipt of the Jun 30/Jul 1 orders (Howard: Reynolds\\' reply reached him at 8 a.m.; Reynolds\\' own receipt hour is not stated).']")],
      recheck='Howard\'s own report (the next lines after the 3.30 a.m. quotation) gives 8 a.m. for the order from Reynolds and the start of the column; Meade 1913 has about 8.30. They bound the hour at which Reynolds had acted on the orders but do not state it.',
      sr=[SRs('S_OR', HR, r'Eleventh Corps|Howard', 200, 'hour of the departure of the Eleventh Corps in the OR')])
# ------------------------------------------------------------------------------------------------ T1-077
patch('rows_b', 'T1-077',
      subs=[SUBs('Wright\'s brigade of Anderson\'s division, behind Mahone\'s brigade, was stopped about 1 mile from Cashtown at about 10 a.m. and took up the line of march along the turnpike toward Gettysburg again at about 1 p.m.', 'documented', 'supported', ['wri_10', 'wri_1'], 'one brigade of the division; Wright\'s report does not state when the division left its camp, Hill\'s says "on the morning of July 1"')],
      cites=["'wri_10': " + ORs("About 10 a. m., and when within about 1 mile of Cashtown (which is at the foot of the eastern slope of South Mountain), my command was stopped by the halt of Mahone's brigade in the road in my immediate front.", 'OR27-2-R539'),
             "'wri_1': " + ORs('I remained until about 1 p. m., when we again took up the line of march along the turnpike in the direction of Gettysburg.', 'OR27-2-R539')],
      repl=[("when='Jul 1 morning (start hour not stated); evening bivouac'", "when='Jul 1 morning (start hour not stated; Wright\\'s brigade was about 1 mile from Cashtown at about 10 a.m. and marched on again about 1 p.m.); evening bivouac'")],
      recheck='Wright\'s report (Anderson\'s division) gives hours for his brigade on the Cashtown road that the first pass had not used; the start hour of the division is still not stated.',
      sr=[SRs('S_OR', HR, r'Cashtown|Anderson|Mahone', 200, 'hours of Anderson\'s division on Jul 1 in the OR')])
# ------------------------------------------------------------------------------------------------ T1-078
patch('rows_b', 'T1-078',
      subs=[SUBs('Regiments of the First Corps began the march at different hours: 6 a.m. (16th Maine, Lt. Col. Farnham, and 13th Massachusetts, Lt. Col. Batchelder, of the Second Division), about 7 a.m. (the 97th New York left Emmitsburg; the 88th Pennsylvania was ordered to rejoin its brigade on the march) and 8 a.m. (the 151st Pennsylvania left its bivouac; the First Division)', 'documented', 'conflict', ['far_6', 'bat_6', 'whe_7', 'pat_7', 'mcf_8', 'wad_8'], 'different units began at different hours; the corps did not move as one at 8 a.m.')],
      cites=["'far_6': " + ORs('July 1. — Marched at 6 a. m. After proceeding a short distance, heard cannonading to the front.', 'OR27-1-R045'),
             "'bat_6': " + ORs('July 1. — Marched at 6 a. m. After proceeding about 4 miles, heard cannonading in front, our cavalry and flying artillery having engaged the advance of the enemy.', 'OR27-1-R046'),
             "'whe_7': " + ORs('On the morning of July 1, at 7 a. m., we left Emmitsburg,_Md., reaching Gettysburg, Pa., at 1 p. m. same day', 'OR27-1-R053', note='the OCR prints a stray underscore in "Emmitsburg,_Md."'),
             "'pat_7': " + ORs('we were ordered, about 7 a. m., to rejoin the brigade, which was then on the march to Gettysburg.', 'OR27-1-R054'),
             "'mcf_8': " + ORs("On the morning of July 1, 1863, at 8 a. m., the One hundred and fifty-first Regiment Pennsylvania Volunteers, under my command, moved from its bivouac on George Spangler's farm, about 6 miles from Emmitsburg, Md., and the same distance from Gettysburg, Pa.", 'OR27-1-R060')],
      scen=[SCNs('S1', 'about 06:00: Second Division regiments (Farnham, Batchelder) begin the march', 'OR vol. 27 pt. 1 (Farnham; Batchelder)', 'documented', ['far_6', 'bat_6']),
            SCNs('S2', 'about 07:00: the 97th New York leaves Emmitsburg; the 88th Pennsylvania is ordered to rejoin its brigade', 'OR vol. 27 pt. 1 (Wheelock; Patterson)', 'documented', ['whe_7', 'pat_7']),
            SCNs('S3', 'about 08:00: the First Division, the artillery brigade and the 151st Pennsylvania', 'Wadsworth, Wainwright, McFarland (OR)', 'documented', ['wad_8', 'wain_8', 'mcf_8'])],
      repl=[("when='Jul 1, 8 a.m. (march begins); camp stirring before that is inferred (05:00-07:00 not documented)'", "when='Jul 1, 8 a.m. for the First Division and the artillery; regiments of the Second Division marched at 6 a.m. and others at about 7 a.m.; camp stirring before 6 a.m. is inferred'"),
            ("remains=['Hour of camp activity before 8 a.m. (05:00-07:00 is an inference only).']", "remains=['Hour of camp activity before the marches (the row\\'s 05:00 is not stated; the earliest documented march hour is 6 a.m.).']")],
      recheck='regimental reports of the Second and Third Divisions give march hours of 6, 7 and 8 a.m.; the row\'s statement that the corps marched at 8 a.m. holds for the First Division and the artillery only.',
      sr=[SRs('S_OR', HR, r'Marched|marched|left (camp|Emmitsburg)|moved from', 120, 'march hours of the First Corps regiments in the OR')])
# ------------------------------------------------------------------------------------------------ T1-079
patch('rows_b', 'T1-079',
      subs=[SUBs('Ramseur\'s brigade of Rodes\'s division (4th North Carolina, Col. Grimes): on Jul 1 encamped near Heidlersburg and under arms and on the march by sunrise', 'documented', 'supported', ['gri_sun'], 'one regiment; sunrise at Gettysburg was 04:35 LMT (computed, T1-075)'),
            SUBs('Johnson\'s division: Jones\'s brigade left camp at 7 a.m. on Jul 1, the second brigade in the division column', 'documented', 'supported', ['jon_7'], 'a different division of the Second Corps from Rodes and Early'),
            SUBs('Jacobs (1864): as early as 10 a.m. the divisions of Rodes and Early had moved from Heidlersburg, by a rapid march, to within a short distance of the right of the Union line', 'documented', 'conflict', ['jac_10'], 'a resident\'s impression; Daniel (OR p.566) was within 2.5 miles about 12 m.')],
      cites=["'gri_sun': " + ORs('On Wednesday, July 1, we were encamped near Heidlersburg, and were under arms and on the march by sunrise.', 'OR27-2-R520'),
             "'jon_7': " + ORs('left camp at 7 a. m. on July 1, the second brigade in the division column', 'OR27-2-R495'),
             "'jac_10': " + LIBs('JACOBS-1864', "As early as 10 a. m., the divisions of Rhodes and Early had moved from Heidlersburg, by a rapid march, to within a short distance of our right", witness='Prof. M. Jacobs, 1864')],
      scen=[SCNs('S1', 'Rodes\'s column on the march by sunrise (about 04:35 LMT)', 'Grimes (4th North Carolina), OR vol. 27 pt. 2', 'documented', ['gri_sun']),
            SCNs('S2', 'Johnson\'s division: Jones\'s brigade left camp at 07:00', 'J. M. Jones, OR vol. 27 pt. 2', 'documented', ['jon_7'])],
      repl=[("when='Jul 1 morning (start hour not stated)'", "when='Jul 1 morning (Rodes\\'s division on the march by sunrise per Grimes; no start hour for Early)'"),
            ("remains=['Start hour of the Second Corps columns.']", "remains=['Start hour of Early\\'s column; for Rodes\\'s division only one regiment (Grimes: on the march by sunrise) and for Johnson\\'s division one brigade (Jones: 7 a.m.) are documented.']")],
      recheck='two brigade or regiment reports give start hours (Grimes: by sunrise; Jones: 7 a.m.); the sub-claim for the start of "either column" stays open for Early.',
      sr=[SRs('S_OR', HR, r'Heidlersburg|left camp|on the march by', 200, 'start hours of the Second Corps from Heidlersburg in the OR (regimental reports)')])
# ------------------------------------------------------------------------------------------------ T1-082
patch('rows_b', 'T1-082',
      subs=[SUBs('New York commission history (1900): between 8 and 9 a.m. the pickets in front of Gamble\'s brigade gave notice that the enemy\'s infantry columns, with artillery, were approaching from the direction of Cashtown', 'documented', 'conflict', ['ny_89'])],
      cites=["'ny_89': " + LIBs('NY-GB-1900', "Between 8 and 9 a. m., the pickets in front of Gamble's Brigade, gave notice that the infantry columns of the enemy, accompanied by artillery, were approaching from the direction of Cashtown.", witness='New York Monuments Commission, vol. 1')],
      scen=[SCNs('S7', 'between 08:00 and 09:00: the pickets in front of Gamble\'s brigade gave notice (New York 1900)', 'New York at Gettysburg vol. 1', 'documented', ['ny_89'])],
      recheck='the New York commission history adds "between 8 and 9 a.m." for the notice given by Gamble\'s pickets (a seventh value).')
# ------------------------------------------------------------------------------------------------ T1-088
patch('rows_b', 'T1-088',
      subs=[SUBs('Hours at which Rowley\'s division reached the field: toward 11 o\'clock (Rowley); the 151st Pennsylvania formed in line at 10.30 a.m.; Biddle\'s brigade within a mile of the town about 11 a.m.; Stone posted his brigade at 11 a.m.; Dana\'s brigade went into position about 11 a.m. and became engaged about noon; Wister\'s brigade took position about 12 m.', 'documented', 'conflict', ['row_11', 'mcf_1030', 'bid_11', 'sto_11', 'dan_11', 'wis_12'], 'the arrival hour of the Third Division is carried as scenarios (about 11:00, about noon, 11:30)')],
      cites=["'row_11': " + ORs('Toward 11 o\'clock these two portions of my division reached the battle-field from the south, and occupied the several positions assigned them on the right and left of the Lutheran Theological Seminary, at the distance of a half mile or more to the west of it.', 'OR27-1-R055'),
             "'mcf_1030': " + ORs('the Hagerstown road, where it formed in line of battle, at 10.30 a. m., on the left flank of the First Corps.', 'OR27-1-R060'),
             "'bid_11': " + ORs('The route taken by the brigade brought us, about 11 a. m., to within 1 mile of the town, in a westerly direction from it.', 'OR27-1-R056'),
             "'sto_11': " + ORs('at 11 o\'clock a. m., July 1, I posted my brigade', 'OR27-1-R061'),
             "'dan_11': " + ORs('The brigade went into position at about 11 a. m.; became engaged about noon.', 'OR27-1-R063'),
             "'wis_12': " + ORs('Having first taken position about 12 m. , the brigade did not retire until after 3 p. m.', 'OR27-1-R062', note='the OCR prints a space before the comma')],
      scen=[SCNs('S1', 'about 11:00: Rowley\'s division reached the battle-field; Stone, Biddle and Dana in position about 11:00 (the 151st Pennsylvania in line at 10:30)', 'Rowley, Stone, Biddle, Dana, McFarland (OR vol. 27 pt. 1)', 'documented', ['row_11', 'sto_11', 'bid_11', 'dan_11', 'mcf_1030']),
            SCNs('S2', 'about 12:00: Wister\'s brigade at the seminary and in position; the 150th Pennsylvania about noon', 'Wister, Huidekoper (OR vol. 27 pt. 1)', 'documented', ['wis_12', 'wis_knap', 'hui_knap']),
            SCNs('S3', 'about 11:30: the 150th Pennsylvania reached its position', 'Pennsylvania at Gettysburg (1914 address)', 'documented', ['pa150_1130'])],
      repl=[("when='Jul 1, about noon (arrival of Rowley\\'s division); the row\\'s 08:00-10:00 is the Wadsworth column'", "when='Jul 1, 10:30 to noon (arrival of Rowley\\'s division: toward 11 per Rowley, 12 m. per Wister); the row\\'s 08:00-10:00 is the Wadsworth column'")],
      recheck='the reports of Rowley and of three of his brigades give about 11 a.m. (the 151st Pennsylvania 10.30) for the arrival, Wister and Huidekoper about noon: the hour is now a three-value conflict (the row had only noon).',
      sr=[SRs('S_OR', HR, r'Rowley|Stone|Biddle|Dana|Wister|One hundred and fifty', 160, 'arrival hours of the Third Division in the OR')])
# ------------------------------------------------------------------------------------------------ T1-090
patch('rows_b', 'T1-090',
      subs=[SUBs('Jacobs (1864): at 10 A.M. the artillery was brought into play (no battery is named); in half an hour the First Corps began to come up', 'documented', 'conflict', ['jac_art'], 'a resident\'s account; compare Calef\'s about 8 a.m.')],
      cites=["'jac_art': " + LIBs('JACOBS-1864', "and at 10 A. m., the artillery was brought into play. In half an hour the First corps began to come up, General Reynolds dashing through the town", witness='Prof. M. Jacobs, 1864')],
      scen=[SCNs('S4', 'about 10:00: the artillery brought into play (Jacobs; no battery named)', 'Jacobs 1864', 'documented', ['jac_art'])],
      repl=[("remains=['The 09:00 and 09:55 values have no citable source; the 1,000-yard sighting is not in the OR.']", "remains=['The 09:00 and 09:55 values have no citable source (Jacobs 1864 puts the artillery into play at 10 a.m. without naming a battery); the 1,000-yard sighting is not in the OR.']")],
      recheck='Jacobs 1864 says the artillery was brought into play at 10 a.m. (a fourth hour; no battery named).')
# ------------------------------------------------------------------------------------------------ T1-091
patch('rows_b', 'T1-091',
      subs=[SUBs('Jacobs (1864): at 10 A.M. the artillery was brought into play and in half an hour the First Corps began to come up, General Reynolds dashing through the town', 'documented', 'conflict', ['jac_art'], 'a resident\'s observation; Jacobs\'s hours run later than Weld\'s and the OR\'s')],
      cites=["'jac_art': " + LIBs('JACOBS-1864', "and at 10 A. m., the artillery was brought into play. In half an hour the First corps began to come up, General Reynolds dashing through the town", witness='Prof. M. Jacobs, 1864')],
      scen=[SCNs('S3', 'Reynolds dashing through the town about 10:30 (Jacobs: half an hour after the artillery at 10 A.M.)', 'Jacobs 1864', 'documented', ['jac_art'])],
      recheck='Jacobs 1864 saw Reynolds dashing through the town about half an hour after 10 a.m. (a third value).')
# ------------------------------------------------------------------------------------------------ T1-094
patch('rows_b', 'T1-094',
      subs=[SUBs('Hunt (chief of artillery): about 10.15 a.m. Hall\'s battery was ordered into action by General Reynolds on the right of the Cashtown road', 'documented', 'conflict', ['hun_1015', 'hall_1045'], 'Hall\'s own report has the battery open fire at 10.45')],
      cites=["'hun_1015': " + ORs("About 10. 15 a. m. Hall's battery (Second Maine, six 3-inch) was ordered into action by General Reynolds on the right of the Cashtown road", 'OR27-1-R028', note='the OCR prints "10. 15"; the text continues "on the second ridge, and some 500 yards beyond the seminary"')],
      scen=[SCNs('S3', 'about 10:15: Hall\'s battery ordered into action by Reynolds', 'Hunt OR p.229', 'documented', ['hun_1015'])],
      recheck='Hunt\'s report (p.229) gives about 10.15 a.m. for the order into action of Hall\'s battery (Hall: marched at 9, opened fire at 10.45).')
# ------------------------------------------------------------------------------------------------ T1-095
patch('rows_b', 'T1-095',
      subs=[SUBs('Jacobs (1864): at 10 A.M. the artillery was brought into play (no battery is named)', 'documented', 'conflict', ['jac_art'], 'compare Calef\'s about 8 a.m. and Hall\'s 10.45')],
      cites=["'jac_art': " + LIBs('JACOBS-1864', "and at 10 A. m., the artillery was brought into play. In half an hour the First corps began to come up, General Reynolds dashing through the town", witness='Prof. M. Jacobs, 1864')],
      scen=[SCNs('S4', 'about 10:00: the artillery brought into play (Jacobs; no battery named)', 'Jacobs 1864', 'documented', ['jac_art'])],
      recheck='Jacobs 1864 puts the artillery into play at 10 a.m. (no battery named), a documented value near the row\'s 10:00.')
# ------------------------------------------------------------------------------------------------ T1-096
patch('rows_b', 'T1-096',
      subs=[SUBs('Hours at which regiments of the First Division reached the field: about 9 a.m. near the town (24th Michigan, Morrow), about 10 a.m. (2nd Wisconsin, Mansfield; 7th Wisconsin, W. W. Robinson), about 10.30 a.m. (76th New York, Cook)', 'documented', 'conflict', ['mor_9', 'man_10', 'rob_10', 'coo_1030'], 'regimental reports written after the battle; the hours differ by up to an hour and a half')],
      cites=["'mor_9': " + ORs('Our pace was considerably quickened, and about 9 a. m. we carne near the town of Gettysburg, and filed off to the left, leaving it on our right.', 'OR27-1-R033', note='the OCR prints "carne" for "came"'),
             "'man_10': " + ORs('About 10 a. m., when near the town of Gettysburg, the brigade was filed into the field on the left and west of Gettysburg', 'OR27-1-R034'),
             "'rob_10': " + ORs('Arrived in the vicinity of Gettysburg about 10 a. m., when we heard firing to the left of the town', 'OR27-1-R036'),
             "'coo_1030': " + ORs('on July 1, at about 10.30 a. m., being the extreme advance regiment of the First Corps, we reached the battle-field near the seminary at Gettysburg', 'OR27-1-R039'),
             "'jac_art': " + LIBs('JACOBS-1864', "and at 10 A. m., the artillery was brought into play. In half an hour the First corps began to come up, General Reynolds dashing through the town", witness='Prof. M. Jacobs, 1864')],
      scen=[SCNs('S1', 'about 09:00: the 24th Michigan came near the town (Morrow)', 'Morrow OR p.267', 'documented', ['mor_9']),
            SCNs('S2', 'about 10:00: the division at the Cashtown road (Wadsworth); the 2nd and 7th Wisconsin near the town (Mansfield; W. W. Robinson)', 'Wadsworth, Mansfield, W. W. Robinson (OR)', 'documented', ['wad_10', 'man_10', 'rob_10']),
            SCNs('S3', 'about 10:30: the 76th New York reached the battle-field (Cook); the First Corps began to come up about half an hour after 10 A.M. (Jacobs)', 'Cook (OR); Jacobs 1864', 'documented', ['coo_1030', 'jac_art'])],
      recheck='regimental reports of the Iron Brigade and Cutler\'s brigade give 9, 10 and 10.30 a.m. for the arrival; Jacobs about 10.30 for the First Corps coming up: carried as three scenarios, no default.',
      sr=[SRs('S_OR', HR, r'Gettysburg|battle-field', 120, 'arrival hours of the First Division regiments in the OR')])
# ------------------------------------------------------------------------------------------------ T1-099
patch('rows_c', 'T1-099',
      subs=[SUBs('Cheney (1901, 9th New York Cavalry): Reynolds had been killed at 10:15 a.m. while leading a regiment of his corps into position in the field south of the Chambersburg road', 'documented', 'conflict', ['chen_1015'], 'a regimental history of 1901; the place differs from the grove "to our left" of Bachelder and the Michigan monument')],
      cites=["'chen_1015': " + LIBs('CHENEY-1901', "Gen. Reynolds had been killed at 10:15 a. m. while leading a regiment of his corps into position in the field south of the Chambersburg road.", witness='N. Cheney, History of the Ninth New York Cavalry (1901)')],
      scen=[SCNs('S12', 'about 10:15, in the field south of the Chambersburg road (Cheney 1901)', 'Cheney 1901', 'documented', ['chen_1015'])],
      recheck='Cheney (1901) repeats 10:15 and gives the place as the field south of the Chambersburg road (a place value for the scenario list).')
# ------------------------------------------------------------------------------------------------ T1-101
patch('rows_c', 'T1-101',
      subs=[SUBs('Hours of Cutler\'s brigade: in action from 10 a.m. until 4 p.m. (Cutler); the 76th New York reached the battle-field about 10.30 a.m. (Cook); the 56th Pennsylvania engaged the enemy at 11 a.m. and lost over 70 in twenty minutes (Hofmann)', 'documented', 'conflict', ['cut_10', 'coo_1030', 'hof_11'], 'no report gives the hour of the withdrawal order')],
      cites=["'cut_10': " + ORs('having been in action from 10 a. m. until 4 p. in., were allowed to rest for the night', 'OR27-1-R037', note='the OCR prints "4 p. in." for 4 p. m.'),
             "'coo_1030': " + ORs('on July 1, at about 10.30 a. m., being the extreme advance regiment of the First Corps, we reached the battle-field near the seminary at Gettysburg', 'OR27-1-R039'),
             "'hof_11': " + ORs('We marched to Gettysburg, and engaged the enemy at 11 a. m. We suffered severely. In twenty minutes our loss in killed and wounded was over 70.', 'OR27-1-R042')],
      scen=[SCNs('S1', 'about 10:00: Cutler\'s brigade in action (to 16:00)', 'Cutler OR p.281', 'documented', ['cut_10']),
            SCNs('S2', 'about 10:30: the 76th New York reached the battle-field', 'Cook OR p.285', 'documented', ['coo_1030']),
            SCNs('S3', 'about 11:00: the 56th Pennsylvania engaged', 'Hofmann OR p.288', 'documented', ['hof_11'])],
      recheck='three reports of Cutler\'s brigade give 10, 10.30 and 11 a.m. for its engagement; the hour of Wadsworth\'s withdrawal order is still not stated.',
      sr=[SRs('S_OR', HR, r'Cutler|Seventy-sixth|Fifty-sixth|Wadsworth', 160, 'hours of Cutler\'s brigade in the OR')])
# ------------------------------------------------------------------------------------------------ T1-102
patch('rows_c', 'T1-102',
      subs=[SUBs('Jacobs (1864): at 1 p.m. two divisions of the Eleventh Corps, under Schurz and Barlow, hurried through the town and took position on the extreme right', 'documented', 'conflict', ['jac_1pm'], 'a resident\'s account; compare Howard about 12.30 and Pierce 12:45')],
      cites=["'jac_1pm': " + LIBs('JACOBS-1864', "At 1p.m., two divisions of this corps, under Generals Schurz and Barlow, hurried through the town, and took position on our extreme right", witness='Prof. M. Jacobs, 1864')],
      scen=[SCNs('S1', 'the head of the Eleventh Corps entered and passed through the town about 12:30', 'Howard OR p.702', 'documented', ['how_1230', 'how_xi_town']),
            SCNs('S2', 'Schurz\'s division entering Gettysburg at 12:45', 'F. C. Pierce 1914', 'documented', ['pierce_1245']),
            SCNs('S3', 'two divisions of the Eleventh Corps hurried through the town at 13:00', 'Jacobs 1864', 'documented', ['jac_1pm'])],
      recheck='Jacobs 1864 puts the Eleventh Corps in the town at 1 p.m. (a third value beside Howard\'s 12.30 and Pierce\'s 12:45).')
# ------------------------------------------------------------------------------------------------ T1-109
patch('rows_c', 'T1-109',
      subs=[SUBs('Hours of the approach of Rodes\'s division: as early as 10 a.m. the divisions of Rodes and Early were within a short distance of the right (Jacobs 1864); the 12th Alabama arrived near Gettysburg at 11 a.m. (Pickens); Daniel was within 2.5 miles about 12 m.', 'documented', 'conflict', ['jac_10', 'pic_11', 'dan_12'], 'the hour at which Rodes heard the cannonade at 4 miles is still not stated by anyone')],
      cites=["'jac_10': " + LIBs('JACOBS-1864', "As early as 10 a. m., the divisions of Rhodes and Early had moved from Heidlersburg, by a rapid march, to within a short distance of our right", witness='Prof. M. Jacobs, 1864'),
             "'pic_11': " + ORs('We arrived near that place at 11 a. m. on July 1.', 'OR27-2-R529')],
      scen=[SCNs('S1', 'about 10:00: the divisions of Rodes and Early within a short distance of the right (Jacobs)', 'Jacobs 1864', 'documented', ['jac_10']),
            SCNs('S2', 'about 11:00: the 12th Alabama arrived near Gettysburg', 'Pickens OR p.601', 'documented', ['pic_11']),
            SCNs('S3', 'about 12:00: Daniel within 2.5 miles of the town', 'Daniel OR p.566', 'documented', ['dan_12'])],
      recheck='Pickens (12th Alabama) gives 11 a.m. for the arrival near Gettysburg and Jacobs 10 a.m.; with Daniel\'s noon they bound the hour of the cannonade from above and below without stating it.',
      sr=[SRs('S_OR', HR, r'Rodes|Gettysburg|arrived near', 140, 'arrival hours of Rodes\'s brigades in the OR')])
# ------------------------------------------------------------------------------------------------ T1-110
patch('rows_c', 'T1-110',
      subs=[SUBs('Wheelock (97th New York): the regiment left Emmitsburg at 7 a.m. and reached Gettysburg at 1 p.m., where it formed line of battle north of the town on the flat', 'documented', 'conflict', ['whe_7', 'whe_1'], 'conflicts with the 97th being sent forward with Coulter at about 11 a.m. (Baxter, Coulter); carried as a scenario')],
      cites=["'whe_7': " + ORs('On the morning of July 1, at 7 a. m., we left Emmitsburg,_Md., reaching Gettysburg, Pa., at 1 p. m. same day', 'OR27-1-R053', note='the OCR prints a stray underscore in "Emmitsburg,_Md."'),
             "'whe_1': " + ORs('reaching Gettysburg, Pa., at 1 p. m. same day, and immediately formed line of battle north of the town, on the flat', 'OR27-1-R053')],
      scen=[SCNs('S1', 'about 11:00: the Second Brigade at the front (Coulter; Baxter)', 'Coulter OR p.292; Baxter OR p.307', 'documented', ['cou_11', 'bax_11']),
            SCNs('S2', 'about 13:00: the 97th New York reached Gettysburg and formed line north of the town', 'Wheelock OR p.309', 'documented', ['whe_7', 'whe_1'])],
      recheck='Wheelock\'s own report of the 97th New York gives 1 p.m. for its arrival, against 11 a.m. in Baxter and Coulter; carried as two scenarios.')
# ------------------------------------------------------------------------------------------------ T1-112
patch('rows_c', 'T1-112',
      subs=[SUBs('Jacobs (1864): General Doubleday had the chief command until the arrival of General Howard at 11 1/2 A.M.', 'documented', 'supported', ['jac_howard'], 'OCR reads "11J" for 11 1/2')],
      cites=["'jac_howard': " + LIBs('JACOBS-1864', "until the arrival of General Howard at 11J A. M.", note='OCR reads "11J" for 11 1/2', witness='Prof. M. Jacobs, 1864')],
      repl=[("SCN('S1', 'about 11:30', 'Howard OR p.702; Biddle 1880', 'documented', ['how_1130', 'bid_1130'])", "SCN('S1', 'about 11:30', 'Howard OR p.702; Biddle 1880; Jacobs 1864', 'documented', ['how_1130', 'bid_1130', 'jac_howard'])")],
      recheck='Jacobs 1864 also has Howard arriving at 11 1/2 a.m. (a third source for the 11:30 value).')
# ------------------------------------------------------------------------------------------------ T1-113
patch('rows_c', 'T1-113',
      subs=[SUBs('New York commission history (1900): it was about 11 o\'clock; the fighting ceased and for three hours there was a lull in the conflict', 'documented', 'conflict', ['ny_lull'], 'compare Heth "one hour or more" and McFarland "perhaps an hour"'),
            SUBs('Coulter (11th Pennsylvania): the skirmishers had been a short time engaged and about 12.30 p.m. the firing became general along the entire line', 'documented', 'conflict', ['cou_1230'])],
      cites=["'ny_lull': " + LIBs('NY-GB-1900', "It was now about 11 o'clock. The fighting ceased, and for three hours there was a lull in the conflict.", witness='New York Monuments Commission, vol. 1'),
             "'cou_1230': " + ORs('The skirmishers had been a short time engaged, and about 12.30 p. m. the firing became general along the entire line.', 'OR27-1-R044')],
      scen=[SCNs('S1', 'lull from about 11:00 for one hour or more, to about 12:30 (Heth)', 'Heth OR p.638', 'documented', ['heth_hour']),
            SCNs('S2', 'firing ceased for perhaps an hour, then about noon the enemy opened on the right (McFarland)', 'McFarland OR p.327', 'documented', ['mcf_hour']),
            SCNs('S3', 'lull from about 11:00 for three hours, to about 14:00 (New York 1900)', 'New York at Gettysburg vol. 1', 'documented', ['ny_lull']),
            SCNs('S4', 'firing general along the line about 12:30 (Coulter)', 'Coulter OR p.292', 'documented', ['cou_1230'])],
      repl=[("remains=['Withdrawal to Herr Ridge; the clock band of the lull.']", "remains=['Withdrawal to Herr Ridge; a single clock band of the lull (carried as four scenarios from 12:00 to 14:00).']")],
      recheck='the New York commission history gives a lull of three hours from about 11 o\'clock and Coulter 12.30 for the general fire: with Heth and McFarland the end of the lull is a four-value conflict, no default.',
      sr=[SRs('LIB', r'\blull\b', r'July 1|11 o\'clock|noon|three hours', 200, 'the midday lull in the library and the acquired texts (second pass)')])
# ------------------------------------------------------------------------------------------------ T1-115
patch('rows_c', 'T1-115',
      subs=[SUBs('Hours of Rodes\'s brigades: the 12th Alabama arrived near Gettysburg at 11 a.m., formed line, advanced about a mile and stood in an artillery duel of about an hour (Pickens); the 26th Alabama engaged about 12 m. (Goodgame); the 2nd North Carolina Battalion entered the engagement between 12 m. and 1 p.m. (Brown); the 43rd North Carolina was drawn up in line about 1 o\'clock, 2 or 2 1/2 miles from Gettysburg (Lewis); Jacobs: Rodes\'s division entered the fight about noon and Early\'s not until after 2 p.m.', 'documented', 'conflict', ['pic_11', 'goo_12', 'brn_12', 'lew_1', 'jac_noon0', 'jac_noon'], 'the OCR prints "2i" for 2 1/2 in Lewis; Pickens and Goodgame are regiments of Rodes\'s division'),
            SUBs('Hill (corps commander): about 2.30 o\'clock the right wing of Ewell\'s corps made its appearance on his left', 'documented', 'conflict', ['hill_230', 'lee_230a'], 'the same hour as Lee\'s report'),
            SUBs('Beveridge (1891): Ewell announced his presence about 2 P.M. by opening his guns on Doubleday\'s right from Oak Hill', 'documented', 'conflict', ['bev_2pm'], 'the OCR prints "annouiu\'ed" and "Knol) Hill"'),
            SUBs('Daniel: after moving about three-quarters of a mile and forming 200 yards behind Iverson, his brigade remained some hour and a half before Iverson advanced', 'documented', 'supported', ['dan_hour']),
            SUBs('Iverson\'s advance about 14:00 or later (derived: about 12 m. at 2 1/2 miles, a march of three-quarters of a mile, then some hour and a half)', 'inferred', 'supported', ['dan_12', 'dan_hour'], 'derived, not stated; the march time is a guess of 15 to 20 minutes')],
      cites=["'pic_11': " + ORs('We arrived near that place at 11 a. m. on July 1.', 'OR27-2-R529'),
             "'goo_12': " + ORs('at which place we engaged the enemy about 12 m. on July 1.', 'OR27-2-R530'),
             "'brn_12': " + ORs("entered the engagement of Ju'ly 1, with the remainder of the brigade, between the hours of 12 m. and 1 p. m.", 'OR27-2-R512', note='the OCR prints "Ju\'ly"'),
             "'lew_1': " + ORs('At about 1 o\'clock, July 1, we were drawn up in line of battle, about 2 or 2i miles from Gettysburg.', 'OR27-2-R509', note='the OCR prints "2i" for 2 1/2'),
             "'hill_230': " + ORs("About 2.30 o'clock, the right wing of Ewell's corps made its appearance on my left", 'OR27-2-R534', '607'),
             "'bev_2pm': " + LIBs('IL-MON-1892', "On the morning of July 1, Gen. Ewell, hearing the sound of battle, hastened forward and about 2 P. M. annouiu'ed his presence by opening his guns on Doubleday's right", note='the OCR prints "annouiu\'ed" for "announced"', witness='Maj. J. L. Beveridge, address of 1891'),
             "'jac_noon0': " + LIBs('JACOBS-1864', "Rhodes' division, which was in the advance, entered the fight", note='the sentence continues after the running head of the next page: "about noon ; Early\'s did not participate until after 2 p. m."', witness='Prof. M. Jacobs, 1864'),
             "'jac_noon': " + LIBs('JACOBS-1864', "about noon ; Early's did not participate until after 2 p. m.", witness='Prof. M. Jacobs, 1864'),
             "'dan_hour': " + ORs('After remaining in this position for some hour and a half, I was notified by General Iverson that he was about to advance.', 'OR27-2-R507', '566')],
      scen=[SCNs('S8', 'about 11:00: the 12th Alabama arrived near Gettysburg', 'Pickens OR p.601', 'documented', ['pic_11']),
            SCNs('S9', 'about 12:00-13:00: brigades engaged (Goodgame; Brown; Jacobs: Rodes entered the fight about noon)', 'Goodgame, Brown (OR); Jacobs 1864', 'documented', ['goo_12', 'brn_12', 'jac_noon']),
            SCNs('S10', 'about 13:00: the 43rd North Carolina in line of battle', 'Lewis OR p.573', 'documented', ['lew_1']),
            SCNs('S11', 'about 14:00: Ewell opened his guns from Oak Hill (Beveridge)', 'Beveridge 1891', 'documented', ['bev_2pm']),
            SCNs('S12', 'about 14:00 or later: Iverson\'s advance (derived from Daniel)', 'derived from Daniel OR p.566', 'inferred', ['dan_12', 'dan_hour']),
            SCNs('S13', 'about 14:30: the right wing of Ewell\'s corps appeared on Hill\'s left (Hill; Lee)', 'Hill OR p.607; Lee OR p.317', 'documented', ['hill_230', 'lee_230a'])],
      recheck='brigade and regiment reports of Rodes\'s division give 11 a.m., about noon, 12-1 and about 1 p.m. (the row\'s noon to 1 p.m. holds); Hill repeats Lee\'s 2.30; Beveridge has about 2 p.m.; Daniel\'s "some hour and a half" bounds Iverson\'s advance at about 14:00 or later. No default is picked (the recorded C-041 concerns the infantry attack, not the arrival).',
      sr=[SRs('S_OR', HR, r'Rodes|Daniel|Doles|Iverson|Ramseur|O\'Neal|Battle|Oak', 160, 'hours of Rodes\'s brigades in the OR (second pass)')])
# ------------------------------------------------------------------------------------------------ T1-103 (block written earlier today)
patch('rows_c', 'T1-103',
      subs=[SUBs('Hours of Cutler\'s brigade: in action from 10 a.m. until 4 p.m. (Cutler); the 76th New York reached the battle-field about 10.30 a.m. (Cook); the 56th Pennsylvania engaged the enemy at 11 a.m. (Hofmann)', 'documented', 'conflict', ['cut_10', 'coo_1030', 'hof_11'], 'none of them gives the hour at which the 147th New York was left without the order')],
      cites=["'cut_10': " + ORs('having been in action from 10 a. m. until 4 p. in., were allowed to rest for the night', 'OR27-1-R037', note='the OCR prints "4 p. in." for 4 p. m.'),
             "'coo_1030': " + ORs('on July 1, at about 10.30 a. m., being the extreme advance regiment of the First Corps, we reached the battle-field near the seminary at Gettysburg', 'OR27-1-R039'),
             "'hof_11': " + ORs('We marched to Gettysburg, and engaged the enemy at 11 a. m. We suffered severely. In twenty minutes our loss in killed and wounded was over 70.', 'OR27-1-R042')],
      repl=[("'no hour in Cutler; Fox gives none'", "'no hour for the 147th\\'s fate in Cutler or Fox; the brigade\\'s hours are in the sub-claim above'")],
      recheck='three reports give hours for Cutler\'s brigade as a whole (10, 10.30, 11 a.m.), none for the 147th\'s fate.')
for fn, s in files.items():
    open(os.path.join(T, fn + '.py'), 'w', encoding='utf-8').write(s)
print('patched rows:', ' '.join(log))
