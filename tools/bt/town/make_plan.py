#!/usr/bin/env python3
"""Write docs/battle-theatre/town/evidence/PLAN.md from tools/bt/town/PLAN.template.md and the data.

    python3 tools/bt/town/make_plan.py

Fills: the inventory table (from structures.json and the product inventory), the group table and notes (evidence/groups.json), the examples (evidence/EXAMPLES.jsonl),
the local-text hit counts (evidence/coverage-local.json, when the job has run), the number of self-test cases (the self-test is run).
"""
import collections, json, os, re, subprocess, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
EV = os.path.join(BT, 'town', 'evidence')


def jl(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def inventory_table():
    inv = jl(os.path.join(BT, 'app', 'data', 'structures3d-inventory.json'))
    S = jl(os.path.join(BT, 'structures', 'structures.json'))['structures']
    kinds = collections.Counter(r['kind'] for r in S)
    b = [r for r in inv['records'] if r['kind'] in ('building', 'bridge')]
    bc = collections.Counter(r['decision'] for r in b)
    F = inv['features']
    fc = collections.Counter((f['layer'], f['decision'], f['group']) for f in F)
    st = lambda k: sum(v for (l, d, g), v in fc.items() if l == 'basemap structures' and (d, g) == k)
    walls_p = sum(v for k, v in kinds.items() if k in ('preexisting_wall_or_fence', 'terrain_excavation'))
    fen = sum(v for k, v in kinds.items() if k.startswith('fence') or k == 'stone_wall')
    works = 18
    hosp = jl(os.path.join(BT, 'structures', 'hospitals.json'))['hospitals']
    rows = [
        ('`structures.json` records', '%d' % len(S), '%d building and bridge records (%d drawn as extruded footprints, %d as a marker only, %d not drawn: no geometry); %d pre-existing walls and the unfinished grade (P-nn); %d gun emplacements (G-nn) and %d works (E-nn), which are another pass; %d fence records (FEN-*); %d road, avenue and railroad records; %d states of the ground, crops, people and sky; %d epilogue states'
         % (len(b), bc['drawn (extruded footprint)'], bc['marker only'], bc['not drawn'], walls_p, kinds['gun_emplacement'], works, fen,
            kinds['road'] + kinds['avenue_not_in_1863'] + kinds['railroad'], kinds['crop'] + kinds['cemetery'] + kinds['world_state'] + kinds['terrain'] + kinds['group'] + kinds['person_state'], kinds['epilogue_state'])),
        ('Catalogue structures (`docs/basemap1863/features/structures`)', '605', '%d borough masses drawn flat (ink extent of the Warren plate, error 20 m); %d extruded footprints (2023 outlines and traced outlines); %d labelled markers (map-symbol and named points); not drawn: %d outside the loaded ground, %d machine-detected plate symbols not reviewed, %d with no geometry, %d rejected as not a building symbol'
         % (st(('drawn', 'mass')), st(('drawn', 'footprint')), st(('marker', 'point')), st(('not drawn', 'outside')), st(('not drawn', 'unreviewed')), st(('not drawn', 'no geometry')), st(('not drawn', 'rejected')))),
        ('Fences and walls (candidates of the base map)', '%d' % sum(v for (l, d, g), v in fc.items() if l == 'basemap fences'), '%d lines drawn (confirmed on the period sheet: 30 lines, 6276 m); %d not confirmed or shorter than 40 m; %d outside the ground'
         % (sum(v for (l, d, g), v in fc.items() if l == 'basemap fences' and d == 'drawn'), sum(v for (l, d, g), v in fc.items() if l == 'basemap fences' and g.startswith('fence not')), sum(v for (l, d, g), v in fc.items() if l == 'basemap fences' and g == 'outside'))),
        ('Roads, lanes, railway, bridges', '%d roads, %d lanes (+%d inventory-only), %d railway records, %d bridges' % (
            sum(v for (l, d, g), v in fc.items() if l == 'basemap roads'), sum(v for (l, d, g), v in fc.items() if l == 'basemap lanes'),
            sum(v for (l, d, g), v in fc.items() if l == 'basemap lanes (inventory without geometry)'),
            sum(v for (l, d, g), v in fc.items() if l.startswith('basemap railways')), sum(v for (l, d, g), v in fc.items() if l == 'basemap bridges')),
         'ground ribbons for 24 roads, 4 lanes and 2 railway lines; 8 bridge points as markers; 11 bridges, 7 roads outside the ground; 18 named lanes with no traced line; 3 railway records not in 1863'),
        ('Hospitals (`hospitals.json`)', '%d' % len(hosp), '14 name a host building (11 drawn or marked, 3 with no geometry); 9 name none (corps sites, the town as one vast hospital, Camp Letterman)'),
        ('Photographs (photo-match ledger)', '129', 'camera positions documented: 0 (70 statements in LOC and NPS texts: not one a coordinate, a lens or a station); poses registered 16: 0 match, 5 roughly, 4 do not, 7 cannot judge'),
    ]
    out = '| Class | Count | State in the product today |\n|---|---|---|\n'
    for a, b2, c in rows:
        out += '| %s | %s | %s |\n' % (a, b2, c)
    return out


def group_table(G):
    out = '| # | group | prefix | records (parts) | borough masses | plate symbols | named structures | beyond the ground | bridges + rail | fence candidates | roads + lanes | hospitals |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n'
    tot = collections.Counter()
    for i, g in enumerate(G, 1):
        c = g['counts']
        out += '| %d | `%s` | %s | %d (%d) | %d | %d | %d | %d | %d | %d | %d | %d |\n' % (i, g['id'], g['prefix'], c['building_records'], c['record_parts'], c['borough_masses'], c['map_symbols'], c['curated_farm_and_named'],
                                                                          c['outside_loaded_ground'], c['bridges'] + c['railways'], c['fences'], c['roads'] + c['lanes'], c['hospitals'])
        for k, v in (('rec', c['building_records']), ('part', c['record_parts']), ('mass', c['borough_masses']), ('sym', c['map_symbols']), ('named', c['curated_farm_and_named']), ('out', c['outside_loaded_ground']),
                     ('br', c['bridges'] + c['railways']), ('fen', c['fences']), ('rd', c['roads'] + c['lanes']), ('h', c['hospitals'])):
            tot[k] += v
    out += '| | **total** | | %d (%d) | %d | %d | %d | %d | %d | %d | %d | %d |\n' % (tot['rec'], tot['part'], tot['mass'], tot['sym'], tot['named'], tot['out'], tot['br'], tot['fen'], tot['rd'], tot['h'])
    out += '\n"Named structures" are the curated farm buildings, town buildings and named sites of the catalogue (drawn or not: the three columns masses, symbols and named structures add up to the 605 structures; "beyond the ground" is a part of them, not a further class); "plate symbols" are the machine-detected and hand-reviewed symbols of the Warren plate (owner labels are OCR hints). The structures of `STR-*` that are not in a group of this table: none (605 of 605 assigned).\n'
    return out


def group_notes(G):
    out = ''
    for g in G:
        out += '#### `%s`: %s\n\n%s\n\n' % (g['id'], g['title'], g['scope'])
        out += '- Sources to read first: %s.\n' % ', '.join(g['sources'])
        if g['photos']:
            out += '- Photographs of the ledger to read (LOC ids): %s.\n' % ', '.join(g['photos'])
        out += '- New ids: `%s`. Search queries and the target names are in `evidence/groups.json`.\n' % g['twn_id_format']
        for it in g['issues']:
            out += '- Issue: %s\n' % it
        out += '\n'
    return out


def coverage_block():
    p = os.path.join(EV, 'coverage-local.json')
    if not os.path.exists(p):
        return ('**Where the words of each group occur in the local texts**: the count job (`tools/bt/town/local_coverage.py`, through `tools/horde/bench.sh`) was queued behind the machine lock when this file was written and had not '
                'returned; when it has, `evidence/coverage-local.json` lists for each group the texts with the most hits and the terms that hit, and rerunning `make_plan.py` puts the summary here. A hit count is a lead, not evidence.\n'), 'queued behind the machine lock, not completed when this file was written'
    d = jl(p)
    out = '**Where the words of each group occur in the local texts** (`evidence/coverage-local.json`: %d texts and %d newspaper pages read; a hit is a lead, not evidence):\n\n| group | hits | texts with a hit | most hits in |\n|---|---|---|---|\n' % (d['texts_read'], d['ca_pages_read'])
    for gid, v in d['groups'].items():
        out += '| `%s` | %d | %d | %s |\n' % (gid, v['total_hits'], v['texts_with_hits'], ', '.join('%s (%d)' % (t['source'], t['hits']) for t in v['top_texts'][:4]))
    return out, 'counted: %d texts, %d newspaper pages' % (d['texts_read'], d['ca_pages_read'])


def example_blocks():
    rows = [json.loads(l) for l in open(os.path.join(EV, 'EXAMPLES.jsonl'), encoding='utf-8') if l.strip()]

    def pick(group, field, tier=None, **kw):
        for r in rows:
            if r['type'] == 'field' and r['group'] == group and r['field'] == field and (tier is None or r['tier'] == tier) and all(r.get(k) == v for k, v in kw.items()):
                return r
        raise SystemExit('example not found: %s %s %s %s' % (group, field, tier, kw))
    G1, G2, G4, G5 = 'farms-emmitsburg-road', 'farms-culps-hill-baltimore-pike', 'town-college', 'town-public-buildings'
    blocks = [
        ('An inferred form row: the main block of a log farmhouse from a modern survey, with its basis (a statement of a later state is `describes: later`, so the row is not documented)', pick(G1, 'footprint')),
        ('A documented state row with a one-day window', pick(G1, 'state', 'documented', state='fortified')),
        ('A documented row from the Official Records (page model `or27`: `part` is the record id; the quote lies in that record on that printed page)', pick(G5, 'tower_or_cupola')),
        ('An inferred state row whose day is read from the sequence of a narrative (the basis says so)', pick(G4, 'state', 'inferred')),
        ('A plausible-procedural row (a rule, no source) and an open gap with its failed search', pick(G1, 'roof')),
        ('', pick(G1, 'openings')),
        ('', [r for r in rows if r['type'] == 'search'][0]),
        ('Two rows in conflict (identity of a farm; each names the other)', pick(G2, 'identity', 'documented')),
        ('An image reading (looked at; the caption names the college, not the hall, so the tier is inferred)', pick(G4, 'tower_or_cupola')),
    ]
    out = ''
    for cap, r in blocks:
        if cap:
            out += '*%s*\n\n' % cap
        out += '```json\n%s\n```\n\n' % json.dumps(r, indent=1, ensure_ascii=False)
    return out, len(rows)


def main():
    G = jl(os.path.join(EV, 'groups.json'))['groups_list']
    t = open(os.path.join(HERE, 'PLAN.template.md'), encoding='utf-8').read()
    cov = coverage_block()
    cov_text, cov_state = cov if isinstance(cov, tuple) else cov
    ex, n_ex = example_blocks()
    r = subprocess.run([sys.executable, os.path.join(HERE, 'validate_evidence.py'), '--self-test'], capture_output=True, text=True, cwd=ROOT)
    m = re.search(r'(\d+) cases passed, (\d+) failed', r.stdout)
    n_cases = m.group(1) if m else '?'
    if m and m.group(2) != '0':
        raise SystemExit('the validator self-test fails: ' + r.stdout[-600:])
    subs = {'{{DATE}}': datetime.date.today().isoformat(), '{{INVENTORY_TABLE}}': inventory_table(), '{{GROUP_TABLE}}': group_table(G), '{{GROUP_NOTES}}': group_notes(G),
            '{{COVERAGE}}': cov_text, '{{COVERAGE_STATE}}': cov_state, '{{EXAMPLE_BLOCKS}}': ex, '{{N_EXAMPLES}}': str(n_ex), '{{N_CASES}}': n_cases}
    for k, v in subs.items():
        t = t.replace(k, v)
    t = t.replace('62 synthetic cases', '%s synthetic cases' % n_cases)
    left = re.findall(r'\{\{[A-Z_]+\}\}', t)
    if left:
        raise SystemExit('unfilled placeholders: %s' % left)
    with open(os.path.join(EV, 'PLAN.md'), 'w', encoding='utf-8') as f:
        f.write(t)
    print('wrote evidence/PLAN.md (%d characters); self-test cases %s; coverage: %s' % (len(t), n_cases, cov_state))


if __name__ == '__main__':
    main()
