"""Writes the two fixtures of check_undrawn.py --self-test:

    python3 -I docs/battle-theatre/history/undrawn/tools/make_fixtures.py

    fixtures/us-3c-2d.good.jsonl   14 records that the checker must pass: real passages of five reports of OR Ser. I vol. 27 pt. 1 (R158 Humphreys, R162 Tripp, R168 Opp,
                                   R169 Brewster, R171 Potter), every quote, offset, page and report id computed by code from the local text, one record of every kind that
                                   needs a text but `unit` and `gap` (those two are tested by the self-test in code). The claim ids are 9001 to 9014: a fixture is a test of
                                   the format, never evidence; the integrator reads only undrawn/<group>.jsonl, never this directory.
    fixtures/us-3c-2d.bad.jsonl    one line per defect: a copy of a good record with exactly one defect, and `_expect`, a piece of the error message the checker must give for
                                   that line (the self-test fails if a line is refused for another reason, or not refused).

Nothing here is typed from memory: a phrase that is not in the text stops the script.
"""
import os, re, sys, json, copy
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import check_undrawn as C                                           # noqa: E402

R = C.Repo()
GID = 'us-3c-2d'
FX = os.path.join(HERE, 'fixtures')
ORX = R.orx
cid = lambda n: 'U-%s-%04d' % (GID, n)


def where(rid, phrase):
    """-> (start, end) original offsets of a phrase of the normalized text, inside the report rid"""
    nt, nmap = C.view_of(R, 'OR27-1')
    q = C.fold(C.norm_query(phrase)); r = ORX[rid]; i = nt.find(q)
    while i >= 0:
        s = nmap[i]
        if r['start_offset'] <= s < r['end_offset']: return s, nmap[i + len(q) - 1] + 1
        i = nt.find(q, i + 1)
    raise SystemExit('NOT FOUND in %s: %s' % (rid, phrase))


def source(rid, quote, p_from, p_to, role, author):
    """the `source` object of a record: quote, offsets, page and report by code; the passage runs from the start of p_from to the end of p_to"""
    hits = [h for h in C.find_quote(R, 'OR27-1', quote) if h['report_id'] == rid]
    assert len(hits) == 1, (rid, quote, len(hits))
    h = hits[0]; a = where(rid, p_from)[0]; b = where(rid, p_to)[1]
    assert a <= h['offset'] and h['end'] <= b, (quote, 'the passage must hold the quote')
    r = ORX[rid]
    return {'source_id': 'OR27-1', 'report_id': rid, 'author': author, 'author_role': role, 'printed_page': h['page'], 'quote': quote, 'quote_offset': h['offset'], 'passage': [a, b],
            'cite': 'OR Ser. I vol. 27 pt. 1, %s %s, p. %s' % (rid, author, h['page'])}


def clock(printed, t, date, approx=False, basis='printed_clock', date_basis='printed', **kw):
    return {'date': date, 'date_basis': date_basis, 'basis': basis, 'printed': printed, 't_iso': t, 't_end_iso': None, 'period': None, 'approx': approx, **kw}


def period(printed, per, date, date_basis='context'):
    return {'date': date, 'date_basis': date_basis, 'basis': 'printed_period', 'printed': printed, 't_iso': None, 't_end_iso': None, 'period': per, 'approx': True}


def gz(ref, printed, rel=None, near=None):
    a = {'type': 'gazetteer', 'ref': ref}
    return {'printed': printed, 'anchor': a, 'relation': rel}


def base(n, kind, unit, tier, statement, src=None, **kw):
    r = {'claim_id': cid(n), 'group': GID, 'kind': kind, 'unit_id': unit, 'tier': tier, 'render_flag': {'documented': 0, 'inferred': 1}[tier], 'weak_source': False,
         'claim_support_verified': True, 'fidelity_check': 'passed_full_read', 'ocr_uncertain': False, 'flag_single_source': True, 'conflicts_with': [], 'corroborates': [],
         'conflict_key': None, 'timeline': [], 'statement': statement, 'source': src}
    r.update(kw)
    if tier == 'inferred': r.setdefault('reasoning', 'the passage states the fact in other words: see statement')
    return r


def build():
    HUM, TRI, OPP, BRE, POT = ('Brig. Gen. Andrew A. Humphreys', 'Lieut. Col. Porter D. Tripp', 'Lieut. Col. Milton Opp', 'Col. William R. Brewster', 'Col. Henry L. Potter')
    G = []
    G.append({'claim_id': cid(9001), 'group': GID, 'kind': 'source', 'source_decl': {'source_id': 'FIXTURE-TEXT', 'title': 'FIXTURE: a declared text that is on no machine (tests the shape of a source record only)', 'year': 1888,
              'archive_identifier': 'fixture-not-a-text', 'url': 'https://archive.org/details/fixture-not-a-text', 'path': 'tmp/units-%s/fixture-text.txt' % GID, 'bytes': 1, 'sha256': '0' * 64,
              'licence_basis': 'FIXTURE: no text; a real record states why the text is public domain (a work published before 1930, a government document)', 'class': 'secondary'}})
    # night position of the division (Humphreys): a printed clock and a place east of a gazetteer road
    G.append(base(9002, 'night_position', 'us-3c-2d', 'documented', 'The division bivouacked at 1 a. m. on 2 July about a mile from Gettysburg, east of the Emmitsburg road (the OCR prints Ernmitsburg).',
                  source('OR27-1-R158', 'bivouacking at 1 a. m. on July 2 about 1 mile from Gettysburg', 'bivouacking at 1 a. m. on July 2', 'eastward of the Ernmitsburg road', 'formation_commander', HUM),
                  ocr_uncertain=True, conflicts_with=[cid(9003)], conflict_key='us-3c-2d|arrival|1863-07-02',
                  when=clock('1 a. m. on July 2', '1863-07-02T01:00', '1863-07-02'),
                  place={'printed': 'about 1 mile from Gettysburg and eastward of the Ernmitsburg road', 'anchor': {'type': 'along_road', 'ref': 'GZ-041', 'near': 'GZ-072'}, 'relation': {'rel': 'east_of'}},
                  activity='camp', formation=None, facing={'basis': 'none', 'printed': None, 'ref': None, 'deg': None}))
    # arrival of a regiment (Tripp): 2 a. m., which differs from the division's 1 a. m.: both carried, none chosen
    G.append(base(9003, 'arrival', 'us-3c-2d-carr-11ma', 'documented', 'The 11th Massachusetts reached Gettysburg at 2 a. m. on 2 July after marching through Emmitsburg.',
                  source('OR27-1-R162', 'marched through Emmitsburg to Gettysburg, Pa., where we arrived at 2 a. m.', 'Left Bridgeport at 7 a. m. on July 1', 'at 2 a. m. on the 2d instant', 'unit_commander', TRI),
                  conflicts_with=[cid(9002)], conflict_key='us-3c-2d|arrival|1863-07-02',
                  when=clock('2 a. m. on the 2d instant', '1863-07-02T02:00', '1863-07-02'), arrival={'scope': 'field'}, place=gz('GZ-072', 'Gettysburg, Pa.')))
    G.append(base(9004, 'march', 'us-3c-2d-carr-11ma', 'documented', 'The 11th Massachusetts left Bridgeport at 7 a. m. on 1 July and marched through Emmitsburg toward Gettysburg.',
                  source('OR27-1-R162', 'Left Bridgeport at 7 a. m. on July 1, and marched through Emmitsburg', 'Left Bridgeport at 7 a. m. on July 1', 'at 2 a. m. on the 2d instant', 'unit_commander', TRI),
                  when=clock('7 a. m. on July 1', '1863-07-01T07:00', '1863-07-01'), road={'printed': 'marched through Emmitsburg to Gettysburg', 'ref': None, 'identification': None}))
    # a road of approach (Humphreys, Third Brigade): the printed name is not the gazetteer's: a road_identification record
    G.append(base(9005, 'arrival_road', 'us-3c-2d-burling', 'documented', 'The Third Brigade joined the division at 9 a. m. on 2 July, marching by the main road from Emmitsburg to Gettysburg.',
                  source('OR27-1-R158', 'It marched by the main road from Emmitsburg to Gettysburg.', 'At 9 a. m. the Third Brigade', 'main road from Emmitsburg to Gettysburg.', 'formation_commander', HUM),
                  when=clock('9 a. m.', '1863-07-02T09:00', '1863-07-02'),
                  road={'printed': 'the main road from Emmitsburg to Gettysburg', 'ref': 'GZ-041', 'identification': cid(9006), 'enters_ground': True}))
    G.append(base(9006, 'road_identification', 'us-3c-2d-burling', 'inferred', 'The main road from Emmitsburg to Gettysburg of this passage is the gazetteer\'s Emmitsburg Road.',
                  source('OR27-1-R158', 'It marched by the main road from Emmitsburg to Gettysburg.', 'At 9 a. m. the Third Brigade', 'main road from Emmitsburg to Gettysburg.', 'formation_commander', HUM),
                  reasoning='the report calls the road on the crest of the ridge "the Emmitsburg road" in the same account; the road from Emmitsburg to Gettysburg is that road',
                  road_identification={'printed_name': 'the main road from Emmitsburg to Gettysburg', 'ref': 'GZ-041', 'basis': 'the printed words describe the road that runs from Emmitsburg to Gettysburg; the same report names it the Emmitsburg road'}))
    # a position (period word) and a movement to a line along a road (clock)
    G.append(base(9007, 'position', 'us-3c-2d', 'documented', 'At an early hour on 2 July the division was massed near its bivouac, facing the Emmitsburg road.',
                  source('OR27-1-R158', 'my division was massed in the vicinity of its bivouac, facing the Emmitsburg road', 'At an early hour of the morning', 'about 2 miles from Gettysburg.', 'formation_commander', HUM),
                  when=period('At an early hour of the morning', 'early_morning', '1863-07-02'),
                  place={'printed': 'in the vicinity of its bivouac, facing the Emmitsburg road', 'anchor': {'type': 'along_road', 'ref': 'GZ-041'}, 'relation': None},
                  activity='stand', formation='column_mass', facing={'basis': 'toward_place', 'printed': 'facing the Emmitsburg road', 'ref': 'GZ-041', 'deg': None}))
    G.append(base(9008, 'movement', 'us-3c-2d', 'documented', 'About 4 p. m. on 2 July the division moved forward so that its first line ran along the Emmitsburg road.',
                  source('OR27-1-R158', 'so that the first line ran along the Emmitsburg road', 'About 4 p. m., in compliance', 'so that the first line ran along the Emmitsburg road', 'formation_commander', HUM),
                  when=clock('About 4 p. m.', '1863-07-02T16:00', '1863-07-02', approx=True), **{'from': cid(9007)},
                  to={'printed': 'so that the first line ran along the Emmitsburg road', 'anchor': {'type': 'along_road', 'ref': 'GZ-041'}, 'relation': {'rel': 'on'}}, gait='march'))
    # an engagement with a window (until) and a place that has no anchor (a warning, not an error)
    G.append(base(9009, 'engagement', 'us-3c-2d-carr-11ma', 'documented', 'The 11th Massachusetts moved to the front at 8 a. m. on 2 July, went into line of battle at 3 p. m. and was engaged until 8 p. m.',
                  source('OR27-1-R162', 'The regiment was engaged with the enemy until 8 p. m.', 'At 8 a. m. the same day', 'until 8 p. m. on the 2d instant', 'unit_commander', TRI),
                  when=clock('3 p. m.', '1863-07-02T15:00', '1863-07-02'), until=clock('8 p. m. on the 2d instant', '1863-07-02T20:00', '1863-07-02'),
                  place={'printed': 'to the front to support a line of skirmishers', 'anchor': {'type': 'none'}, 'relation': None},
                  activity='fire', formation='line', facing={'basis': 'none', 'printed': None, 'ref': None, 'deg': None}))
    # a position relative to another unit (the right of the First Brigade) without a clock: a day part
    G.append(base(9010, 'position', 'us-3c-2d-brewster-74ny', 'documented', 'On the afternoon of 2 July the Fifth Excelsior (74th New York) was placed on the right of the First Brigade.',
                  source('OR27-1-R169', 'Lieut. Col. Thomas Holt commanding, was placed on the right of the First', 'At about 1 o\'clock on the afternoon of the 2d', 'was placed on the right of the First', 'formation_commander', BRE),
                  ocr_uncertain=True, when=period('on the afternoon of the 2d', 'afternoon', '1863-07-02'),
                  place={'printed': 'on the right of the First Brigade', 'anchor': {'type': 'unit', 'ref': 'us-3c-2d-carr'}, 'relation': {'rel': 'right_of'}},
                  activity='stand', formation='line', facing={'basis': 'none', 'printed': None, 'ref': None, 'deg': None}))
    G.append(base(9011, 'line_order', 'us-3c-2d', 'documented', 'Shortly after midday on 2 July the division stood with the First Brigade in the front line, the Second in mass 200 yards behind it and the Third 200 yards behind the second.',
                  source('OR27-1-R158', 'in line of battalions in mass 200 yards in rear of the first line', 'Shortly after midday, I was ordered', 'opposite its center.', 'formation_commander', HUM),
                  when=clock('Shortly after midday', '1863-07-02T12:00', '1863-07-02', approx=True, date_basis='context'), order={'direction': 'front_to_rear', 'units': ['us-3c-2d-carr', 'us-3c-2d-brewster', 'us-3c-2d-burling']}))
    G.append(base(9012, 'departure', 'us-3c-2d', 'documented', 'At 3 a. m. on 7 July the division marched out on the Emmitsburg road.',
                  source('OR27-1-R158', 'At 3 a. m. of the 7th, my division marched on the Emmitsburg road', 'At 3 a. m. of the 7th', 'Emmitsburg road, and bivouacked', 'formation_commander', HUM),
                  when=clock('3 a. m. of the 7th', '1863-07-07T03:00', '1863-07-07', date_basis='context'), road={'printed': 'the Emmitsburg road', 'ref': 'GZ-041', 'identification': None}))
    # strength: two printed figures of one sentence, two records (a range is written with min and max)
    for n, what, v in ((9013, 'enlisted', 230), (9014, 'officers', 13)):
        G.append(base(n, 'strength', 'us-3c-2d-brewster-71ny', 'documented', 'The 71st New York engaged on 2 July with %d %s (the report prints 230 men and 13 officers).' % (v, 'enlisted men' if v == 230 else 'officers'),
                      source('OR27-1-R171', 'out of 230 men and 13 officers, it lost', 'The regiment was engaged at Gettysburg', 'it lost', 'unit_commander', POT),
                      strength={'what': what, 'value': v, 'min': None, 'max': None, 'printed': '230 men and 13 officers', 'as_of': '1863-07-02', 'approx': False}))
    G.append(base(9015, 'absent', 'us-3c-2d-carr-84pa', 'documented', 'The 84th Pennsylvania guarded the wagon train of the Second Division from 30 June and went with it to Westminster, arriving at 7 a. m. on 2 July.',
                  source('OR27-1-R168', 'Was detailed to guard wagon train of the Second Division, Third Corps', 'Was detailed to guard wagon train', 'arriving at 7 a. m. on the 2d', 'unit_commander', OPP),
                  absent={'whole_battle': True, 'where_printed': 'Westminster, Md.', 'duty_printed': 'guard wagon train of the Second Division, Third Corps', 'part': None}))
    for g in G:
        if g.get('kind') == 'source': continue
    return G


def bad(G):
    """one defect per line"""
    by = {int(g['claim_id'][-4:]): g for g in G}
    L = []
    n = [9100]

    def line(expect, base_no, mut, kind=None):
        r = copy.deepcopy(by[base_no]); n[0] += 1; r['claim_id'] = cid(n[0]); r.pop('conflicts_with', None); r['conflicts_with'] = []; r['_expect'] = expect
        if kind: r['kind'] = kind
        mut(r); L.append(r)

    def s(k, v): return lambda r: r['source'].__setitem__(k, v)
    line('at most 14', 9007, lambda r: r['source'].__setitem__('quote', 'my division was massed in the vicinity of its bivouac, facing the Emmitsburg road near the crest'))
    line('quote is not in OR27-1', 9007, s('quote', 'my division was massed in the neighbourhood of its bivouac'))
    line('quote_offset', 9007, s('quote_offset', 12345))
    line('quote stands in', 9007, s('report_id', 'OR27-1-R159'))
    line('as the author', 9007, s('author_role', 'compiler'))
    line('render_flag must be 0', 9007, lambda r: r.__setitem__('render_flag', 1))
    line('claim_support_verified true', 9007, lambda r: r.__setitem__('claim_support_verified', False))
    line('procedural fill', 9007, lambda r: r.update(tier='plausible-procedural', render_flag=2))
    line('is not in the roster', 9007, lambda r: r.__setitem__('unit_id', 'us-3c-2d-nonesuch'))
    line('is not a gazetteer id', 9003, lambda r: r['place']['anchor'].__setitem__('ref', 'GZ-999'))
    line('is not a place', 9003, lambda r: r['place']['anchor'].__setitem__('ref', 'GZ-041'), kind='position')
    line('is not a clock printed', 9003, lambda r: r['when'].__setitem__('t_iso', '1863-07-02T03:00'))
    line('has none of its words', 9007, lambda r: r['when'].__setitem__('period', 'dusk'))
    line('is outside', 9003, lambda r: r['when'].update(date='1863-08-02', t_iso='1863-08-02T02:00'))
    line('strength needs value', 9013, lambda r: r['strength'].update(min=200, max=240))
    line('must be under', 9001, lambda r: r['source_decl'].__setitem__('path', 'tmp/other/fixture-text.txt'))
    line('claim_id must be', 9007, lambda r: r.__setitem__('claim_id', 'U-us-5c-9999'))
    line('is not in the passage read', 9007, lambda r: r['place'].__setitem__('printed', 'on the Taneytown road behind the batteries'))
    line('at most 4000', 9007, lambda r: r['source'].__setitem__('passage', [r['source']['passage'][0], r['source']['passage'][0] + 4500]))
    line('relative to itself', 9010, lambda r: r['place']['anchor'].__setitem__('ref', 'us-3c-2d-brewster-74ny'))
    line('needs anchor.basis', 9010, lambda r: r['place'].__setitem__('anchor', {'type': 'monument', 'ref': 'MON-1'}))
    line('carries no compass word', 9007, lambda r: r.__setitem__('facing', {'basis': 'printed_compass', 'printed': 'facing the Emmitsburg road', 'ref': None, 'deg': 90}))
    line('fidelity_check must be passed_full_read', 9007, lambda r: r.__setitem__('fidelity_check', 'not_rechecked'))
    line('statement', 9007, lambda r: r.__setitem__('statement', 'Massed.'))
    line('needs reasoning', 9006, lambda r: r.__setitem__('reasoning', ''))
    line('distance.m is not', 9002, lambda r: r['place'].__setitem__('relation', {'rel': 'east_of', 'distance': {'printed': 'about 1 mile', 'value': 1, 'unit': 'miles', 'm': 1000}}))
    line('does not carry a name', 9012, lambda r: r['road'].update(printed='the pike to Westminster'))
    line('kind must be one of', 9007, lambda r: r.__setitem__('kind', 'rumour'))
    line('order.units must list', 9011, lambda r: r['order'].__setitem__('units', ['us-3c-2d-carr']))
    line('absent needs', 9015, lambda r: r['absent'].update(where_printed=None, duty_printed=None))
    line('is for gap records only', 9007, lambda r: r.update(tier='open gap', render_flag=None))
    line('unit.parent is required', 9007, lambda r: r.update(kind='unit', unit={'action': 'add', 'name': 'Provost guard', 'level': 'company', 'arm': 'infantry'}))
    line('group must be', 9007, lambda r: r.__setitem__('group', 'us-5c'))
    line('enters_ground', 9005, lambda r: r['road'].pop('enters_ground'))
    line('gap.register must name', 9007, lambda r: (r.update(kind='gap', tier='open gap', render_flag=None, gap={'what': ['positions'], 'searched': [{'source_id': 'OR27-1', 'where': 'a', 'terms': 'b', 'result': 'c'}] * 3, 'register': 'docs/other.md'}), r.pop('source')))
    line('at least three searches', 9007, lambda r: (r.update(kind='gap', tier='open gap', render_flag=None, gap={'what': ['positions'], 'searched': [{'source_id': 'OR27-1', 'where': 'a', 'terms': 'b', 'result': 'c'}] * 2, 'register': 'docs/battle-theatre/GOVERNANCE/horde/ws-units/proposed-register/%s-x.md' % GID}), r.pop('source')))
    line('is not in sources.json', 9007, s('source_id', 'NO-SUCH-TEXT'))
    line('is not a troop-map claim', 9010, lambda r: r['place'].__setitem__('anchor', {'type': 'troopmap', 'ref': 'TMJ9-999'}))
    line('is not a record of the group files', 9007, lambda r: r.__setitem__('conflicts_with', ['U-us-3c-2d-8888']))
    line('belongs to group', 9007, lambda r: r.__setitem__('unit_id', 'us-5c'))
    line('copy audit', 9007, lambda r: r.__setitem__('note', 'checked by an automated agent'))
    line('carries a clock', 9007, lambda r: r['when'].update(printed='At an early hour of the morning, 9 a. m.', period='early_morning'))
    line('t_iso is set only for a printed clock', 9007, lambda r: r['when'].__setitem__('t_iso', '1863-07-02T06:00'))
    line('road.printed (the road', 9005, lambda r: r.__setitem__('road', {'printed': '', 'ref': 'GZ-041', 'enters_ground': True}))
    return L


def main():
    G = build()
    os.makedirs(FX, exist_ok=True)
    with open(os.path.join(FX, '%s.good.jsonl' % GID), 'w', encoding='utf-8', newline='\n') as f:
        for g in G: f.write(json.dumps(g, ensure_ascii=False) + '\n')
    B = [b for b in bad(G) if b]
    with open(os.path.join(FX, '%s.bad.jsonl' % GID), 'w', encoding='utf-8', newline='\n') as f:
        for b in B: f.write(json.dumps(b, ensure_ascii=False) + '\n')
        f.write('{"claim_id": "U-us-3c-2d-9199", "kind": "position",,}\n')           # not JSON: expect 'not JSON'
    print('good', len(G), 'bad', len(B) + 1)


if __name__ == '__main__':
    main()
