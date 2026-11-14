"""Self-test of tools/bt/town/validate_evidence.py: python3 tools/bt/town/validate_evidence.py --self-test

Part 1 builds a small repository in a temporary directory (a ledger, a groups file, two local texts, a family of texts, an OR27 index, generic rules) and runs
one case per rule of the contract: every case that must pass passes and every case that must fail fails with the message that names the rule. A check that
cannot fail would be worthless, so each rule has a refusing case. Part 2 runs the real files of the repository when they exist (the ledger, the examples, the
group inventory).
"""
import hashlib, json, os, shutil, sys, tempfile

PAGES_TEXT = """=== PAGE 1 ===
Title page of a test report. Nothing is built here.
=== PAGE 2 ===
The Klingel farm house is a two-story log house 26 x 21 ft on a stone foundation; a frame
addition was built in the 1870s. Carr's brigade fortified itself in the house on July 2.
=== PAGE 3 ===
The barn was shelled on the afternoon of July 3 and burned. About 20 wounded died in the sur-
geon's care at the farm. The main house is two and a half stories high with a slate roof.
The Rose farm house is a stone house of 1811; its barn burned in 1910 and is not part of the battle.
"""

OCR_TEXT = """ .   ■
THE   SEMINARY  BUILD-
ING  had a cu-
pola, from which Gen. Buford
watched the advance of the enemy.  The roof was of slate and
the walls of brick;   the build-
ing is three stories high with a dormer 2l ft wide.
ﬁne “quoted” words — and the Court-house stood on Baltimore Street.
"""

FAMILY = {'1863-07-07': "ISSUE OF 7 JULY. The Eagle Hotel on Chambersburg Street was used as a hospital for the wounded of both armies on Wednesday.\n",
          '1863-07-14': "ISSUE OF 14 JULY. Houses along Baltimore Street were struck by many balls during the sharpshooting of the second day.\n"}

OR27_TEXT = "HEADER. Report of Col. A. B. Test. The Lutheran seminary building was held by the brigade until noon; its cupola gave a view of the whole front of the army.\n" + "x" * 50


def sha(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def build_root(tmp):
    def w(rel, text):
        p = os.path.join(tmp, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8', newline='') as f:
            f.write(text)
        return p
    pt = w('tmp/library/test/pages.txt', PAGES_TEXT)
    ot = w('tmp/library/test/ocr.txt', OCR_TEXT)
    for k, v in FAMILY.items():
        w('tmp/library/test/fam/%s.txt' % k, v)
    orp = w('tmp/library/test/or27.txt', OR27_TEXT)
    idx = {'records': [{'id': 'OR27-1-RTEST', 'part': 1, 'start_offset': 0, 'end_offset': len(OR27_TEXT), 'start_page': 100, 'end_page': 103, 'start_page_conf': 'head'}]}
    w('docs/battle-theatre/library/or27_index.json', json.dumps(idx))
    ledger = ('# test ledger\n\n| id | class | title | date | text | sha256 | pages | rights | url | notes |\n|---|---|---|---|---|---|---|---|---|---|\n'
              '| T-PAGES | official | Test report with pages | 2000 | tmp/library/test/pages.txt | %s | markers | public | - | test |\n'
              '| T-OCR | book | Test OCR book | 1890 | tmp/library/test/ocr.txt | %s | none | public | - | test |\n'
              '| T-FAM | primary | Test weekly | 1863 | tmp/library/test/fam/{part}.txt | - | none | public | - | family of issues |\n'
              '| T-OR27 | primary | Test OR | 1889 | tmp/library/test/or27.txt | %s | or27 | public | - | test |\n'
              '| T-LEAD | lead | A web page | 2020 | - | - | none | - | - | lead only |\n'
              '| T-MAP | primary | A map sheet | 1858 | - | - | none | public | - | image only |\n'
              '\n| id | class | title | date | text | sha256 | pages | rights | url | notes |\n'
              '| T-APPENDED | book | Appended later | 1900 | tmp/library/test/ocr.txt | - | none | public | - | appended by >> |\n'
              ) % (sha(pt), sha(ot), sha(orp))
    w('docs/battle-theatre/town/SOURCES.md', ledger)
    members = {'records': ['bld-a', 'bld-b'], 'record_parts': [], 'basemap_structures': ['STR-X-1'], 'bridges': [], 'railways': [], 'fences': [], 'roads': [], 'lanes': [], 'hospitals': [], 'other_records': []}
    members2 = {'records': ['bld-other'], 'record_parts': [], 'basemap_structures': [], 'bridges': [], 'railways': [], 'fences': [], 'roads': [], 'lanes': [], 'hospitals': [], 'other_records': []}
    groups = {'groups_list': [{'id': 'g-one', 'prefix': 'ONE', 'members': members}, {'id': 'g-two', 'prefix': 'TWO', 'members': members2}]}
    w('docs/battle-theatre/town/evidence/groups.json', json.dumps(groups))
    rules = {'rules': [{'id': 'GR-TEST-ROOF', 'applies_to': 'roof', 'statement': 'gable roof'}]}
    w('docs/battle-theatre/town/evidence/generic_rules.json', json.dumps(rules))
    return pt, ot


def run(V):
    tmp = tempfile.mkdtemp(prefix='town-selftest-')
    fails = []
    n_ok = n_fail = 0
    try:
        pt, ot = build_root(tmp)
        ctx = V.Ctx(tmp)
        text2 = open(pt, encoding='utf-8', newline='').read()
        text_o = open(ot, encoding='utf-8', newline='').read()

        def off(txt, needle):
            return txt.index(needle)

        # ---- units of the program
        s, om = V.skeleton('Sur-\ngeon’s ﬁne  café')
        assert s == 'surgeonsfinecafe', s
        assert V.quote_skeleton('A "quoted"—thing') == 'aquotedthing'
        assert V.fragments('alpha beta [...] gamma delta') == ['alpha beta', 'gamma delta']
        assert V.number_set('two-story, 26 x 21 ft, 1,200 men, a story and a half, twenty-six') >= {2.0, 26.0, 21.0, 1200.0, 1.5}
        assert 2.5 in V.number_set('two and a half stories') and 1.5 in V.number_set('one and a half story') and 0.5 in V.number_set('1/2')
        ok, dg, why = V.ocr_difference('hello21ftwide', 'hello2lftwide')
        assert ok and dg, why
        ok, dg, why = V.ocr_difference('thehouseisbrick', 'thehouseisstone')
        assert not ok
        led = V.parse_ledger(os.path.join(tmp, 'docs/battle-theatre/town/SOURCES.md'))
        assert 'T-APPENDED' in led and led['T-FAM']['class'] == 'primary' and led['T-PAGES']['pages'] == 'markers', list(led)

        # ---- cases
        BID = 'bld-a'
        base_b = {'row': 'g-one.0001', 'type': 'building', 'group': 'g-one', 'building': BID, 'name': 'Klingel house', 'declared_from': 'structures.json'}

        def fr(n, **kw):
            r = {'row': 'g-one.%04d' % n, 'type': 'field', 'group': 'g-one', 'building': BID, 'field': 'storeys', 'value': 2, 'tier': 'documented', 'evidence_kind': 'text',
                 'describes': 'july_1863', 'source': 'T-PAGES', 'part': 'report', 'page': 2, 'quote': 'two-story log house 26 x 21 ft on a stone foundation',
                 'text_offset': off(text2, 'two-story log house')}
            r.update(kw)
            return {k: v for k, v in r.items() if v != '__drop__'}

        def case(name, rows, expect, group='g-one', complete=False):
            nonlocal n_ok, n_fail
            p = os.path.join(tmp, 'docs/battle-theatre/town/evidence/%s.jsonl' % group)
            with open(p, 'w', encoding='utf-8') as f:
                for r in rows:
                    f.write(json.dumps(r) + '\n')
            ctx._rows = {}
            ok, errors, warnings, stats = V.run_group(ctx, group, complete=complete)
            if expect is None:
                good = ok and not errors
            else:
                good = (not ok) and any(expect in e for e in errors)
            if good:
                n_ok += 1
            else:
                n_fail += 1
                fails.append('%s: expected %s, got %s' % (name, 'OK' if expect is None else 'error containing %r' % expect, 'OK' if ok else errors[:3]))
        B = [base_b]
        case('A valid documented row', B + [fr(2)], None)
        case('B2 hyphenated quote across a line end', B + [fr(2, field='kind', value='house', quote="died in the surgeon's care at the farm", text_offset=off(text2, 'died in the sur-'), page=3)], None)
        case('C quote not in the text', B + [fr(2, quote='a three-story brick house with a mansard roof built in 1859')], 'quote not found')
        case('D wrong offset', B + [fr(2, text_offset=5)], 'text_offset')
        case('E wrong page', B + [fr(2, page=3)], 'page is 3 but the quote starts on page 2')
        case('F documented from a lead', B + [fr(2, source='T-LEAD')], 'is a lead')
        case('G number not in the quote', B + [fr(2, value=3)], 'the number 3')
        case('H two and a half stories', B + [fr(2, value=2.5, quote='is two and a half stories high with a slate roof', text_offset=off(text2, 'is two and a half'), page=3)], None)
        case('I tier not allowed', B + [fr(2, tier='probable')], 'is not allowed')
        case('J duplicate row id', B + [fr(2), fr(2)], 'duplicate row id')
        case('K unknown field', B + [fr(2, field='chimney_count')], 'not in the vocabulary')
        case('L undeclared building', [fr(2)], 'is not declared')
        case('M conflict on one row only', B + [fr(2, conflicts=[{'with': 'g-one.0003', 'nature': 'different storeys'}]), fr(3, value=2)], 'not written on that row')
        case('M2 conflict on both rows', B + [fr(2, conflicts=[{'with': 'g-one.0003', 'nature': 'different storeys'}]), fr(3, value=2, conflicts=[{'with': 'g-one.0002', 'nature': 'different storeys'}])], None)
        srch = {'row': 'g-one.0010', 'type': 'search', 'group': 'g-one', 'building': BID, 'where': 'T-OCR', 'query': 'storeys', 'outcome': 'not_found', 'at': '2026-11-14'}
        gap = {'row': 'g-one.0011', 'type': 'field', 'group': 'g-one', 'building': BID, 'field': 'roof', 'value': None, 'tier': 'open gap', 'evidence_kind': 'none', 'describes': 'undated',
               'searched': ['g-one.0010']}
        case('N open gap with a failed search', B + [srch, gap], None)
        case('N2 open gap without searches', B + [srch, dict(gap, searched=[])], 'names the searches')
        case('N3 open gap whose search found it', B + [dict(srch, outcome='found'), gap], 'not a failed search')
        case('N4 open gap with a value', B + [srch, dict(gap, value={'form': 'gable'})], 'open gap has value null')
        pp = {'row': 'g-one.0012', 'type': 'field', 'group': 'g-one', 'building': BID, 'field': 'roof', 'value': {'form': 'gable'}, 'tier': 'plausible-procedural', 'evidence_kind': 'none',
              'describes': 'undated', 'rule': 'GR-TEST-ROOF'}
        case('O plausible-procedural with a known rule', B + [pp], None)
        case('O2 plausible-procedural with an unknown rule', B + [dict(pp, rule='GR-NOPE')], 'not in generic_rules.json')
        ocr = fr(2, field='footprint', value={'w': 21, 'd': 21, 'unit': 'ft'}, source='T-OCR', part='book', page=None, page_note='no page marks', quote='is three stories high with a dormer 21 ft wide',
                 text_offset=off(text_o, 'is three stories'), quote_mode='ocr', raw='is three stories high with a dormer 2l ft wide', ocr_note='l for 1', page_image_viewed=True)
        case('P OCR repair of a digit with the page image viewed', B + [ocr], None)
        case('P2 OCR repair of a digit without the page image', B + [dict(ocr, page_image_viewed=False)], 'page_image_viewed must be true')
        case('P3 OCR mode without raw', B + [{k: v for k, v in ocr.items() if k != 'raw'}], 'needs `raw`')
        case('P4 OCR mode used for a rewrite', B + [dict(ocr, quote='is three stories high with a porch 21 ft wide of stone')], 'OCR confusions')
        case('P5 verbatim quote of the damaged text', B + [dict(ocr, quote='is three stories high with a dormer 2l ft wide', quote_mode='verbatim')], 'the number 21')
        case('Q quote too short', B + [fr(2, quote='two-story log', text_offset=off(text2, 'two-story log'))], 'at least 20 are needed')
        twn_bad = {'row': 'g-one.0020', 'type': 'building', 'group': 'g-one', 'building': 'TWN-TWO-0001', 'name': 'New house', 'declared_from': 'new', 'new_reason': 'seen on the Hopkins inset only'}
        case('R TWN id with the wrong prefix', B + [twn_bad], 'must carry the prefix ONE')
        case('R2 TWN id with the right prefix', B + [dict(twn_bad, building='TWN-ONE-0001')], None)
        case('R3 new building without a reason', B + [dict(twn_bad, building='TWN-ONE-0001', new_reason='')], 'new_reason')
        case('S documented from a later state without continuity', B + [fr(2, describes='later')], 'continuity')
        cont = {'source': 'T-PAGES', 'part': 'report', 'page': 3, 'quote': 'The Rose farm house is a stone house of 1811', 'text_offset': off(text2, 'The Rose farm house')}
        case('S1 documented form from a mid-1860s statement without continuity', B + [fr(2, describes='after_battle_to_1869')], 'continuity')
        case('S1b documented state from a statement after the battle needs no continuity', B + [fr(2, field='use', value='hospital', describes='after_battle_to_1869')], None)
        case('S2 later state with a continuity citation', B + [fr(2, describes='later', continuity=cont)], None)
        im = {'source': 'T-MAP', 'item': 'sheet 2', 'observation': 'two buildings drawn at the lot', 'viewed': True, 'caption_names_building': True}
        imrow = {'row': 'g-one.0030', 'type': 'field', 'group': 'g-one', 'building': BID, 'field': 'kind', 'value': 'house', 'tier': 'documented', 'evidence_kind': 'image', 'describes': 'before_1863', 'image_ref': im}
        case('T image reading of an observable field', B + [imrow], None)
        case('T2 image reading not viewed', B + [dict(imrow, image_ref=dict(im, viewed=False))], 'viewed must be true')
        case('T3 documented measurement from an image', B + [dict(imrow, field='footprint', value={'w': 20, 'd': 30, 'unit': 'ft'})], 'at best inferred')
        case('T4 inferred measurement from an image', B + [dict(imrow, field='footprint', value={'w': 20, 'd': 30, 'unit': 'ft'}, tier='inferred', basis='scaled from the map sheet at 1:600 with ruler', method='scale bar')], None)
        case('T5 documented from an image whose caption does not name the building', B + [dict(imrow, image_ref=dict(im, caption_names_building=False))], 'caption_names_building')
        case('U building of another group', [dict(base_b, building='bld-other')], 'belongs to group g-two')
        frag = fr(2, field='kind', value='house', quote='The barn was shelled [...] About 20 wounded died', text_offset=off(text2, 'The barn was shelled'), page=3)
        case('V fragments in order', B + [frag], None)
        case('V2 fragments, the second absent', B + [dict(frag, quote='The barn was shelled [...] About 99 wounded died')], 'quote not found')
        fam = fr(2, field='state', value='hospital', source='T-FAM', part='1863-07-07', page=None, page_note='weekly paper, no page marks', quote='The Eagle Hotel on Chambersburg Street was used as a hospital',
                 text_offset=0 + FAMILY['1863-07-07'].index('The Eagle'), state='hospital', window='day', transition='instant', **{'from': '1863-07-01', 'to': '1863-07-07'})
        case('W family source with its part', B + [fam], None)
        case('W2 family source without a part', B + [{k: v for k, v in fam.items() if k != 'part'}], 'must name the part')
        case('W3 family part that leaves the folder', B + [dict(fam, part='../ocr')], 'not a plain name')
        orrow = fr(2, field='state', value='observation_post', source='T-OR27', part='OR27-1-RTEST', page=101, quote='its cupola gave a view of the whole front of the army', text_offset=OR27_TEXT.index('its cupola'),
                   state='observation_post', window='unknown', transition='none', **{'from': None, 'to': None})
        case('X OR27 record and page', B + [orrow], None)
        case('X2 OR27 page outside the record', B + [dict(orrow, page=140)], 'outside the printed pages')
        case('X3 OR27 part is not a record id', B + [dict(orrow, part='Report 5')], 'not an OR27 record id')
        cnt = dict(fam, source='T-PAGES', part='report', page=3, quote='About 20 wounded died in the surgeon\'s care at the farm', text_offset=text2.index('About 20 wounded'), state='other', window='day', transition='none',
                   count=20, count_basis='wounded who died at the farm', **{'from': '1863-07-03', 'to': '1863-07-03'})
        case('Z0 a stated count that is in the quote', B + [cnt], None)
        case('Z0b a count that is in no quote', B + [dict(cnt, count=21)], 'the number 21')
        case('Z0c a count without its basis', B + [{k: v for k, v in cnt.items() if k != 'count_basis'}], 'needs count_basis')
        case('Z state with a clock window but no times', B + [dict(fam, window='clock', **{'from': None, 'to': None})], 'needs from and to')
        case('Z2 state from after to', B + [dict(fam, **{'from': '1863-07-09', 'to': '1863-07-07'})], 'from is after to')
        case('Z3 state value not in the list', B + [dict(fam, state='haunted')], 'state must be one of')
        case('AA unknown key', B + [fr(2, quoet='x')], 'unknown key')
        case('AB inferred without a basis', B + [fr(2, tier='inferred')], 'needs `basis`')
        case('AB2 inferred with a basis and a quote', B + [fr(2, tier='inferred', basis='the plan of the house is read from the stated block size')], None)
        case('AB3 inferred from premises', B + [fr(2), fr(3, field='kind', value='house', tier='inferred', evidence_kind='none', describes='undated', basis='a two-story house of this size is a farmhouse', premises=['g-one.0002'])], None)
        case('AB4 inferred with neither evidence nor premises', B + [fr(2, field='kind', value='house', tier='inferred', evidence_kind='none', describes='undated', basis='a two-story house of this size is a farmhouse')], 'needs evidence')
        case('AB5 inferred from a premise that is not a row of the file', B + [fr(3, field='kind', value='house', tier='inferred', evidence_kind='none', describes='undated', basis='a two-story house of this size is a farmhouse', premises=['g-one.0099'])], 'premise')
        case('AC place with coordinates but no error bound', B + [{'row': 'g-one.0040', 'type': 'field', 'group': 'g-one', 'building': BID, 'field': 'place', 'value': {'text': 'near the road', 'lng': -77.25, 'lat': 39.82},
                                                                  'tier': 'inferred', 'evidence_kind': 'image', 'describes': 'before_1863', 'basis': 'read from the Hopkins inset',
                                                                  'image_ref': dict(im, caption_names_building=False)}], 'error_m')
        case('AC2 place outside the battlefield', B + [{'row': 'g-one.0040', 'type': 'field', 'group': 'g-one', 'building': BID, 'field': 'place', 'value': {'text': 'x', 'lng': -70.0, 'lat': 39.82, 'error_m': 20, 'method': 'hopkins_inset'},
                                                         'tier': 'inferred', 'evidence_kind': 'image', 'describes': 'before_1863', 'basis': 'read from the Hopkins inset by scale', 'method': 'affine',
                                                         'image_ref': dict(im, caption_names_building=False)}], 'outside the battlefield box')
        # completeness
        def gapfor(n, f):
            return {'row': 'g-one.%04d' % n, 'type': 'field', 'group': 'g-one', 'building': BID, 'field': f, 'value': None, 'tier': 'open gap', 'evidence_kind': 'none', 'describes': 'undated', 'searched': ['g-one.0010']}
        case('AD complete: required fields missing', B + [fr(2)], 'has no row for', complete=True)
        req = [f for f in V.REQUIRED_FIELDS['building'] if f != 'storeys']
        case('AD2 complete: every required field has a row (open gaps allowed)', B + [srch, fr(2)] + [gapfor(100 + i, f) for i, f in enumerate(req)], None, complete=True)
        # a file of rows that name their own group
        e2 = []
        errors, warnings, stats = e2, [], {'rows': 0, 'by_type': {}, 'by_tier': {}, 'buildings': 0}
        pfile = os.path.join(tmp, 'multi.jsonl')
        with open(pfile, 'w', encoding='utf-8') as f:
            f.write(json.dumps(base_b) + '\n' + json.dumps(fr(2)) + '\n')
            f.write(json.dumps({'row': 'g-two.0001', 'type': 'building', 'group': 'g-two', 'building': 'bld-other', 'name': 'Other', 'declared_from': 'structures.json'}) + '\n')
        V.validate_group(ctx, None, pfile, errors, warnings, stats, {}, as_file=True)
        if e2:
            n_fail += 1
            fails.append('multi-group file: %s' % e2[:2])
        else:
            n_ok += 1
        # the ledger check: a changed text is refused
        ok, errs, n = V.check_ledger(ctx)
        if not ok:
            n_fail += 1
            fails.append('ledger check of the synthetic ledger: %s' % errs[:2])
        else:
            n_ok += 1
        with open(pt, 'a', encoding='utf-8', newline='') as f:
            f.write('A line added after the ledger entry.\n')
        ctx._texts = {}
        ok, errs, n = V.check_ledger(ctx)
        if ok or not any('sha256' in e for e in errs):
            n_fail += 1
            fails.append('ledger check did not notice a changed text')
        else:
            n_ok += 1
        ctx._texts = {}
        case('AE a changed text is refused in a row check', B + [fr(2)], 'the text changed since the ledger entry')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('self-test, synthetic repository: %d cases passed, %d failed' % (n_ok, n_fail))
    for f in fails:
        print('  FAILED', f)
    real_fail = real_checks(V)
    return 0 if (not fails and not real_fail) else 1


def fuzz(V, ctx, rows):
    """Robustness: every key of every example row replaced by values of the wrong type (or dropped), and the nested citation keys too; the program must report errors, never raise."""
    import copy
    bads = [None, 0, -1, 1.5, True, False, '', ' ', 'x', 'a' * 5000, [], {}, [1], {'a': 1}, [{}], {'with': 1}, ['x'], {'source': None}, 10 ** 30, 1e308, '\u0000', '\ufb01',
            {'text': 1}, {'material': []}, {'w': 'x', 'd': None, 'unit': {}}]
    decl = {(r['group'], r['building']): r for r in rows if r['type'] == 'building'}
    n, crashes = 0, []

    def run(test, tag):
        nonlocal n
        try:
            V.validate_rows(ctx, test, None, [], [], {'rows': 0, 'by_type': {}, 'by_tier': {}, 'buildings': 0}, {}, 'fuzz')
            n += 1
        except Exception as e:
            crashes.append('%s: %r' % (tag, e))
    for r in rows:
        if r['type'] == 'building':
            for k in list(r):
                for bv in bads + ['__drop__']:
                    m = copy.deepcopy(r)
                    if bv == '__drop__':
                        m.pop(k, None)
                    else:
                        m[k] = bv
                    run([dict(m, __line__=1)], '%s.%s' % (r['row'], k))
            continue
        d = decl[(r['group'], r['building'])]
        for k in list(r):
            for bv in bads + ['__drop__']:
                m = copy.deepcopy(r)
                if bv == '__drop__':
                    m.pop(k, None)
                else:
                    m[k] = bv
                run([dict(d, __line__=1), dict(m, __line__=2)], '%s.%s' % (r['row'], k))
        for k in ('image_ref', 'continuity'):
            if isinstance(r.get(k), dict):
                for kk in list(r[k]):
                    for bv in bads:
                        m = copy.deepcopy(r)
                        m[k][kk] = bv
                        run([dict(d, __line__=1), dict(m, __line__=2)], '%s.%s.%s' % (r['row'], k, kk))
    return n, crashes


def real_checks(V):
    """Real files of the repository, when present."""
    ctx = V.Ctx(V.REAL_ROOT)
    bad = 0
    if not os.path.exists(ctx.ledger_path):
        print('real files: SOURCES.md not present yet (skipped)')
        return 0
    ok, errs, n = V.check_ledger(ctx)
    print('real ledger: %d sources with local text, %s' % (n, 'OK' if ok else 'FAIL'))
    for e in errs[:20]:
        print('  ERROR', e)
    bad += 0 if ok else 1
    ex = os.path.join(ctx.evid, 'EXAMPLES.jsonl')
    if os.path.exists(ex):
        errors, warnings, stats = [], [], {'rows': 0, 'by_type': {}, 'by_tier': {}, 'buildings': 0}
        V.validate_group(ctx, None, ex, errors, warnings, stats, {}, as_file=True)
        print('EXAMPLES.jsonl: %d rows, %s' % (stats['rows'], 'OK' if not errors else 'FAIL'))
        rows = [json.loads(l) for l in open(ex, encoding='utf-8') if l.strip()]
        n, crashes = fuzz(V, ctx, rows)
        print('robustness: %d malformed variants of the example rows checked, %d exceptions' % (n, len(crashes)))
        for c in crashes[:10]:
            print('  EXCEPTION', c)
        bad += 1 if crashes else 0
        for e in errors[:20]:
            print('  ERROR', e)
        bad += 1 if errors else 0
    try:
        g = ctx.groups()
        ids = list(g)
        okg = 14 <= len(ids) <= 22 and all(__import__('re').fullmatch(r'[a-z0-9-]+', i) for i in ids)
        print('groups.json: %d groups, %s' % (len(ids), 'OK' if okg else 'FAIL'))
        bad += 0 if okg else 1
    except Exception as e:
        print('groups.json: not readable (%s)' % e)
        bad += 1
    return bad
