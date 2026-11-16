"""Synthetic inputs for the tests of the Q01, Q14 and Q20 runners.

Every fixture has the SHAPE of the real input (the layer dump that the node children write, the `kit-verified-oob-1` and `kit-verified-batteries-1` tables of
tools/bt/kit_verified.py, the kit cavalry cards) and is small enough to read. A test injects exactly one defect into a copy and asks the runner to find it.
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
GATES = os.path.join(ROOT, 'tools', 'bt', 'gates')
for p in (GATES, os.path.join(GATES, 'lib'), os.path.join(ROOT, 'tools', 'bt')):
    if p not in sys.path:
        sys.path.insert(0, p)


def strength(kind='procedural', drawn=300, lo=None, hi=None, basis='plausible-procedural: corps figure shared by regiment count', weak=True, **extra):
    s = {'min': lo, 'max': hi, 'drawn': drawn, 'share': drawn, 'kind': kind, 'basis': basis, 'tier': 'plausible-procedural' if kind == 'procedural' else 'inferred',
         'sources': ['SS-B3', 'PDF-B3'], 'weak_source': weak}
    s.update(extra)
    return s


def unit(uid, level, arm, parent, army='US', status='on_field', commanders=None, strength_=None, drawn=True, render=None, children=None, name=None, guns=None):
    return {'id': uid, 'name': name or uid, 'army': army, 'level': level, 'arm': arm, 'parent': parent, 'status': status, 'status_ledger': status,
            'commanders': commanders or [], 'strength': strength_ or strength('none', 0, basis='aggregate'), 'drawn': drawn,
            'render': render or ('moving' if drawn else ('aggregate' if children else 'not_on_field')), 'children': children or [],
            'guns': guns or {'status': 'not_applicable', 'count': None}, 'register': 'EG-0001', 'tier': 'plausible-procedural', 'sources': ['PDF-B3', 'PDF-B24']}


def arrival(earliest=1000, default=1010, latest=1030, entry=True, sources=('PDF-B24',), road='Chambersburg Pike'):
    return {'earliest': earliest, 'default': default, 'latest': latest, 'entry': ({'lng': -77.3, 'lat': 39.83, 'sigma_m': 40} if entry else None),
            'entry_status': 'resolved: where %s leaves the loaded ground' % road if entry else 'open gap: no road of approach', 'tier': 'inferred',
            'sources': list(sources), 'conflict': None}


def layer_dump():
    """army -> corps -> brigade -> two regiments on the field, one regiment never on the field. Army and corps carry no figure of their own (leaves do)."""
    units = [
        unit('us-aop', 'army', None, None, children=['us-1c'], drawn=False, name='Army of the Potomac', commanders=['MG George G. Meade']),
        unit('us-1c', 'corps', None, 'us-aop', children=['us-1c-1d-b1'], drawn=False, name='I Corps', commanders=['MG John F. Reynolds'],
             strength_=strength('printed', 0, lo=12160, hi=12160, basis='single figure printed in the PDF B.3 table (Stone Sentinels)', tier=None)),
        unit('us-1c-1d-b1', 'brigade', 'infantry', 'us-1c', children=['us-1c-1d-b1-r1', 'us-1c-1d-b1-r2', 'us-1c-1d-b1-r3'], drawn=False, name='1st Brigade', commanders=['Col. Samuel J. Williams']),
        unit('us-1c-1d-b1-r1', 'regiment', 'infantry', 'us-1c-1d-b1', commanders=[], strength_=strength(drawn=300), name='19th Indiana'),
        unit('us-1c-1d-b1-r2', 'regiment', 'infantry', 'us-1c-1d-b1', commanders=[], strength_=strength(drawn=250), name='24th Michigan'),
        unit('us-1c-1d-b1-r3', 'regiment', 'infantry', 'us-1c-1d-b1', status='never_on_field', drawn=False, render='not_on_field', strength_=strength('none', 0, basis='not on the field'), name='Detached regiment'),
    ]
    for u in units:
        if u['strength'].get('tier') is None:
            u['strength']['tier'] = 'inferred'
    arrivals = {u['id']: arrival() for u in units if u['status'] == 'on_field'}
    arrivals['us-1c-1d-b1-r2'] = arrival(earliest=1100, default=1110, latest=1120)
    approach = {u['id']: ({'id': 'AP-1', 'road': 'Chambersburg Pike', 'tier': 'inferred', 'owner': 'us-1c', 'inherited': True, 'modelled': False} if u['drawn'] else None) for u in units}
    onetoone = {'scenarios': {'default': {'units': {}}}, 'grid': {'mode': 'breakpoints', 'evaluated_minutes': 6, 'grid_minutes': 27360, 'exact_by_breakpoints': True}, 'world_static': True}
    for u in units:
        n = u['strength']['drawn'] if u['drawn'] else 0
        onetoone['scenarios']['default']['units'][u['id']] = {'expected_drawn': n, 'drawn_flag': u['drawn'], 'world_count': n, 'crew_groups': 0, 'rendered_when_present': n,
                                                                  'present_intervals': [[1010, None]] if u['drawn'] else [], 'event_intervals': [[1010, None]] if u['drawn'] else [], 'violations': []}
    return {'schema': 'q01-layer-dump/1', 'layer': {'id': 'real-1', 'units': len(units)}, 'scenarios': ['default'], 'scenario_set': {'id': 'fixture', 'complete': True, 'count': 1}, 'units': units, 'arrivals': {'default': arrivals},
            'approach': approach, 'source_keys': ['PDF-B3', 'PDF-B24', 'SS-B3', 'EG-0001'],
            'not_on_field': {'us-1c-1d-b1-r3': {'status': 'never_on_field', 'source': 'not_on_field.json'}}, 'onetoone': onetoone,
            'cap_scan': {'patterns': ['MAX_FIGURES'], 'files_scanned': 10, 'hits': []}}


def rng(low, high, tier='documented', basis='taken_into_action|officers_and_men', lines=1):
    return {'low': low, 'high': high, 'tier': tier, 'lines': lines, 'basis': 'strength taken into action; %d line' % lines, 'by_as_of': {'1863-07-01': {'low': low, 'high': high, 'lines': lines}}, 'spans_dates': False}


def tunit(name, army, level, arm, parent, group='us-1c', in_roster=True, status='verified', strength_ranges=None, commanders=None, engaged='yes', fields=None, uid=None):
    uid = uid or name.lower().replace(' ', '-')
    u = {'name': name, 'army': army, 'level': level, 'arm': arm, 'parent': parent, 'group': group, 'in_roster': in_roster, 'kit_ids': [], 'required': ['roster', 'commander', 'strength'],
         'fields': fields or {'roster': 'verified', 'commander': 'verified' if commanders else 'unverified', 'strength': 'verified' if strength_ranges else 'unverified'}, 'status': status}
    if engaged is not None:
        u['presence'] = {'engaged': engaged, 'designations': [name], 'tier': 'documented', 'evidence_ids': ['ev:%s:roster' % uid], 'cite': [{'id': 'ev:%s:roster' % uid, 'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R009', 'printed_page': 155, 'offset': 536348}]}
    if commanders:
        u['commanders'] = [{'order': i + 1, 'name': n, 'rank': r, 'tier': 'documented', 'evidence_ids': ['ev:%s:commander:%d' % (uid, i + 1)], 'cite': {'id': 'ev:%s:commander:%d' % (uid, i + 1), 'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R009', 'printed_page': 155, 'offset': 536349}}
                           for i, (n, r) in enumerate(commanders)]
    if strength_ranges:
        figs = []
        for k, r in strength_ranges.items():
            figs.append({'basis': k.split('|')[0], 'men': k.split('|')[1], 'low': r['low'], 'high': r['high'], 'as_of': '1863-07-01', 'tier': r['tier'], 'evidence_ids': ['ev:%s:strength:%s' % (uid, k)],
                         'cite': {'id': 'ev:%s:strength:%s' % (uid, k), 'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R037', 'printed_page': 282, 'offset': 964204}})
        u['strength'] = {'figures': figs, 'ranges': strength_ranges}
    return u


def oob_table():
    """The verified table that matches layer_dump(): the regiments have OR figures, the corps one verified figure, the brigade none of its own."""
    units = {
        'us-aop': tunit('Army of the Potomac', 'US', 'army', None, None, group='army-hq', commanders=[('George G. Meade', 'Major General')], strength_ranges={'present_for_duty|officers_and_men': rng(500, 600, basis='present_for_duty|officers_and_men')}, uid='us-aop'),
        'us-1c': tunit('I Corps', 'US', 'corps', None, 'us-aop', commanders=[('John F. Reynolds', 'Major General')], strength_ranges={'present_for_duty|officers_and_men': rng(12000, 12200, basis='present_for_duty|officers_and_men')}, uid='us-1c'),
        'us-1c-1d-b1': tunit('1st Brigade', 'US', 'brigade', 'infantry', 'us-1c', commanders=[('Samuel J. Williams', 'Colonel')], uid='us-1c-1d-b1'),
        'us-1c-1d-b1-r1': tunit('19th Indiana', 'US', 'regiment', 'infantry', 'us-1c-1d-b1', commanders=[('Samuel J. Williams', 'Colonel')], strength_ranges={'taken_into_action|officers_and_men': rng(280, 320)}, uid='us-1c-1d-b1-r1'),
        'us-1c-1d-b1-r2': tunit('24th Michigan', 'US', 'regiment', 'infantry', 'us-1c-1d-b1', commanders=[('Henry A. Morrow', 'Colonel')], strength_ranges={'taken_into_action|officers_and_men': rng(240, 260)}, uid='us-1c-1d-b1-r2'),
        'us-1c-1d-b1-r3': tunit('Detached regiment', 'US', 'regiment', 'infantry', 'us-1c-1d-b1', engaged='no', status='partly', uid='us-1c-1d-b1-r3', commanders=[('Alonzo Smith', 'Colonel')]),
    }
    units['us-1c-1d-b1-r3']['fields']['strength'] = 'unverified'
    return {'schema': 'kit-verified-oob-1', '_doc': 'fixture', 'rules': {}, 'inputs': {}, 'totals': {'units': len(units), 'evidence_lines_used': 5, 'rejected_lines': 0, 'verified': 5, 'partly': 1, 'unverified': 0},
            'units': units, 'roster_additions': [], 'reconstructions_not_verified': []}


def with_layer_commanders(layer):
    """The layer as it should look once it adopts the verified table: the regimental commanders the real roster does not hold, and the strengths carried as the table's ranges with their basis key
    (the real layer holds printed single figures and procedural shares: that is why Q01.3 fails on it)."""
    d = copy.deepcopy(layer)
    names = {'us-aop': ['MG George G. Meade'], 'us-1c': ['MG John F. Reynolds'], 'us-1c-1d-b1': ['Col. Samuel J. Williams'], 'us-1c-1d-b1-r1': ['Col. Samuel J. Williams'], 'us-1c-1d-b1-r2': ['Col. Henry A. Morrow'], 'us-1c-1d-b1-r3': ['Col. Alonzo Smith']}
    ranges = {'us-1c': (12000, 12200, 'present_for_duty|officers_and_men'), 'us-1c-1d-b1-r1': (280, 320, 'taken_into_action|officers_and_men'), 'us-1c-1d-b1-r2': (240, 260, 'taken_into_action|officers_and_men')}
    for u in d['units']:
        if u['id'] in names:
            u['commanders'] = names[u['id']]
        if u['id'] in ranges:
            lo, hi, key = ranges[u['id']]
            u['strength'].update({'min': lo, 'max': hi, 'kind': 'ranged', 'basis_key': key, 'basis': 'range from the Official Records, basis ' + key, 'tier': 'documented', 'weak_source': False, 'sources': ['OR27-1-R037']})
    return d


class FakeMatcher:
    """What extracts.TextStore gives a runner, with a table of known quotes: find_or27 / find_statevol / find return the same status words."""

    def __init__(self, found=True, no_text=False):
        self.found, self.no_text = found, no_text
        self.calls = []

    def _r(self):
        if self.no_text:
            return {'status': 'no_text', 'reason': 'fixture: text not on the machine'}
        return {'status': 'found' if self.found else 'not_found', 'page_ok': True}

    def find_or27(self, quote, report_id=None, printed_page=None):
        self.calls.append(('or27', quote, report_id, printed_page))
        return self._r()

    def find_statevol(self, quote, volume=None, section=None):
        self.calls.append(('statevol', quote, volume, section))
        return self._r()

    def find(self, source_id, quote):
        self.calls.append(('plain', source_id, quote))
        return self._r()


def evidence_lines(table=None):
    """The evidence lines (kit/evidence/<group>.jsonl) that the CLEAN table's evidence ids point to, one per id, with an extract that holds exactly the numbers of its value."""
    t = table or oob_table()
    out = {}
    for uid, u in t['units'].items():
        for e in (u.get('presence') or {}).get('evidence_ids', []):
            out[e] = {'type': 'evidence', 'id': e, 'unit_id': uid, 'field': 'roster', 'tier': 'documented', 'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R009', 'printed_page': 155, 'offset': 536348, 'quote': '%s in the organization table.' % u['name']}
        for c in u.get('commanders') or []:
            for e in c['evidence_ids']:
                out[e] = {'type': 'evidence', 'id': e, 'unit_id': uid, 'field': 'commander', 'tier': 'documented', 'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R009', 'printed_page': 155, 'offset': 536349, 'quote': '%s, %s.' % (u['name'], c['name'])}
        for f in (u.get('strength') or {}).get('figures') or []:
            for e in f['evidence_ids']:
                q = 'went into action with %d men' % f['low'] if f['low'] == f['high'] else 'between %d and %d men were present' % (f['low'], f['high'])
                out[e] = {'type': 'evidence', 'id': e, 'unit_id': uid, 'field': 'strength', 'tier': 'documented', 'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R037', 'printed_page': 282, 'offset': 964204, 'quote': q,
                          'value': {'low': f['low'], 'high': f['high']}}
    return out


K1_FIXTURE = {'infantry regiment': {'level': r'^regiment$', 'arm': r'^infantry$'}}


def clone(x):
    return copy.deepcopy(x)


def dump_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    return path
