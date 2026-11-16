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


# ======================================================================================== Q14 fixtures
class FakeOcr:
    """What q14_ordnance.OcrStore gives the runner: whether a manual phrase and a printed figure are found again in the OCR text."""

    def __init__(self, phrase='found', window='found'):
        self._p, self._w = phrase, window

    def phrase(self, manual, phrase):
        return self._p

    def window(self, manual, line, tokens, before=3, after=120):
        return self._w

    def load(self, manual):
        return {'path': 'fixture', 'sha_ok': True}


def q14_items():
    rows = [{'elevation': '0', 'range_ocr': '325', 'range_yd_reading': 325, 'note': ''}, {'elevation': '3', 'range_ocr': '1,200', 'range_yd_reading': 1200, 'note': ''}, {'elevation': '5', 'range_ocr': '1,680', 'range_yd_reading': 1680, 'note': ''}]
    return {
        'ORD-RNG-FA-LT12': {'id': 'ORD-RNG-FA-LT12', 'manual': 'FIELDART-1863', 'verbatim': 'LI08T 12-PDB. QUN.. 2-5 Shot. 0 1 325 620', 'ocr_line': 6568, 'tier': 'documented', 'paraphrase': 'Light 12-pdr: shot read in pairs 0 deg 325, 3 deg 1,200, 5 deg 1,680.',
                            'data': {'rows': rows}},
        'ART-FA-100': {'id': 'ART-FA-100', 'manual': 'FIELDART-1863', 'verbatim': 'with sufficient deliberation for pointing, two solid shot or three canisters per minute', 'tier': 'documented'},
        'ART-GB-21': {'id': 'ART-GB-21', 'manual': 'GIBBON-1860', 'verbatim': 'The mean rate is about one shot per minute, but when close pressed,', 'verbatim2': 'two or three shots per minute can be fired.', 'tier': 'documented'},
        'ART-FA-101': {'id': 'ART-FA-101', 'manual': 'FIELDART-1863', 'verbatim': 'canister should begin at 350 yards, and the rapidity of the fire', 'verbatim2': 'double charges of canister may be used at 150 or 160 yards,', 'tier': 'documented'},
        'ART-GB-22': {'id': 'ART-GB-22', 'manual': 'GIBBON-1860', 'verbatim': 'the maximum effect is produced at from 400 to 450 yards.', 'tier': 'documented'},
        'ORD-BATT-WAR': {'id': 'ORD-BATT-WAR', 'manual': 'FIELDART-1863', 'verbatim': 'Total number of rounds with a battery..', 'data': {'per_gun': 224, 'light12_battery_rounds_total': 1344}, 'tier': 'documented'},
        'ART-FA-116': {'id': 'ART-FA-116', 'manual': 'FIELDART-1863', 'verbatim': 'The campaign allowance of ammunition is double what has', 'tier': 'documented'},
        'INF-RATE-01': {'id': 'INF-RATE-01', 'manual': 'CASEY-1862-1', 'verbatim': 'fire at least three rounds in a minute with ease', 'rate': '>= 3 rounds/minute (drill standard)', 'tier': 'documented'},
        'ART-FA-03': {'id': 'ART-FA-03', 'manual': 'FIELDART-1863', 'verbatim': 'No. 1 sponges and rams', 'tier': 'documented'},
    }


def q14_inputs():
    items = q14_items()
    weapons = {'rifle_ok': {'id': 'rifle_ok', 'tier': 'inferred', 'weak_source': True, 'source_keys': ['Wiki-X'], 'conflicts': [], 'gap_ids': []}}
    pieces = {'napoleon_12pdr_m1857': {'id': 'napoleon_12pdr_m1857', 'tier': 'inferred', 'weak_source': True, 'table_source_keys': ['Wiki-FieldArtACW'], 'conflicts': [{'id': 'C1', 'positions': [{'value_yd': 1619}, {'value_yd': 1680}]}],
                                                  'gap_ids': [], 'manual_confirmation': [{'drill_item_ids': ['ORD-RNG-FA-LT12']}]}}
    return {'weapons': {'weapons': weapons, 'meta': {'counts': {'drill_states': 12}},
                        'ammunition': {'rates_and_ranges': [{'quantity': 'Rate', 'values': {'muzzle_loader_per_min': [2, 3], 'sharps_per_min': [8, 10]}}]},
                        'artillery': {'pieces': pieces, 'conflicts': [{'id': 'CONF-NAP-CANISTER-RANGE', 'manual_check': 'FA manual: canister begins at 350 yd; double canister 150-160 yd'}],
                                      'ammunition_choice': {'range_bands_yd': {'solid_shot_shell_case_beyond': 400, 'canister_inside': [350, 400], 'double_canister_inside': 150}, 'tier': 'inferred', 'manual_check': 'FA: double canister at 150-160 yd'},
                                      'crew': {'roles': [{'role': 'gunner', 'manual_item_ids': ['ART-FA-03']}, {'role': 'No. 1', 'manual_item_ids': ['ART-FA-03']}]}}},
            'fx': {'weapons': {'rifle_ok': {}}}, 'items': items, 'sources': {}, 'conflicts': {'conflicts': [{'id': 'C-900', 'topic': 'crew of a field piece: eight or nine', 'values': [{'label': '8'}, {'label': '9'}]}]},
            'vb': None, 'plan': 'Total guns on the field (US / CS)\n366 / 282 (StrategyPage)\n366-372 Union, 281-282 Confederate\n', 'structures': {'structures': []}, 'guns': {}}


def q14_dump():
    bat = {'id': 'us-b1', 'name': 'Battery 1', 'army': 'US', 'level': 'battery', 'parent': 'us-art', 'status': 'on_field', 'drawn': True, 'render': 'moving', 'strength_drawn': 224, 'enter_min': 1000,
           'guns': {'status': 'drawn', 'count': 6, 'types': [{'type_id': 'napoleon_12pdr_m1857', 'count': 6, 'printed_type': 'six Napoleons'}], 'printed': 'six Napoleons', 'kit_battery': 'US.ART.B1', 'tier': 'inferred', 'weak_source': True, 'sources': ['KIT-GUNS'], 'reason': None},
           'world': {'guns': 6, 'crew_groups': 6, 'crew_total': 54}}
    plan = {'unit': 'us-b1', 'animator': 'us-b1#gun0', 'crew': True, 'activity': 'serve_guns', 'seg': 0, 'mode': 'by_piece', 'weapon': 'cannon', 'weapon_id': None, 'round': None, 'target': None, 'n': 6, 'start_s': 60000, 'end_s': None,
            'cycle_min': 30, 'cycle_max': 60, 'floor_s': 18, 'pace_spread': 0.06, 'tier': 'inferred', 'basis': 'fixture', 'dismounted_share': 0, 'window_s': 3600.0, 'shots': 300, 'max_in_60s': {'count': 2, 'figure': 0, 't_s': 60010.0}}
    ball = {'table': {'napoleon_12pdr_m1857': {'shot': [[0, 325], [3, 1200], [5, 1680]], 'src': ['ORD-RNG-FA-LT12']}},
            'rows': [{'piece': 'napoleon_12pdr_m1857', 'round': 'shot', 'elev_deg': e, 'range_yd': y, 'src': ['ORD-RNG-FA-LT12']} for e, y in ((0, 325), (3, 1200), (5, 1680))],
            'inverse': [{'piece': 'napoleon_12pdr_m1857', 'round': 'shot', 'elev_deg': e, 'range_yd': y, 'elev_back': e, 'ok': True, 'flight_s': (None if e == 0 else 5.0)} for e, y in ((0, 325), (3, 1200), (5, 1680))],
            'beyond': [{'piece': 'napoleon_12pdr_m1857', 'round': 'shot', 'top_yd': 1680, 'probe_yd': 1713.6, 'elevation_beyond': 'NaN', 'impact_beyond': None}]}
    return {'schema': 'q14-layer-dump/1', 'scenarios': ['default'], 'scenario_set': {'id': 'fixture', 'complete': True, 'count': 1}, 'batteries': [bat], 'events': [{'scenario': 'default', 'unit': 'us-b1', 'piece': 'napoleon_12pdr_m1857', 'round': 'shot', 'range_m': 900.0, 'range_yd': 984.3, 'elevation_deg': 2.4, 'in_table': True, 'flight_s': 2.0}], 'drawn_guns': {'union': 369, 'confederate': 281}, 'ballistics': ball,
            'plans': {'default': [plan]}, 'crew': {'posts': ['gunner', 'No. 1'], 'per_gun': 2, 'crowd_per_gun': 9, 'selectable': True, 'selectable_basis': 'fixture'}, 'window': {'from_s': 2160000, 'to_s': 3801600}}


def q14_vb(count=6, date='1863-07-02', state='present'):
    return {'schema': 'kit-verified-batteries-1', 'batteries': {'us-b1': {'name': 'Battery 1', 'status': 'verified', 'unverified': False, 'range_by_date': {date: {state: {'low': count, 'high': count, 'lines': 1}}},
                                                                         'guns': [{'as_of': date, 'state': state, 'pieces': [{'printed': 'six Napoleons', 'count': 6, 'type_candidates': ['napoleon_12pdr_m1857']}], 'total': count, 'tier': 'documented'}]}}, 'formations': {}}
