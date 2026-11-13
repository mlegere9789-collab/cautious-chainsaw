"""Self-test of the kit evidence tools (contract validator, number words, report-heading parser, override layer).

    python -I tools/bt/kit_evidence_selftest.py            runs every test, exit 1 on a failure
Every validator test mutates one of the real example lines of docs/battle-theatre/kit/evidence/examples.jsonl and checks that the contract rejects it
with the right code, so the tests fail if a check is weakened. Temporary files live under tmp/kit-plan/selftest/ (gitignored)."""
import copy, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit_evidence_lib as K
import kit_evidence_check as C

TMP = os.path.join(K.ROOT, 'tmp', 'kit-plan', 'selftest')
os.makedirs(TMP, exist_ok=True)
FAILS, N = [], [0]


def ok(name, cond, detail=''):
    N[0] += 1
    print(('PASS ' if cond else 'FAIL ') + name + (' -- ' + str(detail) if (detail and not cond) else ''))
    if not cond:
        FAILS.append(name)


def load_examples():
    out = {}
    with open(os.path.join(K.EV, 'examples.jsonl'), encoding='utf-8') as f:
        for line in f:
            if line.strip():
                o = json.loads(line)
                out[o['id']] = o
    return out


def run(lines, group='examples', any_unit=True, name='t'):
    p = os.path.join(TMP, '%s.jsonl' % name)
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        for o in lines:
            f.write((o if isinstance(o, str) else json.dumps(o, ensure_ascii=False)) + '\n')
    return C.check_group(group, p, any_unit=any_unit)


def codes(R):
    return sorted({e['code'] for e in R.errors})


def mut(base, **kw):
    o = copy.deepcopy(base)
    for k, v in kw.items():
        if v is KeyError:
            o.pop(k, None)
        else:
            o[k] = v
    return o


def tests():
    EX = load_examples()
    E1, E2, E3, E4, E5, G6 = (EX['examples:000%d' % i] for i in range(1, 7))
    R = run(list(EX.values()), name='base')
    ok('the six worked examples validate with no error (OCR-corrected one warns)', not R.errors and any(w['code'] == 'OCR_CORRECTED' for w in R.warnings), R.errors)
    ok('five lines are accepted and the gap line is recorded', len(R.accepted) == 5 and R.counts['gap'] == 1)

    # --- citation checks -------------------------------------------------------------------------------------------
    R = run([mut(E2, quote=E2['quote'].replace('Fifty-sixth', 'Fifty-seventh'))], name='q1')
    ok('an altered quote is not found', codes(R) == ['QUOTE_NOT_FOUND'], codes(R))
    R = run([mut(E2, offset=E2['offset'] + 1)], name='q2')
    ok('an offset one character off is rejected and the right offset is named', codes(R) == ['OFFSET'] and str(E2['offset']) in R.errors[0]['msg'], R.errors)
    R = run([mut(E2, printed_page=280)], name='q3')
    ok('the page of the running-head model (280) is rejected, the leaf map (282) governs', codes(R) == ['PAGE'] and '282' in R.errors[0]['msg'], R.errors)
    R = run([mut(E2, report_id='OR27-1-R036')], name='q4')
    ok('a wrong report id is rejected', codes(R) == ['REPORT'], R.errors)
    R = run([mut(E2, part=2)], name='q5')
    ok('a wrong part is rejected', 'PART' in codes(R), codes(R))
    R = run([mut(E2, source_id='OR27-9')], name='q6')
    ok('an unknown source is rejected', codes(R) == ['SOURCE'], codes(R))
    R = run([mut(E2, quote='short')], name='q7')
    ok('a too short quote is rejected', codes(R) == ['QUOTE'], codes(R))
    R = run([mut(E2, offset=KeyError)], name='q8')
    ok('a missing offset is rejected', 'OFFSET' in codes(R), codes(R))

    # --- numbers ---------------------------------------------------------------------------------------------------
    v = copy.deepcopy(E2['value'])
    v['officers'] = 18
    v['low'] = v['high'] = 253
    R = run([mut(E2, value=v)], name='n1')
    ok('a number that is not in the quote is rejected (17 officers became 18)', codes(R) == ['NUMBERS'], codes(R))
    R = run([mut(E2, value=v, waive_numbers='test')], name='n2')
    ok('a waiver turns the number error into a warning', not R.errors and any(w['code'] == 'NUMBERS_WAIVED' for w in R.warnings), R.errors)
    v = copy.deepcopy(E3['value'])
    v['pieces'][0]['count'] = 4
    v['total'] = 4
    R = run([mut(E3, value=v)], name='n3')
    ok('a gun count that the quote does not state is rejected', codes(R) == ['NUMBERS'], codes(R))
    ok('number words and digits are read from text', K.numbers_in_text('One hundred and thirty-nine men, twenty-three officers, 1,830 present, six guns, a hundred rounds') >= {139, 23, 1830, 6, 100}, K.numbers_in_text('One hundred and thirty-nine men'))

    # --- tier and lead sources -------------------------------------------------------------------------------------
    p = os.path.join(TMP, 'lead_source.txt')
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write('The 19th Indiana was armed with Springfield rifled muskets of calibre .58 on the first day of the battle.\nIn June the regiment drew new clothing.\n')
    rel = os.path.relpath(p, K.ROOT)
    off = open(p, encoding='utf-8', newline='').read().index('The 19th Indiana')
    src_lead = {'type': 'source', 'id': 'examples:0001', 'title': 'a web page', 'class': 'wikipedia', 'local_path': rel}
    src_ok = {'type': 'source', 'id': 'examples:0001', 'title': 'a regimental history', 'class': 'regimental_or_state_history', 'local_path': rel}
    arms = {'type': 'evidence', 'id': 'examples:0002', 'unit_id': 'us-1c-1d-meredith-19in', 'field': 'arms', 'kit_field': 'weapon', 'value': {'weapons': [{'printed': 'Springfield rifled muskets', 'weapon_id': 'm1861_springfield', 'caliber_in': 0.58, 'share': 'all'}]},
            'basis': 'regimental_history', 'tier': 'documented', 'as_of': '1863-07-01', 'source_id': 'examples:0001', 'part': None, 'report_id': None, 'printed_page': None, 'offset': off, 'quote': 'The 19th Indiana was armed with Springfield rifled muskets of calibre .58 on the first day of the battle.'}
    # the source id of a declaration must be a source id, not a line id: declare under its own id
    src_lead['id'] = 'examples:0001'
    R = run([src_lead, mut(arms, id='examples:0002')], name='l1')
    ok('a declared lead source (wikipedia) cannot carry a documented line', 'LEAD' in codes(R), codes(R))
    R = run([src_lead, mut(arms, tier='inferred', note='the page says so')], name='l2')
    ok('nor an inferred line', 'LEAD' in codes(R), codes(R))
    src_ok2 = dict(src_ok)
    R = run([src_ok2, mut(arms, source_id='examples:0001')], name='l3')
    ok('a declared printed history validates through the plain text engine (no page model: warning only)', not R.errors and any(w['code'] == 'PAGE_UNCHECKED' for w in R.warnings), R.errors)
    bad = dict(src_ok, sha256='0' * 64)
    R = run([bad, mut(arms, source_id='examples:0001')], name='l4')
    ok('a declared source with a wrong sha256 is rejected', 'DECLARE' in codes(R), codes(R))
    R = run([src_ok, mut(arms, source_id='examples:0001', value={'weapons': [{'printed': 'x', 'weapon_id': 'no_such_weapon'}]})], name='l5')
    ok('a weapon id that is not in the catalog is rejected', 'VALUE' in codes(R), R.errors)
    R = run([mut(E1, tier='plausible-procedural')], name='l6')
    ok('plausible-procedural needs a note and a register proposal', codes(R) == ['PROCEDURAL'], codes(R))
    R = run([mut(E1, tier='plausible-procedural', note='design choice', register_proposal='ws-kit-x.md', quote=KeyError, source_id=KeyError, offset=KeyError, report_id=KeyError, printed_page=KeyError, part=KeyError)], name='l7')
    ok('a reasoned plausible-procedural line needs no quote', not R.errors, R.errors)
    R = run([mut(E1, basis='derived')], name='l8')
    ok('a derived line needs derived_from', 'DERIVED' in codes(R), codes(R))

    # --- values and vocabulary ------------------------------------------------------------------------------------
    v = copy.deepcopy(E2['value'])
    v['low'], v['high'] = 300, 252
    R = run([mut(E2, value=v)], name='v1')
    ok('strength low above high is rejected', 'VALUE' in codes(R), codes(R))
    R = run([mut(E2, basis='casualty_return')], name='v2')
    ok('a basis of another field is rejected', 'BASIS' in codes(R), codes(R))
    R = run([mut(E2, field='weapons')], name='v3')
    ok('an unknown field is rejected', 'FIELD' in codes(R), codes(R))
    R = run([mut(E2, surprise=1)], name='v4')
    ok('an unknown key is rejected', 'KEYS' in codes(R), codes(R))
    R = run([mut(E3, kit_field='weapon')], name='v5')
    ok('kit_field belongs to arms and dress only', 'KITFIELD' in codes(R), codes(R))
    R = run([mut(arms, kit_field='headgear', source_id='examples:0001'), src_ok], name='v6')
    ok('arms needs an arms kit field', 'KITFIELD' in codes(R), codes(R))
    v = copy.deepcopy(E3['value'])
    v['pieces'][0]['type_id'] = 'laser_cannon'
    R = run([mut(E3, value=v)], name='v7')
    ok('a piece type that is not in the catalog is rejected', 'VALUE' in codes(R), R.errors)
    v = copy.deepcopy(E3['value'])
    v['total'] = 7
    R = run([mut(E3, value=v)], name='v8')
    ok('a gun total that is not the sum of the counts is rejected', 'VALUE' in codes(R), R.errors)
    R = run([mut(E1, as_of='1863-13-01')], name='v9')
    ok('an impossible date is rejected', 'DATE' in codes(R), codes(R))
    R = run([mut(E1, id='us-1c:0001')], name='v10')
    ok('an id of another group is rejected', 'ID' in codes(R), codes(R))
    R = run([E1, E1], name='v11')
    ok('a duplicate id is rejected', 'ID' in codes(R), codes(R))
    R = run(['{not json', E1], name='v12')
    ok('a line that is not JSON is reported and the rest is still read', 'JSON' in codes(R) and len(R.accepted) == 1, codes(R))

    # --- table rows read from the image ----------------------------------------------------------------------------
    v = copy.deepcopy(E5['value'])
    v['row'] = [2, 25, 12, 121, 4, 46, 211]
    v['total'] = 211
    R = run([mut(E5, value=v)], name='t1')
    ok('a misread table figure (aggregate does not add up) is caught', 'CHECK' in codes(R), codes(R))
    R = run([mut(E5, image=KeyError)], name='t2')
    ok('image_row needs the image block', 'IMAGE' in codes(R), codes(R))
    R = run([mut(E5, image={'pdf_page': 198, 'dpi': 200})], name='t3')
    ok('the scan page of an image block must be the page of the quote', 'IMAGE' in codes(R), codes(R))
    R = run([mut(E5, quote_mode='exact')], name='t4')
    ok('a casualty-return row in exact mode is refused (the OCR scrambles the columns)', 'TABLE' in codes(R) or 'CHECK' in codes(R), codes(R))
    v = copy.deepcopy(E5['value'])
    v['wounded']['enlisted'] = 120
    R = run([mut(E5, value=v)], name='t5')
    ok('value that differs from the row read is caught', 'CHECK' in codes(R), codes(R))
    R = run([mut(E4, quote="Stevens' (Fifth Maine, six 14-pounders battery)")], name='t6')
    ok('an OCR-corrected quote that is not close to the text is rejected', 'QUOTE_NOT_FOUND' in codes(R), codes(R))
    R = run([mut(E4, offset=E4['offset'] + 3000)], name='t7')
    ok('an OCR-corrected quote far from its offset is rejected', 'QUOTE_NOT_FOUND' in codes(R), codes(R))

    # --- conflicts, supersession, gaps, coverage -------------------------------------------------------------------
    s2 = mut(E2, id='examples:0007')
    v = copy.deepcopy(E2['value'])
    v['officers'], v['enlisted'], v['low'], v['high'] = 17, 235, 252, 252
    other = {'type': 'evidence', 'id': 'examples:0008', 'unit_id': E2['unit_id'], 'field': 'strength', 'value': {'low': 330, 'high': 330, 'men': 'officers_and_men'}, 'basis': 'taken_into_action', 'tier': 'inferred', 'as_of': '1863-07-01', 'note': 'a second figure for the same quantity',
             'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R037', 'printed_page': 282, 'offset': E2['offset'], 'quote': E2['quote']}
    R = run([E2, other], name='c1')
    ok('two different values of one quantity without a declared conflict are rejected', 'CONFLICT' in codes(R), codes(R))
    R = run([mut(E2, conflict={'key': 'us-1c-1d-cutler-56pa|strength|1863-07-01', 'alt': 'A'}), mut(other, conflict={'key': 'us-1c-1d-cutler-56pa|strength|1863-07-01', 'alt': 'B'})], name='c2')
    ok('declared as alternatives they stand side by side', not R.errors, R.errors)
    R = run([mut(E2, conflict={'key': 'us-1c-1d-cutler-56pa|strength|1863-07-01', 'alt': 'A'}), mut(other, conflict={'key': 'us-1c-1d-cutler-56pa|strength|1863-07-01', 'alt': 'A'})], name='c3')
    ok('alternatives need different labels', 'CONFLICT' in codes(R), codes(R))
    R = run([E2, mut(other, supersedes='examples:0002')], name='c4')
    ok('a superseded line leaves no collision and is listed', not R.errors and 'examples:0002' in R.superseded, R.errors)
    R = run([E2, mut(other, supersedes='examples:0099')], name='c5')
    ok('supersedes names an existing earlier line', 'SUPERSEDES' in codes(R), codes(R))
    R = run([E3, E4], name='c6')
    ok('the same quantity on two dates is not a conflict (guns on 1 July and 3 July)', not R.errors, R.errors)
    R = run([mut(G6, searched=[])], name='g1')
    ok('a gap line needs what was searched', 'GAP' in codes(R), codes(R))
    R = run([mut(G6, result='gave_up')], name='g2')
    ok('a gap line needs a result from the vocabulary', 'GAP' in codes(R), codes(R))
    R = run([mut(G6, unit_ids=['us-nonexistent'])], name='g3')
    ok('a gap line names real units', 'UNIT' in codes(R), codes(R))
    # coverage in group mode: a one-unit view
    R = run([mut(E1, id='us-1c:0001'), mut(G6, id='us-1c:0002', unit_ids=['us-1c-1d-meredith-19in'], fields=['arms', 'dress'])], group='us-1c', any_unit=False, name='cov')
    gdoc = K.groups_doc()
    u = next(u for g in gdoc['groups'] if g['id'] == 'us-1c' for u in g['units'] if u['unit_id'] == 'us-1c-1d-meredith-19in')
    open_pairs = R.coverage['open'].get('us-1c-1d-meredith-19in', [])
    ok('coverage: roster and commander of the unit are addressed only through lines, arms and dress through a gap line',
       'commander' not in open_pairs and 'arms' not in open_pairs and 'dress' not in open_pairs and 'strength' in open_pairs, (u['required'], open_pairs))
    R = run([mut(E1, id='us-1c:0001', unit_id='us-2c-1d-caldwell')], group='us-1c', any_unit=False, name='cov2')
    ok('a unit of another group is rejected in group mode', 'UNIT' in codes(R), codes(R))

    # --- text engine -----------------------------------------------------------------------------------------------
    src = K.get_source('OR27-1')
    hy = re.search(r'\b(Fifty|Sixty|Seventy|Eighty|Ninety|Forty|Thirty|Twenty)-\s*\n\s*(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\b', src.raw)
    if hy:
        phrase = re.sub(r'\s+', '', hy.group(0)[:len(hy.group(1)) + 1]) + hy.group(2)
        hits = src.locate(phrase)
        ok('a hyphenated ordinal broken over two lines is found through the hyphen-insensitive view (%s)' % phrase, bool(hits) and hits[0]['via'] in ('exact', 'hyphen'), hits)
    ok('leaf map: printed page of the 56th Pennsylvania passage is 282 (the running-head model says 280)', src.page_at(E2['offset'])[0] == 282)
    ok('the record of the 56th Pennsylvania passage is Cutler (R037)', src.record_at(E2['offset'])[0] == 'OR27-1-R037')
    lm = src.leafmap
    ok('leaf map: printed page 173 maps to leaf 196 (PDF page 197)', lm.leaf_of_page(173) == 196)
    ok('quote with typographic apostrophe matches the plain-apostrophe text', bool(src.locate("Stevens’ battery (Fifth Maine, six 12-pounders)")))
    ok('a case difference is not matched but is reported', not src.locate("stevens' battery (fifth maine, six 12-pounders)") and src.locate_ci("stevens' battery (fifth maine, six 12-pounders)") is not None)


def plan_tests():
    import kit_evidence_plan as P
    cases = [('Seventy-sixth New York Infantry.', (76, 'NY', 'infantry', None)), ('Battery C, First Rhode Island Light Artillery.', (1, 'RI', 'artillery', 'C')), ('One hundred and fiftieth Pennsylvania Infantry', (150, 'PA', 'infantry', None)),
             ('Fifth Maine Battery.', (5, 'ME', 'artillery', None)), ('Twentieth Maine Infantry', (20, 'ME', 'infantry', None)), ('First West Virginia Cavalry.', (1, 'WV', 'cavalry', None)),
             ('Sixth U. S. Infantry, commanding First Brigade.', (6, 'US', 'infantry', None)), ('Brig. Gen. Lysander Cutler, commanding Second Brigade', None)]
    for scope, want in cases:
        ok('parse_scope(%r) = %r' % (scope, want), P.parse_scope(scope) == want, P.parse_scope(scope))
    ok('ordinal words: 76 -> Seventy-sixth, 150 -> One hundred and fiftieth, 3 -> Third', [P.int_to_ordinal_word(x) for x in (76, 150, 3)] == ['Seventy-sixth', 'One hundred and fiftieth', 'Third'], [P.int_to_ordinal_word(x) for x in (76, 150, 3)])


def main():
    tests()
    plan_tests()
    try:
        import kit_overrides_selftest as OT
        OT.run(ok)
    except ImportError:
        pass
    print('\n%d checks, %d failed' % (N[0], len(FAILS)))
    for f in FAILS:
        print('  FAILED:', f)
    return 1 if FAILS else 0


if __name__ == '__main__':
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    sys.exit(main())
