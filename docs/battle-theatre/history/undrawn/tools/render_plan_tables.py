"""Fills the generated parts of ../PLAN.md (the numbers, the tables, the group sections) from groups.json, status.json and roster-gaps.json.

    python3 -I docs/battle-theatre/history/undrawn/tools/render_plan_tables.py            rewrites the parts of PLAN.md between <!-- GEN:name --> and <!-- /GEN:name -->
    python3 -I docs/battle-theatre/history/undrawn/tools/render_plan_tables.py --check    exit 1 if PLAN.md is not what the data gives (run after build_groups.py)

Everything between the markers is generated: edit the text outside them.
"""
import os, re, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
UND = os.path.abspath(os.path.join(HERE, '..'))
J = lambda n: json.load(open(os.path.join(UND, n), encoding='utf-8'))
G, ST, RG = J('groups.json'), J('status.json'), J('roster-gaps.json')
n = lambda x: '{:,}'.format(x)

WHY = collections.OrderedDict([
    ('placed', 'a road of approach and a place: drawn (and still partly missing something)'),
    ('formation', 'a formation above the regiments: its leaf units carry the figures; nothing is drawn of it'),
    ('route_unplaceable', 'the reports print a road or route the repository cannot place (the road from Scotland, the road past Horner\'s Mills, the Fairfield road): not drawn'),
    ('no_single_day_label', 'a sibling road exists but the troop maps give the unit no single-label day position: not drawn'),
    ('cavalry_no_road', 'cavalry of Stuart\'s division: only earlier marches are printed, no road onto the ground: not drawn'),
    ('road_outside_ground', 'the only road printed for the division lies outside the loaded ground (Black Horse Tavern Road): not drawn'),
    ('sibling_roads_differ', 'the documented sibling formations of the corps name different roads, so the sibling rule (DEC-015) does not apply: not drawn'),
    ('no_place_after_arrival', 'a road of approach and no place after arrival: drawn waiting in its column where the road leaves the loaded ground'),
    ('no_figure', 'a headquarters, a person or a grouping entry with a gate and no figure: not drawn'),
    ('reports_disagree', 'two reports of the unit print different roads: not drawn, none chosen'),
    ('roster_structure', 'the roster holds the regiment as a formation whose only child is a detached company: nothing of the regiment is drawn'),
    ('listed_not_on_field', 'the plan\'s table lists the unit as never (or only partly) on the field, on a weak key: a non-lead source for the absence is owed'),
    ('documented_absent', 'documented absence from the field (an overlay, EG-E-84PA): not drawn, correct as it is'),
])


def rows():
    for g in G['groups']:
        for u in g['units']: yield g, u


def t_totals():
    c = G['layer']['counts']; T = G['totals']
    tally = collections.Counter(); leafs = [u for u in ST['units'] if u['leaf'] and u['layer_status'] in ('moving', 'edge_only', 'not_drawn')]
    road = collections.Counter(); days = collections.Counter()
    for u in leafs:
        if u['layer_status'] in ('moving', 'edge_only'):
            a = u['approach']; road['modelled' if a['modelled'] else 'corps' if a['tier'] == 'plausible-procedural' else 'own'] += 1
        if u['layer_status'] == 'moving': days[sum(1 for v in u['places'].values() if v in ('ledger', 'map', 'ledger+map'))] += 1
    for u in leafs:
        for m in u['missing']: tally[m] += 1
    L = ['| What | Units |', '|---|---:|',
         '| units of the roster (history/units.json) | %s |' % n(T['units']),
         '| drawn by the layer now (placed %s + at the arrival edge %s) | %s |' % (n(c['moving']), n(c['edge_only']), n(c['drawn'])),
         '| not drawn: open gaps (%s leaf units of the layer, and the 32d Massachusetts, which the layer holds as a formation and draws nothing of) | %s |' % (n(c['not_drawn']), n(T['not_drawn'])),
         '| formations above the regiments (aggregates: their leaf units carry the figures) | %s |' % n(T['formation']),
         '| not on the field (13 listed by the plan\'s tables, 1 documented absence) | %s |' % n(c['not_on_field']),
         '| figures drawn now (one soldier per figure) | %s |' % n(G['layer']['figures_drawn']),
         '| leaf units on the field (placed + at the edge + not drawn) | %s |' % n(len(leafs)),
         '| of those: missing an arrival of their own | %s |' % n(tally['arrival']),
         '| of those: missing positions (a day without a place, or no place at all) | %s |' % n(tally['positions']),
         '| of those: missing a road of approach of their own (none, modelled, or only the corps-level one) | %s |' % n(tally['path']),
         '| of those: missing a strength of their own (every one: a procedural share) | %s |' % n(tally['strength']),
         '| of those: missing everything of their own (gate, road and places all come from a formation above) | %s |' % n(tally['parent_only']),
         '| drawn units by road of approach: printed for the unit or a formation below the corps (tier inferred) | %s |' % n(road['own']),
         '| drawn units by road of approach: only the corps-level road is printed (plausible-procedural) | %s |' % n(road['corps']),
         '| drawn units by road of approach: modelled from the sibling formations of the corps (DEC-015, EG-0070) | %s |' % n(road['modelled']),
         '| placed units with a place on 1, 2 or 3 days of 1 to 3 July (days from the unit\'s gate; a place is a ledger stop or a single-label troop-map position) | %s, %s, %s |' % (n(days[1]), n(days[2]), n(days[3])),
         '| leaf units on the field that no ledger claim names (everything of theirs comes from a formation above) | %s |' % n(sum(1 for u in leafs if not u['claims_own']['total'])),
         '| roster-gap entries (units printed in the Official Records tables that the roster lacks, splits or lists with another status) | %s |' % n(T['roster_gap_entries'])]
    return '\n'.join(L)


def t_why():
    cnt = collections.Counter(); grp = collections.defaultdict(collections.Counter)
    for g, u in rows(): cnt[u['why'].split(':')[0]] += 1; grp[u['why'].split(':')[0]][g['id']] += 1
    L = ['| Reason code | Units | What it means | Groups (units) |', '|---|---:|---|---|']
    for k, txt in WHY.items():
        if not cnt[k]: continue
        L.append('| `%s` | %d | %s | %s |' % (k, cnt[k], txt, ', '.join('%s (%d)' % (a, b) for a, b in sorted(grp[k].items(), key=lambda t: (-t[1], t[0])))))
    return '\n'.join(L)


def t_groups():
    L = ['| Group | Units | Leaf on field | Not drawn | At edge | Partly drawn | Formations | Not on field | Roster gaps | Figures drawn | Load |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    tot = collections.Counter()
    for g in G['groups']:
        c = g['counts']; load = sum(len([m for m in u['missing'] if m != 'parent_only']) for u in g['units'])
        row = [c['units'], c['leaf_units_on_field'], c.get('not_drawn', 0), c.get('edge_only', 0), c.get('partly_drawn', 0), c.get('formation', 0), c.get('not_on_field', 0), c['roster_gaps'], c['figures_drawn'], load]
        for i, v in enumerate(row): tot[i] += v
        L.append('| `%s` | %s |' % (g['id'], ' | '.join(n(v) for v in row)))
    L.append('| **%d groups** | %s |' % (len(G['groups']), ' | '.join('**%s**' % n(tot[i]) for i in range(10))))
    return '\n'.join(L)


def t_undrawn():
    L = ['| Unit | Name | Group | Class | Why | Missing |', '|---|---|---|---|---|---|']
    for g, u in rows():
        if u['class'] in ('not_drawn', 'edge_only'):
            L.append('| `%s` | %s | `%s` | %s | `%s` | %s |' % (u['id'], u['name'].replace('|', '/'), g['id'], u['class'].replace('_', ' '), u['why'], ', '.join(u['missing'])))
    return '\n'.join(L)


def t_notonfield():
    L = ['| Unit | Name | Group | Status in the layer |', '|---|---|---|---|']
    for g, u in rows():
        if u['class'] == 'not_on_field': L.append('| `%s` | %s | `%s` | %s |' % (u['id'], u['name'].replace('|', '/'), g['id'], u['why']))
    return '\n'.join(L)


def rid(x): return x.split('-')[-1]


def t_sections():
    L = []
    gaps_by = collections.defaultdict(list)
    for e in RG['entries']: gaps_by[e['group']].append(e)
    for g in G['groups']:
        c, S = g['counts'], g['sources']
        L.append('### `%s`: %s\n' % (g['id'], g['title']))
        L.append('- **Units:** %d rows, %d leaf units on the field: %s. Missing (leaf units): %s. Figures drawn now: %s.' % (c['units'], c['leaf_units_on_field'],
                 ', '.join('%d %s' % (c.get(k, 0), k.replace('_', ' ')) for k in ('not_drawn', 'edge_only', 'partly_drawn', 'formation', 'not_on_field') if c.get(k, 0)),
                 ', '.join('%s %d' % kv for kv in sorted(c['missing'].items(), key=lambda t: -t[1])) or 'nothing', n(c['figures_drawn'])))
        by = collections.Counter(u['why'].split(':')[0] for u in g['units'] if u['class'] in ('not_drawn', 'edge_only'))
        if by: L.append('- **Not drawn or at the edge, by reason:** %s.' % ', '.join('`%s` %d' % kv for kv in by.most_common()))
        L.append('- **What to find:** %s' % g['note'])
        if gaps_by[g['id']]: L.append('- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** %s.' % '; '.join('`%s` (%s)' % (e['id'], e['action']) for e in gaps_by[g['id']]))
        rep = [r for r in S['or27_reports'] if r['claims']]; unc = [r for r in S['or27_reports'] if not r['claims']]
        L.append('- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): %s.' % (', '.join('%s (%d)' % (rid(r['id']), r['claims']) for r in rep) or 'none'))
        if unc: L.append('- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** %s.' % ', '.join('%s %s' % (rid(r['id']), (r['author'] or r['scope'])[:28].strip()) for r in unc))
        p3 = S['or27_part3_documents_cited']
        L.append('- **Other Official Records:** organization table `%s`, returns `%s`%s.' % (S['organization_table'], '`, `'.join(S['returns']), (', part 3 documents cited by claims: ' + ', '.join('%s (%d)' % (rid(x['id']), x['claims']) for x in p3)) if p3 else ''))
        sv = S['statevol_sections']; vols = collections.Counter(s.split('-')[0] for secs in sv.values() for s in secs)
        L.append('- **Indexed state volumes:** %s.' % (('%d units have regimental sections in %s (section ids in groups.json, `sources.statevol_sections`)' % (len(sv), ', '.join('%s %d' % kv for kv in sorted(vols.items())))) if sv else 'none indexed for these units'))
        L.append('- **Local texts to read** (keys in sources.json): %s.' % (', '.join('`%s`' % t for t in S['local_texts']) or 'none'))
        L.append('- **Ledger claims already held** (read them first; do not repeat them): %s.\n' % (', '.join('ledger %s %d' % kv for kv in sorted(S['ledger_claims_held'].items())) or 'none'))
    return '\n'.join(L)


def t_periods():
    E = json.load(open(os.path.join(UND, '..', '..', 'environment', 'ephemeris_1863.json'), encoding='utf-8'))['segments'][0]['events_lmt_minutes_since_midnight']['1863-07-02']
    hm = lambda m: '%02d:%02d' % (int(round(m) // 60), int(round(m) % 60))
    dawn, sr, ss, dk = E['civil_dawn'][0], E['sunrise'][0], E['sunset'][0], E['civil_dusk'][0]
    sys.path.insert(0, HERE)
    import check_undrawn as C
    W = collections.OrderedDict([('before_daylight', (0, dawn)), ('daybreak', (dawn, sr)), ('sunrise', (sr, sr)), ('early_morning', (sr, 720)), ('morning', (sr, 720)), ('forenoon', (sr, 720)), ('early_afternoon', (720, ss)),
                                 ('afternoon', (720, ss)), ('late_afternoon', (720, ss)), ('sunset', (ss, ss)), ('dusk', (ss, dk)), ('evening', (ss, 1440)), ('night', (dk, 1440)), ('all_day', (sr, ss))])
    assert list(W) == list(C.PERIODS), 'the period table of the plan and the checker differ'
    L = ['| Token | Words (any one, in `when.printed`) | Window (LMT) | Instant used |', '|---|---|---|---|']
    for k, (a, b) in W.items():
        L.append('| `%s` | %s | %s | %s |' % (k, ', '.join('"%s"' % w for w in C.PERIODS[k]), '%s to %s' % (hm(a), hm(b)) if a != b else hm(a), hm(a)))
    return '\n'.join(L)


GEN = {'periods': t_periods, 'totals': t_totals, 'why': t_why, 'groups': t_groups, 'undrawn': t_undrawn, 'notonfield': t_notonfield, 'sections': t_sections}


def render(text):
    for k, f in GEN.items():
        pat = re.compile(r'<!-- GEN:%s -->.*?<!-- /GEN:%s -->' % (k, k), re.S)
        assert pat.search(text), 'marker %s is missing in PLAN.md' % k
        body = f()
        text = pat.sub(lambda m: '<!-- GEN:%s -->\n%s\n<!-- /GEN:%s -->' % (k, body, k), text)
    return text


if __name__ == '__main__':
    p = os.path.join(UND, 'PLAN.md'); old = open(p, encoding='utf-8').read(); new = render(old)
    if '--check' in sys.argv:
        print('PLAN.md is current' if new == old else 'PLAN.md IS STALE: run render_plan_tables.py'); sys.exit(0 if new == old else 1)
    if new != old: open(p, 'w', encoding='utf-8', newline='\n').write(new)
    print('PLAN.md written' if new != old else 'PLAN.md unchanged')
